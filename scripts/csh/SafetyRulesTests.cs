// ★ Session Safety (P33–P37) — the safety pass pure rules, EXECUTED: the mini-app id (S-2) and table name (S-1) allow-lists,
// canonical containment, the picked-name base (S-3), the share stage path (S-4), the dialog name + confirm log line (S-5),
// the [FLAGS] line through the REAL SpixiFlags.init (absent = ON, a stored 0 acts only in dev mode, each flag its own pref).
// The real MiniApp* files run in SafetyAppTests.cs; the MAUI call sites are pinned by scripts/pins-safety/*.mjs.
// DELIBERATE BREAKS (Session Safety report): ① isSafeAppId without the `..` test → app_id fails ("../x" style ids);
// ② isSafeTableName accepting '.' → table fails; ③ isInside with no separator after the root → inside fails (the
// "/a/b-evil" sibling); ④ SpixiFlags.init reading NativeConfirm from xh → flags fails.
using System;
using System.IO;
using Microsoft.Maui.Storage;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

[TestClass]
public class SafetyRulesTests
{
    [TestMethod]
    public void app_id_allow_list()
    {
        foreach (string good in new[] { "com.ixilabs.spixi.split", "com.ixilabs.spixi.tictactoe", "com.ixilabs.spixi.gate-control",
            "com.ixilabs.spixi.mini-apps-test", "com.mostnonameuser.spixi.aiassistant", "a", "A1", "my_app", "x.y", "tmp2", "Tmpx", "con1", "COM10" })
            Assert.IsTrue(SafetyRules.isSafeAppId(good), "accepted: [" + good + "]");
        foreach (string bad in new[] { null, "", "..", "../..", "../../victim", "a/../b", "a/b", "a\\b", "/abs", "C:\\x", "C:x", ".hidden",
            "trail.", "a..b", "-lead", "trail-", "Tmp", "tmp", "TMP", "CON", "con", "nul.txt", "COM1", "lpt9.x", "a b", "ä", "a\0b",
            "x\n", new string('a', 129), "COM0", "lpt0.txt" })
            Assert.IsFalse(SafetyRules.isSafeAppId(bad), "refused: [" + bad + "]");
        Assert.IsTrue(SafetyRules.isSafeAppId(new string('a', 128)), "128 is the cap");
    }

    [TestMethod]
    public void table_allow_list()
    {
        foreach (string good in new[] { "main", "settings", "game", "table", "test", "a", "A_b-1", new string('t', 64) })
            Assert.IsTrue(SafetyRules.isSafeTableName(good), "accepted: [" + good + "]");
        foreach (string bad in new[] { null, "", ".", "..", "../../wallet.ixi", "wallet.ixi", "a.b", "/etc/x", "a/b", "a\\b", "C:x",
            "con", "NUL", "com3", "a b", "x\r", new string('t', 65) })
            Assert.IsFalse(SafetyRules.isSafeTableName(bad), "refused: [" + bad + "]");
    }

    [TestMethod]
    public void inside_is_canonical_and_strict()
    {
        string root = Path.Combine(Path.GetTempPath(), "safety-inside", "AppsStorage");
        Assert.IsTrue(SafetyRules.isInside(root, Path.Combine(root, "com.x")), "a child");
        Assert.IsTrue(SafetyRules.isInside(root + Path.DirectorySeparatorChar, Path.Combine(root, "com.x", "main")), "a grandchild, root with a trailing separator");
        Assert.IsFalse(SafetyRules.isInside(root, root), "the root itself");
        Assert.IsFalse(SafetyRules.isInside(root, root + "-evil"), "a sibling that shares the prefix");
        Assert.IsFalse(SafetyRules.isInside(root, Path.Combine(root, "com.x", "..", "..", "wallet.ixi")), "a .. escape");
        Assert.IsFalse(SafetyRules.isInside(root, Path.GetTempPath()), "a parent");
        Assert.IsFalse(SafetyRules.isInside(root, null), "null");
        Assert.IsFalse(SafetyRules.isInside(null, root), "null root");
        Assert.AreEqual(null, SafetyRules.childPath(root, "../x", false), "childPath refuses a bad id");
        Assert.AreEqual(null, SafetyRules.childPath(root, "a.b", true), "childPath refuses a bad table");
        Assert.AreEqual(Path.Combine(root, "main"), SafetyRules.childPath(root, "main", true), "childPath builds a good table");
        Assert.AreEqual(Path.Combine(root, "com.x"), SafetyRules.childPath(root, "com.x", false), "childPath builds a good id");
    }

    [TestMethod]
    public void picked_name_keeps_the_base_only()
    {
        Assert.AreEqual("wallet.ixi", SafetyRules.safeBaseName("../../wallet.ixi"));
        Assert.AreEqual("wallet.ixi", SafetyRules.safeBaseName("..\\..\\wallet.ixi"), "a backslash is a separator on every platform");
        Assert.AreEqual("x.zip", SafetyRules.safeBaseName("/abs/dir/x.zip"));
        Assert.AreEqual("file", SafetyRules.safeBaseName(".."));
        Assert.AreEqual("file", SafetyRules.safeBaseName("a/"));
        Assert.AreEqual("file", SafetyRules.safeBaseName(null));
        Assert.AreEqual("evilpiz.exe", SafetyRules.safeBaseName("evil\u202Epiz.exe"), "a bidi override is dropped");
        Assert.AreEqual(128, SafetyRules.safeBaseName(new string('n', 300)).Length, "capped");
        // ★ #46 r1 (R1 MINOR-2): the cap keeps the extension; a ZWJ emoji keeps its joiner; no lone surrogate
        string longPdf = SafetyRules.safeBaseName(new string('n', 300) + ".pdf");
        Assert.IsTrue(longPdf.Length == 128 && longPdf.EndsWith(".pdf"), "extension kept: " + longPdf.Length);
        Assert.AreEqual("\U0001F468\u200D\U0001F469.jpg", SafetyRules.safeBaseName("\U0001F468\u200D\U0001F469.jpg"));
        string sur = SafetyRules.safeBaseName(new string('n', 127) + "\uD83D\uDE00" + "x");
        Assert.IsFalse(char.IsHighSurrogate(sur[sur.Length - 1]), "no lone high surrogate at the cut");
        Assert.AreEqual("x", SafetyRules.safeBaseName("  x  "), "trimmed");
    }

    [TestMethod]
    public void share_stage_path()
    {
        string cache = Path.Combine(Path.GetTempPath(), "cache");
        Assert.AreEqual(Path.Combine(cache, "share", "wallet.ixi"), SafetyRules.shareStagePath(cache, "/data/user/0/p/files/Spixi/wallet.ixi"));
        Assert.AreEqual(null, SafetyRules.shareStagePath(null, "/x"));
        Assert.AreEqual(null, SafetyRules.shareStagePath(cache, ""));
        Assert.IsTrue(SafetyRules.isInside(Path.Combine(cache, "share"), SafetyRules.shareStagePath(cache, "/x/../../y.zip")), "always inside share/");
    }

    [TestMethod]
    public void dialog_name_and_confirm_line()
    {
        Assert.AreEqual("Bank support", SafetyRules.dialogName("  Bank\u202E support\n", "?"));
        Assert.AreEqual("?", SafetyRules.dialogName("\u202E\u2066\r\n", "?"), "only bidi / control characters → fallback");
        // ★ #46 r1 (R2 MAJOR-1): the fallback is WebView text too — cleaned and capped the same way
        string dirty = SafetyRules.dialogName("", "\n\nSpixi security notice\u202E: " + new string('x', 5000));
        Assert.IsTrue(dirty.Length == SafetyRules.MaxDialogNameLength && !dirty.Contains("\n") && !dirty.Contains("\u202E") && dirty.StartsWith("Spixi security notice"), "dirty fallback cleaned: [" + dirty + "]");
        Assert.AreEqual("", SafetyRules.dialogName(null, null), "both empty → empty");
        string emoji = SafetyRules.dialogName(new string('a', 46) + "\uD83D\uDE00\uD83D\uDE00", "?");
        Assert.IsFalse(char.IsHighSurrogate(emoji[emoji.Length - 2]), "the cap never leaves a lone high surrogate before the ellipsis: " + emoji);
        Assert.AreEqual("\U0001F468\u200D\U0001F469", SafetyRules.dialogName("\U0001F468\u200D\U0001F469", "?"), "a ZWJ emoji keeps its joiner");
        string longName = SafetyRules.dialogName(new string('x', 100), "?");
        Assert.AreEqual(SafetyRules.MaxDialogNameLength, longName.Length, "capped with the ellipsis");
        Assert.IsTrue(longName.EndsWith("…"));
        Assert.AreEqual("[CONFIRM] removecontact ok", SafetyRules.confirmLine(SafetyRules.ConfirmVerb.RemoveContact, "ok"));
        Assert.AreEqual("[CONFIRM] ban busy", SafetyRules.confirmLine(SafetyRules.ConfirmVerb.Ban, "busy"));
        Assert.AreEqual("[CONFIRM] leave cancel", SafetyRules.confirmLine(SafetyRules.ConfirmVerb.Leave, "anything else"), "unknown outcome → cancel");
        Assert.AreEqual("cancelled", SafetyRules.CancelledStatus);
        // ★ #46 r4 (MINOR-1): an OK under 600 ms is a timed double tap → Cancel; the log word is "fast"
        Assert.IsTrue(SafetyRules.tooFast(0) && SafetyRules.tooFast(599) && !SafetyRules.tooFast(600) && !SafetyRules.tooFast(5000));
        Assert.AreEqual("[CONFIRM] kick fast", SafetyRules.confirmLine(SafetyRules.ConfirmVerb.Kick, "fast"));
        Assert.IsTrue(SafetyRules.needsConfirm(true, SafetyRules.ConfirmVerb.Kick) && !SafetyRules.needsConfirm(false, SafetyRules.ConfirmVerb.Kick));
        Assert.IsTrue(SafetyRules.needsLock(true) && !SafetyRules.needsLock(false));
        Assert.IsTrue(SafetyRules.isMiniAppMarker("miniapp") && !SafetyRules.isMiniAppMarker("MiniApp") && !SafetyRules.isMiniAppMarker(null));
    }

    [TestMethod]
    public void confirm_texts_name_only_as_a_sanitised_argument()
    {
        var D = new System.Collections.Generic.Dictionary<string, string> {
            ["safety-confirm-removecontact-title"] = "Remove {0}?", ["contact-details-delete-contact-modal-subtitle"] = "SUB",
            ["contact-details-delete-contact-modal-confirm"] = "Yes, Remove Contact", ["contact-details-delete-history-modal-title"] = "Clear?",
            ["contact-details-delete-history-modal-subtitle"] = "HSUB", ["contact-details-delete-history-modal-confirm"] = "Yes, Clear Chat",
            ["safety-confirm-leave-title"] = "Leave {0}?", ["safety-confirm-leave-text"] = "LTXT", ["chat-bot-leave"] = "Leave Group",
            ["chat-modal-kick-title"] = "Kick {0}?", ["chat-modal-kick-body"] = "Kick '{0}'?", ["chat-modal-kick-kick-button"] = "KICK USER",
            ["chat-modal-ban-title"] = "Ban {0}?", ["chat-modal-ban-body"] = "Ban '{0}'?", ["chat-modal-ban-ban-button"] = "BAN USER",
            ["global-dialog-cancel"] = "Cancel" };
        System.Func<string, string?> sl = (k) => D.TryGetValue(k, out var v) ? v : null;
        string hostile = "\r\nEvil\u202E {1} {0} \u2028" + new string('z', 10000);
        var oks = new System.Collections.Generic.Dictionary<SafetyRules.ConfirmVerb, string> {
            [SafetyRules.ConfirmVerb.RemoveContact] = "Yes, Remove Contact", [SafetyRules.ConfirmVerb.RemoveHistory] = "Yes, Clear Chat",
            [SafetyRules.ConfirmVerb.Leave] = "Leave Group", [SafetyRules.ConfirmVerb.Kick] = "KICK USER", [SafetyRules.ConfirmVerb.Ban] = "BAN USER" };
        foreach (var kv in oks)
        {
            var t = SafetyRules.confirmTexts(kv.Key, hostile, hostile, sl);
            Assert.AreEqual(kv.Value, t.ok, "the OK label of " + kv.Key);
            Assert.IsTrue(t.ok != "Cancel", "never the Cancel label");
            foreach (string part in new[] { t.title, t.text })
                Assert.IsTrue(!part.Contains("\n") && !part.Contains("\r") && !part.Contains("\u202E") && !part.Contains("\u2028") && part.Length < 120,
                    kv.Key + ": the name reaches the dialog cleaned and capped: [" + part + "]");
        }
        Assert.AreEqual("Kick bob?", SafetyRules.confirmTexts(SafetyRules.ConfirmVerb.Kick, "", "bob", sl).title, "an empty nick shows the fallback (the address)");
        // ★ #46 r2 (m-4): removecontact with the leave flag names the shared-group count in the NATIVE text
        D["safety-confirm-removecontact-leave"] = "You also leave the groups you share with this contact ({0}).";
        Assert.AreEqual("SUB\n\nYou also leave the groups you share with this contact (3).", SafetyRules.confirmTexts(SafetyRules.ConfirmVerb.RemoveContact, "Bob", "", sl, 3).text);
        Assert.AreEqual("SUB", SafetyRules.confirmTexts(SafetyRules.ConfirmVerb.RemoveContact, "Bob", "", sl, 0).text, "no extra line without groups");
        Assert.AreEqual("SUB\n\nYou also leave the groups you share with this contact (1).", SafetyRules.confirmTexts(SafetyRules.ConfirmVerb.RemoveContact, "Bob", "", sl, 1).text, "★ #46 r3: ONE shared group is named too");
        D["chat-modal-kick-title"] = "Kick {1}?";   // a broken translation
        Assert.AreEqual("Kick {1}? bob", SafetyRules.confirmTexts(SafetyRules.ConfirmVerb.Kick, "bob", "", sl).title, "a malformed translation → text + name, no throw");
    }

    [TestMethod]
    public void flags_line_and_dev_arg()
    {
        Assert.AreEqual("[FLAGS] safeappid=1 safestorage=0 safepick=1 nativeconfirm=0 historylock=1 winappmarker=0",
            SafetyRules.flagsLine(true, false, true, false, true, false));
        Assert.AreEqual("1,0,1,1,0,1", SafetyRules.devFlagsArg(1, 0, 5, 1, 0, 1), "non-zero = 1");
        Assert.AreEqual(6, SafetyRules.DevSwitchNames.Length);
        string[] keys = { SpixiFlags.SafeAppIdKey, SpixiFlags.SafeStorageKey, SpixiFlags.SafePickKey, SpixiFlags.NativeConfirmKey, SpixiFlags.HistoryLockKey, SpixiFlags.WinAppMarkerKey };
        Assert.AreEqual("flagSafeAppId,flagSafeStorage,flagSafePick,flagNativeConfirm,flagHistoryLock,flagWinAppMarker", string.Join(",", keys));
        Preferences P = Preferences.Default;
        string? devBefore = P.d.TryGetValue("devMode", out var dv) ? dv : null;
        try
        {
            foreach (string k in keys) P.Remove(k);
            P.Set("devMode", false);
            IXICore.Meta.Logging.lines.Clear();
            SpixiFlags.init();
            var L = IXICore.Meta.Logging.lines;
            Assert.IsTrue(SpixiFlags.SafeAppId && SpixiFlags.SafeStorage && SpixiFlags.SafePick && SpixiFlags.NativeConfirm && SpixiFlags.HistoryLock && SpixiFlags.WinAppMarker, "absent = ON");
            int addr = L.IndexOf("[FLAGS] s20addrhelp=1");
            Assert.IsTrue(addr >= 0 && L.IndexOf("[FLAGS] safeappid=1 safestorage=1 safepick=1 nativeconfirm=1 historylock=1 winappmarker=1") == addr + 1,
                "one line, right after the S20I line — " + string.Join("|", L));
            foreach (string k in keys) P.Set(k, 0);
            SpixiFlags.init();
            Assert.IsTrue(SpixiFlags.NativeConfirm && SpixiFlags.SafeAppId, "dev mode off: a stored 0 is ignored");
            P.Set("devMode", true);
            for (int i = 0; i < keys.Length; i++)
            {
                foreach (string k in keys) P.Set(k, 1);
                P.Set(keys[i], 0);
                SpixiFlags.init();
                bool[] now = { SpixiFlags.SafeAppId, SpixiFlags.SafeStorage, SpixiFlags.SafePick, SpixiFlags.NativeConfirm, SpixiFlags.HistoryLock, SpixiFlags.WinAppMarker };
                for (int j = 0; j < now.Length; j++)
                    Assert.AreEqual(j != i, now[j], "dev mode on: only " + keys[i] + " is OFF (checked " + keys[j] + ")");
            }
        }
        finally
        {
            foreach (string k in keys) P.Remove(k);
            if (devBefore == null) P.Remove("devMode"); else P.d["devMode"] = devBefore;
            SpixiFlags.init();
            IXICore.Meta.Logging.lines.Clear();
        }
    }
}
