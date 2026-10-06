using Android.Content;
using Android.Media;
using Android.Media.Audiofx;
using Android.OS;
using IXICore.Meta;
using SPIXI.VoIP;
using System;
using System.Collections.Generic;
using System.Threading;

namespace Spixi
{
    public class AudioFocusListener
    : Java.Lang.Object
    , AudioManager.IOnAudioFocusChangeListener
    {
        /* ★★ #1208 (S7): a VOICE MESSAGE listener (recorder or player) — a loss of focus (another app, a phone call) is the
         * platform's interrupt: the clip stops (a recording is kept). null = the CALL listener, unchanged below. */
        private readonly Action? onVoiceLoss;

        public AudioFocusListener()
        {
            onVoiceLoss = null;
        }

        public AudioFocusListener(Action? on_voice_loss)
        {
            onVoiceLoss = on_voice_loss;
        }

        public void OnAudioFocusChange(AudioFocus focus_change)
        {
            if (onVoiceLoss != null)
            {
                if (focus_change == AudioFocus.Loss || focus_change == AudioFocus.LossTransient)
                {
                    try { onVoiceLoss(); } catch (Exception) { }
                }
                return;   // a voice message never hangs up a call
            }
            switch (focus_change)
            {
                case AudioFocus.Loss:
                    // Permanent loss of audio focus
                    // Pause playback immediately
                    VoIPManager.hangupCall(null, true);
                    break;
            }
        }
    }
    public class SAudioRecorder : IAudioRecorder, IAudioEncoderCallback
    {
        private Action<byte[]> OnSoundDataReceived;

        private AudioRecord audioRecorder = null;
        private IAudioEncoder audioEncoder = null;
        private AcousticEchoCanceler echoCanceller = null;
        private NoiseSuppressor noiseSuppressor = null;

        private AudioFocusListener focusListener = null;
        private AudioFocusRequestClass focusRequest = null;

        bool running = false;
        volatile bool muted = false;   // ★ #1074: zero the PCM, keep the frames flowing

        /* ★★ #1208 (S7): this instance records a VOICE MESSAGE (startVoiceMessage) — the MIC source, no echo canceller,
         * media focus, Opus at voiceBitrate with the VOIP application. false = a call (start), byte for byte as before. */
        bool voiceMode = false;
        volatile bool voiceFlushing = false;   // ★ #46 r1 A M6: true only inside a voice clip's stop()
        int voiceBitrate = 0;
        Action? voiceInterrupted = null;

        public void setMuted(bool is_muted)
        {
            muted = is_muted;
        }

        int bufferSize = 0;
        short[] shortsBuffer = null;
        byte[] buffer = null;


        List<byte[]> outputBuffers = new List<byte[]>();

        Thread recordThread = null;
        Thread senderThread = null;

        int sampleRate = SPIXI.Meta.Config.VoIP_sampleRate;
        int bitsPerSample = SPIXI.Meta.Config.VoIP_bitsPerSample;
        int channels = SPIXI.Meta.Config.VoIP_channels;

        private static SAudioRecorder _singletonInstance;
        public static SAudioRecorder Instance()
        {
            if (_singletonInstance == null)
            {
                _singletonInstance = new SAudioRecorder();
            }
            return _singletonInstance;
        }

        public SAudioRecorder()
        {

        }

        public void start(string codec)
        {
            if (running)
            {
                Logging.warn("Audio recorder is already running.");
                return;
            }
            running = true;
            voiceMode = false;   // ★ #1208: a call — every branch below is the call's own

            // #573 (review MINOR-8): GetSystemService takes any Context — the Activity is not required.
            AudioManager am = (AudioManager)SPlatformUtils.appContext().GetSystemService(Context.AudioService);
            if (Build.VERSION.SdkInt < BuildVersionCodes.O)
            {
                focusListener = new AudioFocusListener();
#pragma warning disable CS0618 // Type or member is obsolete
                am.RequestAudioFocus(focusListener, Android.Media.Stream.VoiceCall, AudioFocus.GainTransient);
#pragma warning restore CS0618 // Type or member is obsolete
            }
            else
            {
                AudioAttributes aa = new AudioAttributes.Builder()
                                                        .SetContentType(AudioContentType.Speech)
                                                        .SetFlags(AudioFlags.LowLatency)
                                                        .SetUsage(AudioUsageKind.VoiceCommunication)
                                                        .Build();

                focusListener = new AudioFocusListener();

                focusRequest = new AudioFocusRequestClass.Builder(AudioFocus.GainTransient)
                                                         .SetAudioAttributes(aa)
                                                         .SetFocusGain(AudioFocus.GainTransient)
                                                         .SetOnAudioFocusChangeListener(focusListener)
                                                         .Build();
                am.RequestAudioFocus(focusRequest);
            }

            lock (outputBuffers)
            {
                outputBuffers.Clear();
            }

            bufferSize = AudioTrack.GetMinBufferSize(sampleRate, ChannelOut.Mono, Android.Media.Encoding.Pcm16bit);

            initEncoder(codec);
            initRecorder();

            recordThread = new Thread(recordLoop);
            recordThread.Start();

            senderThread = new Thread(senderLoop);
            senderThread.Start();
        }

        /* ★★ #1208 (S7) — record a VOICE MESSAGE. The MIC source (VOICE_COMMUNICATION would switch the phone into its call
         * audio path), a TRANSIENT-EXCLUSIVE media focus request (other apps' playback pauses; a loss → onInterrupted), Opus
         * at `bitrate` with the VOIP application. No echo canceller (nothing plays while a clip records). */
        public void startVoiceMessage(int bitrate, Action? onInterrupted)
        {
            if (running)
            {
                Logging.warn("Audio recorder is already running.");
                return;
            }
            running = true;
            voiceMode = true;
            voiceBitrate = bitrate;
            voiceInterrupted = onInterrupted;

            AudioManager am = (AudioManager)SPlatformUtils.appContext().GetSystemService(Context.AudioService);
            focusListener = new AudioFocusListener(() => voiceInterrupted?.Invoke());
            if (Build.VERSION.SdkInt < BuildVersionCodes.O)
            {
#pragma warning disable CS0618 // Type or member is obsolete
                am.RequestAudioFocus(focusListener, Android.Media.Stream.Music, AudioFocus.GainTransientExclusive);
#pragma warning restore CS0618 // Type or member is obsolete
            }
            else
            {
                AudioAttributes aa = new AudioAttributes.Builder()
                                                        .SetContentType(AudioContentType.Speech)
                                                        .SetUsage(AudioUsageKind.Media)
                                                        .Build();
                focusRequest = new AudioFocusRequestClass.Builder(AudioFocus.GainTransientExclusive)
                                                         .SetAudioAttributes(aa)
                                                         .SetOnAudioFocusChangeListener(focusListener)
                                                         .Build();
                am.RequestAudioFocus(focusRequest);
            }

            lock (outputBuffers)
            {
                outputBuffers.Clear();
            }

            bufferSize = AudioTrack.GetMinBufferSize(sampleRate, ChannelOut.Mono, Android.Media.Encoding.Pcm16bit);

            initEncoder("opus");
            initRecorder();

            recordThread = new Thread(recordLoop);
            recordThread.Start();

            senderThread = new Thread(senderLoop);
            senderThread.Start();
        }

        private void initRecorder()
        {
            Android.Media.Encoding encoding = Android.Media.Encoding.Pcm16bit;

            shortsBuffer = new short[bufferSize / 2];
            buffer = new byte[bufferSize];

            audioRecorder = new AudioRecord(
                // Hardware source of recording. ★ #1208: a voice message records from the plain MIC (see startVoiceMessage).
                voiceMode ? AudioSource.Mic : AudioSource.VoiceCommunication,
                // Frequency
                sampleRate,
                // Mono or stereo
                ChannelIn.Mono,
                // Audio encoding
                encoding,
                // Length of the audio clip.
                bufferSize * 5
            );
            audioRecorder.StartRecording();

            if (!voiceMode && AcousticEchoCanceler.IsAvailable)   // ★ #1208: a call only — nothing plays during a voice clip
            {
                echoCanceller = AcousticEchoCanceler.Create(audioRecorder.AudioSessionId);
            }
            if (NoiseSuppressor.IsAvailable)
            {
                noiseSuppressor = NoiseSuppressor.Create(audioRecorder.AudioSessionId);
            }
        }

        private void initEncoder(string codec)
        {
            switch (codec)
            {
                case "amrnb":
                case "amrwb":
                    initHwEncoder(codec);
                    break;

                case "opus":
                    initOpusEncoder();
                    break;

                default:
                    throw new Exception("Unknown recorder codec selected " + codec);
            }
        }

        private void initHwEncoder(string codec)
        {
            MediaFormat format = new MediaFormat();

            string mime_type = null;

            switch (codec)
            {
                case "amrnb":
                    mime_type = MediaFormat.MimetypeAudioAmrNb;
                    format.SetInteger(MediaFormat.KeySampleRate, 8000);
                    format.SetInteger(MediaFormat.KeyBitRate, 7950);
                    break;

                case "amrwb":
                    mime_type = MediaFormat.MimetypeAudioAmrWb;
                    format.SetInteger(MediaFormat.KeySampleRate, 16000);
                    format.SetInteger(MediaFormat.KeyBitRate, 18250);
                    break;
            }

            if (mime_type != null)
            {
                format.SetString(MediaFormat.KeyMime, mime_type);
                format.SetInteger(MediaFormat.KeyChannelCount, 1);
                format.SetInteger(MediaFormat.KeyMaxInputSize, bufferSize);
                format.SetInteger(MediaFormat.KeyLatency, 1);
                format.SetInteger(MediaFormat.KeyPriority, 0);
                audioEncoder = new HwEncoder(mime_type, format, this);
                audioEncoder.start();
            }
        }

        private void initOpusEncoder()
        {
            if (voiceMode)
            {
                // ★ #1208: a voice message — VoiceCodec.BitrateBps with the VOIP application (#1208 (2): 30 s ≈ 54 000 chars inline)
                audioEncoder = new OpusEncoder(sampleRate, voiceBitrate, channels, Concentus.Enums.OpusApplication.OPUS_APPLICATION_VOIP, this);
                audioEncoder.start();
                return;
            }
            audioEncoder = new OpusEncoder(sampleRate, 24000, channels, Concentus.Enums.OpusApplication.OPUS_APPLICATION_RESTRICTED_LOWDELAY, this);
            audioEncoder.start();
        }

        public void stop()
        {
            if (!running)
            {
                return;
            }
            voiceFlushing = voiceMode;   // ★ #46 r1 A M6: a voice clip keeps the frames still encoded during stop()
            running = false;

            if (echoCanceller != null)
            {
                try
                {
                    echoCanceller.Release();
                    echoCanceller.Dispose();
                }
                catch (Exception)
                {

                }
                echoCanceller = null;
            }

            if (noiseSuppressor != null)
            {
                try
                {
                    noiseSuppressor.Release();
                    noiseSuppressor.Dispose();
                }
                catch (Exception)
                {

                }
                noiseSuppressor = null;
            }

            if (audioRecorder != null)
            {
                try
                {
                    audioRecorder.Stop();
                    audioRecorder.Release();
                }
                catch (Exception)
                {

                }
                audioRecorder.Dispose();
                audioRecorder = null;
            }

            if (audioEncoder != null)
            {
                audioEncoder.stop();
                audioEncoder.Dispose();
                audioEncoder = null;
            }

            buffer = null;
            shortsBuffer = null;
            bufferSize = 0;
            if (voiceMode)
            {
                flushVoiceTail();   // ★ #46 r1 A M6: the last buffered packets reach the clip (a call drops them, as before)
            }
            voiceFlushing = false;
            lock (outputBuffers)
            {
                outputBuffers.Clear();
            }
            voiceInterrupted = null;   // ★ #1208: the voice clip's interrupt callback goes with the session


            // #573 (review MINOR-8): GetSystemService takes any Context — the Activity is not required.
            AudioManager am = (AudioManager)SPlatformUtils.appContext().GetSystemService(Context.AudioService);
            if (Build.VERSION.SdkInt < BuildVersionCodes.O)
            {
                if (focusListener != null)
                {
#pragma warning disable CS0618 // Type or member is obsolete
                    am.AbandonAudioFocus(focusListener);
#pragma warning restore CS0618 // Type or member is obsolete
                    focusListener.Dispose();
                    focusListener = null;
                }
            }
            else
            {
                if (focusListener != null)
                {
                    if (focusRequest != null)
                    {
                        am.AbandonAudioFocusRequest(focusRequest);
                        focusRequest.Dispose();
                        focusRequest = null;
                    }
                    focusListener.Dispose();
                    focusListener = null;
                }
            }
        }

        /** ★ #46 r1 A M6: a VOICE clip's stop() hands the packets still waiting in outputBuffers (below the 150-byte batch)
         *  to the callback ONCE — VoiceClips' generation check puts them into the ending clip. A call never comes here. */
        private void flushVoiceTail()
        {
            byte[]? tail = null;
            lock (outputBuffers)
            {
                int total = 0;
                foreach (var buf in outputBuffers)
                {
                    total += buf.Length;
                }
                if (total > 0)
                {
                    tail = new byte[total];
                    int written = 0;
                    foreach (var buf in outputBuffers)
                    {
                        Array.Copy(buf, 0, tail, written, buf.Length);
                        written += buf.Length;
                    }
                }
                outputBuffers.Clear();
            }
            var callback = OnSoundDataReceived;
            if (tail != null && callback != null)
            {
                try
                {
                    callback(tail);
                }
                catch (Exception e)
                {
                    Logging.warn("Voice: the recorder tail flush failed (" + e.GetType().Name + ")");
                }
            }
        }

        public void Dispose()
        {
            stop();
        }

        public bool isRunning()
        {
            return running;
        }

        public void setOnSoundDataReceived(Action<byte[]> on_sound_data_received)
        {
            OnSoundDataReceived = on_sound_data_received;
        }

        private void recordLoop()
        {
            Android.OS.Process.SetThreadPriority(Android.OS.ThreadPriority.UrgentAudio);

            while (running)
            {
                int num_bytes = 0;
                try
                {
                    if (audioRecorder != null)
                    {
                        if (audioEncoder is OpusEncoder)
                        {
                            num_bytes = audioRecorder.ReadAsync(shortsBuffer, 0, shortsBuffer.Length).Result;
                            encode(num_bytes, true);
                        }
                        else
                        {
                            num_bytes = audioRecorder.Read(buffer, 0, buffer.Length);
                            encode(num_bytes, false);
                        }
                    }
                    else
                    {
                        stop();
                    }
                }
                catch (Exception e)
                {
                    Logging.error("Exception occured while recording audio stream: " + e);
                }
                Thread.Sleep(1);
            }
            recordThread = null;
        }

        private void encode(int num_bytes, bool use_shorts)
        {
            if (!running)
            {
                return;
            }
            if (num_bytes > 0)
            {
                if (use_shorts)
                {
                    if (muted)
                    {
                        Array.Clear(shortsBuffer, 0, num_bytes);   // ★ #1074: silence, not a gap
                    }
                    audioEncoder.encode(shortsBuffer, 0, num_bytes);
                }
                else
                {
                    if (muted)
                    {
                        Array.Clear(buffer, 0, num_bytes);   // ★ #1074: silence, not a gap
                    }
                    audioEncoder.encode(buffer, 0, num_bytes);
                }
            }
        }

        private void senderLoop()
        {
            Android.OS.Process.SetThreadPriority(Android.OS.ThreadPriority.UrgentAudio);

            while (running)
            {
                try
                {
                    sendAvailableData();
                }
                catch (Exception e)
                {
                    Logging.error("Exception occured while sending audio stream: " + e);
                }
                Thread.Sleep(5);
            }
            senderThread = null;
        }

        private void sendAvailableData()
        {
            if (!running)
            {
                return;
            }
            byte[] data_to_send = null;
            lock (outputBuffers)
            {
                int total_size = 0;
                foreach (var buf in outputBuffers)
                {
                    total_size += buf.Length;
                }

                if (total_size >= 150)
                {
                    data_to_send = new byte[total_size];
                    int data_written = 0;
                    foreach (var buf in outputBuffers)
                    {
                        Array.Copy(buf, 0, data_to_send, data_written, buf.Length);
                        data_written += buf.Length;
                    }
                    outputBuffers.Clear();
                }
            }
            if (data_to_send != null)
            {
                OnSoundDataReceived(data_to_send);
                //GC.Collect();
                //GC.WaitForPendingFinalizers();
            }
        }

        public void onEncodedData(byte[] data)
        {
            if (!running && !voiceFlushing)   // ★ #46 r1 A M6: during a voice clip's stop() the encoder's last frames still count
            {
                return;
            }
            lock (outputBuffers)
            {
                outputBuffers.Add(data);
            }
        }
    }
}
