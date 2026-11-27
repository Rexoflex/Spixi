// EXECUTED: the REAL MacfixaFlags block of Spixi/Utils/SpixiFlags.cs over the stubbed Preferences / Logging.
// Shown: the three keys; absent = ON; a stored 0 acts only in dev mode; each key is its own switch (and another batch's
// stored 0 changes none); the [FLAGS] line text for all 8 states; read() logs nothing; the switches are read lazily, once per
// process, with ONE line at the first read; a store that throws keeps all three ON.
// NOT shown: the call sites (the Mac share, the home icon line, the setCaps word) — pins-macfixa/<a-mac-save|b-icon> and the
// smoke's setCaps rows read those.
// DELIBERATE BREAKS (one mutation each in a copy, then node scripts/run-csh.mjs; the red tests in brackets):
//   m1 on() `Get(key, 1)` → `Get(key, 0)` [mf_absent_is_all_on, mf_each_key_is_its_own_switch, mf_read_lazily_one_line_per_process]
//   m2 SwipeTouchLock `(bits() & 4)` → `(bits() & 2)` [mf_each_key_is_its_own_switch, mf_read_lazily_one_line_per_process]
//   m3 flagsLine `" swipelock="` → `" swipe="` [mf_line_text_all_8]
//   m4 read `return 7;` → `return 3;` [mf_a_throwing_store_keeps_all_on]
using System;
using System.Collections.Generic;
using System.Reflection;
using Microsoft.Maui.Storage;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class MacfixaFlagsTests
{
    private static Preferences P => Preferences.Default;
    private static List<string> Lines => IXICore.Meta.Logging.lines;

    private static void freshProcess()
    {
        typeof(MacfixaFlags).GetField("state", BindingFlags.NonPublic | BindingFlags.Static)!.SetValue(null, -1);
        Lines.Clear();
    }

    /** One body over its own preference dictionary; the dictionary found is put back. */
    private static void store(Action body)
    {
        var before = new Dictionary<string, string>(P.d);
        try
        {
            P.d.Clear();
            freshProcess();
            body();
        }
        finally
        {
            P.d.Clear();
            foreach (var kv in before) P.d[kv.Key] = kv.Value;
            freshProcess();
        }
    }

    /** read() with devMode / the three keys (null = absent), as "msw" bits; asserts that read() logs nothing. */
    private static string bitsWith(bool? dev, int? m, int? i, int? w)
    {
        P.d.Clear();
        if (dev != null) P.Set("devMode", dev.Value);
        if (m != null) P.Set(MacfixaFlags.MacSaveToFolderKey, m.Value);
        if (i != null) P.Set(MacfixaFlags.AppIconReencodeKey, i.Value);
        if (w != null) P.Set(MacfixaFlags.SwipeTouchLockKey, w.Value);
        Lines.Clear();
        int b = MacfixaFlags.read();
        Assert.AreEqual(0, Lines.Count, "read() logs nothing");
        return ((b & 1) != 0 ? "1" : "0") + ((b & 2) != 0 ? "1" : "0") + ((b & 4) != 0 ? "1" : "0");
    }

    [TestMethod]
    public void mf_keys()
    {
        Assert.AreEqual("flagMacSaveToFolder", MacfixaFlags.MacSaveToFolderKey);
        Assert.AreEqual("flagAppIconReencode", MacfixaFlags.AppIconReencodeKey);
        Assert.AreEqual("flagSwipeTouchLock", MacfixaFlags.SwipeTouchLockKey);
    }

    [TestMethod]
    public void mf_absent_is_all_on()
    {
        store(() =>
        {
            foreach (bool? dev in new bool?[] { null, false, true })
            {
                Assert.AreEqual("111", bitsWith(dev, null, null, null), "no key (dev " + dev + ") → all ON");
            }
            foreach (int v in new[] { 1, 2, -1, int.MaxValue, int.MinValue })
            {
                Assert.AreEqual("111", bitsWith(true, v, v, v), "stored " + v + " in dev mode → ON: only a 0 turns a switch off");
            }
        });
    }

    [TestMethod]
    public void mf_stored_zero_acts_only_in_dev_mode()
    {
        store(() =>
        {
            Assert.AreEqual("000", bitsWith(true, 0, 0, 0), "dev on + all 0 → all OFF");
            Assert.AreEqual("111", bitsWith(false, 0, 0, 0), "dev off + all 0 → all ON");
            Assert.AreEqual("111", bitsWith(null, 0, 0, 0), "dev absent + all 0 → all ON");
        });
    }

    [TestMethod]
    public void mf_each_key_is_its_own_switch()
    {
        store(() =>
        {
            Assert.AreEqual("011", bitsWith(true, 0, null, null), "only macsave at 0");
            Assert.AreEqual("101", bitsWith(true, null, 0, null), "only iconreencode at 0");
            Assert.AreEqual("110", bitsWith(true, null, null, 0), "only swipelock at 0");
            P.d.Clear();
            P.Set("devMode", true);
            P.Set("flagOpusManagedOnly", 0);
            P.Set("flagDeclineClears", 0);
            P.Set("flagLockSecondClock", 0);
            Assert.AreEqual(7, MacfixaFlags.read(), "another batch's stored 0 changes none");
        });
    }

    [TestMethod]
    public void mf_line_text_all_8()
    {
        for (int b = 0; b < 8; b++)
        {
            string want = "[FLAGS] macfixa macsave=" + (b & 1) + " iconreencode=" + ((b >> 1) & 1) + " swipelock=" + ((b >> 2) & 1);
            Assert.AreEqual(want, MacfixaFlags.flagsLine(b));
        }
        Assert.AreEqual("[FLAGS] macfixa macsave=1 iconreencode=0 swipelock=1", MacfixaFlags.flagsLine(5));
    }

    [TestMethod]
    public void mf_read_lazily_one_line_per_process()
    {
        store(() =>
        {
            P.Set("devMode", true);
            P.Set(MacfixaFlags.SwipeTouchLockKey, 0);
            freshProcess();
            Assert.AreEqual(0, Lines.Count, "nothing read or logged before the first use");
            Assert.IsTrue(MacfixaFlags.MacSaveToFolder);
            Assert.IsTrue(MacfixaFlags.AppIconReencode);
            Assert.IsFalse(MacfixaFlags.SwipeTouchLock);
            P.Set(MacfixaFlags.SwipeTouchLockKey, 1);
            Assert.IsFalse(MacfixaFlags.SwipeTouchLock, "a store change after the first read acts at the next start");
            Assert.AreEqual("[FLAGS] macfixa macsave=1 iconreencode=1 swipelock=0", string.Join("|", Lines), "ONE line, at the first read");
        });
    }

    [TestMethod]
    public void mf_a_throwing_store_keeps_all_on()
    {
        Preferences was = Preferences.Default;
        try
        {
            Preferences.Default = new Preferences { d = null! };
            freshProcess();
            Assert.AreEqual(7, MacfixaFlags.read(), "a throwing store: all ON");
            Assert.AreEqual(0, Lines.Count, "read() logs nothing on a throw");
        }
        finally
        {
            Preferences.Default = was;
            freshProcess();
        }
    }
}
