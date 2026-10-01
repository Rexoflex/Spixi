using IXICore.Streaming;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;
using System.IO;

namespace Spixi_UnitTests
{
    /* ★ #1106/#1107 (#46 r5 R5-2) — executes FileMatch (Spixi/Utils/FileMatch.cs): a reused Downloads path is not the
     * message's file. Run: dotnet test Spixi-UnitTests\Spixi-UnitTests.csproj --filter FileMatch */
    [TestClass]
    public class FileMatchTests
    {
        private static string temp(int bytes)
        {
            string p = Path.Combine(Path.GetTempPath(), "fm-" + System.Guid.NewGuid().ToString("N") + ".bin");
            File.WriteAllBytes(p, new byte[bytes]);
            return p;
        }

        private static FriendMessage file(string header, ulong size = 0)
        {
            return new FriendMessage(new byte[] { 1 }, header, 0, false, FriendMessageType.fileHeader) { fileSize = size };
        }

        [TestMethod]
        public void TheSizeFromTheFieldMustMatch()
        {
            string p = temp(20);
            Assert.IsTrue(FileMatch.matches(file("u:a.jpg", 20), p));
            Assert.IsFalse(FileMatch.matches(file("u:a.jpg", 10), p), "another sender's same-named file");
        }

        [TestMethod]
        public void TheHeaderSizeIsUsedWhenTheFieldIsEmpty()
        {
            string p = temp(20);
            Assert.IsTrue(FileMatch.matches(file("u:a.jpg:20"), p));
            Assert.IsFalse(FileMatch.matches(file("u:a.jpg:10"), p));
        }

        [TestMethod]
        public void UnknownSizeFallsBackToThePathRule()
        {
            Assert.IsTrue(FileMatch.matches(file("u:a.jpg"), temp(5)), "an older row with no size cannot be checked");
        }

        [TestMethod]
        public void AMissingFileNeverMatches()
        {
            Assert.IsFalse(FileMatch.matches(file("u:a.jpg", 5), Path.Combine(Path.GetTempPath(), "nope-" + System.Guid.NewGuid().ToString("N"))));
        }

        [TestMethod]
        public void TheHeaderParses()
        {
            Assert.IsTrue(FileMatch.parseFileHeader("uid:name.pdf:2048", out string n, out ulong s));
            Assert.AreEqual("name.pdf", n);
            Assert.AreEqual(2048, (int)s);
            Assert.IsFalse(FileMatch.parseFileHeader("uid", out _, out _), "no name");
        }
    }
}
