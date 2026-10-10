// ★ S15 F (#1302, Damir 2026-10-10: "both") — the pure half of "tiles at once", EXECUTED (Spixi/Utils/S15MediaRules.cs +
// PhotoRules.pickedJson's one new field): the placeholder JSON shape, the key reservation, the per-photo update list,
// the dropped-key filter and the [P1] body. The call sites (SingleChatPage onPickPhotos / prepareBatch / photoReady /
// finishPick / onMediaDrop, Android SThumbnail's derive hook) are MAUI-bound — scripts/pins-s15/f-strip.mjs.
using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class S15MediaTests
{
    private static PhotoRules.PickedItem ready(string thumb, int w, int h, long kb)
    {
        return new PhotoRules.PickedItem { k = "", thumb = thumb, w = w, h = h, kb = kb };
    }

    private const string Jpg = "data:image/jpeg;base64,/9j/AA==";

    [TestMethod]
    public void placeholder_json_shape()
    {
        List<PhotoRules.PickedItem> l = new List<PhotoRules.PickedItem> { S15MediaRules.placeholder(0), S15MediaRules.placeholder(3) };
        Assert.AreEqual("[{\"k\":\"0\",\"thumb\":\"\",\"w\":\"0\",\"h\":\"0\",\"kb\":\"0\",\"kind\":\"photo\",\"pending\":\"1\"},"
            + "{\"k\":\"3\",\"thumb\":\"\",\"w\":\"0\",\"h\":\"0\",\"kb\":\"0\",\"kind\":\"photo\",\"pending\":\"1\"}]",
            PhotoRules.pickedJson(l), "a placeholder = the S9 item shape + ONE field, \"pending\":\"1\"");
        List<PhotoRules.PickedItem> r = new List<PhotoRules.PickedItem> { new PhotoRules.PickedItem { k = "1", thumb = Jpg, w = 4, h = 3, kb = 9 } };
        Assert.AreEqual("[{\"k\":\"1\",\"thumb\":\"" + Jpg + "\",\"w\":\"4\",\"h\":\"3\",\"kb\":\"9\",\"kind\":\"photo\"}]",
            PhotoRules.pickedJson(r), "a READY item carries no pending field — the final push is byte-identical to S14");
    }

    [TestMethod]
    public void keys_are_reserved_up_front_beside_ready_and_pending()
    {
        Assert.AreEqual("0,1,2", string.Join(",", S15MediaRules.reserveKeys(new List<int>(), 3)), "a new batch → 0..n-1");
        List<PhotoRules.PickedItem> open = new List<PhotoRules.PickedItem>
        {
            new PhotoRules.PickedItem { k = "0", thumb = Jpg }, S15MediaRules.placeholder(2), new PhotoRules.PickedItem { k = "4" },
        };
        Assert.AreEqual("0,2,4", string.Join(",", S15MediaRules.keysOf(open)), "ready AND pending keys are taken");
        Assert.AreEqual("1,3,5", string.Join(",", S15MediaRules.reserveKeys(S15MediaRules.keysOf(open), 3)), "an append takes the smallest free keys");
        Assert.AreEqual(3, S15MediaRules.reserveKeys(Enumerable.Range(0, 7), 5).Count, "7 used → only 3 reserved (the rest = tooMany)");
        Assert.AreEqual(0, S15MediaRules.reserveKeys(Enumerable.Range(0, 10), 2).Count, "a full batch reserves none");
    }

    [TestMethod]
    public void update_replaces_the_placeholder_in_place_and_a_failure_removes_it()
    {
        List<PhotoRules.PickedItem> l = new List<PhotoRules.PickedItem>
        {
            new PhotoRules.PickedItem { k = "0", thumb = Jpg, w = 1, h = 1, kb = 1 },
            S15MediaRules.placeholder(1), S15MediaRules.placeholder(2), S15MediaRules.placeholder(3),
        };
        Assert.AreEqual(3, S15MediaRules.pendingCount(l));
        Assert.IsTrue(S15MediaRules.applyReady(l, 2, ready(Jpg, 2048, 1536, 400)), "key 2 is ready");
        Assert.AreEqual("0,1,2,3", string.Join(",", l.Select(x => x.k)), "same order — replaced in place");
        Assert.IsFalse(l[2].pending, "no longer pending");
        Assert.AreEqual(2048, l[2].w, "the ready item's own values");
        Assert.IsTrue(S15MediaRules.applyReady(l, 1, null), "key 1 failed");
        Assert.AreEqual("0,2,3", string.Join(",", l.Select(x => x.k)), "a failed photo's tile is gone from the next push");
        Assert.AreEqual(1, S15MediaRules.pendingCount(l));
        string json = PhotoRules.pickedJson(l);
        Assert.AreEqual(1, json.Split("\"pending\"").Length - 1, "the update push: ready items + the remaining placeholder");
        Assert.IsFalse(S15MediaRules.applyReady(l, 0, ready(Jpg, 1, 1, 1)), "a READY key is never overwritten by a late result");
        Assert.AreEqual(1, l[0].w, "untouched");
    }

    [TestMethod]
    public void a_dropped_pending_key_never_comes_back()
    {
        List<PhotoRules.PickedItem> l = new List<PhotoRules.PickedItem> { S15MediaRules.placeholder(0), S15MediaRules.placeholder(1) };
        Assert.IsTrue(S15MediaRules.dropPending(l, 1), "a pending tile's ✕");
        Assert.IsFalse(S15MediaRules.dropPending(l, 1), "twice → nothing");
        Assert.IsFalse(S15MediaRules.applyReady(l, 1, ready(Jpg, 9, 9, 9)), "its photo, ready later, is refused (the caller discards the file)");
        Assert.AreEqual("0", string.Join(",", l.Select(x => x.k)), "the dropped key is not in the list");
        Assert.IsFalse(S15MediaRules.dropPending(new List<PhotoRules.PickedItem> { new PhotoRules.PickedItem { k = "0", thumb = Jpg } }, 0),
            "a READY key is not a pending drop (the S10 mediaDrop path owns it)");
        List<PhotoRules.PickedItem> end = new List<PhotoRules.PickedItem>
        {
            new PhotoRules.PickedItem { k = "0", thumb = Jpg }, S15MediaRules.placeholder(1), S15MediaRules.placeholder(2),
        };
        Assert.AreEqual(2, S15MediaRules.dropAllPending(end), "the end of a prepare: the unreached placeholders go");
        Assert.AreEqual(0, PhotoRules.pickedJson(end).Split("\"pending\"").Length - 1, "the final push has no placeholder");
    }

    [TestMethod]
    public void p1_prepare_line_is_fixed_words()
    {
        string a = S15MediaRules.prepareLine(3, 2400, 610);
        Assert.AreEqual("media prepare n=3 ms=2400 first=610", a);
        Assert.IsTrue(P1Perf.isValidLine("[P1] " + a), "passes the [P1] grammar");
        string b = S15MediaRules.prepareLine(2, 50, -1);
        Assert.AreEqual("media prepare n=2 ms=50 first=-1", b, "no ready photo → first=-1");
        Assert.IsTrue(P1Perf.isValidLine("[P1] " + b));
        Assert.AreEqual("media prepare n=0 ms=0 first=-1", S15MediaRules.prepareLine(-4, -9, -7), "negatives clamp");
    }
}
