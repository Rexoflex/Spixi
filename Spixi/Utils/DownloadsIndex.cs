using IXICore;
using IXICore.Meta;
using IXICore.Streaming;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace SPIXI
{
    /* ★★ #1107 — DOWNLOADS: who sent each file, and where it is in the chat (session 1 part 5b).
     *
     * A stored file maps to its sender ONLY through the RECEIVED file message whose C#-recorded path resolves to it AND
     * whose recorded size is the file's size (a path is reused after a delete — #46 r4 R4-1); the newest such message wins
     * (SContacts' vetted Downloads-root rule, the one SharedItems uses). Never by name: a collision renames the second
     * file to `name-1.ext` (TransferManager.completeFileTransfer), and a name says nothing about who sent it. A file
     * with no such message has no sender and no "Show in chat" — never a guess (Damir, #1107).
     *
     * Runs OFF the UI thread after the list is on screen (phase 2). Reads each 1:1 / group conversation's history from
     * disk, newest first, at most HistoryCap messages per channel (a file older than that shows no sender). Bots are
     * skipped (v1, as in chat info). Logs counts and milliseconds only.
     * The WebView only ever sends back a file NAME (`ixian:showDownloadInChat:<name>`), which goes through
     * TransferManager.resolveDownloadPath like open/delete; C# then looks the path up in THIS index. */
    public sealed class DownloadSource
    {
        public Friend friend = null!;
        public string label = "";      // the conversation's display name
        public string key = "";        // an opaque per-scan key for the shell's filter (never an address)
        public string idHex = "";      // the file message id (C#'s own)
        public int depth = 0;          // messages newer than it in its channel (the #1106 jump)
        public long receivedAt = 0;    // (#46 r4 R4-1) the newest message wins ACROSS conversations
        public FriendMessage message = null!;   // (#46 r5 R5-3) re-checked at every lookup: the path can be reused while the screen is open
    }

    public static class DownloadsIndex
    {
        public const int HistoryCap = 20000;

        private static readonly object indexLock = new object();
        private static Dictionary<string, DownloadSource> byPath = new Dictionary<string, DownloadSource>(StringComparer.Ordinal);
        private static long generation = 0;   // (#46 r1 A6) two overlapping builds: only the NEWEST one publishes

        private static string norm(string full)
        {
            string p = Path.GetFullPath(full);
            return OperatingSystem.IsWindows() || OperatingSystem.IsMacCatalyst() || OperatingSystem.IsIOS() ? p.ToLowerInvariant() : p;
        }

        /** Rebuild the path → sender index. Off the UI thread. Returns null when a NEWER build superseded this one
         *  (#46 r2 R2-10: the caller then pushes nothing — the newer build's caller does). */
        public static Dictionary<string, DownloadSource>? build()
        {
            System.Diagnostics.Stopwatch sw = System.Diagnostics.Stopwatch.StartNew();
            long myGen;
            lock (indexLock)
            {
                myGen = ++generation;
            }
            Dictionary<string, DownloadSource> map = new Dictionary<string, DownloadSource>(StringComparer.Ordinal);
            List<Friend> friends;
            lock (FriendList.friends)
            {
                friends = new List<Friend>(FriendList.friends);
            }
            int read = 0;
            int k = 0;
            foreach (Friend f in friends)
            {
                if (f == null || f.bot || (f.type != FriendType.Normal && f.type != FriendType.Group))
                {
                    continue;
                }
                string key = "s" + (k++).ToString(System.Globalization.CultureInfo.InvariantCulture);
                string label = string.IsNullOrEmpty(f.nickname) ? "" : f.nickname;
                string root = Path.Combine(IxianHandler.localStorage.documentsPath, "Chats", f.walletAddress.ToString());
                if (!Directory.Exists(root))
                {
                    continue;
                }
                foreach (string dir in Directory.GetDirectories(root))
                {
                    if (!int.TryParse(Path.GetFileName(dir), System.Globalization.NumberStyles.Integer, System.Globalization.CultureInfo.InvariantCulture, out int ch))
                    {
                        continue;
                    }
                    List<FriendMessage> hist;
                    try
                    {
                        hist = IxianHandler.localStorage.readLastMessages(f, ch, 0, HistoryCap);
                    }
                    catch (Exception)
                    {
                        continue;
                    }
                    read += hist.Count;
                    int depth = 0;
                    for (int i = hist.Count - 1; i >= 0; i--, depth++)
                    {
                        FriendMessage fm = hist[i];
                        if (fm == null || fm.id == null || fm.localSender || fm.type != FriendMessageType.fileHeader || string.IsNullOrEmpty(fm.message))
                        {
                            continue;
                        }
                        string? full = SContacts.receivedMediaPathOfPublic(fm);
                        if (full == null)
                        {
                            continue;
                        }
                        if (!SharedItems.fileMatches(fm, full))
                        {
                            continue;   // (#46 r4 R4-1) the path was reused: the file on disk is not this message's
                        }
                        string n = norm(full);
                        long at = fm.receivedTimestamp > 0 ? fm.receivedTimestamp : fm.timestamp;
                        // newest first inside a channel; ACROSS conversations the newest message that wrote this path wins (#46 r4 R4-1)
                        if (!map.TryGetValue(n, out DownloadSource? had) || at > had.receivedAt)
                        {
                            map[n] = new DownloadSource { friend = f, label = label, key = key, idHex = Crypto.hashToString(fm.id), depth = depth, receivedAt = at, message = fm };
                        }
                    }
                }
            }
            lock (indexLock)
            {
                if (myGen != generation)
                {
                    return null;
                }
                byPath = map;
            }
            Logging.info("[DOWNLOADS] matched={0} read={1} ms={2}", map.Count, read, sw.ElapsedMilliseconds);   // counts only
            return map;
        }

        /** The sender of the file at `full` (C#-resolved path), from the last build; null = none. */
        public static DownloadSource? sourceOf(string full)
        {
            if (string.IsNullOrEmpty(full))
            {
                return null;
            }
            string n;
            try { n = norm(full); } catch (Exception) { return null; }
            DownloadSource? hit;
            lock (indexLock)
            {
                hit = byPath.TryGetValue(n, out DownloadSource? s) ? s : null;
            }
            // (#46 r5 R5-3) the file at that path must STILL be the one the message wrote (a delete + a same-named download
            // while Downloads is open reuses the path)
            return hit != null && FileMatch.matches(hit.message, full) ? hit : null;
        }

        /** ★ S10 #46 r1 (N3 / R3-18): phase 2's TWO pushes from ONE snapshot of the index (one byPath reference, one lookup
         *  per file — senders and avatars can never describe two different builds). Off the UI thread (the avatar files are
         *  read here).
         *  senders = [[file name, sender label, sender key], …] for the files that HAVE a sender.
         *  avatars (🟡 NEW push setDownloadAvatars, S10 F7 #1254) = [[sender key, data URI], …] for those senders that HAVE an
         *  avatar file — C#'s own file only (IxianHandler.localStorage.getAvatarPath → Utils.imageToDataUri, a local read;
         *  never a remote fetch, never a WebView-supplied path). A sentinel ("img/…"), a miss (the raw path comes back), a gif
         *  or an oversized URI is skipped (S10FixRules.avatarUriOk — the shell checks the same); one entry per key,
         *  ≤ S10FixRules.MaxAvatarEntries. Never the address on the wire: the key is the opaque per-scan "s<n>". */
        public static void pushJson(IEnumerable<string> fullPaths, out string senders, out string avatars)
        {
            Dictionary<string, DownloadSource> snap;
            lock (indexLock)
            {
                snap = byPath;
            }
            List<string[]> rows = new List<string[]>();
            List<string[]> faces = new List<string[]>();
            HashSet<string> seen = new HashSet<string>(StringComparer.Ordinal);
            foreach (string p in fullPaths)
            {
                DownloadSource? s = sourceIn(snap, p);
                if (s == null)
                {
                    continue;
                }
                rows.Add(new string[] { Path.GetFileName(p), s.label, s.key });
                if (faces.Count >= S10FixRules.MaxAvatarEntries || !seen.Add(s.key))
                {
                    continue;
                }
                try
                {
                    string? avatar = IxianHandler.localStorage.getAvatarPath(s.friend.walletAddress.ToString());
                    if (string.IsNullOrEmpty(avatar))
                    {
                        continue;
                    }
                    string uri = Utils.imageToDataUri(avatar);
                    if (S10FixRules.avatarUriOk(uri))
                    {
                        faces.Add(new string[] { s.key, uri });
                    }
                }
                catch (Exception)
                {
                    // no avatar for this sender
                }
            }
            senders = JsonConvert.SerializeObject(rows);
            avatars = JsonConvert.SerializeObject(faces);
        }

        /** sourceOf against a snapshot taken once by the caller. */
        private static DownloadSource? sourceIn(Dictionary<string, DownloadSource> snap, string full)
        {
            if (string.IsNullOrEmpty(full))
            {
                return null;
            }
            string n;
            try { n = norm(full); } catch (Exception) { return null; }
            DownloadSource? hit = snap.TryGetValue(n, out DownloadSource? s) ? s : null;
            return hit != null && FileMatch.matches(hit.message, full) ? hit : null;
        }
    }
}
