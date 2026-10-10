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
         * makeJpeg: the decode is BOUNDED (bounds first, then a power-of-two sample so the decoded LONG side is ≥ maxEdge and
         * < 2 × maxEdge — S9 PhotoRules.decodeSample; the full bitmap of a 50 MP photo is never built); the aspect ratio is KEPT (no
         * square crop); the long edge is scaled to ≤ maxEdge; the EXIF orientation is applied here (BitmapFactory ignores
         * it — the A9 limit of the tiles is not repeated in the viewer); JPEG q82; every bitmap is disposed. Called OFF the
         * UI thread. The path is C#'s own. Fail-soft: anything unexpected → null (the viewer keeps the thumbnail).
         * ★ S9 (#1244): ALSO the photo encoder of the chat's media send (maxEdge 2048 — PhotoRules.MaxEdge): Bitmap.Compress
         * writes NO metadata (no EXIF / GPS), and the rotation is applied before the encode. */
        public static byte[]? makeViewerJpeg(string path, int maxEdge)
        {
            return makeViewerJpeg(path, maxEdge, null);
        }

        /* ★ S15 F (#1302, Damir 2026-10-10: "fewer decodes"): the same encode, plus `derive` — called once, after the
         * picture is encoded, with an encoder `scaled(edge)` that makes a JPEG of THIS oriented bitmap with its long edge
         * ≤ edge (same q82, a fresh bitmap → no metadata, every bitmap disposed). The media send makes its 320 strip thumb
         * and the S11 offer preview ladder from it — no second / third full decode of the prepared jpg. `scaled` is valid
         * only inside `derive` (the bitmap is disposed after it); it returns null on any failure, and a `derive` that
         * throws never fails the picture. */
        public static byte[]? makeViewerJpeg(string path, int maxEdge, Action<Func<int, byte[]?>>? derive)
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
                /* ★ S9 (#1244): the sample keeps the decoded long side ≥ maxEdge (the old cap min(2 × maxEdge, 2048) decoded a
                 * 4000-px photo at 2000 and a 12 000-px one at 1500 — below a 2048 send / a 1600 viewer, then scaled UP). Still
                 * bounded: the decode stays < 2 × maxEdge on the long side (PhotoRules.decodeSample, executed by csh). */
                int sample = SPIXI.PhotoRules.decodeSample(longSide, maxEdge);
                /* ★ S15 #46 r1 NIT-4: NOT a `using` — the full decoded bitmap is released as soon as `oriented` exists (below),
                 * so `derive` never runs while both are alive; the finally covers every early return. */
                Bitmap? decoded = BitmapFactory.DecodeFile(path, new BitmapFactory.Options { InSampleSize = sample });
                try
                {
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
                    byte[] picture = ms.ToArray();
                    /* ★ S15 #46 r1 NIT-4: drop the decode before `derive` scales from `oriented`. ⚠ Bitmap.createBitmap answers
                     * the SOURCE itself for an immutable bitmap, the whole rect and an identity matrix (no scale, EXIF normal) —
                     * then `oriented` IS `decoded` (the same peer; Java.Lang.Object.Equals asks the JVM, and Bitmap keeps
                     * Object's identity equals) and must stay alive (the finally disposes it after `derive`). Otherwise
                     * nothing else holds `decoded`: Recycle frees its pixels now, not at the next GC. */
                    if (!ReferenceEquals(oriented, decoded) && !oriented.Equals(decoded))   // the peer, then the Java object
                    {
                        decoded.Recycle();
                        decoded.Dispose();
                        decoded = null;
                    }
                    if (derive != null)
                    {
                        try
                        {
                            derive((edge) => scaledJpeg(oriented, edge));
                        }
                        catch (Exception)
                        {
                        }
                    }
                    return picture;
                }
                finally
                {
                    decoded?.Dispose();
                }
            }
            catch (Exception)
            {
                return null;
            }
        }

        /** ★ S15 F (#1302): a JPEG q82 of `bmp` with its long edge ≤ edge (the aspect kept; never scaled up). A large step
         *  halves first (each halving a filtered 2:1 — the old path's power-of-two decode sample, so a 2048 → 320 thumb does
         *  not alias), then one filtered scale to the target size. Every intermediate bitmap is disposed; null on failure. */
        private static byte[]? scaledJpeg(Bitmap bmp, int edge)
        {
            Bitmap? cur = null;
            try
            {
                if (edge <= 0 || bmp.Width <= 0 || bmp.Height <= 0)
                {
                    return null;
                }
                int w = bmp.Width;
                int h = bmp.Height;
                double scale = Math.Min(1.0, (double)edge / Math.Max(w, h));
                int tw = Math.Max(1, (int)Math.Round(w * scale));
                int th = Math.Max(1, (int)Math.Round(h * scale));
                Bitmap src = bmp;
                while (src.Width / 2 >= tw && src.Height / 2 >= th)   // the last step is < 2:1, as the old decode sample left it
                {
                    Bitmap half = Bitmap.CreateScaledBitmap(src, Math.Max(1, src.Width / 2), Math.Max(1, src.Height / 2), true)!;
                    cur?.Dispose();   // the previous halving (never `bmp`)
                    cur = half;
                    src = half;
                }
                // already the target size → encode it as it is (never a CreateScaledBitmap that may answer `src` itself)
                bool own = src.Width != tw || src.Height != th;
                Bitmap target = own ? Bitmap.CreateScaledBitmap(src, tw, th, true)! : src;
                using MemoryStream ms = new MemoryStream();
                bool ok;
                try
                {
                    ok = target.Compress(Bitmap.CompressFormat.Jpeg!, 82, ms);
                }
                finally
                {
                    if (own)
                    {
                        target.Dispose();
                    }
                }
                return ok ? ms.ToArray() : null;
            }
            catch (Exception)
            {
                return null;
            }
            finally
            {
                cur?.Dispose();
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
