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
    public partial class SingleChatPage : SpixiContentPage
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
            else if (current_url.StartsWith("ixian:chatreply:", StringComparison.Ordinal))
            {
                // M1 reply-to. Grammar: ixian:chatreply:<reply-id-hex>:<url-encoded text>.
                // ★ No prefix collision with "ixian:chat:" — the character after "chat"
                // is 'r', not ':'. The shell only ever emits this behind the `reply`
                // capability, which is OFF until a 2-device test passes.
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
                bool requestRemoved = FriendList.removeFriend(friend);
                if (requestRemoved)
                {
                    SChatPrefs.setFavorite(friend.walletAddress.ToString(), false);   // CH4: the preference leaves with the record
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
            loadMessages();
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
            string? chat_avatar = IxianHandler.localStorage.getAvatarPath(friend.walletAddress.ToString());
            if (chat_avatar == null)
            {
                chat_avatar = friend.type == FriendType.Group ? "img/spixi-group-avatar.png" : "img/spixiavatar.png";
            }
            Utils.sendUiCommand(this, "setAvatar", Utils.imageToDataUri(chat_avatar));

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
            Utils.sendUiCommand(this, "setCaps", "tipResult,composeSend,composeRequest,payRequest");
            /* ★ M1 REPLY-TO (#441/#448) — THE SHELL IS BUILT, THE CARRIER IS NOT.
             * The whole FE surface (quote bubble, composer strip, menu action, jump,
             * group @-mention prefill) is in place and the `ixian:chatreply:` verb is
             * wired — but the protocol field lives in Ixian-Core, which is HELD OUT of
             * this batch for the BE cutover. Until that lands, a reply degrades to a
             * plain message.
             * ⚠ So do NOT add ",reply" here yet: it would render a Reply action that
             * silently drops the quote. The order is (1) land the Core patch in
             * docs/be-cutover-ixian-core-reply-carrier.md, (2) restore the two seams
             * marked "THE SEAM" in this file, (3) add ",reply", (4) run the 2-device
             * checklist, and only then ship it un-gated. */

            warningDisplayed = false;
            unreadIndicatorDisplayed = false;
            setNickname = "";
            setOnlineStatus = false;
            lastGroupCountPushed = null;   // N22: a WebView reload resets identity.sub — re-arm the count push
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

            /* ★ M1 REPLY-TO — THE CARRIER IS NOT HERE. Damir, 2026-08-20.
             *
             * The reply reference lives in Ixian-Core (`ChatStreamMessage.ReplyToId` +
             * `FriendMessage.replyToId`), and Core is HELD OUT of this batch to be landed
             * with the BE engineer at cutover — see
             * `docs/be-cutover-ixian-core-reply-carrier.md`, which holds the exact patch.
             *
             * So this send is EXACTLY the pre-batch send: `SpixiMessageCode.chat`, a raw
             * UTF-8 body, through `sendChatMessage`. ⚠ It deliberately does NOT use
             * `sendChatStreamMessage`: stock Core passes a NULL StreamMessage id there
             * (cutover ask 2), so the envelope id and the record id would disagree and
             * every delivery and read tick would be lost.
             *
             * `reply_to_id_hex` is parsed and validated so the SEAM is exercised and the
             * cutover diff is small — but with no field to put it in, a reply degrades to
             * a plain message. Nothing can reach this today: the `reply` capability is
             * declared by no `setCaps` call, so the shell cannot create one. */
            if (!string.IsNullOrEmpty(reply_to_id_hex))
            {
                try
                {
                    byte[] parsed = Crypto.stringToHash(reply_to_id_hex);
                    if (parsed == null || parsed.Length == 0 || parsed.Length > CoreConfig.maxMessageIdSize)
                    {
                        Logging.warn("Reply target id is not usable; sending a plain message.");
                    }
                    else
                    {
                        Logging.warn("Reply target received, but the Ixian-Core carrier is not landed yet; sending a plain message. See docs/be-cutover-ixian-core-reply-carrier.md.");
                    }
                }
                catch (Exception)
                {
                    Logging.warn("Reply target id could not be parsed; sending a plain message.");
                }
            }

            SpixiMessage spixi_message = new SpixiMessage(SpixiMessageCode.chat, Encoding.UTF8.GetBytes(str), selectedChannel);
            byte[] spixi_msg_bytes = spixi_message.getBytes();

            // store the message and display it
            FriendMessage friend_message = Node.addMessageWithType(null, FriendMessageType.standard, friend.walletAddress, selectedChannel, str, true, null, 0, true, true, spixi_msg_bytes.Length);

            // Audit NIT-11: addMessageWithType returns null when the friend is gone or the
            // channel is invalid. Transmitting a message that was never stored or shown
            // would leave the peer with something this device has no record of.
            if (friend_message == null)
            {
                Logging.error("Chat message could not be stored — not sending it.");
                return;
            }

            // Finally, clear the input field
            Utils.sendUiCommand(this, "clearInput");

            CoreStreamProcessor.sendChatMessage(friend, friend_message, selectedChannel);
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

                Address? sender_address = null;
                FileTransfer transfer = TransferManager.prepareFileTransfer(fileName, stream, filePath);
                transfer.channel = selectedChannel;
                if (friend.bot || friend.type == FriendType.Group)
                {
                    sender_address = IxianHandler.primaryWalletAddress;
                    transfer.groupAddress = friend.walletAddress;
                }
                Logging.info("File Transfer uid: " + transfer.uid);

                string message_data = string.Format("{0}:{1}", transfer.uid, transfer.fileName);

                // store the message and display it
                FriendMessage friend_message = Node.addMessageWithType(null, FriendMessageType.fileHeader, friend.walletAddress, selectedChannel, message_data, true, sender_address);

                SpixiMessage spixi_message = new SpixiMessage(SpixiMessageCode.fileHeader, transfer.getBytes(), selectedChannel);
                StreamProcessor.sendSpixiMessage(friend, spixi_message, null, friend_message.id);

                friend_message.transferId = transfer.uid;
                friend_message.filePath = transfer.filePath;

                IxianHandler.localStorage.requestWriteMessages(friend.walletAddress, selectedChannel);
            }
            catch (Exception ex)
            {
                Logging.error("Exception choosing file: " + ex.ToString());
            }
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
                if (friend.metaData.botInfo.hideParticipantAddresses)
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
                updateFile(ft.uid, "0", false);
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
                     * and takes the process down on Android and iOS (:1481).
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
                            StreamProcessor.sendMsgDelete(friend, msg_id, selectedChannel);
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
                    StreamProcessor.sendMsgDelete(friend, msg_id, selectedChannel);
                    if (!friend.bot)
                    {
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
                        updateReactions(msg_id, selectedChannel);
                        StreamProcessor.sendReaction(friend, msg_id, "like:", selectedChannel);
                    }
                    break;
            }
        }

        private void onEntryCompleted(object sender, EventArgs e)
        {

        }

        public void loadApps()
        {
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

        public void loadMessages()
        {
            int want = (int)messagesToShow;
            /* One row MORE than wanted: finding it is the only honest proof that older history
             * exists. The baseline asked for exactly `want` and offered "show older" whenever it
             * got that many — so a chat of exactly 50 messages showed a pill that loaded nothing. */
            int window = want + 1;
            bool exhausted = false;
            List<FriendMessage>? messages = null;
            for (int pass = 0; pass < LOAD_WINDOW_MAX_PASSES; pass++)
            {
                if (window == 100)
                {
                    window++;   // D-18 (#354): exactly 100 returns Core's STALE cache instead of reading storage
                }
                messages = friend.getMessages(selectedChannel, window);
                if (messages == null || messages.Count == 0)
                {
                    break;
                }
                int visibleNow;
                lock (messages)
                {
                    visibleNow = messages.Count(m => !rendersNothing(m));
                    exhausted = messages.Count < window;
                }
                if (visibleNow > want || exhausted)
                {
                    break;
                }
                window = Math.Max(window * 2, window + (want + 1 - visibleNow));
            }
            if (messages == null
                || messages.Count == 0)
            {
                // iOS-24/25 (#283 review MAJOR-1): a just-wiped history IS this empty state —
                // returning before the clearMessages push left an open conversation rendering
                // deleted messages until re-entered. Tell the WebView to clear first (no
                // load-more). ★ Session P: `messagesDone` ends the burst at once — the emptied
                // log paints on the signal, not on the shell's 250 ms safety timer.
                Utils.sendUiCommand(this, "clearMessages", "false");
                Utils.sendUiCommand(this, "messagesDone");
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
            /* ★ Session P [CDPERF] — TEMPORARY (#802 r12): the BUILD is the window in which the shell's
             * 500 ms first-paint fallback could still fire (it is gated on the peer, and the peer landed
             * at onChatScreenReady, at the top of onLoad). The clock starts BEFORE `lock (messages)`, so
             * `t=` also covers the lock wait and the metadata save inside it — it OVER-measures, which is
             * the safe direction for bounding that window. Read a large `t=` as "the window was wide",
             * not as "serialization is slow". Measure before anyone dials the timeout (#294). */
            System.Diagnostics.Stopwatch buildClock = System.Diagnostics.Stopwatch.StartNew();
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
                if (friend.metaData.unreadMessageCount > 0)
                {
                    friend.metaData.unreadMessageCount = 0;
                    friend.saveMetaData();
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
                lastLoadPushed = 0;   // ★ Session I [CDPERF]
                foreach (FriendMessage message in messages)
                {
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
                Utils.sendUiCommand(this, "clearMessages", show_more);
                if (json != null)
                {
                    cdperf("batch", "n=" + batch.items.Count + " json=" + json.Length + " t=" + buildClock.ElapsedMilliseconds);   // ★ Session P [CDPERF] — TEMPORARY
                    Utils.sendUiCommand(this, "addMessages", json, "append");
                }
                Utils.sendUiCommand(this, "messagesDone");
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

        /** ★ Session P: `batch` != null → every row push lands in the batch instead of the
         *  wire (the load burst). The read-status side effect and the setContactStatus push
         *  to HOME are untouched either way. */
        private void insertMessage(FriendMessage message, int channel, UiBatch? batch)
        {
            if(channel != selectedChannel)
            {
                return;
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
                    /* ⚠ NO deliveryTicks HERE, and the first cut of this row put one in.
                     * The shell's addFile handler NAMES its sent/read parameters and then
                     * DISCARDS them — upsertFile never assigns a status, so a file card has
                     * no delivery tick to correct. Deriving values nothing reads is dead code
                     * carrying a false guarantee, which is worse than the gap it hides.
                     * ★ THE REAL GAP, logged not faked: a file card in a group shows no
                     * delivery state at all. Same for the app card and the payment cards.
                     * That is its own row — it needs a shell change, not a C# one. */
                    push(batch, "addFile", Crypto.hashToString(message.id), address, nick, avatar, uid, name, message.timestamp.ToString(), message.localSender.ToString(), message.confirmed.ToString(), message.read.ToString(), progress, message.completed.ToString(), paid.ToString());
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
                // Normal chat message
                // Call webview methods on the main UI thread only
                // D-5/N26 (#366): trailing `relation` arg — ADDITIVE (an older shell
                // ignores extras; a missing arg reads as undefined → 'none' FE-side).
                /* M1 reply-to: trailing arg, ADDITIVE (an older shell ignores extras; a
                   missing arg reads as undefined → no quote). Hex, never raw bytes; the
                   shell resolves it against its own loaded rows and degrades to a generic
                   quote label when the original is outside the window.
                   ★ THE SEAM. `FriendMessage.replyToId` lives in Ixian-Core, which is held
                   out of this batch for the BE cutover — so this is always empty and no
                   quote ever renders. The arg is pushed anyway so the shell contract, its
                   signature and its pins all stay in place and the cutover is ONE line:
                       message.replyToId != null && message.replyToId.Length > 0
                           ? Crypto.hashToString(message.replyToId) : ""
                   See docs/be-cutover-ixian-core-reply-carrier.md. */
                string reply_to = "";
                // ★★ L2 (#641): the group answer is DERIVED — see deliveryTicks.
                deliveryTicks(message, out bool sSent, out bool sConfirmed, out bool sRead);
                push(batch, prefix, Crypto.hashToString(message.id), address, nick, avatar, message.message, message.timestamp.ToString(), sSent.ToString(), sConfirmed.ToString(), sRead.ToString(), paid.ToString(), message.errorSending.ToString(), relation, reply_to);
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
                if(message.message == "" || declinedLocally)
                {
                    if(message.type == FriendMessageType.voiceCallEnd || !VoIPManager.hasSession(message.id))
                    {
                        declined = true;
                        if (declinedLocally)
                        {
                            // The user saw the call and answered it with a decline. Same
                            // wording on both sides: this device turned the call down.
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
                push(batch, "addCall", Crypto.hashToString(message.id), text, declined.ToString(), message.timestamp.ToString(), message.localSender.ToString(), (declined && !message.localSender).ToString(), duration_secs, declinedLocally.ToString(), callActive.ToString());
            }

            updateMessageReadStatus(message, channel);
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
            }
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
            if (channel == selectedChannel)
            {
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
            if (message.type != FriendMessageType.standard)
            {
                return;
            }

            bool paid = false;
            if(message.transactionId != "")
            {
                paid = true;
            }
            // ★★ L2 (#641): the group answer is DERIVED — see deliveryTicks.
            deliveryTicks(message, out bool tSent, out bool tConfirmed, out bool tRead);
            Utils.sendUiCommand(this, "updateMessage", Crypto.hashToString(message.id), message.message, tSent.ToString(), tConfirmed.ToString(), tRead.ToString(), paid.ToString(), message.errorSending.ToString());
        }

        public void updateFile(string uid, string progress, bool complete)
        {
            Utils.sendUiCommand(this, "updateFile", uid, progress, complete.ToString());
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
                    if (friend.online)
                    {
                        if (setOnlineStatus == false)
                        {
                            Utils.sendUiCommand(this, "setOnlineStatus", SpixiLocalization._SL("chat-online"));
                            setOnlineStatus = true;
                        }
                    }
                    else if (setOnlineStatus == true)
                    {
                        Utils.sendUiCommand(this, "setOnlineStatus", SpixiLocalization._SL("chat-offline"));
                        setOnlineStatus = false;
                    }

                    if (_waitingForContactConfirmation)
                    {
                        _waitingForContactConfirmation = false;
                        Utils.sendUiCommand(this, "showRequestSentModal", "0");
                        // #275 review A4: the sub-line still reads "Waiting for response" and
                        // the OFFLINE accept pushes no presence above (setOnlineStatus is
                        // false) — clear it explicitly. The online case already pushed
                        // chat-online this same tick.
                        if (!friend.online)
                        {
                            Utils.sendUiCommand(this, "setOnlineStatus", SpixiLocalization._SL("chat-offline"));
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