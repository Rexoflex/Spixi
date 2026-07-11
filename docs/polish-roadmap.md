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
| M2 | Incoming-call overlay | Not built; `addCall` is lossy (no direction/state/call-back verb — C4) | **BE C4 first**, then FE overlay (c-callbar grammar exists) |
| M3 | In-call banner | c-callbar BUILT (#57) + legacy call banner noted (N2) | **BE C4/N2** state pushes, then wire |
| M4 | Chat info in right column + shared media/files | **✅ #247 pane** (1:1). Media/files = **CI6** (no push contract) | BE CI6 feed → FE section lands (designed, demo-fed) |
| M5 | "Request sent" chip on outgoing contact request | Outgoing request stays a plain chat row today (CH2 kept outgoing as localSender rows) | FE chats-list batch: style outgoing-request rows (excerpt/status chip); pairs CH2 |
| M6 | Desktop: sheets → modals / context menus | Decision noted; overlay/sheet components are mobile-grammar everywhere | FE cross-cutting batch: desktop presentation variant in overlay.js/sheet.js (`data-desktop`), per-surface pick |
| M7 | Add app → desktop subpane | `AppNewPage` full-window push today | C# batch: pin to detail column via #225/#247 machinery |
| M8 | Add contact → desktop subpane | `ContactNewPage` full-window push today | C# batch: same machinery (pairs M7 — one "form pages as panes" batch) |
| M9 | Wallet send/receive + desktop subpane | FE compose surfaces BUILT + gated (`composeSend`) | **GATE — wallet-send LAST (#232)**; receive/QR could precede (Damir call) |
| M10 | Tx details subpane + demo parity (legacy field set) | Native `WalletSentPage` renders in rightContent (partial data, #182 sheet has less) | FE+small-C#: redesigned tx-detail shell in the detail column, legacy field parity; W-rows apply |
| M11 | Downloads (both modes) | Legacy DownloadsPage only; redesigned feed BE-gated (S8) | **BE S8** feed → FE screen (designed) |
| M12 | Pattern OFF by default + off/subtle/standard/bold in Chat appearance | Chat-appearance takeover exists (#236 ③: pattern + text size) | FE small batch: default OFF + named levels; keep #76 ink ratio |
| M13 | Languages apply everywhere, nothing hardcoded | i18n runtime live (#175); inline fallbacks accumulate (groupInfo, settingsSaved, …) | FE pass: run extract-strings → build-locales → pseudo-locale smoke over ALL shells; fix leaks |
| M14 | Splash screen (light/dark, animated logo) | Not built; lock/launch boot-surface patterns exist (#229/#230) | Design + C# batch: native splash → themed boot surface w/ logo animation; flicker rules apply |
| M15 | Unread messages bar | FE divider BUILT (#71); no read-boundary signal from C# (A8 deferral) | **BE**: read-boundary (first-unread msg id) push → wire divider |
| M16 | "Connecting…" as topbar title-state, not banner | **✅ #252** — chat: presence-sub swap in place (aria-live-safe) · home: root-title swap + first banner surface (update-available now renders); routing via locale-proof `*SL{}` equality carriers (no §8 param needed) | Damir F5 |
| M17 | Create group: new design, modal/sheet for name/image/blind | Two-step creation BUILT (#153/#155: multi-select → setup avatar/name/blind) | FE redesign pass vs demo grammar; group avatar/rename verbs for EDIT = CI7 |

## Quirks

| # | Quirk | State / fix |
|---|---|---|
| Q1 | Restore: file-set state must be distinct ("Replace file") | FE launch-shell tweak (restore view state machine) — queue next launch batch |
| Q2 | Create-screen gradients too hot (soften like lock #206⑥) | FE tokens/launch CSS dial — same batch as Q1 |
| Q3 | Send/receive IXI demo-parity analysis | **GATE — wallet-send LAST (#232)**; analysis doc allowed earlier |
| Q4 | Incoming chat payment missing "+" / off-component | **✅ #252** — received direct payments '+' (title-carrier match, collision-guarded); requests/sent stay bare (matrix canon) |
| Q5 | New group appears in contacts DIRECTORY (should be chat-only) | FE contacts-shell filter (directory purpose 'directory' excludes groups) — Damir left an "unless you think otherwise": agree, exclude; group management lives in chat info (CI7) |
| Q6 | Call bubble shows "Call back" while call still active | **BE C4** (addCall carries no live state) — bubble fix rides the C4 batch |
| Q7 | Group info titled "Chat info" | **✅ FIXED #247** (component fallback bug) |
| Q8 | Edit group photo/name from chat info (admin) | **BE CI7** — no rename/re-avatar verbs exist |
| Q9 | Bot topbar tap re-opens channel list instead of closing | **✅ #252** — title tap toggles closed; #205 focus-restore intact |
| Q10 | Composer autofocus: off on mobile, on on desktop; tone down desktop active state | **✅ #252** — autofocus desktop-gated; ring 2px→1px desktop-scoped (dial: neutral hairline if still loud) |
| Q11 | Fulfilled payment request = 2 bubbles | **C10** (logged #207) — request↔payment linking, BE/UX decision |
| Q12 | Send file then delete → excerpt still "file" | FE home.html/chat delete sync (excerpt recompute on removeMessage) — chats-list polish batch |
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
3. **Chats-list/contacts FE batch:** Q12 · Q5 · M5.
4. **Chat appearance + dials FE batch:** M12 (pattern default/levels) · Q14 · Q1+Q2 (launch).
5. **Desktop overlay grammar:** M6 (sheets→modals/menus) — spec row first.
6. **Form-pages-as-panes C# batch:** M7 + M8 (+ M10 tx-detail pane spec).
7. **i18n sweep:** M13 (extract + pseudo-locale over all shells).
8. **M14 splash** (design first) · then BE-gated: M1 reply (verify-first) · M2/M3 calls (C4) · M4 media (CI6) · M11 (S8) · M15 (read boundary) · Q6/Q8/Q11/Q16/Q17/Q18 · LAST: M9/Q3 wallet send.
