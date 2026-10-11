// ★ S16 (#1311 (a) / (c)) — the pure half of the S16 fixes, EXECUTED (Spixi/Utils/S16FixRules.cs): the [THEME] words (theme
// name, night bits, the cfg pair, gen-stale) and the once-per-transfer-id re-arm (rearmLeg's order + the RearmLedger claim).
// The call sites (App.xaml.cs, UIHelpers.cs, MainActivity.cs, SpixiContentPage.generatePage, SpixiLocalStorageCallbacks,
// TransferManager) are MAUI / Core-bound — scripts/pins-s16/c-fix.mjs.
using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class S16FixTests
{
    [TestMethod]
    public void theme_word_is_a_fixed_word_never_the_value()
    {
        Assert.AreEqual("dark", S16FixRules.themeWord("dark"));
        Assert.AreEqual("light", S16FixRules.themeWord("light"));
        Assert.AreEqual("?", S16FixRules.themeWord(null), "an unseeded carrier");
        Assert.AreEqual("?", S16FixRules.themeWord("Dark"), "case is not guessed");
        Assert.AreEqual("?", S16FixRules.themeWord("dark;rm -rf"), "anything else never reaches the log");
        Assert.AreEqual("?", S16FixRules.themeWord(""), "empty");
    }

    [TestMethod]
    public void gen_stale_only_when_baked_and_live_differ()
    {
        Assert.IsFalse(S16FixRules.genStale("light", "light"));
        Assert.IsFalse(S16FixRules.genStale("dark", "dark"));
        Assert.IsTrue(S16FixRules.genStale("light", "dark"), "a dark app baking a light document");
        Assert.IsTrue(S16FixRules.genStale("dark", "light"), "the reverse");
        Assert.IsTrue(S16FixRules.genStale(null, "light"), "an unseeded carrier is stale too");
    }

    [TestMethod]
    public void night_bits_map_to_night_day_or_unknown()
    {
        Assert.AreEqual("night", S16FixRules.nightWord(0x21), "UI_MODE_NIGHT_YES | TYPE_NORMAL");
        Assert.AreEqual("day", S16FixRules.nightWord(0x11), "UI_MODE_NIGHT_NO | TYPE_NORMAL");
        Assert.AreEqual("?", S16FixRules.nightWord(0x01), "UI_MODE_NIGHT_UNDEFINED");
        Assert.AreEqual("?", S16FixRules.nightWord(0x31), "both bits = not a defined value");
        Assert.AreEqual("?", S16FixRules.nightWord(null), "not read / not Android");
        Assert.AreEqual("night", S16FixRules.nightWord(0x24), "the type bits never decide (TYPE_TELEVISION)");
    }

    [TestMethod]
    public void cfg_pair_has_the_line_grammar()
    {
        Assert.AreEqual("cfgAct=night cfgApp=day", S16FixRules.cfgWords(0x21, 0x11), "activity and application can disagree — that is the point");
        Assert.AreEqual("cfgAct=? cfgApp=?", S16FixRules.cfgWords(null, null), "the non-Android form");
        Assert.AreEqual(1, S16FixRules.bit(true));
        Assert.AreEqual(0, S16FixRules.bit(false));
    }

    [TestMethod]
    public void rearm_order_an_outgoing_id_never_spends_its_claim()
    {
        int claims = 0;
        Func<string, bool> claim = (u) => { claims++; return true; };
        Assert.AreEqual(S16FixRules.RearmLeg.NoId, S16FixRules.rearmLeg(null, (u) => throw new InvalidOperationException("not asked"), claim), "null id");
        Assert.AreEqual(S16FixRules.RearmLeg.NoId, S16FixRules.rearmLeg("", (u) => throw new InvalidOperationException("not asked"), claim), "empty id");
        Assert.AreEqual(0, claims, "no id → nothing claimed");
        Assert.AreEqual(S16FixRules.RearmLeg.Outgoing, S16FixRules.rearmLeg("t1", (u) => true, claim), "already prepared → quiet");
        Assert.AreEqual(0, claims, "an outgoing id is not claimed");
        Assert.AreEqual(S16FixRules.RearmLeg.Tried, S16FixRules.rearmLeg("t1", (u) => false, (u) => false), "claimed before → quiet");
        Assert.AreEqual(S16FixRules.RearmLeg.Arm, S16FixRules.rearmLeg("t1", (u) => false, claim), "first time → arm");
        Assert.AreEqual(1, claims);
    }

    [TestMethod]
    public void rearm_ledger_claims_once_per_id_until_cleared()
    {
        S16FixRules.RearmLedger l = new S16FixRules.RearmLedger();
        Assert.IsTrue(l.claim("a"), "first");
        Assert.IsFalse(l.claim("a"), "second");
        Assert.IsTrue(l.claim("A"), "ordinal: another id");
        Assert.IsFalse(l.claim(null), "null never claims");
        Assert.IsFalse(l.claim(""), "empty never claims");
        Assert.AreEqual(2, l.count);
        l.clear();
        Assert.AreEqual(0, l.count);
        Assert.IsTrue(l.claim("a"), "after the manager's stop cleanup, once again");
    }

    [TestMethod]
    public void rearm_ledger_is_once_under_concurrency()
    {
        S16FixRules.RearmLedger l = new S16FixRules.RearmLedger();
        int wins = 0;
        Parallel.For(0, 2000, (i) => { if (l.claim("same")) Interlocked.Increment(ref wins); });
        Assert.AreEqual(1, wins, "TryAdd: one winner across threads");
    }

    [TestMethod]
    public void rearm_ledger_release_gives_the_id_back()
    {
        S16FixRules.RearmLedger l = new S16FixRules.RearmLedger();
        Assert.IsTrue(l.claim("a"));
        Assert.IsTrue(l.release("a"), "released");
        Assert.IsFalse(l.release("a"), "nothing left to release");
        Assert.IsFalse(l.release(null), "null");
        Assert.IsTrue(l.claim("a"), "claimable again");
    }

    [TestMethod]
    public void rearm_failure_keeps_the_claim_only_when_the_source_is_gone()
    {
        Assert.IsTrue(S16FixRules.rearmKeepsClaim(new FileNotFoundException()), "the 1 436-line case");
        Assert.IsTrue(S16FixRules.rearmKeepsClaim(new DirectoryNotFoundException()), "the folder is gone");
        Assert.IsFalse(S16FixRules.rearmKeepsClaim(new IOException("sharing violation")), "Windows AV / indexer");
        Assert.IsFalse(S16FixRules.rearmKeepsClaim(new UnauthorizedAccessException()), "iOS protected data in the background");
        Assert.IsFalse(S16FixRules.rearmKeepsClaim(new InvalidOperationException()), "anything else is retried");
    }

    [TestMethod]
    public void rearm_transient_failure_retries_on_the_next_load_and_logs_once()
    {
        S16FixRules.RearmLedger claims = new S16FixRules.RearmLedger();
        S16FixRules.RearmLedger logged = new S16FixRules.RearmLedger();
        int arms = 0, lines = 0;
        for (int load = 0; load < 5; load++)
        {
            if (S16FixRules.rearmLeg("busy", (u) => false, claims.claim) != S16FixRules.RearmLeg.Arm)
            {
                continue;
            }
            arms++;
            if (S16FixRules.rearmFailure("busy", new IOException("sharing violation"), claims, logged))
            {
                lines++;
            }
        }
        Assert.AreEqual(5, arms, "every load tries again (it used to stay claimed until a restart)");
        Assert.AreEqual(1, lines, "one error line per id");
        Assert.IsTrue(S16FixRules.rearmLeg("busy", (u) => false, claims.claim) == S16FixRules.RearmLeg.Arm, "the file is still deliverable");
    }

    [TestMethod]
    public void rearm_final_failure_stays_claimed_and_logs_once()
    {
        S16FixRules.RearmLedger claims = new S16FixRules.RearmLedger();
        S16FixRules.RearmLedger logged = new S16FixRules.RearmLedger();
        int arms = 0, lines = 0;
        for (int load = 0; load < 1436; load++)
        {
            if (S16FixRules.rearmLeg("gone", (u) => false, claims.claim) != S16FixRules.RearmLeg.Arm)
            {
                continue;
            }
            arms++;
            if (S16FixRules.rearmFailure("gone", new FileNotFoundException(), claims, logged))
            {
                lines++;
            }
        }
        Assert.AreEqual(1, arms, "one open per id per session");
        Assert.AreEqual(1, lines, "one error line");
    }

    [TestMethod]
    public void the_windows_log_case_1436_loads_arm_once()
    {
        // #1311 (c): the source is gone, so every arm fails (the file open throws) — the callback ran on every message load.
        S16FixRules.RearmLedger l = new S16FixRules.RearmLedger();
        int arms = 0;
        for (int i = 0; i < 1436; i++)
        {
            if (S16FixRules.rearmLeg("gone", (u) => false, l.claim) == S16FixRules.RearmLeg.Arm)
            {
                arms++;
            }
        }
        Assert.AreEqual(1, arms, "one open, one error line per id per session (was 1 436)");
    }
}
