// csh — the C# harness (#46 r1 M2): compiles the REAL pure Spixi files below against these minimal Core/MAUI stubs and runs the MSTest classes + integration checks. Not the app; no MAUI workload needed. Run: node scripts/run-csh.mjs
using System;
using System.Collections.Generic;
namespace IXICore { public static class Clock { public static long now = 10000; public static long getNetworkTimestamp() => now; }
  public class Address { string s; public Address(string s){this.s=s;} public override string ToString()=>s;
    public byte[] addressNoChecksum => System.Text.Encoding.UTF8.GetBytes(s); }   // ★ #46 r1: Core Address.cs:62 (PushFetchProbe keys the id by its sender)
  /* ★ S8 (#1229) · ★ #46 r1 (A-MAJOR-1): Core's StreamMessage(byte[]) lives in namespace IXICore (Ixian-Core Streaming/StreamMessage.cs:20)
     — NOT IXICore.Streaming; the stub sits where the app sees it, so a file that forgets `using IXICore;` fails HERE too.
     Only `id` and `sender` are read (PushFetchProbe). Harness wire: byte 0 = 0xFF → the parse throws; byte 0 = 0x00 → no id,
     no sender; else byte 0 = the id length L (1–4), id = bytes 1..L, sender = Address("S" + byte L+1) when present. */
  public class StreamMessage { public byte[]? id; public Address? sender;
    public StreamMessage(byte[] b){ if (b.Length > 0 && b[0] == 0xFF) throw new Exception("bad"); if (b.Length == 0 || b[0] == 0) return;
      int L = Math.Min(Math.Min((int)b[0], 4), b.Length - 1); if (L <= 0) return; id = new byte[L]; Array.Copy(b, 1, id, 0, L);
      if (b.Length > L + 1) sender = new Address("S" + b[L + 1]); } } }
namespace IXICore.Meta { public static class Logging { public static List<string> lines = new List<string>();
  public static void info(string f, params object[] a){ lines.Add(a.Length>0?string.Format(f,a):f);} public static void warn(string f, params object[] a){ warns.Add(a.Length>0?string.Format(f,a):f);} public static void error(string f, params object[] a){}
  public static List<string> warns = new List<string>(); } }
namespace Microsoft.Maui.ApplicationModel { public static class MainThread { public static bool IsMainThread => true; public static void BeginInvokeOnMainThread(Action a){ a(); } } }   // ★ P-1: P1Perf.framesAfter
namespace IXICore.Streaming {
  public enum FriendType { Normal, Group, Bot }
  // ★ #1148 (3): Core's FriendMessageType, VALUE FOR VALUE (Ixian-Core Streaming/Friends/FriendMessage.cs:20-35) — UnreadRule takes it
  public enum FriendMessageType { standard, requestAdd, requestFunds, sentFunds, fileHeader, voiceCall, voiceCallEnd, appSession, appSessionEnd, kicked, banned, requestAddSent, reaction }
  public class FriendMessage { public long timestamp; public bool localSender; }
  public class FriendMetaData { public FriendMessage? lastMessage { get; set; } }
  public class Friend { public IXICore.Address walletAddress = new IXICore.Address("A"); public long lastSeenTime; public bool online; public bool approved = true; public FriendType type = FriendType.Normal; public FriendMetaData metaData = new FriendMetaData();
    public List<byte[]> supportedProtocols = new List<byte[]>(); }   // ★ S8 (#1234): Core Friend.cs:222 — PresenceDisplay reads it
}
namespace Microsoft.Maui.Storage { public class Preferences { public static Preferences Default = new Preferences(); public Dictionary<string,string> d = new Dictionary<string,string>();
  public string Get(string k, string def) => d.TryGetValue(k, out var v) ? v : def; public void Set(string k, string v){ d[k]=v; } public void Remove(string k){ d.Remove(k);}
  public bool Get(string k, bool def) => d.TryGetValue(k, out var v) ? v == "True" : def; public void Set(string k, bool v){ d[k] = v ? "True" : "False"; } } }   // ★ S8: SPrivacyPrefs' bools
namespace Microsoft.VisualStudio.TestTools.UnitTesting {
  public class TestClassAttribute : Attribute {} public class TestMethodAttribute : Attribute {}
  public class AssertFailed : Exception { public AssertFailed(string m):base(m){} }
  public static class Assert {
    public static void IsTrue(bool c, string m=""){ if(!c) throw new AssertFailed(m);} public static void IsFalse(bool c, string m=""){ if(c) throw new AssertFailed(m);}
    public static void AreEqual<T>(T e, T a, string m=""){ if(!Equals(e,a)) throw new AssertFailed(m+" (expected "+e+", got "+a+")");} } }
// ★ S9 A2 (#1245, H-14): SLocalOnlyStore's default folder reads Config.spixiUserFolder (Spixi/Meta/Config.cs:22); the harness sets SLocalOnlyStore.folder itself
namespace SPIXI.Meta { public class Config { public static string spixiUserFolder = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "csh-spixi"); } }
