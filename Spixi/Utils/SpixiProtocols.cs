/* ★★ #1197 (session 6b, #1136 / #1189 (1)) — THE CAPABILITY ANSWER. A peer may ask (Core SpixiMessageCode.getAppProtocols)
 * which Spixi protocols this app speaks; StreamProcessor answers with CoreStreamProcessor.sendAppProtocols(friend, ids()).
 * ids = the UTF-8 bytes of "spixi.reply.1" then "spixi.edit.1". Only an approved, known, normal 1:1 contact gets an
 * answer — never a group, a bot room, an unknown or an unapproved sender (an answer to a stranger tells it this device
 * is online and which build it runs). At most ONE answer per address per 60 s: a static map address → the last answer
 * (monotonic ms), capped at 512 entries, the oldest dropped. This app asks nobody and reads no cache yet (S7).
 * PURE: no MAUI, no Core type — scripts/csh executes the rule and the limiter (SpixiProtocolsTests.cs). */
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
        public const long AnswerIntervalMs = 60 * 1000;
        public const int LimiterCap = 512;
        /** lastAnsweredMs for an address that was never answered. */
        public const long Never = long.MinValue;

        private static readonly ConcurrentDictionary<string, long> lastAnswered = new ConcurrentDictionary<string, long>(StringComparer.Ordinal);
        private static readonly object gate = new object();   // check-and-set + the trim are one step

        /** The ids this build speaks, in this order. A fresh list each call (Core keeps the reference in its message). */
        public static List<byte[]> ids()
        {
            return new List<byte[]> { Encoding.UTF8.GetBytes(ReplyId), Encoding.UTF8.GetBytes(EditId) };
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
