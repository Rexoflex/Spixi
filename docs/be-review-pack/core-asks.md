# CORE-ASKS · Everything that needs a change or an answer in Ixian-Core

Ixian-Core is BE-only and frozen at `097341a` (`xcore-0.9.8k`); nothing here is built by us (#1312 A). Anything that needs Core is v1.1 by the scope rule (#1137), unless a row says otherwise. Core paths are relative to the Ixian-Core repo root, Spixi paths to this repo; all verified at `097341a` / `387ca78b`.

| id | Ask | Why (one line) | DECISIONS | Blocking v1? |
|---|---|---|---|---|
| SYNC-1 | Raise `CoreConfig.bakedBlockHeight` (`Meta/CoreConfig.cs:41`, 5 967 000; Spixi reads it at `Spixi/Meta/Node.cs:341`) every release | a restore syncs ~335 000 headers ≈ 4 h; chat opens are slow the whole time | #1304 | no (a wallet "verifying" strip is the app-side answer) |
| SYNC-2 | A fast sync from a recent checkpoint, or a lower priority / pause hook between TIV batches (and while a chat opens); a TIV batch-size knob | the same 4 h catch-up; opens during a batch present at 736–941 ms | #1304 · proposed #1319 | no |
| SYNC-3 | Does a send work while TIV is paused? Tx build reads TIV (`Spixi/Meta/Node.cs:888`, `:898`, `:1032`, `:1549`, `:1566`) | a paused or manual sync is unsafe until BE answers | #1304 | no — but gates any pause build |
| SYNC-4 | Cut Core's managed allocation during the header sync | the GC bridge: 5–20 explicit ART GCs/s during sync (research); the Spixi half is perf lever #9 (P17 area: fewer UI pushes during sync, planned) | proposed #1319 | no |
| DEV-2 | Does the stream node support ONE address on TWO devices; should a restore detect a second live device? | unread counts rose with nothing new while an old phone ran the same account | #1298 | no (recheck in the office walk) |
| DEV-3 | Can a client see its OWN address's other-device presence (a keepalive subscription for its own address, or a `getPresence2` answer that lists every device)? And should Core KEEP those entries instead of resetting our entry to this device when our own keepalive comes from another device id (`Presence/PresenceList.cs:766`–`:771`, also `:687`–`:692`)? | the v1 "stage 0" warning (one account per device, #1381) needs it; today the client subscribes only to friends (`Network/CoreNetworkProtocol.cs:1312`–`:1323`) | #1381 · #1383 | no (the warning is dropped from DT-1) |
| R3-N4 | A Core "failed" state / signal for a SENT file (and for an unfinished sent file whose source is gone) | the tile keeps its last tick; the re-arm logs 1 436 errors in 3.5 h on Windows | #1137 · #1165 · #1311 | no — v1.1 |
| CORE-13 | `if (sender_friend != null)` before `handleMsgReceived` (`Streaming/CoreStreamProcessor.cs:823`) | a receipt after leave-then-remove throws an NRE (caught at `:1593`) | #938 | no |
| #962 | `if (friend == null) { warn; return null; }` at the top of `acceptAdd` (`Streaming/CoreStreamProcessor.cs:1211`) and `acceptAdd2` (`:1243`); patch `docs/core-patches/962-accept-null-guard.patch` | a late accept after a cancel throws on every reconnect (Debug break; Release catches it) | #962 · #947 | no |
| CORE-14 | One lock around `TryCheckDuplicateMessage` (`Network/NetworkRemoteEndpoint.cs:789`), `TryAddRequestedMessageId` (`:810`) and the `parseLoop` check/remove (`:672`, `:681`); remove from the queue too; a multi-thread test | OBSERVED: parallel presence fetches corrupt the dedup `HashSet`; later sends on that relay can throw | (audit C-06, 2026-09-27) #1137 | ⚠ § Blockers: YES · #1137: v1.1 |
| CORE-15 | Two-node test, then `return null` after a failed decrypt for every non-Temporary contact (`Streaming/CoreStreamProcessor.cs:729`–`:755`) | a forged `spixi2` plaintext could show under a contact's name | (audit S-01, 2026-09-27) #1137 | ⚠ § Blockers: YES (pending test) · #1137: v1.1 |
| CORE-16 | Accept `StreamMessageCode.error` only from the contact's relay, and null-check `friend` (`Streaming/CoreStreamProcessor.cs:717`) | an unauthenticated error marks any contact offline | (audit S-05) #1054 · #1137 | no — v1.1 |
| REPLY | Asks 2 + 3 of `docs/be-cutover-ixian-core-reply-carrier.md`: `sendChatStreamMessage` (`Streaming/CoreStreamProcessor.cs:2211`) sends a NULL envelope id; `ChatStreamMessage` checks size in UTF-16 units on send, UTF-8 bytes on receive. Ask 1 (`ReplyToId`) is SUPERSEDED: reply ships as a quote line in the body (#1198) | our edit (#1199) now sends `chatStream` with a null id (`Spixi/Pages/Chat/SingleChatPage.xaml.cs:2323`), so both defects are reachable | #441 · #448 · #1198 · #1199 | no |
| PRESENCE | An explicit "going offline" announce on clean close / background (or a shorter keepalive) | "online" stays up to the 300 s expiry; the app now shows online only ≤ 150 s (display only) | #300 · #301 · #1103 | no — v1.1 |
| O-06 | A hook when Core removes a friend itself (bot `leaveConfirmed`, owner `handleLeave`, payment friends) | the app cannot forget that contact's notification prefs on those paths | O-06 (#1303) | no |
| BOT-1e | §1e of the security review: (1) roster hook commented out (`Streaming/CoreStreamProcessor.cs:969`); (2) 500-member cap (`Streaming/Bot/Users/BotUsers.cs:202`); (3) post-leave streaming; (4) no poison-message drop; (5) push has no message kind (`Streaming/OfflinePushMessages.cs:45`); (6) `StreamClientManager.getClient` calls itself (`Network/StreamClientManager.cs:118`) → StackOverflow on a confirmed bot leave | (6) kills the app; the app avoids the path since #567 | #552 · #554 · #566 · #567 | (6) mitigated app-side; Core line owed |
| LOG-1 | `FriendList.removeFriend` logs the full wallet address when it refuses (`Streaming/Friends/FriendList.cs:433`) | the address lands in the log the user shares in one tap | #930 | no |
| VOICE | VN-1 (a voice type) is SUPERSEDED — voice ships as an inline `chat` message or a file, no Core change (#1138, #1207). Still open: the push server / offline queue size limit (~54 000 base64 chars for 30 s); `handleAppProtocols` saves a peer list with byte-sized counts (> 255 ids corrupts the saved contact) | an inline voice note may be dropped offline; a hostile peer can corrupt a saved contact | #1138 · #1207 | no |
| IOS-INT | Why `UseInterpreter=true` on every iOS build (`Spixi/Spixi.csproj:145`, upstream 6e63a31f)? Can `MtouchInterpreter=-all` work with Core? | likely the biggest iPhone speed lever; we may answer from data first (an interpreter on/off timing A/B on the device walk) | #1127 · #1312 | no |
| FILED | The other Core rows in `docs/be-cutover-brief.md`: CORE-1 kick/ban empty cases (`Streaming/CoreStreamProcessor.cs:2726`, `:2730`), CORE-4, CORE-8, Q1-ESC, N57?, the reaction-membership question (all on § Blockers); CORE-2/3/5/6/7/7b/9/10/11/12/17 (not) | already written up with file:line there | #1137 | § Blockers: YES for the first six |

## Patches that exist only on Damir's PC
These patches exist as proposals on Damir's PC, not in Core; BE decides. The cloud copy of Ixian-Core at `097341a` is clean (no local changes).

| Row | Local change (captured 2026-10-11 00:28) | Against the ask |
|---|---|---|
| CORE-13 | guard before `handleMsgReceived` when `sender_friend == null` | matches the ask |
| #962 | `friend == null` → warn + `return null` in `acceptAdd` and `acceptAdd2` | matches `docs/core-patches/962-accept-null-guard.patch` |
| CORE-14 | new `idsLock` around `recentIds` / `requestedIds`; `parseLoop` check + remove under it | ⚠ the capture names `addRecentId` / `addRequestedId`; at `097341a` they are `TryCheckDuplicateMessage` (the observed crash site) and `TryAddRequestedMessageId` — confirm both are inside the lock. The queue removal and the multi-thread test are not in the capture |
| CORE-16 | `if (friend == null) return null;` in the error branch | null half only; "accept only from the serving relay" is NOT done |
| CORE-14 (small) | `fetchAllFriendsPresencesInSector` (`Streaming/CoreStreamProcessor.cs:2967`) iterates a locked snapshot of `FriendList.friends` | `fetchAllFriendsPresences` (`:2946`) still iterates unlocked |
| CORE-15 | none | needs BE's two-node test first |

## ⚠ Contradictions
- CORE-14 / CORE-15: `be-cutover-brief.md` § Blockers says "YES" (17 blockers); #1137 puts S-01 / S-05 / C-06 in "v1.1 (needs Core)". Damir or BE must pick one.
- `be-cutover-brief.md` CORE-14 cites `fetchAllFriendsPresences` at `:2999` / `:3005` / `:2986`; at `097341a` it is `:2946`, the `InSector` twin `:2967`.
- Voice: `be-cutover-brief.md` still frames VN-1 / VN-2 as "two questions for v1.1"; #1138 (11) made voice v1 without Core.
