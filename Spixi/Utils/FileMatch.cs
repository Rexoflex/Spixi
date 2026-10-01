using IXICore.Streaming;
using System;
using System.IO;

namespace SPIXI
{
    /** ★ #1106/#1107 (#46 r4 R4-1/R4-4, r5 R5-2): which file a file message wrote — pure rules, executed by
     *  Spixi-UnitTests/FileMatchTests.cs. */
    public static class FileMatch
    {
        /** "uid:name[:size]" (the fileHeader message, SingleChatPage's own split). */
        public static bool parseFileHeader(string? msg, out string name, out ulong size)
        {
            name = "";
            size = 0;
            if (string.IsNullOrEmpty(msg))
            {
                return false;
            }
            string[] split = msg.Split(new string[] { ":" }, StringSplitOptions.None);
            if (split.Length < 2 || split[1].Length == 0)
            {
                return false;
            }
            name = split[1];
            if (split.Length > 2)
            {
                ulong.TryParse(split[2], System.Globalization.NumberStyles.None, System.Globalization.CultureInfo.InvariantCulture, out size);
            }
            return true;
        }
        /** (#46 r4 R4-1/R4-4) Is the file at `full` the one this message wrote? A path is REUSED once a download is deleted
         *  (`name.ext` again, not `name-1.ext`), so the path alone can point at another sender's later file. When the
         *  message knows the size (its field, or the header's `uid:name:size`), the file on disk must have exactly it. */
        public static bool matches(FriendMessage fm, string full)
        {
            ulong want = fm.fileSize;
            if (want == 0 && parseFileHeader(fm.message, out _, out ulong headerSize))
            {
                want = headerSize;
            }
            if (want == 0)
            {
                return true;   // nothing to compare — the vetted path rule alone decides (older rows)
            }
            try
            {
                FileInfo fi = new FileInfo(full);
                return fi.Exists && (ulong)fi.Length == want;
            }
            catch (Exception)
            {
                return false;
            }
        }
    }
}
