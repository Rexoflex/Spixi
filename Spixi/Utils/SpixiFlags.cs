/* ★ S16 (#1312 rule 1): the runtime flags for the larger S16 changes — the old path stays the fallback behind each one.
 * Read ONCE at start (App() constructor, right after the logger is up and before anything uses them). A dev toggle
 * (DevPage `ixian:devflash:<securepass|mediagate>:<0|1>`) stores the int preference; it acts at the NEXT start, and a
 * stored 0 acts ONLY while the "devMode" preference is on (S16PassRules.effectiveFlag; the S11ChatRules.effectiveContainer
 * precedent) — a user who leaves dev mode gets the defaults back. Both preferences go with the wipe (Preferences.Clear). */
using IXICore.Meta;
using Microsoft.Maui.Storage;
using System;

namespace SPIXI
{
    public static class SpixiFlags
    {
        public const string SecureWalletPassKey = "flagSecureWalletPass";   // int pref; absent = default (1)
        public const string MediaInputGateKey = "flagMediaInputGate";       // int pref; absent = default (1)
        public const string S17BridgeKey = "flagS17Bridge";                 // int pref; absent = default (1) — ★ S17 (#1338/#1339, P26)
        public const string S17MomentsKey = "flagS17Moments";               // int pref; absent = default (1) — ★ S17 F (#1340, P28)
        public const string S20FileSizeKey = "flagS20FileSize";             // int pref; absent = default (1) — ★ S20 E (#1376, P29)
        public const string S20GKey = "flagS20G";                           // int pref; absent = default (1) — ★ S20G F-1 + P0 (P30)
        public const string V1IxiHelpKey = "flagV1IxiHelp";                 // int pref; absent = default (1) — ★ V1A-M M1 (P31)
        public const string V1HintsKey = "flagV1Hints";                     // int pref; absent = default (1) — ★ V1A-M M2 (P31)
        public const string S20AddrHelpKey = "flagS20AddrHelp";             // int pref; absent = default (1) — ★ S20I (P32)
        public const string SafeAppIdKey = "flagSafeAppId";                 // int pref; absent = default (1) — ★ Safety S-2 (P33)
        public const string SafeStorageKey = "flagSafeStorage";             // int pref; absent = default (1) — ★ Safety S-1 (P33)
        public const string SafePickKey = "flagSafePick";                   // int pref; absent = default (1) — ★ Safety S-3 (P33)
        public const string NativeConfirmKey = "flagNativeConfirm";         // int pref; absent = default (1) — ★ Safety S-5 (P35)
        public const string HistoryLockKey = "flagHistoryLock";             // int pref; absent = default (1) — ★ Safety S-6 (P36)
        public const string WinAppMarkerKey = "flagWinAppMarker";           // int pref; absent = default (1) — ★ Safety O-02 (P37)
        public const string WarmOnIdleKey = "flagWarmOnIdle";               // int pref; absent = default (1) — ★ perfb1 P-12 (P38)
        public const string SpareRearmKey = "flagSpareRearm";               // int pref; absent = default (1) — ★ perfb1 P-11 switch 1 (P39)
        public const string SpareKeepShortSleepKey = "flagSpareKeepShortSleep";   // int pref; absent = default (1) — ★ perfb1 P-11 switch 2 (P40); ON by default since ★ fixb1 item 7
        public const string PhoneNoEmptyDetailKey = "flagPhoneNoEmptyDetail";     // int pref; absent = default (1) — ★ perfb1 P-13 (P41)
        public const string ConfirmSafeDefaultKey = "flagConfirmSafeDefault";     // int pref; absent = default (1) — ★ fixb1 item 1 (P50)
        public const string DividerHoverLineKey = "flagDividerHoverLine";         // int pref; absent = default (1) — ★ fixb1 item 4 (P51)
        public const string PayConfirmSafeDefaultKey = "flagPayConfirmSafeDefault";           // int pref; absent = default (1) — ★ fixb2 item 4
        public const string MiniAppConfirmSafeDefaultKey = "flagMiniAppConfirmSafeDefault";   // int pref; absent = default (1) — ★ fixb2 item 4
        /* ★ photo1a (Photo open 1a, #1478: one switch per change; DECISIONS #1715–#1734; packets P65–P68) */
        public const string PhotoMediaAfterPaintKey = "flagPhotoMediaAfterPaint";   // int pref; absent = default (1) — ★ photo1a PO-1 (P65)
        public const string PhotoFewerFileChecksKey = "flagPhotoFewerFileChecks";   // int pref; absent = default (1) — ★ photo1a PO-5 (P66)
        public const string PhotoThumbStoreKey = "flagPhotoThumbStore";             // int pref; absent = default (1) — ★ photo1a PO-3 (P67)
        public const string VoicePeaksStoreKey = "flagVoicePeaksStore";             // int pref; absent = default (1) — ★ photo1a PO-6 (P68)
        /* ★ defaultsb (Defaults batch, Damir's ruling 1750; #1478: one switch per change) */
        public const string DefaultAppLockOnKey = "flagDefaultAppLockOn";           // int pref; absent = default (1) — ★ defaultsb item 1
        public const string DefaultPayConfirmOnKey = "flagDefaultPayConfirmOn";     // int pref; absent = default (1) — ★ defaultsb item 3
        public const string LockDelayOneMinuteKey = "flagLockDelayOneMinute";       // int pref; absent = default (1) — ★ defaultsb item 2

        /** ★ perfb1: the four keys in PerfB1Rules.DevSwitchNames order (DevPage `ixian:devflash:<name>:<0|1>`). */
        public static readonly string[] PerfB1DevKeys = { WarmOnIdleKey, SpareRearmKey, SpareKeepShortSleepKey, PhoneNoEmptyDetailKey };

        /** L8: the wallet password lives in SecureStorage (WalletPassStore). OFF = the legacy plaintext preference. */
        public static bool SecureWalletPass { get; private set; } = true;

        /** F3/F4: the state gate on voicerec:start + pasteImage. OFF = exactly the old behaviour. */
        public static bool MediaInputGate { get; private set; } = true;

        /** ★ S17 (#1338 What's new · #1339 the About / Contributors bar ink, P26): the setWhatsNew push, the
         *  ixian:whatsnew:done + ixian:topsurface:* verbs and their caps. OFF = exactly the old behaviour (no push, no cap,
         *  the verbs are ignored, the page surface decides the bar ink). */
        public static bool S17Bridge { get; private set; } = true;

        /** ★ S17 F (#1340, P28): the Moment sheets — the `moments` cap, the setMoments / momentAnswer pushes, the
         *  ixian:moment:* verbs and the one-shot `ixian:openPrivacy` on a chat page. OFF = exactly the old behaviour. */
        public static bool S17Moments { get; private set; } = true;

        /** ★ S20 E (#1376, P29): addFile arg 20 = the file size in BOTH directions (S11MediaRules.fileSizeArg: the received
         *  header size, the outgoing transfer's size, one stat of the C#-resolved sent copy). OFF = offerSizeArg (received
         *  offers only — the old behaviour). */
        public static bool S20FileSize { get; private set; } = true;

        /** ★ S20G (P30): ONE flag for all the S20G C# — F-1 (opening Account closes the open conversation first, so a chat
         *  under Account never counts as displayed: HomePage.onSettings) and P0 (a restore keeps the contact list it
         *  replaces in a dated folder and asks first when the device still holds contacts: LaunchPage, RestoreMoves).
         *  OFF = exactly the old behaviour. (The delete-account wipe of the kept folders is NOT behind it: privacy.) */
        public static bool S20G { get; private set; } = true;

        /** ★ V1A-M M1 (P31): the "What is IXI?" moment — the `ixihelp` cap on home (with S17Moments) and the
         *  `ixian:moment:ixihelp` ask (V1AMRules). OFF = no cap; the ask is ignored (nothing answered, nothing logged). */
        public static bool V1IxiHelp { get; private set; } = true;

        /** ★ V1A-M M2 (P31): the word tips — the `wordtips` cap on home and `ixian:hint:done:<word id>` (V1AMRules,
         *  S11HintRules.WordIds). OFF = no cap; every word-id hint verb is ignored. */
        public static bool V1Hints { get; private set; } = true;

        /** ★ S20I (P32): the "How people find you" moment — the `addrhelp` cap on Settings (with S17Moments) and the
         *  `ixian:moment:addrhelp` ask (S20IRules). OFF = no cap; the ask is ignored (nothing answered, nothing logged). */
        public static bool S20AddrHelp { get; private set; } = true;

        /* ★ Session Safety (#1312 rule 1, SafetyRules.cs, docs/safety-mechanisms.md): one flag per fix; OFF = the old path.
         * S-4 (the Android share folders) has no flag: provider_paths.xml is read at install. */
        /** S-2 (P33): a mini-app id must pass SafetyRules.isSafeAppId (MiniApp ctor → "" = refused everywhere an empty id is);
         *  an install deletes only a folder it created. OFF = the id as written, the old error-path delete. */
        public static bool SafeAppId { get; private set; } = true;
        /** S-1 (P33): a storage table must pass SafetyRules.isSafeTableName and stay inside the app's folder. OFF = as before. */
        public static bool SafeStorage { get; private set; } = true;
        /** S-3 (P33): Add app names its temp file in C#; the Android picker keeps the base name only. OFF = as before. */
        public static bool SafePick { get; private set; } = true;
        /** S-5 (P35): a native OK / Cancel before removecontact · removehistory · leave · kick · ban on chat and chat info
         *  (Safety Dials q1 = A; home keeps its page sheet). OFF = they act at once, as before. */
        public static bool NativeConfirm { get; private set; } = true;
        /** S-6 (P36): ixian:deleteh and ixian:deleted wait for LockPage(true) success, as ixian:deletea does. OFF = at once. */
        public static bool HistoryLock { get; private set; } = true;
        /** O-02 (P37): the Windows WebView handler reads ClassId="miniapp" and drops privileges for the mini app (DevTools,
         *  permission requests, new windows). OFF = the mini app is treated like every other WebView, as before. */
        public static bool WinAppMarker { get; private set; } = true;

        /* ★ perfb1 (Speed batch 1a, #1312 rule 1 / #1478, PerfB1Rules.cs): one flag per change; OFF = the old path. */
        /** P-12 (P38): the spare warm waits for a quiet time with no touch (WarmIdleRules). OFF = exactly the old behaviour. */
        public static bool WarmOnIdle { get; private set; } = true;
        /** P-11 switch 1 (P39): the spare chat page is armed again after a drop. OFF = exactly the old behaviour. */
        public static bool SpareRearm { get; private set; } = true;
        /** P-11 switch 2 (P40): the spare chat page is kept over a short sleep (Android). ★ fixb1 item 7: ON by default —
         *  absent = ON, a stored 0 turns it off only in dev mode (S16PassRules.effectiveFlag, the rule of the other three).
         *  The start value stays `false`: before init runs, the old path. OFF = exactly the old behaviour. */
        public static bool SpareKeepShortSleep { get; private set; } = false;
        /** P-13 (P41): the phone "no empty detail" change. OFF = exactly the old behaviour. */
        public static bool PhoneNoEmptyDetail { get; private set; } = true;

        /* ★ fixb1 (Fix batch 1, #1312 rule 1 / #1478, FixB1Rules.cs): one flag per change; OFF = the old path. */
        /** Item 1 (P50), Windows only: SConfirm shows its own ContentDialog with Cancel as the default (Close) button, so
         *  Enter cancels; only the Primary (OK) result is OK. OFF = exactly the old behaviour (MAUI DisplayAlert). */
        public static bool ConfirmSafeDefault { get; private set; } = true;
        /** Item 4 (P51), Windows + Mac only: the 2 px accent line in the pane divider grip on hover and for the whole drag.
         *  OFF = no line, exactly the old behaviour. */
        public static bool DividerHoverLine { get; private set; } = true;

        /* ★ fixb2 (Fix batch 2, #1312 rule 1 / #1478, FixB2Rules.cs): one flag per call-site family. Both ACT only on Windows
         * (only `#if WINDOWS` code reads them); init reads them and writes their [FLAGS] line on EVERY platform — on iPhone,
         * Mac and Android the values change nothing. The safe dialog needs TWO things on: the call site's own switch AND
         * NativeConfirm (FixB2Rules.useSafeDialog: with the alert drop of Session Safety off, nothing keeps a MAUI alert
         * away from the dialog). Either one OFF = the old path. */
        /** Item 4, acts on Windows only: the payment send confirm (SPayments.confirmAndAuth) is SConfirm's safe-default
         *  dialog — Cancel is the default (Close) button, so Enter cancels; only the Primary (send) result is yes. ON takes
         *  effect only while NativeConfirm is on too. OFF — this switch or NativeConfirm — = exactly the old behaviour (MAUI
         *  DisplayAlert through displaySpixiAlert). */
        public static bool PayConfirmSafeDefault { get; private set; } = true;
        /** Item 4, acts on Windows only: the three mini-app confirms (MiniAppPage.handleAction) the same way, under the same
         *  two conditions. OFF — this switch or NativeConfirm — = exactly the old behaviour (MAUI DisplayAlert through
         *  displaySpixiAlert). */
        public static bool MiniAppConfirmSafeDefault { get; private set; } = true;
        /* ★ photo1a (Photo open 1a, PhotoOpenRules.cs / ChatMediaStore.cs): one flag per change; OFF = the old path, byte
         * for byte. The start value is `false` (before init runs: the old path); init sets the effective value. */
        /** PO-1 (P65): the thumbnail, waveform and offer-preview jobs of a chat open start at the shell's paint signal (or the
         *  present's 400 ms backstop), not at messagesDone; each push is built off the main thread. OFF = exactly the old path. */
        public static bool PhotoMediaAfterPaint { get; private set; } = false;
        /** PO-5 (P66): one file-check pass per file row, the 1:1 avatar resolved once per load, the preferences read once per
         *  load; the arguments that reach the shell are byte-identical. OFF = exactly the old path. */
        public static bool PhotoFewerFileChecks { get; private set; } = false;
        /** PO-3 (P67): the 320 px chat thumbnail is kept in the app cache (ChatMediaStore) and the memory cache is a true
         *  LRU of 128 entries. Android only (ChatMediaStore.platformOn). OFF = exactly the old path. */
        public static bool PhotoThumbStore { get; private set; } = false;
        /** PO-6 (P68): a voice message's duration + 40 peaks are kept in the app cache (ChatMediaStore). Android only.
         *  OFF = exactly the old path. */
        public static bool VoicePeaksStore { get; private set; } = false;
        /* ★ defaultsb (Defaults batch, ruling 1750, DefaultsRules.cs): one flag per change; OFF = the old path. The start value
         * is `false` (before init runs: the old path); init sets the effective value. No Developer-screen control. An
         * existing account is not touched by any of the three: no reader of `lockenabled` / `paymentauth` changes. */
        /** Item 1: a NEW account (LaunchPage: the create body, applyRestorePrefs) is written with App lock On
         *  (`lockenabled = true`). OFF = exactly the old path: the key is removed there (absent = Off). */
        public static bool DefaultAppLockOn { get; private set; } = false;
        /** Item 3: a NEW account is written with Confirm payments On (`paymentauth = true`) where
         *  SPayments.paymentAuthSupported() (not on Windows). OFF = exactly the old path: nothing is written. */
        public static bool DefaultPayConfirmOn { get; private set; } = false;
        /** Item 2: the no-auth window of App.OnResume is 60 s (DefaultsRules.withinGrace). It only says whether a lock that
         *  is already on screen needs an authentication; nothing unlocks by it. OFF = exactly the old path: 5 s. */
        public static bool LockDelayOneMinute { get; private set; } = false;

        /* ★ photo1b (Chat shell batch, #1641 / #1742, contract-photo1b § 4): five switches for the CHAT SHELL's new paths. Each
         * one adds ITS cap word to the chat page's setCaps text (SingleChatPage, one line); the shell reads bridge.cap('<word>')
         * at the moment it decides, and a cap absent = exactly the OLD path. Same rule as every switch above: absent = ON, a
         * stored 0 acts ONLY while dev mode is on (S16PassRules.effectiveFlag), read ONCE (readPhoto1b, the last call of init).
         * The start value of each property is `false` (the SpareKeepShortSleep pattern): before init has run, the chat page
         * gets no cap = the old path; init then sets the real value. NO dev-page toggle (none of Fix batch 2's switches has
         * one either): a stored 0 is set the way the others are, e.g. by a dev build writing the preference. The five keys are
         * the ONLY new storage; nothing else is logged but the one [FLAGS] photo1b line (fixed words + 0|1). */
        public const string PhotoTileLiteKey = "flagPhotoTileLite";                 // int pref; absent = default (1) — ★ photo1b PO-4 (cap photoTileLite)
        public const string VoiceWaveLiteKey = "flagVoiceWaveLite";                 // int pref; absent = default (1) — ★ photo1b PO-6 shell (cap voiceWaveLite)
        public const string HistoryInsertOnlyKey = "flagHistoryInsertOnly";         // int pref; absent = default (1) — ★ photo1b HV-1 (cap olderInsert)
        public const string HistoryAnchorOneTaskKey = "flagHistoryAnchorOneTask";   // int pref; absent = default (1) — ★ photo1b HV-3 (cap olderAnchor1)
        public const string FadeFromBandKey = "flagFadeFromBand";                   // int pref; absent = default (1) — ★ photo1b HV-4 (cap fadeBand)

        /** PO-4: the lighter photo tile (cap `photoTileLite`). OFF = exactly the old tile. Start value false = the old path until init. */
        public static bool PhotoTileLite { get; private set; } = false;
        /** PO-6 (shell half): the lighter voice row (cap `voiceWaveLite`). OFF = exactly the old row. Start value false until init. */
        public static bool VoiceWaveLite { get; private set; } = false;
        /** HV-1: an older page is inserted, not the whole log rebuilt (cap `olderInsert`). OFF = the full render. Start value false until init. */
        public static bool HistoryInsertOnly { get; private set; } = false;
        /** HV-3: the scroll anchor is taken and restored in one task (cap `olderAnchor1`). OFF = the old two-push anchor. Start value false until init. */
        public static bool HistoryAnchorOneTask { get; private set; } = false;
        /** HV-4: the composer fade pass walks the visible band only (cap `fadeBand`). OFF = the old full walk. Start value false until init. */
        public static bool FadeFromBand { get; private set; } = false;

        /** The cap words of the five switches, in the ORDER of the chat page's text (the same order as photo1bFlagsLine). Private: the tests reach the words through photo1bChatCaps. */
        private static readonly string[] Photo1bCapWords = { "photoTileLite", "voiceWaveLite", "olderInsert", "olderAnchor1", "fadeBand" };

        /** The one start line: `[FLAGS] photo1b tilelite=<0|1> voicelite=<0|1> olderinsert=<0|1> olderanchor=<0|1> fadeband=<0|1>`
         *  (fixed words and 0|1 only; written on EVERY build — it is the BUILD row of the walk). */
        public static string photo1bFlagsLine(bool tileLite, bool voiceLite, bool olderInsert, bool olderAnchor, bool fadeBand)
        {
            return "[FLAGS] photo1b tilelite=" + (tileLite ? "1" : "0") + " voicelite=" + (voiceLite ? "1" : "0")
                + " olderinsert=" + (olderInsert ? "1" : "0") + " olderanchor=" + (olderAnchor ? "1" : "0")
                + " fadeband=" + (fadeBand ? "1" : "0");
        }

        /** The comma-led cap text of the ON switches, in the fixed order `,photoTileLite,voiceWaveLite,olderInsert,olderAnchor1,fadeBand`;
         *  a switch that is OFF drops only its own word; all OFF = "" (the chat page then adds nothing = the old paths). */
        public static string photo1bChatCaps(bool tileLite, bool voiceLite, bool olderInsert, bool olderAnchor, bool fadeBand)
        {
            return (tileLite ? "," + Photo1bCapWords[0] : "") + (voiceLite ? "," + Photo1bCapWords[1] : "")
                + (olderInsert ? "," + Photo1bCapWords[2] : "") + (olderAnchor ? "," + Photo1bCapWords[3] : "")
                + (fadeBand ? "," + Photo1bCapWords[4] : "");
        }

        /** The caps text SingleChatPage appends (`caps += SpixiFlags.Photo1bChatCaps;`): the five switches as they stand now. */
        public static string Photo1bChatCaps => photo1bChatCaps(PhotoTileLite, VoiceWaveLite, HistoryInsertOnly, HistoryAnchorOneTask, FadeFromBand);

        /** Read ONCE, the last call of init(): the five int preferences, absent = ON, a stored 0 acts only in dev mode. A read that
         *  throws keeps the defaults (all ON — the flags only ever turn OFF on purpose); it logs NOTHING of its own: no warn,
         *  no error. When the preference store fails, init's own read usually threw first and its one warn is the only warn; if
         *  only THIS read threw, nothing says so but the [FLAGS] photo1b line (all ON). This block writes that one line and no other. */
        private static void readPhoto1b()
        {
            bool dev = false;
            int tl = 1, vl = 1, oi = 1, oa = 1, fb = 1;
            try
            {
                dev = Preferences.Default.Get("devMode", false);
                tl = Preferences.Default.Get(PhotoTileLiteKey, 1);
                vl = Preferences.Default.Get(VoiceWaveLiteKey, 1);
                oi = Preferences.Default.Get(HistoryInsertOnlyKey, 1);
                oa = Preferences.Default.Get(HistoryAnchorOneTaskKey, 1);
                fb = Preferences.Default.Get(FadeFromBandKey, 1);
            }
            catch (Exception)
            {
                dev = false;
                tl = vl = oi = oa = fb = 1;
            }
            PhotoTileLite = S16PassRules.effectiveFlag(dev, tl);
            VoiceWaveLite = S16PassRules.effectiveFlag(dev, vl);
            HistoryInsertOnly = S16PassRules.effectiveFlag(dev, oi);
            HistoryAnchorOneTask = S16PassRules.effectiveFlag(dev, oa);
            FadeFromBand = S16PassRules.effectiveFlag(dev, fb);
            Logging.info(photo1bFlagsLine(PhotoTileLite, VoiceWaveLite, HistoryInsertOnly, HistoryAnchorOneTask, FadeFromBand));
        }

        /* ★ fixb4 (Fix batch 4, items 3 + 4; ruling 1750, PageDefaultsRules.cs; contract-fixb4 § 3): one switch per default, OFF =
         * the old path (no push, the WebView store as the create / restore left it). Same rule as the blocks above: absent = ON, a
         * stored 0 acts ONLY in dev mode (S16PassRules.effectiveFlag), read ONCE (readFixb4, right after readPhoto1b in init), start
         * value `false` until init. No Developer-screen control. An existing account is not touched: only the three new-account
         * sites of LaunchPage read these two. */
        public const string DefaultMediaTapKey = "flagDefaultMediaTap";             // int pref; absent = default (1) — ★ fixb4 item 3
        public const string DefaultListCompactKey = "flagDefaultListCompact";       // int pref; absent = default (1) — ★ fixb4 item 4

        /** Item 3: a NEW account's launch shell writes `spixi.media.autoload = 'off'` (P1 Off = tap to load). OFF = the old path. */
        public static bool DefaultMediaTapToLoad { get; private set; } = false;
        /** Item 4: a NEW account on the desktop writes `spixi.chat.listdensity = 'compact'` (A9 Compact). OFF = the old path. */
        public static bool DefaultListCompact { get; private set; } = false;

        /** Read ONCE, right after readPhoto1b: the two int preferences, absent = ON, a stored 0 acts only in dev mode. A read that
         *  throws keeps the defaults (both ON) and logs nothing of its own; the one [FLAGS] fixb4 line is the block's only line. */
        private static void readFixb4()
        {
            bool dev = false;
            int mt = 1, lc = 1;
            try
            {
                dev = Preferences.Default.Get("devMode", false);
                mt = Preferences.Default.Get(DefaultMediaTapKey, 1);
                lc = Preferences.Default.Get(DefaultListCompactKey, 1);
            }
            catch (Exception)
            {
                dev = false;
                mt = lc = 1;
            }
            DefaultMediaTapToLoad = S16PassRules.effectiveFlag(dev, mt);
            DefaultListCompact = S16PassRules.effectiveFlag(dev, lc);
            Logging.info(PageDefaultsRules.flagsLine(DefaultMediaTapToLoad, DefaultListCompact));
        }

        /** ★ perfb1 #46 r1 B-1 / S-5: leaving dev mode (HomePage `ixian:disableDevMode`, which also removes the four
         *  PerfB1DevKeys) turns SpareKeepShortSleep off in THIS process — it falls to the old path (the drop at sleep) until
         *  the next start. ★ fixb1 item 7: the switch is ON by default now; leaving dev mode removes the keys, so the NEXT
         *  start has it ON again (the default), and in this process it stays on the old path (fail to the old path). The
         *  other three ON flags need nothing: a stored 0 acts only in dev mode at the NEXT start (S16PassRules.effectiveFlag)
         *  and the keys are removed, so the next start has the defaults; until then a flag that is off only keeps the old
         *  path. Two callers: (1) that HomePage
         *  branch, called BEFORE its dropSpareChat("devmode"), so a kept spare goes with the drop; (2) the account wipe
         *  (SettingsPage.wipeEverything), right after the preference wipe and WalletPassStore.clear() — there a spare was already
         *  dropped at the wipe's first step with the word `stop` (IxianHandler.shutdown() → HomePage.stop() → dropSpareChat("stop")). */
        public static void leaveDevMode()
        {
            SpareKeepShortSleep = false;
        }

        public static void init()
        {
            bool dev = false;
            int sp = 1, mg = 1, sb = 1, sm = 1, fs = 1, sg = 1;
            int vi = 1, vh = 1;   // ★ V1A-M M1 / M2
            int ah = 1;           // ★ S20I
            int xi = 1, xs = 1, xp = 1, xc = 1, xh = 1, xw = 1;   // ★ Session Safety
            int pw = 1, pr = 1, pk = 1, pn = 1;   // ★ perfb1 (pk: absent = 1 since ★ fixb1 item 7)
            int fc = 1, fd = 1;                   // ★ fixb1 items 1 / 4
            int fp = 1, fm = 1;                   // ★ fixb2 item 4
            int qa = 1, qf = 1, qt = 1, qv = 1;   // ★ photo1a PO-1 / PO-5 / PO-3 / PO-6
            int da = 1, dp = 1, dl = 1;           // ★ defaultsb items 1 / 3 / 2
            try
            {
                dev = Preferences.Default.Get("devMode", false);
                sp = Preferences.Default.Get(SecureWalletPassKey, 1);
                mg = Preferences.Default.Get(MediaInputGateKey, 1);
                sb = Preferences.Default.Get(S17BridgeKey, 1);
                sm = Preferences.Default.Get(S17MomentsKey, 1);
                fs = Preferences.Default.Get(S20FileSizeKey, 1);
                sg = Preferences.Default.Get(S20GKey, 1);
                vi = Preferences.Default.Get(V1IxiHelpKey, 1);
                vh = Preferences.Default.Get(V1HintsKey, 1);
                ah = Preferences.Default.Get(S20AddrHelpKey, 1);
                xi = Preferences.Default.Get(SafeAppIdKey, 1);
                xs = Preferences.Default.Get(SafeStorageKey, 1);
                xp = Preferences.Default.Get(SafePickKey, 1);
                xc = Preferences.Default.Get(NativeConfirmKey, 1);
                xh = Preferences.Default.Get(HistoryLockKey, 1);
                xw = Preferences.Default.Get(WinAppMarkerKey, 1);
                pw = Preferences.Default.Get(WarmOnIdleKey, 1);
                pr = Preferences.Default.Get(SpareRearmKey, 1);
                pk = Preferences.Default.Get(SpareKeepShortSleepKey, 1);
                pn = Preferences.Default.Get(PhoneNoEmptyDetailKey, 1);
                fc = Preferences.Default.Get(ConfirmSafeDefaultKey, 1);
                fd = Preferences.Default.Get(DividerHoverLineKey, 1);
                fp = Preferences.Default.Get(PayConfirmSafeDefaultKey, 1);
                fm = Preferences.Default.Get(MiniAppConfirmSafeDefaultKey, 1);
                qa = Preferences.Default.Get(PhotoMediaAfterPaintKey, 1);
                qf = Preferences.Default.Get(PhotoFewerFileChecksKey, 1);
                qt = Preferences.Default.Get(PhotoThumbStoreKey, 1);
                qv = Preferences.Default.Get(VoicePeaksStoreKey, 1);
                da = Preferences.Default.Get(DefaultAppLockOnKey, 1);
                dp = Preferences.Default.Get(DefaultPayConfirmOnKey, 1);
                dl = Preferences.Default.Get(LockDelayOneMinuteKey, 1);
            }
            catch (Exception ex)
            {
                // A preference read that throws keeps the defaults (ON) — the flags only ever turn OFF on purpose.
                dev = false;
                Logging.warn("[FLAGS] read failed (" + ex.GetType().Name + ")");
            }
            SecureWalletPass = S16PassRules.effectiveFlag(dev, sp);
            MediaInputGate = S16PassRules.effectiveFlag(dev, mg);
            Logging.info(S16PassRules.flagsLine(SecureWalletPass, MediaInputGate));
            S17Bridge = S16PassRules.effectiveFlag(dev, sb);
            Logging.info(S17Rules.flagLine(S17Bridge));
            S17Moments = S16PassRules.effectiveFlag(dev, sm);
            Logging.info(S17MomentRules.flagLine(S17Moments));
            S20FileSize = S16PassRules.effectiveFlag(dev, fs);
            Logging.info(S11MediaRules.fileSizeFlagLine(S20FileSize));
            S20G = S16PassRules.effectiveFlag(dev, sg);
            Logging.info(S20GRules.flagLine(S20G));
            V1IxiHelp = S16PassRules.effectiveFlag(dev, vi);
            Logging.info(V1AMRules.flagLineIxiHelp(V1IxiHelp));
            V1Hints = S16PassRules.effectiveFlag(dev, vh);
            Logging.info(V1AMRules.flagLineHints(V1Hints));
            S20AddrHelp = S16PassRules.effectiveFlag(dev, ah);
            Logging.info(S20IRules.flagLineAddrHelp(S20AddrHelp));
            SafeAppId = S16PassRules.effectiveFlag(dev, xi);
            SafeStorage = S16PassRules.effectiveFlag(dev, xs);
            SafePick = S16PassRules.effectiveFlag(dev, xp);
            NativeConfirm = S16PassRules.effectiveFlag(dev, xc);
            HistoryLock = S16PassRules.effectiveFlag(dev, xh);
            WinAppMarker = S16PassRules.effectiveFlag(dev, xw);
            Logging.info(SafetyRules.flagsLine(SafeAppId, SafeStorage, SafePick, NativeConfirm, HistoryLock, WinAppMarker));
            WarmOnIdle = S16PassRules.effectiveFlag(dev, pw);
            SpareRearm = S16PassRules.effectiveFlag(dev, pr);
            SpareKeepShortSleep = S16PassRules.effectiveFlag(dev, pk);
            PhoneNoEmptyDetail = S16PassRules.effectiveFlag(dev, pn);
            Logging.info(PerfB1Rules.flagsLine(WarmOnIdle, SpareRearm, SpareKeepShortSleep, PhoneNoEmptyDetail));
            ConfirmSafeDefault = S16PassRules.effectiveFlag(dev, fc);
            DividerHoverLine = S16PassRules.effectiveFlag(dev, fd);
            Logging.info(FixB1Rules.flagsLine(ConfirmSafeDefault, DividerHoverLine));
            PayConfirmSafeDefault = S16PassRules.effectiveFlag(dev, fp);
            MiniAppConfirmSafeDefault = S16PassRules.effectiveFlag(dev, fm);
            Logging.info(FixB2Rules.flagsLine(PayConfirmSafeDefault, MiniAppConfirmSafeDefault));
            PhotoMediaAfterPaint = S16PassRules.effectiveFlag(dev, qa);
            PhotoFewerFileChecks = S16PassRules.effectiveFlag(dev, qf);
            PhotoThumbStore = S16PassRules.effectiveFlag(dev, qt) && ChatMediaStore.platformOn;
            VoicePeaksStore = S16PassRules.effectiveFlag(dev, qv) && ChatMediaStore.platformOn;
            Logging.info(PhotoOpenRules.flagsLine(PhotoMediaAfterPaint, PhotoFewerFileChecks, PhotoThumbStore, VoicePeaksStore));
            DefaultAppLockOn = S16PassRules.effectiveFlag(dev, da);
            DefaultPayConfirmOn = S16PassRules.effectiveFlag(dev, dp);
            LockDelayOneMinute = S16PassRules.effectiveFlag(dev, dl);
            Logging.info(DefaultsRules.flagsLine(DefaultAppLockOn, DefaultPayConfirmOn, LockDelayOneMinute));
            readPhoto1b();   // ★ photo1b (contract-photo1b § 4): the five chat-shell switches, their own read + [FLAGS] line
            readFixb4();   // ★ fixb4 (contract-fixb4 § 3): the two new-account page defaults, their own read + [FLAGS] line
        }

#if SPIXI_DEV_COEXIST
        /** ★ perfb1toggle (#1595, dev build only): the adb walk's launch intent extra (PerfB1ExtraRules.ExtraName; MainActivity
         *  reads it in OnCreate and OnNewIntent). Dev mode on AT THIS MOMENT and the exact CANON → the four ints are stored
         *  through PerfB1DevKeys and ONE fixed line is logged; anything else stores and logs nothing. Store only: the switches
         *  act at the NEXT start (init runs once); no flag of this process changes. Fail closed: a throw stores no more and
         *  logs nothing (the launcher activity is exported — the value comes from any app on the phone). */
        internal static bool storePerfB1Extra(string? value)
        {
            try
            {
                bool dev = Preferences.Default.Get("devMode", false);
                int[]? v = PerfB1ExtraRules.parse(dev, value);
                if (v == null || v.Length != PerfB1DevKeys.Length)
                {
                    return false;
                }
                for (int i = 0; i < PerfB1DevKeys.Length; i++)
                {
                    Preferences.Default.Set(PerfB1DevKeys[i], v[i]);
                }
                Logging.info(PerfB1ExtraRules.StoredLine);
                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }
#endif
    }

    /* ★ histcs (History C#, DECISIONS #1860–#1874, contract-histcs § 2) — mechanisms docs/histcs-mechanisms.md. P-28 (an
     * older page is read and built on a pool thread, switch LoadMoreOffUi) and HV-5 (the first older page holds 50 rows,
     * switch FirstOlderPage50), one switch each (#1478); both OFF = SingleChatPage.onLoadMore, byte for byte. The pure
     * rules of the path live here too, so the csh harness runs them over this file (no MAUI type, no Core type: System,
     * System.Threading and System.Globalization only). Log text: fixed words + integers only (the handover-gate log rule). */
    public static class HistcsFlags
    {
        public const string LoadMoreOffUiKey = "flagLoadMoreOffUi";        // int pref; absent = default (1) — P-28 (P90)
        public const string FirstOlderPage50Key = "flagFirstOlderPage50";  // int pref; absent = default (1) — HV-5 (P91)
        /** P-28: an older page is read and built on a pool thread. OFF = onLoadMore on the UI thread (the old path). */
        public static bool LoadMoreOffUi { get { ensureRead(); return offUi; } }
        /** HV-5: the first older page holds 50 rows (no step over 100). OFF = the old step. */
        public static bool FirstOlderPage50 { get { ensureRead(); return firstPage50; } }
        private static bool offUi = false;
        private static bool firstPage50 = false;
        private static int readDone = 0;                     // 1 once read() has set the two values
        private static readonly object readLock = new object();
        private static int flagsLineTaken = 0;   // 1 once the [FLAGS] histcs line was handed out (takeFlagsLine)

        /* ★ histcs: read LAZILY, once per process, at the first use (the first chat load) — NOT from SpixiFlags.init(): init's
         * last statements are held by the pins and csh tests of six other batches, and a parallel batch appends there too. The
         * value cannot change inside the process afterwards (a stored 0 acts at the next start, as every other switch). */
        internal static void ensureRead()
        {
            if (System.Threading.Volatile.Read(ref readDone) != 0)
            {
                return;
            }
            lock (readLock)
            {
                if (readDone == 0)
                {
                    read();
                }
            }
        }

        /** The read (ensureRead calls it once; the csh tests call it again over a changed store): absent = ON; a stored 0 acts
         *  only while devMode is on (S16PassRules.effectiveFlag); a throw keeps both ON. Logs NOTHING. */
        internal static void read()
        {
            // ★ histcs HV-0: no log line on any path (the [FLAGS] histcs line is written once, at the first load-more).
            bool dev = false;
            int lo = 1, fp = 1;
            try
            {
                dev = Preferences.Default.Get("devMode", false);
                lo = Preferences.Default.Get(LoadMoreOffUiKey, 1);
                fp = Preferences.Default.Get(FirstOlderPage50Key, 1);
            }
            catch (Exception)
            {
                dev = false;   // a store that throws keeps the defaults (ON): the flags only ever turn OFF on purpose
                lo = fp = 1;
            }
            offUi = S16PassRules.effectiveFlag(dev, lo);
            firstPage50 = S16PassRules.effectiveFlag(dev, fp);
            System.Threading.Volatile.Write(ref readDone, 1);
        }

        /** `[FLAGS] histcs loadmoreoffui=<0|1> firstpage50=<0|1>` — fixed words and 0|1 only. */
        public static string flagsLine(bool offUi, bool firstPage50)
        {
            return "[FLAGS] histcs loadmoreoffui=" + (offUi ? "1" : "0") + " firstpage50=" + (firstPage50 ? "1" : "0");
        }

        /** True exactly once per process (Interlocked): the caller then logs flagsLine(...) (every build). */
        internal static bool takeFlagsLine()
        {
            return System.Threading.Interlocked.Exchange(ref flagsLineTaken, 1) == 0;
        }
    }

    /** ★ histcs P-28: why an older page pushed nothing (None = it is kept). */
    internal enum OlderDrop { None = 0, Busy, Closed, Channel, Load, Anchor }

    internal static class HistoryOlderRules
    {
        public const string LoadMoreInBody = "chat loadmore in";

        private static string n(long v)
        {
            return (v < 0 ? 0 : v).ToString(System.Globalization.CultureInfo.InvariantCulture);
        }

        /** `chat older read passes=<p> window=<w> ms=<m> flush=<f>` (negative → 0, invariant digits). */
        public static string olderReadBody(int passes, int window, long ms, long flushMs)
        {
            return "chat older read passes=" + n(passes) + " window=" + n(window) + " ms=" + n(ms) + " flush=" + n(flushMs);
        }

        /** `chat older push n=<n> json=<j> build=<b>` (negative → 0). */
        public static string olderPushBody(int rows, int jsonLength, long buildMs)
        {
            return "chat older push n=" + n(rows) + " json=" + n(jsonLength) + " build=" + n(buildMs);
        }

        /** `chat older drop why=<busy|closed|channel|load|anchor>`; None → "chat older drop why=none" is NEVER asked (callers log only a drop). */
        public static string olderDropBody(OlderDrop why)
        {
            string w = why switch
            {
                OlderDrop.Busy => "busy",
                OlderDrop.Closed => "closed",
                OlderDrop.Channel => "channel",
                OlderDrop.Load => "load",
                OlderDrop.Anchor => "anchor",
                _ => "none",   // a fixed word for any other value: the line stays in the grammar
            };
            return "chat older drop why=" + w;
        }

        /** The window after one load-more: show + step; ONLY when firstPage50 is false, a result of exactly 100 steps once more
         *  (+ step) — the base onLoadMore's arithmetic, unchanged, when false. */
        public static uint nextShow(uint show, uint step, bool firstPage50)
        {
            // ★ histcs HV-5: loadMessages never asks Core for 100 (window = want + 1, and its loop steps over 100) — the step
            // only made the first older page 100 rows (mechanisms § 6). OFF keeps it.
            uint r = show + step;
            if (!firstPage50 && r == 100)
            {
                r += step;
            }
            return r;
        }

        /** True when either switch is on (loadMoreIn takes the new path); both OFF = onLoadMore, the old path. */
        public static bool usesNewPath(bool offUi, bool firstPage50)
        {
            return offUi || firstPage50;
        }

        /** The drop rule, in this order: disposed or !sameDoc or !sameChat → Closed; !sameChannel → Channel;
         *  !noLoadSince or !noneInFlight → Load; !sameAnchor → Anchor; else None (keep). */
        public static OlderDrop decide(bool disposed, bool sameDoc, bool sameChat, bool sameChannel, bool noLoadSince, bool noneInFlight, bool sameAnchor)
        {
            if (disposed || !sameDoc || !sameChat)
            {
                return OlderDrop.Closed;
            }
            if (!sameChannel)
            {
                return OlderDrop.Channel;
            }
            if (!noLoadSince || !noneInFlight)
            {
                return OlderDrop.Load;   // ★ histcs P-28: another load's clearMessages would wipe or double the older rows
            }
            if (!sameAnchor)
            {
                return OlderDrop.Anchor;   // a load in flight at the request ended and handed the shell another oldest row
            }
            return OlderDrop.None;
        }

        /** Runs `body` through `schedule` (Task.Run in the app) with the busy guard ALREADY entered by the caller WITH `owner`:
         *  body's throw → onFail(e); then after() (its throw swallowed); then busy.leave(owner) — on every path. A throw of
         *  schedule itself → busy.leave(owner), onFail(e), returns false. Returns true when scheduled. */
        public static bool schedule(OlderBusy busy, object owner, Action<Action> schedule, Action body, Action<Exception> onFail, Action after)
        {
            // ★ histcs #46 r1 (S-3): every leave names its owner — the page may have freed the guard already at its pushes
            // (olderPushed), and a NEWER page that entered since must not be freed by this page's final leave.
            // ★ histcs P-28: the guard frees on EVERY path (a guard left busy kills load-more for the page's life), and only
            // after the job has ended. A throw of onFail is swallowed too: nothing escapes onto the pool or the UI thread.
            Action run = () =>
            {
                try
                {
                    body();
                }
                catch (Exception e)
                {
                    try
                    {
                        onFail(e);
                    }
                    catch (Exception)
                    {
                    }
                }
                finally
                {
                    try
                    {
                        after();
                    }
                    catch (Exception)
                    {
                    }
                    busy.leave(owner);
                }
            };
            try
            {
                schedule(run);
                return true;
            }
            catch (Exception e)
            {
                busy.leave(owner);
                try
                {
                    onFail(e);
                }
                catch (Exception)
                {
                }
                return false;
            }
        }
    }

    /** The busy guard: one older page at a time. Interlocked; never blocks. ★ histcs #46 r1 (S-3): OWNER-aware — a page frees it
     *  as soon as its pushes are out (the shell's next request may start while the page's media tail runs), and a stale leave
     *  of that page (its task's final leave) never frees a NEWER owner. */
    internal sealed class OlderBusy
    {
        private object? owner = null;   // null = free; else the token of the older page that runs

        public bool tryEnter(object owner)   // null → owner; false when held
        {
            return System.Threading.Interlocked.CompareExchange(ref this.owner, owner, null) == null;
        }

        public void leave(object owner)      // owner → null; a leave with any other token changes nothing (idempotent)
        {
            System.Threading.Interlocked.CompareExchange(ref this.owner, null, owner);
        }

        public bool held
        {
            get { return System.Threading.Volatile.Read(ref owner) != null; }
        }
    }

    /** The push gate of one chat page (mechanisms § 4). */
    internal sealed class OlderPushGate
    {
        /* ★ histcs P-28: `started` / `finished` count every OTHER loadMessages (not the older page's own). The older page holds
         * the gate from its check to its last push, so another load starts wholly before its check (→ drop) or wholly after
         * its pushes (its clearMessages wipes and re-draws). Lock order: Core's list lock → gate; nothing waits for the UI
         * thread under it. */
        private readonly object gate = new object();
        private long started = 0;
        private long finished = 0;

        /** A snapshot of the counters, taken at the request (UI thread). */
        public readonly struct Ticket
        {
            public readonly long started0;

            public Ticket(long started0)
            {
                this.started0 = started0;
            }
        }

        public Ticket ticket()
        {
            lock (gate)
            {
                return new Ticket(started);
            }
        }

        /** Every OTHER loadMessages: on = false → null (nothing counted, the switch-OFF path). Else started++ now (under the
         *  gate) and a disposable whose FIRST Dispose does finished++ (under the gate); a second Dispose does nothing. */
        public IDisposable? beginOther(bool on)
        {
            if (!on)
            {
                return null;
            }
            lock (gate)
            {
                started++;
            }
            return new OtherLoad(this);
        }

        private sealed class OtherLoad : IDisposable
        {
            private OlderPushGate? owner;

            public OtherLoad(OlderPushGate owner)
            {
                this.owner = owner;
            }

            public void Dispose()
            {
                OlderPushGate? g = System.Threading.Interlocked.Exchange(ref owner, null);   // the FIRST Dispose only
                if (g == null)
                {
                    return;
                }
                lock (g.gate)
                {
                    g.finished++;
                }
            }
        }

        /** Monitor.Enter(the gate); sets held = true. Blocks while another thread holds it. */
        public void enter(ref bool held)
        {
            if (held)
            {
                return;   // already entered through this flag: Monitor.Enter(obj, ref true) would throw
            }
            bool taken = false;
            System.Threading.Monitor.Enter(gate, ref taken);
            held = taken;
        }

        /** Only while entered: (no load started since the ticket, no other load in flight now). */
        public (bool noLoadSince, bool noneInFlight) counters(Ticket t)
        {
            lock (gate)
            {
                return (started == t.started0, started == finished);
            }
        }

        /** Monitor.Exit when held; held = false. Safe to call twice; never throws when not held. */
        public void exit(ref bool held)
        {
            if (!held)
            {
                return;
            }
            held = false;
            if (System.Threading.Monitor.IsEntered(gate))   // never a SynchronizationLockException (another thread's flag)
            {
                System.Threading.Monitor.Exit(gate);
            }
        }
    }

    /* ★ lockb (Lock batch, ruling #1825 (1)–(3), DECISIONS #1915–#1934, contract docs/contract-lockb.md § 3) — mechanisms
     * docs/lockb-mechanisms.md. Three switches, one per change (#1478); all three OFF = the base behaviour:
     *   HoldWhileDeferred   — item 1: the pause lock holds its form while the deferred prompt waits (the existing push
     *                         setAuthPending "True" / "1") and is popped with no animation;
     *   NoAlertNoCredential — item 2: no "Authentication Failed" alert when the prompt returns NotAvailable or Denied;
     *   SecondClock         — item 3: the no-auth window is measured with a second clock the user cannot set too (Android).
     * Absent = ON; a stored 0 acts only while devMode is on (S16PassRules.effectiveFlag); read LAZILY, once per process, at the
     * first use — NOT from SpixiFlags.init() (L269: init's tail is held by the pins of other batches). Log text: fixed words and
     * 0|1 only (the handover-gate log rule). */
    public static class LockbFlags
    {
        public const string HoldWhileDeferredKey = "flagLockHoldWhileDeferred";       // int pref; absent = default (1) — item 1
        public const string NoAlertNoCredentialKey = "flagLockNoAlertNoCredential";   // int pref; absent = default (1) — item 2
        public const string SecondClockKey = "flagLockSecondClock";                   // int pref; absent = default (1) — item 3
        /** Item 1. OFF = the base: no hold push, the animated pop. */
        public static bool HoldWhileDeferred { get { ensureRead(); return hold; } }
        /** Item 2. OFF = the base: the alert after every not-authenticated prompt. */
        public static bool NoAlertNoCredential { get { ensureRead(); return noAlert; } }
        /** Item 3. OFF = the base: the wall clock alone. */
        public static bool SecondClock { get { ensureRead(); return clock; } }
        private static bool hold = false;
        private static bool noAlert = false;
        private static bool clock = false;
        private static int readDone = 0;                     // 1 once read() has set the three values
        private static readonly object readLock = new object();

        /** Once per process (the first property read); the [FLAGS] lockb line is written once, here. */
        internal static void ensureRead()
        {
            if (System.Threading.Volatile.Read(ref readDone) != 0)
            {
                return;
            }
            bool first = false;
            lock (readLock)
            {
                if (readDone == 0)
                {
                    read();
                    first = true;
                }
            }
            if (first)
            {
                try
                {
                    Logging.info(flagsLine(hold, noAlert, clock));
                }
                catch (Exception)
                {
                }
            }
        }

        /** The read (ensureRead calls it once; the csh tests call it again over a changed store): absent = ON; a stored 0 acts
         *  only while devMode is on; a store that throws keeps all three ON. Logs NOTHING. */
        internal static void read()
        {
            bool dev = false;
            int h = 1, n = 1, c = 1;
            try
            {
                dev = Preferences.Default.Get("devMode", false);
                h = Preferences.Default.Get(HoldWhileDeferredKey, 1);
                n = Preferences.Default.Get(NoAlertNoCredentialKey, 1);
                c = Preferences.Default.Get(SecondClockKey, 1);
            }
            catch (Exception)
            {
                dev = false;   // the flags only ever turn OFF on purpose
                h = n = c = 1;
            }
            hold = S16PassRules.effectiveFlag(dev, h);
            noAlert = S16PassRules.effectiveFlag(dev, n);
            clock = S16PassRules.effectiveFlag(dev, c);
            System.Threading.Volatile.Write(ref readDone, 1);
        }

        /** `[FLAGS] lockb hold=<0|1> noalert=<0|1> clock=<0|1>` — fixed words and 0|1 only. */
        public static string flagsLine(bool hold, bool noAlert, bool clock)
        {
            return "[FLAGS] lockb hold=" + (hold ? "1" : "0") + " noalert=" + (noAlert ? "1" : "0") + " clock=" + (clock ? "1" : "0");
        }
    }

    /* Two switches, one per change; OFF = the old path. OpusManagedOnly: the Opus factory makes the managed codec and never
     * probes for a native library. DeclineClears: the Home decline also runs the Sent sweep and drops the chat's kept media.
     * Absent = ON; a stored 0 acts only in dev mode (S16PassRules.effectiveFlag); read lazily, once per process; the one
     * [FLAGS] line holds fixed words and 0|1 only. */
    public static class SmallFixFlags
    {
        public const string OpusManagedOnlyKey = "flagOpusManagedOnly";
        public const string DeclineClearsKey = "flagDeclineClears";
        public static bool OpusManagedOnly => (bits() & 1) != 0;
        public static bool DeclineClears => (bits() & 2) != 0;
        private static int state = -1;   // -1 = not read yet, else the two switches as bits 1, 2

        private static int bits()
        {
            int b = System.Threading.Volatile.Read(ref state);
            if (b >= 0) return b;
            b = read();
            if (System.Threading.Interlocked.CompareExchange(ref state, b, -1) == -1)
            {
                try { Logging.info(flagsLine(b)); } catch (Exception) { }
            }
            return System.Threading.Volatile.Read(ref state);
        }

        /** A store that throws keeps both ON. Logs nothing. */
        internal static int read()
        {
            bool dev = false;
            int o = 1, d = 1;
            try
            {
                dev = Preferences.Default.Get("devMode", false);
                o = Preferences.Default.Get(OpusManagedOnlyKey, 1);
                d = Preferences.Default.Get(DeclineClearsKey, 1);
            }
            catch (Exception)
            {
                dev = false;
            }
            return (S16PassRules.effectiveFlag(dev, o) ? 1 : 0) | (S16PassRules.effectiveFlag(dev, d) ? 2 : 0);
        }

        public static string flagsLine(int b) => "[FLAGS] fixb5 opusmanaged=" + (b & 1) + " declineclears=" + (b >> 1 & 1);
    }

    /* Three switches, one per change; OFF = the old path. MediaOrigin: chat pictures by a local link from C#'s own handler
     * (else the data: pushes). MediaKeep: the chat page keeps decoded pictures across re-renders. TrimHook: the Android trim
     * levels that still fire drop the hidden views. Absent = ON; a stored 0 acts only in dev mode (S16PassRules.effectiveFlag).
     * Read lazily, once per process; the one [FLAGS] line holds fixed words and 0|1 only. */
    public static class ImgurlFlags
    {
        public const string MediaOriginKey = "flagMediaOrigin";
        public const string MediaKeepKey = "flagMediaKeep";
        public const string TrimHookKey = "flagTrimHook";
        public static bool MediaOrigin => (bits() & 1) != 0;
        public static bool MediaKeep => (bits() & 2) != 0;
        public static bool TrimHook => (bits() & 4) != 0;
        private static int state = -1;   // -1 = not read yet, else the three switches as bits 1, 2, 4

        private static int bits()
        {
            int b = System.Threading.Volatile.Read(ref state);
            if (b >= 0) return b;
            b = read();
            if (System.Threading.Interlocked.CompareExchange(ref state, b, -1) == -1)
            {
                try { Logging.info(flagsLine(b)); } catch (Exception) { }
            }
            return System.Threading.Volatile.Read(ref state);
        }

        /** A store that throws keeps all three ON. Logs nothing. */
        internal static int read()
        {
            bool dev = false;
            int m = 1, k = 1, t = 1;
            try
            {
                dev = Preferences.Default.Get("devMode", false);
                m = Preferences.Default.Get(MediaOriginKey, 1);
                k = Preferences.Default.Get(MediaKeepKey, 1);
                t = Preferences.Default.Get(TrimHookKey, 1);
            }
            catch (Exception)
            {
                dev = false;
            }
            return (S16PassRules.effectiveFlag(dev, m) ? 1 : 0) | (S16PassRules.effectiveFlag(dev, k) ? 2 : 0)
                | (S16PassRules.effectiveFlag(dev, t) ? 4 : 0);
        }

        public static string flagsLine(int b) => "[FLAGS] imgurl mediaorigin=" + (b & 1) + " mediakeep=" + (b >> 1 & 1)
            + " trimhook=" + (b >> 2 & 1);
    }
}
