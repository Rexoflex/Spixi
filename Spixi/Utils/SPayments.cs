using IXICore;
using IXICore.Meta;
using IXICore.Streaming;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Storage;
using Plugin.Fingerprint;
using Plugin.Fingerprint.Abstractions;
using SPIXI.Lang;
using SPIXI.Meta;
using System;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace SPIXI
{
    /// <summary>
    /// W5/W6 (#523/#524/#525) — the ONE money hand-off helper for the redesigned shells.
    /// The WebView only PROPOSES a payment. This class re-parses the proposal, shows a
    /// NATIVE confirm built from ITS OWN parse, runs the optional payment auth (PA1),
    /// and only then signs and broadcasts through the SAME sanctioned path the legacy
    /// pages use (Node.sendTransactionFrom). Every outcome is answered with a push —
    /// the shell never resolves a money action on its own.
    /// SECURITY.md: no key, no password and no signature crosses the bridge here.
    /// </summary>
    public static class SPayments
    {
        public const string PAYMENT_AUTH_PREF = "paymentauth";

        // One native confirm at a time, app-wide. A second signSend/payRequest while
        // one confirm is open answers 'fail' (with the default copy) instead of
        // stacking dialogs. ★ Loop fix: the latch SELF-HEALS after 120 s — a lost
        // alert must never wedge every later money action until an app restart.
        private static int confirmInFlight = 0;
        private static long confirmInFlightSince = 0;

        private static bool acquireConfirm()
        {
            long now = Environment.TickCount64;
            if (Interlocked.Exchange(ref confirmInFlight, 1) == 1)
            {
                if (now - Interlocked.Read(ref confirmInFlightSince) < 120000)
                {
                    return false;
                }
                Logging.warn("SPayments: stealing a stale confirm latch");
            }
            Interlocked.Exchange(ref confirmInFlightSince, now);
            return true;
        }

        private static void releaseConfirm()
        {
            Interlocked.Exchange(ref confirmInFlight, 0);
        }

        public static bool paymentAuthEnabled()
        {
            return Preferences.Default.Get(PAYMENT_AUTH_PREF, false);
        }

        /// <summary>
        /// ★ W-g (Batch W, loop r1 B-1/C-1): where the "Confirm payments" gate can ACT.
        /// confirmAndAuth skips Plugin.Fingerprint on WinUI (the LockPage:382 rule), so
        /// there the toggle is a no-op switch — SettingsPage withholds the cap + the seed.
        /// ONE predicate for both sites. MacCatalyst is NOT gated here: whether Touch ID
        /// answers IsAvailableAsync there is a device fact for the Mac session, not a
        /// source fact. The runtime residual (a device with nothing enrolled →
        /// IsAvailableAsync false → the explicit native confirm stands) is documented,
        /// not gated: it is async device state, and the native confirm is still the wall.
        /// </summary>
        public static bool paymentAuthSupported()
        {
            return Device.RuntimePlatform != Device.WinUI;
        }

        /// <summary>
        /// W6 — `ixian:feeQuery:&lt;addr&gt;:&lt;amount&gt;` →
        /// `setSendQuote(addr, amount, fee, balance, maxAmount, error)`.
        /// Amount "0" = balance + Max quote (fee slot empty → the review stays gated).
        /// error: '' | 'address'. Nothing is broadcast; the estimation signs a
        /// DISCARDED tx — the same mechanism the legacy pages use.
        /// </summary>
        /* ★★ L1 (#640) — THE PEER-SCOPED PAYMENT REQUEST, IN ONE PLACE.
         *
         * This method was `SingleChatPage.onSendRequestFromChat` and is UNCHANGED
         * except that it now takes its page and its friend as arguments. It moved
         * because contact details grew the same Request action when the legacy
         * WalletReceivePage was deleted, and a second copy of a money guard is the
         * V-8 pattern: two homes for one rule, and they drift.
         *
         * The W8 grammar: `ixian:sendrequest:<addr>:<amount>`, ONE recipient, and the
         * address MUST be the peer whose surface is open. A request is a chat MESSAGE
         * — nothing is signed and nothing is broadcast here (SECURITY.md).
         *
         * ★ Every rejection is SURFACED (#268 FIX-3): the sheet has already morphed to
         * "Requested", so a silent no-op is the ⑪ delivery lie. Guards mirror
         * HomePage.onSendRequest — approved + Normal + !bot — and FAIL CLOSED.
         */
        public static void handleSendRequest(SpixiContentPage page, Friend friend, string payload)
        {
            try
            {
                int sep = payload.IndexOf(':');
                if (sep <= 0)
                {
                    return;
                }
                string addr = payload.Substring(0, sep);
                string amountStr = payload.Substring(sep + 1);
                if (friend == null || friend.bot || friend.type != FriendType.Normal
                    || !friend.approved || friend.state != FriendState.Approved)
                {
                    Logging.warn("sendrequest rejected: peer not an approved contact");
                    page.displaySpixiAlert(SpixiLocalization._SL("global-invalid-address-title"), SpixiLocalization._SL("global-invalid-address-text"), SpixiLocalization._SL("global-dialog-ok"));
                    return;
                }
                if (!friend.walletAddress.ToString().Equals(addr, StringComparison.Ordinal))
                {
                    Logging.warn("sendrequest rejected: address is not the open peer");
                    page.displaySpixiAlert(SpixiLocalization._SL("global-invalid-address-title"), SpixiLocalization._SL("global-invalid-address-text"), SpixiLocalization._SL("global-dialog-ok"));
                    return;
                }
                // The HomePage.onSendRequest amount normalization, verbatim — a second
                // dot is REJECTED (IxiNumber silently truncates "1.2.3" to 1.2 while the
                // stored message text would keep the full string).
                string[] amount_split = amountStr.Split(new string[] { "." }, StringSplitOptions.None);
                if (amount_split.Length > 2)
                {
                    page.displaySpixiAlert(SpixiLocalization._SL("wallet-error-amount-title"), SpixiLocalization._SL("wallet-error-amountdecimal-text"), SpixiLocalization._SL("global-dialog-ok"));
                    return;
                }
                if (amount_split.Length == 1)
                {
                    amountStr = String.Format("{0}.0", amountStr);
                }
                IxiNumber _amount;
                try { _amount = new IxiNumber(amountStr); } catch (Exception) { _amount = 0; }
                if (_amount == 0 || _amount < (long)0)
                {
                    page.displaySpixiAlert(SpixiLocalization._SL("wallet-error-amount-title"), SpixiLocalization._SL("wallet-error-amount-text"), SpixiLocalization._SL("global-dialog-ok"));
                    return;
                }
                // the exact HomePage.onSendRequest send pair (:1193-1195)
                FriendMessage? friend_message = Node.addMessageWithType(null, FriendMessageType.requestFunds, friend.walletAddress, 0, amountStr, true);
                if (friend_message == null)
                {
                    page.displaySpixiAlert(SpixiLocalization._SL("global-invalid-address-title"), SpixiLocalization._SL("global-invalid-address-text"), SpixiLocalization._SL("global-dialog-ok"));
                    return;
                }
                CoreStreamProcessor.transactionRequest(friend_message.id, friend, _amount, null, null);
            }
            catch (Exception ex)
            {
                Logging.error("handleSendRequest failed: " + ex.Message);
            }
        }

        public static void handleFeeQuery(SpixiContentPage page, string payload)
        {
            try
            {
                int sep = payload.IndexOf(':');
                if (sep <= 0)
                {
                    return;
                }
                string addr = payload.Substring(0, sep);
                string amountStr = payload.Substring(sep + 1);
                string balance = "";
                try { balance = Node.getAvailableBalance().ToString(); } catch (Exception) { }
                // ★ Loop MAJOR fix: a quote is ALWAYS answered. A silent drop stranded
                // the compose on "Calculating network fee…" forever (the shell dedupes
                // the ask). An invalid address answers with error:'address'.
                if (!ExtendedAddress.Validate(addr))
                {
                    Utils.sendUiCommand(page, "setSendQuote", addr, amountStr, "", balance, "", "address");
                    return;
                }
                IxiNumber amount = parseAmount(amountStr);
                string fee = "";
                string maxAmount = "";
                if (amount > (long)0)
                {
                    fee = estimateFee(addr, amount);
                }
                else
                {
                    // amount 0 = the balance + Max quote: the Max button needs a REAL
                    // ceiling (the two-iteration solve), not balance − a guessed fee.
                    maxAmount = estimateMaxAmount(addr);
                }
                Utils.sendUiCommand(page, "setSendQuote", addr, amountStr, fee, balance, maxAmount, "");
            }
            catch (Exception ex)
            {
                Logging.error("SPayments.feeQuery failed: " + ex.Message);
            }
        }

        // Fee ladder (W6): the exact per-amount estimate; on failure the dust-limit
        // estimate; on failure "" — the shell keeps the review GATED (no invented fee).
        private static string estimateFee(string addr, IxiNumber amount)
        {
            try
            {
                return Node.calculateTransactionFee(IxianHandler.primaryWalletAddress, new ExtendedAddress(addr), amount).ToString();
            }
            catch (Exception)
            {
                try
                {
                    return Node.calculateTransactionFee(IxianHandler.primaryWalletAddress, new ExtendedAddress(addr), ConsensusConfig.transactionDustLimit).ToString();
                }
                catch (Exception)
                {
                    return "";
                }
            }
        }

        // Max = available − the send-everything fee (Node's two-iteration solve).
        private static string estimateMaxAmount(string addr)
        {
            try
            {
                IxiNumber bal = Node.getAvailableBalance();
                if (bal <= (long)0)
                {
                    return "";
                }
                IxiNumber fee = Node.calculateTransactionFeeFromAvailableBalance(IxianHandler.primaryWalletAddress, new ExtendedAddress(addr));
                IxiNumber max = bal - fee;
                if (max <= (long)0)
                {
                    return "";
                }
                return max.ToString();
            }
            catch (Exception)
            {
                return "";
            }
        }

        /// <summary>
        /// W5 — `ixian:signSend:&lt;addr&gt;:&lt;amount&gt;` → native confirm (+ auth) → sign +
        /// broadcast → `signSendResult(status, info)`. status: ok | cancel | fail.
        /// </summary>
        /* ★ Session H review (auditor B MINOR-4 / gate sweep): `expectedRecipient` scopes a
         * PEER-LOCKED surface. contact_details.html and chat.html both compose with
         * lockedRecipient (the peer is fixed in the UI), so their C# handlers pass the
         * page's peer and any other address in the payload is refused before parsing —
         * the same shape handleSendRequest has carried since L1. HomePage (quickscan /
         * wallet Send) legitimately composes to ANY address and passes null. The native
         * confirm (recipient shown, amount, fee) still stands behind every path; this is
         * defence in depth against a compromised chat WebView proposing a swap. */
        public static async void handleSignSend(SpixiContentPage page, string payload, Address? expectedRecipient = null)
        {
            if (!acquireConfirm())
            {
                // a confirm is already open — say so, never silently (loop fix)
                Utils.sendUiCommand(page, "signSendResult", "fail", "");
                return;
            }
            try
            {
                int sep = payload.IndexOf(':');
                string addr = sep > 0 ? payload.Substring(0, sep) : "";
                string amountStr = sep > 0 ? payload.Substring(sep + 1) : "";
                if (!ExtendedAddress.Validate(addr))
                {
                    Utils.sendUiCommand(page, "signSendResult", "fail", SpixiLocalization._SL("global-invalid-address-text"));
                    return;
                }
                if (expectedRecipient != null && !(new ExtendedAddress(addr)).PaymentAddress.SequenceEqual(expectedRecipient))
                {
                    // a peer-locked surface proposed a DIFFERENT recipient — refuse, never reinterpret
                    Utils.sendUiCommand(page, "signSendResult", "fail", SpixiLocalization._SL("global-invalid-address-text"));
                    return;
                }
                IxiNumber amount = parseAmount(amountStr);
                if (amount <= (long)0)
                {
                    Utils.sendUiCommand(page, "signSendResult", "fail", SpixiLocalization._SL("wallet-error-amount-text"));
                    return;
                }

                ExtendedAddress to = new ExtendedAddress(addr);
                bool friendSend = false;
                // ★ Loop MAJOR fix: a bare base58 address to a CONTACT rides OfflineTag —
                // the flag every legacy chat-originated send carries, and the ONLY thing
                // that produces the sent-funds chat bubble + the P2P notify
                // (Node.cs:751-763 fires per extended address). A user-pasted extended
                // form keeps its own flags; friend sends skip the network resolve
                // (legacy parity: SingleChatPage:480 never resolved).
                if (to.Flag == AddressPaymentFlag.Primary && FriendList.getFriend(to.PaymentAddress) != null)
                {
                    to = new ExtendedAddress(to.PaymentAddress, AddressPaymentFlag.OfflineTag, null);
                    friendSend = true;
                }
                if (!friendSend)
                {
                    to = await CoreStreamProcessor.resolveExtendedAddress(0, to);
                    if (to == null)
                    {
                        // resolve can answer null on connect failure (loop MINOR fix)
                        Utils.sendUiCommand(page, "signSendResult", "fail", SpixiLocalization._SL("global-invalid-address-text"));
                        return;
                    }
                }

                IxiNumber fee = Node.calculateTransactionFee(IxianHandler.primaryWalletAddress, to, amount);
                IxiNumber availableBalance = Node.getAvailableBalance();
                if (amount + fee > availableBalance)
                {
                    string body = String.Format(SpixiLocalization._SL("wallet-error-balance-text"),
                        Utils.amountToLocalizedDisplayString(amount + fee),
                        Utils.amountToLocalizedDisplayString(availableBalance));
                    Utils.sendUiCommand(page, "signSendResult", "fail", body);
                    return;
                }

                bool ok = await confirmAndAuth(page, recipientDisplay(addr), amount, fee);
                if (!ok)
                {
                    Utils.sendUiCommand(page, "signSendResult", "cancel", "");
                    return;
                }

                Address from = IxianHandler.getWalletStorage().getPrimaryAddress();
                Transaction transaction = Node.sendTransactionFrom(from, to, amount, null);
                if (transaction == null)
                {
                    // the legacy send page's own guard class (WalletSend2Page, deleted with
                    // ★★ L1 #640) — never dereference a failed send
                    Utils.sendUiCommand(page, "signSendResult", "fail", SpixiLocalization._SL("wallet-error-amount-text"));
                    return;
                }
                Utils.sendUiCommand(page, "signSendResult", "ok", transaction.getTxIdString());
            }
            catch (Exception ex)
            {
                Logging.error("SPayments.signSend failed: " + ex.Message);
                try { Utils.sendUiCommand(page, "signSendResult", "fail", ""); } catch (Exception) { }
            }
            finally
            {
                releaseConfirm();
            }
        }

        /// <summary>
        /// W5 — pay an incoming payment request IN PLACE: the WalletContactRequestPage
        /// onSend body, extracted, plus the null guard that page lacks. The caller
        /// (SingleChatPage) resolves the FriendMessage; the card flips through the
        /// normal updateRequestFundsStatus push. `payRequestResult` answers cancel/fail
        /// so the card's Pay latch can release.
        /// </summary>
        public static async void handlePayRequest(SingleChatPage page, Friend friend, FriendMessage? requestMsg, string msgIdHex)
        {
            if (!acquireConfirm())
            {
                Utils.sendUiCommand(page, "payRequestResult", msgIdHex, "fail", "");
                return;
            }
            try
            {
                // ★ Batch W loop r1 A-1: an UNPAYABLE request is "gone", never "cancel".
                // "cancel" is reserved for the user backing out of the native confirm —
                // the shell renders it as a SILENT re-enable, which for these five cases
                // was a permanent silent no-op on Confirm & send.
                if (requestMsg == null || requestMsg.type != FriendMessageType.requestFunds
                    || requestMsg.localSender || requestMsg.message.StartsWith(":"))
                {
                    // unknown / own / already paid or declined — nothing to pay
                    Utils.sendUiCommand(page, "payRequestResult", msgIdHex, "gone", "");
                    return;
                }
                IxiNumber amount = parseAmount(requestMsg.message);
                if (amount <= (long)0)
                {
                    Utils.sendUiCommand(page, "payRequestResult", msgIdHex, "gone", "");
                    return;
                }

                ExtendedAddress to = new ExtendedAddress(friend.walletAddress, AddressPaymentFlag.OfflineTag, null);
                IxiNumber fee = Node.calculateTransactionFee(IxianHandler.primaryWalletAddress, to, amount);
                IxiNumber availableBalance = Node.getAvailableBalance();
                if (amount + fee > availableBalance)
                {
                    string body = String.Format(SpixiLocalization._SL("wallet-error-balance-text"),
                        Utils.amountToLocalizedDisplayString(amount + fee),
                        Utils.amountToLocalizedDisplayString(availableBalance));
                    Utils.sendUiCommand(page, "payRequestResult", msgIdHex, "fail", body);
                    return;
                }

                string who = friend.nickname;
                if (String.IsNullOrEmpty(who))
                {
                    who = friend.walletAddress.ToString();
                }
                bool ok = await confirmAndAuth(page, who, amount, fee);
                if (!ok)
                {
                    Utils.sendUiCommand(page, "payRequestResult", msgIdHex, "cancel", "");
                    return;
                }
                if (requestMsg.message.StartsWith(":"))
                {
                    // settled while the confirm was open (remote decline echo / double path) — "gone" (loop r1 A-1)
                    Utils.sendUiCommand(page, "payRequestResult", msgIdHex, "gone", "");
                    return;
                }

                string msg_id = Crypto.hashToString(requestMsg.id);
                Address from = IxianHandler.getWalletStorage().getPrimaryAddress();
                Transaction transaction = Node.sendTransactionFrom(from, to, amount, null);
                if (transaction == null)
                {
                    Utils.sendUiCommand(page, "payRequestResult", msgIdHex, "fail", SpixiLocalization._SL("wallet-error-amount-text"));
                    return;
                }

                SpixiMessage spixi_message = new SpixiMessage(SpixiMessageCode.requestFundsResponse,
                    Encoding.UTF8.GetBytes(msg_id + ":" + transaction.getTxIdString()));
                requestMsg.message = ":" + transaction.getTxIdString();

                StreamMessage message = new StreamMessage(friend.protocolVersion);
                message.type = StreamMessageCode.info;
                message.recipient = to.PaymentAddress;
                message.sender = IxianHandler.getWalletStorage().getPrimaryAddress();
                message.data = spixi_message.getBytes();

                CoreStreamProcessor.sendMessage(friend, message);

                IxianHandler.localStorage.requestWriteMessages(friend.walletAddress, 0);

                page.updateRequestFundsStatus(requestMsg.id, transaction.id, SpixiLocalization._SL("chat-payment-status-pending"));
                Utils.sendUiCommand(page, "payRequestResult", msgIdHex, "ok", "");
            }
            catch (Exception ex)
            {
                Logging.error("SPayments.payRequest failed: " + ex.Message);
                try { Utils.sendUiCommand(page, "payRequestResult", msgIdHex, "fail", ""); } catch (Exception) { }
            }
            finally
            {
                releaseConfirm();
            }
        }

        /// <summary>
        /// ★★ DECLINE, on the CARD (Damir's decision 3, 2026-08-29: "Decline lives on the
        /// card only, and the outcome shows on both sides").
        ///
        /// This body is `WalletContactRequestPage.onDecline`, extracted verbatim plus the
        /// null and state guards that page lacked, so the native page can go. It SENDS A
        /// MESSAGE and spends nothing: a `requestFundsResponse` carrying the request's id
        /// and NO txid is what tells the asker "no". The local copy is prefixed `::`,
        /// which is the settled marker every reader already understands, and the card
        /// flips through the ordinary `updateRequestFundsStatus` push.
        ///
        /// Idempotent by construction: a request already answered (message starts with
        /// ':') is left alone, so a double tap cannot send a second response or overwrite
        /// a txid that is already recorded.
        /// </summary>
        public static void declineRequest(SingleChatPage page, Friend friend, FriendMessage? requestMsg, string msgIdHex)
        {
            try
            {
                if (friend == null || requestMsg == null
                    || requestMsg.type != FriendMessageType.requestFunds
                    || requestMsg.localSender
                    || requestMsg.message.StartsWith(":"))
                {
                    // already paid, already declined, ours, or gone — the card re-renders
                    // from the push and its latch releases
                    Utils.sendUiCommand(page, "payRequestResult", msgIdHex, "gone", "");
                    return;
                }

                string msg_id = Crypto.hashToString(requestMsg.id);
                SpixiMessage spixi_message = new SpixiMessage(SpixiMessageCode.requestFundsResponse, Encoding.UTF8.GetBytes(msg_id));

                requestMsg.message = "::" + requestMsg.message;

                StreamMessage message = new StreamMessage(friend.protocolVersion);
                message.type = StreamMessageCode.info;
                message.recipient = friend.walletAddress;
                message.sender = IxianHandler.getWalletStorage().getPrimaryAddress();
                message.data = spixi_message.getBytes();

                CoreStreamProcessor.sendMessage(friend, message);

                IxianHandler.localStorage.requestWriteMessages(friend.walletAddress, 0);

                page.updateRequestFundsStatus(requestMsg.id, null, SpixiLocalization._SL("chat-payment-status-declined"));
                Utils.sendUiCommand(page, "payRequestResult", msgIdHex, "ok", "");
            }
            catch (Exception ex)
            {
                Logging.error("SPayments.declineRequest failed: " + ex.Message);
                try { Utils.sendUiCommand(page, "payRequestResult", msgIdHex, "fail", ""); } catch (Exception) { }
            }
        }

        /// <summary>
        /// ★★ V-2 (#46 loop, 2026-08-29) — THE TIP'S NATIVE WALL.
        /// A tip is a payment: the WebView composes the amount and C# signs and
        /// broadcasts it. It had NO native confirm at all — no dialog and no auth step —
        /// which is a CLAUDE.md ground-rule breach on its own, and it is why the paste
        /// defect (V-1) was silent on this surface: the button label was the user's last
        /// look at the number.
        /// D-10 removed the old tip alert deliberately, because that alert was a REPORT
        /// of a payment already made. This is the opposite: a wall BEFORE the broadcast.
        /// Same dialog, same numbers, same PA1 auth step and the same in-flight latch as
        /// Send and Pay. Damir, 2026-08-29: the native dialog IS the tip's review step.
        /// Returns false when the user cancels, when another confirm holds the latch, or
        /// when the dialog cannot be shown — the caller broadcasts nothing on false.
        /// </summary>
        public static async Task<bool> confirmTip(SpixiContentPage page, string addr, IxiNumber amount, IxiNumber fee)
        {
            if (!acquireConfirm())
            {
                return false;
            }
            try
            {
                return await confirmAndAuth(page, recipientDisplay(addr), amount, fee);
            }
            finally
            {
                releaseConfirm();
            }
        }

        /// <summary>
        /// The NATIVE confirm + the PA1 auth step. The dialog shows the recipient, the
        /// amount and the fee from C#'s OWN parse — never WebView-composed text beyond
        /// the values this class validated. Existing lang keys only.
        /// </summary>
        private static async Task<bool> confirmAndAuth(SpixiContentPage page, string who, IxiNumber amount, IxiNumber fee)
        {
            string title = SpixiLocalization._SL("wallet-send2-confirm-title");   // "You are about to send"
            string body = Utils.amountToLocalizedDisplayString(amount) + " IXI\n→ " + who + "\n\n"
                + SpixiLocalization._SL("wallet-send2-info") + " "
                + Utils.amountToLocalizedDisplayString(fee) + " "
                + SpixiLocalization._SL("wallet-send2-feeinfo");
            // Loop MAJOR fix: route via displaySpixiAlert. Overlay-presented pages
            // (#225: every conversation) are NOT in the navigation tree, and a direct
            // DisplayAlert on an unattached page is LOST (SpixiContentPage:2536 rule).
            bool ok = false;
            try
            {
                var alertTask = page.displaySpixiAlert(title, body,
                    SpixiLocalization._SL("wallet-send2-confirm"),
                    SpixiLocalization._SL("global-dialog-cancel"));
                ok = alertTask != null && await alertTask;
            }
            catch (Exception ex)
            {
                Logging.error("SPayments confirm failed: " + ex.Message);
                ok = false;
            }
            if (!ok)
            {
                return false;
            }
            if (!paymentAuthEnabled())
            {
                return true;
            }
            if (Device.RuntimePlatform == Device.WinUI)
            {
                return true;   // Plugin.Fingerprint is skipped on WinUI — the app-lock rule (LockPage:382)
            }
            try
            {
                bool available = await CrossFingerprint.Current.IsAvailableAsync(true);
                if (!available)
                {
                    return true;   // no auth hardware → the explicit native confirm stands
                }
                var dialogConfig = new AuthenticationRequestConfiguration("SPIXI", title)
                {
                    AllowAlternativeAuthentication = true,
                    ConfirmationRequired = true
                };
                var result = await CrossFingerprint.Current.AuthenticateAsync(dialogConfig);
                return result.Authenticated;
            }
            catch (Exception ex)
            {
                Logging.error("SPayments auth failed: " + ex.Message);
                return false;   // the setting is ON and auth errored → fail CLOSED
            }
        }

        private static IxiNumber parseAmount(string s)
        {
            try
            {
                return new IxiNumber(s);
            }
            catch (Exception)
            {
                return new IxiNumber(0);
            }
        }

        // nickname + the FULL address when the target is a contact; the bare address
        // otherwise. The address is ALWAYS shown — that is the confirm's whole point.
        private static string recipientDisplay(string addr)
        {
            try
            {
                Friend? f = FriendList.getFriend(new Address(addr));
                if (f != null && !String.IsNullOrEmpty(f.nickname) && f.nickname != addr)
                {
                    return f.nickname + "\n" + addr;
                }
            }
            catch (Exception) { }
            return addr;
        }
    }
}
