# Handoff 2026-11-18 leanfollow — Speed lean follow-up: the licence texts in the package, two packaging refusals, the plain packaged smoke, two CI steps (STOPPED: not CLEAN at review round 5; not pushed)

Read this FIRST, then DECISIONS #1775–#1782. Number block of this session: DECISIONS #1775–#1789 (used: #1775–#1782;
#1783–#1789 stay empty) · lessons L247–L250 (all used) · packets P77–P78 (both used). Lead: Claude Opus (#1745). The
main chat writes the next prompt.

## 0 · State
- Branch: `work/leanfollow` — **committed in the cloud clone only, NOT pushed** (lead rule 7: not CLEAN at round 5).
  Base `redesign/frontend` @ `55feaddc`, merged with `redesign/frontend` @ `14ae57f` (Session Photo open 1a) on
  2026-11-21 (merge commit `07e1c76`; no rebase). Commits: `fa50bb1` notices · `3e0a358` refusals · `b31cd6d` plain
  packaged smoke · `cc7f50e` CI steps · `7a0051b` registration + work docs · `07e1c76` merge · the export docs commit.
  Author = committer = Damir's identity, unsigned, no attribution line.
- CI (`redesign-ci`): not run (0 of 3 runs used).
- Numbers on the merged tree: smoke `BASELINE OK 6814 / the 2 KNOWN` (= 6660 + 154) · CSH `pass=766 fail=0` (+0) · the gates ✓ · pins leanfollow + perflean +
  photo1a 298 / 298 · plain `smoke-packaged` `GATE 2 FAILED` — red: only `b-refusals` 4 and 15 (L-1) besides the 2 KNOWN · GATE 2 `--lean-css` `GATE 2 FAILED (lean css)` — the 4 expected css reds red as listed; unexpected: only the same 2 rows (L-1).
- Review: **NOT CLEAN at round 5** (#1781): MAJOR 4 → 3 → 1 → 1 → 1; the security-only pass (Fable 5.2) CLEAN at round 5.
  The one MAJOR, r5C-1, is a pin gap (no row decides the project-folder rule through a link); no code defect.
  After round 5 the lead's plain packaged run found L-1 (two rows of this batch red in the packaged copy; § 5.6).
  `docs/review-brief-leanfollow.md` § 5–6.
- No C#, no shell, no bridge, no storage key, no log line changed. No walk sheet (nothing a user sees changes).
- Definition of done: no `docs/release-readiness.md` row changed.

## 1 · What this session did
| Item | Result | Evidence | DECISIONS |
|---|---|---|---|
| 1 · Notices | one inventory (37 components; 40 html files, 9 data-URLs, the NuGet natives, the Core-compiled code); 49 texts in `Spixi/Resources/Raw/licenses/`; UNPROVEN facts are questions | `docs/legal/third-party-notices.md`, `-inventory.json`, pin `a-notices` (13 rows), P77 | #1775 |
| 2 · Refusals | R1 the P-07 park inside the lean target; R2 no out folder in the project folder but under obj / bin; link refusals; a safe write | pin `b-refusals` (21 rows), harness `--fake` 127 / `--real` 118 (+ `--linked`), P78 | #1776 |
| 3 · Plain packaged smoke | the copy is a git work tree, Core linked beside it, links removed first, signals handled; the four old reds are green — ⚠ but L-1: `b-refusals` rows 4 and 15 are red in the packaged copy, so the plain run ends `GATE 2 FAILED` | pin `c-plain-packaged` (56 checks), `lean-expected-reds.json` `copy: []`, brief § 5.6 | #1777, #1779 |
| 4 · CI | steps `xparser`, `msbuildh` after CSH | pin `d-ci` (17 rows, 64 checks) | #1778 |
| Must-hold | lean switches off → package = base but `Raw/licenses/**` | `diff -r` of `Raw/html`: no difference | #1780 |

## 2 · Owed (Damir, in the main chat)
1. The r5C-1 + L-1 choice: (a) one more fix round in `b-refusals.mjs` (the link rows of r5C-1; `mkTree` takes the
   stylesheet from `SPIXI_PACKAGED_FROM`) with one fresh reader and both packaged runs; (b) deliver as is, r5C-1
   accepted as a pin limit (#1735) and L-1 recorded as two known red rows of the packaged copy; (c) stop the batch.
2. r5C-2: keep the obj / bin exception's round-2 form, or a per-view rule in its own batch.
3. The UNPROVEN licence facts (the list in the status doc).

## 3 · Where to resume
- The cloud clone `/home/claude/spixi` holds the branch; if it is gone, the review brief and the five unit commits are
  the record — a resumed session needs the branch back (the status doc says how it was saved).
- After (a) or (b): `git ls-remote origin redesign/frontend`; merge it if it moved; run both batches' pins; push
  `work/leanfollow` once; read each commit back (#1546 (3)); give the compare link.
