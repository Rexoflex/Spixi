// ★ #1166 V-3 (#1144 / #1154) — the chat-info viewer / delete / Show-in-Downloads rules (Spixi/Utils/ViewerRules.cs),
// EXECUTED. The call sites (ContactDetails, SharedItems, ViewerImage, Platforms/Windows/SThumbnail) are MAUI-bound;
// scripts/pins-s5/viewer.mjs pins that each site calls these rules.
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class ViewerRulesTests
{
    [TestMethod]
    public void token_grammar_is_hex_colon_digits_only()
    {
        Assert.IsTrue(ViewerRules.isItemToken("ab12EF:0"), "hex id : 0");
        Assert.IsTrue(ViewerRules.isItemToken(new string('a', 128) + ":9999"), "128 hex + 4 digits");
        Assert.IsFalse(ViewerRules.isItemToken(new string('a', 129) + ":0"), "129 hex");
        Assert.IsFalse(ViewerRules.isItemToken("ab:12345"), "5 digits");
        Assert.IsFalse(ViewerRules.isItemToken("ab"), "no index");
        Assert.IsFalse(ViewerRules.isItemToken(":0"), "no id");
        Assert.IsFalse(ViewerRules.isItemToken("ab:"), "empty index");
        Assert.IsFalse(ViewerRules.isItemToken("ab:1:2"), "two separators");
        Assert.IsFalse(ViewerRules.isItemToken("g1:0"), "non-hex id");
        Assert.IsFalse(ViewerRules.isItemToken("../a:0"), "a path is never a token");
        Assert.IsFalse(ViewerRules.isItemToken("ab:-1"), "a sign");
        Assert.IsFalse(ViewerRules.isItemToken("ab:1'"), "a quote");
        Assert.IsFalse(ViewerRules.isItemToken(null), "null");
        Assert.IsFalse(ViewerRules.isItemToken(""), "empty");
    }

    [TestMethod]
    public void view_is_a_local_image_only()
    {
        Assert.IsTrue(ViewerRules.mayView("media", true));
        Assert.IsFalse(ViewerRules.mayView("media", false), "not on this device");
        Assert.IsFalse(ViewerRules.mayView("file", true), "a non-image file opens through the OS, not the viewer");
        Assert.IsFalse(ViewerRules.mayView("link", true));
    }

    [TestMethod]
    public void delete_is_received_local_inside_downloads_only()
    {
        Assert.IsTrue(ViewerRules.mayDeleteLocal("media", true, true, true), "received image in Downloads");
        Assert.IsTrue(ViewerRules.mayDeleteLocal("file", true, true, true), "received file in Downloads");
        Assert.IsFalse(ViewerRules.mayDeleteLocal("media", false, true, true), "a SENT original is never deleted — even inside Downloads");
        Assert.IsFalse(ViewerRules.mayDeleteLocal("media", false, true, false), "a SENT original (the picker path)");
        Assert.IsFalse(ViewerRules.mayDeleteLocal("media", true, false, false), "no local copy");
        Assert.IsFalse(ViewerRules.mayDeleteLocal("media", true, true, false), "outside the Downloads root");
        Assert.IsFalse(ViewerRules.mayDeleteLocal("link", true, true, true), "a link has no file");
        Assert.IsFalse(ViewerRules.mayDeleteLocal(null, true, true, true), "no kind");
    }

    [TestMethod]
    public void show_in_downloads_follows_the_delete_rule()
    {
        Assert.IsTrue(ViewerRules.mayShowInDownloads("media", true, true, true));
        Assert.IsFalse(ViewerRules.mayShowInDownloads("media", false, true, true), "a sent file is not in the Downloads list");
        Assert.IsFalse(ViewerRules.mayShowInDownloads("file", true, true, false), "outside the root");
    }

    [TestMethod]
    public void source_gate_is_sniff_and_cap()
    {
        byte[] jpeg = { 0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, 0x4A, 0x46, 0x49, 0x46, 0, 1, 0, 0, 0, 0 };
        byte[] exe = { 0x4D, 0x5A, 0x90, 0, 3, 0, 0, 0, 4, 0, 0, 0, 0xFF, 0xFF, 0, 0 };
        long cap = 20L * 1024 * 1024;
        Assert.IsTrue(ViewerRules.viewerSourceOk(jpeg, 1000, cap));
        Assert.IsTrue(ViewerRules.viewerSourceOk(jpeg, cap, cap), "exactly the cap");
        Assert.IsFalse(ViewerRules.viewerSourceOk(jpeg, cap + 1, cap), "above the cap never reaches a decoder");
        Assert.IsFalse(ViewerRules.viewerSourceOk(jpeg, 0, cap), "empty");
        Assert.IsFalse(ViewerRules.viewerSourceOk(exe, 1000, cap), "a renamed executable");
        Assert.IsFalse(ViewerRules.viewerSourceOk(null, 1000, cap), "unreadable head");
        Assert.IsTrue(ViewerRules.viewerJpegOk(1_200_000, 1_200_000));
        Assert.IsFalse(ViewerRules.viewerJpegOk(1_200_001, 1_200_000), "a bigger result is dropped");
        Assert.IsFalse(ViewerRules.viewerJpegOk(0, 1_200_000));
    }

    // a 3 × 2 BGRA image whose pixel (x, y) carries the byte 10*y + x in all four channels
    private static byte[] img3x2()
    {
        byte[] b = new byte[3 * 2 * 4];
        for (int y = 0; y < 2; y++) for (int x = 0; x < 3; x++) for (int c = 0; c < 4; c++) b[(y * 3 + x) * 4 + c] = (byte)(10 * y + x);
        return b;
    }
    private static string grid(byte[] b, int w, int h)
    {
        var sb = new System.Text.StringBuilder();
        for (int y = 0; y < h; y++) { for (int x = 0; x < w; x++) sb.Append(b[(y * w + x) * 4].ToString("00")).Append(x < w - 1 ? " " : ""); if (y < h - 1) sb.Append('/'); }
        return sb.ToString();
    }

    [TestMethod]
    public void orient_bgra_follows_the_exif_table()
    {
        // stored:  00 01 02 / 10 11 12
        string[] want = {
            null!, "00 01 02/10 11 12",            // 1 normal (unchanged)
            "02 01 00/12 11 10",                   // 2 mirror horizontal
            "12 11 10/02 01 00",                   // 3 rotate 180
            "10 11 12/00 01 02",                   // 4 mirror vertical
            "00 10/01 11/02 12",                   // 5 transpose
            "10 00/11 01/12 02",                   // 6 rotate 90 CW (the usual portrait phone photo)
            "12 02/11 01/10 00",                   // 7 transverse
            "02 12/01 11/00 10",                   // 8 rotate 270 CW
        };
        for (int o = 1; o <= 8; o++)
        {
            byte[] r = ViewerRules.orientBgra(img3x2(), 3, 2, o, out int ow, out int oh);
            Assert.AreEqual(o >= 5 ? 2 : 3, ow, "width o=" + o);
            Assert.AreEqual(o >= 5 ? 3 : 2, oh, "height o=" + o);
            Assert.AreEqual(want[o], grid(r, ow, oh), "pixels o=" + o);
        }
        byte[] u = ViewerRules.orientBgra(img3x2(), 3, 2, 9, out int uw, out int uh);
        Assert.AreEqual("00 01 02/10 11 12", grid(u, uw, uh), "an unknown value is ignored");
        byte[] s = new byte[8];
        Assert.IsTrue(object.ReferenceEquals(s, ViewerRules.orientBgra(s, 3, 2, 6, out _, out _)), "a short buffer is returned unchanged");
    }
}
