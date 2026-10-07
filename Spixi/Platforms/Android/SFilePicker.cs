using System.IO;
using System.Threading.Tasks;
using Android.Content;
using SPIXI.Interfaces;
using Android.Graphics;
using System;
using System.Collections.Generic;
using Microsoft.Maui.Storage;
using Microsoft.Maui.Media;
using Microsoft.Maui.ApplicationModel;

namespace Spixi
{
    public class SFilePicker
    {
        public static Task<SpixiImageData?> PickImageAsync()
        {
            // Define the Intent for getting images
            Intent intent = new Intent();
            intent.SetType("image/*");
            intent.SetAction(Intent.ActionGetContent);

            // Get the MainActivity instance
            MainActivity activity = MainActivity.Instance;

            // #334 AND-21: our own picker intent pauses the app — don't trip the
            // resume lock on the way back (one-shot, time-bounded in App).
            App.noteOwnIntentRoundTrip();

            try
            {
                // Start the picture-picker activity (resumes in MainActivity.cs)
                activity.StartActivityForResult(
                    Intent.CreateChooser(intent, "Select Picture"),
                    MainActivity.PickImageId);
            }
            catch (Exception)
            {
                App.clearOwnIntentStamp();   // loop MINOR-4: no round-trip → no suppression
                throw;
            }

            // Save the TaskCompletionSource object as a MainActivity property
            activity.PickImageTaskCompletionSource = new TaskCompletionSource<SpixiImageData?>();

            // Return Task object
            return activity.PickImageTaskCompletionSource.Task;
        }

        public static async Task<SpixiImageData?> PickFileAsync()
        {
            // #334 AND-21: same one-shot suppression as PickImageAsync — the file
            // picker round-trip is the exact flow Damir hit ("unlock to send a file").
            App.noteOwnIntentRoundTrip();
            FileResult? fileData;
            try
            {
                fileData = await FilePicker.PickAsync();
            }
            catch (Exception)
            {
                App.clearOwnIntentStamp();   // loop MINOR-4: no round-trip → no suppression
                throw;
            }
            if (fileData == null)
                return null; // User canceled file picking

            SpixiImageData spixi_img_data = new SpixiImageData() { name = fileData.FileName, path = fileData.FullPath, stream = await fileData.OpenReadAsync() };

            // Return Task object
            return spixi_img_data;
        }

        /* ★ S9 (#1244, CONTRACT §1b `ixian:sendmedia`): the chat's PHOTO pick — several images in one go. ACTION_GET_CONTENT
         * image/* with EXTRA_ALLOW_MULTIPLE (no storage permission; Android 13+ routes it to the system photo picker). The
         * result (MainActivity.OnActivityResult, PickImagesId) opens a content-resolver stream per uri for the first `max`
         * items — the uri's path is NEVER kept (V-14 / #1200: it is not a file) — and adds an empty entry per extra item, so
         * the caller can say `tooMany`. Cancel → an empty list. */
        public static Task<List<SpixiImageData>> PickImagesAsync(int max)
        {
            Intent intent = new Intent(Intent.ActionGetContent);
            intent.SetType("image/*");
            intent.AddCategory(Intent.CategoryOpenable);
            intent.PutExtra(Intent.ExtraAllowMultiple, true);

            MainActivity activity = MainActivity.Instance;
            TaskCompletionSource<List<SpixiImageData>> tcs = new TaskCompletionSource<List<SpixiImageData>>();
            MainActivity.PickImagesMax = max;
            // ★ #46 r1 m-9: an older pick that never got its result is answered (empty) — its caller's busy flag is released
            MainActivity.PickImagesTaskCompletionSource?.TrySetResult(new List<SpixiImageData>());
            MainActivity.PickImagesTaskCompletionSource = tcs;   // set BEFORE the start: the result can never find it unset

            App.noteOwnIntentRoundTrip();   // #334 AND-21: our own picker intent must not trip the resume lock
            try
            {
                activity.StartActivityForResult(Intent.CreateChooser(intent, "Select Pictures"), MainActivity.PickImagesId);
            }
            catch (Exception)
            {
                App.clearOwnIntentStamp();
                MainActivity.PickImagesTaskCompletionSource = null;
                throw;
            }
            return tcs.Task;
        }

        /* ★ S9 (#1244, `ixian:camera`): one photo from the camera — MAUI MediaPicker.CapturePhotoAsync (ACTION_IMAGE_CAPTURE
         * into MAUI's own FileProvider temp file; the manifest's <queries> names the intent). The camera permission is asked
         * FIRST (so the system dialog does not use up the own-intent stamp), a refusal throws PermissionException (the caller
         * pushes `cameraDenied`). The captured file holds the camera's EXIF (GPS): it is read into memory (≤ cap + 1 bytes)
         * and DELETED at once — the encoder works from C#'s own copy. Cancel → null. */
        /** ★ #46 r1 (shell auditor): the Camera tile only on a device that has a camera. */
        public static bool CameraAvailable()
        {
            try
            {
                return MediaPicker.Default.IsCaptureSupported;
            }
            catch (Exception)
            {
                return false;
            }
        }

        public static async Task<SpixiImageData?> CapturePhotoAsync(long cap)
        {
            if (!MediaPicker.Default.IsCaptureSupported)
            {
                throw new FeatureNotSupportedException();
            }
            PermissionStatus status = await Permissions.CheckStatusAsync<Permissions.Camera>();
            if (status != PermissionStatus.Granted)
            {
                status = await Permissions.RequestAsync<Permissions.Camera>();
            }
            if (status != PermissionStatus.Granted)
            {
                throw new PermissionException("camera");
            }
            /* ★ #46 r1 m-8: on Android ≤ 12 MAUI's CaptureAsync ALSO asks StorageWrite (MediaPicker.android.cs) — asked here,
             * BEFORE the own-intent stamp, so its system dialog cannot use the stamp up; a refusal is the camera's refusal. */
            if (!OperatingSystem.IsAndroidVersionAtLeast(33))
            {
                PermissionStatus storage = await Permissions.CheckStatusAsync<Permissions.StorageWrite>();
                if (storage != PermissionStatus.Granted)
                {
                    storage = await Permissions.RequestAsync<Permissions.StorageWrite>();
                }
                if (storage != PermissionStatus.Granted)
                {
                    throw new PermissionException(SPIXI.PhotoRules.StorageDeniedMarker);   // ★ #46 r2 n2 → storageDenied
                }
            }
            App.noteOwnIntentRoundTrip();
            FileResult? shot;
            try
            {
                shot = await MediaPicker.Default.CapturePhotoAsync();
            }
            catch (Exception)
            {
                App.clearOwnIntentStamp();
                throw;
            }
            if (shot == null)
            {
                return null;
            }
            string tmp = shot.FullPath;
            // ★ #46 r1 m-6: the read (and the delete of the camera's EXIF-carrying temp file) runs OFF the UI thread
            return await Task.Run(() =>
            {
                try
                {
                    using (Stream src = File.OpenRead(tmp))
                    {
                        return new SpixiImageData() { name = "", path = "", stream = readBounded(src, cap) };
                    }
                }
                finally
                {
                    try { File.Delete(tmp); } catch (Exception) { }
                }
            });
        }

        /** Read at most cap + 1 bytes into memory (a longer source is visible to the caller as Length > cap). */
        internal static MemoryStream readBounded(Stream src, long cap)
        {
            MemoryStream ms = new MemoryStream();
            byte[] buf = new byte[81920];
            long left = cap + 1;
            while (left > 0)
            {
                int n = src.Read(buf, 0, (int)Math.Min(buf.Length, left));
                if (n <= 0)
                {
                    break;
                }
                ms.Write(buf, 0, n);
                left -= n;
            }
            ms.Position = 0;
            return ms;
        }

        public static byte[] ResizeImage(byte[] image_data, int new_width, int new_height, int quality)
        {
            Bitmap original_image = BitmapFactory.DecodeByteArray(image_data, 0, image_data.Length);

            if (original_image == null)
            {
                return null;
            }

            // Calculate crop section

            int orig_width = original_image.Width;
            int orig_height = original_image.Height;

            float width_ratio = (float)new_width / orig_width;
            float height_ratio = (float)new_height / orig_height;

            float ratio = Math.Max(width_ratio, height_ratio);

            int resized_pre_crop_width = (int)Math.Round(orig_width * ratio);
            int resized_pre_crop_height = (int)Math.Round(orig_height * ratio);

            // full area to crop on resized image
            int resized_crop_x = resized_pre_crop_width - new_width;
            int resized_crop_y = resized_pre_crop_height - new_height;

            int cropped_width = (int)((resized_pre_crop_width - resized_crop_x) / ratio);
            int cropped_height = (int)((resized_pre_crop_height - resized_crop_y) / ratio);

            // half of area to crop on original image
            int crop_x = (int)(resized_crop_x / ratio / 2);
            int crop_y = (int)(resized_crop_y / ratio / 2);

            // End of calculate crop section

            Bitmap cropped_image = Bitmap.CreateBitmap(original_image, crop_x, crop_y, cropped_width, cropped_height);
            Bitmap resized_image = Bitmap.CreateScaledBitmap(cropped_image, new_width, new_height, false);

            using (MemoryStream ms = new MemoryStream())
            {
                resized_image.Compress(Bitmap.CompressFormat.Jpeg, quality, ms);
                resized_image.Dispose();
                cropped_image.Dispose();
                return ms.ToArray();
            }
        }

    }
}
