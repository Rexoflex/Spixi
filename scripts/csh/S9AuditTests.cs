// ★ S9 V-15 (#1245) — the pure rules of the audit fixes, EXECUTED:
//   · AuditRules.waitWhile (C-03: the bounded resume wait)
//   · AuditRules.isHttpsUrl / packageTempName / copyCappedAsync (C-04: the mini-app package download)
//   · AuditRules.trySplitKeyValue / tryBase64 (A-8: the mini-app bridge verbs)
//   · AuditRules.KeyedTimers (C-02: one typing timer per peer, each callback removes its own)
//   · SLocalOnlyStore (H-14: the backup-excluded file, the one-time move out of Preferences)
// The MAUI-bound call sites (App.xaml.cs, MiniAppManager, MiniAppPage, StreamProcessor, Utils/HomePage, LaunchPage,
// BackupPage, MauiProgram, SRequestIgnore, SPushPrefsShare) are pinned by scripts/pins-s9/a2-wiring.mjs.
using System;
using System.IO;
using System.Linq;
using System.Threading;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;
using SPIXI.Meta;

[TestClass]
public class S9AuditTests
{
    // ── C-03 ──
    [TestMethod]
    public void wait_returns_true_as_soon_as_the_node_stopped()
    {
        int polls = 0;
        bool ok = AuditRules.waitWhile(() => ++polls < 3, 2000, 5);
        Assert.IsTrue(ok, "went false within the bound");
        Assert.AreEqual(3, polls, "polled until false, then stopped");
        Assert.IsTrue(AuditRules.waitWhile(() => false, 0), "not busy → true even with a zero bound");
        Assert.IsTrue(AuditRules.waitWhile(null, 10), "no predicate → nothing to wait for");
    }

    [TestMethod]
    public void wait_is_bounded_and_says_still_busy()
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        bool ok = AuditRules.waitWhile(() => true, 120, 10);
        sw.Stop();
        Assert.IsFalse(ok, "still busy at the deadline → false (the caller must not restart)");
        Assert.IsTrue(sw.ElapsedMilliseconds >= 100 && sw.ElapsedMilliseconds < 1500, "the wait ends near the bound (" + sw.ElapsedMilliseconds + " ms)");
        Assert.IsFalse(AuditRules.waitWhile(() => throw new InvalidOperationException(), 30, 5), "a throwing predicate counts as busy and never escapes");
        Assert.IsTrue(AuditRules.NodeStopWaitMs > 0 && AuditRules.NodeStopWaitMs < 5000, "the resume bound stays under Android's 5 s input ANR");
    }

    // ── C-04 ──
    [TestMethod]
    public void package_url_must_be_https()
    {
        Assert.IsTrue(AuditRules.isHttpsUrl("https://apps.example.org/a/b.zip"), "https");
        Assert.IsTrue(AuditRules.isHttpsUrl("  https://x.io/p.zip "), "trimmed");
        Assert.IsFalse(AuditRules.isHttpsUrl("http://apps.example.org/a.zip"), "http is refused (Core's IsValidUrl admits it)");
        Assert.IsFalse(AuditRules.isHttpsUrl("file:///etc/passwd"), "file");
        Assert.IsFalse(AuditRules.isHttpsUrl("javascript:alert(1)"), "javascript");
        Assert.IsFalse(AuditRules.isHttpsUrl("/relative/p.zip"), "relative");
        Assert.IsFalse(AuditRules.isHttpsUrl(""), "empty");
        Assert.IsFalse(AuditRules.isHttpsUrl(null), "null");
        Assert.IsFalse(AuditRules.isHttpsUrl("HTTPS//nohost"), "malformed");
    }

    [TestMethod]
    public void package_temp_name_is_ours_not_the_urls()
    {
        string a = AuditRules.packageTempName(), b = AuditRules.packageTempName();
        Assert.IsTrue(a != b, "unique per call");
        Assert.IsTrue(a.Length == 36 && a.EndsWith(".zip") && a.Substring(0, 32).All(c => "0123456789abcdef".IndexOf(c) >= 0), "32 hex + .zip: " + a);
        Assert.IsTrue(a.IndexOfAny(new[] { '/', '\\', '.' }) == 32, "no separator, one dot (the extension)");
    }

    [TestMethod]
    public void copy_capped_counts_the_bytes_actually_read()
    {
        var src = new MemoryStream(new byte[200_000]);
        var dst = new MemoryStream();
        long n = AuditRules.copyCappedAsync(src, dst, 200_000, CancellationToken.None).GetAwaiter().GetResult();
        Assert.AreEqual(200_000L, n, "exactly the cap passes");
        Assert.AreEqual(200_000L, dst.Length, "all written");

        var big = new MemoryStream(new byte[200_001]);
        var dst2 = new MemoryStream();
        long m = AuditRules.copyCappedAsync(big, dst2, 200_000, CancellationToken.None).GetAwaiter().GetResult();
        Assert.AreEqual(-1L, m, "one byte over the cap → -1");
        Assert.IsTrue(dst2.Length <= 200_000, "never more than the cap reaches the file (" + dst2.Length + ")");

        long z = AuditRules.copyCappedAsync(new MemoryStream(), new MemoryStream(), 10, CancellationToken.None).GetAwaiter().GetResult();
        Assert.AreEqual(0L, z, "empty → 0");
        Assert.AreEqual(100L * 1024 * 1024, AuditRules.MaxMiniAppPackageBytes, "the cap = 100 MB (A-9, #1244)");
        bool cancelled = false;
        try { AuditRules.copyCappedAsync(new MemoryStream(new byte[10]), new MemoryStream(), 100, new CancellationToken(true)).GetAwaiter().GetResult(); }
        catch (OperationCanceledException) { cancelled = true; }
        Assert.IsTrue(cancelled, "the deadline token cancels the copy");
    }

    // ── A-8 ──
    [TestMethod]
    public void bridge_key_value_is_validated_before_slicing()
    {
        Assert.IsTrue(AuditRules.trySplitKeyValue("myKey=dmFsdWU=", out string k, out string v), "key=value");
        Assert.AreEqual("myKey", k, "key up to the FIRST '='");
        Assert.AreEqual("dmFsdWU=", v, "value keeps its own '=' padding");
        Assert.IsTrue(AuditRules.trySplitKeyValue("k=", out k, out v) && k == "k" && v == "", "an empty value is allowed");
        Assert.IsFalse(AuditRules.trySplitKeyValue("noequals", out k, out v), "no '=' → dropped (was Substring(…, -n) → throw)");
        Assert.IsTrue(k == "" && v == "", "outs are empty on a refusal");
        Assert.IsFalse(AuditRules.trySplitKeyValue("=value", out k, out v), "an empty key → dropped");
        Assert.IsFalse(AuditRules.trySplitKeyValue("", out k, out v), "empty");
        Assert.IsFalse(AuditRules.trySplitKeyValue(null, out k, out v), "null");
    }

    [TestMethod]
    public void bridge_base64_never_throws()
    {
        byte[]? b = AuditRules.tryBase64("aGVsbG8=");
        Assert.IsTrue(b != null && System.Text.Encoding.UTF8.GetString(b) == "hello", "valid → bytes");
        Assert.IsTrue(AuditRules.tryBase64("aGk=")!.Length == 2, "the exact length (no padding bytes)");
        Assert.IsTrue(AuditRules.tryBase64("")!.Length == 0, "empty → empty");
        Assert.IsTrue(AuditRules.tryBase64("not base64!") == null, "invalid characters → null");
        Assert.IsTrue(AuditRules.tryBase64("abc") == null, "bad length → null");
        Assert.IsTrue(AuditRules.tryBase64(null) == null, "null → null");
    }

    // ── C-02 ──
    [TestMethod]
    public void typing_timer_fires_once_per_peer_and_removes_its_own()
    {
        var t = new AuditRules.KeyedTimers();
        int a = 0, b = 0;
        t.restart("A", 150, () => Interlocked.Increment(ref a));
        t.restart("B", 150, () => Interlocked.Increment(ref b));
        Assert.AreEqual(2, t.count, "one entry per peer");
        Thread.Sleep(900);
        Assert.AreEqual(1, a, "A fired once");
        Assert.AreEqual(1, b, "B fired once");
        Assert.AreEqual(0, t.count, "each callback removed its own entry");
    }

    [TestMethod]
    public void typing_restart_replaces_and_never_clears_a_newer_burst()
    {
        var t = new AuditRules.KeyedTimers();
        int first = 0, second = 0, other = 0;
        t.restart("A", 300, () => Interlocked.Increment(ref first));
        t.restart("C", 5000, () => Interlocked.Increment(ref other));
        t.restart("A", 900, () => Interlocked.Increment(ref second));   // a new burst before the first timeout
        Assert.AreEqual(2, t.count, "still one entry for A (replaced), one for C");
        Thread.Sleep(500);
        Assert.AreEqual(0, first, "the replaced timer never runs its clear");
        Assert.IsTrue(t.has("A"), "A's newer burst is still current after the old due time");
        Assert.IsTrue(t.has("C"), "another peer's timer is untouched (the old code removed the FIRST list entry)");
        Thread.Sleep(1200);
        Assert.AreEqual(1, second, "the newer burst fires once");
        Assert.IsFalse(t.has("A"), "and removes itself");
        Assert.AreEqual(0, other, "C has not fired yet");
    }

    [TestMethod]
    public void typing_callback_exception_is_contained()
    {
        Exception? seen = null;
        var t = new AuditRules.KeyedTimers(e => seen = e);
        t.restart("A", 20, () => throw new InvalidOperationException("boom"));
        Thread.Sleep(700);
        Assert.IsTrue(seen is InvalidOperationException, "the throw reached onError, not the timer thread");
        Assert.AreEqual(0, t.count, "the entry was removed before the callback ran");
    }

    // ── H-14 ──
    static string freshFolder()
    {
        string d = Path.Combine(Path.GetTempPath(), "csh-localonly-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(d);
        SLocalOnlyStore.folder = () => d;
        SLocalOnlyStore.resetForTests();
        return d;
    }

    [TestMethod]
    public void local_only_store_round_trips_through_its_own_file()
    {
        string d = freshFolder();
        try
        {
            Assert.AreEqual("", SLocalOnlyStore.get("k"), "absent → empty");
            Assert.IsTrue(SLocalOnlyStore.set("k", "v,with \"quotes\" and ünïcode"), "written");
            Assert.IsTrue(File.Exists(Path.Combine(d, "localonly.json")), "the file is C#'s own name in the user folder");
            Assert.IsFalse(File.Exists(Path.Combine(d, "localonly.json.tmp")), "the temp file is moved, not left behind");
            SLocalOnlyStore.resetForTests();   // a restart: read back from disk
            Assert.AreEqual("v,with \"quotes\" and ünïcode", SLocalOnlyStore.get("k"), "read back after a restart");
            Assert.IsTrue(SLocalOnlyStore.remove("k"), "remove writes");
            SLocalOnlyStore.resetForTests();
            Assert.AreEqual("", SLocalOnlyStore.get("k"), "removed on disk");
            File.WriteAllText(Path.Combine(d, "localonly.json"), "{ not json");
            SLocalOnlyStore.resetForTests();
            Assert.AreEqual("", SLocalOnlyStore.get("k"), "a corrupt file reads as empty and never throws");
            SLocalOnlyStore.set("a", "1");
            SLocalOnlyStore.clearAll();
            Assert.IsFalse(File.Exists(Path.Combine(d, "localonly.json")), "clearAll deletes the file");
            Assert.AreEqual("", SLocalOnlyStore.get("a"), "and the memory copy");
        }
        finally { try { Directory.Delete(d, true); } catch (Exception) { } }
    }

    [TestMethod]
    public void local_only_store_moves_a_backed_up_preference_once()
    {
        string d = freshFolder();
        var P = Microsoft.Maui.Storage.Preferences.Default;
        try
        {
            P.Set("csh_ignored", "Addr1,Addr2");
            Assert.AreEqual("Addr1,Addr2", SLocalOnlyStore.getMigrating("csh_ignored"), "the old value is served");
            Assert.IsFalse(P.d.ContainsKey("csh_ignored"), "and the Preferences key is GONE (it was in every device backup)");
            SLocalOnlyStore.resetForTests();
            Assert.AreEqual("Addr1,Addr2", SLocalOnlyStore.get("csh_ignored"), "it lives in the file now");

            P.Set("csh_ignored", "Stale");   // a value that reappears in Preferences never overrides the file
            SLocalOnlyStore.resetForTests();
            Assert.AreEqual("Addr1,Addr2", SLocalOnlyStore.getMigrating("csh_ignored"), "the file wins over a later preference");
            Assert.IsFalse(P.d.ContainsKey("csh_ignored"), "the stale preference is removed too");

            Assert.AreEqual("", SLocalOnlyStore.getMigrating("csh_absent"), "nothing to move → empty");
            Assert.IsFalse(File.ReadAllText(Path.Combine(d, "localonly.json")).Contains("csh_absent"), "nothing written for an absent key");

            // a failed write keeps the Preferences copy (nothing is lost)
            string gone = Path.Combine(d, "missing-sub");
            SLocalOnlyStore.folder = () => gone;
            SLocalOnlyStore.resetForTests();
            P.Set("csh_salt", "abcd");
            Assert.AreEqual("abcd", SLocalOnlyStore.getMigrating("csh_salt"), "no folder → the move does not happen, the old value is still served");
            Assert.IsTrue(P.d.ContainsKey("csh_salt"), "…and the preference is KEPT for a later try");
            Directory.CreateDirectory(gone);
            Assert.AreEqual("abcd", SLocalOnlyStore.getMigrating("csh_salt"), "the next call retries and moves it");
            Assert.IsFalse(P.d.ContainsKey("csh_salt"), "…then the preference is removed");
            P.Remove("csh_salt");
        }
        finally { try { Directory.Delete(d, true); } catch (Exception) { } SLocalOnlyStore.resetForTests(); }
    }
}
