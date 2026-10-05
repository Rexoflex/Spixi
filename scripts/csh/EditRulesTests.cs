// ★ #1199 (session 6b) — the edit rule (Spixi/Utils/EditRules.cs), EXECUTED: every condition of CONTRACT 1b and its
// edge (24 h, sequence 20, the newest 50, the size, the trim, unchanged). The `ixian:chatedit:` site is MAUI-bound;
// scripts/pins-s6b/cs.mjs pins that it re-checks here.
using IXICore.Streaming;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class EditRulesTests
{
    const long NOW = 1_000_000;
    // the happy path: my text, 1 h old, never edited, the newest, a new body
    static EditVerdict V(bool own = true, FriendMessageType type = FriendMessageType.standard, bool sys = false, string? stored = "old",
                         bool bot = false, long ts = NOW - 3600, int seq = 0, int newer = 0, string? body = "new", string? current = "old",
                         string? quote = null, int max = 64000)
        => EditRules.canEdit(own, type, sys, stored, bot, NOW, ts, seq, newer, body, current, quote, max);

    [TestMethod]
    public void happy_path_is_ok()
    {
        Assert.AreEqual(EditVerdict.ok, V(), "my recent text");
    }

    [TestMethod]
    public void only_my_own_standard_text_that_is_not_a_system_line_or_deleted_or_in_a_bot_room()
    {
        Assert.AreEqual(EditVerdict.notOwn, V(own: false), "a peer's message");
        Assert.AreEqual(EditVerdict.notText, V(type: FriendMessageType.fileHeader), "a file");
        Assert.AreEqual(EditVerdict.notText, V(type: FriendMessageType.sentFunds), "a payment");
        Assert.AreEqual(EditVerdict.notText, V(type: FriendMessageType.appSession), "an app card");
        Assert.AreEqual(EditVerdict.systemLine, V(sys: true), "the connected line");
        Assert.AreEqual(EditVerdict.deleted, V(stored: ""), "a deleted (blanked) row");
        Assert.AreEqual(EditVerdict.deleted, V(stored: null), "no stored text");
        Assert.AreEqual(EditVerdict.botRoom, V(bot: true), "a bot room");
    }

    [TestMethod]
    public void the_24h_edge_runs_from_the_last_edit()
    {
        Assert.AreEqual(EditVerdict.ok, V(ts: NOW - 86399), "86399 s → ok");
        Assert.AreEqual(EditVerdict.tooOld, V(ts: NOW - 86400), "exactly 24 h → refused");
        Assert.AreEqual(EditVerdict.tooOld, V(ts: NOW - 90000), "older");
        Assert.AreEqual(EditVerdict.ok, V(ts: NOW + 50), "a timestamp slightly in the future (clock) → ok");
    }

    [TestMethod]
    public void the_sequence_20_edge()
    {
        Assert.AreEqual(EditVerdict.ok, V(seq: 19), "sequence 19 → the 20th edit is allowed");
        Assert.AreEqual(EditVerdict.tooManyEdits, V(seq: 20), "sequence 20 → refused");
        Assert.AreEqual(EditVerdict.tooManyEdits, V(seq: 99), "more");
    }

    [TestMethod]
    public void the_depth_25_edge()
    {
        // #46 r1 A MINOR-1: a new-app receiver holds ~51 rows after an open (the load window REPLACES Core's list)
        Assert.AreEqual(EditVerdict.ok, V(newer: 24), "24 newer → among the newest 25");
        Assert.AreEqual(EditVerdict.notRecent, V(newer: 25), "25 newer → the 26th → refused");
        Assert.AreEqual(EditVerdict.notRecent, V(newer: -1), "not found in the channel (-1) → refused");
    }

    [TestMethod]
    public void the_new_body_trim_size_and_unchanged()
    {
        Assert.AreEqual(EditVerdict.bodyEmpty, V(body: " \t\r\n "), "whitespace only");
        Assert.AreEqual(EditVerdict.bodyEmpty, V(body: null), "null");
        Assert.AreEqual(EditVerdict.unchanged, V(body: "  old \n"), "the same body after the trim");
        Assert.AreEqual(EditVerdict.ok, V(body: "Old"), "case counts (ordinal)");
        Assert.AreEqual(EditVerdict.ok, V(body: new string('x', 100), max: 100), "exactly the max → ok");
        Assert.AreEqual(EditVerdict.tooLong, V(body: new string('x', 101), max: 100), "max + 1 → refused");
        Assert.AreEqual(EditVerdict.tooLong, V(body: new string('x', 90), quote: "> Ann: hi", max: 99), "the quote line + \\n count: 9 + 1 + 90 = 100 > 99");
        Assert.AreEqual(EditVerdict.ok, V(body: new string('x', 89), quote: "> Ann: hi", max: 99), "9 + 1 + 89 = 99 → ok");
    }

    [TestMethod]
    public void full_text_keeps_the_quote_line()
    {
        Assert.AreEqual("> Ann: hi\nnew", EditRules.fullText("> Ann: hi", "new"), "a matched reply keeps its quote");
        Assert.AreEqual("new", EditRules.fullText(null, "new"), "a plain text");
        Assert.AreEqual("new", EditRules.fullText("", "new"), "an empty quote line = none");
        Assert.AreEqual("a b", EditRules.trimBody("\n a b \t"), "onSend's trim set");
    }

    [TestMethod]
    public void edited_is_a_standard_message_with_a_moved_sequence()
    {
        Assert.IsTrue(EditRules.isEdited(FriendMessageType.standard, 1, false), "seq 1");
        Assert.IsFalse(EditRules.isEdited(FriendMessageType.standard, 0, false), "seq 0");
        Assert.IsFalse(EditRules.isEdited(FriendMessageType.fileHeader, 3, false), "a file is never 'edited'");
        Assert.IsFalse(EditRules.isEdited(FriendMessageType.standard, 4, true), "#46 r1 A MINOR-5: a bot room's stream raises the sequence — never 'edited'");
    }

}
