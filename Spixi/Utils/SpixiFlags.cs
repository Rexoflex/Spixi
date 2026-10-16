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

        public static void init()
        {
            bool dev = false;
            int sp = 1, mg = 1, sb = 1, sm = 1, fs = 1, sg = 1;
            int vi = 1, vh = 1;   // ★ V1A-M M1 / M2
            int ah = 1;           // ★ S20I
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
        }
    }
}
