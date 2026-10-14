// ★ S20 F (#1378): the C# strip of the shared formatting grammar (S20FormatRules.Strip), EXECUTED against the vectors
// builder F's JS parser passes (scripts/pins-s20/f-vectors.json): (1) every vector encoded below; (2) the FILE read at
// run time, every vector, and its count equal to the encoded set (a vector added to the file without this copy fails);
// (3) edge cases the file does not cover, whose expected text is msg-format.js stripFormat's own output (node, S20 S);
// (4) the cost and depth bounds.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class S20FormatTests
{
    /* the 28 shared vectors of f-vectors.json (S20 F), encoded — in → strip */
    static readonly string[][] Shared = {
        new[] { "*hi*", "hi" },
        new[] { "snake_case_name", "snake_case_name" },
        new[] { "2*3*4", "2*3*4" },
        new[] { "a *b c* d", "a b c d" },
        new[] { "*a", "*a" },
        new[] { "**", "**" },
        new[] { "* not*", "* not*" },
        new[] { "*not *", "*not *" },
        new[] { "_it_ and ~st~", "it and st" },
        new[] { "`*x*`", "*x*" },
        new[] { "```\nline *1*\n```", "line *1*" },
        new[] { "*bold*.", "bold." },
        new[] { "x*y*", "x*y*" },
        new[] { "(*y*)", "(y)" },
        new[] { "*_both_*", "both" },
        new[] { "\u010D\u0161\u017E_\u017E_", "\u010D\u0161\u017E_\u017E_" },
        new[] { "_a_b", "_a_b" },
        new[] { "*a\nb*", "*a\nb*" },
        new[] { "*a* *b*", "a b" },
        new[] { "~~", "~~" },
        new[] { "``", "``" },
        new[] { "*a `b* c`*", "*a b* c*" },
        new[] { "say ```js\nx = 1\n```", "say ```js\nx = 1\n```" },
        new[] { "a\n```js\nx = *1*\n```\nb *c*", "a\njs\nx = *1*\nb c" },
        new[] { "```\nopen only", "```\nopen only" },
        new[] { "<img src=x onerror=alert(1)> *b*", "<img src=x onerror=alert(1)> b" },
        new[] { "*@alice https://ixian.io*", "@alice https://ixian.io" },
        new[] { "*bold _it ~st~_*", "bold it st" },
        /* ★ #46 r1 (F-to-S-r1): step 0 — a URL is opaque to the marks; + the two that needed no C# change */
        new[] { "https://github.com/x/y/blob/main/__init__.py", "https://github.com/x/y/blob/main/__init__.py" },
        new[] { "https://site.com/*promo*", "https://site.com/*promo*" },
        new[] { "*https://ixian.io*", "https://ixian.io" },
        new[] { "```\n```", "```\n```" },
        new[] { "~gone~", "gone" },
    };

    /* edge cases beyond the file — the expected text is what msg-format.js stripFormat returns (run with node, S20 S) */
    static readonly string[][] Edges = {
        new[] { "x\u00B2*y*", "x\u00B2*y*" },
        new[] { "\u00B2*y*", "\u00B2*y*" },
        new[] { "a\u0085*b*", "a\u0085b" },
        new[] { "*b*\u0085c", "b\u0085c" },
        new[] { "*\uFEFFb*", "*\uFEFFb*" },
        new[] { "*b\uFEFF*", "*b\uFEFF*" },
        new[] { "\u00A0*b*", "\u00A0b" },
        new[] { "\uD835\uDC00*b*", "\uD835\uDC00b" },
        new[] { "*b*\uD835\uDC00", "b\uD835\uDC00" },
        new[] { "```\n```", "```\n```" },
        new[] { "```\n```\nx\n```", "```\nx" },
        new[] { "```a```", "a" },
        new[] { "a```b```", "a``b``" },
        new[] { "``x`", "`x" },
        new[] { "`a\nb`", "`a\nb`" },
        new[] { "```\n*x*\n```*y*", "*x*y" },
        new[] { "*a* _b_ ~c~", "a b c" },
        new[] { "~~a~~", "~a~" },
        new[] { "__a__", "_a_" },
        new[] { "*a**b*", "ab" },
        new[] { "_a_\n_b_", "a\nb" },
        new[] { "*a\r*", "*a\r*" },
        new[] { "`", "`" },
        new[] { "```", "```" },
        new[] { "````", "````" },
        new[] { "*\u216B*x", "*\u216B*x" },
        new[] { "x_\u216B_", "x_\u216B_" },
        new[] { "\u2028*b*", "\u2028b" },
        new[] { "*b*\u3000", "b\u3000" },
        new[] { "**a**", "*a*" },
        new[] { "*a *b* c*", "a *b c*" },
        /* ★ #46 r1: step 0 edges (msg-format.js stripFormat's output, node) */
        new[] { "see https://a.com/_x_ and _y_", "see https://a.com/_x_ and y" },
        new[] { "(https://x.com/*a*)", "(https://x.com/*a*)" },
        new[] { "www.site.com/~a~b~", "www.site.com/~a~b~" },
        new[] { "*bold* site.com/*b*.", "bold site.com/*b*." },
        new[] { "xhttps://a.com/_b_", "xhttps://a.com/b" },
        new[] { "https://a.com/x*_~", "https://a.com/x*_~" },
    };


    static string Show(string s) => JsonSerializer.Serialize(s);

    [TestMethod]
    public void strip_matches_every_shared_vector()
    {
        foreach (string[] v in Shared)
        {
            Assert.AreEqual(v[1], S20FormatRules.Strip(v[0]), "in " + Show(v[0]));
        }
    }

    [TestMethod]
    public void strip_matches_the_js_on_the_edges()
    {
        foreach (string[] v in Edges)
        {
            Assert.AreEqual(v[1], S20FormatRules.Strip(v[0]), "in " + Show(v[0]));
        }
        Assert.AreEqual("", S20FormatRules.Strip(null), "null → ''");
        Assert.AreEqual("", S20FormatRules.Strip(""));
        Assert.AreEqual("plain text", S20FormatRules.Strip("plain text"), "no mark → the same text");
        // ★ #46 r1 step 0: protected only up to LinkRule.LinkifyMax (4096) — over it nothing is linked, nothing is protected
        // (words, not one 4000-char token: LinkRule's 200 ms regex timeout would end the scan on a token that long — #1106)
        string pad4000 = string.Concat(System.Linq.Enumerable.Repeat("word ", 800)), pad4100 = string.Concat(System.Linq.Enumerable.Repeat("word ", 820));
        Assert.AreEqual(pad4000 + " https://a.com/_b_", S20FormatRules.Strip(pad4000 + " https://a.com/_b_"), "≤ 4096: the URL keeps its marks");
        Assert.AreEqual(pad4100 + " https://a.com/b", S20FormatRules.Strip(pad4100 + " https://a.com/_b_"), "> 4096: not protected");
    }

    /* the vectors FILE (builder F's): found by walking up from the harness to scripts/pins-s20/f-vectors.json, or the
       S20_VECTORS environment variable. Missing = a failure (the shared spec must travel with this test). */
    [TestMethod]
    public void strip_matches_the_vectors_file_and_the_encoded_copy_is_complete()
    {
        string? path = Environment.GetEnvironmentVariable("S20_VECTORS");
        if (string.IsNullOrEmpty(path))
        {
            DirectoryInfo? d = new DirectoryInfo(Directory.GetCurrentDirectory());
            while (d != null && !File.Exists(Path.Combine(d.FullName, "scripts", "pins-s20", "f-vectors.json")))
            {
                d = d.Parent;
            }
            path = d == null ? null : Path.Combine(d.FullName, "scripts", "pins-s20", "f-vectors.json");
        }
        Assert.IsTrue(path != null && File.Exists(path), "scripts/pins-s20/f-vectors.json not found (builder F's file)");
        using JsonDocument doc = JsonDocument.Parse(File.ReadAllText(path!, Encoding.UTF8));
        int n = 0;
        HashSet<string> encoded = new HashSet<string>(StringComparer.Ordinal);
        foreach (string[] v in Shared) encoded.Add(v[0]);
        foreach (JsonElement v in doc.RootElement.GetProperty("vectors").EnumerateArray())
        {
            string input = v.GetProperty("in").GetString() ?? "";
            string strip = v.GetProperty("strip").GetString() ?? "";
            Assert.AreEqual(strip, S20FormatRules.Strip(input), "file vector in " + Show(input));
            Assert.IsTrue(encoded.Contains(input), "file vector " + Show(input) + " is missing from the encoded copy");
            n++;
        }
        Assert.AreEqual(Shared.Length, n, "the file and the encoded copy hold the same number of vectors");
    }

    [TestMethod]
    public void strip_is_bounded_in_time_and_depth()
    {
        // 64 000 openers on one line (no closer): the binary search keeps it O(n log n)
        string many = string.Concat(System.Linq.Enumerable.Repeat("*a ", 21000));
        Stopwatch sw = Stopwatch.StartNew();
        Assert.AreEqual(many, S20FormatRules.Strip(many));
        string mixed = string.Concat(System.Linq.Enumerable.Repeat("*_~`a ", 12000)) + "`";
        S20FormatRules.Strip(mixed);
        Assert.IsTrue(sw.ElapsedMilliseconds < 2000, "64 000 marks strip in < 2 s (" + sw.ElapsedMilliseconds + " ms)");
        // nesting tries: a mark cannot nest in itself, so the recursion stays shallow and nothing overflows the stack
        string deep = new string('*', 20000) + "a" + new string('*', 20000);
        S20FormatRules.Strip(deep);
        string alt = string.Concat(System.Linq.Enumerable.Repeat("*_~", 10000)) + "a" + string.Concat(System.Linq.Enumerable.Repeat("~_*", 10000));
        S20FormatRules.Strip(alt);
        Assert.AreEqual("a", S20FormatRules.Strip("*_~a~_*"), "three levels, one per mark");
    }

    [TestMethod]
    public void char_classes_are_the_js_ones_not_dotnets()
    {
        Assert.IsTrue(S20FormatRules.isLetterOrDigit('²') && !char.IsLetterOrDigit('²'), "² (No) is a digit for JS \\p{N}");
        Assert.IsTrue(S20FormatRules.isLetterOrDigit('Ⅻ'), "Ⅻ (Nl)");
        Assert.IsFalse(S20FormatRules.isLetterOrDigit('\uD835'), "a surrogate half is neither (JS tests one code unit)");
        Assert.IsTrue(S20FormatRules.isSpace('\uFEFF') && !char.IsWhiteSpace('\uFEFF'), "U+FEFF is JS \\s");
        Assert.IsFalse(S20FormatRules.isSpace('\u0085') || !char.IsWhiteSpace('\u0085'), "U+0085 is not JS \\s");
        Assert.IsTrue(S20FormatRules.isSpace('　') && S20FormatRules.isSpace('\u2028') && S20FormatRules.isSpace('\v'));
    }
}
