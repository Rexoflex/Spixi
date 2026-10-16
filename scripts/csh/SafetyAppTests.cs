// ★ Session Safety (P33, Lane A) — the REAL Spixi/MiniApps/MiniApp.cs, MiniAppStorage.cs and MiniAppManager.cs, EXECUTED in
// temp folders over StubsSafety.cs: every proof case of the mechanism pass (docs/safety-mechanisms.md, keep/proof/Proof.cs:
// S-1a/b, S-2a–f) twice — flag ON = refused, nothing outside the app's folder touched; flag OFF (dev mode on + the stored 0,
// then the REAL SpixiFlags.init) = today's behaviour, which proves OFF is the old path. Plus the ON paths that must still
// work (a normal install / update / open / remove, a normal table) and the "delete only what this install created" rule.
// Each case builds its own root under the temp folder, deletes it after, and restores the flag preferences in `finally`.
// The MAUI-bound call sites (MiniAppActionHandler, AppNewPage, the Android picker) are pinned by scripts/pins-safety/a-miniapp.mjs.
// DELIBERATE BREAKS (Lane A report): ① the MiniApp ctor without its isSafeAppId test → s2a / s2de / s2_extract fail (s2f and
// s2bc stay green: the install belt and the created-only delete still hold — defence in depth); ② the catch without
// `created_target` → s2_existing_target_is_never_deleted; ③ getStorageCache without its refusal → s1a (a cache entry for the
// refused name) and s1b (the outside file is read); ④ remove() with Path.Combine for childPath → s2_belt; ⑤ ctor + install
// belt + created/isInside guard all off → s2f (the wallet folder is deleted under ON), s2bc, the (then) s2_existing and the ① three.
// ★ #46 r1 fix round (each broken in a scratch copy, failed for its own key, restored): the orphan pre-delete without its
// `!appList.ContainsKey` → s2_installed_apps_folder_is_never_deleted; the orphan pre-delete removed → s2_orphan_folder_is_
// replaced_on_install; the expected-id check off → s2_package_with_another_id_is_refused; the ON catch delete removed →
// s2_catch_deletes_a_target_this_call_created; the sweep unflagged → s3_start_sweeps_tmp_files (OFF leg) and sweeping
// folders → its ON leg; the install catch logging `e` → s2_installed + s2_catch (type-only line); isInside with `>=` →
// inside_refuses_the_root_with_a_trailing_separator (only that test); both MiniAppStorage checks off → s1a (wallet) + s1b.
// ★ #46 r5: stop() without `loaded = false` → s2_orphan (the start → stop → install step).
// s1a / s1b no longer wait on the wall clock: the loop thread is stopped at once and its pass is run by flushLikeTheLoop.
using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading;
using Microsoft.Maui.Storage;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;
using SPIXI.MiniApps;

[TestClass]
public class SafetyAppTests
{
    private static Preferences P => Preferences.Default;
    private static readonly string[] FlagPrefs = { "devMode", SpixiFlags.SafeAppIdKey, SpixiFlags.SafeStorageKey, SpixiFlags.SafePickKey };
    private const string WalletBytes = "SECRET-WALLET-BYTES";

    // ───────────── flags + folders ─────────────

    /** Runs `body` with the three Lane A flags ON (absent prefs) or OFF (dev mode + stored 0), through the REAL init. */
    private static void withFlags(bool on, Action body)
    {
        var saved = new Dictionary<string, string?>();
        foreach (string k in FlagPrefs) saved[k] = P.d.TryGetValue(k, out var v) ? v : null;
        try
        {
            foreach (string k in FlagPrefs) P.Remove(k);
            P.Set("devMode", !on);
            if (!on)
            {
                P.Set(SpixiFlags.SafeAppIdKey, 0);
                P.Set(SpixiFlags.SafeStorageKey, 0);
                P.Set(SpixiFlags.SafePickKey, 0);
            }
            SpixiFlags.init();
            Assert.AreEqual(on, SpixiFlags.SafeAppId, "SafeAppId as set");
            Assert.AreEqual(on, SpixiFlags.SafeStorage, "SafeStorage as set");
            Assert.AreEqual(on, SpixiFlags.SafePick, "SafePick as set");
            IXICore.Meta.Logging.warns.Clear();
            lock (IXICore.Meta.Logging.errors) { IXICore.Meta.Logging.errors.Clear(); }
            body();
        }
        finally
        {
            foreach (var kv in saved)
            {
                if (kv.Value == null) P.Remove(kv.Key); else P.d[kv.Key] = kv.Value;
            }
            SpixiFlags.init();
        }
    }

    private static string newRoot()
    {
        string r = Path.Combine(Path.GetTempPath(), "csh-safety-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(r);
        return r;
    }

    private static void cleanup(string root)
    {
        try { if (Directory.Exists(root)) Directory.Delete(root, true); } catch (Exception) { }
    }

    /** A package as the publisher ships it: appinfo.spixi (+ app/index.html, + icon.png when asked). */
    private static string makeAppZip(string dir, string id, bool icon = false, string version = "1.0.0")
    {
        string src = Path.Combine(dir, "pkgsrc-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path.Combine(src, "app"));
        File.WriteAllText(Path.Combine(src, "appinfo.spixi"), "caVersion = 0\nid = " + id + "\nname = Proof\nversion = " + version + "\n");
        File.WriteAllText(Path.Combine(src, "app", "index.html"), "<html></html>");
        if (icon) File.WriteAllBytes(Path.Combine(src, "icon.png"), new byte[] { 0x89, 0x50, 0x4E, 0x47 });
        string zip = Path.Combine(dir, "pkg-" + Guid.NewGuid().ToString("N") + ".zip");
        ZipFile.CreateFromDirectory(src, zip);
        Directory.Delete(src, true);
        return zip;
    }

    private static string makeVictim(string dir)
    {
        Directory.CreateDirectory(dir);
        File.WriteAllText(Path.Combine(dir, "keep.txt"), "user data");
        return dir;
    }

    private static bool victimIntact(string dir) => File.Exists(Path.Combine(dir, "keep.txt")) && File.ReadAllText(Path.Combine(dir, "keep.txt")) == "user data";

    private static string warns() => string.Join("|", IXICore.Meta.Logging.warns);

    /** The fixed-word lines only: no warn OR error line written in a case may carry the hostile id / table / a path
     *  (★ #46 r1 R1 MINOR-4: the error lines are recorded by the stub now, and read here too). */
    private static void assertNoLeak(params string[] secrets)
    {
        List<string> all;
        lock (IXICore.Meta.Logging.errors) { all = IXICore.Meta.Logging.warns.Concat(IXICore.Meta.Logging.errors).ToList(); }
        foreach (string w in all)
            foreach (string s in secrets)
                Assert.IsFalse(w.Contains(s), "a log line carries [" + s + "]: " + w);
    }

    private static string errs() { lock (IXICore.Meta.Logging.errors) { return string.Join("|", IXICore.Meta.Logging.errors); } }

    /** ★ #46 r1 (R1 MINOR-4): the storage loop's pass, run deterministically — the loop thread is stopped first and every
     *  cached table is written exactly as storageLoop does it (writeStorageData(app, table)), so no wall-clock wait decides. */
    private static void flushLikeTheLoop(MiniAppStorage s)
    {
        var w = typeof(MiniAppStorage).GetMethod("writeStorageData", BindingFlags.NonPublic | BindingFlags.Instance)!;
        foreach (var app in cacheOf(s).ToList())
            foreach (var table in app.Value.Keys.ToList())
                w.Invoke(s, new object[] { app.Key, table });
    }

    /** A storage whose own loop thread is stopped at once (it then never writes on its own: the first pass sees no cached
     *  table or a write younger than 200 ms, and the thread exits after its sleep). */
    private static MiniAppStorage quietStorage(string bas)
    {
        var s = new MiniAppStorage(bas);
        s.running = false;
        return s;
    }

    private static bool tmpHasNoExtract(string bas)
    {
        string tmp = Path.Combine(bas, "html", "Apps", "Tmp");
        return !Directory.Exists(tmp) || !Directory.EnumerateDirectories(tmp).Any();
    }

    private static Dictionary<string, Dictionary<string, MiniAppDataCache>> cacheOf(MiniAppStorage s) =>
        (Dictionary<string, Dictionary<string, MiniAppDataCache>>)typeof(MiniAppStorage)
            .GetField("appDataCache", BindingFlags.NonPublic | BindingFlags.Instance)!.GetValue(s)!;

    // ───────────── S-2a: the id parse ─────────────

    [TestMethod]
    public void s2a_parse_refuses_an_unsafe_id_on_and_keeps_it_off()
    {
        withFlags(true, () =>
        {
            foreach (string bad in new[] { "../../victim", "../..", "/abs/victim", "a/b", "Tmp", "CON", "a b" })
            {
                var app = new MiniApp(new[] { "id = " + bad, "name = x" });
                Assert.AreEqual("", app.id, "ON: [" + bad + "] → \"\"");
            }
            Assert.IsTrue(IXICore.Meta.Logging.warns.Count(w => w == "MiniApp: refused an unsafe app id") == 7, "ON: one fixed-word warn per refusal — " + warns());
            assertNoLeak("victim", "abs", "../");
            foreach (string good in new[] { "com.ixilabs.spixi.split", "com.ixilabs.spixi.gate-control", "com.mostnonameuser.spixi.aiassistant" })
                Assert.AreEqual(good, new MiniApp(new[] { "id = " + good }).id, "ON: a public id passes: " + good);
            Assert.AreEqual("", new MiniApp(new[] { "id = com.ok.app", "id = ../.." }).id, "ON: a later unsafe id line wins as \"\" (fail closed)");
        });
        withFlags(false, () =>
        {
            Assert.AreEqual("../../victim", new MiniApp(new[] { "id = ../../victim", "name = x" }).id, "OFF: the id as written (today)");
            Assert.AreEqual(0, IXICore.Meta.Logging.warns.Count, "OFF: no new warn");
        });
    }

    // ───────────── S-2f: THE worst case — id "../.." = the whole Spixi user folder ─────────────

    [TestMethod]
    public void s2f_install_dotdot_cannot_delete_the_spixi_folder()
    {
        foreach (bool on in new[] { true, false })
        {
            string root = newRoot();
            try
            {
                withFlags(on, () =>
                {
                    string bas = Path.Combine(root, "Spixi");
                    Directory.CreateDirectory(Path.Combine(bas, "Acc"));
                    string wallet = Path.Combine(bas, "wallet.ixi");
                    File.WriteAllText(wallet, WalletBytes);
                    var mgr = new MiniAppManager(bas);
                    string? r = mgr.installFromPath(makeAppZip(root, "../.."));
                    bool walletKept = File.Exists(wallet) && File.ReadAllText(wallet) == WalletBytes && Directory.Exists(Path.Combine(bas, "Acc"));
                    if (on)
                    {
                        Assert.IsTrue(r == null, "ON: the install is refused (null)");
                        Assert.IsTrue(walletKept, "ON: wallet.ixi and Acc/ are untouched");
                        Assert.IsTrue(tmpHasNoExtract(bas), "ON: no extract is left in Tmp");
                        Assert.IsTrue(mgr.getInstalledApps().Count == 0, "ON: nothing joins the app list");
                        assertNoLeak("../", bas);
                    }
                    else
                    {
                        Assert.IsTrue(r == null && !walletKept && !Directory.Exists(bas), "OFF reproduces today: one Install deletes the whole Spixi folder, wallet.ixi included (MAJOR #10 / H-9)");
                    }
                });
            }
            finally { cleanup(root); }
        }
    }

    // ───────────── S-2b / S-2c: a relative and a rooted id on install ─────────────

    [TestMethod]
    public void s2bc_install_relative_and_rooted_ids_delete_nothing()
    {
        foreach (bool on in new[] { true, false })
        {
            string root = newRoot();
            try
            {
                withFlags(on, () =>
                {
                    string bas = Path.Combine(root, "Spixi");
                    Directory.CreateDirectory(bas);
                    string victimB = makeVictim(Path.Combine(bas, "victim"));          // ../../victim from html/Apps
                    string victimC = makeVictim(Path.Combine(root, "rooted-victim"));  // a rooted id: Path.Combine returns it verbatim
                    var mgr = new MiniAppManager(bas);
                    string? rb = mgr.installFromPath(makeAppZip(root, "../../victim"));
                    string? rc = mgr.installFromPath(makeAppZip(root, victimC));
                    if (on)
                    {
                        Assert.IsTrue(rb == null && rc == null, "ON: both installs refused");
                        Assert.IsTrue(victimIntact(victimB), "ON: <bas>/victim kept (S-2b)");
                        Assert.IsTrue(victimIntact(victimC), "ON: the rooted folder kept (S-2c)");
                        Assert.IsTrue(tmpHasNoExtract(bas), "ON: no extract left in Tmp");
                        assertNoLeak("victim", root);
                    }
                    else
                    {
                        Assert.IsTrue(!Directory.Exists(victimB), "OFF reproduces today: <bas>/victim deleted (S-2b)");
                        Assert.IsTrue(!Directory.Exists(victimC), "OFF reproduces today: the rooted folder deleted (S-2c)");
                    }
                });
            }
            finally { cleanup(root); }
        }
    }

    // ───────────── S-2d / S-2e: a bad id already on disk → start, entry point, icon, remove ─────────────

    [TestMethod]
    public void s2de_an_unsafe_id_on_disk_is_skipped_and_never_removed()
    {
        foreach (bool on in new[] { true, false })
        {
            string root = newRoot();
            try
            {
                withFlags(on, () =>
                {
                    string bas = Path.Combine(root, "Spixi");
                    string installed = Path.Combine(bas, "html", "Apps", "innocent-looking");
                    Directory.CreateDirectory(installed);
                    File.WriteAllText(Path.Combine(installed, "appinfo.spixi"), "id = ../../../victim3\nname = x\nversion = 1\n");
                    string victim = makeVictim(Path.Combine(root, "victim3"));
                    File.WriteAllBytes(Path.Combine(victim, "icon.png"), new byte[] { 1 });
                    var mgr = new MiniAppManager(bas);
                    mgr.start();
                    string? entry = mgr.getAppEntryPoint("../../../victim3");
                    string? icon = mgr.getAppIconPath("../../../victim3");
                    bool removed = false;
                    try { removed = mgr.remove("../../../victim3"); } catch (Exception) { }
                    if (on)
                    {
                        Assert.IsTrue(mgr.getApp("../../../victim3") == null && mgr.getInstalledApps().Count == 0, "ON: start() skips the unsafe id");
                        Assert.IsTrue(entry == null, "ON: no entry point (S-2e)");
                        Assert.IsTrue(icon == null, "ON: no icon path outside html/Apps");
                        Assert.IsTrue(!removed && victimIntact(victim), "ON: remove() refuses, <root>/victim3 kept (S-2d)");
                        Assert.IsTrue(Directory.Exists(installed), "ON: the skipped folder itself is left alone");
                        assertNoLeak("victim3", "innocent", root);
                    }
                    else
                    {
                        Assert.IsTrue((entry ?? "").Contains(".."), "OFF reproduces today: the entry point carries .. (S-2e)");
                        Assert.IsTrue(icon != null && icon.Contains(".."), "OFF reproduces today: the icon path leaves html/Apps");
                        Assert.IsTrue(removed && !Directory.Exists(victim), "OFF reproduces today: remove() deletes <root>/victim3 (S-2d)");
                    }
                });
            }
            finally { cleanup(root); }
        }
    }

    // ───────────── S-2 belt: an unsafe id that got into the list anyway (the ctor bypassed) is still refused ─────────────

    [TestMethod]
    public void s2_belt_refuses_an_injected_unsafe_id()
    {
        string root = newRoot();
        try
        {
            withFlags(true, () =>
            {
                string bas = Path.Combine(root, "Spixi");
                string victim = makeVictim(Path.Combine(root, "victim4"));
                File.WriteAllBytes(Path.Combine(victim, "icon.png"), new byte[] { 1 });
                var mgr = new MiniAppManager(bas);
                var app = new MiniApp(new[] { "id = com.example.ok", "name = x" });
                app.id = "../../../victim4";                       // past the ctor: only the belt stands between it and the disk
                mgr.getInstalledApps()[app.id] = app;
                Assert.IsTrue(mgr.getAppEntryPoint(app.id) == null, "ON belt: getAppEntryPoint → null");
                Assert.IsTrue(mgr.getAppIconPath(app.id) == null, "ON belt: getAppIconPath → null");
                Assert.IsFalse(mgr.remove(app.id), "ON belt: remove() refuses");
                Assert.IsTrue(victimIntact(victim) && File.Exists(Path.Combine(victim, "icon.png")), "ON belt: <root>/victim4 kept");
                Assert.IsTrue(IXICore.Meta.Logging.warns.Contains("MiniApp: refused to remove an app outside the apps folder"), "ON belt: the fixed-word warn — " + warns());
                assertNoLeak("victim4", "../", root);
            });
        }
        finally { cleanup(root); }
    }

    // ───────────── S-2 (#46 r1 R1 MINOR-1): an ORPHAN folder at the target no longer blocks the install ─────────────

    [TestMethod]
    public void s2_orphan_folder_is_replaced_on_install()
    {
        foreach (bool on in new[] { true, false })
        {
            string root = newRoot();
            try
            {
                withFlags(on, () =>
                {
                    string bas = Path.Combine(root, "Spixi");
                    // a folder where a SAFE id points that NO installed app owns (e.g. left by a half-failed remove())
                    string orphan = makeVictim(Path.Combine(bas, "html", "Apps", "com.example.dup"));
                    var mgr = new MiniAppManager(bas);
                    // ★ #46 r3: a STOPPED manager never pre-deletes (appList is empty then — every folder would look orphaned)
                    if (on)
                    {
                        string? stopped = mgr.installFromPath(makeAppZip(root, "com.example.dup"));
                        Assert.IsTrue(stopped == null && File.Exists(Path.Combine(orphan, "keep.txt")), "ON: a stopped manager deletes nothing");
                    }
                    // ★ #46 r5 (NIT): start → stop clears `loaded`; an install then still deletes nothing
                    if (on)
                    {
                        mgr.start();
                        mgr.stop();
                        string? afterStop = mgr.installFromPath(makeAppZip(root, "com.example.dup"));
                        Assert.IsTrue(afterStop == null && File.Exists(Path.Combine(orphan, "keep.txt")), "ON: a manager stopped after a start deletes nothing");
                    }
                    mgr.start();
                    string? r = mgr.installFromPath(makeAppZip(root, "com.example.dup"));
                    if (on)
                    {
                        Assert.AreEqual("Proof", r, "ON: the orphan is removed first and the install succeeds");
                        Assert.IsTrue(!File.Exists(Path.Combine(orphan, "keep.txt")) && File.Exists(Path.Combine(orphan, "app", "index.html")), "ON: the folder now holds the new app only");
                        Assert.IsTrue(IXICore.Meta.Logging.warns.Contains("MiniApp: removed an orphan app folder before the install"), "ON: one fixed-word warn — " + warns());
                        Assert.IsTrue(tmpHasNoExtract(bas), "ON: no extract left");
                        assertNoLeak("com.example.dup", root);
                    }
                    else
                    {
                        Assert.IsTrue(r == null && !Directory.Exists(orphan), "OFF reproduces today: the Move fails and the catch deletes the folder");
                    }
                });
            }
            finally { cleanup(root); }
        }
    }

    // ───────────── S-2: the catch never deletes the folder of an INSTALLED app (the Move onto it failed) ─────────────

    [TestMethod]
    public void s2_installed_apps_folder_is_never_deleted()
    {
        string root = newRoot();
        try
        {
            withFlags(true, () =>
            {
                string bas = Path.Combine(root, "Spixi");
                string installed = makeVictim(Path.Combine(bas, "html", "Apps", "com.example.inst"));
                var mgr = new MiniAppManager(bas);
                // the list owns the folder; its entry cannot be removed (remove() refuses: the stored id fails the belt), so
                // the install goes on to a Move onto the INSTALLED app's folder, which throws
                var owner = new MiniApp(new[] { "id = com.example.inst", "version = 0.0.1" });
                owner.id = "../not-a-folder";
                mgr.getInstalledApps()["com.example.inst"] = owner;
                string? r = mgr.installFromPath(makeAppZip(root, "com.example.inst"));
                Assert.IsTrue(r == null, "ON: the Move onto the installed folder fails → null");
                Assert.IsTrue(victimIntact(installed), "ON: the installed app's folder is kept (not an orphan, not created by this call)");
                Assert.IsFalse(IXICore.Meta.Logging.warns.Contains("MiniApp: removed an orphan app folder before the install"), "ON: an installed app's folder is never treated as an orphan");
                Assert.IsTrue(errs().Contains("Error installing app: IOException"), "ON: the catch line is the exception TYPE only — " + errs());
                assertNoLeak(root);   // (the OLD "Older version of app {0}" line names the — validated — id; unchanged, base behaviour)
            });
        }
        finally { cleanup(root); }
    }

    // ───────────── S-2: the catch's POSITIVE branch — a target THIS call created is removed when a later step throws ─────────────

    [TestMethod]
    public void s2_catch_deletes_a_target_this_call_created()
    {
        string root = newRoot();
        try
        {
            withFlags(true, () =>
            {
                string bas = Path.Combine(root, "Spixi");
                string target = Path.Combine(bas, "html", "Apps", "com.example.pos");
                var mgr = new MiniAppManager(bas);
                // a list entry under the key whose stored id fails the belt: the update's remove() refuses and leaves the key,
                // the Move SUCCEEDS (no folder there), then appList.Add throws (duplicate key) — a step after the Move
                var owner = new MiniApp(new[] { "id = com.example.pos", "version = 0.0.1" });
                owner.id = "../zz";
                mgr.getInstalledApps()["com.example.pos"] = owner;
                string? r = mgr.installFromPath(makeAppZip(root, "com.example.pos"));
                Assert.IsTrue(r == null, "ON: the install fails after the Move → null");
                Assert.IsFalse(Directory.Exists(target), "ON: the folder this call created (the Move succeeded) is deleted by the catch");
                Assert.IsTrue(errs().Contains("Error installing app: ArgumentException"), "ON: the catch ran, type-only line — " + errs());
                Assert.IsTrue(tmpHasNoExtract(bas), "ON: no extract left");
            });
        }
        finally { cleanup(root); }
    }

    // ───────────── S-2 (#46 r1): the package must be the app the user saw (installFromUrlAsync passes the fetched id) ─────────────

    [TestMethod]
    public void s2_package_with_another_id_is_refused()
    {
        foreach (bool on in new[] { true, false })
        {
            string root = newRoot();
            try
            {
                withFlags(on, () =>
                {
                    string bas = Path.Combine(root, "Spixi");
                    var mgr = new MiniAppManager(bas);
                    Assert.AreEqual("Proof", mgr.installFromPath(makeAppZip(root, "com.example.bank")), "the other app is installed first");
                    string bankIndex = Path.Combine(bas, "html", "Apps", "com.example.bank", "app", "index.html");
                    File.WriteAllText(bankIndex, "BANK-ORIGINAL");
                    // the details screen showed com.example.game; the package names com.example.bank (a newer version)
                    string? r = mgr.installFromPath(makeAppZip(root, "com.example.bank", version: "2.0.0"), null, "com.example.game");
                    if (on)
                    {
                        Assert.IsTrue(r == null, "ON: refused (the ids differ)");
                        Assert.IsTrue(File.ReadAllText(bankIndex) == "BANK-ORIGINAL" && mgr.getApp("com.example.bank")!.version == "1.0.0", "ON: the other installed app is untouched");
                        Assert.IsTrue(mgr.getApp("com.example.game") == null, "ON: nothing new is listed");
                        Assert.IsTrue(tmpHasNoExtract(bas), "ON: the extract is cleaned");
                        Assert.IsTrue(IXICore.Meta.Logging.warns.Contains("MiniApp: refused a package whose id differs from the app info"), "ON: one fixed-word warn — " + warns());
                        assertNoLeak("com.example.bank", "com.example.game");
                        Assert.AreEqual("Proof", mgr.installFromPath(makeAppZip(root, "com.example.game"), null, "com.example.game"), "ON: the matching id installs");
                        Assert.AreEqual("Proof", mgr.installFromPath(makeAppZip(root, "com.example.pick"), null, null), "ON: null = no check (the picked-file path)");
                    }
                    else
                    {
                        Assert.IsTrue(r == "Proof" && File.ReadAllText(bankIndex) != "BANK-ORIGINAL" && mgr.getApp("com.example.bank")!.version == "2.0.0", "OFF reproduces today: the package replaces the OTHER installed app");
                    }
                });
            }
            finally { cleanup(root); }
        }
    }

    /* ★ #46 r2 (M-A): a case variant of an INSTALLED id is refused (Windows / Mac file systems ignore case, appList does not).
       Linux is case-sensitive, so the takeover itself cannot be reproduced here — the test pins the REFUSAL and that the
       installed app is untouched; OFF shows the case variant being accepted as a new app (today). */
    [TestMethod]
    public void s2_case_variant_of_an_installed_id_is_refused()
    {
        foreach (bool on in new[] { true, false })
        {
            string root = newRoot();
            try
            {
                withFlags(on, () =>
                {
                    string bas = Path.Combine(root, "Spixi");
                    var mgr = new MiniAppManager(bas);
                    Assert.AreEqual("Proof", mgr.installFromPath(makeAppZip(root, "com.foo.app")), "the app is installed first");
                    string idx = Path.Combine(bas, "html", "Apps", "com.foo.app", "app", "index.html");
                    File.WriteAllText(idx, "TRUSTED");
                    string? r = mgr.installFromPath(makeAppZip(root, "COM.FOO.APP", version: "0.1.0"), null, "COM.FOO.APP");
                    if (on)
                    {
                        Assert.IsTrue(r == null, "ON: refused (a case variant of an installed id)");
                        Assert.IsTrue(mgr.getApp("COM.FOO.APP") == null && File.ReadAllText(idx) == "TRUSTED", "ON: nothing listed, the installed app untouched");
                        Assert.IsTrue(IXICore.Meta.Logging.warns.Contains("MiniApp: refused a package whose id differs from an installed app only by case"), "ON: the fixed warn — " + warns());
                        Assert.IsTrue(tmpHasNoExtract(bas), "ON: the extract is cleaned");
                        assertNoLeak("com.foo.app", "COM.FOO.APP");
                    }
                    else
                    {
                        Assert.IsTrue(r == "Proof" && mgr.getApp("COM.FOO.APP") != null, "OFF reproduces today: the case variant is taken as a new app (on Windows / Mac: the SAME folder)");
                    }
                });
            }
            finally { cleanup(root); }
        }
    }

    // ───────────── S-2: extractAppInfo (Add app → pick a file → the details screen) ─────────────

    [TestMethod]
    public void s2_extract_app_info_refuses_an_unsafe_id()
    {
        foreach (bool on in new[] { true, false })
        {
            string root = newRoot();
            try
            {
                withFlags(on, () =>
                {
                    var mgr = new MiniAppManager(Path.Combine(root, "Spixi"));
                    MiniApp? bad = mgr.extractAppInfo(makeAppZip(root, "../..", icon: true));
                    MiniApp? good = mgr.extractAppInfo(makeAppZip(root, "com.example.good", icon: true));
                    Assert.IsTrue(good != null && good.id == "com.example.good", (on ? "ON" : "OFF") + ": a safe id is extracted");
                    if (on) Assert.IsTrue(bad == null, "ON: \"not an app\" (null) for id ../..");
                    else Assert.IsTrue(bad != null && bad.id == "../..", "OFF reproduces today: the details screen gets id ../..");
                });
            }
            finally { cleanup(root); }
        }
    }

    // ───────────── S-2: flag ON keeps every normal path working ─────────────

    [TestMethod]
    public void s2_on_normal_install_update_open_remove_still_work()
    {
        string root = newRoot();
        try
        {
            withFlags(true, () =>
            {
                string bas = Path.Combine(root, "Spixi");
                string apps = Path.Combine(bas, "html", "Apps");
                var mgr = new MiniAppManager(bas);
                Assert.AreEqual("Proof", mgr.installFromPath(makeAppZip(root, "com.ixilabs.spixi.split", icon: true)), "ON: a public id installs");
                string dir = Path.Combine(apps, "com.ixilabs.spixi.split");
                Assert.IsTrue(File.Exists(Path.Combine(dir, "app", "index.html")) && File.Exists(Path.Combine(dir, "appinfo.spixi")), "ON: the files land in html/Apps/<id>");
                Assert.AreEqual(Path.Combine(dir, "app", "index.html"), mgr.getAppEntryPoint("com.ixilabs.spixi.split"), "ON: the same entry point as before");
                Assert.AreEqual(Path.Combine(dir, "icon.png"), mgr.getAppIconPath("com.ixilabs.spixi.split"), "ON: the same icon path as before");
                Assert.AreEqual("Proof", mgr.installFromPath(makeAppZip(root, "com.ixilabs.spixi.split", icon: true, version: "1.1.0")), "ON: an update (older installed) still installs");
                Assert.AreEqual("1.1.0", mgr.getApp("com.ixilabs.spixi.split")!.version, "ON: the update is the one listed");
                Assert.IsTrue(mgr.installFromPath(makeAppZip(root, "com.ixilabs.spixi.split", version: "1.0.5")) == null && Directory.Exists(dir), "ON: a downgrade is refused and the installed copy stays");
                Assert.IsTrue(tmpHasNoExtract(bas), "ON: no extract left in Tmp after a refused downgrade");
                // a restart re-reads the folder: the safe id is loaded again
                var mgr2 = new MiniAppManager(bas);
                mgr2.start();
                Assert.IsTrue(mgr2.getApp("com.ixilabs.spixi.split") != null, "ON: start() loads a safe id");
                Assert.IsTrue(mgr2.remove("com.ixilabs.spixi.split") && !Directory.Exists(dir) && Directory.Exists(apps), "ON: remove() deletes the app's own folder only");
                Assert.AreEqual(0, IXICore.Meta.Logging.warns.Count(w => w.StartsWith("MiniApp: refused", StringComparison.Ordinal)), "ON: no refusal on the normal path — " + warns());
            });
        }
        finally { cleanup(root); }
    }

    // ───────────── S-1a: the storage loop rewrites the wallet ─────────────

    [TestMethod]
    public void s1a_storage_table_cannot_rewrite_the_wallet()
    {
        foreach (bool on in new[] { true, false })
        {
            string root = newRoot();
            MiniAppStorage? storage = null;
            try
            {
                withFlags(on, () =>
                {
                    string bas = Path.Combine(root, "Spixi");
                    Directory.CreateDirectory(bas);
                    string wallet = Path.Combine(bas, "wallet.ixi");
                    File.WriteAllText(wallet, WalletBytes);
                    storage = quietStorage(bas);
                    storage.setStorageData("com.example.hostile", "../../wallet.ixi", "k", new byte[] { 1 });
                    storage.setStorageData("com.example.good", "main", "k", new byte[] { 7 });   // the loop's witness: a normal table
                    string goodFile = Path.Combine(bas, "AppsStorage", "com.example.good", "main");
                    flushLikeTheLoop(storage);   // ★ #46 r1: the loop's own pass, deterministic (no wall-clock wait)
                    Assert.IsTrue(File.Exists(goodFile) && new FileInfo(goodFile).Length > 1, (on ? "ON" : "OFF") + ": the storage loop pass wrote the normal table");
                    bool walletKept = File.ReadAllText(wallet, Encoding.Latin1) == WalletBytes;
                    if (on)
                    {
                        Assert.IsTrue(walletKept, "ON: wallet.ixi untouched (S-1a)");
                        Assert.IsFalse(cacheOf(storage).ContainsKey("com.example.hostile"), "ON: the refused name never got a cache entry (never reaches the write loop)");
                        Assert.IsTrue(IXICore.Meta.Logging.warns.Contains("MiniAppStorage: refused an unsafe storage name"), "ON: one fixed-word warn — " + warns());
                        assertNoLeak("wallet", "../", "hostile");
                        var again = quietStorage(bas);
                        try
                        {
                            byte[]? v = again.getStorageData("com.example.good", "main", "k");
                            Assert.IsTrue(v != null && v.Length == 1 && v[0] == 7, "ON: a normal table round-trips through the file");
                        }
                        finally { again.running = false; }
                    }
                    else
                    {
                        Assert.IsTrue(!walletKept, "OFF reproduces today: the storage loop truncates and rewrites <spixiUserFolder>/wallet.ixi (S-1a)");
                    }
                });
            }
            finally
            {
                if (storage != null) storage.running = false;
                cleanup(root);
            }
        }
    }

    // ───────────── S-1b: a rooted table reads outside AppsStorage; an unsafe app id (legacy verbs' table "main") ─────────────

    [TestMethod]
    public void s1b_storage_cannot_read_outside_and_refuses_an_unsafe_app_id()
    {
        foreach (bool on in new[] { true, false })
        {
            string root = newRoot();
            MiniAppStorage? storage = null;
            try
            {
                withFlags(on, () =>
                {
                    string bas = Path.Combine(root, "Spixi");
                    Directory.CreateDirectory(Path.Combine(bas, "AppsStorage", "com.example.hostile"));   // the app wrote once before
                    string outside = Path.Combine(root, "outside.bin");
                    using (var fs = File.Create(outside))
                    {
                        fs.WriteByte(0);
                        fs.Write(IXICore.Utils.IxiUtils.GetIxiBytes(Encoding.UTF8.GetBytes("secretKey")));
                        fs.Write(IXICore.Utils.IxiUtils.GetIxiBytes(Encoding.UTF8.GetBytes("secretValue")));
                    }
                    storage = quietStorage(bas);
                    byte[]? got = storage.getStorageData("com.example.hostile", outside, "secretKey");   // a ROOTED table name
                    // an unsafe APP id with the fixed table "main" (the legacy ixian:get/setStorageData shape): ../../x/main
                    Directory.CreateDirectory(Path.Combine(root, "x"));
                    File.Copy(outside, Path.Combine(root, "x", "main"));
                    byte[]? viaId = storage.getStorageData("../../x", "main", "secretKey");
                    if (on)
                    {
                        Assert.IsTrue(got == null, "ON: a rooted table reads nothing (S-1b)");
                        Assert.IsTrue(viaId == null, "ON: an unsafe app id reads nothing");
                        storage.setStorageData("../../x", "main", "k", new byte[] { 1 });
                        Assert.IsTrue(cacheOf(storage).Count == 0, "ON: no refused app id or table ever got a cache entry");
                        assertNoLeak("outside", "secret", "../", root);
                    }
                    else
                    {
                        Assert.IsTrue(got != null && Encoding.UTF8.GetString(got) == "secretValue", "OFF reproduces today: a rooted table reads a file outside AppsStorage (S-1b)");
                        Assert.IsTrue(viaId != null, "OFF reproduces today: an unsafe app id reads outside AppsStorage");
                    }
                });
            }
            finally
            {
                if (storage != null) storage.running = false;
                cleanup(root);
            }
        }
    }

    // ───────────── S-3 (#46 r1 R1 MINOR-3): start() sweeps the FILES left in Tmp (never its folders) ─────────────

    [TestMethod]
    public void s3_start_sweeps_tmp_files()
    {
        foreach (bool on in new[] { true, false })
        {
            string root = newRoot();
            try
            {
                withFlags(on, () =>
                {
                    string bas = Path.Combine(root, "Spixi");
                    var mgr = new MiniAppManager(bas);
                    string tmp = mgr.tmpPath;
                    string[] leftovers = { AuditRules.packageTempName(), AuditRules.packageTempName(), "icon.png" };
                    foreach (string f in leftovers) File.WriteAllText(Path.Combine(tmp, f), "x");
                    string extractDir = Directory.CreateDirectory(Path.Combine(tmp, "pending.zip.dir")).FullName;
                    File.WriteAllText(Path.Combine(extractDir, "inside.txt"), "x");
                    string outside = Path.Combine(bas, "html", "Apps", "keep.txt");
                    File.WriteAllText(outside, "x");
                    IXICore.Meta.Logging.lines.Clear();
                    mgr.start();
                    int filesLeft = Directory.EnumerateFiles(tmp).Count();
                    if (on)
                    {
                        Assert.AreEqual(0, filesLeft, "ON: every file directly in Tmp is removed");
                        Assert.IsTrue(File.Exists(Path.Combine(extractDir, "inside.txt")), "ON: a folder in Tmp (and what is in it) is left alone");
                        Assert.IsTrue(File.Exists(outside), "ON: nothing outside Tmp is touched");
                        Assert.IsTrue(IXICore.Meta.Logging.lines.Contains("MiniApp: temp folder swept, removed=3 kept=0"), "ON: one line, fixed words + counts — " + string.Join("|", IXICore.Meta.Logging.lines));
                        assertNoLeak(".zip", "icon", root);
                    }
                    else
                    {
                        Assert.AreEqual(3, filesLeft, "OFF reproduces today: the files pile up in Tmp");
                        Assert.IsFalse(IXICore.Meta.Logging.lines.Any(l => l.StartsWith("MiniApp: temp folder swept", StringComparison.Ordinal)), "OFF: no sweep line");
                    }
                });
            }
            finally { cleanup(root); }
        }
    }

    // ───────────── #46 r1 (R1 MINOR-4): the containment edge the belts rely on ─────────────

    [TestMethod]
    public void inside_refuses_the_root_with_a_trailing_separator()
    {
        string apps = Path.Combine(Path.GetTempPath(), "csh-in", "html", "Apps");
        string sep = Path.DirectorySeparatorChar.ToString();
        Assert.IsFalse(SafetyRules.isInside(apps, apps + sep), "root + separator is the root itself → false");
        Assert.IsFalse(SafetyRules.isInside(apps + sep, apps + sep), "both with a separator → false");
        Assert.IsFalse(SafetyRules.isInside(apps, apps + sep + "." + sep), "root + /./ → false");
        Assert.IsTrue(SafetyRules.isInside(apps, apps + sep + "a"), "a child → true (control)");
        Assert.IsTrue(SafetyRules.childPath(apps, "a" + sep, false) == null, "childPath: an id ending in a separator is refused");
    }

    // ───────────── S-3: the Add-app temp name (the expression AppNewPage.pickAppFileCore uses under the flag) ─────────────

    [TestMethod]
    public void s3_picked_name_builds_no_path()
    {
        string tmpPath = Path.Combine(Path.GetTempPath(), "csh-s3", "html", "Apps", "Tmp");
        string hostile = "../../../wallet.ixi";
        string onPath = Path.Combine(tmpPath, AuditRules.packageTempName());   // flag ON: C# names the file
        string offPath = Path.Combine(tmpPath, hostile + ".tmp");                // flag OFF: today
        Assert.IsTrue(SafetyRules.isInside(tmpPath, onPath) && !onPath.Contains("wallet"), "ON: the temp file is a C# name inside Tmp");
        Assert.IsFalse(SafetyRules.isInside(tmpPath, offPath), "OFF reproduces today: the provider's name leaves Tmp (S-3)");
        Assert.AreEqual("wallet.ixi", SafetyRules.safeBaseName(hostile), "ON (Android picker): the shown name is the base name only");
        Assert.AreEqual("evil.zip", SafetyRules.safeBaseName("..\\..\\evil.zip"), "ON (Android picker): a backslash is a separator too");
    }
}
