using IXICore;
using IXICore.Meta;
using IXICore.Streaming;
using System;
using System.Collections.Generic;

namespace SPIXI
{
    /* ★★ #1103 — WHAT THE UI CALLS "ONLINE", AND "LAST SEEN" (session 1 part 2).
     *
     * `friend.online` is NOT touched here: Ixian-Core routes on it (PendingMessageProcessor sends direct vs.
     * through the offline server / a push), and it stays true until the 300 s presence expiry
     * (CoreConfig.clientPresenceExpiration) plus cleanup — which is why a contact read "online" 2–5 min
     * after leaving (security-review F4 "TRUST-SIGNAL"). This class is DISPLAY ONLY.
     *
     * shownOnline = friend.online AND the newest sighting is at most OnlineWindowSec old.
     *   · a sighting = the presence keepalive timestamp (`friend.lastSeenTime`, network seconds, set in
     *     NetworkProtocol from presence only) or the creation time of the newest message from them that reached us
     *     (noteHeard — memory only, the same clock).
     *   · OnlineWindowSec = 150 = one keepalive (CoreConfig.clientKeepAliveInterval 100 s) + 50 s for a late or
     *     lost packet (Damir, #1103). The [PRESENCE] probe logs keepalive gaps so the walk can tune it.
     * lastSeenEpoch = the newest sighting in LOCAL Unix seconds, 0 when none is known (after a restart, before the
     * first keepalive: Core does not persist lastSeenTime — the UI then shows nothing, Damir #1103). Accuracy is
     * the keepalive cadence: ±~2 min. Never more precise in the UI. */
    public static class PresenceDisplay
    {
        public const long OnlineWindowSec = 150;

        private static readonly object heardLock = new object();
        private static readonly Dictionary<string, long> heard = new Dictionary<string, long>();   // address → network seconds
        private static readonly Dictionary<string, bool> shownLatch = new Dictionary<string, bool>();

        /** A message from this contact reached us, created at `sentAt` (StreamMessage.timestamp, the SENDER's network
         *  seconds): a sighting at that time — never later than now. A message stored by the offline server carries its
         *  old timestamp, so it never makes a contact look online. */
        public static void noteHeard(Friend friend, long sentAt)
        {
            if (friend == null || sentAt <= 0)
            {
                return;
            }
            long at = Math.Min(sentAt, Clock.getNetworkTimestamp());
            string key = friend.walletAddress.ToString();
            lock (heardLock)
            {
                if (!heard.TryGetValue(key, out long h) || at > h)
                {
                    heard[key] = at;
                }
            }
        }

        /** The newest sighting in network seconds, 0 = none known. */
        public static long lastSightingNetwork(Friend friend)
        {
            if (friend == null)
            {
                return 0;
            }
            long seen = friend.lastSeenTime;
            lock (heardLock)
            {
                if (heard.TryGetValue(friend.walletAddress.ToString(), out long h) && h > seen)
                {
                    seen = h;
                }
            }
            return seen > 0 ? seen : 0;
        }

        public static bool shownOnline(Friend friend)
        {
            if (friend == null || !friend.online)
            {
                return false;
            }
            long seen = lastSightingNetwork(friend);
            return isFresh(seen, Clock.getNetworkTimestamp());
        }

        /** Pure: is a sighting at `seen` (network s) fresh at `now` (network s)? 0 = never seen = not fresh. */
        public static bool isFresh(long seen, long now)
        {
            return seen > 0 && now - seen <= OnlineWindowSec;
        }

        /** The newest sighting as LOCAL Unix seconds for the shells' relative time; 0 = unknown. */
        public static long lastSeenEpoch(Friend friend)
        {
            return localEpochOf(lastSightingNetwork(friend), Clock.getNetworkTimestamp(), DateTimeOffset.UtcNow.ToUnixTimeSeconds());
        }

        /** Pure (#46 r1 C3 — Spixi-UnitTests/PresenceDisplayTests.cs): a sighting at `seen` (network s) as LOCAL Unix
         *  seconds, given both clocks now. Never in the future (a sighting "ahead" of the network clock reads as now);
         *  0 = unknown. */
        public static long localEpochOf(long seen, long networkNow, long localNow)
        {
            if (seen <= 0)
            {
                return 0;
            }
            long age = Math.Max(0, networkNow - seen);
            return localNow - age;
        }

        /** Pure (#46 r1 C3): record `shown` for `key`; true when it differs from the last recorded value (or none). */
        public static bool latchFlip(Dictionary<string, bool> latch, string key, bool shown)
        {
            if (latch.TryGetValue(key, out bool prev) && prev == shown)
            {
                return false;
            }
            latch[key] = shown;
            return true;
        }

        public static string lastSeenArg(Friend friend)
        {
            return lastSeenEpoch(friend).ToString(System.Globalization.CultureInfo.InvariantCulture);
        }

        /** Node's 2.5 s loop: true when the DISPLAYED state changed since the last call for this friend. */
        public static bool shownChanged(Friend friend, out bool shown)
        {
            shown = shownOnline(friend);
            string key = friend.walletAddress.ToString();
            lock (heardLock)
            {
                return latchFlip(shownLatch, key, shown);
            }
        }

        /** ★ #1103 [PRESENCE] probe — TEMPORARY: retire it (this method + its one call in NetworkProtocol) once the session-1
         *  walk has tuned OnlineWindowSec from the logged gaps (#46 r2 R2-14). A keepalive moved lastSeenTime from `prev` to
         *  `next` (network s). Integers only. */
        public static void probeKeepAlive(long prev, long next)
        {
            long now = Clock.getNetworkTimestamp();
            long gap = prev > 0 ? next - prev : -1;
            Logging.info("[PRESENCE] keepalive gap={0}s delay={1}s", gap, now - next);
        }
    }
}
