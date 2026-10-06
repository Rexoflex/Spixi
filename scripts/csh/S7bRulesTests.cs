// ★ 7b (session 7b) — the pure rules of the CS batch, EXECUTED:
//   · ChatHeal.healAt / indexOfId / eligible / deleteLeftLast / newestLive (#1223 F9 heal + #46 r1 — Spixi/Utils/ChatHeal.cs)
//   · ReplyQuote.bridgeName / bridgeText (#1215 the 1:1 sender marker · #1224 (6) the typed-word guard)
//   · DevLogTail.startOf / takeLines (#1222 the dev logcat mirror — Spixi/Utils/DevLogTail.cs, SPIXI_DEV_COEXIST)
//   · VoiceCodec.isSweepable (#1224 (8) the Voice-folder sweep)
// The call sites are MAUI-bound (SingleChatPage.loadMessages / insertMessage / updateMessage, App, Node, VoiceClips).
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using IXICore.Streaming;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

public sealed class HMsg
{
    public byte[]? id; public long ts;
    public HMsg(int n, long ts) { id = n < 0 ? null : BitConverter.GetBytes(n); this.ts = ts; }
}

[TestClass]
public class S7bRulesTests
{
    static int At(List<HMsg> list, HMsg? last, bool incoming = true, bool reaction = false, int lastCh = 0, int readCh = 0, string text = "hi", bool bot = false)
        => ChatHeal.healAt(list, last, ChatHeal.eligible(!incoming, reaction, text, bot, lastCh, readCh), m => m.id, m => m.ts);
    static List<HMsg> L(params (int n, long ts)[] rows) => rows.Select(r => new HMsg(r.n, r.ts)).ToList();

    // —— #1223 F9 heal ——
    [TestMethod]
    public void heal_puts_back_a_lost_incoming_tail()
    {
        var list = L((1, 100), (2, 101));
        Assert.AreEqual(2, At(list, new HMsg(3, 105)), "newer + missing + incoming + same channel → the end");
        Assert.AreEqual(2, At(list, new HMsg(3, 101)), "the SAME second as the newest row → after it (never before)");
        Assert.AreEqual(0, At(new List<HMsg>(), new HMsg(3, 105)), "an empty read → position 0 (the only message was lost)");
    }

    [TestMethod]
    public void heal_never_duplicates_and_never_reaches_back()
    {
        var list = L((1, 100), (2, 101));
        Assert.AreEqual(-1, At(list, new HMsg(2, 101)), "the id is already loaded → no heal (never a duplicate)");
        Assert.AreEqual(-1, At(list, new HMsg(2, 999)), "the id is loaded even with another time → no heal");
        Assert.AreEqual(-1, At(list, new HMsg(9, 100)), "older than the newest loaded row → history outside the window, not a loss");
    }

    [TestMethod]
    public void heal_only_for_an_incoming_non_reaction_of_the_read_channel()
    {
        var list = L((1, 100));
        Assert.AreEqual(-1, At(list, new HMsg(3, 105), incoming: false), "my own message → no heal");
        Assert.AreEqual(-1, At(list, new HMsg(3, 105), reaction: true), "a synthetic reaction excerpt → no heal");
        Assert.AreEqual(-1, At(list, new HMsg(3, 105), lastCh: 1, readCh: 0), "another channel → no heal");
        Assert.AreEqual(-1, At(list, null), "no saved last message → no heal");
        Assert.AreEqual(-1, At(list, new HMsg(-1, 105)), "a last message with no id → no heal");
        Assert.AreEqual(-1, ChatHeal.healAt<HMsg>(null, new HMsg(3, 105), true, m => m.id, m => m.ts), "no list → no heal");
    }

    // —— #46 r1 C09: the ONE predicate on the FriendMessage fields (CoreMessageWriter.healLast calls it) ——
    [TestMethod]
    public void heal_eligible_is_the_whole_predicate()
    {
        Assert.IsTrue(ChatHeal.eligible(false, false, "hi", false, 0, 0), "incoming, text, 1:1, same channel → yes");
        Assert.IsFalse(ChatHeal.eligible(true, false, "hi", false, 0, 0), "own (localSender) → no");
        Assert.IsFalse(ChatHeal.eligible(false, false, "hi", true, 0, 0), "a bot room → no");
        Assert.IsFalse(ChatHeal.eligible(false, false, "hi", false, 1, 0), "another channel → no");
        Assert.IsFalse(ChatHeal.eligible(false, true, "hi", false, 0, 0), "a reaction excerpt → no");
        Assert.IsFalse(ChatHeal.eligible(false, false, "", false, 0, 0), "Core's delete tombstone (blanked text) → no (A-MINOR-1)");
        Assert.IsFalse(ChatHeal.eligible(false, false, null, false, 0, 0), "no text → no");
        Assert.AreEqual(-1, At(L((1, 100)), new HMsg(3, 105), text: ""), "a tombstone is never healed back");
        Assert.AreEqual(-1, At(L((1, 100)), new HMsg(3, 105), bot: true), "a bot room is never healed");
    }

    // —— #46 r1 A-MINOR-1: a delete that missed (the F9 state) must not leave the deleted text in the saved excerpt ——
    [TestMethod]
    public void delete_left_last_only_for_the_same_id_with_its_text()
    {
        byte[] a = BitConverter.GetBytes(7), b = BitConverter.GetBytes(8);
        Assert.IsTrue(ChatHeal.deleteLeftLast(a, "secret", BitConverter.GetBytes(7)), "same id (by value) + text kept → replace it");
        Assert.IsFalse(ChatHeal.deleteLeftLast(a, "", a), "Core already blanked it (found + recomputed) → nothing to do");
        Assert.IsFalse(ChatHeal.deleteLeftLast(a, "x", b), "another message is the excerpt → nothing to do");
        Assert.IsFalse(ChatHeal.deleteLeftLast(null, "x", a), "no saved id → nothing");
        Assert.IsFalse(ChatHeal.deleteLeftLast(a, "x", null), "no deleted id → nothing");
        Assert.IsFalse(ChatHeal.deleteLeftLast(a, "x", new byte[] { 7, 0, 0 }), "a shorter id is not the same id");
    }

    [TestMethod]
    public void newest_live_skips_tombstones_and_the_deleted_id()
    {
        var list = L((1, 100), (2, 101), (3, 102));
        Func<HMsg, bool> live = m => BitConverter.ToInt32(m.id!, 0) != 2;   // row 2 = a tombstone
        Assert.AreEqual(2, ChatHeal.newestLive(list, live, m => m.id, null), "the newest live row");
        Assert.AreEqual(0, ChatHeal.newestLive(list, live, m => m.id, BitConverter.GetBytes(3)), "the deleted id and a tombstone are skipped");
        Assert.AreEqual(-1, ChatHeal.newestLive(L((2, 100)), live, m => m.id, null), "only tombstones → -1 (the excerpt is cleared)");
        Assert.AreEqual(-1, ChatHeal.newestLive<HMsg>(null, live, m => m.id, null), "no list → -1");
    }

    [TestMethod]
    public void heal_index_of_id_compares_bytes()
    {
        var list = L((1, 100), (2, 101));
        Assert.AreEqual(1, ChatHeal.indexOfId(list, BitConverter.GetBytes(2), m => m.id), "found by value, not by reference");
        Assert.AreEqual(-1, ChatHeal.indexOfId(list, new byte[] { 2, 0, 0 }, m => m.id), "a shorter id is not the same id");
        Assert.AreEqual(-1, ChatHeal.indexOfId(list, null, m => m.id), "null id → -1");
    }

    // —— #1215 / #1224 (6) the bridge args ——
    static ReplyQuote.Match M(string name, string text, bool matched = true, bool mine = false, FriendMessageType t = FriendMessageType.standard)
        => new ReplyQuote.Match { quoteName = name, quoteText = text, matched = matched, localSender = mine, targetType = t };

    [TestMethod]
    public void bridge_name_marks_a_nameless_1to1_match()
    {
        Assert.AreEqual("\u0001me", ReplyQuote.bridgeName(M("", "hi", mine: true), true), "1:1, my target → \\u0001me");
        Assert.AreEqual("\u0001peer", ReplyQuote.bridgeName(M("", "hi", mine: false), true), "1:1, the peer's target → \\u0001peer");
        Assert.AreEqual("", ReplyQuote.bridgeName(M("", "hi"), false), "a group / bot room → unchanged");
        Assert.AreEqual("Ann", ReplyQuote.bridgeName(M("Ann", "hi"), true), "a name already there → unchanged");
        Assert.AreEqual("", ReplyQuote.bridgeName(M("", "hi", matched: false), true), "the fallback box (no match) → unchanged");
        Assert.AreEqual("", ReplyQuote.bridgeName(null, true), "no match → \"\"");
    }

    [TestMethod]
    public void bridge_name_comes_from_the_matched_candidate()
    {
        var mine = new ReplyQuote.Candidate { idHex = "aa", type = FriendMessageType.standard, text = "hello there", timestamp = 10, localSender = true };
        var theirs = new ReplyQuote.Candidate { idHex = "bb", type = FriendMessageType.standard, text = "other", timestamp = 10, localSender = false };
        Assert.IsTrue(ReplyQuote.tryMatch("> hello there\nyes", 20, "cc", new[] { mine, theirs }, out var m1) && m1 != null);
        Assert.AreEqual("\u0001me", ReplyQuote.bridgeName(m1, true), "the match carries the target's localSender");
        Assert.IsTrue(ReplyQuote.tryMatch("> other\nyes", 20, "cc", new[] { mine, theirs }, out var m2) && m2 != null);
        Assert.AreEqual("\u0001peer", ReplyQuote.bridgeName(m2, true), "…and the peer's");
        Assert.AreEqual(FriendMessageType.standard, m2!.targetType, "the match carries the target's type");
    }

    [TestMethod]
    public void bridge_text_tells_a_real_inline_voice_from_a_typed_one()
    {
        // ★ #46 r1 (A-NIT5): the match records whether the standard target IS an inline voice text
        byte[] payload = new byte[60];
        string voiceText = VoiceCodec.humanLine(1000) + "\n" + "spixi.voice.1:1000:" + Convert.ToBase64String(payload);
        Assert.IsTrue(VoiceCodec.tryPeekInline(voiceText, out _), "the sample is an inline voice text");
        string ex = ReplyQuote.excerptOf(FriendMessageType.standard, voiceText, null, false)!;
        var real = new ReplyQuote.Candidate { idHex = "aa", type = FriendMessageType.standard, text = voiceText, timestamp = 10 };
        Assert.IsTrue(ReplyQuote.tryMatch(ReplyQuote.compose("", ex, "yes"), 20, "cc", new[] { real }, out var m1) && m1 != null, "matched: " + ex);
        Assert.IsTrue(m1!.targetInlineVoice, "the real voice target is flagged");
        Assert.AreEqual(ex, ReplyQuote.bridgeText(m1), "…and its excerpt goes to the shell unchanged");
        var typed = new ReplyQuote.Candidate { idHex = "bb", type = FriendMessageType.standard, text = ex, timestamp = 10 };
        Assert.IsTrue(ReplyQuote.tryMatch(ReplyQuote.compose("", ex, "yes"), 20, "cc", new[] { typed }, out var m2) && m2 != null, "matched the typed one");
        Assert.IsFalse(m2!.targetInlineVoice, "a TYPED '" + ex + "' is not a voice");
        Assert.AreEqual("\u2060" + ex, ReplyQuote.bridgeText(m2), "…so it gets the leading U+2060");
    }

    [TestMethod]
    public void the_wire_never_carries_a_marker()
    {
        string line = ReplyQuote.quoteLine(ReplyQuote.BridgeMe, "hi");
        Assert.IsFalse(line.Contains('\u0001'), "a marker passed as a name never reaches a composed quote line: " + line);
        Assert.IsFalse(ReplyQuote.compose(ReplyQuote.BridgePeer, "hi", "body").Contains('\u0001'), "compose strips it too");
    }

    [TestMethod]
    public void bridge_text_guards_a_text_that_reads_like_a_typed_word()
    {
        // ★ #46 r1 (A-NIT5): a LEADING U+2060 on every standard-text excerpt that starts with a kind glyph
        foreach (string w in new[] { "🎤", "💸 Payment", "📞 Call", "🚀 App", "🎤 0:12", "📷 x", "📎 report.pdf", "💸", "📞 later", "🚀 launching", "🎤hello" })
        {
            Assert.AreEqual("\u2060" + w, ReplyQuote.bridgeText(M("", w)), "a TEXT target '" + w + "' → U+2060 + it");
        }
        Assert.AreEqual("🎤", ReplyQuote.bridgeText(M("", "🎤", t: FriendMessageType.fileHeader)), "a real voice FILE target → unchanged");
        Assert.AreEqual("📷 x.jpg", ReplyQuote.bridgeText(M("", "📷 x.jpg", t: FriendMessageType.fileHeader)), "a real photo → unchanged");
        Assert.AreEqual("💸 Payment", ReplyQuote.bridgeText(M("", "💸 Payment", t: FriendMessageType.sentFunds)), "a real payment → unchanged");
        var voice = M("", "🎤 0:05"); voice.targetInlineVoice = true;
        Assert.AreEqual("🎤 0:05", ReplyQuote.bridgeText(voice), "a REAL inline voice text's excerpt → unchanged");
        Assert.AreEqual("🎤", ReplyQuote.bridgeText(M("", "🎤", matched: false)), "the fallback box → unchanged");
        Assert.AreEqual("a 🎤 b", ReplyQuote.bridgeText(M("", "a 🎤 b")), "a glyph not at the start → unchanged");
        Assert.AreEqual("", ReplyQuote.bridgeText(M("", "")), "empty → unchanged");
        Assert.AreEqual("hi", ReplyQuote.bridgeText(M("", "hi")), "plain text → unchanged");
        Assert.AreEqual("", ReplyQuote.bridgeText(null), "no match → \"\"");
    }

    // —— #1222 the dev logcat mirror ——
    [TestMethod]
    public void logtail_start_rolls_back_to_zero_when_the_file_shrank()
    {
        Assert.AreEqual(0L, DevLogTail.startOf(0, 0), "an empty new file");
        Assert.AreEqual(500L, DevLogTail.startOf(900, 500), "the file grew → read on from the offset");
        Assert.AreEqual(500L, DevLogTail.startOf(500, 500), "nothing new → the same offset");
        Assert.AreEqual(0L, DevLogTail.startOf(120, 500), "SHORTER than the offset → Core rolled it → from 0");
        Assert.AreEqual(0L, DevLogTail.startOf(120, -3), "a broken offset → 0");
    }

    static List<string> Feed(List<byte> carry, string s) { var b = Encoding.UTF8.GetBytes(s); return DevLogTail.takeLines(carry, b, b.Length); }

    [TestMethod]
    public void logtail_hands_over_complete_lines_only()
    {
        var carry = new List<byte>();
        var a = Feed(carry, "one\r\ntwo\n\nthr");
        Assert.AreEqual("one|two", string.Join("|", a), "CRLF and LF end a line; the trailing \\r goes; an empty line is skipped");
        Assert.AreEqual(3, carry.Count, "the unterminated tail stays in the carry");
        var b = Feed(carry, "ee\n");
        Assert.AreEqual("three", string.Join("|", b), "the tail is joined with the next read");
        Assert.AreEqual(0, carry.Count, "the carry is empty after a full line");
    }

    [TestMethod]
    public void logtail_a_lone_crlf_emits_no_carriage_return()
    {
        // ★ #46 r1 (C08): an empty CRLF line is skipped — never handed over as "\r"
        var carry = new List<byte>();
        var a = Feed(carry, "\r\n");
        Assert.AreEqual(0, a.Count, "a lone \\r\\n is an empty line → nothing (got " + a.Count + ")");
        Assert.IsFalse(a.Any(x => x.Contains('\r')), "never a \\r");
        Assert.AreEqual(0, carry.Count, "the carry is empty after it");
        var b = Feed(carry, "x\r\n\r\ny\n");
        Assert.AreEqual("x|y", string.Join("|", b), "around other lines too");
    }

    [TestMethod]
    public void logtail_keeps_a_utf8_character_split_across_reads_whole()
    {
        var carry = new List<byte>();
        byte[] all = Encoding.UTF8.GetBytes("é🎤\n");
        var first = DevLogTail.takeLines(carry, all, 3);                         // "é" + the first byte of the emoji
        Assert.AreEqual(0, first.Count, "no line yet");
        var rest = DevLogTail.takeLines(carry, all.Skip(3).ToArray(), all.Length - 3);
        Assert.AreEqual("é🎤", rest.Single(), "decoded once the line is complete — never a broken character");
    }

    [TestMethod]
    public void logtail_bounds_the_line_and_the_carry()
    {
        var carry = new List<byte>();
        var a = Feed(carry, new string('x', DevLogTail.MaxLineChars + 50) + "\n");
        Assert.AreEqual(DevLogTail.MaxLineChars, a.Single().Length, "a long line is cut to MaxLineChars (logcat's limit)");
        var b = Feed(carry, new string('y', DevLogTail.MaxCarryBytes + 10));
        Assert.AreEqual(1, b.Count, "a tail at MaxCarryBytes with no newline is handed over");
        Assert.IsTrue(carry.Count < DevLogTail.MaxCarryBytes, "the carry stays bounded (" + carry.Count + ")");
    }

    // —— #1224 (8) the Voice-folder sweep ——
    static readonly byte[] Ogg = Encoding.ASCII.GetBytes("OggS");
    const long Day = 24 * 3600;

    [TestMethod]
    public void sweep_deletes_only_a_broken_own_file_older_than_a_day()
    {
        string n = "voice-20261001-101500.ogg";
        Assert.IsTrue(VoiceCodec.isSweepable(n, 0, null, Day), "an EMPTY own file ≥ 24 h → deleted");
        Assert.IsTrue(VoiceCodec.isSweepable(n, 900, Encoding.ASCII.GetBytes("XXXX"), Day + 5), "not an Ogg ≥ 24 h → deleted");
        Assert.IsTrue(VoiceCodec.isSweepable(n, 2, null, Day), "shorter than the Ogg magic ≥ 24 h → deleted");
        Assert.IsFalse(VoiceCodec.isSweepable(n, 900, Ogg, 400 * Day), "a COMPLETE .ogg (a sent voice message) stays, however old");
        Assert.IsFalse(VoiceCodec.isSweepable(n, 0, null, Day - 1), "younger than 24 h → stays (a send may be writing it)");
        Assert.IsFalse(VoiceCodec.isSweepable("voice-2026100-101500.ogg", 0, null, Day), "not C#'s own name → stays");
        Assert.IsFalse(VoiceCodec.isSweepable("../voice-20261001-101500.ogg", 0, null, Day), "a path is never a name");
        Assert.IsFalse(VoiceCodec.isSweepable(null, 0, null, Day), "null → stays");
    }
}
