// EXECUTED: the REAL ImgurlFlags.read / flagsLine of Spixi/Utils/SpixiFlags.cs over the stubbed Preferences.
// Three switches: absent = ON, a stored 0 acts only in dev mode. Breaks (each red here): `effectiveFlag(dev, m)` → `m != 0`,
// `effectiveFlag(dev, k)` → `effectiveFlag(false, k)`, `effectiveFlag(dev, t)` → `t != 0` [stored_0_acts_only_in_dev_mode];
// `Get(TrimHookKey, 1)` → `, 0)` [absent_is_on]. Not killable here (equivalent): the initial `m = 1` etc. → 0 — only the
// catch keeps them, and the test store never throws (FLAGS_FROZEN of pins-fixb1/g-sparekeep holds the bytes).
using System;
using System.Collections.Generic;
using Microsoft.Maui.Storage;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class ImgurlFlagsTests
{
    private static Preferences P => Preferences.Default;

    private static int readWith(Action set)
    {
        var before = new Dictionary<string, string>(P.d);
        try
        {
            P.d.Clear();
            set();
            return ImgurlFlags.read();
        }
        finally
        {
            P.d.Clear();
            foreach (var kv in before) P.d[kv.Key] = kv.Value;
        }
    }

    [TestMethod]
    public void absent_is_on()
    {
        Assert.AreEqual(1 | 2 | 4, readWith(() => { }), "an empty store: the three switches ON");
        Assert.AreEqual(1 | 2 | 4, readWith(() => P.Set("devMode", true)), "dev mode alone changes nothing");
    }

    [TestMethod]
    public void stored_0_acts_only_in_dev_mode()
    {
        Assert.AreEqual(2 | 4, readWith(() => { P.Set("devMode", true); P.Set(ImgurlFlags.MediaOriginKey, 0); }), "dev mode + 0 → MediaOrigin OFF");
        Assert.AreEqual(1 | 4, readWith(() => { P.Set("devMode", true); P.Set(ImgurlFlags.MediaKeepKey, 0); }), "dev mode + 0 → MediaKeep OFF");
        Assert.AreEqual(1 | 2, readWith(() => { P.Set("devMode", true); P.Set(ImgurlFlags.TrimHookKey, 0); }), "dev mode + 0 → TrimHook OFF");
        Assert.AreEqual(1 | 2 | 4, readWith(() => { P.Set(ImgurlFlags.MediaOriginKey, 0); P.Set(ImgurlFlags.MediaKeepKey, 0); P.Set(ImgurlFlags.TrimHookKey, 0); }), "stored 0s without dev mode act not");
    }

    [TestMethod]
    public void the_line()
    {
        Assert.AreEqual("[FLAGS] imgurl mediaorigin=1 mediakeep=1 trimhook=1", ImgurlFlags.flagsLine(7));
        Assert.AreEqual("[FLAGS] imgurl mediaorigin=0 mediakeep=1 trimhook=0", ImgurlFlags.flagsLine(2));
    }
}
