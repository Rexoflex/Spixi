using IXICore.Meta;
using System;

namespace SPIXI.Meta
{
    /// <summary>
    /// ★ SND-1 / SND-2 / SND-3 (Damir's 2026-08-21 block) — in-app sound effects.
    ///
    /// STATE BEFORE THIS: the app played exactly FOUR sounds, all call-related
    /// (default_ringtone / dialing_tone / busy_tone / error_tone in
    /// Spixi/Resources/Raw/sounds/). Nothing else in the app made a sound, and
    /// `SSystemAlert.flash()` — which `Node.cs` calls on EVERY received message — is an
    /// empty method body on every platform.
    ///
    /// ⚠ VERIFY-FIRST CORRECTION to the brief: it says to add "one generic verb on
    /// `Spixi/Interfaces/IPlatformUtils.cs:20-24`". That interface is DEAD CODE — nothing
    /// implements it and nothing consumes it (one grep: the only hit is its own
    /// declaration). The real binding is a per-platform STATIC `SPlatformUtils` class
    /// selected by the Platforms/ folder convention, so the verb is added there, four
    /// times, and this class is the single caller.
    ///
    /// ★ NO SOUND ASSETS ARE INVENTED HERE. Damir picks them; the brief says so
    /// explicitly. What ships is the plumbing, the settings switch and the call sites,
    /// all fail-soft: `playEffect` on a file that does not exist logs at debug level and
    /// returns. So the app is silent today and becomes audible the moment the four files
    /// are dropped into Spixi/Resources/Raw/sounds/ — no code change.
    ///
    /// THE FILE CONTRACT (drop these in, nothing else to do):
    ///   sounds/message_sent.mp3      — SND-1, an outgoing chat message
    ///   sounds/message_received.mp3  — SND-1, an incoming chat message
    ///   sounds/tx_sent.mp3           — SND-2, an outgoing payment
    ///   sounds/tx_received.mp3       — SND-2, an incoming payment
    ///
    /// SND-3 (a desktop-specific off switch) is the same `inAppSounds` preference: it is
    /// per-device by construction, because MAUI Preferences are per-install. The switch
    /// is on the Notifications screen on every platform.
    /// </summary>
    public static class SSounds
    {
        public const string MessageSent = "sounds/message_sent.mp3";
        public const string MessageReceived = "sounds/message_received.mp3";
        public const string TxSent = "sounds/tx_sent.mp3";
        public const string TxReceived = "sounds/tx_received.mp3";

        /// <summary>
        /// Play a one-shot effect, if in-app sounds are on and the asset exists.
        /// Never throws: a sound is decoration, and it must not be able to take down the
        /// message-receive path it is called from.
        /// </summary>
        public static void play(string assetPath)
        {
            try
            {
                if (!SNotificationPrefs.inAppSounds)
                {
                    return;
                }
                Spixi.SPlatformUtils.playEffect(assetPath);
            }
            catch (Exception e)
            {
                /* ⚠ 2026-08-22: was `Logging.trace`, which the shipped app DROPS —
                 * Config.logVerbosity is info|warn|error = 14 and trace = 1, so `14 & 1 == 0`
                 * (Ixian-Core Logging.cs:191). A failure here was therefore invisible. The
                 * platform layer memoises a missing asset and reports it once; anything that
                 * reaches THIS catch is a real fault and is worth a warn every time. */
                Logging.warn("SSounds.play(" + assetPath + ") failed: " + e);
            }
        }

        public static void messageSent() { play(MessageSent); }
        public static void messageReceived() { play(MessageReceived); }
        public static void transactionSent() { play(TxSent); }
        public static void transactionReceived() { play(TxReceived); }
    }
}
