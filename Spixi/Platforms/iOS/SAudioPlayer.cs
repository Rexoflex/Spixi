using AVFoundation;
using Foundation;
using IXICore.Meta;
using Spixi.VoIP;
using SPIXI.VoIP;
using System;
using System.Runtime.InteropServices;

namespace Spixi
{
    public class SAudioPlayer : IAudioPlayer, IAudioDecoderCallback
    {
        private AVAudioEngine audioEngine = null;
        private AVAudioPlayerNode audioPlayer = null;
        private AVAudioFormat inputAudioFormat = null;
        // ★ E-W1 (Mac walk crash 2026-10-01: SIGSEGV in -[AVAudioNode dealloc] → AVAudioClock → RemoveRenderObserver):
        // every AVAudioEngine.OutputNode / MainMixerNode read makes a managed wrapper that holds a retain; if the GC
        // releases it AFTER the engine is gone, the IO node's destructor touches the freed engine. Hold them once and
        // dispose them in stop() BEFORE the engine.
        private AVAudioOutputNode outputNode = null;
        private AVAudioMixerNode mainMixer = null;

        private IAudioDecoder audioDecoder = null;

        private bool running = false;

        int sampleRate = SPIXI.Meta.Config.VoIP_sampleRate;
        int bitsPerSample = SPIXI.Meta.Config.VoIP_bitsPerSample;
        int channels = SPIXI.Meta.Config.VoIP_channels;

        private static SAudioPlayer _singletonInstance;

        private PlaybackCatchupController playbackCatchupController = new PlaybackCatchupController();
        private AVAudioUnitTimePitch timePitchNode;
        private long totalFramesWritten = 0;

        /* ★★ #1208 (S7): this instance plays a VOICE MESSAGE (startVoiceMessage) — the Playback category (the loudspeaker
         * or a headset; PlayAndRecord's default route is the receiver), no preferred-rate change, no catch-up, and an
         * interruption observer. false = a call (start), byte for byte as before. */
        private bool voiceMode = false;
        private Action? voiceInterrupted = null;
        private NSObject? voiceInterruptionObserver = null;
        public static SAudioPlayer Instance()
        {
            if (_singletonInstance == null)
            {
                _singletonInstance = new SAudioPlayer();
            }
            return _singletonInstance;
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

            initPlayer();
            initDecoder(codec);
        }

        /* ★★ #1208 (S7) — play a VOICE MESSAGE: Opus 16 kHz mono through the same engine graph, the Playback category
         * (loudspeaker; other audio is interrupted, not mixed), no catch-up (VoiceClips paces the writes); an audio session
         * interruption (a phone call, another app) → onInterrupted. */
        public void startVoiceMessage(Action? onInterrupted)
        {
            if (running)
            {
                Logging.warn("Audio player is already running.");
                return;
            }

            running = true;
            voiceMode = true;
            voiceInterrupted = onInterrupted;

            initPlayer();
            setVolume(1.0f);   // ★ #1208: the system volume alone sets the level (initPlayer scales the node by it for a call)
            initDecoder("opus");
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
        }

        private void initPlayer()
        {
            audioEngine = new AVAudioEngine();
            NSError error = new NSError();
            if (voiceMode)
            {
                // ★ #1208: a voice message — Playback = the loudspeaker (no receiver route), the hardware rate is left alone
                // (the engine's mixer converts the 16 kHz input)
                AVAudioSession.SharedInstance().SetCategory(AVAudioSessionCategory.Playback, (AVAudioSessionCategoryOptions)0);
                AVAudioSession.SharedInstance().SetActive(true);
            }
            else
            {
                if (!AVAudioSession.SharedInstance().SetPreferredSampleRate(sampleRate, out error))
                {
                    throw new Exception("Error setting preffered sample rate for player: " + error);
                }
                AVAudioSession.SharedInstance().SetCategory(AVAudioSessionCategory.PlayAndRecord, AVAudioSessionCategoryOptions.InterruptSpokenAudioAndMixWithOthers);
                AVAudioSession.SharedInstance().SetActive(true);
            }

            audioPlayer = new AVAudioPlayerNode();
            setVolume(AVAudioSession.SharedInstance().OutputVolume);
            inputAudioFormat = new AVAudioFormat(AVAudioCommonFormat.PCMFloat32, sampleRate, (uint)channels, true);
            
            timePitchNode = new AVAudioUnitTimePitch();
            timePitchNode.Rate = 1.0f;
            
            audioEngine.AttachNode(audioPlayer);
            audioEngine.AttachNode(timePitchNode);

            audioEngine.Connect(audioPlayer, timePitchNode, inputAudioFormat);
            mainMixer = audioEngine.MainMixerNode;
            outputNode = audioEngine.OutputNode;
            audioEngine.Connect(timePitchNode, mainMixer, inputAudioFormat);

            audioEngine.Prepare();
            if (!audioEngine.StartAndReturnError(out error))
            {
                throw new Exception("Error starting playback audio engine: " + error);
            }
            audioPlayer.Play();
        }

        private void initDecoder(string codec)
        {
            switch (codec)
            {
                case "opus":
                    initOpusDecoder();
                    break;

                default:
                    throw new Exception("Unknown player codec selected " + codec);
            }
        }

        private void initOpusDecoder()
        {
            audioDecoder = new OpusDecoder(sampleRate, channels, this, OpusDecoderReturnType.floats);
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

            if (audioPlayer != null)
            {
                try
                {
                    audioPlayer.Stop();
                    audioPlayer.Reset();
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

            if (audioEngine != null)
            {
                try
                {
                    audioEngine.Stop();
                    audioEngine.Reset();
                }
                catch (Exception)
                {

                }

                // ★ E-W1: release our node wrappers while the engine is still alive
                outputNode?.Dispose();
                outputNode = null;
                mainMixer?.Dispose();
                mainMixer = null;
                audioEngine.Dispose();
                audioEngine = null;
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
            throw new NotImplementedException();
        }

        public void setVolume(float volume)
        {
            if (audioPlayer != null)
            {
                audioPlayer.Volume = volume;
            }
        }

        public void onDecodedData(float[] data)
        {
            if (!running || audioPlayer == null)
            {
                return;
            }

            int frames = data.Length / channels;
            if (frames <= 0)
            {
                return;
            }

            var buffer = new AVAudioPcmBuffer(inputAudioFormat, (uint)frames)
            {
                FrameLength = (uint)frames
            };

            var basePtr = buffer.FloatChannelData;
            if (basePtr == IntPtr.Zero)
            {
                buffer.Dispose();
                return;
            }

            IntPtr channelPtr = Marshal.ReadIntPtr(basePtr, 0);

            Marshal.Copy(data, 0, channelPtr, data.Length);

            if (voiceMode)
            {
                // ★ #1208: no catch-up — VoiceClips writes at real time, so every buffer plays at 1×
                timePitchNode.Rate = 1.0f;
                audioPlayer.ScheduleBuffer(buffer, () =>
                {
                    buffer.Dispose();
                });
                totalFramesWritten += buffer.FrameLength;
                return;
            }

            long playedFrames = 0;
            var outNode = outputNode;
            using (var lastRenderTime = outNode?.LastRenderTime)
            {
                if (lastRenderTime != null)
                {
                    using (var playerTime = audioPlayer.GetPlayerTimeFromNodeTime(lastRenderTime))
                    {
                        if (playerTime != null)
                            playedFrames = playerTime.SampleTime;
                    }
                }
            }

            long queuedFrames = Math.Max(totalFramesWritten - playedFrames, 0);
            double queuedSeconds = (double)queuedFrames / sampleRate;

            var catchup = playbackCatchupController.Update(queuedSeconds);
            bool shouldDrop = false;

            switch (catchup.Type)
            {
                case PlaybackCatchupType.Drop:
                    timePitchNode.Rate = catchup.Speed;
                    if (Random.Shared.NextDouble() < 0.10)
                    {
                        Logging.warn($"VoIP Dropping frame, avg {playbackCatchupController.GetAverageLatency() * 1000:F0}ms");
                        shouldDrop = true;
                    }
                    break;

                case PlaybackCatchupType.SpeedUp:
                    timePitchNode.Rate = catchup.Speed;
                    break;

                case PlaybackCatchupType.Normal:
                    timePitchNode.Rate = 1.0f;
                    break;
            }

            if (!shouldDrop)
            {
                audioPlayer.ScheduleBuffer(buffer, () =>
                {
                    buffer.Dispose();
                });

                totalFramesWritten += buffer.FrameLength;
            }
            else
            {
                buffer.Dispose();
            }
        }


        public void onDecodedData(short[] data)
        {
            throw new NotImplementedException();
        }

    }
}
