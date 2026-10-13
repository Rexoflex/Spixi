/* ★ DT-1 B (Damir 2026-10-12, Q1 "Spixi" only) — the Windows title bar in the TOKEN colours, light and dark, re-applied on
 * every theme change; no search box (the list keeps its own search field). Pure rules, compiled and executed in the C#
 * harness (scripts/csh); the Windows-only half lives in Platforms/Windows/DtTitleBar.cs.
 *
 * TWO WAYS, ONE SWITCH (#1312 rule 1: the old path stays the fallback). The DT-1 STOP RULE says a spike on Damir's PC
 * decides between them — drag, double-click to maximise, maximise / restore, Snap, the resize band (#1272), the 384 DIP
 * minimum, a live theme switch. So the way is a dev-mode switch (Developer › Title bar, `ixian:devflash:titlebar:<word>`),
 * read ONCE at start like every SpixiFlags switch:
 *   maui   (the default) — way 1: MAUI Window.TitleBar with the title "Spixi", its colours from the tokens;
 *   colors               — way 2: the system bar with only its colours set (AppWindow.TitleBar background / foreground /
 *                          inactive / caption buttons): AppWindow.TitleBar.ExtendsContentIntoTitleBar = false (the
 *                          object MAUI set to true) AND MAUI's own 32-DIP band collapsed (a hidden Window.TitleBar) — else
 *                          the caption would draw twice (#46 r1 B MAJOR-1, traced in the MAUI 10.0.71 source);
 *   off                  — today: MAUI's default bar, the caption "Spixi IM", system colours.
 * A stored non-default way acts ONLY while dev mode is on (the S11ChatRules.containerMode precedent): a user who leaves
 * dev mode gets the default back. The pick that passes the spike becomes the default in a follow-up row.
 * WINDOWS 10 (#46 r1 B MINOR-2): the caption colours are ignored there (WinAppSDK docs), so a token-coloured band would carry
 * OS-theme glyphs (light on light when the app and the OS disagree) — any way acts as `off` below build 22000.
 *
 * THE COLOURS are tokens.css values, resolved (the shells' --surface-screen ground, the topbar ink): a smoke pin
 * (scripts/pins-dt1/b-titlebar.mjs) resolves each token chain in light and dark and fails if a constant here drifts —
 * the railWidthDip precedent (HomePage.xaml.cs). Never paint the window ROOT (#1276: pins-s12/d-ground.mjs). */
namespace SPIXI
{
    public static class DtTitleBarRules
    {
        public const string PrefKey = "devTitleBarWay";   // int pref; absent = Maui. Dev mode only (see wayThatActs)

        public const int WayOff = 0;
        public const int WayMaui = 1;
        public const int WayColors = 2;

        /** Q1 (Damir 2026-10-12): the bar says "Spixi" — the logo is already in the rail. `off` keeps today's caption. */
        public const string Title = "Spixi";
        public const string LegacyTitle = "Spixi IM";

        /* tokens.css, resolved (light / dark) — pins-dt1/b-titlebar.mjs pairs every constant with its token */
        public const string LightBg = "#F9FAFB";          // --surface-screen
        public const string LightFg = "#131415";          // --text-neutral-01 (the title + the caption glyphs)
        public const string LightFgInactive = "#4F5664";  // --text-neutral-02 (a window without focus)
        public const string LightHoverBg = "#EDF0F2";     // --surface-interactive-hover (a caption button under the pointer)
        public const string LightPressedBg = "#E8ECEE";   // --surface-interactive-pressed
        public const string DarkBg = "#0F1113";
        public const string DarkFg = "#E8ECEE";
        public const string DarkFgInactive = "#BBBEC4";
        public const string DarkHoverBg = "#1A1C1F";
        public const string DarkPressedBg = "#232528";

        public readonly struct Palette
        {
            public readonly string Bg, Fg, FgInactive, HoverBg, PressedBg;
            public Palette(string bg, string fg, string fgInactive, string hoverBg, string pressedBg)
            {
                Bg = bg; Fg = fg; FgInactive = fgInactive; HoverBg = hoverBg; PressedBg = pressedBg;
            }
        }

        public static Palette paletteFor(bool dark)
        {
            return dark
                ? new Palette(DarkBg, DarkFg, DarkFgInactive, DarkHoverBg, DarkPressedBg)
                : new Palette(LightBg, LightFg, LightFgInactive, LightHoverBg, LightPressedBg);
        }

        /** `ixian:devflash:titlebar:<off|maui|colors>` — the tail must be one of the three words exactly. */
        public static bool parseWayVerb(string? tail, out int way)
        {
            way = WayMaui;
            switch (tail)
            {
                case "off": way = WayOff; return true;
                case "maui": way = WayMaui; return true;
                case "colors": way = WayColors; return true;
                default: return false;
            }
        }

        /** The way that ACTS this run: the default unless dev mode is on and a known non-default way is stored. */
        public static int wayThatActs(bool devMode, int stored)
        {
            if (!devMode) return WayMaui;
            return stored == WayOff || stored == WayColors ? stored : WayMaui;
        }

        /** The way that is PAINTED on this OS: Windows 10 (build < 22000) ignores the caption colours → `off`. */
        public const int Windows11Build = 22000;
        public static int effectiveWay(int way, int osBuild)
        {
            return osBuild < Windows11Build ? WayOff : way;
        }

        /** Way 2 collapses MAUI's own title band (a hidden Window.TitleBar) and stops extending the content. */
        public static bool systemBar(int way)
        {
            return way == WayColors;
        }

        public const string Transparent = "transparent";

        /** The AppWindow.TitleBar colours to set, in order: (property, "#RRGGBB" | "transparent"). `off` sets nothing.
         *  Way 1: the MAUI bar paints the ground, so the caption buttons stay see-through over it; way 2: the system bar,
         *  so the bar, its inactive state and the buttons get the ground. Both: the caption glyph inks + hover / pressed. */
        public static (string prop, string value)[] captionColours(int way, bool dark)
        {
            if (way != WayMaui && way != WayColors) return new (string, string)[0];
            Palette p = paletteFor(dark);
            var list = new System.Collections.Generic.List<(string, string)>();
            if (way == WayColors)
            {
                list.Add(("BackgroundColor", p.Bg));
                list.Add(("ForegroundColor", p.Fg));
                list.Add(("InactiveBackgroundColor", p.Bg));
                list.Add(("InactiveForegroundColor", p.FgInactive));
                list.Add(("ButtonBackgroundColor", p.Bg));
                list.Add(("ButtonInactiveBackgroundColor", p.Bg));
            }
            else
            {
                list.Add(("ButtonBackgroundColor", Transparent));
                list.Add(("ButtonInactiveBackgroundColor", Transparent));
            }
            list.Add(("ButtonForegroundColor", p.Fg));
            list.Add(("ButtonInactiveForegroundColor", p.FgInactive));
            list.Add(("ButtonHoverBackgroundColor", p.HoverBg));
            list.Add(("ButtonHoverForegroundColor", p.Fg));
            list.Add(("ButtonPressedBackgroundColor", p.PressedBg));
            list.Add(("ButtonPressedForegroundColor", p.Fg));
            return list.ToArray();
        }

        public static string wayWord(int way)
        {
            return way == WayOff ? "off" : way == WayColors ? "colors" : "maui";
        }

        public static string titleFor(int way)
        {
            return way == WayOff ? LegacyTitle : Title;
        }

        /** "#RRGGBB" → (r, g, b); false for anything else (the constants above are the only callers). */
        public static bool parseHex(string? hex, out byte r, out byte g, out byte b)
        {
            r = g = b = 0;
            if (hex == null || hex.Length != 7 || hex[0] != '#') return false;
            try
            {
                r = System.Convert.ToByte(hex.Substring(1, 2), 16);
                g = System.Convert.ToByte(hex.Substring(3, 2), 16);
                b = System.Convert.ToByte(hex.Substring(5, 2), 16);
                return true;
            }
            catch (System.Exception)
            {
                r = g = b = 0;
                return false;
            }
        }

        /** The one log line per apply — fixed words and the way number only (a log line is a gate trigger:
         *  docs/security-handover-gate.md, the DT-1 row). */
        public static string applyLine(int way, bool dark, bool customizable)
        {
            return "[DT] titlebar way=" + wayWord(way) + " theme=" + (dark ? "dark" : "light") + " custom=" + (customizable ? "1" : "0");
        }

        public static string flagLine(int way)
        {
            return "[FLAGS] dttitlebar=" + wayWord(way);
        }
    }
}
