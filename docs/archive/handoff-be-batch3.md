# ARCHIVED — Handoff BE-cutover batch 3 (consumed 2026-07-09)

Superseded by `docs/handoff-be-batch4-next.md`. Full detail per row in `DECISIONS.md` #214–#219
and `docs/be-cutover-brief.md`. Kept as a pointer.

**Batch 3 (one Opus chat) landed + committed, all #46-CLEAN:**
- **C7** (#214, +217b/#217c) — app-invite decline = FE-local persistent "Declined" (no C# verb) ·
  `MiniApp` remembers its source install URL · remote app-icon carried in the invite, gated behind
  the media-autoload pref · in-session (Minimized) card · chat topbar-avatar push · boot-flash guard.
- **A1** (#216) — apps-tab uninstall verb `ixian:uninstall:<id>`.
- **A2** (#216) — keep the website-link Explore banner, drop only the IN-APP Discover feed.
- **X1** (#217) — avatar/app-icon → `data:` URI push (`Utils.imageToDataUri`) so iOS/WKWebView
  renders them; C#-only, FE already consumed data-URIs.
- **CH2a** (#218) — chats filter-chip count NUMBERS (Unread/Groups) + hide-Requests-when-empty.
- **CH2b** (#219) — contact-request FEED (`addRequest`/`clearRequests` in `loadChats`+`updateChat`)
  + `ixian:acceptRequest`/`declineRequest` verbs + FE accept/decline + request-card address
  truncation + ≥3s handshake hold + the auto-accept/button-less-row fix. (Damir F5 + commit last.)

**Deferred / flagged out of batch 3:**
- **C8** arbitrary emoji reactions → 🟡 Ixian-Core (core persists only `like` for user reactions),
  DECISIONS #215. Reverted.
- **Contact-request UX v2** → design pivot captured in `docs/contact-request-v2-spec.md` (enter-chat
  + security-notice accept/decline + progressive handshake notice). First item next session.
