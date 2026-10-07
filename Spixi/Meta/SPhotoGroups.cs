using IXICore.Meta;
using Microsoft.Maui.Storage;
using System;
using System.Collections.Generic;
using System.Text;

namespace SPIXI.Meta
{
    /// <summary>
    /// ★ S9 (#1244, CONTRACT §1d): WHICH FILE ROWS BELONG TO A PHOTO GROUP, kept on this device (Core's FriendMessage has no
    /// field for it — Core is v1.1). Two writers: the RECEIVER (StreamProcessor.handleFileHeader, AFTER Core stored an
    /// INCOMING row — #46 r1 M-2) and the SENDER (SingleChatPage's mediaSend, for its own rows, so the sender sees the same
    /// grid). Read by SingleChatPage's addFile push (arg 18, PhotoRules.groupArg) and HomePage's chats-list excerpt.
    ///
    /// ★ #46 r1 M-2: FIRST WRITER WINS (a row's group is never rewritten — a hostile peer replaying a message id cannot
    /// regroup or ungroup a row), and every entry records WHO sent the row (`from`: "me" for my own rows, else the sender's
    /// address) so a caption is matched only to a text from the SAME sender (isCaption).
    /// ★ #46 r1 m-5: a per-peer cap (<see cref="PEER_CAP"/>) on top of the global one, and a LINEAR parse.
    ///
    /// Storage (the SAppDeclines shape): ONE app preference string, entries
    /// `<peer>|<msgIdHex>|<gid>|<index>|<count>|<captionId>|<from>` joined by ',' (base58, hex, digits and "me" carry neither
    /// ',' nor '|'; a 6-field entry from before r1 reads with from = ""), oldest first. A3 may swap the backend (load / save)
    /// — the public API stays. Wiped with the account (<see cref="clearAll"/>) and per contact (<see cref="clear"/>, via
    /// SPeerLocalStores.forget). Lines carry exception TYPES only. Never throws.
    /// </summary>
    public static class SPhotoGroups
    {
        private const string KEY = "photo_groups";
        public const int CAP = 4096;        // ★ #46 r3 m3: an entry is ~155–220 chars (two addresses, 2 × 32 hex) → ≤ ~0.9 MB
        public const int PEER_CAP = 1024;   // ★ #46 r3 m3: ≈ 100 groups of 10 per chat
        public const string FromMe = "me";
        private static readonly object gate = new object();
        private static List<string>? cache;

        /** Pure: the lookup key of a row (peer | lowercase message id hex). */
        public static string rowKey(string peer, string msgIdHex)
        {
            return peer + "|" + msgIdHex.ToLowerInvariant();
        }

        private static bool tokenOk(string? t)
        {
            return t != null && t.IndexOf('|') < 0 && t.IndexOf(',') < 0;
        }

        /** Pure: is one stored entry well-formed (6 or 7 fields, a valid group)? */
        public static bool entryOk(string e, out string key, out string group)
        {
            return entryOk(e, out key, out group, out _);
        }

        public static bool entryOk(string e, out string key, out string group, out string from)
        {
            key = "";
            group = "";
            from = "";
            string[] p = e.Split('|');
            if ((p.Length != 6 && p.Length != 7) || p[0].Length == 0 || p[1].Length == 0)
            {
                return false;
            }
            string g = p[2] + "|" + p[3] + "|" + p[4] + "|" + p[5];
            if (!PhotoRules.parseGroupArg(g, out _, out _, out _, out _))
            {
                return false;
            }
            key = p[0] + "|" + p[1];
            group = g;
            from = p.Length == 7 ? p[6] : "";
            return true;
        }

        private static string peerOf(string entry)
        {
            int bar = entry.IndexOf('|');
            return bar > 0 ? entry.Substring(0, bar) : "";
        }

        /** Pure, LINEAR: parse the stored string; malformed parts are skipped; for one row the FIRST entry wins; then the
         *  per-peer cap (the newest PEER_CAP of each peer) and the global cap (the newest CAP) apply. */
        public static List<string> parse(string? raw)
        {
            List<string> l = new List<string>();
            if (string.IsNullOrEmpty(raw))
            {
                return l;
            }
            HashSet<string> seen = new HashSet<string>(StringComparer.Ordinal);
            foreach (string part in raw.Split(','))
            {
                string a = part.Trim();
                if (!entryOk(a, out string key, out _) || !seen.Add(key))
                {
                    continue;   // malformed, or a later duplicate (first writer wins)
                }
                l.Add(a);
            }
            return capped(l);
        }

        /** Pure: the newest PEER_CAP entries of each peer, then the newest CAP overall (order kept). */
        public static List<string> capped(List<string> l)
        {
            Dictionary<string, int> perPeer = new Dictionary<string, int>(StringComparer.Ordinal);
            List<string> keptRev = new List<string>(Math.Min(l.Count, CAP));
            for (int i = l.Count - 1; i >= 0 && keptRev.Count < CAP; i--)
            {
                string peer = peerOf(l[i]);
                perPeer.TryGetValue(peer, out int n);
                if (n >= PEER_CAP)
                {
                    continue;
                }
                perPeer[peer] = n + 1;
                keptRev.Add(l[i]);
            }
            keptRev.Reverse();
            return keptRev;
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

        private static int indexOfRow(List<string> l, string peer, string msgIdHex)
        {
            string prefix = rowKey(peer, msgIdHex) + "|";
            for (int i = l.Count - 1; i >= 0; i--)
            {
                if (l[i].StartsWith(prefix, StringComparison.Ordinal))
                {
                    return i;
                }
            }
            return -1;
        }

        /** Pure: the group string of a row in a parsed list, or "". */
        public static string find(List<string> l, string peer, string msgIdHex)
        {
            int i = indexOfRow(l, peer, msgIdHex);
            return i >= 0 && entryOk(l[i], out _, out string g) ? g : "";
        }

        /** Pure (the chats-list excerpt): is `captionIdHex` the caption id of a group of `peer` whose rows came from `from`?
         *  An empty id or an empty / unknown `from` never matches (#46 r1 M-2: a text is a caption only of ITS sender's photos). */
        public static bool findCaption(List<string> l, string peer, string captionIdHex, string from)
        {
            if (string.IsNullOrEmpty(captionIdHex) || string.IsNullOrEmpty(from))
            {
                return false;
            }
            string prefix = peer + "|";
            string cap = captionIdHex.ToLowerInvariant();
            foreach (string e in l)
            {
                if (!e.StartsWith(prefix, StringComparison.Ordinal))
                {
                    continue;
                }
                string[] p = e.Split('|');
                if (p.Length == 7 && p[5] == cap && p[6] == from)
                {
                    return true;
                }
            }
            return false;
        }

        /** Is this text row (by id) the caption of a photo group of `peer` sent by `from` ("me" or the sender's address)? */
        public static bool isCaption(string? peer, string? msgIdHex, string? from)
        {
            if (string.IsNullOrEmpty(peer) || string.IsNullOrEmpty(msgIdHex) || string.IsNullOrEmpty(from))
            {
                return false;
            }
            try
            {
                lock (gate)
                {
                    return findCaption(load(), peer, msgIdHex, from);
                }
            }
            catch (Exception e)
            {
                Logging.warn("SPhotoGroups.isCaption failed: " + e.GetType().Name);
                return false;
            }
        }

        /** Pure: the photo count of a group string ("" / invalid → 0). */
        public static int countOf(string? group)
        {
            return PhotoRules.parseGroupArg(group, out _, out _, out int n, out _) ? n : 0;
        }

        /** addFile arg 18 for a row: the validated group string, or "". */
        public static string get(string? peer, string? msgIdHex)
        {
            if (string.IsNullOrEmpty(peer) || string.IsNullOrEmpty(msgIdHex))
            {
                return "";
            }
            try
            {
                lock (gate)
                {
                    return find(load(), peer, msgIdHex);
                }
            }
            catch (Exception e)
            {
                Logging.warn("SPhotoGroups.get failed: " + e.GetType().Name);
                return "";
            }
        }

        /** Pure: add one entry to a parsed list — FIRST WRITER WINS (false when the row already has a group); caps applied. */
        public static bool addInto(List<string> l, string peer, string msgIdHex, string group, string from)
        {
            if (indexOfRow(l, peer, msgIdHex) >= 0)
            {
                return false;
            }
            l.Add(rowKey(peer, msgIdHex) + "|" + group + "|" + from);
            List<string> c = capped(l);
            if (c.Count != l.Count)
            {
                l.Clear();
                l.AddRange(c);
            }
            return true;
        }

        /** Record a row's group (a groupArg string — refused unless valid) and its sender; true when stored. A row that
         *  already has a group keeps it (first writer wins). */
        public static bool set(string? peer, string? msgIdHex, string? group, string from = FromMe)
        {
            if (string.IsNullOrEmpty(peer) || string.IsNullOrEmpty(msgIdHex) || !tokenOk(peer) || !tokenOk(msgIdHex)
                || string.IsNullOrEmpty(from) || !tokenOk(from)
                || !PhotoRules.parseGroupArg(group, out _, out _, out _, out _))
            {
                return false;
            }
            try
            {
                lock (gate)
                {
                    List<string> l = load();
                    if (!addInto(l, peer, msgIdHex, group!, from))
                    {
                        return false;
                    }
                    persist(l);
                    return true;
                }
            }
            catch (Exception e)
            {
                Logging.warn("SPhotoGroups.set failed: " + e.GetType().Name);
                return false;
            }
        }

        /** ★ #46 r3 m3: record SEVERAL rows of one peer (a sender's whole batch) — ONE persist, so the stored string is
         *  rebuilt once per batch, not once per photo. Each row as in set (refused unless valid; first writer wins). Returns
         *  how many were stored. */
        public static int setMany(string? peer, IList<KeyValuePair<string, string>> rows, string from = FromMe)
        {
            if (string.IsNullOrEmpty(peer) || !tokenOk(peer) || string.IsNullOrEmpty(from) || !tokenOk(from) || rows == null || rows.Count == 0)
            {
                return 0;
            }
            try
            {
                lock (gate)
                {
                    List<string> l = load();
                    int added = 0;
                    foreach (KeyValuePair<string, string> r in rows)
                    {
                        if (string.IsNullOrEmpty(r.Key) || !tokenOk(r.Key) || !PhotoRules.parseGroupArg(r.Value, out _, out _, out _, out _))
                        {
                            continue;
                        }
                        if (addInto(l, peer, r.Key, r.Value, from))
                        {
                            added++;
                        }
                    }
                    if (added > 0)
                    {
                        persist(l);
                    }
                    return added;
                }
            }
            catch (Exception e)
            {
                Logging.warn("SPhotoGroups.setMany failed: " + e.GetType().Name);
                return 0;
            }
        }

        /** Forget one row (a send that never stored its message). */
        public static void remove(string? peer, string? msgIdHex)
        {
            if (string.IsNullOrEmpty(peer) || string.IsNullOrEmpty(msgIdHex))
            {
                return;
            }
            try
            {
                lock (gate)
                {
                    List<string> l = load();
                    string key = rowKey(peer, msgIdHex);
                    if (l.RemoveAll(x => x.StartsWith(key + "|", StringComparison.Ordinal)) > 0)
                    {
                        persist(l);
                    }
                }
            }
            catch (Exception e)
            {
                Logging.warn("SPhotoGroups.remove failed: " + e.GetType().Name);
            }
        }

        /** Pure: drop every entry of one peer; true when any went. */
        public static bool clearInto(List<string> l, string peer)
        {
            return l.RemoveAll(x => x.StartsWith(peer + "|", StringComparison.Ordinal)) > 0;
        }

        /** The contact is removed / its history deleted / it is re-added — forget its rows (SPeerLocalStores.forget). */
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
                Logging.warn("SPhotoGroups.clear failed: " + e.GetType().Name);
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
                Logging.warn("SPhotoGroups.clearAll failed: " + e.GetType().Name);
            }
        }

        /** csh only: drop the in-process copy so the next call re-reads the preference. */
        internal static void resetCacheForTest()
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
