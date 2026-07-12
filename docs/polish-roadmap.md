# Polish roadmap — Damir's "missing to polished app" list (2026-07-10)

> Triage of Damir's 17 missing bits + 18 quirks against what exists. Owner key:
> **FE** = zero-C#, buildable now · **C#** = small/non-risky native · **BE** = needs the
> BE engineer / new verbs (row in `be-cutover-brief.md`) · **GATE** = blocked by a #232
> standing directive. Demo (`src/demo/*.html`) = the target grammar. Batches should stay
> small (Damir: "smaller batches with perfect code, easy to review"; Opus reviews each).

## Missing bits

| # | Item | State | Owner / next step |
|---|---|---|---|
| M1 | Reply to chat bubble | FE BUILT + cap-gated (#79/#25: quote, composer strip, menu Reply) | **GATE — BE-verify-first** (#215 lesson): BE names the carrier + 2-device F5 round-trip/persist BEFORE un-gating |
| M2 | Incoming-call overlay | **✅ Batch A** — the old row was WRONG twice: the LIVE call bridge (`addCallAppRequest`/`clearAppRequests` + `appAccept`/`appReject`, SpixiContentPage.cs:1387/:1355/:1449) exists on the base class and is ZERO-C#; C4 is only the history *bubble*. c-callin wired into 12 shells via `call-ui.js` (Accept/Decline only — no Ignore, no local-dismiss verb) | Damir F5. Mid-session delivery is single-consumer → home's WebView (flag semantics) — broadcast = **BE C19** |
| M3 | In-call banner | **✅ Batch A** — same wrongness: `displayCallBar`/`hideCallBar`/`ixian:hangUp` are live, zero-C# (text pre-composed, "0" = dialing → timer hidden). Wired everywhere with M2 | Damir F5. Return-to-call needs the friend address appended to `displayCallBar` (**BE C19** arg-append; FE pre-wired) |
| M4 | Chat info in right column + shared media/files | **✅ #247 pane** (1:1). Media/files = **CI6** (no push contract) | BE CI6 feed → FE section lands (designed, demo-fed) |
| M5 | "Request sent" chip on outgoing contact request | **✅ #253 (round 2)** — real signal = the unapproved-state `chat-waiting-for-response` override (carrier) + direction guard (localSender status-type); row rides the **Requests chip** (count + filter + leave-guard), excerpt = "Request sent" (`request` type; `user-plus` **ships today** — icons.js:81, the registry check is a safety net, corrected by the #255 loop), contacts-picker **pending badge** lit via requestAddrs | Damir F5; dials: pill weight · rows also stay under All · **row menu still deletes/pins an outgoing request (#255 dial)** |
| M6 | Desktop: sheets → modals / context menus | **✅ Batch C (#261)** — central CSS switch (`overlay.css` `:root[data-desktop]`: every c-sheet = centered dialog, handle hidden) + the 3 contextual exceptions (right-click menus anchored at pointer w/ source-row highlight · attach grid rises from ⊕ · channel selector already top-anchored) via NEW `desktop-anchors.js` (demo's proven observer recipe). Presentation-only; #56/#205/money locks untouched | Damir F5 (desktop: right-click a row/message · long-press stays dialog · ⊕ popover) |
| M7 | Add app → desktop subpane | **✅ Batch C (#261)** — `ixian:newapp` wide → detail column (tag "formpane", #247 machinery); narrow unchanged | Damir F5; dial: navigate-away closes the form (input discarded) |
| M8 | Add contact → desktop subpane | **✅ Batch C (#261)** — same routing (shared tag → the two forms swap seamlessly); QR hand-off verified (root-nav ScanPage → setAddress returns to the pane) | Damir F5 |
| M9 | Wallet send/receive + desktop subpane | FE compose surfaces BUILT + gated (`composeSend`) | **GATE — wallet-send LAST (#232)**; receive/QR could precede (Damir call) |
| M10 | Tx details subpane + demo parity (legacy field set) | **✅ Batch B (B3, #259)** — redesigned `src/shells/wallet_sent.html` drops in over the legacy filename (ZERO-C#): full legacy parity (address/fee/txid/live status via WalletSentPage's own pushes), demo detail-card look (ghost-lifted `.c-txsheet`), pane (hideBackButton) + pushed page both. Tx tap = `ixian:txdetails:<txid>` (wallet-shell `onTx` opt); in-page sheet = demo-only. **W2–W4 now optional** | Damir F5; X1 residual: wrap WalletSentPage's addEntry avatar (be-cutover X1 note) |
| M11 | Downloads (both modes) | Legacy DownloadsPage only; redesigned feed BE-gated (S8) | **BE S8** feed → FE screen (designed) |
| M12 | Pattern OFF by default + off/subtle/standard/bold in Chat appearance | **✅ Batch B (B2, #259)** — the 4 levels already existed (#236 ③); the bug was the #207 desktop HARD-FORCE (`::before{display:none}` made the setting dead on desktop). Now: ONE key, platform-aware default when unset (desktop Off / mobile Standard), force deleted, dark grey-1000 ground kept, #76 ink untouched; settings readChatPrefs mirrors the default | Damir F5 (desktop defaults Off, pick works both platforms) |
| M13 | Languages apply everywhere, nothing hardcoded | **✅ Batch A (core bug)** — production was HARD-WIRED en-us: shells resolved `?lang=` \|\| 'en-us' and C# never appended a query; fixed via the C#-substituted `language-code` SL carrier (zero-C#). extract-strings + i18n-lint now sweep `src/shells` too; 5 dictionary-less locales (cn/it/id/ja/lt) hidden from both pickers until translated (Damir); ~42 new keys drafted ×7 locales. **RESIDUAL (Damir F5 2026-07-11, deferred by his call to the i18n sweep):** several surfaces still render English under a real locale — main screens, contacts list, new contact, wallet, tx details. Triage suspects, in likely order: `strings` objects not threaded into those component mounts (the home.html `{}` class — check mountContacts / wallet takeovers / tx sheet opts) · keys sitting in the 17-per-locale english-fallback --todo lists · C#-verbatim pushed strings (tx type/time labels are pre-composed C#-side and follow the C# language, not window.SL) | i18n sweep batch: audit every mount's strings threading + run --todo per locale |
| M14 | Splash screen (light/dark, animated logo) | **✅ FE half, Batch B (#259)** — in-app boot moment: instant-bg + pulsing brand-logo cover (theme-resolved pre-paint, reduced-motion respected, dropped at window load) on home/settings/launch(×5 files)/empty_detail; launch also gained its missing instant-bg + the queued #228 flag. OS splash art stays native (**be-cutover [SPLASH-ART]**) | Damir F5 (no bare white/dark gap at startup) |
| M15 | Unread messages bar | **✅ Batch A** — "no read-boundary signal" was WRONG: the 11-arg message push carries `read` and precedes the read-flip (SingleChatPage:1603/:1661), so the open burst is a true exactly-once boundary; the shell's 6-param `addThem` was silently discarding it. One-shot in-place divider (Damir), grouping breaks at it, per-peer reset | Damir F5 (on-device: `read` = "False" first open, "True" after) |
| M16 | "Connecting…" as topbar title-state, not banner | **✅ #252** — chat: presence-sub swap in place (aria-live-safe) · home: root-title swap + first banner surface (update-available now renders); routing via locale-proof `*SL{}` equality carriers (no §8 param needed) | Damir F5 |
| M17 | Create group: new design, modal/sheet for name/image/blind | Two-step creation BUILT (#153/#155: multi-select → setup avatar/name/blind) | FE redesign pass vs demo grammar; group avatar/rename verbs for EDIT = CI7 |

## Quirks

| # | Quirk | State / fix |
|---|---|---|
| Q1 | Restore: file-set state must be distinct ("Replace file") | FE launch-shell tweak (restore view state machine) — queue next launch batch |
| Q2 | Create-screen gradients too hot (soften like lock #206⑥) | FE tokens/launch CSS dial — same batch as Q1 |
| Q3 | Send/receive IXI demo-parity analysis | **GATE — wallet-send LAST (#232)**; analysis doc allowed earlier |
| Q4 | Incoming chat payment missing "+" / off-component | **✅ #252** — received direct payments '+' (title-carrier match, collision-guarded); requests/sent stay bare (matrix canon) |
| Q5 | New group appears in contacts DIRECTORY (should be chat-only) | **✅ #253** — filtered from BOTH takeover purposes (directory + 'start' picker; dial if 'start' should keep them) via CH1-kind set + group-avatar sentinel; residual zero-message custom-avatar group edge → §9 type-arg ask |
| Q6 | Call bubble shows "Call back" while call still active | **BE C4** (addCall carries no live state) — bubble fix rides the C4 batch |
| Q7 | Group info titled "Chat info" | **✅ FIXED #247** (component fallback bug) |
| Q8 | Edit group photo/name from chat info (admin) | **BE CI7** — no rename/re-avatar verbs exist |
| Q9 | Bot topbar tap re-opens channel list instead of closing | **✅ #252** — title tap toggles closed; #205 focus-restore intact |
| Q10 | Composer autofocus: off on mobile, on on desktop; tone down desktop active state | **✅ #252** — autofocus desktop-gated; ring 2px→1px desktop-scoped (dial: neutral hairline if still loud) |
| Q11 | Fulfilled payment request = 2 bubbles | **C10** (logged #207) — request↔payment linking, BE/UX decision |
| Q12 | Send file then delete → excerpt still "file" | **✅ #253 + Opus loop #254/#255** — verified NO C# re-push on local delete → `spixi.exdel.<addr>` localStorage handshake (#238 trio), addChat fold-in + ts-equality expiry. Loop changes: hint shape = **`{del,t,kind}`, NO message text** (★ #254 security ruling — mini-apps share the `file://` localStorage partition) · writer **latched to LOCAL deletes** (remote `msgDelete` never mutates core → be-cutover **C16**) · typing/reaction precedence + orphan-key prune. Text tails degrade to a blank excerpt until the next push |
| Q13 | Row menu → Chat info dead | **✅ FIXED #247** (1:1 → details; group → opens chat) |
| Q14 | Lock screen overlaps at smallest size | FE lock.css responsive floor (min-width 384 window, #231c) — small dial batch |
| Q15 | @-mention list scrollbar clunky | **✅ #252** — picker rides `.u-scroll` (#41) |
| Q16 | Delete account: wipe all data + land on welcome | Verify C# `ixian:delete*` flows actually purge + navigate; likely **BE** (settings danger zone) — add to S-rows after F5 check |
| Q17 | Restore flow: skip backup nudge; community node when connected | Onboarding tail logic — C# knows restored-vs-created (L-row family); **BE L** amend |
| Q18 | Reject contact request → row returns with request | **BE CH2 amend**: `declineRequest` removes the friend but the counterpart's pending request re-adds on next contact; needs a decline tombstone/ignore list C#-side |

## Suggested batch order (small, review-friendly)

1. **✅ #247 + #248** chat-info pane + M2 resize + Q7/Q13 + F5 round (context titles ·
   shell-side GROUP info pane w/ owner chip · degrade-to-col-1 · info icon · themed
   empty state · stage-background flicker fix). Group rename/re-avatar (Q8) = CI7 BE;
   media strip (M4) = CI6 BE; open-pane resize flicker = FLOAT dial queued if needed.
2. **✅ #252 Chat polish FE batch:** Q4 · Q9 · Q10 · M16 (topbar connecting) · Q15 — in-session #46 loop CLEAN; pending Damir build+F5+commit.
3. **✅ #253 Chats-list/contacts FE batch:** Q12 · Q5 · M5 — built + smoke green, Damir F5-passed. **Opus #46 loop RAN 2026-07-11 → CLEAN (#254 security ruling + #255 verdict; 1 MAJOR + 6 fixes landed).** Pending: Damir's FULL rebuild + F5 → commit #253+#254+#255 as ONE batch. New backlog from the loop: wallet-send roster filter (money, pre-req of the wallet batch) · be-cutover **C16** (remote delete not persisted) + **C17** (addContact state arg) · dial: gate the row menu on outgoing-request rows.
4. **Chat appearance + dials FE batch:** ~~M12~~ ✅ Batch B · remaining: Q14 · Q1+Q2 (launch).
5. **✅ Batch C (#261):** M6 sheets→dialogs/menus (spec = desktop-split-spec §6e.6).
6. **✅ Batch C (#261):** M7 + M8 form panes (M10 landed in Batch B).
7. **i18n sweep:** M13 (extract + pseudo-locale over all shells).
8. **✅ Batch A (missing-bits brief):** M2+M3 calls · M15 divider · M13 languages — all zero-C# (the C4/read-boundary claims above were wrong; corrected in the rows). Pending Damir build+F5 → separate Opus #46 loop.
9. **✅ Batch B (missing-bits brief §3/§4):** M12 pattern default · M10 tx-details shell · M14 splash FE half — all zero-C#. Then BE-gated: M1 reply (verify-first) · M4 media (CI6) · M11 (S8) · C19 call broadcast/return-arg · Q6/Q8/Q11/Q16/Q17/Q18 · LAST: M9/Q3 wallet send.
