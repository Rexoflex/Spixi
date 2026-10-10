// ★ S15 (#1297) — the restore's moves, EXECUTED against a real temp folder (Spixi/Utils/RestoreMoves.cs).
// The exact S14 walk sequences: (1) a leftover own avatar at the target, (2) a half restore (Acc + account.ixi already
// in place) then a retry, (3) an IO failure in the middle rolls everything back, (4) an existing wallet is a conflict
// that touches nothing, (5) the avatar goes where the app reads it, never to the user-folder root.
// ★ S15 #46 r1: (MINOR-1) only the new "own_avatar.jpg" entry becomes the own avatar, a legacy "avatar.jpg" is ignored ·
// (NIT-1) an absent optional entry still clears its stale slot · (NIT-2) a src of the wrong KIND is "BadEntry", nothing
// touched · (MINOR-2) an undo that cannot run keeps the stash and says "RollbackIncomplete" · (R3 M2) a leftover stash
// from a killed run does not block the next restore.
using System;
using System.IO;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class S15RestoreTests
{
    static string root() { string r = Path.Combine(Path.GetTempPath(), "s15r-" + Guid.NewGuid().ToString("N")); Directory.CreateDirectory(r); return r; }
    static void put(string path, string text) { Directory.CreateDirectory(Path.GetDirectoryName(path)!); File.WriteAllText(path, text); }
    static string read(string path) => File.ReadAllText(path);

    // a backup extracted to <r>/user/tmp_zip, user folder <r>/user, own avatar at <r>/user/html/Avatars/avatar.jpg
    static (string user, string tmp, string avatar, string stash) layout(string r, bool withAvatar = true, bool withAcc = true, bool withAccount = true)
    {
        string user = Path.Combine(r, "user"), tmp = Path.Combine(user, "tmp_zip");
        if (withAcc) put(Path.Combine(tmp, "Acc", "ADDR", "contacts.dat"), "new-contacts");
        if (withAccount) put(Path.Combine(tmp, "account.ixi"), "new-account");
        if (withAvatar) put(Path.Combine(tmp, "own_avatar.jpg"), "new-avatar");   // ★ S15 #46 r1 (MINOR-1): the new entry name
        put(Path.Combine(tmp, "wallet.ixi"), "new-wallet");
        return (user, tmp, Path.Combine(user, "html", "Avatars", "avatar.jpg"), Path.Combine(user, "tmp_restore_prev"));
    }

    static RestoreMoves.Result run((string user, string tmp, string avatar, string stash) l, out string? why)
        => RestoreMoves.apply(RestoreMoves.plan(l.tmp, l.user, l.avatar, "wallet.ixi"), l.stash, out why);

    [TestMethod]
    public void clean_device_restores_everything_and_the_avatar_lands_where_the_app_reads_it()
    {
        var l = layout(root());
        Assert.AreEqual(RestoreMoves.Result.Done, run(l, out var why), "done (" + why + ")");
        Assert.AreEqual("new-wallet", read(Path.Combine(l.user, "wallet.ixi")));
        Assert.AreEqual("new-account", read(Path.Combine(l.user, "account.ixi")));
        Assert.AreEqual("new-contacts", read(Path.Combine(l.user, "Acc", "ADDR", "contacts.dat")));
        Assert.AreEqual("new-avatar", read(l.avatar), "the own avatar is at html/Avatars/avatar.jpg");
        Assert.IsFalse(File.Exists(Path.Combine(l.user, "avatar.jpg")), "never the user-folder root (legacy path nothing reads)");
        Assert.IsFalse(Directory.Exists(l.stash), "the stash is gone after success");
    }

    [TestMethod]
    public void s14_walk_leftover_avatar_no_longer_breaks_the_restore()
    {
        var l = layout(root());
        put(l.avatar, "old-avatar");                                  // survived an account delete
        put(Path.Combine(l.user, "avatar.jpg"), "legacy-root-avatar"); // the S14 file: untouched by the restore now
        Assert.AreEqual(RestoreMoves.Result.Done, run(l, out _));
        Assert.AreEqual("new-avatar", read(l.avatar));
        Assert.AreEqual("new-wallet", read(Path.Combine(l.user, "wallet.ixi")));
    }

    [TestMethod]
    public void s14_walk_half_restore_then_retry_succeeds()
    {
        var l = layout(root());
        put(Path.Combine(l.user, "account.ixi"), "half-account");                 // left by the half restore
        put(Path.Combine(l.user, "Acc", "OLD", "contacts.dat"), "half-contacts");
        Assert.AreEqual(RestoreMoves.Result.Done, run(l, out _), "the retry with the correct password works");
        Assert.AreEqual("new-account", read(Path.Combine(l.user, "account.ixi")));
        Assert.IsFalse(Directory.Exists(Path.Combine(l.user, "Acc", "OLD")), "the stale Acc tree is replaced, not merged");
        Assert.AreEqual("new-contacts", read(Path.Combine(l.user, "Acc", "ADDR", "contacts.dat")));
    }

    [TestMethod]
    public void a_failure_in_the_middle_rolls_everything_back()
    {
        var l = layout(root());
        put(Path.Combine(l.user, "account.ixi"), "stale-account");
        put(Path.Combine(l.user, "Acc", "OLD", "contacts.dat"), "stale-contacts");
        RestoreMoves.beforeMove = (i) => { if (i == 2) throw new IOException("injected at the avatar move"); };
        try
        {
            Assert.AreEqual(RestoreMoves.Result.Failed, run(l, out var why));
            Assert.AreEqual("IOException", why, "a type name only");
        }
        finally { RestoreMoves.beforeMove = null; }
        Assert.AreEqual("stale-account", read(Path.Combine(l.user, "account.ixi")), "the parked target is back");
        Assert.AreEqual("stale-contacts", read(Path.Combine(l.user, "Acc", "OLD", "contacts.dat")), "the parked tree is back");
        Assert.IsFalse(File.Exists(Path.Combine(l.user, "wallet.ixi")), "no wallet was moved");
        Assert.AreEqual("new-account", read(Path.Combine(l.tmp, "account.ixi")), "the moved file went back to the extraction folder");
        Assert.AreEqual("new-contacts", read(Path.Combine(l.tmp, "Acc", "ADDR", "contacts.dat")));
        Assert.IsFalse(Directory.Exists(l.stash));
    }

    [TestMethod]
    public void a_real_io_error_rolls_back_too()
    {
        var l = layout(root());
        put(Path.Combine(l.user, "html", "Avatars"), "a FILE where the avatar folder must be");   // CreateDirectory throws
        Assert.AreEqual(RestoreMoves.Result.Failed, run(l, out var why), "failed: " + why);
        Assert.IsFalse(File.Exists(Path.Combine(l.user, "account.ixi")), "account.ixi rolled back");
        Assert.IsFalse(Directory.Exists(Path.Combine(l.user, "Acc")), "Acc rolled back");
        Assert.IsFalse(File.Exists(Path.Combine(l.user, "wallet.ixi")));
    }

    [TestMethod]
    public void an_existing_wallet_is_a_conflict_and_nothing_moves()
    {
        var l = layout(root());
        put(Path.Combine(l.user, "wallet.ixi"), "live-wallet");
        put(Path.Combine(l.user, "account.ixi"), "live-account");
        Assert.AreEqual(RestoreMoves.Result.WalletConflict, run(l, out _));
        Assert.AreEqual("live-wallet", read(Path.Combine(l.user, "wallet.ixi")), "never cleared");
        Assert.AreEqual("live-account", read(Path.Combine(l.user, "account.ixi")), "preflight: nothing touched");
        Assert.IsFalse(Directory.Exists(Path.Combine(l.user, "Acc")));
        Assert.IsFalse(Directory.Exists(l.stash), "the stash is never made on a conflict");
    }

    [TestMethod]
    public void a_wallet_folder_from_a_crafted_backup_is_a_conflict_too()
    {
        var l = layout(root());
        Directory.CreateDirectory(Path.Combine(l.user, "wallet.ixi"));
        Assert.AreEqual(RestoreMoves.Result.WalletConflict, run(l, out _));
    }

    [TestMethod]
    public void optional_entries_may_be_missing_but_the_wallet_may_not()
    {
        var l = layout(root(), withAvatar: false, withAcc: false);
        Assert.AreEqual(RestoreMoves.Result.Done, run(l, out _));
        Assert.IsFalse(File.Exists(l.avatar), "no avatar in the backup = none made");
        Assert.AreEqual("new-wallet", read(Path.Combine(l.user, "wallet.ixi")));
        var m = layout(root());
        File.Delete(Path.Combine(m.tmp, "wallet.ixi"));
        put(Path.Combine(m.user, "account.ixi"), "keep");
        Assert.AreEqual(RestoreMoves.Result.Failed, run(m, out var why));
        Assert.AreEqual("MissingEntry", why);
        Assert.AreEqual("keep", read(Path.Combine(m.user, "account.ixi")), "a missing wallet entry touches nothing");
    }

    // ★ S15 #46 r1 (MINOR-1): a LEGACY backup carries the stale root avatar as "avatar.jpg" — never the own avatar now
    [TestMethod]
    public void a_legacy_avatar_entry_is_ignored_and_the_old_own_avatar_is_cleared()
    {
        var l = layout(root(), withAvatar: false);
        put(Path.Combine(l.tmp, "avatar.jpg"), "legacy-root-avatar");   // pre-S15 backup: the root file under the old name
        put(l.avatar, "previous-account-avatar");
        Assert.AreEqual(RestoreMoves.Result.Done, run(l, out var why), "done (" + why + ")");
        Assert.IsFalse(File.Exists(l.avatar), "the legacy entry is not placed, and the old own avatar is not inherited");
        Assert.IsFalse(File.Exists(Path.Combine(l.user, "avatar.jpg")), "nor written to the root");
    }

    // ★ S15 #46 r1 (NIT-1): optional entries absent from the backup still clear their stale slots
    [TestMethod]
    public void absent_optional_entries_clear_the_stale_slots()
    {
        var l = layout(root(), withAvatar: false, withAcc: false, withAccount: false);
        put(Path.Combine(l.user, "account.ixi"), "other-account");
        put(Path.Combine(l.user, "Acc", "OLD", "contacts.dat"), "other-contacts");
        put(l.avatar, "other-avatar");
        Assert.AreEqual(RestoreMoves.Result.Done, run(l, out var why), "done (" + why + ")");
        Assert.IsFalse(File.Exists(Path.Combine(l.user, "account.ixi")), "account.ixi not inherited");
        Assert.IsFalse(Directory.Exists(Path.Combine(l.user, "Acc")), "Acc not inherited");
        Assert.IsFalse(File.Exists(l.avatar), "avatar not inherited");
        Assert.AreEqual("new-wallet", read(Path.Combine(l.user, "wallet.ixi")));
        Assert.IsFalse(Directory.Exists(l.stash));
    }

    // ★ S15 #46 r1 (NIT-2): a src of the wrong KIND fails the preflight and touches nothing
    [TestMethod]
    public void a_folder_in_a_file_slot_or_a_file_in_the_acc_slot_is_a_bad_entry()
    {
        var l = layout(root(), withAccount: false);
        Directory.CreateDirectory(Path.Combine(l.tmp, "account.ixi", "x"));   // a crafted folder named account.ixi
        put(Path.Combine(l.user, "account.ixi"), "keep");
        Assert.AreEqual(RestoreMoves.Result.Failed, run(l, out var why));
        Assert.AreEqual("BadEntry", why);
        Assert.AreEqual("keep", read(Path.Combine(l.user, "account.ixi")), "preflight: nothing touched");
        Assert.IsFalse(File.Exists(Path.Combine(l.user, "wallet.ixi")));
        Assert.IsFalse(Directory.Exists(l.stash));

        var m = layout(root(), withAcc: false);
        put(Path.Combine(m.tmp, "Acc"), "a FILE named Acc");
        Assert.AreEqual(RestoreMoves.Result.Failed, run(m, out var why2));
        Assert.AreEqual("BadEntry", why2);
        Assert.IsFalse(File.Exists(Path.Combine(m.user, "wallet.ixi")));

        var n = layout(root());
        File.Delete(Path.Combine(n.tmp, "wallet.ixi"));
        Directory.CreateDirectory(Path.Combine(n.tmp, "wallet.ixi"));
        Assert.AreEqual(RestoreMoves.Result.Failed, run(n, out var why3));
        Assert.AreEqual("BadEntry", why3, "a folder named wallet.ixi in the backup");
        Assert.IsFalse(present(Path.Combine(n.user, "wallet.ixi")));
    }
    static bool present(string p) => File.Exists(p) || Directory.Exists(p);

    // ★ S15 #46 r1 (MINOR-2): an undo that cannot run keeps the stash and never claims "rolled back"
    [TestMethod]
    public void an_incomplete_rollback_keeps_the_stash_and_says_so()
    {
        var l = layout(root());
        put(Path.Combine(l.user, "account.ixi"), "stale-account");
        RestoreMoves.beforeMove = (i) =>
        {
            if (i == 3)
            {
                put(Path.Combine(l.tmp, "account.ixi"), "squatter");   // the moved account.ixi cannot go back to tmp
                throw new IOException("injected at the wallet move");
            }
        };
        try
        {
            Assert.AreEqual(RestoreMoves.Result.Failed, run(l, out var why));
            Assert.AreEqual("RollbackIncomplete/IOException", why, "the prefix + the cause type (#46 r2 M-1)");
        }
        finally { RestoreMoves.beforeMove = null; }
        Assert.AreEqual("stale-account", read(Path.Combine(l.stash, "1")), "the parked file it could not un-park is KEPT");
        Assert.IsFalse(File.Exists(Path.Combine(l.user, "wallet.ixi")));
    }

    // ★ S15 #46 r1 (R3 M2): a stash left by a killed run (a file and a folder) does not block the next restore
    [TestMethod]
    public void a_leftover_stash_from_a_killed_run_is_cleared()
    {
        var l = layout(root());
        put(Path.Combine(l.stash, "1"), "killed-run-account");
        put(Path.Combine(l.stash, "0", "x"), "killed-run-acc");
        put(Path.Combine(l.user, "account.ixi"), "stale-account");
        Assert.AreEqual(RestoreMoves.Result.Done, run(l, out var why), "done (" + why + ")");
        Assert.AreEqual("new-account", read(Path.Combine(l.user, "account.ixi")));
        Assert.AreEqual("new-wallet", read(Path.Combine(l.user, "wallet.ixi")));
        Assert.IsFalse(Directory.Exists(l.stash), "the stash is gone after success");
    }
}
