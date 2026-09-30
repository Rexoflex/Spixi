# Call surface premium — plan (NEW session; not built)

Scope from Damir (2026-09-30), after the huddle reference image. **1:1 calls only.** Groups/huddles are not in Spixi.

## 0 · Ground rules (carried)

| Rule | Source |
|---|---|
| The `CallPage` mechanism stays: ONE C#-presented cover, ring = full-window, in-call = the top strip | #270 |
| The lock ALWAYS wins: lock and call surface are mutually exclusive; a call while locked rings audibly, no UI | #272 |
| No dead buttons: a control renders only when its verb is wired on THIS platform | #256 / #264 |
| A new verb = a security-gate row + a BE-review note before it ships | CLAUDE.md gate |
| The call shell is its own WebView; no bridge to chat | #221 |

## 0b · Item 0 (small, before the call work): the Windows window opens at the minimum size (#1073)

Damir reproduces first (minimize → taskbar "Close window" → relaunch). Fix in `Platforms/Windows/App.xaml.cs`: persist the
size only when `OverlappedPresenter.State == Restored`; persist Maximized as its own flag and restore it. No shell change.

## 1 · In-call strip restyle (1:1)

Reference = the huddle panel: dark card, name + timer + state line, round icon buttons, red hang-up pill, "Encrypted voice, peer-to-peer" note.
**Reference image: `docs/sheets/call/huddle-reference.png`** (Damir, 2026-09-30) — READ IT FIRST. It is a GROUP huddle; take the
card grammar only (header, round controls, hang-up pill, note row), not the tile grid or Invite.

| Item | FE | C# | Notes |
|---|---|---|---|
| Visual restyle (card, timer, state line, hang-up pill) | `callbar.css` / `call.html` | none | Render light + dark, desktop pill + mobile strip, before pins |
| Encryption note | string + one row | none | Wording claims only what is true: E2E, peer-to-peer, no recording. "PQ hybrid" only if Ixian-Core confirms the call key exchange — verify at source first |
| **Mute mic** | button + `aria-pressed` | **NEW**: `VoIPManager.setMuted(bool)` → `IAudioRecorder` stop/skip send (per platform `SAudioRecorder`) + verb `ixian:callMute:<0\|1>` | Build per platform or hide per platform. Echo the state back (`setCallUi` field) — the button shows C#'s state, not its own guess |
| **Speaker / earpiece** | button | **NEW**: route switch — Android `AudioManager.SpeakerphoneOn`, iOS `AVAudioSession.OverrideOutputAudioPort`; Windows/Mac = no concept → button hidden | Only `setVolume` exists today (`VoIPManager.cs:788`) |
| Minimise (desktop) | reuse the strip | none | The strip is already the minimised form |

Per-platform matrix (fill in during the session, device-verified):

| Control | Android | iOS | Mac | Windows |
|---|---|---|---|---|
| Mute | build | build | build | build |
| Speaker | build | build | hide | hide |

## 2 · Incoming call screen, premium

| Item | FE | C# | Notes |
|---|---|---|---|
| Accept · Decline | exists (`ixian:appAccept` / `ixian:appReject`) | none | Restyle only |
| **Silence ring** (local) | button | **NEW** small: stop the ring sound only; call keeps ringing for the caller | Verb `ixian:callSilence:<sid>`; per platform sound player |
| **Decline with message** | button → short sheet (3 presets + custom) | **NEW verb**: reject + send a normal chat message to the caller | Gate row: the text is user-typed, goes over the existing message send path — no new sink. Presets localized |
| Caller identity | exists (nick + X1 avatar pushed by C#) | none | Larger avatar, blurred avatar backdrop |

## 3 · Order

1. Verify at source: mic mute path in each `SAudioRecorder`; audio route APIs; Core call key exchange (for the note wording).
2. Render the strip + incoming screen, both themes, Damir picks.
3. Build FE with every new control behind a per-platform cap pushed by C# (`setCallCaps`).
4. Build C# per platform; each platform compiles and is device-walked before its cap turns on.
5. #46 loop (Opus) incl. the lock-exclusion regression set (#272 rows).
6. Walk: ring/accept/decline/decline-with-message/silence/mute/speaker/hang-up, locked device, both directions, each platform.

## 4 · Session prompt (paste into a new session)

CALL SURFACE PREMIUM (1:1). Read this file FIRST (and look at `docs/sheets/call/huddle-reference.png`), then `docs/handoff-2026-09-29b.md` §10 and DECISIONS #270, #272,
#1071, #1072. Check #1071/#1072 are committed and the smoke is BASELINE OK / the 2 KNOWN (with the Ixian-Core
sibling); use `git --no-optional-locks` on the mounted repo. Then §1 verify-at-source → §2 renders (Damir picks) →
§3 build behind per-platform caps → Opus #46 loop incl. the #272 lock set → FULL pipeline (bundle BEFORE shells) →
smoke → land → walk sheet (Artifact). Commit + push = Damir. Chat replies in ASD-STE100 (#931).
