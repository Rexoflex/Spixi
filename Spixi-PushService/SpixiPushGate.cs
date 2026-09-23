using Foundation;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using UserNotifications;

namespace OneSignalNotificationServiceExtension
{
    /// <summary>
    /// ★ #919/#915 (Session AC) — THE iOS PUSH GATE, the extension's half of Android's
    /// <c>SPushService.decidePush</c> (#510).
    ///
    /// This runs in the NotificationServiceExtension PROCESS: no node, no
    /// <c>FriendList</c>, no <c>Preferences</c>. Everything it may know arrives through ONE
    /// file the app writes into the shared App Group container
    /// (<c>Spixi/Platforms/iOS/SPushPrefsShare.cs</c>): the global master, the sender-name
    /// opt-in, the muted 1:1 addresses and the display names. The file is the whole
    /// contract; <see cref="Store"/> is its shape, and the app-side writer emits exactly it.
    ///
    /// What the gate can do, and what it cannot (docs/ios-nse-spec.md §2): an iOS extension
    /// may MUTATE a notification, never cancel it. So a muted push is rewritten to EMPTY
    /// content — no title, no body, no subtitle, no sound, no badge change — and whether iOS
    /// then shows nothing or a blank row is settled by the office test, not assumed here.
    /// Every other push keeps OneSignal's own text; it gains a thread per SENDER (the payload
    /// carries the sender address only, so a group post threads under its author, not the
    /// group — the app's own local rows thread per chat, SPushService.cs; the difference is the
    /// #919 dial, iO.11c) and, ONLY when the user opted in, the sender's name as the title.
    ///
    /// Fail-open, like every reader of the mute on Android: a store that is missing, stale,
    /// unparsable or written by a newer app shows the push as OneSignal sent it (text and
    /// sound untouched; only the per-sender thread id is still applied) — and there is
    /// NO store at all until the app's first mute/master/name toggle or its first OnSleep. A
    /// lost message is worse than an unwanted buzz. Nothing here logs an address.
    /// </summary>
    [JsonSerializable(typeof(SpixiPushGate.Store))]
    internal partial class SpixiPushStoreContext : JsonSerializerContext { }

    public static class SpixiPushGate
    {
        /// The App Group both bundles are entitled to. ⚠ Pinned equal to the app's
        /// Entitlements.plist, the extension's Entitlements.plist and SPushPrefsShare.APP_GROUP.
        public const string APP_GROUP = "group.com.ixilabs.spixi";
        /// The file name inside the group container. ⚠ Pinned equal to SPushPrefsShare.FILE_NAME.
        public const string FILE_NAME = "spixi-push.json";
        /// The store's schema version. A store with a HIGHER version is treated as absent.
        public const int SCHEMA = 1;

        public enum Action
        {
            /// Rewrite to empty content and deliver without OneSignal (a muted push earns no receipt).
            Suppress,
            /// Deliver through OneSignal, with the thread id and (opt-in) the name applied first.
            Show,
        }

        public readonly struct Verdict
        {
            public readonly Action action;
            /// The title to set, or null to keep OneSignal's.
            public readonly string? senderName;
            /// The thread identifier to set, or null to leave it.
            public readonly string? thread;
            public Verdict(Action action, string? senderName, string? thread)
            {
                this.action = action; this.senderName = senderName; this.thread = thread;
            }
        }

        /// The shared store, as the app writes it. Unknown fields are ignored; missing fields
        /// take the same defaults the app's own preferences take (master ON, name OFF).
        public sealed class Store
        {
            public int v { get; set; } = 0;
            public bool enabled { get; set; } = true;
            public bool senderName { get; set; } = false;
            public List<string> muted { get; set; } = new List<string>();
            public Dictionary<string, string> nicks { get; set; } = new Dictionary<string, string>();
        }

        /// <summary>The path of the shared file, or null when the container is not available
        /// (no App Group entitlement on this binary — the pre-#919 state — or a sandbox that
        /// refused it). Never throws.</summary>
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

        /// <summary>Loads the store. Null when it is absent, unreadable, unparsable, or newer
        /// than this reader — every one of those is the fail-open case. Never throws.</summary>
        public static Store? load()
        {
            try
            {
                string? path = storePath();
                if (path == null || !File.Exists(path)) return null;
                return parse(File.ReadAllText(path));
            }
            catch (Exception)
            {
                return null;
            }
        }

        /// <summary>The parse on its own, so a test can feed it text. Never throws.</summary>
        public static Store? parse(string? json)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(json)) return null;
                // source-generated: reflection JSON is IL2026 under iOS trimming, and this project
                // treats warnings as errors
                Store? s = JsonSerializer.Deserialize(json, SpixiPushStoreContext.Default.Store);
                if (s == null || s.v > SCHEMA) return null;
                s.muted ??= new List<string>();
                s.nicks ??= new Dictionary<string, string>();
                return s;
            }
            catch (Exception)
            {
                return null;
            }
        }

        /// <summary>
        /// The sender address OneSignal carried as additional data. The iOS payload nests it
        /// as <c>custom → a → fa</c>; a flat top-level <c>fa</c> is accepted too. Empty when
        /// absent or unreadable — an unattributable push is SHOWN (see <see cref="decide"/>).
        /// Never throws.
        /// </summary>
        public static string? readFa(NSDictionary? userInfo)
        {
            try
            {
                if (userInfo == null) return null;
                /* `out var`: the binding declares the out parameter `NSObject?` on current workloads and
                   `NSObject` on older ones — a spelled type is CS8600 on one of them, and this project
                   treats warnings as errors (#46 reviewer MAJOR-1) */
                if (userInfo.TryGetValue(new NSString("custom"), out var custom) && custom is NSDictionary customDict
                    && customDict.TryGetValue(new NSString("a"), out var a) && a is NSDictionary aDict
                    && aDict.TryGetValue(new NSString("fa"), out var faNested))
                {
                    string? nested = faNested?.ToString();
                    if (!string.IsNullOrEmpty(nested)) return nested;
                }
                if (userInfo.TryGetValue(new NSString("fa"), out var faFlat))
                {
                    string? flat = faFlat?.ToString();
                    if (!string.IsNullOrEmpty(flat)) return flat;
                }
                return null;
            }
            catch (Exception)
            {
                return null;
            }
        }

        /// <summary>
        /// The decision, mirroring <c>SNotificationPrefs.shouldDisplayRawPush</c> as far as a
        /// separate process can: the global master first; no address → show; a muted 1:1 →
        /// suppress; everything else → show. The app writes ONLY genuine 1:1 contacts into
        /// <c>muted</c>, so the extension needs no notion of "group" at all.
        /// ⚠ THE KNOWN LIMIT, stated so nobody reads more into the filter (#46 reviewers B-3/C-3):
        /// a GROUP push carries the SENDER's address in <c>fa</c>, and the payload carries no
        /// chat address. So a muted 1:1 contact's messages in a GROUP are silenced too, and a
        /// muted GROUP is not silenced at all — the extension cannot tell the two apart. That is
        /// the same answer Android's cold lane gives (<c>decideFromAddress</c> → the sender's 1:1
        /// record), now on every iOS background push; the honest fix is a chat address in the
        /// payload (BE row). Damir's dial: this, or the master switch only. Pure and never
        /// throws: a test can call it with any store.
        /// </summary>
        public static Verdict decide(Store? store, string? fa)
        {
            try
            {
                if (store == null) return new Verdict(Action.Show, null, fa);
                if (!store.enabled) return new Verdict(Action.Suppress, null, null);
                if (string.IsNullOrEmpty(fa)) return new Verdict(Action.Show, null, null);
                if (store.muted != null && store.muted.Contains(fa)) return new Verdict(Action.Suppress, null, null);
                string? name = null;
                if (store.senderName && store.nicks != null && store.nicks.TryGetValue(fa, out string? nick) && !string.IsNullOrEmpty(nick))
                {
                    name = nick;
                }
                return new Verdict(Action.Show, name, fa);
            }
            catch (Exception)
            {
                return new Verdict(Action.Show, null, fa);
            }
        }

        /// <summary>
        /// The mute rewrite: ALL of title, subtitle, body and sound emptied, the badge left
        /// unchanged (a null badge is "do not touch the app badge"), and the interruption
        /// level dropped to passive with zero relevance — if iOS shows the emptied row at all,
        /// it must not break through Focus or sort above real rows (#46 reviewer MINOR-9).
        /// ⚠ Pinned: the pin requires every one of the named fields, because a rewrite that
        /// forgets one shows that one. ⚠ <c>Passive2</c>, not <c>Passive</c>: the binding's
        /// original members carried wrong raw values and are [Obsolete] — CS0618 is an error here.
        /// </summary>
        public static void empty(UNMutableNotificationContent content)
        {
            content.Title = string.Empty;
            content.Subtitle = string.Empty;
            content.Body = string.Empty;
            content.Sound = null;
            content.Badge = null;
            try { content.InterruptionLevel = UNNotificationInterruptionLevel.Passive2; content.RelevanceScore = 0; } catch (Exception) { /* pre-15 runtime: the fields do not exist; the text is already gone */ }
        }

        /// <summary>ONE fixed-vocabulary line per push to the system log (the extension has no
        /// Logging): whether a store was read, whether the push carried an address, and the
        /// verdict — so the office test can tell fail-open from Show-by-design. Never the
        /// address, never a name, never throws.</summary>
        public static void trace(bool storeRead, string? fa, Verdict verdict)
        {
            try
            {
                Console.WriteLine("[SPUSH] store=" + (storeRead ? "ok" : "none") + " fa=" + (string.IsNullOrEmpty(fa) ? "none" : "present")
                    + " verdict=" + verdict.action + " name=" + (string.IsNullOrEmpty(verdict.senderName) ? "no" : "yes"));
            }
            catch (Exception) { }
        }

        /// <summary>Applies a Show verdict's thread and name to the content. Never throws.</summary>
        public static void apply(UNMutableNotificationContent content, Verdict verdict)
        {
            try
            {
                if (!string.IsNullOrEmpty(verdict.thread)) content.ThreadIdentifier = verdict.thread;
                if (!string.IsNullOrEmpty(verdict.senderName)) content.Title = verdict.senderName;
            }
            catch (Exception)
            {
                // a failed decoration leaves OneSignal's own content — the fail-open side
            }
        }
    }
}
