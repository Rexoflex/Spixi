using Force.Crc32;
using IXICore;
using IXICore.Activity;
using IXICore.Inventory;
using IXICore.Meta;
using IXICore.Network;
using IXICore.RegNames;
using IXICore.Storage;
using IXICore.Streaming;
using IXICore.Streaming.Models;
using IXICore.Utils;
using Microsoft.Maui.Storage;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Spixi;
using SPIXI.Lang;
using SPIXI.MiniApps;
using SPIXI.Network;
using SPIXI.VoIP;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using static IXICore.Transaction;

namespace SPIXI.Meta
{
    class Node : IxianNode
    {
        // Used to force reloading of some homescreen elements
        public static bool changedSettings = false;

        public static IxiNumber fiatPrice = 0;  // Stores the last known ixi fiat value

        public static int startCounter = 0;

        public static TransactionInclusion tiv = null;

        public static MiniAppManager MiniAppManager = null;
        public static MiniAppStorage MiniAppStorage = null;

        public static StreamProcessor streamProcessor = null;

        public static NetworkClientManagerStatic networkClientManagerStatic = null;

        public static IActivityStorage activityStorage = null;

        public static IStorage storage = null;

        // Private data

        private static CancellationTokenSource? ctsLoop;
        private static Task? mainLoopTask;
        private static Task? updateUITask;

        public static Node Instance = null;

        private static bool running = false;

        /// <summary>
        /// ★ #493 (#483) — a read-only view of `running`, for the push handler.
        ///
        /// `SPushService.handleNotificationReceived` is now registered from the Application
        /// (Android), so it fires on pushes delivered to a process that has no node in it.
        /// `OfflinePushMessages.fetchPushMessages` cannot work there — it needs the push URL
        /// and stream processor wired by `init()` above and a wallet to address — so the
        /// handler asks this before attempting the fetch. Read-only on purpose: nothing
        /// outside this file may set it.
        /// </summary>
        public static bool isRunning
        {
            get { return running; }
        }

        private static long lastPriceUpdate = 0;

        private static GenericAPIServer? apiServer = null;

        private static object startLock = new object();

        public Node()
        {
            if (Instance != null)
            {
                throw new Exception("Node instance already exists!");
            }
            Logging.info("Initing node constructor");
            Instance = this;

            IxianHandler.init(Config.version, this, Config.networkType, false, Config.checksumLock);

            // Initialize storage
            storage = new RocksDBStorage(Config.headersFolderPath, Config.blocksDbCacheSize, CoreConfig.maxBlockHeadersPerDatabase, 3, RocksDBOptimizations.Mobiles, Config.minRequiredDiskSpace);

            activityStorage = new ActivityStorage(Config.activityFolderPath, Config.activityDbCacheSize, 0, RocksDBOptimizations.Mobiles, Config.minRequiredDiskSpace);

            PeerStorage.init(Config.spixiUserFolder);

            // Network configuration
            networkClientManagerStatic = new NetworkClientManagerStatic(Config.maxRelaySectorNodesToConnectTo);
            NetworkClientManager.init(networkClientManagerStatic);
            StreamClientManager.init(Config.maxConnectedStreamingNodes, true);

            // Prepare the stream processor
            StreamCapabilities caps = StreamCapabilities.Incoming | StreamCapabilities.Outgoing | StreamCapabilities.IPN | StreamCapabilities.Apps | StreamCapabilities.AppProtocols | StreamCapabilities.GroupCapabilites;
            streamProcessor = new StreamProcessor(new SpixiPendingMessageProcessor(Config.spixiUserFolder, Config.enablePushNotifications), caps);
            
            // Init TIV
            tiv = new TransactionInclusion(storage, new SpixiTransactionInclusionCallbacks(), TIVBlockVerificationMode.Minimal);

            Logging.info("Initing local storage");

            // Prepare the local storage
            IxianHandler.localStorage = new LocalStorage(Config.spixiUserFolder, new SpixiLocalStorageCallbacks());

            MiniAppManager = new MiniAppManager(Config.spixiUserFolder);
            MiniAppStorage = new MiniAppStorage(Config.spixiUserFolder);

            FriendList.init(Config.spixiUserFolder, true);

            UpdateVerify.init(Config.checkVersionUrl, Config.checkVersionSeconds);

            OfflinePushMessages.init(Config.pushServiceUrl, streamProcessor);

            string backup_file_name = Path.Combine(Config.spixiUserFolder, "spixi.account.backup.ixi");
            if (File.Exists(backup_file_name))
            {
                File.Delete(backup_file_name);
            }

            InventoryCache.init(new InventoryCacheClient(tiv));

            RelaySectors.init(CoreConfig.relaySectorLevels, null);

            Logging.info("Node init done");
        }

        /* ★★ #584 — THE CONTACTS ARE READ ONCE PER PROCESS, AND THAT IS THE #565 BUG.
         *
         * Damir's capture named it: `[RESTOREDIAG] loadChats run 2: friends=0 accFiles=15`
         * — the restored Acc tree is on disk with 15 files and the in-memory list is empty.
         *
         * `FriendList.loadContacts()` is guarded by `FriendList.contactsLoaded`
         * (Ixian-Core FriendList.cs), a PROCESS-LIFETIME latch cleared only in
         * `FriendList.init()`, which runs once at node construction. This method is its
         * only caller. So a SECOND account load in the same process — wipe → restore,
         * restore → back to welcome → restore, restore → lock-cancel → restore — reaches
         * `loadContacts()`, is turned away by the latch, and `friends` keeps whatever it
         * held. After a wipe that is EMPTY, and it stays empty until the app restarts.
         * That is exactly Damir's rule of thumb from the other side: "wipe, RESTART, then
         * restore, and the contacts are populated."
         *
         * ★ The field is PUBLIC STATIC, so this is a Spixi-side fix. Ixian-Core stays
         * frozen (097341a) and no §1e row is needed.
         *
         * ⚠ WHY IT IS SAFE TO CLEAR HERE, and only here. `loadContacts()` begins with
         * `friends.Clear()`, so re-running it REPLACES the list. This method runs before
         * the node starts, under `startLock`, on the launch/restore path — the one moment
         * where no page is rendering from `friends` and no stream thread is reading it.
         * Clearing the latch anywhere later would tear the list out from under a live
         * chat list. The reset therefore sits INSIDE the `running` guard's shadow: if the
         * node is already running we return without touching anything. */
        static public void preStart()
        {
            lock (startLock)
            {
                if (running)
                {
                    return;
                }
                Logging.info("Pre-Starting node");
                // Start local storage
                IxianHandler.localStorage.start();

                /* ★★ #584, round-2 MAJOR-1 — RE-ARM ONLY WHEN THE LIST IS EMPTY.
                 * The first cut re-armed unconditionally, and that was a REGRESSION on a
                 * far more common path than wipe→restore: `App.EnsureNodeRunning` calls
                 * preStart on RESUME (App.xaml.cs), after a backgrounded process shut the
                 * node down. `running` is false there, so the guard above does not fire —
                 * and `loadContacts()` begins with `friends.Clear()` and rebuilds every
                 * Friend as a NEW object. The app routes by REFERENCE identity
                 * (`Utils.getChatPage` compares `page.friend == friend`; SingleChatPage
                 * captures its Friend once in the ctor), so an open conversation would be
                 * orphaned: an arriving message resolves the new object, finds no page and
                 * never renders, and a reply written on the orphan is persisted from the
                 * NEW object's message list — i.e. dropped.
                 * An EMPTY list is the whole #565 state (`friends=0 accFiles=15`) and it is
                 * the only state where a re-read can orphan nothing: there is no live Friend
                 * for a page to be holding. On resume the list is populated, so this is a
                 * no-op and the resume path behaves exactly as it did before #584. */
                if (FriendList.friends.Count == 0)
                {
                    FriendList.contactsLoaded = false;
                }
                /* ⚠ round-2 NIT-2: loadContacts enumerates the Acc directory unguarded, and
                 * one caller of preStart is HomePage's constructor. A missing Acc — reachable
                 * when a restore throws between the delete and the move — must not throw out
                 * of a page constructor. */
                try
                {
                    FriendList.loadContacts();
                }
                catch (Exception e)
                {
                    Logging.error("preStart: loadContacts threw (#584): " + e);
                }
                Logging.info("[RESTOREDIAG] preStart: contacts read, friends={0}", FriendList.friends.Count);
            }
        }

        static public bool start()
        {
            lock (startLock)
            {
                if (running)
                {
                    Logging.warn("Cannot start Node, it is already running.");
                    return false;
                }
                Logging.info("Starting node");

                running = true;
                IxianHandler.status = NodeStatus.warmUp;

                UpdateVerify.start();

                if (!storage.prepareStorage(false))
                {
                    Logging.error("Error while preparing block storage! Aborting.");
                    return false;
                }

                activityStorage.prepareStorage(false);

                var pending_txs = activityStorage.getActivitiesByStatus(ActivityStatus.Pending, true);
                pending_txs.AddRange(activityStorage.getActivitiesByStatus(ActivityStatus.Reverted, true));
                // Load pending transactions
                foreach (var pending_tx in pending_txs)
                {
                    if (pending_tx.type == ActivityType.TransactionReceived)
                    {
                        PendingTransactions.addIncomingTransaction(pending_tx.transaction);
                    }
                    else if (pending_tx.type == ActivityType.TransactionSent
                            || pending_tx.type == ActivityType.IxiName)
                    {
                        PendingTransactions.addOutgoingTransaction(pending_tx.transaction, pending_tx.transaction.toList.TakeLast(2).Select(x => x.Key).ToList());
                    }
                }

                ulong block_height = 0;
                byte[]? block_checksum = null;
                if (IxianHandler.networkType == NetworkType.main)
                {
                    block_height = CoreConfig.bakedBlockHeight;
                    block_checksum = CoreConfig.bakedBlockChecksum;
                }

                // Start TIV
                tiv.start(block_height, block_checksum, true);

                // Generate presence list
                PresenceList.init(IxianHandler.publicIP, 0, 'C', CoreConfig.clientKeepAliveInterval);

                // Start the network queue
                NetworkQueue.start();

                streamProcessor.start();

                // Start the keepalive thread
                PresenceList.startKeepAlive();

                // Start the transfer manager
                TransferManager.start();

                MiniAppManager.start();

                startCounter++;

                // Init push service
                SPushService.initialize();

                string tag = IxianHandler.getWalletStorage().getPrimaryAddress().ToString();
                SPushService.setTag(tag);

                resume();

                if (Config.apiBinds.Count != 0)
                {
                    apiServer = new GenericAPIServer();
                    apiServer.start(Config.apiBinds, Config.apiUsers, Config.apiAllowedIps, activityStorage);
                }

                Logging.info("Node started");

                return true;
            }
        }


        // Checks for existing wallet file. Can also be used to handle wallet/account upgrading in the future.
        // Returns true if found, otherwise false.
        static public bool checkForExistingWallet()
        {
            if (!File.Exists(Path.Combine(Config.spixiUserFolder, Config.walletFile)))
            {
                Logging.log(LogSeverity.error, "Cannot read wallet file.");
                return false;
            }

            return true;
        }

        static public bool loadWallet()
        {
            if (Preferences.Default.ContainsKey("walletpass") == false)
                return false;

            // TODO: decrypt the password
            string password = Preferences.Default.Get("walletpass", "").ToString();


            WalletStorage walletStorage = new WalletStorage(Path.Combine(Config.spixiUserFolder, Config.walletFile));
            if (walletStorage.readWallet(password))
            {
                IxianHandler.addWallet(walletStorage);

                // Prepare the balances list
                List<Address> address_list = IxianHandler.getWalletStorage().getMyAddresses();
                foreach (Address addr in address_list)
                {
                    IxianHandler.balances.Add(addr, new Balance(addr, 0));
                }

                return true;
            }
            return false;
        }

        static public bool generateWallet(string pass)
        {
            if (IxianHandler.getWalletList().Count == 0)
            {
                WalletStorage ws = new WalletStorage(Path.Combine(Config.spixiUserFolder, Config.walletFile));
                if (ws.generateWallet(pass))
                {
                    return IxianHandler.addWallet(ws);
                }
            }
            return false;
        }

        static public void connectToNetwork()
        {
            // ★ #545 loop r1 MAJOR-1: NetworkUtils.isolate() (the wipe route) PAUSES the
            // three static managers and NOTHING in this app ever resumed them — an
            // in-process create/restore after a wipe reached this method and then
            // reconnectLoop spun on `paused` forever ("no network, empty lists, a restart
            // recovers" — F-3's third mechanism). Every connect path heals the latch first;
            // a no-op when nothing was paused.
            NetworkUtils.resumeNetworkOperations();

            // Start the s2 client manager
            StreamClientManager.start();

            // Start the network client manager
            NetworkClientManager.start(2);
        }

        private static void connectToBotNodes()
        {
            List<Friend> bot_list = null;
            lock (FriendList.friends)
            {
                bot_list = FriendList.friends.FindAll(x => x.bot);
            }
            foreach (var bot_entry in bot_list)
            {
                if (Clock.getNetworkTimestamp() - bot_entry.updatedStreamingNodes < CoreConfig.clientPresenceExpiration
                    && bot_entry.relayNode != null)
                {
                    StreamClientManager.connectTo(bot_entry.relayNode.hostname, bot_entry.walletAddress);
                } else
                {
                    CoreStreamProcessor.fetchFriendsPresence(bot_entry);
                }
            }
        }

        /* ★★ m10 (#46 loop, ROUND 2, 2026-08-22) — THE OFFLINE FETCH LOCK LIVES HERE, BESIDE
         * THE CALLER THAT MAKES IT NECESSARY.
         *
         * Round 1 put a lock inside `SPushService.decidePushUncached` and nowhere else. That
         * guarded the push lane against itself. It did NOT guard the pair that actually
         * collides: this loop tick and a push callback. `OfflinePushMessages.fetchPushMessages`
         * mutates a static `nonce` in Ixian-Core with no lock of its own
         * (`Ixian-Core/Streaming/OfflinePushMessages.cs:114` and `:181`), and it sets
         * `lastUpdate = 0` whenever data was available, so the 60 s cooldown does not apply
         * during a burst. The push lane passes `force: true` and skips the cooldown outright.
         * The lock therefore had to move to the file that owns BOTH callers, and this is it.
         *
         * ⚠ WEIGHED, NOT ASSUMED — the cure is only worth its cost because of the SECOND leg.
         * The fetch leg IS self-healing: the server answers `ERROR: Nonce too low N` and
         * `OfflinePushMessages.cs:127` resets the nonce, so a lost race there costs one wasted
         * round trip and nothing else. The REMOVE leg is not. `remove.php` at
         * `OfflinePushMessages.cs:186` reads its answer and discards it, so a lost race leaves
         * the message on the server and it is delivered a second time. A repeated message is a
         * repeated notification, which is the NOTIF-4 family this batch exists to close. That
         * one leg is why the lock stays.
         *
         * ⚠ THE WAIT IS ZERO, AND THAT IS THE POINT. Take the lock only when it is free. Both
         * callers must skip rather than queue. A push callback has a 30 s budget inside the
         * OneSignal SDK, and `fetchPushMessages` blocks on `.Result` over an `HttpClient` with
         * NO Timeout set — 100 s of default, once per HTTP call, and there is one call per
         * message on top of the first. Neither this loop nor a push callback may wait behind
         * that. Any bound short enough to be safe is far too short to outlast an HTTP round
         * trip, so a bound would only pretend to help. A skipped fetch is cheap: this loop
         * returns in 2.5 s, `lastUpdate` was never touched, and the holder is fetching the SAME
         * mailbox for the SAME wallet, so its result lands in this process anyway.
         *
         * ⚠ SO A SLOW PUSH-LANE FETCH CANNOT STALL THIS LOOP. It cannot deadlock either: this
         * is a leaf lock. Nothing is held while it is taken, nothing is taken while it is held,
         * and `fetchPushMessages` never re-enters itself.
         *
         * ⚠ THE ONE THING STILL OPEN IS NOT OURS. `HttpClient.Timeout` is never set, at
         * `Ixian-Core/Streaming/OfflinePushMessages.cs:118`. Ixian-Core is frozen at 097341a.
         * That line is the remaining exposure and it belongs to the BE owner. */
        internal static readonly object pushFetchLock = new object();
        internal const int PUSH_FETCH_TRY_MS = 0;

        // Handle timer routines
        static public async void mainLoop(CancellationToken ct)
        {
            try
            {
                bool fireLocalNotification = OperatingSystem.IsAndroid();
                while (!ct.IsCancellationRequested)
                {
                    try
                    {
                        PeerStorage.savePeersFile();

                        /* ★ F5-3 (#553) — the same guard family as App.EnsureNodeRunning.
                         * A half-started node can run this loop with NO wallet loaded
                         * (running=true latches before the wallet read in start()).
                         * fetchPushMessages signs with the primary key
                         * (Ixian-Core/Streaming/OfflinePushMessages.cs:112) and threw the
                         * same KeyNotFoundException at 12:28:06 in fatalexception.txt.
                         * No wallet → skip the fetch, keep the loop alive. */
                        if (Config.enablePushNotifications && IxianHandler.wallets.Count > 0)
                        {
                            /* ★★ m10 (#46 loop, ROUND 2): the OTHER caller of the fetch, and the
                             * one that made the round-1 lock a promise the code did not keep.
                             * See `pushFetchLock` above for the whole reasoning.
                             *
                             * ⚠ `fireLocalNotification` is cleared only when the fetch RAN. It
                             * is true for the first pass alone, and that pass is what fires
                             * local notifications for messages that arrived while the app was
                             * closed. Clearing it on a skip would eat that pass.
                             *
                             * ⚠ THREE-argument TryEnter. The two-argument form takes the lock
                             * inside the call and assigns the flag after it returns; an
                             * asynchronous exception in that window would hold the lock for the
                             * life of the process. */
                            bool fetchTaken = false;
                            try
                            {
                                Monitor.TryEnter(pushFetchLock, PUSH_FETCH_TRY_MS, ref fetchTaken);
                                if (fetchTaken)
                                {
                                    OfflinePushMessages.fetchPushMessages(false, fireLocalNotification, false);
                                    fireLocalNotification = false;
                                }
                                else
                                {
                                    Logging.warn("[NOTIFDIAG] offline fetch is busy, skipped (node loop)");
                                }
                            }
                            finally
                            {
                                if (fetchTaken)
                                {
                                    Monitor.Exit(pushFetchLock);
                                }
                            }
                        }

                        // Update the friendlist
                        updateFriendStatuses();

                        // Cleanup the presence list
                        // TODO: optimize this by using a different thread perhaps
                        PresenceList.performCleanup();

                        bool firstBalance = true;
                        foreach (var balance in IxianHandler.balances.Values)
                        {
                            // Request initial wallet balance
                            if (balance.blockHeight == 0 || balance.lastUpdate + 300 < Clock.getTimestamp())
                            {
                                CoreProtocolMessage.broadcastProtocolMessage(['M', 'H', 'R'], ProtocolMessageCode.getBalance2, balance.address.addressNoChecksum.GetIxiBytes(), null);

                                if (firstBalance)
                                {
                                    CoreProtocolMessage.fetchSectorNodes(IxianHandler.primaryWalletAddress, CoreConfig.maxRelaySectorNodesToRequest);
                                    //ProtocolMessage.fetchAllFriendsSectorNodes(10);
                                    //StreamProcessor.fetchAllFriendsPresences(10);
                                }
                            }
                            firstBalance = false;
                        }

                        // Check price if enough time passed
                        if (lastPriceUpdate + Config.checkPriceSeconds < Clock.getTimestamp())
                        {
                            updateIxiPrice();
                        }

                        connectToBotNodes();

                        if (VoIPManager.currentCallStartedTime == 0
                            && VoIPManager.currentCallInitiated != 0
                            && Clock.getTimestamp() - VoIPManager.currentCallInitiated > 60)
                        {
                            VoIPManager.hangupCall(null, true);
                        }
                    }
                    catch (Exception e)
                    {
                        Logging.error("Exception occurred in mainLoop: " + e);
                    }
                    await Task.Delay(2500, ct);
                }
            }
            catch (OperationCanceledException)
            {
                // normal shutdown
            }
            catch (Exception e)
            {
                Logging.error("Exception occurred in mainLoop: " + e);
            }
        }

        static public async void updateUILoop(CancellationToken ct)
        {
            try
            {
                while (!ct.IsCancellationRequested)
                {
                    try
                    {
                        if (running)
                        {
                            HomePage.InstanceOrNull()?.OnUpdateUI();   // AND-1 (#329): UI tick must never construct
                        }
                    }
                    catch (Exception e)
                    {
                        Logging.error("Exception occurred in updateUILoop: " + e);
                    }
                    await Task.Delay(2000, ct);
                }
            }
            catch (OperationCanceledException)
            {
                // normal shutdown
            }
            catch (Exception e)
            {
                Logging.error("Exception occurred in updateUILoop: " + e);
            }
        }

        static public void updateFriendStatuses()
        {
            lock (FriendList.friends)
            {
                // Go through each friend and check for the pubkey in the PL
                foreach (Friend friend in FriendList.friends)
                {
                    Presence? presence = null;

                    try
                    {
                        presence = PresenceList.getPresenceByAddress(friend.walletAddress);
                    }
                    catch (Exception e)
                    {
                        Logging.error("Presence Error {0}", e.Message);
                        presence = null;
                    }

                    if (presence != null)
                    {
                        if (friend.online == false
                            && friend.relayNode != null)
                        {
                            friend.online = true;
                            /* ★ THE BADGE DIAL (audit MAJOR): the TRUE count, matching the flush sites.
                             * Ixian-Core's getUnreadMessageCount() returns 0 for a muted chat, so
                             * leaving it here meant the row showed its count after a flush and then
                             * lost it on the very next PRESENCE TICK (~1 Hz) — the badge would
                             * appear and vanish, reading on device exactly like "the dial doesn't
                             * work". The flush and the live tick must agree. */
                            UIHelpers.setContactStatus(friend.walletAddress, friend.online, friend.metaData.unreadMessageCount, "", 0);
                        }
                    }
                    else
                    {
                        if (friend.online == true)
                        {
                            friend.online = false;
                            /* ★ THE BADGE DIAL (audit MAJOR): the TRUE count, matching the flush sites.
                             * Ixian-Core's getUnreadMessageCount() returns 0 for a muted chat, so
                             * leaving it here meant the row showed its count after a flush and then
                             * lost it on the very next PRESENCE TICK (~1 Hz) — the badge would
                             * appear and vanish, reading on device exactly like "the dial doesn't
                             * work". The flush and the live tick must agree. */
                            UIHelpers.setContactStatus(friend.walletAddress, friend.online, friend.metaData.unreadMessageCount, "", 0);
                        }
                    }
                }
            }
        }

        static private void stop()
        {
            lock (startLock)
            {
                if (!running)
                {
                    return;
                }

                Logging.info("Stopping node...");
                running = false;

                // First stop localStorage, to flush any pending chat messages to storage
                // The Node is currently in shutting down state, so no incoming messages will be processed by the message processors
                IxianHandler.localStorage.stop();

                // Stop the stream processor, it includes pending messages
                streamProcessor.stop();

                // Stop everything else storage related
                MiniAppManager.stop();

                activityStorage.stopStorage();

                TransferManager.stop();

                PeerStorage.savePeersFile(true);

                // Stop the block storage
                storage.stopStorage();


                // Stop everything else


                // Stop TIV
                tiv.stop();

                // Stop the keepalive thread
                PresenceList.stopKeepAlive();

                // Stop the API server
                if (apiServer != null)
                {
                    apiServer.stop();
                    apiServer = null;
                }

                // Stop everything network related
                NetworkQueue.stop();
                NetworkClientManager.stop();
                StreamClientManager.stop();

                UpdateVerify.stop();

                pause();

                Logging.info("Node stopped");
            }
        }

        public static void pause()
        {
            lock (startLock)
            {
                if (mainLoopTask == null)
                {
                    return;
                }

                IxianHandler.localStorage?.flush();
                storage?.sleep();
                activityStorage?.sleep();

                ctsLoop?.Cancel();
                try
                {
                    mainLoopTask.GetAwaiter().GetResult();
                }
                catch (OperationCanceledException) { }
                catch (Exception e)
                {
                    Logging.error("Error while pausing " + e);
                }
                finally
                {
                    ctsLoop?.Dispose();
                    ctsLoop = null;
                    mainLoopTask = null;
                }

                try
                {
                    updateUITask?.GetAwaiter().GetResult();
                }
                catch (OperationCanceledException) { }
                catch (Exception e)
                {
                    Logging.error("Error while pausing " + e);
                }
                finally
                {
                    updateUITask = null;
                }
            }
        }

        public static void resume()
        {
            lock (startLock)
            {
                if (!running)
                {
                    return;
                }

                if (mainLoopTask != null)
                {
                    return;
                }

                ctsLoop = new CancellationTokenSource();
                mainLoopTask = Task.Run(() => mainLoop(ctsLoop.Token));
                updateUITask = Task.Run(() => updateUILoop(ctsLoop.Token));
                updateUITask.ConfigureAwait(false);
            }
        }

        public override bool isAcceptingConnections()
        {
            // TODO TODO TODO TODO implement this properly
            return false;
        }

        public override void shutdown()
        {
            HomePage.InstanceOrNull()?.stop();   // AND-1 (#329): shutdown must never construct-to-stop
            stop();
        }

        public override ulong getLastBlockHeight()
        {
            Block? block = tiv.getLastBlockHeader();
            if (block == null)
            {
                return 0;
            }
            return block.blockNum;
        }

        public override int getLastBlockVersion()
        {
            Block? block = tiv.getLastBlockHeader();
            if (block == null
                || block.version < Block.maxVersion)
            {
                // TODO Omega force to v10 after upgrade
                return Block.maxVersion - 1;
            }
            return block.version;
        }

        public override bool addIncomingTransaction(Transaction tx)
        {
            if (tx.timeStamp == 0)
            {
                tx.timeStamp = Clock.getTimestamp();
            }
            if (IxianHandler.addTransactionToActivityStorage(activityStorage, tx))
            {
                UIHelpers.shouldRefreshTransactions = true;
                return PendingTransactions.addIncomingTransaction(tx);
            }
            return false;
        }

        public override bool addTransaction(Transaction tx, List<Address> relayNodeAddresses, List<ExtendedAddress>? extendedAddresses, byte[]? requestId, bool force_broadcast)
        {
            if (tx.timeStamp == 0)
            {
                tx.timeStamp = Clock.getTimestamp();
            }
            if (IxianHandler.addTransactionToActivityStorage(activityStorage, tx))
            {
                UIHelpers.shouldRefreshTransactions = true;
                if (PendingTransactions.addOutgoingTransaction(tx, relayNodeAddresses))
                {
                    foreach (var address in relayNodeAddresses)
                    {
                        NetworkClientManager.sendToClient(address, ProtocolMessageCode.transactionData2, tx.getBytes(true, true));
                    }

                    if (extendedAddresses != null)
                    {
                        foreach (ExtendedAddress extendedAddress in extendedAddresses)
                        {
                            Friend? friend = FriendList.getFriend(extendedAddress.RoutingAddress);
                            byte[]? txRequestId = requestId;
                            if (friend != null)
                            {
                                FriendMessage? friend_message = Node.addMessageWithType(requestId, FriendMessageType.sentFunds, friend.walletAddress, 0, tx.getTxIdString(), true);
                                txRequestId = friend_message.id;
                            }
                            CoreStreamProcessor.transactionSend(tx, extendedAddresses, txRequestId);
                        }
                    }
                    return true;
                }
            }
            return false;
        }

        public override Block? getLastBlock()
        {
            return tiv.getLastBlockHeader();
        }

        // Returns the current wallet's usable balance
        public static IxiNumber getAvailableBalance()
        {
            IxiNumber currentBalance = 0;
            foreach (var balance in IxianHandler.balances)
            {
                currentBalance += balance.Value.balance;
            }
            currentBalance -= PendingTransactions.getPendingSendingTransactionsAmount();

            return currentBalance;
        }

        public override void parseProtocolMessage(ProtocolMessageCode code, byte[] data, RemoteEndpoint endpoint)
        {
            ProtocolMessage.parseProtocolMessage(code, data, endpoint);
        }

        public static void onLowMemory()
        {
            IxianHandler.localStorage?.flush();
            storage?.sleep();
            activityStorage?.sleep();
            var pages = Utils.getChatPages();
            List<Address> excludeAddresses = new();
            foreach (var p in pages)
            {
                excludeAddresses.Add(p.friend.walletAddress);
            }
            FriendList.onLowMemory(excludeAddresses);
            // #315 (#46 r1 MINOR-3): the parked warm Account WebView is the memory
            // dial iOS-46 (a) bought — under REAL pressure it is the first thing to
            // give back (an opacity-0 WKWebView is also a prime jetsam target whose
            // content-process death would re-present a dead blank page; disposing
            // here shrinks that window to presented-only, the pre-#315 world).
            SPIXI.SpixiContentPage.disposeParkedOverlay();
        }

        public override Block? getBlockHeader(ulong blockNum)
        {
            return storage.getBlock(blockNum);
        }

        public override IxiNumber getMinSignerPowDifficulty(ulong blockNum, int curBlockVersion, long curBlockTimestamp)
        {
            return tiv.getMinSignerPowDifficulty(blockNum, curBlockVersion, curBlockTimestamp);
        }

        private static void updateIxiPrice()
        {
            using (HttpClient client = new())
            {
                try
                {
                    HttpContent httpContent = new StringContent("", Encoding.UTF8, "application/x-www-form-urlencoded");
                    var response = client.PostAsync(Config.priceServiceUrl, httpContent).Result;
                    string body = response.Content.ReadAsStringAsync().Result;

                    dynamic obj = JsonConvert.DeserializeObject(body);
                    JObject jObject = (JObject)obj;
                    fiatPrice = new IxiNumber((string)jObject["ixicash"]["usd"]);
                }
                catch (Exception e)
                {
                    Logging.error("Exception occured in checkPrice: " + e);
                }
            }
            lastPriceUpdate = Clock.getTimestamp();
        }

        public override RegisteredNameRecord getRegName(byte[] name, bool useAbsoluteId = true)
        {
            throw new NotImplementedException();
        }

        public override byte[]? getBlockHash(ulong blockNum)
        {
            var tsd = storage.getBlockTotalSignerDifficulty(blockNum);
            return tsd.blockHash;
        }

        public static FriendMessage? addMessageWithType(byte[]? id, FriendMessageType type, Address wallet_address, int channel, string message, bool local_sender = false, Address? sender_address = null, long timestamp = 0, bool fire_local_notification = true, bool alert = true, int payable_data_len = 0)
        {
            return addMessageWithType(type, wallet_address, channel, new ChatStreamMessage(id, message, 0, false), local_sender, sender_address, timestamp, fire_local_notification, alert, payable_data_len);
        }

        // AND-15 (#334): localized per-type notification body. _SL returns NULL for a
        // missing key (SpixiLocalization:141) and locales outside the shipped set can
        // be active (OS-culture first-run, #258) — every branch carries an English
        // fallback. voiceCallEnd deliberately falls through to the default (a call-end
        // push isn't reliably a missed call — dial). requestAdd included: a contact
        // request notifying as "New Message" was the same information loss.
        private static string notificationTextForType(FriendMessageType type)
        {
            string key, fallback;
            switch (type)
            {
                case FriendMessageType.voiceCall: key = "notification-incoming-call"; fallback = "Incoming call"; break;
                case FriendMessageType.sentFunds: key = "notification-payment-received"; fallback = "Payment received"; break;
                case FriendMessageType.requestFunds: key = "notification-payment-request"; fallback = "Payment request"; break;
                case FriendMessageType.appSession: key = "notification-app-invite"; fallback = "App invite"; break;
                case FriendMessageType.fileHeader: key = "notification-file"; fallback = "File received"; break;
                case FriendMessageType.requestAdd: key = "notification-contact-request"; fallback = "Contact request"; break;
                default: key = "notification-new-message"; fallback = "New Message"; break;
            }
            return SpixiLocalization._SL(key) ?? fallback;
        }

        public static FriendMessage? addMessageWithType(FriendMessageType type, Address wallet_address, int channel, ChatStreamMessage chat_stream_message, bool local_sender = false, Address? sender_address = null, long timestamp = 0, bool fire_local_notification = true, bool alert = true, int payable_data_len = 0)
        {
            var friend_message_with_status = FriendList.addMessageWithType(type, wallet_address, channel, chat_stream_message, local_sender, sender_address, timestamp, fire_local_notification, payable_data_len);
            var friend_message = friend_message_with_status.message;
            if (friend_message != null)
            {
                bool oldMessage = false;

                Friend friend = FriendList.getFriend(wallet_address);

                /* ★★ #617 — GIVE A BOT ROOM'S MESSAGE ITS SENDER BACK.
                 *
                 * The Spixi bot group renders every message with NO name and NO avatar
                 * — not a nickname, not an address, not a placeholder. Damir's report,
                 * and his memory of it was exact: "it worked for the first few weeks,
                 * then one session broke it."
                 *
                 * The session was ours — `4ca77a1c`, 2026-08-14, "the Ixian-Core bump to
                 * 0.9.8k". That bump pulled in core's `5643e5b` (2026-08-03), which added
                 * this to `FriendList.addMessage`:
                 *
                 *     if (friend.type == FriendType.Normal) { set_sender_address = null; }
                 *
                 * ⚠ A BOT ROOM'S FRIEND IS `FriendType.Normal`. `setBotMode()` sets
                 * `bot = true` and calls `setGroupMode()`, and neither ever touches
                 * `type` — so the null fires on every message a bot channel carries.
                 * (Legacy is unaffected because spixi-0.9.22 is dated 2026-06-16, seven
                 * weeks before that line existed. It is not evidence that today's core is
                 * fine; it is evidence that June's core was.)
                 *
                 * ONE nulled field, and it is the key for FOUR separate lookups, so they
                 * all die together: the render-time roster lookup in `resolveNick`, the
                 * truncated-address fallback, `FriendList.setNickname`'s backfill (which
                 * bails with "Sender address is null" — that line is in the device log),
                 * and the `updateGroupChatNicks` live upgrade. The avatar goes with them:
                 * it is stored on disk under the address as its filename, so a nameless
                 * row also cannot find a face. ★ That is why every disc in the report is
                 * the SAME colour — the identity hue is derived from the address, and a
                 * uniform hue means no seed ever reached it.
                 *
                 * ★ WE DO NOT NEED A CORE CHANGE, because we never lost the address —
                 * we handed it in. `StreamProcessor` reads `group_sender_address` off
                 * the wire and passes it here as `sender_address`; core keeps it long
                 * enough to resolve `senderNick` from the roster, then discards it. So
                 * put it back on the message we were just handed. Everything downstream
                 * is already correct and waiting: the shell's sender ladder (nick, else
                 * truncated address), the `groupNicks` map, `resolveNick`, the avatar
                 * seed and the member sheet all key on exactly this field.
                 *
                 * ⚠ Deliberately narrow. It restores ONLY what the caller already gave
                 * us, ONLY when core returned nothing, so a room where core keeps the
                 * address (a real Group) is untouched, and a 1:1 chat — which passes no
                 * `sender_address` at all — cannot be reached by this at all.
                 * ⚠ Messages already on disk with a null address cannot be recovered:
                 * that field is gone from the file. In practice the room re-syncs from
                 * the bot server, which is what heals a device that has this build. */
                if (friend != null
                    && friend.bot
                    && sender_address != null
                    && friend_message.senderAddress == null)
                {
                    friend_message.senderAddress = sender_address;
                    // the insert above only REQUESTED a write, so the queued serialize
                    // still sees the live object — this re-request is the belt that makes
                    // the restore survive a restart rather than living only in memory.
                    try
                    {
                        IxianHandler.localStorage.requestWriteMessages(wallet_address, channel);
                    }
                    catch (Exception e)
                    {
                        Logging.warn("Could not re-request a message write after restoring the bot sender address: " + e);
                    }
                }

                if (!friend.online)
                {
                    StreamProcessor.fetchFriendsPresence(friend, true);
                }

                // Check if the message was sent before the friend was added to the contact list
                if (friend.addedTimestamp > friend_message.timestamp)
                {
                    oldMessage = true;
                }
                
                if (!UIHelpers.isChatScreenDisplayed(friend)
                    &&!friend_message.read)
                {
                    // Increase the unread counter if this is a new message
                    if (!oldMessage)
                        friend.metaData.unreadMessageCount++;

                    friend.saveMetaData();
                }

                // If a chat page is visible, insert the message directly
                if (friend_message_with_status.updated)
                {
                    UIHelpers.updateMessage(friend, channel, friend_message);
                }
                else
                {
                    UIHelpers.insertMessage(friend, channel, friend_message);
                }

                UIHelpers.shouldRefreshContacts = true;

                // Only send alerts if this is a new message
                if (oldMessage == false)
                {
                    // Send a local push notification if Spixi is not in the foreground
                    if (fire_local_notification && !local_sender)
                    {
                        if (App.isInForeground == false || Utils.getChatPage(friend) == null)
                        {
                            // don't fire notification for nickname and avatar
                            if (!friend_message.id.SequenceEqual(new byte[] { 4 }) && !friend_message.id.SequenceEqual(new byte[] { 5 }))
                            {
                                // ★ NOTIF-1 (Damir on device: "notifications work on the bot
                                // group but not private groups"). The old predicate here was
                                // `friend.bot == false || (botInfo != null && sendNotification)`.
                                // `Friend.bot` has a PRIVATE setter and is turned on only by
                                // setBotMode() (Ixian-Core Friend.cs:250-253); a private group is
                                // built by setGroupMode() and never sets it. So for every private
                                // group the first clause short-circuited TRUE and the mute toggle
                                // was ignored, while bots fell to the second clause and were
                                // honored — exactly the split reported.
                                //
                                // The predicate now lives in ONE place (SNotificationPrefs), which
                                // also folds in the NOTIF-2 global master and the local per-1:1
                                // mute. A 1:1 contact has no botInfo, so it is unaffected unless
                                // the user muted that specific chat.
                                //
                                // ⚠ This does NOT introduce the muted-badge behaviour: Ixian-Core
                                // Friend.getUnreadMessageCount() (:513-520) already returns 0 on
                                // the same botInfo predicate WITHOUT consulting friend.bot, so a
                                // muted private group has had a zeroed badge all along while still
                                // firing notifications. This makes the two agree. Whether muting
                                // SHOULD also zero the badge is a product question — raised in the
                                // DECISIONS row, not silently inherited.
                                if (SNotificationPrefs.shouldNotify(friend))
                                {
                                    int unreadCount = FriendList.getUnreadMessageCount();
                                    // AND-15 (#334): per-type copy — payments, app invites and
                                    // INCOMING CALLS all read "New Message" before (calls were
                                    // lost entirely). kind routes calls to the Android
                                    // Incoming-calls channel; other platforms ignore it.
                                    //
                                    // ★ NOTIF-2: the sender's name is prefixed ONLY when the user
                                    // opted in (default off = today's copy, byte-identical).
                                    // Message TEXT is never included, on any setting.
                                    string notifText = notificationTextForType(type);
                                    if (SNotificationPrefs.showSenderName)
                                    {
                                        /* ⚠ AUDIT MINOR: friend.nickname falls back to _nick, and
                                         * two call sites seed _nick with the RAW ADDRESS
                                         * (SpixiContentPage:2858, SingleChatPage:1510) — so a
                                         * contact who never sent a nick would put 60+ characters
                                         * of base58 in the notification. IsNullOrEmpty does not
                                         * catch that. The #211/#212 truncation canon is FE-only,
                                         * so the same rule is applied here. */
                                        string senderName = SNotificationPrefs.displayNameFor(friend);
                                        if (!string.IsNullOrEmpty(senderName))
                                        {
                                            notifText = senderName + ": " + notifText;
                                        }
                                    }

                                    // ★ NOTIF-4 (Damir: "five notifications for one chat"). The id
                                    // was CRC32 of the MESSAGE id, so every message posted a NEW
                                    // notification and ten messages made ten rows. It is now CRC32
                                    // of the CHAT address, so the next message from the same chat
                                    // REPLACES the previous row instead of stacking beside it —
                                    // one row per conversation, which is what SetGroup(data) was
                                    // already reaching for without a summary to group into.
                                    // chatUnread lets the platform say "N new messages"; it was
                                    // already computed per friend and thrown away.
                                    int chatUnread = friend.getUnreadMessageCount();
                                    // addressNoChecksum, NOT getInputBytes(): the latter
                                    // returns the PUBLIC KEY whenever one is populated
                                    // (Ixian-Core Address.cs:426-437), so the same chat
                                    // would hash two different ways depending on what was
                                    // known at the time — and the one-row-per-chat property
                                    // would flap. The canonical address bytes are always
                                    // present and never change for a given chat.
                                    /* ⚠ AUDIT MAJOR: a CALL must not share the chat's id.
                                     * Calls and messages route to DIFFERENT channels, so with one
                                     * id a text arriving after a missed call silently replaced the
                                     * missed-call row (and an incoming call wiped the "3 new
                                     * messages" row). The id lives in SNotificationPrefs so this
                                     * poster and 3.14's canceller cannot drift apart. */
                                    bool isCallNotif = type == FriendMessageType.voiceCall;
                                    int notifId = SNotificationPrefs.notificationIdFor(friend.walletAddress, isCallNotif);
                                    // ★ the sound BELT (#518, extended by #46 r1 auditor D): the
                                    // notification lane is an audio source too (the channel carries
                                    // the system sound), and it logged nothing on success — so a
                                    // "random sound on an idle app" report could not tell a channel
                                    // sound from an in-app effect. Kind + alert only; no address.
                                    // r2 P-MINOR-4: "attempt", not "posted" — this line precedes the
                                    // call and consults neither its outcome nor the channel state.
                                    // ⚠ The BACKGROUND push lanes (SPushService.postOurPushRow and
                                    // the SDK's own row) log under [NOTIFDIAG], not SND — a triage
                                    // of an idle-app sound greps BOTH prefixes.
                                    Logging.info("SND notif attempt: " + (isCallNotif ? "call" : "message") + " alert=" + alert);
                                    SPushService.showLocalNotification(notifId, "Spixi", notifText, friend.walletAddress.ToString(), alert, unreadCount, isCallNotif ? "call" : "message", chatUnread);
                                    SPushService.clearRemoteNotifications(unreadCount);
                                }
                            }
                        }
                    }

                    SSystemAlert.flash();

                    // ★ SND-1 (2026-08-21): the app made no sound for a chat message —
                    // SSystemAlert.flash() above is an empty method body on every
                    // platform. Fail-soft and gated on the in-app-sounds preference, and
                    // silent until Damir's assets land (SSounds documents the contract).
                    //
                    // Placed inside `oldMessage == false` so a history re-flush cannot
                    // replay a burst of sounds, and split by direction because the two
                    // are different events to a user.
                    //
                    // ⚠ A RECEIVED message only sounds when the chat is MUTABLE-audible:
                    // an in-app sound for a chat the user muted would walk straight
                    // around the mute they just set.
                    //
                    // ⚠ AUDIT MAJOR — THE GUARDS. The first cut of this block sat OUTSIDE
                    // every gate the notification above respects, which would have made the
                    // app chime for things that deliberately show nothing:
                    //   · `fire_local_notification == false` callers — VoIPManager starting
                    //     and ending a call, app-session bookkeeping in SingleChatPage and
                    //     HomePage — all silent by design, all would have chimed.
                    //   · the id {4}/{5} carriers, which are a peer's NICKNAME and AVATAR
                    //     updates. A contact editing their nickname would ring your phone
                    //     with nothing on screen to explain it, and a peer can set that id
                    //     on an ordinary chat message.
                    //   · voiceCall, which would have chirped UNDER its own ringtone.
                    //   · kicked/banned system messages, which arrive as local_sender and
                    //     would have sounded like something you sent.
                    // So the sound answers the same questions the notification does.
                    //
                    // The FUNDS types are excluded separately. ⚠ 2026-08-23: SND-2 is
                    // REMOVED (Damir's design reversal — a restored account's chain
                    // walk chimed for every historical transaction), so these
                    // exclusions now mean "funds events play NO IN-APP EFFECT" — not
                    // "another chime owns them". They stay: a funds message must not
                    // start making message sounds because the transaction sound died.
                    // ⚠ Scope honesty (#46 r1 D MINOR-4): the NOTIFICATION lane above
                    // has no funds exclusion — a funds message arriving backgrounded
                    // still posts a notification whose channel carries the system
                    // sound. Inherited, unchanged, and not what #518 removed.
                    /* ⚠ AUDIT MINOR: also gate on `alert` and on the SAME visibility test the
                     * notification uses. Without them, once the assets land a backgrounded
                     * message would fire the notification (channel sound + vibrate) AND an
                     * in-app effect — two sounds for one message — and the `alert == false`
                     * callers, which are silent by design on the notification side, would be
                     * audible here. `voiceCallEnd` joins the excluded types for the same reason
                     * `voiceCall` did: an answered call ending must not play "message received". */
                    bool soundable = fire_local_notification
                        && alert
                        // ⚠ The notification fires when `isInForeground == false || chatPage == null`.
                        // The in-app effect must therefore fire on the COMPLEMENT of that, or the
                        // two double up: app in the foreground WITH this chat open, where no
                        // notification is posted and the sound is the only feedback there is.
                        && App.isInForeground && Utils.getChatPage(friend) != null
                        && type != FriendMessageType.sentFunds
                        && type != FriendMessageType.requestFunds
                        && type != FriendMessageType.voiceCall
                        && type != FriendMessageType.voiceCallEnd
                        && !friend_message.id.SequenceEqual(new byte[] { 4 })
                        && !friend_message.id.SequenceEqual(new byte[] { 5 });
                    if (!soundable)
                    {
                        // nothing — this event plays no in-app effect by design
                        // (SND-2 is removed; the notification lane is separate)
                    }
                    else if (local_sender)
                    {
                        // ⚠ AUDIT MINOR: gated on the PER-CHAT mute and the sound switch, NOT
                        // on the notification master. isChatMuted was built to exclude the
                        // master for exactly this reason — otherwise turning notifications off
                        // would leave sending audible while receiving went silent, which
                        // neither switch describes.
                        if (!SNotificationPrefs.isChatMuted(friend))
                        {
                            // ★ sound belt (handoff §3): the trigger names its context.
                            // SSounds.play logs the asset; this line logs WHY it fired.
                            Logging.info("SND-1 message-sent sound: type=" + type);
                            SSounds.messageSent();
                        }
                    }
                    else if (!SNotificationPrefs.isChatMuted(friend))
                    {
                        // ★ sound belt (handoff §3): the receive leg names its context too.
                        Logging.info("SND-1 message-received sound: type=" + type);
                        SSounds.messageReceived();
                    }
                }
            }
            return friend_message;
        }

        static public IxiNumber calculateTransactionFeeFromAvailableBalance(Address fromAddress, ExtendedAddress toAddress)
        {
            IxiNumber amount = getAvailableBalance();
            var prepTx = prepareTransactionFrom(fromAddress, toAddress, amount, false);
            var amountDiff = (prepTx.transaction.amount + prepTx.transaction.fee) - amount;
            prepTx = prepareTransactionFrom(fromAddress, toAddress, amount - amountDiff, false);
            amountDiff = (prepTx.transaction.amount + prepTx.transaction.fee) - (amount - amountDiff);
            return amountDiff;
        }

        static public IxiNumber calculateTransactionFee(Address fromAddress, ExtendedAddress toAddress, IxiNumber amount)
        {
            var prepTx = prepareTransactionFrom(fromAddress, toAddress, amount, false);
            var amountDiff = (prepTx.transaction.amount + prepTx.transaction.fee) - amount;
            return amountDiff;
        }

        static public (Transaction? transaction, List<Address>? relayNodeAddresses, List<ExtendedAddress>? extendedAddresses) prepareTransactionFrom(Address fromAddress, ExtendedAddress toAddress, IxiNumber amount, bool check_balance = true)
        {
            IxiNumber fee = ConsensusConfig.forceTransactionPrice;
            Dictionary<Address, ToEntry> toList = new(new AddressComparer());
            Address pubKey = new(IxianHandler.getWalletStorage().getPrimaryPublicKey());

            if (!IxianHandler.getWalletStorage().isMyAddress(fromAddress))
            {
                Logging.info("From address is not my address.");
                return (null, null, null);
            }

            Dictionary<byte[], IxiNumber> fromList = new(new ByteArrayComparer())
            {
                { IxianHandler.getWalletStorage().getAddress(fromAddress).nonce, amount }
            };

            List<ExtendedAddress> extendedAddresses = new List<ExtendedAddress>();

            toList.AddOrReplace(toAddress.PaymentAddress, new ToEntry(Transaction.getExpectedVersion(IxianHandler.getLastBlockVersion()), amount, toAddress.Tag));

            if (toAddress.Flag != AddressPaymentFlag.Primary)
            {
                extendedAddresses.Add(toAddress);
            }

            List<Address> tmpRelayNodeAddresses = NetworkClientManager.getRandomConnectedClientAddresses(2);
            List<Address> relayNodeAddresses = new List<Address>();
            IxiNumber relayFee = 0;
            foreach (Address relayNodeAddress in tmpRelayNodeAddresses)
            {
                if (toList.ContainsKey(relayNodeAddress))
                {
                    continue;
                }
                var tmpFee = fee > ConsensusConfig.transactionDustLimit ? fee : ConsensusConfig.transactionDustLimit;
                ToEntry toEntry = new ToEntry(getExpectedVersion(IxianHandler.getLastBlockVersion()),
                                              tmpFee,
                                              null,
                                              null);
                relayNodeAddresses.Add(relayNodeAddress);
                toList.Add(relayNodeAddress, toEntry);
                relayFee += tmpFee;
            }

            // Prepare transaction to calculate fee
            Transaction transaction = new((int)Transaction.Type.Normal, fee, toList, fromList, pubKey, IxianHandler.getHighestKnownNetworkBlockHeight());

            relayFee = 0;
            foreach (Address relayNodeAddress in relayNodeAddresses)
            {
                var tmpFee = transaction.fee > ConsensusConfig.transactionDustLimit ? transaction.fee : ConsensusConfig.transactionDustLimit;
                toList[relayNodeAddress].amount = tmpFee;
                relayFee += tmpFee;
            }

            byte[] first_address = fromList.Keys.First();
            fromList[first_address] = fromList[first_address] + relayFee + transaction.fee;
            if (check_balance)
            {
                IxiNumber wal_bal = IxianHandler.getWalletBalance(new Address(transaction.pubKey.addressNoChecksum, first_address));
                if (fromList[first_address] > wal_bal)
                {
                    IxiNumber maxAmount = wal_bal - transaction.fee;

                    if (maxAmount < 0)
                        maxAmount = 0;

                    Logging.info("Insufficient funds to cover amount and transaction fee.\nMaximum amount you can send is {0} IXI.\n", maxAmount);
                    return (null, null, null);
                }
            }
            // Prepare transaction with updated "from" amount to cover fee
            transaction = new((int)Transaction.Type.Normal, fee, toList, fromList, pubKey, IxianHandler.getHighestKnownNetworkBlockHeight());
            return (transaction, relayNodeAddresses, extendedAddresses);
        }

        static public Transaction sendTransactionFrom(Address fromAddress, ExtendedAddress toAddress, IxiNumber amount, byte[]? requestId)
        {
            var prepTx = prepareTransactionFrom(fromAddress, toAddress, amount);
            var transaction = prepTx.transaction;
            var relayNodeAddresses = prepTx.relayNodeAddresses;
            // Send the transaction
            if (IxianHandler.addTransaction(transaction, relayNodeAddresses, prepTx.extendedAddresses, requestId, true))
            {
                Logging.info("Sending transaction, txid: {0}", transaction.getTxIdString());
                return transaction;
            }
            else
            {
                Logging.warn("Could not send transaction, txid: {0}", transaction.getTxIdString());
            }
            return null;
        }
    }
}
