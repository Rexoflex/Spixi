using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Android.App;
using Android.Content;
using Android.Content.PM;
using Android.Net.Wifi;
using Android.OS;
using Android.Webkit;
using IXICore.Meta;
using Java.IO;
using Microsoft.Maui.Storage;
using SPIXI.Lang;
using File = Java.IO.File;

namespace Spixi
{
    public class SFileOperations
    {

        /// <summary>★ H-13 r1 (#1245): true = Share or Save was chosen, false = the action sheet was cancelled.</summary>
        public static async Task<bool> share(string filepath, string title)
        {
            var action = await Microsoft.Maui.Controls.Application.Current!.MainPage!.DisplayActionSheet(
                            SpixiLocalization._SL("global-share-choose"),
                            SpixiLocalization._SL("global-dialog-cancel"),
                            null,
                            SpixiLocalization._SL("global-share-sharefile"),
                            SpixiLocalization._SL("global-share-savefile"));

            if (action != null && action.Equals(SpixiLocalization._SL("global-share-sharefile")))
            {
                shareFile(filepath, title);
                return true;
            }
            else if(action != null && action.Equals(SpixiLocalization._SL("global-share-savefile")))
            {
                saveFile(filepath, title);
                return true;
            }
            return false;
        }

        public static void shareFile(string filepath, string title)
        {
            var context = MainActivity.Instance;
            /* ★ Session Safety (S-4, P34): the provider no longer publishes the folder that holds wallet.ixi
             * (provider_paths.xml: Documents/Spixi/Downloads/ · Documents/Spixi/Sent/ · their Spixi/ twins · cache share/ ·
             * cache root), so Share grants a COPY in <cache>/share/<random>/ (stageForShare) and never the source. Staged
             * BEFORE the own-intent stamp: a copy that fails starts no round-trip.
             * ★ #46 r1 (R3 n-1): the intent build and GetUriForFile sit INSIDE the try that clears the stamp, so no throw
             * after the stamp can leave it set (it used to cover StartActivity only). */
            string staged = stageForShare(context, filepath);
            // #334 AND-21: own share-sheet round-trip — no resume lock on return.
            App.noteOwnIntentRoundTrip();
            try
            {
                File file = new File(staged);
                Intent shareIntent = new Intent();
                shareIntent.SetAction(Intent.ActionSend);
                shareIntent.SetType("application/octet-stream");
                Android.Net.Uri uriShare = FileProvider.GetUriForFile(context, context.PackageName + ".provider", file);   // ★ #734: derived, never hardcoded — a bare authority is a GLOBAL name and blocked the #732 dev-coexist install
                shareIntent.PutExtra(Intent.ExtraStream, uriShare);

                var chooserIntent = Intent.CreateChooser(shareIntent, title ?? string.Empty);
                chooserIntent.SetFlags(ActivityFlags.ClearTop | ActivityFlags.NewTask);
                context.StartActivity(chooserIntent);
            }
            catch (Exception)
            {
                App.clearOwnIntentStamp();   // loop MINOR-4: no round-trip → no suppression
                throw;
            }
        }

        /* ★ Session Safety (S-4, P34): the Share staging folder, `<cache>/share/` (SafetyRules.ShareFolderName; the
         * provider's `cache-path name="share"`, which covers its sub-folders). Context.CacheDir is the directory the
         * provider's cache-path roots resolve against, so a staged file is always inside a published root.
         * ★ #46 r1 (R3 m-1): r0 EMPTIED the folder before each share and at start — that could delete a copy a receiver had
         * not read yet (Drive / Gmail read the uri late), after BackupPage had already stamped the backup. Now each share
         * gets its OWN folder, `share/<random>/<leaf>` (the leaf keeps the receiver's file name), and the cleanup removes
         * only entries of share/ (a folder, or a stray file of the r0 flat layout) older than ShareKeepMinutes — on each
         * share BEFORE the new folder is made (so never the folder just created) and once per process at start
         * (sweepShareFolder, MainActivity.OnCreate). Each delete in its own try; never throws. Logs = fixed words + the
         * exception TYPE (a message can hold a path). */
        private const string StageFailed = "Share: the file could not be staged";
        private const int ShareKeepMinutes = 60;
        private static bool shareSweepDone = false;

        /** ★ S-4: `<cache>/share/`, or null when the cache dir is unknown. Never throws. */
        private static string? shareDir(Context? context)
        {
            try
            {
                string? cache = context?.CacheDir?.AbsolutePath;
                return string.IsNullOrEmpty(cache) ? null : Path.Combine(cache, SPIXI.SafetyRules.ShareFolderName);
            }
            catch (Exception)
            {
                return null;
            }
        }

        /** ★ S-4 (#46 r1): true when `lastWriteUtc` is more than ShareKeepMinutes before `nowUtc`. */
        private static bool shareEntryExpired(DateTime lastWriteUtc, DateTime nowUtc)
        {
            return nowUtc - lastWriteUtc > TimeSpan.FromMinutes(ShareKeepMinutes);
        }

        /** ★ S-4 (#46 r1): removes the entries of `dir` (share/) older than ShareKeepMinutes — a share folder recursively, a
         *  stray file on its own — each delete in its own try. Nothing outside `dir`. Never throws. */
        private static void pruneShareFolder(string dir)
        {
            string[] folders;
            string[] files;
            DateTime now = DateTime.UtcNow;
            try
            {
                if (!System.IO.Directory.Exists(dir))
                {
                    return;
                }
                folders = System.IO.Directory.GetDirectories(dir);
                files = System.IO.Directory.GetFiles(dir);
            }
            catch (Exception e)
            {
                Logging.warn("Share folder: could not be listed (" + e.GetType().Name + ")");
                return;
            }
            foreach (string d in folders)
            {
                try
                {
                    if (SPIXI.SafetyRules.isInside(dir, d) && shareEntryExpired(System.IO.Directory.GetLastWriteTimeUtc(d), now))
                    {
                        System.IO.Directory.Delete(d, true);
                    }
                }
                catch (Exception e)
                {
                    Logging.warn("Share folder: a folder could not be deleted (" + e.GetType().Name + ")");
                }
            }
            foreach (string f in files)
            {
                try
                {
                    if (shareEntryExpired(System.IO.File.GetLastWriteTimeUtc(f), now))
                    {
                        System.IO.File.Delete(f);
                    }
                }
                catch (Exception e)
                {
                    Logging.warn("Share folder: a file could not be deleted (" + e.GetType().Name + ")");
                }
            }
        }

        /** ★ S-4: copies `filepath` (a C# path — every caller builds it from Config.spixiUserFolder) to
         *  `<cache>/share/<random>/<leaf>` — the leaf = the one of SafetyRules.shareStagePath(<cache>, filepath) (its
         *  safeBaseName of the source's file name) — after pruning share/, and returns the copy. On the calling thread: the
         *  wallet is a few KB, and the log zip / the account backup are built on this same thread by the callers just
         *  before, so the copy is the smaller part of that work. A failure logs the TYPE and throws a fixed-word IOException
         *  (no path, no inner exception: BackupPage logs ex.ToString()) — the same exit as a StartActivity failure, so
         *  share() never reports a share that did not happen (BackupPage would stamp the backup as saved). */
        private static string stageForShare(Context? context, string filepath)
        {
            try
            {
                string? dir = shareDir(context);
                string? flat = SPIXI.SafetyRules.shareStagePath(context?.CacheDir?.AbsolutePath, filepath);
                string leaf = Path.GetFileName(flat) ?? "";
                if (dir == null || flat == null || leaf.Length == 0)
                {
                    throw new System.IO.DirectoryNotFoundException();
                }
                if (SPIXI.SafetyRules.isInside(dir, filepath))
                {
                    return filepath;   // already a staged copy: share it as it is
                }
                pruneShareFolder(dir);
                string slot = Path.Combine(dir, Guid.NewGuid().ToString("N"));
                string staged = Path.Combine(slot, leaf);
                System.IO.Directory.CreateDirectory(slot);
                System.IO.File.Copy(filepath, staged, false);
                try { System.IO.Directory.SetLastWriteTimeUtc(slot, DateTime.UtcNow); } catch (Exception) { }   // the prune's clock starts now
                return staged;
            }
            catch (Exception e)
            {
                Logging.error("Share: staging failed (" + e.GetType().Name + ")");
                throw new System.IO.IOException(StageFailed);
            }
        }

        /** ★ S-4: the start sweep — prunes `<cache>/share/` (entries older than ShareKeepMinutes) ONCE per process. Never
         *  throws. */
        public static void sweepShareFolder(Context? context)
        {
            if (shareSweepDone)
            {
                return;
            }
            shareSweepDone = true;
            try
            {
                string? dir = shareDir(context);
                if (dir != null)
                {
                    pruneShareFolder(dir);
                }
            }
            catch (Exception e)
            {
                Logging.warn("Share folder: the start sweep failed (" + e.GetType().Name + ")");
            }
        }

        /// <summary>★ S11 G3 (#1263 MINOR-8): `mimeType` names the document type for the system "Save as" picker (the
        /// viewer's Save passes the photo's image MIME, S11MediaRules.imageMimeOf); every other caller keeps
        /// application/octet-stream. Main thread (the picker); MainActivity copies the bytes off the UI thread.</summary>
        public static void saveFile(string filepath, string title, string mimeType = "application/octet-stream")
        {
            // #334 AND-21: own save-as round-trip — no resume lock on return.
            App.noteOwnIntentRoundTrip();
            var context = MainActivity.Instance;
            Intent saveIntent = new Intent(Intent.ActionCreateDocument);
            saveIntent.AddCategory(Intent.CategoryOpenable);
            saveIntent.SetType(string.IsNullOrEmpty(mimeType) ? "application/octet-stream" : mimeType);
            saveIntent.PutExtra(Intent.ExtraTitle, Path.GetFileName(filepath));
            saveIntent.AddFlags(ActivityFlags.GrantWriteUriPermission);

            context.SaveFilePath = filepath;
            try
            {
                context.StartActivityForResult(saveIntent, MainActivity.SaveFileId);
            }
            catch (Exception)
            {
                App.clearOwnIntentStamp();   // loop MINOR-4: no round-trip → no suppression
                throw;
            }
        }
        public static string getMimeType(Android.Net.Uri uri)
        {
            string mime_type = null;
            if (uri.Scheme.Equals(ContentResolver.SchemeContent))
            {
                ContentResolver cr = MainActivity.Instance.ContentResolver;
                mime_type = cr.GetType(uri);
            }
            else
            {
                string ext = MimeTypeMap.GetFileExtensionFromUrl(uri.ToString());
                mime_type = MimeTypeMap.Singleton.GetMimeTypeFromExtension(ext.ToLower());
            }
            if (mime_type == null)
            {
                mime_type = "*/*";
            }
            return mime_type;
        }

        public static void open(string file_path)
        {
            var context = MainActivity.Instance;
            File f;
            if (file_path.StartsWith(context.FilesDir.AbsolutePath))
            {
                f = new File(context.FilesDir, file_path.Substring(context.FilesDir.AbsolutePath.Length));
            }
            else
            {
                f = new File(file_path);
            }

            if (f == null || !f.Exists())
            {
                return;
            }

            try
            {
                Android.Net.Uri file_uri = FileProvider.GetUriForFile(context, context.PackageName + ".provider", f);   // ★ #734: derived (see above)

                string mime_type = getMimeType(file_uri);

                Intent intent = new Intent(Intent.ActionView);
                intent.SetFlags(ActivityFlags.ClearTop | ActivityFlags.ClearWhenTaskReset | ActivityFlags.NewTask | ActivityFlags.GrantReadUriPermission);
                intent.SetDataAndType(file_uri, mime_type);

                context.StartActivity(Intent.CreateChooser(intent, "Open file with"));
            }
            catch (Exception e)
            {
                /* ★ Session Safety (S-4, P34): the exception TYPE only — `e` printed the path (and GetUriForFile's message
                 * names it too). A path outside the provider roots lands here as IllegalArgumentException: nothing opens.
                 * ★ Recorded (#46 r1, R3 m-2): no external-* root any more, so an OLD sent row whose stored path is on
                 * external storage (a physical /storage/... path from the picker, Android 9 and below) no longer opens —
                 * accepted, a walk row covers it. open() never stages a copy (Share only). */
                Logging.error("Exception occured while trying to open file (" + e.GetType().Name + ")");
            }
        }


    }
}
