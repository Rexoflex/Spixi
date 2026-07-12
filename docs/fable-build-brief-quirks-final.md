# fable build brief — FINAL QUIRKS ROUND (Damir F5, 2026-07-12)

> **Work order for the next fable BUILD session.** Damir listed 9 issues after F5'ing
> the #259–#265 batches. This brief triages every one against the real tree (#215
> verify-first ran on all of them — the findings below are checked, not assumed) and
> tells you what to build, what to gate, and what NOT to touch.
>
> **Read first:** this file → `CLAUDE.md` ground rules → `DECISIONS.md` #256–#265 →
> `docs/be-cutover-brief.md`. Canon unchanged: ★ #221 chat isolation · money = C# signs ·
> frozen bridge (new verbs = be-cutover rows, FE gated built+ready) · #215 verify-first ·
> #248 same-line `*SL{}` markers · #175 file tools only.
>
> ⚠ **MODEL NOTE:** the previous batches were built in an **Opus** session by mistake
> (the §5c split says fable builds, Opus reviews). This session is fable. Keep the split:
> **you build; the #46 review runs as a separate Opus pass.**

---

## 0. Session hygiene (before you start)

- The #259–#265 batches are **F5-tested and (presumably) committed** — confirm with Damir.
- Build order is load-bearing: **`build-demo-bundle` → `build-shells` → `smoke-test`**.
  The bundle's PRE-STRIP gate now rejects multi-line/aliased imports (#265) — keep every
  bundled import ONE line, plain names.
- After this batch, the repo **freezes for the audit/refactor** (`docs/audit-refactor-plan.md`).
  Anything you discover that isn't on this list goes into the inventory, **not** into a fix.

---

## 1. The 9 items — triage

| # | Damir's words | Verdict | Class |
|---|---|---|---|
| 1 | Get-app → app details opens FULL SCREEN, should be in the same pane | **BUILD** | small C# |
| 2 | Downloads full screen, should be in the Account pane | **BUILD** (properly this time) | small C# |
| 3 | Incoming call shows once **per pane**; missing nick/avatar on some; the bar too | **BUILD — native cover** | C# presentation |
| 4 | Call excerpts have no icon; "make sure we have all excerpts covered" | **BUILD** | FE |
| 5 | Group reaction excerpt doesn't say WHO; group typing never shows | **PART BUILD / PART BE** | FE + BE |
| 6 | Wallet → Request → no contacts picker | **BUILD** | small C# + FE un-gate |
| 7 | Languages not fully wired, stuff hardcoded | **BUILD — the big one** | FE sweep + BE rows |
| 8 | File transfer needs a **Cancel** (before it starts) + a **Delivered** state | **PART BUILD / PART BE** | FE + BE verb |
| 9 | "You were added to a group by X" chip (like the accepted-request one) | **BUILD if the signal exists** | FE (verify first!) |
| 10 | **Decline on an incoming request needs TWO clicks** to take effect | **REPRODUCE FIRST, then fix** | FE (likely) |
| 11 | ★ **Composer must be locked until the request is accepted + handshake done** — today you can type, the ticks say **delivered/read**, and the peer **never gets it** · plus **Undo/Cancel an outgoing request** (legacy parity) | **BUILD — HIGHEST PRIORITY** | FE (signal + verb both exist) |

---

## 2. Item-by-item

### ① App details in the pane (small C#)

`HomePage.onInstallApp` (`:2257-2271`) and `onAppDetails` (`:2273-2276`) both call
`pushPageLoaded(new AppDetailsPage(…))` with **no column** → full-window.
**Do:** route them into the detail column on wide windows, exactly like the Batch-C form
panes: `pushPageLoaded(page, 4000, "formpane", rightContent.IsVisible ? 1 : -1)`.
Reuse the **same `"formpane"` tag** so add-app → app-details tag-REPLACES cleanly (the
add-app flow's own jump-to-full-window was the dial the #264 review logged).
**Close-audit:** `closeFormPaneOverlays()` already covers `ContactNewPage`/`AppNewPage` —
**extend it to `AppDetailsPage`**.
⚠ The **install CONFIRM stays a modal** (#256 lock) — don't turn it into a pane.

### ② Downloads in the Account pane — do it PROPERLY (small–medium C#)

History: #264 landed Downloads as a col-1 pane → the hub stayed tappable **underneath**
and its sublevels rendered under the pane ("Account unresponsive", Damir) → #265 made it a
full-window takeover as the safe stopgap. Damir now wants it as a real sublevel.
**The real fix (be-cutover S16):** Downloads is a *separate page/WebView*, which is why it
can't be a hub sublevel. Two options — **pick with Damir**:
- **(a) Route the verbs through SettingsPage** (recommended): move `clearFiles`/`addFile`
  pushes + `open`/`delete` verbs onto SettingsPage, render `createSettingsDownloads` as an
  in-hub SUBLEVEL (like Backup/#243, which already works this way). No second WebView, no
  pane-stacking. ★ The C# `..`-traversal guard on `open`/`delete` **must land with it**
  (`docs/security-review-for-be-engineer.md` — still owed).
- **(b)** Keep the separate page but pin it **over the whole Account pane** (stage margin,
  the #245 recipe) so the hub can't be tapped underneath.
**Do NOT** re-land the naked col-1 pin — that's the bug Damir already reported.

### ③ ★ ONE incoming call across all panes (C# presentation) — the biggest of the three "real" items

**Root cause (already ruled, DECISIONS #263/#265):** each pane is its own WebView (★ #221),
so a DOM ring can only cover **its own** pane. The C18 broadcast makes every pane ring →
**N rings, N bars** (Damir's images 2 + 3). It also explains the missing nick/avatar: panes
without a roster (`resolveCaller`) fall back to the truncated address.
**The end-state Damir wants = a NATIVE full-window call surface.** Build it:
- A C#-presented call page/overlay (the **lock-screen precedent**: `pushModalLoaded` →
  full-span, zero stage margin, covers every column incl. the rail) that renders the ring
  (caller avatar + nick + Accept/Decline) and, once answered, the in-call bar.
- Simplest path that reuses everything: a **new tiny shell** (`src/shells/call.html`) hosted
  by a new `CallPage : SpixiContentPage`, rendering the existing `call-overlay.js` /
  `callbar.js` components. C# owns identity (it has the Friend) → push nick + avatar
  (`Utils.imageToDataUri`, X1) so the identity is **always** right.
- Then **stop broadcasting the ring/bar into the shells**: `broadcastCallState` /
  `broadcastCallBar` / `broadcastHideCallBar` become "present/dismiss the native call
  surface". Keep `acceptsCallPushes` as the safety gate (★ mini-apps must still get NOTHING).
- `call-ui.js` and its 12 shell wirings then become **dead code** → remove (or keep exactly
  one, for the demo, and say so).
- ★ Keep: the ring TIMEOUT (#265, 45s both ends) and the C18b teardown guards. Verify the
  native surface is dismissed on every path (accept · decline · remote hang-up · timeout ·
  app background).
⚠ **Verify on-device before you commit to the shape** (#215): a modal WebView over the grid
must not be dismissable by back (the lock's `pushModalLoaded` machinery already guarantees
this — reuse it, don't reinvent).

### ④ Call excerpts + a FULL excerpt audit (FE)

Damir: *"make sure we have all excerpts covered."* Do it as an **enumeration**, not a spot fix.
- **C# side (`HomePage.getFriendMessageHelper`, ~:1456-1545):** enumerate EVERY
  `FriendMessageType` → the excerpt string it produces. #265 added missed/no-answer; check
  file · payment (request/sent/received) · app invite · reaction · contact request/accepted ·
  group events · voice call (answered) · standard.
- **FE side (`home.html excerptFromRaw` / `canonExcerptText` + `chatlist-item.js`
  `EXCERPT_GLYPHS`):** the shell reverse-maps C#'s localized phrases to a glyph. The new call
  phrases aren't mapped → **no icon** (Damir's image 4). Add them **via `*SL{}` carriers**
  (the #252 equality-carrier mechanism — locale-proof; a hardcoded English match is exactly
  the bug in item ⑦).
- **Deliverable:** a table in the spec — *message type → C# excerpt string → FE glyph* — with
  every row filled or explicitly marked "no glyph". Missing glyphs → icon exports for Damir.

### ⑤ Group reaction excerpt (WHO) + group typing — ⛔ **DAMIR: OUT OF SCOPE, do not build**

Kept here only so the BE rows are precise. **No FE work this round.**

- **Reaction excerpt:** C# pushes the reaction as a bare lastMessage; there is **no sender**
  in the signal → "X reacted" is **not derivable**. → **BE row (extend CH8)**: add the
  reactor's nick/address. Build the FE to render it and **gate it OFF** until the arg lands.
- **Group typing: BE-BLOCKED, CONFIRMED.** #264 un-gated the FE send + the receive path is
  generic, and Damir's 2-device test shows nothing → the **relay doesn't forward `msgTyping`
  in groups** (be-cutover **C21(a)**). **Do not "fix" this in FE** — there's nothing to fix.
  Consider **re-gating the send** (it's currently emitting into the void — harmless, but a
  pointless packet per keystroke-second in every group). Damir's call; log it either way.

### ⑥ Wallet → Request → contacts picker (small C# + FE un-gate)

Verified: `createWalletReceive` **already builds** the "request from a contact" strip but
`home.html` omits `onSendRequest` → the component hides it (deliberate: `ixian:sendrequest`
is a **WalletReceivePage** verb, dead on HomePage → would falsely confirm "sent").
**Do:** copy the verb into `HomePage.onNavigating` — `WalletReceivePage.xaml.cs:93-155`
(parse + validate) + `onRequest` (`:185-196`, `Node.addMessageWithType(requestFunds)` +
`StreamProcessor.transactionRequest`) are **fully self-contained** → lift them almost
verbatim. Then pass `onSendRequest` in `home.html`'s `mountWalletReceive` → the strip
appears, with the contact picker the component already has. **be-cutover W8 → LANDED.**
★ This is a REQUEST (a chat message), **not a payment** — no signing, money path untouched.

### ⑦ ★ Languages — the systematic sweep (FE, the biggest FE item)

Damir's images 6/7 show English under a real locale. Three distinct causes — find and fix
**all three**, don't spot-patch:
1. **Un-threaded strings:** a component mounted without `strings` falls back to English.
   The `getStrings()` default (auto-picks `window.SL`) covers most, but any call site that
   passes an explicit `{}` or a partial object **overrides it** (this was the #257 home.html
   bug — `const strings = {}`). **Grep every `strings:` / `strings =` call site** in
   `src/shells/*` and `src/bridge/*` and prove it resolves to the live dictionary.
2. **Hardcoded English in the shells:** any literal UI string in `src/shells/*.html` that
   isn't `window.SL.x || 'fallback'`. `extract-strings.mjs` now sweeps the shells — run it
   with `--check` and fix every unextracted literal.
3. **C#-composed strings** (the wallet screenshot smells like this): C# pre-composes some
   text (`_SL(...)`) and the FE renders it verbatim — those follow the **C# language**, which
   is correct — but any C# string with **no `_SL` key** (hardcoded English C#-side, e.g.
   `HomePage:854` "No recipient selected") is a **BE row** (`[i18n-C#]`, already logged).
**Verify:** `?lang=de-de` on every shell + `?lang=pseudo` (leak test) + `i18n-lint.mjs` +
`pseudo-locale-smoke.mjs` must be clean, and then a **real device language pick** (not just
the query param). Deliverable: a per-shell checklist of what still renders English and WHY
(FE bug / C# string / missing translation).
★ The 5 dictionary-less locales (cn/it/id/ja/lt) are HIDDEN by design (#256) — that's not
this bug.

### ⑧ File transfer: Cancel + Delivered — ⛔ **DAMIR: OUT OF SCOPE, do not build**

Kept here only so the BE row is precise. **No FE work this round** (not even gated).

**Verified:** `SingleChatPage.onNavigating` has **`ixian:acceptfile:<id>`** — and **NO
cancel/decline/abort verb anywhere**. So:
- **Cancel = BE row** (new verb, e.g. `ixian:cancelfile:<id>` → `TransferManager` abort +
  a status push). **Build the FE button, gate it** behind `bridge.cap('cancelFile')`, wired
  and ready — never a dead button (the #214 canon).
- **"Delivered" on complete:** check whether the existing progress/complete push can carry
  it (the outgoing sender already gets per-packet ticks — #193). If the completion signal
  exists, this half is **FE-only**: add a terminal *Delivered* state to the file bubble
  (mirroring the message tick grammar). If it doesn't, it rides the same BE row.

### ⑨ "You were added to a group by X" chip (FE — VERIFY FIRST)

Damir wants the #264 accepted-request **event-chip** treatment.
★ **#215 — verify before building:** grep the lang files for an added-to-group string
(**there is none in `en-us.txt` today**) and `StreamProcessor`'s `createGroup` handler
(`:529-533` — it only sets `shouldRefreshContacts`). If C# emits **no message** for
"you were added", there is **nothing to render** → this is a **BE row** (emit a system
message on group-join, like `global-friend-request-accepted` does for contact accepts).
If a message *is* emitted somewhere, reuse the **exact** #264 mechanism: a `*SL{}` template
carrier with a `{0}` slot → centered event chip → `truncateAddressMiddle` on the subject.
**Do not invent an English-only string.**

### ⑩ Decline on an incoming request takes TWO clicks (FE — reproduce before you touch it)

Damir: *"Decline incoming request needs to be clicked twice to produce the result."*

**Start from what the code actually does.** `createContactRequest`
(`src/components/contact-request.js:60-69`) wires Decline to a **confirmation modal**
(*"Decline request? — {name} won't be notified…"* → Cancel / Decline). So **two clicks is
the DESIGNED path**: click 1 opens the confirm, click 2 (in the dialog) declines.

Three possible realities — **find out which before changing anything**:
1. **Working as designed, but the confirm is invisible/unstyled** on the surface Damir used
   → the first click *looks* like a no-op. **Prime suspect:** the surface that renders the
   request doesn't link `overlay.css` (or passes a bad `host`), so the modal mounts but
   doesn't paint. Check EVERY consumer of `createContactRequest`:
   - the **chats-list request card** (`home.html`, the CH2/#219 Requests feed)
   - the **in-chat request pane** (`chat.html showRequestPane`)
   Verify each links `overlay.css` **and** passes a real `host`.
2. **Working as designed and visible** — then it isn't a bug, it's a UX call: does Damir want
   a confirm on Decline at all? (Accept has no confirm; Decline is reversible — the peer can
   re-request. **Recommendation: drop the confirm**, make Decline single-click, and keep the
   confirm only for the *destructive* actions that can't be undone.) **Ask him.**
3. **A real double-fire/latch bug** — e.g. the first click is swallowed by a re-render (the
   Requests feed re-flushes and replaces the card node between mousedown and click), so the
   handler lands on a detached element. If so, the fix is the standard one: latch the action
   on the model (address), not on the DOM node, and make the row survive the re-render.

⚠ **Do not confuse this with Q18** (*"reject removes it temporarily but the row returns"*) —
that one is the **decline-tombstone BE row** (a declined peer's next request re-adds them).
Different bug, still BE-gated.

**Deliverable:** state which of the three it was, in the DECISIONS row. If it turns out to be
(2), the change is a UX decision Damir signs off on — not a silent removal.

### ⑪ ★ HIGHEST PRIORITY — lock the composer until the contact is ACCEPTED, and let the user CANCEL an outgoing request (FE only; both the signal and the verb already exist)

**The bug (Damir's two screenshots, and it's the worst one on this list):** after sending a
contact request you can **type and send**. The message renders on the sender's side with
**delivered + read ticks** — and the peer **never receives it** (their legacy client shows
nothing). The app is **lying about delivery**. The message is written to the local store and
the status flags come from that local record, not from a real ack.

**Everything needed is ALREADY THERE — the shell just ignores it (#215-verified):**
- **The signal:** `SingleChatPage.onLoad:646-652` — when `friend.state == FriendState.RequestSent`
  C# sets `_waitingForContactConfirmation = true` and pushes
  **`showRequestSentModal("1")`**. **Grep `src/shells/chat.html` for `showRequestSentModal`
  → ZERO hits.** The shell never registered the handler, so the push dies on an undefined
  global and the composer stays live. *(This is the same class as the Batch-A call bug.)*
- **The cancel verb:** **`ixian:undorequest`** exists on SingleChatPage and is already used by
  the INCOMING decline path (`chat.html:1609`). It removes the pending friend. Reuse it for
  the OUTGOING cancel — **no new verb needed.**
- **The unlock signal:** the peer's accept lands as `acceptAdd` → C# re-flushes the chat
  (`clearMessages` + reload) and, on the next `onLoad`, `friend.state == Approved` → **no**
  `showRequestSentModal` push. Also `showCallButton` is pushed only when Approved (`:667`),
  and the "X has accepted your contact request" system message arrives. Pick the most robust
  unlock signal and say which you chose + why (prefer an explicit state over inferring from a
  message).

**Build:**
1. **Register `showRequestSentModal(flag)`** in `chat.html` → enters a **pending-outgoing**
   state.
2. **Lock the composer** in that state. Damir: *"it can be hidden."* Recommended: **replace**
   the composer with a quiet status strip — *"Waiting for {name} to accept your request"* —
   carrying a **Cancel request** action. That's honest (nothing to type into) and gives the
   cancel a home. Do NOT leave a disabled-but-visible input that invites typing.
3. **Cancel request** → `ixian:undorequest` → C# removes the friend. Confirm what the app does
   next (pop back to the chats list?) and make the FE follow it. Consider a confirm — but note
   item ⑩: don't stack two confirms on one flow; be consistent.
4. **Mirror the state on the chats list** — the row already shows "Request sent" (#253 M5).
   Make sure cancel removes it (and the contacts-picker pending badge).
5. ★ **Verify with a 2-device test that no message can be composed or "sent" before the accept
   lands**, and that after the accept the composer returns and messages actually arrive. The
   whole point is that a tick must never lie.

**Also check the same hazard elsewhere:** the shell must not show delivered/read ticks derived
purely from a local record. If a message can be locally "sent" with no real ack in any other
pre-approval state (e.g. a handshaking row), it's the same lie — enumerate and report.

⚠ The `contact-request.js` docblock already says *"Non-contacts keep composer disabled
downstream (#86, **shell duty**)"* — the duty was specified and never discharged. This closes it.

---

## 3. DAMIR'S DECISIONS (2026-07-12) — locked, do not re-litigate

- **③ native call surface: YES — "do the best practice."** Build the C#-presented full-window
  call surface. `call-ui.js` + its 12 shell wirings become **dead code → remove them** (keep
  the components for the demo, and say so in the DECISIONS row). Keep the ring timeout (#265)
  and the C18b teardown guards. Keep `acceptsCallPushes` (mini-apps get nothing).
- **⑤ and ⑧: OUT OF SCOPE — "leave these out for now."** Do **not** build the FE halves, not
  even gated. Log them as BE rows (group typing = C21 · reaction sender = CH8+ · file-cancel
  verb = new). Revisit at the BE cutover.
- **⑪ is the top priority** — it's a correctness bug (the app lies about delivery), not polish.

## 4. Batching

| Batch | Items | Why together |
|---|---|---|
| **Q1 — correctness + panes** | ⑪ composer lock + cancel request · ⑩ decline double-click · ① app-details pane · ② downloads pane | ⑪/⑩ are the two request-flow bugs; ①/② are one C# pane review |
| **Q2 — FE polish** | ④ excerpt audit (full enumeration) · ⑥ wallet request-from-contact (+ its small C#) · ⑨ added-to-group chip **only if the signal exists** (verify first — likely BE) | Chat/list surface, all cheap |
| **Q3 — i18n sweep** | ⑦ | Touches every shell; needs its own verification pass + its own review |
| **Q4 — native call surface** | ③ | Presentation architecture; own batch, own review, on-device verify |
| **BE cutover (NO FE work)** | ⑤ group typing (C21) · ⑤ reaction sender · ⑧ file-cancel verb + Delivered signal · ⑨ group-join message (if absent) · ② `..`-traversal guard · ⑦ hardcoded C# strings | Deferred by Damir; one BE pass |

Order: **Q1 → Q2 → Q3 → Q4.** One batch = one commit = one Opus review.

---

## 4. Non-negotiables (a violation = build failure)

- ★ **#221 chat isolation** — the native call surface is C#-presented; it does NOT merge
  panes or share a JS context. Mini-apps receive **nothing** (`acceptsCallPushes` stays).
- **Money:** ⑥ is a *request* (a chat message). No signing in the WebView, ever.
  **Wallet-send stays LAST** and out of this brief entirely.
- **Frozen bridge:** every new verb is a be-cutover row + a FE capability gate. ⑥'s verb is
  a **copy of an existing WalletReceivePage verb onto HomePage** — that's the sanctioned
  "same page, new host" pattern, not a protocol change.
- **#248:** every `*SL{…}` marker opens and closes on ONE line.
- **No dead buttons** (#214): if the verb doesn't exist, the affordance doesn't render.
- **No hardcoded English** — that's literally item ⑦.
- Bundled imports: **one line, un-aliased** (the #265 gate will fail you otherwise).

---

## 5. Exit criteria

Built + statically verified (file tools; #175) → **DECISIONS row per batch** → docs updated
(`be-cutover-brief.md` rows for every BE-gated half; `polish-roadmap.md`) → Damir runs the
FULL build + F5 → **a separate Opus #46 loop per batch** → commit.

Then: **freeze → `git tag audit-baseline` → `docs/audit-refactor-plan.md` phase 1.**
