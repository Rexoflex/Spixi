/* ★ S16 (#1311, #1294 (c)) — the PURE half of the S16 fixes. No MAUI, no Core type, no disk — the harness executes every rule
 * (scripts/csh/S16FixTests.cs). The call sites are MAUI- / platform-bound and are pinned by scripts/pins-s16/c-fix.mjs:
 *   · #1311 (a) [THEME] lines — App.xaml.cs RequestedThemeChanged · UIHelpers.pushThemeToAllPages · MainActivity.OnResume ·
 *     SpixiContentPage.generatePage: every value is one of the fixed words below, an AppTheme enum name or an integer;
 *   · #1311 (c) — SpixiLocalStorageCallbacks.processMessage asks rearmLeg before it opens the file; TransferManager.claimRearm
 *     is a RearmLedger. */
using System;
using System.Collections.Concurrent;

namespace SPIXI
{
    public static class S16FixRules
    {
        /** #1311 (a): a theme name (the baked *SL{SpixiThemeName}, the resolved live name) as a fixed word — never the raw value. */
        public static string themeWord(string? name)
        {
            if (name == "dark")
            {
                return "dark";
            }
            return name == "light" ? "light" : "?";
        }

        /** #1311 (a): a page generated now bakes `baked`; the app theme is `live`. True = the new document starts in the wrong
         *  theme (the gen-stale line). */
        public static bool genStale(string? baked, string? live)
        {
            return themeWord(baked) != themeWord(live);
        }

        /* #1311 (a): Android Configuration.uiMode night bits (UI_MODE_NIGHT_MASK / _YES / _NO). */
        public const int UiModeNightMask = 0x30;
        public const int UiModeNightYes = 0x20;
        public const int UiModeNightNo = 0x10;

        /** #1311 (a): a Configuration.uiMode → night | day | ? (undefined or unread). */
        public static string nightWord(int? uiMode)
        {
            if (!uiMode.HasValue)
            {
                return "?";
            }
            int n = uiMode.Value & UiModeNightMask;
            if (n == UiModeNightYes)
            {
                return "night";
            }
            return n == UiModeNightNo ? "day" : "?";
        }

        /** #1311 (a): the activity's and the application's config, as the `cfgAct=… cfgApp=…` pair (null = not read / not Android). */
        public static string cfgWords(int? activityUiMode, int? appUiMode)
        {
            return "cfgAct=" + nightWord(activityUiMode) + " cfgApp=" + nightWord(appUiMode);
        }

        public static int bit(bool b)
        {
            return b ? 1 : 0;
        }

#if ANDROID
        /** #1311 (a): the two Android configs' night bits — the platform read stays here, the words above. A failed read = "?". */
        public static string androidCfgWords(Android.App.Activity? activity)
        {
            int? act = null;
            int? app = null;
            try
            {
                Android.Content.Res.Configuration? c = activity?.Resources?.Configuration;
                if (c != null)
                {
                    act = (int)c.UiMode;
                }
            }
            catch (Exception)
            {
            }
            try
            {
                Android.Content.Res.Configuration? c = Android.App.Application.Context?.Resources?.Configuration;
                if (c != null)
                {
                    app = (int)c.UiMode;
                }
            }
            catch (Exception)
            {
            }
            return cfgWords(act, app);
        }
#endif

        /* ★ S16 (#1311 (c)): the unfinished-SENT-file re-arm, once per transfer id per session. The Windows log had 1 436 failed
         * re-arms in 3.5 h: the callback runs on every message load, and an id whose source is gone (or already armed) failed
         * again every time. */
        public enum RearmLeg
        {
            NoId,       // no transfer id: nothing to re-arm (a fresh random id would match no message)
            Outgoing,   // already prepared (sent this session or re-armed): quiet
            Tried,      // claimed earlier this session (its failure, if any, was logged once): quiet
            Arm         // first time for this id: open the file and prepare the transfer
        }

        /** The order is the rule: an id that is already outgoing never spends its claim. */
        public static RearmLeg rearmLeg(string? uid, Func<string, bool> hasOutgoing, Func<string, bool> claim)
        {
            if (string.IsNullOrEmpty(uid))
            {
                return RearmLeg.NoId;
            }
            if (hasOutgoing(uid))
            {
                return RearmLeg.Outgoing;
            }
            if (!claim(uid))
            {
                return RearmLeg.Tried;
            }
            return RearmLeg.Arm;
        }

        /** ★ #46 r1 (R3 m1): a failed re-arm keeps its claim only when the failure is FINAL — the source file or its folder is
         *  gone (the 1 436-line case); a transient one (a sharing violation, protected data during an iOS background load) must be retried by the next message load. */
        public static bool rearmKeepsClaim(Exception e)
        {
            return e is System.IO.FileNotFoundException || e is System.IO.DirectoryNotFoundException;
        }

        /** ★ #46 r1 (R3 m1): the failure leg — release the claim unless rearmKeepsClaim; the return says whether to write the
         *  error line (the first failure of this id this session; `logged` is a second ledger, never the claim set). */
        public static bool rearmFailure(string? uid, Exception e, RearmLedger claims, RearmLedger logged)
        {
            if (!rearmKeepsClaim(e))
            {
                claims.release(uid);
            }
            return logged.claim(uid);
        }

        /** The claim set behind TransferManager.claimRearm: thread-safe, ordinal ids, cleared with the outgoing transfers. */
        public sealed class RearmLedger
        {
            private readonly ConcurrentDictionary<string, byte> ids = new ConcurrentDictionary<string, byte>(StringComparer.Ordinal);

            public bool claim(string? uid)
            {
                return !string.IsNullOrEmpty(uid) && ids.TryAdd(uid, 0);
            }

            /** ★ #46 r1 (R3 m1): give an id back (a transient failure) — the next claim succeeds again. */
            public bool release(string? uid)
            {
                return !string.IsNullOrEmpty(uid) && ids.TryRemove(uid, out _);
            }

            public void clear()
            {
                ids.Clear();
            }

            public int count
            {
                get { return ids.Count; }
            }
        }
    }
}
