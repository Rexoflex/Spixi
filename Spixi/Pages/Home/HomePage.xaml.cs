using IXICore;
using IXICore.Activity;
using IXICore.SpixiBot;   // ★ MUTE-UX: SpixiBotActionCode for the group/bot mute action
using IXICore.Meta;
using IXICore.Network;
using IXICore.Streaming;
using IXICore.Streaming.Models;
using IXICore.Utils;
using Microsoft.Maui;
using Microsoft.Maui.ApplicationModel;
using Microsoft.Maui.ApplicationModel.DataTransfer;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using Microsoft.Maui.Devices;
using Microsoft.Maui.Storage;
using Spixi;
using SPIXI.Interfaces;   // #265: SpixiImageData (the in-shell group-avatar pick)
using SPIXI.Lang;
using SPIXI.Meta;
using SPIXI.MiniApps;
using SPIXI.VoIP;   // #265: the missed-call excerpt derivation uses VoIPManager.hasSession
using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

namespace SPIXI
{
    [XamlCompilation(XamlCompilationOptions.Compile)]
    public partial class HomePage : SpixiContentPage
    {
        private static HomePage? _singletonInstance;

        private SpixiContentPage? detailContent = null;
        private SpixiContentPage defaultDetailContent = new EmptyDetail();

        private object refreshLock = new object();

        public static HomePage Instance(bool force_new = false)
        {
            if (force_new)
            {
                if (_singletonInstance != null)
                {
                    _singletonInstance.stop();
                    _singletonInstance = null;
                }
            }
            if (_singletonInstance == null
                || !_singletonInstance.running)
            {
                _singletonInstance = new HomePage();
            }
            return _singletonInstance;
        }

        /* AND-1 (#329, first Android run 2026-08-11): READ-ONLY accessor — returns
         * the existing instance or null, NEVER constructs. Instance() constructing
         * on first touch is correct only for the App-start assignment (App.xaml.cs,
         * wallet present + decrypted); every caller that merely pokes the LIVE page
         * must use this instead. The Android boot fired RequestedThemeChanged →
         * reloadAllPages → Instance() → HomePage ctor → Node.start() on a
         * WALLET-LESS install → the getWalletStorage NRE storm over the onboarding
         * carousel (fatal dialog + 1 Hz TransactionInclusion re-throws). Latent on
         * every platform; Android's boot-time theme event was the first to fire it. */
        public static HomePage? InstanceOrNull()
        {
            return _singletonInstance;
        }

        private ushort transactionFilter = 0; // 0-All 1-Sent 2-Received

        private string currentTab = "tab1";
        // #285 one-shot: set by reloadShell() so the reloaded shell's boot-time
        // ixian:tab:tab1 (shell Fix #8) does not run the #240 overlay-exit sweep
        // and tear down the settings pane the language pick lives in.
        private bool suppressNextTabOverlayExit = false;
        // #288 review (break-my-verdict): epochs reloadShell so a belt started by an
        // EARLIER reload cannot clear a suppression flag armed by a LATER one.
        private int reloadShellGen = 0;
        // PERF (Damir F5 2026-08-13: "apps performance ... always reloads some images,
        // flickers"): tab3 used to force loadApps(true), so EVERY switch to Apps re-pushed
        // clearApps + addApp×N — each addApp carrying a ~240 KB data-URI icon — and
        // reloadScreen()'d every live chat page, for a list that had not changed. This
        // latch keeps the FIRST entry into a fresh shell forcing (nothing has been fed to
        // that document yet); afterwards the normal shouldRefreshApps gate decides.
        // Reset in onLoaded() — a new document knows nothing about the old one's rows.
        //
        // #340 audit (C-MAJOR-1/2): the forced push per tab3 entry was ALSO the self-heal for
        // every "shell rows and C# disagree" state, and this latch removed it — so a lost or
        // interleaved push is now permanent for the session instead of transient. Three
        // hardenings, all in this file: (a) reset on the DOCUMENT dying (reload/reloadShell)
        // as well as on the new one announcing itself via onLoaded — ixian:onload is a known
        // racy handshake on WinUI, and apps was the one surface with no other recovery;
        // (b) the flag is set AFTER the push loop, not before, so a push that never lands
        // cannot latch; (c) volatile + appsPushLock, because loadApps runs on the UI thread
        // (tab entry) AND on Node.updateUILoop's thread-pool tick (updateScreen) with no
        // marshalling — two interleaved runs let one run's clearApps drop rows the other had
        // already delivered, and the latch then made that short list stick.
        private volatile bool appsPushedToShell = false;
        private readonly object appsPushLock = new object();
        // ★ #46 loop m14: the wallet flush needs the SAME serialization loadApps got after
        // #340, for the same reason. loadTransactions runs on the UI thread (a filter tap,
        // tab entry) AND on Node.updateUILoop's thread-pool tick, with no marshalling. Two
        // interleaved runs let one run's clearPaymentActivity drop rows the other had
        // already delivered, and — new since #506③ — let the FIRST run's
        // clearPaymentActivityDone open the zero gate in the middle of the second run's
        // burst. open() also cancels the shell's 400 ms quiet-window belt, which used to
        // cover exactly this case, so the empty state paints over a populated wallet.
        // Dedicated lock, like appsPushLock, to stay out of the chats/contacts lock order.
        //
        // ★ ROUND 2 — THE LOCK ALONE TRADED A RACE FOR A FREEZE, AND THE FREEZE IS WORSE.
        // loadApps holds this lock over a BOUNDED body: the installed-app count.
        // loadTransactions holds it over an UNBOUNDED one: getActivitiesBySeedHashAndType
        // with count 0 reads the whole activity history, and each row then costs one
        // getActivityById under Ixian-Core's storage lock. The tick runs that scan on
        // Node.updateUILoop's pool thread every 2 s. A user who taps the Wallet tab or a
        // filter chip used to run the same scan ON THE UI THREAD, and with the lock added
        // they also waited for the tick's scan first. That is a visible freeze on the tap.
        // The fix is not a smaller lock. loadTransactions must simply never run on the UI
        // thread — see the dispatch at the top of the method. The lock then costs the UI
        // thread nothing, because the UI thread no longer takes it.
        // ⚠ NOTE FOR WHOEVER REVIVES SPLIT VIEW: detailContent.updateScreen() is called
        // inside BOTH appsPushLock and txPushLock. detailContent is dead today — it is
        // only ever assigned null (:37, :3543) — so the call is unreachable and the two
        // locks cannot interact. The instant a split view assigns it, one detail page that
        // calls back into loadApps and loadTransactions inverts the two lock orders and
        // deadlocks the tick against a tap. Do not build for it now. Do read this first.
        private readonly object txPushLock = new object();
        private bool hideBalance = false;

        private bool running = false;

        private bool fromSettings = false;
        private static int excerptDiagLogged = 0;   // ★ review MINOR-5: the [EXCERPTDIAG] cap (12 lines/process)
        private bool fromChat = false;
        // AND-29 (#336): true while a WebView-internal home takeover (contacts/new-chat,
        // wallet Receive/Send) is open — pushed by the shell via ixian:homeoverlay so
        // hardware back closes it instead of exiting the app.
        private bool homeShellOverlayOpen = false;
        /* ★ L6 review MAJOR-2: the same push now carries a LEVEL, and 2 means a
         * FULL-SHELL TAKEOVER (contacts, wallet Receive/Send) rather than a sheet.
         * It exists for systemBarSurfaceColorString below: a takeover is an opaque
         * --surface-screen cover from y=0, and this page otherwise paints the status
         * bar with the WALLET HERO colour whenever currentTab is tab2. */
        private bool homeShellTakeoverOpen = false;

        // D1 (#240): native resizable left pane. The boundary sits between two
        // ISOLATED WebViews (#221 model), so the divider must be native — a thin
        // pan-grip at the right edge of column 0 resizes the chats/list pane
        // against the detail pane. Demo grammar (desktop-split-spec §1): 280–520,
        // double-click resets; width persisted across restarts.
        private const double leftPaneMinWidth = 280;
        private const double leftPaneMaxWidth = 624;   // #243: 520 + 20% (Damir)
        private const double leftPaneDefaultWidth = 400;
        // #245: the home shell's desktop nav rail is 72 CSS px (#237 r2 dial); CSS px
        // == DIPs in the WebView at default zoom, so the Account peer-pane insets by
        // this much to keep the rail visible. Single source C#-side; if the rail is
        // ever re-dialed in bottomnav.css, update BOTH (flagged in the spec).
        private const double railWidthDip = 72;
        private double leftPaneWidth = leftPaneDefaultWidth;
        private double panStartPaneWidth = leftPaneDefaultWidth;

        /* Unit 6 (#247): chat-info as an integrated desktop PANE — a ContactDetails
         * overlay (its OWN WebView, shell side of the #221 wall) pinned to mainGrid
         * col 2 BESIDE the open conversation. Coordination is C#-only: the
         * conversation emits ixian:details, this page hosts/closes the pane. */
        private const double infoPaneWidth = 360;      // Damir dial
        private const double infoPaneMinWidth = 280;   // below this the pane closes/degrades
        private const double detailMinWidth = 320;     // conversation keeps at least this
        private bool infoPaneCol2Pending = false;      // set at push, consumed at present
        private bool infoPaneCol2Open = false;         // col 2 currently expanded
        private bool paneDividerPanning = false;

        public bool devMode = false;

        // ★ Loop r1 (#357 r2): volatile like appsPushedToShell one screen up — written on the UI
        // thread (onLoaded, reload, reloadShell), read+written on Node.updateUILoop's pool tick.
        private volatile bool warningDisplayed = false;
        private int connectivityWarningDelayCounter = 0;

        /* ★ N70 (#402): the update notice never appeared when the app STARTED OFFLINE.
         * UpdateVerify checks once at start and then sleeps its whole period
         * (Config.cs:47 — one hour), so a session that began with no network showed
         * nothing until that hour elapsed or the app was restarted. Inherited
         * behaviour; #383 is what made it visible.
         * `sawOffline` is the EDGE detector — `warningDisplayed` is not, because the
         * offline state is only DISPLAYED after a delay cycle, so a short outage sets no
         * flag while still leaving the version answer stale. One re-arm per session. */
        private bool sawOffline = false;
        private bool updateCheckRearmed = false;

        /* #440/#443/#451: blockchain-scan progress.
         *
         * `scanOriginBlock` is where the CURRENT catch-up started. ★ #451, Damir on
         * device: it used to be the first height each RUN observed, so closing the app at
         * 6% and reopening it showed 0% again — the scan had genuinely kept its place
         * (TransactionInclusion resumes from the highest stored header) and only the BAR
         * forgot. It measured "how far since I opened the app" instead of "how far
         * through this catch-up". So it is PERSISTED now, and it belongs to the catch-up,
         * not to the session: written when we first fall behind, kept across restarts,
         * and CLEARED once we are current so the next real gap starts from zero again.
         *
         * The two `last` fields make the 1 Hz push change-only. */
        private const string SCAN_ORIGIN_PREF = "scanOriginBlock";
        // Matches the shell's HIDE_LAG, so the anchor lives exactly as long as the strip
        // can be visible. Kept in both places on purpose — the shell must work against an
        // exe that does not send this at all.
        private const ulong SCAN_CURRENT_LAG = 2;
        /* ★ F6 (2026-08-22, Damir on device: "the scan row appears and disappears at
         * random"). How far BELOW our own height a reported network target may sit before we
         * stop believing it. Being genuinely a block or two ahead of the peer majority is
         * normal; being 700 000 ahead is not — see the SCANDIAG evidence in
         * docs/f5-verdict-2026-08-22.md §3. 16 is far outside the legitimate range and far
         * inside the observed garbage. */
        private const ulong SCAN_TARGET_STALE_MARGIN = 16;
        private bool scanOriginLoaded = false;
        private ulong scanOriginBlock = 0;
        private ulong lastScanCurrent = ulong.MaxValue;
        private ulong lastScanTarget = ulong.MaxValue;
        /* #456: read once per process. A wallet GENERATED on this device has no history
         * behind it, so the shell may suppress the scan row while that wallet is also
         * empty and unfunded — "checking for your transactions" is noise when there is
         * provably nothing to check for. See the LaunchPage create/restore sites for why
         * this preference has to exist: nothing else in the app can tell a new wallet
         * from a restored one. */
        private bool walletCreatedHere = Preferences.Default.Get("walletCreatedHere", "") == "1";

        // Interal cache object to store contact status items
        private struct contactStatusCacheItem
        {
            public Address address;
            public bool online;
            public int unread;
            public string excerpt;
            public long timestamp;
        }
        private static List<contactStatusCacheItem> contactStatusCache = new List<contactStatusCacheItem>();
        private HomePage()
        {
            Node.preStart();

            InitializeComponent();
            NavigationPage.SetHasBackButton(this, false);
            NavigationPage.SetHasNavigationBar(this, false);
            this.Title = "Spixi";
            webView.Opacity = 0;

            // #225: HomePage hosts the redesigned screens as flicker-free OVERLAYS
            // (own WebView each — SECURITY.md §1 intact) instead of pushed pages.
            setOverlayHost(this);

            devMode = Preferences.Default.Get("devMode", false);

            hideBalance = (bool)Preferences.Default.Get("hidebalance", false);
            SpixiLocalization.addCustomString("miniAppsStartNoteHidden", Preferences.Default.Get("miniAppsStartNoteHidden", false) ? "true" : "false");
            SpixiLocalization.addCustomString("devMode", devMode ? "true" : "false");
            SpixiLocalization.addCustomString("hourCycle", Utils.deviceHourCycle());   // ★ Session I: the device's 12/24-hour setting reaches every generated document
            SpixiLocalization.addCustomString("apps-not-sure-text", string.Format(SpixiLocalization.getLocalizedString("apps-not-sure-text"), Config.spixiAppsUrl));

            loadPage(webView, "index.html");

            rightContent.Content = defaultDetailContent.Content;

            // D1 (#240): divider gestures + persisted pane width. The grip is a
            // native BoxView pinned to column 0's trailing edge (HomePage.xaml) —
            // it never overlaps the column-1 overlays (chat/Account panes), and a
            // full-span overlay/lock stage is added AFTER it, so a takeover or an
            // in-place lock always covers the grip (#230 ordering intact).
            leftPaneWidth = clampLeftPaneWidth(Preferences.Default.Get("leftPaneWidth", leftPaneDefaultWidth));
            var dividerPan = new PanGestureRecognizer();
            dividerPan.PanUpdated += onPaneDividerPan;
            paneDivider.GestureRecognizers.Add(dividerPan);
            var dividerReset = new TapGestureRecognizer { NumberOfTapsRequired = 2 };
            dividerReset.Tapped += (s, ev) =>
            {
                leftPaneWidth = leftPaneDefaultWidth;
                applyLeftPaneWidth();
                Preferences.Default.Set("leftPaneWidth", leftPaneWidth);
            };
            paneDivider.GestureRecognizers.Add(dividerReset);

#if WINDOWS
            // #242 (Damir F5: "no cursor change, hard to catch"): give the grip the
            // ↔ resize cursor. MAUI has no cross-platform cursor API; on WinUI the
            // cursor lives on UIElement.ProtectedCursor (protected → reflection, the
            // established WinUI-3 workaround). Presentation-only; try/catch so a
            // WinAppSDK rename can never take the app down.
            paneDivider.HandlerChanged += (s, ev) =>
            {
                try
                {
                    if (paneDivider.Handler?.PlatformView is Microsoft.UI.Xaml.UIElement el)
                    {
                        var prop = typeof(Microsoft.UI.Xaml.UIElement).GetProperty(
                            "ProtectedCursor",
                            System.Reflection.BindingFlags.Instance
                            | System.Reflection.BindingFlags.NonPublic
                            | System.Reflection.BindingFlags.Public);
                        prop?.SetValue(el, Microsoft.UI.Input.InputSystemCursor.Create(
                            Microsoft.UI.Input.InputSystemCursorShape.SizeWestEast));
                    }
                }
                catch (Exception ex)
                {
                    Logging.warn("paneDivider cursor: " + ex.Message);
                }
            };
#endif

            SizeChanged += OnPageSizeChanged;

            if (!running)
            {
                running = true;

                /* ★ D-9 (Damir, 2026-08-15): A CRASH THAT COULD NOT ANNOUNCE ITSELF.
                 * He restarted after a delete-account and got a BLACK SCREEN — no error,
                 * no dialog, nothing. The debugger caught an unhandled exception in this
                 * lambda, with Spixi.WinUI.App.InitializeComponent still on the stack.
                 * The catches below are total, so the ONLY way an exception escapes is if
                 * the REPORTING throws: displaySpixiAlert hosts on
                 * Application.Current.MainPage, and this runs while MainPage is still
                 * being assigned. On WinUI a ContentDialog with no usable XamlRoot throws.
                 * So the error path died while describing the error.
                 * Rules now: LOG FIRST — the log is the only channel guaranteed to work —
                 * and never let the alert take the process down with it.
                 * ⚠ This does NOT fix the underlying start failure. That is D-6: an
                 * account wipe leaves the wallet behind, so startup skips the launch page
                 * and comes straight here to a HomePage whose account data is gone. This
                 * only guarantees that any future start failure is VISIBLE. */
                Task.Run(async () =>
                {
                    try
                    {
                        /* ★★ #46 loop O (L11 F1) — A FALSE "Fatal exception" ON A LANGUAGE
                         * CHANGE. Damir, F5 2026-08-29: a native "Fatal exception" dialog,
                         * then a blank dark screen, after he changed the language back to
                         * English. `Node.start()` (Node.cs:215) returns false for TWO
                         * different things: "the node is already running", and a real start
                         * failure. This block treated both as fatal and returned BEFORE
                         * `Node.connectToNetwork()`.
                         *
                         * `running` in HomePage is an INSTANCE field, and a language change
                         * builds a SECOND HomePage (Instance() rebuilds when the singleton is
                         * null or not running). So this block re-enters on an already-running
                         * node.
                         *
                         * ★★ ROUND 2 (review-cs MAJOR-1) — `Node.isRunning` ALONE IS NOT THE
                         * SIGNAL, AND ROUND 1 COULD HAVE HIDDEN A REAL FAILURE.
                         * `Node.start()` assigns `running = true` at Node.cs:307, nine lines
                         * BEFORE its first failure return at Node.cs:316, and no failure path
                         * clears it. So a genuinely FAILED start leaves `running == true`.
                         * The next HomePage would read that as "already running", show no
                         * dialog and start nothing: the app boots on a dead node in silence.
                         * That state is not hypothetical — App.xaml.cs:1373-1378 records it
                         * from a real device log (fatalexception.txt, 2026-08-24 12:28:00).
                         *
                         * ★★ ROUND 3 (review3-cs MAJOR-1) — ROUND 2 PUT THE SECOND TERM ON
                         * THE WRONG SIDE OF THE THROW SITE, AND THIS COMMENT SAID SO IN
                         * WORDS THAT WERE NOT TRUE. It claimed `startCounter` was
                         * incremented "past the wallet read". It was not: `startCounter++`
                         * sat ABOVE `SPushService.initialize()`, above the wallet read and
                         * above the unfenced `SPushService.setTag()`. The wallet read is the
                         * exact statement the device log names as the zombie's throw site,
                         * so the state this test was added to EXCLUDE satisfied both terms,
                         * and the app booted silently onto a node that never connected.
                         * `EnsureNodeRunning` could not repair it either: the status is
                         * `warmUp`, not `stopped`, so App.xaml.cs:1404 falls to "Node is
                         * already running".
                         *
                         * `Node.start()` now increments `startCounter` as its LAST statement
                         * before `return true` (Node.cs). So the term means what it always
                         * claimed to mean: a start COMPLETED at least once this
                         * process-life. App.xaml.cs:1399 asks the same question the same way.
                         *
                         * ★★ AND A COMPLETED START IS NOT A CONNECTED NODE. `Node.start()`
                         * never calls `connectToNetwork()`; all three callers of start() make
                         * that call themselves (App.xaml.cs:381, App.xaml.cs:1426 and :402
                         * below). A throw inside that step leaves `running == true` and
                         * `startCounter > 0` on a node that never reached the network — the
                         * same silent boot, one door further along. `Node.connectCounter`
                         * (Node.cs) is incremented by the last statement of
                         * `connectToNetwork()`, so the three terms together answer
                         * "is this node up AND did this process connect it":
                         *   · running && startCounter > 0 && connectCounter > 0 → a healthy
                         *     node. Not a failure.
                         *   · running && (startCounter == 0 || connectCounter == 0) → the
                         *     half-started node. Fall through: Node.start() answers false
                         *     ("already running") and the fatal dialog is shown, which is
                         *     honest — the user is told, instead of being handed a dead app.
                         *   · !running → the node was stopped. Fall through and start it
                         *     again; a stale connectCounter cannot be read, because
                         *     `isRunning` gates it.
                         * ⚠ WHY THE ZOMBIE ARM ONLY REPORTS AND DOES NOT REPAIR. Repairing
                         * it means stopping a half-started node and starting it again, over
                         * Ixian-Core services that are FROZEN at 097341a and absent from this
                         * checkout, and `Node.stop()` itself early-returns on `!running`.
                         * That is BE row CORE-6. Until it is answered the honest act is to
                         * say so, not to guess.
                         *
                         * ★★ ROUND 2 (review-cs MAJOR-2) — WHY connectToNetwork() IS STILL
                         * NOT CALLED ON THE ALREADY-RUNNING ARM. Verified at source, because
                         * the review claimed the tree answers this in the opposite direction:
                         *   · App.xaml.cs:1404-1427 and App.xaml.cs:360-381 both call
                         *     `Node.connectToNetwork()` ONLY after a successful `Node.start()`
                         *     on a node whose status was `stopped` or `stopping`.
                         *   · No site in this tree calls `connectToNetwork()` on a node that
                         *     is already running. There is no precedent to follow.
                         *   · `Node.connectToNetwork` (Node.cs:385) calls
                         *     `StreamClientManager.start()` and `NetworkClientManager.start(2)`.
                         *     Both live in Ixian-Core, which is FROZEN at 097341a and is not
                         *     in this checkout, so "is a second start() safe" cannot be
                         *     answered here. That is BE row CORE-5.
                         * ⚠ AND THE OLD COMMENT'S DIAGNOSIS IS WITHDRAWN. It said the
                         * skipped connectToNetwork() left the stream session down, and that
                         * this caused the decrypt and SpixiMessage parse errors in the log.
                         * Nothing in this tree shows a HomePage rebuild dropping the stream
                         * session; the node keeps running and nothing disconnects it. The
                         * cause of that error storm is NOT established here. Do not re-open
                         * this arm on the strength of that sentence. */
                        if (Node.isRunning && Node.startCounter > 0 && Node.connectCounter > 0)
                        {
                            Logging.info("HomePage start block re-entered on a running, started and connected node — not a failure.");
                        }
                        else if (!Node.start())
                        {
                            Logging.error("Node.start() returned false. isRunning={0} startCounter={1} connectCounter={2}",
                                Node.isRunning, Node.startCounter, Node.connectCounter);
                            await safeFatalAlert("Fatal exception", "Fatal exception has occurred, please send the log files to the developers.");
                            return;
                        }
                        else
                        {
                            Node.connectToNetwork();
                        }
                    }
                    catch (IOException e)
                    {
                        Logging.error("Fatal IO error has occurred: " + e);
                        string ioErrorMessage = "Fatal error has occurred. This may be due to insufficient disk space. Please check your device storage and send the log files to the developers.\n\nError: " + e.Message;
                        await safeFatalAlert("Fatal Exception", ioErrorMessage);
                    }
                    catch (Exception e)
                    {
                        Logging.error("Fatal error has occurred: " + e);
                        await safeFatalAlert("Fatal Exception", "Fatal error has occurred. Please send the log files to the developers.\n\nError: " + e.Message);
                    }
                });
            }
        }

        /* ★ D-9: an alert that cannot be presented must not kill the process.
         * The message is already in the log by the time this runs, so a swallowed
         * presentation failure loses nothing — while an unhandled one loses everything,
         * because it takes the app down to a black screen with no explanation. */
        private async Task safeFatalAlert(string title, string body)
        {
            try
            {
                await displaySpixiAlert(title, body, "OK");
            }
            catch (Exception alertEx)
            {
                Logging.error("Could not present the fatal-error alert (the app is likely still starting): " + alertEx);
            }
        }

        private void OnPageSizeChanged(object? sender, EventArgs? e)
        {
            if (Width < 700)
            {
                // Show only main pane
                mainGrid.ColumnDefinitions[0].Width = GridLength.Star;
                //mainGrid.ColumnDefinitions[1].Width = new GridLength(0);
                mainGrid.ColumnDefinitions[1].Width = new GridLength(0);
                mainGrid.ColumnDefinitions[2].Width = new GridLength(0);   // #247 info pane
                rightContent.IsVisible = false;
                paneDivider.IsVisible = false;   // D1: no divider in single-pane
                removeDetailContent(false);
                // #225-M2: column-pinned overlays (chat col 1, info col 2) would strand
                // invisible-but-open in a zero-width column — re-home them full-span
                // (the mobile takeover presentation). Property flips only, no re-attach;
                // infoPaneCol2Open stays set so re-widening restores the pane.
                SpixiContentPage.relayoutPinnedOverlays(false);
            }
            else
            {
                // Show both panes — D1 (#240): column 0 uses the persisted,
                // user-resizable width (was a fixed 400).
                applyLeftPaneWidth();
                //mainGrid.ColumnDefinitions[1].Width = new GridLength(2);
                mainGrid.ColumnDefinitions[1].Width = GridLength.Star;
                rightContent.IsVisible = true;
                paneDivider.IsVisible = true;
                // #247: restore/adjust the info-pane column while its overlay is open;
                // a wide-but-squeezed window closes the pane (honest degrade — the
                // surface is read-only, one tap re-opens it).
                updateInfoPaneWidth();
                // #225-M2: re-pin re-homed overlays back to their columns.
                SpixiContentPage.relayoutPinnedOverlays(true);
            }
        }

        // #247: size (or close) the info-pane column against the current window +
        // left-pane widths. The conversation keeps >= detailMinWidth; the pane gets
        // min(infoPaneWidth, what's left) and closes below infoPaneMinWidth.
        private void updateInfoPaneWidth()
        {
            if (!infoPaneCol2Open)
            {
                return;
            }
            double avail = Width - mainGrid.ColumnDefinitions[0].Width.Value - detailMinWidth;
            if (avail >= infoPaneMinWidth)
            {
                mainGrid.ColumnDefinitions[2].Width = new GridLength(Math.Min(infoPaneWidth, avail));
            }
            else
            {
                closeContactDetailsOverlays();   // collapses col 2 via onOverlayClosed
            }
        }

        /* ————— D1 (#240): native left-pane divider ————————————————————————————
         * Pure presentation: resizes mainGrid column 0 between the two isolated
         * WebViews. No bridge, no page content, no signing paths touched. */

        private double clampLeftPaneWidth(double w)
        {
            if (double.IsNaN(w) || double.IsInfinity(w))
            {
                return leftPaneDefaultWidth;
            }
            double max = leftPaneMaxWidth;
            // #243: the raised max (624) must never starve the detail pane on a
            // just-wide-enough window (at 700px it would leave 76px) — reserve a
            // usable detail width; the ceiling grows with the window.
            if (Width > 0)
            {
                max = Math.Max(leftPaneMinWidth, Math.Min(max, Width - 320));
            }
            return Math.Clamp(w, leftPaneMinWidth, max);
        }

        private void applyLeftPaneWidth()
        {
            // Clamp the APPLIED width only — the user's chosen width (field +
            // preference) survives a temporary window shrink and comes back.
            mainGrid.ColumnDefinitions[0].Width = new GridLength(clampLeftPaneWidth(leftPaneWidth));
        }

        private void onPaneDividerPan(object? sender, PanUpdatedEventArgs e)
        {
            switch (e.StatusType)
            {
                case GestureStatus.Started:
                    panStartPaneWidth = leftPaneWidth;
                    paneDividerPanning = true;
                    break;
                case GestureStatus.Running:
                    // Defensive: WinUI has been seen skipping Started — seed the
                    // anchor from the first Running tick instead of drifting.
                    if (!paneDividerPanning)
                    {
                        panStartPaneWidth = leftPaneWidth;
                        paneDividerPanning = true;
                    }
                    leftPaneWidth = clampLeftPaneWidth(panStartPaneWidth + e.TotalX);
                    applyLeftPaneWidth();
                    updateInfoPaneWidth();   // #247: keep the conversation >= detailMinWidth
                    break;
                case GestureStatus.Completed:
                case GestureStatus.Canceled:
                    paneDividerPanning = false;
                    Preferences.Default.Set("leftPaneWidth", leftPaneWidth);
                    break;
            }
        }

        public void stop()
        {
            running = false;
            _singletonInstance = null;
            removeDetailContent(false);
        }

        private void onNavigating(object sender, WebNavigatingEventArgs e)
        {
            string current_url = HttpUtility.UrlDecode(e.Url);
            e.Cancel = true;

            if (onNavigatingGlobal(current_url))
            {
                e.Cancel = true;
                return;
            }

            if (current_url.Equals("ixian:onload", StringComparison.Ordinal))
            {
                onLoaded();
            }
            else if (current_url.Equals("ixian:wallet", StringComparison.Ordinal))
            {
                // Deprecated
            }
            else if (current_url.Equals("ixian:quickscan", StringComparison.Ordinal))
            {
                quickScan();
                e.Cancel = true;
                return;
            }
            // ★ W5/W6 (#523) — money-compose verbs. StartsWith + trailing colon (the
            // #216 house rule) — placed ABOVE the legacy Contains() branches so a
            // crafted payload embedding their literals cannot hijack a money verb (#393).
            // SPayments owns confirm/auth/sign; nothing money-shaped is parsed here.
            else if (current_url.StartsWith("ixian:signSend:", StringComparison.Ordinal))
            {
                SPayments.handleSignSend(this, current_url.Substring("ixian:signSend:".Length));
            }
            else if (current_url.StartsWith("ixian:feeQuery:", StringComparison.Ordinal))
            {
                SPayments.handleFeeQuery(this, current_url.Substring("ixian:feeQuery:".Length));
            }
            else if (current_url.Equals("ixian:sendScan", StringComparison.Ordinal))
            {
                // #523: scan FROM the send compose — the result must land back in the
                // compose (quickScanResult), never in the legacy send-page route (deleted, ★★ L1 #640).
                quickScanForSend();
            }
            // ★ Batch A (#539–#541): the chats-list DESTRUCTIVE verbs, address-scoped.
            // StartsWith + Ordinal + a trailing colon, ABOVE the legacy Contains() branches
            // (the #216/#393 rule — a crafted payload must not hijack a destructive verb).
            // Bodies live in SContacts and are the SAME ones ContactDetails runs.
            else if (current_url.StartsWith("ixian:removehistory:", StringComparison.Ordinal))
            {
                onRemoveHistoryFor(current_url.Substring("ixian:removehistory:".Length));
            }
            else if (current_url.StartsWith("ixian:removecontact:", StringComparison.Ordinal))
            {
                onRemoveContactFor(current_url.Substring("ixian:removecontact:".Length));
            }
            else if (current_url.StartsWith("ixian:sharedGroups:", StringComparison.Ordinal))
            {
                onSharedGroupsFor(current_url.Substring("ixian:sharedGroups:".Length));
            }
            else if (current_url.StartsWith("ixian:undorequest:", StringComparison.Ordinal))
            {
                onUndoRequestFor(current_url.Substring("ixian:undorequest:".Length));
            }
            /* ⏱ [LANDTAB] — A TEMPORARY PROBE. L14 · #677, Damir 2026-08-28: MEASURE
             * BEFORE BUILDING (#294). Payload is `<consumer>:<ageMs>`, both from a fixed
             * shape — one word out of four, and an integer. NO tab id and NO address ever
             * reach this line, so the handover-gate log rule is kept by construction.
             * ⚠ REMOVE THIS WITH ITS TWO SIBLINGS the way [CDPERF] went (#663): this
             * handler, home.html's emit in consumeLandTab, and the smoke pin holding the
             * trio — one batch, all three, once Damir has taken the measurement. */
            else if (current_url.StartsWith("ixian:landtabprobe:", StringComparison.Ordinal))
            {
                try
                {
                    string[] probe = current_url.Substring("ixian:landtabprobe:".Length).Split(':');
                    string via = probe.Length > 0 ? probe[0] : "";
                    // fixed vocabulary — anything else is logged as "other", never echoed
                    if (via != "storage" && via != "visibility" && via != "focus" && via != "settingsclosed" && via != "handoff")
                    {
                        via = "other";
                    }
                    long ageMs = 0;
                    if (probe.Length > 1)
                    {
                        long.TryParse(probe[1], out ageMs);
                    }
                    IXICore.Meta.Logging.info("[LANDTAB] consumer=" + via + " age=" + ageMs + "ms");
                }
                catch (Exception)
                {
                    Logging.error("ixian:landtabprobe failed (malformed payload)");
                }
                e.Cancel = true;
                return;
            }
            /* ★ Session I — the L14 cover handshake's return leg. home.html sends this at the
             * second rAF after the directory takeover mounted (= on glass). No payload,
             * nothing parsed, nothing echoed. Releases the Account pop SettingsPage deferred
             * on `ixian:handoff`; a no-op when nothing waits. The [PAINTDIAG] handler that
             * stood here (cover/backsend stamps) is retired with its set — it measured the
             * flash this closes (#731). */
            else if (current_url.Equals("ixian:coverpainted", StringComparison.Ordinal))
            {
                SpixiContentPage.coverPainted();
                e.Cancel = true;
                return;
            }
            // ★ L13 (#676): LEAVE A ROOM from the chats-row delete flow — the per-address
            // twin of ContactDetails' page-scoped `ixian:leave`. Same StartsWith + Ordinal
            // + trailing-colon shape as the four verbs above (#216/#393), and placed with
            // them, ABOVE the legacy Contains() branches.
            // ⚠ The colon is what keeps this verb and ContactDetails' `ixian:leave` apart.
            else if (current_url.StartsWith("ixian:leavegroup:", StringComparison.Ordinal))
            {
                onLeaveGroupFor(current_url.Substring("ixian:leavegroup:".Length));
            }
            else if (current_url.Contains("ixian:qrresult:"))
            {
                string[] split = current_url.Split(new string[] { "ixian:qrresult:" }, StringSplitOptions.None);
                string result = split[1];
                processQRResult(result);
                e.Cancel = true;
                return;
            }
            else if (current_url.Contains("ixian:filter:"))
            {
                string[] split = current_url.Split(new string[] { "ixian:filter:" }, StringSplitOptions.None);
                string result = split[1];
                filterTransactions(result);
                e.Cancel = true;
                return;
            }
            else if (current_url.Contains("ixian:balance:"))
            {
                string[] split = current_url.Split(new string[] { "ixian:balance:" }, StringSplitOptions.None);
                if (split.Length > 1)
                {
                    hideBalance = split[1] == "hide";
                }
                Preferences.Default.Set("hidebalance", hideBalance);
                // #288 (Opus #46 review of #284–#287) — MAJOR: the flag was persisted and
                // pushed to NOBODY. On desktop the tx detail is a LIVE overlay pinned to
                // col 1 BESIDE the wallet list (#263, onTransaction), so toggling the eye
                // masked the list while the pane kept rendering amount / fiat / fee /
                // counterparty and the FULL base58 address + copy button, indefinitely.
                // #285 closed hide-THEN-open; this closes open-THEN-hide. Idempotent by
                // construction: the shell's setHideBalance early-returns on an unchanged
                // value, so a redundant push cannot clobber a deliberate per-view reveal.
                foreach (SpixiContentPage p in SpixiContentPage.getOverlayPages())
                {
                    if (p is WalletSentPage)
                    {
                        Utils.sendUiCommand(p, "setHideBalance", hideBalance.ToString());
                    }
                }
                e.Cancel = true;
                return;
            }
            else if (current_url.Equals("ixian:newchat", StringComparison.Ordinal))
            {
                newChat();
            }
            else if (current_url.Equals("ixian:groupreset", StringComparison.Ordinal))
            {
                // #265 (Opus MAJOR-3): the in-shell group SETUP opened — drop any
                // abandoned temp photo from a previous, cancelled attempt so it can
                // never be promoted onto this group (and shipped to its members).
                // Mirrors the legacy picker's delete-on-load (WalletRecipientPage:47).
                clearGroupAvatarTemp();
            }
            else if (current_url.Equals("ixian:groupavatar", StringComparison.Ordinal))
            {
                // #265 (Damir ⑤): the IN-SHELL group setup's avatar picker. Writes the
                // SAME temp file HandlePickSucceeded promotes onto the new group
                // (WalletRecipientPage.temporaryImagePath) — one convention, no new
                // filesystem surface (C# names the path; the WebView never does).
#pragma warning disable CS4014
                onGroupAvatarAsync();
#pragma warning restore CS4014
            }
            else if (current_url.StartsWith("ixian:creategroup:", StringComparison.Ordinal))
            {
                // #265 (Damir ⑤): create the group from the REDESIGNED in-shell flow
                // (contacts picker multi-select → setup sheet). Payload mirrors the
                // legacy WalletRecipientPage `ixian:select:` grammar 1:1 —
                //   ixian:creategroup:<'1'|'0' blind><name>:|<addr>|<addr>…
                // — and feeds the SAME HandlePickSucceeded core (GroupChat.CreateGroup
                // + avatar promotion + createGroup message). No money picker involved.
                string payload = current_url.Substring("ixian:creategroup:".Length);
                string[] parts = payload.Split(new string[] { ":|" }, StringSplitOptions.None);
                if (parts.Length > 1 && parts[0].Length > 1)
                {
                    bool blindMode = parts[0][0] == '1';
                    string groupName = parts[0].Substring(1);
                    List<ExtendedAddress> addresses = new();
                    foreach (string a in parts[1].Split('|'))
                    {
                        if (string.IsNullOrWhiteSpace(a))
                        {
                            continue;
                        }
                        try { addresses.Add(new ExtendedAddress(a)); }
                        catch (Exception ex) { Logging.error("creategroup: bad address: " + ex); }
                    }
                    if (addresses.Count > 1)
                    {
                        HandlePickSucceeded(this, addresses, groupName, blindMode, false);   // in-shell: nothing to pop
                    }
                    else
                    {
                        Logging.error("creategroup: fewer than 2 valid members.");
                    }
                }
            }
            else if (current_url.Equals("ixian:newcontact", StringComparison.Ordinal))
            {
                // Batch C (#256 M8): WIDE → the add-contact form pins to the detail
                // column (the #247 pinned-overlay machinery; presentation-only routing,
                // the page's own verbs/contract untouched). Narrow keeps the full
                // takeover. The shared "formpane" tag makes newcontact ↔ newapp
                // replace each other seamlessly (same-tag swap, like "chat").
                closeContactDetailsOverlays();   // loop B-MINOR-1: the form takes the detail region — no col-1 stacking
                pushPageLoaded(new ContactNewPage(), 4000, "formpane", rightContent.IsVisible ? 1 : -1);   // load-then-move (N3)
            }
            else if (current_url.Equals("ixian:newapp", StringComparison.Ordinal))
            {
                // Batch C (#256 M7): same routing as newcontact above.
                closeContactDetailsOverlays();   // loop B-MINOR-1 (symmetry)
                pushPageLoaded(new AppNewPage(), 4000, "formpane", rightContent.IsVisible ? 1 : -1);   // load-then-move (N3, round 2)
            }
            else if (current_url.StartsWith("ixian:sendrequest:", StringComparison.Ordinal))
            {
                // Q2-⑥ (#268, W8 LANDED): the Receive takeover's "request from a
                // contact" strip. Lifted from the legacy receive page (parse +
                // validate + onRequest; WalletReceivePage, deleted with ★★ L1 #640) —
                // the sanctioned "same page, new
                // host" pattern, minus its popPageAsync (this page must NOT pop).
                // ★ A REQUEST is a chat message (requestFunds), not a payment —
                // nothing is signed here (SECURITY.md).
                //
                // DELIBERATE DEVIATION from the verbatim lift (#268 audit, FIX 4):
                // legacy used Contains(). That was safe only on the legacy receive page,
                // which carries no other data-carrying verbs. On HomePage this
                // branch sits AHEAD of ixian:chat:/details:/chatinfo:/txdetails:/
                // startApp:/appDetails:/uninstall:/acceptRequest: …, so a Contains()
                // match could hijack any payload that ever embedded the literal
                // substring into the money-adjacent handler. Every verb added since
                // #216 uses StartsWith(..., Ordinal); this one now does too. The
                // handler's payload grammar (Split on the prefix, then the legacy
                // '|'-separated addr:amount list) is UNCHANGED.
                onSendRequest(current_url);
            }
            else if (current_url.Equals("ixian:avatar", StringComparison.Ordinal))
            {
                //onChangeAvatarAsync(sender, e);
            }
            else if (current_url.Equals("ixian:settings", StringComparison.Ordinal))
            {
                onSettings(sender, e);
            }
            else if (current_url.Equals("ixian:lock", StringComparison.Ordinal))
            {
                //   prepBackground();
                Navigation.PushAsync(new SetLockPage(), Config.defaultXamarinAnimations);
            }
            else if (current_url.Equals("ixian:activity", StringComparison.Ordinal))
            {
                // TODO show wallet activity screen
            }
            else if (current_url.Equals("ixian:about", StringComparison.Ordinal))
            {
                Browser.Default.OpenAsync(new Uri(Config.aboutUrl));
            }
            else if (current_url.Equals("ixian:guide", StringComparison.Ordinal))
            {
                Browser.Default.OpenAsync(new Uri(Config.guideUrl));
            }
            else if (current_url.Equals("ixian:backup", StringComparison.Ordinal))
            {
                pushPageLoaded(new BackupPage());   // load-then-move (N3, round 2)
            }
            else if (current_url.Equals("ixian:encpass", StringComparison.Ordinal))
            {
                pushPageLoaded(new EncryptionPassword());   // load-then-move (N3, round 2)
            }
            else if (current_url.Contains("ixian:chat:"))
            {
                string[] split = current_url.Split(new string[] { "ixian:chat:" }, StringSplitOptions.None);
                string id = split[1];
                onChat(new Address(id), e);
            }
            else if (current_url.Contains("ixian:details:"))
            {
                string[] split = current_url.Split(new string[] { "ixian:details:" }, StringSplitOptions.None);
                string id = split[1];
                // TODO: handle exceptions

                Friend? friend = FriendList.getFriend(new Address(id));

                if (friend == null)
                {
                    e.Cancel = true;
                    return;
                }

                // #247/#248: contacts DIRECTORY entry → context 'contact' ("Contact
                // details" + Message). wide = pane, narrow = takeover.
                openContactDetails(friend, false, false);
            }
            else if (current_url.StartsWith("ixian:mutechat:", StringComparison.Ordinal))
            {
                /* ★ MUTE-UX (2026-08-22, Damir): mute straight from the chat list — the
                 * long-press menu and the swipe action. The shell has been able to render
                 * both since #67; `capabilities.mute` was false only because there was no
                 * verb behind it, and `onPersist` has carried a comment reserving this exact
                 * slot ever since.
                 *
                 * Payload is `<address>:on|off`. The address is peer-supplied through the
                 * shell, so it is parsed defensively — a malformed one must never throw
                 * inside onNavigating (the A-4 rule).
                 *
                 * Groups and bots keep the SYNCED botInfo mute (and its bot action); a 1:1
                 * uses the local device preference. ContactDetails already routes on exactly
                 * that distinction, so the two entry points cannot disagree. */
                string muteAddr = "";
                Friend? mf = null;
                try
                {
                    string payload = current_url.Substring("ixian:mutechat:".Length);
                    int sep = payload.LastIndexOf(':');
                    if (sep > 0)
                    {
                        muteAddr = payload.Substring(0, sep);
                        /* ⚠ AUDIT MINOR: `Equals("on")` meant ANY unexpected trailing character
                         * — a slash, a fragment, whitespace, a case flip added by a WebView —
                         * silently turned a MUTE request into an UNMUTE, and the echo below then
                         * confirmed it, so the toggle looked like it refused to stick with
                         * nothing in the log. Trimmed and case-insensitive, and an unrecognised
                         * token is REPORTED rather than quietly read as "off". */
                        string verb = payload.Substring(sep + 1).Trim();
                        bool mute = verb.Equals("on", StringComparison.OrdinalIgnoreCase);
                        if (!mute && !verb.Equals("off", StringComparison.OrdinalIgnoreCase))
                        {
                            Logging.warn("ixian:mutechat: unrecognised state '" + verb + "' — treating as unmute");
                        }
                        mf = FriendList.getFriend(new Address(muteAddr));
                        if (mf != null)
                        {
                            if (mf.metaData != null && mf.metaData.botInfo != null)
                            {
                                mf.metaData.botInfo.sendNotification = !mute;
                                mf.saveMetaData();
                                StreamProcessor.sendBotAction(mf, SpixiBotActionCode.enableNotifications, new byte[1] { (byte)(mute ? 0 : 1) }, 0, true);
                            }
                            else
                            {
                                /* ⚠ AUDIT MINOR: write the CANONICAL address, not the token off
                                 * the URL. Every READ uses friend.walletAddress.ToString(), so
                                 * keying the write on the raw token means writing key A and
                                 * reading key B the moment the two ever diverge — the mute would
                                 * silently never take and the echo would snap the row back. */
                                SNotificationPrefs.setContactMuted(mf.walletAddress.ToString(), mute);
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Logging.error("ixian:mutechat failed: " + ex);
                }
                /* ⚠ AUDIT MINOR: the echo is OUTSIDE the try and outside every guard. Inside,
                 * it was skipped on exactly the paths it exists for — a malformed payload, an
                 * unknown address, a throw — leaving the shell rendering an optimistic mute
                 * that was never stored. It now reports the STORED truth in every outcome,
                 * including "nothing was stored". */
                try
                {
                    if (!string.IsNullOrEmpty(muteAddr))
                    {
                        Utils.sendUiCommand(this, "setChatMuted", muteAddr,
                            (mf != null && SNotificationPrefs.isChatMuted(mf)) ? "1" : "0");
                    }
                }
                catch (Exception ex2)
                {
                    Logging.error("ixian:mutechat echo failed: " + ex2);
                }
            }
            else if (current_url.Contains("ixian:chatinfo:"))
            {
                // #248 (Damir F5 items 1/5): chats row-menu entry → context 'chat'
                // ("Chat info"/"Group info", no Message action) — same pane routing.
                string id = current_url.Split(new string[] { "ixian:chatinfo:" }, StringSplitOptions.None)[1];
                Friend? friend = FriendList.getFriend(new Address(id));
                if (friend == null)
                {
                    e.Cancel = true;
                    return;
                }
                openContactDetails(friend, false, true);
            }
            else if (current_url.Contains("ixian:txdetails:"))
            {
                string[] split = current_url.Split(new string[] { "ixian:txdetails:" }, StringSplitOptions.None);
                string id = split[1];
                byte[] b_txid = Transaction.txIdLegacyToV8(id);

                onTransaction(b_txid, e);
            }
            else if (current_url.Contains("ixian:tab:"))
            {
                currentTab = current_url.Split(new string[] { "ixian:tab:" }, StringSplitOptions.None)[1];
                if (suppressNextTabOverlayExit && currentTab == "tab1")
                {
                    // #285: this is the reloaded shell's own boot-time tab1 echo
                    // (Fix #8), not a user tab switch — skip the exit sweep ONCE.
                    // #288 review: keyed on tab1, because a REAL tab tap inside the reload
                    // window used to EAT the flag — and then the boot echo, arriving with
                    // the flag already clear, ran the sweep and tore down the very Account
                    // pane this exists to protect. reloadShell's belt also clears it
                    // unconditionally, so a shell that never boots cannot latch it into the
                    // next genuine switch (which would silently skip the Account pane's
                    // save-if-dirty exit and drop a held nickname / avatar / lock edit).
                    suppressNextTabOverlayExit = false;
                }
                else
                {
                    // Unit 2 (#240): switching home tab closes an open Account pane —
                    // routed THROUGH the shell so held edits are saved (never a silent
                    // teardown around a dirty nickname/avatar/lock).
                    requestSettingsOverlayExit();
                    // #247: the chat-info pane belongs to the chats context — leaving it
                    // closes the pane (direct close is safe: its edits commit per-action).
                    closeContactDetailsOverlays();
                    closeFormPaneOverlays();   // Batch C: add-contact/add-app pane too
                    closeTxDetailOverlays();   // #263: the tx detail belongs to the wallet tab
                }
                // ★ AND-7b (#407): the surface under the status bar changed with the tab,
                // and NOTHING navigates on a tab switch — so nothing else repaints it.
                repaintOwnSystemBars();
                if (currentTab == "tab2")
                {
                    loadTransactions(true);
                }
                else if (currentTab == "tab3")
                {
                    // PERF: force ONLY when this document has never been fed (see
                    // appsPushedToShell). Otherwise the shouldRefreshApps gate decides —
                    // an install / uninstall / icon change still re-pushes, an unchanged
                    // list costs nothing and the WebView keeps its decoded icons.
                    loadApps(!appsPushedToShell);
                }
            }
            else if (current_url.Equals("ixian:downloads", StringComparison.Ordinal))
            {
                // #264 (S8): dead legacy branch (no shell emits ixian:downloads at
                // HomePage — the live entry is the Account hub → SettingsPage), but
                // aligned to the overlay presenter so DownloadsPage.onBack's
                // popPageAsync (no longer PopModalAsync) works from EVERY presenter.
                pushPageLoaded(new DownloadsPage());
            }
            else if (current_url.Equals("ixian:contributors", StringComparison.Ordinal))
            {
                Navigation.PushModalAsync(new ContributorsPage());
            }
            else if (current_url.Equals("ixian:share", StringComparison.Ordinal))
            {
                Share.RequestAsync(new ShareTextRequest
                {
                    Text = IxianHandler.getWalletStorage().getPrimaryAddress().ToString(),
                });
            }
            else if (current_url.Contains("ixian:rating:"))
            {
                string result = current_url.Split(new string[] { "ixian:rating:" }, StringSplitOptions.None)[1];
                string? action_url = null;

                if (result.Equals("yes", StringComparison.Ordinal))
                {
                    if (DeviceInfo.Platform == DevicePlatform.Android)
                    {
                        action_url = Config.ratingAndroidUrl;
                    }
                    else if (DeviceInfo.Platform == DevicePlatform.iOS)
                    {
                        action_url = Config.ratingiOSUrl;
                    }
                }
                else if (result.Equals("no", StringComparison.Ordinal))
                {
                    action_url = Config.supportEmailUrl;
                }

                if (action_url != null)
                {
                    Preferences.Default.Set("rating_action", "done");
                    Browser.Default.OpenAsync(new Uri(action_url));
                }

                e.Cancel = true;
                return;
            }
            else if (current_url.Equals("ixian:copy", StringComparison.Ordinal))
            {
            }
            else if (current_url.StartsWith("ixian:sendLog"))
            {
                // TODO perhaps move this whole functionality to Logging class and delete spixi.log.zip on start if exists

                if (File.Exists(Path.Combine(Config.spixiUserFolder, "spixi.log.zip")))
                {
                    File.Delete(Path.Combine(Config.spixiUserFolder, "spixi.log.zip"));
                }

                if (File.Exists(Path.Combine(Config.spixiUserFolder, "ixian.log.tmp")))
                {
                    File.Delete(Path.Combine(Config.spixiUserFolder, "ixian.log.tmp"));
                }

                File.Copy(Path.Combine(Config.spixiUserFolder, "ixian.log"), Path.Combine(Config.spixiUserFolder, "ixian.log.tmp"));

                using (ZipArchive archive = ZipFile.Open(Path.Combine(Config.spixiUserFolder, "spixi.log.zip"), ZipArchiveMode.Create))
                {
                    archive.CreateEntryFromFile(Path.Combine(Config.spixiUserFolder, "ixian.log.tmp"), "ixian.log");
                    if (File.Exists(Path.Combine(Config.spixiUserFolder, "ixian.0.log")))
                    {
                        archive.CreateEntryFromFile(Path.Combine(Config.spixiUserFolder, "ixian.0.log"), "ixian.0.log");
                    }
                }

                if (File.Exists(Path.Combine(Config.spixiUserFolder, "ixian.log.tmp")))
                {
                    File.Delete(Path.Combine(Config.spixiUserFolder, "ixian.log.tmp"));
                }

                SFileOperations.share(Path.Combine(Config.spixiUserFolder, "spixi.log.zip"), "Share Spixi Log File");
            }
            else if (current_url.StartsWith("ixian:joinBot"))
            {
                joinBot();
            }
            else if (current_url.StartsWith("ixian:startApp:", StringComparison.Ordinal))
            {
                string appId = current_url.Substring("ixian:startApp:".Length);
                onStartApp(appId);
            }
            else if (current_url.StartsWith("ixian:startappwith:", StringComparison.Ordinal))
            {
                // Damir 2026-08-13 ("when launching multiuser app we get the legacy
                // contacts list selector, it should be new one same as for group
                // creation"): the shell picked the targets in the REDESIGNED in-shell
                // picker and hands them over here — no WalletRecipientPage push.
                // Checked BEFORE the startAppMulti branch below only for clarity; the
                // two prefixes cannot collide (different literals, Ordinal).
                onStartAppWith(current_url.Substring("ixian:startappwith:".Length));
            }
            else if (current_url.StartsWith("ixian:startAppMulti", StringComparison.Ordinal))
            {
                string appId = current_url.Substring("ixian:startAppMulti:".Length);
                onStartAppMulti(appId);
            }
            else if (current_url.StartsWith("ixian:appDetails:"))   // Q1 review (#266/#267 loop): the colon was missing — a colon-less "ixian:appDetails" threw ArgumentOutOfRangeException on the Substring below
            {
                string appId = current_url.Substring("ixian:appDetails:".Length);
                onAppDetails(appId);
            }
            else if (current_url.StartsWith("ixian:uninstall:", StringComparison.Ordinal))
            {
                // A1: uninstall from the apps-tab ⋮ menu (list-scoped; AppDetailsPage
                // owns the same MiniAppManager.remove for its details-scoped uninstall).
                string appId = current_url.Substring("ixian:uninstall:".Length);
                onUninstallApp(appId);
            }
            else if (current_url.Equals("ixian:cleardetail", StringComparison.Ordinal))
            {
                // ★ L6 (2026-08-31): the shell is about to cover column 0 with a
                // full-shell takeover that belongs to the ACCOUNT context — clear the
                // detail column so a conversation from the chats context does not sit
                // beside it. See closeChatOverlaysForContacts for why the pane "jumped"
                // and why nothing is restored afterwards.
                // ⚠ NOT reusing ixian:homeoverlay: that one also fires for ordinary
                // sheets (a tx sheet, a row menu — home.html mirrors
                // body[data-overlay-open] to it), and tearing the detail column down
                // every time a sheet opens would be a far worse bug than the one this
                // fixes. A distinct verb says a distinct thing.
                /* ⚠ review: the WIDE gate belongs to the whole verb, not only to the
                 * conversation. The first cut gated one of four, while the shell's
                 * comment promised "a no-op on a narrow window" of all of them — and a
                 * narrow window has no detail column for any of these to be beside. */
                if (rightContent.IsVisible)
                {
                    closeChatOverlaysForContacts();
                    closeContactDetailsOverlays();
                    closeFormPaneOverlays();
                    closeTxDetailOverlays();
                }
            }
            else if (current_url.StartsWith("ixian:homeoverlay:", StringComparison.Ordinal))
            {
                // AND-29 (#336): the home shell pushes 1/0 whenever a WebView-internal
                // takeover (contacts/new-chat, wallet Receive/Send) opens or closes, so
                // OnBackButtonPressed can route Android hardware back INTO the shell
                // (close the takeover) instead of popping the root and exiting the app.
                /* ⚠ Parsed as a LEVEL, not matched as ":1". An older shell only ever
                 * sent 0 or 1, and those still mean exactly what they meant. */
                string overlayLevel = current_url.Substring("ixian:homeoverlay:".Length);
                bool wasTakeover = homeShellTakeoverOpen;
                homeShellOverlayOpen = overlayLevel != "0";
                homeShellTakeoverOpen = overlayLevel == "2";
                if (wasTakeover != homeShellTakeoverOpen)
                {
                    // The surface under the status bar just changed and NOTHING navigates
                    // when a WebView-internal takeover opens or closes, so nothing else
                    // would repaint it (the AND-7b/#407 reasoning, one surface over).
                    repaintOwnSystemBars();
                }
            }
            else if (current_url.StartsWith("ixian:acceptRequest:", StringComparison.Ordinal))
            {
                // CH2: accept an incoming contact request from the chats-list request card.
                onAcceptRequest(current_url.Substring("ixian:acceptRequest:".Length));
            }
            else if (current_url.StartsWith("ixian:declineRequest:", StringComparison.Ordinal))
            {
                // CH2: decline an incoming contact request from the chats-list request card.
                onDeclineRequest(current_url.Substring("ixian:declineRequest:".Length));
            }
            else if (current_url.StartsWith("ixian:txexplorer:", StringComparison.Ordinal))
            {
                /* ★ #443 (Damir): the TX-DETAILS explorer button opens the TRANSACTION,
                 * as legacy does — not the wallet address. Only an ADDRESS-scoped verb
                 * existed on this page (be-cutover W3), so the mobile tx sheet offered
                 * "View address in Explorer" from a screen that is entirely about one
                 * transaction. The URL mirrors WalletSentPage:130 exactly, so the two
                 * surfaces cannot drift.
                 * ★ Ordinal + colon, checked BEFORE the address verb below — otherwise
                 * StartsWith("ixian:explorer") would never see it anyway, but the order
                 * makes the precedence explicit rather than incidental. */
                string txid = current_url.Substring("ixian:txexplorer:".Length).Trim();
                /* ★ Audit MAJOR-1: the first cut demanded HEX and an Ixian txid is not hex.
                 * Transaction.getTxIdString() returns "<blockHeight>-<Base58Plain>", or
                 * "stk-<n>-<n>-<Base58Plain>" for a staking reward — so the guard refused
                 * every real id and the button opened nothing, while the smoke pin blessed
                 * the regex as if it were the fix. The charset that actually matches is
                 * Base58 plus digits plus the '-' separator, and every character in it is
                 * URL-safe, which is the property the guard exists for. */
                if (txid.Length > 0 && txid.Length <= 128
                    && System.Text.RegularExpressions.Regex.IsMatch(txid, "^[0-9A-Za-z-]+$"))
                {
                    Browser.Default.OpenAsync(new Uri(String.Format("{0}?p=transaction&id={1}", Config.explorerUrl, txid)));
                }
                else
                {
                    Logging.warn("Refused a malformed txid for the explorer link.");
                }
            }
            else if (current_url.StartsWith("ixian:explorer"))
            {
                Browser.Default.OpenAsync(new Uri(Config.explorerUrl + "index.php?p=address&id=" + IxianHandler.primaryWalletAddress));
            }
            else if (current_url.StartsWith("ixian:miniAppsStartNoteHidden", StringComparison.Ordinal))
            {
                Preferences.Default.Set("miniAppsStartNoteHidden", true);
                SpixiLocalization.addCustomString("miniAppsStartNoteHidden", "true");
            }
            else if (current_url.StartsWith("ixian:enableDevMode", StringComparison.Ordinal))
            {
                Preferences.Default.Set("devMode", true);
                devMode = true;
                SpixiLocalization.addCustomString("devMode", "true");
            }
            else if (current_url.StartsWith("ixian:disableDevMode", StringComparison.Ordinal))
            {
                Preferences.Default.Set("devMode", false);
                devMode = false;
                SpixiLocalization.addCustomString("devMode", "false");
            }
            else if (current_url.StartsWith("ixian:dev", StringComparison.Ordinal))
            {
                Navigation.PushModalAsync(new DevPage());
            }
            else if (current_url.StartsWith("ixian:spixiAppsLink", StringComparison.Ordinal))
            {
                Browser.Default.OpenAsync(new Uri(Config.spixiAppsUrl));
            }
            else if (current_url.Trim().StartsWith("file:", StringComparison.OrdinalIgnoreCase))
            {
                // allow normal navigation only for local files
                e.Cancel = false;
                return;
            }
            e.Cancel = true;
        }

        /* ★★ L1 (#640): `onSendIxi` and `onReceiveIxi` are DELETED with WalletSendPage
         * and WalletReceivePage, together with the two legacy wallet verbs that reached
         * them. The wallet composes in-shell (W5/#523) and the
         * Receive takeover owns the address surface (#527/#589). */

        // Q2-⑥ (#268, W8 LANDED): `ixian:sendrequest:` on the home shell — the
        // Receive takeover's "request from a contact" strip. Parse + validate +
        // dispatch lifted VERBATIM from the legacy receive page's onNavigating and
        // onRequest (WalletReceivePage, deleted with ★★ L1 #640); the ONLY deltas are
        // (a) no popPageAsync (HomePage
        // stays), (b) no e.Cancel plumbing (the caller cancels unconditionally).
        // ★ SECURITY.md: requestFunds is a CHAT MESSAGE (an ask) — nothing is
        // signed or broadcast here; the payer later reviews in the native flow.
        private void onSendRequest(string current_url)
        {
            try
            {
                string[] split = current_url.Split(new string[] { "ixian:sendrequest:" }, StringSplitOptions.None);

                // Extract all addresses and amounts
                string[] addresses_split = split[1].Split(new string[] { "|" }, StringSplitOptions.None);

                foreach (var address_amount in addresses_split)
                {
                    if (address_amount == "")
                    {
                        continue;
                    }

                    string[] split_address_amount = address_amount.Split(':');
                    if (split_address_amount.Count() < 2)
                        continue;

                    string recipient = split_address_amount[0];
                    string amount = split_address_amount[1];
                    if (!ExtendedAddress.Validate(recipient))
                    {
                        displaySpixiAlert(SpixiLocalization._SL("global-invalid-address-title"), SpixiLocalization._SL("global-invalid-address-text"), SpixiLocalization._SL("global-dialog-ok"));
                        return;
                    }
                    string[] amount_split = amount.Split(new string[] { "." }, StringSplitOptions.None);
                    if (amount_split.Length > 2)
                    {
                        displaySpixiAlert(SpixiLocalization._SL("wallet-error-amount-title"), SpixiLocalization._SL("wallet-error-amountdecimal-text"), SpixiLocalization._SL("global-dialog-ok"));
                        return;
                    }

                    // Add decimals if none found
                    if (amount_split.Length == 1)
                        amount = String.Format("{0}.0", amount);

                    IxiNumber _amount = amount;

                    if (_amount == 0 || _amount < (long)0)
                    {
                        displaySpixiAlert(SpixiLocalization._SL("wallet-error-amount-title"), SpixiLocalization._SL("wallet-error-amount-text"), SpixiLocalization._SL("global-dialog-ok"));
                        return;
                    }

                    Address recipient_address = new Address(recipient);
                    Friend? request_friend = FriendList.getFriend(recipient_address);

                    // #268 audit FIX 1/2/3 — RECIPIENT GUARD. A deliberate,
                    // documented DEVIATION from the verbatim lift: legacy
                    // the legacy receive page's onRequest guarded only
                    // `friend != null && amount > 0` and silently did nothing
                    // otherwise (its own `// else error?` at :196 flags the hole).
                    //
                    // The frontend recipient list is NOT a security boundary, and
                    // it cannot even see every bad case:
                    //  · an INCOMING, not-yet-accepted request is routed out of the
                    //    chats list into the Requests feed (loadChats), so that
                    //    contact has no chat row, is never flagged "pending" in the
                    //    shell, and DOES render in the money strip;
                    //  · a group/bot with a custom avatar and no chat row slips past
                    //    the shell's avatar-sentinel + CH1 "kind" heuristics.
                    // Composing a requestFunds toward a peer who has not accepted us
                    // (or toward a group/bot) is the ⑪ "delivery lie" class on a
                    // money surface: the shell latches "Request sent ✓" for a message
                    // that cannot arrive. So: FAIL CLOSED here, and always surface
                    // the rejection (FIX 3 — no more silent no-op).
                    //
                    // FAIL-CLOSED on type: only FriendType.Normal is a 1:1 person;
                    // anything else (Group / Payment / Temporary / any future member
                    // added in Ixian-Core) is rejected rather than allowed.
                    //
                    // ★ BOTH handshake flags are checked, deliberately (Q2 re-review):
                    // `approved` means "I approved THEM" (its only writes are the two
                    // accept handlers — HomePage.onAcceptRequest and
                    // SingleChatPage.onAcceptFriendRequest), so a contact *I* added who
                    // has NOT accepted me yet can still be `approved` — the exact
                    // outgoing-pending recipient this guard exists to reject. The app's
                    // canonical "we are connected" test is `state == Approved`: a friend
                    // that is not Approved has its chat-list excerpt forced to
                    // "waiting for response" (getFriendMessageHelper) and gets NO call
                    // button (SingleChatPage:667). Checking both covers both directions
                    // and cannot reject a contact that shows a normal chat row today.
                    if (request_friend == null
                        || !request_friend.approved
                        || request_friend.state != FriendState.Approved
                        || request_friend.type != FriendType.Normal
                        || request_friend.bot)
                    {
                        Logging.warn("sendrequest: rejected recipient " + recipient
                            + " (known: " + (request_friend != null)
                            + ", approved: " + (request_friend != null ? request_friend.approved.ToString() : "n/a")
                            + ", state: " + (request_friend != null ? request_friend.state.ToString() : "n/a")
                            + ", type: " + (request_friend != null ? request_friend.type.ToString() : "n/a")
                            + ", bot: " + (request_friend != null ? request_friend.bot.ToString() : "n/a") + ")");
                        displaySpixiAlert(SpixiLocalization._SL("global-invalid-address-title"), SpixiLocalization._SL("global-invalid-address-text"), SpixiLocalization._SL("global-dialog-ok"));
                        return;
                    }

                    if (_amount > 0)
                    {
                        FriendMessage? friend_message = Node.addMessageWithType(null, FriendMessageType.requestFunds, request_friend.walletAddress, 0, amount, true);

                        StreamProcessor.transactionRequest(friend_message.id, request_friend, _amount, null, null);
                    }
                }
            }
            catch (Exception ex)
            {
                Logging.error("Exception occurent for sendrequest action: " + ex);
                displaySpixiAlert(SpixiLocalization._SL("wallet-request-error-title"), SpixiLocalization._SL("wallet-request-error-text"), SpixiLocalization._SL("global-dialog-ok"));
            }
        }

        public void onContactDetails(Friend friend)
        {
            // Chat header entry (via SingleChatPage) → context 'chat' (#248).
            openContactDetails(friend, true, true);
        }

        /* Unit 6 (#247): ONE router for every chat-info entry (conversation header
         * tap via SingleChatPage, chats row-menu / contacts directory ixian:details:).
         * ★ #221: ContactDetails keeps its OWN WebView; the conversation WebView is
         * never touched — all coordination is right here in C#.
         *  - wide + conversation open + room  → pane pinned BESIDE the chat (col 2).
         *    Staged full-span with a leading margin so the shell loads at its REAL
         *    width (a zero-width column would lay the WebView out at 0), then pinned
         *    to col 2 in the same frame it becomes visible (onOverlayPresented) —
         *    the column expands exactly when there is painted content to show.
         *  - wide + no conversation OR wide-but-squeezed → the detail slot (col 1):
         *    the info overtakes ONLY the conversation region, the list stays (#248,
         *    Damir F5 item 4 — full-window was wrong on wide windows).
         *  - narrow (single-pane)             → the full-span takeover (= the
         *    conversation region, which spans the window there).
         * chatContext (#248): 'chat' entries (header/row-menu) title "Chat info"/
         * "Group info"; only the contacts directory keeps "Contact details".
         * Re-tapping for the SAME contact toggles the surface closed (Telegram
         * grammar); a different contact rides the "chatinfo" tag-replace (seamless). */
        private void openContactDetails(Friend friend, bool customChatBtn, bool chatContext)
        {
            MainThread.BeginInvokeOnMainThread(() =>
            {
                foreach (SpixiContentPage p in SpixiContentPage.getOverlayPages())
                {
                    if (p is ContactDetails open)
                    {
                        if (open.friendAddressString() == friend.walletAddress.ToString())
                        {
                            removePage(open);   // toggle close
                            return;
                        }
                        break;   // different contact — the tag swap closes it after present
                    }
                }

                infoPaneCol2Pending = false;
                // Batch C loop B-MINOR-1: a lingering add-contact/add-app pane would sit
                // STACKED under a col-1 info pane and resurface when it closes — the
                // detail region navigates to the info surface, so the form yields
                // (same close-audit rule as tab/chat/tx navigation).
                closeFormPaneOverlays();
                closeTxDetailOverlays();   // #263 review NIT-1: same stacking class, defense-in-depth
                bool wide = rightContent.IsVisible;
                // #249 (Damir F5 r3): the BESIDE-the-conversation column is ONLY for the
                // OPEN conversation's own info — any other target (a contact from the
                // directory, another chat's row menu) pinned there reads as if it
                // belonged to the visible conversation. Everything else → col 1.
                bool chatOpenIsTarget = SpixiContentPage.getOverlayPages()
                    .Exists(p => p is SingleChatPage scp && scp.friend == friend);
                // Loop fix A-3/B-3: col 0's Width.Value is the star MULTIPLIER when
                // narrow — only meaningful under the wide guard.
                double avail = wide ? (Width - mainGrid.ColumnDefinitions[0].Width.Value - detailMinWidth) : 0;

                if (wide && chatOpenIsTarget && avail >= infoPaneMinWidth)
                {
                    double paneW = Math.Min(infoPaneWidth, avail);
                    infoPaneCol2Pending = true;
                    pushPageLoaded(new ContactDetails(friend, customChatBtn, "2", chatContext), 4000, "chatinfo", -1,
                        null, new Thickness(Math.Max(0, Width - paneW), 0, 0, 0),
                        navKey: "chatinfo:" + friend.walletAddress,
                        revealDelayMs: 0, slideIn: true);   // ★★ V-19 · item 6: show the boot skeleton, slide it in
                }
                else if (wide)
                {
                    // No conversation open, or no room beside it → the detail slot
                    // (stacks OVER an open conversation, covering only its region).
                    pushPageLoaded(new ContactDetails(friend, customChatBtn, "1", chatContext), 4000, "chatinfo", 1,
                        navKey: "chatinfo:" + friend.walletAddress,
                        revealDelayMs: 0, slideIn: true);   // ★★ V-19 · item 6: show the boot skeleton, slide it in
                }
                else
                {
                    pushPageLoaded(new ContactDetails(friend, customChatBtn, null, chatContext), 4000, "chatinfo",
                        navKey: "chatinfo:" + friend.walletAddress,
                        revealDelayMs: 0, slideIn: true);   // ★★ V-19 · item 6: show the boot skeleton, slide it in
                }
            });
        }

        // #251 (Damir F5: the EmptyDetail resting pane stayed DARK after a dark→light
        // pick): it is neither in the NavigationStack nor an overlay nor detailContent,
        // so every re-theme path missed it. Expose it for the SettingsPage setTheme
        // push + the reloadAllPages regenerate.
        public SpixiContentPage? getDefaultDetailContent()
        {
            return defaultDetailContent;
        }

        public void reloadDefaultDetail()
        {
            try
            {
                defaultDetailContent?.reload();
            }
            catch (Exception ex)
            {
                Logging.warn("reloadDefaultDetail: " + ex.Message);
            }
        }

        // #247: close any open chat-info surface. DIRECT close is safe here — unlike
        // the Account pane there is no held dirty state (nickname override / QR / money
        // actions all commit per-action through their own verbs).
        private void closeContactDetailsOverlays()
        {
            foreach (SpixiContentPage p in SpixiContentPage.getOverlayPages())
            {
                if (p is ContactDetails)
                {
                    removePage(p);   // #225: removing an open overlay = closeOverlay
                }
            }
        }

        // Batch C (#256 M7/M8): close an open add-contact/add-app form pane when the
        // user navigates the detail region elsewhere (tab switch / chat open / tx
        // open) — same close-audit the chat-info pane gets. ⚠ DIRECT close discards
        // typed-but-unsubmitted form input (an address / app URL) — accepted: the
        // user chose to navigate away, and the forms are one-field short. Damir dial.
        private void closeFormPaneOverlays()
        {
            foreach (SpixiContentPage p in SpixiContentPage.getOverlayPages())
            {
                // Q1-① (#267): AppDetailsPage now rides the same "formpane" slot
                // (Get-app / apps-tab ⋮ → App details) → same close-audit.
                if (p is ContactNewPage || p is AppNewPage || p is AppDetailsPage)
                {
                    removePage(p);   // #225: removing an open overlay = closeOverlay
                }
            }
        }

        /* ★ L6 (Damir, 2026-08-31): "on desktop it opens contacts, but the right pane
         * jumps to an open chat. Right pane should stay in account empty state."
         *
         * Why it jumped: the Account pane covers the WHOLE grid minus the rail (#245),
         * so it HIDES a conversation pinned in the detail column. Opening Contacts from
         * Account closes that pane, and the conversation underneath was simply revealed
         * again — nothing "opened" at all. The contacts directory is a takeover inside
         * THIS page's WebView, which is grid column 0, so it can never cover column 1
         * by itself.
         *
         * Damir's call: close the conversation and let the welcome pane show. It is NOT
         * restored afterwards — leaving Contacts lands on an empty right pane, which he
         * chose over carrying a restore-what-was-there state across the visit.
         *
         * ⚠ WIDE ONLY. On a narrow window a conversation is a full-screen overlay and
         * nothing is beside anything; closing one there would shut a screen the user is
         * standing on. The caller gates it and this gate is the belt.
         *
         * A conversation holds no unsaved state — a half-typed message lives in the
         * shell's own draft store (spixi.draft.<addr>, CH7) and survives. */
        private void closeChatOverlaysForContacts()
        {
            if (!rightContent.IsVisible)
            {
                return;
            }
            foreach (SpixiContentPage p in SpixiContentPage.getOverlayPages())
            {
                if (p is SingleChatPage)
                {
                    removePage(p);   // #225: removing an open overlay = closeOverlay
                }
            }
        }

        // #263: same close-audit for the tx-detail overlay ("txdetail", pinned col 1
        // on wide) — leaving the wallet context closes it. View-only, no held state.
        private void closeTxDetailOverlays()
        {
            foreach (SpixiContentPage p in SpixiContentPage.getOverlayPages())
            {
                if (p is WalletSentPage)
                {
                    removePage(p);   // #225: removing an open overlay = closeOverlay
                }
            }
        }

        /* ★★ THE NATIVE PAYMENT PAGE IS REMOVED (Damir decision 4, 2026-08-29:
         * "Nothing of legacy must exist in the new app. It shouldn't be in the code.
         * If we are missing anything we will build newly.")
         * `onConfirmPaymentRequest` existed only to push WalletContactRequestPage. Its
         * job is done in place now: Pay opens the review sheet and SPayments.handlePayRequest
         * signs behind the native confirm, and Decline is a button on the card.
         * ⚠ Removing that page also removed a real hazard: its own onSend SIGNED AND
         * BROADCAST with no native confirm and dereferenced a null requestMsg and a null
         * transaction — the white error page on a canceled request. */

        public async void quickScan()
        {
            var scanPage = new ScanPage();
            scanPage.scanSucceeded += HandleScanSucceeded;
            await Navigation.PushAsync(scanPage, Config.defaultXamarinAnimations);
        }
        private void HandleScanSucceeded(object sender, SPIXI.EventArgs<string> e)
        {
            processQRResult(e.Value);
        }

        // ★ #523: scan started FROM the send compose. The decoded payload goes back
        // to the shell verbatim (`quickScanResult` → setSendAddress parses addr /
        // addr:ixi / addr:send:amount). No page navigation, nothing signed.
        public async void quickScanForSend()
        {
            var scanPage = new ScanPage();
            scanPage.scanSucceeded += (sender, e) =>
            {
                popPageAsync();
                // ★ Batch W loop r1 B-4: the hero scan now lands here too (W-e), so a
                // non-Ixian QR must not be dumped into the money compose — the same
                // ExtendedAddress.Validate gate processQRResult applies, then the
                // legacy invalid-address alert. The payload's address is the part
                // before the first ':' (addr · addr:ixi · addr:send:amount).
                string payload = e.Value ?? "";
                int sep = payload.IndexOf(':');
                string addr = sep > 0 ? payload.Substring(0, sep) : payload;
                bool valid = false;
                try { valid = ExtendedAddress.Validate(addr); } catch (Exception) { valid = false; }
                if (!valid)
                {
                    Logging.warn("Scanned payload is not an Ixian address");
                    displaySpixiAlert(SpixiLocalization._SL("global-invalid-address-title"), SpixiLocalization._SL("global-invalid-address-text"), SpixiLocalization._SL("global-dialog-ok"));
                    return;
                }
                Utils.sendUiCommand(this, "quickScanResult", payload);
            };
            await Navigation.PushAsync(scanPage, Config.defaultXamarinAnimations);
        }

        public void processQRResult(string result)
        {
            popPageAsync();

            // Check for add contact
            string[] split = result.Split(new string[] { ":send" }, StringSplitOptions.None);
            if (split.Count() > 1)
            {
                // ★ #523/#524: a payment QR now lands in the SHELL compose — the shell
                // opens it and setSendAddress parses the payload. The legacy
                // legacy send-page route is retired with the other native money pages
                // at the §5 repoint; this exe always ships the compose-capable shell.
                try
                {
                    if (!ExtendedAddress.Validate(split[0]))
                    {
                        throw new Exception("address validation failed");
                    }
                    Utils.sendUiCommand(this, "quickScanResult", result);
                }
                catch (Exception ex)
                {
                    Logging.error("Invalid address format: " + ex.Message);
                }
                return;
            }

            string id_to_add = split[0];
            var contactNewPage = new ContactNewPage(id_to_add);
            contactNewPage.pickSucceeded += (sender, e) =>
            {
                HandlePickSucceeded(sender, new() { new ExtendedAddress(e.Value) }, null, false);
            };
            Navigation.PushAsync(contactNewPage, Config.defaultXamarinAnimations);
            return;
        }

        // Show the recipient page
        public void newChat()
        {
            var recipientPage = new WalletRecipientPage(true, false);
            recipientPage.pickSucceeded += (sender, e) =>
            {
                HandlePickSucceeded(sender, e);
            };
            Navigation.PushAsync(recipientPage, Config.defaultXamarinAnimations);
        }

        // #265 (Damir ⑤): the in-shell group setup's avatar pick — same temp-file
        // convention the legacy picker used, so HandlePickSucceeded promotes it onto
        // the created group unchanged. C# owns the path; the WebView only says "pick".
        // ★ Opus review MAJOR-2: WalletRecipientPage.temporaryImagePath is only made
        // ABSOLUTE inside that page's ctor (it initializes to the bare relative
        // "avatar-tmp.jpg"). The in-shell flow never constructs that page, so writing
        // to it would hit the process CWD — silently failing on a packaged build (and
        // "working" only on an unpackaged dev run). Resolve the real path ourselves,
        // through the same storage root, every time.
        private static string groupAvatarTempPath()
        {
            return Path.Combine(IxianHandler.localStorage.avatarsPath, "avatar-tmp.jpg");
        }

        // MAJOR-3: an ABANDONED pick (photo chosen, then the user backs out) would be
        // promoted onto the NEXT group created — and shipped to its members. The legacy
        // picker deleted the temp file when it opened; do the same at every entry to the
        // in-shell group flow.
        private void clearGroupAvatarTemp()
        {
            try
            {
                string p = groupAvatarTempPath();
                if (File.Exists(p))
                {
                    File.Delete(p);
                }
            }
            catch (Exception ex)
            {
                Logging.warn("clearGroupAvatarTemp: " + ex);
            }
        }

        private async Task onGroupAvatarAsync()
        {
            SpixiImageData? spixi_img_data = await SFilePicker.PickImageAsync();
            if (spixi_img_data == null || spixi_img_data.stream == null)
            {
                // MINOR-6: a CANCELLED pick must release the shell's one-shot latch,
                // else the avatar button stays dead for the panel's life.
                Utils.sendUiCommand(this, "loadGroupAvatar", "");
                return;
            }
            try
            {
                byte[]? image_bytes;
                using (MemoryStream ms = new MemoryStream())
                {
                    spixi_img_data.stream.CopyTo(ms);
                    spixi_img_data.stream.Close();
                    image_bytes = SFilePicker.ResizeImage(ms.ToArray(), 960, 960, 80);
                    if (image_bytes == null)
                    {
                        Utils.sendUiCommand(this, "loadGroupAvatar", "");
                        return;
                    }
                }
                string path = groupAvatarTempPath();
                File.WriteAllBytes(path, image_bytes);
                // keep the legacy static in sync — HandlePickSucceeded promotes from it
                WalletRecipientPage.temporaryImagePath = path;
                Utils.sendUiCommand(this, "loadGroupAvatar", Utils.imageToDataUri(path));   // X1
            }
            catch (Exception ex)
            {
                Logging.error("onGroupAvatarAsync: " + ex);
                Utils.sendUiCommand(this, "loadGroupAvatar", "");   // release the latch
            }
        }

        private async void HandlePickSucceeded(object? sender, EventArgs<(List<ExtendedAddress>, string?, bool)> e)
        {
            HandlePickSucceeded(sender, e.Value.Item1, e.Value.Item2, e.Value.Item3);
        }

        // popFirst=false: the in-shell create-group flow (#265) has NO pushed page to
        // pop — popPageAsync() there would pop HomePage itself off the nav stack.
        private async void HandlePickSucceeded(object? sender, List<ExtendedAddress> addresses, string? groupName, bool blindMode, bool popFirst = true)
        {
            if (addresses.Count == 0)
            {
                await displaySpixiAlert("No recipient selected", "Please select a recipient to start the chat.", "OK");
                return;
            }

            bool hideParticipantAddresses = blindMode;
            Address address = addresses.First().RoutingAddress;

            if (addresses.Count > 1)
            {
                // group
                if (string.IsNullOrEmpty(groupName))
                {
                    Logging.error("Group name is null for group chat creation.");
                    return;
                }

                var contacts = addresses.ToOrderedDictionary(x => x.RoutingAddress, x => FriendList.getFriend(x.RoutingAddress)?.nickname, new AddressComparer());
                var g = GroupChat.CreateGroup(new Address(IxianHandler.getWalletStorage().getPrimaryPublicKey()), contacts, groupName, hideParticipantAddresses);
                if (g != null)
                {
                    // MAJOR-2: never trust the legacy static's default (a RELATIVE
                    // "avatar-tmp.jpg" until WalletRecipientPage's ctor runs) — resolve
                    // the real storage path when it isn't absolute.
                    string avatarPath = WalletRecipientPage.temporaryImagePath;
                    if (!Path.IsPathRooted(avatarPath))
                    {
                        avatarPath = groupAvatarTempPath();
                    }
                    if (File.Exists(avatarPath))
                    {
                        var avatar = File.ReadAllBytes(avatarPath);
                        byte[] resized_avatar = SFilePicker.ResizeImage(avatar, 128, 128, 100);
                        FriendList.setAvatar(g.walletAddress, avatar, resized_avatar, null);
                        File.Delete(avatarPath);
                    }
                    var cgm = new SpixiMessage(SpixiMessageCode.createGroup, new CreateGroupMessage(g.metaData.botInfo.randomId, groupName, contacts, new(), hideParticipantAddresses).getBytes());
                    CoreStreamProcessor.sendSpixiMessage(g, cgm);
                }
                else
                {
                    // pre-existing (review housekeeping): `address = g.walletAddress` sat
                    // OUTSIDE this guard → NRE in an async void if CreateGroup returned
                    // null. The in-shell flow is a new caller — fail loud, don't crash.
                    Logging.error("Group creation failed (CreateGroup returned null).");
                    return;
                }
                address = g.walletAddress;
            }
            else
            {
                Friend? friend = FriendList.getFriend(address);

                if (friend == null)
                {
                    return;
                }
            }

            try
            {
                if (popFirst)
                {
                    popPageAsync();
                }
                onChat(address, null);
            }
            catch (Exception ex)
            {
                Logging.error("Navigation failed: " + ex.Message);
            }
        }

        /* ★ AND-7b (#407, Damir F5 2026-08-19): THE HOME SHELL IS THE EXCEPTION.
         *
         * Full bleed put the WebView under the status bar, so the pixels behind the clock
         * are whatever the shell paints there — and this shell paints two different things
         * depending on the tab: a THEMED topbar on Chats and Apps, and the DARK HERO on
         * Wallet. A single page-level colour was therefore wrong on one tab or the other,
         * and the reported symptom was dark glyphs over the dark wallet hero.
         *
         * Damir's rule, verbatim: the wallet and the launch flow ALWAYS carry light
         * glyphs; every other screen follows the app theme. The launch flow already gets
         * that for free (intro.html is a fixed dark surface); this is the wallet half.
         * tab2 is the wallet tab (HomePage's own tab ids, see the ixian:tab: branch). */
        protected override string systemBarSurfaceColorString()
        {
            /* ★ L6 review MAJOR-2. The hero colour is right for the WALLET TAB and wrong
             * for anything covering it. A full-shell takeover paints --surface-screen
             * from y=0, so while one is up the strip must be the screen surface or the
             * glyph contrast is computed against a colour that is not on screen.
             * ⚠ This also closes a PRE-EXISTING hole rather than only the one L6 opened:
             * the wallet's own Receive/Send takeover is reached FROM tab2 and has always
             * had it. L6 made it reachable a second way (Wallet → Account → Contacts no
             * longer forces tab1), which is how the review found it. */
            if (currentTab == "tab2" && !homeShellTakeoverOpen)
            {
                return ThemeManager.getHeroColorString();
            }
            return base.systemBarSurfaceColorString();
        }

        private void joinBot()
        {
            joinCommunity();
        }

        /* ★ Item 6 (#397/#400): the join is a SHARED STATIC now — the
         * BackupPage.backupAccount() precedent (#243), which is how the Account Backup row
         * and the dead onboarding tail already shared one code path.
         *
         * Why: the community CTA lives in the chat-list EMPTY STATE, and that state
         * disappears the moment the user adds any ordinary contact — so the one door into
         * the community closed forever after the first contact. Damir's dial (#397): keep
         * the empty-state CTA AND add a permanent row in How to use. How to use is rendered
         * by SettingsPage, which does NOT handle ixian:joinBot and must not grow a second
         * copy of the addFriend call. Body moved here VERBATIM; no new verb on either page.
         *
         * Still opt-in: nothing is added until a row is tapped. Tapping twice is safe, but
         * NOT because the request is re-sent: FriendList.addFriend returns NULL when the
         * address is already in the list (Ixian-Core FriendList.cs:366-370), so a repeat
         * tap is a complete no-op — no save, no second contact request, no refresh. That is
         * the safe failure; the ROW's confirmation copy is worded to be true either way. */
        public static void joinCommunity()
        {
            Friend? friend = FriendList.addFriend(FriendType.Normal, FriendState.RequestSent, new Address("419jmKRKVFcsjmwpDF1XSZ7j1fez6KWaekpiawHvrpyZ8TPVmH1v6bhT2wFc1uddV"), null, "Spixi Group Chat", null, null, 0);
            if (friend != null)
            {
                friend.save();

                UIHelpers.shouldRefreshContacts = true;

                CoreStreamProcessor.sendContactRequest(friend);

                if (friend.approved)
                {
                    CoreProtocolMessage.resubscribeEvents();
                }
            }
        }

        // Workaround for Android - sometimes the order of the screens isn't correct
        private void setAsRoot()
        {
            try
            {
                foreach (var page in Navigation.NavigationStack.ToList())
                {
                    if (page == this)
                    {
                        continue;
                    }
                    removePage(page);
                }
            }
            catch (Exception e)
            {
                Logging.error("Exception occured while setting HomePage as root: {0}", e);
            }
        }
        private void onLoaded()
        {
            // #337 audit MAJOR (AND-29): every ixian:onload = a FRESH home document —
            // nothing is open in it, but a takeover/sheet may have been open when the
            // old document was torn down (OS theme flip → reloadAllPages, language
            // reloadShell, renderer crash). A stale `true` would swallow EVERY
            // hardware back (homeBack closes nothing, we return true) with no heal.
            homeShellOverlayOpen = false;
            homeShellTakeoverOpen = false;
            // …and a FRESH document holds no app rows either — the next tab3 entry must
            // force one push (PERF latch, see appsPushedToShell).
            appsPushedToShell = false;

            setAsRoot();

            UIHelpers.shouldRefreshContacts = true;
            UIHelpers.refreshAppRequests = true;

            Utils.sendUiCommand(this, "selectTab", currentTab);

            Utils.sendUiCommand(this, "loadAvatar", Utils.imageToDataUri(IxianHandler.localStorage.getOwnAvatarPath()));   // X1

            Utils.sendUiCommand(this, "setVersion", Config.version + " BETA (" + Node.startCounter + ")");

            string address_string = new ExtendedAddress(IxianHandler.getWalletStorage().getPrimaryAddress(), AddressPaymentFlag.OfflineTag, null).ToString();
            Utils.sendUiCommand(this, "setAddress", address_string);

            Utils.sendUiCommand(this, "setHideBalance", hideBalance.ToString());

            // ★ W5 (#523): declare the money-compose capability for this build.
            // ★★ L1 (#640): there is no legacy flow behind this gate any more — the
            // shell's Send button opens the compose, or it does nothing.
            Utils.sendUiCommand(this, "setCaps", "composeSend");

            // ★ D-20 (#357): the "Connecting…" state died with the document. warningDisplayed
            // is a C# field, so it survives every shell reload (language re-bake, theme, WebView
            // recovery) — the offline branch of updateScreen then tests !warningDisplayed and
            // never re-pushes, so a fresh document while OFFLINE showed normal titles.
            // SingleChatPage already resets its own latch on every load (:714); this is the
            // HomePage half. Belt-and-braces with the reload()/reloadShell() resets —
            // ixian:onload is a known-racy handshake on WinUI (#340 C-MAJOR-1c).
            // ★ Loop r1 (#357 r2): push the ANSWER, not just the flag. An OnAppearing tick
            // during the reload window can QUEUE a "Connecting…" push into the fresh
            // document and set the latch; the onLoaded reset then wiped the latch AFTER
            // that push painted, and the online branch (`if (warningDisplayed)`) never
            // sent the clear — a fresh document could wear "Connecting…" while online.
            // An unconditional clear makes the fresh document's state KNOWN-empty; the
            // updateScreen() call below re-pushes the warning within a tick if the app
            // is really offline, and the update-available banner re-pushes on the next tick
            // too (#383 dropped the C#-side push latch — the shell owns the dismissal).
            Utils.sendUiCommand(this, "showWarning", "");
            warningDisplayed = false;

            try
            {
                updateScreen();
                webView.FadeTo(1, 150);
            }
            catch (Exception ex)
            {
                Logging.error("Exception occured in updateScreen call from onLoaded: {0}", ex);
            }

            checkForRating();
        }

        private void onNavigated(object sender, WebNavigatedEventArgs e)
        {
        }


        /* ★★ L1 (#640): the `onSend` / `onReceive` XAML handlers are DELETED. Nothing in
         * HomePage.xaml bound them — they were the pre-redesign toolbar's clicks — and
         * the pages they pushed no longer exist. */

        public void onSettings(object sender, EventArgs e)
        {
            // Unit 2 (#240): with the Account as a PANE the home rail stays live while
            // it is open — a second Account tap must not stage a duplicate SettingsPage.
            // If one is already open (possibly buried under a chat overlay), close the
            // overlays stacked ABOVE it so it resurfaces, and stop.
            if (SpixiContentPage.getOverlayPages().Exists(p => p is SettingsPage))
            {
                while (!(SpixiContentPage.getTopOverlay() is SettingsPage)
                    && SpixiContentPage.closeTopOverlay())
                {
                }
                return;
            }

            fromSettings = true;
            // Load-then-move (N3): Account opens as a #225 overlay. #245 (Damir: "same
            // peer as wallet/apps/chats, NOT a distant pane"): on a WIDE window the
            // settings WebView spans the WHOLE grid minus the rail strip — the home
            // rail (inside the home WebView, leading railWidthDip) stays visible and
            // live beside it. Inside, the shell renders the hub in the LIST-column
            // slot (width pushed via setPaneMetrics, aligned with the chats column)
            // and sublevels in the detail region — exactly the desktop demo layout.
            // One WebView, one trust domain (settings only); the chat wall (#221) is
            // untouched. Narrow windows keep the full-span takeover.
            bool wide = rightContent.IsVisible;

            /* ★ A9 (#348, Damir Android F5): "in LANDSCAPE, with Account selected, the
             * left strip is not covered and the bottom controls are not visible."
             *
             * Both halves come from ONE false premise. The peer-pane inset exists to
             * leave the home shell's 72dip NAV RAIL visible beside the Account pane, and
             * the settings shell hides its own bottom nav in pane mode because that rail
             * is supposed to be the exit (settings.html:86). But the rail is drawn by the
             * home WEBVIEW and is gated on `:root[data-desktop]`, which is a UA sniff
             * that never fires on Android (home.html:11 — the UA carries "Android").
             *
             * So on Android there IS no rail. The only test in the app was a 700-DIP
             * WIDTH check (OnPageSizeChanged:262), and a landscape phone is 700-950 DIP
             * wide — so it took the desktop branch, the 72dip strip was left uncovered
             * over a mobile layout that has nothing there, and the shell hid its own tab
             * bar in favour of a rail that does not exist. No full tab bar anywhere.
             *
             * The pane is now gated on the same thing the rail is: a DESKTOP idiom.
             * WinUI and Mac Catalyst report Desktop; Android and iOS — phone or tablet —
             * do not, which matches the UA sniff exactly, iPad included. A landscape
             * phone now gets the mobile takeover, with its own working bottom nav.
             *
             * ★ It gates the PARK/RE-PRESENT guard below as well, deliberately. Parking
             * is documented narrow-only (#315), and that guard read the same raw `wide`.
             * If only the branch had changed, a landscape Android Account would park on
             * close and then be refused a re-present forever — a hidden live WebView per
             * open. One boolean drives both, so the two can never disagree. */
            // ★ review MAJOR-10: PLATFORM, not Idiom. DeviceInfo.Idiom is posture-dependent
            // — a Surface with the keyboard detached reports Tablet, and Mac Catalyst
            // reports Tablet under the default "Scaled to Match iPad" configuration — while
            // the shells' UA sniff sets data-desktop on BOTH regardless of posture. Gating
            // on Idiom would therefore hand a detached Surface the mobile branch while its
            // WebView still drew the desktop rail: the A9 symptom relocated, not removed.
            // Platform matches the sniff exactly and cannot drift with how the device is
            // held. It is also the lever every other platform test in this repo uses
            // (HomePage:692/:696/:2628, SpixiContentPage:932).
            bool railPane = wide && (DeviceInfo.Platform == DevicePlatform.WinUI
                                     || DeviceInfo.Platform == DevicePlatform.MacCatalyst);

            // iOS-46 route (a) (#315): NARROW mode keeps ONE warm SettingsPage across
            // opens — close parks it (hidden, WebView alive), a re-tap re-presents it
            // in place: no construction, no ~1.6MB shell reboot, no data re-flush =
            // the iOS-40 lag gone from the second open on. Scope guard: a parked page
            // is only re-presented while the window is still NARROW and it was built
            // non-pane — pane geometry (margins + setPaneMetrics pushed once at
            // onLoad) does not survive a breakpoint crossing, so any mode mismatch
            // disposes the parked instance and rebuilds fresh (the pre-#315 path).
            // ★ C3 (#546, loop r1): a tap while the warm Account page is still LOADING —
            // flip the in-flight preload to present-on-load instead of silently dropping
            // the tap (pushPageLoaded refuses a second target while one is staging).
            // Loop r1 MINOR-5: NOT in rail-pane geometry — the warm page was built narrow,
            // and a narrow page presented into the rail pane is the #315 mode-mismatch the
            // parked path already guards. There the claim is skipped; the warm op parks or
            // dies on its own and the pane path below builds fresh.
            bool railPaneNow = rightContent.IsVisible && (DeviceInfo.Platform == DevicePlatform.WinUI
                                                          || DeviceInfo.Platform == DevicePlatform.MacCatalyst);
            if (!railPaneNow && SpixiContentPage.claimWarmingOverlay<SettingsPage>())
            {
                return;
            }
            SpixiContentPage? parked = SpixiContentPage.getParkedOverlay();
            if (parked is SettingsPage parkedSettings)
            {
                if (!railPane && !parkedSettings.isPaneMode
                    && SpixiContentPage.representParkedOverlay(parkedSettings))
                {
                    return;
                }
                // #46 r1 NIT-2: a lock being up is why represent refused (fail-closed,
                // #230) — keep the warm instance for after the unlock instead of
                // sacrificing it to a fresh push the same lock gate will drop anyway.
                if (SpixiContentPage.hasModalOverlay())
                {
                    return;
                }
                // Mode mismatch / guard failure → never leave a second live instance
                // behind the fresh one.
                SpixiContentPage.disposeParkedOverlay();
            }

            if (railPane)
            {
                pushPageLoaded(new SettingsPage(true, leftPaneWidth - railWidthDip), 4000, "settings", -1,
                    null, new Thickness(railWidthDip, 0, 0, 0));
            }
            else
            {
                pushPageLoaded(new SettingsPage(), 4000, "settings", -1, null, default, true);   // parkOnClose (#315)
            }
        }

        // #263: no longer async — the old rightContent swap awaited FadeTo; the
        // overlay route stages/presents on its own thread machinery.
        public void onTransaction(byte[] txid, WebNavigatingEventArgs e)
        {
            var activity = Node.activityStorage.getActivityById(txid, null, true);
            if (activity == null)
            {
                e.Cancel = true;
                return;
            }

            // Unit 2 (#240): a tx detail renders in the detail region, UNDER an open
            // Account pane pinned to the same column — dismiss the pane first
            // (save-if-dirty through the shell) so the detail is actually visible.
            requestSettingsOverlayExit();
            closeContactDetailsOverlays();   // #247: same reasoning for the info pane
            closeFormPaneOverlays();         // Batch C: the tx detail takes the column

            if (rightContent.IsVisible)
            {
                // #263 (Damir F5: "multipane tx tap does NOTHING"): the old rightContent
                // SWAP put WalletSentPage UNDER the #225 pinned overlays — an open
                // conversation is a stage pinned OVER col 1, so the detail landed
                // beneath it, invisible. Route through the SAME overlay machinery
                // everything else uses: pinned col 1, tag "txdetail" (a new tx tap
                // tag-replaces the previous detail). Constructed WITHOUT the home ref
                // → hideBackButton is never pushed → the shell keeps its back button,
                // whose ixian:dismiss pops the overlay (popPageAsync is overlay-aware)
                // and reveals whatever sat beneath (conversation / empty detail).
                // Live status holds: OnUpdateUI ticks the TOP overlay every second.
                pushPageLoaded(new WalletSentPage(activity.transaction), 4000, "txdetail", 1,
                    navKey: "txdetail:" + activity.transaction);   // ★★ V-19
                Utils.sendUiCommand(this, "selectTx", activity.transaction.getTxIdString());
                return;
            }

            Navigation.PushAsync(new WalletSentPage(activity.transaction), Config.defaultXamarinAnimations);
        }

        public void onChat(Address friend_address, WebNavigatingEventArgs? ev)
        {
            Friend? friend = FriendList.getFriend(friend_address);

            if (friend == null)
            {
                if (ev != null)
                {
                    ev.Cancel = true;
                }
                return;
            }

            fromChat = true;

            MainThread.BeginInvokeOnMainThread(() =>
            {
                if (Utils.getChatPage(friend) != null)
                {
                    // Already open (overlay, pane or pushed) — also swallows double-clicks.
                    Logging.warn("Chat page for {0} already open.", friend.ToString());
                    return;
                }

                // Unit 2 (#240): opening a conversation dismisses an open Account
                // pane (save-if-dirty through the shell) — both pin to the detail
                // column; stacking the chat OVER settings would leave a hidden pane
                // whose dirty edits SingleChatPage's back (popToRootAsync = close
                // ALL overlays) could later discard unsaved.
                requestSettingsOverlayExit();
                // #247: an open info pane belongs to the PREVIOUS conversation —
                // close it before the new chat stages (direct close is safe).
                closeContactDetailsOverlays();
                closeFormPaneOverlays();   // Batch C: the conversation takes the column
                closeTxDetailOverlays();   // #263: same — a new conversation covers col 1

                // #225: conversations open as OVERLAYS — loaded + painted off-screen,
                // then shown in place (wide window: pinned over the detail column,
                // narrow: full-screen). tag "chat" makes a new conversation REPLACE
                // the previous one only after it is visible → seamless switching,
                // nothing detaches, nothing can flicker.
                bool wide = rightContent.IsVisible;
                pushPageLoaded(new SingleChatPage(friend, wide ? this : null), 4000, "chat", wide ? 1 : -1,
                    navKey: "chat:" + friend.walletAddress);   // ★★ V-19: a second tap on the SAME row lets the load finish; a tap on another row wins
                // N49 (#370): the selectChat highlight rides onOverlayPresented now —
                // the push here was the A-1 fire-and-forget class (#362 logged it): a
                // staged page can be dropped before present, leaving a highlight on a
                // row whose conversation never opened. Same move as N24's selectApp.
            });
        }

        // Load the contact list
        // TODO: optimize this
        private void loadContacts()
        {
            List<Friend> friends;
            lock (FriendList.friends)
            {
                friends = new List<Friend>(FriendList.friends);
            }

            lock (refreshLock)
            {
                // Clear everything
                Utils.sendUiCommand(this, "clearContacts");

                // Add contacts one-by-one
                foreach (Friend friend in friends)
                {
                    string str_online = "false";
                    if (friend.online)
                        str_online = "true";

                    string avatar = IxianHandler.localStorage.getAvatarPath(friend.walletAddress.ToString());
                    if (avatar == null)
                    {
                        avatar = "img/spixiavatar.png";

                        if (friend.type == FriendType.Group)
                        {
                            avatar = "img/spixi-group-avatar.png";
                        }
                    }
                    avatar = Utils.imageToDataUri(avatar);   // X1

                    /* ⚠ AUDIT MINOR: this is the CONTACTS DIRECTORY push, and home.html ignores
                     * its 5th argument outright (`addContact(..., _unread)`). The badge dial lives
                     * on the CHAT-LIST path — getFriendMessageHelper below, plus the live
                     * setContactStatus ticks — so this site keeps the original call rather than
                     * carrying a change that does nothing while reading like it does. */
                    Utils.sendUiCommand(this, "addContact", friend.walletAddress.ToString(), friend.nickname, avatar, str_online, friend.getUnreadMessageCount().ToString());
                    // ★ MUTE-UX: the row's muted state, additive — an older shell ignores it.
                    Utils.sendUiCommand(this, "setChatMuted", friend.walletAddress.ToString(),
                        SNotificationPrefs.isChatMuted(friend) ? "1" : "0");
                }
            }
        }

        // CH5: does this chat carry an unread @-mention of my nick? No mention protocol
        // exists, so this is a TEXT HEURISTIC: scan the tail of the current channel for
        // unread incoming standard messages containing "@<nick>" (case-insensitive,
        // capped at 50). Groups/bots only — a 1:1 mention indicator would be noise.
        private bool hasUnreadMention(Friend friend)
        {
            if (!friend.bot && friend.type != FriendType.Group)
            {
                return false;
            }
            if (friend.getUnreadMessageCount() <= 0)
            {
                return false;
            }
            string nick = IxianHandler.localStorage.nickname;
            if (nick == null || nick == "")
            {
                return false;
            }
            var messages = friend.getMessages(friend.metaData.lastMessageChannel);
            if (messages == null)
            {
                return false;
            }
            int scanned = 0;
            for (int i = messages.Count - 1; i >= 0 && scanned < 50; i--, scanned++)
            {
                FriendMessage msg = messages[i];
                if (msg.localSender || msg.read)
                {
                    continue;
                }
                if (msg.type == FriendMessageType.standard
                    && msg.message.Contains("@" + nick, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
            return false;
        }

        private FriendMessageHelper? getFriendMessageHelper(Friend friend)
        {
            FriendMessage? lastmsg = friend.metaData.lastMessage;

            if (lastmsg == null)
            {
                return null;
            }

            string str_online = "false";
            if (friend.online)
                str_online = "true";

            /* ★★★ ISSUE 2 (Damir on device, twice): "in chat it's a double check, in the
             * chats row it's still a clock — on restart still the same."
             *
             * ⚠ `friend.metaData.lastMessage` IS A SERIALIZED COPY — `Friend.setLastMessage`
             * does `new FriendMessage(msg.getBytes())` — and NOTHING refreshes it when a
             * reaction lands: `addReaction` never calls it. So the snapshot carries ZERO
             * reactions, the delivery question reads it and always answers false, and the
             * row falls through to the stale flags. It survives a restart because the
             * snapshot is what was persisted.
             *
             * The self-heal below already existed and already re-fetches the LIVE message —
             * it was simply gated on `!sent && !confirmed`, which skips exactly the case
             * that needs it. A localSender message now always resolves against the live
             * list before anything is derived from it. One `Find` on a list already in
             * memory, on a path that already re-runs every second. */
            if (lastmsg.localSender)
            {
                var msgs = friend.getMessages(friend.metaData.lastMessageChannel);
                var msg = friend.getMessage(friend.metaData.lastMessageChannel, lastmsg.id);
                if (msg != null)
                {
                    /* ★ ALWAYS take the live instance — it is the one that carries the
                     * reactions. The metaData copy is only re-persisted when a stored FLAG
                     * actually moved, so this does not add a write per tick. */
                    lastmsg = msg;
                    if (msg.sent != friend.metaData.lastMessage.sent
                        || msg.confirmed != friend.metaData.lastMessage.confirmed
                        || msg.read != friend.metaData.lastMessage.read
                        || msg.errorSending != friend.metaData.lastMessage.errorSending)
                    {
                        friend.metaData.setLastMessage(msg, friend.metaData.lastMessageChannel);
                        friend.saveMetaData();
                    }
                }
                else if (msgs == null
                            || msgs.Count == 0)
                {
                    if (friend.metaData.unreadMessageCount != 0)
                    {
                        lastmsg.sent = true;
                        friend.metaData.unreadMessageCount = 0;
                        friend.saveMetaData();
                    }
                    return null;
                }
            }

            // Generate the excerpt depending on message type
            string excerpt = lastmsg.message;
            bool skipSelfPrefix = false;   // #265: "You: No answer" reads wrong (see below)

            if (friend.state != FriendState.Approved)
            {
                if (friend.bot == false)
                {
                    excerpt = SpixiLocalization._SL("chat-waiting-for-response");
                }
            }
            else
            {
                if (lastmsg.type == FriendMessageType.requestFunds)
                {
                    if (lastmsg.localSender)
                    {
                        excerpt = SpixiLocalization._SL("index-excerpt-payment-request-sent");
                    }
                    else
                    {
                        excerpt = SpixiLocalization._SL("index-excerpt-payment-request-received");
                    }
                }
                else if (lastmsg.type == FriendMessageType.sentFunds)
                {
                    if (lastmsg.localSender)
                    {
                        excerpt = SpixiLocalization._SL("index-excerpt-payment-sent");
                    }
                    else
                    {
                        excerpt = SpixiLocalization._SL("index-excerpt-payment-received");
                    }
                }
                else if (lastmsg.type == FriendMessageType.appSession)
                {
                    if (lastmsg.localSender)
                    {
                        excerpt = SpixiLocalization._SL("chat-app-invite-sent");
                    }
                    else
                    {
                        excerpt = SpixiLocalization._SL("chat-app-invite-received");
                    }
                }
                else if (lastmsg.type == FriendMessageType.requestAdd)
                {
                    if (friend.approved)
                    {
                        excerpt = SpixiLocalization._SL("index-excerpt-contact-accepted");
                    }
                    else
                    {
                        excerpt = SpixiLocalization._SL("index-excerpt-contact-request");
                    }
                }
                else if (lastmsg.type == FriendMessageType.fileHeader)
                {
                    excerpt = SpixiLocalization._SL("index-excerpt-file");
                }
                else if (lastmsg.type == FriendMessageType.voiceCall || lastmsg.type == FriendMessageType.voiceCallEnd)
                {
                    // #265 (Damir): the row said "Voice Call" for EVERY call — a missed
                    // call is the one you most need to see in the list. Derive the same
                    // way the chat bubble does (SingleChatPage:1616-1630): an EMPTY
                    // message on an ended/session-less call = never connected →
                    // "Missed call" (incoming) / "No answer" (outgoing). A duration
                    // means it connected → the plain call label.
                    excerpt = SpixiLocalization._SL("index-excerpt-voice-call");
                    // #572 ④: the row keys on the SAME evidence the bubble does, so a
                    // declined call cannot say "Missed call" in one place and not the other.
                    bool declinedLocally = VoIPManager.isDeclinedLocally(lastmsg);
                    if ((lastmsg.message == "" || declinedLocally)
                        && (lastmsg.type == FriendMessageType.voiceCallEnd || !VoIPManager.hasSession(lastmsg.id)))
                    {
                        excerpt = declinedLocally
                            ? (SpixiLocalization._SL("chat-call-declined") ?? "Call declined")
                            : lastmsg.localSender
                            ? SpixiLocalization._SL("chat-call-no-answer")
                            : SpixiLocalization._SL("chat-call-missed");
                        // review NIT: "You: No answer" reads wrong — the label already
                        // says whose side it was. Skip the self-prefix for this one.
                        skipSelfPrefix = true;
                    }
                }

                if (lastmsg.localSender && !skipSelfPrefix)
                {
                    excerpt = SpixiLocalization._SL("index-excerpt-self") + " " + excerpt;
                }
            }

            string? avatar = IxianHandler.localStorage.getAvatarPath(friend.walletAddress.ToString());
            if (avatar == null)
            {
                avatar = "img/spixiavatar.png";

                if (friend.type == FriendType.Group)
                {
                    avatar = "img/spixi-group-avatar.png";
                }
            }
            avatar = Utils.imageToDataUri(avatar);   // X1 (feeds both addChat pushes via the helper)

            string type = "";

            if (friend.isTyping)
            {
                excerpt = SpixiLocalization._SL("index-excerpt-typing");
                type = "typing";
            }
            else if (lastmsg.localSender && lastmsg.type != FriendMessageType.voiceCallEnd)
            {
                /* ★★ L2 (#641) — THE CHATS ROW OBEYS THE SAME GROUP RULE AS THE BUBBLE.
                 *
                 * The first cut of this row forced `read = false` for a group at the CHAT
                 * push and left this derivation alone, so the same message could show a grey
                 * double check in the conversation and a GREEN one in the list beside it —
                 * on a tablet, both on screen at once. Core's `Friend.addReaction` does set
                 * the stored `read` when every member reports `seen:`, and `UIHelpers`
                 * refreshes both surfaces from the same event.
                 * ⚠ "Count the surfaces, not the fix" — the rule this row was written under,
                 * broken by the row itself. Groups only; a bot room is FriendType.Normal
                 * with `bot` true and never reports reads anyway. */
                bool isGroupRow = friend.type == FriendType.Group;
                /* ⚠ THE FIRST FIX FOR THIS ROW PATCHED ONLY HALF OF IT, and the
                 * break-my-verdict pass caught the other half. Re-routing `read` stopped the
                 * GREEN tick, but the chats row still read the STORED `confirmed`, which
                 * Core only sets at the full member count — so at one confirmed member the
                 * bubble showed a double check and the list beside it showed a single one.
                 * The derivation has to live wherever the answer is rendered, which is the
                 * whole point of "count the surfaces". */
                /* ★★ #647 round 4 — ONE HOME. This row asks the same method the bubble
                 * tick and the expiry ask: UIHelpers.anyOtherMemberHasMessage. Do not
                 * spell the rule out here and do not add a reaction key here.
                 * ⚠ This row passes `false` as the unreadable answer. It must not claim
                 * a delivery it cannot see. markGroupCopyFailed passes `true`, because a
                 * false red FAILED cannot be cleared. The two directions are deliberate.
                 * ⚠ The room test comes FIRST, so a 1:1 chat never calls the method. */
                if (lastmsg.errorSending)
                {
                    type = "failed";
                }
                else if (lastmsg.read && !isGroupRow)
                {
                    type = "read";
                }
                else
                {
                    // ★ review N-1: computed only when the two cheap branches above miss —
                    // anyOtherMemberHasMessage takes a lock and walks reactions, and this
                    // helper runs per row per flush.
                    bool groupDelivered = isGroupRow && lastmsg.localSender
                        && (lastmsg.confirmed
                            || UIHelpers.anyOtherMemberHasMessage(friend, lastmsg, false));
                    if (lastmsg.confirmed || groupDelivered
                        || (isGroupRow && lastmsg.read))
                    {
                        type = "confirmed";
                    }
                    else if (lastmsg.sent)
                    {
                        type = "pending";
                    }
                    else
                    {
                        type = "default";
                    }
                }
            }

            // ★ THE BADGE DIAL: the TRUE count — see the addContact site. FriendMessageHelper
            // lives in Ixian-Core and cannot carry a muted flag, so the mute rides its own
            // additive `setChatMuted` push instead.
            /* ★ #719 (Damir's walk, 2026-08-30): a row with an unread badge and NO excerpt was
             * seen on BOTH sides of a contact request (the requester after accept; the
             * acceptor after the handshake). No branch above yields an empty excerpt for a
             * message with text, so the message itself must be empty — and this line says
             * which type wrote it. Diagnostic only: type, flags and lengths, never content. */
            // ★ review MINOR-5: CAPPED — this helper runs per row per flush (≈1 Hz with a
            // receipt storm on top), so one unapproved bot row could print thousands of
            // lines into the 5-file rolling log the other probes share. Twelve lines
            // answer #719's question; the cap resets with the process.
            if (string.IsNullOrEmpty(excerpt) && excerptDiagLogged < 12)
            {
                excerptDiagLogged++;
                Logging.info("[EXCERPTDIAG] empty excerpt: type={0} local={1} state={2} approved={3} unread={4} msgLen={5} id={6}",
                    lastmsg.type, lastmsg.localSender, friend.state, friend.approved, friend.metaData.unreadMessageCount,
                    lastmsg.message?.Length ?? -1, lastmsg.id != null ? Crypto.hashToString(lastmsg.id) : "null");
            }
            FriendMessageHelper helper_msg = new(friend.walletAddress.ToString(), friend.nickname, lastmsg.timestamp, avatar, str_online, excerpt, type, friend.metaData.unreadMessageCount);
            return helper_msg;
        }

        public void updateChat(Friend friend)
        {
            lock (refreshLock)
            {
                var fmh = getFriendMessageHelper(friend);
                if (fmh == null)
                {
                    return;
                }

                // CH2: an incoming contact request goes to the REQUESTS feed, not a chat row —
                // mirror loadChats here so a LONE updateChat (a message event, e.g. the arriving
                // requestAdd) doesn't briefly render the request as a normal, button-less,
                // tappable chat row (Damir F5: a half-second window where tapping the row acted
                // on the request). addRequest is a lone push — the FE upserts + re-renders.
                var lm = friend.metaData.lastMessage;
                if (!friend.approved && lm != null && lm.type == FriendMessageType.requestAdd && !lm.localSender)
                {
                    Utils.sendUiCommand(this, "addRequest", fmh.walletAddress, fmh.nickname, fmh.avatar, fmh.timestamp.ToString());
                    return;
                }

                // CH1: trailing chat kind (group/bot/1:1) · CH5: unread @-mention flag.
                // New args go LAST — never reorder.
                Utils.sendUiCommand(this, "addChat", fmh.walletAddress, fmh.nickname, fmh.timestamp.ToString(), fmh.avatar, fmh.onlineString, fmh.excerpt, fmh.type, fmh.unreadCount.ToString(), friend.bot ? "bot" : (friend.type == FriendType.Group ? "group" : ""), hasUnreadMention(friend).ToString());
            }
        }

        // CH8: a counterpart reacted — push a structured reaction excerpt to the chats
        // list (reactions never become lastMessage, so addChat can't carry this).
        public void updateChatReaction(Friend friend, Address reactor_address, string reaction)
        {
            if (reactor_address == null
                || IxianHandler.getWalletStorage().isMyAddress(reactor_address))
            {
                return;
            }

            lock (refreshLock)
            {
                string nick = friend.nickname;
                if (friend.bot || friend.type == FriendType.Group)
                {
                    nick = "";
                    if (friend.users.hasUser(reactor_address) && friend.users.getUser(reactor_address).getNick() != "")
                    {
                        nick = friend.users.getUser(reactor_address).getNick();
                    }
                }

                Utils.sendUiCommand(this, "addChatReaction", friend.walletAddress.ToString(), nick, reaction, Clock.getTimestamp().ToString());
            }
        }

        /* ★★ #565 ② — THE OWED CAPTURE: contacts appear only on the 3rd restart after a
         * restore, and BOTH earlier captures (#571 ②) ended before the chat list flushed.
         * This is the window that decides it, and it prints the three numbers that split
         * the three candidate layers apart:
         *   · Acc files on disk = 0  → the RESTORE did not land the tree (ours, #565)
         *   · Acc files > 0 but friends = 0 → LocalStorage.readAccountFile did not read
         *     it back on this boot (core — a BE row, not ours to patch)
         *   · friends > 0 but rows = 0 → the FLUSH dropped them (ours, this method)
         * Gate note: counts and one boolean. No address, no nickname, no filename. */
        static int restoreDiagRuns = 0;

        private static int accFileCount()
        {
            try
            {
                string acc = Path.Combine(Config.spixiUserFolder, "Acc");
                return Directory.Exists(acc) ? Directory.GetFiles(acc, "*", SearchOption.AllDirectories).Length : -1;
            }
            catch (Exception)
            {
                return -2;   // unreadable — distinct from "absent" (-1) and from "empty" (0)
            }
        }

        private void loadChats()
        {
            List<Friend> friends;
            lock (FriendList.friends)
            {
                friends = new List<Friend>(FriendList.friends);
            }

            /* The first runs after process start are the boot window; an EMPTY roster is
             * always worth a line, however late it happens. Everything else is silent, so
             * a long session does not bury the evidence. */
            bool diag = restoreDiagRuns < 8 || friends.Count == 0;
            if (diag)
            {
                restoreDiagRuns++;
                Logging.info("[RESTOREDIAG] loadChats run {0}: friends={1} accFiles={2}", restoreDiagRuns, friends.Count, accFileCount());
            }

            lock (refreshLock)
            {
                // Check if there are any changes from last time first
                int unread = 0;
                foreach (Friend friend in friends)
                {
                    // #572 ①: heal the stale count BEFORE it is read, so the same flush
                    // that hides the row also stops feeding the indicator.
                    healOutgoingRequestUnread(friend);
                    int umc = friend.getUnreadMessageCount();
                    if (umc > 0)
                    {
                        unread += umc;
                    }
                }

                if (unread > 0)
                {
                    Utils.sendUiCommand(this, "setUnreadIndicator", unread.ToString());
                }
                else
                {
                    Utils.sendUiCommand(this, "setUnreadIndicator", "0");
                }

                Utils.sendUiCommand(this, "clearChats");
                // CH2: incoming contact requests are their OWN feed (not chat rows) — clear it
                // within the same flush so clearChatsDone renders chats + requests together.
                Utils.sendUiCommand(this, "clearRequests");

                // Prepare a list of message helpers, to facilitate sorting and communication with the UI
                List<FriendMessageHelper> helper_msgs = new List<FriendMessageHelper>();
                // CH2: incoming contact requests (their requestAdd, not yet approved) → requests feed
                List<FriendMessageHelper> request_msgs = new List<FriendMessageHelper>();
                // CH1: chat kind per wallet address (FriendMessageHelper lives in Ixian-Core — no new field)
                Dictionary<string, string> chat_kinds = new Dictionary<string, string>();
                // CH5: unread @-mention flag per wallet address
                Dictionary<string, bool> mention_flags = new Dictionary<string, bool>();

                foreach (Friend friend in friends)
                {
                    if (friend.pendingDeletion)
                    {
                        continue;
                    }

                    var helper_msg = getFriendMessageHelper(friend);
                    if (helper_msg == null)
                    {
                        continue;
                    }

                    // CH2: an INCOMING contact request (they sent a requestAdd, I haven't approved)
                    // goes to the requests feed with Accept/Decline — NOT the chat list. Detected
                    // from the last message (their requestAdd, !localSender); an OUTGOING request I
                    // sent (localSender) stays a normal "waiting for response" chat row.
                    // NOTE (graceful degrade): this keys on the LAST message being the requestAdd —
                    // if an unapproved friend sends a follow-up before I accept, they fall through to
                    // the chat list; opening that row still offers the legacy in-chat Accept/Decline.
                    var lm = friend.metaData.lastMessage;
                    if (!friend.approved && lm != null && lm.type == FriendMessageType.requestAdd && !lm.localSender)
                    {
                        request_msgs.Add(helper_msg);
                        continue;
                    }

                    helper_msgs.Add(helper_msg);
                    chat_kinds[helper_msg.walletAddress] = friend.bot ? "bot" : (friend.type == FriendType.Group ? "group" : "");
                    mention_flags[helper_msg.walletAddress] = hasUnreadMention(friend);
                }

                // Sort the helper messages
                List<FriendMessageHelper> sorted_msgs = helper_msgs.OrderByDescending(x => x.timestamp).ToList();
                int chatRowsPushed = sorted_msgs.Count;
                int requestRowsPushed = request_msgs.Count;

                // Add the messages visually
                foreach (FriendMessageHelper helper_msg in sorted_msgs)
                {
                    // CH1: trailing chat kind · CH5: mention flag. New args go LAST — never reorder.
                    Utils.sendUiCommand(this, "addChat", helper_msg.walletAddress, helper_msg.nickname, helper_msg.timestamp.ToString(), helper_msg.avatar, helper_msg.onlineString, helper_msg.excerpt, helper_msg.type, helper_msg.unreadCount.ToString(), chat_kinds[helper_msg.walletAddress], mention_flags[helper_msg.walletAddress].ToString());
                }

                // CH2: incoming contact requests (newest first) — the FE renders these as
                // Accept/Decline request cards + drives the Requests filter chip.
                foreach (FriendMessageHelper rm in request_msgs.OrderByDescending(x => x.timestamp))
                {
                    Utils.sendUiCommand(this, "addRequest", rm.walletAddress, rm.nickname, rm.avatar, rm.timestamp.ToString());
                }

                // Clear the lists so they will be collected by the GC
                helper_msgs = null;
                request_msgs = null;
                sorted_msgs = null;
                chat_kinds = null;
                mention_flags = null;

                if (diag)
                {
                    Logging.info("[RESTOREDIAG] loadChats flushed: chats={0} requests={1} unread={2}", chatRowsPushed, requestRowsPushed, unread);
                }
                Utils.sendUiCommand(this, "clearChatsDone");
                warmAccountAfterFirstPaint();
            }
        }

        /* ★ Batch C (#546) C3 — #533 ②: ACCOUNT WARM-BOOT AFTER FIRST PAINT. Once the
         * chats list has flushed for the first time (clearChatsDone), pre-create the
         * SettingsPage into the PARKED slot (#315) — hidden, loaded, its data pushed —
         * so the first Account tap is the instant representParkedOverlay path. NEVER
         * at boot: the delay is what keeps the boot cost at zero (the chats list wins
         * the CPU; this runs once, a beat later). Narrow (non-rail) mode only — the rail
         * pane builds a pane-geometry page that a park cannot re-present (#315 scope
         * guard). Fail-closed in warmParkedOverlay (lock up, preload in flight, a parked
         * page already there → nothing happens). Node.onLowMemory still disposes the
         * parked page under real pressure (#315 kept). */
        private bool accountWarmed = false;
        private void warmAccountAfterFirstPaint()
        {
            if (accountWarmed)
            {
                return;
            }
            accountWarmed = true;
            MainThread.BeginInvokeOnMainThread(async () =>
            {
                try
                {
                    await Task.Delay(900);   // let the first list paint and its images settle
                    bool wide = rightContent.IsVisible;
                    bool railPane = wide && (DeviceInfo.Platform == DevicePlatform.WinUI
                                             || DeviceInfo.Platform == DevicePlatform.MacCatalyst);
                    if (railPane)
                    {
                        return;
                    }
                    if (!warmParkedOverlay(new SettingsPage()))
                    {
                        Logging.info("account warm-boot skipped (guard)");
                    }
                }
                catch (Exception ex)
                {
                    Logging.warn("account warm-boot failed: " + ex.Message);
                }
            });
        }

        public static IxiNumber calculateReceivedAmount(Transaction tx)
        {
            IxiNumber amount = 0;
            foreach (var entry in tx.toList)
            {
                if (IxianHandler.getWalletStorage().isMyAddress(entry.Key))
                {
                    amount += entry.Value.amount;
                }
            }
            return amount;
        }

        public void filterTransactions(string filter)
        {
            switch (filter)
            {

                case "sent":
                    {
                        transactionFilter = 1;
                        break;
                    }
                case "received":
                    {
                        transactionFilter = 2;
                        break;
                    }
                default:
                case "all":
                    {
                        transactionFilter = 0;
                        break;
                    }

            }
            loadTransactions(true);
        }
        public string filterToString(int filter)
        {
            switch (filter)
            {
                case 1:
                    return "sent";
                case 2:
                    return "received";
                case 0:
                default:
                    return "all";
            }
        }

        public void loadTransactions(bool forceRefresh)
        {
            /* ★★ ROUND 2 — THIS FLUSH MUST NEVER RUN ON THE UI THREAD.
             * The body below reads the WHOLE activity history: count 0 means unlimited,
             * and every surviving row costs one getActivityById under Ixian-Core's storage
             * lock. Two callers reach it from the UI thread — the tab2 branch of the shell
             * URL handler (:847) and filterTransactions (:2367) — and a third runs it on
             * Node.updateUILoop's pool thread every 2 s (:2763).
             * Before txPushLock a tap paid for its own scan. With txPushLock a tap ALSO
             * waited for the tick's scan. Either way the Wallet tab freezes under the
             * finger, and the second one is a freeze this batch would have added.
             * One guard removes both, and it removes the older half as well: hand the work
             * to the pool and return at once. Nothing is lost — every row leaves through
             * Utils.sendUiCommand, which marshals to the main thread itself
             * (SpixiContentPage.evaluateJavascript), so this method never needed the UI
             * thread. Neither UI caller reads state after the call.
             * ⚠ The recursion terminates. Task.Run always runs on a thread-pool thread,
             * where MainThread.IsMainThread is false, so the second entry falls through to
             * the lock.
             * ⚠ The catch is not decoration. On the UI thread a throw used to reach the
             * caller's handler. On the pool it would be an unobserved task exception.
             * ⚠ WHAT THIS TRADES. Two queued flushes may run in either order. That is
             * harmless here and only here: addPaymentActivity reads transactionFilter LIVE,
             * per row, so both runs paint the same list from the same field. Capture that
             * field into a local and the order stops being harmless. */
            if (MainThread.IsMainThread)
            {
                Task.Run(() =>
                {
                    try
                    {
                        loadTransactions(forceRefresh);
                    }
                    catch (Exception e)
                    {
                        Logging.error("Exception occurred in loadTransactions: " + e);
                    }
                });
                return;
            }
            lock (txPushLock)
            {
                if (!forceRefresh && !UIHelpers.shouldRefreshTransactions)
                {
                    return;
                }
                if (detailContent != null)
                {
                    detailContent.updateScreen();
                }
                UIHelpers.shouldRefreshTransactions = false;
                Utils.sendUiCommand(this, "clearPaymentActivity", filterToString(transactionFilter));

                void addPaymentActivity(ActivityObject activity)
                {
                    Transaction tx = activity.transaction;
                    string received = "1";
                    string tx_text = tx.pubKey.ToString();
                    IxiNumber amount = tx.amount;
                    if (IxianHandler.getWalletStorage().isMyAddress(tx.pubKey))
                    {
                        tx_text = tx.toList.First().Key.ToString();
                        Friend? friend = FriendList.getFriend(tx.toList.First().Key);
                        if (friend != null)
                        {
                            tx_text = friend.nickname;
                        }

                        received = "0";
                        if (transactionFilter == 2)
                            return;
                    }
                    else
                    {
                        Friend? friend = FriendList.getFriend(tx.pubKey);
                        if (friend != null)
                        {
                            tx_text = friend.nickname;
                        }
                        amount = calculateReceivedAmount(tx);
                        if (transactionFilter == 1)
                            return;
                    }
                    string amount_string = Utils.amountToHumanFormatString(amount);
                    string fiat_amount_string = Utils.amountToHumanFormatString(amount * Node.fiatPrice);

                    string confirmed = "error";
                    if (activity.status == IXICore.Activity.ActivityStatus.Final)
                    {
                        confirmed = "true";
                    }
                    else if (activity.status == IXICore.Activity.ActivityStatus.Pending)
                    {
                        confirmed = "false";
                    }
                    else if (activity.status == IXICore.Activity.ActivityStatus.Unknown)
                    {
                        confirmed = "unknown";
                    }
                    else
                    {
                        confirmed = "error";
                    }

                    // iOS-55 (#325, W1 LANDED): push the RAW EPOCH (seconds) — the shell
                    // formats it via formatTxTimestamp/docLocale, the same translation
                    // machinery as chat rows. The old pre-formatted string came out of
                    // DateTime.ToString under the .NET culture, which never follows the
                    // APP language (wallet rows stayed English under sl-si). The shell
                    // numeric-detects, so an OLD shell build shows raw digits only in a
                    // mismatched-build scenario (bundle always ships both together).
                    string time = activity.timestamp.ToString();
                    Utils.sendUiCommand(this, "addPaymentActivity", tx.getTxIdString(), received, tx_text, time, amount_string, fiat_amount_string, confirmed);
                }

                foreach (var activity in Node.activityStorage.getActivitiesByStatus(IXICore.Activity.ActivityStatus.Rejected, true))
                {
                    addPaymentActivity(activity);
                }

                foreach (var activity in Node.activityStorage.getActivitiesByStatus(IXICore.Activity.ActivityStatus.Reverted, true))
                {
                    addPaymentActivity(activity);
                }

                foreach (var activity in Node.activityStorage.getActivitiesByStatus(IXICore.Activity.ActivityStatus.Pending, true))
                {
                    addPaymentActivity(activity);
                }

                foreach (var activity in Node.activityStorage.getActivitiesBySeedHashAndType(IxianHandler.getWalletStorage().getSeedHash(), null, null, 0, true))
                {
                    if (activity.status == IXICore.Activity.ActivityStatus.Rejected
                        || activity.status == IXICore.Activity.ActivityStatus.Reverted
                        || activity.status == IXICore.Activity.ActivityStatus.Pending)
                    {
                        continue;
                    }
                    var activityWithTx = Node.activityStorage.getActivityById(activity.id, null, true);
                    addPaymentActivity(activityWithTx);
                }

                /* ★ #506③ — the END of the burst, which this flush never announced.
                 *
                 * Damir on device: the empty state arrives about a second late on wallet and
                 * mini-apps but not on chats. The row read that as "the other two lack the
                 * zeroReady gate chats has"; they do NOT — all three are gated. The gate IS
                 * the delay: chats opens it on the real clearChatsDone verb, while wallet and
                 * apps had none and could only guess with a 400 ms quiet window after the last
                 * push.
                 *
                 * This method is synchronous and every push is already out, so the end of the
                 * burst is exactly here — no guessing left. Mirrors clearChatsDone (:2299),
                 * which has carried the same job for the chats flush since #189.
                 * ⚠ The shell keeps its quiet-window timer as a BELT, so an older exe that
                 * never sends this still opens the gate on the old schedule. */
                Utils.sendUiCommand(this, "clearPaymentActivityDone");
            }
        }

        /* ★ N76 (#391, Damir's dial): does this account hold anything worth losing yet?
         *
         * The onboarding tail asked every new user to make a backup on the screen right
         * after account creation — the one moment they have NOTHING to protect and have
         * not seen the app. The tail is gone; the nudge now waits for the FIRST REAL
         * ASSET and fires once, and the 30-day period starts from there.
         *
         * A contact covers "a message was sent" on its own: there is no way to send one
         * without adding a contact first, and the contact is itself the thing a lost
         * account cannot rebuild. The BALANCE leg is not optional — funds can arrive
         * before any messaging happens at all.
         *
         * Cheap enough for the 1 Hz tick: a count and a cached balance, both already
         * read elsewhere in this file. Never throws the tick (the whole updateScreen
         * body is fenced, but a nudge must not be the thing that stops it). */
        private bool hasBackupWorthyAsset()
        {
            try
            {
                lock (FriendList.friends)
                {
                    /* ★ review MAJOR-3: a bare Count > 0 is not "an asset". It counts
                     * (a) the Spixi Group Chat bot, which the chat-list empty-state CTA this
                     * same batch added puts there on ONE tap — so the nudge fired a second
                     * after the user tapped Join, on an account with nothing to protect, and
                     * burned the 30-day slot; and (b) UNAPPROVED incoming contact requests,
                     * which live in this list too (loadChats reads them from here and routes
                     * them to the requests feed) — one unsolicited request on a fresh account
                     * did the same. An asset is a contact the user actually has: approved,
                     * not queued for deletion, not the bot.
                     *
                     * ★ F-1 (#395, #399): the guard above read `friend.approved`, and that flag
                     * is DEAD for this purpose. `Friend.approved` DEFAULTS TO TRUE
                     * (Ixian-Core Friend.cs:196; ctor :233 `bool approve = true`) and every
                     * OUTGOING request in this app adds the friend without passing it
                     * (joinBot · ContactNewPage :195 · SingleChatPage :1426 ·
                     * SpixiContentPage.addContactByAddress) — line numbers deliberately omitted where
                     * this batch moved the code — so it is true from the moment you SEND a
                     * request, and the nudge fired on the community bot one second after the
                     * Join tap and on a scanned QR before the other side accepted. Only an
                     * INCOMING request clears it (CoreStreamProcessor :1763/:1837 pass false).
                     *
                     * The live signal is the STATE. All four outgoing sites pass
                     * FriendState.RequestSent; the handshake sets Approved
                     * (CoreStreamProcessor :1908/:1991/:2181/:2236); a pre-v6 stored friend is
                     * upgraded to Approved on load when an aes key is present (Friend.cs:341),
                     * so legacy accounts still count. Two useful consequences: a GROUP is
                     * created Approved (GroupChat.cs:34/:70) and counts, which is right — a
                     * group is not rebuildable either; and the community BOT never reaches
                     * Approved at all (handleAcceptAddBot :2072-2097 sets bot mode and the
                     * handshake status, never the state), so it is excluded even in the window
                     * before `bot` flips true. Keep `!friend.bot` as the belt. */
                    foreach (Friend friend in FriendList.friends)
                    {
                        if (friend != null && friend.state == FriendState.Approved && !friend.pendingDeletion && !friend.bot)
                        {
                            return true;
                        }
                    }
                }

                if (Node.getAvailableBalance() > 0)
                {
                    return true;
                }
            }
            catch (Exception e)
            {
                Logging.warn("Exception while testing for a backup-worthy asset: " + e);
            }

            return false;
        }

        private void displayBackupReminder()
        {
            if (!Preferences.Default.ContainsKey("backupReminderTimestamp"))
            {
                // ★ N76: no stamp = this account has never been nudged. Wait for the
                // first asset instead of firing on the first tick after creation.
                // A RESTORE seeds the stamp at the restore itself (LaunchPage.onRestore),
                // so a restored account skips this branch entirely and only ever sees the
                // 30-day reminder — "don't ask someone who just restored from a backup".
                if (!hasBackupWorthyAsset())
                {
                    return;
                }
            }
            else if (Clock.getTimestamp() - long.Parse(Preferences.Default.Get("backupReminderTimestamp", "").ToString()) <= Config.backupReminder)
            {
                return;
            }

            Utils.sendUiCommand(this, "toggleAnimatedSlider", "backup-prompt");
            Preferences.Default.Set("backupReminderTimestamp", Clock.getTimestamp().ToString());
        }

        private void updateDebugOverlay()
        {
            if (!devMode)
            {
                return;
            }

            string info = "";
            info += "<a title='Network Messages (Received/Sent/Error Sending)'><span>NETM:</span>" + RemoteEndpoint.receivedNetworkMessages + "/" + RemoteEndpoint.sentNetworkMessages + "/" + (RemoteEndpoint.toSendNetworkMessages - RemoteEndpoint.sentNetworkMessages) + "</a>";
            info += "<a title='Stream Messages (Received/To Send/Sent)'><span>STRM:</span>" + CoreStreamProcessor.receivedStreamMessages + "/" + PendingMessageProcessor.toSendStreamMessages + "/" + PendingMessageProcessor.sentStreamMessages + "</a>";
            info += "<a title='Offline Messages (Received/Sent)'><span>OFFM:</span>" + OfflinePushMessages.receivedOfflineMessages + "/" + OfflinePushMessages.sentOfflineMessages + "</a>";
            info += "<a title='Pending Stream Messages'><span>PSTRM:</span>" + CoreStreamProcessor.pendingMessageProcessor.countPendingMessages() + "</a>";
#if ANDROID
            /* ★ AND-7b (#407): show what the app actually asked the system bars for, live
             * and per tab. Damir reported the glyphs inverting against the app theme; the
             * rule here is instrument, do not guess (#215), and the on-screen probe is
             * faster for him than sharing a log. "glyphs=dark" = we asked for dark icons,
             * i.e. we believe the surface under them is light. */
            info += "<a title='System bars: colour asked for, its luminance, and the glyph colour requested'><span>BAR:</span>" + Spixi.SPlatformUtils.lastBarState + "</a>";
#endif
            Utils.sendUiCommand(this, "updateDebugInfo", info);
        }

        /* ★ #612: how many UNBLOCKED ticks a pending notification deep link may wait for
         * the friend to load. `updateUILoop` ticks every two seconds (Node.cs), so ten is
         * ~20 s of real waiting — a CEILING, not a target; the common case resolves on the
         * first tick. ⚠ Ticks spent BLOCKED (a lock up, a page staging) are not counted at
         * all: waiting is correct there and has no bound worth imposing, which is what
         * Android's equivalent does. The budget is keyed to the address it is counting for,
         * so a second tap does not inherit the first tap's spent ticks. */
        private const int STARTING_SCREEN_MAX_WAITS = 10;
        private int startingScreenWaits = 0;
        private string startingScreenPending = "";

        // Executed every second
        public override void updateScreen()
        {
            try
            {
                base.updateScreen();

                if (App.startingScreen != "")
                {
                    /* ★★ #612 (device row C8): A NOTIFICATION TAP LANDED ON THE CHATS LIST
                     * INSTEAD OF THE CHAT IT CAME FROM.
                     *
                     * The push carries `fa`, the sender's address, and the tap handler does
                     * read it — it writes it here. The defect is what happened next: the
                     * global was CLEARED first and the navigation attempted second, so every
                     * way the attempt could fail silently consumed the deep link.
                     *   · `onChat` returns without doing anything when the friend is not yet
                     *     in FriendList — a race a cold start is guaranteed to run;
                     *   · `pushPageLoaded` deliberately DROPS the target while a modal
                     *     overlay (the resume lock) is up, or while another page is staging.
                     *     Its own comment names this vector and says the link is lost.
                     * Android has never had the bug: `MainActivity.tryNavigateToChat` refuses
                     * to drive the navigation while those two predicates hold, and retries.
                     * The rule moves here, where both platforms pass: DO NOT CONSUME WHAT
                     * YOU HAVE NOT DELIVERED.
                     *
                     * ⚠ ROUND 2 (adversarial review). Three corrections, all of them the
                     * difference between a fix and a new defect:
                     *   1. THE COUNTER DOES NOT RUN WHILE BLOCKED. `updateUILoop` ticks every
                     *      TWO seconds (Node.cs), not one, so the first cut's ceiling was ~20s
                     *      — and it burned that budget during the LOCK, which is the one state
                     *      where waiting is unambiguously right. Enter a password slowly and
                     *      the link was dropped before the lock closed: the very symptom this
                     *      is fixing. Android counts only unblocked attempts; so does this.
                     *   2. IT NO LONGER SWALLOWS THE TICK. `return`ing on every unresolved
                     *      tick skipped connectivity, the update banner, the backup reminder
                     *      and the periodic loaders for the whole wait — during a cold start,
                     *      which is exactly when the user is watching.
                     *   3. THE BUDGET IS KEYED TO THE ADDRESS. A second tap overwrites
                     *      `App.startingScreen`, and an un-keyed counter handed the new link
                     *      the old link's spent budget. */
                    string startingScreen = App.startingScreen;
                    if (startingScreenPending != startingScreen)
                    {
                        startingScreenPending = startingScreen;
                        startingScreenWaits = 0;
                    }
                    bool blocked = SpixiContentPage.hasModalOverlay() || SpixiContentPage.isLockStaging();
                    bool known = false;
                    bool usable = true;
                    try
                    {
                        known = !blocked && FriendList.getFriend(new Address(startingScreen)) != null;
                    }
                    catch (Exception e)
                    {
                        // an unparseable address can never resolve — drop it rather than retry
                        Logging.error("Start screen address is not usable, dropping the deep link: " + e);
                        usable = false;
                    }
                    if (!usable)
                    {
                        App.startingScreen = "";
                        startingScreenPending = "";
                        startingScreenWaits = 0;
                    }
                    else if (known)
                    {
                        App.startingScreen = "";
                        startingScreenPending = "";
                        startingScreenWaits = 0;
                        try
                        {
                            onChat(new Address(startingScreen), null);
                        }
                        catch (Exception e)
                        {
                            Logging.error("Error in selecting start screen: " + e);
                        }
                        return;
                    }
                    else if (!blocked && ++startingScreenWaits >= STARTING_SCREEN_MAX_WAITS)
                    {
                        Logging.warn("Start screen gave up after " + startingScreenWaits
                            + " unblocked ticks — the deep link is dropped");
                        App.startingScreen = "";
                        startingScreenPending = "";
                        startingScreenWaits = 0;
                    }
                    // and fall through: the rest of this tick still runs while we wait
                }

                /* ★ N40 (#383, Damir 2026-08-18): connectivity and "update available" were the
                 * two arms of ONE if/else. Three defects came out of that:
                 *   1. An advertised update hid the offline state FOREVER — the connectivity
                 *      arm was simply unreachable. The version check runs on a 1-hour period
                 *      (Config.cs:47), which is why the state was honest at boot and gone
                 *      "after long use" (the whole D-21/N40 symptom).
                 *   2. The update arm never owned `warningDisplayed`, so the latch it competed
                 *      for was left true and the `if (!warningDisplayed)` guard blocked the
                 *      offline push even if the arm had been reachable.
                 *   3. A throw anywhere in the version computation took the connectivity state
                 *      with it, on every tick, silently.
                 * Fix: connectivity FIRST and UNCONDITIONALLY, in its own try, and BEFORE every
                 * other worker in this method (review MINOR-5: a recurring throw in
                 * displayBackupReminder/loadApps/loadChats/loadTransactions aborts the tick
                 * and would starve connectivity through a different door); the version
                 * check runs last, in its own try. Damir's dial: BOTH may show — the shell
                 * routes them to different regions (title-state vs banner, home.html) and no
                 * longer clears one when the other lands. */
                try
                {
                    // Check the ixian dlt
                    if (NetworkClientManager.getConnectedClients(true).Count() > 0)
                    {
                        if (warningDisplayed)
                        {
                            Utils.sendUiCommand(this, "showWarning", "");
                            warningDisplayed = false;
                        }
                        connectivityWarningDelayCounter = 0;
                        // ★ N70: the offline→online EDGE. Nothing else in the app sees it.
                        // ★ #443: the edge is consumed only when the re-arm could actually
                        // ANSWER. If the very first check is still in flight when the network
                        // returns (!ready && !error), clearing the flag here threw the edge
                        // away and the next answer waited a full checkVersionSeconds — one
                        // hour — which is the same "never appears" the row was opened for,
                        // just slower. Holding the flag costs one early-returning call per
                        // tick and re-tries on the next tick instead.
                        if (sawOffline && rearmUpdateCheck())
                        {
                            sawOffline = false;
                        }
                    }
                    else
                    {
                        sawOffline = true;
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
                }
                catch (Exception e)
                {
                    Logging.error("Exception occurred in HomePage.UpdateScreen: " + e);
                }

                displayBackupReminder();

                loadApps(false);

                if (UIHelpers.shouldRefreshContacts)
                {
                    loadChats();
                    loadContacts();
                    UIHelpers.shouldRefreshContacts = false;
                }

                updateContactStatus();
                loadTransactions(false);

                try
                {
                    string cur_version = Config.version.Substring(Config.version.IndexOf('-') + 1);

                    string new_version = checkForUpdate();
                    new_version = !new_version.StartsWith("(") ? new_version.Substring(new_version.IndexOf('-') + 1) : cur_version;

                    if (UpdateVerify.compareVersionsWithSuffix(new_version, cur_version) > 0)
                    {
                        /* Pushed EVERY tick, as it always was. Review MINOR-3: a C#-side
                          * "pushed already" latch is the D-20/#357 strand class all over again
                          * — a tick that lands in a reload window latches a DYING document and
                          * the notice is gone for the session. It is also redundant: the shell
                          * refuses a re-push of a notice the user dismissed (home.html
                          * dismissedNotice), so the dismissal survives without C# state. */
                        Utils.sendUiCommand(this, "showWarning", String.Format(SpixiLocalization._SL("global-update-available"), new_version));
                    }
                }
                catch (Exception e)
                {
                    Logging.error("Exception occurred in HomePage.UpdateScreen: " + e);
                }
                /* ★ #440/#443 — BLOCKCHAIN-SCAN PROGRESS. Every number already exists in
                 * the build; nothing in Spixi/Pages read block height before this.
                 *   current = IxianHandler.getLastBlockHeight() → Node.cs:599, the
                 *             TIV header scan's own position.
                 *   target  = IxianHandler.getHighestKnownNetworkBlockHeight() → Core's
                 *             default (IxianNode.cs:101) → a middle-third majority over
                 *             connected peers, clamped by a time estimate.
                 *   origin  = the FIRST non-zero height this session saw. ⚠ NOT
                 *             CoreConfig.bakedBlockHeight: a resumed run continues from
                 *             stored headers nowhere near it, so anchoring there makes
                 *             every launch read a few percent while the client is current.
                 * ★ ZERO IS UNKNOWN. getLastBlockHeight() is 0 before the first header
                 * lands and determineHighestNetworkBlockNum() is 0 with no peers —
                 * dividing them gives a confident 0%. Both are passed through verbatim
                 * and the shell owns the indeterminate state.
                 * Pushed only on CHANGE: this runs every second and the scan steps 250
                 * headers at a time, so an unconditional push would be mostly noise. */
                try
                {
                    ulong scanCurrent = IxianHandler.getLastBlockHeight();
                    /* ★ #453, Damir on device: the bar restarted at 0% on EVERY launch even
                     * after #451 persisted the anchor — because of WHICH height we asked for.
                     * `getHighestKnownNetworkBlockHeight()` is max(OUR height, the peer
                     * majority), and the majority is 0 until peers connect. So for the first
                     * seconds of every launch it returned our OWN height, target == current,
                     * the caught-up test below read that as "current" and WIPED the anchor.
                     * Peers then arrived, target jumped, and the anchor re-set to wherever
                     * the scan was: 0%. It also made the row vanish in that same window.
                     * `determineHighestNetworkBlockNum()` returns 0 with no peers, which is
                     * the "we do not know yet" signal — and the shell already owns that
                     * state as INDETERMINATE. So ask for the raw answer and pass the zero
                     * through instead of hiding it behind a max(). */
                    ulong scanTarget = CoreProtocolMessage.determineHighestNetworkBlockNum();

                    /* ★ F6 — THE FIX, and the device log is what found it. #453 already
                     * handled "no peers yet" (target 0) and "target == current at boot". It
                     * did NOT handle a target that is a real, non-zero, WILDLY STALE number:
                     *     [SCANDIAG] current=6028792 target=5333999 origin=0 lag=-694793
                     * — the peer majority reporting a height ~700 000 blocks behind us, for
                     * roughly the first 40 seconds of a run.
                     *
                     * That single bad reading caused BOTH halves of what Damir saw:
                     *   · the shell's caught-up test is `lag <= 2`, and a NEGATIVE lag
                     *     satisfies it, so the row vanished while the phone was 150 000
                     *     blocks behind — "appears and disappears at random";
                     *   · worse, the anchor logic below read it as caught up and RETIRED the
                     *     origin, so when the target corrected the bar re-anchored to the
                     *     current height and restarted from 0 % — exactly his note, "the scan
                     *     was at 19 %, I restarted, and now there's no scan".
                     *
                     * A target we cannot believe is not "caught up", it is NOT KNOWN — and
                     * this codebase already has a channel for that, the zero the shell renders
                     * as indeterminate. So an implausible target is converted into it rather
                     * than given a new state of its own.
                     *
                     * ⚠ ADDITIVE comparison, never a ulong subtraction (#453, and the pin
                     * that caught the same class in this batch's own probe). */
                    if (scanTarget > 0 && scanCurrent > scanTarget + SCAN_TARGET_STALE_MARGIN)
                    {
                        Logging.info("[SCANDIAG] target " + scanTarget + " is below current "
                            + scanCurrent + " by more than " + SCAN_TARGET_STALE_MARGIN
                            + " — not credible, treating as UNKNOWN");
                        scanTarget = 0;
                    }

                    if (scanCurrent > 0)
                    {
                        if (!scanOriginLoaded)
                        {
                            scanOriginLoaded = true;
                            try
                            {
                                string stored = Preferences.Default.Get(SCAN_ORIGIN_PREF, "");
                                if (!string.IsNullOrEmpty(stored))
                                {
                                    ulong.TryParse(stored, out scanOriginBlock);
                                }
                            }
                            catch (Exception) { scanOriginBlock = 0; }
                        }

                        ulong newOrigin = scanOriginBlock;
                        /* ⚠ `scanTarget > 0` is the whole guard: a zero target means NO PEERS,
                         * not "caught up", and clearing on it is exactly the #453 bug.
                         * ⚠ And the comparison is ADDITIVE, never `scanTarget - scanCurrent`:
                         * these are ulongs, so a target BELOW the current height — normal
                         * when we are momentarily ahead of what peers report — underflows to
                         * an enormous number and the test silently never fires. */
                        if (scanTarget > 0 && scanTarget <= scanCurrent + SCAN_CURRENT_LAG)
                        {
                            // Caught up — retire the anchor so the NEXT gap starts at 0%.
                            newOrigin = 0;
                        }
                        else if (scanOriginBlock == 0 || scanCurrent < scanOriginBlock)
                        {
                            /* We just fell behind, OR the current height dropped below the
                             * anchor — a re-org, a restore or a storage reset. Without the
                             * second case the bar sits frozen at 0% for the whole catch-up
                             * and then jumps (audit MINOR-4). */
                            newOrigin = scanCurrent;
                        }
                        if (newOrigin != scanOriginBlock)
                        {
                            scanOriginBlock = newOrigin;
                            try { Preferences.Default.Set(SCAN_ORIGIN_PREF, scanOriginBlock.ToString()); }
                            catch (Exception) { }
                        }
                    }
                    if (scanCurrent != lastScanCurrent || scanTarget != lastScanTarget)
                    {
                        lastScanCurrent = scanCurrent;
                        lastScanTarget = scanTarget;
                        /* #456: FOURTH ARGUMENT, additive. The shell decides visibility —
                         * it is the side that knows the balance and the row count — so
                         * this only reports whether the wallet was generated here. An
                         * older shell ignores the extra argument. */
                        /* ★ F6 INSTRUMENTATION (log only — Damir: "the scan row appears and
                         * disappears at random"). #294 forbids building past a missing repro,
                         * and this one cannot be decided from source: BOTH suspects in
                         * scan-progress.js:164-224 are consistent with what he saw — the
                         * SHOW_LAG 20 / HIDE_LAG 2 hysteresis oscillating around the band,
                         * and the indeterminate (target == 0) frame un-hiding a row the lag
                         * test had just hidden, which is the #446 MAJOR shape turned on
                         * itself.
                         *
                         * The triple is logged at the PUSH, so the log shows exactly what the
                         * shell was told and in what order. `lag` is printed because it is
                         * the number the shell actually branches on: a log that alternates
                         * lag=3, lag=1, lag=25 is the hysteresis, while one that stays stable
                         * but is punctuated by target=0 frames is the indeterminate re-show.
                         * Two different fixes; one 60-second log tells them apart.
                         *
                         * Only fires when a value CHANGED (the enclosing guard), so a quiet
                         * chain writes nothing. */
                        Logging.info("[SCANDIAG] current=" + scanCurrent
                            + " target=" + scanTarget
                            + " origin=" + scanOriginBlock
                            + " lag=" + blockGap(scanTarget, scanCurrent)
                            + " createdHere=" + (walletCreatedHere ? "1" : "0"));
                        Utils.sendUiCommand(this, "setScanProgress",
                            scanCurrent.ToString(), scanTarget.ToString(), scanOriginBlock.ToString(),
                            walletCreatedHere ? "1" : "0");
                    }
                }
                catch (Exception e)
                {
                    Logging.error("Exception occurred while reporting scan progress: " + e);
                }

                IxiNumber availableBalance = Node.getAvailableBalance();
                string balance = Utils.amountToHumanFormatString(availableBalance);
                string fiatBalance = Utils.amountToHumanFormatString(Node.fiatPrice * availableBalance);
                Utils.sendUiCommand(this, "setBalance", balance, fiatBalance, IxianHandler.localStorage.nickname);

                // Check if we should reload certain elements
                if (Node.changedSettings == true)
                {
                    Utils.sendUiCommand(this, "loadAvatar", Utils.imageToDataUri(IxianHandler.localStorage.getOwnAvatarPath()));   // X1
                    Node.changedSettings = false;
                }

                SPushService.clearNotifications(FriendList.getUnreadMessageCount());

                updateDebugOverlay();
            }
            catch (Exception e)
            {
                Logging.error("Exception occurred in HomePage.UpdateScreen: " + e);
            }
        }

        public void OnUpdateUI()
        {
            try
            {
                if (!App.isInForeground)
                {
                    return;
                }

                // C18 (#265, Opus review MINOR-5): consume the global refresh flag HERE.
                // Nine pages override updateScreen() WITHOUT calling base (MiniApp,
                // ContactDetails, WalletSent, Downloads, Dev, Contributors, Apps,
                // AppNew, AppDetails) — with one of those stack-last AND another as the
                // top overlay, nothing consumed the flag and the ring never rendered
                // anywhere. HomePage always ticks, so this is the reliable consumer;
                // flag cleared FIRST, then a single broadcast to every call-capable
                // WebView (base.updateScreen keeps working for the present-time path).
                if (UIHelpers.refreshAppRequests)
                {
                    UIHelpers.refreshAppRequests = false;
                    SpixiContentPage.broadcastCallState();
                }
                /* ★★ #46 loop O (L11 F2): `Last()` threw "Sequence contains no elements"
                 * when the 2 s tick landed inside the teardown window, where the
                 * NavigationStack is empty. The throw is caught below, so it was noise —
                 * but it is noise that hides a REAL error in exactly the window where an
                 * error matters. `LastOrDefault()` returns null there, and every use of
                 * `page` below already tolerates null. */
                Page? page = Navigation.NavigationStack.LastOrDefault();
                if (page is not null and SpixiContentPage)
                {
                    var scPage = (SpixiContentPage)page;
                    if (scPage.pageLoaded
                        && scPage.WebView != null
                        && scPage.WebView.IsEnabled)
                    {
                        scPage.updateScreen();
                    }
                }

                if (page == this
                    && detailContent is not null)
                {
                    ((SpixiContentPage)detailContent).updateScreen();
                }

                // #225: overlays are live surfaces outside the NavigationStack — tick
                // the TOP one (parity with the old top-of-stack behaviour: the chat
                // overlay gets its online-status/nick updates every second).
                var topOverlay = SpixiContentPage.getTopOverlay();
                if (topOverlay != null && topOverlay.pageLoaded)
                {
                    topOverlay.updateScreen();
                }
                // #247: with a chat-info PANE open, the conversation sits BELOW it in
                // the overlay stack but stays VISIBLE beside it — keep it ticking too
                // (it was the top overlay whenever visible before the pane existed).
                if (topOverlay is ContactDetails)
                {
                    foreach (SpixiContentPage op in SpixiContentPage.getOverlayPages())
                    {
                        if (op is SingleChatPage && op.pageLoaded)
                        {
                            op.updateScreen();
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Logging.error("Exception occured in onUpdateUI: {0}", ex);
            }
        }

        // #225: overlays never fire OnAppearing on this host (it is never detached) —
        // per-close refreshes live here instead.
        /* ★ Session I — L14 cover handshake: SettingsPage received `ixian:handoff` and is
         * holding its pop. Tell the home shell to consume the hand-off NOW (it mounts the
         * directory cover and answers `ixian:coverpainted`), instead of leaving the
         * consumer to a storage event that WKWebView may never fire. */
        protected internal override void onCoverHandoff()
        {
            Utils.sendUiCommand(this, "onHandoff");
        }

        public override void onOverlayClosed(SpixiContentPage overlay)
        {
            if (overlay is SettingsPage)
            {
                // Same refresh the (push-era) fromSettings branch below does.
                Utils.sendUiCommand(this, "setTheme", ThemeManager.getResolvedAppearanceName());
                Utils.sendUiCommand(this, "loadAvatar", Utils.imageToDataUri(IxianHandler.localStorage.getOwnAvatarPath()));   // X1
                // #245: drop the rail's Account highlight back to the real in-page tab.
                // (★ Session I: the [PAINTDIAG] account-closed stamp retired with its set; the
                // flash it measured is closed by the L14 cover handshake — onCoverHandoff below.)
                Utils.sendUiCommand(this, "onSettingsClosed");
                UIHelpers.shouldRefreshContacts = true;
                fromSettings = false;
            }
            else if (overlay is SingleChatPage)
            {
                fromChat = false;
                // N49 (#370, #369 F5): drop the chats-list row highlight when the
                // conversation closes — it stayed tinted for the whole session.
                // Tag-replace ordering (the N24/AppDetailsPage branch below): switching
                // conversations closes the OLD chat AFTER the new one presented and
                // pushed its own highlight — clear only when NO conversation remains.
                if (!SpixiContentPage.getOverlayPages().Exists(p => p is SingleChatPage))
                {
                    Utils.sendUiCommand(this, "selectChat", "");
                }
                // #247: a conversation's info pane has no life of its own — closing
                // the chat closes it (no dirty state; commits are per-action).
                closeContactDetailsOverlays();
                // #334 iOS-64: the chat flushed its draft to localStorage on the way
                // out, but home only re-reads drafts at a STRUCTURAL row rebuild —
                // without this the "Draft:" excerpt lagged until the next natural
                // flush (~10s+). Same one-liner the SettingsPage branch above ships.
                UIHelpers.shouldRefreshContacts = true;
                checkForRating();
            }
            else if (overlay is AppDetailsPage)
            {
                // N24: drop the apps-tab row highlight when the details pane closes.
                // Tag-replace ordering (the ContactDetails branch below): the OLD pane
                // closes AFTER its replacement presented — clear only when NO details
                // pane remains, or a replace would wipe the highlight the new pane
                // just pushed. Narrow closes push a harmless no-op clear.
                if (!SpixiContentPage.getOverlayPages().Exists(p => p is AppDetailsPage))
                {
                    Utils.sendUiCommand(this, "selectApp", "");
                }
            }
            else if (overlay is ContactDetails)
            {
                infoPaneCol2Pending = false;
                // Collapse the info column only when NO info pane remains open — a
                // "chatinfo" tag-replace closes the OLD pane AFTER the new one
                // presented (and re-expanded the column for itself).
                if (!SpixiContentPage.getOverlayPages().Exists(p => p is ContactDetails))
                {
                    infoPaneCol2Open = false;
                    mainGrid.ColumnDefinitions[2].Width = new GridLength(0);
                }
            }
        }

        // Unit 6 (#247): presentation-time pin of the chat-info pane. The overlay was
        // staged full-span with a leading margin (real width during load); NOW — in the
        // same main-thread frame it became visible — pin it to col 2 and expand the
        // column, so the pane appears fully painted with zero empty-strip frames.
        // Room is re-checked against the CURRENT window (it may have changed during the
        // load); no room anymore → the pane degrades to the full-span takeover.
        public override void onOverlayPresented(SpixiContentPage overlay)
        {
            if (overlay is SingleChatPage presentedChat)
            {
                // N49 (#370): the chats-list row highlight is pushed at PRESENT time —
                // the one moment the conversation provably exists (the N24/A-1 grammar;
                // the old push at the pushPageLoaded call site could highlight a row
                // whose staged page was dropped). WIDE only (loop r2 F-1): on a phone
                // the takeover's CLOSE ANIMATION reveals the list BEFORE the clear
                // lands, so an unconditional stamp painted the just-left row tinted
                // for the whole slide-out — and cost two render passes per open.
                // (Named presentedChat, not scp — a lambda at the end of this method
                // already declares scp; the shadow would be CS0136.)
                if (rightContent.IsVisible)
                {
                    Utils.sendUiCommand(this, "selectChat", presentedChat.friend.walletAddress.ToString());
                }
                return;
            }
            if (overlay is AppDetailsPage)
            {
                // N24 (loop A-1): the apps-tab row highlight is pushed at PRESENT
                // time — the one moment the pane provably exists. A drop before
                // present (lock in place, preload staging) now simply never
                // highlights. Narrow presents push too: the takeover covers the
                // list, so the stamp is invisible there and the close clears it.
                Utils.sendUiCommand(this, "selectApp", ((AppDetailsPage)overlay).selectedAppId);
                return;
            }
            if (!(overlay is ContactDetails))
            {
                return;
            }
            if (!infoPaneCol2Pending)
            {
                // Loop fix A-1 (MAJOR): a col-1/full-span info pane presented while a
                // PREVIOUS col-2 pane is still expanded (the "chatinfo" tag-replace is
                // about to close it) — the new pane does NOT own col 2, and the old
                // pane's onOverlayClosed will see "a ContactDetails remains" and skip
                // the collapse. Collapse it here, or the empty 360px column stays.
                if (infoPaneCol2Open)
                {
                    infoPaneCol2Open = false;
                    mainGrid.ColumnDefinitions[2].Width = new GridLength(0);
                }
                return;
            }
            infoPaneCol2Pending = false;
            // Loop fix A-3/B-3: read col 0's Width.Value only under the wide guard —
            // when narrow it is GridLength.Star and .Value is the star MULTIPLIER.
            bool wide = rightContent.IsVisible;
            double avail = wide ? (Width - mainGrid.ColumnDefinitions[0].Width.Value - detailMinWidth) : 0;
            // Re-check: the conversation may have closed or SWITCHED during the load —
            // col 2 is only for the open conversation's OWN info (#249).
            ContactDetails cd = (ContactDetails)overlay;
            bool chatOpenIsTarget = SpixiContentPage.getOverlayPages()
                .Exists(p => p is SingleChatPage scp && scp.friend.walletAddress.ToString() == cd.friendAddressString());
            if (wide && chatOpenIsTarget && avail >= infoPaneMinWidth)
            {
                SpixiContentPage.rehomeOverlay(overlay, 2);
                mainGrid.ColumnDefinitions[2].Width = new GridLength(Math.Min(infoPaneWidth, avail));
                infoPaneCol2Open = true;
            }
            else
            {
                // #248 degrade grammar: on a WIDE window the info covers only the
                // conversation region (col 1, the detail slot); narrow = full span.
                SpixiContentPage.rehomeOverlay(overlay, wide ? 1 : -1);
                // A-1 family: this pane no longer owns col 2 — if a replaced col-2
                // pane left the column expanded, collapse it.
                if (infoPaneCol2Open)
                {
                    infoPaneCol2Open = false;
                    mainGrid.ColumnDefinitions[2].Width = new GridLength(0);
                }
            }
        }

        // Unit 2 (#240): ask an open Account overlay to EXIT ITSELF — the shell runs
        // its save-if-dirty path (ixian:save/ixian:back → SettingsPage pops → the
        // overlay closes). Direct closeOverlay would discard held nickname/avatar/lock
        // edits. A shell that never booted has nothing to save → close it directly.
        private void requestSettingsOverlayExit()
        {
            foreach (SpixiContentPage p in SpixiContentPage.getOverlayPages())
            {
                if (p is SettingsPage sp)
                {
                    if (sp.pageLoaded)
                    {
                        Utils.sendUiCommand(sp, "onExitRequest");
                    }
                    else
                    {
                        // #340 audit (B-MAJOR-1, scenario B): this branch closes the Account
                        // WITHOUT going through the shell, so SettingsPage's own ixian:back /
                        // onSaveSettings sweep never runs. pageLoaded is cleared synchronously
                        // by reload(), and an OS theme flip reloads every overlay
                        // (UIHelpers.reloadAllPages) — so "Account open with the password pane
                        // up, theme flips, user taps a tab" lands HERE and would strand the
                        // password pane over the next tab. Sweep before removing.
                        sp.closeSublevelOverlays();
                        removePage(sp);   // wedged/never-booted shell: nothing to save
                    }
                    return;
                }
            }
        }

        protected override bool OnBackButtonPressed()
        {
            // #230: while a lock is shown in place, HomePage is still the CurrentPage —
            // swallow back entirely (the lock's own OnBackButtonPressed never runs).
            if (SpixiContentPage.hasModalOverlay())
            {
                return true;
            }
            // Q4-③ (#270): while the native call RING covers the window, back must
            // not navigate the app underneath — Accept/Decline/timeout are the
            // exits (the in-call BAR strip does NOT swallow back; the app is live).
            if (CallPage.isRingPresented())
            {
                return true;
            }
            // Unit 2 (#240) close-audit: an Account overlay holds uncommitted edits —
            // route back THROUGH the shell (takeover→hub, hub→save-if-dirty exit),
            // exactly like SettingsPage.OnBackButtonPressed did when it was pushed.
            // (Pre-existing #225 gap fixed: closeTopOverlay bypassed the save path.)
            if (SpixiContentPage.getTopOverlay() is SettingsPage sp && sp.pageLoaded)
            {
                Utils.sendUiCommand(sp, "onBack");
                return true;
            }
            // N50 (#370, #369 F5): a ContactDetails overlay with an open SHELL
            // overlay (the remove-blocked modal, a member sheet) consumes back
            // inside the shell first — closeTopOverlay below would pop the whole
            // page from under the modal. Same slot as the SettingsPage route
            // above; the shell self-heals a stale flag (cdBack re-syncs).
            if (SpixiContentPage.getTopOverlay() is ContactDetails cd && cd.pageLoaded && cd.shellOverlayOpen)
            {
                Utils.sendUiCommand(cd, "cdBack");
                return true;
            }
            // N51: a chat conversation is a HomePage OVERLAY on mobile (#225), so its
            // own OnBackButtonPressed never runs — with an overlay.js sheet (attach/
            // share/menu), the hand-rolled channel selector or select mode open in
            // the chat shell, closeTopOverlay below would pop the WHOLE
            // SingleChatPage from under it. Same slot as the ContactDetails route
            // above; the shell self-heals a stale flag (chatBack re-syncs). Var name
            // deliberately NOT scp (the CS0136 lesson, loop A-1 #372).
            // ★ #715: any other overlay with its own shell back level (Downloads, App details —
            // the Session F routes that never fired because the press lands HERE on mobile).
            if (SpixiContentPage.getTopOverlay() is SpixiContentPage topShell && topShell.routeShellBack())
            {
                return true;
            }
            if (SpixiContentPage.getTopOverlay() is SingleChatPage chatOverlay && chatOverlay.pageLoaded && chatOverlay.shellOverlayOpen)
            {
                Utils.sendUiCommand(chatOverlay, "chatBack");
                return true;
            }
            /* ★★ L8 — SWALLOW BACK WHILE A SLIDE-OUT IS STILL ON SCREEN.
             * The op leaves overlayStack at the START of its close, so a second press inside
             * the 220 ms animation finds nothing above and would fall through to `base` —
             * which BACKGROUNDS THE APP while the panel is visibly still there. The
             * InputTransparent guard on the stage cannot help: Android's back button never
             * consults the visual tree. This must sit BEFORE the shell-takeover route as
             * well, or the press would instead close a takeover the user cannot see.
             *
             * ★★ #46 loop O (MAJOR-1) — THIS SWALLOW MUST SIT ABOVE closeTopOverlay.
             * The swallow was below closeTopOverlay before. closeTopOverlay returns false
             * only when the overlay stack is EMPTY, so the swallow was reachable only with
             * an empty stack. Chat info never opens over an empty stack: on mobile the
             * conversation is itself a HomePage overlay (#225) and chat info stacks on top
             * of it, so the stack is [chat, chatinfo]. Press one removed chatinfo at t=0 and
             * started the 220 ms slide. Press two, inside that slide, found chat on top and
             * closed the CONVERSATION instantly. The info panel then finished its slide
             * across a bare chats list. popToRootAsync refuses to make that same state:
             * SpixiContentPage.popToRootAsync sets `bool slideTop = overlays.Count == 1;`
             * for exactly this reason. Hardware back must agree with it.
             *
             * ⚠ The swallow stays BELOW the SettingsPage, ContactDetails and SingleChatPage
             * shell routes above. Those routes read the layer that is still on the stack and
             * give the press to that page's own shell. A slide-out above them does not make
             * their press ours to eat.
             *
             * ⚠ The counter is time-bounded (SLIDE_OUT_MAX_SECONDS = 1 s), so a slide that
             * never completes cannot deaden back for the rest of the session. */
            if (SpixiContentPage.isOverlaySlidingOut())
            {
                return true;
            }
            // #225: hardware/host back closes the top NATIVE overlay first.
            // #337 audit MAJOR (AND-29 r3): this must run BEFORE the shell-takeover
            // branch — native overlays (chat, ContactDetails, formpane, txdetail)
            // always render ABOVE the home WebView, and the directory takeover
            // DELIBERATELY stays open under a pushed ContactDetails/ContactNewPage
            // (back-from-details must land on the directory). With the old order the
            // first back inside the details page invisibly closed the directory
            // underneath and the visible page ignored the press.
            // ★★ L8: hardware back is a BACK gesture, so it slides the top overlay out
            // when that overlay slid in (chat info). Before this, only the shell's own
            // Back button reached the animated path and Android back flipped instantly.
            if (SpixiContentPage.closeTopOverlay(true))
            {
                return true;
            }
            // AND-29 (#336): a WebView-internal home takeover (contacts/new-chat,
            // wallet Receive/Send) or an overlay.js sheet is open — it is NOT a
            // native overlay, so base would miss it and EXIT THE APP. Route back
            // into the shell to close it (state pushed via ixian:homeoverlay).
            if (homeShellOverlayOpen)
            {
                Utils.sendUiCommand(this, "homeBack");
                return true;
            }
            return base.OnBackButtonPressed();
        }

        protected override void OnAppearing()
        {
            if (fromSettings)
            {
                fromSettings = false;
                // Round 2 (Damir F5 "saving flickers"): do NOT full-reload index.html
                // here — combined with onSaveSettings' own home reload this DOUBLE-
                // booted Home in front of the user on every Account exit. Refresh via
                // pushes instead: theme (idempotent re-assert, covers a pick made
                // while Home was covered/detached), own avatar, and a contacts
                // re-flush. A LANGUAGE change still full-reloads Home — triggered at
                // save time in SettingsPage (strings are baked into the page).
                Utils.sendUiCommand(this, "setTheme", ThemeManager.getResolvedAppearanceName());
                Utils.sendUiCommand(this, "loadAvatar", Utils.imageToDataUri(IxianHandler.localStorage.getOwnAvatarPath()));   // X1
                UIHelpers.shouldRefreshContacts = true;
            }
            else if (fromChat)
            {
                fromChat = false;
                // #334 iOS-64: push-fallback twin of the onOverlayClosed branch —
                // non-overlay presentations otherwise keep the stale draft excerpt.
                UIHelpers.shouldRefreshContacts = true;
                checkForRating();
            }
            base.OnAppearing();
        }

        /* ★ N70 (#402): ask UpdateVerify to check again, now that there is a network.
         *
         * Core owns the checker and exposes only start()/stop(), so the re-arm is a
         * stop-then-start: stop() interrupts the sleeping loop thread and start() spawns
         * a fresh one, which checks IMMEDIATELY before sleeping the period again. Core is
         * read-only for us — no change there.
         *
         * Two guards that are not optional:
         *   · only when the last answer was an ERROR. `ready && error` is exactly the
         *     "we tried and could not reach the server" state, which is what a start-
         *     offline session leaves behind. A successful check must never be thrown away
         *     and restarted for a passing network blip.
         *   · OFF THIS THREAD. stop() ends in Thread.Join(), and the loop may be parked
         *     inside a blocking HTTP wait where an Interrupt does nothing — joining there
         *     could stall for the HTTP timeout. This runs on Node.updateUILoop's tick, so
         *     a stall would starve chats, wallet and apps together. Task.Run keeps it off.
         * One-shot per session either way: a re-arm that fails must not retry every tick. */
        /** @return true when the edge is SETTLED (re-armed, already re-armed, or a good
         *  answer exists); false only while the first check is still in flight. */
        private bool rearmUpdateCheck()
        {
            if (updateCheckRearmed)
            {
                return true;
            }
            if (!UpdateVerify.ready && !UpdateVerify.error)
            {
                return false;   // never answered yet — keep the edge, re-check next tick
            }
            if (!UpdateVerify.error)
            {
                return true;    // already has a good answer; nothing to re-arm
            }
            updateCheckRearmed = true;
            Task.Run(() =>
            {
                try
                {
                    UpdateVerify.stop();
                    UpdateVerify.start();
                    Logging.info("Update check re-armed after the network came back (N70).");
                }
                catch (Exception e)
                {
                    Logging.warn("Update check re-arm failed: " + e);
                }
            });
            return true;
        }

        private string checkForUpdate()
        {
            if (!UpdateVerify.ready && !UpdateVerify.error) return "(checking)";
            if (UpdateVerify.ready)
            {
                if (UpdateVerify.error) return "(error)";
                return UpdateVerify.serverVersion;
            }
            return "(not checked)";
        }

        /* ★ F6 probe helper. These are ULONG block heights, and a phone is routinely a
         * block AHEAD of what peers report — so a bare `target - current` UNDERFLOWS to
         * ~1.8e19 exactly in the state F6 is suspected to involve, which would have made
         * the log actively misleading rather than merely noisy. #453 caught the same
         * class in the caught-up TEST; this is the same rule applied to the diagnostic.
         * Signed-looking output, never an unsigned subtraction in the wrong direction. */
        private static string blockGap(ulong target, ulong current)
        {
            if (target == 0 || current == 0)
            {
                return "n/a";
            }
            return target >= current
                ? (target - current).ToString()
                : "-" + (current - target).ToString();
        }

        private void checkForRating()
        {
            if (DeviceInfo.Platform == DevicePlatform.Android || DeviceInfo.Platform == DevicePlatform.iOS)
            {
                if (Preferences.Default.ContainsKey("rating_action"))
                {
                    string resp = Preferences.Default.Get("rating_action", "show");
                    if (resp.Equals("show", StringComparison.Ordinal))
                    {
                        Utils.sendUiCommand(this, "showRatingPrompt");
                    }
                }
            }
        }

        // Adds and filters a new contact status to the cache
        // Can be called from any thread
        public void setContactStatus(Address address, bool online, int unread, string excerpt, long timestamp)
        {
            // Cache and filter contact status changes to reduce cpu usage with many notifications
            lock (contactStatusCache)
            {
                bool _alreadyInCache = false;
                int i = 0;
                for (i = 0; i < contactStatusCache.Count; i++)
                {
                    contactStatusCacheItem cacheItem = contactStatusCache[i];
                    if (cacheItem.address.SequenceEqual(address))
                    {
                        // Update the cached status to the latest message
                        if (timestamp > cacheItem.timestamp)
                        {
                            cacheItem.timestamp = timestamp;
                            cacheItem.unread = unread;
                            cacheItem.online = online;
                            cacheItem.excerpt = excerpt;
                        }
                        else if (timestamp == 0)
                        {
                            // iOS-8/11/31 leg B(ii): timestamp 0 is the DISPLAY-ONLY push
                            // (loadMessages zeroing the unread count, presence ticks) — it
                            // carries no new message, so it can never win a `>` comparison
                            // against an existing entry and was dropped outright. That is why
                            // opening a chat cleared nothing: the zero never reached the list.
                            // Apply the live fields, keep the entry's own excerpt/timestamp.
                            cacheItem.unread = unread;
                            cacheItem.online = online;
                        }
                        // iOS-8/11/31 leg B(i): contactStatusCacheItem is a STRUCT, so the
                        // line above took a COPY — every mutation here was written to that copy
                        // and thrown away, and updateContactStatus went on pushing the ORIGINAL
                        // cached values. Write it back.
                        contactStatusCache[i] = cacheItem;
                        // Already in cache, break to minimize processing
                        _alreadyInCache = true;
                        break;
                    }
                }

                // If not found in cache, add this message
                if (!_alreadyInCache)
                {
                    contactStatusCacheItem cacheItem = new contactStatusCacheItem();
                    cacheItem.address = address;
                    cacheItem.online = online;
                    cacheItem.unread = unread;
                    cacheItem.excerpt = excerpt;
                    cacheItem.timestamp = timestamp;
                    contactStatusCache.Add(cacheItem);
                }
            }

        }
        // Updates the status for all entries in the contact status cache
        // Called from a UI thread
        public void updateContactStatus()
        {
            lock (contactStatusCache)
            {
                // Go through each cache item and perform the status update
                foreach (contactStatusCacheItem cacheItem in contactStatusCache)
                {
                    Utils.sendUiCommand(this, "setContactStatus", cacheItem.address.ToString(),
                        cacheItem.online.ToString(), cacheItem.unread.ToString(), cacheItem.excerpt, cacheItem.timestamp.ToString());
                }
                // Clear the contact status cache
                contactStatusCache.Clear();
            }
        }

        public override void reload()
        {
            // #340 (C-MAJOR-1): the rows die with the document. Don't wait for the fresh
            // one to say ixian:onload — if that handshake is lost the apps tab never heals.
            appsPushedToShell = false;
            // ★ D-20 (#357): the connectivity warning dies with the document too — reset its
            // latch so the next updateScreen tick re-pushes "Connecting…" while offline.
            warningDisplayed = false;
            base.reload();
            removeDetailContent();
        }

        // #285: language re-bake — regenerate ONLY the home shell. Unlike reload(),
        // the detail pane is left alone: the language pick that calls this is hosted
        // IN the detail pane (Account settings; nuking it would clobber the #274
        // picker restore), and live chat panes re-localize via their own reload().
        public void reloadShell()
        {
            suppressNextTabOverlayExit = true;
            // #288 review (break-my-verdict): two language picks inside the ~5 s belt
            // window are ONE TAP apart — the #274 stash returns the user straight back
            // ONTO the Language picker. Without this epoch, belt #1's clear disarms pick
            // #2's flag, its boot echo runs the exit sweep, and the Account pane is torn
            // down mid-pick: exactly the #285 round-2 bug this flag exists to prevent.
            int gen = ++reloadShellGen;
            appsPushedToShell = false;   // #340 (C-MAJOR-1): same as reload(), which this bypasses
            warningDisplayed = false;    // ★ D-20 (#357): language re-bake ate "Connecting…" while offline (Damir 2026-08-16)
            base.reload();
            // Belt (F5 2026-07-29): the reload's re-populate burst rides ONE
            // Navigated→readyState flush; on WinUI that can race the fresh document
            // and strand the message queue → an empty (but correctly-localized)
            // shell. If the latch is still down after the boot window, re-drive it
            // (webViewNavigated → readyState poll → queue flush), then re-arm the
            // refresh flags so the 1 Hz updateScreen pass re-pushes chats + avatar
            // (balance re-pushes every tick anyway; tab2/tab3 load on open, Fix #8).
            _ = System.Threading.Tasks.Task.Run(async () =>
            {
                await System.Threading.Tasks.Task.Delay(1500);
                if (!pageLoaded)
                {
                    // must run on the UI thread: webViewNavigated → applyPlatformPageChrome
                    // touches native layout properties.
                    // #288 review: re-check the latch INSIDE the lambda (the page can finish
                    // loading in the marshalling gap → a second webViewNavigated on an
                    // already-booted page) and LOG the failure — a silent catch here means
                    // the empty-shell symptom this belt exists to rescue comes back with no
                    // diagnostic whatsoever.
                    MainThread.BeginInvokeOnMainThread(() =>
                    {
                        try { if (!pageLoaded) { webViewNavigated(this, null); } }
                        catch (Exception ex) { Logging.error("reloadShell belt re-drive failed: " + ex.Message); }
                    });
                    await System.Threading.Tasks.Task.Delay(500);
                }
                UIHelpers.shouldRefreshContacts = true;
                UIHelpers.refreshAppRequests = true;
                Node.changedSettings = true;   // re-push avatar on the next tick
                await System.Threading.Tasks.Task.Delay(3500);
                UIHelpers.shouldRefreshContacts = true;   // second pass if the first raced the boot
                // #288 review: the tab1-echo suppression must never outlive this window. A
                // shell that failed to boot emits no echo, and a latched flag would make the
                // NEXT genuine tab switch skip the whole exit sweep. Epoch-guarded (see the
                // gen capture above) so this clear can only ever disarm ITS OWN reload.
                MainThread.BeginInvokeOnMainThread(() =>
                {
                    if (gen == reloadShellGen) { suppressNextTabOverlayExit = false; }
                });
            });
        }

        public void removeDetailContent(bool setDefault = true)
        {
            if (detailContent != null)
            {
                detailContent.Dispose();
                detailContent = null;
            }

            if (setDefault)
            {
                if (defaultDetailContent != null)
                {
                    defaultDetailContent.Dispose();
                }

                defaultDetailContent = new EmptyDetail();
                rightContent.Content = defaultDetailContent.Content;

                Utils.sendUiCommand(this, "selectChat", "");
            }
        }

        // Spixi Mini Apps logic

        private void loadApps(bool forceRefresh)
        {
            // #340 (C-MAJOR-1a): serialize. Two callers, two threads, no marshalling — the
            // UI thread on tab3 entry and Node.updateUILoop's tick via updateScreen. An
            // install sets shouldRefreshApps; if the user taps Apps inside the next second
            // both runs pass the gate and interleave, and the tick's clearApps lands between
            // the tap's addApp calls — the shell drops rows it had already been given.
            // Dedicated lock (not refreshLock) to stay out of the chats/contacts lock order.
            lock (appsPushLock)
            {
                if (!forceRefresh && !UIHelpers.shouldRefreshApps)
                {
                    return;
                }
                if (detailContent != null)
                {
                    detailContent.updateScreen();
                }
                UIHelpers.shouldRefreshApps = false;

                Utils.sendUiCommand(this, "clearApps");

                var apps = Node.MiniAppManager.getInstalledApps();
                lock (apps)
                {
                    foreach (var app_arr in apps)
                    {
                        MiniApp app = app_arr.Value;
                        string icon = Node.MiniAppManager.getAppIconPath(app.id);
                        if (icon == null)
                        {
                            icon = "";
                        }
                        icon = Utils.imageToDataUri(icon);   // X1
                        Utils.sendUiCommand(this, "addApp", app.id, app.name, icon, app.publisher, app.hasCapability(MiniAppCapabilities.SingleUser).ToString(), app.hasCapability(MiniAppCapabilities.MultiUser).ToString());
                    }
                }

                // #340 (C-MAJOR-1b/MINOR-1): AFTER the loop, and only if this document could
                // actually receive it. sendMessage queues while the page is unloaded and
                // Dispose() drops that queue — latching on a push that was queued and then
                // discarded is what makes an empty apps tab permanent.
                appsPushedToShell = pageLoaded;

                // ★ #506③: the end of the apps burst — see the note in loadTransactions.
                // AFTER appsPushedToShell for the same reason that latch is set here: this
                // is the point at which every row really has been handed over.
                Utils.sendUiCommand(this, "clearAppsDone");

                foreach (var p in Utils.getChatPages())
                {
                    p.reloadScreen();
                }
            }
        }

        private void onStartApp(string appId)
        {
            MiniAppPage miniAppPage = new MiniAppPage(appId, IxianHandler.getWalletStorage().getPrimaryAddress(), null, Node.MiniAppManager.getAppEntryPoint(appId));
            miniAppPage.accepted = true;
            Node.MiniAppManager.addAppPage(miniAppPage);

            MainThread.BeginInvokeOnMainThread(() =>
            {
                Navigation.PushAsync(miniAppPage, Config.defaultXamarinAnimations);
            });
        }

        private void onStartAppMulti(string appId)
        {
            var recipientPage = new WalletRecipientPage(false, false);
            recipientPage.pickSucceeded += (sender, e) =>
            {
                HandlePickAppMultiUserSucceeded(sender, e.Value.Item1, appId);
            };

            MainThread.BeginInvokeOnMainThread(() =>
            {
                Navigation.PushAsync(recipientPage, Config.defaultXamarinAnimations);
            });
        }

        /* `ixian:startappwith:<appId>:|<addr>` — the REDESIGNED multi-user app
         * launch (Damir 2026-08-13). The shipped `ixian:startAppMulti:` verb carries
         * NO target, so it answered by pushing the legacy WalletRecipientPage — the
         * selector Damir is complaining about. The home shell now picks targets in
         * the SAME in-shell picker group creation uses (contacts-shell purpose 'app')
         * and hands the result here. Payload grammar mirrors `ixian:creategroup:`
         * (above) minus the blind+name prefix; the CORE is HandlePickAppMultiUser-
         * Succeeded's, minus its popPageAsync (there is no pushed page to pop — the
         * picker is a WebView takeover the shell closed itself before sending).
         * ★ SECURITY.md: WebView-supplied ADDRESSES only. Every one is resolved
         * against FriendList and dropped if it is not an existing friend/group;
         * nothing is signed or broadcast, no key/password/path crosses the bridge,
         * and each mini-app keeps its own WebView (#221).
         * Delta vs the legacy path: NONE behaviourally — the legacy picker consumed
         * addresses.First() only and so does this one (the shell's picker is
         * single-select on this path). The ONLY change Damir asked for is which
         * picker the user sees. The payload keeps the LIST grammar (and this handler
         * stays tolerant of a 1-element list) so a real multi-user launch needs no
         * new verb once MiniAppPage can host one — see the fan-out note below. */
        private void onStartAppWith(string payload)
        {
            string[] parts = payload.Split(new string[] { ":|" }, StringSplitOptions.None);
            if (parts.Length < 2 || parts[0].Length < 1)
            {
                Logging.error("startappwith: malformed payload.");
                return;
            }
            string appId = parts[0];
            List<Friend> targets = new();
            foreach (string a in parts[1].Split('|'))
            {
                if (string.IsNullOrWhiteSpace(a))
                {
                    continue;
                }
                try
                {
                    Friend? f = FriendList.getFriend(new Address(new ExtendedAddress(a).RoutingAddress));
                    if (f != null && !targets.Contains(f))
                    {
                        targets.Add(f);
                    }
                }
                catch (Exception ex)
                {
                    Logging.error("startappwith: bad address: " + ex);
                }
            }
            if (targets.Count < 1)
            {
                Logging.error("startappwith: no known target.");
                return;
            }
            // #340 audit (C-MINOR-3): the id has to name an app we actually have. MiniApp.id
            // comes verbatim out of a downloaded package's appinfo.spixi with no charset
            // validation, so an id containing the ":|" delimiter mis-splits — worst case
            // parts[0] is a truncated id and a real address lands in it, and we would send a
            // network app-invite plus a chat card for an app that does not exist, then open a
            // blank WebView (getAppEntryPoint returns null → "file://"). Also covers a plain
            // unknown/uninstalled id, which previously failed silently AFTER the invite.
            if (Node.MiniAppManager.getApp(appId) == null)
            {
                Logging.error("startappwith: unknown app id.");
                return;
            }

            try
            {
                // SINGLE target on purpose — do NOT fan this out over `targets`.
                // MiniAppPage still derives the session id from the app id alone
                // ("TODO randomize session id and add support for more users",
                // MiniAppPage.xaml.cs:48), relays outgoing data to its one
                // friendOrGroup (sendNetworkData) and drops inbound frames from
                // anyone else (hasUser). A second invitee would join a session the
                // host never talks to and whose data it silently discards. True
                // multi-user needs that MiniAppPage work FIRST; this is the one
                // place to change once it lands.
                Friend target = targets[0];
                byte[] session_id = onJoinApp(appId, target);

                var app_info = Node.MiniAppManager.getAppInfo(appId);
                var msg_id = StreamProcessor.sendAppRequest(target, appId, session_id, null, app_info);
                Node.addMessageWithType(msg_id, FriendMessageType.appSession, target.walletAddress, 0, app_info, true, null, 0, false);
            }
            catch (Exception ex)
            {
                Logging.error("startappwith failed: " + ex.Message);
            }
        }

        /* AppDetailsPage's multi-user launch has no contacts roster of its own — it
         * closes itself and asks THIS shell to run the pick (same picker, one
         * implementation). The shell answers with ixian:startappwith: above. */
        public void pickAppTargets(string appId)
        {
            if (string.IsNullOrEmpty(appId))
            {
                return;
            }
            Utils.sendUiCommand(this, "pickAppTargets", appId);
        }

        private async void HandlePickAppMultiUserSucceeded(object sender, List<ExtendedAddress> addresses, string appId)
        {
            Address address = new Address(addresses.First().RoutingAddress);
            Friend? friend = FriendList.getFriend(address);

            if (friend == null)
            {
                return;
            }

            try
            {
                popPageAsync();

                byte[] session_id = onJoinApp(appId, friend);

                var app_info = Node.MiniAppManager.getAppInfo(appId);
                var msg_id = StreamProcessor.sendAppRequest(friend, appId, session_id, null, app_info);
                Node.addMessageWithType(msg_id, FriendMessageType.appSession, friend.walletAddress, 0, app_info, true, null, 0, false);
            }
            catch (Exception ex)
            {
                Logging.error("Navigation failed: " + ex.Message);
            }
        }

        public byte[] onJoinApp(string appId, Friend friendOrGroup)
        {
            MiniAppPage miniAppPage = new MiniAppPage(appId, IxianHandler.getWalletStorage().getPrimaryAddress(), friendOrGroup, Node.MiniAppManager.getAppEntryPoint(appId));
            miniAppPage.accepted = true;
            Node.MiniAppManager.addAppPage(miniAppPage);

            MainThread.BeginInvokeOnMainThread(async () =>
            {
                await Task.Delay(200); // WinUI Crash fix
                await Navigation.PushAsync(miniAppPage, Config.defaultXamarinAnimations);
            });

            return miniAppPage.sessionId;
        }

        public async void onInstallApp(string appUrl, Friend? friendOrGroup)
        {
            MiniApp? app = await Node.MiniAppManager.fetch(appUrl);
            if (app == null)
            {
                return;
            }

            app.url = appUrl;

            MainThread.BeginInvokeOnMainThread(() =>
            {
                // Q1-① (#267): app details land in the DETAIL column on wide windows
                // (Damir F5: "Get app opened full screen"). Same routing + the same
                // "formpane" tag as newcontact/newapp, so add-app → app-details
                // tag-REPLACES cleanly (the #264-review dial). Narrow keeps the
                // full-span takeover. The install CONFIRM inside AppDetailsPage
                // stays a modal (#256 lock) — only the page presentation changes.
                closeContactDetailsOverlays();   // loop B-MINOR-1: no col-1 stacking
                pushPageLoaded(new AppDetailsPage(app, null, true, friendOrGroup), 4000, "formpane", rightContent.IsVisible ? 1 : -1);   // load-then-move (N3)
                // N24: the row highlight (selectApp) rides onOverlayPresented, NOT this
                // call site — pushPageLoaded can DROP a staged page (lock in place,
                // another preload staging) and a push here highlighted a row whose
                // pane never opened (loop A-1).
            });
        }

        private void onAppDetails(string appId)
        {
            // Q1-① (#267): same detail-column routing as onInstallApp above.
            closeContactDetailsOverlays();   // loop B-MINOR-1 (symmetry)
            pushPageLoaded(new AppDetailsPage(appId), 4000, "formpane", rightContent.IsVisible ? 1 : -1);   // load-then-move (N3)
            // N24: selectApp rides onOverlayPresented (loop A-1) — see onInstallApp.
        }

        private void onAcceptRequest(string address)
        {
            // CH2: mirrors SingleChatPage.onAcceptFriendRequest — approve + send the accept.
            // A full contacts refresh (shouldRefreshContacts) re-flushes loadChats, which
            // drops the friend from the requests feed (now approved) into the chat list.
            Friend friend = FriendList.getFriend(new Address(address));
            if (friend == null)
            {
                return;
            }
            friend.approved = true;
            friend.handshakePushed = false;
            UIHelpers.shouldRefreshContacts = true;
            StreamProcessor.sendAcceptAdd(friend, true);
            writeConnectedLine(friend);
        }

        /* ★ #434: the "you are now connected" line, written when the accept happens
         * LOCALLY. Every site that wrote it was on the INBOUND path
         * (StreamProcessor:337/:354/:368 — the other side accepting US), so accepting
         * an incoming request produced no line at all and the chat opened with nothing
         * in it. Damir found this on the R3 F5; it has been true since the flow was
         * built and is not an R3 regression — the shell renders the chip correctly the
         * moment a line exists.
         * ★ The COPY changed with it. "{0} has accepted your contact request" is FALSE
         * when you are the accepter, so a single direction-neutral sentence replaces it
         * in both directions (Damir's words) — new id `global-friend-request-connected`,
         * used at all five sites. The old id stays in the language files ONLY so chat
         * histories written before this build still render as a chip rather than
         * degrading to a plain bubble.
         * The id `new byte[] { 1 }` is the same fixed id the inbound sites use, so a
         * line can never appear twice in one chat (FriendList dedupes on it). */
        /* ★★ #572 ① — AN OUTGOING REQUEST MUST NOT RAISE THE USER'S OWN UNREAD COUNT.
         *
         * Damir's walk: he HIDES an outgoing request (#562) and a red dot still rides
         * the back arrow inside every other chat "until the peer accepts". The hide is
         * an FE tombstone in localStorage; the dot is not. It comes from
         * `FriendList.getUnreadMessageCount()`, which SingleChatPage pushes as
         * `setUnreadIndicator` (:2809). No FE skip can reach that number.
         *
         * ★ THE MECHANISM, read out of the source, not guessed:
         *   · `FriendMessage`'s constructor sets `read = false` for EVERY message,
         *     `local_sender` included (Ixian-Core `FriendMessage.cs`).
         *   · `Node.addMessageWithType` gates the unread increment on `read` ALONE
         *     (`Node.cs:925`) — it never looks at `localSender`.
         *   · So the `requestAddSent` marker the user's OWN "send request" writes
         *     counts as one unread message against the user.
         * That also explains why the home badge looked clean: home.html recomputes the
         * nav badge from its own rows and overwrites the push. The chat shell does not.
         *
         * This is the same defect `writeConnectedLine` fixes below, and the same fix:
         * snapshot the count and put it back. Clearing it to ZERO would silently mark a
         * genuinely unread message from that contact as read. */
        public static void writeRequestSentMarker(Address address)
        {
            try
            {
                Friend? friend = FriendList.getFriend(address);
                int unreadBefore = friend != null ? friend.metaData.unreadMessageCount : 0;
                Node.addMessageWithType(null, FriendMessageType.requestAddSent, address, 0, "", true);
                if (friend != null && friend.metaData.unreadMessageCount != unreadBefore)
                {
                    friend.metaData.unreadMessageCount = unreadBefore;
                    friend.saveMetaData();
                }
            }
            catch (Exception ex)
            {
                Logging.warn("Could not write the request-sent marker: " + ex);
            }
        }

        /* ★ #572 ① — THE HEAL for requests that are ALREADY pending. Accounts made
         * before the fix above carry the stale +1, and the user cannot open the chat to
         * clear it when the row is hidden.
         *
         * The predicate is deliberately narrow, and each clause earns its place:
         *   · `state == FriendState.RequestSent` — the state the outgoing sites set.
         *     ⚠ NOT `!approved`: `approved` DEFAULTS TRUE and no outgoing site clears
         *     it, so an `approved` guard is dead for these exact rows (#395 F-1).
         *   · the LAST message is our own `requestAddSent` — this is what excludes the
         *     mutual-request case. If the peer also sent a request, THEIR requestAdd is
         *     the last message and it is genuinely unread, so the heal does not fire.
         *   · a peer who has not accepted cannot send messages, so with our marker
         *     newest there is nothing else the count can legitimately hold.
         * Idempotent, so it can run on every flush. Returns true when it changed data. */
        /* ⚠ review MINOR-4, on the two helpers' policies: writeRequestSentMarker PRESERVES
         * whatever count was there, because at write time we cannot know what it holds;
         * this one CLEARS it, because its predicate proves the marker is the only thing
         * that could have raised it. They are the same policy read at two moments, not
         * two policies. Today both reduce to zero anyway — FriendList.addFriend returns
         * null for an address already present, so every marker site fires only for a
         * brand-new Friend. */
        public static bool healOutgoingRequestUnread(Friend friend)
        {
            if (friend == null
                || friend.state != FriendState.RequestSent
                || friend.metaData.unreadMessageCount <= 0)
            {
                return false;
            }
            var lm = friend.metaData.lastMessage;
            if (lm == null
                || lm.type != FriendMessageType.requestAddSent
                || !lm.localSender)
            {
                return false;
            }
            friend.metaData.unreadMessageCount = 0;
            friend.saveMetaData();
            Logging.info("#572: cleared the unread count an outgoing contact request had raised against the user.");
            return true;
        }

        public static void writeConnectedLine(Friend friend)
        {
            try
            {
                /* ★ Audit MAJOR-3: this line is written because the USER just accepted —
                 * it is not an incoming message and must not behave like one. With the
                 * defaults, Node.addMessageWithType incremented unreadMessageCount (the
                 * chats-list badge and the nav badge with it) and fired a local "New
                 * Message" push notification for an event the user caused, on the one
                 * path where no chat page is open. No notification, no alert.
                 * ★ break-my-verdict MAJOR-3: local_sender stays FALSE. Setting it true
                 * silenced the notification but fell into the outgoing-status branch of
                 * the chats-row push, which stamps a permanent "sending" clock glyph on
                 * a message that is never transmitted — and adds the self-prefix to the
                 * excerpt. That is the same directional asymmetry #434 exists to remove,
                 * just pointing the other way. The inbound line has always been written
                 * with local_sender false; this matches it exactly.
                 * The unread count is snapshotted and restored because the increment is
                 * gated on `read`, not on `local_sender` — and clearing it to zero would
                 * silently mark a genuinely unread request message as read. */
                int unreadBefore = friend.metaData.unreadMessageCount;
                Node.addMessageWithType(new byte[] { 1 }, FriendMessageType.standard, friend.walletAddress, 0,
                    string.Format(SpixiLocalization._SL("global-friend-request-connected"), friend.nickname),
                    false, null, 0, false, false);
                if (friend.metaData.unreadMessageCount != unreadBefore)
                {
                    friend.metaData.unreadMessageCount = unreadBefore;
                    friend.saveMetaData();
                }
            }
            catch (Exception ex)
            {
                Logging.warn("Could not write the connected line: " + ex);
            }
        }

        /* ★ Batch A (#539) — A6, THE DATA BUG: the redesigned chats-row menu ("Delete
         * chat" → "Delete contact too?") emitted NO verb — home.html tombstoned the row
         * and the contact + its history stayed on disk. These three handlers are the
         * per-address twins of ContactDetails' page-scoped ixian:remove /
         * ixian:removehistory. Every outcome is PUSHED (`removeContactResult`,
         * `removeHistoryResult`) so the shell can un-tombstone on a refusal — a row that
         * vanished while the data stayed is exactly the lie this batch removes.
         * The address is peer-supplied through the shell: parsed defensively, never
         * thrown inside onNavigating (the A-4 rule). */
        private void onRemoveHistoryFor(string address)
        {
            string status = "fail";
            string addr = "";
            try
            {
                addr = (address ?? "").Trim();
                Friend? f = FriendList.getFriend(new Address(addr));
                if (f != null && SContacts.removeHistory(f))
                {
                    status = "ok";
                }
            }
            catch (Exception)
            {
                Logging.error("ixian:removehistory failed (malformed payload or address)");   // loop r1: no ex.Message (carries the token)
            }
            try { Utils.sendUiCommand(this, "removeHistoryResult", addr, status); } catch (Exception) { }
            UIHelpers.shouldRefreshContacts = true;   // loop r2 R2-3: a REFUSAL must re-flush too (the shell un-tombstones)
            updateScreen();
        }

        // payload: `<address>:1|0` — 1 = the user chose, on the remove-contact sheet, to
        // LEAVE every shared group first (Core refuses to remove a group member).
        private void onRemoveContactFor(string payload)
        {
            string status = "fail";
            string addr = "";
            List<string> blockers = new List<string>();
            try
            {
                string p = (payload ?? "").Trim();
                int sep = p.LastIndexOf(':');
                bool leave = false;
                if (sep > 0)
                {
                    leave = p.Substring(sep + 1).Trim() == "1";
                    addr = p.Substring(0, sep);
                }
                else
                {
                    addr = p;
                }
                Friend? f = FriendList.getFriend(new Address(addr));
                if (f != null)
                {
                    // loop r1 A-3: the removed contact's OPEN conversation must go — it is an
                    // OVERLAY (#225; `detailContent` is never assigned, HomePage:126-131), so
                    // the page's own overlay-aware popPageAsync closes it, exactly as the
                    // legacy remove sites do (ContactDetails:241 popToRoot · SingleChatPage:391).
                    // Resolved BEFORE the removal: getChatPage matches on the Friend reference.
                    var chat_page = Utils.getChatPage(f);
                    /* ★ F5-2 (#555, r2 per loop A-4/A-5/A-9) — BREADCRUMBS, the chats-row
                     * entry point. ONE flush (the writer thread drains continuously; four
                     * unbounded flush spins on the UI thread was ANR-shaped). ⚠ This body
                     * already sits inside a catch-all, so a MANAGED throw here is logged
                     * today — these lines earn their keep on a NATIVE crash or a later
                     * async turn (the checklist says so). "dispatched", not "done":
                     * popPageAsync is fire-and-forget (A-4). status is the fixed
                     * ok/left/blocked/fail vocabulary — no user data. */
                    IXICore.Meta.Logging.info("[CRASHDIAG] removecontact: start (leave=" + leave + ", openChat=" + (chat_page != null) + ")");
                    status = SContacts.removeContact(f, leave, out blockers);
                    IXICore.Meta.Logging.info("[CRASHDIAG] removecontact: status=" + status + ", closing the open chat");
                    IXICore.Meta.Logging.flush();
                    if ((status == "ok" || status == "left") && chat_page != null)
                    {
                        try { chat_page.popPageAsync(); } catch (Exception) { }
                    }
                    IXICore.Meta.Logging.info("[CRASHDIAG] removecontact: teardown dispatched");
                }
            }
            catch (Exception)
            {
                // loop r1: NO ex.Message here — Core's Address ctor formats the base58 token
                // into its exception text, and this handler's token is peer-supplied
                Logging.error("ixian:removecontact failed (malformed payload or address)");
            }
            try
            {
                List<string> args = new List<string> { addr, status };
                args.AddRange(blockers);   // name/address pairs on "blocked" — each arg transport-escaped
                Utils.sendUiCommand(this, "removeContactResult", args.ToArray());
            }
            catch (Exception) { }
            UIHelpers.shouldRefreshContacts = true;   // loop r2 R2-3: every outcome re-flushes (a refused remove restores the row)
            updateScreen();
        }

        /* ★★ L13 (#676) — LEAVE A ROOM, address-scoped. The chats-row delete flow's
         * "Leave group" tick lands here INSTEAD of `ixian:removehistory:` (one verb, one
         * order — the same reason SContacts A4/A5 refused to fire two location.href sends
         * for one intent).
         *
         * ★ THE BODY IS SContacts.leaveGroup, NOT A THIRD COPY. sendLeave + immediate
         * removeFriend is #567's grammar and it already has one home; ContactDetails'
         * `ixian:leave` still inlines it, which is the second copy this project would be
         * paying for if this were a third.
         *
         * ★ WHY NO SEPARATE HISTORY VERB IS NEEDED, read at Ixian-Core 097341a:
         * FriendList.removeFriend deletes the history file AND the avatar
         * (localStorage.deleteMessages / deleteAvatar, FriendList.cs:436-440) before it
         * drops the record. Leaving therefore satisfies the "Delete chat" box on its own.
         *
         * ⚠ THE ORDER MATTERS AND IT IS THE OPPOSITE OF THE OBVIOUS ONE. The leave is
         * fanned out PER MEMBER (sendGroupSpixiMessage → sendSpixiMessage(pf, …) for each
         * member's own Friend), so the pending copies live on the MEMBER contacts, not on
         * the group record — removing the group immediately afterwards cannot strand them.
         * add_to_pending_messages and send_push_notification are both true on that path,
         * which is what lets the shell promise it reaches members who are offline.
         *
         * ⚠ The open conversation is resolved BEFORE the removal (getChatPage matches on
         * the Friend reference) and popped after — loop r1 A-3: a room you have left must
         * not leave a live chat page behind on a wide window. */
        private void onLeaveGroupFor(string address)
        {
            string status = "fail";
            string addr = "";
            try
            {
                addr = (address ?? "").Trim();
                Friend? f = FriendList.getFriend(new Address(addr));
                if (f != null)
                {
                    var chat_page = Utils.getChatPage(f);
                    if (SContacts.leaveGroup(f))
                    {
                        status = "left";
                        if (chat_page != null)
                        {
                            try { chat_page.popPageAsync(); } catch (Exception) { }
                        }
                    }
                }
            }
            catch (Exception)
            {
                // no ex.Message — Core's Address ctor formats the peer-supplied base58 token
                // into its exception text (the same rule the four verbs above follow)
                Logging.error("ixian:leavegroup failed (malformed payload or address)");
            }
            try { Utils.sendUiCommand(this, "leaveGroupResult", addr, status); } catch (Exception) { }
            UIHelpers.shouldRefreshContacts = true;   // R2-3: a REFUSAL must re-flush too (the shell un-tombstones)
            updateScreen();
        }

        /* ★ Batch B (#543) B1 — REVOKE an OUTGOING pending contact request from the chats
         * list: the address-scoped twin of SingleChatPage's `ixian:undorequest` (xaml:414:
         * FriendList.removeFriend, no notification to the other party — "TODO" there since
         * the legacy). Guarded to the outgoing-pending shape the "Request sent" row is built
         * from (updateChat: the last message is MY requestAdd and they have not accepted):
         * anything else answers "fail" and the shell un-tombstones the row. The peer is NOT
         * told (the protocol has no withdraw verb — RC1, BE): the shell's copy says so. */
        private void onUndoRequestFor(string address)
        {
            string status = "fail";
            string addr = "";
            try
            {
                addr = (address ?? "").Trim();
                Friend? f = FriendList.getFriend(new Address(addr));
                if (f != null && !f.bot && f.type != FriendType.Group)
                {
                    /* ★ loop r1 (the #399 lesson, caught again): `approved` DEFAULTS TRUE and
                     * every OUTGOING request site never clears it (Friend.cs:233 `approve = true`;
                     * ContactNewPage:256 / SpixiContentPage:3129 pass state only) — a `!approved`
                     * guard is DEAD for the exact rows this verb serves. The real signal is the
                     * STATE the outgoing sites set and the "Waiting for response" row is built
                     * from (HomePage:2122 `state != Approved`): FriendState.RequestSent. */
                    bool outgoingPending = f.state == FriendState.RequestSent;
                    if (outgoingPending && FriendList.removeFriend(f))
                    {
                        UIHelpers.shouldRefreshContacts = true;
                        status = "ok";
                        var chat_page = Utils.getChatPage(f);
                        if (chat_page != null)
                        {
                            try { chat_page.popPageAsync(); } catch (Exception) { }
                        }
                    }
                }
            }
            catch (Exception)
            {
                Logging.error("ixian:undorequest failed (malformed payload or address)");   // no ex.Message — carries the token
            }
            try { Utils.sendUiCommand(this, "undoRequestResult", addr, status); } catch (Exception) { }
            UIHelpers.shouldRefreshContacts = true;   // loop r2 R2-3: the refused revoke's row must come back on THIS flush
            updateScreen();
        }

        // A4/A5: read-only — the groups both of you are in, as name/address pairs.
        private void onSharedGroupsFor(string address)
        {
            string addr = "";
            List<string> pairs = new List<string>();
            try
            {
                addr = (address ?? "").Trim();
                Friend? f = FriendList.getFriend(new Address(addr));
                if (f != null)
                {
                    pairs = SContacts.sharedGroups(f);
                }
            }
            catch (Exception)
            {
                Logging.error("ixian:sharedGroups failed (malformed payload or address)");   // loop r1: no ex.Message (carries the token)
            }
            try
            {
                List<string> args = new List<string> { addr };
                args.AddRange(pairs);
                Utils.sendUiCommand(this, "setSharedGroups", args.ToArray());
            }
            catch (Exception) { }
        }

        private void onDeclineRequest(string address)
        {
            // CH2: decline = remove the friend (mirrors SingleChatPage's undorequest).
            Friend friend = FriendList.getFriend(new Address(address));
            if (friend == null)
            {
                return;
            }
            FriendList.removeFriend(friend);
            UIHelpers.shouldRefreshContacts = true;
        }

        private void onUninstallApp(string appId)
        {
            // A1: same removal AppDetailsPage.onUninstall uses (MiniAppManager.remove).
            // Re-render the tab UNCONDITIONALLY (mirrors AppDetailsPage setting
            // shouldRefreshApps regardless) so the FE's optimistic tile-removal and the
            // authoritative C# list always converge — even if remove() returns false
            // (app already gone), loadApps re-pushes the current truth.
            Node.MiniAppManager.remove(appId);
            UIHelpers.shouldRefreshApps = true;
            loadApps(true);
        }

        public SpixiContentPage? getDetailContent()
        {
            return detailContent;
        }
    }
}
