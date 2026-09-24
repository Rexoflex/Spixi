using IXICore;
using IXICore.Meta;
using Microsoft.Maui.Storage;
using System;
using System.Collections.Generic;

namespace SPIXI.Meta
{
    /// <summary>
    /// ★ #978 (#970, Damir's call 2026-09-24) — THE APP-SIDE IGNORE LIST FOR DECLINED REQUESTS.
    ///
    /// Decline is a LOCAL act: it removes the friend (`FriendList.removeFriend`), and the protocol
    /// has no reject message (RC1), so the requester's app stays in RequestSent and re-sends
    /// `requestAdd`, which Core accepts as a NEW request. The declined request came back (AF.3).
    /// Damir chose to fix this in the app, not in the protocol: the address of a request the user
    /// DECLINED is remembered here, and a later `requestAdd` from that address is dropped before
    /// Core sees it (<c>StreamProcessor.receiveData</c>), and its raw push is not shown
    /// (<c>SNotificationPrefs.shouldDisplayRawPush</c>; the iOS store carries it in <c>muted</c>).
    /// The user can take an address off the list in Account → Security &amp; privacy →
    /// Declined requests (<c>ixian:unignore:</c>), after which a new request from it arrives
    /// normally. The sender is NOT told — that stays the protocol row (Q18/RC1).
    ///
    /// Storage: ONE preference string, the addresses joined by ',' (base58 carries no comma),
    /// capped at <see cref="CAP"/> (oldest dropped). An app preference, never a <c>spixi.*</c>
    /// WebView key (the file:// storage partition question, security review MAJOR #4, does not
    /// arise). Nothing here logs an address: the log is shareable (O-26); the lines carry counts.
    /// Every method is safe on a null/empty/malformed address and never throws.
    /// </summary>
    public static class SRequestIgnore
    {
        private const string KEY = "ignored_requests";
        public const int CAP = 256;
        private static readonly object gate = new object();
        private static List<string>? cache;

        private static List<string> load()
        {
            if (cache != null) return cache;
            List<string> list = new List<string>();
            try
            {
                string raw = Preferences.Default.Get(KEY, "");
                foreach (string part in raw.Split(','))
                {
                    string a = part.Trim();
                    if (a.Length > 0 && !list.Contains(a)) list.Add(a);
                }
            }
            catch (Exception e)
            {
                Logging.error("SRequestIgnore.load failed: " + e.GetType().Name + ": " + SPIXI.Utils.logSafe(e.Message));
            }
            cache = list;
            return list;
        }

        private static void store(List<string> list)
        {
            try
            {
                Preferences.Default.Set(KEY, string.Join(",", list));
            }
            catch (Exception e)
            {
                Logging.error("SRequestIgnore.store failed: " + e.GetType().Name + ": " + SPIXI.Utils.logSafe(e.Message));
            }
        }

        /// <summary>The canonical text of an address, or null when it does not parse. The list
        /// keys on this form so a checksum/no-checksum spelling cannot slip past it.</summary>
        public static string? canonical(string? address)
        {
            if (string.IsNullOrWhiteSpace(address)) return null;
            try
            {
                Address a = new Address(address.Trim());
                string s = a.ToString();
                return string.IsNullOrEmpty(s) ? null : s;
            }
            catch (Exception)
            {
                return null;
            }
        }

        /// <summary>True when the list holds anything — the cheap guard the receive path checks
        /// before it parses a message a second time.</summary>
        public static bool any()
        {
            lock (gate) { return load().Count > 0; }
        }

        public static bool contains(string? address)
        {
            string? c = canonical(address);
            if (c == null) return false;
            lock (gate) { return load().Contains(c); }
        }

        public static bool contains(Address? address)
        {
            if (address == null) return false;
            string s;
            try { s = address.ToString(); } catch (Exception) { return false; }
            return contains(s);
        }

        /// <summary>Adds a DECLINED requester. Returns true when it was added.</summary>
        public static bool add(string? address)
        {
            string? c = canonical(address);
            if (c == null) return false;
            lock (gate)
            {
                List<string> list = load();
                if (list.Contains(c)) return false;
                list.Add(c);
                while (list.Count > CAP) list.RemoveAt(0);
                store(list);
                Logging.info("SRequestIgnore: a declined requester was added (" + list.Count + " on the list).");
            }
#if IOS
            Spixi.SPushPrefsShare.syncLater();   // the extension's copy (it rides the store's muted set)
#endif
            return true;
        }

        /// <summary>Removes an address (the un-block). Returns true when it was on the list.</summary>
        public static bool remove(string? address)
        {
            string? c = canonical(address);
            if (c == null) return false;
            bool removed;
            lock (gate)
            {
                List<string> list = load();
                removed = list.Remove(c);
                if (removed)
                {
                    store(list);
                    Logging.info("SRequestIgnore: an address was taken off the list (" + list.Count + " left).");
                }
            }
#if IOS
            if (removed) Spixi.SPushPrefsShare.syncLater();
#endif
            return removed;
        }

        /// <summary>A copy of the list, oldest first.</summary>
        public static List<string> list()
        {
            lock (gate) { return new List<string>(load()); }
        }

        /// <summary>The account wipe's step: a new account starts with an empty list.</summary>
        public static void clear()
        {
            lock (gate)
            {
                cache = new List<string>();
                try { Preferences.Default.Remove(KEY); } catch (Exception) { }
            }
        }
    }
}
