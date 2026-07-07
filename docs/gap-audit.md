# Single-pane gap audit — what's left to make the redesigned app actually work

Date: 2026-07-07 · Method: **source-based** (redesigned components/demos + `src/shells/*` production shells vs legacy `Resources/Raw/html/*` + `Spixi/Pages/**` C# handlers). Every claim cites `file:line`. This is NOT a live app walkthrough — runtime-only bugs are noted as *suspected* where the code path implies them. Scope: **single-pane only** (desktop is a separate track, DECISIONS #19).

The Phase-3 bridge wiring so far (#177–#185) was **breadth** — one shallow pass per surface, often "emit a verb → open the legacy native page." This audit catalogues the **depth** still owed to reach full redesign coverage.

## Decided model (Damir, 2026-07-07 interview) — the bar every item is measured against

| Decision | Ruling |
|---|---|
| **Completion bar** | **Full redesign coverage — NO legacy design remains anywhere in the final app.** Everything is redesigned; the redesign *replaces* every legacy page. A feature that isn't yet supported by BE (e.g. reply/edit) is **omitted — hidden behind a capability flag, but fully built and ready** to switch on the moment C# lands. Never shown as legacy, never shown broken. **Priority = a working 1:1 app.** |
| **Money flows** | Redesign composes/reviews the payment in the WebView; **native C# signs** (SECURITY.md — the secure native step, *not* a legacy screen). Where an inline money action needs a new signed §8 path, omit it (hidden, ready) until BE. |
| **Settings save** | **Auto-save** with best-practice selective confirmation — light toast where non-obvious (nickname), silent where self-evident (theme/language/lock). Needs a new C# *save-without-pop* verb. |
| **BE sequencing** | **Build FE now** against proposed §8/§9 verbs, hidden behind capability flags; **batch every C# ask** into the one BE cutover pass — flipping the flag lights the feature up. |
| **New-chat FAB** | Replace the legacy dead-end with the already-built **contacts shell** (start-picker + add-contact + group-create). |

Legend: **WIRED** = live on the real bridge · **STUBBED** = C# push lands but the shell no-ops it · **MISSING** = built in the redesign but not yet wired, or absent · **BUG** = suspected defect · **[0C]** = zero-C# FE work (do now) · **[BE]** = needs a C# change (batch into the cutover) · **[DEC]** = product/architecture decision.

> The per-surface "**MISSING / LEGACY-FALLBACK**" label describes only the *current transitional runtime* — an unwired flow still reaches the legacy page today. The **target is to replace it: no legacy design remains in the final app.** Where BE can't yet drive a redesigned feature, it is **omitted behind a capability flag** (built + ready), not left on legacy.

---

## 1. Chat — `src/shells/chat.html` vs `SingleChatPage.xaml.cs`

The richest surface, wired for text/files/apps/reactions-likes/typing/status/grouping (#177–#181). Two whole card families render **nothing**, and several surfaces with existing C# verbs are simply unwired.

**Rendering-blackholes (C# pushes, shell drops them):**
- **[0C] Payment cards** — `addPaymentRequest`/`updatePaymentRequestStatus`/`updateTransactionStatus` are console stubs (chat.html:566-568 ← xaml:1310/1361/1648). `createPaymentBubble` not imported → **every payment in chat is invisible.** View-only render is doable now via a localized-`title`+`statusIcon`→role/status map (lossy — **C1/C2**); inline Pay/Decline = **C3** decision; `ixian:viewPayment` details link exists (dispatch 201).
- **[0C] Call cards** — `addCall` stubbed (chat.html:598 ← xaml:1496) → **calls invisible.** View-only (message+declined+time) from the 4 args now; richer missed/duration/call-back = **C4**.

**Unwired despite existing C# verbs (all [0C] wins):**
- **Message context menu** — shell never calls `attachMessageMenu`; no long-press/right-click → no Delete/Copy/React/Tip/Select. C# supports `deleteMessage`, `like`, `tip` (xaml:1034/1045/941).
- **Member sheet + group admin** — sender tap dead (`onSenderClick` unpassed); no `openMemberSheet`. C# supports `kick`/`ban`/`leave`/`en|disableNotifications`/`sendContactRequest` (dispatch 277/283/293/248/254/260).
- **Chat-info takeover** — header tap falls to the legacy `ixian:details` page instead of `createChatInfo` (nick edit, media strip, payments accordion, disappearing msgs, delete-history, remove-contact). **[DEC]** redesigned takeover vs legacy page → **redesigned** (full coverage).
- **Attach sheet** — `onAttach`→`ixian:send` (legacy attach bar) instead of `openAttachSheet`; `ixian:sendmedia`/`sendfile` exist (dispatch 148/154).
- **In-text link confirm** — `createMessageBubble` gets no `onLinkClick` → URLs are plain text, no external-link confirm modal; `ixian:openLink` exists.
- **Unread divider** (`createUnreadDivider`), **lazy history** (`attachLazyHistory`; `clearMessages` ignores the `show_more` flag, xaml:1110), **contact-request pane** (`showContactRequest` stub, chat.html:614 ← xaml:1196), **connectivity banner** (`showWarning` stub, 648 — ties #59), **start-a-call button** (`showCallButton` stub + topbar passes no actions, chat.html:123 → **can't start a call at all**), **bot-channel selector** (`addChannelToSelector` etc. stubs 628-630).

**Media:** images/GIFs arriving via `addFile` render as generic file bubbles — `createMediaBubble`/`openMediaViewer` absent (no tap-to-load/viewer). **[BE/DEC]** media-vs-file signaling from C# is unconfirmed.

**BUGS:**
- **[BE] Retry is a dead no-op** — failed-message retry emits `ixian:contextAction:resend:<id>` (chat.html:242) but `onContextAction` has **no `resend` case and no default** (xaml:929-1060) → nothing happens. Needs a C# `resend` case. HIGH.
- **[BE] Like can't un-react** — always emits `contextAction:like:<id>` (chat.html:328); if C#'s `addReaction(...,"like:")` appends rather than toggles, un-liking re-adds. Verify. MED.
- `own:false` hardcoded (chat.html:314) → own like never shows as "you reacted" = **C5**.

**Biggest gap:** payments + calls are invisible, and the entire context-menu / member-admin / chat-info / attach / media surface is unwired despite mostly-existing C# verbs — a large pile of zero-C# wins — plus retry is silently dead (needs a C# `resend`).

---

## 2. Chats list — `src/shells/home.html` tab1 vs `HomePage.xaml.cs`

Wired: list flush (`clearChats`/`addChat`/`clearChatsDone`), unread nav badge, client search + filter chips, open chat, two-pane select, FAB→`ixian:newchat`, topbar→`ixian:newcontact`, live timestamp ticker.

**MISSING / BUGS:**
- **[BE] Contact requests + #109 handshake — built but UNFED.** `state.requests` is hardcoded `[]` (home.html:204); HomePage only pushes `loadChats`, so requests arrive as ordinary rows with a "waiting" excerpt (xaml:910-961). The built `createContactRequest` Accept/Decline + handshake staging never render. Needs a request-feed push + accept/decline/complete verbs.
- **[BUG] Live status silently no-op'd** — HomePage pushes `loadContacts`/`updateContactStatus` (`clearContacts`/`addContact`/`setContactStatus`, xaml:840-861/1504) every tick, but home.html registers them as **no-op stubs** (home.html:602-604) → online-dot / unread / excerpt only change on a full `loadChats` flush. **[0C]** wire (or explicitly drop) these.
- **[BUG] Delete / mark-read revert** — row-menu edits are local-only (`onPersist:()=>{}`, home.html:213) and wiped on the next `shouldRefreshContacts` re-flush (xaml:1303). Needs **[BE]** persistence verbs.
- **[BE] Groups filter dead** — `addChat` sends no group flag (xaml:1030) → `chatMatchesFilter('groups')` always empty. Needs a type flag.
- **[0C/BE] Pin / mute / favorites / swipe** wholly parked (`capabilities:{}`, home.html:205; chips/menu/swipe gated off). Pin/mute persistence = **[BE]**.
- Mentions/@ (no bridge signal); avatars = gradient fallback (repo-wide).

**Biggest gap:** the contact-request/handshake surface is built but unfed; live per-contact status updates are dropped between refreshes; pin/mute/favorites/swipe parked.

---

## 3. Wallet — `src/shells/home.html` tab2 vs `Wallet/*.xaml.cs` + `HomePage.xaml.cs`

Wired: balance hero + hide, tx list, filter chips (bridge round-trip), client search, tx-detail sheet, Send/Receive/Scan→native, address-level explorer.

**MISSING (the big one):**
- **[0C] The entire redesigned SEND flow is built but UNWIRED** — `createWalletSend` (recipient + amount + Max + fee/total + review) is demo-only; production fires `ixian:sendixi` → the legacy 3-page native hop. **[0C] RECEIVE same** — `createWalletReceive` (QR, request-amount, share, send-request) demo-only → legacy `WalletReceivePage`. `qr.js`/`tip-sheet.js` unused in production. **The decided "WebView composes, C# signs" model is not yet realized.** Wiring the compose/review is [0C] (emits existing intent verbs); the sign step stays native.
- **[BE] tx-detail is data-starved** — no address/fee (**W2**), address-level explorer only (**W3**), ambiguous nickname-or-address counterparty (**W4**), pre-formatted timestamp not epoch (**W1**).

**BUG:** filter round-trip keeps the stale search `query` (home.html:294) → a freshly-flushed set is silently narrowed by the old query; fiat isn't decimal-limited (home.html:550-551).

**Biggest gap:** all money-entry (send/receive/QR/tip) still runs on legacy native pages — the redesigned flow is fully built yet entirely unwired — and the tx sheet lacks address/fee/status/tx-explorer/epoch (W1–W4).

---

## 4. Apps — `src/shells/home.html` tab3 vs `MiniApps/*.xaml.cs`

Wired: installed list, list⇄grid, search, tap→`ixian:appDetails`, add→`ixian:newapp`, publisher subtitle.

**MISSING / deferred to the standalone apps-shell repoint:**
- **[BE] Discover feed** (A2 — source undecided; `apps-discover.js`/`apps-feed.js` unused), **[BE] in-tab uninstall** (A1 — no home-tab verb; ⋮ menu off), **[0C/DEC] direct launch single/multi + recents** (`ixian:startApp`/`startAppMulti` exist; `apps-recents.js` unused).
- **Real app icons never shown** — C# `icon` path ignored (won't resolve in self-contained shell) → gradient tiles only. Cross-cutting avatar/icon flag.
- **BUG** `apps-item.js:45` renders the ⋮ `menuBtn` even under `appMenu:false` (only the handler is guarded) — masked by CSS today; root fix = guard creation on `onMenu`.

**Biggest gap:** everything past "list + search + open + add" (Discover, launch/recents, in-tab uninstall) is deferred and needs A1/A2; no real icons.

---

## 5. Settings — `src/shells/settings.html` vs `Settings/*.xaml.cs`

Wired: nickname (save-on-exit), avatar pick/remove, theme, language, app-lock, backup→legacy, 4 deletes.

**BUGS — the "settings not saving properly" report, all rooted in save-on-exit + reload-on-change:**
- **[BE] Theme/language reload the WebView** (`loadPage(webView,"settings.html")`, xaml:146/178) → re-boots the shell and **discards any in-progress unsaved nickname edit + avatar-tmp**. Edit nick → change theme → nick silently lost. *This is the most likely user-visible "not saving."*
- **[BE] App-lock not persisted on clean exit** — `ixian:lock:on` only sets the in-memory field (xaml:159); the Preference is written **only in `onSaveSettings`** (:203), which runs only on a dirty `ixian:save`. Toggle lock then leave via `ixian:back` → `lockenabled` never persisted → lock reverts.
- Avatar-tmp orphaned if a theme/language reload lands between pick and exit.

**MISSING (rows absent for want of a push / repoint):**
- **[BE] QR + own-address identity block** (S1 — address never pushed), **[BE] version/About** (S4), **[BE] backup status** (S2 — always shows "Action needed"), **[BE] current-language** (S3 — shows en-us).
- **[BE] Notifications / Privacy / Security-level / Confirm-payments** (`capabilities:{}` off; `settings-screens.js` unused; §9), **change wallet password** (encpass not routed via SettingsPage), **downloads / dev / contributors** (HomePage-driven, need §5 repoint), **in-shell backup screen** (`settings-backup.js` unused → legacy BackupPage).

**Auto-save + toast target needs:** a **save-without-pop verb** (e.g. `ixian:saveNick:<nick>` + `ixian:applyAvatar`), **immediate lock persistence** on `ixian:lock:on|off` (+ **S6** auth-cancel), **stop reloading the WebView** on theme/language (push `setAppearance`/`setLanguage` — also unblocks live-locale **S5**), plus S1–S4. Toast: light confirm on nickname save; silent on theme/language/lock.

**Biggest gap:** the C# save-on-exit + reload-on-change model actively drops unsaved edits and doesn't persist lock on a clean back-exit; the whole QR/identity block + half the hub rows are absent.

---

## 6. Contacts — `Contacts/*.xaml.cs` (BUILT, NOT wired — the architectural outlier)

Built: `contacts-shell.js` full surface (start-picker/directory, add-contact w/ debounced `checkAddress`, two-step group-create, pending-contact). Profile = `createChatInfo` context `'contact'`. Demo lives inside `chats.html`.

- **WIRED? No** — no `src/shells/contacts.html`, not in `build-shells.mjs` (parked :44), and **no `src/bridge/contacts-page.js`** (unlike scan/lock, contacts got no Phase-3 adapter).
- **[DEC] Architecture blocker:** the picker/group surface has **no single legacy host page.** Add-contact verbs live on `ContactNewPage`/contact_new.html (`ixian:request:`/`checkAddress:`/`quickscan`/`qrresult:`); group-create emits `ixian:select:…` which `ContactNewPage` does **not** handle (spec routes it to `WalletRecipientPage`); the **roster itself (`clearContacts`/`addContact`) is pushed by HomePage**, and the FAB is HomePage-dispatched (`ixian:newchat`/`ixian:newcontact`, xaml:215-221). → **Recommended: embed the picker in the home shell** (reuse HomePage's roster + FAB dispatch) rather than a standalone page; add-contact/group-create can be takeover sub-views. Confirm before building.
- **[BE]** dual-nick gap (§9 — one resolved nickname, so "original nick under custom name" impossible); `checkAddress` silent-on-failure (no live "invalid" state). **[process]** the #155 contacts Opus audit (`docs/opus-contacts-audit-brief.md`) was never run.

**Biggest gap:** no adapter + no legacy host page — needs the FAB→home-shell embedding decision before any wiring, plus a roster/verb home for group-create.

---

## 7. Scan — `ScanPage.xaml.cs` (BUILT, NOT wired — near drop-in)

Built: `scan-shell.js` + **adapter `src/bridge/scan-page.js`** (`mountScanPage` + html5-qrcode provider). Grammar matches legacy exactly (`ixian:qrresult:`/`ixian:back`/`ixian:onload`/`ixian:error`; ScanPage:43-55). Vendored lib present (`Resources/Raw/html/js/html5-qrcode.min.js`).

- **TO-WIRE [0C]:** create `src/shells/scan.html` (mount `mountScanPage` + a `Html5Qrcode` camera) → add `scan` to `build-shells.mjs` SHELLS (`out: scan.html`, page ScanPage) → device-test camera permission.
- **[BE]** C#-side split guard on `ixian:qrresult:` (§9); **[icon]** torch uses an `eye` placeholder (bulb/flashlight glyph gap); denied-state OS-settings deep link (no verb); **[process]** `docs/opus-scan-audit-brief.md` not run.

**Biggest gap:** just the boot shell + a SHELLS entry stand between this and a working drop-in (lib + adapter + grammar all present).

---

## 8. Lock — `LockPage` / `EncryptionPassword` / `SetLockPage` (BUILT, NOT wired — near drop-in)

Built: `lock-shell.js` (`createLockScreen` unlock/confirm, `createEncPassScreen` changepass) + **adapters `src/bridge/lock-page.js`** (`mountLockPage` + `mountEncPassPage`, with the 1600ms no-callback auto-release mirror + pre-wired inert failure pushes). Grammar matches legacy (`ixian:unlock:`/`ixian:change`/`setJustConfirm`; `ixian:changepass:<DELIM>old<DELIM>new`).

- **TO-WIRE [0C]:** `src/shells/lock.html` (`mountLockPage`) + a `src/shells/` encpass entry (`mountEncPassPage` → `settings_encryption.html`) + SHELLS entries + set `SPIXI_ENV.biometrics` (one C# `addCustomString`) to reveal the fingerprint-retry button.
- **[BE]** explicit `unlockFailed`/`changePassFailed` pushes (pre-wired inert; today wrong-password = native alert + auto-release); biometric retry reuses `ixian:onload` (BE bless or ship `ixian:bioretry`); `ENC_DELIM` C#-side split guard (§9). **[icon]** `shield-lock` export pending.
- **[DEC] Orphaned `SetLockPage`/settings_lock.html** — the enable/disable-lock page has no lock-shell drop-in (the toggle is "absorbed by the settings hub switch," but that runs through SettingsPage). → retire vs redirect at the §5 repoint. **[process]** `docs/opus-scan-lock-audit-brief.md` not run.

**Biggest gap:** two boot shells + SHELLS entries + a `SPIXI_ENV.biometrics` flag from a drop-in; the real open items are the §9 explicit-failure/biometric-retry asks and the orphaned `settings_lock.html`.

---

## 9. Launch/onboarding — `src/shells/launch.html` (#185, just wired)

Wired end-to-end (welcome/create/restore/retry/tail). Depth gaps are minor: create-failure release (**L1**), `create:<nick>:<password>` parse guard (**L2**), onboarding "Back up now" route (**L3**), welcome live-locale (**L4**) — all logged in be-cutover-brief. Illustrations fail-soft until re-export (#174). Cosmetic: form-Back briefly flips to welcome before C# pops. No new work beyond L1–L4.

---

## 10. Cross-cutting

- **Avatars & app icons** = gradient fallback everywhere (C# media paths don't resolve in self-contained shells) — repo-wide; needs data-URI or a resolvable scheme.
- **Icons pending:** `shield-lock` (lock/secure-notice), torch/bulb (scan), any others surfaced.
- **Empty / error / offline states:** connectivity banner (`showWarning`) unwired in chat; per-surface empty states exist but the offline/error surfaces need a pass.
- **[BE] media-vs-file signaling** — chat can't tell an image/GIF from a generic file → no media tiles.
- **Parked Opus audits never run:** contacts (#155), scan (#158), lock (#159) — `docs/opus-*-audit-brief.md`. Each shell's #46 loop is owed.
- **Toasts:** the `c-toast` system exists but is barely used on the real bridge (settings auto-save, wallet actions, etc. will need it).

---

## Decisions — RESOLVED (Damir, 2026-07-07 interview 2)

1. **Start track = A (Chat depth).** Highest value, mostly zero-C#; the core 1:1 experience first.
2. **Contacts architecture — embed in the home shell for v1, built to port cleanly** (Damir: "whatever works best in this version AND allows easy porting into next"). So: mount the picker/add/group as takeover sub-views inside `src/shells/home.html` (reuses HomePage's roster push + the existing FAB dispatch — works now, no new BE), BUT build it as a **self-contained `src/bridge/contacts-page.js` module with a clean boundary** so re-hosting it as a standalone `src/shells/contacts.html` later (once a roster push verb exists) is just a re-mount, not a rewrite.
3. **Chat-info — redesigned `createChatInfo` takeover** (no legacy remains; resolved by the model).
4. **`settings_lock.html` — redirect to a lock-shell view** (Damir): the set-lock flow keeps its own redesigned confirm screen (a `lock-shell` mode), rather than being folded silently into the hub toggle.
5. **Chat payments & calls — view-only now, upgrade later** (Damir): build informational payment/call cards immediately from the current (lossy) data so nothing is invisible; upgrade to inline Pay/Decline + rich call info when BE sends clean enums (C1–C4). Best-effort status mapping is acceptable interim.

## Still OPEN (one flag) — deferred to the BE cutover

- **media-vs-file signaling** — the BE approach (a new arg on `addFile` vs a separate `addMedia` push) is a BE-implementation detail; decide at the cutover. FE builds media tiles behind a capability flag regardless, so this does not block Track A.

Everything else follows the decided model. The BE asks accumulate into `docs/be-cutover-brief.md` (existing C/W/S/A/L rows + the NEW ones flagged above).

---

See `docs/finalization-roadmap.md` **Phase 3.5** for the sequenced build plan derived from this audit.
