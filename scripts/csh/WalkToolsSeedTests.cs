// ★ walktools item 4 (contract docs/contract-walktools.md I-4; MC n-20261122-devseed-voice-clips-not-playable) — the voice rows of the
// developer seed (Seed 55 = seed index 54) were refused by SingleChatPage.onVoicePlay ("ixian:voiceplay: the id is not usable"): the
// seed wrote 32-byte SHA-256 ids = 64 hex characters, isVoiceIdHex accepts at most 2 × CoreConfig.maxMessageIdSize = 32. The fix is on
// the SEED side: SDevSeedPlan.rowIdFor(i, m) = the first 16 bytes of messageIdFor(i, m.j) for a voice row (inline and file), the
// unchanged 32-byte id for every other row; the writer (SDevSeed.seedFileChats) and chatComplete / topUpAction use that ONE function.
// What CSH compiles: Spixi/Utils/SDevSeedPlan.cs (the pure plan file) — NOT Spixi/Utils/SDevSeed.cs (the app glue: Core, MAUI). The
// writer's use of rowIdFor is therefore checked by reading SDevSeed.cs as TEXT (test 6) and by pins-filewalk/a-file-seed.
// DELIBERATE BREAKS (one per test; each turns its own test red — ① also turns test ④ red, because with 32 the new voice id IS the old one):
//   ① SDevSeedPlan.RealMessageIdLength 16 → 32 ............................ voice_row_ids_are_16_bytes_and_pass_the_play_check
//   ② rowIdFor's early-return condition gets "&& m.j < 0" (every row cut) ... non_voice_rows_keep_their_32_byte_id
//   ③ messageIdFor: ":" + j → ":" + (j % 10) (ids collide) ................. all_file_chat_ids_are_distinct
//   ④ chatComplete: rowIdFor(...) back to messageIdFor(...) ................. a_present_chat_skips_the_new_ids_and_refuses_the_old_32_byte_ones
//   ⑤ rowIdFor: Array.Copy(full, 0, ...) → Array.Copy(full, 1, ...) ......... a_voice_row_id_is_a_prefix_of_the_old_id
//   ⑥ SDevSeed.cs: the file-chat writer back to messageIdFor(i, m.j) ........ the_writer_uses_rowIdFor
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class WalkToolsSeedTests
{
    private static string hex(byte[] b) => string.Concat(b.Select(x => x.ToString("x2")));
    private static readonly int[] Chats = { 53, 54, 55 };
    private static bool isVoice(SDevSeedPlan.FileMsg m) => m.kind == SDevSeedPlan.KindVoiceInline || m.kind == SDevSeedPlan.KindVoiceFile;

    /** A COPY of SingleChatPage.isVoiceIdHex (Spixi/Pages/Chat/SingleChatPage.xaml.cs:8743) with CoreConfig.maxMessageIdSize = 16
     *  (Ixian-Core Meta/CoreConfig.cs:240): an even number of hex digits, 2 .. 2 × 16. THIS COPY MUST FOLLOW THE RULE of the chat page —
     *  when isVoiceIdHex or maxMessageIdSize changes, change this copy in the same commit. */
    private static bool isVoiceIdHexCopy(string? s)
    {
        const int maxMessageIdSize = 16;
        if (s == null || s.Length < 2 || s.Length % 2 != 0 || s.Length > 2 * maxMessageIdSize)
        {
            return false;
        }
        foreach (char c in s)
        {
            bool h = (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
            if (!h)
            {
                return false;
            }
        }
        return true;
    }

    [TestMethod]
    public void voice_row_ids_are_16_bytes_and_pass_the_play_check()
    {
        // the copy itself: the old 64-hex id is refused (the bug), a 16-byte id is accepted
        Assert.IsFalse(isVoiceIdHexCopy(hex(SDevSeedPlan.messageIdFor(54, 1))), "the OLD 32-byte id fails the copied rule (the bug of Seed 55)");
        Assert.IsTrue(isVoiceIdHexCopy(new string('a', 32)) && !isVoiceIdHexCopy(new string('a', 34)) && !isVoiceIdHexCopy("abc") && !isVoiceIdHexCopy("zz"), "the copied rule: even hex, at most 32 characters");
        var voice = SDevSeedPlan.filePlan(SDevSeedPlan.VoiceChat).Where(isVoice).ToList();
        Assert.AreEqual(20, voice.Count, "Seed 55 holds 16 inline + 4 file voice rows");
        Assert.AreEqual(16, voice.Count(m => m.kind == SDevSeedPlan.KindVoiceInline), "16 inline");
        Assert.AreEqual(4, voice.Count(m => m.kind == SDevSeedPlan.KindVoiceFile), "4 file");
        foreach (var m in voice)
        {
            byte[] id = SDevSeedPlan.rowIdFor(SDevSeedPlan.VoiceChat, m);
            Assert.AreEqual(16, id.Length, "voice row " + m.j + ": 16 bytes (the length of a real message id)");
            Assert.IsTrue(isVoiceIdHexCopy(hex(id)), "voice row " + m.j + ": passes the copy of isVoiceIdHex");
        }
        Assert.AreEqual(16, SDevSeedPlan.RealMessageIdLength, "the constant is Core's maxMessageIdSize");
    }

    [TestMethod]
    public void non_voice_rows_keep_their_32_byte_id()
    {
        int n = 0;
        foreach (int i in Chats)
        {
            foreach (var m in SDevSeedPlan.filePlan(i).Where(x => !isVoice(x)))
            {
                byte[] id = SDevSeedPlan.rowIdFor(i, m);
                Assert.AreEqual(32, id.Length, "row " + i + ":" + m.j + " (" + m.kind + ") stays 32 bytes");
                Assert.IsTrue(SDevSeedPlan.messageIdFor(i, m.j).SequenceEqual(id), "row " + i + ":" + m.j + " (" + m.kind + ") = messageIdFor(i, j), unchanged");
                n++;
            }
        }
        Assert.IsTrue(n > 100, "the documents, the voice chat's text rows and the 100-message photo chat were all looked at (" + n + ")");
        // the frozen sample of the base: Seed 01's first row id (the text seed) and a photo-chat row are not touched by this item
        Assert.AreEqual("7e182b7270ce61b5dfd2c53ba879f2c6c5e2539412dfae49b28ceca8e1737dac", hex(SDevSeedPlan.messageIdFor(0, 0)), "id 0:0 (Seed 01) unchanged");
    }

    [TestMethod]
    public void all_file_chat_ids_are_distinct()
    {
        var all = new HashSet<string>();
        int n = 0;
        foreach (int i in Chats)
        {
            foreach (var m in SDevSeedPlan.filePlan(i))
            {
                Assert.IsTrue(all.Add(hex(SDevSeedPlan.rowIdFor(i, m))), "id of " + i + ":" + m.j + " is distinct");
                n++;
            }
        }
        Assert.AreEqual(all.Count, n, "one id per row over the three file chats");
        // a 16-byte id also never equals the 16-byte head of ANOTHER row's id (no accidental prefix pair)
        var heads = new HashSet<string>(Chats.SelectMany(i => SDevSeedPlan.filePlan(i).Select(m => hex(SDevSeedPlan.rowIdFor(i, m)).Substring(0, 32))));
        Assert.AreEqual(n, heads.Count, "the 16-byte heads are distinct too");
    }

    [TestMethod]
    public void a_present_chat_skips_the_new_ids_and_refuses_the_old_32_byte_ones()
    {
        int i = SDevSeedPlan.VoiceChat;
        var plan = SDevSeedPlan.filePlan(i);
        var newest = plan[plan.Count - 1];
        Assert.IsTrue(isVoice(newest), "the NEWEST row of Seed 55 is a voice row (so an old seed's newest id is a 32-byte id the new check does not recognise)");
        var newIds = plan.Select(m => (byte[]?)SDevSeedPlan.rowIdFor(i, m)).ToList();
        var oldIds = plan.Select(m => (byte[]?)SDevSeedPlan.messageIdFor(i, m.j)).ToList();   // what a phone that holds the OLD seed has
        // a list with the NEW newest id → skip
        Assert.IsTrue(SDevSeedPlan.chatComplete(newIds, i), "all new ids → complete");
        Assert.AreEqual(SDevSeedPlan.TopUpSkip, SDevSeedPlan.topUpAction(newIds, i), "the NEW newest id → skip");
        Assert.AreEqual(SDevSeedPlan.TopUpSkip, SDevSeedPlan.topUpAction(newIds.Skip(Math.Max(0, newIds.Count - 51)).ToList(), i), "the NEW newest id in a 51-row window → skip");
        // a list with only the OLD 32-byte newest voice id → partial (fail closed: "Remove the seed, then Seed")
        var onlyOldNewest = new List<byte[]?> { SDevSeedPlan.messageIdFor(i, newest.j) };
        Assert.IsFalse(SDevSeedPlan.chatComplete(onlyOldNewest, i), "only the OLD 32-byte newest voice id → not complete");
        Assert.AreEqual(SDevSeedPlan.TopUpPartial, SDevSeedPlan.topUpAction(onlyOldNewest, i), "only the OLD 32-byte newest voice id → partial");
        Assert.AreEqual(SDevSeedPlan.TopUpPartial, SDevSeedPlan.topUpAction(oldIds, i), "the whole OLD seed of Seed 55 → partial");
        // empty → write
        Assert.AreEqual(SDevSeedPlan.TopUpWrite, SDevSeedPlan.topUpAction(new List<byte[]?>(), i), "an EMPTY list → write");
        // the two other file chats end on a NON-voice row: their old seed stays 'complete' (their ids did not change)
        foreach (int other in new[] { 53, 55 })
        {
            var op = SDevSeedPlan.filePlan(other);
            Assert.IsFalse(isVoice(op[op.Count - 1]), "the newest row of chat " + other + " is not a voice row");
            Assert.AreEqual(SDevSeedPlan.TopUpSkip, SDevSeedPlan.topUpAction(op.Select(m => (byte[]?)SDevSeedPlan.messageIdFor(other, m.j)).ToList(), other), "chat " + other + ": its OLD seed (messageIdFor) → skip");   // ★ #46 r1 (C-5): the OLD ids, as the comment says
        }
    }

    [TestMethod]
    public void a_voice_row_id_is_a_prefix_of_the_old_id()
    {
        int n = 0;
        foreach (int i in Chats)
        {
            foreach (var m in SDevSeedPlan.filePlan(i).Where(isVoice))
            {
                byte[] full = SDevSeedPlan.messageIdFor(i, m.j);
                byte[] id = SDevSeedPlan.rowIdFor(i, m);
                Assert.IsTrue(id.Length >= 1 && id.Length <= full.Length, "a prefix has a length");
                Assert.IsTrue(full.Take(id.Length).SequenceEqual(id), "rowIdFor(" + i + ", " + m.j + ") is the head of messageIdFor(" + i + ", " + m.j + ")");
                n++;
            }
        }
        Assert.AreEqual(20, n, "the 20 voice rows of Seed 55 (no other chat has one)");
    }

    private static string seedSource([System.Runtime.CompilerServices.CallerFilePath] string here = "")
    {
        // scripts/csh/WalkToolsSeedTests.cs → ../../Spixi/Utils/SDevSeed.cs (found beside this file at compile time)
        string path = Path.GetFullPath(Path.Combine(Path.GetDirectoryName(here)!, "..", "..", "Spixi", "Utils", "SDevSeed.cs"));
        return File.ReadAllText(path).Replace("\r", "");
    }

    [TestMethod]
    public void the_writer_uses_rowIdFor()
    {
        // CSH does not compile SDevSeed.cs (Core / MAUI glue): the writer is read as TEXT. seedFileChats' loop over filePlan(i) names its id first.
        string s = seedSource();
        var loops = Regex.Matches(s, @"foreach \(SDevSeedPlan\.FileMsg m in SDevSeedPlan\.filePlan\(i\)\)\s*\{\s*byte\[\] id = ([^;]+);");
        Assert.AreEqual(1, loops.Count, "exactly one file-chat writer loop names `byte[] id` (the unseed loop has none)");
        Assert.AreEqual("SDevSeedPlan.rowIdFor(i, m)", loops[0].Groups[1].Value.Split("//")[0].Trim(), "the writer takes the id from rowIdFor, not messageIdFor");
        Assert.AreEqual(1, Regex.Matches(s, @"SDevSeedPlan\.rowIdFor\(").Count, "rowIdFor is called in ONE place of SDevSeed.cs");
        // the image chats and the text seed keep the SHA-256 id (Seed 01–53 untouched)
        Assert.AreEqual(1, Regex.Matches(s, @"byte\[\] id = messageIdFor\(i, m\.j\);").Count, "the image chats' writer still uses messageIdFor(i, m.j)");
        Assert.AreEqual(1, Regex.Matches(s, @"FriendList\.addMessageWithType\(messageIdFor\(i, j\), FriendMessageType\.standard").Count, "the text seed (Seed 01–50) still uses messageIdFor(i, j)");
    }
}
