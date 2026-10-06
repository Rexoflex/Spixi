/* ★ 7b (#1222, AND-47) — DEV-ONLY: Core's log FILE mirrored to logcat on Android.
 *
 * THE MECHANISM (Ixian-Core @097341a, Meta/Logging.cs): with the console mirror ON, `log_internal` sets
 * Console.ForegroundColor for a warn / error line BEFORE Console.WriteLine, Debug.WriteLine and the file write, inside one
 * try — on Android that setter throws PlatformNotSupportedException and the WHOLE line is lost from logcat AND from the
 * file. So the dev build keeps the console mirror OFF (App.xaml.cs) and this tail copies `<folder>/ixian.log` (Logging.cs:62
 * `logfilename`, :111 the path; Core rolls it on start and on size, :331-390) to logcat instead.
 *
 * One background thread per process (never stops), a poll every PollMs: open the file (FileShare.ReadWrite | Delete — Core
 * holds it open for writing), read from the last offset to the end, hand each COMPLETE line to Android.Util.Log.Info
 * ("DOTNET", line). A file SHORTER than the offset = Core rolled it → read the new one from 0. Never throws out.
 * The pure rules (startOf, takeLines) compile under SPIXI_DEV_COEXIST (scripts/csh executes them: Run.cs "logtail:");
 * the thread under SPIXI_DEV_COEXIST && ANDROID only. A STORE build compiles nothing of this file.
 * SECURITY (handover gate): dev builds only; logcat gets exactly the lines Core already writes to the app-private file. */
#if SPIXI_DEV_COEXIST
using System;
using System.Collections.Generic;
using System.Text;

namespace SPIXI
{
    internal static class DevLogTail
    {
        internal const int PollMs = 400;
        /** logcat's payload limit is ~4 KB; a longer line is cut here. */
        internal const int MaxLineChars = 3000;
        /** An unterminated tail longer than this is handed over as one (cut) line — the carry stays bounded. */
        internal const int MaxCarryBytes = 16 * 1024;
        internal const string Tag = "DOTNET";

        /** Where the next read starts: a file shorter than what was already read has ROLLED → 0; else the offset. */
        internal static long startOf(long fileLength, long offset)
        {
            return fileLength < offset || offset < 0 ? 0 : offset;
        }

        /** The complete lines in carry + buf[0..n) (UTF-8, "\n" ends a line, a trailing "\r" dropped, empty lines skipped,
         *  each cut to MaxLineChars); an unterminated tail stays in `carry` (bounded by MaxCarryBytes). */
        internal static List<string> takeLines(List<byte> carry, byte[] buf, int n)
        {
            List<string> lines = new List<string>();
            for (int i = 0; i < n; i++)
            {
                byte b = buf[i];
                if (b == (byte)'\n')
                {
                    emit(carry, lines);
                    continue;
                }
                carry.Add(b);
                if (carry.Count >= MaxCarryBytes)
                {
                    emit(carry, lines);
                }
            }
            return lines;
        }

        private static void emit(List<byte> carry, List<string> lines)
        {
            int len = carry.Count;
            if (len > 0 && carry[len - 1] == (byte)'\r')
            {
                len--;
            }
            if (len > 0)
            {
                string s = Encoding.UTF8.GetString(carry.GetRange(0, len).ToArray());
                lines.Add(s.Length > MaxLineChars ? s.Substring(0, MaxLineChars) : s);
            }
            carry.Clear();
        }

#if ANDROID
        private static int started = 0;

        /** Start the tail of `<folder>/ixian.log` once per process (App, right after Logging.start). Never throws. */
        internal static void startLogcatMirror(string folder)
        {
            try
            {
                if (System.Threading.Interlocked.Exchange(ref started, 1) != 0)
                {
                    return;
                }
                string path = System.IO.Path.Combine(folder, "ixian.log");
                System.Threading.Thread t = new System.Threading.Thread(() => loop(path));
                t.IsBackground = true;
                t.Name = "DevLogcatMirror";
                t.Start();
            }
            catch (Exception)
            {
            }
        }

        private static void loop(string path)
        {
            long offset = 0;
            List<byte> carry = new List<byte>();
            byte[] buf = new byte[64 * 1024];
            while (true)
            {
                try
                {
                    if (System.IO.File.Exists(path))
                    {
                        using (System.IO.FileStream fs = new System.IO.FileStream(path, System.IO.FileMode.Open, System.IO.FileAccess.Read,
                            System.IO.FileShare.ReadWrite | System.IO.FileShare.Delete))
                        {
                            long start = startOf(fs.Length, offset);
                            if (start != offset)
                            {
                                carry.Clear();   // rolled: the old file's unterminated tail is gone with it
                            }
                            offset = start;
                            fs.Seek(offset, System.IO.SeekOrigin.Begin);
                            int n;
                            while ((n = fs.Read(buf, 0, buf.Length)) > 0)
                            {
                                offset += n;
                                foreach (string line in takeLines(carry, buf, n))
                                {
                                    Android.Util.Log.Info(Tag, line);
                                }
                            }
                        }
                    }
                }
                catch (Exception)
                {
                }
                try
                {
                    System.Threading.Thread.Sleep(PollMs);
                }
                catch (Exception)
                {
                }
            }
        }
#endif
    }
}
#endif
