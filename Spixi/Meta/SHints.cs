using IXICore.Meta;
using System;

namespace SPIXI.Meta
{
    /// <summary>
    /// ★ S11 A (#1262, Damir: "a C#-side store") — THE CHATS-LIST HINT COUNTERS. Four values in the backup-excluded
    /// local-only file (<see cref="SLocalOnlyStore"/>, key prefix <c>hints.</c>): firstSeen (ms, the first HomePage load
    /// on this install — written there where missing), lastShown (ms), the done tip ids, the off switch.
    /// C# only STORES; the home shell decides which tip shows (glass-card.js pickHint) from the <c>setHints</c> push.
    ///
    /// Never a <c>spixi.*</c> WebView key (the mini-app partition hazard, #383). The ids written are
    /// <see cref="S11HintRules.TipIds"/> constants only (the verb is validated first, S11HintRules.parseVerb). Wiped with
    /// the account: the keys live in the SAME file, so <c>SLocalOnlyStore.clearAll()</c> (SettingsPage's wipe line)
    /// deletes them — nothing to add there. Writes ride <c>setDeferred</c> (the verbs arrive on the UI thread; one
    /// background write coalesces a burst). Lines carry exception TYPES only. Never throws.
    /// </summary>
    public static class SHints
    {
        public const string KeyFirstSeen = "hints.firstSeen";
        public const string KeyLastShown = "hints.lastShown";
        public const string KeyDone = "hints.done";
        public const string KeyOff = "hints.off";

        /// <summary>The clock the hints run on (Unix ms, the shell's Date.now() scale). Settable for the C# harness only.</summary>
        public static Func<long> nowMs = () => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        /// <summary>firstSeen, written now where it is missing (or in the future — S11HintRules.firstSeenFix).</summary>
        public static long ensureFirstSeen(long now)
        {
            try
            {
                long stored = S11HintRules.parseMs(SLocalOnlyStore.get(KeyFirstSeen));
                long v = S11HintRules.firstSeenFix(stored, now);
                if (v != stored)
                {
                    SLocalOnlyStore.setDeferred(KeyFirstSeen, S11HintRules.formatMs(v));
                }
                return v;
            }
            catch (Exception e)
            {
                Logging.warn("SHints: firstSeen failed (" + e.GetType().Name + ")");
                return now;
            }
        }

        public static long lastShown(long now) => S11HintRules.lastShownFix(S11HintRules.parseMs(SLocalOnlyStore.get(KeyLastShown)), now);

        public static bool off
        {
            get { return string.Equals(SLocalOnlyStore.get(KeyOff), "1", StringComparison.Ordinal); }
            set { SLocalOnlyStore.setDeferred(KeyOff, value ? "1" : null); }
        }

        /// <summary>`ixian:hint:shown:&lt;id&gt;` — a tip went on screen now.</summary>
        public static void markShown(long now)
        {
            try { SLocalOnlyStore.setDeferred(KeyLastShown, S11HintRules.formatMs(now)); }
            catch (Exception e) { Logging.warn("SHints: shown failed (" + e.GetType().Name + ")"); }
        }

        /// <summary>`ixian:hint:done:&lt;id&gt;` — × or Learn more: that tip never comes back. A non-whitelisted id writes nothing.</summary>
        public static void markDone(string id)
        {
            if (!S11HintRules.isTipId(id)) return;
            try { SLocalOnlyStore.setDeferred(KeyDone, S11HintRules.addDone(SLocalOnlyStore.get(KeyDone), id)); }
            catch (Exception e) { Logging.warn("SHints: done failed (" + e.GetType().Name + ")"); }
        }

        /// <summary>The <c>setHints</c> push value (S11HintRules.pushJson) — firstSeen is ensured on the way.</summary>
        public static string pushJson(long now)
        {
            return S11HintRules.pushJson(ensureFirstSeen(now), lastShown(now), S11HintRules.parseDone(SLocalOnlyStore.get(KeyDone)), off, now);
        }
    }
}
