// ★ S11 F (#1262) — the pure rules of the Apps tab pre-push, EXECUTED:
//   · S11AppsRules.appsPrePush / AppsPrePushDelayMs (the gate + the delay after the wallet's)
//   · S11AppsRules.reloadChatPages (the pre-push of an unchanged list never reloads a chat page)
//   · S11AppsRules.prePushLine / firstVisitLine (the TEMPORARY [P1] bodies pass the P1Perf grammar)
//   · S10FixRules.PrePushGate reused as a SECOND instance (the apps gate is independent of the wallet's)
//   · ★ S11 A2 (#1263): appsLatchAfterBurst (R1-m2) · the [P1] bodies under a culture with its own minus sign (R1-n1)
// The call site is MAUI-bound (HomePage.scheduleAppsPrePush / enterAppsTab / loadApps).
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class S11AppsTests
{
    [TestMethod]
    public void apps_pre_push_only_unfed_and_off_the_apps_tab()
    {
        Assert.IsTrue(S11AppsRules.appsPrePush(false, "tab1"), "never fed, on Chats → pre-push");
        Assert.IsTrue(S11AppsRules.appsPrePush(false, "tab2"), "never fed, on Wallet → pre-push");
        Assert.IsTrue(S11AppsRules.appsPrePush(false, "tab4"), "never fed, on Account → pre-push");
        Assert.IsTrue(S11AppsRules.appsPrePush(false, null), "never fed, no tab known → pre-push");
        Assert.IsFalse(S11AppsRules.appsPrePush(true, "tab1"), "already fed → nothing");
        Assert.IsFalse(S11AppsRules.appsPrePush(false, "tab3"), "on the Apps tab → its own entry pushed");
        Assert.IsFalse(S11AppsRules.appsPrePush(true, "tab3"), "fed and on Apps → nothing");
    }

    [TestMethod]
    public void apps_pre_push_comes_after_the_wallet_burst()
    {
        Assert.AreEqual(2000, S11AppsRules.AppsPrePushDelayMs, "APPS_PRE_PUSH_DELAY_MS");
        Assert.IsTrue(S11AppsRules.AppsPrePushDelayMs > S10FixRules.PrePushDelayMs, "the apps burst never shares the wallet's moment");
    }

    [TestMethod]
    public void pre_push_of_an_unchanged_list_does_not_reload_chat_pages()
    {
        Assert.IsFalse(S11AppsRules.reloadChatPages(false, true), "pre-push, list unchanged → no chat reload (no loadMessages 2 s after boot)");
        Assert.IsTrue(S11AppsRules.reloadChatPages(true, true), "pre-push, but an install raised shouldRefreshApps → reload");
        Assert.IsTrue(S11AppsRules.reloadChatPages(false, false), "tab entry / tick → reload as before");
        Assert.IsTrue(S11AppsRules.reloadChatPages(true, false), "tick after an install → reload as before");
    }

    [TestMethod]
    public void apps_gate_is_its_own_instance()
    {
        var wallet = new S10FixRules.PrePushGate();
        var apps = new S10FixRules.PrePushGate();
        Assert.IsFalse(wallet.onLoaded(1), "wallet: onload first");
        Assert.IsFalse(apps.onLoaded(1), "apps: onload first");
        Assert.IsTrue(wallet.onDropped(1), "wallet fires on bootDropped");
        Assert.IsTrue(apps.onDropped(1), "apps fires on the same bootDropped — the wallet's fire did not consume it");
        Assert.IsFalse(apps.onDropped(1), "once per generation");
    }

    [TestMethod]
    public void p1_lines_pass_the_grammar()
    {
        string a = S11AppsRules.prePushLine(2, 37);
        Assert.AreEqual("apps prepush n=2 ms=37", a);
        Assert.IsTrue(P1Perf.isValidLine("[P1] " + a), "prepush line is a valid [P1] line");
        string b = S11AppsRules.firstVisitLine(true, 2, 5400, 1);
        Assert.AreEqual("apps tab first prepushed=1 n=2 ms=5400 entry=1", b);
        Assert.IsTrue(P1Perf.isValidLine("[P1] " + b), "first-visit line is a valid [P1] line");
        string c = S11AppsRules.firstVisitLine(false, 0, -7, -3);
        Assert.AreEqual("apps tab first prepushed=0 n=0 ms=-1 entry=0", c, "no bootDropped → ms=-1; negatives clamp");
        Assert.IsTrue(P1Perf.isValidLine("[P1] " + c));
        Assert.AreEqual("apps prepush n=0 ms=0", S11AppsRules.prePushLine(-1, -5), "negatives clamp to 0");
    }

    [TestMethod]
    public void apps_latch_only_for_the_document_the_burst_was_for()
    {
        Assert.IsTrue(S11AppsRules.appsLatchAfterBurst(true, 4, 4), "loaded, same document → latched");
        Assert.IsFalse(S11AppsRules.appsLatchAfterBurst(true, 4, 5), "a reload bumped the generation during the burst → NOT latched (the fresh document still gets its push)");
        Assert.IsFalse(S11AppsRules.appsLatchAfterBurst(false, 4, 4), "page not loaded → the queued rows are dropped by Dispose → NOT latched (#340)");
        Assert.IsFalse(S11AppsRules.appsLatchAfterBurst(false, 4, 5), "neither");
    }

    [TestMethod]
    public void p1_lines_are_culture_invariant()
    {
        var saved = System.Globalization.CultureInfo.CurrentCulture;
        try
        {
            var c = (System.Globalization.CultureInfo)System.Globalization.CultureInfo.InvariantCulture.Clone();
            c.NumberFormat.NegativeSign = "\u2212";   // a culture whose minus sign is not ASCII (sv-SE / fa-IR use one)
            System.Globalization.CultureInfo.CurrentCulture = c;
            Assert.AreEqual("apps tab first prepushed=0 n=3 ms=-1 entry=0", S11AppsRules.firstVisitLine(false, 3, -9, 0), "ms=-1 with an ASCII minus whatever the culture");
            Assert.IsTrue(P1Perf.isValidLine("[P1] " + S11AppsRules.firstVisitLine(false, 3, -9, 0)));
            Assert.AreEqual("apps prepush n=12 ms=4500", S11AppsRules.prePushLine(12, 4500));
        }
        finally
        {
            System.Globalization.CultureInfo.CurrentCulture = saved;
        }
    }
}
