# Opus review verdict — Session AE (2026-09-23)

Four adversarial rounds on Opus over the Session AE batch (DECISIONS #938–#943). Each round read the real
files and the pristine tree (`0e85a4b8`-lineage snapshot at `06f28e62`), reproduced findings on the built
`chat.html` in Chromium/jsdom where it could, and named a one-token mutation per pin. The author fixed
between rounds; every fix carries a pin, every new pin was mutation-killed in a separate root (44 mutations
through the REAL pin text over the four rounds, zero survivors that did not become a clause).

## Round 1 — NOT CLEAN (3 MAJOR · 5 MINOR · NITs)

| # | sev | finding | outcome |
|---|---|---|---|
| 1 | MAJOR | `scheduleComposerFade()` called from the synchronous `publish()` while its `let` sat BELOW the #711 block → TDZ `ReferenceError` swallowed by the block's own `catch` → the composer-height ResizeObserver never installed, `--composer-h` frozen at boot (reproduced on the built shell) | fixed: the fade block moved above; boot gate stubs a ResizeObserver + warns captured |
| 2 | MAJOR (pin) | tray pin ② positional only — `if (false) publishTrayContentHeight(tray)` green | fixed: behavioural pin in the K1 jsdom harness (rect stubbed, `--tray-content-h` read on the tray, held + plain paths) |
| 3 | MAJOR (pin) | delete pin ① stubs lacked `isMulti`/`type` (an `!mode.isMulti` clause green); pin ② regex a duplicate `delete:` key could shadow | fixed: full `setChatMode`-shape room stubs ×5; key counts |
| 4 | MINOR | `--tray-content-h` measured once at mount — a rotation / inset push left it stale | fixed: ResizeObserver on the grid + window-resize belt, released on close |
| 5 | MINOR | the reaction pill's 12 px overhang is clipped by the row mask (a pop, not a fade) | ATTEMPTED (padding) → reverted in r2; recorded residual |
| 6 | MINOR | masks stale on geometry changes with no scroll (media load, transitions) | fixed: `load` (capture) / `transitionend` / `animationend` on the log |
| 7 | MINOR | records: DECISIONS rows cited before written; "Damir picks first" — landed before the pick; B/C tint vs #937's wording | pick arrived (A); rows written at the end; recorded |
| 8 | MINOR | docblock: "reads then writes, no interleaving" false; `el.style.maskImage !== g` never short-circuits (re-serialisation) | fixed: WeakMap of last-written strings; prose corrected |

## Round 2 — NOT CLEAN (2 MAJOR · 6 MINOR)

| # | sev | finding | outcome |
|---|---|---|---|
| 1 | MAJOR | the r1 padding fix moved the select-mode tick 8 px off its disc on reacted rows (measured on the built shell) | REVERTED to the pristine margin; the pill pop is the residual |
| 2 | MAJOR (pin) | the boot pin proved attach, not publish — `new ResizeObserver(() => {})` green | fixed: the stub's callback is invoked with a 77 px slot; `--composer-h: 77px` required; source-order clause |
| 3 | MINOR | the stub removed the Session X "engine without RO still pads" coverage; its comment stale | fixed: source-order clause + comment |
| 4 | MINOR | one unmasked frame after a live re-render (pass scheduled from inside renderLog's rAF) | fixed: `composerFadeNow()` synchronously after the swap |
| 5 | MINOR | WeakMap re-entry: dropping `composerFadeLast.delete(el)` green | fixed: fixture re-enters geometry after a clear |
| 6 | MINOR | tray pin ① walk escapes (`div.c-attach-tray[data-open]`, `:is(`, chat.html inline styles) | fixed: last-compound subject rule + inline `<style>` swept |
| 7 | MINOR | three fixes with no pin (watch/unwatch, the new listeners, the padding) | fixed: behavioural watch pin, listener pins; padding reverted |
| 8 | MINOR | own UNSENT message in a bot room: Delete still dead (C# sends to the bot, no local delete) | residual, pre-existing class; recorded |

## Round 3 — NOT CLEAN (3 MAJOR · 4 MINOR)

| # | sev | finding | outcome |
|---|---|---|---|
| 1 | MAJOR | iOS: the bar SLIDES for the keyboard (280 ms margin transition); one pass read the start → a row stayed faded mid-screen after the keyboard hid (reproduced) | fixed: `composerFadeTrack(340)` re-arms a pass per frame through the slide; the slot's `transitionend` as belt |
| 2 | MAJOR (pin) | `composerFadeRaf = 0;` reset unpinned — its removal froze the fade on scroll | fixed: fixture returns the handle; asserted 0 after a pass |
| 3 | MAJOR (pin) | `composerFadeNow()` position inside `renderLogNow` unpinned (before the swap = masks the detached nodes) | fixed: pinned after `box.replaceChildren(frag)` |
| 4 | MINOR (pin) | resize-listener removal counted, not identity-checked | fixed: `addedFn === removedFn` |
| 5 | MINOR | CORE-13 row: `:341` throws only with a non-empty pending list; a guard in `removeMessage` alone does not stop the NRE; log line `:1595` | fixed in the row |
| 6 | MINOR | "renderLogNow runs INSIDE a rAF" false for 4 of 5 callers | fixed: prose |
| 7 | MINOR | a room answer while a selection is open did not re-evaluate the bar's Delete (silent belt refusal) | fixed: `chatSelect.refresh()` in `setChatMode` |

## Round 4 — NOT CLEAN (2 MAJOR · 4 MINOR)

| # | sev | finding | outcome |
|---|---|---|---|
| 1 | MAJOR | the #345 ceiling (re-based mid-loop to 655) was overtaken by r3's own additions — the AFTER snapshot red | fixed: measured LAST — 658, delta stated (+12 294) |
| 2 | MAJOR | the r3 `unwatchTrayContent(existing)` on the closing-tray path was redundant AND tripped the `★ A MINOR-1` adjacency pin | removed |
| 3 | MINOR | the r3 `setChatMode` refresh ran BEFORE `mode.answeredFor` — the first room answer re-evaluated against an UNKNOWN room | fixed: moved after; pin re-based |
| 4 | MINOR (pin) | the tracking fixture fed a zero rAF handle; on a device the pass runs AS the callback | fixed: `setRaf(7)` before the tracking pass |
| 5 | MINOR (pin) | `;`→`,` folded `composerFadeNow()` into the preceding `if` with pin ③ green | fixed: statement-level clause |
| 6 | MINOR | CORE-13 row still uncorrected at that point | fixed (see r3 #5) |
| 7 | NIT | `setInset` restarted the tracking on every settle-ladder tick | fixed: on an inset CHANGE only |
| 8 | NIT | two comments contradicted the code ("once per mount"; the rAF claim at the call site) | fixed |
| 9 | NIT | residual not recorded: a row whose height changes in place with no signal keeps its mask until the next pass | recorded (#940) |

## Verdict

**CLEAN is NOT claimed.** Round 4's findings are fixed, pinned and mutation-killed (R4-1…R4-4), and the
final AFTER run on a snapshot of the landed tree read **BASELINE OK — 4862 pass / the 2 KNOWN** (BEFORE 4848, +14, container with the Core sibling) — but no fifth reader has read the round-4
fixes. The next session's item 0 is that reader, over the r4 delta only (`chat.html` setChatMode/setInset,
`attach-sheet.js` the removed line, `smoke-test.mjs` the fixture's `setRaf` + the statement clause).

Residuals carried (all recorded in #940): the reaction pill pop under the band · in-place row height changes
with no signal · a one-frame trail on a fling · own UNSENT message in a bot room (Delete dead, pre-existing).
