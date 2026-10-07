// ★ S10 (session 10, agent A, #1254) — the pure rules of the paste / attach STRIP (P1), the F1 [P1] colour token, the F4
// haptic fallback and the P2 file tiers, EXECUTED (S10MediaRules + PhotoRules). The call sites (SingleChatPage's media
// region, SpixiContentPage's hold + performHaptic) are MAUI-bound — scripts/pins-s10/a-wiring.mjs.
using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class S10MediaTests
{
    [TestMethod]
    public void next_key_is_the_smallest_free_digit()
    {
        Assert.AreEqual(0, S10MediaRules.nextKey(new List<int>()), "an empty batch → 0");
        Assert.AreEqual(3, S10MediaRules.nextKey(new List<int> { 0, 1, 2 }), "0,1,2 → 3");
        Assert.AreEqual(0, S10MediaRules.nextKey(new List<int> { 1, 3 }), "a freed 0 is reused first");
        Assert.AreEqual(1, S10MediaRules.nextKey(new List<int> { 0, 2 }), "the gap → 1");
        Assert.AreEqual(2, S10MediaRules.nextKey(new List<int> { 5, 0, 1 }), "order of the used keys does not matter");
        Assert.AreEqual(9, S10MediaRules.nextKey(Enumerable.Range(0, 9).ToList()), "0..8 → 9");
        Assert.AreEqual(-1, S10MediaRules.nextKey(Enumerable.Range(0, 10).ToList()), "all ten taken → -1 (tooMany)");
        Assert.AreEqual(10, PhotoRules.MaxBatch, "10 slots per batch");
    }

    [TestMethod]
    public void parse_drop_is_exact()
    {
        Assert.IsTrue(S10MediaRules.parseDrop("0123456789abcdef:7", out string id, out int k) && id == "0123456789abcdef" && k == 7, "id + digit");
        Assert.IsTrue(S10MediaRules.parseDrop("ffffffffffffffff:0", out _, out int k0) && k0 == 0, "key 0");
        Assert.IsTrue(S10MediaRules.parseDrop("ffffffffffffffff:9", out _, out int k9) && k9 == 9, "key 9");
        string[] bad =
        {
            "0123456789ABCDEF:7",   // uppercase is not C#'s id (isId16)
            "0123456789abcde:7",    // 15 hex
            "0123456789abcdef0:7",  // 17 hex
            "0123456789abcdef:10",  // two digits
            "0123456789abcdef:",    // no key
            "0123456789abcdef7",    // no colon
            "0123456789abcdef:a",   // not a digit
            "0123456789abcdef:-",   // a sign
            "0123456789abcdef:7 ",  // trailing space
            " 0123456789abcdef:7",  // leading space
            "0123456789abcdef;7",   // another separator
            "0123456789abcdeg:7",   // non-hex
            "../../../etc/pass:1",  // a path is never an id
            "0123456789abcdef:٧", // a non-ASCII digit
            "",
        };
        foreach (string b in bad)
        {
            Assert.IsFalse(S10MediaRules.parseDrop(b, out string bid, out int bk), "refused: [" + b + "]");
            Assert.IsTrue(bid == "" && bk == -1, "a refusal leaves the outs empty: [" + b + "]");
        }
        Assert.IsFalse(S10MediaRules.parseDrop(null, out _, out _), "null");
    }

    [TestMethod]
    public void append_assigns_free_keys_and_keeps_strip_order()
    {
        // a model of finishPick's append: open batch {0,1,2}, the ✕ of key 1, then 2 new photos → keys 1 and 3, the json
        // keeps the strip order (append at the end), and every key is accepted by mediaSend's parse (count = MaxBatch)
        List<int> keys = new List<int> { 0, 1, 2 };
        List<PhotoRules.PickedItem> shown = keys.Select(x => new PhotoRules.PickedItem { k = x.ToString(), w = 1, h = 1, kb = 1 }).ToList();
        keys.Remove(1);
        shown.RemoveAll(x => x.k == "1");
        for (int i = 0; i < 2; i++)
        {
            int k = S10MediaRules.nextKey(keys);
            keys.Add(k);
            shown.Add(new PhotoRules.PickedItem { k = k.ToString(), w = 2, h = 2, kb = 2 });
        }
        Assert.IsTrue(keys.SequenceEqual(new[] { 0, 2, 1, 3 }), "the freed 1 is reused, then 3");
        string json = PhotoRules.pickedJson(shown);
        Assert.IsTrue(json.IndexOf("\"k\":\"0\"") < json.IndexOf("\"k\":\"2\"") && json.IndexOf("\"k\":\"2\"") < json.IndexOf("\"k\":\"1\"")
            && json.IndexOf("\"k\":\"1\"") < json.IndexOf("\"k\":\"3\""), "mediaPicked carries the FULL list in strip order: " + json);
        List<int>? parsed = PhotoRules.parseKeys("0,2,1,3", PhotoRules.MaxBatch);
        Assert.IsTrue(parsed != null && parsed.SequenceEqual(new[] { 0, 2, 1, 3 }), "mediaSend accepts the appended keys (batch count 10)");
        Assert.IsTrue(PhotoRules.parseKeys("9", PhotoRules.MaxBatch) != null, "key 9 is a valid slot of every batch");
        // a full batch: ten keys → the next append gets -1 (its file goes, tooMany)
        List<int> full = Enumerable.Range(0, 10).ToList();
        Assert.AreEqual(-1, S10MediaRules.nextKey(full), "full → -1");
        full.Remove(4);
        Assert.AreEqual(4, S10MediaRules.nextKey(full), "one ✕ frees exactly that slot");
    }

    [TestMethod]
    public void haptic_fallback_rule()
    {
        Assert.IsTrue(S10MediaRules.hapticFallback(false, 1, 29), "refused + feedback on + API 29 → buzz");
        Assert.IsTrue(S10MediaRules.hapticFallback(false, -1, 34), "refused + setting unknown (-1) → buzz");
        Assert.IsFalse(S10MediaRules.hapticFallback(false, 0, 34), "the user switched touch feedback OFF → never (Damir: respect it)");
        Assert.IsFalse(S10MediaRules.hapticFallback(true, 1, 34), "the view's haptic worked → no second buzz");
        Assert.IsFalse(S10MediaRules.hapticFallback(false, 1, 28), "below API 29 → no predefined effect, nothing");
        Assert.AreEqual("click", S10MediaRules.hapticWord("click"), "click");
        Assert.AreEqual("long", S10MediaRules.hapticWord("long"), "long");
        Assert.AreEqual("success", S10MediaRules.hapticWord("success"), "success");
        Assert.IsTrue(S10MediaRules.hapticWord("Click") == null, "exact words only");
        Assert.IsTrue(S10MediaRules.hapticWord("click ") == null, "no padding");
        Assert.IsTrue(S10MediaRules.hapticWord(null) == null, "null");
        Assert.IsTrue(S10MediaRules.hapticHeavy("long") && S10MediaRules.hapticHeavy("success") && !S10MediaRules.hapticHeavy("click") && !S10MediaRules.hapticHeavy(null),
            "long / success = the heavy click, click = the click");
        foreach (string w in new[] { "click", "long", "success" })
        {
            Assert.IsTrue(P1Perf.isValidLine("[P1] haptic k=" + w + " ok=0 hfe=-1 sdk=34"), "[P1] grammar: the haptic line (" + w + ")");
        }
    }

    [TestMethod]
    public void argb_token_passes_the_p1_grammar()
    {
        Assert.AreEqual("none", S10MediaRules.argbToken(null), "null → none");
        Assert.AreEqual("00000000", S10MediaRules.argbToken(0), "transparent → 00000000");
        Assert.AreEqual("ff13171b", S10MediaRules.argbToken(unchecked((int)0xFF13171B)), "an opaque dark surface, lowercase, no '#'");
        Assert.AreEqual("ffffffff", S10MediaRules.argbToken(-1), "white");
        Assert.IsTrue(P1Perf.isValidLine("[P1] hold nbg pre=" + S10MediaRules.argbToken(unchecked((int)0xFF13171B)) + " post=" + S10MediaRules.argbToken(null)),
            "[P1] grammar: the hold nbg line");
        Assert.IsFalse(P1Perf.isValidLine("[P1] hold nbg pre=#FF13171B post=none"), "the contract's '#AARRGGBB' form would be DROPPED by the grammar");
    }

    [TestMethod]
    public void file_tiers()
    {
        Assert.AreEqual(50L * 1024 * 1024, PhotoRules.maxFileBytes(PhotoRules.FileTier.Free), "free = 50 MiB");
        Assert.AreEqual(100L * 1024 * 1024, PhotoRules.maxFileBytes(PhotoRules.FileTier.Premium), "premium = 100 MiB");
        Assert.AreEqual(PhotoRules.maxFileBytes(PhotoRules.FileTier.Premium), PhotoRules.MaxReceiveBytes, "the receive cap = the largest tier");
        Assert.IsTrue(typeof(PhotoRules).GetField("MaxFileBytes") == null, "MaxFileBytes is gone (every site names its tier or the receive cap)");
    }
}
