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
}
