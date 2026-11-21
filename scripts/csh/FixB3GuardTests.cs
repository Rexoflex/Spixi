// ★ fixb3 item 1 (n-20261113-miniapp-action-before-onload, #1744 (4), P84) — EXECUTED: the pure half of the mini-app action
// guard (Spixi/Utils/FixB3Rules.cs). BEHAVIOUR, not source text: refuseBeforeOnload with a ready handler does nothing (no line,
// peek and reject never called); without one it refuses with exactly ONE warn line and the "not ready" reply; for every hostile
// peek (a 100 000-char command, secret-like values, control / line-separator / bidi characters, JSON-ish text, a known name
// padded or in another case, null, a throwing peek, a throwing reject) it never throws and the line is EXACTLY one of the 12
// fixed lines (11 names + unknown) built here from the list, printable ASCII only, without the hostile text; exceptionWord keeps
// only a plain identifier; the two catch lines never carry e.Message / e.ToString(). The MAUI call site (MiniAppPage.handleAction)
// is held by scripts/pins-fixb3/a-miniapp-guard.mjs (source).
using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class FixB3GuardTests
{
    private static readonly string[] Eleven = { "auth", "registerName", "updateName", "extendName", "updateCapacity", "allowSubnames", "transferName", "sendPayment", "ds", "getStorage", "setStorage" };

    private const string NotReadyHead = "MiniAppPage: an action before ixian:onload was refused (";
    private const string FailedHead = "MiniAppPage: a mini-app action failed (";
    private const string ResponseHead = "MiniAppPage: the answer of a mini-app action was not sent (";

    /** The 12 allowed refusal lines, built HERE from the list (not by the rule under test). */
    private static List<string> allowedNotReady() => Eleven.Concat(new[] { "unknown" }).Select(n => NotReadyHead + n + ")").ToList();

    private static string hex64() => string.Concat(Enumerable.Range(0, 32).Select(i => ((i * 37 + 11) % 256).ToString("x2")));

    /** Hostile command texts a mini app could send (none of them may reach a log line). */
    private static IEnumerable<string?> hostile()
    {
        yield return new string('x', 100000);
        yield return hex64();
        yield return "seed: abandon ability able about above absent absorb abstract absurd abuse access accident";
        yield return "password=hunter2&key=" + hex64();
        yield return "getStorage\r\n[ERROR] a forged line";
        yield return "getStorage\n";
        yield return "\0";
        yield return "getStorage\0";
        yield return "\u001b[31mred\u001b[0m";
        yield return "x\u2028y";
        yield return "x\u2029y";
        yield return "\u202Egnp.exe";
        yield return "{\"c\":\"getStorage\",\"id\":\"1\"}";
        yield return "getStorage ";
        yield return " getStorage";
        yield return "GetStorage";
        yield return "GETSTORAGE";
        yield return "sendpayment";
        yield return "";
        yield return null;
    }

    private static bool printableAscii(string s) => s.All(ch => ch >= 0x20 && ch <= 0x7E);

    private static void reset()
    {
        IXICore.Meta.Logging.lines.Clear();
        IXICore.Meta.Logging.warns.Clear();
        IXICore.Meta.Logging.errors.Clear();
    }

    private static int lineCount() => IXICore.Meta.Logging.lines.Count + IXICore.Meta.Logging.warns.Count + IXICore.Meta.Logging.errors.Count;

    [TestMethod]
    public void guard_ready_does_nothing()
    {
        reset();
        bool peeked = false, rejected = false;
        bool refused = FixB3Rules.refuseBeforeOnload(true, () => { peeked = true; return ("getStorage", "1"); }, (c, id, e) => { rejected = true; });
        Assert.IsFalse(refused, "a ready handler: the action goes on");
        Assert.IsFalse(peeked, "a ready handler: peek is NOT called");
        Assert.IsFalse(rejected, "a ready handler: reject is NOT called");
        Assert.AreEqual(0, lineCount(), "a ready handler: no log line");
    }

    [TestMethod]
    public void guard_not_ready_refuses_with_one_line_and_the_reply()
    {
        reset();
        var calls = new List<(string, string, string)>();
        bool refused = FixB3Rules.refuseBeforeOnload(false, () => ("getStorage", "42"), (c, id, e) => calls.Add((c, id, e)));
        Assert.IsTrue(refused, "no handler: the action is refused");
        Assert.AreEqual(1, IXICore.Meta.Logging.warns.Count, "exactly ONE warn line");
        Assert.AreEqual(0, IXICore.Meta.Logging.lines.Count + IXICore.Meta.Logging.errors.Count, "no info / error line");
        Assert.AreEqual(FixB3Rules.notReadyLine("getStorage"), IXICore.Meta.Logging.warns[0], "the line is notReadyLine");
        Assert.AreEqual(NotReadyHead + "getStorage)", IXICore.Meta.Logging.warns[0], "the line's fixed words");
        Assert.AreEqual(1, calls.Count, "reject is called once");
        Assert.AreEqual(("getStorage", "42", "not ready"), calls[0], "reject gets (command, id, \"not ready\")");
        Assert.AreEqual("not ready", FixB3Rules.NotReadyError, "the reply's e");
    }

    [TestMethod]
    public void guard_every_known_name_is_logged_by_the_list()
    {
        foreach (string n in Eleven)
        {
            reset();
            string copy = new string(n.ToCharArray());   // not the interned literal
            bool refused = FixB3Rules.refuseBeforeOnload(false, () => (copy, "1"), (c, id, e) => { });
            Assert.IsTrue(refused, n + ": refused");
            Assert.AreEqual(1, IXICore.Meta.Logging.warns.Count, n + ": one line");
            Assert.AreEqual(NotReadyHead + n + ")", IXICore.Meta.Logging.warns[0], n + ": the name from the list");
        }
    }

    [TestMethod]
    public void guard_hostile_peeks_log_only_fixed_lines()
    {
        var allowed = allowedNotReady();
        int k = 0;
        foreach (string? h in hostile())
        {
            foreach (bool asId in new[] { false, true })
            {
                reset();
                string tag = "hostile #" + k + (asId ? " (as the id)" : " (as the command)");
                var calls = new List<(string, string, string)>();
                bool refused = false;
                try
                {
                    refused = asId
                        ? FixB3Rules.refuseBeforeOnload(false, () => ("auth", h), (c, id, e) => calls.Add((c, id, e)))
                        : FixB3Rules.refuseBeforeOnload(false, () => (h, "9"), (c, id, e) => calls.Add((c, id, e)));
                }
                catch (Exception ex)
                {
                    Assert.IsTrue(false, tag + ": the guard threw " + ex.GetType().Name);
                }
                Assert.IsTrue(refused, tag + ": refused");
                Assert.AreEqual(1, IXICore.Meta.Logging.warns.Count, tag + ": exactly one warn line");
                Assert.AreEqual(0, IXICore.Meta.Logging.lines.Count + IXICore.Meta.Logging.errors.Count, tag + ": no other line");
                string line = IXICore.Meta.Logging.warns[0];
                Assert.IsTrue(allowed.Contains(line), tag + ": the line is one of the 12 fixed lines");
                string want = NotReadyHead + (asId ? "auth" : "unknown") + ")";
                Assert.AreEqual(want, line, tag + ": the exact line");
                Assert.IsTrue(printableAscii(line), tag + ": printable ASCII only (no control, separator or bidi character)");
                if (!string.IsNullOrEmpty(h))
                {
                    Assert.IsFalse(line.Contains(h), tag + ": the hostile text is not in the line");
                }
                // the reply goes to the SAME mini app only when both values are there
                Assert.AreEqual(h == null ? 0 : 1, calls.Count, tag + ": reject only with a command and an id");
            }
            k++;
        }
    }

    [TestMethod]
    public void guard_throwing_peek_and_reject()
    {
        reset();
        bool rejected = false;
        bool refused = FixB3Rules.refuseBeforeOnload(false, () => throw new FormatException("getStorage " + hex64()), (c, id, e) => { rejected = true; });
        Assert.IsTrue(refused, "a throwing peek: refused, no throw");
        Assert.IsFalse(rejected, "a throwing peek: (null, null) → no reject");
        Assert.AreEqual(1, IXICore.Meta.Logging.warns.Count, "a throwing peek: one line");
        Assert.AreEqual(NotReadyHead + "unknown)", IXICore.Meta.Logging.warns[0], "a throwing peek: unknown");

        reset();
        refused = FixB3Rules.refuseBeforeOnload(false, () => ("sendPayment", "5"), (c, id, e) => throw new InvalidOperationException("seed: " + hex64()));
        Assert.IsTrue(refused, "a throwing reject: refused, swallowed");
        Assert.AreEqual(1, lineCount(), "a throwing reject: no second line");
        Assert.AreEqual(NotReadyHead + "sendPayment)", IXICore.Meta.Logging.warns[0], "a throwing reject: the one line");

        reset();
        refused = FixB3Rules.refuseBeforeOnload(false, () => ("getStorage", null), (c, id, e) => { rejected = true; });
        Assert.IsTrue(refused && !rejected, "no id: refused, no reject");
        Assert.AreEqual(NotReadyHead + "getStorage)", IXICore.Meta.Logging.warns[0], "no id: the line");
    }

    [TestMethod]
    public void action_log_name_is_the_lists_own_string()
    {
        Assert.AreEqual(11, FixB3Rules.MiniAppActionNames.Length, "eleven names");
        Assert.AreEqual(11, FixB3Rules.MiniAppActionNames.Distinct(StringComparer.Ordinal).Count(), "eleven DIFFERENT names");
        Assert.IsTrue(FixB3Rules.MiniAppActionNames.OrderBy(x => x, StringComparer.Ordinal).SequenceEqual(Eleven.OrderBy(x => x, StringComparer.Ordinal)), "the eleven MiniAppCommands values");
        for (int i = 0; i < FixB3Rules.MiniAppActionNames.Length; i++)
        {
            string listed = FixB3Rules.MiniAppActionNames[i];
            string copy = new string(listed.ToCharArray());
            string got = FixB3Rules.actionLogName(copy);
            Assert.IsTrue(ReferenceEquals(got, listed), listed + ": the LIST's instance is returned");
            Assert.IsFalse(ReferenceEquals(got, copy), listed + ": never the input's instance");
        }
        foreach (string? h in hostile())
        {
            Assert.AreEqual("unknown", FixB3Rules.actionLogName(h), "a hostile / padded / other-case text → unknown");
        }
    }

    private class Weird<T> : Exception { public Weird(string m) : base(m) { } }
    private class _Under : Exception { }
    private class AVeryLongExceptionTypeNameThatGoesOnAndOnPastTheSixtyFourCharacterLimitOfTheRule : Exception { }
    private class Qaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa : Exception { }   // ★ fixb3 #46 r3 (S n-1): exactly 64 characters — accepted
    private class Qaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa : Exception { }   // 65 characters — refused
    private class ÉtrangeException : Exception { }   // a non-ASCII letter — refused

    [TestMethod]
    public void exception_word_only_a_plain_identifier()
    {
        Assert.AreEqual("InvalidOperationException", FixB3Rules.exceptionWord(new InvalidOperationException("seed: " + hex64())), "a normal exception → its type name");
        Assert.AreEqual("NullReferenceException", FixB3Rules.exceptionWord(new NullReferenceException()), "the before-onload throw");
        Assert.AreEqual("none", FixB3Rules.exceptionWord(null), "null → none");
        Assert.IsTrue(typeof(Weird<int>).Name.Contains('`'), "the generic type's Name holds a backtick");
        Assert.AreEqual("Exception", FixB3Rules.exceptionWord(new Weird<int>("x")), "a backtick name → Exception");
        Assert.AreEqual("Exception", FixB3Rules.exceptionWord(new _Under()), "a name that starts with _ → Exception");
        Assert.IsTrue(typeof(AVeryLongExceptionTypeNameThatGoesOnAndOnPastTheSixtyFourCharacterLimitOfTheRule).Name.Length > 64, "the long name is over 64");
        Assert.AreEqual("Exception", FixB3Rules.exceptionWord(new AVeryLongExceptionTypeNameThatGoesOnAndOnPastTheSixtyFourCharacterLimitOfTheRule()), "over 64 characters → Exception");
        Assert.AreEqual(64, typeof(Qaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa).Name.Length, "the 64 name");
        Assert.AreEqual("Qaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", FixB3Rules.exceptionWord(new Qaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa()), "exactly 64 ASCII characters → the name (the cap is 64, not less)");
        Assert.AreEqual("Exception", FixB3Rules.exceptionWord(new Qaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa()), "65 characters → Exception (the cap is 64, not more)");
        Assert.AreEqual("Exception", FixB3Rules.exceptionWord(new ÉtrangeException()), "a non-ASCII letter → Exception (ASCII only)");
    }

    private class Loud : Exception
    {
        private readonly string t;
        public Loud(string t) : base(t) { this.t = t; }
        public Loud(string t, Exception inner) : base(t, inner) { this.t = t; }   // ★ fixb3 #46 r1 (S M-1): a hostile inner exception
        public override string Message => t;
        public override string ToString() => t;
        public override string? StackTrace => t;
    }

    [TestMethod]
    public void failed_lines_never_carry_the_message()
    {
        foreach (string? h in hostile())
        {
            string payload = (h ?? "") + " seed: " + hex64();
            foreach (Exception e in new Exception[] { new InvalidOperationException(payload), new Loud(payload) })
            {
                string word = e is Loud ? "Loud" : "InvalidOperationException";
                string a = FixB3Rules.actionFailedLine(h, e);
                string r = FixB3Rules.responseFailedLine(h, e);
                Assert.AreEqual(FailedHead + "unknown, " + word + ")", a, "the action-failed line is fixed");
                Assert.AreEqual(ResponseHead + "unknown, " + word + ")", r, "the response-failed line is fixed");
                Assert.IsFalse(a.Contains(hex64()) || r.Contains(hex64()), "the message never appears");
                Assert.IsTrue(printableAscii(a) && printableAscii(r), "printable ASCII only");
            }
        }
        Assert.AreEqual(FailedHead + "sendPayment, NullReferenceException)", FixB3Rules.actionFailedLine("sendPayment", new NullReferenceException()), "a known name + the type");
        Assert.AreEqual(ResponseHead + "auth, none)", FixB3Rules.responseFailedLine("auth", null), "no exception → none");
        Assert.AreEqual(FailedHead + "unknown, Exception)", FixB3Rules.actionFailedLine(null, new Weird<string>("getStorage")), "a backtick type → Exception");
    }

    /** ★ fixb3 #46 r1 (S M-1): exceptions that carry hostile text OUTSIDE their own Message — a two-level InnerException chain, an
     *  AggregateException of hostile inner exceptions, Source / HelpLink / Data["k"] — so that a line builder which appends
     *  e.InnerException.Message, e.InnerException.ToString(), e.Source, e.HelpLink or e.Data turns these exact-line asserts red. */
    private static IEnumerable<(Exception e, string word, string tag)> hostileCarriers(string payload)
    {
        yield return (new InvalidOperationException("outer", new FormatException("mid " + payload, new ArgumentException("deep " + payload))), "InvalidOperationException", "inner chain (2 levels)");
        yield return (new Loud("outer", new Loud("inner " + payload)), "Loud", "a Loud outer with a Loud inner");
        yield return (new AggregateException("agg", new Exception("a1 " + payload), new InvalidOperationException("a2 " + payload, new FormatException("a2deep " + payload))), "AggregateException", "AggregateException of hostile inner exceptions");
        var src = new InvalidOperationException("plain");
        src.Source = "src " + payload;
        src.HelpLink = "https://evil.example/?q=" + payload;
        src.Data["k"] = "data " + payload;
        yield return (src, "InvalidOperationException", "Source / HelpLink / Data[k]");
        Exception thrown;
        try
        {
            throw new InvalidOperationException("thrown", new FormatException("thrown inner " + payload));
        }
        catch (Exception ex)
        {
            ex.Source = "src " + payload;
            thrown = ex;   // a real stack trace on the outer exception
        }
        yield return (thrown, "InvalidOperationException", "a thrown exception with a stack trace + an inner one");
    }

    [TestMethod]
    public void failed_lines_never_carry_inner_source_helplink_or_data()
    {
        foreach (string? h in hostile())
        {
            string payload = (h ?? "") + " seed: " + hex64();
            foreach (var (e, word, tag) in hostileCarriers(payload))
            {
                foreach (string? c in new[] { h, "getStorage" })
                {
                    string name = c == "getStorage" ? "getStorage" : "unknown";
                    string a = FixB3Rules.actionFailedLine(c, e);
                    string r = FixB3Rules.responseFailedLine(c, e);
                    Assert.AreEqual(FailedHead + name + ", " + word + ")", a, tag + ": the action-failed line is exactly the fixed line");
                    Assert.AreEqual(ResponseHead + name + ", " + word + ")", r, tag + ": the response-failed line is exactly the fixed line");
                    Assert.IsFalse(a.Contains(hex64()) || r.Contains(hex64()), tag + ": no inner / Source / HelpLink / Data text");
                    Assert.IsTrue(printableAscii(a) && printableAscii(r), tag + ": printable ASCII only");
                }
            }
        }
        // the guard's own line with a hostile, chained exception from peek and from reject
        reset();
        bool refused = FixB3Rules.refuseBeforeOnload(false, () => throw new AggregateException(new Exception("p " + hex64())), (c, id, e) => { });
        Assert.IsTrue(refused, "a throwing peek (aggregate): refused");
        Assert.AreEqual(1, lineCount(), "a throwing peek (aggregate): one line");
        Assert.AreEqual(NotReadyHead + "unknown)", IXICore.Meta.Logging.warns[0], "a throwing peek (aggregate): the fixed line");
        reset();
        refused = FixB3Rules.refuseBeforeOnload(false, () => ("setStorage", "7"), (c, id, e) => throw new InvalidOperationException("r", new FormatException("deep " + hex64())));
        Assert.IsTrue(refused, "a throwing reject (chained): refused");
        Assert.AreEqual(1, lineCount(), "a throwing reject (chained): one line");
        Assert.AreEqual(NotReadyHead + "setStorage)", IXICore.Meta.Logging.warns[0], "a throwing reject (chained): the fixed line");
    }
}
