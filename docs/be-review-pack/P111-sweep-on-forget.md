# P111 · THE SENT SWEEP AFTER THE FORGET AT THE CHAT-PAGE DECLINE AND THE TWO RE-ADDS (batch quotebox2, item 3)

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| LOW (deletes only C#'s own orphan Sent copies through the existing helper) | none | none | `QuoteBox2Flags.SweepOnForget` (`flagSweepOnForget`, absent = ON; a stored 0 acts only in dev mode), OFF = the base | 2 min |

**Look here first:** `Spixi/Pages/Chat/SingleChatPage.xaml.cs:1077` (the `ixian:undorequest` success branch: the Decline of an INCOMING request in the chat page) ·
`Spixi/Pages/Contacts/ContactNewPage.xaml.cs:230` (the `pendingDeletion` re-add) · `Spixi/Utils/SpixiContentPage.cs:7703`
(the `pendingDeletion` heal in `sendContactRequestGuarded`) · the block `QuoteBox2Flags` at the end of `Spixi/Utils/SpixiFlags.cs`.

**DECISIONS:** #1966 (3) (Damir 2026-11-26: the three sites, one switch) · #1996 / P104 § 3 (the sites owed by `fixb5`) · #2027 · #1478.

## What and why
The twin `SContacts.removeContact` runs `SContacts.scheduleSentSweep()` after `SPeerLocalStores.forget`, so the Sent copies
(`Sent/`, the photos I sent) that no remaining history names are deleted. Three other paths that remove a contact's history
did not: the Decline of a peer's incoming request in the chat page (`ixian:undorequest` — despite its name; its only emitter is
the incoming request pane of `chat.html`, #562 moved the outgoing Cancel to hide-request; `SingleChatPage.xaml.cs:1036-1041`), and the two heals that remove a `pendingDeletion` contact before it is added
again. Each now has the same one line after its forget. Effect before: orphan Sent copies stayed on disk until a later remove,
leave or delete-history (usually none: the composer is hidden for a pending request).

A peer's request plus my Decline reaches the first site; no peer or WebView value reaches the delete (`scheduleSentSweep()`
takes no argument).

## The diff (app C#: +3 code lines at the sites; the switch block +14)
```csharp
SPeerLocalStores.forget(…);
if (QuoteBox2Flags.SweepOnForget) SContacts.scheduleSentSweep();
```
`[FLAGS] quotebox2 sweeponforget=<0|1>` is logged once per process at the first read (fixed words, 0/1).
R6: each line belongs to the removal list of its branch (the twin's order); no shared helper exists for the three branches.

## What a reviewer checks
- The sweep reads every history again (`SContacts.sweepSentOnce`) and deletes only files under C#'s own `Sent/` folder older
  than `SentSweepMinAgeSeconds` that no history names; no WebView value reaches it.
- OFF = the base statements (pin `pins-quotebox2/a-sweep` a3: the three bodies with the line cut = their base bodies).

## Tests
Pin `pins-quotebox2/a-sweep` (a1 the sites, a2 the switch, a3 the old path, a4 gate 18) · CSH `QuoteBox2Tests` (the switch).
⚠ C# UNCOMPILED until CI's Windows job.
