# Handoff 2026-11-18 → 22 leanfollow — Speed lean follow-up: the licence texts in the package, two packaging refusals, the plain packaged smoke, two CI steps (CLEAN at review round 6; delivered by #1546)

Read this FIRST, then DECISIONS #1775–#1784. Number block of this session: DECISIONS #1775–#1789 (used: #1775–#1784;
#1785–#1789 stay empty) · lessons L247–L250 (all used) · packets P77–P78 (both used). Lead: Claude Opus (#1745). The
main chat writes the next prompt.

## 0 · State
- Branch: `work/leanfollow`, pushed to `Rexoflex/Spixi` (#1546); Damir opens the pull request. Base `55feaddc`; merged
  with `redesign/frontend` three times, no rebase: `4f0eb11` (`c9d6bf6`), `9691018` (`1ad3a44`), `cec3f98` (`338d30f`).
  Author = committer = Damir's identity, unsigned, no attribution line; the read-back is in the status doc.
- CI (`redesign-ci`): runs when the pull request opens (0 of 3 used before it).
- Numbers on `cec3f98`: smoke `BASELINE OK 6928 / the 2 KNOWN` (= 6774 + 154) · plain `smoke-packaged` `BASELINE OK 6928` +
  `GATE 2 OK` (a second run: the first had one timing flake of `pins-s4/chat` `#1147 (5)`, green alone 3 / 3) · `--lean-css` `GATE 2 OK` (6924 pass · 4 red by design) · CSH `pass=806 fail=0` (+0) · the gates ✓.
- Review: MAJOR 4 → 3 → 1 → 1 → 1 → 0. Round 5 not CLEAN (r5C-1, a pin gap) + L-1 after it (#1781) → Damir's #1753 → one
  fix round in `scripts/pins-leanfollow/b-refusals.mjs` (Sonnet) + one fresh Opus reader → **CLEAN at round 6** (#1783).
  `docs/review-brief-leanfollow.md` § 5–6.
- No C#, no shell, no bridge, no storage key, no log line changed. No walk sheet (nothing a user sees changes).
- Definition of done: no `docs/release-readiness.md` row changed.

## 1 · What this session did
| Item | Result | Evidence | DECISIONS |
|---|---|---|---|
| 1 · Notices | one inventory (37 components; 40 html files, 9 data-URLs, the NuGet natives, the Core-compiled code); 49 texts in `Spixi/Resources/Raw/licenses/`; UNPROVEN facts are questions | `docs/legal/third-party-notices.md`, `-inventory.json`, pin `a-notices` (13 rows), P77 | #1775 |
| 2 · Refusals | R1 the P-07 park inside the lean target; R2 no out folder in the project folder but under obj / bin; link refusals; a safe write | pin `b-refusals` (21 rows; round 6: the rule through a link), harness `--fake` / `--real` (+ `--linked`), P78 | #1776, #1783 |
| 3 · Plain packaged smoke | the copy is a git work tree, Core linked beside it, links removed first, signals handled; GREEN (L-1 closed in round 6) | pin `c-plain-packaged` (56 checks), `lean-expected-reds.json` `copy: []` | #1777, #1779, #1783 |
| 4 · CI | steps `xparser`, `msbuildh` after CSH | pin `d-ci` (17 rows, 64 checks) | #1778 |
| Must-hold | lean switches off → package = base but `Raw/licenses/**` | `diff -r` of `Raw/html`: no difference | #1780 |

## 2 · Recorded, not fixed (direction in the brief)
- R6-1 (MINOR): where the temp folder itself is reached through a link (macOS) the two outbound link cases of `b-refusals`
  are skipped; fix: `realpathSync(mkdtempSync(…))`. R6-2 … R6-4 (NIT): two head comments, a silent fallback.
- r5C-2 (the obj / bin exception holds in both directions through a link), r5C-3 / r5S-2 (`d-ci` row 17 does not hash
  the new region), r5S-1 (`Spixi-PushService/Resources`, as at the base).

## 3 · Open for Damir (block nothing)
1. r5C-2: keep the round-2 form of the obj / bin exception, or a per-view rule in its own batch.
2. The UNPROVEN licence facts (the list in the status doc).
