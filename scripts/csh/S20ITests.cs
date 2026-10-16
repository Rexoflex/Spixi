// ★ S20I (Drop D, P32) — the "How people find you" moment's C# rules, EXECUTED: `addrhelp` in the S17 moment set (the exact
// ask grammar, the session rule — obeyed, never taken, the ixihelp rule — the fixed log line, the seen store + push), the
// eligibility (a Settings page ON SCREEN, flag on — every account, Damir 23:38) and the [FLAGS] line
// through the REAL SpixiFlags.init (absent = ON, a stored 0 acts only in dev mode). The MAUI call sites (SettingsPage
// setCaps, SMoments.handleVerb / answerAsync) are pinned on source by scripts/pins-s20i/f-addrhelp.mjs.
// DELIBERATE BREAKS (S20I CS report): ① "addrhelp" out of S17MomentRules.Ids → parse_ask fails; ② respectsButNeverTakes
// without addrhelp → session_rule fails ("never takes the session"); ③ addrHelpEligible without `onSettingsShown` (a hidden
// warm page answered Yes) → eligibility fails; ④ SpixiFlags.init reading S20AddrHelp from vi → flags fails.
using System;
using System.Collections.Generic;
using Microsoft.Maui.Storage;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class S20ITests
{
    [TestMethod]
    public void parse_ask_takes_addrhelp_with_no_argument_only()
    {
        Assert.IsTrue(S17MomentRules.parseAsk("ixian:moment:addrhelp", out string id, out string arg), "the ask");
        Assert.AreEqual("addrhelp", id);
        Assert.AreEqual("", arg, "no argument");
        Assert.AreEqual(S20IRules.AddrHelpId, id, "the S20IRules constant is the same literal");
        foreach (string bad in new[] { "ixian:moment:addrhelp:x", "ixian:moment:addrhelp:", "ixian:moment:ADDRHELP", "ixian:moment:addrhelp ",
            "ixian:moment:addr", "ixian:moment:addrhelpx", "ixian:momentaddrhelp", "ixian:moment:addrhelp:de-de" })
        {
            Assert.IsFalse(S17MomentRules.parseAsk(bad, out string bi, out string ba), "refused: [" + bad + "]");
            Assert.AreEqual("", bi + ba, "a refused ask yields nothing: [" + bad + "]");
        }
        Assert.IsTrue(Array.IndexOf(S17MomentRules.Ids, "addrhelp") >= 0, "in the ONE fixed id set");
    }

    [TestMethod]
    public void session_rule_obeyed_but_never_taken()
    {
        var Y = S17MomentRules.Eligible.Yes;
        Assert.IsFalse(S17MomentRules.exemptFromSession("addrhelp"), "not exempt");
        Assert.IsFalse(S17MomentRules.takesSession("addrhelp"), "never takes the session");
        Assert.IsFalse(S17MomentRules.takesSession("addrhelp", false), "never takes the session (6-arg form)");
        Assert.IsTrue(S17MomentRules.respectsButNeverTakes("addrhelp"), "the ixihelp rule");
        Assert.AreEqual(S17MomentRules.Decision.Grant, S17MomentRules.decide("addrhelp", false, false, false, Y), "fresh → grant");
        Assert.AreEqual(S17MomentRules.Decision.Refuse, S17MomentRules.decide("addrhelp", false, true, false, Y), "a moment this session → refuse");
        Assert.AreEqual(S17MomentRules.Decision.Refuse, S17MomentRules.decide("addrhelp", false, false, true, Y), "a card this session → refuse");
        Assert.AreEqual(S17MomentRules.Decision.Refuse, S17MomentRules.decide("addrhelp", true, false, false, Y), "once per id");
        // "How people find you" granted → the pay sheet is not held back (the session was not taken)
        bool sessionMoment = false;
        if (S17MomentRules.takesSession("addrhelp", false)) sessionMoment = true;
        Assert.AreEqual(S17MomentRules.Decision.Grant, S17MomentRules.decide("pay", false, sessionMoment, false, Y), "pay is not held back by addrhelp");
        Assert.AreEqual("[MO] ask id=addrhelp d=grant why=ok", S17MomentRules.askLine("addrhelp", S17MomentRules.Decision.Grant,
            S17MomentRules.why("addrhelp", false, false, false, Y)), "the fixed log line, read from the set");
        Assert.AreEqual("[MO] ask id=addrhelp d=refuse why=wait", S17MomentRules.askLine("addrhelp", S17MomentRules.Decision.Refuse,
            S17MomentRules.why("addrhelp", false, false, false, S17MomentRules.Eligible.Wait)), "the warm hidden page: refuse why=wait");
    }

    [TestMethod]
    public void eligibility_a_settings_page_on_screen_every_account()
    {
        var Y = S17MomentRules.Eligible.Yes; var W = S17MomentRules.Eligible.Wait;
        Assert.AreEqual(Y, S20IRules.addrHelpEligible(true, true), "Settings on screen, flag on — any account (Damir 23:38)");
        Assert.AreEqual(W, S20IRules.addrHelpEligible(true, false), "another page, or the warm HIDDEN Account page, waits (nothing stored)");
        Assert.AreEqual(W, S20IRules.addrHelpEligible(false, true), "flag off waits (handleVerb returns before this anyway)");
        Assert.AreEqual(W, S20IRules.addrHelpEligible(false, false));
    }

    [TestMethod]
    public void seen_is_stored_and_pushed_like_any_id()
    {
        Assert.IsTrue(S17MomentRules.isSeenId("addrhelp"), "a seen id (no argument)");
        string csv = S17MomentRules.addToList("firstixi,ixihelp", "addrhelp", S17MomentRules.isSeenId, S17MomentRules.Ids.Length);
        Assert.AreEqual("firstixi,ixihelp,addrhelp", csv, "added to moments.seen");
        Assert.AreEqual("{\"seen\":[\"ixihelp\",\"addrhelp\"],\"apps\":[],\"lang\":\"\",\"session\":false,\"sessionMs\":0}",
            S17MomentRules.pushJson(S17MomentRules.parseList(csv.Replace("firstixi,", ""), S17MomentRules.isSeenId), new List<string>(), "", false),
            "setMoments carries it");
    }

    [TestMethod]
    public void flag_line_through_the_real_init()
    {
        Assert.AreEqual("[FLAGS] s20addrhelp=1", S20IRules.flagLineAddrHelp(true));
        Assert.AreEqual("[FLAGS] s20addrhelp=0", S20IRules.flagLineAddrHelp(false));
        Assert.AreEqual("flagS20AddrHelp", SpixiFlags.S20AddrHelpKey);
        Preferences P = Preferences.Default;
        string? devBefore = P.d.TryGetValue("devMode", out var dv) ? dv : null;
        try
        {
            P.Remove(SpixiFlags.S20AddrHelpKey); P.Remove(SpixiFlags.V1IxiHelpKey); P.Set("devMode", false);
            IXICore.Meta.Logging.lines.Clear();
            SpixiFlags.init();
            var L = IXICore.Meta.Logging.lines;
            Assert.IsTrue(SpixiFlags.S20AddrHelp, "absent = ON");
            int hints = L.IndexOf("[FLAGS] v1hints=1");
            Assert.IsTrue(hints >= 0 && L.IndexOf("[FLAGS] s20addrhelp=1") == hints + 1, "one line, right after the V1A-M hints line — " + string.Join("|", L));
            P.Set(SpixiFlags.S20AddrHelpKey, 0);
            SpixiFlags.init();
            Assert.IsTrue(SpixiFlags.S20AddrHelp, "dev mode off: a stored 0 is ignored");
            P.Set("devMode", true);
            P.Set(SpixiFlags.V1IxiHelpKey, 1);
            IXICore.Meta.Logging.lines.Clear();
            SpixiFlags.init();
            Assert.IsTrue(!SpixiFlags.S20AddrHelp && SpixiFlags.V1IxiHelp, "dev mode on: addrhelp OFF, its own pref only (ixihelp stays ON)");
            Assert.IsTrue(IXICore.Meta.Logging.lines.Contains("[FLAGS] s20addrhelp=0"), "the line says so");
        }
        finally
        {
            P.Remove(SpixiFlags.S20AddrHelpKey); P.Remove(SpixiFlags.V1IxiHelpKey);
            if (devBefore == null) P.Remove("devMode"); else P.d["devMode"] = devBefore;
            SpixiFlags.init();
            IXICore.Meta.Logging.lines.Clear();
        }
        Assert.IsTrue(SpixiFlags.S20AddrHelp, "restored");
    }
}
