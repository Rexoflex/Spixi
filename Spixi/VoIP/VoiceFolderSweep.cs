/* ★ 7b (#1224 (8), #1210 (8)) — THE VOICE-FOLDER SWEEP. <spixiUserFolder>/Voice holds the voice FILES this device SENT
 * (SingleChatPage.sendVoiceFile). A complete .ogg is referenced by its own row (the sender plays it) and serves a peer's
 * later download, so it ALWAYS stays; VoiceClips' kept clips are memory-only (nothing of them is on disk). At node start ONE
 * background pass deletes only what VoiceCodec.isSweepable allows: C#'s own name, ≥ 24 h old, and not a playable Ogg (a send
 * that died between the create and the write). Bounded (VoiceCodec.SweepMaxFiles names), once per process, never throws,
 * logs a count only. The folder is C#'s own path (Node passes it) — never a WebView value. */
using IXICore.Meta;
using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace SPIXI.VoIP
{
    public static class VoiceFolderSweep
    {
        private static int started = 0;

        public static void runOnce(string dir)
        {
            if (Interlocked.Exchange(ref started, 1) != 0)
            {
                return;
            }
            Task.Run(() =>
            {
                int deleted = 0;
                try
                {
                    if (!Directory.Exists(dir))
                    {
                        return;
                    }
                    DateTime now = DateTime.UtcNow;
                    int seen = 0;
                    foreach (string path in Directory.EnumerateFiles(dir, "voice-*.ogg", SearchOption.TopDirectoryOnly))
                    {
                        if (++seen > VoiceCodec.SweepMaxFiles)
                        {
                            break;
                        }
                        try
                        {
                            FileInfo fi = new FileInfo(path);
                            long age = (long)(now - fi.LastWriteTimeUtc).TotalSeconds;
                            byte[] head = new byte[4];
                            int got = 0;
                            if (fi.Length > 0 && age >= VoiceCodec.SweepMinAgeSeconds)
                            {
                                using (FileStream fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                                {
                                    while (got < 4)
                                    {
                                        int n = fs.Read(head, got, 4 - got);
                                        if (n <= 0)
                                        {
                                            break;
                                        }
                                        got += n;
                                    }
                                }
                            }
                            if (VoiceCodec.isSweepable(Path.GetFileName(path), fi.Length, got == 4 ? head : null, age))
                            {
                                File.Delete(path);
                                deleted++;
                            }
                        }
                        catch (Exception)
                        {
                            // one file we cannot read or delete: the next one
                        }
                    }
                }
                catch (Exception e)
                {
                    Logging.warn("Voice: folder sweep stopped (" + e.GetType().Name + ")");
                }
                if (deleted > 0)
                {
                    Logging.info("Voice: folder sweep removed " + deleted + " broken file(s)");
                }
            });
        }
    }
}
