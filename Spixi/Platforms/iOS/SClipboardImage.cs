using Foundation;
using IXICore.Meta;
using System;
using System.Threading.Tasks;
using UIKit;

namespace Spixi
{
    /* ★ S9 (#1156 / #1244, CONTRACT §1b `ixian:pasteImage`): read ONE image from the general pasteboard — only when the user
     * pasted into the composer and the shell saw an `image/*` TYPE (the shell never reads the bytes; the system may show its
     * own "Allow Paste" prompt, the user's act). The original bytes are taken when the pasteboard holds a known image type
     * (HEIC / JPEG / PNG / GIF / TIFF — C# re-encodes once); otherwise the UIImage is encoded as PNG (lossless). Bounded: a
     * source above cap is returned as cap + 1 bytes (→ `tooBig`). null = no image (→ `clipboardEmpty`). Main thread.
     * Logs exception TYPES only. Never throws. */
    public static class SClipboardImage
    {
        /** ★ #46 r1 NIT: the "above the cap" answer — no cap-sized buffer is ever allocated for it (the caller tests the reference). */
        public static readonly byte[] TooBig = new byte[1];

        /* ★ #46 r1 m-7: public.tiff is NOT read — ImageSniff has no TIFF signature, so a TIFF would only fail as `decode`;
         * a TIFF-only pasteboard falls to the UIImage → PNG path below. */
        private static readonly string[] types = { "public.heic", "public.jpeg", "public.png", "com.compuserve.gif" };

        /* ★ #46 r1 m-6: the pasteboard is read on the calling (UI) thread (UIKit); the PNG encode of a bare UIImage and the
         * copy out of NSData run OFF it (Task.Run). Above cap → TooBig (no cap-sized buffer). */
        public static async Task<byte[]?> readAsync(long cap)
        {
            try
            {
                UIPasteboard pb = UIPasteboard.General;
                if (!pb.HasImages)
                {
                    return null;
                }
                NSData? data = null;
                foreach (string t in types)
                {
                    data = pb.DataForPasteboardType(t);
                    if (data != null && data.Length > 0)
                    {
                        break;
                    }
                    data = null;
                }
                UIImage? img = data == null ? pb.Image : null;
                if (data == null && img == null)
                {
                    return null;
                }
                NSData? typed = data;
                return await Task.Run(() =>
                {
                    NSData? d = typed;
                    try
                    {
                        if (d == null && img != null)
                        {
                            d = img.AsPNG();
                        }
                        if (d == null || d.Length == 0)
                        {
                            return null;
                        }
                        if ((long)d.Length > cap)
                        {
                            return TooBig;
                        }
                        return d.ToArray();
                    }
                    finally
                    {
                        img?.Dispose();
                    }
                });
            }
            catch (Exception e)
            {
                Logging.warn("Paste image: the pasteboard could not be read (" + e.GetType().Name + ")");
            }
            return null;
        }
    }
}
