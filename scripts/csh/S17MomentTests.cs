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

    /* ★ S18 D3: the decision log line — the "why" follows decide()'s own order, and the line carries fixed words + an id
       re-read from the fixed set only (no language code, no app id, nothing the caller passed) */
    [TestMethod]
    public void AskLine_WhyMatchesDecide_FixedWordsOnly()
    {
        var Y = S17MomentRules.Eligible.Yes; var W = S17MomentRules.Eligible.Wait; var C = S17MomentRules.Eligible.Consume;
        string L(string id, bool seen, bool sm, bool sc, S17MomentRules.Eligible e) =>
            S17MomentRules.askLine(id, S17MomentRules.decide(id, seen, sm, sc, e), S17MomentRules.why(id, seen, sm, sc, e));
        Assert.AreEqual("[MO] ask id=mic d=grant why=ok", L("mic", false, false, false, Y));
        Assert.AreEqual("[MO] ask id=mic d=refuse why=seen", L("mic", true, true, true, C));          // seen wins over everything
        Assert.AreEqual("[MO] ask id=mic d=consume why=ok", L("mic", false, true, true, C));          // never needed: stored, nothing shows
        Assert.AreEqual("[MO] ask id=autodl d=refuse why=wait", L("autodl", false, true, false, W));  // the id's own check first
        Assert.AreEqual("[MO] ask id=lang d=refuse why=session", L("lang", false, true, true, Y));    // the S17 walk: a moment this session
        Assert.AreEqual("[MO] ask id=app d=refuse why=card", L("app", false, false, true, Y));        // a card this session
        Assert.AreEqual("[MO] ask id=firstixi d=grant why=ok", L("firstixi", false, true, true, Y));  // safety: the exception
        Assert.AreEqual("[MO] ask id=pay d=refuse why=session", L("pay", false, true, false, Y));
        // every combination: refuse ⇔ a why other than ok, and the line is exactly the fixed shape
        var shape = new System.Text.RegularExpressions.Regex("^\\[MO\\] ask id=(lang|autodl|offline|firstixi|mic|app|pay) d=(grant|refuse|consume) why=(seen|wait|session|card|ok)$");
        foreach (string id in S17MomentRules.Ids)
            foreach (var e in new[] { Y, W, C })
                for (int b = 0; b < 8; b++)
                {
                    bool seen = (b & 1) != 0, sm = (b & 2) != 0, sc = (b & 4) != 0;
                    var d = S17MomentRules.decide(id, seen, sm, sc, e);
                    var w = S17MomentRules.why(id, seen, sm, sc, e);
                    Assert.AreEqual(d == S17MomentRules.Decision.Refuse, w != S17MomentRules.Why.Ok, id + e + b);
                    Assert.IsTrue(shape.IsMatch(S17MomentRules.askLine(id, d, w)), id + e + b);
                }
        // a caller's string never reaches the line: an id outside the set (a code, an app id, a forged line) logs nothing
        Assert.AreEqual("", S17MomentRules.askLine("de-de", S17MomentRules.Decision.Grant, S17MomentRules.Why.Ok));
        Assert.AreEqual("", S17MomentRules.askLine("com.ixian.chess", S17MomentRules.Decision.Grant, S17MomentRules.Why.Ok));
        Assert.AreEqual("", S17MomentRules.askLine("mic\n[MO] forged", S17MomentRules.Decision.Grant, S17MomentRules.Why.Ok));
        Assert.AreEqual("", S17MomentRules.askLine("mic", S17MomentRules.Decision.Grant, (S17MomentRules.Why)99));
        Assert.AreEqual("ixian:devmoments:reset", S17MomentRules.DevResetVerb);
        Assert.AreEqual("[MO] dev reset: moment sheets cleared", S17MomentRules.DevResetLine);
        Assert.AreEqual(100, S17MomentRules.MaxAskLines);   // the per-process cap SMoments applies (pin f-moments-dev askPlace)
    }

    [TestMethod]
    public void FlagLine_SaysOnlyTheBit()
    {
        Assert.AreEqual("[FLAGS] s17moments=1", S17MomentRules.flagLine(true));
        Assert.AreEqual("[FLAGS] s17moments=0", S17MomentRules.flagLine(false));
    }
}
