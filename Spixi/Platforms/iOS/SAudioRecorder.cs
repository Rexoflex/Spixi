using AudioToolbox;
using AVFoundation;
using Foundation;
using IXICore.Meta;
using SPIXI.VoIP;
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;

namespace Spixi
{
    public class SAudioRecorder : IAudioRecorder, IAudioEncoderCallback
    {
        private Action<byte[]> OnSoundDataReceived;

        private AVAudioEngine audioRecorder = null;
        // ★ E-W1 (Mac walk crash 2026-10-01: SIGSEGV in -[AVAudioNode dealloc] → AVAudioClock → RemoveRenderObserver):
        // the InputNode wrapper must be released BEFORE the engine (see SAudioPlayer). Held once, disposed in stop().
        private AVAudioInputNode inputNode = null;
        private AVAudioConverter audioConverter = null;
        private IAudioEncoder audioEncoder = null;

        bool running = false;
        volatile bool muted = false;   // ★ #1074: zero the PCM, keep the frames flowing

        /* ★★ #1208 (S7): this instance records a VOICE MESSAGE (startVoiceMessage) — PlayAndRecord with DefaultToSpeaker
         * (never the receiver afterwards; other audio is interrupted, not mixed), Opus at voiceBitrate with the VOIP
         * application, an interruption observer. false = a call (start), byte for byte as before. */
        bool voiceMode = false;
        volatile bool voiceFlushing = false;   // ★ #46 r1 A M6: true only inside a voice clip's stop()
        int voiceBitrate = 0;
        Action? voiceInterrupted = null;
        NSObject? voiceInterruptionObserver = null;

        public void setMuted(bool is_muted)
        {
            muted = is_muted;
        }

        List<byte[]> outputBuffers = new List<byte[]>();

        Thread recordThread = null;

        int sampleRate = SPIXI.Meta.Config.VoIP_sampleRate;
        int bitsPerSample = SPIXI.Meta.Config.VoIP_bitsPerSample;
        int channels = SPIXI.Meta.Config.VoIP_channels;

        AVAudioFormat desiredFormat;
        AVAudioFormat recordingFormat;

        private static SAudioRecorder _singletonInstance;
        public static SAudioRecorder Instance()
        {
            if (_singletonInstance == null)
            {
                _singletonInstance = new SAudioRecorder();
            }
            return _singletonInstance;
        }

        public void start(string codec)
        {
            if (running)
            {
                Logging.warn("Audio recorder is already running.");
                return;
            }
            running = true;
            voiceMode = false;   // ★ #1208: a call — initRecorder / initOpusEncoder take the call's own branches

            lock (outputBuffers)
            {
                outputBuffers.Clear();
            }

            initEncoder(codec);
            initRecorder();

            recordThread = new Thread(recordLoop);
            recordThread.Start();
        }

        /* ★★ #1208 (S7) — record a VOICE MESSAGE (see the fields). A throw leaves `running` set, exactly like start(codec):
         * the caller (VoiceClips) disposes the instance on any failure. */
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

            lock (outputBuffers)
            {
                outputBuffers.Clear();
            }

            initEncoder("opus");
            initRecorder();
            try
            {
                voiceInterruptionObserver = AVAudioSession.Notifications.ObserveInterruption((sender, args) =>
                {
                    if (args.InterruptionType == AVAudioSessionInterruptionType.Began)
                    {
                        try { voiceInterrupted?.Invoke(); } catch (Exception) { }
                    }
                });
            }
            catch (Exception e)
            {
                Logging.warn("Voice: interruption observer failed (" + e.GetType().Name + ")");
            }

            recordThread = new Thread(recordLoop);
            recordThread.Start();
        }

        private void initRecorder()
        {
            NSError error = new NSError();
            if (!AVAudioSession.SharedInstance().SetPreferredSampleRate(sampleRate, out error))
            {
                throw new Exception("Error setting preferred sample rate for recorder: " + error);
            }

            if (voiceMode)
            {
                // ★ #1208: a voice message — no mixing (other audio pauses), and DefaultToSpeaker so the session never leaves
                // the receiver as the output route
                AVAudioSession.SharedInstance().SetCategory(AVAudioSessionCategory.PlayAndRecord, AVAudioSessionCategoryOptions.DefaultToSpeaker);
            }
            else
            {
                AVAudioSession.SharedInstance().SetCategory(AVAudioSessionCategory.PlayAndRecord, AVAudioSessionCategoryOptions.InterruptSpokenAudioAndMixWithOthers);
            }
            AVAudioSession.SharedInstance().SetActive(true);

            audioRecorder = new AVAudioEngine();

            desiredFormat = new AVAudioFormat(AVAudioCommonFormat.PCMInt16, sampleRate, (uint)channels, false);
            inputNode = audioRecorder.InputNode;
            recordingFormat = inputNode.GetBusOutputFormat(0);

            Logging.info($"Recording format: {recordingFormat}");
            Logging.info($"Desired output format: {desiredFormat}");

            audioConverter = new AVAudioConverter(recordingFormat, desiredFormat);


            uint bufferSize = (uint)(recordingFormat.SampleRate * 0.1); // 100ms
            inputNode.InstallTapOnBus(0, bufferSize, recordingFormat, onDataAvailable);

            audioRecorder.Prepare();
            if (!audioRecorder.StartAndReturnError(out error))
            {
                throw new Exception("Error starting recording audio engine: " + error);
            }
        }

        private void onDataAvailable(AVAudioPcmBuffer buffer, AVAudioTime when)
        {
            AVAudioPcmBuffer outputBuffer = new AVAudioPcmBuffer(desiredFormat, (uint)(desiredFormat.SampleRate * 0.1)); // 100ms
            AVAudioConverterInputHandler inputHandler = (uint inNumberOfPackets, out AVAudioConverterInputStatus outStatus) =>
            {
                outStatus = AVAudioConverterInputStatus.HaveData;
                return buffer;
            };
            NSError? outError;
            var status = audioConverter.ConvertToBuffer(outputBuffer, out outError, inputHandler);
            if (status != AVAudioConverterOutputStatus.HaveData)
            {
                Logging.warn("Conversion failed or no data. Status: {0}, Error: {1}", status, outError?.LocalizedDescription ?? "Unknown error");
                return;
            }

            AudioBuffer audioBuffer = outputBuffer.AudioBufferList[0];
            byte[] data = new byte[audioBuffer.DataByteSize];
            Marshal.Copy(audioBuffer.Data, data, 0, audioBuffer.DataByteSize);

            encode(data, 0, data.Length);
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

            if (voiceMode)
            {
                // ★ #1208: the observer goes first (a deactivation must not call back into a finished clip); the session is
                // released at the END, after the engine stopped (a session with running I/O refuses to deactivate), with
                // NotifyOthersOnDeactivation so paused music can resume
                voiceInterruptionObserver?.Dispose();
                voiceInterruptionObserver = null;
                voiceInterrupted = null;
            }
            else
            {
                AVAudioSession.SharedInstance().SetActive(false);
            }

            if (audioRecorder != null)
            {
                try
                {
                    inputNode?.RemoveTapOnBus(0);
                    audioRecorder.Stop();
                    audioRecorder.Reset();
                }
                catch (Exception)
                {

                }
                inputNode?.Dispose();   // ★ E-W1: before the engine
                inputNode = null;
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
            if (voiceMode)
            {
                try
                {
                    AVAudioSession.SharedInstance().SetActive(false, AVAudioSessionSetActiveOptions.NotifyOthersOnDeactivation, out NSError? deactivateError);
                }
                catch (Exception)
                {
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
                }
                catch (Exception e)
                {
                    Logging.error("Exception occured in encode loop: " + e);
                }
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
