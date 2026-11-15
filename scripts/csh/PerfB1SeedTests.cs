// ★ perfb1 seed (Speed batch 1a, item 4) — the dev seed's pure half (Spixi/Utils/SDevSeedPlan.cs), EXECUTED.
// (a) Seed 01–50 keep their ids, addresses, counts and times: the expected values below are FROZEN from the BASE code
//     (SDevSeed.cs at 7c19524: SHA-256 of "spixi-dev-seed:" + i [+ ":" + j], the count dial, the loop's time statements),
//     computed outside this code (sha256sum, shell arithmetic) — a one-token change to the salt or a derivation goes red here,
//     and scripts/pins-perfb1/e-image-seed.mjs holds SDevSeed.cs's own statements equal to the plan's.
// (b) the image chats are OLDER than every Seed 01–50 message; (c) they are seed index 50–52 with the album in 51;
// (d) the top-up rule (ids and names fixed, the file rule keep / write / refuse, first writer wins for the album).
// The PNG made in code is parsed back here: chunk CRCs, the zlib stream inflated by the BCL, the Adler-32, the size.
// DELIBERATE BREAKS (the perfb1 report): ① Salt "spixi-dev-seed:" → "spixi-dev-seed;" in SDevSeedPlan.cs →
// seed_01_50_ids_are_the_base_ids fails ("id 0:0"); ② the same token in SDevSeed.cs only → e-image-seed.mjs goes red.
using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Text;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;
using SPIXI.Meta;

[TestClass]
public class PerfB1SeedTests
{
    private static string hex(byte[] b) => string.Concat(b.Select(x => x.ToString("x2")));
    private const long Now = 1700000000;

    [TestMethod]
    public void seed_01_50_ids_are_the_base_ids()
    {
        Assert.AreEqual("spixi-dev-seed:", SDevSeedPlan.Salt, "the salt");
        var want = new Dictionary<string, string>
        {
            ["0:0"] = "7e182b7270ce61b5dfd2c53ba879f2c6c5e2539412dfae49b28ceca8e1737dac",
            ["0:999"] = "e1af51d3d2b5e8d4a2dc43530324f80c279e09b8a2aa0b0ea7464099df1287a3",
            ["1:0"] = "5b93589c493f25988cbfdcec826775ac3b6e35da487ed3e22757392ed7ad8773",
            ["0:1"] = "fe699b466437c378558095d29f5902356aa5c89381eadb3dd3979e324ff62979",   // ★ C-3 (E6): an id that no other sample reaches
            ["5:123"] = "b57ea0d94640f817e78584c735b4c6592eda78007529077d88e2ced973abdc50",
            ["9:0"] = "91a07500e88fb77503fd6163d553aa6bf602ad058b4d674cd447beae244b0e1e",
            ["9:999"] = "c118e0e46a635d33d515afc23685cbd041d6fe5e676d606b661fdca959e29fc4",
            ["10:0"] = "765b9505e55b38e382bdc2f55a60b636a8cb5813c351207b80e8b890acf1c625",
            ["10:39"] = "d9511c4b6bf7676ed6a20b9e41e808b75dcc472f3ee68cf3d3824c677d73ded9",
            ["11:39"] = "5907134cd7aa9a1168d22cbf34c9562428ac9ed29b8facbf3f1ae06a044117f0",
            ["49:0"] = "f45cd306865ff1985689cb7d2e395e8d9c343cd91066c0511c979caaced707b4",
            ["49:39"] = "f6f6f0c9203e51be9bb0ddfc35e7c4ff304c7bf73ac615d224199331d3485fd9",
        };
        foreach (var kv in want)
        {
            string[] p = kv.Key.Split(':');
            Assert.AreEqual(kv.Value, hex(SDevSeedPlan.messageIdFor(int.Parse(p[0]), int.Parse(p[1]))), "id " + kv.Key);
        }
    }

    [TestMethod]
    public void seed_01_50_addresses_are_the_base_addresses()
    {
        // the 33 raw bytes Core's Address is built from (version 0 + SHA-256); Core's base58 text is not in the harness
        Assert.AreEqual("0062956f512ce5e4d3fa8614c3896f9128ddad1fbba0b39e1478c2a356e6c719ec", hex(SDevSeedPlan.addressBytes(0)), "Seed 01 (i 0)");
        Assert.AreEqual("0063a222f6c66de67ed93865def3231e35890c4f4284215d26e600867f3b82b274", hex(SDevSeedPlan.addressBytes(9)), "Seed 10 (i 9)");
        Assert.AreEqual("00228ce3ee034c9699a51822cddec8278a93f138f313b6a36b6d4c498dfa3b7fe1", hex(SDevSeedPlan.addressBytes(49)), "Seed 50 (i 49)");
        var all = new HashSet<string>();
        for (int i = 0; i < SDevSeedPlan.ImageChatFirst + SDevSeedPlan.ImageChats; i++)
        {
            Assert.IsTrue(all.Add(hex(SDevSeedPlan.addressBytes(i))), "address " + i + " is unique");
        }
    }

    [TestMethod]
    public void seed_01_50_counts_are_the_base_counts()
    {
        Assert.AreEqual(50, SDevSeedPlan.Count, "Count");
        Assert.AreEqual(10, SDevSeedPlan.HeavyContacts, "HeavyContacts");
        Assert.AreEqual(1000, SDevSeedPlan.HeavyMessages, "HeavyMessages");
        Assert.AreEqual(40, SDevSeedPlan.MediumMessages, "MediumMessages");
        string light = string.Join(",", Enumerable.Range(0, 50).Select(i => SDevSeedPlan.countFor("light", i)));
        Assert.AreEqual("2,9,16,23,30,37,5,12,19,26,33,40,8,15,22,29,36,4,11,18,25,32,39,7,14,21,28,35,3,10,17,24,31,38,6,13,20,27,34,2,9,16,23,30,37,5,12,19,26,33", light, "light counts");
        Assert.AreEqual(1031, Enumerable.Range(0, 50).Sum(i => SDevSeedPlan.countFor("light", i)), "light total");
        Assert.AreEqual(11600, Enumerable.Range(0, 50).Sum(i => SDevSeedPlan.countFor("heavy", i)), "heavy total");
        Assert.AreEqual(1000, SDevSeedPlan.countFor("heavy", 9), "heavy Seed 10");
        Assert.AreEqual(40, SDevSeedPlan.countFor("heavy", 10), "heavy Seed 11");
        Assert.AreEqual(2, SDevSeedPlan.countFor("anything", 0), "not heavy = light");
        Assert.AreEqual("1,0,0,2,0,0,3,0,0,1", string.Join(",", Enumerable.Range(0, 10).Select(SDevSeedPlan.unreadTailFor)), "unread tails 0–9");
    }

    [TestMethod]
    public void seed_01_50_times_are_the_base_times()
    {
        // (profile, i, j) → (ts, local), now = 1700000000 — the base loop's statements, computed outside this code
        var cases = new (string p, int i, int j, long ts, bool local)[]
        {
            ("light", 0, 0, 1697408000, true), ("light", 0, 1, 1700000001, false), ("light", 1, 0, 1697411600, false),
            ("light", 1, 8, 1699709200, false), ("light", 11, 39, 1699932680, true), ("light", 12, 5, 1699041950, false),
            ("light", 12, 7, 1700000002, false), ("light", 49, 0, 1697411600, false),
            ("heavy", 0, 0, 1697408000, true), ("heavy", 0, 998, 1699990824, true), ("heavy", 0, 999, 1700000001, false),
            ("heavy", 9, 500, 1698718400, false), ("heavy", 10, 39, 1699932590, false), ("heavy", 49, 39, 1699931780, true),
            ("heavy", 48, 37, 1699802270, false),
        };
        foreach (var c in cases)
        {
            long ts = SDevSeedPlan.messageTime(Now, c.i, c.j, SDevSeedPlan.countFor(c.p, c.i), out bool local);
            Assert.AreEqual(c.ts, ts, "time " + c.p + " " + c.i + ":" + c.j);
            Assert.AreEqual(c.local, local, "direction " + c.p + " " + c.i + ":" + c.j);
        }
    }

    [TestMethod]
    public void image_chats_and_the_album_exist_in_the_plan()
    {
        Assert.AreEqual(50, SDevSeedPlan.ImageChatFirst, "the first image chat = seed index 50 (Seed 51)");
        Assert.AreEqual(3, SDevSeedPlan.ImageChats, "three image chats");
        Assert.AreEqual(51, SDevSeedPlan.AlbumChat, "the album chat = seed index 51 (Seed 52)");
        Assert.IsFalse(SDevSeedPlan.isImageChat(49) || SDevSeedPlan.isImageChat(53), "only 50–52");
        Assert.AreEqual(0, SDevSeedPlan.imagePlan(49).Count, "Seed 50 has no image plan");
        Assert.AreEqual("Seed 51 Petra Hočevar", SDevSeedPlan.imageNick(50), "nick 50");
        Assert.AreEqual("Seed 52 Gregor Zorman", SDevSeedPlan.imageNick(51), "nick 51");
        Assert.AreEqual("Seed 53 Alenka Bregar", SDevSeedPlan.imageNick(52), "nick 52");
        // (messages, photos, received photos, sent photos)
        var shape = new Dictionary<int, (int n, int ph, int rx, int tx)> { [50] = (24, 12, 6, 6), [51] = (16, 10, 7, 3), [52] = (30, 24, 12, 12) };
        foreach (var kv in shape)
        {
            var l = SDevSeedPlan.imagePlan(kv.Key);
            Assert.AreEqual(kv.Value.n, l.Count, "messages " + kv.Key);
            Assert.AreEqual(kv.Value.ph, l.Count(m => m.photo), "photos " + kv.Key);
            Assert.AreEqual(kv.Value.rx, l.Count(m => m.photo && !m.local), "received photos " + kv.Key);
            Assert.AreEqual(kv.Value.tx, l.Count(m => m.photo && m.local), "sent photos " + kv.Key);
            Assert.IsTrue(l.Count <= SDevSeedPlan.MaxPlan, "inside Core's in-memory window " + kv.Key);
            for (int x = 0; x < l.Count; x++)
            {
                Assert.AreEqual(x, l[x].j, "j = the position " + kv.Key);
                Assert.IsTrue(l[x].photo ? l[x].text.Length == 0 && l[x].width >= 480 && l[x].height >= 480 && l[x].width <= 1280 && l[x].height <= 1280
                    : l[x].text.Length > 0 && l[x].width == 0, "a photo has a size, a text has text " + kv.Key + ":" + x);
            }
            Assert.IsTrue(l.Any(m => m.photo && m.width > m.height) && l.Any(m => m.photo && m.width < m.height), "landscape and portrait " + kv.Key);
        }
        var album = SDevSeedPlan.imagePlan(51).Where(m => m.albumIndex >= 0).ToList();
        Assert.AreEqual("5,6,7,8,9,10", string.Join(",", album.Select(m => m.j)), "the album = j 5–10 of Seed 52, in a row");
        Assert.AreEqual("0,1,2,3,4,5", string.Join(",", album.Select(m => m.albumIndex)), "album indexes");
        Assert.IsTrue(album.All(m => m.albumCount == 6 && m.photo && !m.local), "6 received photos");
        Assert.IsTrue(SDevSeedPlan.imagePlan(50).Concat(SDevSeedPlan.imagePlan(52)).All(m => m.albumIndex < 0), "ONE album only");
        string gid = SDevSeedPlan.albumId(51);
        Assert.IsTrue(PhotoRules.isId16(gid), "the album id is a 16-hex group id");
        for (int a = 0; a < 6; a++)
        {
            string g = PhotoRules.groupArg(gid, a, 6, "");
            Assert.IsTrue(PhotoRules.parseGroupArg(g, out string pg, out int pi, out int pn, out string pc) && pg == gid && pi == a && pn == 6 && pc == "", "a valid group arg " + a);
        }
    }

    [TestMethod]
    public void image_chat_times_are_fixed_and_the_same_on_every_seed()
    {
        // ★ #46 r1 B-3: the image chats sit at ImageAnchor — a top-up on a LATER day cannot move them (before the fix their times were
        // `now − 60 d − k h` of the CURRENT run, while Seed 01–50 kept the stamps of the run that wrote them)
        Assert.AreEqual(1767268800L, SDevSeedPlan.ImageAnchor, "2026-01-01 12:00:00 UTC");
        Assert.AreEqual(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc), DateTimeOffset.FromUnixTimeSeconds(SDevSeedPlan.ImageAnchor).UtcDateTime, "the anchor is that day");
        string at() => string.Join("|", Enumerable.Range(50, 3).SelectMany(i => SDevSeedPlan.imagePlan(i).Select(m => i + ":" + m.j + ":" + m.ts)));
        Assert.AreEqual(at(), at(), "a pure function: the same times on every call (= on every seed of every day)");
        for (int i = 50; i < 53; i++)
        {
            var l = SDevSeedPlan.imagePlan(i);
            Assert.AreEqual(SDevSeedPlan.ImageAnchor - (i - 50) * 3600L, l[l.Count - 1].ts, "the newest message of " + i + " = the anchor − k hours");
            for (int x = 1; x < l.Count; x++) Assert.IsTrue(l[x].ts > l[x - 1].ts, "strictly increasing inside " + i + ":" + x);
        }
    }

    [TestMethod]
    public void image_chats_are_older_than_every_seed_message()
    {
        // a seed run is made on ANY day after 2026-01-31; the image chats were written by the same or ANOTHER run (a top-up on a later
        // day keeps the older run's stamps on Seed 01–50): every pair of days must keep every image message older than every Seed 01–50 one
        long[] days = { 1769904000L /* 2026-02-01 */, 1780000000, 1790000000, 4102444800L /* 2100-01-01 */ };
        long maxImage = 0;
        for (int i = 50; i < 53; i++) maxImage = Math.Max(maxImage, SDevSeedPlan.imagePlan(i).Max(m => m.ts));
        foreach (long now in days)
        {
            long floor = SDevSeedPlan.seedFloor(now);
            long minSeed = long.MaxValue;
            foreach (string p in new[] { "light", "heavy" })
            {
                for (int i = 0; i < 50; i++)
                {
                    int c = SDevSeedPlan.countFor(p, i);
                    for (int j = 0; j < c; j++) minSeed = Math.Min(minSeed, SDevSeedPlan.messageTime(now, i, j, c, out _));
                }
            }
            Assert.IsTrue(minSeed >= floor, "seedFloor is a true floor of Seed 01–50 (" + minSeed + " ≥ " + floor + ")");
            Assert.IsTrue(maxImage < minSeed, "every image message is older than every Seed 01–50 message of a run on day " + now + " (" + maxImage + " < " + minSeed + ")");
        }
        long prevNewest = long.MaxValue;
        for (int i = 50; i < 53; i++)
        {
            var l = SDevSeedPlan.imagePlan(i);
            long newest = l[l.Count - 1].ts;
            Assert.IsTrue(newest < prevNewest, "Seed 51 above Seed 52 above Seed 53");
            prevNewest = newest;
            for (int x = 1; x < l.Count; x++)
            {
                long gap = l[x].ts - l[x - 1].ts;
                Assert.AreEqual(l[x].albumIndex > 0 ? 1L : 120L, gap, "the gap before " + i + ":" + x);
            }
        }
    }

    [TestMethod]
    public void names_are_built_from_the_seed_index_only()
    {
        var uids = new HashSet<string>();
        var leaves = new HashSet<string>();
        var ids = new HashSet<string>();
        for (int i = 0; i < 50; i++) for (int j = 0; j < 1000; j++) ids.Add(hex(SDevSeedPlan.messageIdFor(i, j)));
        for (int i = 50; i < 53; i++)
        {
            foreach (var m in SDevSeedPlan.imagePlan(i))
            {
                Assert.IsTrue(ids.Add(hex(SDevSeedPlan.messageIdFor(i, m.j))), "a new message id " + i + ":" + m.j);
                if (!m.photo) continue;
                string uid = SDevSeedPlan.transferUid(i, m.j);
                string leaf = SDevSeedPlan.localLeaf(i, m);
                Assert.IsTrue(PhotoRules.isTransferUid(uid) && uids.Add(uid), "a unique 32-hex transfer uid " + i + ":" + m.j);
                Assert.IsTrue(leaves.Add(leaf), "a unique leaf " + i + ":" + m.j);
                Assert.AreEqual(PhotoRules.SafeFileName(SDevSeedPlan.photoName(i, m.j)), SDevSeedPlan.photoName(i, m.j), "the receive sanitizer keeps the name " + i + ":" + m.j);
                if (m.local)
                {
                    Assert.AreEqual(uid + ".png", leaf, "a sent copy = <uid>.png");
                    Assert.AreEqual(PhotoRules.sentFileName(uid, ".png"), leaf, "PhotoRules.sentFileName agrees");
                    Assert.IsTrue(PhotoRules.isSentCopyName(leaf), "the Sent sweep's own shape");
                    Assert.AreEqual(uid + ":" + SDevSeedPlan.photoName(i, m.j), SDevSeedPlan.headerText(i, m, 1234), "a sent header = uid:name");
                }
                else
                {
                    Assert.AreEqual(string.Format("devseed-{0:00}-{1:000}.png", i + 1, m.j), leaf, "a received copy = the photo name");
                    Assert.AreEqual(uid + ":" + leaf + ":1234", SDevSeedPlan.headerText(i, m, 1234), "a received header = uid:name:size");
                }
                Assert.IsTrue(leaf.IndexOfAny(new[] { '/', '\\', ':' }) < 0 && !leaf.Contains(".."), "a plain leaf " + leaf);
            }
        }
        Assert.AreEqual(46, uids.Count, "46 photos in all");
        // ★ #46 r1 B-2: the temp leaf = the app's own PENDING name in Sent/ (never a sent-copy name, never a final leaf, never in Downloads/)
        var tmps = new HashSet<string>();
        for (int i = 50; i < 53; i++)
        {
            foreach (var m in SDevSeedPlan.imagePlan(i).Where(q => q.photo))
            {
                string t = SDevSeedPlan.tmpLeaf(i, m.j);
                Assert.IsTrue(PhotoRules.isPendingName(t) && t.EndsWith("-0.src") && !PhotoRules.isSentCopyName(t), "a pending-shaped temp leaf " + i + ":" + m.j);
                Assert.IsTrue(tmps.Add(t) && !leaves.Contains(t), "a unique temp leaf, never a final leaf " + i + ":" + m.j);
                Assert.IsTrue(SDevSeedPlan.localLeaf(i, m) + ".devseed-tmp" != t, "not the old leaf + suffix shape (a peer-chosen Downloads leaf could have that name)");
                Assert.IsTrue(SDevSeedPlan.mayDeleteTmp(t, i, m.j) && !SDevSeedPlan.mayDeleteTmp(t, i, m.j + 1), "only its own (i, j)");
            }
        }
        Assert.AreEqual(46, tmps.Count, "46 temp leaves");
        Assert.IsFalse(SDevSeedPlan.mayDeleteTmp(null, 50, 0) || SDevSeedPlan.mayDeleteTmp("pending-0000000000000000-0.src", 50, 0)
            || SDevSeedPlan.mayDeleteTmp(SDevSeedPlan.localLeaf(50, SDevSeedPlan.imagePlan(50)[0]) + ".devseed-tmp", 50, 0), "another pending photo, null or the old shape are never ours");
    }

    // ★ #46 r1 B-2: a MODEL of SDevSeed's disk half — the same decisions (SDevSeedPlan.fileState / fileAction / mayDelete / mayDeleteTmp), a
    // dictionary for the folders. "Sent/…" and "Downloads/…" are the keys' prefixes; `reads` counts the files the proof READ.
    private sealed class Disk
    {
        public Dictionary<string, byte[]> f = new Dictionary<string, byte[]>();
        public int reads, deletes, overwrites;
        public List<string> deleted = new List<string>();
        public static string folderOf(SDevSeedPlan.ImageMsg m) => m.local ? "Sent/" : "Downloads/";
        public string state(string key, int i, SDevSeedPlan.ImageMsg m) =>
            SDevSeedPlan.fileState(f.ContainsKey(key), f.TryGetValue(key, out var b) ? b.Length : 0, SDevSeedPlan.pngLength(m.width, m.height),
                () => { reads++; return f[key]; }, () => SDevSeedPlan.png(i, m.j, m.width, m.height));
        /// <summary>ensurePhoto: 1 written, 0 kept, -1 refused. The temp goes to Sent/ for BOTH directions, then a no-overwrite move.</summary>
        public int ensure(int i, SDevSeedPlan.ImageMsg m)
        {
            string key = folderOf(m) + SDevSeedPlan.localLeaf(i, m);
            string act = SDevSeedPlan.fileAction(state(key, i, m));
            if (act == SDevSeedPlan.FileKeep) return 0;
            if (act != SDevSeedPlan.FileWrite) return -1;
            string tmp = "Sent/" + SDevSeedPlan.tmpLeaf(i, m.j);
            f[tmp] = SDevSeedPlan.png(i, m.j, m.width, m.height);
            if (f.ContainsKey(key)) { f.Remove(tmp); return -1; }   // File.Move without overwrite throws — counted as refused
            f[key] = f[tmp];
            f.Remove(tmp);
            return 1;
        }
        /// <summary>unseed's file half for one photo: the temp by its exact name, the photo only when OURS.</summary>
        public int unseedOne(int i, SDevSeedPlan.ImageMsg m)
        {
            int n = 0;
            string tmpName = SDevSeedPlan.tmpLeaf(i, m.j);
            if (SDevSeedPlan.mayDeleteTmp(tmpName, i, m.j) && f.Remove("Sent/" + tmpName)) { n++; deleted.Add("Sent/" + tmpName); }
            string key = folderOf(m) + SDevSeedPlan.localLeaf(i, m);
            if (SDevSeedPlan.mayDelete(state(key, i, m))) { f.Remove(key); n++; deletes++; deleted.Add(key); }
            return n;
        }
    }

    private static int[] seedOnce(Disk disk, HashSet<string> store)
    {
        int msgs = 0, files = 0, refused = 0;
        for (int i = 50; i < 53; i++)
        {
            foreach (var m in SDevSeedPlan.imagePlan(i))
            {
                if (m.photo)
                {
                    int w = disk.ensure(i, m);
                    if (w < 0) { refused++; continue; }   // never adopted: no message row names a foreign file
                    files += w;
                }
                if (store.Add(hex(SDevSeedPlan.messageIdFor(i, m.j)))) msgs++;
            }
        }
        return new[] { msgs, files, refused };
    }

    [TestMethod]
    public void the_content_proof_decides_keep_write_refuse_and_delete()
    {
        byte[] want = SDevSeedPlan.png(50, 0, 3, 2);
        byte[] foreignSameLength = want.ToArray();
        foreignSameLength[foreignSameLength.Length / 2] ^= 0x55;   // ONE byte differs: same name, same LENGTH
        int reads = 0;
        string st(bool exists, long len, byte[] have) => SDevSeedPlan.fileState(exists, len, want.Length, () => { reads++; return have; }, () => want);
        Assert.AreEqual(SDevSeedPlan.StateAbsent, st(false, 0, want), "absent");
        Assert.AreEqual(SDevSeedPlan.StateOurs, st(true, want.Length, want), "our bytes");
        Assert.AreEqual(SDevSeedPlan.StateForeign, st(true, want.Length, foreignSameLength), "the same name and length, other bytes → foreign");
        Assert.AreEqual(1 + 1, reads, "the two same-length files were read");
        reads = 0;
        Assert.AreEqual(SDevSeedPlan.StateForeign, st(true, want.Length - 1, want), "another length → foreign");
        Assert.AreEqual(0, reads, "a file of another length is never read");
        Assert.AreEqual(SDevSeedPlan.FileWrite, SDevSeedPlan.fileAction(SDevSeedPlan.StateAbsent), "absent → write");
        Assert.AreEqual(SDevSeedPlan.FileKeep, SDevSeedPlan.fileAction(SDevSeedPlan.StateOurs), "ours → keep (no second file)");
        Assert.AreEqual(SDevSeedPlan.FileRefuse, SDevSeedPlan.fileAction(SDevSeedPlan.StateForeign), "foreign → refuse (never overwritten, never adopted)");
        Assert.AreEqual(SDevSeedPlan.FileRefuse, SDevSeedPlan.fileAction("anything else"), "an unknown state fails closed");
        Assert.IsTrue(SDevSeedPlan.mayDelete(SDevSeedPlan.StateOurs) && !SDevSeedPlan.mayDelete(SDevSeedPlan.StateForeign) && !SDevSeedPlan.mayDelete(SDevSeedPlan.StateAbsent) && !SDevSeedPlan.mayDelete("anything else"), "unseed deletes only ours");
    }

    [TestMethod]
    public void a_foreign_file_with_a_seed_name_is_never_overwritten_adopted_or_deleted()
    {
        var disk = new Disk();
        var store = new HashSet<string>();
        var m0 = SDevSeedPlan.imagePlan(50).First(q => q.photo && !q.local);   // a RECEIVED photo (Downloads/)
        var s0 = SDevSeedPlan.imagePlan(50).First(q => q.photo && q.local);    // a SENT photo (Sent/)
        byte[] a = SDevSeedPlan.png(50, m0.j, m0.width, m0.height).ToArray(); a[a.Length - 20] ^= 0x01;   // our name + our length, one byte off
        byte[] b = SDevSeedPlan.png(50, s0.j, s0.width, s0.height).ToArray(); b[100] ^= 0x01;
        disk.f["Downloads/" + SDevSeedPlan.localLeaf(50, m0)] = a;
        disk.f["Sent/" + SDevSeedPlan.localLeaf(50, s0)] = b;
        int[] first = seedOnce(disk, store);
        Assert.AreEqual(2, first[2], "both foreign files refused");
        Assert.AreEqual("68,44", first[0] + "," + first[1], "the other 44 photos are written; the two foreign photos get no message row (70 − 2)");
        Assert.IsTrue(disk.f["Downloads/" + SDevSeedPlan.localLeaf(50, m0)].SequenceEqual(a) && disk.f["Sent/" + SDevSeedPlan.localLeaf(50, s0)].SequenceEqual(b), "never overwritten");
        Assert.IsFalse(store.Contains(hex(SDevSeedPlan.messageIdFor(50, m0.j))) || store.Contains(hex(SDevSeedPlan.messageIdFor(50, s0.j))), "never adopted (no row)");
        Assert.IsFalse(disk.f.Keys.Any(k => k.Contains("pending-")), "no temp is left behind");
        int removed = 0;
        for (int i = 50; i < 53; i++) foreach (var m in SDevSeedPlan.imagePlan(i).Where(q => q.photo)) removed += disk.unseedOne(i, m);
        Assert.AreEqual(44, removed, "unseed deletes the 44 photos that are ours");
        Assert.IsTrue(disk.f.Count == 2 && disk.f["Downloads/" + SDevSeedPlan.localLeaf(50, m0)].SequenceEqual(a) && disk.f["Sent/" + SDevSeedPlan.localLeaf(50, s0)].SequenceEqual(b), "the two foreign files are never deleted");
    }

    [TestMethod]
    public void a_real_received_file_with_the_old_temp_shape_or_a_real_pending_photo_is_never_touched()
    {
        var disk = new Disk();
        var store = new HashSet<string>();
        var m0 = SDevSeedPlan.imagePlan(50).First(q => q.photo && !q.local);
        string recvLeaf = SDevSeedPlan.localLeaf(50, m0);
        byte[] real = { 1, 2, 3, 4 };
        disk.f["Downloads/" + recvLeaf + ".devseed-tmp"] = real;               // a peer named a file with the OLD temp shape (the defect)
        disk.f["Sent/pending-0123456789abcdef-0.src"] = real;                   // a real prepared photo of a chat page
        disk.f["Sent/pending-0123456789abcdef-0.jpg"] = real;
        seedOnce(disk, store);
        Assert.IsTrue(disk.f["Downloads/" + recvLeaf + ".devseed-tmp"] == real, "the peer's file is untouched by the seed");
        for (int i = 50; i < 53; i++) foreach (var m in SDevSeedPlan.imagePlan(i).Where(q => q.photo)) disk.unseedOne(i, m);
        Assert.IsTrue(disk.f.Count == 3 && disk.f["Downloads/" + recvLeaf + ".devseed-tmp"] == real && disk.f["Sent/pending-0123456789abcdef-0.src"] == real, "…and by the unseed — on an account that never seeded too");
        Assert.IsFalse(disk.deleted.Any(d => !d.StartsWith("Sent/pending-") && !d.StartsWith("Sent/") && !d.StartsWith("Downloads/devseed-")), "only seed names deleted");
        // an account that NEVER seeded: unseed alone deletes nothing at all
        var clean = new Disk();
        clean.f["Downloads/" + recvLeaf + ".devseed-tmp"] = real;
        clean.f["Downloads/" + recvLeaf] = real;                                // a real file with our final name but not our bytes
        for (int i = 50; i < 53; i++) foreach (var m in SDevSeedPlan.imagePlan(i).Where(q => q.photo)) clean.unseedOne(i, m);
        Assert.AreEqual("2,0", clean.f.Count + "," + clean.deleted.Count, "nothing deleted on an account that never seeded");
    }

    [TestMethod]
    public void a_temp_left_by_a_kill_is_overwritten_and_the_unseed_clears_it()
    {
        var disk = new Disk();
        var store = new HashSet<string>();
        var m0 = SDevSeedPlan.imagePlan(50).First(q => q.photo && !q.local);
        string tmpKey = "Sent/" + SDevSeedPlan.tmpLeaf(50, m0.j);
        disk.f[tmpKey] = new byte[] { 9, 9, 9 };                                // a partial temp of OUR name
        int[] first = seedOnce(disk, store);
        Assert.AreEqual("46,0", first[1] + "," + first[2], "the write goes through and the final file is ours");
        Assert.IsFalse(disk.f.ContainsKey(tmpKey), "the temp was moved (no temp left)");
        Assert.IsTrue(SDevSeedPlan.isOurs(disk.f["Downloads/" + SDevSeedPlan.localLeaf(50, m0)], SDevSeedPlan.png(50, m0.j, m0.width, m0.height)), "the moved file is ours");
        disk.f[tmpKey] = new byte[] { 9 };
        disk.unseedOne(50, m0);
        Assert.IsFalse(disk.f.ContainsKey(tmpKey), "unseed deletes the temp by its exact name");
    }

    [TestMethod]
    public void the_top_up_rule_holds()
    {
        // a model of the store: Core refuses a known id (FriendList.cs:258); the file rule (content proof) in Disk; seed twice
        var store = new HashSet<string>();
        var disk = new Disk();
        int[] first = seedOnce(disk, store);
        disk.reads = 0;
        int[] second = seedOnce(disk, store);
        Assert.AreEqual("70,46,0", first[0] + "," + first[1] + "," + first[2], "the first seed: 70 messages, 46 files");
        Assert.AreEqual("0,0,0", second[0] + "," + second[1] + "," + second[2], "the second seed adds nothing");
        Assert.AreEqual(46, disk.reads, "the second seed PROVED all 46 files by content");
        Assert.AreEqual(46, disk.f.Count, "no temp, no second file");
        int removed = 0;
        for (int i = 50; i < 53; i++) foreach (var m in SDevSeedPlan.imagePlan(i).Where(q => q.photo)) removed += disk.unseedOne(i, m);
        Assert.AreEqual("46,0", removed + "," + disk.f.Count, "unseed removes the 46 photos and nothing else");
        // the album: first writer wins — a re-seed records no second entry
        var groups = new List<string>();
        string peer = "SeedPeer52";
        int added1 = 0, added2 = 0;
        foreach (var m in SDevSeedPlan.imagePlan(51).Where(q => q.albumIndex >= 0))
        {
            if (SPhotoGroups.addInto(groups, peer, hex(SDevSeedPlan.messageIdFor(51, m.j)), PhotoRules.groupArg(SDevSeedPlan.albumId(51), m.albumIndex, 6, ""), peer)) added1++;
        }
        foreach (var m in SDevSeedPlan.imagePlan(51).Where(q => q.albumIndex >= 0))
        {
            if (SPhotoGroups.addInto(groups, peer, hex(SDevSeedPlan.messageIdFor(51, m.j)), PhotoRules.groupArg(SDevSeedPlan.albumId(51), m.albumIndex, 6, ""), peer)) added2++;
        }
        Assert.AreEqual("6,0,6", added1 + "," + added2 + "," + groups.Count, "the album is recorded once");
        Assert.AreEqual(6, SPhotoGroups.countOf(SPhotoGroups.find(groups, peer, hex(SDevSeedPlan.messageIdFor(51, 7)))), "a member reads its group of 6");
        // the plan is a pure function: the same answer twice
        Assert.AreEqual(string.Join("|", SDevSeedPlan.imagePlan(52).Select(m => m.j + ":" + m.local + ":" + m.width + "x" + m.height + ":" + m.ts)),
            string.Join("|", SDevSeedPlan.imagePlan(52).Select(m => m.j + ":" + m.local + ":" + m.width + "x" + m.height + ":" + m.ts)), "deterministic plan");
    }

    private static uint be(byte[] b, int at) => (uint)(b[at] << 24 | b[at + 1] << 16 | b[at + 2] << 8 | b[at + 3]);

    [TestMethod]
    public void the_photo_is_a_valid_png_of_its_size_and_deterministic()
    {
        Assert.AreEqual(0xCBF43926u, SDevSeedPlan.crc32(Encoding.ASCII.GetBytes("123456789"), 0, 9), "CRC-32 check value");
        Assert.AreEqual(0x11E60398u, SDevSeedPlan.adler32(Encoding.ASCII.GetBytes("Wikipedia"), 0, 9), "Adler-32 check value");
        foreach (var (w, h, i, j) in new[] { (1024, 768, 50, 0), (480, 640, 52, 7), (1280, 960, 51, 5), (3, 2, 50, 1) })
        {
            byte[] p = SDevSeedPlan.png(i, j, w, h);
            string k = w + "x" + h;
            Assert.AreEqual(SDevSeedPlan.pngLength(w, h), (long)p.Length, "the stated length " + k);
            Assert.IsTrue(ImageSniff.looksLikeImage(p.Take(16).ToArray()), "ImageSniff passes it " + k);
            Assert.AreEqual("89504e470d0a1a0a", hex(p.Take(8).ToArray()), "signature " + k);
            int at = 8;
            var types = new List<string>();
            MemoryStream idat = new MemoryStream();
            while (at < p.Length)
            {
                int len = (int)be(p, at);
                string type = Encoding.ASCII.GetString(p, at + 4, 4);
                types.Add(type);
                Assert.AreEqual(be(p, at + 8 + len), SDevSeedPlan.crc32(p, at + 4, 4 + len), "the CRC of " + type + " " + k);
                if (type == "IHDR")
                {
                    Assert.AreEqual(13, len, "IHDR length");
                    Assert.AreEqual((uint)w, be(p, at + 8), "width " + k);
                    Assert.AreEqual((uint)h, be(p, at + 12), "height " + k);
                    Assert.AreEqual("8,3,0,0,0", string.Join(",", p.Skip(at + 16).Take(5)), "depth 8, palette, no interlace " + k);
                }
                if (type == "PLTE") Assert.AreEqual(768, len, "256 palette entries " + k);
                if (type == "IDAT") idat.Write(p, at + 8, len);
                at += 12 + len;
            }
            Assert.AreEqual("IHDR,PLTE,IDAT,IEND", string.Join(",", types), "the chunk order " + k);
            Assert.AreEqual(p.Length, at, "no trailing bytes " + k);
            byte[] z = idat.ToArray();
            Assert.IsTrue(z[0] == 0x78 && (z[0] * 256 + z[1]) % 31 == 0, "a zlib header " + k);
            byte[] raw;
            using (var zs = new ZLibStream(new MemoryStream(z), CompressionMode.Decompress))
            using (var o = new MemoryStream())
            {
                zs.CopyTo(o);
                raw = o.ToArray();
            }
            Assert.AreEqual(h * (w + 1), raw.Length, "the inflated image data = h × (w + 1) " + k);
            Assert.AreEqual(be(z, z.Length - 4), SDevSeedPlan.adler32(raw, 0, raw.Length), "Adler-32 " + k);
            for (int y = 0; y < h; y++) Assert.AreEqual((byte)0, raw[y * (w + 1)], "filter 0 on row " + y + " " + k);
            Assert.IsTrue(w < 4 || raw.Skip(1).Take(w).Distinct().Count() > 8, "a row is not flat " + k);
            Assert.IsTrue(p.SequenceEqual(SDevSeedPlan.png(i, j, w, h)), "deterministic " + k);
            Assert.IsFalse(p.SequenceEqual(SDevSeedPlan.png(i, j + 1, w, h)), "another photo, other bytes " + k);
        }
        long total = 0;
        for (int i = 50; i < 53; i++) foreach (var m in SDevSeedPlan.imagePlan(i).Where(q => q.photo)) total += SDevSeedPlan.pngLength(m.width, m.height);
        Assert.IsTrue(total > 20L * 1024 * 1024 && total < 40L * 1024 * 1024, "all 46 photos ≈ 20–40 MB on disk (" + total + ")");
        bool threw = false;
        try { SDevSeedPlan.png(50, 0, 0, 10); } catch (ArgumentOutOfRangeException) { threw = true; }
        Assert.IsTrue(threw, "a size of 0 is refused");
    }
}
