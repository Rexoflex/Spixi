# Agent contract — fixb3 (Fix batch 3)

The lead wrote this BEFORE any agent started (`docs/orchestration.md` § 4). Every agent gets this file plus its own row.
An agent that needs a file outside its row stops and asks the lead. Mechanisms: `docs/fixb3-mechanisms.md`.

## 1 · Base
- Tree: `work/fixb3` @ "Merge pull request #16 from Rexoflex/work/photo1a" (`14ae57f2`) · baseline: `BASELINE OK 6660 /
  the 2 KNOWN (#136 · B3)` (CLAUDE.md of the base; re-observed by the lead) · CSH 766 (observed by the lead,
  2026-11-18, .NET SDK 10.0.115) · tools: jsdom 29.1.1 · eslint 10.14.0 · globals 17.14.0 · tree-sitter 0.25.1 ·
  tree-sitter-c-sharp 0.23.5 (L160) · Ixian-Core `097341a` beside the tree (CSH needs it).
- Must hold for everyone: the PARAMOUNT isolation invariant · C# touches no risky parts · the frozen bridge (no new verb,
  push name, cap, `spixi.*` key, WebView setting, HTML sink, fetch) · the security handover gate triggers (a LOG LINE is a
  trigger: fixed words + integers / fixed names only) · no commit, no push, no full smoke, nothing in Ixian-Core.
- NOT yours, never edit: `src/**` and `Spixi/Resources/Raw/html/**` (session photo1b) · `Spixi/Spixi.csproj`,
  `.github/**`, `docs/legal/**` (leanfollow) · `Spixi/App.xaml.cs`, the lock pages, `SPayments.cs`, the create / restore
  path, `Spixi/Pages/Settings/SettingsPage.xaml.cs` (defaultsb) · `Spixi/Utils/SpixiFlags.cs` (this batch adds NO switch)
  · `SConfirm.cs`, the send path, `Spixi/Utils/SDevSeed*.cs`, `Spixi/Meta/**`, Ixian-Core.
- Each agent works in ITS OWN copy of the tree (below) and runs only its own pins + CSH there. `scripts/smoke-test.mjs`
  and `scripts/csh/csh.csproj` are shared: change them in your copy and return the change as a unified diff; the lead
  merges.

## 2 · Items and ownership (file scopes are disjoint)
| Item | Agent | Model (effort high) | Owns | Reads only | Owes | Tree copy |
|---|---|---|---|---|---|---|
| 1 mini-app guard (`n-20261113-miniapp-action-before-onload`) | builder-a | Opus | `Spixi/Pages/MiniApps/MiniAppPage.xaml.cs` (ONLY `handleAction` and its two catches) · NEW `Spixi/Utils/FixB3Rules.cs` · NEW `scripts/csh/FixB3GuardTests.cs` · NEW `scripts/pins-fixb3/a-miniapp-guard.mjs` · re-bases of the pins that read MAP and break (each named, after a look at the diff, #1634): `pins-fixb2/d-pay-confirm`, `pins-fixb2/a-confirm-focus`, `pins-safety/a-miniapp`, `pins-s8/cs-wiring`, `pins-s9/a2-wiring`, inline smoke rows (as a diff) | `Spixi/MiniApps/MiniAppActionHandler.cs`, `docs/fixb3-mechanisms.md` § 2 | CSH tests; pin `a` with deliberate breaks; the list of re-based pins with the reason | `/home/claude/trees/a/spixi` |
| 2 Delete history (`n-20261113-delete-history-chat-info-media`) | builder-b | Opus | `Spixi/Pages/Contacts/ContactDetails.xaml.cs` (`onRemoveHistory`, the `ixian:sharedItems` branch, one new private helper + one public method) · `Spixi/Pages/Home/HomePage.xaml.cs` (`onRemoveHistoryFor` only) · NEW `Spixi/Utils/FixB3ChatInfoRules.cs` · NEW `scripts/csh/FixB3ChatInfoTests.cs` · NEW `scripts/pins-fixb3/b-delete-history.mjs` · re-bases of the pins that read CD / HP / SC and break (`pins-photo1a/b-store` first; each named) | `Spixi/Utils/SContacts.cs` (NOT edited: `SContacts.removeHistory` is used as is), `Spixi/Utils/SharedItems.cs`, `src/shells/contact_details.html`, `src/components/chat-info.js`, `src/components/shared-items.js`, `docs/fixb3-mechanisms.md` §§ 0–1 | CSH tests; pin `b` with breaks; re-based pins | `/home/claude/trees/b/spixi` |
| 3 + 4 walk steps (`n-20261118-walk-downloads-scroll`, `n-20261118-walk-history-seed-option`) | builder-c | Sonnet | `scripts/device/adb-walk.ps1`, `scripts/device/adb-walk-parse.ps1` (NOT `a52s.json`: its four new keys stay absent until the operator block) · NEW `scripts/pins-fixb3/c-walk.mjs` · re-bases of `pins-perfb1toggle/b-walk`, `pins-filewalk/b-walk-steps`, `pins-photo1a/c-walk` (the SHA-256 of the scripts, #1596 / #1634) · inline smoke rows that read the walk files (as a diff) | `scripts/device/a52s.json`, `docs/fixb3-mechanisms.md` §§ 3–4, DECISIONS #1520–#1523, #1666, #1671, #1674, #1718 | pin `c` with breaks; fake-adb dry runs (PowerShell 7 via `dotnet tool install --global PowerShell` if it is not there; Damir runs Windows PowerShell 5.1: use no 7-only syntax) | `/home/claude/trees/c/spixi` |
| docs | the lead (+ a Sonnet / Haiku helper) | — | packets P84–P86, the gate section, the walk sheet, DECISIONS #1810–#1824, lessons L257–L260, the export docs | everything | — | the main tree |

Switches: NONE in this batch. Items 1 and 2 are hole-closing fixes (#1321: a log leak; deleted data that stays visible /
on disk); the old path IS the fault. Items 3 and 4 are opt-in walk code.

## 3 · Interfaces
### 3.1 `Spixi/Utils/FixB3Rules.cs` (builder-a provides; MAP consumes; CSH compiles it — no MAUI, no Newtonsoft, no Core type)
```
namespace SPIXI { public static class FixB3Rules {
  public static readonly string[] MiniAppActionNames;   // EXACTLY the eleven MiniAppCommands values, same text (a pin compares them with MiniAppActionHandler.cs)
  public const string NotReadyError = "not ready";       // the e of the existing SpixiAppSdk.ar reply
  public static string actionLogName(string? command);   // ordinal match → the LIST's own string; anything else (null, empty, other case, padded) → "unknown"
  public static string exceptionWord(Exception? e);      // e.GetType().Name when it matches ^[A-Za-z][A-Za-z0-9_]{0,63}$, else "Exception"; null → "none"
  public static string notReadyLine(string? command);    // "MiniAppPage: an action before ixian:onload was refused (" + actionLogName + ")"
  public static string actionFailedLine(string? command, Exception? e);    // "MiniAppPage: a mini-app action failed (" + name + ", " + exceptionWord + ")"
  public static string responseFailedLine(string? command, Exception? e);  // "MiniAppPage: the answer of a mini-app action was not sent (" + name + ", " + exceptionWord + ")"
  /** The guard. handlerReady → returns false at once: no log, peek and reject are NOT called. Else: peek() in a try (any
   *  exception → (null, null)); ONE Logging.warn(notReadyLine(c)); when c != null and id != null: reject(c, id,
   *  NotReadyError) in a try (an exception is swallowed, no second line); returns true. Never throws. */
  public static bool refuseBeforeOnload(bool handlerReady, Func<(string? c, string? id)> peek, Action<string, string, string> reject);
} }
```
MAP use: the FIRST statement of `handleAction` is `if (FixB3Rules.refuseBeforeOnload(miniAppActionHandler != null, <a lambda that
deserializes the action with the SAME JsonConvert call and returns (c, id)>, sendActionRejected)) { return; }`. The outer
catch's log statement becomes `Logging.error(FixB3Rules.actionFailedLine(jsonResult?.c, e));`, the response catch's
`Logging.error(FixB3Rules.responseFailedLine(jsonResult.c, e));`. Nothing else in the file changes (the three fixb2
confirm sites, the alert texts, `sendActionRejected(…, e.Message)` and the error alert stay byte for byte: legacy, P84).

### 3.2 `Spixi/Utils/FixB3ChatInfoRules.cs` (builder-b provides; CD consumes; CSH compiles it)
```
namespace SPIXI { public sealed class SharedScanGate {
  public int begin();              // a new token, strictly larger than every token before (Interlocked)
  public bool isLatest(int token); // true only for the token of the last begin()
} }
```
CD: one private helper `pushSharedItems()` = today's `ixian:sharedItems` body (the bot check, `Task.Run`, the scan, the ONE
`setSharedItems` push on the main thread, the type-only warn) plus `int t = gate.begin()` before the task and `if
(!gate.isLatest(t) || isDisposed) return;` on the main thread before the push. The verb branch calls it; a new `public void
refreshSharedItemsAfterDelete()` calls it. `onRemoveHistory`: `if (SContacts.removeHistory(friend)) { <the existing
removeHistoryResult push>; pushSharedItems(); <the existing alert> }` (the deleted local-store lines and the chat reload are
inside `SContacts.removeHistory`, `SC:618-645`, plus the Sent sweep). HP `onRemoveHistoryFor`: on `status == "ok"`, an
OPEN `ContactDetails` of that contact (found the way HP already finds overlay pages; `friendAddressString()` equals) gets
`refreshSharedItemsAfterDelete()` (main thread; never throws).

### 3.3 The walk (builder-c; no other item meets it)
- New map keys (absent in `a52s.json` until the operator block): `swipes.accountDownloads` (`x1 y1 x2 y2 ms`),
  `screens.accountScrolled` (probes + `minMatch`), plus the existing names `taps.accountDownloads`, `screens.downloads`.
- `downloads` rep: … the Account tab with its gates (the base order of the gates and of `logcat -c` is kept) → the swipe
  `swipes.accountDownloads` (focus checked first) → `scrollSettleMs` → the screen check `accountScrolled` (the PNG deleted in a
  `finally`, never kept) → only on a pass the stamp + tap `accountDownloads` (t0) → the rest as today. A failed check sends no
  tap: the app is restarted and the restart proven (the base rule "from the tabAccount tap command on, any failure restarts
  the app"). The gap list of the step names all four keys.
- `-Calibrate`: after cal-17a and the Account tab: the swipe (the map key, else a fixed calibrate default written in the
  script and printed) → cal-17s (the scrolled hub; kept while `screens.accountScrolled` is not set, deleted when it fails its
  probes) → ONLY when `screens.accountScrolled` passes AND `taps.accountDownloads` is set: the tap and cal-17 as today. So the
  first calibrate gives three keys, a second (the proof run) gives `screens.downloads` — the tap point is read from a picture
  before the first tap on the hub (#1671 ⑤).
- `-HistorySeed <k>` (one whole number 0..55, the dev-seed index): only with `history` in `-Steps`; not with `-Flags`, not
  with `-Calibrate` (usage errors before any adb command). Each rep: a PROVEN restart (the open-seed method) or a halt; the
  `fa` intent with `Get-DevSeedAddress k` (derived; never read from a file, never typed; masked `<seed-index k>`); the chat
  check; swipes `historyOlder` until ONE page request is counted or `historyMaxSwipes`; zero page requests = the rep is no
  data (a chat with no older page cannot measure it). Step name `history-seed-kNN`; the parser gives it the metric rows of
  `history`. Without `-HistorySeed`: the commands of every old step and `summary.csv` byte-identical (the dry run).

## 4 · What each agent returns
- The list of files it CHANGED (the lead copies back only these) and the diffs for `smoke-test.mjs` / `csh.csproj`.
- Per pin: the command (`node scripts/run-pins.mjs <dir/mod>`), the green line, each deliberate break (a one-token
  mutation in a full copy, #802) with its red line and the failing key. A source-text pin states its limits in its FIRST
  version (#1735); prefer behaviour (CSH, dry runs) over source scanners.
- `node scripts/run-csh.mjs` → `CSH pass=<n> fail=0` in its copy.
- What it could not prove (⚠ C# UNCOMPILED: MAUI files; unrun on Windows PowerShell 5.1 / the phone).
- Anything it saw outside its scope: a note, not a fix.

## 5 · Integration (the lead)
1. Copy back per agent, changed files only → `cs-syntax-check` → the two `--check` gates (no html changes) → the pins of
   every module that reads an edited file → CSH.
2. One registration line for `pins-fixb3/<a-miniapp-guard|b-delete-history|c-walk>` at the end of the pin block of
   `scripts/smoke-test.mjs`.
3. The #46 loop: the security-only pass (ONE fresh Fable 5.2 reader at a time: items 1 and 2), Opus readers for the rest
   (item 3 + 4, pins); the affected pins between rounds (#1503), the full smoke ONCE after the last fix.

## 6 · Escalation log
| Item | Attempt | Model | Result | Next |
|---|---|---|---|---|
| 2 | builder-b | Opus | stopped by a server restart before its report (its tree kept the work) | builder-b2 (Opus) checked and finished it |
| 2 | #46 r1 S m-1 | Opus (fixer-12) | the scope grew by the lead: `Spixi/Utils/SharedItems.cs` (`scan(…, remember)`, `remember(…)`; no other caller) | — |
| 3 + 4 | dry run | Sonnet | no PowerShell in the cloud (NuGet and the GitHub download refused): a tree-sitter parse check instead | the operator block is the first run |
