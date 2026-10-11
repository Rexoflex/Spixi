// ★ S16 #46 r1 (R4 MAJOR-4, R2 MINOR-1/2/4) — the REAL WalletPassStore shell (Spixi/Meta/WalletPassStore.cs) + SpixiFlags,
// run end to end against StubsS16.cs (a MAUI-shaped SecureStorage with failures / delays) and the Stubs.cs Preferences:
// migrate · prefetch / bound choice · write (incl. the stale-plaintext drop) · read · clear (bounded and no-wait, ordered
// before a later write) · flag OFF (legacy + reverse copy). Timing cases use ≥ 500 ms margins around the 1000 / 3000 ms
// bounds. Each case leaves no secure call running (drain()).
using System;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using Microsoft.Maui.Storage;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class S16StoreTests
{
    private static Preferences P => Preferences.Default;
    private static FakeSecureStorage S => SecureStorage.Fake;
    private const string K = "walletpass";

    private static void setup(bool flagOn)
    {
        S.reset();
        P.Remove(K);
        P.Remove(SpixiFlags.SecureWalletPassKey);
        P.Set("devMode", !flagOn);
        if (!flagOn)
        {
            P.Set(SpixiFlags.SecureWalletPassKey, 0);
        }
        SpixiFlags.init();
        WalletPassStore.prefetch(false);   // no-op; leaves no prefetch behind
        IXICore.Meta.Logging.lines.Clear();
    }

    private static void drain(int ms)
    {
        Thread.Sleep(ms);
    }

    private static string? sec()
    {
        lock (S.d) { return S.d.TryGetValue(K, out var v) ? v : null; }
    }

    [TestMethod]
    public void store_migrates_then_removes_the_plaintext()
    {
        setup(true);
        Assert.IsTrue(SpixiFlags.SecureWalletPass, "flag on");
        P.Set(K, "pw-migrate");
        WalletPassStore.prefetch(true);
        Assert.AreEqual(0, S.gets, "no prefetch while a plaintext is left to migrate");
        Assert.IsTrue(WalletPassStore.readForColdStart(out string? pass) && pass == "pw-migrate", "opens with the plaintext value");
        Assert.IsFalse(P.ContainsKey(K), "plaintext removed after the verified copy");
        Assert.AreEqual("pw-migrate", sec(), "secure holds it under the one key");
        Assert.IsTrue(IXICore.Meta.Logging.lines.Any(l => l.StartsWith("[L8] store=secure read=hit ms=") && l.EndsWith(" migrated=1")), "the line");
    }

    [TestMethod]
    public void store_failed_migration_keeps_the_plaintext()
    {
        setup(true);
        P.Set(K, "pw-keep");
        S.throwOnSet = true;
        Assert.IsTrue(WalletPassStore.readForColdStart(out string? pass) && pass == "pw-keep", "still opens");
        Assert.IsTrue(P.ContainsKey(K), "plaintext kept");
    }

    [TestMethod]
    public void store_prefetch_only_with_a_wallet_and_serves_the_cold_read()
    {
        setup(true);
        S.d[K] = "pw-secure";
        WalletPassStore.prefetch(false);
        drain(50);
        Assert.AreEqual(0, S.gets, "no wallet file → no secure read at start");
        WalletPassStore.prefetch(true);
        Assert.IsTrue(WalletPassStore.readForColdStart(out string? pass) && pass == "pw-secure", "the prefetch serves the cold read");
        Assert.AreEqual(1, S.gets, "one read: the prefetch");
        Assert.IsTrue(WalletPassStore.readForColdStart(out _) && S.gets == 2, "a later cold read is a fresh one (the prefetch is one-shot)");
    }

    // ★ R4 L8-d / R2 MINOR-1: the cold bound (3000) only for the prefetch; every other read waits 1000.
    [TestMethod]
    public void store_cold_bound_only_for_the_prefetch()
    {
        setup(true);
        S.d[K] = "pw-slow";
        S.getDelayMs = 1600;
        WalletPassStore.prefetch(true);
        var sw = Stopwatch.StartNew();
        Assert.IsTrue(WalletPassStore.readForColdStart(out string? p1) && p1 == "pw-slow", "the prefetch waits up to 3000 ms: a 1.6 s read is a hit");
        sw.Restart();
        Assert.IsFalse(WalletPassStore.readForColdStart(out string? p2), "a fresh read waits only 1000 ms: a 1.6 s read is a timeout → the retry view");
        Assert.IsTrue(p2 == null && sw.ElapsedMilliseconds < 1500, "it gave up at ~1 s (" + sw.ElapsedMilliseconds + " ms)");
        Assert.IsTrue(IXICore.Meta.Logging.lines.Any(l => l.StartsWith("[L8] store=secure read=timeout")), "timeout line");
        drain(800);
    }

    [TestMethod]
    public void store_write_on_is_secure_and_drops_only_a_differing_plaintext()
    {
        setup(true);
        P.Set(K, "old");
        Assert.IsTrue(WalletPassStore.write("new-pass"), "verified write");
        Assert.IsTrue(sec() == "new-pass" && !P.ContainsKey(K), "secure holds it; plaintext removed");

        setup(true);
        P.Set(K, "old");
        S.throwOnSet = true;
        Assert.IsFalse(WalletPassStore.write("new-pass"), "a throw → false");
        Assert.IsFalse(P.ContainsKey(K), "★ MINOR-2: a plaintext that differs from the verified new password is removed");

        setup(true);
        P.Set(K, "same-pass");
        S.throwOnSet = true;
        Assert.IsFalse(WalletPassStore.write("same-pass"), "false");
        Assert.AreEqual("same-pass", P.Get(K, ""), "an EQUAL plaintext is still the live password — kept, never rewritten");
    }

    [TestMethod]
    public void store_read_prefers_plaintext_then_secure()
    {
        setup(true);
        S.d[K] = "pw-s";
        Assert.AreEqual("pw-s", WalletPassStore.read(), "secure");
        P.Set(K, "pw-p");
        Assert.AreEqual("pw-p", WalletPassStore.read(), "a plaintext still present wins (what the cold start used)");
        P.Remove(K);
        S.throwOnGet = true;
        Assert.IsTrue(WalletPassStore.read() == null, "unreadable → null (BackupPage refuses)");
    }

    [TestMethod]
    public void store_clear_empties_both_and_the_no_wait_clear_is_ordered_before_a_write()
    {
        setup(true);
        S.d[K] = "pw";
        P.Set(K, "pw");
        WalletPassStore.clear();
        Assert.IsTrue(sec() == null && !P.ContainsKey(K) && S.removedKeys.SequenceEqual(new[] { K }), "both gone, the one key");

        setup(true);
        S.d[K] = "stale";
        S.removeDelayMs = 700;
        var sw = Stopwatch.StartNew();
        WalletPassStore.clear(wait: false);
        Assert.IsTrue(sw.ElapsedMilliseconds < 300, "the no-wallet clear does not wait (" + sw.ElapsedMilliseconds + " ms)");
        Assert.IsTrue(WalletPassStore.write("fresh"), "a write right after (a create) still lands");
        drain(900);
        S.removeDelayMs = 0;
        Assert.AreEqual("fresh", sec(), "the clear ran FIRST — it never removes the new password");
    }

    [TestMethod]
    public void store_flag_off_is_legacy_and_copies_back()
    {
        setup(false);
        Assert.IsFalse(SpixiFlags.SecureWalletPass, "stored 0 + dev mode → off");
        Assert.IsTrue(WalletPassStore.write("legacy-pw") && P.Get(K, "") == "legacy-pw" && S.sets == 0, "legacy plaintext set, no secure call");
        P.Remove(K);
        S.d[K] = "from-secure";
        Assert.IsTrue(WalletPassStore.readForColdStart(out string? pass) && pass == "from-secure", "reverse copy opens");
        Assert.IsTrue(P.Get(K, "") == "from-secure" && sec() == null, "copied back, the secure one removed");
        setup(true);   // leave the flag ON for the classes after this one
    }

    [TestMethod]
    public void bound_choice_rule()
    {
        Assert.AreEqual(S16PassRules.ColdReadMs, S16PassRules.readBoundMs(true), "prefetch → cold bound");
        Assert.AreEqual(S16PassRules.ReadBackMs, S16PassRules.readBoundMs(false), "anything else → read-back bound");
        Assert.IsTrue(S16PassRules.SetMs + S16PassRules.ReadBackMs <= 3000 && S16PassRules.ColdReadMs <= 3000, "no UI-thread wait above 3 s");
    }
}
