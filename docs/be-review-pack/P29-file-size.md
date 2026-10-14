# P29 · FILE SIZE · The file size on the file card in both directions (S20 E)

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW (a number C# already holds or reads itself; no path crosses the bridge) | no | yes — `addFile` arg 20 now also for sent and finished files (no new argument); 1 dev verb, 1 dev push | built behind flag `SpixiFlags.S20FileSize` (default ON) · ⚠ UNCOMPILED for MAUI until the S20 build | 3 min |

**Look here first:** `Spixi/Pages/Chat/SingleChatPage.xaml.cs:5580` `fileSizeArgOf` (the sources) and `Spixi/Utils/S11MediaRules.cs:222` `fileSizeArg` (the pure rule, csh `S11MediaTests.file_size_arg_both_directions_each_source_its_own`).

**DECISIONS:** #1312 · #1376 (S20 round 1: the size in both directions, frontend + a small C# change behind a flag)

## What changed and why
- Before: `addFile` arg 20 carried the size only for a RECEIVED file not on this device yet (`S11MediaRules.offerSizeArg`, S11 G #1263 a). A sent file and a finished file showed no size.
- Now (flag ON): arg 20 = the size for every file row, from C#'s own sources only:
  - received (offer or finished) = the header size Core stored (`fBytes`, the same value the offer used);
  - sent, in flight = the outgoing transfer's `fileSize` (`TransferManager.getOutgoingTransfer`, asked only for a non-empty id and kept only on an EXACT uid match — the lookup itself is a `Contains` match);
  - sent, NOT finished, and no live transfer (★ #46 S20 r1, auditor B MINOR: after an app restart the outgoing transfer is gone from memory) = one `new FileInfo(path).Length` on `SharedItems.localPathOf(message)` (the same C#-resolved path, try/catch; the live transfer wins whenever it answers);
  - sent, finished = ONE `new FileInfo(path).Length` on `SharedItems.localPathOf(message)` — the path C# resolved itself (the one `localArgOf` checks), asked only when `localArgOf` already said "1" (on this device). Any throw → "".
- `friend_message.fileSize` is NOT written (the voice-message limits read it).
- Flag OFF = `offerSizeArg` exactly (received offers only).

## Files
- `Spixi/Utils/S11MediaRules.cs:222` `fileSizeArg` · `:241` `fileSizeFlagLine`.
- `Spixi/Pages/Chat/SingleChatPage.xaml.cs:5580` `fileSizeArgOf` · `:6304` the arg 20 choice.
- `Spixi/Utils/SpixiFlags.cs:18` key `flagS20FileSize` · `:38` the flag · `:66` the read (a stored 0 acts only in dev mode, `S16PassRules.effectiveFlag`).
- `Spixi/Pages/Dev/DevPage.xaml.cs:84` `ixian:devflash:s20size:<0|1>` · `:311` push `setFlagsDevS20`.

## Bridge surface
| Verb / push | Args (shape) | Who can send it | Handler | Ours / reshaped |
|---|---|---|---|---|
| push `addFile` arg 20 | invariant digits or "" | C# → chat.html | `insertMessage` | reshaped (S11 arg, now both directions) |
| `ixian:devflash:s20size:` | `<0\|1>` | dev.html → DevPage, dev mode on | DevPage | ours (dev) |
| push `window.setFlagsDevS20` | `"0"` \| `"1"` (the stored switch) | DevPage → dev.html | a guarded reference (an older dev.html ignores it) | ours (dev) |
| log `[FLAGS] s20filesize=<0\|1>` | fixed words | C#, once per start | `SpixiFlags.init` | ours |

## Threat → rule → proof
| A hostile page script could try… | What stops it | Proof |
|---|---|---|
| make C# read a file of its choice | no path comes from the page: the path is `SharedItems.localPathOf(message)` of a stored file message | pin `pins-s20/s-filesize.mjs` (body, whole) |
| learn the size of another chat's file | the value rides the same per-chat `addFile` row that already carries the file's name | — |
| (peer) lie about the size | a received size is the header the peer sent — shown as before for offers, now also after the download | — |
| (worst case) | a wrong number on a card | — |

## Cost
On a chat load (`loadMessages`, the UI thread): + 1 `File.Exists` (inside `localPathOf`) + 1 stat (`FileInfo.Length`) per COMPLETE SENT file row that is on this device, and per UNFINISHED SENT row with no live transfer (rare: the rows left unfinished by a restart); nothing for any other row. The live insert of a sent file reads the in-memory transfer only.

## Given up / left open
- ~~A sent file whose transfer was not finished when the app restarted shows no size.~~ ★ #46 S20 r1: closed — the local copy's length is used when no live transfer answers.
- The Developer card row (dev.html `setFlagsDevS20`, "File size on sent files (S20)") is in the merged shell; an older dev.html ignores the push (`executeUiCommand`: not a function) and shows its 4-digit card unchanged (checked in jsdom, #46 S20 r1).

## Question for BE
None blocking.
