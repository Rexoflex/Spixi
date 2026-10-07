using IXICore.Meta;
using Microsoft.Maui.Storage;
using System;
using System.Collections.Generic;
using System.Text;

namespace SPIXI.Meta
{
    /// <summary>
    /// ★ S8 (#1233): WHICH MINI-APP INVITE ROWS ARE DECLINED, kept on this device so a card stays "Declined" after a reload.
    /// Two writers, one meaning per device: the INVITEE's Decline (SingleChatPage `ixian:appDecline:<msgIdHex>`, its incoming
    /// row) and the INVITER's "declined by the peer" (StreamProcessor.handleAppRequestReject, its own newest outgoing row of
    /// that session). Read by SingleChatPage's addAppRequest push (app_state "Declined"). Replaces the shell's localStorage
    /// `spixi.app.declined.<peer>` list — C# is the truth now.
    ///
    /// Storage (the SReactionFlags shape): ONE app preference string, entries `<peer address>|<message id hex>` joined by
    /// ',' (base58 and hex carry neither), oldest first, capped at <see cref="CAP"/> (the oldest goes first). A fixed key, an
    /// app preference — never a `spixi.*` WebView key; nothing here crosses the bridge (the shell gets the state word on a
    /// row it already has). Keyed by the ROW (message id), not the session: Spixi's session id is the app id's hash
    /// (MiniAppPage.sessionIdFor), so a later re-invite to the same app is a new row and starts undeclined. Wiped with the
    /// account (<see cref="clearAll"/>), and per contact on remove / delete-history / re-add (<see cref="clear"/>). Lines carry exception TYPES only. Never throws.
    /// </summary>
    public static class SAppDeclines
    {
        private const string KEY = "app_declines";
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
                Logging.warn("SAppDeclines.has failed: " + e.GetType().Name);
                return false;
            }
        }

        /** Record a declined row; true when it was new. */
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
                    Preferences.Default.Set(KEY, serialize(l, CAP));
                    return true;
                }
            }
            catch (Exception e)
            {
                Logging.warn("SAppDeclines.add failed: " + e.GetType().Name);
                return false;
            }
        }

        /** Pure: drop every entry of one peer; true when any went. */
        public static bool clearInto(List<string> l, string peer)
        {
            return l.RemoveAll(x => x.StartsWith(peer + "|", StringComparison.Ordinal)) > 0;
        }

        /** ★ S8 #46 r4 (MINOR-3): the contact is removed / its history deleted / it is re-added — forget its declined rows
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
                        Preferences.Default.Set(KEY, serialize(l, CAP));
                    }
                }
            }
            catch (Exception e)
            {
                Logging.warn("SAppDeclines.clear failed: " + e.GetType().Name);
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
                    Preferences.Default.Remove(KEY);
                }
            }
            catch (Exception e)
            {
                Logging.warn("SAppDeclines.clearAll failed: " + e.GetType().Name);
            }
        }

        // under the gate
        private static List<string> load()
        {
            if (cache == null)
            {
                cache = parse(Preferences.Default.Get(KEY, ""));
            }
            return cache;
        }
    }
}
