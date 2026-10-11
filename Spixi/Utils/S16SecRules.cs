/* ★ S16 (#1320 flags F1 · F2 · F3/F4 · F5, #1313 MAJOR #9) — the PURE half of the Session 16 security batch. No MAUI, no
 * Core type, no disk — the harness executes every rule (scripts/csh/S16SecTests.cs). The call sites are MAUI- or
 * platform-bound and are pinned by scripts/pins-s16/a-sec.mjs:
 *   · F1 — LockPage `ixian:change` asks changeLeg FIRST; App.onUnlock asks unlockReleases;
 *   · F2 — SpixiContentPage.pushPageLoaded asks overlayRefused while a lock stages (cancelPreload never cancels one);
 *   · F3/F4 — SingleChatPage onVoiceRecStart / onVoiceSend + the paste route ask mediaInputRefusal (flag SpixiFlags.MediaInputGate);
 *   · F5 — HomePage onDeclineRequest asks declineAllowed;
 *   · MAJOR #9 — the Android WebChromeClient.OnPermissionRequest asks captureRefusal (keyed on the C# ClassId marker). */
using System;

namespace SPIXI
{
    public static class S16SecRules
    {
        /* ── F1 (P01): `ixian:change` on a lock. Only a Settings authorise lock (confirm mode, NOT an app lock) has a
         * Cancel. An APP lock has no way past it (the shell draws no Cancel since #458; C# refuses the verb too). ★ S16 #46
         * r1 (R1-n6): the COLD-START lock's old leg (→ LaunchPage) has no sender any more — RESTORE-B's sheet only closes
         * (#1311 (b)) — so it is refused as well; a verb nobody sends is a verb only a script sends. */
        public enum ChangeLeg { Refuse, Cancel }

        public static ChangeLeg changeLeg(bool justConfirm, bool appLock)
        {
            return justConfirm && !appLock ? ChangeLeg.Cancel : ChangeLeg.Refuse;
        }

        /** F1: authSucceeded releases the app lock only when it carries TRUE (a verified password or biometric). A false,
         *  a missing value or another EventArgs type never unlocks. */
        public static bool unlockReleases(EventArgs? e)
        {
            return e is EventArgs<bool> r && r.Value;
        }

        /* ── F2 (P05): a navigation does not supersede a lock that is still STAGING. The bound (Damir: 5 s) keeps a stuck
         * staging op from freezing navigation for the session; the lock's own timeout is 1.2 s. ★ S16 #46 r1 (R1-n1): the
         * age is MONOTONIC (Environment.TickCount64 at both ends, SpixiContentPage); a negative age still refuses. */
        public const double StagingRefuseMs = 5000;

        public static bool overlayRefused(bool staging, double stagingAgeMs)
        {
            return staging && stagingAgeMs < StagingRefuseMs;
        }

        /* ── F3/F4 (P12, P10; Damir picked a1): the voice recorder (voicerec:start / :send) and the paste
         * verb (pasteImage) act only for the chat the user is looking at, in the foreground, with no lock. Gate OFF (SpixiFlags.MediaInputGate) = the old behaviour: no refusal.
         * ★ S16 #46 r1 (R1-M2, R4-3): every primitive comes in on its own and the WHOLE combination is here (executed):
         *   locked = an app lock latched || a lock shown in place || a lock staging;
         *   shown  = the chat is the top of its stack (isShownChat) && no chat-info page covers it && no modal is open &&
         *            (not an overlay || the overlay host is the top of the navigation stack) — presentPreload's
         *            canShowInPlace test: a legacy page pushed over Home (a mini-app, Wallet Send, Scan) or a modal covers
         *            the chat although it is still the top overlay. ★ #46 r2 (M1): isShownChat (the 1 Hz tick's rule) also
         *            counts a ContactDetails on top as "shown"; that holds only for the desktop column-2 pane BESIDE the
         *            chat — on a phone (full-span), in desktop column 1 and in a NARROWED window (< 700, the col-2 pane
         *            relaid over the chat, #46 r3 M1) it COVERS the chat (infoCovers). Not covered here: ixian:call /
         *            callback / appAccept open the mic outside this gate (P13 residual).
         * The reason is a FIXED word (it goes into a log line). */
        public const string RefuseLocked = "locked";
        public const string RefuseBackground = "background";
        public const string RefuseHidden = "hidden";

        public static string? mediaInputRefusal(bool gateOn, bool foreground, bool appLock, bool inPlaceLock, bool lockStaging,
            bool chatOnTop, bool infoCovers, bool viaOverlay, bool hostIsNavTop, bool modalOpen)
        {
            if (!gateOn)
            {
                return null;
            }
            if (appLock || inPlaceLock || lockStaging)
            {
                return RefuseLocked;
            }
            if (!foreground)
            {
                return RefuseBackground;
            }
            if (!chatOnTop || infoCovers || modalOpen || (viaOverlay && !hostIsNavTop))
            {
                return RefuseHidden;
            }
            return null;
        }

        /* ── F5 (P09): the home decline removes exactly what the request CARD shows (HomePage: `!friend.approved &&
         * lastMessage is their requestAdd`, i.e. not mine) — ★ S16 #46 r1 (R1-n5): the card's own predicate, no more (a bot
         * or payment-type card's Decline works again) and no less (an approved contact or my own request is refused). */
        public static bool declineAllowed(bool approved, bool lastIsRequestAdd, bool lastFromMe)
        {
            return !approved && lastIsRequestAdd && !lastFromMe;
        }

        /* ── MAJOR #9 (#1313, P07): the Android WebView capture grant. Returns null when the request may get VIDEO capture,
         * else a FIXED refusal word. ★ S16 #46 r1 (R1-M1, R4-2): keyed on the C# MARKER, never on the document — every
         * Android shell loads through LoadDataWithBaseURL, so WebView.Url is "about:blank" for all of them, and a file
         * name test let any local file called scan.html (a peer download) through. Grant only: a host this code can
         * identify, whose ClassId is "scan" (ScanPage.xaml — set in XAML, no document can change it), exactly one
         * resource and it is video, and an origin that is not http(s). A mini-app ("miniapp") is untrusted. */
        public const string AndroidVideoCapture = "android.webkit.resource.VIDEO_CAPTURE";   // PermissionRequest.RESOURCE_VIDEO_CAPTURE
        public const string ScanMarker = "scan";
        public const string MiniAppMarker = "miniapp";

        /* ★ #46 r4 (m1, the third spelling round — question the design, not the patch): the marker alone can be forged by any
         * C# / XAML spelling a pin does not know. `scanPageView` is STRUCTURAL: the requesting WebView is the very object
         * ScanPage registered in its constructor (ScanPage.isScanWebView, an identity test). Both must hold. */
        public static string? captureRefusal(bool hostKnown, string? classId, string[]? resources, string? originScheme, bool scanPageView)
        {
            if (!hostKnown || string.Equals(classId, MiniAppMarker, StringComparison.Ordinal))
            {
                return "untrusted-host";
            }
            if (resources == null || resources.Length != 1 || !string.Equals(resources[0], AndroidVideoCapture, StringComparison.Ordinal))
            {
                return "capture-type";
            }
            string scheme = originScheme ?? "";
            if (scheme.Equals("http", StringComparison.OrdinalIgnoreCase) || scheme.Equals("https", StringComparison.OrdinalIgnoreCase))
            {
                return "remote-origin";
            }
            if (!string.Equals(classId, ScanMarker, StringComparison.Ordinal) || !scanPageView)
            {
                return "not-the-scan-page";
            }
            return null;
        }
    }
}
