// ★ S12 E (#1267, V-26) — the grounds wait after a candidate release, EXECUTED (S11ChatRules.groundStep / groundLine).
// The call site (SpixiContentPage.S12GroundWait, releaseHeld, the cold chat hold) is MAUI-bound — scripts/pins-s12/e-hold.mjs.
using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class S12HoldTests
{
    [TestMethod]
    public void ground_step_waits_for_the_webview_draw()
    {
        Assert.AreEqual("", S11ChatRules.groundStep(false, 3, 3, 60, 300), "#46 r1: draws before the visual-state callback are not the content");
        Assert.AreEqual("", S11ChatRules.groundStep(true, 0, 0, 10, 300), "ready, no draw yet → keep the grounds transparent");
        Assert.AreEqual("", S11ChatRules.groundStep(true, 0, 5, 100, 300), "frames without a draw after ready are not a draw");
        Assert.AreEqual("", S11ChatRules.groundStep(true, 1, 0, 20, 300), "the draw happened, its frame has not passed → wait");
        Assert.AreEqual("drawn", S11ChatRules.groundStep(true, 1, 1, 30, 300), "ready, a draw, one frame after → drawn");
        Assert.AreEqual("drawn", S11ChatRules.groundStep(true, 4, 3, 60, 300), "later frames → drawn");
        Assert.AreEqual("cap", S11ChatRules.groundStep(false, 0, 0, 300, 300), "the cap brings the grounds back (never a hole)");
        Assert.AreEqual("cap", S11ChatRules.groundStep(true, 1, 0, 301, 300), "the cap wins over a pending frame");
        Assert.AreEqual(1, S11ChatRules.GroundAfterDrawFrames, "one frame after the draw");
        Assert.AreEqual(300, S11ChatRules.GroundCapMs, "the backstop");
    }

    [TestMethod]
    public void ground_line_is_fixed_words_and_integers()
    {
        Assert.AreEqual("hold grounds why=drawn f=4 ms=37 rdy=1", S11ChatRules.groundLine("drawn", 4, 37, true));
        Assert.AreEqual("hold grounds why=cap f=0 ms=300 rdy=0", S11ChatRules.groundLine("cap", -2, 300, false));
        Assert.AreEqual("hold grounds why=noview f=0 ms=0 rdy=0", S11ChatRules.groundLine("noview", 0, -5, false));
        Assert.AreEqual("hold grounds why=other f=1 ms=1 rdy=1", S11ChatRules.groundLine("C:\\x y", 1, 1, true));
    }
}
