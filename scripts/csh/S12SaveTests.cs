// ★ S12 D (#1266 / #1267) — the pure half of the Windows Save probe + candidate, EXECUTED (S11MediaRules.savePhotoLine ·
// saveOutcome + the [P1] grammar of P1Perf). The call sites (SingleChatPage.onSavePhoto / noteSavePhoto /
// observeSavePhoto, Windows SFileOperations.saveAs / share) are MAUI / WinUI-bound — scripts/pins-s12/d-save.mjs.
using System;
using System.Linq;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class S12SaveTests
{
    [TestMethod]
    public void every_save_code_makes_a_valid_p1_line()
    {
        string[] codes = { "parse", "nomsg", "notfile", "nopath", "lookup", "start", "ok", "cancel", "fail" };
        Assert.IsTrue(codes.SequenceEqual(S11MediaRules.SavePhotoCodes), "the code set, in order");
        Assert.IsFalse(S11MediaRules.SavePhotoCodes is string[], "★ S12 D2 (#46 R1-NIT-5): callers get a read-only view, not the array");
        Assert.IsTrue(S11MediaRules.SavePhotoCodes is System.Collections.Generic.ICollection<string> col && col.IsReadOnly, "the view refuses writes");
        foreach (string c in codes)
        {
            string? l = S11MediaRules.savePhotoLine(c);
            Assert.AreEqual("savephoto r=" + c, l, "line for " + c);
            Assert.IsTrue(P1Perf.isValidLine("[P1] " + l), "grammar: " + c);
        }
    }

    [TestMethod]
    public void an_unknown_code_logs_nothing()
    {
        string?[] bad = { null, "", "OK", "ok ", " ok", "start\n", "savephoto", "0a1b2c3d", "C:\\Users\\x\\photo.jpg", "photo.jpg", "r=ok", "parse,ok" };
        foreach (string? b in bad)
        {
            Assert.IsTrue(S11MediaRules.savePhotoLine(b) == null, "refused: [" + b + "]");
        }
    }

    [TestMethod]
    public void file_saver_outcome_maps_to_ok_cancel_fail()
    {
        Assert.AreEqual(S11MediaRules.SaveOk, S11MediaRules.saveOutcome(true, false), "saved");
        Assert.AreEqual(S11MediaRules.SaveOk, S11MediaRules.saveOutcome(true, true), "saved wins (IsSuccessful = no exception)");
        Assert.AreEqual(S11MediaRules.SaveCancel, S11MediaRules.saveOutcome(false, true), "the picker closed");
        Assert.AreEqual(S11MediaRules.SaveFail, S11MediaRules.saveOutcome(false, false), "anything else");
        Assert.AreEqual("ok", S11MediaRules.SaveOk);
        Assert.AreEqual("cancel", S11MediaRules.SaveCancel);
        Assert.AreEqual("fail", S11MediaRules.SaveFail);
    }

    [TestMethod]
    public void the_window_ground_line_passes_the_grammar()
    {
        // Spixi/Platforms/Windows/App.xaml.cs applyWindowGround: "winground set=" + A R G B as two lowercase hex digits each
        Assert.IsTrue(P1Perf.isValidLine("[P1] winground set=fff9fafb"), "light ground");
        Assert.IsTrue(P1Perf.isValidLine("[P1] winground set=ff13171b"), "dark ground");
        Assert.IsFalse(P1Perf.isValidLine("[P1] winground set=FF13171B"), "upper case would be dropped — the code uses x2");
    }
}
