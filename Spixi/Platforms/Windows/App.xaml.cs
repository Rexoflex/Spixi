using Microsoft.Extensions.DependencyInjection;
using Microsoft.Maui;
using Microsoft.Maui.Hosting;
using Microsoft.Maui.LifecycleEvents;
using Microsoft.UI;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Microsoft.Windows.AppLifecycle;
using SPIXI.Lang;
using SPIXI.Meta;
using System;
using System.Diagnostics;
using System.IO;
using Windows.Graphics;

// To learn more about WinUI, the WinUI project structure,
// and more about our project templates, see: http://aka.ms/winui-project-info.

namespace Spixi.WinUI;

/// <summary>
/// Provides application-specific behavior to supplement the default Application class.
/// </summary>
public partial class App : MauiWinUIApplication
{
    // Logical (DPI-independent) sizes — scaled by the window's actual DPI below.
    // The old constants were PHYSICAL pixels (800*2 etc.), so the window opened
    // larger than a 1366×768 laptop screen at 100% scale and tiny at 200%; the
    // 840px physical min-height forbade legitimate short-wide desktop windows
    // (docs/font-size-audit.md §3, DECISIONS #226).
    const int DefaultWidthDip = 1000;
    const int DefaultHeightDip = 700;
    // #231c (Damir F5): 480 min-width still read wider than Telegram Desktop —
    // TG allows ~380 logical. 384 = the chat pane's comfortable floor with the
    // #227 desktop type (list rows + composer stay usable; below the 700px split
    // threshold this is single-pane anyway).
    const int MinWidthDip = 384;
    const int MinHeightDip = 360;

    [System.Runtime.InteropServices.DllImport("user32.dll")]
    private static extern uint GetDpiForWindow(IntPtr hwnd);

    /// <summary>
    /// Initializes the singleton application object.  This is the first line of authored code
    /// executed, and as such is the logical equivalent of main() or WinMain().
    /// </summary>
    public App()
	{
        var singleInstance = AppInstance.FindOrRegisterForKey("SpixiDesktopApp");
        if (!singleInstance.IsCurrent)
        {
            var currentInstance = AppInstance.GetCurrent();
            var args = currentInstance.GetActivatedEventArgs();
            singleInstance.RedirectActivationToAsync(args).GetAwaiter().GetResult();

            Process.GetCurrentProcess().Kill();
            return;
        }

        singleInstance.Activated += OnAppInstanceActivated;

        InitializeComponent();

        /* ★ #1153 (session 5): a UI-thread exception on Windows surfaces at WinUI's Application.UnhandledException
         * (App.g.i.cs:69 in the debugger) — NOT at AppDomain.UnhandledException, the only handler the app had
         * (App.xaml.cs:238) — so the white-window break left no trace in ixian.log. Log it: the TYPE, the HRESULT and
         * the first managed frame (type + method name) only — never the message, which can carry a path or an
         * address (the gate rule). Handled stays false: the app still stops as before; this only names the cause. */
        UnhandledException += (sender, e) =>
        {
            try
            {
                Exception? ex = e.Exception;
                string frame = "-";
                var f = ex != null ? new StackTrace(ex, false).GetFrame(0)?.GetMethod() : null;
                if (f != null)
                {
                    frame = (f.DeclaringType?.FullName ?? "?") + "." + f.Name;
                }
                IXICore.Meta.Logging.error("[CRASH] winui " + (ex?.GetType().FullName ?? "null")
                    + " hr=0x" + (ex?.HResult ?? 0).ToString("X8")
                    + " inner=" + (ex?.InnerException?.GetType().FullName ?? "-")
                    + " at " + frame);
                IXICore.Meta.Logging.flush();
            }
            catch
            {
            }
        };

        Microsoft.Maui.Handlers.WindowHandler.Mapper.AppendToMapping(nameof(IWindow), (handler, view) =>
        {
            var mauiWindow = handler.VirtualView;
            var nativeWindow = handler.PlatformView;
            nativeWindow.Activate();
            IntPtr windowHandle = WinRT.Interop.WindowNative.GetWindowHandle(nativeWindow);
            WindowId windowId = Microsoft.UI.Win32Interop.GetWindowIdFromWindow(windowHandle);
            AppWindow appWindow = Microsoft.UI.Windowing.AppWindow.GetFromWindowId(windowId);

            // Window sizing pass (#226, docs/font-size-audit.md §3):
            // DPI-aware defaults + a REAL OS-enforced minimum + last-size restore.
            double scale = GetDpiForWindow(windowHandle) / 96.0;
            if (scale <= 0)
            {
                scale = 1.0;
            }
            int minW = (int)(MinWidthDip * scale);
            int minH = (int)(MinHeightDip * scale);

            var workArea = DisplayArea.GetFromWindowId(windowId, DisplayAreaFallback.Nearest).WorkArea;

            // Restore the last window size (physical px), clamped to the work area;
            // first run = DPI-scaled default, centred.
            int width = 0, height = 0;
            try
            {
                width = Microsoft.Maui.Storage.Preferences.Default.Get("windowWidth", 0);
                height = Microsoft.Maui.Storage.Preferences.Default.Get("windowHeight", 0);
            }
            catch
            {
                // Preferences unavailable this early on some configs → default size.
            }
            // #1073: a size below the OS minimum can only come from a bad save (an older build
            // stored the ~160x28 caption rect of a MINIMIZED window) — treat it as no save, so a
            // store poisoned before this fix heals on the next launch instead of opening tiny.
            bool firstRun = width < minW || height < minH;
            bool wasMaximized = false;
            try
            {
                wasMaximized = Microsoft.Maui.Storage.Preferences.Default.Get("windowMaximized", false);
            }
            catch
            {
                // Preferences unavailable this early → open restored.
            }
            if (firstRun)
            {
                width = (int)(DefaultWidthDip * scale);
                height = (int)(DefaultHeightDip * scale);
            }
            width = Math.Max(Math.Min(width, workArea.Width), minW);
            height = Math.Max(Math.Min(height, workArea.Height), minH);
            appWindow.Resize(new SizeInt32(width, height));
            if (firstRun)
            {
                appWindow.Move(new Windows.Graphics.PointInt32(
                    workArea.X + (workArea.Width - width) / 2,
                    workArea.Y + (workArea.Height - height) / 2));
            }

            // The minimum is enforced by the OS DURING the drag — no resize-fighting,
            // no snap-back jitter, and no teardown-time Resize() ArgumentException
            // (the old Changed-handler approach caused both).
            if (appWindow.Presenter is OverlappedPresenter presenter)
            {
                presenter.PreferredMinimumWidth = minW;
                presenter.PreferredMinimumHeight = minH;
                if (wasMaximized)
                {
                    // #1073: the restored size above stays the un-maximize target.
                    presenter.Maximize();
                }
            }

            // Persist the size so the next launch restores it (premium-app parity).
            // #1073: save the size ONLY in the Restored state. A MINIMIZED window reports its
            // caption rect (~160x28, not 0) and a MAXIMIZED one reports the work area, so the
            // old "skip <= 0" guard let a close-while-minimized store a tiny size. Maximized is
            // its own flag; Minimized changes nothing (a maximized window that is minimized and
            // closed from the taskbar opens maximized again).
            int lastSavedW = width, lastSavedH = height;
            bool lastSavedMax = wasMaximized;
            appWindow.Changed += (sender, args) =>
            {
                if (!args.DidSizeChange && !args.DidPresenterChange)
                {
                    return;
                }
                if (appWindow.Presenter is not OverlappedPresenter op)
                {
                    return;
                }
                try
                {
                    if (op.State == OverlappedPresenterState.Maximized)
                    {
                        if (!lastSavedMax)
                        {
                            lastSavedMax = true;
                            Microsoft.Maui.Storage.Preferences.Default.Set("windowMaximized", true);
                        }
                        return;
                    }
                    if (op.State != OverlappedPresenterState.Restored)
                    {
                        return;   // Minimized: keep the last restored size and the flag
                    }
                    if (lastSavedMax)
                    {
                        lastSavedMax = false;
                        Microsoft.Maui.Storage.Preferences.Default.Set("windowMaximized", false);
                    }
                    var size = appWindow.Size;
                    if (size.Width < minW || size.Height < minH)
                    {
                        return;   // teardown reports invalid sizes
                    }
                    if (size.Width == lastSavedW && size.Height == lastSavedH)
                    {
                        return;
                    }
                    lastSavedW = size.Width;
                    lastSavedH = size.Height;
                    Microsoft.Maui.Storage.Preferences.Default.Set("windowWidth", size.Width);
                    Microsoft.Maui.Storage.Preferences.Default.Set("windowHeight", size.Height);
                }
                catch
                {
                    // Preferences unavailable during shutdown — size just isn't saved.
                }
            };
        });

        SpixiLocalization.addCustomString("Platform", "Xamarin-WPF");
    }

    protected override MauiApp CreateMauiApp() => MauiProgram.CreateMauiApp();

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        base.OnLaunched(args);
    }

    private void OnAppInstanceActivated(object? sender, AppActivationArguments e)
    {
        Services.GetRequiredService<ILifecycleEventService>().OnAppInstanceActivated(sender, e);
    }
}
