# P35 · NATIVE CONFIRM · Remove contact, clear history, leave, kick and ban ask a system dialog first on chat and chat info (Session Safety S-5, m168)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| MEDIUM–HIGH (the chat and chat-info WebViews render peer content; a script there could send a destructive verb with no step the page cannot draw) | no | no new verb; 5 existing verbs on 2 pages now wait for a native OK; 1 new push WORD `cancelled` in 3 existing result pushes; 4 new lang keys (14 locales); 1 shell line (`contact_details.html`); fixed log lines; 1 pref; dev: 1 switch name on `ixian:devflash:` | built behind flag `SpixiFlags.NativeConfirm` (default ON) · ⚠ UNCOMPILED for MAUI until the Safety build | 7 min |

**Look here first:** `Spixi/Utils/SConfirm.cs:47` `askAsync` and the pure gate `Spixi/Utils/ConfirmGate.cs:23` (csh `ConfirmGateTests`, 6 tests); the drop in `Spixi/Utils/SpixiContentPage.cs:6294-6303` (4-arg) and `:6340-6346` (3-arg).

**DECISIONS:** #1312 · #1322 (F5: home `removecontact` confirm owed — answered here for chat + chat info) · #1465 (the dials) · **#1468 (this change)** · #1470 (#46, S-7) (Session Safety; Safety Dials q1 = A: native confirm on the CHAT page + CHAT INFO; the HOME page keeps its own page sheet, D5 as told to BE; q2: the nickname native prompt is PARKED to after launch, feature freeze).

## What changed and why
- **Why native.** A page sheet is drawn by the same page — a script in that WebView can skip it and send the verb (chat kick / ban had no sheet at all: one tap in `chat.html`'s member sheet). The system dialog (MAUI `DisplayAlert` on the root page, via `displaySpixiAlert`) is outside every WebView; no page script can answer it. The `SPayments.confirmAndAuth` pattern.
- **The verbs (flag ON → a native OK first; OFF → at once, the body unchanged and moved into a `…Now()` method).**

| Page (WebView) | Verb | Line | After OK |
|---|---|---|---|
| chat (`SingleChatPage`, UNTRUSTED content) | `ixian:kick:<addr>` · `ixian:ban:<addr>` | `SingleChatPage.xaml.cs:803` · `:819` → `confirmMemberAction` `:4379` | `onKickUser` / `onBanUser` |
| chat | `ixian:leave` (group / bot) | `:842` → `confirmLeave` `:4360` | `leaveRoomNow` `:4307` |
| chat info (`ContactDetails`) | `ixian:removecontact:<0\|1>` | `ContactDetails.xaml.cs:549` (`:566-575`) | `removeContactNow` (`:1063`) |
| chat info | `ixian:removehistory` | `:581` | `onRemoveHistory` |
| chat info | `ixian:leave` | `:936` | `leaveRoomNow` (`:1105`) |
| chat info | `ixian:kick:<addr>` · `ixian:ban:<addr>` | `:1005` · `:1019` → `confirmMember` `:1250` | `kickNow` (`:1179`) / `banNow` (`:1200`) |

  NOT changed: home `ixian:removehistory:` / `removecontact:` / `leavegroup:` (`HomePage.xaml.cs:1019`, `:1023`, `:1048`) keep the page sheet (D5); chat-info `ixian:userdefinednick:` (`ContactDetails.xaml.cs:1046`) — the native prompt is parked (q2).
- **ONE confirm app-wide (`ConfirmGate`, pure, one lock).** `tryEnter` gives a token or 0; a second ask while one is up answers false at once (`busy`). It is refused while ANY other Spixi alert is up (#46 r1 R2 MAJOR-2). Released ONLY by the holder's `exit(token)` (a stale token is ignored, r2 n-2).
- **NO time bound = fail closed (#46 r3 MAJOR-1).** The r2 bound (120 s) released a confirm that was still ON SCREEN, so a page could wait it out and stack alerts again. Now: if a dialog task ever never completed, every later confirm answers `busy` (nothing destructive happens) and other alerts are dropped (a dropped two-button alert answers false = cancel) **until restart**. Walk row: rotate / background the app with a confirm open, then try a confirm and a payment.
- **Other alerts while a confirm is up are DROPPED.** Both `displaySpixiAlert` overloads (flag ON, not the confirm's own call): `SConfirm.tryNoteAlertOpened()` = the drop test and the count in ONE locked step (r4 NIT-1); 0 → one fixed warn, the 4-arg answers false, the 3-arg completes at once. Each other alert is counted by its own token until its task ends (r3 MINOR-1: a late close never uncounts another); the 3-arg path un-counts on a synchronous throw (r2 m-2), on a null task (r4 NIT-2), and resolves the host page inside the try (r5 NIT). Only `SConfirm` passes `nativeConfirm: true` (pinned by count).
- **The lock, before and after.** `askAsync` answers `busy` while the app lock is up (r1 R2 MINOR-2) and turns an OK into Cancel when the lock came up during the dialog (r2 m-3) — a bystander at the lock is not the user.
- **An OK under 600 ms after the REQUEST = Cancel (`fast`)** (r4 MINOR-1: a page times the verb on the first tap of a double tap it asked for, so the second tap lands on the native OK). `SafetyRules.MinConfirmMs` (`SafetyRules.cs:235`), measured from the request (`SConfirm.cs:63`), not from the moment the dialog is visible.
- **Fixed log lines.** One per outcome: `[CONFIRM] <verb> ok|cancel|busy|fast` (`SafetyRules.confirmLine`, `:240`; verb ∈ removecontact · removehistory · leave · kick · ban).
- **Names through `SafetyRules.dialogName`** (`:171`): control characters, line / paragraph separators and the bidi controls dropped, trimmed, 48-character cap with "…" never splitting a surrogate pair; an empty name → the FALLBACK, cleaned the same way (r1 R2 MAJOR-1). The name only ever reaches a `{0}` argument (`confirmTexts`, `:197`; a malformed translation falls back to "<text> <name>"). No-nickname fallback = the contact / room address (r1 R2 N-1: never "Remove ?" or "Leave Leave Group?").
- **Kick / ban parse the address BEFORE any dialog** (r1 R2 MAJOR-1): a malformed payload is the action's own fixed warn and NO dialog — a page cannot put its own text into a native dialog (`SingleChatPage.xaml.cs:4383-4392`, `ContactDetails.xaml.cs:1252-1261`). The dialog names the member by their declared nick, else the PARSED address. (Before: chat `new Address(...)` was unguarded in `onNavigating`, the A-4 rule.)
- **Cancel.** Chat info: `confirmThen` (`ContactDetails.xaml.cs:1219`) answers the verb's EXISTING result push with the new word `cancelled` (`SafetyRules.CancelledStatus`): `removeContactResult` / `removeHistoryResult` / `leaveGroupResult (<this contact's address>, "cancelled")`. `contact_details.html:1239` returns on it (no toast; the sheet already closed); `leaveGroupResult` / `removeHistoryResult` act on `left` / `ok` only (`:1261-1267`), so `cancelled` changes nothing there. Kick / ban re-send the roster on Cancel (`loadMembers`, `:1273-1279`; r1 R2 MINOR-1: the member sheet removed the row when it sent the verb). Chat page: Cancel = nothing (no pending row).
- **Remove contact with leave (`removecontact:1`) tells the shared-group count** (r2 m-4): "You also leave the groups you share with this contact (N)." (new key `safety-confirm-removecontact-leave`; `ContactDetails.xaml.cs:569-573` counts `SContacts.sharedGroups` before the dialog) — a page cannot turn "Remove Bob?" into a silent multi-group leave.
- **The bot-not-ready alert** (a peer-timed direct `DisplayAlert` on the chat page) goes through `displaySpixiAlert` with the flag ON (`SingleChatPage.xaml.cs:1539-1548`; r2 n-1), so it is counted / dropped like the others.
- **Strings.** Reused (translated): `chat-modal-kick-*`, `chat-modal-ban-*`, `contact-details-delete-history-modal-*`, `contact-details-delete-contact-modal-subtitle` / `-confirm`, `chat-bot-leave`, `global-dialog-cancel`. NEW (14 locales, `lang/*.txt`; en-us `:229-232`): `safety-confirm-removecontact-title` ("Remove {0}?"), `safety-confirm-removecontact-leave`, `safety-confirm-leave-title` ("Leave {0}?"), `safety-confirm-leave-text`.
- **Flag.** Int pref `flagNativeConfirm` (`SpixiFlags.cs:26`, `:79`, `:138`), absent = ON, a stored 0 acts only in dev mode; in the `[FLAGS] safeappid=… nativeconfirm=… …` line. OFF = the verbs act at once AND `displaySpixiAlert` neither counts nor drops (today). Dev switch `ixian:devflash:nativeconfirm:<0|1>`.

## Files
- `Spixi/Utils/SConfirm.cs:47` `askAsync` · `:49` the token · `:58` lock before · `:63` the clock · `:64` the dialog (`nativeConfirm: true`) · `:66` lock after · `:70` fast · `:79` the type-only failure · `:84` exit · `:92` `textsFor`.
- `Spixi/Utils/ConfirmGate.cs:23` `tryEnter` · `:37` `exit` · `:56` `tryAlertOpened` · `:70` `alertClosed`.
- `Spixi/Utils/SafetyRules.cs:156` `ConfirmVerb` · `:160` `cancelled` · `:171` `dialogName` · `:197` `confirmTexts` · `:235` 600 ms · `:240` `confirmLine`.
- `Spixi/Utils/SpixiContentPage.cs:6284` the 4-arg overload (`:6294` drop + count) · `:6329` the 3-arg overload (`:6340` drop + count, `:6357` / `:6365` / `:6369` the un-count paths).
- `Spixi/Pages/Chat/SingleChatPage.xaml.cs:803` · `:819` · `:842` · `:1539` · `:4307` · `:4360` · `:4379`.
- `Spixi/Pages/Contacts/ContactDetails.xaml.cs:549` · `:581` · `:936` · `:1005` · `:1019` · `:1063` · `:1105` · `:1179` · `:1200` · `:1219` `confirmThen` · `:1250` `confirmMember`.
- `src/shells/contact_details.html:1238-1239`.
- `Spixi/Resources/Raw/lang/*.txt` (14): the four `safety-confirm-*` keys.
- Tests: csh `ConfirmGateTests` (`one_at_a_time`, `others_refuse`, `per_alert`, `foreign_exit`, `no_time_bound`, `try_alert_opened_is_atomic_with_the_drop`) · `SafetyRulesTests.dialog_name_and_confirm_line` (incl. `tooFast`) · `confirm_texts_name_only_as_a_sanitised_argument` (a hostile-name corpus, the N = 1 group case) · pin `scripts/pins-safety/c-confirm.mjs` (7 checks: chat · chat info · home keeps its sheet · SConfirm · strings · shell · dev).

## Bridge surface
| Verb / push / sink | Args (shape) | Who can send it | Handler | Ours / reshaped |
|---|---|---|---|---|
| `ixian:kick:<addr>` · `ixian:ban:<addr>` · `ixian:leave` | an address · none | chat.html → SingleChatPage (UNTRUSTED) | `:803` · `:819` · `:842` | reshaped: a native OK first |
| `ixian:removecontact:<0\|1>` · `ixian:removehistory` · `ixian:leave` · `ixian:kick:<addr>` · `ixian:ban:<addr>` | the leave flag · none · an address | contact_details.html → ContactDetails (renders peer names, roster, shared media) | `:549` · `:581` · `:936` · `:1005` · `:1019` | reshaped: a native OK first |
| push `removeContactResult` · `removeHistoryResult` · `leaveGroupResult` | `(<address>, "cancelled")` — one new status word | C# → contact_details.html | `confirmThen` | reshaped (a new value) |
| native dialog `DisplayAlert(title, text, ok, Cancel)` | `confirmTexts`: legacy / new keys + a cleaned name or address as `{0}` | C# only | `SConfirm.askAsync` → `displaySpixiAlert(…, true)` | ours |
| `ixian:devflash:nativeconfirm:<0\|1>` · push `setFlagsDevSafety` | one digit · six digits | dev.html → DevPage (dev mode only) | `DevPage.xaml.cs:141` · `:410` | ours (dev surface) |
| log `[CONFIRM] <verb> ok\|cancel\|busy\|fast` · `[CONFIRM] the dialog failed (<Type>)` · `[CONFIRM] an alert was dropped while a confirm is up` · `[CONFIRM] <verb> failed (<Type>)` · `<verb>: invalid address payload: <Type>` | fixed words + a verb word / a type name (never a name or an address) | C# | SConfirm · SpixiContentPage · the two pages | ours |

## Threat → rule → proof
| A hostile page / peer could try… | What stops it | Proof |
|---|---|---|
| send kick / ban / leave / remove / clear with no user step | the verb waits for a native OK the page cannot answer | pin `c-confirm` (chat, info: the act only after `await SConfirm.askAsync` is true) |
| stack two confirms, or an OK-only alert over / under the confirm, so a repeated tap hits the destructive button | one confirm app-wide; refused while another alert is up; other alerts dropped while it is up (one atomic step) | csh `one_at_a_time` · `others_refuse` · `try_alert_opened_is_atomic_with_the_drop` · pin `c-confirm` (sconf: alertGate4 / alertGate3) |
| wait out the confirm, then stack again | no time bound (fail closed) | csh `no_time_bound` · `foreign_exit` |
| uncount a live alert with a late close | per-alert tokens | csh `per_alert` |
| time a double tap onto OK | an OK under 600 ms after the request = Cancel (`fast`) | csh `dialog_name_and_confirm_line` (`tooFast`) · pin `c-confirm` (sconf: tooFast) |
| a bystander confirms at the lock | `busy` while locked; OK → Cancel if the lock came up | pin `c-confirm` (sconf: refusesOverOthers — the lock check before the dialog and after it) |
| spoof the dialog with a name (newlines, RLO, `{1}`, 10 000 chars) or a malformed kick payload as the fallback | `dialogName` on the name AND the fallback; `{0}` argument only; kick / ban parse first, no dialog on a bad payload | csh `confirm_texts_name_only_as_a_sanitised_argument` · pin `c-confirm` (memberParseFirst, textsPure) |
| a silent multi-group leave behind "Remove Bob?" | the native text says "You also leave … (N)" | csh `confirm_texts_…` (N = 1 and N > 1) |
| a peer-timed bot alert stacks on the confirm | routed through `displaySpixiAlert` | pin `c-confirm` (botAlert) |
| a name / address in ixian.log | fixed lines | csh `dialog_name_and_confirm_line` (`confirmLine`) · pin `c-confirm` (sconf: logsFixed) |
| (flag OFF) | the old path | pin `c-confirm` (the OFF branches call the `…Now()` bodies) |
| (worst case) | after a dialog task that never completes, confirms answer `busy` and other alerts are dropped until restart (nothing destructive) | walk row |

## Recorded, not fixed (#46 rounds 1–5)
- **R2 MINOR-4** desktop type-ahead: Enter on a default (accept) button. MAUI `DisplayAlert` gives no control over the focused button → walk row (Windows + Mac: which button has focus).
- **R7 MINOR** a steady-rhythm tap ("tap every second") lands a later tap on OK at ≥ 600 ms; MAUI `DisplayAlert` has no delayed / disabled OK. With **R6 MINOR-1 part 2** ("confirm only from the top page / no recent WebView tap") this is a later option; walk row.
- **R7 NIT** the 600 ms timer starts at the request, not when the dialog is visible (a slow present shortens the real window).
- **R7 NIT** a real OK under 600 ms becomes a SILENT Cancel (fails safe; the user taps again) — walk row.
- **R7 NIT / R5 N-1** the shared-group count N is taken before the dialog (time of check; a group joined during the dialog is not counted).
- **R5 N-3** direct `DisplayAlert` / `DisplayActionSheet` calls, the share sheet and Save-as are NOT counted by the gate (only `displaySpixiAlert` is).
- **R4 n-5 / R6 NIT-5** invisible `Lo` filler characters in a nick survive `dialogName` (a blank-looking name; the fallback is not used).
- **R4 n-6** a `blocked` remove can show two OKs in sequence (the native confirm, then the sheet's blocked answer).
- The legacy kick / ban texts still say "server" (`chat-modal-kick-body`, en-us `:182`); the confirm now names the member.
- Home keeps its page sheet (D5) — the three home verbs act on the sheet's tap only.
- The nickname native prompt (`ixian:userdefinednick:`) is parked to after launch (q2).

## Cost
One native dialog per destructive verb; one lock per alert. Nothing else at runtime.

## How to switch it off
Developer mode on → Developer › Release flags → "System confirm before remove, leave, kick, ban (Safety S-5)" off → restart.

## Question for BE
Is a native OK / Cancel enough for kick and ban in a bot room (yes), or do you want the same for the HOME verbs too, reversing D5 (yes / no)?
