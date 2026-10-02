using IXICore.Meta;
using Microsoft.Maui.Storage;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace SPIXI.Meta
{
    /// <summary>
    /// ★ G-2 (session 2, #1116 (2), #1118: Damir picked (a)) — THE LAST SIGHTING OF EACH CONTACT, KEPT ON THIS DEVICE.
    ///
    /// Before: a sighting lived in memory only (#1103), so a contact not seen since the app started showed NO
    /// "last seen" at all (#1115 LAST fail). Now the newest sighting this device made — a presence keepalive or a
    /// message from them (the same two sources as PresenceDisplay) — is kept across restarts, so "last seen
    /// recently / a long time ago" can show. Known limit (#1117 (3), accepted): a sighting needs both apps online at
    /// the same time, so the value can only read OLDER than the truth, never newer.
    ///
    /// Storage: ONE app preference string `address:seconds` joined by ',' (base58 carries no ':' or ','), seconds =
    /// NETWORK seconds ROUNDED DOWN to <see cref="GRAIN_SEC"/> (5 min) — the UI shows three words (#1113), so a finer
    /// time would only be a more precise record of a contact's routine on disk. Capped at <see cref="CAP"/> contacts
    /// (the oldest sighting goes first). An app preference, never a <c>spixi.*</c> WebView key; the value never crosses
    /// the bridge (the shells get the existing "last seen" seconds argument, as before). Wiped with the account
    /// (SettingsPage wipe → Preferences.Default.Clear + <see cref="clear"/>), forgotten with the contact
    /// (<see cref="forget"/>). Nothing here logs an address (O-26): the lines carry counts. Never throws.
    /// </summary>
    public static class SSightingStore
    {
        private const string KEY = "last_sightings";
        public const int CAP = 512;
        public const long GRAIN_SEC = 300;
        private static readonly object gate = new object();
        private static readonly object writeGate = new object();   // (#46 r1 A6) the Preferences write, OUTSIDE `gate`
        private static Dictionary<string, long>? cache;

        /** Pure: a network-seconds sighting coarsened to the stored grain (rounded DOWN — never newer). */
        public static long coarse(long seconds)
        {
            return seconds <= 0 ? 0 : seconds - (seconds % GRAIN_SEC);
        }

        /** Pure: parse the stored string; malformed parts are skipped. */
        public static Dictionary<string, long> parse(string? raw)
        {
            Dictionary<string, long> d = new Dictionary<string, long>();
            if (string.IsNullOrEmpty(raw))
            {
                return d;
            }
            foreach (string part in raw.Split(','))
            {
                int c = part.IndexOf(':');
                if (c <= 0 || c == part.Length - 1)
                {
                    continue;
                }
                string a = part.Substring(0, c).Trim();
                if (a.Length == 0 || !long.TryParse(part.Substring(c + 1), NumberStyles.None, CultureInfo.InvariantCulture, out long s) || s <= 0)
                {
                    continue;
                }
                if (!d.TryGetValue(a, out long have) || s > have)
                {
                    d[a] = s;
                }
            }
            return d;
        }

        /** Pure: the stored string, newest sightings kept when over the cap. */
        public static string serialize(Dictionary<string, long> d, int cap)
        {
            List<KeyValuePair<string, long>> rows = new List<KeyValuePair<string, long>>(d);
            rows.Sort((x, y) => y.Value.CompareTo(x.Value));
            StringBuilder sb = new StringBuilder();
            int n = 0;
            foreach (var kv in rows)
            {
                if (n >= cap)
                {
                    break;
                }
                if (sb.Length > 0)
                {
                    sb.Append(',');
                }
                sb.Append(kv.Key).Append(':').Append(kv.Value.ToString(CultureInfo.InvariantCulture));
                n++;
            }
            return sb.ToString();
        }

        private static Dictionary<string, long> load()
        {
            if (cache != null)
            {
                return cache;
            }
            Dictionary<string, long> d;
            try
            {
                d = parse(Preferences.Default.Get(KEY, ""));
            }
            catch (Exception e)
            {
                Logging.error("SSightingStore.load failed: " + e.GetType().Name);
                d = new Dictionary<string, long>();
            }
            cache = d;
            return d;
        }

        /** Pure (#46 r1 M3, EXECUTED by the unit tests): record a sighting in `d`. True = `d` changed (write it): the
         *  COARSE value moved FORWARD (an older or equal one never overwrites), or a first sighting. Over `cap` the
         *  oldest sighting is dropped (possibly this one). */
        public static bool noteInto(Dictionary<string, long> d, string? address, long networkSeconds, int cap)
        {
            if (d == null || string.IsNullOrEmpty(address))
            {
                return false;
            }
            long s = coarse(networkSeconds);
            if (s <= 0)
            {
                return false;
            }
            if (d.TryGetValue(address, out long have) && have >= s)
            {
                return false;
            }
            d[address] = s;
            if (d.Count > cap)
            {
                string oldest = "";
                long oldestAt = long.MaxValue;
                foreach (var kv in d)
                {
                    if (kv.Value < oldestAt)
                    {
                        oldestAt = kv.Value;
                        oldest = kv.Key;
                    }
                }
                d.Remove(oldest);
            }
            return true;
        }

        /** A sighting of `address` at `networkSeconds`. Written only when the COARSE value moves forward, so a contact
         *  costs at most one preference write per 5 minutes. The disk write runs OUTSIDE the lock the UI's reads take
         *  (#46 r1 A6); `writeGate` serialises the writes, and each one stores the LATEST state. */
        public static void note(string? address, long networkSeconds)
        {
            bool changed;
            lock (gate)
            {
                changed = noteInto(load(), address, networkSeconds, CAP);
            }
            if (changed)
            {
                flush();
            }
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
                    Logging.error("SSightingStore.store failed: " + e.GetType().Name);
                }
            }
        }

        /** The kept sighting in network seconds, 0 = none. */
        public static long get(string? address)
        {
            if (string.IsNullOrEmpty(address))
            {
                return 0;
            }
            lock (gate)
            {
                return load().TryGetValue(address, out long s) ? s : 0;
            }
        }

        /** The contact was removed: its sighting goes with it. */
        public static void forget(string? address)
        {
            if (string.IsNullOrEmpty(address))
            {
                return;
            }
            bool removed;
            int left;
            lock (gate)
            {
                Dictionary<string, long> d = load();
                removed = d.Remove(address);
                left = d.Count;
            }
            if (removed)
            {
                flush();
                Logging.info("SSightingStore: a sighting was forgotten (" + left + " kept).");
            }
        }

        /** The account wipe's step: a new account starts with nothing kept. */
        public static void clear()
        {
            lock (writeGate)
            {
                lock (gate)
                {
                    cache = new Dictionary<string, long>();
                }
                try { Preferences.Default.Remove(KEY); } catch (Exception) { }
            }
        }
    }
}
