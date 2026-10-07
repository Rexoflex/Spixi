/* ★★ #1197 (session 6b, #1136 / #1189 (1)) — THE CAPABILITY ANSWER. A peer may ask (Core SpixiMessageCode.getAppProtocols)
 * which Spixi protocols this app speaks; StreamProcessor answers with CoreStreamProcessor.sendAppProtocols(friend, ids()).
 * ids = the UTF-8 bytes of "spixi.reply.1" then "spixi.edit.1". Only an approved, known, normal 1:1 contact gets an
 * answer — never a group, a bot room, an unknown or an unapproved sender (an answer to a stranger tells it this device
 * is online and which build it runs). At most ONE answer per address per 60 s: a static map address → the last answer
 * (monotonic ms), capped at 512 entries, the oldest dropped.
 * ★★ #1207 / #1208 (session 7): the list gains "spixi.voice.1" (order reply, edit, voice). THE ASK: the open of an
 * approved, normal 1:1 chat (not a group, not a bot) sends ONE getAppProtocols per contact per app run (claimAsk: a
 * lock-guarded set of the asked addresses, capped at 512, the oldest dropped — a dropped address may be asked again).
 * The stored answer (Core Friend.supportedProtocols, no expiry) is trusted at once: supports() is an exact UTF-8 byte
 * compare of each stored id.
 * PURE: no MAUI, no Core type — scripts/csh executes the rule and the limiter (SpixiProtocolsTests.cs). ★ S8 (#1234): the one
 * exception is ids() reading the hideOnline preference (SPrivacyPrefs; csh compiles it against its Preferences stub). */
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Text;

namespace SPIXI
{
    public static class SpixiProtocols
    {
        public const string ReplyId = "spixi.reply.1";
        public const string EditId = "spixi.edit.1";
        public const string VoiceId = "spixi.voice.1";   // ★ #1208 (= VoiceCodec.ProtocolId)
        public const long AnswerIntervalMs = 60 * 1000;
        public const int LimiterCap = 512;
        /** lastAnsweredMs for an address that was never answered. */
        public const long Never = long.MinValue;

        private static readonly ConcurrentDictionary<string, long> lastAnswered = new ConcurrentDictionary<string, long>(StringComparer.Ordinal);
        private static readonly object gate = new object();   // check-and-set + the trim are one step

        /** The ids this build speaks, in this order. A fresh list each call (Core keeps the reference in its message).
         *  ★ S8 (#1234): + `spixi.presence-hidden.1` LAST while "Hide my online status" is ON (SPrivacyPrefs.hideOnline —
         *  the one non-pure read here; the rule itself is ids(bool)). */
        public static List<byte[]> ids()
        {
            return ids(SPIXI.Meta.SPrivacyPrefs.hideOnline);
        }

        /** ★ S8 (#1234): the answer, + `spixi.presence-hidden.1` (PrivacyRules.PresenceHiddenId) LAST when `presenceHidden`. */
        public static List<byte[]> ids(bool presenceHidden)
        {
            List<byte[]> l = new List<byte[]> { Encoding.UTF8.GetBytes(ReplyId), Encoding.UTF8.GetBytes(EditId), Encoding.UTF8.GetBytes(VoiceId) };
            if (presenceHidden)
            {
                l.Add(Encoding.UTF8.GetBytes(PrivacyRules.PresenceHiddenId));
            }
            return l;
        }

        /** ★ #1207: does a stored answer (Core Friend.supportedProtocols) name `id`? Exact UTF-8 bytes; null → false. */
        public static bool supports(IEnumerable<byte[]>? ids, string id)
        {
            if (ids == null || string.IsNullOrEmpty(id))
            {
                return false;
            }
            byte[] want = Encoding.UTF8.GetBytes(id);
            foreach (byte[] b in ids)
            {
                if (b != null && b.AsSpan().SequenceEqual(want))
                {
                    return true;
                }
            }
            return false;
        }

        public const int AskCap = 512;
        private static readonly HashSet<string> asked = new HashSet<string>(StringComparer.Ordinal);
        private static readonly Queue<string> askedOrder = new Queue<string>();
        private static readonly object askGate = new object();

        /** ★ #1207: send a getAppProtocols on this chat open? true ONCE per process per address (approved normal 1:1,
         *  not a bot, a known contact); the set is capped at AskCap, the oldest dropped. */
        public static bool claimAsk(string? address, bool friendKnown, bool isNormal1to1, bool isBot, bool isApproved)
        {
            if (string.IsNullOrEmpty(address) || !friendKnown || !isNormal1to1 || isBot || !isApproved)
            {
                return false;
            }
            lock (askGate)
            {
                if (!asked.Add(address))
                {
                    return false;
                }
                askedOrder.Enqueue(address);
                while (asked.Count > AskCap && askedOrder.Count > 0)
                {
                    asked.Remove(askedOrder.Dequeue());
                }
                return true;
            }
        }

        /** The ask set's size (tests, the cap). */
        public static int askCount
        {
            get
            {
                lock (askGate)
                {
                    return asked.Count;
                }
            }
        }

        /** Forget every ask — tests, and ★ S8 (#1234) the hideOnline toggle (the next chat open asks each contact again). */
        public static void resetAsks()
        {
            lock (askGate)
            {
                asked.Clear();
                askedOrder.Clear();
            }
        }

        /** ★ #1197: does this getAppProtocols get an answer? */
        public static bool shouldAnswer(bool friendKnown, bool isNormal1to1, bool isBot, bool isApproved, long nowMs, long lastAnsweredMs)
        {
            if (!friendKnown || !isNormal1to1 || isBot || !isApproved)
            {
                return false;
            }
            return lastAnsweredMs == Never || nowMs - lastAnsweredMs >= AnswerIntervalMs;
        }

        /** ★ #1197: the rule + the per-address limiter. true = answer now (the answer is recorded). */
        public static bool claimAnswer(string? address, bool friendKnown, bool isNormal1to1, bool isBot, bool isApproved, long nowMs)
        {
            if (string.IsNullOrEmpty(address))
            {
                return false;
            }
            lock (gate)
            {
                long last = lastAnswered.TryGetValue(address, out long v) ? v : Never;
                if (!shouldAnswer(friendKnown, isNormal1to1, isBot, isApproved, nowMs, last))
                {
                    return false;
                }
                lastAnswered[address] = nowMs;
                while (lastAnswered.Count > LimiterCap)
                {
                    string? oldest = null;
                    long oldestAt = long.MaxValue;
                    foreach (KeyValuePair<string, long> kv in lastAnswered)
                    {
                        if (kv.Value < oldestAt)
                        {
                            oldestAt = kv.Value;
                            oldest = kv.Key;
                        }
                    }
                    if (oldest == null || !lastAnswered.TryRemove(oldest, out _))
                    {
                        break;
                    }
                }
                return true;
            }
        }

        /** The limiter's size (tests, the cap). */
        public static int limiterCount => lastAnswered.Count;

        /** Tests only: forget every answer. */
        public static void resetLimiter()
        {
            lock (gate)
            {
                lastAnswered.Clear();
            }
        }
    }
}
