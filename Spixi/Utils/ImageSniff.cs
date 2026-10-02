using System;

namespace SPIXI
{
    /* ★ G-6b (#1121, #46 r1 A2): the bytes check that stands between a CONTACT's file and a platform image decoder in the
     * app process. Pure, so the unit tests and the csh harness execute it. */
    public static class ImageSniff
    {
        /** Pure (#46 r1 A2, EXECUTED by the unit tests): do the first bytes say JPEG · PNG · GIF · WebP · BMP · HEIC/HEIF ·
         *  AVIF? Anything else (TIFF, SVG, a renamed executable, a truncated file) is never handed to a decoder. */
        public static bool looksLikeImage(byte[]? h)
        {
            if (h == null || h.Length < 12)
            {
                return false;
            }
            if (h[0] == 0xFF && h[1] == 0xD8 && h[2] == 0xFF) return true;                                   // JPEG
            if (h[0] == 0x89 && h[1] == 0x50 && h[2] == 0x4E && h[3] == 0x47) return true;                   // PNG
            if (h[0] == 0x47 && h[1] == 0x49 && h[2] == 0x46 && h[3] == 0x38) return true;                   // GIF8
            if (h[0] == 0x52 && h[1] == 0x49 && h[2] == 0x46 && h[3] == 0x46
                && h[8] == 0x57 && h[9] == 0x45 && h[10] == 0x42 && h[11] == 0x50) return true;              // RIFF....WEBP
            if (h[0] == 0x42 && h[1] == 0x4D && h.Length >= 16 && h[6] == 0 && h[7] == 0 && h[8] == 0 && h[9] == 0
                && (h[14] == 12 || h[14] == 40 || h[14] == 52 || h[14] == 56 || h[14] == 108 || h[14] == 124) && h[15] == 0) return true;   // BMP: "BM", reserved = 0, a known DIB header size (#46 r2 R2-m1)
            if (h[4] == 0x66 && h[5] == 0x74 && h[6] == 0x79 && h[7] == 0x70)                               // ....ftyp
            {
                string brand = System.Text.Encoding.ASCII.GetString(h, 8, 4);
                return brand == "heic" || brand == "heix" || brand == "mif1" || brand == "msf1" || brand == "avif" || brand == "hevc";
            }
            return false;
        }

    }
}
