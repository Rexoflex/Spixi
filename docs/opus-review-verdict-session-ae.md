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

## Verdict (AE r4) — Session AF, round 5 (fresh Opus reader, 2026-09-24)

**CLEAN.** The round-4 code holds: `setChatMode` writes `mode.answeredFor` before `chatSelect.refresh()`;
`setInset` tracks only on an inset change (`lastInset` starts at −1); removing the redundant
`unwatchTrayContent(existing)` leaks nothing (`closeAttachTray` unwatches on both paths); `CHAT_KB_CEIL = 658`
matched the built file. One pin hole (R5-1: a BRACE fold of `composerFadeNow()` into the select-mode `if`) — not
a code defect; closed in the #944 loop below, where the renderLogNow rule got its executed pin.

## #944 review — Session AF (#946), seven Opus rounds

| round | verdict | findings (all fixed, pinned, mutation-killed) |
|---|---|---|
| r1 | NOT CLEAN — 2 MAJOR · 3 MINOR · 1 NIT | **E-1 MAJOR (INTRODUCED): a blind room showed a nameless member's ADDRESS in the list** (the bubble shows "Hidden member"; on the owner's device it is the REAL address) → `if (Utils.hidesParticipants(friend)) return "";` before the address return. **E-2 MAJOR: four pins #944 never re-based were RED** (#720→CH6, CH6 ①②③ — the full suite was never run after #944) → re-based by POSITION (arg 11 = kind, 12 = sender, last). E-3 spelling pins → the gate EXECUTED. E-4 "You:" prose false (the prefix is empty in 12/13 locales) → corrected. E-5 hard-coded colon, E-6 linear `getFriend` per row → logged (dials, below). |
| r2 | NOT CLEAN — 2 MAJOR · 5 MINOR (pins) | narrowed CH6 sweep missed updateChat kinds · `{ }` between gate and block · a second call · typing clear by prefix · only Group/Normal modelled · nested/bypassed blind guard · early return in renderLogNow |
| r3 | NOT CLEAN — 2 MAJOR · 4 MINOR · 2 NIT (pins) | `?? addr.ToString()` through a whitelisted name · the flush dictionaries unpinned · `.Add` · own-test not first · false RED on nested `return` · shadowed `composerFadeNow` · `friend = null` · shell exclusion rows |
| r4 | NOT CLEAN — 4 MAJOR · 1 MINOR (pins) | the r3 depth-0 flatten re-opened braced early returns · destructure/reassign shadow · `rosterNick ??= msg.senderAddress` · an unmodelled OR'd member (`friend.approved`) → strict Proxy · false RED on `= new();` |
| r5 | NOT CLEAN — 2 MINOR · 1 NIT | **the design change:** four rounds of regexes over statement ORDER → ONE EXECUTED pin on the BUILT chat shell (history through the wire, band + rects stubbed, no dispatch error, the band-crossing rows masked); `composerFadeNow();` is the LAST statement; exact ladder tests |
| r6 | NOT CLEAN — 1 MAJOR · 1 MINOR (pins) | the executed pin passed VACUOUSLY — a leftover rAF from the pin above masked the rows during its `sleep(600)` → wait it out, read SYNCHRONOUSLY; the ladder pinned as guard+return pairs in the bubble's order |
| **r7** | **CLEAN** | no plausible one-line regression survives; 3+3 stable runs (one under CPU load); no false RED added |

**Code changed by the loop:** `HomePage.xaml.cs` only — the blind guard in `resolveExcerptSender` + comment
corrections. Every other change is a pin. ~40 author + reader mutations, each run through the real pin text;
none survives. Suite on the r5 snapshot (container, Core sibling): **BASELINE OK — 4876 / the 2 KNOWN**.

**Dials for Damir (not built):** a localized own prefix in rooms ("You:" — `index-excerpt-self` is empty in
12 of 13 locales, so an own tail reads unprefixed) · the colon is hard-coded (French " :", CJK "：") · a blind
+ nameless sender gets NO prefix where the bubble says "Hidden member" (fails closed; a shell label is
possible) · `FriendList.getFriend` is a linear scan per room row per flush (accepted; the bubble pays the same).

**Lesson (#798 again, in a new costume):** a pin that proves ORDER by reading statements is a list of the
spellings its author thought of. Four rounds each found the next spelling; the loop ended only when the rule
was EXECUTED — and even then r6 found the execution was being rescued by the pin above it. An executed pin
must read its result at the moment the code under test has finished, not after a sleep.
