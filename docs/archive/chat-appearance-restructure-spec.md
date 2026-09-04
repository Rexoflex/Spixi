# CHAT APPEARANCE — THE THREE-CONTROL RESTRUCTURE (Damir, 2026-09-04)

**Status: LOGGED, NOT BUILT.** Recorded from Damir's screenshot + note while the Session L
batch is still uncommitted. Build it as a Session M render round — his eye rules every dial, so
it gets rendered on the real shell before it is called done.

## Why — the defect is VISUAL, not just count

★★ **Damir's reason, 2026-09-04, and it is the load-bearing one:** *"we have 3 which are quite
similar and confusing this way… also it would then look different, currently we have 3 almost
identical rows."*

Look at the screenshot: **Background, Canvas and Opacity all render as the same widget** — a pair
of rounded ~56px tiles, side by side, each showing a patterned rectangle. Three different
questions ("which pattern?", "flat or gradient?", "how strong?") wearing one costume. Worse, the
costume lies about two of them: the *Canvas* tiles show the doodle pattern rather than the
ground they select, and the *Opacity* tiles show a pattern rather than an intensity, so a user
reading top to bottom sees the same picture three times and cannot tell the controls apart.

**That is the defect.** Collapsing four cards to three is the consequence, not the goal. The goal
is that each remaining control **looks like the question it asks**, so:

| Control | Question | Shape | Why that shape |
|---|---|---|---|
| Background | which pattern? | **tiles** — a real preview of each pattern, incl. an empty tile for None | a pattern choice is inherently visual; this is the ONE control that earns swatches |
| Colour | gradient or solid? | **a row with a value, not tiles** (`settingsOptionSheet`) | a binary with no texture to preview; two near-identical coloured rectangles is exactly the confusion being removed |

⚠ **So "make it a dropdown" is not a layout preference — it is the fix.** If the colour control
ships as another pair of tiles, the restructure has removed a card and kept the defect. Do not
"improve" it back into swatches at build time.

★ The Background tiles must also become **honest previews**: None renders as the bare ground (no
pattern), Line art and Matrix render their own pattern at the intensity they will actually paint.
Today's Opacity tiles carry a `PATTERN_SWATCH_BOOST` precisely because at true alpha the two
tiles were indistinguishable at 56px (break-my-verdict MINOR-3). Once "None" is a *pattern*
choice rather than an alpha, that boost's job changes — an empty tile and a patterned tile differ
without cheating the alpha. **Re-check whether the boost is still needed, and delete it if not:**
a swatch that lies about its own value is the same class of defect as the three identical rows.

## What he asked for

> "background has none, line art and matrix. and then below we would just have a small selector
> in dropdown or otherwise on light mode where we show either gradient or solid color. on dark
> mode we would just not have the color selector or find a gradient that fits."

## What the screen is today

Four stacked cards (`createChatAppearance`, `src/components/settings-screens.js`):

| Card | Model | Values today |
|---|---|---|
| Message text size | `TEXT_SIZES` | S · M · L · XL |
| **Background** | `PATTERN_STYLES` :33 | `doodles` (default) · `matrix` · `flow` (desktopOnly) |
| **Canvas** | `CHAT_GROUNDS` :69 | `flat` (Solid) · `gradient` |
| **Opacity** | `PATTERN_LEVELS` :82 | `0` Off · `1` Subtle |

## What it becomes

| Card | Values | Note |
|---|---|---|
| Message text size | unchanged | — |
| **Background** | **None · Line art · Matrix** | **absorbs Opacity** — "None" is today's level 0 |
| **Colour** | Gradient / Solid, in a compact selector | **light mode only** |
| ~~Canvas~~ ~~Opacity~~ | gone as separate cards | folded into the two above |

Net: **four cards → three**, and one of them disappears entirely in dark mode.

## Open questions — TWO RESOLVED, ONE STILL OWED, ONE IS BUILD WORK

### 1. ~~Does "line art" mean `doodles` or the retired `lineart`?~~ ✅ RESOLVED 2026-09-04

**Damir:** *"we keep 3 different styles none, and 2 existing (dont mind me naming stuff here)."*

**None + the two that already ship.** No resurrection: the retired `lineart` stays retired, his
E1 ruling stands, and nothing re-skins. "Line art" in his earlier note was him describing the
doodles swatch by eye, not naming an id.

★★ **And the parenthesis is a ruling of its own: "don't mind me naming stuff here" means the
LABELS ARE NOT CHANGING.** `Doodles` and `Data matrix` keep their strings and their keys. Do not
take his shorthand as a rename — that would be a locale change (13 files, the 786 count, an
`extract-strings --check` move) bought with nothing, on words he explicitly told you not to read
as names. If a label should change, it will be its own ruling.

**Net: zero migration on the style axis, zero locale churn.** The only migration left is the
`(style, level)` → one-value collapse in Q4, which is unaffected by this answer.

### 2. ~~Where does `flow` go?~~ ✅ RESOLVED BY IMPLICATION — but state it out loud

He said **"2 existing"** while looking at a **phone**, and on a phone there ARE exactly two:
`flow` is `desktopOnly: true` and already hidden there. So his count is consistent with `flow`
surviving untouched, and nothing in his note asks to retire it.

**Build it as:** mobile = None + Doodles + Matrix (3). Desktop = None + Doodles + Matrix + Live
flow (4). That is the same rule the picker already follows, with `None` prepended.

⚠ If someone reads "3 different styles" as a hard cap and drops `flow` on desktop, that is a
silent retirement of a style a desktop user may be sitting on — the exact thing E1 forbids. It is
called out here so the count in his sentence cannot be mistaken for a ceiling.

### 3. Dark mode: hide the control, or design a gradient that fits?

He offered both and picked neither: *"we would just not have the color selector or find a
gradient that fits."* This is a render decision and it is his.

- **Hide it** — simplest, and honest: if only one ground reads well in dark, showing a chooser
  with one good answer is a dead control (#257, no dead buttons).
- **Design one** — more work, and it needs a sheet rendered on the real shell for him to pick.

Recommendation: **render both dark grounds first, show him the sheet, then decide.** The question
"is there a dark gradient that fits" is answerable in one render round and unanswerable in prose.

### 4. The migration — two stored values collapse into one

Today a user has a `(style, level)` pair. Tomorrow they have one background value.

| Stored today | Lands on |
|---|---|
| level `0` (Off) + any style | **None** |
| level `1` + `doodles` | **Line art** |
| level `1` + `matrix` | **Matrix** |
| level `1` + `flow` (desktop) | **Live flow**, if it survives Q2 |
| level `2` (retired Strong) | already folds `2 → 1` on read — keep that fold, then map as above |

⚠ **The fold must land in all THREE pre-paint ladders** — `chat.html`, `settings.html` and the
component — per the **#690 three-ladder rule**: a level resolved after first paint flashes the
wrong intensity. `readPatternLevel`'s existing `2 → 1` fold is the worked example to copy.

## Build notes

- The colour control's visibility is **theme-derived, not a preference**. It keys off the same
  resolved appearance the shells already use (`data-theme` + `prefers-color-scheme`), so it must
  re-evaluate on an OS theme flip mid-session — the N71 theme-push path already reaches this
  screen; a control that only decides its visibility at page build will be wrong after a flip.
- "Small selector in dropdown or otherwise": the settings shell already has
  `settingsOptionSheet` for exactly this shape. Prefer it over inventing a dropdown — it is the
  established pattern for a one-of-N choice that does not deserve a full card.
- Removing two cards changes the screen's height and its scroll behaviour; check the screen with
  the largest text size (XL) and in both themes.
- **Locale:** `groundFlat` / `groundGradient` keys survive if the control survives; a label
  change needs `extract-strings` + all 13 locales, and `verify-locales` must stay at 786 clean.

## Gates this touches

`build-demo-bundle` → `build-shells` (bundle BEFORE shells) · `smoke-test` (the appearance pins
live in the settings block) · `extract-strings --check` · `verify-locales` · `pseudo-locale-smoke`
· `i18n-lint`. Any label change moves the string count — record the new closing numbers.

## Why this was logged and not built

The Session L tree is **uncommitted** and its recorded closing numbers (smoke 4067, bundle 321,
shells 18) are the numbers in `docs/commit-message-session-l.txt`. Building a UI change into that
same tree would make the commit message describe a batch it no longer is, and would put an
unrendered, unruled screen change inside a commit whose subject is an adversarial review loop.
It also has four open questions above, three of which are his to answer.

**Order: commit Session L → walk L → this, as a render round in Session M.**
