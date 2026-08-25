# Opus #46 loop — BATCH A (info · groups · the remove-contact data bug, 2026-08-24) → CLEAN after 2 rounds

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.**

**Batch:** A1–A9 (DECISIONS #539–#542). **Loop:** 2 disjoint round-1 auditors (C# + shells ·
components + pins + a11y) → fixes → a FRESH round-2 reviewer → fixes. Reports:
`opus-review-batch-a-r1-cs-shells.md`, `opus-review-batch-a-r1-components-pins.md`,
`opus-review-batch-a-r2.md`.

## Round 1 — 8 MAJOR

| # | MAJOR | Fix |
|---|---|---|
| 1 | two `location.href` sends in ONE turn drop the first on the MAUI WebView — the delete flow emitted `removehistory:` + `sharedGroups:` in one click; contact_details emitted `onload` + `sharedGroups` back to back (launch.html had found this at #N75 and queued only its own sends) | `createNativeBridge`'s DEFAULT sink is the serialized outbox — every shell, first command synchronous, the rest one macrotask apart; pinned behaviourally |
| 2 | `removeDetailContent()` closed NOTHING (`detailContent` is never assigned; conversations are overlays) — a wide window kept a live chat with a removed friend | the page's overlay-aware `popPageAsync`, as the legacy remove sites do |
| 3 | ticking a shared group DELETES that group's chat (Core `removeFriend` → `deleteMessages`) and no copy said so | the confirm + the hint say so |
| 4 | the final confirm fired the destructive verb TWICE (a closing modal still took taps) | the sheet fires once; `.c-modal:not([data-open])` is pointer-dead (the sheet rule, extended) |
| 5 | step-1 Delete double-fired and stranded a dead sheet | one-shot |
| 6 | a "blocked" answer inside the sheet's exit window was swallowed by a pointer-dead sheet (`isConnected` ≠ open) | `isOverlayOpen` |
| 7 | A8's chat.html half was DEAD CODE (no caller since #249) with a regex pin on it | reverted; A8 rebuilt on contact_details (skeleton boot cover + roster rows + a 4 s belt on the group ask) |
| 8 | A9 at 0.7 = 3.73:1 on 12 px outgoing meta (AA 4.5) | shipped at Damir's number; the measurement and the 0.85 (4.73:1) alternative are in the F5 checklist |

Plus ~12 MINOR/NIT: `left` result for group/bot leaves · the draft goes with the chat ·
no `ex.Message` on peer-supplied tokens · the fixed-on statement keeps full ink · the wide
CTA wraps · reduced-motion escapes pinned · the honest empty-roster note.

## Round 2 — 0 MAJOR, 4 MINOR (all fixed), 5 NIT

R2-1 a throwing href wedged the outbox → `try/finally` keeps draining · R2-2 "blocked
re-opens the sheet" is unreachable in production (the verb fires as the sheet closes) →
doc + pin label corrected; the toast is the honest answer · R2-3 the sheet's group ask had
no belt → 4 s, Remove stays disabled, Keep is the exit · R2-4 the draft was purged before
the answer → purged on the SUCCESS answer only. Mutations: 3 planted, 3 caught.

★ Two consequences of the outbox the reviewers named for the F5: **bulk message delete**
(chat.html emits N deletes in one turn — before, only the last landed) and the **W9
multi-recipient request loop** now deliver every command. Both are in the F5 checklist.

## Pipeline after the loop

bundle 290 · shells 18 · smoke **BASELINE OK 2954 / the 3 KNOWN** · cs-syntax 144 + 1 ·
locales CLEAN. `Spixi/Utils/SContacts.cs` is NEW and UNTRACKED — `git add` it with the batch.
