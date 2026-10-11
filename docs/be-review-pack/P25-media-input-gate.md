# P25 · MEDIA-GATE · The mic and the clipboard only for the chat on screen (F3 / F4)

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| HIGH (the untrusted chat WebView reaches the mic and the clipboard) | no | yes — 3 existing verbs gated, 1 dev verb | shipped behind flag `SpixiFlags.MediaInputGate` (default ON) | 5 min |

**Look here first:** `Spixi/Pages/Chat/SingleChatPage.xaml.cs:8234` — `mediaInputRefusal()` reads 10 primitives; `Spixi/Utils/S16SecRules.cs:58` combines them (the whole rule runs in csh). null = go on, else a fixed word.

**DECISIONS:** #1136 · #1156 · #1207 · #1208 · #1312 · #1321 · #1322 · #1325 (README flags F3, F4)

## What changed and why
- Before: `ixian:voicerec:start` opened the mic and `ixian:pasteImage` read the clipboard image with no C# check (F3, F4). Damir picked a1: a STATE gate, no input window, no gesture check.
- Refused unless the app is in the foreground, no app lock is up (latched, shown in place or staging), and this chat is on screen. Refusal words: `locked` > `background` > `hidden`.
- `voicerec:start` is gated before `startRecording` and its OS permission ask (`SCP:8276`); `voicerec:send` before `takeForSend` (`SCP:8345`); paste before the clipboard read (`SCP:2897` → `:2903`, no await before it).
- A refusal takes nothing: a running recording keeps running, a kept clip stays kept; C# answers the state as it is (`pushVoiceRecAsItIs`, `SCP:8252`). A paste refusal is silent.
- A running recording stops (kept) when an app lock is presented: the pause lock (`App.xaml.cs:686`) and `presentAppLock` (`:891`).
- Flag OFF = no refusal (the old behaviour). Dev toggle `ixian:devflash:mediagate:<0|1>` (dev mode on, acts at the next start, see P24).

| Primitive | Read from |
|---|---|
| gateOn · foreground · appLock | `SpixiFlags.MediaInputGate` · `App.isInForeground` · `App.isAppLockActive` |
| inPlaceLock · lockStaging | `SpixiContentPage.hasModalOverlay()` · `isLockStaging()` |
| chatOnTop | `isShownChat()` (`SCP:8707`, the 1 Hz tick's rule, unchanged) |
| infoCovers | top overlay is ContactDetails and NOT `HomePage.isInfoPaneBesideNow` (`HomePage.xaml.cs:707`: the col-2 pane AND the right column shown) |
| viaOverlay · hostIsNavTop · modalOpen | an overlay is up · the overlay host is the nav top (a mini-app, Wallet Send or Scan pushed over Home covers) · no nav page or a modal is open |

## Files (verified at the S16 tree)
SCP = `Spixi/Pages/Chat/SingleChatPage.xaml.cs`.
- `Spixi/Utils/S16SecRules.cs:58` — `mediaInputRefusal` (pure; `:54` the three words).
- `SCP:8234` — the 10 primitives; `:8244` infoCovers; `:8264` onVoiceRecStart; `:8352` takeForSend after the gate.
- `Spixi/Pages/Home/HomePage.xaml.cs:707` — `isInfoPaneBesideNow` (a narrowed window < 700 stacks the pane over the chat; `isInfoPaneBeside` `:698` alone stays true).
- `Spixi/Utils/SpixiFlags.cs:21` — the flag; `Spixi/Pages/Dev/DevPage.xaml.cs:71` — the dev toggle.
- Log lines: `Voice: recording refused (<word>)` · `Voice: send refused (<word>)` · `Media: paste refused (<word>)` — fixed words only.

## Bridge surface
| Verb / push | Args (shape) | Who can send it | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| `ixian:voicerec:start` · `ixian:voicerec:send` | none (exact string) | chat.html → SingleChatPage (UNTRUSTED) | `SCP:685` → `:8264` · `SCP:693` → `:8335` | reshaped: gated |
| `ixian:pasteImage` | none (C# reads the clipboard) | chat.html → SingleChatPage | `SCP:560` → `:2893` | reshaped: gated |
| `ixian:devflash:mediagate:` | `<0\|1>` exact | dev.html → DevPage only | `DevPage.xaml.cs:71` | ours |
No new push; a refusal reuses `voiceRec`. MiniAppPage handles none of these.

## Threat → rule → proof
| A hostile chat script could try… | What stops it | Proof |
|---|---|---|
| record or paste while the app is in the background | `background` | csh `S16SecTests.media_input_gate_background_and_covered_refuse` |
| record under an app lock (latched, in place or staging) | `locked`; a running recording stops at the lock | csh `media_input_gate_each_lock_alone_refuses` · pin `scripts/pins-s16/a-sec.mjs` F3 |
| record under chat info (phone, desktop col 1, a narrowed window) | `infoCovers` | csh `media_input_gate_chat_info_covering_refuses` · a-sec F3 (the helper, `isShownChat` and `isInfoPaneBesideNow` pinned whole) |
| record under a pushed mini-app / Wallet Send / Scan, or a modal | `hostIsNavTop` · `modalOpen` | csh `media_input_gate_background_and_covered_refuse` |
| send a clip, or read the clipboard, while covered | the same gate before `takeForSend` / the read | a-sec F3, F4 |
| (flag OFF) | no refusal | csh `media_input_gate_off_is_todays_behaviour` · `media_input_gate_allows_the_chat_on_screen` |

## Given up / left open
- A recording started while the chat was shown keeps running under a LATER cover (not a lock). Send is refused while covered (the accepted a1 dial).
- No gesture check: a script in a chat that is on screen and in the foreground can still start the mic (the OS mic indicator shows).
- `ixian:call` / `ixian:callback` (`SCP:505`, `:534`) and `ixian:appAccept:` (`Spixi/Utils/SpixiContentPage.cs:6435`) open the mic OUTSIDE this gate (P13, flag F7). F3 closes the voice recorder and the paste verb only.
- The col-2 pane's ~160 ms exit counts as covered: a tap then is refused as `hidden` (no clip lost; tap again).

## Question for BE
Is a state gate (foreground + this chat on screen + no lock) enough for the mic and the clipboard, or do you also want a C# gesture check (yes / no)?
