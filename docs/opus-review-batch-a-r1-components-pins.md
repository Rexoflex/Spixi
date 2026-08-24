# Opus #46 loop — Batch A, round 1, AUDITOR 2 (components · CSS · pins · i18n · a11y)

**Scope:** `chats-row-menu.js` · `chat-info.js` · `message-menu.css` · `chat-info.css` ·
`message-bubble.css` (A9) · the smoke "BATCH A" block · the new strings · a11y (#205).
**Method:** read the source, then EXECUTE. Baseline `node scripts/smoke-test.mjs` = 2938 pass /
the 3 known pre-existers. Five prescribed mutations plus four jsdom probes ran on a scratch copy
under `/tmp/mut/Spixi`. No file in `/root/Spixi` was changed except this report.

**VERDICT: 4 MAJOR · 6 MINOR · 9 NIT. Do not commit Batch A as it stands.**
Three of the four MAJORs are in one place — the remove-contact flow fires its destructive verb
more than once, and it cannot report a refusal. The fourth is a measured AA regression in A9.

---

## 1. Findings

| # | Sev | File:line | Scenario | Fix |
|---|---|---|---|---|
| **A-1** | **MAJOR** | `src/components/chats-row-menu.js:265,275` | **The final confirm fires the removal TWICE.** `fire` is the modal action's `onClick`. `createModal` (`modal.js:60-66`) runs `onClick` and only THEN dismisses; `dismissOverlay` (`overlay.js`) leaves the modal in the DOM for the exit transition, and **there is no `pointer-events:none` rule for a closing `.c-modal`** — `overlay.css:75-78` gives that guard to `.c-sheet` only. A second tap inside that window re-enters `fire`. **Reproduced** (`/tmp/probe/p1.mjs`, P2): `onRemove fired 2 times`. The shell then sends `ixian:removecontact:<addr>:1` twice. C# handles the second call with `f == null` (`HomePage.xaml.cs:4016-4029`) → `status = "fail"` → `removeContactResult(addr,'fail')` → `home.html:3327` runs `deletedChats.delete(addr)` and shows **"The contact could not be removed."** after the removal SUCCEEDED. The A5 docblock promises "onRemove … fires ONCE, after the confirm" (`chats-row-menu.js:153`). It does not. | Latch it in JS, not in CSS — CSS cannot stop the keyboard or a programmatic path (see A-4). In `openRemoveContactSheet`: `let fired = false;` and `const fire = () => { if (fired) return; fired = true; … };`, plus `if (fired) return;` at the top of `confirmRemove`. Separately, consider giving `.c-modal:not([data-open])` the same `pointer-events:none` rule the sheet already has (a system-wide change — Damir's call). |
| **A-2** | **MAJOR** | `src/components/chats-row-menu.js:352-358` | **Step 1 "Delete" also double-fires, and strands a dead sheet.** Same modal exit window. **Reproduced** (P1): `acted = ["delete","delete"]`, `asked = ["ADA1","ADA1"]`, `sheets = 2`. Two `ixian:removehistory:<addr>` verbs go out. Two remove sheets stack. `liveRemoveSheet` (`:285`) points at the SECOND one, so `setRemoveSheetGroups` can only ever feed that one. When the user dismisses it, the first sheet is revealed underneath with `groups === null` forever: the hint reads "Checking your groups…" and **Remove is permanently disabled** (`syncCta`, `:218`). The user has to dismiss a dead sheet. | The same `fired` latch on the step-1 action, and/or the `.c-modal` pointer-events rule. A cheap belt as well: `openRemoveContactSheet` should close any sheet already held in `liveRemoveSheet` before it latches itself. |
| **A-3** | **MAJOR** | `src/components/chats-row-menu.js:265, 303-322` | **A refused removal can report NOTHING, and the "blocked re-opens the question" behaviour is a race the real flow usually loses.** `fire()` calls `onRemove(...)` and then `closeSheet(sheet)` **before the verb reaches C#**. `setRemoveSheetGroups` / `setRemoveSheetResult` test liveness with `sh.isConnected` — but `dismissOverlay` splices the stack entry synchronously and removes the node only at `transitionend` (~200 ms) or the 400 ms fallback, so `isConnected` stays TRUE across the whole exit. **Reproduced** (`/tmp/probe/p3.mjs`): a `blocked` answer at +0/+50/+150/+250/+350 ms is "taken" by a sheet that is off-screen, `pointer-events:none` and mid-removal. `home.html:3324` then RETURNS and shows **no toast at all**, after `deletedChats.delete(addr)` has already dropped the tombstone. The user sees the row come back on the next flush with no explanation. Past 400 ms the answer is dropped and the toast fires — so the outcome depends on round-trip latency. ★ `overlay.js:isOverlayOpen` exists precisely for this and its own docblock says `isConnected` is not a timing-safe oracle. Batch A did not use it. | Two options. (1) Minimal, one line each: test `isOverlayOpen(sh)` instead of `sh.isConnected` in both functions — a closed sheet then always falls through to the toast, so feedback is never lost. (2) Correct: do not close on `fire()`. Put the sheet in a pending state (CTA disabled + spinner) and let the RESULT close it — `ok` closes, `blocked` re-opens the question on a sheet still on screen, `fail` writes the inline error — with a timeout belt, the same grammar `walletSendWait` uses in `home.html`. |
| **A-4** | **MAJOR** | `src/styles/components/message-bubble.css:409` | **A9 puts the outgoing timestamp below AA.** `--text-bubble-sent-meta` = `--primary-50` = `#e9ecf3`; the sent bubble is `#1956b2` (`tokens.css:481,696,987` — identical in both themes). Computed: **5.89:1 before A9, 3.73:1 at `opacity: 0.7`.** `.c-bubble__meta` is 12 px (`message-bubble.css:388`), so 4.5:1 is required, not 3:1. `> *` hits BOTH `<time>` and `.c-bubble__edited` (`message-bubble.js:450-465`) — two pieces of 12 px text, both now sub-AA, in both light and dark. The read tick and the failed tick are exempted; the timestamp, the one thing that is actually text, was not checked. This repeats the #421 catch ("the flat bubble INTRODUCED a sub-AA dark timestamp (4.28)") and no gate saw it, because the A9 pin is a source-text regex. | Raise the alpha, or dim with a token instead of a magic number. Measured ladder: 0.7 → 3.73 · 0.75 → 4.04 · 0.8 → 4.38 · **0.85 → 4.73** · 0.88 → 4.95 · 0.9 → 5.10. 0.85 keeps Damir's "quieter" and clears AA. Then pin the NUMBER, not the string — `whiteContrast` at `smoke-test.mjs:9505` is the precedent. |
| **A-5** | MINOR | `chats-row-menu.js:262-278` | `confirmRemove` has no latch of any kind. **Reproduced** (`/tmp/probe/p2.mjs`): after `fire()` the CTA still fires on re-activation, and **it fires a third time after the sheet node has left the DOM** (`fired = 3`). This is the root cause under A-1/A-2 and the reason a CSS-only fix is not enough: `pointer-events` does not affect keyboard activation, and `dismissOverlay`'s focus restore can put focus back on a live control. | The `fired` latch in A-1 closes all three paths. |
| **A-6** | MINOR | `chats-row-menu.js:292-295` · `ContactDetails.xaml.cs:279-294` | **No timeout belt on the group ask.** If `setSharedGroups` never lands, `groups` stays `null`, `syncCta` keeps Remove disabled and the hint stays "Checking your groups…" — with no retry and no explanation. The ContactDetails handler builds `args` and sends inside ONE `try`, so a null `friend` or any throw means **no answer at all** and the A4 strip skeletons forever; `HomePage.onSharedGroupsFor` is defensive and always answers. A8 got a 2.5 s belt (`chat.html:2550`); A4/A5 got none. | Give the sheet the same belt: `setTimeout(() => { if (groups === null) sheet._setGroups([]); }, 2500)`, cleared on the answer. Move the `sendUiCommand` in ContactDetails outside the try, as HomePage does. |
| **A-7** | MINOR | `message-menu.css:130` · `chat-info.css:673` | **The new reduced-motion escapes are UNPINNED.** Prescribed mutation (d) deleted BOTH — `.c-delete-chat__check { transition: none }` and the skeleton `animation: none` — and the suite ran fully green (`BASELINE OK — 2937 pass / the 3 KNOWN`). The skeleton shimmer is an **infinite** opacity animation, so this is the one that matters. The house has the pin shape already (`smoke-test.mjs:11821`, iOS-62). | Add two pins in the Batch A block, in the `@media (prefers-reduced-motion: reduce)[\s\S]{0,N}?` form the suite already uses. |
| **A-8** | MINOR | `message-menu.css:180-181` · `chats-row-menu.js:222-224` | **The sheet's widest label bypasses the overflow gate and can overflow the row.** `leaveAndRemove` is written with `removeLabel.textContent`, so `i18n-overflow-audit.mjs` (which harvests `createButton({ label: …` blocks) never sees it. `keepContact` / `removeContact` ARE harvested but are classed `button-44`, budget **288 px** — while the real box in a two-up `flex: 1 1 0` row at 360 px is **≈140 px** of label. Estimated with the audit's own estimator at 14 px: de-de "2 verlassen & entfernen" = **137 px**, ru-ru = 135 px, fr-fr = 129 px. `.c-button` sets `white-space: nowrap` (`button.css:31`) with no `min-width: 0` and no `text-overflow`, so a flex item cannot shrink below its label and the row overflows the sheet rather than ellipsizing. | Add `min-width: 0` to `.c-remove-contact__actions .c-button` and `overflow: hidden; text-overflow: ellipsis` to its label, or shorten the German/French copy. Either tag the sheet action row as a class in the overflow audit, or drop `{n}` from the label and put the count in the hint. |
| **A-9** | MINOR | `message-menu.css:113` | **A7 dimmed a statement to 2.57:1.** The fixed-on "Delete chat" row is `disabled`, so `.c-delete-chat__opt:disabled .c-delete-chat__opt-label { opacity: var(--opacity-disabled) }` (0.4) applies. Computed on `--surface-menu`: **2.57:1 light, 3.34:1 dark.** The OLD shape was `<label>` + a disabled `<input>` — the text stayed at ~16:1 and only the native box was dimmed. WCAG exempts inactive components, but this row is not an option the user could pick; it is the sentence that states what the action does. Its tick circle also stays fully saturated, so the row reads "ticked" and "unavailable" at once. | Keep the fixed row's label at full contrast (scope the dim to a genuinely optional disabled row), or drop the disabled checkbox and render that line as plain body copy above the one real toggle. |
| **A-10** | MINOR | `chat-info.js:794` | **`sharedGroups !== undefined` is dead code, and `loading` is overloaded.** The destructure default is `sharedGroups = null` (`:157`), so an omitted arg and an explicit `undefined` both arrive as `null` — the `!== undefined` test can never be false. **Verified** (`/tmp/probe/p4.mjs`): omitted/undefined/null all behave identically. The gate that actually decides is `(sharedGroups !== null \|\| loading)`, so **`loading: true` alone renders the shared-groups skeleton on a 1:1 surface that will never be fed.** One flag drives two unrelated loads (the member roster and the shared groups). Latent today — `contact_details.html:372` sets `loading: state.sharedGroups === null`, and `chat.html` never builds `kind:'contact'` — but it is a trap for the next caller. | Drop the dead test. Gate the strip on its own signal, e.g. `sharedGroupsLoading`, or on `sharedGroups !== null \|\| sharedGroupsAsked`. |
| N-1 | NIT | `message-menu.css:131` | `[aria-checked='true'] > .c-delete-chat__check` is the **only unqualified `aria-checked` selector in the system** — the other nine (`contacts-shell.css`, `contact-row.css`, `settings-shell.css`) are all block-scoped. It works today because nothing else owns that child class. | Scope it: `.c-delete-chat__opt[aria-checked='true'] > …, .c-remove-contact__row[aria-checked='true'] > …`. |
| N-2 | NIT | `chats-row-menu.js:282-289` | **`onKeep`, `sheet._removed`, `origFire` and the `onRemove` reassignment are all dead.** No caller anywhere passes `onKeep` (grepped across `src/`); `openDeleteFlow:355` does not. So the whole reassignment exists only to set a flag nothing reads. The reassignment itself is legal and `confirmRemove` does see the new value (`fire` closes over the binding, not the value) — but it makes the fire path harder to reason about, which is where A-1/A-2 live. | Delete the machinery, or wire `onKeep` in `home.html` if a "contact kept" toast is wanted. |
| N-3 | NIT | `chats-row-menu.js:286` | A GROUP sheet still accepts `_setGroups`: it sets `groups` and calls `renderGroups`, which returns at `if (!groupsEl) return` — so `syncCta()` at the end of `renderGroups` is never reached and the stored list is read by nobody. Harmless, but the state is now inconsistent with `isGroup`. | Make `_setGroups` a no-op when `isGroup`. |
| N-4 | NIT | `chat-info.js:641` | **"Members (0)" is shown while three skeletons render.** Verified for a bot and a group with `loading: true`. The panel states a count it does not know. | Suppress the count while `loading && !members.length`. |
| N-5 | NIT | `chat-info.js:639` | A GROUP with a settled empty roster gets **no members section at all** — the gate is `(members.length \|\| kind === 'bot' \|\| loading)`. After `chat.html`'s 2.5 s timeout the whole section disappears from the panel. A1 deliberately gave the bot an honest note; the group keeps the old silence. | Either extend the honest note to groups, or state the intent in the comment so the asymmetry is a decision. |
| N-6 | NIT | `chats-row-menu.js:183-186` | The `role="status"` hint is created **with its text already set** and then inserted. A live region that enters the DOM already populated is normally not announced; only later `syncCta` writes announce. The first message ("Checking your groups…") is likely silent for a screen-reader user. | Insert the region empty, then set the text on the next task, or move the initial copy into a normal `<p>` and keep `role="status"` for the changes. |
| N-7 | NIT | `chat-info.js:812` | Without `onOpenGroup` the shared-group row is `row.disabled = true` — a dead button styled exactly like a live one (`.c-chat-info__shared-row:disabled` only changes the cursor), skipped by Tab, with no reason given. | Render a non-interactive `div` when there is no handler, as the member list already does. |
| N-8 | NIT | `chats-row-menu.js:132,248` | `.c-delete-chat__check` is reused inside the `c-remove-contact` block. A future edit to the delete-chat circle silently changes the remove sheet. | Give the remove sheet its own class, or rename the shared one. |
| N-9 | NIT | `chat-info.js:955-958` | A3 makes the destructive rows the first content controls after Back in the tab order (after the hero photo button, or after the three quick actions on a contact). That is Damir's intent, but it is worth a line in the docblock: keyboard and switch users now meet "Delete chat history" first. | Note it, or leave a one-row gap. |

### Prescribed mutations — results

| Mutation | Result |
|---|---|
| (a) restore "intent only", drop the two `bridge.send` lines in `home.html` `onPersist` | **CAUGHT** — the A6 SHELL pin failed |
| (b) `danger` back to `body.append(danger)` at the end | **CAUGHT** — both A3 pins failed |
| (c) `maskRow = blind` (drop `&& kind === 'group'`) | **CAUGHT** — the A1 pin failed |
| (d) drop the reduced-motion escapes (both new ones) | **NOT CAUGHT** — full green run. See A-7 |
| (e) remove the leave-first block from `SContacts.removeContact` | **CAUGHT** — the A5 C# pin failed |

Mutations (b) and (c) needed a bundle rebuild in the scratch copy before they took effect —
the executed pins load `src/demo/*.html`, which run `src/demo/spixi.iife.js`. That is the
project's build model and not a defect, but it is worth remembering: **a component edit is
invisible to the executed pins until `build-demo-bundle.mjs` runs.**

### Pin-quality notes

* The A5 "blocked re-opens the question" pin (`smoke-test.mjs:14413`) calls
  `setRemoveSheetResult` on a sheet that was **never fired**, so the sheet is genuinely open.
  The real flow closes the sheet first. The pin proves the function works; it cannot prove the
  flow reaches it (finding A-3).
* The A9 pin is a source-text regex. It would have passed at any alpha. See A-4.
* `smoke-test.mjs:14345` is coupled to a blank line between two statements
  (`deletedChats\.delete\(addr\);\s*\n\s*const groups = \[\];`). A harmless reformat breaks it.

---

## 2. VERIFIED CLEAN

* **A3 anchor safety.** `hero` is appended to `body` unconditionally (`chat-info.js:272`), and
  `.c-chat-info__money` is a DIRECT child of `body` when it exists and is never appended empty
  (`:399`). `body.querySelector('.c-chat-info__money')` cannot match anything else. Both
  `insertAdjacentElement('afterend', …)` targets are always in `body`.
* **The `onRemove` reassignment is correct JavaScript.** A destructured parameter is a mutable
  binding; `fire` closes over the binding, so `confirmRemove` reads the wrapper. The wrapper is
  installed before `openSheet`, so no fire can precede it.
* **The `liveRemoveSheet` latch handles two peers in a row.** `onDismiss` clears it only with
  `if (liveRemoveSheet === sheet)`, so a late dismissal of sheet A cannot clear sheet B; and the
  address test drops peer A's late answer. Both verified — `setRemoveSheetGroups('SOMEONEELSE')`
  returns `false`, and P3 shows the answer dropped once the node is gone.
* **The `[aria-checked='true'] > .c-delete-chat__check` child combinator matches both rows.**
  `deleteCheckbox` does `row.append(txt, check)`; `renderGroups` does `row.append(nm, check)`.
  The circle is a direct child in both. Specificity (0,2,0) beats `.c-delete-chat__check` (0,1,0)
  and it comes later in source order.
* **`deleteCheckbox`'s `api` is referenced correctly.** `api` is initialised before the listener
  is attached, the getter reads the live attribute, and `cbMedia.input.checked` at click time is
  therefore accurate. Proven by the executed A7 pins.
* **Keyboard on `role="checkbox"` buttons.** Space and Enter both activate a `<button>` → the
  click handler toggles `aria-checked`. Correct.
* **Focus on sheet open lands on the SAFE action.** `openOverlay` has no `[data-autofocus]` to
  find, so it takes the first focusable — verified as **"Keep contact"** (P3). Group rows are
  inserted before the hint, i.e. earlier in DOM order than the actions, so a late answer never
  steals focus.
* **Focus after step 1.** The sheet opens before the modal dismisses, so `dismissOverlay` sees
  focus outside the modal and does not restore it. Focus stays in the sheet.
* **"Keep contact" cannot double-fire.** The second `dismissOverlay` returns false; `onKeep`
  fires once (P2, R2). Esc / back also fire `onKeep` exactly once and never `onRemove` (P1, P4).
* **A8 skeleton a11y.** `aria-busy` on the list, `aria-hidden` on the rows, and
  `listEl.removeAttribute('aria-busy')` on the settled path. The shell's belt is real:
  first member or 2.5 s ends it, and both `openChatInfo` and `closeChatInfo` reset it per peer.
* **The `role="alert"` error unhides BEFORE it takes text** (`chats-row-menu.js:287`) — the
  correct order, and the region is in the DOM from open.
* **Tokens.** All 28 `var(--…)` in the added CSS resolve in `src/styles/tokens.css` (mechanical
  check over the diff's added lines). No literal colours, no invented tokens.
* **Contrast of everything else new** (computed, both themes):
  unchecked select-circle ring 4.30 / 4.71 light, 5.81 / 5.55 dark (needs 3:1) ·
  checked circle vs ground 6.10 / 6.48 · check glyph on the filled circle 6.68 / 7.49 ·
  inline error text 6.36 / 7.71 · hint and section title 6.44 / 9.09 · row name 16.11.
  All pass. A-4 and A-9 are the only two that do not.
* **i18n.** `extract-strings.mjs --check`: 758 keys, **0 fallback conflicts**.
  `verify-locales.mjs`: **ALL LOCALES CLEAN** (parity 0/0, placeholders 0, empty 0, tokens 0).
  `i18n-lint.mjs`: clean. `i18n-overflow-audit.mjs`: **NO BREAKERS** (the 7 ellipsizing topbar
  titles are pre-existing and unrelated). All 20 new keys are in `en-us.json` and in all seven
  shipped-locale drafts. **No em-dash and no en-dash in any new value.** The five hidden locales
  (cn/id/it/ja/lt) fall back to English, which is the #256 posture.
* **`syncCta`'s early return for `isGroup` is correct** — `groupsEl` and `hint` are null for a
  group and the CTA label is fixed at creation. The group branch never asks for groups, and
  `renderGroups` / `blockersLeft` both handle `groups === null`.

---

## 3. Two questions the brief asked, answered

**"Two different titles for the same action on two surfaces — acceptable or a NIT?"**
Not a NIT. They are two different actions. `chat-info.js`'s `removeContactTitle`
(`'Remove ' + name + '?'`) titles the **confirm** for the contact-details danger row, which
removes directly. `removeSheetTitle` ("Remove contact?") titles the **sheet**, which first
explains the blockers and offers to leave them. Naming the peer in one and not the other is
defensible: the sheet already leads with the peer header. Leave it.

**"Is the disabled fixed-on row announced?"**
Yes — a disabled `<button>` stays in the accessibility tree and both NVDA browse mode and
VoiceOver reach it, announced as dimmed. It is correctly out of the Tab order and out of
`overlay.js`'s `focusables()`, so the modal still autofocuses Cancel. The real problem with that
row is not the announcement; it is the 2.57:1 contrast (A-9).

---

## 4. Suggested order of work

1. **A-1 + A-2 + A-5** — one `fired` latch in `openRemoveContactSheet` plus a latch on the
   step-1 action. Small, and it closes a destructive double-send.
2. **A-3** — at minimum swap `isConnected` for `isOverlayOpen` in both setters, so a refusal
   always produces feedback. The pending-state rewrite is the better fix if there is room.
3. **A-4** — raise the A9 alpha to 0.85 and replace the source-regex pin with a computed one.
4. **A-7** — two reduced-motion pins.
5. A-6, A-8, A-9, A-10 and the NITs as the batch allows.

Nothing in this scope touches money, the chat isolation wall (#221) or the frozen bridge.

*Probes kept at `/tmp/probe/p1.mjs` … `p4.mjs`; scratch tree at `/tmp/mut/Spixi`.*
