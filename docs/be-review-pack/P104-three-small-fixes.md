# P104 · THE HOME DECLINE CLEARS LIKE ITS TWIN; THE CONTACT-REQUEST PARSE LOGS THE EXCEPTION TYPE ONLY (batch fixb5, item 7)

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| LOW (deletes only C#'s own cache and orphan Sent copies through the existing helpers; one log line loses its payload) | none | none | the decline: `SmallFixFlags.DeclineClears` (`flagDeclineClears`, absent = ON; a stored 0 acts only in dev mode), OFF = the base (no sweep, no media delete) · the log line: no switch (a hole-closing fix, #1321) | 3 min |

**Look here first:** `Spixi/Pages/Home/HomePage.xaml.cs` `onDeclineRequest`, the `if (removed)` branch (:7285–7286) ·
`Spixi/Utils/SpixiContentPage.cs` `sendContactRequestGuarded`, the Address-parse catch (:7685).

**DECISIONS:** #1963 (5) (Damir: the three small fixes into this batch; the gate doc's "introduced" list corrected) · the drifts:
the size check of 2026-11-24 (§ C3 4a / 4b) · #1478 · #1321.

## What and why
1. **The Home decline (built).** `onDeclineRequest` removed the friend and cleared six stores, but — unlike its twin
   `SContacts.removeContact` (SC:177–178) and the comment of `ChatMediaStore.deleteChat` ("a request is declined") — it ran neither
   the Sent sweep nor the chat's media delete. Now, after `SPeerLocalStores.forget`, in the twin's order:
   `SContacts.scheduleSentSweep()` then `ChatMediaStore.deleteChat(friend.walletAddress)`. Left behind before: orphan Sent copies (until
   a later remove / leave / delete-history) and the chat's kept thumbnails and peaks (Android; until the orphan sweep).
2. **The log line (built).** `Logging.warn("sendContactRequest: invalid address payload: " + ex.Message)` → `+ ex.GetType().Name`.
   Ixian-Core formats the address into the `Address` constructor's message (F-16 class). The line is ours: at `0e85a4b8` the parse had
   no catch (`SingleChatPage.xaml.cs:260-270`); N26 (#366) added it. The gate doc called it fixed (corrected now, F-16); gate 18 still lists it in its legacy
   list `LEGACY_G3` (`scripts/smoke-test.mjs`, outside this batch's one registration block): a return of `ex.Message` there passes
   gate 18 and fails pin e3. Owed: remove that entry.
3. **OWED, not built** (outside this batch's file areas; a question for Damir): the undo `ixian:undorequest`
   (`Spixi/Pages/Chat/SingleChatPage.xaml.cs:1076`, after `SPeerLocalStores.forget`) and the two `pendingDeletion` re-adds
   (`Spixi/Pages/Contacts/ContactNewPage.xaml.cs:229`, `Spixi/Utils/SpixiContentPage.cs:7702`, each after `SPeerLocalStores.forget`)
   still lack the Sent sweep. Each needs one line after `SPeerLocalStores.forget`: `SContacts.scheduleSentSweep();` behind its own
   switch (the twin: `SContacts.removeContact`, forget → sweep). Effect today: orphan Sent copies stay until a later remove, leave or
   delete-history; usually none (the composer is hidden for a pending request).

## The diff (app C#: +2 code lines in HomePage, 1 changed line in SpixiContentPage; the switch block is shared with P103)
```csharp
SPeerLocalStores.forget(friend.walletAddress.ToString());
if (SmallFixFlags.DeclineClears) SContacts.scheduleSentSweep();
if (SmallFixFlags.DeclineClears) ChatMediaStore.deleteChat(friend.walletAddress);
SNotificationPrefs.forgetContact(friend.walletAddress.ToString());
// SpixiContentPage.sendContactRequestGuarded, the catch:
Logging.warn("sendContactRequest: invalid address payload: " + ex.GetType().Name);
```
R6: the two HomePage lines cannot sit elsewhere — the decline's removal list lives in this branch (moving the decline into
`SContacts` is a refactor outside this batch).

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| The sweep deletes a file a remaining chat still names, or a send in flight | the existing sweep: only direct children of `Sent/` with a sent-copy name, older than 600 s, named by no remaining history; nothing on a partial read | `pins-s9/a1-wiring` M22, csh `S9MediaTests` (unchanged) |
| The media delete touches another chat or a WebView path | `deleteChat` takes C#'s own friend address, moves only that chat's generation and folder, never throws, Android only | `pins-photo1a/b-store` b1 (re-based: the decline row), csh `ChatMediaStoreTests` |
| A refused decline deletes something | both calls sit inside `if (removed)` after `S16SecRules.declineAllowed` | pin `e-small-fixes` e1 (inside the success branch, the twin's order) |
| The switch OFF changes something else | the body minus the two lines = the base body | pin e5 (SHA-256 of the base `0eda93f5` body) |
| The log line carries the address | a .NET type name only | pin e3 (gate 18 still lists the site as legacy: owed) |

⚠ C# UNCOMPILED: `HomePage.xaml.cs`, `SpixiContentPage.cs` (the switch block compiles and runs in csh, `OpusManagedTests` flags_*).
Platforms: the sweep all; the media delete Android only (`ChatMediaStore.platformOn`); the log line all.
