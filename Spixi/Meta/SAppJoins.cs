using IXICore.Meta;
using Microsoft.Maui.Storage;
using System;
using System.Collections.Generic;
using System.Text;

namespace SPIXI.Meta
{
    /// <summary>
    /// ★ S9 A3 8-APP (#1243 (3), #1247): WHICH MINI-APP INVITE ROWS THIS DEVICE JOINED, kept so the card reads "Joined" (one
    /// "Open again" button on the existing `ixian:joinApp`) after the app page closed and after a restart — before this,
    /// "Minimized" was pushed only while a live page existed (SingleChatPage's addAppRequest push) and the accept memory
    /// was per run (AppInviteRules.claimAccept). One writer: SingleChatPage.onJoinApp marks the NEWEST incoming invite row
    /// of that app (S9FixRules.marksJoin). Read by the addAppRequest push (S9FixRules.appState: Declined > Minimized >
    /// Joined > invite).
    ///
    /// Storage: the SAppDeclines shape exactly (a copy, #1233) — ONE app preference string `app_joins`, entries
    /// `<peer address>|<message id hex>` joined by ',', oldest first, capped at <see cref="CAP"/>. Never a `spixi.*` WebView
    /// key; nothing crosses the bridge but the state word on a row the shell already has. Wiped with the account
    /// (<see cref="clearAll"/>) and per contact on remove / delete-history / re-add (<see cref="clear"/>, the SAppDeclines
    /// sites). Lines carry exception TYPES only. Never throws.
    /// </summary>
    public static class SAppJoins
    {
        private const string KEY = "app_joins";
        public const int CAP = 256;
        private static readonly object gate = new object();
        private static List<string>? cache;

        /** Pure: the entry for a row. */
        public static string entry(string peer, string msgIdHex)
        {
            return peer + "|" + msgIdHex.ToLowerInvariant();
        }

        /** Pure: parse the stored string; empty / duplicate / malformed parts are skipped (the first wins). */
        public static List<string> parse(string? raw)
        {
            List<string> l = new List<string>();
            if (string.IsNullOrEmpty(raw))
            {
                return l;
            }
            foreach (string part in raw.Split(','))
            {
                string a = part.Trim();
                int bar = a.IndexOf('|');
                if (bar <= 0 || bar == a.Length - 1 || a.IndexOf('|', bar + 1) >= 0)
                {
                    continue;
                }
                if (!l.Contains(a))
                {
                    l.Add(a);
                }
            }
            return l;
        }

        /** Pure: the stored string — the NEWEST `cap` entries kept. */
        public static string serialize(List<string> l, int cap)
        {
            StringBuilder sb = new StringBuilder();
            for (int i = Math.Max(0, l.Count - cap); i < l.Count; i++)
            {
                if (sb.Length > 0)
                {
                    sb.Append(',');
                }
                sb.Append(l[i]);
            }
            return sb.ToString();
        }

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
                    return load().Contains(entry(peer, msgIdHex));
                }
            }
            catch (Exception e)
            {
                Logging.warn("SAppJoins.has failed: " + e.GetType().Name);
                return false;
            }
        }

        /** Record a joined row; true when it was new. */
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
                    List<string> l = load();
                    string e = entry(peer, msgIdHex);
                    if (l.Contains(e))
                    {
                        return false;
                    }
                    l.Add(e);
                    while (l.Count > CAP)
                    {
                        l.RemoveAt(0);
                    }
                    persist(l);
                    return true;
                }
            }
            catch (Exception e)
            {
                Logging.warn("SAppJoins.add failed: " + e.GetType().Name);
                return false;
            }
        }

        /** Pure: drop every entry of one peer; true when any went. */
        public static bool clearInto(List<string> l, string peer)
        {
            return l.RemoveAll(x => x.StartsWith(peer + "|", StringComparison.Ordinal)) > 0;
        }

        /** The contact is removed / its history deleted / it is re-added — forget its joined rows
         *  (the SReactionFlags.clear sites). A no-op is a lookup, no write. */
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
                    List<string> l = load();
                    if (clearInto(l, peer))
                    {
                        persist(l);
                    }
                }
            }
            catch (Exception e)
            {
                Logging.warn("SAppJoins.clear failed: " + e.GetType().Name);
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
                    SLocalOnlyStore.setDeferred(KEY, null);   // ★ S9 A3 #46 r1 (MINOR-3)
                    Preferences.Default.Remove(KEY);   // a never-migrated backed-up copy goes too
                }
            }
            catch (Exception e)
            {
                Logging.warn("SAppJoins.clearAll failed: " + e.GetType().Name);
            }
        }

        /** Tests only: drop the in-memory copy (the next read re-parses the preference — a "restart"). */
        public static void resetCacheForTest()
        {
            lock (gate)
            {
                cache = null;
            }
        }

        /* ★ S9 A3 #46 r1 (MINOR-3, H-14 consistency): the entries name PEER ADDRESSES, so they live in the backup-excluded
         * SLocalOnlyStore file (Android backup rules, iOS / Mac IsExcludedFromBackup), not in the backed-up Preferences;
         * the first read moves an old Preferences value in once and removes that key (getMigrating). Writes are deferred
         * to one background write (SLocalOnlyStore.setDeferred) — never a file write on the UI thread. Under the gate. */
        private static void persist(List<string> l)
        {
            SLocalOnlyStore.setDeferred(KEY, serialize(l, CAP));
        }

        // under the gate
        private static List<string> load()
        {
            if (cache == null)
            {
                cache = parse(SLocalOnlyStore.getMigrating(KEY));
            }
            return cache;
        }
    }
}
