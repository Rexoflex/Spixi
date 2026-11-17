# P50 · WINDOWS: ENTER NO LONGER CONFIRMS A DESTRUCTIVE NATIVE CONFIRM · Cancel is the default button (batch fixb1, item 1)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW (a native dialog that answers OK in fewer cases than before; the gate, the lock checks and the 600 ms rule are unchanged) | no | none: no verb, push, cap, `spixi.*` key; +1 int pref (`flagConfirmSafeDefault`); +1 fixed log line (shared with P51) | built, switch ON · ⚠ C# UNCOMPILED (Windows arm; CI compiles Windows) | 10 min |

**Look here first:** `SConfirm.askAsync` (`Spixi/Utils/SConfirm.cs:63-70`, the one changed call) and
`SConfirm.showSafeDefaultConfirm` (`:112-150`).

**DECISIONS:** #1312 · #1478 · #1541 (Damir: fix it in a small batch) · #1603 (the batch) · this batch: #1645.

## What changed and why
- **Why.** WALK #1540 SW-S5-ENTER = F: on Windows the Enter key ran the destructive verb (remove contact, delete
  history, leave; kick and ban in a bot room). MAUI's `DisplayAlert` on WinUI is a `ContentDialog` with OK as the
  primary button and no `DefaultButton`; the dialog focuses its first button (OK), and Enter presses it. Mechanism:
  `docs/fixb1-mechanisms.md` § Item 1.
- **The change.** Windows only (`#if WINDOWS`), switch `SpixiFlags.ConfirmSafeDefault` ON: `SConfirm` shows its own
  `ContentDialog` on the main thread — the OK text on the PRIMARY button, the Cancel text on the CLOSE button,
  `DefaultButton = Close`, no secondary button, the text in a wrapping `TextBlock`, the `XamlRoot` of the MAUI root
  page (else of the first window), the WinUI 3 default dialog style when the app resources hold it. Cancel has the
  focus and the accent at open; Enter on it cancels; Esc closes (= `None` = Cancel). ONLY
  `ContentDialogResult.Primary` is OK (`FixB1Rules.confirmIsOk`, `Spixi/Utils/FixB1Rules.cs`, executed in csh). A user
  who tabs to OK and presses Enter still presses OK.
- **Unchanged.** The `ConfirmGate` (one confirm app-wide, released only by the holder's exit), the app-lock checks
  before and after the dialog, the 600 ms "too fast" rule (the `asked` tick is taken before the dialog is asked for, as
  before), the fixed `[CONFIRM] <verb> ok|cancel|busy|fast` lines, the texts (`SafetyRules.confirmTexts`). iPhone, Mac
  and Android compile today's line (`#else`).
- **Fail closed.** No `XamlRoot` → Cancel. A throw (WinUI allows one `ContentDialog` at a time: a confirm that opens
  while a MAUI alert is up throws in `ShowAsync`) → the task faults → `askAsync`'s existing catch logs its fixed line
  and answers Cancel. No timer frees anything (L157).
- **Rejected.** Swapping the two texts in `DisplayAlert`: MAUI answers `true` only for the primary, so Esc and a closed
  dialog would read as "not Cancel" = OK.
- **Known limit.** The new dialog is outside MAUI's alert queue: a MAUI alert that opens WHILE the confirm is up
  throws inside MAUI's `async void` alert handler (no try / catch there), the throw reaches WinUI
  `UnhandledException` with `Handled = false` (`Spixi/Platforms/Windows/App.xaml.cs:69-88`), and the app STOPS — fail
  closed (nothing is deleted), but a stop. No live path on Windows today (#46 r1 S-C-5): every Spixi alert goes through
  `displaySpixiAlert`, which drops other alerts while a confirm is up (P35); `BackupPage.xaml.cs:231` needs a null
  share outcome that the Windows `shareBackup` never returns, and the confirm is modal; `SingleChatPage.xaml.cs:1547`
  runs only with `NativeConfirm` OFF, where no confirm is asked; `SSystemAlert.displayAlert`
  (`Spixi/Platforms/Windows/SSystemAlert.cs:31-41`) has no caller.
- **What the pins cannot hold (#46 r3 R3-2, the pin perimeter of #1653).** `SConfirm.cs` and `FixB1Rules.cs` are held
  whole by SHA-256 and the rule files they call carry no platform arm, but a text pin holds text, not bindings: a NEW
  file that declares an extension `GetAwaiter` for `IAsyncOperation<ContentDialogResult>` in namespace `SPIXI`, a type
  that shadows `System.Environment` / `TaskCompletionSource`, or a `Spixi.csproj` `Compile Remove` of `SConfirm.cs`
  would change what this code does with every pin green. Such a change is held by the diff review of its pull request,
  the Windows compile and this review.
- **Empty texts.** An empty OK or Cancel text answers Cancel before the dialog is built (WinUI would hide that button;
  the OFF arm throws on an empty cancel and answers Cancel too) (#46 r1 S-C-4).
- **Switch.** Int pref `flagConfirmSafeDefault` (`SpixiFlags.cs:33`, `:110`, `:161`, `:199`), absent = ON, a stored 0
  turns it off only in dev mode (`S16PassRules.effectiveFlag`). OFF = today's `displaySpixiAlert(…, true)` call. No
  Developer-screen control in this batch (DevPage is outside the batch; #1651): the reviewer turns it off by the
  preference. The state is logged once at start: `[FLAGS] confirmdefault=<0|1> dividerline=<0|1>` (`SpixiFlags.cs:201`).

## Files
`Spixi/Utils/SConfirm.cs` · `Spixi/Utils/FixB1Rules.cs` (new, pure) · `Spixi/Utils/SpixiFlags.cs` · csh
`scripts/csh/FixB1Tests.cs` · pins `scripts/pins-fixb1/a-confirm.mjs` (after the #46 loop: the whole file held by SHA-256 — any edit re-bases after a look at its diff — plus the keys BODY, DIRECTIVES, WHOLE, EMPTY, SWITCH, DIALOG, SAME, HARNESS) and the re-based
`scripts/pins-safety/c-confirm.mjs`.

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| Enter or Esc runs the verb | Cancel is the default (Close) button; only Primary is OK | csh `confirm_is_ok_only_for_primary` · pin `a-confirm` (`defaultClose`, `closeIsCancel`, `primaryIsOk`, `noSecondary`, `answerByRule`) · walk W-1 |
| A page script answers the dialog | It is a native WinUI dialog outside every WebView | as P35 |
| The new path skips the gate, the lock or the 600 ms rule | The change is one expression inside `askAsync`; the rest is byte-identical | pin `a-confirm` (`sameOnWindows`, `gateLockFast`), `c-confirm` (`tooFast`, `okCancel`) |
| Other platforms change | Only `#if WINDOWS` code is new; the `#else` arm is today's line | pin `a-confirm` (`sameElsewhere`, `windowsOnly`, `namesOnlyOnWindows`) |
| A throw or no root confirms | No root → false; a throw faults the task → Cancel | pin `a-confirm` (`noRootCancel`, `noLog`, `noTimer`) · from reading (UNCOMPILED) |
