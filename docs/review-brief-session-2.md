# Review brief — session 2 (#1118–#1120)

File name: `docs/review-brief-session-2.md`. Work order for the #46 adversarial loop (docs/process.md). Written BEFORE
round 1. The VERDICT is written back into §5 when the loop closes (#660).

## 1 · What the batch is
| Item | What landed | Where (files) | DECISIONS |
|---|---|---|---|
| E-W1 | Mac/iPhone call crash (SIGSEGV in -[AVAudioNode dealloc]): IO-node wrappers held in fields, disposed BEFORE the engine | `Platforms/{MacCatalyst,iOS}/SAudio{Player,Recorder}.cs` | #1114, #1118 |
| G-1 | Android chat open: the #1101 0.01 pre-reveal REMOVED; the spare chat is shown at once with all four grounds transparent (stage · content · MAUI WebView · native WebView) so the chats list stays on glass until the chat drew (`PresentHold`: PostVisualStateCallback + 1 Choreographer frame, cap 250 ms); `[CDPERF] chat held frames= ms= why=` | `Utils/SpixiContentPage.cs` (holdUntilDrawn, tryHoldUntilDrawn, holdStageUntilDrawn, setHoldGrounds), `Platforms/Android/PresentHold.cs` | #1116 (1), #1117 (4) |
| G-2 | "last seen" survives a restart: `Meta/SSightingStore.cs` (one app pref `last_sightings`, 5-min grain, cap 512, wipe + forget) + `PresenceDisplay.newestSighting` (+ their last incoming message) | `Utils/PresenceDisplay.cs`, `Network/NetworkProtocol.cs`, `Pages/Settings/SettingsPage.xaml.cs` (wipe), `Utils/SContacts.cs` · `SingleChatPage` · `HomePage` (forget), `Spixi-UnitTests/SightingStoreTests.cs` | #1116 (2), #1118 (a) |
| G-3 | `[PRESENCE] c<N> keepalive …` + `[PRESENCE] c<N> dot=on/off age= core=` | `Utils/PresenceDisplay.cs` | #1116 (3) |
| E-W3 | `[NICK] received c<N> len=` · `[NICK] broadcast to <n>` | `Network/StreamProcessor.cs`, `SettingsPage.xaml.cs` | #1114 (3) |
| G-9 | `[CALLPAINT]` console line in the call shell's paint handshake | `src/shells/call.html` | #1115 |
| E-W2 | an avatar message re-pushes the OPEN chat's header avatar | `SingleChatPage.pushHeaderAvatar`, `StreamProcessor` case avatar | #1114 (2) |
| E-W4 | Mac rings (bundled mp3); 🟡 `ixian:callRingtone` + `setCallRingtone` + cap; pref `call_ringtone`; VoIPManager gate; no "Silence" when off; switch row | `Platforms/MacCatalyst/SPlatformUtils.cs`, `Meta/SNotificationPrefs.cs`, `VoIP/VoIPManager.cs`, `CallPage.xaml.cs`, `SettingsPage.xaml.cs`, `src/shells/settings.html`, `src/components/settings-screens.js`, 13 string files | #1118 |
| E-W5 | desktop call backdrop clips itself (`clip-path`) | `src/styles/components/call-screen.css` | #1114 (5) |
| E-W6 | NO code: the rule renders blue in WebKitGTK (desktop + maccatalyst, both themes) → a walk re-check with a clean Mac build | — | #1114 (6) |
| E-W7 | Mac windows' OverrideUserInterfaceStyle follows the app theme | `Utils/ThemeManager.cs`, `App.xaml.cs` | #1118 |
| G-4 | the jump pulse covers file / media / typed-card bubbles | `src/shells/chat.html` | #1116 (5) |
| G-5 | Downloads "From" = section header (count + accent text button) | `src/components/settings-app.js`, `settings-app.css` | #1119 |
| G-6b | real thumbnails: `SThumbnail.makeJpeg` per platform (bounded decode), `SharedItems.thumbOf` (≤ 64 KB as is, else a thumbnail; cache; 60 per push) | `Platforms/{Android,iOS,MacCatalyst,Windows}/SThumbnail.cs`, `Utils/SharedItems.cs` | #1121 |
| G-6 | chat info shared items Telegram style (chips in place, edge-to-edge grid, last block, ≤ 60 then Show all); long press = menu (Open · Show in chat · Copy link); 🟡 `ixian:sharedShow` | `src/components/shared-items.js`, `chat-info.js`, `shared-items.css`, `src/shells/contact_details.html`, `Pages/Contacts/ContactDetails.xaml.cs` | #1119, #1120 |

Not built, and why: Share/Save · Delete from this device · Delete message in the G-6 menu (each a new verb, after the BE answer, #1118/#1120) · P-1 (session 3).

## 2 · How to run
- Tree: container twin `/home/claude/w/Spixi` of "3c9fc618 #1117 Session 2 inputs …" + #1118 row; the working-tree diff (`git diff` against the twin's base commit "base") · Ixian-Core @097341a at `../Ixian-Core` (present)
- Pipeline: FULL (extract-strings → build-locales → build-strings-iife → build-demo-bundle → build-shells) · `--check` gates green · cs-syntax-check 199 clean
- Smoke before: `BASELINE OK 5075` / the 2 KNOWN (#136 · B3)
- C# is UNCOMPILED (no MAUI workload). `/home/claude/w/csh` (dotnet 8) runs the REAL PresenceDisplay + SSightingStore + both MSTest files against Core stubs: 18/18.
- Author mutations: `/home/claude/w/s2/mutations.md`.

## 3 · Auditor scopes (disjoint)
| Auditor | Scope (files) | Focus |
|---|---|---|
| A | all changed C# (+ PresentHold.cs, SSightingStore.cs, the four SThumbnail.cs) | compile-level correctness (ImplicitUsings OFF: every type needs a using; nullability), threading (UI vs network vs decoder threads, locks), Android API use (VisualStateCallback, Choreographer), AVAudio lifetimes, Preferences writes off the UI thread, the "C# touches no risky parts" fence, Core routing untouched |
| B | `src/` shells + components + css + strings | behaviour on the BUILT shells, both themes, an older exe (missing cap / push / verb), long-press vs scroll vs tap, a11y (tabs, sheet, focus, 44 px), the security-gate triggers, the conservative-CSS baseline |
| C | `scripts/smoke-test.mjs` session-2 block + the re-based pins (N52, NOTIF-2, #708, #978, A1, B6, #1101 0b(b)→G-1, #1103) + `Spixi-UnitTests/SightingStoreTests.cs` | does each pin fail when its behaviour breaks? derive cases, do not trust the author's list; re-based pins must not have been weakened |

## 4 · Non-negotiables and accepted dials
- Must hold: the PARAMOUNT isolation invariant (#220/#221) · no WebView path/URL into a file op (ids only) · no address / name / nick / text in logs · bundle BEFORE shells · new verbs/pushes are additive (older shell/exe degrades quietly) · `friend.online` (routing) untouched · no Ixian-Core change.
- Accepted (do not re-open): #1113 three words · #1116 hold the list / save + messages / probe first · #1117 corner left as is · #1118 G-2 (a), E-W4 ring + switch, E-W7 follow app theme, delete-from-device render only · #1119 G-5 C, G-6 Telegram, menu sheet · #1120 menu = Open · Show in chat · Copy link · #1121 real thumbnails now.

## 5 · Verdict

**CLEAN at round 4** (a fresh reader over the round-3 fixes: 0 MAJOR). Smoke `BASELINE OK 5089` / the 2 KNOWN (+14 = the
session-2 pins; re-based pins counted once) · `node scripts/run-csh.mjs` 26/26 (the new in-repo C# harness) · `--check`
gates green · cs-syntax-check 205 clean.

| Round | Reader | MAJOR | MINOR | NIT | Notes |
|---|---|---|---|---|---|
| r1 | A (C#) · B (shells) · C (pins), Opus, parallel | 11 | 23 | 23 | A1 lastMessage false "seen now" · A2 contact images decoded in-process (no gate row) · B1 two menus per hold · C M1–M8 presence-only / weakened pins (45 of 64 mutations survived) |
| r2 | fresh reader | 2 | 4 | 4 | R2-M1 the 800 ms lapse re-opened B1 · R2-M2 the B7 fix removed the chips' selected look (and a pin locked it in) |
| r3 | fresh reader | 1 | 3 | 4 | R3-M1 a second right click opened nothing (reset after the button check — the message-menu.js:210 lesson) |
| r4 | fresh reader | **0** | 4 | 5 | R4-m1–m3 pin gaps → pinned; R4-m4 the BE doc entry → written |

**MAJORs (mechanism → fix):** A1 the chat's persisted lastMessage carries a LOCAL receive time for many incoming types
(Core stamps 0 with the local clock) → source removed (noteHeard already keeps every message at the sender's time) ·
A2 a contact's files decoded in the key-holding process → first-bytes sniff, 20 MB cap, both-sides-bounded decode, gate +
BE rows · B1 / R2-M1 / R3-M1 the long-press state machine (contextmenu vs timer vs right button) → the house grammar
(message-menu / chats-row-menu): reset on the next pointerdown (before the button check) or keydown, never a timer ·
R2-M2 a role=tab chip keyed on aria-pressed → its own aria-selected rule · C M1–M8 → pins on the effectful lines, executed
shell pins (E-W4 through the built settings shell, G-6 every event order), the pure C# seams (`noteInto`, `ImageSniff`)
executed by MSTest + `scripts/csh`.

**Deliberate breaks:** author 30 (all killed, `docs/…` mutation log in the handoff) · auditors r1 70 (45 survived → fixed,
all re-killed) · r2 22 (9 survived → 5 findings fixed, 4 accepted) · r3 21 (9 survived → fixed) · r4 14 (7 survived → the
pin gaps, fixed).

**Recorded, NOT fixed (low risk):** A3 E-W7: switching an explicit pick back to System reads MAUI's cached theme first and
self-corrects on RequestedThemeChanged (walk row) · A8 the time-pitch node is not disposed before the engine (not an IO
node; the crash was IO nodes) and no lock between stop() and the decode callback (pre-existing) · A9 EXIF rotation on
Android / Windows tiles · A11 a bounded per-open leak if the visual-state callback never fires · A12 a theme sweep during
the ≤ 250 ms hold shows that one open's ground frames · A14 an avatar data-URI cache keyed by mtime · B9 / R4-n5
`sharedShow` has no cap gate (shell and exe ship together) · B11 the filtered From button has no visual state · B12 no count
when no sender is known · B13 the chip label word order is fixed · B15 no grid width cap on a wide desktop window · B16 the
pulse replaces a card's hairline for 1.4 s · R3-m2 the chips' selected look is pinned as CSS text (render = walk row) ·
R3-n1 / R3-n3 / R4-n2 touch-release and screen-reader click edge cases (walk rows) · R4-n4 the chats list takes taps during
the ≤ 250 ms hold.
