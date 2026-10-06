using Android.Media;
using Android.OS;
using IXICore.Meta;
using Spixi.VoIP;
using SPIXI.VoIP;
using System;

namespace Spixi
{
    public class SAudioPlayer : IAudioPlayer, IAudioDecoderCallback
    {
        private AudioTrack audioPlayer = null;
        private IAudioDecoder audioDecoder = null;

        private bool running = false;

        int bufferSize = 0;

        string codec = "opus";
        int sampleRate = SPIXI.Meta.Config.VoIP_sampleRate;
        int bitsPerSample = SPIXI.Meta.Config.VoIP_bitsPerSample;
        int channels = SPIXI.Meta.Config.VoIP_channels;

        private static SAudioPlayer _singletonInstance;

        private PlaybackCatchupController playbackCatchupController = new PlaybackCatchupController();
        private long totalFramesWritten = 0;

        /* ★★ #1208 (S7): this instance plays a VOICE MESSAGE (startVoiceMessage) — USAGE_MEDIA (the loudspeaker, or a
         * headset; VOICE_COMMUNICATION is the earpiece), a transient media focus request, the media volume keys, no
         * catch-up. false = a call (start), byte for byte as before. */
        private bool voiceMode = false;
        private AudioFocusListener? voiceFocusListener = null;
        private AudioFocusRequestClass? voiceFocusRequest = null;
        private Android.Media.Stream? voicePrevVolumeStream = null;
        public static SAudioPlayer Instance()
        {
            if (_singletonInstance == null)
            {
                _singletonInstance = new SAudioPlayer();
            }
            return _singletonInstance;
        }

        public SAudioPlayer()
        {
        }

        public void start(string codec)
        {
            if (running)
            {
                Logging.warn("Audio player is already running.");
                return;
            }

            running = true;
            voiceMode = false;   // ★ #1208: a call — initPlayer / onDecodedData take the call's own branches

            this.codec = codec;

            initPlayer();
            initDecoder();
        }

        /* ★★ #1208 (S7) — play a VOICE MESSAGE: Opus 16 kHz mono, USAGE_MEDIA (loudspeaker), media focus
         * (GAIN_TRANSIENT — other playback pauses; a loss → onInterrupted), the activity's volume keys on the music stream
         * while it plays (restored at stop), no catch-up (VoiceClips paces the writes). */
        public void startVoiceMessage(Action? onInterrupted)
        {
            if (running)
            {
                Logging.warn("Audio player is already running.");
                return;
            }

            running = true;
            voiceMode = true;
            codec = "opus";

            AudioManager am = (AudioManager)SPlatformUtils.appContext().GetSystemService(Android.Content.Context.AudioService)!;
            voiceFocusListener = new AudioFocusListener(onInterrupted);
            if (Build.VERSION.SdkInt < BuildVersionCodes.O)
            {
#pragma warning disable CS0618 // Type or member is obsolete
                am.RequestAudioFocus(voiceFocusListener, Android.Media.Stream.Music, AudioFocus.GainTransient);
#pragma warning restore CS0618 // Type or member is obsolete
            }
            else
            {
                AudioAttributes fa = new AudioAttributes.Builder()
                                                        .SetContentType(AudioContentType.Speech)
                                                        .SetUsage(AudioUsageKind.Media)
                                                        .Build();
                voiceFocusRequest = new AudioFocusRequestClass.Builder(AudioFocus.GainTransient)
                                                              .SetAudioAttributes(fa)
                                                              .SetOnAudioFocusChangeListener(voiceFocusListener)
                                                              .Build();
                am.RequestAudioFocus(voiceFocusRequest);
            }

            initPlayer();
            initDecoder();
        }

        private void initPlayer()
        {
            Android.Media.Encoding encoding = Android.Media.Encoding.Pcm16bit;

            bufferSize = AudioTrack.GetMinBufferSize(sampleRate, ChannelOut.Mono, encoding);
            Logging.info("Min. buffer size " + bufferSize);
            int new_buffer_size = CodecTools.getPcmFrameByteSize(sampleRate, bitsPerSample, channels) * 100;
            if (bufferSize < new_buffer_size)
            {
                bufferSize = (int)(Math.Ceiling((decimal)new_buffer_size / bufferSize) * bufferSize);
            }
            Logging.info("Final buffer size " + bufferSize);

            // Prepare player
            // ★ #1208: a voice message plays as MEDIA (the loudspeaker); a call keeps VOICE_COMMUNICATION (the earpiece)
            AudioAttributes aa = voiceMode
                ? new AudioAttributes.Builder()
                                     .SetContentType(AudioContentType.Speech)
                                     .SetUsage(AudioUsageKind.Media)
                                     .Build()
                : new AudioAttributes.Builder()
                                                    .SetContentType(AudioContentType.Speech)
                                                    .SetFlags(AudioFlags.LowLatency)
                                                    .SetUsage(AudioUsageKind.VoiceCommunication)
                                                    .Build();

            AudioFormat af = new AudioFormat.Builder()
                                            .SetSampleRate(sampleRate)
                                            .SetChannelMask(ChannelOut.Mono)
                                            .SetEncoding(encoding)
                                            .Build();

            audioPlayer = new AudioTrack(aa, af, bufferSize, AudioTrackMode.Stream, 0);

            // #573 (review MINOR-8): activity-only member — a headless process has none.
            MainActivity? volActivityVoiceCall = MainActivity.Instance;
            if (volActivityVoiceCall != null)
            {
                if (voiceMode)
                {
                    // ★ #1208: the volume keys move the MEDIA volume while a voice message plays; stop() puts the old stream back
                    voicePrevVolumeStream = volActivityVoiceCall.VolumeControlStream;
                    volActivityVoiceCall.VolumeControlStream = Android.Media.Stream.Music;
                }
                else
                {
                    volActivityVoiceCall.VolumeControlStream = Android.Media.Stream.VoiceCall;
                }
            }

            audioPlayer.Play();
        }

        private void initDecoder()
        {
            switch (codec)
            {
                case "amrnb":
                case "amrwb":
                    initHwDecoder(codec);
                    break;

                case "opus":
                    initOpusDecoder();
                    break;

                default:
                    throw new Exception("Unknown player codec selected " + codec);
            }
        }

        private void initHwDecoder(string codec)
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
                audioDecoder = new HwDecoder(mime_type, format, this);
                audioDecoder.start();
            }
        }

        private void initOpusDecoder()
        {
            audioDecoder = new OpusDecoder(sampleRate, channels, this, OpusDecoderReturnType.shorts);
            audioDecoder.start();
        }

        public int write(byte[] audio_data)
        {
            if (!running)
            {
                return 0;
            }
            if (audioPlayer != null && running)
            {
                decode(audio_data);
                return audio_data.Length;
            }
            return 0;
        }

        public void stop()
        {
            if (!running)
            {
                return;
            }

            running = false;

            totalFramesWritten = 0;

            // #573 (review MINOR-8): activity-only member — a headless process has none.
            MainActivity? volActivityNotificationDefault = MainActivity.Instance;
            if (volActivityNotificationDefault != null)
            {
                if (voiceMode)
                {
                    // ★ #1208: back to the stream the activity had before the clip (a call keeps its own reset below)
                    volActivityNotificationDefault.VolumeControlStream = voicePrevVolumeStream ?? Android.Media.Stream.NotificationDefault;
                    voicePrevVolumeStream = null;
                }
                else
                {
                    volActivityNotificationDefault.VolumeControlStream = Android.Media.Stream.NotificationDefault;
                }
            }
            if (voiceMode)
            {
                abandonVoiceFocus();   // ★ #1208
            }

            if (audioPlayer != null)
            {
                try
                {
                    audioPlayer.Stop();
                    audioPlayer.Release();
                }
                catch (Exception)
                {

                }

                audioPlayer.Dispose();
                audioPlayer = null;
            }

            if (audioDecoder != null)
            {
                audioDecoder.stop();
                audioDecoder.Dispose();
                audioDecoder = null;
            }

            bufferSize = 0;
        }

        /** ★ #1208: give back the voice message's media focus (other apps' playback resumes). */
        private void abandonVoiceFocus()
        {
            try
            {
                AudioManager am = (AudioManager)SPlatformUtils.appContext().GetSystemService(Android.Content.Context.AudioService)!;
                if (voiceFocusRequest != null)
                {
                    am.AbandonAudioFocusRequest(voiceFocusRequest);
                    voiceFocusRequest.Dispose();
                    voiceFocusRequest = null;
                }
                else if (voiceFocusListener != null)
                {
#pragma warning disable CS0618 // Type or member is obsolete
                    am.AbandonAudioFocus(voiceFocusListener);
#pragma warning restore CS0618 // Type or member is obsolete
                }
            }
            catch (Exception e)
            {
                Logging.warn("Voice: focus release failed (" + e.GetType().Name + ")");
            }
            voiceFocusListener?.Dispose();
            voiceFocusListener = null;
        }

        public void Dispose()
        {
            stop();
        }

        public bool isRunning()
        {
            return running;
        }

        private void decode(byte[] data)
        {
            if (!running)
            {
                return;
            }
            audioDecoder.decode(data);
        }

        public void onDecodedData(byte[] data)
        {
            if (!running)
            {
                return;
            }
            audioPlayer.Write(data, 0, data.Length);
        }

        public void setVolume(float volume)
        {
            if (audioPlayer == null)
            {
                return;
            }

            float clamped = Math.Clamp(volume, 0f, 1f);

            try
            {
                if (Build.VERSION.SdkInt >= BuildVersionCodes.Lollipop)
                {
                    audioPlayer.SetVolume(clamped);
                }
                else
                {
                    // Legacy support: balance both channels equally
                    audioPlayer.SetStereoVolume(clamped, clamped);
                }
            }
            catch (Exception e)
            {
                Logging.error("Failed to set volume: " + e.Message);
            }
        }

        public void onDecodedData(short[] data)
        {
            if (!running || audioPlayer == null)
            {
                return;
            }

            if (voiceMode)
            {
                // ★ #1208: no catch-up — VoiceClips writes at real time, so every frame plays at 1×
                audioPlayer.Write(data, 0, data.Length);
                return;
            }

            // Get how many frames have been played back
            long framesPlayed = 0;
            try
            {
                framesPlayed = audioPlayer.PlaybackHeadPosition;
            }
            catch
            {
                // fallback, assume minimal playback progress
                framesPlayed = totalFramesWritten;
            }

            // Calculate queued audio in seconds
            long queuedFrames = Math.Max(0, totalFramesWritten - framesPlayed);
            double queuedSeconds = (double)queuedFrames / sampleRate;

            var catchup = playbackCatchupController.Update(queuedSeconds);
            bool shouldDrop = false;

            switch (catchup.Type)
            {
                case PlaybackCatchupType.Drop:
                    if (Build.VERSION.SdkInt >= BuildVersionCodes.M)
                    {
                        var pp = audioPlayer.PlaybackParams;
                        pp.SetSpeed(catchup.Speed);
                        audioPlayer.PlaybackParams = pp;
                    }
                    if (Random.Shared.NextDouble() < 0.10)
                    {
                        Logging.warn($"VoIP Dropping frame, avg {playbackCatchupController.GetAverageLatency() * 1000:F0}ms");
                        shouldDrop = true;
                    }
                    break;

                case PlaybackCatchupType.SpeedUp:
                    if (Build.VERSION.SdkInt >= BuildVersionCodes.M)
                    {
                        var pp = audioPlayer.PlaybackParams;
                        pp.SetSpeed(catchup.Speed);
                        audioPlayer.PlaybackParams = pp;
                    }
                    else if (Random.Shared.NextDouble() < catchup.Speed - 1.0)
                    {
                        shouldDrop = true;
                    }
                    break;

                case PlaybackCatchupType.Normal:
                    if (Build.VERSION.SdkInt >= BuildVersionCodes.M)
                    {
                        var pp = audioPlayer.PlaybackParams;
                        pp.SetSpeed(1.0f);
                        audioPlayer.PlaybackParams = pp;
                    }
                    break;
            }

            if (!shouldDrop)
            {
                audioPlayer.Write(data, 0, data.Length);
                // Update written frames
                totalFramesWritten += data.Length / channels;
            }
        }

        public void onDecodedData(float[] data)
        {
            // not needed
            throw new NotImplementedException();
        }
    }
}
