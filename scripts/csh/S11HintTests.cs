// ★ S11 A (#1262) — the Chats-list hint counters, EXECUTED: the verb / switch parsers (S11HintRules), the stored values
// and the setHints push, and the store itself (SHints over SLocalOnlyStore — the same backup-excluded file, so the
// account wipe's SLocalOnlyStore.clearAll() takes the hints with it). The call sites (HomePage ixian:hint: + setHints,
// SettingsPage ixian:hintsoff:) are pinned by scripts/pins-s11/a-cs.mjs; the shell's tip choice by a-hints.mjs.
using System;
using System.Collections.Generic;
using System.IO;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;
using SPIXI.Meta;

[TestClass]
public class S11HintTests
{
    [TestMethod]
    public void the_verb_is_one_action_and_one_whitelisted_id()
    {
        Assert.IsTrue(S11HintRules.parseVerb("shown:backup", out string a, out string id) && a == "shown" && id == "backup", "shown:backup");
        Assert.IsTrue(S11HintRules.parseVerb("done:addcontact", out string a2, out string id2) && a2 == "done" && id2 == "addcontact", "done:addcontact");
        foreach (string t in S11HintRules.TipIds)
        {
            Assert.IsTrue(S11HintRules.parseVerb("done:" + t, out _, out string x) && x == t, "every tip id: " + t);
        }
        string[] bad =
        {
            "", "shown", "shown:", ":backup", "Shown:backup", "shown:Backup", "shown:backup ", " shown:backup",
            "shown:backup:x", "seen:backup", "done:network", "done:../../wallet.ixi", "done:tip\n", "done:wallet,apps",
            "shown:ｂackup", "done:" + new string('a', 40),
        };
        foreach (string b in bad)
        {
            Assert.IsFalse(S11HintRules.parseVerb(b, out string ra, out string ri), "refused: [" + b + "]");
            Assert.AreEqual("", ra + ri, "a refused verb yields nothing: [" + b + "]");
        }
        Assert.IsFalse(S11HintRules.parseVerb(null, out _, out _), "null");
    }

    [TestMethod]
    public void the_switch_is_exactly_0_or_1()
    {
        Assert.IsTrue(S11HintRules.parseOff("1", out bool off1) && off1, "1 = hints OFF");
        Assert.IsTrue(S11HintRules.parseOff("0", out bool off0) && !off0, "0 = hints on");
        foreach (string b in new[] { "", "on", "off", "true", "2", " 1", "1 ", "01", "-1" })
        {
            Assert.IsFalse(S11HintRules.parseOff(b, out bool o) || o, "refused: [" + b + "]");
        }
        Assert.IsFalse(S11HintRules.parseOff(null, out _), "null");
    }

    [TestMethod]
    public void stored_values_and_the_clock()
    {
        Assert.AreEqual(0L, S11HintRules.parseMs(""), "empty → 0");
        Assert.AreEqual(0L, S11HintRules.parseMs("-5"), "a sign → 0");
        Assert.AreEqual(0L, S11HintRules.parseMs("12a"), "garbage → 0");
        Assert.AreEqual(0L, S11HintRules.parseMs("12345678901234567"), "17 digits → 0");
        Assert.AreEqual(1791408240000L, S11HintRules.parseMs("1791408240000"), "ms round-trip");
        Assert.AreEqual("1791408240000", S11HintRules.formatMs(1791408240000L), "invariant digits");
        Assert.AreEqual("", S11HintRules.formatMs(0), "0 → absent");
        Assert.AreEqual(500L, S11HintRules.firstSeenFix(0, 500), "missing firstSeen → now");
        Assert.AreEqual(300L, S11HintRules.firstSeenFix(300, 500), "a past firstSeen is kept");
        Assert.AreEqual(500L, S11HintRules.firstSeenFix(900, 500), "a FUTURE firstSeen (clock moved back) → now — never frozen");
        Assert.AreEqual(0L, S11HintRules.lastShownFix(0, 500), "never shown → 0");
        Assert.AreEqual(300L, S11HintRules.lastShownFix(300, 500), "a past lastShown is kept");
        Assert.AreEqual(500L, S11HintRules.lastShownFix(900, 500), "a FUTURE lastShown → now");
    }

    [TestMethod]
    public void the_done_list_holds_whitelisted_ids_once()
    {
        CollectionEqual(new List<string> { "wallet", "backup" }, S11HintRules.parseDone("wallet,backup,wallet,network,,Backup"), "order kept, duplicates + unknown + case-changed dropped");
        Assert.AreEqual("backup", S11HintRules.addDone("", "backup"), "first id");
        Assert.AreEqual("backup,tip", S11HintRules.addDone("backup", "tip"), "appended");
        Assert.AreEqual("backup", S11HintRules.addDone("backup", "backup"), "once");
        Assert.AreEqual("backup", S11HintRules.addDone("backup", "evil"), "an unknown id changes nothing");
        Assert.AreEqual("backup", S11HintRules.addDone("backup", null), "null changes nothing");
    }

    [TestMethod]
    public void the_push_is_numbers_whitelisted_ids_and_a_bool()
    {
        Assert.AreEqual("{\"firstSeen\":100,\"lastShown\":0,\"done\":[],\"off\":false,\"now\":200}",
            S11HintRules.pushJson(100, 0, new List<string>(), false, 200), "empty state");
        Assert.AreEqual("{\"firstSeen\":100,\"lastShown\":150,\"done\":[\"backup\",\"tip\"],\"off\":true,\"now\":200}",
            S11HintRules.pushJson(100, 150, new List<string> { "backup", "x\"],\"off\":false,\"y\":[\"", "tip" }, true, 200),
            "a non-whitelisted value never reaches the JSON (no escaping question can arise)");
        Assert.AreEqual("{\"firstSeen\":0,\"lastShown\":0,\"done\":[],\"off\":false,\"now\":0}",
            S11HintRules.pushJson(-1, -1, new List<string>(), false, -1), "negative → 0");
    }

    [TestMethod]
    public void the_store_round_trips_and_rides_the_account_wipe()
    {
        string d = Path.Combine(Path.GetTempPath(), "csh-hints-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(d);
        SLocalOnlyStore.folder = () => d;
        SLocalOnlyStore.resetForTests();
        try
        {
            Assert.AreEqual(1000L, SHints.ensureFirstSeen(1000), "the first load writes firstSeen = now");
            Assert.AreEqual(1000L, SHints.ensureFirstSeen(5000), "a later load keeps it");
            SHints.markShown(2000);
            SHints.markDone("backup");
            SHints.markDone("evil");
            SHints.markDone("wallet");
            SHints.off = true;
            Assert.IsTrue(SLocalOnlyStore.flush(), "the deferred write lands");
            SLocalOnlyStore.resetForTests();   // a restart: read back from disk
            Assert.AreEqual("1000", SLocalOnlyStore.get(SHints.KeyFirstSeen), "firstSeen on disk (key prefix hints.)");
            Assert.AreEqual("backup,wallet", SLocalOnlyStore.get(SHints.KeyDone), "only whitelisted ids were stored");
            Assert.IsTrue(SHints.off, "off survives a restart");
            Assert.AreEqual("{\"firstSeen\":1000,\"lastShown\":2000,\"done\":[\"backup\",\"wallet\"],\"off\":true,\"now\":6000}",
                SHints.pushJson(6000), "the push carries the stored state");
            SHints.off = false;
            SLocalOnlyStore.flush();
            Assert.AreEqual("", SLocalOnlyStore.get(SHints.KeyOff), "hints on = the key removed");
            Assert.AreEqual(1500L, SHints.lastShown(1500), "a lastShown ahead of the clock reads as now");
            SLocalOnlyStore.clearAll();
            Assert.IsFalse(File.Exists(Path.Combine(d, "localonly.json")), "the account wipe (SLocalOnlyStore.clearAll) deletes the file");
            Assert.AreEqual("{\"firstSeen\":7000,\"lastShown\":0,\"done\":[],\"off\":false,\"now\":7000}",
                SHints.pushJson(7000), "…and with it every hint counter (a wiped account starts its 3 days again)");
        }
        finally
        {
            SLocalOnlyStore.clearAll();
            try { Directory.Delete(d, true); } catch (Exception) { }
        }
    }

    static void CollectionEqual(List<string> e, List<string> a, string m)
    {
        Assert.AreEqual(string.Join(",", e), string.Join(",", a), m);
    }
}
