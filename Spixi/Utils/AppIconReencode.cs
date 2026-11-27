using SPIXI.Meta;
using System;
using System.IO;
using System.Threading.Tasks;
#if ANDROID
using AG = Android.Graphics;
#elif IOS || MACCATALYST
using ImageIO;
#elif WINDOWS
using Windows.Graphics.Imaging;
#endif

namespace SPIXI
{
    /* The home screen's mini-app icons (switch MacfixaFlags.AppIconReencode). The home WebView also holds the wallet: it
     * gets only a small PNG that C# made, never the package's own icon bytes. AppIconRules.get gives the copy; a missing
     * one is made once per install or update with the platform decoder below, on a pool thread that holds no lock. */
    public static class AppIconReencode
    {
        private static int ready, taken;   // a copy was made since the last apps push · this push runs only for it

        /** HomePage.loadApps, its early return: true = a copy was made, push the apps again (the list did not change). */
        public static bool takeReady() => (taken = System.Threading.Interlocked.Exchange(ref ready, 0)) != 0;
        /** HomePage.loadApps, after the push: true = this push ran only for new copies, so no chat page is reloaded. */
        public static bool tookReady() => System.Threading.Interlocked.Exchange(ref taken, 0) != 0;

        /** HomePage.loadApps (inside its locks, any thread): the data URI of the small copy of this app's icon, or ""
         *  (the shell's default icon) for a missing, broken or oversized one. Nothing is decoded here: a source with no
         *  copy gives "" now and ONE decode on the pool; a copy made there raises `ready`. Never throws. */
        public static string homeIcon(string appId, string iconPath)
        {
            string uri = AppIconRules.get(Path.Combine(Config.spixiUserFolder, "html", "Apps", AppIconRules.FolderName), appId, iconPath, false, platformCopy, out Func<bool>? later);
            if (later != null) Task.Run(() => { if (later()) System.Threading.Volatile.Write(ref ready, 1); });
            return uri;
        }

        /* Checked bytes (AppIconRules.sourceOk: PNG or JPEG, at most 1 MB) → a PNG with the long side at most `side`, or
         * null. Each platform reads the declared size first, refuses one over the cap, and never builds the full-size
         * bitmap of a big picture. */
#if ANDROID
        private static byte[]? platformCopy(byte[] data, int side)
        {
            AG.BitmapFactory.Options bounds = new AG.BitmapFactory.Options { InJustDecodeBounds = true };
            AG.BitmapFactory.DecodeByteArray(data, 0, data.Length, bounds);
            if (!AppIconRules.dimsOk(bounds.OutWidth, bounds.OutHeight)) return null;
            using AG.Bitmap? full = AG.BitmapFactory.DecodeByteArray(data, 0, data.Length, new AG.BitmapFactory.Options { InSampleSize = PhotoRules.decodeSample(Math.Max(bounds.OutWidth, bounds.OutHeight), side) });
            if (full == null) return null;
            (int w, int h) = AppIconRules.fit(full.Width, full.Height, side);
            using AG.Bitmap small = AG.Bitmap.CreateScaledBitmap(full, w, h, true)!;   // `full` itself when the size is equal (a second Dispose is a no-op)
            using MemoryStream ms = new MemoryStream();
            return small.Compress(AG.Bitmap.CompressFormat.Png!, 100, ms) ? ms.ToArray() : null;
        }
#elif IOS || MACCATALYST
        private static byte[]? platformCopy(byte[] data, int side)
        {
            using Foundation.NSData raw = Foundation.NSData.FromArray(data);
            using CGImageSource? src = CGImageSource.FromData(raw);
            CoreGraphics.CGImageProperties? props = src?.GetProperties(0);
            if (src == null || !AppIconRules.dimsOk(props?.PixelWidth ?? 0, props?.PixelHeight ?? 0)) return null;
            // ImageIO's thumbnail path scales while it decodes
            using CoreGraphics.CGImage? small = src.CreateThumbnail(0, new CGImageThumbnailOptions { MaxPixelSize = side, CreateThumbnailFromImageAlways = true, CreateThumbnailWithTransform = true, ShouldCacheImmediately = true });
            if (small == null) return null;
            // drawn again into a fresh sRGB bitmap: no colour profile of the source reaches the PNG
            using CoreGraphics.CGColorSpace srgb = CoreGraphics.CGColorSpace.CreateSrgb();
            using CoreGraphics.CGBitmapContext clean = new CoreGraphics.CGBitmapContext(null, small.Width, small.Height, 8, 0, srgb, CoreGraphics.CGImageAlphaInfo.PremultipliedLast);
            clean.ClearRect(new CoreGraphics.CGRect(0, 0, small.Width, small.Height));
            clean.DrawImage(new CoreGraphics.CGRect(0, 0, small.Width, small.Height), small);
            using UIKit.UIImage image = new UIKit.UIImage(clean.ToImage()!);
            using Foundation.NSData? png = image.AsPNG();
            return png?.ToArray();
        }
#elif WINDOWS
        private static byte[]? platformCopy(byte[] data, int side) => copyAsync(data, side).GetAwaiter().GetResult();   // a thread-pool caller: no sync context to deadlock

        private static async Task<byte[]?> copyAsync(byte[] data, int side)
        {
            using Windows.Storage.Streams.IRandomAccessStream input = new MemoryStream(data, false).AsRandomAccessStream();
            // the codec is named by the checked first bytes: Windows tries no other installed codec
            BitmapDecoder decoder = await BitmapDecoder.CreateAsync(AppIconRules.isPng(data) ? BitmapDecoder.PngDecoderId : BitmapDecoder.JpegDecoderId, input);
            if (!AppIconRules.dimsOk((int)decoder.PixelWidth, (int)decoder.PixelHeight)) return null;
            (int w, int h) = AppIconRules.fit((int)decoder.PixelWidth, (int)decoder.PixelHeight, side);
            // the decoder is asked for the scaled frame (WIC scales while it decodes); raw pixels go to the encoder: no profile
            PixelDataProvider pixels = await decoder.GetPixelDataAsync(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Straight, new BitmapTransform { ScaledWidth = (uint)w, ScaledHeight = (uint)h, InterpolationMode = BitmapInterpolationMode.Fant }, ExifOrientationMode.IgnoreExifOrientation, ColorManagementMode.DoNotColorManage);
            using Windows.Storage.Streams.InMemoryRandomAccessStream output = new Windows.Storage.Streams.InMemoryRandomAccessStream();
            BitmapEncoder encoder = await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId, output);
            encoder.SetPixelData(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Straight, (uint)w, (uint)h, 96, 96, pixels.DetachPixelData());
            await encoder.FlushAsync();
            byte[] png = new byte[output.Size];
            await output.GetInputStreamAt(0).AsStreamForRead().ReadExactlyAsync(png);
            return png;
        }
#endif
    }
}
