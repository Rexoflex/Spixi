using IXICore;
using IXICore.Meta;
using IXICore.Streaming;
using System;
using System.Collections.Generic;
using SPIXI.Meta;

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
        private static readonly Dictionary<string, int> probeIds = new Dictionary<string, int>();   // ★ G-3: address → c1, c2, … (this run only)

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
            if (keeps(friend))
            {
                SSightingStore.note(key, at);   // ★ G-2: kept on this device across restarts
            }
        }

        /** ★ G-2 (#46 r1 A7): only an ACCEPTED 1:1 contact's sightings are kept — never a group, a bot, or a stranger's
         *  pending request (a burst of requests must not evict real contacts, nor leave a stranger's routine on disk). */
        public static bool keeps(Friend friend)
        {
            return friend != null && friend.type == FriendType.Normal && friend.approved;
        }

        /** ★ G-2: a presence keepalive moved this contact's lastSeenTime to `next` (network s): kept on this device. */
        public static void noteKeepAlive(Friend friend, long next)
        {
            if (!keeps(friend) || next <= 0)
            {
                return;
            }
            SSightingStore.note(friend.walletAddress.ToString(), Math.Min(next, Clock.getNetworkTimestamp()));
        }

        /** ★ G-2 (pure, EXECUTED by the unit tests): the newest of the sightings (network seconds); a sighting from the
         *  future reads as now. 0 = none. (#46 r1 A1: the chat's persisted lastMessage is NOT a source — many incoming
         *  lines carry the LOCAL receive time (Core stamps timestamp 0 with Clock.getTimestamp()), and the "connected"
         *  line is written at accept time, so it read as "seen now" for a contact offline for weeks. Every message heard
         *  is already kept by noteHeard, at the SENDER's time.) */
        public static long newestSighting(long keepAlive, long heardAt, long kept, long networkNow)
        {
            long seen = Math.Max(Math.Max(keepAlive, heardAt), kept);
            if (seen > networkNow && networkNow > 0)
            {
                seen = networkNow;
            }
            return seen > 0 ? seen : 0;
        }

        /** The newest sighting in network seconds, 0 = none known. */
        public static long lastSightingNetwork(Friend friend)
        {
            if (friend == null)
            {
                return 0;
            }
            string key = friend.walletAddress.ToString();
            long h = 0;
            lock (heardLock)
            {
                heard.TryGetValue(key, out h);
            }
            long kept = keeps(friend) ? SSightingStore.get(key) : 0;   // ★ G-2: the sighting kept across restarts
            return newestSighting(friend.lastSeenTime, h, kept, Clock.getNetworkTimestamp());
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
            bool flipped;
            lock (heardLock)
            {
                flipped = latchFlip(shownLatch, key, shown);
            }
            if (flipped)
            {
                /* ★ G-3 [PRESENCE] probe — TEMPORARY: the DISPLAYED dot flipped. The opaque number ties it to the
                 * keepalive lines; age = seconds since the newest sighting; core = Core's own online flag. Integers only. */
                long seen = lastSightingNetwork(friend);
                long age = seen > 0 ? Clock.getNetworkTimestamp() - seen : -1;
                Logging.info("[PRESENCE] c{0} dot={1} age={2}s core={3}", probeId(key), shown ? "on" : "off", age, friend.online ? 1 : 0);
            }
            return flipped;
        }

        /** ★ #1103 [PRESENCE] probe — TEMPORARY: retire it (this method + its one call in NetworkProtocol) once the session-1
         *  walk has tuned OnlineWindowSec from the logged gaps (#46 r2 R2-14). A keepalive moved lastSeenTime from `prev` to
         *  `next` (network s). Integers only. */
        public static void probeKeepAlive(Friend friend, long prev, long next)
        {
            long now = Clock.getNetworkTimestamp();
            long gap = prev > 0 ? next - prev : -1;
            /* ★ G-3: + an opaque per-contact number (never the address — the log is shareable, O-26) */
            Logging.info("[PRESENCE] c{0} keepalive gap={1}s delay={2}s", probeId(friend.walletAddress.ToString()), gap, now - next);
        }

        /** ★ E-W3: the same opaque number for the [NICK] lines, so a nick line and a presence line can be tied together. */
        public static int probeIdOf(Friend friend)
        {
            return friend == null ? 0 : probeId(friend.walletAddress.ToString());
        }

        /** ★ G-3: an opaque number per contact for this run (first seen = 1). Not stored, not derived from the address. */
        private static int probeId(string key)
        {
            lock (heardLock)
            {
                if (!probeIds.TryGetValue(key, out int id))
                {
                    id = probeIds.Count + 1;
                    probeIds[key] = id;
                }
                return id;
            }
        }
    }
}
