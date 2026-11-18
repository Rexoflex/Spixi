// ★ filewalk seed (contract docs/contract-filewalk.md § 3.1) — the file chats' pure half (Spixi/Utils/SDevSeedPlan.cs § 3), EXECUTED.
// Seed index 53 = documents, 54 = voice, 55 = the 100-message photo chat. What it holds: the plan's shapes and counts (≤ MaxPlan);
// every name from (i, j) only and inside its folder rule; the FIXED times (strictly increasing, below the image chats, older than
// seedFloor of every run after 2026-01-31); the bytes deterministic and of the planned length; the inline voice text passes
// VoiceCodec.tryParseInline with the planned duration and the voice file VoiceCodec.tryDemuxOgg; the content proof
// (fileState / fileAction / mayDelete) for the new files in a model of the three folders; the temp leaves differ from every
// image-seed temp; Seed 01–53 keep their values (PerfB1SeedTests stays green untouched; the frozen samples below are from the base).
// DELIBERATE BREAKS (the filewalk report): ① the "filetmp:" salt → "tmp:" in fileTmpLeaf → the_temp_leaves_are_their_own fails;
// ② GapSeconds use dropped from filePlan (at -= 1) → file_chat_times_are_fixed_and_below_the_image_chats fails.
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class FileWalkSeedTests
{
    private static string hex(byte[] b) => string.Concat(b.Select(x => x.ToString("x2")));
    private static readonly int[] Chats = { 53, 54, 55 };
    private static IEnumerable<(int i, SDevSeedPlan.FileMsg m)> allFiles() =>
        Chats.SelectMany(i => SDevSeedPlan.filePlan(i).Where(SDevSeedPlan.hasFile).Select(m => (i, m)));

    [TestMethod]
    public void file_chats_follow_the_image_chats_and_seed_01_53_stay()
    {
        Assert.AreEqual(50, SDevSeedPlan.ImageChatFirst, "the image chats still start at 50");
        Assert.AreEqual(3, SDevSeedPlan.ImageChats, "three image chats");
        Assert.AreEqual(53, SDevSeedPlan.FileChatFirst, "the first file chat = seed index 53 (Seed 54)");
        Assert.AreEqual(SDevSeedPlan.ImageChatFirst + SDevSeedPlan.ImageChats, SDevSeedPlan.FileChatFirst, "the file chats follow the image chats WITHOUT a gap (unseed's ONE loop 0 … FileChatFirst + FileChats − 1 removes every seed contact)");
        Assert.AreEqual(SDevSeedPlan.Count, SDevSeedPlan.ImageChatFirst, "the image chats follow the fifty without a gap");
        Assert.AreEqual(3, SDevSeedPlan.FileChats, "three file chats");
        Assert.AreEqual("53,54,55", SDevSeedPlan.DocChat + "," + SDevSeedPlan.VoiceChat + "," + SDevSeedPlan.PhotoChat, "documents, voice, photos");
        Assert.IsFalse(SDevSeedPlan.isFileChat(52) || SDevSeedPlan.isFileChat(56) || SDevSeedPlan.isImageChat(53), "only 53–55");
        Assert.AreEqual(0, SDevSeedPlan.filePlan(52).Count + SDevSeedPlan.filePlan(56).Count + SDevSeedPlan.imagePlan(53).Count, "no plan outside");
        Assert.AreEqual("Seed 54 Tjaša Kranjc", SDevSeedPlan.fileNick(53), "nick 53");
        Assert.AreEqual("Seed 55 Rok Mlinar", SDevSeedPlan.fileNick(54), "nick 54");
        Assert.AreEqual("Seed 56 Maja Debeljak", SDevSeedPlan.fileNick(55), "nick 55");
        bool threw = false;
        try { SDevSeedPlan.fileNick(52); } catch (ArgumentOutOfRangeException) { threw = true; }
        Assert.IsTrue(threw, "no file nick for an image chat");
        // Seed 01–53 values as the base made them (samples; PerfB1SeedTests holds the rest)
        Assert.AreEqual("7e182b7270ce61b5dfd2c53ba879f2c6c5e2539412dfae49b28ceca8e1737dac", hex(SDevSeedPlan.messageIdFor(0, 0)), "id 0:0");
        Assert.AreEqual("0062956f512ce5e4d3fa8614c3896f9128ddad1fbba0b39e1478c2a356e6c719ec", hex(SDevSeedPlan.addressBytes(0)), "Seed 01");
        Assert.AreEqual("24,16,30", string.Join(",", new[] { 50, 51, 52 }.Select(i => SDevSeedPlan.imagePlan(i).Count)), "the image plans");
        Assert.AreEqual(SDevSeedPlan.ImageAnchor, SDevSeedPlan.imagePlan(50).Last().ts, "the image anchor");
        var addr = new HashSet<string>();
        for (int i = 0; i < 56; i++) Assert.IsTrue(addr.Add(hex(SDevSeedPlan.addressBytes(i))), "address " + i + " is unique");
    }

    [TestMethod]
    public void the_plans_have_their_shapes_and_counts()
    {
        foreach (int i in Chats)
        {
            var l = SDevSeedPlan.filePlan(i);
            Assert.IsTrue(l.Count <= SDevSeedPlan.MaxPlan, "inside Core's in-memory window " + i);
            for (int x = 0; x < l.Count; x++)
            {
                var m = l[x];
                Assert.AreEqual(x, m.j, "j = the position " + i);
                bool known = m.kind == SDevSeedPlan.KindText || m.kind == SDevSeedPlan.KindDoc || m.kind == SDevSeedPlan.KindVoiceInline
                    || m.kind == SDevSeedPlan.KindVoiceFile || m.kind == SDevSeedPlan.KindPhoto;
                Assert.IsTrue(known, "a known kind " + i + ":" + x);
                Assert.AreEqual(m.kind == SDevSeedPlan.KindText, m.text.Length > 0, "a text row has text, no other row has " + i + ":" + x);
                Assert.IsFalse(PhotoRules.isVideoName("x" + m.ext), "no video row (#1607) " + i + ":" + x);
            }
        }
        // 53 = documents
        var d = SDevSeedPlan.filePlan(53);
        var docs = d.Where(m => m.kind == SDevSeedPlan.KindDoc).ToList();
        Assert.AreEqual("31,20,11", d.Count + "," + docs.Count + "," + d.Count(m => m.kind == SDevSeedPlan.KindText), "documents: 31 messages, 20 files, 11 texts");
        Assert.IsTrue(d.Count <= 40, "≤ 40 messages");
        string[] kinds = { ".pdf", ".docx", ".xlsx", ".pptx", ".txt", ".csv", ".zip", ".odt", ".epub", ".mp3" };
        foreach (string k in kinds)
        {
            Assert.AreEqual("1,1", docs.Count(m => m.ext == k && !m.local) + "," + docs.Count(m => m.ext == k && m.local), "kind " + k + ": once received, once sent");
        }
        Assert.AreEqual(kinds.Length, docs.Select(m => m.ext).Distinct().Count(), "exactly the ten kinds");
        Assert.IsTrue(docs.Min(m => m.length) >= 2000 && docs.Min(m => m.length) <= 2100, "the smallest ≈ 2 KB (" + docs.Min(m => m.length) + ")");
        Assert.IsTrue(docs.Max(m => m.length) >= 5500000 && docs.Max(m => m.length) <= 6000000, "the largest ≈ 6 MB (" + docs.Max(m => m.length) + ")");
        long total = docs.Sum(m => m.length);
        Assert.IsTrue(total <= SDevSeedPlan.DocTotalMax && SDevSeedPlan.DocTotalMax == 25000000, "≤ 25 MB in all (" + total + ")");
        Assert.AreEqual(24469448L, total, "the planned total");
        Assert.IsTrue(d.Zip(d.Skip(1), (a, b) => a.kind == SDevSeedPlan.KindText || b.kind == SDevSeedPlan.KindText).Count(x => x) >= 20, "text rows sit between the files");
        // 54 = voice
        var v = SDevSeedPlan.filePlan(54);
        var inl = v.Where(m => m.kind == SDevSeedPlan.KindVoiceInline).ToList();
        var vf = v.Where(m => m.kind == SDevSeedPlan.KindVoiceFile).ToList();
        Assert.AreEqual("30,16,4,10", v.Count + "," + inl.Count + "," + vf.Count + "," + v.Count(m => m.kind == SDevSeedPlan.KindText), "voice: 30 messages, 16 inline, 4 files, 10 texts");
        Assert.AreEqual("8,8,2,2", inl.Count(m => !m.local) + "," + inl.Count(m => m.local) + "," + vf.Count(m => !m.local) + "," + vf.Count(m => m.local), "received and sent of each");
        Assert.IsTrue(inl.Concat(vf).All(m => m.seconds >= 1 && m.seconds * 1000 <= VoiceCodec.MaxDurationMs), "1–30 s (the recorder's limit)");
        Assert.AreEqual(30, VoiceCodec.MaxDurationMs / 1000, "the app's limit is 30 s");
        Assert.IsTrue(inl.Min(m => m.seconds) == 1 && inl.Max(m => m.seconds) == 30, "both ends of the range: 1 s and 30 s");
        Assert.IsTrue(vf.All(m => m.ext == ".ogg"), "voice files are .ogg");
        // 55 = photos
        var p = SDevSeedPlan.filePlan(55);
        var ph = p.Where(m => m.kind == SDevSeedPlan.KindPhoto).ToList();
        Assert.AreEqual(SDevSeedPlan.MaxPlan, p.Count, "exactly MaxPlan = 100 messages");
        Assert.AreEqual("96,48,48,4", ph.Count + "," + ph.Count(m => !m.local) + "," + ph.Count(m => m.local) + "," + p.Count(m => m.kind == SDevSeedPlan.KindText), "96 photos (48 / 48) + 4 texts");
        var sizes = new HashSet<string> { "1024x768", "640x480", "768x1024", "800x600", "1280x960", "480x640", "960x720", "600x800" };
        Assert.IsTrue(ph.All(m => m.ext == ".png" && sizes.Contains(m.width + "x" + m.height)), "the image seed's size cycle");
        Assert.AreEqual(8, ph.Select(m => m.width + "x" + m.height).Distinct().Count(), "every size of the cycle");
    }

    [TestMethod]
    public void file_chat_times_are_fixed_and_below_the_image_chats()
    {
        string at() => string.Join("|", Chats.SelectMany(i => SDevSeedPlan.filePlan(i).Select(m => i + ":" + m.j + ":" + m.ts)));
        Assert.AreEqual(at(), at(), "a pure function: the same times on every call (= on every seed of every day)");
        long minImage = new[] { 50, 51, 52 }.Min(i => SDevSeedPlan.imagePlan(i).Min(m => m.ts));
        long prevNewest = long.MaxValue;
        foreach (int i in Chats)
        {
            var l = SDevSeedPlan.filePlan(i);
            Assert.AreEqual(SDevSeedPlan.ImageAnchor - (3 + i - 53) * 3600L, l[l.Count - 1].ts, "the newest of " + i + " = the anchor − " + (3 + i - 53) + " h");
            for (int x = 1; x < l.Count; x++) Assert.AreEqual(SDevSeedPlan.GapSeconds, l[x].ts - l[x - 1].ts, "GapSeconds before " + i + ":" + x);
            Assert.IsTrue(l[l.Count - 1].ts < prevNewest, "Seed 54 above Seed 55 above Seed 56");
            prevNewest = l[l.Count - 1].ts;
            Assert.IsTrue(l.Max(m => m.ts) < minImage, "every file-chat message is older than every image-chat message " + i);
        }
        long[] days = { 1769904000L /* 2026-02-01 */, 1780000000, 4102444800L /* 2100-01-01 */ };
        long maxFile = Chats.Max(i => SDevSeedPlan.filePlan(i).Max(m => m.ts));
        foreach (long now in days)
        {
            Assert.IsTrue(maxFile < SDevSeedPlan.seedFloor(now), "older than seedFloor of a run on day " + now);
        }
        Assert.IsTrue(Chats.Min(i => SDevSeedPlan.filePlan(i).Min(m => m.ts)) > SDevSeedPlan.ImageAnchor - 10 * 3600L, "all within the anchor day's last ten hours");
    }

    [TestMethod]
    public void names_are_built_from_i_and_j_only_and_inside_their_folder_rule()
    {
        var ids = new HashSet<string>();
        for (int i = 0; i < 50; i++) for (int j = 0; j < 1000; j++) ids.Add(hex(SDevSeedPlan.messageIdFor(i, j)));
        for (int i = 50; i < 53; i++) foreach (var m in SDevSeedPlan.imagePlan(i)) ids.Add(hex(SDevSeedPlan.messageIdFor(i, m.j)));
        var uids = new HashSet<string>();
        for (int i = 50; i < 53; i++) foreach (var m in SDevSeedPlan.imagePlan(i).Where(q => q.photo)) uids.Add(SDevSeedPlan.transferUid(i, m.j));
        var leaves = new Dictionary<string, HashSet<string>> { [SDevSeedPlan.FolderSent] = new(), [SDevSeedPlan.FolderVoice] = new(), [SDevSeedPlan.FolderDownloads] = new() };
        int n = 0;
        foreach (int i in Chats)
        {
            foreach (var m in SDevSeedPlan.filePlan(i))
            {
                Assert.IsTrue(ids.Add(hex(SDevSeedPlan.messageIdFor(i, m.j))), "a new message id " + i + ":" + m.j);
                if (!SDevSeedPlan.hasFile(m))
                {
                    Assert.AreEqual("", SDevSeedPlan.folderOf(m), "no folder for a row without a file");
                    continue;
                }
                n++;
                string uid = SDevSeedPlan.transferUid(i, m.j);
                string leaf = SDevSeedPlan.fileLeaf(i, m);
                string folder = SDevSeedPlan.folderOf(m);
                string name = SDevSeedPlan.fileName(i, m);
                Assert.IsTrue(PhotoRules.isTransferUid(uid) && uids.Add(uid), "a unique 32-hex transfer uid " + i + ":" + m.j);
                Assert.IsTrue(leaves[folder].Add(leaf), "a unique leaf in its folder " + i + ":" + m.j);
                Assert.IsTrue(leaf.IndexOfAny(new[] { '/', '\\', ':' }) < 0 && !leaf.Contains(".."), "a plain leaf " + leaf);
                Assert.IsTrue(SDevSeedPlan.leafShapeOk(i, m, leaf), "the leaf passes its folder rule " + i + ":" + m.j);
                Assert.AreEqual(PhotoRules.SafeFileName(name), name, "the receive sanitizer keeps the header name " + i + ":" + m.j);
                Assert.AreEqual(m.ext, PhotoRules.sentExtension(leaf), "an allow-listed extension " + i + ":" + m.j);
                if (m.kind == SDevSeedPlan.KindVoiceFile)
                {
                    Assert.AreEqual(m.local ? SDevSeedPlan.FolderVoice : SDevSeedPlan.FolderDownloads, folder, "a sent voice file → Voice/, a received one → Downloads/");
                    Assert.AreEqual(VoiceCodec.voiceFileName(DateTimeOffset.FromUnixTimeSeconds(m.ts).UtcDateTime), leaf, "the voice name of the row's fixed time");
                    Assert.IsTrue(VoiceCodec.isVoiceFileName(leaf) && leaf.StartsWith("voice-20260101-", StringComparison.Ordinal), "the app's voice-name rule " + leaf);
                }
                else if (m.local)
                {
                    Assert.AreEqual(SDevSeedPlan.FolderSent, folder, "a sent document or photo → Sent/");
                    Assert.AreEqual(PhotoRules.sentFileName(uid, m.ext), leaf, "PhotoRules.sentFileName agrees " + i + ":" + m.j);
                    Assert.IsTrue(PhotoRules.isSentCopyName(leaf) && PhotoRules.sentLeafOf("/data/u/Sent/" + leaf) == leaf, "the Sent sweep counts it as named by its row " + leaf);
                    Assert.AreEqual(string.Format("devseed-{0:00}-{1:000}{2}", i + 1, m.j, m.ext), name, "the header name");
                }
                else
                {
                    Assert.AreEqual(SDevSeedPlan.FolderDownloads, folder, "a received file → Downloads/");
                    Assert.AreEqual(string.Format("devseed-{0:00}-{1:000}{2}", i + 1, m.j, m.ext), leaf, "a received copy = devseed-NN-jjj.ext");
                }
                Assert.AreEqual(uid + ":" + name + (m.local ? "" : ":" + SDevSeedPlan.fileLength(m)), SDevSeedPlan.fileHeaderText(i, m), "the header row " + i + ":" + m.j);
                // fail closed: another leaf, another extension, null
                Assert.IsFalse(SDevSeedPlan.leafShapeOk(i, m, null) || SDevSeedPlan.leafShapeOk(i, m, leaf + "x") || SDevSeedPlan.leafShapeOk(i, m, "../" + leaf), "only the planned leaf " + i + ":" + m.j);
                var bad = new SDevSeedPlan.FileMsg { j = m.j, kind = m.kind, local = m.local, ext = ".exe", length = m.length, seconds = m.seconds, width = m.width, height = m.height, ts = m.ts };
                Assert.IsFalse(SDevSeedPlan.leafShapeOk(i, bad, SDevSeedPlan.fileLeaf(i, bad)), "a not allow-listed extension is refused " + i + ":" + m.j);
                var vid = new SDevSeedPlan.FileMsg { j = m.j, kind = SDevSeedPlan.KindDoc, local = false, ext = ".mp4", length = 3000 };
                Assert.IsFalse(SDevSeedPlan.leafShapeOk(i, vid, SDevSeedPlan.fileLeaf(i, vid)), "a received video name is refused");
            }
        }
        Assert.AreEqual("20,4,96", allFiles().Count(x => x.m.kind == SDevSeedPlan.KindDoc) + "," + allFiles().Count(x => x.m.kind == SDevSeedPlan.KindVoiceFile) + "," + allFiles().Count(x => x.m.kind == SDevSeedPlan.KindPhoto), "120 files");
        Assert.AreEqual(120, n, "120 file rows");
        Assert.AreEqual(string.Join("|", allFiles().Select(x => SDevSeedPlan.fileLeaf(x.i, x.m))), string.Join("|", allFiles().Select(x => SDevSeedPlan.fileLeaf(x.i, x.m))), "deterministic names");
        Assert.AreEqual("Voice", SDevSeedPlan.VoiceFolderName, "the app's Voice folder literal");
    }

    [TestMethod]
    public void the_bytes_are_deterministic_and_of_the_planned_length()
    {
        byte[] head = SDevSeedPlan.docHead(53, 3);
        Assert.AreEqual("Spixi developer seed file 54:003\n", Encoding.ASCII.GetString(head), "the head line");
        long total = 0;
        foreach (var (i, m) in allFiles())
        {
            byte[] b = SDevSeedPlan.fileBytes(i, m);
            Assert.AreEqual(SDevSeedPlan.fileLength(m), (long)b.Length, "fileLength = the length " + i + ":" + m.j);
            total += b.Length;
            if (m.kind == SDevSeedPlan.KindDoc)
            {
                Assert.AreEqual(m.length, (long)b.Length, "the planned length " + i + ":" + m.j);
                byte[] h = SDevSeedPlan.docHead(i, m.j);
                Assert.IsTrue(b.Take(h.Length).SequenceEqual(h), "starts with its head line " + i + ":" + m.j);
                Assert.IsTrue(b.Skip(h.Length).Take(4096).Distinct().Count() > 200, "the filler is not flat " + i + ":" + m.j);
                Assert.IsTrue(SDevSeedPlan.isOurs(b, SDevSeedPlan.docBytes(i, m.j, m.length)), "deterministic " + i + ":" + m.j);
            }
            if (m.kind == SDevSeedPlan.KindPhoto)
            {
                Assert.IsTrue(b.SequenceEqual(SDevSeedPlan.png(i, m.j, m.width, m.height)) && ImageSniff.looksLikeImage(b.Take(16).ToArray()), "the photo is png(i, j, w, h) " + i + ":" + m.j);
            }
        }
        Assert.IsTrue(total > 80L * 1024 * 1024 && total < 100L * 1024 * 1024, "all 120 files ≈ 80–100 MB on disk (" + total + ")");
        // the filler depends on (i, j) and the length only; a longer document starts with the shorter one
        byte[] a = SDevSeedPlan.docBytes(53, 1, 5000), a2 = SDevSeedPlan.docBytes(53, 1, 9000), c = SDevSeedPlan.docBytes(53, 2, 5000);
        Assert.IsTrue(a2.Take(5000).SequenceEqual(a) && !a.SequenceEqual(c), "a prefix of the same stream; another j, other bytes");
        Assert.IsTrue(SDevSeedPlan.isOurs(SDevSeedPlan.docBytes(53, 1, 5000), a), "the same call, the same bytes");
        bool threw = false;
        try { SDevSeedPlan.docBytes(53, 1, 10); } catch (ArgumentOutOfRangeException) { threw = true; }
        Assert.IsTrue(threw, "a length below the head line is refused");
    }

    [TestMethod]
    public void the_voice_rows_parse_with_the_planned_duration()
    {
        Assert.IsTrue(VoiceCodec.isOne20msFrame(0xF8), "F8 = one 20 ms frame (CELT, code 0)");
        Assert.AreEqual(50, SDevSeedPlan.VoicePacketsPerSecond, "50 packets a second");
        Assert.AreEqual(VoiceCodec.DefaultPreSkip, SDevSeedPlan.VoicePreSkip, "the app's pre-skip (SingleChatPage.sendVoiceFile)");
        foreach (var m in SDevSeedPlan.filePlan(54))
        {
            if (m.kind == SDevSeedPlan.KindVoiceInline)
            {
                string t = SDevSeedPlan.rowText(m);
                Assert.IsTrue(VoiceCodec.tryParseInline(t, out int durMs, out List<byte[]>? packets) && packets != null, "the inline text parses " + m.j);
                Assert.AreEqual(m.seconds * 1000, durMs, "the planned duration " + m.j);
                Assert.AreEqual(m.seconds * 50, packets!.Count, "50 packets a second " + m.j);
                Assert.IsTrue(packets.All(q => q.SequenceEqual(new byte[] { 0xF8, 0xFF, 0xFE })), "every packet F8 FF FE " + m.j);
                Assert.IsTrue(VoiceCodec.tryPeekInline(t, out int peek) && peek == durMs, "the row peek agrees " + m.j);
                Assert.AreEqual(VoiceCodec.humanLine(durMs), VoiceCodec.firstLine(t), "line 1 = the readable line " + m.j);
                Assert.AreEqual(t, SDevSeedPlan.rowText(m), "deterministic " + m.j);
            }
            else if (m.kind == SDevSeedPlan.KindVoiceFile)
            {
                byte[] ogg = SDevSeedPlan.fileBytes(54, m);
                Assert.IsTrue(ogg.Length <= VoiceCodec.MaxOggBytes, "≤ 262 144 bytes " + m.j);
                Assert.AreEqual(SDevSeedPlan.oggLength(m.seconds * 50), (long)ogg.Length, "oggLength = muxOgg's length " + m.j);
                Assert.IsTrue(VoiceCodec.tryDemuxOgg(ogg, out List<byte[]>? packets, out int durMs) && packets != null, "the Ogg demuxes " + m.j);
                Assert.AreEqual(m.seconds * 1000, durMs, "the planned duration " + m.j);
                Assert.AreEqual(VoiceCodec.DefaultPreSkip, ogg[28 + 10] | (ogg[28 + 11] << 8), "OpusHead pre-skip = the app's " + m.j);
                Assert.AreEqual(SDevSeedPlan.oggSerial(54, m.j), (uint)(ogg[14] | ogg[15] << 8 | ogg[16] << 16 | ogg[17] << 24), "the plan's serial " + m.j);
                Assert.IsFalse(VoiceCodec.isSweepable(SDevSeedPlan.fileLeaf(54, m), ogg.Length, ogg.Take(4).ToArray(), 10L * 86400), "the Voice-folder sweep keeps it " + m.j);
                Assert.IsTrue(ogg.SequenceEqual(SDevSeedPlan.fileBytes(54, m)), "deterministic " + m.j);
            }
        }
        for (int s = 1; s <= 30; s++)
        {
            Assert.AreEqual(SDevSeedPlan.oggLength(s * 50), (long)VoiceCodec.muxOgg(SDevSeedPlan.voicePackets(s), 312, 7).Length, "oggLength " + s + " s");
        }
        bool threw = false;
        try { SDevSeedPlan.voicePackets(31); } catch (ArgumentOutOfRangeException) { threw = true; }
        Assert.IsTrue(threw, "31 s is above VoiceCodec.MaxDurationMs");
    }

    // a MODEL of SDevSeed's file-chat disk half (the same decisions: fileState / fileAction / mayDelete / mayDeleteFileTmp); keys are
    // "<folder>/<leaf>"; the temp goes to "sent/" for every folder
    private sealed class Disk
    {
        public Dictionary<string, byte[]> f = new Dictionary<string, byte[]>();
        public int reads;
        public List<string> deleted = new List<string>();
        public static string key(int i, SDevSeedPlan.FileMsg m) => SDevSeedPlan.folderOf(m) + "/" + SDevSeedPlan.fileLeaf(i, m);
        public string state(int i, SDevSeedPlan.FileMsg m)
        {
            string k = key(i, m);
            return SDevSeedPlan.fileState(f.ContainsKey(k), f.TryGetValue(k, out var b) ? b.Length : 0, SDevSeedPlan.fileLength(m),
                () => { reads++; return f[k]; }, () => SDevSeedPlan.fileBytes(i, m));
        }
        public int ensure(int i, SDevSeedPlan.FileMsg m)
        {
            if (!SDevSeedPlan.leafShapeOk(i, m, SDevSeedPlan.fileLeaf(i, m))) return -1;
            string act = SDevSeedPlan.fileAction(state(i, m));
            if (act == SDevSeedPlan.FileKeep) return 0;
            if (act != SDevSeedPlan.FileWrite) return -1;
            string tmp = "sent/" + SDevSeedPlan.fileTmpLeaf(i, m.j);
            f[tmp] = SDevSeedPlan.fileBytes(i, m);
            string k = key(i, m);
            if (f.ContainsKey(k)) { f.Remove(tmp); return -1; }
            f[k] = f[tmp];
            f.Remove(tmp);
            return state(i, m) == SDevSeedPlan.StateOurs ? 1 : -1;   // ★ #46 r1 S-S-1: the proof again after the move
        }
        public int unseedOne(int i, SDevSeedPlan.FileMsg m)
        {
            int n = 0;
            string tmpName = SDevSeedPlan.fileTmpLeaf(i, m.j);
            if (SDevSeedPlan.mayDeleteFileTmp(tmpName, i, m.j) && f.Remove("sent/" + tmpName)) { n++; deleted.Add("sent/" + tmpName); }
            string k = key(i, m);
            if (SDevSeedPlan.mayDelete(state(i, m))) { f.Remove(k); n++; deleted.Add(k); }
            return n;
        }
    }

    private static int[] seedOnce(Disk disk, HashSet<string> store)
    {
        int msgs = 0, files = 0, refused = 0;
        foreach (int i in Chats)
        {
            foreach (var m in SDevSeedPlan.filePlan(i))
            {
                if (SDevSeedPlan.hasFile(m))
                {
                    int w = disk.ensure(i, m);
                    if (w < 0) { refused++; continue; }
                    files += w;
                }
                if (store.Add(hex(SDevSeedPlan.messageIdFor(i, m.j)))) msgs++;
            }
        }
        return new[] { msgs, files, refused };
    }

    [TestMethod]
    public void the_content_proof_keeps_writes_refuses_and_deletes_the_new_files()
    {
        var disk = new Disk();
        var store = new HashSet<string>();
        int[] first = seedOnce(disk, store);
        Assert.AreEqual("161,120,0", first[0] + "," + first[1] + "," + first[2], "the first seed: 161 messages, 120 files");
        disk.reads = 0;
        int[] second = seedOnce(disk, store);
        Assert.AreEqual("0,0,0", second[0] + "," + second[1] + "," + second[2], "a second seed adds nothing");
        Assert.AreEqual(120, disk.reads, "the second seed PROVED all 120 files by content");
        Assert.AreEqual(120, disk.f.Count, "no temp, no second file");
        Assert.IsFalse(disk.f.Keys.Any(k => k.Contains("pending-")), "no temp left");
        int removed = 0;
        foreach (var (i, m) in allFiles()) removed += disk.unseedOne(i, m);
        Assert.AreEqual("120,0", removed + "," + disk.f.Count, "unseed removes the 120 files and nothing else");
    }

    [TestMethod]
    public void a_foreign_file_under_a_seed_name_is_never_written_over_adopted_or_deleted()
    {
        var disk = new Disk();
        var store = new HashSet<string>();
        var doc = SDevSeedPlan.filePlan(53).First(q => q.kind == SDevSeedPlan.KindDoc && !q.local);
        var sentDoc = SDevSeedPlan.filePlan(53).First(q => q.kind == SDevSeedPlan.KindDoc && q.local);
        var voice = SDevSeedPlan.filePlan(54).First(q => q.kind == SDevSeedPlan.KindVoiceFile && q.local);
        var photo = SDevSeedPlan.filePlan(55).First(q => q.kind == SDevSeedPlan.KindPhoto && !q.local);
        var foreign = new Dictionary<string, byte[]>();
        foreach (var (i, m) in new[] { (53, doc), (53, sentDoc), (54, voice), (55, photo) })
        {
            byte[] b = SDevSeedPlan.fileBytes(i, m).ToArray();
            b[b.Length / 2] ^= 0x01;   // our name, our length, one byte off
            foreign[Disk.key(i, m)] = b;
            disk.f[Disk.key(i, m)] = b;
        }
        disk.f["downloads/" + SDevSeedPlan.fileLeaf(53, SDevSeedPlan.filePlan(53).First(q => q.kind == SDevSeedPlan.KindDoc && !q.local && q.j != doc.j))] = new byte[] { 1, 2, 3 };   // another length
        disk.reads = 0;
        int[] first = seedOnce(disk, store);
        Assert.AreEqual(5, first[2], "five foreign files refused");
        Assert.AreEqual(4 + 115, disk.reads, "the four same-length foreign files were read (the other length was not) + the proof after each of the 115 moves (#46 r1 S-S-1)");
        Assert.AreEqual("156,115", first[0] + "," + first[1], "the other 115 files are written; the five foreign ones get no row");
        foreach (var kv in foreign) Assert.IsTrue(disk.f[kv.Key].SequenceEqual(kv.Value), "never written over " + kv.Key);
        Assert.IsFalse(store.Contains(hex(SDevSeedPlan.messageIdFor(53, doc.j))) || store.Contains(hex(SDevSeedPlan.messageIdFor(54, voice.j))), "never adopted (no row)");
        int removed = 0;
        foreach (var (i, m) in allFiles()) removed += disk.unseedOne(i, m);
        Assert.AreEqual(115, removed, "unseed deletes the 115 files that are ours");
        Assert.AreEqual(5, disk.f.Count, "the five foreign files are never deleted");
        foreach (var kv in foreign) Assert.IsTrue(disk.f[kv.Key].SequenceEqual(kv.Value), "still there " + kv.Key);
        // an account that never seeded: unseed deletes nothing
        var clean = new Disk();
        clean.f["downloads/devseed-54-001.pdf"] = new byte[] { 7 };
        clean.f["sent/pending-0123456789abcdef-0.src"] = new byte[] { 7 };
        foreach (var (i, m) in allFiles()) clean.unseedOne(i, m);
        Assert.AreEqual("2,0", clean.f.Count + "," + clean.deleted.Count, "nothing deleted on an account that never seeded");
    }

    [TestMethod]
    public void a_complete_chat_is_skipped_even_when_core_holds_only_its_last_51_rows()
    {
        // ★ #46 r1 C-S-1: after the chat page's loadMessages Core's list holds ~51 rows, so FriendList.cs:258 cannot refuse j 0..48 of the
        // 100-message chat; SDevSeedPlan.chatComplete looks for the plan's NEWEST id (the seed writes oldest first)
        foreach (int i in Chats)
        {
            var ids = SDevSeedPlan.filePlan(i).Select(m => (byte[]?)SDevSeedPlan.messageIdFor(i, m.j)).ToList();
            Assert.IsTrue(SDevSeedPlan.chatComplete(ids, i), "all ids → complete " + i);
            Assert.IsTrue(SDevSeedPlan.chatComplete(ids.Skip(Math.Max(0, ids.Count - 51)).ToList(), i), "the last 51 rows (loadMessages) → complete " + i);
            Assert.IsFalse(SDevSeedPlan.chatComplete(ids.Take(ids.Count - 1).ToList(), i), "the newest missing → a top-up " + i);
            Assert.IsFalse(SDevSeedPlan.chatComplete(new List<byte[]?>(), i) || SDevSeedPlan.chatComplete(new List<byte[]?> { null, new byte[] { 1 } }, i), "empty / foreign → not complete " + i);
            Assert.IsFalse(SDevSeedPlan.chatComplete(SDevSeedPlan.filePlan(i == 55 ? 53 : 55).Select(m => (byte[]?)SDevSeedPlan.messageIdFor(i == 55 ? 53 : 55, m.j)).ToList(), i), "another chat's ids → not complete " + i);
        }
        Assert.IsFalse(SDevSeedPlan.chatComplete(SDevSeedPlan.imagePlan(50).Select(m => (byte[]?)SDevSeedPlan.messageIdFor(50, m.j)).ToList(), 50), "not for an image chat");
        // a model of the re-seed after the chat was opened: Core holds the last 51 ids; the old top-up stored j 0..48 again, the skip stores none
        int i55 = 55;
        var plan = SDevSeedPlan.filePlan(i55);
        var core = new List<string>(plan.Skip(49).Select(m => hex(SDevSeedPlan.messageIdFor(i55, m.j))));
        int wouldAdd = plan.Count(m => !core.Contains(hex(SDevSeedPlan.messageIdFor(i55, m.j))));
        Assert.AreEqual(49, wouldAdd, "without the skip a re-seed would store 49 rows twice");
        bool skip = SDevSeedPlan.chatComplete(core.Select(h => (byte[]?)Convert.FromHexString(h)).ToList(), i55);
        Assert.IsTrue(skip, "with the skip it stores none");
    }

    [TestMethod]
    public void a_present_chat_is_written_only_when_empty_skipped_with_its_newest_row_and_partial_otherwise()
    {
        // ★ #46 r2 B2-5: never a top-up through Core's ~51-row window (fail closed)
        foreach (int i in Chats)
        {
            var ids = SDevSeedPlan.filePlan(i).Select(m => (byte[]?)SDevSeedPlan.messageIdFor(i, m.j)).ToList();
            var window = ids.Skip(Math.Max(0, ids.Count - 51)).ToList();
            Assert.AreEqual(SDevSeedPlan.TopUpWrite, SDevSeedPlan.topUpAction(new List<byte[]?>(), i), "an EMPTY list (never written) → write " + i);
            Assert.AreEqual(SDevSeedPlan.TopUpSkip, SDevSeedPlan.topUpAction(window, i), "the newest row in a 51-row window → skip " + i);
            var killed = ids.Take(ids.Count - 1).ToList();   // a killed / refused LAST write
            Assert.AreEqual(SDevSeedPlan.TopUpPartial, SDevSeedPlan.topUpAction(killed.Skip(Math.Max(0, killed.Count - 51)).ToList(), i), "the newest row absent in a 51-row window → partial (no write) " + i);
            var middle = ids.Where((_, x) => x != ids.Count / 2).ToList();   // a refused MIDDLE row: skipped, not written again
            Assert.AreEqual(SDevSeedPlan.TopUpSkip, SDevSeedPlan.topUpAction(middle, i), "a refused middle row: skipped (the status says 'with the newest row', not 'complete') " + i);
            Assert.AreEqual(SDevSeedPlan.TopUpPartial, SDevSeedPlan.topUpAction(null, i), "an unreadable list → partial " + i);
            Assert.AreEqual(SDevSeedPlan.TopUpPartial, SDevSeedPlan.topUpAction(new List<byte[]?> { new byte[] { 1 } }, i), "foreign rows only → partial " + i);
        }
        Assert.AreEqual(SDevSeedPlan.TopUpPartial, SDevSeedPlan.topUpAction(new List<byte[]?>(), 50), "not a file chat → partial");
        Assert.IsTrue(SDevSeedPlan.TopUpWrite != SDevSeedPlan.TopUpSkip && SDevSeedPlan.TopUpSkip != SDevSeedPlan.TopUpPartial && SDevSeedPlan.TopUpWrite != SDevSeedPlan.TopUpPartial, "three distinct actions");
    }

    [TestMethod]
    public void the_temp_leaves_are_their_own()
    {
        var image = new HashSet<string>();
        for (int i = 50; i < 53; i++) foreach (var m in SDevSeedPlan.imagePlan(i).Where(q => q.photo)) image.Add(SDevSeedPlan.tmpLeaf(i, m.j));
        var mine = new HashSet<string>();
        var finals = new HashSet<string>(allFiles().Select(x => SDevSeedPlan.fileLeaf(x.i, x.m)));
        foreach (var (i, m) in allFiles())
        {
            string t = SDevSeedPlan.fileTmpLeaf(i, m.j);
            Assert.IsTrue(PhotoRules.isPendingName(t) && t.EndsWith("-0.src") && !PhotoRules.isSentCopyName(t), "a pending-shaped temp leaf " + i + ":" + m.j);
            Assert.IsTrue(mine.Add(t) && !finals.Contains(t), "unique, never a final leaf " + i + ":" + m.j);
            Assert.IsFalse(image.Contains(t), "never an image-seed temp " + i + ":" + m.j);
            Assert.IsTrue(SDevSeedPlan.tmpLeaf(i, m.j) != t, "its own salt: not the image rule for the same (i, j) " + i + ":" + m.j);
            Assert.IsTrue(SDevSeedPlan.mayDeleteFileTmp(t, i, m.j) && !SDevSeedPlan.mayDeleteFileTmp(t, i, m.j + 1), "only its own (i, j)");
            Assert.IsFalse(SDevSeedPlan.mayDeleteTmp(t, i, m.j), "the image rule never deletes it");
        }
        Assert.AreEqual(120, mine.Count, "120 temp leaves");
        foreach (string t in image)
        {
            for (int i = 50; i < 56; i++) for (int j = 0; j < 100; j++) Assert.IsFalse(SDevSeedPlan.mayDeleteFileTmp(t, i, j), "an image-seed temp is never a file-chat temp");
        }
        Assert.IsFalse(SDevSeedPlan.mayDeleteFileTmp(null, 53, 0) || SDevSeedPlan.mayDeleteFileTmp("pending-0123456789abcdef-0.src", 53, 0)
            || SDevSeedPlan.mayDeleteFileTmp(SDevSeedPlan.fileTmpLeaf(53, 1), 50, 1), "null, a real pending photo, another chat: never ours");
        // a temp left by a kill is written over and the move goes through; the unseed clears a leftover by its exact name
        var disk = new Disk();
        var m0 = SDevSeedPlan.filePlan(54).First(q => q.kind == SDevSeedPlan.KindVoiceFile && q.local);
        string tmpKey = "sent/" + SDevSeedPlan.fileTmpLeaf(54, m0.j);
        disk.f[tmpKey] = new byte[] { 9, 9 };
        Assert.AreEqual(1, disk.ensure(54, m0), "written");
        Assert.IsFalse(disk.f.ContainsKey(tmpKey), "the temp was moved");
        Assert.IsTrue(SDevSeedPlan.isOurs(disk.f[Disk.key(54, m0)], SDevSeedPlan.fileBytes(54, m0)), "the moved file is ours");
        disk.f[tmpKey] = new byte[] { 9 };
        disk.unseedOne(54, m0);
        Assert.IsFalse(disk.f.ContainsKey(tmpKey) || disk.f.ContainsKey(Disk.key(54, m0)), "unseed deletes the temp by its exact name and the file by content");
    }
}
