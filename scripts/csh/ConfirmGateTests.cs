// ★ Session Safety #46 r2/r3 (P35) — the native-confirm gate, EXECUTED: one confirm at a time; refused while another alert is
// up; released ONLY by the holder's exit (no time bound — #46 r3 MAJOR-1: a bound released a confirm still on screen);
// other alerts tracked one by one (a late close never uncounts another — r3 MINOR-1).
// DELIBERATE BREAKS (Session Safety #46 r3): ① exit without the holder test → foreign_exit fails; ② tryEnter ignoring
// others → others_refuse fails; ③ alertClosed clearing every alert → per_alert fails.
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class ConfirmGateTests
{
    [TestMethod]
    public void one_at_a_time()
    {
        var g = new ConfirmGate();
        long t1 = g.tryEnter();
        Assert.IsTrue(t1 > 0 && g.isOpen, "the first ask enters and holds");
        Assert.AreEqual(0L, g.tryEnter(), "a second ask is refused");
        g.exit(t1);
        Assert.IsFalse(g.isOpen, "closed after exit");
        Assert.IsTrue(g.tryEnter() > 0, "enters again");
    }

    [TestMethod]
    public void others_refuse()
    {
        var g = new ConfirmGate();
        long a = g.tryAlertOpened();
        Assert.IsTrue(g.othersOpen);
        Assert.AreEqual(0L, g.tryEnter(), "refused while another alert is up");
        Assert.IsFalse(g.isOpen, "a refused ask holds nothing");
        g.alertClosed(a);
        Assert.IsTrue(g.tryEnter() > 0, "enters once the alert closed");
    }

    [TestMethod]
    public void per_alert()
    {
        var g = new ConfirmGate();
        long a = g.tryAlertOpened();
        long b = g.tryAlertOpened();
        g.alertClosed(a);
        Assert.IsTrue(g.othersOpen, "B is still up after A closed");
        g.alertClosed(a);   // a repeated close of A never uncounts B
        Assert.IsTrue(g.othersOpen, "a repeated close is ignored");
        g.alertClosed(12345);   // an unknown token is ignored
        Assert.IsTrue(g.othersOpen);
        g.alertClosed(b);
        Assert.IsFalse(g.othersOpen, "none up");
    }

    [TestMethod]
    public void foreign_exit()
    {
        var g = new ConfirmGate();
        long t = g.tryEnter();
        g.exit(t + 1);
        g.exit(0);
        Assert.IsTrue(g.isOpen, "only the holder's token releases the gate");
        g.exit(t);
        g.exit(t);   // a repeated exit is harmless
        Assert.IsFalse(g.isOpen);
    }

    [TestMethod]
    public void no_time_bound()
    {
        // ★ #46 r3 MAJOR-1: there is no clock in the gate — a confirm left open stays open (fail closed); nothing but exit frees it
        var g = new ConfirmGate();
        long t = g.tryEnter();
        for (int i = 0; i < 1000; i++) Assert.AreEqual(0L, g.tryEnter(), "still refused (attempt " + i + ")");
        Assert.IsTrue(g.isOpen);
        g.exit(t);
    }

    [TestMethod]
    public void try_alert_opened_is_atomic_with_the_drop()
    {
        // ★ #46 r4 (NIT-1): one step — 0 (drop) while a confirm holds the gate, else a counted token
        var g = new ConfirmGate();
        long c = g.tryEnter();
        Assert.AreEqual(0L, g.tryAlertOpened(), "dropped while a confirm is up");
        Assert.IsFalse(g.othersOpen, "a dropped alert is not counted");
        g.exit(c);
        long a = g.tryAlertOpened();
        Assert.IsTrue(a > 0 && g.othersOpen, "counted once the confirm is gone");
        Assert.AreEqual(0L, g.tryEnter(), "and it refuses a confirm while up");
        g.alertClosed(a);
        Assert.IsTrue(g.tryEnter() > 0);
    }
}
