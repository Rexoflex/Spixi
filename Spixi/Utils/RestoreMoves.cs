// ★ S15 (#1297) — THE ACCOUNT RESTORE'S FILE MOVES, ALL OR NOTHING.
// The S14 walk (android-s14.txt 13:09:42): a restore with the CORRECT password threw
// `IO_FileExists … avatar.jpg` AFTER it had already replaced `Acc` and moved `account.ixi` → a half restore; every
// later try then threw `IO_FileExists … account.ixi` and showed the "check the free space" alert (the wrong reason).
// This class owns the moves so a restore can only end in two states: everything moved, or nothing changed.
//   1. plan()  — the four targets (Acc tree, account.ixi, the own avatar, wallet.ixi) from the extraction folder.
//   2. apply() — preflight first: an existing wallet target is a CONFLICT (never cleared, nothing touched — the
//      caller says "an account already exists", not "free space"). Every other stale target (a leftover
//      account.ixi / avatar / Acc from a half restore or an old wipe) is PARKED in a stash folder, not deleted,
//      so a failure can put it back. Then the moves run in order; any throw rolls back what moved (reverse
//      order) and un-parks what was parked. On success the stash is deleted.
// ★ S15 #46 r1 (MINOR-1): the own avatar comes ONLY from the entry `own_avatar.jpg` (BackupPage packs the real avatar
//   under it). A legacy backup's `avatar.jpg` is the root file only a restore ever wrote (stale, a removed avatar, another
//   account's); it is IGNORED, as before S15 (it was never shown) — Core serves the own avatar to peers.
// ★ S15 #46 r1 (NIT-1): an optional item ABSENT from the backup still parks its stale dst — the restored account must not
//   inherit another account's Acc / account.ixi / avatar.
// ★ S15 #46 r1 (NIT-2): preflight checks the KIND too — a file item needs a file src, a dir item a dir src ("BadEntry").
// ★ S15 #46 r1 (MINOR-2): the rollback tracks every undo; the stash is deleted only when all of them succeeded, else it
//   is KEPT and the result is Failed / "RollbackIncomplete" (a later restore or the account wipe clears it).
// ★ S15 #46 r1 (NIT-5): Done means "the files are in place" — nothing more. The caller's applyRestorePrefs / loadWallet
//   run AFTER this boundary and are not rolled back by it (LaunchPage.restoreAccountFile, restoreCommitted).
// Pure System.IO — no MAUI, no Core — so the C# harness runs it against a real temp folder (scripts/csh/S15RestoreTests.cs).
// Logging: the caller logs the exception TYPE only (paths carry the address).
// ★ S20G P0 (flag SpixiFlags.S20G, OFF = all of the above unchanged): a restore NEVER destroys the contact list it
//   replaces. Damir's PC (2026-10-14): wallet.ixi renamed away → the welcome screen → a restore parked the live Acc tree
//   (25 contacts) + account.ixi in the stash and Done deleted it — 20 contacts gone for good. With keepStash, apply()
//   deletes only an EMPTY stash; the caller renames a non-empty one to `restore-previous/<yyyyMMdd-HHmmss>` in the user
//   folder (keepPrevious, AFTER Done — the all-or-nothing boundary is unchanged), and the account wipe deletes those
//   folders (S20GRules.keptFolders). The parked entries keep their own names there (Acc, account.ixi, avatar.jpg), so a
//   kept list can be put back by hand.
// ★ S20G #46 r1 (A-2): ONE fixed parent `restore-previous/` — one Android backup / device-transfer exclusion and one iOS /
//   Mac backup flag cover every kept list (the Android rules have no wildcards). (A-1) a leftover stash that cannot be
//   kept (a held handle, an unreadable Acc) no longer blocks the restore: it parks into a fresh `restore-previous/stash-
//   <stamp>` instead (S20GRules.chooseStash), kept on Done like the normal one.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;

namespace SPIXI
{
    public static class RestoreMoves
    {
        public enum Result { Done, WalletConflict, Failed }
        /** ★ S15 #46 r1/r2: the failType prefix of a rollback that could not undo everything (then "/" + the cause type). */
        public const string RollbackIncomplete = "RollbackIncomplete";

        public sealed class Item
        {
            public string src = "";
            public string dst = "";
            public bool dir;          // a directory tree (Acc), not a file
            public bool required;     // missing in the backup = the restore cannot run (wallet.ixi)
            public bool neverClear;   // an existing target is a conflict, never parked (wallet.ixi)
        }

        /** The backup entry that carries the REAL own avatar (★ S15 #46 r1 MINOR-1). The legacy root `avatar.jpg` entry is
         *  never read. */
        public const string OwnAvatarEntry = "own_avatar.jpg";

        /** The moves for one extracted account backup. `ownAvatarDest` is where the app READS the own avatar
         *  (Core `LocalStorage.getOwnAvatarPath(false)` = <user>/html/Avatars/avatar.jpg) — NOT the user-folder root,
         *  which only a restore ever wrote (legacy, baseline 0e85a4b8) and nothing ever read or deleted. */
        public static List<Item> plan(string tmpDir, string userFolder, string ownAvatarDest, string walletFileName)
        {
            return new List<Item>
            {
                new Item { src = Path.Combine(tmpDir, "Acc"), dst = Path.Combine(userFolder, "Acc"), dir = true },
                new Item { src = Path.Combine(tmpDir, "account.ixi"), dst = Path.Combine(userFolder, "account.ixi") },
                new Item { src = Path.Combine(tmpDir, OwnAvatarEntry), dst = ownAvatarDest },   // ★ S15 #46 r1 (MINOR-1): never the legacy "avatar.jpg" entry
                new Item { src = Path.Combine(tmpDir, walletFileName), dst = Path.Combine(userFolder, walletFileName), required = true, neverClear = true },
            };
        }

        static bool present(string path) => File.Exists(path) || Directory.Exists(path);

        static void movePath(string from, string to, bool dir)
        {
            string? parent = Path.GetDirectoryName(to);
            if (!string.IsNullOrEmpty(parent)) Directory.CreateDirectory(parent);
            if (dir) Directory.Move(from, to);
            else if (Directory.Exists(from)) Directory.Move(from, to);   // a parked target may be a folder where a file belongs
            else File.Move(from, to);
        }

        /** Test seam: called before each move with the move's index; a throw here is an injected IO failure. */
        internal static Action<int>? beforeMove = null;

        /** All or nothing. `failType` = the exception type name on Failed (for a type-only log line), else null. */
        public static Result apply(IReadOnlyList<Item> items, string stashDir, out string? failType)
            => apply(items, stashDir, false, out failType);

        /** ★ S20G P0: the failType when keepStash finds a NON-EMPTY stash before it starts (a killed run or a failed
         *  keepPrevious left it): nothing is touched — that stash may be the only copy of an earlier contact list. */
        public const string StashBusy = "StashBusy";

        /** ★ S20G P0: `keepStash` = never delete what was parked. On Done the stash is deleted only when EMPTY (the caller
         *  renames a non-empty one, keepPrevious); a non-empty stash found at the start is never deleted (StashBusy); the
         *  parked entries keep their own file names. false = the S15 behaviour exactly. */
        public static Result apply(IReadOnlyList<Item> items, string stashDir, bool keepStash, out string? failType)
        {
            failType = null;
            // ── preflight: nothing is touched before every check passed ──
            foreach (var it in items)
            {
                if (it.required && !present(it.src)) { failType = "MissingEntry"; return Result.Failed; }
                // ★ S15 #46 r1 (NIT-2): the src KIND must match the slot — a folder never moves into a file slot (nor back)
                if (present(it.src) && (it.dir ? !Directory.Exists(it.src) : !File.Exists(it.src))) { failType = "BadEntry"; return Result.Failed; }
                if (it.neverClear && present(it.dst)) return Result.WalletConflict;
            }
            if (keepStash)
            {
                bool busy;
                try { busy = Directory.Exists(stashDir) && !isEmptyDir(stashDir); } catch (Exception) { busy = true; }   // unreadable = keep it
                if (busy) { failType = StashBusy; return Result.Failed; }
            }
            var parked = new List<(string from, string to)>();   // dst → stash
            var moved = new List<(string from, string to, bool dir)>();   // src → dst
            try
            {
                if (Directory.Exists(stashDir)) Directory.Delete(stashDir, !keepStash);   // a killed earlier run (flag off: stale leftovers). ★ S20G r2 N-1: with keepStash only an EMPTY stash reaches here (preflight) — never recursive
                Directory.CreateDirectory(stashDir);
                for (int i = 0; i < items.Count; i++)
                {
                    var it = items[i];
                    beforeMove?.Invoke(i);
                    if (present(it.dst))   // ★ S15 #46 r1 (NIT-1): parked even when this backup has no such entry
                    {
                        string park = Path.Combine(stashDir, keepStash ? parkName(items, i) : i.ToString());
                        movePath(it.dst, park, Directory.Exists(it.dst));
                        parked.Add((it.dst, park));
                    }
                    if (!present(it.src)) continue;   // optional entry not in this backup (no avatar, no Acc): the slot stays empty
                    movePath(it.src, it.dst, it.dir);
                    moved.Add((it.src, it.dst, it.dir));
                }
            }
            catch (Exception e)
            {
                failType = e.GetType().Name;
                // roll back: the moved ones first (reverse), then un-park — ★ S15 #46 r1 (MINOR-2): every undo is counted
                bool allUndone = true;
                for (int i = moved.Count - 1; i >= 0; i--)
                {
                    try { movePath(moved[i].to, moved[i].from, moved[i].dir || Directory.Exists(moved[i].to)); } catch (Exception) { allUndone = false; }
                }
                for (int i = parked.Count - 1; i >= 0; i--)
                {
                    try { movePath(parked[i].to, parked[i].from, Directory.Exists(parked[i].to)); } catch (Exception) { allUndone = false; }
                }
                if (!allUndone)
                {
                    failType = RollbackIncomplete + "/" + e.GetType().Name;   // the stash KEEPS what could not go back; "rolled back" would be false · #46 r2: the cause type is kept
                    return Result.Failed;
                }
                // every undo ran, so the stash is empty; ★ S20G: with keepStash only an EMPTY one is ever deleted
                try { if (Directory.Exists(stashDir)) Directory.Delete(stashDir, !keepStash); } catch (Exception) { }
                return Result.Failed;
            }
            if (keepStash)
            {
                // ★ S20G P0: what was parked is the previous contact list — the caller keeps it (keepPrevious)
                try { if (isEmptyDir(stashDir)) Directory.Delete(stashDir, false); } catch (Exception) { }
                return Result.Done;
            }
            try { Directory.Delete(stashDir, true); } catch (Exception) { }   // the parked stale targets are gone for good now
            return Result.Done;
        }

        static bool isEmptyDir(string dir)
        {
            using (var e = Directory.EnumerateFileSystemEntries(dir).GetEnumerator()) return !e.MoveNext();
        }

        /** ★ S20G P0: a parked entry keeps its target's own name (Acc, account.ixi, avatar.jpg) so a kept list is readable
         *  and can be put back by hand; the slot index when two targets share a name. */
        static string parkName(IReadOnlyList<Item> items, int i)
        {
            string name = Path.GetFileName(items[i].dst);
            if (string.IsNullOrEmpty(name)) return i.ToString();
            for (int k = 0; k < items.Count; k++)
            {
                if (k != i && string.Equals(Path.GetFileName(items[k].dst), name, StringComparison.OrdinalIgnoreCase)) return i.ToString();
            }
            return name;
        }

        /** ★ S20G P0 (1): keep the previous contact list. A missing stash → null; an EMPTY stash is deleted → null; else
         *  the stash is RENAMED to S20GRules.keptFolderPath (restore-previous/<stamp>) and its path returned, with
         *  `contacts` = the contact folders in its Acc. Throws on an IO failure (the caller logs the TYPE and the stash
         *  stays where it is — never deleted). Run it AFTER apply's Done (and before an apply, for a stash a killed run or
         *  a failed rename left). */
        public static string? keepPrevious(string stashDir, string userFolder, DateTime now, out int contacts)
        {
            contacts = 0;
            if (!Directory.Exists(stashDir)) return null;
            if (isEmptyDir(stashDir)) { Directory.Delete(stashDir, false); return null; }
            string? kept = S20GRules.keptFolderPath(userFolder, now);
            if (kept == null) throw new IOException("no free name for the kept contact list");
            string acc = Path.Combine(stashDir, "Acc");
            if (Directory.Exists(acc)) contacts = Directory.GetDirectories(acc).Length;
            Directory.CreateDirectory(Path.Combine(userFolder, S20GRules.KeptParent));   // ★ #46 r1 (A-2): the one fixed parent
            Directory.Move(stashDir, kept);
            return kept;
        }
    }

    /** ★ S20G (2026-10-14): the pure rules of the S20G C# (flag SpixiFlags.S20G). In this file, beside the restore moves
     *  they extend, so the C# harness compiles them with RestoreMoves (scripts/csh/S20GRestoreTests.cs). */
    public static class S20GRules
    {
        /** ★ #46 r1 (A-2): the ONE fixed parent of every kept contact list, in the user folder — excluded from the Android
         *  cloud backup + device transfer (backup_rules.xml, data_extraction_rules.xml) and flagged excluded from the iOS /
         *  Mac backup (LaunchPage.excludeKeptFromBackup); the account wipe takes what is in it. */
        public const string KeptParent = "restore-previous";
        /** ★ #46 r1 (A-1): the name prefix of a fresh stash inside KeptParent (chooseStash). */
        public const string FreshStashPrefix = "stash-";
        const int MaxSuffix = 99;

        /** `[FLAGS] s20g=<0|1>` — fixed words, logged once per start (SpixiFlags.init). */
        public static string flagLine(bool on) => "[FLAGS] s20g=" + (on ? "1" : "0");

        /** ★ F-1: opening Account closes the open conversation(s) first (HomePage.onSettings) — a chat covered by the
         *  Account overlay must not count as displayed (Utils.getChatPage → UIHelpers.isChatScreenDisplayed: no unread
         *  count, a read receipt for a message nobody saw). OFF = the old path (the chat stays under Account). */
        public static bool closeChatOnAccount(bool flagOn) => flagOn;

        /** Test seam (C-m5): called first inside needsReplaceConfirm's try; a throw here is an unreadable folder. */
        internal static Action<string>? beforeProbe = null;

        /** ★ P0 (2): ask before a restore replaces contacts — true when the user folder still holds an `Acc` tree with at
         *  least one contact folder, or an `account.ixi` (the caller checks that no wallet is LOADED: the W14 guard).
         *  ★ #46 r1 (A-3): false while a wallet FILE is still on disk (a lockout → the welcome screen): the restore then
         *  ends in WalletConflict and replaces nothing, so the question would be false. A folder that cannot be read →
         *  true (asking is the safe side). */
        public static bool needsReplaceConfirm(string userFolder, string walletFileName)
        {
            try
            {
                beforeProbe?.Invoke(userFolder);
                string wallet = Path.Combine(userFolder, walletFileName);
                if (File.Exists(wallet) || Directory.Exists(wallet)) return false;
                if (File.Exists(Path.Combine(userFolder, "account.ixi"))) return true;
                string acc = Path.Combine(userFolder, "Acc");
                if (!Directory.Exists(acc)) return false;
                using (var e = Directory.EnumerateDirectories(acc).GetEnumerator()) return e.MoveNext();
            }
            catch (Exception)
            {
                return true;
            }
        }

        static string stamp(DateTime now) => now.ToString("yyyyMMdd-HHmmss", CultureInfo.InvariantCulture);

        /** `<stem>`, then `<stem>-2` … `-99` while taken; null when all are taken. */
        static string? freeName(string stem)
        {
            if (!File.Exists(stem) && !Directory.Exists(stem)) return stem;
            for (int n = 2; n <= MaxSuffix; n++)
            {
                string p = stem + "-" + n.ToString(CultureInfo.InvariantCulture);
                if (!File.Exists(p) && !Directory.Exists(p)) return p;
            }
            return null;
        }

        /** `restore-previous/<yyyyMMdd-HHmmss>` (local time, invariant digits), then `-2` … `-99` while taken; null when
         *  all are taken. */
        public static string? keptFolderPath(string userFolder, DateTime now)
            => freeName(Path.Combine(userFolder, KeptParent, stamp(now)));

        /** ★ #46 r1 (A-1): `restore-previous/stash-<yyyyMMdd-HHmmss>[-n]` — a fresh, unique stash; null when all are taken. */
        public static string? freshStashPath(string userFolder, DateTime now)
            => freeName(Path.Combine(userFolder, KeptParent, FreshStashPrefix + stamp(now)));

        /** ★ #46 r1 (A-1): the stash this restore parks into. The usual one when it is absent or EMPTY; a fresh unique one
         *  when a leftover (a killed run, a failed keep — a held handle, an unreadable Acc) is still in it or cannot be
         *  read, so RestoreMoves never answers StashBusy on the flag path and the leftover is never touched. Only when no
         *  fresh name is free (99 in one second) the usual one comes back (apply then refuses it: StashBusy). */
        public static string chooseStash(string userFolder, string usualStash, DateTime now)
        {
            try
            {
                if (!Directory.Exists(usualStash)) return usualStash;
                using (var e = Directory.EnumerateFileSystemEntries(usualStash).GetEnumerator()) { if (!e.MoveNext()) return usualStash; }
            }
            catch (Exception)
            {
            }
            return freshStashPath(userFolder, now) ?? usualStash;
        }

        /** `<8 digits>-<6 digits>` + an optional `-<2..99>`, ASCII digits only. */
        static bool isStampName(string t)
        {
            if (t.Length < 15 || t[8] != '-') return false;
            for (int i = 0; i < 15; i++) { if (i != 8 && (t[i] < '0' || t[i] > '9')) return false; }
            if (t.Length == 15) return true;
            if (t[15] != '-' || t.Length > 18 || t.Length < 17) return false;
            for (int i = 16; i < t.Length; i++) { if (t[i] < '0' || t[i] > '9') return false; }
            int n = int.Parse(t.Substring(16), CultureInfo.InvariantCulture);
            return n >= 2 && n <= MaxSuffix && t[16] != '0';
        }

        /** Exactly a name keptFolderPath makes inside KeptParent: 8 + 6 ASCII digits, an optional `-<2..99>`. */
        public static bool isKeptFolderName(string? name) => name != null && isStampName(name);

        /** Exactly a name freshStashPath makes inside KeptParent: `stash-` + a kept-folder name. */
        public static bool isFreshStashName(string? name)
            => name != null && name.StartsWith(FreshStashPrefix, StringComparison.Ordinal) && isStampName(name.Substring(FreshStashPrefix.Length));

        /** ★ P0 (3): every kept contact list folder — and every fresh stash a failed keep left — in restore-previous/ (for
         *  the account wipe). Exact names only. Never throws. */
        public static List<string> keptFolders(string userFolder)
        {
            var list = new List<string>();
            try
            {
                string parent = Path.Combine(userFolder, KeptParent);
                if (!Directory.Exists(parent)) return list;
                foreach (string d in Directory.EnumerateDirectories(parent))
                {
                    string name = Path.GetFileName(d);
                    if (isKeptFolderName(name) || isFreshStashName(name)) list.Add(d);
                }
            }
            catch (Exception)
            {
            }
            return list;
        }
    }
}
