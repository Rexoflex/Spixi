Next session — Session Z: the Y walk verdict, the four dials, then the chat.html dead-takeover removal (if Damir says so)

0 · Before anything else (#215) Read `docs/handoff-2026-09-17b.md`. Check `device_bash` (node 22 / git / npm on the VM — it worked all of X and Y). Use `git --no-optional-locks status` (a plain `git status` leaves an undeletable `.git/index.lock`, #882 ②). Run `node scripts/generate-icons.mjs --check` and `node scripts/build-shells.mjs --check` on the real tree before believing any statement about it. CHECK DECISIONS before accepting any "owed" row from this prompt (#660). ★ The FULL suite runs in the container now (#882 ①, recipe in the handoff) — run it on the tree you inherit BEFORE and AFTER your change; "predicted" is no longer an acceptable last line.

1 · ★★ Ask first
* The last suite line after the Y paste — expected BASELINE OK — 4714 / the 2 KNOWN. Verbatim if anything is red. A `parser missing` red = the three-package install line did not run.
* The Y walk (`docs/f5-checklist-session-y.md` §2): Y.1–Y.12, both themes, phone + the desktop pane.
* Did the commit land (one batch, `docs/commit-message-session-y.txt`)? Was `.git/index.lock` in the way?
* S1 timed? (#872 ②) — #864 and the spare stay as they are until a number exists.
* The four dials of #882: (a) rows-inside-cards hover/pressed (invisible on both themes, every card-hosted family — the new card pair fixes it per family; tokens.css 5c-iii says ask first) · (b) the Account hub's in-card hairlines in dark (-01 = 800 on 800; -03 like contact details?) · (c) `chat.html`'s dead chat-info inline (~30 KB CSS + the #249-retired takeover call; the reason CHAT_KB_CEIL moved twice) · (d) Request from the directory (#880 ⑤ — leave, return the tile on the directory arm, or retire `openRequestForPeer` + the `composeRequest` cap term together = a gate inventory row).

2 · Build — whichever of (a)/(b)/(c) Damir picks, each is small and MEASURED already
(a) = one `:hover`/`:active` rule per family on `--surface-card-hover/-pressed`, rendered both themes, a computed-cascade pin (the #880 lesson: pseudo-elements and outlines only show in a real cascade). (b) = one token in settings-shell.css + a render. (c) = remove the `<link>` and the `createChatInfo` call from `src/shells/chat.html`, re-base `CHAT_KB_CEIL` DOWN with the delta stated, run the reachability + undeclared-identifier gates, render a chat. ★ #221 untouched in all three.

3 · Then
* The latent gate holes of #881 (recorded, not fixed): `shellGlobals` harvested from inside string/template literals; browser-global masking of a deleted local named `name`/`status`/`event`…; the inert seeding clauses (0 module scripts — the #869 docblock describes a structure that does not exist, #772).
* #864 after S1 · the settings swatch `110px 191px` mask (#866) · AND-40 (needs a run that kills) · AND-36/39 (repro first) · the freeze (#825) last · the BE cutover (`be-cutover-brief.md`, `security-review-for-be-engineer.md` first — §1a CLOSED, #874).
* Bottom bleed is DROPPED (#875). Do not reopen it.

Rules #215 · #294 · #663 (F5, never dotnet build on Windows) · #771 · #798 · #828 · #861 (both halves) · #865/#882 ③ (a file is landed when its hash reads back — never when the tool says "written") · ★ #880 ⑪: never `throw` in a render path the shell calls from a `setTimeout` · ★ #881: ask every gate the loud/silent question — a false red is a cost, a false green is the defect the gate exists to catch · ★ the #46 loop runs on Opus (Damir: "so we don't waste Fable tokens") — pin the model explicitly.

Files: `DECISIONS.md` (545 rows, #878–#882) · `docs/handoff-2026-09-17b.md` · `docs/f5-checklist-session-y.md` · `docs/sheets/session-y/` · `docs/security-handover-gate.md` (Session Y section) · `docs/release-readiness.md` (unchanged since 09-17).
