using IXICore.Meta;
using NAudio.Wave;
using SPIXI.VoIP;
using System;
using System.Collections.Generic;
using System.Threading;

namespace Spixi
{
    public class SAudioRecorder : IAudioRecorder, IAudioEncoderCallback
    {
        private Action<byte[]> OnSoundDataReceived;

        private WaveIn audioRecorder = null;
        private IAudioEncoder audioEncoder = null;

        bool running = false;
        volatile bool muted = false;   // ★ #1074: zero the PCM, keep the frames flowing

        /* ★★ #1208 (S7): this instance records a VOICE MESSAGE (startVoiceMessage) — Opus at voiceBitrate (VOIP). WaveIn
         * has no focus / interruption on Windows, so onInterrupted is never raised here. false = a call (start). */
        bool voiceMode = false;
        volatile bool voiceFlushing = false;   // ★ #46 r1 A M6: true only inside a voice clip's stop()
        int voiceBitrate = 0;
        volatile Action<int>? voiceLevel = null;   // ★ S8 picks (#1239): the live mic level — voice mode only (setOnVoiceLevel)

        public void setMuted(bool is_muted)
        {
            muted = is_muted;
        }

        /* ★ S8 picks (#1239): the rec bar's live wave. Read on the capture thread only in the voice mode (tapVoiceLevel). */
        public void setOnVoiceLevel(Action<int>? on_level)
        {
            voiceLevel = on_level;
        }

        List<byte[]> outputBuffers = new List<byte[]>();

        Thread recordThread = null;

        int sampleRate = SPIXI.Meta.Config.VoIP_sampleRate;
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
            voiceMode = false;   // ★ #1208: a call — initOpusEncoder keeps 24 000

            lock (outputBuffers)
            {
                outputBuffers.Clear();
            }

            initEncoder(codec);
            if(!initRecorder())
            {
                // TODO show notification
                stop();
                return;
            }

            recordThread = new Thread(recordLoop);
            recordThread.Start();
        }

        /* ★★ #1208 (S7) — record a VOICE MESSAGE. No input device → the recorder stops itself (isRunning() = false), as a
         * call's start does; VoiceClips reads that as an error. */
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

            lock (outputBuffers)
            {
                outputBuffers.Clear();
            }

            initEncoder("opus");
            if (!initRecorder())
            {
                stop();
                return;
            }

            recordThread = new Thread(recordLoop);
            recordThread.Start();
        }

        private bool initRecorder()
        {
            if (WaveIn.DeviceCount < 1)
            {
                Logging.error("No input devices found.");
                return false;
            }

            audioRecorder = new WaveIn(WaveCallbackInfo.FunctionCallback());
            audioRecorder.WaveFormat = new WaveFormat(sampleRate, 16, channels);
            audioRecorder.DataAvailable += onDataAvailable;

            audioRecorder.BufferMilliseconds = 40;
            audioRecorder.NumberOfBuffers = 4;
            audioRecorder.DeviceNumber = 0;
            audioRecorder.StartRecording();

            return true;
        }

        private void listInputDevices()
        {
            for (int n = 0; n < WaveIn.DeviceCount; n++)
            {
                var deviceInfo = WaveIn.GetCapabilities(n);
                Console.WriteLine($"{n}: {deviceInfo.ProductName}, Channels: {deviceInfo.Channels}");
            }
        }

        private void onDataAvailable(object obj, WaveInEventArgs wave_event)
        {
            encode(wave_event.Buffer, 0, wave_event.BytesRecorded);
        }

        private void initEncoder(string codec)
        {
            switch (codec)
            {
                case "opus":
                    initOpusEncoder();
                    break;

                default:
                    throw new Exception("Unknown recorder codec selected " + codec);
            }
        }

        private void initOpusEncoder()
        {
            // ★ #1208: a voice message encodes at VoiceCodec.BitrateBps; a call keeps 24 000 (both VOIP)
            audioEncoder = new OpusEncoder(sampleRate, voiceMode ? voiceBitrate : 24000, channels, Concentus.Enums.OpusApplication.OPUS_APPLICATION_VOIP, this);
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
            voiceLevel = null;   // ★ S8 picks #46 r1 A NIT-3: the level callback goes with the session (like voiceInterrupted)

            if (audioRecorder != null)
            {
                try
                {
                    audioRecorder.StopRecording();
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

            if (voiceMode)
            {
                flushVoiceTail();   // ★ #46 r1 A M6: the last buffered packets reach the clip (a call drops them, as before)
            }
            voiceFlushing = false;
            lock (outputBuffers)
            {
                outputBuffers.Clear();
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
            while (running)
            {
                try
                {
                    sendAvailableData();
                }
                catch (Exception e)
                {
                    Logging.error("Exception occured while recording audio stream: " + e);
                }
                Thread.Sleep(10);
            }
            recordThread = null;
        }

        private void encode(byte[] buffer, int offset, int size)
        {
            if (!running)
            {
                return;
            }
            if (size > 0)
            {
                try
                {
                    if (muted)
                    {
                        Array.Clear(buffer, offset, size);   // ★ #1074: silence, not a gap
                    }
                    audioEncoder.encode(buffer, offset, size);
                    tapVoiceLevel(buffer, offset, size);   // ★ S8 picks (#1239): voice mode only
                }
                catch (Exception e)
                {
                    Logging.error("Exception occured in encode loop: " + e);
                }
            }
        }

        /** ★ S8 picks (#1239): a VOICE MESSAGE's buffer → its level (0–100) → VoiceClips. The PCM is only READ (after the
         *  encoder got it); a call (voiceMode false) never comes past the first line. Nothing is logged. */
        private void tapVoiceLevel(byte[] pcm, int offset, int size)
        {
            Action<int>? on_level = voiceLevel;
            if (!voiceMode || on_level == null)
            {
                return;
            }
            try
            {
                on_level(SPIXI.VoiceLevel.fromPcm16Bytes(pcm, offset, size));
            }
            catch (Exception)
            {
            }
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
