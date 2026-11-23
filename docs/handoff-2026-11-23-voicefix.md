# Handoff 2026-11-23 voicefix — the Windows "Illegal Instruction" end is shown only under the Visual Studio debugger; no app change

File name: `docs/handoff-2026-11-23-voicefix.md`. Read this FIRST, then DECISIONS #1900–#1906 and
`docs/voicefix-mechanisms.md`. Number block of this session: #1900–#1914 (used: #1900–#1906; #1907–#1914 stay empty)
· lessons L279–L282 (used: L279–L280) · packets P94–P96 (none used: no C# change). The main chat gives the next
block; it writes the next prompt.

## 0 · State
- Branch: `work/voicefix` from `redesign/frontend` @ `462ba3e4` ("Merge pull request #24 from Rexoflex/work/histcs"),
  merged with the newest base `23c9c495` ("Merge pull request #25 from Rexoflex/work/docsb2") before the push · push: by #1546, each
  commit read back through the GitHub API · pull request: Damir opens it with the compare link
  `https://github.com/Rexoflex/Spixi/compare/redesign/frontend...work/voicefix?expand=1` (title and description in
  `claude/session-voicefix-status.md` and Mission Control) · merge = Damir (a merge commit, #1505).
- CI (`redesign-ci`): runs on the pull request that Damir opens; the main chat reads it.
- Smoke: `BASELINE OK — 7000 pass / the 2 KNOWN` on the untouched base `462ba3e4` (cloud twin, Ixian-Core @
  `097341a`, jsdom 29.1.1, `TZ=America/Los_Angeles`; the second run — the first was stopped at a turn end) · CSH
  `pass=866 fail=0` (.NET SDK 10.0.115, runtime 10.0.15). Delta of this batch: **+0** (no pin, no test; no app,
  shell or pin file changed). The merged tree (`work/voicefix` + `23c9c495`): `BASELINE OK — 7000 pass / the 2
  KNOWN` (2026-11-23, the same environment) · CSH `pass=866 fail=0` · `build-shells --check` ✓ · `build-locales --check` ✓.
- Review: CLEAN at r5 (the last permitted round; r4 had one MAJOR of record truth, fixed) · brief
  `docs/review-brief-voicefix.md` § 5.
- ⚠ C# UNCOMPILED: none in the app. The probe `scripts/voicefix/` compiles in the cloud (with the `Concentus.dll` of
  the Windows build output) and ran on Damir's PC.
- Definition of done: no row of `docs/release-readiness.md` changed.
- Still owed: Damir's `Test-Path` check (mechanisms § 4, the paragraph above the table) · the Windows walk `docs/walk-voicefix.md` (Ctrl+F5, 20 opens) · the main chat's answer to Q-1 (the
  walk start, #1904), Q-2 (a belt anyway?, #1901) and Q-3 (the Concentus native-library line, #1905).

## 1 · What this session did
| Item | Result | Evidence | DoD row |
|---|---|---|---|
| 1 · mechanism | the end whose stack was read (step 8) is a call through a stale or invalid queued-callback target in `CoreMessagingXP!DispatcherQueue::DeferInvokeCallback` (consistent with a use-after-free; inferred); the end is shown only under the Visual Studio debugger (with frequent collections 3 / 3 F5 runs, 0 / 3 without — the variable set in one of those three, expected in one, not known in one); not the voice decode, not the processor, not Concentus | `docs/voicefix-mechanisms.md` § 0, § 4, § 4a; #1900 | — |
| 2 · probe + operator steps | `scripts/voicefix/` + 14 operator steps; the decode: 0 ends in 45 child runs (11 switch sets) | § 3, § 4; #1903 | — |
| 3 · fix | lapsed: the premise does not hold; no app change | #1901 | — |
| 4 · other platforms | Android, iPhone, Mac: the same decode, no WinUI dispatcher, nothing to walk | § 6 | — |
| 5 · security record | the peer-voice exposure withdrawn; the inherited Concentus native-library probe → BE | gate doc "Session Voice fix", BE doc "Voice fix addendum"; #1905 | — |
| 6 · tests and pins | lapsed with item 3 | #1901 | — |
| Damir's environment | launch profile with no `DOTNET_` variable; page store back | #1902 | — |

## 2 · Walk
Sheet: `docs/walk-voicefix.md` = the Artifact "Spixi walk — voicefix" (4 rows, Windows; no Android row). Result: owed.

## 3 · Proposed next steps (the main chat decides)
- Q-1 (#1904): Windows walk legs start with Ctrl+F5 unless a row needs the debugger.
- Q-2 (#1901): accept "no app change", or ask for a belt (none is known that would touch the cause).
- Q-3 (#1905): the inherited Concentus native-library load has a trigger widened by our voice messages (a peer's
  voice message at chat open), and on an Android 6 phone (API 23, Spixi's minimum) it may load the SYSTEM's native
  libopus for peer data (not verified: check on an API 23 emulator; a native result makes it a pre-handover fix by the gate's rule); make the one line `OpusCodecFactory.AttemptToUseNativeLibrary = false` ours (a
  hole-closing C# change with its packet and gate row, #1321), or leave it to the BE engineer.
- Optional: a report to Visual Studio (Help › Send Feedback) with the stack of § 4a and `DOTNET_GCgen0size=80000` as
  the way to bring it out in seconds.
- Mission Control: the item `n-20261123-win-engine-exception-after-appearance-change` → "Waiting on someone" with
  Q-1 / Q-2; its title and text still say "voice decode".
