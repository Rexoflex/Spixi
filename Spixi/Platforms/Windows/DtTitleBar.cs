/* ★ #1392 (WALK DT-1 #1391, Damir 2026-10-13: "Windows look"): the DEFAULT way is `off` — this file then only sets
 * window.Title = "Spixi" (onCreateWindow); attach() keeps the AppWindow and extends nothing, apply() returns at once. The
 * token-coloured ways below (maui · colors) FAILED the walk and act only as dev-mode experiments (Developer › Title bar).
 * ★ DT-1 B (Damir 2026-10-12, Q1 "Spixi" only) — the Windows title bar in the TOKEN colours, light and dark. Windows only
 * (this folder compiles for net10.0-windows only). The rules (the way switch, the title, the palette, the caption colour
 * list, the Windows 10 fallback, the log line) are in Utils/DtTitleBarRules.cs and run in the C# harness; this file only puts
 * them on the window.
 *
 * Hooks, each a no-op when its part is missing:
 *   · onCreateWindow(window)  — App.CreateWindow: the title for the way; way 1 sets MAUI's Window.TitleBar ("Spixi"); way 2
 *                               sets a Window.TitleBar that HIDES itself once its handler exists, to collapse MAUI's own
 *                               32-DIP band (MAUI decides the band from the content extension BEFORE the handler maps —
 *                               NavigationRootManager — so un-extending alone leaves the band: #46 r1 B MAJOR-1; the hide only
 *                               acts with a handler: #46 r2 M-1). Way 2 is UNVERIFIED on a device — the spike decides.
 *   · attach(appWindow, xamlWindow) — the Windows window mapper (App.xaml.cs): keeps the AppWindow and the window's
 *                               dispatcher; way 2 sets AppWindow.TitleBar.ExtendsContentIntoTitleBar = false (the object MAUI
 *                               set to true in MauiWinUIWindow's constructor) so the system bar and its colours show; and it
 *                               re-applies on every UISettings colour change (MAUI resets the caption buttons there: #46 r1 B
 *                               MINOR-1 — our handler is subscribed after MAUI's, so its queued apply runs after MAUI's reset).
 *   · apply()                 — ThemeManager.loadTheme (boot, every pick, every OS flip under System) and the hooks above: the
 *                               colours for the RESOLVED app theme (ThemeManager.getResolvedAppearanceName).
 * Never paints the window ROOT (#1276; pins-s12/d-ground.mjs). Never throws: a failure logs its exception TYPE only.
 * The way is read ONCE per start (SpixiFlags.init → DtTitleBarRules.wayThatActs); Windows 10 paints `off`
 * (DtTitleBarRules.effectiveWay). Developer › Title bar changes the stored way, which acts at the NEXT start. */
using IXICore.Meta;
using Microsoft.Maui.ApplicationModel;
using Microsoft.UI.Windowing;
using System;

namespace SPIXI
{
    public static class DtTitleBar
    {
        private static AppWindow? appWindow = null;
        private static Microsoft.UI.Dispatching.DispatcherQueue? dispatcher = null;
        private static Microsoft.Maui.Controls.TitleBar? mauiBar = null;
        private static Windows.UI.ViewManagement.UISettings? uiSettings = null;   // held: an unreferenced UISettings stops raising

        private static int way()
        {
            return DtTitleBarRules.effectiveWay(SpixiFlags.DtTitleBarWay, Environment.OSVersion.Version.Build);
        }

        public static void onCreateWindow(Microsoft.Maui.Controls.Window window)
        {
            try
            {
                int w = way();
                window.Title = DtTitleBarRules.titleFor(w);
                if (w == DtTitleBarRules.WayMaui)
                {
                    var bar = new Microsoft.Maui.Controls.TitleBar();
                    bar.Title = DtTitleBarRules.Title;
                    bar.HeightRequest = 32;   // today's caption height: the WebViews below do not move
                    mauiBar = bar;
                    window.TitleBar = bar;
                }
                else if (DtTitleBarRules.systemBar(w))
                {
                    /* way 2: MAUI collapses its own 32-DIP band ONLY from TitleBar.OnIsVisibleChanged, which needs the bar's
                     * handler (it calls the window's NavigationRootManager.SetTitleBarVisibility) — #46 r2 M-1: an
                     * IsVisible = false set here, before the handler exists, is dropped. So the bar is created visible and
                     * hidden once its handler is attached. UNVERIFIED on a device: the spike row DT-TB-W2 decides. */
                    var hidden = new Microsoft.Maui.Controls.TitleBar();
                    hidden.HandlerChanged += (s, e) =>
                    {
                        try
                        {
                            if (hidden.Handler != null && hidden.IsVisible)
                            {
                                hidden.IsVisible = false;
                            }
                        }
                        catch (Exception ex)
                        {
                            Logging.warn("[DT] titlebar hide failed: " + ex.GetType().Name);
                        }
                    };
                    window.TitleBar = hidden;
                }
            }
            catch (Exception ex)
            {
                Logging.warn("[DT] titlebar create failed: " + ex.GetType().Name);
            }
            apply();
        }

        public static void attach(AppWindow aw, Microsoft.UI.Xaml.Window xamlWindow)
        {
            appWindow = aw;
            try
            {
                dispatcher = xamlWindow.DispatcherQueue;
                if (DtTitleBarRules.systemBar(way()))
                {
                    aw.TitleBar.ExtendsContentIntoTitleBar = false;
                }
                if (uiSettings == null && way() != DtTitleBarRules.WayOff)
                {
                    uiSettings = new Windows.UI.ViewManagement.UISettings();
                    uiSettings.ColorValuesChanged += (s, e) => apply();
                }
            }
            catch (Exception ex)
            {
                Logging.warn("[DT] titlebar attach failed: " + ex.GetType().Name);
            }
            apply();
        }

        public static void apply()
        {
            if (way() == DtTitleBarRules.WayOff)
            {
                return;   // ★ #1392 (#46 r1 B NIT-1): the default (the Windows look) — nothing is dispatched, nothing is set
            }
            void run()
            {
                try
                {
                    int w = way();   // maui or colors here (off returned above; the way is fixed for the run)
                    if (mauiBar == null && appWindow == null)
                    {
                        return;   // the boot loadTheme runs before any window exists — the hooks call apply() again
                    }
                    bool dark = ThemeManager.getResolvedAppearanceName() == "dark";
                    var p = DtTitleBarRules.paletteFor(dark);
                    bool custom = false;
                    if (w == DtTitleBarRules.WayMaui && mauiBar != null)
                    {
                        mauiBar.BackgroundColor = Microsoft.Maui.Graphics.Color.FromArgb(p.Bg);
                        mauiBar.ForegroundColor = Microsoft.Maui.Graphics.Color.FromArgb(p.Fg);
                    }
                    AppWindow? aw = appWindow;
                    if (aw != null && AppWindowTitleBar.IsCustomizationSupported())
                    {
                        custom = true;
                        AppWindowTitleBar tb = aw.TitleBar;
                        foreach (var (prop, value) in DtTitleBarRules.captionColours(w, dark))
                        {
                            setColour(tb, prop, value);
                        }
                    }
                    Logging.info(DtTitleBarRules.applyLine(w, dark, custom));
                }
                catch (Exception ex)
                {
                    Logging.warn("[DT] titlebar apply failed: " + ex.GetType().Name);
                }
            }
            try
            {
                var dq = dispatcher;
                if (dq != null)
                {
                    if (dq.HasThreadAccess)
                    {
                        run();
                    }
                    else
                    {
                        dq.TryEnqueue(() => run());
                    }
                }
                else if (MainThread.IsMainThread)
                {
                    run();
                }
                else
                {
                    MainThread.BeginInvokeOnMainThread(run);
                }
            }
            catch (Exception ex)
            {
                Logging.warn("[DT] titlebar dispatch failed: " + ex.GetType().Name);
            }
        }

        private static void setColour(AppWindowTitleBar tb, string prop, string value)
        {
            Windows.UI.Color c = value == DtTitleBarRules.Transparent ? Microsoft.UI.Colors.Transparent : color(value);
            switch (prop)
            {
                case "BackgroundColor": tb.BackgroundColor = c; break;
                case "ForegroundColor": tb.ForegroundColor = c; break;
                case "InactiveBackgroundColor": tb.InactiveBackgroundColor = c; break;
                case "InactiveForegroundColor": tb.InactiveForegroundColor = c; break;
                case "ButtonBackgroundColor": tb.ButtonBackgroundColor = c; break;
                case "ButtonInactiveBackgroundColor": tb.ButtonInactiveBackgroundColor = c; break;
                case "ButtonForegroundColor": tb.ButtonForegroundColor = c; break;
                case "ButtonInactiveForegroundColor": tb.ButtonInactiveForegroundColor = c; break;
                case "ButtonHoverBackgroundColor": tb.ButtonHoverBackgroundColor = c; break;
                case "ButtonHoverForegroundColor": tb.ButtonHoverForegroundColor = c; break;
                case "ButtonPressedBackgroundColor": tb.ButtonPressedBackgroundColor = c; break;
                case "ButtonPressedForegroundColor": tb.ButtonPressedForegroundColor = c; break;
                default: break;
            }
        }

        private static Windows.UI.Color color(string hex)
        {
            DtTitleBarRules.parseHex(hex, out byte r, out byte g, out byte b);
            return Microsoft.UI.ColorHelper.FromArgb(255, r, g, b);
        }
    }
}
