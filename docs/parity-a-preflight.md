# Parity batch A — PREFLIGHT ANALYSIS (before build)

**Method.** 4 parallel auditors, one per item cluster, read the current tree (`src/shells`,
`src/components`, `src/bridge`), the C# (`Spixi/Pages/**`), and the legacy tree
(`git show 0e85a4b8:…`). Every row below carries file:line in both trees. Read-only; no code
touched. This supplements `docs/fable-build-brief-parity-a.md` — where they disagree, this doc
wins, because the brief was written from the audit's evidence table, not from the code.

**Headline:** 6 of the 11 items have a defect in the prescribed approach. Two of them
(**A7**, **A3**) would ship something *worse* than the current stub. One (**A6**) targets a
component production doesn't use. Two (**A1**, **A4**) prescribe a mechanism that cannot work.
Net effect on scope: batch A stays 11 items, but 4 need a changed plan and 4 dials need answering.

---

## 1. Must-fix defects in the brief (build would ship a bug)

### A7 — the guard as specified DESTROYS the user's message ★
`composer.js send()` calls `onSend(text)` and then clears the textarea **unconditionally**
(`src/components/composer.js:84-92`). The brief says put the guard in the shell send path and
"don't touch composer.js core". Doing that blocks the send *and* wipes 64 000 typed/pasted
characters off screen. Legacy was strictly better: it `alert()`ed and left the text in place
(`0e85a4b8:…/js/chat.js:401-409`).

**Corrected plan:** add an opt-in `maxLength` + `onTooLong` to `composer.js` (default `0` =
today's behaviour byte-for-byte), returning **before** `onSend`. Both entry paths (Enter
`:105-108`, button `:110-113`) funnel through `send()`, so one insertion covers both. Keep a
1-line belt in the shell. Component change → bundle before shells.

**Free win:** name the English fallback exactly `"Text is too long."` and
`scripts/build-locales.mjs:41-47` value-matches it to the legacy id `chat-text-too-long`,
which ships in **all 13 legacy locales** → de/es/fr/pt/ru/sl/sr for free. The brief's "mention
the limit" wording forfeits all seven. Communicate the limit with a counter instead (below).

**Threshold:** keep 64 000 **raw UTF-16**, counted on the *trimmed* text (C# `Trim`s at
`SingleChatPage.xaml.cs:747`). The brief's "~3× inflation" is understated — `encodeURIComponent`
is **9×** for CJK, 6× for emoji, so 64 000 raw → ~576 000 URL chars. Still under the Chromium
2 MB URL cap, so an encoded check can never fire first. A byte-based cap would be *more* correct
but needs BE to state the protocol max → log as a BE ask.

### A3 — a numeric badge would be a lie ★
Two independent problems, both fatal to the spec:

1. **The push is edge-latched.** `SingleChatPage.xaml.cs:2039-2052` pushes **once** per 0↔>0
   transition (`unreadIndicatorDisplayed`, declared `:42`, reset only in `onLoad` `:639`). The
   number is *never* updated while it changes. The brief's "C# pushes on every unread change"
   is false.
2. **The first number includes the chat you just opened.** `onLoad` calls `updateScreen()`
   (`:651`) → push; `loadMessages()` — which zeroes *this* chat's unread (`:1260-1262`) — only
   runs later inside `Task.Run` (`:691`). Because of the latch, that first wrong number is
   usually the only one, and it can never correct downward until it hits 0.

**Corrected plan:** ship the **dot**, not the count — which is exactly what legacy did
(`0e85a4b8:…/js/chat.js:1836-1842` sets `className="unread"`; the CSS is a 10×10 dot, the count
argument is discarded). Honest, parity-correct, zero-C#. A truthful *number* needs a 3-line C#
de-latch → batch B.

Two more traps the brief misses: `createButton` sets `aria-label` on the back button
(`button.js:43`), which **overrides nested content** — a badge `<span>` is announced to nobody, so
the state must go into `backLabel`. And `renderTopbarNow` does `topbarHost.textContent=''`
(`chat.html:539`) on six different triggers, so a one-shot DOM poke evaporates — state must live
at shell scope and be applied inside the render.

### A2 — the cost line renders a double sentence
`setComposerCost` **prepends** `strings.costPerMessage` ("Each message costs",
`en-us.js:163`). C# already sends a complete sentence:
`String.Format(_SL("chat-message-cost-bar"), cost+" IXI")` →
`"Sending messages costs 0.1 IXI per kB"` (`SingleChatPage.xaml.cs:610`, `lang/en-us.txt:146`).
Wiring as specified renders **"Each message costs Sending messages costs 0.1 IXI per kB"**.

Also: the `chat_type > 0` branch covers **bots AND groups** and always computes `cost_text`, so a
free group receives `"Sending messages costs 0.00000000 IXI per kB"`. Gate on the **numeric**
`cost` arg, not on `costText` being non-empty. Money disclosure should fail *towards* showing on
an unparseable value.

And `paid` is **not** "already threaded" — it's passed to `upsertText` and dropped: `statusFrom`
(`chat.html:981`) never reads it, nothing persists it on `rec`. Needs `rec.paid` plus an escape
from the surgical status-only update path (`:2041-2047`), or a late `transactionId` never paints.

⚠️ **Verify-first (#215):** `paid = message.transactionId != ""` (`:1361-1364`), and
`transactionId` is set inside **Ixian-Core, outside the mount** → UNVERIFIED that an outgoing
text to a paid bot actually carries one. Legacy shipped the glyph (`js/chat.js:773`), which is
circumstantial. **Check on a real paid bot at F5 before treating the marker as done** — this is
exactly the C8 failure mode.

### A6 — targets a component production doesn't use, and drops groups
`channel-sheet.js` is **demo/desktop-only** (`desktop.html:493`). Production hand-rolls a
top-anchored dropdown, `chat-channel-panel`, title at `chat.html:747-750`. Also: `botDescription`
and `serverDescription` are **not two things** — C# passes `friend.metaData.botInfo.serverDescription`
into that one slot (`SingleChatPage.xaml.cs:612`); `botDescription` exists only as a legacy JS
parameter name.

Bigger: **groups take the same `:612` push and receive the description too**, but `mode.isBot` is
false so they never get a channel selector → under the brief's plan groups show nothing, and
legacy *did* show it for groups (legacy's home was the GroupDetails panel, `js/chat.js:245`).

★ **Security note worth logging:** legacy assigned this bot-server-supplied string with
**`innerHTML`** (`js/chat.js:245`) — remote HTML injection into the chat WebView. The redesign must
use `textContent` (house canon) and clamp the length. That's a legacy vuln the redesign closes;
it deserves a line in `docs/security-review-for-be-engineer.md`.

### A4 — "piggyback the setAvatar rebuild" cannot work
`stateSig()` (`contact_details.html:299-317`) deliberately excludes presence, and `buildIfChanged`
(`:318-325`) no-ops on an identical sig. So the dot would repaint only when name/address/avatar/
tx-set changes — **a contact goes offline and the green dot stays green** until a transaction
lands. Needs a free function `setChatInfoPresence(el, online)` (twin of `setTopbarSub`,
`topbar.js:97`, #44 grammar) plus `online` added to `stateSig` so a rebuild re-seeds.

Cadence correction: it is **~0.5 Hz, foreground-only, visible-surface-only**
(`Node.cs:388-405` → `Task.Delay(2000)`; `HomePage.xaml.cs:2211` early-returns when backgrounded).
The "// Executed every second" comments in three files are stale.

`capabilities.presence` is already passed (`contact_details.html:261`) but never read — and
`desktop.html:1040` passes `presence:true` on a **group** demo. Keep `capabilities` as the gate,
not the live value.

### A10 — routing to `ixian:share` silently drops the requested amount ★
The wallet Receive share does **not** carry a bare address: `onShare` gets
`qrValue()` = `address+':ixi'`, or `address+':send:'+amount` when an amount is requested
(`wallet-receive.js:73-75,143-147`). `ixian:share` takes **no argument** — C# shares
`primaryAddress` only (`HomePage.xaml.cs:635-641`). So the user thinks they shared a payment
request and shared a plain address. **Worse than today's silent no-op.**

Gate on payload: if an amount is set, never use `ixian:share`. Also `AbortError` (user cancelled
the iOS sheet) must **not** trigger the fallback, or cancelling silently copies and toasts
"Copied". And the gesture chain matters: after `await navigator.share().catch()` the activation is
consumed, so `navigator.clipboard.writeText` is rejected on WebKit — port settings'
`execCopy()` textarea+`execCommand` path (`settings.html:875-888`), which survives it. Also
`ixian:copy` (`HomePage.xaml.cs:672-674`) is an **empty branch** — don't route anything there.

---

## 2. Where the brief is over- or under-scoped

| Item | Finding |
|---|---|
| **A1** | Brief asks for a "zero-C# heuristic for end-of-history". **A real signal already exists** — `show_more="false"` when the returned count is below the window (`SingleChatPage.xaml.cs:1240-1251`). No heuristic needed. |
| **A1** | "the burst renderer already handles it" is **half-false**: `onChatScreenLoaded` is pushed only from `onLoad` (C# `:588`), never after `onLoadMore`, so a loadmore re-flush is terminated only by the 250 ms safety timer (`chat.html:1986-1989`). A slow 200–500-row stream ends the burst early → visible fill-in. |
| **A1** | The pill must be **model-driven inside `renderLogNow`** — `replaceChildren` (`:1897`) destroys any imperatively-appended node — and its loading frame must be mutated **synchronously on click**, because `clearMessages` sets `bursting=true` (`:2267`) and `renderLog()` early-returns (`:1997`) for the whole round trip. |
| **A8** | Legacy's `showZoomSliderIfSupported` was a **dead config key** — it's read only in the `Html5QrcodeScanner` render path, never by `Html5Qrcode.start()`. Legacy never rendered a slider (and by the same token never rendered a torch button — the redesign *added* torch, so R12's "torch only now" framing inverts it). "Restore the slider" = net-new UI, not parity. |
| **A8** | A literal `2.0` is **not portable**: `zoom` is a device-defined `MediaSettingsRange` — many Android stacks report `min:1,max:10`, others percent-like `min:100,max:400`, where `2.0` is *below min* and is silently ignored. Use the capability API the vendored copy exposes (`getRunningTrackCameraCapabilities().zoomFeature()`) and compute `min*2` clamped to `max`, snapped to `step`. |
| **A8** | Torch and zoom both go through `track.applyConstraints({advanced:[…]})`, which **replaces** the set — a torch toggle can reset zoom and vice versa. Needs one `applyTrackState({zoom,torch})`. Not mentioned in the brief; most likely user-visible defect of a naive restore. |
| **A9** | Flag names in the brief are wrong: they're `hasSingleUser`/`hasMultiUser` (`app_details.html:213-214`), not `is*`. |
| **A9** | `startAppMulti` pushes **`WalletRecipientPage`** (`HomePage.xaml.cs:2684`) — a **legacy-design** native picker whose roster is unfiltered (groups appear as pickable, #254 backlog). A9 as written makes a legacy surface *more* reachable. |
| **A9** | Legacy's modal was **hardcoded English** (no `*SL{}`), buttons ordered Invite-first, and dismiss was click-outside only. Don't port the a11y bug. Legacy also had no final `else` — a no-flag app was a **dead tap**; keep the redesign's solo default. |
| **A11** | The brief's "`ixian:backup` may be dead, route to `ixian:settings` instead" contingency is **unnecessary** — `HomePage.xaml.cs:533-536` → `pushPageLoaded(new BackupPage())` → `settings_backup.html`. Delete the hedge. |
| **A11** | The stub takes **no argument** but the push carries `"backup-prompt"` (`:2082`) — the handler must accept and check the id. And legacy's `toggleAnimatedSlider` was a *toggle* also used to close; don't inherit that (a second push must not close the nudge). |
| **A5** | Unstated precondition: the prompt needs a pref that's first written on the **first chat open** (`SingleChatPage.xaml.cs:727-729`) — a user who never opens a chat never sees it. |
| **A5/A11** | Neither `rating-nudge.css` nor `backup-nudge.css` is linked in `home.html`. Both would render unstyled. |

---

## 3. Two real product problems the brief doesn't address

### 3a. The rating nag loop
`rating-nudge.js` light-dismisses on scrim/Esc and deliberately sends **no verb** (`:17-19`),
while C# re-pushes on **every chat exit** (`HomePage.xaml.cs:2295`, `:2442`) *and* every home load
(`:1375`). Result: dismiss → open a chat → close it → prompt again, forever. "Don't re-show while
visible" doesn't touch this. Legacy's modal had no dismiss path at all, so this is new.

**Cheapest honest fix (zero-C#):** on light-dismiss, write a `spixi.rating.snooze` timestamp and
suppress for 7 days. C#'s `"done"` stays authoritative; this is a UI throttle, not a competing
source of truth. (Timestamp only — no addresses or content, per the #254 storage rule.)

### 3b. Both nudges can open in the same frame
In `onLoaded`, `updateScreen()` runs at `:1367` (→ `displayBackupReminder` `:2124`) **before**
`checkForRating()` at `:1375`. On a 30-day boundary both open together and the rating sheet stacks
over the backup sheet. And the backup slot is **already burned** by then (`:2083`), so a
reflex-dismiss costs 30 days.

Neither nudge is gated on context today: home's takeovers are z-30 and sheets z-40, so a nudge
paints over an open contacts/wallet takeover; `overlay.js:107`'s `overlayOpen` flag doesn't catch
takeovers. `overlay.js:44-79` also traps and pulls focus — landing mid-typing is disruptive.

**Proposed single queue in `home.html`:**

```
PRIORITY: backup (1) > rating (2)      // backup burns its slot; rating re-pushes forever
show(kind) only if ALL:
  !document.body.dataset.overlayOpen
  no .contacts-takeover / .wallet-takeover open
  activeTab === 'chats'
  activeElement not input/textarea/[contenteditable]
  document.visibilityState === 'visible'
  no nudge open, this kind not already open
else ENQUEUE (dedupe by kind, max one each)
RETRY on: overlay close · takeover close · tab change · visibilitychange
DROP: rating may be dropped on reload (C# re-pushes). Backup MUST NOT be dropped while the
      page lives — its 30-day slot is already spent.
GAP: 600 ms between a close and the next show.
```

Residual, worth stating not solving: since #270 the call ring lives in `CallPage`'s own WebView
and `home.html` gets no call state, so a queued nudge can surface under a ring. Making home
call-aware = new push = **SMALL-C#, not this batch.**

---

## 4. Free wins found in passing (cheap, ride the same batch)

| # | Win | Cost |
|---|---|---|
| W1 | **The chat presence dot is dead in 5 of 8 shipped locales.** `chat.html:2216` derives it from `/online/.test(s)` on a *localized* string. `chat-online` = "Online" only in en/de/pt; es-co "En línea", fr-fr "En ligne", ru-ru "В сети", sl-si "Na voljo", sr-sp "Na mreži" → the dot never lights. Fix with the `*SL{}` carrier mechanism that already exists in that same file (`:328-335`, `slCarrier()` `:465`). | small, zero-C# |
| W2 | **`avatar.css` has no `[data-size="64"]` rule at all** (only 24/40/48, `:32-38`) — the chat-info hero already loses its initials scale; the dot is hardcoded 12px and will look undersized at hero size. | trivial |
| W3 | A11 can suppress itself post-backup **zero-C#**: `spixi.backup.last` is already written to localStorage on every backup share (`settings.html:424-430`, `settings_backup.html:124-125`) — same `file://` origin as `home.html`. There is **no C# backup-done pref anywhere** (that's be-cutover S2), so this is the only signal that exists. Caveat is documented: it stamps the share-sheet *launch*, not success. | small |
| W4 | A11 gets the illustration free: `illustration:'images/backup.svg'` already ships beside the shells (`build-shells.mjs:260-267`), same asset settings uses (`settings.html:829`). | trivial |
| W5 | `lazy-history.css` is **already linked** in `chat.html:61` — `.c-history-loading` + spinner are available for A1's loading state with zero new CSS. | free |
| W6 | A2's glyph: registry key is **`wallet`** (also `wallet-filled`). No coin/currency glyph exists. Legacy used `fa-wallet`. Keep **both** tick and wallet — legacy's CSS *replaced* the delivery tick with the wallet (`spixiui-light.css:2544-2550`), losing delivery state. Don't copy that. | — |
| W7 | **Bug found, not ours to fix:** `HomePage.xaml.cs:720` matches `StartsWith("ixian:startAppMulti")` without the trailing colon while `:722` does `Substring("…startAppMulti:".Length)` → a colon-less call throws. Same bug already fixed at `:725`. Not reachable from our shells. **SMALL-C#, log only.** | log |

---

## 5. Risks to flag before building

- **A1 growth cost.** `renderLogNow` is O(n) over the whole model and runs on *every* new message.
  Today n ≤ 100; after 3 "show older" taps n = 400 incl. media tiles and reaction re-attach
  (`:1894`). Real low-end-Android jank risk, not acknowledged in the brief. Either cap the taps
  (5 → 600 rows) or put "load 3+ pages in a busy chat, then receive a message" on the F5 sheet.
- **A1 needs a timeout + double-fire guard.** Each tap permanently costs +100 rows of C# window
  (`:375`) with no ack; a lost navigation = a spinner that never resolves, with no retry.
- **A11 on desktop.** `displayBackupReminder` is **not** platform-gated, so it fires on
  Windows/macOS. Home's WebView is `mainGrid` column 0 only (`HomePage.xaml:9-21`), and
  `overlay.css:103-121` renders `c-sheet` as a centered dialog on `:root[data-desktop]` → the
  nudge centres inside the ~360–624px list column, dimming only that column while the
  conversation beside it stays bright and clickable. Legacy had no split view; this is new.
- **A9 may be dead code.** Capabilities are parsed only from a downloaded manifest
  (`MiniApp.cs:181-211`); there is no bundled app, no default/known-app list, and no manifest
  anywhere in the repo. Whether any **dual-capability** app exists is answerable only from the
  mini-apps catalog / BE. If none do, A9 drops from "parity gap" to "defensive".
- **A2's paid marker may be dead code** — see the verify-first note above.

---

## 6. Dials that need Damir before/at build

| # | Item | Question |
|---|---|---|
| **D1** | A1 | The secure notice ("Encrypted… Yours alone") currently renders unconditionally as the **first** child of the log (`chat.html:1863`). The demo contract shows it **only when history is exhausted** (`demo/chat.html:436-450`, #91's intent). The pill forces the choice — today's rendering asserts "this is the beginning" directly above a button that loads more of the beginning. Suppress the notice while more history exists, or leave it pinned? |
| **D2** | A3 | Dot (legacy parity, honest, zero-C#) or number (needs a 3-line C# de-latch → batch B)? |
| **D3** | A6 | Ship the channel-panel description line now (bots only, groups still show nothing), or wait for the 1-line C# `setGroupInfo` arg in batch B, which covers **bots AND groups** on the surface legacy actually used, for less total code? |
| **D4** | A9 | Sheet on every tap (legacy parity, taxes the common case) or primary tap = solo + "Invite a contact" as a row in the existing ⋮ app menu (`apps-menu.js` builds this shape already) + a second button on the details page? Related: is it OK in v1 that Invite hands off to the **legacy-design** `WalletRecipientPage` picker? |
| **D5** | A10 | What should Share actually send? (a) bare address — works with the live verb today, drops the amount; (b) `address:ixi` / `address:send:<amount>` — Spixi-scannable, gibberish in a WhatsApp message; (c) a human line ("Send me 12 IXI — `<addr>`") — best for the recipient, needs `ixian:share:<text>` = SMALL-C#. Recommendation: (c) long-term, (a) now with amount-gating. |
| **D6** | A7 | Hard block at 64 000 (parity), or block-and-offer-to-split into consecutive messages? Split is ~15 lines and zero-C#, but multiplies paid-bot cost (`getMessagePrice(str.Length)`, `:757`). Recommendation: hard block now, log split as polish. |
| **D7** | A8 | Auto-zoom always on and invisible (parity, recommended), or a visible DS-native `1×/2×` chip beside the torch? Note pinch-to-zoom is already on the polish backlog and would supersede the chip. |

## 7. Recommended revised order

1. **A11 + A5 together** (shared nudge queue — building them separately guarantees rework).
2. **A7** (composer `maxLength` — a component change; get it into the bundle early).
3. **A2 + A6** (both hang off `setChatMode`; one pass over that handler).
4. **A1** (largest, most render-plumbing).
5. **A3 + A4** (both presence/badge grammar; fold in W1 + W2).
6. **A8 + A9 + A10** (independent, low coupling).

Full pipeline stays as the brief says — `build-demo-bundle` **before** `build-shells` — and now
matters more: A7, A2, A4 and (if D4 picks the menu row) A9 all change components.
