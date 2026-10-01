# Review brief — session 1: carry-over · implied read · last seen · shared items · Downloads (#1101–#1111)

File name: `docs/review-brief-session-1.md`. Work order for the #46 adversarial loop (docs/process.md). Written BEFORE
round 1. The VERDICT is written back into §5 when the loop closes (#660).

## 1 · What the batch is
| Item | What landed | Where (files) | DECISIONS |
|---|---|---|---|
| 0b(a) | phone bar reveal snaps (no 120 ms C# fade) + `[CALLSWAP]` probe stamps (layout / stageH / webviewH) | `Pages/Call/CallPage.xaml.cs` | #1101 |
| 0b(b) | Android spare chat: permanent MAUI container (zero shadow) + present 0 → 0.01 for 34 ms → 1 | `Utils/SpixiContentPage.cs` | #1101 |
| 0b(d) | Windows: scrim tap outside the ring card → `callBack`; compact ring shows the e2e chip | `CallPage.xaml.cs`, `src/shells/call.html` | #1101 |
| 1 | implied read (1:1): `ImpliedRead.markThrough` on a `msgRead`; ONE `updateTicks(json)` push; MSTest | `Utils/ImpliedRead.cs`, `Network/StreamProcessor.cs`, `Utils/UIHelpers.cs`, `Pages/Chat/SingleChatPage.xaml.cs`, `src/shells/chat.html`, `Spixi-UnitTests/ImpliedReadTests.cs` | #1102 |
| 2 | display-only "online" (≤ 150 s sighting) + "last seen" (coarse) in header + chat info; `[PRESENCE]` probe | `Utils/PresenceDisplay.cs`, `Meta/Node.cs`, `Network/NetworkProtocol.cs`, `Network/StreamProcessor.cs`, `Utils/UIHelpers.cs`, `Pages/Home/HomePage.xaml.cs`, `SingleChatPage.xaml.cs`, `Pages/Contacts/ContactDetails.xaml.cs`, `src/components/timestamp.js`, `chat-info.js`, `chat.html`, `contact_details.html` | #1103, #1109 |
| 3 / 4 | BE ask rows; deferred row | `docs/be-cutover-brief.md`, `docs/security-review-for-be-engineer.md` | #1104, #1105 |
| 5 | shared media/files/links: C# scan + `setSharedItems` + `ixian:sharedOpen` + chat jump; "cards" section + "See all" cover | `Utils/SharedItems.cs`, `Utils/LinkRule.cs`, `Utils/SContacts.cs` (wrapper), `ContactDetails.xaml.cs`, `SingleChatPage.xaml.cs` (jump), `src/components/shared-items.js` (+css), `chat-info.js`, `contact_details.html`, `chat.html` (`jumpToMessage`), `Spixi-UnitTests/LinkRuleTests.cs` | #1106, #1110 |
| 5b | Downloads: newest first, size, sender via the file's own message (phase 2), From chip + sheet, Show in chat | `Utils/DownloadsIndex.cs`, `Pages/Settings/SettingsPage.xaml.cs`, `src/components/settings-app.js`, `src/shells/settings.html`, `downloads.html` | #1107, #1111 |
| gate | ours, fixed: name / exception text out of two Downloads log lines | `Data/TransferManager.cs`, `SettingsPage.xaml.cs` | #1107 |
| fiat | recorded only (server-side fix) | `docs/be-cutover-brief.md` FIAT-FEED | #1108 |

Not built, and why: 5b(c) sort control (Damir dropped it, #1111) · bots in shared items (v1, #1106) · the "going offline"
announce (BE, v1.1) · app-side fiat fetch (Damir: server side, #1108).

## 2 · How to run
- Tree: the cloud twin of `62f1a007` "#1097-#1100 Workflow reset" + this session's working-tree diff (`git diff` in
  `/home/claude/work/Spixi`, base commit "1101-1107 rows") · Ixian-Core @097341a at `../Ixian-Core` (present)
- Pipeline: FULL (bundle BEFORE shells) · smoke before: `BASELINE OK 5049` · known failures: the 2 KNOWN (#136 · B3)
- C# cannot be compiled here (no MAUI workload). `dotnet` 8 IS available: `/home/claude/work/csh` runs ImpliedRead + LinkRule
  + both MSTest files against small Core stubs (`dotnet run`).

## 3 · Auditor scopes (disjoint)
| Auditor | Scope (files) | Focus |
|---|---|---|
| A | all changed C# | compile-level correctness (ImplicitUsings is OFF: every type needs a using), threading (UI vs Task.Run, locks, Core's `messages` lock), nullability, the "C# touches no risky parts" fence, Core routing untouched |
| B | `src/` shells + components + css | behaviour, both themes, an older exe/shell (trailing args, missing pushes), the security-gate triggers, a11y (tabs, sheet, focus) |
| C | `scripts/smoke-test.mjs` session-1 block + the rebased pins | does each pin fail when the behaviour breaks? derived, not author-listed; mutation log `/tmp/mut.txt` |

## 4 · Non-negotiables and accepted dials
- Must hold: the PARAMOUNT isolation invariant (#220/#221) · no WebView path or URL into a file op or URL open (ids only) ·
  no URL/address/name/text in logs · nothing fetched for a link or thumb · `friend.online` (routing) untouched · groups/bots
  never get implied read · bundle BEFORE shells · new pushes/verbs are additive (an older shell/exe degrades quietly).
- Accepted (do not re-open): 150 s window (#1103) · "show nothing" when last seen is unknown (#1103) · three-word wording, no dates (#1113, replaces #1109) ·
  loaded-window implied read (#1102) · cards layout (#1110) · no sort, From sheet (#1111) · thumbs ≤ 300 KB local (#1106) ·
  jump cap 1000 (#1106) · bots excluded (#1106) · one batch (#1101) · fiat server-side (#1108).

## 5 · Verdict — CLEAN at round 5 (0 MAJOR; every MINOR fixed or recorded)

| Round | Reader | MAJOR | MINOR | NIT |
|---|---|---|---|---|
| r1 | three disjoint auditors: A (C#), B (shells), C (pins) | 1 + 2 + 6 = 9 | 9 + 7 + 7 = 23 | 7 + 9 + 2 = 18 |
| r2 | fresh reader (the r1 fixes first) | 2 | 3 | 9 |
| r3 | fresh reader | 2 | 3 | 4 |
| r4 | fresh reader | 1 | 3 | 2 |
| r5 | fresh reader + full smoke | **0** | 3 (all fixed) | 3 (1 fixed, 2 recorded) |

### The MAJORs (mechanism → fix)
| # | Mechanism | Fix | Lesson |
|---|---|---|---|
| A1 | implied read marked a still-PENDING message read and hid its expiry error | `qualifies` needs `sent \|\| confirmed` + `!errorSending`; MSTest `AMessageThatNeverLeftStaysUnread` | an "own" flag is not "left the device" |
| B1 | a jump on a fresh open was undone by `bootRepin` | `onChatScreenLoaded` stops the repin, then jumps (instant) | two scroll owners at boot = the later one wins |
| B2 | a re-push of senders reset the From filter | the filter stays; a sender that is gone clears it | |
| C1 | the smoke was red (#345, chat.html over its ceiling) | `CHAT_KB_CEIL` 704 → 710 with the measured margin | a quick runner hides the global gates |
| C2–C6 | pins were presence-of-text, one slice was vacuous, C# presence had no executed test | executed pins on the built shells; the csh harness + MSTest for `ImpliedRead`, `PresenceDisplay`, `LinkRule`; anchored slices | every pin needs a deliberate break |
| R2-1 | a filter on a sender that left could not be cleared (chip hidden) | `renderSenders` clears a filter whose sender is gone | |
| R2-2 | the merged CSS rule broke the old 44 px pin (`.c-settings-dl__del {`) | `.c-settings-dl__go` has its own rule | a CSS merge is a text change for every source pin |
| R3-1 | stale senders BY NAME after a reopen | `dlSenders` resets on a NEW screen; keys are per scan | |
| R3-2 | "Show in chat" opened the chat UNDER the Account pane | `HomePage.exitAccountForChat()` before `onChat` | |
| R4-1 | the sender came from FriendList order, and a reused path gave the wrong sender | a match needs the recorded SIZE (`FileMatch`), and the newest message wins | a path is not an identity |

### Round 5 MINORs (all fixed)
- **R5-1** the `orderNewest` read was unguarded (a rename crashed the whole smoke) → `(… || {}).textContent`. N1 now ends as 2 ✗ + the summary.
- **R5-2** `fileMatches` was text-pinned only → moved to `Spixi/Utils/FileMatch.cs` and EXECUTED by `Spixi-UnitTests/FileMatchTests.cs` (5 tests) + the csh harness (23/23). N4 (`if (true)`) fails 3 tests.
- **R5-3** the index was not re-checked inside one screen → `sourceOf` re-runs `FileMatch.matches` on the stored message. N5 killed.
- **R5-4 (NIT, fixed)** a late answer from an earlier screen's scan → a per-screen counter. N6 killed.

### Deliberate breaks
Author set: 35 + 4 (round 5) — 38 killed, 1 survivor whose claim was withdrawn. Every reviewer mutation set r1–r5 is killed,
except where the reviewer accepted the survivor. Log: `/tmp/mut.txt` (cloud), the round reports `/home/claude/work/s1/review/`.

### Recorded, not fixed (DECISIONS #1112)
- **R2-11** `LinkRule.cs` IgnoreCase uses .NET case folding; the JS rule does not fold the Kelvin sign (`x.\u212Aa.com`). A link the C# list shows that the bubble does not linkify (or the reverse) — display only, no fetch.
- **R2-13** the "See all" cover closes on Esc only while focus is inside it; no `role="dialog"` / `inert`. The back button and edge-back always close it.
- **R4-5** a jump widens the chat window (≤ 1001 rows) for the page's lifetime, like "load more".
- **R5-5** recency is the header's arrival time; a same-size file accepted late, or a sizeless (0-byte) legacy message, can win over the real sender. Low probability.

### Final numbers
- Smoke: `BASELINE OK 5075 / the 2 KNOWN (#136 · B3)` (before: 5049).
- csh harness (real `ImpliedRead`, `LinkRule`, `PresenceDisplay`, `FileMatch` + their MSTest files): 23/23.
- `cs-syntax-check`: 196 files parse. `build-shells --check` ✓.

### ⚠ C# UNCOMPILED (the next build is the first compile; a build error is this batch's bug)
`Pages/Call/CallPage.xaml.cs` · `Utils/SpixiContentPage.cs` · `Utils/ImpliedRead.cs` · `Utils/PresenceDisplay.cs` ·
`Utils/SharedItems.cs` · `Utils/FileMatch.cs` · `Utils/LinkRule.cs` · `Utils/DownloadsIndex.cs` · `Utils/SContacts.cs` ·
`Utils/UIHelpers.cs` · `Network/StreamProcessor.cs` · `Network/NetworkProtocol.cs` · `Meta/Node.cs` ·
`Pages/Chat/SingleChatPage.xaml.cs` · `Pages/Home/HomePage.xaml.cs` · `Pages/Contacts/ContactDetails.xaml.cs` ·
`Pages/Settings/SettingsPage.xaml.cs` · `Data/TransferManager.cs` · `Spixi-UnitTests/{ImpliedRead,LinkRule,PresenceDisplay,FileMatch}Tests.cs`
