using AVFoundation;
using Foundation;
using SPIXI.Interfaces;
using SPIXI.Meta;
using System;
using System.IO;

namespace Spixi
{
    public class SPlatformUtils
    {
        private static AVAudioPlayer? ringtonePlayer;
        private static AVAudioPlayer? dialtonePlayer;

        public static Stream getAsset(string path)
        {
            return new FileStream(Path.Combine(getAssetsPath(), path), FileMode.Open, FileAccess.Read);
        }

        public static string getAssetsBaseUrl()
        {
            return NSBundle.MainBundle.BundlePath + "/";
        }

        public static string getAssetsPath()
        {
            return NSBundle.MainBundle.BundlePath;
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
                bool ring = true;

                AVAudioSession audioSession = AVAudioSession.SharedInstance();
                audioSession.SetCategory(AVAudioSessionCategory.Playback);
                audioSession.SetActive(true);

                if (audioSession.OutputVolume == 0.0f)
                {
                    ring = false;
                }

                if (ring)
                {
                    string ringtonePath = Path.Combine(getAssetsPath(), "sounds/default_ringtone.mp3");
                    NSUrl soundUrl = NSUrl.FromFilename(ringtonePath);

                    ringtonePlayer = AVAudioPlayer.FromUrl(soundUrl)!;
                    ringtonePlayer.NumberOfLoops = -1;
                    ringtonePlayer.PrepareToPlay();
                    ringtonePlayer.Play();
                }
            }
            catch (Exception e)
            {
                Console.WriteLine($"Exception occurred in StartRinging: {e}");
                ringtonePlayer = null;
            }
        }

        public static void stopRinging()
        {
            if (ringtonePlayer == null)
            {
                return;
            }

            ringtonePlayer.Stop();
            ringtonePlayer.Dispose();
            ringtonePlayer = null;
        }

        public static void startDialtone(DialtoneType type)
        {
            try
            {
                stopDialtone();

                string soundFileName = string.Empty;
                bool shouldLoop = false;

                switch (type)
                {
                    case DialtoneType.busy:
                        soundFileName = "sounds/busy_tone.mp3";
                        break;
                    case DialtoneType.dialing:
                        soundFileName = "sounds/dialing_tone.mp3";
                        shouldLoop = true;
                        break;
                    case DialtoneType.error:
                        soundFileName = "sounds/error_tone.mp3";
                        break;
                    default:
                        return;
                }

                string toneFilePath = Path.Combine(getAssetsPath(), soundFileName);
                NSUrl soundUrl = NSUrl.FromFilename(toneFilePath);

                dialtonePlayer = AVAudioPlayer.FromUrl(soundUrl)!;
                dialtonePlayer.Volume = 0.1f;
                dialtonePlayer.NumberOfLoops = shouldLoop ? -1 : 0;  // Loop for dialing, play once for others
                dialtonePlayer.PrepareToPlay();
                dialtonePlayer.Play();
            }
            catch (Exception e)
            {
                Console.WriteLine($"Exception occurred in StartDialtone: {e}");
                dialtonePlayer = null;
            }
        }

        public static void stopDialtone()
        {
            if (dialtonePlayer != null)
            {
                dialtonePlayer.Stop();
                dialtonePlayer.Dispose();
                dialtonePlayer = null;
            }
        }


        /* ★ SND (2026-08-21): a one-shot effect. Held in a list rather than a single
         * field because two effects can overlap (a message arriving while a payment
         * sound plays) and a single field would cut the first one off mid-play — and,
         * worse, drop the only managed reference to a player that is still sounding.
         * Entries are reaped on the next call.
         *
         * A MISSING ASSET IS THE EXPECTED STATE TODAY (no effect files ship yet), so the
         * File.Exists probe keeps the miss silent and cheap: AVAudioPlayer.FromUrl
         * returns null for a file that is not there, and the `!` on the existing call
         * sites above would turn that into a NullReferenceException. */
        private static readonly System.Collections.Generic.List<AVAudioPlayer> effectPlayers = new();
        private static readonly System.Collections.Generic.HashSet<string> missingEffects = new();
        private static bool isMissingEffect(string filePath)
        {
            lock (missingEffects) { return missingEffects.Contains(filePath); }
        }
        private static void markMissingEffect(string filePath)
        {
            lock (missingEffects) { missingEffects.Add(filePath); }
        }

        public static void playEffect(string filePath)
        {
            try
            {
                if (isMissingEffect(filePath))
                {
                    return;   // ⚠ AUDIT MINOR-5: memoised — the miss is the expected state today
                }
                string full = Path.Combine(getAssetsPath(), filePath);
                if (!File.Exists(full))
                {
                    markMissingEffect(filePath);
                    return;
                }
                lock (effectPlayers)
                {
                    // Reap finished players before adding another.
                    for (int i = effectPlayers.Count - 1; i >= 0; i--)
                    {
                        if (!effectPlayers[i].Playing)
                        {
                            try { effectPlayers[i].Dispose(); } catch (Exception) { }
                            effectPlayers.RemoveAt(i);
                        }
                    }
                    var player = AVAudioPlayer.FromUrl(NSUrl.FromFilename(full));
                    if (player == null)
                    {
                        return;
                    }
                    player.NumberOfLoops = 0;
                    player.PrepareToPlay();
                    player.Play();
                    effectPlayers.Add(player);
                }
            }
            catch (Exception e)
            {
                Console.WriteLine("playEffect(" + filePath + ") skipped: " + e.Message);
            }
        }

        // ★ N73 (#391): the parameter exists for signature parity with Android, which is
        // the only platform that paints a system-bar strip of its own. No-op here.
        public static void setEdgeToEdge(string surfaceColor = null, string topColor = null)   // ★ AND-7d (#409): signature parity; still a no-op here
        {

        }

    }
}
