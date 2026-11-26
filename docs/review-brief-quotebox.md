# Review brief — quotebox (#2010–#2012)

Work order for the #46 loop (`docs/process.md`). Written BEFORE round 1. The verdict goes into § 5.

## 1 · What the batch is
| Item | What landed | Where (files) | DECISIONS |
|---|---|---|---|
| 1 · mechanism | why the Windows quote box of REPLY C (chat Seed 57) does nothing: not reproduced off the device; the page script answers as it should in Chromium; four likely causes | `docs/quotebox-mechanism.md` · `scripts/pins-quotebox/harness-seed57.mjs` (by hand, not in smoke) | #2010 |
| 2 · fix | **not built** (no proven cause) | — | #2011 |
| 3 · walk rows | the rows that tell the causes apart, on the existing build | `docs/walk-quotebox.md` = the Artifact "Spixi walk — quotebox" | #2011 |
| export | contract, rows, index, lesson, handoff, status log, `CLAUDE.md` | `docs/contract-quotebox.md`, `DECISIONS.md`, `docs/decisions-index.md`, `docs/lessons.md`, `docs/handoff-2026-11-25-quotebox.md`, `docs/status-log.md`, `CLAUDE.md` | #2012 |

No app file changes: `Spixi/**` and `src/**` are byte-equal to the base; the built html is unchanged.

## 2 · How to run
- Tree: the cloud twin of `work/quotebox` (base `redesign/frontend` @ `0eda93f5`) · range `0eda93f5..HEAD` (or the
  working-tree diff) · Ixian-Core @ `097341a` beside the repo.
- Pipeline: none (no `src/**` change) · smoke before: `BASELINE OK — 7054 pass / the 2 KNOWN` · CSH 908.
- The harness: `PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-quotebox/harness-seed57.mjs
  --mode desktop --fresh [--place top|center] [--match ABD] [--update C] [--context] [--drop C [--drop-prepend]] [--nojump C] [--press-prepend C] [--caps reply,edit,voice,media,fadeBand] [--vw 860 --vh 980 --dpr 1.25]`
  (a run takes about 1 minute; one at a time; never beside the full smoke).

## 3 · Readers (fresh, read-only; by #1606)
| Reader | Model | Scope | Focus |
|---|---|---|---|
| S | Claude Fable 5.2 | the whole delta (the harness above all) | security only: the harness's local server (what it serves, to whom, path checks), what it runs and loads, any page / bridge / C# behaviour that the docs say changed; the quote jump must never make the page load or show something outside its chat — confirm that nothing in the delta touches it |
| O | Claude Opus | `docs/quotebox-mechanism.md`, `docs/walk-quotebox.md`, the harness, the rows #2010 / #2011 | every claim against the tree (`file:line` exact, depths and row numbers, what the harness really measures and what its "jump" / "landed" really prove); does each walk row tell the causes apart as § 5 of the mechanism says; can Damir run each row as written (PowerShell lines complete, Ctrl+F5, no wipe) |

## 4 · Non-negotiables and accepted dials
- Must hold: the PARAMOUNT isolation invariant · no app file changed · no new verb, push, log line, `spixi.*` key or
  WebView setting · no fix without a proven cause (the prompt) · the harness is a by-hand tool, not a pin (no smoke row).
- Accepted (do not re-open): #1961 (2) and finding 1 (the walk record); #1964 (1) (own small batch); #1963 (8) (R1–R6).

## 5 · Verdict

**CLEAN at round 5** (the last permitted round): MAJOR per round, S (Claude Fable 5.2) · O (Claude Opus): r1 0 · 2, r2 0 · 1,
r3 0 · 2, r4 0 · 1, r5 0 · 0. Every reader fresh and read-only. Smoke `BASELINE OK — 7054 pass / the 2 KNOWN` on the tree that
round 5 read (run before its readers). The code file is committed exactly as round 5 read it: `scripts/pins-quotebox/
harness-seed57.mjs` SHA-256 `dea2d0ab9463696e72b484eb8bd1113578631bcef113a48a9735c038e7499534` (rule 8). After round 5 only doc
corrections (rule 8), in files no smoke row reads: `docs/walk-quotebox.md` + its page, `docs/quotebox-mechanism.md`,
`docs/handoff-2026-11-25-quotebox.md`, this brief.

Round 5 records:
- O MINOR-1 (fixed, doc): a short read keeps the OLDEST rows, so B is a fallback box whenever C is (§ 3 item 3, § 5).
- O MINOR-2 (fixed, doc): the cause-4 log cell names `mode=full` and "the same second".
- O MINOR-3 (fixed, doc): the walk records the clock time of each open.
- O MINOR-4 (fixed, doc): Q-0 runs with Spixi closed; Spixi starts once, in W-BUILD.
- O N1 (recorded, not changed): "three inputs" in rows #2010, `CLAUDE.md`, the status log and the handoff § 1 — a lost
  `jumpToMessage` after C#'s widened rows (run 9) is input (b) with C#'s own page; § 3 of the mechanism now says so. Those
  files are read by smoke rows, so they stay as round 5 read them.
- O N2, N4 (fixed, doc): no "new case" row (the sheet's sentence); one folder form for the copy and the log line, and both
  `ixian.cfg` keys. O N3 (recorded): the `CLAUDE.md` bullet's short wording of causes 1 and 2 (a smoke-read file).
- S NIT-1, NIT-2 (fixed, doc): the scrub's limits stated in item 4. S NIT-3 (fixed, doc): the copy runs with Spixi closed,
  in the log line's folder form. S NIT-4 (recorded, code): the harness header does not say that `--root` must be a
  trusted tree (Chromium runs without its sandbox in Playwright) — a header line in a later batch. S NIT-5, NIT-6 (fixed,
  doc): option (c) filters the log tail through line L; the cause-4 fix names L157.
- Earlier records kept: the walk page loads Google Fonts like the earlier walk pages (not an app file); rule 9 parked the
  sheet's decision table after r3 and r4 (the question is in handoff § 4).

Rounds so far (the cost note before round 3): r1 — S (Fable 5.2) MAJOR 0 · MINOR 1 · NIT 4; O (Opus) MAJOR 2 · MINOR 5 · NIT 5
(an unanswered jump whose toast a prepend cancels; for Seed 57 the deeper read happens at the open). r2 — S MAJOR 0 · MINOR 0 ·
NIT 4; O MAJOR 1 · MINOR 5 · NIT 4 (a full repaint inside a mouse press loses the click: shown in Chromium). Each round adds a
candidate path: the doc says the list is not closed, and the walk's "new case" row catches the rest. One more round costs two
fresh readers (about 25 minutes) and one full smoke before them (about 45 minutes).
r3 — S MAJOR 0 · MINOR 0 · NIT 4 (CLEAN); O MAJOR 2 · MINOR 3 · NIT 4: the walk's cause-4 row was also the picture of a lost
`jumpToMessage` (2b), and `mode=full` follows every answered jump after a mouse click. Fixed by design, not by another
mapping: the walk now decides only 1, 2a, 3a, 3b and RECORDS the rest (click times, `rows=` lines) for the main chat;
harness run 9 (`--nojump`) added; the open pushes `messagesDone()` as C# does. Round 4 = two fresh readers on the final tree
after a full smoke; round 5 stays spare.
r4 — S MAJOR 0 · MINOR 1 (L149: copy the data folder before the seed step; fixed) · NIT 5; O MAJOR 1 · MINOR 4 · NIT 5: a
slow widening gives 2b "a toast, then no jump", so the sheet's 2a row misread it. **Rule 9 (two rounds in a row with a
NEW class of misread in the same item, the sheet's decision table): no third fix round on the table — it is parked; the
sheet records only, § 5 of the mechanism keeps the signatures as reasoning, and the choice goes to Damir (handoff § 4).**
Other r4 fixes: the 2a / 2b names, the short read (`Cannot read from chat file`), window 51, two citations, the harness's
second-click label and its failed-run close, `-ErrorAction SilentlyContinue`, `-Last 200`, "a WebView setting" in the gate
list. Round 5 = the last permitted: two fresh readers on the final tree after a full smoke.
