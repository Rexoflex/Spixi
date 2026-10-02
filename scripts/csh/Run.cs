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
  // ★ P-1 (#1127) — TEMPORARY, retire with the [P1] set: the [P1] grammar, executed (dev bodies, SPIXI_DEV_COEXIST)
  chk(P1Perf.enabled, "p1: the harness compiles the DEV bodies (enabled)");
  chk(P1Perf.isValidLine("[P1] shell boot chat load=12") && P1Perf.isValidLine("[P1] open singlechatpage present ms=5 overlay=1 slide=0"), "p1: isValidLine accepts a shell line and a C# open line");
  chk(!P1Perf.isValidLine("[P1] shell Boot chat"), "p1: rejects an uppercase token");
  chk(P1Perf.isValidLine("[P1] " + string.Join(" ", Enumerable.Repeat("x", 16))) && !P1Perf.isValidLine("[P1] " + string.Join(" ", Enumerable.Repeat("x", 17))), "p1: 16 tokens pass, 17 are rejected");
  chk(P1Perf.isValidLine("[P1] " + new string('a', 40)) && !P1Perf.isValidLine("[P1] " + new string('a', 41)), "p1: a 40-char token passes, 41 is rejected");
  chk(!P1Perf.isValidLine("shell boot chat load=12") && !P1Perf.isValidLine("[P1]shell boot"), "p1: rejects a missing \"[P1] \" prefix");
  chk(!P1Perf.isValidLine("[P1]  double-space") && !P1Perf.isValidLine("[P1] a  b") && !P1Perf.isValidLine("[P1] a "), "p1: rejects an empty token (double / trailing space)");
  chk(!P1Perf.isValidLine("[P1] a\nb") && !P1Perf.isValidLine("[P1] a\rb") && !P1Perf.isValidLine("[P1] é"), "p1: rejects a newline and a non-ASCII letter");
  IXICore.Meta.Logging.lines.Clear(); IXICore.Meta.Logging.warns.Clear();
  P1Perf.line("bad Name"); P1Perf.line("x\ny"); P1Perf.line("");
  chk(IXICore.Meta.Logging.lines.Count == 0 && IXICore.Meta.Logging.warns.Count(w => w == "[P1] dropped") == 1, "p1: line() drops an invalid body whole (nothing logged) with ONE [P1] dropped warn per process — "+string.Join("|", IXICore.Meta.Logging.warns));
  P1Perf.line("pop none ms=3");
  chk(IXICore.Meta.Logging.lines.Count == 1 && IXICore.Meta.Logging.lines[0] == "[P1] pop none ms=3", "p1: line() logs a valid body with the prefix");
  chk(P1Perf.kind(new System.Collections.Generic.List<int>()) == "page" && P1Perf.kind(null) == "page" && P1Perf.kind(new System.Text.StringBuilder()) == "stringbuilder", "p1: kind() — a generic type or null → page; a plain class → its lowercased name");
  chk(P1Perf.kind(new P1Kind_x()) == "page" && P1Perf.kind(new P1Kindabcdefghijklmnopqrstuvwxy()) == "page" && P1Perf.kind(new P1Kindabcdefghijklmnopqrstuvwx()) == "p1kindabcdefghijklmnopqrstuvwx", "p1: kind() — a name with '_' or over 30 chars → page; 30 is kept (so close-<kind> fits a 40-char token)");
  long p1t = P1Perf.now(); System.Threading.Thread.Sleep(20); long p1ms = P1Perf.msSince(p1t);
  chk(p1ms >= 15 && p1ms < 2000, "p1: msSince counts milliseconds ("+p1ms+")");
  IXICore.Meta.Logging.lines.Clear(); P1Perf.framesAfter("open-x"); P1Perf.framesAfter("bad what");
  chk(IXICore.Meta.Logging.lines.Count == 0, "p1: framesAfter on a non-Android/Windows TFM logs nothing (Apple no-op) and never throws");
  int safeCalls = 0; Func<string, string> recSafe = x => { safeCalls++; return x; };
  string? acc = P1Perf.acceptShellConsole("[P1] shell boot chat load=12", recSafe);
  chk(acc == "[P1] shell boot chat load=12" && safeCalls == 1, "p1: acceptShellConsole passes a shell line THROUGH safe (called once, its output returned)");
  chk(P1Perf.acceptShellConsole("[P1] shell boot chat load=12", x => x.Replace("chat", "<redacted:32>")) == null, "p1: acceptShellConsole rejects a line whose safe() output fails the grammar (a redacted token)");
  chk(P1Perf.acceptShellConsole("[P1] shell boot chat load=12", x => x.Replace("chat", "chatx")) == "[P1] shell boot chatx load=12", "p1: acceptShellConsole returns safe()'s OUTPUT, not its input");
  safeCalls = 0;
  chk(P1Perf.acceptShellConsole("[P1] open x", recSafe) == null && P1Perf.acceptShellConsole(null, recSafe) == null && safeCalls == 0, "p1: a non-shell [P1] line (or null) is rejected without calling safe");
  Console.WriteLine("CSH pass="+pass+" fail="+fail); return fail; } }
public class P1Kind_x {}
public class P1Kindabcdefghijklmnopqrstuvwx {}
public class P1Kindabcdefghijklmnopqrstuvwxy {}
