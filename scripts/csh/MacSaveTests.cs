// ★ macfixa item 1 (Mission Control n-20261015-mac-save, P121) — EXECUTED: the REAL Spixi/Utils/MacSaveRules.cs, the pure half
// of the Mac save chooser. BEHAVIOUR: which buttons show for a file name (Save first, Add to Photos only for a photo, Share,
// Cancel last), the photo test on the leaf of C#'s path (for a received file the peer's name; case, no extension, a dot at
// the end, a dot in a folder name, null, a backup / a log zip / the wallet file), the share menu items rule, every photo type is an image type of the viewer's Save
// (S11MediaRules.imageMimeOf), the string keys and English fallbacks, and the ONE log line (fixed words only; any other word →
// "other"). NOT executed here (⚠ C# UNCOMPILED, Mac Catalyst): Spixi/Platforms/MacCatalyst/SFileOperations.cs (the chooser, the
// save panel, the Photos add, the share menu); scripts/pins-macfixa/a-mac-save.mjs holds its source.
// DELIBERATE BREAKS (#802; one token each in Spixi/Utils/MacSaveRules.cs of a full copy, `node scripts/run-csh.mjs` there):
//   m1 photoExts `"png"` → `"pngx"` [photo_names_by_extension, photo_types_are_viewer_image_types];
//   m2 options `new[] { Save, Photos, Share, Cancel }` → `new[] { Photos, Save, Share, Cancel }` [buttons_for_a_photo];
//   m3 isPhoto `dot >= 0 &&` → `dot >= -1 &&` [not_a_photo, buttons_for_other_files: null throws];
//   m4 oneOf `Array.IndexOf(words, word) >= 0` → `>= -1` [log_line_fixed_words].
using System;
using System.Linq;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class MacSaveTests
{
    private static string join(string[] a) => string.Join(",", a);

    [TestMethod]
    public void photo_names_by_extension()
    {
        foreach (string n in new[] { "a.jpg", "a.JPG", "b.jpeg", "c.png", "d.gif", "e.heic", "f.webp", "x.y.Png", ".jpg" })
        {
            Assert.IsTrue(MacSaveRules.isPhoto(n), "a photo: " + n);
        }
    }

    [TestMethod]
    public void not_a_photo()
    {
        foreach (string? n in new[] { null, "", "jpg", "a.", "a.jpg ", "a.jpgx", "a.bmp", "a.avif", "a.tif", "a.pdf", "spixi.account.backup.ixi",
            "spixi.log.zip", "wallet.ixi", "dir.jpg/file", "dir.jpg\\file", "a.jpg.zip" })
        {
            Assert.IsFalse(MacSaveRules.isPhoto(n), "not a photo: " + (n ?? "null"));
        }
    }

    [TestMethod]
    public void buttons_for_a_photo()
    {
        Assert.AreEqual("save,photos,share,cancel", join(MacSaveRules.options("p.jpg")), "a photo: Save first, Photos, Share, Cancel last");
        Assert.IsTrue(MacSaveRules.isPhoto("p.jpg"), "a photo goes to the share menu as the URL alone");
    }

    [TestMethod]
    public void buttons_for_other_files()
    {
        foreach (string? n in new[] { "spixi.account.backup.ixi", "wallet.ixi", "spixi.log.zip", null, "a.bmp" })
        {
            Assert.AreEqual("save,share,cancel", join(MacSaveRules.options(n)), "no Photos button: " + (n ?? "null"));
            Assert.IsFalse(MacSaveRules.isPhoto(n), "the share menu keeps the title item: " + (n ?? "null"));
        }
    }

    [TestMethod]
    public void photo_types_are_viewer_image_types()
    {
        foreach (string ext in new[] { "jpg", "jpeg", "png", "gif", "heic", "webp" })
        {
            Assert.IsTrue(MacSaveRules.isPhoto("x." + ext), "in the list: " + ext);
            Assert.IsTrue(S11MediaRules.imageMimeOf("x." + ext).StartsWith("image/"), "an image type of the viewer's Save: " + ext);
        }
    }

    [TestMethod]
    public void keys_and_english()
    {
        Assert.AreEqual("global-share-savefile|Save File", MacSaveRules.keyOf(MacSaveRules.Save) + "|" + MacSaveRules.englishOf(MacSaveRules.Save), "save");
        Assert.AreEqual("global-share-addphotos|Add to Photos", MacSaveRules.keyOf(MacSaveRules.Photos) + "|" + MacSaveRules.englishOf(MacSaveRules.Photos), "photos");
        Assert.AreEqual("global-share-sharefile|Share File", MacSaveRules.keyOf(MacSaveRules.Share) + "|" + MacSaveRules.englishOf(MacSaveRules.Share), "share");
        Assert.AreEqual("global-dialog-cancel|Cancel", MacSaveRules.keyOf(MacSaveRules.Cancel) + "|" + MacSaveRules.englishOf(MacSaveRules.Cancel), "cancel");
    }

    [TestMethod]
    public void log_line_fixed_words()
    {
        Assert.AreEqual("[MACSAVE] choice=save r=done", MacSaveRules.logLine(MacSaveRules.Save, MacSaveRules.Done), "save done");
        Assert.AreEqual("[MACSAVE] choice=photos r=denied", MacSaveRules.logLine(MacSaveRules.Photos, MacSaveRules.Denied), "photos denied");
        Assert.AreEqual("[MACSAVE] choice=cancel r=cancel", MacSaveRules.logLine(MacSaveRules.Cancel, MacSaveRules.Cancelled), "cancel");
        string[] hostile = { "/Users/me/x.jpg", "x\ny", "SAVE", "save ", "", null!, "a‮b", "done=1" };
        foreach (string h in hostile)
        {
            Assert.AreEqual("[MACSAVE] choice=other r=other", MacSaveRules.logLine(h, h), "any other word is 'other': " + (h ?? "null"));
        }
        string[] words = { "save", "photos", "share", "cancel", "done", "denied", "fail", "other" };
        foreach (string c in words.Concat(hostile))
        {
            foreach (string r in words.Concat(hostile))
            {
                string[] parts = MacSaveRules.logLine(c, r).Split(' ');
                Assert.IsTrue(parts.Length == 3 && parts[0] == "[MACSAVE]" && parts[1].StartsWith("choice=") && parts[2].StartsWith("r=")
                    && words.Contains(parts[1].Substring(7)) && words.Contains(parts[2].Substring(2)), "one shape, known words only");
            }
        }
    }
}
