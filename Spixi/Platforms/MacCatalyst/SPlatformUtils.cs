using Foundation;
using SPIXI.Interfaces;
using SPIXI.Meta;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Spixi
{
    public class SPlatformUtils
    {
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
            return NSBundle.MainBundle.BundlePath + "/Contents/Resources/";
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
        }

        /* ★ #1074 (call premium): the call-control CAPS this platform can back. CallPage
         * pushes them to the call shell (setCallCaps) — a control renders only when its
         * verb does something here (no dead buttons, #256/#264).
         *   callRings        — a local ring sound exists, so "Silence" means something.
         *   callSpeakerRoute — setSpeakerphone below really switches the output. */
        public const bool callRings = false;          // startRinging is a no-op here — no "Silence" button
        public const bool callSpeakerRoute = false;   // a desktop has no ear speaker — the button is hidden

        public static bool setSpeakerphone(bool on)
        {
            return false;
        }

        public static void stopRinging()
        {
        }

        public static void startDialtone(DialtoneType type)
        {
        }

        public static void stopDialtone()
        {
        }

        /* ★ SND (2026-08-21): signature parity. Every call tone on this platform is
         * already a no-op (the four methods above), so an effect is too — MacCatalyst has
         * never made a sound. Kept so SSounds compiles and behaves identically on all
         * four targets, and so that whoever implements the tones above implements this in
         * the same pass. */
        public static void playEffect(string filePath)
        {
        }

        // ★ N73 (#391): the parameter exists for signature parity with Android, which is
        // the only platform that paints a system-bar strip of its own. No-op here.
        public static void setEdgeToEdge(string surfaceColor = null, string topColor = null)   // ★ AND-7d (#409): signature parity; still a no-op here
        {

        }
    }
}
