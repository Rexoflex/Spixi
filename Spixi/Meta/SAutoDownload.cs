using IXICore.Meta;
using Microsoft.Maui.Storage;
using System;

namespace SPIXI.Meta
{
    /// <summary>
    /// ★ S11 C (#1262, Damir: Settings › Privacy, default OFF): the photo AUTO-DOWNLOAD setting and the C# mirror of
    /// "Load pictures and GIFs" (the chat shell's FE-only `spixi.media.autoload`; the Settings shell sends its current
    /// value with every `ixian:photoAutoDl:` verb and again whenever that switch flips, so C# never auto-downloads
    /// while the user has pictures off). Two FIXED keys, no address, no content (the standing gate rule). The
    /// SChatPrefs shape: a Preferences failure is logged by TYPE and falls back to the default (OFF / on), never
    /// throws into the offer path. Cleared by the account wipe (Preferences.Default.Clear). The decision itself is
    /// S11ChatRules.shouldAutoDownload.
    /// </summary>
    public static class SAutoDownload
    {
        private const string KEY_SETTING = "photoAutoDownload";       // "off" | "wifi" | "always" (absent = off)
        private const string KEY_LOAD_PICTURES = "photoAutoDlLoadPictures";   // the mirror (absent = on, the chat default)

        public static string setting
        {
            get
            {
                try
                {
                    return S11ChatRules.normalizeAutoDownload(Preferences.Default.Get(KEY_SETTING, S11ChatRules.AutoOff));
                }
                catch (Exception e)
                {
                    Logging.error("SAutoDownload.setting get failed: " + e.GetType().Name);
                    return S11ChatRules.AutoOff;
                }
            }
            set
            {
                try
                {
                    Preferences.Default.Set(KEY_SETTING, S11ChatRules.normalizeAutoDownload(value));
                }
                catch (Exception e)
                {
                    Logging.error("SAutoDownload.setting set failed: " + e.GetType().Name);
                }
            }
        }

        public static bool loadPictures
        {
            get
            {
                try
                {
                    return Preferences.Default.Get(KEY_LOAD_PICTURES, true);
                }
                catch (Exception e)
                {
                    Logging.error("SAutoDownload.loadPictures get failed: " + e.GetType().Name);
                    return true;
                }
            }
            set
            {
                try
                {
                    Preferences.Default.Set(KEY_LOAD_PICTURES, value);
                }
                catch (Exception e)
                {
                    Logging.error("SAutoDownload.loadPictures set failed: " + e.GetType().Name);
                }
            }
        }
    }
}
