// ★ S11 G (#1258 + #1263 a / c) — the pure rules of the photo preview IN THE OFFER (sender ladder, receiver acceptance,
// the bounded in-memory cache, the push gate), the album's addFile arg 20 and the viewer's Save verb grammar, EXECUTED
// (S11MediaRules + PhotoRules + ImageSniff). The call sites (SingleChatPage's media / offer / viewer regions,
// StreamProcessor.handleFileHeader) are MAUI-bound — scripts/pins-s11/g-cs.mjs.
using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class S11MediaTests
{
    /* a JPEG header (SOI · APP0 · SOF0 w × h) padded to `len` bytes — PhotoRules.jpegSize + ImageSniff read it */
    static byte[] Jpeg(int w, int h, int len = 64)
    {
        byte[] head = { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x04, 0x4A, 0x46, 0xFF, 0xFF, 0xC0, 0x00, 0x0B, 0x08, (byte)(h >> 8), (byte)h, (byte)(w >> 8), (byte)w, 0x01, 0x01, 0x11, 0x00 };
        byte[] b = new byte[Math.Max(len, head.Length)];
        Array.Copy(head, b, head.Length);
        return b;
    }

    [TestMethod]
    public void sender_ladder_takes_the_first_rung_that_fits()
    {
        List<int> asked = new List<int>();
        byte[]? p = S11MediaRules.pickOfferPreview((edge) => { asked.Add(edge); return Jpeg(edge, edge * 3 / 4, 5000); });
        Assert.IsTrue(p != null && PhotoRules.jpegSize(p, out int w, out _) && w == 96, "96 px fits → taken");
        Assert.AreEqual("96", string.Join(",", asked), "no further rung asked once one fits");

        asked.Clear();
        p = S11MediaRules.pickOfferPreview((edge) => { asked.Add(edge); return Jpeg(edge, edge, edge == 56 ? 7000 : 9000); });
        Assert.IsTrue(p != null && PhotoRules.jpegSize(p, out w, out _) && w == 56, "96 and 72 over 8 KB → 56");
        Assert.AreEqual("96,72,56", string.Join(",", asked), "the ladder in order");

        Assert.IsTrue(S11MediaRules.pickOfferPreview((edge) => Jpeg(edge, edge, 8193)) == null, "nothing fits → NO preview (never a bigger one)");
        Assert.IsTrue(S11MediaRules.pickOfferPreview((edge) => Jpeg(edge, edge, 8192)) != null, "exactly 8 KB fits");
        Assert.IsTrue(S11MediaRules.pickOfferPreview((edge) => null) == null, "the encoder failed → none");
        Assert.IsTrue(S11MediaRules.pickOfferPreview((edge) => throw new InvalidOperationException()) == null, "a throwing encoder → none");
        Assert.IsTrue(S11MediaRules.pickOfferPreview((edge) => Jpeg(edge * 2, edge, 3000)) == null, "an encode LARGER than the rung asked is refused");
        Assert.IsTrue(S11MediaRules.pickOfferPreview((edge) => new byte[3000]) == null, "not a JPEG → none");
        Assert.IsTrue(S11MediaRules.pickOfferPreview(null!) == null, "no encoder → none");
        Assert.AreEqual(8192, S11MediaRules.OfferPreviewMaxBytes, "the cap is 8 KB (#1258)");
        Assert.AreEqual(96, S11MediaRules.OfferPreviewEdges[0], "~96 px first (#1258)");
    }

    [TestMethod]
    public void receiver_accepts_only_a_small_jpeg()
    {
        Assert.IsTrue(S11MediaRules.offerPreviewAccept(Jpeg(96, 72, 4000)), "a 96 × 72 JPEG of 4 KB");
        Assert.IsTrue(S11MediaRules.offerPreviewAccept(Jpeg(256, 256, 8192)), "the bounds themselves");
        Assert.IsFalse(S11MediaRules.offerPreviewAccept(Jpeg(96, 72, 8193)), "over 8 KB");
        Assert.IsFalse(S11MediaRules.offerPreviewAccept(Jpeg(257, 10, 4000)), "a side over 256 px");
        Assert.IsFalse(S11MediaRules.offerPreviewAccept(Jpeg(10, 4000, 4000)), "a tall strip");
        Assert.IsFalse(S11MediaRules.offerPreviewAccept(Jpeg(0, 10, 4000)), "a zero side");
        byte[] png = new byte[100];
        png[0] = 0x89; png[1] = 0x50; png[2] = 0x4E; png[3] = 0x47;
        Assert.IsFalse(S11MediaRules.offerPreviewAccept(png), "a PNG is not the offer's preview shape");
        Assert.IsFalse(S11MediaRules.offerPreviewAccept(new byte[4000]), "zeros");
        Assert.IsFalse(S11MediaRules.offerPreviewAccept(Jpeg(96, 72, 22).Take(15).ToArray()), "shorter than the sniff head");
        Assert.IsFalse(S11MediaRules.offerPreviewAccept(null), "null");
        Assert.IsFalse(S11MediaRules.offerPreviewAccept(Array.Empty<byte>()), "empty");
    }

    [TestMethod]
    public void push_gate_needs_both_switches_and_an_offer()
    {
        Assert.IsTrue(S11MediaRules.offerPreviewPushOk(true, true, false, false, true, true), "received offer, both on");
        Assert.IsFalse(S11MediaRules.offerPreviewPushOk(false, true, false, false, true, true), "Load pictures OFF → no preview (#1263 c)");
        Assert.IsFalse(S11MediaRules.offerPreviewPushOk(true, false, false, false, true, true), "photo previews OFF → no tile, no preview");
        Assert.IsFalse(S11MediaRules.offerPreviewPushOk(true, true, true, false, true, true), "my own file → never");
        Assert.IsFalse(S11MediaRules.offerPreviewPushOk(true, true, false, true, true, true), "already on this device → its real thumbnail");
        Assert.IsFalse(S11MediaRules.offerPreviewPushOk(true, true, false, false, false, true), "not an image name → never");
        Assert.IsFalse(S11MediaRules.offerPreviewPushOk(true, true, false, false, true, false), "the contact rule refused → the file face (MINOR-4)");
    }

    [TestMethod]
    public void preview_follows_the_auto_download_contact_rule()   // ★ S11 G3 (#1263 MINOR-4, the lead's decision)
    {
        // (isRoom, isBot, hidesParticipants, approved, pendingDeletion, senderIsApprovedContact) → the contact half → the push gate
        bool Gate(bool room, bool bot, bool hides, bool approved, bool deleting, bool sender) =>
            S11MediaRules.offerPreviewPushOk(true, true, false, false, true, S11ChatRules.contactOkForAuto(room, bot, hides, approved, deleting, sender));
        Assert.IsTrue(Gate(false, false, false, true, false, false), "an approved 1:1 contact → the preview");
        Assert.IsFalse(Gate(false, false, false, false, false, false), "a pending request → the file face");
        Assert.IsFalse(Gate(false, false, false, true, true, false), "a contact being deleted → the file face");
        Assert.IsTrue(Gate(true, false, false, true, false, true), "a group, visible participants, an approved sender → the preview");
        Assert.IsFalse(Gate(true, false, false, true, false, false), "a group sender who is not an approved contact → the file face");
        Assert.IsFalse(Gate(true, false, true, true, false, true), "a room that hides its participants → the file face");
        Assert.IsFalse(Gate(true, true, false, true, false, true), "a bot room → never");
        Assert.IsFalse(Gate(false, true, false, true, false, true), "a bot (type Normal, setBotMode) → never");
    }

    [TestMethod]
    public void offer_worker_queue_is_serial_and_bounded()   // ★ S11 G3 (#1263 MINOR-5)
    {
        var q = new S11MediaRules.SerialQueue<int>(3);
        Assert.IsTrue(q.enqueue(1, out bool start) && start, "the first item starts the one worker");
        Assert.IsTrue(q.enqueue(2, out start) && !start, "a second item while it runs → no second worker");
        Assert.IsTrue(q.enqueue(3, out start) && !start, "the bound itself");
        Assert.IsFalse(q.enqueue(4, out start) || start, "over the bound → refused, no worker (the caller forgets its sent-key)");
        Assert.IsTrue(q.next(out int a) && a == 1 && q.next(out a) && a == 2, "FIFO");
        Assert.IsTrue(q.enqueue(5, out start) && !start, "room again; the worker still runs");
        Assert.IsTrue(q.next(out a) && a == 3 && q.next(out a) && a == 5, "drained in order");
        Assert.IsTrue(q.Running, "running until the worker sees the queue empty");
        Assert.IsFalse(q.next(out a), "empty → the worker stops");
        Assert.IsFalse(q.Running, "…and is marked stopped under the same lock");
        Assert.IsTrue(q.enqueue(6, out start) && start, "the next item starts a new worker (no item is left without one)");
        Assert.AreEqual(64, S11MediaRules.OfferPreviewQueueMax);
        Assert.AreEqual(10000, S11MediaRules.OfferPreviewGateMs);
    }

    [TestMethod]
    public void offer_temp_names_and_the_sweep_rule()   // ★ S11 G3 (#1263 NIT-5)
    {
        string g = Guid.NewGuid().ToString("N");
        string leaf = S11MediaRules.offerTempName(g);
        Assert.AreEqual("spixi-offer-" + g + ".jpg", leaf);
        Assert.IsTrue(S11MediaRules.isOfferTempName(leaf), "C#'s own leaf → swept");
        string[] keep = { "spixi-offer-.jpg", "spixi-offer-" + g.ToUpperInvariant() + ".jpg", "spixi-offer-" + g + ".jpeg", "spixi-offer-" + g + ".jpg.bak",
            "spixi-offer-" + g.Substring(1) + ".jpg", "spixi-offer-" + g.Substring(1) + "g.jpg", "x-spixi-offer-" + g + ".jpg", "spixi-offer-" + g + "0.jpg", "", "photo.jpg" };
        foreach (string k in keep)
        {
            Assert.IsFalse(S11MediaRules.isOfferTempName(k), "kept: [" + k + "]");
        }
        Assert.IsFalse(S11MediaRules.isOfferTempName(null), "null");
    }

    [TestMethod]
    public void save_mime_from_the_name()   // ★ S11 G3 (#1263 MINOR-8)
    {
        Assert.AreEqual("image/jpeg", S11MediaRules.imageMimeOf("IMG_1.JPG"));
        Assert.AreEqual("image/jpeg", S11MediaRules.imageMimeOf("a.b.jpeg"));
        Assert.AreEqual("image/png", S11MediaRules.imageMimeOf("x.png"));
        Assert.AreEqual("image/gif", S11MediaRules.imageMimeOf("x.gif"));
        Assert.AreEqual("image/webp", S11MediaRules.imageMimeOf("x.webp"));
        Assert.AreEqual("image/bmp", S11MediaRules.imageMimeOf("x.bmp"));
        Assert.AreEqual("image/heic", S11MediaRules.imageMimeOf("x.heic"));
        Assert.AreEqual("image/avif", S11MediaRules.imageMimeOf("x.avif"));
        foreach (string n in new[] { "x.pdf", "x", "x.", ".", "", "jpg", "x.jpg.exe" })
        {
            Assert.AreEqual("application/octet-stream", S11MediaRules.imageMimeOf(n), "[" + n + "]");
        }
        Assert.AreEqual("application/octet-stream", S11MediaRules.imageMimeOf(null));
    }

    [TestMethod]
    public void size_arg_is_for_received_offers_only()
    {
        Assert.AreEqual("845312", S11MediaRules.offerSizeArg(false, false, 845312), "a received offer → bytes, invariant digits");
        Assert.AreEqual("", S11MediaRules.offerSizeArg(true, false, 845312), "mine → ''");
        Assert.AreEqual("", S11MediaRules.offerSizeArg(false, true, 845312), "complete → ''");
        Assert.AreEqual("", S11MediaRules.offerSizeArg(false, false, 0), "unknown → ''");
        Assert.AreEqual("18446744073709551615", S11MediaRules.offerSizeArg(false, false, ulong.MaxValue), "no sign, no group separator");
    }

    [TestMethod]
    public void cache_is_bounded_first_writer_wins_and_keyed_per_chat()
    {
        S11MediaRules.OfferPreviewCache c = new S11MediaRules.OfferPreviewCache();
        string k1 = S11MediaRules.offerKey("peerA", "AB01");
        Assert.AreEqual("peerA|ab01", k1, "peer + lower-case id");
        byte[] a = Jpeg(96, 72, 4000);
        Assert.IsTrue(c.put(k1, a), "kept");
        a[100] = 0x55;
        Assert.IsTrue(c.raw(k1) != null && c.raw(k1)![100] == 0, "a COPY is kept (the caller's buffer may change)");
        Assert.IsFalse(c.put(k1, Jpeg(80, 60, 3000)), "first writer wins — a replayed header cannot swap it");
        Assert.AreEqual(4000, c.raw(k1)!.Length, "still the first");
        Assert.IsTrue(c.raw(S11MediaRules.offerKey("peerB", "ab01")) == null, "another chat with the same id finds nothing");
        Assert.IsFalse(c.put("k-bad", new byte[4000]), "a refused shape is not kept");
        Assert.IsFalse(c.put("", a), "no key → not kept");
        c.setEncoded(k1, "data:image/jpeg;base64,AAAA");
        Assert.AreEqual("data:image/jpeg;base64,AAAA", c.encoded(k1), "the re-encode is cached");
        c.setEncoded(k1, "data:image/jpeg;base64,BBBB");
        Assert.AreEqual("data:image/jpeg;base64,AAAA", c.encoded(k1), "set once");
        c.remove(k1);
        Assert.IsTrue(c.raw(k1) == null && c.Count == 0 && c.Bytes == 0, "removed, bytes back to 0");

        for (int i = 0; i < S11MediaRules.OfferPreviewCache.MaxEntries + 20; i++)
        {
            c.put("k" + i, Jpeg(96, 72, 100));
        }
        Assert.AreEqual(S11MediaRules.OfferPreviewCache.MaxEntries, c.Count, "entry-bounded");
        Assert.IsTrue(c.raw("k0") == null && c.raw("k19") == null && c.raw("k20") != null, "the OLDEST went first");
        c.clear();
        for (int i = 0; i < 300; i++)
        {
            c.put("b" + i, Jpeg(96, 72, 8192));
        }
        Assert.IsTrue(c.Bytes == S11MediaRules.OfferPreviewCache.MaxBytes && c.Count == 256, "256 previews of 8 KB = exactly the 2 MB bound");
        c.setEncoded("b299", new string('x', 10000));   // a re-encode counts toward the bytes
        // ★ S11 G3 (#1263 NIT-5): …and setEncoded itself evicts the oldest until the bound holds again
        Assert.IsTrue(c.Bytes <= S11MediaRules.OfferPreviewCache.MaxBytes && c.Count == 254 && c.raw("b45") == null && c.raw("b46") != null
            && c.encoded("b299") != null, "setEncoded stays within 2 MB (" + c.Count + ", " + c.Bytes + ")");
        c.put("z", Jpeg(96, 72, 8192));
        Assert.IsTrue(c.Bytes <= S11MediaRules.OfferPreviewCache.MaxBytes && c.Count == 254 && c.raw("b46") == null && c.raw("b47") != null && c.raw("z") != null,
            "BYTE-bounded: the next put evicts the three oldest until the total fits (" + c.Count + ", " + c.Bytes + ")");
    }

    [TestMethod]
    public void preview_uri_only_for_a_small_jpeg()
    {
        string? u = S11MediaRules.offerPreviewUri(Jpeg(96, 72, 300));
        Assert.IsTrue(u != null && u.StartsWith("data:image/jpeg;base64,/9j/", StringComparison.Ordinal), "C#'s own JPEG → a data: URI");
        Assert.IsTrue(S11MediaRules.offerPreviewUri(Jpeg(96, 72, 9000)) == null, "over the cap → none");
        Assert.IsTrue(S11MediaRules.offerPreviewUri(null) == null, "a failed re-encode → none");
    }

    [TestMethod]
    public void save_verb_takes_a_hex_id_only()
    {
        Assert.IsTrue(S11MediaRules.parseSavePhoto("0123abcdEF", out string id) && id == "0123abcdEF", "even-length hex");
        string[] bad = { "", "abc", "0123abcdeg", "../../etc/x", "ab:cd", "ab cd", " abcd", "abcd\n", new string('a', 130), "٠١" };
        foreach (string b in bad)
        {
            Assert.IsFalse(S11MediaRules.parseSavePhoto(b, out string o), "refused: [" + b + "]");
            Assert.AreEqual("", o, "a refusal leaves the out empty");
        }
        Assert.IsTrue(S11MediaRules.parseSavePhoto(new string('a', 128), out _), "128 hex = the bound");
        Assert.IsFalse(S11MediaRules.parseSavePhoto(null, out _), "null");
    }
}
