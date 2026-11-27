using Foundation;
using Photos;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UIKit;

namespace Spixi
{
    public class FileInteractionDelegate : UIDocumentInteractionControllerDelegate
    {
        UIViewController parent;

        public FileInteractionDelegate(UIViewController controller)
        {
            parent = controller;
        }

        public override UIViewController ViewControllerForPreview(UIDocumentInteractionController controller)
        {
            return parent;
        }
    }

    public class SFileOperations
    {
        public static void open(string filepath)
        {
            var previewController = UIDocumentInteractionController.FromUrl(NSUrl.FromFilename(filepath));
            previewController.Delegate = new FileInteractionDelegate(GetVisibleViewController());
            previewController.PresentPreview(true);
        }

        public static Task share(string filepath, string title)
        {
            if (!SPIXI.MacfixaFlags.MacSaveToFolder)
            {
                return shareMenu(filepath, title);
            }
            return Microsoft.Maui.ApplicationModel.MainThread.InvokeOnMainThreadAsync(() => saveChoice(filepath, title));
        }

        /** The switch OFF: the macOS share menu only (no save-to-folder destination on the Mac). */
        static Task shareMenu(string filepath, string title)
        {
            var items = new NSObject[] { NSObject.FromObject(title), NSUrl.FromFilename(filepath) };
            var activityController = new UIActivityViewController(items, null);
            var vc = GetVisibleViewController();

            NSString[] excludedActivityTypes = null;

            if (excludedActivityTypes != null && excludedActivityTypes.Length > 0)
                activityController.ExcludedActivityTypes = excludedActivityTypes;

            if (UIDevice.CurrentDevice.CheckSystemVersion(8, 0))
            {
                if (activityController.PopoverPresentationController != null)
                {
                    activityController.PopoverPresentationController.SourceView = vc.View;
                }
            }
            vc.PresentViewControllerAsync(activityController, true);
            return Task.FromResult(true);
        }

        /* A native choice first: Save File (the system save panel, a COPY of C#'s own file; the
         * user picks the place), Add to Photos (photos only, MacSaveRules), Share File (the share menu), Cancel. The
         * returned Task ends when the whole choice is finished, so a caller's next question opens after it. */
        static async Task saveChoice(string filepath, string title)
        {
            string name = System.IO.Path.GetFileName(filepath);
            string choice = SPIXI.MacSaveRules.Cancel, result = SPIXI.MacSaveRules.Failed;
            try
            {
                UIViewController host = topController();
                var picked = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
                // Alert, not ActionSheet: on the Mac it needs no popover anchor and shows as a centred dialog (Esc = Cancel)
                var alert = UIAlertController.Create(SL("global-share-choose", "Choose Action"), null, UIAlertControllerStyle.Alert);
                foreach (string opt in SPIXI.MacSaveRules.options(name))
                {
                    alert.AddAction(UIAlertAction.Create(SL(SPIXI.MacSaveRules.keyOf(opt), SPIXI.MacSaveRules.englishOf(opt)), opt == SPIXI.MacSaveRules.Cancel ? UIAlertActionStyle.Cancel : UIAlertActionStyle.Default, _ => picked.TrySetResult(opt)));
                }
                choice = await show(host, alert, picked, SPIXI.MacSaveRules.Cancel);
                result = choice == SPIXI.MacSaveRules.Save ? await saveCopy(host, filepath)
                    : choice == SPIXI.MacSaveRules.Photos ? await addToPhotos(host, filepath)
                    : choice == SPIXI.MacSaveRules.Share ? await shareAndWait(host, filepath, title, name)
                    : SPIXI.MacSaveRules.Cancelled;
            }
            catch (Exception e)
            {
                IXICore.Meta.Logging.warn("[MACSAVE] failed (" + e.GetType().Name + ")");
            }
            IXICore.Meta.Logging.info(SPIXI.MacSaveRules.logLine(choice, result));
        }

        static async Task<string> saveCopy(UIViewController host, string filepath)
        {
            var done = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
            // asCopy: true — the source file stays where C# keeps it; the panel writes a copy where the user chose
            var picker = new UIDocumentPickerViewController(new NSUrl[] { NSUrl.FromFilename(filepath) }, true);
            var del = new ExportDelegate(done);
            picker.Delegate = del;
            openPanel = (picker, del);
            string r = await show(host, picker, done, SPIXI.MacSaveRules.Cancelled, true);
            openPanel = null;
            return r;
        }

        static object? openPanel;   // the open save panel and its delegate, held until the delegate answers

        class ExportDelegate(TaskCompletionSource<string> done) : UIDocumentPickerDelegate
        {
            public override void DidPickDocument(UIDocumentPickerViewController controller, NSUrl[] urls) => done.TrySetResult(SPIXI.MacSaveRules.Done);
            public override void WasCancelled(UIDocumentPickerViewController controller) => done.TrySetResult(SPIXI.MacSaveRules.Cancelled);
        }

        /** Add-only access; Spixi passes the file URL and calls no decoder itself (where Photos reads the file is not verified). */
        static async Task<string> addToPhotos(UIViewController host, string filepath)
        {
            var auth = new TaskCompletionSource<PHAuthorizationStatus>(TaskCreationOptions.RunContinuationsAsynchronously);
            PHPhotoLibrary.RequestAuthorization(PHAccessLevel.AddOnly, s => auth.TrySetResult(s));
            PHAuthorizationStatus status = await auth.Task;
            string r = SPIXI.MacSaveRules.Denied;
            if (status == PHAuthorizationStatus.Authorized || status == PHAuthorizationStatus.Limited)
            {
                NSUrl url = NSUrl.FromFilename(filepath);
                bool made = false;
                var added = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
                PHPhotoLibrary.SharedPhotoLibrary.PerformChanges(() => { made = PHAssetChangeRequest.FromImage(url) != null; }, (ok, err) => added.TrySetResult(ok));
                r = await added.Task && made ? SPIXI.MacSaveRules.Done : SPIXI.MacSaveRules.Failed;
            }
            if (r != SPIXI.MacSaveRules.Done)
            {
                var closed = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
                var a = UIAlertController.Create(SL("global-dialog-error", "Error"), SL("global-share-addphotos-failed", "Spixi could not add the photo to Photos. Check the Photos access of Spixi in System Settings > Privacy & Security."), UIAlertControllerStyle.Alert);
                a.AddAction(UIAlertAction.Create(SL("global-dialog-ok", "OK"), UIAlertActionStyle.Default, _ => closed.TrySetResult(true)));
                await show(host, a, closed, true);
            }
            return r;
        }

        /** The share menu, awaited until it closes. A photo goes as the file URL alone: a text item beside it likely hides
         *  the Photos extension (not proved). */
        static Task<string> shareAndWait(UIViewController host, string filepath, string title, string name)
        {
            var done = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
            NSUrl url = NSUrl.FromFilename(filepath);
            NSObject[] items = SPIXI.MacSaveRules.isPhoto(name) ? new NSObject[] { url } : new NSObject[] { NSObject.FromObject(title), url };
            var menu = new UIActivityViewController(items, null);
            menu.CompletionWithItemsHandler = (type, completed, returned, error) => done.TrySetResult(completed ? SPIXI.MacSaveRules.Done : SPIXI.MacSaveRules.Cancelled);
            if (menu.PopoverPresentationController != null)
            {
                menu.PopoverPresentationController.SourceView = host.View;
                menu.PopoverPresentationController.SourceRect = new CoreGraphics.CGRect(host.View!.Bounds.X + host.View.Bounds.Width / 2, host.View.Bounds.Y + host.View.Bounds.Height / 2, 0, 0);
            }
            return show(host, menu, done, SPIXI.MacSaveRules.Done);
        }

        /** Presents vc and returns its step's result. A presentation that UIKit refused or that closed without its handler
         *  (the share menu is reported to skip it for Mail and Messages) ends the step with `closed` after two polls in a row find vc not
         *  presented; the second poll lets a handler that UIKit calls at the end of the dismissal come first. With waitWhenShown (the
         *  save panel) there is no poll: the step ends only by its delegate, as MAUI's own file picker waits on the Mac, because the
         *  panel's presentation state on Catalyst is not proven; a refused presentation or a delegate that never runs keeps the step
         *  open (no question, no line: fail closed). */
        static async Task<T> show<T>(UIViewController host, UIViewController vc, TaskCompletionSource<T> done, T closed, bool waitWhenShown = false)
        {
            host.PresentViewController(vc, true, null);
            if (waitWhenShown) return await done.Task;
            for (int gone = 0; gone < 2 && !done.Task.IsCompleted; gone = vc.PresentingViewController == null ? gone + 1 : 0)
            {
                await Task.Delay(300);
            }
            done.TrySetResult(closed);
            return await done.Task;
        }

        /** The top presented controller (the chooser and the panels are shown from it). */
        static UIViewController topController()
        {
            UIViewController vc = GetVisibleViewController();
            while (vc.PresentedViewController != null && !vc.PresentedViewController.IsBeingDismissed)
            {
                vc = vc.PresentedViewController;
            }
            return vc;
        }

        static string SL(string key, string english) => SPIXI.Lang.SpixiLocalization._SL(key) ?? english;

        static UIViewController GetVisibleViewController()
        {
            var rootController = UIApplication.SharedApplication.KeyWindow.RootViewController;

            if (rootController.PresentedViewController == null)
                return rootController;

            if (rootController.PresentedViewController is UINavigationController)
            {
                return ((UINavigationController)rootController.PresentedViewController).TopViewController;
            }

            if (rootController.PresentedViewController is UITabBarController)
            {
                return ((UITabBarController)rootController.PresentedViewController).SelectedViewController;
            }

            return rootController.PresentedViewController;
        }

    }
}
