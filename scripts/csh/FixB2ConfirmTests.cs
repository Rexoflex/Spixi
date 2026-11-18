// ★ fixb2 item 3 (n-20261117-win-confirm-no-default-focus) — EXECUTED: FixB2Rules.focusPart / mayTakeFocus / accentState, the pure
// half of the Windows confirm's focus step (SConfirm.winFocusCancel, `#if WINDOWS`, pinned by scripts/pins-fixb2/a-confirm-focus.mjs).
// The step may move the keyboard focus ONLY to the Close part, ONLY when Close is the default button and the button shows the Cancel
// text and not the OK text; the accent state only for a Close default that holds the keyboard focus.
// DELIBERATE BREAKS (fixb2 builder-a report): ① focusPart → `defaultButton != 0 ? CancelPart : null` → focus_part_only_for_a_close_default
// fails; ② mayTakeFocus without the `!= okText` clause → may_take_focus_refuses_ok_and_other_parts fails; ③ accentState without
// `defaultButton == 3 &&` → accent_state_only_for_a_focused_close_default fails.
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class FixB2ConfirmTests
{
    [TestMethod]
    public void focus_part_only_for_a_close_default()
    {
        // ContentDialogButton: None = 0, Primary = 1, Secondary = 2, Close = 3
        Assert.AreEqual("CloseButton", FixB2Rules.focusPart(3), "Close default → the Close part");
        Assert.IsTrue(FixB2Rules.focusPart(0) == null, "no default → no focus step");
        Assert.IsTrue(FixB2Rules.focusPart(1) == null, "a Primary (OK) default → no focus step, never the Primary part");
        Assert.IsTrue(FixB2Rules.focusPart(2) == null, "a Secondary default → no focus step");
        Assert.IsTrue(FixB2Rules.focusPart(-1) == null, "out of range → no focus step");
        Assert.IsTrue(FixB2Rules.focusPart(4) == null, "out of range → no focus step");
        Assert.AreEqual("CloseButton", FixB2Rules.CancelPart);
    }

    [TestMethod]
    public void may_take_focus_only_the_cancel_text_on_the_close_part()
    {
        Assert.IsTrue(FixB2Rules.mayTakeFocus("CloseButton", "Cancel", "Cancel", "Delete"), "the Close part with the Cancel text");
    }

    [TestMethod]
    public void may_take_focus_refuses_ok_and_other_parts()
    {
        Assert.IsFalse(FixB2Rules.mayTakeFocus("PrimaryButton", "Cancel", "Cancel", "Delete"), "the Primary part, whatever it shows");
        Assert.IsFalse(FixB2Rules.mayTakeFocus("SecondaryButton", "Cancel", "Cancel", "Delete"), "the Secondary part");
        Assert.IsFalse(FixB2Rules.mayTakeFocus("closebutton", "Cancel", "Cancel", "Delete"), "the part name is exact (ordinal)");
        Assert.IsFalse(FixB2Rules.mayTakeFocus(null, "Cancel", "Cancel", "Delete"), "no name");
        Assert.IsFalse(FixB2Rules.mayTakeFocus("CloseButton", "Delete", "Cancel", "Delete"), "the Close part showing the OK text");
        Assert.IsFalse(FixB2Rules.mayTakeFocus("CloseButton", "Delete", "Delete", "Delete"), "Cancel text == OK text: the user cannot tell them apart");
        Assert.IsFalse(FixB2Rules.mayTakeFocus("CloseButton", "cancel", "Cancel", "Delete"), "the shown text must equal the Cancel text (ordinal)");
        Assert.IsFalse(FixB2Rules.mayTakeFocus("CloseButton", null, "Cancel", "Delete"), "no shown text");
        Assert.IsFalse(FixB2Rules.mayTakeFocus("CloseButton", "", "", "Delete"), "an empty shown / Cancel text");
        Assert.IsFalse(FixB2Rules.mayTakeFocus("CloseButton", "Cancel", null, "Delete"), "no Cancel text");
        Assert.IsTrue(FixB2Rules.mayTakeFocus("CloseButton", "Cancel", "Cancel", null), "no OK text: the Cancel text alone decides");
    }

    [TestMethod]
    public void accent_state_only_for_a_focused_close_default()
    {
        Assert.AreEqual("CloseAsDefaultButton", FixB2Rules.accentState(3, true), "Close default with the keyboard focus → the Close accent");
        Assert.IsTrue(FixB2Rules.accentState(3, false) == null, "Close default without the focus → leave the states to WinUI");
        Assert.IsTrue(FixB2Rules.accentState(1, true) == null, "a Primary default → never an accent from this step");
        Assert.IsTrue(FixB2Rules.accentState(2, true) == null, "a Secondary default → none");
        Assert.IsTrue(FixB2Rules.accentState(0, true) == null, "no default → none");
        Assert.AreEqual("CloseAsDefaultButton", FixB2Rules.CancelAccentState);
    }
}
