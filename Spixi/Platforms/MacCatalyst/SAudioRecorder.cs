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

        private AVAudioConverter audioConverter = null;
        private AVAudioEngine audioRecorder = null;
        // ★ E-W1 (Mac walk crash 2026-10-01: SIGSEGV in -[AVAudioNode dealloc] → AVAudioClock → RemoveRenderObserver):
        // the InputNode wrapper must be released BEFORE the engine (see SAudioPlayer). Held once, disposed in stop().
        private AVAudioInputNode inputNode = null;
        private IAudioEncoder audioEncoder = null;

        bool running = false;
        volatile bool muted = false;   // ★ #1074: zero the PCM, keep the frames flowing

        public void setMuted(bool is_muted)
        {
            muted = is_muted;
        }

        List<byte[]> outputBuffers = new List<byte[]>();

        Thread recordThread = null;

        AVAudioFormat desiredFormat;
        AVAudioFormat recordingFormat;

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

        public void start(string codec)
        {
            if (running)
            {
                Logging.warn("Audio recorder is already running.");
                return;
            }
            running = true;

            lock (outputBuffers)
            {
                outputBuffers.Clear();
            }

            initEncoder(codec);
            initRecorder();

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
            AVAudioSession.SharedInstance().SetCategory(AVAudioSessionCategory.PlayAndRecord, AVAudioSessionCategoryOptions.InterruptSpokenAudioAndMixWithOthers);
            AVAudioSession.SharedInstance().SetActive(true);

            audioRecorder = new AVAudioEngine();

            // ★ A1 (office walk #1084, ixian.log 20:25:22): AVAudioEngine REFUSES a tap whose
            // format differs from the input node's hardware format ("Failed to create tap due to
            // format mismatch, <1 ch, 16000 Hz, Int16>") — so every Mac call threw at start and
            // ended at 0:00. Same shape as Platforms/iOS/SAudioRecorder.cs: tap in the hardware
            // format, convert to the codec's 16 kHz Int16 with AVAudioConverter.
            desiredFormat = new AVAudioFormat(AVAudioCommonFormat.PCMInt16, sampleRate, (uint)channels, false);
            inputNode = audioRecorder.InputNode;
            recordingFormat = inputNode.GetBusOutputFormat(0);

            Logging.info($"Recording format: {recordingFormat}");
            Logging.info($"Desired output format: {desiredFormat}");

            // No microphone (or no permission yet) reports a 0 Hz / 0 ch format; a converter from
            // it is invalid. Throw a clear reason instead of an ObjC exception inside the tap.
            if (recordingFormat == null || recordingFormat.SampleRate <= 0 || recordingFormat.ChannelCount == 0)
            {
                inputNode?.Dispose();   // ★ E-W1: never leave the node wrapper to the GC after a failed start
                inputNode = null;
                throw new Exception("No usable microphone input format: " + recordingFormat);
            }

            audioConverter = new AVAudioConverter(recordingFormat, desiredFormat);

            uint bufferSize = (uint)(recordingFormat.SampleRate * 0.1); // 100 ms (a request; macOS may deliver other sizes)
            inputNode.InstallTapOnBus(0, bufferSize, recordingFormat, onDataAvailable);

            audioRecorder.Prepare();
            if (!audioRecorder.StartAndReturnError(out error))
            {
                throw new Exception("Error starting recording audio engine: " + error);
            }
        }

        private void onDataAvailable(AVAudioPcmBuffer buffer, AVAudioTime when)
        {
            var conv = audioConverter;   // #46 r1 m3: one read — stop() may dispose + null the field on another thread
            if (!running || conv == null || buffer == null || buffer.FrameLength == 0)
            {
                return;
            }

            // macOS does not honour the tap's bufferSize request, so the output is sized from the
            // frames that ACTUALLY arrived (+ 1 for the resampler's rounding) — never a fixed 100 ms.
            double ratio = desiredFormat.SampleRate / recordingFormat.SampleRate;
            uint capacity = (uint)Math.Ceiling(buffer.FrameLength * ratio) + 1;
            AVAudioPcmBuffer outputBuffer = new AVAudioPcmBuffer(desiredFormat, capacity);

            // ONE-SHOT input: the converter may pull more than once to fill the output. Handing it
            // the same tap buffer again would DUPLICATE audio, so the second pull says "no data
            // now" and the converter keeps the rest for the next tap.
            bool supplied = false;
            AVAudioConverterInputHandler inputHandler = (uint inNumberOfPackets, out AVAudioConverterInputStatus outStatus) =>
            {
                if (supplied)
                {
                    outStatus = AVAudioConverterInputStatus.NoDataNow;
                    return null;
                }
                supplied = true;
                outStatus = AVAudioConverterInputStatus.HaveData;
                return buffer;
            };
            NSError? outError = null;
            AVAudioConverterOutputStatus status;
            try
            {
                status = conv.ConvertToBuffer(outputBuffer, out outError, inputHandler);
            }
            catch (Exception e)
            {
                Logging.warn("Conversion aborted: " + e.GetType().Name);   // a tap in flight during stop()
                return;
            }
            if (status == AVAudioConverterOutputStatus.Error || status == AVAudioConverterOutputStatus.EndOfStream)
            {
                Logging.warn("Conversion failed. Status: {0}, Error: {1}", status, outError?.LocalizedDescription ?? "Unknown error");
                return;
            }
            if (outputBuffer.FrameLength == 0)
            {
                return; // InputRanDry with nothing produced yet — the resampler is priming
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
            audioEncoder = new OpusEncoder(sampleRate, 24000, channels, Concentus.Enums.OpusApplication.OPUS_APPLICATION_VOIP, this);
            audioEncoder.start();
        }

        public void stop()
        {
            if (!running)
            {
                return;
            }
            running = false;

            AVAudioSession.SharedInstance().SetActive(false);

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

            if (audioConverter != null)
            {
                audioConverter.Dispose();
                audioConverter = null;
            }

            if (audioEncoder != null)
            {
                audioEncoder.stop();
                audioEncoder.Dispose();
                audioEncoder = null;
            }

            lock (outputBuffers)
            {
                outputBuffers.Clear();
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
            if (!running)
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
