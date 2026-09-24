using Foundation;
using IXICore.Streaming;
using IXICore.Meta;
using SPIXI.Meta;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Spixi
{
    /// <summary>
    /// ★ #919/#915 (Session AC) — THE APP'S HALF OF THE iOS PUSH GATE: the writer of the
    /// shared store the Notification Service Extension reads
    /// (<c>Spixi-PushService/SpixiPushGate.cs</c>, whose <c>Store</c> is the shape emitted here).
    ///
    /// The extension is a separate process with no node and no <c>Preferences</c>, so the
    /// mute, the master, the sender-name opt-in and the display names have to be WRITTEN
    /// somewhere it can read: the App Group container both bundles are entitled to.
    ///
    /// When it is written — the contract, stated so nobody expects more of it:
    ///   · on every toggle of the master, the sender-name switch and a per-chat mute
    ///     (<c>SNotificationPrefs</c> setters) — a mute followed by a swipe-away holds;
    ///   · on <c>App.OnSleep</c> — the last moment before a push could arrive while the app
    ///     is not in the foreground, so nick changes made during a session land then;
    ///   · NEVER while no wallet is loaded (the launch, retry and lock pages): the friend
    ///     list is empty there and a write would replace a good store with an empty one
    ///     (#46 reviewer MINOR-5) — the previous store stays;
    ///   · and it is DELETED by the account wipe (<see cref="clear"/>), with the rest of the
    ///     account's data.
    ///   Until the first write there is NO store and the extension fails open. A nick that
    ///   changes while the app is ALREADY in the background is stale in the store until the
    ///   next OnSleep; the push then shows OneSignal's own title. Accepted.
    ///
    /// What it writes, and what it deliberately does NOT: only genuine 1:1 contacts go into
    /// <c>muted</c> (the same predicate <c>shouldDisplayRawPush</c> applies before it reads a
    /// per-chat mute) — ⚠ which still silences that contact's GROUP messages, because a group
    /// push carries the sender's address and no chat address; the known limit is stated on the
    /// extension's <c>decide</c>. Names go through <c>displayNameFor</c> (the #211 truncation
    /// canon) and are written ONLY while the sender-name switch is on — the extension has no
    /// use for them otherwise, so the roster's names are not copied at rest for nothing. No
    /// message text, no keys. The file is excluded from iCloud/iTunes backup (the App Group
    /// container is backed up by default, and #912 ② reaches only the app's own folders). The
    /// write — build, serialise, temp file, move — happens under ONE lock so a slow earlier
    /// write can never overwrite a newer one, and the move is atomic so the extension never
    /// reads half a file. Never throws; never logs an address (the log is shareable).
    /// </summary>
    [JsonSerializable(typeof(SPushPrefsShare.Store))]
    internal partial class SPushPrefsStoreContext : JsonSerializerContext { }

    public static class SPushPrefsShare
    {
        /// ⚠ Pinned equal to SpixiPushGate.APP_GROUP and both Entitlements.plist entries.
        public const string APP_GROUP = "group.com.ixilabs.spixi";
        /// ⚠ Pinned equal to SpixiPushGate.FILE_NAME.
        public const string FILE_NAME = "spixi-push.json";
        /// ⚠ Pinned equal to SpixiPushGate.SCHEMA.
        public const int SCHEMA = 1;

        private static readonly object writeLock = new object();

        /// <summary>The shape the extension parses. Field names are the JSON keys.</summary>
        internal sealed class Store
        {
            public int v { get; set; } = SCHEMA;
            public bool enabled { get; set; } = true;
            public bool senderName { get; set; } = false;
            public List<string> muted { get; set; } = new List<string>();
            public Dictionary<string, string> nicks { get; set; } = new Dictionary<string, string>();
            /// ★ #974: unix seconds of this write — the extension's trace prints the store's AGE.
            public long written { get; set; } = 0;
            /// ★ #974: the per-install trace salt (see <see cref="traceSalt"/>).
            public string tagSalt { get; set; } = "";
        }

        /// <summary>The store file's path, or null when the App Group container is not
        /// available to this binary (no entitlement, or the profile does not carry the
        /// group yet — the pre-#919 state). Never throws.</summary>
        public static string? storePath()
        {
            try
            {
                NSUrl? url = NSFileManager.DefaultManager.GetContainerUrl(APP_GROUP);
                string? dir = url?.Path;
                if (string.IsNullOrEmpty(dir)) return null;
                return Path.Combine(dir, FILE_NAME);
            }
            catch (Exception)
            {
                return null;
            }
        }

        /// <summary>Writes the store from the live preferences and friend list. Returns true
        /// when a file was written. Never throws.</summary>
        public static bool sync()
        {
            try
            {
                string? path = storePath();
                if (path == null)
                {
                    return false;
                }
                if (!Node.isRunning)
                {
                    return false;   // no wallet loaded: an empty friend list must not replace the store
                }
                lock (writeLock)
                {
                    if (!Node.isRunning)
                    {
                        return false;   // re-checked INSIDE the lock: a syncLater() task that passed the gate before
                                        // wipeEverything() ran must not rebuild the wiped store from the old roster
                    }
                    Store store = build();
                    store.written = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                    store.tagSalt = traceSalt();
                    // source-generated: reflection JSON is IL2026 under iOS trimming
                    string json = JsonSerializer.Serialize(store, SPushPrefsStoreContext.Default.Store);
                    string tmp = path + ".tmp";
                    File.WriteAllText(tmp, json);
                    File.Move(tmp, path, true);
                    excludeFromBackup(path);
                    /* ★ #974 (iO.11): ONE fixed-vocabulary line per write — the counts and the SALTED
                     * tags of the muted set (never an address; the salt is not in any log). The
                     * extension's [SPUSH] line prints the same tag for the push it gated, so the
                     * device answers "was this sender in the muted set the extension read?" */
                    Logging.info("[SPUSH-APP] store written: enabled=" + store.enabled + " senderName=" + store.senderName
                        + " muted=" + store.muted.Count + " nicks=" + store.nicks.Count
                        + " mutedTags=" + string.Join(",", store.muted.ConvertAll(a => tagOf(store.tagSalt, a))));
                }
                return true;
            }
            catch (Exception e)
            {
                // ★ The store carries addresses; the exception text may repeat one. Type + sanitised message only.
                Logging.warn("SPushPrefsShare.sync failed: " + e.GetType().Name + ": " + SPIXI.Utils.logSafe(e.Message));
                return false;
            }
        }

        /// <summary>Removes the store — the account wipe's step, beside the avatars and the
        /// history. A missing store is the extension's fail-open case. Never throws.</summary>
        public static void clear()
        {
            try
            {
                string? path = storePath();
                if (path == null) return;
                lock (writeLock)
                {
                    if (File.Exists(path)) File.Delete(path);
                    if (File.Exists(path + ".tmp")) File.Delete(path + ".tmp");
                }
            }
            catch (Exception e)
            {
                Logging.warn("SPushPrefsShare.clear failed: " + e.GetType().Name + ": " + SPIXI.Utils.logSafe(e.Message));
            }
        }

        /// <summary>The same exclusion #912 ② applies to the chat history, on this one file:
        /// the App Group container is backed up by default. Never throws.</summary>
        private static void excludeFromBackup(string path)
        {
            try
            {
                using NSUrl url = NSUrl.FromFilename(path);
                if (!url.SetResource(NSUrl.IsExcludedFromBackupKey, NSNumber.FromBoolean(true), out NSError err) && err != null) Logging.warn("SPushPrefsShare: backup exclusion failed: " + SPIXI.Utils.logSafe(err.LocalizedDescription));
            }
            catch (Exception e)
            {
                Logging.warn("SPushPrefsShare: backup exclusion threw: " + e.GetType().Name);
            }
        }

        private const string KEY_TRACE_SALT = "push_trace_salt";

        /// <summary>
        /// ★ #974: the per-install random salt for the trace tags, created once and kept in the
        /// app's preferences (so a tag is stable across writes and restarts). It is written into
        /// the App Group store for the extension and into NO log. Never throws; "" on failure,
        /// and then both sides print "-" instead of a tag.
        /// </summary>
        private static string traceSalt()
        {
            try
            {
                string salt = Microsoft.Maui.Storage.Preferences.Default.Get(KEY_TRACE_SALT, "");
                if (string.IsNullOrEmpty(salt))
                {
                    salt = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
                    Microsoft.Maui.Storage.Preferences.Default.Set(KEY_TRACE_SALT, salt);
                }
                return salt;
            }
            catch (Exception)
            {
                return "";
            }
        }

        /// <summary>★ #974: the same tag the extension computes (SpixiPushGate.tagOf) — the first 6
        /// hex characters of HMAC-SHA256(salt, address). ⚠ Pinned equal to the extension's.</summary>
        internal static string tagOf(string? salt, string? address)
        {
            try
            {
                if (string.IsNullOrEmpty(salt) || string.IsNullOrEmpty(address)) return "-";
                using System.Security.Cryptography.HMACSHA256 h = new System.Security.Cryptography.HMACSHA256(System.Text.Encoding.UTF8.GetBytes(salt));
                byte[] d = h.ComputeHash(System.Text.Encoding.UTF8.GetBytes(address));
                return Convert.ToHexString(d, 0, 3).ToLowerInvariant();
            }
            catch (Exception)
            {
                return "-";
            }
        }

        /// <summary>Fire-and-forget from a UI toggle: the write is a few kilobytes but it is a
        /// file write, and the setters that call this run on the UI thread.</summary>
        public static void syncLater()
        {
            try
            {
                System.Threading.Tasks.Task.Run(() => sync());
            }
            catch (Exception)
            {
                // a failed schedule leaves the previous store — fail-open at the reader
            }
        }

        private static Store build()
        {
            Store store = new Store
            {
                v = SCHEMA,
                enabled = SNotificationPrefs.notificationsEnabled,
                senderName = SNotificationPrefs.showSenderName,
            };
            List<Friend> friends;
            lock (FriendList.friends)
            {
                friends = new List<Friend>(FriendList.friends);
            }
            foreach (Friend friend in friends)
            {
                string? address = null;
                try { address = friend.walletAddress?.ToString(); } catch (Exception) { }
                if (string.IsNullOrEmpty(address))
                {
                    continue;
                }
                /* the same predicate shouldDisplayRawPush applies before it consults the
                 * per-chat mute: only a GENUINE 1:1 contact's mute travels */
                bool isOneToOne = friend.type != FriendType.Group
                    && !friend.bot
                    && (friend.metaData == null || friend.metaData.botInfo == null);
                if (isOneToOne && SNotificationPrefs.isContactMuted(address))
                {
                    store.muted.Add(address);
                }
                if (store.senderName)
                {
                    string name = SNotificationPrefs.displayNameFor(friend);
                    if (!string.IsNullOrEmpty(name))
                    {
                        store.nicks[address] = name;
                    }
                }
            }
            /* ★ #978 (#970): a DECLINED requester is not a friend any more, so the loop above never
             * sees it — its address rides the muted set, and the extension rewrites its push like a
             * muted chat's (the iO.7 limit applies: iOS may still show a generic row; the real fix is
             * the server-side mute row). */
            foreach (string ignored in SRequestIgnore.list())
            {
                if (!store.muted.Contains(ignored)) store.muted.Add(ignored);
            }
            return store;
        }
    }
}
