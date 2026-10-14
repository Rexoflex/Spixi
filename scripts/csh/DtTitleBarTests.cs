// ★ DT-1 B → #1392 → ★ #1395 (S20): the Windows title bar is the Windows look only. The failed ways (maui / colors), their
// dev verb, push, palette and log lines are deleted; DtTitleBarRules keeps the caption alone. EXECUTED: the caption, and
// that nothing of the way switch is left (no way constant, no pref key, no parse / pick method), so a stored DT-1 value has
// nothing that reads it — every start is the Windows look. The wiring (and no C# reader of `devTitleBarWay`) is read by
// scripts/pins-dt1/b-titlebar.mjs.
using System.Linq;
using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class DtTitleBarTests
{
    [TestMethod]
    public void Title_IsSpixi()
    {
        Assert.AreEqual("Spixi", DtTitleBarRules.Title);   // Q1 (was "Spixi IM")
    }

    [TestMethod]
    public void OnlyTheWindowsLook_NoWaySwitchLeft()
    {
        var members = typeof(DtTitleBarRules).GetMembers(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static | BindingFlags.DeclaredOnly)
            .Select((m) => m.Name).OrderBy((x) => x).ToArray();
        Assert.AreEqual("Title", string.Join(",", members), "DtTitleBarRules holds the caption only (#1395): " + string.Join(",", members));
    }
}
