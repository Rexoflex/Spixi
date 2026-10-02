using Android.Graphics;
using System;
using System.IO;

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
        private const int MaxLongSide = 2048;

        public static byte[]? makeJpeg(string path, int maxPx)
        {
            try
            {
                BitmapFactory.Options bounds = new BitmapFactory.Options { InJustDecodeBounds = true };
                BitmapFactory.DecodeFile(path, bounds);
                if (bounds.OutWidth <= 0 || bounds.OutHeight <= 0)
                {
                    return null;
                }
                int sample = 1;
                // the SHORT side stays ≥ maxPx; (#46 r1 A4) the LONG side is also bounded, so a 100 000 × 300 strip never
                // decodes at full size
                while ((bounds.OutWidth / (sample * 2) >= maxPx && bounds.OutHeight / (sample * 2) >= maxPx)
                    || Math.Max(bounds.OutWidth, bounds.OutHeight) / sample > MaxLongSide)
                {
                    sample *= 2;
                }
                using Bitmap? decoded = BitmapFactory.DecodeFile(path, new BitmapFactory.Options { InSampleSize = sample });
                if (decoded == null)
                {
                    return null;
                }
                int side = Math.Min(decoded.Width, decoded.Height);
                using Bitmap square = Bitmap.CreateBitmap(decoded, (decoded.Width - side) / 2, (decoded.Height - side) / 2, side, side);
                int target = Math.Min(maxPx, side);
                using Bitmap scaled = Bitmap.CreateScaledBitmap(square, target, target, true);
                using MemoryStream ms = new MemoryStream();
                if (!scaled.Compress(Bitmap.CompressFormat.Jpeg!, 60, ms))
                {
                    return null;
                }
                return ms.ToArray();
            }
            catch (Exception)
            {
                return null;
            }
        }
    }
}
