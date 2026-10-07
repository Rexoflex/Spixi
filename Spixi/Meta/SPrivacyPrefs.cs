using IXICore.Meta;
using Microsoft.Maui.Storage;
using System;

namespace SPIXI.Meta
{
    /// <summary>
    /// ★ S8 (#1234): the three Account → Privacy switches — the SChatPrefs.photoPreviews shape (SChatPrefs.cs:30–60): a
    /// FIXED app-preference key per switch (no address, no content), a plain bool, a Preferences failure logged by TYPE
    /// and answered with the default, never a throw. Verbs `ixian:readReceipts|typingIndicators|hideOnline:on|off`
    /// (SettingsPage: store, then echo the stored value). The rules that read them: PrivacyRules.
    /// A file of its own (not inside SChatPrefs) so PresenceDisplay — compiled by scripts/csh — can read hideOnline
    /// without pulling SChatPrefs' FriendList walk into the harness.
    /// </summary>
    public static class SPrivacyPrefs
    {
        private const string KEY_READ_RECEIPTS = "privacyReadReceipts";
        private const string KEY_TYPING = "privacyTypingIndicators";
        private const string KEY_HIDE_ONLINE = "privacyHideOnline";

        /** Default TRUE: send read receipts (and see the peer's). */
        public static bool readReceipts
        {
            get { return getBool(KEY_READ_RECEIPTS, true); }
            set { setBool(KEY_READ_RECEIPTS, value); }
        }

        /** Default TRUE: send typing (and see the peer's). */
        public static bool typingIndicators
        {
            get { return getBool(KEY_TYPING, true); }
            set { setBool(KEY_TYPING, value); }
        }

        /** Default FALSE: announce spixi.presence-hidden.1 (and see nobody's online dot / last seen). */
        public static bool hideOnline
        {
            get { return getBool(KEY_HIDE_ONLINE, false); }
            set { setBool(KEY_HIDE_ONLINE, value); }
        }

        private static bool getBool(string key, bool def)
        {
            try
            {
                return Preferences.Default.Get(key, def);
            }
            catch (Exception e)
            {
                Logging.error("SPrivacyPrefs get failed: " + e.GetType().Name);
                return def;
            }
        }

        private static void setBool(string key, bool value)
        {
            try
            {
                Preferences.Default.Set(key, value);
            }
            catch (Exception e)
            {
                Logging.error("SPrivacyPrefs set failed: " + e.GetType().Name);
            }
        }
    }
}
