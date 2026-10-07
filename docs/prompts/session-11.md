Read CLAUDE.md, then the newest docs/handoff-*.md (FIRST — `docs/handoff-2026-10-07c.md`), then DECISIONS #1252–#1261 (#1260 = the S10
walk, #1261 = Damir's picks). Next free DECISIONS number: the number in CLAUDE.md (#1262).
This is SESSION 11 (a new chat): the S10 walk fix round + the agreed items + Damir's design set; THEN FREEZE prep.
Already decided (do not re-open): every pick in #1252–#1254, #1258, #1261 · the recorded-not-fixed list of #1257.
Damir adds a SECOND input to this prompt from another session: illustrations, animations and changes (design queue
`claude/design-queue-2026-10-07.md` in the Project + `Claude outputs/spixi-design-pack-2026-10-07.zip`). Merge it into the plan below.

ORDER:
1. Precondition (below). The S10 walk is ALREADY recorded (WALK #1260) — do NOT re-record it.
2. Mechanism first for each S10 fail (#294), verified in the tree (#215); the first reads in #1260 are NOT verified:
   F-FLASH (10-FLASH, V-26): the F1 fix is in (`[P1] hold nbg pre=none post=none vg=00000000` on all 21 opens) and opens still
     flash. Get Damir's 10-FLASH recording (owed) and line it up with `android-s10.txt` by TWO opens. Remaining release actions:
     `setHoldGrounds(false)` writes the STAGE + targetContent MAUI BackgroundColor (Transparent → surface) and flips
     `stage.InputTransparent`; the #1101 0b(b) WrapperView re-parent; a second document render after `messagesDone`.
   RECORDING READ (23:28, `Claude outputs/screen-20261007-231713.mp4`, 44 s): 16 flashes, one per open. The pattern CHANGED from S9:
     list (held, correct) → 4 flat frames of the dark ground (#101010, status bar included) → 1 grey frame with only the date pill →
     the chat. So the hold now ends BEFORE the chat is on glass: the `vsc` (VisualStateCallback) signal fires, the release paints
     the stage ground opaque, and the transparent WebView has not composited yet. Probe: stamp the release vs the first
     non-ground frame; try holding to the shell's own `painted` + one rAF, or keep the grounds transparent until a native
     post-draw callback (OnDraw / a PixelCopy check) sees content.
     Ship a PROBE build first (dev switches that skip ONE release action each + per-frame `[P1]` stamps), not a third guess (L104,
     skill §5e: two wrong guesses → probe).
   KEYBOARD AFTER A REACTION (from 10-HAPTIC; the haptics themselves WORK — Damir 23:30, F4 is closed): after a quick reaction
     the keyboard opens. First read: the message-menu close restores focus to the composer input (src/components/overlay.js focus
     restore) → do not restore focus into an input after a TOUCH menu.
   F-GRID (10-GRID): see 3.
3. INTERVIEW (clickable questions, renders on the BUILT shells, both themes, mobile + desktop; build NOTHING before "go"):
   a. ALBUM pattern rethink (#1261): 3 options (Telegram / WhatsApp / iMessage grammar) — one Reply affordance beside the
      bubble (not on the images), a context menu on EVERY tile (today the 4th tile's "+N" button eats the right-click), the viewer
      toolbar with Reply (today: none on Windows — check why), the download state per tile + Download all.
   b. Photo AUTO-DOWNLOAD setting (#1261): where (Privacy / Storage), values (off · Wi-Fi only · always), size cap.
   c. #1258 photo PREVIEW in the offer: size cap (~8 KB / 96 px), blur until downloaded, grid + single tile; the "Load pictures"
      switch OFF = no preview shown. No version check needed (#1258).
   d. P4 chooser: inline segmented 1 line / 2 lines in the row vs a popover anchored to the row (#1261) — render both. Default
      becomes 1 LINE on all platforms (#1261, decided).
   e. The strip + Edit (Damir's 10-STRIP-ESC note): keep "Edit hidden while photos are in the strip" or show Edit and park the
      strip? An image paste during an edit: keep refused or add a short toast?
   f. Damir's design set (the second input): order, scope, which items ship before the Halloween window (24 Oct, design queue).
4. Build after "go" (contract-first if > 1 area), #46 until CLEAN (L101: fixtures from the real producer; L102: a binding is proven
   only by a compile — ask for a build when reviewers disagree on an uncompiled overload), ONE full smoke.
5. FREEZE PREP (`docs/release-readiness.md` endgame): every V row WALKED or OUT; T1 / T2 blockers with owner (B-31, B-32, CORE-10 …);
   the freeze checklist for Damir (`spixi-finalization-checklists`). No freeze tag without Damir.
6. Open picks (clickable): Android 12+ splash (#1249) · cold-start main-thread stall (2.0–2.5 s) · the desktop window-resize dark band.
7. END: patch + PowerShell commands + the walk sheet (fix rows + every N/A row of #1260: 9-COPY, 9-A11Y, 7B-REC, 9-PROBE, 9-MAC).

## 0 · Rules and precondition
`git --no-optional-locks` on the mounted repo · chat replies in ASD-STE100 (#931) · PowerShell repo commands with every delivery ·
★ COMMIT RULE: NO `Co-Authored-By`, NO `Claude-Session`, NO session link, NO "Generated with" line in any commit message, commit-message file or PR text ·
verify every claim in the tree (#215) · mechanism first (#294) · C# touches no risky parts · bridge protocol frozen (new verbs = 🟡 + BE ask + T1 row) ·
security handover gate · no Ixian-Core change. ★ MAC RE-SYNC: if Damir says he is on the Mac and pulled, give the CLAUDE.md re-sync steps FIRST.
Precondition (stop if it fails): the commits "Session 10: S9 walk fix round, media strip, excerpt lines", "Session 10 build fix: Vibrator
usage argument is an int" and "Record walk #1260 (S10) and the S11 plan" are in `git log` and HEAD = origin/redesign/frontend (find commits by
message, not by hash); smoke BASELINE OK 5604 / the 2 KNOWN (#136 · B3); `node scripts/run-csh.mjs` → CSH pass=299 fail=0. The device shell
kills a > 3 min smoke → the cloud twin (clone + Ixian-Core @097341a + ONE `npm i --no-save jsdom eslint globals tree-sitter tree-sitter-c-sharp`
+ `apt-get update` then `apt-get install dotnet-sdk-10.0`). ONE full smoke at a time (L75), DETACHED, ended with `echo SMOKEDONE rc=$?` (L95);
never edit the tree while it runs; never `pkill -f` a pattern your own command contains (L94). Logs: each walk log under a NEW name (`android-s11.txt`).

## Outcome (O)
For: Spixi users, Damir and the BE engineer. After this session the two open S10 fails (flash, album) and the reaction-keyboard bug have a measured mechanism and a fix, the album pattern
is premium (Damir's pick), photos can auto-download and show a preview before the download, P4 defaults to 1 line with the picked chooser,
Damir's design set is built or scheduled, and the v1 list is ready for the FREEZE. We know it worked when: the S11 walk passes 10-FLASH
(recording + `[P1]` probe lines), the album rows, no keyboard after a reaction · every V row WALKED or OUT · the freeze checklist
lists every remaining blocker with owner.

## Generate, then grade (G) · Export (E)
Skills: `spixi-build-and-walk` · `spixi-finalization-checklists` · `adversarial-review-loop` · `contract-first-parallel-build`.
Export: DECISIONS rows · release-readiness · handoff · status log · CLAUDE.md "Where we are now" · lessons · `docs/commit-message-session11.txt`
(no attribution) · `docs/prompts/session-12.md` · skill proposals.
