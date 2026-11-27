using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace SPIXI
{
    /* The home screen's mini-app icons: the small PNG copy that C# makes of each icon. A package's own icon bytes never
     * reach the home WebView; only a copy that a platform ENCODER wrote does. The copies lie in C#'s own folder, each under
     * a name made from the app id and the source file's size and last-write time: a restart finds the copy, an update
     * makes a new one. No state in memory. Executed in scripts/csh (AppIconTests.cs). */
    public static class AppIconRules
    {
        /** C#'s own folder inside html/Apps. Not a valid app id (SafetyRules.isSafeAppId: the first character), so no
         *  package can be installed into it; MiniAppManager.removeAllApps removes it with the account. */
        public const string FolderName = "_icons";
        public const int MaxSourceBytes = 1024 * 1024;        // a bigger icon.png is not read
        public const int MaxCopyBytes = (30000 - 22) / 4 * 3;   // one push stays under 30,000 characters (22 = the data URI's head)
        /** The copy's long side in pixels, tried in this order until the PNG fits MaxCopyBytes. */
        public static readonly int[] Steps = { 192, 144, 120, 96, 72, 48 };
        private static readonly byte[] PngHead = { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
        private static readonly byte[] PngTail = { 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 };   // "IEND" + its CRC
        private static readonly object gate = new object();   // one decode at a time

        /** The copy's file name: 40 hex of a hash. No text of the package or of a WebView is part of the path. */
        public static string copyName(string appId, long size, long ticks) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(appId + "\n" + size + "\n" + ticks)), 0, 20).ToLowerInvariant() + ".png";

        public static bool isPng(byte[]? d) => d != null && d.Length >= 16 && d.AsSpan(0, 8).SequenceEqual(PngHead);
        /** The bytes a platform decoder may get: within the cap, and PNG or JPEG by the first bytes. */
        public static bool sourceOk(byte[]? d) => d != null && d.Length >= 16 && d.Length <= MaxSourceBytes && (isPng(d) || (d[0] == 0xFF && d[1] == 0xD8 && d[2] == 0xFF));
        /** A finished copy: a whole PNG (the head and the IEND end) within MaxCopyBytes. */
        public static bool copyOk(byte[]? p) => isPng(p) && p!.Length <= MaxCopyBytes && p.AsSpan(p.Length - 8).SequenceEqual(PngTail);
        public static string uriOf(byte[]? p) => copyOk(p) ? "data:image/png;base64," + Convert.ToBase64String(p!) : "";
        /** The declared size a decoder may get: a width or height over 2048 is not decoded. */
        public static bool dimsOk(int w, int h) => w >= 1 && h >= 1 && w <= 2048 && h <= 2048;

        /** (w, h) with the long side at most `side`: the aspect is kept, nothing is scaled up, each side is at least 1. */
        public static (int w, int h) fit(int w, int h, int side) => Math.Max(w, h) <= side ? (w, h) : (Math.Max(1, (int)Math.Round((double)w * side / Math.Max(w, h))), Math.Max(1, (int)Math.Round((double)h * side / Math.Max(w, h))));

        /** The data URI of the copy in `dir`, or "" (the shell's default icon). `decode(bytes, side)` = the platform's
         *  small PNG. `mayDecode` false (every caller that holds a lock or a UI thread): a source with no copy yet gives ""
         *  now and `later` — the same call with `mayDecode` true, for a pool thread that holds no lock; true from it = a
         *  copy was made, push the list again. Never throws. */
        public static string get(string dir, string appId, string iconPath, bool mayDecode, Func<byte[], int, byte[]?> decode, out Func<bool>? later)
        {
            later = null;
            try
            {
                if (string.IsNullOrEmpty(appId) || string.IsNullOrEmpty(iconPath) || !File.Exists(iconPath)) return "";
                FileInfo source = new FileInfo(iconPath);
                string copy = Path.Combine(dir, copyName(appId, source.Length, source.LastWriteTimeUtc.Ticks));
                if (!File.Exists(copy) && !mayDecode) later = () => get(dir, appId, iconPath, true, decode, out _) != "";
                else if (!File.Exists(copy)) make(iconPath, copy, decode);
                FileInfo made = new FileInfo(copy);
                return made.Exists && made.Length <= MaxCopyBytes ? uriOf(File.ReadAllBytes(copy)) : "";
            }
            catch (Exception e)
            {
                IXICore.Meta.Logging.warn("App icon: no small copy (" + e.GetType().Name + ")");
                return "";
            }
        }

        /** ONE try per source, ever: an empty file under the copy's name is written BEFORE the bytes reach a decoder. It
         *  stays when no copy comes of it — a refused source, a failed decode, or a decode that ended the process. */
        private static void make(string iconPath, string copy, Func<byte[], int, byte[]?> decode)
        {
            lock (gate)
            {
                if (File.Exists(copy)) return;
                Directory.CreateDirectory(Path.GetDirectoryName(copy)!);
                File.WriteAllBytes(copy, Array.Empty<byte>());
                byte[]? data = new FileInfo(iconPath).Length <= MaxSourceBytes ? File.ReadAllBytes(iconPath) : null;
                byte[]? png = null;
                for (int i = 0; i < Steps.Length && sourceOk(data) && !copyOk(png) && (i == 0 || png != null); i++) png = decode(data!, Steps[i]);   // null = not decodable: no smaller try
                if (!copyOk(png)) IXICore.Meta.Logging.warn("App icon: no small copy");
                else File.WriteAllBytes(copy + ".tmp", png!);
                if (copyOk(png)) File.Move(copy + ".tmp", copy, true);   // a whole copy takes the mark's place in one step
            }
        }
    }
}
