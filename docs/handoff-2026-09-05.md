# HANDOFF — SESSION M (2026-09-04): the definitive read for Session N

★★ **This file SUPERSEDES `docs/handoff-2026-09-04.md`** (archived as
`docs/archive/handoff-2026-09-04-session-l.md`). Read this whole file, then **DECISIONS
#783–#786**, then — if you are touching perf — **`docs/perf-lean-workorder.md`** and
**DECISIONS #780–#782**, which a parallel session added the same day and which this session
did not touch. The Sessions I–K verdict still lives in the brief that ordered it
(`docs/opus-review-brief-sessions-i-k.md` §Verdict); the #771 and #772 rules still stand and
this session paid for both again.

## 0 · State and the numbers

Session M built **three** of the queue's items, was ruled off a fourth, and took one
render-round dial from Damir mid-session (#787). In a clean clone,
Linux container, `npm i jsdom tree-sitter tree-sitter-c-sharp`, **Ixian-Core sibling at
097341a PRESENT**:

```
bundle 321 · shells 18 · smoke BASELINE OK 4090 / the 3 known (#136 · M5 · B3)  ← WITH the sibling
                        (say which, always — the M1 hold-out gate, #748, is one assertion fewer without it)
locales ALL CLEAN 786 · i18n-lint ✓ (6 dev exemptions, 2 sites) · pseudo 9/9
cs-syntax 141 clean + 1 known gap · extract-strings --check ✓ · build-shells --check ✓
build-legal-docs --check ✓ (terms baked · privacy HELD 🟡) · Ixian-Core 097341a untouched
```

**4067 → 4090 (+23).** No new export (321), no net new string (786 — `patternIntensity`
retired with its card, `patternNone` added), no new C# file. **22 mutations run against every
new and rebased pin; 22 killed, zero survivors.**

⚠ **The batch is UNCOMMITTED and the walk has not happened.** `docs/commit-message-session-m.txt`
is written; the checklist is `docs/f5-checklist-session-m.md` and the clickable artifact is
`docs/walk-artifact-session-m.html` (P/F/N per row, copyable results, the render sheets inline).

⚠ **Built `chat.html` headroom is unchanged** — this batch touched no chat prose, so the
`#345` ceiling still has the 1 663 B Session L left it. Any prose edit to that shell budgets
a raise in the same commit, priced the way the pin's docblock prices it.

⚠ **A parallel session was editing the same tree.** It added DECISIONS **#780–#782**,
`docs/lean-build-audit.md`, `docs/perf-lean-workorder.md`, and item ①a to the old handoff.
My rows start at **#783** and nothing of theirs was overwritten. If both batches are
uncommitted when you arrive, they are two batches, not one.

## 1 · What Session M shipped

★ **#783 — chat appearance is three cards, and the storage did not move.** Background
absorbed Opacity; Canvas became a value row; the Opacity card is gone from the file, not
merely unappended. **The ruling that made it small:** the spec assumed the `(style, level)`
pair would collapse into one stored value — a new key, a migration, and that migration
repeated in all three pre-paint ladders. None of it was needed. With Strong retired the level
is binary, so `level 0` **is** None and `level 1 + style` **is** that style; the collapse is
total, lossless, and computable at render time from the two keys that already exist. Zero
migration, zero new `spixi.*` key, zero ladder change.
**#774 ③ is answered — Damir picked HIDE**, so it is 3 cards in light and 2 in dark. And the
light-only row now survives a live OS flip: the component read `isLight` live and a comment
claimed that covered a `setTheme` landing while the screen is open. It did not. `settings.html`
re-renders that ONE view from `applyPushedTheme`'s `onApplied`; a blanket rebuild was refused
because it would drop an open sheet on every flip.

★ **#784 — apps opens on grid and the view survives a restart.** `spixi.apps.layout`, two
fixed words, **read at state-seed time**, default `grid`, and **a stored `'list'` still wins**
— the order of those two is what the pin asserts, because a default that ran first is the
silent re-skin E1 forbids. Its gate row landed in the same batch, per #775's own rule.

★ **#785 — the 120 ms present hold is a RACE now.** `presentPreload` awaits
`Task.WhenAny(Task.Delay(op.revealDelayMs), op.painted.Task)`. **It can only ever present
earlier** — a shell that never signals waits exactly what it waits today — which is why it
could be applied to every load-then-present page at once instead of page by page. One
implementation on both sides: `bridge.painted()` (latched, double rAF) and ONE inbound home
(`onNavigatingGlobal` → a virtual `onPaintedSignal`), with SingleChatPage's own branch deleted
and replaced by an override that still calls base. Mini-apps are excluded structurally.
Plus a temporary `[CDPERF] chats` stamp for the ~60-row flush.

★ **#787 — the swatch boost is per style.** Damir, on the sheet: *"make the doodle pattern
also fainter on the tiles"* — and the ask named a defect in the **shape** of the dial, not
just its value. One multiplier cannot balance two artworks with different ink coverage:
doodles is dense line art, the matrix is scattered dots, so at a shared ×6 one shouts and the
other whispers. Doodles is ×3; matrix and flow keep ×6. **The pin asserts the relation, not
the number** — a literal would redden on his next dial and say nothing about the property
that matters, and "doodles is lower" alone is satisfied by lowering both, which the shared
strip refuses (at ×3 the matrix is already faint; by ×2 it is gone). ★ It also exposed dead
code this session had left behind: `swatchGroup`, the intensity row's builder, lost its only
caller in #783 and was still in the file. Deleted, with three docblocks that had become
pointers to a row that no longer exists — one of them written by the restructure an hour
earlier (#772).

★ **#786 — ② was ruled logged-not-built**, and the ruling is recorded rather than resolved
silently: Damir ticked ② in the scope question and then chose "leave it — log the row, do
nothing" when asked how to play it.

## 1b · Two things this session got wrong, kept because they will recur

① ★★ **A render can be wrong in a way that reads as data.** The data-matrix swatch dial set
`mask-size` on the FACE element; the mask lives on the face's `::before`, so the inline was
inert, all six candidate rows were the same tile, and the differences read off them were
render noise. Its answer (96px) was **shipped for about an hour** before a corrected strip —
injected as a stylesheet, the only way to move a pseudo-element's property — showed the
opposite: a smaller mask scales the source *down*, so the matrix dots get fainter, not
denser. The value is back at **144px**, and the episode is in the CSS comment because a value
re-derived and returned to its old number is indistinguishable from a value nobody checked.
**Rule: when a dial strip shows the control you did NOT change also changing, the strip is
lying.** That was visible in the first sheet and I read past it.

② ★ **A pin that depends on ambient state asserts a different thing depending on what ran
before it.** The first version of the appearance block inherited whatever `data-theme` an
earlier pin had left on the jsdom document, and the light-only Colour row was simply absent —
the pin failed for a reason that had nothing to do with the code. Both fixtures now set the
theme explicitly and restore it.

## 1c · The walk (2026-09-05) — 24 P · 0 F · full results in `docs/walk-session-m-results.md`

**DECISIONS #788.** Every row scored, and **the log agrees with the sheet** — worth recording as
an outcome, since #776's lesson was the opposite. A4 (None → a style restores the LEVEL), B3
(layout survives a real `am force-stop`) and C6 (cold start, all five DATA pages appear FILLED)
all pass — those three are what the batch turned on.

★★ **The chat-open split, measured a third time on a newer build (8 opens):** create 77 ·
**parse 99** · push+drain ~20 · render→painted ~88 · painted→present 6 — median total **292 ms**,
range 247–420. `nav == dcl` on all eight, so #764 holds for the third capture: **the in-document
time is entirely parse**, and at ~99 ms it is a third of a median open. That is the lean build's
target with a current number. **Zero `backstop t=` lines.**

⚠ Two numbers moved against walk L and **neither is claimed**: `painted→present` 3–7 ms against
L's ~30 (the chat asks for `revealDelayMs: 0`, so #785's race never runs there — L's figure was
derived, this is the first stamped one), and parse 87–102 against L's 117–144 while the bundle
**grew** 9.4 KB.

★★★ **THE ONE THING OWED, and it is this batch's own headline: the five DATA pages carry no
stamp.** Damir's eye confirms none presents empty — the failure mode — but nothing in the log
says whether they presented on `ixian:painted` or waited out the 120 ms timer, so **#785's
central claim is untested on device.** One temporary line in `presentPreload`
(`[CDPERF] present <page> by=paint|timer t=…ms`) settles all five in one capture. Not built: the
batch is committed and walked. **First thing next time the phone is out.**

★ The new `[CDPERF] chats` stamp works and its bound behaves as designed — but `rows=5`, so the
~60-row case queue A1 wanted still needs a seeded list (`ixian:devseed:heavy`).

## 2 · Session N's queue, in order

★ **Item 0: there is no owed loop.** Session L's #46 loop was over Sessions I–K and it is
CLEAN. **This batch has NOT been through one** — three sessions of build have accumulated
since (I·J·K reviewed, L reviewed, M not), so an adversarial loop over **Session M** is the
natural next one, and it should run **before** any further build on the same surfaces. It is
not blocking the walk.

⓪ ⛔ **THE WARM CHAT WEBVIEW IS STILL PARKED — DO NOT START IT (#779).** With the lead
   engineer. If the answer is yes, the build order is fixed by #777: close MAJOR #3 first ·
   wipe FAIL-CLOSED · cap the page's lifetime · a gate row · a #46 loop.
①a ★★ **`docs/perf-chat-open-brief.md`** — READ THIS ONE FIRST. Session M re-measured the
   parallel session's audit and work order in a clean clone and **corrects four headline
   numbers**, one of which changes a risk tier: the parsed payload is **2 917 KB** (their table
   omits the three stylesheets, 422 KB), `spixi.strings.js` is 498 KB not 444, the comment share
   is **33 % not 41 %** and falls very differently per file (chat.html 39 %, not 61 %), and
   **55 pin sources read built artifacts, not the 4 the work order names** — whose four line
   numbers were already stale the day they were written (#773). It also measures the doodle-tile
   SVGO at **−58.2 % but NOT pixel-identical**, and shows `fonts/` is **not** dead. Its §1 names
   the fork neither document does: whether the strip runs in `build-shells.mjs` or as a Release
   packaging step — settle that before any code. Prompt: `docs/next-session-prompt-perf.md`.
   Background: `docs/perf-lean-workorder.md` (re-ranked by RISK
   on Damir's ruling (#782): **Tier 1 is near-zero risk and mostly buys information**
   (per-file parse timing · time one `ixian:painted` round trip · SVGO the doodle tile).
   ⚠ **This session touched `ixian:painted`**: four more shells now send it, and #781 records
   that the send is a cancelled navigation, so the measured painted→present gap includes at
   least one round trip. Time it before reading any number off the new stamps.
① ✅ **DONE (#785)** — the DATA pages present on their own paint, and the chats flush has its
   `[CDPERF]` pair.
② 🟡 **RULED NOT-BUILT (#786)** — the split-screen tray backstop. One stamp when it is wanted.
③ RAM (#764) — measured; the FE lever is demoted (#778). A BE/core row with a number.
④ ✅ `[SCROLL]` — measured, no fix needed.
⑤ **The group-avatar device fact** (the hash is NOT it): photo → find the writer under the
   group address (`FriendList.setAvatar` callers, `writeAvatar`); disc → the row is not
   handing the address, get two addresses from Contact details and run `identityIndex`.
⑥ ✅ Closed by the walk (G1/G2) — it was #768's stale asset set.
⑦ ✅ **BUILT (#783).** ⚠ **Two one-word dials are open and they are Damir's**: the card is
   still called **Canvas** (the spec's word was "Colour"; he said neither) and the empty tile
   is **None** (a new string; "Off" was already translated but names the control). Both are a
   one-line change; a rename is 13 locales, which is why neither was taken on a guess.
   A third: the matrix swatch could go **larger** than 144px — that is the direction the
   corrected strip says is worth trying (§1b ①). A fourth, already moved once on his word:
   the **doodles boost is ×3** (#787) and ×4.5 / ×2 are rendered either side of it.
⑧ ✅ **BUILT (#784).**
⑨ Walk fallout from his eye on the rest.
⑩ The TG-order chat-info rebuild (render round — the harness boots the real shells).
⑪ Pending rulings: URL previews (`docs/url-preview-memo.md`) · privacy wording (#730) ·
   "X left the group" (#215 device check first).
⑫ iOS rows (Session G walk 15–27, 37) when he says Mac.
⑬ **Release hardening stays last** — retire `[LANDTAB]` · `[EXCERPTDIAG]` · `[CDPERF]` (chat +
   appnew + the boot/ctor stamps **+ the new `chats` pair**) · `[SCROLL]` · `[KBTRAY]` ·
   `[WV2]` · `[WEBVIEW]` · the console mirror · `maxLogCount=5` · `SpixiDevCoexist` · the
   store keystore.

## 3 · The render harness (unchanged in shape, one trap added)

`/tmp/j/render/harness.mjs` — Playwright (`playwright-core`, npm) over the pinned chromium
under `/opt/pw-browsers`, `--allow-file-access-from-files`. It boots the BUILT shell
(`Spixi/Resources/Raw/html/<shell>.html`) from `file://` exactly as the device does, 432×900
@2.5, an Android UA (`isMobile`, `hasTouch`), Roboto forced via an init-script `<style>` (apt
`fonts-roboto`), theme via `colorScheme` + `data-theme`. Pushes are driven through
`executeUiCommand(window[name], …base64 args)` — the same wire C# uses. `page.evaluate` for
measurements. PNG out; PIL for sheets. Symlink `node_modules` into the harness dir. **Keep
`page.on('pageerror')`.**

★ **NEW, and it cost an hour:** a comment containing `*/` inside a path (`chromium-*/chrome`)
**closes the block comment** and the file stops parsing. And to dial a property that lives on
a **pseudo-element**, inject a `<style>` — an inline style on the element is inert and will
photograph a strip of identical tiles that looks like data (§1b ①).

★ A **before/after** sheet is cheap and worth it: `git archive HEAD Spixi/Resources/Raw/html`
into a temp dir gives you the pre-batch built shells, and the same harness renders both.

## 4 · Rules and workflow (unchanged, load-bearing)

Clean-clone gates in a Linux container; **say whether the Ixian-Core sibling was present**
when you record smoke · mutate in FULL tar copies, **never `cp -al`** (and rebuild bundle +
shells inside the copy when a component moves) · **bundle BEFORE shells, always** · measure
the closing number AFTER the last suite edit · render on the real shells before Damir
rebuilds · **measure on device before any fix (#215)** · every pin declares `stripCode` or raw
explicitly (#771), and a behavioural pin that stubs the function under test proves nothing ·
a comment stating an invariant the code does not enforce is a defect (#772).

★ **Working through the bridge (this session's route):** the container clone is where the
gates run; the source-only changes are landed on Damir's tree as a tar (`tar --overwrite`;
the bridge cannot delete, so a stray file gets `mv`'d into `_to_delete/`), and the generators
then run in the device VM against his repo. **`smoke-test.mjs` does not finish there** — it
exceeds the VM's 175 s ceiling — so the container run is the authoritative number and his
local run is the pre-commit confirmation. `cs-syntax-check` reports SKIPPED there (no
tree-sitter). And **never `git add -A`**: ~116 files show as modified on CRLF alone.

## 5 · The one thing only Damir can do

**The walk.** `docs/walk-artifact-session-m.html` is the sheet; §2 of the checklist is the
same rows in Markdown. Three of them matter more than the rest:
**A4** (coming back from None restores the level, not just the style — the one regression
this restructure could have shipped), **B3** (kill and reopen: the apps view sticks), and
**C6** (cold start: nothing may appear empty and then fill — the only way present-on-paint
can be wrong).

⚠ **Build with F5, never a bare `dotnet build`.** C# changed this batch.
