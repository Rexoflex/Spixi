# THE CHAT-OPEN BRIEF — verified numbers, and what to build first (2026-09-04)

**Read this before `docs/perf-lean-workorder.md` or `docs/lean-build-audit.md`.** Those two are
a parallel session's audit and work order from the same day; the thinking in them is sound and
the risk ranking (#782) is Damir's. **This file re-measured their headline numbers in a clean
container clone and four of them are wrong — one of them by enough to change a risk tier.**
Where this file and those two disagree, this one was measured at `3020ecd3` + the uncommitted
Session M batch and says so.

**Status: MEASURED, NOTHING BUILT.** No lever below has been started.

---

## 0 · What the phone actually parses on a chat open

Measured on the built artifacts, not estimated. Comment shares computed with a JS/CSS/HTML
comment stripper that respects strings, template literals and regex literals (`/tmp` script —
re-derivable in ten lines; the method matters more than the file).

| File | size | comments | +indent | share |
|---|---|---|---|---|
| `chat.html` | 658 KB | 227 KB | 258 KB | 39 % |
| `spixi.bundle.js` | 1 213 KB | 546 KB | 617 KB | 51 % |
| `spixi.strings.js` | 498 KB | 1 KB | 1 KB | 0 % |
| `spixi.icons.js` | 124 KB | 0 KB | 0 KB | 1 % |
| `spixi.tokens.css` | 100 KB | **67 KB** | 69 KB | **69 %** |
| `spixi.base.css` | 74 KB | 19 KB | 19 KB | 26 % |
| `spixi.chat-pattern.css` | 248 KB | 1 KB | 2 KB | 1 % |
| **TOTAL** | **2 917 KB** | **865 KB** | **969 KB** | **33 %** |

### The four corrections

★ **① The payload is 2 917 KB, not 2 413 KB.** The audit's table counts four files and omits
the **three stylesheets the chat also parses on every open — 422 KB**, one of which
(`chat-pattern.css`, 248 KB) is the subject of its own biggest single-asset lever. Nothing is
wrong with the levers; the denominator was.

★ **② `spixi.strings.js` is 498 KB, not 444 KB** — checked at `f174801e`, the commit the audit
names, where it was already 510 098 bytes. So **A2 (one locale) is worth ~12 % more than
stated**, not less.

★ **③ The comment share is 33 %, not 41 %, and it is distributed differently.** `chat.html` is
**39 %**, not the 61 % claimed — the audit was ~137 KB high on that file — while the bundle is
**51 %**, slightly higher than claimed. The absolute figure (~969 KB) is very close to their
987 KB; the per-file split is not, and the per-file split is what decides where to spend.

★ **④ NEW, and nobody had looked: `tokens.css` is 69 % comments — 67 KB of 100 KB.** The
highest ratio in the payload by a wide margin, in a file every shell loads. CSS comments carry
none of the line-number risk that makes the JS strip delicate (the `[WEBVIEW]` mirror reports
**JS** lines), so this is the safest byte in the whole audit.

⚠ **And one of ours, stated because it is the same policy tension:** the Session M batch that
just landed added **+9.4 KB to `spixi.bundle.js`** — all of it comments, written under the house
rule that every fix names its defect and its reversal. That rule is worth its cost in the repo
and it is exactly what §A1 is about. It is not an argument against the rule; it is the argument
for stripping at the build.

---

## 1 · ★★ THE FORK NEITHER DOCUMENT NAMES, AND IT DECIDES L1

The work order rates L1 (strip comments, Release only) as **Tier 2, "medium risk"**, with the
mitigation *"four pins read built files raw — fix `smoke-test.mjs:14954 · :15178 · :21223 ·
:21482` first"*.

**Both halves of that need replacing.**

★ **It is not four pins. It is 55.** Measured: **75 lines** of `smoke-test.mjs` read something
under `Spixi/Resources/Raw/html`, of which **55 bind a built artifact to a variable that pins
then assert against** (6 more are existence checks). `stripCode` has 76 call sites, so many are
normalised — but the exposure to check is 55 sources, not four, and "check 55 pins" is a
different-sized job from "check four".

★ **And the four line numbers are already stale** — Session M shifted them the same day.
`:14954` now lands on an unrelated W6 pin and `:21223` is a blank line. This is #772/#773 in its
own habitat: *file:line in a comment is a searchable anchor, never a number.* The real anchors,
as quotes:

```
const builtChat = readFileSync(join(root, 'Spixi/Resources/Raw/html/chat.html'), 'utf8');   ← twice
const builtRaw = rdF('Spixi/Resources/Raw/html/spixi.strings.js');
const builtChat = rdF('Spixi/Resources/Raw/html/chat.html');                                 ← twice more
```

### The fork itself

**Where does the strip run?** The two answers have opposite consequences and the documents
assume the first without saying so:

**(a) Inside `build-shells.mjs`** — the committed artifacts under `Resources/Raw/html` become
stripped. Then: all 55 pin sources are reading stripped files, `build-shells --check` still
works (it only needs determinism), and the strip is visible in review. **Cost:** a colossal
one-time diff, every built-file pin re-verified, and the readable artifact is gone from the
repo — which is what the `[WEBVIEW]` line-number tracing uses.

**(b) As a packaging step** (MSBuild, Release only) — the committed artifacts are untouched,
**all 55 pins are unaffected, and the diff is zero.** **Cost, and it is the real one:**
`build-shells --check` then proves that what is *committed* is a fresh build of source, but no
longer that what *ships* is what was reviewed — and that guarantee is the entire justification
for committing 83 549 lines of build output (§C of the audit). The strip would need its own
gate: a check that the stripped artifact is a comment-strip of the committed one and differs in
nothing else.

★ **(b) is almost certainly right** — it keeps every pin, keeps the readable artifact for
tracing, and turns a Tier-2 item into a Tier-1-shaped one — **but only if that second gate is
written in the same batch.** Without it the strip is an unreviewed transform sitting between
review and ship, which is a worse trade than the 15–25 ms it buys. Decide this before writing
any code; it is the whole shape of the work.

---

## 2 · The doodle tile — measured, and it is not free

The work order's L4(a): *"Run it through SVGO and see; a 50–80 % cut with zero behaviour change
is plausible. Measure before assuming."* Measured:

| config | size | vs original | pixels changed | max delta |
|---|---|---|---|---|
| original | 231 KB | — | — | — |
| SVGO defaults | **96 KB** | **−58.2 %** | 2.53 % | 87/255 |
| precision 5, no `mergePaths`, no arcs | 102 KB | −55.8 % | 0.95 % | 87/255 |
| lossless (no `convertPathData`) | 231 KB | **−0 %** | 0 | 0 |

★ **The cut is real and it is 58 %, ~135 KB.** But **"zero behaviour change" is not available**:
the file is essentially nothing but path data, so *every* byte of the saving comes from path
optimisation, and the lossless config saves exactly nothing. Rendered at 3× the size the chat
paints, the default output differs on 2.5 % of pixels with a worst-case channel delta of 87.

★ **What that means in the chat, and why it is still probably fine:** the tile is a **mask
painted at alpha 0.07**, so a worst-case 87/255 difference reaches the screen as **~6/255** on
0.4 % of pixels. Almost certainly invisible — but "almost certainly invisible" is a claim for
**Damir's eye on the harness**, not for a build script, and it must be presented to him as a
change to the picture rather than as a free win. Render the real chat canvas at both, both
themes, and let him rule (the Session M harness does this — handoff §3).

⚠ The generator is `scripts/generate-chat-pattern.mjs` and it emits a **drift guard** line
(`doodles-natural: 320x557 scale: 0.6875`) that a pin reads. Optimising the source SVG must keep
the natural size intact or that guard fires — which is the guard doing its job.

---

## 3 · `fonts/` IS dead — and so is 245 KB of `css/`. ⚠ This section was WRONG in round 1.

★★ **Round 1 of this brief "corrected" the audit's B1 and the correction was the error.** It
claimed `fonts/` was reached through `libs/fontawesome/css/*.min.css`. It is not. A grep for
`fonts/` matched **`../webfonts/`** inside FontAwesome's own CSS — a substring false positive.
FontAwesome references `../webfonts/fa-solid-900.woff2`; it never touches `fonts/`.
**The audit's B1 was right. Damir caught it by knowing the app** ("those were legacy icons we
don't use them any more"), which is the only reason it did not reach a session as a fact.
The lesson is the same one §1 is about: *a grep is not a reference graph.*

### What is actually dead, verified by loading, not by grepping

| | bytes | why |
|---|---|---|
| `fonts/` — 3 Inter `woff2` | 339 880 | referenced **only** by the dead CSS below. The redesign carries its own Inter **embedded** in `spixi.base.css` (`build-shells --check` says so: *"fonts are EMBEDDED in the compared css"*) |
| `css/spixiui-dark.css` | 109 881 | loaded by **0** of 26 html |
| `css/spixiui-light.css` | 109 306 | loaded by **0** |
| `css/spixi-login.css` | 13 485 | loaded by **0** |
| `css/spixiui-intro.css` | 8 523 | loaded by **0** |
| `css/empty-spixiui-{dark,light}.css` | 4 212 | loaded by **0** |
| `apps.html` | 3 436 | **`AppsPage` has ZERO references** in any `.cs` or `.xaml` — the class exists, nothing constructs it |
| `address.html` | 3 884 | **no `loadPage(webView, "address.html")` call exists** |
| **free today** | **≈579 KB** | no page retirement, no redesign work, nothing to break |

★ **6 of the 8 files in `css/` are loaded by nothing.** Only `bootstrap.min.css` (232 KB) and
`normalize.css` (6 KB) are live, and only through the legacy pages.

### ⚠ But FontAwesome is NOT free, and this is the part that will surprise you

`libs/fontawesome` (344 KB) is loaded by four legacy pages, **two of which are genuinely live
and genuinely render its glyphs**:

| page | pushed by | glyphs it renders |
|---|---|---|
| `settings_lock.html` | `SetLockPage` (1 call site) | `fa-arrow-left` · `fa-info-circle` · `fa-lock` |
| `wallet_recipient.html` | `WalletRecipientPage` (3 call sites) | `fa-arrow-left` · `fa-check-square` · `fa-image` · `fa-pencil-alt` · `fa-plus` · `fa-search` · `fa-square` |

So *"we don't use FontAwesome any more"* is **true of the redesign and false of those two
screens** — they are legacy screens the redesign has not replaced, and #640 kept
`wallet_recipient.html` deliberately ("WalletRecipientPage is still pushed by AppDetailsPage and
HomePage and is not a money screen"). Delete `libs/` today and both screens lose their icons.

★★ **Which points at a contained job worth more than the rest of §B put together: swap ten
glyphs.** Those two pages need seven distinct FontAwesome icons between them, and the redesign
already ships every one of them in `spixi.icons.js` (arrow-left, lock, info, image, pencil,
plus, search, check). Replace them and the **whole legacy chain unblocks — `libs/` 344 KB +
`bootstrap.min.css` 232 KB + `normalize.css` + most of `js/` 696 KB ≈ 1.3 MB** — without
redesigning either screen. It is a small, bounded, visual change on two rarely-seen pages, and
it is the cheapest large win in the whole audit. **Not started; flagged here as the shape.**

⚠ Check `js/` before assuming it goes with them: neither live page calls `$(` at all, so jQuery
may already be inert there, but `js/spixi.js` is loaded by both and was not read for this brief.

## 4 · What the next session should actually do

Damir's ruling stands (#782): *"focus on the cheap ones and avoid any work that has potential to
fuck anything up."* This brief does not re-rank his tiers; it corrects what they cost.

**Do, in this order:**

1. **Investigation 1 — per-file parse timing.** Still the highest-value hour in the work order,
   and now more so: §0 shows the comment share is distributed differently than assumed, so every
   per-lever estimate downstream is resting on a byte-share model the corrected table already
   contradicts. Temporary stamps, removed after. **No estimate in either document survives
   contact with this measurement — take it first.**
2. **Investigation 7 — time one `ixian:painted` round trip.** Two stamps, settles L6 forever
   either way. ⚠ **Session M made this more urgent and slightly different**: four more shells now
   send `ixian:painted` (#785), and #781 records that the send is a cancelled navigation, so the
   measured painted→present gap on *five* surfaces now contains at least one round trip. Time it
   before reading a number off the new `[CDPERF]` stamps.
3. **`tokens.css` comment strip** — correction ④. 67 KB, CSS only, no JS line numbers move. If
   the §1 fork lands on (b), this is the cheapest real byte in the audit and a clean first
   exercise of the packaging step.
4. **L4(a) the doodle tile**, presented to Damir as §2 describes: 135 KB for a picture that
   changes by ~6/255 at chat alpha. His eye, on the harness, before it lands.

**Do not start** without the §1 fork settled and its second gate designed: L1 in any form. And
nothing in Tier 3 — the #421 lesson (an export used but not destructured boots the shell to a
permanent spinner) makes per-shell subsetting the easiest way to ship a dead screen, and the
project is close to launch.

**Expect,** honestly: the work order's own corrected arithmetic (comments 15–25 ms, one locale
~20 ms, per-shell ~25 ms) is the right shape and it is still a model. 320 → ~250–260 ms from §A
is a reasonable hope; **135 ms is the good case, not the expected one.** Promise "comfortably
under 200 ms" and let the instrument argue for the rest.

---

## 5 · House rules that bite here specifically

- **Clean-clone gates in a Linux container**, Ixian-Core sibling at `097341a`, and **say whether
  it was present** when recording smoke. The Session M baseline is
  `bundle 321 · shells 18 · smoke BASELINE OK 4090 / the 3 known (#136 · M5 · B3)`.
- **Bundle BEFORE shells, always.** Mutate in **full tar copies**, never `cp -al`.
- **Every pin declares `stripCode` or raw explicitly (#771)** — and this work is *about* what
  the built files contain, so that declaration stops being bookkeeping and becomes the subject.
- **`file:line` is a searchable anchor, never a number (#772/#773).** The work order broke this
  the same day it was written; §1 above is the repair.
- **Measure on device before any fix (#215).** Every number in this brief is a container
  measurement of the artifact, not of the phone. The phone is what decides.
