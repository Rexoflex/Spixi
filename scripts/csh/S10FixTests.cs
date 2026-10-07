// ★ S10 agent B (#1254) — the pure rules of the S10 C# fix rows, EXECUTED:
//   · ChatHeal.isLive / deleteLeftLast(…, lastIsFileHeader, …) + newestLive with isLive (F3 — a deleted photo's excerpt)
//   · S10FixRules.groupIdOf / livePhotoCount / lastIndexOfId (F3 — "{n} photos" = the live members; #46 r1 M7 window + stop)
//   · S10FixRules.PrePushGate (F6 #46 r1 M4) · finalLeaf / partialDeletes / isReparse / RootSweptMarker (F7 #46 r1 M2 / M3 / N1)
//   · S10FixRules.walletPrePush / PrePushDelayMs (F6)
//   · S10FixRules.isPartLeaf / partialStale (F7 — the part-file sweep) · avatarUriOk (F7 — setDownloadAvatars)
//   · S9FixRules.createdLine(line1, line2) (P3 — the owner's two-line created line)
// The call sites are MAUI-bound (HomePage, CoreMessageWriter, UIHelpers, TransferManager, DownloadsIndex, SettingsPage).
using System;
using System.Collections.Generic;
using IXICore.Streaming;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class S10FixTests
{
    sealed class R
    {
        public byte[]? id; public FriendMessageType type; public string? text; public string gid;
        public R(int i, FriendMessageType t, string? x, string g = "") { id = BitConverter.GetBytes(i); type = t; text = x; gid = g; }
    }

    // —— F3 ——
    [TestMethod]
    public void is_live_blanked_text_and_file_rows_are_dead()
    {
        Assert.IsTrue(ChatHeal.isLive(FriendMessageType.standard, "hi"), "a text row with text → live");
        Assert.IsFalse(ChatHeal.isLive(FriendMessageType.standard, ""), "Core's text tombstone → dead");
        Assert.IsFalse(ChatHeal.isLive(FriendMessageType.standard, null), "no text → dead");
        Assert.IsTrue(ChatHeal.isLive(FriendMessageType.fileHeader, "uid:photo.jpg:123"), "a file row with its header → live");
        Assert.IsFalse(ChatHeal.isLive(FriendMessageType.fileHeader, ""), "a BLANKED file row (Core's delete) → dead — the F3 bug");
        Assert.IsTrue(ChatHeal.isLive(FriendMessageType.voiceCallEnd, ""), "an empty call row (a missed call) stays live (Core's rule)");
        Assert.IsTrue(ChatHeal.isLive(FriendMessageType.sentFunds, ""), "another event type with no text stays live");
    }

    [TestMethod]
    public void delete_left_last_sees_the_file_tombstone()
    {
        byte[] a = BitConverter.GetBytes(7), b = BitConverter.GetBytes(8);
        Assert.IsTrue(ChatHeal.deleteLeftLast(a, true, "", BitConverter.GetBytes(7)), "Core's recompute kept the blanked FILE row → replace it");
        Assert.IsTrue(ChatHeal.deleteLeftLast(a, false, "secret", a), "the F9 miss (text kept) → replace it, as before");
        Assert.IsTrue(ChatHeal.deleteLeftLast(a, true, "uid:x.jpg:1", a), "a file row with its header kept → replace it");
        Assert.IsFalse(ChatHeal.deleteLeftLast(a, false, "", a), "a blanked TEXT row → Core already recomputed it");
        Assert.IsFalse(ChatHeal.deleteLeftLast(a, true, "", b), "another id → nothing");
        Assert.IsFalse(ChatHeal.deleteLeftLast(null, true, "", a), "no saved id → nothing");
        Assert.IsFalse(ChatHeal.deleteLeftLast(a, true, "", null), "no deleted id → nothing");
        Assert.IsFalse(ChatHeal.deleteLeftLast(a, true, "", new byte[] { 7, 0, 0 }), "a shorter id is not the same id");
    }

    [TestMethod]
    public void newest_live_with_is_live_walks_past_blanked_files()
    {
        var list = new List<R> {
            new R(1, FriendMessageType.standard, "older text"),
            new R(2, FriendMessageType.fileHeader, ""),          // an older deleted photo
            new R(3, FriendMessageType.fileHeader, "uid:a.jpg:1"),
            new R(4, FriendMessageType.fileHeader, ""),          // the photo just deleted (Core blanked it)
        };
        Func<R, bool> live = m => ChatHeal.isLive(m.type, m.text);
        Assert.AreEqual(2, ChatHeal.newestLive(list, live, m => m.id, null), "the blanked newest file row is skipped");
        Assert.AreEqual(0, ChatHeal.newestLive(list, live, m => m.id, BitConverter.GetBytes(3)), "…and the deleted id, and the older blanked file");
        Assert.AreEqual(-1, ChatHeal.newestLive(new List<R> { new R(2, FriendMessageType.fileHeader, "") }, live, m => m.id, null), "only deleted rows → -1 (cleared)");
    }

    [TestMethod]
    public void live_photo_count_counts_live_members_of_the_same_group()
    {
        const string G = "0123456789abcdef", H = "fedcba9876543210";
        Assert.AreEqual(G, S10FixRules.groupIdOf(G + "|0|3|"), "the group id of a stored group string");
        Assert.AreEqual("", S10FixRules.groupIdOf("junk"), "an invalid group string → none");
        Assert.AreEqual("", S10FixRules.groupIdOf(null), "no group → none");
        var list = new List<R> {
            new R(1, FriendMessageType.fileHeader, "h", G),
            new R(2, FriendMessageType.fileHeader, "", G),       // a deleted member
            new R(3, FriendMessageType.fileHeader, "h", H),      // another group
            new R(4, FriendMessageType.standard, "caption", ""),
            new R(5, FriendMessageType.fileHeader, "h", G),
        };
        Func<R, bool> live = m => m.type == FriendMessageType.fileHeader && ChatHeal.isLive(m.type, m.text);
        int asked = 0;
        Func<R, string?> gidOf = m => { asked++; return m.gid; };
        Assert.AreEqual(2, S10FixRules.livePhotoCount(list, G, live, gidOf, -1, 30, 3), "3 members, 1 deleted → 2");
        Assert.AreEqual(3, asked, "a dead row / a text row costs no group lookup (isLive first)");
        Assert.AreEqual(1, S10FixRules.livePhotoCount(list, H, live, gidOf, -1, 30, 2), "the other group → 1 (\"Photo\")");
        Assert.AreEqual(0, S10FixRules.livePhotoCount(list, "", live, gidOf, -1, 30, 3), "no group id → 0");
        Assert.AreEqual(0, S10FixRules.livePhotoCount<R>(null, G, live, gidOf, -1, 30, 3), "no list → 0");
        Assert.AreEqual(0, S10FixRules.livePhotoCount(list, G, live, gidOf, -1, 30, 0), "no stored count → 0");
        Assert.AreEqual(30, S10FixRules.PhotoWindowRows, "the window");
    }

    /* ★ #46 r1 (M7): the walk is bounded — a window around the last message, and it stops at the group's count */
    [TestMethod]
    public void live_photo_count_window_and_early_stop()
    {
        const string G = "0123456789abcdef";
        var list = new List<R>();
        for (int i = 0; i < 100; i++)
        {
            list.Add(new R(i, FriendMessageType.fileHeader, "h", i >= 50 && i < 53 ? G : ""));
        }
        Func<R, bool> live = m => ChatHeal.isLive(m.type, m.text);
        int asked = 0;
        Func<R, string?> gidOf = m => { asked++; return m.gid; };
        Assert.AreEqual(3, S10FixRules.livePhotoCount(list, G, live, gidOf, 52, 30, 3), "anchor 52 ± 30 sees the 3 members");
        Assert.AreEqual(33, asked, "rows 82 → 50 asked, then STOP at 3 (rows 49 → 22 never asked)");
        asked = 0;
        Assert.AreEqual(0, S10FixRules.livePhotoCount(list, G, live, gidOf, 99, 30, 3), "the members outside the window → 0");
        Assert.AreEqual(31, asked, "the window bounds the walk (rows 99 → 69)");
        asked = 0;
        Assert.AreEqual(2, S10FixRules.livePhotoCount(list, G, live, gidOf, 52, 1, 3), "a window of 1 around 52 → rows 53, 52, 51");
        Assert.AreEqual(3, asked, "three rows asked");
        Assert.AreEqual(3, S10FixRules.livePhotoCount(list, G, live, gidOf, 500, 50, 3), "an anchor past the end → the end");
        Assert.AreEqual(52, S10FixRules.lastIndexOfId(list, BitConverter.GetBytes(52), m => m.id), "lastIndexOfId by value");
        Assert.AreEqual(-1, S10FixRules.lastIndexOfId(list, new byte[] { 52, 0, 0 }, m => m.id), "a shorter id is not the same id");
        Assert.AreEqual(-1, S10FixRules.lastIndexOfId<R>(list, null, m => m.id), "null id → -1");
        list.Add(new R(52, FriendMessageType.standard, "dup"));
        Assert.AreEqual(100, S10FixRules.lastIndexOfId(list, BitConverter.GetBytes(52), m => m.id), "searched from the END");
    }

    // —— F6 ——
    [TestMethod]
    public void wallet_pre_push_only_unfed_and_off_the_wallet_tab()
    {
        Assert.IsTrue(S10FixRules.walletPrePush(false, "tab1"), "never fed, on Chats → pre-push");
        Assert.IsTrue(S10FixRules.walletPrePush(false, "tab3"), "never fed, on Apps → pre-push");
        Assert.IsFalse(S10FixRules.walletPrePush(true, "tab1"), "already fed → nothing");
        Assert.IsFalse(S10FixRules.walletPrePush(false, "tab2"), "on the wallet tab → its own entry pushed");
        Assert.AreEqual(1200, S10FixRules.PrePushDelayMs, "PRE_PUSH_DELAY_MS");
    }

    /* ★ #46 r1 (M4): the pre-push fires after onload AND bootDropped — whichever is second — once per generation */
    [TestMethod]
    public void pre_push_gate_fires_on_the_second_event_once()
    {
        var g = new S10FixRules.PrePushGate();
        Assert.IsFalse(g.onLoaded(1), "onload first: wait for bootDropped");
        Assert.IsTrue(g.onDropped(1), "then bootDropped (same generation) → fire");
        Assert.IsFalse(g.onDropped(1), "a second drop of a fired generation never fires itself");
        Assert.IsTrue(g.onLoaded(2), "…it is held for the next onload (a new document whose reload bumped nothing) → fire");

        var r = new S10FixRules.PrePushGate();
        Assert.IsFalse(r.onDropped(0), "reduced motion: bootDropped BEFORE the onload (old generation) → held");
        Assert.IsTrue(r.onLoaded(1), "the onload (bumped generation) → fire — the M4 bug: this never fired");
        Assert.IsFalse(r.onLoaded(1), "the same generation never fires twice");
        Assert.IsFalse(r.onLoaded(2), "a new document's onload alone does not fire");
        Assert.IsTrue(r.onDropped(2), "its bootDropped does");

        var n = new S10FixRules.PrePushGate();
        Assert.IsFalse(n.onLoaded(5), "an old shell that never sends bootDropped → no pre-push (the tab entry pushes as today)");
        Assert.IsFalse(n.onLoaded(6), "still none");
    }

    // —— F7 ——
    /* ★ #46 r1 (M2, SECURITY): a peer-named "incoming-<hex>.ixipart" never lands as a part-file leaf */
    [TestMethod]
    public void final_leaf_is_never_a_part_leaf()
    {
        string part = "incoming-0123456789abcdef0123456789abcdef.ixipart";
        Assert.AreEqual("_" + part, S10FixRules.finalLeaf(part), "the peer's part-shaped name gets a '_' prefix");
        Assert.IsFalse(S10FixRules.isPartLeaf(S10FixRules.finalLeaf(part)), "…which is not a part leaf");
        Assert.AreEqual("photo.jpg", S10FixRules.finalLeaf("photo.jpg"), "every other name unchanged");
        Assert.AreEqual("incoming-x.ixipart", S10FixRules.finalLeaf("incoming-x.ixipart"), "not the exact shape → unchanged");
        Assert.IsFalse(S10FixRules.isPartLeaf(S10FixRules.RootSweptMarker), "the marker is never a part leaf (no sweep deletes it)");
        Assert.AreEqual(".root-swept", S10FixRules.RootSweptMarker, "the marker name");
    }

    /* ★ #46 r1 (N1 / M3): .partial deletes only part leaves; a linked folder is never followed */
    [TestMethod]
    public void partial_deletes_only_part_leaves_and_reparse_is_detected()
    {
        DateTime now = new DateTime(2026, 10, 7, 12, 0, 0, DateTimeKind.Utc);
        string part = "incoming-0123456789abcdef0123456789abcdef.ixipart";
        Assert.IsTrue(S10FixRules.partialDeletes(part, now.AddHours(-25), now, true), "a stale part → the start sweep deletes it");
        Assert.IsFalse(S10FixRules.partialDeletes(part, now.AddHours(-1), now, true), "a fresh part → kept by the start sweep");
        Assert.IsTrue(S10FixRules.partialDeletes(part, now.AddHours(-1), now, false), "Delete downloads → every part");
        Assert.IsFalse(S10FixRules.partialDeletes("notes.txt", now.AddHours(-99), now, false), "a non-part file → never");
        Assert.IsFalse(S10FixRules.partialDeletes(".root-swept", now.AddHours(-99), now, true), "the marker → never");
        Assert.IsFalse(S10FixRules.partialDeletes(null, now.AddHours(-99), now, false), "null → never");
        Assert.IsTrue(S10FixRules.isReparse(System.IO.FileAttributes.Directory | System.IO.FileAttributes.ReparsePoint), "a junction / symlink");
        Assert.IsFalse(S10FixRules.isReparse(System.IO.FileAttributes.Directory), "a plain folder");
    }

    [TestMethod]
    public void part_leaf_is_exactly_the_part_file_shape()
    {
        string n = Guid.NewGuid().ToString("N");
        Assert.IsTrue(S10FixRules.isPartLeaf(PhotoRules.partFileName(n)), "PhotoRules.partFileName's own output matches");
        Assert.IsTrue(S10FixRules.isPartLeaf("incoming-0123456789abcdef0123456789abcdef.ixipart"), "32 lowercase hex");
        Assert.IsFalse(S10FixRules.isPartLeaf("incoming-0123456789ABCDEF0123456789abcdef.ixipart"), "uppercase hex → no");
        Assert.IsFalse(S10FixRules.isPartLeaf("incoming-0123456789abcdef0123456789abcde.ixipart"), "31 hex → no");
        Assert.IsFalse(S10FixRules.isPartLeaf("incoming-0123456789abcdef0123456789abcdef.ixipart\n"), "a trailing newline → no (\\z)");
        Assert.IsFalse(S10FixRules.isPartLeaf("x-incoming-0123456789abcdef0123456789abcdef.ixipart"), "a prefix → no");
        Assert.IsFalse(S10FixRules.isPartLeaf("incoming-0123456789abcdef0123456789abcdef.ixipart.jpg"), "a suffix → no");
        Assert.IsFalse(S10FixRules.isPartLeaf("sub/incoming-0123456789abcdef0123456789abcdef.ixipart"), "a path → no");
        Assert.IsFalse(S10FixRules.isPartLeaf("photo.jpg"), "a user's file → no");
        Assert.IsFalse(S10FixRules.isPartLeaf(null), "null → no");
        Assert.AreEqual(".partial", S10FixRules.PartialFolder, "the folder");
    }

    [TestMethod]
    public void partial_stale_after_24_hours()
    {
        DateTime now = new DateTime(2026, 10, 7, 12, 0, 0, DateTimeKind.Utc);
        Assert.IsTrue(S10FixRules.partialStale(now.AddHours(-25), now), "25 h old → stale");
        Assert.IsFalse(S10FixRules.partialStale(now.AddHours(-23), now), "23 h old → kept");
        Assert.IsFalse(S10FixRules.partialStale(now.AddHours(-24), now), "exactly 24 h → kept (older than)");
        Assert.IsFalse(S10FixRules.partialStale(now.AddHours(2), now), "a future time → kept");
    }

    [TestMethod]
    public void avatar_uri_only_png_jpeg_webp_data_uris_within_the_cap()
    {
        Assert.IsTrue(S10FixRules.avatarUriOk("data:image/jpeg;base64,AAAA"), "jpeg");
        Assert.IsTrue(S10FixRules.avatarUriOk("data:image/png;base64,AAAA"), "png");
        Assert.IsTrue(S10FixRules.avatarUriOk("data:image/webp;base64,AAAA"), "webp");
        Assert.IsFalse(S10FixRules.avatarUriOk("data:image/gif;base64,AAAA"), "gif → no");
        Assert.IsFalse(S10FixRules.avatarUriOk("img/spixiavatar.png"), "a sentinel → no");
        Assert.IsFalse(S10FixRules.avatarUriOk("/data/user/0/x/Avatars/abc_128.jpg?t=3"), "a raw path (imageToDataUri's miss) → no");
        Assert.IsFalse(S10FixRules.avatarUriOk("https://example.com/a.jpg"), "a remote URL → no");
        Assert.IsFalse(S10FixRules.avatarUriOk(" data:image/png;base64,AAAA"), "anchored at the start");
        Assert.IsFalse(S10FixRules.avatarUriOk(null), "null → no");
        string big = "data:image/png;base64," + new string('A', S10FixRules.MaxAvatarUriChars);
        Assert.IsFalse(S10FixRules.avatarUriOk(big), "over 200 000 chars → no");
        Assert.IsTrue(S10FixRules.avatarUriOk(big.Substring(0, S10FixRules.MaxAvatarUriChars)), "exactly 200 000 chars → yes");
        Assert.AreEqual(256, S10FixRules.MaxAvatarEntries, "the entry cap");
    }

    // —— P3 ——
    [TestMethod]
    public void created_line_is_two_lines_with_fallbacks()
    {
        Assert.AreEqual("chat-group-members-see", S9FixRules.MembersSeeKey, "the key");
        Assert.AreEqual("You created this group\nMembers can see the group now.", S9FixRules.createdLine(null, null), "both missing → the English fallbacks");
        Assert.AreEqual("Du hast diese Gruppe erstellt\nDie Mitglieder können die Gruppe jetzt sehen.",
            S9FixRules.createdLine("Du hast diese Gruppe erstellt", "Die Mitglieder können die Gruppe jetzt sehen."), "both localized");
        Assert.AreEqual("A\nMembers can see the group now.", S9FixRules.createdLine("A", "  "), "a blank second line → its fallback");
        Assert.AreEqual("You created this group\nB", S9FixRules.createdLine("", "B"), "an empty first line → its fallback");
        Assert.AreEqual("{0}\n{1}", S9FixRules.createdLine("{0}", "{1}"), "never formatted");
    }
}
