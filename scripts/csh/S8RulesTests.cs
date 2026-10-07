// ★ S8 (session 8) — the pure rules of the CS batch, EXECUTED:
//   · PushFetchProbe (#1229 the [P1] mailbox probe — Spixi/Utils/PushFetchProbe.cs, SPIXI_DEV_COEXIST)
//   · GroupAvatarRule.accept / writesAddedLine / addedLineText + UnreadRule's id {7} + SystemLineRules (#1231; #46 r1)
//   · ReactionSet (#1232 the quick list, the verb's args, the wire, the untrusted-emoji rule, the push tokens)
//   · AppInviteRules + SAppDeclines (#1233 Join's accept, Decline, the declined-row store)
//   · PrivacyRules + SPrivacyPrefs + PresenceDisplay's hiding + SpixiProtocols.ids(bool) (#1234)
// The call sites are MAUI-bound (StreamProcessor, SingleChatPage, HomePage, ContactDetails, SettingsPage, Node, SPushService).
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using IXICore.Streaming;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;
using SPIXI.Meta;

[TestClass]
public class S8RulesTests
{
    static byte[] B(params int[] v) => v.Select(x => (byte)x).ToArray();
    static Microsoft.Maui.Storage.Preferences P => Microsoft.Maui.Storage.Preferences.Default;

    // —— #1229 the mailbox probe ——
    // Harness wire (Stubs.cs): B(L, id…, sender, payload…) — byte 0 = the id length L (1–4), then the id, then ONE sender byte.
    static long fakeMs = 0;
    static void FakeClock() { fakeMs = 1000; PushFetchProbe.clockMs = () => fakeMs; }

    [TestMethod]
    public void probe_classifies_new_rep_reid_fix_and_counts_per_pass()
    {
        FakeClock();
        PushFetchProbe.resetForTest();
        PushFetchProbe.begin();
        Assert.AreEqual(PushFetchProbe.ClsNew, PushFetchProbe.note(B(4, 1, 2, 3, 4, 9, 50)), "first bytes → new");
        Assert.AreEqual(PushFetchProbe.ClsRep, PushFetchProbe.note(B(4, 1, 2, 3, 4, 9, 50)), "the same bytes again → rep");
        Assert.AreEqual(PushFetchProbe.ClsReid, PushFetchProbe.note(B(4, 1, 2, 3, 4, 9, 51)), "new bytes, same id, SAME sender → reid");
        Assert.AreEqual(PushFetchProbe.ClsNew, PushFetchProbe.note(B(4, 1, 2, 3, 4, 8, 50)), "the same id from ANOTHER sender → new (A-MINOR-4: keyed by sender ‖ id)");
        Assert.AreEqual(PushFetchProbe.ClsNew, PushFetchProbe.note(B(4, 5, 6, 7, 8)), "both new (no sender) → new");
        Assert.AreEqual(PushFetchProbe.ClsNew, PushFetchProbe.note(B(0xFF, 1)), "an unparseable message is classified by its bytes alone");
        Assert.AreEqual(PushFetchProbe.ClsRep, PushFetchProbe.note(B(0xFF, 1)), "…and repeats by its bytes");
        Assert.AreEqual(PushFetchProbe.ClsOff, PushFetchProbe.note(null), "null → off");
        PushFetchProbe.noteCode(PushFetchProbe.ClsRep, 3);
        PushFetchProbe.noteCode(PushFetchProbe.ClsReid, 3);
        PushFetchProbe.noteCode(PushFetchProbe.ClsReid, 12);
        PushFetchProbe.noteCode(PushFetchProbe.ClsNew, 40);
        PushFetchProbe.noteCode(PushFetchProbe.ClsFix, 41);
        IXICore.Meta.Logging.lines.Clear();
        PushFetchProbe.line("loop", true, 8);
        Assert.AreEqual("[P1] push fetch got=8 new=4 rep=2 reid=1 fix=0 ran=1 codes=3_12 where=loop", string.Join("|", IXICore.Meta.Logging.lines), "the line: counts + distinct rep/reid codes (a new / fix entry's code is not listed)");
        Assert.IsTrue(PushFetchProbe.touched, "notes this pass → touched");
        // a new pass: counters reset, the seen-sets stay (a repeat ACROSS passes is the point)
        PushFetchProbe.begin();
        Assert.IsFalse(PushFetchProbe.touched, "a fresh pass with no note and no time passed → the cooldown no-op (not touched)");
        Assert.AreEqual(PushFetchProbe.ClsRep, PushFetchProbe.note(B(4, 5, 6, 7, 8)), "bytes from the previous pass → rep");
        IXICore.Meta.Logging.lines.Clear();
        PushFetchProbe.line("push", false, 0);
        Assert.AreEqual("[P1] push fetch got=0 new=0 rep=1 reid=0 fix=0 ran=0 codes=- where=push", string.Join("|", IXICore.Meta.Logging.lines), "ran=0 is printed; no code → codes=-");
    }

    [TestMethod]
    public void probe_one_byte_ids_are_fixed_never_reid()
    {
        FakeClock();
        PushFetchProbe.resetForTest();
        PushFetchProbe.begin();
        // Core's avatar {6} from the same contact, twice, with different pictures — a protocol fixed id, not a re-send
        Assert.AreEqual(PushFetchProbe.ClsFix, PushFetchProbe.note(B(1, 6, 9, 100)), "a one-byte id → fix");
        Assert.AreEqual(PushFetchProbe.ClsFix, PushFetchProbe.note(B(1, 6, 9, 101)), "the same one-byte id + sender in new bytes → fix again, NOT reid");
        Assert.AreEqual(PushFetchProbe.ClsFix, PushFetchProbe.note(B(1, 6, 8, 100)), "another contact's {6} → fix");
        Assert.AreEqual(PushFetchProbe.ClsRep, PushFetchProbe.note(B(1, 6, 9, 100)), "the SAME bytes again → rep (the mailbox served it twice)");
        Assert.AreEqual(PushFetchProbe.ClsNew, PushFetchProbe.note(B(2, 6, 0, 9, 100)), "a two-byte id is a real id → new");
        IXICore.Meta.Logging.lines.Clear();
        PushFetchProbe.line("loop", true, 5);
        Assert.AreEqual("[P1] push fetch got=5 new=1 rep=1 reid=0 fix=3 ran=1 codes=- where=loop", string.Join("|", IXICore.Meta.Logging.lines), "fix= counts the fixed-id entries");
        // the key input: sender ‖ id with a length mark — (S, id) never collides with (S', id') of another split
        CollectionEqB(B(1, 2, 2, 9), PushFetchProbe.idKeyBytes(B(1, 2), B(9)), "sender ‖ len ‖ id");
        CollectionEqB(B(1, 1, 2, 9), PushFetchProbe.idKeyBytes(B(1), B(2, 9)), "another split → other bytes");
        CollectionEqB(B(0, 7, 7), PushFetchProbe.idKeyBytes(null, B(7, 7)), "no sender → an empty sender part");
    }

    [TestMethod]
    public void probe_touched_by_the_injected_clock_and_line_passes_the_p1_grammar()
    {
        FakeClock();
        PushFetchProbe.resetForTest();
        PushFetchProbe.begin();
        fakeMs += PushFetchProbe.CooldownMs - 1;
        Assert.IsFalse(PushFetchProbe.touched, "49 ms and no note → the cooldown no-op");
        fakeMs += 1;
        Assert.IsTrue(PushFetchProbe.touched, "a fetch that took ≥ 50 ms reached the server (ran=0 got=0 is then printed) — no wall time (C-NIT-4)");
        var codes = new List<int> { int.MaxValue, -1, 1000, 999, 5, 6 };
        string body = PushFetchProbe.format("loop", false, 18446744073709551615UL, int.MaxValue, int.MaxValue, int.MaxValue, int.MaxValue, codes);
        Assert.IsTrue(body.Contains(" codes=x_x_x_999 "), "at most 4 codes, each 0–999 else x (A-NIT-3): " + body);
        Assert.IsTrue(P1Perf.isValidLine("[P1] " + body), "the widest line still passes the [P1] grammar (no comma, ≤ 40-char tokens): " + body);
        PushFetchProbe.resetForTest();
        PushFetchProbe.begin();
        for (int i = 1; i <= 12; i++) { PushFetchProbe.note(B(2, 9, i)); PushFetchProbe.note(B(2, 9, i)); PushFetchProbe.noteCode(PushFetchProbe.ClsRep, i); }
        IXICore.Meta.Logging.lines.Clear();
        PushFetchProbe.line("loop", true, 24);
        Assert.IsTrue(IXICore.Meta.Logging.lines.Count == 1 && IXICore.Meta.Logging.lines[0].Contains(" codes=1_2_3_4 "), "at most 4 distinct codes are listed — " + string.Join("|", IXICore.Meta.Logging.lines));
    }

    [TestMethod]
    public void probe_sets_are_bounded_fifo()
    {
        FakeClock();
        PushFetchProbe.resetForTest();
        PushFetchProbe.begin();
        byte[] first = B(0, 1, 1, 1);   // id-less (byte 0 = 0): bytes only
        PushFetchProbe.note(first);
        for (int i = 0; i < PushFetchProbe.Cap; i++) { PushFetchProbe.note(new byte[] { 0, (byte)(i & 0xFF), (byte)(i >> 8), 7, 7 }); }
        Assert.AreEqual(PushFetchProbe.ClsNew, PushFetchProbe.note(first), "after Cap newer entries the oldest is evicted (FIFO) → new again");
        Assert.AreEqual(PushFetchProbe.ClsRep, PushFetchProbe.note(new byte[] { 0, 5, 0, 7, 7 }), "a recent one is still remembered");
    }

    // —— #1231 groups ——
    [TestMethod]
    public void group_avatar_only_from_the_owner()
    {
        byte[] owner = B(1, 2, 3), member = B(1, 2, 4);
        Assert.IsTrue(GroupAvatarRule.accept(true, B(1, 2, 3), owner), "the owner's own picture (group_sender = the owner)");
        Assert.IsFalse(GroupAvatarRule.accept(true, member, owner), "a member's picture (direct, or relayed by the owner) is dropped");
        Assert.IsFalse(GroupAvatarRule.accept(true, null, owner), "no sender → fail closed");
        Assert.IsFalse(GroupAvatarRule.accept(true, owner, null), "unknown owner → fail closed");
        Assert.IsFalse(GroupAvatarRule.accept(true, new byte[0], new byte[0]), "empty bytes → fail closed");
        Assert.IsFalse(GroupAvatarRule.accept(true, B(1, 2), owner), "a prefix is not the owner");
        Assert.IsTrue(GroupAvatarRule.accept(false, member, owner), "a 1:1 contact / bot room: not this rule (today's path)");
        Assert.IsTrue(GroupAvatarRule.accept(false, null, null), "…even with nothing known");
    }

    [TestMethod]
    public void added_line_only_into_an_empty_group_and_id_7_is_a_system_line()
    {
        Assert.IsTrue(GroupAvatarRule.writesAddedLine(true, 0, false), "a group just joined, nothing stored");
        Assert.IsFalse(GroupAvatarRule.writesAddedLine(true, 3, true), "a re-sent createGroup to a group with history → no line");
        Assert.IsFalse(GroupAvatarRule.writesAddedLine(true, 0, true), "a last message but no loaded rows → no line");
        Assert.IsFalse(GroupAvatarRule.writesAddedLine(true, -1, false), "the store could not answer → no line");
        Assert.IsFalse(GroupAvatarRule.writesAddedLine(false, 0, false), "no group → no line");
        Assert.AreEqual((byte)7, UnreadRule.AddedToGroupLineId, "the line's id is {7} (A-MINOR-1: {6} is Core's avatar id, CoreStreamProcessor.cs:2346)");
        Assert.IsTrue(UnreadRule.isSystemLineId(new byte[] { 7 }) && UnreadRule.isAddedToGroupLineId(new byte[] { 7 }), "{7} is a system line (no unread, no edit, no remote edit onto it)");
        Assert.IsFalse(UnreadRule.isSystemLineId(new byte[] { 6 }) || UnreadRule.isAddedToGroupLineId(new byte[] { 6 }), "{6} (Core's avatar id) is NOT a system line");
        Assert.IsFalse(UnreadRule.countsAsUnread(FriendMessageType.standard, false, false, UnreadRule.isSystemLineId(new byte[] { 7 })), "…so it never counts as unread");
        Assert.IsFalse(UnreadRule.isAddedToGroupLineId(new byte[] { 1 }) || UnreadRule.isAddedToGroupLineId(new byte[] { 7, 0 }) || UnreadRule.isAddedToGroupLineId(null), "only the one-byte {7}");
        Assert.IsTrue(UnreadRule.isSystemLineId(new byte[] { 1 }) && UnreadRule.isSystemLineId(new byte[] { 4 }) && UnreadRule.isSystemLineId(new byte[] { 5 }) && !UnreadRule.isSystemLineId(new byte[] { 8 }), "{1} {4} {5} unchanged, {8} not a system line");
    }

    [TestMethod]
    public void peers_cannot_write_a_one_byte_id_row()
    {
        foreach (int v in new[] { 0, 1, 4, 5, 6, 7, 255 }) Assert.IsTrue(SystemLineRules.isReservedId(new byte[] { (byte)v }), "a one-byte id is reserved: " + v);
        Assert.IsFalse(SystemLineRules.isReservedId(null), "no id → not this rule");
        Assert.IsFalse(SystemLineRules.isReservedId(new byte[0]), "an empty id → not this rule");
        Assert.IsFalse(SystemLineRules.isReservedId(new byte[] { 7, 0 }), "two bytes → a real id");
        Assert.IsFalse(SystemLineRules.isReservedId(new byte[16]), "a GUID-sized id → a real id");
        foreach (int v in new[] { 1, 4, 5, 7 }) Assert.IsTrue(!UnreadRule.isSystemLineId(new byte[] { (byte)v }) || SystemLineRules.isReservedId(new byte[] { (byte)v }), "every system-line id is reserved (so the shell may match the line by id alone): " + v);
    }

    [TestMethod]
    public void added_line_text_key_and_arg()
    {
        var a = GroupAvatarRule.addedLineText("Alice");
        Assert.IsTrue(a.key == "chat-group-added-you" && a.arg == "Alice", "a name → the named key with the name");
        var t = GroupAvatarRule.addedLineText("  Bob  ");
        Assert.AreEqual("Bob", t.arg, "trimmed");
        foreach (string? empty in new[] { null, "", "   ", "\t" })
        {
            var e = GroupAvatarRule.addedLineText(empty);
            Assert.IsTrue(e.key == "chat-group-added-you-noname" && e.arg == "", "an empty name → the no-name key, no arg ('" + empty + "')");
        }
        Assert.AreEqual("{0} added you to this group", a.fallback, "named fallback = en-us");
        Assert.AreEqual("You were added to this group", GroupAvatarRule.addedLineText(null).fallback, "no-name fallback = en-us");
        Assert.AreEqual("{x} added you to this group", string.Format(a.fallback, "{x}"), "a name with braces is an ARG, never a format");
    }

    // —— #1232 reactions ——
    [TestMethod]
    public void quick_list_index_and_wire()
    {
        CollectionEq(new[] { "👍", "❤️", "😂", "😮", "😢", "🔥" }, ReactionSet.Quick, "the fixed list, this order (= message-menu.js QUICK_REACTIONS)");
        for (int i = 0; i <= 5; i++) Assert.AreEqual(i, ReactionSet.parseIndex(i.ToString()), "index " + i);
        foreach (string bad in new[] { "6", "9", "-1", "01", "", " 1", "a", "١" }) Assert.AreEqual(-1, ReactionSet.parseIndex(bad), "rejected: '" + bad + "'");
        Assert.AreEqual(-1, ReactionSet.parseIndex(null), "null");
        Assert.AreEqual("like:", ReactionSet.wireFor(1), "❤️ = the bare like: old apps send");
        Assert.AreEqual("like:👍", ReactionSet.wireFor(0), "👍");
        Assert.AreEqual("like:🔥", ReactionSet.wireFor(5), "🔥");
        for (int i = 0; i <= 5; i++) Assert.IsTrue(ReactionSet.wireFor(i).Length <= 32, "within Core's 32-unit reaction limit");
        bool threw = false; try { ReactionSet.wireFor(6); } catch (ArgumentOutOfRangeException) { threw = true; }
        Assert.IsTrue(threw, "an index out of range never reaches the wire");
    }

    [TestMethod]
    public void hex_id_validation()
    {
        Assert.IsTrue(ReactionSet.isHexId("0a1B") && ReactionSet.isHexId(new string('f', 128)), "hex, even, ≤ 128");
        foreach (string bad in new[] { "", "a", "abc", "0g", "0a:1", "../", "0a 1", new string('f', 130) }) Assert.IsFalse(ReactionSet.isHexId(bad), "rejected: " + bad);
        Assert.IsFalse(ReactionSet.isHexId(null), "null");
    }

    [TestMethod]
    public void untrusted_emoji_rule()
    {
        /* ★ S8 #46 r4 — the ALLOW-LIST: one of Quick, or 👍 + exactly one skin tone; everything else → ❤️. */
        const string ZWJ = "\u200D", VS16 = "\uFE0F";
        foreach (string ok in ReactionSet.Quick) Assert.AreEqual(ok, ReactionSet.shownEmoji(ok), "a quick emoji is kept: " + ok);
        for (int t = 0x1F3FB; t <= 0x1F3FF; t++)
        {
            string toned = "\U0001F44D" + char.ConvertFromUtf32(t);
            Assert.AreEqual(toned, ReactionSet.shownEmoji(toned), "👍 + skin tone kept: " + t.ToString("X"));
        }
        Assert.AreEqual("❤️", ReactionSet.shownEmoji(null), "null (old app) → ❤️");
        Assert.AreEqual("❤️", ReactionSet.shownEmoji(""), "empty → ❤️");
        Assert.AreEqual("❤️", ReactionSet.shownEmoji("\u2764"), "❤ without VS16 → ❤️");
        foreach (string bad in new[] {
            "\U0001F602\U0001F3FD",                                  // 😂 + a tone: only 👍 takes one
            "\U0001F44D" + VS16 + "\U0001F3FD",                      // 👍 VS16 tone: not the canonical form
            "\U0001F44D\U0001F3FB\U0001F3FF", "\U0001F44D\U0001F3FA", "\U0001F3FD",
            "\U0001F389", "\U0001F44D\U0001F44D", "\U0001F44D:", "\U0001F44D;",
            "\U0001F1F8\U0001F1EA\U0001F1F3\U0001F1E9", "\U0001F1F8\U0001F1EE",   // 🇸🇪🇳🇩 and the flag 🇸🇮 (the accepted cost)
            "\u2F0A\u2FA6", "\U0001F17F" + VS16, "\u24C8\u24BA\u24C3\u24B9", "Send IXI to spixi.io/x",
            "\U0001F468" + ZWJ + "\U0001F469" + ZWJ + "\U0001F467",
            "\uD83D", "\uDC4D", "\U0001F44D\uD83D", "\U0001F44D\uD83C\u0041" })
        {
            Assert.AreEqual("❤️", ReactionSet.shownEmoji(bad), "not in the allow-list → ❤️: " + bad);
        }
    }
    /* ★ S8 #46 r3 (MINOR-2): THE PARITY PIN — one shared case table, scripts/pins-s8/emoji-cases.json ({name, in, keep, shown};
       ★ #46 r4: keep = the input is on the allow-list (one of Quick, a bare U+2764, 👍 + one skin tone); shown = what is displayed;
       every non-ASCII unit \u-escaped, lone surrogates included). The shell side runs the SAME rows through the built
       chat.html's reactionEmoji (chat-reactions.mjs c4). Found beside this file at compile time ([CallerFilePath]).
       System.Text.Json refuses a lone surrogate in GetString, so the string's raw JSON is unescaped here. */
    static string EmojiCasesPath([System.Runtime.CompilerServices.CallerFilePath] string here = "")
        => System.IO.Path.Combine(System.IO.Path.GetDirectoryName(here)!, "..", "pins-s8", "emoji-cases.json");
    static string JsonUnescape(string raw)
    {
        var sb = new StringBuilder();
        for (int i = 1; i < raw.Length - 1; i++)   // the raw text keeps its quotes
        {
            char c = raw[i];
            if (c != '\\') { sb.Append(c); continue; }
            char e = raw[++i];
            switch (e)
            {
                case 'u': sb.Append((char)Convert.ToInt32(raw.Substring(i + 1, 4), 16)); i += 4; break;
                case 'n': sb.Append('\n'); break;
                case 't': sb.Append('\t'); break;
                case 'r': sb.Append('\r'); break;
                case 'b': sb.Append('\b'); break;
                case 'f': sb.Append('\f'); break;
                default: sb.Append(e); break;   // \" \\ \/
            }
        }
        return sb.ToString();
    }
    [TestMethod]
    public void emoji_rule_shared_case_table()
    {
        string path = EmojiCasesPath();
        Assert.IsTrue(System.IO.File.Exists(path), "the shared table exists: " + path);
        using var doc = System.Text.Json.JsonDocument.Parse(System.IO.File.ReadAllText(path));
        var bad = new List<string>();
        int rows = 0, kept = 0;
        foreach (var row in doc.RootElement.EnumerateArray())
        {
            string input = JsonUnescape(row.GetProperty("in").GetRawText());
            string want = JsonUnescape(row.GetProperty("shown").GetRawText());
            bool keep = row.GetProperty("keep").GetBoolean();
            rows++;
            if (keep) kept++;
            /* keep ⇔ the shown value is the input itself, or the bare U+2764 shown as ❤️ (the table's one keep row that changes) */
            bool coherent = keep == (want == input || (input == "\u2764" && want == ReactionSet.Heart));
            if (!coherent || ReactionSet.shownEmoji(input) != want)
            {
                bad.Add(JsonUnescape(row.GetProperty("name").GetRawText()) + " (want " + want + (coherent ? "" : ", the row is incoherent") + ")");
            }
        }
        Assert.IsTrue(rows >= 170 && kept == 12, "the table is the full set (" + rows + " rows, " + kept + " kept — the 6, U+2764, 👍 × 5 tones)");
        Assert.AreEqual(0, bad.Count, "rows where shownEmoji disagrees with the table: " + string.Join(" | ", bad));
    }
    [TestMethod]
    public void like_tokens_group_by_shown_emoji()
    {
        Assert.AreEqual("", ReactionSet.likeTokens(new string?[0]), "no likes → nothing");
        Assert.AreEqual("like:👍:2;like:❤️:3;like:🔥:1;", ReactionSet.likeTokens(new string?[] { "👍", null, "", "👍", "🔥", "bad;x" }),
            "first-seen order; null / '' / unsafe all count as ❤️");
        Assert.AreEqual("like:❤️;", ReactionSet.ownLikeToken(null), "my old-style heart");
        Assert.AreEqual("like:😂;", ReactionSet.ownLikeToken("😂"), "my emoji");
        Assert.AreEqual("like:❤️;", ReactionSet.ownLikeToken("x:y"), "an unsafe own value is shown as ❤️ too");
    }

    // —— #1233 mini-app accept / decline ——
    [TestMethod]
    public void invite_rules()
    {
        Assert.AreEqual("com.x.app", AppInviteRules.appIdOf("com.x.app||https://u||Name||https://i"), "the id before ||");
        Assert.AreEqual("com.x.app", AppInviteRules.appIdOf("com.x.app"), "a bare id");
        Assert.AreEqual("", AppInviteRules.appIdOf(""), "a blank (deleted) row");
        Assert.AreEqual("", AppInviteRules.appIdOf(null), "null");
        Assert.IsTrue(AppInviteRules.joinSendsAccept("a", true, true, false), "newest row incoming → accept");
        Assert.IsFalse(AppInviteRules.joinSendsAccept("a", true, false, false), "newest row is my own invite (Launch) → no accept");
        Assert.IsFalse(AppInviteRules.joinSendsAccept("a", false, false, false), "no row → no accept");
        Assert.IsFalse(AppInviteRules.joinSendsAccept("a", true, true, true), "already accepted this run → no accept");
        Assert.IsFalse(AppInviteRules.joinSendsAccept("spixi.voip", true, true, false), "the call app → never");
        Assert.IsFalse(AppInviteRules.joinSendsAccept("", true, true, false), "no app id");
        Assert.IsTrue(AppInviteRules.canDecline(true, false, "a||u"), "an incoming invite row");
        Assert.IsFalse(AppInviteRules.canDecline(true, true, "a||u"), "my own invite");
        Assert.IsFalse(AppInviteRules.canDecline(false, false, "a"), "not an appSession row");
        Assert.IsFalse(AppInviteRules.canDecline(true, false, ""), "a blank row");
        Assert.IsFalse(AppInviteRules.canDecline(true, false, "spixi.voip"), "the call app");
        AppInviteRules.resetAccepts();
        Assert.IsTrue(AppInviteRules.claimAccept("P", "s1"), "first claim");
        Assert.IsTrue(AppInviteRules.wasAccepted("P", "s1") && !AppInviteRules.wasAccepted("P", "s2"), "remembered per (peer, session)");
        Assert.IsFalse(AppInviteRules.claimAccept("P", "s1"), "once per run");
        Assert.IsTrue(AppInviteRules.claimAccept("Q", "s1"), "another peer");
        Assert.IsFalse(AppInviteRules.claimAccept("", "s1") || AppInviteRules.claimAccept("P", null), "empty keys never claim");
        AppInviteRules.resetAccepts();
    }

    [TestMethod]
    public void my_invite_for_session_and_accept_cap()
    {
        byte[] sid = B(1, 2, 3, 4), other = B(1, 2, 3, 5);
        Assert.IsTrue(AppInviteRules.isMyInviteForSession(FriendMessageType.appSession, true, B(1, 2, 3, 4), sid), "my own invite, that session");
        Assert.IsFalse(AppInviteRules.isMyInviteForSession(FriendMessageType.appSession, false, B(1, 2, 3, 4), sid), "the PEER's invite (C-MAJOR-3 J2) → not mine");
        Assert.IsFalse(AppInviteRules.isMyInviteForSession(FriendMessageType.appSession, true, other, sid), "another session (C-MAJOR-3 J3) → no");
        Assert.IsFalse(AppInviteRules.isMyInviteForSession(FriendMessageType.appSession, true, B(1, 2, 3), sid), "a prefix → no");
        Assert.IsFalse(AppInviteRules.isMyInviteForSession(FriendMessageType.standard, true, B(1, 2, 3, 4), sid), "not an invite row");
        Assert.IsFalse(AppInviteRules.isMyInviteForSession(FriendMessageType.appSession, true, null, sid), "a blank row (no app id) → no");
        Assert.IsFalse(AppInviteRules.isMyInviteForSession(FriendMessageType.appSession, true, new byte[0], new byte[0]), "empty ids → no");
        Assert.IsFalse(AppInviteRules.isMyInviteForSession(FriendMessageType.appSession, true, sid, null), "no session → no");
        // C-MINOR-4: the per-run accept memory is capped, the OLDEST goes first
        AppInviteRules.resetAccepts();
        try
        {
            for (int i = 0; i < AppInviteRules.AcceptCap; i++) Assert.IsTrue(AppInviteRules.claimAccept("P", "s" + i), "claim " + i);
            Assert.IsTrue(AppInviteRules.wasAccepted("P", "s0"), "at the cap nothing is dropped yet");
            Assert.IsTrue(AppInviteRules.claimAccept("P", "s" + AppInviteRules.AcceptCap), "one more");
            Assert.IsFalse(AppInviteRules.wasAccepted("P", "s0"), "…evicts the OLDEST");
            Assert.IsTrue(AppInviteRules.wasAccepted("P", "s1") && AppInviteRules.wasAccepted("P", "s" + AppInviteRules.AcceptCap), "the rest stay");
            Assert.IsTrue(AppInviteRules.claimAccept("P", "s0"), "an evicted one can be claimed again");
        }
        finally { AppInviteRules.resetAccepts(); }
    }

    [TestMethod]
    public void declined_store_parse_cap_and_wipe()
    {
        CollectionEq(new[] { "A|0a", "B|ff" }, SAppDeclines.parse(" A|0a,,B|ff,A|0a,bad,|x,y|,a|b|c "), "valid entries, first wins, malformed skipped");
        var many = new List<string>(); for (int i = 0; i < 300; i++) many.Add("P|" + i.ToString("x2"));
        Assert.AreEqual(SAppDeclines.CAP, SAppDeclines.serialize(many, SAppDeclines.CAP).Split(',').Length, "the newest CAP kept");
        Assert.IsTrue(SAppDeclines.serialize(many, SAppDeclines.CAP).EndsWith("P|12b"), "…the newest last");
        SAppDeclines.clearAll();
        Assert.IsFalse(SAppDeclines.has("Peer", "0A1B"), "empty store");
        Assert.IsTrue(SAppDeclines.add("Peer", "0A1B"), "added");
        Assert.IsFalse(SAppDeclines.add("Peer", "0a1b"), "the same row (hex case-insensitive) → not new");
        Assert.IsTrue(SAppDeclines.has("Peer", "0a1b") && !SAppDeclines.has("Other", "0a1b") && !SAppDeclines.has("Peer", "0a1c"), "keyed by peer AND row");
        Assert.AreEqual("Peer|0a1b", P.Get("app_declines", ""), "ONE preference string");
        Assert.IsFalse(SAppDeclines.add(null, "0a") || SAppDeclines.add("P", ""), "empty keys are refused");
        SAppDeclines.clearAll();
        Assert.IsTrue(!SAppDeclines.has("Peer", "0a1b") && !P.d.ContainsKey("app_declines"), "the account wipe removes memory and the key");
    }

    [TestMethod]
    public void declined_store_clear_per_contact()
    {
        /* ★ S8 #46 r4 (MINOR-3): remove / delete-history / re-add forget ONE contact's declined rows — not a prefix-sharing
           address, not another peer; a no-op writes nothing */
        var l = new List<string> { "Peer|0a", "Pe|0b", "Peer|0c", "Other|0d" };
        Assert.IsTrue(SAppDeclines.clearInto(l, "Pe") && !SAppDeclines.clearInto(l, "Pe"), "clear once");
        CollectionEq(new[] { "Peer|0a", "Peer|0c", "Other|0d" }, l, "only Pe's row went (Peer starts with Pe, stays)");
        SAppDeclines.clearAll();
        SAppDeclines.add("Peer", "0a"); SAppDeclines.add("Pe", "0b"); SAppDeclines.add("Peer", "0c"); SAppDeclines.add("Other", "0d");
        SAppDeclines.clear("Peer");
        Assert.IsTrue(!SAppDeclines.has("Peer", "0a") && !SAppDeclines.has("Peer", "0c") && SAppDeclines.has("Pe", "0b") && SAppDeclines.has("Other", "0d"), "clear(peer): that peer only");
        Assert.AreEqual("Pe|0b,Other|0d", P.Get("app_declines", ""), "…written to the ONE preference string");
        P.d["app_declines"] = "sentinel";
        SAppDeclines.clear("Nobody"); SAppDeclines.clear(null); SAppDeclines.clear("");
        Assert.AreEqual("sentinel", P.Get("app_declines", ""), "a clear with nothing to drop writes nothing");
        SAppDeclines.clearAll();
    }

    // —— #1234 privacy ——
    [TestMethod]
    public void read_receipts_rules()
    {
        Assert.IsTrue(PrivacyRules.sendsReadReceipt(true, false, false), "on → sent");
        Assert.IsFalse(PrivacyRules.sendsReadReceipt(false, false, false), "off → not sent");
        Assert.IsFalse(PrivacyRules.sendsReadReceipt(true, true, false), "a bot room → never (as before)");
        Assert.IsFalse(PrivacyRules.sendsReadReceipt(true, false, true), "my own added-to-group line → never");
        bool s = true, c = false, r = true;
        PrivacyRules.shownStatus(false, ref s, ref c, ref r);
        Assert.IsTrue(s && c && !r, "off: read → shown as delivered");
        s = true; c = true; r = true;
        PrivacyRules.shownStatus(true, ref s, ref c, ref r);
        Assert.IsTrue(s && c && r, "on: unchanged");
        s = true; c = false; r = false;
        PrivacyRules.shownStatus(false, ref s, ref c, ref r);
        Assert.IsTrue(s && !c && !r, "off: a not-read row is unchanged (no invented delivery)");
        Assert.AreEqual("confirmed", PrivacyRules.shownStatus(false, "read"), "chats row: read → confirmed");
        Assert.AreEqual("read", PrivacyRules.shownStatus(true, "read"), "on: read stays");
        foreach (string t in new[] { "pending", "confirmed", "failed", "typing", "default", "" }) Assert.AreEqual(t, PrivacyRules.shownStatus(false, t), "other types untouched: " + t);
        Assert.AreEqual("", PrivacyRules.shownStatus(false, null), "null → ''");
        Assert.IsFalse(PrivacyRules.showsReactionKey(false, "seen"), "off: no seen count");
        Assert.IsTrue(PrivacyRules.showsReactionKey(false, "received") && PrivacyRules.showsReactionKey(false, "like") && PrivacyRules.showsReactionKey(true, "seen"), "the rest, and on");
        Assert.IsTrue(PrivacyRules.sendsTyping(true) && !PrivacyRules.sendsTyping(false) && PrivacyRules.showsTyping(true) && !PrivacyRules.showsTyping(false), "typing: both ways");
    }

    [TestMethod]
    public void privacy_prefs_defaults_and_storage()
    {
        P.d.Remove("privacyReadReceipts"); P.d.Remove("privacyTypingIndicators"); P.d.Remove("privacyHideOnline");
        try {
        Assert.IsTrue(SPrivacyPrefs.readReceipts && SPrivacyPrefs.typingIndicators && !SPrivacyPrefs.hideOnline, "defaults: receipts on, typing on, hide off");
        SPrivacyPrefs.readReceipts = false; SPrivacyPrefs.typingIndicators = false; SPrivacyPrefs.hideOnline = true;
        Assert.IsTrue(!SPrivacyPrefs.readReceipts && !SPrivacyPrefs.typingIndicators && SPrivacyPrefs.hideOnline, "stored");
        Assert.AreEqual("False|False|True", P.Get("privacyReadReceipts", "") + "|" + P.Get("privacyTypingIndicators", "") + "|" + P.Get("privacyHideOnline", ""), "three FIXED keys, no address");
        } finally { P.d.Remove("privacyReadReceipts"); P.d.Remove("privacyTypingIndicators"); P.d.Remove("privacyHideOnline"); }
    }

    [TestMethod]
    public void hide_online_capability_and_presence_display()
    {
        P.d.Remove("privacyHideOnline");
        Assert.AreEqual(3, SpixiProtocols.ids(false).Count, "off → the three ids");
        var on = SpixiProtocols.ids(true);
        Assert.AreEqual(4, on.Count, "on → + one");
        Assert.AreEqual("spixi.presence-hidden.1", Encoding.UTF8.GetString(on[3]), "presence-hidden LAST");
        try { SPrivacyPrefs.hideOnline = true; Assert.AreEqual(4, SpixiProtocols.ids().Count, "ids() follows the stored switch (the answer site calls ids())"); }
        finally { P.d.Remove("privacyHideOnline"); }
        Assert.AreEqual(3, SpixiProtocols.ids().Count, "…and drops it when OFF");
        Assert.IsTrue(PrivacyRules.hidesPresence(true, false) && PrivacyRules.hidesPresence(false, true) && !PrivacyRules.hidesPresence(false, false), "mine OR theirs");

        long saved = IXICore.Clock.now;
        IXICore.Clock.now = 50000;
        try {
        var f = new Friend(); f.walletAddress = new IXICore.Address("S8p"); f.online = true; f.lastSeenTime = 49990;
        Assert.IsTrue(PresenceDisplay.shownOnline(f) && PresenceDisplay.lastSeenEpoch(f) > 0, "baseline: online, last seen known");
        SPrivacyPrefs.hideOnline = true;
        Assert.IsFalse(PresenceDisplay.shownOnline(f), "my switch ON → nobody shows online (reciprocal)");
        Assert.AreEqual(0L, PresenceDisplay.lastSeenEpoch(f), "…and no last seen");
        Assert.AreEqual("0", PresenceDisplay.lastSeenArg(f), "…the shells' arg is the 'unknown' 0");
        Assert.IsTrue(f.online, "friend.online (Core routing) is untouched");
        SPrivacyPrefs.hideOnline = false;
        f.supportedProtocols = new List<byte[]> { Encoding.UTF8.GetBytes("spixi.reply.1"), Encoding.UTF8.GetBytes("spixi.presence-hidden.1") };
        Assert.IsFalse(PresenceDisplay.shownOnline(f) || PresenceDisplay.lastSeenEpoch(f) != 0, "a contact that announces presence-hidden is hidden always");
        f.supportedProtocols = new List<byte[]> { Encoding.UTF8.GetBytes("spixi.presence-hidden.10") };
        Assert.IsTrue(PresenceDisplay.shownOnline(f), "an exact id only");
        } finally { P.d.Remove("privacyHideOnline"); IXICore.Clock.now = saved; }   // never leak the switch into the integration checks
    }

    static void CollectionEqB(byte[] want, byte[] got, string m)
    {
        Assert.AreEqual(BitConverter.ToString(want), BitConverter.ToString(got), m);
    }

    static void CollectionEq(IList<string> want, IList<string> got, string m)
    {
        Assert.AreEqual(want.Count, got.Count, m + " (count)");
        for (int i = 0; i < want.Count; i++) Assert.AreEqual(want[i], got[i], m + " [" + i + "]");
    }
}
