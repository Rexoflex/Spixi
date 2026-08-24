# Opus #46 loop — Batch A, ROUND 2: break my verdict

**Question:** did each round-1 fix hold, and did it break something else?
**Method:** read the tree, then execute. `node scripts/cs-syntax-check.mjs` → **144 files parse
cleanly ✓ · 1 known skip**. `node scripts/smoke-test.mjs` → **BASELINE OK — 2952 pass / the 3 KNOWN
pre-existers (#136 · M5 · B3)**, matching DECISIONS #542. Three prescribed mutations ran in three
independent scratch trees (`/tmp/mut_a|b|c`, bundle rebuilt in each). One throwaway probe
(`/tmp/wedge2.mjs`) drove `createNativeBridge` directly. No file under `/root/Spixi` was changed
except this report.

**VERDICT: PASS. 0 MAJOR · 4 MINOR · 5 NIT.** Every round-1 fix holds. Two of them fix more than
the batch claims, and that is worth an F5 row. The A9 contrast number is unchanged and remains
Damir's open call.

---

## 1. Mutation results — the three pins are real

| Mutation | Expected | Result |
|---|---|---|
| (a) delete the `fired` latch (`chats-row-menu.js:264,266`) | the A-1 pin fails | **CAUGHT.** One failure: *"★ loop r1 A-1: a second tap on the closing confirm (or the sheet CTA) never fires the destructive verb twice"*. Nothing else moved. |
| (b) revert the default sink to a raw `w.location.href = command` | the outbox pin fails | **CAUGHT.** One failure: *"★★ loop r1 (cs-shells A-1): the FIRST command still goes out synchronously"*. See NIT R2-5 — the SECOND outbox pin does not move. |
| (c) `isOverlayOpen(sh)` → `sh.isConnected` in both setters | the A-3 pin fails | **CAUGHT.** One failure: *"★ loop r1 A-3: a late answer for a sheet in its EXIT window is refused"*. Nothing else moved. |

Each mutation produced exactly one failure, and it was its own. The latch, the outbox and the
`isOverlayOpen` swap are all load-bearing and all pinned behaviourally.

---

## 2. Findings

| # | Sev | file:line | Scenario | Fix |
|---|---|---|---|---|
| **R2-1** | **MINOR** | `src/bridge/native.js:76-84` | **One throwing navigation wedges the outbox for the life of the page.** `drain()` assigns `w.location.href` and only THEN schedules the next drain. If the assignment throws, `setTimeout(drain, 0)` never runs and `draining` stays `true`, so every later `bridge.send` pushes into a queue nothing will ever empty. **Proven** (`/tmp/wedge2.mjs`): with a sink that throws once, `send('ixian:one')` throws, and `two` + `three` are never delivered — `delivered after the throw: []`. Under the old raw sink a throw cost exactly one command; now it costs the bridge. The blast radius is the whole shell: no back, no save, no verb. Likelihood is low (an `ixian:` assignment does not normally throw on WebView2/WKWebView), but this batch made the failure total instead of local. | `const cmd = outbox.shift(); try { w.location.href = cmd; } finally { setTimeout(drain, 0); }`. The first (synchronous) send still throws to its caller; the queue survives. |
| **R2-2** | **MINOR** | `chats-row-menu.js:266,315-322` · `home.html:3329` · DECISIONS #540 | **The "a late blocked answer re-opens the question in the sheet" behaviour is now unreachable, and its pin cannot tell.** `fire()` calls `onRemove(...)` and then `closeSheet(sheet)` in the same statement. `dismissOverlay` splices the stack entry **synchronously**, so `isOverlayOpen(sheet)` is false from that instant. C# cannot answer inside the same task (the push arrives through a later `EvaluateJavaScriptAsync`), so `setRemoveSheetResult` ALWAYS returns false in the real flow and `home.html` always falls through to the toast. That is the correct trade — round 1 chose option (1) of A-3 deliberately, and the toast is honest and names the blocking groups — but two artefacts now overstate it: DECISIONS #540 says "A late 'blocked' answer re-opens the question in the sheet", and the pin at `smoke-test.mjs:14432` exercises `setRemoveSheetResult` on a sheet that was **never fired**, i.e. still open. It proves the function; it cannot prove the flow reaches it. ⚠ Recovery is narrow: step 1 already deleted the history, so `loadChats` emits no row for that friend (no `lastMessage`) and the un-tombstoned chat row does not come back. The only way back to a remove affordance is Account → Contacts → contact details → Remove contact (the N27 `removeBlocked` modal). **My view:** leave the code as it is for v1. `syncCta` disables Remove until every blocker is ticked, so `blocked` is only reachable when a group is joined between the sheet snapshot and the confirm (r1 A-17) or when a leave fails — rare, and the toast is actionable. **Do** correct the DECISIONS sentence and relabel the pin as a unit test of the setter, not of the flow. If Damir wants the sheet back, the exact call is: in `removeContactResult`, replace the `setRemoveSheetResult(...)` line with `openRemoveContactSheet({ chat: { name, address: addr, type: 'contact' }, host: document.body, strings: s, onNeedGroups, onRemove })` seeded with the returned `groups`, gated on `st === 'blocked'`. | Correct the doc + the pin label; optionally re-open per above. |
| **R2-3** | **MINOR** | `chats-row-menu.js:295-297` | **The sheet still has no belt on the group ask; `contact_details.html` got one.** Round 1 gave the A4 strip a 4 s escape (`contact_details.html:519` — an unanswered `sharedGroups` sets `undefined` and the strip hides). The SHEET got nothing: `grep setTimeout src/components/chats-row-menu.js` returns only the long-press timer at `:390`. If `setSharedGroups` never lands, `groups` stays `null`, `syncCta` (`:218`) keeps Remove disabled forever and the hint reads "Checking your groups…" with no retry and no explanation — the user cannot remove the contact from this surface at all. `HomePage.onSharedGroupsFor` always answers on a current build, so this is an old-exe / dropped-push case, but it is the same failure mode round 1 judged worth a belt one file over. | `const belt = setTimeout(() => { if (groups === null) sheet._setGroups([]); }, 2500);` cleared inside `_setGroups`. An empty list arms Remove with the honest "No shared groups" hint; a real blocker then surfaces as `blocked` on the toast. |
| **R2-4** | **MINOR** | `home.html:1248` · `home.html:3336-3342` | **A refused history delete still destroys the user's unsent draft.** `onPersist` runs `localStorage.removeItem(DRAFT_PREFIX + chat.address)` for BOTH `delete` and `deleteContact`, before any answer. `removeHistoryResult` with a non-`ok` status then un-tombstones the row precisely because "a row that vanished while the data stayed is the lie this fixes" — but the draft is gone and cannot come back. The row returns; the user's own typed text does not. Small, and it only bites on a failed delete, but it is the same honesty rule this batch is built on, inverted. | Snapshot the draft before the removal and restore it in the non-`ok` branch, or defer the `removeItem` to the `ok` path of `removeHistoryResult` / `removeContactResult`. |
| N-1 | NIT | `smoke-test.mjs:14518-14522` | **The second outbox pin is mutation-blind.** Mutation (b) failed the first assertion only. The second (*"three sends in ONE turn all arrive, in order, one macrotask apart"*) PASSES under a raw sink, because the fake window's `href` setter records every assignment and nothing is really dropped. The pair is honest together; the ordering pin alone would not notice a revert. | Assert the TIMING, not just the order: capture `Date.now()` (or a tick counter) per push and require `seen.length === 1` before the await. The first pin already does the work — say so in its message so nobody trims it later. |
| N-2 | NIT | `home.html:2129-2131` | The W9 comment is now false for recipients 2..N: *"`bridge.send` is location.href, so a throw is the only other failure signal — the component catches it per contact."* Only the FIRST send of a turn drains synchronously; the rest are pushed into the outbox and can never throw at the call site. The per-contact catch now only covers contact 1. | Reword. The loop itself is strictly better than before (see §4) — only the failure-signal claim is stale. |
| N-3 | NIT | `home.html:899-907, 3549-3550` · `settings.html:951` | Three comment blocks still state that `bridge.send` has **no queue** and that two sends in one task coalesce last-wins. That was the premise for `syncHomeOverlay`'s deferral, for the rAF gap before `bridge.ready()`, and for the W2 (#348) "do not auto-save here" rule. All three remain CORRECT decisions, but their stated reason is now half-true: the queue exists, and the risk they guard against is gone. | Add one line each pointing at `native.js`'s outbox, and keep the deferrals (they still enforce ordering, which the outbox preserves rather than provides). |
| N-4 | NIT | `contact_details.html:98` | The boot cover is `role="status"` **and** `aria-busy="true"`, and it is then REMOVED rather than un-busied. A live region that is busy at insertion time and never sees `aria-busy="false"` announces nothing at all, and its removal is not announced either. Its three rows are `aria-hidden`, so the only accessible content is the `aria-label="Loading"`. This is r1's N-6 in a second place. | Drop `aria-busy` from the cover (the panel that replaces it carries its own `aria-busy` on the list), or announce the settle from the panel instead. |
| N-5 | NIT | `home.html:1247-1252` | r1's A-8 tail is only half closed. The draft goes; `spixi.mentions.seen.<addr>` and `spixi.app.declined.<addr>` still survive a `deleteContact` keyed on the removed contact's address, in the store `security-review-for-be-engineer.md` MAJOR #4 flags as plausibly readable by mini-app code. No plaintext, but the address remains. | Purge every `spixi.*` key carrying the address in the `deleteContact` branch, and note it in the gate row. |

### Carried, unchanged, and still open for Damir

**A9 contrast.** `message-bubble.css:409` still ships `opacity: 0.7` on `.c-bubble__meta > *`.
Round 1 measured **3.73:1** on 12 px text against `#1956b2`, in both themes; AA needs 4.5. DECISIONS
#542 records this as shipped at 0.7 *as Damir specified*, with the number left for his call. That
is a legitimate ruling, not a defect of the fix round, so it is not counted above — but two things
should be true before it ships: the number belongs in the batch-A F5 checklist (there is no
`docs/f5-checklist-*batch-a*` file, and `docs/commit-message-batch-a.md` does not carry it), and the
pin at `smoke-test.mjs:14444` is still a source-text regex that passes at any alpha. `whiteContrast`
at `smoke-test.mjs:9505` is the precedent for pinning the measured value.

---

## 3. VERIFIED CLEAN

**The bridge outbox**

* **One outbox per page.** `createNativeBridge(` appears once per shell (16 with the default sink,
  `launch.html:196` with its own `emit`). The three page adapters that would otherwise build a
  second bridge — `lock-page.js:33,76` and `scan-page.js:569`, each `bridge || createNativeBridge()`
  — all receive the shell's instance (`lock.html:170`, `scan.html:137`,
  `settings_encryption.html:138`). No page holds two independent queues.
* **launch.html is not double-queued.** `sink = emit || queued` (`native.js:85`): an injected `emit`
  bypasses the default entirely. launch.html's own queue (`:185-194`) is byte-equivalent in shape.
* **The demos and the harness are unaffected.** No `src/demo/*.html` constructs a bridge; the demos
  drive components directly. The harness injects `emit` at `smoke-test.mjs:4254,4266` and a fake
  `win` at `:14517`.
* **Nothing relies on `send` being synchronous.** No shell reads `location.href` after a send
  (`empty_detail.html:158` sets it raw and never through the bridge). No shell emits an `ixian:`
  verb from `pagehide` / `beforeunload` / `visibilitychange` — `chat.html:4821-4822` flushes a
  **localStorage** draft there, not a verb. The file/media pickers (`ixian:sendfile`,
  `ixian:sendmedia`, `ixian:avatar`, `ixian:selectfile`) are each the first send of their turn, so
  they still drain synchronously; and they are handled natively by C#, so no browser user-activation
  chain is involved.
* **The teardown verbs are never queued behind anything.** `ixian:back`, `ixian:remove` (popToRoot),
  `ixian:deletea`, `ixian:delete` and `ixian:dismiss` are all the first send of their handler.
  A queued command dying with the page is therefore not reachable today. ⚠ It is a real shape —
  worth one line in the docblock so the next author does not put a send in front of a `back`.
* **The two deliberate deferrals still order correctly.** `syncHomeOverlay` (`home.html:909-915`)
  and `syncChatOverlay` (`chat.html:4373-4379`) defer the state push by one macrotask; the verb in
  the same click drains synchronously first. MutationObserver callbacks are microtasks, so the sync
  timer is always registered AFTER the outbox's own `setTimeout(drain, 0)`. The AND-29 r3 invariant
  ("a state push never shares a navigation slot with a verb") is preserved, and the deferral is now
  belt over braces rather than the only guard.
* **Latency is not a user-visible cost.** The first command is unchanged (synchronous). Each later
  one costs one macrotask: 0–1 ms, rising to the 4 ms clamp after five nested timers. The longest
  real chains are the W9 request loop and bulk message delete, both of which previously delivered
  ONE command. `ixian:back` is never behind a chain. Nothing perceptible.

**The modal pointer-events rule**

* **No pin is timing-coupled to `data-open`.** jsdom performs no hit-testing, so `element.click()`
  in the harness dispatches regardless of `pointer-events`. The sleeps before modal clicks in the
  Batch A block are 30 ms and 60 ms (`smoke-test.mjs:14395,14416,14421,14427`), and the flows the
  rule protects are exercised with `await sleep(450)` between sheets.
* **Keyboard users are not gated.** `openOverlay` moves focus **synchronously** at the end of the
  function (`overlay.js:126-127`), before the two rAFs that stamp `data-open`. `pointer-events` is a
  hit-testing property: it does not change focusability, and activating a focused `<button>` with
  Enter or Space dispatches `click` on the element directly rather than through hit-testing. So the
  CSS rule cannot lock a keyboard user out of the open window — and it also cannot stop a keyboard
  double-activation on the way out. The JS `fired` latch is what actually protects that path, and
  mutation (a) proves it is the only thing that does.
* The rule inherits the sheet rule's self-healing property under a paused rAF (a backgrounded
  WebView): `data-open` lands on the first frame after resume. Pre-existing for sheets since #46
  MAJOR-3; modals now share it.

**chats-row-menu — the full sequence walked**

Step 1 Delete → `step1Fired` latches → `onAction('delete')` → `ixian:removehistory:` (synchronous)
→ `openRemoveContactSheet` → `onNeedGroups` → `ixian:sharedGroups:` (next macrotask, **both now
arrive**) → `setSharedGroups` applies (`isOverlayOpen` true, address matches) → tick all → CTA arms
as "Leave N & remove" → confirm modal → `fire()` latches, emits `deleteContact`, closes the sheet →
stack entry spliced synchronously → **a late `setSharedGroups` for the same address is refused**
(`isOverlayOpen` false; `home.html:3312` logs `dbg('setSharedGroups (no live sheet)')`, no state
touched) → `removeContactResult('ok')` → `setRemoveSheetResult` refused → toast. Verified as
written, and mutation (c) proves the refusal is the `isOverlayOpen` swap and not an accident.
`liveRemoveSheet` survives correctly across peers: `onDismiss` fires at REMOVE (~400 ms later) and
is guarded by `if (liveRemoveSheet === sheet)`, so a stale dismissal cannot clear a newer sheet.
`openRemoveContactSheet` has exactly one production caller (`openDeleteFlow:364`), so the missing
"close the previous live sheet" belt from r1 A-2 is unreachable today; `step1Fired` covers the one
route that exists.

**contact_details A8**

The `.contact-boot` cover is static markup inside `#contact-root`; the first commit calls
`rebuildPanel()` → `root.replaceChildren(buildPanel())`, which replaces it in one render. The
skeleton always resolves: the `!state.membersLanded` timer fires at **2600 ms** and calls
`scheduleCommit()`, whose 120 ms debounce lands the rebuild at **≈2720 ms** — 220 ms past the
2500 ms cutoff in `loading` (`:316`), so that rebuild is guaranteed to render the honest note
instead of the skeleton. `landed` in `stateSig` (`:462`) is `membersLanded || elapsed >= 2500`, so
it flips false→true exactly once and forces that rebuild even when nothing else changed; it cannot
churn. The 1200 ms `if (!built)` fallback covers a page that receives no push at all. A late roster
(> 2500 ms) still rebuilds through the `members:` key. A4's 4 s belt sets `sharedGroups = undefined`,
which the corrected `chat-info.js` gate reads as "no strip" rather than "loading".

**A-10 properly closed.** `chat-info.js:157` now defaults `sharedGroups = undefined` and the strip
gate is `kind === 'contact' && sharedGroups !== undefined` (`:804`). The dead `!== undefined` test is
gone, `loading` no longer drives two unrelated loads, and `contact_details.html:209,386` is the only
caller that feeds it.

**HomePage.onRemoveContactFor**

* `popPageAsync` is `public` (`Spixi/Utils/SpixiContentPage.cs:2859`) and `Utils.getChatPage` returns
  `SingleChatPage?`, which derives from `SpixiContentPage`. Callable from HomePage on another page
  instance.
* **"Not top" is handled.** `popPageAsync` finds the overlay by TARGET
  (`overlayStack.Find(o => o.target == this)`) and calls `closeOverlay(overlayOp, true)` on that
  entry, not on the top of the stack. On WIDE the conversation beside the list closes correctly.
  The staging branch (`op.target == this`) marks `abandoned` and cancels the preload — a conversation
  caught mid-stage is not shown afterwards.
* The `Navigation.PopAsync()` fallback would pop the top of the nav stack, not necessarily the chat
  page. It is unreachable from this handler: HomePage is the root, so a `SingleChatPage` in the
  NavigationStack sits ABOVE it and its own WebView, not HomePage's, is the interactive surface.
* `Utils.getChatPage(f)` is resolved BEFORE `SContacts.removeContact`, and it matches on the Friend
  **reference**, which the page still holds after `FriendList.removeFriend`. Correct ordering,
  correctly commented.
* Only `ok` and `left` close the conversation. A `blocked` or `fail` leaves it open, which is right —
  nothing was removed.

**Everything else checked**

* `docs/security-handover-gate.md` Batch A section is corrected: the conversation-close row now
  describes `popPageAsync` and names `removeDetailContent` as the thing that closed nothing. The
  outbox and the modal rule both have their own rows, and the outbox row states the honest
  consequence ("commands that used to be DROPPED now arrive").
* No handler logs `ex.Message` on a peer-supplied token (`HomePage:4032,4066`, `SContacts`) — pinned.
* `left` is handled distinctly in `home.html:3321` (no "Contact removed" lie for a bot that stays
  until acknowledged) and does not un-tombstone.
* r1 A-8 (label overflow) closed: `message-menu.css:192-194` — the actions row wraps and the long
  CTA takes `flex: 2 1 auto` with `min-width: 0`.
* r1 A-9 closed: the fixed-on "Delete chat" statement keeps full ink, pinned negatively at
  `smoke-test.mjs:14424`.
* r1 A-7 closed: both reduced-motion escapes are pinned (`smoke-test.mjs:14419`), and
  `contact_details.html:65` carries its own.
* **Built output is in sync.** `Spixi/Resources/Raw/html/spixi.bundle.js` carries the outbox; the
  built shells reference it and carry the `.c-modal:not([data-open])` rule inline. No stale artefact
  would ship the old sink.
* No money path, no signing, no chat-isolation (#221) surface is touched by any round-1 fix.

---

## 4. Two consequences the batch does not claim — put them on the F5 checklist

The outbox is a whole-app transport change that shipped inside a contact-removal batch. It fixes
two loops nobody was looking at, and both are worth one line of device testing.

1. **Bulk message delete now deletes every selected message.** `chat.html:2288` is
   `for (const id of ids) sendDeleteMessage(id);` — N `location.href` sets in ONE turn. On a real
   MAUI WebView, before this batch, only the LAST one survived: selecting five messages and tapping
   Delete removed **one**. Every id now lands. **F5: select 3+ messages, delete, reopen the chat.**
2. **The W9 multi-recipient request loop now reaches every recipient.** `home.html:2134`, same shape,
   same previous outcome. **F5: request from 3 contacts at once, confirm 3 chat messages exist.**

Neither is named in DECISIONS #542 or in the gate row, and both are behaviour changes a tester would
otherwise read as new bugs rather than as the fix arriving.

---

## VERDICT

**PASS.** All eight round-1 fixes hold under mutation and under the walked sequences, and none of
them broke a neighbour: the outbox does not strand a teardown verb, the modal rule does not lock out
a keyboard user or any pin, the `fired` latch is the only thing holding the keyboard double-fire and
it holds, the `isOverlayOpen` swap makes a refusal always visible, A8's skeleton always resolves
with 220 ms of margin, and `popPageAsync` closes the right page from the right thread. Four MINORs
remain, none blocking: an outbox that a single throw can wedge (R2-1, the only one I would fix
before commit), an advertised behaviour that is now unreachable and a pin that cannot say so (R2-2),
a missing belt the sibling surface got (R2-3), and a draft destroyed by a delete that failed (R2-4).
The A9 3.73:1 measurement is unchanged and is Damir's to rule on, but it should be written into an
F5 checklist and pinned by number rather than by regex.
