using Foundation;
using IXICore.Meta;
using Microsoft.Maui;
using Microsoft.Maui.Hosting;
using SPIXI.Lang;
using SPIXI.Meta;
using System;
using System.IO;
using UIKit;

namespace Spixi;

[Register("AppDelegate")]
public class AppDelegate : MauiUIApplicationDelegate
{
	protected override MauiApp CreateMauiApp() => MauiProgram.CreateMauiApp();

    public override bool FinishedLaunching(UIApplication app, NSDictionary options)
    {
       /* if (UIDevice.CurrentDevice.CheckSystemVersion(10, 0))
        {
            // Ask the user for permission to get notifications on iOS 10.0+
            UNUserNotificationCenter.Current.RequestAuthorization(
                    UNAuthorizationOptions.Alert | UNAuthorizationOptions.Badge | UNAuthorizationOptions.Sound,
                    (approved, error) => { });
        }
        else if (UIDevice.CurrentDevice.CheckSystemVersion(8, 0))
        {
            // Ask the user for permission to get notifications on iOS 8.0+
            var settings = UIUserNotificationSettings.GetSettingsForTypes(
                    UIUserNotificationType.Alert | UIUserNotificationType.Badge | UIUserNotificationType.Sound,
                    new NSSet());

            UIApplication.SharedApplication.RegisterUserNotificationSettings(settings);
        }*/
        UIApplication.SharedApplication.SetMinimumBackgroundFetchInterval(UIApplication.BackgroundFetchIntervalMinimum);

        prepareStorage();
        excludeHistoryFromBackup();

     //   NSNotificationCenter.DefaultCenter.AddObserver(MPMusicPlayerController.VolumeDidChangeNotification, onVolumeChanged);

        SpixiLocalization.addCustomString("Platform", "Xamarin-iOS");

        //    LoadApplication(App.Instance());

        //    prepareBackgroundService();

        return base.FinishedLaunching(app, options);
    }

    /* ★ #912 (APP-1, iOS half — UNCOMPILED here, first compile is the next iOS build).
     * Config.spixiUserFolder is Documents/Spixi on iOS, and Documents is in every
     * iCloud / Finder backup. Chat history is plaintext on disk (be-cutover CORE-11), so
     * the history folder and the offline send queue get NSURLIsExcludedFromBackupKey —
     * Apple's own mechanism for "recreatable or sensitive, do not back up". The wallet,
     * the account and the avatar are NOT touched: they are what a restore is for. The
     * folders may not exist yet on a first launch (Core creates Chats in LocalStorage's
     * constructor, later than this) — a missing folder is skipped, and the flag is set
     * again on every launch, so the second launch catches it. Never throws: a backup
     * flag is not worth a crash at FinishedLaunching. */
    private static void excludeHistoryFromBackup()
    {
        foreach (string name in new[] { "Chats", "MsgQueue" })
        {
            try
            {
                string path = Path.Combine(Config.spixiUserFolder, name);
                if (!Directory.Exists(path))
                {
                    continue;
                }
                using var url = NSUrl.FromFilename(path);
                if (!url.SetResource(NSUrl.IsExcludedFromBackupKey, NSNumber.FromBoolean(true), out NSError err))
                {
                    Logging.warn("excludeHistoryFromBackup: {0} — {1}", name, err?.LocalizedDescription ?? "unknown error");
                }
            }
            catch (Exception e)
            {
                Logging.warn("excludeHistoryFromBackup: {0} — {1}", name, e.GetType().Name);
            }
        }
    }

    private void prepareStorage()
    {
        string source_html = Path.Combine(NSBundle.MainBundle.BundlePath, "html");
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

    // Manually export the native iOS memory warning selector
    [Export("applicationDidReceiveMemoryWarning:")]
    public void DidReceiveMemoryWarning(UIApplication application)
    {
        Node.onLowMemory();
        Logging.warn("iOS DidReceiveMemoryWarning");
    }
}
