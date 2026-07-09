using Microsoft.Maui.ApplicationModel;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Graphics;
using Microsoft.Maui.Storage;
using SPIXI.Lang;

namespace SPIXI
{
    public enum ThemeAppearance
    {
        automatic = 0,
        light = 1,
        dark = 2
    }

    public static class ThemeManager
    {
        private static ThemeAppearance activeAppearance = ThemeAppearance.automatic;
        private static string activeTheme = "spixiui";

        public static bool loadTheme(string name, ThemeAppearance appearance)
        {
            string appearance_name = appearance switch
            {
                ThemeAppearance.dark => "dark",
                ThemeAppearance.automatic => Application.Current!.UserAppTheme == AppTheme.Dark ? "dark" : "light",
                _ => "light"
            };

            activeTheme = name;
            activeAppearance = appearance;

            Preferences.Default.Set("appearance", (int)activeAppearance);
            SpixiLocalization.addCustomString("SpixiThemeName", appearance_name);
            SpixiLocalization.addCustomString("SpixiThemeMode", name + "-" + appearance_name + ".css");

            return true;
        }

        public static bool changeAppearance(ThemeAppearance newAppearance)
        {
            return loadTheme(activeTheme, newAppearance);
        }

        public static ThemeAppearance getActiveAppearance()
        {
            return activeAppearance;
        }

        // Temporary function to handle Android appearance changes. Will be removed in the future
        public static string getActiveAppearanceString()
        {
            if (activeAppearance == ThemeAppearance.dark)
            {
                return "spixiui-dark";
            }
            else if (activeAppearance == ThemeAppearance.automatic)
            {
                if (Application.Current.UserAppTheme == AppTheme.Dark)
                    return "spixiui-dark";
            }

            return "spixiui-light";
        }


        public static string getBackgroundColorString()
        {
            if (getActiveAppearanceString() == "spixiui-light")
                return "#223766";
            return "#0B1219";
        }

        public static Color getBackgroundColor()
        {
            return Color.FromArgb(getBackgroundColorString());
        }

        // Redesigned-shell SCREEN SURFACE (N1/N3 flicker fix). MUST match the shells'
        // instant-bg (src/shells/*: html{background:#f9fafb} / [data-theme=dark]{#13171b},
        // mirroring --surface-screen = neutral-10 / neutral-900) so the native frame shown
        // before the WebView paints is indistinguishable from the shell that follows.
        // THEME-AWARE by requirement: a hardcoded dark value breaks light mode (the
        // reported light-mode dark flash). getBackgroundColor() above keeps the LEGACY
        // launch-blue values for the remaining legacy call sites (WalletSentPage,
        // Android edge-to-edge); do not repoint those here.
        // The ACTIVE appearance resolved to the shell theme name ("light"/"dark") —
        // the single C#-side truth handed to the WebViews (the *SL{SpixiThemeName}
        // boot substitution and the live "setTheme" push). Shells must NOT re-derive
        // "auto" from matchMedia — the WebView's prefers-color-scheme can disagree
        // with the app theme (Damir F5: Account read light while the app was dark).
        public static string getResolvedAppearanceName()
        {
            return getActiveAppearanceString() == "spixiui-light" ? "light" : "dark";
        }

        public static string getSurfaceColorString()
        {
            if (getResolvedAppearanceName() == "light")
                return "#f9fafb";
            return "#13171b";
        }

        public static Color getSurfaceColor()
        {
            return Color.FromArgb(getSurfaceColorString());
        }

    }
}
