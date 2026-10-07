using Foundation;
using IXICore.Meta;
using Microsoft.Maui.Storage;
using Microsoft.Maui.Media;
using Microsoft.Maui.ApplicationModel;
using System.Collections.Generic;
using Spixi.Platform.iOS;
using SPIXI.Interfaces;
using System;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using UIKit;

namespace Spixi
{
    public class SFilePicker
    {
        static TaskCompletionSource<SpixiImageData?> taskCompletionSource;
        static UIImagePickerController imagePicker;

        public static Task<SpixiImageData?> PickImageAsync()
        {
            // Create and define UIImagePickerController
            imagePicker = new UIImagePickerController
            {
                SourceType = UIImagePickerControllerSourceType.PhotoLibrary,
                MediaTypes = UIImagePickerController.AvailableMediaTypes(UIImagePickerControllerSourceType.PhotoLibrary)
            };

            // Set event handlers
            imagePicker.FinishedPickingMedia += OnImagePickerFinishedPickingMedia;
            imagePicker.Canceled += OnImagePickerCancelled;

            // Present UIImagePickerController;
            UIWindow window = UIApplication.SharedApplication.KeyWindow;
            var viewController = window.RootViewController;
            viewController.PresentModalViewController(imagePicker, true);

            // Return Task object
            taskCompletionSource = new TaskCompletionSource<SpixiImageData?>();
            return taskCompletionSource.Task;
        }

        public static async Task<SpixiImageData?> PickFileAsync()
        {
            FileResult? fileData = (await MauiFilePicker.PickAsync(new PickOptions(), false)).FirstOrDefault();
            if (fileData == null)
                return null; // User canceled file picking

            SpixiImageData spixi_img_data = new SpixiImageData() { name = Path.GetFileName(fileData.FullPath), path = fileData.FullPath, stream = await fileData.OpenReadAsync() };

            // Return Task object
            return spixi_img_data;
        }

        /* ★ S9 (#1244, CONTRACT §1b `ixian:sendmedia`): the chat's PHOTO pick — PHPickerViewController with selectionLimit =
         * max, images only (MAUI MediaPicker.PickPhotosAsync, Essentials MediaPicker.ios.cs PhotosAsync: PHPickerConfiguration
         * { Filter = ImagesFilter, SelectionLimit }; PHPicker needs NO photo-library permission). Each result's stream is the
         * item provider's data in its own format (HEIC / JPEG / PNG — no lossy AsJPEG(1) here; C# re-encodes once, to the
         * #1158 rule). Cancel / swipe-down → an empty list. Must start on the main thread. */
        public static async Task<List<SpixiImageData>> PickImagesAsync(int max)
        {
            List<SpixiImageData> picked = new List<SpixiImageData>();
            List<FileResult>? results = await MediaPicker.Default.PickPhotosAsync(new MediaPickerOptions { SelectionLimit = max });
            if (results == null)
            {
                return picked;
            }
            for (int i = 0; i < results.Count; i++)
            {
                Stream? st = null;
                if (i < max && results[i] != null)
                {
                    try
                    {
                        st = await results[i].OpenReadAsync();
                    }
                    catch (Exception e)
                    {
                        Logging.warn("Photo pick: a picked item could not be opened (" + e.GetType().Name + ")");
                    }
                }
                picked.Add(new SpixiImageData() { name = "", path = "", stream = st });
            }
            return picked;
        }

        /** ★ #46 r1 (shell auditor): the Camera tile only on a device that has a camera. */
        public static bool CameraAvailable()
        {
            return UIImagePickerController.IsSourceTypeAvailable(UIImagePickerControllerSourceType.Camera);
        }

        /* ★ S9 (#1244, `ixian:camera`) · #46 r1 M-1: one photo from the camera with a NATIVE UIImagePickerController (camera
         * source). MAUI's CapturePhotoAsync asks Permissions.PhotosAddOnly (MediaPicker.ios.cs PhotoAsync, the !pickExisting
         * branch) — Info.plist has no NSPhotoLibraryAddUsageDescription, so every capture was refused — and with no options
         * it encodes the full-size image (quality 100) on the main thread. Here: ONLY the camera permission (Permissions.Camera
         * = AVCaptureDevice), OriginalImage taken, and the image drawn at ≤ PhotoRules.MaxEdge (orientation applied by the
         * draw) + JPEG-encoded OFF the UI thread (q95 — the #1158 encoder re-encodes once at q82). No photo-library access,
         * nothing saved to the library. A refusal throws PermissionException (→ `cameraDenied`). Cancel → null. */
        public static async Task<SpixiImageData?> CapturePhotoAsync(long cap)
        {
            if (!CameraAvailable())
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
            TaskCompletionSource<UIImage?> tcs = new TaskCompletionSource<UIImage?>();
            UIImagePickerController camera = new UIImagePickerController
            {
                SourceType = UIImagePickerControllerSourceType.Camera,
                MediaTypes = new[] { "public.image" },
                AllowsEditing = false,
            };
            camera.FinishedPickingMedia += (sender, args) =>
            {
                UIImage? shot = args.OriginalImage;
                camera.DismissViewController(true, null);
                tcs.TrySetResult(shot);
            };
            camera.Canceled += (sender, args) =>
            {
                camera.DismissViewController(true, null);
                tcs.TrySetResult(null);
            };
            UIViewController? host = Microsoft.Maui.ApplicationModel.WindowStateManager.Default.GetCurrentUIViewController();   // the call MauiFilePicker.cs:50 already makes
            if (host == null)
            {
                return null;
            }
            host.PresentViewController(camera, true, null);
            UIImage? image = await tcs.Task;
            if (image == null)
            {
                return null;
            }
            byte[]? jpeg = await Task.Run(() => drawBounded(image));
            if (jpeg == null || jpeg.Length == 0)
            {
                return null;
            }
            return new SpixiImageData() { name = "", path = "", stream = new MemoryStream(jpeg, false) };
        }

        /** OFF the UI thread: draw the camera image at ≤ PhotoRules.MaxEdge px (UIGraphicsImageRenderer is thread-safe; the
         *  draw applies the orientation) and encode JPEG q95 — no source metadata is carried. null on any failure. */
        private static byte[]? drawBounded(UIImage image)
        {
            try
            {
                double w = image.Size.Width * image.CurrentScale;
                double h = image.Size.Height * image.CurrentScale;
                if (w <= 0 || h <= 0)
                {
                    return null;
                }
                double k = Math.Min(1.0, SPIXI.PhotoRules.MaxEdge / Math.Max(w, h));
                CoreGraphics.CGSize target = new CoreGraphics.CGSize(Math.Max(1, Math.Round(w * k)), Math.Max(1, Math.Round(h * k)));
                UIGraphicsImageRendererFormat format = new UIGraphicsImageRendererFormat { Scale = 1, Opaque = true };
                using UIGraphicsImageRenderer renderer = new UIGraphicsImageRenderer(target, format);
                using UIImage drawn = renderer.CreateImage((ctx) => image.Draw(new CoreGraphics.CGRect(0, 0, target.Width, target.Height)));
                using NSData? data = drawn.AsJPEG(0.95f);
                return data?.ToArray();
            }
            catch (Exception e)
            {
                Logging.warn("Camera: the photo could not be drawn (" + e.GetType().Name + ")");
                return null;
            }
            finally
            {
                image.Dispose();
            }
        }

        static void OnImagePickerFinishedPickingMedia(object sender, UIImagePickerMediaPickedEventArgs args)
        {
            UIImage image = args.EditedImage ?? args.OriginalImage;

            if (image != null)
            {
                // Convert UIImage to .NET Stream object
                NSData data = image.AsJPEG(1);

                SpixiImageData spixi_img_data = new SpixiImageData() { name = Path.GetFileName(args.ImageUrl.AbsoluteString), path = "", stream = data.AsStream() };

                // Set the Stream as the completion of the Task
                taskCompletionSource.SetResult(spixi_img_data);
            }
            else
            {
                var videoURL = (NSUrl)args.Info.ObjectForKey(UIImagePickerController.MediaURL);
                NSData videoData = NSData.FromUrl(videoURL);

                SpixiImageData spixi_img_data = new SpixiImageData() { name = Path.GetFileName(videoURL.AbsoluteString), path = "", stream = videoData.AsStream() };

                // Set the Stream as the completion of the Task
                taskCompletionSource.SetResult(spixi_img_data);
            }
            imagePicker.DismissModalViewController(true);
        }

        static void OnImagePickerCancelled(object sender, EventArgs args)
        {
            taskCompletionSource.SetResult(null);
            imagePicker.DismissModalViewController(true);
        }

        public static byte[] ResizeImage(byte[] image_data, int new_width, int new_height, int quality)
        {
            UIImage original_image = ImageFromByteArray(image_data);

            if (original_image == null)
            {
                return null;
            }

            // Calculate crop section

            float orig_width = (float)original_image.Size.Width;
            float orig_height = (float)original_image.Size.Height;

            float width_ratio = new_width / orig_width;
            float height_ratio = new_height / orig_height;

            float ratio = (float)Math.Max(width_ratio, height_ratio);

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

            UIGraphics.BeginImageContext(new System.Drawing.SizeF(cropped_width, cropped_height));
            var context = UIGraphics.GetCurrentContext();
            var clippedRect = new RectangleF(0, 0, cropped_width, cropped_height);
            context.ClipToRect(clippedRect);
            var imgSize = original_image.Size;
            var drawRect = new RectangleF(-crop_x, -crop_y, (float)imgSize.Width, (float)imgSize.Height);
            original_image.Draw(drawRect);
            var cropped_image = UIGraphics.GetImageFromCurrentImageContext();
            UIGraphics.EndImageContext();

            UIGraphics.BeginImageContext(new System.Drawing.SizeF(new_width, new_height));
            cropped_image.Draw(new RectangleF(0, 0, new_width, new_height));
            var resized_image = UIGraphics.GetImageFromCurrentImageContext();
            UIGraphics.EndImageContext();

            var bytes_imagen = resized_image.AsJPEG((NFloat)quality / 100).ToArray();
            resized_image.Dispose();
            cropped_image.Dispose();

            return bytes_imagen;
        }

        public static UIKit.UIImage ImageFromByteArray(byte[] data)
        {
            if (data == null)
            {
                return null;
            }

            UIKit.UIImage image;
            try
            {
                image = new UIKit.UIImage(Foundation.NSData.FromArray(data));
            }
            catch (Exception e)
            {
                Logging.error("Exception occured in ImageFromBytes: " + e);
                return null;
            }

            return image;
        }

    }
}
