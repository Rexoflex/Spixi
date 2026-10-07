using CoreGraphics;
using Foundation;
using ImageIO;
using System;
using UIKit;

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
        private const int MaxLongSide = 2048;   // ★ #1166 V-3: the viewer image's ceiling (Android's makeJpeg guard)

        public static byte[]? makeJpeg(string path, int maxPx)
        {
            try
            {
                using NSUrl url = NSUrl.FromFilename(path);
                using CGImageSource? src = CGImageSource.FromUrl(url);
                if (src == null)
                {
                    return null;
                }
                // the LONG side is bounded; ×2 keeps the short side ≥ maxPx up to a 2:1 photo, then the crop squares it
                CGImageThumbnailOptions opts = new CGImageThumbnailOptions
                {
                    MaxPixelSize = maxPx * 2,
                    CreateThumbnailFromImageAlways = true,
                    CreateThumbnailWithTransform = true,
                    ShouldCacheImmediately = true,
                };
                using CGImage? thumb = src.CreateThumbnail(0, opts);
                if (thumb == null)
                {
                    return null;
                }
                nint side = Math.Min(thumb.Width, thumb.Height);
                using CGImage? square = thumb.WithImageInRect(new CGRect((thumb.Width - side) / 2, (thumb.Height - side) / 2, side, side));
                using UIImage image = new UIImage(square ?? thumb);
                using NSData? data = image.AsJPEG(0.6f);
                return data?.ToArray();
            }
            catch (Exception)
            {
                return null;
            }
        }

        /* ★ #1166 V-3 (#1144 / #1145 (1)): the VIEWER image — the in-app full-screen viewer shows a picture of a LOCAL file
         * (ViewerImage.dataUriOf is the only caller; it sniffs the first bytes and caps the source at 20 MB first). Mirrors
         * makeJpeg: ImageIO's thumbnail path is the BOUNDED decode (CGImageSource subsamples while decoding; the full bitmap
         * is never built) and it is asked for the long edge ≤ maxEdge (≤ MaxLongSide) directly; the aspect ratio is KEPT (no
         * crop); CreateThumbnailWithTransform applies the EXIF orientation; JPEG q82; every CG/UI object is disposed. Called
         * OFF the UI thread. The path is C#'s own. Fail-soft: anything unexpected → null (the viewer keeps the thumbnail).
         * ★ S9 (#1244): ALSO the photo encoder of the chat's media send (maxEdge 2048 = PhotoRules.MaxEdge = MaxLongSide): the
         * picture is a bare CGImage (no source properties), so AsJPEG writes NO EXIF / GPS; the orientation is applied.
         */
        public static byte[]? makeViewerJpeg(string path, int maxEdge)
        {
            try
            {
                if (maxEdge <= 0)
                {
                    return null;
                }
                using NSUrl url = NSUrl.FromFilename(path);
                using CGImageSource? src = CGImageSource.FromUrl(url);
                if (src == null)
                {
                    return null;
                }
                // ★ S9 #46 r1 m-10: the header's size first — a source above ~100 MP is never decoded (PhotoRules.pixelsOk)
                CGImageProperties? props = src.GetProperties(0);
                if (props != null && !SPIXI.PhotoRules.pixelsOk(props.PixelWidth ?? 0, props.PixelHeight ?? 0))
                {
                    return null;
                }
                CGImageThumbnailOptions opts = new CGImageThumbnailOptions
                {
                    MaxPixelSize = Math.Min(maxEdge, MaxLongSide),
                    CreateThumbnailFromImageAlways = true,
                    CreateThumbnailWithTransform = true,
                    ShouldCacheImmediately = true,
                };
                using CGImage? picture = src.CreateThumbnail(0, opts);
                if (picture == null)
                {
                    return null;
                }
                using UIImage image = new UIImage(picture);
                using NSData? data = image.AsJPEG(0.82f);
                return data?.ToArray();
            }
            catch (Exception)
            {
                return null;
            }
        }
    }
}
