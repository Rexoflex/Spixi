// ★ S20G (P30) — the S20G pure rules, EXECUTED against a real temp folder (Spixi/Utils/RestoreMoves.cs: RestoreMoves
// keepStash / keepPrevious + S20GRules). Damir's PC (2026-10-14): wallet.ixi renamed away → a restore parked the live
// Acc tree (25 contacts) + account.ixi and Done DELETED the stash — 20 contacts gone for good.
// P0 (1) the stash is kept and renamed to restore-previous/<yyyyMMdd-HHmmss> (collision -2, -3), an empty one is deleted,
//   the parked entries keep their names, a leftover stash is never deleted (StashBusy), the flag-OFF path is S15 exactly;
// P0 (2) the ask-first predicate needsReplaceConfirm; P0 (3) the wipe pattern (keptFolders / isKeptFolderName);
// F-1 closeChatOnAccount; the [FLAGS] line.
// #46 r1: (A-1) a leftover that cannot be kept → a fresh stash (chooseStash), the restore runs, both lists survive;
// (A-2) one fixed parent restore-previous/; (A-3) no question while a wallet FILE is on disk; (C-m5) the catch path.
using System;
using System.IO;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class S20GRestoreTests
{
    static string root() { string r = Path.Combine(Path.GetTempPath(), "s20g-" + Guid.NewGuid().ToString("N")); Directory.CreateDirectory(r); return r; }
    static void put(string path, string text) { Directory.CreateDirectory(Path.GetDirectoryName(path)!); File.WriteAllText(path, text); }
    static string read(string path) => File.ReadAllText(path);
    static readonly DateTime T = new DateTime(2026, 10, 14, 21, 5, 9, DateTimeKind.Local);

    static (string user, string tmp, string avatar, string stash) layout(string r)
    {
        string user = Path.Combine(r, "user"), tmp = Path.Combine(user, "tmp_zip");
        put(Path.Combine(tmp, "Acc", "NEW1", "account.ixi"), "new-contact");
        put(Path.Combine(tmp, "account.ixi"), "new-account");
        put(Path.Combine(tmp, "own_avatar.jpg"), "new-avatar");
        put(Path.Combine(tmp, "wallet.ixi"), "new-wallet");
        return (user, tmp, Path.Combine(user, "html", "Avatars", "avatar.jpg"), Path.Combine(user, "tmp_restore_prev"));
    }
    // Damir's device: 25 contacts on disk, the wallet file gone
    static void liveContacts((string user, string tmp, string avatar, string stash) l, int n)
    {
        for (int i = 0; i < n; i++) put(Path.Combine(l.user, "Acc", "C" + i, "account.ixi"), "old-contact-" + i);
        put(Path.Combine(l.user, "account.ixi"), "old-account");
        put(l.avatar, "old-avatar");
    }
    static RestoreMoves.Result run((string user, string tmp, string avatar, string stash) l, bool keep, out string? why)
        => RestoreMoves.apply(RestoreMoves.plan(l.tmp, l.user, l.avatar, "wallet.ixi"), l.stash, keep, out why);

    [TestMethod]
    public void damirs_case_the_previous_contacts_are_kept_in_a_dated_folder()
    {
        var l = layout(root());
        liveContacts(l, 25);
        Assert.AreEqual(RestoreMoves.Result.Done, run(l, true, out var why), "done (" + why + ")");
        Assert.IsTrue(Directory.Exists(l.stash), "Done no longer deletes a non-empty stash (keepStash)");
        Assert.AreEqual("new-contact", read(Path.Combine(l.user, "Acc", "NEW1", "account.ixi")), "the restore itself is complete");
        Assert.AreEqual("new-wallet", read(Path.Combine(l.user, "wallet.ixi")));
        string? kept = RestoreMoves.keepPrevious(l.stash, l.user, T, out int contacts);
        Assert.AreEqual(Path.Combine(l.user, "restore-previous", "20261014-210509"), kept, "the dated name under the ONE fixed parent (A-2), local time, invariant digits");
        Assert.AreEqual(25, contacts, "the count for the log line = the contact folders kept");
        Assert.IsFalse(Directory.Exists(l.stash), "renamed, not copied");
        Assert.AreEqual("old-contact-24", read(Path.Combine(kept!, "Acc", "C24", "account.ixi")), "every contact folder survives");
        Assert.AreEqual("old-account", read(Path.Combine(kept!, "account.ixi")), "parked under its own name");
        Assert.AreEqual("old-avatar", read(Path.Combine(kept!, "avatar.jpg")));
        Assert.IsTrue(S20GRules.isKeptFolderName(Path.GetFileName(kept)), "the wipe recognises it");
    }

    [TestMethod]
    public void a_second_restore_in_the_same_second_gets_a_suffix()
    {
        var r = root();
        string user = Path.Combine(r, "user");
        string kp = Path.Combine(user, "restore-previous");
        Directory.CreateDirectory(Path.Combine(kp, "20261014-210509"));
        Directory.CreateDirectory(Path.Combine(kp, "20261014-210509-2"));
        Assert.AreEqual(Path.Combine(kp, "20261014-210509-3"), S20GRules.keptFolderPath(user, T));
        put(Path.Combine(user, "tmp_restore_prev", "Acc", "X", "a"), "x");
        string? kept = RestoreMoves.keepPrevious(Path.Combine(user, "tmp_restore_prev"), user, T, out int n);
        Assert.AreEqual(Path.Combine(kp, "20261014-210509-3"), kept);
        Assert.AreEqual(1, n);
        for (int i = 4; i <= 99; i++) Directory.CreateDirectory(Path.Combine(kp, "20261014-210509-" + i));
        Assert.AreEqual(null, S20GRules.keptFolderPath(user, T), "all names taken → null (keepPrevious then throws, the stash stays)");
        put(Path.Combine(user, "tmp_restore_prev", "account.ixi"), "y");
        bool threw = false;
        try { RestoreMoves.keepPrevious(Path.Combine(user, "tmp_restore_prev"), user, T, out _); } catch (IOException) { threw = true; }
        Assert.IsTrue(threw, "no free name = an IO failure for the caller to log by type");
        Assert.AreEqual("y", read(Path.Combine(user, "tmp_restore_prev", "account.ixi")), "the stash stays — never deleted");
    }

    [TestMethod]
    public void an_empty_stash_is_deleted_as_before_and_nothing_is_kept()
    {
        var l = layout(root());   // a clean device: nothing to park
        Assert.AreEqual(RestoreMoves.Result.Done, run(l, true, out _));
        Assert.IsFalse(Directory.Exists(l.stash), "an empty stash is deleted by apply (keepStash)");
        Assert.AreEqual(null, RestoreMoves.keepPrevious(l.stash, l.user, T, out int n), "no stash → nothing kept");
        Assert.AreEqual(0, n);
        Directory.CreateDirectory(l.stash);
        Assert.AreEqual(null, RestoreMoves.keepPrevious(l.stash, l.user, T, out _), "an empty stash → deleted, nothing kept");
        Assert.IsFalse(Directory.Exists(l.stash));
        Assert.AreEqual(0, S20GRules.keptFolders(l.user).Count, "no kept folder made");
        Assert.IsFalse(Directory.Exists(Path.Combine(l.user, "restore-previous")), "not even the parent");
    }

    [TestMethod]
    public void flag_off_is_the_s15_path_exactly()
    {
        var l = layout(root());
        liveContacts(l, 3);
        Assert.AreEqual(RestoreMoves.Result.Done, run(l, false, out _));
        Assert.IsFalse(Directory.Exists(l.stash), "OFF: the stash is deleted on Done (today's behaviour)");
        var m = layout(root());
        liveContacts(m, 3);
        Assert.AreEqual(RestoreMoves.Result.Done, RestoreMoves.apply(RestoreMoves.plan(m.tmp, m.user, m.avatar, "wallet.ixi"), m.stash, out _), "the S15 overload = keepStash false");
        Assert.IsFalse(Directory.Exists(m.stash));
    }

    [TestMethod]
    public void a_leftover_stash_is_never_deleted_by_a_keeping_restore()
    {
        var l = layout(root());
        liveContacts(l, 2);
        put(Path.Combine(l.stash, "0", "C9", "account.ixi"), "only-copy");   // a killed earlier run parked the only copy
        Assert.AreEqual(RestoreMoves.Result.Failed, run(l, true, out var why));
        Assert.AreEqual(RestoreMoves.StashBusy, why, "keepStash refuses a non-empty stash it did not make");
        Assert.AreEqual("only-copy", read(Path.Combine(l.stash, "0", "C9", "account.ixi")), "untouched");
        Assert.AreEqual("old-account", read(Path.Combine(l.user, "account.ixi")), "nothing moved");
        Assert.IsFalse(File.Exists(Path.Combine(l.user, "wallet.ixi")));
        // the caller keeps it FIRST (LaunchPage.keepPreviousContacts before apply) — then the restore runs
        string? first = RestoreMoves.keepPrevious(l.stash, l.user, T, out _);
        Assert.AreEqual("only-copy", read(Path.Combine(first!, "0", "C9", "account.ixi")));
        Assert.AreEqual(RestoreMoves.Result.Done, run(l, true, out _));
        string? second = RestoreMoves.keepPrevious(l.stash, l.user, T, out int n);
        Assert.AreEqual(first + "-2", second, "the same second → the -2 suffix");
        Assert.AreEqual(2, n);
        Assert.AreEqual(2, S20GRules.keptFolders(l.user).Count);
    }

    [TestMethod]
    public void a_failed_keeping_restore_still_rolls_everything_back()
    {
        var l = layout(root());
        liveContacts(l, 2);
        RestoreMoves.beforeMove = (i) => { if (i == 3) throw new IOException("injected at the wallet move"); };
        try { Assert.AreEqual(RestoreMoves.Result.Failed, run(l, true, out var why)); }
        finally { RestoreMoves.beforeMove = null; }
        Assert.AreEqual("old-contact-1", read(Path.Combine(l.user, "Acc", "C1", "account.ixi")), "all or nothing is unchanged (S15 #1297)");
        Assert.AreEqual("old-account", read(Path.Combine(l.user, "account.ixi")));
        Assert.AreEqual("old-avatar", read(l.avatar));
        Assert.IsFalse(Directory.Exists(l.stash), "the emptied stash is removed");
    }

    [TestMethod]
    public void ask_first_only_when_the_device_still_holds_contacts()
    {
        string user = Path.Combine(root(), "user");
        Assert.IsFalse(S20GRules.needsReplaceConfirm(user, "wallet.ixi"), "no user folder → no question");
        Directory.CreateDirectory(Path.Combine(user, "Acc"));
        Assert.IsFalse(S20GRules.needsReplaceConfirm(user, "wallet.ixi"), "an EMPTY Acc root (Core makes one) → no question");
        put(Path.Combine(user, "Acc", "stray.txt"), "a file, not a contact folder");
        Assert.IsFalse(S20GRules.needsReplaceConfirm(user, "wallet.ixi"), "only contact FOLDERS count");
        Directory.CreateDirectory(Path.Combine(user, "Acc", "C1"));
        Assert.IsTrue(S20GRules.needsReplaceConfirm(user, "wallet.ixi"), "one contact folder → ask");
        string other = Path.Combine(root(), "user");
        put(Path.Combine(other, "account.ixi"), "x");
        Assert.IsTrue(S20GRules.needsReplaceConfirm(other, "wallet.ixi"), "an account.ixi alone → ask");
        put(Path.Combine(other, "Acc"), "a FILE named Acc");
        Assert.IsTrue(S20GRules.needsReplaceConfirm(other, "wallet.ixi"), "still the account.ixi");
    }

    [TestMethod]
    public void the_wipe_pattern_takes_exactly_the_kept_folders()
    {
        Assert.IsTrue(S20GRules.isKeptFolderName("20261014-210509"));
        Assert.IsTrue(S20GRules.isKeptFolderName("20261014-210509-2"));
        Assert.IsTrue(S20GRules.isKeptFolderName("20261014-210509-99"));
        Assert.IsTrue(S20GRules.isFreshStashName("stash-20261014-210509"));
        Assert.IsTrue(S20GRules.isFreshStashName("stash-20261014-210509-7"));
        foreach (string? no in new[] { null, "", "2026101-210509", "20261014210509",
            "20261014-21050x", "20261014-210509-1", "20261014-210509-0",
            "20261014-210509-05", "20261014-210509-100", "20261014-210509-", "20261014-210509x",
            "２０261014-210509", "x20261014-210509", "restore-previous-20261014-210509", "stash-20261014-210509", "Acc", "tmp_restore_prev" })
        {
            Assert.IsFalse(S20GRules.isKeptFolderName(no), "not a kept folder: " + no);
        }
        foreach (string? no in new[] { null, "", "stash-", "Stash-20261014-210509", "stash-20261014-210509-1", "stash20261014-210509", "20261014-210509", "stash-mine" })
        {
            Assert.IsFalse(S20GRules.isFreshStashName(no), "not a fresh stash: " + no);
        }
        string user = Path.Combine(root(), "user");
        string kp = Path.Combine(user, "restore-previous");
        Directory.CreateDirectory(Path.Combine(kp, "20261014-210509"));
        Directory.CreateDirectory(Path.Combine(kp, "20261015-080000-2"));
        Directory.CreateDirectory(Path.Combine(kp, "stash-20261015-090000"));   // a fresh stash a failed keep left (A-1)
        Directory.CreateDirectory(Path.Combine(kp, "mine"));                    // not a name C# makes: kept
        Directory.CreateDirectory(Path.Combine(user, "20261014-210509"));       // the right name OUTSIDE the parent: kept
        Directory.CreateDirectory(Path.Combine(user, "Acc"));
        put(Path.Combine(kp, "20261016-080000"), "a FILE, not a folder");
        var found = S20GRules.keptFolders(user);
        found.Sort(StringComparer.Ordinal);
        Assert.AreEqual(3, found.Count, "exactly the two kept folders + the fresh stash, only inside restore-previous/");
        Assert.AreEqual(Path.Combine(kp, "20261014-210509"), found[0]);
        Assert.AreEqual(Path.Combine(kp, "20261015-080000-2"), found[1]);
        Assert.AreEqual(Path.Combine(kp, "stash-20261015-090000"), found[2]);
        Assert.AreEqual(0, S20GRules.keptFolders(Path.Combine(user, "missing")).Count, "never throws");
    }

    [TestMethod]
    public void a1_a_leftover_that_cannot_be_kept_parks_the_restore_into_a_fresh_stash()
    {
        var l = layout(root());
        liveContacts(l, 4);
        put(Path.Combine(l.stash, "Acc", "OLD9", "account.ixi"), "only-copy");   // a killed run's stash …
        string kp = Path.Combine(l.user, "restore-previous");
        Directory.CreateDirectory(Path.Combine(kp, "20261014-210509"));          // … whose keep fails before apply:
        for (int i = 2; i <= 99; i++) Directory.CreateDirectory(Path.Combine(kp, "20261014-210509-" + i));   // no free name = an IO throw
        bool threw = false;
        try { RestoreMoves.keepPrevious(l.stash, l.user, T, out _); } catch (IOException) { threw = true; }
        Assert.IsTrue(threw, "the keep before apply failed (stands in for a held handle / an unreadable Acc)");
        string chosen = S20GRules.chooseStash(l.user, l.stash, T);
        Assert.AreEqual(Path.Combine(kp, "stash-20261014-210509"), chosen, "a FRESH unique stash under the one parent");
        Assert.AreEqual(RestoreMoves.Result.Done, RestoreMoves.apply(RestoreMoves.plan(l.tmp, l.user, l.avatar, "wallet.ixi"), chosen, true, out var why),
            "the restore is NOT blocked — no StashBusy on the flag path (" + why + ")");
        Assert.AreEqual("new-contact", read(Path.Combine(l.user, "Acc", "NEW1", "account.ixi")));
        Assert.AreEqual("only-copy", read(Path.Combine(l.stash, "Acc", "OLD9", "account.ixi")), "the leftover is untouched");
        Assert.AreEqual("old-contact-3", read(Path.Combine(chosen, "Acc", "C3", "account.ixi")), "this restore's parked list is in the fresh stash");
        DateTime later = T.AddSeconds(1);
        string? kept = RestoreMoves.keepPrevious(chosen, l.user, later, out int n);   // kept on Done like the usual one
        Assert.AreEqual(Path.Combine(kp, "20261014-210510"), kept);
        Assert.AreEqual(4, n);
        Assert.IsFalse(Directory.Exists(chosen));
        Assert.AreEqual(1 + 98 + 1, S20GRules.keptFolders(l.user).Count, "the wipe sees every kept list");
        // the usual stash is chosen again once it is empty or gone
        Directory.Delete(l.stash, true);
        Assert.AreEqual(l.stash, S20GRules.chooseStash(l.user, l.stash, T), "absent → the usual stash");
        Directory.CreateDirectory(l.stash);
        Assert.AreEqual(l.stash, S20GRules.chooseStash(l.user, l.stash, T), "empty → the usual stash");
        // a fresh name taken in the same second → the suffix; all 99 taken → the usual one (apply then answers StashBusy)
        put(Path.Combine(l.stash, "account.ixi"), "x");
        Directory.CreateDirectory(Path.Combine(kp, "stash-20261014-210509"));
        Assert.AreEqual(Path.Combine(kp, "stash-20261014-210509-2"), S20GRules.chooseStash(l.user, l.stash, T));
        for (int i = 2; i <= 99; i++) Directory.CreateDirectory(Path.Combine(kp, "stash-20261014-210509-" + i));
        Assert.AreEqual(l.stash, S20GRules.chooseStash(l.user, l.stash, T));
    }

    [TestMethod]
    public void a3_no_question_while_a_wallet_file_is_still_on_disk()
    {
        string user = Path.Combine(root(), "user");
        put(Path.Combine(user, "Acc", "C1", "account.ixi"), "c");
        put(Path.Combine(user, "account.ixi"), "a");
        Assert.IsTrue(S20GRules.needsReplaceConfirm(user, "wallet.ixi"), "contacts, no wallet file → ask");
        put(Path.Combine(user, "wallet.ixi"), "w");   // the lockout → welcome case: the restore is a WalletConflict
        Assert.IsFalse(S20GRules.needsReplaceConfirm(user, "wallet.ixi"), "a wallet file on disk → no question (nothing is replaced)");
        File.Delete(Path.Combine(user, "wallet.ixi"));
        Directory.CreateDirectory(Path.Combine(user, "wallet.ixi"));
        Assert.IsFalse(S20GRules.needsReplaceConfirm(user, "wallet.ixi"), "a FOLDER at the wallet path is a conflict too (apply's present())");
        Assert.IsTrue(S20GRules.needsReplaceConfirm(user, "other.ixi"), "the caller's wallet name is the one checked");
    }

    [TestMethod]
    public void cm5_a_folder_that_cannot_be_read_asks()
    {
        string user = Path.Combine(root(), "user");
        put(Path.Combine(user, "wallet.ixi"), "w");   // would answer false if the probe ran
        S20GRules.beforeProbe = (_) => throw new UnauthorizedAccessException("injected");
        try { Assert.IsTrue(S20GRules.needsReplaceConfirm(user, "wallet.ixi"), "a throw → true (asking is the safe side)"); }
        finally { S20GRules.beforeProbe = null; }
        Assert.IsFalse(S20GRules.needsReplaceConfirm(user, "wallet.ixi"), "the seam cleared → the real answer");
    }

    [TestMethod]
    public void f1_and_the_flag_line()
    {
        Assert.IsTrue(S20GRules.closeChatOnAccount(true), "flag ON: Account closes the open conversation first");
        Assert.IsFalse(S20GRules.closeChatOnAccount(false), "flag OFF: the old path");
        Assert.AreEqual("[FLAGS] s20g=1", S20GRules.flagLine(true));
        Assert.AreEqual("[FLAGS] s20g=0", S20GRules.flagLine(false));
    }
}
