using Foundation;
using IXICore.Meta;
using Microsoft.Maui.Devices;
using Microsoft.Maui.Storage;
using SPIXI.Interfaces;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using UIKit;

namespace Spixi
{
    public class SFilePicker
    {
        /* ★★ #1086 (#46 r1 MAJOR, with B1): UIImagePickerController is NOT supported in the Catalyst
         * MAC idiom (UIDeviceFamily 6) — presenting it raises an NSException, and onChangeAvatarAsync has
         * no try around the call. The Mac picks an image through the same MAUI FilePicker (a Finder panel,
         * the desktop convention) with the image filter. The old UIImagePickerController handlers are gone.
         *
         * #46 r2 m1: the Finder panel hands back the FILE, and a Mac photo is usually HEIC. The media path
         * sends the picked bytes as they are, so an Android or Windows peer would get a file it cannot show.
         * The iOS picker always re-encodes to JPEG (image.AsJPEG) — the Mac does the same for any format
         * other than JPEG, PNG and GIF (GIF is kept: re-encoding would drop the animation). */
        /* r3 m3: the image types UIImage can decode — FilePickerFileType.Images also admits SVG and others that
         * would decode to null and be dropped with no feedback. */
        static readonly FilePickerFileType MacPickableImages = new FilePickerFileType(new Dictionary<DevicePlatform, IEnumerable<string>>
        {
            { DevicePlatform.MacCatalyst, new[] { "public.jpeg", "public.png", "com.compuserve.gif", "public.heic", "public.heif", "public.tiff", "com.microsoft.bmp", "org.webmproject.webp" } },
        });

        public static async Task<SpixiImageData?> PickImageAsync()
        {
            FileResult? fileData = await FilePicker.PickAsync(new PickOptions { FileTypes = MacPickableImages });
            if (fileData == null)
                return null; // user cancelled

            string name = Path.GetFileName(fileData.FullPath);
            string ext = Path.GetExtension(name).ToLowerInvariant();
            if (ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".gif")
            {
                return new SpixiImageData() { name = name, path = fileData.FullPath, stream = await fileData.OpenReadAsync() };
            }

            string fullPath = fileData.FullPath;
            // r3 m1: a 12–48 MP decode + encode is off the UI thread
            NSData? jpeg = await Task.Run(() =>
            {
                try
                {
                    using (UIImage? image = UIImage.FromFile(fullPath))
                    {
                        return image?.AsJPEG(0.9f);
                    }
                }
                catch (Exception e)
                {
                    Logging.error("Mac image pick: re-encode to JPEG failed: " + e.Message);
                    return null;
                }
            });
            if (jpeg == null)
            {
                Logging.warn("Mac image pick: the picked image could not be decoded, it was not sent");
                return null;
            }
            string jpgName = Path.GetFileNameWithoutExtension(name) + ".jpg";
            // path "" = the transfer reads the stream, not the original file (the iOS picker's shape; the sender keeps
            // no local copy for a preview after a restart — same as iOS, recorded)
            return new SpixiImageData() { name = jpgName, path = "", stream = jpeg.AsStream() };
        }

        public static async Task<SpixiImageData?> PickFileAsync()
        {
            FileResult? fileData = await FilePicker.PickAsync();
            if (fileData == null)
                return null; // User canceled file picking

            SpixiImageData spixi_img_data = new SpixiImageData() { name = Path.GetFileName(fileData.FullPath), path = fileData.FullPath, stream = await fileData.OpenReadAsync() };

            // Return Task object
            return spixi_img_data;
        }

        /* ★ S9 (#1244, CONTRACT §1b `ixian:sendmedia`): the chat's PHOTO pick on the Mac — the Finder panel with multiple
         * selection (MAUI FilePicker.PickMultipleAsync, the image types above). Streams are the files as they are: C# decodes
         * HEIC / PNG / … itself (SThumbnail.makeViewerJpeg, ImageIO) and re-encodes once to the #1158 rule. Items past `max`
         * are counted (an entry with no stream) so the caller can say `tooMany`. Cancel → an empty list. */
        public static async Task<List<SpixiImageData>> PickImagesAsync(int max)
        {
            List<SpixiImageData> picked = new List<SpixiImageData>();
            IEnumerable<FileResult?>? results = await FilePicker.PickMultipleAsync(new PickOptions { FileTypes = MacPickableImages });
            if (results == null)
            {
                return picked;
            }
            foreach (FileResult? r in results)
            {
                if (r == null)
                {
                    continue;
                }
                Stream? st = null;
                if (picked.Count < max)
                {
                    try
                    {
                        st = await r.OpenReadAsync();
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

        /** ★ S9 (#1244): no camera capture on the Mac (the shell gets no `camera` cap there). */
        public static Task<SpixiImageData?> CapturePhotoAsync(long cap)
        {
            return Task.FromResult<SpixiImageData?>(null);
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
