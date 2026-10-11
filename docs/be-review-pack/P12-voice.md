# P12 · VOICE · Voice messages: record, send inline or as a file, play

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| HIGH (the mic is reachable from the untrusted chat WebView) | no | yes | shipped | 5 min |

**Look here first:** `Spixi/Pages/Chat/SingleChatPage.xaml.cs:685` — `ixian:voicerec:start` from the chat WebView opens the microphone; C# sees no tap (`Spixi/VoIP/VoiceClips.cs:155` has no gesture check), so a compromised chat WebView can record ≤ 30 s and `voicerec:send` it to the open chat.

**DECISIONS:** #1136 · #1138 · #1207 · #1208 · #1209 · #1210 · #1224 · #1239 · #1243 · #1247 · #1312

## What changed and why
- Tap to record (≤ 30 s, held in memory only); C# picks the route: INLINE as a plain `chat` message (a fixed first line + `spixi.voice.1:` + base64 Opus, ≤ 64 000 chars) to an approved 1:1 whose answer holds `spixi.voice.1`, else an Ogg FILE C# names in `<spixiUserFolder>/Voice` sent as a normal file (#1208, #1209).
- The capability ask: one Core `getAppProtocols` per approved 1:1 per app run at chat open (#1207).
- Receive: C# parses and decodes each voice row once (Concentus, managed C#), pushes 40 peak bars, plays natively; no audio byte, path or name enters the WebView (#1208, #1209). A live mic level 0–100 while recording (#1239). The played flag is local (#1243, #1247).
- A start-up sweep deletes only broken own `.ogg` files ≥ 24 h old (#1224).

## Files (verified at 387ca78b)
- `Spixi/VoIP/VoiceClips.cs:155` — startRecording: refused during a call (`:162`), OS permission (`:178`), its own recorder; 30 s cap (`:76`).
- `Spixi/Pages/Chat/SingleChatPage.xaml.cs:8048` — voiceCapFor: approved 1:1, or an approved group with known members; never a bot room (checked at `:8221` and `:8294`).
- `Spixi/Utils/VoiceCodec.cs:186` tryParseInline · `:460` tryDemuxOgg — bounded peer parse (limits `:35`–`:37`), never throws.
- `Spixi/Pages/Chat/SingleChatPage.xaml.cs:8783` — a voice file is read at most `MaxOggBytes + 1` bytes; `:8206` a voice row's declared size ≤ 262 144 B.
- `Spixi/Pages/Chat/SingleChatPage.xaml.cs:8395` — the sent `.ogg`: `FileMode.CreateNew`, C#'s own name and folder.
- `Spixi/Pages/Chat/SingleChatPage.xaml.cs:8561` — a play tap on a received voice file starts the normal accept (`onAcceptFile`).
- `Spixi/App.xaml.cs:1375` — background stops a recording (Android / iOS only); `Spixi/VoIP/VoiceFolderSweep.cs:19` the sweep.

## Bridge surface
SCP = `Spixi/Pages/Chat/SingleChatPage.xaml.cs`; chat = `src/shells/chat.html` → `Spixi/Resources/Raw/html/chat.html`, RENDERS UNTRUSTED content. No voice verb is handled by `MiniAppPage`.

| Verb / push | Args (shape) | Who can send it | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| `ixian:voicerec:start` | none (exact string) | chat → SingleChatPage | SCP:685 → :8217 | ours |
| `ixian:voicerec:cancel` | none (exact string) | chat → SingleChatPage | SCP:689 → :8263 | ours |
| `ixian:voicerec:send` | none (exact string) | chat → SingleChatPage | SCP:693 → :8279 | ours |
| `ixian:voiceplay:` | `<32 hex row id>` | chat → SingleChatPage | SCP:697 → :8491 | ours |
| `voiceRec` | `<idle\|recording\|stopped\|denied\|busy\|error\|sendfail>`, `<ms>` | C# → chat | SCP:8073 | ours |
| `voiceRecLevel` | `<int 0–100>` | C# → chat | SCP:7816 | ours |
| `voiceState` | `<hex id>`, `<loading\|playing\|paused\|stopped\|error>`, `<posMs>`, `<durMs>` | C# → chat | SCP:8091 | ours |
| `voiceInfo` | `<hex id>`, `<durMs>`, `<csv of 40 ints 0–100>` | C# → chat | SCP:8992 | ours |
| addMe / addThem arg 17 · updateMessage arg 12 · addFile arg 17 · setCaps `voice` | `<durMs>` / `"1"` / cap word | C# → chat | P15 `chatmsg` | reshaped |

## Threat → rule → proof
| A hostile … could try | What stops it | Proof |
|---|---|---|
| compromised chat WebView sends `voicerec:start` then `voicerec:send` with no tap | only voiceCapFor (SCP:8221), 30 s cap, a call refuses, background stops on phones; the OS mic indicator | no proof — no gesture check exists |
| contact sends a crafted inline clip or Ogg for the decoder | `VoiceCodec.cs:186` / `:460` (≤ 64 000 chars, ≤ 1 550 packets, one 20 ms frame each, ≤ 31 s; Ogg ≤ 262 144 B, CRC, one stream); Concentus is managed code | csh `VoiceCodecTests.bound_text_longer_than_64000_is_refused` · `inline_refuses_a_packet_that_is_not_one_20ms_frame` · `ogg_demux_refusals` |
| compromised chat WebView names a file or another row to play | id lookup in C#'s own list of the open channel (SCP:8503), C#'s own hex after (`:8510`); a file only via `isVoiceFileRow` + `localPathOf` | pin `scripts/pins-s7/cs.mjs` "r1 play gates C#: ixian:voiceplay plays nothing outside rendersAsVoice…" |
| files left on disk | clips in memory only; the sweep deletes own broken files ≥ 24 h | csh `S7bRulesTests.sweep_deletes_only_a_broken_own_file_older_than_a_day` |

## Given up / left open
- No C# gesture check before the mic (same class as the native copy in P15: C# trusts that the WebView saw a tap); on Windows / Mac a recording keeps running while the window is deactivated (#1208, `App.xaml.cs:1371`).
- Good sent `.ogg` files are never deleted; a real cleanup needs a message-reference index (v1.1, #1224).
- Inline voice puts ≈ 54 000 chars into the offline push; the push server's limit is unknown to us (#1208).
- Inherited: `handleAppProtocols` stores an unbounded peer list that Core saves with byte-sized counts (#1210 (10)).

**⚠ Contradiction:** (1) `docs/security-handover-gate.md:1753` says the microphone is "recorded only after a tap" — C# has no tap check; any `ixian:voicerec:start` opens it. (2) `docs/be-cutover-brief.md:703` still calls voice "v1.1, not v1.0" with a Core message type (VN-1) — it is built for v1 as a plain `chat` message, no Core change (#1208, #1209). (3) The security review says `Voice/` is "never cleaned yet" — a sweep of broken files exists (#1224).

## Question for BE
Is a plain `chat` message of up to 64 000 chars (≈ 54 000 chars of base64 for 30 s of voice) safe on the push server and the offline queue (yes / no)?
