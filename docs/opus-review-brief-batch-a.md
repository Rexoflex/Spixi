# Opus #46 loop — BRIEF for Batch A (info · groups · the remove-contact data bug, 2026-08-24 overnight)

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.**

You are an AUDITOR. You did not build this. Break it. Read the code, execute what you can
(`node scripts/smoke-test.mjs` ≈ 45 s, read-only; throwaway jsdom scripts under /tmp that
load `src/demo/chats.html` / `src/demo/chat.html`), report with file:line evidence. Rank
MAJOR / MINOR / NIT. ⚠ Do NOT modify, revert, checkout or overwrite ANY file under
/root/Spixi except the one report you write; no build scripts (they write into the tree);
scratch copies under /tmp for mutations.

## What was built (DECISIONS #539–#541; the work order: handoff-2026-08-24-overnight.md §1 Batch A)

| Item | Where |
|---|---|
| A6 the data bug: chats-list delete/deleteContact now DISPATCH; C# verbs + result pushes | `src/shells/home.html` (onPersist, setSharedGroups/removeContactResult/removeHistoryResult), `Spixi/Pages/Home/HomePage.xaml.cs` (3 verbs + 3 handlers), NEW `Spixi/Utils/SContacts.cs` |
| A4 shared groups: enumeration + the 1:1 info strip | `SContacts.sharedGroups`, `ContactDetails.xaml.cs` (`ixian:sharedGroups`, `ixian:openChat:`), `src/shells/contact_details.html`, `src/components/chat-info.js` (sharedGroups/onOpenGroup/loading) |
| A5 remove contact = a bottom sheet with the shared groups (leave-first) | `src/components/chats-row-menu.js` (`openRemoveContactSheet`, `setRemoveSheetGroups`, `setRemoveSheetResult`, `openDeleteFlow`), `src/styles/components/message-menu.css` |
| A7 delete-chat checkbox grammar | `chats-row-menu.js deleteCheckbox`, `message-menu.css` |
| A1 bot members listed (legacy parity) · A2 Leave on bots · A3 actions on top · A8 skeletons + the refresh debounce | `src/components/chat-info.js`, `src/styles/components/chat-info.css`, `src/shells/chat.html` (openChatInfo / scheduleChatInfoRefresh / rosterLoading) |
| A9 timestamp alpha | `src/styles/components/message-bubble.css` (tail) |
| pins | `scripts/smoke-test.mjs` — the "BATCH A" block near the end |
| gate rows | `docs/security-handover-gate.md` (Batch A section) |

Pipeline: bundle 290 · shells 18 · smoke BASELINE OK 2938 / 3 KNOWN · cs-syntax 144+1 · locales CLEAN.
Ixian-Core at /root/Ixian-Core is frozen (097341a) — read-only reference; a core need is a BE row.
