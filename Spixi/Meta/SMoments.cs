using IXICore.Meta;
using Microsoft.Maui.ApplicationModel;
using Microsoft.Maui.Storage;
using SPIXI.MiniApps;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SPIXI.Meta
{
    /// <summary>
    /// ★ S17 F (#1340, 🟡 NEW push + verbs, P28, flag <see cref="SpixiFlags.S17Moments"/>) — THE MOMENT SHEETS: the store, the
    /// session bits and the verb glue. The rules are pure (<see cref="S17MomentRules"/>, executed by scripts/csh); this class
    /// only reads the inputs they need and stores what they decide.
    ///
    /// Store: three keys in the backup-excluded local-only file (<see cref="SLocalOnlyStore"/>, the hint counters' file) —
    /// wiped with the account by <c>SLocalOnlyStore.clearAll()</c>, nothing to add there. Values are fixed ids, locale codes
    /// and mini-app ids, validated on the way in and out. Session bits are in memory; a "session" ends with the process OR
    /// SessionMs after its first moment / card (#46 r1 MINOR-2: a desktop app left running is not one endless session).
    ///
    /// Security lens (docs/security-handover-gate.md): the verbs are accepted only from the four pages that host a moment
    /// (Home, a chat, Settings, Contact details — the type test in SpixiContentPage.onNavigatingGlobal), never from a
    /// mini-app WebView (hasGeneratedContent). The worst a hostile page can do: mark moments seen (the first-payment warning
    /// burned) and take the session (no hint / rating card, no other moment for up to SessionMs) — never the backup card
    /// (safety, it ignores the session), never money (the native confirm is untouched). ★ #46 security r1 (MAJOR-1): NO moment
    /// writes a setting — the auto-download offer opens Settings › Privacy (`ixian:openPrivacy`, SingleChatPage) and the user
    /// picks there; the chat's `ixian:photoAutoDl:` acceptance was REMOVED. `ixian:openPrivacy` itself is one-shot after the
    /// grant (takePrivacyOpen, #46 security r2).
    /// Nothing is logged but fixed words.
    /// </summary>
    public static class SMoments
    {
        private static bool sessionMoment;      // a moment sheet was granted in this session (firstixi excepted)
        private static bool sessionCard;        // home reported a hint / update / backup / rating card on screen
        private static long sessionSince;       // wall-clock ms of the first moment / card of this session (0 = none; #46 r2 NIT-3: a
                                                // phone's monotonic clock stops in sleep, so "6 h" would be days)
        private static WeakReference<SpixiContentPage>? privacyOpen;   // the chat page granted the autodl offer: ONE ixian:openPrivacy
        private static long privacyOpenUntil;
        private static string pendingLang = ""; // the non-English language the user just applied (Settings asks after setLocale)

        /** A session = the process, at most this long after its first moment / card (then both bits clear). */
        public const long SessionMs = S17MomentRules.MaxSessionMs;
        private static long nowMs() => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        private static void expireSession()
        {
            long now = nowMs();
            if (sessionSince != 0 && (now - sessionSince >= SessionMs || now < sessionSince))
            {
                sessionMoment = false;
                sessionCard = false;
                sessionSince = 0;
            }
        }
        private static void startSession()
        {
            if (sessionSince == 0) sessionSince = nowMs();
        }

        public static bool sessionTaken { get { expireSession(); return sessionMoment; } }

        /** `ixian:language:<code>` succeeded: remember a non-English code; SettingsPage pushes setMoments right after setLocale. */
        public static void noteLanguage(string? code)
        {
            if (!SpixiFlags.S17Moments) return;
            code = code?.Trim().ToLowerInvariant();
            pendingLang = (code != null && S17MomentRules.isLangCode(code) && !S17MomentRules.isEnglish(code)) ? code : "";
        }

        /** The ids a CHAT page may know about (its own moments). #46 security r3 MINOR-2: the chat's push never carries another
         *  pane's state (the first IXI, the app list, the pending language). Accepted residual (#46 security r4 MINOR-1): a chat can
         *  still ASK `app:<id>` for an installed MultiUser app (it has their list through addApp) and so learn, one app at a time,
         *  whether that app's moment was already seen — and its capability names when it was not (one moment per session). */
        private static readonly string[] ChatSeenIds = { "autodl", "offline", "mic", "pay" };

        public static string pushJson(SpixiContentPage? page = null)
        {
            bool chat = page is SingleChatPage;
            List<string> seen = S17MomentRules.parseList(SLocalOnlyStore.get(S17MomentRules.KeySeen), S17MomentRules.isSeenId);
            List<string> apps = S17MomentRules.parseList(SLocalOnlyStore.get(S17MomentRules.KeyApps), S17MomentRules.isAppId);
            if (chat)
            {
                seen = seen.Where(x => Array.IndexOf(ChatSeenIds, x) >= 0).ToList();
                apps = new List<string>();   // the chat asks per app; C# checks again (installed, MultiUser)
            }
            List<string> langs = S17MomentRules.parseList(SLocalOnlyStore.get(S17MomentRules.KeyLangs), S17MomentRules.isLangCode);
            string lang = (!chat && pendingLang.Length > 0 && !langs.Contains(pendingLang)) ? pendingLang : "";   // #46 security r4 NIT-1: never to a chat
            bool taken = sessionTaken;   // #46 r2 (MINOR-A): expired first, so a reload never revives an ended session
            long left = taken && sessionSince != 0 ? SessionMs - (nowMs() - sessionSince) : 0;
            return S17MomentRules.pushJson(seen, apps, lang, taken, left);
        }

        /** setMoments to one page (after its setCaps). Flag OFF = nothing. */
        public static void pushTo(SpixiContentPage page)
        {
            if (!SpixiFlags.S17Moments) return;
            try
            {
                global::SPIXI.Utils.sendUiCommand(page, "setMoments", pushJson(page));
            }
            catch (Exception e)
            {
                Logging.warn("SMoments: push failed (" + e.GetType().Name + ")");
            }
        }

        /** The verb family `ixian:moment:*` (SpixiContentPage.onNavigatingGlobal). true = it was ours (handled or refused). */
        public static bool handleVerb(SpixiContentPage page, string url)
        {
            if (!url.StartsWith(S17MomentRules.VerbPrefix, StringComparison.Ordinal)) return false;
            if (!SpixiFlags.S17Moments) return true;
            if (S17MomentRules.isCardVerb(url))
            {
                if (page is HomePage)
                {
                    expireSession();
                    sessionCard = true;
                    startSession();
                }
                return true;
            }
            if (!S17MomentRules.parseAsk(url, out string id, out string arg)) return true;   // refused silently, never logged
#pragma warning disable CS4014
            answerAsync(page, id, arg);
#pragma warning restore CS4014
            return true;
        }

        private static async Task answerAsync(SpixiContentPage page, string id, string arg)
        {
            string caps = "";
            S17MomentRules.Eligible eligible;
            try
            {
                switch (id)
                {
                    case "lang":
                        eligible = (page is SettingsPage && arg == pendingLang) ? S17MomentRules.Eligible.Yes : S17MomentRules.Eligible.Wait;
                        break;
                    case "autodl":
                        /* the offer only while the setting is Off, Load pictures is on and the Tips switch is on (MOMENTS.md: 2 is an offer);
                           its button only OPENS Settings › Privacy (#46 security r1) */
                        eligible = (page is SingleChatPage && SAutoDownload.setting == "off" && SAutoDownload.loadPictures && !SHints.off)
                            ? S17MomentRules.Eligible.Yes : S17MomentRules.Eligible.Wait;
                        break;
                    case "offline":
                        eligible = page is SingleChatPage ? S17MomentRules.Eligible.Yes : S17MomentRules.Eligible.Wait;
                        break;
                    case "firstixi":
                        /* safety: only while no backup was ever made; with a backup it is never needed (consumed). #46 r2 (MINOR-5): NOT
                           keyed on the reminder stamp — the backup nudge sets it at the first contact, so almost nobody would see this
                           moment; a restored account (no backup made on this device) may see it once (🟡 #1343) */
                        eligible = !(page is HomePage) ? S17MomentRules.Eligible.Wait
                            : (BackupPage.lastBackupTimestamp() > 0 ? S17MomentRules.Eligible.Consume : S17MomentRules.Eligible.Yes);
                        break;
                    case "mic":
                        eligible = !(page is SingleChatPage) ? S17MomentRules.Eligible.Wait : await micEligible();
                        break;
                    case "app":
                        {
                            MiniApp? app = Node.MiniAppManager != null ? Node.MiniAppManager.getApp(arg) : null;
                            /* #46 security r3 MINOR-2: from a chat, only a MultiUser app (what a chat can open) — a chat cannot probe for
                               the user's single-user apps */
                            if (app != null && page is SingleChatPage && !app.hasCapability(MiniAppCapabilities.MultiUser)) app = null;
                            if (app == null || !(page is HomePage || page is SingleChatPage))
                            {
                                eligible = S17MomentRules.Eligible.Wait;   // not installed: the open itself fails or installs first
                            }
                            else
                            {
                                eligible = S17MomentRules.Eligible.Yes;
                                caps = S17MomentRules.capsCsv(Enum.GetValues(typeof(MiniAppCapabilities)).Cast<MiniAppCapabilities>()
                                    .Where(app.hasCapability).Select(c => c.ToString()));
                            }
                            break;
                        }
                    case "pay":
                        eligible = (page is HomePage || page is SingleChatPage || page is ContactDetails) ? S17MomentRules.Eligible.Yes : S17MomentRules.Eligible.Wait;
                        break;
                    default:
                        return;
                }
            }
            catch (Exception e)
            {
                Logging.warn("SMoments: the check failed (" + e.GetType().Name + ")");
                eligible = S17MomentRules.Eligible.Wait;
            }

            expireSession();
            bool seen = isSeen(id, arg);
            S17MomentRules.Decision d = S17MomentRules.decide(id, seen, sessionMoment, sessionCard, eligible);
            bool yes = d == S17MomentRules.Decision.Grant;
            if (d != S17MomentRules.Decision.Refuse)
            {
                markSeen(id, arg);
            }
            if (yes)
            {
                if (S17MomentRules.takesSession(id))
                {
                    sessionMoment = true;
                    startSession();
                }
                if (id == "lang") pendingLang = "";
                if (id == "autodl")
                {
                    /* #46 security r2 (MINOR-B): the offer's "Open Settings" is ONE `ixian:openPrivacy` from THIS page, for 10 min */
                    privacyOpen = new WeakReference<SpixiContentPage>(page);
                    privacyOpenUntil = nowMs() + 10 * 60 * 1000;
                }
            }
            try
            {
                global::SPIXI.Utils.sendUiCommand(page, "momentAnswer", id, arg, yes ? "1" : "0", yes ? caps : "");
                /* home holds its own cards back for the rest of the session: tell it now when the moment showed elsewhere */
                if (yes && S17MomentRules.takesSession(id))
                {
                    HomePage? home = HomePage.InstanceOrNull();
                    if (home != null && !ReferenceEquals(home, page)) pushTo(home);
                }
            }
            catch (Exception e)
            {
                Logging.warn("SMoments: answer failed (" + e.GetType().Name + ")");
            }
        }

        /** The mic moment comes BEFORE the system dialog: none when the permission is already granted (consumed), and none
         *  for an unpackaged Windows exe — it gets no dialog (MOMENTS.md 5; Damir's interview item (a)). */
        private static async Task<S17MomentRules.Eligible> micEligible()
        {
#if WINDOWS
            if (AppInfo.Current.PackagingModel == AppPackagingModel.Unpackaged) return S17MomentRules.Eligible.Consume;
#endif
            PermissionStatus st = await Permissions.CheckStatusAsync<Permissions.Microphone>();
            if (st == PermissionStatus.Granted) return S17MomentRules.Eligible.Consume;
#if IOS || MACCATALYST
            /* #46 r1 (MINOR-6): iOS / macOS ask ONCE — after a refusal the OS never asks again, so "your phone asks you next" would
               be false (Android cannot tell "never asked" from "refused"; it keeps the sheet) */
            if (st == PermissionStatus.Denied) return S17MomentRules.Eligible.Consume;
#endif
            return S17MomentRules.Eligible.Yes;
        }

        /** `ixian:openPrivacy` from a chat page — accepted ONCE, only from the page C# granted the autodl offer to, within
         *  10 min. A hostile chat cannot drive the Settings pane at will (#46 security r2 MINOR-B). */
        public static bool takePrivacyOpen(SpixiContentPage page)
        {
            if (!SpixiFlags.S17Moments || privacyOpen == null) return false;
            bool owner = privacyOpen.TryGetTarget(out SpixiContentPage? p) && ReferenceEquals(p, page);
            if (!owner) return false;   // #46 security r3 NIT-1: another page's verb never uses up the owner's grant
            privacyOpen = null;
            return nowMs() <= privacyOpenUntil;
        }

        private static bool isSeen(string id, string arg)
        {
            if (id == "lang") return S17MomentRules.parseList(SLocalOnlyStore.get(S17MomentRules.KeyLangs), S17MomentRules.isLangCode).Contains(arg);
            if (id == "app") return S17MomentRules.parseList(SLocalOnlyStore.get(S17MomentRules.KeyApps), S17MomentRules.isAppId).Contains(arg);
            return S17MomentRules.parseList(SLocalOnlyStore.get(S17MomentRules.KeySeen), S17MomentRules.isSeenId).Contains(id);
        }

        private static void markSeen(string id, string arg)
        {
            try
            {
                if (id == "lang")
                {
                    SLocalOnlyStore.setDeferred(S17MomentRules.KeyLangs, S17MomentRules.addToList(SLocalOnlyStore.get(S17MomentRules.KeyLangs), arg, S17MomentRules.isLangCode, S17MomentRules.MaxLangs));
                }
                else if (id == "app")
                {
                    SLocalOnlyStore.setDeferred(S17MomentRules.KeyApps, S17MomentRules.addToList(SLocalOnlyStore.get(S17MomentRules.KeyApps), arg, S17MomentRules.isAppId, S17MomentRules.MaxApps));
                }
                else
                {
                    SLocalOnlyStore.setDeferred(S17MomentRules.KeySeen, S17MomentRules.addToList(SLocalOnlyStore.get(S17MomentRules.KeySeen), id, S17MomentRules.isSeenId, S17MomentRules.Ids.Length));
                }
            }
            catch (Exception e)
            {
                Logging.warn("SMoments: store failed (" + e.GetType().Name + ")");
            }
        }
    }
}
