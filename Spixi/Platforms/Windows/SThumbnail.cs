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

        private const int MaxLongSide = 2048;   // ★ #1166 V-3: the viewer image's ceiling (Android's makeJpeg guard)

        /* ★ #1166 V-3 (#1144 / #1145 (1)): the VIEWER image — the in-app full-screen viewer shows a picture of a LOCAL file
         * (ViewerImage.dataUriOf is the only caller; it sniffs the first bytes and caps the source at 20 MB first). Mirrors
         * makeJpeg: the decoder is asked for the SCALED frame (BitmapTransform — WIC scales while decoding, the makeJpeg
         * grammar), the long edge ≤ maxEdge (≤ MaxLongSide), the aspect ratio KEPT (no crop); the EXIF orientation is read
         * from the frame's System.Photo.Orientation and applied by ViewerRules.orientBgra (the decode itself IGNORES the
         * flag, as makeJpeg does — so the scaled size is unambiguous); JPEG q82; streams disposed. Called OFF the UI thread
         * (a thread-pool caller — no sync context to deadlock). The path is C#'s own. Fail-soft: anything → null.
         * ★ S9 (#1244): ALSO the photo encoder of the chat's media send (maxEdge 2048 = PhotoRules.MaxEdge = MaxLongSide):
         * the encoder gets raw pixels (SetPixelData) and no property set but the quality, so it writes NO EXIF / GPS. */
        public static byte[]? makeViewerJpeg(string path, int maxEdge)
        {
            try
            {
                return makeViewerAsync(path, maxEdge).GetAwaiter().GetResult();
            }
            catch (Exception)
            {
                return null;
            }
        }

        private static async Task<byte[]?> makeViewerAsync(string path, int maxEdge)
        {
            if (maxEdge <= 0)
            {
                return null;
            }
            StorageFile file = await StorageFile.GetFileFromPathAsync(path);
            using IRandomAccessStream input = await file.OpenReadAsync();
            BitmapDecoder decoder = await BitmapDecoder.CreateAsync(input);
            uint w = decoder.PixelWidth;
            uint h = decoder.PixelHeight;
            if (w == 0 || h == 0)
            {
                return null;
            }
            double scale = Math.Min(1.0, (double)Math.Min(maxEdge, MaxLongSide) / Math.Max(w, h));
            uint sw = (uint)Math.Max(1, Math.Round(w * scale));
            uint sh = (uint)Math.Max(1, Math.Round(h * scale));
            BitmapTransform transform = new BitmapTransform
            {
                ScaledWidth = sw,
                ScaledHeight = sh,
                InterpolationMode = BitmapInterpolationMode.Fant,
            };
            PixelDataProvider pixels = await decoder.GetPixelDataAsync(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied,
                transform, ExifOrientationMode.IgnoreExifOrientation, ColorManagementMode.DoNotColorManage);
            byte[] raw = pixels.DetachPixelData();
            int orientation = await orientationOf(decoder);
            byte[] oriented = SPIXI.ViewerRules.orientBgra(raw, (int)sw, (int)sh, orientation, out int ow, out int oh);
            using InMemoryRandomAccessStream output = new InMemoryRandomAccessStream();
            BitmapPropertySet props = new BitmapPropertySet
            {
                { "ImageQuality", new BitmapTypedValue(0.82, Windows.Foundation.PropertyType.Single) },
            };
            BitmapEncoder encoder = await BitmapEncoder.CreateAsync(BitmapEncoder.JpegEncoderId, output, props);
            encoder.SetPixelData(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied, (uint)ow, (uint)oh, 96, 96, oriented);
            await encoder.FlushAsync();
            byte[] bytes = new byte[output.Size];
            using DataReader reader = new DataReader(output.GetInputStreamAt(0));
            await reader.LoadAsync((uint)output.Size);
            reader.ReadBytes(bytes);
            return bytes;
        }

        /** The frame's EXIF orientation (1–8); 1 when the format has none (PNG, GIF, BMP) or the read fails. */
        private static async Task<int> orientationOf(BitmapDecoder decoder)
        {
            try
            {
                const string key = "System.Photo.Orientation";
                BitmapPropertySet found = await decoder.BitmapProperties.GetPropertiesAsync(new[] { key });
                if (found.TryGetValue(key, out BitmapTypedValue? v) && v != null && v.Value != null)
                {
                    int o = Convert.ToInt32(v.Value, System.Globalization.CultureInfo.InvariantCulture);
                    return o >= 1 && o <= 8 ? o : 1;
                }
            }
            catch (Exception)
            {
            }
            return 1;
        }
    }
}
