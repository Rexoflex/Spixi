# Opus #46 loop — BRIEF for Batches B + C + D (2026-08-24 overnight)

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.**

You are an AUDITOR. You did not build this. Break it. Read the code, execute what you can
(`node scripts/smoke-test.mjs` ≈ 50 s, read-only; `node scripts/cs-syntax-check.mjs`;
throwaway jsdom scripts under /tmp), report with file:line evidence. Rank MAJOR / MINOR /
NIT. ⚠ Do NOT modify, revert, checkout or overwrite ANY file under /root/Spixi except the
one report you write; no build scripts (they write into the tree); scratch copies under
/tmp for mutations. Ixian-Core at /root/Ixian-Core is frozen (097341a), read-only.

## What was built — DECISIONS #543–#549 (read those rows first: tail of DECISIONS.md)

| Batch | Item | Where |
|---|---|---|
| B1 | contact-request REVOKE prompt (chats-list row) → `ixian:undorequest:<addr>` (HomePage, guarded) | `chats-row-menu.js` (`openRevokeRequestFlow`, the `chat.request` branch), `chats-shell.js` (`revokeRequest`), `home.html` (onPersist + `undoRequestResult`), `HomePage.onUndoRequestFor` |
| B2 | app-invite CANCEL: sender's card → persistent "Canceled"; recipient's invite removed via the delete path | `typed-bubbles.js` (`canceled` state), `typed-bubbles.css`, `chat.html` (`confirmCancelInvite`, `canceledApps`, `cancelInviteResult`), `SingleChatPage` (`case "cancelInvite"`) |
| C1/C2 | delete account = the FULL wipe → welcome; the delete-wallet route retired | `SettingsPage.wipeEverything` (+ the dispatch), `settings.html` (`wipeLocalState`), `settings-shell.js` (one danger card) |
| C3 | Account warm-boot after first paint on the #315 park infra | `SpixiContentPage` (`parkOnLoad`, `warmParkedOverlay`, the `presentPreload` park branch), `HomePage.warmAccountAfterFirstPaint` |
| C4 | Contacts row → directory → Back returns to Account | `contacts-page.js` (close reason), `home.html` (`openContacts` opts, the landtab branch, hardware back) |
| C5 | Android night splash | `Platforms/Android/Resources/values-night-v31/styles.xml`, `drawable/spixi_splash_icon_night.xml`, `layout-night/splash_screen.xml` |
| D1 | the missed-call row survives the message sweep | `Platforms/Android/SPushService.cs`, `Platforms/iOS/SPushService.cs`, `SingleChatPage.onResume` |
| pins | `scripts/smoke-test.mjs` — the "BATCH B", "BATCH C", "BATCH D" blocks near the end |
| gate rows | `docs/security-handover-gate.md` (Batch B/C/D sections) |

Pipeline: bundle 291 · shells 18 · smoke BASELINE OK 2991 / 3 KNOWN · cs-syntax 144+1 · locales CLEAN.
