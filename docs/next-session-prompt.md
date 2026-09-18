Next session — Session Z: the AND-45 walk verdict, then Damir's list from the Y walk (#884), in order

0 · Before anything else (#215) Read `docs/handoff-2026-09-18.md`. Check `device_bash` (node 22 / git / npm on the VM). Use `git --no-optional-locks status` (a plain `git status` leaves an undeletable `.git/index.lock`, #882 ②). Run `node scripts/generate-icons.mjs --check` and `node scripts/build-shells.mjs --check` on the real tree before believing any statement about it. CHECK DECISIONS before accepting any "owed" row from this prompt (#660). ★ The FULL suite runs in the container (#882 ①, recipe in the handoff §4) — run it on the tree you inherit BEFORE and AFTER your change; "predicted" is not an acceptable last line. ★ Reviews run on Opus (Damir: "so we don't waste Fable tokens") — pin the model explicitly.

1 · ★★ Ask first
* Did AND-45 commit (one batch, `docs/commit-message-and-45.txt`)? The last suite line — expected BASELINE OK — 4727 / the 2 KNOWN.
* The AND-45 walk (`docs/walk-artifact-and-45.html`, 19 rows, both nav modes, both themes): A.1–A.6 are the keyboard rows — a FAIL there is the batch (the handoff §2 says what each failure means). A.18 is a dial: pad the last scroller by the inset?
* S1 timed? (#872 ②) — #864 and the spare stay as they are until a number exists.
* The four dials of #882 (rows-in-cards hover/pressed · the hub's dark hairlines · chat.html's dead #249 takeover · Request from the directory).
* For #884 ①: 24 or 32 for the sheets? trim the chooser copy, or actions-first? For ②: ink primitives at 500/600, or the card on an ink step? For ③: which "tokenise" rows now?

2 · Build — #884, in this order, each rendered BOTH themes through the wire before pins, the suite's existing gates run on every change
④ the label: drop `text-transform: uppercase` + the tracking from `.c-chat-info__label` (sentence case); verify `window.SL.sharedGroupsTitle` on the device before blaming the dictionary; translator drafts for cn/id/it/ja/lt.
⑤ the on-card hairline: one role pair `--outline-on-card` (light neutral-200 / dark neutral-600, ratios computed in the suite as #879 did) for chat-info's four lists AND the Account hub (#882 (b) is the same dial).
⑥ the pencil: a symmetric ghost spacer in `.c-chat-info__name-row` and `.c-settings__name-row` so the NAME is centred, not the pair.
① the sheets: `overlay.css:39` + `:68` (+ `:287` anchored) 16 → Damir's number; then the Add-contact chooser copy/order, two renders.
② the dark chooser hue: the token pair Damir picks (tokens.css 5c-iii — ask first).
③ the colour sweep: the rows Damir ticks, plus the `/* sanctioned */` rule and a walk pin over stripped CSS that fails on an unsanctioned literal (property, not list, #798).
⑦ `extract-strings --check` + `i18n-lint` green; drafts in `src/strings/draft/*.todo.json`.
★ #221 untouched in all of it. CHAT_KB_CEIL moves only with its delta stated.

3 · Then
* The #46 loop on the batch (Opus). Records (#885+), the handoff, the checklist + walk artifact, the commit message.
* #864 after S1 · AND-40 (needs a run that kills) · AND-36/39 (repro first) · the #881 latent gate holes (recorded) · the freeze (#825) last · the BE cutover (`be-cutover-brief.md`, `security-review-for-be-engineer.md` first — §1a CLOSED, #874) · then pre-release per `docs/release-readiness.md`.

Rules #215 · #294 · #663 (F5, never dotnet build on Windows) · #771 · #798 · #828 · #861 (both halves) · #865/#882 ③ (a file is landed when its hash reads back) · #880 ⑪ (never `throw` in a render path) · #881 (ask every gate the loud/silent question) · ★ #883: a one-sided walk is a false green — pin the POSITIVE property; a pushed value that must land between two layout frames is a jump — make it constant; check a label is free before you use it.

Files: `DECISIONS.md` (547 rows, #883–#884) · `docs/handoff-2026-09-18.md` · `docs/android-findings.md` (AND-45) · `docs/f5-checklist-and-45.md` · `docs/walk-artifact-and-45.html` · `docs/security-handover-gate.md` (AND-45 section) · `docs/release-readiness.md` (unchanged since 09-17).
