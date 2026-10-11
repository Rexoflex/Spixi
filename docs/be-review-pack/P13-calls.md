# P13 · CALLS · The native call surface, call controls and decline-with-message

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| HIGH | no — nothing signs, moves keys or touches a file; the mic and the lock are in scope | yes | shipped (Speaker flagged: dev builds only) | 8 min |

**Look here first:** `Spixi/Utils/SpixiContentPage.cs:6197` — the only check between an `ixian:appAccept` verb and `VoIPManager.acceptCall` (mic opens); it refuses mini-apps only, so every other page (chat, home, contact details, call) passes it (#272).

**DECISIONS:** #270 · #272 · #587 · #657 · #1074 · #1093 · #1094 · #1118

## What changed and why
- One native `CallPage` (WebView `call.html`) replaces the per-pane call broadcast; it presents the ring, the bar and the full call screen (#270).
- The lock and the call surface are mutually exclusive and the lock wins; no ring sounds while our lock is up (#272, #587).
- Call controls: mute (zeroed PCM, frames keep flowing), speaker (route only), silence (local ring only), decline with a message (#1074).
- `ixian:callback` only starts a call (#657); a "Call ringtone" switch skips the local ring (#1118); `callPainted` / `callCardH` / `setCallCompact` only size and reveal the stage (#1093, #1094).

## Files (verified at 387ca78b)
- `Spixi/Pages/Call/CallPage.xaml.cs:254` — `onNavigatingGlobal` first (appAccept / appReject / hangUp), then `:264` the `ixian:call*` controls, CallPage only (#1074).
- `Spixi/Pages/Call/CallPage.xaml.cs:375` — `callDeclineMsg`: session id 2–128 hex (`parseSession`), base64url text, then `VoIPManager.rejectCallWithMessage` (#1074).
- `Spixi/VoIP/VoIPManager.cs:1036` — refuses unless an unanswered INCOMING ring; trims, 1–500 chars; ONE chat message to the caller, only if the reject ended this call; logs the length only; `:954` `setMuted` and `:1017` `silenceRinging` re-check the session (#1074).
- `Spixi/Pages/Call/CallPage.xaml.cs:763` — `lockUp()` (in-place, modal, root, staging; fails closed); `:811` refuses to present; `:698` pops only its own modal (#272).
- `Spixi/VoIP/VoIPManager.cs:237` — no ring while the app lock is up; `:249` none when the ringtone switch is off; the session and timeout still run (#587, #1118).
- `Spixi/Pages/Chat/SingleChatPage.xaml.cs:534` — `ixian:callback` → `onStartCall` (`:1076`) → `canPlaceCall` (approved 1:1, codec) (#657).
- `Spixi/Platforms/Android/SPlatformUtils.cs:150` — `callSpeakerRoute` true only under `SPIXI_DEV_COEXIST` (same in `Spixi/Platforms/iOS/SPlatformUtils.cs:86`); false on Windows / Mac (#1074).

## Bridge surface
| Verb / push | Args (shape) | Who can send it (which WebView / shell) | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| `ixian:callExpand` · `ixian:callMinimise` | none | `src/shells/call.html` → `Raw/html/call.html`, CallPage; shows the PEER's nick + avatar | `Spixi/Pages/Call/CallPage.xaml.cs:293` · `:298` | ours (#1074) |
| `ixian:callMute:` · `callSpeaker:` · `callSilence:` | `<"0"\|"1">:<sid hex 2–128>` · `<sid hex>` | call.html, CallPage | `Spixi/Pages/Call/CallPage.xaml.cs:335` · `:366` | ours (#1074) — split-matched, a grep for the verb misses it |
| `ixian:callDeclineMsg:` | `<sid hex>:<base64url UTF-8>` | call.html, CallPage | `Spixi/Pages/Call/CallPage.xaml.cs:375` | ours (#1074) — split-matched, a grep for the verb misses it |
| `ixian:callPainted:` · `ixian:callCardH:` (Windows) | `<digits ≤18>` · `<int 120–1600>` | call.html, CallPage | `Spixi/Pages/Call/CallPage.xaml.cs:307` · `:315` | ours (#1093, #1094) — split-matched, a grep for the verb misses it |
| `ixian:appAccept:` · `appReject:` · `hangUp:` | `<address b58>:<sid hex>` · `<sid>` | any page via `onNavigatingGlobal` (chat, home, contact, call); refused for MiniAppPage | `Spixi/Utils/SpixiContentPage.cs:6197` · `:6221` · `:6423` | reshaped: `acceptsCallPushes` gate added; call.html now raises them (#272) |
| `ixian:callback` | none | `chat.html`, SingleChatPage — UNTRUSTED | `Spixi/Pages/Chat/SingleChatPage.xaml.cs:534` | ours (#657) |
| `ixian:callRingtone:` | `<"on" \| other>` | `settings.html`, SettingsPage; also renders peer names (Downloads sheet) | `Spixi/Pages/Settings/SettingsPage.xaml.cs:963` | ours (#1118) |
| push `setCallUi` | `<kind>, <peer nick>, <avatar data URI>, <text>, <started int>, <sid hex>, <address b58>` | C# → call.html | `Spixi/Pages/Call/CallPage.xaml.cs:547` | ours (#270) |
| push `setCallCaps` · `setCallAudio` | `4 × <"0"\|"1">` · `4 × <"0"\|"1">, <int ring gen>` | C# → call.html | `Spixi/Pages/Call/CallPage.xaml.cs:531` · `:541` | ours (#1074) |
| push `callAwaitPaint` · `callBack` · `setCallCompact` | `<token>, <mode>, <maxH>` · none · `<"0"\|"1">` | C# → call.html | `Spixi/Pages/Call/CallPage.xaml.cs:1087` · `:473` · `:1461` | ours (#1074, #1093, #1094) |
| push `callRefused` · `setCallRingtone` | `<"unavailable"\|"busy">` · `<bool>` | C# → chat.html · settings.html | `Spixi/Pages/Chat/SingleChatPage.xaml.cs:1081` · `Spixi/Pages/Settings/SettingsPage.xaml.cs:968` | ours (#657, #1118) |

## Threat → rule → proof
| A hostile <…> could try… | What stops it (`file:line`) | Proof |
|---|---|---|
| mini-app WebView: answer, decline, hang up or mute a call | `acceptsCallPushes` false (`Spixi/Pages/MiniApps/MiniAppPage.xaml.cs:463`, checked at `Spixi/Utils/SpixiContentPage.cs:6197`/`:6221`/`:6423`); `call*` verbs only in CallPage (`Spixi/Pages/Call/CallPage.xaml.cs:264`) (#272, #1074) | smoke "★ #221: the dead getLivePages enumerator is gone, the INBOUND acceptsCallPushes gate is NOT…" · "★★ #1074 C#: the control verbs live ONLY in CallPage…" |
| peer: auto-answer (mic without a tap) | an incoming call never accepts itself; the mic starts in `acceptCall` (a verb) or, for OUR outgoing call, on the peer's accept (`Spixi/VoIP/VoIPManager.cs:678`) — legacy logic (#270) | no pin — legacy, read only |
| compromised call shell: send decline text the user did not choose | unanswered incoming ring only, 1–500 chars, one message to the caller (`Spixi/VoIP/VoIPManager.cs:1038`) (#1074) | smoke "★★ #1074 C#…" (guards); user intent: walk only |
| peer: ring UI over the lock, or a hang-up that pops the lock | `lockUp()` refuses (`Spixi/Pages/Call/CallPage.xaml.cs:811`); own-modal pop only (`:698`); no ring while locked (`Spixi/VoIP/VoIPManager.cs:237`) (#272, #587) | smoke "★ lockUp() sees all three lock shapes…" · "★★ #586: no ring while OUR lock is up…" |
| compromised chat WebView: place a call via `callback` | approved 1:1 only (`Spixi/Pages/Chat/SingleChatPage.xaml.cs:1078`); never hangs up (#657) | smoke "★★★ ROUND 4: `ixian:callback` has ONE LEG…" |

## Given up / left open
- Residual, legacy and narrowed: a compromised chat / home / contact WebView can still send `ixian:appAccept` with an incoming call's row id (= the session id, `Spixi/Network/StreamProcessor.cs:1411`) and answer it, opening the mic (#272).
- The `callback` start leg is the same as legacy `ixian:call`: if the peer answers, our mic opens; no native confirm (#657).
- Decline-with-message: a typed line leaves without the composer in front of it (the sheet names the recipient) — for BE to judge (#1074).
- Speaker is unwalked and flagged off in Release; the lock side of #272 is the P01 `lock` packet's (#272, #1074).

## ⚠ Contradiction
- `docs/security-review-for-be-engineer.md` MAJOR #5 says a locked call "keeps ringing audibly" and asks BE to pick; since #587 nothing rings while the app lock is up (`Spixi/VoIP/VoIPManager.cs:237`).

## Question for BE
Should the call branch of `onAppAccept` (`SpixiContentPage.cs:6197`) also require `this is CallPage` (one added check), closing the chat / home / contact WebView answer path — yes / no?
