using IXICore;
using IXICore.Meta;
using IXICore.Network;
using IXICore.SpixiBot;
using IXICore.Streaming;
using Spixi;
using SPIXI.MiniApps;
using SPIXI.Lang;
using SPIXI.Meta;
using SPIXI.VoIP;
using System.Text;
using IXICore.Streaming.Models;
using System.IO;
using System;
using System.Collections.Generic;
using Microsoft.Maui.ApplicationModel;
using System.Threading;
using System.Threading.Tasks;   // F5-1 r2 (loop A-2): the deferred VoIP handling hops back off the UI thread
using System.Linq;

namespace SPIXI
{    
    class StreamProcessor : CoreStreamProcessor
    {
        public StreamProcessor(PendingMessageProcessor pendingMessageProcessor, StreamCapabilities streamCapabilities) : base(pendingMessageProcessor, streamCapabilities)
        {
        }

        // Called when receiving file headers from the message recipient
        public static void handleFileHeader(Address sender, SpixiMessage data, byte[] message_id, Address? group_sender_address)
        {
            Friend friend = FriendList.getFriend(sender);
            if (friend != null)
            {
                FileTransfer transfer = new FileTransfer(data.data);

                string message_data = string.Format("{0}:{1}:{2}", transfer.uid, transfer.fileName, transfer.fileSize);
                FriendMessage fm = Node.addMessageWithType(message_id, FriendMessageType.fileHeader, sender, data.channel, message_data, false, group_sender_address);
                if (fm != null)
                {
                    // TODO this can probably be removed now
                    fm.transferId = transfer.uid;
                    fm.filePath = transfer.fileName;
                    fm.fileSize = transfer.fileSize;
                    IxianHandler.localStorage.requestWriteMessages(friend.walletAddress, transfer.channel);
                }
            }
            else
            {
                Logging.error("Received File Header from an unknown friend.");
            }
        }

        // Called when accepting a file
        public static void handleAcceptFile(Address sender, SpixiMessage data)
        {
            Friend friend = FriendList.getFriend(sender);
            if (friend != null)
            {
                Logging.info("Received accept file");

                try
                {
                    using (MemoryStream m = new MemoryStream(data.data))
                    {
                        using (BinaryReader reader = new BinaryReader(m))
                        {
                            string uid = reader.ReadString();

                            TransferManager.receiveAcceptFile(friend, uid);
                        }
                    }
                }
                catch (Exception e)
                {
                    Logging.error("Exception occured while handling accept file from bytes: " + e);
                }
            }
            else
            {
                Logging.error("Received accept file from an unknown friend.");
            }
        }

        public static void handleRequestFileData(Address sender, SpixiMessage data)
        {
            Friend? friend = FriendList.getFriend(sender);
            if (friend != null)
            {
                Logging.trace("Received request file data");

                try
                {
                    using (MemoryStream m = new MemoryStream(data.data))
                    {
                        using (BinaryReader reader = new BinaryReader(m))
                        {
                            string uid = reader.ReadString();
                            ulong packet_number = reader.ReadUInt64();

                            TransferManager.sendFileData(friend, uid, packet_number);
                        }
                    }
                }
                catch (Exception e)
                {
                    Logging.error("Exception occured while handling request file data from bytes: " + e);
                }

            }
            else
            {
                Logging.error("Received request file data from an unknown friend.");
            }
        }

        public static void handleFileData(Address sender, SpixiMessage data)
        {
            Friend friend = FriendList.getFriend(sender);
            if (friend != null)
            {
                TransferManager.receiveFileData(data.data, sender);
            }
            else
            {
                Logging.error("Received file data from an unknown friend.");
            }
        }

        public static void handleFileFullyReceived(Address sender, SpixiMessage data)
        {
            var uid = Crypto.hashToString(data.data);
            var ft = TransferManager.getOutgoingTransfer(uid);
            if (ft != null && ft.groupAddress != null)
            {
                Friend? friend = FriendList.getFriend(ft.groupAddress);
                if (friend != null && friend.type == FriendType.Group)
                {
                    var chat_message = friend.getMessages(ft.channel)?.Find(x => x.transferId == uid);
                    if (chat_message != null)
                    {
                        friend.addReaction(sender, new ReactionMessage(chat_message.id, "fileReceived:"), ft.channel);
                        /* ★★ Damir on device: *"the downloaded only shown in long press after
                         * refresh, it's not live as for delivered read."* That contrast is the
                         * whole diagnosis — delivered and read arrive as `msgReceived`, which
                         * re-pushes its reactions since the last round; a DOWNLOAD arrives here,
                         * as `fileFullyReceived`, and this method wrote the reaction and told the
                         * UI nothing. Same push, same reason: the long-press detail is built from
                         * `addReactions` and only a full history load emitted it. */
                        UIHelpers.updateReactions(friend, ft.channel, chat_message.id);
                        UIHelpers.shouldRefreshContacts = true;
                        if (chat_message.completed)
                        {
                            TransferManager.completeFileTransfer(sender, uid);
                        }
                    }
                }

                return;
            }

            TransferManager.completeFileTransfer(sender, uid);
        }

        // Called when an encryption key is received from the S2 server, as per step 4 of the WhitePaper
        /*private static void sendRsaEncryptedMessage(StreamMessage msg, string key, RemoteEndpoint endpoint)
        {
        // TODO TODO use transaction code for S2
            using (MemoryStream m = new MemoryStream())
            {
                using (BinaryWriter writer = new BinaryWriter(m))
                {
                    writer.Write(msg.getID());
                    writer.Write(msg.recipientAddress);
                    writer.Write(msg.transactionID);
                }
            }
            Console.WriteLine("Sending encrypted message with key {0}", key);

                    using (MemoryStream m = new MemoryStream())
                    {
                        using (BinaryWriter writer = new BinaryWriter(m))
                        {
                            writer.Write(msg.getID());
                            writer.Write(msg.recipientAddress);
                            writer.Write(msg.transactionID);

                            byte[] encrypted_message = CryptoManager.lib.encryptDataS2(msg.data, key);
                            int encrypted_count = encrypted_message.Count();

                            writer.Write(encrypted_count);
                            writer.Write(encrypted_message);

                            byte[] ba = ProtocolMessage.prepareProtocolMessage(ProtocolMessageCode.s2data, m.ToArray());
                            socket.Send(ba, SocketFlags.None);


                            // Update the DLT transaction as well
                            Transaction transaction = new Transaction(0, msg.recipientAddress, IxianHandler.getWalletStorage().address);
                            transaction.id = msg.transactionID;
                            //transaction.data = Encoding.UTF8.GetString(checksum);
                            //ProtocolMessage.broadcastProtocolMessage(ProtocolMessageCode.updateTransaction, transaction.getBytes());

                        }
                    }
        }*/

        // Called when receiving S2 data from clients
        public override ReceiveDataResponse? receiveData(byte[] bytes, RemoteEndpoint endpoint, bool fireLocalNotification = true, bool alert = true)
        {
            ReceiveDataResponse? rdr = base.receiveData(bytes, endpoint);
            if (rdr == null)
            {
                return rdr;
            }

            StreamMessage message = rdr.streamMessage;
            SpixiMessage spixi_message = rdr.spixiMessage;
            Friend? friend = rdr.friend;
            Address sender_address = rdr.senderAddress;
            Address? group_sender_address = rdr.groupSenderAddress;

            if (friend != null)
            {
                if (endpoint != null)
                {
                    // Update friend's last seen and relay if offline
                    if (!friend.online)
                    {
                        friend.updatedStreamingNodes = Clock.getNetworkTimestamp();
                        friend.relayNode = new Peer(endpoint.getFullAddress(true), endpoint.serverWalletAddress, Clock.getTimestamp(), Clock.getTimestamp(), Clock.getTimestamp(), 0);
                        friend.online = true;
                    }
                }
            }

            /* ═══ ★★★ THE CHANNEL, AND IT IS NO LONGER A LITERAL ZERO ════════════════
             *
             * This was `int channel = 0;` and NOTHING reassigned it. FIVE things below
             * then acted on that zero: the delivery receipt we send back (three call
             * sites), the remote delete, the reaction push, the receipt lookup, and the
             * bot action. Each one carries its own note. A bot room stores its messages
             * under `botInfo.defaultChannel` (SingleChatPage), so in any room on a channel
             * other than 0 every one of them named the wrong channel.
             *
             * ★ ROUND 2 (review-cs MINOR-1): the fifth reader is
             * `onBotAction(spixi_message.data, friend, channel)` at the botAction case
             * below. The old header named four and analysed four. `onBotAction` declares
             * `int channel_id` and does not read it, so it is INERT today — but the
             * guarantee is what the next reader will trust, so it names five.
             *
             * `SpixiMessage.channel` is the channel the SENDER used. It is the correct
             * start value for all of them. A message that carries no channel still reads
             * 0, which is exactly the old behaviour, so a peer on an older build loses
             * nothing.
             *
             * ⚠ The msgReceived note below said the lookup "used the RECEIPT's channel".
             * It did not, until this line. Read that note with this one.
             *
             * ★ ROUND 2 (review-cs MINOR-6) — THE NULL PAYLOAD IS TESTED ONCE, AND THE
             * MESSAGE RETURNS. The declaration used to carry its own null test inside a
             * ternary, defended as keeping the assignment outside the try safe. That half
             * was true, and it bought nothing: `switch (spixi_message.type)` on the next
             * line dereferenced the same reference unconditionally, so a null payload
             * still threw — one line later, inside the try, where the outer catch
             * swallowed it as an unnamed exception. The guard bought a caught exception
             * instead of an uncaught one; it did not make a null payload survivable.
             * A null SpixiMessage has nothing for the switch to act on, and the switch is
             * the whole remaining body, so the honest answer is one named warning and the
             * same return value the catch produced.
             * ⚠ PIN OWNER: `smoke-test.mjs:18833` anchors this block on the OLD ternary
             * text and goes RED here. Re-anchor it on the plain declaration below — and
             * do not quote that statement in prose anywhere, or the anchor matches a
             * comment again. */
            if (spixi_message == null)
            {
                Logging.warn("receiveData: the SpixiMessage payload is null. The message is ignored.");
                return rdr;
            }
            int channel = spixi_message.channel;
            try
            {
                switch (spixi_message.type)
                {
                    case SpixiMessageCode.requestFundsResponse:
                        {
                            var chat_page = Utils.getChatPage(friend);
                            if (chat_page != null)
                            {
                                /* ★ F3 GUARD 1 of 3. A garbage packet leaves `data` null and
                                 * `Encoding.UTF8.GetString(null)` throws ArgumentNullException on
                                 * the NETWORK thread. That is the exception in Damir's crash log. */
                                string msg_id_tx_id = safeString(spixi_message.data);
                                if (msg_id_tx_id.Length == 0)
                                {
                                    Logging.warn("requestFundsResponse: empty payload, ignored.");
                                    break;
                                }
                                string[] msg_id_tx_id_split = msg_id_tx_id.Split(':');
                                byte[] msg_id;
                                string? tx_id = null;
                                if (msg_id_tx_id_split.Length == 2)
                                {
                                    msg_id = Crypto.stringToHash(msg_id_tx_id_split[0]);
                                    tx_id = msg_id_tx_id_split[1];
                                }
                                else
                                {
                                    msg_id = Crypto.stringToHash(msg_id_tx_id);
                                }

                                /* ★ F3 GUARD 2 of 3. `msg` is DECLARED nullable and was then
                                 * dereferenced twice. `getMessages` can also return null. A peer
                                 * that answers a request we no longer hold took the whole
                                 * receiveData switch down on the network thread.
                                 * ⚠ The status push below needs no message. It runs either way,
                                 * so a missing local copy costs the UI update of nothing. */
                                FriendMessage? msg = friend.getMessages(0)?.Find(x => x.id != null && x.id.SequenceEqual(msg_id));

                                string status = SpixiLocalization._SL("chat-payment-status-pending");
                                if (tx_id != null)
                                {
                                    if (msg != null)
                                    {
                                        msg.message = ":" + tx_id;
                                    }
                                }
                                else
                                {
                                    tx_id = "";
                                    status = SpixiLocalization._SL("chat-payment-status-declined");
                                    if (msg != null)
                                    {
                                        msg.message = "::" + msg.message; // declined
                                    }
                                }
                                if (msg == null)
                                {
                                    Logging.warn("requestFundsResponse: no local message for this id.");
                                }

                                byte[]? b_tx_id = !string.IsNullOrEmpty(tx_id) ? Transaction.txIdLegacyToV8(tx_id) : null;
                                chat_page.updateRequestFundsStatus(msg_id, b_tx_id, status);
                            }
                        }
                        break;

                    case SpixiMessageCode.fileHeader:
                        {
                            handleFileHeader(sender_address, spixi_message, message.id, group_sender_address);
                        }
                        break;

                    case SpixiMessageCode.acceptFile:
                        {
                            handleAcceptFile(sender_address, spixi_message);
                        }
                        break;

                    case SpixiMessageCode.requestFileData:
                        {
                            handleRequestFileData(sender_address, spixi_message);
                        }
                        break;

                    case SpixiMessageCode.fileData:
                        {
                            handleFileData(sender_address, spixi_message);
                        }
                        break;

                    case SpixiMessageCode.fileFullyReceived:
                        {
                            handleFileFullyReceived(sender_address, spixi_message);
                        }
                        break;

                    case SpixiMessageCode.appData:
                        {
                            // app data received, find the session id of the app and forward the data to it
                            handleAppData(sender_address, spixi_message.data, group_sender_address);
                        }
                        break;

                    case SpixiMessageCode.appRequest:
                        {
                            // app request received
                            // #574 ①: the SEND time rides along — see handleAppRequest.
                            handleAppRequest(message.id, sender_address, message.recipient, spixi_message.data, message.timestamp);
                        }
                        break;

                    case SpixiMessageCode.appRequestAccept:
                        {
                            handleAppRequestAccept(sender_address, spixi_message.data, group_sender_address);
                        }
                        break;

                    case SpixiMessageCode.appRequestReject:
                        {
                            handleAppRequestReject(sender_address, spixi_message.data, group_sender_address);
                        }
                        break;

                    case SpixiMessageCode.appEndSession:
                        {
                            handleAppEndSession(sender_address, spixi_message.data, group_sender_address);
                        }
                        break;

                    case SpixiMessageCode.requestAdd:
                    case SpixiMessageCode.requestAdd2:
                        {
                            if (friend.approved)
                            {
                                Node.addMessageWithType(new byte[] { 1 }, FriendMessageType.standard, friend.walletAddress, 0, string.Format(SpixiLocalization._SL("global-friend-request-connected"), friend.nickname));
                            }
                            else
                            {
                                Node.addMessageWithType(message.id, FriendMessageType.requestAdd, sender_address, 0, "");
                            }

                            UIHelpers.shouldRefreshContacts = true;

                            CoreProtocolMessage.resubscribeEvents();
                            CoreStreamProcessor.fetchFriendsPresence(friend, true);
                        }
                        break;

                    case SpixiMessageCode.acceptAdd:
                    case SpixiMessageCode.acceptAdd2:
                        {
                            Node.addMessageWithType(new byte[] { 1 }, FriendMessageType.standard, friend.walletAddress, 0, string.Format(SpixiLocalization._SL("global-friend-request-connected"), friend.nickname));
                            CoreProtocolMessage.resubscribeEvents();
                            CoreStreamProcessor.fetchFriendsPresence(friend, true);
                        }
                        break;

                    case SpixiMessageCode.keys2:
                        {
                            CoreStreamProcessor.fetchFriendsPresence(friend, true);
                        }
                        break;

                    case SpixiMessageCode.acceptAddBot:
                        {
                            Node.addMessageWithType(new byte[] { 1 }, FriendMessageType.standard, friend.walletAddress, 0, string.Format(SpixiLocalization._SL("global-friend-request-connected"), friend.nickname));
                            var chat_page = Utils.getChatPage(friend);
                            if (chat_page != null)
                            {
                                MainThread.BeginInvokeOnMainThread(() =>
                                {
                                    chat_page.convertToBot();
                                });
                            }
                        }
                        break;

                    case SpixiMessageCode.botAction:
                        onBotAction(spixi_message.data, friend, channel);
                        break;

                    case SpixiMessageCode.msgTyping:
                        handleFriendIsTyping(friend);
                        break;

                    case SpixiMessageCode.avatar:
                        if (spixi_message.data != null && spixi_message.data.Length < 500000)
                        {
                            byte[] resized_avatar = SFilePicker.ResizeImage(spixi_message.data, 128, 128, 100);
                            FriendList.setAvatar(sender_address, spixi_message.data, resized_avatar, group_sender_address);
                            UIHelpers.shouldRefreshContacts = true;
                        }
                        else
                        {
                            //FriendList.setAvatar(sender_address, null, null, group_sender_address);
                        }
                        break;

                    case SpixiMessageCode.requestFunds:
                        // ★ F3 GUARD 3 of 3 — same null payload, same exception.
                        Node.addMessageWithType(message.id, FriendMessageType.requestFunds, sender_address, 0, safeString(spixi_message.data));
                        break;

                    case SpixiMessageCode.sentFunds:
                        CoreProtocolMessage.broadcastGetTransaction(spixi_message.data, 0, endpoint);
                        Node.addMessageWithType(message.id, FriendMessageType.sentFunds, sender_address, 0, Transaction.getTxIdString(spixi_message.data));
                        break;

                    case SpixiMessageCode.chat:
                        // F3: a garbage packet leaves `data` null, and GetString(null) throws
                        // ArgumentNullException on the network thread. Read it as empty instead.
                        Node.addMessageWithType(message.id, FriendMessageType.standard, sender_address, spixi_message.channel, safeString(spixi_message.data), false, group_sender_address, message.timestamp, fireLocalNotification, alert, 0);
                        if (friend != null && !friend.bot)
                        {
                            /* ★ THE DELIVERY RECEIPT WE SEND BACK, call 1 of 3. The sender looks its own
                             * copy up by id AND channel, so a receipt that names channel 0 for a
                             * message stored on channel N finds nothing there. We store the
                             * message under `spixi_message.channel` on the line above, so the
                             * receipt must carry the same number. */
                            sendReceivedConfirmation(friend, message.id, spixi_message.channel);
                        }
                        break;

                    case SpixiMessageCode.chatStream:
                        {
                            var csm = new ChatStreamMessage(spixi_message.data);
                            var fm = Node.addMessageWithType(FriendMessageType.standard, sender_address, spixi_message.channel, csm, false, group_sender_address, message.timestamp, fireLocalNotification, alert, 0);
                            if (friend != null && !friend.bot)
                            {
                                if (fm == null)
                                {
                                    fm = friend.getMessage(spixi_message.channel, csm.MessageId);
                                    if (fm != null)
                                    {
                                        if (fm.sequence >= csm.Sequence)
                                        {
                                            // already have this message or a newer one, ignore
                                            // ★ THE DELIVERY RECEIPT, call 2 of 3 — same rule as the chat case.
                                            sendReceivedConfirmation(friend, message.id, spixi_message.channel);
                                            return null;
                                        }
                                        else
                                        {
                                            // message is newer than what we have, with a sequence gap, wait for missing messages
                                            return null;
                                        }
                                    }
                                }
                                // ★ THE DELIVERY RECEIPT, call 3 of 3 — same rule as the chat case.
                                sendReceivedConfirmation(friend, message.id, spixi_message.channel);
                            }
                        }
                        break;

                    case SpixiMessageCode.msgReceived:
                    case SpixiMessageCode.msgRead:
                        {
                            /* ═══ ★★★ ISSUE 1 (Damir on device) ══════════════════════════
                             * *"it shows 0 of XY delivered until I refresh the chat"*, and in
                             * a bot room *"it's always clock, when I refresh it updates."*
                             * Two faces of one gap in these six lines.
                             *
                             * ① THE CHANNEL. The lookup NOW uses the RECEIPT's channel; it
                             *    used a hardcoded 0. A bot room stores its messages under
                             *    `botInfo.defaultChannel` (SingleChatPage:786), so when the
                             *    receipt carries a different one `getMessage` returned null
                             *    and NOTHING was pushed — the clock simply stayed. Fall back
                             *    to a channel-wide resolve before giving up.
                             * ② THE COUNTS. Only `updateMessage` was pushed, which carries
                             *    the flags and nothing else. The delivery detail is built
                             *    from `addReactions`, which is emitted on a full history
                             *    load and nowhere else — so the counts were stale until the
                             *    chat was reopened. A receipt IS a reaction in a group; it
                             *    has to re-push them. */
                            int ch = channel;
                            var fm = friend.getMessage(ch, spixi_message.data);
                            if (fm == null)
                            {
                                ch = resolveMessageChannel(friend, spixi_message.data, channel);
                                if (ch != channel)
                                {
                                    fm = friend.getMessage(ch, spixi_message.data);
                                }
                            }
                            if (fm != null)
                            {
                                UIHelpers.updateMessage(friend, ch, fm);
                                // ② the counts behind the long-press detail
                                UIHelpers.updateReactions(friend, ch, fm.id);
                            }
                            UIHelpers.shouldRefreshContacts = true;
                        }
                        break;

                    case SpixiMessageCode.msgDelete:
                        {
                            /* ★ THE REMOTE DELETE. SingleChatPage.deleteMessage
                             * drops the push when `channel != selectedChannel`, so a literal 0
                             * left a deleted message on screen in every room on another
                             * channel. Start from the wire channel, then resolve by id.
                             * ⚠ Core handles the delete in `base.receiveData` above, so the
                             * message can already be gone from the store. The resolver then
                             * finds nothing and returns the wire channel, which is the best
                             * answer available. It is still correct when Core keeps the row. */
                            int delete_channel = resolveMessageChannel(friend, spixi_message.data, channel);
                            UIHelpers.deleteMessage(friend, delete_channel, spixi_message.data);
                            UIHelpers.shouldRefreshContacts = true;
                        }
                        break;

                    case SpixiMessageCode.msgReaction:
                        var reaction = new ReactionMessage(spixi_message.data);
                        // If a chat page is not visible set unread indicator
                        if (!UIHelpers.isChatScreenDisplayed(friend))
                        {
                            friend.metaData.unreadMessageCount++;
                            friend.saveMetaData();
                        }
                        /* ★ THE REACTION PUSH — every emoji, like and tip. SingleChatPage.updateReactions
                         * gates on the same `channel == selectedChannel` test, so a literal 0
                         * dropped every live reaction in a room on another channel. The target
                         * message is still in the store here, so the resolver finds its real
                         * channel. */
                        UIHelpers.updateReactions(friend, resolveMessageChannel(friend, reaction.msgId, channel), reaction.msgId);
                        // CH8: reaction excerpt for the chats list (a reaction never becomes lastMessage)
                        UIHelpers.updateChatReaction(friend, group_sender_address != null ? group_sender_address : sender_address, reaction.reaction);
                        UIHelpers.shouldRefreshContacts = true;
                        break;

                    case SpixiMessageCode.leaveConfirmed:
                        UIHelpers.shouldRefreshContacts = true;
                        break;

                    case SpixiMessageCode.nick:
                        if (friend.bot && group_sender_address != null)
                        {
                            // update UI with the new nick
                            Logging.info("Updating group chat nicks");
                            var nick = friend.users.getUser(group_sender_address).getNick();
                            UIHelpers.updateGroupChatNicks(friend, group_sender_address, nick);
                        }else
                        {
                            UIHelpers.shouldRefreshContacts = true;
                        }
                        break;

                    case SpixiMessageCode.appProtocols:
                        handleAppProtocols(sender_address, new AppProtocolsMessage(spixi_message.data));
                        break;

                    case SpixiMessageCode.appProtocolData:
                        // app data received, find the protocol id of the app and forward the data to it
                        handleAppProtocolData(sender_address, spixi_message.data, group_sender_address);
                        break;

                    case SpixiMessageCode.transactionRequest:
                        {
                            var tr = new TransactionRequest(spixi_message.data);
                            var msgId = tr.RequestId;
                            if (tr.RequestId == null)
                            {
                                msgId = message.id;
                            }
                            Node.addMessageWithType(msgId, FriendMessageType.requestFunds, sender_address, 0, tr.Amount.ToString());
                            break;
                        }

                    case SpixiMessageCode.transactionSend:
                        {
                            var ts = new TransactionSend(spixi_message.data);
                            var msgId = ts.RequestId;
                            if (ts.RequestId == null)
                            {
                                msgId = message.id;
                            }
                            Node.addMessageWithType(msgId, FriendMessageType.sentFunds, sender_address, 0, ts.Transaction.getTxIdString());
                            UIHelpers.shouldRefreshTransactions = true;
                            break;
                        }

                    case SpixiMessageCode.createGroup:
                        {
                            UIHelpers.shouldRefreshContacts = true;
                            break;
                        }

                    case SpixiMessageCode.leave:
                        UIHelpers.shouldRefreshContacts = true;
                        break;
                }
            }catch(Exception e)
            {
                Logging.error("Exception occured in StreamProcessor.receiveData: " + e);
            }
            return rdr;
        }

        protected void handleFriendIsTyping(Friend friend)
        {
            friend.isTyping = true;
            UIHelpers.shouldRefreshContacts = true;

            Timer? timer = null;
            timer = new(_ =>
            {
                friend.isTyping = false;
                UIHelpers.shouldRefreshContacts = true;
                _typingTimers.Remove(_typingTimers.FirstOrDefault());
            }, timer, 5000, Timeout.Infinite);

            _typingTimers.Add(timer);
            Utils.getChatPage(friend)?.showTyping();
        }

        private static void handleAppProtocols(Address sender_address, AppProtocolsMessage data)
        {
            Friend? friend = FriendList.getFriend(sender_address);
            if (friend == null)
            {
                Logging.error("Received app protocols from an unknown contact.");
                return;
            }

            friend.supportedProtocols = data.protocolIds;
            friend.save();
        }

        private static void handleAppData(Address sender_address, byte[] app_data_raw, Address? group_sender_address)
        {
            if (group_sender_address == null)
            {
                group_sender_address = sender_address;
            }
            // TODO use channels and drop AppDataMessage
            AppDataMessage app_data = new AppDataMessage(app_data_raw);
            if (VoIPManager.hasSession(app_data.sessionId))
            {
                VoIPManager.onData(app_data.sessionId, app_data.data);
                return;
            }
            MiniAppPage? app_page = Node.MiniAppManager.getAppPage(group_sender_address, app_data.sessionId);
            if(app_page == null)
            {
                Logging.error("App with session id: {0} does not exist.", Crypto.hashToString(app_data.sessionId));
                return;
            }
            app_page.networkDataReceived(group_sender_address, app_data.data);
        }


        private static void handleAppProtocolData(Address sender_address, byte[] app_data_raw, Address? group_sender_address)
        {
            if (group_sender_address == null)
            {
                group_sender_address = sender_address;
            }
            // TODO use channels and drop AppDataMessage
            AppDataMessage app_data = new AppDataMessage(app_data_raw);
            MiniAppPage? app_page = Node.MiniAppManager.getAppPageByProtocol(group_sender_address, app_data.sessionId);
            if (app_page == null)
            {
                Logging.error("App with protocol id: {0} does not exist.", Crypto.hashToString(app_data.sessionId));
                return;
            }
            string protocol_name = Node.MiniAppManager.getApp(app_page.appId).getProtocolName(app_data.sessionId);
            app_page.networkProtocolDataReceived(group_sender_address, protocol_name, app_data.data);
        }

        private static byte[] sendAppRequest(Friend friend, string app_id, byte[] session_id, byte[] data)
        {
            string app_install_url = Node.MiniAppManager.getAppInstallURL(app_id);
            string app_name = Node.MiniAppManager.getAppName(app_id);
            string app_info = Node.MiniAppManager.getAppInfo(app_id);
            return sendAppRequest(friend, app_id, session_id, data, app_info);
        }

        /* ★★ #574 ① — THE PHANTOM CALL OVERLAY.
         *
         * Damir: tap a MISSED-call notification after a cold boot, and the chat opens
         * with a LIVE call overlay. He "answered" a call the caller had abandoned, and
         * his side ran a one-sided 10-second call.
         *
         * ★ THE MECHANISM, read out of the source:
         *   · This handler took the message ID and never its TIMESTAMP.
         *   · `VoIPManager.onReceivedCall` then arms the #265 ring budget from
         *     `Clock.getTimestamp()` — the moment the request is HANDLED, not the
         *     moment it was SENT. So the 45 seconds start again for a request that has
         *     been sitting in the offline queue.
         *   · A cold boot drains that queue. The stale appRequest is handled exactly
         *     like a fresh one: a live session is created and the call surface is
         *     presented for a call that ended minutes ago. Accepting it opens a session
         *     nobody is on.
         *   · `friend.hasMessage(0, sessionId)` is NOT an age gate. It only suppresses a
         *     duplicate of a request whose voiceCall record is already stored — and that
         *     record is exactly what a process killed during the ring can be missing.
         *
         * ⚠ FAIL OPEN. `timestamp` is 0 when a peer does not set it, and a real call
         * must never be suppressed because a field was absent. Only a request that
         * CARRIES a send time and is provably older than the caller's own ring budget
         * is treated as already over. */
        private static void handleAppRequest(byte[] messageId, Address sender_address, Address recipient_address, byte[] app_data_raw, long sentTimestamp = 0)
        {
            MiniAppManager am = Node.MiniAppManager;

            Friend? friend = FriendList.getFriend(sender_address);
            if (friend == null)
            {
                Logging.error("Received app request from an unknown contact.");
                return;
            }

            if (!IxianHandler.getWalletStorage().isMyAddress(recipient_address))
            {
                return;
            }

            // TODO use channels and drop AppDataMessage
            AppDataMessage app_data = new AppDataMessage(app_data_raw);
            
            if(app_data.sessionId == null)
            {
                Logging.error("App session id is null.");
                return;
            }

            MiniAppPage app_page = am.getAppPage(sender_address, app_data.sessionId);
            if (app_page != null)
            {
                Logging.error("App with session id: {0} already exists.", Crypto.hashToString(app_data.sessionId));
                return;
            }

            if (string.IsNullOrEmpty(app_data.appId))
            {
                Logging.error("App with session id: {0} has no provided app id.", Crypto.hashToString(app_data.sessionId));
                return;
            }

            string[] appid_data = app_data.appId.Split("||");
            string app_id = appid_data[0];
            string? app_install_url = appid_data.Length > 1 ? appid_data[1] : null;


            app_page = am.getAppPage(sender_address, app_id);
            if (app_page != null)
            {
                // TODO, maybe kill the old session and restart instead
                Logging.warn("App with sender: {0} already exists, updating session id.", sender_address.ToString());
                app_page.sessionId = app_data.sessionId;
                return;
            }
            
            Address[] user_addresses = new Address[] { sender_address };
            MainThread.BeginInvokeOnMainThread(() =>
            {
                MiniApp app = am.getApp(app_id);
                if (app == null)
                {
                    if (app_id == "spixi.voip")
                    {
                        if (!friend.hasMessage(0, app_data.sessionId))
                        {
                            long age = sentTimestamp > 0 ? Clock.getNetworkTimestamp() - sentTimestamp : 0;
                            /* ★ review MAJOR-2: the gate carries a MARGIN. The two clocks
                             * being compared are not guaranteed to agree — the sender stamps
                             * network time and `Clock.networkTimeDifference` is 0 until a
                             * time-synced client connects, which on a cold boot is exactly
                             * when this runs. A receiver whose clock is fast would otherwise
                             * refuse a call that is ringing right now. */
                            if (age > VoIPManager.RING_TIMEOUT_SECONDS + VoIPManager.STALE_CALL_MARGIN_SECONDS)
                            {
                                /* #574 ①: the caller stopped ringing before this arrived.
                                 * Do NOT ring and do NOT create a session — record it as
                                 * the missed call it already is, so the chat and the list
                                 * tell the truth and nothing offers to answer it.
                                 * The pair (voiceCall then voiceCallEnd with an EMPTY body)
                                 * is the shape both surfaces already read as "Missed call".
                                 * No reject is sent: the caller's own timeout has fired, and
                                 * a reject after that would only race their next call. */
                                Logging.info("#574: a voip request arrived {0}s after it was sent (gate {1}s) — recording a missed call instead of ringing.", age, VoIPManager.RING_TIMEOUT_SECONDS + VoIPManager.STALE_CALL_MARGIN_SECONDS);
                                // ⚠ fire_local_notification AND alert are both FALSE: the
                                // caller's own missed-call push already told the user, and a
                                // second "Incoming call" buzz for a call that is over is the
                                // phantom wearing a different coat.
                                var stale = Node.addMessageWithType(app_data.sessionId, FriendMessageType.voiceCall, sender_address, 0, "", false, null, sentTimestamp, false, false);
                                if (stale != null)
                                {
                                    stale.type = FriendMessageType.voiceCallEnd;
                                    /* review MAJOR-1's lesson, applied here too: the chats
                                     * row reads a DEEP COPY of the last message
                                     * (Ixian-Core Friend.cs setLastMessage), so the re-type
                                     * has to be pushed into metaData or the row shows
                                     * "Voice call" for a call that was missed. */
                                    var staleMeta = friend.metaData;
                                    if (staleMeta.lastMessage != null && stale.id != null
                                        && staleMeta.lastMessage.id != null && staleMeta.lastMessage.id.SequenceEqual(stale.id))
                                    {
                                        staleMeta.setLastMessage(stale, 0);
                                        friend.saveMetaData();
                                    }
                                    IxianHandler.localStorage.requestWriteMessages(friend.walletAddress, 0);
                                }
                                /* ★ review MINOR-6: TELL THE USER. The missed-call row this
                                 * would normally rely on is posted by endVoIPSession — which
                                 * by construction never ran, because nothing rang. A call
                                 * that arrived entirely while the app was down would leave
                                 * no notification at all, and a wrongly-gated live call
                                 * would vanish in silence. Post it directly instead, with
                                 * the missed-call copy and no alert. */
                                try
                                {
                                    /* ★ round-2 MAJOR-3: THROUGH THE GATE. showLocalNotification is the
                                     * raw poster and applies no policy — every other notify site asks
                                     * SNotificationPrefs.shouldNotify first, which folds in the global
                                     * master switch and the per-contact mute. Posting straight would put
                                     * a row up for a chat the user muted, on the one path where the
                                     * gated push above was deliberately suppressed.
                                     * ★ round-2 MINOR-5: and never over a LIVE call. This id is the one
                                     * the ringing "Incoming call" row uses, so a stale request draining
                                     * beside a real call from the same contact would replace it. */
                                    if (SPIXI.Meta.SNotificationPrefs.shouldNotify(friend)
                                        && !VoIPManager.isInitiated())
                                    {
                                        SPushService.showLocalNotification(
                                            SPIXI.Meta.SNotificationPrefs.notificationIdFor(friend.walletAddress, true),
                                            "Spixi",
                                            SpixiLocalization._SL("notification-missed-call") ?? "Missed call",
                                            friend.walletAddress.ToString(),
                                            false,      // silent: nothing rang, so nothing needs correcting
                                            FriendList.getUnreadMessageCount(),
                                            "call");
                                    }
                                }
                                catch (Exception nex)
                                {
                                    Logging.warn("#574: could not post the missed-call row: " + nex.Message);
                                }
                                UIHelpers.refreshAppRequests = true;
                                return;
                            }
                            /* ★★ round-2 MAJOR-4: BELOW the gate the budget is still SHORTENED.
                             * A hard gate at 165 s left every age under it ringing for a fresh
                             * 45 s — including the 90-second-old request in the reported repro.
                             * `burned` is the age we can attribute to real delay rather than to
                             * clock skew, so onReceivedCall backdates the budget by it: with a
                             * skewed clock burned is 0 and the behaviour is exactly as before,
                             * and a genuinely late request rings only for what the caller has
                             * left and then falls into the missed-call shape by itself. */
                            long burned = age > VoIPManager.STALE_CALL_MARGIN_SECONDS
                                ? age - VoIPManager.STALE_CALL_MARGIN_SECONDS
                                : 0;
                            if (VoIPManager.onReceivedCall(friend, app_data.sessionId, app_data.data, burned))
                            {
                                Node.addMessageWithType(app_data.sessionId, FriendMessageType.voiceCall, sender_address, 0, "");
                            }
                            UIHelpers.refreshAppRequests = true;
                        }
                        return;
                    }else
                    {
                        // app doesn't exist
                        Logging.error("App with id {0} is not installed.", app_id);
                    }
                }
                Node.addMessageWithType(messageId, FriendMessageType.appSession, sender_address, 0, app_data.appId);

            });
        }

        private static void handleAppRequestAccept(Address sender_address, byte[] app_data_raw, Address? group_sender_address)
        {
            if (group_sender_address == null)
            {
                group_sender_address = sender_address;
            }
            // TODO use channels and drop AppDataMessage
            AppDataMessage app_data = new AppDataMessage(app_data_raw);

            if (VoIPManager.hasSession(app_data.sessionId))
            {
                VoIPManager.onAcceptedCall(app_data.sessionId, app_data.data);
                UIHelpers.refreshAppRequests = true;
                return;
            }

            /* ★ F5-1 (#554, r2 shape per loop A-2) — the session-check RACE, accept leg.
             * handleAppRequest creates the VoIP session on a DEFERRED main-thread block
             * (the spixi.voip branch above), but this check ran on the stream thread. A
             * fetched batch delivers the call and its follow-up back-to-back, so this
             * check could run BEFORE the session existed and the event was lost. The main
             * thread runs queued blocks in order, so a re-check queued here runs AFTER
             * the pending session creation. The live-call path above is unchanged.
             * ⚠ r2 (A-2): the deferral carries ONLY the VoIP re-check. The main-thread
             * hop exists to ORDER the check behind the pending creation; the handling
             * itself hops back off the UI thread (the VoIP handlers all re-guard on
             * hasSession internally). The MINI-APP fall-through below stays on the
             * CALLING thread — its page handlers self-dispatch, and a second queue hop
             * could deliver onNetworkData before onRequestAccept. In the rare racing
             * case the fall-through logs one stale "App session does not exist." line
             * before the deferred block resolves the call — pre-existing shape. */
            MainThread.BeginInvokeOnMainThread(() =>
            {
                if (!VoIPManager.hasSession(app_data.sessionId))
                {
                    return;   // no racing creation — the synchronous app path already ran
                }
                Logging.info("[NOTIFDIAG] app accept re-check found the VoIP session on the main thread (F5-1 race)");
                Task.Run(() =>
                {
                    // r3 (verdict R-4): receiveData's catch-all no longer covers this hop — fence it
                    try
                    {
                        VoIPManager.onAcceptedCall(app_data.sessionId, app_data.data);
                        UIHelpers.refreshAppRequests = true;
                    }
                    catch (Exception ex)
                    {
                        Logging.error("Deferred VoIP accept failed: " + ex);
                    }
                });
            });

            MiniAppPage? page = Node.MiniAppManager.getAppPage(group_sender_address, app_data.sessionId);
            if (page == null)
            {
                Logging.info("App session does not exist.");
                return;
            }

            page.accepted = true;

            page.appRequestAcceptReceived(group_sender_address, app_data.data);

            UIHelpers.refreshAppRequests = true;
        }

        public static void handleAppRequestReject(Address sender_address, byte[] app_data_raw, Address? group_sender_address)
        {
            if (group_sender_address == null)
            {
                group_sender_address = sender_address;
            }
            // TODO use channels and drop AppDataMessage
            AppDataMessage app_data = new AppDataMessage(app_data_raw);
            byte[] session_id = app_data.sessionId;

            if (VoIPManager.hasSession(session_id))
            {
                VoIPManager.onRejectedCall(session_id);
                UIHelpers.refreshAppRequests = true;
                return;
            }

            /* ★ F5-1 (#554, r2 per loop A-2) — the session-check RACE, reject leg. Same
             * shape as the accept leg: the main-thread hop ORDERS the re-check behind the
             * pending creation; the handling hops back off the UI thread; the mini-app
             * fall-through stays on the calling thread. See handleAppRequestAccept. */
            MainThread.BeginInvokeOnMainThread(() =>
            {
                if (!VoIPManager.hasSession(session_id))
                {
                    return;
                }
                Logging.info("[NOTIFDIAG] app reject re-check found the VoIP session on the main thread (F5-1 race)");
                Task.Run(() =>
                {
                    try
                    {
                        VoIPManager.onRejectedCall(session_id);
                        UIHelpers.refreshAppRequests = true;
                    }
                    catch (Exception ex)
                    {
                        Logging.error("Deferred VoIP reject failed: " + ex);   // R-4
                    }
                });
            });

            MiniAppPage page = Node.MiniAppManager.getAppPage(group_sender_address, session_id);
            if (page == null)
            {
                Logging.info("App session does not exist.");
                return;
            }

            page.appRequestRejectReceived(group_sender_address, app_data.data);

            UIHelpers.refreshAppRequests = true;
        }

        public static void handleAppEndSession(Address sender_address, byte[] app_data_raw, Address? group_sender_address)
        {
            if (group_sender_address == null)
            {
                group_sender_address = sender_address;
            }
            // TODO use channels and drop SpixiAppData
            AppDataMessage app_data = new AppDataMessage(app_data_raw);
            byte[] session_id = app_data.sessionId;

            if (VoIPManager.hasSession(session_id))
            {
                VoIPManager.onHangupCall(session_id);
                UIHelpers.refreshAppRequests = true;
                return;
            }

            /* ★ F5-1 (#554, r2 per loop A-2) — the session-check RACE, end leg: HALF of
             * the missed-call eater (the other half was the dead predicate in
             * endVoIPSession — loop A-1, VoIPManager.cs:212). The offline fetch delivers
             * a missed call as voiceCall + voiceCallEnd back-to-back on the fetch thread.
             * The voiceCall leg queues its session creation for the main thread
             * (handleAppRequest); this check ran on the fetch thread and found NO session
             * yet → onHangupCall never ran → endVoIPSession never ran → no missed-call
             * row, and the ring ran to timeout. The main-thread hop ORDERS the re-check
             * behind the pending creation; the handling hops back off the UI thread
             * (onHangupCall re-guards on hasSession); the mini-app fall-through stays on
             * the calling thread (A-2). A repro that still loses the row logs the line
             * below plus "endVoIPSession: could not update the call notification". */
            MainThread.BeginInvokeOnMainThread(() =>
            {
                if (!VoIPManager.hasSession(session_id))
                {
                    return;
                }
                Logging.info("[NOTIFDIAG] app end-session re-check found the VoIP session on the main thread (F5-1 race)");
                Task.Run(() =>
                {
                    try
                    {
                        VoIPManager.onHangupCall(session_id);
                        UIHelpers.refreshAppRequests = true;
                    }
                    catch (Exception ex)
                    {
                        Logging.error("Deferred VoIP hangup failed: " + ex);   // R-4
                    }
                });
            });

            MiniAppPage? page = Node.MiniAppManager.getAppPage(group_sender_address, session_id);
            if (page == null)
            {
                Logging.info("App session does not exist.");
                return;
            }

            page.appEndSessionReceived(group_sender_address, app_data.data);
            UIHelpers.refreshAppRequests = true;
        }

        /* ★ ROUND 2 (review-cs MINOR-9) — THE KICK AND BAN ROWS NO LONGER USE A LITERAL 0.
         *
         * This method runs for a BOT only (the guard below). A bot room opens on
         * `botInfo.defaultChannel`: `SingleChatPage.xaml.cs:784-786` assigns
         * `selectedChannel = friend.metaData.botInfo.defaultChannel` when the room has
         * channels, and `:1033` stores with `selectedChannel`. So in a room whose default
         * channel is not 0, both rows landed on a channel the user never looks at and were
         * never rendered. Pre-existing, not introduced by this batch, and it is the same
         * hardcoded-zero family the batch swept in receiveData.
         *
         * The room's DEFAULT channel is the target, not the wire channel: a kick or a ban
         * is a room-level event, and the default channel is the one the page opens on. The
         * wire channel stays as the fallback when the room carries no BotInfo, which is
         * the literal 0 of today in every room that has none.
         * ⚠ SCOPE: kick and ban stay bot-room only. This changes where the row is stored,
         * nothing else. */
        public static void onBotAction(byte[] action_data, Friend bot, int channel_id)
        {
            if(!bot.bot)
            {
                Logging.warn("Received onBotAction for a non-bot");
                return;
            }
            int channel = bot.metaData?.botInfo?.defaultChannel ?? channel_id;
            SpixiBotAction sba = new SpixiBotAction(action_data);
            switch (sba.action)
            {
                case SpixiBotActionCode.kickUser:
                    Node.addMessageWithType(null, FriendMessageType.kicked, bot.walletAddress, channel, SpixiLocalization._SL("chat-kicked"), true);
                    break;

                case SpixiBotActionCode.banUser:
                    Node.addMessageWithType(null, FriendMessageType.banned, bot.walletAddress, channel, SpixiLocalization._SL("chat-banned"), true);
                    break;
            }
        }

        /* ★ F3: read a payload as text without a crash. A malformed packet makes the
         * SpixiMessage constructor throw, and `data` is then null. `Encoding.UTF8.GetString`
         * answers a null with an ArgumentNullException, on the NETWORK thread. The outer
         * catch logs it and the whole message is lost, including the parts that were good.
         * An empty string is the honest answer: the caller stores or ignores an empty
         * message, and nothing else in receiveData is skipped. */
        private static string safeString(byte[]? data)
        {
            if (data == null || data.Length == 0)
            {
                return "";
            }
            try
            {
                return Encoding.UTF8.GetString(data);
            }
            catch (Exception ex)
            {
                Logging.warn("safeString: " + ex.Message);
                return "";
            }
        }

        /* ★ ONE HOME for the channel resolution. SpixiPendingMessageProcessor needs the
         * same answer for a group copy, so it calls this wrapper instead of copying the
         * walk. The body below stays private; this only widens the reach. */
        internal static int resolveChannelForMessage(Friend friend, byte[] msgId, int fallback)
        {
            return resolveMessageChannel(friend, msgId, fallback);
        }

        /* ★★★ ISSUE 1 ①: find the channel a message id actually lives on.
         *
         * A receipt carries the channel the SENDER used, and a bot room stores its
         * messages under `botInfo.defaultChannel` — so the two can disagree and the
         * straight lookup returns null, which used to mean no UI push at all and a clock
         * that only cleared on a reload. Tries the room's default first (the common case,
         * one lookup), then the known channel list. Returns the original on no match, so
         * the caller behaves exactly as before rather than acting on a guess. */
        /* ⚠ (Session H review, B MINOR-8): coverage is CONDITIONAL on room metadata. A bot
         * room whose BotInfo/channel list has not arrived yet resolves to the fallback
         * unchanged — for onMessageExpired that fallback is Core's hardcoded 0, so the
         * expiry writes nowhere and the bubble keeps its clock (no heal exists for
         * errorSending). Common case covered; do not read this as "always finds it". */
        private static int resolveMessageChannel(Friend friend, byte[] msgId, int fallback)
        {
            if (friend == null || msgId == null)
            {
                return fallback;
            }
            try
            {
                int preferred = friend.metaData?.botInfo?.defaultChannel ?? 0;
                if (preferred != fallback && friend.getMessage(preferred, msgId) != null)
                {
                    return preferred;
                }
                var known = friend.channels?.channels;
                if (known != null)
                {
                    List<BotChannel> snapshot;
                    lock (known)
                    {
                        snapshot = new List<BotChannel>(known.Values);
                    }
                    foreach (var c in snapshot)
                    {
                        if (c == null || c.index == fallback || c.index == preferred)
                        {
                            continue;
                        }
                        if (friend.getMessage(c.index, msgId) != null)
                        {
                            return c.index;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Logging.warn("resolveMessageChannel: " + ex.Message);
            }
            return fallback;
        }
    }
}