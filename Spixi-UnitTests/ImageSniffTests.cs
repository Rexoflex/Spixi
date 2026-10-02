using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;

namespace Spixi_UnitTests
{
    /* ★ G-6b (#1121, #46 r1 A2): only a file whose FIRST BYTES are an expected image format reaches a platform decoder.
     * Run: dotnet test Spixi-UnitTests\Spixi-UnitTests.csproj --filter ImageSniff */
    [TestClass]
    public class ImageSniffTests
    {
        private static byte[] h(params int[] b)
        {
            byte[] r = new byte[16];
            for (int i = 0; i < b.Length && i < 16; i++) r[i] = (byte)b[i];
            return r;
        }

        [TestMethod]
        public void TheExpectedFormatsPass()
        {
            Assert.IsTrue(ImageSniff.looksLikeImage(h(0xFF, 0xD8, 0xFF, 0xE0)), "JPEG");
            Assert.IsTrue(ImageSniff.looksLikeImage(h(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A)), "PNG");
            Assert.IsTrue(ImageSniff.looksLikeImage(h(0x47, 0x49, 0x46, 0x38, 0x39, 0x61)), "GIF89a");
            Assert.IsTrue(ImageSniff.looksLikeImage(h(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50)), "WebP");
            Assert.IsTrue(ImageSniff.looksLikeImage(h(0x42, 0x4D, 0x36, 0, 0x0C, 0, 0, 0, 0, 0, 0x36, 0, 0, 0, 40, 0)), "BMP (BITMAPINFOHEADER)");
            Assert.IsTrue(ImageSniff.looksLikeImage(h(0x42, 0x4D, 0x36, 0, 0x0C, 0, 0, 0, 0, 0, 0x36, 0, 0, 0, 108, 0)), "BMP V4 header (108)");
            Assert.IsTrue(ImageSniff.looksLikeImage(h(0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63)), "HEIC (ftypheic)");
            Assert.IsTrue(ImageSniff.looksLikeImage(h(0, 0, 0, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66)), "AVIF (ftypavif)");
        }

        [TestMethod]
        public void EverythingElseIsRefused()
        {
            Assert.IsFalse(ImageSniff.looksLikeImage(null), "null");
            Assert.IsFalse(ImageSniff.looksLikeImage(new byte[] { 0xFF, 0xD8, 0xFF }), "shorter than 12 bytes");
            Assert.IsFalse(ImageSniff.looksLikeImage(h(0x4D, 0x5A, 0x90)), "a Windows executable (MZ) renamed .jpg");
            Assert.IsFalse(ImageSniff.looksLikeImage(h(0x49, 0x49, 0x2A, 0x00)), "TIFF");
            Assert.IsFalse(ImageSniff.looksLikeImage(h(0x3C, 0x73, 0x76, 0x67)), "SVG text");
            Assert.IsFalse(ImageSniff.looksLikeImage(h(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x41, 0x56, 0x49, 0x20)), "RIFF AVI, not WebP");
            Assert.IsFalse(ImageSniff.looksLikeImage(h(0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D)), "MP4 (ftypisom), not an image");
            Assert.IsFalse(ImageSniff.looksLikeImage(new byte[16]), "zeros");
            Assert.IsFalse(ImageSniff.looksLikeImage(h(0x42, 0x4D, 0x69, 0x67, 0x20, 0x74, 0x65, 0x78, 0x74)), "text starting \"BMig text\" renamed .bmp (#46 r2 R2-m1)");
            Assert.IsFalse(ImageSniff.looksLikeImage(h(0x42, 0x20, 0x20)), "one matching byte is not BMP");
            /* (#46 r3 R3-m3) each BMP clause on its own */
            Assert.IsTrue(ImageSniff.looksLikeImage(h(0x42, 0x4D, 0x36, 0, 0x0C, 0, 0, 0, 0, 0, 0x8A, 0, 0, 0, 124, 0)), "BMP V5 header (124)");
            Assert.IsTrue(ImageSniff.looksLikeImage(h(0x42, 0x4D, 0x36, 0, 0x0C, 0, 0, 0, 0, 0, 0x1A, 0, 0, 0, 12, 0)), "BMP core header (12)");
            Assert.IsFalse(ImageSniff.looksLikeImage(h(0x42, 0x4D, 0x36, 0, 0x0C, 0, 1, 0, 0, 0, 0x36, 0, 0, 0, 40, 0)), "BMP with a non-zero reserved field");
            Assert.IsFalse(ImageSniff.looksLikeImage(h(0x42, 0x4D, 0x36, 0, 0x0C, 0, 0, 0, 0, 0, 0x36, 0, 0, 0, 41, 0)), "BMP with an unknown header size");
            Assert.IsFalse(ImageSniff.looksLikeImage(h(0x42, 0x4D, 0x36, 0, 0x0C, 0, 0, 0, 0, 0, 0x36, 0, 0, 0, 40, 1)), "BMP header size > 255");
        }
    }
}
