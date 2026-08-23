using IXICore;
using IXICore.Activity;
using IXICore.Meta;
using IXICore.Streaming;
using IXICore.Utils;
using System.Linq;

namespace SPIXI.Meta
{
    internal class SpixiTransactionInclusionCallbacks : TransactionInclusionCallbacks
    {
        public void transactionVerified(Transaction tx)
        {
            var bh = IxianHandler.getBlockHeader(tx.applied);
            Node.activityStorage.updateStatus(tx.id, ActivityStatus.Final, tx.applied, bh.timestamp);

            requestBalanceUpdate(tx);

            refreshTransactionPages(tx, true);

            /* ★ SND-2 IS REMOVED — a DESIGN REVERSAL by Damir (2026-08-23), not a bug fix.
             *
             * Precision on what is reversed (#46 r1 D NIT-2): #506 did not RULE that
             * money chimes on settlement — it dismissed the F5 item as the checklist's
             * error and left "confirm on send instead?" an open product call. What is
             * reversed is the 2026-08-21 SND-2 design itself, and this ANSWERS #506's
             * open call: neither. The device
             * disproved the design: this callback fires for EVERY verified transaction,
             * with no edge guard, and a restored account walks the whole chain and
             * discovers every historical transaction for the first time. Damir's Android
             * log shows 60,000 blocks walked in 17.5 minutes — each old transaction a
             * fresh chime. The scan itself is expected behaviour ("once it's done it's
             * ok" — Damir); the sound on it is the defect.
             *
             * BOTH sounds went, sent and received, because they were the same defect:
             * transactionSent() also fired on VERIFICATION, not on the user's send —
             * that is the "serious delay" #506 recorded on Windows. It was never a
             * delay; it was the chime waiting for settlement.
             *
             * An edge guard ("chime once per txid") was considered and REJECTED in
             * favour of removal: removal cannot regress, and it cannot come back on a
             * fresh install. The funds-type exclusions in Node.cs stay — funds events
             * play no in-app effect (the backgrounded notification lane is separate
             * and unchanged). Do NOT re-add a chime here without a new DECISIONS row
             * reversing this one. */
        }

        private void requestBalanceUpdate(Transaction tx)
        {
            if (IxianHandler.isMyAddress(tx.pubKey))
            {
                foreach (var fromEntry in tx.fromList)
                {
                    IxianHandler.balances.TryGet(new Address(tx.pubKey.getInputBytes(), fromEntry.Key))?.lastUpdate = 0;
                }
            }
            else
            {
                foreach (var toEntry in tx.toList)
                {
                    if (IxianHandler.isMyAddress(toEntry.Key))
                    {
                        IxianHandler.balances.TryGet(toEntry.Key)?.lastUpdate = 0;
                    }
                }
            }
        }

        private void refreshTransactionPages(Transaction tx, bool verified)
        {
            UIHelpers.shouldRefreshTransactions = true;
            Friend friend = FriendList.getFriend(tx.pubKey);
            bool myTransaction = IxianHandler.isMyAddress(tx.pubKey);
            if (friend == null)
            {
                foreach (var toEntry in tx.toList)
                {
                    friend = FriendList.getFriend(toEntry.Key);
                    if (friend != null)
                    {
                        break;
                    }
                }
            }

            if (friend != null)
            {
                SingleChatPage chatPage = Utils.getChatPage(friend);
                if (chatPage != null)
                {
                    chatPage.updateTransactionStatus(Transaction.getTxIdString(tx.id), verified);
                }

                IxiNumber amount = tx.toList.First().Value.amount;
                MiniAppPage page = Node.MiniAppManager.getAppPage(friend.walletAddress);
                if (page == null)
                {
                    return;
                }

                if (myTransaction)
                {
                    page.paymentSent(friend.walletAddress, amount, tx.getTxIdString(), tx.getBytes(true, true), verified);
                }
                else
                {
                    page.transactionReceived(friend.walletAddress, amount, tx.getTxIdString(), tx.getBytes(true, true), verified);
                }
            }
        }

        public void transactionRejected(Transaction tx)
        {
            tx.applied = 0;
            Node.activityStorage.updateStatus(tx.id, ActivityStatus.Rejected, 0);
            refreshTransactionPages(tx, false);
        }

        public void transactionExpired(Transaction tx)
        {
            tx.applied = 0;
            Node.activityStorage.updateStatus(tx.id, ActivityStatus.Expired, 0);
            refreshTransactionPages(tx, false);
        }

        public void transactionCannotVerify(Transaction tx)
        {
            tx.applied = 0;
            Node.activityStorage.updateStatus(tx.id, ActivityStatus.Unknown, 0);
            refreshTransactionPages(tx, false);
        }

        public void receivedBlockHeader(Block blockHeader, bool verified)
        {
            foreach (Balance balance in IxianHandler.balances.Values)
            {
                if (balance.blockChecksum != null && balance.blockChecksum.SequenceEqual(blockHeader.blockChecksum))
                {
                    balance.verified = true;
                }
            }

            /*if (blockHeader.blockNum + 10 >= IxianHandler.getHighestKnownNetworkBlockHeight()
                && (IxianHandler.status == NodeStatus.warmUp || IxianHandler.status == NodeStatus.stalled))
            {*/
                IxianHandler.status = NodeStatus.ready;
            //}
        }

        public void blockReorg(Block blockHeader)
        {
            var revertedTransactions = Node.activityStorage.revertTransactionsByBlockHeight(blockHeader.blockNum);
            foreach (var revertedTxId in revertedTransactions)
            {
                var activity = Node.activityStorage.getActivityById(revertedTxId, null, true);
                PendingTransactions.addOutgoingTransaction(activity.transaction, activity.transaction.toList.TakeLast(2).Select(x => x.Key).ToList());
                refreshTransactionPages(activity.transaction, false);
            }
        }
    }
}
