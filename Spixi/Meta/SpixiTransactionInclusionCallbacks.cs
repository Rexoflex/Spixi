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

            /* ★ SND-2 (Damir's 2026-08-21 block): the transaction sound.
             *
             * Placed on VERIFIED only, and deliberately NOT inside refreshTransactionPages
             * — that helper is also called for rejected, expired, cannot-verify and block
             * reorg, and a "payment received" chime on a REJECTED transaction would be a
             * lie the user acts on.
             *
             * ⚠ MONEY PATH, so the boundary is worth stating: this reads `tx.pubKey` to
             * pick which of two sounds to play and does nothing else. It signs nothing,
             * broadcasts nothing, mutates no transaction, moves no balance, and cannot
             * throw into this callback (SSounds.play swallows everything). With no sound
             * assets shipped yet it is a no-op on every platform.
             *
             * Chat message sounds are suppressed for the funds message types in Node.cs,
             * so a payment makes ONE sound, here, at the moment it is actually confirmed. */
            try
            {
                if (IxianHandler.isMyAddress(tx.pubKey))
                {
                    SSounds.transactionSent();
                }
                else
                {
                    SSounds.transactionReceived();
                }
            }
            catch (System.Exception e)
            {
                Logging.trace("SND-2 transaction sound skipped: " + e.Message);
            }
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
