// ★ S15 (#1293) — the pure half of the native security rows, EXECUTED (Spixi/Utils/S15SecRules.cs):
// O-29 the own-intent lock suppression window (~60 s) · O-30 the desktop idle read fails CLOSED for the lock · O-19 the
// log export needs dev mode · (#46 r1 MINOR-3) the unknown idle locks ONCE per streak. The call sites (App.xaml.cs, Platforms/Windows/SDesktopIdle.cs, Pages/Dev/DevPage.xaml.cs)
// are MAUI / WinUI-bound — scripts/pins-s15/b-native.mjs.
using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class S15SecTests
{
    [TestMethod]
    public void own_intent_window_is_about_a_minute_not_five()
    {
        Assert.AreEqual(60, S15SecRules.OwnIntentWindowSeconds, "one named window");
        Assert.IsTrue(S15SecRules.ownIntentWithinWindow(TimeSpan.Zero), "a return at once is the round trip");
        Assert.IsTrue(S15SecRules.ownIntentWithinWindow(TimeSpan.FromSeconds(59.9)), "a slow pick inside the window");
        Assert.IsFalse(S15SecRules.ownIntentWithinWindow(TimeSpan.FromSeconds(60)), "the window's edge locks");
        Assert.IsFalse(S15SecRules.ownIntentWithinWindow(TimeSpan.FromMinutes(2)), "two minutes in the picker locks (5 min used to pass)");
        Assert.IsFalse(S15SecRules.ownIntentWithinWindow(TimeSpan.FromMinutes(4.9)), "the old 5-minute window is gone");
    }

    [TestMethod]
    public void own_intent_clock_moved_backwards_never_suppresses()
    {
        Assert.IsFalse(S15SecRules.ownIntentWithinWindow(TimeSpan.FromSeconds(-1)), "a negative age");
        Assert.IsFalse(S15SecRules.ownIntentWithinWindow(DateTime.Now - DateTime.MinValue), "a cleared stamp (MinValue) is ancient");
    }

    [TestMethod]
    public void idle_read_failure_fails_closed_for_every_window()
    {
        TimeSpan unknown = S15SecRules.idleFromTicks(false, 5000, 1000);
        Assert.AreEqual(S15SecRules.IdleUnknown, unknown, "a failed GetLastInputInfo → IdleUnknown");
        Assert.IsTrue(unknown >= TimeSpan.FromMinutes(1) && unknown >= TimeSpan.FromMinutes(24 * 60), "it satisfies the clamped window at both ends (1 min … 24 h) — the lock may engage");
        Assert.IsTrue(S15SecRules.IdleUnknown != TimeSpan.Zero, "never the old fail-OPEN zero");
        Assert.IsTrue((long)S15SecRules.IdleUnknown.TotalSeconds > 0, "the watcher's log cast stays positive");
    }

    [TestMethod]
    public void idle_read_success_is_the_unchecked_tick_difference()
    {
        Assert.AreEqual(TimeSpan.FromMilliseconds(4000), S15SecRules.idleFromTicks(true, 5000, 1000), "plain difference");
        Assert.AreEqual(TimeSpan.Zero, S15SecRules.idleFromTicks(true, 7, 7), "input this tick = no idle");
        Assert.AreEqual(TimeSpan.FromMilliseconds(16), S15SecRules.idleFromTicks(true, 5, uint.MaxValue - 10), "across the 49.7-day wrap the difference stays right (#505)");
    }

    // ★ S15 #46 r1 MINOR-3: a GetLastInputInfo that keeps failing locks ONCE per unknown streak, not every poll.
    [TestMethod]
    public void unknown_idle_locks_once_per_streak()
    {
        TimeSpan win = TimeSpan.FromMinutes(10), poll = TimeSpan.FromSeconds(30), U = S15SecRules.IdleUnknown;
        bool spent = false;
        Assert.IsTrue(S15SecRules.idleLockDue(U, poll, win, true, false, ref spent), "the first unknown read locks (fail CLOSED)");
        Assert.IsTrue(spent, "that lock spends the streak");
        Assert.IsFalse(S15SecRules.idleLockDue(U, poll, win, true, true, ref spent), "while the lock is up: nothing to do");
        Assert.IsFalse(S15SecRules.idleLockDue(U, poll, win, true, false, ref spent), "after the unlock the still-unknown read is NOT idle — no relock");
        Assert.IsFalse(S15SecRules.idleLockDue(U, poll, win, true, false, ref spent), "nor on the next poll");
        Assert.IsTrue(S15SecRules.idleLockDue(U, win + poll, win, true, false, ref spent), "the wall-clock (sleep) leg still locks inside the streak");
        Assert.IsFalse(S15SecRules.idleLockDue(TimeSpan.FromSeconds(5), poll, win, true, false, ref spent), "a successful read: active user, no lock");
        Assert.IsFalse(spent, "a successful read ends the streak");
        Assert.IsTrue(S15SecRules.idleLockDue(U, poll, win, true, false, ref spent), "a NEW unknown streak locks once again");
    }

    [TestMethod]
    public void unknown_seen_while_locked_spends_the_streak()
    {
        TimeSpan win = TimeSpan.FromMinutes(10), poll = TimeSpan.FromSeconds(30), U = S15SecRules.IdleUnknown;
        bool spent = false;
        Assert.IsFalse(S15SecRules.idleLockDue(U, poll, win, true, true, ref spent), "a lock already up (manual / pause)");
        Assert.IsTrue(spent, "the unknown read seen under a lock spends the streak");
        Assert.IsFalse(S15SecRules.idleLockDue(U, poll, win, true, false, ref spent), "after that unlock: no relock");
        bool off = false;
        Assert.IsFalse(S15SecRules.idleLockDue(U, win + poll, win, false, false, ref off), "lock disabled: never due");
        Assert.IsFalse(off, "and it does not spend a streak it never locked");
    }

    [TestMethod]
    public void known_idle_and_sleep_legs_unchanged()
    {
        TimeSpan win = TimeSpan.FromMinutes(10), poll = TimeSpan.FromSeconds(30);
        bool spent = false;
        Assert.IsTrue(S15SecRules.idleLockDue(win, poll, win, true, false, ref spent), "idle == window locks");
        Assert.IsFalse(spent, "a known idle never spends the unknown streak");
        Assert.IsTrue(S15SecRules.idleLockDue(win, poll, win, true, false, ref spent), "a known idle locks every time it is due (the lock gate stops repeats)");
        Assert.IsFalse(S15SecRules.idleLockDue(win - TimeSpan.FromSeconds(1), poll, win, true, false, ref spent), "just under the window");
        Assert.IsTrue(S15SecRules.idleLockDue(TimeSpan.Zero, win, win, true, false, ref spent), "a gap of the window = slept");
        Assert.IsFalse(S15SecRules.idleLockDue(TimeSpan.Zero, -win - win, win, true, false, ref spent), "a clock moved backwards never satisfies the gap leg");
        Assert.IsFalse(S15SecRules.idleLockDue(win, win, win, true, true, ref spent), "a lock already up: never due");
    }

    [TestMethod]
    public void log_export_needs_dev_mode()
    {
        Assert.IsTrue(S15SecRules.devLogExportAllowed(true), "dev mode on → the log may leave");
        Assert.IsFalse(S15SecRules.devLogExportAllowed(false), "dev mode off → refused");
    }
}
