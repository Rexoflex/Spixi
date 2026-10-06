// ★ #1208 (session 7): + the voice excerpts (inline "🎤 M:SS", file "🎤").
// ★ #1198 (session 6b) — the reply quote line (Spixi/Utils/ReplyQuote.cs), EXECUTED: the excerpt (normalise, the 60
// text-element cap, emoji / ZWJ / flags never cut), the #1178 name rule, compose, the shape, and the match (": " in a
// name or an excerpt, a reply to a reply, the 300 s skew, the newest match, no match). The call sites (SingleChatPage
// onSend / insertMessage / updateMessage, HomePage.getFriendMessageHelper) are MAUI-bound; scripts/pins-s6b/cs.mjs pins them.
using System.Collections.Generic;
using System.Globalization;
using IXICore.Streaming;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class ReplyQuoteTests
{
    static ReplyQuote.Candidate T(string id, string text, long ts) => new ReplyQuote.Candidate { idHex = id, type = FriendMessageType.standard, text = text, timestamp = ts };
    static int elems(string s) => new StringInfo(s).LengthInTextElements;

    // —— the excerpt ——
    [TestMethod]
    public void excerpt_normalises_controls_separators_and_whitespace_runs()
    {
        Assert.AreEqual("hi there you", ReplyQuote.excerptOf(FriendMessageType.standard, "  hi\r\n\tthere \u2028\u2029 you  ", null, false), "CR LF TAB LS PS + runs");
        Assert.AreEqual("a b c", ReplyQuote.excerptOf(FriendMessageType.standard, "a\u0085b\u0007c", null, false), "C1 NEL and C0 BEL are spaces");
        Assert.AreEqual("a b", ReplyQuote.excerptOf(FriendMessageType.standard, "a\u00a0\u2003b", null, false), "NBSP + EM SPACE collapse to one space");
        Assert.AreEqual("…", ReplyQuote.excerptOf(FriendMessageType.standard, " \n\t ", null, false), "whitespace only → the ellipsis");
        Assert.IsTrue(ReplyQuote.excerptOf(FriendMessageType.standard, "", null, false) == null, "an EMPTY stored text (a deleted row) is not quotable");
        Assert.IsTrue(ReplyQuote.excerptOf(FriendMessageType.standard, null, null, false) == null, "null text → not quotable");
    }

    [TestMethod]
    public void excerpt_caps_at_60_text_elements()
    {
        string s60 = new string('a', 60);
        Assert.AreEqual(s60, ReplyQuote.excerptOf(FriendMessageType.standard, s60, null, false), "60 → no ellipsis");
        Assert.AreEqual(s60 + "…", ReplyQuote.excerptOf(FriendMessageType.standard, s60 + "b", null, false), "61 → the first 60 + …");
        Assert.AreEqual(s60 + "…", ReplyQuote.excerptOf(FriendMessageType.standard, s60 + new string('z', 5000), null, false), "a long text");
        string spaced = new string('a', 30) + "\n\n\n   " + new string('b', 29);   // 30 + 1 space + 29 = 60 after the collapse
        Assert.AreEqual(new string('a', 30) + " " + new string('b', 29), ReplyQuote.excerptOf(FriendMessageType.standard, spaced, null, false), "the cap counts AFTER the collapse");
    }

    [TestMethod]
    public void excerpt_never_cuts_an_emoji_zwj_sequence_a_flag_or_a_combining_mark()
    {
        string family = "👨\u200d👩\u200d👧\u200d👦";
        Assert.AreEqual(1, elems(family), "the runtime counts a ZWJ family as ONE text element");
        string text = string.Concat(System.Linq.Enumerable.Repeat(family, 61));
        string e = ReplyQuote.excerptOf(FriendMessageType.standard, text, null, false)!;
        Assert.AreEqual(string.Concat(System.Linq.Enumerable.Repeat(family, 60)) + "…", e, "61 families → 60 whole families + …");
        Assert.AreEqual(61, elems(e), "60 elements + the ellipsis");
        string mix = new string('a', 59) + family + "b";
        Assert.AreEqual(new string('a', 59) + family + "…", ReplyQuote.excerptOf(FriendMessageType.standard, mix, null, false), "the 60th element is the WHOLE family");
        string flags = string.Concat(System.Linq.Enumerable.Repeat("🇭🇷", 62));
        Assert.AreEqual(string.Concat(System.Linq.Enumerable.Repeat("🇭🇷", 60)) + "…", ReplyQuote.excerptOf(FriendMessageType.standard, flags, null, false), "a flag is one element");
        string accents = string.Concat(System.Linq.Enumerable.Repeat("e\u0301", 61));
        Assert.AreEqual(string.Concat(System.Linq.Enumerable.Repeat("e\u0301", 60)) + "…", ReplyQuote.excerptOf(FriendMessageType.standard, accents, null, false), "e + combining acute = one element");
        string thumbs = string.Concat(System.Linq.Enumerable.Repeat("👍🏽", 61));
        Assert.AreEqual(string.Concat(System.Linq.Enumerable.Repeat("👍🏽", 60)) + "…", ReplyQuote.excerptOf(FriendMessageType.standard, thumbs, null, false), "a skin-tone modifier stays with its emoji");
    }

    [TestMethod]
    public void excerpt_of_a_reply_quotes_its_body_not_its_quote_line()
    {
        Assert.AreEqual("my answer", ReplyQuote.excerptOf(FriendMessageType.standard, "> Ann: hi\nmy answer", null, false), "a reply to a reply");
        Assert.AreEqual("> not a reply", ReplyQuote.excerptOf(FriendMessageType.standard, "> not a reply", null, false), "no \\n → the text itself");
        Assert.AreEqual("> x", ReplyQuote.excerptOf(FriendMessageType.standard, "> x\n", null, false), "an empty body → not the shape → the text itself (normalised)");
        Assert.AreEqual(">x line one line two", ReplyQuote.excerptOf(FriendMessageType.standard, ">x\nline one\nline two", null, false), "\">x\" (no space) is not a quote line");
    }

    [TestMethod]
    public void excerpt_of_files_payments_calls_and_apps_is_language_neutral()
    {
        Assert.AreEqual("📷 IMG_1.jpg", ReplyQuote.excerptOf(FriendMessageType.fileHeader, "u1:IMG_1.jpg:10", "IMG_1.jpg", true), "photo");
        Assert.AreEqual("📎 report.pdf", ReplyQuote.excerptOf(FriendMessageType.fileHeader, "u1:report.pdf:10", "report.pdf", false), "file");
        Assert.AreEqual("📎 a b", ReplyQuote.excerptOf(FriendMessageType.fileHeader, "x", "a\n b", false), "the name is normalised");
        Assert.AreEqual("📎 " + new string('n', 60) + "…", ReplyQuote.excerptOf(FriendMessageType.fileHeader, "x", new string('n', 80), false), "the name is capped at 60");
        Assert.IsTrue(ReplyQuote.excerptOf(FriendMessageType.fileHeader, "", "", false) == null, "an unparseable / blanked header → not quotable");
        Assert.AreEqual("💸 Payment", ReplyQuote.excerptOf(FriendMessageType.sentFunds, "txid", null, false), "sentFunds");
        Assert.AreEqual("💸 Payment", ReplyQuote.excerptOf(FriendMessageType.requestFunds, "10", null, false), "requestFunds");
        Assert.AreEqual("📞 Call", ReplyQuote.excerptOf(FriendMessageType.voiceCall, "", null, false), "voiceCall (a missed call has an empty text)");
        Assert.AreEqual("📞 Call", ReplyQuote.excerptOf(FriendMessageType.voiceCallEnd, "12", null, false), "voiceCallEnd");
        Assert.AreEqual("🚀 App", ReplyQuote.excerptOf(FriendMessageType.appSession, "app", null, false), "appSession");
        foreach (var t in new[] { FriendMessageType.requestAdd, FriendMessageType.appSessionEnd, FriendMessageType.kicked, FriendMessageType.banned, FriendMessageType.requestAddSent, FriendMessageType.reaction })
        {
            Assert.IsTrue(ReplyQuote.excerptOf(t, "x", "x", false) == null, t + " is not quotable");
        }
    }

    // —— ★ #1208 (session 7): a voice message's excerpt is language-neutral and never the base64 ——
    [TestMethod]
    public void excerpt_of_a_voice_message()
    {
        var ps = new System.Collections.Generic.List<byte[]>();
        for (int i = 0; i < 617; i++) ps.Add(new byte[] { 0x48, (byte)i });
        string voice = VoiceCodec.humanLine(12_340) + "\n" + VoiceCodec.encodeInline(ps);
        Assert.AreEqual("🎤 0:12", ReplyQuote.excerptOf(FriendMessageType.standard, voice, null, false), "an inline voice text → 🎤 M:SS");
        Assert.AreEqual("🎤", ReplyQuote.excerptOf(FriendMessageType.fileHeader, "u1:voice-20261005-120000.ogg:900", "voice-20261005-120000.ogg", false), "a voice file → 🎤");
        Assert.AreEqual("🎤", ReplyQuote.excerptOf(FriendMessageType.fileHeader, "u1:voice-20261005-120000.ogg", "voice-20261005-120000.ogg", false), "no size in the header (unknown) → 🎤");
        Assert.AreEqual("🎤", ReplyQuote.excerptOf(FriendMessageType.fileHeader, "u1:voice-20261005-120000.ogg:262144", "voice-20261005-120000.ogg", false), "exactly MaxOggBytes → 🎤");
        Assert.AreEqual("📎 voice-20261005-120000.ogg", ReplyQuote.excerptOf(FriendMessageType.fileHeader, "u1:voice-20261005-120000.ogg:262145", "voice-20261005-120000.ogg", false), "over the size cap → the normal file excerpt (the row is a file too)");
        Assert.AreEqual("📎 voice-20261005-120000.ogg.txt", ReplyQuote.excerptOf(FriendMessageType.fileHeader, "x", "voice-20261005-120000.ogg.txt", false), "not the pattern → a file");
        string notVoice = VoiceCodec.humanLine(12_340) + "\n" + "spixi.voice.2:12340:AAAA";
        Assert.IsTrue(ReplyQuote.excerptOf(FriendMessageType.standard, notVoice, null, false)!.StartsWith("🎤 0:12 (voice message", System.StringComparison.Ordinal), "not the shape → the normal text excerpt");
        // a reply to a voice message round-trips on the excerpt
        var target = new ReplyQuote.Candidate { idHex = "aa", type = FriendMessageType.standard, text = voice, timestamp = 100 };
        string reply = ReplyQuote.compose("", ReplyQuote.excerptOf(target)!, "nice");
        Assert.AreEqual("> 🎤 0:12\nnice", reply, "the quote line");
        Assert.IsTrue(ReplyQuote.tryMatch(reply, 200, "bb", new[] { target }, out var m) && m != null && m.targetIdHex == "aa" && m.quoteText == "🎤 0:12", "matched");
    }

    // —— the name ——
    [TestMethod]
    public void name_uses_the_1178_member_rule()
    {
        Assert.AreEqual("Ann", ReplyQuote.nameFor("Ann"), "a plain name");
        Assert.AreEqual("", ReplyQuote.nameFor(""), "empty");
        Assert.AreEqual("", ReplyQuote.nameFor(null), "null");
        Assert.AreEqual("", ReplyQuote.nameFor("1aBcDeFgHiJkLmNoPqRsTuVwXyZ123456"), "address-like (> 24, no space) → never an address");
        Assert.AreEqual("Annevil", ReplyQuote.nameFor("Ann\u202eevil"), "a bidi override is stripped");
        Assert.AreEqual("AnnB", ReplyQuote.nameFor("Ann\nB"), "a newline is stripped (no second line)");
        Assert.AreEqual("AB", ReplyQuote.nameFor("A\u200dB\u2028"), "Cf + a line separator are stripped");
        string longName = "Very long name with many many words here";
        Assert.AreEqual("Very long name with many many wo…", ReplyQuote.nameFor(longName), "capped at 32 + …");
    }

    [TestMethod]
    public void compose_builds_the_quote_line()
    {
        Assert.AreEqual("> Ann: hi\nbody", ReplyQuote.compose("Ann", "hi", "body"), "with a name");
        Assert.AreEqual("> hi\nbody", ReplyQuote.compose("", "hi", "body"), "no name → no \": \"");
        Assert.AreEqual("> hi\nbody", ReplyQuote.compose("1aBcDeFgHiJkLmNoPqRsTuVwXyZ123456", "hi", "body"), "an address-like name → no name");
        Assert.AreEqual("> Ann: hi", ReplyQuote.quoteLine("Ann", "hi"), "the line alone");
    }

    // —— the shape (the chats-list strip) ——
    [TestMethod]
    public void strip_for_excerpt_is_shape_only()
    {
        Assert.AreEqual("body", ReplyQuote.stripForExcerpt("> Ann: hi\nbody"), "a quote line + body → the body");
        Assert.AreEqual("b1\nb2", ReplyQuote.stripForExcerpt("> anything at all\nb1\nb2"), "shape only — no match needed; the whole rest is the body");
        Assert.AreEqual("> x\n", ReplyQuote.stripForExcerpt("> x\n"), "an empty body → unchanged");
        Assert.AreEqual("hello", ReplyQuote.stripForExcerpt("hello"), "plain text unchanged");
        Assert.AreEqual(">no space\nb", ReplyQuote.stripForExcerpt(">no space\nb"), "\">\" without the space is not the shape");
        Assert.AreEqual("", ReplyQuote.stripForExcerpt(null), "null → \"\"");
    }

    // —— the match ——
    [TestMethod]
    public void match_with_and_without_a_name()
    {
        var c = new List<ReplyQuote.Candidate> { T("aa", "hello world", 100) };
        Assert.IsTrue(ReplyQuote.tryMatch("> Ann: hello world\nmy reply", 150, "rr", c, out var m), "named line matches");
        Assert.AreEqual("aa", m!.targetIdHex, "target id"); Assert.AreEqual("", m.quoteName, "#46 r2 MINOR-2: a matched name is the candidate's expectedName (\"\" here), never the line's \"Ann\""); Assert.AreEqual("hello world", m.quoteText, "excerpt"); Assert.AreEqual("my reply", m.body, "body");
        Assert.IsTrue(ReplyQuote.tryMatch("> hello world\nmy reply", 150, "rr", c, out m) && m!.quoteName == "", "no-name line matches with an empty name");
        Assert.IsTrue(ReplyQuote.tryMatch("> hello world\nb1\nb2", 150, "rr", c, out m) && m!.body == "b1\nb2", "a multi-line body is kept whole");
    }

    [TestMethod]
    public void a_name_with_colon_space_and_an_excerpt_with_colon_space()
    {
        var c = new List<ReplyQuote.Candidate> { T("aa", "hi", 100) };
        Assert.IsTrue(ReplyQuote.tryMatch("> Dr: Who: hi\nok", 100, "rr", c, out var m) && m!.quoteText == "hi" && m.quoteName == "", "a name holding \": \" — the excerpt suffix decides (the line's name is not shown, #46 r2 MINOR-2)");
        var c2 = new List<ReplyQuote.Candidate> { T("bb", "time: 10:00", 100) };
        Assert.IsTrue(ReplyQuote.tryMatch("> Ann: time: 10:00\nok", 100, "rr", c2, out m) && m!.quoteName == "" && m.quoteText == "time: 10:00", "an excerpt holding \": \"");
        Assert.IsTrue(ReplyQuote.tryMatch("> time: 10:00\nok", 100, "rr", c2, out m) && m!.quoteName == "", "equality first: no name, not \"time\"");
        Assert.IsFalse(ReplyQuote.tryMatch("> Ann:hi\nok", 100, "rr", c, out _), "\":\" without the space is no separator");
    }

    [TestMethod]
    public void a_reply_to_a_reply_round_trips()
    {
        string first = ReplyQuote.compose("Bob", "question?", "answer one");
        var c = new List<ReplyQuote.Candidate> { T("q1", "question?", 10), T("a1", first, 20) };
        string ex = ReplyQuote.excerptOf(FriendMessageType.standard, first, null, false)!;
        Assert.AreEqual("answer one", ex, "the excerpt of a reply is its body");
        string second = ReplyQuote.compose("Ann", ex, "answer two");
        Assert.IsTrue(ReplyQuote.tryMatch(second, 30, "a2", c, out var m) && m!.targetIdHex == "a1" && m.body == "answer two", "the second reply targets the FIRST reply, not the question");
        Assert.IsTrue(ReplyQuote.tryMatch(first, 20, "a1", c, out m) && m!.targetIdHex == "q1", "the first reply still matches the question");
    }

    [TestMethod]
    public void the_300s_skew_edge()
    {
        var c = new List<ReplyQuote.Candidate> { T("aa", "hi", 1300) };
        Assert.IsTrue(ReplyQuote.tryMatch("> hi\nok", 1000, "rr", c, out _), "candidate exactly 300 s newer → matches");
        c[0].timestamp = 1301;
        Assert.IsFalse(ReplyQuote.tryMatch("> hi\nok", 1000, "rr", c, out _), "301 s newer → no match");
        c[0].timestamp = 1;
        Assert.IsTrue(ReplyQuote.tryMatch("> hi\nok", 1000, "rr", c, out _), "older is always fine");
    }

    [TestMethod]
    public void the_newest_match_wins()
    {
        var c = new List<ReplyQuote.Candidate> { T("new", "hi", 200), T("old", "hi", 100), T("other", "bye", 300) };
        Assert.IsTrue(ReplyQuote.tryMatch("> hi\nok", 400, "rr", c, out var m) && m!.targetIdHex == "new", "the newest by timestamp, whatever the list order");
        var tie = new List<ReplyQuote.Candidate> { T("first", "hi", 100), T("second", "hi", 100) };
        Assert.IsTrue(ReplyQuote.tryMatch("> hi\nok", 400, "rr", tie, out m) && m!.targetIdHex == "second", "a tie → the later in list order");
        var withFuture = new List<ReplyQuote.Candidate> { T("ok", "hi", 100), T("future", "hi", 2000) };
        Assert.IsTrue(ReplyQuote.tryMatch("> hi\nok", 400, "rr", withFuture, out m) && m!.targetIdHex == "ok", "a candidate past the skew never wins");
    }

    [TestMethod]
    public void no_match_and_not_the_shape()
    {
        var c = new List<ReplyQuote.Candidate> { T("aa", "hi", 100), new ReplyQuote.Candidate { idHex = "del", type = FriendMessageType.standard, text = "", timestamp = 100 } };
        Assert.IsFalse(ReplyQuote.tryMatch("> nope\nok", 100, "rr", c, out var m) || m != null, "no candidate's excerpt → no match, match null");
        Assert.IsFalse(ReplyQuote.tryMatch("> …\nok", 100, "rr", c, out _), "a DELETED candidate never matches \"> …\"");
        Assert.IsFalse(ReplyQuote.tryMatch("> hi", 100, "rr", c, out _), "no \\n");
        Assert.IsFalse(ReplyQuote.tryMatch("> hi\n", 100, "rr", c, out _), "an empty body");
        Assert.IsFalse(ReplyQuote.tryMatch(">hi\nok", 100, "rr", c, out _), "no space after >");
        Assert.IsFalse(ReplyQuote.tryMatch("> hi\r\nok", 100, "rr", c, out _), "a CRLF line keeps its \\r → no match (shown unchanged)");
        Assert.IsFalse(ReplyQuote.tryMatch("hi", 100, "rr", c, out _), "plain text");
        Assert.IsFalse(ReplyQuote.tryMatch(null, 100, "rr", c, out _), "null");
        Assert.IsFalse(ReplyQuote.tryMatch("> hi\nok", 100, "rr", null, out _), "no candidates");
        var self = new List<ReplyQuote.Candidate> { T("rr", "> hi\nok", 100) };
        Assert.IsFalse(ReplyQuote.tryMatch("> ok\nok", 100, "rr", self, out _), "the reply itself is never its own target");
    }

    [TestMethod]
    public void files_payments_and_long_texts_round_trip()
    {
        var file = new ReplyQuote.Candidate { idHex = "ff", type = FriendMessageType.fileHeader, text = "u:IMG_9.jpg:5", fileName = "IMG_9.jpg", isImage = true, timestamp = 50 };
        var pay = new ReplyQuote.Candidate { idHex = "pp", type = FriendMessageType.sentFunds, text = "tx", timestamp = 60 };
        string longText = string.Concat(System.Linq.Enumerable.Repeat("👨\u200d👩\u200d👧 ok ", 40));
        var lng = T("ll", longText, 70);
        var c = new List<ReplyQuote.Candidate> { file, pay, lng };
        Assert.IsTrue(ReplyQuote.tryMatch(ReplyQuote.compose("Ann", ReplyQuote.excerptOf(file)!, "nice"), 100, "r", c, out var m) && m!.targetIdHex == "ff" && m.quoteText == "📷 IMG_9.jpg", "a photo");
        Assert.IsTrue(ReplyQuote.tryMatch(ReplyQuote.compose("", ReplyQuote.excerptOf(pay)!, "thanks"), 100, "r", c, out m) && m!.targetIdHex == "pp", "a payment");
        Assert.IsTrue(ReplyQuote.tryMatch(ReplyQuote.compose("Bo", ReplyQuote.excerptOf(lng)!, "yes"), 100, "r", c, out m) && m!.targetIdHex == "ll", "a long emoji text cut at 60 elements still matches");
    }

    [TestMethod]
    public void a_parsed_name_is_sanitised_again()
    {
        var c = new List<ReplyQuote.Candidate> { T("aa", "hi", 100) };
        Assert.IsTrue(ReplyQuote.tryMatch("> \u202eAnn: hi\nok", 100, "rr", c, out var m) && m!.quoteName == "", "a peer-written name (with a bidi override) never reaches a MATCHED quote box");
        Assert.IsTrue(ReplyQuote.tryMatch("> 1aBcDeFgHiJkLmNoPqRsTuVwXyZ123456: hi\nok", 100, "rr", c, out m) && m!.quoteName == "", "an address in the name slot → no name");
    }

    // —— #46 r1 A MAJOR-1: the bounded excerpt is IDENTICAL to the full normalise + cap ——
    static string reference(string s) => ReplyQuote.cap(ReplyQuote.normalize(s));
    [TestMethod]
    public void bounded_excerpt_equals_the_full_normalise_and_cap()
    {
        var rnd = new System.Random(1198);
        string[] atoms = { "a", "b", " ", "\n", "\t", "\u0085", "\u2028", "  ", "e\u0301", "👨\u200d👩\u200d👧", "🇭🇷", "👍🏽", "\u0007", "xyz", "\u00a0", "😀" };
        for (int i = 0; i < 3000; i++)
        {
            var sb = new System.Text.StringBuilder();
            int n = rnd.Next(0, 400);
            for (int k = 0; k < n; k++) sb.Append(atoms[rnd.Next(atoms.Length)]);
            string t = sb.ToString();
            Assert.AreEqual(reference(t), ReplyQuote.excerptOfRange(t, 0, t.Length), "random text #" + i);
        }
        string big = new string('w', 64000);
        Assert.AreEqual(reference(big), ReplyQuote.excerptOfRange(big, 0, big.Length), "64 000 chars");
        string spacesThenText = new string('a', 59) + new string(' ', 300) + "b" + new string(' ', 300) + "c";
        Assert.AreEqual(reference(spacesThenText), ReplyQuote.excerptOfRange(spacesThenText, 0, spacesThenText.Length), "a long space run before more text");
        string trailing = new string('a', 60) + new string(' ', 500);
        Assert.AreEqual(new string('a', 60), ReplyQuote.excerptOfRange(trailing, 0, trailing.Length), "60 + only trailing spaces → no ellipsis");
    }

    [TestMethod]
    public void the_shape_is_bounded_to_MaxLineChars()
    {
        string ok = "> " + new string('x', ReplyQuote.MaxLineChars - 2) + "\nbody";
        string tooLong = "> " + new string('x', ReplyQuote.MaxLineChars - 1) + "\nbody";
        Assert.IsTrue(ReplyQuote.looksLikeReply(ok), "a \\n at MaxLineChars → the shape");
        Assert.IsFalse(ReplyQuote.looksLikeReply(tooLong), "a first line past MaxLineChars → not a quote line");
        Assert.AreEqual(tooLong, ReplyQuote.stripForExcerpt(tooLong), "…and the strip agrees");
        Assert.IsTrue(ReplyQuote.fallbackOf(tooLong) == null, "…and no fallback box");
    }

    // —— #46 r1 C M-1 / m-1, A MINOR-3: one ranking across ALL candidates ——
    static ReplyQuote.Candidate N(string id, string text, long ts, string expected) { var c = T(id, text, ts); c.expectedName = expected; return c; }
    [TestMethod]
    public void an_exact_line_beats_a_suffix_match()
    {
        // "Ann: hi" (no name) vs "hi" by Ann: the line "> Ann: hi" is EXACT for the first (whole rest), a suffix for the second
        var c = new List<ReplyQuote.Candidate> { N("short", "hi", 300, "Bob"), N("whole", "Ann: hi", 100, "Zed") };
        Assert.IsTrue(ReplyQuote.tryMatch("> Ann: hi\nok", 400, "r", c, out var m) && m!.targetIdHex == "whole" && m.quoteName == "Zed", "the whole rest as the excerpt wins over a newer suffix match");
        var named = new List<ReplyQuote.Candidate> { N("other", "hi", 300, "Bob"), N("ann", "hi", 100, "Ann") };
        Assert.IsTrue(ReplyQuote.tryMatch("> Ann: hi\nok", 400, "r", named, out m) && m!.targetIdHex == "ann", "the candidate whose expected name IS the line's name wins over a newer one by someone else");
    }

    [TestMethod]
    public void the_longest_excerpt_wins_within_a_tier()
    {
        var c = new List<ReplyQuote.Candidate> { N("short", "Who: hi", 300, ""), N("long", "Dr: Who: hi", 100, "") };
        Assert.IsTrue(ReplyQuote.tryMatch("> X: Dr: Who: hi\nok", 400, "r", c, out var m) && m!.targetIdHex == "long" && m.quoteName == "", "longer excerpt, older, still wins");
    }

    [TestMethod]
    public void in_time_beats_the_skew_and_the_skew_picks_the_closest()
    {
        var c = new List<ReplyQuote.Candidate> { T("late", "hi", 1100), T("early", "hi", 500) };
        Assert.IsTrue(ReplyQuote.tryMatch("> hi\nok", 1000, "r", c, out var m) && m!.targetIdHex == "early", "a candidate ≤ the reply's time beats a newer one in the skew window");
        var skew = new List<ReplyQuote.Candidate> { T("far", "hi", 1290), T("near", "hi", 1010) };
        Assert.IsTrue(ReplyQuote.tryMatch("> hi\nok", 1000, "r", skew, out m) && m!.targetIdHex == "near", "only skew candidates → the closest to the reply");
    }

    [TestMethod]
    public void the_senders_remembered_target_wins()
    {
        var idx = new ReplyQuote.Index(new List<ReplyQuote.Candidate> { T("newer", "hi", 300), T("chosen", "hi", 100) });
        Assert.IsTrue(ReplyQuote.tryMatch("> hi\nok", 400, "r", idx, "chosen", out var m) && m!.targetIdHex == "chosen", "the compose-time target beats a newer equal match");
        Assert.IsTrue(ReplyQuote.tryMatch("> hi\nok", 400, "r", idx, "gone", out m) && m!.targetIdHex == "newer", "a remembered id not among the matches → the ranking");
        Assert.IsTrue(ReplyQuote.tryMatch("> hi\nok", 400, "r", idx, null, out m) && m!.targetIdHex == "newer", "no remembered id → the ranking");
    }

    [TestMethod]
    public void an_index_is_reused_across_rows_and_excerpts_are_computed_once()
    {
        var a = T("a", "hello", 10);
        var idx = new ReplyQuote.Index(new List<ReplyQuote.Candidate> { a, T("b", "world", 20) });
        Assert.AreEqual(2, idx.Count, "two quotable candidates");
        object? memo = a.excerptMemo;
        Assert.IsTrue(ReplyQuote.tryMatch("> hello\nx", 100, "r1", idx, null, out var m1) && m1!.targetIdHex == "a", "row 1");
        Assert.IsTrue(ReplyQuote.tryMatch("> world\ny", 100, "r2", idx, null, out var m2) && m2!.targetIdHex == "b", "row 2 on the same index");
        Assert.IsTrue(ReferenceEquals(memo, a.excerptMemo) && memo is string, "the excerpt was computed once (memoised on the candidate)");
        var notQuotable = new ReplyQuote.Index(new List<ReplyQuote.Candidate> { new ReplyQuote.Candidate { idHex = "k", type = FriendMessageType.kicked, text = "x" } });
        Assert.AreEqual(0, notQuotable.Count, "a non-quotable candidate is not indexed");
    }

    // —— Damir P2: a valid quote line with no match → a box from the line, no jump ——
    [TestMethod]
    public void fallback_box_from_the_line()
    {
        var f = ReplyQuote.fallbackOf("> Ann: hello there\nmy answer")!;
        Assert.IsTrue(!f.matched && f.targetIdHex == "" && f.quoteName == "Ann" && f.quoteText == "hello there" && f.body == "my answer", "name before the first \": \", the rest, the body");
        f = ReplyQuote.fallbackOf("> just a quote\nok")!;
        Assert.IsTrue(f.quoteName == "" && f.quoteText == "just a quote", "no \": \" → no name, the whole line");
        string longName = "Very long name with many many words";   // 35 elements, with spaces (not address-like)
        f = ReplyQuote.fallbackOf("> " + longName + ": x\nok")!;
        Assert.IsTrue(f.quoteName == "" && f.quoteText == longName + ": x", "a name part over 32 text elements → no name, the whole line is the text");
        string longAddr = new string('Q', 45);
        f = ReplyQuote.fallbackOf("> " + longAddr + ": x\nok")!;
        Assert.IsTrue(f.quoteName == "" && f.quoteText == "x", "#46 r2 NIT: an address-like name part of ANY length is dropped (neither name nor text)");
        string n32 = "Ann Bee Cee Dee Eee Fff Ggg Hhhh";   // 32 text elements, with spaces (not address-like)
        f = ReplyQuote.fallbackOf("> " + n32 + ": x\nok")!;
        Assert.IsTrue(f.quoteName == n32 && f.quoteText == "x", "a 32-element name part → the name");
        f = ReplyQuote.fallbackOf("> " + n32 + "i: x\nok")!;
        Assert.IsTrue(f.quoteName == "" && f.quoteText == n32 + "i: x", "33 elements → no name, the whole line");
        f = ReplyQuote.fallbackOf("> 1aBcDeFgHiJkLmNoPqRsTuVwXyZ123: x\nok")!;
        Assert.IsTrue(f.quoteName == "" && f.quoteText == "x", "an address-like name part → no name, the text after it");
        f = ReplyQuote.fallbackOf("> Dr: Who: hi\nok")!;
        Assert.IsTrue(f.quoteName == "Dr" && f.quoteText == "Who: hi", "the FIRST \": \" splits");
        f = ReplyQuote.fallbackOf("> Ann: " + new string('t', 70) + "\nok")!;
        Assert.AreEqual(new string('t', 60) + "…", f.quoteText, "the text is capped like an excerpt");
        f = ReplyQuote.fallbackOf("> \u202eAnn: x\nok")!;
        Assert.AreEqual("Ann", f.quoteName, "the #1178 sanitizer");
        Assert.IsTrue(ReplyQuote.fallbackOf("plain") == null && ReplyQuote.fallbackOf("> x\n") == null, "not the shape → null (the text unchanged)");
    }

    // —— #46 r2 MINOR-2: a matched quote's name is THIS device's name for the sender ——
    [TestMethod]
    public void a_matched_name_is_this_devices_name_never_the_lines()
    {
        var c = new List<ReplyQuote.Candidate> { N("ann", "hi", 100, "Ann B") };
        Assert.IsTrue(ReplyQuote.tryMatch("> Mallory: hi\nok", 400, "r", c, out var m) && m!.targetIdHex == "ann" && m.quoteName == "Ann B", "the line says Mallory, the box says this device's Ann B");
        Assert.IsTrue(ReplyQuote.tryMatch("> hi\nok", 400, "r", c, out m) && m!.quoteName == "Ann B", "a no-name line still shows this device's name");
        var oneToOne = new List<ReplyQuote.Candidate> { N("p", "hi", 100, "") };
        Assert.IsTrue(ReplyQuote.tryMatch("> Bob: hi\nok", 400, "r", oneToOne, out m) && m!.quoteName == "", "1:1 (expectedName \"\") → no name");
    }

    // —— #46 r2 MINOR-7: the excerpt READS a bounded prefix (kills a revert to the full normalise) ——
    [TestMethod]
    public void the_excerpt_reads_a_bounded_prefix()
    {
        string big = new string('w', 64000);
        ReplyQuote.charsRead = 0;
        ReplyQuote.excerptOf(FriendMessageType.standard, big, null, false);
        Assert.IsTrue(ReplyQuote.charsRead > 0 && ReplyQuote.charsRead <= 512, "a 64 000-char text reads ≤ 512 chars (read " + ReplyQuote.charsRead + ")");
        string reply = "> Ann: x\n" + big;
        ReplyQuote.charsRead = 0;
        ReplyQuote.excerptOf(FriendMessageType.standard, reply, null, false);
        Assert.IsTrue(ReplyQuote.charsRead <= 512, "a reply's body too (read " + ReplyQuote.charsRead + ")");
        var cands = new List<ReplyQuote.Candidate>();
        for (int i = 0; i < 1000; i++) cands.Add(T("c" + i, new string((char)('a' + i % 26), 64000), i));
        ReplyQuote.charsRead = 0;
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var idx = new ReplyQuote.Index(cands);
        Assert.IsTrue(idx.Count == 1000 && ReplyQuote.charsRead <= 1000 * 512 && sw.ElapsedMilliseconds < 3000,
            "1000 × 64 000-char candidates: ≤ 512 chars each (read " + ReplyQuote.charsRead + "), " + sw.ElapsedMilliseconds + " ms");
    }
}
