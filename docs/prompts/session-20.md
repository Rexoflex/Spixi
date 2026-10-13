# Session 20 — record the S19 walk, the open items, privacy levels

Paste this as the first message of the next session. Language: chat replies in ASD-STE100 (#931).

## 0 · Precondition (stop if it fails)
- `git --no-optional-locks log --oneline -2` on Damir's clone: the top is "Session 19: the S18 walk fix round" on `92e548f` (Albanian; a desktop-uplift commit may sit on top of it — that is fine); HEAD = origin/redesign/frontend.
- Read `CLAUDE.md` → `docs/handoff-2026-10-13.md` → DECISIONS #1369–#1373. Next free number: #1374 (#1380+ belongs to the desktop-uplift session).
- Cloud twin: clone the repo AND `ixian-platform/Ixian-Core` at `097341a` next to it (smoke reads `../Ixian-Core`); `apt-get install -y dotnet-sdk-8.0` for CSH. Baseline: smoke as in the handoff · CSH 441.

## 1 · Outcome
Damir walks S19 on Android + Windows with `docs/walk-s19.md` (Artifact "Spixi Session 19 Walk"); every fail gets a mechanism first, then a fix; the open questions of handoff §3 get answers; the privacy-levels card is designed (render first) and, after his "go", built.

## 2 · Steps
1. Record the S19 walk → `WALK #n (S19 build, W / A): n P · n F · n N/A`; mechanism first for each F (the Android log: grep `[MO]`, `[FLAGS]`; never stage the whole log).
2. Ask Damir (clickable, ≤ 4): the incoming bubble colour picker (render first) · the phone About / Contributors title contrast over the art · the duplicate "Set group photo" tab stop · anything from the walk.
3. Privacy levels (Damir 23:33): interview → option 1 (Relaxed · Balanced · Private presets over the existing switches, "Custom" computed by the shell, a "This changes" list, one undo) → render both themes → go → build + pins.
4. The fix round; smoke + CSH; the #46 loop; the security-only #46 at HIGH for any bridge change.

## 3 · Rules (unchanged)
Cloud clone only; never commit / push from the cloud; no attribution lines (★ COMMIT RULE); no Ixian-Core change; C# touches no risky parts; #1312 for our bridge changes (flag, packet, gate row, security-only #46 at HIGH); PowerShell blocks with every delivery; `git --no-optional-locks` on the mounted repo; ONE full smoke at a time (2 cores).
