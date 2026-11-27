/* The pure rules of the Mac save chooser. SFileOperations.share on Mac Catalyst uses them when
 * MacfixaFlags.MacSaveToFolder is on. The input is the leaf of the path C# chose, never a WebView value; for a
 * received file that leaf is the peer's file name after PhotoRules.SafeFileName. No UIKit, no I/O, no log call: the
 * harness runs this file (scripts/csh/MacSaveTests.cs). */
using System;

namespace SPIXI
{
    public static class MacSaveRules
    {
        // the chooser's buttons
        public const string Save = "save", Photos = "photos", Share = "share", Cancel = "cancel";
        // the result words of one choice
        public const string Done = "done", Cancelled = "cancel", Denied = "denied", Failed = "fail";

        /** The image types the Photos app takes from a file: a subset of SharedItems.isImageName's list (no bmp, no avif). */
        private static readonly string[] photoExts = { "jpg", "jpeg", "png", "gif", "heic", "webp" };

        public static bool isPhoto(string? fileName)
        {
            int dot = fileName == null ? -1 : fileName.LastIndexOf('.');
            return dot >= 0 && Array.IndexOf(photoExts, fileName!.Substring(dot + 1).ToLowerInvariant()) >= 0;
        }

        /** The buttons in order: Save first, Add to Photos only for a photo, Share, Cancel last. */
        public static string[] options(string? fileName) => isPhoto(fileName) ? new[] { Save, Photos, Share, Cancel } : new[] { Save, Share, Cancel };

        /** The C# string key of a button (Resources/Raw/lang), and its English fallback. */
        public static string keyOf(string opt) => opt == Save ? "global-share-savefile" : opt == Photos ? "global-share-addphotos" : opt == Share ? "global-share-sharefile" : "global-dialog-cancel";

        public static string englishOf(string opt) => opt == Save ? "Save File" : opt == Photos ? "Add to Photos" : opt == Share ? "Share File" : "Cancel";

        /** The one line per choice: fixed words only (no path, no name). */
        public static string logLine(string? choice, string? result) => "[MACSAVE] choice=" + oneOf(choice, Save, Photos, Share, Cancel) + " r=" + oneOf(result, Done, Cancelled, Denied, Failed);

        private static string oneOf(string? word, params string[] words) => word != null && Array.IndexOf(words, word) >= 0 ? word : "other";
    }
}
