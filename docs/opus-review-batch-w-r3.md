# Opus #46 loop — Batch W · ROUND 3 (fresh verifier over the ROUND-2 fixes)

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.**

**Scope.** The seven round-2 fixes (R2-1 … R2-7) plus the round-2 NITs that were applied.
One question per fix: *does it hold, and did it break something else?* Tree = the
uncommitted delta on `42e72109`, **untouched**: no file under `/root/Spixi` was modified
except this report.

**Method.** Executed, not reasoned.
- A `cp` twin of the repo at `/tmp/w3` (`node_modules` symlinked) for every mutation;
  **seven full-suite runs**, each restoring the twin first.
- Two throwaway jsdom probes (`/tmp/probe3.mjs`, run from the twin) driving the live
  components out of `src/demo/wallet.html`.
- `node scripts/smoke-test.mjs` on the **real tree**, read-only: `BASELINE OK — 2901 pass /
  the 3 KNOWN pre-existers (#136 · M5 · B3)` — unchanged.
- Sources read at the point of use: `SingleChatPage.xaml.cs` (tip case, `addPaymentRequest`),
  `Ixian-Core/Utils/IxiNumber.cs`, `overlay.js`, `contact-row.js`, `wallet-receive.js`,
  `SpixiContentPage.cs`, and the whole `git diff -- Spixi/` C# delta.

---

## Findings

| # | Sev | file:line | Failing scenario (executed) | Fix |
|---|---|---|---|---|
| **R3-1** | **MAJOR (pin, not product)** | `scripts/smoke-test.mjs:14041-14047` | **The R2-3 pin is VACUOUS and TIMING-FRAGILE: both mandated mutations leave it GREEN, and one of them demonstrably restores the dead tap R2-3 fixed.** Full-suite runs in the twin: `isOpen() { return true; }` → **R2-3 PASSES** (and M4 passes); `isOpen() { return sheet.isConnected; }` → **R2-3 PASSES**. The second mutation is the pre-R2-3 behaviour: the probe measures `30 ms after re-tap: total=1, open=0, sameNodeAsFirst=[true]` — no new sheet, exactly the dead tap. On the unmutated tree the same probe gives `total=2, open=1, sameNodeAsFirst=[true,false]`, so **the FIX itself is correct**; only its oracle is not. Two causes, both measured. (a) The oracle counts `.c-sendreview` under a `[data-open]` sheet **30 ms** after the tap, while a new sheet needs TWO rAFs (~32 ms in jsdom) to gain `data-open` — inserting two `console.log` statements before the re-tap turns the pin **RED on the unmutated tree** (`DIAG total=2 open=0`). (b) A **dismissed** sheet can RE-ACQUIRE `data-open`: `openOverlay` sets it from a two-rAF callback with no "still on the stack" check (`overlay.js:116-119`), so the first sheet's pending pair fires after `dismissOverlay` deleted the attribute (`overlay.js:136-137`) — measured under mutation (a): `postcancel open=0` then `open=1` on the same node. The pin therefore reads "one open sheet" from a **dying** sheet. | Assert node identity, which is what the probe measures and what R2-3 is about: after Cancel + an immediate re-tap, `d.querySelectorAll('.c-sendreview').length === 2` **and** the last node `!==` the first. Keep an open-state assertion only after a ≥60 ms settle. Separately, guard the enter-transition setter in `overlay.js` (`if (!stack.some((s) => s.el === el)) return;` inside the rAF) so a sheet dismissed within two frames does not animate in while it leaves. |
| **R3-2** | MINOR | `src/components/wallet-send.js:498-506` (`_applySendQuote`), also `:107` and `:402` | **R2-2 was applied to ONE of two symmetrical consumers — the same shape as R2-1.** `openPaymentReview` now gates with the strict `safeUnits`; `createWalletSend` still calls **raw `toUnits`** on `fee`, `balance` and `max` straight from the bridge echo. Raw `toUnits` does not coerce — it **throws** (`BigInt('abc')`, `BigInt('1e3')`), and the compose has **no answer timeout** (`quoteTimer` at `:109/:123` is the ask debounce, not a no-answer backstop), so a throwing echo leaves the compose on "Calculating network fee…" with ✕ as the only exit. That is the wedge class R2-4(a) closed one screen away. Not live (C# pushes `IxiNumber.ToString()`), exactly as R2-2 stated for its own half. | Use the same strict `safeUnits` in `_applySendQuote` (and at `:107`/`:402`); a rejected value leaves `feeU` null, which is already the honest "no quote → no review" state (`valid():452`). |
| **R3-3** | MINOR | `src/components/wallet-send.js:500` | The **string-exact** half of the R2-4 fix landed only in the sheet (`:743`, `String(qAddr) !== String(r.address \|\| '')`). The compose still compares raw: `state.recipient && state.recipient.address === qAddr`. Harmless **only because** R2-4 made an address-less pick impossible, so `state.recipient.address` can no longer be `undefined` against the string `"undefined"`. The guarantee now rests on another fix rather than on this line. | One-word change: `String(state.recipient.address) === String(qAddr)`. |
| n1 | NIT | `scripts/smoke-test.mjs:13795` | The gate's own docblock still says *"Every OTHER export of a CSS-owning module must be in PURE, or the gate fails loudly"*. **`GATE_PURE` was DELETED by R2-5.** The paragraph documents a mechanism that no longer exists, inside the gate it documents. |
| n2 | NIT | `docs/security-handover-gate.md` (Batch W section, opening line) | The section opens *"No new `ixian:` verb. No new push. No new preference. **No new log line.**"* — and its own table then records **"New log line \| INTRODUCED"** and a new `payRequestResult` status value, and the closing paragraph correctly says *"ONE fixed-text log line"*. The opening sentence contradicts the table. Correct the sentence, not the table (the table is right). |
| n3 | NIT | `src/components/contact-row.js:75` | r2's n4 **persists**: an address-less blocked row still shows an EMPTY sub-line (`rowHasNick` true → `truncateAddressMiddle(undefined)` = `''`), so a row that is disabled says nothing about why. r2 ruled it inherited from `contacts-shell.js:143-146`; restated here so it is not lost when the directory gets its shared line of copy. |
| n4 | NIT | `scripts/smoke-test.mjs:14002` | **Nothing in the suite asserts the pending badge is a real badge.** Gate mutation (c) replaced `createBadge({...})` in `contact-row.js` with a bare `document.createElement('span')`: the gate stayed silent (correct — no shell depends on that single edge for `badge.css`) and the behavioural pin stayed GREEN, because the pin tests `.c-contact-row__badge`, a class the *caller* adds. The one pin that would have caught it (`M5: … pending badge in the picker`) is one of the 3 KNOWN pre-existers, so it is red either way. |
| n5 | NIT (harness) | — | A `cp` twin **without `.git`** runs **2900**, the real tree **2901**: one assertion depends on something outside the copied set. Not a regression — recorded so the next verifier does not read a twin baseline as a loss. |

---

## VERIFIED CLEAN — checked, and the round-2 fix holds

**R2-1 — all three money backstops are 125 000, and the tip path is correctly NOT one of
them.** `home.html:2227`, `chat.html:2728`, `chat.html:2802`; identical copy, each nulls its
controller first. The only other four/five-digit timers in the shells are non-money (typing
5 000, load safety 5 000, the delete latch 10 000, the load-probe comparison `> 30000` at
`chat.html:3183` — a comparison, not a backstop, and the R2-1 pin's `!/\}, 30000\);/` cannot
false-match it). **`tipWait` at `chat.html:2622` stays 12 s, and that is right, not a drift:**
the C# tip case (`SingleChatPage.xaml.cs:1400-1640`) contains **no `await`, no
`DisplayAlert`, no `confirmAndAuth`** and never takes `acquireConfirm` — D-10 deleted its
native alert — so it answers `sendTipResult` synchronously on every branch. There is no
120 s dialog window to outlast. Its copy is hedged the same way ("may not have been sent").

**R2-2 — the strict regex accepts every amount C# can actually send.**
`IxiNumber.ToString()` (`Ixian-Core/Utils/IxiNumber.cs:104-127`) builds `{p1}.{secondPart}`
with `PadLeft(num_decimals, '0')` from `BigInteger.DivRem` — **never exponent form, never
grouped, culture-independent**. So `"12.50000000"` passes `^\d+(\.\d+)?$`; `1.5E-05` is not
reachable. The only non-matching C# outputs are `"ERR"` (the ToString catch) and the `"?"`
placeholder (`SingleChatPage.xaml.cs:2115`, no transaction yet) — both of which **should**
fail the gate. `fromUnits()` (`wallet-send.js:65-71`) always emits `0`, `1`, `0.001`-shaped
strings, so the compose's `fee: fromUnits(feeAtOpen)` is always accepted. **The null-return
path is a belt, not a live path:** `canSheet` (`chat.html:1868-1870`) applies the identical
regex plus `[1-9]` before the sheet can be asked, so `openPaymentReview` cannot return null
there; and when it does, `renderLog()` re-renders the card and releases the Pay `oneShot`
latch, so the user gets an armed Pay back rather than an inert card — and every non-numeric
amount keeps the direct `ixian:payRequest` verb, which is C#'s own review. Acceptable.
**The R2-2 pin is mutation-honest:** reverting `safeUnits` to the coercing form turns it RED.

**R2-3 — the behaviour is right (only the pin is not, see R3-1).** Probe on the real tree:
double-tap → 1 sheet; Cancel → `data-open` dropped; re-tap at +30 ms → a **second**
`.c-sendreview`, open, distinct node; at +500 ms exactly one survives.

**R2-4 — blocked in both forms, rendered not dropped, and refused at the sink.**
`contact-row.js:60` `const blocked = !c.address || (select === 'checkbox' && c.pending)`;
the click handler is withheld (`:99`) and `aria-checked` is forced false. `wallet-receive.js:341`
`if (b.disabled) { rows.append(b); continue; }` — **the row is appended, then skipped**, so
the Send/Receive list still shows it, disabled, exactly as intended. `pick()` refuses a
recipient with no address, so no `feeQuery:undefined` and no blank-address review can be
composed even programmatically.

**The gate is mutation-honest for the R2-5/R2-6 rewrite** (three planted defects, three
caught, each naming itself):
- drop the `chat.html` → `settings-screens` ALLOW entry → **RED**:
  `chat.html → settings-screens.css (patternLevelVar, readPatternLevel)` — the strict direct
  rule really has no name heuristic;
- delete `settings.html:53` (`search-field.css`) → **RED**:
  `settings.html → search-field.css (createSettingsDownloads→settings-app)` — the R2-6
  cross-module closure is what reports it;
- append a later `.c-contacts__row { min-height: 60px; }` to `contacts-shell.css` → the
  **W-j drift fence goes RED** (cascade-aware, as claimed);
- remove the `createBadge(` call from `contact-row.js` → gate **silent**, correctly: no shell
  relies on that single edge for its `badge.css` link (observation only — see n4).

**The C# delta compiles by eye.** `ExtendedAddress` needs no new using — `using IXICore;` is
at `HomePage.xaml.cs:1` and the type is already used at `:610`, `:1131`, `:1429`.
`displaySpixiAlert(title, text, ok)` binds the **three-argument** overload
(`SpixiContentPage.cs:2557`, returns `Task`) and is called un-awaited from a non-async lambda
— identical to the existing `:1133`, `:1139`, `:1151`; the CS4014 warning class is
pre-existing in this file and the lambda cannot be awaited anyway. `Device.RuntimePlatform`
/ `Device.WinUI` in `SPayments.paymentAuthSupported()` is in scope: the same file already
uses it at `:400` (the `Device` obsoletion warning is pre-existing, not introduced). The
payload split handles `addr`, `addr:ixi` and `addr:send:amount`; a payload that *starts*
with `:` validates the whole string and is rejected. The new `Logging.warn` carries a fixed
sentence with no address and no payload. The three `"cancel"` → `"gone"` edits are literal
string changes on existing `sendUiCommand` calls, and the shell handles `gone` in both
branches (pinned at `smoke-test.mjs:14270`).

**Nothing the round-2 fixes touched has regressed.** Real-tree baseline **2901 / the 3 KNOWN**,
byte-identical to the figure recorded in the verdict document. No new `localStorage`, `fetch(`
or `innerHTML` in the round-2 delta; the money path still emits intent only and C# still signs.

---

**VERDICT: 1 MAJOR · 2 MINOR · 5 NIT. Every round-2 FIX holds behaviourally, and none of them
broke another path.** The single MAJOR is not in the product: it is that **R2-3 is not
actually pinned** — its test passes with the guard removed and fails when two log statements
are added, so the suite would not notice the dead tap coming back. Fix the oracle (node
identity, not `data-open`) before commit; R3-2 and R3-3 are the two remaining halves of
"applied to one of two symmetrical callers", the pattern this loop has now hit three times.
