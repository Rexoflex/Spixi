// EXECUTED: the REAL Spixi/Utils/MediaPushRules.cs — the chat page's choice of value for setFileThumb / viewerImage (the grant
// URL or the data: URI of the same bytes) and the two cap words of its setCaps (contract docs/contract-imgurl.md § 3, item 1b).
// Groups (9 tests): urlPath (4) · valueOf (3) · capsText (1) · switch OFF = the base (1).
// The expected values are written out per row, NOT computed by the rule's own expression.
// NOT executed here (MAUI-bound: SingleChatPage.MediaOrigin.cs, the call sites in SingleChatPage.xaml.cs, ViewerImage.jpegOfAsync,
// MediaGrants): held by the source pin scripts/pins-imgurl/b-page.mjs (its limits are its first lines); the grants themselves:
// MediaGrantsTests.cs (item 1a).
// DELIBERATE BREAKS (#802; each ONE mutation in a full copy, then `node scripts/run-csh.mjs`, then restored; the red tests in brackets):
//  m1 urlPath `switchOn && serving` → `switchOn || serving` [url_path_needs_the_switch, url_path_needs_a_serving_handler,
//     url_path_needs_this_documents_caps, switch_off_is_the_base]
//  m2 urlPath `declaredDoc == doc` dropped [url_path_needs_this_documents_caps]
//  m3 valueOf `grantUrl ?? JpegDataPrefix + …` → `JpegDataPrefix + …` [value_is_the_grant_url_and_builds_nothing]
//  m4 capsText `keepOn ? OriginCap + KeepCap : OriginCap` → `OriginCap + KeepCap` [caps_text_every_combination]
using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class MediaPushTests
{
    private static readonly byte[] Jpeg = { 0xFF, 0xD8, 0xFF, 0xE0 };
    private const string JpegUri = "data:image/jpeg;base64,/9j/4A==";
    private const string Url = "https://spixi-media.invalid/m/0123456789abcdef0123456789abcdef";

    [TestMethod]
    public void url_path_needs_the_switch()
    {
        Assert.IsFalse(MediaPushRules.urlPath(false, true, 3, 3), "switch OFF, serving, declared → data");
        Assert.IsFalse(MediaPushRules.urlPath(false, false, 3, 3), "switch OFF, no server → data");
        Assert.IsFalse(MediaPushRules.urlPath(false, true, -1, 3), "switch OFF, not declared → data");
    }

    [TestMethod]
    public void url_path_needs_a_serving_handler()
    {
        Assert.IsFalse(MediaPushRules.urlPath(true, false, 3, 3), "no server → data");
        Assert.IsFalse(MediaPushRules.urlPath(true, false, -1, 3), "no server, not declared → data");
    }

    [TestMethod]
    public void url_path_needs_this_documents_caps()
    {
        Assert.IsFalse(MediaPushRules.urlPath(true, true, -1, 3), "no document declared mediaOrigin → data");
        Assert.IsFalse(MediaPushRules.urlPath(true, true, 2, 3), "an older document declared it → data");
        Assert.IsFalse(MediaPushRules.urlPath(true, true, 4, 3), "another document declared it → data");
        Assert.IsFalse(MediaPushRules.urlPath(true, true, -1, -1), "-1 is never a declared document");
    }

    [TestMethod]
    public void url_path_when_all_three_hold()
    {
        Assert.IsTrue(MediaPushRules.urlPath(true, true, 3, 3), "switch ON, serving, this document declared it → URL");
        Assert.IsTrue(MediaPushRules.urlPath(true, true, 0, 0), "document 0 counts");
    }

    [TestMethod]
    public void value_without_a_grant_is_the_data_uri_of_the_same_bytes()
    {
        Assert.AreEqual(JpegUri, MediaPushRules.valueOf(null, Jpeg), "grant null → today's data: URI of these bytes");
        Assert.AreEqual("data:image/jpeg;base64,", MediaPushRules.JpegDataPrefix, "the prefix chatThumbUri and ViewerImage write");
    }

    [TestMethod]
    public void value_is_the_grant_url_and_builds_nothing()
    {
        string url = new string(Url.ToCharArray());
        string? v = MediaPushRules.valueOf(url, Jpeg);
        Assert.AreEqual(Url, v, "grant URL → the URL");
        Assert.IsTrue(ReferenceEquals(url, v), "the URL itself is returned: no string is built on the URL path");
    }

    [TestMethod]
    public void value_without_bytes_is_none()
    {
        Assert.AreEqual(null, MediaPushRules.valueOf(null, null), "no bytes, no grant → no picture");
        Assert.AreEqual(null, MediaPushRules.valueOf(Url, null), "no bytes → no picture, even with a URL");
        Assert.AreEqual(null, MediaPushRules.valueOf(null, Array.Empty<byte>()), "empty bytes → no picture");
        Assert.AreEqual(null, MediaPushRules.valueOf(Url, Array.Empty<byte>()), "empty bytes → no picture, even with a URL");
    }

    [TestMethod]
    public void caps_text_every_combination()
    {
        // (originOn, serving, keepOn) → the words appended to setCaps
        Assert.AreEqual("", MediaPushRules.capsText(false, false, false), "000");
        Assert.AreEqual("", MediaPushRules.capsText(false, false, true), "001");
        Assert.AreEqual("", MediaPushRules.capsText(false, true, false), "010");
        Assert.AreEqual("", MediaPushRules.capsText(false, true, true), "011: mediaKeep never without mediaOrigin");
        Assert.AreEqual("", MediaPushRules.capsText(true, false, false), "100: no server");
        Assert.AreEqual("", MediaPushRules.capsText(true, false, true), "101: no server, no mediaKeep either");
        Assert.AreEqual(",mediaOrigin", MediaPushRules.capsText(true, true, false), "110");
        Assert.AreEqual(",mediaOrigin,mediaKeep", MediaPushRules.capsText(true, true, true), "111");
    }

    [TestMethod]
    public void switch_off_is_the_base()
    {
        foreach (bool serving in new[] { false, true })
        {
            foreach (bool keep in new[] { false, true })
            {
                Assert.AreEqual("", MediaPushRules.capsText(false, serving, keep), "OFF: setCaps gets nothing new");
                Assert.IsFalse(MediaPushRules.urlPath(false, serving, 5, 5), "OFF: never the URL path");
            }
        }
    }
}
