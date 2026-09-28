using Foundation;
using IXICore.Meta;
using Microsoft.Maui;
using Microsoft.Maui.Hosting;
using SPIXI.Lang;
using SPIXI.Meta;
using System.IO;
using UIKit;

namespace Spixi;

[Register("AppDelegate")]
public class AppDelegate : MauiUIApplicationDelegate
{
	protected override MauiApp CreateMauiApp() => MauiProgram.CreateMauiApp();

    public override bool FinishedLaunching(UIApplication app, NSDictionary options)
    {
        UIApplication.SharedApplication.SetMinimumBackgroundFetchInterval(UIApplication.BackgroundFetchIntervalMinimum);

        prepareStorage();

        SpixiLocalization.addCustomString("Platform", "Xamarin-Mac");

        return base.FinishedLaunching(app, options);
    }

    private void prepareStorage()
    {
        string source_html = Path.Combine(NSBundle.MainBundle.BundlePath, "Contents/Resources/html");
        string dest_html = Path.Combine(Config.spixiUserFolder, "html");

        if (!Directory.Exists(dest_html))
        {
            Directory.CreateDirectory(dest_html);
        }

        prepareSymbolicLinks(new DirectoryInfo(source_html), new DirectoryInfo(dest_html));
    }

    // Cleans up and links contents of the source directory to target directory.
    private static void prepareSymbolicLinks(DirectoryInfo source, DirectoryInfo target)
    {
        var fm = new NSFileManager();
        fm.ChangeCurrentDirectory(target.FullName);

        NSError ns_error = new NSError();

        foreach (DirectoryInfo dir in source.GetDirectories())
        {
            var tmp_path = Path.Combine(target.FullName, dir.Name);
            if (Directory.Exists(tmp_path))
            {
                Directory.Delete(tmp_path, true);
            }
            if (File.Exists(tmp_path))
            {
                File.Delete(tmp_path);
            }
            fm.CreateSymbolicLink(dir.Name, dir.FullName, out ns_error);
        }

        foreach (FileInfo file in source.GetFiles())
        {
            var tmp_path = Path.Combine(target.FullName, file.Name);
            if (Directory.Exists(tmp_path))
            {
                Directory.Delete(tmp_path, true);
            }
            if (File.Exists(tmp_path))
            {
                File.Delete(tmp_path);
            }
            fm.CreateSymbolicLink(file.Name, file.FullName, out ns_error);
        }
    }

    public override void WillTerminate(UIApplication uiApplication)
    {
        IxianHandler.shutdown();
        base.WillTerminate(uiApplication);
    }

    /* ★ #993 (M5) DIAGNOSTIC (#294), office walk #991: "paste does not work in the add-contact
     * field" on the Mac, both ⌘V and the context-menu Paste. Nothing in the page blocks it (no
     * paste / beforeinput / keydown handler rejects input there), and on macOS ⌘V is the Edit
     * menu's KEY EQUIVALENT. Spixi defines no MenuBar, so MAUI's own pass should leave UIKit's
     * standard menu alone — this line CONFIRMS that rather than assuming it (the review expects
     * edit=True paste=True; the context-menu Paste failing too points past the menu). Logged
     * once per main-menu build, AFTER MAUI's pass. Two booleans, no user data. Read it with the
     * second probe (ContactNewPage: `[M5] add-contact pasteboard hasStrings=`):
     *   edit=False              → the menu was removed → re-insert the standard Edit menu here;
     *   hasStrings=False        → nothing to paste: the copy never reached the pasteboard;
     *   both True, still no paste → the WebView's responder / the page. */
    public override void BuildMenu(IUIMenuBuilder builder)
    {
        base.BuildMenu(builder);
        try
        {
            if (builder.System != UIMenuSystem.MainSystem) return;
            bool hasEdit = builder.GetMenu(UIMenuIdentifier.Edit.GetConstant()) != null;
            bool hasPaste = builder.GetCommand(new ObjCRuntime.Selector("paste:"), null) != null;
            Logging.info("[M5] main menu edit=" + hasEdit + " paste=" + hasPaste);
        }
        catch (System.Exception e)
        {
            Logging.warn("[M5] menu probe failed: " + e.GetType().Name);
        }
    }

}
