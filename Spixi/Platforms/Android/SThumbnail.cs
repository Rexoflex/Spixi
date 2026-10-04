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

        /* ★ #1166 V-3 (#1144 / #1145 (1)): the VIEWER image — the in-app full-screen viewer shows a picture of a LOCAL file
         * (ViewerImage.dataUriOf is the only caller; it sniffs the first bytes and caps the source at 20 MB first). Mirrors
         * makeJpeg: the decode is BOUNDED (bounds first, then a power-of-two sample so the decoded LONG side is ≤ 2 × maxEdge
         * and never above MaxLongSide — the full bitmap of a 50 MP photo is never built); the aspect ratio is KEPT (no
         * square crop); the long edge is scaled to ≤ maxEdge; the EXIF orientation is applied here (BitmapFactory ignores
         * it — the A9 limit of the tiles is not repeated in the viewer); JPEG q82; every bitmap is disposed. Called OFF the
         * UI thread. The path is C#'s own. Fail-soft: anything unexpected → null (the viewer keeps the thumbnail). */
        public static byte[]? makeViewerJpeg(string path, int maxEdge)
        {
            try
            {
                if (maxEdge <= 0)
                {
                    return null;
                }
                BitmapFactory.Options bounds = new BitmapFactory.Options { InJustDecodeBounds = true };
                BitmapFactory.DecodeFile(path, bounds);
                if (bounds.OutWidth <= 0 || bounds.OutHeight <= 0)
                {
                    return null;
                }
                int longSide = Math.Max(bounds.OutWidth, bounds.OutHeight);
                int decodeCap = Math.Min(maxEdge * 2, MaxLongSide);
                int sample = 1;
                while (longSide / sample > decodeCap)
                {
                    sample *= 2;
                }
                using Bitmap? decoded = BitmapFactory.DecodeFile(path, new BitmapFactory.Options { InSampleSize = sample });
                if (decoded == null || decoded.Width <= 0 || decoded.Height <= 0)
                {
                    return null;
                }
                int dw = decoded.Width;
                int dh = decoded.Height;
                double scale = Math.Min(1.0, (double)maxEdge / Math.Max(dw, dh));
                int tw = Math.Max(1, (int)Math.Round(dw * scale));
                int th = Math.Max(1, (int)Math.Round(dh * scale));
                using Matrix m = new Matrix();
                m.PostScale((float)tw / dw, (float)th / dh);
                applyOrientation(m, exifOrientation(path));
                // CreateBitmap maps the whole bitmap through the matrix and re-anchors the result at (0, 0)
                using Bitmap oriented = Bitmap.CreateBitmap(decoded, 0, 0, dw, dh, m, true);
                using MemoryStream ms = new MemoryStream();
                if (!oriented.Compress(Bitmap.CompressFormat.Jpeg!, 82, ms))
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

        /** The EXIF orientation (1–8) of a file; 1 when there is none or it cannot be read (PNG, GIF, a broken header). */
        private static int exifOrientation(string path)
        {
            try
            {
                using global::Android.Media.ExifInterface exif = new global::Android.Media.ExifInterface(path);
                int o = exif.GetAttributeInt("Orientation", 1);   // = ExifInterface.TAG_ORIENTATION; 1 = ORIENTATION_NORMAL
                return o >= 1 && o <= 8 ? o : 1;
            }
            catch (Exception)
            {
                return 1;
            }
        }

        /** Post-concatenate the display transform of EXIF orientation `o` (the ExifInterface ORIENTATION_* table). */
        private static void applyOrientation(Matrix m, int o)
        {
            switch (o)
            {
                case 2: m.PostScale(-1f, 1f); break;                       // FLIP_HORIZONTAL
                case 3: m.PostRotate(180f); break;                         // ROTATE_180
                case 4: m.PostScale(1f, -1f); break;                       // FLIP_VERTICAL
                case 5: m.PostRotate(90f); m.PostScale(-1f, 1f); break;    // TRANSPOSE
                case 6: m.PostRotate(90f); break;                          // ROTATE_90
                case 7: m.PostRotate(-90f); m.PostScale(-1f, 1f); break;   // TRANSVERSE
                case 8: m.PostRotate(-90f); break;                         // ROTATE_270
                default: break;                                            // NORMAL / UNDEFINED
            }
        }
    }
}
