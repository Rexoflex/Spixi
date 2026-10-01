using IXICore;
using IXICore.Meta;
using IXICore.Streaming;
using Microsoft.Maui;
using Microsoft.Maui.ApplicationModel;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using Microsoft.Maui.Graphics;   // ★ #1074: Color / Colors / Point (ImplicitUsings is off in this project)
using Spixi;
using SPIXI.Lang;
using SPIXI.Meta;
using SPIXI.VoIP;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
#if WINDOWS
using Microsoft.Maui.Platform;   // ★ #1093: ToWindowsColor (the WebView2 ground, webViewDefaultGround)
#endif

namespace SPIXI
{
    /* ————— Q4-③ (#270): THE ONE NATIVE CALL SURFACE ————————————————————————————
     *
     * Damir's F5 (quirks-final ③): the C18 broadcast made EVERY pane ring — N
     * rings, N bars on desktop, and panes without a roster showed a truncated
     * address instead of the caller. Root cause is structural: each pane is its
     * own WebView (★ #221), so a DOM ring can only ever cover its own pane.
     *
     * End state (Damir: "do the best practice"): calls present on ONE native,
     * C#-presented surface — this page — hosted in the overlay host's grid the
     * same way the lock screen is (#230 in-place stage: attached once, shown
     * once, zero re-attach repaints), spanning every column INCLUDING the rail.
     * C# owns identity (it has the Friend) → nick + avatar (Utils.imageToDataUri,
     * X1) are pushed, so the caller is ALWAYS right regardless of any shell's
     * roster state.
     *
     * Three visual modes, one WebView (★ #1074):
     *   ring — full-window cover (incoming call: avatar + nick + Accept/Decline).
     *          Hardware back is swallowed while ringing (HomePage guard + this
     *          page's own OnBackButtonPressed; back is forwarded to the shell to
     *          close an open decline sheet) — the only exits are Accept /
     *          Decline / the #265 ring timeout / remote hang-up. NOT in
     *          overlayStack → closeTopOverlay can never pop it.
     *   full — full-window expanded call (dialing / in-call); back minimises.
     *   bar  — the minimised CARD (dialing / in-call): the stage is a rounded
     *          Border below the app's top bar; the app around it stays fully
     *          interactive, and exactly ONE card exists on any window layout.
     *
     * LEGACY-PAGE FALLBACK: when a legacy page (money flow / mini-app / scan) is
     * pushed above the overlay host, an in-place stage would be COVERED. The
     * RING then falls back to a real PushModalAsync (the lock's own fallback —
     * ModalStack sits above the page tree), so an incoming call is never
     * invisible. The BAR is not presented over legacy pages (they had the
     * legacy strip pre-redesign; they are the last pages awaiting the §5
     * repoint) — the call itself is unaffected. Logged dial, review brief.
     *
     * ★ LOCK vs CALL — the lock ALWAYS wins (Opus #46 review of this batch,
     * MAJOR-1/2). The in-place stage is ordered below a lock by ZIndex, but the
     * MODAL fallback is not: MAUI's ModalStack sits above the ENTIRE page tree,
     * so a ring pushed modally while locked would have covered the lock (caller
     * identity + Accept/Decline on a locked device) — and worse, hideSurface's
     * PopModalAsync pops the TOP modal, which would have been the LOCK. So:
     *   · a call surface is NEVER presented while any lock is up (lockUp()), and
     *   · App.OnResume tears the surface down BEFORE staging the resume lock,
     * ⇒ a modal can never sit above a lock, and no lock is ever popped by a call
     * event. The call keeps ringing audibly (SPlatformUtils.startRinging) and the
     * suppressed present re-arms UIHelpers.refreshAppRequests, so the ring/bar
     * appears within one UI tick of the unlock. Matches the #258 accepted dial
     * ("no ring while locked").
     *
     * Z-order: the stage carries Z_CALL_SURFACE (100) — above every #225 overlay
     * (default ZIndex 0), below a lock (pushModalLoaded stages carry 200): a
     * lock must cover everything, including a live call's UI.
     *
     * ★ #221 / SECURITY.md: this page keeps its OWN WebView + JS context; the
     * shells receive NO call pushes at all anymore (broadcastCall* route HERE).
     * The inbound verbs (appAccept/appReject/hangUp) ride onNavigatingGlobal
     * with the existing acceptsCallPushes gates — mini-apps still get nothing
     * and can still act on nothing. */
    [XamlCompilation(XamlCompilationOptions.Compile)]
    public partial class CallPage : SpixiContentPage
    {
        public const int Z_CALL_SURFACE = 100;       // above #225 overlays (0), below the lock (200)

        private static readonly object callLock = new object();
        private static CallPage? current = null;

        /* ★ N71 (#421, #46 audit): the LIVE call surface, for the theme sweep.
         * On the normal path this page is staged as a ContentView inside the overlay
         * host's Grid — it is in no NavigationStack, no ModalStack and no overlayStack,
         * so UIHelpers.getLiveShellPages cannot see it, and an OS theme flip mid-call
         * left the in-call strip in the old theme for the rest of the call. Only the
         * modal FALLBACK path was ever enumerable. Read-only, never constructs. */
        public static CallPage? getLiveSurface()
        {
            /* break-my-verdict NIT: read under callLock like every other reader of
             * `current` in this file. hideSurface nulls it synchronously under the lock
             * before any Dispose, so an unlocked read could hand the sweep a page that
             * is mid-teardown. */
            lock (callLock)
            {
                return current;
            }
        }
        private static Border? callStage = null;   // in-place path only (null when modal fallback). ★ #1074: a Border so the minimised CARD can round its corners
        /* ★ #1074 (call premium): the minimised in-call surface is a floating CARD below the
         * top bar (Damir: "below the top bar, so the user can move around the app while in
         * call — a call card, not a full-bleed strip"). The expanded view ("full") is the
         * same stage full-window, like the ring. */
        private const double cardHeightDip = 64;      // matches call.html's --call-card-h
        private const double cardGapDip = 8;          // air between the app's top bar and the card
        private const double cardSideDip = 12;        // phone: side inset
        private const double cardWidthDip = 380;      // desktop: card width (right-aligned)
        private const double appTopBarDip = 56;       // tokens.css --layout-bar-top
        private const double cardRadiusDip = 16;
        /* ★★ B6 (#1093, measured on Damir's Android recording, docs/sheets/1092-b6-frames.png): full ⇄ card
         * showed 2 frames of a full-screen BLACK (the shell had swapped, the opaque stage was still full-size)
         * and then 6 frames of an EMPTY card slot (the stage had resized, the WebView had not repainted at the
         * new size). #1086's "shell first, stage 48 ms later" only reordered the two. Now every presented mode
         * change is a HIDDEN swap (beginStageSwap): the stage goes to ~0 opacity → the shell renders the new
         * view → the stage takes its new geometry → C# asks the shell to report when it has PAINTED at that
         * size (callAwaitPaint → ixian:callPainted:<token>) → the stage fades in. A timeout reveals it anyway
         * (never a stage stuck invisible). 0.01, not 0: an Android view at alpha 0 is not drawn at all, so its
         * WebView would produce no frame — and no painted signal — until it is visible again. */
        private const double swapHiddenOpacity = 0.01;
        private const int swapRevealTimeoutMs = 600;
        private const uint swapFadeMs = 120;
        private static long swapToken = 0;            // the swap the next callPainted must match; bumped when consumed
        private static readonly System.Diagnostics.Stopwatch swapClock = System.Diagnostics.Stopwatch.StartNew();
        private static long swapStartedMs = 0;        // ★ #1095 [CALLSWAP]: hidden → revealed, and by what (painted / timeout)
        private static readonly object speakerChainLock = new object();
        private static Task speakerChain = Task.CompletedTask;   // ★ B9: the serial off-UI-thread route switches
        public static readonly Color callGround = Color.FromArgb("#14161c");   // = surfaceColorStringFor("call.html")
        /* ★ #1080 F8/F9 (walk C.2 FAIL + C.11 + Damir ①/⑦): on DESKTOP the call stage is TRANSPARENT and
         * call.html paints everything itself — the ring's dark scrim OVER the app (the app visible and
         * dimmed behind the card, C.2) and the minimised card with its own 16px corners and shadow (C.11).
         * WHY: WebView2 is a separate composition visual that a MAUI Border does not clip, so the native
         * rounding never reached the card on Windows (sharp corners), and an opaque stage under a scrim
         * can only ever read as a solid ground. The phone keeps the opaque dark stage (#1074: no white
         * flash on a ring). The desktop pre-paint frame stays invisible because the stage is revealed
         * only on shell-ready (Opacity 0 until then). */
#if WINDOWS || MACCATALYST
        public static readonly Color stageGround = Colors.Transparent;
#else
        public static readonly Color stageGround = callGround;
#endif
#if MACCATALYST
        private const double cardShadowPadDip = 8;    // = call.html --call-card-pad on desktop: room for the card's own shadow (12 → 8, #46 r1: a smaller dead strip around the card)
#else
        private const double cardShadowPadDip = 0;    // phone: the native Border clips + shadows · ★ #1093 Windows: the stage IS the card (see below)
#endif
#if WINDOWS
        /* ★★ B4/B5 (#1093, walk #1092 FAIL: the ring on a SOLID ground, the card on a dark square). The #1080
         * plan — a transparent stage + a see-through WebView2 that paints its own scrim and card — CANNOT work on
         * Windows: WinUI 3's WebView2 does not support a transparent background (Microsoft Learn, "WebView2 in
         * WinUI 3": "WinUI 3 doesn't support transparent backgrounds"; microsoft-ui-xaml #2992 / #6527 — an
         * alpha-0 DefaultBackgroundColor is drawn as the theme page brush). The alpha-0 value was already set
         * (surfaceColorStringFor), so the walk's ground was that brush. So on Windows the WebView is only ever
         * as big as the CARD, and everything around the card is native:
         *   ring / full — the stage fills the window with the native scrim (a real XAML alpha, the app shows
         *                 through) and the WebView sits centred at the card's size; call.html reports the card's
         *                 height (ixian:callCardH:<dip>), the width is fixed here.
         *   bar         — the stage is exactly the card (no transparent shadow pad: nothing could show through it).
         * The WebView2 ground (webViewDefaultGround) is opaque and only shows in the card's rounded corners, so it
         * is the colour behind them: the app surface (bar) or the scrim over the app surface (ring / full).
         * The Mac keeps the see-through page (a WKWebView with Opaque = false IS transparent). */
        private static readonly Color winScrim = Color.FromRgba(17, 18, 19, 153);   // = tokens.css --surface-scrim rgba(17, 18, 19, 0.6)
        private const double winScrimAlpha = 0.6;
        private const double winCardWidthDip = 400;      // = call-overlay.css / call-screen.css desktop card width
        private const double winCardEstimateDip = 480;   // before the first ixian:callCardH (the stage is hidden then)
        private static double winCardH = 0;              // the card height call.html reported (dip = CSS px)
        /* ★ #1094 (walk #1093 B4b): below this window height the ring card is the COMPACT one (call.html
         * data-call-compact: identity left, actions right, ~130 px) — a tall card in a short window scrolled. */
        private const double winCompactBelowDip = 520;
        private string winCompactSent = "";              // per page: the last setCallCompact pushed to THIS shell
#endif
        private static bool expanded = false;         // "full" vs "bar" for the live call
        private static string expandedSession = "";   // the call the expanded flag was chosen for
#if WINDOWS || MACCATALYST
        private const bool expandByDefault = false;   // desktop: the card; the app stays in reach
#else
        private const bool expandByDefault = true;    // phone: the full call screen first, like the dialers
#endif
        private static Grid? callHostGrid = null;
        private static bool modalFallback = false;      // presented via PushModalAsync (legacy page on top)
        private static bool presented = false;          // stage revealed (shell ready or timeout)
        private static string surfaceMode = "";         // "ring" | "full" | "bar"

        // last pushed state — kept so ixian:onload (and any re-present) can re-push
        private string stateKind = "";                  // "ring" | "dialing" | "incall"
        private string stateName = "";
        private string stateAvatar = "";
        private string stateText = "";
        private long stateStarted = 0;
        private string stateSession = "";
        private string stateAddress = "";
        private bool shellReady = false;

        public CallPage()
        {
            InitializeComponent();
            NavigationPage.SetHasNavigationBar(this, false);
            loadPage(webView, "call.html");
#if MACCATALYST
            /* ★ #1080 F8/F9: a WKWebView is OPAQUE by default and a clear MAUI background does not reach it;
             * the desktop call surface needs the page itself to be see-through (scrim over the app, rounded
             * card). Set on the platform view as soon as it exists. */
            webView.HandlerChanged += (s, e) =>
            {
                try
                {
                    if (webView.Handler?.PlatformView is WebKit.WKWebView wk)
                    {
                        wk.Opaque = false;
                        wk.BackgroundColor = UIKit.UIColor.Clear;
                        wk.ScrollView.BackgroundColor = UIKit.UIColor.Clear;
                    }
                }
                catch (Exception ex)
                {
                    Logging.warn("CallPage: transparent WKWebView not applied: " + ex.GetType().Name);
                }
            };
#endif
        }

        public override void recalculateLayout()
        {
            ForceLayout();
        }

        private void onNavigated(object sender, WebNavigatedEventArgs e)
        {
            // Deprecated due to WPF, use onLoad
        }

        private void onNavigating(object sender, WebNavigatingEventArgs e)
        {
            string current_url = HttpUtility.UrlDecode(e.Url);
            // #797: cancel first. A throw in a branch must not leave an ixian: navigation for the WebView to load.
            e.Cancel = true;

            // appAccept / appReject / hangUp — the existing global call verbs
            // (VoIPManager routes them; acceptsCallPushes gates stay intact).
            if (onNavigatingGlobal(current_url))
            {
                e.Cancel = true;
                return;
            }

            if (current_url.StartsWith("ixian:onload", StringComparison.Ordinal))
            {
                onLoad();
            }
            else if (current_url.StartsWith("ixian:call", StringComparison.Ordinal))
            {
                onCallControl(current_url);
            }
            else if (current_url.Trim().StartsWith("file:", StringComparison.OrdinalIgnoreCase))
            {
                // allow normal navigation only for local files
                e.Cancel = false;
                return;
            }
            e.Cancel = true;
        }

        /* ════ ★ #1074 — THE CALL-CONTROL VERBS (CallPage ONLY) ═══════════════════════════
         * Handled HERE, not in onNavigatingGlobal: only the call shell can send them, so a
         * mini-app WebView (and every other shell) cannot mute, route, silence or decline a
         * call — the #221 wall and the acceptsCallPushes gate are unchanged.
         *   ixian:callExpand / ixian:callMinimise        presentation only (card ⇄ full)
         *   ixian:callMute:<0|1>:<sid>                    zeroed PCM, frames keep flowing
         *   ixian:callSpeaker:<0|1>:<sid>                 route; cap-gated per platform
         *   ixian:callSilence:<sid>                       the LOCAL ring only
         *   ixian:callDeclineMsg:<sid>:<base64url UTF-8>  reject + one normal chat message
         * Every argument is validated: <sid> = hex only, the flag = exactly "0"/"1", the text
         * = base64url (the #1028 decoder, same alphabet guarantee). The message text is never
         * logged. Security gate row: docs/security-handover-gate.md (#1074). */
        private void onCallControl(string url)
        {
            try
            {
                if (url.Equals("ixian:callExpand", StringComparison.Ordinal))
                {
                    setExpanded(true);
                    return;
                }
                if (url.Equals("ixian:callMinimise", StringComparison.Ordinal))
                {
                    setExpanded(false);
                    return;
                }
                string[] parts = url.Split(':');
                string verb = parts.Length > 1 ? parts[1] : "";
                /* ★ #1093: presentation-only signals from the shell (no call state, no side effect beyond the
                 * stage). Digits only; anything else is dropped. */
                if (verb == "callPainted" && parts.Length == 3)
                {
                    if (parts[2].Length <= 18 && long.TryParse(parts[2], System.Globalization.NumberStyles.None, System.Globalization.CultureInfo.InvariantCulture, out long token))
                    {
                        showStage(token, true);
                    }
                    return;
                }
                if (verb == "callCardH" && parts.Length == 3)
                {
#if WINDOWS
                    if (parts[2].Length <= 4 && int.TryParse(parts[2], System.Globalization.NumberStyles.None, System.Globalization.CultureInfo.InvariantCulture, out int h)
                        && h >= 120 && h <= 1600)
                    {
                        bool changed;
                        lock (callLock)
                        {
                            changed = Math.Abs(winCardH - h) >= 1;
                            winCardH = h;
                        }
                        if (changed)
                        {
                            applyStageLayout();
                        }
                    }
#endif
                    return;
                }
                if ((verb == "callMute" || verb == "callSpeaker") && parts.Length == 4)
                {
                    byte[]? sid = parseSession(parts[3]);
                    if (sid == null || (parts[2] != "0" && parts[2] != "1"))
                    {
                        return;
                    }
                    if (verb == "callMute")
                    {
                        VoIPManager.setMuted(sid, parts[2] == "1");
                    }
                    else if (SPlatformUtils.callSpeakerRoute)
                    {
                        /* ★★ B9 (office walk #1084 = #1083 F12: ~0.5 s from the Speaker tap to the button on
                         * Android). The route switch (AudioManager.setCommunicationDevice / the iOS session
                         * override) is a BLOCKING platform call, and it ran here, inside the WebView's
                         * navigation callback on the UI thread — the shell's optimistic flip could not paint
                         * until it returned. It now runs off the UI thread, on ONE serial chain so two quick
                         * taps are applied in the order they were made; C#'s echo still overwrites the flip. */
                        bool wantSpeaker = parts[2] == "1";
                        lock (speakerChainLock)
                        {
                            speakerChain = speakerChain.ContinueWith(_ =>
                            {
                                try { VoIPManager.setSpeaker(sid, wantSpeaker); }
                                catch (Exception ex) { Logging.warn("Call: speaker switch failed: " + ex.GetType().Name); }
                            }, TaskScheduler.Default);
                        }
                    }
                    return;
                }
                if (verb == "callSilence" && parts.Length == 3 && SPlatformUtils.callRings)
                {
                    byte[]? sid = parseSession(parts[2]);
                    if (sid != null)
                    {
                        VoIPManager.silenceRinging(sid);
                    }
                    return;
                }
                if (verb == "callDeclineMsg" && parts.Length == 4)
                {
                    byte[]? sid = parseSession(parts[2]);
                    string? text = decodeCopyPayload(parts[3]);
                    // length is checked AFTER the trim, in rejectCallWithMessage (r1 NIT)
                    if (sid == null || string.IsNullOrEmpty(text))
                    {
                        return;
                    }
                    if (!VoIPManager.rejectCallWithMessage(sid, text))
                    {
                        Logging.warn("Call: decline with a message refused (no unanswered incoming ring on that session).");
                    }
                    return;
                }
            }
            catch (Exception e)
            {
                Logging.warn("Call control failed: " + e.GetType().Name);
            }
        }

        /** Hex session id → bytes, or null. Anything that is not 2..128 hex chars is refused. */
        private static byte[]? parseSession(string hex)
        {
            if (string.IsNullOrEmpty(hex) || hex.Length > 128 || hex.Length % 2 != 0)
            {
                return null;
            }
            foreach (char c in hex)
            {
                bool ok = (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
                if (!ok)
                {
                    return null;
                }
            }
            return Crypto.stringToHash(hex);
        }

        /** Card ⇄ full call screen. Presentation only; a ring is never affected. */
        private static void setExpanded(bool on)
        {
            bool apply;
            CallPage? page;
            lock (callLock)
            {
                if (current == null || surfaceMode == "ring")
                {
                    return;
                }
                expanded = on;
                apply = surfaceMode != (on ? "full" : "bar");
                page = current;
            }
            if (apply)
            {
                /* ★★ B6 (office walk #1084 = #1083 F10, "card → full view choppy" on iPhone, Android and
                 * Windows). The ORDER was the mechanism: setMode snapped the native stage to its new size
                 * at once, while the shell only learned the new mode from broadcastCallState on a pool
                 * thread (it reads the avatar file first) — so for those frames the OLD view was stretched
                 * over the NEW geometry (the 64px card drawn full-window, or the full screen squeezed into
                 * the card), then the new view faded in on top. Now the shell swaps FIRST: the mode is
                 * recorded and this page's cached state is pushed on the UI thread (no file read), so the
                 * new view mounts at opacity 0 (call-screen.css / callbar.css data-open fades) — and the
                 * stage geometry follows one short beat later, while the new view is still transparent.
                 * The broadcast below still runs; it re-pushes the same state. */
                string mode = on ? "full" : "bar";
                MainThread.BeginInvokeOnMainThread(() =>
                {
                    string from;
                    lock (callLock)
                    {
                        if (current != page || surfaceMode == "ring")
                        {
                            return;   // the call ended or a ring replaced it meanwhile
                        }
                        from = surfaceMode;   // (#46 r2 NIT) the REAL previous mode — a broadcast may already have set it
                        surfaceMode = mode;
                    }
                    beginStageSwap(page, true, from);   // ★★ B6 (#1093): hidden → new view → new geometry → painted → fade in
                });
            }
            // #46 r2 MINOR-7: showBar reads the avatar file before it dispatches — never on the UI thread
            System.Threading.Tasks.Task.Run(() => SpixiContentPage.broadcastCallState());
        }

        /** ★ #1074: hardware back while the RING is up → the shell's `callBack` (closes the
         *  decline-with-message sheet if one is open; a ring without a sheet stays). */
        public static void forwardBackToShell()
        {
            CallPage? page;
            lock (callLock)
            {
                page = current;
            }
            if (page != null && page.shellReady)
            {
                Utils.sendUiCommand(page, "callBack");
            }
        }

        /** Hardware back on the expanded call screen = minimise (the Android dialer rule).
         *  Returns true when it consumed the press. */
        public static bool minimiseOnBack()
        {
            lock (callLock)
            {
                if (current == null || surfaceMode != "full")
                {
                    return false;
                }
            }
            setExpanded(false);
            return true;
        }

        private void onLoad()
        {
#if IOS
            // ★ #1074 (#46 r1 MINOR-6): the in-place stage never gets OnAppearing, so the iOS
            // keyboard observer (call.html is in KEYBOARD_INSET_SHELLS) is attached here — the
            // decline-with-message field must not sit under the keyboard.
            attachKeyboardInsetObserver();
#endif
            shellReady = true;
#if WINDOWS
            winCompactSent = "";   // ★ #1094 (#46 r1 NIT): a (re)booted document has no compact flag — the next layout resends it
#endif
            pushState();           // deliver the pending state before the reveal
            revealSurface(this);   // shell signaled ready → show (beats the timeout)
        }

        private void setState(string kind, string nick, string avatar, string text, long started, string session, string address)
        {
            stateKind = kind;
            stateName = nick ?? "";
            stateAvatar = avatar ?? "";
            stateText = text ?? "";
            stateStarted = started;
            stateSession = session ?? "";
            stateAddress = address ?? "";
            pushState();
        }

        private void pushState()
        {
            if (!shellReady || stateKind == "")
            {
                return;
            }
            /* ★ #1074: what this platform can do (no dead buttons) + the live control state,
             * read from VoIPManager every time — the buttons show what C# did. Pushed BEFORE
             * setCallUi: the shell renders on every push, so the state it renders the new
             * kind with must already be current (a ring→in-call push must not paint the card
             * for a frame on its way to the expanded screen). */
            Utils.sendUiCommand(this, "setCallCaps",
                "1",                                            // mute: all four platforms (zeroed PCM)
                SPlatformUtils.callSpeakerRoute ? "1" : "0",    // speaker route
                SPlatformUtils.callRings ? "1" : "0",           // silence the local ring
                "1");                                           // decline with a message
            bool isExpanded;
            lock (callLock)
            {
                isExpanded = surfaceMode == "full";
            }
            Utils.sendUiCommand(this, "setCallAudio",
                VoIPManager.currentCallMuted ? "1" : "0",
                VoIPManager.currentCallSpeaker ? "1" : "0",
                VoIPManager.currentCallRingSilenced ? "1" : "0",
                isExpanded ? "1" : "0",
                VoIPManager.currentCallRingGen.ToString(System.Globalization.CultureInfo.InvariantCulture));
            Utils.sendUiCommand(this, "setCallUi", stateKind, stateName, stateAvatar, stateText, stateStarted.ToString(), stateSession, stateAddress);
        }

        /* ————— static presenter —————————————————————————————————————————————— */

        /** True while the RING is up — HomePage swallows hardware back then
         *  (Accept/Decline/timeout are the only exits, like the lock). */
        public static bool isRingPresented()
        {
            lock (callLock)
            {
                return current != null && surfaceMode == "ring";
            }
        }

        /** Incoming call → full-window ring. Identity comes from the Friend —
         *  always right, no shell roster involved. Idempotent per state. */
        public static void showRing(Friend friend, byte[] session_id)
        {
            if (friend == null || session_id == null)
            {
                return;
            }
            string nick = friend.nickname;
            string address = friend.walletAddress.ToString();
            string session = Crypto.hashToString(session_id);
            // Review MINOR-4: imageToDataUri does FILE I/O (File.Exists + ReadAllBytes +
            // Base64). Do it HERE — off the main thread — not inside the lambda: a
            // cold-cache avatar read must not block the UI thread exactly as the ring
            // has to paint.
            string avatar = Utils.imageToDataUri(IxianHandler.localStorage.getAvatarPath(address));
            MainThread.BeginInvokeOnMainThread(() =>
            {
                CallPage? page = ensureSurface(true);
                if (page == null)
                {
                    return;
                }
                setMode("ring");
                page.setState("ring", nick, avatar, SpixiLocalization._SL("global-call-incoming"), 0, session, address);
            });
        }

        /** Dialing / in-call → the card or the expanded view (#1074). text is the C#-localized line the old
         *  broadcastCallBar carried; started==0 ⇒ dialing (no timer). */
        public static void showBar(byte[] session_id, string text, long call_started_time)
        {
            if (session_id == null)
            {
                return;
            }
            string session = Crypto.hashToString(session_id);
            // Snapshot the contact + its avatar OFF the main thread (review MINOR-4/N-9):
            // one read, so the identity can't be paired with a different call's text, and
            // the data-URI file I/O never lands on the UI thread.
            Friend? f = VoIPManager.currentCallContact;
            string nick = f != null ? f.nickname : "";
            string address = f != null ? f.walletAddress.ToString() : "";
            string avatar = f != null ? Utils.imageToDataUri(IxianHandler.localStorage.getAvatarPath(address)) : "";
            MainThread.BeginInvokeOnMainThread(() =>
            {
                // An answered ring presented via the MODAL fallback cannot morph into
                // a strip (the modal covers the window) — tear it down. Review MAJOR-4:
                // this used to call hideSurface() and then ensureSurface() in the SAME
                // main-thread turn — but hideSurface's view work is DISPATCHED (it never
                // runs inline), so ensureSurface saw the dying modal, re-used it as the
                // "bar" (a full-window cover), and the queued teardown then left the
                // answered call with NO surface at all. hideSurface now clears its state
                // synchronously and RE-ASSERTS the current VoIP state once the modal has
                // really popped — which re-enters here with wasModal == false and stages
                // the strip in place. So: hand off and return.
                bool wasModal;
                lock (callLock)
                {
                    wasModal = current != null && modalFallback;
                }
                if (wasModal)
                {
                    hideSurface();
                    return;
                }
                CallPage? page = ensureSurface(false);
                if (page == null)
                {
                    // host covered by a legacy page → no strip there (logged dial);
                    // the call itself is unaffected and re-asserts on return.
                    return;
                }
                bool full;
                lock (callLock)
                {
                    if (expandedSession != session)
                    {
                        // A NEW call picks the platform default once; later pushes keep the user's choice.
                        expandedSession = session;
                        expanded = expandByDefault;
                    }
                    full = expanded;
                }
                setMode(full ? "full" : "bar");
                page.setState(call_started_time > 0 ? "incall" : "dialing", nick, avatar, text ?? "", call_started_time, session, address);
            });
        }

        /** Call over (any path: accept-elsewhere teardown, decline, remote
         *  hang-up, #265 ring timeout, error) → dismiss + dispose. */
        public static void hideSurface()
        {
            // Review MAJOR-4: clear the STATE synchronously (it is callLock-guarded and
            // touches no view), so a caller that hides-then-re-presents in the same turn
            // — and a new call admitted from a network thread while the teardown is still
            // queued — can never re-use the dying page. Only the VIEW work is dispatched.
            CallPage? page;
            Border? stage;
            Grid? grid;
            bool wasModal;
            lock (callLock)
            {
                // ★ #1074 (#46 r1 MINOR-4): `expanded`/`expandedSession` are NOT reset here — every lock
                // hides the surface, and the user's minimise must survive the unlock. A NEW call
                // re-picks the default because its session id differs (showBar).
                page = current;
                stage = callStage;
                grid = callHostGrid;
                wasModal = modalFallback;
                current = null;
                callStage = null;
                callHostGrid = null;
                modalFallback = false;
                presented = false;
                surfaceMode = "";
            }
            if (page == null)
            {
                return;
            }
            MainThread.BeginInvokeOnMainThread(async () =>
            {
                try
                {
                    if (wasModal)
                    {
                        INavigation? rootNav = (Application.Current?.MainPage as NavigationPage)?.Navigation;
                        if (rootNav != null && rootNav.ModalStack.Contains(page))
                        {
                            // ★ review MAJOR-2: PopModalAsync pops the TOP of the modal
                            // stack, NOT this page. If anything sits above us, popping
                            // would destroy IT — and the only thing that can (a LOCK)
                            // would then be dismissed by a remote hang-up, un-authing the
                            // app. lockUp()+App.OnResume make that unreachable; this guard
                            // is the fail-closed belt: never pop a modal we don't own.
                            if (rootNav.ModalStack.LastOrDefault() == page)
                            {
                                await rootNav.PopModalAsync(false);
                            }
                            else
                            {
                                Logging.error("Call surface: another modal is on top — refusing to pop it. (Unreachable by construction: lockUp() + App.OnResume keep the call surface and any lock mutually exclusive.)");
                                page.Dispose();
                                return;
                            }
                        }
                        page.Dispose();
                        // The modal is really gone now: re-assert the CURRENT VoIP state.
                        // A call that is still live (the answered-ring → strip morph) gets
                        // its in-place surface; a call that ended re-enters hideSurface and
                        // no-ops (current == null). This is what makes showBar's wasModal
                        // hand-off correct.
                        SpixiContentPage.broadcastCallState();
                        return;
                    }
                    if (grid != null)
                    {
                        grid.SizeChanged -= onHostGridSizeChanged;
                    }
                    if (stage != null)
                    {
                        // #229b pattern: hide first (property flip), let the frame
                        // commit, then detach + dispose the WebView.
                        Microsoft.Maui.Controls.ViewExtensions.CancelAnimations(stage);   // ★ #1093 (#46 r1 NIT): a reveal fade must not bring a dying stage back
                        stage.Opacity = 0;
                        setStageInput(stage, false);
                    }
                    Task.Delay(100).ContinueWith(_ => MainThread.BeginInvokeOnMainThread(() =>
                    {
                        try
                        {
                            if (grid != null && stage != null)
                            {
                                grid.Children.Remove(stage);
                                if (stage.Content is ContentView innerView)
                                {
                                    innerView.Content = null;
                                }
                                stage.Content = null;
                            }
                            page.Dispose();
                        }
                        catch (Exception ex)
                        {
                            Logging.error("Call surface teardown failed: " + ex);
                        }
                    }));
                }
                catch (Exception ex)
                {
                    Logging.error("Call surface hide failed: " + ex);
                }
            });
        }

        /** ★ True while the app is LOCKED, in any of the three shapes a lock takes:
         *  in place (#230, modalOverlayOp) · pushed modally (pushModalLoaded's fallback,
         *  presentPlainModal, App.OnResume's own PushModalAsync) · the boot lock (the
         *  root page when app-lock is on). A call surface must never be presented over
         *  any of them — see the ★ LOCK vs CALL block in the class doc. */
        private static bool lockUp(INavigation? rootNav)
        {
            // isLockStaging (#270 loop r2): a lock that is LOADING but not presented yet
            // is invisible to all three checks below — and that window is ~1.3s wide
            // (App.OnResume / SettingsPage confirm). A ring admitted there would take the
            // modal fallback and end up UNDER the lock, where hideSurface can no longer
            // pop it (top-of-stack rule) ⇒ a dead modal surfaces after the unlock.
            if (hasModalOverlay() || isLockStaging())
            {
                return true;
            }
            if (rootNav == null)
            {
                return false;
            }
            try
            {
                return rootNav.ModalStack.Any(p => p is LockPage)
                    || rootNav.NavigationStack.LastOrDefault() is LockPage;
            }
            catch (Exception ex)
            {
                Logging.warn("lockUp: " + ex);
                return true;   // fail CLOSED — a lock we cannot rule out wins
            }
        }

        // main thread only. allowModalFallback: the RING must present even when a
        // legacy page covers the host (modal push); the BAR must not (see class doc).
        private static CallPage? ensureSurface(bool allowModalFallback)
        {
            lock (callLock)
            {
                if (current != null)
                {
                    return current;
                }
            }
            SpixiContentPage? host = getOverlayHost();
            Grid? grid = host?.Content as Grid;
            INavigation? rootNav = (Application.Current?.MainPage as NavigationPage)?.Navigation;

            // ★ review MAJOR-1: never present ANY call surface while the app is locked.
            // The in-place stage would be ordered under the lock by ZIndex, but the modal
            // fallback below sits ABOVE the whole page tree — it would have covered the
            // lock with the caller's identity + Accept/Decline. Fail closed, and re-arm
            // the one-shot refresh flag so the very next UI tick after the unlock presents
            // the ring/bar (the call itself keeps running + ringing meanwhile).
            if (lockUp(rootNav))
            {
                /* ★ Session AA (#894) — THIS REFUSAL USED TO BE SILENT, and a silent refusal
                 * here is indistinguishable from the report it most likely explains: the callee
                 * logs "SND call-tone: ringing", no call surface appears on EITHER device, and
                 * nothing in ixian.log says why. Every other branch of ensureSurface already
                 * names itself (staging failed · host covered · modal fallback failed); this one
                 * did not, so the diagnostic table had no row that could ever match and sent the
                 * reader past the lock it had flagged two rows earlier.
                 * ⚠ It is also the branch most worth seeing: lockUp() is true for a STRANDED
                 * lock — exactly what #505's sweepStrandedCover() exists to heal — and for the
                 * ~1.3 s isLockStaging() window, and its test is NOT App.isAppLockActive (the
                 * flag the ring gate uses), so the two can disagree.
                 * Diagnostic only: no behaviour change, both predicates are side-effect free.
                 * Both false in the line below = the rootNav ModalStack/NavigationStack test is
                 * what matched. Retire this line once ③ is settled. */
                Logging.info("Call surface: REFUSED, a lock is up or staging — modalOverlay={0} lockStaging={1} (#894)",
                    hasModalOverlay(), isLockStaging());
                UIHelpers.refreshAppRequests = true;
                return null;
            }

            bool hostOnTop = host != null && rootNav != null
                && rootNav.NavigationStack.LastOrDefault() == host
                && rootNav.ModalStack.Count == 0
                && !hasModalOverlay();   // never stage anything over an in-place lock (#233)

            if (grid != null && hostOnTop)
            {
                CallPage page = new CallPage();
                View? content = page.Content;
                if (content == null)
                {
                    /* ★ Session AA (#894): found by the walk pin, not by reading — this refusal was
                     * silent too, and it is the same class as the lock one: the call runs, the
                     * callee rings, and no surface appears with nothing in the log to say why.
                     * Reachable if the XAML ever fails to materialise a Content. */
                    Logging.error("Call surface: REFUSED, the page has no Content — the XAML did not materialise (#894)");
                    return null;
                }
                /* ★ #1074 (#46 r1 MAJOR-1): a Border has no CascadeInputTransparent (it is a View,
                 * not a Layout), so the input gate lives on an INNER ContentView that does — the
                 * shape the stage had before #1074, now wrapped by the rounding Border. Every
                 * toggle goes through setStageInput, which sets BOTH, so a hidden or fading stage
                 * can never take a tap on any platform. */
                ContentView inner = new ContentView
                {
                    InputTransparent = true,
                    CascadeInputTransparent = true,
                    Padding = new Thickness(0),
                    Shadow = permanentContainerShadow(),   // ★ #1095: see cardShadowFor
                };
                Border stage = new Border
                {
                    Opacity = 0,                 // revealed on shell-ready (or the timeout)
                    InputTransparent = true,
                    BackgroundColor = stageGround,   // ★ #1074: the dark call ground (phone) · ★ #1080 F8: transparent on desktop — call.html paints the scrim / card
                    StrokeThickness = 0,
                    Stroke = Colors.Transparent,
                    Padding = new Thickness(0),
                    StrokeShape = new Microsoft.Maui.Controls.Shapes.RoundRectangle { CornerRadius = new CornerRadius(0) },
                    ZIndex = Z_CALL_SURFACE,
                    Shadow = cardShadowFor("ring"),   // ★ #1095: phones — a NON-NULL shadow from birth (see cardShadowFor)
                };
                try
                {
                    page.Content = null;
                    inner.Content = content;
                    stage.Content = inner;
                    if (grid.ColumnDefinitions.Count > 1)
                    {
                        Grid.SetColumnSpan(stage, grid.ColumnDefinitions.Count);
                    }
                    if (grid.RowDefinitions.Count > 1)
                    {
                        Grid.SetRowSpan(stage, grid.RowDefinitions.Count);
                    }
                    grid.Children.Add(stage);    // WebView gets a handler → boots
#if ANDROID
                    stage.Handler?.UpdateValue(nameof(IView.Opacity));   // ★ #1095 (#46 r2): put the initial 0 on the permanent wrapper too
#endif
                    grid.SizeChanged += onHostGridSizeChanged;
                }
                catch (Exception ex)
                {
                    Logging.error("Call surface staging failed: " + ex);
                    try { page.Content = content; } catch { }
                    try { page.Dispose(); } catch { }
                    return null;
                }
                lock (callLock)
                {
                    current = page;
                    callStage = stage;
                    callHostGrid = grid;
                    modalFallback = false;
                    presented = false;
                }
                // ready-or-timeout reveal (#229 recipe): call.html is tiny — 1500ms cap.
                // Review MINOR-6: scoped to THIS page — an un-scoped timer from a previous
                // call could otherwise reveal the NEXT call's stage before its shell booted
                // (an opaque cover with no Accept/Decline).
                CallPage owner = page;
                Task.Delay(1500).ContinueWith(_ => revealSurface(owner));
                return page;
            }

            if (!allowModalFallback || rootNav == null)
            {
                // A legacy page (money flow / scan / mini-app) covers the host: the BAR is
                // deliberately not presented there (class doc dial — those pages had the
                // legacy strip and are the last §5 repoint targets). Re-arm the refresh
                // flag like the lockUp branch does, so the strip appears the moment the
                // legacy page goes away instead of depending on an OnAppearing landing.
                Logging.warn("Call surface: host covered/unavailable — bar not presented.");
                UIHelpers.refreshAppRequests = true;
                return null;
            }

            // LEGACY-PAGE / early-boot fallback: a real modal push (lock precedent) —
            // ModalStack sits above the page tree, so the RING is never invisible.
            CallPage modalPage = new CallPage();
            lock (callLock)
            {
                current = modalPage;
                callStage = null;
                callHostGrid = null;
                modalFallback = true;
                presented = true;
            }
            try
            {
                _ = rootNav.PushModalAsync(modalPage, Config.defaultXamarinAnimations);
            }
            catch (Exception ex)
            {
                Logging.error("Call surface modal fallback failed: " + ex);
                lock (callLock)
                {
                    current = null;
                    modalFallback = false;
                    presented = false;
                    surfaceMode = "";
                }
                try { modalPage.Dispose(); } catch { }
                return null;
            }
            return modalPage;
        }

        private static void setMode(string mode)
        {
            bool changed;
            string from;
            CallPage? page;
            lock (callLock)
            {
                from = surfaceMode;
                changed = surfaceMode != mode;
                surfaceMode = mode;
                page = current;
            }
            if (changed)
            {
                beginStageSwap(page, false, from);   // ★★ B6 (#1093): the caller pushes the state right after (setState)
            }
        }

        /* ★★ B6 (#1093, #46 r1 MAJOR-2): only a swap that CHANGES the stage's size is hidden. ring ⇄ full on a phone
         * or the Mac is full-window both ways — hiding it showed the app under an answered call for ~150 ms. On
         * Windows every call mode is its own card size (ring card, full card, bar card), so every change hides. */
        private static bool swapResizes(string from, string to)
        {
            if (from == to)
            {
                return false;
            }
#if WINDOWS
            return true;
#else
            return from == "bar" || to == "bar";
#endif
        }

        /* ★★ B6 (#1093) — the HIDDEN swap. Main thread. A stage that is not presented yet only takes its
         * geometry (revealSurface waits for the paint itself); a presented one goes to ~0 opacity, takes the
         * new view (pushState, when the caller does not push right after) and the new geometry, and comes back
         * on the shell's painted signal for this token (or the timeout). */
        private static void beginStageSwap(CallPage? page, bool pushState, string fromMode)
        {
            Border? stage;
            bool shown;
            string mode;
            long token;
            lock (callLock)
            {
                stage = callStage;
                shown = presented;
                mode = surfaceMode;
                token = ++swapToken;   // also retires a swap still waiting for its paint
            }
            if (stage == null || page == null || !shown)
            {
                if (pushState && page != null)
                {
                    try { page.pushState(); } catch (Exception ex) { Logging.warn("CallPage: state push failed: " + ex.GetType().Name); }
                }
                applyStageLayout();
                return;
            }
            if (!swapResizes(fromMode, mode))
            {
                // a same-size swap (ring ⇄ full off Windows): in place, never hidden
                if (pushState)
                {
                    try { page.pushState(); } catch (Exception ex) { Logging.warn("CallPage: state push failed: " + ex.GetType().Name); }
                }
                applyStageLayout();
                if (stage.Opacity < 1)
                {
                    /* (#46 r2 NIT) it superseded a resizing swap that is still hidden (or fading in): that stage has not
                     * painted its new size yet — reveal on THIS token's paint, never at once. */
                    requestPaint(page, token, mode);
                }
                return;
            }
            Microsoft.Maui.Controls.ViewExtensions.CancelAnimations(stage);
            stage.Opacity = swapHiddenOpacity;
            setStageInput(stage, false);
            if (pushState)
            {
                try { page.pushState(); } catch (Exception ex) { Logging.warn("CallPage: state push failed: " + ex.GetType().Name); }
            }
            applyStageLayout();
            requestPaint(page, token, mode);
        }

        /** Ask the shell to say when it has painted `mode` at the stage's new size; reveal on the answer or
         *  the timeout. Posted, so it runs AFTER the state pushes and the layout queued in this turn. */
        private static void requestPaint(CallPage page, long token, string mode)
        {
            lock (callLock)
            {
                swapStartedMs = swapClock.ElapsedMilliseconds;   // ★ #1095 [CALLSWAP]
            }
            MainThread.BeginInvokeOnMainThread(() =>
            {
                if (page.shellReady)
                {
                    /* (#46 r2 MAJOR-2) Windows: the most a card can be in this window (applyStageLayout clamps to it) —
                     * the shell waits for EXACTLY min(its card height, this), never for the first resize, which can
                     * still be the previous mode's card. 0 = no clamp (every other platform). */
                    string maxH = "0";
#if WINDOWS
                    Grid? g;
                    lock (callLock)
                    {
                        g = callHostGrid;
                    }
                    // (#46 r3 NIT) before the first arrange applyStageLayout clamps to its own fallback — send the same one
                    double gh = g != null && g.Height > 0 ? g.Height : winCardEstimateDip + 48;
                    maxH = ((int)Math.Floor(gh - 16)).ToString(System.Globalization.CultureInfo.InvariantCulture);
#endif
                    Utils.sendUiCommand(page, "callAwaitPaint", token.ToString(System.Globalization.CultureInfo.InvariantCulture), mode, maxH);
                }
            });
            Task.Delay(swapRevealTimeoutMs).ContinueWith(_ => showStage(token));
        }

        /* ★ #1095 (Damir, Android: "full → card is worse — the SHADOW shows for half a second, then the card").
         * MECHANISM (MAUI Android, ViewExtensions.NeedsContainer): a view with a Shadow, a Clip or InputTransparent=true
         * gets a WrapperView CONTAINER, and adding/removing it RE-PARENTS the native view — and a container created
         * mid-swap is not given the view's alpha. The hidden swap set alpha 0.01, then InputTransparent created a
         * container at alpha 1, then the card branch set the Shadow on it: a full-strength bare shadow over a 0.01 card,
         * for the whole wait (and every toggle detached / re-attached the WebView inside).
         * FIX (Android): the stage and its inner view carry a NON-NULL shadow from birth, so the container is permanent —
         * never added or removed again — and every later Opacity (0.01, the fade, 1) lands on the wrapper, so the shadow
         * hides WITH the card; the input toggles no longer re-parent the WebView. At connect MAUI applies the initial
         * Opacity = 0 to the INNER view only (MapOpacity is skipped while connecting), so ensureSurface re-maps Opacity
         * once the stage is in the grid (#46 r2). The shadow has zero opacity outside the minimised card. iPhone: the
         * pre-#1095 shape. Desktop: no shadow at all (the card draws its own). */
        private static Microsoft.Maui.Controls.Shadow? cardShadowFor(string mode)
        {
#if ANDROID
            // (#46 r3 NIT) outside the card the shadow is the zero-size shape: nothing to recompute on every layout
            return mode == "bar"
                ? new Microsoft.Maui.Controls.Shadow { Brush = Brush.Black, Opacity = 0.28f, Radius = 20, Offset = new Point(0, 6) }
                : new Microsoft.Maui.Controls.Shadow { Brush = Brush.Black, Opacity = 0f, Radius = 0, Offset = new Point(0, 0) };
#elif IOS
            // (#46 r2) the iPhone keeps its pre-#1095 shape: the card shadow on the bar, none on ring/full
            return mode == "bar" ? new Microsoft.Maui.Controls.Shadow { Brush = Brush.Black, Opacity = 0.28f, Radius = 20, Offset = new Point(0, 6) } : null;
#else
            return null;
#endif
        }

        /** ★ #1095 (Android only): a shadow that draws NOTHING — it exists only so the inner input gate has a permanent
         *  MAUI container, so toggling its InputTransparent never re-parents (detaches / re-attaches) the WebView inside.
         *  Do not remove it as dead weight. */
        private static Microsoft.Maui.Controls.Shadow? permanentContainerShadow()
        {
#if ANDROID
            return new Microsoft.Maui.Controls.Shadow { Brush = Brush.Black, Opacity = 0f, Radius = 0, Offset = new Point(0, 0) };
#else
            return null;
#endif
        }

        /** The painted signal (or the timeout) for `token`: fade the stage in. A stale token is a no-op. */
        private static void showStage(long token, bool painted = false)
        {
            MainThread.BeginInvokeOnMainThread(() =>
            {
                Border? stage;
                string mode;
                long waited;
                lock (callLock)
                {
                    if (token != swapToken || !presented || callStage == null)
                    {
                        return;
                    }
                    swapToken++;   // consumed: the late timeout (or a second signal) for this swap does nothing
                    stage = callStage;
                    mode = surfaceMode;
                    waited = swapClock.ElapsedMilliseconds - swapStartedMs;
                }
                Logging.info("[CALLSWAP] reveal mode={0} via={1} t={2}ms", mode, painted ? "painted" : "timeout", waited);
                setStageInput(stage, true);
                Microsoft.Maui.Controls.ViewExtensions.CancelAnimations(stage);
                _ = Microsoft.Maui.Controls.ViewExtensions.FadeTo(stage, 1, swapFadeMs, Easing.CubicOut);
            });
        }

        private static void revealSurface(CallPage? owner = null)
        {
            MainThread.BeginInvokeOnMainThread(() =>
            {
                Border? stage;
                lock (callLock)
                {
                    if (current == null || presented)
                    {
                        return;
                    }
                    if (owner != null && owner != current)
                    {
                        return;   // a previous call's timer — not ours to reveal (MINOR-6)
                    }
                    presented = true;
                    stage = callStage;
                }
                if (stage == null)
                {
                    return;
                }
                applyStageLayout();
                CallPage? page = owner;
                if (page != null && page.shellReady)
                {
                    /* ★★ B6 (#1093): the shell is up — reveal on its painted signal at the stage's size, like a
                     * swap (on Windows that is also the card height it reports first). */
                    long token;
                    string mode;
                    lock (callLock)
                    {
                        token = ++swapToken;
                        mode = surfaceMode;
                    }
                    stage.Opacity = swapHiddenOpacity;
                    requestPaint(page, token, mode);
                    return;
                }
                setStageInput(stage, true);   // the 1.5 s timeout with no shell: show what there is
                stage.Opacity = 1;
            });
        }

        /** ★ #1074 (#46 r1 MAJOR-1): the ONE input toggle for the stage — the Border AND the
         *  inner cascading ContentView together (see ensureSurface). */
        private static void setStageInput(Border stage, bool accepts)
        {
            stage.InputTransparent = !accepts;
            if (stage.Content is ContentView innerView)
            {
                innerView.InputTransparent = !accepts;
            }
        }

        private static void onHostGridSizeChanged(object? sender, EventArgs e)
        {
            applyStageLayout();   // re-assert the strip after a window/pane resize
        }

        /* ★ #926 (r-review MINOR-4) → #1074: the top and side insets are pushed live (#924) and the
         * minimised card is PLACED from them (below TopInsetDip, beside the side insets) —
         * re-assert the stage whenever they move so a rotation cannot leave the card under the
         * status bar or a side nav bar. */
        public static void relayoutStageForInsets()
        {
            applyStageLayout();
        }

        private static void applyStageLayout()
        {
            MainThread.BeginInvokeOnMainThread(() =>
            {
                Border? stage;
                Grid? hostGrid;
                string mode;
                lock (callLock)
                {
                    stage = callStage;
                    hostGrid = callHostGrid;
                    mode = surfaceMode;
                }
                if (stage == null)
                {
                    return;
                }
                // Review MINOR-5: the strip used to be derived from grid.Height via a
                // bottom margin — but VisualElement.Height is -1/NaN before the first
                // arrange, which collapsed the margin to zero and left the OPAQUE,
                // input-eating stage covering the WHOLE window in "bar" mode. Size the
                // stage directly instead: no measurement dependency, nothing to race.
                if (mode == "bar")
                {
                    /* ★ #1074 (call premium): the minimised call is a floating CARD, not a
                     * full-bleed strip — it sits BELOW the app's top bar (status-bar inset +
                     * the 56dip bar + a gap), so the top bar, the bottom nav and every tab stay
                     * in reach during a call (Damir). Phone: full width minus a side inset.
                     * Desktop: a fixed-width card at the top right. The native Border rounds
                     * the corners; call.html paints the same dark ground edge to edge.
                     * The platform inset lookup below is the one the old strip used (#1036–
                     * #1038 on the Mac, AND-7 on Android) — the card now sits UNDER it
                     * instead of growing by it, so call.html pads nothing in card mode. */
                    double topInset = 0;
                    #if IOS || MACCATALYST
                    // The host grid starts at the SCREEN top on iOS (edge-to-edge) and the Mac
                    // window can carry a title-bar inset (#1035/#1036) — the card is placed BELOW
                    // that inset and below the app's top bar. call.html pads nothing in card mode.
                    var win = UIKit.UIApplication.SharedApplication.ConnectedScenes
                        .OfType<UIKit.UIWindowScene>()
                        .SelectMany(s => s.Windows)
                        .FirstOrDefault(w => w.IsKeyWindow);
                    /* ★ #1037 (#46 r3 MINOR-2): on the Mac NO window is key while another app is active —
                     * a call answered while another app is active must still place the card below the pushed inset.
                     * ★ #1038 (r4 MINOR): the fallback is the SAME lookup the M6 push uses
                     * (SpixiContentPage: MAUI's first window's platform view), not the first UIWindow of
                     * ConnectedScenes — that list's order is undefined and can hold helper windows, so
                     * the strip and --safe-top could have come from two different windows. */
                    if (win == null)
                    {
                        win = Application.Current?.Windows?.FirstOrDefault()?.Handler?.PlatformView as UIKit.UIWindow;
                    }
                    if (win != null)
                    {
                        topInset = win.SafeAreaInsets.Top;
                    }
#if MACCATALYST
                    /* ★★ B2/B5 (office walk #1084): on the Mac the native title bar sits ABOVE the
                     * app's content (the window inset is NOT part of this grid), so the window's
                     * inset placed the card a title bar too low. Use the host grid's MEASURED
                     * overlap with that inset — the same helper the shells' --safe-top push uses.
                     * Unknown (grid not in a window yet) keeps the window value above. */
                    double gridOverlap = SpixiContentPage.macTitlebarOverlap(hostGrid?.Handler?.PlatformView as UIKit.UIView);
                    if (gridOverlap >= 0)
                    {
                        topInset = gridOverlap;
                    }
#endif
#elif ANDROID
                    /* AND-7 (#401): MainActivity does not pad the root view at the top, so this
                     * stage starts at the SCREEN top — the card is placed below the status-bar
                     * inset (and the app's top bar), never under the clock. */
                    topInset = Spixi.MainActivity.TopInsetDip;
#endif
                    double top = topInset + appTopBarDip + cardGapDip;
                    stage.VerticalOptions = LayoutOptions.Start;
#if WINDOWS || MACCATALYST
                    /* ★ #1080 F9: the transparent stage is the card PLUS a shadow margin on every side; call.html
                     * draws the rounded card inset by --call-card-pad with its own shadow (WebView2 ignores a
                     * Border's clip, so the native rounding could never reach it). No native shape/shadow here. */
                    double pad = cardShadowPadDip;
                    double avail = hostGrid != null && hostGrid.Width > 0 ? hostGrid.Width - (2 * 16) : cardWidthDip;
                    stage.HeightRequest = cardHeightDip + (2 * pad);
                    stage.StrokeShape = new Microsoft.Maui.Controls.Shapes.RoundRectangle { CornerRadius = new CornerRadius(0) };
                    stage.Shadow = null;
                    stage.HorizontalOptions = LayoutOptions.End;
                    stage.WidthRequest = Math.Max(240, Math.Min(cardWidthDip, avail)) + (2 * pad);
                    stage.Margin = new Thickness(0, Math.Max(0, top - pad), Math.Max(0, 16 - pad), 0);
#else
                    stage.HeightRequest = cardHeightDip;
                    stage.StrokeShape = new Microsoft.Maui.Controls.Shapes.RoundRectangle { CornerRadius = new CornerRadius(cardRadiusDip) };
                    stage.Shadow = cardShadowFor("bar");   // ★ #1095: never null on a phone — no container add/remove
                    double sideL = cardSideDip, sideR = cardSideDip;
#if ANDROID
                    // #46 r1 MINOR-9: a landscape phone puts the nav bar / cutout on a SIDE
                    sideL += Spixi.MainActivity.LeftInsetDip;
                    sideR += Spixi.MainActivity.RightInsetDip;
#endif
                    stage.HorizontalOptions = LayoutOptions.Fill;
                    stage.WidthRequest = -1;
                    stage.Margin = new Thickness(sideL, top, sideR, 0);
#endif
                }
                else
                {
                    // ring + the expanded call ("full"): full-window, square, no shadow.
                    stage.VerticalOptions = LayoutOptions.Fill;
                    stage.HorizontalOptions = LayoutOptions.Fill;
                    stage.HeightRequest = -1;
                    stage.WidthRequest = -1;
                    stage.StrokeShape = new Microsoft.Maui.Controls.Shapes.RoundRectangle { CornerRadius = new CornerRadius(0) };
                    stage.Shadow = cardShadowFor(mode);   // ★ #1095: phones keep a zero-opacity shadow (the container stays); desktop null
                    stage.Margin = new Thickness(0);
                }
#if WINDOWS
                /* ★★ B4/B5 (#1093, see winScrim): the WebView2 cannot be see-through, so it is only ever card-sized.
                 * bar: the stage above IS the card (pad 0) → the WebView fills it, no ground around it.
                 * ring / full: the stage paints the native scrim over the app and the WebView sits centred at
                 * the card's size (width fixed here, height reported by call.html — ixian:callCardH). */
                if (stage.Content is ContentView winInner)
                {
                    if (mode == "bar")
                    {
                        stage.BackgroundColor = Colors.Transparent;
                        winInner.HorizontalOptions = LayoutOptions.Fill;
                        winInner.VerticalOptions = LayoutOptions.Fill;
                        winInner.WidthRequest = -1;
                        winInner.HeightRequest = -1;
                    }
                    else
                    {
                        double gw = hostGrid != null && hostGrid.Width > 0 ? hostGrid.Width : winCardWidthDip + 48;
                        double gh = hostGrid != null && hostGrid.Height > 0 ? hostGrid.Height : winCardEstimateDip + 48;
                        double ch;
                        lock (callLock)
                        {
                            ch = winCardH;
                        }
                        stage.BackgroundColor = winScrim;
                        winInner.HorizontalOptions = LayoutOptions.Center;
                        winInner.VerticalOptions = LayoutOptions.Center;
                        winInner.WidthRequest = Math.Max(240, Math.Min(winCardWidthDip, gw - 48));
                        winInner.HeightRequest = Math.Max(120, Math.Min(ch > 0 ? ch : winCardEstimateDip, gh - 16));   // (#46 r1 M4) a short window clamps the card; call.html scrolls it then
                    }
                }
                CallPage? groundPage;
                lock (callLock)
                {
                    groundPage = current;
                }
                groundPage?.applyWinGround();
                if (groundPage != null && groundPage.shellReady && hostGrid != null && hostGrid.Height > 0)
                {
                    string compact = hostGrid.Height < winCompactBelowDip ? "1" : "0";
                    if (groundPage.winCompactSent != compact)
                    {
                        groundPage.winCompactSent = compact;
                        Utils.sendUiCommand(groundPage, "setCallCompact", compact);   // ★ #1094: the card re-reports its height
                    }
                }
#endif
            });
        }

#if WINDOWS
        /* ★★ B4/B5 (#1093): the WebView2 ground — opaque (WinUI 3 has no transparent one) and visible only in
         * the card's rounded corners, so it is the colour BEHIND those corners: the app surface around the
         * minimised card, the scrim over the app surface around the ring / full card. Live theme every time. */
        protected override Color webViewDefaultGround()
        {
            string mode;
            lock (callLock)
            {
                mode = surfaceMode;
            }
            Color s = Color.FromArgb(ThemeManager.getSurfaceColorString());
            if (mode == "bar")
            {
                return new Color(s.Red, s.Green, s.Blue, 1f);
            }
            float a = (float)winScrimAlpha;
            return new Color(
                s.Red * (1 - a) + (17f / 255f) * a,
                s.Green * (1 - a) + (18f / 255f) * a,
                s.Blue * (1 - a) + (19f / 255f) * a,
                1f);
        }

        private void applyWinGround()
        {
            try
            {
                if (webView?.Handler?.PlatformView is MauiWebView wv2)
                {
                    wv2.DefaultBackgroundColor = webViewDefaultGround().ToWindowsColor();
                }
            }
            catch (Exception ex)
            {
                Logging.warn("CallPage: WebView2 ground not applied: " + ex.GetType().Name);
            }
        }
#endif

        protected override bool OnBackButtonPressed()
        {
            // The ring's only exits are Accept / Decline / timeout / remote end.
            // Review NIT-10: swallow back ONLY while a ring is actually presented — a
            // modal that outlived its call (the unreachable not-top branch in
            // hideSurface) must stay dismissable rather than wedge the app.
            if (isRingPresented())
            {
                forwardBackToShell();   // ★ #1074 (#46 r2 MINOR-10): the modal ring closes an open decline sheet too
                return true;
            }
            return false;
        }
    }
}
