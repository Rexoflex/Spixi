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
    }
}
