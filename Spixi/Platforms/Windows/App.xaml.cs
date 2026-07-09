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
    const int WindowWidth = 800*2;
    const int WindowHeight = 600*2;
    const int MinWidth = 300*2;
    const int MinHeight = 420*2;

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

        Microsoft.Maui.Handlers.WindowHandler.Mapper.AppendToMapping(nameof(IWindow), (handler, view) =>
        {
            var mauiWindow = handler.VirtualView;
            var nativeWindow = handler.PlatformView;
            nativeWindow.Activate();
            IntPtr windowHandle = WinRT.Interop.WindowNative.GetWindowHandle(nativeWindow);
            WindowId windowId = Microsoft.UI.Win32Interop.GetWindowIdFromWindow(windowHandle);
            AppWindow appWindow = Microsoft.UI.Windowing.AppWindow.GetFromWindowId(windowId);
            appWindow.Resize(new SizeInt32(WindowWidth, WindowHeight));

            appWindow.Changed += (sender, args) =>
            {
                // Only react to actual size changes, and never to the teardown-time
                // events: while the window is CLOSING (or minimized) it reports an
                // invalid/zero size, and Resize() then throws ArgumentException
                // "The parameter is incorrect" — broke into the debugger on every
                // app close (Damir). The resize-fighting approach itself should be
                // replaced with OverlappedPresenter.PreferredMinimumWidth/Height at
                // the window-sizing pass — see docs/font-size-audit.md §3.
                if (!args.DidSizeChange)
                {
                    return;
                }
                if (appWindow.Size.Width <= 0 || appWindow.Size.Height <= 0)
                {
                    return;
                }
                if (appWindow.Size.Width < MinWidth || appWindow.Size.Height < MinHeight)
                {
                    var newSize = new SizeInt32
                    {
                        Width = Math.Max(appWindow.Size.Width, MinWidth),
                        Height = Math.Max(appWindow.Size.Height, MinHeight)
                    };
                    try
                    {
                        appWindow.Resize(newSize);
                    }
                    catch (ArgumentException)
                    {
                        // Window is closing/being destroyed — nothing to enforce.
                    }
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
