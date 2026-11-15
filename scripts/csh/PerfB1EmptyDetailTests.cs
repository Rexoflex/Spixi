// ★ perfb1 P-13 (PhoneNoEmptyDetail) — no EmptyDetail page on a phone until the layout is wide
// (Spixi/Utils/EmptyDetailRules.cs), EXECUTED. The call sites are MAUI-bound (HomePage's field initializer,
// buildDefaultDetailOnFirstWide, removeDetailContent) and compile nowhere here; scripts/pins-perfb1/d-empty-detail.mjs
// pins that each site calls this rule.
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class PerfB1EmptyDetailTests
{
    private static readonly bool[] Both = { false, true };

    [TestMethod]
    public void phone_with_the_switch_on_is_not_built_at_start()
    {
        Assert.IsTrue(EmptyDetailRules.defers(true, true), "switch ON + phone display defers");
        Assert.IsFalse(EmptyDetailRules.constructAtStart(true, true), "switch ON + phone display → not built at start");
    }

    [TestMethod]
    public void not_a_phone_display_is_built_at_start_no_change()
    {
        // Windows / Mac (isPhoneDisplay refuses every platform but Android / iOS), tablets (short side >= 600 dp).
        foreach (bool flag in Both)
        {
            Assert.IsFalse(EmptyDetailRules.defers(flag, false), "flag=" + flag);
            Assert.IsTrue(EmptyDetailRules.constructAtStart(flag, false), "desktop / tablet at start, flag=" + flag);
        }
    }

    [TestMethod]
    public void switch_off_is_todays_path_on_every_idiom()
    {
        foreach (bool phone in Both)
        {
            Assert.IsFalse(EmptyDetailRules.defers(false, phone), "phone=" + phone);
            Assert.IsTrue(EmptyDetailRules.constructAtStart(false, phone), "built at start, phone=" + phone);
            Assert.IsTrue(EmptyDetailRules.rebuild(false, phone, true), "removeDetailContent rebuilds, phone=" + phone);
            Assert.IsTrue(EmptyDetailRules.rebuild(false, phone, false), "removeDetailContent rebuilds even if none existed, phone=" + phone);
            foreach (bool wide in Both)
            {
                // built at start → `exists` is true at every layout pass → the wide hook never builds a second one
                Assert.IsFalse(EmptyDetailRules.constructNow(false, phone, wide, true), "no second page, phone=" + phone + " wide=" + wide);
            }
        }
    }

    [TestMethod]
    public void the_first_wide_layout_builds_it_once_never_twice()
    {
        bool exists = EmptyDetailRules.constructAtStart(true, true);
        Assert.IsFalse(exists, "deferred at start");
        Assert.IsFalse(EmptyDetailRules.constructNow(true, true, false, exists), "a narrow layout (phone) builds nothing");
        int built = 0;
        // a foldable: folded (narrow), opened (wide, the display is no longer a phone), resized, folded, opened again
        (bool phone, bool wide)[] passes = { (true, false), (false, true), (false, true), (true, false), (false, true), (false, true) };
        foreach (var p in passes)
        {
            if (EmptyDetailRules.constructNow(true, p.phone, p.wide, exists))
            {
                built++;
                exists = true;
            }
        }
        Assert.AreEqual(1, built, "built exactly once, at the first wide layout");
        Assert.IsTrue(EmptyDetailRules.constructNow(true, true, true, false), "wide and none exists → build now");
        Assert.IsFalse(EmptyDetailRules.constructNow(true, false, true, true), "wide and one exists → never twice");
    }

    [TestMethod]
    public void a_phone_never_builds_it_on_narrow_layouts_or_removals()
    {
        bool exists = false;
        for (int i = 0; i < 50; i++)
        {
            Assert.IsFalse(EmptyDetailRules.constructNow(true, true, false, exists), "narrow layout " + i);
            Assert.IsFalse(EmptyDetailRules.rebuild(true, true, exists), "removeDetailContent " + i + " (reload, remove contact, leave)");
        }
    }

    [TestMethod]
    public void once_built_it_behaves_as_today()
    {
        foreach (bool phone in Both)
        {
            Assert.IsTrue(EmptyDetailRules.rebuild(true, phone, true), "dispose + re-create as before, phone=" + phone);
        }
        Assert.IsTrue(EmptyDetailRules.rebuild(true, false, false), "not a phone display → re-create (today)");
    }
}
