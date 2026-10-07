/* ★ S8 (#1229) — [P1] the push-mailbox probe. TEMPORARY, retire with the [P1] set (grep -rn "\[P1\]\|P1Perf\|PushFetchProbe").
 *
 * The question it answers (#1228 (2), CORE-10): when a push fetch runs, are its messages NEW, a REPEAT of bytes this
 * process already took from the mailbox (`rep` — the remove leg lost, the server served the same entry again), or the
 * same message id in new bytes (`reid` — a re-send)? Plus the empty-entry stuck case: a fetch that ran and got 0.
 * ★ #46 r1 (A-MINOR-4): the id key = hash(the StreamMessage SENDER's address bytes ‖ the id), so the same id from two
 * contacts is not a `reid`; a ONE-byte id is a protocol fixed id (Core's acceptAdd {1} · keys {2} · getNick {3} ·
 * getAvatar {4} · nick {5} · avatar {6}, CoreStreamProcessor.cs:2191–2440) that every contact re-uses on purpose — such
 * an entry is counted as `fix`, never as reid / new.
 *
 * `begin()` before a fetch · `note(bytes)` at the TOP of StreamProcessor.receiveData for `endpoint == null` (the only
 * null-endpoint caller is Ixian-Core/Streaming/OfflinePushMessages.cs:165) · `line(where, ran, got)` after it.
 * The seen-sets live for the process (that is what makes a repeat across passes visible); the counters are per pass.
 *
 * Log rule (handover gate): the line carries COUNTS and SpixiMessage type codes only — never a hash, an id or an
 * address. The keys below are the first 8 bytes of a SHA-256 and never leave this class.
 *
 * DEV-ONLY: every method returns at once unless P1Perf.enabled (SPIXI_DEV_COEXIST). Thread-safe (one lock).
 */
using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using IXICore;   // ★ #46 r1 (A-MAJOR-1): StreamMessage lives in namespace IXICore (Ixian-Core Streaming/StreamMessage.cs:20); ImplicitUsings is disabled

namespace SPIXI
{
    internal static class PushFetchProbe
    {
        internal const int Cap = 4096;        // per seen-set, FIFO evict
        internal const int MaxCodes = 4;      // distinct type codes listed per line — ★ #46 r1 (A-NIT-3): 4 × ≤ 3 chars keeps `codes=` ≤ 21 (the 40-char token)
        internal const int MaxCodeValue = 999; // a code above this (or below 0) is listed as `x`
        internal const long CooldownMs = 50;  // a fetch that returns faster than this with no note never reached the server

        internal const int ClsOff = 0;
        internal const int ClsNew = 1;
        internal const int ClsRep = 2;
        internal const int ClsReid = 3;
        internal const int ClsFix = 4;        // ★ #46 r1 (A-MINOR-4): a one-byte (protocol fixed) id

        private static readonly object gate = new object();
        private static readonly HashSet<ulong> seenBytes = new HashSet<ulong>();
        private static readonly Queue<ulong> bytesOrder = new Queue<ulong>();
        private static readonly HashSet<ulong> seenIds = new HashSet<ulong>();
        private static readonly Queue<ulong> idsOrder = new Queue<ulong>();
        private static readonly List<int> codes = new List<int>();
        private static int nNew = 0;
        private static int nRep = 0;
        private static int nReid = 0;
        private static int nFix = 0;
        private static int nNotes = 0;
        private static long t0Ms = 0;

        /** ★ #46 r1 (C-NIT-4): the clock (ms) — Stopwatch in the app; csh injects a fake one so `touched` is tested without wall time. */
        internal static Func<long> clockMs = () => P1Perf.msSince(0);

        /** Reset the per-pass counters (the seen-sets stay). Call right before the fetch. */
        internal static void begin()
        {
            if (!P1Perf.enabled)
            {
                return;
            }
            lock (gate)
            {
                nNew = 0;
                nRep = 0;
                nReid = 0;
                nFix = 0;
                nNotes = 0;
                codes.Clear();
                t0Ms = clockMs();
            }
        }

        /** Classify one mailbox message. Returns ClsNew / ClsRep / ClsReid / ClsFix (ClsOff when disabled or on any failure). */
        internal static int note(byte[]? bytes)
        {
            if (!P1Perf.enabled || bytes == null)
            {
                return ClsOff;
            }
            try
            {
                ulong bytesKey = keyOf(bytes);
                ulong? idKey = null;
                bool fixedId = false;
                try
                {
                    StreamMessage sm = new StreamMessage(bytes);
                    if (sm.id != null && sm.id.Length == 1)
                    {
                        fixedId = true;   // a protocol fixed id: re-used by design, never a reid
                    }
                    else if (sm.id != null && sm.id.Length > 0)
                    {
                        idKey = keyOf(idKeyBytes(sm.sender?.addressNoChecksum, sm.id));
                    }
                }
                catch (Exception)
                {
                    // not parseable here: classified by its bytes alone
                }
                lock (gate)
                {
                    return classifyLocked(bytesKey, idKey, fixedId);
                }
            }
            catch (Exception)
            {
                return ClsOff;
            }
        }

        /** Record the SpixiMessage type code of a `rep` / `reid` entry (Core decrypted it; distinct, at most MaxCodes). */
        internal static void noteCode(int cls, int code)
        {
            if (!P1Perf.enabled || (cls != ClsRep && cls != ClsReid))
            {
                return;
            }
            lock (gate)
            {
                if (!codes.Contains(code) && codes.Count < MaxCodes)
                {
                    codes.Add(code);
                }
            }
        }

        /** The fetch reached the server in this pass: a message was noted, or it took at least CooldownMs.
         *  ⚠ A HEURISTIC: Core's cooldown (`lastUpdate`, private in OfflinePushMessages.cs:28/:94) returns false at once
         *  with no network. The node loop uses this to skip that no-op line; the push lane always prints. */
        internal static bool touched
        {
            get
            {
                if (!P1Perf.enabled)
                {
                    return false;
                }
                lock (gate)
                {
                    return nNotes > 0 || clockMs() - t0Ms >= CooldownMs;
                }
            }
        }

        /** `[P1] push fetch got= new= rep= reid= fix= ran= codes= where=` (counts + type codes only). */
        internal static void line(string where, bool ran, ulong got)
        {
            if (!P1Perf.enabled)
            {
                return;
            }
            string body;
            lock (gate)
            {
                body = format(where, ran, got, nNew, nRep, nReid, nFix, codes);
            }
            P1Perf.line(body);
        }

        /** Pure: the line body. Codes are joined with `_` (the [P1] token grammar has no comma); none → `-`; at most
         *  MaxCodes, each 0–MaxCodeValue or `x` (★ #46 r1 A-NIT-3: the token stays ≤ 40 chars whatever Core decodes). */
        internal static string format(string where, bool ran, ulong got, int newCount, int repCount, int reidCount, int fixCount, IList<int> codeList)
        {
            string c = "-";
            if (codeList != null && codeList.Count > 0)
            {
                List<string> shown = new List<string>();
                for (int i = 0; i < codeList.Count && i < MaxCodes; i++)
                {
                    int v = codeList[i];
                    shown.Add(v >= 0 && v <= MaxCodeValue ? v.ToString(System.Globalization.CultureInfo.InvariantCulture) : "x");
                }
                c = string.Join("_", shown);
            }
            return "push fetch got=" + got + " new=" + newCount + " rep=" + repCount + " reid=" + reidCount + " fix=" + fixCount
                + " ran=" + (ran ? "1" : "0") + " codes=" + c + " where=" + where;
        }

        /** Pure: the id key's input — the sender's address bytes (none → empty) ‖ the id. Never leaves this class. */
        internal static byte[] idKeyBytes(byte[]? senderBytes, byte[] id)
        {
            byte[] s = senderBytes ?? new byte[0];
            byte[] r = new byte[s.Length + 1 + id.Length];
            Array.Copy(s, 0, r, 0, s.Length);
            r[s.Length] = (byte)s.Length;   // a length mark: (sender ‖ id) splits one way only
            Array.Copy(id, 0, r, s.Length + 1, id.Length);
            return r;
        }

        // —— under the lock ——
        private static int classifyLocked(ulong bytesKey, ulong? idKey, bool fixedId)
        {
            nNotes++;
            int cls;
            if (seenBytes.Contains(bytesKey))
            {
                cls = ClsRep;
                nRep++;
            }
            else if (fixedId)
            {
                cls = ClsFix;
                nFix++;
            }
            else if (idKey.HasValue && seenIds.Contains(idKey.Value))
            {
                cls = ClsReid;
                nReid++;
            }
            else
            {
                cls = ClsNew;
                nNew++;
            }
            remember(seenBytes, bytesOrder, bytesKey);
            if (idKey.HasValue)
            {
                remember(seenIds, idsOrder, idKey.Value);
            }
            return cls;
        }

        private static void remember(HashSet<ulong> set, Queue<ulong> order, ulong key)
        {
            if (!set.Add(key))
            {
                return;
            }
            order.Enqueue(key);
            while (order.Count > Cap)
            {
                set.Remove(order.Dequeue());
            }
        }

        private static ulong keyOf(byte[] data)
        {
            return BitConverter.ToUInt64(SHA256.HashData(data), 0);
        }

        /** Test seam (csh): forget everything, as a fresh process. */
        internal static void resetForTest()
        {
            lock (gate)
            {
                seenBytes.Clear();
                bytesOrder.Clear();
                seenIds.Clear();
                idsOrder.Clear();
                codes.Clear();
                nNew = 0;
                nRep = 0;
                nReid = 0;
                nFix = 0;
                nNotes = 0;
                t0Ms = clockMs();
            }
        }
    }
}
