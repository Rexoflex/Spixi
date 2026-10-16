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

    /* ★ S19 F4 (MO-LANG, Damir 2026-10-12): once per language per SESSION — exempt from the one-per-session + card rule (like
       firstixi), it never takes the session, English never asks, and the "seen" set is memory with a session lifetime */
    [TestMethod]
    public void Lang_OncePerLanguagePerSession_ExemptAndNeverTakesTheSession()
    {
        var Y = S17MomentRules.Eligible.Yes; var W = S17MomentRules.Eligible.Wait;
        // exempt: a moment AND a card this session still grant the language sheet
        Assert.AreEqual(S17MomentRules.Decision.Grant, S17MomentRules.decide("lang", false, true, true, Y));
        Assert.AreEqual(S17MomentRules.Why.Ok, S17MomentRules.why("lang", false, true, true, Y));
        // …and it never takes the session: pay / mic / app / autodl / offline are not blocked by it
        Assert.IsFalse(S17MomentRules.takesSession("lang"));
        foreach (string id in new[] { "autodl", "offline", "mic", "app", "pay" })
        {
            Assert.IsTrue(S17MomentRules.takesSession(id), id);
            Assert.IsFalse(S17MomentRules.exemptFromSession(id), id);
            Assert.AreEqual(S17MomentRules.Decision.Refuse, S17MomentRules.decide(id, false, true, false, Y), id);   // the rule still holds for them
        }
        // the id's own check: Settings, the language just applied, never English
        Assert.AreEqual(Y, S17MomentRules.langEligible(true, "de-de", "de-de"));
        Assert.AreEqual(W, S17MomentRules.langEligible(false, "de-de", "de-de"));   // not Settings
        Assert.AreEqual(W, S17MomentRules.langEligible(true, "fr-fr", "de-de"));    // not the pending language
        Assert.AreEqual(W, S17MomentRules.langEligible(true, "en-us", "en-us"));    // English never asks
        Assert.AreEqual(W, S17MomentRules.langEligible(true, "en-gb", "en-gb"));
        Assert.AreEqual(W, S17MomentRules.langEligible(true, "", ""));
        Assert.AreEqual(W, S17MomentRules.langEligible(true, null, null));
        Assert.AreEqual(W, S17MomentRules.langEligible(true, "DE-DE", "DE-DE"));

        // the session set: memory, per language, a 6 h lifetime from its first language, cleared by the dev reset
        var set = new S17MomentRules.SessionLangs();
        long t = 1_700_000_000_000;
        Assert.IsFalse(set.has("de-de", t));
        set.add("de-de", t);
        Assert.IsTrue(set.has("de-de", t + 1));
        Assert.IsFalse(set.has("fr-fr", t + 1));                                   // another language asks once too
        set.add("fr-fr", t + 2);
        Assert.IsTrue(set.has("fr-fr", t + 3) && set.has("de-de", t + 3));
        set.add("x\",\"y", t + 3); set.add("DE-DE", t + 3); set.add(null, t + 3);  // junk never enters
        Assert.AreEqual(2, set.count);
        Assert.IsTrue(set.has("de-de", t + S17MomentRules.MaxSessionMs - 1));
        Assert.IsFalse(set.has("de-de", t + S17MomentRules.MaxSessionMs));         // the session ended: asks again
        Assert.AreEqual(0, set.count);
        set.add("it-it", t); Assert.IsFalse(set.has("it-it", t - 1));              // the wall clock went back: a new session
        for (int i = 0; i < 60; i++) set.add(((char)('a' + i % 26)).ToString() + ((char)('a' + i / 26)).ToString() + "-xx", t);
        Assert.AreEqual(S17MomentRules.MaxLangs, set.count);                       // capped, the oldest goes first
        set.clear();
        Assert.AreEqual(0, set.count);
        Assert.IsFalse(S17MomentRules.sessionExpired(0, t));
        Assert.IsTrue(S17MomentRules.sessionExpired(t, t + S17MomentRules.MaxSessionMs));
    }

    /* ★ S19 F5 (MO-APP at Install): App details hosts ONE moment — `app`, for its own app id only */
    [TestMethod]
    public void AppDetails_AsksOnlyItsOwnAppMoment()
    {
        Assert.IsTrue(S17MomentRules.appDetailsAsk("app", "com.ixian.chess", "com.ixian.chess"));
        Assert.IsFalse(S17MomentRules.appDetailsAsk("app", "com.ixian.dice", "com.ixian.chess"));    // another app: never
        Assert.IsFalse(S17MomentRules.appDetailsAsk("app", "COM.IXIAN.CHESS", "com.ixian.chess"));   // ordinal
        Assert.IsFalse(S17MomentRules.appDetailsAsk("app", "", ""));                                  // no app id on the page yet
        Assert.IsFalse(S17MomentRules.appDetailsAsk("app", "a b", "a b"));                            // an id outside the grammar
        Assert.IsFalse(S17MomentRules.appDetailsAsk("app", "x", null));
        foreach (string id in new[] { "lang", "autodl", "offline", "firstixi", "mic", "pay", "card" })
            Assert.IsFalse(S17MomentRules.appDetailsAsk(id, "com.ixian.chess", "com.ixian.chess"), id);
        // the ask itself is the existing grammar: the page sends exactly ixian:moment:app:<id>
        Assert.IsTrue(S17MomentRules.parseAsk("ixian:moment:app:com.ixian.chess", out string pid, out string parg));
        Assert.IsTrue(S17MomentRules.appDetailsAsk(pid, parg, "com.ixian.chess"));
    }

    /* ★ #46 S19 (security MINOR-1): after a URL install, an installed app that differs from the fetched appinfo the moment
       showed (id or capability set) loses its seen mark — the next open asks with the real caps */
    [TestMethod]
    public void AppDetails_InstalledDiffers_UnmarksTheFetchedId()
    {
        string[] caps = { "MultiUser", "Storage" };
        Assert.IsFalse(S17MomentRules.installedDiffers("com.ixian.chess", caps, "com.ixian.chess", new[] { "Storage", "MultiUser" }));   // same set, any order
        Assert.IsFalse(S17MomentRules.installedDiffers("a", null, "a", new string[0]));                                               // no caps both sides
        Assert.IsTrue(S17MomentRules.installedDiffers("com.ixian.chess", caps, "com.ixian.chess", new[] { "MultiUser", "Storage", "TransactionSigning" }));   // the package asks for more
        Assert.IsTrue(S17MomentRules.installedDiffers("com.ixian.chess", caps, "com.ixian.chess", new[] { "MultiUser" }));            // or for less
        Assert.IsTrue(S17MomentRules.installedDiffers("com.ixian.chess", caps, "com.ixian.dice", caps));                              // the package's own id
        Assert.IsTrue(S17MomentRules.installedDiffers("com.ixian.chess", caps, "COM.IXIAN.CHESS", caps));                             // ordinal
        Assert.IsTrue(S17MomentRules.installedDiffers("com.ixian.chess", caps, null, null));                                          // not installed under that id
        // the unmark: that one id leaves the stored list, the rest stays validated
        Assert.AreEqual("a,c", S17MomentRules.removeFromList("a,com.ixian.chess,c", "com.ixian.chess", S17MomentRules.isAppId));
        Assert.AreEqual("a", S17MomentRules.removeFromList("a,b c", "zz", S17MomentRules.isAppId));
        Assert.AreEqual("", S17MomentRules.removeFromList(null, "a", S17MomentRules.isAppId));
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
        /* ★ S19 F4 re-base: the S17 walk's `lang refuse why=session` is gone — lang is exempt from the session + card rule */
        Assert.AreEqual("[MO] ask id=lang d=grant why=ok", L("lang", false, true, true, Y));
        Assert.AreEqual("[MO] ask id=lang d=refuse why=seen", L("lang", true, false, false, Y));      // shown this session
        Assert.AreEqual("[MO] ask id=app d=refuse why=card", L("app", false, false, true, Y));        // a card this session
        Assert.AreEqual("[MO] ask id=firstixi d=grant why=ok", L("firstixi", false, true, true, Y));  // safety: the exception
        Assert.AreEqual("[MO] ask id=pay d=refuse why=session", L("pay", false, true, false, Y));
        // every combination: refuse ⇔ a why other than ok, and the line is exactly the fixed shape
        var shape = new System.Text.RegularExpressions.Regex("^\\[MO\\] ask id=(lang|autodl|offline|firstixi|mic|app|pay|ixihelp|addrhelp) d=(grant|refuse|consume) why=(seen|wait|session|card|ok)$");   // ★ S20I re-base: + addrhelp (the one fixed set)
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

    /* ★ S20 G (#1379): the app moment AT INSTALL (App details, or the re-ask of an app unmarked after its install) neither
       waits for the session / a card nor takes the session — the S19 walk's `app d=refuse why=session` on Install after
       autodl took it, and the corrective re-ask refused by the install moment's own session, are gone; every other app ask
       (grid, invite) keeps the rule */
    [TestMethod]
    public void InstallMoment_ExemptAndNeverTakesTheSession()
    {
        var Y = S17MomentRules.Eligible.Yes; var W = S17MomentRules.Eligible.Wait; var C = S17MomentRules.Eligible.Consume;
        Assert.IsTrue(S17MomentRules.installMoment("app", true, false), "App details");
        Assert.IsTrue(S17MomentRules.installMoment("app", false, true), "the re-ask after an unmark");
        Assert.IsFalse(S17MomentRules.installMoment("app", false, false), "the grid / an invite");
        foreach (string id in S17MomentRules.Ids)
            if (id != "app") Assert.IsFalse(S17MomentRules.installMoment(id, true, true), "only the app moment: " + id);
        // the walk case: autodl took the session, then Install → granted now (was refuse why=session)
        Assert.AreEqual(S17MomentRules.Decision.Grant, S17MomentRules.decide("app", false, true, false, Y, true));
        Assert.AreEqual(S17MomentRules.Decision.Grant, S17MomentRules.decide("app", false, true, true, Y, true), "a card this session too");
        Assert.AreEqual(S17MomentRules.Decision.Refuse, S17MomentRules.decide("app", false, true, false, Y, false), "the grid keeps the rule");
        Assert.AreEqual(S17MomentRules.Decision.Refuse, S17MomentRules.decide("app", false, true, true, Y), "the 5-argument form = not at install");
        // once per app and the id's own check still win
        Assert.AreEqual(S17MomentRules.Decision.Refuse, S17MomentRules.decide("app", true, false, false, Y, true), "seen");
        Assert.AreEqual(S17MomentRules.Decision.Refuse, S17MomentRules.decide("app", false, false, false, W, true), "wait");
        // never takes the session (the corrective re-ask after it is not refused by it)
        Assert.IsFalse(S17MomentRules.takesSession("app", true));
        Assert.IsTrue(S17MomentRules.takesSession("app", false));
        Assert.IsTrue(S17MomentRules.takesSession("pay", true), "only the app moment is exempt");
        // the log line: why follows decide for both values, every combination
        foreach (string id in S17MomentRules.Ids)
            foreach (var e in new[] { Y, W, C })
                for (int b = 0; b < 16; b++)
                {
                    bool seen = (b & 1) != 0, sm = (b & 2) != 0, sc = (b & 4) != 0, inst = (b & 8) != 0;
                    var d = S17MomentRules.decide(id, seen, sm, sc, e, inst);
                    var w = S17MomentRules.why(id, seen, sm, sc, e, inst);
                    Assert.AreEqual(d == S17MomentRules.Decision.Refuse, w != S17MomentRules.Why.Ok, id + e + b);
                    if (!inst) Assert.AreEqual(S17MomentRules.decide(id, seen, sm, sc, e), d, "5-arg = not at install " + id + e + b);
                }
        Assert.AreEqual("[MO] ask id=app d=grant why=ok", S17MomentRules.askLine("app", S17MomentRules.decide("app", false, true, false, Y, true), S17MomentRules.why("app", false, true, false, Y, true)));
    }

    [TestMethod]
    public void UnmarkedApps_ValidatedCappedRemovedOnGrant()
    {
        var u = new S17MomentRules.UnmarkedApps();
        u.add("com.ixian.chess");
        u.add("bad id");
        u.add("");
        u.add(null);
        u.add(new string('a', 129));
        Assert.AreEqual(1, u.count, "only a valid app id goes in");
        Assert.IsTrue(u.has("com.ixian.chess") && !u.has("bad id") && !u.has(null));
        u.add("com.ixian.chess");
        Assert.AreEqual(1, u.count, "no duplicate");
        for (int i = 0; i < S17MomentRules.MaxUnmarked + 5; i++) u.add("app" + i);
        Assert.AreEqual(S17MomentRules.MaxUnmarked, u.count, "capped");
        Assert.IsFalse(u.has("com.ixian.chess"), "the oldest goes first");
        u.remove("app44");
        Assert.IsFalse(u.has("app44"));
        u.clear();
        Assert.AreEqual(0, u.count);
    }

    [TestMethod]
    public void FlagLine_SaysOnlyTheBit()
    {
        Assert.AreEqual("[FLAGS] s17moments=1", S17MomentRules.flagLine(true));
        Assert.AreEqual("[FLAGS] s17moments=0", S17MomentRules.flagLine(false));
    }
}
