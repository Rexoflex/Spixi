using System;
using System.Threading.Tasks;
using Windows.Graphics.Imaging;
using Windows.Storage;
using Windows.Storage.Streams;

namespace Spixi
{
/* ★ G-6b (#1121, Damir 2026-10-02: "media tiles but empty tiles, so I don't know which file is which"). SharedItems sent the WHOLE
 * original as the tile image and only when it was ≤ 300 KB — a phone photo (1–5 MB) never had a preview. This makes a
 * real SMALL thumbnail: a square centre crop, about maxPx on a side, JPEG. The decode is BOUNDED (the full-size bitmap is
 * never built — the audit A-11 hazard ResizeImage still has), so 60 big photos cannot exhaust memory. Called OFF the UI
 * thread (SharedItems.scan runs on Task.Run). The path is C#'s own (the received-media rule) — never a WebView value.
 * Fail-soft: anything unexpected → null (the tile keeps its glyph). SharedItems checks the file's first bytes before
 * calling this (#46 r1 A2). EXIF rotation: applied on iOS / Mac (CreateThumbnailWithTransform); NOT on Android / Windows (a
 * known limit — a portrait photo can show sideways on those tiles, #46 r1 A9). */
    public static class SThumbnail
    {
        public static byte[]? makeJpeg(string path, int maxPx)
        {
            try
            {
                return makeAsync(path, maxPx).GetAwaiter().GetResult();   // a thread-pool caller (no sync context to deadlock)
            }
            catch (Exception)
            {
                return null;
            }
        }

        private static async Task<byte[]?> makeAsync(string path, int maxPx)
        {
            StorageFile file = await StorageFile.GetFileFromPathAsync(path);
            using IRandomAccessStream input = await file.OpenReadAsync();
            BitmapDecoder decoder = await BitmapDecoder.CreateAsync(input);
            uint w = decoder.PixelWidth;
            uint h = decoder.PixelHeight;
            if (w == 0 || h == 0)
            {
                return null;
            }
            double scale = Math.Min(1.0, (double)maxPx / Math.Min(w, h));
            uint sw = (uint)Math.Max(1, Math.Round(w * scale));
            uint sh = (uint)Math.Max(1, Math.Round(h * scale));
            uint side = Math.Min(sw, sh);
            BitmapTransform transform = new BitmapTransform
            {
                ScaledWidth = sw,
                ScaledHeight = sh,
                InterpolationMode = BitmapInterpolationMode.Fant,
                Bounds = new BitmapBounds { X = (sw - side) / 2, Y = (sh - side) / 2, Width = side, Height = side },
            };
            PixelDataProvider pixels = await decoder.GetPixelDataAsync(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied,
                transform, ExifOrientationMode.IgnoreExifOrientation, ColorManagementMode.DoNotColorManage);
            using InMemoryRandomAccessStream output = new InMemoryRandomAccessStream();
            BitmapPropertySet props = new BitmapPropertySet
            {
                { "ImageQuality", new BitmapTypedValue(0.6, Windows.Foundation.PropertyType.Single) },
            };
            BitmapEncoder encoder = await BitmapEncoder.CreateAsync(BitmapEncoder.JpegEncoderId, output, props);
            encoder.SetPixelData(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied, side, side, 96, 96, pixels.DetachPixelData());
            await encoder.FlushAsync();
            byte[] bytes = new byte[output.Size];
            using DataReader reader = new DataReader(output.GetInputStreamAt(0));
            await reader.LoadAsync((uint)output.Size);
            reader.ReadBytes(bytes);
            return bytes;
        }
    }
}
