// EXECUTED: the REAL Spixi/Utils/AppIconRules.cs — the home screen's small mini-app icon copies (switch
// MacfixaFlags.AppIconReencode, packet P122) — over real files in a temp folder, and beside the REAL MiniAppManager.
// Shown here: the caps (a copy's data URI is never over 30,000 characters), the copy's name (a hash; no text of the app id
// in it), the source check (PNG or JPEG only), the size chain 192 → 144 → 120 → 96 → 72 → 48, and get(): ONE try per source
// (by size + last-write time) — the copy is read from disk by every later call (a restart is the same call: there is no
// state in memory), a new decode after the source changed, "" and a deferred call in a caller that may not decode, every failure → "" with
// ONE fixed-word line (no path, no app id) and no second decode, the mark that is on disk BEFORE the decoder runs and stays
// when no copy comes of it, a file under the copy's name that is not a finished copy is never sent. With the REAL
// MiniAppManager: a package that ships its own "copy" files changes nothing, no package can take the folder's name as its
// id, a restart lists no app for the folder, and removeAllApps (delete account) removes the folder.
// NOT shown: the three platform decoders and AppIconReencode.homeIcon (the folder, the `false` it passes, Task.Run and the
// `ready` signal) — they are MAUI-bound and UNCOMPILED here (pin pins-macfixa/b-icon reads them); the decoder is a model
// (it returns a PNG made in code); two threads at once; PhotoRules.decodeSample (Android's sample size) has its own tests.
// DELIBERATE BREAKS (one mutation each in a full copy, then node scripts/run-csh.mjs; the red tests in brackets):
//   i1 MaxCopyBytes `(30000 - 22)` → `(40000 - 22)` [caps_a_push_stays_under_30000_characters]
//   i2 copyName: `+ "\n" + ticks` dropped [copy_name_is_a_hash_of_id_size_and_time, get_a_changed_source_is_decoded_again]
//   i3 sourceOk: `(isPng(d) || (…))` → `true` [source_is_png_or_jpeg_only, get_every_failure_is_empty_one_line_no_retry]
//   i4 copyOk: the `&& p.AsSpan(p.Length - 8).SequenceEqual(PngTail)` part dropped [copy_is_a_whole_png_within_the_cap,
//      get_every_failure_is_empty_one_line_no_retry, get_a_file_that_is_not_a_finished_copy_is_never_sent]
//   i5a make: the loop's `&& !copyOk(png)` dropped (every step runs) [get_walks_the_steps_until_one_fits,
//      get_one_decode_then_the_copy_on_disk, get_a_changed_source_is_decoded_again, get_a_caller_that_may_not_decode_gets_empty_and_a_deferred_call,
//      folder_with_the_real_manager]
//   i5b make: the loop's `&& (i == 0 || png != null)` dropped [get_walks_the_steps_until_one_fits, get_every_failure_is_empty_one_line_no_retry]
//   i6 make: the mark line `File.WriteAllBytes(copy, Array.Empty<byte>());` deleted [get_the_mark_is_written_before_the_decode,
//      get_every_failure_is_empty_one_line_no_retry, get_a_caller_that_may_not_decode_gets_empty_and_a_deferred_call]
//   i7 get: `&& !mayDecode) later =` → `&& false) later =` (the decode runs in the caller) [get_a_caller_that_may_not_decode_gets_empty_and_a_deferred_call]
//   i8 uriOf: `copyOk(p) ?` → `isPng(p) ?` [caps_a_push_stays_under_30000_characters, copy_is_a_whole_png_within_the_cap,
//      get_a_file_that_is_not_a_finished_copy_is_never_sent]
//   i9 get's catch: `e.GetType().Name` → `e.Message` [get_every_failure_is_empty_one_line_no_retry]
//   i10 make: `if (File.Exists(copy)) return;` deleted [get_every_failure_is_empty_one_line_no_retry]
//   i11 fit: `Math.Max(w, h) <= side ? (w, h) :` dropped (a small icon is scaled up) [fit_keeps_the_aspect_and_never_scales_up]
//   i12 FolderName `"_icons"` → `"icons"` [caps_a_push_stays_under_30000_characters, folder_with_the_real_manager]
//   i13 make: the size test before the read dropped (`byte[]? data = File.ReadAllBytes(iconPath);`) [get_every_failure_is_empty_one_line_no_retry]
//   i17 get: `made.Exists && made.Length <= MaxCopyBytes ?` → `made.Exists ?` [get_a_file_that_is_not_a_finished_copy_is_never_sent]
//   i18 make: the `File.Move(copy + ".tmp", copy, true)` line deleted [get_one_decode_then_the_copy_on_disk and the other get_ tests that make a copy]
//   i20 make: the `.tmp` file written also for a PNG that is not a copy [get_every_failure_is_empty_one_line_no_retry]
using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;
using SPIXI.MiniApps;

[TestClass]
public class AppIconTests
{
    private static readonly byte[] Iend = { 0, 0, 0, 0, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 };
    private static List<string> Warns => IXICore.Meta.Logging.warns;
    private const string AppId = "com.secret-publisher.app";

    /** Two data URIs are the same text; a failure prints lengths, not 30,000 characters. */
    private static void sameUri(string expected, string actual, string m) => Assert.IsTrue(expected == actual, m + " (expected " + expected.Length + " characters, got " + actual.Length + ")");

    /** A whole PNG of exactly `n` bytes: a real signature + IHDR, filler, the IEND end (the rules read head and end). */
    private static byte[] pngOf(int n)
    {
        byte[] p = new byte[n];
        Array.Copy(SDevSeedPlan.png(1, 1, 4, 4), 0, p, 0, 33);
        Array.Copy(Iend, 0, p, n - Iend.Length, Iend.Length);
        return p;
    }

    /** One app folder with a real icon.png beside C#'s folder, and a counting model of the platform decoder. */
    private sealed class Box : IDisposable
    {
        public readonly string root = Path.Combine(Path.GetTempPath(), "csh-appicon-" + Guid.NewGuid().ToString("N"));
        public readonly string dir, icon;
        public readonly List<int> sides = new List<int>();
        public Func<byte[], int, byte[]?> decode;
        public int decodes => sides.Count;

        public Box()
        {
            dir = Path.Combine(root, "html", "Apps", AppIconRules.FolderName);
            Directory.CreateDirectory(Path.Combine(root, "html", "Apps", AppId));
            icon = Path.Combine(root, "html", "Apps", AppId, "icon.png");
            File.WriteAllBytes(icon, SDevSeedPlan.png(2, 3, 200, 200));
            File.SetLastWriteTimeUtc(icon, new DateTime(2026, 11, 1, 10, 0, 0, DateTimeKind.Utc));
            decode = (d, side) => pngOf(5000);
            Warns.Clear();
        }

        public string copy => Path.Combine(dir, AppIconRules.copyName(AppId, new FileInfo(icon).Length, new FileInfo(icon).LastWriteTimeUtc.Ticks));
        public string get(bool mayDecode, out Func<bool>? later) => AppIconRules.get(dir, AppId, icon, mayDecode, (d, side) => { sides.Add(side); return decode(d, side); }, out later);
        public bool noFile => !Directory.Exists(dir) || !Directory.EnumerateFiles(dir).Any();
        public void Dispose() { try { Directory.Delete(root, true); } catch (Exception) { } Warns.Clear(); }
    }

    // ───────────── the pure rules ─────────────

    [TestMethod]
    public void caps_a_push_stays_under_30000_characters()
    {
        Assert.AreEqual(22482, AppIconRules.MaxCopyBytes, "the copy's byte cap");
        string biggest = AppIconRules.uriOf(pngOf(AppIconRules.MaxCopyBytes));
        Assert.IsTrue(biggest.StartsWith("data:image/png;base64,") && "data:image/png;base64,".Length == 22, "the head's length is the 22 in MaxCopyBytes");
        Assert.IsTrue(biggest.Length > 29000 && biggest.Length <= 30000, "the biggest copy's data URI: " + biggest.Length);
        sameUri("", AppIconRules.uriOf(pngOf(AppIconRules.MaxCopyBytes + 1)), "one byte more is not a copy");
        Assert.AreEqual("192,144,120,96,72,48", string.Join(",", AppIconRules.Steps), "the size steps");
        Assert.AreEqual(1024 * 1024, AppIconRules.MaxSourceBytes, "the source cap");
        Assert.IsFalse(SafetyRules.isSafeAppId(AppIconRules.FolderName), "no package can have the folder's name as its id");
        Assert.IsFalse(string.Equals(AppIconRules.FolderName, SafetyRules.TmpFolderName, StringComparison.OrdinalIgnoreCase), "not the manager's Tmp");
    }

    [TestMethod]
    public void copy_name_is_a_hash_of_id_size_and_time()
    {
        string n = AppIconRules.copyName("com.test.app", 1000, 638000000000000000);
        Assert.AreEqual("c1e2011ce17cbea4135b0401cef886a9794b9c66.png", n, "SHA-256 of id, size, ticks: the first 20 bytes as hex");
        Assert.AreEqual(n, AppIconRules.copyName("com.test.app", 1000, 638000000000000000), "the same source, the same name");
        Assert.IsFalse(n == AppIconRules.copyName("com.test.apq", 1000, 638000000000000000), "another id");
        Assert.IsFalse(n == AppIconRules.copyName("com.test.app", 1001, 638000000000000000), "another size");
        Assert.IsFalse(n == AppIconRules.copyName("com.test.app", 1000, 638000000000000001), "another last-write time");
        foreach (string id in new[] { "../../wallet", "a/b", "a\\b", "C:\\x", "icon.png", "x y", "" })
        {
            string h = AppIconRules.copyName(id, 5, 6);
            Assert.IsTrue(h.Length == 44 && h.EndsWith(".png") && h.Substring(0, 40).All(c => (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f')), "40 hex + .png for [" + id + "]: " + h);
        }
    }

    [TestMethod]
    public void source_is_png_or_jpeg_only()
    {
        byte[] jpeg = new byte[64]; jpeg[0] = 0xFF; jpeg[1] = 0xD8; jpeg[2] = 0xFF; jpeg[3] = 0xE0;
        Assert.IsTrue(AppIconRules.sourceOk(SDevSeedPlan.png(1, 1, 8, 8)), "a PNG");
        Assert.IsTrue(AppIconRules.sourceOk(jpeg), "a JPEG");
        byte[] gif = new byte[64]; Array.Copy(System.Text.Encoding.ASCII.GetBytes("GIF89a"), gif, 6);
        byte[] webp = new byte[64]; Array.Copy(System.Text.Encoding.ASCII.GetBytes("RIFF"), webp, 4); Array.Copy(System.Text.Encoding.ASCII.GetBytes("WEBP"), 0, webp, 8, 4);
        byte[] heic = new byte[64]; Array.Copy(System.Text.Encoding.ASCII.GetBytes("ftypheic"), 0, heic, 4, 8);
        byte[] svg = System.Text.Encoding.ASCII.GetBytes("<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>");
        Assert.IsTrue(ImageSniff.looksLikeImage(gif) && ImageSniff.looksLikeImage(webp) && ImageSniff.looksLikeImage(heic), "the wider sniff takes these three");
        Assert.IsFalse(AppIconRules.sourceOk(gif), "a GIF");
        Assert.IsFalse(AppIconRules.sourceOk(webp), "a WebP");
        Assert.IsFalse(AppIconRules.sourceOk(heic), "a HEIC");
        Assert.IsFalse(AppIconRules.sourceOk(svg), "an SVG");
        Assert.IsFalse(AppIconRules.sourceOk(null), "null");
        Assert.IsFalse(AppIconRules.sourceOk(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }), "8 bytes only");
        byte[] half = SDevSeedPlan.png(1, 1, 8, 8); half[5] = 0x00;
        Assert.IsFalse(AppIconRules.sourceOk(half), "a PNG with a wrong byte 6 of the signature");
        byte[] big = new byte[AppIconRules.MaxSourceBytes + 1]; Array.Copy(SDevSeedPlan.png(1, 1, 8, 8), big, 33);
        Assert.IsFalse(AppIconRules.sourceOk(big), "a PNG over the source cap");
    }

    [TestMethod]
    public void copy_is_a_whole_png_within_the_cap()
    {
        byte[] good = pngOf(900);
        Assert.IsTrue(AppIconRules.copyOk(good), "head + IEND end");
        Assert.IsTrue(AppIconRules.copyOk(SDevSeedPlan.png(3, 4, 96, 96)), "a real PNG made in code");
        sameUri("data:image/png;base64," + Convert.ToBase64String(good), AppIconRules.uriOf(good), "the data URI");
        byte[] cut = good.Take(good.Length - 5).ToArray();
        Assert.IsFalse(AppIconRules.copyOk(cut), "cut before its end");
        sameUri("", AppIconRules.uriOf(cut), "no URI for a cut copy");
        Assert.IsFalse(AppIconRules.copyOk(null), "null");
        Assert.IsFalse(AppIconRules.copyOk(new byte[0]), "empty");
        byte[] jpeg = new byte[900]; jpeg[0] = 0xFF; jpeg[1] = 0xD8; jpeg[2] = 0xFF;
        Assert.IsFalse(AppIconRules.copyOk(jpeg), "a copy is a PNG, never the source's JPEG");
        Assert.IsTrue(AppIconRules.dimsOk(1, 1) && AppIconRules.dimsOk(2048, 2048), "the declared-size bounds are in");
        Assert.IsFalse(AppIconRules.dimsOk(0, 10) || AppIconRules.dimsOk(10, 0) || AppIconRules.dimsOk(-1, -1) || AppIconRules.dimsOk(2049, 10) || AppIconRules.dimsOk(10, 2049) || AppIconRules.dimsOk(int.MaxValue, int.MaxValue), "outside");
    }

    [TestMethod]
    public void fit_keeps_the_aspect_and_never_scales_up()
    {
        Assert.AreEqual((144, 144), AppIconRules.fit(512, 512, 144), "a square");
        Assert.AreEqual((144, 72), AppIconRules.fit(1000, 500, 144), "wide");
        Assert.AreEqual((72, 144), AppIconRules.fit(500, 1000, 144), "tall");
        Assert.AreEqual((100, 50), AppIconRules.fit(100, 50, 144), "smaller than the step: unchanged");
        Assert.AreEqual((144, 144), AppIconRules.fit(144, 144, 144), "equal: unchanged");
        Assert.AreEqual((144, 1), AppIconRules.fit(2048, 1, 144), "a strip keeps one pixel");
        Assert.AreEqual((48, 12), AppIconRules.fit(256, 64, 48), "the last step");
        // Android's sample size (PhotoRules.decodeSample) for the first step: the decoded long side stays at or above it, below 2 × it + 1
        for (int side = 1; side <= 2048; side += 7)
        {
            int after = side / PhotoRules.decodeSample(side, AppIconRules.Steps[0]);
            Assert.IsTrue(after <= 384 && (side < 192 || after >= 192), "the decoded long side of " + side + " is " + after);
        }
    }

    // ───────────── get ─────────────

    [TestMethod]
    public void get_one_decode_then_the_copy_on_disk()
    {
        using var b = new Box();
        byte[]? seen = null;
        b.decode = (d, side) => { seen = d; return pngOf(5000); };
        string uri = b.get(true, out Func<bool>? later);
        sameUri(AppIconRules.uriOf(pngOf(5000)), uri, "the copy's data URI, not the source's");
        Assert.IsTrue(later == null, "nothing deferred to the pool");
        Assert.AreEqual("192", string.Join(",", b.sides), "one decode, at the first step");
        Assert.IsTrue(seen != null && seen.SequenceEqual(File.ReadAllBytes(b.icon)), "the decoder got the source bytes");
        Assert.IsTrue(File.ReadAllBytes(b.copy).SequenceEqual(pngOf(5000)), "the copy is on disk under C#'s name");
        Assert.AreEqual(Path.GetFileName(b.copy), string.Join(",", Directory.EnumerateFiles(b.dir).Select(f => Path.GetFileName(f))), "the one file of C#'s own folder");
        Assert.AreEqual("icon.png", string.Join(",", Directory.EnumerateFiles(Path.GetDirectoryName(b.icon)!).Select(f => Path.GetFileName(f))), "nothing is written into the package's folder");
        Assert.IsFalse(uri.Contains(Convert.ToBase64String(File.ReadAllBytes(b.icon)).Substring(0, 60)), "no source bytes in the push");
        b.decode = (d, side) => throw new InvalidOperationException("a second decode");
        for (int i = 0; i < 6; i++)
        {
            sameUri(uri, b.get(i % 2 == 0, out later), "pass " + i + " (a restart is the same call: the copy is read from disk)");
            Assert.IsTrue(later == null, "nothing to decode, in a caller that may not decode too");
        }
        Assert.AreEqual(1, b.decodes, "ONE decode for seven passes");
        Assert.AreEqual(0, Warns.Count, "no line");
    }

    [TestMethod]
    public void get_a_changed_source_is_decoded_again()
    {
        using var b = new Box();
        b.get(true, out _);
        string oldCopy = b.copy;
        File.SetLastWriteTimeUtc(b.icon, new DateTime(2026, 11, 2, 10, 0, 0, DateTimeKind.Utc));   // an update: the same size, a new time
        b.decode = (d, side) => pngOf(6000);
        string second = b.get(true, out _);
        Assert.AreEqual(2, b.decodes, "the new source is decoded");
        sameUri(AppIconRules.uriOf(pngOf(6000)), second, "the new copy");
        Assert.IsFalse(oldCopy == b.copy, "under a new name");
        File.WriteAllBytes(b.icon, SDevSeedPlan.png(2, 3, 201, 200));                               // a new size, the time set back
        File.SetLastWriteTimeUtc(b.icon, new DateTime(2026, 11, 2, 10, 0, 0, DateTimeKind.Utc));
        b.get(true, out _);
        Assert.AreEqual(3, b.decodes, "a new size is a new source");
    }

    [TestMethod]
    public void get_walks_the_steps_until_one_fits()
    {
        using var b = new Box();
        b.decode = (d, side) => pngOf(side >= 120 ? AppIconRules.MaxCopyBytes + 1 : 4000 + side);
        string uri = b.get(true, out _);
        Assert.AreEqual("192,144,120,96", string.Join(",", b.sides), "192, 144 and 120 are over the cap, 96 fits, nothing after it is made");
        sameUri(AppIconRules.uriOf(pngOf(4096)), uri, "the 96 px copy");
        using var c = new Box();
        c.decode = (d, side) => side == 192 ? pngOf(AppIconRules.MaxCopyBytes + 1) : side == 144 ? new byte[] { 1, 2, 3 } : pngOf(700);
        sameUri(AppIconRules.uriOf(pngOf(700)), c.get(true, out _), "an over-cap PNG and a non-PNG are not copies: the next step");
        Assert.AreEqual("192,144,120", string.Join(",", c.sides), "three steps");
        using var u = new Box();
        u.decode = (d, side) => null;
        sameUri("", u.get(true, out _), "the decoder cannot read the picture → the default icon");
        Assert.AreEqual("192", string.Join(",", u.sides), "…and the bytes are not handed to it a second time");
        using var n = new Box();
        n.decode = (d, side) => pngOf(AppIconRules.MaxCopyBytes + 1);
        sameUri("", n.get(true, out _), "nothing fits → the default icon");
        Assert.AreEqual("192,144,120,96,72,48", string.Join(",", n.sides), "all six steps were tried, once");
    }

    [TestMethod]
    public void get_a_caller_that_may_not_decode_gets_empty_and_a_deferred_call()
    {
        using var b = new Box();
        sameUri("", b.get(false, out Func<bool>? later), "loadApps (mayDecode false, on any thread) never waits for a decode");
        Assert.IsTrue(later != null, "the decode is handed back for the pool");
        Assert.AreEqual(0, b.decodes, "nothing was decoded in a caller that may not decode");
        Assert.IsTrue(b.noFile, "nothing was written in a caller that may not decode");
        Assert.IsTrue(later!(), "the deferred call made a copy: push the list again");
        Assert.AreEqual(1, b.decodes, "one decode");
        Assert.IsTrue(later!() && b.decodes == 1, "run again, the deferred call reads the copy: no second decode");
        sameUri(AppIconRules.uriOf(pngOf(5000)), b.get(false, out Func<bool>? again), "the next pass sends the copy");
        Assert.IsTrue(again == null && b.decodes == 1, "nothing more to decode");
        // a broken icon in a caller that may not decode: the deferred call says "no new push", and nothing is tried again
        using var bad = new Box();
        bad.decode = (d, side) => null;
        sameUri("", bad.get(false, out later), "broken, may not decode");
        Assert.IsFalse(later!(), "no copy → no new push");
        int tried = bad.decodes;
        sameUri("", bad.get(false, out again), "still the default icon");
        Assert.IsTrue(again == null && bad.decodes == tried, "and no second try");
    }

    [TestMethod]
    public void get_every_failure_is_empty_one_line_no_retry()
    {
        var cases = new (string line, Action<Box> arrange, int decodes)[]
        {
            ("App icon: no small copy", (x) => { File.WriteAllBytes(x.icon, new byte[AppIconRules.MaxSourceBytes + 1]); }, 0),
            ("App icon: no small copy", (x) => { File.WriteAllBytes(x.icon, System.Text.Encoding.ASCII.GetBytes("GIF89a-not-for-a-decoder-0123456789")); }, 0),
            ("App icon: no small copy", (x) => { File.WriteAllBytes(x.icon, new byte[] { 0x89, 0x50 }); }, 0),
            ("App icon: no small copy", (x) => { x.decode = (d, side) => null; }, 1),
            ("App icon: no small copy", (x) => { x.decode = (d, side) => pngOf(AppIconRules.MaxCopyBytes + 1); }, 6),
            ("App icon: no small copy", (x) => { x.decode = (d, side) => File.ReadAllBytes(x.icon).Take(4000).ToArray(); }, 6),
            ("App icon: no small copy (InvalidOperationException)", (x) => { x.decode = (d, side) => throw new InvalidOperationException("at " + x.icon + " for " + AppId); }, 1),
        };
        for (int k = 0; k < cases.Length; k++)
        {
            using var b = new Box();
            cases[k].arrange(b);
            string what = "case " + k;
            sameUri("", b.get(true, out Func<bool>? later), what + ": the default icon");
            Assert.IsTrue(later == null, what + ": nothing deferred");
            Assert.AreEqual(cases[k].decodes, b.decodes, what + ": the decoder's calls (0 = it never got the bytes; 1 = it could not read them; 6 = each step once)");
            Assert.AreEqual(cases[k].line, string.Join("|", Warns), what + ": ONE line of fixed words");
            Assert.IsTrue(File.Exists(b.copy) && new FileInfo(b.copy).Length == 0, what + ": the mark stays");
            Assert.AreEqual(Path.GetFileName(b.copy), string.Join(",", Directory.EnumerateFiles(b.dir).Select(f => Path.GetFileName(f))), what + ": and nothing else is written");
            for (int i = 0; i < 4; i++) sameUri("", b.get(i % 2 == 0, out later), what + ": pass " + i);
            Assert.IsTrue(later == null && b.decodes == cases[k].decodes, what + ": never tried again");
            Assert.AreEqual(1, Warns.Count, what + ": no second line");
            Assert.IsFalse(Warns[0].Contains(AppId) || Warns[0].Contains("csh-appicon") || Warns[0].Contains("icon.png") || Warns[0].Contains(Path.DirectorySeparatorChar), what + ": no id, no path in the line");
        }
        // an oversized source is refused BEFORE it is read: the test holds it open with no sharing, so a read would throw
        using (var big = new Box())
        {
            File.WriteAllBytes(big.icon, new byte[AppIconRules.MaxSourceBytes + 1]);
            using (new FileStream(big.icon, FileMode.Open, FileAccess.Read, FileShare.None))
            {
                sameUri("", big.get(true, out _), "oversized");
            }
            Assert.AreEqual("App icon: no small copy", string.Join("|", Warns), "refused by its size, never opened");
        }
        // a second make for a source that has its file is a no-op (two threads that both saw no copy)
        using (var twice = new Box())
        {
            string first = twice.get(true, out _);
            var make = typeof(AppIconRules).GetMethod("make", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static)!;
            make.Invoke(null, new object[] { twice.icon, twice.copy, (Func<byte[], int, byte[]?>)((d, side) => { twice.sides.Add(side); return pngOf(777); }) });
            Assert.AreEqual(1, twice.decodes, "no second decode");
            sameUri(first, twice.get(true, out _), "the first copy stays");
        }
        // a missing icon or id: "" with no line and no work
        using var m = new Box();
        sameUri("", AppIconRules.get(m.dir, AppId, "", true, m.decode, out Func<bool>? l2), "no icon path");
        sameUri("", AppIconRules.get(m.dir, AppId, null!, true, m.decode, out l2), "a null icon path");
        sameUri("", AppIconRules.get(m.dir, AppId, Path.Combine(m.root, "none.png"), true, m.decode, out l2), "the file is not there");
        sameUri("", AppIconRules.get(m.dir, "", m.icon, true, m.decode, out l2), "no app id");
        Assert.IsTrue(l2 == null && m.noFile && Warns.Count == 0, "nothing ran, nothing was logged");
        // C#'s folder cannot be made (a FILE has its name): "" and a type-only line, never a throw
        File.WriteAllBytes(Path.Combine(m.root, "html", "Apps", AppIconRules.FolderName), new byte[] { 1 });
        sameUri("", m.get(true, out l2), "no folder → the default icon");
        Assert.IsTrue(Warns.Count == 1 && Warns[0].StartsWith("App icon: no small copy (") && Warns[0].EndsWith("Exception)") && !Warns[0].Contains("csh-appicon"), "a type-only line: " + string.Join("|", Warns));
        sameUri("", AppIconRules.get(null!, AppId, m.icon, true, m.decode, out l2), "no folder name: never a throw");
    }

    [TestMethod]
    public void get_the_mark_is_written_before_the_decode()
    {
        using var b = new Box();
        long markDuringDecode = -1;
        b.decode = (d, side) => { markDuringDecode = File.Exists(b.copy) ? new FileInfo(b.copy).Length : -1; return pngOf(5000); };
        b.get(true, out _);
        Assert.AreEqual(0L, markDuringDecode, "an empty file under the copy's name lies on disk WHILE the decoder runs");
        Assert.AreEqual(5000L, new FileInfo(b.copy).Length, "…and is the copy after it");
        Assert.AreEqual(Path.GetFileName(b.copy), string.Join(",", Directory.EnumerateFiles(b.dir).Select(f => Path.GetFileName(f))), "the whole copy took the mark's place: no other file is left");
        // the process ended inside the decoder: the mark is all that is left
        File.WriteAllBytes(b.copy, new byte[0]);
        b.sides.Clear();
        sameUri("", b.get(true, out Func<bool>? later), "the next process sends the default icon");
        sameUri("", b.get(false, out later), "…in a caller that may not decode too");
        Assert.IsTrue(later == null && b.decodes == 0, "the source that ended a process is never decoded again");
        Assert.IsTrue(File.Exists(b.copy) && new FileInfo(b.copy).Length == 0, "the mark stays");
    }

    [TestMethod]
    public void get_a_file_that_is_not_a_finished_copy_is_never_sent()
    {
        foreach (byte[] planted in new[] { SDevSeedPlan.png(2, 3, 200, 200).Take(3000).ToArray(), pngOf(AppIconRules.MaxCopyBytes + 1), System.Text.Encoding.ASCII.GetBytes("<svg onload=alert(1)>0123456789abcdef") })
        {
            using var b = new Box();
            Directory.CreateDirectory(b.dir);
            File.WriteAllBytes(b.copy, planted);
            sameUri("", b.get(true, out Func<bool>? later), "a cut PNG, an over-cap PNG or other bytes under the copy's name: the default icon");
            sameUri("", b.get(false, out later), "…in a caller that may not decode too");
            Assert.IsTrue(later == null && b.decodes == 0, "and no decode");
        }
        // a file over the cap under the copy's name is not even read: the test holds it open with no sharing
        using (var big = new Box())
        {
            Directory.CreateDirectory(big.dir);
            File.WriteAllBytes(big.copy, pngOf(AppIconRules.MaxCopyBytes + 1));
            using (new FileStream(big.copy, FileMode.Open, FileAccess.Read, FileShare.None))
            {
                sameUri("", big.get(false, out _), "over the cap");
            }
            Assert.AreEqual(0, Warns.Count, "refused by its size: no read, so no line — " + string.Join("|", Warns));
        }
    }

    // ───────────── C#'s folder beside the REAL MiniAppManager ─────────────

    private static string appZip(string dir, string id, Action<string>? extra = null)
    {
        string src = Path.Combine(dir, "pkgsrc-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path.Combine(src, "app"));
        File.WriteAllText(Path.Combine(src, "appinfo.spixi"), "caVersion = 0\nid = " + id + "\nname = Proof\nversion = 1.0.0\n");
        File.WriteAllText(Path.Combine(src, "app", "index.html"), "<html></html>");
        File.WriteAllBytes(Path.Combine(src, "icon.png"), SDevSeedPlan.png(5, 6, 200, 200));
        extra?.Invoke(src);
        string zip = Path.Combine(dir, "pkg-" + Guid.NewGuid().ToString("N") + ".zip");
        ZipFile.CreateFromDirectory(src, zip);
        Directory.Delete(src, true);
        return zip;
    }

    [TestMethod]
    public void folder_with_the_real_manager()
    {
        string root = Path.Combine(Path.GetTempPath(), "csh-appicon-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        try
        {
            SpixiFlags.init();
            Assert.IsTrue(SpixiFlags.SafeAppId, "the app-id rule is on (no stored 0)");
            string bas = Path.Combine(root, "Spixi");
            string dir = Path.Combine(bas, "html", "Apps", AppIconRules.FolderName);   // homeIcon's formula over Config.spixiUserFolder
            var mgr = new MiniAppManager(bas);
            // a package cannot take the folder's name as its id — also while the folder does not exist yet
            Assert.IsTrue(mgr.installFromPath(appZip(root, AppIconRules.FolderName)) == null, "a package named like C#'s folder is refused");
            Assert.IsFalse(Directory.Exists(dir), "…and made no folder");
            // a package that ships ready-made "copies" beside its icon
            byte[] planted = System.Text.Encoding.ASCII.GetBytes("PLANTED-BY-THE-PACKAGE-0123456789abcdef");
            const string id = "com.example.icon";
            string zip = appZip(root, id, (src) =>
            {
                File.WriteAllBytes(Path.Combine(src, "icon.home.png"), planted);
                Directory.CreateDirectory(Path.Combine(src, AppIconRules.FolderName));
                File.WriteAllBytes(Path.Combine(src, AppIconRules.FolderName, "x.png"), planted);
            });
            Assert.AreEqual("Proof", mgr.installFromPath(zip), "the package installs");
            string? icon = mgr.getAppIconPath(id);
            Assert.AreEqual(Path.Combine(bas, "html", "Apps", id, "icon.png"), icon, "the source is the manager's own path");
            int decodes = 0;
            string uri = AppIconRules.get(dir, id, icon!, true, (d, side) => { decodes++; return pngOf(5000); }, out _);
            sameUri(AppIconRules.uriOf(pngOf(5000)), uri, "the push is C#'s copy");
            Assert.AreEqual(1, decodes, "made by one decode: no file of the package stood in for it");
            var fi = new FileInfo(icon!);
            Assert.AreEqual(AppIconRules.copyName(id, fi.Length, fi.LastWriteTimeUtc.Ticks), string.Join(",", Directory.EnumerateFileSystemEntries(dir).Select(f => Path.GetFileName(f))), "C#'s folder holds the copy only");
            // a restart: the folder is not an app, and the copy is read with no decode
            var mgr2 = new MiniAppManager(bas);
            mgr2.start();
            Assert.AreEqual(id, string.Join(",", mgr2.getInstalledApps().Keys), "one app is listed");
            sameUri(uri, AppIconRules.get(dir, id, mgr2.getAppIconPath(id)!, false, (d, side) => { decodes++; return null; }, out _), "…and its copy is read from disk");
            Assert.AreEqual(1, decodes, "with no second decode");
            // delete account
            mgr2.removeAllApps();
            Assert.IsFalse(Directory.Exists(dir), "removeAllApps removes C#'s folder with the apps");
        }
        finally
        {
            try { Directory.Delete(root, true); } catch (Exception) { }
            Warns.Clear();
        }
    }
}
