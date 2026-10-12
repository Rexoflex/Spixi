// ★ S17 (#1338 What's new · #1339 the bar ink) — the pure rules of the S17 bridge, EXECUTED (Spixi/Utils/S17Rules.cs).
// The MAUI glue (HomePage / SettingsPage: the flag, the push, the verbs, the repaint) is pinned at source level
// (scripts/pins-s17/a-whatsnew.mjs, its C# clause).
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class S17Tests
{
    [TestMethod]
    public void VersionDigits_StripsThePrefix_AndRefusesEverythingElse()
    {
        Assert.AreEqual("0.9.22", S17Rules.versionDigits("spixi-0.9.22"));
        Assert.AreEqual("1.0", S17Rules.versionDigits("1.0"));
        Assert.AreEqual("1.0", S17Rules.versionDigits(" spixi-1.0 "));
        Assert.AreEqual("", S17Rules.versionDigits(null));
        Assert.AreEqual("", S17Rules.versionDigits(""));
        Assert.AreEqual("", S17Rules.versionDigits("spixi-"));
        Assert.AreEqual("", S17Rules.versionDigits("spixi-1.0-beta"));
        Assert.AreEqual("", S17Rules.versionDigits("1.0\"}"));
        Assert.AreEqual("", S17Rules.versionDigits("12345678901234567"));   // 17 characters
        Assert.AreEqual("1234567890123456", S17Rules.versionDigits("1234567890123456"));
    }

    [TestMethod]
    public void ShouldShow_OncePerVersion_FreshInstallIncluded()
    {
        Assert.IsTrue(S17Rules.shouldShow(null, "0.9.22"));      // a fresh install (create or restore): no seen value
        Assert.IsTrue(S17Rules.shouldShow("", "0.9.22"));
        Assert.IsTrue(S17Rules.shouldShow("0.9.21", "0.9.22"));  // an update
        Assert.IsFalse(S17Rules.shouldShow("0.9.22", "0.9.22")); // already seen
        Assert.IsFalse(S17Rules.shouldShow(null, ""));           // an invalid version never shows
    }

    [TestMethod]
    public void PushJson_IsBuiltFromValidatedDigitsOnly()
    {
        Assert.AreEqual("{\"version\":\"0.9.22\",\"show\":true}", S17Rules.pushJson("0.9.22", true));
        Assert.AreEqual("{\"version\":\"0.9.22\",\"show\":false}", S17Rules.pushJson("0.9.22", false));
        Assert.AreEqual("", S17Rules.pushJson("0.9\",\"x\":\"1", true));
        Assert.AreEqual("", S17Rules.pushJson("", true));
    }

    [TestMethod]
    public void DoneVerb_IsExact()
    {
        Assert.IsTrue(S17Rules.isDoneVerb("ixian:whatsnew:done"));
        Assert.IsFalse(S17Rules.isDoneVerb("ixian:whatsnew:done:1.0"));
        Assert.IsFalse(S17Rules.isDoneVerb("ixian:whatsnew:DONE"));
        Assert.IsFalse(S17Rules.isDoneVerb(null));
    }

    [TestMethod]
    public void TopSurface_ExactTails_ConstantColours()
    {
        Assert.IsTrue(S17Rules.parseTopSurface("ixian:topsurface:plain", out int k0)); Assert.AreEqual(0, k0);
        Assert.IsTrue(S17Rules.parseTopSurface("ixian:topsurface:about", out int k1)); Assert.AreEqual(1, k1);
        Assert.IsTrue(S17Rules.parseTopSurface("ixian:topsurface:contrib", out int k2)); Assert.AreEqual(2, k2);
        Assert.IsFalse(S17Rules.parseTopSurface("ixian:topsurface:#ff0000", out _));
        Assert.IsFalse(S17Rules.parseTopSurface("ixian:topsurface:about ", out _));
        Assert.IsFalse(S17Rules.parseTopSurface("ixian:topsurface:", out _));
        Assert.IsFalse(S17Rules.parseTopSurface(null, out _));
        Assert.IsTrue(S17Rules.topSurfaceColor(0, true) == null);
        Assert.AreEqual("#2a74e6", S17Rules.topSurfaceColor(1, true));
        Assert.AreEqual("#173a7c", S17Rules.topSurfaceColor(1, false));
        Assert.AreEqual("#7a5cf0", S17Rules.topSurfaceColor(2, true));
        Assert.AreEqual("#3b2a9c", S17Rules.topSurfaceColor(2, false));
    }

    [TestMethod]
    public void FlagLine_SaysOnlyTheBit()
    {
        Assert.AreEqual("[FLAGS] s17bridge=1", S17Rules.flagLine(true));
        Assert.AreEqual("[FLAGS] s17bridge=0", S17Rules.flagLine(false));
    }
}
