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
using System;
using System.Collections.Generic;
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
            var parked = new List<(string from, string to)>();   // dst → stash
            var moved = new List<(string from, string to, bool dir)>();   // src → dst
            try
            {
                if (Directory.Exists(stashDir)) Directory.Delete(stashDir, true);   // a killed earlier run: no wallet is loaded, its leftovers are stale
                Directory.CreateDirectory(stashDir);
                for (int i = 0; i < items.Count; i++)
                {
                    var it = items[i];
                    beforeMove?.Invoke(i);
                    if (present(it.dst))   // ★ S15 #46 r1 (NIT-1): parked even when this backup has no such entry
                    {
                        string park = Path.Combine(stashDir, i.ToString());
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
                try { if (Directory.Exists(stashDir)) Directory.Delete(stashDir, true); } catch (Exception) { }
                return Result.Failed;
            }
            try { Directory.Delete(stashDir, true); } catch (Exception) { }   // the parked stale targets are gone for good now
            return Result.Done;
        }
    }
}
