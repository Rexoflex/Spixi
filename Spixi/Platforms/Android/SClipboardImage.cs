using Android.Content;
using IXICore.Meta;
using Microsoft.Maui.ApplicationModel;
using System;
using System.IO;
using System.Threading.Tasks;

namespace Spixi
{
    /* ★ S9 (#1156 / #1244, CONTRACT §1b `ixian:pasteImage`): read ONE image from the system clipboard — only when the user
     * pasted into the composer and the shell saw an `image/*` TYPE (the shell never reads the bytes). The first clip item
     * whose content uri has an image MIME type is read through the content resolver, bounded to cap + 1 bytes (a longer
     * source is visible to the caller as > cap → `tooBig`). No path is kept; nothing else on the clipboard is touched.
     * null = no image (→ `clipboardEmpty`). Main thread (the verb handler). Logs exception TYPES only. Never throws. */
    public static class SClipboardImage
    {
        /** ★ #46 r1 NIT: the "above the cap" answer — no cap-sized buffer is ever allocated for it (the caller tests the reference). */
        public static readonly byte[] TooBig = new byte[1];

        /* ★ #46 r1 m-6: the clip (a uri + its MIME type) is read on the calling (UI) thread; the content-resolver STREAM is read
         * OFF it (Task.Run), bounded by readBounded(…, cap). */
        public static async Task<byte[]?> readAsync(long cap)
        {
            try
            {
                Context ctx = Platform.AppContext;
                ClipboardManager? cm = (ClipboardManager?)ctx.GetSystemService(Context.ClipboardService);
                ClipData? clip = cm?.PrimaryClip;
                if (clip == null)
                {
                    return null;
                }
                Android.Net.Uri? image = null;
                for (int i = 0; i < clip.ItemCount && image == null; i++)
                {
                    Android.Net.Uri? uri = clip.GetItemAt(i)?.Uri;
                    if (uri == null)
                    {
                        continue;
                    }
                    string? type = ctx.ContentResolver?.GetType(uri);
                    if (type != null && type.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                    {
                        image = uri;
                    }
                }
                if (image == null)
                {
                    return null;
                }
                Android.Net.Uri found = image;
                return await Task.Run(() =>
                {
                    using (Stream? src = ctx.ContentResolver?.OpenInputStream(found))
                    {
                        if (src == null)
                        {
                            return null;
                        }
                        using (MemoryStream ms = SFilePicker.readBounded(src, cap))
                        {
                            return ms.Length > cap ? TooBig : ms.ToArray();
                        }
                    }
                });
            }
            catch (Exception e)
            {
                Logging.warn("Paste image: the clipboard could not be read (" + e.GetType().Name + ")");
            }
            return null;
        }
    }
}
