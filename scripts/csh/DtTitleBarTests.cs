// ★ DT-1 B (Damir 2026-10-12, Q1) — the Windows title bar's pure rules (Spixi/Utils/DtTitleBarRules.cs), EXECUTED: the way
// switch (three fixed words, dev mode only), the title per way, the palette per theme, the hex parse and the log line. The
// colour constants are paired with tokens.css by scripts/pins-dt1/b-titlebar.mjs; the Windows half
// (Platforms/Windows/DtTitleBar.cs) is read by the same pin.
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class DtTitleBarTests
{
    [TestMethod]
    public void WayVerb_ThreeWordsExactly()
    {
        Assert.IsTrue(DtTitleBarRules.parseWayVerb("off", out int a) && a == DtTitleBarRules.WayOff);
        Assert.IsTrue(DtTitleBarRules.parseWayVerb("maui", out int b) && b == DtTitleBarRules.WayMaui);
        Assert.IsTrue(DtTitleBarRules.parseWayVerb("colors", out int c) && c == DtTitleBarRules.WayColors);
        foreach (var bad in new[] { null, "", "Off", "MAUI", "colours", "maui ", " maui", "1", "colors:1", "off\n" })
            Assert.IsFalse(DtTitleBarRules.parseWayVerb(bad, out _), "rejects '" + bad + "'");
    }

    [TestMethod]
    public void WayThatActs_DevModeOnly_DefaultMaui()
    {
        // not in dev mode: always the default, whatever is stored
        foreach (int st in new[] { 0, 1, 2, 7, -1 }) Assert.AreEqual(DtTitleBarRules.WayMaui, DtTitleBarRules.wayThatActs(false, st), "dev off, stored " + st);
        Assert.AreEqual(DtTitleBarRules.WayOff, DtTitleBarRules.wayThatActs(true, DtTitleBarRules.WayOff));
        Assert.AreEqual(DtTitleBarRules.WayColors, DtTitleBarRules.wayThatActs(true, DtTitleBarRules.WayColors));
        Assert.AreEqual(DtTitleBarRules.WayMaui, DtTitleBarRules.wayThatActs(true, DtTitleBarRules.WayMaui));
        Assert.AreEqual(DtTitleBarRules.WayMaui, DtTitleBarRules.wayThatActs(true, 9), "an unknown stored value = the default");
    }

    [TestMethod]
    public void Title_SpixiExceptOff()
    {
        Assert.AreEqual("Spixi", DtTitleBarRules.titleFor(DtTitleBarRules.WayMaui));
        Assert.AreEqual("Spixi", DtTitleBarRules.titleFor(DtTitleBarRules.WayColors));
        Assert.AreEqual("Spixi IM", DtTitleBarRules.titleFor(DtTitleBarRules.WayOff));
        foreach (int w in new[] { 0, 1, 2 }) { Assert.IsTrue(DtTitleBarRules.parseWayVerb(DtTitleBarRules.wayWord(w), out int back) && back == w, "word round trip " + w); }
    }

    [TestMethod]
    public void Palette_PerTheme_AndParses()
    {
        var l = DtTitleBarRules.paletteFor(false);
        var d = DtTitleBarRules.paletteFor(true);
        Assert.AreEqual(DtTitleBarRules.LightBg, l.Bg); Assert.AreEqual(DtTitleBarRules.LightFg, l.Fg);
        Assert.AreEqual(DtTitleBarRules.DarkBg, d.Bg); Assert.AreEqual(DtTitleBarRules.DarkFg, d.Fg);
        Assert.AreEqual(DtTitleBarRules.LightFgInactive, l.FgInactive); Assert.AreEqual(DtTitleBarRules.DarkPressedBg, d.PressedBg);
        // #46 r1 (tests M25 / M26): every field, both themes
        Assert.AreEqual(DtTitleBarRules.LightHoverBg, l.HoverBg); Assert.AreEqual(DtTitleBarRules.LightPressedBg, l.PressedBg);
        Assert.AreEqual(DtTitleBarRules.DarkFgInactive, d.FgInactive); Assert.AreEqual(DtTitleBarRules.DarkHoverBg, d.HoverBg);
        foreach (var p in new[] { l, d })
            foreach (var hex in new[] { p.Bg, p.Fg, p.FgInactive, p.HoverBg, p.PressedBg })
                Assert.IsTrue(DtTitleBarRules.parseHex(hex, out _, out _, out _), "parses " + hex);
        Assert.IsTrue(DtTitleBarRules.parseHex("#0F1113", out byte r, out byte g, out byte b) && r == 0x0F && g == 0x11 && b == 0x13);
        foreach (var bad in new[] { null, "", "0F1113", "#0F111", "#0F11133", "#GG1113", "#0f1113 " })
            Assert.IsFalse(DtTitleBarRules.parseHex(bad, out _, out _, out _), "rejects '" + bad + "'");
    }

    [TestMethod]
    public void LogLines_FixedWordsOnly()
    {
        Assert.AreEqual("[DT] titlebar way=maui theme=dark custom=1", DtTitleBarRules.applyLine(DtTitleBarRules.WayMaui, true, true));
        Assert.AreEqual("[DT] titlebar way=colors theme=light custom=0", DtTitleBarRules.applyLine(DtTitleBarRules.WayColors, false, false));
        Assert.AreEqual("[FLAGS] dttitlebar=off", DtTitleBarRules.flagLine(DtTitleBarRules.WayOff));
    }

    [TestMethod]
    public void CaptionColours_PerWay()
    {
        // off: nothing is set
        Assert.AreEqual(0, DtTitleBarRules.captionColours(DtTitleBarRules.WayOff, false).Length);
        Assert.AreEqual(0, DtTitleBarRules.captionColours(7, true).Length);
        string get((string prop, string value)[] l, string prop) { foreach (var x in l) if (x.prop == prop) return x.value; return null; }
        foreach (bool dark in new[] { false, true })
        {
            var p = DtTitleBarRules.paletteFor(dark);
            var m = DtTitleBarRules.captionColours(DtTitleBarRules.WayMaui, dark);
            var c = DtTitleBarRules.captionColours(DtTitleBarRules.WayColors, dark);
            // way 1: the MAUI bar paints the ground — the buttons stay see-through, no bar ground is set
            Assert.AreEqual(DtTitleBarRules.Transparent, get(m, "ButtonBackgroundColor"));
            Assert.AreEqual(DtTitleBarRules.Transparent, get(m, "ButtonInactiveBackgroundColor"));
            Assert.IsTrue(get(m, "BackgroundColor") == null && get(m, "InactiveBackgroundColor") == null, "way 1 sets no bar ground");
            // way 2: the system bar — the ground everywhere, the inactive ink
            Assert.AreEqual(p.Bg, get(c, "BackgroundColor")); Assert.AreEqual(p.Fg, get(c, "ForegroundColor"));
            Assert.AreEqual(p.Bg, get(c, "InactiveBackgroundColor")); Assert.AreEqual(p.FgInactive, get(c, "InactiveForegroundColor"));
            Assert.AreEqual(p.Bg, get(c, "ButtonBackgroundColor")); Assert.AreEqual(p.Bg, get(c, "ButtonInactiveBackgroundColor"));
            // both: the caption glyph inks + hover / pressed
            foreach (var l in new[] { m, c })
            {
                Assert.AreEqual(p.Fg, get(l, "ButtonForegroundColor")); Assert.AreEqual(p.FgInactive, get(l, "ButtonInactiveForegroundColor"));
                Assert.AreEqual(p.HoverBg, get(l, "ButtonHoverBackgroundColor")); Assert.AreEqual(p.Fg, get(l, "ButtonHoverForegroundColor"));
                Assert.AreEqual(p.PressedBg, get(l, "ButtonPressedBackgroundColor")); Assert.AreEqual(p.Fg, get(l, "ButtonPressedForegroundColor"));
            }
            Assert.AreEqual(8, m.Length); Assert.AreEqual(12, c.Length);
        }
    }

    [TestMethod]
    public void Windows10_PaintsOff_AndWay2IsTheSystemBar()
    {
        foreach (int w in new[] { 0, 1, 2 })
        {
            Assert.AreEqual(DtTitleBarRules.WayOff, DtTitleBarRules.effectiveWay(w, 19045), "Windows 10 22H2, way " + w);
            Assert.AreEqual(w, DtTitleBarRules.effectiveWay(w, 22000), "Windows 11 21H2, way " + w);
            Assert.AreEqual(w, DtTitleBarRules.effectiveWay(w, 26100), "Windows 11 24H2, way " + w);
        }
        Assert.IsTrue(DtTitleBarRules.systemBar(DtTitleBarRules.WayColors));
        Assert.IsFalse(DtTitleBarRules.systemBar(DtTitleBarRules.WayMaui));
        Assert.IsFalse(DtTitleBarRules.systemBar(DtTitleBarRules.WayOff));
    }
}
