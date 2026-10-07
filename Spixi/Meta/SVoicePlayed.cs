using IXICore.Meta;
using Microsoft.Maui.Storage;
using System;
using System.Collections.Generic;
using System.Text;

namespace SPIXI.Meta
{
    /// <summary>
    /// ★ S9 A3 8-FACE (#1243 (4), #1247): WHICH RECEIVED VOICE CLIPS THIS DEVICE PLAYED, kept so the mic badge stays neutral
    /// after a reopen. Core's FriendMessage has no spare field (Core = v1.1), so the flag lives in a Spixi preference.
    /// One writer: SingleChatPage, when C# pushes `voiceState … playing` for a clip the user tapped that is a RECEIVED row
    /// (the existing `ixian:voiceplay` path — no new verb). Read by the row pushes: addMe / addThem arg 18 and updateMessage
    /// arg 13 `played` (S9FixRules.playedArg: no stored flag = "0", Damir's #1247 pick).
    ///
    /// Storage (the SAppDeclines shape): ONE app preference string `voice_played`, entries `<peer address>|<message id hex>`
    /// joined by ',' (base58 and hex carry neither), oldest first, capped at <see cref="CAP"/> (the oldest goes first — an
    /// evicted old clip reads unplayed again: accepted, 4096 clips). A set mirrors the list so the per-row read is O(1).
    /// Never a `spixi.*` WebView key; nothing crosses the bridge but "1" / "0" on a row the shell already has. Wiped with
    /// the account (<see cref="clearAll"/>) and per contact on remove / delete-history / re-add (<see cref="clear"/>, the
    /// SAppDeclines sites). Lines carry exception TYPES only. Never throws.
    /// </summary>
    public static class SVoicePlayed
    {
        private const string KEY = "voice_played";
        public const int CAP = 4096;
        private static readonly object gate = new object();
        private static List<string>? cache;
        private static HashSet<string>? cacheSet;

        public static bool has(string? peer, string? msgIdHex)
        {
            if (string.IsNullOrEmpty(peer) || string.IsNullOrEmpty(msgIdHex))
            {
                return false;
            }
            try
            {
                lock (gate)
                {
                    load();
                    return cacheSet!.Contains(SAppDeclines.entry(peer, msgIdHex));
                }
            }
            catch (Exception e)
            {
                Logging.warn("SVoicePlayed.has failed: " + e.GetType().Name);
                return false;
            }
        }

        /** Record a played clip; true when it was new (a repeat is a set lookup, no write). */
        public static bool add(string? peer, string? msgIdHex)
        {
            if (string.IsNullOrEmpty(peer) || string.IsNullOrEmpty(msgIdHex))
            {
                return false;
            }
            try
            {
                lock (gate)
                {
                    load();
                    string e = SAppDeclines.entry(peer, msgIdHex);
                    if (cacheSet!.Contains(e))
                    {
                        return false;
                    }
                    cache!.Add(e);
                    cacheSet.Add(e);
                    while (cache.Count > CAP)
                    {
                        cacheSet.Remove(cache[0]);
                        cache.RemoveAt(0);
                    }
                    persist(cache);
                    return true;
                }
            }
            catch (Exception e)
            {
                Logging.warn("SVoicePlayed.add failed: " + e.GetType().Name);
                return false;
            }
        }

        /** The contact is removed / its history deleted / it is re-added — forget its clips. A no-op is a lookup, no write. */
        public static void clear(string? peer)
        {
            if (string.IsNullOrEmpty(peer))
            {
                return;
            }
            try
            {
                lock (gate)
                {
                    load();
                    if (SAppDeclines.clearInto(cache!, peer))
                    {
                        cacheSet = new HashSet<string>(cache!, StringComparer.Ordinal);
                        persist(cache!);
                    }
                }
            }
            catch (Exception e)
            {
                Logging.warn("SVoicePlayed.clear failed: " + e.GetType().Name);
            }
        }

        /** The account is wiped: forget every entry. */
        public static void clearAll()
        {
            try
            {
                lock (gate)
                {
                    cache = new List<string>();
                    cacheSet = new HashSet<string>(StringComparer.Ordinal);
                    SLocalOnlyStore.setDeferred(KEY, null);   // ★ S9 A3 #46 r1 (MINOR-3)
                    Preferences.Default.Remove(KEY);   // a never-migrated backed-up copy goes too
                }
            }
            catch (Exception e)
            {
                Logging.warn("SVoicePlayed.clearAll failed: " + e.GetType().Name);
            }
        }

        /** Tests only: drop the in-memory copy (the next read re-parses the preference — a "restart"). */
        public static void resetCacheForTest()
        {
            lock (gate)
            {
                cache = null;
                cacheSet = null;
            }
        }

        /* ★ S9 A3 #46 r1 (MINOR-3, H-14 consistency): the entries name PEER ADDRESSES, so they live in the backup-excluded
         * SLocalOnlyStore file (Android backup rules, iOS / Mac IsExcludedFromBackup), not in the backed-up Preferences;
         * the first read moves an old Preferences value in once and removes that key (getMigrating). Writes are deferred
         * to one background write (SLocalOnlyStore.setDeferred) — never a file write on the UI thread. Under the gate. */
        private static void persist(List<string> l)
        {
            SLocalOnlyStore.setDeferred(KEY, SAppDeclines.serialize(l, CAP));
        }

        // under the gate
        private static void load()
        {
            if (cache == null || cacheSet == null)
            {
                cache = SAppDeclines.parse(SLocalOnlyStore.getMigrating(KEY));
                cacheSet = new HashSet<string>(cache, StringComparer.Ordinal);
            }
        }
    }
}
