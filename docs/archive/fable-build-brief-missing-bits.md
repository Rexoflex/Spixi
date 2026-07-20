# fable build brief — MISSING BITS (Damir's list, verified 2026-07-11)

> **Work order for fable.** Damir listed 13 missing bits and asked for them "in 1 go".
> An Opus session **verified every one against the real tree first** (#215 verify-first).
> The list changed a lot: **two are functional regressions, not polish** · **one is a
> silent bug** (languages never reach the app) · **three are already built and just need
> an entry point** · **two are NOT yours to build** (BE-gated / native-platform).
>
> **Read first:** this file → CLAUDE.md ground rules → `DECISIONS.md` (rows cited below)
> → `docs/polish-roadmap.md` (⚠ three of its rows are WRONG — corrections in §6).
>
> **Canon is not negotiable:** #215 verify-first · ★ #221 chat isolation · frozen bridge
> (new verbs = BE asks, batched, never smuggled in) · money = WebView composes, C# signs ·
> zero-C# first · every significant decision gets a DECISIONS row · the #46 audit loop
> runs in a SEPARATE Opus session (§5c) — you build, you don't self-certify.

---

## 0. Headline: this is NOT one batch

Honest scoping. It's **4 batches**, and 2 items are not yours:

| Batch | Items | Class | Why grouped |
|---|---|---|---|
| **A — regressions (do FIRST)** | 2 incoming-call overlay · 3 in-call banner · 15 unread divider · 13 languages | ZERO-C# | The redesigned app is **worse than legacy** on these today. Highest user-visible value, no BE dependency. |
| **B — entry points + settings** | 11 downloads · 12 pattern default/levels · 10 tx-details shell | ZERO-C# (10 = new shell) | Things that exist and aren't reachable. |
| **C — desktop grammar + panes** | 6 sheets→modals/context-menus · 7 add-app subpane · 8 add-contact subpane | 6 = ZERO-C# · 7/8 = SMALL-C# routing (no new verbs) | One coherent desktop pass. |
| **D — create group** | 17 | ZERO-C# but **coupled to wallet-send (LAST, #232)** | Needs a Damir ordering call before you start. |
| **NOT YOURS** | 1 reply-to · 14 OS splash | 1 = **BE-GATED** (no protocol carrier exists) · 14 = **NATIVE-PLATFORM** (MAUI splash can't animate or theme) | See §4. Do not build. |

**Do NOT try to land all four in one session.** Ship A, get an F5 + an Opus loop, then B, then C, then D. Each batch = its own commit.

---

## 1. INTERVIEW DAMIR FIRST (AskUserQuestion, before any code)

These are genuinely underspecified. Ask them **up front, in one pass** — they change what you build:

1. **Calls (2/3):** which shells show the incoming-call overlay — all foreground surfaces (chat, home, settings, contact_details) or chat+home only? The built `showIncomingCall` has a **third "Ignore" action with no bridge verb** (it would dismiss locally while C# keeps ringing) — keep it or ship accept/decline only? The callbar's `onReturn` ("return to call") **has no bridge target** (`displayCallBar` doesn't send the friend address) — drop it, or make it a BE arg-append ask?
2. **Pattern (12):** the setting already has **4 levels (Off / Subtle 0.3 / Standard 0.5 / Bold 0.7)**. You said "OFF by default on desktop + subtle/standard/bold" — so: keep the Off option, yes? And: **one pref for both platforms, or separate desktop/mobile picks?** (desktop-off + mobile-standard cannot coexist under one key). Keep the desktop dark grey-1000 ground (#207) once the pattern is user-controllable?
3. **Unread divider (15):** sticky while scrolling, or one-shot in place? Does it survive a re-render, and disappear on the next open?
4. **Tx details (10):** **separate WebView page/pane with FULL legacy parity (zero-C#, recommended)** or keep the in-page sheet (which then needs BE rows W2/W3/W4 to get fee/address)? The **demo builds it as an in-page sheet** — the two are different architectures, and the demo would need re-doing to match.
5. **Downloads (11):** entry in the **Account hub** (correct home per ARCHITECTURE §5 — needs the trivial BE row **S8**) or a zero-C# affordance in home now? Add a bulk "Clear all" verb while BE is in there?
6. **Desktop panes (7/8):** add-app and add-contact as **right-column panes** (small C# routing, the #245/#247 pattern) — and should the **contacts picker itself** be a pane on desktop rather than a full-window takeover? Does the app **install-confirm** (AppDetailsPage) also pin to the pane, or take over?
7. **Create group (17):** sheet or modal for name/image/blind — over the multi-select, or still a second step? And the **ordering call**: the redesigned group picker means dropping a shell over `wallet_recipient.html`, which is **shared with the payment-recipient picker** — do it now (it also replaces the wallet picker's legacy look, ahead of the wallet batch) or defer the whole page to the wallet-send pass?
8. **Languages (13):** 5 shipped locales have **no shell dictionary** (cn-cn, id-id, it-it, ja-jp, lt-lt) — which must actually ship, and who supplies drafts for the ~600 new keys?
9. **Splash (14):** is the ask the **OS splash** (native, static, needs new art) or the **in-app boot moment** (animatable today, zero-C#)? See §4.

---

## 2. BATCH A — regressions (ZERO-C#, do first)

### A1 + A2 — Call UI: incoming overlay + in-call banner ⚠ **the app currently has NO call UI at all**

`polish-roadmap.md:14-15` says "Not built; addCall is lossy → BE C4 first". **Both halves are wrong.** C4/`addCall` is the *history bubble*; the live call UI has its own bridge and it all exists.

- **Components BUILT:** `src/components/call-overlay.js:20-99` (`showIncomingCall({caller, onAccept, onDecline, onIgnore})`, `hideIncomingCall:103`) · `src/components/callbar.js` (`showCallBar({text, startedAt, onReturn, onHangUp})` / `hideCallBar`, singleton, mutates in place). Both used in `src/demo/chat.html:190` and `src/demo/desktop.html:605`. Spec: `docs/overlays-spec.md:42-48` (bridge mapping already written).
- **Bridge EXISTS and is REACHABLE** — and it's on the **base class**, so it reaches every page/WebView:
  - Incoming: `Utils.sendUiCommand(this, "addCallAppRequest", friend.walletAddress, sessionIdHex, text)` — `SpixiContentPage.cs:1387` inside `displayAppRequests()` (`:1349-1391`), fired from `updateScreen()` (`:1419-1425`) when `UIHelpers.refreshAppRequests` is set — set on call receipt at `StreamProcessor.cs:691` (`VoIPManager.onReceivedCall`) and on `OnAppearing` (`:1436`).
  - Accept/decline verbs: `ixian:appAccept:<addr>:<sessionId>` / `ixian:appReject:<addr>:<sessionId>` → `onNavigatingGlobal` (`SpixiContentPage.cs:1449-1458`) → `onAppAccept`/`onAppReject` (`:1393-1417`) → `VoIPManager.acceptCall`/`rejectCall` when the session is VoIP (`:1396`/`:1411`).
  - In-call: `displayCallBar(sessionIdHex, text, callStartedTime)` (`:1325-1335`) / `hideCallBar()` (`:1337-1347`); hang up = `ixian:hangUp:<sessionId>` (`:1459-1462`). `text` is **C#-localized and pre-composed** ("Dialing …" / "In call - …"); `callStartedTime` = unix secs, `"0"` while dialing → the component's ticker takes over.
  - Clear: **no dedicated clear push** — the ringing card is removed by `clearAppRequests` on the next `displayAppRequests()` pass (`:1355`). Caller-hangs-up-while-ringing only calls `hideCallBar()` (`VoIPManager.cs:345`) → **the incoming card MUST self-clear on `clearAppRequests`**. This is the sharp edge; get it right.
- **Shell state: NOTHING.** Grep `src/shells/**` for `displayCallBar|addCallAppRequest|clearAppRequests|appAccept|appReject|hangUp` → **zero hits.** Legacy rendered these from the globally-loaded `Spixi/Resources/Raw/html/js/spixi.js:226-239`; the self-contained shells never load `spixi.js`, and C# pushes arrive as **bare global identifiers** (`Utils.cs:104`) → undefined global → the push dies silently. **Net: on the redesigned app you cannot see or answer an incoming call.**
- ⚠ **NAME-COLLISION HAZARD when wiring:** `SpixiContentPage.cs:1368` pushes a **4-arg `addAppRequest`** (mini-app session request) while `src/shells/chat.html:2069` defines a **13-arg `addAppRequest`** (chat app invite). Same global, two meanings. In legacy the 4-arg body is a commented-out TODO (`spixi.js:247`) so it's inert — but your handler **must discriminate by arg count** (or ignore the 4-arg form) or a mini-app request corrupts the invite renderer.
- **Security:** accept routes through C# (`onAppAccept` → `VoIPManager.acceptCall`) — the WebView only emits intent. Correct; keep it that way.
- **Effort:** ~½ day for both (same `displayAppRequests` pass, same shells). **Risk:** low-med (the clear lifecycle + the arg-count collision).

### A3 — Unread / new-messages divider ⚠ the roadmap's "no read-boundary signal" is **WRONG**

- **Component BUILT:** `createUnreadDivider()` — `src/components/typed-bubbles.js:548-555` (demo-only today: `src/demo/chat.html:525`).
- **The signal EXISTS.** `SingleChatPage.xaml.cs:1603` is a single `sendUiCommand` used for both `addMe`/`addThem` (prefix set at `:1329`/`:1349`) and always sends **11 args including `message.read`**.
- **Ordering makes it a true boundary:** the push (`:1603`) happens **before** `updateMessageReadStatus` (`:1649`) flips `message.read = true` (`:1661-1665`). On chat open `loadMessages` (`:1215-1264`) pushes previously-unread incoming messages with `read="False"`, *then* marks them read. The bulk pre-flip (`updateMessagesReadStatus`, `:1977-1981`) only runs on **onResume**, not on chat open. So the first-load burst carries the boundary **exactly once**, and correctly doesn't on the next open.
- **Why it's dropped:** `src/shells/chat.html:1799` declares `addThem(id, address, nick, avatar, text, time)` — **only 6 params**; the trailing `sent, confirmed, read, paid, errorSending` are silently discarded. (Legacy did the same.) **Fix = accept the extra args.**
- **Build notes:** compute the boundary **only from the initial load burst** (use the existing load-burst gate) — a message arriving while the chat is open also pushes `read="False"` then flips, and would spawn a divider per message. `setUnreadIndicator` (`chat.html:1922`) is **NOT** usable: it's the **global** unread count across all friends (`FriendList.getUnreadMessageCount()`).
- **Verify on device (light):** log the `read` arg on `addThem` — expect `"False"` on first open, `"True"` on the second.
- **Effort:** ~3-4h. **Risk:** low.

### A4 — Languages ⚠ **the app is hard-wired to English in every locale** (silent bug)

This is the most important finding on the list.

- Two localization channels exist. **Only one is language-aware:**
  - C# `*SL{key}` substitution (`SpixiLocalization.localizeHtml`, `SpixiLocalization.cs:194-224`, applied to every page in `SpixiContentPage.generatePage:1236-1243`) — **language-aware**, re-substituted on reload. Used today only for the theme flag and the #252/#253 equality carriers.
  - `window.SL` — **the actual source of every UI string in every component** — is **NOT** language-aware.
- Every shell boots with (e.g. `chat.html:265`, `home.html:200`, `settings.html:105` — 12 shells, identical line):
  ```js
  window.SL = window.SpixiStrings.get(new URLSearchParams(location.search).get('lang') || 'en-us');
  ```
  **C# loads shells from a bare path and never appends `?lang=`** (`SpixiContentPage.cs:88`). So it always resolves `'en-us'`. The Settings language pick (`ixian:language:<code>` → `SettingsPage.xaml.cs:211-219` → `loadLanguage` + reload) is **fully wired and correct** — it just can't touch `window.SL`. **Production is English in every locale.**
- ⚠ `docs/i18n-wiring-spec.md:42` claims "C# injects the per-shell `window.SL` token block" — **never implemented; the spec is stale.** Fix the spec.
- **The fix (ZERO-C#, one line × 12 shells).** Every lang file's first line is `language-code = <code>` (`en-us.txt:1`), and `_SL` resolves any key in the loaded file → let C# tell the shell its own locale:
  ```js
  var lang = new URLSearchParams(location.search).get('lang') || '*SL{language-code}';
  window.SL = window.SpixiStrings.get(/^[a-z]{2}-[a-z]{2}$/.test(lang) ? lang : 'en-us');
  ```
  (the regex guard makes the un-substituted literal fall back to en-us in `file://` demos). **#248 rule: same-line-closed carrier — never write a literal unclosed `*SL{`.**
- **Two more gaps to close in the same batch:**
  1. **`extract-strings.mjs` only sweeps `src/components`** (`:28`), and `i18n-lint.mjs` likewise (`:17`) — **`src/shells/*.html` is NEVER swept**, so every shell-inline key can never enter `en-us.json` and is untranslatable in every locale. **Extend both to `src/shells`.** Known missing keys include: `groupInfo`, `openLinkTitle`, `openLink`, `removeFromGroup`, `banFromGroup`, `noApps`, `inviteApp`, `secureNoticeTitle/Text/Link`, `enterAppUrl`, `appUrlInvalid`, `tabApps`, `tabAccount`, `settingsSaved`, `settingsEmptyHint`, `addApp`, `fileSent`, `jumpToMention`, `mentionMembers`, `reacted`, `openFile`, `deleteChatOpt`/`deleteMediaOpt`/`deleteContact*`/`deleteDataTitle`/`deleteDataBody`/`keepContact`/`deleteEverything`, `contactDetails`, `saved`, `owner`, `declinedInvite`, `noGroupPending` (new, #255).
  2. **5 shipped locales have no shell dictionary:** app ships 13 (`SpixiLocalization.cs:13-27`), `build-locales.mjs:20` generates **7** (de-de, es-co, fr-fr, sr-sp, sl-si, ru-ru, pt-br). **Missing: cn-cn, id-id, it-it, ja-jp, lt-lt** — Settings offers them (`settings.html:190-196`), so picking them silently falls back to English. Add to `build-locales.mjs` LANGS + `build-strings-iife.mjs:16` (legacy-id reuse gives free coverage; the rest fall back and are listed by `--todo`).
- **Also (BE, log it):** C# has hardcoded English — e.g. `HomePage.xaml.cs:854` `displaySpixiAlert("No recipient selected", …)` with no `_SL` keys.
- **Verification:** `extract-strings` → `build-locales` → `build-strings-iife` → `build-demo-bundle` → `build-shells` → `i18n-lint.mjs` + `pseudo-locale-smoke.mjs` + F5 with a real language pick (not just `?lang=`). Fallback-conflict state: #166 had 25, #175 reports 0 — `extract --check` gates regressions.
- **Effort:** ~½ day + translation debt. **Risk:** low-med (a missing `language-code` key would blank the string — hence the regex guard).

---

## 3. BATCH B — entry points + settings (ZERO-C#)

### B1 — Downloads (11) — **built, ships, just unreachable**

- `src/shells/downloads.html` **exists**, is bridge-wired, and is in `build-shells.mjs` SHELLS (`:43`) **and DEFAULT** (`:69`) — it ships today. Component: `createSettingsDownloads`/`setDownloads` (settings-shell.js). `DownloadsPage.xaml.cs:19` loads it. Contract: C#→JS `clearFiles` + `addFile(name, ctime)`; JS→C# `ixian:onload` · `ixian:back` · `ixian:open:<name>` · `ixian:delete:<name>`.
- The entry verb **`ixian:downloads` exists — on `HomePage:500-502`** (→ `PushModalAsync(new DownloadsPage())`). **No shell emits it.**
- The settings hub **has a Downloads row, correctly gated OFF** (`settings-shell.js:847` — `capabilities.downloads && onDownloads`; `settings.html:366` passes only `{contributors:true}`) because **SettingsPage has no `ixian:downloads` dispatch**.
- **Two routes — Damir picks (interview Q5):** (a) zero-C# stopgap: emit `ixian:downloads` from home.html (works today, but needs an affordance); (b) **BE row `S8` already written** (`be-cutover-brief.md:71`, "trivial"): add the verb to SettingsPage → un-gate `capabilities.downloads`. (b) is the architecturally correct home (ARCHITECTURE §5).
- ★ **Security still owed (C#):** `..` traversal on `ixian:open/delete:<name>` — `ARCHITECTURE.md:288` (§9.1, #152⑤). FE never composes paths and renders names via `textContent`, but the C# guard is unbuilt. **Flag it to BE; do not paper over it in FE.**

### B2 — Chat pattern default + levels (12)

- The setting **already exists with 4 levels**: `PATTERN_LEVELS = [0 Off, 0.3 Subtle, 0.5 Standard, 0.7 Bold]` (`settings-screens.js:27-32`) + TEXT_SIZES S/M/L/XL; screen `createChatAppearance` (`:166-219`) with a live preview; row wired unconditionally at `settings.html:386`; persisted as `spixi.chat.pattern`/`.textscale` (`settings.html:240-250`, default 0.5); applied pre-paint by `chat.html:21` (dark derives as `pick × 0.36`, preserving the #76 ratio).
- **The bug is exactly your complaint:** desktop doesn't *default* to off — it is **hard-forced off**, so the user's pick does nothing there:
  - `src/shells/chat.html:95` — `:root[data-desktop] .c-chat-canvas::before { display: none; }`
  - `:96` — desktop dark ground `--chat-canvas-base: var(--neutral-1000)`
  → on desktop the Chat-appearance screen shows a preview and 4 working levels that **have no effect**.
- **Minimal fix (2 files, no component change):** delete the `::before{display:none}` override at `:95` (keep `:96` if Damir still wants the dark ground — interview Q2); make the `chat.html:21` boot script default to `0` when the pref is **unset** *and* `data-desktop` is present; mirror the same platform-aware default in `settings.html:242` `readChatPrefs()` so the radio shows **Off** pre-selected on desktop.
- **Effort:** ~1-2h. **Risk:** low.

### B3 — Transaction details (10) — **a zero-C# full-parity path already exists in C#**

- Today: tx tap → `wallet-shell.js:91` hard-codes `openTxSheet` → in-page sheet with **partial** data (`addPaymentActivity` carries no address/fee — be-cutover W1–W4).
- **But `ixian:txdetails:<txid>` already exists** — `HomePage:473-479` → `onTransaction` (`:1053`):
  - **WIDE** (Width ≥ 700) → `new WalletSentPage(tx, true, this)` swapped into `rightContent` (`:1068-1094`) = **the pane** — and pushes `selectTx` (`:1093`), which `home.html` **already handles** (`:1567`) and styles (`.c-txlist-item[aria-current]`).
  - **NARROW** → `Navigation.PushAsync(new WalletSentPage(...))`.
  - Both load **`wallet_sent.html` — a LEGACY file, not in `build-shells`.**
- **WalletSentPage's contract = full legacy parity** (`Pages/Wallet/WalletSentPage.xaml.cs`): `clearEntries()` · `addEntry(address, username, avatar, amount, fiat, time, type, confirmed)` (:176/:214) · `setReceivedMode()` (:197) · **`setData(amount, fee, time, txid, confirmed)`** (:225) · `hideBackButton()` when pane-hosted (:62). Verbs in: `ixian:onload` · `ixian:dismiss` · **`ixian:viewexplorer` → TX-SCOPED** (`?p=transaction&id=<txid>`, :93-95). `updateScreen()` re-polls until confirmed (:230-236) → **live confirmation updates**. Not available anywhere: block height / confirmation *count* (only the 4-state status).
- **The ask:** build **`src/shells/wallet_sent.html`** (drop-in over the legacy filename — the Stage-4a pattern), add it to `build-shells` SHELLS/DEFAULT, and switch the tx tap to emit `ixian:txdetails:<txid>` (needs a hook — `wallet-shell.js:91` hard-codes `openTxSheet`; add an `onTx` opt, as the demo capture-intercepts at `desktop.html:1706-1715`).
- **→ ZERO-C#, full legacy parity, desktop pane + mobile page both already work, separate WebView = isolation-consistent. Makes W1–W4 OPTIONAL.**
- ⚠ **Demo divergence — resolve with Damir (interview Q4):** `desktop.html dtOpenWalletDetail` (`:1636-1681`) builds the detail **inline** from a ghost sheet — the *in-page-sheet* model, a **different architecture** from the shell path. One of them has to change.
- ★ View-only. No signing, no compose. Money path untouched.

---

## 4. NOT YOURS TO BUILD (do not code these)

### Item 1 — Reply to a chat bubble — **BE-GATED, and the "BE says zero-C#" claim does not survive contact with the tree**

- FE is **fully built and gated**: bubble quote strip (`message-bubble.js:18-24`, rendered `:308-350`), composer context strip (`composer.js:249-333`), menu items behind `capabilities.reply/edit` (`message-menu.js:84-85`), shell gate `chat.html:1198-1199` (`bridge.cap('reply')` — C# never sets it → OFF in production; the demo simulates it).
- **No carrier exists in the protocol.** Send is `ixian:chat:<text>` → `onSend(msg)` (`SingleChatPage.xaml.cs:215-218`) — a **free-text tail**, so a reply-id can't be appended unambiguously (message text may contain `:`). The wire payload is `new SpixiMessage(SpixiMessageCode.chat, Encoding.UTF8.GetBytes(str), channel)` (`:753`) — **raw UTF-8, no parent field**. The inbound push (`:1603`) carries no parent id. Grep of the whole app tree: **zero** reply/parent/quote field.
- `SpixiMessage`/`FriendMessage` live in **Ixian-Core — a sibling project outside this tree** (`Spixi.csproj:271`). This is **exactly the C8 trap** (#215): a store that *looks* extensible but drops non-canonical user data on persist.
- **Do not build. Do not un-gate.** Write the BE ask instead: name the carrier (new `SpixiMessage` field vs app-layer encoding), then **prove a 2-device round-trip survives a chat re-open (persist)** before any FE work. Proposed shape: verb `ixian:chatReply:<parentIdHex>:<text>`; push = append `replyToId` **last** to `addMe`/`addThem` (additive, per `be-cutover-brief.md:10`). Log it as a be-cutover row.

### Item 14 — Splash — **split: the OS splash is native/platform, the boot moment is yours**

- Native splash today: `Spixi.csproj:107` — `<MauiSplashScreen Include="Resources\Splash\splash.svg" Color="#144576" …>`. The asset is the mark in grey on one blue, **legacy brand, one colour for both themes, no animation**. `MauiSplashScreen` is a **build-time rasterization** → a static image + solid colour. **Animation and light/dark variants are impossible through it** (they'd need Android 12+ splash API / `values-night`, iOS LaunchScreen + a post-launch view, WinUI static) → **NATIVE-PLATFORM, per-OS, BE/Damir asset task.**
- **What IS yours (zero-C#):** the app has **no interim loading page** — `App.xaml.cs:131-173` sets `MainPage` straight to LaunchPage/LockPage/HomePage, so after the OS splash you watch the first WebView boot. The boot machinery exists (`lock.html:11-47` instant-bg + `.boot__spinner`, removed on mount; C# `applyPageSurfaceColor`; #229/#230 load-then-present), and the **logo is already an inline SVG in the registry** (`icons.js:5` `"logo"`, currentColor). But **`home.html`, `settings.html`, `launch.html`, `empty_detail.html` have NO boot block** — i.e. the two shells you actually see at startup (`index.html`, `intro.html`) have no boot affordance at all. **Add the `lock.html`-style boot block + a CSS-animated logo, theme resolved pre-paint** — that covers the visible gap and is fully in-canon.
- A dedicated `splash.html` (shown while the Node boots) would be a **small C#** change (new page + `App.xaml.cs` interim MainPage) — not on the risky list, but it's a BE row, not a drive-by. **Ask Damir which of the three he means (interview Q9).**

---

## 5. BATCH C — desktop grammar + panes

### C1 — Overlay grammar (6): sheets → modals, three stay contextual (ZERO-C#)

- **The demo already encodes exactly your rule** (`src/demo/desktop.html`, presentation-only): `.dt-frame .c-sheet` (`:208-222`) → **all sheets become centered dialogs** (`min(480px,92%)`, radius-24, handle hidden `:223`); `[data-dt-anchor]` (`:227-237`) = anchored variant; **three exceptions**: bot **channel selector** drops under the topbar (`:972-978`), **row/message context menus** open at the pointer with source-row highlight (`:304-305`, `:1133-1162`), **attach grid** is a popover above the composer ⊕ (`:322-328`, `:1251-1258`). Stated at `desktop.html:473`.
- **Production shells do none of it** — `data-desktop` appears in `tokens.css` and the shells but in **zero component CSS**; every `c-sheet` is still a bottom sheet on desktop.
- **A central switch is feasible:** every sheet/modal funnels through `createSheet`/`createModal` → `openOverlay` (`overlay.js:83`); presentation lives entirely in `overlay.css` (`.c-sheet:17-35`, `.c-modal:50-70`). **Port the demo's rule into `overlay.css` under `:root[data-desktop]` → all 16 sheets become dialogs with zero JS change.** Full inventory (16 `createSheet` call sites incl. message-menu, attach-sheet, channel-sheet, member-sheet, chats-row-menu, chat-info, reactions, tip-sheet, wallet-shell `openTxSheet`, settings pickers, apps-menu, launch, nudges) and 9 `createModal` sites (no change needed) are in the audit notes — re-grep to confirm before you start.
- The 3 anchored ones need an anchor handle: `openMessageMenu` **returns** its sheet (`message-menu.js:97`) but `attachMessageMenu:121` swallows it → either add an `anchor` opt to `createSheet` (small, clean) or reuse the demo's MutationObserver (zero component change, already proven).
- **a11y (#205):** presentation-only → focus trap, focusin containment, focus restore, Esc, scroll lock all survive. **Two flags:** a right-click dropdown still announces as `role=dialog`/`aria-modal` (`sheet.js:21-22`) — APG would want `role=menu` + arrow keys; and **chat.html's hand-rolled channel selector is NOT a `c-sheet`** (#205 gave it bespoke focus management) → it will **not** pick up the central switch; handle it explicitly.
- ★ The money sheet's `lightDismiss:false` (`wallet-send.js:419`) is JS-side — a CSS switch cannot weaken it. Verify that in your own review.

### C2 — Add-app (7) and Add-contact (8) subpanes — **SMALL-C# routing, no new verbs**

- Both targets are **already redesigned shells**: `+` in Apps → `ixian:newapp` → `HomePage:391-393` → `AppNewPage` → **`app_new.html`** (`build-shells.mjs:39`, in DEFAULT). Add contact → `ixian:newcontact` → `HomePage:387-389` → `ContactNewPage` → **`contact_new.html`** (`:35`, DEFAULT).
- **"Subpane" = a presentation change, not a bridge change.** `pushPageLoaded(target, timeoutMs, tag, column, replaces, stageMargin)` (`SpixiContentPage.cs:664`) already supports pinning a page into the detail column — **exactly the #245/#247 pattern**. Route them there on wide windows. No new verbs, no shell rewrite.
- **Do NOT** rebuild add-contact inside home.html: verified (#215) that `HomePage` matches **only** `ixian:newcontact` (`:387`) — `checkAddress`/`request`/`qrresult` are **ContactNewPage** verbs (`ContactNewPage.xaml.cs:75/:90/:98`). So contacts-shell's built-in add-contact screen (`onCheckAddress`, `:17/:227`) **cannot** work from home today. The delegation is correct, not lazy. (An in-shell version = BE-gated + duplicates ContactNewPage. Not recommended.)
- **The scan hand-off survives a pane:** `ContactNewPage.quickScan` (`:129-134`) pushes ScanPage on the **root nav**, and the result returns via C# (`processQRResult:136` → `setAddress`). C#-mediated → the camera correctly takes the full window and returns to the pane.
- **On-device verify:** a pane-pinned AppNewPage/ContactNewPage renders correctly under `stageMargin`.

---

## 6. BATCH D — Create group (17) — built, unreachable, and **coupled to the money picker**

- **BUILT:** `createGroupSetup` (`contacts-shell.js:547`) — full-screen `c-contacts-group` panel: topbar "New group" (`:552`), **avatar picker** (`:564-579`), **name field** (`:583-586`), member chips (`:598-604`), **blind-group `role=switch` toggle** (`:606-633`). Emits `ixian:select:<blindFlag+name>:|addr|addr…` (docblock `:23-28`), `:|` name hazard gated.
- **DEAD in the app:** `src/bridge/contacts-page.js:61-64` → `onCreateGroup: () => bridge.send('ixian:newchat')` → `HomePage.newChat():835-843` → `new WalletRecipientPage(true,false)` → **`wallet_recipient.html` = the LEGACY page/design.** The docblock (`:14-20`) explains why: `ixian:select` is a **WalletRecipientPage** verb, not a HomePage one.
- **The verb is real and fully reachable — ZERO new C#.** `WalletRecipientPage.xaml.cs:77-90` parses `ixian:select:` → `blind = name[0]=='1'`, name, `split[1].Split('|')` addresses → `onPickSucceeded`. `HomePage.HandlePickSucceeded:850-906` → `GroupChat.CreateGroup(pubkey, contacts, groupName, hideParticipantAddresses)` (`:871`) + avatar promotion (`:874-881`) + `CreateGroupMessage(..., hideParticipantAddresses)` (`:882-883`). **Blind is REAL** (participant addresses hidden from members; the shells already honour it).
- **Work:** new `src/shells/wallet_recipient.html` + adapter (consume `noContacts`/`setMultiContactMode`/`clearContacts`/`addContact`/`loadAvatar`; emit `ixian:select:`/`ixian:avatar`/`ixian:newcontact`/`ixian:back`), add to `build-shells` SHELLS+DEFAULT, then re-present name/image/blind as a **sheet or modal** per Damir.
- ⚠ **THE ORDERING CALL (interview Q7):** `wallet_recipient.html` is **shared with the money flow** — `WalletSendPage.xaml.cs:84` uses the same page as the **payment-recipient picker** (single-select, groups filtered C#-side). Dropping a shell over it touches the send-payment entry path, and **wallet-send is scheduled LAST with human BE review (#232)**. Either the shell handles both modes (`setMultiContactMode` present = multi/group; absent = single recipient) or this batch waits for the wallet pass. **Damir decides — do not decide this for him.**
- **Related (#255 backlog):** `createWalletSend` consumes the **unfiltered** roster (groups as money recipients) — same file family, **fix as a prerequisite of the wallet-send batch**.
- ★ The picker only *selects*; it never composes or signs. C# owns the money path. Keep it that way.

---

## 7. Doc corrections you must land (the roadmap is lying in three places)

| Doc | Row | Correction |
|---|---|---|
| `docs/polish-roadmap.md:14-15` | M2 / M3 (calls) | **NOT "BE C4 first" — both are ZERO-C#.** The live-call bridge exists on the base class; C4 is only the history *bubble*. |
| `docs/polish-roadmap.md:27` | M15 (unread divider) | **NOT "no read-boundary signal" — the signal exists** (`read` arg on `addThem`, `SingleChatPage:1603`); the shell just declares 6 params. |
| `docs/i18n-wiring-spec.md:42` | "C# injects the per-shell `window.SL` block" | **Never implemented.** Production is always en-us. Fix the spec + the shells. |

---

## 8. Working rules for the session (§5c split)

1. **Interview Damir first** (§1) — one AskUserQuestion pass, don't drip-feed.
2. **Verify before you build** (#215): every "the bridge supports X" in this brief was checked, but **re-check anything you extend**, and prefer an on-device F5 over an in-tree inference where the tree can't settle it. The C8 lesson: a store holding system keys does NOT prove user data is key-agnostic.
3. **Zero-C# first.** Anything needing a verb → a be-cutover row + gate the FE behind a capability, **built and ready to switch on** (never left on legacy, never shown broken).
4. **One batch = one commit.** After each batch: bundle → shells → smoke, then Damir F5s, then a **separate Opus #46 loop** (you don't audit your own work).
5. **DECISIONS row for every significant call** — including the ones Damir makes in the interview.
6. **Mount hazard (#175):** the sandbox serves stale/truncated files to bash/node. **File tools are the only source of truth.** Never write a literal unclosed `*SL{` into anything a built page inlines (#248).
7. **Untouchable:** ★ the chat wall (#221) · the money path (WebView composes, C# signs) · `wallet-send` stays LAST · anything on the security-flagged list gates on human BE review (#232).
