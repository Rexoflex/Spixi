// ★ V1A-M (Drop 2, P31) — the first-minute moments' C# rules, EXECUTED: M1 the "What is IXI?" moment (`ixihelp` in the S17
// moment set: the exact ask grammar, the session rule (obeyed, never taken — #46 r1), the fixed log line, the seen store + push, home-only
// eligibility), M2 the word tips (S11HintRules.WordIds beside the rotation list TipIds, the word-verb dispatch, done only,
// the done store + push), the two [FLAGS] lines through the REAL SpixiFlags.init (absent = ON, a stored 0 acts only in dev
// mode) and the dev push argument. The MAUI call sites (HomePage setCaps + the word branch, SMoments.handleVerb /
// answerAsync, DevPage) are pinned on source by scripts/pins-v1am/c-csharp.mjs.
// DELIBERATE BREAKS (V1A-M CS report): ① "ixihelp" out of S17MomentRules.Ids → parse_ask fails; ② exemptFromSession admits
// ixihelp → session_rule fails; ②b (#46 r1) respectsButNeverTakes → false (ixihelp takes the session again) → session_rule
// fails ("never takes the session"); ③ isTipId without the isWordId line → word_ids fails; ④ wordTipMarksDone accepting
// `shown` → word_verb fails; ⑤ flagLineHints spelling "v1hint=" → flags fails; ⑥ SpixiFlags.init reading V1Hints from vi
// → flags fails.
using System;
using System.Collections.Generic;
using System.IO;
using Microsoft.Maui.Storage;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;
using SPIXI.Meta;

[TestClass]
public class V1AMTests
{
    [TestMethod]
    public void m1_parse_ask_takes_ixihelp_with_no_argument_only()
    {
        Assert.IsTrue(S17MomentRules.parseAsk("ixian:moment:ixihelp", out string id, out string arg), "the ask");
        Assert.AreEqual("ixihelp", id);
        Assert.AreEqual("", arg, "no argument");
        Assert.AreEqual(V1AMRules.IxiHelpId, id, "the V1AMRules constant is the same literal");
        foreach (string bad in new[] { "ixian:moment:ixihelp:x", "ixian:moment:ixihelp:", "ixian:moment:IXIHELP", "ixian:moment:ixihelp ",
            "ixian:moment:ixi", "ixian:moment:ixihelpx", "ixian:momentixihelp", "ixian:moment:ixihelp:de-de" })
        {
            Assert.IsFalse(S17MomentRules.parseAsk(bad, out string bi, out string ba), "refused: [" + bad + "]");
            Assert.AreEqual("", bi + ba, "a refused ask yields nothing: [" + bad + "]");
        }
        Assert.IsTrue(Array.IndexOf(S17MomentRules.Ids, "ixihelp") >= 0, "in the ONE fixed id set");
        Assert.AreEqual(8, S17MomentRules.Ids.Length, "the seven S17 ids + ixihelp, nothing else");
    }

    [TestMethod]
    public void m1_session_rule_obeyed_but_never_taken()
    {
        var Y = S17MomentRules.Eligible.Yes; var W = S17MomentRules.Eligible.Wait;
        Assert.IsFalse(S17MomentRules.exemptFromSession("ixihelp"), "not exempt (only firstixi + lang)");
        Assert.IsFalse(S17MomentRules.exemptFromSession("ixihelp", true), "the install bit is the app moment's only");
        /* ★ #46 r1 (A-MINOR-1, the main session's decision): it never TAKES the session — both overloads, both install bits */
        Assert.IsFalse(S17MomentRules.takesSession("ixihelp"), "never takes the session");
        Assert.IsFalse(S17MomentRules.takesSession("ixihelp", false), "never takes the session (6-arg form)");
        Assert.IsFalse(S17MomentRules.takesSession("ixihelp", true), "never takes the session (install bit set)");
        foreach (string other in new[] { "autodl", "offline", "mic", "app", "pay" })
        {
            Assert.IsTrue(S17MomentRules.takesSession(other) && S17MomentRules.takesSession(other, false), "the other non-exempt ids still take it: " + other);
            Assert.IsFalse(S17MomentRules.respectsButNeverTakes(other), other);
        }
        foreach (string id in S17MomentRules.Ids)
            Assert.AreEqual(id == "ixihelp", S17MomentRules.respectsButNeverTakes(id), "only ixihelp: " + id);
        // the walk case the audit found: "What is IXI?" granted (session NOT taken) → Send → the pay sheet still shows
        bool sessionMoment = false;
        Assert.AreEqual(S17MomentRules.Decision.Grant, S17MomentRules.decide("ixihelp", false, sessionMoment, false, Y));
        if (S17MomentRules.takesSession("ixihelp", false)) sessionMoment = true;
        Assert.AreEqual(S17MomentRules.Decision.Grant, S17MomentRules.decide("pay", false, sessionMoment, false, Y), "pay is not held back by ixihelp");
        // …and the other way round it still obeys: pay took the session → ixihelp waits for a later session
        if (S17MomentRules.takesSession("pay", false)) sessionMoment = true;
        Assert.AreEqual(S17MomentRules.Decision.Refuse, S17MomentRules.decide("ixihelp", false, sessionMoment, false, Y), "after pay → refuse");
        Assert.AreEqual(S17MomentRules.Decision.Grant, S17MomentRules.decide("ixihelp", false, false, false, Y), "fresh session → grant");
        Assert.AreEqual(S17MomentRules.Decision.Refuse, S17MomentRules.decide("ixihelp", false, true, false, Y), "a moment this session → refuse");
        Assert.AreEqual(S17MomentRules.Decision.Refuse, S17MomentRules.decide("ixihelp", false, false, true, Y), "a card this session → refuse");
        Assert.AreEqual(S17MomentRules.Decision.Refuse, S17MomentRules.decide("ixihelp", true, false, false, Y), "once per id");
        Assert.AreEqual(S17MomentRules.Decision.Refuse, S17MomentRules.decide("ixihelp", false, false, false, W), "wait → nothing stored");
        Assert.AreEqual("[MO] ask id=ixihelp d=refuse why=session", S17MomentRules.askLine("ixihelp", S17MomentRules.Decision.Refuse,
            S17MomentRules.why("ixihelp", false, true, false, Y)), "the fixed log line, read from the set");
        Assert.AreEqual("[MO] ask id=ixihelp d=refuse why=card", S17MomentRules.askLine("ixihelp", S17MomentRules.Decision.Refuse,
            S17MomentRules.why("ixihelp", false, false, true, Y)));
        Assert.AreEqual("[MO] ask id=ixihelp d=grant why=ok", S17MomentRules.askLine("ixihelp", S17MomentRules.Decision.Grant,
            S17MomentRules.why("ixihelp", false, false, false, Y)));
        // eligibility: home only, flag on
        Assert.AreEqual(Y, V1AMRules.ixiHelpEligible(true, true), "home, flag on");
        Assert.AreEqual(W, V1AMRules.ixiHelpEligible(true, false), "a chat / Settings / Contact details page waits");
        Assert.AreEqual(W, V1AMRules.ixiHelpEligible(false, true), "flag off waits (handleVerb returns before this anyway)");
        Assert.AreEqual(W, V1AMRules.ixiHelpEligible(false, false));
    }

    [TestMethod]
    public void m1_seen_is_stored_and_pushed_like_any_id()
    {
        Assert.IsTrue(S17MomentRules.isSeenId("ixihelp"), "a seen id (no argument)");
        string csv = S17MomentRules.addToList("firstixi,pay", "ixihelp", S17MomentRules.isSeenId, S17MomentRules.Ids.Length);
        Assert.AreEqual("firstixi,pay,ixihelp", csv, "added to moments.seen");
        Assert.AreEqual("autodl,offline,firstixi,mic,pay,ixihelp",
            string.Join(",", S17MomentRules.parseList("autodl,offline,firstixi,mic,pay,ixihelp", S17MomentRules.isSeenId)), "every seen id fits the cap");
        Assert.AreEqual("{\"seen\":[\"pay\",\"ixihelp\"],\"apps\":[],\"lang\":\"\",\"session\":false,\"sessionMs\":0}",
            S17MomentRules.pushJson(S17MomentRules.parseList(csv.Replace("firstixi,", ""), S17MomentRules.isSeenId), new List<string>(), "", false),
            "setMoments carries it (pushJson filters by the fixed set, which holds it)");
    }

    [TestMethod]
    public void m2_word_ids_ride_the_s11_whitelist_but_not_the_rotation()
    {
        Assert.AreEqual("wordrequest,wordphonebook", string.Join(",", S11HintRules.WordIds), "WordIds = word-tip.js WORD_TIP_IDS");
        Assert.AreEqual("backup,wallet,apps,addcontact,tip,network,quantum,nophone", string.Join(",", S11HintRules.TipIds),
            "TipIds (the rotation = glass-card.js HINT_IDS) is unchanged");
        foreach (string w in S11HintRules.WordIds)
        {
            Assert.IsTrue(S11HintRules.isWordId(w), "isWordId " + w);
            Assert.IsTrue(S11HintRules.isTipId(w), "isTipId admits " + w);
            Assert.IsTrue(S11HintRules.parseVerb("done:" + w, out string a, out string i) && a == "done" && i == w, "done:" + w);
            Assert.AreEqual(null, S11HintRules.helpUrlFor(w), "no Learn more for " + w);
        }
        foreach (string t in S11HintRules.TipIds) Assert.IsFalse(S11HintRules.isWordId(t), "a rotation tip is not a word id: " + t);
        foreach (string bad in new[] { "", "Wordrequest", "wordrequest ", "word", "wordphonebook,wordrequest", null! })
            Assert.IsFalse(S11HintRules.isWordId(bad), "not a word id: [" + bad + "]");
        Assert.AreEqual("network,wordrequest", S11HintRules.addDone("network", "wordrequest"), "the done list stores it");
        Assert.AreEqual("backup,wordphonebook", string.Join(",", S11HintRules.parseDone("backup,wordphonebook,evil")), "…and reads it back");
        Assert.AreEqual("{\"firstSeen\":1,\"lastShown\":0,\"done\":[\"wordrequest\",\"wordphonebook\"],\"off\":false,\"now\":2}",
            S11HintRules.pushJson(1, 0, new List<string> { "wordrequest", "wordphonebook", "wordx" }, false, 2), "setHints carries the word ids");
    }

    [TestMethod]
    public void m2_word_verb_is_the_s11_grammar_with_a_word_id_and_writes_done_only()
    {
        Assert.IsTrue(V1AMRules.parseWordTipVerb("ixian:hint:done:wordrequest", out string a, out string i) && a == "done" && i == "wordrequest");
        Assert.IsTrue(V1AMRules.parseWordTipVerb("ixian:hint:shown:wordphonebook", out a, out i) && a == "shown" && i == "wordphonebook", "shown parses (then is dropped)");
        foreach (string bad in new[] { "ixian:hint:done:backup", "ixian:hint:shown:network", "ixian:hint:done:wordrequest:x", "ixian:hint:Done:wordrequest",
            "ixian:hint:seen:wordrequest", "ixian:hint:done:", "ixian:hint:wordrequest", "ixian:hintHelp:wordrequest", "ixian:hint:done:wordrequestx",
            "xixian:hint:done:wordrequest", "", null! })
        {
            Assert.IsFalse(V1AMRules.parseWordTipVerb(bad, out string ba, out string bi), "not a word verb: [" + bad + "]");
            Assert.AreEqual("", ba + bi, "a refused verb yields nothing: [" + bad + "]");
        }
        // the dispatch is exact: a hint verb is a word verb ⇔ the S11 parse succeeds with a word id — the S11 branch never sees one
        foreach (string act in new[] { "shown", "done" })
            foreach (string id in new List<string>(S11HintRules.TipIds) { "wordrequest", "wordphonebook", "e2e" })
            {
                string url = "ixian:hint:" + act + ":" + id;
                bool s11 = S11HintRules.parseVerb(url.Substring("ixian:hint:".Length), out _, out string pid);
                Assert.AreEqual(s11 && S11HintRules.isWordId(pid), V1AMRules.parseWordTipVerb(url, out _, out _), url);
            }
        Assert.IsTrue(V1AMRules.wordTipMarksDone(true, "done"), "flag on: done writes");
        Assert.IsFalse(V1AMRules.wordTipMarksDone(true, "shown"), "shown NEVER writes (lastShown stays)");
        Assert.IsFalse(V1AMRules.wordTipMarksDone(false, "done"), "flag off: nothing");
        Assert.IsFalse(V1AMRules.wordTipMarksDone(false, "shown"));
        Assert.IsFalse(V1AMRules.wordTipMarksDone(true, null), "null");
        Assert.IsFalse(V1AMRules.wordTipMarksDone(true, "Done"), "exact");
    }

    [TestMethod]
    public void m2_store_keeps_the_word_done_and_never_lastShown()
    {
        string d = Path.Combine(Path.GetTempPath(), "csh-v1am-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(d);
        SLocalOnlyStore.folder = () => d;
        SLocalOnlyStore.resetForTests();
        try
        {
            SHints.ensureFirstSeen(1000);
            SHints.markShown(2000);   // a rotation tip went on screen earlier
            // the HomePage word branch, as written: parse, then markDone only when wordTipMarksDone
            foreach (string url in new[] { "ixian:hint:shown:wordrequest", "ixian:hint:done:wordrequest", "ixian:hint:done:wordphonebook" })
            {
                if (V1AMRules.parseWordTipVerb(url, out string act, out string id) && V1AMRules.wordTipMarksDone(true, act)) SHints.markDone(id);
            }
            Assert.IsTrue(SLocalOnlyStore.flush(), "the deferred write lands");
            SLocalOnlyStore.resetForTests();   // a restart
            Assert.AreEqual("wordrequest,wordphonebook", SLocalOnlyStore.get(SHints.KeyDone), "both word ids in the S11 done list");
            Assert.AreEqual("2000", SLocalOnlyStore.get(SHints.KeyLastShown), "lastShown untouched by the word tip's shown");
            Assert.AreEqual("{\"firstSeen\":1000,\"lastShown\":2000,\"done\":[\"wordrequest\",\"wordphonebook\"],\"off\":false,\"now\":3000}",
                SHints.pushJson(3000), "the next setHints carries them (word-tip.js wordTipsDone reads `done`)");
        }
        finally
        {
            SLocalOnlyStore.clearAll();
            try { Directory.Delete(d, true); } catch (Exception) { }
        }
    }

    [TestMethod]
    public void flags_two_lines_through_the_real_init_and_the_dev_push()
    {
        Assert.AreEqual("[FLAGS] v1ixihelp=1", V1AMRules.flagLineIxiHelp(true));
        Assert.AreEqual("[FLAGS] v1ixihelp=0", V1AMRules.flagLineIxiHelp(false));
        Assert.AreEqual("[FLAGS] v1hints=1", V1AMRules.flagLineHints(true));
        Assert.AreEqual("[FLAGS] v1hints=0", V1AMRules.flagLineHints(false));
        Assert.AreEqual("flagV1IxiHelp", SpixiFlags.V1IxiHelpKey);
        Assert.AreEqual("flagV1Hints", SpixiFlags.V1HintsKey);
        Preferences P = Preferences.Default;
        string? devBefore = P.d.TryGetValue("devMode", out var dv) ? dv : null;
        try
        {
            P.Remove(SpixiFlags.V1IxiHelpKey); P.Remove(SpixiFlags.V1HintsKey); P.Set("devMode", false);
            IXICore.Meta.Logging.lines.Clear();
            SpixiFlags.init();
            var L = IXICore.Meta.Logging.lines;
            Assert.IsTrue(SpixiFlags.V1IxiHelp && SpixiFlags.V1Hints, "absent = ON");
            int s20g = L.IndexOf("[FLAGS] s20g=1");
            Assert.IsTrue(s20g >= 0 && L.IndexOf("[FLAGS] v1ixihelp=1") == s20g + 1 && L.IndexOf("[FLAGS] v1hints=1") == s20g + 2,
                "one line each, right after the S20G line — " + string.Join("|", L));
            // a stored 0 acts ONLY in dev mode — and each pref drives its own flag
            P.Set(SpixiFlags.V1IxiHelpKey, 1); P.Set(SpixiFlags.V1HintsKey, 0);
            SpixiFlags.init();
            Assert.IsTrue(SpixiFlags.V1IxiHelp && SpixiFlags.V1Hints, "dev mode off: a stored 0 is ignored");
            P.Set("devMode", true);
            IXICore.Meta.Logging.lines.Clear();
            SpixiFlags.init();
            Assert.IsTrue(SpixiFlags.V1IxiHelp && !SpixiFlags.V1Hints, "dev mode on: hints OFF, ixihelp stays ON");
            Assert.IsTrue(IXICore.Meta.Logging.lines.Contains("[FLAGS] v1ixihelp=1") && IXICore.Meta.Logging.lines.Contains("[FLAGS] v1hints=0"), "the lines say so");
            P.Set(SpixiFlags.V1IxiHelpKey, 0); P.Set(SpixiFlags.V1HintsKey, 1);
            SpixiFlags.init();
            Assert.IsTrue(!SpixiFlags.V1IxiHelp && SpixiFlags.V1Hints, "dev mode on: ixihelp OFF, hints stays ON");
        }
        finally
        {
            P.Remove(SpixiFlags.V1IxiHelpKey); P.Remove(SpixiFlags.V1HintsKey);
            if (devBefore == null) P.Remove("devMode"); else P.d["devMode"] = devBefore;
            SpixiFlags.init();   // back to the defaults for every later test
            IXICore.Meta.Logging.lines.Clear();
        }
        Assert.IsTrue(SpixiFlags.V1IxiHelp && SpixiFlags.V1Hints, "restored");
        // the dev push: "<ixihelp>,<hints>" from the STORED ints (absent = 1; only a stored 0 reads 0)
        Assert.AreEqual("1,1", V1AMRules.devFlagsArg(1, 1));
        Assert.AreEqual("1,0", V1AMRules.devFlagsArg(1, 0));
        Assert.AreEqual("0,1", V1AMRules.devFlagsArg(0, 1));
        Assert.AreEqual("1,1", V1AMRules.devFlagsArg(7, -1), "a stray value reads 1 (the S16 rule)");
    }
}
