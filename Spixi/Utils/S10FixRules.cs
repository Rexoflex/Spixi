/* ★ S10 (#1252 / #1253 / #1254) — the pure halves of agent B's fix rows (scripts/csh executes them: S10FixTests.cs).
 * The call sites are MAUI-bound (HomePage, TransferManager, DownloadsIndex / SettingsPage).
 *
 *   · F3  livePhotoCount — "{n} photos" in the chats excerpt = the LIVE members of that photo group still in the list
 *   · F6  PrePushDelayMs / PrePushGate — the wallet pre-push after ixian:bootDropped AND ixian:onload (whichever is second)
 *   · F7  isPartLeaf / partialStale — the part-file sweep at TransferManager start
 *         avatarUriOk — the setDownloadAvatars value C# may push (its own avatar file as a data: URI) */
using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;

namespace SPIXI
{
    public static class S10FixRules
    {
        // —— F3 ——
        /** ★ #46 r1 (M7): the rows scanned on EACH side of the last message for its group's members (a group's ≤ 10 members
         *  are sent together; 3 × the batch leaves room for interleaved messages in a room). */
        public const int PhotoWindowRows = 30;

        /** The group id of a stored group string (SPhotoGroups.get), or "" (none / invalid). */
        public static string groupIdOf(string? group)
        {
            return PhotoRules.parseGroupArg(group, out string gid, out _, out _, out _) ? gid : "";
        }

        /** The position of the row with this id, searched from the END (the last message is near it), or -1. */
        public static int lastIndexOfId<T>(IList<T>? list, byte[]? id, Func<T, byte[]?> idOf)
        {
            if (list == null || id == null)
            {
                return -1;
            }
            for (int i = list.Count - 1; i >= 0; i--)
            {
                byte[]? x = idOf(list[i]);
                if (x != null && x.Length == id.Length)
                {
                    bool same = true;
                    for (int k = 0; k < x.Length; k++)
                    {
                        if (x[k] != id[k])
                        {
                            same = false;
                            break;
                        }
                    }
                    if (same)
                    {
                        return i;
                    }
                }
            }
            return -1;
        }

        /** How many rows of `list` within `window` rows on each side of `anchor` (-1 / out of range → the end) are LIVE
         *  (isLive) members of group `gid` (gidOf = the row's group id). isLive is asked first, so a deleted row costs no group
         *  lookup; the walk STOPS once `want` members are seen (★ #46 r1 M7). "" gid / want ≤ 0 → 0. */
        public static int livePhotoCount<T>(IList<T>? list, string? gid, Func<T, bool> isLive, Func<T, string?> gidOf, int anchor, int window, int want)
        {
            if (list == null || list.Count == 0 || string.IsNullOrEmpty(gid) || window < 0 || want <= 0)
            {
                return 0;
            }
            if (anchor < 0 || anchor >= list.Count)
            {
                anchor = list.Count - 1;
            }
            int hi = Math.Min(list.Count - 1, anchor + window);
            int lo = Math.Max(0, anchor - window);
            int n = 0;
            for (int i = hi; i >= lo && n < want; i--)
            {
                T m = list[i];
                if (m == null || !isLive(m))
                {
                    continue;
                }
                if (string.Equals(gidOf(m), gid, StringComparison.Ordinal))
                {
                    n++;
                }
            }
            return n;
        }

        // —— F6 ——
        public const int PrePushDelayMs = 1200;

        /** Pre-push the wallet rows? Once per document (the caller latches), only while the document was never fed and the
         *  wallet tab is not the current tab (its own entry pushes then). */
        public static bool walletPrePush(bool fed, string? currentTab)
        {
            return !fed && !string.Equals(currentTab, "tab2", StringComparison.Ordinal);
        }

        /** ★ #46 r1 (M4): the pre-push fires after BOTH ixian:onload and ixian:bootDropped of a document, whichever comes
         *  second. onLoaded bumps the document generation, so a bootDropped that arrives BEFORE the onload (reduced motion)
         *  carries the previous generation: it is held (pending) and the next onLoaded fires. Once per generation. UI thread. */
        public sealed class PrePushGate
        {
            private int loadedGen = int.MinValue;
            private int firedGen = int.MinValue;
            private bool pendingDrop = false;

            /** ixian:onload of the document with generation `gen` (read AFTER onLoaded's bump). True = schedule now. */
            public bool onLoaded(int gen)
            {
                loadedGen = gen;
                if (!pendingDrop)
                {
                    return false;
                }
                pendingDrop = false;
                return fire(gen);
            }

            /** ixian:bootDropped, read at generation `gen`. True = schedule now. */
            public bool onDropped(int gen)
            {
                if (loadedGen != gen || firedGen == gen)
                {
                    /* this document's onload has not arrived yet — or this generation already fired, so the drop is a NEW
                     * document's whose reload bumped nothing (e.g. a renderer restart): its onload fires */
                    pendingDrop = true;
                    return false;
                }
                return fire(gen);
            }

            private bool fire(int gen)
            {
                if (firedGen == gen)
                {
                    return false;
                }
                firedGen = gen;
                return true;
            }
        }

        // —— F7 part files ——
        public const string PartialFolder = ".partial";
        public static readonly TimeSpan PartialMaxAge = TimeSpan.FromHours(24);

        private static readonly Regex partLeaf = new Regex("^incoming-[0-9a-f]{32}\\.ixipart\\z", RegexOptions.CultureInvariant);

        /** A part file C# named (PhotoRules.partFileName with a Guid "N"): exact shape, lowercase hex, a leaf. */
        public static bool isPartLeaf(string? leaf)
        {
            return leaf != null && partLeaf.IsMatch(leaf);
        }

        /** A file in .partial whose last write is more than 24 h before `nowUtc` (a future time is not stale). */
        public static bool partialStale(DateTime lastWriteUtc, DateTime nowUtc)
        {
            return nowUtc - lastWriteUtc > PartialMaxAge;
        }

        /** ★ #46 r1 (M2): the ONE-TIME legacy root sweep is recorded by this marker file inside .partial (not a Preferences
         *  key: it lives and dies with the folder it describes). Its name is not a part-file shape, so no sweep deletes it. */
        public const string RootSweptMarker = ".root-swept";

        /** ★ #46 r1 (M2, SECURITY): a peer can NAME a file "incoming-<32 hex>.ixipart"; SafeFileName keeps it, so the stored
         *  leaf would look like C#'s own part file. Such a final leaf gets a "_" prefix — no received file is ever a part leaf. */
        public static string finalLeaf(string leaf)
        {
            return isPartLeaf(leaf) ? "_" + leaf : leaf;
        }

        /** ★ #46 r1 (N1): a file in .partial is deleted only when its leaf is a part-file shape and (staleOnly) it is older
         *  than 24 h. Delete downloads (staleOnly = false) takes every part file. */
        public static bool partialDeletes(string? leaf, DateTime lastWriteUtc, DateTime nowUtc, bool staleOnly)
        {
            return isPartLeaf(leaf) && (!staleOnly || partialStale(lastWriteUtc, nowUtc));
        }

        /** ★ #46 r1 (N1): a symlink / junction (FileAttributes.ReparsePoint — .NET reports it for a Unix symlink too) is
         *  never followed by a sweep. */
        public static bool isReparse(System.IO.FileAttributes a)
        {
            return (a & System.IO.FileAttributes.ReparsePoint) != 0;
        }

        // —— F7 avatars ——
        public const int MaxAvatarEntries = 256;
        public const int MaxAvatarUriChars = 200000;

        private static readonly Regex avatarUri = new Regex("^data:image/(png|jpeg|webp);base64,", RegexOptions.CultureInvariant);

        /** The value C# may push for a sender (the shell checks the same): a png / jpeg / webp data: URI ≤ 200 000 chars.
         *  A sentinel ("img/…"), a raw path (imageToDataUri's miss), a remote URL or a gif → false (that sender is skipped). */
        public static bool avatarUriOk(string? uri)
        {
            return uri != null && uri.Length <= MaxAvatarUriChars && avatarUri.IsMatch(uri);
        }
    }
}
