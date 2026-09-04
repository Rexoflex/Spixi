# WORK ORDER — LEANING THE CHAT OPEN (build me, then measure me)

**For Session M+. Point the session at this file.** Everything here was measured in the tree at
`f174801e` on 2026-09-04. Nothing has been built. Companion docs: `lean-build-audit.md` (the
wider audit incl. install size), `walk-session-l-results.md` (where the 320 ms came from),
DECISIONS **#764 · #776 · #777 · #779 · #780**.

★ **The rule for this work order: land ONE lever, re-run the capture, then decide the next.**
The instrument already exists (`[CDPERF]`, `docs/f5-checklist-session-l.md`). Do not build four
things on an estimate — every number below is a byte count, and **bytes are not milliseconds.**

---

## 0 · What a chat open actually costs

From walk L, a warm open is **~320 ms**: 60 ms WebView creation · **125 ms parse** · 30 ms push
and drain · 74 ms render → painted · 30 ms → present.

⚠ **The audit undercounted the payload. `chat.html` loads SIX external files, not three:**

| | KB | Notes |
|---|---|---|
| `chat.html` | 658 | 288 KB inline CSS + 353 KB inline JS; **61 % is comments** |
| `spixi.bundle.js` | 1 204 | **49 % comments**; chat destructures **83 of 321 exports** |
| `spixi.strings.js` | 498 | **all 13 locales + pseudo**; one is used |
| `spixi.chat-pattern.css` | 248 | **233 KB of it is ONE declaration** — see L4 |
| `spixi.icons.js` | 124 | 90 icons, every shell |
| `spixi.tokens.css` | 100 | |
| `spixi.base.css` | 74 | 44 KB of it is base64 fonts (2 `@font-face`) |
| **TOTAL PER OPEN** | **2 908** | |

---

## 1 · The levers, ranked by (bytes × certainty ÷ effort)

### L1 · Strip comments and minify — Release only ★ do this first, it is the cheapest
`scripts/build-demo-bundle.mjs` strips **only `import` lines**. No comment stripping, no
whitespace collapse, no identifier minification. **~987 KB of every open is comments.**
- ⚠ **Expect ~15–25 ms, not the ~50 the byte share implies** — a tokenizer skips comments
  cheaply; it is real code and data that costs. This is the cheapest lever, which makes it the
  right **first measurement**, not the biggest win.
- ⚠ **Release only.** The `[WEBVIEW]` mirror reports line numbers into the BUILT shell; that is
  how #663 and half of walk L were traced. Keep the dev-coexist artifact readable.
- ⚠ **Four pins read built files raw** — `smoke-test.mjs:14954`, `:15178`, `:21223`, `:21482`.
  Most of the suite already uses `stripCode`; check these before landing.
  `build-shells --check` is safe (it only needs determinism).

### L2 · Ship one locale, not thirteen — ~400 KB, ~20 ms
`spixi.strings.js` header: *"en-us (786 keys) + 12 starter locales + pseudo marker locale."*
Emit per-locale files, load the active one. A language change already forces a page regenerate
(`dictionaryVersion`), so the reload path exists. **Worth more per byte than L1** — this is real
object data that must be parsed *and allocated*, not skipped.

### L3 · Per-shell bundles — ~400–600 KB, ~25 ms
The bundle exports **321** symbols; `chat.html` destructures **83**. **74 % of what the chat
parses, it never calls.** The destructure gate (`smoke-test.mjs:11444`) already knows every
shell's set, so the data for a per-shell build exists. Most build work, best win-per-byte.

### L4 · ★★ The 233 KB doodle tile — the biggest single asset, and nobody has looked at it
`spixi.chat-pattern.css` is 248 KB. **One declaration — `--chat-pattern-uri-doodles` — is
233 KB.** `matrix` is 12 KB. Every chat open parses all of it, **including users who chose
matrix or none.** Two independent wins:
- **(a) Optimise the SVG.** 233 KB for a repeating tile is very large. Run it through SVGO and
  see; a 50–80 % cut with zero behaviour change is plausible. **Measure before assuming.**
- **(b) Load only the chosen pattern.** The shell already reads the pattern preference in its
  pre-paint ladder, so it could inject the right `<link>`. ⚠ This touches the **#690 three-ladder
  rule** — a pattern resolved after first paint flashes. (a) is free and safe; do it first.

### L5 · Subset the icons — ~100 KB
90 icons ship to every shell. Same argument as L3. (My key-shape parse from outside the build
failed — the generator `scripts/generate-icons.mjs` knows the real shape; start there.)

---

## 2 · The lever that is a MOVE, not a cut — #780

**Pre-warm a blank chat WebView.** Build it and let it **parse** while the user is on the chats
list; hand it the conversation on tap; **destroy it after use exactly as today.**
- **Moves ~95 ms** off the critical path (60 ms create + 35 ms parse after L1–L3).
- **No security trade.** #777 does not apply: the spare never held a conversation, and one
  conversation per document, destroyed after, is unchanged. This is *not* the parked #779.
- Trigger on chat **close** (a second or more of human time before the next tap), plus once at
  app start (the first chat has no spare).
- ⚠ **Do not trade open latency for chats-list jank.** Creating and parsing on the UI thread at
  the moment the user is scrolling can move the stutter rather than remove it. Start on **idle**
  after the close settles, and **measure chats-list frame drops before and after.**
- Fall back to today's path if a chat opens before the spare is ready. No special case.
- ★ **Release the spare on `OnTrimMemory`** — unlike the parked Account pane (#778) it costs
  nothing to drop but the speed-up.

### L6 · ★ NEW — the JS→C# bridge is a FAKE NAVIGATION

`src/bridge/native.js:79`: every message the shell sends C# is `w.location.href = 'ixian:…'`,
which C# then **cancels** (`e.Cancel`). And because navigations cannot overlap, the outbox sends
each subsequent command **on its own macrotask**. That includes **`ixian:painted`, the signal
that gates showing the page** — so the 30 ms "painted → present" contains at least one cancelled
navigation round-trip.

This is the legacy transport, and it is the slowest channel available. Every platform ships a
direct one: `postWebMessage` (Android), `WKScriptMessageHandler` (iOS),
`CoreWebView2.WebMessageReceived` (Windows — in `WindowsWebViewHandler.cs`, a file already
touched). A direct call is microseconds; a cancelled navigation goes through the whole
navigation pipeline.

⚠ **Cost unmeasured, and the change is NOT cheap** — it touches every verb on every platform, so
it is a batch with a #46 loop, not an afternoon. **But measuring it is cheap** (see
investigation 7) and it is the only remaining lever that could take the floor below ~120 ms.

---

## 3 · Investigation — questions I could not settle from outside the build

Each is cheap and each could be a free win. **Answer them with a measurement, not a reading.**

1. **Time each file's parse, don't infer it.** Add a temporary stamp around each `<script>` /
   `<link>` and print per-file cost once. This replaces every estimate in §1 with a fact, and it
   is the single highest-value hour in this work order.
2. **How small does the doodle tile go?** SVGO it, diff the render on the harness. If it halves,
   L4(a) is ~115 KB for an afternoon.
3. **Are `tokens.css` (100 KB) and `base.css` (74 KB) fully used by chat?** Both are loaded whole
   by every shell. Coverage-check them against the chat shell.
4. **Does the WebView code-cache external scripts over `file://`?** If yes, moving chat.html's
   **353 KB of inline JS** to an external file makes it cacheable across opens — potentially
   larger than L1. If no, inlining is correct and this dies. **Unverified; measure.**
5. **Is the 30 ms push/drain worth attacking?** It was 30 ms at 17 messages and **43 ms at 50**
   (`bg=43ms`). The batch transport spec targets it; check whether it is worth the work at
   realistic conversation sizes.
7. **★ Time ONE `ixian:painted` round-trip on the current transport.** Stamp in JS immediately
   before `bridge.send`, stamp in C# on receipt, print the delta. **If it is ~2 ms, drop L6
   forever. If it is ~20 ms, that is the route below 120 ms.** One hour, no change to anything.
6. **Two rAFs before `ixian:painted`** (`chat.html:4873`) ≈ 33 ms of the 74 ms render. Dropping to
   one saves ~16 ms and risks presenting a half-drawn frame. **Damir's eye rules this**, on device,
   not arithmetic.

---

## 4 · DO THE SAFE ONES. Ranked by risk, not by size — Damir, 2026-09-04:
*"focus on the cheap ones and avoid any work that has potential to fuck anything up."*

### TIER 1 — near-zero risk. Do these. ★
| | What | Risk | Buys |
|---|---|---|---|
| **1** | **Investigation 1** — per-file parse timing (temporary stamps) | **none.** Dev-only, removed after | facts instead of every estimate in this doc |
| **2** | **Investigation 7** — time one `ixian:painted` round-trip | **none.** Two stamps | settles L6 forever, either way |
| **3** | **L4(a)** — SVGO the 233 KB doodle tile | **very low.** One asset, visual diff on the harness, revert = restore one file | up to ~115 KB, and it is the largest single asset in the payload |

Tier 1 is mostly **information plus one real win**, and that is the correct shape for a project
about to launch: it costs almost nothing, breaks nothing, and tells you whether any of Tier 2 is
worth doing at all.

### TIER 2 — contained, reversible, gated. Only if Tier 1 says the time is there.
| | What | Risk | Mitigation |
|---|---|---|---|
| **4** | **L2** — one locale per shell | low-medium: a missing string is a blank label | `verify-locales` (786), `pseudo`, `i18n-lint` and `extract-strings --check` all bite |
| **5** | **L1** — strip comments + minify, **Release only** | medium: changes every artifact; **built-file line numbers move** (that is how #663 was traced) and **four pins read built files raw** | keep the dev-coexist build readable; fix `smoke-test.mjs:14954 · :15178 · :21223 · :21482` first |

### TIER 3 — ⛔ DO NOT START without evidence AND a #46 loop
| What | Why it is dangerous |
|---|---|
| **L3 / L5** per-shell bundle and icon subsetting | ★ **the #421 lesson: an export used but not destructured throws inside the handler and the shell boots to a permanent spinner.** Subsetting is precisely how you create that. Biggest win-per-byte left, and the easiest way to ship a dead screen |
| **#780** pre-warm | C# lifecycle + a race + it can **move jank onto the chats list** rather than remove it |
| **L6** direct bridge | every verb, every platform |
| **L4(b)** load only the chosen pattern | touches the pre-paint ladder — **#690**, a late resolve flashes |
| **one rAF** instead of two | trades 16 ms against a possible half-drawn frame — **Damir's eye, on device** |

★ **The through-line: nothing in Tier 1 or 2 can break a screen at runtime.** Everything in
Tier 3 can. Given the launch, do 1–3, measure, and let the numbers argue for anything further.

## 5 · What to expect, honestly

| | |
|---|---|
| today | **320 ms** |
| after L1 + L2 + L3 | **~250–260 ms** |
| \+ #780 pre-warm | **~155–165 ms** |
| \+ one rAF, if Damir's eye allows | ~120 ms |
| \+ direct bridge (L6), **if** investigation 7 says it is worth it | **~100–110 ms** |

**135 ms is the good case, not the expected case.** Promise "comfortably under 200 ms".
For context: under ~100 ms reads as instant, 100–300 ms as responsive, over 300 ms as a wait —
Spixi is currently sitting just inside the third band, which is exactly what Damir felt when he
said "it takes half a second".

★ **We will not match WhatsApp or Telegram and should not aim to.** They are native: no document,
no parse, no compile. Their equivalent of our 60 + 125 ms is roughly zero. The target is the
**band**, not their number. If a real comparison is wanted, it is one slow-motion video away —
240 fps, count frames from finger-contact to first content, ×4.17 ms, same phone, same session.
