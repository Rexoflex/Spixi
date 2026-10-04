using System;

namespace SPIXI
{
    /* ★ #1166 V-3 (#1144 / #1145 (1) the in-app viewer · #1154 "Delete from this device" + "Show in Downloads").
     * The PURE rules behind the chat-info viewer verbs — no MAUI, no Core type, so scripts/csh EXECUTES them
     * (ViewerRulesTests.cs). The call sites (ContactDetails, SharedItems, ViewerImage, Platforms/Windows/SThumbnail) are
     * MAUI-bound and compile nowhere here; scripts/pins-s5/viewer.mjs pins that each site calls these rules. */
    public static class ViewerRules
    {
        /** The item token grammar the chat-info shell sends ("<message id hex>:<link index>", the sharedOpen form). Only a
         *  token of this shape is ever echoed back in a push (viewerImage) — never any other WebView string. */
        public static bool isItemToken(string? token)
        {
            if (string.IsNullOrEmpty(token) || token.Length > 133)
            {
                return false;
            }
            int sep = token.IndexOf(':');
            if (sep < 1 || sep > 128 || sep != token.LastIndexOf(':'))
            {
                return false;
            }
            string n = token.Substring(sep + 1);
            if (n.Length < 1 || n.Length > 4)
            {
                return false;
            }
            for (int i = 0; i < sep; i++)
            {
                if (!Uri.IsHexDigit(token[i]))
                {
                    return false;
                }
            }
            foreach (char c in n)
            {
                if (c < '0' || c > '9')
                {
                    return false;
                }
            }
            return true;
        }

        /** The viewer: an image item ("media") with a local copy C# resolved itself. */
        public static bool mayView(string? kind, bool hasLocalPath)
        {
            return kind == "media" && hasLocalPath;
        }

        /** "Delete from this device" (#1154): ONLY a RECEIVED file (media or file) whose C#-resolved local copy is inside the
         *  Downloads root. A SENT file is the picker's ORIGINAL (the user's own photo) — never deleted, wherever it lives. */
        public static bool mayDeleteLocal(string? kind, bool received, bool hasLocalPath, bool insideDownloadsRoot)
        {
            return (kind == "media" || kind == "file") && received && hasLocalPath && insideDownloadsRoot;
        }

        /** "Show in Downloads" (#1154): the Downloads list holds received files only — the same rule as the delete. */
        public static bool mayShowInDownloads(string? kind, bool received, bool hasLocalPath, bool insideDownloadsRoot)
        {
            return mayDeleteLocal(kind, received, hasLocalPath, insideDownloadsRoot);
        }

        /** The viewer's source gate (the A5 / G-6b rule): a non-empty file ≤ cap whose FIRST BYTES are an expected image
         *  format — anything else never reaches a platform decoder. */
        public static bool viewerSourceOk(byte[]? head, long length, long cap)
        {
            return length > 0 && length <= cap && ImageSniff.looksLikeImage(head);
        }

        /** The viewer's result gate: a JPEG larger than max is dropped (the push stays bounded). */
        public static bool viewerJpegOk(int length, int max)
        {
            return length > 0 && length <= max;
        }

        /** Apply EXIF orientation `o` (1–8) to a top-down BGRA8 pixel buffer of w × h (Windows: the decoder is asked to
         *  IGNORE the flag, so the rotation is this one well-defined loop). Returns the new buffer and its size; an unknown
         *  orientation or a short buffer returns the input unchanged. Pixel (x, y) of the stored image lands at (x', y'):
         *    2 (w-1-x, y) · 3 (w-1-x, h-1-y) · 4 (x, h-1-y) · 5 (y, x) · 6 (h-1-y, x) · 7 (h-1-y, w-1-x) · 8 (y, w-1-x). */
        public static byte[] orientBgra(byte[] src, int w, int h, int o, out int ow, out int oh)
        {
            ow = w;
            oh = h;
            if (src == null || w <= 0 || h <= 0 || o < 2 || o > 8 || (long)src.Length < (long)w * h * 4)
            {
                return src!;
            }
            bool swap = o >= 5;
            int nw = swap ? h : w;
            int nh = swap ? w : h;
            byte[] dst = new byte[(long)nw * nh * 4];
            for (int y = 0; y < h; y++)
            {
                for (int x = 0; x < w; x++)
                {
                    int dx;
                    int dy;
                    switch (o)
                    {
                        case 2: dx = w - 1 - x; dy = y; break;
                        case 3: dx = w - 1 - x; dy = h - 1 - y; break;
                        case 4: dx = x; dy = h - 1 - y; break;
                        case 5: dx = y; dy = x; break;
                        case 6: dx = h - 1 - y; dy = x; break;
                        case 7: dx = h - 1 - y; dy = w - 1 - x; break;
                        default: dx = y; dy = w - 1 - x; break;   // 8
                    }
                    Buffer.BlockCopy(src, (y * w + x) * 4, dst, (dy * nw + dx) * 4, 4);
                }
            }
            ow = nw;
            oh = nh;
            return dst;
        }
    }
}
