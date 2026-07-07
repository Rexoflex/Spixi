# Chat deepening — batch 2 spec (payments · apps · calls · reactions)

*Wiring the four remaining typed-card stubs in `src/shells/chat.html` to the real C# bridge.*
*Sources: legacy `Spixi/Resources/Raw/html/js/chat.js` (JS contract) · `Spixi/Pages/Chat/SingleChatPage.xaml.cs` (C# dispatch + handlers) · redesigned `src/components/typed-bubbles.js` + `reactions.js`. Batch 1 (files + groups) = DECISIONS #178; contract findings = #179.*

## The one decision (BE + Damir) — read first

Everything below is designed around **the frozen bridge and the C# confirm-page flow that already exists**. The only real fork:

> **Does the inline "Pay" button open the existing confirmation page (reuse `ixian:viewPayment`, C# signs there), or sign+broadcast inline from the bubble?**

Recommendation: **open the existing confirm page.** It is **zero new C#**, it keeps an explicit confirm-before-money step (a feature, not a cost), and it preserves every SECURITY.md invariant (WebView emits intent, C# signs). Inline signing needs a new command *and* removes the confirmation screen for a money action — a regression we advise against. The rest of this spec assumes the confirm-page path.

## Effort matrix

| Type | Render faithfully | Action(s) | New C#? | Verdict |
|---|---|---|---|---|
| **Reactions** | parse legacy string → pills | add/remove = existing `ixian:contextAction` | **none** | pure JS, ship now |
| **Apps** | `state` from `appStatus` (already an enum-ish string: Missing/Minimized/else) | Get=`installApp`, Launch/Back=`joinApp` (existing) | **none** (Decline-invite = optional 1 branch) | JS, ship now |
| **Payments** | role+status need a stable signal (see §Enum) | Pay/View = existing `ixian:viewPayment` | **none for action**; **~1–2h for clean role/status enum** | JS action now; small C# for faithful states |
| **Calls** | `addCall` is lossy — no missed/answered/duration | Call-back = existing `ixian:call` | **~½ day**: enrich `addCall` args | needs the small C# first |

## Bridge facts (verified)

Dispatch is an `if/else if` chain on `current_url` in the WebView `Navigating` handler (SingleChatPage.xaml.cs:96+). Adding a command = one branch. Existing verbs this batch reuses:

| Verb | C# handler | Effect |
|---|---|---|
| `ixian:viewPayment:<msgId>` | xaml.cs:201 → `onViewPayment` | incoming `requestFunds` + `!localSender` → `onConfirmPaymentRequest` → **`WalletContactRequestPage` (confirm + sign + broadcast)** (xaml.cs:811-829); `sentFunds` → `WalletSentPage` (details) |
| `ixian:installApp:<encodedURL>` | xaml.cs:211 | install/get app |
| `ixian:joinApp:<appId>` | xaml.cs:216 | launch / rejoin app |
| `ixian:call` | xaml.cs:136 | toggle voice call (initiate if idle) |
| `ixian:contextAction:<action>:<msgId>` | xaml.cs:240 | message actions incl. like/react |

---

## 1. Reactions — zero C#, ship now

**In:** `addReactions(id, reactions)` — chat.js:549. `reactions` is a `;`-joined string of `type:count` tokens: `like:<n>` (heart) and `tip:<amount>` (IXI pill). Attaches to message row `msg_<id>`.

**Component:** `addReactions(row, { reactions:[{emoji,count,own,senders}], tip, onToggle, host, strings })` — reactions.js:33. Re-invoking replaces the set (bridge re-emits the full list).

**Shell wiring (JS only):**

| Legacy token | Component input |
|---|---|
| `like:<n>` | `{ emoji:'❤️', count:n, own:false }` (bridge sends no per-user own-flag → `own:false` in v1; see flag ③) |
| `tip:<amt>` | `tip: '<amt> IXI'` (pre-formatted) |

- Look up the row via the existing `rows` Map (`rows.get(String(id))`); if absent, no-op (parity with legacy null-guard).
- Parse: `reactions.split(';').filter(Boolean).map(...)`. Empty string ⇒ clear (call `addReactions(row, { reactions:[], tip:'' })`).
- `onToggle: (emoji) => bridge.send('ixian:contextAction:react:' + id)` — **confirm the exact action keyword** with BE (`like` vs `react`); the legacy like/tip handlers are triggered from the context menu, not the pill, so verify the keyword the C# `contextAction` switch expects (flag ④).
- Reactions are **non-interactive display in v1** if `onToggle` keyword is unconfirmed — render pills without toggle, still correct.

---

## 2. Apps — zero C#, ship now

**In:** `addAppRequest(id, appid, appname, appimage, address, nick, avatar, time, localSender, sent, read, appStatus, appInstallURL)` — chat.js:1174. `appStatus` ∈ {`Missing`, `Minimized`, else} — already an enum-shaped string.

**Component:** `createAppBubble({ name, iconUrl, state, direction, timestamp, gutter, onGet, onLaunch, onResume, onJoin, onDecline, onCancel, strings })` — typed-bubbles.js:233. states: `invite|invited|missing|in-session|ended`.

**Mapping (JS only):**

| localSender | appStatus | component `state` | button → verb |
|---|---|---|---|
| True | (any) | `invited` | Launch → `ixian:joinApp:<appid>` (onLaunch) |
| False | `Missing` | `missing` | Get → `ixian:installApp:<encodeURIComponent(appInstallURL)>` (onGet) |
| False | `Minimized` | `invite`* | Join → `ixian:joinApp:<appid>` (onJoin) |
| False | else | `invite` | Join → `ixian:joinApp:<appid>` (onJoin) |

`iconUrl = appimage`, `direction` from localSender, `gutter = isGroup && received`.
\*Legacy shows "Back to app" for Minimized; keep the `invite` visual but the join verb is identical. Optional: a distinct label via strings.
**Decline invite** has no legacy verb. Options: (a) omit Decline in v1 (recommended — legacy has no decline either), or (b) BE adds `ixian:declineApp:<id>` = one 4-line branch. → flag ②.

*Note:* `addApp(id, name, icon, publisher)` (chat.js:1243) is the **apps menu**, not a chat bubble — out of scope here.

---

## 3. Payments — action = zero C#; faithful states = small C#

**In:** `addPaymentRequest(id, txid, address, nick, avatar, title, amount, status, statusIcon, time, localSender, sent, read, enableView)` — chat.js:1114.
**Updates:** `updatePaymentRequestStatus(msgId, txid, status, statusIcon, enableView)` — chat.js:1138; `updateTransactionStatus(txid, status, statusIcon)` — chat.js:1161.

**Component:** `createPaymentBubble({ role, amount, fiat, status, insufficient, timestamp, gutter, onPay, onDetails, ... })` + in-place `setPaymentStatus(row, patch)` — typed-bubbles.js:126/221.
roles: `request-in | request-out | sent | received`; status: `actionable | pending | processing | failed | completed | declined | canceled`.

**Action wiring (zero C#):** `onPay` and `onDetails` both emit the existing `ixian:viewPayment:<id>` — for an incoming request that opens the confirm/sign page (`onConfirmPaymentRequest`), for sent funds it opens details. Same button, correct behaviour, no new command.

### The role + status problem (the ~1–2h C# ask)

`title`, `status`, and `statusIcon` are **localized display strings + FontAwesome classes**, not stable tokens. The card needs a `role` (request vs sent, in vs out) and a `status` enum. Deriving them from localized text is fragile.

Two paths:

- **(A, recommended) BE adds two stable args** to `addPaymentRequest` / `updatePaymentRequestStatus`: a `kind` (`request`|`sent`) and a `statusEnum` (the 7 values above), computed from the same C#-side source (`FriendMessageType` + activity/tx status) that already produces the localized string. ~1–2h, mechanical. JS then maps: `role = localSender ? (kind==='request'?'request-out':'sent') : (kind==='request'?'request-in':'received')`. **Signature change ⇒ JS handler + C# call sites land in the same commit.**
- **(B, fragile fallback) v1 string-parse:** derive `role` from `localSender` + `enableView`, show `status` **verbatim** as a neutral badge line (skip the enum-colored badge), and gate the action on `enableView`. Renders, but loses the failed/declined/completed color semantics and the inline Pay affordance nuance.

**Other gaps:** `addPaymentRequest` sends **no `fiat`** and **no `insufficient`** flag → `fiat=''`, `insufficient=false` in v1 (both are C#-known and could be added later). `amount` is already pre-formatted (good). `txid` is only needed for `updateTransactionStatus` correlation — keep a `txid→msgId` index mirroring batch-1's `fileIndex`.

### Inline-Pay (NOT recommended, for the record)

A fully inline pay would need: new `ixian:payRequest:<msgId>` command + a C# handler that signs+broadcasts (bypassing or inlining `WalletContactRequestPage`) + status pushed back via the existing `updatePaymentRequestStatus`. Cost: a new command, a new sign path, and the loss of the confirm screen for money. → SECURITY.md §8 proposal only if Damir explicitly wants it.

---

## 4. Calls — needs the small C# first (~½ day)

**In:** `addCall(id, message, declined, time)` — chat.js:955. Carries only a **localized freeform `message`** + a `declined` bool. Cannot distinguish missed vs answered, and has no duration.

**Component:** `createCallBubble({ missed, declined, direction, directionLabel, duration, timestamp, onCallBack, strings })` — typed-bubbles.js:305.

**Ask BE to enrich the call site** (VoIPManager already knows the outcome + duration): add `missed` (bool), `duration` (seconds or pre-formatted string), and `direction`/`outgoing` (bool). Then JS maps cleanly and `onCallBack → ixian:call` (existing toggle).

**v1 without the C# change:** render `createCallBubble({ declined, timestamp, direction })` using only the `declined` flag; pass the freeform `message` as `directionLabel` so nothing is lost, but title granularity (missed vs answered) and duration are absent. Acceptable stopgap; the enriched signature is the real fix. → flag ①.

---

## Flags for Damir + BE

1. **Calls** — enrich `addCall` with `missed`/`duration`/`direction`? (½ day, unlocks faithful call cards.) Else v1 declined-only stopgap.
2. **Apps** — add `ixian:declineApp:<id>` (1 branch) or omit Decline in v1 (legacy omits it too)?
3. **Reactions** — bridge sends aggregate counts, no per-user `own` flag → pills can't show "you reacted". Add later or accept?
4. **Reactions** — confirm the `ixian:contextAction:<keyword>` the C# switch expects for like/tip toggling (else render display-only).
5. **Payments** — path (A) stable `kind`+`statusEnum` args (recommended) vs (B) fragile v1 string-parse? And later: add `fiat`+`insufficient`?

## Build / wiring notes

- **Frozen bridge, zero new verbs** for reactions + apps + the payment *action*. The only proposed C# is additive args (payments/calls) and one optional decline branch — no protocol changes, no signing in the WebView.
- Reuse batch-1 plumbing: the typed-`kind` row model, the `rows` Map for row lookup, and a `txid→msgId` index (mirror `fileIndex`). Payment/app/call cards are standalone rows (grouping `cont()` already breaks runs across non-text kinds — #178).
- **Components are already in the shipped bundle** (`createPaymentBubble`/`setPaymentStatus`/`createAppBubble`/`createCallBubble`/`addReactions` all export from bundled sources) → no `build-demo-bundle` rebuild needed for the shell; only `build-shells.mjs` to re-inline.
- **Load-timing invariant** (#177): any handler C# pushes on first entry must still work with `bridge.ready()` fired on window `load`. These are all post-load pushes, so no change.
- Verify with the #46 read-only audit loop + Damir F5 in the WinUI app (send a payment request, receive an app invite, place a call, react to a message).
