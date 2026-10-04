using System;
using System.IO;
using System.Threading;

namespace SPIXI
{
    /* ★ #1166 V-3 (#1144 / #1145 (1)): the VIEWER-size image of a LOCAL image file — what the in-app full-screen viewer
     * (media-viewer.js) shows after a tap on a media tile, in the chat (MEDIA: ixian:viewImage) and in chat info
     * (ContactDetails: ixian:sharedView). The tiles carry a ≤ 64 KB thumbnail only; this is the bigger picture.
     *
     * SECURITY (docs/security-handover-gate.md G-6b / A5 — the same decoder surface, now reached by a TAP):
     *   · the path is C#'s own (SharedItems.localPathOf — received → the vetted Downloads-root rule; sent → an absolute
     *     existing path); no WebView value reaches this method;
     *   · only a file whose FIRST 16 BYTES pass ImageSniff.looksLikeImage reaches a platform decoder, and never one above
     *     SourceMax (the G-6b cap) — ViewerRules.viewerSourceOk;
     *   · the platform decode is BOUNDED (Platforms/<os>/SThumbnail.makeViewerJpeg) and ONE decode runs at a time in the
     *     process (a burst of taps cannot hold several 2048-px bitmaps at once);
     *   · the result is dropped when it is above MaxJpegBytes (the push stays bounded);
     *   · no log line here at all (never the path); never throws; BLOCKING — call it OFF the UI thread. */
    public static class ViewerImage
    {
        public const int MaxEdge = 1600;                          // long edge, px
        public const long SourceMax = SharedItems.ThumbSourceMax;  // 20 MB, the A5 / G-6b cap
        public const int MaxJpegBytes = 1_200_000;                // a bigger result → null
        private const int GateWaitMs = 30000;                     // a stuck decode never parks the next caller forever

        private static readonly SemaphoreSlim decodeGate = new SemaphoreSlim(1, 1);

        // Sniff (ImageSniff.looksLikeImage on the first 16 bytes) + size cap + Spixi.SThumbnail.makeViewerJpeg(path, MaxEdge)
        // → "data:image/jpeg;base64,…" or null. Never throws. Blocking: call OFF the UI thread. No log line with the path.
        public static string? dataUriOf(string path)
        {
            try
            {
                string? full = sourceOf(path);
                if (full == null || !decodeGate.Wait(GateWaitMs))
                {
                    return null;
                }
                return decodeHeld(full);
            }
            catch (Exception)
            {
                return null;
            }
        }

        /* ★ #1166 V-3 (#46 r1 A-M2): the ASYNC form for a tap. The process-wide gate is awaited (WaitAsync — no pool thread
         * is parked while another picture decodes), and `stillWanted` is asked AFTER the gate is held: a tap whose viewer was
         * closed or superseded (the caller's latest-token-wins test, a torn-down page) decodes nothing and pushes nothing →
         * null. `stillWanted` runs on a pool thread and must be cheap and thread-safe (read a volatile field). Never throws. */
        public static async System.Threading.Tasks.Task<string?> dataUriOfAsync(string path, Func<bool> stillWanted)
        {
            try
            {
                string? full = sourceOf(path);
                if (full == null || stillWanted == null || !stillWanted())
                {
                    return null;
                }
                if (!await decodeGate.WaitAsync(GateWaitMs).ConfigureAwait(false))
                {
                    return null;
                }
                bool wanted;
                try
                {
                    wanted = stillWanted();
                }
                catch (Exception)
                {
                    wanted = false;   // ★ #1166 #46 r2 NIT-1: a throwing callback must not keep the slot
                }
                if (!wanted)
                {
                    decodeGate.Release();
                    return null;
                }
                return decodeHeld(full);
            }
            catch (Exception)
            {
                return null;
            }
        }

        /** The checked full path (exists, ≤ SourceMax, the first bytes sniff as an image), else null. */
        private static string? sourceOf(string path)
        {
            if (string.IsNullOrEmpty(path))
            {
                return null;
            }
            FileInfo fi = new FileInfo(path);
            if (!fi.Exists || !ViewerRules.viewerSourceOk(SharedItems.readHead(fi.FullName), fi.Length, SourceMax))
            {
                return null;
            }
            return fi.FullName;
        }

        /** Decode with the gate HELD by the caller; releases it. */
        private static string? decodeHeld(string full)
        {
            byte[]? jpeg;
            try
            {
                jpeg = Spixi.SThumbnail.makeViewerJpeg(full, MaxEdge);
            }
            finally
            {
                decodeGate.Release();
            }
            if (jpeg == null || !ViewerRules.viewerJpegOk(jpeg.Length, MaxJpegBytes))
            {
                return null;
            }
            return "data:image/jpeg;base64," + Convert.ToBase64String(jpeg);
        }
    }
}
