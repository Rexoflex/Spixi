// ★ S9 (session 9, agent A1) — the pure rules of the MEDIA family, EXECUTED:
//   · PhotoRules (#1244 · #1245 A-6 / A-9 · CONTRACT §1b–§1f): the verb arguments (batch id, keys, caption), the group
//     string / trailer bounds, the file names C# makes (pending / sent / part / photo), SafeFileName + the collision name,
//     the Sent-folder containment, the Win32 multi-select buffer, the Android decode sample, the JPEG size reader, the
//     mediaPicked json, the #1200 probe line
//   · SPhotoGroups (the receiver / sender group store: parse, cap, per-peer clear, account wipe)
//   · the FileTransfer trailer's wire shape against an OLD sequential reader (a byte-level model of 0e85a4b8's
//     FileTransfer(byte[]) and Core's FileHeaderMessage — both stop after `channel`)
// The call sites (SingleChatPage's media region, TransferManager, StreamProcessor.handleFileHeader, the platform pickers /
// encoders / clipboards) are MAUI-bound — scripts/pins-s9/a1-*.mjs.
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;
using SPIXI.Meta;

[TestClass]
public class S9MediaTests
{
    static string B64Url(string s) => Convert.ToBase64String(Encoding.UTF8.GetBytes(s)).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    [TestMethod]
    public void ids_and_keys()
    {
        Assert.IsTrue(PhotoRules.isId16("0123456789abcdef"), "16 lowercase hex");
        Assert.IsFalse(PhotoRules.isId16("0123456789ABCDEF"), "uppercase is not C#'s");
        Assert.IsFalse(PhotoRules.isId16("0123456789abcde"), "15");
        Assert.IsFalse(PhotoRules.isId16("0123456789abcdeg"), "non-hex");
        Assert.IsFalse(PhotoRules.isId16(null), "null");
        Assert.AreEqual("00ff10a0b0c0d0e0", PhotoRules.idFromBytes(new byte[] { 0, 255, 16, 160, 176, 192, 208, 224 }), "8 bytes → 16 hex");
        Assert.IsTrue(PhotoRules.isTransferUid(Guid.NewGuid().ToString("N")), "a Guid N is a transfer uid");
        Assert.IsFalse(PhotoRules.isTransferUid("../../x"), "a path is not");
        CollectionAssertSeq(new[] { 2, 0, 5 }, PhotoRules.parseKeys("2,0,5", 6), "order kept");
        Assert.IsTrue(PhotoRules.parseKeys("0,0", 6) == null, "duplicate → refused");
        Assert.IsTrue(PhotoRules.parseKeys("6", 6) == null, "≥ batch count → refused");
        Assert.IsTrue(PhotoRules.parseKeys("10", 12) == null, "two digits → refused");
        Assert.IsTrue(PhotoRules.parseKeys("", 6) == null, "empty → refused");
        Assert.IsTrue(PhotoRules.parseKeys("1,,2", 6) == null, "an empty part → refused");
        Assert.IsTrue(PhotoRules.parseKeys(" 1", 6) == null, "a space → refused");
        Assert.AreEqual(10, PhotoRules.parseKeys("0,1,2,3,4,5,6,7,8,9", 10)!.Count, "ten keys");
    }

    static void CollectionAssertSeq(int[] want, List<int>? got, string m)
    {
        Assert.IsTrue(got != null && got.SequenceEqual(want), m + " (got " + (got == null ? "null" : string.Join(",", got)) + ")");
    }

    [TestMethod]
    public void caption_and_mediaSend()
    {
        Assert.AreEqual("", PhotoRules.decodeCaption(""), "empty caption");
        Assert.AreEqual("Hello, wörld 👋", PhotoRules.decodeCaption(B64Url("  Hello, wörld 👋\n")), "UTF-8, trimmed");
        Assert.IsTrue(PhotoRules.decodeCaption("ab+c") == null, "'+' is not base64url");
        Assert.IsTrue(PhotoRules.decodeCaption("a") == null, "a length that is 1 mod 4 → refused");
        Assert.IsTrue(PhotoRules.decodeCaption(Convert.ToBase64String(new byte[] { 0xC3, 0x28 }).TrimEnd('=')) == null, "invalid UTF-8 → refused");
        Assert.AreEqual(4096, PhotoRules.decodeCaption(B64Url(new string('x', 4096)))!.Length, "4096 chars pass");
        Assert.IsTrue(PhotoRules.decodeCaption(B64Url(new string('x', 4097))) == null, "4097 chars → refused");
        Assert.AreEqual(4096, PhotoRules.decodeCaption(B64Url(new string('€', 4096)))!.Length, "4096 three-byte chars pass (the length gate is not too tight)");
        Assert.IsTrue(PhotoRules.parseMediaSend("0123456789abcdef:1,0:" + B64Url("cap"), 2, out string id, out List<int> keys, out string cap), "a valid payload");
        Assert.IsTrue(id == "0123456789abcdef" && keys.SequenceEqual(new[] { 1, 0 }) && cap == "cap", "its parts");
        Assert.IsTrue(PhotoRules.parseMediaSend("0123456789abcdef:0:", 1, out _, out _, out string empty) && empty == "", "an empty caption");
        Assert.IsFalse(PhotoRules.parseMediaSend("0123456789abcdef:0", 1, out _, out _, out _), "two parts → refused");
        Assert.IsFalse(PhotoRules.parseMediaSend("0123456789abcdef:0::x", 1, out _, out _, out _), "four parts → refused");
        Assert.IsFalse(PhotoRules.parseMediaSend("0123456789ABCDEF:0:", 1, out _, out _, out _), "a bad batch id → refused");
        Assert.IsFalse(PhotoRules.parseMediaSend("0123456789abcdef:3:", 2, out _, out _, out _), "a key outside the batch → refused");
        Assert.AreEqual("0123456789abcdef", PhotoRules.batchIdOfSend("0123456789abcdef:0:"), "the batch id is found first");
        Assert.IsTrue(PhotoRules.batchIdOfSend("../x:0:") == null, "a malformed id → null");
    }

    [TestMethod]
    public void caption_padding_r1()
    {
        // ★ S9 A1 r1: the chat shell (B1) sends base64url WITH '=' padding; an unpadded caption must still pass
        foreach (string text in new[] { "a", "ab", "abc", "Grüße 👋" })
        {
            string unpadded = B64Url(text);
            string padded = Convert.ToBase64String(Encoding.UTF8.GetBytes(text)).Replace('+', '-').Replace('/', '_');
            Assert.AreEqual(text, PhotoRules.decodeCaption(unpadded), "unpadded: " + text);
            Assert.AreEqual(text, PhotoRules.decodeCaption(padded), "padded: " + text);
            Assert.IsTrue(PhotoRules.parseMediaSend("0123456789abcdef:0:" + padded, 1, out _, out _, out string c) && c == text, "a padded caption through mediaSend: " + text);
        }
        Assert.IsTrue(PhotoRules.decodeCaption("YQ===") == null, "three '=' → refused");
        Assert.IsTrue(PhotoRules.decodeCaption("Y=Q") == null, "'=' inside → refused");
        Assert.IsTrue(PhotoRules.decodeCaption("==") == null, "padding only → refused");
    }

    [TestMethod]
    public void photo_groups_excerpt_lookups_r1()
    {
        // ★ S9 A1 r1: the chats-list excerpt — a group's count, and a caption row found by its id
        var l = SPhotoGroups.parse("PeerA|m1|0123456789abcdef|0|3|ccdd|me,PeerA|m2|0123456789abcdef|1|3|ccdd|me,PeerB|m9|fedcba9876543210|0|2||X,PeerC|m7|fedcba9876543210|0|2|eeff");
        Assert.IsTrue(SPhotoGroups.findCaption(l, "PeerA", "CCDD", "me"), "the caption id of PeerA's group (case-insensitive), the SAME sender");
        Assert.IsFalse(SPhotoGroups.findCaption(l, "PeerA", "ccdd", "PeerA"), "#46 r1 M-2: a text from ANOTHER sender is never that group's caption");
        Assert.IsFalse(SPhotoGroups.findCaption(l, "PeerA", "ccdd", ""), "an unknown sender never matches");
        Assert.IsFalse(SPhotoGroups.findCaption(l, "PeerC", "eeff", ""), "a legacy 6-field entry (no sender) is never a caption source");
        Assert.IsFalse(SPhotoGroups.findCaption(l, "PeerB", "ccdd", "me"), "not another peer's");
        Assert.IsFalse(SPhotoGroups.findCaption(l, "PeerA", "cc", "me"), "not a suffix of the id");
        Assert.IsFalse(SPhotoGroups.findCaption(l, "PeerB", "", "X"), "an empty id is never a caption");
        Assert.AreEqual(4, l.Count, "a legacy 6-field entry still parses (its group is kept)");
        Assert.AreEqual(3, SPhotoGroups.countOf("0123456789abcdef|1|3|ccdd"), "count");
        Assert.AreEqual(0, SPhotoGroups.countOf(""), "no group → 0");
        Assert.AreEqual(0, SPhotoGroups.countOf("0123456789abcdef|3|3|"), "invalid → 0");
    }

    [TestMethod]
    public void group_string_and_trailer_bounds()
    {
        string cap = new string('a', 32);
        Assert.AreEqual("0123456789abcdef|0|3|" + cap, PhotoRules.groupArg("0123456789abcdef", 0, 3, cap.ToUpperInvariant()), "the arg (caption id lowercased)");
        Assert.AreEqual("0123456789abcdef|9|10|", PhotoRules.groupArg("0123456789abcdef", 9, 10, ""), "no caption");
        Assert.AreEqual("", PhotoRules.groupArg("0123456789abcdef", 3, 3, ""), "index == count → \"\"");
        Assert.AreEqual("", PhotoRules.groupArg("0123456789abcdef", 0, 11, ""), "count > 10 → \"\"");
        Assert.AreEqual("", PhotoRules.groupArg("0123456789abcdef", -1, 3, ""), "index < 0 → \"\"");
        Assert.AreEqual("", PhotoRules.groupArg("0123456789abcdef", 0, 0, ""), "count 0 → \"\"");
        Assert.AreEqual("", PhotoRules.groupArg("xyz", 0, 2, ""), "a bad gid → \"\"");
        Assert.AreEqual("", PhotoRules.groupArg("0123456789abcdef", 0, 2, new string('a', 65)), "a caption id over 64 hex → \"\"");
        Assert.AreEqual("", PhotoRules.groupArg("0123456789abcdef", 0, 2, "a|b"), "a caption id with '|' → \"\"");
        Assert.IsTrue(PhotoRules.parseGroupArg("0123456789abcdef|1|2|ab", out string g, out int i, out int n, out string c) && g == "0123456789abcdef" && i == 1 && n == 2 && c == "ab", "parse back");
        Assert.IsFalse(PhotoRules.parseGroupArg("0123456789abcdef|01|2|", out _, out _, out _, out _), "a padded number → refused (one spelling)");
        Assert.IsFalse(PhotoRules.parseGroupArg("0123456789abcdef|1|2", out _, out _, out _, out _), "three fields → refused");
        Assert.IsFalse(PhotoRules.parseGroupArg("0123456789abcdef|+1|2|", out _, out _, out _, out _), "a sign → refused");
    }

    // ——— the wire: the trailer after `channel`, and the OLD reader (0e85a4b8 FileTransfer(byte[]) / Core FileHeaderMessage) ———
    static byte[] Header(bool withTrailer, string gid, int idx, int cnt, string cap)
    {
        using MemoryStream m = new MemoryStream();
        using (BinaryWriter w = new BinaryWriter(m))
        {
            w.Write("uid0123"); w.Write("photo.jpg"); w.Write((ulong)1234); w.Write(0); w.Write(16384); w.Write(7);
            if (withTrailer) { w.Write(gid); w.Write(idx); w.Write(cnt); w.Write(cap); }
        }
        return m.ToArray();
    }

    static (string uid, string name, ulong size, int packet, int channel) OldRead(byte[] b)
    {
        using MemoryStream m = new MemoryStream(b);
        using BinaryReader r = new BinaryReader(m);
        string uid = r.ReadString(); string name = r.ReadString(); ulong size = r.ReadUInt64();
        int pl = r.ReadInt32(); if (pl > 0) r.ReadBytes(pl);
        int packet = r.ReadInt32(); int ch = r.ReadInt32();
        return (uid, name, size, packet, ch);   // and stops — the trailing bytes are never read
    }

    [TestMethod]
    public void trailer_is_ignored_by_an_old_reader_and_validated_by_the_new_one()
    {
        byte[] plain = Header(false, "", 0, 0, "");
        byte[] tagged = Header(true, "0123456789abcdef", 1, 3, "ab12");
        Assert.IsTrue(OldRead(plain) == OldRead(tagged), "the old reader sees the SAME header with or without the trailer");
        Assert.IsTrue(tagged.Length > plain.Length && tagged.Take(plain.Length).SequenceEqual(plain), "the trailer is appended AFTER channel, the prefix unchanged");
        // the new reader's rule on what it read
        using (MemoryStream m = new MemoryStream(tagged))
        using (BinaryReader r = new BinaryReader(m))
        {
            OldReadInto(r);
            Assert.IsTrue(m.Position < m.Length, "bytes remain → the trailer is read");
            string gid = r.ReadString(); int i = r.ReadInt32(); int n = r.ReadInt32(); string cap = r.ReadString();
            Assert.IsTrue(PhotoRules.trailerOk(gid, i, n, cap), "a valid trailer is kept");
        }
        Assert.IsFalse(PhotoRules.trailerOk("0123456789abcdef", 5, 3, ""), "index ≥ count → the file is shown alone");
        Assert.IsFalse(PhotoRules.trailerOk("0123456789abcdef", 0, 11, ""), "count > 10 → alone");
        Assert.IsFalse(PhotoRules.trailerOk("0123456789abcdeF", 0, 2, ""), "a gid with uppercase → alone");
    }

    static void OldReadInto(BinaryReader r)
    {
        r.ReadString(); r.ReadString(); r.ReadUInt64(); int pl = r.ReadInt32(); if (pl > 0) r.ReadBytes(pl); r.ReadInt32(); r.ReadInt32();
    }

    [TestMethod]
    public void names_c_sharp_makes()
    {
        Assert.AreEqual("pending-0123456789abcdef-3.jpg", PhotoRules.pendingFileName("0123456789abcdef", 3, ".jpg"), "pending photo");
        Assert.AreEqual("pending-0123456789abcdef-0.src", PhotoRules.pendingFileName("0123456789abcdef", 0, ".src"), "pending source");
        Assert.IsTrue(PhotoRules.pendingFileName("../../etc", 0, ".jpg") == null, "a non-C# id → null");
        Assert.IsTrue(PhotoRules.pendingFileName("0123456789abcdef", 10, ".jpg") == null, "k ≥ 10 → null");
        Assert.IsTrue(PhotoRules.pendingFileName("0123456789abcdef", 0, ".exe") == null, "another ext → null");
        Assert.IsTrue(PhotoRules.isPendingName("pending-0123456789abcdef-3.jpg") && PhotoRules.isPendingName("pending-0123456789abcdef-9.src"), "the sweep matches ours");
        Assert.IsFalse(PhotoRules.isPendingName("pending-0123456789abcdef-3.jpg.bak"), "not a longer name");
        Assert.IsFalse(PhotoRules.isPendingName("0123456789abcdef0123456789abcdef.jpg"), "never a SENT copy");
        Assert.IsFalse(PhotoRules.isPendingName("pending-0123456789ABCDEF-3.jpg"), "not uppercase");
        string uid = "0123456789abcdef0123456789abcdef";
        Assert.AreEqual(uid + ".pdf", PhotoRules.sentFileName(uid, PhotoRules.sentExtension("Report.PDF")), "an allow-listed ext (lowercased)");
        Assert.AreEqual(uid, PhotoRules.sentFileName(uid, PhotoRules.sentExtension("tool.exe")), "a not-listed ext → no ext");
        Assert.AreEqual(uid, PhotoRules.sentFileName(uid, PhotoRules.sentExtension("noext")), "no ext");
        Assert.AreEqual(uid, PhotoRules.sentFileName(uid, PhotoRules.sentExtension("dir.jpg/name")), "a dot in a directory part is not an ext");
        Assert.IsTrue(PhotoRules.sentFileName("x/../y", ".jpg") == null, "a non-C# uid → null");
        Assert.IsTrue(PhotoRules.sentFileName(uid, ".exe") == null, "a non-listed ext → null");
        Assert.AreEqual("photo-20261007-112233.jpg", PhotoRules.photoName(new DateTime(2026, 10, 7, 11, 22, 33, DateTimeKind.Utc), 0, 1), "one photo");
        Assert.AreEqual("photo-20261007-112233-3.jpg", PhotoRules.photoName(new DateTime(2026, 10, 7, 11, 22, 33, DateTimeKind.Utc), 2, 4), "a group member");
        Assert.AreEqual("incoming-abc.ixipart", PhotoRules.partFileName("abc"), "the part file");
        Assert.IsTrue(PhotoRules.isVideoName("clip.MOV") && !PhotoRules.isVideoName("a.jpg") && !PhotoRules.isVideoName(null), "video by extension");
    }

    [TestMethod]
    public void safe_file_name()
    {
        Assert.AreEqual("photo.jpg", PhotoRules.SafeFileName("photo.jpg"), "a plain name is kept");
        string t = PhotoRules.SafeFileName("../../etc/passwd");
        Assert.IsTrue(!t.Contains("/") && !t.Contains("\\") && !t.Contains(".."), "separators and '..' are gone: " + t);
        Assert.IsTrue(!PhotoRules.SafeFileName("a\\b\\c.txt").Contains("\\"), "backslashes are gone");
        Assert.AreEqual("a_b.txt", PhotoRules.SafeFileName("a:b.txt"), "':' (an ADS on Windows) → '_'");
        Assert.AreEqual("file", PhotoRules.SafeFileName(""), "empty → file");
        Assert.AreEqual("file", PhotoRules.SafeFileName(" . . "), "dots and spaces only → file");
        Assert.AreEqual("file", PhotoRules.SafeFileName(null), "null → file");
        Assert.AreEqual("name.txt", PhotoRules.SafeFileName("name.txt. . "), "trailing dots / spaces trimmed");
        Assert.AreEqual("_CON.txt", PhotoRules.SafeFileName("CON.txt"), "a reserved device name gets a '_'");
        Assert.AreEqual("_lpt1", PhotoRules.SafeFileName("lpt1"), "case-insensitive");
        Assert.AreEqual("CONSOLE.txt", PhotoRules.SafeFileName("CONSOLE.txt"), "only the exact stem");
        Assert.AreEqual("abc.txt", PhotoRules.SafeFileName("a\u0000b\u001Fc.txt"), "control chars dropped");
        Assert.AreEqual("innocentexe.txt", PhotoRules.SafeFileName("innocent\u202Eexe.txt"), "a bidi override is dropped (the 'gpj.exe' spoof)");
        string longName = new string('a', 300) + ".jpeg";
        string s = PhotoRules.SafeFileName(longName);
        Assert.IsTrue(s.Length <= PhotoRules.SafeNameMax && s.EndsWith(".jpeg"), "≤ 120 chars, the extension kept: " + s.Length);
        string emoji = new string('x', 115) + "😀😀😀.png";   // the cut (116 = 120 − ".png") lands inside a surrogate pair
        string se = PhotoRules.SafeFileName(emoji);
        bool paired = true;
        for (int i = 0; i < se.Length; i++)
        {
            if (char.IsHighSurrogate(se[i])) { if (i + 1 >= se.Length || !char.IsLowSurrogate(se[i + 1])) paired = false; else i++; }
            else if (char.IsLowSurrogate(se[i])) paired = false;
        }
        Assert.IsTrue(se.Length <= 120 && se.EndsWith(".png") && paired, "a surrogate pair is never split: " + se.Length);
        Assert.AreEqual("photo (2).jpg", PhotoRules.collisionName("photo.jpg", 2), "collision name");
        Assert.AreEqual("README (1)", PhotoRules.collisionName("README", 1), "collision without ext");
    }

    [TestMethod]
    public void sent_folder_containment()
    {
        string root = Path.Combine(Path.GetTempPath(), "s9root", "Sent");
        Assert.IsTrue(PhotoRules.isUnderDir(Path.Combine(root, "a.jpg"), root), "a direct child");
        Assert.IsFalse(PhotoRules.isUnderDir(Path.Combine(root, "sub", "a.jpg"), root), "not a nested file");
        Assert.IsFalse(PhotoRules.isUnderDir(Path.Combine(root, "..", "Downloads", "a.jpg"), root), "an escape → false");
        Assert.IsFalse(PhotoRules.isUnderDir(root + "X" + Path.DirectorySeparatorChar + "a.jpg", root), "a sibling with the same prefix → false");
        Assert.IsFalse(PhotoRules.isUnderDir("a.jpg", root), "a relative path → false");
        Assert.IsFalse(PhotoRules.isUnderDir(root, root), "the folder itself → false");
        Assert.IsFalse(PhotoRules.isUnderDir("", root), "empty → false");
    }

    [TestMethod]
    public void win32_multiselect_buffer()
    {
        List<string> one = PhotoRules.parseMultiSelect("/x/one.jpg\0\0junk", 10);
        Assert.IsTrue(one.Count == 1 && one[0] == "/x/one.jpg", "one file = its full path");
        List<string> many = PhotoRules.parseMultiSelect("/dir\0a.jpg\0b.png\0\0", 10);
        Assert.IsTrue(many.Count == 2 && many[0] == Path.Combine("/dir", "a.jpg") && many[1] == Path.Combine("/dir", "b.png"), "dir + names");
        Assert.AreEqual(1, PhotoRules.parseMultiSelect("/dir\0a.jpg\0b.png\0\0", 1).Count, "≤ max");
        Assert.AreEqual(1, PhotoRules.parseMultiSelect("/dir\0..\0b.png\0\0", 10).Count, "a '..' name is skipped");
        Assert.AreEqual(0, PhotoRules.parseMultiSelect(null, 10).Count, "null → none");
        Assert.AreEqual(0, PhotoRules.parseMultiSelect("\0\0", 10).Count, "empty → none");
    }

    [TestMethod]
    public void android_decode_sample_keeps_the_long_edge()
    {
        foreach (int longSide in new[] { 100, 2047, 2048, 3000, 4000, 4096, 8000, 12000, 30000, 100000 })
        {
            int s = PhotoRules.decodeSample(longSide, 2048);
            int decoded = longSide / s;
            Assert.IsTrue(s >= 1 && (s & (s - 1)) == 0, "a power of two");
            Assert.IsTrue(decoded >= Math.Min(longSide, 2048), "send: the decode is ≥ 2048 (or the source) — " + longSide + " → " + decoded);
            Assert.IsTrue(decoded < 4096 || s == 1, "send: bounded < 2 × 2048 — " + longSide + " → " + decoded);
        }
        Assert.AreEqual(1, PhotoRules.decodeSample(4000, 2048), "4000 → full decode (the old rule gave 2000, then scaled UP)");
        Assert.AreEqual(2, PhotoRules.decodeSample(4000, 1600), "the viewer keeps its old sample on a 4000-px photo");
        Assert.AreEqual(4, PhotoRules.decodeSample(12000, 1600), "12000 @ 1600 → 3000 (the old rule gave 1500 < 1600)");
        Assert.AreEqual(1, PhotoRules.decodeSample(0, 2048), "unknown size → 1");
    }

    static byte[] Jpeg(int w, int h, byte sof = 0xC0)
    {
        return new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x04, 0x4A, 0x46, 0xFF, 0xFF, sof, 0x00, 0x0B, 0x08, (byte)(h >> 8), (byte)h, (byte)(w >> 8), (byte)w, 0x01, 0x01, 0x11, 0x00 };
    }

    [TestMethod]
    public void jpeg_size_reader()
    {
        Assert.IsTrue(PhotoRules.jpegSize(Jpeg(2048, 1536), out int w, out int h) && w == 2048 && h == 1536, "baseline SOF0 (after an APP0 and a fill byte)");
        Assert.IsTrue(PhotoRules.jpegSize(Jpeg(300, 4000, 0xC2), out w, out h) && w == 300 && h == 4000, "progressive SOF2");
        Assert.IsFalse(PhotoRules.jpegSize(Jpeg(10, 10, 0xC4), out _, out _), "DHT is not a frame header");
        Assert.IsFalse(PhotoRules.jpegSize(new byte[] { 0x89, 0x50, 0x4E, 0x47 }, out _, out _), "PNG → false");
        Assert.IsFalse(PhotoRules.jpegSize(new byte[] { 0xFF, 0xD8, 0xFF, 0xDA, 0, 2 }, out _, out _), "a scan before a frame → false");
        Assert.IsFalse(PhotoRules.jpegSize(Jpeg(0, 10), out _, out _), "a zero width → false");
        Assert.IsFalse(PhotoRules.jpegSize(null, out _, out _), "null → false");
        Assert.IsFalse(PhotoRules.jpegSize(Jpeg(2048, 1536).Take(15).ToArray(), out _, out _), "truncated → false");
    }

    [TestMethod]
    public void picked_json_and_probe()
    {
        var items = new List<PhotoRules.PickedItem>
        {
            new PhotoRules.PickedItem { k = "0", thumb = "data:image/jpeg;base64,AAAA", w = 1600, h = 1200, kb = 412 },
            new PhotoRules.PickedItem { k = "2", thumb = "javascript:alert(1)", w = -5, h = 9, kb = 1 },
        };
        Assert.AreEqual("[{\"k\":\"0\",\"thumb\":\"data:image/jpeg;base64,AAAA\",\"w\":\"1600\",\"h\":\"1200\",\"kb\":\"412\",\"kind\":\"photo\"},"
            + "{\"k\":\"2\",\"thumb\":\"\",\"w\":\"0\",\"h\":\"9\",\"kb\":\"1\",\"kind\":\"photo\"}]", PhotoRules.pickedJson(items), "the contract's shape; a non-JPEG data URI is never pushed");
        var many = Enumerable.Range(0, 12).Select(i => new PhotoRules.PickedItem { k = (i % 10).ToString() }).ToList();
        Assert.AreEqual(10, PhotoRules.pickedJson(many).Split("{\"k\"").Length - 1, "≤ 10 items");
        Assert.AreEqual("[{\"k\":\"\\u003c/script\\u003e\",\"thumb\":\"\",\"w\":\"0\",\"h\":\"0\",\"kb\":\"0\",\"kind\":\"photo\"}]",
            PhotoRules.pickedJson(new List<PhotoRules.PickedItem> { new PhotoRules.PickedItem { k = "</script>" } }), "strings are escaped");
        Assert.AreEqual(1L, PhotoRules.kbOf(1), "1 byte → 1 KB");
        Assert.AreEqual(412L, PhotoRules.kbOf(412 * 1024), "exact KB");
        Assert.IsTrue(PhotoRules.thumbOk(64 * 1024) && !PhotoRules.thumbOk(64 * 1024 + 1) && !PhotoRules.thumbOk(0), "the 64 KB thumbnail cap");
        // the #1200 probe: fixed words that pass the [P1] grammar; nothing else is ever printed
        foreach (string r in new[] { "photo", "file", "camera", "paste" })
            foreach (string c in new[] { "copy", "missing-storage", "missing-data", "missing-other" })
                Assert.IsTrue(P1Perf.isValidLine("[P1] " + PhotoRules.probeLine(r, c)), "[P1] grammar: " + r + "/" + c);
        Assert.IsTrue(PhotoRules.probeLine("/sdcard/x", "copy") == null && PhotoRules.probeLine("file", "C:\\x") == null, "an unknown word → no line");
        Assert.AreEqual("missing-data", PhotoRules.copyFailureCase(true, new IOException()), "a read failure");
        Assert.AreEqual("missing-storage", PhotoRules.copyFailureCase(false, new IOException()), "a write IOException");
        Assert.AreEqual("missing-other", PhotoRules.copyFailureCase(false, new InvalidOperationException()), "anything else");
        Assert.IsTrue(PhotoRules.MaxFileBytes == 100L * 1024 * 1024 && PhotoRules.SourceMax == 20L * 1024 * 1024 && PhotoRules.MaxEdge == 2048 && PhotoRules.JpegQuality == 82, "the #1244 numbers");
    }

    [TestMethod]
    public void photo_groups_store()
    {
        var P = Microsoft.Maui.Storage.Preferences.Default;
        /* ★ S9 A3 #46 r1 (MINOR-3) re-base: the entries live in the backup-excluded SLocalOnlyStore file now (one-time
           migration out of Preferences), written deferred — a fresh folder per test, flush() before a "restart" */
        string lod = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "csh-pg-" + Guid.NewGuid().ToString("N"));
        System.IO.Directory.CreateDirectory(lod);
        SLocalOnlyStore.folder = () => lod;
        SLocalOnlyStore.resetForTests();
        SPhotoGroups.clearAll();
        SPhotoGroups.resetCacheForTest();
        string g1 = "0123456789abcdef|0|2|ab";
        Assert.IsTrue(SPhotoGroups.set("PeerA", "AABB", g1), "a valid group is stored");
        Assert.AreEqual(g1, SPhotoGroups.get("PeerA", "aabb"), "read back (id case-insensitive)");
        Assert.AreEqual("", SPhotoGroups.get("PeerB", "aabb"), "another peer → \"\"");
        Assert.IsFalse(SPhotoGroups.set("PeerA", "cc", "0123456789abcdef|2|2|"), "an invalid group is refused");
        Assert.IsFalse(SPhotoGroups.set("Pe|er", "cc", g1), "a peer with '|' is refused");
        Assert.IsFalse(SPhotoGroups.set("PeerA", "c,c", g1), "an id with ',' is refused");
        Assert.IsFalse(SPhotoGroups.set("PeerA", "aabb", "0123456789abcdef|1|2|ab", "Hostile"), "#46 r1 M-2: FIRST WRITER WINS — a replayed id cannot regroup a row");
        Assert.AreEqual(g1, SPhotoGroups.get("PeerA", "aabb"), "the first value stays");
        Assert.AreEqual("PeerA|aabb|0123456789abcdef|0|2|ab|me", SLocalOnlyStore.get("photo_groups"), "ONE local-only string, one entry per row, its sender last (default me)");
        Assert.IsFalse(P.d.ContainsKey("photo_groups"), "nothing in the backed-up preferences (#46 r1 MINOR-3)");
        Assert.IsFalse(SPhotoGroups.set("PeerA", "cd", g1, ""), "an empty sender is refused");
        Assert.IsFalse(SPhotoGroups.set("PeerA", "cd", g1, "a|b"), "a sender with '|' is refused");
        SPhotoGroups.set("PeerB", "01", g1);
        Assert.IsTrue(SLocalOnlyStore.flush(), "the deferred write lands");
        SLocalOnlyStore.resetForTests();
        SPhotoGroups.resetCacheForTest();
        Assert.AreEqual(g1, SPhotoGroups.get("PeerB", "01"), "survives a restart (re-parsed)");
        SPhotoGroups.clear("PeerA");
        Assert.AreEqual("", SPhotoGroups.get("PeerA", "aabb"), "clear(peer) forgets that peer");
        Assert.AreEqual(g1, SPhotoGroups.get("PeerB", "01"), "…and keeps the others");
        SPhotoGroups.remove("PeerB", "01");
        Assert.AreEqual("", SPhotoGroups.get("PeerB", "01"), "remove one row");
        var parsed = SPhotoGroups.parse("A|1|0123456789abcdef|0|2|,junk,B|2|0123456789abcdef|5|2|,A|1|0123456789abcdef|1|2|");
        Assert.IsTrue(parsed.Count == 1 && parsed[0] == "A|1|0123456789abcdef|0|2|", "malformed / invalid parts skipped, the FIRST entry of a row wins (#46 r1 M-2)");
        // #46 r1 m-5: the per-peer cap, linear
        var many = new System.Text.StringBuilder();
        for (int i = 0; i < SPhotoGroups.PEER_CAP + 40; i++) many.Append("Q|" + i.ToString("x") + "|0123456789abcdef|0|2||me,");
        many.Append("R|1|0123456789abcdef|0|2||me");
        var cp = SPhotoGroups.parse(many.ToString());
        Assert.IsTrue(cp.Count(x => x.StartsWith("Q|")) == SPhotoGroups.PEER_CAP && cp.Any(x => x.StartsWith("R|")), "one peer keeps at most PEER_CAP rows; another peer is untouched");
        Assert.IsTrue(cp.First(x => x.StartsWith("Q|")).StartsWith("Q|28|"), "…its NEWEST rows (0x28 = 40 = the first kept)");
        var add = new List<string>(cp);
        Assert.IsTrue(SPhotoGroups.addInto(add, "Q", "fff", "0123456789abcdef|1|2|", "me") && add.Count(x => x.StartsWith("Q|")) == SPhotoGroups.PEER_CAP, "an add past the per-peer cap drops that peer's oldest");
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var big = new System.Text.StringBuilder();
        for (int i = 0; i < 20000; i++) big.Append("P" + (i % 200) + "|" + i.ToString("x") + "|0123456789abcdef|0|2||me,");
        SPhotoGroups.parse(big.ToString());
        Assert.IsTrue(sw.ElapsedMilliseconds < 2000, "20 000 entries parse in linear time (" + sw.ElapsedMilliseconds + " ms)");
        var l = new List<string>();
        for (int i = 0; i < SPhotoGroups.CAP + 5; i++) l.Add("P|" + i.ToString("x") + "|0123456789abcdef|0|2|");
        string ser = SPhotoGroups.serialize(l, SPhotoGroups.CAP);
        Assert.IsTrue(ser.Split(',').Length == SPhotoGroups.CAP && ser.StartsWith("P|5|"), "the serialize cap keeps the NEWEST entries");
        SPhotoGroups.clearAll();
        Assert.IsTrue(!P.d.ContainsKey("photo_groups") && SPhotoGroups.get("PeerB", "01") == "", "clearAll removes the preference");
    }

    // ═══ #46 round 1 ═══
    [TestMethod]
    public void copy_bounded_never_keeps_a_partial_file()
    {
        string dir = Path.Combine(Path.GetTempPath(), "s9a1-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        try
        {
            string a = Path.Combine(dir, "a");
            Assert.AreEqual(5L, PhotoRules.copyBounded(new MemoryStream(new byte[5]), a, 5, out bool rf) , "≤ cap → the length");
            Assert.IsTrue(File.Exists(a) && new FileInfo(a).Length == 5 && !rf, "…and the file is kept");
            string b = Path.Combine(dir, "b");
            Assert.AreEqual(-1L, PhotoRules.copyBounded(new MemoryStream(new byte[200000]), b, 100000, out _), "> cap → -1");
            Assert.IsFalse(File.Exists(b), "…and the partial file is deleted");
            string c = Path.Combine(dir, "c");
            bool threw = false;
            try { PhotoRules.copyBounded(new ThrowAfter(100000), c, 1000000, out rf); } catch (IOException) { threw = true; }
            Assert.IsTrue(threw && rf && !File.Exists(c), "a READ failure throws, says readFailed and keeps no partial file (C1–C5)");
            string d = Path.Combine(dir, "d");
            File.WriteAllText(d, "keep");
            threw = false;
            try { PhotoRules.copyBounded(new MemoryStream(new byte[3]), d, 10, out rf); } catch (IOException) { threw = true; }
            Assert.IsTrue(threw && !rf && File.ReadAllText(d) == "keep", "a dest that already exists is never overwritten nor deleted");
            string e = Path.Combine(dir, "e");
            Assert.AreEqual(0L, PhotoRules.copyBounded(new MemoryStream(new byte[0]), e, 10, out _), "an empty source → 0");
        }
        finally
        {
            Directory.Delete(dir, true);
        }
    }

    sealed class ThrowAfter : Stream
    {
        long left; public ThrowAfter(long n) { left = n; }
        public override int Read(byte[] buffer, int offset, int count) { if (left <= 0) throw new IOException("boom"); int n = (int)Math.Min(count, left); left -= n; return n; }
        public override bool CanRead => true; public override bool CanSeek => false; public override bool CanWrite => false;
        public override long Length => throw new NotSupportedException(); public override long Position { get => 0; set { } }
        public override void Flush() { } public override long Seek(long o, SeekOrigin s) => throw new NotSupportedException();
        public override void SetLength(long v) { } public override void Write(byte[] b, int o, int c) { }
    }

    [TestMethod]
    public void batch_delete_set_and_small_rules_r1()
    {
        var items = new List<KeyValuePair<int, string>> { new KeyValuePair<int, string>(0, "/s/p0"), new KeyValuePair<int, string>(2, "/s/p2"), new KeyValuePair<int, string>(5, "/s/p5"), new KeyValuePair<int, string>(7, "") };
        Assert.IsTrue(PhotoRules.pathsToDelete(items, null).SequenceEqual(new[] { "/s/p0", "/s/p2", "/s/p5" }), "a drop / cancel deletes every prepared file (an empty path is skipped)");
        Assert.IsTrue(PhotoRules.pathsToDelete(items, new List<int> { 5, 0 }).SequenceEqual(new[] { "/s/p2" }), "a send deletes only the removed ones");
        Assert.AreEqual(0, PhotoRules.pathsToDelete(items, new List<int> { 0, 2, 5 }).Count, "all kept → nothing deleted");
        string uid = "0123456789abcdef0123456789abcdef";
        Assert.IsTrue(PhotoRules.isSentCopyName(uid) && PhotoRules.isSentCopyName(uid + ".jpg") && PhotoRules.isSentCopyName(uid + ".pdf"), "sent copy names");
        Assert.IsFalse(PhotoRules.isSentCopyName(uid + ".exe") || PhotoRules.isSentCopyName(uid + ".JPG") || PhotoRules.isSentCopyName("pending-0123456789abcdef-0.jpg") || PhotoRules.isSentCopyName("x" + uid) || PhotoRules.isSentCopyName(null), "anything else is never swept as a sent copy");
        Assert.IsTrue(PhotoRules.pixelsOk(10000, 10000) && !PhotoRules.pixelsOk(10001, 10000) && PhotoRules.pixelsOk(0, 0), "≤ 100 MP (unknown → the bounded decoder decides)");
        Assert.IsTrue(PhotoRules.previewLengthOk(65536) && !PhotoRules.previewLengthOk(65537) && !PhotoRules.previewLengthOk(0) && !PhotoRules.previewLengthOk(-1), "a preview ≤ 64 KB only");
        Assert.IsTrue(PhotoRules.groupedAfter(2, false) && PhotoRules.groupedAfter(1, true) && !PhotoRules.groupedAfter(1, false) && !PhotoRules.groupedAfter(0, true), "grouped over the survivors (m-4)");
    }

    [TestMethod]
    public void safe_file_name_ranges_r1()
    {
        foreach (char c in new[] { '​', '‌', '‍', '‎', '‏', '⁦', '⁧', '⁨', '⁩', '‪', '‮', '﻿', '\u0085' })
            Assert.AreEqual("ab.txt", PhotoRules.SafeFileName("a" + c + "b.txt"), "U+" + ((int)c).ToString("X4") + " is dropped");
        foreach (string r in new[] { "CONIN$", "conout$", "COM¹", "COM²", "COM³", "LPT¹", "lpt³" })
            Assert.AreEqual("_" + r + ".txt", PhotoRules.SafeFileName(r + ".txt"), "reserved: " + r);
        Assert.AreEqual("COM´.txt", PhotoRules.SafeFileName("COM´.txt"), "not a device name");
    }

    // ═══ #46 round 2 ═══
    [TestMethod]
    public void sent_sweep_victims_and_camera_codes_r2()
    {
        string u1 = "0123456789abcdef0123456789abcdef", u2 = "fedcba9876543210fedcba9876543210", u3 = "00000000000000000000000000000000";
        var leaves = new List<KeyValuePair<string, double>> {
            new KeyValuePair<string, double>(u1 + ".jpg", 3600), new KeyValuePair<string, double>(u2 + ".pdf", 3600),
            new KeyValuePair<string, double>(u3 + ".jpg", 30), new KeyValuePair<string, double>("pending-0123456789abcdef-0.jpg", 9999),
            new KeyValuePair<string, double>("notes.txt", 9999) };
        var named = new HashSet<string> { u2 + ".pdf" };
        Assert.IsTrue(PhotoRules.sentSweepVictims(leaves, named, true, 600).SequenceEqual(new[] { u1 + ".jpg" }), "an old, unnamed sent copy only (a named one, a fresh one, a pending photo and a foreign file stay)");
        Assert.AreEqual(0, PhotoRules.sentSweepVictims(leaves, named, false, 600).Count, "#46 r2 m2: a failed / partial history read deletes NOTHING");
        Assert.AreEqual(PhotoRules.ErrStorageDenied, PhotoRules.cameraErrorCode(true, PhotoRules.StorageDeniedMarker), "#46 r2 n2: the storage refusal");
        Assert.AreEqual(PhotoRules.ErrCameraDenied, PhotoRules.cameraErrorCode(true, "camera"), "the camera refusal");
        Assert.AreEqual(PhotoRules.ErrCameraDenied, PhotoRules.cameraErrorCode(false, PhotoRules.StorageDeniedMarker), "no camera at all (not a permission refusal)");
    }

    // ═══ #46 round 3 ═══
    [TestMethod]
    public void sent_paths_by_leaf_and_set_many_r3()
    {
        string u = "0123456789abcdef0123456789abcdef";
        string oldRoot = "/var/mobile/Containers/Data/Application/OLD-UUID/Documents/Spixi/Sent/" + u + ".jpg";
        Assert.AreEqual(u + ".jpg", PhotoRules.sentLeafOf(oldRoot), "#46 r3 MAJOR: a copy recorded under an OLD app root is still named (by leaf)");
        Assert.AreEqual(u, PhotoRules.sentLeafOf("C:\\Users\\x\\Spixi\\Sent\\" + u), "Windows separators, no extension");
        Assert.IsTrue(PhotoRules.sentLeafOf("/storage/emulated/0/DCIM/" + u + ".jpg") == null, "not under a Sent folder → not a sent copy");
        Assert.IsTrue(PhotoRules.sentLeafOf("/x/Sent/photo.jpg") == null && PhotoRules.sentLeafOf(u + ".jpg") == null && PhotoRules.sentLeafOf(null) == null, "a picker name / a bare leaf / null");
        Assert.IsTrue(PhotoRules.sentLeafOf("/x/Sent/../Downloads/" + u + ".jpg") == null, "the parent must BE Sent");
        Assert.AreEqual(Path.Combine("/today/Sent", u + ".jpg"), PhotoRules.rerootSent(oldRoot, "/today/Sent"), "re-rooted into today's Sent folder");
        var leaves = new List<KeyValuePair<string, double>> { new KeyValuePair<string, double>(u + ".jpg", 9999) };
        var named = new HashSet<string> { PhotoRules.sentLeafOf(oldRoot)! };
        Assert.AreEqual(0, PhotoRules.sentSweepVictims(leaves, named, true, 600).Count, "the sweep keeps a copy an old-root path names");
        // #46 r3 m3: the caps and the batch write
        Assert.IsTrue(SPhotoGroups.PEER_CAP == 1024 && SPhotoGroups.CAP == 4096, "global 4096 / per-peer 1024");
        SPhotoGroups.clearAll();
        SPhotoGroups.resetCacheForTest();
        var rows = new List<KeyValuePair<string, string>> {
            new KeyValuePair<string, string>("A1", "0123456789abcdef|0|3|cc"), new KeyValuePair<string, string>("A2", "0123456789abcdef|1|3|cc"),
            new KeyValuePair<string, string>("A3", "0123456789abcdef|2|3|cc"), new KeyValuePair<string, string>("bad", "0123456789abcdef|3|3|") };
        Assert.AreEqual(3, SPhotoGroups.setMany("Peer", rows), "the valid rows of a batch are stored in one call");
        Assert.AreEqual("0123456789abcdef|1|3|cc", SPhotoGroups.get("Peer", "a2"), "readable at once");
        Assert.AreEqual(0, SPhotoGroups.setMany("Peer", rows, "Hostile"), "first writer wins in a batch too");
        Assert.IsTrue(SPhotoGroups.isCaption("Peer", "CC", SPhotoGroups.FromMe), "the batch's sender is recorded");
        Assert.AreEqual(0, SPhotoGroups.setMany("Pe|er", rows), "an invalid peer stores nothing");
        SPhotoGroups.clearAll();
    }
}
