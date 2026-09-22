using IXICore;
using IXICore.Activity;
using IXICore.Meta;
using IXICore.Streaming;
using Microsoft.Maui.ApplicationModel;
using Microsoft.Maui.Storage;               // Preferences (hidebalance, #285)
using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using SPIXI.Lang;
using SPIXI.Meta;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Web;

namespace SPIXI
{
    [XamlCompilation(XamlCompilationOptions.Compile)]
    public partial class WalletSentPage : SpixiContentPage
    {
        /* #903: `volatile` because the field is now SWAPPED on a pool thread (showTransaction)
         * and read on the UI thread (the explorer verb). Every render reads it ONCE, under
         * txLock — see checkTransactionLocked. */
        private volatile Transaction transaction;
        private ActivityStatus lastActivityStatus = 0;

        private bool viewOnly = true;

        private HomePage? homePage;

        // #903 r2: `volatile` — every WRITER now runs on a pool thread under txLock, while
        // updateScreen reads it unlocked; a stale `true` from a confirmed transaction would
        // silently stop the poll for the pending one that replaced it.
        private volatile bool isConfirmedDisplayed = false;

        // #334 W9(b): true only after a FULL burst (through setData) reached the
        // shell. lastActivityStatus used to latch BEFORE the pushes, so any
        // mid-method exception left the 1 Hz updateScreen poll early-returning
        // forever on an empty view; it also neutralizes the `= 0` initial-value
        // sentinel (a first activity whose status equals the default no longer
        // skips the first burst). Enum-agnostic — no ActivityStatus members named.
        private bool burstPushed = false;
        // #334 W9(a/b): whether the last committed burst was the activity == null
        // fallback — dedupes the null-case 1 Hz re-burst (pre-fix that case NRE'd,
        // so there is no legacy behavior to preserve) and blocks a false
        // unchanged-status skip when the activity appears later (lastActivityStatus
        // is stale across a null gap).
        private bool lastActivityMissing = false;

        /* ★★ #903 (the #46 loop over #898, MAJOR) — ONE LOCK, AND THE UI THREAD NEVER TAKES IT.
         * checkTransaction has two callers on two threads: Node.updateUILoop's POOL tick
         * (updateScreen, every 2 s while the transaction is not Final) and the UI thread
         * (onLoad — and, since #898, showTransaction on EVERY tap, on a page that now lives
         * for the whole pane session). Unsynchronised, that is two defects on a money card:
         *  (1) the body read the `transaction` field THREE times (the activity lookup, the
         *      fallback, and setData's txid). A swap between them committed transaction A's
         *      amount, fee and counterparty under transaction B's id.
         *  (2) MainThread.BeginInvokeOnMainThread RUNS INLINE when it is already on the main
         *      thread and POSTS otherwise. So a tick's burst for A, posted a moment before the
         *      tap, landed AFTER the tap's inline burst for B: A painted last, while every
         *      latch said B — and an unchanged status then never corrected it.
         * The fix is the one HomePage.loadTransactions already carries for the same class
         * (its ROUND 2 note): the UI thread hands the work to the pool and returns. Every
         * burst is then POSTED, from under this lock, so bursts reach the shell whole and in
         * lock order; and the UI thread cannot freeze behind a tick that is itself waiting on
         * Ixian-Core's storage lock. */
        private readonly object txLock = new object();
        // #903: a swap that a LATER tap has superseded is dropped, not rendered — two pool
        // tasks may start in either order, and the last tap must be the one that shows.
        private int swapSeq = 0;
        /* #903 r2 (break-my-verdict, MINOR): WHAT THE SHELL WAS LAST GIVEN. The swap assigns
         * `transaction` inside the lock BEFORE the burst is built and posted, so for that window
         * the card on screen is still A while the field already says B — and the explorer verb
         * reads on the UI thread. It opens what the user is LOOKING at, which is this. Written
         * by the burst itself, so a swap never has to reset it. */
        private volatile Transaction? shownTransaction;
        /* #903 r2 (MINOR): HOW THIS PAGE IS PRESENTED, decided by the one site that knows —
         * HomePage's pane construct sets it. The first cut asked `getStagingPage() == this` at
         * onLoad, which is a PROXY: a shell slower than the 4 s failsafe is presented by the
         * timeout, is no longer "staging" when onLoad fires, and took the fade arm while ALREADY
         * VISIBLE in the detail column — Damir's flash again, by the slow path. */
        public bool paneHosted = false;

        public WalletSentPage(Transaction tx, bool view_only = true, HomePage? home = null)
        {
            viewOnly = view_only;

            InitializeComponent();
            NavigationPage.SetHasNavigationBar(this, false);
            webView.Opacity = 0;
            // #259 redesigned shell (instant-bg = --surface-screen): the pre-paint
            // backing must match it, not the legacy launch-blue (N1/N3 class; fixed
            // with the edge-to-edge batch alongside the stale surfaceColorFor entry).
            Content.BackgroundColor = ThemeManager.getSurfaceColor();

            transaction = tx;

            loadPage(webView, "wallet_sent.html");

            homePage = home;
        }

        private void onNavigated(object sender, WebNavigatedEventArgs e)
        {
            // Deprecated due to WPF, use onLoad
        }

        private void onLoad()
        {
            if (transaction == null)
            {
                onDismiss();
                return;
            }

            // #334 loop MINOR-2: every ixian:onload = a FRESH shell document (an OS
            // theme flip reloadAllPages reboots it with an empty staging buffer) —
            // an armed burstPushed would early-return the re-burst and leave a
            // PENDING tx's card permanently blank. Reset with the document.
            // #903: the reset itself moved INTO the locked pass (checkTransaction(true)) —
            // written here, unlocked, a tick finishing a moment later re-armed burstPushed and
            // the fresh document's burst early-returned as "unchanged": the blank card again.

            // #334 W9(c): hideBackButton FIRST — it rebuilds the shell's topbar, so
            // pushing it after setHideBalance + the data burst re-shaped chrome under
            // an already-populated view (defense per the be-cutover W9 row: settle the
            // page shape before any data lands).
            if (homePage != null)
            {
                Utils.sendUiCommand(this, "hideBackButton");
            }

            // #285 (#263/#276 hide leg, F5 2026-07-29): the detail page previously
            // stayed unmasked ("explicit reveal" dial — designed for the mobile
            // sheet→Details flow). On desktop a row tap opens THIS page directly in
            // the pane, leaking amount/fiat/name/address next to a masked list.
            // Push the persisted flag BEFORE the burst so the first render is
            // already masked; the shell offers a per-view reveal eye.
            /* ★ F7 INSTRUMENTATION (log only — Damir: "Show amounts" is not displayed on
             * Android). The shell offers the eye only when `hideKnown && walletHidden`
             * (wallet_sent.html:258), and which of the two is false cannot be decided from
             * source: `hideKnown` is set by the ARRIVAL of this push, `walletHidden` by its
             * VALUE. Logging the value here splits them — a `false` value means the wallet
             * is simply not hidden (and the eye is correctly absent), while a `true` value
             * with no eye on screen means the push did not reach the shell and `hideKnown`
             * is the one that stayed false. Adjacent to the known pre-exister B3. */
            bool hideBalancePref = Preferences.Default.Get("hidebalance", false);
            Logging.info("[WALLETDIAG] setHideBalance push · hidebalance=" + hideBalancePref);
            Utils.sendUiCommand(this, "setHideBalance", hideBalancePref.ToString());
            checkTransaction(true);   // #903: fresh document → the latches reset under the lock

            try
            {
                /* ★★ #898 (Damir, 2026-09-18: "there should be no flash at all on desktop — no
                 * fade no flash no nothing"). This was `webView.FadeTo(1, 150)`, and it WAS the
                 * flash: for 150 ms the WebView is translucent, so whatever is pinned under the
                 * detail column shows straight through it.
                 * The fade is a legacy reveal that predates the paint gate and is now redundant:
                 * `wallet_sent.html` calls `bridge.painted()` (:390), and `presentPreload` holds
                 * the stage until that signal arrives, so on the overlay path the shell has
                 * ALREADY painted before anything is on screen. A ramp from 0 never hid an
                 * unpainted frame anyway — it showed the same frame, dimmed.
                 * The ctor's `Opacity = 0` stays: it is what keeps an empty WebView off screen
                 * until the data push completes. Only the RAMP is gone.
                 * ★ #903 (the #46 loop, MINOR): …ON THE OVERLAY PATH, which is the only path the
                 * argument above covers. This page is also PUSHED — a narrow window and every
                 * phone (HomePage.onTransaction's tail, ContactDetails, SingleChatPage) — and a
                 * pushed page has no stage and no paint gate: it is on screen when onLoad runs,
                 * so an instant reveal shows the shell's boot spinner for the frames before the
                 * burst lands. The ramp was covering exactly that, over the page's own opaque
                 * ground (nothing shows through a pushed page). #898 removed it there unmeasured;
                 * the pushed path gets its pre-#898 reveal back, byte for byte.
                 * Which path this is comes from `paneHosted` (set by the pane's one construct
                 * site), not from asking whether the page is still staging — see the field. */
                if (paneHosted)
                {
                    webView.Opacity = 1;
                }
                else
                {
                    webView.FadeTo(1, 150);
                }
            }
            catch (Exception e)
            {
                Logging.warn("Exception: " + e);
            }
        }

        private void onNavigating(object sender, WebNavigatingEventArgs e)
        {
            string current_url = HttpUtility.UrlDecode(e.Url);
            // #797: cancel first. A throw in a branch must not leave an ixian: navigation for the WebView to load.
            e.Cancel = true;

            if (onNavigatingGlobal(current_url))
            {
                e.Cancel = true;
                return;
            }

            if (current_url.Equals("ixian:onload", StringComparison.Ordinal))
            {
                onLoad();
            }
            else if (current_url.Equals("ixian:dismiss", StringComparison.Ordinal))
            {
                onDismiss();
            }
            else if (current_url.Equals("ixian:viewexplorer", StringComparison.Ordinal))
            {
                /* ★ THE ONE EXTERNAL-OPEN GATE (Spixi/Utils/Utils.cs). The txid is a local
                 * value, not peer text, but `new Uri(...)` threw on a malformed one. Nothing
                 * in THIS file wraps the branch, so the exception escaped into the platform
                 * host — and, read at the caller, both hosts in this repository CATCH it:
                 * Android try/catches `SendNavigating` in SpixiWebViewClient and then reads
                 * `args.Cancel`; iOS try/catches `base.DecidePolicy`, the call that raises
                 * MAUI's Navigating event, and fails closed with `decide(Cancel)`. The cost
                 * is the rest of this handler being abandoned, plus — on iOS — the exception
                 * object logged IN FULL into ixian.log, which DevPage renders and shares in
                 * one tap. The gate parses inside a guard and returns false, so neither
                 * happens.
                 * ⚠ TWO earlier versions of this comment were wrong. The first called this
                 * the #797 shape: FALSE — `e.Cancel = true` is set at the TOP of
                 * onNavigating, above every branch, and the comment on that line says so, so
                 * the WebView could never load `ixian:viewexplorer`. The second said an
                 * unhandled escape "takes the process down on Android and iOS": also FALSE,
                 * disproved by the two catches named above (#772). */
                Transaction? onScreen = shownTransaction ?? transaction;   // #903 r2: the transaction the CARD shows, not the one a swap is about to show
                if (onScreen != null)
                {
                    Utils.openExternal(String.Format("{0}?p=transaction&id={1}", Config.explorerUrl, onScreen.getTxIdString()));
                }
            }
            else if (current_url.Trim().StartsWith("file:", StringComparison.OrdinalIgnoreCase))
            {
                // allow normal navigation only for local files
                e.Cancel = false;
                return;
            }
            e.Cancel = true;

        }

        // Retrieve the transaction from local cache storage
        // #903: never runs its body on the UI thread, and never outside txLock — see the
        // field's docblock. `freshDocument` = onLoad: the shell document is new and empty.
        private void checkTransaction(bool freshDocument = false)
        {
            if (MainThread.IsMainThread)
            {
                Task.Run(() =>
                {
                    try
                    {
                        checkTransaction(freshDocument);
                    }
                    catch (Exception e)
                    {
                        Logging.error("Exception occurred in checkTransaction: " + e.GetType().Name);
                    }
                });
                return;
            }
            lock (txLock)
            {
                if (freshDocument)
                {
                    burstPushed = false;
                    lastActivityMissing = false;
                }
                checkTransactionLocked();
            }
        }

        private void checkTransactionLocked()
        {
            Transaction tx = transaction;   // #903: ONE read — a swap mid-pass cannot mix two transactions
            if (tx == null)
            {
                return;
            }
            Utils.sendUiCommand(this, "clearEntries");

            string confirmed = "error";

            var activity = Node.activityStorage.getActivityById(tx.id, null, true);
            Transaction? ctransaction = tx;
            if (activity != null)
            {
                // #334 W9(b): early-return only when the previous burst actually
                // REACHED the shell (burstPushed) AND wasn't the null-activity
                // fallback (its status latch is stale) — see the field notes. The
                // lone clearEntries pushed above is buffer-reset-only by the shell's
                // #289 staging contract, same as the pre-existing early-return shape.
                if (burstPushed && !lastActivityMissing && lastActivityStatus == activity.status)
                {
                    return;
                }
                // #334 loop MINOR-3: the status latch moved to AFTER setData (with
                // burstPushed) — latching here re-created the exact wedge W9 fixed
                // for the first burst: a mid-burst exception on a LATER status change
                // left burstPushed=true + the NEW status latched → early-return
                // forever with the old card shown.
                // #334 W9(a) class: a null activity.transaction previously NRE'd at
                // the amount read below — fall back to the constructor transaction.
                ctransaction = activity.transaction ?? tx;
                if (activity.status == IXICore.Activity.ActivityStatus.Final)
                {
                    isConfirmedDisplayed = true;
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
            }
            else
            {
                // #334 W9(a/b): the null-activity fallback burst is pushed ONCE; a
                // repeat tick with activity still null has nothing new → lone
                // clearEntries only (buffer reset, no re-render churn).
                if (burstPushed && lastActivityMissing)
                {
                    return;
                }
                confirmed = "error";
            }

            IxiNumber amount = ctransaction.amount;

            // iOS-55 (#325, W1 LANDED): raw epoch seconds — the shell formats via
            // formatTxTimestamp/docLocale (see HomePage.addPaymentActivity note).
            // #334 W9(a): the activity == null else-branch above fell through to this
            // deref → NRE on every poll tick. Fallback = "" (no-time): a "0" would
            // render VERBATIM — txTimeDisplay's numeric gate is `> 0` so "0" falls to
            // the legacy-text branch and timeText wins when non-empty (wallet_sent
            // .html:293 + txlist-item.js:68); '' marshals fine (sendUiCommand quotes).
            string time = activity != null ? activity.timestamp.ToString() : "";

            string type = "send";

            Address addr = ctransaction.pubKey;
            if (addr.SequenceEqual(IxianHandler.getWalletStorage().getPrimaryAddress()))
            {
                // this is a sent payment

                foreach (var entry in ctransaction.toList)
                {
                    Friend? friend = FriendList.getFriend(entry.Key);
                    IxiNumber entry_amount = entry.Value.amount;
                    IxiNumber fiat_amount = entry_amount * Node.fiatPrice;

                    string username = SpixiLocalization._SL("wallet-unknown-recipient");
                    string user_avatar = "img/spixiavatar.png";
                    if (friend != null)
                    {
                        username = friend.nickname;
                        var tmp_user_avatar = IxianHandler.localStorage.getAvatarPath(friend.walletAddress.ToString());
                        if (tmp_user_avatar != null)
                        {
                            user_avatar = tmp_user_avatar;
                        }
                    }

                    Utils.sendUiCommand(this, "addEntry", entry.Key.ToString(), username, user_avatar, Utils.amountToHumanFormatString(entry_amount), Utils.amountToHumanFormatString(fiat_amount), time, type, confirmed);

                    // TODO Handle multiple recipients
                    break;
                }
            }
            else
            {
                // this is a received payment
                type = "receive";
                amount = 0;

                foreach (var entry in ctransaction.toList)
                {
                    if (IxianHandler.getWalletStorage().isMyAddress(entry.Key))
                    {
                        amount += entry.Value.amount;
                    }
                }
                IxiNumber fiat_amount = amount * Node.fiatPrice;

                Utils.sendUiCommand(this, "setReceivedMode");
                Address sender_address = ctransaction.pubKey;
                Friend friend = FriendList.getFriend(sender_address);

                string username = SpixiLocalization._SL("wallet-unknown-sender");
                string user_avatar = "img/spixiavatar.png";

                if (friend != null)
                {
                    username = friend.nickname;
                    var tmp_user_avatar = IxianHandler.localStorage.getAvatarPath(friend.walletAddress.ToString());
                    if (tmp_user_avatar != null)
                    {
                        user_avatar = tmp_user_avatar;
                    }
                }

                Utils.sendUiCommand(this, "addEntry", sender_address.ToString(), username, user_avatar, Utils.amountToHumanFormatString(amount), Utils.amountToHumanFormatString(fiat_amount), time, type, confirmed);               

            }

            IxiNumber fee = 0;
            foreach (var toEntry in ctransaction.toList.TakeLast(2))
            {
                fee += toEntry.Value.amount;
            }
            fee += ctransaction.fee;

            Utils.sendUiCommand(this, "setData", amount.ToString(), fee.ToString(),
                time, tx.getTxIdString(), confirmed);
            // #334 W9(b): the burst is only now COMPLETE (setData commits the shell's
            // #289 staging buffer) — arm the unchanged-status early return.
            burstPushed = true;
            shownTransaction = tx;   // #903 r2: the explorer verb follows the card
            lastActivityMissing = (activity == null);
            if (activity != null)
            {
                lastActivityStatus = activity.status;   // loop MINOR-3: latch WITH the arm
            }
            return;
        }

        /* ★★ #898 — THE INSTANT SWAP. Damir: "each other you open just changes instantly".
         * Before this, every transaction tap constructed a NEW WalletSentPage and therefore a
         * new WebView, which had to boot, load the shell and paint before the overlay could be
         * presented — and the old detail was closed behind it. Nothing about that is instant.
         *
         * The page renders ENTIRELY from `transaction` via checkTransaction(), and the shell
         * commits a burst atomically (clearEntries/addEntry stage, setData commits — #289), so
         * swapping the field and re-rendering paints the new transaction in ONE frame with no
         * blank in between. The host reuses an open detail instead of building another.
         *
         * ⚠ EVERY per-transaction field is reset here, and that is the whole risk: these are
         * the #289/#334 latches that decide whether the poll (every 2 s) runs at all. Leaving
         * `isConfirmedDisplayed` true from a CONFIRMED previous transaction would silently stop
         * `updateScreen` polling the new one, so a pending transaction would never update; a
         * stale `lastActivityStatus`/`burstPushed` would make checkTransaction skip its first
         * burst as "unchanged". A field added later and not reset here is the same bug again,
         * which is what the suite pin derives rather than lists. */
        public void showTransaction(Transaction tx)
        {
            /* #903 (the #46 loop, MINOR): `activity.transaction` is nullable and this file says
             * so (W9(a)). A null here used to NRE inside the pass AFTER its clearEntries — and
             * the pane then kept showing the PREVIOUS transaction under the new row's
             * highlight. A tap that cannot be shown changes nothing. */
            if (tx == null)
            {
                return;
            }
            int seq = Interlocked.Increment(ref swapSeq);
            Task.Run(() =>
            {
                try
                {
                    lock (txLock)
                    {
                        if (seq != Volatile.Read(ref swapSeq))
                        {
                            return;   // a later tap owns the pane
                        }
                        transaction = tx;
                        lastActivityStatus = 0;
                        isConfirmedDisplayed = false;
                        burstPushed = false;
                        lastActivityMissing = false;
                        checkTransactionLocked();
                    }
                }
                catch (Exception e)
                {
                    Logging.error("Exception occurred in showTransaction: " + e.GetType().Name);
                }
            });
        }

        public override void updateScreen()
        {
            if (!isConfirmedDisplayed)
            {
                checkTransaction();
            }
        }

        private void onDismiss()
        {
            if (!viewOnly)
            {
                removePage(Navigation.NavigationStack[Navigation.NavigationStack.Count - 2]);
                removePage(Navigation.NavigationStack[Navigation.NavigationStack.Count - 2]);
            }
            popPageAsync();
        }

        protected override bool OnBackButtonPressed()
        {
            onDismiss();
            return true;
        }
    }
}