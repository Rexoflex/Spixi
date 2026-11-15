# Handoff 2026-11-15 (Speed lean) — the lean-build gates and the CSS comment strip behind a build property that is OFF by default; the JS strip is PARKED

File name: `docs/handoff-2026-11-15-perflean.md`. Read this FIRST, then DECISIONS #1580–#1589. Number block of this
session: #1580–#1594 (used: #1580–#1589; #1590–#1594 stay empty) · lessons L192–L197 (all used) · review packets
P44–P47 (used: P44, P45; P46, P47 stay empty). The main chat gives the next block; it writes the next prompt.

## 0 · State
- **Result: PARTLY.** Items 1, 2, 3 are delivered. **Item 4 (P-07, the JS strip) is STOPPED: parked by Damir's
  ruling in the session (2026-11-15) after review round 4** — the build refuses `SpixiLeanJs`; the code stays as a
  tool with an open MAJOR finding (#1583; § 4 has the question).
- Branch: `work/perflean` (three commits: "Session Speed lean: the lean-build gates (P-09)" · "Session Speed lean: the CSS comment strip behind SpixiLeanCss (P-06); the JS strip is parked" · "Session Speed lean: the export docs") · base: `redesign/frontend` @ "Merge pull request #5 from
  Rexoflex/work/walksteps2" (`a54808c`) · delivery by #1546: the session pushes the branch; Damir opens the pull
  request with the compare link (status doc `claude/session-perflean-status.md`: the link, the title, the description,
  and the API read-back of each commit) · merge = Damir (a merge commit, #1505), after the main chat has read
  `redesign-ci`.
- CI (`redesign-ci`): not run at the time of this commit — Damir's pull request starts the first run (budget: 3 runs).
- Smoke: `BASELINE OK — 6400 pass / the 2 KNOWN` · environment: cloud twin + Ixian-Core @097341a · jsdom 29.1.1, eslint 10.14.0, globals 17.14.0,
  tree-sitter 0.25.1, tree-sitter-c-sharp 0.23.5 · delta **+102** = the pins of `scripts/pins-perflean/` (a-gates 30 ·
  b-css 26 · c-js 17 · d-package 29) · CSH 506 (.NET SDK 10.0.115).
- Checks: `build-shells --check` ✓ (with the P-09 gates in its success line) · `build-locales --check` ✓ ·
  `strip-release --check` (GATE 1) for no flag, css, js, css + js ✓ · GATE 2 on the lean CSS package (the one package
  that a build can make): `smoke-packaged: GATE 2 OK (lean css) — 6395 pass · 5 red by design (listed) · the 2 KNOWN` · the pixel gate, three packages ✓ (50 shots × 0 px each) · the parser cross-check ✓
  · the MSBuild harness `--real` ✓ (97 scenarios). Not run, and why: `extract-strings --check`, `generate-icons --check`, `build-legal-docs --check`,
  i18n-lint, pseudo, verify-locales — no string, icon, legal or locale file changed; the full smoke holds their rows.
- Review: **#46 with the security-only pass: CLEAN at round 5 for the delivered scope (P-09, P-06, the MSBuild switches, GATE 2 on a lean CSS package); MAJOR per round 3 → 5 → 5 → 2 → 0; MINOR r5B-1 and r5B-2 recorded, not fixed (no round was left); P-07 is outside the verdict (parked, an open MAJOR r4A-1)** · brief `docs/review-brief-perflean.md` (every finding of every round in § 5.2; the verdict
  and the file hashes at its end) · models: lead Claude Fable 5.2 · builders Opus (the gates, the pixel gate, both
  strips with the HTML walk, the MSBuild targets, the fix rounds of the strips and the gates) and Sonnet (the four pin
  files, their fix rounds, the Android-only guard, the app-id test, the park) · Haiku (three read-only sweeps before the build: the licence
  notices, the places that read comment text at run time, the carrier census) · reviewers: rounds 1 and 2 five fresh
  read-only Claude Fable 5.2 instances each; **rounds 3 to 5 by Damir's ruling in the session (2026-11-15, after his
  question about the cost): Fable 5.2 for the JS scanner, Opus for the other scopes** — it replaces "every reviewer on
  Fable 5.2" (#1533) for those rounds; round 5 had no JS scope (parked) and so one Opus reader. The main chat records
  both rulings (the reader models; the park).
- ⚠ C# UNCOMPILED: none (no C# file touched). ⚠ **The three new MSBuild targets have not run in a real MAUI build**
  (§ 5).
- New files: `scripts/lib/lean-gates.mjs`, `scripts/lib/lean-strip.mjs`, `scripts/pixel-gate.mjs`,
  `scripts/pins-perflean/**` (4 pins, the corpus, the cross-check, the expected-reds list, the MSBuild harness),
  `docs/be-review-pack/P44-lean-css.md`, `P45-lean-js.md`, `docs/contract-perflean.md`, `docs/review-brief-perflean.md`,
  `docs/walk-perflean.md`, this handoff, `docs/commit-message-perflean.txt`. Changed: `scripts/build-shells.mjs`,
  `scripts/lib/inline.mjs`, `scripts/strip-release.mjs`, `scripts/smoke-packaged.mjs`, `scripts/smoke-test.mjs` (one
  registration line), `Spixi/Spixi.csproj` (two inserted blocks), and the export docs. **Not changed:** `src/**`, the
  committed built html, every C# file, `scripts/device/**`, `.github/**`.
- Definition of done: no row of `docs/release-readiness.md` changes (the file has no row for P-06 / P-07 / P-09; the
  speed plan is tracked in Mission Control).
- Still owed: the device sitting (the walk sheet) · the first real lean Release build (Damir's PC) · the rulings of § 4.

## 1 · What this session did
| Item | Result | Evidence | DoD row |
|---|---|---|---|
| 1 · why the first shell boot takes 787 ms (read-only) | A note: 792 ms (median of 15 cold starts) is the `load` event of the FIRST document of the process; about 700 ms of it are first-document costs (the renderer comes up; the shared files are parsed and compiled for the first time); the seed's 50 chats are pushed after it; the logs cannot split it further | #1580 · the note in `claude/session-perflean-status.md` | — |
| 2 · P-09 the lean-build gates | The carrier gate and the line invariant, always on in `build-shells` and `strip-release`; the pixel gate as a lead-machine tool | #1581 · `scripts/lib/lean-gates.mjs` · pins `a-gates` 30 rows | — |
| 3 · P-06 lean CSS (`SpixiLeanCss`, OFF) | Comments out of the 3 linked sheets and every inline `<style>`; 32 comments kept by rule; html 4.45 → 3.06 MB | #1582 · P44 · pins `b-css` 26 rows · the pixel gate 50 × 0 px | — |
| 4 · P-07 lean JS (`SpixiLeanJs`) | **STOPPED — PARKED.** Built (comments out of the 3 external scripts, every line on its line, and the inline scripts; bundle −39.2 %), but the review found a silent mis-strip on a contrived input in each of four rounds and the last is not fixed. The build refuses the property; the code stays as a tool | #1583 · P45 (the record) · pins `c-js` 17 rows (they pin the parked code as it is) · brief § 5.2 round 4 | — |
| The MSBuild switches | Three properties (two refused: `SpixiLeanJs` parked, `SpixiLeanCssFull` not built), two guard targets, a swap target, a stamp; off = today's package; `SpixiLeanCss` only in an Android dev build with the dev app id until the ruling | #1584 · the harness (97 real MSBuild scenarios) · pins `d-package` rows 1–11 | — |
| GATE 2 on a lean package | `smoke-packaged --lean-css` → `smoke-packaged: GATE 2 OK (lean css) — 6395 pass · 5 red by design (listed) · the 2 KNOWN` (a run with both flags passed on the first build, 2026-11-15 early: 6352 pass · 7 red by design · the 2 KNOWN) | #1585 · `lean-expected-reds.json` (9 entries) · pins `d-package` rows 12–29 | — |

**Harness numbers, lean off against on** (cloud machine, Chromium, CPU × 4, 5 interleaved rounds, two sets; median ms;
#1588; taken on the packages of the first build — the final packages hold 18 KB more kept comments):

| Shell · mark | off | css | js | both |
|---|---|---|---|---|
| home · ready | 464 / 476 | 408 / 431 | 396 / 431 | **415 / 402** |
| home · first paint | 196 / 236 | 172 / 156 | 192 / 184 | 160 / 168 |
| home · main-thread busy | 733 / 743 | 622 / 672 | 631 / 667 | 660 / 692 |
| chat · ready | 486 / 491 | 463 / 469 | 434 / 426 | **402 / 410** |
| chat · first paint | 216 / 232 | 200 / 220 | 220 / 216 | 196 / 196 |
| chat · main-thread busy | 755 / 785 | 705 / 752 | 702 / 694 | 675 / 693 |
| html folder, bytes (final code) | 8,310,055 | 6,895,661 | 6,607,297 | **5,192,903** |

A harness number shows a direction, not a phone value (L182). The walk decides — for `SpixiLeanCss` (the column "css"). The columns "js" and "both" say what the parked P-07 is worth.

## 2 · Walk
Sheet: `docs/walk-perflean.md` = the Artifact "Spixi Speed Lean Walk" (Android: 7 build rows, 3 script rows, 8 look
rows). Result: owed (one device sitting, #1514). The walk compares an OFF and an ON Release build on one day,
OFF → ON → OFF. Windows, iPhone and Mac: nothing to walk — with the switches off they build as today, and the build
refuses a lean switch there until the ruling of the defaults.

## 3 · Proposed next steps (the main chat decides)
Outcome: Damir knows from phone numbers whether `SpixiLeanCss` stays (and whether its default changes) or is removed, and the main chat has ruled what happens with P-07.
1. The main chat reads `redesign-ci` on the pull request; Damir merges (a merge commit).
2. The device sitting of the walk sheet. Its first build is also the first real run of the three MSBuild targets.
3. The keep-or-remove ruling for `SpixiLeanCss` (#1513 (3)); a default that changes is its own small batch (the csproj
   default, the three conditions of the Android-dev-build rule in `SpixiLeanGuard`, the Session N row of § 4 (b), the
   first lean build and walk on every platform).

## 4 · Open questions and dials
| For | Question (with its options) | Blocks |
|---|---|---|
| Main chat | Record Damir's two rulings of 2026-11-15 in the session: (1) review rounds 3 to 5 of this batch with Fable 5.2 only for the JS scanner and Opus for the other scopes; (2) "Park the JS strip" | nothing (done; ledger rows) |
| **Damir + main chat** | **P-07 after the park — which design?** (a) a real parser in the packaging path (`acorn`, one MIT file; needs a ruling against "no new npm package in the packaging path", #1537): the comment list comes from the parser, no slash decision is left · (b) a build-time proof on the real files (the strip runs with every uncertain `/` read both ways and stops the build when the scanner state after the line differs) · (c) drop P-07; take the script gain with P-08 (a real minifier) · (d) leave it parked until the CSS numbers | P-07; about half of the lean gain in the harness |
| Main chat | (a) The parser cross-check as a permanent pin in `redesign-ci` (no new package: `acorn` comes with the pinned `eslint`) — yes / no; it matters when P-07 comes back | P-07 |
| Main chat | (b) Re-base the 8 rows that are red by design on a lean package (they read comments or ask for byte identity), and repair the PLAIN `smoke-packaged` (red on 4 rows in any copy, #1585) — a docs-and-pins batch / leave | a clean GATE 2 without a list |
| Main chat | (c) A parse line for the home shell (`[CDPERF] home-shell parse …`, #1580) in the batch that owns `src/shells/home.html` — yes / no | splitting the 792 ms on the phone |
| Main chat | (d) `docs/legal/third-party-notices.md` against what ships (#1587) | the store review, not this batch |
| Main chat | (e) The MSBuild harness (`--fake`, about 20 s) in `redesign-ci` — yes / no | nothing |
| Main chat / Damir | (f) After the device numbers: the default per property, and the end of the Android-dev-build rule (#1584, #1586 (g)) | lean packages for iPhone, Mac, Windows and for a store build |

## 5 · Recorded, not changed
- **The MSBuild targets are unproven in a real MAUI build** (no MAUI workload in the cloud): the Windows command line
  of the `node` call, `LogicalName` with `\`, the real `MauiAsset` collection of the Android build, `RemoveDir` on a
  locked file, a multi-target outer build, design-time builds of Visual Studio, `dotnet publish`. Each mismatch is an
  `<Error>`; the copy rule of a real consumer is the one thing that only GATE 1 on the deployed folder shows (#1584).
- **The parked JS strip stays in the tree with a KNOWN open fault** (r4A-1, #1583; also r4A-2, r4A-3, r4A-4): the
  JS region of `scripts/lib/lean-strip.mjs`, `--lean-js` in `strip-release.mjs` and `smoke-packaged.mjs`, the
  cross-check, the pin `c-js` and the js corpus. No build can reach it (the guard refuses `SpixiLeanJs`; removing
  that one `<Error>` re-opens the path — only after a CLEAN review of a new design). A package made by hand with
  `--out … --lean-js` is outside every rule; GATE 1 without that flag fails on it. The claims about the slash net in
  the code comments and in P45 are false as a general proof; P45 says so.
- **The stamp protects one `obj` folder** (#1584): delete `obj` AND `bin` when a switch changes.
- **The pixel gate's limits:** Chromium on Linux, the phone layout only, the fonts and emoji of the cloud machine, 50
  states; the CSS-rule dump covers what no shot shows but holds only what Chromium's parser keeps. Not in CI.
- **GATE 2 was run with both flags only.** The css-only and js-only expected sets are derived by mechanism and checked
  with direct tests of each row's pattern on the three packages (#1585).
- **The plain `smoke-packaged` is red on four rows in any copy** (no `.git`, no Ixian-Core sibling) — not from this
  batch; the plain path was not changed (#1585).
- `SpixiLeanCssFull` and "emit ASCII" are not built (#1586).
- The strips refuse some valid input on purpose (the lists: brief § 4 dial 4, P45 "Recorded"). Today's files hit none.
  A future hit stops the lean Release build with the file and the line; the build without the switch is not affected.
- Licence findings outside the strip's scope (#1587).
- The recorded MINOR findings and limits of the review: brief § 4, dials 12–27, and § 5.2 round 5 (r5B-1: a targets
  file in the repo that sets `SpixiLeanJs` after the guard has passed reaches the js branch of the lean target —
  one belt `<Error>` in `SpixiLeanReleaseHtml` closes it; r5B-2: `--out` protects `Raw/html` but not the rest of
  `Resources\Raw`; not proven: a late import that sets both the dev switch and the app id).

## 6 · Lessons (also appended to docs/lessons.md)
L192 a by-hand gate needs what the suite reads outside the copy · L193 a row on comment prose in a built file pins
documentation · L194 compare what script can read, not only pixels · L195 a hand-written scanner cannot be reviewed
to "correct": use a parser or prove the real files · L196 a guard is only as wide as the property it tests ·
L197 a gate that passes by a list.

## 7 · Repo commands for Damir (PowerShell, one line at a time, no `&&`)
How to check out and build the branch:
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git status -sb
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch work/perflean
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git pull --ff-only
```
- The two build lines (OFF and ON) and the GATE 1 lines are in the walk sheet § 1. Wipe `Spixi\obj` + `Spixi\bin`
  before each build (#449).
- Open the pull request with `https://github.com/Rexoflex/Spixi/compare/redesign/frontend...work/perflean?expand=1` and
  check the line "base repository: Rexoflex/Spixi · base: redesign/frontend" before "Create pull request". Do NOT use
  the link that `git push` prints.

Fallback, only if the session's push failed (the status doc says so) — Damir makes the branch and the commits from the
PC tree:
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch -c work/perflean
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git add <the files named in docs\commit-message-perflean.txt — never -A>
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git commit -F docs\commit-message-perflean.txt
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git push -u origin work/perflean
```
