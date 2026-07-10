# Opus work order — #46 AUDIT+FIX LOOP over DESKTOP PASS 3 (DECISIONS #247: chat-info pane + #225-M2)

> **You are the Opus adversarial review session. This is a fix LOOP, not a single
> review pass** — audit → fix → re-review until CLEAN (#46 hard rule). fable's
> self-review was a pre-filter, NOT the gate. Damir is F5-testing the batch in
> PARALLEL: if he reports findings at session start, fold them into the loop as
> auditor inputs before your first verdict.
>
> **Environment (#175):** read the REAL files with the Read tool ONLY — the PC mount
> serves stale/TRUNCATED copies to bash/node/grep (`chat-info.js` truncates at
> 761/774 lines; verified this batch). Verify JS via file-tool reads + logic tables;
> inline `node --check` harnesses in the outputs dir are OK for NEW standalone
> snippets. §5c: you author source + docs only — NO build-demo-bundle/build-shells/
> smoke runs on the tree; Damir runs those locally.
>
> **Entry-read order:** DECISIONS **#247** (the batch row — claims + accepted edges)
> → `desktop-split-spec.md` §6e.5 (the spec it was built against) → this file →
> the touched files. Background: #225 overlay model · #230/#235/#246 lock guards ·
> #245 stageMargin/Account pane · #232 standing directives · #220/#221 isolation.
>
> ## Loop protocol (#46)
> 1. Spawn **3 READ-ONLY adversarial auditors in parallel, disjoint scopes** (A/B/C
>    below). Findings = MAJOR/MINOR/NIT with file:line; security dimension explicit.
> 2. Land MECHANICAL fixes directly (disjoint file scopes if parallel fixers);
>    architectural findings = 🟡 DECISIONS rows, never silent changes.
> 3. **Fresh break-my-verdict re-review of every fix AND of the 1–2 highest-risk
>    CLEAN verdicts** (#235 lesson: a single-pass CLEAN on a cross-file security
>    surface is not enough). Loop fix↔review until CLEAN.
> 4. Close out: verdict appended to THIS file · DECISIONS row · CLAUDE.md status
>    line · Damir's exact local command list (component touched → FULL sequence).

## Scope (everything #247 touched)

| File | Change |
|---|---|
| `Spixi/Utils/SpixiContentPage.cs` | `onOverlayPresented` virtual host hook (fired in `presentPreload` overlay branch after visibility, BEFORE same-tag close) · `rehomeOverlay(target, col)` (MUTATES `op.column`; clears stage margin) · `relayoutPinnedOverlays(wide)` (#225-M2; does NOT mutate `op.column`; includes a staging `activePreload` when `overlayMode`) |
| `Spixi/Pages/Home/HomePage.xaml` | mainGrid col 2 (`Width="0"`) |
| `Spixi/Pages/Home/HomePage.xaml.cs` | consts `infoPaneWidth 360`/`infoPaneMinWidth 280`/`detailMinWidth 320` + flags `infoPaneCol2Pending`/`infoPaneCol2Open` · `openContactDetails(friend, customChatBtn)` router (toggle by address / col-2 margin-stage / col-1 pin / takeover) · `closeContactDetailsOverlays()` + call sites (`onChat`, `ixian:tab:`, `onTransaction`, `onOverlayClosed(SingleChatPage)`) · `onOverlayPresented` override (present-time pin: room + chat-open re-checks, degrade → `rehomeOverlay(-1)`) · `onOverlayClosed(ContactDetails)` col-2 collapse guarded on "no ContactDetails remains" · `OnPageSizeChanged` both branches (col-2 zero + `relayoutPinnedOverlays(false)` / `updateInfoPaneWidth` + `relayoutPinnedOverlays(true)`) · `updateInfoPaneWidth()` (+ divider-pan Running call) · `onUpdateUI`: `ContactDetails`-top also ticks `SingleChatPage` overlays |
| `Spixi/Pages/Contacts/ContactDetails.xaml.cs` | ctor 3rd param `paneColumn` ("1"/"2"/null) · `setPaneMode` pushed FIRST in `onLoad` · `friendAddressString()` |
| `src/shells/contact_details.html` | `setPaneMode` handler → `body[data-pane='1'\|'2']` · pane CSS (`__body` 640 cap centered; pane-2 leading hairline `outline-neutral-03`) · contract comment |
| `src/shells/home.html` | chats-shell opts `onChatInfo`: 1:1 → `ixian:details:<addr>`, group/bot → `ixian:chat:<addr>` (quirk 13) |
| `src/components/chat-info.js` | title fallback fix (quirk 7): group → `strings.groupInfo \|\| 'Group info'` (new key, inline fallback) — **bundle rebuild** |
| `src/components/chats-row-menu.js` | header comment only (stub note removed) |
| Docs | desktop-split-spec §6e.5 · be-cutover CI6/CI7 · DECISIONS #247 · `polish-roadmap.md` (triage) · CLAUDE.md status |

## ★ Non-negotiables to attack hardest

1. **Chat isolation (#221, Damir re-affirmed mid-batch):** ContactDetails stays its
   OWN WebView; NO code path composes it into (or bridges it with) the conversation
   WebView; coordination = C# verbs only (`ixian:details`, `ixian:details:<addr>`,
   `ixian:chat:<addr>` — all pre-existing). `rehomeOverlay`/`relayoutPinnedOverlays`
   must move the STAGE (ContentView) via attached-property/margin flips only — never
   re-parent/merge WebViews, never touch `op.target.Content`.
2. **Lock invariants (#230/#235/#246):** locks stage via `pushModalLoaded` full-span
   zero-margin ADDED LAST → must cover col 2 + the pane + the divider. Verify:
   modal ops are NOT in `overlayStack` and `activePreload` joins `relayoutPinnedOverlays`
   only when `op.overlayMode` — so NO resize path can ever re-home/inset a lock stage.
   `pushPageLoaded`'s fail-closed `modalOverlayOp != null` drop still precedes staging;
   `hasModalOverlay()` back-swallow still precedes everything in `OnBackButtonPressed`.
3. **Settings pane undisturbed (#245/#246):** `rehomeOverlay` clears `stage.Margin` —
   prove it is reachable ONLY for ContactDetails overlays (the
   `onOverlayPresented` guard chain), and `relayoutPinnedOverlays` skips `op.column < 0`
   (the margin-inset Account pane). The save-if-dirty close-audit for settings must be
   byte-identical (this batch adds `closeContactDetailsOverlays` NEXT TO
   `requestSettingsOverlayExit`, never instead of it).
4. **No risky C# (#232):** no signing/keys/paths/pane-bridge anywhere. Wallet-send
   stays gated OFF; nothing here touches money beyond pre-existing
   `ixian:send`/`request` verbs already on the ContactDetails page.
5. **Mobile untouched:** narrow path = the pre-#247 full-span takeover, `setPaneMode`
   never pushed (paneColumn null), `body[data-pane]` CSS inert, chats row-menu on
   mobile routes the same verbs (takeover presentation).

## Auditor scopes (disjoint)

- **A — C# overlay machinery + lifecycle races** (`SpixiContentPage.cs` +
  `HomePage.xaml.cs` overlay parts): col-2 width vs overlay lifecycle — tag-replace
  swap ordering (hook fires BEFORE same-tag close; old pane's `onOverlayClosed` must
  not collapse the column the new pane just expanded — the "none remains" guard);
  `infoPaneCol2Pending` truth table (set at push → consumed at present / stale after a
  busy-guard drop / abandoned op never fires the hook); toggle-close vs staging;
  squeeze-close inside `updateInfoPaneWidth` during divider pan (closeOverlay removes
  from stack synchronously — verify against the async teardown); star-vs-absolute
  `ColumnDefinitions[0].Width.Value` reads (star returns the multiplier! must only be
  read under wide guards — check every read); `onUpdateUI` tick change (any
  double-tick / cost concern); exception paths in the new statics (fail-soft only).
- **B — #225-M2 resize matrix** (`OnPageSizeChanged` + `relayoutPinnedOverlays` +
  `rehomeOverlay`): wide→narrow with (chat) / (chat+info-col2) / (info-col1) /
  (settings pane) / (lock in place) open; narrow→wide return trips (col-2 width
  restored only when `infoPaneCol2Open`); resize mid-STAGE (activePreload included;
  margin-staged info op has column -1 → skipped — confirm the present-time re-check
  really covers every landing); rapid flapping; z-order after full-span re-home
  (info above chat = stack order); divider drag to both extremes with the pane open;
  700px boundary exactly.
- **C — shell/UX + FE** (`contact_details.html`, `home.html`, `chat-info.js`,
  `chats-row-menu.js`): `setPaneMode` before first commit (no takeover→pane reflow
  flash; handler safety for junk args); the 1/sec `updateScreen` churn inside the
  pane (coalescer/edit-guard unchanged); pane-2 hairline vs home's right-edge
  hairline (no double line in the col-1 case); 640 cap grammar vs #245b; group/bot
  row-menu routing (no contact-style money surface for groups; `c.type` is the
  CH1-folded 'group' for bots too — intended); quirk-7 title fix reaches BOTH the
  chat.html takeover (via bundle) and contact_details (context 'contact' unaffected);
  new string key `groupInfo` inline-fallback pattern; smoke-test collisions (the
  existing `aria-label="Chat info"` assertions target the topbar ACTION, not the
  panel title — verify).

## Claimed behaviors to falsify (from DECISIONS #247)

1. Col-2 pane presents with ZERO empty-strip frames (margin-stage at real width →
   pin + expand in the visible frame).
2. Every close path is audited: chat close/switch, tab, tx, back, Account-over,
   locks-over, toggle. No path strands an info pane beside nothing (present-time
   chat-open re-check covers the close-during-load race).
3. Narrowing with pane+chat open yields stacked takeovers, back peels info→chat;
   re-widening restores both columns.
4. Direct close is safe — contact_details holds NO committable edits (verify no
   held-edit state exists in the shell/component: nickname editor commits per-action;
   an in-progress nickname edit being discarded by a close is ACCEPTED, not a MAJOR).

## Known/accepted edges (fable self-review — challenge, don't re-litigate dials)

- Degrade-during-load presents a pane-styled (`data-pane`) full-span takeover —
  cosmetic, sub-second window; a `setPaneMode` un-push was judged not worth it.
- A competing nav while the pane stages is dropped by the existing single-preload
  guard (pre-existing class, matches chat/settings).
- A NARROW-BORN overlay (chat opened <700: full-span, `op.column = -1`,
  `homePage = null`) stays full-span after widening — PRE-EXISTING #225 behavior,
  out of scope here (#225-M2 fixes the stranding direction + column-born returns).
- `infoPaneWidth` 360 / min 280 / convo floor 320 / back-arrow (not X) close glyph =
  Damir dials, not findings.
- Groups keep the in-chat info takeover (CI7 logged); shared media/files = CI6
  (no push contract — deliberately NOT built on a guessed shape, #215 lesson).

## ADDENDUM — F5 round 2 (DECISIONS #248, same session; audit BOTH rows as one batch)

Damir F5'd #247 and filed 5 findings + 2 flicker reports; #248 landed on top. Extra scope:

| File | #248 change |
|---|---|
| `Spixi/Pages/Contacts/ContactDetails.xaml.cs` | ctor `chat_context` · `setContext` push · GROUP surface: `setGroupInfo` + `loadMembers` roster (blind masking, FriendList nick fallback) · verb forwards `ixian:leave` (SingleChatPage mirror) / `en\|disableNotifications` / `kick:` / `ban:` (sendBotAction + alert) · `updateScreen` group guard (no presence/txs) · new using `IXICore.SpixiBot` |
| `Spixi/Pages/Home/HomePage.xaml.cs` | new verb `ixian:chatinfo:<addr>` (context 'chat') · `openContactDetails(..., chatContext)` · **degrade → col 1** (wide-no-room/no-chat pins the DETAIL slot — covers only the convo region; full-span only when narrow) · same in `onOverlayPresented` |
| `Spixi/Pages/Chat/SingleChatPage.xaml.cs` | fallback ctor args (chat context) · `setGroupOwner` push in onLoad (group/bot, **suppressed for blind groups**) |
| `Spixi/Utils/SpixiContentPage.cs` | overlay + modal STAGES get `BackgroundColor = target.pageSurfaceColor` (divider-drag WebView2 resize slivers now theme-matched; locks keep their own dark) |
| `src/shells/contact_details.html` | context/kind/group state + handlers (`setContext`/`setGroupInfo`/`clearMembers`/`addMember`, buffered roster) · group branch in `buildPanel` (forced context 'chat', owner mapping, masked-payload guards on kick/ban) · stateSig extended |
| `src/shells/chat.html` | header tap + NEW info-circle action on every chat: 1:1+groups → `ixian:details`, bots keep the in-chat takeover · `setGroupOwner` handler + owner flag in `collectGroupMembers` + per-peer reset |
| `src/shells/home.html` | row-menu → `ixian:chatinfo:` for both kinds (replaces the #247 group→open-chat hack) |
| `src/shells/empty_detail.html` **NEW** + `scripts/build-shells.mjs` | redesigned themed empty-detail (replaces the always-dark legacy right-pane resting page); manifest + DEFAULT entry |
| `src/components/chat-info.js` | "Owner" badge (owner excluded from kick/ban) — bundle rebuild |

**Extra attack surfaces for the auditors:**
- **A:** the ContactDetails verb forwards — confirm they mirror SingleChatPage semantics
  EXACTLY (leave: group vs bot branches; notifications persist via `saveMetaData`;
  kick/ban payload = `addressWithChecksum`), no money/keys/paths touched, `StreamProcessor`
  resolves to `SPIXI.StreamProcessor : CoreStreamProcessor`. Verify `ixian:chatinfo:`
  can never be shadowed by the `ixian:chat:`/`ixian:details:` Contains checks (substring
  analysis) and vice versa.
- **A:** `getOwner()` return-type assumption (Address → `.ToString()` base58). If it were
  `byte[]`, `ToString()` compiles but yields garbage — the shell fails SOFT (chip just
  never matches) but flag it for Damir's F5 if the chip doesn't show.
- **B:** degrade-to-col-1 stacking — info pinned col 1 OVER the chat overlay (z = add
  order): back-peel order, toggle, chat-close cascade, narrow re-home of a col-1 op.
- **C:** blind-group hygiene — owner NEVER pushed (both C# sites), masked '[Unknown]'
  never sent in kick/ban, addresses masked in the roster; context forced 'chat' for
  groups even from the directory; bot header keeps the takeover (mode.isBot branch).
- **C:** empty_detail shell — `*SL{}` markers live in HTML TEXT nodes only (localized
  apostrophes can't break JS), fallback swap for previews, `.t-heading-sm`/`.t-body-sm`
  base.css classes (no bogus font vars), instant-bg + theme boot parity with the other
  shells, `ixian:onload` fires once. ⚠ BOOT-CRASH RULE (found on Damir's F5): the C#
  `generatePage` line parser (`SpixiLocalization.cs:205`) throws on any line containing
  the raw `*SL{` sequence without a `}` after it — the preview fallback now assembles
  the marker at runtime (`'*SL' + '{'`). Verify NO source that reaches a built page
  (shells, bundle, icons/strings iife) reintroduces an unclosed marker; a repo sweep
  ran clean. (Optional flag for BE: the parser itself could fail soft — one-line guard.)
- **Stage backgrounds:** verify `target.pageSurfaceColor` is initialized by ctor-time
  `loadPage` for every staged page class, and that an opaque stage cannot cover anything
  it shouldn't (it sits exactly where the page content sits; Opacity 0 while staging).

**Known/accepted (#248):** the open-pane convo-resize flicker is a WebView2 compositor
limit — theme-matched backing only softens it; the zero-resize FLOAT variant (pane over
the convo edge) is the queued dial if Damir still sees it · group rename/re-avatar = CI7
(BE; no verb exists — do NOT let a fix invent one) · media strip = CI6 (no feed).

## Close-out

Verdict + fixes appended below this line; DECISIONS row; CLAUDE.md status; Damir's
command list — component touched (chat-info.js) → FULL sequence:
`node scripts/build-demo-bundle.mjs` → `node scripts/build-shells.mjs` →
`node scripts/smoke-test.mjs` → build **net10.0-windows** (NOT Rebuild Solution) →
F5 the #247 checklist → commit (together with the #246 avatar fix if still uncommitted).

---

## VERDICT (in-session #46 loop, 2026-07-10 — Damir delegated the loop to the build chat; 3 Opus auditors A/B/C + fresh Opus break-my-verdict re-reviewer, all over the REAL files via Read)

**PASS / CLEAN after one fix round.** Batch = #247 + #248 + #249 (round-3 F5 fixes were in scope).

- **Auditor A (C# overlay/lifecycle): 1 MAJOR, 1 MINOR, 3 NIT** → **A-1 MAJOR FIXED** (tag-replacing a col-2 pane with a col-1 pane orphaned an empty expanded 360px column — `onOverlayPresented` now collapses col 2 on any non-pending ContactDetails present + on the pending degrade path) · A-2 FIXED (notifications forwards null-guard `botInfo`) · A-3 FIXED (star-vs-absolute `Width.Value` reads now under wide guards, both sites) · A-4 FIXED (kick/ban payload parse try/catch, alert inside the try) · A-5 accepted (blind nick `"x"+address` = exact legacy parity; ContactDetails masking is MORE protective than SingleChatPage — harmonize at CI1).
- **Auditor B (resize matrix): 0 MAJOR, 2 MINOR, 2 NIT** → **B-1 REJECTED with verified rationale** (the 72px inset on a narrowed Account pane reveals the home shell's RAIL, which is `data-desktop`-gated and width-INDEPENDENT — intended #245 layout; re-reviewer confirmed no width query hides the rail) · B-2 accepted as a dial (a col-1-degraded info pane does not auto-promote to col 2 on widen; close+reopen restores — Damir's call if wanted) · B-3 = A-3 fixed · B-4 accepted (col-2 pane over a NARROW-BORN full-span chat — pre-existing #225 edge class).
- **Auditor C (shells/FE): 0 MAJOR, 2 MINOR, 4 NIT** → C-1 FIXED (Owner/Admin badge threaded into the member SHEET — row and sheet now agree; `createBadge` already imported) · C-2 logged to **CI1(b)** (per-member admin flag missing → the component's "never kick/ban a fellow admin" guard is DORMANT; only the owner is protected — role-int semantics = BE) · C-3 FIXED (dead in-chat takeover block explicitly marked retained-unreachable) · C-4 FIXED (`executeUiCommand` no-op guard in empty_detail) · C-5 FIXED (literal star-SL sequence removed from the CSS comment) · C-6 FIXED (stateSig roster sort — no rebuild churn on re-ordered pushes). Security angles CLEAR: no blind-group address leak anywhere (member-sheet blind branch short-circuits identity), no XSS (textContent/createElement throughout), no context-title flash (coalescer), chat wall #221 intact.
- **Re-reviewer: ALL 8 FIXES PASS; non-negotiables verified intact** (lock modal ops unreachable by relayout; settings pane margin/close-audit untouched; `closeContactDetailsOverlays` always BESIDE `requestSettingsOverlayExit`). 2 cosmetic pre-existing NITs logged: ① #245 `wide` is width-based, not UA-based — a wide-screen MOBILE-UA tablet would get the 72px rail inset without a rail (out of scope, note for the tablet pass) · ② squeeze-close holds col 2 ~100ms during the async fade (self-healing).

**Damir follow-up dials (non-blocking):** B-2 auto-promotion on widen · the zero-resize FLOAT pane variant if the open-pane convo-resize flicker still shows · CI1(b) role semantics (arms per-member Admin badges + protection) · CI7 group rename/re-avatar (protocol).

**POST-VERDICT ROUND 4 (#251, 2026-07-11, session close — 2 mechanical F5 fixes, self-reviewed):** EmptyDetail missed by EVERY re-theme path (not in NavigationStack/overlays/detailContent) → `HomePage.getDefaultDetailContent()`/`reloadDefaultDetail()` + SettingsPage push + `reloadAllPages` leg + a REAL `window.setTheme` global in empty_detail.html (the loop's C-4 no-op stub couldn't receive pushes — `sendUiCommand` passes the command as a bare global identifier; dispatcher corrected accordingly) · `contact_details.html` gained `search-field.css` + `member-sheet.css` (the group surface newly exercises both; chat.html parity).
