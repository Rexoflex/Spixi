# Handover — the walk-day QUEUE + the DETAILS REDESIGN (2026-08-26)

**COMMITTED on Damir's PC as `597234a7`, 84 files, 1 ahead of origin.** He pushes from
GitHub Desktop. ⚠ The cloud container CANNOT push: the git proxy refuses to credential
`Rexoflex/Spixi` ("not in this session's authorized repository set"). If that changes,
a future session can commit + push end to end.

Two batches, each with its own #46 loop, each independently F5-able.

| Rows | What | Checklist |
|---|---|---|
| **#589 / #590** | the queued FE work from `f5-findings-2026-08-26-walkday.md` | `docs/f5-checklist-2026-08-26-queued-fe.md` |
| **#591 / #592** | the contact/chat details redesign + two small asks | `docs/f5-checklist-2026-08-26-details.md` |

Verdicts: `docs/opus-review-verdict-589-590.md` · `docs/opus-review-verdict-591-592.md`.

## Numbers

bundle **296** · shells **18** · smoke **3208 / the 3 KNOWN** (#136 · M5 · B3) ·
cs-syntax **144 + 1** · locales **ALL CLEAN, 771 keys** · i18n-lint ✓ · pseudo 9/9 ·
Ixian-Core `097341a` untouched.
⚠ **C# changed in 3 files** (`SNotificationPrefs.cs`, `App.xaml.cs`,
`ContactDetails.xaml.cs`) → **wipe `obj`/`bin`** (#387).

## The four findings worth carrying

1. **The chat-row lift has been dead code since #572.** `.c-swipe__content` is a positioned
   child that fills the wrapper and paints an opaque `--surface-screen` of its own, so the
   ground painted on `.c-swipe` was never visible. And after that was fixed, the fix still
   did not fix the bug: a black scrim cannot darken an already-black list, so one neutral
   step measures 6.2:1 in light and **1.10:1** in dark. The ring is what works in dark.
2. **The `spixi.landtab` hand-off cannot carry state across a shell reload.** Single slot,
   consumed on read — the OUTGOING document's storage listener eats the key before the
   regenerated one exists. Anything that must survive `reloadShell` needs a DURABLE flag
   no reader clears. And C# echoes `selectTab` on every load, so any correction has to be
   the last writer on that path.
3. **Removing a control is not the same as changing what it controlled** — except when the
   control wrote a persisted preference, which is then stuck with no UI to reach it.
4. **A `:not()` carries its argument's specificity.** `.c-chat-info__body >
   :not(.a):not(.b):not(.c)` is (0,4,0) and beats a class + pseudo-class.

## ★★ Seven of my own pins were green on the defects they name

Across both loops, and two of them were written specifically to stop a MAJOR recurring:

- `indexOf(x) < indexOf(y)` — a deleted `x` returns **-1**, which is less than any index.
  **This appeared twice in one batch, in mirror directions.**
- a look-BEHIND window hunting a `removeItem` that lands *after* the identifier.
- a "last writer" pin matching three calls in sequence: that proves PROXIMITY, not order.
- an **8-character fixture** fed to a 9…6 truncator — it returns unchanged, so the pin
  asserted "a short address is not truncated" and would have passed the full base58.
- an **`ok(true, …)`** asserting a live geometric guarantee about a deleted card.
- a tautology: `querySelectorAll(sel)[0] === querySelector(sel)`.
- an absence guaranteed by the FIXTURE (no handler passed) rather than by the code.

All rewritten from the property; **19 + 8 mutations run**, each turning its own pin red.

## NOT BUILT, deliberately

- **Desktop Account → Contacts.** Damir wants the directory in the detail column with the
  hub on the left. **Proven not FE-fixable**: the detail column is a native WebView, and no
  HTML element in `home.html` can paint into it. It needs one small `HomePage` verb —
  remove the detail content so the takeover shows there, restore it on close. Specced, not
  half-built.
- **The mini-app press rectangle** ships as hygiene with an honest scope note.
  `pressable.js`'s own backstops already bound press state to ~2 s, so what landed closes a
  real window but **cannot** explain a persistent rectangle. **A screenshot is owed** (#294).
- Everything the findings doc lists under "NOT BUILT ON PURPOSE" is untouched: the
  locked-phone ring (needs the notification to own the sound — a scoping job), un-like
  (#215 — verify on device first), #574 ②, #562 ④, the third outgoing-request site.

## 🟡 Owed by Damir

1. **His #584–#588 F5 results.** He was testing in parallel and never sent them, so nothing
   was triaged. That was item ② of the session brief and it is still open.
2. **Was "Show sender name" ever in a build a real user ran?** It shipped 2026-08-21. If
   not, the one-shot migration mutates preference state for nobody and should be deleted.
3. **Two eyeballs**, both revert in one line: the lifted row's RING (does it read as
   *lifted* or as *selected*?), and `--text-success` one step darker in LIGHT (it also
   moves received tx amounts, tx-sheet amounts and payment-card amounts — all gain
   contrast, none change hue).
4. **The BE row** for `MiniAppManager.remove`'s path traversal
   (`security-review-for-be-engineer.md` MAJOR #10) — his and the engineer's call.

## Housekeeping

- Staging through the device bridge leaves unremovable `tmp_obj_*` files in
  `.git/objects`. Harmless; `git gc` clears them.
- `_deliveries/` is git-ignored in the cloud clone only — check it is not staged locally.
