// ★ S17 F (#1340) — the Moment sheets: the pure rules (Spixi/Utils/S17MomentRules.cs), EXECUTED. The MAUI glue (SMoments, the
// four pages' caps + push, the onNavigatingGlobal branch, the chat's one-shot autodl answer) is pinned at source level
// (scripts/pins-s17/f-moments.mjs, its SOURCE clause).
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;
using System.Collections.Generic;

[TestClass]
public class S17MomentTests
{
    [TestMethod]
    public void ParseAsk_ExactGrammarOnly()
    {
        Assert.IsTrue(S17MomentRules.parseAsk("ixian:moment:mic", out string id, out string arg)); Assert.AreEqual("mic", id); Assert.AreEqual("", arg);
        Assert.IsTrue(S17MomentRules.parseAsk("ixian:moment:lang:de-de", out id, out arg)); Assert.AreEqual("lang", id); Assert.AreEqual("de-de", arg);
        Assert.IsTrue(S17MomentRules.parseAsk("ixian:moment:app:com.ixian.chess_2", out id, out arg)); Assert.AreEqual("app", id); Assert.AreEqual("com.ixian.chess_2", arg);
        foreach (string bad in new[] { "ixian:moment:", "ixian:moment:MIC", "ixian:moment:mic:1", "ixian:moment:lang", "ixian:moment:lang:DE-DE",
            "ixian:moment:lang:de-de:x", "ixian:moment:app:", "ixian:moment:app:a/b", "ixian:moment:app:a b", "ixian:moment:app:" + new string('a', 129),
            "ixian:moment:card", "ixian:moment:other", "ixian:momentmic", null! })
        {
            Assert.IsFalse(S17MomentRules.parseAsk(bad, out _, out _), bad ?? "null");
        }
        Assert.IsTrue(S17MomentRules.isCardVerb("ixian:moment:card"));
        Assert.IsFalse(S17MomentRules.isCardVerb("ixian:moment:card:1"));
    }

    [TestMethod]
    public void Decide_OncePerId_OnePerSession_FirstIxiExcepted()
    {
        var Y = S17MomentRules.Eligible.Yes; var W = S17MomentRules.Eligible.Wait; var C = S17MomentRules.Eligible.Consume;
        Assert.AreEqual(S17MomentRules.Decision.Grant, S17MomentRules.decide("mic", false, false, false, Y));
        Assert.AreEqual(S17MomentRules.Decision.Refuse, S17MomentRules.decide("mic", true, false, false, Y));     // seen
        Assert.AreEqual(S17MomentRules.Decision.Refuse, S17MomentRules.decide("pay", false, true, false, Y));     // a moment this session
        Assert.AreEqual(S17MomentRules.Decision.Refuse, S17MomentRules.decide("autodl", false, false, true, Y));  // a card this session
        Assert.AreEqual(S17MomentRules.Decision.Grant, S17MomentRules.decide("firstixi", false, true, true, Y));  // safety: shows anyway
        Assert.AreEqual(S17MomentRules.Decision.Refuse, S17MomentRules.decide("firstixi", true, false, false, Y));
        Assert.AreEqual(S17MomentRules.Decision.Refuse, S17MomentRules.decide("autodl", false, false, false, W)); // not now: no flag written
        Assert.AreEqual(S17MomentRules.Decision.Consume, S17MomentRules.decide("mic", false, true, true, C));     // never needed: stored, nothing shows
        Assert.AreEqual(S17MomentRules.Decision.Refuse, S17MomentRules.decide("mic", true, false, false, C));
        Assert.IsTrue(S17MomentRules.takesSession("app"));
        Assert.IsFalse(S17MomentRules.takesSession("firstixi"));
    }

    [TestMethod]
    public void Lists_ValidatedBothWays_Capped()
    {
        Assert.AreEqual("mic,pay", S17MomentRules.addToList("mic", "pay", S17MomentRules.isSeenId, 7));
        Assert.AreEqual("mic,pay", S17MomentRules.addToList("pay,mic", "pay", S17MomentRules.isSeenId, 7));    // a re-add moves it last, never twice
        Assert.AreEqual("mic", S17MomentRules.addToList("mic,evil\",x", "lang", S17MomentRules.isSeenId, 7));   // lang / app are not seen ids; junk is dropped
        Assert.AreEqual("b,c", S17MomentRules.addToList("a,b", "c", S17MomentRules.isAppId, 2));                // the oldest goes first
        Assert.AreEqual("de-de", string.Join(",", S17MomentRules.parseList("de-de,DE-DE,x,de-de", S17MomentRules.isLangCode)));
        Assert.IsTrue(S17MomentRules.isEnglish("en-us"));
        Assert.IsFalse(S17MomentRules.isEnglish("de-de"));
    }

    [TestMethod]
    public void Caps_KnownNamesOnly_FixedOrder()
    {
        Assert.AreEqual("MultiUser,Storage", S17MomentRules.capsCsv(new[] { "Storage", "SingleUser", "MultiUser", "<b>" }));
        Assert.AreEqual("", S17MomentRules.capsCsv(new string[0]));
    }

    [TestMethod]
    public void PushJson_FromValidatedValuesOnly()
    {
        Assert.AreEqual("{\"seen\":[\"mic\"],\"apps\":[\"com.a\"],\"lang\":\"de-de\",\"session\":true,\"sessionMs\":5000}",
            S17MomentRules.pushJson(new[] { "mic", "app", "x\"" }, new[] { "com.a", "a b" }, "de-de", true, 5000));
        Assert.AreEqual("{\"seen\":[],\"apps\":[],\"lang\":\"\",\"session\":false,\"sessionMs\":0}",
            S17MomentRules.pushJson(new string[0], new string[0], "de\",\"x", false, 9999));
        Assert.IsTrue(S17MomentRules.pushJson(new string[0], new string[0], "", true, long.MaxValue).EndsWith("\"sessionMs\":21600000}"));   // clamped to 6 h
        Assert.IsTrue(S17MomentRules.pushJson(new string[0], new string[0], "", true, -5).EndsWith("\"sessionMs\":0}"));
    }

    [TestMethod]
    public void FlagLine_SaysOnlyTheBit()
    {
        Assert.AreEqual("[FLAGS] s17moments=1", S17MomentRules.flagLine(true));
        Assert.AreEqual("[FLAGS] s17moments=0", S17MomentRules.flagLine(false));
    }
}
