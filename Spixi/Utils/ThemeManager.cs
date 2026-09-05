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

        // ★ N66 (#385) — the OS theme, resolved. "automatic" means FOLLOW THE OS,
        // so it must NOT be read off UserAppTheme: App.xaml.cs now keeps that
        // Unspecified for the whole session (a concrete value freezes
        // Application.RequestedTheme, and MAUI then never raises
        // RequestedThemeChanged — that is what killed the OS-follow path). With
        // UserAppTheme Unspecified, RequestedTheme IS the platform theme; reading it
        // also stays correct if a later change ever pins UserAppTheme again.
        // Unspecified (very early boot, before the platform reports) reads as light,
        // exactly as the old code did — the boot theme event corrects it.
        private static bool isPlatformDark()
        {
            return Application.Current?.RequestedTheme == AppTheme.Dark;
        }

        public static bool loadTheme(string name, ThemeAppearance appearance)
        {
            string appearance_name = appearance switch
            {
                ThemeAppearance.dark => "dark",
                ThemeAppearance.automatic => isPlatformDark() ? "dark" : "light",
                _ => "light"
            };

            activeTheme = name;
            activeAppearance = appearance;

            Preferences.Default.Set("appearance", (int)activeAppearance);
            SpixiLocalization.addCustomString("SpixiThemeName", appearance_name);
            // ★ Session N (legacy purge): the second carrier, SpixiThemeMode
            // ("<theme>-<appearance>.css"), is GONE. Its only consumers were the four
            // legacy documents' `<link href="css/*SL{SpixiThemeMode}">`, deleted with
            // css/. SpixiThemeName stays — ten redesigned shells read it.

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
                if (isPlatformDark())
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
        // launch-blue values for the remaining legacy call sites (WalletSentPage;
        // Android edge-to-edge REPOINTED to getSurfaceColorString at #334 AND-6);
        // do not repoint the legacy sites here.
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

        /* ★ AND-7b (#407, Damir F5 2026-08-19): the WALLET HERO surface — the colour the
         * home shell actually paints under the status bar while the Wallet tab is open.
         * Mirrors tokens.css --surface-hero: --primary-600 (#3050bd) in light,
         * --primary-800 (#192853) in dark. Both are dark enough to demand LIGHT bar
         * glyphs, which is the rule Damir set: the wallet and the launch flow always
         * carry white glyphs, every other screen follows the app theme.
         * The hero also paints --gradient-hero-overlay on top, which only darkens it —
         * so this base value can never flip the luminance decision the wrong way. */
        public static string getHeroColorString()
        {
            if (getResolvedAppearanceName() == "light")
                return "#3050bd";
            return "#192853";
        }

    }
}
