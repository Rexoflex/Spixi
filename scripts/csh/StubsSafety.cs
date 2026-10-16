// ★ Session Safety (P33, Lane A) — harness-only stubs so the REAL Spixi/MiniApps/MiniApp.cs, MiniAppStorage.cs and
// MiniAppManager.cs (+ Ixian-Core Utils/IxiVarInt.cs, IxiUtils.cs, ByteArrayComparer.cs) compile and run here
// (tests: SafetyAppTests.cs). Only the members those files touch; the shapes follow the proof harness
// (keep/proof/Stubs.cs) and Ixian-Core @097341a. Types Stubs.cs already has (Address, Clock, Logging, Friend) are extended
// there, additively. Not the app.
using System;
using System.IO;
using System.Security.Cryptography;

namespace IXICore
{
    /** IxiVarInt.ReadIxiNumber / WriteIxiNumber (Ixian-Core Utils/IxiVarInt.cs:214-240) — never called by the mini-app files. */
    public class IxiNumber
    {
        private readonly byte[] b;
        public IxiNumber(byte[] b) { this.b = b; }
        public byte[] getBytes() => b;
    }

    /** MiniAppManager: the package checksum (sha256OfFile) · MiniApp: publicKey / signature hex (stringToHash). */
    public static class Crypto
    {
        public static string sha256OfFile(string path)
        {
            using (var f = File.OpenRead(path))
            {
                return Convert.ToHexString(SHA256.HashData(f)).ToLowerInvariant();
            }
        }

        public static byte[] stringToHash(string s) => Convert.FromHexString(s);
    }

    /** MiniApp.parseProtocols (sha3_512Trunc) · IxiUtils (sha3_512sq) — any stable hash will do here. */
    public class CryptoLib
    {
        public byte[] sha3_512Trunc(byte[] b) => SHA256.HashData(b);
        public byte[] sha3_512sq(byte[] b) => SHA256.HashData(b);
    }

    public static class CryptoManager
    {
        public static CryptoLib lib = new CryptoLib();
    }
}

namespace IXICore.Meta
{
    /** MiniAppManager.installFromPath / extractAppInfo: "is the installed copy newer" (> 0 = refuse). Numeric parts first. */
    public static class UpdateVerify
    {
        public static int compareVersionsWithSuffix(string a, string b)
        {
            if (Version.TryParse(a, out Version? va) && Version.TryParse(b, out Version? vb))
            {
                return va.CompareTo(vb);
            }
            return string.CompareOrdinal(a, b);
        }
    }
}

namespace IXICore.Streaming
{
    /** MiniAppManager.acceptAppRequest / rejectAppRequest. */
    public static class FriendList
    {
        public static Friend getFriend(IXICore.Address a) => new Friend();
    }
}

namespace SPIXI
{
    /** MiniAppManager's page registry reads appId / sessionId / accepted / hasUser only (the real page is a MAUI ContentPage). */
    public class MiniAppPage
    {
        public string appId = "";
        public byte[] sessionId = Array.Empty<byte>();
        public bool accepted;
        public bool hasUser(IXICore.Address a) => false;
    }

    public static class StreamProcessor
    {
        public static void sendAppRequestAccept(IXICore.Streaming.Friend f, byte[] s) { }
        public static void sendAppRequestReject(IXICore.Streaming.Friend f, byte[] s) { }
    }
}
