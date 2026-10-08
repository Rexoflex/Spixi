using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using CommunityToolkit.Maui.Alerts;
using CommunityToolkit.Maui.Storage;
using IXICore.Meta;
using Microsoft.Maui.ApplicationModel;
using SPIXI;

namespace Spixi
{
    public class SFileOperations
    {
        public static void open(string filepath)
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = filepath,
                UseShellExecute = true
            });
        }

        /* ★ S12 D (#1266 / #1267 — WALK #1266: the viewer's Save sent `savephoto` 8× on Windows, C# logged nothing). The
         * outer Task keeps the backup's `await (await share(…))` (BackupPage.shareBackup) — the result is FileSaver's own
         * (H-13 r1, #1245: a cancel is not a backup). The work is saveAs. */
        public static async Task<Task<bool>> share(string filepath, string title)
        {
            string outcome = await saveAs(filepath);
            return Task.FromResult(outcome == S11MediaRules.SaveOk);
        }

        /* ★ S12 D (#1266 candidate): the platform "Save as" for C#'s own file → S11MediaRules.SaveOk | SaveCancel | SaveFail.
         *   · the source opens SHARE-TOLERANT (read; others may keep it open for read / write / delete) — File.OpenRead
         *     refused a file another handle still held, and that IOException was swallowed in silence;
         *   · FileSaver runs on the UI thread (its FileSavePicker is bound to the window — CommunityToolkit 14.2.0
         *     FileSaverImplementation.windows.cs); a caller off it is marshalled, a caller on it (both today) runs as before;
         *   · a cancel (an OperationCanceledException in the result) is not a failure: no toast, no warn;
         *   · a failure logs the exception TYPE only (never its message — it can carry a path) and keeps the toast;
         *   · the source open failing — IOException (FileNotFound / DirectoryNotFound / a share violation) or
         *     UnauthorizedAccessException (no read access; ★ S12 D2 #46 R1-MINOR-2: it escaped to the backup / log callers)
         *     → its TYPE logged, SaveFail. Nothing else is caught here (FileSaver reports its own failures in the result). */
        public static async Task<string> saveAs(string filepath)
        {
            try
            {
                string fileName = Path.GetFileName(filepath);
                using FileStream fileStream = new FileStream(filepath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
                FileSaverResult fileSaverResult = MainThread.IsMainThread
                    ? await FileSaver.Default.SaveAsync(fileName, fileStream, CancellationToken.None)
                    : await MainThread.InvokeOnMainThreadAsync(async () => await FileSaver.Default.SaveAsync(fileName, fileStream, CancellationToken.None));   // the BackupPage.xaml.cs:210 shape (Func<Task<T>> → T)
                string outcome = S11MediaRules.saveOutcome(fileSaverResult.IsSuccessful, fileSaverResult.Exception is OperationCanceledException);
                if (outcome == S11MediaRules.SaveFail)
                {
                    Logging.warn("share failed: " + (fileSaverResult.Exception?.GetType().Name ?? "none"));
                    try
                    {
                        await Toast.Make("The file was not saved. Error: " + (fileSaverResult.Exception?.Message ?? "")).Show(CancellationToken.None);
                    }
                    catch (Exception e)
                    {
                        Logging.warn("share toast failed: " + e.GetType().Name);
                    }
                }
                return outcome;
            }
            catch (Exception e) when (e is IOException || e is UnauthorizedAccessException)
            {
                Logging.warn("share failed: " + e.GetType().Name);
                return S11MediaRules.SaveFail;
            }
        }

    }
}
