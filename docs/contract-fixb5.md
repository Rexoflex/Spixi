# Agent contract — fixb5 (the page batch)

File name: `docs/contract-fixb5.md`. The lead wrote it BEFORE any agent started (`docs/orchestration.md` § 4).
Every agent gets this file plus its own row. An agent that needs a file outside its row stops and asks the lead.
Prompt: project doc `claude/session-fixb5-prompt.md` (Ready by Damir, 2026-11-25 22:41 / 22:46). Lead: Claude Opus.

## 1 · Base
- Tree: `work/fixb5` @ `0eda93f5` "Merge pull request #28 from Rexoflex/work/walktools2" · baseline: `BASELINE OK 7054 /
  the 2 KNOWN (#136 · B3)` (to be observed by the lead) · CSH `pass=908 fail=0` (observed) · tools: `npm ci` on the committed
  lock (jsdom 29.1.1 …) · .NET SDK 10.0.115 · `../Ixian-Core` @ `097341a` · `TZ=America/Los_Angeles`.
- Must hold for everyone: the PARAMOUNT isolation invariant · C# touches no risky parts · the frozen bridge (no new verb,
  no new push name, no new argument shape) · #1312 / #1478 (own switch, old path = the fallback) · the security handover
  gate triggers (a new `spixi.*` key, WebView setting, HTML sink, network fetch or log line → its section) · edit `src/`,
  never `Spixi/Resources/Raw/html` by hand (the generators build it) · no commit, no push, no full smoke, nothing in
  Ixian-Core, `Spixi/Meta/**`, `src/shells/chat.html`, the chat page C#, `.github/**`, `scripts/size-*`, `scripts/device/**`,
  `docs/process.md`, `docs/orchestration.md`, `docs/templates/**`.
- **The size rule R1–R6 (#1963 (8)):** app C# at most **+80 code lines** for the whole batch; hand-written `src/**` at most
  **+300 code lines** (locale tables not counted — give the added keys). R2: a new comment says WHAT or WHY, never history
  (no batch name, round, walk, reader or date; a decision number at most once per member). R5: no probe or timing line
  outside `#if SPIXI_DEV_COEXIST`. R6: no file grows past 1,500 lines; `HomePage.xaml.cs` (7,321) and `SpixiContentPage.cs`
  (7,732) are over it already and may grow ONLY by lines the item cannot place elsewhere — name each such line.

## 2 · Items and ownership (file scopes are disjoint)
| Item | Agent | Model (effort high) | Owns (files / folders) | Reads only | Owes (pins + one deliberate break each) | Scratch folder |
|---|---|---|---|---|---|---|
| 9 docs | builder-docs | sonnet | `DECISIONS.md` (ONLY the run of the main chat's rows #1839–#1844, #1960–#1964 after the block of #1838), `docs/decisions-index.md` (their lines + the two #1420–#1423 lines of #1839 (1)), `docs/walk-launch.md` (#1839 (3), the lead's part) | `/mnt/project/claude_talk-rulings-*.md`, `scripts/docs/*` | a scratch proof: each inserted row byte-equal to its source block, nothing else changed (run `git diff --stat`) | `/home/claude/scratch/docs` |
| 4, 5, 8 small shells | builder-shells | sonnet | `src/bridge/contacts-page.js` (the `onDismiss` of the add-contact chooser only), `src/shells/lock.html`, `scripts/pins-fixb5/a-chooser.mjs`, `scripts/pins-fixb5/b-lock.mjs`, `docs/be-review-pack/P105-*.md` (item 5), the re-base of any hashed pin these edits break (name each) | the rest of `src/`, `scripts/pins-*`, `Spixi/Lang/SpixiLocalization.cs`, `Spixi/Pages/Lock*` | a-chooser (a removed OLD chooser never clears the NEW chooser's handle); b-lock (an early reveal before `boot()` never leaves the form hidden; the built lock page holds no `*SL{…}` token whose key is neither a C# carrier of the lock page nor a key of every locale) — each with a deliberate break | `/home/claude/scratch/shells` |
| 2, 1 launch | builder-launch | opus | `src/components/launch-shell.js`, `src/shells/launch.html`, the CSS that ONLY the launch shell uses, `src/strings/*.json` + `src/strings/draft/*.json` (the new key `slide4Title3` only), `scripts/pins-fixb5/c-slide4.mjs`, `scripts/pins-fixb5/d-protect-keyboard.mjs` (+ a by-hand Chromium render `d-protect-keyboard-render.mjs`), the re-base of hashed pins these edits break (name each) | the rest | c-slide4 (14 locales; no locale names planning or Split; the claims rules); d-protect-keyboard (Chromium 360 × 640 and 412 × 774 with the keyboard inset: both fields AND the button above the keyboard, the picture hidden, the title small, Next → the second field) — each with a deliberate break | `/home/claude/scratch/launch` |
| 7, 6 C# | builder-cs | opus | `Spixi/Pages/Home/HomePage.xaml.cs` (the decline, the undo, the two `pendingDeletion` re-adds only), `Spixi/Utils/SpixiContentPage.cs` (the one log line near 7685), `Spixi/VoIP/OpusDecoder.cs`, `Spixi/VoIP/OpusEncoder.cs` and/or `Spixi/Utils/VoiceCodec.cs` (the decoder line; the place it names), `Spixi/Utils/SpixiFlags.cs` (ONE new block for this batch's switches), `scripts/csh/**` (new test files + their `csh.csproj` lines), `scripts/pins-fixb5/e-small-fixes.mjs`, `scripts/pins-fixb5/f-opus-managed.mjs`, `docs/be-review-pack/P103-*.md` (item 6), `P104-*.md` (item 7), `docs/security-handover-gate.md` (the sections of items 6 and 7, the item-7 "introduced" list, and a short section for item 5 that builder-shells gives as text in its scratch `gate-section.md`), the re-base of hashed pins these edits break (name each) | the rest; `/mnt/project/claude_size-check-2026-11-24.md` (the drifts), `/home/claude/ext/concentus` (upstream Concentus source, `Version` 2.2.2) | e (each of the three fixes; a source pin — its limits in its first lines); f + a CSH test (the factory gets `AttemptToUseNativeLibrary = false` before the first decoder or encoder is made, on every platform; the switch OFF = the old path) — each with a deliberate break | `/home/claude/scratch/cs` |
| 3 first notice | — | — | **STOPPED** before any build (§ 7) | | | |
| — | lead | opus | `scripts/smoke-test.mjs` (ONE registration block), the built html (generators only), the export docs, `DECISIONS.md` own rows #1990–#2009, `docs/lessons.md` L303–L308 | | | |

Model by the cost of a wrong result (`docs/orchestration.md` § 2): C# and the security-lens items = Opus.
Every agent works in ITS OWN full copy of the tree (`cp -a` of the clone, with `node_modules` and the sibling
`../Ixian-Core` beside it), runs only its own pin modules (`node scripts/run-pins.mjs <dir/mod>`) and the C# harness in that
copy, and never the full smoke.

## 3 · Interfaces between items (the only way two items meet)
| Name | Shape | Provider | Consumer |
|---|---|---|---|
| Pin module shape | `export default async function ({ ok, root, load, stripCode, stripCssComments, readFileSync, readdirSync, existsSync, join, JSDOM, VirtualConsole, sleep })` — every check is one `ok(cond, label)` | every builder | the lead's ONE registration line in `scripts/smoke-test.mjs` |
| Switch block | `Spixi/Utils/SpixiFlags.cs`: one static class for this batch (lazy read like `LockbFlags`: absent = ON; a stored 0 acts only in dev mode; one `[FLAGS] fixb5 …` line with fixed words and 0/1) — or no new class when every fix sits behind a switch that already owns its code | builder-cs | the lead (gate doc section, R4 rows) |
| Gate-doc text | builder-shells returns its item-5 section text in `/home/claude/scratch/shells/gate-section.md`; the lead gives it to builder-cs or pastes it at integration | builder-shells | builder-cs / lead |
| `csh.csproj` lines | the builder returns the exact lines it added | builder-cs | lead |

A change to this table goes through the lead; both sides get the new text.

## 4 · What each agent returns
- The list of files it CHANGED (the lead copies back only these).
- Per pin: the command, the green output line, the break it made (one-token mutation in a full copy, #802), the red line
  with the failing key.
- The code lines it added (app C# / `src/**`, by the counter of § 6) and every comment line it added (R2).
- What it could not prove (⚠ C# UNCOMPILED, unrun, not rendered).
- Anything it saw outside its scope: a note, not a fix.

## 5 · Integration order and checks (the lead)
1. Copy back per agent, changed files only → the FULL pipeline (`extract-strings` → `build-locales` → `build-strings-iife` →
   `build-demo-bundle` → `build-shells`; bundle BEFORE shells) → the `--check` gates → `cs-syntax-check`.
2. The ONE pin registration in `scripts/smoke-test.mjs`; grep the smoke for the tokens of every edited line (L84).
3. `pin-sweep --working`, the full smoke (one at a time, nothing beside it, L153) + CSH → the #46 loop until CLEAN (readers:
   Fable 5.2 for the security-only pass over the final tree, for item 6 and for item 5; Opus for the rest) → the full smoke
   ONCE after the last fix (#1503) → the export docs → commits → merge the newest base if it moved → ONE push → read back.

## 6 · The counter (R1, R3)
`scripts/size-count.mjs` is not on the base. App C# is counted by the inventory's method (§ 13.1 of
`claude/code-inventory-2026-11-24.md`): the Pygments C# lexer; a code line holds at least one non-comment token; app C# =
`Spixi/**/*.cs` without `Platforms/MacCatalyst/RocksDbSharp/**`; it must give 63,925 at `23c9c495`. Hand-written `src/**`:
the Pygments JavaScript / HTML / CSS lexers on `src/components/**`, `src/bridge/**`, `src/shells/**`, `src/styles/**`
(generated and `src/strings/**` apart); the lead states the method in the status doc.

## 7 · Item 3 (the first notice) — stopped before any build
After a create or a restore, `LaunchPage` posts the navigation to Home in the same step (`LaunchPage.xaml.cs` :629–632 and
`goHome` :1321–1328 for the restore and unlock paths); the launch WebView is gone before a sheet could be read. A sheet after the account exists can only show
on the home page, and the Moment sheets are granted by C# (`SMoments`, `Spixi/Meta/**`, out of scope) through the home
shell (not in the file areas). A sheet in the launch shell would need the navigation held until the shell answers — a new
verb (frozen bridge). So the item stops with its question (status doc, Mission Control); no file of it is built.

## 8 · What stage 2 deletes of this batch (R4)
| Switch (owner) | Stage 2 removes | Kept |
|---|---|---|
| the switch of item 6 (`SpixiFlags.cs`, this batch's block) | its key, property, read, `[FLAGS]` part, the `if` around the setter; the old path (no setter) | the one setter line, unconditional |
| each new switch of item 7 (if any) | the same: key, property, read, the `if`; the old path | the fix lines, unconditional |
| items 1, 2, 4, 5, 8 | nothing: shell fixes with no switch (hole-closing / layout / text, #1321) | — |
The pins that name a removed switch are re-based or removed with it (`pins-fixb5/e-small-fixes`, `f-opus-managed`, the CSH
test of item 6).

## 9 · Escalation log
| Item | Attempt | Model | Result | Next |
|---|---|---|---|---|
