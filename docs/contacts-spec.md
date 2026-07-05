# Contacts spec — FAB picker · add-contact · create-group (Phase 1 #2)

Session 2026-07-05 (fable, Mac). Interview picks locked with Damir (3 rounds, 10
picks) — see DECISIONS row for this batch. Merge-safety rule active: **no edits
to `settings-shell.js` / `settings-screens.js` / `settings-backup.js` /
settings wiring in `settings.html`** (PC batch pending merge, handoff-fable-next-batch.md).

## 1. Scope + picks

| Area | Decision (Damir) |
|---|---|
| Entry | Chats-shell **FAB** no longer opens the Start sheet — it opens the **contacts picker** (full takeover view) with two top actions: **Add contact** · **Create group** |
| Picker list | ALL contacts, A–Z, search; tap = **open the 1:1 conversation**. Pending (request-sent) contacts SHOWN with a Pending badge; tap opens the chat in its request-sent state |
| Add-contact | Dedicated screen. **Address-only** (bridge-frozen); paste/enter + QR/scan entry + send request |
| Post-add | **Open the conversation** (request-sent latched state visible) |
| Create group | **Built this batch**, two-step: multi-select on the picker → **group-setup screen** (avatar · name · member chips · blind toggle · Create). UI premiumized |
| Blind groups | Toggle exposed in group setup with a one-line explanation |
| Contact profile | EXISTS — `createChatInfo({ context:'contact' })` (#142③); picker/profile wiring only |
| Non-friend profile | **Minimal + cancel** — avatar/name/address + Pending badge + Cancel request; money/call/chat hidden until accepted |
| Topbar Contacts (round 4) | Chats-shell topbar right icon opens the **directory**: same picker, `purpose:'directory'` — tap = **contact details** (accepted → chat-info profile; pending → minimal profile) |
| Create group in directory | **NO (fable call, Damir delegated):** group creation is a *start* act and stays with the FAB; the directory is for finding/inspecting people. Duplicating it adds a second path to maintain and muddies the FAB = "start something" model (Signal/Telegram precedent: New group lives under compose). Add contact stays in both — it's directory management |
| Demo | Extend `src/demo/chats.html` (FAB flow end-to-end); `settings.html` untouched |

Out of scope: Scan shell (Phase 1 #3 — scan button stubs the nav), nickname
lookup (frozen bridge is address-only; §8 ask logged), real conversation open
(chats demo has no chat surface — mock inserts the pending row + toast).

## 2. Bridge mapping (frozen — bridge-audit-A.md)

### Add-contact (ContactNewPage §3, `bridge-audit-A.md:186-217`)

| Direction | Command | Use |
|---|---|---|
| out | `ixian:request:<address>` | Send contact request (C#: validates ExtendedAddress, rejects self + existing, adds `RequestSent`, `sendContactRequest`) `bridge-audit-A.md:198` |
| out | `ixian:checkAddress:<address>` | Live validation; success → `onValidAddress()`, **silent on failure** `bridge-audit-A.md:201` |
| out | `ixian:quickscan` | Native ScanPage → result via `setAddress` `bridge-audit-A.md:199` |
| out | `ixian:error` | JS-side validation failed (legacy grammar) `bridge-audit-A.md:197` |
| in | `setAddress(address)` | Preset / QR result `bridge-audit-A.md:208` |
| in | `onValidAddress()` | checkAddress success `bridge-audit-A.md:209` |

**Validation contract:** `checkAddress` never answers "invalid" — so the field
can only *confirm* validity live (✓ affordance). Inline error fires on **submit**
(local length/format gate 20–128 chars per QR-accept rule `bridge-audit-A.md:200`,
then C#-side alert path stays as the backstop). No red-border-while-typing.

### Picker + group select (WalletRecipientPage §14, `bridge-audit-A.md:518-544`)

| Direction | Command | Use |
|---|---|---|
| in | `clearContacts()` / `addContact(address, nickname, avatarPath, online, type)` / `noContacts()` | Roster (type: 0 normal · 1 group · 2 bot/no-group) `bridge-audit-A.md:537-540` |
| in | `setMultiContactMode()` | Multi-select allowed `bridge-audit-A.md:538` |
| in | `loadAvatar(filePath)` | Group-avatar preview after native pick `bridge-audit-A.md:541` |
| out | `ixian:select:<flag+name>:\|<addr>\|<addr>…` | Selection result; **first char of name slot = blind flag** ('1' blind / '0' normal) `bridge-audit-A.md:530` |
| out | `ixian:avatar` | Native pick+resize 960² → temp path `bridge-audit-A.md:531` |
| out | `ixian:newcontact` | Chain to add-contact `bridge-audit-A.md:529` |

**⚠ Group-name parse hazard:** C# splits on `name + ":|"` — a name containing
`:|` breaks parsing (`bridge-audit-A.md:544`). FE gate: name must be non-empty
after trim and must not contain `:|`; inline error, never sent.

### §8/§9 asks (log in ARCHITECTURE, not new commands)

- §9: roster `addContact` has **no pending flag** — picker needs it to badge
  request-sent contacts (Damir pick). Until then: mock only; real shell can
  infer from chat model if the consolidated shell owns both.
- §8 (carried): nickname/handle lookup for add-contact (address-only today).
- §9: BE should ALSO sanitize `:|` server-side (FE gate is not a boundary).

## 3. Views (all in `src/components/contacts-shell.js` + `src/styles/components/contacts-shell.css` — NEW files)

### 3a. `createContactsPicker(state, opts)` — the FAB view + directory

`purpose: 'start' | 'directory'` — 'start' (FAB): Add contact + Create group
actions, tap = `onOpenChat`. 'directory' (topbar Contacts): Add contact only,
tap = `onViewContact` → contact details. Multi-select is 'start'-only.

### 3a-ii. `createPendingContact(opts)` — non-friend profile

Minimal + cancel (Damir pick): hero card (avatar-80 · name · address ·
Pending badge · waiting note) + ONE action **Cancel request** →
`onCancelRequest(ctrl)` (#141-m4 guarded, loading latch, inline fail).
Bridge: `ixian:undorequest` already removes the friend
(`bridge-audit-A.md:86`) — no separate Remove row. Accepted contacts open the
full `createChatInfo({ context:'contact' })` profile instead.

**Parity rule (Damir demo pass):** the directory-opened profile carries the
SAME controls as the chat-info contact page — one component, fully fed:
nickname edit (`ixian:userdefinednick`), Message/Pay/Request, payment activity
(`addPaymentActivity`), Remove contact (`ixian:remove`). Only chat-side rows
(disappearing messages, delete history) stay behind per #142③. Smoke-guarded.

- Topbar `variant:'view'`, title **Contacts** (multi-select: **Select members** + live count), `onBack`.
- **Action rows** (top, card surface, `.c-disc` atoms): `user-plus`→fallback
  `user-circle` glyph **Add contact** (accent disc; `user-plus` missing from the
  registry, `user-circle` is the sanctioned interim per the code comment) ·
  `users` **Create group** (primary disc). Hidden in multi-select mode.
- `c-search-field` under the actions; substring match on name+address
  (chat-list grammar, #144 search semantics: every match shows).
- List: A–Z by display name (address-only contacts sort by address, grouped
  after named ones), `createAvatar` 48 + name + one-line address, online dot,
  **Pending** badge (`c-badge` warning tonal) for request-sent contacts.
- Tap: single mode → `onOpenChat(contact)`; multi mode → toggle check
  (leading 24px check circle), pending + type-2 rows **disabled** in multi mode
  (can't group-add unaccepted contacts/bots).
- Multi-select footer: full-width `button/56` **Next (N)** — enabled at N≥1,
  `onNext(selection)`.
- Empty roster → `noContacts` state: illustration-slot + copy + Add contact CTA.

### 3b. `createAddContact(opts)` — dedicated screen

- Topbar view, title **Add contact**.
- Address field (wallet-send field grammar `wallet-send.js:104-147`): input +
  trailing **scan** icon-button (`onScan` — stub to Scan shell), paste-friendly.
- Live validity: debounced `opts.onCheckAddress(address, ctrl)` — `ctrl.done()`
  = show ✓ confirm affordance; silence = neutral (per contract above).
- `setAddress(address)` export for QR/preset returns.
- Primary CTA `button/56` **Send request** → local gate (trim, 20–128 len) →
  fail = inline `role="alert"` error under the field (`ixian:error` grammar) ·
  pass = `onSendRequest(address, ctrl)` with #141-m4 try/catch, one-shot ctrl:
  `setLoading` → `done` = **setSuccess "Request sent"** then `onOpened(address)`
  (shell opens the conversation) · `fail(msg)` = inline error, button restored.
- Self-add / duplicate come back through `fail` (C# rejects both,
  `bridge-audit-A.md:198`) — honest copy, no alert.

### 3c. `createGroupSetup(selection, opts)` — step 2

- Topbar view, title **New group**, back returns to picker **with selection intact**.
- **Hero card**: avatar slot 80 (tap → `onPickAvatar(ctrl)` → `ixian:avatar`;
  preview via `setGroupAvatar(path)`; placeholder = `users` glyph disc) +
  group-name field (counter optional; inline error for empty / `:|` per §2).
- **Members card**: count header + dismissible `c-chip` per member (removing
  below 1 disables Create; removed members restored via back-to-picker).
- **Blind group card**: switch row (`.c-disc` info) — label **Blind group**,
  sub "Members can't see each other's identity — only you, the creator, can."
  Default OFF.
- CTA `button/56` **Create group** → gates → `onCreate({ name, blind, addresses }, ctrl)`
  (#141-m4 guarded, one-shot): loading → done = shell emits
  `ixian:select:<flag+name>:|addr|…` and opens the group · fail = inline error.

### 3d. Wiring (shell/demo glue)

- FAB click → mount picker as takeover panel (chat.html `.demo-sendpanel`
  pattern, `chat.html:687` topbar-close precedent).
- Add contact → push add-contact panel; success → pop both, insert/open convo.
- Create group → picker flips to multi mode (`enterMultiSelect(el)`) → Next →
  group-setup panel → Create → pop all, insert/open group.
- Contact long-press/avatar → profile later (chat-info exists; not this batch's
  demo — the chats list already opens profiles at the chat surface).

## 4. Component reuse

`createTopbar` view · `createSearchField` · `createChip` (dismissible, member
chips) · `createBadge` warning tonal (Pending) · `createAvatar` 48/80 ·
`createButton` + `setLoading`/`setSuccess` (#29 morph) · `.c-disc` atom ·
`createSheet`/`showToast` (demo) · switch = settings switch **grammar** but
markup/CSS local to contacts-shell.css (merge-safety: no settings file edits;
tokens `--switch-track-off`/`--switch-knob` #148① are in tokens.css, shared).

## 5. Demo (`src/demo/chats.html`)

- FAB: sheet replaced by the picker takeover (start-sheet code removed).
- Mock roster built from `CHATS` names + 2 pending entries; type-2 bot row
  ("Ixian News") to show multi-select gating.
- Add-contact mock: `onCheckAddress` = setTimeout ✓ for len ≥ 20 · known-dupe
  address ("4fj2solo") fails with "Already in your contacts" · others succeed →
  pending chat row inserted at top (request-sent excerpt) + toast "Conversation
  opened — chat surface in chat.html".
- Group mock: create → group chat row inserted + toast; avatar pick swaps in a
  gradient preview (no native picker in browser).
- Scan button → toast "Scan shell — Phase 1 #3".

## 6. Smoke assertions (append to `scripts/smoke-test.mjs`, chats.html block)

Functional: picker opens from FAB + rows A–Z · search filters both name/address ·
pending row carries badge + stays tappable · multi mode disables pending/type-2 +
Next counts · group-name `:|` inline error + not submitted · empty name blocked ·
blind flag reaches onCreate payload · add-contact submit latch (loading → success
morph → onOpened) · sync-throw in onSendRequest/onCreate → fail path (#141-m4) ·
member-chip dismiss below 1 disables Create.
Static: new CSS linked in chats.html · FILES order (contacts-shell after
chat-info, before settings-shell) · switch uses `--switch-track-off`/`--switch-knob`
· one error-hue disc max (reservation #147②) · `min-width:0` on row name.

## 7. Open flags for Damir (demo pass)

① Pending rows in the picker — badge copy "Pending" vs "Request sent".
② Group setup back-gesture: selection preserved (spec'd) — confirm feel.
③ Blind-group explainer copy (one line, above) — wording check.
④ Add-contact ✓ affordance placement (trailing in-field vs helper line).
