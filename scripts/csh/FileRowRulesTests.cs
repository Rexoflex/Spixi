// ★ #1177 / #1178 — the file-row transfer state and the file-offer notification copy (Spixi/Utils/FileRowRules.cs),
// EXECUTED. The call sites (SingleChatPage.incomingTransferArg, Node.fileOfferNotificationText) are MAUI-bound;
// scripts/pins-s6/cs.mjs pins that each site calls these rules.
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class FileRowRulesTests
{
    [TestMethod]
    public void percent_is_request_file_data_formula()
    {
        // 100 packets of 1000 bytes: lastPacket = the NEXT packet asked for → (n - 1) * 100 / 100
        Assert.AreEqual(0, FileRowRules.receivedPercent(0, 100000, 1000), "packet 0");
        Assert.AreEqual(0, FileRowRules.receivedPercent(1, 100000, 1000));
        Assert.AreEqual(41, FileRowRules.receivedPercent(42, 100000, 1000));
        Assert.AreEqual(99, FileRowRules.receivedPercent(100, 100000, 1000));
        Assert.AreEqual(99, FileRowRules.receivedPercent(500, 100000, 1000), "never 100 while listed");
        Assert.AreEqual(0, FileRowRules.receivedPercent(5, 500, 1000), "a file under one packet");
        Assert.AreEqual(0, FileRowRules.receivedPercent(5, 100000, 0), "no packet size");
        Assert.AreEqual(50, FileRowRules.receivedPercent(3, 4000, 1000), "(3 - 1) * 100 / 4");
    }

    [TestMethod]
    public void transfer_arg_live_paused_or_nothing()
    {
        long now = 100000;
        Assert.AreEqual("live:41", FileRowRules.transferStateArg(true, false, true, true, 42, 100000, 1000, now - 2, now));
        Assert.AreEqual("live:41", FileRowRules.transferStateArg(true, false, true, true, 42, 100000, 1000, now - FileRowRules.PausedAfterSeconds, now), "exactly N s = still live");
        Assert.AreEqual("paused:41", FileRowRules.transferStateArg(true, false, true, true, 42, 100000, 1000, now - FileRowRules.PausedAfterSeconds - 1, now));
        Assert.AreEqual("paused:0", FileRowRules.transferStateArg(true, false, true, true, 0, 100000, 1000, now - 600, now), "accepted, no packet yet, stalled");
        Assert.AreEqual("", FileRowRules.transferStateArg(false, false, true, true, 42, 100000, 1000, now - 2, now), "outgoing");
        Assert.AreEqual("", FileRowRules.transferStateArg(true, true, true, true, 42, 100000, 1000, now - 2, now), "completed");
        Assert.AreEqual("", FileRowRules.transferStateArg(true, false, false, true, 42, 100000, 1000, now - 2, now), "no transfer");
        Assert.AreEqual("", FileRowRules.transferStateArg(true, false, true, false, 0, 100000, 1000, 0, now), "an offer not accepted: stays the offer");
        Assert.AreEqual("", FileRowRules.transferStateArg(true, false, true, true, 0, 100000, 1000, 0, now), "no activity stamp");
        Assert.IsTrue(FileRowRules.PausedAfterSeconds > 0 && FileRowRules.PausedAfterSeconds < 60, "below Config.packetRequestTimeout (60 s)");
    }

    [TestMethod]
    public void offer_notification_key()
    {
        string? arg;
        Assert.AreEqual("notification-file", FileRowRules.fileNotificationKey(false, false, true, "", out arg)); Assert.IsTrue(arg == null, "no {0} value");
        Assert.AreEqual("notification-photo", FileRowRules.fileNotificationKey(true, false, true, "", out arg)); Assert.IsTrue(arg == null, "no {0} value");
        Assert.AreEqual("notification-file-group", FileRowRules.fileNotificationKey(false, true, true, "Ann", out arg)); Assert.AreEqual("Ann", arg);
        Assert.AreEqual("notification-photo-group", FileRowRules.fileNotificationKey(true, true, true, " Ann ", out arg)); Assert.AreEqual("Ann", arg);
        Assert.AreEqual("notification-file-neutral", FileRowRules.fileNotificationKey(false, true, true, "", out arg), "a member with no name"); Assert.IsTrue(arg == null, "no {0} value");
        Assert.AreEqual("notification-photo-neutral", FileRowRules.fileNotificationKey(true, true, true, new string('A', 40), out arg), "an address as a nick"); Assert.IsTrue(arg == null, "no {0} value");
        Assert.AreEqual("notification-file-neutral", FileRowRules.fileNotificationKey(false, false, false, "", out arg), "pref off, 1:1"); Assert.IsTrue(arg == null, "no {0} value");
        Assert.AreEqual("notification-photo-neutral", FileRowRules.fileNotificationKey(true, true, false, "Ann", out arg), "pref off: the member is a sender name too"); Assert.IsTrue(arg == null, "no {0} value");
    }

    [TestMethod]
    public void member_name_sanitized_and_capped()
    {
        // ★ #46 F1-3: a peer-controlled nickname in an OS notification
        string? arg;
        Assert.AreEqual("notification-file-group", FileRowRules.fileNotificationKey(false, true, true, "Ann\nYour bank", out arg));
        Assert.AreEqual("AnnYour bank", arg, "newline stripped");
        Assert.AreEqual("notification-file-group", FileRowRules.fileNotificationKey(false, true, true, "Ann\u202Eelif a\u202C", out arg));
        Assert.AreEqual("Annelif a", arg, "RLO / PDF stripped");
        Assert.AreEqual("Ann x", FileRowRules.memberNameForNotification("\u2066\u200EAnn\u200F\u061C x\u2069\t"), "isolates, marks, ALM, tab");
        Assert.AreEqual("notification-photo-neutral", FileRowRules.fileNotificationKey(true, true, true, "\u202E\n\u200E ", out arg), "nothing left → neutral");
        Assert.IsTrue(arg == null, "no {0} value");
        string longName = "Ann " + new string('b', 29);   // 33 chars, a space: usable, capped
        Assert.AreEqual(33, longName.Length);
        Assert.AreEqual("notification-file-group", FileRowRules.fileNotificationKey(false, true, true, longName, out arg));
        Assert.AreEqual(longName.Substring(0, 32) + "…", arg, "33 chars → 32 + …");
        Assert.AreEqual(32, FileRowRules.MaxMemberNameChars);
        string exact = "Ann " + new string('b', 28);   // 32 chars: not capped
        Assert.AreEqual(exact, FileRowRules.memberNameForNotification(exact));
        // the address-like threshold (SNotificationPrefs.displayNameFor: Length > 24 && no space)
        Assert.IsTrue(FileRowRules.usableMemberName(new string('a', 24)), "24 chars, no space: usable");
        Assert.IsFalse(FileRowRules.usableMemberName(new string('a', 25)), "25 chars, no space: address-like");
        Assert.IsTrue(FileRowRules.usableMemberName("Ann " + new string('b', 26)), "30 chars with a space: usable");
        Assert.IsFalse(FileRowRules.usableMemberName("\u202E" + new string('a', 25) + "\u202C"), "the test runs on the sanitized name");
        Assert.AreEqual("Ann x", FileRowRules.memberNameForNotification("Ann\u2028\u2029\u200B\u200D\u2060\uFEFF x"), "#46 r2 (4): line / paragraph separators and Cf format chars stripped");
    }

    [TestMethod]
    public void offer_notification_text_never_says_received()
    {
        foreach (string k in new[] { "notification-file", "notification-photo", "notification-file-group", "notification-photo-group", "notification-file-neutral", "notification-photo-neutral" })
        {
            Assert.IsFalse(FileRowRules.fileNotificationFallback(k).ToLowerInvariant().Contains("received"), k);
        }
        Assert.AreEqual("Sent you a file", FileRowRules.fileNotificationText("notification-file", null, null), "a locale without the key");
        Assert.AreEqual("Ann sent a photo", FileRowRules.fileNotificationText("notification-photo-group", null, "Ann"));
        Assert.AreEqual("Ann hat eine Datei gesendet", FileRowRules.fileNotificationText("notification-file-group", "{0} hat eine Datei gesendet", "Ann"));
        Assert.AreEqual("Ann sent a file", FileRowRules.fileNotificationText("notification-file-group", "{1} broken", "Ann"), "a template without {0} → English");
        Assert.AreEqual("x {0 y", FileRowRules.fileNotificationText("notification-file", "x {0 y", null), "a stray brace never throws");
        Assert.AreEqual("New photo", FileRowRules.fileNotificationText("notification-photo-neutral", "", null));
    }

    // ★ #1190 (#1173 (4)): which case a sent file's stored path is — the words the dev [P1] filelocal line logs.
    [TestMethod]
    public void local_path_case_words()
    {
        string cache = "/data/user/0/com.ixian.spixi/cache";
        Assert.AreEqual("exists", FileRowRules.localPathCase("/document/image:12", true, cache), "resolved wins");
        Assert.AreEqual("none", FileRowRules.localPathCase("", false, cache));
        Assert.AreEqual("none", FileRowRules.localPathCase(null, false, cache));
        Assert.AreEqual("bare", FileRowRules.localPathCase("Screenshot_1.png", false, cache), "the live insert / a legacy rebuild");
        Assert.AreEqual("content-uri", FileRowRules.localPathCase("content://media/external/images/media/12", false, cache));
        Assert.AreEqual("content-uri", FileRowRules.localPathCase("/document/image:12", false, cache), "the PHOTO button's uri.Path");
        Assert.AreEqual("content-uri", FileRowRules.localPathCase("/external/images/media/12", false, cache));
        Assert.AreEqual("content-uri", FileRowRules.localPathCase("/picker/0/com.android.providers.media.photopicker/media/1000", false, cache));
        Assert.AreEqual("content-uri", FileRowRules.localPathCase("/-1/1/content%3A%2F%2Fmedia/ORIGINAL/NONE/image%2Fpng/1", false, cache));
        Assert.AreEqual("cache-missing", FileRowRules.localPathCase(cache + "/2203693cc04e0be7f4f024d5f9499e13/ab/Screenshot_1.png", false, cache), "the FILE button's cache copy");
        Assert.AreEqual("cache-missing", FileRowRules.localPathCase(cache + "/x.png", false, cache + "/"), "a trailing slash on the cache dir");
        Assert.AreEqual("missing", FileRowRules.localPathCase(cache + "x/y.png", false, cache), "a sibling of the cache dir is not inside it");
        Assert.AreEqual("missing", FileRowRules.localPathCase("/storage/emulated/0/Pictures/Screenshots/Screenshot_1.png", false, cache));
        Assert.AreEqual("missing", FileRowRules.localPathCase("/storage/emulated/0/x.png", false, null), "no cache dir known");
        Assert.AreEqual("missing", FileRowRules.localPathCase("C:\\Users\\d\\Pictures\\a.png", false, "C:\\Users\\d\\AppData\\Local\\Cache"));
        Assert.AreEqual("cache-missing", FileRowRules.localPathCase("C:\\Users\\d\\AppData\\Local\\Cache\\a.png", false, "C:\\Users\\d\\AppData\\Local\\Cache"));
        Assert.AreEqual("missing", FileRowRules.localPathCase("\\\\server\\share\\a.png", false, cache), "UNC");
        Assert.IsTrue(FileRowRules.looksAbsolute("D:/x.png"));
        Assert.IsFalse(FileRowRules.looksAbsolute("x.png"));
        Assert.IsFalse(FileRowRules.looksAbsolute("C:x.png"), "drive-relative is not absolute");
    }

    // ★ #1190 (#1173 (3) + (4)): addFile's 16th argument and the deleted-received rule.
    [TestMethod]
    public void local_arg_and_deleted_received()
    {
        // my own file: present / gone / unknown
        Assert.AreEqual("1", FileRowRules.localArg(true, true, "exists"));
        Assert.AreEqual("", FileRowRules.localArg(true, false, "exists"), "#46 r4 m1: sending — not complete, no disk check");
        Assert.AreEqual("", FileRowRules.localArg(true, false, "missing"), "#46 r4 m1: sending — a gone original says nothing until complete");
        Assert.AreEqual("0", FileRowRules.localArg(true, true, "content-uri"));
        Assert.AreEqual("0", FileRowRules.localArg(true, true, "cache-missing"));
        Assert.AreEqual("0", FileRowRules.localArg(true, true, "missing"));
        Assert.AreEqual("", FileRowRules.localArg(true, false, "bare"), "the live insert before onSendFile sets the path");
        Assert.AreEqual("", FileRowRules.localArg(true, true, "bare"), "a legacy rebuild: unknown, today's row");
        Assert.AreEqual("", FileRowRules.localArg(true, true, "none"));
        // a received file: only once downloaded
        Assert.AreEqual("", FileRowRules.localArg(false, false, "missing"), "an offer / a download in flight: nothing expected");
        Assert.AreEqual("", FileRowRules.localArg(false, false, "exists"));
        Assert.AreEqual("1", FileRowRules.localArg(false, true, "exists"));
        Assert.AreEqual("0", FileRowRules.localArg(false, true, "missing"));
        Assert.AreEqual("", FileRowRules.localArg(false, true, "bare"));
        Assert.IsTrue(FileRowRules.isDeletedReceived(false, true, "0"));
        Assert.IsFalse(FileRowRules.isDeletedReceived(true, true, "0"), "my own file is never 'deleted' (not available)");
        Assert.IsFalse(FileRowRules.isDeletedReceived(false, false, "0"), "never downloaded");
        Assert.IsFalse(FileRowRules.isDeletedReceived(false, true, "1"));
        Assert.IsFalse(FileRowRules.isDeletedReceived(false, true, ""), "unknown is not deleted");
    }
}
