Read CLAUDE.md, then the newest docs/handoff-*.md (FIRST — `docs/handoff-2026-10-07b.md`), then DECISIONS #1243–#1253 (and #1205, #1228,
#1229 for A-FLASH and CORE-10). Next free DECISIONS number: the number in CLAUDE.md (#1254).
This is SESSION 10 (a new chat): FIRST the S9 walk record; THEN the fix round for its fails; THEN FREEZE prep per the v1 plan.
Already decided (do not re-open): every pick in #1243–#1248 · the A-FLASH fix shape (#1249) · the recorded-not-fixed list of #1251.

ORDER:
1. Precondition (below). If Damir has NOT applied / committed the S9 patch yet: give him the apply + commit commands first (handoff §0).
2. ✅ DONE in session 9 (after the export): WALK #1252 (25 P · 4 F · 5 N/A) with the mechanism of every F, and Damir's picks #1253.
   Read both rows in full. Verify each mechanism in the tree (#215) before you fix; the S9 twin was /home/claude/w-merge (gone in a new chat).
3. THE FIX LIST (S10 build — interview first for the items marked ASK; everything else is decided):
   F1 9-FLASH-OPEN: the chat's MAUI `_webView.BackgroundColor` writes (SpixiContentPage.cs:~4600 setHoldGrounds, :~329 applyPageSurfaceColor)
      still reach the native SetBackgroundColor through the compat renderer (MAUI 10.0.71 VisualElementRenderer.UpdateBackgroundColor →
      ViewHandler.MapBackground → ViewExtensions.UpdateBackground). Fix: never write the chat WebView's BackgroundColor around the hold; set it
      Transparent once at load; keep the stage/content grounds (#248). Fix the probe to log the NATIVE background before/after. Pass = no grey
      frame, held-open max ≈ unheld (~33 ms). QWERTZ photo pop should go with it; else start the #1221 fade after `hold release`.
   F2 9-GRID-W: "Download all (n)" on the group bubble (shell loop of the existing `ixian:acceptfile:<fileid>` per offer member; the bridge sends
      one at a time; C# handler per-id) · reply/swipe on the bubble quotes the whole group ("📷 n photos"; reply quote carrier: check
      ReplyQuote.cs for a group form; old apps see a quote of the first photo) · one photo from the viewer.
   F3 9-EXCERPT: read side — a fileHeader with empty text = deleted → walk back to the newest live row (ChatHeal.newestLive) in the HomePage
      excerpt; also clearDeletedLast for empty-text fileHeaders + call it from UIHelpers.deleteMessage (remote path); "{n} photos" = the count
      of LIVE members, not SPhotoGroups.countOf.
   F4 9-HAPTIC: probe first — `haptic k= ok= hfe= sdk=` per call (Settings.System haptic_feedback_enabled). hfe=0 → working as designed (Damir
      turns on Touch feedback, re-walk). hfe=1 + ok=false → perform on the WebView itself, click → VIRTUAL_KEY (EFFECT_CLICK); or Vibrator +
      VibrationEffect.createPredefined(EFFECT_CLICK / EFFECT_HEAVY_CLICK) with VIBRATE (normal permission) and touch usage (respects the setting).
   F5 Toasts (all shells): toast.css left:50% + translate(-50%) with no width → only half the screen; 2-line clamp. Fix A (rendered in S9):
      left/right 16px, margin-inline:auto, width:max-content, max-width:min(100% - 32px, 400px), y-only transform, clamp 4 lines; duration
      max(3500, 55 ms × chars).
   F6 Wallet first visit: empty list ~180 ms then all rows (clear → ~50 add → one commit). Options (ASK + render): push the tx list once in the
      background after bootDropped so the first visit has rows · or a 120 ms fade on the first commit after a blank list. Add a probe (tab2
      arrival, txpush, commit time).
   F7 Downloads: the list shows a part file `incoming-<guid>.ixipart` (the A-6 part file lives in the Downloads root) → keep part files out of
      the list (or write them outside the Downloads root); the "From" picker: avatars + better style (ASK + render 2–3 options).
   P1 Paste/attach STRIP above the composer (#1253): paste + picker → thumbnails with ✕ in a strip; composer text = caption; one group bubble
      (ASK: keep the preview sheet for the camera? render the strip on mobile + desktop, both themes, 3 options).
   P2 File cap 50 MB free (#1253): `PhotoRules.maxFileBytes(tier)`; receiver accepts the largest tier; texts "over 50 MB".
   P3 9-GRP-OWNER (#1253 ⚠): members ARE notified at creation (HomePage.xaml.cs:2522-2537) → re-ask the second line ("Members can see the
      group now." / one line / none). 
   Still owed from S9: 9-COPY, 9-A11Y, 7B-REC, 9-PROBE (CORE-10), 9-MAC, 9-BIG-RECV (needs a sender without the cap: S8 build / upstream).
   Not urgent (Damir): desktop window resize shows a dark band while dragging (clip 20261007-1358-15.1307520.mp4) — mechanism first.
4. A-FLASH data: cold start PASSED. The log has 7 `[P1] boot hold ms=1020…1800 why=dropped` (all dropped, none cap) — but 5 of 7 are
   ABOVE the 1500 ms cap → the cap timer did not fire on time (main looper busy during boot?). Check the cap's start point / posting; the
   cover may stay up to ~1.8 s. 8-GROW-A PASSED.
5. CORE-10: only if a long-offline capture came (phone offline > 30 min while others send): the `[P1] push fetch got= new= rep= reid= fix= ran=
   codes=` lines → write CORE-10 with the numbers (draft #1229). Fixes stay Core / BE.
6. OPEN PICKS (clickable questions, renders where visual): Android 12+ splash = keep the plain-colour cover vs keep the real SplashScreenView
   via `SplashScreen.SetOnExitAnimationListener` until bootDropped (#1249) · the old-app caption check result (#1244, L80).
7. Build the fix round (contract-first if > 1 area), #46 until CLEAN, ONE full smoke.
8. FREEZE PREP per the v1 plan (`docs/release-readiness.md` endgame, S6 · Freeze): every V row WALKED or OUT with a row; T1 / T2 rows that
   block the freeze listed with owner; the freeze checklist for Damir (`spixi-finalization-checklists`). No freeze tag without Damir.
9. END: patch + PowerShell commands + walk sheet for the fix rows (re-walk rows only).

## 0 · Rules and precondition
`git --no-optional-locks` on the mounted repo · chat replies in ASD-STE100 (#931) · PowerShell repo commands with every delivery ·
★ COMMIT RULE: NO `Co-Authored-By`, NO `Claude-Session`, NO session link, NO "Generated with" line in any commit message, commit-message file or PR text ·
verify every claim in the tree (#215) · mechanism first (#294) · C# touches no risky parts · bridge protocol frozen (new verbs = 🟡 + BE ask + T1 row) ·
security handover gate · no Ixian-Core change. ★ MAC RE-SYNC: if Damir says he is on the Mac and pulled, give the CLAUDE.md re-sync steps FIRST.
Precondition (stop if it fails): the commit "Session 9: media picker family, audit fixes, copy, S8 fixes" is in `git log` and
HEAD = origin/redesign/frontend (find commits by message, not by hash); smoke BASELINE OK 5567 / the 2 KNOWN (#136 · B3);
`node scripts/run-csh.mjs` → CSH pass=280 fail=0. The device shell kills a > 3 min smoke → the cloud twin (clone + Ixian-Core @097341a + ONE
`npm i --no-save jsdom eslint globals tree-sitter tree-sitter-c-sharp` + `apt-get update` then `apt-get install dotnet-sdk-10.0`). ONE full
smoke at a time (L75), DETACHED, ended with `echo SMOKEDONE rc=$?` (L95); never edit the tree while it runs; never `pkill -f` a pattern your
own command contains (L94).

## Outcome (O)
For: Spixi users, Damir and the BE engineer. After this session the S9 build is walked, every F has a mechanism and a fix, and the v1 list
is ready for the FREEZE. We know it worked when: WALK #1252 recorded (done) · the fix list F1–F7 + P1–P3 built and re-walked · A-FLASH passes on the recording + `[P1]` lines (DoD V-26) ·
8-GROW-A has a measured mechanism (V-25) · V-14 / V-14b / V-14c / V-14d / V-15 / V-16 / V-17 / V-18 / V-27 → WALKED · the fix rows #46 CLEAN ·
the freeze checklist lists every remaining blocker with owner.

## Generate, then grade (G) · Export (E)
Skills: `spixi-build-and-walk` · `spixi-finalization-checklists` · `adversarial-review-loop` (stubs in the REAL namespace, L89; trim whole
sentences, L96; exempt the API, not the file, L97; leaf names + re-root, L98) · `contract-first-parallel-build`.
Export: DECISIONS rows · release-readiness · handoff · status log · CLAUDE.md "Where we are now" · lessons · `docs/commit-message-session10.txt`
(no attribution) · `docs/prompts/session-11.md` (FREEZE) · skill proposals.
