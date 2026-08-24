# Opus #46 loop r1 — Auditor C: shells · settings QR reuse · every touched pin

Scope: the Batch E (d) Account-QR reuse end to end, the dev-HUD rider, i18n, and the
vacuous-pin hunt over every pin this batch touched.
Method: read the delta, exercise the reuse in jsdom against the shipped bundle, then
**mutate before believing** (#520/#496 — a rebased pin is a NEW pin).

**Result: 2 MAJOR · 6 MINOR · 3 NIT. Five mutations run, five survived a fully green
suite.** No live user-facing defect was found behind any of them — every finding is a
guard that does not guard. The reuse itself works end to end.

Baseline for every run below: `BASELINE OK — 3013 pass / the 3 KNOWN pre-existers
(#136 · M5 · B3)`.

---

## 1. Findings

| ID | Sev | File:line | Claim | Evidence | Proposed fix |
|---|---|---|---|---|---|
| **C-1** | **MAJOR** | `scripts/smoke-test.mjs:13133` | The rebased pin `★ N86 ② (held): no stylesheet shrinks a QR below scan size` cannot fail. It reads only `setCssQ` (settings-shell.css), and this batch removed the last QR rule from that file — so the negative regex is unfalsifiable there, while the Account code it protects now renders from `wallet-receive.css`. The N86 scan-size ruling is left with **no guard on the surface that actually draws it**. | **Mutation M1** (below): appended `.c-addr-sheet__qrcard svg { width:120px; height:120px }` to `wallet-receive.css` → the shipped Account QR renders at 120px, well under the measured 185px scan floor → **suite fully green, 3013/3**. `PIN-G GEOMETRY` (:13137) was rebased to `chat-info` only, and the F5-5 CSS pin (:14181) checks the **card** `width: min(280px,…)`, not the svg — so nothing anywhere catches it. | Re-point the pin at the surface that now renders it: read `wallet-receive.css` cascade-wide (the existing `cssRulesWhere` helper) and assert no rule sets a QR `width`/`height` below 185px — i.e. restore the **positive** half the rebase dropped. |
| **C-2** | MINOR | `scripts/smoke-test.mjs:1931-1933` | F5-4's `.c-wallet-send__list` pin reads only the **first** matching rule block, in **one** file: `wsCss.match(/…/)` is non-global. A later override rule re-adding card chrome leaves it green. | **Mutation M2**: appended a second `.c-wallet-send__list { background…; box-shadow…; border-radius…; padding… }` to `wallet-send.css` → **green**. ⚠ This repeats verbatim the defect this same batch documents 12 000 lines away at :13048 — *"the old pin read the FIRST rule in one file, so re-adding the padding through a later override rule left it green. That was one of the four vacuous pins this loop found."* | Use the cascade-wide helpers already in the harness (`rulesFor('.c-wallet-send__list')` + `noneDeclares`), as the N86 pin does. |
| **C-3** | **MAJOR** | `scripts/smoke-test.mjs:14874` | The F5-1 three-leg pin windows the method as `spF5.slice(iDef, iDef + 3600)` — a **start anchor with no end bound**. The three legs are adjacent in the file and each is ~1.7 KB, so the window spills into the *next* leg, which supplies its own `BeginInvokeOnMainThread` + re-check. The pin's stated contract — *"delete the deferral and a fetched call+end pair loses its hangup again"* — is false. | **Mutation M3**: unwrapped the `MainThread.BeginInvokeOnMainThread(() => { … });` in `handleAppRequestReject` (deferral gone, re-check now synchronous — the exact regression) → **green**. The `[NOTIFDIAG]` count pin (:14883) also stayed green because a mechanical unwrap keeps the log line. The pin's own comment shows the START anchor was considered ("a call site or a comment naming the method earlier in the file must not shift the window") but not the end. | Bound the window at the next method: `spF5.slice(iDef, spF5.indexOf('private static void', iDef+1))` — or slice each leg to its own closing brace by depth, as the harness does elsewhere for brace-scoped checks. |
| **C-4** | MINOR | `scripts/smoke-test.mjs:14894` | The F5-2 hook pin asserts `Logging.flush()` appears **anywhere between** the hook registration and `base.OnCreate()` — not inside the handler. Its claim is *"logs [CRASHDIAG] and FLUSHES — the stack survives the process death"*, which is the only reason F5-2 exists. | **Mutation M4**: removed `IXICore.Meta.Logging.flush();` from inside the `UnhandledExceptionRaiser` lambda and re-inserted it just above `base.OnCreate();` → **green**, while a crash now logs and never flushes. | Slice the **lambda body** (`iHook` → the `};` that closes it) and assert both the `[CRASHDIAG]` line and the flush inside that slice. |
| **C-5** | MINOR | `scripts/smoke-test.mjs:14895-14898` | The breadcrumb pin **counts** `[CRASHDIAG] leave: ` occurrences (`crumbs >= 4 && hpCrumbs >= 3`). Its claim is that the teardown is *"BRACKETED"* — placement, which a count cannot test. "Flushed" is not tested at all on this leg. | **Mutation M5**: moved all four `ContactDetails` crumbs above the teardown (nothing follows it; count unchanged at 4) → **green**, while nothing brackets the crash site. | Assert order against the teardown: index of the `start` crumb `<` `sendLeave`/`removeFriend` `<` index of the `teardown done` crumb. |
| **C-6** | MINOR | `src/shells/settings.html:64` · `src/demo/settings.html:16` | The batch adds `wallet-receive.css` to both settings surfaces — correctly, and its own comment names the reason (*"unstyled here without it (the toast.css lesson)"*) — but adds **no pin for either**. Verified: `:1791` enumerates the settings demo's stylesheets and was not extended; `:5620` checks the shell links `toast.css` and was not extended. This is the #314 defect class (a `showToast` that "rendered UNSTYLED in document flow" **in this exact shell**) left unguarded on the newly-shared surface. | `grep -n "wallet-receive.css" scripts/smoke-test.mjs` → only the desktop-demo list (:4195) and comment/CSS-read references. A dropped link would ship a naked, unstyled QR dialog on Account with a green suite. | One line beside each existing pin: add `wallet-receive.css` to the `:1791` demo list and `ok(/wallet-receive\.css/.test(settingsSh), …)` beside the `:5620` toast pin. |
| **C-7** | MINOR | `src/styles/components/settings-shell.css:596-603` | Dead CSS. `.c-settings__addrinfo-body` (3 rules) styled the hand-built #443 explainer body that this batch **deleted** from `src/shells/settings.html`. No emitter remains anywhere. | `grep -rn "addrinfo-body" src/ Spixi/Resources/Raw/html/` returns CSS only — the source rules plus their copies inlined into every built shell that carries settings-shell.css. (`.c-settings__addrinfo` at :607 is still live — it styles the "What is this address?" button.) | Delete the three `.c-settings__addrinfo-body` rules; keep `.c-settings__addrinfo`. |
| **C-8** | MINOR | `src/shells/settings.html:516` (`exitSettings`) | No `closeAddressSheet()` on the way out. `home.html:2114` calls it on takeover close under the stated rule *"no sheet outlives its screen"* (loop r2 n5) — and settings is the **one** shell whose document is PARKED rather than destroyed (#315/#546), which is why `exitSettings` already performs park hygiene (`releaseEncpass()`, with the comment *"this document is PARKED, not destroyed … so unscrubbed fields would survive in a live DOM until the next visit"*). The same reasoning applies to a live overlay; `onRepresented` (:1787) calls `renderLayout()` and dismisses nothing. | **Not reachable today**, and I checked each route rather than assuming: hardware back (`onBack`, :1774) runs `dismissTopOverlay()` first; the peer-nav route is blocked because the nav is `--z-20` and the scrim `--z-40` (`bottomnav.css:19`, `overlay.css:9`; no shell override); `onExitRequest` only reaches a **pane** instance, and `HomePage.xaml.cs:1899` parks only the non-pane build. So the protection is **incidental (a z-index relationship), not designed**. | One line in `exitSettings()` beside `releaseEncpass()`: `try { closeAddressSheet(); } catch (e) {}` (already destructured in `home.html`; add to the settings shell's destructure list). Cheap, and it makes the invariant stated rather than emergent. |
| C-9 | NIT | `src/components/settings-shell.js:619` | The QR row passes the raw `host` to `openAddressSheet`; every other overlay in this file uses the `hostFor()` helper (`:375`), which falls back to `el.closest('.demo-phone')`. | No behavioural difference in either shipped surface today (the demo passes `host: phone`, production passes none → `openOverlay` defaults to `document.body`). A future demo that omits `host` would render the sheet outside the phone frame. | `host: hostFor()`. |
| C-10 | NIT | `scripts/smoke-test.mjs:13137` (`aria-expanded` half) | `!/aria-expanded/.test(setNC)` is a **whole-file** negative over settings-shell.js. | Sound today (`grep -c aria-expanded src/components/settings-shell.js` → 0), but any future unrelated disclosure row in this 1000-line file false-REDs it. | Scope the negative to the `qrRow` construction slice. |
| C-11 | NIT (Damir dial) | `src/components/settings-shell.js:586-594` + `:610` | The hub now renders **two adjacent controls that open the identical dialog**: the "What is this address?" text button and, immediately below it, the "Show QR" row. Deliberate per the batch (*"ONE surface, two doors"*) — **not re-litigating the reuse (Damir's call)**. The flag is copy: the info button promises an explanation and now delivers a QR-led dialog. | Both appended to `hero` in sequence; both call `openAddressSheet`, which returns the live sheet on the second tap via the `addrSheetLive` latch. | Damir's dial — retire one door, or re-label ("Show address & QR"). |

---

## 2. Mutation-test log

Every mutation was applied to the real file, the **full** suite was run, and the file was
restored from a pre-mutation `cp` backup with the md5 re-verified. Final tree state is
byte-identical to how I found it (§4).

| # | Pin under test | Mutation applied | Expected | Observed | Verdict |
|---|---|---|---|---|---|
| M1 | `:13133` N86 ② scan-size (C-1) | append `.c-addr-sheet__qrcard svg { width:120px; height:120px }` to `wallet-receive.css` | RED | **GREEN** 3013/3 | **VACUOUS** |
| M2 | `:1933` F5-4 flat picker (C-2) | append a second `.c-wallet-send__list` rule with background + box-shadow + border-radius + padding to `wallet-send.css` | RED | **GREEN** 3013/3 | **VACUOUS** |
| M3 | `:14874-14880` F5-1 reject leg (C-3) | unwrap `MainThread.BeginInvokeOnMainThread(() => { … });` in `handleAppRequestReject` (deferral count in that leg → 0) | RED | **GREEN** 3013/3 | **VACUOUS** |
| M4 | `:14894` F5-2 hook flush (C-4) | move `IXICore.Meta.Logging.flush();` out of the `UnhandledExceptionRaiser` lambda to just above `base.OnCreate();` | RED | **GREEN** 3013/3 | **VACUOUS** |
| M5 | `:14898` F5-2 bracketing (C-5) | relocate all four `[CRASHDIAG] leave:` crumbs above the teardown (count unchanged at 4) | RED | **GREEN** 3013/3 | **VACUOUS** |

M1+M2 were run as one batch and M3+M4 as another (disjoint files, distinct pin messages,
so failures would attribute cleanly); M5 ran alone. In all three runs the only failures
were the three known pre-existers.

---

## 3. Verified clean — no finding

Recorded so the next reviewer does not re-derive these.

**The reuse works end to end.** jsdom against the shipped `src/demo/spixi.iife.js`:
the "Show QR" row carries `aria-haspopup="dialog"` with no `aria-expanded`/`aria-controls`
residue; the hub builds **no** inline `.c-settings__qr` box; one click opens
`.c-sheet--addr` containing the QR (`data-qr-value` = `<address>:ixi`), the full address,
the folded explainer and Share; a **second click stacks nothing** (the `addrSheetLive`
latch holds); Share fires `onShare` with `{"address":"…"}` only — `amount`/`value` are
correctly dropped by the hub's adapter, which is the F3/#301 bare-address rule.

**No dead button.** The QR row lives inside `if (address)` (`settings-shell.js:538`), and
`setAddress` (`settings.html:1662`) calls `scheduleRebuild()` — so `openAddressSheet`'s
empty-address guard can never be reached from this door.

**No import cycle**, either direction, verified transitively over `src/components`
(`settings-shell.js` → … and `wallet-receive.js` → …: both NONE). Bundle order is safe
anyway: `wallet-receive.js` is FILES[86], `settings-shell.js` FILES[94], and
`openAddressSheet` is only called from a click handler, never at module level.

**Built artifacts are IN SYNC** — this is the #320/MAJOR-2 stale-artifact class, so I
checked it rather than assuming: re-running `build-demo-bundle.mjs` (292 exports) and
`build-shells.mjs` (18 shells) produced **byte-identical** output — `diff -rq` over the
whole `Raw/html` tree returned nothing, and `src/demo/spixi.iife.js` ==
`Spixi/Resources/Raw/html/spixi.bundle.js`.

**The built settings shell carries the reuse**: `.c-addr-sheet` selectors appear 25× in
`Raw/html/settings.html` (incl. `.c-sheet--addr`), i.e. `wallet-receive.css` is genuinely
inlined; `.c-settings__qr {` and `createQrSvg` are absent from it; the shared bundle
exports `openAddressSheet: openAddressSheet`. (The pin gap for this is C-6.)

**i18n: no conflicts, no key churn.** `extract-strings.mjs --check` → *770 keys · 0
fallback conflicts*. I then ran the writing pass over backups: `src/strings/en-us.js` and
`docs/i18n-strings.md` came back **byte-identical** (md5 unchanged), so the batch needs no
regeneration. All ten keys `openAddressSheet` uses exist in `en-us.js`
(`addressInfoTitle` · `addressInfoBody` · `addressInfoSafety` · `qrReceiveLabel` ·
`receiveCaption` · `yourAddress` · `txCopied` · `copyFailed` · `shareAddress` · `copy`),
and the shells build `window.SL` from the whole dictionary, so the settings shell carries
them. `qrLabel` was **not** orphaned by the hub's QR removal — `chat-info.js:460` still
references it, which is why the key count did not move.

**The dev-HUD rider is correct.** `--layout-rail-width: 72px` really exists
(`tokens.css:337`) and is the same token the rail column (`bottomnav.css:168`) and the
wallet takeover (`home.html:234`) read, so the "single FE source" claim holds. The rule is
gated on `:root[data-desktop]`, so **mobile is untouched**; it wins on specificity (0,2,0)
and source order over the base `.dev-hud { left: var(--spacing-8); right: 80px }`; and it
is present in the built `index.html`. The inherited mobile `max-width: calc(100% - 96px)`
is not re-derived for the rail, but it fails **safe** — the cap is 8px narrower than the
`left:80px`/`right:8px` box, so the HUD can never overflow the rail-side inset.

**Dangling-reference sweep after the QR removal**: `.c-settings__qr-toggle` and
`.c-settings__qr-chevron` remain matched 1:1 between JS and CSS; the `aria-expanded`
rotation rule was correctly removed with the disclosure. The only orphan is C-7.

---

## 4. Working-tree integrity

Restored byte-identical. md5 verified per file against pre-mutation backups
(`wallet-receive.css` `d6b7aa90…` · `wallet-send.css` `abb729d5…` ·
`StreamProcessor.cs` `42d995ae…` · `MainApplication.cs` `bec9ddde…` ·
`ContactDetails.xaml.cs` `4f6c143b…`), plus `md5sum -c` on the built artifacts after the
generator run. `git --no-optional-locks status --short` returns the same 43 modified paths
I found, and the final full suite run is back at **BASELINE OK — 3013 pass / the 3 KNOWN
pre-existers**. The only file I added is this report.

---

## 5. Note for the verdict

The five vacuous pins share one root cause worth naming, because it will recur: **when a
thing MOVES between files, a rebased pin tends to keep reading the old file.** C-1 reads
settings-shell.css for a QR that now lives in wallet-receive.css; C-3 and C-4 read a
window that happens to contain a neighbour's code. In four of the five the *claim string*
is precise and correct — it is only the *test* that drifted, which is the failure mode the
#520/#496 rule exists for and the one that reading alone will not catch.
