using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace SPIXI
{
    /// <summary>
    /// ★ S9 V-15 (#1245) — the PURE rules behind the audit fixes C-02 · C-03 · C-04 · A-8.
    /// No MAUI, no Core: every member here is executed by the C# harness (scripts/csh/S9AuditTests.cs);
    /// the MAUI-bound call sites are pinned by scripts/pins-s9/a2-wiring.mjs.
    /// </summary>
    public static class AuditRules
    {
        // ───────────── C-03: the bounded resume wait ─────────────

        /// <summary>C-03: how long a resume waits for a STOPPING node before it gives up (the resume runs on the
        /// UI thread — Android's input ANR is 5 s, so the wait stays well under it).</summary>
        public const int NodeStopWaitMs = 3000;
        public const int NodeStopPollMs = 50;

        /// <summary>C-03: polls <paramref name="busy"/> every <paramref name="pollMs"/> until it is false or
        /// <paramref name="timeoutMs"/> passed. True = it went false (the caller may proceed); false = still busy at
        /// the deadline (the caller must NOT proceed). A throwing predicate counts as "still busy". Never throws.</summary>
        public static bool waitWhile(Func<bool> busy, int timeoutMs, int pollMs = NodeStopPollMs)
        {
            if (busy == null) return true;
            if (pollMs < 1) pollMs = 1;
            long deadline = Environment.TickCount64 + Math.Max(0, timeoutMs);
            while (true)
            {
                bool b;
                try { b = busy(); } catch (Exception) { b = true; }
                if (!b) return true;
                long left = deadline - Environment.TickCount64;
                if (left <= 0) return false;
                Thread.Sleep((int)Math.Min(pollMs, left));
            }
        }

        // ───────────── C-04: the mini-app package download ─────────────

        /// <summary>C-04: a mini-app package is refused above this size (the A-9 cap, #1244).</summary>
        public const long MaxMiniAppPackageBytes = 100L * 1024 * 1024;
        /// <summary>C-04: until the response headers arrive.</summary>
        public const int MiniAppHeadersTimeoutSeconds = 30;
        /// <summary>C-04: the whole package download (headers + body).</summary>
        public const int MiniAppDownloadDeadlineSeconds = 120;
        /// <summary>C-04: a mini-app action's response POST.</summary>
        public const int MiniAppPostTimeoutSeconds = 30;

        /// <summary>C-04: https ONLY, absolute, with a host. (Core's IxiUtils.IsValidUrl also admits http.)</summary>
        public static bool isHttpsUrl(string? url)
        {
            if (string.IsNullOrWhiteSpace(url)) return false;
            if (!Uri.TryCreate(url.Trim(), UriKind.Absolute, out Uri? uri)) return false;
            return uri.Scheme == Uri.UriSchemeHttps && !string.IsNullOrEmpty(uri.Host);
        }

        /// <summary>C-04: the temp name of a downloaded package — C#'s own (a GUID), never derived from the URL.</summary>
        public static string packageTempName()
        {
            return Guid.NewGuid().ToString("N") + ".zip";
        }

        /// <summary>C-04: copies <paramref name="src"/> into <paramref name="dst"/> and returns the byte count, or -1
        /// as soon as more than <paramref name="cap"/> bytes arrived (the caller deletes the partial file). The
        /// declared length is not trusted: the cap is checked on the bytes actually read.</summary>
        public static async Task<long> copyCappedAsync(Stream src, Stream dst, long cap, CancellationToken ct)
        {
            byte[] buf = new byte[81920];
            long total = 0;
            while (true)
            {
                int n = await src.ReadAsync(buf, 0, buf.Length, ct).ConfigureAwait(false);
                if (n <= 0) return total;
                total += n;
                if (total > cap) return -1;
                await dst.WriteAsync(buf, 0, n, ct).ConfigureAwait(false);
            }
        }

        // ───────────── A-8: the mini-app bridge URLs ─────────────

        /// <summary>A-8: splits "&lt;key&gt;=&lt;value&gt;" (the rest of a mini-app verb after its prefix) at the FIRST
        /// '='. False (and empty outs) when there is no '=' or the key is empty — the verb is dropped.</summary>
        public static bool trySplitKeyValue(string? rest, out string key, out string value)
        {
            key = "";
            value = "";
            if (string.IsNullOrEmpty(rest)) return false;
            int eq = rest.IndexOf('=');
            if (eq <= 0) return false;
            key = rest.Substring(0, eq);
            value = rest.Substring(eq + 1);
            return true;
        }

        /// <summary>A-8: base64 → bytes, or null when the text is not valid base64 (never throws).</summary>
        public static byte[]? tryBase64(string? text)
        {
            if (text == null) return null;
            byte[] buf = new byte[(text.Length * 3 + 3) / 4];
            if (!Convert.TryFromBase64String(text, buf, out int n)) return null;
            if (n == buf.Length) return buf;
            byte[] exact = new byte[n];
            Array.Copy(buf, exact, n);
            return exact;
        }

        // ───────────── C-02: one typing timer per peer ─────────────

        /// <summary>
        /// C-02: one-shot timers keyed by a peer, safe from any thread. <see cref="restart"/> replaces the peer's
        /// timer; a firing callback removes ITS OWN entry only (never another peer's, never a newer one) and runs
        /// <c>onFire</c> only when it was still the current timer for that key — so an older, already-queued
        /// callback cannot clear a newer typing burst. <c>onFire</c> runs inside a try: a throw is logged by the
        /// caller's <paramref name="onError"/> and never reaches the timer thread (an escaped exception in a
        /// Timer callback ends the process).
        /// </summary>
        public sealed class KeyedTimers
        {
            private readonly ConcurrentDictionary<string, Timer> timers = new ConcurrentDictionary<string, Timer>(StringComparer.Ordinal);
            private readonly Action<Exception>? onError;

            public KeyedTimers(Action<Exception>? onError = null) { this.onError = onError; }

            public int count => timers.Count;

            public bool has(string key) => key != null && timers.ContainsKey(key);

            public void restart(string key, int dueMs, Action onFire)
            {
                if (key == null || onFire == null) return;
                Timer? self = null;
                self = new Timer(_ =>
                {
                    try
                    {
                        Timer? me = self;
                        if (me == null) return;
                        bool mine = timers.TryRemove(new KeyValuePair<string, Timer>(key, me));
                        me.Dispose();
                        if (mine) onFire();
                    }
                    catch (Exception e)
                    {
                        try { onError?.Invoke(e); } catch (Exception) { }
                    }
                }, null, Timeout.Infinite, Timeout.Infinite);
                Timer? old = null;
                timers.AddOrUpdate(key, self, (k, prev) => { old = prev; return self; });
                if (old != null && !ReferenceEquals(old, self))
                {
                    try { old.Dispose(); } catch (Exception) { }
                }
                self.Change(Math.Max(0, dueMs), Timeout.Infinite);
            }
        }
    }
}
