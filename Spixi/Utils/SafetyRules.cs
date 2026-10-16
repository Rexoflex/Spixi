/* ★ Session Safety (#1312 rule 1, #1313) — the PURE rules of the safety pass, executed by scripts/csh (SafetyRulesTests.cs).
 * Mechanisms + proofs: docs/safety-mechanisms.md. Review packets: P33 (mini-app paths: S-1 storage table, S-2 app id, S-3
 * picked name) · P34 (Android share folders, S-4) · P35 (native confirms, S-5) · P36 (delete-all history / downloads behind the
 * lock, S-6) · P37 (the mini-app marker on Windows, O-02). One flag per fix, read ONCE at start (SpixiFlags.init), absent = ON,
 * a stored 0 acts only in dev mode (S16PassRules.effectiveFlag); flag OFF = the old path. S-4 has NO runtime flag: the
 * FileProvider roots are an Android resource read at install (the fallback is a revert of provider_paths.xml).
 *
 * SECURITY (CLAUDE.md ★): no new verb; no new WebView setting except O-02's privilege DROPS for the mini-app WebView on
 * Windows; one new push word (`cancelled` in the existing removeContactResult / removeHistoryResult / leaveGroupResult);
 * every new log line is a fixed vocabulary (no id, no table name, no path, no peer text). */
using System;
using System.IO;
using System.Text;

namespace SPIXI
{
    public static class SafetyRules
    {
        // ───────────── S-2 · MAJOR #10 / H-9: the mini-app id ─────────────

        /** The longest id this app accepts (every public id is under 48: com.ixilabs.spixi.*, com.mostnonameuser.spixi.aiassistant). */
        public const int MaxAppIdLength = 128;

        /** The manager's own scratch folder (`<apps>/Tmp`, MiniAppManager.tmpPath) — never an app. */
        public const string TmpFolderName = "Tmp";

        /** S-2: a mini-app id is used as ONE folder name under `html/Apps`. Accepted: 1–128 characters of ASCII letters,
         *  digits, `.`, `_`, `-`; the first and the last character a letter or digit; no `..`; not `Tmp` (any case); not a
         *  Windows device name (CON, PRN, AUX, NUL, COM1–9, LPT1–9, also before a `.`). Everything else — `..`, `/`, `\`,
         *  `:`, a rooted path, an empty id, spaces, non-ASCII — is refused. */
        public static bool isSafeAppId(string? id)
        {
            if (string.IsNullOrEmpty(id) || id.Length > MaxAppIdLength) return false;
            if (!isAlnum(id[0]) || !isAlnum(id[id.Length - 1])) return false;
            for (int i = 0; i < id.Length; i++)
            {
                char c = id[i];
                if (isAlnum(c) || c == '_' || c == '-') continue;
                if (c == '.' && i + 1 < id.Length && id[i + 1] != '.') continue;
                return false;
            }
            if (string.Equals(id, TmpFolderName, StringComparison.OrdinalIgnoreCase)) return false;
            return !isWindowsDeviceName(id);
        }

        // ───────────── S-1 · H-6: the storage table name ─────────────

        public const int MaxTableNameLength = 64;

        /** S-1: a storage table is ONE file name under `AppsStorage/<id>`. Accepted: 1–64 ASCII letters, digits, `_`, `-`
         *  (no dot at all), not a Windows device name. Every table the public apps use passes (`main`, `settings`, `game`,
         *  `table`, `test`). */
        public static bool isSafeTableName(string? t)
        {
            if (string.IsNullOrEmpty(t) || t.Length > MaxTableNameLength) return false;
            foreach (char c in t)
            {
                if (!(isAlnum(c) || c == '_' || c == '-')) return false;
            }
            return !isWindowsDeviceName(t);
        }

        // ───────────── shared: canonical containment ─────────────

        /** True when `candidate`, canonicalised, lies STRICTLY inside `root` (canonicalised): root + separator is a prefix.
         *  Ordinal on Linux / Android / Apple, OrdinalIgnoreCase where the separator is `\` (Windows). A null, empty or
         *  unparsable input is false (fail closed). The root itself is not "inside". */
        public static bool isInside(string? root, string? candidate)
        {
            if (string.IsNullOrEmpty(root) || string.IsNullOrEmpty(candidate)) return false;
            try
            {
                string r = Path.TrimEndingDirectorySeparator(Path.GetFullPath(root)) + Path.DirectorySeparatorChar;
                string c = Path.GetFullPath(candidate);
                var cmp = Path.DirectorySeparatorChar == '\\' ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
                return c.Length > r.Length && c.StartsWith(r, cmp);
            }
            catch (Exception)
            {
                return false;
            }
        }

        /** S-1 / S-2: `Path.Combine(root, leaf)` only when `leaf` is ONE safe segment for that use and the result stays inside
         *  `root`; else null. `table` picks the table rule (true) or the app-id rule (false). */
        public static string? childPath(string? root, string? leaf, bool table)
        {
            if (string.IsNullOrEmpty(root)) return null;
            if (!(table ? isSafeTableName(leaf) : isSafeAppId(leaf))) return null;
            string p = Path.Combine(root, leaf!);
            return isInside(root, p) ? p : null;
        }

        // ───────────── S-3 · H-8: a picked or shown file name ─────────────

        public const int MaxBaseNameLength = 128;

        /** S-3: the last segment of a name a picker or provider supplied — both `/` and `\` are separators on every platform
         *  (a provider DISPLAY_NAME is free text); control characters and the bidi controls (SafetyRules.isBidiControl) are
         *  dropped — other format characters stay (★ #46 r1 R1 MINOR-2: a ZWJ emoji name keeps its joiners); `.` and `..` and
         *  an empty result become "file"; capped at 128 characters KEEPING the extension (≤ 16 characters) and never splitting
         *  a surrogate pair. Used for display and for sending, never as a path that C# writes. */
        public static string safeBaseName(string? name)
        {
            string s = name ?? "";
            int cut = Math.Max(s.LastIndexOf('/'), s.LastIndexOf('\\'));
            if (cut >= 0) s = s.Substring(cut + 1);
            var sb = new StringBuilder(s.Length);
            foreach (char c in s)
            {
                if (char.IsControl(c) || isBidiControl(c)) continue;
                sb.Append(c);
            }
            s = sb.ToString().Trim();
            if (s.Length > MaxBaseNameLength)
            {
                int dot = s.LastIndexOf('.');
                string ext = dot > 0 && s.Length - dot <= 16 ? s.Substring(dot) : "";
                s = safeCut(s.Substring(0, s.Length - ext.Length), MaxBaseNameLength - ext.Length).TrimEnd() + ext;
            }
            if (s.Length == 0 || s == "." || s == "..") s = "file";
            return s;
        }

        /** The bidi controls a name can use to reverse what it shows (LRE RLE PDF LRO RLO, LRI RLI FSI PDI, LRM RLM, ALM). */
        public static bool isBidiControl(char c) =>
            (c >= '\u202A' && c <= '\u202E') || (c >= '\u2066' && c <= '\u2069') || c == '\u200E' || c == '\u200F' || c == '\u061C';

        /** The first `max` UTF-16 units of `s`, one shorter when the cut would split a surrogate pair. */
        private static string safeCut(string s, int max)
        {
            if (max <= 0) return "";
            if (s.Length <= max) return s;
            int n = char.IsHighSurrogate(s[max - 1]) ? max - 1 : max;
            return s.Substring(0, n);
        }

        // ───────────── S-4 · H-10: the Android share folder ─────────────

        /** The cache subfolder the FileProvider publishes for Share (provider_paths.xml `cache-path name="share" path="share/"`). */
        public const string ShareFolderName = "share";

        /** S-4: where Share stages a copy: `<cacheDir>/share/<base name of the C# source path>`, or null when the cache dir
         *  or the source is empty. The leaf keeps the receiver's file name (wallet.ixi, spixi.account.backup.ixi,
         *  spixi.log.zip). */
        public static string? shareStagePath(string? cacheDir, string? sourcePath)
        {
            if (string.IsNullOrEmpty(cacheDir) || string.IsNullOrEmpty(sourcePath)) return null;
            string leaf = safeBaseName(Path.GetFileName(sourcePath));
            return Path.Combine(cacheDir, ShareFolderName, leaf);
        }

        // ───────────── S-5: native confirms ─────────────

        /** The five verbs that confirm natively (Damir, Safety Dials q1 = A: chat + chat info; home keeps its page sheet). */
        public enum ConfirmVerb { RemoveContact, RemoveHistory, Leave, Kick, Ban }

        /** The status word a Cancel answers in the verb's existing result push (removeContactResult · removeHistoryResult ·
         *  leaveGroupResult). A shell that knows it restores the row with no error; an older shell treats it as a refusal. */
        public const string CancelledStatus = "cancelled";

        /** S-5: flag ON → every verb above waits for a native OK. Flag OFF → today (acts at once). */
        public static bool needsConfirm(bool flagOn, ConfirmVerb verb) => flagOn;

        /** The longest name a native dialog shows. */
        public const int MaxDialogNameLength = 48;

        /** S-5: a peer-chosen name or an address shown inside a NATIVE dialog — control characters, line / paragraph
         *  separators and the bidi controls dropped, trimmed, capped at 48 characters with "…" (never splitting a surrogate
         *  pair); an empty result → `fallback`, cleaned THE SAME WAY (★ #46 r1 R2 MAJOR-1: the fallback is WebView text too). */
        public static string dialogName(string? raw, string? fallback)
        {
            string s = cleanDialogText(raw);
            return s.Length > 0 ? s : cleanDialogText(fallback);
        }

        private static string cleanDialogText(string? raw)
        {
            var sb = new StringBuilder();
            foreach (char c in raw ?? "")
            {
                var cat = char.GetUnicodeCategory(c);
                if (char.IsControl(c) || isBidiControl(c)
                    || cat == System.Globalization.UnicodeCategory.LineSeparator || cat == System.Globalization.UnicodeCategory.ParagraphSeparator) continue;
                sb.Append(c);
            }
            string s = sb.ToString().Trim();
            if (s.Length > MaxDialogNameLength) s = safeCut(s, MaxDialogNameLength - 1).TrimEnd() + "…";
            return s;
        }

        /** S-5: the native dialog's (title, text, OK label) per verb — the legacy keys where a translated one fits (13
         *  languages already), the `safety-confirm-*` keys where none did. `sl` = the localisation lookup
         *  (SpixiLocalization._SL in the app; a dictionary in csh). The name ONLY ever reaches a `{0}` ARGUMENT, through
         *  dialogName; a malformed translation (a stray brace) falls back to "<text> <name>". The OK label is never the
         *  Cancel label (★ #46 r1 R2 MINOR-6 (c): executed in csh). */
        public static (string title, string text, string ok) confirmTexts(ConfirmVerb verb, string? name, string? fallback, Func<string, string?> sl, int alsoLeaveGroups = 0)
        {
            string n = dialogName(name, fallback);
            string L(string k) => sl(k) ?? "";
            string F(string k)
            {
                string t = L(k);
                try { return string.Format(t, n); } catch (FormatException) { return t + " " + n; }
            }
            switch (verb)
            {
                case ConfirmVerb.RemoveContact:
                {
                    /* ★ #46 r2 (m-4): `ixian:removecontact:1` also leaves every group shared with the contact — the NATIVE text
                     * says so (with the count), so a page cannot turn "Remove Bob?" into a silent multi-group leave. */
                    string text = L("contact-details-delete-contact-modal-subtitle");
                    if (alsoLeaveGroups > 0)
                    {
                        string t = L("safety-confirm-removecontact-leave");
                        string extra;
                        try { extra = string.Format(t, alsoLeaveGroups); } catch (FormatException) { extra = t + " " + alsoLeaveGroups; }
                        text = text + "\n\n" + extra;
                    }
                    return (F("safety-confirm-removecontact-title"), text, L("contact-details-delete-contact-modal-confirm"));
                }
                case ConfirmVerb.RemoveHistory:
                    return (L("contact-details-delete-history-modal-title"), L("contact-details-delete-history-modal-subtitle"), L("contact-details-delete-history-modal-confirm"));
                case ConfirmVerb.Leave:
                    return (F("safety-confirm-leave-title"), L("safety-confirm-leave-text"), L("chat-bot-leave"));
                case ConfirmVerb.Kick:
                    return (F("chat-modal-kick-title"), F("chat-modal-kick-body"), L("chat-modal-kick-kick-button"));
                default:
                    return (F("chat-modal-ban-title"), F("chat-modal-ban-body"), L("chat-modal-ban-ban-button"));
            }
        }

        /** ★ #46 r4 (MINOR-1): an OK faster than this after the dialog was asked for is treated as Cancel — a page can time a
         *  verb on the first tap of a double tap it asked for, so the second tap lands on the native OK. */
        public const long MinConfirmMs = 600;

        public static bool tooFast(long elapsedMs) => elapsedMs < MinConfirmMs;

        /** The one log line a confirm writes: `[CONFIRM] <verb> ok|cancel|busy|fast` (fixed words; never a name or an address). */
        public static string confirmLine(ConfirmVerb verb, string outcome)
        {
            string o = outcome == "ok" || outcome == "cancel" || outcome == "busy" || outcome == "fast" ? outcome : "cancel";
            return "[CONFIRM] " + verbWord(verb) + " " + o;
        }

        public static string verbWord(ConfirmVerb verb) => verb switch
        {
            ConfirmVerb.RemoveContact => "removecontact",
            ConfirmVerb.RemoveHistory => "removehistory",
            ConfirmVerb.Leave => "leave",
            ConfirmVerb.Kick => "kick",
            ConfirmVerb.Ban => "ban",
            _ => "unknown",
        };

        // ───────────── S-6 · CH3: delete-all behind the lock ─────────────

        /** S-6: flag ON → `ixian:deleteh` and `ixian:deleted` act only after LockPage(true) raises success. OFF → at once. */
        public static bool needsLock(bool flagOn) => flagOn;

        // ───────────── O-02: the mini-app marker ─────────────

        /** The ONE marker the MiniAppPage WebView carries (MiniAppPage.xaml `ClassId="miniapp"`); Android, iOS / Mac and
         *  (O-02) Windows read this same literal. */
        public const string MiniAppMarker = "miniapp";

        public static bool isMiniAppMarker(string? classId) => string.Equals(classId, MiniAppMarker, StringComparison.Ordinal);

        // ───────────── flags ─────────────

        /** The [FLAGS] line of the safety pass — six fixed words, 0 / 1 each. */
        public static string flagsLine(bool appId, bool appStorage, bool pickName, bool nativeConfirm, bool historyLock, bool winAppMarker) =>
            "[FLAGS] safeappid=" + b(appId) + " safestorage=" + b(appStorage) + " safepick=" + b(pickName)
            + " nativeconfirm=" + b(nativeConfirm) + " historylock=" + b(historyLock) + " winappmarker=" + b(winAppMarker);

        /** The dev push `setFlagsDevSafety` argument: the six STORED switches, "a,b,c,d,e,f" (absent = 1). */
        public static string devFlagsArg(int appId, int appStorage, int pickName, int nativeConfirm, int historyLock, int winAppMarker) =>
            d(appId) + "," + d(appStorage) + "," + d(pickName) + "," + d(nativeConfirm) + "," + d(historyLock) + "," + d(winAppMarker);

        /** The dev switch names (`ixian:devflash:<name>:<0|1>`, DevPage), in the devFlagsArg order. */
        public static readonly string[] DevSwitchNames = { "safeappid", "safestorage", "safepick", "nativeconfirm", "historylock", "winappmarker" };

        // ───────────── helpers ─────────────

        private static string b(bool v) => v ? "1" : "0";
        private static string d(int v) => v == 0 ? "0" : "1";
        private static bool isAlnum(char c) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9');

        private static bool isWindowsDeviceName(string s)
        {
            int dot = s.IndexOf('.');
            string stem = (dot >= 0 ? s.Substring(0, dot) : s).ToUpperInvariant();
            if (stem == "CON" || stem == "PRN" || stem == "AUX" || stem == "NUL") return true;
            if (stem.Length == 4 && (stem.StartsWith("COM", StringComparison.Ordinal) || stem.StartsWith("LPT", StringComparison.Ordinal))
                && stem[3] >= '0' && stem[3] <= '9') return true;   // ★ #46 r1 (R1 NIT): COM0 / LPT0 are reserved too
            return false;
        }
    }
}
