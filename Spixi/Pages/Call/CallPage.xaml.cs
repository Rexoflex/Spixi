using IXICore;
using IXICore.Meta;
using IXICore.Streaming;
using Microsoft.Maui;
using Microsoft.Maui.ApplicationModel;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using Spixi;
using SPIXI.Lang;
using SPIXI.Meta;
using SPIXI.VoIP;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

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
     * Two visual modes, one WebView:
     *   ring — full-window cover (incoming call: avatar + nick + Accept/Decline).
     *          Hardware back is swallowed while ringing (HomePage guard + this
     *          page's own OnBackButtonPressed) — the only exits are Accept /
     *          Decline / the #265 ring timeout / remote hang-up. NOT in
     *          overlayStack → closeTopOverlay can never pop it.
     *   bar  — the same stage re-margined to a top strip (dialing / in-call):
     *          the app below stays fully interactive; the strip spans all panes
     *          so exactly ONE bar exists on any window layout.
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
        private const double barHeightDip = 64;      // matches call.html's --call-bar-h
        public const int Z_CALL_SURFACE = 100;       // above #225 overlays (0), below the lock (200)

        private static readonly object callLock = new object();
        private static CallPage? current = null;
        private static ContentView? callStage = null;   // in-place path only (null when modal fallback)
        private static Grid? callHostGrid = null;
        private static bool modalFallback = false;      // presented via PushModalAsync (legacy page on top)
        private static bool presented = false;          // stage revealed (shell ready or timeout)
        private static string surfaceMode = "";         // "ring" | "bar"

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
            else if (current_url.Trim().StartsWith("file:", StringComparison.OrdinalIgnoreCase))
            {
                // allow normal navigation only for local files
                e.Cancel = false;
                return;
            }
            e.Cancel = true;
        }

        private void onLoad()
        {
            shellReady = true;
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

        /** Dialing / in-call → top strip. text is the C#-localized line the old
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
                setMode("bar");
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
            ContentView? stage;
            Grid? grid;
            bool wasModal;
            lock (callLock)
            {
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
                        stage.Opacity = 0;
                        stage.InputTransparent = true;
                    }
                    Task.Delay(100).ContinueWith(_ => MainThread.BeginInvokeOnMainThread(() =>
                    {
                        try
                        {
                            if (grid != null && stage != null)
                            {
                                grid.Children.Remove(stage);
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
                    return null;
                }
                ContentView stage = new ContentView
                {
                    Opacity = 0,                 // revealed on shell-ready (or the timeout)
                    InputTransparent = true,
                    CascadeInputTransparent = true,
                    BackgroundColor = page.pageSurfaceColor,   // themed cover — never a white flash
                    ZIndex = Z_CALL_SURFACE,
                };
                try
                {
                    page.Content = null;
                    stage.Content = content;
                    if (grid.ColumnDefinitions.Count > 1)
                    {
                        Grid.SetColumnSpan(stage, grid.ColumnDefinitions.Count);
                    }
                    if (grid.RowDefinitions.Count > 1)
                    {
                        Grid.SetRowSpan(stage, grid.RowDefinitions.Count);
                    }
                    grid.Children.Add(stage);    // WebView gets a handler → boots
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
            lock (callLock)
            {
                changed = surfaceMode != mode;
                surfaceMode = mode;
            }
            if (changed)
            {
                applyStageLayout();
            }
        }

        private static void revealSurface(CallPage? owner = null)
        {
            MainThread.BeginInvokeOnMainThread(() =>
            {
                ContentView? stage;
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
                stage.InputTransparent = false;
                stage.Opacity = 1;
            });
        }

        private static void onHostGridSizeChanged(object? sender, EventArgs e)
        {
            applyStageLayout();   // re-assert the strip after a window/pane resize
        }

        private static void applyStageLayout()
        {
            MainThread.BeginInvokeOnMainThread(() =>
            {
                ContentView? stage;
                string mode;
                lock (callLock)
                {
                    stage = callStage;
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
                    stage.VerticalOptions = LayoutOptions.Start;
                    stage.HeightRequest = barHeightDip;
                }
                else
                {
                    stage.VerticalOptions = LayoutOptions.Fill;
                    stage.HeightRequest = -1;
                }
                stage.Margin = new Thickness(0);
            });
        }

        protected override bool OnBackButtonPressed()
        {
            // The ring's only exits are Accept / Decline / timeout / remote end.
            // Review NIT-10: swallow back ONLY while a ring is actually presented — a
            // modal that outlived its call (the unreachable not-top branch in
            // hideSurface) must stay dismissable rather than wedge the app.
            return isRingPresented();
        }
    }
}
