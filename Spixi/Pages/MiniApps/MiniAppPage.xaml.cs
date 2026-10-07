using IXICore;
using IXICore.Meta;
using Newtonsoft.Json;
using SPIXI.MiniApps;
using SPIXI.MiniApps.ActionRequestModels;
using SPIXI.Lang;
using SPIXI.Meta;
using System.Text;
using System.Web;
using IXICore.Streaming;
using SPIXI.MiniApps.ActionResponseModels;
using Microsoft.Maui.ApplicationModel;
using System;
using System.Net.Http;
using System.Linq;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using System.Collections.Generic;


namespace SPIXI
{
    [XamlCompilation(XamlCompilationOptions.Compile)]
    public partial class MiniAppPage : SpixiContentPage
    {
        public string appId = null;
        public byte[] sessionId = null; // App session ID

        //public Address myRequestAddress = null; // which address the app request was sent to
        //public Address requestedByAddress = null; // which address sent the app request to us

        public Address hostUserAddress; // address of the local user
        public Friend? friendOrGroup = null; // if the app is a multi-user app, this will be the friend or group that the app session is associated with

        public bool accepted = false;
        public long requestReceivedTimestamp = 0;

        public int sdkVersion = 40;

        private MiniAppActionHandler? miniAppActionHandler;

        /** ★ S8 (#1233): a mini-app session id — sha3_512sqTrunc of the app id's UTF-8 bytes (the constructor's rule, moved
         *  here unchanged so SingleChatPage / StreamProcessor derive the SAME id from a stored invite row). */
        public static byte[] sessionIdFor(string app_id)
        {
            return CryptoManager.lib.sha3_512sqTrunc(UTF8Encoding.UTF8.GetBytes(app_id));
        }

        public MiniAppPage(string app_id, Address host_user_address, Friend? friend_or_group, string app_entry_point)
        {
            InitializeComponent();
            NavigationPage.SetHasNavigationBar(this, false);


            // TODO randomize session id and add support for more users
            sessionId = sessionIdFor(app_id);   // ★ S8 (#1233): the one home of the math (Join's accept + Decline's reject reuse it)

            appId = app_id;

            hostUserAddress = host_user_address;
            friendOrGroup = friend_or_group;

            // Load the app entry point
            var source = new UrlWebViewSource();
            source.Url = "file://" + app_entry_point;
            _webView = webView;
            webView.Source = source;
            webView.Navigated += webViewNavigated;
            webView.Navigating += webViewNavigating;

            requestReceivedTimestamp = Clock.getTimestamp();

            if (friend_or_group != null)
            {
                if (friend_or_group.type == FriendType.Group)
                {
                    if (!friend_or_group.metaData.botInfo.hideParticipantAddresses)
                    {
                        foreach (var contact in friend_or_group.users.contacts)
                        {
                            Friend? friend = FriendList.getFriend(contact.Key);
                            if (friend != null)
                            {
                                StreamProcessor.fetchFriendsPresence(friend, true);
                            }
                        }
                    }
                }
                else
                {
                    StreamProcessor.fetchFriendsPresence(friend_or_group, true);
                }
            }
        }

        public override void recalculateLayout()
        {
            ForceLayout();
        }

        protected override void OnAppearing()
        {
            base.OnAppearing();
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
            /* ★ A-8 / S-04 (#1245): the bridge verbs are fenced. This runs on the UI thread for EVERY navigation the
             * installed mini app's own code makes; a malformed verb used to throw out of here (Substring with no '=',
             * FromBase64String on bad input) and take Spixi down. Now a bad verb is dropped with one fixed-word line
             * (never the URL: it carries the app's data), and the navigation stays cancelled. Cancel-first and the ONE
             * `file:` re-allow stay in this method (Session O ①). */
            bool handled;
            try
            {
                handled = handleBridgeUrl(current_url);
            }
            catch (Exception ex)
            {
                handled = true;
                Logging.warn("MiniAppPage: a bridge verb was dropped (" + ex.GetType().Name + ")");
            }
            if (handled)
            {
                return;
            }
            else if (current_url.Trim().StartsWith("file:", StringComparison.OrdinalIgnoreCase))
            {
                // allow normal navigation only for local files
                e.Cancel = false;
                return;
            }
            e.Cancel = true;
        }

        /** ★ A-8: the mini-app bridge verbs (the global ones first). True = the URL was a verb (handled or dropped). */
        private bool handleBridgeUrl(string current_url)
        {
            if (onNavigatingGlobal(current_url))
            {
                return true;
            }

            if (current_url.StartsWith("ixian:onload", StringComparison.Ordinal))
            {
                string version = current_url.Substring("ixian:onload".Length);
                if (version.Length < 2)
                {
                    version = "";
                }
                else
                {
                    version = version.Substring(1);
                }
                onLoad(version);
            }
            else if (current_url.Equals("ixian:back", StringComparison.Ordinal))
            {
                onBack();
            }
            else if (current_url.StartsWith("ixian:data", StringComparison.Ordinal))
            {
                // TODO TODO TODO probably a different encoding should be used for data
                sendNetworkData(UTF8Encoding.UTF8.GetBytes(current_url.Substring(10)));
            }
            else if (current_url.StartsWith("ixian:protocolData", StringComparison.Ordinal))
            {
                // ★ A-8: validate BEFORE slicing — no '=' (or an empty id) drops the verb
                if (!AuditRules.trySplitKeyValue(current_url.Substring("ixian:protocolData".Length), out string protocolId, out string data))
                {
                    Logging.warn("MiniAppPage: protocolData without a key was dropped");
                    return true;
                }
                byte[] protocolIdBytes = null;
                if (protocolId != "null")
                {
                    protocolIdBytes = CryptoManager.lib.sha3_512Trunc(UTF8Encoding.UTF8.GetBytes(protocolId));
                }
                // TODO TODO TODO probably a different encoding should be used for data
                sendNetworkProtocolData(protocolIdBytes, UTF8Encoding.UTF8.GetBytes(data));
            }
            else if (current_url.StartsWith("ixian:getStorageData", StringComparison.Ordinal))
            {
                var key = current_url.Substring("ixian:getStorageData".Length);
                var data = Node.MiniAppStorage.getStorageData(appId, "main", key);
                string dataStr = "null";
                if (data != null)
                {
                    dataStr = Convert.ToBase64String(data);
                }
                Utils.sendUiCommand(this, "SpixiAppSdk.onStorageData", key, dataStr);
            }
            else if (current_url.StartsWith("ixian:setStorageData", StringComparison.Ordinal))
            {
                // ★ A-8: validate BEFORE slicing; bad base64 drops the verb (it never stores a partial value)
                if (!AuditRules.trySplitKeyValue(current_url.Substring("ixian:setStorageData".Length), out string key, out string value))
                {
                    Logging.warn("MiniAppPage: setStorageData without a key was dropped");
                    return true;
                }
                byte[] valueToStore = null;
                if (value != "null")
                {
                    valueToStore = AuditRules.tryBase64(value);
                    if (valueToStore == null)
                    {
                        Logging.warn("MiniAppPage: setStorageData with a bad value was dropped");
                        return true;
                    }
                }
                Node.MiniAppStorage.setStorageData(appId, "main", key, valueToStore);
            }
            else if (current_url.StartsWith("ixian:action", StringComparison.Ordinal))
            {
                var action = current_url.Substring("ixian:action".Length);
                handleAction(action);
            }
            else if (current_url.StartsWith("xa:", StringComparison.Ordinal))
            {
                // ★ A-8: bad base64 drops the verb
                byte[]? actionBytes = AuditRules.tryBase64(current_url.Substring("xa:".Length));
                if (actionBytes == null)
                {
                    Logging.warn("MiniAppPage: an xa action with a bad encoding was dropped");
                    return true;
                }
                handleAction(UTF8Encoding.UTF8.GetString(actionBytes));
            }
            else
            {
                return false;   // not a bridge verb — onNavigating decides (file: or stay cancelled)
            }
            return true;
        }

        private void sendActionRejected(string command, string id, string error)
        {
            if (command == MiniAppCommands.STORAGE_GET
                || command == MiniAppCommands.STORAGE_SET
                || command == MiniAppCommands.SEND_PAYMENT)
            {
                var ar = new MiniAppActionResponse()
                {
                    id = id,
                    e = error
                };
                Utils.sendUiCommand(this, "SpixiAppSdk.ar", JsonConvert.SerializeObject(ar));
                return;
            }
        }

        private async void handleAction(string action)
        {
            MiniAppActionBase? jsonResult = null;
            try
            {
                jsonResult = JsonConvert.DeserializeObject<MiniAppActionBase>(action);
                string? actionResponse = miniAppActionHandler.processAction(jsonResult.c, action);

                if (actionResponse == null)
                {
                    await displaySpixiAlert(SpixiLocalization._SL("app-action-title"), SpixiLocalization._SL("app-action-unknown"), SpixiLocalization._SL("global-dialog-ok"));
                    return;
                }

                if (jsonResult.c == MiniAppCommands.NETWORK_DATA_SEND)
                {
                    // Already processed, no response
                    return;
                }
                else if (jsonResult.c == MiniAppCommands.STORAGE_GET
                    || jsonResult.c == MiniAppCommands.STORAGE_SET)
                {
                    Utils.sendUiCommand(this, "SpixiAppSdk.ar", actionResponse);
                    return;
                }
                else if (jsonResult.c == MiniAppCommands.NAME_EXTEND
                    || jsonResult.c == MiniAppCommands.NAME_TRANSFER
                    || jsonResult.c == MiniAppCommands.NAME_REGISTER
                    || jsonResult.c == MiniAppCommands.NAME_UPDATE_CAPACITY
                    || jsonResult.c == MiniAppCommands.NAME_UPDATE
                    || jsonResult.c == MiniAppCommands.NAME_ALLOW_SUBNAMES)
                {
                    if (!await displaySpixiAlert(SpixiLocalization._SL("app-action-title"), string.Format(SpixiLocalization._SL("app-action-response-confirmation"), actionResponse), SpixiLocalization._SL("global-dialog-ok"), SpixiLocalization._SL("global-dialog-cancel")))
                    {
                        return;
                    }
                }
                else if (jsonResult.c == MiniAppCommands.SEND_PAYMENT)
                {
                    TransactionResponse txResponse = JsonConvert.DeserializeObject<TransactionResponse>(actionResponse);
                    Transaction tx = new Transaction(Convert.FromBase64String(txResponse.tx));
                    // TODO Add support for extended addresses
                    Friend? friend = FriendList.getFriend(new Address(tx.toList.Keys.First()));
                    string nick = tx.toList.Keys.First().ToString();
                    if (friend != null)
                    {
                        nick = friend.nickname + " (" + nick + ")";
                    }

                    if (!await displaySpixiAlert(SpixiLocalization._SL("app-action-title"), string.Format(SpixiLocalization._SL("app-action-response-payment-user-confirmation"), nick, tx.toList.Values.First().amount.ToString() + " IXI"), SpixiLocalization._SL("global-dialog-ok"), SpixiLocalization._SL("global-dialog-cancel")))
                    {
                        sendActionRejected(jsonResult.c, jsonResult.id, "rejected");
                        return;
                    }

                    if (string.IsNullOrEmpty(jsonResult.responseUrl))
                    {
                        if (IxianHandler.addTransaction(tx, tx.toList.Keys.Skip(1).ToList(), null, null, true))
                        {
                            Utils.sendUiCommand(this, "SpixiAppSdk.ar", actionResponse);
                            return;
                        }
                        else
                        {
                            sendActionRejected(jsonResult.c, jsonResult.id, "error");
                        }

                        return;
                    }

                }
                else
                {
                    if (!await displaySpixiAlert(SpixiLocalization._SL("app-action-title"), string.Format(SpixiLocalization._SL("app-action-response-confirmation"), actionResponse), SpixiLocalization._SL("global-dialog-ok"), SpixiLocalization._SL("global-dialog-cancel")))
                    {
                        return;
                    }
                }

                HttpResponseMessage? response = null;
                // ★ C-04 (#1245): awaited (was `.Result` on the UI thread) and bounded
                using (HttpClient client = new HttpClient() { Timeout = TimeSpan.FromSeconds(AuditRules.MiniAppPostTimeoutSeconds) })
                {
                    try
                    {
                        HttpContent httpContent = new StringContent(actionResponse, Encoding.UTF8, "application/x-www-form-urlencoded");
                        response = await client.PostAsync(jsonResult.responseUrl, httpContent);
                        if (response.IsSuccessStatusCode)
                        {
                            await displaySpixiAlert(SpixiLocalization._SL("app-action-title"), SpixiLocalization._SL("app-action-sent"), SpixiLocalization._SL("global-dialog-ok"));
                            return;
                        }
                    }
                    catch (Exception e)
                    {
                        Logging.error("Exception occured in handleActionPageResponse while sending response to service: " + e);
                    }
                }
                if (response != null)
                {
                    await displaySpixiAlert(SpixiLocalization._SL("app-action-error-sending-title"), string.Format(SpixiLocalization._SL("app-action-error-sending"), "(" + response.StatusCode + "): " + (await response.Content.ReadAsStringAsync())), SpixiLocalization._SL("global-dialog-ok"));
                }
                else
                {
                    await displaySpixiAlert(SpixiLocalization._SL("app-action-error-sending-title"), string.Format(SpixiLocalization._SL("app-action-error-sending"), ""), SpixiLocalization._SL("global-dialog-ok"));
                }
            }
            catch (Exception e)
            {
                Logging.error("Exception while processing Mini App action '{0}': {1}", action, e);
                if (jsonResult != null)
                {
                    sendActionRejected(jsonResult.c, jsonResult.id, e.Message);
                }
                await displaySpixiAlert(SpixiLocalization._SL("app-action-error-processing-title"), string.Format(SpixiLocalization._SL("app-action-error-processing"), action), SpixiLocalization._SL("global-dialog-ok"));
            }
        }

        private void onNavigated(object sender, WebNavigatedEventArgs e)
        {
            // Deprecated due to WPF, use onLoad
        }

        private IEnumerable<string>? getMembers()
        {
            IEnumerable<string> contacts;

            if (friendOrGroup == null)
            {
                return null;
            }

            if (friendOrGroup.type == FriendType.Group)
            {
                if (friendOrGroup.metaData.botInfo.hideParticipantAddresses)
                {
                    contacts = friendOrGroup.users.contacts.Select(x => maskSenderAddress(x.Key));
                }
                else
                {
                    contacts = friendOrGroup.users.contacts.Select(x => x.Key.ToString());
                }
            }
            else
            {
                contacts = new[] { friendOrGroup.walletAddress.ToString() };
            }
            return contacts;
        }

        private void onLoad(string sdkVersion)
        {
            if (sdkVersion != "")
            {
                this.sdkVersion = (int)(float.Parse(sdkVersion) * 100);
            }

            miniAppActionHandler = new MiniAppActionHandler(appId, sessionId, hostUserAddress, friendOrGroup, this.sdkVersion, Node.MiniAppStorage);

            string hostUserAddressString = maskSenderAddress(hostUserAddress, true);
            IEnumerable<string>? contacts = getMembers();

            if (this.sdkVersion >= 50)
            {
                if (contacts != null)
                {
                    string[] args = (new[] { Crypto.hashToString(sessionId) })
                        .Concat([hostUserAddressString])
                        .Concat(contacts)
                        .ToArray();

                    // Multi User App
                    Utils.sendUiCommand(this, "SpixiAppSdk.onInit", args);
                }
                else
                {
                    // Single User App
                    Utils.sendUiCommand(this, "SpixiAppSdk.onInit", Crypto.hashToString(sessionId), hostUserAddressString);
                }
            }
            else
            {
                if (contacts != null)
                {
                    // Multi User App
                    Utils.sendUiCommand(this, "SpixiAppSdk.onInit", Crypto.hashToString(sessionId), string.Join(',', contacts));
                }
                else
                {
                    // Single User App
                    Utils.sendUiCommand(this, "SpixiAppSdk.onInit");
                }
            }

            // Execute timer-related functionality immediately
            updateScreen();
        }

        // ★ #265 (Opus review MAJOR-1): this WebView runs THIRD-PARTY publisher code —
        // it must never receive call/app-request pushes (they carry the caller's wallet
        // address + the live VoIP session id, which onNavigatingGlobal would accept back
        // as appAccept/appReject/hangUp). Opt OUT of the C18 broadcast.
        public override bool acceptsCallPushes => false;

        // Executed every second
        public override void updateScreen()
        {

        }

        private void sendNetworkData(byte[] data)
        {
            Friend? f = friendOrGroup;
            if (f != null)
            {
                StreamProcessor.sendAppData(f, sessionId, data);
            }
            else
            {
                Logging.error("Cannot send network data: App is probably in single mode.");
            }
        }


        private void sendNetworkProtocolData(byte[] protocolId, byte[] data)
        {
            Friend? f = friendOrGroup;
            if (f != null)
            {
                StreamProcessor.sendAppProtocolData(f, protocolId, data);
            }
            else
            {
                Logging.error("Cannot send network protocol data: App is probably in single mode.");
            }
        }

        private void onBack()
        {
            Friend? f = friendOrGroup;
            if (f != null)
            {
                StreamProcessor.sendAppEndSession(f, sessionId, null);
            }

            Node.MiniAppManager.removeAppPage(sessionId);
            popPageAsync();
        }

        public string maskSenderAddress(Address senderAddress, bool forceDeriveIfBlind = false)
        {
            if (friendOrGroup != null
                && friendOrGroup.type == FriendType.Group
                && friendOrGroup.metaData.botInfo.hideParticipantAddresses)
            {
                if (friendOrGroup.users.getOwner().SequenceEqual(hostUserAddress))
                {
                    // We're the owner, derive all addresses
                    senderAddress = GroupChat.DeriveGroupAddress(senderAddress, friendOrGroup.metaData.botInfo.randomId);
                }
                else
                {
                    // Derive only owner's address or if forced, as others are already derived
                    if (forceDeriveIfBlind
                        || friendOrGroup.users.getOwner().SequenceEqual(senderAddress))
                    {
                        senderAddress = GroupChat.DeriveGroupAddress(senderAddress, friendOrGroup.metaData.botInfo.randomId);
                    }
                }
                // Truncate addresses to 32 characters to prevent apps from accidentally sending IXI to virtual/hidden addresses.
                return senderAddress.ToString().Substring(0, 32);
            }

            return senderAddress.ToString();
        }

        public void networkDataReceived(Address sender_address, byte[] data)
        {
            string sender_address_str = maskSenderAddress(sender_address);
            MainThread.BeginInvokeOnMainThread(() =>
            {
                // TODO TODO TODO probably a different encoding should be used for data
                Utils.sendUiCommand(this, "SpixiAppSdk.onNetworkData", sender_address_str, UTF8Encoding.UTF8.GetString(data));
            });
        }

        public void networkProtocolDataReceived(Address sender_address, string protocol_name, byte[] data)
        {
            string sender_address_str = maskSenderAddress(sender_address);
            MainThread.BeginInvokeOnMainThread(() =>
            {
                // TODO TODO TODO probably a different encoding should be used for data
                Utils.sendUiCommand(this, "SpixiAppSdk.onNetworkProtocolData", sender_address_str, protocol_name, UTF8Encoding.UTF8.GetString(data));
            });
        }

        public void appRequestAcceptReceived(Address sender_address, byte[] data)
        {
            string sender_address_str = maskSenderAddress(sender_address);
            MainThread.BeginInvokeOnMainThread(() =>
            {
                // TODO TODO TODO probably a different encoding should be used for data
                string dataStr = "";
                if (data != null)
                {
                    dataStr = UTF8Encoding.UTF8.GetString(data);
                }
                Utils.sendUiCommand(this, "SpixiAppSdk.onRequestAccept", sender_address_str, dataStr);
            });
        }

        public void appRequestRejectReceived(Address sender_address, byte[] data)
        {
            string sender_address_str = maskSenderAddress(sender_address);
            MainThread.BeginInvokeOnMainThread(() =>
            {
                // TODO TODO TODO probably a different encoding should be used for data
                string dataStr = "";
                if (data != null)
                {
                    dataStr = UTF8Encoding.UTF8.GetString(data);
                }
                Utils.sendUiCommand(this, "SpixiAppSdk.onRequestReject", sender_address_str, dataStr);
            });
        }

        public void appEndSessionReceived(Address sender_address, byte[] data)
        {
            string sender_address_str = maskSenderAddress(sender_address);
            MainThread.BeginInvokeOnMainThread(() =>
            {
                // TODO TODO TODO probably a different encoding should be used for data
                string dataStr = "";
                if (data != null)
                {
                    dataStr = UTF8Encoding.UTF8.GetString(data);
                }
                Utils.sendUiCommand(this, "SpixiAppSdk.onAppEndSession", sender_address_str, dataStr);
            });
        }

        public void transactionReceived(Address sender_address, IxiNumber amount, string txid, byte[] data, bool verified)
        {
            if (Node.MiniAppManager.getApp(appId).hasCapability(MiniAppCapabilities.TransactionSigning))
            {
                MainThread.BeginInvokeOnMainThread(() =>
                {
                    Utils.sendUiCommand(this, "SpixiAppSdk.onTransactionReceived", sender_address.ToString(), amount.ToString(), txid, Crypto.hashToString(data), verified.ToString());
                });
            }
        }

        public void paymentSent(Address sender_address, IxiNumber amount, string txid, byte[] data, bool verified)
        {
            if (Node.MiniAppManager.getApp(appId).hasCapability(MiniAppCapabilities.TransactionSigning))
            {
                MainThread.BeginInvokeOnMainThread(() =>
                {
                    Utils.sendUiCommand(this, "SpixiAppSdk.onPaymentSent", sender_address.ToString(), amount.ToString(), txid, Crypto.hashToString(data), verified.ToString());
                });
            }
        }

        public bool hasUser(Address user)
        {
            if (friendOrGroup == null)
            {
                return false;
            }

            if (friendOrGroup.walletAddress.SequenceEqual(user))
            {
                return true;
            }

            if (friendOrGroup.users == null)
            {
                return false;
            }

            return friendOrGroup.users.hasUser(user);
        }

        protected override bool OnBackButtonPressed()
        {
            onBack();

            return true;
        }
    }
}