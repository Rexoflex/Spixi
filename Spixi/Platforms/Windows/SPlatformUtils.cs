using IXICore.Meta;
using Microsoft.Maui.Storage;
using NAudio.Wave;
using SPIXI.Interfaces;
using SPIXI.Meta;
using System;
using System.IO;
using System.Threading.Tasks;

namespace Spixi
{
    public class SPlatformUtils
    {
        static IWavePlayer? ringtonePlayer = null;
        static IWavePlayer? dialtonePlayer = null;
        static WaveStream? ringtoneStream = null;
        static WaveStream? dialtoneStream = null;

        public static Stream getAsset(string path)
        {
            Task<Stream> task = Task.Run<Stream>(async () => await FileSystem.Current.OpenAppPackageFileAsync(path));
            return task.Result;
        }

        public static string getAssetsBaseUrl()
        {
            return "pack://siteoforigin:,,,/";
        }

        public static string getAssetsPath()
        {
            return System.AppDomain.CurrentDomain.BaseDirectory;
        }

        public static string getHtmlBaseUrl()
        {
            return Config.spixiUserFolder + "/html/";
        }

        public static string getHtmlPath()
        {
            return Config.spixiUserFolder + "/html";
        }

        public static void startRinging()
        {
            if (ringtonePlayer != null)
            {
                return;
            }

            try
            {
                ringtonePlayer = playSoundFromAssets("sounds/default_ringtone.mp3", true);
            }
            catch (Exception e)
            {
                Logging.error("Exception occurred in startRinging: " + e);
                ringtonePlayer = null;
            }
        }

        public static void stopRinging()
        {
            if (ringtonePlayer == null)
            {
                return;
            }

            try
            {
                ringtonePlayer.Stop();
                ringtoneStream?.Dispose();
            }
            catch (Exception e)
            {
                Logging.error("Exception occurred while stopping the ringtone: " + e);
            }
            finally
            {
                ringtonePlayer.Dispose();
                ringtonePlayer = null;
            }
        }

        public static void startDialtone(DialtoneType type)
        {
            try
            {
                stopDialtone();
                string toneFile = string.Empty;
                bool shouldLoop = false;

                switch (type)
                {
                    case DialtoneType.busy:
                        toneFile = "sounds/busy_tone.mp3";
                        break;
                    case DialtoneType.dialing:
                        toneFile = "sounds/dialing_tone.mp3";
                        shouldLoop = true;
                        break;
                    case DialtoneType.error:
                        toneFile = "sounds/error_tone.mp3";
                        break;
                    default:
                        return;
                }

                dialtonePlayer = playSoundFromAssets(toneFile, shouldLoop);
                dialtonePlayer.Volume = 0.1f;
            }
            catch (Exception e)
            {
                Logging.error("Exception occurred in startDialtone: " + e);
                dialtonePlayer = null;
            }
        }

        public static void stopDialtone()
        {
            if (dialtonePlayer != null)
            {
                dialtonePlayer.Stop();
                dialtoneStream?.Dispose();
                dialtonePlayer.Dispose();
                dialtonePlayer = null;
            }
        }

        /* ★ SND-3 (2026-08-21) — the DESKTOP sound. Unlike the call tones above, an
         * effect has no stop() caller, so it disposes itself: NAudio raises
         * PlaybackStopped at the end of the stream, and both the player and its
         * Mp3FileReader are released there. Without that every effect would leak a
         * WaveOutEvent and its file handle.
         *
         * A MISSING ASSET IS THE EXPECTED STATE TODAY (no effect files ship yet).
         * playSoundFromAssets above does NOT guard — `new Mp3FileReader(fullPath)` on an
         * absent file throws straight out — so this probes first and stays silent.
         *
         * SND-3's "desktop-specific off switch" is the shared `inAppSounds` preference,
         * which is already per-device: MAUI Preferences are per-install, so turning
         * sounds off on the desktop does not touch the phone. */
        /* ⚠ AUDIT MINOR-5: no effect assets ship yet, so the miss is the EXPECTED state and
         * must stay cheap and silent — see the Android note. */
        private static readonly System.Collections.Generic.HashSet<string> missingEffects = new();
        private static bool isMissing(string filePath)
        {
            lock (missingEffects) { return missingEffects.Contains(filePath); }
        }
        private static void markMissing(string filePath)
        {
            lock (missingEffects) { missingEffects.Add(filePath); }
        }

        public static void playEffect(string filePath)
        {
            try
            {
                if (isMissing(filePath))
                {
                    return;   // ⚠ AUDIT MINOR-5: memoised, so a missing asset costs one stat, once
                }
                string fullPath = Path.Combine(getAssetsPath(), filePath);
                if (!File.Exists(fullPath))
                {
                    markMissing(filePath);
                    return;
                }
                /* ⚠ AUDIT MINOR: PlaybackStopped only fires if Play() actually STARTED. If
                 * Init or Play throws — an unsupported mp3, or waveOut device exhaustion
                 * under a burst — the old catch disposed neither, so the file handle stayed
                 * open and the file stayed locked, once per received message. */
                Mp3FileReader? reader = null;
                WaveOutEvent? player = null;
                try
                {
                    reader = new Mp3FileReader(fullPath);
                    player = new WaveOutEvent();
                    var capturedReader = reader;
                    var capturedPlayer = player;
                    capturedPlayer.PlaybackStopped += (s, e) =>
                    {
                        try { capturedPlayer.Dispose(); } catch (Exception) { }
                        try { capturedReader.Dispose(); } catch (Exception) { }
                    };
                    capturedPlayer.Init(capturedReader);
                    capturedPlayer.Play();
                }
                catch (Exception)
                {
                    try { player?.Dispose(); } catch (Exception) { }
                    try { reader?.Dispose(); } catch (Exception) { }
                    throw;
                }
            }
            catch (Exception e)
            {
                // trace, not error: with no assets shipped this fires on every message.
                markMissing(filePath);
                Logging.trace("playEffect(" + filePath + ") skipped: " + e.Message);
            }
        }


        private static IWavePlayer playSoundFromAssets(string filePath, bool loop = false)
        {
            string fullPath = Path.Combine(getAssetsPath(), filePath);
            IWavePlayer player = new WaveOutEvent();
            WaveStream mp3Reader = new Mp3FileReader(fullPath);

            if (loop)
            {
                player.Init(new LoopStream(mp3Reader));
            }
            else
            {
                player.Init(mp3Reader);
            }

            player.Play();
            return player;
        }

        // ★ N73 (#391): the parameter exists for signature parity with Android, which is
        // the only platform that paints a system-bar strip of its own. No-op here.
        public static void setEdgeToEdge(string surfaceColor = null, string topColor = null)   // ★ AND-7d (#409): signature parity; still a no-op here
        {

        }
    }

    public class LoopStream : WaveStream
    {
        private readonly WaveStream sourceStream;

        public LoopStream(WaveStream sourceStream)
        {
            this.sourceStream = sourceStream;
        }

        public override WaveFormat WaveFormat => sourceStream.WaveFormat;

        public override long Length => long.MaxValue;

        public override long Position
        {
            get => sourceStream.Position;
            set => sourceStream.Position = value;
        }

        public override int Read(byte[] buffer, int offset, int count)
        {
            int read = sourceStream.Read(buffer, offset, count);
            if (read == 0)
            {
                sourceStream.Position = 0;
                read = sourceStream.Read(buffer, offset, count);
            }
            return read;
        }
    }
}
