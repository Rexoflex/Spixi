// The media origin's grant table — EXECUTED: the REAL Spixi/Utils/MediaGrants.cs over the REAL ImgurlFlags of
// Spixi/Utils/SpixiFlags.cs and the REAL SafetyRules.isMiniAppMarker, with the stubbed Preferences and Logging of this harness.
// Contract docs/contract-imgurl.md § 3 ("The URL", "MediaGrants", "Grant rules", "The owner").
// Groups (33 tests): the URL grammar (5) · the response constants (1) · the owner binding (4) · the server's life (3) · the document (3) ·
// the switch (2) · the mini-app rule (1) · the caps (5) · the key and the token (4) · bad input (2) · the bytes (1) · threads (2).
// The harness is a plain net TFM, so MediaGrants.Prefix is the https form here (Android / Windows); the Apple form of the grammar is
// run through the same parser by its seam `tokenOf(url, prefix)`.
// THE SWITCH: ImgurlFlags reads its three switches ONCE per process into a private field. `sw(on, body)` puts the wanted store in the
// Preferences stub and sets that private field back to "not read" BY REFLECTION (no test door exists in SpixiFlags.cs); afterwards the
// store, the field's old value and the log lines are put back, so no other test class sees a key, a switch or a line of this one.
// NOT executed here (the harness cannot compile a platform file): the three request handlers and their serverUp / serverDown call
// sites — held by the source pin scripts/pins-imgurl/a-handler.mjs (its limits are its first lines) and by the device walk.
// DELIBERATE BREAKS (#802; each ONE mutation of MediaGrants.cs in a full copy, `node scripts/run-csh.mjs` there, restored; every one
// was run and went red — the red tests in brackets, "+ n" = more tests that grant through the broken line):
//  m1  tokenOf `url.Length != prefix.Length + TokenHex` → `<`                 [grammar_length_and_suffix_refused, grammar_null_empty_huge_…]
//  m2  tokenOf `(c >= 'a' && c <= 'f')` → `(c >= 'A' && …`                     [grammar_upper_case_and_other_letters_refused]
//  m3  tryServe `tokenOf(url, Prefix)` → `tokenOf(url, SchemePrefix)`          [grammar_the_other_platforms_prefix_is_refused_by_the_server + 15]
//  m4  grant `o.doc != doc` → `o.doc == doc`                                   [document_stale_or_none_grants_nothing + 21]
//  m5  beginDocument: the fresh Owner → `o.doc = doc;`                         [document_a_new_one_revokes_the_old, caps_thumb_count]
//  m6  grant `thumbs >= ThumbMaxCount` → `>`                                   [caps_thumb_count]
//  m7  grant `o.thumbBytes + jpeg.Length > ThumbMaxBytes` → `o.thumbBytes >`   [caps_thumb_bytes, caps_bytes_of_a_replaced_thumb_are_given_back]
//  m8  grant `if (!thumb && o.viewer != null)` → `if (thumb && …`              [caps_viewer_latest_wins, key_another_px_kind_or_id_is_another_url]
//  m9  grant `!ImgurlFlags.MediaOrigin ||` removed                             [switch_off_grants_nothing]
//  m10 hostOk `!SafetyRules.isMiniAppMarker(classId)` → `SafetyRules.…`        [miniapp_never_gets_a_server]
//  m11 serverDown `if (owner != null)` → `== null`                             [server_down_revokes_everything, owner_null_is_refused_everywhere]
//  m12 grant: the same-key `return Prefix + old.token;` → `old.key`            [key_same_key_same_url, caps_thumb_count, server_up_twice_keeps_the_grants]
//  m13 inputOk `jpeg[1] == 0xD8` → `!=`                                        [input_bad_values_grant_nothing + 21: the fixture is refused]
//  m14 tryServe `|| !ImgurlFlags.MediaOrigin` removed                          [switch_off_grants_nothing]
//  m15 serverUp `|| !ImgurlFlags.MediaOrigin` removed                          [switch_off_makes_no_server]
//  m16 revokeOwner `find(owner) != null` → `== null`                           [document_revoke_owner_ends_it, server_none_means_no_grant + 2]
//  m17 grant: 16 random bytes → a clock value with a fixed tail                [token_is_random_32_lower_hex_and_says_nothing]
//  m18 inputOk: the per-kind size bound → `jpeg.Length > ViewerJpegMax`        [caps_size_of_one_picture]
//  m19 inputOk `!idHex.All(Uri.IsHexDigit)` → `idHex.All(…)`                   [input_bad_values_grant_nothing + 21]
//  m20 drop `o.thumbBytes -= g.bytes.Length` → `+=`                            [caps_bytes_of_a_replaced_thumb_are_given_back]
//  m21 a strong list of owners beside the weak table (two edits, one idea)     [owner_is_not_kept_alive_by_the_table]
//  m22 grant `idHex.ToLowerInvariant()` → `idHex`                              [key_another_px_kind_or_id_is_another_url]
//  m23 the `lock (gate)` line of grant AND of tryServe removed (two edits, one idea; run twice, red twice)
//      [threads_one_owner_keeps_every_grant_and_the_exact_count: "round 0: no throw, no miss (expected , got a granted URL did not
//      serve while others were granted)"]; threads_grant_serve_revoke_do_not_throw stays green there: it holds "no throw, no foreign
//      bytes" over several owners, not the lock
//      LIMITS of that test: (1) it is a race — it needs TWO OR MORE free cores to interleave a writer with the reader or with another
//      writer; on one core, or under heavy load, a run without the two locks can stay green. (2) It cannot fail for the five other locks
//      (serverUp, serverDown, serving, beginDocument, revokeOwner): the weak table is thread-safe by itself, and a race there leaves at
//      worst an orphaned Owner whose grants nobody can reach (fail-safe: a miss, never a foreign hit). They are held by reading.
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Threading;
using Microsoft.Maui.Storage;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class MediaGrantsTests
{
    private const string Https = "https://spixi-media.invalid/m/";
    private const string Apple = "spixi-media://m/";
    private const string Tok = "0123456789abcdef0123456789abcdef";
    private const string Id = "00112233445566778899aabbccddeeff";

    private static Preferences P => Preferences.Default;
    private static List<string> Lines => IXICore.Meta.Logging.lines;

    private static readonly FieldInfo State = typeof(ImgurlFlags).GetField("state", BindingFlags.NonPublic | BindingFlags.Static)
        ?? throw new InvalidOperationException("ImgurlFlags.state is gone: MediaGrantsTests sets the switch through it");

    /** One body under the switch MediaOrigin ON (an empty store) or OFF (dev mode + a stored 0); everything is put back after. */
    private static void sw(bool on, Action body)
    {
        var before = new Dictionary<string, string>(P.d);
        object? state = State.GetValue(null);
        int lines = Lines.Count;
        try
        {
            P.d.Clear();
            if (!on)
            {
                P.Set("devMode", true);
                P.Set(ImgurlFlags.MediaOriginKey, 0);
            }
            State.SetValue(null, -1);
            Assert.AreEqual(on, ImgurlFlags.MediaOrigin, "the switch as the test wants it");
            body();
        }
        finally
        {
            P.d.Clear();
            foreach (var kv in before) P.d[kv.Key] = kv.Value;
            State.SetValue(null, state);
            if (Lines.Count > lines) Lines.RemoveRange(lines, Lines.Count - lines);
        }
    }

    /** A JPEG-shaped array of `n` bytes; `fill` makes two arrays of one size differ. */
    private static byte[] jpg(int n = 64, byte fill = 7)
    {
        var b = new byte[n];
        for (int i = 0; i < n; i++) b[i] = fill;
        b[0] = 0xFF; b[1] = 0xD8; b[2] = 0xFF;
        return b;
    }

    /** An owner with a server and document 1. */
    private static object up(int doc = 1)
    {
        var o = new object();
        MediaGrants.serverUp(o);
        MediaGrants.beginDocument(o, doc);
        return o;
    }

    private static bool serves(object owner, string? url) => MediaGrants.tryServe(owner, url!, out _);

    private static bool lowerHex32(string s) => s.Length == 32 && s.All(c => (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f'));

    /* ===================== the URL grammar ===================== */

    [TestMethod]
    public void grammar_exact_prefix_only()
    {
        Assert.AreEqual(Tok, MediaGrants.tokenOf(Https + Tok, Https), "the https form");
        Assert.AreEqual(Tok, MediaGrants.tokenOf(Apple + Tok, Apple), "the scheme form");
        Assert.AreEqual(null, MediaGrants.tokenOf(Apple + Tok, Https), "the scheme form under the https prefix");
        Assert.AreEqual(null, MediaGrants.tokenOf(Https + Tok, Apple), "the https form under the scheme prefix");
        foreach (string bad in new[]
        {
            "http://spixi-media.invalid/m/" + Tok, "HTTPS://spixi-media.invalid/m/" + Tok, "https://Spixi-Media.invalid/m/" + Tok,
            "https://spixi-media.invalid/M/" + Tok, "https://spixi-media.invalid//" + Tok, "https://spixi-media.invalid/" + Tok,
            "https://spixi-media.invalid:443/m/" + Tok, "https://user@spixi-media.invalid/m/" + Tok, "https://spixi-media.invalid./m/" + Tok,
            "https://spixi-media.invalid.example/m/" + Tok, "https://x.spixi-media.invalid/m/" + Tok, " " + Https + Tok,
            "file:///m/" + Tok, "spixi-media:/m/" + Tok, "spixi-media:m/" + Tok, Tok, "/m/" + Tok,
        })
        {
            Assert.AreEqual(null, MediaGrants.tokenOf(bad, Https), "refused under https: " + bad);
            Assert.AreEqual(null, MediaGrants.tokenOf(bad, Apple), "refused under the scheme: " + bad);
        }
    }

    [TestMethod]
    public void grammar_length_and_suffix_refused()
    {
        foreach (string prefix in new[] { Https, Apple })
        {
            Assert.AreEqual(null, MediaGrants.tokenOf(prefix + Tok.Substring(1), prefix), "31 hex");
            Assert.AreEqual(null, MediaGrants.tokenOf(prefix + Tok + "0", prefix), "33 hex");
            Assert.AreEqual(null, MediaGrants.tokenOf(prefix, prefix), "no token");
            foreach (string tail in new[] { "?", "?a=1", "#", "#x", "/", "/x", "/..", ".jpg", " ", "\n", "\r\n", "\0", "%00", ";x" })
            {
                Assert.AreEqual(null, MediaGrants.tokenOf(prefix + Tok + tail, prefix), "a tail after the token: " + tail.Length);
                Assert.AreEqual(null, MediaGrants.tokenOf(prefix + Tok.Substring(tail.Length) + tail, prefix), "a tail inside 32 chars: " + tail.Length);
            }
        }
    }

    [TestMethod]
    public void grammar_upper_case_and_other_letters_refused()
    {
        foreach (string prefix in new[] { Https, Apple })
        {
            Assert.AreEqual(null, MediaGrants.tokenOf(prefix + Tok.ToUpperInvariant(), prefix), "upper-case hex");
            for (int i = 0; i < 32; i++)
            {
                foreach (char c in new[] { 'A', 'F', 'g', 'z', 'G', '/', ':', '@', '`', '-', '_', '.', '%', '+', '٠', 'ａ', 'é' })
                {
                    string t = Tok.Substring(0, i) + c + Tok.Substring(i + 1);
                    Assert.AreEqual(null, MediaGrants.tokenOf(prefix + t, prefix), "char " + (int)c + " at " + i);
                }
            }
            Assert.AreEqual("ffffffffffffffffffffffffffffffff", MediaGrants.tokenOf(prefix + new string('f', 32), prefix), "all f");
            Assert.AreEqual("00000000000000000000000000000000", MediaGrants.tokenOf(prefix + new string('0', 32), prefix), "all 0");
        }
    }

    [TestMethod]
    public void grammar_null_empty_huge_refused_and_never_throw()
    {
        sw(true, () =>
        {
            object o = up();
            string url = MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, jpg())!;
            Assert.IsTrue(serves(o, url), "the fixture serves");
            Assert.AreEqual(null, MediaGrants.tokenOf(null, Https), "null");
            Assert.AreEqual(null, MediaGrants.tokenOf("", Https), "empty");
            Assert.AreEqual(null, MediaGrants.tokenOf(Https + new string('a', 1 << 20), Https), "a megabyte of hex");
            Assert.IsFalse(serves(o, null), "serve null");
            Assert.IsFalse(serves(o, ""), "serve empty");
            Assert.IsFalse(serves(o, url + new string('a', 1 << 20)), "serve huge");
            Assert.IsFalse(serves(o, url + "?"), "serve with a query");
            Assert.IsFalse(serves(o, url + "#"), "serve with a fragment");
            Assert.IsFalse(serves(o, url + "/"), "serve with a path");
            Assert.IsFalse(serves(o, url.ToUpperInvariant()), "serve upper-case");
            Assert.IsFalse(serves(o, " " + url), "serve with a space in front");
            Assert.IsFalse(MediaGrants.tryServe(null!, url, out byte[] none), "serve for a null owner");
            Assert.AreEqual(0, none.Length, "a miss hands out an empty array, never null");
        });
    }

    [TestMethod]
    public void grammar_the_other_platforms_prefix_is_refused_by_the_server()
    {
        sw(true, () =>
        {
            object o = up();
            string url = MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, jpg())!;
            Assert.IsTrue(url.StartsWith(Https, StringComparison.Ordinal), "the harness platform is the https form");
            string token = url.Substring(Https.Length);
            Assert.IsTrue(serves(o, Https + token), "this platform's prefix");
            Assert.IsFalse(serves(o, Apple + token), "the other platform's prefix with a LIVE token");
        });
    }

    /* ===================== the response constants ===================== */

    [TestMethod]
    public void constants_are_the_contract()
    {
        Assert.AreEqual(32, MediaGrants.TokenHex);
        Assert.AreEqual("https://spixi-media.invalid/", MediaGrants.Host);
        Assert.AreEqual(Https, MediaGrants.HttpsPrefix);
        Assert.AreEqual("spixi-media", MediaGrants.Scheme);
        Assert.AreEqual(Apple, MediaGrants.SchemePrefix);
        Assert.AreEqual(Https, MediaGrants.Prefix, "a plain net TFM = the https form");
        Assert.IsTrue(Https.Length + 32 <= 64 && Apple.Length + 32 <= 64, "a URL is at most 64 chars");
        Assert.AreEqual("image/jpeg", MediaGrants.ContentType);
        Assert.AreEqual(2, MediaGrants.Headers.Count, "two headers");
        Assert.AreEqual("Cache-Control=no-store|X-Content-Type-Options=nosniff", string.Join("|", MediaGrants.Headers.Select(h => h.Key + "=" + h.Value)));
        Assert.AreEqual("Cache-Control: no-store\r\nX-Content-Type-Options: nosniff", MediaGrants.HeaderLines);
        Assert.AreEqual(1, (int)MediaKind.Thumb);
        Assert.AreEqual(2, (int)MediaKind.Viewer);
        Assert.AreEqual(512, MediaGrants.ThumbMaxCount);
        Assert.AreEqual(16L * 1024 * 1024, MediaGrants.ThumbMaxBytes);
        Assert.AreEqual(64 * 1024, MediaGrants.ThumbJpegMax);
        Assert.AreEqual(1_200_000, MediaGrants.ViewerJpegMax);
    }

    /* ===================== the owner binding ===================== */

    [TestMethod]
    public void owner_another_webview_cannot_serve_the_token()
    {
        sw(true, () =>
        {
            object a = up(), b = up();
            byte[] bytes = jpg();
            string url = MediaGrants.grant(a, 1, MediaKind.Thumb, Id, 320, bytes)!;
            Assert.IsTrue(serves(a, url), "A serves its own");
            Assert.IsFalse(MediaGrants.tryServe(b, url, out byte[] leaked), "B has a server and the same document number, and gets nothing");
            Assert.AreEqual(0, leaked.Length, "no byte of A leaves through B");
            string urlB = MediaGrants.grant(b, 1, MediaKind.Thumb, Id, 320, bytes)!;
            Assert.IsTrue(url != urlB, "the same key and bytes in another WebView = another URL");
            Assert.IsFalse(serves(a, urlB), "A cannot serve B's");
            Assert.IsFalse(serves(new object(), url), "an owner with no server");
        });
    }

    /** Two owners that claim to be equal: the table compares by reference, not by Equals. */
    private sealed class Twin
    {
        public override bool Equals(object? o) => o is Twin;
        public override int GetHashCode() => 1;
    }

    [TestMethod]
    public void owner_is_compared_by_reference_not_by_equals()
    {
        sw(true, () =>
        {
            var a = new Twin();
            var b = new Twin();
            Assert.IsTrue(a.Equals(b), "the fixture: the two owners are Equals-equal");
            MediaGrants.serverUp(a);
            MediaGrants.beginDocument(a, 1);
            string url = MediaGrants.grant(a, 1, MediaKind.Viewer, Id, 1600, jpg())!;
            Assert.IsFalse(MediaGrants.serving(b), "B has no server although it equals A");
            Assert.IsFalse(serves(b, url), "B cannot serve A's token");
            Assert.AreEqual(null, MediaGrants.grant(b, 1, MediaKind.Thumb, Id, 320, jpg()), "B cannot grant on A's server");
            MediaGrants.serverUp(b);
            MediaGrants.beginDocument(b, 1);
            Assert.IsFalse(serves(b, url), "B with its own server still cannot serve A's token");
            MediaGrants.serverDown(b);
            Assert.IsTrue(serves(a, url), "B's serverDown leaves A alone");
        });
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static WeakReference grantOnAShortLivedOwner()
    {
        var o = new object();
        MediaGrants.serverUp(o);
        MediaGrants.beginDocument(o, 1);
        Assert.IsTrue(MediaGrants.grant(o, 1, MediaKind.Viewer, Id, 1600, jpg(100_000)) != null, "granted");
        return new WeakReference(o);
    }

    [TestMethod]
    public void owner_is_not_kept_alive_by_the_table()
    {
        sw(true, () =>
        {
            WeakReference w = grantOnAShortLivedOwner();
            for (int i = 0; i < 5 && w.IsAlive; i++)
            {
                GC.Collect();
                GC.WaitForPendingFinalizers();
            }
            Assert.IsFalse(w.IsAlive, "an owner with a server and a grant, and no serverDown, is collected");
        });
    }

    [TestMethod]
    public void owner_null_is_refused_everywhere()
    {
        sw(true, () =>
        {
            MediaGrants.serverUp(null!);
            MediaGrants.serverDown(null!);
            MediaGrants.beginDocument(null!, 1);
            MediaGrants.revokeOwner(null!);
            Assert.IsFalse(MediaGrants.serving(null!), "serving(null)");
            Assert.AreEqual(null, MediaGrants.grant(null!, 1, MediaKind.Thumb, Id, 320, jpg()), "grant(null owner)");
        });
    }

    /* ===================== the server's life ===================== */

    [TestMethod]
    public void server_none_means_no_grant()
    {
        sw(true, () =>
        {
            var o = new object();
            Assert.IsFalse(MediaGrants.serving(o), "no serverUp");
            MediaGrants.beginDocument(o, 1);
            Assert.IsFalse(MediaGrants.serving(o), "beginDocument makes no server");
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, jpg()), "thumb");
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Viewer, Id, 1600, jpg()), "viewer");
            MediaGrants.revokeOwner(o);
            Assert.IsFalse(MediaGrants.serving(o), "revokeOwner makes no server");
        });
    }

    [TestMethod]
    public void server_down_revokes_everything()
    {
        sw(true, () =>
        {
            object o = up();
            string t = MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, jpg())!;
            string v = MediaGrants.grant(o, 1, MediaKind.Viewer, Id, 1600, jpg())!;
            Assert.IsTrue(MediaGrants.serving(o) && serves(o, t) && serves(o, v), "before");
            MediaGrants.serverDown(o);
            Assert.IsFalse(MediaGrants.serving(o), "not serving");
            Assert.IsFalse(serves(o, t), "the thumb token is dead");
            Assert.IsFalse(serves(o, v), "the viewer token is dead");
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, jpg()), "no grant without a server");
            MediaGrants.serverUp(o);
            Assert.IsFalse(serves(o, t), "a new server does not bring the old token back");
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, jpg()), "a new server has no document yet");
            MediaGrants.beginDocument(o, 1);
            string t2 = MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, jpg())!;
            Assert.IsTrue(t2 != t && serves(o, t2), "a fresh token after the server came back");
        });
    }

    [TestMethod]
    public void server_up_twice_keeps_the_grants()
    {
        sw(true, () =>
        {
            object o = up();
            string t = MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, jpg())!;
            MediaGrants.serverUp(o);
            Assert.IsTrue(serves(o, t), "the grant lives");
            Assert.AreEqual(t, MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, jpg()), "the document and the key live");
        });
    }

    /* ===================== the document ===================== */

    [TestMethod]
    public void document_a_new_one_revokes_the_old()
    {
        sw(true, () =>
        {
            object o = up(7);
            string t = MediaGrants.grant(o, 7, MediaKind.Thumb, Id, 320, jpg())!;
            string v = MediaGrants.grant(o, 7, MediaKind.Viewer, Id, 1600, jpg())!;
            MediaGrants.beginDocument(o, 7);
            Assert.IsTrue(serves(o, t) && serves(o, v), "the same document again revokes nothing");
            MediaGrants.beginDocument(o, 8);
            Assert.IsFalse(serves(o, t), "the thumb of document 7 is dead");
            Assert.IsFalse(serves(o, v), "the viewer picture of document 7 is dead");
            Assert.IsTrue(MediaGrants.serving(o), "the server stays");
            string t8 = MediaGrants.grant(o, 8, MediaKind.Thumb, Id, 320, jpg())!;
            Assert.IsTrue(t8 != t && serves(o, t8), "document 8 gets its own URL for the same picture");
            MediaGrants.beginDocument(o, 7);
            Assert.IsFalse(serves(o, t) || serves(o, t8), "going back to 7 revives nothing");
        });
    }

    [TestMethod]
    public void document_stale_or_none_grants_nothing()
    {
        sw(true, () =>
        {
            var o = new object();
            MediaGrants.serverUp(o);
            Assert.AreEqual(null, MediaGrants.grant(o, 0, MediaKind.Thumb, Id, 320, jpg()), "no document yet (0)");
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, jpg()), "no document yet (1)");
            MediaGrants.beginDocument(o, 5);
            Assert.AreEqual(null, MediaGrants.grant(o, 4, MediaKind.Thumb, Id, 320, jpg()), "the document before");
            Assert.AreEqual(null, MediaGrants.grant(o, 6, MediaKind.Viewer, Id, 1600, jpg()), "a document that did not start");
            Assert.IsTrue(MediaGrants.grant(o, 5, MediaKind.Thumb, Id, 320, jpg()) != null, "the current one");
            MediaGrants.beginDocument(o, 0);
            Assert.IsTrue(MediaGrants.grant(o, 0, MediaKind.Thumb, Id, 320, jpg()) != null, "document 0 is a document once it began");
            MediaGrants.beginDocument(o, -3);
            Assert.IsTrue(MediaGrants.grant(o, -3, MediaKind.Thumb, Id, 320, jpg()) != null, "a negative number too");
        });
    }

    [TestMethod]
    public void document_revoke_owner_ends_it()
    {
        sw(true, () =>
        {
            object o = up(3);
            string t = MediaGrants.grant(o, 3, MediaKind.Thumb, Id, 320, jpg())!;
            string v = MediaGrants.grant(o, 3, MediaKind.Viewer, Id, 1600, jpg())!;
            MediaGrants.revokeOwner(o);
            Assert.IsFalse(serves(o, t) || serves(o, v), "every token is dead");
            Assert.IsTrue(MediaGrants.serving(o), "the server stays (the WebView's handler is still there)");
            Assert.AreEqual(null, MediaGrants.grant(o, 3, MediaKind.Thumb, Id, 320, jpg()), "no document is current after the teardown");
            MediaGrants.beginDocument(o, 3);
            string t2 = MediaGrants.grant(o, 3, MediaKind.Thumb, Id, 320, jpg())!;
            Assert.IsTrue(t2 != t && serves(o, t2) && !serves(o, t), "the same number begun again = a new document, new URLs");
        });
    }

    /* ===================== the switch ===================== */

    [TestMethod]
    public void switch_off_grants_nothing()
    {
        object o = new object();
        string url = "";
        sw(true, () =>
        {
            MediaGrants.serverUp(o);
            MediaGrants.beginDocument(o, 1);
            url = MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, jpg())!;
            Assert.IsTrue(serves(o, url), "ON: served");
        });
        sw(false, () =>
        {
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Thumb, "ab", 320, jpg()), "OFF: no grant even on a live server and document");
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, jpg()), "OFF: not even the URL of a live grant");
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Viewer, Id, 1600, jpg()), "OFF: no viewer grant");
            Assert.IsFalse(serves(o, url), "OFF: a live token is not served");
        });
        MediaGrants.serverDown(o);
    }

    [TestMethod]
    public void switch_off_makes_no_server()
    {
        sw(false, () =>
        {
            var o = new object();
            MediaGrants.serverUp(o);
            Assert.IsFalse(MediaGrants.serving(o), "OFF: serverUp makes no server, so the page declares no cap");
            MediaGrants.beginDocument(o, 1);
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, jpg()), "OFF: null = the data: value");
            Assert.IsFalse(MediaGrants.hostOk(null) || MediaGrants.hostOk("") || MediaGrants.hostOk("chat"), "OFF: no host may get a server");
        });
    }

    /* ===================== the mini-app rule ===================== */

    [TestMethod]
    public void miniapp_never_gets_a_server()
    {
        sw(true, () =>
        {
            Assert.IsFalse(MediaGrants.hostOk("miniapp"), "the marker of MiniAppPage.xaml");
            Assert.IsFalse(MediaGrants.hostOk(SafetyRules.MiniAppMarker), "the marker constant");
            Assert.IsTrue(MediaGrants.hostOk(null), "a shell has no ClassId");
            Assert.IsTrue(MediaGrants.hostOk(""), "an empty ClassId");
            Assert.IsTrue(MediaGrants.hostOk("scan"), "another marker of ours");
        });
        sw(false, () => Assert.IsFalse(MediaGrants.hostOk("miniapp"), "OFF: still no"));
    }

    /* ===================== the caps ===================== */

    [TestMethod]
    public void caps_thumb_count()
    {
        sw(true, () =>
        {
            object o = up();
            byte[] one = jpg(16);
            var urls = new HashSet<string>();
            for (int i = 0; i < MediaGrants.ThumbMaxCount; i++)
            {
                string? u = MediaGrants.grant(o, 1, MediaKind.Thumb, i.ToString("x4"), 320, one);
                Assert.IsTrue(u != null && urls.Add(u), "grant " + i + " is new");
            }
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Thumb, "ffff", 320, one), "the cap: grant 513 is null");
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Thumb, "0000", 96, one), "the cap: another size of a granted id is null too");
            Assert.IsTrue(urls.Contains(MediaGrants.grant(o, 1, MediaKind.Thumb, "0000", 320, one)!), "at the cap a granted key still answers its URL");
            Assert.IsTrue(urls.All(u => serves(o, u)), "all 512 are served");
            Assert.IsTrue(MediaGrants.grant(o, 1, MediaKind.Viewer, Id, 1600, jpg()) != null, "the viewer picture is not counted with the thumbs");
            object other = up();
            Assert.IsTrue(MediaGrants.grant(other, 1, MediaKind.Thumb, "ffff", 320, one) != null, "the cap is per owner");
            MediaGrants.beginDocument(o, 2);
            Assert.IsTrue(MediaGrants.grant(o, 2, MediaKind.Thumb, "ffff", 320, one) != null, "a new document starts from zero");
        });
    }

    [TestMethod]
    public void caps_thumb_bytes()
    {
        sw(true, () =>
        {
            object o = up();
            byte[] big = jpg(MediaGrants.ThumbJpegMax);
            int fit = (int)(MediaGrants.ThumbMaxBytes / MediaGrants.ThumbJpegMax);
            Assert.IsTrue(fit < MediaGrants.ThumbMaxCount, "the fixture: the byte cap is reached before the count cap (" + fit + ")");
            for (int i = 0; i < fit; i++)
            {
                Assert.IsTrue(MediaGrants.grant(o, 1, MediaKind.Thumb, i.ToString("x4"), 320, big) != null, "grant " + i);
            }
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Thumb, "ffff", 320, jpg(3)), "the byte cap: three more bytes are too many");
            Assert.IsTrue(MediaGrants.grant(o, 1, MediaKind.Thumb, "0000", 320, big) != null, "a granted key still answers");
            MediaGrants.revokeOwner(o);
            MediaGrants.beginDocument(o, 1);
            Assert.IsTrue(MediaGrants.grant(o, 1, MediaKind.Thumb, "ffff", 320, big) != null, "the bytes of revoked grants are given back");
        });
    }

    [TestMethod]
    public void caps_bytes_of_a_replaced_thumb_are_given_back()
    {
        sw(true, () =>
        {
            object o = up();
            int fit = (int)(MediaGrants.ThumbMaxBytes / MediaGrants.ThumbJpegMax);
            string last = "";
            for (int i = 0; i < 3 * fit; i++)
            {
                string? u = MediaGrants.grant(o, 1, MediaKind.Thumb, "aa", 320, jpg(MediaGrants.ThumbJpegMax, (byte)(i % 250)));
                Assert.IsTrue(u != null && u != last, "other bytes under one key, time " + i + ": a new URL, never the cap");
                last = u!;
            }
            byte[] big = jpg(MediaGrants.ThumbJpegMax);
            for (int i = 1; i < fit; i++)
            {
                Assert.IsTrue(MediaGrants.grant(o, 1, MediaKind.Thumb, i.ToString("x4"), 320, big) != null, "the rest of the budget, grant " + i);
            }
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Thumb, "ffff", 320, jpg(3)), "the budget is exactly full: one live thumb under the replaced key, not " + 3 * fit);
        });
    }

    [TestMethod]
    public void caps_size_of_one_picture()
    {
        sw(true, () =>
        {
            object o = up();
            Assert.IsTrue(MediaGrants.grant(o, 1, MediaKind.Thumb, "01", 320, jpg(MediaGrants.ThumbJpegMax)) != null, "a thumb at its bound");
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Thumb, "02", 320, jpg(MediaGrants.ThumbJpegMax + 1)), "a thumb one byte over");
            Assert.IsTrue(MediaGrants.grant(o, 1, MediaKind.Viewer, "03", 1600, jpg(MediaGrants.ViewerJpegMax)) != null, "a viewer picture at its bound");
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Viewer, "04", 1600, jpg(MediaGrants.ViewerJpegMax + 1)), "a viewer picture one byte over");
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Thumb, "05", 320, jpg(MediaGrants.ViewerJpegMax)), "a viewer-sized thumb");
        });
    }

    [TestMethod]
    public void caps_viewer_latest_wins()
    {
        sw(true, () =>
        {
            object o = up();
            string thumb = MediaGrants.grant(o, 1, MediaKind.Thumb, "aa", 320, jpg())!;
            string v1 = MediaGrants.grant(o, 1, MediaKind.Viewer, "aa", 1600, jpg(100, 1))!;
            Assert.IsTrue(serves(o, v1), "the first viewer picture");
            string v2 = MediaGrants.grant(o, 1, MediaKind.Viewer, "bb", 1600, jpg(100, 2))!;
            Assert.IsTrue(v2 != v1 && serves(o, v2), "the second");
            Assert.IsFalse(serves(o, v1), "the first is revoked by the second");
            string v1Again = MediaGrants.grant(o, 1, MediaKind.Viewer, "aa", 1600, jpg(100, 1))!;
            Assert.IsTrue(v1Again != v1 && serves(o, v1Again) && !serves(o, v2), "back to the first picture: a new URL, the second revoked");
            Assert.IsTrue(serves(o, thumb), "the thumbs are not touched by the viewer rule");
            object other = up();
            string vo = MediaGrants.grant(other, 1, MediaKind.Viewer, "cc", 1600, jpg())!;
            Assert.IsTrue(serves(other, vo) && serves(o, v1Again), "one viewer picture PER owner");
        });
    }

    /* ===================== the key and the token ===================== */

    [TestMethod]
    public void key_same_key_same_url()
    {
        sw(true, () =>
        {
            object o = up();
            byte[] bytes = jpg();
            string a = MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, bytes)!;
            Assert.AreEqual(a, MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, bytes), "the same array");
            Assert.AreEqual(a, MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, jpg()), "another array with the same content");
            string v = MediaGrants.grant(o, 1, MediaKind.Viewer, Id, 1600, bytes)!;
            Assert.AreEqual(v, MediaGrants.grant(o, 1, MediaKind.Viewer, Id, 1600, jpg()), "the viewer picture too");
            Assert.IsTrue(serves(o, a) && serves(o, v), "both live");
        });
    }

    [TestMethod]
    public void key_another_px_kind_or_id_is_another_url()
    {
        sw(true, () =>
        {
            object o = up();
            byte[] bytes = jpg();
            string a = MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, bytes)!;
            string px = MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 96, bytes)!;
            string kind = MediaGrants.grant(o, 1, MediaKind.Viewer, Id, 320, bytes)!;
            string id = MediaGrants.grant(o, 1, MediaKind.Thumb, Id.Substring(2) + "00", 320, bytes)!;
            Assert.AreEqual(4, new HashSet<string> { a, px, kind, id }.Count, "four keys, four URLs");
            Assert.IsTrue(serves(o, a) && serves(o, px) && serves(o, kind) && serves(o, id), "all live");
            Assert.AreEqual(a, MediaGrants.grant(o, 1, MediaKind.Thumb, Id.ToUpperInvariant(), 320, bytes), "the id is a key only: its letter case makes no new URL");
            string mixed = "00AAbbCCddEEff" + new string('F', 114);
            string v = MediaGrants.grant(o, 1, MediaKind.Viewer, mixed, 1600, bytes)!;
            Assert.IsTrue(v != kind && serves(o, v), "a 128-char id with upper-case hex (the shell's viewer token) is granted");
            Assert.AreEqual(v, MediaGrants.grant(o, 1, MediaKind.Viewer, mixed.ToLowerInvariant(), 1600, bytes), "and its lower-case twin is the same key");
        });
    }

    [TestMethod]
    public void key_other_bytes_get_a_new_url_and_the_old_one_dies()
    {
        sw(true, () =>
        {
            object o = up();
            string a = MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, jpg(64, 1))!;
            string b = MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, jpg(64, 2))!;
            Assert.IsTrue(a != b, "a URL names one byte sequence");
            Assert.IsFalse(serves(o, a), "the old URL is dead");
            Assert.IsTrue(MediaGrants.tryServe(o, b, out byte[] got) && got[10] == 2, "the new URL serves the new bytes");
            string c = MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, jpg(65, 2))!;
            Assert.IsTrue(c != b && !serves(o, b), "another length is other bytes too");
        });
    }

    [TestMethod]
    public void token_is_random_32_lower_hex_and_says_nothing()
    {
        sw(true, () =>
        {
            object o = up();
            var seen = new HashSet<string>();
            for (int i = 0; i < 300; i++)
            {
                string id = i.ToString("x8");
                string url = MediaGrants.grant(o, 1, MediaKind.Thumb, id, 320, jpg())!;
                Assert.IsTrue(url.StartsWith(Https, StringComparison.Ordinal) && url.Length == Https.Length + 32 && url.Length <= 64, "the shape of " + url.Length);
                string token = url.Substring(Https.Length);
                Assert.IsTrue(lowerHex32(token), "32 lower-case hex");
                Assert.IsTrue(seen.Add(token), "never the same token twice");
                Assert.IsFalse(token.Contains(id), "the token does not carry the id");
            }
            Assert.IsTrue(seen.Select(t => t.Substring(0, 8)).Distinct().Count() > 290, "the first 8 chars differ (not a counter with a fixed head)");
            Assert.IsTrue(seen.Select(t => t.Substring(24)).Distinct().Count() > 290, "the last 8 chars differ (not a counter with a fixed tail)");
            Assert.AreEqual(0, Lines.Count(l => !l.StartsWith("[FLAGS] imgurl ", StringComparison.Ordinal) && seen.Any(l.Contains)), "no token in a log line");
        });
    }

    /* ===================== bad input ===================== */

    [TestMethod]
    public void input_bad_values_grant_nothing()
    {
        sw(true, () =>
        {
            object o = up();
            byte[] ok = jpg();
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, null!), "null bytes");
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, new byte[0]), "empty bytes");
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, new byte[] { 0xFF, 0xD8 }), "two bytes");
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, new byte[64]), "zeros");
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }), "a PNG");
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, System.Text.Encoding.ASCII.GetBytes("<svg xmlns='http://www.w3.org/2000/svg'/>")), "an SVG");
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, new byte[] { 0xFF, 0xD8, 0x00, 0x00 }), "a broken JPEG head");
            foreach (string? id in new[] { null, "", " ", "xyz", "12 34", "12g4", "../a", "a/b", "ab\n", "ab|cd", "0x12", "١٢", new string('a', MediaGrants.IdHexMax + 1) })
            {
                Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Thumb, id!, 320, ok), "a bad id of length " + (id?.Length ?? -1));
            }
            Assert.IsTrue(MediaGrants.grant(o, 1, MediaKind.Thumb, new string('a', MediaGrants.IdHexMax), 320, ok) != null, "the longest id");
            foreach (int px in new[] { 0, -1, int.MinValue, MediaGrants.PxMax + 1, int.MaxValue })
            {
                Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Thumb, Id, px, ok), "a bad px " + px);
            }
            Assert.IsTrue(MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 1, ok) != null && MediaGrants.grant(o, 1, MediaKind.Thumb, Id, MediaGrants.PxMax, ok) != null, "px 1 and the bound");
            foreach (int kind in new[] { 0, 3, -1, 99 })
            {
                Assert.AreEqual(null, MediaGrants.grant(o, 1, (MediaKind)kind, Id, 320, ok), "an unknown kind " + kind);
            }
        });
    }

    [TestMethod]
    public void input_a_refused_grant_changes_nothing()
    {
        sw(true, () =>
        {
            object o = up();
            string v = MediaGrants.grant(o, 1, MediaKind.Viewer, Id, 1600, jpg())!;
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Viewer, "zz", 1600, jpg()), "a bad viewer grant");
            Assert.AreEqual(null, MediaGrants.grant(o, 2, MediaKind.Viewer, "ab", 1600, jpg()), "a viewer grant of another document");
            Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Viewer, "ab", 1600, new byte[8]), "a viewer grant that is no JPEG");
            Assert.IsTrue(serves(o, v), "the live viewer picture is still served (a refused grant revokes nothing)");
        });
    }

    /* ===================== the bytes ===================== */

    [TestMethod]
    public void bytes_served_are_the_bytes_granted()
    {
        sw(true, () =>
        {
            object o = up();
            var rnd = new Random(1642);
            byte[] thumb = jpg(20_000);
            byte[] view = jpg(900_000);
            rnd.NextBytes(thumb.AsSpan(3));
            rnd.NextBytes(view.AsSpan(3));
            string t = MediaGrants.grant(o, 1, MediaKind.Thumb, Id, 320, thumb)!;
            string v = MediaGrants.grant(o, 1, MediaKind.Viewer, Id, 1600, view)!;
            Assert.IsTrue(MediaGrants.tryServe(o, t, out byte[] gotT) && gotT.AsSpan().SequenceEqual(thumb), "the thumb, byte for byte");
            Assert.IsTrue(MediaGrants.tryServe(o, v, out byte[] gotV) && gotV.AsSpan().SequenceEqual(view), "the viewer picture, byte for byte");
            Assert.IsTrue(ReferenceEquals(gotT, thumb) && ReferenceEquals(gotV, view), "no copy is made (the memory rule)");
            Assert.IsFalse(gotT.AsSpan().SequenceEqual(gotV.AsSpan(0, gotT.Length)), "the two URLs do not serve each other's bytes");
        });
    }

    /* ===================== threads ===================== */

    [TestMethod]
    public void threads_grant_serve_revoke_do_not_throw()
    {
        sw(true, () =>
        {
            object[] owners = Enumerable.Range(0, 4).Select(_ => new object()).ToArray();
            var failures = new List<string>();
            int crossServed = 0;
            var threads = new List<Thread>();
            for (int n = 0; n < 8; n++)
            {
                int me = n;
                threads.Add(new Thread(() =>
                {
                    try
                    {
                        var rnd = new Random(me);
                        object mine = owners[me % owners.Length];
                        object theirs = owners[(me + 1) % owners.Length];
                        byte[] bytes = jpg(256, (byte)(10 + me % owners.Length));
                        for (int i = 0; i < 4000; i++)
                        {
                            int doc = rnd.Next(3);
                            switch (rnd.Next(12))
                            {
                                case 0: MediaGrants.serverUp(mine); break;
                                case 1: MediaGrants.beginDocument(mine, doc); break;
                                case 2: if (rnd.Next(40) == 0) MediaGrants.serverDown(mine); break;
                                case 3: if (rnd.Next(20) == 0) MediaGrants.revokeOwner(mine); break;
                                case 4: MediaGrants.serving(theirs); break;
                                default:
                                    string? url = MediaGrants.grant(mine, doc, rnd.Next(5) == 0 ? MediaKind.Viewer : MediaKind.Thumb, rnd.Next(64).ToString("x2"), 320, bytes);
                                    if (url == null) break;
                                    if (MediaGrants.tryServe(mine, url, out byte[] got) && got[10] != bytes[10]) lock (failures) failures.Add("an owner was served another owner's bytes");
                                    if (MediaGrants.tryServe(theirs, url, out _)) Interlocked.Increment(ref crossServed);
                                    break;
                            }
                        }
                    }
                    catch (Exception e)
                    {
                        lock (failures) failures.Add(e.GetType().Name + ": " + e.Message);
                    }
                }));
            }
            foreach (var t in threads) t.Start();
            foreach (var t in threads) t.Join();
            foreach (object o in owners) MediaGrants.serverDown(o);
            Assert.AreEqual("", string.Join(" | ", failures.Distinct()), "no throw and no foreign bytes");
            Assert.AreEqual(0, crossServed, "a URL of one owner was never served to another (two threads share an owner, never two owners a token)");
        });
    }

    /** The lock, not the catch: eight threads start together and grant DISTINCT keys on ONE owner (the page's pool threads do
     *  this), with a reader beside them. A table written without the lock loses a grant, hands out null (grant() swallows the
     *  dictionary's throw) or miscounts; afterwards every URL must serve its own bytes and the count must be exact. */
    [TestMethod]
    public void threads_one_owner_keeps_every_grant_and_the_exact_count()
    {
        sw(true, () =>
        {
            const int Threads = 8, Each = 60, Rounds = 6;
            for (int round = 0; round < Rounds; round++)
            {
                object o = up();
                var urls = new string?[Threads * Each];
                var fills = new byte[Threads * Each];
                var failures = new List<string>();
                using var start = new Barrier(Threads + 1);
                int done = 0;
                var threads = new List<Thread>();
                for (int n = 0; n < Threads; n++)
                {
                    int me = n;
                    threads.Add(new Thread(() =>
                    {
                        try
                        {
                            start.SignalAndWait();
                            for (int i = 0; i < Each; i++)
                            {
                                int slot = me * Each + i;
                                fills[slot] = (byte)(1 + slot % 200);
                                urls[slot] = MediaGrants.grant(o, 1, MediaKind.Thumb, slot.ToString("x4"), 320, jpg(16, fills[slot]));
                            }
                        }
                        catch (Exception e) { lock (failures) failures.Add(e.GetType().Name); }
                        finally { Interlocked.Increment(ref done); }
                    }));
                }
                var reader = new Thread(() =>
                {
                    try
                    {
                        start.SignalAndWait();
                        while (Volatile.Read(ref done) < Threads)
                        {
                            foreach (string? u in urls) if (u != null && !MediaGrants.tryServe(o, u, out _)) lock (failures) failures.Add("a granted URL did not serve while others were granted");
                        }
                    }
                    catch (Exception e) { lock (failures) failures.Add("reader " + e.GetType().Name); }
                });
                foreach (var t in threads) t.Start();
                reader.Start();
                foreach (var t in threads) t.Join();
                reader.Join();
                Assert.AreEqual("", string.Join(" | ", failures.Distinct()), "round " + round + ": no throw, no miss");
                Assert.AreEqual(0, urls.Count(u => u == null), "round " + round + ": every grant got a URL");
                Assert.AreEqual(urls.Length, urls.Distinct().Count(), "round " + round + ": every URL is its own");
                for (int slot = 0; slot < urls.Length; slot++)
                {
                    Assert.IsTrue(MediaGrants.tryServe(o, urls[slot]!, out byte[] got) && got.Length == 16 && got[10] == fills[slot], "round " + round + ": slot " + slot + " serves its own bytes");
                    Assert.AreEqual(urls[slot], MediaGrants.grant(o, 1, MediaKind.Thumb, slot.ToString("x4"), 320, jpg(16, fills[slot])), "round " + round + ": slot " + slot + " keeps its key");
                }
                for (int extra = urls.Length; extra < MediaGrants.ThumbMaxCount; extra++)
                {
                    Assert.IsTrue(MediaGrants.grant(o, 1, MediaKind.Thumb, extra.ToString("x4"), 320, jpg(16)) != null, "round " + round + ": the rest of the count, grant " + extra);
                }
                Assert.AreEqual(null, MediaGrants.grant(o, 1, MediaKind.Thumb, "ffff", 320, jpg(16)), "round " + round + ": the count is exact after the threads (" + urls.Length + " + the rest = the cap)");
                MediaGrants.serverDown(o);
            }
        });
    }
}
