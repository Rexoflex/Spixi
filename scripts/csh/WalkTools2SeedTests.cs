// ★ walktools2 item 1 (contract-walktools2 I-1; MC n-20261123-devseed-no-quote-reply) — THE QUOTE CHAT of the developer seed:
// seed index 56 = "Seed 57 Mojca Vrabec", exactly 1000 text rows, four of them REPLIES whose quote points to a row at least three
// older pages above (walk rows W-5 / A-5 of docs/walk-histcs.md could not be walked: no seed chat held a reply with a quote).
// What CSH compiles: Spixi/Utils/SDevSeedPlan.cs (the pure plan) and Spixi/Utils/ReplyQuote.cs (the app's reply code) — NOT
// Spixi/Utils/SDevSeed.cs (the writer: Core, MAUI). The writer is read as TEXT here (test 10) and by pins-walktools2/a-quote-seed.
// The page values the tests need from files CSH does not compile are read from those files as TEXT and compared with the copies
// below (Config.messagesToLoad, SharedItems.JumpCap, parseMessageIdHex's condition, CoreConfig.maxMessageIdSize).
// DELIBERATE BREAKS (#802; one per test, each in a full copy of the tree, each turns its own test red):
//   ①  SDevSeedPlan.QuoteChatFirst = FileChatFirst + FileChats → … + 1 .............. quote_chat_is_seed_57_with_exactly_1000_rows
//   ②  quoteRowIdFor: new byte[RealMessageIdLength] → new byte[RealMessageIdLength + 1] every_id_is_16_bytes_and_passes_parseMessageIdHex
//   ③  quoteRowIdFor: messageIdFor(i, j) → messageIdFor(i - 1, j) ..................... no_id_collides_with_seed_01_56
//   ④  quotePlan: ReplyQuote.compose("", …) → ReplyQuote.compose("Mojca", …) ......... every_reply_is_the_apps_shape_and_matches_exactly_its_target
//   ⑤  ReplyBodies[0] → the text of TargetTexts[0] ................................... every_target_excerpt_is_unique_in_the_chat
//   ⑥  quotePlan: reply.local = ReplyLocal[r] → reply.local = true ..................... replies_go_both_ways
//   ⑦  TargetDepths { 320, … } → { 240, … } ........................................... targets_lie_three_older_pages_above_in_both_switch_states
//   ⑧  QuoteAnchor = ImageAnchor - 6 * 3600L → - 2 * 3600L ........................... times_are_fixed_below_the_file_chats
//   ⑨  quoteTopUpAction: presentIds.Count == 0 → presentIds.Count == 1 ................. top_up_decisions
//   ⑩  SDevSeed.cs: SDevSeedPlan.quoteRowIdFor(i, m.j) → messageIdFor(i, m.j) ......... the_writer_uses_the_plan
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using IXICore.Streaming;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class WalkTools2SeedTests
{
    private const int Q = SDevSeedPlan.QuoteChat;
    private const int Margin = 5;   // no reply or target closer than this to a page edge (loadMessages reads want + 1 rows)

    private static string hex(byte[] b) => string.Concat(b.Select(x => x.ToString("x2")));   // = Crypto.hashToString (Ixian-Core Crypto/Crypto.cs:35-47: "x2" per byte)

    private static string repoFile(string rel, [System.Runtime.CompilerServices.CallerFilePath] string here = "")
    {
        // scripts/csh/WalkTools2SeedTests.cs → ../../<rel> (found beside this file at compile time)
        string path = Path.GetFullPath(Path.Combine(Path.GetDirectoryName(here)!, "..", "..", rel));
        return File.ReadAllText(path).Replace("\r", "");
    }

    /** A COPY of SingleChatPage.parseMessageIdHex (Spixi/Pages/Chat/SingleChatPage.xaml.cs:2534-2549) with Crypto.stringToHash
     *  (Ixian-Core Crypto/Crypto.cs:54-63) and CoreConfig.maxMessageIdSize = 16 (Ixian-Core Meta/CoreConfig.cs:240). Test 2 checks the
     *  page's condition text and the Core constant, so a change there turns this test red. */
    private static byte[]? parseMessageIdHexCopy(string? s)
    {
        const int maxMessageIdSize = 16;
        if (string.IsNullOrEmpty(s) || s.Length % 2 != 0 || s.Length > 2 * maxMessageIdSize)
        {
            return null;
        }
        try
        {
            byte[] id = new byte[s.Length / 2];
            for (int k = 0; k < s.Length; k += 2)
            {
                id[k / 2] = Convert.ToByte(s.Substring(k, 2), 16);
            }
            return id.Length > 0 ? id : null;
        }
        catch (Exception)
        {
            return null;
        }
    }

    /** The candidates of the open chat, built as SingleChatPage.replyCandidateOf builds them (SingleChatPage.xaml.cs:2418-2463): the id hex,
     *  the type, the stored text, the sequence, Core's timestamp, the sender side, no file name (a text row), expectedName = nameFor(replyNameOf)
     *  = nameFor("") in a 1:1 (:2581-2586). Oldest first, as the deep read holds them. */
    private static List<ReplyQuote.Candidate> candidates(IEnumerable<SDevSeedPlan.QuoteMsg> rows)
    {
        return rows.Select(m => new ReplyQuote.Candidate
        {
            idHex = hex(SDevSeedPlan.quoteRowIdFor(Q, m.j)), type = FriendMessageType.standard, text = m.text, sequence = 0,
            timestamp = m.ts, localSender = m.local, nameKey = "", expectedName = ReplyQuote.nameFor(""),
        }).ToList();
    }

    private static int depthOf(SDevSeedPlan.QuoteMsg m) => SDevSeedPlan.QuoteMessages - 1 - m.j;

    private static List<SDevSeedPlan.QuoteMsg> replies(List<SDevSeedPlan.QuoteMsg> plan) => plan.Where(m => m.targetJ >= 0).ToList();

    [TestMethod]
    public void quote_chat_is_seed_57_with_exactly_1000_rows()
    {
        Assert.AreEqual(56, SDevSeedPlan.QuoteChatFirst, "seed index 56 (after the file chats 53-55, without a gap)");
        Assert.AreEqual(SDevSeedPlan.FileChatFirst + SDevSeedPlan.FileChats, SDevSeedPlan.QuoteChatFirst, "no gap after the file chats (unseed's ONE loop bound)");
        Assert.AreEqual(1, SDevSeedPlan.QuoteChats, "one quote chat");
        Assert.AreEqual("Seed 57 Mojca Vrabec", SDevSeedPlan.quoteNick(56), "the nick");
        var plan = SDevSeedPlan.quotePlan(56);
        Assert.AreEqual(1000, plan.Count, "exactly 1000 rows");
        Assert.AreEqual(1000, SDevSeedPlan.QuoteMessages, "the constant");
        for (int x = 0; x < plan.Count; x++)
        {
            Assert.AreEqual(x, plan[x].j, "row " + x + " has j = " + x + " (oldest first)");
            Assert.IsFalse(string.IsNullOrEmpty(plan[x].text), "row " + x + " has a text");
        }
        Assert.AreEqual(0, SDevSeedPlan.quotePlan(55).Count + SDevSeedPlan.quotePlan(57).Count, "no quote plan outside index 56");
        Assert.IsTrue(!SDevSeedPlan.isQuoteChat(55) && !SDevSeedPlan.isQuoteChat(57) && SDevSeedPlan.isQuoteChat(56), "isQuoteChat = 56 only");
        Assert.IsFalse(SDevSeedPlan.isFileChat(56) || SDevSeedPlan.isImageChat(56), "56 is no file or image chat");
        var addr = new HashSet<string>();
        for (int i = 0; i <= 56; i++) Assert.IsTrue(addr.Add(hex(SDevSeedPlan.addressBytes(i))), "address " + i + " is unique");
        // the plan does not depend on the profile: the writer calls it the same way for light and heavy (test 10 reads that)
        Assert.AreEqual(4, replies(plan).Count, "four reply rows");
    }

    [TestMethod]
    public void every_id_is_16_bytes_and_passes_parseMessageIdHex()
    {
        // the copy follows the page and Core (a change there must change the copy)
        string page = repoFile("Spixi/Pages/Chat/SingleChatPage.xaml.cs");
        Assert.IsTrue(page.Contains("private static byte[]? parseMessageIdHex(string? hex)\n        {\n            if (string.IsNullOrEmpty(hex) || hex.Length % 2 != 0 || hex.Length > 2 * CoreConfig.maxMessageIdSize)"),
            "SingleChatPage.parseMessageIdHex still has the copied condition");
        string core = repoFile("../Ixian-Core/Meta/CoreConfig.cs");
        Assert.IsTrue(core.Contains("public static readonly int maxMessageIdSize = 16;"), "Core's maxMessageIdSize is 16");
        Assert.IsTrue(parseMessageIdHexCopy(hex(SDevSeedPlan.messageIdFor(Q, 0))) == null, "a 32-byte seed id is refused (the gap of #1882)");
        Assert.IsTrue(parseMessageIdHexCopy("abc") == null, "odd → refused");
        Assert.IsTrue(parseMessageIdHexCopy("zz") == null, "not hex → refused");
        foreach (var m in SDevSeedPlan.quotePlan(Q))
        {
            byte[] id = SDevSeedPlan.quoteRowIdFor(Q, m.j);
            Assert.AreEqual(16, id.Length, "row " + m.j + ": 16 bytes");
            byte[]? back = parseMessageIdHexCopy(hex(id));
            Assert.IsTrue(back != null && back.SequenceEqual(id), "row " + m.j + ": the page's rule accepts its hex and gives the same bytes (reply, edit, quote jump)");
        }
    }

    [TestMethod]
    public void no_id_collides_with_seed_01_56()
    {
        var full = new HashSet<string>();
        var heads = new HashSet<string>();
        void add(byte[] id) { string h = hex(id); full.Add(h); heads.Add(h.Substring(0, 32)); }
        for (int i = 0; i < SDevSeedPlan.Count; i++) for (int j = 0; j < SDevSeedPlan.HeavyMessages; j++) add(SDevSeedPlan.messageIdFor(i, j));   // heavy ⊇ light
        for (int i = SDevSeedPlan.ImageChatFirst; i < SDevSeedPlan.ImageChatFirst + SDevSeedPlan.ImageChats; i++) foreach (var m in SDevSeedPlan.imagePlan(i)) add(SDevSeedPlan.messageIdFor(i, m.j));
        for (int i = SDevSeedPlan.FileChatFirst; i < SDevSeedPlan.FileChatFirst + SDevSeedPlan.FileChats; i++) foreach (var m in SDevSeedPlan.filePlan(i)) add(SDevSeedPlan.rowIdFor(i, m));
        Assert.IsTrue(full.Count > 50000, "every id of Seed 01-56 was built (" + full.Count + ")");
        var mine = new HashSet<string>();
        foreach (var m in SDevSeedPlan.quotePlan(Q))
        {
            string h = hex(SDevSeedPlan.quoteRowIdFor(Q, m.j));
            Assert.IsFalse(full.Contains(h) || heads.Contains(h), "row " + m.j + ": its id is no id (and no 16-byte head of an id) of Seed 01-56");
            Assert.IsTrue(mine.Add(h), "row " + m.j + ": its id is distinct in the chat");
            Assert.AreEqual(hex(SDevSeedPlan.messageIdFor(Q, m.j)).Substring(0, 32), h.Substring(0, Math.Min(32, h.Length)), "row " + m.j + ": the id is the head of messageIdFor(56, j) (its length: test 2)");
        }
        Assert.AreEqual(1000, mine.Count, "1000 distinct ids");
        // the frozen sample of the base (Seed 01's first id) is unchanged by this item
        Assert.AreEqual("7e182b7270ce61b5dfd2c53ba879f2c6c5e2539412dfae49b28ceca8e1737dac", hex(SDevSeedPlan.messageIdFor(0, 0)), "id 0:0 (Seed 01) unchanged");
        Assert.AreEqual("24,16,30,31,30,100", string.Join(",", new[] { 50, 51, 52 }.Select(i => SDevSeedPlan.imagePlan(i).Count).Concat(new[] { 53, 54, 55 }.Select(i => SDevSeedPlan.filePlan(i).Count))), "Seed 51-56 counts unchanged");
    }

    [TestMethod]
    public void every_reply_is_the_apps_shape_and_matches_exactly_its_target()
    {
        var plan = SDevSeedPlan.quotePlan(Q);
        var all = candidates(plan);
        var index = new ReplyQuote.Index(all);
        int seen = 0;
        foreach (var m in plan)
        {
            bool shaped = ReplyQuote.splitShape(m.text, out string line, out string body);
            Assert.AreEqual(m.targetJ >= 0, shaped, "row " + m.j + ": quote-shaped exactly when the plan makes it a reply");
            Assert.AreEqual(shaped, ReplyQuote.looksLikeReply(m.text), "row " + m.j + ": looksLikeReply agrees");
            if (!shaped)
            {
                continue;
            }
            seen++;
            var target = plan[m.targetJ];
            string? excerpt = ReplyQuote.excerptOf(FriendMessageType.standard, target.text, null, false);
            Assert.IsTrue(excerpt != null, "the target of row " + m.j + " is quotable");
            Assert.AreEqual(ReplyQuote.compose("", excerpt!, body), m.text, "row " + m.j + ": the stored text = ReplyQuote.compose(\"\", excerptOf(target), body) — what composeReply stores in a 1:1");
            Assert.AreEqual("> " + excerpt, line, "row " + m.j + ": no name part in a 1:1 (replyNameOf → \"\")");
            Assert.IsTrue(target.isTarget && !string.IsNullOrEmpty(body), "row " + m.j + ": a marked target, a body");
            string self = hex(SDevSeedPlan.quoteRowIdFor(Q, m.j));
            string want = hex(SDevSeedPlan.quoteRowIdFor(Q, target.j));
            // the list form and the page's form (ONE index for the load, no remembered target: the peer's device / a fresh process)
            Assert.IsTrue(ReplyQuote.tryMatch(m.text, m.ts, self, all, out ReplyQuote.Match? a) && a != null && a.matched, "row " + m.j + ": tryMatch finds a target");
            Assert.AreEqual(want, a!.targetIdHex, "row " + m.j + ": tryMatch finds EXACTLY its planned target (row " + target.j + ")");
            Assert.IsTrue(ReplyQuote.tryMatch(m.text, m.ts, self, index, null, out ReplyQuote.Match? b) && b != null && b.targetIdHex == want, "row " + m.j + ": the Index form finds the same target");
            Assert.AreEqual("", b!.quoteName, "row " + m.j + ": a 1:1 quote carries no name");
            Assert.AreEqual(target.local ? ReplyQuote.BridgeMe : ReplyQuote.BridgePeer, ReplyQuote.bridgeName(b, true), "row " + m.j + ": the shell is told whose message it quotes");
            Assert.AreEqual(body, b.body, "row " + m.j + ": the body");
            // without the ONE deep read (only the in-memory window of the newest 100 rows) the target is not there: the jump needs the deep read
            var window = all.Skip(all.Count - 100).ToList();
            bool inWindow = ReplyQuote.tryMatch(m.text, m.ts, self, window, out ReplyQuote.Match? w) && w != null && w.targetIdHex == want;
            Assert.IsFalse(inWindow, "row " + m.j + ": its target is NOT among the newest 100 rows (the deep read of DeepSearchMax rows finds it)");
            Assert.IsTrue(SDevSeedPlan.QuoteMessages <= ReplyQuote.DeepSearchMax, "the deep read holds the whole chat");
        }
        Assert.AreEqual(4, seen, "four replies were checked");
    }

    [TestMethod]
    public void every_target_excerpt_is_unique_in_the_chat()
    {
        var plan = SDevSeedPlan.quotePlan(Q);
        var all = candidates(plan);
        var counts = new Dictionary<string, int>(StringComparer.Ordinal);
        foreach (var c in all)
        {
            string? e = ReplyQuote.excerptOf(c);
            Assert.IsTrue(e != null, "every row is quotable");
            counts[e!] = counts.TryGetValue(e!, out int n) ? n + 1 : 1;
        }
        var targets = plan.Where(m => m.isTarget).ToList();
        Assert.AreEqual(4, targets.Count, "four targets");
        foreach (var t in targets)
        {
            string e = ReplyQuote.excerptOf(FriendMessageType.standard, t.text, null, false)!;
            Assert.AreEqual(1, counts[e], "target row " + t.j + ": its excerpt \"" + e + "\" is held by ONE row of the chat");
            Assert.IsFalse(e.EndsWith(ReplyQuote.Ellipsis, StringComparison.Ordinal), "target row " + t.j + ": the excerpt is the whole text (under 60 text elements)");
            Assert.IsFalse(e.Contains(": "), "target row " + t.j + ": no \": \" (no name probe can read a part of it as a name)");
        }
        Assert.AreEqual(all.Count, counts.Count, "every row of the chat has its own excerpt (the walk names a row by its text)");
    }

    [TestMethod]
    public void replies_go_both_ways()
    {
        var plan = SDevSeedPlan.quotePlan(Q);
        var r = replies(plan);
        Assert.IsTrue(r.Any(m => m.local), "a reply I sent");
        Assert.IsTrue(r.Any(m => !m.local), "a reply I received");
        foreach (var m in r)
        {
            Assert.IsTrue(m.local != plan[m.targetJ].local, "reply row " + m.j + " quotes the OTHER side's message (mine quotes the peer, the peer's quotes mine)");
        }
        var newest = r.Where(m => depthOf(m) <= 1).ToList();
        Assert.IsTrue(newest.Any(m => m.local) && newest.Any(m => !m.local), "row 1 and row 2 of the open chat: one reply each way");
    }

    /** The window after k older pages: Config.messagesToLoad at first, then HistoryOlderRules.nextShow (the page's own arithmetic). */
    private static int windowAfter(int k, bool firstPage50, int step)
    {
        uint w = (uint)step;
        for (int x = 0; x < k; x++) w = HistoryOlderRules.nextShow(w, (uint)step, firstPage50);
        return (int)w;
    }

    /** The older page that first shows the row of this depth: 0 = the open chat. */
    private static int pageOf(int depth, bool firstPage50, int step)
    {
        int k = 0;
        while (depth >= windowAfter(k, firstPage50, step)) k++;
        return k;
    }

    [TestMethod]
    public void targets_lie_three_older_pages_above_in_both_switch_states()
    {
        Assert.IsTrue(repoFile("Spixi/Meta/Config.cs").Contains("public static uint messagesToLoad = 50;"), "Config.messagesToLoad = 50 (Spixi/Meta/Config.cs:61)");
        Assert.IsTrue(repoFile("Spixi/Utils/SharedItems.cs").Contains("public const int JumpCap = 1000;"), "SharedItems.JumpCap = 1000 (Spixi/Utils/SharedItems.cs:60)");
        const int step = 50, jumpCap = 1000;
        // the page math: OFF 50 → 150 (the step over 100) → 200 → 250; ON 50 → 100 → 150 → 200
        Assert.AreEqual("50,150,200,250", string.Join(",", Enumerable.Range(0, 4).Select(k => windowAfter(k, false, step))), "FirstOlderPage50 OFF");
        Assert.AreEqual("50,100,150,200", string.Join(",", Enumerable.Range(0, 4).Select(k => windowAfter(k, true, step))), "FirstOlderPage50 ON");
        var plan = SDevSeedPlan.quotePlan(Q);
        var r = replies(plan);
        foreach (bool on in new[] { false, true })
        {
            int three = windowAfter(3, on, step);
            foreach (var m in r)
            {
                int rd = depthOf(m), td = depthOf(plan[m.targetJ]);
                string s = "reply depth " + rd + " → target depth " + td + " (switch " + (on ? "ON" : "OFF") + ")";
                Assert.IsTrue(pageOf(td, on, step) - pageOf(rd, on, step) >= 3, s + ": the target is ≥ 3 older pages above the reply (" + pageOf(rd, on, step) + " → " + pageOf(td, on, step) + ")");
                Assert.IsTrue(td >= three + Margin, s + ": deeper than the window after three older pages (" + three + ")");
                Assert.IsTrue(td < jumpCap && td < ReplyQuote.DeepSearchMax && td <= 700, s + ": well below JumpCap / DeepSearchMax");
                foreach (int d in new[] { rd, td })
                {
                    for (int k = 0; k < 20; k++)
                    {
                        Assert.IsTrue(Math.Abs(d - windowAfter(k, on, step)) >= Margin, s + ": depth " + d + " is not at a page edge (" + windowAfter(k, on, step) + ")");
                    }
                }
            }
        }
        Assert.IsTrue(r.Any(m => depthOf(m) <= 1), "a reply in row 1 or 2 of the open chat");
        Assert.IsTrue(r.Any(m => pageOf(depthOf(m), false, step) == 3), "a reply reached after three older pages with the switch OFF");
        Assert.IsTrue(r.Any(m => pageOf(depthOf(m), true, step) == 3), "a reply reached after three older pages with the switch ON");
    }

    [TestMethod]
    public void times_are_fixed_below_the_file_chats()
    {
        var a = SDevSeedPlan.quotePlan(Q);
        var b = SDevSeedPlan.quotePlan(Q);
        Assert.IsTrue(a.Select(m => m.ts + "|" + m.text + "|" + m.local).SequenceEqual(b.Select(m => m.ts + "|" + m.text + "|" + m.local)), "the plan is deterministic (no clock)");
        Assert.AreEqual(SDevSeedPlan.ImageAnchor - 6 * 3600L, a[a.Count - 1].ts, "the newest row = ImageAnchor − 6 h");
        Assert.AreEqual(1767247200L, a[a.Count - 1].ts, "2026-01-01 06:00:00 UTC");
        Assert.AreEqual(1767247200L - 999 * SDevSeedPlan.GapSeconds, a[0].ts, "the oldest row 999 gaps earlier");
        for (int x = 1; x < a.Count; x++) Assert.AreEqual(SDevSeedPlan.GapSeconds, a[x].ts - a[x - 1].ts, "row " + x + ": GapSeconds after the one before");
        foreach (int i in new[] { 53, 54, 55 })
        {
            var f = SDevSeedPlan.filePlan(i);
            Assert.IsTrue(a[a.Count - 1].ts < f[f.Count - 1].ts, "Seed 57's newest row is older than file chat " + i + "'s newest (it sits below them in the chats list)");
        }
        Assert.IsTrue(a[a.Count - 1].ts < SDevSeedPlan.seedFloor(SDevSeedPlan.ImageAnchor + 30L * 86400), "older than every Seed 01-50 message of a run after 2026-01-31");
    }

    [TestMethod]
    public void top_up_decisions()
    {
        var plan = SDevSeedPlan.quotePlan(Q);
        var ids = plan.Select(m => (byte[]?)SDevSeedPlan.quoteRowIdFor(Q, m.j)).ToList();
        Assert.AreEqual(SDevSeedPlan.TopUpPartial, SDevSeedPlan.quoteTopUpAction(null, Q), "unreadable list → partial");
        Assert.AreEqual(SDevSeedPlan.TopUpWrite, SDevSeedPlan.quoteTopUpAction(new List<byte[]?>(), Q), "an EMPTY list → write");
        Assert.AreEqual(SDevSeedPlan.TopUpSkip, SDevSeedPlan.quoteTopUpAction(ids, Q), "the whole chat → skip");
        Assert.AreEqual(SDevSeedPlan.TopUpSkip, SDevSeedPlan.quoteTopUpAction(ids.Skip(ids.Count - 51).ToList(), Q), "the newest 51 rows (Core's window after a load) → skip");
        Assert.AreEqual(SDevSeedPlan.TopUpPartial, SDevSeedPlan.quoteTopUpAction(ids.Take(ids.Count - 1).ToList(), Q), "the newest row absent → partial (Remove the seed, then Seed)");
        Assert.AreEqual(SDevSeedPlan.TopUpPartial, SDevSeedPlan.quoteTopUpAction(new List<byte[]?> { SDevSeedPlan.messageIdFor(Q, 999) }, Q), "a 32-byte id of the newest row is not ours → partial");
        Assert.AreEqual(SDevSeedPlan.TopUpPartial, SDevSeedPlan.quoteTopUpAction(new List<byte[]?> { null, SDevSeedPlan.rowIdFor(55, SDevSeedPlan.filePlan(55)[99]) }, Q), "a foreign id → partial");
        Assert.AreEqual(SDevSeedPlan.TopUpPartial, SDevSeedPlan.quoteTopUpAction(ids, 55), "not the quote chat → partial (fail closed)");
    }

    [TestMethod]
    public void the_writer_uses_the_plan()
    {
        // CSH does not compile SDevSeed.cs (Core / MAUI glue): the writer is read as TEXT.
        string all = repoFile("Spixi/Utils/SDevSeed.cs");
        int a = all.IndexOf("private static string seedQuoteChat()", StringComparison.Ordinal), b = all.IndexOf("private static int quoteChatsPresent()", StringComparison.Ordinal);
        Assert.IsTrue(a > 0 && b > a, "seedQuoteChat, then quoteChatsPresent");
        string s = all.Substring(a, b - a);   // the writer's own text
        var adds = Regex.Matches(s, @"FriendList\.addMessageWithType\((.+?), FriendMessageType\.standard, address, 0, m\.text, m\.local, null, m\.ts, false, 0\)");
        Assert.AreEqual(1, adds.Count, "ONE quote-chat write: the plan's text, side and time");
        Assert.AreEqual("SDevSeedPlan.quoteRowIdFor(i, m.j)", adds[0].Groups[1].Value, "the writer takes the 16-byte id from quoteRowIdFor");
        Assert.AreEqual(1, Regex.Matches(s, @"foreach \(SDevSeedPlan\.QuoteMsg m in SDevSeedPlan\.quotePlan\(i\)\)").Count, "one loop over the plan");
        Assert.AreEqual(1, Regex.Matches(s, @"SDevSeedPlan\.quoteTopUpAction\(presentIds\(friend\), i\)").Count, "the top-up rule of a present chat");
        Assert.AreEqual(1, Regex.Matches(all, @"status \+= "" "" \+ seedQuoteChat\(\);").Count, "seed(profile) calls it once, for both profiles");
    }
}
