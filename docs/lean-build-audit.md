# LEAN BUILD AUDIT — where the bytes go, and what can be cut (2026-09-04)

**Status: MEASURED, NOTHING BUILT.** Written for Session M+ after Damir asked "where else can we
save, we need to be super lean", and after the lead dev's observation that git shows hundreds of
thousands of lines. Every number below was measured in the tree at `f174801e`; none is estimated.

Two separate problems, and they want different fixes:
- **§A — what the phone PARSES on every chat open: 2 413 KB.** This is the ~125 ms parse that
  dominates the chat open (walk L, DECISIONS #776).
- **§B — what the APP SHIPS: 15 MB in `Resources/Raw/html`.** This is install size, not speed.

---

## §A · The 2 413 KB parsed on every chat open

Every chat open parses four files. `dcl` = 125 ms on Damir's device.

| File | Size | Comments + indentation |
|---|---|---|
| `chat.html` | 651 KB | **395 KB (61 %)** |
| `spixi.bundle.js` | 1 193 KB | **590 KB (49 %)** |
| `spixi.strings.js` | 444 KB | 2 KB |
| `spixi.icons.js` | 125 KB | 1 KB |
| **total** | **2 413 KB** | **987 KB (41 %)** |

### A1 · ★ 987 KB of every open is COMMENTS. Nothing is minified.

`scripts/build-demo-bundle.mjs` strips **exactly one thing — `import` lines.** No comment
stripping, no whitespace collapse, no identifier minification. So the device parses the project's
entire commentary on every chat open.

That commentary is not waste in the repo — the house rule that every fix names its defect, what
it prevents and its reversal is what made the #46 loop possible, and #772 makes a lying comment a
defect. **It was simply never meant to reach the device.**

- **Saves ~987 KB ≈ 40 % of the parse ≈ ~50 ms of a 320 ms open.**
- Build-side only. Zero behaviour change.
- ⚠ **Strip in RELEASE only; keep comments in the dev-coexist build.** The `[WEBVIEW]` console
  mirror reports line numbers into the BUILT shell — that is how #663 and half of walk L's
  findings were traced. Stripping moves those numbers, so keep one debuggable artifact.
- ⚠ **A few pins read built files raw** (`builtChat` at `smoke-test.mjs:14954` and `:15178`,
  `builtRaw` at `:21223`, and the per-shell read at `:21482`). Most already use `stripCode`;
  these need checking before this lands. `build-shells --check` itself is safe — it only needs
  the output to be deterministic.

### A2 · All thirteen locales ship in every shell

`spixi.strings.js` is generated as *"en-us (786 keys) + 12 starter locales + pseudo marker
locale"* — 444 KB, of which one language is used. **Saves ~400 KB.** Emit per-locale files and
load the active one; a language change already forces a page regenerate (`dictionaryVersion`),
so the reload path exists.

### A3 · The chat shell parses 321 exports and calls 83

Measured: the bundle exports **321** symbols; `chat.html` destructures **83**. **74 % of what
the chat parses, it never calls** — wallet-send, scan, launch, settings screens, apps.
**Saves ~400–600 KB.** The destructure gate (`smoke-test.mjs:11444`) already knows exactly which
shell uses what, so the data for a per-shell build exists.

### A4 · Icons ship whole

`spixi.icons.js` is 125 KB of every icon in the app, in every shell. Same subsetting argument.

### A5 · Inline vs external — worth measuring, not asserting

353 KB of `chat.html` is **inline** `<script>`. Inline scripts are not V8-code-cached the way
external files can be, so moving the shell's own JS external *might* let it be cached across
opens. **Unverified on Android WebView over `file://`** — measure before believing it.

### What §A adds up to

| Lever | Saves | Effort |
|---|---|---|
| A1 strip comments (Release) | ~987 KB | one build pass |
| A2 one locale | ~400 KB | build-side |
| A3 per-shell bundle | ~400–600 KB | needs a per-shell build |
| A4 per-shell icons | ~100 KB | with A3 |

**2 413 KB → roughly 700 KB**, i.e. a parse near 35 ms instead of 125 — **~90 ms off a 320 ms
open, with no architecture change and no security trade.** That is comparable to the parked warm
WebView (#779, ~185 ms) and carries none of its risk, so **it should probably go first.**

---

## §B · The 15 MB that ships

`Resources/Raw/html` is 15 MB. The shells and scripts are 5 MB of it; the rest is assets.

| Folder | Size | Files | Referenced by |
|---|---|---|---|
| `img/` | 4.9 MB | 74 | 10 of 26 html files |
| `images/` | 2.5 MB | 15 | 3 of 26 |
| `js/` | 696 KB | 8 | 7 of 26 |
| `css/` | 492 KB | 8 | 5 of 26 |
| `libs/` | 344 KB | 7 | 4 of 26 |
| `fonts/` | 344 KB | 3 | **0 of 26** |

### B1 · ★ `fonts/` is referenced by NO html file — 344 KB

`build-shells --check` states it: *"fonts are EMBEDDED in the compared css"*. So the loose font
files appear to be shipping for nothing. **Verify against the C# side before deleting** (a native
path could load them), then remove.

### B2 · TWO image folders, 7.4 MB

`img/` (74 files, legacy naming) and `images/` (15 files, the redesign's). 7.4 MB is **half the
payload**. Nobody has audited the overlap. The job: build the referenced set from all 26 html
files plus the C# sources, delete the rest, and re-encode what survives (a PNG that could be a
WebP or an inline SVG at a fraction of the size).

### B3 · Legacy assets and three legacy pages

`js/` + `css/` + `libs/` = 1.5 MB serving the **three pages `build-shells` does not generate** —
`address.html`, `settings_lock.html`, `wallet_recipient.html`. When those three retire, ~1.5 MB
goes with them. **Do not delete them first** — check every C# `loadPage` call site; a page nobody
opens is not the same as a page nothing references.

---

## §C · The lead dev's observation — "hundreds of thousands of lines in git"

He is right about the count and it is worth explaining precisely, because the obvious reading is
wrong:

| | lines |
|---|---|
| hand-written `src/` + `scripts/` | 126 200 |
| hand-written C# | 44 245 |
| **GENERATED** `Resources/Raw/html/*` | **83 549** |
| **GENERATED** `src/demo/spixi.iife.js` | **25 905** |

**39 % of tracked lines are build output, committed on purpose.** They are committed so
`build-shells --check` can prove the shipped artifact is a fresh build of source — the gate that
caught a stripped feature in a built shell during the #46 loop. It is a real trade: a large diff
in exchange for a byte-level guarantee that what ships is what was reviewed.

The rest is genuinely hand-written, and it is comment-dense by policy — see §A1, where that same
policy is costing 987 KB per chat open. **The two observations are the same fact seen from two
ends**, which is why they are in one document.

⚠ **What is NOT true:** this is not 300 000 lines of hand-written app. If the line count is the
concern rather than the payload, the cheapest answer is a `.gitattributes` marking the generated
paths `linguist-generated` so they collapse in diffs — cosmetic, no build change, no risk.

---

## §D · The pre-warmed blank chat view (#780) — the lever that is not in §A

Not a size reduction: **a move.** Build a blank chat WebView and let it parse while the user is on
the chats list, hand it the conversation on tap, and **destroy it after use exactly as today**.

- **Moves ~95 ms** off the critical path (60 ms create + 35 ms parse, post-lean-build).
- **No security trade (#777 does not apply):** the spare never held a conversation, so there is
  nothing to leak; one conversation per document, destroyed after, unchanged.
- Trigger: **on chat CLOSE**, so the work elapses while the user scans the list. Plus once at app
  start, since the first chat has no spare.
- ⚠ **Do not trade open latency for chats-list jank.** Creating and parsing on the UI thread at
  the moment the user is scrolling can move the stutter rather than remove it. Start on IDLE after
  the close settles, and **measure chats-list frame drops before and after.**
- Fall back to today's path if a chat is opened before the spare is ready. No special case.
- ★ **Release the spare under memory pressure.** Unlike the parked Account pane (#778) it costs
  nothing to drop but the speed-up, so it is the right answer to `OnTrimMemory`.

## Recommended order

⚠ **First, a correction to §A's arithmetic.** The per-lever times there assumed parse cost scales
with BYTES. It does not, evenly: a tokenizer SKIPS comments cheaply, while real code must be
parsed *and compiled* and locale data parsed *and allocated*. So the honest split is **comments
~15–25 ms** (not the ~50 the byte share implies), **one locale ~20 ms**, **per-shell bundle
~25 ms** — the two smaller-looking levers are worth more per byte than the big one.
**Expect 320 → ~250–260 ms from §A**, then ~155–165 with §D. **135 ms is the good case, not the
expected one.** Land ONE lever, re-run the `[CDPERF]` capture, and let the measurement decide the
rest — the instrument already exists.

1. **A1** — strip comments in Release. Cheapest (one build pass), so it is the right first
   measurement even though it is not the biggest win.
2. **A2** — one locale per shell.
3. **B1/B2** — the dead fonts and the image audit. Install size, not speed, but 7.7 MB is a lot.
4. **A3/A4** — per-shell bundles. Best win-per-byte left, most build work.
5. **A5** — measure the code-cache question before acting on it.

Each lands with the closing numbers recorded, `build-shells --check` green, and — because A1 and
A3 change every shipped artifact at once — **a #46 loop before it is called done.**
