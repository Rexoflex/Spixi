using IXICore.Meta;
using Microsoft.Maui.Storage;
using System;
using System.Collections.Generic;
using System.Text;

namespace SPIXI.Meta
{
    /// <summary>
    /// ★ #1148 (4) (Damir: "not a number but a heart in a neutral or very light blue circle") — WHO REACTED TO MY MESSAGE
    /// SINCE I LAST OPENED THE CHAT, kept on this device.
    ///
    /// Set by StreamProcessor (msgReaction: a like / tip on MY message, from someone else, chat not open —
    /// <see cref="UnreadRule.reactionRaisesDot"/>); cleared where the unread count clears (SingleChatPage, the chat opens);
    /// read by HomePage for the chats-row push (`addChat`'s 13th arg, the heart). Never a count: the Unread chip and every
    /// badge read the unread count only.
    ///
    /// Storage (the SSightingStore #1116 shape): ONE app preference string, the flagged ADDRESSES joined by ',' (base58
    /// carries no ','), oldest first, capped at <see cref="CAP"/> (the oldest flag goes first). A fixed key, an
    /// app preference — never a <c>spixi.*</c> WebView key; the addresses never cross the bridge (the shell gets a bool on a
    /// row it already has). Wiped with the account (<see cref="clearAll"/>), forgotten with the contact
    /// (<see cref="clear"/>). Lines carry exception TYPES only — no address. Never throws.
    /// </summary>
    public static class SReactionFlags
    {
        private const string KEY = "reaction_flags";
        public const int CAP = 256;
        private static readonly object gate = new object();
        private static readonly object writeGate = new object();
        private static List<string>? cache;

        /** Pure: parse the stored string; empty / duplicate parts are skipped (the first wins). */
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
                if (a.Length > 0 && !l.Contains(a))
                {
                    l.Add(a);
                }
            }
            return l;
        }

        /** Pure: the stored string — the NEWEST `cap` flags kept. */
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

        /** Pure: flag `address` in `l`. True = `l` changed (write it). Over `cap` the oldest flag is dropped. */
        public static bool setInto(List<string> l, string? address, int cap)
        {
            if (l == null || string.IsNullOrEmpty(address) || address.IndexOf(',') >= 0 || l.Contains(address))
            {
                return false;
            }
            l.Add(address);
            while (l.Count > cap)
            {
                l.RemoveAt(0);
            }
            return true;
        }

        /** Pure: un-flag `address`. True = `l` changed. */
        public static bool clearInto(List<string> l, string? address)
        {
            return l != null && !string.IsNullOrEmpty(address) && l.Remove(address);
        }

        private static List<string> load()
        {
            if (cache != null)
            {
                return cache;
            }
            List<string> l;
            try
            {
                l = parse(Preferences.Default.Get(KEY, ""));
            }
            catch (Exception e)
            {
                Logging.error("SReactionFlags.load failed: " + e.GetType().Name);
                l = new List<string>();
            }
            cache = l;
            return l;
        }

        private static void flush()
        {
            lock (writeGate)
            {
                string snapshot;
                lock (gate)
                {
                    snapshot = serialize(load(), CAP);
                }
                try
                {
                    Preferences.Default.Set(KEY, snapshot);
                }
                catch (Exception e)
                {
                    Logging.error("SReactionFlags.store failed: " + e.GetType().Name);
                }
            }
        }

        /** Someone reacted to my message in this chat. True = newly set (the row needs a re-push). */
        public static bool set(string? address)
        {
            bool changed;
            lock (gate)
            {
                changed = setInto(load(), address, CAP);
            }
            if (changed)
            {
                flush();
            }
            return changed;
        }

        public static bool has(string? address)
        {
            if (string.IsNullOrEmpty(address))
            {
                return false;
            }
            lock (gate)
            {
                return load().Contains(address);
            }
        }

        /** The chat opened (or the contact was removed). True = it was set (the row needs a re-push). A no-op costs a
         *  lookup — no write. */
        public static bool clear(string? address)
        {
            bool changed;
            lock (gate)
            {
                changed = clearInto(load(), address);
            }
            if (changed)
            {
                flush();
            }
            return changed;
        }

        /** The account wipe's step. */
        public static void clearAll()
        {
            lock (writeGate)
            {
                lock (gate)
                {
                    cache = new List<string>();
                }
                try { Preferences.Default.Remove(KEY); } catch (Exception) { }
            }
        }
    }
}
