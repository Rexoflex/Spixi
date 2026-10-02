// csh — the C# harness (#46 r1 M2): compiles the REAL pure Spixi files below against these minimal Core/MAUI stubs and runs the MSTest classes + integration checks. Not the app; no MAUI workload needed. Run: node scripts/run-csh.mjs
using System;
using System.Collections.Generic;
namespace IXICore { public static class Clock { public static long now = 10000; public static long getNetworkTimestamp() => now; }
  public class Address { string s; public Address(string s){this.s=s;} public override string ToString()=>s; } }
namespace IXICore.Meta { public static class Logging { public static List<string> lines = new List<string>();
  public static void info(string f, params object[] a){ lines.Add(a.Length>0?string.Format(f,a):f);} public static void warn(string f, params object[] a){} public static void error(string f, params object[] a){} } }
namespace IXICore.Streaming {
  public enum FriendType { Normal, Group, Bot }
  public class FriendMessage { public long timestamp; public bool localSender; }
  public class FriendMetaData { public FriendMessage? lastMessage { get; set; } }
  public class Friend { public IXICore.Address walletAddress = new IXICore.Address("A"); public long lastSeenTime; public bool online; public bool approved = true; public FriendType type = FriendType.Normal; public FriendMetaData metaData = new FriendMetaData(); }
}
namespace Microsoft.Maui.Storage { public class Preferences { public static Preferences Default = new Preferences(); public Dictionary<string,string> d = new Dictionary<string,string>();
  public string Get(string k, string def) => d.TryGetValue(k, out var v) ? v : def; public void Set(string k, string v){ d[k]=v; } public void Remove(string k){ d.Remove(k);} } }
namespace Microsoft.VisualStudio.TestTools.UnitTesting {
  public class TestClassAttribute : Attribute {} public class TestMethodAttribute : Attribute {}
  public class AssertFailed : Exception { public AssertFailed(string m):base(m){} }
  public static class Assert {
    public static void IsTrue(bool c, string m=""){ if(!c) throw new AssertFailed(m);} public static void IsFalse(bool c, string m=""){ if(c) throw new AssertFailed(m);}
    public static void AreEqual<T>(T e, T a, string m=""){ if(!Equals(e,a)) throw new AssertFailed(m+" (expected "+e+", got "+a+")");} } }
