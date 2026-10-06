# Review brief — session 7 (#1207–#1209): voice messages + the capability ask

## 1 · What landed
S7 per #1207 / #1208: `VoiceCodec` (inline format, Ogg Opus mux / demux, peaks, route), `SpixiProtocols` ask, `VoiceClips` (recording, kept clips,
native player), 4 platform recorder / player voice modes, SingleChatPage verbs / pushes / send routes / play-after-download, receive text rules
(chats list, notification, reply excerpt, edit guard), the shell (mic, recording bar, voice bubble, menu, quotes). Contract: the session scratch
`CONTRACT.md` §1–§7 (wire formats and bridge V1–V8 are restated in DECISIONS #1209).

## 2 · How to run
Cloud twin: clone + Ixian-Core @097341a sibling + `npm i --no-save jsdom eslint globals tree-sitter tree-sitter-c-sharp` + .NET 10 SDK.
`node scripts/smoke-test.mjs` → BASELINE OK 5346 / 2 KNOWN · `node scripts/run-csh.mjs` → CSH 190. Single modules: the smoke prelude (lines 1–527) + `pins-s7/<mod>`.

## 3 · Scopes (round 1)
A: all changed C# (compile, threading, platform audio, calls unchanged, security) · B: shell + the C#↔shell seam · C: tests + the wire format + re-bases + mutations.

## 4 · Must hold
No audio / path / name into a WebView · C# names its files · bounded, non-throwing peer parsing · calls unchanged · logs carry no id / text / path / address ·
older shell ignores new args · older exe never declares `voice` · a voice row never shows base64 · no Core change.

## 5 · Verdict
| Round | Reader | MAJOR | MINOR | NIT |
|---|---|---|---|---|
| r1 | A (C#) | 0 | 8 | 10 |
| r1 | B (shell / seam) | 1 | 11 | 7 |
| r1 | C (tests / wire; 53 mutations, 37 survivors) | 0 | 5 | 7 |
| r2 | fresh reader | 1 | 5 | 8 |
| r3 | fresh reader | 0 | 3 | 3 |
| r4 | break-my-verdict | 0 | 1 | 3 |

**CLEAN** (r3, r4). MAJORs: r1 B-M1 — a voice-file bubble could stay `loading` for good (no answer on an impossible / stalled / refused
download) → C# answers every case (§7) + the shell settles offer / pause; lesson L83. r2 M-1 — a REPLACED pending play was dropped silently
(the same class) → `clearPendingVoicePlay` answers `stopped` on every replace / clear; completed-but-not-played → `stopped`.
Survivors left (cannot change behaviour): the inline payload bound (unreachable under the text bound), a length-0 packet (refused by the TOC
rule), `n - at < 2` (the no-throw belt), the shell's first-line belt (no screen shows a voice row's text). Recorded, not fixed: #1210.
Final: smoke 5346 · CSH 190 · gates green. Rounds in `docs/review-r1-fixes-session7.md`.
