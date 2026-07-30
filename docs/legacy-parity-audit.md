# Legacy-parity audit — v1.0 scope verification (2026-07-30)

**The #295 mandated first task.** Read-only. Method: 6 parallel auditors over disjoint scopes
(chat · home · contacts+miniapps · money · settings/system/launch · be-cutover-brief
reclassification) + an adversarial verifier that attempted to refute every claimed regression.
Trees compared: LEGACY = merge-base `0e85a4b8` (the full pre-redesign app) vs CURRENT = HEAD
`20089c10`, built shells in `Raw/html` checked alongside `src/`. Every row below survived the
refutation pass with file:line evidence in BOTH trees.

## Verdict on the #295 deferral theory

**Holds, with a correction list.** All three rationale claims CONFIRMED against legacy source:
(a) legacy payment cards were view-only (`js/chat.js:1114-1122`; app-invite cards had Get/Join —
`chat.js:1195-1201` — but the redesign reuses exactly those verbs, nothing lost); (b) legacy
`addCall` was a lossy 4-arg freeform push with no tap action (`SingleChatPage.xaml.cs:1496`,
`chat.js:955`); (c) reply/edit · retry · pin/mute/favorites/delete-row persistence have zero
hits in legacy. Of ~50 open be-cutover rows, the large majority are genuine enhancements.
**But:** the audit found **13 confirmed parity regressions** (most zero-C# to fix), **10
security/correctness rows** that must not ride to v1.1 as nice-to-haves, one **refuted premise**
(C9), and **5 stale brief rows**.

## (a) Genuine regressions → v1.0

### Tier 1 — user-facing capability lost, fix before ship

| # | Loss | Legacy | Current gap | Sev | Cost |
|---|---|---|---|---|---|
| R1 | **Chat history beyond the last 100 msgs/channel is permanently unreachable** ("Show older messages" → `ixian:loadmore`) | `js/chat.js:1409-1419` | C# fully alive (`SingleChatPage.xaml.cs:151-153`, `:373-375`, pushes `show_more` `:1248-1251`) but shell discards it (`src/shells/chat.html:2242` "loadmore is a stub verb"); nothing emits the verb; `lazy-history.js` wired only in demos | high | **zero-C#** — a plain button emitting `ixian:loadmore` works today: C# re-flushes the enlarged window and the shell's burst renderer already handles clearMessages→re-add. (The #188 "needs C# prepend" objection applies only to the scroll-triggered `attachLazyHistory` UX, not the button.) |
| R2 | **Paid-bot cost disclosure gone** — no cost bar, no per-message paid marker | `js/chat.js:163-176`, `:773` | C# still pushes cost/costText (`SingleChatPage.xaml.cs:612`); shell drops them (`chat.html:2174-2191`); `setComposerCost` (`composer.js:338`) has no production caller; no `paid` renderer | med-high (money-adjacent: users message paid bots with no cost warning) | **zero-C#** — component API exists, pure wiring |
| R3 | **Send photo/GIF from gallery (iOS legacy parity)** | `js/chat.js:391-394` (`ixian:sendmedia`, iOS-only visibility `:92`) | Whole pipeline alive both sides — shell routes photo/gif → `ixian:sendmedia` (`chat.html:1681`), C# dispatches (`SingleChatPage.xaml.cs:167`) — blocked by the single never-true gate `cap('media')` (`chat.html:1675`); **no code path anywhere sets any SPIXI_ENV/setCaps `media` cap** | med (iOS) | **one line** — legacy-parity `sendmedia` (native picker → file transfer) does not depend on the #81 BE image standard. Decide: flip for iOS only or all platforms |
| R4 | **Backup reminder dead — and silently BURNED** | `index.html:228-246` slider → `ixian:backup` | `HomePage.xaml.cs:2077-2085` pushes `toggleAnimatedSlider` to a stub (`home.html:2026`); `backup-nudge.js` mounted by no shell. **Worse:** `:2083` sets `backupReminderTimestamp` unconditionally on push — every reminder interval is consumed against the stub | med (self-custodial wallet, no backup nudges) | **zero-C#** to render; consider clearing the pref at the fix commit or moving the timestamp write behind an ack (small-C#) |
| R5 | **Entire dev cluster unreachable** — dev-mode toggle, DevPage log viewer, **Send log**, debug overlay (= iOS-22, confirmed wider: S9) | `index.html:36`+`js/home.js:560-577` (10-tap logo), menu items `index.html:486/495` | All C# handlers alive (`HomePage.xaml.cs:675/756/768`); no shell emits `enableDevMode`/`dev`/`sendLog`; settings hub Developer row gated on a `dev` cap never passed (`settings.html:548`); redesigned `dev.html` drop-in EXISTS and ships in the build — only the entry gesture is missing | v1.0 item 4 | **zero-C#** — wire an entry (version-row 10-tap in Account, or logo taps) + pass `onSendLog`/`onDev` |
| R6 | **Mobile tx detail depth** — fee, counterparty address+copy, tx-scoped explorer, live confirmation unreachable on mobile | every legacy tx row → `ixian:txdetails` → full WalletSentPage (`js/home.js:287`) | `home.html:1282-1284` gates `onTx` to `data-desktop`; mobile sheet lacks fee/address (W2-W4); verb itself is mobile-capable (`HomePage.xaml.cs:578`) | med — **this was the deliberate iOS-13 dial**, but the audit confirms the data is now reachable NOWHERE on mobile | **zero-C#** cheapest cure: a "View details" row in the mobile sheet emitting the existing verb. 🟡 Damir re-decide |

### Tier 2 — smaller losses, cheap wins (all zero-C# unless noted)

| # | Loss | Evidence | Note |
|---|---|---|---|
| R7 | **Native OS share sheet** for own address degraded to clipboard on Windows+Android (`navigator.share` absent in WebView2/Android WebView; iOS WKWebView keeps it) — and the **wallet-tab Share is a silent no-op on WebView2** (fallback has no toast, `home.html:1350-1353`) | legacy `ixian:share` → `Share.RequestAsync` (`HomePage.xaml.cs:318`); handler alive+orphaned in current (`:635`) | home shell can emit the live verb today; SettingsPage needs a small-C# share verb (or port the hardened settings `shareAddress` w/ toast to home as a floor) |
| R8 | In-chat unread-elsewhere badge (back button) — `setUnreadIndicator` stubbed (`chat.html:2448`) while C# pushes (`SingleChatPage.xaml.cs:2044`) | `js/chat.js:1836-1842` | mobile-only loss |
| R9 | Contact-details presence indicator — C# pushes `showIndicator` 1 Hz (`ContactDetails.xaml.cs:412-418`), shell stores, never renders (`contact_details.html:397`, self-documented gap) | `contact_details.html:216-223` (legacy) | render-only |
| R10 | Rating prompt dead — pushed (`HomePage.xaml.cs:2458-2470`, Android/iOS), stubbed; `rating-nudge.js` unwired; not burned (re-pushes until acted on) | `index.html:343`, `home.js:539-550` | wiring restores fully |
| R11 | Bot/server description displayed nowhere — pushed in `setChatMode`, discarded; `setGroupInfo` has no description arg | `js/chat.js:245` | zero-C# in chat shell; the nicer home (ContactDetails pane) = small-C# arg |
| R12 | Scan zoom preset (slider + auto-zoom 2.0) dropped — torch only now | `scan.html:70-86` (legacy) | hurts small/far QR; vendored html5-qrcode still supports it |
| R13 | 64 000-char message guard dropped — no length check in composer or C# either tree; transport is URL navigation (encodeURIComponent inflates ~3×) → oversized paste = silent-drop/wedge candidate | `js/chat.js:403-406` | 4-line composer check |
| R14 | **Dual-capability mini-app multi-user launch** — apps tab + details force solo (`home.html:1505-1506`, `app_details.html:154-156` vs legacy choice modal `index.html:649-667`). PARTIAL: still reachable via chat attach → app invite (dual apps included, `SingleChatPage.xaml.cs:1203-1224`) — but an app with no existing conversation partner can't start multi | | choice sheet on tap = component-side |

### Log-only (arguably skip)

Apps-tab first-use tip (`index.html:205`, handler orphaned `HomePage.xaml.cs:751`) · contacts-directory
per-row unread (visible in chats list anyway) · home version "BETA (startCounter)" decoration
(Account shows bare version) · 5 hidden locales (deliberate #256/#258 — dictionary-less; pending row shown).

## (b) Gated enhancements — safe for v1.1 (verified against legacy source)

C1 · C2 · C3 (view-only = full legacy parity) · C4-residual · C6 · C7-residual (decline-notify) ·
C8 (core-gated) · C10 · C12 · C17 · C20 · C21 (with (a) = runtime relay check before un-gating
group typing) · C22 · GJ1 · CH3 · CH4 · CH5/CH6/CH7/CH8 end-states · W1-W4 · W5/W6 (composeSend —
v1.0 item 5 by decision, not parity) · S2 · S6 · S11 · S12 · CI1-CI4 · CI6 · CI7 · CO1 · CO3-CO5 ·
A3 · A4/A5b · A8(a)(c) · X1-residual · i18n-C# · SPLASH-ART · §5 repoint housekeeping.
Also net-new-and-parked: apps Discover feed, mute/favorites, reply/edit, resend, inline Pay.

**C9 (bot tip) — premise REFUTED vs this baseline:** legacy has the identical early-return block
(`legacy SingleChatPage.xaml.cs:942-947` ≡ current `:1077`). "Legacy could tip bots" can only be
true of an older shipped exe — check that exe before treating it as a regression.

## (c) Security/correctness — not deferrable, not features

Already in scope item 6: **#234** resume-lock Cancel bypass · **MAJOR #4/#6** mini-app isolation ·
**C15** spoofable link-confirm · **S16-residual** receive-time filename traversal · **C18b** stale
callbar hang-up. The audit ADDS to that bundle (all pre-existing legacy bugs, but they must ride
the same v1.0 security engagement, not v1.1):

| Row | Issue |
|---|---|
| C15+ | the new S13 `ixian:openLink` sink on SettingsPage (`:186`) repeats the decode-then-open pattern (low risk — app-authored links — but same class; fix together) |
| C16 | remote `msgDelete` never persisted (message reappears on next open) — legacy-identical, correctness |
| L1/L5 | create-failure wedge + blank wallet-error dialog (user-blocking, zero explanation) |
| L2 | create-vs-unlock password parse divergence → silent wallet lockout class |
| L6 | restore mutates lock flags + `walletpass` BEFORE verifying the restore password (+`waletpass` typo) |
| L8 | plaintext `walletpass` in Preferences ("TODO: decrypt" since legacy, `Node.cs:250`) — keystore migration |
| W9 | WalletSentPage status-0 sentinel + null-activity NRE (redesign makes the failure visible) |
| #82 | media auto-load default-ON = legacy-parity posture (legacy auto-loaded tenor/giphy) — needs the standing security sign-off, it's a confirmation not code |

## (d) Doc corrections owed

`docs/be-cutover-brief.md` is stale in 5 places — mark LANDED: **S5/L4** (`*SL{language-code}`
carrier live in shells) · **S7** (`ixian:encpass` `SettingsPage.xaml.cs:204`) · **S13**
(`ixian:openLink` `:178`) · **CO2** (in-shell group create, `HomePage.xaml.cs:419-459`).
Re-mark **C9** as premise-refuted-pending-old-exe-check. Dead C# handlers catalogued by the
auditors (`ixian:newchat/wallet/activity/avatar/backup/downloads/rating/lock/miniAppsStartNoteHidden`
etc.) = cleanup-at-repoint candidates, no action now.

## (e) Runtime-only checks (statically undecidable — fold into device passes)

navigator.share presence per platform (R7) · blind-group file-send behaviour (legacy hid the
button; current shows it — possible dead-end, `chat.js:200-219` vs `chat.html:1672-1686`) ·
group-typing relay attribution (C21a, 2-device) · `checkAddress` stale-reply correlation ·
W7(b) `setAddress` extended-format · zero-message custom-avatar group in the people roster ·
add-contact/add-app failure-wedge grace timers · `spixi.landtab` handshake on Android/iOS ·
wallet-tab Receive before `setAddress` lands (cold-start race) · Ixian-Core packet cap for R13.

## Suggested batching

1. **Parity batch A (zero-C#, one session):** R1 load-more button · R2 cost bar+paid · R8
   unread badge · R9 presence render · R10 rating nudge · R11 bot description (chat-shell leg) ·
   R13 length guard · R12 zoom · R14 choice sheet — components exist for most; #46 loop after.
2. **Parity batch B (decisions first):** R3 media cap flip (Damir: iOS-only or all?) · R6 mobile
   "View details" row (re-opens the iOS-13 dial) · R7 share verb (home = zero-C#, settings =
   small-C#) · R4 backup nudge (+ timestamp burn fix = small-C#).
3. **R5 dev cluster** — with the v1.0 item-4 work (entry gesture + `onSendLog` wire).
4. **Security bundle** — hand section (c) to the BE engineer with
   `docs/security-review-for-be-engineer.md` at the v1.0 items 5+6 engagement.
