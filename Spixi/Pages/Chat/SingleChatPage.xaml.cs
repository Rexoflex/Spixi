using IXICore;
using IXICore.Meta;
using IXICore.Network;
using IXICore.SpixiBot;
using Spixi;
using SPIXI.Interfaces;
using SPIXI.Lang;
using SPIXI.Meta;
using SPIXI.MiniApps;
using SPIXI.VoIP;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using IXICore.Streaming;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using System.Net;             // ⚠ sweep A-7: the openLink branch no longer decodes. WebUtility was this file's only System.Net user. The import stays until a build can prove it is safe to delete.
using Microsoft.Maui.Storage;
using Microsoft.Maui.ApplicationModel;
using System.Text;
using System.Web;
using Newtonsoft.Json;

namespace SPIXI
{
    [XamlCompilation(XamlCompilationOptions.Compile)]
    public partial class SingleChatPage : SpixiContentPage, IVoiceHost
    {
        public Friend friend;

        private uint messagesToShow = Config.messagesToLoad;

        private int selectedChannel = 0;

        // N51: the shell's overlay-stack state (ixian:chatoverlay mirror) — an
        // overlay.js sheet, the hand-rolled channel selector or select mode is
        // open in the chat WebView. Volatile like ContactDetails.shellOverlayOpen
        // (N50 #370): nav thread writes, back path reads.
        public volatile bool shellOverlayOpen = false;

        private bool _waitingForContactConfirmation = false;

        private HomePage? homePage;

        private bool warningDisplayed = false;
        private int connectivityWarningDelayCounter = 0;
        private bool unreadIndicatorDisplayed = false;
        private string setNickname = "";
        private bool setOnlineStatus = false;
        private string? lastPresenceKey = null;   // ★ #1103: "on" | "off:<last-seen minute>" | "off:0" — the header push latch
        private string lastGroupCountPushed = null;   // N22: group member-count sub, pushed on change only

        /* ★ Session I ② [CDPERF] — TEMPORARY, THE CHAT-OPEN STUTTER INSTRUMENT (#735, Damir on
         * a Release build: "subtle stutter, like a game on a bad computer"; the native slide
         * played as a jump-to-end, so #735① removed the slide — the stutter it exposed is
         * what these lines measure). Timeline, one clock from the constructor:
         *   [CDPERF] chat onload  t=…            the shell booted (ixian:onload)
         *   [CDPERF] chat load    n=… bg=…ms     loadMessages on the Task.Run thread: rows pushed + wall
         *   [CDPERF] chat drain   t=…            a main-thread marker posted AFTER the last row's
         *                                        evaluateJavascript — when the UI thread finished
         *                                        the per-row marshal replay (n × EvaluateJavaScriptAsync)
         *   [CDPERF] chat present t=…            onPreloadPresented — the stage is on glass
         *   [CDPERF] chat frames  n=… drop=… max=…ms   (Android) Choreographer frames in the 600 ms
         *                                        after present: frames seen, frames > 24 ms, the
         *                                        longest gap — "stutter" as a number
         * The shell prints its own `[CDPERF] chat-shell n= burst= paint= glass=` line on the
         * same timeline (chat.html onChatScreenLoaded, via console → logcat `chromium`).
         * Read: if `paint` (the one-shot build of the whole history) lands between `present`
         * and the frames line, the L10 shape applies (present → post → chunk, #726's grammar).
         * Fixed words + integers only (the handover-gate log rule). Retire the whole set with
         * one grep for CDPERF once the fix is measured (the #663 precedent). */
        private readonly System.Diagnostics.Stopwatch openClock = System.Diagnostics.Stopwatch.StartNew();
        private int lastLoadPushed = 0;
        private static void cdperf(string what, string detail = "")
        {
            IXICore.Meta.Logging.info("[CDPERF] chat " + what + (detail.Length > 0 ? " " + detail : ""));
        }
        /* ★ Session K [CDPERF] — TEMPORARY, the missing FIRST stamp. openClock starts in the
         * constructor, so the row tap → constructor gap (HomePage.onChat: the main-thread
         * marshal + the pane close-audit + the stage) was never on the timeline. HomePage
         * writes the tap's Stopwatch ticks here right before `new SingleChatPage`; the
         * constructor logs `[CDPERF] chat ctor tap=…ms` and clears it. Retire with the set. */
        internal static long pendingTapTicks = 0;

        /* ★★ Session K — PRESENT ON THE SHELL'S PAINT, NOT ON A TIMER (Damir: "takes half a
         * second to enter a chat"). #754/#756 read: drain → present was ~130 ms on every open,
         * while the shell's own paint landed 21–27 ms after drain — the rest was
         * `presentPreload`'s flat `revealDelayMs = 120` hold (SpixiContentPage), a timer
         * waiting for a paint that had already happened. Now: the shell emits `ixian:painted`
         * one frame after its burst render (chat.html onChatScreenLoaded, the same rAF that
         * stamps `glass=`), and the present fires THERE. The two halves can land in either
         * order (the verb rides the WebView's navigating event; the arming rides onLoad's
         * finally marshal), so both are latched and whichever comes second presents.
         * A backstop presents anyway PRESENT_BACKSTOP_MS after arming — a stale built shell
         * without the verb (#663's class) must never leave the conversation invisible — and
         * presentPreload's tryFinish makes every path idempotent; pushPageLoaded's 4000 ms
         * timeout stays as the outer belt. The chat push passes revealDelayMs: 0. */
        private volatile bool presentArmed = false;
        private volatile bool paintedSeen = false;
        /* ★ Walk K capture (open #2 of 4): `backstop t=500` landed BEFORE `painted t=561` — C#'s
         * drain marker fires when the last eval is DISPATCHED, and on that open the renderer
         * executed the queue ~100 ms later (burst=60 ms), so a 150 ms backstop presented an
         * unpainted page: the one flash this design must never make. 400 ms: the worst case is
         * the old timing, which never flashed; the other three opens presented on the verb. */
        private const int PRESENT_BACKSTOP_MS = 400;

        private void armPresentOnPainted()
        {
            presentArmed = true;
            if (paintedSeen)
            {
                signalPreloadReady();
                return;
            }
            Task.Delay(PRESENT_BACKSTOP_MS).ContinueWith(_ => MainThread.BeginInvokeOnMainThread(() =>
            {
                if (!paintedSeen)
                {
                    cdperf("backstop", "t=" + openClock.ElapsedMilliseconds);   // ★ Session K [CDPERF]
                }
                signalPreloadReady();   // idempotent: no-op once presented
            }));
        }

        /* ★★ Session M: the verb now arrives through the ONE shared inbound path
         * (`SpixiContentPage.onNavigatingGlobal` → `onPaintedSignal`), because four more
         * shells send it. This page's branch in `onNavigating` is gone; the override keeps
         * the chat's own mechanism, which is a DIFFERENT one and must not be folded in:
         * the chat asks for `revealDelayMs: 0`, so there is no hold for the base gate to
         * shorten, and its present is driven by the arm/latch pair below with a 400 ms
         * backstop. `base` is still called — the day the chat stops asking for 0, the gate
         * is already wired rather than silently absent. */
        protected override void onPaintedSignal()
        {
            base.onPaintedSignal();
            onPainted();
        }

        private void onPainted()
        {
            cdperf("painted", "t=" + openClock.ElapsedMilliseconds);   // ★ Session K [CDPERF]
            paintedSeen = true;
            if (presentArmed)
            {
                signalPreloadReady();
            }
        }

        public SingleChatPage(Friend fr) : this(fr, null)
        {
        }

        /* ═══ ★★ THE SPARE — Session P (#780, docs/prewarm-chat-spec.md §3) ═══
         *
         * A BLANK page: InitializeComponent, the hidden WebView, the shell loading — and NO
         * friend, NO Title, NO presence fetch, NO onLoad. It sits in SpixiContentPage's spare
         * slot until HomePage.onChat calls `attach`, which gives it the friend and runs the
         * exact onLoad a fresh page runs from its `ixian:onload`. The shell handles the late
         * first `onChatScreenReady` because it already handles re-entry and channel switches
         * (per-peer reset in onChatScreenReady).
         *
         * ⚠ `friend == null` IS the blank state, and every reader of `friend` in this class
         * runs only after attach: onLoad (attach calls it), updateScreen (onLoad calls it),
         * the UI tick (the spare is in no enumerator), OnAppearing (overlays never get it),
         * the verb handlers (`onNavigating` drops every verb but `ixian:onload` while blank —
         * a hidden, input-transparent page emits nothing else, and the guard makes that a
         * property rather than an observation). The two enumerators the spec names skip a
         * friend-less page as a belt. Private: `createSpare` is the one way to build one, so
         * the blank state cannot be reached by accident from another site. */
        private SingleChatPage()
        {
            InitializeComponent();
            NavigationPage.SetHasNavigationBar(this, false);
            webView.Opacity = 0;
            deferPreloadReady = true;
            loadPage(webView, "chat.html");
        }

        internal static SingleChatPage createSpare()
        {
            return new SingleChatPage();
        }

        /** READY marker: the blank shell's `ixian:onload` arrived. Volatile — written on the
         *  WebView's navigating callback, read under SpixiContentPage's preload lock. */
        internal volatile bool spareShellBooted = false;

        /* ★ Session P: the Android system-bar strip is PROCESS-WIDE (applyPlatformPageChrome's
         * own header, #421 MAJOR-4). The blank spare's load would otherwise repaint the strip
         * with the CHAT surface while the user is looking at the Wallet hero. A blank page
         * paints no strip; `attach` runs the chrome pass once it owns a conversation — the
         * same moment a fresh staged chat repaints it (its own load, ~100–200 ms before
         * present). */
        protected override bool ownsSystemBarStrip
        {
            get { return friend != null; }
        }

        /** Give the spare its conversation and run the load a fresh page runs at its
         *  `ixian:onload`. Main thread (called from HomePage.onChat's marshalled body,
         *  inside SpixiContentPage.pushSpareChat). A second attach on a page that already
         *  has a friend THROWS (the caller cancels the op and takes today's path) — one
         *  conversation per WebView, always. Every friend-dependent assignment the public
         *  constructor makes is made here, BEFORE onLoad reads them (Title · selectedChannel
         *  · homePage · the presence fetch). */
        internal void attach(Friend fr, HomePage? home)
        {
            if (friend != null)
            {
                throw new InvalidOperationException("attach: the page already holds a conversation");
            }
            long tapTicks = pendingTapTicks;   // ★ Session K/P [CDPERF]: tap → attach replaces tap → ctor on this path
            pendingTapTicks = 0;
            openClock.Restart();
            cdperfAttach(true, tapTicks != 0
                ? "tap=" + (long)System.Diagnostics.Stopwatch.GetElapsedTime(tapTicks).TotalMilliseconds + "ms"
                : "");
            // The blank document may have signalled nothing; if a future shell ever does,
            // a stale latch would present an UNPAINTED conversation (the one flash this
            // design must never make — PRESENT_BACKSTOP_MS header). Reset both halves.
            presentArmed = false;
            paintedSeen = false;
            friend = fr;
            Title = friend.nickname;
            selectedChannel = friend.metaData.lastMessageChannel;
            homePage = home;
            StreamProcessor.fetchFriendsPresence(friend, true);
            applyPlatformPageChrome();   // the strip + inset pass the blank load skipped (ownsSystemBarStrip)
            onLoad();
        }

        /* ★ Session P [CDPERF] — TEMPORARY, retire with the set. ONE line per open that says
         * which path the open took: `[CDPERF] chat attach spare=1 tap=…ms` (the spare was
         * READY and this open rode it) or `[CDPERF] chat attach spare=0 why=<word>` (today's
         * path; `why` is one of SpixiContentPage.SPARE_WHY_*). A capture without this line
         * cannot attribute its numbers. Fixed words + integers only. */
        internal static void cdperfAttach(bool spare, string detail)
        {
            cdperf("attach", "spare=" + (spare ? "1" : "0") + (detail.Length > 0 ? " " + detail : ""));
        }

        public SingleChatPage(Friend fr, HomePage? home)
        {
            long tapTicks = pendingTapTicks;   // ★ Session K [CDPERF]
            pendingTapTicks = 0;
            if (tapTicks != 0)
            {
                cdperf("ctor", "tap=" + (long)System.Diagnostics.Stopwatch.GetElapsedTime(tapTicks).TotalMilliseconds + "ms");
            }
            InitializeComponent();
            NavigationPage.SetHasNavigationBar(this, false);
            webView.Opacity = 0;
            // Theme-aware surface (N1): the old getBackgroundColor() here was the LEGACY
            // launch-blue — #223766 even in LIGHT mode — which was exactly the reported
            // "dark flash in light mode" behind the opacity-0 WebView. The themed surface
            // is now applied for every page by loadPage() (base class).

            // Load-then-move: the conversation reveals its WebView only after messages
            // are loaded + painted (FadeTo in onLoad's finally) — present the preloaded
            // page at THAT point, not at ixian:onload (signalPreloadReady() below).
            deferPreloadReady = true;

            friend = fr;
            Title = friend.nickname;
            selectedChannel = friend.metaData.lastMessageChannel;

            loadPage(webView, "chat.html");

            homePage = home;

            StreamProcessor.fetchFriendsPresence(friend, true);
        }

        public override void recalculateLayout()
        {
            ForceLayout();
        }

        /* ★ Session I [CDPERF]: the present stamp + the Android frame probe (see the docblock at
         * the field). Empty base; SingleChatPage is the only override today. */
        protected internal override void onPreloadPresented()
        {
            cdperf("present", "t=" + openClock.ElapsedMilliseconds);
#if ANDROID
            try
            {
                CdperfFrameProbe.start(openClock);
            }
            catch (Exception ex)
            {
                Logging.warn("[CDPERF] frame probe failed to start: " + ex.Message);
            }
#endif
        }

#if ANDROID
        /* ★ Session I [CDPERF] — TEMPORARY. Counts Choreographer frames for 600 ms after the
         * present and reports frames seen, frames whose gap exceeded 24 ms (a dropped 60 Hz
         * frame plus jitter), and the longest gap. Runs on the UI thread's vsync callback;
         * removes itself. Retire with the CDPERF set. */
        /* ★ Session K: `internal` + a tag — AppNewPage borrows the same probe for the Add-app
         * open (#757 ②, measure before any fix). Retires with the set. */
        internal sealed class CdperfFrameProbe : Java.Lang.Object, Android.Views.Choreographer.IFrameCallback
        {
            private const long WindowMs = 600;
            private readonly System.Diagnostics.Stopwatch clock;
            private readonly long startMs;
            private readonly string tag;
            private long lastNs = 0;
            private int frames = 0;
            private int dropped = 0;
            private double longestMs = 0;

            private CdperfFrameProbe(System.Diagnostics.Stopwatch c, string t) { clock = c; startMs = c.ElapsedMilliseconds; tag = t; }

            public static void start(System.Diagnostics.Stopwatch clock, string tag = "chat")
            {
                Android.Views.Choreographer.Instance?.PostFrameCallback(new CdperfFrameProbe(clock, tag));
            }

            public void DoFrame(long frameTimeNanos)
            {
                if (lastNs != 0)
                {
                    double gapMs = (frameTimeNanos - lastNs) / 1_000_000.0;
                    frames++;
                    if (gapMs > 24) dropped++;
                    if (gapMs > longestMs) longestMs = gapMs;
                }
                lastNs = frameTimeNanos;
                if (clock.ElapsedMilliseconds - startMs < WindowMs)
                {
                    Android.Views.Choreographer.Instance?.PostFrameCallback(this);
                }
                else
                {
                    IXICore.Meta.Logging.info("[CDPERF] " + tag + " frames n=" + frames + " drop=" + dropped + " max=" + (long)Math.Round(longestMs) + "ms");
                }
            }
        }
#endif

        protected override void OnAppearing()
        {
            base.OnAppearing();
            // ★ A5 #1124: the chat re-appears (back from Account → Privacy) — a CHANGED value is told before reloadScreen
            // re-flushes the history, so the rows render the new way and, when ON, the reload queues the previews
            if (friend != null && photoPreviewsPushed != null)
            {
                pushPhotoPreviews();
            }
            if (presentedFromPreload)
            {
                // First appearance after a load-then-move present: the staged load
                // already ran loadApps/loadMessages — re-rendering now would flash
                // the just-painted log. Subsequent appearances (returning from a
                // pushed page) reload as before.
                presentedFromPreload = false;
                return;
            }
            reloadScreen();
        }


        protected override void OnDisappearing()
        {
            VoiceClips.interruptHost(this, "left");   // ★ #1208 (S7): the page leaves — a recording stops and is kept, a clip stops
            clearPendingVoicePlay(null);   // ★ #46 r1 A M3 / r2 MAJOR: nothing plays later; a document that survives hears `stopped`
            webView = null;
            base.OnDisappearing();
        }

        private void onNavigating(object sender, WebNavigatingEventArgs e)
        {
            string current_url = HttpUtility.UrlDecode(e.Url);
            e.Cancel = true;

            /* ★ Session P: the shared verbs (`ixian:painted` · `ixian:cdping:` · the call
             * accept/reject/hang-up trio) are dispatched only for a page that HOLDS a
             * conversation. The blank spare answers nothing but its own `ixian:onload` and its
             * document's `file:` load (the guard below) — the #46 auditor found the first cut
             * claimed that and enforced it only for this class's own verbs. */
            if (friend != null && onNavigatingGlobal(current_url))
            {
                return;
            }

            if (current_url.Equals("ixian:onload", StringComparison.Ordinal))
            {
                /* ★ Session P (spec §3 row 2): the SPARE's shell booted. No friend yet, so
                 * onLoad() must not run — its second statement reads `friend`. Mark READY and
                 * stop; `attach` runs onLoad when the tap arrives. The shell keeps its boot
                 * spinner meanwhile: its 500 ms first-paint fallback is gated on the peer
                 * being known (#802 r3), so no empty log is ever painted into a blank document.
                 * Its own stamp (`warm onload`, the boot cost paid off the critical path) — the
                 * conversation's `onload` stamp below is not written on this path. */
                if (friend == null)
                {
                    cdperf("warm onload", "t=" + openClock.ElapsedMilliseconds);   // ★ Session P [CDPERF] — TEMPORARY
                    spareShellBooted = true;
                    return;
                }
                cdperf("onload", "t=" + openClock.ElapsedMilliseconds);   // ★ Session I [CDPERF]
                onLoad();
            }
            else if (friend == null && !current_url.Trim().StartsWith("file:", StringComparison.OrdinalIgnoreCase))
            {
                /* ★ Session P: a blank page dispatches NOTHING else. Every branch below reads
                 * `friend`; the page is hidden and input-transparent, so nothing legitimate
                 * arrives here — and if something did, staying on the page (e.Cancel is
                 * already true) is the #335 rule. Fixed word, no URL: the verb is untrusted.
                 * The document's own `file:` load is NOT a verb: it falls through to the
                 * shared tail below, which re-allows exactly that and nothing else. */
                Logging.warn("SingleChatPage: a verb reached the blank spare and was dropped");
            }
            else if (current_url.Equals("ixian:back", StringComparison.Ordinal))
            {
                // #225: no stack-count guard — an overlay conversation has an empty
                // Navigation proxy; popToRootAsync itself handles both modes (closes
                // all overlays, or pops the native stack) and no-ops at the root.
                {
                    try
                    {
                        popToRootAsync();
                    }
                    catch (Exception ex)
                    {
                        Logging.error($"Error during navigation: {ex.Message}");
                        return;
                    }
                }

            }
            else if (current_url.StartsWith("ixian:chatoverlay:", StringComparison.Ordinal))
            {
                // N51 (the N50/#370 grammar applied to chat): the shell mirrors its
                // overlay-stack state (sheets/menus, the hand-rolled channel selector,
                // select mode) so hardware back can be routed INTO the shell instead
                // of popping the conversation. Display-state only, no payload.
                shellOverlayOpen = current_url.EndsWith(":1", StringComparison.Ordinal);
            }
            else if (current_url.Equals("ixian:details", StringComparison.Ordinal))
            {
                onContactDetails();
            }
            /* ★★ #839 / AND-42 — A MEMBER SHEET NEEDED SOMEWHERE TO GO, and this host had
             * no address-keyed route. `ixian:details` is argument-less and means THIS
             * conversation; a group member is a different Friend. The verb name and the
             * handler body are ContactNewPage's (:107), so there is one grammar for
             * "open that contact's page" rather than a second one invented here.
             * ⚠ The address arrives from the WebView, and it is used for exactly one
             * thing: a lookup. An address that is not already a friend resolves to null
             * and NOTHING happens — no page, no record, no request. Same shape as the
             * `ixian:kick:` / `ixian:sendContactRequest:` verbs this file already answers,
             * and the page it pushes is its own WebView (#221 — the wall is untouched). */
            else if (current_url.StartsWith("ixian:viewcontact:", StringComparison.Ordinal))
            {
                onViewMemberContact(current_url.Substring("ixian:viewcontact:".Length));
            }
            // ★ W5/W6 (#523) — money-compose verbs. StartsWith + trailing colon,
            // placed with the other money verbs; SPayments owns confirm/auth/sign.
            else if (current_url.StartsWith("ixian:signSend:", StringComparison.Ordinal))
            {
                SPayments.handleSignSend(this, current_url.Substring("ixian:signSend:".Length), friend.walletAddress);   // ★ review MINOR-4: the chat compose is peer-locked (#139)
            }
            else if (current_url.StartsWith("ixian:feeQuery:", StringComparison.Ordinal))
            {
                SPayments.handleFeeQuery(this, current_url.Substring("ixian:feeQuery:".Length));
            }
            else if (current_url.StartsWith("ixian:payRequest:", StringComparison.Ordinal))
            {
                onPayRequest(current_url.Substring("ixian:payRequest:".Length));
            }
            else if (current_url.StartsWith("ixian:declineRequest:", StringComparison.Ordinal))
            {
                onDeclineRequest(current_url.Substring("ixian:declineRequest:".Length));
            }
            else if (current_url.StartsWith("ixian:sendrequest:", StringComparison.Ordinal))
            {
                // ★★ L1 (#640): the body moved to SPayments.handleSendRequest — contact
                // details grew the same Request action, and one money guard must not
                // have two homes (the V-8 pattern). Behaviour is unchanged.
                SPayments.handleSendRequest(this, friend, current_url.Substring("ixian:sendrequest:".Length));
            }
            else if (current_url.Equals("ixian:accept", StringComparison.Ordinal))
            {
                onAcceptFriendRequest();
            }
            else if (current_url.Equals("ixian:loadmore", StringComparison.Ordinal))
            {
                onLoadMore();
            }
            else if (current_url.Equals("ixian:call", StringComparison.Ordinal))
            {
                if (VoIPManager.isInitiated())
                {
                    // Hang up is NEVER gated. A call in progress must always be endable.
                    VoIPManager.hangupCall(null);
                }
                else
                {
                    /* ★★ ROUND 3 (review3-cs MAJOR-2) — the belt is now the ONE rule.
                     * The words that used to stand here were duplicated in three other
                     * places and had already drifted twice. Read `canPlaceCall`. */
                    onStartCall();
                }

            }
            /* ★★ ROUND 3 (review3-cs MAJOR-2) — THE CALL RULE'S THIRD HOME.
             * Every call bubble carries a "Call back" link (typed-bubbles.js
             * createCallBubble → chat.html buildCallRow). It used to send `ixian:call`,
             * the TOGGLE above — so a control labelled "Call back" reached the ungated
             * hang-up branch and ENDED A LIVE CALL, from any conversation that holds a
             * call card. It also bypassed the reveal, so it offered a call in rooms where
             * no phone action is revealed at all.
             * ⚠ THIS VERB CAN NEVER END A CALL. It has one leg, the start leg. The
             * toggle keeps its ungated hang-up, because the topbar control belongs to the
             * call it ends; a link labelled "Call back" must not be destructive.
             * `ContactDetails.xaml.cs` refuses a hang-up branch for the same reason.
             * ⚠ The shell asks the same rule before it paints the link and again before
             * it emits (chat.html buildCallRow). This is the belt, not the only gate. */
            else if (current_url.Equals("ixian:callback", StringComparison.Ordinal))
            {
                onStartCall();
            }
            else if (current_url.Equals("ixian:sendmedia", StringComparison.Ordinal))
            {
#pragma warning disable CS4014 // Because this call is not awaited, execution of the current method continues before the call is completed
                onSendFile(true);
#pragma warning restore CS4014 // Because this call is not awaited, execution of the current method continues before the call is completed
            }
            else if (current_url.Equals("ixian:sendfile", StringComparison.Ordinal))
            {
#pragma warning disable CS4014 // Because this call is not awaited, execution of the current method continues before the call is completed
                onSendFile(false);
#pragma warning restore CS4014 // Because this call is not awaited, execution of the current method continues before the call is completed
            }
            else if (current_url.StartsWith("ixian:acceptfile:"))
            {
                string id = current_url.Substring("ixian:acceptfile:".Length);

                FriendMessage fm = friend.getMessages(selectedChannel).Find(x => x.transferId == id);
                if (fm != null)
                {
                    onAcceptFile(selectedChannel, fm);
                }
                else
                {
                    Logging.error("Cannot find message with transfer id: {0}", id);
                }

            }
            else if (current_url.StartsWith("ixian:openfile:"))
            {
                string id = current_url.Substring("ixian:openfile:".Length);

                /* ★★ MINOR-5 family, found in the sweep: the ACCEPT branch six lines above
                 * guards this exact lookup and this one did not. A stale transfer id from a
                 * re-rendered file card left `fm` null and `fm.filePath` threw straight out
                 * of `onNavigating`. Two homes of one rule, and only one of them was safe. */
                FriendMessage? fm = friend.getMessages(selectedChannel)?.Find(x => x.transferId == id);
                if (fm == null || fm.filePath == null)
                {
                    // ★ Session H gate sweep (OURS-1): the id is a WEBVIEW-SUPPLIED token and this
                    // log is DevPage-shareable — log its SHAPE, never the value (the handover-gate
                    // log rule; baseline had no line here at all).
                    Logging.error("Cannot open file: no message holds the supplied transfer id (len={0})", id != null ? id.Length : -1);
                    return;
                }

                if (File.Exists(fm.filePath))
                {
                    SFileOperations.open(fm.filePath);
                }
                else
                {
                    // Handle special case for iOS
                    string filename = Path.GetFileName(fm.filePath);
                    string path = Path.Combine(TransferManager.downloadsPath, filename);
                    if (File.Exists(path))
                    {
                        SFileOperations.open(path);
                    }
                }
            }
            else if (current_url.StartsWith("ixian:viewImage:", StringComparison.Ordinal))
            {
                onViewImage(current_url.Substring("ixian:viewImage:".Length));   // ★ #1166 V-3: the in-app viewer (chat half)
            }
            else if (current_url.StartsWith("ixian:chatreply:", StringComparison.Ordinal))
            {
                // M1 reply-to. Grammar: ixian:chatreply:<reply-id-hex>:<url-encoded text>.
                // ★ No prefix collision with "ixian:chat:" — the character after "chat"
                // is 'r', not ':'. The shell only ever emits this behind the `reply`
                // capability — ★ #1198: declared now (setCaps); onSend composes the quote line (ReplyQuote).
                string payload = current_url.Substring("ixian:chatreply:".Length);
                int sep = payload.IndexOf(':');
                if (sep > 0)
                {
                    onSend(payload.Substring(sep + 1), payload.Substring(0, sep));
                }
                else
                {
                    // Malformed → treat it as a plain message rather than dropping it.
                    // Audit NIT-12: an EMPTY id ("ixian:chatreply::text") gives sep == 0,
                    // so the separator must still be removed or the body keeps a leading ':'.
                    onSend(sep == 0 ? payload.Substring(1) : payload);
                }
            }
            else if (current_url.StartsWith("ixian:chatedit:", StringComparison.Ordinal))
            {
                /* ★★ #1199 (session 6b): ixian:chatedit:<idHex>:<url-encoded text> (🟡 NEW). No collision with "ixian:chat:"
                 * (the character after "chat" is 'e'). The text after the FIRST ':' is the new body (it may hold ':').
                 * onEditMessage re-checks EditRules.canEdit on C#'s own copy; a malformed payload sends nothing. */
                string payload = current_url.Substring("ixian:chatedit:".Length);
                int sep = payload.IndexOf(':');
                if (sep > 0)
                {
                    onEditMessage(payload.Substring(0, sep), payload.Substring(sep + 1));
                }
                else
                {
                    Logging.warn("ixian:chatedit: malformed (no id)");
                }
            }
            else if (current_url.StartsWith("ixian:quotejump:", StringComparison.Ordinal))
            {
                // ★★ #1198 (session 6b): ixian:quotejump:<idHex> (🟡 NEW) — a quote whose target the shell has not loaded.
                onQuoteJump(current_url.Substring("ixian:quotejump:".Length));
            }
            /* ★★ #1208 (S7, V7 / V8 — 🟡 NEW verbs): the voice bar. The three recorder verbs are EXACT strings with no
             * argument; `ixian:voiceplay:<idHex>` carries a row id C# pushed (32 hex) — C# looks it up in ITS OWN list of the
             * open channel and plays what IT parsed. No collision with "ixian:chat:" (the prefix differs at "voice"). */
            else if (current_url.Equals("ixian:voicerec:start", StringComparison.Ordinal))
            {
                onVoiceRecStart();
            }
            else if (current_url.Equals("ixian:voicerec:cancel", StringComparison.Ordinal))
            {
                onVoiceRecCancel();
            }
            else if (current_url.Equals("ixian:voicerec:send", StringComparison.Ordinal))
            {
                onVoiceSend();
            }
            else if (current_url.StartsWith("ixian:voiceplay:", StringComparison.Ordinal))
            {
                onVoicePlay(current_url.Substring("ixian:voiceplay:".Length));
            }
            else if (current_url.StartsWith("ixian:chat:"))
            {
                string msg = current_url.Substring("ixian:chat:".Length);
                onSend(msg);
            }
            else if (current_url.StartsWith("ixian:viewPayment:"))
            {
                string tx_id = current_url.Substring("ixian:viewPayment:".Length);
                onViewPayment(tx_id);
            }
            else if (current_url.StartsWith("ixian:app:"))
            {
                string app_id = current_url.Substring("ixian:app:".Length);
                onApp(app_id);
            }
            else if (current_url.StartsWith("ixian:installApp:"))
            {
                string app_url = current_url.Substring("ixian:installApp:".Length);
                onInstallApp(app_url);
            }
            else if (current_url.StartsWith("ixian:joinApp:"))
            {
                string app_id = current_url.Substring("ixian:joinApp:".Length);
                onJoinApp(app_id);
            }
            else if (current_url.StartsWith("ixian:loadContacts"))
            {
                loadContacts();
            }
            else if (current_url.StartsWith("ixian:populateChannelSelector"))
            {
                populateChannelSelector();
            }
            else if (current_url.StartsWith("ixian:selectChannel:"))
            {
                int sel_channel = Int32.Parse(current_url.Substring("ixian:selectChannel:".Length));
                BotChannel channel = friend.channels.getChannel(sel_channel);
                if (channel != null)
                {
                    Utils.sendUiCommand(this, "setSelectedChannel", channel.index.ToString(), "fa-globe-africa", channel.channelName);
                    selectedChannel = sel_channel;
                    loadMessages();
                    /* W1 (#348, Damir F5: "worst in the Spixi bot group"). The shell holds
                     * the log back during a load BURST and paints on whichever comes first:
                     * this push, or a 250 ms fallback timer that every insert re-arms
                     * (chat.html:2443-2462). `onChatScreenLoaded` was pushed from exactly
                     * ONE place — onLoad (:733) — so a bot channel switch never sent it and
                     * ALWAYS paid the full fallback, every single time.
                     * This is the whole 250 ms, not a guess: on the normal open the push
                     * lands on the dispatch queue right behind the last message, so the
                     * timer never expires there. Measure-first (#294) is satisfied because
                     * nothing is being optimised — a missing signal is being sent.
                     * The other two silent callers (onLoadMore :415, reloadScreen :1959)
                     * are deliberately NOT touched: load-more PREPENDS into a live log and
                     * reloadScreen re-enters on OnAppearing, so `endLoadPhase()` there needs
                     * its own reasoning and its own F5. 🟡 Candidates, not this batch. */
                    Utils.sendUiCommand(this, "onChatScreenLoaded");
                }
            }
            else if (current_url.StartsWith("ixian:contextAction:"))
            {
                string action = current_url.Substring("ixian:contextAction:".Length);
                action = action.Substring(0, action.IndexOf(':'));

                string msg_id = current_url.Substring("ixian:contextAction:".Length + action.Length + 1);
                onContextAction(action, msg_id);
            }
            /* ⚠ AUDIT MINOR: the THIRD mute entry point, brought in line with the other two.
             * It dereferenced `friend.metaData.botInfo.sendNotification` with NO null check and
             * NO 1:1 branch — so reaching it for a 1:1, or for a group/bot whose BotInfo has
             * not arrived, threw an NRE inside onNavigating, which is destructive. Same shape
             * as ContactDetails now: synced botInfo for groups and bots, local preference for a
             * 1:1, and the chat list told either way. */
            else if (current_url.StartsWith("ixian:enableNotifications"))
            {
                setChatNotifications(true);
            }
            else if (current_url.StartsWith("ixian:disableNotifications"))
            {
                setChatNotifications(false);
            }
            else if (current_url.StartsWith("ixian:sendContactRequest:"))
            {
                // N26 (#366): body moved VERBATIM to SpixiContentPage.sendContactRequestGuarded
                // (#334 AND-17 guards intact) — ContactDetails' member sheet shares it now.
                // The helper also hardened the address parse (try/catch, A-4 rule).
                sendContactRequestGuarded(current_url.Substring("ixian:sendContactRequest:".Length));
            }
            else if (current_url.StartsWith("ixian:kick:"))
            {
                string str_address = current_url.Substring("ixian:kick:".Length);
                Address address = new Address(str_address);
                onKickUser(address);
            }
            else if (current_url.StartsWith("ixian:ban:"))
            {
                string str_address = current_url.Substring("ixian:ban:".Length);
                Address address = new Address(current_url.Substring("ixian:ban:".Length));
                onBanUser(address);
            }
            else if (current_url.StartsWith("ixian:typing"))
            {
                StreamProcessor.sendTyping(friend);
            }
            // Exact match, as on ContactDetails: a bare-name prefix test would swallow any
            // future ixian:leave* verb from this shell.
            else if(current_url.Equals("ixian:leave", StringComparison.Ordinal))
            {
                if(friend.bot
                   || friend.type == FriendType.Group)
                {
                    /* ★ F5-2 r2 (#555, loop A-6): the THIRD leave path — currently
                     * unreachable (chat.html routes info taps to ixian:details), but one
                     * shell edit from live. Bracketed like the other two so the
                     * diagnostic cannot exonerate a path it never watched. */
                    IXICore.Meta.Logging.info("[CRASHDIAG] chatleave: start (bot=" + friend.bot + ")");
                    // ★ #567: one grammar for group AND bot (the pendingDeletion wait
                    // fed the BE §1e-6 core crash). ★ #797: ONE HOME — SContacts.leaveGroup
                    // (it survives a leave notice with no route; this inline copy did not).
                    /* ★ #797 loop r2: report the LOCAL removal, as on ContactDetails.
                     * A false result or a throw leaves the record in place, so the
                     * page must not pop and the user must not read "Contact deleted." */
                    bool left = false;
                    try
                    {
                        left = SContacts.leaveGroup(friend);
                    }
                    catch (Exception)
                    {
                        Logging.error("ixian:leave failed");   // no ex.Message — Core formats the address into its text
                    }
                    if (!left)
                    {
                        IXICore.Meta.Logging.info("[CRASHDIAG] chatleave: refused, staying on the page");
                        IXICore.Meta.Logging.flush();
                        // Generic strings: the dictionary has no leave-failure text.
                        displaySpixiAlert(SpixiLocalization._SL("global-dialog-error"), SpixiLocalization._SL("settings-deleted-error-text"), SpixiLocalization._SL("global-dialog-ok"));
                    }
                    else
                    {
                        IXICore.Meta.Logging.info("[CRASHDIAG] chatleave: sent, presenting the alert");
                        IXICore.Meta.Logging.flush();
                        /* ★ #46 loop B, MAJOR-1 — TELL THE SHELL THE ROOM IS GONE.
                         * The friend is removed and this branch pushed nothing, so every
                         * localStorage key that carries this address survived: the user's own
                         * unsent DRAFT first. `leaveGroupResult` is the command name
                         * HomePage.onLeaveGroupFor already uses for this outcome — a second
                         * call site, not a new push. The eval is queued on the main thread
                         * before popPageAsync queues the teardown, so the sweep runs on a live
                         * WebView. Success only: a refused leave keeps the record and the data.
                         * ⚠ The emitter in chat.html is the retained-but-unreachable in-chat
                         * info takeover (#249 loop C-3). This handler is wired for the day
                         * that block is lit up again; it is not a live path today. */
                        try { Utils.sendUiCommand(this, "leaveGroupResult", friend.walletAddress.ToString(), "left"); } catch (Exception) { }
                        displaySpixiAlert(SpixiLocalization._SL("contact-details-removedcontact-title"), SpixiLocalization._SL("contact-details-removedcontact-text"), SpixiLocalization._SL("global-dialog-ok"));
                        popPageAsync();
                        homePage?.removeDetailContent();
                        IXICore.Meta.Logging.info("[CRASHDIAG] chatleave: teardown dispatched");
                    }
                }
            }
            else if (current_url.StartsWith("ixian:openLink:", StringComparison.Ordinal))
            {
                string link = current_url.Substring("ixian:openLink:".Length);
                if (!link.Contains("://"))
                {
                    link = "http://" + link;
                }

                /* ★★ SECURITY MAJOR #3 (handover sweep) — THE HOST THAT OPENS IS THE
                 * HOST THE USER READ. The confirm modal lives in the chat shell
                 * (chat.html, confirmOpenLink) and its body is the string the shell puts
                 * in this verb. This branch used to run WebUtility.HtmlDecode AFTER that
                 * modal had been approved, so the user approved one string and the app
                 * opened a different one: "https://paypal.com&commat;evil.example.com/login"
                 * reads as paypal.com and resolves to host evil.example.com. That decode
                 * is gone. No legitimate link loses it: the shell builds this string from a
                 * TEXT node (message-bubble.js, linkifyPlain), so no HTML entity can enter
                 * it, and the secure-notice link is a compile-time constant.
                 *
                 * ⚠ THE TRANSPORT PAIR IS NOT SYMMETRIC, AND THE FIRST FIX CLAIMED IT WAS
                 * (#46 loop A, MAJOR-1). The shell sends the link RAW (src/bridge/native.js,
                 * send). The WebView percent-encodes only the characters it must, and it
                 * never re-encodes a '%' that the peer already typed. onNavigating then
                 * UrlDecodes EVERY %XX on its first line. So a peer-authored %XX arrives
                 * here in a form the modal never displayed, and nothing in this branch can
                 * tell that escape apart from one the WebView added. `link` is therefore
                 * NOT byte-identical to the approved text, and removing a second decode
                 * does not make it so.
                 *
                 * ★ THIS END IS AUTHORITATIVE, because it is the only end that can refuse.
                 * The shell cannot be changed from here (its half of the grammar is frozen),
                 * so C# enforces the one property that decides where the user lands: the
                 * DESTINATION HOST must be the host the user read.
                 * ★ WHAT IS ENFORCED. Utils.openExternal refuses a non-empty Uri.UserInfo.
                 * Userinfo is the construct that puts the real host AFTER text the reader
                 * takes for the destination: "https://paypal.com@evil.example/login" reads
                 * as paypal.com and resolves to evil.example, and the decode above turns a
                 * peer-typed "%40" into that same '@'. The refusal closes both forms. It
                 * also refuses every scheme but http and https.
                 * ⚠ WHAT IS NOT ESTABLISHED, stated plainly (#772 / #798). Two earlier
                 * versions of this paragraph closed the argument with an author's
                 * enumeration — first a LIST of safe escapes, then a three-way split of
                 * "each character the decode adds". Both were incomplete, and the second
                 * one was also FALSE at its premise: HttpUtility.UrlDecode is FORM
                 * decoding, so a literal '+' becomes a SPACE. The decode can REMOVE a
                 * character, not only add one, and this repo settles that with a Roslyn run
                 * (security review MAJOR #8). That same '+' is why a path may not survive
                 * unchanged: "https://en.wikipedia.org/wiki/C++" arrives here with the two
                 * plus signs replaced by spaces. Nothing in this branch restores them.
                 * Nor is it established that no character can move the HOST. The host is
                 * not the decoded string. It is what Uri produces after its own
                 * normalisation - IDNA mapping for a non-ASCII host, backslash folding,
                 * case folding and dot-segment removal all run inside the parser, and this
                 * branch sees only the result. Two candidates are on record and answerable
                 * only on a device: a fullwidth U+FF20 that may map to '@' during host
                 * determination, and what Uri.TryCreate does with the space the '+' leaves
                 * inside an authority. Neither is closed by the guard, and neither is
                 * claimed to be.
                 * A non-ASCII (IDN) host arrives here percent-encoded and keeps working,
                 * which is why the authority is not simply refused for carrying a '%'.
                 * ⚠ The confirm is a SHELL surface, so C# cannot re-display the string
                 * here. If a native confirm is ever added, it must show THIS variable and
                 * nothing derived from it. */

                /* ★ SECURITY MAJOR #3, second and third half: THE ONE SINK.
                 * The scheme allow-list and the userinfo refusal used to be written out
                 * here, and copied word for word into SettingsPage. Both copies are gone.
                 * `Utils.openExternal` (Spixi/Utils/Utils.cs) now holds the rule once: it
                 * parses the string ONCE, refuses every scheme but http and https, refuses
                 * a non-empty Uri.UserInfo, and hands the SAME Uri object to the browser
                 * inside a try. It is the only method in the tree that may call the sink.
                 * ⚠ THE DUPLICATION WAS THE DEFECT, not just a smell. A #46 loop defeated
                 * the pin over these two copies three rounds running, because a control-flow
                 * property of duplicated code cannot be proven by reading text. Read
                 * openExternal's own comment for what is enforced and what is NOT.
                 * The refusal is SILENT to the user, as it was before: the tap does nothing
                 * and ixian.log carries the scheme. A refused link is a link this app must
                 * not open, and no message here could be written from peer text safely. */
                Utils.openExternal(link);
            }
            else if (current_url.StartsWith("ixian:undorequest"))
            {
                // Remove friend from list and go back to the main screen
                /* ★ #978 (#970): read BEFORE the removal — only a DECLINED INCOMING request is
                 * remembered (an outgoing cancel must never block the person we asked). The verb's
                 * only emitter is chat.html's INCOMING request pane (#562 moved the outgoing Cancel
                 * to hide-request), so the state test is the belt: never a RequestSent (ours) and
                 * never an Approved contact; a legacy Unknown/Ignored state counts as incoming,
                 * because that is the only pane that can send this verb. */
                if (friend == null)
                {
                    return;   // ★ #984 (r2 NIT-9) — a BELT: the spare-page branch above already drops every verb while friend is null (#985 r3 NIT-6)
                }
                bool declinedIncoming = friend.type == FriendType.Normal && !friend.bot
                    && friend.state != FriendState.RequestSent && friend.state != FriendState.Approved;
                // ★ #984 (r2 MINOR-6): remembered BEFORE the removal; a refused removal takes it back off
                string declinedAddr = friend.walletAddress.ToString();
                CoreMessageWriter.arrivals.forgetAddress(declinedAddr);   // ★ P0 #1155: a removed request gets nothing put back
                bool listed = declinedIncoming && SRequestIgnore.add(declinedAddr);
                bool requestRemoved = false;
                try
                {
                    requestRemoved = FriendList.removeFriend(friend);
                }
                catch (Exception ex)
                {
                    // ★ #986 (r4 MINOR-2): an exception must not escape onNavigating (it takes the
                    // process down on Android/iOS — the note in onContextAction, "takes the process down on Android and iOS"). The removal FAILED:
                    // the "fail" push below tells the shell to keep the data, as HomePage's A-5 fence does.
                    Logging.error("ixian:undorequest: the removal threw: " + ex.GetType().Name);
                }
                finally
                {
                    // ★ #985 (r3 MINOR-2): a THROWING removal (Core's I/O runs before friends.Remove)
                    // must not leave the address listed while the contact stays
                    if (!requestRemoved && listed) SRequestIgnore.remove(declinedAddr);
                }
                if (requestRemoved)
                {
                    SChatPrefs.setFavorite(friend.walletAddress.ToString(), false);   // CH4: the preference leaves with the record
                    SSightingStore.forget(friend.walletAddress.ToString());   // ★ G-2: the kept sighting leaves with the contact
                    SReactionFlags.clear(friend.walletAddress.ToString());    // ★ #1148 (4): the reaction heart too
                }

                /* ★ #46 loop B, MAJOR-1 — THE RECORD IS GONE, SO SAY SO.
                 * chat.html's request pane Decline emits this verb (the only live emitter
                 * since #562 moved the outgoing Cancel to hide-request), and the branch pushed
                 * nothing — so the user's own unsent DRAFT and the per-peer markers stayed for
                 * a contact that no longer exists. A stale spixi.hsstage.<address> also makes
                 * the next request from the same address restore the previous handshake stage.
                 * `undoRequestResult` is the command name HomePage.onDeclineRequest already
                 * uses for this outcome — a second call site, not a new push.
                 * ⚠ The result reports the LOCAL removal. A refused removal keeps the record,
                 * so the shell must keep the data; it answers "fail" and sweeps nothing.
                 * The eval is queued before popPageAsync queues the teardown. */
                try { Utils.sendUiCommand(this, "undoRequestResult", friend.walletAddress.ToString(), requestRemoved ? "ok" : "fail"); } catch (Exception) { }

                UIHelpers.shouldRefreshContacts = true;
                popPageAsync();
                homePage?.removeDetailContent();

                // TODO: send a notification to the other party
            }
            else if (current_url.Trim().StartsWith("file:", StringComparison.OrdinalIgnoreCase))
            {
                // allow normal navigation only for local files
                e.Cancel = false;
                return;
            }
            e.Cancel = true;
        }

        /// <summary>
        /// ★★ ROUND 3 (review3-cs MAJOR-2) — CAN A CALL BE PLACED TO THIS FRIEND?
        /// ONE RULE. Every home of the call rule asks THIS METHOD, and there are four:
        ///   · the reveal in this page (`showCallButton`);
        ///   · the start leg in this page (`ixian:call` and `ixian:callback`);
        ///   · the reveal in ContactDetails;
        ///   · the start leg in ContactDetails.
        /// The shell is the fifth home and it cannot read C# state, so it asks its own copy
        /// of the answer (`callVisible`, set by the `showCallButton` push) before it paints
        /// the "Call back" link and again before it emits. C# stays the authority.
        ///
        /// WHAT EACH TERM IS FOR:
        ///   · `friend != null` — the start leg runs off a WebView verb, not off the
        ///     reveal, so it must not assume a page state.
        ///   · `!friend.bot` and `type != FriendType.Group` — a room is not a peer.
        ///     `VoIPManager.initiateCall` holds ONE contact and ONE session: it sends an app
        ///     request to the ROOM address, writes a call bubble into history, presents
        ///     CallPage, starts the dial tone, takes the power locks and rings for 45
        ///     seconds, and nobody answers. That is the ② delivery lie.
        ///   · `state == FriendState.Approved` — a contact can be removed, or fall out of
        ///     Approved, between the reveal and the tap.
        ///   · the AUDIO CODEC test — ROUND 3 ADDED THIS TO BOTH START LEGS. Only the two
        ///     reveals carried it, so a codec-less device that received a call card could
        ///     tap "Call back", pass both belts, and reach `VoIPManager.initiateCall`, which
        ///     builds its codec list from an EMPTY set and dials anyway. An incoming call
        ///     writes its bubble with no codec test at all (StreamProcessor).
        ///
        /// ⚠ HANG UP IS NEVER GATED. This rule guards the START leg only. A relation belt
        /// above the toggle would trap a user in a live call that cannot be ended, which is
        /// worse than the defect it closes.
        ///
        /// ⚠ WHY IT LIVES HERE. Its callee is `VoIPManager.initiateCall`, and VoIPManager
        /// is outside this batch's file scope. This page is the primary call surface, so the
        /// rule sits beside the verb that uses it most. Move it onto VoIPManager the next
        /// time that file is opened — one move, four call sites, no drift.
        /// </summary>
        public static bool canPlaceCall(Friend friend)
        {
            return friend != null
                && !friend.bot
                && friend.type != FriendType.Group
                && friend.state == FriendState.Approved
                && SSpixiCodecInfo.getSupportedAudioCodecs().Count > 0;
        }

        /// <summary>
        /// ★★ ROUND 3 (review3-cs MAJOR-2) — THE ONE START LEG, FOR BOTH CALL VERBS.
        /// It can never end a call. A refusal is TOLD to the user: the old belt logged and
        /// pushed nothing, so a tap on a live-looking control did nothing, for ever, with no
        /// explanation (review3-cs MAJOR-2, failure scenario A).
        /// </summary>
        private void onStartCall()
        {
            if (!canPlaceCall(friend))
            {
                Logging.warn("Call refused: this chat cannot place a call.");
                Utils.sendUiCommand(this, "callRefused", "unavailable");
                return;
            }
            if (VoIPManager.isInitiated())
            {
                // Reached from `ixian:callback` only — the toggle above ends the call it
                // finds. A second call cannot be placed over a live one.
                Logging.warn("Call refused: a call is already in progress.");
                Utils.sendUiCommand(this, "callRefused", "busy");
                return;
            }
            VoIPManager.initiateCall(friend);
        }

        private void onLoadMore()
        {
            messagesToShow += Config.messagesToLoad;
            // D-18 (#354): Ixian-Core Friend.getMessages(channel, msg_count) reads
            // storage only when the channel is uncached or msg_count != 100
            // (Friend.cs:910; 0.9.8k = commit 097341a — no git tag exists).
            // A request of exactly 100 returns the stale cache from the PREVIOUS
            // window; loadMessages() then counts it short and hides the load-more
            // pill with more history still on disk. Step over the poisoned value.
            // N52 re-walk (messagesToLoad 25 → 50): the sequence is 50 → 100 → 150…,
            // so the FIRST press lands exactly on 100 — the guard fires once and
            // the walk continues 50 → 150 → 200…. Keep this guard until Core
            // replaces the magic-number cache test (BE question 9).
            if (messagesToShow == 100)
            {
                messagesToShow += Config.messagesToLoad;
            }
            requestPrepend();   // ★ #1166 B2: Core's window still grows above (the reply / react / delete cache); the shell gets ONLY the older slice
            loadMessages();
        }

        /* ★ #1166 B2 (#1142, docs/chat-transport-spec.md §B2) — LOAD-MORE SENDS ONLY THE OLDER SLICE.
         * onLoadMore (and a "show in chat" jump that must widen an OPEN chat's window) still runs the WHOLE loadMessages:
         * the window grows through the #354 step and the #907 visible-row loop, and the #1160 P0 guard runs around the
         * replacing read exactly as on an open (beforeReread · growth · trim · afterReread) — nothing of that path is
         * skipped. Only the PUSH differs: the rows strictly OLDER than `historyAnchor` (the oldest row the shell was handed
         * by the previous load) go out as `addMessages(json, "prepend")` + `messagesDone(show_more)` — no clearMessages
         * (nothing on screen is wiped), no unread zeroing and no reaction-flag clear (those belong to ENTERING the chat,
         * spec §4). The pushes stay inside `lock (messages)`, as the full path's (#802 r5): a live arrival is serialized
         * after them. Anchor not in the window (another channel, a wiped history) → the full re-flush, the old path.
         * The request is bound to the CALLING thread: only the loadMessages call that onLoadMore makes itself takes it —
         * a concurrent load on another thread clears it and re-flushes, which is always correct. */
        private sealed class HistoryAnchor
        {
            public readonly byte[] id;
            public readonly int channel;
            public HistoryAnchor(byte[] id, int channel)
            {
                this.id = id;
                this.channel = channel;
            }
        }
        private volatile HistoryAnchor? historyAnchor = null;
        private int prependOnThread = 0;   // the managed thread id whose NEXT loadMessages answers with a prepend (0 = none)

        private void requestPrepend()
        {
            Interlocked.Exchange(ref prependOnThread, Environment.CurrentManagedThreadId);
        }

        private bool takePrepend()
        {
            int t = Interlocked.Exchange(ref prependOnThread, 0);
            return t != 0 && t == Environment.CurrentManagedThreadId;
        }

        /* #839: open a GROUP MEMBER's contact page. Deliberately NOT onContactDetails() —
         * that one is about `friend`, this one about somebody in the room, and it takes
         * the directory context (`chat_context: false` → "Contact details") because it is
         * their page, not this chat's info. When hosted, it goes through the same
         * homePage router the header tap uses, so #249's target match applies and a member
         * lands in column 1 instead of beside a conversation it does not belong to. */
        private void onViewMemberContact(string address)
        {
            Friend? known = null;
            try
            {
                known = FriendList.getFriend(new Address(address));
            }
            catch (Exception ex)
            {
                /* ★ HANDOVER SWEEP G-3: never ex.Message here. Ixian-Core's Address ctor
                 * formats the WHOLE base58 into its exception text (Address.cs), so the
                 * message on a malformed payload is a wallet address in ixian.log — the
                 * same finding the kick/ban handlers already carry. Type name only. */
                Logging.warn("viewcontact: invalid address payload: " + ex.GetType().Name);
                return;
            }
            if (known == null) return;   // not a contact (or removed since the sheet opened) — nothing to show

            if (homePage != null)
            {
                homePage.onViewContact(known);   // directory context — their page, not this chat's info (#248)
                return;
            }
            pushPageLoaded(new ContactDetails(known), 4000, null, -1, null, default, false, false,
                navKey: "contactinfo:" + known.walletAddress, revealDelayMs: 0, slideIn: true);
        }

        private void onContactDetails()
        {
            if (homePage != null)
            {
                homePage.onContactDetails(friend);
                return;
            }

            // #248: chat-header entry → context 'chat' ("Chat info"/"Group info").
            pushPageLoaded(new ContactDetails(friend, true, null, true), 4000, null, -1, null, default, false, false,
                navKey: "chatinfo:" + friend.walletAddress, revealDelayMs: 0, slideIn: true);   // ★★ item 6
        }

        /* ★★ L1 (#640): `onSendIxi` and `onRequestIxi` are DELETED with WalletSendPage
         * and WalletReceivePage. They were the shell's old-exe legs for Pay and Request;
         * this build declares composeSend + composeRequest unconditionally (:909), so the
         * shell has taken the compose path since #523 and these were never reached.
         * Damir: "Nothing legacy was supposed to exist in this app anymore." */

        // ★ W5 (#523): pay an incoming payment request IN PLACE. This page resolves
        // the message; SPayments owns the guards, the NATIVE confirm (+ auth), the
        // sign and every result push. 1:1 only — the same fence every money verb keeps.
        /* ★★ DECLINE ON THE CARD (Damir decision 3, 2026-08-29). The twin of onPayRequest
         * and deliberately the same shape: the same lookup, the same guards, the same
         * answer channel. It SENDS A MESSAGE and spends nothing. */
        private void onDeclineRequest(string msg_id)
        {
            if (friend.bot || friend.type == FriendType.Group)
            {
                Utils.sendUiCommand(this, "payRequestResult", msg_id, "gone", "");
                return;
            }
            FriendMessage? msg = null;
            try
            {
                msg = friend.getMessages(selectedChannel).Find(x => x.id != null && x.id.SequenceEqual(Crypto.stringToHash(msg_id)));
            }
            catch (Exception ex)
            {
                Logging.error("onDeclineRequest lookup failed: " + ex.Message);
            }
            SPayments.declineRequest(this, friend, msg, msg_id);
        }

        private void onPayRequest(string msg_id)
        {
            if (friend.bot || friend.type == FriendType.Group)
            {
                Utils.sendUiCommand(this, "payRequestResult", msg_id, "gone", "");   // Batch W loop r1 A-1: unpayable ≠ user cancel
                return;
            }
            FriendMessage? msg = null;
            try
            {
                msg = friend.getMessages(selectedChannel).Find(x => x.id != null && x.id.SequenceEqual(Crypto.stringToHash(msg_id)));
            }
            catch (Exception ex)
            {
                Logging.error("onPayRequest lookup failed: " + ex.Message);
            }
            SPayments.handlePayRequest(this, friend, msg, msg_id);
        }


        private void populateChannelSelector()
        {
            var channels = friend.channels.channels;
            lock(channels)
            {
                foreach(var channel in channels.Values)
                {
                    string icon = "fa-globe-africa";
                    bool unread = false;
                    var messages = friend.getMessages(channel.index);
                    if (messages != null && messages.Count() > 0 && !messages.Last().localSender && !messages.Last().read)
                    {
                        unread = true;
                    }
                    Utils.sendUiCommand(this, "addChannelToSelector", channel.index.ToString(), channel.channelName, icon, unread.ToString());
                }
            }
        }

        private void setChannelSelectorUnread()
        {
            if(!friend.bot)
            {
                return;
            }

            var channels = friend.channels.channels;
            lock (channels)
            {
                foreach (var channel in channels.Values)
                {
                    bool unread = false;
                    var messages = friend.getMessages(channel.index);
                    if (messages != null && messages.Count() > 0 && !messages.Last().localSender && !messages.Last().read)
                    {
                        unread = true;
                    }
                    if(unread)
                    {
                        Utils.sendUiCommand(this, "setChannelSelectorStatus", "");
                    }
                }
            }
        }

        private void loadContacts()
        {
            // #249: the LOCAL user is a participant too — resolve self from localStorage
            // (no participant nick / stored contact avatar for one's own address).
            Address selfAddress = IxianHandler.getWalletStorage().getPrimaryAddress();
            var contacts = friend.users.contacts;
            foreach (var contact in contacts)
            {
                var contactAddress = contact.Key;
                bool isSelf = selfAddress != null && contactAddress.SequenceEqual(selfAddress);
                string address = contactAddress.ToString();
                string? avatar = IxianHandler.localStorage.getAvatarPath(address);
                if (avatar == null && isSelf)
                {
                    avatar = IxianHandler.localStorage.getOwnAvatarPath();
                }
                if (avatar == null)
                {
                    avatar = "img/spixiavatar.png";
                }
                avatar = Utils.imageToDataUri(avatar);   // X1
                int role = contact.Value.getPrimaryRole();
                string nick = resolveNick(contact.Value.getNick(), contactAddress);
                if (string.IsNullOrEmpty(nick) && isSelf)
                {
                    nick = IxianHandler.localStorage.nickname;
                }
                if (friend.type == FriendType.Group
                    && friend.metaData.botInfo.hideParticipantAddresses)
                {
                    if (string.IsNullOrEmpty(nick))
                    {
                        nick = "x" + contactAddress.ToString();
                    }
                    address = "[Unknown]";
                }
                // D-5 (#366): trailing relation. Loop m2: gate on the BROAD blind
                // predicate (botInfo.hideParticipantAddresses), NOT the '[Unknown]'
                // mask — the mask fires for blind GROUPS only, and a blind BOT's
                // roster rows would otherwise carry an is-in-your-contacts hint
                // (the #348 MAJOR-5 masking gap, must not widen under the gate).
                // ★ #613: the predicate is now the LEGACY one — a mask is a GROUP mask. The
                // older note here said to use the BROAD flag and that is no longer what this
                // line does; a bot room's roster is not masked, so its relation hint is not a
                // leak. Corrected rather than left contradicting the code beneath it.
                bool relBlind = Utils.hidesParticipants(friend);
                string relation = relBlind ? "" : contactRelationFor(contactAddress);
                Utils.sendUiCommand(this, "addContact",  address, nick, avatar, role.ToString(), relation);
            }
        }

        private void onNavigated(object sender, WebNavigatedEventArgs e)
        {
            // Deprecated due to WPF, use onLoad
        }

        /** ★ E-W2 (#1114 (2), the Mac walk: the open chat kept the OLD avatar): the header avatar push, shared by the
         *  load (onLoad) and a contact's avatar change while this chat is open (StreamProcessor `case avatar`). The same
         *  fixed verb and the same data-URI conversion as before — no new verb. MAIN THREAD. */
        public void pushHeaderAvatar()
        {
            string? chat_avatar = IxianHandler.localStorage.getAvatarPath(friend.walletAddress.ToString());
            if (chat_avatar == null)
            {
                chat_avatar = friend.type == FriendType.Group ? "img/spixi-group-avatar.png" : "img/spixiavatar.png";
            }
            Utils.sendUiCommand(this, "setAvatar", Utils.imageToDataUri(chat_avatar));
        }

        /** ★ #1191 (#1173 (5), W-AVATAR): a group / bot MEMBER changed their avatar while this chat is open
         *  (StreamProcessor `case avatar`, MAIN THREAD). Re-send that address's picture through the SAME path a row
         *  takes (avatarForRow → `setAvatarFor`, sent only when this document's ledger holds a different picture); the
         *  shell swaps the disc of every drawn row of that address in place. Only a multi chat; only a member this page
         *  already sent a picture for, or — not in a blind room (Utils.hidesParticipants) — a member on its roster
         *  (BotUsers.hasUser), so no address reaches a page that did not already carry it. No avatar file → nothing. */
        public void refreshMemberAvatar(Address member)
        {
            if (friend == null || !(friend.bot || friend.type == FriendType.Group) || member == null)
            {
                return;
            }
            string address = member.ToString();
            bool known;
            lock (avatarSent)
            {
                known = avatarSent.ContainsKey(address);
            }
            if (!known && (Utils.hidesParticipants(friend) || friend.users == null || !friend.users.hasUser(member)))
            {
                return;
            }
            string? path = IxianHandler.localStorage.getAvatarPath(address);
            if (path == null)
            {
                return;
            }
            avatarForRow(Utils.imageToDataUri(path), member);
        }

        private void onLoad()
        {
            // N51 (N50 loop A-3/B-4 lesson): a shell reload (reloadAllPages on a theme
            // or language flip) builds a fresh document with no overlay open, and the
            // mirror only reports CHANGES — reset here or a stale true swallows back.
            shellOverlayOpen = false;

            Utils.sendUiCommand(this, "onChatScreenReady", friend.walletAddress.ToString());

            // X1 follow-up: push the peer's (or group's) avatar so the chat TOPBAR shows it
            // even before any message arrives (a newly-accepted contact) and for groups — the
            // shell otherwise scavenges the header avatar from the first 1:1 message only.
            // Converted to a data-URI like every other avatar push; a sentinel → gradient FE-side.
            pushHeaderAvatar();

            /* ★★ A5 #1124 (#1133): a NEW document (or a reload of this one) — the shell reset its preview map at onChatScreenReady
             * above, so C#'s once-per-document set starts again, a decode still running for the old document is dropped
             * (thumbDoc), and the pref is told BEFORE the first history push (loadMessages runs below, on the Task). */
            thumbDoc++;
            lock (thumbsSent)
            {
                thumbsSent.Clear();
            }
            photoPreviewsPushed = null;
            pushPhotoPreviews();
            lock (avatarSent)
            {
                avatarSent.Clear();   // ★ #1166 P-04: the shell reset its address → avatar map at onChatScreenReady above (before loadMessages)
            }
            resetReplyDeep();   // ★ #1198: a new document — the one deeper reply-match read starts again (CONTRACT 1a)
            /* ★★ #1208 (S7): a new document — the once-per-document waveform set starts again (keyed by thumbDoc, bumped
             * above), a pending play-after-download is forgotten, a recording of this chat still running is stopped and
             * kept, and a KEPT clip is told to the new shell (V6 `stopped` with its length — pushed after setCaps below,
             * pushVoiceRec posts to the main thread). */
            lock (voiceInfoSent)
            {
                voiceInfoSent.Clear();
            }
            Interlocked.Exchange(ref pendingVoicePlay, null);
            int keptVoiceMs = VoiceClips.documentLoaded(this);
            if (keptVoiceMs > 0)
            {
                pushVoiceRec("stopped", keptVoiceMs);
            }

            // C13: push the LOCAL user's nick so the shell can identify "me" (self-mention
            // emphasis + the @ jump-to-mention FAB). The redesigned shells build window.SL from
            // their bundled dictionary, NOT from addCustomString, so this must be a bridge push.
            Utils.sendUiCommand(this, "setSelfNick", IxianHandler.localStorage.nickname);

            // #248 (Damir item 3): group/bot OWNER address → the shell marks the owner
            // in member lists ("Owner" chip). NEVER for a blind group — the owner
            // address would de-anonymize an identity the mode hides.
            if (friend.bot || friend.type == FriendType.Group)
            {
                // ★ #613 round 2 (review MEDIUM-3): the owner push is gated on being a
                // GROUP, not merely on "not blind". N48 already restricted `amOwner` to
                // FriendType.Group for the reason ContactDetails records: in a bot room
                // getOwner() degrades to "the first roster entry we happened to learn",
                // and the 500-cap eviction reshuffles it. Un-gating blindness alone would
                // have branded an arbitrary participant of a public channel as its owner.
                bool blindGroup = friend.type != FriendType.Group || Utils.hidesParticipants(friend);
                if (!blindGroup)
                {
                    try
                    {
                        var groupOwner = friend.users.getOwner();
                        if (groupOwner != null)
                        {
                            Utils.sendUiCommand(this, "setGroupOwner", groupOwner.ToString());
                        }
                    }
                    catch (Exception ex)
                    {
                        Logging.warn("setGroupOwner: " + ex.Message);
                    }
                }
            }

            if (homePage != null)
            {
                Utils.sendUiCommand(this, "hideBackButton");
            }

            int chat_type = 0;
            if (friend.bot)
            {
                chat_type = 3;
            }
            else if (friend.type == FriendType.Group)
            {
                if (friend.metaData.botInfo.hideParticipantAddresses)
                {
                    chat_type = 2;
                } else
                {
                    chat_type = 1;
                }
            }

            /* ★ #619: resolved for a 1:1 chat, awaited by the message loader for a group
             * or bot room. Declared here so both branches below share one contract. */
            Task<bool> botReady = Task.FromResult(true);

            if (chat_type > 0)
            {
                /* ★★ #619 (Damir, device 2026-08-28): THE CHAT OPENS NOW, NOT IN FIVE SECONDS.
                 *
                 * His two reports are one defect: "the 5 second delay when joining a group
                 * bot is useless, it still needs to load all the messages — better it shows
                 * up immediately", and "the group bot info takes 4 seconds to appear and
                 * feels broken. We added the skeletons for this purpose."
                 *
                 * `onLoad` is reached from `onNavigating`, a WebView.Navigating handler —
                 * the UI THREAD. So this loop's `Thread.Sleep(100)` × 50 froze the whole
                 * app for up to five seconds while a cold bot room answered, and everything
                 * the user touched in that window — including the info button — queued
                 * behind it. That is why the info screen "takes 4 seconds": it was never
                 * slow, it was waiting its turn.
                 *
                 * ⚠ The wait itself cannot simply be deleted. Everything below it reads
                 * `botInfo`, and `selectedChannel` — which `loadMessages()` uses to pick
                 * the channel to read — is assigned from `botInfo.defaultChannel` here. Cut
                 * the wait and a cold room loads channel 0 instead of its default: an empty
                 * chat, which is worse than a slow one.
                 *
                 * So the wait MOVES rather than goes. It runs on a background thread, and
                 * the message load below awaits it, which preserves the one ordering that
                 * matters while the UI thread is free the whole time. The page presents at
                 * once, the shell shows the skeletons it already has, and the mode, the
                 * channel and the messages arrive as they resolve.
                 *
                 * ⚠ The 5 s ceiling and its pop + alert are KEPT exactly as they were
                 * (audit M1 chose that alert target deliberately). A bot that never answers
                 * still fails the same way — it just no longer freezes the app to do it. */
                botReady = Task.Run(() =>
                {
                int sleep_cnt = 0;
                while (friend.metaData.botInfo == null || !friend.channels.hasChannel(friend.metaData.botInfo.defaultChannel))
                {
                    if (sleep_cnt >= 50)
                    {
                        popPageAsync();
                        // Show the alert on the page the user is actually LOOKING at: under
                        // load-then-move this page may never have been presented (staged
                        // off-screen and just cancelled by popPageAsync above), and an
                        // alert on an unattached page is silently lost (audit M1).
                        MainThread.BeginInvokeOnMainThread(() =>
                        {
                            try
                            {
                                Microsoft.Maui.Controls.Application.Current?.MainPage?.DisplayAlert(SpixiLocalization._SL("chat-bot-not-ready-title"), SpixiLocalization._SL("chat-bot-not-ready-body"), SpixiLocalization._SL("global-dialog-ok"));
                            }
                            catch (Exception ex)
                            {
                                Logging.warn("Exception showing bot-not-ready alert: " + ex);
                            }
                        });
                        return false;   // #619: the deferred work aborts; the loader below bails too
                    }
                    Thread.Sleep(100);
                    sleep_cnt++;
                }

                // ★ I-6 r2 (#360, loop r1 MINOR-8): the bot cost bar was the one C#-composed
                // amount left on raw IxiNumber.ToString() — a 0.005 IXI room rendered
                // "0.00500000 IXI" directly above the alerts #360 fixed.
                string cost_text = String.Format(SpixiLocalization._SL("chat-message-cost-bar"), Utils.amountToLocalizedDisplayString(friend.metaData.botInfo.cost) + " IXI");
                bool send_notification = friend.metaData.botInfo.sendNotification;

                // W8 (#348): 7th arg = blindness, ADDITIVE (same shape as the
                // getAppInfo extension in #214 — the 1:1 push below stays 4-arg and
                // the shell defaults a missing arg to false).
                // It is needed because chat_type CANNOT express a blind bot: a bot is
                // 3 whether or not it hides addresses (:604-608), so "2" means blind
                // GROUP only. Without this the shell would offer a tip on a blind bot
                // and C# would refuse it — a dead button.
                Utils.sendUiCommand(this, "setChatMode", chat_type.ToString(), friend.metaData.botInfo.cost.ToString(), cost_text, friend.metaData.botInfo.admin.ToString(), friend.metaData.botInfo.serverDescription, send_notification.ToString(), friend.metaData.botInfo.hideParticipantAddresses.ToString());
                // ★★ #613 round 2 (adversarial review, HIGH-1): arg 7 stays the RAW
                // flag, and the shell derives TWO things from it under two names.
                // The first cut sent the legacy-qualified answer, which fixed identity
                // display and silently re-created the dead Tip button the argument was
                // added to prevent: "not blind" made the shell OFFER a tip in a flagged
                // bot room, while the money gate below still reads the raw flag and
                // refuses it. A user would have reached the amount sheet and been told
                // no. Identity and spending are different questions about one flag.
                setChannelSelectorUnread();

                selectedChannel = 0; // TODO: remove this after groupchat UI improvements

                if (selectedChannel == 0 && friend.channels.channels.Count > 0)
                {
                    selectedChannel = friend.metaData.botInfo.defaultChannel;
                }
                if (selectedChannel != 0)
                {
                    BotChannel channel = friend.channels.getChannel(selectedChannel);
                    if (channel != null)
                    {
                        Utils.sendUiCommand(this, "setSelectedChannel", channel.index.ToString(), "fa-globe-africa", channel.channelName);
                    }
                }
                else
                {
                    selectedChannel = 0;
                }
                return true;
                });
            } else
            {
                Utils.sendUiCommand(this, "setChatMode", "0", "0.00000000", "", "False");
            }
            // ★ audit: declare that THIS build answers a tip with setTipResult. A new shell
            // on an old exe would otherwise wait 12 s after a SUCCESSFUL tip and then say it
            // may have failed; without the cap it keeps the old immediate-confirm behaviour.
            // ★ W5 (#523): + the money-compose caps. composeSend = attach-Pay compose ·
            // composeRequest = attach-Request sheet · payRequest = in-card Pay. An old
            // exe pushes none of these and the shell keeps the legacy native routes.
            /* ★★ #1198 / #1199 (session 6b): REPLY and EDIT are declared here, per chat type.
             * `reply` — EVERY chat (1:1, private group, bot room): a reply travels as TEXT with a quote line
             *   (ReplyQuote, the text-quote convention #1137 (3) — no Core field, so the M1 "carrier" never has to land);
             *   `ixian:chatreply:` composes it in onSend, insertMessage / updateMessage match it back.
             * `edit` — a 1:1 chat and a private group, NOT a bot room (`friend.bot`: the bot server re-serves its own
             *   history and Core takes no stream update of a bot message from us): `ixian:chatedit:` re-checks
             *   EditRules.canEdit and sends a chatStream replace (#1137 (4)).
             * An older shell ignores the extra caps; an older exe never declares them, so the shell offers neither. */
            string caps = "tipResult,composeSend,composeRequest,payRequest,reply";
            if (!friend.bot)
            {
                caps += ",edit";
            }
            if (voiceCapFor(friend))   // ★★ #1208 V1: the mic — see voiceCapFor
            {
                caps += ",voice";
            }
            Utils.sendUiCommand(this, "setCaps", caps);

            warningDisplayed = false;
            unreadIndicatorDisplayed = false;
            setNickname = "";
            setOnlineStatus = false;
            lastGroupCountPushed = null;   // N22: a WebView reload resets identity.sub — re-arm the count push
            lastPresenceKey = null;   // ★ #1103: a WebView reload gets its presence line again
            // #275 re-review R1: reset the pending latch on EVERY load — onLoad re-fires on
            // a WebView reload of a LIVE page (desktop pane re-home #225/#247, WKWebView
            // process reload) and the shell re-arms itself UNLOCKED (onChatScreenReady →
            // setComposerLock(null)); a stale latch would gate the re-push below and leave
            // a pending contact with a live composer. updateScreen() re-pushes + re-latches
            // on this same tick, so the one-shot anti-churn behavior is preserved.
            _waitingForContactConfirmation = false;

            // Execute timer-related functionality immediately
            updateScreen();

            // #275 review A1: groups are FriendType.Group with bot == false — they must
            // never take the outgoing-request lock (the shell strip's Cancel fires
            // ixian:undorequest → removeFriend WITHOUT sendLeave). 1:1 only.
            if (!friend.bot && friend.type != FriendType.Group)
            {
                // #275: lock for ANY non-approved 1:1, not just RequestSent — legacy
                // accounts carry other non-Approved states; the chats list already
                // labels ALL of them "Request sent" (HomePage:1606 keys on
                // state != Approved), so the chat must refuse to compose for the same
                // set (⑪ delivery-lie: a message "sent" here never reaches the peer).
                // RequestReceived stays out: the incoming request pane is its affordance.
                // #275 review A3/A5: updateScreen() (:644 above) already pushed the lock on
                // the pending edge; this stays as a belt, latch-guarded against a double push.
                if (!_waitingForContactConfirmation
                    && friend.state != FriendState.Approved && friend.state != FriendState.RequestReceived)
                {
                    _waitingForContactConfirmation = true;
                    Utils.sendUiCommand(this, "showRequestSentModal", "1");
                }
            }

            // NOTE: the WebView is revealed (FadeTo) only AFTER the conversation is
            // loaded + painted (below, after onChatScreenLoaded) — NOT here. Fading
            // it in before loadMessages showed the empty/boot state first, then the
            // messages popped in (Damir F5: "half a second of full-screen darkness"
            // entering a chat). The Content background is already the themed surface
            // (ctor), so during the brief load the user sees that themed color, then
            // the finished chat fades in in one go — no empty/spinner flash.

            Task.Run(async () =>
            {
                try
                {
                    /* ★ #619: the ONE ordering that matters. `loadMessages()` reads
                     * `selectedChannel`, which the deferred bot block assigns from
                     * `botInfo.defaultChannel` — so wait for it here, on a background
                     * thread, instead of on the UI thread where it used to wait.
                     * A 1:1 chat resolves instantly (`Task.FromResult(true)`), and a bot
                     * that timed out returns false, so this bails exactly where the old
                     * synchronous `return` did. */
                    if (!await botReady)
                    {
                        return;
                    }

                    /* ★★ #46 loop r2, own sweep — A RULE WITH TWO HOMES THAT HAD DRIFTED.
                     * ContactDetails.onLoad gates the SAME verb on `!isGroup` as well
                     * (ContactDetails.xaml.cs:138-145), and its comment claims the two gates
                     * are one rule. They were not. This site had no room test, so an
                     * Approved GROUP and an Approved BOT ROOM showed the phone action in the
                     * chat header. This file's own line at :3051 records that a group does
                     * reach FriendState.Approved, and the shell trusts the push
                     * ("callVisible = true", chat.html:4705).
                     * ⚠ WHAT A TAP DID. VoIPManager.initiateCall (VoIPManager.cs:78) holds
                     * ONE currentCallContact and ONE session: it sends an app request to the
                     * ROOM address, writes a call bubble into history, presents CallPage,
                     * starts the dial tone, takes the power locks and rings for 45 seconds.
                     * Nobody answers, because a room is not a peer. That is the ⑪ delivery
                     * lie — a control reporting an outcome it did not cause — and the #591
                     * audit already ruled it out on the ContactDetails surface for exactly
                     * this reason. The other home of the rule kept the defect.
                     * ★★ ROUND 3 (review3-cs MAJOR-2) — IT WAS THREE HOMES, NOT TWO, AND
                     * NOW IT IS ONE RULE THAT ALL OF THEM ASK. The third home was the shell:
                     * every call bubble carries a "Call back" link, it sent `ixian:call`
                     * whatever this reveal decided, and it reached the ungated hang-up
                     * branch. The four C# sites — this reveal, the start leg at
                     * `ixian:call`/`ixian:callback`, and both ContactDetails sites — now
                     * call `canPlaceCall(friend)`. Change the rule THERE. */
                    if (canPlaceCall(friend))
                    {
                        Utils.sendUiCommand(this, "showCallButton", "");
                    }

                    long cdLoad0 = openClock.ElapsedMilliseconds;   // ★ Session I [CDPERF]
                    loadMessages();
                    cdperf("load", "n=" + lastLoadPushed + " bg=" + (openClock.ElapsedMilliseconds - cdLoad0) + "ms");

                    Utils.sendUiCommand(this, "onChatScreenLoaded");
                    /* ★ Session I [CDPERF]: posted AFTER the last row's evaluateJavascript, so it
                     * runs when the main thread has finished the whole marshal replay. */
                    MainThread.BeginInvokeOnMainThread(() => cdperf("drain", "t=" + openClock.ElapsedMilliseconds));
                }
                finally
                {
                    // ALWAYS reveal the WebView — even if loadMessages / a UI push
                    // threw — so the page is never left permanently invisible with
                    // an unrevealable dead chat (audit M1). The reveal happens after
                    // the conversation is painted so entering a chat goes themed-load
                    // → finished chat, no empty/spinner flash (Damir F5). Marshalled
                    // to the UI thread (we're on a Task.Run threadpool thread).
                    MainThread.BeginInvokeOnMainThread(() =>
                    {
                        try
                        {
                            /* ★ Session K: no fade. The WebView sits inside an invisible stage until
                             * presentPreload flips it; a 90 ms opacity animation here could only be
                             * seen when the present landed mid-fade (a dim-to-full step, #754's class)
                             * and otherwise ran for nobody. The present is the reveal. */
                            webView.Opacity = 1;
                            webView.Focus();
                        }
                        catch (Exception ex)
                        {
                            Logging.warn("Exception revealing chat webView: " + ex);
                        }
                        finally
                        {
                            // Load-then-move (deferPreloadReady): the conversation is now
                            // loaded + revealed — if this page was preloaded off-screen,
                            // present it to the user. No-op when the page was pushed
                            // normally (no active preload for it).
                            // ★ Session K: not at THIS point any more — at the shell's own
                            // `ixian:painted` (or the 150 ms backstop). See armPresentOnPainted.
                            armPresentOnPainted();
                        }
                    });
                }

                loadApps();

                askCapabilitiesOnce();   // ★★ #1207 (S7): the capability ask — once per contact per app run (off the UI thread)

                if (!Preferences.Default.ContainsKey("rating_action"))
                {
                    Preferences.Default.Set("rating_action", "show");
                }

                int unreadCount = FriendList.getUnreadMessageCount();
                if (unreadCount == 0)
                {
                    SPushService.clearNotifications(unreadCount);
                }

                /* ★ D1 (#549, loop r1 MAJOR-3): the call-row cancel lives HERE, on the load
                 * path that runs on EVERY open — App.OnResume dispatches onResume() to the
                 * NavigationPage's CurrentPage only, and since #225 a conversation is an
                 * OVERLAY inside HomePage, so SingleChatPage.onResume never fires in overlay
                 * mode. The message sweep now spares call rows; THIS is the one place the
                 * missed call is "seen" (its bubble is in this log), so this contact's call
                 * row clears on open. Other contacts' missed calls stay. */
                try
                {
                    if (friend != null && friend.walletAddress != null)
                    {
                        SPushService.cancelNotification(SPIXI.Meta.SNotificationPrefs.notificationIdFor(friend.walletAddress, true));
                    }
                }
                catch (Exception ex)
                {
                    Logging.warn("onLoad: could not clear the call row: " + ex.Message);
                }

                UIHelpers.refreshAppRequests = true;
                UIHelpers.shouldRefreshContacts = true;

                updateScreen();
            });
        }

        public void onSend(string str, string reply_to_id_hex = "")
        {
            str = str.Trim(new char[] { ' ', '\t', '\r', '\n' });
            if (str.Length < 1)
            {
                return;
            }

            /* ★★ #1198 (session 6b): A REPLY IS TEXT WITH A QUOTE LINE (#1137 (3), the text-quote convention — no Core
             * field). When `reply_to_id_hex` names a QUOTABLE message of this chat's open channel (ReplyQuote.excerptOf:
             * text, file / photo, payment, call, app card), the sent text becomes
             *     "> " + NAME + ": " + EXCERPT + "\n" + body      (NAME = the target's sender as THIS device shows it, or none)
             * — an old Spixi shows it as a readable quote; this app matches the line back to the target (insertMessage).
             * A bad / unknown id, a non-quotable target or a composed text over CoreConfig.maxChatMessageSize → the plain
             * body (today's degrade). Composed BEFORE the bot-room price below: the price is for what is sent. The send
             * itself is unchanged — SpixiMessageCode.chat through sendChatMessage (the envelope id = the record id, so the
             * delivery and read ticks still land). The id is parsed by C# and looked up in C#'s own list; only C#'s
             * excerpt and name reach the text. */
            byte[]? replyMessageId = null;   // ★ #46 r1 C M-1: a composed reply gets its id HERE, so its target can be remembered first
            string? replyTargetForSend = null;
            if (!string.IsNullOrEmpty(reply_to_id_hex))
            {
                string? composed = composeReply(reply_to_id_hex, str, out string replyTargetHex);
                if (composed != null)
                {
                    str = composed;
                    replyMessageId = Guid.NewGuid().ToByteArray();   // the same 16-byte id Core would make (FriendMessage.id's getter)
                    replyTargetForSend = replyTargetHex;   // remembered only once the send goes ahead (below)
                }
            }

            if (friend.bot)
            {
                if (friend.metaData.botInfo.cost > 0)
                {
                    IxiNumber message_cost = friend.getMessagePrice(str.Length);
                    if (message_cost > 0)
                    {
                        Transaction tx = new Transaction((int)Transaction.Type.Normal, message_cost, ConsensusConfig.forceTransactionPrice, friend.walletAddress, IxianHandler.getWalletStorage().getPrimaryAddress(), null, new Address(IxianHandler.getWalletStorage().getPrimaryPublicKey()), IxianHandler.getHighestKnownNetworkBlockHeight());
                        IxiNumber balance = IxianHandler.getWalletBalance(IxianHandler.getWalletStorage().getPrimaryAddress());
                        if (tx.amount + tx.fee > balance)
                        {
                            // ★ I-6 (#360): amounts in composed sentences render in the app language
                            string alert_body = String.Format(SpixiLocalization._SL("wallet-error-balance-text"), Utils.amountToLocalizedDisplayString(tx.amount + tx.fee), Utils.amountToLocalizedDisplayString(balance));
                            displaySpixiAlert(SpixiLocalization._SL("wallet-error-balance-title"), alert_body, SpixiLocalization._SL("global-dialog-ok"));
                            return;
                        }
                    }
                }
            }

            SpixiMessage spixi_message = new SpixiMessage(SpixiMessageCode.chat, Encoding.UTF8.GetBytes(str), selectedChannel);
            byte[] spixi_msg_bytes = spixi_message.getBytes();

            // store the message and display it
            /* ★ #46 r2 NIT: the target is remembered only now — after the bot price (a refused send returns above) — and BEFORE
             * Core stores the message, because its live insert (Node → insertMessage) already matches it; a store that
             * failed forgets it again (below). */
            if (replyMessageId != null && replyTargetForSend != null)
            {
                rememberReplyTarget(Crypto.hashToString(replyMessageId), replyTargetForSend);
            }
            FriendMessage friend_message = Node.addMessageWithType(replyMessageId, FriendMessageType.standard, friend.walletAddress, selectedChannel, str, true, null, 0, true, true, spixi_msg_bytes.Length);   // ★ #46 r1 C M-1: null unless a composed reply

            // Audit NIT-11: addMessageWithType returns null when the friend is gone or the
            // channel is invalid. Transmitting a message that was never stored or shown
            // would leave the peer with something this device has no record of.
            if (friend_message == null)
            {
                if (replyMessageId != null)
                {
                    replyTargets.TryRemove(Crypto.hashToString(replyMessageId), out _);   // ★ #46 r2 NIT: never sent → not remembered
                }
                Logging.error("Chat message could not be stored — not sending it.");
                return;
            }

            // Finally, clear the input field
            Utils.sendUiCommand(this, "clearInput");

            CoreStreamProcessor.sendChatMessage(friend, friend_message, selectedChannel);
        }

        /* ═══ ★★ #1198 / #1199 (session 6b) — REPLY + EDIT, THE C# HALF ═══
         * A reply is TEXT with a quote line (ReplyQuote — CONTRACT 1a); an edit is a chatStream REPLACE (EditRules —
         * CONTRACT 1b). Everything the shell sends is an id + text: C# parses the id, looks it up in ITS OWN channel list
         * and decides — the WebView never names a sender, an excerpt or a sequence.
         * ★ #46 r1 A MAJOR-1 (cost): candidates are MEMOISED per page by id + sequence (+ text, so a delete is seen) — each
         * excerpt is computed once (bounded, ReplyQuote.excerptOfRange) — and indexed by excerpt (ReplyQuote.Index): a load
         * builds ONE index for all its rows (UiBatch.replyIndex), a live arrival one over the in-memory list. A row that is
         * not quote-shaped (ReplyQuote.looksLikeReply, a bounded check) costs nothing. The ONE deeper read
         * (localStorage.readLastMessages, DeepSearchMax rows, once per document + channel) happens ONLY on the load path,
         * BEFORE `lock (messages)` and off the UI thread, and only when a loaded row is quote-shaped (prefetchReplyDeep);
         * every other path (a live arrival on the network thread, compose / edit / jump on the UI thread) reads the cached
         * copy or nothing. The in-memory list is Core's Friend.getMessages(channel) with the default count — never a
         * replacing read (CORE-8); a live message wins over its deeper (disk) copy, so an edit seen live invalidates the
         * cached candidate (#46 r1 C M-2). */
        private readonly object replyLock = new object();
        private readonly Dictionary<string, ReplyQuote.Candidate> replyMemo = new Dictionary<string, ReplyQuote.Candidate>(StringComparer.Ordinal);
        private const int ReplyMemoMax = 4096;
        private List<FriendMessage>? replyDeep = null;
        private int replyDeepChannel = int.MinValue;   // the channel replyDeep holds; MinValue = not read for this document
        /* ★ #46 r1 C M-1: the SENDER's own device remembers the exact target it composed for (reply id hex → target id hex):
         * process-wide, in memory only, bounded — the match prefers it (ReplyQuote tier 0). The peer's device cannot (🟡,
         * ReplyQuote's header). */
        private static readonly ConcurrentDictionary<string, string> replyTargets = new ConcurrentDictionary<string, string>(StringComparer.Ordinal);
        private const int ReplyTargetsMax = 512;
        private int quoteJumpBusy = 0;   // ★ #46 r1 A NIT-3: one onQuoteJump disk read at a time

        /** ★ #1198: forget the deeper read and the memo (a new document — onLoad). */
        private void resetReplyDeep()
        {
            lock (replyLock)
            {
                replyDeep = null;
                replyDeepChannel = int.MinValue;
                replyMemo.Clear();
            }
        }

        /** The cached deeper read of `channel`, or null. NEVER reads. */
        private List<FriendMessage>? replyDeepCached(int channel)
        {
            lock (replyLock)
            {
                return replyDeepChannel == channel ? replyDeep : null;
            }
        }

        /** ★ #1198 / #46 r1 A MAJOR-1: the ONE deeper read — called only by loadMessages, BEFORE `lock (messages)`, when a
         *  loaded row is quote-shaped; never on the UI thread; once per document + channel (a failed read is not retried). */
        private void prefetchReplyDeep(int channel)
        {
            lock (replyLock)
            {
                if (replyDeepChannel == channel)
                {
                    return;
                }
            }
            if (MainThread.IsMainThread)
            {
                return;
            }
            List<FriendMessage>? read = null;
            try
            {
                read = IxianHandler.localStorage.readLastMessages(friend, channel, 0, ReplyQuote.DeepSearchMax);
            }
            catch (Exception e)
            {
                Logging.warn("reply match: the deeper read failed (" + e.GetType().Name + ")");
            }
            lock (replyLock)
            {
                replyDeep = read;
                replyDeepChannel = channel;
            }
        }

        /** A copy of Core's in-memory list of `channel` (Friend.getMessages, the default count — never a replacing read). */
        private List<FriendMessage> channelSnapshot(int channel)
        {
            List<FriendMessage>? mem = null;
            try
            {
                mem = friend.getMessages(channel);
            }
            catch (Exception)
            {
                mem = null;
            }
            if (mem == null)
            {
                return new List<FriendMessage>();
            }
            lock (mem)
            {
                return new List<FriendMessage>(mem);
            }
        }

        /** ★ #1198: a message as a reply candidate, memoised by id + sequence + text (an edit or a delete builds a new one).
         *  The file name + photo test are C#'s own SharedItems rules; the time is Core's `timestamp` (an edit keeps it: the
         *  replace passes the existing time back, #46 r2 MAJOR-1);
         *  expectedName = this device's name for the sender (replyNameOf, sanitized) — the exact-line tier. */
        private ReplyQuote.Candidate? replyCandidateOf(FriendMessage? m)
        {
            if (m == null || m.id == null)
            {
                return null;
            }
            string idHex = Crypto.hashToString(m.id);
            string rawName;
            try
            {
                rawName = replyNameOf(m) ?? "";   // ★ #46 r2 NIT: part of the memo key — a roster nick change rebuilds the candidate
            }
            catch (Exception)
            {
                rawName = "";
            }
            lock (replyLock)
            {
                if (replyMemo.TryGetValue(idHex, out ReplyQuote.Candidate? memo) && memo.sequence == m.sequence && memo.type == m.type
                    && string.Equals(memo.text, m.message, StringComparison.Ordinal) && string.Equals(memo.nameKey, rawName, StringComparison.Ordinal))
                {
                    return memo;
                }
            }
            ReplyQuote.Candidate c = new ReplyQuote.Candidate
            {
                idHex = idHex, type = m.type, text = m.message, sequence = m.sequence,
                timestamp = m.timestamp,
            };
            if (m.type == FriendMessageType.fileHeader && SharedItems.parseFileHeader(m.message, out string name, out _))
            {
                c.fileName = name;
                c.isImage = SharedItems.isImageName(name);
            }
            c.nameKey = rawName;
            c.expectedName = ReplyQuote.nameFor(rawName);
            lock (replyLock)
            {
                if (replyMemo.Count >= ReplyMemoMax)
                {
                    replyMemo.Clear();   // bounded; rebuilt on demand
                }
                replyMemo[idHex] = c;
            }
            return c;
        }

        /** ★ #46 r1 A MAJOR-1: ONE index over `mem` (the live list — the caller holds its lock or passes a copy) + the
         *  cached deeper read (rows `mem` does not hold: the live copy wins). Never reads the disk. */
        private ReplyQuote.Index buildReplyIndex(int channel, List<FriendMessage> mem)
        {
            List<ReplyQuote.Candidate> all = new List<ReplyQuote.Candidate>(mem.Count);
            HashSet<string> live = new HashSet<string>(StringComparer.Ordinal);
            List<FriendMessage>? deep = replyDeepCached(channel);
            if (deep != null)
            {
                foreach (FriendMessage m in mem)
                {
                    if (m.id != null)
                    {
                        live.Add(Crypto.hashToString(m.id));
                    }
                }
                foreach (FriendMessage d in deep)
                {
                    if (d.id != null && !live.Contains(Crypto.hashToString(d.id)))
                    {
                        ReplyQuote.Candidate? dc = replyCandidateOf(d);
                        if (dc != null)
                        {
                            all.Add(dc);
                        }
                    }
                }
            }
            foreach (FriendMessage m in mem)
            {
                ReplyQuote.Candidate? c = replyCandidateOf(m);
                if (c != null)
                {
                    all.Add(c);
                }
            }
            return new ReplyQuote.Index(all);
        }

        /** ★ #1198: the quote of a text row. true = a quote box: matched (`match.matched`, a target id) or — Damir P2 — a
         *  VALID quote line that matches nothing (no target id, the box drawn from the line). false = not the shape (the
         *  text is shown unchanged). `index` = the load's ONE index; null = a live push (an index over the in-memory list). */
        private bool matchReply(FriendMessage message, int channel, ReplyQuote.Index? index, out ReplyQuote.Match? match)
        {
            match = null;
            if (message.type != FriendMessageType.standard || !ReplyQuote.looksLikeReply(message.message))
            {
                return false;
            }
            try
            {
                string self = message.id != null ? Crypto.hashToString(message.id) : "";
                ReplyQuote.Index idx = index ?? buildReplyIndex(channel, channelSnapshot(channel));
                replyTargets.TryGetValue(self, out string? preferred);
                long replyTime = message.timestamp;   // #46 r2 MAJOR-1: Core's own time — an edit keeps it
                if (ReplyQuote.tryMatch(message.message, replyTime, self, idx, preferred, out match) && match != null)
                {
                    return true;
                }
            }
            catch (Exception e)
            {
                Logging.warn("reply match failed (" + e.GetType().Name + ")");
            }
            match = ReplyQuote.fallbackOf(message.message);   // ★ Damir P2: the box from the line, no jump
            return match != null;
        }

        /** A WebView-supplied message id hex → bytes; null = not a usable id (empty, odd, too long, not hex). */
        private static byte[]? parseMessageIdHex(string? hex)
        {
            if (string.IsNullOrEmpty(hex) || hex.Length % 2 != 0 || hex.Length > 2 * CoreConfig.maxMessageIdSize)
            {
                return null;
            }
            try
            {
                byte[] id = Crypto.stringToHash(hex);
                return id != null && id.Length > 0 ? id : null;
            }
            catch (Exception)
            {
                return null;
            }
        }

        /** A message of `channel` by id: the in-memory list first, then the CACHED deeper read (never a read). */
        private FriendMessage? findChannelMessage(int channel, byte[] id)
        {
            FriendMessage? m = channelSnapshot(channel).Find(x => x.id != null && x.id.SequenceEqual(id));
            if (m != null)
            {
                return m;
            }
            List<FriendMessage>? deep = replyDeepCached(channel);
            return deep?.Find(x => x.id != null && x.id.SequenceEqual(id));
        }

        /* ★★ #46 r1 A MAJOR-2 (privacy — the handover gate: the redesign must introduce nothing) — WHICH NAME A QUOTE
         * CARRIES. The quote line LEAVES this device in the reply text, so it may carry only a name the target's sender
         * declared themselves — NEVER the private alias this user gave a contact. Core's `Friend.nickname` returns that
         * alias first (`userDefinedNick`, Friend.cs:836-845), and `FriendList.getFriend(..).nickname` is the same getter, so
         * neither is used here:
         *   · a 1:1 chat          → NO name, for either side ("> excerpt"): the two people know who wrote what, and the
         *                           peer's own declared nick is a PRIVATE Core field (`_nick`, no getter) — the lead
         *                           removed a reflection read of it (fragile under trimming, and it reads Core internals);
         *   · a group / bot room  → my own message: my own nick (what I declare to everyone); a member: the message's
         *                           `senderNick` (Core filled it from the room roster), else the roster member's own nick
         *                           (friend.users — what the member declared), else "".
         * ReplyQuote.nameFor then sanitizes (#1178) and drops an address-like name — never an address in the quote. */
        private string replyNameOf(FriendMessage target)
        {
            if (!(friend.bot || friend.type == FriendType.Group))
            {
                return "";
            }
            if (target.localSender)
            {
                return IxianHandler.localStorage.nickname ?? "";
            }
            if (!string.IsNullOrEmpty(target.senderNick))
            {
                return target.senderNick;
            }
            Address? who = target.senderAddress;
            if (who != null && friend.users != null && friend.users.hasUser(who))
            {
                return friend.users.getUser(who)?.getNick() ?? "";
            }
            return "";
        }

        /** ★ #1198: the text a reply sends, or null = send the plain body (the old degrade). `targetHex` = C#'s own id of
         *  the target (remembered for this device's match, #46 r1 C M-1). */
        private string? composeReply(string idHex, string body, out string targetHex)
        {
            targetHex = "";
            try
            {
                byte[]? id = parseMessageIdHex(idHex);
                if (id == null)
                {
                    Logging.warn("Reply target id is not usable; sending a plain message.");
                    return null;
                }
                FriendMessage? target = findChannelMessage(selectedChannel, id);
                ReplyQuote.Candidate? tc = replyCandidateOf(target);
                string? excerpt = tc != null ? ReplyQuote.excerptOf(tc) : null;
                if (target == null || tc == null || excerpt == null)
                {
                    Logging.warn("Reply target is not a quotable message of this chat; sending a plain message.");
                    return null;
                }
                string text = ReplyQuote.compose(replyNameOf(target), excerpt, body);
                if (text.Length > CoreConfig.maxChatMessageSize)
                {
                    Logging.warn("Reply with its quote is over the size limit; sending a plain message.");
                    return null;
                }
                targetHex = tc.idHex;
                return text;
            }
            catch (Exception e)
            {
                Logging.warn("Reply could not be composed (" + e.GetType().Name + "); sending a plain message.");
                return null;
            }
        }

        /** ★ #46 r1 C M-1: remember (process-wide, bounded) which target this device's reply `replyIdHex` was composed for. */
        private static void rememberReplyTarget(string replyIdHex, string targetHex)
        {
            if (replyTargets.Count >= ReplyTargetsMax)
            {
                replyTargets.Clear();   // bounded; an old reply falls back to the ranked match
            }
            replyTargets[replyIdHex] = targetHex;
        }

        /* ★★ #1199 (session 6b) — `ixian:chatedit:<idHex>:<text>` (🟡 NEW verb). The shell offers Edit on my own recent
         * text rows behind the `edit` cap; C# RE-CHECKS everything (EditRules.canEdit, executed in scripts/csh) on its own
         * copy of the message: own · standard · not a system line · not deleted · not a bot room · < 24 h since the
         * ORIGINAL send (Damir P1; #46 r2 MAJOR-1: Core's `timestamp` IS the original time — every replace passes the
         * existing time back, below and in StreamProcessor) · sequence < 20 · among the newest 25 of the channel (Core ADDS
         * an edit it cannot place) · the new body trimmed, non-empty, within the size, changed.
         * Refused (#46 r2 MAJOR-2) → EVERY refusal of a row this device holds in memory re-pushes its CURRENT state
         * (repushRefusedEdit → updateMessage) so the shell restores the bubble; a row not in memory (or an unusable id)
         * pushes nothing (the shell's 3 s timeout restores it). Per verdict: notOwn · systemLine · botRoom · tooOld ·
         * tooManyEdits · notRecent · bodyEmpty · tooLong · unchanged and a local replace Core refused → the text re-push;
         * notText (a file / payment / app row — the shell never offers Edit there) and deleted (an empty row) → updateMessage
         * pushes no TEXT for those by its own guards (a text push would turn the card into a bubble / paint an empty one),
         * so the shell's timeout restores them.
         * A quote-shaped text (matched, or Damir P2's fallback box) SHOWS its body, so the edit is of the BODY: the
         * unchanged check compares with the body, and the ORIGINAL quote line is kept (newFullText = line + "\n" + body).
         * Allowed → the own copy is replaced FIRST through Node.addMessageWithType (sender_address = our primary address:
         * Core 0.9.8k accepts a local replace only then, FriendList.addMessageWithType's `tmp_msg.localSender` rule) — which
         * pushes updateMessage to this page (UIHelpers.updateMessage) — then the chatStream replace goes out through
         * CoreStreamProcessor.sendSpixiMessage with a NEW envelope id, pending + server ON, push OFF (an edit never wakes
         * a phone). A local replace Core refused → nothing is sent and the row is re-pushed. Never throws out of
         * onNavigating; the log carries the verdict word only — no text, no id. */
        private void onEditMessage(string idHex, string newText)
        {
            int channel = selectedChannel;
            FriendMessage? msg = null;
            try
            {
                byte[]? id = parseMessageIdHex(idHex);
                if (id == null)
                {
                    Logging.warn("ixian:chatedit: the id is not usable");
                    return;
                }
                List<FriendMessage>? mem = friend.getMessages(channel);
                int newer = -1;
                if (mem != null)
                {
                    lock (mem)
                    {
                        int idx = mem.FindIndex(x => x.id != null && x.id.SequenceEqual(id));
                        if (idx >= 0)
                        {
                            msg = mem[idx];
                            newer = mem.Count - 1 - idx;
                        }
                    }
                }
                if (msg == null)
                {
                    Logging.warn("ixian:chatedit: refused (notRecent)");   // not in the newest in-memory rows — nothing to re-push
                    return;
                }
                string? quoteLine = null;
                string currentBody = msg.message ?? "";
                if (ReplyQuote.splitShape(msg.message, out string line, out string shownBody))
                {
                    quoteLine = line;
                    currentBody = shownBody;
                }
                EditVerdict verdict = EditRules.canEdit(msg.localSender, msg.type, UnreadRule.isSystemLineId(msg.id), msg.message,
                    friend.bot, Clock.getTimestamp(), msg.timestamp, msg.sequence, newer, newText, currentBody, quoteLine, CoreConfig.maxChatMessageSize);
                if (verdict != EditVerdict.ok)
                {
                    Logging.info("ixian:chatedit: refused (" + verdict + ")");
                    repushRefusedEdit(msg, channel);   // the shell restores the row's current state
                    return;
                }
                string full = EditRules.fullText(quoteLine, EditRules.trimBody(newText));
                var csm = new IXICore.Streaming.Models.ChatStreamMessage(msg.id, full, msg.sequence + 1, false);
                SpixiMessage sm = new SpixiMessage(SpixiMessageCode.chatStream, csm.getBytes(), channel);
                int len = sm.getBytes().Length;
                /* #46 r2 MAJOR-1: the timestamp = the message's OWN time — Core's replace writes it back (FriendList.cs:288),
                 * so the edit never moves the row (Damir P1); 0 would stamp "now". */
                FriendMessage? replaced = Node.addMessageWithType(FriendMessageType.standard, friend.walletAddress, channel, csm, true,
                    IxianHandler.getWalletStorage().getPrimaryAddress(), msg.timestamp, false, false, len);
                if (replaced == null)
                {
                    Logging.warn("ixian:chatedit: the local replace was refused; nothing was sent");
                    repushRefusedEdit(msg, channel);
                    return;
                }
                CoreStreamProcessor.sendSpixiMessage(friend, sm, null, null, true, true, false, false);
            }
            catch (Exception e)
            {
                Logging.warn("ixian:chatedit: failed (" + e.GetType().Name + ")");
                if (msg != null)
                {
                    try { repushRefusedEdit(msg, channel); } catch (Exception) { }
                }
            }
        }

        /** ★ #46 r2 MAJOR-2: the ONE refusal re-push of `ixian:chatedit:` — the row's CURRENT state (updateMessage: the text
         *  row's body, ticks, quote, edited marker; nothing for a non-text or an empty row, by updateMessage's own guards). */
        private void repushRefusedEdit(FriendMessage msg, int channel)
        {
            updateMessage(msg, channel);
        }

        /* ★★ #1198 (session 6b) — `ixian:quotejump:<idHex>` (🟡 NEW verb): a tap on a quote whose target the shell has not
         * loaded. C# looks the id up in ITS OWN history of the open channel — the in-memory list, else the newest
         * SharedItems.JumpCap rows on disk (off the UI thread; ONE such read at a time — a tap while one runs is dropped,
         * #46 r1 A NIT-3) — computes `depth` (how many messages of the channel are newer) and hands its OWN hex to
         * requestJump, the Show-in-chat path (#1106). Not found → nothing (the shell toasts its existing jump text). The
         * WebView's hex never reaches the jump. */
        private void onQuoteJump(string idHex)
        {
            byte[]? id = parseMessageIdHex(idHex);
            if (id == null)
            {
                Logging.warn("ixian:quotejump: the id is not usable");
                return;
            }
            int channel = selectedChannel;
            Friend f = friend;
            List<FriendMessage> mem = channelSnapshot(channel);
            int idx = mem.FindIndex(x => x.id != null && x.id.SequenceEqual(id));
            if (idx >= 0)
            {
                requestJump(f, Crypto.hashToString(mem[idx].id), mem.Count - 1 - idx);
                return;
            }
            if (Interlocked.CompareExchange(ref quoteJumpBusy, 1, 0) != 0)
            {
                return;   // one disk read at a time
            }
            Task.Run(() =>
            {
                try
                {
                    List<FriendMessage> disk = IxianHandler.localStorage.readLastMessages(f, channel, 0, SharedItems.JumpCap);
                    int at = disk.FindIndex(x => x.id != null && x.id.SequenceEqual(id));
                    if (at < 0)
                    {
                        return;   // not in the history C# holds — the shell already toasted
                    }
                    // newer on disk + the in-memory rows the delayed writer has not written yet (ArrivalGuard)
                    HashSet<string> onDisk = new HashSet<string>(StringComparer.Ordinal);
                    foreach (FriendMessage d in disk)
                    {
                        if (d.id != null)
                        {
                            onDisk.Add(Crypto.hashToString(d.id));
                        }
                    }
                    int depth = disk.Count - 1 - at + mem.Count(x => x.id != null && !onDisk.Contains(Crypto.hashToString(x.id)));
                    string ownHex = Crypto.hashToString(disk[at].id);
                    MainThread.BeginInvokeOnMainThread(() => requestJump(f, ownHex, depth));   // getChatPage walks the navigation stack
                }
                catch (Exception e)
                {
                    Logging.warn("ixian:quotejump: failed (" + e.GetType().Name + ")");
                }
                finally
                {
                    Interlocked.Exchange(ref quoteJumpBusy, 0);
                }
            });
        }

        /* ═══ ★★ L2 (#649) — THERE IS NO SINGLE CHECK, AND THAT IS THE HONEST ANSWER ═══
         *
         * Damir, 2026-08-29, ruling against his own earlier pick: *"it's a lie, if it hasn't
         * left the device then it's a clock, we agreed on this."*
         *
         * An earlier cut set `sent` at the HAND-OFF — the moment the message entered the
         * send queue — and called it optimistic. It is not optimistic, it is false: the
         * message is still on this device, which is precisely what the clock means. His ⑪
         * rule settles it — a control that reports an outcome it did not cause is a delivery
         * lie, and the lie was worse than the missing state.
         *
         * ★★ AND THERE IS NO TRUTHFUL TRIGGER TO USE INSTEAD. Verified at source, not
         * assumed: `PendingMessageProcessor` exposes exactly TWO overridable hooks
         * (`onMessageSent`, `onMessageExpired`) and `onMessageSent` is reached ONLY from the
         * offline push-server branch; the DIRECT relay sets a local `sent` bool that never
         * leaves the method. `CoreStreamProcessor` has ZERO virtual members.
         * `StreamClientManager` is a static class with no event. With Core frozen at
         * 097341a there is nothing for our code to listen to.
         *
         * ⚠ SO THE BUBBLE GOES CLOCK → DOUBLE CHECK, and skips the single check — which is
         * what it did before this batch, in every room type. **The reported defect is still
         * fixed**: the clock used to sit there for ever because Core only advances at the
         * FULL member count, and `deliveryTicks` now advances it at ONE. That is the
         * complaint, and it is closed. The single check is a separate, currently
         * unreachable state.
         *
         * → CORE-3 in the cutover brief: have `onMessageSent` fire on the direct-relay path
         *   too, and in a group resolve the GROUP's Friend rather than the member's (the
         *   fan-out sends per member, so today it would write to the wrong message list). */

        public async Task onSendFile(bool media = true)
        {
            if (friend.bot
                || (friend.type == FriendType.Group && friend.metaData.botInfo.hideParticipantAddresses))
            {
                Logging.error("File sending is not supported in this chat.");
                return;
            }
            // Show file picker and send the file
            try
            {
                Stream stream = null;
                string fileName = null;
                string filePath = null;

                SpixiImageData? spixi_img_data;
                if (media)
                {
                    spixi_img_data = await SFilePicker.PickImageAsync();
                }
                else
                {
                    spixi_img_data = await SFilePicker.PickFileAsync();
                }

                if (spixi_img_data == null)
                {
                    return;
                }

                stream = spixi_img_data.stream;

                if (stream == null)
                {
                    return;
                }

                fileName = spixi_img_data.name;
                filePath = spixi_img_data.path;

                sendPreparedFile(fileName, stream, filePath);   // ★ #1208: the post-picker half, shared with the voice FILE route
            }
            catch (Exception ex)
            {
                Logging.error("Exception choosing file: " + ex.ToString());
            }
        }

        /* ★★ #1208 (S7): the POST-PICKER half of onSendFile, unchanged, factored out so C# can send a file IT made (a voice
         * message's .ogg, named and placed by C# — sendVoiceFile) without a picker. Throws as before (the caller's catch).
         * Returns the stored file message. */
        /** ★ #46 r1 (A N4 · B m-12): how far the last sendPreparedFile got — 0 nothing, 1 the transfer exists (it holds the
         *  stream), 2 Core stored the file message. Main thread only (the verb handlers). */
        private int sendPreparedStage = 0;
        private string? sendPreparedUid = null;   // ★ #46 r2: the transfer stage 1 registered (withdrawn on a later failure)

        /** Returns the stored file message, or null when Core stored none (#46 r2: the transfer is then WITHDRAWN —
         *  removeOutgoingTransfer disposes the stream, so no late Accept is served and nothing is left registered). */
        private FriendMessage? sendPreparedFile(string fileName, Stream stream, string filePath)
        {
            Address? sender_address = null;
            FileTransfer transfer = TransferManager.prepareFileTransfer(fileName, stream, filePath);
            transfer.channel = selectedChannel;
            sendPreparedStage = 1;   // ★ #46 r1 A N4: the transfer holds the stream now
            sendPreparedUid = transfer.uid;
            if (friend.bot || friend.type == FriendType.Group)
            {
                sender_address = IxianHandler.primaryWalletAddress;
                transfer.groupAddress = friend.walletAddress;
            }
            Logging.info("File Transfer uid: " + transfer.uid);

            string message_data = string.Format("{0}:{1}", transfer.uid, transfer.fileName);

            // store the message and display it
            FriendMessage? friend_message = Node.addMessageWithType(null, FriendMessageType.fileHeader, friend.walletAddress, selectedChannel, message_data, true, sender_address);
            if (friend_message == null)
            {
                // ★ #46 r2 (was an NRE two lines below): nothing stored → nothing sent, and the transfer is withdrawn
                Logging.error("File message could not be stored — the transfer is withdrawn.");
                TransferManager.removeOutgoingTransfer(transfer.uid);
                sendPreparedStage = 0;
                sendPreparedUid = null;
                return null;
            }
            sendPreparedStage = 2;   // ★ #46 r1 B m-12: Core holds the message now

            SpixiMessage spixi_message = new SpixiMessage(SpixiMessageCode.fileHeader, transfer.getBytes(), selectedChannel);
            StreamProcessor.sendSpixiMessage(friend, spixi_message, null, friend_message.id);

            friend_message.transferId = transfer.uid;
            friend_message.filePath = transfer.filePath;
            /* ★ #1147 (2) A5-SEND (walk #1146 A-A5-SEND FAIL): insertMessage queued the preview while filePath was still the
               bare name (localPathOf refuses it, SharedItems.cs:92) — queue it again now that the real path is set, so my
               sent photo shows under the scrim WHILE it sends. thumbsSent dedupes the race with any earlier job. */
            thumbAfterTransfer(transfer.uid, transfer.channel);   // ★ #1166 A-N4: the transfer's own channel

            IxianHandler.localStorage.requestWriteMessages(friend.walletAddress, selectedChannel);
            return friend_message;
        }

        public void onAcceptFile(int selected_channel, FriendMessage message)
        {
            if (TransferManager.getIncomingTransfer(message.transferId) != null)
            {
                Logging.warn("Incoming file transfer {0} already prepared.", message.transferId);
                return;
            }

            //displaySpixiAlert("File", uid, "Ok");
            string file_name = System.IO.Path.GetFileName(message.filePath);;

            var senderAddress = friend.walletAddress;
            var senderFriend = friend;
            if (friend.type == FriendType.Group)
            {
                if (Utils.hidesParticipants(friend))   // ★ #46 r1 A M2: fails CLOSED while botInfo is null (was an NRE)
                {
                    Logging.error("Cannot accept file transfer in this chat due to hidden participant addresses.");
                    return;
                }
                else
                {
                    senderAddress = message.senderAddress;
                    senderFriend = FriendList.getFriend(senderAddress);
                    if (senderFriend == null)
                    {
                        Logging.error("Cannot find group sender friend for file transfer.");
                        return;
                    }
                }
            }

            var ft = new FileTransfer();
            ft.fileName = file_name;
            ft.fileSize = message.fileSize;
            ft.uid = message.transferId;
            ft.channel = selected_channel;
            ft.incoming = true;
            ft.sender = senderAddress;
            if (message.senderAddress != null)
            {
                ft.groupAddress = friend.walletAddress;
            }
            ft = TransferManager.prepareIncomingFileTransfer(ft);

            if (ft != null)
            {
                TransferManager.acceptFile(senderFriend, ft.uid);
                updateFile(ft.uid, "0", false, ft.channel);
            }
        }

        /* ★ D-10 / I-7 (Damir F5 2026-08-15): THE TIP RESULT CHANNEL.
         * The tip sheet used to morph to a green "Tipped" the instant the verb was
         * emitted, because the shell called ctrl.done() unconditionally — so a failed
         * tip showed SUCCESS with a native error dialog on top of it. On a money
         * surface the UI must not claim a payment happened.
         * The sheet already has a complete inline failure path; it was never told.
         * `setEncPassResult` (#341) is the precedent: an inline flow has no page pop to
         * read as success, so C# has to answer.
         * ★ EVERY exit from the tip case MUST call this exactly once. A missing answer
         * leaves the sheet frozen with money-in-flight dismissal disabled, which is a
         * worse failure than the one being fixed. Damir's ruling (I-7): the body is
         * composed HERE and the shell only renders it — no balance, and no headroom
         * signal, ever crosses into the chat WebView. */
        private string tipMsgIdHex = "";
        private void sendTipResult(bool ok, string body)
        {
            // ★ audit: the id goes back with the answer. Without it a late result could
            // resolve a tip sheet the user had since opened on a DIFFERENT message.
            sendTipResultFor(ok ? "1" : "0", body, tipMsgIdHex);
        }

        /// <summary>
        /// ★★ V-2: the same channel with an EXPLICIT id and an explicit status.
        /// The native confirm is awaited, and `tipMsgIdHex` is a field that EVERY
        /// contextAction overwrites — a copy or a reaction on another message while the
        /// dialog is open would send the answer back under the wrong id. The confirm
        /// path captures the id at the start and hands it back here.
        /// "cancel" is the third status: the sheet re-enables SILENTLY, because a tip
        /// the user declined is not a tip that failed.
        /// </summary>
        private void sendTipResultFor(string status, string body, string msgIdHex)
        {
            Utils.sendUiCommand(this, "setTipResult", status ?? "0", body ?? "", msgIdHex ?? "");
        }

        public void onAcceptFriendRequest()
        {
            friend.approved = true;

            friend.handshakePushed = false;

            UIHelpers.shouldRefreshContacts = true;

            StreamProcessor.sendAcceptAdd(friend, true);

            // #434: the local accept writes the connected line too (see
            // HomePage.writeConnectedLine — ONE implementation, two call sites).
            // Node.addMessageWithType → UIHelpers.insertMessage already pushes the new
            // line into a VISIBLE chat screen, so no extra refresh is needed here (and
            // an updateScreen() would re-run the pending/waiting branches mid-accept).
            HomePage.writeConnectedLine(friend);
        }

        public void onViewPayment(string msg_id)
        {
            /* ★ QUEUE ITEM 15: this Find was UNGUARDED. A message id that is not in this
             * channel — a canceled request whose card is still on screen, a stale push —
             * returned null and every line below dereferenced it. The same class as the
             * white error page WalletContactRequestPage showed on Pay after a cancel,
             * which is gone with that page. stringToHash can throw on a malformed id too. */
            FriendMessage? msg = null;
            try
            {
                msg = friend.getMessages(selectedChannel).Find(x => x.id != null && x.id.SequenceEqual(Crypto.stringToHash(msg_id)));
            }
            catch (Exception ex)
            {
                Logging.error("onViewPayment lookup failed: " + ex.Message);
            }
            if (msg == null)
            {
                Logging.warn("onViewPayment: no such message in this channel");
                return;
            }

            if(msg.type == FriendMessageType.sentFunds || msg.message.StartsWith(":"))
            {
                string id = msg.message;
                if(id.StartsWith(":"))
                {
                    id = id.Substring(1);
                }
                byte[] b_id = Transaction.txIdLegacyToV8(id);

                Transaction? transaction = Node.activityStorage.getActivityById(b_id, null, true)?.transaction;
                if (transaction == null)
                {
                    return;
                }

                if (homePage != null)
                {
                    homePage.onTransaction(b_id, null, fromConversation: true);   // #902: back must return to THIS conversation
                    return;
                }

                hostNav.PushAsync(new WalletSentPage(transaction), Config.defaultXamarinAnimations);   // #225: root nav

                return;
            }

            /* ★★ Damir decision 4: the requestFunds branch USED to push the native
             * payment page. That page is gone, and there is nothing legitimate to route
             * here any more — an incoming request is Pay (the review sheet + the native
             * confirm) or Decline, both on the card. A shell that still asks is either
             * older than this build or asking about a card it should not have offered a
             * Details link on; either way, doing nothing is the honest answer. */
            if (msg.type == FriendMessageType.requestFunds && !msg.localSender)
            {
                Logging.warn("viewPayment on an unpaid request — the card carries Pay and Decline now");
            }
        }

        public void onApp(string app_id)
        {
            if (friend.bot)
            {
                Logging.error("App Sending is not supported in this chat.");
                return;
            }

            byte[]? session_id = null;
            if (homePage != null)
            {
                session_id = homePage.onJoinApp(app_id, friend);
            }
            else
            {
                MiniAppPage custom_app_page = new MiniAppPage(app_id, IxianHandler.getWalletStorage().getPrimaryAddress(), friend, Node.MiniAppManager.getAppEntryPoint(app_id));
                custom_app_page.accepted = true;
                Node.MiniAppManager.addAppPage(custom_app_page);
                session_id = custom_app_page.sessionId;
                MainThread.BeginInvokeOnMainThread(() =>
                {
                    hostNav.PushAsync(custom_app_page, Config.defaultXamarinAnimations);   // #225: root nav
                });
            }


            if(session_id == null)
            {
                return;
            }

            var app_info = Node.MiniAppManager.getAppInfo(app_id);
            var msg_id = StreamProcessor.sendAppRequest(friend, app_id, session_id, null, app_info);
            Node.addMessageWithType(msg_id, FriendMessageType.appSession, friend.walletAddress, 0, app_info, true, null, 0, false);
        }

        public void onJoinApp(string app_id)
        {
            if (homePage != null)
            {
                homePage.onJoinApp(app_id, friend);
                return;
            }

            MiniAppPage miniAppPage = new MiniAppPage(app_id, IxianHandler.getWalletStorage().getPrimaryAddress(), friend, Node.MiniAppManager.getAppEntryPoint(app_id));
            miniAppPage.accepted = true;
            Node.MiniAppManager.addAppPage(miniAppPage);

            MainThread.BeginInvokeOnMainThread(() =>
            {
                hostNav.PushAsync(miniAppPage, Config.defaultXamarinAnimations);   // #225: root nav
            });

        }

        public async void onInstallApp(string app_url)
        {
            if (homePage != null)
            {
                homePage.onInstallApp(app_url, friend);
                return;
            }

            MiniApp? app = await Node.MiniAppManager.fetch(app_url);
            if (app == null)
            {
                return;
            }

            app.url = app_url;

            MainThread.BeginInvokeOnMainThread(() =>
            {
                pushPageLoaded(new AppDetailsPage(app, null, true, friend));   // load-then-move (N3)
            });
        }

        private void onKickUser(Address address)
        {
            string str_address = address.ToString();
            StreamProcessor.sendBotAction(friend, SpixiBotActionCode.kickUser, address.addressWithChecksum, 0, true);
            string modal_title = String.Format(SpixiLocalization._SL("chat-modal-kicked-title"), str_address);
            string modal_body = String.Format(SpixiLocalization._SL("chat-modal-kicked-body"), str_address);
            displaySpixiAlert(modal_title, modal_body, SpixiLocalization._SL("global-dialog-ok"));

        }

        private void onBanUser(Address address)
        {
            string str_address = address.ToString();
            StreamProcessor.sendBotAction(friend, SpixiBotActionCode.banUser, address.addressWithChecksum, 0, true);
            string modal_title = String.Format(SpixiLocalization._SL("chat-modal-banned-title"), str_address);
            string modal_body = String.Format(SpixiLocalization._SL("chat-modal-banned-body"), str_address);
            displaySpixiAlert(modal_title, modal_body, SpixiLocalization._SL("global-dialog-ok"));
        }


        /// <summary>
        /// ⚠ AUDIT MINOR: one place that knows how a chat is muted, so the three entry points
        /// (this page, ContactDetails, and the chat-list row menu) cannot disagree.
        /// </summary>
        private void setChatNotifications(bool enabled)
        {
            try
            {
                if (friend.metaData != null && friend.metaData.botInfo != null)
                {
                    friend.metaData.botInfo.sendNotification = enabled;
                    friend.saveMetaData();
                    StreamProcessor.sendBotAction(friend, SpixiBotActionCode.enableNotifications, new byte[1] { (byte)(enabled ? 1 : 0) }, 0, true);
                }
                else
                {
                    SNotificationPrefs.setContactMuted(friend.walletAddress.ToString(), !enabled);
                }
                UIHelpers.shouldRefreshContacts = true;
            }
            catch (Exception e)
            {
                Logging.error("setChatNotifications failed: " + e);
            }
        }

        private void onContextAction(string action, string msg_id_hex)
        {
            string data = "";
            if (msg_id_hex.Contains(':'))
            {
                int sep_offset = msg_id_hex.IndexOf(':');
                data = msg_id_hex.Substring(sep_offset + 1);
                msg_id_hex = msg_id_hex.Substring(0, sep_offset);
            }
            /* ★ review r2: stringToHash is OUTSIDE the tip fence, and the fence's own
             * comment names it as one of the throws it exists to contain. It is not a
             * theoretical gap: a malformed or truncated id throws here, the tip case is
             * never entered, nothing answers, and BOTH consequences land in full — the
             * sheet frozen with dismissal disabled until the 12 s backstop, and an
             * unhandled exception out of a MAUI Navigating handler, which kills the
             * process on Android and iOS. Fence the prologue too. */
            tipMsgIdHex = msg_id_hex;   // ★ audit: correlate the tip answer with its message
            byte[] msg_id;
            try
            {
                msg_id = Crypto.stringToHash(msg_id_hex);
            }
            catch (Exception idEx)
            {
                Logging.error("Context action received a malformed message id: " + idEx);
                if (action == "tip")
                {
                    sendTipResult(false, SpixiLocalization._SL("chat-modal-tip-error-body"));
                }
                return;
            }
            switch(action)
            {
                case "tip":
                    /* ★ audit 2026-08-15 — EVERY EXIT MUST ANSWER, INCLUDING A THROW.
                     * The sheet disables light-dismiss and Esc while money is in flight, so
                     * an unanswered exit strands the user in a frozen sheet until the 12 s
                     * backstop fires. The early returns below each report; a THROW did not.
                     * The exposed lines are real: Crypto.stringToHash on a malformed id,
                     * new IxiNumber on a malformed amount, prepareTransactionFrom — and,
                     * worst, sendReaction / addTransaction AFTER addReaction has already
                     * committed the local tip pill.
                     * ★ It also prevents a CRASH: onNavigating dispatches this bare, so an
                     * escaping exception leaves a MAUI Navigating handler unhandled, which
                     * takes the process down on Android and iOS.
                     * ⚠ Correction to the older comments in this method: several claim a
                     * throw escapes "before e.Cancel = true (:424)". That is WRONG —
                     * e.Cancel is set at the TOP of onNavigating (:106) and :424 is a
                     * redundant re-set. The real consequence is the crash above, which is
                     * worse than what those comments describe, so every guard still stands. */
                    try
                    {
                    // W8 (#348, Damir F5): tip is now allowed in BOT groups. It was
                    // blocked for every bot, which is why the option was missing there
                    // while a normal group still had it.
                    // BLIND chats stay blocked, and the test had to move to say so
                    // correctly: a bot is chat_type 3 REGARDLESS of
                    // hideParticipantAddresses (onLoad:604-608), so a blind BOT would
                    // have fallen straight through a `friend.type == Group` test and
                    // reached the money path with a hidden sender. The flag is now
                    // read for bots AND groups, and never for a 1:1 — botInfo is null
                    // there, and onLoad only waits for it when chat_type > 0 (:622).
                    // ★ review MAJOR-14/MINOR-16: FAIL CLOSED on missing metadata.
                    // The old `friend.bot || (Group && …botInfo…)` short-circuited for a
                    // bot and never touched botInfo; this predicate reads it for bots too,
                    // and botInfo genuinely can be null here — this file null-guards the
                    // identical expression twice (:596, :2042), and a friend can BECOME a
                    // bot after onLoad computed chat_type (joinBot creates it as Normal,
                    // the metadata lands later, and nothing re-runs onLoad). Without this
                    // the NRE escapes onNavigating before `e.Cancel = true`, so the WebView
                    // navigates to the raw ixian: URL — the documented MAJOR class.
                    // Unknown blindness means we do not pay: refuse.
                    if (friend.bot || friend.type == FriendType.Group)
                    {
                        if (friend.metaData == null || friend.metaData.botInfo == null)
                        {
                            Logging.error("Send IXI: chat metadata is not loaded yet.");
                            sendTipResult(false, SpixiLocalization._SL("chat-modal-tip-error-body"));
                            return;
                        }
                        if (friend.metaData.botInfo.hideParticipantAddresses)
                        {
                            Logging.error("Send IXI is not supported in this chat.");
                            sendTipResult(false, SpixiLocalization._SL("chat-modal-tip-error-body"));
                            return;
                        }
                    }

                    FriendMessage msg = friend.getMessages(selectedChannel).Find(x => x.id != null && x.id.SequenceEqual(msg_id));
                    // The message must exist before anything reads it. Find() returns
                    // null for an id that is not in THIS channel, and every line below
                    // is on the money path.
                    if (msg == null)
                    {
                        Logging.error("Tip target message was not found in this channel.");
                        sendTipResult(false, SpixiLocalization._SL("chat-modal-tip-error-body"));
                        return;
                    }
                    /* ★ Session AF (#950, Damir on AE.12): a SECOND tip on the same message from this
                     * wallet. Core keeps ONE tip per sender per message (FriendMessage.addReaction
                     * refuses a second entry for the same sender under the same key, #942), so the
                     * old path showed the native confirm, the user said yes, addReaction returned
                     * false and the sheet read "An unknown error occurred" — after asking to spend.
                     * The refusal is known here, BEFORE any transaction is prepared or confirmed:
                     * say the true thing and stop. The post-confirm branch below keeps the generic
                     * copy for Core refusals we cannot name, and re-uses this test first. */
                    if (hasOwnTip(msg))
                    {
                        Logging.info("Tip refused: this wallet already tipped the message.");
                        sendTipResult(false, SpixiLocalization._SL("chat-modal-tip-already-body"));
                        return;
                    }
                    ExtendedAddress sender_address = new ExtendedAddress(friend.walletAddress, AddressPaymentFlag.OfflineTag, null);
                    if (friend.bot
                       || (friend.type == FriendType.Group && !friend.metaData.botInfo.hideParticipantAddresses))
                    {
                        // This bot branch existed already but was DEAD — the guard above
                        // returned for every bot before it could run. It is the author's
                        // own intent for how a bot tip resolves its recipient, and it is
                        // what now carries the bot case.
                        // Guard the address: Ixian-Core 0.9.8k stopped storing
                        // senderAddress on 1:1 messages, and an own or system post in a
                        // channel can carry none either. Paying a null recipient is not
                        // a thing we do.
                        // ★ D-19b (#370): a NAMED address-less row gets one repair try —
                        // the same roster reverse-resolve insertMessage used to offer the
                        // Tip button (exact single match; blind rooms never reach this
                        // branch — the hideParticipantAddresses guard above refused).
                        // Re-resolving AT SPEND TIME is deliberate: if the roster changed
                        // since render (a second member now shares the nick), the match
                        // goes ambiguous and the tip refuses instead of paying the wrong
                        // person.
                        Address? tipTarget = msg.senderAddress;
                        if (tipTarget == null)
                        {
                            tipTarget = reverseResolveSenderByNick(msg.senderNick);
                            // ★ A-2 (#370) RENDER→SPEND BINDING: the resolve must equal
                            // the address this page PUSHED for this row — the address the
                            // user is looking at in the sheet. A roster change between
                            // render and spend (or a row the FE never got an address for)
                            // refuses instead of silently paying somewhere else.
                            if (tipTarget != null
                                && (!resolvedSenderByMsgId.TryGetValue(msg_id_hex, out string shownAddr)
                                    || shownAddr != tipTarget.ToString()))
                            {
                                Logging.error("Tip target resolve does not match the rendered sender.");
                                tipTarget = null;
                            }
                        }
                        if (tipTarget == null)
                        {
                            // ★ review r2 MEDIUM: this must not be silent. Answer honestly
                            // instead of dropping it. (History: before #356 the slot was
                            // seeded with friend.nickname on a null-address message, so the
                            // FE guard saw a non-empty string and offered Tip; #356 sends ""
                            // and the FE guard now suppresses Tip on those rows — this
                            // branch remains as the belt for an old shell on a new exe.)
                            Logging.error("Tip target message carries no sender address.");
                            // ★ review r3: chat-modal-tip-title is "Tip {0}?" — a FORMAT
                            // string. Passed raw it printed a literal {0} in every locale.
                            sendTipResult(false, SpixiLocalization._SL("chat-modal-tip-error-body"));
                            return;
                        }
                        sender_address = new ExtendedAddress(tipTarget, AddressPaymentFlag.OfflineTag, null);
                    }
                    IxiNumber amount = new IxiNumber(data);
                    var prepTx = Node.prepareTransactionFrom(IxianHandler.getWalletStorage().getPrimaryAddress(), sender_address, amount);
                    var tx = prepTx.transaction;
                    // ★ review r2 CRITICAL: prepareTransactionFrom RETURNS NULL — on
                    // insufficient funds (Node.cs:938) and on a foreign from-address
                    // (:883). Every line below dereferences tx, so an over-balance tip
                    // threw an NRE, and the throw escapes onNavigating before
                    // `e.Cancel = true` (:424) — so the WebView then navigated to the raw
                    // ixian: URL and destroyed the conversation document.
                    // The tip sheet cannot catch this for us: the shell opens it with
                    // `balance: null` on purpose (chat.html:2124), because C# owns the real
                    // balance check. This IS that check.
                    // The legacy confirm page was the precedent for the shape
                    // (WalletSend2Page, deleted with ★★ L1 #640).
                    if (tx == null)
                    {
                        // ★ review r3: say WHY. prepareTransactionFrom checks the balance
                        // itself (check_balance defaults true, Node.cs:936-946), so this
                        // branch IS the insufficient-funds case in practice — and
                        // "Invalid Amount" told a user with 5 IXI trying to tip 50 that
                        // their amount was malformed. Reuse the balance wording, which
                        // exists for exactly this and names both numbers.
                        // ★ review r4: {0} is "Total cost of the transaction", NOT the
                        // amount. Passing the bare amount produced "cost is 10, balance
                        // is 10" for a user with exactly 10 IXI — two identical numbers
                        // under "Insufficient Balance", and a retry loop, because the
                        // shortfall is the FEE. calculateTransactionFee re-prepares with
                        // check_balance:false and returns exactly that delta (Node.cs:870).
                        IxiNumber tip_total = amount;
                        try
                        {
                            tip_total = amount + Node.calculateTransactionFee(IxianHandler.getWalletStorage().getPrimaryAddress(), sender_address, amount);
                        }
                        catch (Exception fee_ex)
                        {
                            Logging.warn("Could not compute the tip fee for the balance message: " + fee_ex);
                        }
                        // ★ I-6 (#360): amounts in composed sentences render in the app language
                        string short_body = String.Format(SpixiLocalization._SL("wallet-error-balance-text"), Utils.amountToLocalizedDisplayString(tip_total), Utils.amountToLocalizedDisplayString(IxianHandler.getWalletBalance(IxianHandler.getWalletStorage().getPrimaryAddress())));
                        // ★ I-7 (Damir): INLINE. C# composes the sentence — it owns the
                        // numbers — and the shell only renders it.
                        sendTipResult(false, short_body);
                        return;
                    }
                    var relayNodeAddresses = prepTx.relayNodeAddresses;
                    IxiNumber balance = IxianHandler.getWalletBalance(IxianHandler.getWalletStorage().getPrimaryAddress());
                    if(tx.amount <= 0)
                    {
                        sendTipResult(false, SpixiLocalization._SL("wallet-error-amount-text"));
                        return;
                    }
                    // ★ review r3: a BELT, not the live path — the guard above already
                    // returns for an over-balance tip. Kept because `check_balance` is
                    // Ixian-Core's behaviour, not ours, and #215 says do not assume it.
                    if (tx.amount + tx.fee > balance)
                    {
                        // ★ I-6 (#360): amounts in composed sentences render in the app language
                        string alert_body = String.Format(SpixiLocalization._SL("wallet-error-balance-text"), Utils.amountToLocalizedDisplayString(tx.amount + tx.fee), Utils.amountToLocalizedDisplayString(balance));
                        sendTipResult(false, alert_body);
                    }
                    else
                    {
                        /* ★ D-11 RESOLVED BY DELETION (audit 2026-08-15).
                         * Damir's complaint was that the tip ALERT asked "Tip <group name>?"
                         * instead of naming the member. A nick ladder was written here to
                         * fix it — and the audit proved the whole thing was DEAD CODE. The
                         * name the user reads is now SPayments.recipientDisplay, which is
                         * the SAME ladder Send and Pay use: the nickname when the target is
                         * a contact, and always the full address under it. It never says
                         * the group's name, because it never looks at the group.
                         *
                         * ★★ V-2 (#46 loop 2026-08-29) — THE NATIVE CONFIRM.
                         * Everything below spends money from a WebView-composed amount, and
                         * until now it did so with no native wall at all. CLAUDE.md forbids
                         * exactly that, and V-1 proved the cost: a paste could put a hundred
                         * times the intended amount on the wire with the right number still
                         * on screen, and this was the one surface where nothing asked again.
                         * Damir's ruling, 2026-08-29: the native dialog IS the tip's review
                         * step — presets and custom alike, one grammar, and it shows the fee
                         * because the prepared transaction already carries it.
                         *
                         * ⚠ ORDER. The confirm runs BEFORE friend.addReaction. The reaction
                         * writes the local tip pill, so confirming after it would leave a
                         * pill over a payment the user had just refused. The old order was
                         * safe only because nothing could refuse.
                         *
                         * ⚠ onNavigating is synchronous, so the wait cannot happen inline.
                         * The tail runs in a local async lambda over values captured HERE —
                         * tipMsgIdHex is a field and every contextAction overwrites it, so
                         * the answer carries the id this tip was started with. Every exit
                         * still answers exactly once, including a throw. */
                        var relaysForTip = relayNodeAddresses;
                        var txForTip = tx;
                        var senderForTip = sender_address;
                        var msgIdForTip = msg_id;
                        int channelForTip = selectedChannel;
                        string tipIdForAnswer = tipMsgIdHex;
                        string tipPayee = sender_address.PaymentAddress.ToString();
                        Func<Task> commitTip = async () =>
                        {
                            try
                            {
                                // The sheet arms a 12 s backstop for an exe that never
                                // answers. A human reading a dialog is not that case, so
                                // say "I have it" before the wait — the shell re-arms at
                                // 120 s instead of accusing a live confirm of being lost.
                                sendTipResultFor("pending", "", tipIdForAnswer);
                                bool confirmed = await SPayments.confirmTip(this, tipPayee, txForTip.amount, txForTip.fee);
                                if (!confirmed)
                                {
                                    // A cancel is not a failure. "cancel" re-enables the sheet
                                    // silently — an error line here would tell the user that
                                    // something went wrong with a tip they chose not to send.
                                    sendTipResultFor("cancel", "", tipIdForAnswer);
                                    return;
                                }
                                /* ★ C6 (Session AD): the tip token carries the AMOUNT. It used to be
                                 * `"tip:" + txForTip.id` — and `Transaction.id` is a byte[], so every
                                 * tip ever stored or sent read `tip:System.Byte[]` (the baseline had
                                 * the same line). Core keeps the text after the first ':' as the
                                 * reaction's per-sender data (≤ 32 chars in total; an IxiNumber
                                 * string fits, a txid string never did), so the recipient can now
                                 * show "Tipped 5 IXI". The amount is what the TIPPER's client claims —
                                 * a display fact, never a balance; the real transfer is the tx. */
                                string tipToken = "tip:" + txForTip.amount.ToString();
                                if (friend.addReaction(IxianHandler.getWalletStorage().getPrimaryAddress(), new ReactionMessage(msgIdForTip, tipToken), channelForTip))
                                {
                                    CoreMessageWriter.arrivals.markDirty(friend.walletAddress.ToString(), channelForTip);   // ★ #1155 r4 m2: the tip pill survives a quick re-open
                                    updateReactions(msgIdForTip, channelForTip);
                                    StreamProcessor.sendReaction(friend, msgIdForTip, tipToken, channelForTip);
                                    IxianHandler.addTransaction(txForTip, relaysForTip, new() { senderForTip }, null, true);
                                    // D-10: the SHEET reports the result — it morphs and closes,
                                    // and the tip pill lands over the message via addReactions.
                                    sendTipResultFor("1", "", tipIdForAnswer);
                                }
                                else
                                {
                                    // 🟡 D-12: this is the "you already tipped this message" case in
                                    // practice (Damir proved the one-tip rule by testing, and it holds
                                    // in legacy too) — but Friend.addReaction is Ixian-Core and can
                                    // refuse for reasons we cannot enumerate, so the copy stays
                                    // generic until the BE engineer confirms. It is at least INLINE
                                    // and on the sheet now, instead of a native dialog.
                                    // ★ #950: the one refusal we CAN name gets its true copy (a race: a tip
                                    // that landed between the pre-check and the confirm); the rest stay generic.
                                    sendTipResultFor("0", SpixiLocalization._SL(hasOwnTip(msg) ? "chat-modal-tip-already-body" : "chat-modal-tip-error-body"), tipIdForAnswer);
                                }
                            }
                            catch (Exception commitEx)
                            {
                                // The sheet is WAITING and its dismissal is disabled while money
                                // is in flight. An unanswered exit strands it until the 12 s
                                // backstop. The known residual of the D-10 note still applies:
                                // a throw AFTER addReaction leaves a pill over a "failed" answer.
                                Logging.error("Tip commit failed: " + commitEx);
                                try { sendTipResultFor("0", SpixiLocalization._SL("chat-modal-tip-error-body"), tipIdForAnswer); } catch (Exception) { }
                            }
                        };
                        _ = commitTip();
                    }
                    }
                    catch (Exception tipEx)
                    {
                        /* The sheet is WAITING. Answer it, then let the log carry the detail.
                         *
                         * 🟡 KNOWN RESIDUAL (review r2 finding 2b, logged in
                         * docs/f5-findings-2026-08-15.md under D-10). This answer is always
                         * "not sent". friend.addReaction above commits the tip pill to the
                         * LOCAL store before sendReaction and addTransaction run, so a throw
                         * in either of those two leaves the sheet saying "failed" over a
                         * message that already carries a tip pill.
                         * It is NOT fixed here, on purpose:
                         *   · an honest third answer ("unsure") needs a new string in 13
                         *     locale files — the same block that holds D-12;
                         *   · rolling the reaction back needs a remove counterpart to
                         *     Friend.addReaction, which is Ixian-Core, and this repository
                         *     holds no evidence that one exists (#215: zero C# without
                         *     evidence). The BE engineer answers this.
                         * Before #348 the same throw escaped into onNavigating and destroyed
                         * the conversation document, so this catch is still the big win. */
                        Logging.error("Tip failed with an exception: " + tipEx);
                        sendTipResult(false, SpixiLocalization._SL("chat-modal-tip-error-body"));
                    }
                    break;

                case "sendContactRequest":
                    if (friend.bot
                        || (friend.type == FriendType.Group && friend.metaData.botInfo.hideParticipantAddresses))
                    {
                        Logging.error("Send IXI is not supported in this chat.");
                        return;
                    }
                    /* ★★ MINOR-5 (#46 loop r2) — GUARD THE LOOKUP. `getMessages` can return
                     * null, and `Find` returns null for an id that is not in this channel.
                     * The old line chained `.senderAddress` onto both, so a stale or crafted
                     * id threw a NullReferenceException. `onContextAction` is dispatched BARE
                     * from `onNavigating` (:333), and this file already records what that
                     * costs: an escaping exception leaves a MAUI Navigating handler unhandled
                     * and takes the process down on Android and iOS (the note at the top of this method).
                     * ⚠ THIS FILE MIXES BOTH FORMS. `:1810` and `:1831` guard; four sites did
                     * not. All four are repaired in this batch. Count the surfaces. */
                    FriendMessage? req_msg = friend.getMessages(selectedChannel)?.Find(x => x.id != null && x.id.SequenceEqual(msg_id));
                    if (req_msg == null || req_msg.senderAddress == null)
                    {
                        Logging.error("sendContactRequest: the source message was not found in this channel.");
                        return;
                    }
                    Address new_friend_address = req_msg.senderAddress;
                    Friend new_friend = FriendList.addFriend(FriendType.Normal, FriendState.RequestSent, new_friend_address, null, new_friend_address.ToString(), null, null, 0);
                    if (new_friend != null)
                    {
                        new_friend.save();
                        SRequestIgnore.remove(new_friend_address.ToString());   // ★ #985 (r3): the user's own request is their latest word — take it off the ignore list BEFORE the send (a throwing send must not leave it listed)

                        UIHelpers.shouldRefreshContacts = true;

                        StreamProcessor.sendContactRequest(new_friend);

                        if (new_friend.approved)
                        {
                            CoreProtocolMessage.resubscribeEvents();
                        }
                    }
                    break;

                /* ★★ MINOR-5 (#46 loop r2): the same unguarded chain as sendContactRequest
                 * above, twice. One lookup serves both rows now, so the rule has ONE home.
                 * ⚠ Scope is unchanged: kick and ban stay bot-room only. This guard refuses
                 * a message id the channel does not hold; it grants nothing. */
                case "kickUser":
                case "banUser":
                    {
                        FriendMessage? mod_msg = friend.getMessages(selectedChannel)?.Find(x => x.id != null && x.id.SequenceEqual(msg_id));
                        if (mod_msg == null || mod_msg.senderAddress == null)
                        {
                            Logging.error("{0}: the target message was not found in this channel.", action);
                            return;
                        }
                        if (action == "kickUser")
                        {
                            onKickUser(mod_msg.senderAddress);
                        }
                        else
                        {
                            onBanUser(mod_msg.senderAddress);
                        }
                    }
                    break;

                case "report":
                    if (friend.bot)
                    {
                        StreamProcessor.sendMsgReport(friend, msg_id, selectedChannel);
                        CoreMessageWriter.arrivals.forgetMessage(friend.walletAddress.ToString(), msg_id);   // ★ P0 #1155: never put back
                        CoreMessageWriter.arrivals.markDirty(friend.walletAddress.ToString(), selectedChannel);   // ★ #1155 r3 m2: the blanked row reaches disk before a quick re-open
                        friend.deleteMessage(msg_id, selectedChannel);
                    }
                    break;

                case "cancelInvite":
                    // ★ Batch B (#544) B2 — app-invite CANCEL (#533 ①, the locked shape): the
                    // RECIPIENT's invite is REMOVED through the existing msgDelete path, and the
                    // SENDER'S copy STAYS (the shell paints it as a persistent "Canceled"
                    // tombstone — the #214 declined pattern; the user keeps the bubble unless
                    // they delete it). So: sendMsgDelete to the peer, NO local delete. Guarded to
                    // an OWN appSession message — anything else is a no-op (a crafted id must
                    // not turn into a remote delete of somebody else's message).
                    {
                        FriendMessage inv_msg = friend.getMessages(selectedChannel)?.Find(x => x.id != null && x.id.SequenceEqual(msg_id));
                        if (inv_msg != null && inv_msg.type == FriendMessageType.appSession && inv_msg.localSender && !friend.bot)
                        {
                            sendSilentMsgDelete(friend, msg_id, selectedChannel);   // ★ A10 (#1128)
                            Utils.sendUiCommand(this, "cancelInviteResult", Crypto.hashToString(msg_id), "ok");
                        }
                        else
                        {
                            Utils.sendUiCommand(this, "cancelInviteResult", Crypto.hashToString(msg_id), "fail");
                        }
                    }
                    break;

                case "deleteMessage":
                    // #334 (file-send Cancel): deleting an OWN un-completed file OFFER
                    // is the cancel path — ALSO kill the in-memory outgoing transfer,
                    // or the "deleted" offer kept serving a late Accept until an app
                    // restart. Deleting the message keeps it dead across history
                    // reloads (the SpixiLocalStorageCallbacks resurrect re-prepares
                    // only surviving incomplete own fileHeader messages).
                    {
                        FriendMessage del_msg = friend.getMessages(selectedChannel)?.Find(x => x.id != null && x.id.SequenceEqual(msg_id));
                        if (del_msg != null && del_msg.type == FriendMessageType.fileHeader && del_msg.localSender && !del_msg.completed)
                        {
                            TransferManager.removeOutgoingTransfer(del_msg.transferId);
                        }
                    }
                    sendSilentMsgDelete(friend, msg_id, selectedChannel);   // ★ A10 (#1128)
                    if (!friend.bot)
                    {
                        CoreMessageWriter.arrivals.forgetMessage(friend.walletAddress.ToString(), msg_id);   // ★ P0 #1155: never put back
                        CoreMessageWriter.arrivals.markDirty(friend.walletAddress.ToString(), selectedChannel);   // ★ #1155 r3 m2: the blanked row reaches disk before a quick re-open
                        if (friend.deleteMessage(msg_id, selectedChannel))
                        {
                            deleteMessage(msg_id, selectedChannel);
                            // ★ C16 / Q12 (Session AD): Core just recomputed lastMessage —
                            // the chats row learns it NOW, not at the next full flush.
                            UIHelpers.refreshChatRow(friend);
                        }
                    }
                    break;

                case "like":
                    var address = IxianHandler.getWalletStorage().getPrimaryAddress();
                    /* ★★ ROUND 3 (review3-cs MINOR-1) — THE WRITER OF THE PAIR. It read the
                     * same raw chain and threw on a group with no BotInfo: the tap did
                     * nothing and no reaction was stored. Read `updateReactions` for why
                     * the BotInfo term stays beside the one-truth predicate. Both sites
                     * must derive on exactly the same condition. */
                    if (Utils.hidesParticipants(friend)
                        && friend.metaData?.botInfo != null
                        && friend.users.getOwner() != null
                        && !friend.users.getOwner().SequenceEqual(address))
                    {
                        // if blind group and not owner, use derived address
                        address = GroupChat.DeriveGroupAddress(address, friend.metaData.botInfo.randomId);
                    }
                    if (friend.addReaction(address, new ReactionMessage(msg_id, "like:"), selectedChannel))
                    {
                        CoreMessageWriter.arrivals.markDirty(friend.walletAddress.ToString(), selectedChannel);   // ★ #1155 r4 m2
                        updateReactions(msg_id, selectedChannel);
                        StreamProcessor.sendReaction(friend, msg_id, "like:", selectedChannel);
                    }
                    break;
            }
        }

        /* ★ A10 (#1128, Damir: "B gets one notification per deleted message, opens the chat, nothing new").
         * Core's sendMsgDelete sends with send_push_notification TRUE (CoreStreamProcessor.cs:2852–2857, the push-TRUE call at :2856), so the push
         * server shows a visible notification per delete, and the receiver cannot filter it (the push carries only
         * the sender address). The SAME message, queued and stored on the server exactly like sendMsgDelete
         * (pending + server, remove_after_sending false), with the push flag OFF — an offline peer still gets the
         * delete, silently. The msgRead precedent below (sendSpixiMessage(…, true, true, false, false)). */
        private static void sendSilentMsgDelete(Friend friend, byte[] msg_id, int channel)
        {
            SpixiMessage spixi_message = new SpixiMessage(SpixiMessageCode.msgDelete, msg_id, channel);
            StreamProcessor.sendSpixiMessage(friend, spixi_message, null, null, true, true, false, false);
        }

        private void onEntryCompleted(object sender, EventArgs e)
        {

        }

        public void loadApps()
        {
            p1SpareAfterWork("loadapps");   // ★ #1166 lever 4 probe — TEMPORARY: stamped only inside the 600 ms after a SPARE present (SpixiContentPage)
            Utils.sendUiCommand(this, "clearApps");
            var apps = Node.MiniAppManager.getInstalledApps();
            lock (apps)
            {
                foreach (MiniApp app in apps.Values)
                {
                    try
                    {
                        if (!app.hasCapability(MiniAppCapabilities.MultiUser))
                        {
                            continue;
                        }

                        string icon = Node.MiniAppManager.getAppIconPath(app.id);
                        if (icon == null)
                        {
                            icon = "";
                        }
                        icon = Utils.imageToDataUri(icon);   // X1
                        Utils.sendUiCommand(this, "addApp", app.id, app.name, icon, app.publisher);
                    }
                    catch (Exception e)
                    {
                        Logging.error("Exception while loading app '{0}': {1}", app.id, e);
                    }
                }
            }
        }

        /* ═══ ★★ Session P — THE BATCH TRANSPORT (#298, docs/chat-transport-spec.md §2 B1 + B3) ═══
         *
         * WHAT IT REPLACES. Every row of a history load was its own `sendUiCommand` — its own
         * main-thread marshal and its own EvaluateJavaScriptAsync — plus one more for the row's
         * reactions. #796 measured the cost on the phone: `drain → painted` 96–126 ms of which
         * the shell's own work is 26–38 ms; the rest is ~12 serial evals queued on the Android
         * WebView. So the load burst now crosses ONCE: `addMessages(<base64 JSON>, "append")`
         * carrying every row the loop below would have pushed, in the SAME ORDER, with the SAME
         * command names and the SAME argument strings, and each row's reactions folded into its
         * own item. Then `messagesDone`, the end-of-batch signal the shell never had — it ends
         * the render burst by SIGNAL instead of by its 250 ms safety timer (spec §1c).
         *
         * WHAT DOES NOT CHANGE. `insertMessage` and `updateReactions` keep their public shapes
         * for LIVE arrivals and still push one command each there — the batch is a sink they
         * write into ONLY when the loader hands them one. `clearMessages(show_more)` still opens
         * the burst and still carries the end-of-history flag. `onChatScreenLoaded` still follows
         * on the open path. An OLD shell that lacks `addMessages` never reaches the dispatcher:
         * the bare global is undefined and throws inside evaluateJavascript's `try{…}catch(e){}`
         * wrapper (#258), so the push is silently dropped and that shell's 250 ms timer paints
         * an empty log — the shell and the exe ship together, so this is the version-skew
         * class #768's ladder exists for, not a live case. The other direction (an OLD exe
         * against this shell) IS live and is pinned behaviourally.
         *
         * THE WIRE. The one argument is base64 (escapeHtmlParameter, the ordinary path — JSON
         * carries quotes and backslashes, so it may never ride the raw data-URI fast path) of
         *   { "strs": [ …interned long strings… ], "items": [ { "f": "<command>", "a": [ …args… ], "r": [reactions, own] }, … ] }
         * An arg is a string, `null` (the dispatcher's rule: null → ""), or an INTEGER that
         * indexes `strs` — avatars are data: URIs of 5–50 KB and a 1:1 history repeats the same
         * one on every received row; interning keeps the single eval small, which is the point.
         * `r` is present exactly when the loop would have pushed `addReactions` for that row
         * (always, except a row whose reaction read threw — that row carries no `r`, exactly as
         * the per-row transport pushed no `addReactions` for it), so the shell's per-row state is
         * byte-identical to the old transport;
         * a row whose insertMessage pushed nothing (an approved friend's requestAdd) yields a
         * standalone `addReactions` item, which the shell's allowlist admits (the eighth name)
         * and which is the same no-op on an unknown id the old transport performed.
         *
         * SECURITY (docs/security-handover-gate.md): a new push that carries message text is a
         * SINK. The shell dispatches each item to the SAME handler the old transport called, by
         * an allowlist of the seven row commands + addReactions (eight names), and those handlers are
         * textContent-only — no new escaping path, no innerHTML, no eval of item content. Not
         * B2 (prepend) and not B4 (the window) — those are separate decisions (DECISIONS,
         * Session P): the verb accepts "prepend" so the shell contract is complete, but this
         * exe sends only "append". */
        private sealed class UiBatch
        {
            public readonly List<Dictionary<string, object?>> items = new();
            public readonly List<string> strs = new();
            /** ★ A5 #1124: image-file rows of this burst whose preview is queued only AFTER messagesDone (id → message). */
            public readonly List<KeyValuePair<string, FriendMessage>> thumbs = new();
            /** ★ #1208 V4: voice rows of this burst whose waveform is queued only AFTER the batch's pushes (id → message). */
            public readonly List<KeyValuePair<string, FriendMessage>> voices = new();
            /** ★ #1202 (#1190 #46 r5 MINOR): the file rows of this burst + the fLocal each carried (re-checked after the pushes). */
            public readonly List<KeyValuePair<FriendMessage, string>> fileRows = new();
            /** ★ #46 r1 A MAJOR-1: the ONE reply index of this load (null = no loaded row is quote-shaped). */
            public ReplyQuote.Index? replyIndex = null;
            private readonly Dictionary<string, int> strIndex = new();
            /** Only a long data: URI is interned — everything else stays inline. */
            private const int INTERN_MIN_LENGTH = 256;

            public void add(string cmd, string?[] args)
            {
                object?[] a = new object?[args.Length];
                for (int i = 0; i < args.Length; i++)
                {
                    a[i] = intern(args[i]);
                }
                items.Add(new Dictionary<string, object?> { ["f"] = cmd, ["a"] = a });
            }

            private object? intern(string? s)
            {
                if (s == null)
                {
                    return null;
                }
                if (s.Length >= INTERN_MIN_LENGTH && s.StartsWith("data:", StringComparison.Ordinal))
                {
                    if (!strIndex.TryGetValue(s, out int idx))
                    {
                        idx = strs.Count;
                        strs.Add(s);
                        strIndex[s] = idx;
                    }
                    return idx;
                }
                return s;
            }

            /** Fold the reactions into the LAST item when it is this message's own row;
             *  otherwise a standalone addReactions item (a row insertMessage skipped — the shell
             *  admits it and no-ops on the unknown id, exactly as the per-row push did). */
            public void addReactions(string id, string reactions, string own, string tipTotal)
            {
                if (items.Count > 0)
                {
                    var last = items[items.Count - 1];
                    if (!last.ContainsKey("r") && last["a"] is object[] a && a.Length > 0 && a[0] is string lastId && lastId == id
                        && last["f"] is string f && f != "showContactRequest")
                    {
                        last["r"] = new string[] { reactions, own, tipTotal };   // ★ C6: the third slot
                        return;
                    }
                }
                add("addReactions", new string?[] { id, reactions, own, tipTotal });
            }

            public string toJson()
            {
                return JsonConvert.SerializeObject(new Dictionary<string, object> { ["strs"] = strs, ["items"] = items });
            }
        }

        /** One row push: into the batch when the loader handed one, else the live wire. */
        private void push(UiBatch? batch, string cmd, params string?[] args)
        {
            if (batch != null)
            {
                batch.add(cmd, args);
                return;
            }
            Utils.sendUiCommand(this, cmd, args);
        }

        /* ★★ #907 — A DELETED MESSAGE IS A TOMBSTONE, AND THE WINDOW WAS COUNTING TOMBSTONES.
         * Damir, 2026-09-19: "I deleted in chat by selecting and deleting messages, and I ended
         * up with 5 messages before 'show older', and now each time I get into the chat it shows
         * 5 messages ... it doesn't paint the last 50, like there is a cutoff."
         * Ixian-Core does not remove a deleted message. `Friend.deleteMessage` (Friend.cs:949,
         * 097341a — read, not assumed) sets `fm.message = ""` and writes the list back, so the
         * row stays in storage for good. `readLastMessages` then hands back the last N STORED
         * rows, tombstones included, and the loop below skips them at render. Delete 45 of the
         * newest 50 and the window holds 5 visible rows + 45 tombstones: five bubbles, and
         * `messages.Count < messagesToShow` is false, so "show older" is offered — on EVERY
         * open, because the tombstones never leave. Inherited (the baseline skips the same
         * rows and counts the same way); multi-select delete is what made it easy to reach.
         * `messagesToShow` now means what its name says: VISIBLE messages. The window is widened
         * until it holds that many PLUS ONE (the proof that more exists), or storage is exhausted (Count < window is exhaustion —
         * readLastMessages stops only when it runs out of files). Doubling keeps the re-reads
         * logarithmic; the pass cap bounds a history that is almost entirely tombstones.
         * ⚠ Every widened read REPLACES Core's cached channel list (`msg_count != 100`), the
         * CORE-8 hazard the batch comment below describes — this adds passes to that window only
         * for a chat that has tombstones in its newest rows. The real fix is Core's: either
         * delete the row, or let readLastMessages skip tombstones (be-cutover CORE-9). */
        private const int LOAD_WINDOW_MAX_PASSES = 8;   // want 50: 51 → 6528 stored rows (it scales with `want`)
        /* THE ONE PREDICATE: does this stored row put NOTHING in the log? The first cut asked only
         * "standard and empty", which is the old inline test — and `Friend.deleteMessage` blanks ANY
         * type. A deleted FILE, a canceled app invite, a canceled payment request and a deleted
         * payment are all rows insertMessage (or the shell's #529 ghost guard) renders nothing for,
         * so 20 deleted files in the newest 50 still opened the chat 20 bubbles short. Two arms:
         *  · types insertMessage has NO bubble for at all (it has no branch, or the branch only
         *    returns) — the contact-request bookkeeping rows, kicked/banned, appSessionEnd, reaction;
         *  · types that render only while they still carry their payload.
         * ⚠ voiceCall / voiceCallEnd are deliberately NOT here, and cannot be: an EMPTY call row is
         * how Core stores a call nobody answered, so a DELETED call row is indistinguishable from
         * a missed one — it comes back as "No answer" on the next open. That is CORE-9's second
         * consequence, and only real deletion fixes it.
         * The suite ties both arms to insertMessage's own branches, so a type that gains or loses a
         * bubble there fails until this agrees. */
        private bool rendersNothing(FriendMessage m)
        {
            switch (m.type)
            {
                case FriendMessageType.requestAdd:
                    // No bubble — but on a contact that is NOT yet approved insertMessage raises the
                    // contact-request pane from this row, so there it must still be delivered.
                    return friend.state == FriendState.Approved;
                case FriendMessageType.requestAddSent:
                case FriendMessageType.kicked:
                case FriendMessageType.banned:
                case FriendMessageType.appSessionEnd:
                case FriendMessageType.reaction:
                    return true;
                case FriendMessageType.standard:
                case FriendMessageType.fileHeader:
                case FriendMessageType.appSession:
                case FriendMessageType.requestFunds:
                case FriendMessageType.sentFunds:
                    return string.IsNullOrEmpty(m.message);
                default:
                    return false;
            }
        }

        /* ★★ #1106 — "SHOW IN CHAT" / a shared item's tap (chat info, Downloads): open the conversation AT a message.
         * C# found the message in its own scan (SharedItems / the Downloads match), with `depth` = how many messages
         * of its channel are newer. The chat's load window is widened to hold it (at most SharedItems.JumpCap — Damir:
         * "capped"), then the shell scrolls to the row and pulses it (`jumpToMessage`, the @-mention FAB's jumpToRow).
         * Past the cap, or a row the window does not hold, the shell says so in a short toast. One pending jump, keyed
         * by the conversation; the id is C#'s own hex, never a WebView string. */
        private static readonly object jumpLock = new object();
        private static string? jumpAddr = null;
        private static string jumpId = "";
        private static int jumpDepth = 0;
        private static long jumpAtMs = 0;
        private const long JumpTtlMs = 15000;   // (#46 r1 A2) an open that never happened must not jump a LATER, unrelated open

        public static void requestJump(Friend friend, string idHex, int depth)
        {
            SingleChatPage? open = Utils.getChatPage(friend);
            lock (jumpLock)
            {
                jumpAddr = friend.walletAddress.ToString();
                jumpId = idHex;
                jumpDepth = depth;
                jumpAtMs = Environment.TickCount64;
            }
            if (open != null && open.pageLoaded)
            {
                // (#46 r3 R3-9) a page still STAGING (not loaded) takes the jump in its own onLoad → loadMessages
                MainThread.BeginInvokeOnMainThread(() => open.applyPendingJumpWindow(true));
            }
        }

        private string? jumpArmedId = null;   // (#46 r2 R2-9) decided ONCE, at the widening; pushed at the end of THAT load

        /** Widen the window for a pending jump of THIS conversation; reload = an already-open chat. */
        private void applyPendingJumpWindow(bool reload)
        {
            int depth;
            lock (jumpLock)
            {
                if (jumpAddr != null && Environment.TickCount64 - jumpAtMs > JumpTtlMs)
                {
                    jumpAddr = null;   // (#46 r1 A2) expired
                }
                if (jumpAddr == null || friend == null || jumpAddr != friend.walletAddress.ToString())
                {
                    return;
                }
                depth = jumpDepth;
                jumpArmedId = jumpId;
                jumpAddr = null;   // consumed here: a later, unrelated load of this chat never jumps
            }
            bool widened = false;   // ★ #1166
            if (depth < SharedItems.JumpCap && depth + 2 > messagesToShow)
            {
                messagesToShow = (uint)(depth + 2);
                if (messagesToShow == 100)
                {
                    messagesToShow++;   // D-18 (#354): never the stale exact-100 window
                }
                widened = true;
            }
            if (reload)
            {
                if (widened)
                {
                    requestPrepend();   // ★ #1166 B2: an OPEN chat gets only the older slice that now holds the row — the position is kept
                    loadMessages();
                }
                else
                {
                    pushPendingJump();  // ★ #1166 #1151: the row is already in the shell's window — no re-render, nothing to fight a smooth scroll
                }
            }
        }

        /** After the load burst: hand the shell the jump armed for THIS load (once). */
        private void pushPendingJump()
        {
            string? id = jumpArmedId;
            jumpArmedId = null;
            if (id != null)
            {
                Utils.sendUiCommand(this, "jumpToMessage", id);
            }
        }

        public void loadMessages()
        {
            applyPendingJumpWindow(false);   // ★ #1106
            bool prepend = takePrepend();    // ★ #1166 B2: answered as a prepend (onLoadMore / a widening jump on an open chat) — see HistoryAnchor
            int want = (int)messagesToShow;
            /* One row MORE than wanted: finding it is the only honest proof that older history
             * exists. The baseline asked for exactly `want` and offered "show older" whenever it
             * got that many — so a chat of exactly 50 messages showed a pill that loaded nothing. */
            int window = want + 1;
            bool exhausted = false;
            List<FriendMessage>? messages = null;
            /* ★★ P0 #1155: each getMessages(channel, window) below REPLACES Core's in-memory list with a disk read
             * (CORE-8) — an arrival Core has not written yet (its delayed write, ~2 s) was dropped here and then never
             * reached disk. Write this channel first (ArrivalGuard.cs), then put back any arrival that landed in the
             * orphaned list during the read (after the loop). */
            string arrivalKey = friend.walletAddress.ToString();
            int readChannel = selectedChannel;   // ★ #1155 (#46 r3 m1): ONE channel for the read, the trim and the put-back
            int visibleSurplus = 0;              // ★ #1155: visible rows over `want` in the LAST read (the trim's limit)
            bool anyReplyShaped = false;         // ★ #1198 / #46 r1 A MAJOR-1: set in the read loop's count (below)
            CoreMessageWriter.arrivals.beforeReread(arrivalKey, readChannel, CoreMessageWriter.instance);
            for (int pass = 0; pass < LOAD_WINDOW_MAX_PASSES; pass++)
            {
                if (window == 100)
                {
                    window++;   // D-18 (#354): exactly 100 returns Core's STALE cache instead of reading storage
                }
                messages = friend.getMessages(readChannel, window);
                if (messages == null || messages.Count == 0)
                {
                    break;
                }
                int visibleNow;
                int headRun;
                lock (messages)
                {
                    visibleNow = messages.Count(m => !rendersNothing(m));
                    exhausted = messages.Count < window;
                    headRun = CoreMessageWriter.arrivals.sameSecondHeadRun(messages);
                    // ★ #1198 / #46 r1 A MAJOR-1: is a row of this read quote-shaped? (the LAST pass's read is the window)
                    anyReplyShaped = messages.Exists(m => m.type == FriendMessageType.standard && ReplyQuote.looksLikeReply(m.message));
                }
                visibleSurplus = visibleNow - want;
                /* ★ #1155 (#46 r3 M-1): with older history on disk, the window must also START on a second boundary that
                 * the visible surplus can trim (the head's same-second run ≤ surplus) — otherwise Core's next write deletes
                 * the run's older rows. A head inside a longer burst grows the window by that run. */
                if (exhausted || (visibleNow > want && (headRun <= visibleNow - want || window > 4 * want)))   // r4 m1: growth capped at 4 × want
                {
                    break;
                }
                window = visibleNow > want
                    ? window + headRun
                    : Math.Max(window * 2, window + (want + 1 - visibleNow));
            }
            if (messages != null)
            {
                /* ★ #1155 (#46 r1 M-2): Core's write drops every on-disk row with ts >= the list's first ts, and ts is whole
                 * seconds — a window that starts inside a same-second burst would delete the burst's older rows on its
                 * next write. Trim the head to a second boundary (the loop above grew the window until the run fits the surplus). */
                CoreMessageWriter.arrivals.trimSameSecondHead(messages, !exhausted, visibleSurplus);
                int reattached = CoreMessageWriter.arrivals.afterReread(arrivalKey, readChannel, messages, CoreMessageWriter.nowMs(), CoreMessageWriter.instance);
                if (reattached > 0)
                {
                    Logging.warn("[P0] reattach n=" + reattached);   // ★ #1155: the CORE-8 race happened (a count, no address)
                }
            }
            if (messages == null
                || messages.Count == 0)
            {
                // iOS-24/25 (#283 review MAJOR-1): a just-wiped history IS this empty state —
                // returning before the clearMessages push left an open conversation rendering
                // deleted messages until re-entered. Tell the WebView to clear first (no
                // load-more). ★ Session P: `messagesDone` ends the burst at once — the emptied
                // log paints on the signal, not on the shell's 250 ms safety timer.
                historyAnchor = null;   // ★ #1166 B2: the shell holds nothing — the next load-more re-flushes
                lock (fileRowsShown)
                {
                    fileRowsShown.Clear();   // ★ #1190 (#46 r4 M1)
                }
                Utils.sendUiCommand(this, "clearMessages", "false");
                Utils.sendUiCommand(this, "messagesDone");
                pushPendingJump();   // ★ #1106: the shell answers "not found" with its toast
                return;
            }

            // #907: decided under the lock below, from VISIBLE rows — see the method's docblock.
            string show_more = "true";
            /* ★ Session P (#802 r4 MAJOR-1): clearMessages is pushed AFTER the batch is built,
             * adjacent to addMessages and messagesDone, still inside the lock — see the three
             * pushes below. The shell arms a 250 ms safety timer at clearMessages; when that push
             * preceded the whole loop the timer measured the BUILD, fired inside it on a long
             * history, and painted the just-wiped log once (a blank frame on load-more, the
             * reading position lost). Nothing in the loop needs the shell cleared first. */

            UiBatch batch = new UiBatch();   // ★ Session P: the load burst crosses ONCE (header above)
            /* ★ #1198 / #46 r1 A MAJOR-1: a loaded row is quote-shaped (decided in the read loop's count) → the ONE deeper
             * read happens HERE — before `lock (messages)`, off the UI thread (prefetchReplyDeep) — and the load builds ONE
             * index inside the lock. */
            if (anyReplyShaped)
            {
                prefetchReplyDeep(readChannel);
            }
            /* ★ Session P [CDPERF] — TEMPORARY (#802 r12): the BUILD is the window in which the shell's
             * 500 ms first-paint fallback could still fire (it is gated on the peer, and the peer landed
             * at onChatScreenReady, at the top of onLoad). The clock starts BEFORE `lock (messages)`, so
             * `t=` also covers the lock wait and the metadata save inside it — it OVER-measures, which is
             * the safe direction for bounding that window. Read a large `t=` as "the window was wide",
             * not as "serialization is slow". Measure before anyone dials the timeout (#294). */
            System.Diagnostics.Stopwatch buildClock = System.Diagnostics.Stopwatch.StartNew();
            bool zeroedUnread = false;   // ★ #1175: the true row is re-pushed AFTER the lock (see below)
            lock (messages)
            {
                // #907: skip the oldest VISIBLE rows beyond the window. The loop below passes
                // over tombstones BEFORE it spends a skip, so this must count what it counts.
                int visible = messages.Count(m => !rendersNothing(m));
                int skip_messages = Math.Max(0, visible - want);
                if (exhausted && skip_messages == 0)
                {
                    show_more = "false";   // storage ran out and everything visible is on screen
                }
                /* ★ #1166 B2: a prepend stops AT the shell's oldest row — that row and every newer one are on screen already
                 * (rows that arrived live were pushed live). The window is the same window an open would read, so the rows
                 * before the anchor that survive the skip are exactly the ones a full re-flush would have ADDED. */
                byte[]? prependUntil = null;
                if (prepend)
                {
                    HistoryAnchor? anchor = historyAnchor;
                    byte[]? anchorId = anchor != null && anchor.channel == readChannel ? anchor.id : null;
                    if (anchorId != null && messages.Exists(m => m.id != null && m.id.SequenceEqual(anchorId)))
                    {
                        prependUntil = anchorId;
                    }
                    else
                    {
                        prepend = false;   // the shell's oldest row is not in this window: the full re-flush (the old path)
                    }
                }
                if (!prepend && friend.metaData.unreadMessageCount > 0)   // ★ #1166 B2: entering the chat zeroes the count, a prepend never does
                {
                    friend.metaData.unreadMessageCount = 0;
                    friend.saveMetaData();
                    zeroedUnread = true;   // ★ #1175: + the true row, after the lock (pushZeroedChatRow)
                    // iOS-8 (#283): announce the zeroed count to the chats list NOW.
                    // updateMessageReadStatus pushes setContactStatus only when it marks a
                    // markable message read — and it deliberately skips requestAdd — so a chat
                    // whose unread consisted of a requestAdd (the accepted-request row) kept its
                    // stale row/tab badge until the next structural flush (cross-platform, seen
                    // on iOS + suspected on Windows). Display-only push; no message flags touched.
                    // iOS-31 leg A: push a LITERAL 0, not getUnreadMessageCount(). The line
                    // above just set metaData.unreadMessageCount = 0 and saved it — that IS the
                    // truth for this chat. getUnreadMessageCount() re-derives the count from
                    // message flags, and a requestAdd is never markable-read, so for a chat whose
                    // unread was the accepted-request row the recount comes back >= 1 and this
                    // "zeroing" push re-asserted the very badge it was meant to clear.
                    UIHelpers.setContactStatus(friend.walletAddress, friend.online, 0, "", 0);
                }
                if (!prepend)
                {
                    clearReactionFlag();   // ★ #1148 (4): the chats-list heart clears where the count clears (★ #1166 B2: on entering only)
                }
                if (!prepend)
                {
                    lock (fileRowsShown)
                    {
                        fileRowsShown.Clear();   // ★ #1190 (#46 r4 M1): a full re-flush — the shell is cleared in this burst
                    }
                }
                lastLoadPushed = 0;   // ★ Session I [CDPERF]
                if (anyReplyShaped)
                {
                    batch.replyIndex = buildReplyIndex(readChannel, messages);   // ★ #46 r1 A MAJOR-1: one index for every row of this load
                }
                byte[]? firstPushedId = null;   // ★ #1166 B2: the oldest row this load hands the shell = the next prepend's anchor
                foreach (FriendMessage message in messages)
                {
                    if (prependUntil != null && message.id != null && message.id.SequenceEqual(prependUntil))
                    {
                        break;   // ★ #1166 B2: the shell holds this row and everything newer
                    }
                    if (rendersNothing(message))
                    {
                        // Passed BEFORE a skip is spent (the skip counts what this counts), and
                        // before insertMessage — which renders nothing for these rows anyway (a
                        // blanked sentFunds used to reach txIdLegacyToV8("") and log a throw per open).
                        continue;
                    }

                    if (skip_messages > 0)
                    {
                        skip_messages--;
                        continue;
                    }
                    if (firstPushedId == null)
                    {
                        firstPushedId = message.id;   // ★ #1166 B2
                    }
                    /* ★ Session P (#802 r11/r12): TWO per-row trys, not one and not none. A throw in
                     * either half must cost only ITSELF — outside any try it escaped loadMessages
                     * before the three pushes and opened the conversation EMPTY (r11); inside ONE
                     * shared try, a throw in insertMessage AFTER its push (updateMessageReadStatus
                     * sends a read receipt, which throws for a group with no route — the #797 state)
                     * silently dropped that row's reactions, which the per-row transport delivered (r12). */
                    try
                    {
                        insertMessage(message, selectedChannel, batch);
                        lastLoadPushed++;
                    }catch(Exception e)
                    {
                        Logging.error("Error loading message: {0}", e);
                    }
                    try
                    {
                        updateReactions(message, batch);
                    }
                    catch (Exception rxEx)
                    {
                        Logging.error("loadMessages: reactions for one row were dropped (" + rxEx.GetType().Name + ")");
                    }
                }
                /* ★ Session P: the JSON is built BEFORE any push; then THREE ADJACENT pushes —
                 * clearMessages · addMessages · messagesDone — so the shell's 250 ms safety timer
                 * (armed at clearMessages) can never fire between the wipe and the signal. Both
                 * happen INSIDE `lock (messages)` (#802 r5 MAJOR-1): a LIVE arrival whose
                 * `friend.getMessages(channel)` ran AFTER the re-read above holds THIS list and
                 * takes this lock in Ixian-Core before it is pushed, so it is serialized AFTER
                 * messagesDone — outside the lock its push raced ours, landed before the wipe,
                 * and the message vanished until the next re-open. SCOPE (#802 r7): the re-read
                 * above (`msg_count != 100`) REPLACES the channel list in Core, so an arrival that
                 * fetched the OLD list first is not serialized by this lock at all; that arrival
                 * is already lost from storage at the baseline (Core writes the NEW list, the
                 * orphaned add never reaches disk — be-cutover CORE-8) and its live push is
                 * unordered against this burst on both transports. The eval is asynchronous on
                 * every platform (the call returns before the script runs; sendMessage is a FIFO
                 * on this page), so holding the lock across the CALL blocks nothing — no
                 * Ixian-Core holder of this LIST lock marshals to the UI thread while it holds
                 * it (Friend.cs locks the dictionary, a different object).
                 * An empty batch (every row skipped) and a batch whose
                 * SERIALIZATION threw both still send clearMessages + messagesDone (the per-row
                 * path lost one row to a throw; the batch path must not lose the history AND the
                 * signal to one). */
                string? json = null;
                try
                {
                    if (batch.items.Count > 0)
                    {
                        json = batch.toJson();
                    }
                }
                catch (Exception batchEx)
                {
                    Logging.error("loadMessages: the batch could not be serialized (" + batchEx.GetType().Name + ")");
                    json = null;
                }
                if (firstPushedId != null)
                {
                    historyAnchor = new HistoryAnchor(firstPushedId, readChannel);   // ★ #1166 B2
                }
                else if (!prepend)
                {
                    historyAnchor = null;   // ★ #1166 B2: a full load that showed nothing — the next load-more re-flushes
                }
                if (!prepend)
                {
                    Utils.sendUiCommand(this, "clearMessages", show_more);
                    if (json != null)
                    {
                        cdperf("batch", "n=" + batch.items.Count + " json=" + json.Length + " t=" + buildClock.ElapsedMilliseconds);   // ★ Session P [CDPERF] — TEMPORARY
                        Utils.sendUiCommand(this, "addMessages", json, "append");
                    }
                    Utils.sendUiCommand(this, "messagesDone");
                    pushPendingJump();   // ★ #1106
                }
                else
                {
                    /* ★ #1166 B2: the older slice only — no clearMessages; the end-of-history flag rides on messagesDone
                     * (an older shell ignores the extra argument; spec §4 "pick one"). An empty slice still sends the signal. */
                    if (json != null)
                    {
                        Utils.sendUiCommand(this, "addMessages", json, "prepend");
                    }
                    Utils.sendUiCommand(this, "messagesDone", show_more);
                    pushPendingJump();   // ★ #1106: a widening jump lands after the rows that hold it
                }
                // ★ A5 #1124: the burst's preview candidates, now that the shell holds their rows (decoded off this thread)
                foreach (KeyValuePair<string, FriendMessage> t in batch.thumbs)
                {
                    enqueueThumb(t.Key, t.Value);
                }
                recheckBurstFileRows(batch, readChannel);   // ★ #1202 (#1190 #46 r5 MINOR): AFTER the batch's pushes — a file deleted during the build is re-pushed as "0"
                // ★ #1208 V4: the burst's voice rows, now that the shell holds them (decoded off this thread)
                foreach (KeyValuePair<string, FriendMessage> v in batch.voices)
                {
                    enqueueVoiceInfo(v.Key, v.Value);
                }
            }
            if (zeroedUnread)
            {
                pushZeroedChatRow();   // ★ #1175 (outside `lock (messages)`: updateChat takes HomePage.refreshLock)
            }
        }

        /* ★ #1175 (Android, a group row kept unread 1 + chips + the Chats tab badge after the chat was opened, until a
         * restart). The literal-0 setContactStatus above only reaches HomePage's status CACHE, flushed on its next tick
         * (HomePage.updateContactStatus), and since #1166 P-03 no full chats flush follows an open on Android (the chat is
         * an overlay; HomePage stays the nav top). DEFENSIVE half (the mechanism is still open): after the zero + save,
         * push the TRUE row at once — UIHelpers.pushChatRowLive = a lone addChat from metaData (unread = the 0 just saved)
         * when HomePage is live, else the refresh flag (one batched full flush on the next tick with HomePage on top).
         * (#46 F1-2) NOT refreshChatRow: its unconditional flag ran a full chats + contacts flush on EVERY open with unread,
         * undoing #1166 P-03 on Android. Safe off the UI thread: pushChatRowLive reads the nav stack through `?.`, and
         * HomePage.updateChat → Utils.sendUiCommand only queues (SpixiContentPage.sendMessage). It never throws out of
         * here: a failure keeps the cache push + the flag. */
        private void pushZeroedChatRow()
        {
            try
            {
                UIHelpers.pushChatRowLive(friend);
            }
            catch (Exception e)
            {
                UIHelpers.shouldRefreshContacts = true;
                Logging.warn("[UNREAD] row re-push failed: " + e.GetType().Name);
            }
        }

        /* ★ #1177 (Android: a big download, the phone locked mid-transfer — the reopened chat showed "Tap to download" for
         * ~5 s until the next updateFile). addFile only knows "0" / "100", the shell maps incoming + 0 % to the OFFER, and
         * its liveTransfers memory (R3-N3) dies with the document. TransferManager still holds the transfer: when it is
         * an ACCEPTED incoming one (acceptFile made its stream), say "live:<pct>" / "paused:<pct>" (FileRowRules — the
         * percent is requestFileData's own; paused = no packet for FileRowRules.PausedAfterSeconds). "" = say nothing
         * (outgoing, completed, an offer, no transfer). ⚠ getIncomingTransfer matches with uid.Contains — an empty uid
         * would match the FIRST transfer, so it is never asked; the list is read unlocked there, so a throw = "". */
        private static string incomingTransferArg(FriendMessage message, string uid)
        {
            if (message.localSender || message.completed || string.IsNullOrEmpty(uid))
            {
                return "";
            }
            try
            {
                FileTransfer? t = TransferManager.getIncomingTransfer(uid);
                if (t == null || t.uid != uid)
                {
                    return "";
                }
                return FileRowRules.transferStateArg(true, t.completed, true, t.fileStream != null,
                    t.lastPacket, t.fileSize, t.packetSize, t.lastTimeStamp, Clock.getTimestamp());
            }
            catch (Exception)
            {
                return "";
            }
        }

        /* ★ Session AF (#950): has THIS wallet already tipped the message? The same test Core's
         * FriendMessage.addReaction applies (one entry per sender under the "tip" key), read
         * under the same lock Core takes, so the answer matches the refusal it predicts. */
        private static bool hasOwnTip(FriendMessage msg)
        {
            Address self = IxianHandler.getWalletStorage().getPrimaryAddress();
            if (self == null || msg == null || msg.reactions == null)
            {
                return false;
            }
            lock (msg.reactions)
            {
                return msg.reactions.TryGetValue("tip", out var tips) && tips != null
                    && tips.Find(x => x.sender != null && x.sender.SequenceEqual(self)) != null;
            }
        }

        public string resolveNick(string senderNick, Address senderAddress)
        {
            string nick = senderNick;
            if (nick == "")
            {
                if (senderAddress != null)
                {
                    var tmp_nick = friend.users.getUser(senderAddress)?.getNick();
                    if (!string.IsNullOrEmpty(tmp_nick))
                    {
                        nick = tmp_nick;
                    }
                    else
                    {
                        var local_fr = FriendList.getFriend(senderAddress);
                        if (local_fr != null)
                        {
                            nick = local_fr.nickname;
                        }
                        else if (senderAddress.SequenceEqual(IxianHandler.primaryWalletAddress))
                        {
                            nick = IxianHandler.localStorage.nickname;
                        }
                        else
                        {
                            nick = senderAddress.ToString();
                        }
                    }
                }
            }

            return nick;
        }

        // R2 (#371): "1 member", not "1 members" — a whole-phrase singular id so
        // every locale translates the complete line. A lang file without the new
        // id (partial/legacy translation) falls back to the plural format string;
        // the sub can never go null/empty from a dictionary miss.
        private string memberCountText(long count)
        {
            if (count == 1)
            {
                string one = SpixiLocalization._SL("chat-member-count-one");
                if (!string.IsNullOrEmpty(one))
                {
                    return one;
                }
            }
            return String.Format(SpixiLocalization._SL("chat-member-count") ?? "{0} members", count);
        }

        /* ★ D-19b (#370): REVERSE-RESOLVE a sender nick to its roster address.
         * Core 0.9.8k stores bot-room rows address-less (5643e5b; BE q1), so a
         * named row lost its member sheet, copy and tip target. The roster
         * (friend.users) still maps address → nick; this walks it the other way.
         * MONEY SAFETY: an EXACT SINGLE match only — two members can share a
         * nick, and a wrong match here becomes a copyable address and a tip
         * recipient for the wrong person. Ambiguous = null.
         * BLIND: never — a blind room must not hand out any address. Unknown
         * blindness (botInfo not loaded yet) fails closed the same way. */
        /* ★ D-19b loop A-2 (#370): RENDER→SPEND BINDING for reverse-resolved rows.
         * The roster mutates (nick rewrites, leavers, the 500-cap eviction), so a
         * spend-time re-resolve alone could pay an address the user never SAW: the
         * sheet showed the render-time address, the verb carries only msgid:amount.
         * insertMessage records the address it pushed per message id; the tip case
         * requires the spend-time resolve to EQUAL it, else it refuses honestly.
         * ConcurrentDictionary: writes ride loadMessages under lock(messages),
         * reads ride onNavigating. Keyed by id hex — repopulated on every load. */
        private readonly ConcurrentDictionary<string, string> resolvedSenderByMsgId = new ConcurrentDictionary<string, string>();

        private Address? reverseResolveSenderByNick(string nick)
        {
            if (string.IsNullOrEmpty(nick))
            {
                return null;
            }
            // ★ #613: a bot room's nick->address reverse resolve must not fail closed —
            // that is what left a public channel's senders unnamed and unactionable.
            if (friend.metaData == null || friend.metaData.botInfo == null
                || Utils.hidesParticipants(friend))
            {
                return null;
            }
            Address? match = null;
            try
            {
                // Snapshot + lock one reference: BotUsers reassigns nothing, but its
                // own methods serialize on `contacts` — iterate under the same lock
                // so a concurrent roster write cannot break the enumeration.
                var users = friend.users;
                if (users == null)
                {
                    return null;
                }
                lock (users.contacts)
                {
                    foreach (var contact in users.contacts)
                    {
                        var contactNick = contact.Value?.getNick();
                        if (string.IsNullOrEmpty(contactNick) || contactNick != nick)
                        {
                            continue;
                        }
                        if (match != null)
                        {
                            // Second member with the same nick → ambiguous → no address.
                            return null;
                        }
                        match = contact.Key;
                    }
                }
            }
            catch (Exception ex)
            {
                Logging.warn("reverseResolveSenderByNick: " + ex.Message);
                return null;
            }
            return match;
        }

        public void insertMessage(FriendMessage message, int channel)
        {
            insertMessage(message, channel, null);   // ★ Session P: the LIVE path — one push per row, unchanged
        }

        /* ★★ #1190 (#46 r4 M1) — WHICH FILE ROWS THIS DOCUMENT HOLDS. The chat-info "Delete from this device" re-push
         * (ContactDetails ixian:sharedDeleteLocal) used to call insertMessage for the scanned row — but the scan reads up to
         * SharedItems' own window (thousands of rows) while the chat holds ~50: a row from OUTSIDE the loaded window was
         * CREATED by the shell's upsertFile (at its time position, a "live arrival" for the new-message pill), and the call
         * ran the read-status side effects (updateMessageReadStatus: a read flag + a receipt) on an old row. Now insertMessage's
         * file branch records every file row id it pushes for this document (load burst, prepend, live), a full (re)load
         * starts the set over (loadMessages, !prepend — the shell is cleared in the same burst), a delete drops the id; and
         * refreshFileRow re-pushes a row ONLY when this set holds it — through the same addFile push, which the shell
         * applies to the EXISTING row in place (upsertFile: `existing` → no arrival count, "0" drops the held preview) —
         * and returns right after that push and its preview check (noteThumbCandidate: the file is gone, so the job finds no
         * local path and sends nothing) — no updateMessageReadStatus. Main thread (the caller's). */
        private readonly HashSet<string> fileRowsShown = new HashSet<string>(StringComparer.Ordinal);   // hex message ids — lock itself
        /* the "row only" mode of insertMessage, set by refreshFileRow around its ONE call (System.ThreadStaticAttribute: per
         * thread, so a load on another thread never sees it; the private signature stays the one the suites slice on). */
        [ThreadStatic] private static bool fileRowOnlyPass;

        /** ★ #1190 (#46 r4 M1): does this document hold the file row `id` of `channel`? */
        public bool hasLoadedFileRow(byte[]? id, int channel)
        {
            if (id == null || channel != selectedChannel)
            {
                return false;
            }
            lock (fileRowsShown)
            {
                return fileRowsShown.Contains(Crypto.hashToString(id));
            }
        }

        /** ★ #1190 (#46 r4 M1): re-push ONE file row this document already holds (its file left the device). false = not
         *  held here (another channel, outside the loaded window, never shown) → nothing is pushed. */
        public bool refreshFileRow(FriendMessage? message, int channel)
        {
            if (message == null || message.type != FriendMessageType.fileHeader || !hasLoadedFileRow(message.id, channel))
            {
                return false;
            }
            fileRowOnlyPass = true;
            try
            {
                insertMessage(message, channel, null);
            }
            finally
            {
                fileRowOnlyPass = false;
            }
            return true;
        }

        /** ★ #1202 (#1190 TODO, session 6b): re-push a file row this document holds, on its OWN channel — for a caller
         *  that knows the message but not the channel (the Downloads delete: DownloadSource carries none; the contact
         *  purge). A held row is always of selectedChannel (a channel switch is a full reload, which starts the set over),
         *  so refreshFileRow's held test decides. false = not held here → nothing is pushed. */
        public bool refreshHeldFileRow(FriendMessage? message)
        {
            return refreshFileRow(message, selectedChannel);
        }

        /** ★ #1202 (#1190 TODO, session 6b): re-push EVERY file row this document holds (the contact purge: it holds paths,
         *  not rows). Each re-push reads the disk again (SharedItems.localArgOf) — a few dozen rows at most. */
        public int refreshHeldFileRows()
        {
            List<string> held;
            lock (fileRowsShown)
            {
                held = new List<string>(fileRowsShown);
            }
            if (held.Count == 0)
            {
                return 0;
            }
            HashSet<string> want = new HashSet<string>(held, StringComparer.Ordinal);
            int n = 0;
            foreach (FriendMessage m in channelSnapshot(selectedChannel))
            {
                if (m.id != null && m.type == FriendMessageType.fileHeader && want.Contains(Crypto.hashToString(m.id)) && refreshFileRow(m, selectedChannel))
                {
                    n++;
                }
            }
            return n;
        }

        /* ★★ #1202 (#1190 #46 r5 MINOR, session 6b): A DELETE DURING A CHAT LOAD. The load builds its rows into ONE batch
         * and sends it at the END (clearMessages · addMessages · messagesDone). A file row built BEFORE the delete carries
         * fLocal "1"; the delete's refreshFileRow (ContactDetails / Downloads, main thread) then either re-pushed the row
         * live with "0" — and the batch, sent AFTER it, repainted it with the stale "1" — or found it not yet held and
         * pushed nothing. Now the load re-checks, right AFTER its own pushes, every file row it sent as "1": one whose
         * file is gone is re-pushed through refreshFileRow (held by now — the build recorded it), on the same FIFO, so
         * the fresh "0" lands after the stale batch. A delete AFTER this re-check is the ordinary case: its own refresh is
         * queued after the batch. "1" rows only (only a delete can be missed); COMPLETE rows only touch the disk
         * (SharedItems.localArgOf's own early return, #46 r4 m1). */
        private void recheckBurstFileRows(UiBatch batch, int channel)
        {
            foreach (KeyValuePair<FriendMessage, string> row in batch.fileRows)
            {
                try
                {
                    if (row.Value == "1" && SharedItems.localArgOf(row.Key, out _) != "1")
                    {
                        refreshFileRow(row.Key, channel);
                    }
                }
                catch (Exception e)
                {
                    Logging.warn("loadMessages: a file row re-check failed (" + e.GetType().Name + ")");
                }
            }
        }

        /* ★★ #1166 P-04 (#1165 (7)) — A SENDER'S AVATAR ONCE PER DOCUMENT (🟡 NEW push `setAvatarFor(address, dataUri)`).
         * Every received row used to carry its sender's avatar as a 5–50 KB data: URI (X1), on every row of every load.
         * Now a GROUP / BOT row's picture goes ONCE per sender address per document — and again only when it changed
         * (`avatarSent`: address → length + hash of the URI, reset per document in onLoad) — as `setAvatarFor`, sent on the
         * wire BEFORE the row (a load burst sends it ahead of the addMessages batch, which goes out after the loop). The row
         * keeps its argument POSITION and carries "" in it; the shell looks the picture up by the row's address and a later
         * setAvatarFor repaints every row of that address. A 1:1 row carries "" too: its sender IS the peer, whose picture
         * the header push (setAvatar, onLoad) already carried — the shell uses that one. An older shell shows the initials
         * on these rows (it has no setAvatarFor; shell and exe ship together). Not a data: URI ("" for my own rows, the
         * "img/…" sentinel, a path C# could not read) → unchanged on the row, as before.
         * SECURITY: the address is the one the row itself carries (the senderAddress push, unchanged — a blind chat's rule
         * is the row's rule); the URI is the same imageToDataUri value the row carried. No log line. */
        private readonly Dictionary<string, string> avatarSent = new Dictionary<string, string>(StringComparer.Ordinal);   // lock itself

        private string avatarForRow(string avatar, Address? sender)
        {
            if (string.IsNullOrEmpty(avatar) || !avatar.StartsWith("data:", StringComparison.Ordinal))
            {
                return avatar;
            }
            if (!(friend.bot || friend.type == FriendType.Group) || sender == null)
            {
                return "";   // 1:1: the header avatar is this picture (a sender-less multi row got the sentinel above, never a URI)
            }
            string address = sender.ToString();
            string mark = avatar.Length.ToString(System.Globalization.CultureInfo.InvariantCulture) + ":"
                + StringComparer.Ordinal.GetHashCode(avatar).ToString(System.Globalization.CultureInfo.InvariantCulture);
            lock (avatarSent)
            {
                if (avatarSent.TryGetValue(address, out string? sent) && sent == mark)
                {
                    return "";   // this document has this picture for this address already
                }
                avatarSent[address] = mark;
            }
            Utils.sendUiCommand(this, "setAvatarFor", address, avatar);
            return "";
        }

        /** ★ Session P: `batch` != null → every row push lands in the batch instead of the
         *  wire (the load burst). The read-status side effect and the setContactStatus push
         *  to HOME are untouched either way. */
        private void insertMessage(FriendMessage message, int channel, UiBatch? batch)
        {
            if(channel != selectedChannel)
            {
                return;
            }
            bool fileRowOnly = fileRowOnlyPass;   // ★ #1190 (#46 r4 M1): refreshFileRow's ONE call on this thread
            if (fileRowOnly && message.type != FriendMessageType.fileHeader)
            {
                return;   // ★ #1190 (#46 r4 M1): refreshFileRow re-pushes a FILE row only
            }
            if(friend.state != FriendState.Approved)
            {
                if (message.type == FriendMessageType.requestAdd)
                {

                    // Call webview methods on the main UI thread only
                    friend.state = FriendState.RequestReceived;
                    push(batch, "showContactRequest", "1");
                    return;
                }
            }
            else
            {
                // Don't show if the friend is already approved
                if (message.type == FriendMessageType.requestAdd)
                    return;
            }

            bool paid = false;
            if (message.transactionId != "")
            {
                paid = true;
            }
            string prefix = "addMe";
            string avatar = "";
            string address = friend.nickname;
            if(address == "")
            {
                // ★ Loop r1 MAJOR-5 (#356 rider): senderAddress is Address? and Core
                // 0.9.8k nulls it for FriendType.Normal — with an EMPTY friend
                // nickname (one empty `nick` push persists "") this line NRE'd on
                // every row: history load swallowed it per-row and the chat rendered
                // permanently empty. Null → the slot stays "", the shell's honest
                // fallbacks take over.
                address = message.senderAddress != null ? message.senderAddress.ToString() : "";
            }
            string nick = "";
            // ★ D-19b (#370): the ONE sender identity for this row. Starts as the
            // stored address; a named-but-address-less multi row may repair it below
            // via the roster reverse-resolve. Address, avatar and relation all read
            // THIS variable so the three can never disagree.
            Address? resolvedSender = message.senderAddress;
            if (!message.localSender)
            {
                if (friend.bot
                    || friend.type == FriendType.Group)
                {
                    nick = resolveNick(message.senderNick, message.senderAddress);
                    if (message.senderAddress == null)
                    {
                        // ★ D-19 (#356): a multi-chat row with NO sender address must not
                        // ship the GROUP's nickname in the address slot. The shell renders
                        // that slot middle-truncated with a copy affordance (Damir's dial
                        // 2026-07-07 — written for REAL addresses), so the group's own name
                        // arrived styled as the sender's address ("Spixi …p Chat"), wearing
                        // the group's avatar, and polluted the member sheet as a phantom
                        // member keyed by the group name. Ixian-Core 0.9.8k stores every
                        // bot-room message address-less (5643e5b nulls FriendType.Normal;
                        // BE question 1), so this is now the COMMON case there, not a corner.
                        // ★ D-19b (#370): for a NAMED row the roster can repair the slot —
                        // reverse-resolve the nick (exact single match, never blind). This
                        // restores the member sheet, copy and tip for roster-known senders
                        // in the public Spixi room. No match → the slot stays "" (an
                        // anonymous row renders with no label — legacy parity, #369).
                        resolvedSender = reverseResolveSenderByNick(nick);
                        if (resolvedSender != null && message.id != null)
                        {
                            // A-2 binding: remember what THIS row will display.
                            resolvedSenderByMsgId[Crypto.hashToString(message.id)] = resolvedSender.ToString();
                        }
                    }
                    address = resolvedSender != null ? resolvedSender.ToString() : "";
                }

                prefix = "addThem";
                if(resolvedSender != null)
                {
                    avatar = IxianHandler.localStorage.getAvatarPath(resolvedSender.ToString());
                }
                else if (friend.bot || friend.type == FriendType.Group)
                {
                    // ★ D-19 (#356): same rule for the photo — a sender-less multi-chat row
                    // must not wear the GROUP's avatar; it gets the neutral sentinel (the
                    // shell renders its gradient fallback). Direct assignment, not null —
                    // `string avatar` is non-nullable and this file builds warning-clean
                    // (r2 NIT-8). The 1:1 branch under this keeps the friend's photo:
                    // there the friend IS the sender.
                    avatar = "img/spixiavatar.png";
                }
                else
                {
                    avatar = IxianHandler.localStorage.getAvatarPath(friend.walletAddress.ToString());
                }
                if (avatar == null)
                {
                    avatar = "img/spixiavatar.png";
                }
            }

            // X1: convert the (possibly local) avatar path to a data-URI ONCE here — covers
            // every avatar push below (message/payment/file/app rows). "" (own messages) and
            // "img/..." sentinels pass through unchanged.
            avatar = Utils.imageToDataUri(avatar);
            avatar = avatarForRow(avatar, resolvedSender);   // ★ #1166 P-04: the picture goes ONCE per sender (setAvatarFor), the row carries ""

            // D-5/N26 (#366): per-sender RELATION for the member sheet — received
            // multi-chat rows only ("" elsewhere; the shell treats "" as none).
            // Never for a blind chat: a relation on a masked row is an identity
            // hint (the FE gates the member sheet off there anyway — belt both sides).
            // Loop n2: only the STANDARD text push consumes it — gate the FriendList
            // scan on the type so payment/file/app/call rows don't pay for it.
            string relation = "";
            bool relationBlind = Utils.hidesParticipants(friend);   // ★ #613: groups only, as legacy
            if (message.type == FriendMessageType.standard && !message.localSender && !relationBlind && (friend.bot || friend.type == FriendType.Group))
            {
                // D-19b (#370): reads resolvedSender — a reverse-resolved row gets the
                // same relation treatment as an addressed one (blind still excluded).
                relation = contactRelationFor(resolvedSender);
            }

            if (message.type == FriendMessageType.requestFunds)
            {
                string status = SpixiLocalization._SL("chat-payment-status-waiting-confirmation");
                string status_icon = "fa-clock";
                /* ★ C1/C2 (Session AD): the card's DECISIONS come from a STATUS ENUM and a
                 * KIND pushed beside the legacy 14 args (new args go LAST — never reorder):
                 *   kind       `request` | `payment`     — the shell used to read this off
                 *                                           the LOCALIZED title (#187)
                 *   statusEnum `pending` | `completed` | `declined`
                 *   fiat       the amount in fiat at the last known price ("" when unknown)
                 *   insufficient "True" when the available balance cannot cover the amount
                 *              — a request-in card disables Pay + shows the caption. It is
                 *              amount-only: the fee needs a signed discarded tx per card
                 *              (SPayments.estimateFee), which a history burst must not pay;
                 *              the review sheet's live quote catches the amount+fee case.
                 * `title` / `status` / `status_icon` still ride along for DISPLAY. */
                string statusEnum = "pending";

                string amount = message.message.Trim(':');

                string txid = "";

                bool enableView = false;

                if(!message.localSender)
                {
                    enableView = true;
                }

                if (message.message.StartsWith("::"))
                {
                    status = SpixiLocalization._SL("chat-payment-status-declined");
                    status_icon = "fa-exclamation-circle";
                    statusEnum = "declined";
                    txid = Crypto.hashToString(message.id);
                    enableView = false;
                }else if(message.message.StartsWith(":"))
                {
                    txid = message.message.Substring(1);
                    byte[] b_txid = Transaction.txIdLegacyToV8(txid);

                    var activity = Node.activityStorage.getActivityById(b_txid, null, true);
                    var transaction = activity?.transaction;

                    status = SpixiLocalization._SL("chat-payment-status-declined");
                    status_icon = "fa-exclamation-circle";
                    statusEnum = "declined";

                    if (activity != null)
                    {
                        if (activity.status == IXICore.Activity.ActivityStatus.Final)
                        {
                            status = SpixiLocalization._SL("chat-payment-status-confirmed");
                            status_icon = "fa-check-circle";
                            statusEnum = "completed";
                        }
                        else if (activity.status == IXICore.Activity.ActivityStatus.Pending)
                        {
                            status = SpixiLocalization._SL("chat-payment-status-pending");
                            status_icon = "fa-clock";
                            statusEnum = "pending";
                        }
                    }

                    amount = "?";

                    if (transaction != null)
                    {
                        amount = transaction.amount.ToString();
                    }
                    else
                    {
                        // TODO think about how to make this more private
                        CoreProtocolMessage.broadcastGetTransaction(Transaction.txIdLegacyToV8(txid), 0, null);
                    }
                    enableView = true;
                }

                string fiat = paymentFiatFor(amount);
                // C2: only a PENDING INCOMING request is payable, so only it is judged.
                bool insufficient = !message.localSender && statusEnum == "pending" && txid == ""
                    && paymentInsufficient(amount);

                if (message.localSender)
                {
                    push(batch, "addPaymentRequest", Crypto.hashToString(message.id), txid, address, nick, avatar, SpixiLocalization._SL("chat-payment-request-sent"), amount, status, status_icon, message.timestamp.ToString(), message.localSender.ToString(), message.confirmed.ToString(), message.read.ToString(), enableView.ToString(), "request", statusEnum, fiat, insufficient.ToString());
                }
                else
                {
                    push(batch, "addPaymentRequest", Crypto.hashToString(message.id), txid, address, nick, avatar, SpixiLocalization._SL("chat-payment-request-received"), amount, status, status_icon, message.timestamp.ToString(), "", message.confirmed.ToString(), message.read.ToString(), enableView.ToString(), "request", statusEnum, fiat, insufficient.ToString());
                }
            }

            if (message.type == FriendMessageType.sentFunds)
            {
                byte[] b_txid = Transaction.txIdLegacyToV8(message.message);
                var activity = Node.activityStorage.getActivityById(b_txid, null, true);
                var transaction = activity?.transaction;

                string status = SpixiLocalization._SL("chat-payment-status-declined");
                string status_icon = "fa-exclamation-circle";
                string statusEnum = "declined";   // C1: see the requestFunds block
                if (activity != null)
                {
                    if (activity.status == IXICore.Activity.ActivityStatus.Final)
                    {
                        status = SpixiLocalization._SL("chat-payment-status-confirmed");
                        status_icon = "fa-check-circle";
                        statusEnum = "completed";
                    }
                    else if (activity.status == IXICore.Activity.ActivityStatus.Pending)
                    {
                        status = SpixiLocalization._SL("chat-payment-status-pending");
                        status_icon = "fa-clock";
                        statusEnum = "pending";
                    }
                }

                string amount = "?";

                if (transaction != null)
                {
                    if(message.localSender)
                    {
                        amount = transaction.amount.ToString();
                    }else
                    {
                        amount = HomePage.calculateReceivedAmount(transaction).ToString();
                    }
                }
                else
                {
                    // TODO think about how to make this more private
                    CoreProtocolMessage.broadcastGetTransaction(Transaction.txIdLegacyToV8(message.message), 0, null);
                }

                string fiat = paymentFiatFor(amount);

                // Call webview methods on the main UI thread only
                if (message.localSender)
                {
                    push(batch, "addPaymentRequest", Crypto.hashToString(message.id), message.message, address, nick, avatar, SpixiLocalization._SL("chat-payment-sent"), amount, status, status_icon, message.timestamp.ToString(), message.localSender.ToString(), message.confirmed.ToString(), message.read.ToString(), "True", "payment", statusEnum, fiat, "False");
                }
                else
                {
                    push(batch, "addPaymentRequest", Crypto.hashToString(message.id), message.message, address, nick, avatar, SpixiLocalization._SL("chat-payment-received"), amount, status, status_icon, message.timestamp.ToString(), "", message.confirmed.ToString(), message.read.ToString(), "True", "payment", statusEnum, fiat, "False");
                }
            }


            if (message.type == FriendMessageType.fileHeader)
            {
                string[] split = message.message.Split(new string[] { ":" }, StringSplitOptions.None);
                if (split != null && split.Length > 1)
                {
                    string uid = split[0];
                    string name = split[1];
                    if (message.transferId == "")
                    {
                        if (split.Length > 2)
                        {
                            ulong fileSize = ulong.Parse(split[2]);
                            Logging.warn("Transfer id is not set.");
                            // Sometimes transfer data isn't set on restart - rebuild
                            message.transferId = uid;
                            message.filePath = name;
                            message.fileSize = fileSize;
                        }
                        else
                        {
                            // fix for open file not working sometimes
                            Logging.warn("Transfer id is not set.");
                            // Sometimes transfer data isn't set on restart - rebuild
                            message.transferId = uid;
                            message.filePath = name;
                        }
                    }

                    string progress = "0";
                    if (message.completed)
                    {
                        progress = "100";
                    }
                    /* ★★ #1028 (walk P.22, Damir: "a SENT file needs a delivered double check"):
                     * the shell now READS the flags — upsertFile stores a status for a SENT file and
                     * the card shows the text bubble's tick. So the values are derived here like a
                     * text row's (L2 #641: a group answer is DERIVED, not message.confirmed), and the
                     * RELAY flag rides as a new trailing arg 14 (additive — an older shell ignores
                     * it; the shell treats its absence as "relayed"). Arg 9 keeps its historical
                     * meaning (confirmed → delivered), arg 10 read. The app and payment cards still
                     * show no delivery state — their own rows. */
                    /* ★★ #1190 (#1173 (3) + (4), #1188 b): arg 16 `fLocal` — is the file ON THIS DEVICE? "1" / "0" / "" (unknown:
                     * an offer, the live insert of my send before onSendFile sets the path, a legacy rebuild). Only C# can
                     * look; SharedItems.localArgOf = localPathOf + FileRowRules (csh). The shell: "0" on a complete row →
                     * mine = the compact card "Not available on this device", a received one = "… deleted from this
                     * device" — no tap, no viewer. An older shell ignores arg 16; an older exe sends none ("" = today). */
                    string fLocal = SharedItems.localArgOf(message, out string fCase);
                    if (message.localSender && SharedItems.isImageName(name))
                    {
                        P1Perf.line("filelocal sent-image " + fCase);   // ★ #1190 dev-only (SPIXI_DEV_COEXIST): a fixed case word — no path, no name, no id
                    }
                    batch?.fileRows.Add(new KeyValuePair<FriendMessage, string>(message, fLocal));   // ★ #1202: re-checked after the load's pushes (recheckBurstFileRows)
                    /* ★★ #1208 (S7, V3): arg 17 `voice` — "1" when this file is a VOICE message (C#'s own name rule + the
                     * size cap + not a bot room: voiceFileArg), else "". An older shell ignores it. */
                    string fVoice = voiceFileArg(message, name);
                    string fTransfer = incomingTransferArg(message, uid);   // ★ #1177: arg 15 — "live:<pct>" / "paused:<pct>" / "" (an older shell ignores it)
                    deliveryTicks(message, out bool fSent, out bool fConfirmed, out bool fRead);
                    push(batch, "addFile", Crypto.hashToString(message.id), address, nick, avatar, uid, name, message.timestamp.ToString(), message.localSender.ToString(), fConfirmed.ToString(), fRead.ToString(), progress, message.completed.ToString(), paid.ToString(), fSent.ToString(), fTransfer, fLocal, fVoice);
                    noteThumbCandidate(message, name, batch);   // ★ A5 #1124: AFTER the row's push — the shell must know the id first
                    lock (fileRowsShown)
                    {
                        fileRowsShown.Add(Crypto.hashToString(message.id));   // ★ #1190 (#46 r4 M1): this document now holds this file row
                    }
                    if (fileRowOnly)
                    {
                        return;   // ★ #1190 (#46 r4 M1): the row's push only — no updateMessageReadStatus (no read flag, no receipt)
                    }
                    if (fVoice == "1" && (message.completed || message.localSender))
                    {
                        noteVoiceInfo(message, batch);   // ★ #1208 V4: the waveform once the file is on this device (AFTER the row's push)
                    }
                }
            }

            if (message.type == FriendMessageType.appSession)
            {
                /* ★ B2 (#544, loop r1 MAJOR-2) — THE BLANKED-INVITE GHOST GUARD. The
                 * "existing delete path" (msgDelete → Friend.deleteMessage, Friend.cs:949)
                 * does not REMOVE a row — it BLANKS it (fm.message = "") and keeps the
                 * type. On the recipient's next load this branch then parsed app_id = ""
                 * and pushed a nameless "Missing" invite with live Join/Decline — a ghost
                 * of the invite the sender canceled. Same class, same answer as the #529
                 * payment ghost guard: a blanked row renders NOTHING. */
                if (string.IsNullOrEmpty(message.message))
                {
                    return;
                }

                MiniAppManager am = Node.MiniAppManager;

                string app_id;
                string app_install_url = "";
                string app_image_url = "";      // C7(b): remote icon URL carried in the invite
                string app_name = "";
                string app_image = "img/app-noicon.jpg";
                if (message.message.Contains("||"))
                {
                    string[] app_id_data = message.message.Split(new[] { "||" }, StringSplitOptions.None);
                    app_id = app_id_data[0];
                    app_install_url = app_id_data.Length > 1 ? app_id_data[1] : "";
                    app_name = app_id_data.Length > 2 ? app_id_data[2] : "";
                    app_image_url = app_id_data.Length > 3 ? app_id_data[3] : "";
                }
                else
                {
                    app_id = message.message;
                }


                MiniApp app = am.getApp(app_id);
                string app_state = "";

                if (app == null)
                {
                    app_state = "Missing";
                    // C7(b): we don't have the app locally, so use the remote icon URL the
                    // invite carries (absolute http(s) only — excludes relative paths) for a
                    // real tile instead of the no-icon placeholder. The shell renders it as
                    // <img> with a rocket fallback on error.
                    if (app_image_url.StartsWith("http", StringComparison.OrdinalIgnoreCase))
                    {
                        app_image = app_image_url;
                    }
                }
                else
                {
                    app_name = app.name;
                    app_image = Node.MiniAppManager.getAppIconPath(app.id);
                    if (app_image == null)
                    {
                        app_image = "img/app-noicon.jpg";
                    }
                    // C7 follow-up: if a session for this app with this friend is already
                    // active (the user joined and minimized back to the chat), report it so
                    // the invite card shows the in-session (Resume) state instead of
                    // re-offering Join/Decline after the user has already joined.
                    if (am.getAppPage(friend.walletAddress, app_id) != null)
                    {
                        app_state = "Minimized";
                    }
                }

                // X1: local app-icon path → data-URI (http remote-icon URL + "img/" sentinel pass through).
                app_image = Utils.imageToDataUri(app_image);


                // ⚠ NO deliveryTicks — the shell's addAppRequest handler discards these two
                // as well, and says so in its own comment. See the addFile note above.
                push(batch, "addAppRequest", Crypto.hashToString(message.id), app_id, app_name, app_image, address, nick, avatar, message.timestamp.ToString(), message.localSender.ToString(), message.confirmed.ToString(), message.read.ToString(), app_state, app_install_url);
            }

            if (message.type == FriendMessageType.standard)
            {
                /* ★ #981 (M1, the office Mac 2026-09-24: an EMPTY received bubble — meta only —
                 * under "You are now connected" after accepting a request). An empty standard row
                 * is what Core leaves for a DELETED message (Friend.deleteMessage blanks the text),
                 * and the LOAD path already renders nothing for it (rendersNothing, #907); the LIVE
                 * path did not, so any empty standard row pushed while the chat is open painted a
                 * bubble with no text. The live path now agrees with the load path. Which row it is
                 * on the Mac is not yet known (the device run names it: this line logs the
                 * direction and whether it was live or a load, never the id or any text). */
                if (string.IsNullOrEmpty(message.message))
                {
                    Logging.info("insertMessage: an EMPTY standard row was not rendered (" + (message.localSender ? "own" : "peer") + ", " + (batch != null ? "load" : "live") + ").");
                    // ★ #983 (review r1, MINOR-4): the READ bookkeeping still runs — a skipped
                    // bubble must not leave the badge on for an open chat, or the sender without
                    // a read tick. Only the push is skipped.
                    updateMessageReadStatus(message, channel);
                    return;
                }
                // Normal chat message
                // Call webview methods on the main UI thread only
                // D-5/N26 (#366): trailing `relation` arg — ADDITIVE (an older shell
                // ignores extras; a missing arg reads as undefined → 'none' FE-side).
                /* ★★ #1198 / #1199 (session 6b) — args 13–16 (P1): `replyTo` · `edited` · `quoteName` · `quoteText`, all
                 * ADDITIVE (an older shell ignores 14–16; an older exe sends 13 → no marker, no fallback quote).
                 * A reply is TEXT with a quote line (ReplyQuote): when the line MATCHES a message of this channel (the
                 * in-memory list, then the one deeper read), arg 5 carries the BODY, arg 13 the target's id (C#'s own
                 * hex), 15 / 16 the quote's name + excerpt (C#'s excerpt; the name sanitized — the shell renders both
                 * with textContent only); a VALID quote line with no match → Damir P2: the BODY, 13 = "" (no jump) and 15 / 16
                 * drawn from the line (ReplyQuote.fallbackOf); not the shape → the text UNCHANGED, 13 / 15 / 16 "". The old
                 * M1 "carrier" seam (a Core `replyToId`) is gone: nothing has to land in Core.
                 * `edited` = "1" for a standard message whose sequence moved (a chatStream replace — EditRules.isEdited),
                 * else "". */
                string rowText = message.message;
                string reply_to = "";
                string quoteName = "";
                string quoteText = "";
                if (matchReply(message, channel, batch?.replyIndex, out ReplyQuote.Match? rm) && rm != null)
                {
                    rowText = rm.body;
                    reply_to = rm.targetIdHex;   // "" for Damir P2's fallback box (no jump)
                    quoteName = rm.quoteName;
                    quoteText = rm.quoteText;
                }
                string edited = EditRules.isEdited(message.type, message.sequence, friend.bot) ? "1" : "";
                /* ★ Damir P1 (#46 r2 MAJOR-1): arg 6 = Core's `timestamp`, which an edit no longer changes — every replace
                 * passes the existing time back (onEditMessage, StreamProcessor's chatStream case), so the bubble keeps its
                 * time, its place and its day separator. (r1 used `receivedTimestamp` — THIS device's arrival time, wrong for
                 * a received message.) */
                long rowTime = message.timestamp;
                /* ★★ #1208 (S7, V2): arg 17 `voice` — an inline voice message (VoiceCodec.tryPeekInline: shape + bounds, no
                 * decode) → arg 5 = its FIRST LINE only (never the base64), no reply / quote / edited args, and the duration
                 * in ms; "" for every other row (a bot room: the first line as plain text). An older shell ignores arg 17. */
                string rowVoice = voiceRowArg(message, ref rowText, ref reply_to, ref edited, ref quoteName, ref quoteText);
                // ★★ L2 (#641): the group answer is DERIVED — see deliveryTicks.
                deliveryTicks(message, out bool sSent, out bool sConfirmed, out bool sRead);
                push(batch, prefix, Crypto.hashToString(message.id), address, nick, avatar, rowText, rowTime.ToString(), sSent.ToString(), sConfirmed.ToString(), sRead.ToString(), paid.ToString(), message.errorSending.ToString(), relation, reply_to, edited, quoteName, quoteText, rowVoice);
                if (rowVoice != "")
                {
                    noteVoiceInfo(message, batch);   // ★ #1208 V4: the waveform, decoded off this thread AFTER the row's push
                }
            }

            if(message.type == FriendMessageType.voiceCall || message.type == FriendMessageType.voiceCallEnd)
            {
                string text;
                if(message.localSender)
                {
                    text = SpixiLocalization._SL("chat-call-outgoing");
                }else
                {
                    text = SpixiLocalization._SL("chat-call-incoming");
                }
                bool declined = false;
                /* ★ #572 ④ (Damir's walk, B6): a call the USER declined rendered as
                 * "Missed call". The R-2 fix (#554) stopped the missed-call NOTIFICATION
                 * correctly; this label is the other half, and it is read from history,
                 * so it needs the durable marker rather than a live flag. */
                bool declinedLocally = VoIPManager.isDeclinedLocally(message);
                bool declinedRemotely = VoIPManager.isDeclinedRemotely(message);   // ★ #1080 F11: the PEER declined (caller's side)
                if(message.message == "" || declinedLocally || declinedRemotely)
                {
                    if(message.type == FriendMessageType.voiceCallEnd || !VoIPManager.hasSession(message.id))
                    {
                        declined = true;
                        if (declinedLocally || declinedRemotely)
                        {
                            // The user saw the call and answered it with a decline. Same
                            // wording on both sides: this device turned the call down.
                            // ★ #1080 F11: …and the caller's card when the PEER turned it down.
                            text = SpixiLocalization._SL("chat-call-declined") ?? "Call declined";
                        }
                        else if (message.localSender)
                        {
                            text = SpixiLocalization._SL("chat-call-no-answer");
                        }
                        else
                        {
                            text = SpixiLocalization._SL("chat-call-missed");
                        }
                    }
                }else if(message.type == FriendMessageType.voiceCallEnd)
                {
                    long seconds = Int32.Parse(message.message);
                    long minutes = seconds > 0 ? seconds / 60 : 0;
                    seconds = seconds > 0 ? seconds % 60 : 0;
                    text = string.Format("{0} ({1}:{2})", text, minutes, seconds < 10 ? "0" + seconds : seconds.ToString());

                }
                // C4: raw call duration in seconds ("" when not answered/ended)
                string duration_secs = "";
                if (message.type == FriendMessageType.voiceCallEnd && !declined)
                {
                    duration_secs = message.message;
                }
                /* C4: trailing outgoing/missed/duration. New args go LAST — never reorder.
                 * #572 ④ adds an 8th: declinedLocally. `missed` stays as it was, because
                 * an OLDER shell reading only 7 args must keep its present behaviour;
                 * the new shell prefers the 8th and renders the declined card
                 * (phone-x, no call-back nudge — the #87⑦ grammar). */
                /* ★ C4 (Session AD): a 9th arg, `active` — the session this card belongs to is
                 * LIVE right now. The shell hides "Call back" while it is (the link sent
                 * ixian:callback into a busy refusal); the card re-pushes with false when the
                 * call ends (VoIPManager.endVoIPSession → insertMessage). */
                bool callActive = message.type == FriendMessageType.voiceCall && !declined && VoIPManager.hasSession(message.id);
                /* ★ #1080 F11: a 10th arg, `declinedRemotely` — the peer declined this OUTGOING call. Last, never
                 * reordered; an older shell ignores it and keeps its no-answer card with C#'s new label. */
                push(batch, "addCall", Crypto.hashToString(message.id), text, declined.ToString(), message.timestamp.ToString(), message.localSender.ToString(), (declined && !message.localSender).ToString(), duration_secs, declinedLocally.ToString(), callActive.ToString(), declinedRemotely.ToString());
            }

            updateMessageReadStatus(message, channel);
        }

        /* ★★ #1148 (4): the chats-list REACTION HEART (SReactionFlags) clears at the same three sites as the unread count —
         * the chat loads (loadMessages), a message lands in the open chat (updateMessageReadStatus), the chat comes back to
         * the foreground (updateMessagesReadStatus). A no-op is a lookup, no write; a real clear re-pushes the chats rows. */
        private void clearReactionFlag()
        {
            try
            {
                if (friend != null && SReactionFlags.clear(friend.walletAddress.ToString()))
                {
                    UIHelpers.shouldRefreshContacts = true;
                }
            }
            catch (Exception e)
            {
                Logging.warn("clearReactionFlag failed: " + e.GetType().Name);
            }
        }

        private void updateMessageReadStatus(FriendMessage message, int channel)
        {
            if (App.isInForeground && friend.metaData.unreadMessageCount > 0)
            {
                // TODO improve this by reducing the number of unread messages by unread message
                // TODO make sure to handle edge cases like deleted message
                friend.metaData.unreadMessageCount = 0;
                friend.saveMetaData();
            }
            if (App.isInForeground)
            {
                clearReactionFlag();   // ★ #1148 (4)
            }
            if (!message.read && !message.localSender && App.isInForeground && message.type != FriendMessageType.requestAdd)
            {
                message.sent = true;
                message.confirmed = true;
                message.read = true;

                IxianHandler.localStorage.requestWriteMessages(friend.walletAddress, channel);

                // ★ THE BADGE DIAL (audit MAJOR): the TRUE count — the flush sites and every
                // live push must agree, or a muted chat's badge flickers on each update.
                UIHelpers.setContactStatus(friend.walletAddress, friend.online, friend.metaData.unreadMessageCount, "", 0);

                if (!friend.bot)
                {
                    // Send read confirmation
                    SpixiMessage msg_read = new SpixiMessage(SpixiMessageCode.msgRead, message.id, selectedChannel);
                    
                    StreamProcessor.sendSpixiMessage(friend, msg_read, null, null, true, true, false, false);
                }
            }
        }

        public void updateMessagesReadStatus()
        {
            if(friend == null)
            {
                return;
            }
            if (friend.metaData.lastMessage == null)
            {
                return;
            }
            if(friend.metaData.lastMessageChannel == selectedChannel)
            {
                if (!friend.metaData.lastMessage.read && !friend.metaData.lastMessage.localSender && App.isInForeground)
                {
                    friend.metaData.lastMessage.sent = true;
                    friend.metaData.lastMessage.confirmed = true;
                    friend.metaData.lastMessage.read = true;
                    friend.saveMetaData();
                }
            }
            var messages = friend.getMessages(selectedChannel);
            if (messages == null || messages.Count == 0)
            {
                return;
            }
            if (friend.metaData.unreadMessageCount > 0)
            {
                friend.metaData.unreadMessageCount = 0;
                friend.saveMetaData();
                // ★ #1175 (#46 F1-1): the literal 0 into HomePage's status CACHE too (iOS-31 leg A, as loadMessages does).
                // A presence push (Node.cs) may have cached the OLD count; the next tick flushes that cache AFTER the row
                // push below (HomePage tick: loadChats, then updateContactStatus), which put the badge back. timestamp 0 =
                // the display-only push: it overwrites the cached unread (HomePage.setContactStatus leg B(ii)).
                UIHelpers.setContactStatus(friend.walletAddress, friend.online, 0, "", 0);
                pushZeroedChatRow();   // ★ #1175: this zero pushed nothing at all before (the row kept its badge)
            }
            clearReactionFlag();   // ★ #1148 (4)
            lock (messages)
            {
                int max_msg_count = 0;
                if (messages.Count > 50)
                {
                    max_msg_count = messages.Count - 50;
                }

                for (int i = messages.Count - 1; i >= max_msg_count; i--)
                {
                    FriendMessage msg = messages[i];
                    updateMessageReadStatus(msg, selectedChannel);
                }
            }
        }

        public void deleteMessage(byte[] msg_id, int channel)
        {
            voiceRowDeleted(msg_id);   // ★ #46 r1 B m-10: the clip playing (or waiting for its download) of a deleted row stops
            if (channel == selectedChannel)
            {
                lock (fileRowsShown)
                {
                    fileRowsShown.Remove(Crypto.hashToString(msg_id));   // ★ #1190 (#46 r4 M1): the shell drops the row
                }
                Utils.sendUiCommand(this, "deleteMessage", Crypto.hashToString(msg_id));
            }
        }

        /* ★ C21 (Session AD): WHO is typing, appended (new args LAST). In a room the
         * typist is the group-sender address; the nick is resolved from the roster the
         * same way the reaction excerpt resolves it (HomePage.updateChatReaction), and
         * the address rides too so the shell can fall back to its truncated form. A
         * 1:1 needs neither (the pill is the peer's). A BLIND room sends nothing —
         * naming a typist there is an identity hint the room's mode forbids. */
        public void showTyping(Address? typist = null)
        {
            string who = "";
            string nick = "";
            try
            {
                if (typist != null && (friend.bot || friend.type == FriendType.Group) && !Utils.hidesParticipants(friend))
                {
                    who = typist.ToString();
                    if (friend.users.hasUser(typist) && friend.users.getUser(typist).getNick() != "")
                    {
                        nick = friend.users.getUser(typist).getNick();
                    }
                    else
                    {
                        Friend? asContact = FriendList.getFriend(typist);
                        if (asContact != null && !string.IsNullOrEmpty(asContact.nickname))
                        {
                            nick = asContact.nickname;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Logging.warn("showTyping: typist lookup failed: " + ex.GetType().Name);
            }
            Utils.sendUiCommand(this, "showUserTyping", who, nick);
        }

        public void updateReactions(byte[] msg_id, int channel)
        {
            if (channel == selectedChannel)
            {
                // ★★ MINOR-5 (#46 loop r2): `getMessages` can return null. Fix agent L
                // hardened the same idiom at StreamProcessor.cs:294 with that reason written
                // out. This site is the sink of the new msgReaction channel resolve
                // (StreamProcessor.cs:605), so it is reached from the NETWORK thread.
                FriendMessage? fm = friend.getMessages(channel)?.Find(x => x.id != null && x.id.SequenceEqual(msg_id));
                if (fm != null)
                {
                    updateReactions(fm);
                    // C11: in groups/bots, delivery/read confirmations arrive as received:/seen:
                    // aggregate reactions that flip OUR OWN message's sent/confirmed/read flags
                    // (Friend.addReaction, Ixian-Core) — but only the reaction pills were pushed, so
                    // the open chat's delivery tick stayed on the clock. Re-push the status so the
                    // tick advances. Guarded to localSender: only our own messages carry a delivery
                    // tick, and a received row would force a needless full re-render on every reaction.
                    // ⚠ This branch also runs for a FILE message — handleFileFullyReceived pushes
                    // updateReactions for the download count. updateMessage refuses a non-text
                    // message at its own head; do not add a second copy of that rule here.
                    if (fm.localSender)
                    {
                        updateMessage(fm, channel);
                    }
                }
            }
        }

        private void updateReactions(FriendMessage fm)
        {
            updateReactions(fm, null);   // ★ Session P: the LIVE path — one push, unchanged
        }

        private void updateReactions(FriendMessage fm, UiBatch? batch)
        {
            // C5: own reaction address — blind groups react under a derived address (see the like case above)
            var own_address = IxianHandler.getWalletStorage().getPrimaryAddress();
            /* ★★ ROUND 3 (review3-cs MINOR-1) — THE RAW CHAIN THREW ON A GROUP WITH NO
             * BotInfo, AND `Utils.hidesParticipants` IS THE ONE HOME OF THAT QUESTION.
             * `ContactDetails.xaml.cs:280-284` states in this tree that a group can exist
             * with `metaData.botInfo == null`, and this site dereferenced it bare, four
             * lines above the `try` the same round added. A file that finished downloading
             * in such a group threw here, and `receiveData`'s outer catch swallowed it —
             * the rest of that one message and its download count were lost.
             * ⚠ THE SECOND TERM IS NOT REDUNDANT. `Utils.hidesParticipants` fails CLOSED:
             * it answers TRUE for a group whose room info has not arrived, which is right
             * for a MASK and wrong for a DERIVATION — `DeriveGroupAddress` needs
             * `botInfo.randomId`, and reading it would throw exactly where the old chain
             * did. With no room info the address cannot be derived, so the primary address
             * stands: no own-reaction highlight until the room info lands, and no throw.
             * ⚠ The WRITER (the `like` case) carries the same pair. Keep them equal — a
             * reader that derives while the writer does not reads the wrong address. */
            if (Utils.hidesParticipants(friend)
                && friend.metaData?.botInfo != null
                && friend.users.getOwner() != null
                && !friend.users.getOwner().SequenceEqual(own_address))
            {
                own_address = GroupChat.DeriveGroupAddress(own_address, friend.metaData.botInfo.randomId);
            }

            var reactions_str = "";
            var own_reactions_str = "";
            // ★ C6 (Session AD): the summed tip amounts (the per-sender `data` after "tip:"),
            // pushed as a 4th, trailing argument. "" when no tip parses as a number — an
            // older `tip:System.Byte[]` entry counts (the shell's ×N) but adds nothing.
            string tip_total_str = "";
            /* ★★ MINOR-4 (#46 loop r2) — THE LOCK THE deliveryTicks HEADER ALREADY PROMISED.
             * That header says the tick derivation "reads `reactions` under the same lock
             * discipline the reaction push uses". It was true of the three derivation sites
             * (they now all ask UIHelpers.anyOtherMemberHasMessage, which takes the lock)
             * and FALSE
             * of this one: the push walked `fm.reactions` bare while Core can append to the
             * same collection from the network thread, so `InvalidOperationException:
             * Collection was modified` was reachable here. The comment vouched for a
             * discipline that existed on one side only. Now it holds on both.
             * ⚠ WHAT THE LOCK DOES AND DOES NOT BUY. It matches the three sibling sites, so
             * this app's own readers cannot collide. Ixian-Core is FROZEN at 097341a and is
             * not in this checkout, so whether Core's writer takes the SAME lock cannot be
             * answered here — that is why the try/catch stays. A concurrent modification
             * therefore degrades to ONE skipped push, not a throw.
             * ⚠ Why a skipped push is safe: every reaction event pushes again, and the shell
             * re-renders from the next full string. A PARTIAL string would show wrong counts,
             * so it is never sent. */
            try
            {
                lock (fm.reactions)
                {
                    foreach (var reaction in fm.reactions)
                    {
                        reactions_str += reaction.Key + ":" + reaction.Value.Count() + ";";
                        if (reaction.Key == "tip")
                        {
                            IxiNumber tipTotal = 0;
                            bool anyTip = false;
                            foreach (var rd in reaction.Value)
                            {
                                if (rd == null || string.IsNullOrEmpty(rd.data))
                                {
                                    continue;
                                }
                                try
                                {
                                    IxiNumber a = new IxiNumber(rd.data);
                                    if (a > (long)0)
                                    {
                                        tipTotal += a;
                                        anyTip = true;
                                    }
                                }
                                catch (Exception)
                                {
                                    // `System.Byte[]` from a pre-C6 client, or garbage — a count-only tip
                                }
                            }
                            tip_total_str = anyTip ? tipTotal.ToString() : "";
                        }
                        // C5: which reaction keys the local user has added (trailing arg — never reorder)
                        if (reaction.Value.Find(x => x.sender.SequenceEqual(own_address)) != null)
                        {
                            own_reactions_str += reaction.Key + ";";
                        }
                    }
                }
            }
            catch (Exception reactionEx)
            {
                Logging.warn("updateReactions: the reaction set changed while it was read. The push is skipped. " + reactionEx);
                return;
            }
            if (batch != null)
            {
                batch.addReactions(Crypto.hashToString(fm.id), reactions_str, own_reactions_str, tip_total_str);   // ★ Session P: folded into the row's item
                return;
            }
            Utils.sendUiCommand(this, "addReactions", Crypto.hashToString(fm.id), reactions_str, own_reactions_str, tip_total_str);
        }

        /* ═══ ★★ L2 (#641) — THE GROUP DELIVERY TICKS ═════════════════════════════
         *
         * Damir, 2026-08-29: *"if a member is long term offline or deleted account, the
         * rest who are communicating will always see the 'sending' clock icon despite
         * them all seeing the messages … it should at least be sent or delivered."*
         *
         * THE MECHANISM. In a group, a delivery receipt is never written to the message.
         * `CoreStreamProcessor.handleMsgReceived` stores it as a PER-MEMBER REACTION and
         * returns early, and `Friend.addReaction` then advances the stored status only at
         * the FULL count (`received.Count + 1 >= users.count()`). One absent member holds
         * the clock for everyone, permanently.
         *
         * ★ Ixian-Core is FROZEN (097341a) and does NOT need to change: the per-member
         * reactions are already on the message, so the group answer is DERIVED HERE, at
         * the push, and nothing in Core's stored state is widened or rewritten.
         *
         * THE RULE Damir set. A group's outgoing bubble walks clock → single check →
         * double check, and STOPS:
         *   · sent      — the single check. Set at the HAND-OFF (see onSend), because the
         *                 clock means "still on this device" and nothing else.
         *   · delivered — the double check, at ONE confirmed member or more.
         *   · read      — NEVER in a group bubble. The detail moved to the long-press
         *                 menu, where someone looks when they want more about one message.
         *
         * ⚠ BOT ROOMS NEED NOTHING AND GET NOTHING. A bot room is FriendType.Normal with
         * `bot` true, so it never enters this branch. Its receipt comes from ONE known
         * address, `group_sender_address` is null, and Core's own tail already calls
         * `setMessageReceived` → double check. It reports no reads → never green. That is
         * the legacy rule, already correct in shared code (Damir corrected an earlier
         * version of this row that claimed the opposite).
         *
         * ⚠ Read-only. It reads `reactions` under `lock (message.reactions)` (see
         * UIHelpers.anyOtherMemberHasMessage) and writes nothing. The reaction push at
         * updateReactions(FriendMessage) takes the SAME lock — it did not when this line
         * was written, which is why the sentence is now a statement of fact rather than an
         * assumption (#46 loop r2, MINOR-4).
         *
         * ⚠⚠ IT RUNS AT TWO PUSH SITES, NOT FOUR. The first cut called it at the file and
         * app pushes as well, and those two shell handlers DISCARD the flags — the cards
         * carry no delivery tick at all. Dead code with a guarantee attached is worse than
         * the gap, so the calls came out and the gap is logged instead: file, app and
         * payment cards in a group show no delivery state. That is a shell row.
         *
         * ★★ ONE PREDICATE, ONE HOME (#647 round 4). "Did anybody else get it" is asked
         * here, at HomePage.getFriendMessageHelper and at
         * SpixiPendingMessageProcessor.markGroupCopyFailed. All three ASK the same
         * method: UIHelpers.anyOtherMemberHasMessage. Do not spell the rule out again
         * here. Do not add a reaction key here.
         *
         * ★ THE RULE IS CLOSED, so this site can never drift again. Any reaction from
         * any address that is not the local user is evidence that this member has the
         * message. Three earlier rounds each widened an enumerated list of keys and each
         * missed a surface. The list is gone. Read the header of
         * UIHelpers.anyOtherMemberHasMessage for the whole rule.
         *
         * ⚠ THIS SITE PASSES `false` AS THE UNREADABLE ANSWER. An unreadable reaction
         * set must not paint a double check that we cannot see. markGroupCopyFailed
         * passes `true` for the opposite reason. That asymmetry is deliberate. */
        private void deliveryTicks(FriendMessage message, out bool sent, out bool confirmed, out bool read)
        {
            sent = message.sent;
            confirmed = message.confirmed;
            read = message.read;
            if (!message.localSender || friend == null || friend.type != FriendType.Group)
            {
                return;
            }
            // ★ NEVER a green double check in a group. Core's addReaction CAN set the
            // stored `read` flag when every member reports seen — the bubble still must
            // not show it, so the override is here rather than a Core change.
            read = false;
            // ★★ ONE home for the rule. See the header. Unreadable answers `false` here.
            if (!confirmed && UIHelpers.anyOtherMemberHasMessage(friend, message, false))
            {
                confirmed = true;
            }
            // A delivered message was, necessarily, sent.
            if (confirmed)
            {
                sent = true;
            }
        }

        public void updateMessage(FriendMessage message, int channel)
        {
            if (channel != selectedChannel)
            {
                return;
            }
            /* ★★ TEXT ONLY, AND THIS IS THE CHOKE POINT.
             *
             * The push below sends `message.message` as the BUBBLE TEXT. That field is
             * display text for a standard message and for nothing else. A fileHeader
             * holds the raw header `uid:name:size` (this file parses it that way at the
             * fileHeader branch of insertMessage), an appSession holds the app info
             * string, and a payment holds a transaction id.
             *
             * The shell handler is `upsertText`. It OVERWRITES the row's text, and when
             * the id is not loaded it CREATES a text row stamped with the CURRENT time.
             * So one download of an out-of-window group file painted a phantom outgoing
             * bubble reading `9f2a…:holiday.jpg:2048576` at the bottom of the log, and
             * long-press Copy on a file card copied the header string.
             *
             * The guard lives HERE, not at the callers. Seven sites push through this
             * method: the C11 reaction re-push above, the receipt in StreamProcessor, the
             * updated-message path in Node, and the four hooks in
             * SpixiPendingMessageProcessor. Every one of them can hold a file, app or
             * payment message.
             *
             * ⚠ NOTHING IS LOST. The file, app and payment cards DISCARD the delivery
             * flags in the shell (see the addFile and addAppRequest notes above), so
             * they have no tick this push could have advanced. The reaction and download
             * counts reach the card through `addReactions`, which is a different push
             * and is not gated. */
            if (message.type == FriendMessageType.fileHeader)
            {
                /* ★★ #1028 (walk P.22): a sent FILE's live delivery tick. It cannot ride the
                 * push below (that one carries message.message as the bubble TEXT — the raw
                 * `uid:name:size` header, see above), so a file gets its own FLAGS-ONLY push.
                 * No text, no name, no path: an id and three booleans. The shell ignores it for
                 * a received file and for an id it has not loaded. */
                deliveryTicks(message, out bool fSent, out bool fConfirmed, out bool fRead);
                Utils.sendUiCommand(this, "updateFileTicks", Crypto.hashToString(message.id), fSent.ToString(), fConfirmed.ToString(), fRead.ToString());
                return;
            }
            if (message.type != FriendMessageType.standard)
            {
                return;
            }
            /* ★ #981 (M1): a status push for a row whose text is now EMPTY (a deleted message)
             * must not reach the shell — its handler OVERWRITES the row's text and, for an id it
             * has not loaded, CREATES a text row: either way an empty bubble. The removal itself
             * is the deleteMessage push; there is nothing for this push to say. */
            if (string.IsNullOrEmpty(message.message))
            {
                Logging.info("updateMessage: an EMPTY standard row was not pushed.");
                return;
            }

            bool paid = false;
            if(message.transactionId != "")
            {
                paid = true;
            }
            /* ★★ #1198 / #1199 (session 6b) — args 8–11 (P2): `edited` · `replyTo` · `quoteName` · `quoteText`, the SAME
             * match as insertMessage's text row (an edited reply keeps its quote: the edit re-sends the original quote
             * line); arg 2 = the BODY when matched. An older shell ignores 8–11. */
            string rowText = message.message;
            string replyTo = "";
            string quoteName = "";
            string quoteText = "";
            if (matchReply(message, channel, null, out ReplyQuote.Match? rm) && rm != null)
            {
                rowText = rm.body;
                replyTo = rm.targetIdHex;   // "" for Damir P2's fallback box
                quoteName = rm.quoteName;
                quoteText = rm.quoteText;
            }
            string edited = EditRules.isEdited(message.type, message.sequence, friend.bot) ? "1" : "";
            /* ★★ #1208 (S7): the SAME voice rule as the row push (V2) — a tick update of a voice row carries its FIRST LINE
             * only (never the base64), no reply / edited args, and arg 12 `voice` = the duration ("" otherwise). An older
             * shell ignores arg 12. */
            string voice = voiceRowArg(message, ref rowText, ref replyTo, ref edited, ref quoteName, ref quoteText);
            // ★★ L2 (#641): the group answer is DERIVED — see deliveryTicks.
            deliveryTicks(message, out bool tSent, out bool tConfirmed, out bool tRead);
            Utils.sendUiCommand(this, "updateMessage", Crypto.hashToString(message.id), rowText, tSent.ToString(), tConfirmed.ToString(), tRead.ToString(), paid.ToString(), message.errorSending.ToString(), edited, replyTo, quoteName, quoteText, voice);
        }

        /** ★ #1166 A-N4: `channel` = the TRANSFER's own channel (FileTransfer.channel — TransferManager passes it; an
         *  incoming transfer has already left TransferManager's lists when it completes, so the page cannot look it up). */
        public void updateFile(string uid, string progress, bool complete, int channel)
        {
            Utils.sendUiCommand(this, "updateFile", uid, progress, complete.ToString());
            if (complete)
            {
                thumbAfterTransfer(uid, channel);   // ★ A5 #1124: a finished transfer may now be a LOCAL image
                voiceAfterTransfer(uid, channel);   // ★ #1208: a finished VOICE file — its waveform, and the play the tap asked for
            }
        }

        /* ═══ ★★ A5 #1124 — PHOTO PREVIEWS IN THE CHAT (Damir #1133 (3); 🟡 NEW push `setFileThumb`, BE ask) ═══
         *
         * WHAT: an image FILE message whose file is LOCAL on this device — sent by me, or downloaded by the user's tap and
         * COMPLETED — gets a small JPEG preview, pushed as `setFileThumb(<message id hex>, <data:image/jpeg;base64,…>)`.
         * The shell draws it on the media tile (chat.html setFileThumb; typed-bubbles.js createImageFileBubble).
         * The pref (SChatPrefs.photoPreviews, Account → Privacy) reaches the shell as `setPhotoPreviews("True"|"False")`,
         * once before the first history push of a document and again on a re-appear with a changed value.
         *
         * SECURITY (CLAUDE.md ★; docs/security-handover-gate.md "Session 4 — A5"):
         *   · only when SChatPrefs.photoPreviews; only a fileHeader whose name C# can preview (SharedItems.isImageName);
         *     only a file on THIS device — `message.completed` (a download the user tapped) or MY OWN file
         *     (`localSender`: the picker's file is local from the first moment; `completed` waits for the peer's
         *     fileFullyReceived, TransferManager.cs:707 — #46 r1 A-M2) — and a path from SharedItems.localPathOf — C#'s OWN
         *     vetted rule (received → the Downloads-root rule; sent → an absolute path that exists). No WebView value
         *     reaches a file op;
         *   · the decode is a contact's file in the app process (the G-6b exposure, widened to the chat render): only a
         *     file whose FIRST BYTES pass ImageSniff.looksLikeImage reaches SThumbnail.makeJpeg, never above
         *     ChatThumbSourceMax (= the G-6b cap, SharedItems.ThumbSourceMax, 20 MB — #46 r1 A-M3), the platform decode is
         *     bounded (SThumbnail), the result ≤ ChatThumbMaxBytes;
         *   · OFF the UI thread (one drainer per page, one file at a time), the push ON the main thread; a page that is
         *     torn down (isDisposed) decodes nothing more and pushes nothing (#46 r1 A-M3);
         *   · at most ONCE per (message, file version) per document (`thumbsSent`, keyed by the document number too);
         *   · the push carries the message id and the JPEG — never a path, a name or an address; no log line.
         * Not SharedItems.thumbOf: it is private, 160 px, and passes a small file through AS IS (any of four MIME types —
         * the chat accepts a JPEG only). The same sniff, caps and cache shape, at 320 px. */
        public const long ChatThumbSourceMax = SharedItems.ThumbSourceMax;
        public const int ChatThumbPx = 320;
        public const long ChatThumbMaxBytes = 64 * 1024;
        /* ≤ 64 entries × ≤ 87 384 base64 chars (64 KB of JPEG) ≈ 11 MB of UTF-16 at the very worst for the process; a 320 px
         * preview is ~10–25 KB, so ~2–4 MB in practice. FULL → the OLDEST entry goes (FIFO, #46 r1 A-M3): a chat with fewer
         * previews than this is decoded once per process, a bigger history decodes its oldest previews again. */
        private const int ChatThumbCacheMax = 64;

        private static readonly object chatThumbLock = new object();
        private static readonly Dictionary<string, string?> chatThumbCache = new Dictionary<string, string?>(StringComparer.Ordinal);
        private static readonly Queue<string> chatThumbOrder = new Queue<string>();   // insertion order of chatThumbCache (under chatThumbLock)

        private volatile int thumbDoc = 0;   // bumped per document (onLoad, main thread); a job of an older document is dropped
        private readonly HashSet<string> thumbsSent = new HashSet<string>(StringComparer.Ordinal);   // "<doc>|<id>|<len>|<mtime>" — lock itself
        private readonly ConcurrentQueue<ThumbJob> thumbQueue = new ConcurrentQueue<ThumbJob>();
        private int thumbWorker = 0;   // 1 while a drainer runs (Interlocked)
        private bool? photoPreviewsPushed = null;   // the value this document was told; null = not yet (main thread)

        private sealed class ThumbJob
        {
            public readonly int doc;
            public readonly string id;
            public readonly FriendMessage fm;
            public ThumbJob(int d, string i, FriendMessage m) { doc = d; id = i; fm = m; }
        }

        /** Tell the shell the pref when this document has not heard it, or it changed. Main thread. */
        private void pushPhotoPreviews()
        {
            bool on = SChatPrefs.photoPreviews;
            if (photoPreviewsPushed == on)
            {
                return;
            }
            photoPreviewsPushed = on;
            Utils.sendUiCommand(this, "setPhotoPreviews", on ? "True" : "False");
        }

        /** ★ #46 r1 A-M1: the Privacy switch changed (SettingsPage, `ixian:photoPreviews:`) while this chat is ALIVE — an
         *  overlay under Account never gets OnAppearing, so SettingsPage tells every live chat page. A changed value is told
         *  (the shell flips every image between the tile and the card); ON re-flushes the history so insertMessage queues
         *  the previews the OFF time never made. A document not told yet (photoPreviewsPushed null) hears it in onLoad.
         *  Main thread (the settings verb runs in a WebView Navigating handler); a failure logs its TYPE only. */
        public void onPhotoPreviewsChanged()
        {
            try
            {
                if (friend == null || photoPreviewsPushed == null || photoPreviewsPushed == SChatPrefs.photoPreviews)
                {
                    return;
                }
                pushPhotoPreviews();
                if (photoPreviewsPushed == true)
                {
                    loadMessages();
                }
            }
            catch (Exception e)
            {
                Logging.warn("onPhotoPreviewsChanged failed: " + e.GetType().Name);   // a type only
            }
        }

        /** insertMessage's file branch: an image file ON THIS DEVICE (a completed download, or my own) is a candidate;
         *  a load burst defers it to messagesDone. */
        private void noteThumbCandidate(FriendMessage message, string name, UiBatch? batch)
        {
            if (message == null || message.id == null || !(message.completed || message.localSender) || !SharedItems.isImageName(name) || !SChatPrefs.photoPreviews)
            {
                return;
            }
            string id = Crypto.hashToString(message.id);
            if (batch != null)
            {
                batch.thumbs.Add(new KeyValuePair<string, FriendMessage>(id, message));
                return;
            }
            enqueueThumb(id, message);
        }

        /** updateFile(complete): the message whose transfer finished, if it is an image file on this device.
         *  ★ #1166 A-N4 (#46 r1): the message is looked up in the TRANSFER's own channel (`channel`), never in whatever
         *  channel the page shows now. A transfer of ANOTHER channel than the shown one queues nothing: the shell holds only
         *  the shown channel's rows (loadMessages), so its preview would be refused there AND burn its once-per-document
         *  slot; that channel's own re-flush (insertMessage → noteThumbCandidate) queues it when the user switches to it. */
        private void thumbAfterTransfer(string uid, int channel)
        {
            try
            {
                if (friend == null || string.IsNullOrEmpty(uid) || !SChatPrefs.photoPreviews || channel != selectedChannel)
                {
                    return;
                }
                List<FriendMessage>? list = friend.getMessages(channel);
                if (list == null)
                {
                    return;
                }
                FriendMessage? fm;
                lock (list)
                {
                    fm = list.Find(x => x.transferId == uid);
                }
                if (fm == null || fm.id == null || fm.type != FriendMessageType.fileHeader || !(fm.completed || fm.localSender))
                {
                    return;
                }
                if (!SharedItems.parseFileHeader(fm.message, out string name, out _) || !SharedItems.isImageName(name))
                {
                    return;
                }
                enqueueThumb(Crypto.hashToString(fm.id), fm);
            }
            catch (Exception e)
            {
                Logging.warn("thumbAfterTransfer failed: " + e.GetType().Name);   // a type only — never the id or a path
            }
        }

        private void enqueueThumb(string id, FriendMessage fm)
        {
            thumbQueue.Enqueue(new ThumbJob(thumbDoc, id, fm));
            if (Interlocked.CompareExchange(ref thumbWorker, 1, 0) == 0)
            {
                Task.Run(drainThumbs);
            }
        }

        /** ONE drainer per page, OFF the UI thread: the jobs run one after the other (a 50-row burst never decodes 50 at once). */
        private void drainThumbs()
        {
            try
            {
                while (thumbQueue.TryDequeue(out ThumbJob? job))
                {
                    try
                    {
                        processThumb(job);
                    }
                    catch (Exception e)
                    {
                        Logging.warn("chat preview failed: " + e.GetType().Name);   // a type only
                    }
                }
            }
            finally
            {
                Interlocked.Exchange(ref thumbWorker, 0);
                // a job enqueued between the last TryDequeue and the reset above must not wait for the next enqueue
                if (!thumbQueue.IsEmpty && Interlocked.CompareExchange(ref thumbWorker, 1, 0) == 0)
                {
                    Task.Run(drainThumbs);
                }
            }
        }

        private void processThumb(ThumbJob job)
        {
            if (isDisposed || job.doc != thumbDoc || friend == null || !SChatPrefs.photoPreviews)
            {
                return;   // a closed page (torn down) or an older document: the rest of the queue drains as no-ops
            }
            string? path = SharedItems.localPathOf(job.fm);   // C#'s own rule — never a WebView value
            if (path == null)
            {
                return;
            }
            FileInfo fi = new FileInfo(path);
            if (!fi.Exists || fi.Length <= 0 || fi.Length > ChatThumbSourceMax)
            {
                return;
            }
            string version = fi.Length.ToString(System.Globalization.CultureInfo.InvariantCulture)
                + "|" + fi.LastWriteTimeUtc.Ticks.ToString(System.Globalization.CultureInfo.InvariantCulture);
            /* the DOCUMENT number is in the key (#46 r1 A-N1): a job of the old document that passed the check above just
               before onLoad cleared the set must not take the new document's slot for the same message */
            string sentKey = job.doc.ToString(System.Globalization.CultureInfo.InvariantCulture) + "|" + job.id + "|" + version;
            lock (thumbsSent)
            {
                if (!thumbsSent.Add(sentKey))
                {
                    return;   // this message's file, this version, already went to this document
                }
            }
            string? uri = chatThumbOf(fi);
            if (uri == null)
            {
                return;
            }
            int doc = job.doc;
            string id = job.id;
            MainThread.BeginInvokeOnMainThread(() =>
            {
                if (isDisposed || doc != thumbDoc || friend == null || !SChatPrefs.photoPreviews)
                {
                    /* #46 r2 R2-N1: NOT sent — give the slot back. The key is taken before the decode (one job per file per
                       document), so a fast OFF → ON (its re-flush queues the file again) must find it free */
                    lock (thumbsSent)
                    {
                        thumbsSent.Remove(sentKey);
                    }
                    return;
                }
                Utils.sendUiCommand(this, "setFileThumb", id, uri);
            });
        }

        private static byte[] readHead16(string path)
        {
            byte[] head = new byte[16];
            using (FileStream fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            {
                int n = fs.Read(head, 0, head.Length);
                if (n < head.Length)
                {
                    Array.Resize(ref head, Math.Max(n, 0));
                }
            }
            return head;
        }

        /** The preview of a local file: sniffed, capped, decoded by the platform at ChatThumbPx; cached per file version
         *  (path + size + write time) for the process, a failed decode too. Null = no preview (the tile keeps its glyph). */
        private static string? chatThumbOf(FileInfo fi)
        {
            try
            {
                if (fi.Length <= 0 || fi.Length > ChatThumbSourceMax || !ImageSniff.looksLikeImage(readHead16(fi.FullName)))
                {
                    return null;
                }
                string key = fi.FullName + "|" + fi.Length.ToString(System.Globalization.CultureInfo.InvariantCulture)
                    + "|" + fi.LastWriteTimeUtc.Ticks.ToString(System.Globalization.CultureInfo.InvariantCulture);
                lock (chatThumbLock)
                {
                    if (chatThumbCache.TryGetValue(key, out string? hit))
                    {
                        return hit;
                    }
                }
                byte[]? jpeg = Spixi.SThumbnail.makeJpeg(fi.FullName, ChatThumbPx);
                string? uri = jpeg != null && jpeg.Length > 0 && jpeg.Length <= ChatThumbMaxBytes
                    ? "data:image/jpeg;base64," + Convert.ToBase64String(jpeg)
                    : null;
                lock (chatThumbLock)
                {
                    if (!chatThumbCache.ContainsKey(key))
                    {
                        while (chatThumbCache.Count >= ChatThumbCacheMax && chatThumbOrder.Count > 0)
                        {
                            chatThumbCache.Remove(chatThumbOrder.Dequeue());   // bounded: the OLDEST goes (#46 r1 A-M3 — was a full reset)
                        }
                        chatThumbOrder.Enqueue(key);
                    }
                    chatThumbCache[key] = uri;
                }
                return uri;
            }
            catch (Exception)
            {
                return null;
            }
        }

        /* ═══ ★★ #1166 V-3 — THE MEDIA VIEWER, CHAT HALF (#1165 (9); 🟡 NEW verb `ixian:viewImage:<hexMsgId>` + NEW push
         * `viewerImage(<hexMsgId>, <data uri | "">)`, BE ask) ═══
         * A tap on a photo tile that shows its preview opens the shell's viewer on the preview at once and asks C# for a
         * bigger picture (ViewerImage.dataUriOf: long edge ≤ ViewerImage.MaxEdge, JPEG ≤ ViewerImage.MaxJpegBytes).
         * SECURITY (CLAUDE.md ★; docs/security-handover-gate.md "Session 4 — A5" widened to the viewer):
         *   · the WebView sends a MESSAGE ID only — hex, bounded; C# finds the message in the SHOWN channel's loaded list
         *     (friend.getMessage(selectedChannel, id)) and requires: a fileHeader · an image name (SharedItems.isImageName) ·
         *     a file ON THIS DEVICE by the chat preview's own rule (completed or my own, then SharedItems.localPathOf —
         *     received → the vetted Downloads-root rule; sent → an absolute existing path). No WebView value reaches a file op;
         *   · ViewerImage.dataUriOfAsync (sniffed, ≤ the G-6b 20 MB cap, a bounded platform decode behind ViewerImage's ONE
         *     process-wide gate, awaited — no pool thread parks) runs OFF the UI thread. ★ #46 r1 A-M2: LATEST TAP WINS —
         *     viewerLatest holds the newest token; an older tap is dropped before and after the gate (stillWanted) and
         *     pushes NOTHING (its viewer is closed in the shell); the push goes back on the main thread, re-checked, and
         *     nothing is pushed to a page that is torn down (isDisposed) or a document that is not the one that asked;
         *   · the push carries the shell's own token (validated as hex here, so only a hex string is ever echoed) and the
         *     JPEG — never a path, a name or an address. Any failure after the grammar check → "" (the shell says so);
         *   · log: the exception TYPE only. */
        private const int ViewImageIdMaxHex = 128;   // 64 bytes of id — a Core message id is far shorter
        private volatile string? viewerLatest = null;   // ★ #46 r1 A-M2: the newest ixian:viewImage token (latest tap wins)

        /** The verb's id grammar: an even-length, non-empty run of hex digits, ≤ ViewImageIdMaxHex. */
        private static bool isHexMsgId(string? s)
        {
            if (string.IsNullOrEmpty(s) || s.Length > ViewImageIdMaxHex || (s.Length & 1) != 0)
            {
                return false;
            }
            foreach (char c in s)
            {
                bool hex = (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
                if (!hex)
                {
                    return false;
                }
            }
            return true;
        }

        /** ixian:viewImage:<hexMsgId> — MAIN THREAD (the Navigating handler). */
        private void onViewImage(string hexId)
        {
            if (!isHexMsgId(hexId))
            {
                return;   // not a token this shell could have built — nothing is echoed back
            }
            viewerLatest = hexId;   // ★ #46 r1 A-M2: every earlier tap is no longer wanted
            int doc = thumbDoc;
            string? path = null;
            try
            {
                FriendMessage? fm = friend == null ? null : friend.getMessage(selectedChannel, Crypto.stringToHash(hexId));
                if (fm != null && fm.type == FriendMessageType.fileHeader && (fm.completed || fm.localSender)
                    && SharedItems.parseFileHeader(fm.message, out string name, out _) && SharedItems.isImageName(name))
                {
                    path = SharedItems.localPathOf(fm);   // C#'s own rule — never a WebView value
                }
            }
            catch (Exception e)
            {
                Logging.warn("viewImage lookup failed: " + e.GetType().Name);   // a type only — never the id or a path
                path = null;
            }
            if (path == null)
            {
                pushViewerImage(doc, hexId, "");
                return;
            }
            string file = path;
            Func<bool> stillWanted = () => hexId == viewerLatest && !isDisposed && doc == thumbDoc;   // volatile reads only (a pool thread)
            Task.Run(async () =>
            {
                string? uri = null;
                try
                {
                    uri = await ViewerImage.dataUriOfAsync(file, stillWanted);   // awaits ViewerImage's gate — OFF the UI thread
                }
                catch (Exception e)
                {
                    Logging.warn("viewImage failed: " + e.GetType().Name);   // a type only
                    uri = null;
                }
                if (!stillWanted())
                {
                    return;   // a newer tap (or a closed page): this viewer is gone — push nothing
                }
                string answer = uri ?? "";
                MainThread.BeginInvokeOnMainThread(() =>
                {
                    if (stillWanted())
                    {
                        pushViewerImage(doc, hexId, answer);
                    }
                });
            });
        }

        /** Main thread: the answer for one viewer token; nothing for a torn-down page or an older document. */
        private void pushViewerImage(int doc, string hexId, string uri)
        {
            if (isDisposed || doc != thumbDoc)
            {
                return;
            }
            Utils.sendUiCommand(this, "viewerImage", hexId, uri);
        }

        /* ═══ ★★ #1208 (S7) — VOICE MESSAGES, THE PAGE HALF (#1136 (b); 🟡 NEW verbs V7 `ixian:voicerec:start|cancel|send`,
         * V8 `ixian:voiceplay:<idHex>`; NEW pushes V4 `voiceInfo`, V5 `voiceState`, V6 `voiceRec`; V1 cap `voice`; V2 / V3
         * arg 17 on addMe / addThem / addFile (+ arg 12 on updateMessage); BE ask B-30) ═══
         * The audio itself is VoiceClips (Spixi/VoIP/VoiceClips.cs: one recording, one player, the kept clips per chat). This
         * page answers the verbs, decides the ROUTE of a send, and tells the shell what C# knows.
         *   SEND (➤) — the clip (live or kept) → VoiceCodec.chooseRoute(normal 1:1, bot, approved, the peer's answered
         *     `spixi.voice.1` (SpixiProtocols.supports on Core's stored list, #1207), the inline text's length, Core's
         *     maxChatMessageSize) → INLINE: humanLine + "\n" + encodeInline as ONE plain `chat` message, exactly onSend's plain
         *     path but NO clearInput (the text draft stays) · FILE: muxOgg → C# writes VoiceCodec.voiceFileName(now UTC) in
         *     ITS OWN folder (<spixiUserFolder>/Voice — app-private, KEPT so the sender can play its own clip) → the existing
         *     file send (sendPreparedFile — the picker's own post-picker half). A failed send gives the clip back (kept).
         *   PLAY (V8) — the id is C#'s own 32-hex row id; C# finds the row in ITS list of the open channel and parses the
         *     clip ITSELF (inline: tryParseInline · file: the C#-resolved local path, ≤ MaxOggBytes, tryDemuxOgg) — bounded,
         *     off the UI thread. A received voice FILE not on the device: the tap ACCEPTS the download (onAcceptFile, the
         *     existing path), pushes `loading`, and plays when updateFile reports it complete while this document lives.
         *   WAVEFORM (V4) — every voice row is decoded ONCE per document, off the UI and network threads (one drainer,
         *     a bounded queue), the result cached per process (bounded); a failure → voiceState(id, 'error').
         * SECURITY (CLAUDE.md ★): no WebView value reaches a file op (the id is looked up; C# names and places the .ogg); no
         * audio byte, path or name crosses into the WebView (ids, state words and integers only); every parse of peer data
         * is VoiceCodec's bounded one; logs carry fixed words and exception TYPES — never an id, text, path or address. */
        private const int VoiceInfoQueueMax = 128;
        private const int VoiceInfoCacheMax = 256;
        private static readonly object voiceInfoCacheLock = new object();
        private static readonly Dictionary<string, string> voiceInfoCache = new Dictionary<string, string>(StringComparer.Ordinal);   // "<id>|<kind>|<len>" → "<durMs>|<csv>"
        private static readonly Queue<string> voiceInfoCacheOrder = new Queue<string>();
        private readonly HashSet<string> voiceInfoSent = new HashSet<string>(StringComparer.Ordinal);   // "<doc>|<id>" — lock itself
        private readonly ConcurrentQueue<VoiceInfoJob> voiceInfoQueue = new ConcurrentQueue<VoiceInfoJob>();
        private int voiceInfoQueued = 0;   // jobs in voiceInfoQueue (Interlocked) — the bound
        private int voiceInfoWorker = 0;   // 1 while a drainer runs (Interlocked)
        private PendingVoicePlay? pendingVoicePlay = null;   // the voice file whose download a tap started (Interlocked)

        private sealed class VoiceInfoJob
        {
            public readonly int doc;
            public readonly string id;
            public readonly FriendMessage fm;
            public VoiceInfoJob(int d, string i, FriendMessage m) { doc = d; id = i; fm = m; }
        }

        private sealed class PendingVoicePlay
        {
            public readonly string idHex;
            public readonly string uid;
            public readonly int doc;
            public readonly int channel;
            public readonly long sinceMs;   // Environment.TickCount64 at the tap
            public int goneTicks = 0;       // #46 r2: consecutive 1 Hz ticks that saw the transfer gone and the row not complete
            public PendingVoicePlay(string i, string u, int d, int c, long t) { idHex = i; uid = u; doc = d; channel = c; sinceMs = t; }
        }

        /** ★ #1208 V1: does this chat offer the mic? An approved 1:1, or an approved private group whose members are known
         *  (a voice FILE needs the group transfer); never a bot room, never a blind group (Utils.hidesParticipants fails
         *  closed while the room info is missing). The record and send verbs re-check it. */
        public static bool voiceCapFor(Friend? f)
        {
            return f != null && !f.bot && f.state == FriendState.Approved
                && (f.type == FriendType.Normal || (f.type == FriendType.Group && !Utils.hidesParticipants(f)));
        }

        // ---- IVoiceHost (VoiceClips calls these from any thread) ----
        public string voiceChatKey
        {
            get { return friend != null && friend.walletAddress != null ? friend.walletAddress.ToString() : ""; }
        }

        public bool voiceHostAlive
        {
            get { return !isDisposed && friend != null; }
        }

        /** V6 `voiceRec(state, elapsedMs)` — posted to the main thread; nothing for a torn-down page. */
        public void pushVoiceRec(string state, int elapsedMs, Func<bool>? stillValid = null)
        {
            string ms = Math.Max(0, elapsedMs).ToString(System.Globalization.CultureInfo.InvariantCulture);
            MainThread.BeginInvokeOnMainThread(() =>
            {
                if (!isDisposed && (stillValid == null || stillValid()))   // #46 r1 B m-3: re-checked HERE, on the main thread
                {
                    Utils.sendUiCommand(this, "voiceRec", state, ms);
                }
            });
        }

        /** V5 `voiceState(idHex, state, posMs, durMs)` — posted to the main thread; nothing for a torn-down page. */
        public void pushVoiceState(string idHex, string state, int posMs, int durMs)
        {
            string pos = Math.Max(0, posMs).ToString(System.Globalization.CultureInfo.InvariantCulture);
            string dur = Math.Max(0, durMs).ToString(System.Globalization.CultureInfo.InvariantCulture);
            MainThread.BeginInvokeOnMainThread(() =>
            {
                if (!isDisposed)
                {
                    Utils.sendUiCommand(this, "voiceState", idHex, state, pos, dur);
                }
            });
        }

        /** V8's id grammar (CONTRACT §7, #46 r1 B m-6 / A N9): parseMessageIdHex's rule — an even number of hex digits,
         *  2 .. 2 × CoreConfig.maxMessageIdSize (the shell's QUOTE_ID_RE bound). */
        private static bool isVoiceIdHex(string? s)
        {
            if (s == null || s.Length < 2 || s.Length % 2 != 0 || s.Length > 2 * CoreConfig.maxMessageIdSize)
            {
                return false;
            }
            foreach (char c in s)
            {
                bool hex = (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
                if (!hex)
                {
                    return false;
                }
            }
            return true;
        }

        /** ★ #1208 V2: a standard row whose text is an inline voice message (VoiceCodec.tryPeekInline — shape + bounds, no
         *  base64 decode) shows its FIRST LINE only (never the base64) and is never a reply or an edit; the result is arg 17
         *  of addMe / addThem and arg 12 of updateMessage — the duration in ms, or "" (not a voice row; a bot room, where
         *  VoiceCodec.rendersAsVoice is false: the first line as plain text). */
        private string voiceRowArg(FriendMessage message, ref string rowText, ref string replyTo, ref string edited, ref string quoteName, ref string quoteText)
        {
            if (message.type != FriendMessageType.standard || !VoiceCodec.tryPeekInline(message.message, out int durMs))
            {
                return "";
            }
            rowText = VoiceCodec.firstLine(message.message);
            replyTo = "";
            edited = "";
            quoteName = "";
            quoteText = "";
            return VoiceCodec.rendersAsVoice(friend.bot) ? durMs.ToString(System.Globalization.CultureInfo.InvariantCulture) : "";
        }

        /** ★ #1208 V3: is this file row a VOICE file? C#'s own name rule (VoiceCodec.isVoiceFileName), the size cap (an unknown
         *  size — 0 — counts; the demux re-checks the real size) and not a bot room. */
        private bool isVoiceFileRow(FriendMessage message, string name)
        {
            if (message.type != FriendMessageType.fileHeader || !VoiceCodec.isVoiceFileName(name) || !VoiceCodec.rendersAsVoice(friend.bot))
            {
                return false;
            }
            /* #46 r2 NIT: the HEADER's size first (`uid:name:size` — what the peer's device reads too, ReplyQuote.headerSizeFits /
               HomePage), Core's fileSize only when the header carries none — the same rule on both devices */
            ulong size = 0;
            if (SharedItems.parseFileHeader(message.message, out _, out ulong headerSize))
            {
                size = headerSize;
            }
            if (size == 0)
            {
                size = message.fileSize;
            }
            return size == 0 || size <= (ulong)VoiceCodec.MaxOggBytes;
        }

        /** addFile's arg 17: "1" for a voice file row, else "". */
        private string voiceFileArg(FriendMessage message, string name)
        {
            return isVoiceFileRow(message, name) ? "1" : "";
        }

        /* ---- V7: the recorder verbs (main thread — the Navigating handler) ---- */

        private void onVoiceRecStart()
        {
            try
            {
                if (!voiceCapFor(friend))
                {
                    Logging.warn("Voice: recording refused (notAllowed)");
                    pushVoiceRec("error", 0);
                    return;
                }
                switch (VoiceClips.startRecording(this))
                {
                    case VoiceRecStart.Started:
                        int recMs = VoiceClips.recordingMs(this);
                        if (recMs >= 0)
                        {
                            pushVoiceRec("recording", recMs);
                        }
                        else
                        {
                            // an interrupt already ended it (it pushed its own state) — tell the state as it is now
                            int keptNow = VoiceClips.keptMs(voiceChatKey);
                            pushVoiceRec(keptNow > 0 ? "stopped" : "idle", keptNow);
                        }
                        break;
                    case VoiceRecStart.Kept:
                        pushVoiceRec("stopped", VoiceClips.keptMs(voiceChatKey));   // ✕ or ➤ the kept clip first
                        break;
                    case VoiceRecStart.Busy:
                        pushVoiceRec("busy", 0);
                        break;
                    case VoiceRecStart.Denied:
                        pushVoiceRec("denied", 0);
                        break;
                    default:
                        pushVoiceRec("error", 0);
                        break;
                }
            }
            catch (Exception e)
            {
                Logging.warn("Voice: recording failed (" + e.GetType().Name + ")");
                pushVoiceRec("error", 0);
            }
        }

        private void onVoiceRecCancel()
        {
            try
            {
                VoiceClips.cancelRecording(this);
            }
            catch (Exception e)
            {
                Logging.warn("Voice: cancel failed (" + e.GetType().Name + ")");
            }
            pushVoiceRec("idle", 0);
        }

        /** V7 `ixian:voicerec:send` — see the section header (SEND). §7 (#46 r1 B m-5): a refused / failed send pushes
         *  `sendfail` then `stopped` (the clip is kept); `error` is a RECORDING failure only. #46 r1 B m-12: once the message
         *  is STORED (stored = true), a later throw keeps NOTHING — a second ➤ would send it twice. */
        private void onVoiceSend()
        {
            string key = voiceChatKey;
            List<byte[]>? packets = null;
            bool stored = false;
            try
            {
                packets = VoiceClips.takeForSend(this);
                if (packets == null)
                {
                    Logging.info("Voice: send refused (empty)");
                    pushVoiceRec("idle", 0);
                    return;
                }
                int durMs = packets.Count * VoiceCodec.FrameMs;
                if (!voiceCapFor(friend))
                {
                    Logging.warn("Voice: send refused (notAllowed)");
                    voiceSendFailed(key, packets);
                    return;
                }
                string? payload = VoiceCodec.encodeInline(packets);
                string? inlineText = payload != null ? VoiceCodec.humanLine(durMs) + "\n" + payload : null;
                bool peerSupportsVoice = SpixiProtocols.supports(friend.supportedProtocols, SpixiProtocols.VoiceId);
                VoiceCodec.Route route = VoiceCodec.chooseRoute(friend.type == FriendType.Normal, friend.bot,
                    friend.approved && friend.state == FriendState.Approved, peerSupportsVoice,
                    inlineText != null ? inlineText.Length : 0, CoreConfig.maxChatMessageSize);
                bool sent = route == VoiceCodec.Route.Inline && inlineText != null
                    ? sendVoiceInline(inlineText, ref stored)
                    : sendVoiceFile(packets, ref stored);
                if (!sent)
                {
                    voiceSendFailed(key, packets);
                    return;
                }
                Logging.info("Voice: sent (" + (route == VoiceCodec.Route.Inline ? "inline" : "file") + ")");
                pushVoiceRec("idle", 0);
            }
            catch (Exception e)
            {
                Logging.warn("Voice: send failed (" + e.GetType().Name + ")");
                if (stored || packets == null)
                {
                    pushVoiceRec("idle", 0);   // the message exists (its row shows the send state) — the clip is NOT given back
                }
                else
                {
                    voiceSendFailed(key, packets);
                }
            }
        }

        /** A send that did not store anything: the clip goes back to the chat's bar — `sendfail`, then `stopped` (§7). */
        private void voiceSendFailed(string key, List<byte[]> packets)
        {
            int durMs = packets.Count * VoiceCodec.FrameMs;
            VoiceClips.keepAgain(key, packets);
            pushVoiceRec("sendfail", durMs);
            pushVoiceRec("stopped", durMs);
        }

        /** The INLINE route: onSend's plain path (SpixiMessageCode.chat · Node.addMessageWithType · sendChatMessage — the
         *  envelope id = the record id, so the ticks land) with NO clearInput: the composer's text draft stays.
         *  `stored` turns true the moment Core holds the message. */
        private bool sendVoiceInline(string text, ref bool stored)
        {
            SpixiMessage spixi_message = new SpixiMessage(SpixiMessageCode.chat, Encoding.UTF8.GetBytes(text), selectedChannel);
            byte[] spixi_msg_bytes = spixi_message.getBytes();
            FriendMessage? friend_message = Node.addMessageWithType(null, FriendMessageType.standard, friend.walletAddress, selectedChannel, text, true, null, 0, true, true, spixi_msg_bytes.Length);
            if (friend_message == null)
            {
                Logging.error("Voice: the message could not be stored — not sending it.");
                return false;
            }
            stored = true;
            CoreStreamProcessor.sendChatMessage(friend, friend_message, selectedChannel);
            return true;
        }

        /** C#'s own folder for the voice files it SENDS: <spixiUserFolder>/Voice (app-private, next to Downloads). */
        private static string voiceFolder()
        {
            return Path.Combine(Config.spixiUserFolder, "Voice");
        }

        /** The FILE route: Ogg Opus (VoiceCodec.muxOgg, a random serial) written under a name C# makes
         *  (VoiceCodec.voiceFileName — the same UTC second twice takes the next second's name; never an overwrite), then the
         *  existing file send. The file is KEPT: the sender's own row plays it. #46 r1 C N7: an Ogg over MaxOggBytes (a
         *  receiver would refuse it as voice) is never sent. #46 r1 A N4: a send that throws BEFORE the transfer exists
         *  deletes the .ogg again (and its stream); once the transfer holds the stream, the file stays (it serves the peer). */
        private bool sendVoiceFile(List<byte[]> packets, ref bool stored)
        {
            if (friend.bot || Utils.hidesParticipants(friend))
            {
                Logging.warn("Voice: send refused (no file in this chat)");
                return false;
            }
            byte[] serial = System.Security.Cryptography.RandomNumberGenerator.GetBytes(4);
            byte[] ogg = VoiceCodec.muxOgg(packets, VoiceCodec.DefaultPreSkip, BitConverter.ToUInt32(serial, 0));
            if (ogg.Length > VoiceCodec.MaxOggBytes)
            {
                Logging.warn("Voice: send refused (too big)");
                return false;
            }
            string dir = voiceFolder();
            Directory.CreateDirectory(dir);
            string? path = null;
            string? name = null;
            DateTime utc = DateTime.UtcNow;
            for (int i = 0; i < 5 && path == null; i++)
            {
                string n = VoiceCodec.voiceFileName(utc.AddSeconds(i));
                string p = Path.Combine(dir, n);
                bool created = false;
                try
                {
                    using (FileStream fs = new FileStream(p, FileMode.CreateNew, FileAccess.Write, FileShare.None))
                    {
                        created = true;
                        fs.Write(ogg, 0, ogg.Length);
                    }
                    path = p;
                    name = n;
                }
                catch (IOException) when (!created && File.Exists(p))
                {
                    // this second's name is taken — the next one
                }
                catch (Exception) when (created)
                {
                    deleteOwnVoiceFile(p);   // a half-written file of ours never stays
                    throw;
                }
            }
            if (path == null || name == null)
            {
                Logging.warn("Voice: send failed (no free name)");
                return false;
            }
            Stream? stream = null;
            FriendMessage? friend_message;
            sendPreparedStage = 0;
            sendPreparedUid = null;
            try
            {
                stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);   // #46 r2: inside the try
                friend_message = sendPreparedFile(name, stream, path);
            }
            catch (Exception)
            {
                if (sendPreparedStage >= 2)
                {
                    stored = true;   // Core holds the file message — nothing is given back, the file serves the peer
                    throw;
                }
                withdrawVoiceFile(stream, path);   // #46 r2: nothing stored — no transfer, no stream, no .ogg stays
                throw;
            }
            if (friend_message == null)
            {
                deleteOwnVoiceFile(path);   // sendPreparedFile withdrew its transfer (and closed the stream)
                return false;
            }
            stored = true;
            if (friend_message.id != null)
            {
                // the live row was pushed before the path was set — its waveform now (the sender's own file)
                enqueueVoiceInfo(Crypto.hashToString(friend_message.id), friend_message);
            }
            return true;
        }

        /** #46 r2 (orphans): a voice file send that failed BEFORE Core stored the message — the transfer stage 1 registered
         *  is removed (TransferManager.removeOutgoingTransfer disposes its stream), else the stream is closed here; then the
         *  .ogg goes. A retry (➤ again) makes ONE new file and transfer. */
        private void withdrawVoiceFile(Stream? stream, string path)
        {
            try
            {
                if (sendPreparedStage == 1 && sendPreparedUid != null)
                {
                    TransferManager.removeOutgoingTransfer(sendPreparedUid);
                }
                else
                {
                    stream?.Dispose();
                }
            }
            catch (Exception e)
            {
                Logging.warn("Voice: the unsent transfer could not be removed (" + e.GetType().Name + ")");
            }
            sendPreparedStage = 0;
            sendPreparedUid = null;
            deleteOwnVoiceFile(path);
        }

        /** Delete a .ogg THIS page made in voiceFolder() (C#'s own path — never a WebView value). */
        private static void deleteOwnVoiceFile(string path)
        {
            try
            {
                File.Delete(path);
            }
            catch (Exception e)
            {
                Logging.warn("Voice: the unsent file could not be removed (" + e.GetType().Name + ")");
            }
        }

        /* ---- V8: play / pause / resume (main thread) ---- */

        private void onVoicePlay(string idHex)
        {
            string? ownHex = null;
            try
            {
                if (!isVoiceIdHex(idHex))
                {
                    Logging.warn("ixian:voiceplay: the id is not usable");
                    return;
                }
                byte[]? id = parseMessageIdHex(idHex);
                int channel = selectedChannel;
                FriendMessage? fm = id != null ? findChannelMessage(channel, id) : null;
                if (fm == null || fm.id == null || !VoiceCodec.rendersAsVoice(friend.bot))
                {
                    Logging.warn("ixian:voiceplay: no voice row holds the id");
                    pushVoiceState(idHex, "error", 0, 0);   // #46 r2 NIT (§7 never silent): the id passed the hex grammar above
                    return;
                }
                ownHex = Crypto.hashToString(fm.id);   // C#'s own hex from here on — never the WebView's
                /* a new tap replaces a play still waiting for its download — the OTHER row's bubble hears `stopped` (#46 r2
                   MAJOR); a tap on THAT row re-evaluates it below (§7) */
                clearPendingVoicePlay(ownHex);
                if (VoIPManager.isInitiated())
                {
                    // §7: a tap during a call is answered — `stopped` with the clip's length (an inline peek; a file: 0)
                    Logging.info("Voice: play refused (call active)");
                    int callDur = fm.type == FriendMessageType.standard && VoiceCodec.tryPeekInline(fm.message, out int peekMs) ? peekMs : 0;
                    pushVoiceState(ownHex, "stopped", 0, callDur);
                    return;
                }
                if (VoiceClips.toggleIfCurrent(this, ownHex))
                {
                    return;
                }
                if (fm.type == FriendMessageType.standard)
                {
                    string text = fm.message;
                    if (!VoiceCodec.tryPeekInline(text, out _))
                    {
                        pushVoiceState(ownHex, "error", 0, 0);
                        return;
                    }
                    string inlineHex = ownHex;
                    Task.Run(() =>
                    {
                        if (VoiceCodec.tryParseInline(text, out int durMs, out List<byte[]>? packets) && packets != null)
                        {
                            VoiceClips.play(this, inlineHex, packets, durMs);
                        }
                        else
                        {
                            Logging.warn("Voice: play failed (parse)");
                            pushVoiceState(inlineHex, "error", 0, 0);
                        }
                    });
                    return;
                }
                if (fm.type == FriendMessageType.fileHeader && SharedItems.parseFileHeader(fm.message, out string name, out _) && isVoiceFileRow(fm, name))
                {
                    string? path = SharedItems.localPathOf(fm);   // C#'s own rule — never a WebView value
                    if (path != null)
                    {
                        string fileHex = ownHex;
                        Task.Run(() => playVoiceFile(fileHex, path));
                        return;
                    }
                    if (!fm.localSender && !fm.completed && !string.IsNullOrEmpty(fm.transferId))
                    {
                        startVoiceDownload(fm, ownHex, channel);   // ★ #1208 (4): the first play tap accepts the download
                        return;
                    }
                }
                pushVoiceState(ownHex, "error", 0, 0);   // not a voice row, or its file is not on this device
            }
            catch (Exception e)
            {
                Logging.warn("ixian:voiceplay: failed (" + e.GetType().Name + ")");
                if (ownHex != null)
                {
                    clearPendingVoicePlay(ownHex);
                    pushVoiceState(ownHex, "error", 0, 0);   // never left on `loading`
                }
            }
        }

        /** #46 r1 B MAJOR-1 / A M2 (§7): a voice FILE not on this device — the tap accepts the download through the existing
         *  path (onAcceptFile), but `loading` is pushed ONLY when a transfer really runs afterwards; no transfer (a blind room,
         *  an unknown group sender, a refused accept) → `error`. The clip that is playing stops (B m-2). A row that is
         *  already downloading (a second tap on `loading`) gets `loading` again. The pending play is watched by
         *  checkPendingVoicePlay (updateScreen, 1 Hz): a transfer that is gone or paused → `stopped`. */
        private void startVoiceDownload(FriendMessage fm, string ownHex, int channel)
        {
            if (Utils.hidesParticipants(friend))
            {
                Logging.warn("Voice: the download could not start (blind room)");
                pushVoiceState(ownHex, "error", 0, 0);
                return;
            }
            FileTransfer? running = incomingTransferOf(fm.transferId);
            if (running == null)
            {
                onAcceptFile(channel, fm);
                running = incomingTransferOf(fm.transferId);
            }
            if (running == null)
            {
                Logging.warn("Voice: the download could not start");
                pushVoiceState(ownHex, "error", 0, 0);
                return;
            }
            VoiceClips.stopPlayback(true);   // #46 r2 NIT: the playing clip stops only once this tap's download really runs
            clearPendingVoicePlay(ownHex);
            Interlocked.Exchange(ref pendingVoicePlay, new PendingVoicePlay(ownHex, fm.transferId, thumbDoc, channel, Environment.TickCount64));
            pushVoiceState(ownHex, "loading", 0, 0);
        }

        /** TransferManager's incoming transfer of exactly `uid` (getIncomingTransfer matches with Contains). */
        private static FileTransfer? incomingTransferOf(string uid)
        {
            if (string.IsNullOrEmpty(uid))
            {
                return null;
            }
            FileTransfer? t = TransferManager.getIncomingTransfer(uid);
            return t != null && t.uid == uid ? t : null;
        }

        /** #46 r2 MAJOR: clear the pending play; its bubble hears `stopped` (main thread, isDisposed-gated by pushVoiceState)
         *  unless it is `keepId` (a tap on that same row re-evaluates it and answers itself) or of an older document (the
         *  shell is new). Every replace / clear of a pending play goes through here or answers the bubble itself. */
        private void clearPendingVoicePlay(string? keepId)
        {
            PendingVoicePlay? old = Interlocked.Exchange(ref pendingVoicePlay, null);
            if (old != null && old.doc == thumbDoc && !string.Equals(old.idHex, keepId, StringComparison.Ordinal))
            {
                pushVoiceState(old.idHex, "stopped", 0, 0);
            }
        }

        /** #46 r2 MINOR: is THIS chat on screen? HomePage.onUpdateUI's own rule for the 1 Hz tick — the TOP overlay, or a
         *  conversation under an open chat-info pane (ContactDetails on top); with no overlay, the top of the navigation
         *  stack. Main thread. */
        private bool isShownChat()
        {
            SpixiContentPage? top = SpixiContentPage.getTopOverlay();
            if (top != null)
            {
                return top == this || (top is ContactDetails && SpixiContentPage.getOverlayPages().Contains(this));
            }
            Page? navTop = Microsoft.Maui.Controls.Application.Current?.MainPage?.Navigation.NavigationStack.LastOrDefault();
            return navTop == this;
        }

        /** #46 r1 B MAJOR-1: TransferManager tells the page nothing when a transfer stalls or is dropped (no failure / pause
         *  hook reaches it — only updateFile progress and completion), so the 1 Hz updateScreen watches the ONE pending play:
         *  completed → voiceAfterTransfer; the transfer gone, paused (FileRowRules.transferStateArg "paused:") or never
         *  started within PausedAfterSeconds → `stopped`; an older document → forgotten. Main thread. */
        private void checkPendingVoicePlay()
        {
            PendingVoicePlay? want = Volatile.Read(ref pendingVoicePlay);
            if (want == null)
            {
                return;
            }
            try
            {
                if (want.doc != thumbDoc || isDisposed)
                {
                    Interlocked.CompareExchange(ref pendingVoicePlay, null, want);
                    return;
                }
                FileTransfer? t = incomingTransferOf(want.uid);
                bool stalled;
                if (t == null)
                {
                    FriendMessage? done = findChannelMessageByTransfer(want.channel, want.uid);
                    if (done != null && done.completed)
                    {
                        voiceAfterTransfer(want.uid, want.channel);   // the completion tick was missed — play now
                        return;
                    }
                    /* #46 r2 (completion race): completeFileTransfer removes the transfer BEFORE it sets fm.completed
                       (TransferManager.cs:681-707) — "gone" counts as dropped only on TWO consecutive ticks */
                    want.goneTicks++;
                    stalled = want.goneTicks >= 2;
                }
                else
                {
                    string st = FileRowRules.transferStateArg(true, t.completed, true, t.fileStream != null,
                        t.lastPacket, t.fileSize, t.packetSize, t.lastTimeStamp, Clock.getTimestamp());
                    want.goneTicks = 0;
                    bool neverStarted = t.lastTimeStamp <= 0 && Environment.TickCount64 - want.sinceMs > FileRowRules.PausedAfterSeconds * 1000;
                    stalled = st.StartsWith("paused:", StringComparison.Ordinal) || neverStarted;
                }
                if (stalled && Interlocked.CompareExchange(ref pendingVoicePlay, null, want) == want)
                {
                    Logging.info("Voice: the download stalled");
                    pushVoiceState(want.idHex, "stopped", 0, 0);
                }
            }
            catch (Exception e)
            {
                Logging.warn("Voice: pending check failed (" + e.GetType().Name + ")");
            }
        }

        /** A row of `channel` by its transfer id: the in-memory list, then the CACHED deeper read (findChannelMessage's
         *  order — #46 r1 A M4). */
        private FriendMessage? findChannelMessageByTransfer(int channel, string uid)
        {
            if (string.IsNullOrEmpty(uid))
            {
                return null;
            }
            FriendMessage? m = channelSnapshot(channel).Find(x => x.transferId == uid);
            if (m != null)
            {
                return m;
            }
            List<FriendMessage>? deep = replyDeepCached(channel);
            return deep?.Find(x => x.transferId == uid);
        }

        /** #46 r1 B m-10: deleteMessage (local or remote) — the deleted row's clip stops, its pending download play is
         *  forgotten (the row is gone: nothing to tell). */
        private void voiceRowDeleted(byte[]? msgId)
        {
            if (msgId == null)
            {
                return;
            }
            try
            {
                string hex = Crypto.hashToString(msgId);
                PendingVoicePlay? want = Volatile.Read(ref pendingVoicePlay);
                if (want != null && want.idHex == hex)
                {
                    Interlocked.CompareExchange(ref pendingVoicePlay, null, want);
                }
                // #46 r2 NIT: stopPlayback may wait for the run thread (≤ 1 s) — never on the network thread of a remote delete
                Task.Run(() =>
                {
                    try
                    {
                        VoiceClips.stopIfCurrent(this, hex);
                    }
                    catch (Exception e)
                    {
                        Logging.warn("Voice: delete stop failed (" + e.GetType().Name + ")");
                    }
                });
            }
            catch (Exception e)
            {
                Logging.warn("Voice: delete stop failed (" + e.GetType().Name + ")");
            }
        }

        /** A voice FILE on this device → bounded read + demux → play. A pool thread. */
        private void playVoiceFile(string idHex, string path)
        {
            try
            {
                if (readVoiceFile(path, out List<byte[]>? packets, out int durMs) && packets != null)
                {
                    VoiceClips.play(this, idHex, packets, durMs);
                    return;
                }
                Logging.warn("Voice: play failed (file)");
            }
            catch (Exception e)
            {
                Logging.warn("Voice: play failed (" + e.GetType().Name + ")");
            }
            pushVoiceState(idHex, "error", 0, 0);
        }

        /** A C#-resolved voice file → its packets. Read at most MaxOggBytes + 1 bytes (a bigger file is refused, also one
         *  that grew after the size check); VoiceCodec.tryDemuxOgg is the bounded parse. */
        private static bool readVoiceFile(string path, out List<byte[]>? packets, out int durMs)
        {
            packets = null;
            durMs = 0;
            byte[] buf = new byte[VoiceCodec.MaxOggBytes + 1];
            int n = 0;
            using (FileStream fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            {
                int r;
                while (n < buf.Length && (r = fs.Read(buf, n, buf.Length - n)) > 0)
                {
                    n += r;
                }
            }
            if (n <= 0 || n > VoiceCodec.MaxOggBytes)
            {
                return false;
            }
            Array.Resize(ref buf, n);
            return VoiceCodec.tryDemuxOgg(buf, out packets, out durMs);
        }

        /** updateFile(complete): a voice FILE of the shown channel arrived — the play a tap asked for (once, for this
         *  document; #46 r1: decided BEFORE the voice-row test — a row that is no longer a voice file answers `error`), and
         *  its waveform. The row is found like onVoicePlay finds it (#46 r1 A M4). The network thread; the work goes to the
         *  pool. */
        private void voiceAfterTransfer(string uid, int channel)
        {
            try
            {
                if (friend == null || isDisposed || string.IsNullOrEmpty(uid) || channel != selectedChannel)
                {
                    return;
                }
                FriendMessage? fm = findChannelMessageByTransfer(channel, uid);
                if (fm != null && !fm.completed)
                {
                    return;   // not done yet — a pending play keeps waiting
                }
                PendingVoicePlay? want = Volatile.Read(ref pendingVoicePlay);
                bool mine = want != null && want.uid == uid && want.doc == thumbDoc
                    && Interlocked.CompareExchange(ref pendingVoicePlay, null, want) == want;
                string? idHex = fm != null && fm.id != null ? Crypto.hashToString(fm.id) : null;
                bool voice = fm != null && idHex != null && SharedItems.parseFileHeader(fm.message, out string name, out _) && isVoiceFileRow(fm, name);
                if (mine && want != null)
                {
                    if (!voice || idHex != want.idHex)
                    {
                        pushVoiceState(want.idHex, "error", 0, 0);   // the row is gone or no voice file any more
                    }
                    else
                    {
                        string? path = SharedItems.localPathOf(fm!);
                        if (path == null)
                        {
                            pushVoiceState(want.idHex, "error", 0, 0);
                        }
                        else
                        {
                            /* #46 r2 (MAJOR + MINOR A M3): the auto-play needs THIS chat on screen (the overlay tick's own
                               predicate — an overlay covered by another never gets OnDisappearing) and no call; otherwise
                               the bubble hears `stopped`, never left on `loading`. The predicate reads the overlay /
                               navigation stacks: on the main thread. */
                            string playHex = want.idHex;
                            MainThread.BeginInvokeOnMainThread(() =>
                            {
                                if (isDisposed)
                                {
                                    return;
                                }
                                /* ★ lead (#46 r3 MINOR-1 / MINOR-2): also never in the background on a PHONE (the pocket case — the
                                   background interrupt does not clear a pending play; #46 r4 MINOR-A: on a desktop a window that lost
                                   focus is still on screen, #505, the same split as App.OnSleep's interruptAll) and never over a
                                   running recording (play would end it) */
                                bool backgrounded = false;
#if ANDROID || IOS
                                backgrounded = !App.isInForeground;
#endif
                                if (VoIPManager.isInitiated() || !isShownChat() || backgrounded || VoiceClips.isRecording)
                                {
                                    Logging.info("Voice: the downloaded clip was not played (hidden, background, recording or call)");
                                    pushVoiceState(playHex, "stopped", 0, 0);
                                    return;
                                }
                                Task.Run(() => playVoiceFile(playHex, path));
                            });
                        }
                    }
                }
                if (voice && idHex != null)
                {
                    enqueueVoiceInfo(idHex, fm!);
                }
            }
            catch (Exception e)
            {
                Logging.warn("Voice: after-transfer failed (" + e.GetType().Name + ")");
            }
        }

        /* ---- V4: the waveform, once per document, off the UI and network threads ---- */

        /** insertMessage: a voice row (inline, or a file on this device); a load burst defers it to after the batch. */
        private void noteVoiceInfo(FriendMessage message, UiBatch? batch)
        {
            if (message.id == null)
            {
                return;
            }
            string id = Crypto.hashToString(message.id);
            if (batch != null)
            {
                batch.voices.Add(new KeyValuePair<string, FriendMessage>(id, message));
                return;
            }
            enqueueVoiceInfo(id, message);
        }

        private void enqueueVoiceInfo(string id, FriendMessage fm)
        {
            if (Interlocked.Increment(ref voiceInfoQueued) > VoiceInfoQueueMax)
            {
                Interlocked.Decrement(ref voiceInfoQueued);
                return;   // bounded: the row keeps its plain bars (a reload asks again)
            }
            voiceInfoQueue.Enqueue(new VoiceInfoJob(thumbDoc, id, fm));
            if (Interlocked.CompareExchange(ref voiceInfoWorker, 1, 0) == 0)
            {
                Task.Run(drainVoiceInfo);
            }
        }

        /** ONE drainer per page: one clip at a time. */
        private void drainVoiceInfo()
        {
            try
            {
                while (voiceInfoQueue.TryDequeue(out VoiceInfoJob? job))
                {
                    Interlocked.Decrement(ref voiceInfoQueued);
                    try
                    {
                        processVoiceInfo(job);
                    }
                    catch (Exception e)
                    {
                        Logging.warn("Voice: waveform failed (" + e.GetType().Name + ")");
                    }
                }
            }
            finally
            {
                Interlocked.Exchange(ref voiceInfoWorker, 0);
                if (!voiceInfoQueue.IsEmpty && Interlocked.CompareExchange(ref voiceInfoWorker, 1, 0) == 0)
                {
                    Task.Run(drainVoiceInfo);
                }
            }
        }

        private void processVoiceInfo(VoiceInfoJob job)
        {
            if (isDisposed || job.doc != thumbDoc || friend == null)
            {
                return;   // a closed page or an older document
            }
            string sentKey = job.doc.ToString(System.Globalization.CultureInfo.InvariantCulture) + "|" + job.id;
            lock (voiceInfoSent)
            {
                if (!voiceInfoSent.Add(sentKey))
                {
                    return;   // this document has this row's waveform already
                }
            }
            string? info;
            bool notYet;
            try
            {
                info = voiceInfoOf(job.fm, job.id, out notYet);
            }
            catch (Exception e)
            {
                // #46 r1 A N5: a throw (a file that vanished, a decode) answers `error` ONCE, like a refused parse / demux
                Logging.warn("Voice: waveform failed (" + e.GetType().Name + ")");
                info = null;
                notYet = false;
            }
            if (notYet)
            {
                lock (voiceInfoSent)
                {
                    voiceInfoSent.Remove(sentKey);   // the file is not here yet — its completion asks again
                }
                return;
            }
            int doc = job.doc;
            string id = job.id;
            MainThread.BeginInvokeOnMainThread(() =>
            {
                if (isDisposed || doc != thumbDoc)
                {
                    lock (voiceInfoSent)
                    {
                        voiceInfoSent.Remove(sentKey);   // #46 r1 A N5: NOT sent — the slot is not taken
                    }
                    return;
                }
                if (info == null)
                {
                    Utils.sendUiCommand(this, "voiceState", id, "error", "0", "0");
                    return;
                }
                int bar = info.IndexOf('|');
                Utils.sendUiCommand(this, "voiceInfo", id, info.Substring(0, bar), info.Substring(bar + 1));
            });
        }

        /** "<durMs>|<peaksCsv>" of a voice row, cached per process (id + kind + length); null = the clip does not parse or
         *  decode; notYet = a voice FILE that is not on this device (no answer yet). */
        private string? voiceInfoOf(FriendMessage fm, string id, out bool notYet)
        {
            notYet = false;
            string? text = null;
            string? path = null;
            string key;
            if (fm.type == FriendMessageType.standard)
            {
                text = fm.message;
                if (text == null)
                {
                    return null;
                }
                key = id + "|t|" + text.Length.ToString(System.Globalization.CultureInfo.InvariantCulture);
            }
            else if (fm.type == FriendMessageType.fileHeader)
            {
                path = SharedItems.localPathOf(fm);   // C#'s own rule
                if (path == null)
                {
                    notYet = true;
                    return null;
                }
                FileInfo fi = new FileInfo(path);
                if (!fi.Exists)
                {
                    notYet = true;
                    return null;
                }
                key = id + "|f|" + fi.Length.ToString(System.Globalization.CultureInfo.InvariantCulture);
            }
            else
            {
                return null;
            }
            lock (voiceInfoCacheLock)
            {
                if (voiceInfoCache.TryGetValue(key, out string? hit))
                {
                    return hit;
                }
            }
            List<byte[]>? packets;
            int durMs;
            bool parsed = text != null
                ? VoiceCodec.tryParseInline(text, out durMs, out packets)
                : readVoiceFile(path!, out packets, out durMs);
            string? csv = parsed && packets != null ? VoiceClips.peaksCsvOf(packets) : null;
            if (csv == null)
            {
                return null;
            }
            string info = durMs.ToString(System.Globalization.CultureInfo.InvariantCulture) + "|" + csv;
            lock (voiceInfoCacheLock)
            {
                if (!voiceInfoCache.ContainsKey(key))
                {
                    while (voiceInfoCache.Count >= VoiceInfoCacheMax && voiceInfoCacheOrder.Count > 0)
                    {
                        voiceInfoCache.Remove(voiceInfoCacheOrder.Dequeue());   // bounded: the OLDEST goes
                    }
                    voiceInfoCacheOrder.Enqueue(key);
                }
                voiceInfoCache[key] = info;
            }
            return info;
        }

        /** ★★ #1207 (S7) — THE CAPABILITY ASK: an approved, normal 1:1, non-bot chat asks its contact ONCE per app run which
         *  Spixi protocols it speaks (SpixiProtocols.claimAsk — the rule + the once-per-process map); Core's ask waits in the
         *  pending queue until both apps are online; the answer replaces Core's stored list (StreamProcessor). Off the UI
         *  thread (onLoad's Task). The log names no contact. */
        private void askCapabilitiesOnce()
        {
            try
            {
                Friend? f = friend;
                if (f == null || f.walletAddress == null)
                {
                    return;
                }
                if (SpixiProtocols.claimAsk(f.walletAddress.ToString(), true, f.type == FriendType.Normal, f.bot, f.approved && f.state == FriendState.Approved))
                {
                    CoreStreamProcessor.sendGetAppProtocols(f);
                    Logging.info("Capability ask sent (chat open)");
                }
            }
            catch (Exception e)
            {
                Logging.warn("Capability ask failed (" + e.GetType().Name + ")");
            }
        }

        public void updateGroupChatNicks(Address address, string nick)
        {
            Utils.sendUiCommand(this, "updateGroupChatNicks", address.ToString(), nick);
        }

        public void updateTransactionStatus(string txid, bool verified)
        {
            string status = SpixiLocalization._SL("chat-payment-status-pending");
            string status_icon = "fa-clock";
            string statusEnum = "pending";   // C1: the enum rides as the 4th arg (new args LAST)

            if (verified)
            {
                status = SpixiLocalization._SL("chat-payment-status-confirmed");
                status_icon = "fa-check-circle";
                statusEnum = "completed";
            }

            Utils.sendUiCommand(this, "updateTransactionStatus", txid, status, status_icon, statusEnum);
        }

        /* C1: `status` is the LOCALIZED phrase the StreamProcessor composes
         * (chat-payment-status-pending / -declined). The enum is derived from the same
         * comparison the icon already made, so the 6th argument names the decision the
         * shell used to infer from the icon's spelling. */
        public void updateRequestFundsStatus(byte[] msg_id, byte[]? txid, string status)
        {
            string status_icon = "fa-clock";
            string statusEnum = "pending";
            bool enableView = true;
            if(status == SpixiLocalization._SL("chat-payment-status-declined"))
            {
                status_icon = "fa-exclamation-circle";
                statusEnum = "declined";
                enableView = false;
            }

            string txid_string = "";
            if (txid != null)
                txid_string = Transaction.getTxIdString(txid);

            Utils.sendUiCommand(this, "updatePaymentRequestStatus", Crypto.hashToString(msg_id), txid_string, status, status_icon, enableView.ToString(), statusEnum);
        }

        /* C2: the fiat sub-line for a payment card — the wallet tab's own arithmetic
         * (HomePage addPaymentActivity: amount × Node.fiatPrice, human-formatted).
         * "" when the amount is unknown ("?" until the tx is fetched) or no price is
         * known yet (fiatPrice 0 at boot); the shell hides an empty sub-line. */
        private static string paymentFiatFor(string amount)
        {
            try
            {
                if (amount == null || amount == "" || amount == "?" || Node.fiatPrice == 0)
                {
                    return "";
                }
                return Utils.amountToHumanFormatString(new IxiNumber(amount) * Node.fiatPrice);
            }
            catch (Exception)
            {
                return "";
            }
        }

        /* C2: can the available balance cover this amount? Amount-only, deliberately
         * (see the requestFunds block). Unknown amount / balance → false: the card
         * must not disable Pay on a guess; the review sheet has the real quote. */
        private static bool paymentInsufficient(string amount)
        {
            try
            {
                if (amount == null || amount == "" || amount == "?")
                {
                    return false;
                }
                // ★ #46 loop (auditor C, item 13): the flag is a SNAPSHOT at chat load and the
                // shell disables Pay on it — judged before the wallet has synced (every
                // balance 0, none verified) it would have locked every request card until the
                // chat was reopened. An UNVERIFIED balance answers "not insufficient": the
                // native review page is the authority and prices the fee on a live quote.
                bool anyVerified = false;
                foreach (var b in IxianHandler.balances)
                {
                    if (b.Value != null && b.Value.verified)
                    {
                        anyVerified = true;
                        break;
                    }
                }
                if (!anyVerified)
                {
                    return false;
                }
                IxiNumber need = new IxiNumber(amount);
                if (need <= (long)0)
                {
                    return false;
                }
                return Node.getAvailableBalance() < need;
            }
            catch (Exception)
            {
                return false;
            }
        }

        public void convertToBot()
        {
            popToRootAsync();
            if (homePage != null)
            {
                homePage.removeDetailContent(false);
                homePage.onChat(friend.walletAddress, null);
            } else
            {
                HomePage.Instance().onChat(friend.walletAddress, null);
            }
        }

        public void reloadScreen()
        {
            loadApps();
            loadMessages();
        }
        
        // Executed every second
        public override void updateScreen()
        {
            base.updateScreen();

            if (setNickname != friend.nickname)
            {
                Utils.sendUiCommand(this, "setNickname", friend.nickname);
                setNickname = friend.nickname;
            }

            if (friend.bot)
            {
                // #288 review: the unlock edge lives ONLY in the non-bot branch below. A
                // friend that BECOMES a bot while the pending latch is set (joinBot creates
                // the group-chat friend as RequestSent with bot == false; the bot metadata
                // lands later) would never receive showRequestSentModal("0") — a dead
                // composer + "Waiting for response…" + a Cancel-request strip on a chat the
                // user has already joined, until they back out and re-enter (onLoad resets
                // the latch). Bots are never pending-locked by design, so releasing is
                // unconditionally safe here.
                if (_waitingForContactConfirmation)
                {
                    _waitingForContactConfirmation = false;
                    Utils.sendUiCommand(this, "showRequestSentModal", "0");
                }
                long userCount = 0;
                if(friend.metaData != null && friend.metaData.botInfo != null)
                {
                    userCount = friend.metaData.botInfo.userCount;
                }
                Utils.sendUiCommand(this, "setOnlineStatus", memberCountText(userCount));
            }
            else if (friend.type == FriendType.Group)
            {
                // N22 (Damir, bot parity): a private group has no meaningful online or
                // offline state — its presence sub-line is the MEMBER COUNT, the same
                // localized string the bot branch pushes above. The count source is
                // friend.users.contacts.Count — the same one ContactDetails pushes for
                // the group-info surface (setGroupInfo, ContactDetails.xaml.cs:85), so
                // the topbar and the info pane can never disagree. Pushed only when the
                // text CHANGES: updateScreen ticks at 1 Hz and every setOnlineStatus
                // push rebuilds the shell topbar (the #288 churn class); the latch is
                // re-armed in onLoad so a WebView reload gets its count again. Groups
                // never set _waitingForContactConfirmation (both set sites exclude
                // FriendType.Group), so no unlock edge is lost by this hoist — and a
                // group can no longer hit the 1:1 online/offline branch below.
                // Approved groups only: a not-yet-approved group (the joinBot window,
                // legacy pending states) kept an EMPTY sub-line before this change —
                // "0 members" there would be new noise, so silence stays the status quo.
                if (friend.state == FriendState.Approved)
                {
                    int groupMemberCount = 0;
                    if (friend.users != null && friend.users.contacts != null)
                    {
                        groupMemberCount = friend.users.contacts.Count;
                    }
                    string groupCountText = memberCountText(groupMemberCount);
                    if (groupCountText != lastGroupCountPushed)
                    {
                        lastGroupCountPushed = groupCountText;
                        Utils.sendUiCommand(this, "setOnlineStatus", groupCountText);
                    }
                }
            }
            else
            {
                if (friend.state == FriendState.Approved)
                {
                    /* ★★ #1103: "online" = PresenceDisplay.shownOnline (a sighting ≤ 150 s old), and when not online the
                     * trailing arg carries the last sighting as LOCAL Unix seconds ("0" = unknown → the shell shows
                     * nothing). An older shell ignores the trailing arg and reads the text as before. Pushed on a CHANGE
                     * only (the #288 churn rule): online ⇄ not, or the last-seen minute moved. */
                    bool shownNow = PresenceDisplay.shownOnline(friend);
                    string seenArg = shownNow ? "0" : PresenceDisplay.lastSeenArg(friend);
                    string presenceKey = shownNow ? "on" : "off:" + (long.Parse(seenArg, System.Globalization.CultureInfo.InvariantCulture) / 60).ToString(System.Globalization.CultureInfo.InvariantCulture);
                    if (presenceKey != lastPresenceKey)
                    {
                        Utils.sendUiCommand(this, "setOnlineStatus", SpixiLocalization._SL(shownNow ? "chat-online" : "chat-offline"), seenArg);
                        lastPresenceKey = presenceKey;
                    }
                    setOnlineStatus = shownNow;

                    if (_waitingForContactConfirmation)
                    {
                        _waitingForContactConfirmation = false;
                        Utils.sendUiCommand(this, "showRequestSentModal", "0");
                        // #275 review A4: the sub-line still reads "Waiting for response" and
                        // the OFFLINE accept pushes no presence above (setOnlineStatus is
                        // false) — clear it explicitly. The online case already pushed
                        // chat-online this same tick.
                        if (!shownNow)
                        {
                            Utils.sendUiCommand(this, "setOnlineStatus", SpixiLocalization._SL("chat-offline"), seenArg);
                        }
                    }
                }
                else if (friend.type != FriendType.Group)
                       // #275: any non-Approved state — legacy states must get the waiting
                       // presence + the accept→unlock edge-detector too, matching the
                       // chats-list pending predicate (HomePage:1606, state != Approved).
                       // #275 review A1: groups excluded — see the onLoad guard.
                {
                    if (!_waitingForContactConfirmation)
                    {
                        // #275 review A5: push ONCE on the pending edge, not at 1 Hz — the
                        // presence push tears down + rebuilds the shell topbar every second
                        // (chat.html renderTopbar), killing keyboard focus on topbar actions
                        // and churning the aria-live sub region.
                        Utils.sendUiCommand(this, "setOnlineStatus", SpixiLocalization._SL("chat-waiting-for-response"));
                        // #275 review A3: symmetric lock edge — a chat that regresses into a
                        // pending state MID-SESSION locks now, not only at onLoad.
                        // RequestReceived keeps the request-pane affordance (its generic
                        // 'incoming' lock derives shell-side from the waiting presence).
                        if (friend.state != FriendState.RequestReceived)
                        {
                            Utils.sendUiCommand(this, "showRequestSentModal", "1");
                        }
                        // Q1 review (#266/#267 loop): latch on EITHER pending state, not just the
                        // outgoing one set at onLoad. This turns the Approved branch above into a
                        // general "was pending → is now Approved" edge detector, so the composer
                        // unlock (showRequestSentModal "0") is pushed exactly once on EVERY accept
                        // path — including an incoming request accepted from the chats-list card
                        // on desktop, and an accept while the freshly-approved peer is OFFLINE.
                        _waitingForContactConfirmation = true;
                        setOnlineStatus = false;   // #275 review A4: re-arm the presence push for the next Approved tick
                        lastPresenceKey = null;    // ★ #1103: the same re-arm for the presence latch
                    }
                }

            }

            // Show connectivity warning bar
            if (NetworkClientManager.getConnectedClients(true).Count() > 0)
            {
                if (!Config.enablePushNotifications
                    && (friend.relayNode == null || !StreamClientManager.isConnectedTo(friend.relayNode.hostname, true)))
                {
                    if (!warningDisplayed)
                    {
                        Utils.sendUiCommand(this, "showWarning", SpixiLocalization._SL("global-connecting-s2"));
                        warningDisplayed = true;
                    }
                }
                else
                {
                    if (warningDisplayed)
                    {
                        Utils.sendUiCommand(this, "showWarning", "");
                        warningDisplayed = false;
                    }
                    connectivityWarningDelayCounter = 0;
                }
            }
            else
            {
                // delay warning for one refresh cycle
                if (connectivityWarningDelayCounter > 0)
                {
                    if (!warningDisplayed)
                    {
                        Utils.sendUiCommand(this, "showWarning", SpixiLocalization._SL("global-connecting-dlt"));
                        warningDisplayed = true;
                    }
                    connectivityWarningDelayCounter = 0;
                }
                else
                {
                    connectivityWarningDelayCounter++;
                }
            }

            // Show the messages indicator
            int msgCount = SChatPrefs.unreadTotalForBadge();   // ★ CH4 (Session AD): mute-aware, one predicate
            if(msgCount > 0)
            {
                if (!unreadIndicatorDisplayed)
                {
                    Utils.sendUiCommand(this, "setUnreadIndicator", string.Format("{0}", msgCount));
                    unreadIndicatorDisplayed = true;
                }
            }
            else if (unreadIndicatorDisplayed)
            {
                Utils.sendUiCommand(this, "setUnreadIndicator", "0");
                unreadIndicatorDisplayed = false;
            }
            checkPendingVoicePlay();   // ★ #46 r1 B MAJOR-1: a voice download that stalls never leaves its bubble on `loading`
        }

        protected override bool OnBackButtonPressed()
        {
            // N51: a shell overlay (sheet/menu, the channel selector, select mode)
            // consumes back before the page pops — the N50 ContactDetails order.
            // The shell self-heals a stale flag (chatBack re-syncs when nothing
            // was open), so back can never wedge.
            if (shellOverlayOpen)
            {
                Utils.sendUiCommand(this, "chatBack");
                return true;
            }
            popPageAsync();

            return true;
        }

        public override void onResume()
        {
            base.onResume();

            updateMessagesReadStatus();

            int unreadCount = FriendList.getUnreadMessageCount();
            if (unreadCount == 0)
            {
                SPushService.clearNotifications(unreadCount);
            }
            // (the D1 call-row cancel lives on the LOAD path above — onResume never fires
            //  for an overlay conversation, loop r1 MAJOR-3)
        }
    }
}