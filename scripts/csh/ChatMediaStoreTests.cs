// ★ photo1a PO-3 / PO-6 (P67 / P68) — the chat media cache, EXECUTED: the REAL engine (Spixi/Utils/ChatMediaStoreRules.cs)
// and the REAL glue (Spixi/Utils/ChatMediaStore.cs) on temp folders. Every rule of docs/contract-photo1a.md § 5 (B2):
// the key and the names · the header check (each field) · a stale source · a foreign account / chat · the deletes remove
// exactly their files · the bound · the LRU · the payload rules · the write (temp, then move) · never throws · no log line.
// The glue reads MAUI's FileSystem.CacheDirectory and Core's IxianHandler.getWalletStorage().getPrimaryAddress(): the two
// harness-only stubs at the end of this file stand in for them (only the members the glue touches; Core @097341a
// Meta/IxianNode.cs:319, Wallet/WalletStorage.cs:59). Not the app.
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using IXICore;
using IXICore.Meta;
using Microsoft.Maui.Storage;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

/** A temp parent folder with a store root in it; gone at Dispose. */
public sealed class MediaSandbox : IDisposable
{
    public readonly string parent;
    public readonly string root;

    public MediaSandbox()
    {
        parent = Path.Combine(Path.GetTempPath(), "csh-media-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(parent);
        root = Path.Combine(parent, ChatMediaStoreRules.RootFolderName);
        ChatMediaStoreRules.harnessLater = MediaT.inline;   // "off the caller's thread" runs at once here, so a test reads the disk right after a delete (the F8 tests put their own runner)
    }

    public ChatMediaStoreRules store(string account = "AcctOne")
    {
        ChatMediaStoreRules? s = ChatMediaStoreRules.open(root, account);
        if (s == null) throw new AssertFailed("the store did not open");
        return s;
    }

    public ChatMediaStoreRules small(int max, int keep, string account = "AcctOne", long maxBytes = ChatMediaStoreRules.MaxBytesPerAccount, long keepBytes = ChatMediaStoreRules.PruneKeepBytes)
    {
        ChatMediaStoreRules? s = ChatMediaStoreRules.open(root, account, max, keep, maxBytes, keepBytes);
        if (s == null) throw new AssertFailed("the small store did not open");
        return s;
    }

    /** The trash folders (<root>/del-…) a delete left on their way out. */
    public string[] trash()
    {
        return Directory.Exists(root) ? Directory.GetDirectories(root, ChatMediaStoreRules.TrashPrefix + "*") : new string[0];
    }

    public string[] files()
    {
        return Directory.Exists(parent) ? Directory.GetFiles(parent, "*", SearchOption.AllDirectories) : new string[0];
    }

    public string[] storeFiles()
    {
        return files().Where(f => ChatMediaStoreRules.isStoreName(Path.GetFileName(f))).ToArray();
    }

    public void Dispose()
    {
        try { if (Directory.Exists(parent)) Directory.Delete(parent, true); } catch (Exception) { }
    }
}

public static class MediaT
{
    public const char T = ChatMediaStoreRules.KindThumb, V = ChatMediaStoreRules.KindPeaks;
    public const string Id1 = "00112233445566778899aabbccddeeff", Id2 = "ffeeddccbbaa99887766554433221100";

    /** The harness's "later": at once, on the caller's thread. */
    public static readonly Action<Action> inline = a => a();

    /** A "JPEG" of n bytes: FF D8 FF, then a pattern of the seed. */
    public static byte[] jpeg(int n, int seed)
    {
        byte[] b = new byte[n];
        for (int i = 0; i < n; i++) b[i] = (byte)((i * 31 + seed * 7) & 0xFF);
        b[0] = 0xFF; b[1] = 0xD8; b[2] = 0xFF;
        return b;
    }

    /** "<durMs>|<40 peaks>" built by the REAL VoiceCodec, the way SingleChatPage.voiceInfoOf builds it. */
    public static string info(int durMs, int seed)
    {
        short[] pcm = new short[1600];
        for (int i = 0; i < pcm.Length; i++) pcm[i] = (short)(((i * (seed + 3) * 37) % 20000) - 10000);
        return durMs.ToString(System.Globalization.CultureInfo.InvariantCulture) + "|" + VoiceCodec.peaksCsv(VoiceCodec.peaks(pcm, VoiceCodec.PeakCount));
    }

    public static byte[] ascii(string s) => Encoding.ASCII.GetBytes(s);

    public static string ver(string path, long size = 1000, long ticks = 638000000000000000L) => ChatMediaStoreRules.fileVersion(path, size, ticks);

    public static string rooted(string leaf) => Path.Combine(Path.GetTempPath(), "csh-media-src", leaf);

    public static bool same(byte[]? a, byte[]? b) => a != null && b != null && a.SequenceEqual(b);

    /** The path a kept entry has on disk — recomputed from the public name rules (the test's own copy of rule 1). */
    public static string pathOf(ChatMediaStoreRules s, char kind, string chat, string idHex)
    {
        string cf = ChatMediaStoreRules.chatFolderOf(s.accountFolder, chat);
        return Path.Combine(s.root, s.accountFolder, cf, ChatMediaStoreRules.fileNameOf(cf, idHex, kind));
    }

    public static int logCount() => Logging.lines.Count + Logging.warns.Count + Logging.errors.Count;
}

[TestClass]
public class ChatMediaStoreNameTests
{
    [TestMethod]
    public void names_areHashes_noInputTextInAPath()
    {
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store("AcctSecretName");
        string src = MediaT.rooted("holiday-photo.jpg");
        Assert.IsTrue(s.put(MediaT.T, "ChatPeerName", MediaT.Id1, MediaT.ver(src), MediaT.jpeg(500, 1)), "put");
        string[] files = sb.files();
        Assert.AreEqual(1, files.Length, "one file");
        string rel = files[0].Substring(sb.root.Length);
        Assert.IsFalse(rel.Contains("AcctSecretName") || rel.Contains("ChatPeerName") || rel.Contains(MediaT.Id1) || rel.Contains("holiday"), "no account, chat, id or file name as text: " + rel);
        string[] parts = rel.Split(new[] { Path.DirectorySeparatorChar }, StringSplitOptions.RemoveEmptyEntries);
        Assert.AreEqual(3, parts.Length, "<acct16>/<chat16>/<name>");
        Assert.IsTrue(parts[0].Length == 16 && parts[1].Length == 16 && parts[0].All(Uri.IsHexDigit) && parts[1].All(Uri.IsHexDigit), "two 16-hex folders");
        Assert.IsTrue(ChatMediaStoreRules.isStoreName(parts[2]) && parts[2].EndsWith(".t1", StringComparison.Ordinal), "a 64-hex name + .t1");
        Assert.AreEqual(rel.ToLowerInvariant(), rel, "lower case only (no case twin on a case-blind disk)");
        Assert.AreEqual(files[0], MediaT.pathOf(s, MediaT.T, "ChatPeerName", MediaT.Id1), "the path is the documented rule");
    }

    [TestMethod]
    public void names_followTheContractFormula()
    {
        string hex16(string t) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(t)), 0, 8).ToLowerInvariant();
        string hex64(string t) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(t))).ToLowerInvariant();
        string acct = ChatMediaStoreRules.accountFolderOf("AcctOne");
        Assert.AreEqual(hex16("spixi-media-acct:AcctOne"), acct, "the account folder");
        string chat = ChatMediaStoreRules.chatFolderOf(acct, "PeerA");
        Assert.AreEqual(hex16("spixi-media-chat:" + acct + ":PeerA"), chat, "the chat folder");
        Assert.AreEqual(hex64("spixi-media-msg:" + chat + ":" + MediaT.Id1 + ":t1") + ".t1", ChatMediaStoreRules.fileNameOf(chat, MediaT.Id1, MediaT.T), "the thumbnail name");
        Assert.AreEqual(hex64("spixi-media-msg:" + chat + ":" + MediaT.Id1 + ":v1") + ".v1", ChatMediaStoreRules.fileNameOf(chat, MediaT.Id1, MediaT.V), "the peaks name");
        Assert.AreEqual("spixi-media1", ChatMediaStoreRules.RootFolderName, "the root folder's name");
    }

    [TestMethod]
    public void key_changesWithEveryField()
    {
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules a = sb.store("AcctOne"), b = sb.store("AcctTwo");
        string v = MediaT.ver(MediaT.rooted("a.jpg"));
        string k0 = a.memoryKey(MediaT.T, "PeerA", MediaT.Id1, v)!;
        Assert.AreEqual(64, k0.Length, "a 64-hex memory key");
        Assert.AreEqual(k0, a.memoryKey(MediaT.T, "PeerA", MediaT.Id1, v), "the same input, the same key");
        Assert.AreEqual(k0, a.memoryKey(MediaT.T, "PeerA", MediaT.Id1.ToUpperInvariant(), v), "the id's hex case does not matter");
        var others = new List<string?> {
            b.memoryKey(MediaT.T, "PeerA", MediaT.Id1, v),                                         // another account
            a.memoryKey(MediaT.T, "PeerB", MediaT.Id1, v),                                         // another chat
            a.memoryKey(MediaT.T, "PeerA", MediaT.Id2, v),                                         // another message
            a.memoryKey(MediaT.V, "PeerA", MediaT.Id1, v),                                         // another kind
            a.memoryKey(MediaT.T, "PeerA", MediaT.Id1, MediaT.ver(MediaT.rooted("a.jpg"), 1001)),   // another size
            a.memoryKey(MediaT.T, "PeerA", MediaT.Id1, MediaT.ver(MediaT.rooted("a.jpg"), 1000, 638000000000000001L)),   // another write time
            a.memoryKey(MediaT.T, "PeerA", MediaT.Id1, MediaT.ver(MediaT.rooted("b.jpg"))),         // another path
        };
        Assert.IsTrue(others.All(k => k != null && k != k0) && others.Distinct().Count() == others.Count, "each field alone changes the key");
        Assert.IsTrue(MediaT.pathOf(a, MediaT.T, "PeerA", MediaT.Id1) != MediaT.pathOf(b, MediaT.T, "PeerA", MediaT.Id1), "another account, another folder");
        Assert.IsTrue(MediaT.pathOf(a, MediaT.T, "PeerA", MediaT.Id1) != MediaT.pathOf(a, MediaT.T, "PeerB", MediaT.Id1), "another chat, another folder");
        Assert.IsTrue(MediaT.pathOf(a, MediaT.T, "PeerA", MediaT.Id1) != MediaT.pathOf(a, MediaT.T, "PeerA", MediaT.Id2), "another message, another name");
        Assert.IsTrue(MediaT.pathOf(a, MediaT.T, "PeerA", MediaT.Id1) != MediaT.pathOf(a, MediaT.V, "PeerA", MediaT.Id1), "another kind, another name");
    }

    [TestMethod]
    public void keyText_isTheContractShape_andOneTextPerInput()
    {
        string v = MediaT.ver(MediaT.rooted("a.jpg"), 12, 34);
        Assert.AreEqual("AcctOne|PeerA|" + MediaT.Id1 + "|t1|" + v + "|320", ChatMediaStoreRules.keyText("AcctOne", "PeerA", MediaT.Id1, MediaT.T, v), "acct|chat|idHex|kind|sourceVersion|px");
        Assert.AreEqual("AcctOne|PeerA|" + MediaT.Id1 + "|v1|t|5|ab|40", ChatMediaStoreRules.keyText("AcctOne", "PeerA", MediaT.Id1, MediaT.V, "t|5|ab"), "peaks: the last field is the bar count");
        // the separator can only come from the source version — the fields around it cannot hold one
        Assert.IsTrue(ChatMediaStoreRules.keyText("Acct|One", "PeerA", MediaT.Id1, MediaT.T, v) == null, "an account with the separator is refused");
        Assert.IsTrue(ChatMediaStoreRules.keyText("AcctOne", "Peer|A", MediaT.Id1, MediaT.T, v) == null, "a chat with the separator is refused");
        Assert.IsTrue(ChatMediaStoreRules.keyText("AcctOne", "../PeerA", MediaT.Id1, MediaT.T, v) == null, "a chat with a path character is refused");
        Assert.IsTrue(ChatMediaStoreRules.keyText("AcctOne", "PeerA", "00|11", MediaT.T, v) == null, "an id that is not hex is refused");
        Assert.IsTrue(ChatMediaStoreRules.keyText("AcctOne", "PeerA", "null", MediaT.T, v) == null, "Crypto.hashToString(null) = \"null\" is refused");
        Assert.IsTrue(ChatMediaStoreRules.keyText("AcctOne", "PeerA", "", MediaT.T, v) == null && ChatMediaStoreRules.keyText("AcctOne", "PeerA", new string('a', 129), MediaT.T, v) == null, "an empty / over-long id is refused");
        Assert.IsTrue(ChatMediaStoreRules.keyText("AcctOne", "PeerA", MediaT.Id1, 'x', v) == null, "an unknown kind is refused");
        Assert.IsTrue(ChatMediaStoreRules.keyText("AcctOne", "PeerA", MediaT.Id1, MediaT.T, "") == null && ChatMediaStoreRules.keyText("AcctOne", "PeerA", MediaT.Id1, MediaT.T, null) == null, "no source version is refused");
        Assert.IsTrue(ChatMediaStoreRules.keyText("", "PeerA", MediaT.Id1, MediaT.T, v) == null && ChatMediaStoreRules.keyText(null, "PeerA", MediaT.Id1, MediaT.T, v) == null, "no account is refused");
    }

    [TestMethod]
    public void versions_haveTheContractShape()
    {
        string p = MediaT.rooted("x.jpg");
        Assert.AreEqual(p + "|123|456", ChatMediaStoreRules.fileVersion(p, 123, 456), "path|size|ticks");
        Assert.AreEqual(p, ChatMediaStoreRules.sourcePathOf(p + "|123|456"), "the path comes back out of a file version");
        string pipe = MediaT.rooted("a|b|7.jpg");
        Assert.AreEqual(pipe, ChatMediaStoreRules.sourcePathOf(ChatMediaStoreRules.fileVersion(pipe, 1, 2)), "a path that holds the separator");
        string t = "Voice message (0:03)\nspixi.voice.1:3000:AAAA";
        string iv = ChatMediaStoreRules.inlineVersion(t);
        string want = "t|" + t.Length + "|" + Convert.ToHexString(SHA256.HashData(System.Runtime.InteropServices.MemoryMarshal.AsBytes(t.AsSpan()))).ToLowerInvariant();
        Assert.AreEqual(want, iv, "t|length|sha256 of the text");
        Assert.IsTrue(ChatMediaStoreRules.sourcePathOf(iv) == null, "an inline version is never taken for a file version");
        string t2 = "Voice message (0:03)\nspixi.voice.1:3000:AAAB";
        Assert.IsTrue(t.Length == t2.Length && ChatMediaStoreRules.inlineVersion(t2) != iv, "the same length, another text → another version");
        Assert.IsTrue(ChatMediaStoreRules.inlineVersion("a\uD800b") != ChatMediaStoreRules.inlineVersion("a\uD801b"), "two texts with a lone surrogate never share a version");
        Assert.IsTrue(ChatMediaStoreRules.sourcePathOf(null) == null && ChatMediaStoreRules.sourcePathOf("x") == null && ChatMediaStoreRules.sourcePathOf("rel/x.jpg|1|2") == null, "not a file version → no path");
    }

    [TestMethod]
    public void root_mustBeARootedFolderNamedSpixiMedia1()
    {
        using MediaSandbox sb = new MediaSandbox();
        Assert.IsTrue(ChatMediaStoreRules.open(sb.root, "AcctOne") != null, "the right root opens");
        Assert.IsTrue(ChatMediaStoreRules.open(sb.parent, "AcctOne") == null, "a folder with another name is refused");
        Assert.IsTrue(ChatMediaStoreRules.open(ChatMediaStoreRules.RootFolderName, "AcctOne") == null, "a relative path is refused");
        Assert.IsTrue(ChatMediaStoreRules.open("", "AcctOne") == null && ChatMediaStoreRules.open(null, "AcctOne") == null, "no root is refused");
        Assert.IsTrue(ChatMediaStoreRules.open(sb.root, "") == null && ChatMediaStoreRules.open(sb.root, null) == null && ChatMediaStoreRules.open(sb.root, "a/b") == null, "no / a bad account is refused");
        Assert.IsFalse(Directory.Exists(sb.root), "opening creates nothing");
    }
}

[TestClass]
public class ChatMediaStoreReadTests
{
    [TestMethod]
    public void roundTrip_thumbAndPeaks()
    {
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        string v = MediaT.ver(MediaT.rooted("a.jpg"));
        byte[] j = MediaT.jpeg(20000, 3);
        Assert.IsTrue(s.get(MediaT.T, "PeerA", MediaT.Id1, v) == null, "empty store: a miss");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, v, j), "put thumb");
        Assert.IsTrue(MediaT.same(j, s.get(MediaT.T, "PeerA", MediaT.Id1, v)), "the same bytes come back");
        Assert.IsTrue(MediaT.same(j, sb.store().get(MediaT.T, "PeerA", MediaT.Id1, v)), "…also through a new instance (the next app start)");
        string info = MediaT.info(2980, 5);
        string iv = ChatMediaStoreRules.inlineVersion("line\nspixi.voice.1:2980:AAAA");
        Assert.IsTrue(s.put(MediaT.V, "PeerA", MediaT.Id1, iv, MediaT.ascii(info)), "put peaks");
        Assert.AreEqual(info, Encoding.ASCII.GetString(s.get(MediaT.V, "PeerA", MediaT.Id1, iv)!), "the same info comes back");
        Assert.IsTrue(MediaT.same(j, s.get(MediaT.T, "PeerA", MediaT.Id1, v)), "the thumbnail of the same id is untouched by its peaks");
        Assert.AreEqual(2, sb.files().Length, "two files, no temp left");
        Assert.IsTrue(sb.files().All(f => ChatMediaStoreRules.isStoreName(Path.GetFileName(f))), "only store names on disk");
        byte[] max = MediaT.jpeg(ChatMediaStoreRules.ThumbMaxBytes, 9);
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id2, v, max) && MediaT.same(max, s.get(MediaT.T, "PeerA", MediaT.Id2, v)), "a thumbnail of exactly 64 KB is kept");
    }

    /** Write a valid entry, hand its file image to `change`, write the result back: the read must miss AND the file must go. */
    private static void tamper(string what, Func<byte[], byte[]> change)
    {
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        string v = MediaT.ver(MediaT.rooted("a.jpg"));
        byte[] j = MediaT.jpeg(3000, 4);
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, v, j), what + ": put");
        string path = MediaT.pathOf(s, MediaT.T, "PeerA", MediaT.Id1);
        byte[] file = File.ReadAllBytes(path);
        Assert.IsTrue(MediaT.same(j, ChatMediaStoreRules.decode(MediaT.T, file.Skip(ChatMediaStoreRules.KeyHashAt).Take(32).ToArray(), file.Skip(ChatMediaStoreRules.SourceTagAt).Take(16).ToArray(), file)), what + ": the untouched image decodes");
        File.WriteAllBytes(path, change(file));
        Assert.IsTrue(s.get(MediaT.T, "PeerA", MediaT.Id1, v) == null, what + ": a miss");
        Assert.IsFalse(File.Exists(path), what + ": the bad file is deleted");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, v, j) && MediaT.same(j, s.get(MediaT.T, "PeerA", MediaT.Id1, v)), what + ": made again, it is served");
    }

    private static byte[] flip(byte[] f, int at) { byte[] c = (byte[])f.Clone(); c[at] ^= 0x01; return c; }

    [TestMethod] public void header_magicChanged_missAndGone() { tamper("magic", f => flip(f, ChatMediaStoreRules.MagicAt + 3)); }
    [TestMethod] public void header_kindChanged_missAndGone() { tamper("kind", f => { byte[] c = (byte[])f.Clone(); c[ChatMediaStoreRules.KindAt] = (byte)MediaT.V; return c; }); }
    [TestMethod] public void header_keyHashChanged_missAndGone() { tamper("key hash", f => flip(f, ChatMediaStoreRules.KeyHashAt + 31)); }
    [TestMethod] public void header_sourceTagChanged_missAndGone() { tamper("source tag", f => flip(f, ChatMediaStoreRules.SourceTagAt + 9)); }
    [TestMethod] public void header_lengthChanged_missAndGone() { tamper("length", f => flip(f, ChatMediaStoreRules.LengthAt)); }
    [TestMethod] public void header_payloadHashChanged_missAndGone() { tamper("payload hash", f => flip(f, ChatMediaStoreRules.PayloadHashAt + 5)); }
    [TestMethod] public void payload_oneByteChanged_missAndGone() { tamper("payload byte", f => flip(f, f.Length - 1)); }
    [TestMethod] public void file_truncated_missAndGone() { tamper("truncated", f => f.Take(f.Length - 10).ToArray()); }
    [TestMethod] public void file_headerOnly_missAndGone() { tamper("header only", f => f.Take(ChatMediaStoreRules.HeaderLength).ToArray()); }
    [TestMethod] public void file_empty_missAndGone() { tamper("empty", f => new byte[0]); }
    [TestMethod] public void file_extended_missAndGone() { tamper("extended", f => f.Concat(new byte[] { 0 }).ToArray()); }
    [TestMethod] public void file_zeroFilledSameLength_missAndGone() { tamper("zero-filled (a torn write)", f => new byte[f.Length]); }
    [TestMethod] public void file_payloadTornButHeaderWhole_missAndGone() { tamper("payload torn", f => { byte[] c = (byte[])f.Clone(); for (int i = ChatMediaStoreRules.HeaderLength + 100; i < c.Length; i++) c[i] = 0; return c; }); }
    [TestMethod] public void file_tooLong_missAndGone() { tamper("over the cap", f => f.Concat(new byte[ChatMediaStoreRules.ThumbMaxBytes]).ToArray()); }

    [TestMethod]
    public void payload_notAJpeg_evenWithAValidHeader_missAndGone()
    {
        // a file whose header, length and payload hash are all right for the key — but the payload is not a JPEG
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        string v = MediaT.ver(MediaT.rooted("a.jpg"));
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, v, MediaT.jpeg(100, 1)), "put");
        string path = MediaT.pathOf(s, MediaT.T, "PeerA", MediaT.Id1);
        byte[] keyHash = File.ReadAllBytes(path).Skip(ChatMediaStoreRules.KeyHashAt).Take(32).ToArray();
        byte[] tag = File.ReadAllBytes(path).Skip(ChatMediaStoreRules.SourceTagAt).Take(16).ToArray();
        Assert.IsTrue(tag.Any(b => b != 0) && MediaT.same(tag, ChatMediaStoreRules.sourceTagOf(s.accountFolder, MediaT.rooted("a.jpg"))), "a file version carries its source tag");
        byte[] good = MediaT.jpeg(200, 2);
        File.WriteAllBytes(path, ChatMediaStoreRules.encode(MediaT.T, keyHash, tag, good));
        Assert.IsTrue(MediaT.same(good, s.get(MediaT.T, "PeerA", MediaT.Id1, v)), "the hand-made image is whole: a JPEG payload under it is served");
        foreach (byte[] notJpeg in new[] { Encoding.ASCII.GetBytes("<script>alert(1)</script>"), new byte[] { 0x00, 0xD8, 0xFF, 1, 2 }, new byte[] { 0xFF, 0x00, 0xFF, 1, 2 }, new byte[] { 0xFF, 0xD8, 0x00, 1, 2 } })
        {
            File.WriteAllBytes(path, ChatMediaStoreRules.encode(MediaT.T, keyHash, tag, notJpeg));
            Assert.IsTrue(s.get(MediaT.T, "PeerA", MediaT.Id1, v) == null && !File.Exists(path), "not FF D8 FF → a miss, deleted");
        }
        // the same for peaks: a valid header around a text that is not the grammar
        string iv = "t|3|abc";
        Assert.IsTrue(s.put(MediaT.V, "PeerA", MediaT.Id1, iv, MediaT.ascii(MediaT.info(100, 1))), "put peaks");
        string vpath = MediaT.pathOf(s, MediaT.V, "PeerA", MediaT.Id1);
        byte[] vkey = File.ReadAllBytes(vpath).Skip(ChatMediaStoreRules.KeyHashAt).Take(32).ToArray();
        Assert.IsTrue(File.ReadAllBytes(vpath).Skip(ChatMediaStoreRules.SourceTagAt).Take(16).All(b => b == 0), "an inline version carries no source tag");
        string other = MediaT.info(777, 9);
        File.WriteAllBytes(vpath, ChatMediaStoreRules.encode(MediaT.V, vkey, null, MediaT.ascii(other)));
        Assert.AreEqual(other, Encoding.ASCII.GetString(s.get(MediaT.V, "PeerA", MediaT.Id1, iv)!), "the hand-made image is whole: a text of the grammar under it is served");
        File.WriteAllBytes(vpath, ChatMediaStoreRules.encode(MediaT.V, vkey, null, MediaT.ascii("100|1,2,3');alert(1);//")));
        Assert.IsTrue(s.get(MediaT.V, "PeerA", MediaT.Id1, iv) == null && !File.Exists(vpath), "not the peaks grammar → a miss, deleted");
    }

    [TestMethod]
    public void staleSource_sizeOrTimeOrPathChanged_isAMiss()
    {
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        string p = MediaT.rooted("a.jpg");
        byte[] j = MediaT.jpeg(4000, 1);
        string path = MediaT.pathOf(s, MediaT.T, "PeerA", MediaT.Id1);
        foreach (string changed in new[] { MediaT.ver(p, 1001), MediaT.ver(p, 1000, 638000000000000001L), MediaT.ver(MediaT.rooted("b.jpg")) })
        {
            Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, MediaT.ver(p), j), "put the first version");
            Assert.IsTrue(s.get(MediaT.T, "PeerA", MediaT.Id1, changed) == null, "the source changed → a miss, never the old picture");
            Assert.IsFalse(File.Exists(path), "the stale file is deleted");
            Assert.IsTrue(s.get(MediaT.T, "PeerA", MediaT.Id1, MediaT.ver(p)) == null, "…and the old version does not come back either");
        }
        // inline voice: the text changed (an edit of the same length)
        string a = ChatMediaStoreRules.inlineVersion("x\nspixi.voice.1:100:AAAA"), b = ChatMediaStoreRules.inlineVersion("x\nspixi.voice.1:100:AAAB");
        Assert.IsTrue(s.put(MediaT.V, "PeerA", MediaT.Id1, a, MediaT.ascii(MediaT.info(100, 1))), "put peaks of text a");
        Assert.IsTrue(s.get(MediaT.V, "PeerA", MediaT.Id1, b) == null, "another text under the same id → a miss");
    }

    [TestMethod]
    public void sameIdTwoFiles_neverShareAPicture()
    {
        // two rows with the SAME sender-chosen id in one chat, different files: each only ever gets its own picture
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        string v1 = MediaT.ver(MediaT.rooted("one.jpg")), v2 = MediaT.ver(MediaT.rooted("two.jpg"), 2222);
        byte[] j1 = MediaT.jpeg(1000, 1), j2 = MediaT.jpeg(1200, 2);
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, v1, j1), "put row 1");
        Assert.IsTrue(s.get(MediaT.T, "PeerA", MediaT.Id1, v2) == null, "row 2 never reads row 1's picture");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, v2, j2), "put row 2 (the same name)");
        Assert.IsTrue(s.get(MediaT.T, "PeerA", MediaT.Id1, v1) == null, "row 1 never reads row 2's picture");
        Assert.IsTrue(s.get(MediaT.T, "PeerA", MediaT.Id1, v2) == null, "the mismatch deleted the shared file: row 2 is made again, not guessed");
    }

    [TestMethod]
    public void foreignAccount_underTheRightName_isAMissAndGone()
    {
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules a = sb.store("AcctOne"), b = sb.store("AcctTwo");
        string v = MediaT.ver(MediaT.rooted("a.jpg"));
        byte[] ja = MediaT.jpeg(900, 1);
        Assert.IsTrue(a.put(MediaT.T, "PeerA", MediaT.Id1, v, ja), "account one puts");
        Assert.IsTrue(b.get(MediaT.T, "PeerA", MediaT.Id1, v) == null, "account two: a plain miss (another folder)");
        // …and even when account one's file is COPIED to exactly the place account two reads
        string from = MediaT.pathOf(a, MediaT.T, "PeerA", MediaT.Id1), to = MediaT.pathOf(b, MediaT.T, "PeerA", MediaT.Id1);
        Directory.CreateDirectory(Path.GetDirectoryName(to)!);
        File.Copy(from, to);
        Assert.IsTrue(b.get(MediaT.T, "PeerA", MediaT.Id1, v) == null, "a foreign account's file under the right name → a miss");
        Assert.IsFalse(File.Exists(to), "…and it is deleted");
        Assert.IsTrue(MediaT.same(ja, a.get(MediaT.T, "PeerA", MediaT.Id1, v)), "account one still has its own");
    }

    [TestMethod]
    public void foreignChat_underTheRightName_isAMissAndGone()
    {
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        string v = MediaT.ver(MediaT.rooted("a.jpg"));
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, v, MediaT.jpeg(900, 1)), "chat A puts");
        Assert.IsTrue(s.get(MediaT.T, "PeerB", MediaT.Id1, v) == null, "chat B, the same id and file: a plain miss");
        string from = MediaT.pathOf(s, MediaT.T, "PeerA", MediaT.Id1), to = MediaT.pathOf(s, MediaT.T, "PeerB", MediaT.Id1);
        Directory.CreateDirectory(Path.GetDirectoryName(to)!);
        File.Copy(from, to);
        Assert.IsTrue(s.get(MediaT.T, "PeerB", MediaT.Id1, v) == null && !File.Exists(to), "chat A's file under chat B's name → a miss, deleted");
        // another message's file under this message's name, the same chat
        string to2 = MediaT.pathOf(s, MediaT.T, "PeerA", MediaT.Id2);
        File.Copy(from, to2);
        Assert.IsTrue(s.get(MediaT.T, "PeerA", MediaT.Id2, v) == null && !File.Exists(to2), "another message's file under this name → a miss, deleted");
        // a thumbnail under the peaks name
        string to3 = MediaT.pathOf(s, MediaT.V, "PeerA", MediaT.Id1);
        File.Copy(from, to3);
        Assert.IsTrue(s.get(MediaT.V, "PeerA", MediaT.Id1, v) == null && !File.Exists(to3), "another kind's file under this name → a miss, deleted");
    }

    [TestMethod]
    public void ioErrorMidRead_isAMiss_andTheFileIsDiscarded()
    {
        // review round 1 (n6): the read FAILS (not "no such file"): another handle holds the file with no sharing —
        // .NET refuses the open with an IOException on every platform. A miss; the unreadable file is not kept; the
        // count follows (with a count that stayed at the bound of 3, the last put below would prune to 1).
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.small(3, 1);
        string v = MediaT.ver(MediaT.rooted("a.jpg"));
        byte[] j = MediaT.jpeg(900, 1);
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, v, j) && s.put(MediaT.T, "PeerA", MediaT.Id2, v, j) && s.put(MediaT.T, "PeerA", "cc", v, j), "three entries: the folder is at its bound");
        string path = MediaT.pathOf(s, MediaT.T, "PeerA", MediaT.Id1);
        using (FileStream held = new FileStream(path, FileMode.Open, FileAccess.ReadWrite, FileShare.None))
        {
            bool refused = false;
            try { using (new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete)) { } } catch (IOException) { refused = true; }
            Assert.IsTrue(refused, "the harness's premise: the store's own open fails here");
            Assert.IsTrue(s.get(MediaT.T, "PeerA", MediaT.Id1, v) == null, "an IO error mid-read: a miss, no throw");
        }
        Assert.IsFalse(File.Exists(path), "the file that could not be read was discarded");
        Assert.IsTrue(MediaT.same(j, s.get(MediaT.T, "PeerA", MediaT.Id2, v)), "the other entry is untouched");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", "ab", v, j), "the discard was counted: a new name fits without a prune");
        Assert.IsTrue(MediaT.same(j, s.get(MediaT.T, "PeerA", MediaT.Id2, v)) && MediaT.same(j, s.get(MediaT.T, "PeerA", "cc", v)) && sb.files().Length == 3, "…both other entries are still there (a prune to 1 would have taken them)");
    }

    [TestMethod]
    public void cacheClearedByTheOs_isAPlainMiss_andTheStoreGoesOn()
    {
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        string v = MediaT.ver(MediaT.rooted("a.jpg"));
        byte[] j = MediaT.jpeg(900, 1);
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, v, j), "put");
        Directory.Delete(sb.root, true);   // "Clear cache" / the OS under storage pressure
        Assert.IsTrue(s.get(MediaT.T, "PeerA", MediaT.Id1, v) == null, "the folder is gone → a miss, no throw");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, v, j) && MediaT.same(j, s.get(MediaT.T, "PeerA", MediaT.Id1, v)), "made again");
        File.Delete(MediaT.pathOf(s, MediaT.T, "PeerA", MediaT.Id1));
        Assert.IsTrue(s.get(MediaT.T, "PeerA", MediaT.Id1, v) == null, "one file gone → a miss");
    }
}

[TestClass]
public class ChatMediaStorePayloadTests
{
    [TestMethod]
    public void thumb_onlyAJpegUpTo64Kb()
    {
        Assert.AreEqual(64 * 1024, ChatMediaStoreRules.ThumbMaxBytes, "ChatThumbMaxBytes");
        Assert.AreEqual(320, ChatMediaStoreRules.ThumbPx, "ChatThumbPx");
        Assert.IsTrue(ChatMediaStoreRules.thumbOk(MediaT.jpeg(3, 0)) && ChatMediaStoreRules.thumbOk(MediaT.jpeg(64 * 1024, 0)), "3 bytes … 64 KB");
        Assert.IsFalse(ChatMediaStoreRules.thumbOk(MediaT.jpeg(64 * 1024 + 1, 0)), "one byte over");
        Assert.IsFalse(ChatMediaStoreRules.thumbOk(null) || ChatMediaStoreRules.thumbOk(new byte[0]) || ChatMediaStoreRules.thumbOk(new byte[] { 0xFF, 0xD8 }), "null / empty / two bytes");
        Assert.IsFalse(ChatMediaStoreRules.thumbOk(new byte[] { 0x00, 0xD8, 0xFF, 1 }) || ChatMediaStoreRules.thumbOk(new byte[] { 0xFF, 0x00, 0xFF, 1 }) || ChatMediaStoreRules.thumbOk(new byte[] { 0xFF, 0xD8, 0x00, 1 }), "each of the three first bytes counts");
        Assert.IsFalse(ChatMediaStoreRules.thumbOk(new byte[] { 0x89, 0x50, 0x4E, 0x47 }) || ChatMediaStoreRules.thumbOk(Encoding.ASCII.GetBytes("<svg onload=x>")), "a PNG / an SVG is not kept");
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        string v = MediaT.ver(MediaT.rooted("a.jpg"));
        Assert.IsFalse(s.put(MediaT.T, "PeerA", MediaT.Id1, v, MediaT.jpeg(64 * 1024 + 1, 0)), "too big: not kept");
        Assert.IsFalse(s.put(MediaT.T, "PeerA", MediaT.Id1, v, new byte[] { 1, 2, 3, 4 }), "not a JPEG: not kept");
        Assert.IsFalse(s.put(MediaT.T, "PeerA", MediaT.Id1, v, null), "null: not kept");
        Assert.AreEqual(0, sb.files().Length, "a refused put writes nothing");
    }

    [TestMethod]
    public void peaks_exactlyTodaysGrammar()
    {
        Assert.AreEqual(4096, ChatMediaStoreRules.PeaksMaxBytes, "the peaks cap");
        Assert.AreEqual(40, VoiceCodec.PeakCount, "40 bars");
        // what the REAL code emits passes — a loud clip, silence, the longest and the shortest clip
        Assert.IsTrue(ChatMediaStoreRules.peaksInfoOk(MediaT.info(2980, 1)), "a real info");
        Assert.IsTrue(ChatMediaStoreRules.peaksInfoOk("0|" + VoiceCodec.peaksCsv(VoiceCodec.peaks(new short[0], VoiceCodec.PeakCount))), "silence, 0 ms");
        Assert.IsTrue(ChatMediaStoreRules.peaksInfoOk(VoiceCodec.ParseMaxDurationMs + "|" + VoiceCodec.peaksCsv(VoiceCodec.peaks(new short[] { short.MinValue, 5, -7, short.MaxValue }, VoiceCodec.PeakCount))), "the longest clip, the loudest samples");
        string forty = string.Join(",", Enumerable.Range(0, 40).Select(i => (i * 5 % 101).ToString()));
        Assert.IsTrue(ChatMediaStoreRules.peaksInfoOk("1500|" + forty), "40 numbers 0–100");
        Assert.IsTrue(ChatMediaStoreRules.peaksInfoOk("1500|" + string.Join(",", Enumerable.Repeat("100", 40))), "all 100");
        // everything else does not
        string thirtyNine = string.Join(",", Enumerable.Repeat("7", 39)), fortyOne = string.Join(",", Enumerable.Repeat("7", 41));
        foreach (string bad in new[] {
            "", "1500", "1500|", "|" + forty, "1500|" + thirtyNine, "1500|" + fortyOne, "1500|" + forty + ",", "1500|," + forty.Substring(2),
            "-1|" + forty, "+5|" + forty, "015|" + forty, "31001|" + forty, "123456|" + forty, "1 5|" + forty, "1500 |" + forty, "1500|" + forty + "\n",
            "1500|" + forty.Replace("0,", "101,"), "1500|" + "07," + forty.Substring(2), "1500|" + forty.Replace(",", ", "), "1500|" + forty.Replace(",", ";"),
            "1500|" + forty + "|1", "1500|" + thirtyNine + ",x", "1500|" + thirtyNine + ",-1", "1500|" + thirtyNine + ",1e1", "１５００|" + forty,
            "1500|" + thirtyNine + ",1');alert(1);//" })
        {
            Assert.IsFalse(ChatMediaStoreRules.peaksInfoOk(bad), "refused: [" + bad + "]");
        }
        Assert.IsFalse(ChatMediaStoreRules.peaksInfoOk(null), "null");
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        Assert.IsFalse(s.put(MediaT.V, "PeerA", MediaT.Id1, "t|1|aa", MediaT.ascii("1500|" + thirtyNine)), "39 bars: not kept");
        Assert.IsFalse(s.put(MediaT.V, "PeerA", MediaT.Id1, "t|1|aa", new byte[] { (byte)'1', (byte)'|', 0xC3, 0xA9 }), "non-ASCII: not kept");
        Assert.IsFalse(s.put(MediaT.V, "PeerA", MediaT.Id1, "t|1|aa", MediaT.jpeg(100, 1)), "a JPEG as peaks: not kept");
        Assert.AreEqual(0, sb.files().Length, "a refused put writes nothing");
    }
}

[TestClass]
public class ChatMediaStoreWriteTests
{
    [TestMethod]
    public void write_tempThenMove_leavesNoTemp_andOverwrites()
    {
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        string v = MediaT.ver(MediaT.rooted("a.jpg"));
        byte[] j1 = MediaT.jpeg(900, 1), j2 = MediaT.jpeg(1100, 2);
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, v, j1) && s.put(MediaT.T, "PeerA", MediaT.Id1, v, j2), "two puts of one key");
        Assert.AreEqual(1, sb.files().Length, "one file — the second put replaced the first, no temp is left");
        Assert.IsTrue(MediaT.same(j2, s.get(MediaT.T, "PeerA", MediaT.Id1, v)), "the last put is served");
    }

    [TestMethod]
    public void write_aLeftoverTempIsNeverServed_andIsSweptWhenOld()
    {
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        string v = MediaT.ver(MediaT.rooted("a.jpg"));
        byte[] j = MediaT.jpeg(900, 1);
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, v, j), "put");
        string final = MediaT.pathOf(s, MediaT.T, "PeerA", MediaT.Id1);
        // a kill between the temp write and the move: the whole image sits in a .tmp, the final name is absent
        string temp = Path.Combine(Path.GetDirectoryName(final)!, Guid.NewGuid().ToString("N") + ChatMediaStoreRules.TempExtension);
        File.Move(final, temp);
        Assert.IsTrue(s.get(MediaT.T, "PeerA", MediaT.Id1, v) == null, "a temp file is never read");
        Assert.IsFalse(ChatMediaStoreRules.isStoreName(Path.GetFileName(temp)), "a temp name is not a store name");
        // old enough, the next process's first count removes it
        File.SetLastWriteTimeUtc(temp, DateTime.UtcNow.AddMinutes(-11));
        string young = Path.Combine(Path.GetDirectoryName(final)!, Guid.NewGuid().ToString("N") + ChatMediaStoreRules.TempExtension);
        File.WriteAllBytes(young, new byte[] { 1 });
        s.deleteChat("UnusedChat");   // "not counted yet": the next put counts the folder again, as a new process does
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id2, v, j), "a put counts the folder first");
        Assert.IsFalse(File.Exists(temp), "the old stray temp is gone");
        Assert.IsTrue(File.Exists(young), "a young one is left alone (it could be a write in flight)");
    }

    [TestMethod]
    public void write_failure_leavesNothingThatPasses_andNeverThrows()
    {
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        string v = MediaT.ver(MediaT.rooted("a.jpg"));
        // the chat folder's place is taken by a FILE: the directory cannot be made, the write fails
        string chatDir = Path.GetDirectoryName(MediaT.pathOf(s, MediaT.T, "PeerA", MediaT.Id1))!;
        Directory.CreateDirectory(Path.GetDirectoryName(chatDir)!);
        File.WriteAllBytes(chatDir, new byte[] { 1 });
        Assert.IsFalse(s.put(MediaT.T, "PeerA", MediaT.Id1, v, MediaT.jpeg(900, 1)), "the put reports false, no throw");
        Assert.IsTrue(s.get(MediaT.T, "PeerA", MediaT.Id1, v) == null, "nothing is served");
        Assert.AreEqual(0, sb.storeFiles().Length, "no store file was made");
        // the final name is taken by a DIRECTORY: the move fails, the temp is removed
        string ok = MediaT.pathOf(s, MediaT.T, "PeerB", MediaT.Id1);
        Directory.CreateDirectory(ok);
        Assert.IsFalse(s.put(MediaT.T, "PeerB", MediaT.Id1, v, MediaT.jpeg(900, 1)), "the move fails: false, no throw");
        Assert.AreEqual(0, Directory.GetFiles(Path.GetDirectoryName(ok)!).Length, "the temp file is removed");
        Assert.IsTrue(s.get(MediaT.T, "PeerB", MediaT.Id1, v) == null, "a directory under the name: a miss, no throw");
    }

    [TestMethod]
    public void concurrentPutsAndGets_ofOneKey_onlyEverGiveAWholePayload()
    {
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s1 = sb.store(), s2 = sb.store();   // two pages / a reload: two callers, one key
        string v = MediaT.ver(MediaT.rooted("a.jpg"));
        byte[] a = MediaT.jpeg(30000, 1), b = MediaT.jpeg(30000, 2);
        int bad = 0, served = 0;
        Task[] tasks = new Task[8];
        for (int t = 0; t < tasks.Length; t++)
        {
            int n = t;
            tasks[t] = Task.Run(() =>
            {
                for (int i = 0; i < 60; i++)
                {
                    ChatMediaStoreRules s = (n & 1) == 0 ? s1 : s2;
                    if (n < 4)
                    {
                        s.put(MediaT.T, "PeerA", MediaT.Id1, v, (n & 1) == 0 ? a : b);
                    }
                    else
                    {
                        byte[]? got = s.get(MediaT.T, "PeerA", MediaT.Id1, v);
                        if (got != null)
                        {
                            Interlocked.Increment(ref served);
                            if (!MediaT.same(got, a) && !MediaT.same(got, b)) Interlocked.Increment(ref bad);
                        }
                    }
                }
            });
        }
        Task.WaitAll(tasks);
        Assert.AreEqual(0, bad, "a read is a miss or exactly one writer's payload — never a mix");
        byte[]? last = s1.get(MediaT.T, "PeerA", MediaT.Id1, v);
        Assert.IsTrue(MediaT.same(last, a) || MediaT.same(last, b), "after the race one whole payload is kept");
        Assert.AreEqual(1, sb.files().Length, "one file, no temp left");
    }

    [TestMethod]
    public void neverThrows_onNullsAndNonsense()
    {
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        byte[] j = MediaT.jpeg(100, 1);
        Assert.IsTrue(s.get(MediaT.T, null, null, null) == null && s.get('x', "PeerA", MediaT.Id1, "v") == null && s.get(MediaT.T, "PeerA", "zz", "v") == null, "bad reads: null");
        Assert.IsFalse(s.put(MediaT.T, null, MediaT.Id1, "v", j) || s.put(MediaT.T, "PeerA", null, "v", j) || s.put(MediaT.T, "PeerA", MediaT.Id1, null, j) || s.put('x', "PeerA", MediaT.Id1, "v", j), "bad puts: false");
        Assert.IsFalse(s.put(MediaT.T, "../../etc", MediaT.Id1, "v", j) || s.put(MediaT.T, "PeerA", "../x", "v", j), "a path-shaped chat or id is refused");
        s.deleteMessage(null, null); s.deleteMessage("PeerA", "zz"); s.deleteMessage("../x", MediaT.Id1);
        s.deleteChat(null); s.deleteChat(""); s.deleteChat("../..");
        Assert.AreEqual(0, s.deleteSource(null) + s.deleteSource("") + s.deleteSource("relative.jpg"), "bad sources: nothing");
        ChatMediaStoreRules.wipe(null); ChatMediaStoreRules.wipe(""); ChatMediaStoreRules.wipe("relative");
        Assert.IsTrue(s.memoryKey(MediaT.T, null, null, null) == null, "no key for nothing");
        Assert.AreEqual(0, sb.files().Length, "nothing was written");
        Assert.IsTrue(Directory.Exists(sb.parent), "nothing outside the root was touched");
    }
}

[TestClass]
public class ChatMediaStoreDeleteTests
{
    private static void fill(ChatMediaStoreRules s, string chat, string id, int seed)
    {
        Assert.IsTrue(s.put(MediaT.T, chat, id, MediaT.ver(MediaT.rooted("f" + seed + ".jpg")), MediaT.jpeg(500 + seed, seed)), "fill thumb " + chat + " " + seed);
        Assert.IsTrue(s.put(MediaT.V, chat, id, "t|9|" + seed, MediaT.ascii(MediaT.info(1000 + seed, seed))), "fill peaks " + chat + " " + seed);
    }

    private static bool has(ChatMediaStoreRules s, char kind, string chat, string id) => File.Exists(MediaT.pathOf(s, kind, chat, id));

    [TestMethod]
    public void deleteMessage_removesExactlyThatMessagesTwoFiles()
    {
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        fill(s, "PeerA", MediaT.Id1, 1); fill(s, "PeerA", MediaT.Id2, 2); fill(s, "PeerB", MediaT.Id1, 3);
        Assert.AreEqual(6, sb.files().Length, "six files");
        s.deleteMessage("PeerA", MediaT.Id1.ToUpperInvariant());   // the id's hex case does not matter
        Assert.IsFalse(has(s, MediaT.T, "PeerA", MediaT.Id1) || has(s, MediaT.V, "PeerA", MediaT.Id1), "the thumbnail and the peaks of that message are gone");
        Assert.IsTrue(has(s, MediaT.T, "PeerA", MediaT.Id2) && has(s, MediaT.V, "PeerA", MediaT.Id2), "another message of the chat stays");
        Assert.IsTrue(has(s, MediaT.T, "PeerB", MediaT.Id1) && has(s, MediaT.V, "PeerB", MediaT.Id1), "the same id in another chat stays");
        Assert.AreEqual(4, sb.files().Length, "exactly two files went");
        s.deleteMessage("PeerA", MediaT.Id1);   // again: nothing to do, no throw
        Assert.AreEqual(4, sb.files().Length, "a second delete changes nothing");
    }

    [TestMethod]
    public void deleteMessage_aLatePutIsNotPutBack()
    {
        // the drainer was decoding the photo when the delete came: its put must not bring the file back
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        string v = MediaT.ver(MediaT.rooted("a.jpg"));
        s.deleteMessage("PeerA", MediaT.Id1);
        Assert.IsFalse(s.put(MediaT.T, "PeerA", MediaT.Id1, v, MediaT.jpeg(500, 1)), "a put for a deleted message is refused");
        Assert.IsFalse(sb.store().put(MediaT.V, "PeerA", MediaT.Id1, "t|1|a", MediaT.ascii(MediaT.info(1, 1))), "…also through another instance of the account, also its peaks");
        Assert.AreEqual(0, sb.files().Length, "nothing at rest");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id2, v, MediaT.jpeg(500, 1)), "another message of the chat is kept as usual");
        Assert.IsTrue(s.put(MediaT.T, "PeerB", MediaT.Id1, v, MediaT.jpeg(500, 1)), "the same id in another chat is kept as usual");
    }

    [TestMethod]
    public void deleteChat_removesExactlyThatChat_andALatePutIsRefused()
    {
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store(), other = sb.store("AcctTwo");
        fill(s, "PeerA", MediaT.Id1, 1); fill(s, "PeerA", MediaT.Id2, 2); fill(s, "PeerB", MediaT.Id1, 3); fill(other, "PeerA", MediaT.Id1, 4);
        long genA = s.generation("PeerA"), genB = s.generation("PeerB");   // two decodes start: each reads its chat's generation first
        s.deleteChat("PeerA");
        Assert.IsFalse(Directory.Exists(Path.GetDirectoryName(MediaT.pathOf(s, MediaT.T, "PeerA", MediaT.Id1))), "the chat's folder is gone");
        Assert.IsTrue(has(s, MediaT.T, "PeerB", MediaT.Id1) && has(s, MediaT.V, "PeerB", MediaT.Id1), "another chat stays");
        Assert.IsTrue(has(other, MediaT.T, "PeerA", MediaT.Id1) && has(other, MediaT.V, "PeerA", MediaT.Id1), "the same chat address of ANOTHER account stays");
        Assert.AreEqual(4, sb.files().Length, "exactly the chat's four files went (no trash is left)");
        string v = MediaT.ver(MediaT.rooted("late.jpg"));
        Assert.IsFalse(s.put(MediaT.T, "PeerA", "ab", v, MediaT.jpeg(500, 1), genA), "a late put into the deleted chat is refused");
        Assert.IsTrue(s.put(MediaT.T, "PeerB", "ab", v, MediaT.jpeg(500, 1), genB), "a put for another chat that started before the delete is kept: the generation is per chat");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", "cd", v, MediaT.jpeg(500, 1), s.generation("PeerA")), "a decode that STARTS after the delete is kept at once (a history delete keeps the contact) — no waiting time");
        Assert.IsFalse(s.put(MediaT.T, "PeerA", "ab", v, MediaT.jpeg(500, 1), genA), "…and the decode from before the delete is still refused, whenever it ends");
        s.deleteChat("PeerA"); s.deleteChat("NeverSeen");   // again / unknown: no throw
    }

    [TestMethod]
    public void deleteSource_removesWhatWasMadeFromThatPath_whateverTheMessage()
    {
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store(), other = sb.store("AcctTwo");
        string gone = MediaT.rooted("gone.jpg"), kept = MediaT.rooted("kept.jpg"), ogg = MediaT.rooted("voice-20261117-101500.ogg");
        byte[] j = MediaT.jpeg(700, 1);
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, MediaT.ver(gone), j), "A/1 from gone.jpg");
        Assert.IsTrue(s.put(MediaT.T, "PeerB", MediaT.Id2, MediaT.ver(gone, 5), j), "B/2 from gone.jpg (another message, another version)");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id2, MediaT.ver(kept), j), "A/2 from kept.jpg");
        Assert.IsTrue(s.put(MediaT.V, "PeerA", "ab", MediaT.ver(ogg), MediaT.ascii(MediaT.info(900, 1))), "peaks from a voice file");
        Assert.IsTrue(s.put(MediaT.V, "PeerA", "cd", "t|4|ff", MediaT.ascii(MediaT.info(900, 2))), "peaks of an inline row (no file)");
        Assert.IsTrue(other.put(MediaT.T, "PeerA", MediaT.Id1, MediaT.ver(gone), j), "another account, the same path");
        long genA = s.generation("PeerA"), genOther = other.generation("PeerA");   // a decode of gone.jpg is running
        Assert.AreEqual(2, s.deleteSource(gone), "the two entries made from gone.jpg");
        Assert.IsFalse(has(s, MediaT.T, "PeerA", MediaT.Id1) || has(s, MediaT.T, "PeerB", MediaT.Id2), "…are gone");
        Assert.IsTrue(has(s, MediaT.T, "PeerA", MediaT.Id2) && has(s, MediaT.V, "PeerA", "ab") && has(s, MediaT.V, "PeerA", "cd"), "the others stay");
        Assert.IsTrue(has(other, MediaT.T, "PeerA", MediaT.Id1), "another account's entry stays (its own delete removes it)");
        Assert.IsFalse(s.put(MediaT.T, "PeerA", MediaT.Id1, MediaT.ver(gone), j, genA), "a late put from the deleted file is refused");
        Assert.IsTrue(other.put(MediaT.T, "PeerA", "0b", MediaT.ver(gone), j, genOther), "another account's running decode is not touched");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", "ef", MediaT.ver(kept), j), "a put from another file that starts now is kept");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", "0a", MediaT.ver(gone, 9, 9), j), "a NEW file at that path (a re-download) is kept again — at once");
        Assert.AreEqual(1, s.deleteSource(ogg), "a voice file's peaks go with the file");
        Assert.IsTrue(has(s, MediaT.V, "PeerA", "cd"), "an inline row has no source file: untouched");
        Assert.AreEqual(0, s.deleteSource(MediaT.rooted("never.jpg")), "an unknown path: nothing");
    }

    [TestMethod]
    public void wipe_removesTheWholeRoot_everyAccount_andNothingElse()
    {
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules a = sb.store("AcctOne"), b = sb.store("AcctTwo");
        fill(a, "PeerA", MediaT.Id1, 1); fill(b, "PeerB", MediaT.Id2, 2);
        string beside = Path.Combine(sb.parent, "not-ours.txt");
        File.WriteAllText(beside, "x");
        ChatMediaStoreRules.wipe(sb.parent);   // NOT a store root (its name is not spixi-media1): refused
        Assert.AreEqual(5, sb.files().Length, "a folder that is not the store root is never wiped");
        long genA = a.generation("PeerA"), genB = b.generation("PeerA");   // decodes are running in both accounts
        ChatMediaStoreRules.wipe(sb.root);
        Assert.IsFalse(Directory.Exists(sb.root), "the root is gone with both accounts");
        Assert.IsTrue(File.Exists(beside), "a file beside the root stays");
        string v = MediaT.ver(MediaT.rooted("a.jpg"));
        Assert.IsFalse(a.put(MediaT.T, "PeerA", MediaT.Id1, v, MediaT.jpeg(500, 1), genA) || b.put(MediaT.T, "PeerA", MediaT.Id1, v, MediaT.jpeg(500, 1), genB), "a late put after the wipe is refused (any account)");
        Assert.IsFalse(Directory.Exists(sb.root), "nothing at rest after the wipe");
        Assert.IsTrue(a.put(MediaT.T, "PeerA", MediaT.Id1, v, MediaT.jpeg(500, 1)), "a decode that starts after the wipe is kept (a restored account)");
        Assert.IsFalse(a.put(MediaT.T, "PeerA", MediaT.Id2, v, MediaT.jpeg(500, 1), genA), "…the one from before the wipe never is");
        ChatMediaStoreRules.wipe(sb.root); ChatMediaStoreRules.wipe(sb.root);   // twice / an absent root: no throw
        Assert.IsFalse(Directory.Exists(sb.root), "gone again");
    }
}

/** ★ review round 1 (F1): the late-put guard is a GENERATION the caller reads before the decode — no timer. */
[TestClass]
public class ChatMediaStoreGenerationTests
{
    private static readonly string V = MediaT.ver(MediaT.rooted("gen.jpg"));
    private static byte[] J(int seed) => MediaT.jpeg(400 + seed, seed);

    [TestMethod]
    public void generation_isReadBeforeTheDecode_andAPutCarriesIt()
    {
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        long g = s.generation("PeerA");
        Assert.IsTrue(g > 0, "a chat the store can name has a generation");
        Assert.AreEqual(g, s.generation("PeerA"), "no delete: the same number");
        Assert.AreEqual(g, sb.store().generation("PeerA"), "…also through another instance of the account");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, V, J(1), g), "no delete since the read: kept");
        Assert.AreEqual(ChatMediaStoreRules.NoGeneration, s.generation(null), "no chat: no generation");
        Assert.AreEqual(ChatMediaStoreRules.NoGeneration, s.generation("../x"), "a chat the store refuses: no generation");
        Assert.IsFalse(s.put(MediaT.T, "PeerA", MediaT.Id2, V, J(2), ChatMediaStoreRules.NoGeneration), "a put that carries no generation is refused");
        Assert.IsFalse(s.put(MediaT.T, "PeerA", MediaT.Id2, V, J(2), g + 1000), "…and so is a number the store never gave");
        Assert.AreEqual(1, sb.files().Length, "only the one kept file");
    }

    [TestMethod]
    public void generation_aDecodeQueuedBeforeADelete_isRefusedHoweverLateItEnds()
    {
        // The finding (both security readers): the guard was a 60 s timer, so a decode that ended later wrote a deleted
        // chat's preview back. There is no clock in the engine now: the put below is refused whether it comes after a
        // millisecond or after an hour — and many unrelated store calls in between do not make it valid again.
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, V, J(1)), "the chat has a preview");
        long queued = s.generation("PeerA");
        s.deleteChat("PeerA");
        for (int i = 0; i < 200; i++) s.put(MediaT.T, "PeerB", "b" + i.ToString("x2"), V, J(i));   // other work goes on, for as long as it likes
        Assert.IsFalse(s.put(MediaT.T, "PeerA", MediaT.Id1, V, J(1), queued), "the queued decode ends: its put is refused");
        Assert.IsFalse(File.Exists(MediaT.pathOf(s, MediaT.T, "PeerA", MediaT.Id1)), "nothing of the deleted chat is at rest");
        Assert.IsFalse(typeof(ChatMediaStoreRules).GetFields(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.Instance)
            .Any(f => f.Name.Contains("uarantine") || f.Name == "clock"), "the engine has no quarantine time and no clock any more");
    }

    [TestMethod]
    public void generation_twoDeletesInARow_bothRefuseTheirLatePuts()
    {
        // reader m1: chat A then chat B; two sources — the second delete must not make the first one's late put valid
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        long gA = s.generation("PeerA"), gB = s.generation("PeerB"), gC = s.generation("PeerC");
        s.deleteChat("PeerA");
        s.deleteChat("PeerB");
        Assert.IsFalse(s.put(MediaT.T, "PeerA", MediaT.Id1, V, J(1), gA), "chat A's late put is refused after B's delete too");
        Assert.IsFalse(s.put(MediaT.T, "PeerB", MediaT.Id1, V, J(2), gB), "chat B's late put is refused");
        Assert.IsTrue(s.put(MediaT.T, "PeerC", MediaT.Id1, V, J(3), gC), "chat C was not deleted: its running decode is kept");
        s.deleteChat("PeerA");   // A again, after B
        Assert.IsFalse(s.put(MediaT.T, "PeerB", MediaT.Id2, V, J(2), gB), "…B's stays refused");
        // two sources
        string p1 = MediaT.rooted("one.jpg"), p2 = MediaT.rooted("two.jpg");
        long g1 = s.generation("PeerC");
        s.deleteSource(p1);
        long g2 = s.generation("PeerD");   // a second decode starts between the two deletes
        s.deleteSource(p2);
        Assert.IsFalse(s.put(MediaT.T, "PeerC", "a1", MediaT.ver(p1), J(4), g1), "the first source's late put is refused");
        Assert.IsFalse(s.put(MediaT.T, "PeerD", "a2", MediaT.ver(p2), J(5), g2), "the second source's late put is refused");
        Assert.IsFalse(s.put(MediaT.T, "PeerD", "a3", MediaT.ver(p1), J(6), g2), "…whatever chat or message the file belongs to");
        Assert.IsTrue(s.put(MediaT.T, "PeerD", "a4", MediaT.ver(p1, 7, 7), J(7)), "a decode that starts after both is kept");
        Assert.AreEqual(2, sb.storeFiles().Length, "C's and the last one");
    }

    [TestMethod]
    public void generation_deleteMessage_movesItsChat_andOnlyThat()
    {
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        long gA = s.generation("PeerA"), gB = s.generation("PeerB");
        s.deleteMessage("PeerA", MediaT.Id1);
        Assert.IsFalse(s.put(MediaT.T, "PeerA", MediaT.Id1, V, J(1), gA), "the deleted message's late put is refused");
        Assert.IsFalse(s.put(MediaT.T, "PeerA", MediaT.Id1, V, J(1)), "…and a job that only STARTS after the delete is refused too (remembered by name)");
        Assert.IsTrue(s.put(MediaT.T, "PeerB", MediaT.Id1, V, J(2), gB), "another chat's running decode is kept");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id2, V, J(3)), "another message of the chat, started after, is kept");
        Assert.AreEqual(2, sb.files().Length, "two files");
    }

    [TestMethod]
    public void generation_moreDeletedChatsThanTheTableHolds_stillRefuses()
    {
        // the per-chat table is bounded; when it is full the ACCOUNT's generation moves instead — wider, never weaker
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        long first = s.generation("Chat0"), bystander = s.generation("PeerZ");
        for (int i = 0; i < 1500; i++) s.deleteChat("Chat" + i);
        Assert.IsFalse(s.put(MediaT.T, "Chat0", MediaT.Id1, V, J(1), first), "the first deleted chat's late put is refused after 1500 more deletes");
        Assert.IsFalse(s.put(MediaT.T, "Chat1499", MediaT.Id1, V, J(1), first), "…the last one's too");
        Assert.IsFalse(s.put(MediaT.T, "PeerZ", MediaT.Id1, V, J(1), bystander), "a chat that was never deleted is refused ONCE (the table was full: the account moved)");
        Assert.IsTrue(s.put(MediaT.T, "PeerZ", MediaT.Id1, V, J(1)), "…and kept when its decode starts now");
        Assert.AreEqual(1, sb.files().Length, "one file");
    }

    [TestMethod]
    public void generation_aStateTheProcessDropped_refusesWhatWasReadBefore()
    {
        // the process keeps the state of at most 64 account folders (the app has one; the harness many): a dropped
        // state comes back with a generation above every number given before
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        long before = s.generation("PeerA");
        using (MediaSandbox many = new MediaSandbox())
        {
            for (int i = 0; i < 70; i++) Assert.IsTrue(many.store("Acct" + i) != null, "open " + i);
        }
        Assert.IsFalse(s.put(MediaT.T, "PeerA", MediaT.Id1, V, J(1), before), "a number from the dropped state is refused");
        long now = s.generation("PeerA");
        Assert.IsTrue(now > before && s.put(MediaT.T, "PeerA", MediaT.Id1, V, J(1), now), "the store works on with the new state");
        ChatMediaStoreRules twin = sb.store();
        long g = twin.generation("PeerA");
        s.deleteChat("PeerA");
        Assert.IsFalse(twin.put(MediaT.T, "PeerA", MediaT.Id1, V, J(1), g), "the two instances share the NEW state: a delete through one refuses the other's late put");
    }

    [TestMethod]
    public void ifCurrent_theMemoryEntry_isRefusedAfterADelete()
    {
        // reader n1: the page's memory LRU must not get a deleted message's bytes back from a decode that ends late
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        ChatMediaLru<string, byte[]> lru = new ChatMediaLru<string, byte[]>(4, StringComparer.Ordinal);
        long g = s.generation("PeerA");
        Assert.IsTrue(s.ifCurrent("PeerA", g, () => lru.put("k", J(1))) && lru.count == 1, "no delete since the read: the entry is put");
        lru.clear();
        foreach (Action del in new Action[] {
            () => s.deleteMessage("PeerA", MediaT.Id1), () => s.deleteChat("PeerA"), () => s.deleteSource(MediaT.rooted("x.jpg")),
            () => ChatMediaStoreRules.wipe(sb.root), () => ChatMediaStoreRules.wipeKind(sb.root, MediaT.T), () => s.sweepOrphans(true, new List<string> { "PeerB" }) })
        {
            Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id2, V, J(2)), "the chat has a folder");
            g = s.generation("PeerA");
            del();
            int ran = 0;
            Assert.IsFalse(s.ifCurrent("PeerA", g, () => { ran++; lru.put("k", J(1)); }), "after a delete the memory entry is refused");
            Assert.IsTrue(ran == 0 && lru.count == 0, "…the callback did not run");
            Assert.IsTrue(s.ifCurrent("PeerA", s.generation("PeerA"), () => ran++) && ran == 1, "a read after the delete is current again");
        }
        Assert.IsFalse(s.ifCurrent("PeerA", ChatMediaStoreRules.NoGeneration, () => lru.put("k", J(1))), "no generation: refused");
        Assert.IsFalse(s.ifCurrent(null, g, () => lru.put("k", J(1))) || s.ifCurrent("PeerA", g, null), "no chat / no callback: false, no throw");
        Assert.IsFalse(s.ifCurrent("PeerA", s.generation("PeerA"), () => throw new InvalidOperationException("x")), "a callback that throws: false, no throw");
        Assert.AreEqual(0, lru.count, "nothing was put");
    }
}

/** ★ review round 1 (F2 / F3 / F7 / F8): the orphan sweep, the thumbnail wipe, links, the tree delete off the caller's thread. */
[TestClass]
public class ChatMediaStoreSweepTests
{
    private static readonly string V = MediaT.ver(MediaT.rooted("sweep.jpg"));
    private static byte[] J(int seed) => MediaT.jpeg(400 + seed, seed);
    private static bool has(ChatMediaStoreRules s, char kind, string chat, string id) => File.Exists(MediaT.pathOf(s, kind, chat, id));

    [TestMethod]
    public void sweep_removesOtherAccountsAndOrphanChats_andNothingElse()
    {
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store("AcctOne"), stale = sb.store("AcctOld");
        foreach (string chat in new[] { "PeerA", "PeerB", "Declined", "Dissolved" })
        {
            Assert.IsTrue(s.put(MediaT.T, chat, MediaT.Id1, V, J(1)) && s.put(MediaT.V, chat, MediaT.Id1, "t|1|a", MediaT.ascii(MediaT.info(10, 1))), "fill " + chat);
        }
        Assert.IsTrue(stale.put(MediaT.T, "PeerA", MediaT.Id1, V, J(2)), "an older account's folder (a new account made over a stale wallet)");
        string left = Path.Combine(sb.root, ChatMediaStoreRules.TrashPrefix + Guid.NewGuid().ToString("N"));   // a folder a kill left on its way out
        Directory.CreateDirectory(Path.Combine(left, "x"));
        File.WriteAllBytes(Path.Combine(left, "x", "y.t1"), J(3));
        string beside = Path.Combine(sb.parent, "other-cache");   // the rest of the cache area: never touched
        Directory.CreateDirectory(Path.Combine(beside, s.accountFolder, "deadbeefdeadbeef"));
        File.WriteAllText(Path.Combine(beside, s.accountFolder, "deadbeefdeadbeef", "keep.t1"), "x");
        long gDeclined = s.generation("Declined"), gA = s.generation("PeerA"), gStale = stale.generation("PeerA");
        Assert.AreEqual(4, s.sweepOrphans(true, new List<string> { "PeerA", "PeerB", "NoFolderYet" }), "two chat folders, the old account's folder, the trash folder");
        Assert.IsTrue(has(s, MediaT.T, "PeerA", MediaT.Id1) && has(s, MediaT.V, "PeerA", MediaT.Id1) && has(s, MediaT.T, "PeerB", MediaT.Id1) && has(s, MediaT.V, "PeerB", MediaT.Id1), "the chats the app has keep their files");
        Assert.IsTrue(sb.storeFiles().Length == 4 && sb.files().Length == 5, "nothing else is left in the root (the fifth file is the one beside it)");
        Assert.IsFalse(Directory.Exists(Path.Combine(sb.root, stale.accountFolder)) || Directory.Exists(left), "the old account's folder and the trash folder are gone");
        Assert.AreEqual(1, Directory.GetDirectories(sb.root).Length, "the root holds this account's folder only");
        Assert.IsTrue(File.Exists(Path.Combine(beside, s.accountFolder, "deadbeefdeadbeef", "keep.t1")), "a folder OUTSIDE the root is never touched — even one that looks like ours");
        Assert.IsFalse(s.put(MediaT.T, "Declined", MediaT.Id2, V, J(4), gDeclined), "a decode of a swept chat that was running is refused");
        Assert.IsFalse(stale.put(MediaT.T, "PeerA", MediaT.Id2, V, J(4), gStale), "…and one of the swept account");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id2, V, J(4), gA), "a kept chat's running decode is not disturbed");
        Assert.AreEqual(0, s.sweepOrphans(true, new List<string> { "PeerA", "PeerB" }), "a second sweep finds nothing");
    }

    [TestMethod]
    public void sweep_anEmptyOrUnknownList_neverSweepsAChat()
    {
        // an empty contact list can be a load that failed (#565 / #584): it must never empty the store
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store("AcctOne"), stale = sb.store("AcctOld");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, V, J(1)) && s.put(MediaT.T, "PeerB", MediaT.Id1, V, J(2)) && stale.put(MediaT.T, "PeerA", MediaT.Id1, V, J(3)), "fill");
        Assert.AreEqual(0, s.sweepOrphans(false, new List<string>()), "an EMPTY list: nothing");
        Assert.AreEqual(0, s.sweepOrphans(false, null), "no list: nothing");
        Assert.AreEqual(0, s.sweepOrphans(false, new List<string> { "PeerA", "bad|address" }), "a chat the store cannot name: no chat folder is swept (its folder could not be told from an orphan)");
        Assert.AreEqual(3, sb.files().Length, "all three files are there");
        Assert.AreEqual(1, s.sweepOrphans(true, new List<string>()), "the other accounts' part needs no list");
        Assert.IsTrue(has(s, MediaT.T, "PeerA", MediaT.Id1) && has(s, MediaT.T, "PeerB", MediaT.Id1) && sb.files().Length == 2, "…and takes no chat of this account");
        Directory.Delete(sb.root, true);
        Assert.AreEqual(0, s.sweepOrphans(true, new List<string> { "PeerA" }), "no root: nothing, no throw");
    }

    [TestMethod]
    public void wipeKind_removesEveryThumbnail_keepsThePeaks()
    {
        // F3: the Privacy switch "photo previews" goes OFF
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules a = sb.store("AcctOne"), b = sb.store("AcctTwo");
        foreach (ChatMediaStoreRules s in new[] { a, b })
        {
            Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, V, J(1)) && s.put(MediaT.T, "PeerB", MediaT.Id2, V, J(2)) && s.put(MediaT.V, "PeerA", MediaT.Id1, "t|1|a", MediaT.ascii(MediaT.info(10, 1))), "fill");
        }
        string beside = Path.Combine(sb.parent, "x.t1");
        File.WriteAllText(beside, "x");
        long g = a.generation("PeerA");
        ChatMediaStoreRules.wipeKind(sb.root, MediaT.T);
        Assert.AreEqual(0, sb.files().Count(f => f.StartsWith(sb.root + Path.DirectorySeparatorChar, StringComparison.Ordinal) && f.EndsWith(".t1", StringComparison.Ordinal)), "no thumbnail is left, of any account");
        Assert.IsTrue(has(a, MediaT.V, "PeerA", MediaT.Id1) && has(b, MediaT.V, "PeerA", MediaT.Id1), "the peaks stay");
        Assert.IsTrue(File.Exists(beside), "a .t1 outside the root is not ours");
        Assert.IsFalse(a.put(MediaT.T, "PeerA", MediaT.Id2, V, J(3), g), "a thumbnail that was being made is not kept");
        Assert.IsTrue(a.put(MediaT.T, "PeerA", MediaT.Id2, V, J(3)), "the switch is ON again: a new decode is kept");
        ChatMediaStoreRules.wipeKind(sb.parent, MediaT.T); ChatMediaStoreRules.wipeKind(null, MediaT.T); ChatMediaStoreRules.wipeKind(sb.root, 'x');
        Assert.IsTrue(has(a, MediaT.T, "PeerA", MediaT.Id2), "not a store root / an unknown kind: nothing happens");
    }

    [TestMethod]
    public void links_areNeverFollowed_byADeleteOrACount()
    {
        // F7 (S-delete n-5): a directory link inside the store must not lead a delete, a prune or a scan outside it
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.small(4, 2);
        string outside = Path.Combine(sb.parent, "outside");
        Directory.CreateDirectory(Path.Combine(outside, "deep"));
        string src = MediaT.rooted("linked.jpg");
        // a real store file (so a header scan would match it) and an old stray, both OUTSIDE the root
        Assert.IsTrue(s.put(MediaT.T, "PeerX", MediaT.Id1, MediaT.ver(src), J(1)), "make one entry");
        string victim = Path.Combine(outside, Path.GetFileName(MediaT.pathOf(s, MediaT.T, "PeerX", MediaT.Id1)));
        File.Copy(MediaT.pathOf(s, MediaT.T, "PeerX", MediaT.Id1), victim);
        string stray = Path.Combine(outside, "deep", "old.tmp");
        File.WriteAllBytes(stray, new byte[5]);
        File.SetLastWriteTimeUtc(stray, DateTime.UtcNow.AddHours(-3));
        File.SetLastWriteTimeUtc(victim, DateTime.UtcNow.AddHours(-3));
        bool intact() => File.Exists(victim) && File.Exists(stray);
        string acctDir = Path.Combine(sb.root, s.accountFolder);
        string chatDir = Path.GetDirectoryName(MediaT.pathOf(s, MediaT.T, "PeerA", MediaT.Id1))!;
        // 1. a link in place of a chat folder + a link inside a chat folder: count, prune, scan, deleteChat
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, V, J(2)), "chat A");
        Directory.CreateSymbolicLink(Path.Combine(acctDir, "0000000000000000"), outside);
        Directory.CreateSymbolicLink(Path.Combine(chatDir, "inner"), outside);
        s.deleteChat("Unused");   // "not counted yet": the next put counts (and sweeps strays)
        Assert.IsTrue(s.put(MediaT.T, "PeerB", "b9", V, J(9)), "a put counts the folder first");
        Assert.IsTrue(intact(), "a count (with its stray sweep) does not walk through a link");
        Assert.IsTrue(File.Exists(MediaT.pathOf(s, MediaT.T, "PeerX", MediaT.Id1)) && File.Exists(MediaT.pathOf(s, MediaT.T, "PeerA", MediaT.Id1)) && File.Exists(MediaT.pathOf(s, MediaT.T, "PeerB", "b9")), "three entries inside the store");
        Assert.AreEqual(1, s.deleteSource(src), "the scan finds the ONE entry inside the store");
        Assert.IsTrue(intact(), "…and does not read or delete through a link");
        for (int i = 0; i < 6; i++) s.put(MediaT.T, "PeerB", "b" + i, V, J(i));   // reaches the bound: the prune runs
        Assert.IsTrue(intact(), "a prune does not walk through a link");
        s.deleteChat("PeerA");
        Assert.IsTrue(intact() && !Directory.Exists(chatDir), "deleteChat removes the folder and the link in it — not the link's target");
        // 2. the sweep and the wipe
        Assert.IsTrue(s.sweepOrphans(true, new List<string> { "PeerB" }) >= 1, "the sweep removes the link that sits where a chat folder would");
        Assert.IsTrue(intact() && !Directory.Exists(Path.Combine(acctDir, "0000000000000000")), "…as a link");
        Directory.CreateSymbolicLink(Path.Combine(sb.root, "ffffffffffffffff"), outside);
        Directory.CreateSymbolicLink(Path.Combine(acctDir, "1111111111111111"), outside);
        ChatMediaStoreRules.wipeKind(sb.root, MediaT.T);
        Assert.IsTrue(intact(), "the thumbnail wipe does not walk through a link");
        ChatMediaStoreRules.wipe(sb.root);
        Assert.IsTrue(intact(), "the wipe removes the links, never what they point at");
        Assert.IsFalse(Directory.Exists(sb.root), "the root is gone");
        // 3. the root's own place holds a link
        Directory.CreateSymbolicLink(sb.root, outside);
        ChatMediaStoreRules.wipe(sb.root);
        Assert.IsTrue(intact(), "a link in the root's place: the link goes, nothing behind it");
        Assert.IsFalse(Directory.Exists(sb.root) || File.Exists(sb.root), "…the link is gone");
    }

    [TestMethod]
    public void links_atTheAccountOrChatFolder_areNeverActedThrough()
    {
        // review round 2 (G1): the PER-KEY paths. A link planted at <root>/<acct16> or <root>/<acct16>/<chat16> must not
        // lead a get's discard, a put, a message delete or a chat delete outside the root.
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        string acctDir = Path.Combine(sb.root, s.accountFolder);
        string chatDir = Path.GetDirectoryName(MediaT.pathOf(s, MediaT.T, "PeerA", MediaT.Id1))!;
        string chatName = Path.GetFileName(chatDir), thumbName = Path.GetFileName(MediaT.pathOf(s, MediaT.T, "PeerA", MediaT.Id1)), peaksName = Path.GetFileName(MediaT.pathOf(s, MediaT.V, "PeerA", MediaT.Id1));
        // OUTSIDE the root: a folder shaped like an account folder, holding files under exactly the names the store would use
        string outside = Path.Combine(sb.parent, "outside-acct");
        string outChat = Path.Combine(outside, chatName);
        Directory.CreateDirectory(outChat);
        string v1 = Path.Combine(outChat, thumbName), v2 = Path.Combine(outChat, peaksName), v3 = Path.Combine(outChat, "other.bin");
        void plant() { Directory.CreateDirectory(outChat); File.WriteAllBytes(v1, new byte[300]); File.WriteAllBytes(v2, new byte[300]); File.WriteAllBytes(v3, new byte[7]); }
        bool intact() => File.Exists(v1) && File.Exists(v2) && File.Exists(v3) && new FileInfo(v1).Length == 300 && Directory.GetFileSystemEntries(outChat).Length == 3 && Directory.GetFileSystemEntries(outside).Length == 1;
        plant();
        foreach (bool atAccount in new[] { true, false })
        {
            string what = atAccount ? "a link at the ACCOUNT folder" : "a link at the CHAT folder";
            Directory.CreateDirectory(sb.root);
            if (atAccount) Directory.CreateSymbolicLink(acctDir, outside);
            else { Directory.CreateDirectory(acctDir); Directory.CreateSymbolicLink(chatDir, outChat); }
            string link = atAccount ? acctDir : chatDir;
            Assert.IsTrue(File.Exists(MediaT.pathOf(s, MediaT.T, "PeerA", MediaT.Id1)), what + ": the premise — the entry's path resolves THROUGH the link");
            Assert.IsTrue(s.get(MediaT.T, "PeerA", MediaT.Id1, V) == null && intact(), what + ": get is a plain miss — the file behind the link is not discarded");
            Assert.IsFalse(s.put(MediaT.T, "PeerA", MediaT.Id1, V, J(1)), what + ": put is refused");
            Assert.IsFalse(s.put(MediaT.T, "PeerA", MediaT.Id2, V, J(2)), what + ": …a new name too");
            Assert.IsTrue(intact(), what + ": nothing was written, counted away or pruned through the link");
            s.deleteMessage("PeerA", MediaT.Id1);
            Assert.IsTrue(intact(), what + ": deleteMessage deletes nothing through the link");
            Assert.AreEqual(0, s.deleteSource(MediaT.rooted("sweep.jpg")), what + ": a source scan reads nothing through it");
            s.deleteChat("PeerA");
            Assert.IsTrue(intact(), what + ": deleteChat moves or deletes nothing behind the link");
            Assert.IsFalse(Directory.Exists(link) || File.Exists(link) || new DirectoryInfo(link).Attributes != (FileAttributes)(-1), what + ": …and the link itself is gone (removed AS a link)");
            Assert.AreEqual(0, sb.trash().Length, what + ": no trash folder was made of it");
            Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id2, V, J(3)) && MediaT.same(J(3), s.get(MediaT.T, "PeerA", MediaT.Id2, V)), what + ": with the link gone the store works in its own folder");
            // the sweep removes such a link as a link too
            ChatMediaStoreRules.wipe(sb.root);
            Directory.CreateDirectory(sb.root);
            if (atAccount) Directory.CreateSymbolicLink(acctDir, outside);
            else { Directory.CreateDirectory(acctDir); Directory.CreateSymbolicLink(chatDir, outChat); }
            Assert.IsTrue(s.sweepOrphans(true, new List<string> { "PeerA" }) == 1 && intact(), what + ": the sweep removes the link (even one named like a chat the app has), not its target");
            Assert.IsTrue(new DirectoryInfo(link).Attributes == (FileAttributes)(-1), what + ": …the link is gone");
            ChatMediaStoreRules.wipe(sb.root);
            Assert.IsTrue(intact(), what + ": the wipe touched nothing outside");
        }
        // a link in the ROOT's own place
        Directory.CreateDirectory(Path.Combine(sb.parent, "outside-root", s.accountFolder));
        Directory.Move(outside, Path.Combine(sb.parent, "outside-root", s.accountFolder, "x"));
        string rootChat = Path.Combine(sb.parent, "outside-root", s.accountFolder, chatName);
        Directory.CreateDirectory(rootChat);
        File.WriteAllBytes(Path.Combine(rootChat, thumbName), new byte[300]);
        Directory.CreateSymbolicLink(sb.root, Path.Combine(sb.parent, "outside-root"));
        Assert.IsTrue(s.get(MediaT.T, "PeerA", MediaT.Id1, V) == null && !s.put(MediaT.T, "PeerA", MediaT.Id1, V, J(1)), "a link at the ROOT: a miss, a refused put");
        s.deleteMessage("PeerA", MediaT.Id2); s.deleteChat("PeerA"); s.deleteSource(MediaT.rooted("sweep.jpg")); s.sweepOrphans(true, new List<string> { "PeerB" });
        Assert.IsTrue(File.Exists(Path.Combine(rootChat, thumbName)) && new FileInfo(Path.Combine(rootChat, thumbName)).Length == 300 && Directory.Exists(Path.Combine(sb.parent, "outside-root", s.accountFolder, "x")), "…and no delete acts behind it");
        ChatMediaStoreRules.wipe(sb.root);
        Assert.IsTrue(File.Exists(Path.Combine(rootChat, thumbName)) && !Directory.Exists(sb.root), "the wipe removes the root link as a link");
    }

    [TestMethod]
    public void links_aFileLinkInsideAChatFolder_isNeverReadCountedOrFollowed()
    {
        // review round 2 (G1 / G4): a FILE link inside a chat folder (the reader: removing the file-link test of the
        // listing stayed green)
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.small(3, 1);
        string src = MediaT.rooted("flink.jpg");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, MediaT.ver(src), J(1)), "one real entry from flink.jpg");
        string real = MediaT.pathOf(s, MediaT.T, "PeerA", MediaT.Id1);
        string outside = Path.Combine(sb.parent, "outside");
        Directory.CreateDirectory(outside);
        string victim = Path.Combine(outside, "victim.t1");
        File.Copy(real, victim);   // a whole store image OUTSIDE the root: its header carries flink.jpg's source tag
        string chatDir = Path.GetDirectoryName(real)!;
        string l1 = Path.Combine(chatDir, new string('a', 64) + ".t1"), l2 = Path.Combine(chatDir, new string('b', 64) + ".t1");
        File.CreateSymbolicLink(l1, victim);
        File.CreateSymbolicLink(l2, victim);
        s.deleteChat("Unused");   // "not counted yet"
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id2, V, J(2)), "a second real entry: the count is 2 of 3 — the two file links are not counted");
        Assert.IsTrue(File.Exists(real), "…so no prune ran (with the links counted the folder would be over its bound and the prune would keep 1)");
        Assert.AreEqual(1, s.deleteSource(src), "the source scan reads no header THROUGH a file link: one entry, not three");
        Assert.IsTrue(File.Exists(victim) && new FileInfo(victim).Length > 100, "the link's target is untouched");
        // a file link under an ENTRY's own name: never read, removed as a link — even when its target is a whole image of exactly this key
        File.CreateSymbolicLink(real, victim);
        Assert.IsTrue(s.get(MediaT.T, "PeerA", MediaT.Id1, MediaT.ver(src)) == null, "a link to a valid image of this very key is NOT served: the target is never read");
        Assert.IsTrue(new FileInfo(real).Attributes == (FileAttributes)(-1) && File.Exists(victim), "…the link is gone, its target stays");
        string asEntry = MediaT.pathOf(s, MediaT.T, "PeerA", "ee");
        File.CreateSymbolicLink(asEntry, victim);
        Assert.IsTrue(s.get(MediaT.T, "PeerA", "ee", MediaT.ver(src)) == null, "get: a miss");
        Assert.IsTrue(new FileInfo(asEntry).Attributes == (FileAttributes)(-1) && File.Exists(victim), "…the link is gone, its target stays");
        File.CreateSymbolicLink(asEntry, victim);
        byte[] victimWas = File.ReadAllBytes(victim);
        Assert.IsTrue(s.put(MediaT.T, "PeerA", "ee", V, J(5)) && MediaT.same(J(5), s.get(MediaT.T, "PeerA", "ee", V)), "put: the link is replaced by a real file");
        Assert.IsTrue(File.Exists(victim) && MediaT.same(victimWas, File.ReadAllBytes(victim)) && new FileInfo(asEntry).LinkTarget == null, "…the target was not written through: it holds the bytes it held (review round 6, m-3: this compared the file with itself)");
        File.Delete(asEntry);
        File.CreateSymbolicLink(asEntry, victim);
        s.deleteMessage("PeerA", "ee");
        Assert.IsTrue(new FileInfo(asEntry).Attributes == (FileAttributes)(-1) && File.Exists(victim), "deleteMessage removes the link, not its target");
    }

    [TestMethod]
    public void links_aRealImageBehindAFolderLink_isNeverServed()
    {
        // review round 6 (m-3): get's folder-link guard set to `if (false)` stayed green — the planted files were not
        // images, so the read failed and discard's own link check hid the hole. Here the file behind the link is a REAL
        // image of exactly this key (the store made it): without the guard it would be read THROUGH the link and served.
        foreach (string at in new[] { "chat", "account", "root" })
        {
            using MediaSandbox sb = new MediaSandbox();
            ChatMediaStoreRules s = sb.store();
            string v = MediaT.ver(MediaT.rooted("behind.jpg"));
            Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, v, J(1)) && MediaT.same(J(1), s.get(MediaT.T, "PeerA", MediaT.Id1, v)), at + ": the entry is kept and served from the store's own folder");
            string real = MediaT.pathOf(s, MediaT.T, "PeerA", MediaT.Id1);
            byte[] image = File.ReadAllBytes(real);
            string place = at == "chat" ? Path.GetDirectoryName(real)! : at == "account" ? Path.Combine(sb.root, s.accountFolder) : sb.root;
            string outside = Path.Combine(sb.parent, "outside-" + at);
            Directory.Move(place, outside);                      // the real folder goes OUTSIDE the root…
            Directory.CreateSymbolicLink(place, outside);        // …and a link stands in its place
            Assert.IsTrue(File.Exists(real) && MediaT.same(image, File.ReadAllBytes(real)), at + ": the premise — the entry's own path leads THROUGH the link to a whole image of this key");
            Assert.IsTrue(s.get(MediaT.T, "PeerA", MediaT.Id1, v) == null, at + ": a real image of exactly this key behind a folder link is NOT served");
            Assert.IsTrue(File.Exists(real) && MediaT.same(image, File.ReadAllBytes(real)) && new DirectoryInfo(place).LinkTarget != null, at + ": …and nothing behind the link was read away, discarded or changed; the link is where it was");
        }
    }

    [TestMethod]
    public void links_atTheRoot_aSourceScanDeletesNothingThroughIt()
    {
        // review round 6 (m-3): removing `|| linkDir(root)` from the listing stayed green. Behind a link in the ROOT's
        // place lies a real entry made from this very source: the scan must not list it — and so not delete it.
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.small(4, 2);
        string src = MediaT.rooted("rootlink.jpg");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, MediaT.ver(src), J(1)) && s.put(MediaT.T, "PeerB", MediaT.Id2, MediaT.ver(src, 7), J(2)), "two entries made from rootlink.jpg");
        string real = MediaT.pathOf(s, MediaT.T, "PeerA", MediaT.Id1), real2 = MediaT.pathOf(s, MediaT.T, "PeerB", MediaT.Id2);
        byte[] image = File.ReadAllBytes(real);
        string outside = Path.Combine(sb.parent, "outside-root");
        Directory.Move(sb.root, outside);
        Directory.CreateSymbolicLink(sb.root, outside);
        Assert.IsTrue(File.Exists(real) && File.Exists(real2) && Directory.Exists(Path.Combine(sb.root, s.accountFolder)) && new DirectoryInfo(Path.Combine(sb.root, s.accountFolder)).LinkTarget == null,
            "the premise: the account folder is a real folder reached THROUGH the root link, with two entries of this source in it");
        Assert.AreEqual(0, s.deleteSource(src), "the source scan lists nothing through a link in the root's place");
        s.deleteSourceSoon(src);
        Assert.IsTrue(File.Exists(real) && File.Exists(real2) && MediaT.same(image, File.ReadAllBytes(real)), "…and both files behind the link are untouched");
        s.deleteChat("Unused");   // "not counted yet": a put would count (and prune) through the listing
        Assert.IsFalse(s.put(MediaT.T, "PeerC", "c1", V, J(3)), "a put is refused before it counts");
        Assert.AreEqual(2, Directory.GetFiles(outside, "*", SearchOption.AllDirectories).Length, "nothing was added or taken behind the link");
    }

    [TestMethod]
    public void links_aFileLinkUnderAnEntrysName_goesBeforeTheWrite_andTheBoundHolds()
    {
        // review round 6 (m-3): put's file-link guard set to `if (false)` stayed green. The move over the name replaces a
        // link on its own; what the guard keeps right is the COUNT — without it the link's target is taken for the entry
        // ("an overwrite"), the new file is not counted, and the folder passes its bound.
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.small(3, 1);
        string outside = Path.Combine(sb.parent, "outside");
        Directory.CreateDirectory(outside);
        string victim = Path.Combine(outside, "victim.bin");
        File.WriteAllBytes(victim, MediaT.jpeg(900, 9));
        byte[] victimWas = File.ReadAllBytes(victim);
        Assert.IsTrue(s.put(MediaT.T, "PeerA", "e1", V, J(1)), "one real entry: the folder is counted (1 of 3)");
        string asEntry = MediaT.pathOf(s, MediaT.T, "PeerA", "e2");
        File.CreateSymbolicLink(asEntry, victim);   // a file link under the NEXT entry's own name
        Assert.IsTrue(s.put(MediaT.T, "PeerA", "e2", V, J(2)) && MediaT.same(J(2), s.get(MediaT.T, "PeerA", "e2", V)), "the put replaces the link by a real file");
        Assert.IsTrue(new FileInfo(asEntry).LinkTarget == null && MediaT.same(victimWas, File.ReadAllBytes(victim)), "…the link's target holds the bytes it held");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", "e3", V, J(3)), "a third entry (3 of 3)");
        Assert.AreEqual(3, sb.storeFiles().Length, "three real files");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", "e4", V, J(4)), "a fourth: the folder is AT its bound, so the prune runs first");
        Assert.IsTrue(sb.storeFiles().Length <= 3, "the bound holds: the file written over the link was counted (" + sb.storeFiles().Length + " files, max 3)");
        Assert.AreEqual(2, sb.storeFiles().Length, "…the prune left 1, then the fourth was written");
        Assert.IsTrue(MediaT.same(victimWas, File.ReadAllBytes(victim)), "the target is still untouched");
    }

    [TestMethod]
    public void sweep_aProvenEmptyList_takesEveryChatOfThisAccount_andOnlyThat()
    {
        // review round 6 (m-2): the last contact left — the glue read the list with contacts before and reads it empty now
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store("AcctOne"), other = sb.store("AcctTwo");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, V, J(1)) && s.put(MediaT.V, "PeerB", MediaT.Id1, "t|1|a", MediaT.ascii(MediaT.info(10, 1))) && other.put(MediaT.T, "PeerA", MediaT.Id1, V, J(2)), "fill");
        long gA = s.generation("PeerA"), gOther = other.generation("PeerA");
        Assert.AreEqual(0, s.sweepOrphans(false, null, true), "NO list (not loaded, not readable) is never a proven empty one");
        Assert.AreEqual(0, s.sweepOrphans(false, new List<string>(), false), "an empty list that is not proven: nothing");
        Assert.AreEqual(0, s.sweepOrphans(false, new List<string>()), "…the default is 'not proven'");
        Assert.AreEqual(3, sb.files().Length, "all three files are there");
        Assert.AreEqual(2, s.sweepOrphans(false, new List<string>(), true), "a PROVEN empty list: both chat folders of this account go");
        Assert.IsTrue(sb.files().Length == 1 && has(other, MediaT.T, "PeerA", MediaT.Id1) && sb.trash().Length == 0, "…and nothing of another account; no trash is left");
        Assert.IsFalse(s.put(MediaT.T, "PeerA", MediaT.Id2, V, J(3), gA), "a decode that was running is refused");
        Assert.IsTrue(other.put(MediaT.T, "PeerA", MediaT.Id2, V, J(3), gOther), "the other account's is not");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id2, V, J(3)), "a decode that starts now (the contact is back) is kept");
        Assert.AreEqual(1, s.sweepOrphans(false, new List<string> { "PeerB" }, true), "with a list that names chats the flag changes nothing: the orphan goes");
    }

    [TestMethod]
    public void scan_aChatFolderThatLeavesAfterTheListing_doesNotEndTheScan()
    {
        // review round 6 (M-1, MAJOR): the source scan runs OFF the lock. A chat folder renamed to the trash (the orphan
        // sweep, a deleteChat) after the account folder was listed threw DirectoryNotFoundException out of the nested
        // enumeration, the scan ended as a whole, and the deleted file's previews stayed at rest (the reader: 18 of 40).
        foreach (bool byRename in new[] { true, false })
        {
            using MediaSandbox sb = new MediaSandbox();
            ChatMediaStoreRules s = sb.store();
            string gone = MediaT.rooted("deleted-photo.jpg"), kept = MediaT.rooted("kept-photo.jpg");
            string[] chats = Enumerable.Range(0, 12).Select(i => "Peer" + i).ToArray();
            foreach (string chat in chats)
            {
                Assert.IsTrue(s.put(MediaT.T, chat, MediaT.Id1, MediaT.ver(gone), J(1)) && s.put(MediaT.T, chat, MediaT.Id2, MediaT.ver(kept), J(2)), "fill " + chat);
            }
            Assert.IsTrue(s.put(MediaT.T, "Orphan", MediaT.Id1, MediaT.ver(kept), J(3)), "the chat that is about to leave");
            string acctDir = Path.Combine(sb.root, s.accountFolder), orphanDir = Path.GetDirectoryName(MediaT.pathOf(s, MediaT.T, "Orphan", MediaT.Id1))!;
            int left = 0;
            try
            {
                // the account folder was listed (the orphan's folder is IN that listing) — and now the folder leaves
                ChatMediaStoreRules.harnessListed = p =>
                {
                    if (!string.Equals(p, acctDir, StringComparison.Ordinal) || !Directory.Exists(orphanDir)) return false;
                    left++;
                    if (byRename) s.deleteChat("Orphan");            // the store's own way: one rename into the trash, then the tree delete
                    else Directory.Delete(orphanDir, true);            // the OS cleared a part of the cache
                    return false;
                };
                Assert.AreEqual(12, s.deleteSource(gone), "the scan went on over the other folders: every preview of the deleted file is deleted (byRename=" + byRename + ")");
            }
            finally
            {
                ChatMediaStoreRules.harnessListed = null;
            }
            Assert.AreEqual(1, left, "the premise: the folder left between the account listing and its own listing");
            Assert.IsFalse(chats.Any(c => has(s, MediaT.T, c, MediaT.Id1)), "no preview of the deleted file is at rest");
            Assert.IsTrue(chats.All(c => has(s, MediaT.T, c, MediaT.Id2)) && sb.storeFiles().Length == 12, "the previews of the other file stay; the orphan's are gone with its folder");
            Assert.IsTrue(s.put(MediaT.T, "Peer0", "ab", V, J(4)) && sb.storeFiles().Length == 13, "the count is taken again and the store works on");
        }
    }

    [TestMethod]
    public void scan_aLinkPutInAChatFoldersPlaceAfterTheListing_isNotListedThrough()
    {
        // M-1 (the listing is taken per folder now): the account folder's listing says "a real folder" for each chat —
        // and that look is kept. A link put in a chat folder's place AFTER it must not be listed through: behind it lies
        // a real entry made from this very source (the scan would delete it) and an old stray (the count would).
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        string src = MediaT.rooted("late-link.jpg");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, MediaT.ver(src), J(1)) && s.put(MediaT.T, "PeerB", MediaT.Id1, MediaT.ver(src), J(2)), "two entries made from late-link.jpg");
        string acctDir = Path.Combine(sb.root, s.accountFolder), chatB = Path.GetDirectoryName(MediaT.pathOf(s, MediaT.T, "PeerB", MediaT.Id1))!;
        string outside = Path.Combine(sb.parent, "outside"), victim = Path.Combine(outside, Path.GetFileName(MediaT.pathOf(s, MediaT.T, "PeerB", MediaT.Id1))), stray = Path.Combine(outside, "old.tmp");
        int planted = 0;
        try
        {
            ChatMediaStoreRules.harnessListed = p =>
            {
                if (planted > 0 || !string.Equals(p, acctDir, StringComparison.Ordinal)) return false;
                planted++;
                Directory.Move(chatB, outside);                   // chat B's real folder goes outside the root…
                File.WriteAllBytes(stray, new byte[5]);
                File.SetLastWriteTimeUtc(stray, DateTime.UtcNow.AddHours(-3));
                Directory.CreateSymbolicLink(chatB, outside);     // …and a link stands in its place, after the account folder was listed
                return false;
            };
            Assert.AreEqual(1, s.deleteSource(src), "the scan deletes chat A's entry — and lists nothing through the link");
        }
        finally
        {
            ChatMediaStoreRules.harnessListed = null;
        }
        Assert.AreEqual(1, planted, "the premise: the link was put there between the account listing and the chat folder's own");
        Assert.IsTrue(File.Exists(victim) && File.Exists(stray), "the entry and the stray behind the link are untouched");
        s.deleteChat("Unused");   // "not counted yet": the next put counts (and sweeps old strays)
        Assert.IsTrue(s.put(MediaT.T, "PeerA", "ab", V, J(3)), "a put into another chat counts the folder first");
        Assert.IsTrue(File.Exists(victim) && File.Exists(stray) && Directory.GetFileSystemEntries(outside).Length == 2, "…and the count's stray sweep did not walk through the link");
    }

    [TestMethod]
    public void count_aFolderThatCouldNotBeReadToItsEnd_isCouldNotTell_andNoPutPassesTheBound()
    {
        // M-1: one folder's listing breaks off (an IO error). A SCAN goes on with what was listed; a COUNT must not take
        // the short listing for the folder — it says "could not tell" and the put is refused until a count works.
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.small(4, 2);
        string src = MediaT.rooted("short.jpg");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", "a1", MediaT.ver(src), J(1)) && s.put(MediaT.T, "PeerA", "a2", V, J(2)) && s.put(MediaT.T, "PeerB", "b1", MediaT.ver(src), J(3)), "three entries (max 4)");
        string chatA = Path.GetDirectoryName(MediaT.pathOf(s, MediaT.T, "PeerA", "a1"))!;
        s.deleteChat("Unused");   // "not counted yet": the next put counts
        try
        {
            ChatMediaStoreRules.harnessListed = p => string.Equals(p, chatA, StringComparison.Ordinal);   // chat A's listing broke off
            Assert.IsFalse(s.put(MediaT.T, "PeerB", "b2", V, J(4)), "the count could not tell: the put is refused (it could pass the bound)");
            Assert.IsFalse(s.put(MediaT.T, "PeerB", "b3", V, J(5)), "…again, while the folder cannot be read");
            Assert.AreEqual(3, sb.storeFiles().Length, "nothing was written");
            Assert.AreEqual(2, s.deleteSource(src), "a scan still deletes what it can list — both previews of the deleted file");
        }
        finally
        {
            ChatMediaStoreRules.harnessListed = null;
        }
        Assert.IsTrue(s.put(MediaT.T, "PeerB", "b2", V, J(4)) && sb.storeFiles().Length == 2, "the folder can be read again: the count works and the put is kept");
        // the prune's own listing breaks off: it reports "could not tell" as well
        Assert.IsTrue(s.put(MediaT.T, "PeerB", "b3", V, J(5)) && s.put(MediaT.T, "PeerB", "b4", V, J(6)), "up to the bound (4 of 4)");
        string chatB = Path.GetDirectoryName(MediaT.pathOf(s, MediaT.T, "PeerB", "b2"))!;
        try
        {
            ChatMediaStoreRules.harnessListed = p => string.Equals(p, chatB, StringComparison.Ordinal);
            Assert.IsFalse(s.put(MediaT.T, "PeerA", "a9", V, J(7)), "at the bound the prune runs; its listing broke off: the put is refused");
        }
        finally
        {
            ChatMediaStoreRules.harnessListed = null;
        }
        Assert.IsTrue(s.put(MediaT.T, "PeerA", "a9", V, J(7)) && sb.storeFiles().Length <= 4, "readable again: the put is kept and the bound holds");
    }

    [TestMethod]
    public void scan_theAppsForm_alsoGoesOnWhenAFolderLeft()
    {
        // M-1 through deleteSourceSoon (what the app calls): the generation moves in the call, the scan is handed over
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        string gone = MediaT.rooted("deleted-soon.jpg");
        foreach (string chat in new[] { "PeerA", "PeerB", "PeerC", "Orphan" }) Assert.IsTrue(s.put(MediaT.T, chat, MediaT.Id1, MediaT.ver(gone), J(1)), "fill " + chat);
        string acctDir = Path.Combine(sb.root, s.accountFolder);
        int swept = -1;
        try
        {
            // the orphan sweep takes the fourth folder mid-scan — once (the sweep lists the account folder itself)
            ChatMediaStoreRules.harnessListed = p => { if (swept < 0 && string.Equals(p, acctDir, StringComparison.Ordinal)) { swept = 0; swept = s.sweepOrphans(false, new List<string> { "PeerA", "PeerB", "PeerC" }); } return false; };
            s.deleteSourceSoon(gone);
        }
        finally
        {
            ChatMediaStoreRules.harnessListed = null;
        }
        Assert.AreEqual(1, swept, "the premise: the sweep took the orphan's folder after the scan's account listing");
        Assert.AreEqual(0, sb.storeFiles().Length, "every preview of the deleted file is gone — the three the scan deleted and the one the sweep took");
        Assert.AreEqual(0, sb.trash().Length, "no trash is left");
    }

    [TestMethod]
    public void wipeKind_aChatFolderThatLeavesAfterTheListing_doesNotEndTheWipe()
    {
        // review round 6 (M-1): the thumbnail wipe's file work was ONE try around three nested enumerations, off the lock.
        // In EACH account one chat folder leaves right after that account's folder was listed: whichever account the
        // walk takes first, the other account's thumbnails (and the first one's other chats) must still go.
        foreach (bool byRename in new[] { true, false })
        {
            using MediaSandbox sb = new MediaSandbox();
            ChatMediaStoreRules a = sb.store("AcctOne"), b = sb.store("AcctTwo");
            string[] chats = { "Gone", "PeerA", "PeerB", "PeerC" };
            foreach (ChatMediaStoreRules s in new[] { a, b })
            {
                foreach (string chat in chats)
                {
                    Assert.IsTrue(s.put(MediaT.T, chat, MediaT.Id1, V, J(1)) && s.put(MediaT.T, chat, MediaT.Id2, V, J(2)) && s.put(MediaT.V, chat, MediaT.Id1, "t|1|a", MediaT.ascii(MediaT.info(10, 1))), "fill " + chat);
                }
            }
            int left = 0;
            try
            {
                ChatMediaStoreRules.harnessListed = p =>
                {
                    foreach (ChatMediaStoreRules s in new[] { a, b })
                    {
                        string goneDir = Path.GetDirectoryName(MediaT.pathOf(s, MediaT.T, "Gone", MediaT.Id1))!;
                        if (!string.Equals(p, Path.Combine(sb.root, s.accountFolder), StringComparison.Ordinal) || !Directory.Exists(goneDir)) continue;
                        left++;
                        if (byRename) s.deleteChat("Gone");
                        else Directory.Delete(goneDir, true);
                    }
                    return false;
                };
                ChatMediaStoreRules.wipeKind(sb.root, MediaT.T);
            }
            finally
            {
                ChatMediaStoreRules.harnessListed = null;
            }
            Assert.AreEqual(0, sb.files().Count(f => f.EndsWith(".t1", StringComparison.Ordinal)), "no thumbnail is left, of any chat, of either account (byRename=" + byRename + ")");
            Assert.AreEqual(2, left, "the premise: in each account a chat folder left between the account's listing and its own");
            Assert.AreEqual(6, sb.files().Count(f => f.EndsWith(".v1", StringComparison.Ordinal)), "the peaks of the six chats that stayed are untouched");
            Assert.IsTrue(a.put(MediaT.T, "PeerA", "ab", V, J(3)) && b.put(MediaT.T, "PeerA", "ab", V, J(3)), "both accounts work on");
        }
    }

    [TestMethod]
    public void wipeKind_aFolderThatCannotBeListed_doesNotEndTheWipe()
    {
        // M-1: a fault at ONE chat folder's listing (the seam throws for it — an IO error, a folder the walk may not
        // read) costs that folder only
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules a = sb.store("AcctOne"), b = sb.store("AcctTwo");
        foreach (ChatMediaStoreRules s in new[] { a, b })
        {
            foreach (string chat in new[] { "Faulty", "PeerA", "PeerB" }) Assert.IsTrue(s.put(MediaT.T, chat, MediaT.Id1, V, J(1)), "fill " + chat);
        }
        string[] faulty = new[] { a, b }.Select(s => Path.GetDirectoryName(MediaT.pathOf(s, MediaT.T, "Faulty", MediaT.Id1))!).ToArray();
        try
        {
            ChatMediaStoreRules.harnessListed = p => { if (faulty.Contains(p)) throw new IOException("the listing failed"); return false; };
            ChatMediaStoreRules.wipeKind(sb.root, MediaT.T);
        }
        finally
        {
            ChatMediaStoreRules.harnessListed = null;
        }
        Assert.IsFalse(new[] { a, b }.Any(s => has(s, MediaT.T, "PeerA", MediaT.Id1) || has(s, MediaT.T, "PeerB", MediaT.Id1)), "every other chat's thumbnail went, in both accounts");
        ChatMediaStoreRules.wipeKind(sb.root, MediaT.T);
        Assert.AreEqual(0, sb.files().Length, "…and the next wipe takes the two the fault held back");
    }

    [TestMethod]
    public void sweep_aFaultAfterSomeRenames_stillDeletesTheTrashItMade()
    {
        // review round 6 (n-3): the sweep renamed another account's folder into <root>/del-…, then its second listing
        // (this account's folder) failed — the tree delete sat behind that listing in the same try, so the renamed
        // folder waited for the next process. It runs whatever ends the sweep early.
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store("AcctOne"), stale = sb.store("AcctOld");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, V, J(1)) && s.put(MediaT.T, "Orphan", MediaT.Id1, V, J(2)), "this account: a chat and an orphan");
        for (int i = 0; i < 5; i++) Assert.IsTrue(stale.put(MediaT.T, "Peer" + i, MediaT.Id1, V, J(i)), "an older account's folder " + i);
        string acctDir = Path.Combine(sb.root, s.accountFolder), staleDir = Path.Combine(sb.root, stale.accountFolder);
        int removed;
        try
        {
            ChatMediaStoreRules.harnessListed = p => { if (string.Equals(p, acctDir, StringComparison.Ordinal)) throw new IOException("the listing failed"); return false; };
            removed = s.sweepOrphans(true, new List<string> { "PeerA" });
        }
        finally
        {
            ChatMediaStoreRules.harnessListed = null;
        }
        Assert.AreEqual(1, removed, "the older account's folder was taken out; the chat part ended on the fault (no throw)");
        Assert.IsFalse(Directory.Exists(staleDir), "the older account's folder left its place");
        Assert.AreEqual(0, sb.trash().Length, "…and its tree is DELETED now — it does not wait in <root>/del-… for the next process");
        Assert.AreEqual(2, sb.storeFiles().Length, "only this account's two files are at rest");
        Assert.AreEqual(1, s.sweepOrphans(true, new List<string> { "PeerA" }), "the next sweep takes the orphan the fault held back");
        Assert.IsTrue(has(s, MediaT.T, "PeerA", MediaT.Id1) && sb.storeFiles().Length == 1, "the chat the app has stays");
    }

    [TestMethod]
    public void generation_isReadWithoutTheStoresLock()
    {
        // review round 2 (G2): the read is called on the main thread and inside the page's message lock; the store's
        // lock is held across disk work. A read must not wait for it.
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        long before = s.generation("PeerA");
        using ManualResetEventSlim held = new ManualResetEventSlim(false), release = new ManualResetEventSlim(false);
        Thread holder = new Thread(() => ChatMediaStoreRules.harnessHoldLock(() => { held.Set(); release.Wait(20000); }));
        holder.Start();
        try
        {
            Assert.IsTrue(held.Wait(5000), "a thread holds the store's lock (as a prune or a sweep's listing does)");
            long read = -5;
            Task reader = Task.Run(() => { read = s.generation("PeerA"); });
            Assert.IsTrue(reader.Wait(3000), "the generation read came back while the lock was held");
            Assert.AreEqual(before, read, "…with the chat's generation");
            Task<bool> writer = Task.Run(() => s.put(MediaT.T, "PeerA", MediaT.Id1, V, J(1), before));
            Assert.IsFalse(writer.Wait(300), "the harness's premise: a put DOES wait for that lock");
            release.Set();
            Assert.IsTrue(writer.Wait(5000) && writer.Result, "…and goes through when it is free");
        }
        finally
        {
            release.Set();
            holder.Join(5000);
        }
        // the lock-free read sees every delete that returned
        s.deleteChat("PeerA");
        long g1 = s.generation("PeerA");
        s.deleteSource(MediaT.rooted("x.jpg"));
        long g2 = s.generation("PeerA");
        ChatMediaStoreRules.wipe(sb.root);
        long g3 = s.generation("PeerA");
        Assert.IsTrue(before < g1 && g1 < g2 && g2 < g3, "each delete is seen by the next read");
        // readers beside a writer: a read never gives a number a LATER state could match by mistake
        int bad = 0;
        bool stop = false;
        Task[] readers = Enumerable.Range(0, 4).Select(_ => Task.Run(() =>
        {
            long last = 0;
            while (!Volatile.Read(ref stop)) { long g = s.generation("PeerA"); if (g < last) Interlocked.Increment(ref bad); last = g; }
        })).ToArray();
        for (int i = 0; i < 3000; i++) { if (i % 3 == 0) s.deleteSource(MediaT.rooted("y.jpg")); else s.deleteChat("Peer" + (i % 1100)); }
        Volatile.Write(ref stop, true);
        Task.WaitAll(readers);
        Assert.AreEqual(0, bad, "under 3000 deletes (the chat table filled and emptied) a reader's number never went back");
    }

    [TestMethod]
    public void ifCurrent_aDeletedMessage_getsNoMemoryEntry()
    {
        // review round 2 (G6): a job that only STARTS after deleteMessage was refused on disk (remembered by name) but its
        // memory entry was accepted
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        s.deleteMessage("PeerA", MediaT.Id1);
        long after = s.generation("PeerA");
        int ran = 0;
        Assert.IsFalse(s.put(MediaT.T, "PeerA", MediaT.Id1, V, J(1), after), "the disk put of the deleted message is refused");
        Assert.IsFalse(s.ifCurrent(MediaT.T, "PeerA", MediaT.Id1, after, () => ran++) || s.ifCurrent(MediaT.V, "PeerA", MediaT.Id1.ToUpperInvariant(), after, () => ran++), "…and so is its memory entry, thumbnail and peaks");
        Assert.AreEqual(0, ran, "the callback did not run");
        Assert.IsTrue(s.ifCurrent(MediaT.T, "PeerA", MediaT.Id2, after, () => ran++) && s.ifCurrent(MediaT.T, "PeerB", MediaT.Id1, s.generation("PeerB"), () => ran++) && ran == 2, "another message of the chat and the same id in another chat are kept");
        Assert.IsFalse(s.ifCurrent(MediaT.T, "PeerA", "zz", after, () => ran++) || s.ifCurrent('x', "PeerA", MediaT.Id2, after, () => ran++), "a bad id / kind: false, no throw");
    }

    [TestMethod]
    public void treeDeletes_runOffTheCallersThread_afterTheGenerationMoved()
    {
        // F8 (S-delete n-3): deleteChat / wipe are often called on the main thread. The generation moves and the folder
        // leaves its place (one rename) before the call returns; the tree delete is handed to "later".
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        List<Action> queued = new List<Action>();
        try
        {
            ChatMediaStoreRules.harnessLater = a => queued.Add(a);
            for (int i = 0; i < 5; i++) Assert.IsTrue(s.put(MediaT.T, "PeerA", "a" + i, V, J(i)), "fill " + i);
            long g = s.generation("PeerA");
            string chatDir = Path.GetDirectoryName(MediaT.pathOf(s, MediaT.T, "PeerA", "a0"))!;
            s.deleteChat("PeerA");
            Assert.AreEqual(1, queued.Count, "the tree delete was handed over — it did not run inside the call");
            Assert.IsFalse(Directory.Exists(chatDir), "the chat's folder left its place inside the call");
            Assert.IsTrue(sb.trash().Length == 1 && Directory.GetFiles(sb.trash()[0]).Length == 5, "its five files wait in ONE trash folder inside the root");
            Assert.IsTrue(s.get(MediaT.T, "PeerA", "a0", V) == null, "nothing of it is served any more");
            Assert.IsFalse(s.put(MediaT.T, "PeerA", "a0", V, J(0), g), "BEFORE the tree delete runs: a late put is refused (the generation moved first)");
            Assert.IsTrue(s.put(MediaT.T, "PeerA", "ee", V, J(9)), "a decode that starts now makes a NEW folder");
            queued[0]();
            Assert.AreEqual(0, sb.trash().Length, "the tree delete ran: no trash is left");
            Assert.IsTrue(MediaT.same(J(9), s.get(MediaT.T, "PeerA", "ee", V)), "…and it did not touch the new folder");
            Assert.IsFalse(s.put(MediaT.T, "PeerA", "a0", V, J(0), g), "AFTER it: the late put is still refused");
            Assert.AreEqual(1, sb.files().Length, "one file at rest");
            // the wipe
            queued.Clear();
            ChatMediaStoreRules b = sb.store("AcctTwo");
            Assert.IsTrue(b.put(MediaT.T, "PeerB", MediaT.Id1, V, J(1)), "a second account");
            long ga = s.generation("PeerA"), gb = b.generation("PeerB");
            ChatMediaStoreRules.wipe(sb.root);
            Assert.AreEqual(1, queued.Count, "the wipe's tree deletes were handed over");
            Assert.IsTrue(Directory.GetDirectories(sb.root).All(d => Path.GetFileName(d).StartsWith(ChatMediaStoreRules.TrashPrefix, StringComparison.Ordinal)) && sb.trash().Length == 2, "both account folders left their place inside the call");
            Assert.IsFalse(s.put(MediaT.T, "PeerA", "a0", V, J(0), ga) || b.put(MediaT.T, "PeerB", MediaT.Id2, V, J(0), gb), "a late put of either account is refused before the trees are deleted");
            Assert.IsTrue(s.get(MediaT.T, "PeerA", "ee", V) == null && b.get(MediaT.T, "PeerB", MediaT.Id1, V) == null, "nothing is served");
            Assert.IsTrue(s.put(MediaT.T, "PeerA", "af", V, J(5)), "a decode that starts after the wipe is kept");
            queued[0]();
            Assert.IsTrue(sb.trash().Length == 0 && sb.files().Length == 1 && MediaT.same(J(5), s.get(MediaT.T, "PeerA", "af", V)), "the trees are gone; the new entry (and so the root) stays");
            // the source scan and the thumbnail wipe: the generation moves in the call, the file work is handed over
            queued.Clear();
            string src = MediaT.rooted("scan.jpg");
            Assert.IsTrue(s.put(MediaT.T, "PeerA", "c1", MediaT.ver(src), J(6)), "an entry from scan.jpg");
            long gs = s.generation("PeerA");
            s.deleteSourceSoon(src);
            Assert.IsTrue(queued.Count == 1 && File.Exists(MediaT.pathOf(s, MediaT.T, "PeerA", "c1")), "the header scan was handed over");
            Assert.IsFalse(s.put(MediaT.T, "PeerA", "c2", MediaT.ver(src), J(7), gs), "…the late put is refused already");
            queued[0]();
            Assert.IsFalse(File.Exists(MediaT.pathOf(s, MediaT.T, "PeerA", "c1")), "the scan ran");
            queued.Clear();
            long gk = s.generation("PeerA");
            ChatMediaStoreRules.wipeKind(sb.root, MediaT.T);
            Assert.IsTrue(queued.Count == 1 && sb.files().Length == 1, "the thumbnail wipe's file deletes were handed over");
            Assert.IsFalse(s.put(MediaT.T, "PeerA", "c3", V, J(8), gk), "…the late put is refused already");
            queued[0]();
            Assert.AreEqual(0, sb.files().Length, "they ran");
        }
        finally
        {
            ChatMediaStoreRules.harnessLater = MediaT.inline;
        }
    }

    [TestMethod]
    public void treeDeletes_theAppsOwnWay_isAPoolThread()
    {
        // harnessLater = null: exactly what the app runs (Task.Run) — the call returns, the trash goes soon after
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.store();
        try
        {
            ChatMediaStoreRules.harnessLater = null;
            for (int i = 0; i < 20; i++) Assert.IsTrue(s.put(MediaT.T, "PeerA", "a" + i.ToString("x2"), V, J(i)), "fill " + i);
            s.deleteChat("PeerA");
            Assert.IsFalse(Directory.Exists(Path.GetDirectoryName(MediaT.pathOf(s, MediaT.T, "PeerA", "a00"))), "the folder left its place inside the call");
            for (int i = 0; i < 500 && sb.files().Length != 0; i++) Thread.Sleep(10);
            Assert.IsTrue(sb.files().Length == 0 && sb.trash().Length == 0, "the pool thread deleted the tree");
            Assert.IsTrue(s.put(MediaT.T, "PeerA", "b0", V, J(1)), "the store works on");
            ChatMediaStoreRules.wipe(sb.root);
            for (int i = 0; i < 500 && Directory.Exists(sb.root); i++) Thread.Sleep(10);
            Assert.IsFalse(Directory.Exists(sb.root), "the wipe's pool thread removed the root");
        }
        finally
        {
            ChatMediaStoreRules.harnessLater = MediaT.inline;
        }
    }
}

[TestClass]
public class ChatMediaStoreBoundTests
{
    [TestMethod]
    public void bound_constants()
    {
        Assert.AreEqual(4096, ChatMediaStoreRules.MaxFilesPerAccount, "at most 4096 files per account folder");
        Assert.IsTrue(ChatMediaStoreRules.PruneKeep > 0 && ChatMediaStoreRules.PruneKeep < ChatMediaStoreRules.MaxFilesPerAccount, "a prune leaves room");
        using MediaSandbox sb = new MediaSandbox();
        Assert.IsTrue(ChatMediaStoreRules.open(sb.root, "AcctOne", 8, 8) == null && ChatMediaStoreRules.open(sb.root, "AcctOne", 1, 0) == null, "a bound a prune could not serve is refused");
    }

    [TestMethod]
    public void bound_neverAboveMax_theOldestGoFirst()
    {
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.small(8, 5);
        string v = MediaT.ver(MediaT.rooted("a.jpg"));
        DateTime t0 = DateTime.UtcNow.AddHours(-1);
        for (int i = 0; i < 8; i++)
        {
            string id = "a" + i;
            Assert.IsTrue(s.put(MediaT.T, i % 2 == 0 ? "PeerA" : "PeerB", id, v, MediaT.jpeg(300, i)), "put " + i);
            File.SetLastWriteTimeUtc(MediaT.pathOf(s, MediaT.T, i % 2 == 0 ? "PeerA" : "PeerB", id), t0.AddMinutes(i));   // a0 the oldest … a7 the newest
        }
        Assert.AreEqual(8, sb.files().Length, "the folder is at its bound");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", "b0", v, MediaT.jpeg(300, 99)), "the ninth put");
        Assert.AreEqual(6, sb.files().Length, "the prune left 5, the new one makes 6");
        for (int i = 0; i < 3; i++) Assert.IsFalse(File.Exists(MediaT.pathOf(s, MediaT.T, i % 2 == 0 ? "PeerA" : "PeerB", "a" + i)), "the oldest went: a" + i);
        for (int i = 3; i < 8; i++) Assert.IsTrue(File.Exists(MediaT.pathOf(s, MediaT.T, i % 2 == 0 ? "PeerA" : "PeerB", "a" + i)), "the newer stay: a" + i);
        Assert.IsTrue(File.Exists(MediaT.pathOf(s, MediaT.T, "PeerA", "b0")), "the new one is there");
        int max = 0;
        for (int i = 0; i < 40; i++)
        {
            s.put(i % 3 == 0 ? MediaT.V : MediaT.T, "Peer" + (char)('A' + i % 4), "c" + i.ToString("x2"), i % 3 == 0 ? "t|1|" + i : v, i % 3 == 0 ? MediaT.ascii(MediaT.info(10, i)) : MediaT.jpeg(300, i));
            max = Math.Max(max, sb.files().Length);
        }
        Assert.IsTrue(max <= 8, "40 more puts over 4 chats: never above the bound (max seen " + max + ")");
    }

    [TestMethod]
    public void bound_overwritingAKeptEntryIsNotCountedTwice()
    {
        // review round 1 (m2): with max 4 / keep 1, a count that grew on every overwrite would reach the bound after a few
        // writes and the prune would take the OLDER second entry. It must survive 20 overwrites of the first.
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.small(4, 1);
        string v = MediaT.ver(MediaT.rooted("a.jpg"));
        Assert.IsTrue(s.put(MediaT.T, "PeerB", MediaT.Id2, v, MediaT.jpeg(250, 77)), "the second entry");
        File.SetLastWriteTimeUtc(MediaT.pathOf(s, MediaT.T, "PeerB", MediaT.Id2), DateTime.UtcNow.AddHours(-2));   // the OLDEST file: a prune takes it first
        for (int i = 0; i < 20; i++) Assert.IsTrue(s.put(MediaT.T, "PeerA", MediaT.Id1, v, MediaT.jpeg(300 + i, i)), "overwrite " + i);
        Assert.AreEqual(2, sb.files().Length, "one entry written 20 times is one file; the other entry is still there");
        Assert.IsTrue(MediaT.same(MediaT.jpeg(250, 77), s.get(MediaT.T, "PeerB", MediaT.Id2, v)), "the older second entry survived — no prune ran");
        Assert.IsTrue(MediaT.same(MediaT.jpeg(319, 19), s.get(MediaT.T, "PeerA", MediaT.Id1, v)), "the last one is served");
        // …and the count is exact: two more NEW names fit (4), the next one prunes
        Assert.IsTrue(s.put(MediaT.T, "PeerA", "c1", v, MediaT.jpeg(300, 1)) && s.put(MediaT.T, "PeerA", "c2", v, MediaT.jpeg(300, 2)), "two more names");
        Assert.AreEqual(4, sb.files().Length, "four files: exactly the bound, no prune yet");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", "c3", v, MediaT.jpeg(300, 3)) && sb.files().Length == 2, "the fifth name prunes to 1 and adds itself");
        Assert.IsFalse(File.Exists(MediaT.pathOf(s, MediaT.T, "PeerB", MediaT.Id2)), "the oldest went first");
    }

    [TestMethod]
    public void bound_holdsWhenThePruneCannotMakeRoom()
    {
        // review round 1 (m3): the folder is full of files the prune must leave alone (young files that are not store
        // names: they could be writes in flight). The put is refused and nothing grows.
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.small(4, 2);
        string v = MediaT.ver(MediaT.rooted("a.jpg"));
        string chatDir = Path.GetDirectoryName(MediaT.pathOf(s, MediaT.T, "PeerA", MediaT.Id1))!;
        Directory.CreateDirectory(chatDir);
        for (int i = 0; i < 4; i++) File.WriteAllBytes(Path.Combine(chatDir, Guid.NewGuid().ToString("N") + ChatMediaStoreRules.TempExtension), new byte[10]);
        for (int i = 0; i < 3; i++)
        {
            Assert.IsFalse(s.put(MediaT.T, "PeerA", "a" + i, v, MediaT.jpeg(300, i)), "put " + i + " is refused: the bound holds");
            Assert.IsFalse(s.put(MediaT.T, "PeerB", "a" + i, v, MediaT.jpeg(300, i)), "…in another chat folder too (the bound is per account)");
        }
        Assert.AreEqual(4, sb.files().Length, "the count did not grow");
        Assert.AreEqual(0, sb.storeFiles().Length, "no store file was written, no temp of ours was left");
        // room again (the young files aged): the strays go and the store works
        foreach (string f in sb.files()) File.SetLastWriteTimeUtc(f, DateTime.UtcNow.AddMinutes(-11));
        Assert.IsTrue(s.put(MediaT.T, "PeerA", "b0", v, MediaT.jpeg(300, 9)), "the prune can run now");
        Assert.AreEqual(1, sb.files().Length, "the four strays went; one entry");
    }

    [TestMethod]
    public void bound_bytesPerAccountFolder()
    {
        // review round 1 (F10): 4096 files of 64 KB would be 268 MB — the folder has a byte bound beside the file bound
        Assert.AreEqual(64L * 1024 * 1024, ChatMediaStoreRules.MaxBytesPerAccount, "at most 64 MB per account folder");
        Assert.IsTrue(ChatMediaStoreRules.PruneKeepBytes > 0 && ChatMediaStoreRules.PruneKeepBytes < ChatMediaStoreRules.MaxBytesPerAccount, "a prune leaves room in bytes");
        Assert.IsTrue((long)ChatMediaStoreRules.MaxFilesPerAccount * (ChatMediaStoreRules.HeaderLength + ChatMediaStoreRules.ThumbMaxBytes) > ChatMediaStoreRules.MaxBytesPerAccount, "the file bound alone would allow more than the byte bound");
        using MediaSandbox sb = new MediaSandbox();
        Assert.IsTrue(ChatMediaStoreRules.open(sb.root, "AcctOne", 100, 50, 1000, 1000) == null && ChatMediaStoreRules.open(sb.root, "AcctOne", 100, 50, 1000, 0) == null, "a byte bound a prune could not serve is refused");
        int one = ChatMediaStoreRules.HeaderLength + 2000;   // one file on disk: the header + the payload
        ChatMediaStoreRules s = sb.small(100, 50, "AcctOne", 10000, 6000);   // the file bound is far away: only the bytes act
        string v = MediaT.ver(MediaT.rooted("a.jpg"));
        long bytes() => sb.files().Sum(f => new FileInfo(f).Length);
        DateTime t0 = DateTime.UtcNow.AddHours(-1);
        for (int i = 0; i < 4; i++)
        {
            Assert.IsTrue(s.put(MediaT.T, "PeerA", "a" + i, v, MediaT.jpeg(2000, i)), "put " + i);
            File.SetLastWriteTimeUtc(MediaT.pathOf(s, MediaT.T, "PeerA", "a" + i), t0.AddMinutes(i));
        }
        Assert.AreEqual(4L * one, bytes(), "four files: 8356 bytes, under 10000");
        Assert.IsTrue(s.put(MediaT.T, "PeerA", "b0", v, MediaT.jpeg(2000, 9)), "the fifth would pass the byte bound: the prune runs first");
        Assert.AreEqual(3L * one, bytes(), "the prune left ≤ 6000 bytes (two files), the new one makes three");
        Assert.IsFalse(File.Exists(MediaT.pathOf(s, MediaT.T, "PeerA", "a0")) || File.Exists(MediaT.pathOf(s, MediaT.T, "PeerA", "a1")), "the OLDEST went first");
        Assert.IsTrue(File.Exists(MediaT.pathOf(s, MediaT.T, "PeerA", "a2")) && File.Exists(MediaT.pathOf(s, MediaT.T, "PeerA", "a3")) && File.Exists(MediaT.pathOf(s, MediaT.T, "PeerA", "b0")), "the newer stay");
        long max = 0;
        for (int i = 0; i < 60; i++)
        {
            s.put(MediaT.T, "Peer" + (char)('A' + i % 3), "c" + i.ToString("x2"), v, MediaT.jpeg(500 + (i * 137) % 3000, i));
            max = Math.Max(max, bytes());
        }
        Assert.IsTrue(max <= 10000, "60 more puts of mixed sizes: never above the byte bound (max seen " + max + ")");
        // an OVERWRITE counts its byte difference: growing one entry cannot pass the bound unseen
        ChatMediaStoreRules t = sb.small(100, 50, "AcctTwo", 10000, 6000);
        Assert.IsTrue(t.put(MediaT.T, "PeerA", "d0", v, MediaT.jpeg(4000, 1)) && t.put(MediaT.T, "PeerA", "d1", v, MediaT.jpeg(4000, 2)), "two entries, 8178 bytes");
        File.SetLastWriteTimeUtc(MediaT.pathOf(t, MediaT.T, "PeerA", "d0"), t0);
        Assert.IsTrue(t.put(MediaT.T, "PeerA", "d1", v, MediaT.jpeg(7000, 3)), "d1 grows to 7089 bytes: over the bound with d0 — the prune runs");
        Assert.IsFalse(File.Exists(MediaT.pathOf(t, MediaT.T, "PeerA", "d0")), "d0 (the oldest) paid for it");
        Assert.IsTrue(MediaT.same(MediaT.jpeg(7000, 3), t.get(MediaT.T, "PeerA", "d1", v)), "the grown entry is served");
        Assert.IsFalse(t.put(MediaT.T, "PeerA", "d2", v, MediaT.jpeg(9950, 4)), "a file that alone is over the bound is never kept");
        Assert.IsTrue(MediaT.same(MediaT.jpeg(7000, 3), t.get(MediaT.T, "PeerA", "d1", v)), "…and nothing was pruned for it");
    }

    [TestMethod]
    public void bound_straysAndAnotherInstanceCount()
    {
        using MediaSandbox sb = new MediaSandbox();
        ChatMediaStoreRules s = sb.small(6, 3);
        string v = MediaT.ver(MediaT.rooted("a.jpg"));
        Assert.IsTrue(s.put(MediaT.T, "PeerA", "a0", v, MediaT.jpeg(300, 0)), "the first put");
        string chatDir = Path.GetDirectoryName(MediaT.pathOf(s, MediaT.T, "PeerA", "a0"))!;
        ChatMediaStoreRules twin = sb.small(6, 3);   // a second instance over the same account folder shares the count
        for (int i = 1; i < 6; i++) Assert.IsTrue((i % 2 == 0 ? s : twin).put(MediaT.T, "PeerA", "a" + i, v, MediaT.jpeg(300, i)), "put " + i);
        Assert.AreEqual(6, sb.files().Length, "six files through two instances");
        Assert.IsTrue(twin.put(MediaT.T, "PeerA", "a6", v, MediaT.jpeg(300, 6)), "the seventh put prunes first");
        Assert.AreEqual(4, sb.files().Length, "3 kept + the new one — the two instances kept ONE count");
        // a stray old file in the folder (a temp a kill left) is removed by the prune, before any kept entry
        string stray = Path.Combine(chatDir, "leftover.tmp");
        File.WriteAllBytes(stray, new byte[10]);
        File.SetLastWriteTimeUtc(stray, DateTime.UtcNow.AddHours(-2));
        s.deleteChat("UnusedChat");   // "not counted yet": the next put counts the folder again (and sweeps)
        Assert.IsTrue(s.put(MediaT.T, "PeerA", "a7", v, MediaT.jpeg(300, 7)), "a put after the recount");
        Assert.IsFalse(File.Exists(stray), "the stray is gone");
        Assert.AreEqual(5, sb.files().Length, "no kept entry paid for it");
    }
}

[TestClass]
public class ChatMediaLruTests
{
    [TestMethod]
    public void lru_refreshOnHit_theOldestGoes()
    {
        ChatMediaLru<string, byte[]?> lru = new ChatMediaLru<string, byte[]?>(3, StringComparer.Ordinal);
        byte[] a = { 1 }, b = { 2 }, c = { 3 }, d = { 4 };
        lru.put("a", a); lru.put("b", b); lru.put("c", c);
        Assert.IsTrue(lru.tryGet("a", out byte[]? got) && ReferenceEquals(got, a), "a hit gives the kept bytes");   // a is now the freshest
        lru.put("d", d);   // over the capacity: the OLDEST goes — b (a FIFO would drop a)
        Assert.AreEqual(3, lru.count, "three entries");
        Assert.IsFalse(lru.tryGet("b", out _), "b was the least recently used: gone");
        Assert.IsTrue(lru.tryGet("a", out _) && lru.tryGet("c", out _) && lru.tryGet("d", out _), "a (refreshed), c and d stay");
        lru.put("c", d);   // a replace refreshes too, and does not grow
        Assert.IsTrue(lru.count == 3 && lru.tryGet("c", out got) && ReferenceEquals(got, d), "a replace keeps the count and gives the new value");
        lru.put("e", null);   // "known to have none" is an entry too (a failed decode is not tried again)
        Assert.IsTrue(lru.tryGet("e", out got) && got == null, "a null value is held");
        Assert.IsFalse(lru.tryGet("a", out _), "a was the oldest then: gone");
        Assert.IsFalse(lru.tryGet("zz", out got) || got != null, "a miss");
        lru.clear();
        Assert.IsTrue(lru.count == 0 && !lru.tryGet("c", out _), "clear empties it");
    }

    [TestMethod]
    public void lru_128Entries()
    {
        Assert.AreEqual(128, ChatMediaStoreRules.MemoryThumbs, "the page's memory LRU holds 128 thumbnails");
        ChatMediaLru<string, byte[]?> lru = new ChatMediaLru<string, byte[]?>(ChatMediaStoreRules.MemoryThumbs, StringComparer.Ordinal);
        for (int i = 0; i < 128; i++) lru.put("k" + i, new byte[] { (byte)i });
        Assert.AreEqual(128, lru.count, "128 fit");
        Assert.IsTrue(lru.tryGet("k0", out _), "k0 is read: the freshest now");
        lru.put("k128", new byte[] { 1 });
        Assert.AreEqual(128, lru.count, "the 129th does not grow it");
        Assert.IsTrue(lru.tryGet("k0", out _) && !lru.tryGet("k1", out _) && lru.tryGet("k2", out _) && lru.tryGet("k128", out _), "k1 (the oldest unread) went; k0 stayed");
        ChatMediaLru<string, int> one = new ChatMediaLru<string, int>(0);
        one.put("a", 1); one.put("b", 2);
        Assert.IsTrue(one.count == 1 && one.tryGet("b", out int v) && v == 2, "a capacity below 1 acts as 1");
    }

    [TestMethod]
    public void misses_expire_andAHitNeverRefreshesThem()
    {
        // review round 1 (F4): a decode that gave nothing was a null in the LRU — for the whole process, made the freshest
        // by every hit. Now: remembered for MissKeepMs at most, counted from the FAILURE.
        Assert.AreEqual(2 * 60 * 1000L, ChatMediaStoreRules.MissKeepMs, "a failed decode is tried again after 2 minutes at the latest");
        long keep = ChatMediaStoreRules.MissKeepMs, t = 5000000;
        ChatMediaMisses m = new ChatMediaMisses(ChatMediaStoreRules.MemoryMisses, keep);
        Assert.IsFalse(m.has("k", t), "nothing noted");
        m.note("k", t);
        Assert.IsTrue(m.has("k", t) && m.has("k", t + 1) && m.has("k", t + keep / 2), "noted: no second decode yet");
        for (long at = t; at < t + keep; at += 1000) Assert.IsTrue(m.has("k", at), "a hit every second…");
        Assert.IsTrue(m.has("k", t + keep - 1), "still held one ms before the end");
        Assert.IsFalse(m.has("k", t + keep), "…did NOT refresh it: at 2 minutes after the FAILURE it is gone");
        Assert.AreEqual(0, m.count, "the entry left the table");
        // a second note while it is held keeps the FIRST time
        m.note("k", t); m.note("k", t + keep - 10);
        Assert.IsFalse(m.has("k", t + keep), "a note of a held key does not move its time either");
        // after its time a new failure counts from then
        m.note("k", t + keep + 5);
        Assert.IsTrue(m.has("k", t + 2 * keep) && !m.has("k", t + 2 * keep + 5), "a failure after the time is over counts from itself");
        Assert.IsFalse(m.has("other", t) || m.has(null, t), "another key / no key: not held");
        m.note(null, t);
        m.note("z", t); Assert.IsFalse(m.has("z", t - 1), "a time that went back: not held (never \"held for ever\")");
        // bounded: the oldest goes
        ChatMediaMisses small = new ChatMediaMisses(3, keep);
        small.note("a", 100); small.note("b", 200); small.note("c", 300); small.note("d", 400);
        Assert.IsTrue(small.count == 3 && !small.has("a", 401) && small.has("b", 401) && small.has("c", 401) && small.has("d", 401), "over the capacity the OLDEST failure goes");
        small.note("e", 200 + keep);   // b's time is over by then: it goes, not c
        Assert.IsTrue(small.count == 3 && small.has("c", 200 + keep) && small.has("d", 200 + keep) && small.has("e", 200 + keep), "an entry whose time is over goes before a live one");
        small.clear();
        Assert.IsTrue(small.count == 0 && !small.has("d", 401), "clear empties it (a delete clears it with the LRU)");
        Assert.AreEqual(256, ChatMediaStoreRules.MemoryPeaks, "the page's peaks LRU holds 256 texts");
    }

    [TestMethod]
    public void lru_manyThreads()
    {
        ChatMediaLru<int, int> lru = new ChatMediaLru<int, int>(16);
        int wrong = 0;
        Parallel.For(0, 8, t =>
        {
            for (int i = 0; i < 2000; i++)
            {
                int k = (i * 7 + t) % 64;
                lru.put(k, k * 2);
                if (lru.tryGet(k, out int v) && v != k * 2) Interlocked.Increment(ref wrong);
            }
        });
        Assert.IsTrue(wrong == 0 && lru.count <= 16, "a key only ever gives its own value; the bound holds");
    }
}

/** The glue (Spixi/Utils/ChatMediaStore.cs) over the stubbed cache folder and wallet — the calls the app's code makes. */
[TestClass]
public class ChatMediaStoreGlueTests
{
    private sealed class Glue : IDisposable
    {
        public readonly MediaSandbox sb = new MediaSandbox();
        private readonly string? oldDir;
        private readonly WalletStorage? oldWallet;

        /** sweep = false: no orphan sweep runs (these tests keep two accounts in one root, which the app never has);
         *  true = "a new process": both parts of the sweep are owed. */
        public Glue(string? account = "AcctOne", bool sweep = false)
        {
            oldDir = FileSystem.CacheDirectory;
            oldWallet = IxianHandler.wallet;
            FileSystem.CacheDirectory = sb.parent;
            IxianHandler.wallet = account == null ? null : new WalletStorage(new Address(account));
            ChatMediaStore.harnessChats = null;
            ChatMediaStore.harnessSweepArm(sweep);
            ChatMediaStore.harnessOn = true;
        }

        public void login(string? account)
        {
            IxianHandler.wallet = account == null ? null : new WalletStorage(new Address(account));
        }

        public void Dispose()
        {
            ChatMediaStore.harnessOn = false;
            ChatMediaStore.harnessChats = null;
            ChatMediaStore.harnessSweepArm(false);
            FileSystem.CacheDirectory = oldDir!;
            IxianHandler.wallet = oldWallet;
            sb.Dispose();
        }
    }

    private static readonly Address peerA = new Address("PeerA"), peerB = new Address("PeerB");
    private static readonly byte[] id1 = Convert.FromHexString(MediaT.Id1), id2 = Convert.FromHexString(MediaT.Id2);

    private static void fill(Address chat, string idHex, int seed)
    {
        string v = MediaT.ver(MediaT.rooted("g" + seed + ".jpg"));
        long gen = ChatMediaStore.generationOf(chat);   // as the page does: read before the "decode"
        ChatMediaStore.putThumb(chat, idHex, v, MediaT.jpeg(400 + seed, seed), gen);
        ChatMediaStore.putPeaks(chat, idHex, "t|7|" + seed, MediaT.info(500 + seed, seed), gen);
        Assert.IsTrue(MediaT.same(MediaT.jpeg(400 + seed, seed), ChatMediaStore.getThumb(chat, idHex, v)), "glue: the thumbnail is kept " + seed);
        Assert.AreEqual(MediaT.info(500 + seed, seed), ChatMediaStore.getPeaks(chat, idHex, "t|7|" + seed), "glue: the peaks are kept " + seed);
    }

    private static bool hasThumb(Address chat, string idHex, int seed) => ChatMediaStore.getThumb(chat, idHex, MediaT.ver(MediaT.rooted("g" + seed + ".jpg"))) != null;
    private static bool hasPeaks(Address chat, string idHex, int seed) => ChatMediaStore.getPeaks(chat, idHex, "t|7|" + seed) != null;

    [TestMethod]
    public void glue_platformOff_withoutTheHarnessDoor_touchesNothing()
    {
        Assert.IsFalse(ChatMediaStore.platformOn, "the harness is not Android: the store is off here");
        Assert.IsFalse(ChatMediaStore.harnessOn, "…and the door is shut outside a glue test");
        using MediaSandbox sb = new MediaSandbox();
        string? oldDir = FileSystem.CacheDirectory;
        WalletStorage? oldWallet = IxianHandler.wallet;
        try
        {
            FileSystem.CacheDirectory = sb.parent;
            IxianHandler.wallet = new WalletStorage(new Address("AcctOne"));
            int reads = FileSystem.reads, asks = IxianHandler.asks;
            string v = MediaT.ver(MediaT.rooted("a.jpg"));
            ChatMediaStore.harnessSweepArm(true);   // even with a sweep owed
            ChatMediaStore.harnessChats = () => new List<string> { "PeerZ" };
            long gen = ChatMediaStore.generationOf(peerA);
            Assert.AreEqual(ChatMediaStoreRules.NoGeneration, gen, "no store here: no generation");
            int ran = 0;
            Assert.IsFalse(ChatMediaStore.ifCurrent(peerA, gen, () => ran++) || ran != 0, "…and no memory entry of the store's kind");
            ChatMediaStore.putThumb(peerA, MediaT.Id1, v, MediaT.jpeg(400, 1), gen);
            ChatMediaStore.putPeaks(peerA, MediaT.Id1, "t|1|a", MediaT.info(5, 1), gen);
            Assert.IsTrue(ChatMediaStore.getThumb(peerA, MediaT.Id1, v) == null && ChatMediaStore.getPeaks(peerA, MediaT.Id1, "t|1|a") == null, "every get is a miss");
            Assert.IsTrue(ChatMediaStore.thumbKeyOf(peerA, MediaT.Id1, v) == null && ChatMediaStore.peaksKeyOf(peerA, MediaT.Id1, v) == null, "no memory key: the caller keeps the old path");
            Directory.CreateDirectory(Path.Combine(sb.root, "0123456789abcdef", "0123456789abcdef"));
            File.WriteAllText(Path.Combine(sb.root, "x"), "x");
            File.WriteAllText(Path.Combine(sb.root, "0123456789abcdef", "0123456789abcdef", new string('a', 64) + ".t1"), "x");
            ChatMediaStore.deleteMessage(peerA, id1); ChatMediaStore.deleteChat(peerA); ChatMediaStore.deleteSource(MediaT.rooted("a.jpg")); ChatMediaStore.wipe(); ChatMediaStore.wipeThumbs();
            Assert.IsTrue(File.Exists(Path.Combine(sb.root, "0123456789abcdef", "0123456789abcdef", new string('a', 64) + ".t1")), "no sweep, no thumbnail wipe either");
            Assert.AreEqual(0, ChatMediaStore.deleteSourceNow(MediaT.rooted("a.jpg")), "no scan");
            Assert.IsTrue(File.Exists(Path.Combine(sb.root, "x")), "Windows / iOS / Mac: no member touches the disk — even the wipe");
            Assert.IsTrue(FileSystem.reads == reads && IxianHandler.asks == asks, "…nor reads the cache folder or the wallet");
        }
        finally
        {
            FileSystem.CacheDirectory = oldDir!;
            IxianHandler.wallet = oldWallet;
            ChatMediaStore.harnessChats = null;
            ChatMediaStore.harnessSweepArm(false);
        }
    }

    [TestMethod]
    public void glue_rootIsTheCacheFoldersSpixiMedia1()
    {
        using Glue g = new Glue();
        fill(peerA, MediaT.Id1, 1);
        string[] files = g.sb.files();
        Assert.AreEqual(2, files.Length, "two files");
        Assert.IsTrue(files.All(f => f.StartsWith(Path.Combine(g.sb.parent, "spixi-media1") + Path.DirectorySeparatorChar, StringComparison.Ordinal)), "under <CacheDirectory>/spixi-media1");
        Assert.IsTrue(files.All(f => f.Contains(Path.DirectorySeparatorChar + ChatMediaStoreRules.accountFolderOf("AcctOne") + Path.DirectorySeparatorChar)), "under the own primary address's folder");
        Assert.IsFalse(files.Any(f => f.Contains("AcctOne") || f.Contains("PeerA") || f.Contains(MediaT.Id1)), "no address or id as text");
    }

    [TestMethod]
    public void glue_noWallet_everyCallIsAMissOrANoOp()
    {
        using Glue g = new Glue(null);
        string v = MediaT.ver(MediaT.rooted("a.jpg"));
        long gen = ChatMediaStore.generationOf(peerA);
        Assert.AreEqual(ChatMediaStoreRules.NoGeneration, gen, "no wallet: no generation");
        Assert.IsFalse(ChatMediaStore.ifCurrent(peerA, gen, () => { }), "no wallet: no memory entry");
        ChatMediaStore.putThumb(peerA, MediaT.Id1, v, MediaT.jpeg(400, 1), gen);
        ChatMediaStore.putPeaks(peerA, MediaT.Id1, "t|1|a", MediaT.info(5, 1), gen);
        Assert.IsTrue(ChatMediaStore.getThumb(peerA, MediaT.Id1, v) == null && ChatMediaStore.getPeaks(peerA, MediaT.Id1, "t|1|a") == null, "no wallet: a miss");
        Assert.IsTrue(ChatMediaStore.thumbKeyOf(peerA, MediaT.Id1, v) == null, "no wallet: no memory key");
        ChatMediaStore.deleteMessage(peerA, id1); ChatMediaStore.deleteChat(peerA);
        Assert.AreEqual(0, g.sb.files().Length, "nothing written");
        g.login("AcctOne");
        ChatMediaStore.putThumb(peerA, MediaT.Id1, v, MediaT.jpeg(400, 1), gen);
        Assert.AreEqual(0, g.sb.files().Length, "a generation read with no wallet is refused when a wallet is there later");
        g.login(null);
        ChatMediaStore.putThumb(null, MediaT.Id1, v, MediaT.jpeg(400, 1), 1); ChatMediaStore.deleteMessage(null, null); ChatMediaStore.deleteChat(null); ChatMediaStore.deleteSource(null);
        Assert.IsTrue(ChatMediaStore.getThumb(null, MediaT.Id1, v) == null, "null arguments: no throw");
    }

    [TestMethod]
    public void glue_anotherAccount_neverSeesTheFirstAccountsMedia()
    {
        using Glue g = new Glue("AcctOne");
        fill(peerA, MediaT.Id1, 1);
        string k1 = ChatMediaStore.thumbKeyOf(peerA, MediaT.Id1, "v")!;
        g.login("AcctTwo");   // a restored OTHER account on the same install
        Assert.IsFalse(hasThumb(peerA, MediaT.Id1, 1) || hasPeaks(peerA, MediaT.Id1, 1), "account two: a miss for the same chat, id and file");
        Assert.IsTrue(ChatMediaStore.thumbKeyOf(peerA, MediaT.Id1, "v") != k1, "…and another memory key: a memory cache cannot serve it either");
        fill(peerA, MediaT.Id1, 2);
        g.login("AcctOne");
        Assert.IsTrue(hasThumb(peerA, MediaT.Id1, 1) && !hasThumb(peerA, MediaT.Id1, 2), "account one reads its own, never account two's");
    }

    [TestMethod]
    public void glue_getPeaks_givesExactlyThePutText_andRefusesABadOne()
    {
        using Glue g = new Glue();
        string info = MediaT.info(2980, 3);
        long gen = ChatMediaStore.generationOf(peerA);
        ChatMediaStore.putPeaks(peerA, MediaT.Id1, "t|2|x", info, gen);
        Assert.AreEqual(info, ChatMediaStore.getPeaks(peerA, MediaT.Id1, "t|2|x"), "the same text");
        ChatMediaStore.putPeaks(peerA, MediaT.Id2, "t|2|x", "12|1,2,3", gen);
        ChatMediaStore.putPeaks(peerA, MediaT.Id2, "t|2|x", null, gen);
        Assert.IsTrue(ChatMediaStore.getPeaks(peerA, MediaT.Id2, "t|2|x") == null && g.sb.files().Length == 1, "a text that is not today's shape is never written");
    }

    // —— the delete paths of docs/contract-photo1a.md § 4.4: what each store call removes. The CALL SITES sit in MAUI files
    // (SingleChatPage / UIHelpers / SContacts / ContactDetails / SettingsPage / DownloadsPage / LaunchPage) — a source pin. ——

    [TestMethod]
    public void deletePath_messageDeleted_byItsIdBytes()
    {
        using Glue g = new Glue();
        fill(peerA, MediaT.Id1, 1); fill(peerA, MediaT.Id2, 2); fill(peerB, MediaT.Id1, 3);
        // the id text the puts used is Crypto.hashToString(id): two lower-case hex digits per byte (Core Crypto.cs:35)
        StringBuilder sbHex = new StringBuilder();
        foreach (byte b in id1) sbHex.Append(b.ToString("x2"));
        Assert.AreEqual(MediaT.Id1, sbHex.ToString(), "the test's id text is hashToString's");
        Assert.AreEqual(MediaT.Id1, ChatMediaStoreRules.idHexOfBytes(id1), "the glue's id text is the same");
        long before = ChatMediaStore.generationOf(peerA);   // a decode of the message is running
        ChatMediaStore.deleteMessage(peerA, id1);   // SingleChatPage.deleteMessage (+ the bot-room report and my own bot-room delete, F2) · UIHelpers.deleteMessage
        Assert.IsFalse(hasThumb(peerA, MediaT.Id1, 1) || hasPeaks(peerA, MediaT.Id1, 1), "that message's two files are gone");
        Assert.IsTrue(hasThumb(peerA, MediaT.Id2, 2) && hasPeaks(peerA, MediaT.Id2, 2) && hasThumb(peerB, MediaT.Id1, 3) && hasPeaks(peerB, MediaT.Id1, 3), "nothing else went");
        Assert.AreEqual(4, g.sb.files().Length, "exactly two files went");
        ChatMediaStore.putThumb(peerA, MediaT.Id1, MediaT.ver(MediaT.rooted("g1.jpg")), MediaT.jpeg(401, 1), before);
        Assert.IsFalse(hasThumb(peerA, MediaT.Id1, 1), "a decode that finishes after the delete is not put back");
        ChatMediaStore.putThumb(peerA, MediaT.Id1, MediaT.ver(MediaT.rooted("g1.jpg")), MediaT.jpeg(401, 1), ChatMediaStore.generationOf(peerA));
        Assert.IsFalse(hasThumb(peerA, MediaT.Id1, 1), "…nor one that only starts after it (the message is remembered)");
        ChatMediaStore.deleteMessage(peerA, null); ChatMediaStore.deleteMessage(peerA, new byte[0]); ChatMediaStore.deleteMessage(peerA, new byte[100]);
        Assert.AreEqual(4, g.sb.files().Length, "no id / an over-long id: nothing happens");
    }

    [TestMethod]
    public void deletePath_historyDeleted_contactRemoved_groupLeft_contactPurged()
    {
        using Glue g = new Glue();
        fill(peerA, MediaT.Id1, 1); fill(peerA, MediaT.Id2, 2); fill(peerB, MediaT.Id1, 3);
        long before = ChatMediaStore.generationOf(peerA);   // a decode of one of its photos is running
        ChatMediaStore.deleteChat(peerA);   // SContacts.removeHistory / removeContact / leaveGroup / purgeFiles · ContactDetails.onRemoveHistory · SingleChatPage ixian:undorequest (F2)
        Assert.IsFalse(hasThumb(peerA, MediaT.Id1, 1) || hasPeaks(peerA, MediaT.Id1, 1) || hasThumb(peerA, MediaT.Id2, 2) || hasPeaks(peerA, MediaT.Id2, 2), "every file of that chat is gone");
        Assert.IsTrue(hasThumb(peerB, MediaT.Id1, 3) && hasPeaks(peerB, MediaT.Id1, 3), "another chat keeps its files");
        Assert.AreEqual(2, g.sb.files().Length, "exactly the chat's four files went");
        ChatMediaStore.putThumb(peerA, "ab", MediaT.ver(MediaT.rooted("late.jpg")), MediaT.jpeg(400, 9), before);
        ChatMediaStore.putPeaks(peerA, "ab", "t|7|9", MediaT.info(509, 9), before);
        Assert.AreEqual(2, g.sb.files().Length, "a decode that finishes after the delete is not put back — thumbnail or peaks");
    }

    [TestMethod]
    public void deletePath_fileDeletedFromTheDevice_byItsPath()
    {
        using Glue g = new Glue();
        fill(peerA, MediaT.Id1, 1); fill(peerB, MediaT.Id2, 2);
        Assert.AreEqual(1, ChatMediaStore.deleteSourceNow(MediaT.rooted("g1.jpg")), "the Downloads list deleted g1.jpg: its preview goes, no message id needed");   // SettingsPage ixian:deleteDownload · DownloadsPage ixian:delete
        Assert.IsFalse(hasThumb(peerA, MediaT.Id1, 1), "gone");
        Assert.IsTrue(hasPeaks(peerA, MediaT.Id1, 1) && hasThumb(peerB, MediaT.Id2, 2) && hasPeaks(peerB, MediaT.Id2, 2), "nothing else went");
        ChatMediaStore.deleteSource(MediaT.rooted("g2.jpg"));   // the app's call: the scan runs on a pool thread
        for (int i = 0; i < 200 && g.sb.files().Length != 2; i++) Thread.Sleep(10);
        Assert.AreEqual(2, g.sb.files().Length, "the background scan removed g2.jpg's preview");
        Assert.IsTrue(hasPeaks(peerA, MediaT.Id1, 1) && hasPeaks(peerB, MediaT.Id2, 2), "the two inline peaks stay");
    }

    [TestMethod]
    public void deletePath_fileDeletedInChatInfo_theMessageStays_aReDownloadIsKeptAgain()
    {
        // review round 1 (F6): chat info "Delete from this device" deletes the FILE; the message stays. The store call is
        // deleteSource(path) — with deleteMessage the message was remembered as deleted and its re-download was never
        // kept again in this process.
        using Glue g = new Glue();
        fill(peerA, MediaT.Id1, 1);
        string path = MediaT.rooted("g1.jpg");
        long running = ChatMediaStore.generationOf(peerA);
        Assert.AreEqual(1, ChatMediaStore.deleteSourceNow(path), "the file left the device: its preview goes");   // ContactDetails ixian:sharedDeleteLocal
        Assert.IsFalse(hasThumb(peerA, MediaT.Id1, 1), "gone");
        Assert.IsTrue(hasPeaks(peerA, MediaT.Id1, 1), "the message's inline peaks (no file) stay: the message was not deleted");
        ChatMediaStore.putThumb(peerA, MediaT.Id1, MediaT.ver(path), MediaT.jpeg(401, 1), running);
        Assert.IsFalse(hasThumb(peerA, MediaT.Id1, 1), "a decode of the deleted file that ends now is not put back");
        // the user downloads the file again: the same message, the same path, a new write time
        string again = MediaT.ver(path, 1000, 638000000000000777L);
        ChatMediaStore.putThumb(peerA, MediaT.Id1, again, MediaT.jpeg(402, 1), ChatMediaStore.generationOf(peerA));
        Assert.IsTrue(MediaT.same(MediaT.jpeg(402, 1), ChatMediaStore.getThumb(peerA, MediaT.Id1, again)), "the re-download's preview is kept again");
    }

    [TestMethod]
    public void deletePath_allHistories_accountWipe_accountRestore()
    {
        using Glue g = new Glue("AcctOne");
        fill(peerA, MediaT.Id1, 1);
        g.login("AcctTwo");
        fill(peerB, MediaT.Id2, 2);
        File.WriteAllText(Path.Combine(g.sb.parent, "other-cache-file"), "x");
        g.login(null);   // the wipe runs after the wallet is gone; the restore before one is loaded
        g.login("AcctOne");
        long before = ChatMediaStore.generationOf(peerA);   // a decode is running when the wipe comes
        g.login(null);
        ChatMediaStore.wipe();   // SettingsPage.wipeEverything / onDeleteHistory / onDeleteDownloads · LaunchPage restore · LaunchPage create (F2)
        Assert.IsFalse(Directory.Exists(g.sb.root), "the whole store is gone — both accounts' folders — with no wallet loaded");
        Assert.IsTrue(File.Exists(Path.Combine(g.sb.parent, "other-cache-file")), "the rest of the cache folder is untouched");
        g.login("AcctOne");
        Assert.IsFalse(hasThumb(peerA, MediaT.Id1, 1) || hasPeaks(peerA, MediaT.Id1, 1), "nothing of the old account is served");
        ChatMediaStore.putThumb(peerA, MediaT.Id1, MediaT.ver(MediaT.rooted("g1.jpg")), MediaT.jpeg(401, 1), before);
        Assert.IsFalse(Directory.Exists(g.sb.root), "a decode that finishes after the wipe is not put back — however late");
        fill(peerA, MediaT.Id1, 4);   // …and the restored / new account uses the store at once (no waiting time)
        ChatMediaStore.wipe(); ChatMediaStore.wipe();
        Assert.IsFalse(Directory.Exists(g.sb.root), "wipe twice: no throw");
    }

    [TestMethod]
    public void glue_everyDeleteClearsTheRegisteredMemory()
    {
        using Glue g = new Glue();
        int clears = 0;
        ChatMediaLru<string, byte[]?> lru = new ChatMediaLru<string, byte[]?>(4, StringComparer.Ordinal);
        ChatMediaStore.onDelete(() => { clears++; lru.clear(); });
        ChatMediaStore.onDelete(() => { throw new InvalidOperationException("a clear that throws must not stop a delete"); });
        ChatMediaStore.onDelete(null!);
        void arm() { lru.put("k", new byte[] { 1 }); }
        arm(); ChatMediaStore.deleteMessage(peerA, id1); Assert.IsTrue(clears == 1 && lru.count == 0, "deleteMessage clears the memory");
        arm(); ChatMediaStore.deleteChat(peerA); Assert.IsTrue(clears == 2 && lru.count == 0, "deleteChat clears the memory");
        arm(); ChatMediaStore.deleteSourceNow(MediaT.rooted("a.jpg")); Assert.IsTrue(clears == 3 && lru.count == 0, "deleteSource clears the memory");
        arm(); ChatMediaStore.deleteSource(MediaT.rooted("a.jpg")); Assert.IsTrue(clears == 4 && lru.count == 0, "…also the app's own (background) call, at once");
        arm(); ChatMediaStore.wipe(); Assert.IsTrue(clears == 5 && lru.count == 0, "wipe clears the memory");
        arm(); ChatMediaStore.wipeThumbs(); Assert.IsTrue(clears == 6 && lru.count == 0, "the thumbnail wipe clears the memory");
        g.login(null);
        arm(); ChatMediaStore.deleteChat(peerA); Assert.IsTrue(clears == 7 && lru.count == 0, "…with no wallet too");
    }

    [TestMethod]
    public void glue_aDecodeThatEndsAfterADelete_keepsNothing_onDiskOrInMemory()
    {
        // review round 1 (F1 + reader n1) — the page's own sequence (chatThumbFor / voiceInfoFor): read the generation,
        // "decode", then ifCurrent(memory put) and the disk put. Whatever delete ran in between, nothing is kept.
        using Glue g = new Glue();
        ChatMediaLru<string, byte[]> thumbs = new ChatMediaLru<string, byte[]>(8, StringComparer.Ordinal);
        ChatMediaLru<string, string> peaks = new ChatMediaLru<string, string>(8, StringComparer.Ordinal);
        ChatMediaStore.onDelete(thumbs.clear);
        ChatMediaStore.onDelete(peaks.clear);
        string src = MediaT.rooted("late.jpg"), v = MediaT.ver(src);
        void decodeEnds(long gen)
        {
            if (ChatMediaStore.ifCurrent(peerA, gen, () => thumbs.put("k", MediaT.jpeg(400, 1)))) ChatMediaStore.putThumb(peerA, MediaT.Id1, v, MediaT.jpeg(400, 1), gen);
            if (ChatMediaStore.ifCurrent(peerA, gen, () => peaks.put("k", MediaT.info(5, 1)))) ChatMediaStore.putPeaks(peerA, MediaT.Id1, "t|1|a", MediaT.info(5, 1), gen);
        }
        decodeEnds(ChatMediaStore.generationOf(peerA));
        Assert.IsTrue(thumbs.count == 1 && peaks.count == 1 && g.sb.files().Length == 2, "no delete: kept in memory and on disk");
        ChatMediaStore.wipe();
        Assert.IsTrue(thumbs.count == 0 && peaks.count == 0 && g.sb.files().Length == 0, "a delete clears both memory caches (the peaks too) and the disk");
        foreach (KeyValuePair<string, Action> del in new[] {
            new KeyValuePair<string, Action>("deleteMessage", () => ChatMediaStore.deleteMessage(peerA, id2)),
            new KeyValuePair<string, Action>("deleteChat", () => ChatMediaStore.deleteChat(peerA)),
            new KeyValuePair<string, Action>("deleteSource", () => ChatMediaStore.deleteSource(src)),
            new KeyValuePair<string, Action>("deleteSource (another file)", () => ChatMediaStore.deleteSourceNow(MediaT.rooted("else.jpg"))),
            new KeyValuePair<string, Action>("wipe", () => ChatMediaStore.wipe()),
            new KeyValuePair<string, Action>("wipeThumbs", () => ChatMediaStore.wipeThumbs()) })
        {
            long gen = ChatMediaStore.generationOf(peerA);   // the decode starts
            del.Value();                                       // …the delete runs on another thread
            decodeEnds(gen);                                   // …the decode ends
            Assert.IsTrue(thumbs.count == 0 && peaks.count == 0, del.Key + ": nothing of it is in memory");
            Assert.AreEqual(0, g.sb.files().Length, del.Key + ": nothing of it is at rest");
            decodeEnds(ChatMediaStore.generationOf(peerA));
            Assert.IsTrue(thumbs.count == 1 && peaks.count == 1 && g.sb.files().Length == 2, del.Key + ": a decode that starts after it is kept");
            ChatMediaStore.wipe();
        }
    }

    [TestMethod]
    public void glue_photoPreviewsOff_removesEveryKeptThumbnail()
    {
        // review round 1 (F3): SettingsPage `ixian:photoPreviews:` OFF → ChatMediaStore.wipeThumbs()
        using Glue g = new Glue("AcctOne");
        fill(peerA, MediaT.Id1, 1); fill(peerB, MediaT.Id2, 2);
        File.WriteAllText(Path.Combine(g.sb.parent, "other.t1"), "x");
        g.login(null);   // needs no wallet
        ChatMediaStore.wipeThumbs();
        g.login("AcctOne");
        Assert.IsFalse(hasThumb(peerA, MediaT.Id1, 1) || hasThumb(peerB, MediaT.Id2, 2), "no kept thumbnail is left");
        Assert.IsTrue(hasPeaks(peerA, MediaT.Id1, 1) && hasPeaks(peerB, MediaT.Id2, 2), "the peaks stay (a waveform is not a photo preview)");
        Assert.IsTrue(g.sb.files().Length == 3 && File.Exists(Path.Combine(g.sb.parent, "other.t1")), "two peaks files + the file that is not ours");
        fill(peerA, MediaT.Id1, 3);   // the switch is ON again: thumbnails are kept as usual
    }

    [TestMethod]
    public void glue_orphanSweep_oncePerProcess_afterTheWalletAndTheContactList()
    {
        // review round 1 (F2): what no delete path named (a request declined on the Chats list, a dissolved room, a
        // heal, an unseed, an older account's folder) is swept — once per process, never from an empty contact list.
        using Glue g = new Glue("AcctOld", sweep: false);
        fill(peerA, MediaT.Id1, 1);                       // an older account's folder
        g.login("AcctOne");
        Address declined = new Address("Declined"), dissolved = new Address("Dissolved");
        fill(peerA, MediaT.Id1, 2); fill(peerB, MediaT.Id1, 3); fill(declined, MediaT.Id1, 4); fill(dissolved, MediaT.Id1, 5);
        Assert.AreEqual(10, g.sb.files().Length, "five chats' files, two accounts");
        string oldAcct = Path.Combine(g.sb.root, ChatMediaStoreRules.accountFolderOf("AcctOld"));
        // 1. "a new process", no wallet yet: nothing runs
        ChatMediaStore.harnessSweepArm(true);
        ChatMediaStore.harnessChats = () => new List<string> { "PeerA", "PeerB" };
        g.login(null);
        ChatMediaStore.getThumb(peerA, "ee", "v"); ChatMediaStore.deleteChat(new Address("Nobody")); ChatMediaStore.generationOf(peerA);
        Assert.AreEqual(10, g.sb.files().Length, "no wallet: no sweep (the account is not known)");
        // 2. the wallet is there, the contact list is NOT loaded: only the other accounts' folders go
        ChatMediaStore.harnessChats = null;
        g.login("AcctOne");
        ChatMediaStore.generationOf(peerA);
        Assert.IsFalse(Directory.Exists(oldAcct), "the older account's folder is swept at the first store call with a wallet");
        Assert.AreEqual(8, g.sb.files().Length, "…and no chat of this account (the contact list is not loaded)");
        // 3. the list is loaded but EMPTY (a load that failed): still no chat is swept
        ChatMediaStore.harnessChats = () => new List<string>();
        ChatMediaStore.getThumb(peerA, "ee", "v"); ChatMediaStore.thumbKeyOf(peerA, MediaT.Id1, "v"); ChatMediaStore.generationOf(peerB);
        Assert.AreEqual(8, g.sb.files().Length, "an empty contact list never empties the store");
        // 4. the list is loaded: the chats the app does not have go — a running decode of one is refused
        long running = ChatMediaStore.generationOf(declined);
        ChatMediaLru<string, byte[]> lru = new ChatMediaLru<string, byte[]>(4, StringComparer.Ordinal);
        ChatMediaStore.onDelete(lru.clear);
        lru.put("k", new byte[] { 1 });
        ChatMediaStore.harnessChats = () => new List<string> { "PeerA", "PeerB", "NewContact" };
        Assert.IsTrue(hasThumb(peerA, MediaT.Id1, 2), "any store call is the safe point (this get)");
        Assert.IsTrue(hasPeaks(peerA, MediaT.Id1, 2) && hasThumb(peerB, MediaT.Id1, 3) && hasPeaks(peerB, MediaT.Id1, 3), "the chats the app has keep everything");
        Assert.AreEqual(4, g.sb.files().Length, "the declined request's and the dissolved room's folders are gone");
        Assert.AreEqual(0, lru.count, "the sweep cleared the memory caches");
        ChatMediaStore.putThumb(declined, MediaT.Id2, MediaT.ver(MediaT.rooted("g4.jpg")), MediaT.jpeg(404, 4), running);
        Assert.AreEqual(4, g.sb.files().Length, "a decode of a swept chat that ends now is not put back");
        // 5. once per process: a folder that turns orphan later waits for its delete path (or the next start)
        ChatMediaStore.harnessChats = () => new List<string> { "PeerA" };
        g.login("AcctOld"); fill(peerA, MediaT.Id1, 6); g.login("AcctOne");
        ChatMediaStore.getThumb(peerA, "ee", "v"); ChatMediaStore.generationOf(peerB);
        Assert.IsTrue(hasThumb(peerB, MediaT.Id1, 3) && Directory.Exists(oldAcct), "no second sweep in this process (chat B and the other account's new folder stay)");
        // 6. the next process sweeps again
        ChatMediaStore.harnessSweepArm(true);
        ChatMediaStore.generationOf(peerA);
        Assert.IsTrue(!hasThumb(peerB, MediaT.Id1, 3) && !Directory.Exists(oldAcct) && hasThumb(peerA, MediaT.Id1, 2), "…with the list it finds then");
    }

    [TestMethod]
    public void glue_orphanSweep_runsAgainWhenAContactLeftTheList()
    {
        // review round 2 (G3 / F-3): a removal in a file this batch may not edit (the Chats list's decline, Core, a heal,
        // the dev unseed) drops the contact count — the chat part of the sweep is owed again at the next store call.
        using Glue g = new Glue("AcctOne", sweep: true);
        Address c = new Address("PeerC");
        List<string> list = new List<string> { "PeerA", "PeerB", "PeerC" };
        ChatMediaStore.harnessChats = () => new List<string>(list);
        fill(peerA, MediaT.Id1, 1); fill(peerB, MediaT.Id1, 2); fill(c, MediaT.Id1, 3);   // the first call ran the sweep: nothing to take
        Assert.AreEqual(6, g.sb.files().Length, "three chats");
        list.Remove("PeerC");   // declined on the Chats list: no store call names it
        long running = ChatMediaStore.generationOf(c);   // …a decode of its photo starts — and this store call is the safe point
        Assert.IsFalse(hasThumb(c, MediaT.Id1, 3) || hasPeaks(c, MediaT.Id1, 3), "the count dropped 3 → 2: its folder is swept at the next store call, not at the next start");
        Assert.IsTrue(hasThumb(peerA, MediaT.Id1, 1) && hasThumb(peerB, MediaT.Id1, 2) && g.sb.files().Length == 4, "the others stay");
        // a contact that only JOINS: the sweep that follows finds nothing to take
        // (review round 6, m-2: one out + one in, and the drop to NO contact, are swept now — the three tests below; this
        // test said "the count did not drop: B waits" and "the list went empty: nothing is swept", the two findings)
        list.Add("PeerD");
        ChatMediaStore.generationOf(peerA);
        Assert.IsTrue(hasThumb(peerA, MediaT.Id1, 1) && hasThumb(peerB, MediaT.Id1, 2) && g.sb.files().Length == 4, "a contact joined: nothing is taken");
        // …never from a list that is NOT LOADED — and what left meanwhile goes when the list is back
        ChatMediaStore.harnessChats = null;
        ChatMediaStore.generationOf(peerA);
        Assert.IsTrue(hasThumb(peerA, MediaT.Id1, 1) && hasThumb(peerB, MediaT.Id1, 2), "the list is not loaded: nothing is swept");
        list.Remove("PeerB");
        ChatMediaStore.generationOf(peerA); ChatMediaStore.getThumb(peerA, "ee", "v");
        Assert.IsTrue(hasThumb(peerB, MediaT.Id1, 2), "…still not loaded: B's folder waits");
        ChatMediaStore.harnessChats = () => new List<string>(list);
        ChatMediaStore.generationOf(peerA);
        Assert.IsTrue(!hasThumb(peerB, MediaT.Id1, 2) && hasThumb(peerA, MediaT.Id1, 1), "the list is loaded again, without B: swept at this store call");
    }

    [TestMethod]
    public void glue_orphanSweep_oneOutOneIn_theCountStaysEqual_theOneThatLeftIsSwept()
    {
        // review round 6 (m-2): the re-arm compared a COUNT — a removal plus an addition between two store calls left it equal
        using Glue g = new Glue("AcctOne", sweep: true);
        Address c = new Address("PeerC");
        List<string> list = new List<string> { "PeerA", "PeerB", "PeerC" };
        ChatMediaStore.harnessChats = () => new List<string>(list);
        fill(peerA, MediaT.Id1, 1); fill(peerB, MediaT.Id1, 2); fill(c, MediaT.Id1, 3);
        ChatMediaLru<string, byte[]> lru = new ChatMediaLru<string, byte[]>(4, StringComparer.Ordinal);
        ChatMediaStore.onDelete(lru.clear);
        lru.put("k", new byte[] { 1 });
        list.Reverse();   // the same contacts in another order (Core sorts its list again): nothing moved
        ChatMediaStore.generationOf(peerA);
        Assert.IsTrue(g.sb.files().Length == 6 && lru.count == 1, "the same set in another order: nothing is taken, the memory stays");
        long running = ChatMediaStore.generationOf(peerB);   // a decode of B's photo is running
        list.Remove("PeerB"); list.Add("PeerE");             // B declined on the Chats list, E's request arrived — no store call in between
        Assert.AreEqual(3, list.Count, "the premise: the count is what it was");
        ChatMediaStore.generationOf(peerA);
        Assert.IsFalse(hasThumb(peerB, MediaT.Id1, 2) || hasPeaks(peerB, MediaT.Id1, 2), "B left the list: its folder is swept at the next store call, with the count unchanged");
        Assert.IsTrue(hasThumb(peerA, MediaT.Id1, 1) && hasThumb(c, MediaT.Id1, 3) && g.sb.files().Length == 4, "A and C keep everything");
        Assert.AreEqual(0, lru.count, "the sweep cleared the memory caches");
        ChatMediaStore.putThumb(peerB, MediaT.Id2, MediaT.ver(MediaT.rooted("g2.jpg")), MediaT.jpeg(402, 2), running);
        Assert.AreEqual(4, g.sb.files().Length, "B's running decode is not put back");
        list.Remove("PeerA"); list.Add("PeerB");   // again, with a name that was there before
        ChatMediaStore.generationOf(c);
        Assert.IsTrue(!hasThumb(peerA, MediaT.Id1, 1) && hasThumb(c, MediaT.Id1, 3) && g.sb.files().Length == 2, "the same again: A out, B in — A is swept");
    }

    [TestMethod]
    public void glue_orphanSweep_theLastContactLeft_aProvenEmptyListSweeps()
    {
        // review round 6 (m-2): N → 0 re-armed nothing (the take needed a count above 0; a later 0 → M is no drop): the
        // last contact's orphan folder waited for the next process. This process READ the list with contacts in it,
        // for this account — so "loaded and empty" now is the list as it is.
        using Glue g = new Glue("AcctOne", sweep: true);
        List<string> list = new List<string> { "PeerA", "PeerB" };
        ChatMediaStore.harnessChats = () => new List<string>(list);
        fill(peerA, MediaT.Id1, 1); fill(peerB, MediaT.Id1, 2);
        list.Remove("PeerB");
        ChatMediaStore.generationOf(peerA);
        Assert.IsTrue(!hasThumb(peerB, MediaT.Id1, 2) && hasThumb(peerA, MediaT.Id1, 1), "2 → 1: B is swept");
        long running = ChatMediaStore.generationOf(peerA);
        list.Clear();   // the last contact is declined on the Chats list: no store call names it
        ChatMediaStore.thumbKeyOf(peerB, MediaT.Id1, "v");   // any store call is the safe point
        Assert.IsFalse(hasThumb(peerA, MediaT.Id1, 1) || hasPeaks(peerA, MediaT.Id1, 1), "1 → 0: the last contact's folder is swept in THIS process");
        Assert.AreEqual(0, g.sb.storeFiles().Length, "nothing of the account's chats is at rest");
        ChatMediaStore.putThumb(peerA, MediaT.Id2, MediaT.ver(MediaT.rooted("g1.jpg")), MediaT.jpeg(401, 1), running);
        Assert.AreEqual(0, g.sb.storeFiles().Length, "a decode of it that ends now is not put back");
        // straight from several to none
        list.AddRange(new[] { "PeerA", "PeerB" });
        fill(peerA, MediaT.Id1, 3); fill(peerB, MediaT.Id1, 4);
        list.Clear();
        ChatMediaStore.generationOf(peerA);
        Assert.AreEqual(0, g.sb.storeFiles().Length, "2 → 0 in one step: both folders are swept");
        // the bit stays owed ACROSS a stretch in which the list is not loaded
        list.AddRange(new[] { "PeerA" });
        fill(peerA, MediaT.Id1, 5);
        ChatMediaStore.harnessChats = null;   // not loaded (a node restart)…
        ChatMediaStore.generationOf(peerA);
        Assert.IsTrue(hasThumb(peerA, MediaT.Id1, 5), "…nothing is swept from a list that is not loaded");
        list.Clear();
        ChatMediaStore.harnessChats = () => new List<string>(list);   // …and it comes back loaded and empty
        ChatMediaStore.generationOf(peerA);
        Assert.IsFalse(hasThumb(peerA, MediaT.Id1, 5), "loaded again and empty: swept");
    }

    [TestMethod]
    public void glue_orphanSweep_anEmptyListThatIsNotProven_neverSweepsAChat()
    {
        // review round 6 (m-2): an empty list sweeps ONLY when this process read the list with a contact in it, for this
        // account. Never: a list that is not loaded · an empty list in a process that read no contact (a load that
        // failed, #565 / #584) · a contact read for ANOTHER account.
        using Glue g = new Glue("AcctOne", sweep: false);
        fill(peerA, MediaT.Id1, 1); fill(peerB, MediaT.Id1, 2);   // what an earlier run kept
        // 1. "a new process"; the list is loaded and EMPTY from its first store call on
        ChatMediaStore.harnessSweepArm(true);
        ChatMediaStore.harnessChats = () => new List<string>();
        for (int i = 0; i < 6; i++) { ChatMediaStore.generationOf(peerA); ChatMediaStore.getThumb(peerA, "ee", "v"); ChatMediaStore.thumbKeyOf(peerB, MediaT.Id1, "v"); }
        Assert.IsTrue(hasThumb(peerA, MediaT.Id1, 1) && hasThumb(peerB, MediaT.Id1, 2) && g.sb.files().Length == 4, "an empty list that was never read with a contact in it sweeps nothing, however often it is seen");
        // 2. not loaded → loaded-empty → not loaded: still nothing
        ChatMediaStore.harnessChats = null;
        ChatMediaStore.generationOf(peerA);
        ChatMediaStore.harnessChats = () => new List<string>();
        ChatMediaStore.generationOf(peerA);
        Assert.AreEqual(4, g.sb.files().Length, "not loaded, then empty again: nothing");
        // 3. a contact was read — for ANOTHER account (a restore loads another wallet in the same process)
        g.login("AcctOld");
        ChatMediaStore.harnessChats = () => new List<string> { "PeerA" };
        ChatMediaStore.generationOf(peerA);   // account OLD's store call reads the list with a contact in it
        g.login("AcctOne");
        ChatMediaStore.harnessChats = () => new List<string>();
        ChatMediaStore.generationOf(peerA); ChatMediaStore.generationOf(peerB);
        Assert.IsTrue(hasThumb(peerA, MediaT.Id1, 1) && hasThumb(peerB, MediaT.Id1, 2), "a contact read for another account proves nothing about this one's empty list");
        // 4. the list gets its contacts: the chat part (still owed) runs as it always did
        ChatMediaStore.harnessChats = () => new List<string> { "PeerA" };
        ChatMediaStore.generationOf(peerA);
        Assert.IsTrue(hasThumb(peerA, MediaT.Id1, 1) && !hasThumb(peerB, MediaT.Id1, 2), "loaded with a contact: the orphan goes, the contact's chat stays");
        // 5. …and from here an empty list IS proven for this account
        ChatMediaStore.harnessChats = () => new List<string>();
        ChatMediaStore.generationOf(peerA);
        Assert.IsFalse(hasThumb(peerA, MediaT.Id1, 1), "the list was read with a contact in it: empty now = the contact left");
    }

    [TestMethod]
    public void glue_orphanSweep_theAccountChangesBetweenTheTakeAndTheRun()
    {
        // review round 2 (G4): the sweep is handed to "later" with the engine of the account that asked. When another
        // account is loaded before it runs, nothing is swept with the old engine (it would take the NEW account's folder).
        using Glue g = new Glue("AcctOne");
        fill(peerA, MediaT.Id1, 1);
        g.login("AcctTwo");
        fill(peerA, MediaT.Id1, 2);
        string one = Path.Combine(g.sb.root, ChatMediaStoreRules.accountFolderOf("AcctOne")), two = Path.Combine(g.sb.root, ChatMediaStoreRules.accountFolderOf("AcctTwo"));
        List<Action> queued = new List<Action>();
        try
        {
            ChatMediaStoreRules.harnessLater = a => queued.Add(a);
            g.login("AcctOne");
            ChatMediaStore.harnessSweepArm(true);
            ChatMediaStore.generationOf(peerA);   // account ONE's store call takes the sweep
            Assert.AreEqual(1, queued.Count, "the sweep is queued");
            g.login("AcctTwo");                   // …a restore loads account TWO before it runs
            ChatMediaStoreRules.harnessLater = MediaT.inline;
            queued[0]();
            Assert.IsTrue(Directory.Exists(two) && Directory.Exists(one), "the queued sweep swept nothing with account ONE's engine — account TWO's folder is there");
            ChatMediaStore.generationOf(peerA);   // account TWO's own store call: the sweep was given back, it runs now
            Assert.IsTrue(Directory.Exists(two) && !Directory.Exists(one) && hasThumb(peerA, MediaT.Id1, 2), "…and runs for the account that is loaded");
        }
        finally
        {
            ChatMediaStoreRules.harnessLater = MediaT.inline;
        }
    }

    [TestMethod]
    public void glue_trashAKillLeft_isRemovedAtTheNextProcesssFirstStoreCall()
    {
        // review round 2 (G7): the process dies between the trash rename and the tree delete
        using Glue g = new Glue("AcctOne");
        fill(peerA, MediaT.Id1, 1); fill(peerB, MediaT.Id1, 2);
        try
        {
            ChatMediaStoreRules.harnessLater = a => { };   // "killed": the tree delete never runs
            ChatMediaStore.deleteChat(peerA);
        }
        finally
        {
            ChatMediaStoreRules.harnessLater = MediaT.inline;
        }
        Assert.IsTrue(g.sb.trash().Length == 1 && g.sb.files().Length == 4, "the deleted chat's two files wait in <root>/del-…");
        Assert.IsFalse(hasThumb(peerA, MediaT.Id1, 1), "…where no get reaches them");
        ChatMediaStore.harnessSweepArm(true);   // the next process (the contact list is not even loaded)
        ChatMediaStore.generationOf(peerB);
        Assert.IsTrue(g.sb.trash().Length == 0 && g.sb.files().Length == 2 && hasThumb(peerB, MediaT.Id1, 2), "its first store call removes the trash folder");
    }

    [TestMethod]
    public void glue_aDeletedMessage_getsNoMemoryEntry()
    {
        // review round 2 (G6): the page's calls (chatThumbFor: ifCurrentThumb · voiceInfoFor: ifCurrentPeaks)
        using Glue g = new Glue();
        int ran = 0;
        ChatMediaStore.deleteMessage(peerA, id1);
        long gen = ChatMediaStore.generationOf(peerA);   // a job of the deleted message that only starts now
        Assert.IsFalse(ChatMediaStore.ifCurrentThumb(peerA, MediaT.Id1, gen, () => ran++) || ChatMediaStore.ifCurrentPeaks(peerA, MediaT.Id1, gen, () => ran++) || ran != 0, "no memory entry for the deleted message");
        Assert.IsTrue(ChatMediaStore.ifCurrentThumb(peerA, MediaT.Id2, gen, () => ran++) && ChatMediaStore.ifCurrentPeaks(peerA, MediaT.Id2, gen, () => ran++) && ran == 2, "another message's entry is kept");
        g.login(null);
        Assert.IsFalse(ChatMediaStore.ifCurrentThumb(peerA, MediaT.Id2, gen, () => ran++) || ChatMediaStore.ifCurrentPeaks(null, MediaT.Id2, gen, () => ran++), "no wallet / no chat: false");
    }

    [TestMethod]
    public void store_writesNoLogLine()
    {
        int before = MediaT.logCount();
        using (Glue g = new Glue())
        {
            fill(peerA, MediaT.Id1, 1);
            string v = MediaT.ver(MediaT.rooted("g1.jpg"));
            string path = g.sb.files().First(f => f.EndsWith(".t1", StringComparison.Ordinal));
            File.WriteAllBytes(path, new byte[200]);                       // a broken file
            Assert.IsTrue(ChatMediaStore.getThumb(peerA, MediaT.Id1, v) == null, "a miss");
            ChatMediaStore.putThumb(peerA, "not-hex", v, MediaT.jpeg(10, 1), ChatMediaStore.generationOf(peerA));   // refused inputs
            ChatMediaStore.putThumb(peerA, MediaT.Id1, v, new byte[] { 1 }, ChatMediaStore.generationOf(peerA));
            ChatMediaStore.putThumb(peerA, MediaT.Id1, v, MediaT.jpeg(10, 1), 0);   // a stale generation
            ChatMediaStore.harnessSweepArm(true);
            ChatMediaStore.harnessChats = () => new List<string> { "PeerA" };
            ChatMediaStore.generationOf(peerA);   // the sweep runs (chat B's folder goes)
            ChatMediaStore.deleteMessage(peerA, id1); ChatMediaStore.deleteChat(peerB); ChatMediaStore.deleteSourceNow(MediaT.rooted("g1.jpg")); ChatMediaStore.wipeThumbs(); ChatMediaStore.wipe();
            g.login(null);
            ChatMediaStore.getThumb(peerA, MediaT.Id1, v);
        }
        Assert.AreEqual(before, MediaT.logCount(), "the store logs nothing: no line can carry a path, a name, an id or an address");
    }
}

// —— harness-only stubs for the glue (the members ChatMediaStore.cs touches, nothing more). Not the app. ——
namespace Microsoft.Maui.Storage
{
    /** MAUI Essentials FileSystem.CacheDirectory (a static string). `reads` counts the glue's reads. */
    public static class FileSystem
    {
        private static string dir = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "csh-media-cache");
        public static int reads;
        public static string CacheDirectory
        {
            get { reads++; return dir; }
            set { dir = value; }
        }
    }
}

namespace IXICore
{
    /** Core Wallet/WalletStorage.cs:59 — getPrimaryAddress() only. */
    public class WalletStorage
    {
        private readonly Address address;
        public WalletStorage(Address a) { address = a; }
        public Address getPrimaryAddress() { return address; }
    }
}

namespace IXICore.Meta
{
    /** Core Meta/IxianNode.cs:319 — getWalletStorage() THROWS when no wallet is loaded (wallets[primary…] on an empty
     *  list); the stub does the same. `asks` counts the glue's asks. */
    public static class IxianHandler
    {
        public static IXICore.WalletStorage? wallet;
        public static int asks;
        public static IXICore.WalletStorage getWalletStorage(IXICore.Address? walletAddress = null)
        {
            asks++;
            if (wallet == null)
            {
                throw new System.Collections.Generic.KeyNotFoundException();
            }
            return wallet;
        }
    }
}
