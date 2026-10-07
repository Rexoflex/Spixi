using IXICore.Meta;
using System;
using System.IO;
using System.Threading.Tasks;
using Windows.ApplicationModel.DataTransfer;
using Windows.Storage.Streams;

namespace Spixi
{
    /* ★ S9 (#1156 / #1244, CONTRACT §1b `ixian:pasteImage`): read ONE image from the Windows clipboard — only when the user
     * pasted into the composer and the shell saw an `image/*` TYPE (the shell never reads the bytes). The clipboard's
     * Bitmap format (DataPackageView.GetBitmapAsync — a stream WIC decodes) is read, bounded to cap + 1 bytes (→ `tooBig`
     * above cap). Nothing else on the clipboard is touched; no file is named. null = no image (→ `clipboardEmpty`).
     * Clipboard.GetContent runs on the UI thread (the verb handler). Logs exception TYPES only. Never throws. */
    public static class SClipboardImage
    {
        /** ★ #46 r1 NIT: the "above the cap" answer — no cap-sized buffer is kept for it (the caller tests the reference). */
        public static readonly byte[] TooBig = new byte[1];

        /* ★ #46 r1 m-7: the "PNG" clipboard format first (browsers, Snipping Tool and Office put a compressed PNG there); the
         * Bitmap format (an uncompressed DIB — a 4K screenshot is ~33 MB, above the cap) only when there is no PNG. */
        public static async Task<byte[]?> readAsync(long cap)
        {
            try
            {
                DataPackageView view = Clipboard.GetContent();
                if (view == null)
                {
                    return null;
                }
                if (view.Contains("PNG"))
                {
                    object png = await view.GetDataAsync("PNG");
                    if (png is IRandomAccessStream pras)
                    {
                        using (pras)
                        using (Stream src = pras.AsStreamForRead())
                        {
                            return await readBounded(src, cap);
                        }
                    }
                }
                if (!view.Contains(StandardDataFormats.Bitmap))
                {
                    return null;
                }
                RandomAccessStreamReference reference = await view.GetBitmapAsync();
                using (IRandomAccessStreamWithContentType ras = await reference.OpenReadAsync())
                using (Stream src = ras.AsStreamForRead())
                {
                    return await readBounded(src, cap);
                }
            }
            catch (Exception e)
            {
                Logging.warn("Paste image: the clipboard could not be read (" + e.GetType().Name + ")");
            }
            return null;
        }

        /** At most cap + 1 bytes; above cap → TooBig; nothing → null. */
        private static async Task<byte[]?> readBounded(Stream src, long cap)
        {
            using (MemoryStream ms = new MemoryStream())
            {
                byte[] buf = new byte[81920];
                long left = cap + 1;
                while (left > 0)
                {
                    int n = await src.ReadAsync(buf, 0, (int)Math.Min(buf.Length, left));
                    if (n <= 0)
                    {
                        break;
                    }
                    ms.Write(buf, 0, n);
                    left -= n;
                }
                if (ms.Length > cap)
                {
                    return TooBig;
                }
                return ms.Length > 0 ? ms.ToArray() : null;
            }
        }
    }
}
