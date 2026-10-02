using System; using System.Linq; using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using IXICore.Streaming; using SPIXI; using SPIXI.Meta;
/* ★ #46 r1 M2/M3/m3/m4: the MSTest classes (by attribute) + integration checks through the REAL PresenceDisplay and
   SSightingStore against Stubs.cs. Prints one line per check and "CSH pass=N fail=M"; exit code = fails. */
public static class Run { public static int Main() { int pass=0, fail=0;
  foreach (var t in typeof(Run).Assembly.GetTypes().Where(t => t.GetCustomAttribute<TestClassAttribute>()!=null).OrderBy(t => t.Name))
   foreach (var m in t.GetMethods().Where(m => m.GetCustomAttribute<TestMethodAttribute>()!=null)) {
    try { m.Invoke(Activator.CreateInstance(t), null); pass++; Console.WriteLine("  ✓ "+t.Name+"."+m.Name); }
    catch (TargetInvocationException e) { fail++; Console.WriteLine("  ✗ "+t.Name+"."+m.Name+": "+e.InnerException!.Message); } }
  void chk(bool c, string n){ if(c){pass++;Console.WriteLine("  ✓ "+n);} else {fail++;Console.WriteLine("  ✗ "+n);} }
  var P = Microsoft.Maui.Storage.Preferences.Default;
  IXICore.Clock.now = 10000;
  var f = new Friend(); f.walletAddress = new IXICore.Address("Abc");
  chk(PresenceDisplay.lastSightingNetwork(f)==0, "int: unknown → 0");
  PresenceDisplay.noteKeepAlive(f, 9123);
  chk(SSightingStore.get("Abc")==9000, "int: a keepalive is kept, coarse");
  chk(P.Get("last_sightings","")=="Abc:9000", "int: ONE preference string, address:seconds");
  chk(PresenceDisplay.lastSightingNetwork(f)==9000, "int: the kept sighting shows after a 'restart' (lastSeenTime 0)");
  PresenceDisplay.noteKeepAlive(f, 9400);
  chk(SSightingStore.get("Abc")==9300 && P.Get("last_sightings","")=="Abc:9300", "int: a NEWER step moves it forward on disk");
  PresenceDisplay.noteKeepAlive(f, 9100);
  chk(SSightingStore.get("Abc")==9300, "int: an OLDER keepalive never moves it back");
  PresenceDisplay.noteKeepAlive(f, 50000);
  chk(SSightingStore.get("Abc")==9900, "int: a keepalive from the FUTURE is clamped to now (coarse 9900)");
  var g = new Friend{ type = FriendType.Group }; g.walletAddress = new IXICore.Address("Grp");
  PresenceDisplay.noteKeepAlive(g, 9900); PresenceDisplay.noteHeard(g, 9900);
  chk(SSightingStore.get("Grp")==0, "int: a group is never kept");
  var rq = new Friend{ approved = false }; rq.walletAddress = new IXICore.Address("Req");
  PresenceDisplay.noteKeepAlive(rq, 9900); PresenceDisplay.noteHeard(rq, 9900);
  chk(SSightingStore.get("Req")==0, "int: a pending REQUEST is never kept (#46 r1 A7)");
  chk(!P.Get("last_sightings","").Contains("Req"), "int: …and never written");
  SSightingStore.forget("Abc"); chk(SSightingStore.get("Abc")==0 && !P.Get("last_sightings","").Contains("Abc"), "int: forget removes it from memory AND disk");
  PresenceDisplay.noteHeard(f, 9800); chk(SSightingStore.get("Abc")==9600, "int: a message heard is kept (sender time, coarse)");
  SSightingStore.clear(); chk(SSightingStore.get("Abc")==0 && !P.d.ContainsKey("last_sightings"), "int: clear empties memory and removes the preference");
  // G-3: opaque numbers per contact, stored; no address in any line
  IXICore.Meta.Logging.lines.Clear(); f.online = true; PresenceDisplay.noteHeard(f, 9990);
  var f2 = new Friend(); f2.walletAddress = new IXICore.Address("Xyz"); f2.online = true; PresenceDisplay.noteHeard(f2, 9995);
  PresenceDisplay.shownChanged(f, out bool sh1); PresenceDisplay.probeKeepAlive(f2, 9000, 9990); PresenceDisplay.probeKeepAlive(f, 9000, 9990);
  var L = string.Join("|", IXICore.Meta.Logging.lines);
  chk(L.Contains("[PRESENCE] c1 dot=on age=10s core=1") && L.Contains("[PRESENCE] c2 keepalive gap=990s delay=10s") && L.Contains("[PRESENCE] c1 keepalive")
      && !L.Contains("Abc") && !L.Contains("Xyz"), "int: G-3 lines carry c1 / c2 (stored per contact), never the address — "+L);
  Console.WriteLine("CSH pass="+pass+" fail="+fail); return fail; } }
