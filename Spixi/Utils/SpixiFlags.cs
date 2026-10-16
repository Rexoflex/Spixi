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

        public static void init()
        {
            bool dev = false;
            int sp = 1, mg = 1, sb = 1, sm = 1, fs = 1, sg = 1;
            int vi = 1, vh = 1;   // ★ V1A-M M1 / M2
            int ah = 1;           // ★ S20I
            int xi = 1, xs = 1, xp = 1, xc = 1, xh = 1, xw = 1;   // ★ Session Safety
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
        }
    }
}
