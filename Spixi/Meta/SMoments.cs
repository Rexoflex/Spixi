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
    /// Store: two keys in the backup-excluded local-only file (<see cref="SLocalOnlyStore"/>, the hint counters' file) —
    /// wiped with the account by <c>SLocalOnlyStore.clearAll()</c>, nothing to add there. Values are fixed ids and mini-app
    /// ids, validated on the way in and out. ★ S19 F4: the language moment is once per language per SESSION — the set is in
    /// memory (sessionLangs); `moments.langs` is no longer written (the dev reset still removes an S17 / S18 value).
    /// Session bits are in memory; a "session" ends with the process OR
    /// SessionMs after its first moment / card (#46 r1 MINOR-2: a desktop app left running is not one endless session).
    ///
    /// Security lens (docs/security-handover-gate.md): the verbs are accepted only from the pages that host a moment
    /// (Home, a chat, Settings, Contact details — the type test in SpixiContentPage.onNavigatingGlobal; ★ S19 F5: + App
    /// details, for `app:<its own app id>` only), never from a mini-app WebView (hasGeneratedContent). The worst a hostile page can do: mark moments seen (the first-payment warning
    /// burned) and take the session (no hint / rating card, no other moment for up to SessionMs) — never the backup card
    /// (safety, it ignores the session), never money (the native confirm is untouched). ★ #46 security r1 (MAJOR-1): NO moment
    /// writes a setting — the auto-download offer opens Settings › Privacy (`ixian:openPrivacy`, SingleChatPage) and the user
    /// picks there; the chat's `ixian:photoAutoDl:` acceptance was REMOVED. `ixian:openPrivacy` itself is one-shot after the
    /// grant (takePrivacyOpen, #46 security r2).
    /// Nothing is logged but fixed words.
    /// </summary>
    public static class SMoments
    {
        private static bool sessionMoment;      // a moment sheet was granted in this session (the ids takesSession excepts: firstixi, lang, ixihelp, the install moment)
        private static bool sessionCard;        // home reported a hint / update / backup / rating card on screen
        private static long sessionSince;       // wall-clock ms of the first moment / card of this session (0 = none; #46 r2 NIT-3: a
                                                // phone's monotonic clock stops in sleep, so "6 h" would be days)
        private static WeakReference<SpixiContentPage>? privacyOpen;   // the chat page granted the autodl offer: ONE ixian:openPrivacy
        private static long privacyOpenUntil;
        private static string pendingLang = ""; // the non-English language the user just applied (Settings asks after setLocale)
        private static int askLines;            // ★ S18 D3: [MO] ask lines written by this process (capped at S17MomentRules.MaxAskLines)
        /* ★ S19 F4 (MO-LANG): the languages whose moment showed in THIS session — memory only, never stored (a restart asks again) */
        private static readonly S17MomentRules.SessionLangs sessionLangs = new S17MomentRules.SessionLangs();
        /* ★ S20 G (#1379): the apps unmarked after their install in this process — their next ask is the install moment */
        private static readonly S17MomentRules.UnmarkedApps unmarkedApps = new S17MomentRules.UnmarkedApps();

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
            bool details = page is AppDetailsPage;
            List<string> seen = S17MomentRules.parseList(SLocalOnlyStore.get(S17MomentRules.KeySeen), S17MomentRules.isSeenId);
            List<string> apps = S17MomentRules.parseList(SLocalOnlyStore.get(S17MomentRules.KeyApps), S17MomentRules.isAppId);
            if (chat)
            {
                seen = seen.Where(x => Array.IndexOf(ChatSeenIds, x) >= 0).ToList();
                apps = new List<string>();   // the chat asks per app; C# checks again (installed, MultiUser)
            }
            else if (details)
            {
                /* ★ S19 F5: App details hosts only its OWN app's moment — no other id, no other app, no language */
                string own = ((AppDetailsPage)page!).selectedAppId;
                seen = new List<string>();
                apps = apps.Where(x => string.Equals(x, own, StringComparison.Ordinal)).ToList();
            }
            /* ★ S19 F4: a language is "seen" for the rest of the SESSION only (sessionLangs, memory); moments.langs is not read */
            string lang = (!chat && !details && pendingLang.Length > 0 && !sessionLangs.has(pendingLang, nowMs())) ? pendingLang : "";   // #46 security r4 NIT-1: never to a chat
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
            /* ★ V1A-M M1 (P31): the "What is IXI?" moment with its flag OFF — ignored before anything is read: no answer, no
             * seen, no log line (the shell never asks without the `ixihelp` cap) */
            if (id == V1AMRules.IxiHelpId && !SpixiFlags.V1IxiHelp) return true;
            /* ★ S19 F5: App details may ask `app:<its own app id>` and nothing else — refused silently, never logged */
            if (page is AppDetailsPage details && !S17MomentRules.appDetailsAsk(id, arg, details.selectedAppId)) return true;
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
                        /* ★ S19 F4: Settings, the language just applied, never English (S17MomentRules.langEligible) */
                        eligible = S17MomentRules.langEligible(page is SettingsPage, arg, pendingLang);
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
                            MiniApp? app;
                            if (page is AppDetailsPage details)
                            {
                                /* ★ S19 F5 (MO-APP at Install): the details page asks before ixian:install and before its Open pill —
                                   its OWN app (handleVerb: arg == the page's app id), installed or not yet: the caps come from the
                                   fetched appinfo or the installed app, the same object the page's init showed */
                                app = details.momentApp;
                                if (app != null && !string.Equals(app.id, arg, StringComparison.Ordinal)) app = null;
                            }
                            else
                            {
                                app = Node.MiniAppManager != null ? Node.MiniAppManager.getApp(arg) : null;
                            }
                            /* #46 security r3 MINOR-2: from a chat, only a MultiUser app (what a chat can open) — a chat cannot probe for
                               the user's single-user apps */
                            if (app != null && page is SingleChatPage && !app.hasCapability(MiniAppCapabilities.MultiUser)) app = null;
                            if (app == null || !(page is HomePage || page is SingleChatPage || page is AppDetailsPage))
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
                    case V1AMRules.IxiHelpId:
                        /* ★ V1A-M M1 (P31): the "What is IXI?" moment — home only (the Wallet tab's first open), flag on; it obeys
                           the once-per-id + one-per-session + no-card rule (not exempt) but never TAKES the session (#46 r1:
                           S17MomentRules.takesSession — the pay sheet and home's cards are never held back by it) */
                        eligible = V1AMRules.ixiHelpEligible(SpixiFlags.V1IxiHelp, page is HomePage);
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
            /* ★ S20 G (#1379): the app moment at install (App details, or the re-ask after an unmark) neither waits for nor takes
             * the session — S17MomentRules.installMoment */
            bool atInstall = S17MomentRules.installMoment(id, page is AppDetailsPage, unmarkedApps.has(arg));
            S17MomentRules.Decision d = S17MomentRules.decide(id, seen, sessionMoment, sessionCard, eligible, atInstall);
            /* ★ S18 D3: one line per ask — fixed words + an id from the fixed set (S17MomentRules.askLine); no code, no app id */
            string askLine = S17MomentRules.askLine(id, d, S17MomentRules.why(id, seen, sessionMoment, sessionCard, eligible, atInstall));
            if (askLine.Length > 0 && askLines < S17MomentRules.MaxAskLines)   // a page spamming asks cannot flood ixian.log
            {
                askLines++;
                Logging.info(askLine);
            }
            bool yes = d == S17MomentRules.Decision.Grant;
            if (d != S17MomentRules.Decision.Refuse)
            {
                markSeen(id, arg);
            }
            if (yes)
            {
                if (atInstall) unmarkedApps.remove(arg);   // ★ S20 G: the corrective sheet showed — the next ask follows the rule again
                if (S17MomentRules.takesSession(id, atInstall))
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
                if (yes && S17MomentRules.takesSession(id, atInstall))
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

        /** ★ S18 D3 (P28, dev surface): Developer › Reset moment sheets (`ixian:devmoments:reset`, DevPage, dev mode only) —
         *  the three seen keys go and the in-memory bits return to a fresh process (session, card, pending language, the
         *  one-shot privacy open). Nothing is pushed: the walk restarts the app (the open shells keep their own copy). Writes
         *  at once (SLocalOnlyStore.remove), so a restart right after cannot lose it. One fixed log line. */
        public static void resetForDev()
        {
            // #46 security N2: SLocalOnlyStore.remove never throws — it returns false on a failed write, so the result decides
            // the line (a failed reset must not log "cleared"). Fixed words only.
            bool stored = true;
            try
            {
                stored &= SLocalOnlyStore.remove(S17MomentRules.KeySeen);
                stored &= SLocalOnlyStore.remove(S17MomentRules.KeyLangs);
                stored &= SLocalOnlyStore.remove(S17MomentRules.KeyApps);
            }
            catch (Exception e)
            {
                stored = false;
                Logging.warn("SMoments: store failed (" + e.GetType().Name + ")");
            }
            sessionMoment = false;
            sessionCard = false;
            sessionSince = 0;
            pendingLang = "";
            sessionLangs.clear();   // ★ S19 F4: the session's languages (memory) — moments.langs above is an S17 / S18 leftover
            unmarkedApps.clear();   // ★ S20 G
            privacyOpen = null;
            privacyOpenUntil = 0;
            askLines = 0;
            if (stored) Logging.info(S17MomentRules.DevResetLine);
            else Logging.warn("[MO] dev reset: store write failed");
        }

        /** ★ #46 S19 (security MINOR-1): App details' URL install put on another app than the fetched appinfo its moment showed
         *  (another id or capability set, S17MomentRules.installedDiffers) — that app id is no longer seen, so its first open
         *  shows the package's real caps. Validated id; home gets the new list (it holds a copy). One fixed log line. */
        public static void unmarkApp(string? appId)
        {
            if (!SpixiFlags.S17Moments || !S17MomentRules.isAppId(appId)) return;
            try
            {
                SLocalOnlyStore.setDeferred(S17MomentRules.KeyApps, S17MomentRules.removeFromList(SLocalOnlyStore.get(S17MomentRules.KeyApps), appId!, S17MomentRules.isAppId));
                unmarkedApps.add(appId);   // ★ S20 G (#1379): its next ask is the corrective install moment (outside the session rule)
                Logging.info("[MO] app moment: the installed app differs, asks again");
            }
            catch (Exception e)
            {
                Logging.warn("SMoments: store failed (" + e.GetType().Name + ")");
            }
            HomePage? home = HomePage.InstanceOrNull();
            if (home != null) pushTo(home);
        }

        private static bool isSeen(string id, string arg)
        {
            if (id == "lang") return sessionLangs.has(arg, nowMs());   // ★ S19 F4: once per language per SESSION (memory, never stored)
            if (id == "app") return S17MomentRules.parseList(SLocalOnlyStore.get(S17MomentRules.KeyApps), S17MomentRules.isAppId).Contains(arg);
            return S17MomentRules.parseList(SLocalOnlyStore.get(S17MomentRules.KeySeen), S17MomentRules.isSeenId).Contains(id);
        }

        private static void markSeen(string id, string arg)
        {
            try
            {
                if (id == "lang")
                {
                    sessionLangs.add(arg, nowMs());   // ★ S19 F4: memory only — moments.langs is no longer written
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
