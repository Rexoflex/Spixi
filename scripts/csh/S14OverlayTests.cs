// ★ S14 (#1282 / #1283) — the pure rules of the overlay-container probe (the Developer switch: verb grammar, dev-mode gate,
// the per-stage pick) and of the chat-info ride-along (who owns it, when the rider comes back), EXECUTED (S11ChatRules).
// The call sites (SpixiContentPage.applyStageContainer / rideAlong, DevPage, ContactDetails) are MAUI-bound —
// scripts/pins-s14/a2-container-ride.mjs.
using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class S14OverlayTests
{
    [TestMethod]
    public void container_verb_is_exact()
    {
        Assert.IsTrue(S11ChatRules.parseContainerVerb("clip", out int a) && a == S11ChatRules.ContainerClip, "clip");
        Assert.IsTrue(S11ChatRules.parseContainerVerb("shadow", out int b) && b == S11ChatRules.ContainerShadow, "shadow");
        Assert.IsTrue(S11ChatRules.parseContainerVerb("none", out int c) && c == S11ChatRules.ContainerNone, "none");
        string?[] bad = { null, "", "Clip", "clip ", " none", "none:1", "shadow1", "0", "1", "2", "container:none" };
        foreach (string? s in bad)
        {
            Assert.IsFalse(S11ChatRules.parseContainerVerb(s, out int m), "refused: [" + s + "]");
            Assert.AreEqual(S11ChatRules.ContainerClip, m, "a refusal reads clip: [" + s + "]");
        }
    }

    [TestMethod]
    public void container_acts_only_in_dev_mode_and_defaults_to_clip()
    {
        Assert.AreEqual(S11ChatRules.ContainerClip, S11ChatRules.effectiveContainer(false, S11ChatRules.ContainerShadow), "dev off → clip");
        Assert.AreEqual(S11ChatRules.ContainerClip, S11ChatRules.effectiveContainer(false, S11ChatRules.ContainerNone), "dev off → clip");
        Assert.AreEqual(S11ChatRules.ContainerShadow, S11ChatRules.effectiveContainer(true, S11ChatRules.ContainerShadow), "dev on → shadow");
        Assert.AreEqual(S11ChatRules.ContainerNone, S11ChatRules.effectiveContainer(true, S11ChatRules.ContainerNone), "dev on → none");
        Assert.AreEqual(S11ChatRules.ContainerClip, S11ChatRules.effectiveContainer(true, 7), "unknown stored → clip");
        Assert.AreEqual(S11ChatRules.ContainerClip, S11ChatRules.effectiveContainer(true, -1), "negative stored → clip");
        Assert.AreEqual("clip", S11ChatRules.containerWord(0));
        Assert.AreEqual("shadow", S11ChatRules.containerWord(1));
        Assert.AreEqual("none", S11ChatRules.containerWord(2));
        Assert.AreEqual("clip", S11ChatRules.containerWord(9), "unknown → clip");
    }

    [TestMethod]
    public void held_stages_never_lose_their_container()
    {
        Assert.AreEqual(S11ChatRules.ContainerClip, S11ChatRules.containerFor(S11ChatRules.ContainerClip, false));
        Assert.AreEqual(S11ChatRules.ContainerClip, S11ChatRules.containerFor(S11ChatRules.ContainerClip, true));
        Assert.AreEqual(S11ChatRules.ContainerShadow, S11ChatRules.containerFor(S11ChatRules.ContainerShadow, false));
        Assert.AreEqual(S11ChatRules.ContainerShadow, S11ChatRules.containerFor(S11ChatRules.ContainerShadow, true));
        Assert.AreEqual(S11ChatRules.ContainerNone, S11ChatRules.containerFor(S11ChatRules.ContainerNone, false), "a non-held overlay: none");
        Assert.AreEqual(S11ChatRules.ContainerClip, S11ChatRules.containerFor(S11ChatRules.ContainerNone, true), "a held / parking stage keeps the clip in None mode");
        Assert.IsTrue(S11ChatRules.ContainerClipHalf >= 10000, "the clip rect is far beyond any screen");
    }

    [TestMethod]
    public void ride_is_owned_only_by_its_own_held_swap()
    {
        Assert.IsTrue(S11ChatRules.rideOwns(true, false, "chat:abc", "chat:abc"), "the held swap of the armed key");
        Assert.IsFalse(S11ChatRules.rideOwns(false, false, "chat:abc", "chat:abc"), "not a held full-screen swap");
        Assert.IsFalse(S11ChatRules.rideOwns(true, true, "chat:abc", "chat:abc"), "already owned");
        Assert.IsFalse(S11ChatRules.rideOwns(true, false, "chat:abd", "chat:abc"), "another chat");
        Assert.IsFalse(S11ChatRules.rideOwns(true, false, "chat:ABC", "chat:abc"), "ordinal");
        Assert.IsFalse(S11ChatRules.rideOwns(true, false, null, "chat:abc"), "no key");
        Assert.IsFalse(S11ChatRules.rideOwns(true, false, null, null), "null never matches null");
    }

    [TestMethod]
    public void rider_comes_back_only_over_the_chat_it_describes()
    {
        // stack [old chat 0, info 1] after the new chat closed (back during the hold)
        Assert.IsTrue(S11ChatRules.riderRestores(true, true, 1, 0), "back during the hold → info stays on top");
        Assert.IsFalse(S11ChatRules.riderRestores(false, true, 1, 0), "the swap completed → closed");
        Assert.IsFalse(S11ChatRules.riderRestores(true, false, 1, 0), "the info is already closing / gone");
        Assert.IsFalse(S11ChatRules.riderRestores(true, true, 1, -1), "no chat left under it → closed");
        Assert.IsFalse(S11ChatRules.riderRestores(true, true, 1, 2), "a newer chat above it → closed");
        Assert.IsFalse(S11ChatRules.riderRestores(true, true, -1, 0), "not in the stack");
    }

    [TestMethod]
    public void rider_end_effects_are_the_whole_list()
    {
        // #46 fix r1 (R3 MAJOR-1): restore = swappedOut cleared AND input-live, nothing else; close = hook cleared + closed; gone = hook only
        int restore = S11ChatRules.riderEffects(true, true, 1, 0);
        Assert.AreEqual(S11ChatRules.RiderFxClearSwapped | S11ChatRules.RiderFxInputLive, restore, "restore = both writes");
        Assert.IsTrue(S11ChatRules.fxHas(restore, S11ChatRules.RiderFxClearSwapped) && S11ChatRules.fxHas(restore, S11ChatRules.RiderFxInputLive), "restore writes");
        Assert.IsFalse(S11ChatRules.fxHas(restore, S11ChatRules.RiderFxClose) || S11ChatRules.fxHas(restore, S11ChatRules.RiderFxClearHook), "a restored rider is neither closed nor unhooked");
        Assert.AreEqual(S11ChatRules.RiderFxClearHook | S11ChatRules.RiderFxClose, S11ChatRules.riderEffects(false, true, 1, 0), "swap completed → close");
        Assert.AreEqual(S11ChatRules.RiderFxClearHook | S11ChatRules.RiderFxClose, S11ChatRules.riderEffects(true, true, 1, 2), "a newer chat above → close");
        Assert.AreEqual(S11ChatRules.RiderFxClearHook | S11ChatRules.RiderFxClose, S11ChatRules.riderEffects(true, true, 1, -1), "no chat under → close");
        Assert.AreEqual(S11ChatRules.RiderFxClearHook, S11ChatRules.riderEffects(true, false, 1, 0), "already closing / gone → hook only");
        Assert.AreEqual(S11ChatRules.RiderFxClearHook, S11ChatRules.riderEffects(false, false, -1, -1), "gone → hook only");
        // exhaustive: exactly one of {restore, close, gone}, and the close bit iff the rider is open and not restored
        foreach (bool hc in new[] { false, true })
            foreach (bool open in new[] { false, true })
                for (int ri = -1; ri <= 2; ri++)
                    for (int ti = -1; ti <= 2; ti++)
                    {
                        int fx = S11ChatRules.riderEffects(hc, open, ri, ti);
                        bool back = S11ChatRules.riderRestores(hc, open, ri, ti);
                        Assert.AreEqual(back, S11ChatRules.fxHas(fx, S11ChatRules.RiderFxInputLive), "input-live iff restored");
                        Assert.AreEqual(back, S11ChatRules.fxHas(fx, S11ChatRules.RiderFxClearSwapped), "swappedOut cleared iff restored");
                        Assert.AreEqual(open && !back, S11ChatRules.fxHas(fx, S11ChatRules.RiderFxClose), "closed iff open and not restored");
                        Assert.AreEqual(!back, S11ChatRules.fxHas(fx, S11ChatRules.RiderFxClearHook), "unhooked iff not restored");
                    }
        Assert.AreEqual(15, S11ChatRules.RiderFxClearSwapped | S11ChatRules.RiderFxInputLive | S11ChatRules.RiderFxClearHook | S11ChatRules.RiderFxClose, "four distinct bits");
    }

    [TestMethod]
    public void ride_timeout_spares_an_owned_ride()
    {
        // #46 fix r1 (R1 MINOR-4): the 2 s timeout drops an unowned ride only; the backstop drops either
        Assert.IsTrue(S11ChatRules.rideTimeoutDrops(false, false), "unowned at 2 s → drop (onChat never pushed)");
        Assert.IsFalse(S11ChatRules.rideTimeoutDrops(true, false), "owned at 2 s → the owner decides (staging may run 4 s)");
        Assert.IsTrue(S11ChatRules.rideTimeoutDrops(true, true), "owned at the backstop → drop");
        Assert.IsTrue(S11ChatRules.rideTimeoutDrops(false, true), "unowned at the backstop → drop");
    }

    [TestMethod]
    public void none_probes_only_the_slide_in()
    {
        // #46 fix r1 (R1 MINOR-1): a stage gets None only when it slides in and is neither held nor parking
        Assert.IsFalse(S11ChatRules.stageNeedsInputFlip(false, false, true), "a plain slide-in → may be None");
        Assert.IsTrue(S11ChatRules.stageNeedsInputFlip(false, false, false), "no slide (desktop, a peer tab, a column pane) → clip");
        Assert.IsTrue(S11ChatRules.stageNeedsInputFlip(true, false, true), "held → clip");
        Assert.IsTrue(S11ChatRules.stageNeedsInputFlip(false, true, true), "parking → clip");
        Assert.AreEqual(S11ChatRules.ContainerClip, S11ChatRules.containerFor(S11ChatRules.ContainerNone, S11ChatRules.stageNeedsInputFlip(false, false, false)), "None mode, no slide → clip");
        Assert.AreEqual(S11ChatRules.ContainerNone, S11ChatRules.containerFor(S11ChatRules.ContainerNone, S11ChatRules.stageNeedsInputFlip(false, false, true)), "None mode, slide-in → none");
    }
}
