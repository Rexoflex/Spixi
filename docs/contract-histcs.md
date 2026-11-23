# Contract — batch `histcs` (History C#: P-28, HV-5, HV-0 C# lines)

Lead: Claude Opus (#1612 / #1640). Base `redesign/frontend` @ `338d30f4`. Branch `work/histcs`. Mechanisms:
`docs/histcs-mechanisms.md` (read it first — this contract implements it). DECISIONS block #1860–#1874, lessons
L269–L272, packets P90–P92. Builders never commit, push or run the full smoke.

## 1 · Items, owners, models
| Item | MC id | Builder | Model | Files OWNED (write) |
|---|---|---|---|---|
| P-28 + HV-5 + the HV-0 call sites | `n-20261016-perf-p28`, `n-20261118-hv5-history-first-page-50`, `n-20261122-hv0-csharp-history-lines` | A | Opus, high | `Spixi/Pages/Chat/SingleChatPage.xaml.cs` (ONLY the methods named in § 3), `Spixi/Utils/SpixiFlags.cs` (ONLY the histcs block of § 2) |
| tests, pins, breaks, registration | all three | B | Sonnet, high | `scripts/csh/HistcsTests.cs` (new), `scripts/pins-histcs/**` (new), ONE line in `scripts/smoke-test.mjs` (the registration, after the `pins-defaultsb` line) |
| re-bases of broken pins | — | lead (or Haiku, mechanical) | — | named per pin in the handoff |
Scratch folders: A `/home/claude/scratch/histcs-A/`, B `/home/claude/scratch/histcs-B/` (a COPY of the tree for breaks; never
mutate `/home/claude/spixi` for a break — L246: `set -e`, absolute paths).
Not yours (other sessions run now): `src/**`, the built html, `scripts/device/**`, `Spixi/Utils/SDevSeed*.cs`, the body of
`GATE 54`, `scripts/pins-fixb1/e-header.mjs`, `Spixi/Spixi.csproj`, `.github/**`, `docs/legal/**`, Ixian-Core, the open path,
the send path, the message store, `SConfirm.cs`. No new bridge verb, push name or push shape.

## 2 · `Spixi/Utils/SpixiFlags.cs` — the histcs block (builder A)
(a) ONE statement appended as the LAST statement of `SpixiFlags.init()`, after `readPhoto1b();`:
`HistcsFlags.read();   // ★ histcs (contract-histcs § 2): the two switches; SILENT — its [FLAGS] line is written at the first load-more`
— `read()` writes NO log line (the csh tests of photo1b / defaultsb / fixb2 pin the position of the last init lines).
(b) At the END of the file, inside `namespace SPIXI`, after the closing brace of `SpixiFlags`, one block opened by the
comment `/* ★ histcs (History C#, DECISIONS #1860–#1874, contract-histcs § 2) … */` holding exactly these types:

```csharp
public static class HistcsFlags
{
    public const string LoadMoreOffUiKey = "flagLoadMoreOffUi";        // int pref; absent = default (1) — P-28 (P90)
    public const string FirstOlderPage50Key = "flagFirstOlderPage50";  // int pref; absent = default (1) — HV-5 (P91)
    /** P-28: an older page is read and built on a pool thread. OFF = onLoadMore on the UI thread (the old path). Start value false until read(). */
    public static bool LoadMoreOffUi { get; private set; } = false;
    /** HV-5: the first older page holds 50 rows (no step over 100). OFF = the old step. Start value false until read(). */
    public static bool FirstOlderPage50 { get; private set; } = false;
    /** Read ONCE (the last call of SpixiFlags.init): absent = ON; a stored 0 acts only while devMode is on
     *  (S16PassRules.effectiveFlag); a throw keeps both ON. Logs NOTHING. */
    internal static void read();
    /** `[FLAGS] histcs loadmoreoffui=<0|1> firstpage50=<0|1>` — fixed words and 0|1 only. */
    public static string flagsLine(bool offUi, bool firstPage50);
    /** True exactly once per process (Interlocked): the caller then logs flagsLine(...) (every build). */
    internal static bool takeFlagsLine();
}

internal enum OlderDrop { None = 0, Busy, Closed, Channel, Load, Anchor }

internal static class HistoryOlderRules
{
    public const string LoadMoreInBody = "chat loadmore in";
    /** `chat older read passes=<p> window=<w> ms=<m> flush=<f>` (negative → 0, invariant digits). */
    public static string readBody(int passes, int window, long ms, long flushMs);
    /** `chat older push n=<n> json=<j> build=<b>` (negative → 0). */
    public static string pushBody(int rows, int jsonLength, long buildMs);
    /** `chat older drop why=<busy|closed|channel|load|anchor>`; None → "chat older drop why=none" is NEVER asked (callers log only a drop). */
    public static string dropBody(OlderDrop why);
    /** The window after one load-more: show + step; ONLY when firstPage50 is false, a result of exactly 100 steps once more
     *  (+ step) — the base onLoadMore's arithmetic, unchanged, when false. */
    public static uint nextShow(uint show, uint step, bool firstPage50);
    /** True when either switch is on (loadMoreIn takes the new path); both OFF = onLoadMore, the old path. */
    public static bool usesNewPath(bool offUi, bool firstPage50);
    /** The drop rule, in this order: disposed or !sameDoc or !sameChat → Closed; !sameChannel → Channel;
     *  !noLoadSince or !noneInFlight → Load; !sameAnchor → Anchor; else None (keep). */
    public static OlderDrop decide(bool disposed, bool sameDoc, bool sameChat, bool sameChannel, bool noLoadSince, bool noneInFlight, bool sameAnchor);
    /** Runs `body` through `schedule` (Task.Run in the app) with the busy guard ALREADY entered by the caller:
     *  body's throw → onFail(e); then after() (its throw swallowed); then busy.leave() — on every path. A throw of
     *  schedule itself → busy.leave(), onFail(e), returns false. Returns true when scheduled. */
    public static bool schedule(OlderBusy busy, Action<Action> schedule, Action body, Action<Exception> onFail, Action after);
}

/** The busy guard: one older page at a time. Interlocked; never blocks. */
internal sealed class OlderBusy
{
    public bool tryEnter();   // 0 → 1; false when held
    public void leave();      // → 0
    public bool held { get; }
}

/** The push gate of one chat page (mechanisms § 4). */
internal sealed class OlderPushGate
{
    /** A snapshot of the counters, taken at the request (UI thread). */
    public readonly struct Ticket { … }   // started0 (long)
    public Ticket ticket();
    /** Every OTHER loadMessages: on = false → null (nothing counted, the switch-OFF path). Else started++ now (under the
     *  gate) and a disposable whose FIRST Dispose does finished++ (under the gate); a second Dispose does nothing. */
    public IDisposable? beginOther(bool on);
    /** Monitor.Enter(the gate); sets held = true. Blocks while another thread holds it. */
    public void enter(ref bool held);
    /** Only while entered: (no load started since the ticket, no other load in flight now). */
    public (bool noLoadSince, bool noneInFlight) counters(Ticket t);
    /** Monitor.Exit when held; held = false. Safe to call twice; never throws when not held. */
    public void exit(ref bool held);
}
```
Nothing else in the block. No other line of `SpixiFlags.cs` changes (fixb4 has its own block: keep away from it).

## 3 · `Spixi/Pages/Chat/SingleChatPage.xaml.cs` (builder A) — the methods touched
| Method / member | Change |
|---|---|
| `onNavigating`, the `ixian:loadmore` branch (`:595-598`) | its ONE statement `onLoadMore();` → `loadMoreIn();` (comment allowed) |
| `onLoadMore()` (`:1179-1198`) | **NOT CHANGED** (byte for byte: the both-switches-OFF path) |
| NEW `loadMoreIn()` | placed directly AFTER `onLoadMore()`, before the `#1166 B2` comment block. (1) `if (P1Perf.enabled) { P1Perf.line(HistoryOlderRules.LoadMoreInBody); }` (2) `if (HistcsFlags.takeFlagsLine()) { Logging.info(HistcsFlags.flagsLine(HistcsFlags.LoadMoreOffUi, HistcsFlags.FirstOlderPage50)); }` (3) `if (!HistoryOlderRules.usesNewPath(offUi, page50)) { onLoadMore(); return; }` (4) P-28 ON: `if (!olderBusy.tryEnter()) { dev line drop why=busy; return; }` (5) `messagesToShow = HistoryOlderRules.nextShow(messagesToShow, Config.messagesToLoad, page50);` (6) `OlderJob job = new OlderJob(offUi, thumbDoc, friend, selectedChannel, historyAnchor, offUi ? olderGate.ticket() : default);` (7) OFF-UI false (HV-5 only): `job.bindHere(); Volatile.Write(ref olderJobPending, job); loadMessages(); return;` (8) ON: `HistoryOlderRules.schedule(olderBusy, a => Task.Run(a), () => { job.bindHere(); Volatile.Write(ref olderJobPending, job); loadMessages(); }, e => Logging.warn("loadmore: the older page failed (" + e.GetType().Name + ")"), () => { olderGate.exit(ref job.gateHeld); if (job.zeroed) { pushZeroedChatRow(); } });` — `messagesToShow` and the job are written BEFORE the schedule. |
| NEW members (next to `loadMoreIn`) | `private sealed class OlderJob { bool background; int doc; Friend? chat; int channel; HistoryAnchor? anchor; OlderPushGate.Ticket ticket; int thread; bool gateHeld; bool zeroed; void bindHere(); }` · `private readonly OlderBusy olderBusy = new OlderBusy();` · `private readonly OlderPushGate olderGate = new OlderPushGate();` · `private OlderJob? olderJobPending = null;` · `private OlderJob? takeOlderJob()` (the pending job ONLY when `job.thread == Environment.CurrentManagedThreadId`, taken by `Interlocked.CompareExchange(ref olderJobPending, null, j) == j`; else null and the field is left alone) · `private bool olderMayPush(OlderJob? job, int readChannel)` (null or `!background` → true; else `olderGate.enter(ref job.gateHeld)`, `HistoryOlderRules.decide(isDisposed, thumbDoc == job.doc, ReferenceEquals(friend, job.chat), Volatile.Read(ref selectedChannel) == job.channel && readChannel == job.channel, c.noLoadSince, c.noneInFlight, ReferenceEquals(historyAnchor, job.anchor))`; None → true (the gate stays HELD); else exit, the dev drop line, false) · `private void olderPushed(OlderJob? job)` (background → `olderGate.exit(ref job.gateHeld)`) · `private IDisposable? beginLoadScope(OlderJob? job)` (job != null → null; else `olderGate.beginOther(HistcsFlags.LoadMoreOffUi)`) |
| `loadMessages()` (`:5457`) | ONLY these insertions, nothing else moves: **(i)** directly after `int want = (int)messagesToShow;`: `OlderJob? olderJob = takeOlderJob();` · `if (olderJob != null) { prepend = true; }` · `bool olderLines = prepend;` · `using IDisposable? olderScope = beginLoadScope(olderJob);` — NOTE `want` is read before the job: fine, the window grew before the task. **(ii)** `long flushT0 = P1Perf.now();` directly before `CoreMessageWriter.arrivals.beforeReread(…)` and `long flushMs = P1Perf.msSince(flushT0);` directly after it. **(iii)** inside the existing `if (P1Perf.enabled) { P1Perf.line(PhotoOpenRules.readBody(…)); }` after its line: `if (olderLines) { P1Perf.line(HistoryOlderRules.olderReadBody(readPasses, window, P1Perf.msSince(readT0), flushMs)); }` (`window` = the loop's last window — declare nothing new for it). **(iv)** the empty branch: its FIRST statement `if (!olderMayPush(olderJob, readChannel)) { return; }`. **(v)** the main branch, directly after the `try { … json = batch.toJson(); … } catch …` block and BEFORE `if (firstPushedId != null)`: `if (!olderMayPush(olderJob, readChannel)) { olderJob!.zeroed = zeroedUnread; return; }` then `if (P1Perf.enabled && olderLines) { P1Perf.line(HistoryOlderRules.olderPushBody(batch.items.Count, json != null ? json.Length : 0, buildClock.ElapsedMilliseconds)); }`. **(vi)** directly after the closing brace of the `if (!prepend) { … } else { … }` push block (before the `holdDoc` media part): `olderPushed(olderJob);` |
Check before you change: `P1Perf.now()` / `msSince` exist (`Spixi/Utils/P1Perf.cs`); `isDisposed` is the base property;
`using IDisposable? x = null;` is legal C# 8. Keep every comment style of the file (`★ histcs …`). No `ex.Message`, no
`+ e` in a log (type names only). No other method changes. Every `#if` stays as it is.

## 4 · Tests and pins owed (builder B)
- `scripts/csh/HistcsTests.cs` (`[TestClass] public class HistcsTests`; EXECUTED over the REAL `SpixiFlags.cs`, which csh
  already compiles; Stubs give `Preferences`): the flags read (absent = ON; stored 0 non-dev = ON; dev + 0 = OFF each key alone;
  a throw = ON); `read()` writes NO log line; `flagsLine` text; `takeFlagsLine` once; `nextShow` (false: 50→150→200→250, and
  equal to the base formula for every show 0…400 step 1…60; true: 50→100→150); `usesNewPath` table; `OlderBusy`;
  `schedule` (normal, body throws, after throws, schedule throws, inline scheduler, a real Task.Run); `decide` (each field
  alone, the order); `OlderPushGate` with REAL threads (a load begun after the ticket → noLoadSince false; in flight →
  noneInFlight false; begun and ended before the ticket → both true; held gate → `beginOther` on another thread waits until
  `exit`; double Dispose counts once; `beginOther(false)` = null and no count; `exit` twice safe); the line builders
  (exact texts; extreme ints incl. negative, int.MaxValue, long.MaxValue; every token matches `^[a-z0-9_.=-]{1,40}$` and
  `P1Perf.isValidBody` accepts each, ≤ 16 tokens); "both switches OFF = the base" (usesNewPath false, beginOther(false) null,
  nextShow(false) = base). ≥ 1 deliberate break per test group, recorded in the file header (the defaultsb pattern).
- `scripts/pins-histcs/a-path.mjs` (SOURCE pin; its LIMITS are its first lines, #1735): the `ixian:loadmore` branch is ONE
  statement `loadMoreIn();`; `onLoadMore()`'s body = the base body (SHA-256 of the exact text between its braces at
  `338d30f4`, a FROZEN constant); `loadMoreIn` order (line → flags line → the OFF route `onLoadMore(); return;` before any
  other statement → the guard → nextShow → the job → schedule) and the job binds inside the lambda BEFORE `loadMessages()`;
  `loadMessages`: the four insertions in place, `olderMayPush` before both anchor writes, `olderPushed` after the push block;
  `takeOlderJob()` called once in the file; `olderJobPending` written only in `loadMoreIn` (two sites) and in `takeOlderJob`;
  the rest of SCP (the file minus `loadMoreIn` + its new members + the insertion lines + the one branch statement) = the base
  (SHA-256, frozen); `SpixiFlags.cs` minus the histcs block and the one `HistcsFlags.read();` line = the base (SHA-256, frozen).
- `scripts/pins-histcs/b-lines.mjs` (SOURCE pin, limits first): the four `HistoryOlderRules.*Body` builders are called only in
  SCP, each with plain identifiers / member reads of int/long locals (no string argument), each under `P1Perf.enabled`; no
  other new `P1Perf.line(` / `Logging.` call in the changed methods but the flags line and the type-only warn; the flags-line
  keys are only in `SpixiFlags.cs` (C#-only prefs: no hit in `src/` or the built html).
- Registration: ONE line in `scripts/smoke-test.mjs` after the `pins-defaultsb` line, the same shape:
  `for (const mod of ['a-path', 'b-lines']) await (await import(new URL('./pins-histcs/' + mod + '.mjs', import.meta.url))).default({ … });   // ★ History C# (histcs, …)`.
- Each pin key: a deliberate break in a COPY of the tree that makes exactly that key fail (#802), listed in the pin header.

## 5 · Interfaces that do not move
The bridge (no verb, no push, no argument), `onLoadMore()`, `requestPrepend` / `takePrepend`, the open path
(`onLoad`, its `Task.Run`), `insertMessage`, `updateReactions`, the media hold, Ixian-Core.

## 6 · Changes made at the merge (lead) — the contract above is read with these
| # | Change | Why |
|---|---|---|
| M1 | `HistcsFlags.read()` is NOT called from `SpixiFlags.init()`; the two properties read the store LAZILY, once per process, at their first use (`ensureRead`, a lock + a volatile once-flag); `read()` stays for the csh tests | init's last statements are held by the pins and csh tests of six other batches (defaultsb d11, fixb1, fixb2, perfb1, v1am, photo1b), and `fixb4` appends there too: zero lines of init change. Test `flags_read_lazily_once_not_by_init` |
| M2 | the HV-5-only inline path wraps `loadMessages()` in `try { … } finally { Interlocked.CompareExchange(ref olderJobPending, null, job); }`; the task's after step does the same clear | builder A: a load that throws BEFORE it takes the job would leave a job bound to that thread, and a later load of that thread would become a prepend |
| M3 | (vi) is `olderPushed(olderJob); olderScope?.Dispose();` — an OTHER load stops counting as in flight right after its push block (its anchor write and pushes are out); the `using` Dispose at the end does nothing then | the open's media tail runs after its pushes: counting it as in flight would drop the first older page with `why=load` |
| M4 | the builders are named `olderReadBody` / `olderPushBody` / `olderDropBody` (the log WORDS are unchanged) | `pins-photo1a/a-open` counts `readBody(` in the file |
| M5 | the older read line is its own block `if (P1Perf.enabled && olderLines) { … }` directly BEFORE photo1a's `chat read` block | `pins-photo1a/a-open` holds that block whole |
| M6 | `a => { Task.Run(a); }` (an Action<Action>) | the expression lambda returns a Task |
