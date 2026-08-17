# N57 triage — group message visibility vs connectivity (2026-08-17)

**LANGUAGE RULE: ASD-STE100.** Short sentences. Active voice.

Damir, #374 F5: *"if I am not connected to a user in group I don't see his
messages; legacy worked without this, owner needed to be connected only."*
This is TRIAGE ONLY (handoff-2026-08-17f §2 row 9). No build. ★ RE-OBSERVED 2026-08-17 post-#375-F5 in normal use — the repro is not rare; run §2 and capture the log. This doc gives
the code pre-read, the repro protocol, and the verdict rules. It is the
MESSAGE twin of N33 (be-cutover Table B q11 — group FILE relay).

---

## 1. Code pre-read — verified at source, file:line

**The FE cannot be the hiding layer.** The chat shell renders every `addThem`
push. No FE code drops a row by sender (D-19b masks DISPLAY only). The C# push
path stores, then pushes, with no sender gate: `Node.addMessageWithType` →
`insertMessage`; `resolveNick` is null-safe (`SingleChatPage.xaml.cs:1612`,
`?.getNick()`).

**The transport (Ixian-Core `097341a`, `CoreStreamProcessor.cs`) is the
suspect, three ways:**

| # | Mechanism | Evidence | Class |
|---|---|---|---|
| 1 | **Roster-asymmetry DROP at receive.** Every incoming group message is validated: the WIRE sender must be in the receiver's LOCAL group roster. `GroupChat.ValidateAndGetGroup` (`GroupChat.cs`): `!group.users.hasUser(senderAddress)` → null → the caller drops the message with NO storage and NO receipt (`CoreStreamProcessor.cs:818-831`). If C's roster does not hold B (stale roster, member added while C was offline), every DIRECT message from B dies at C, silently, forever. | `GroupChat.ValidateAndGetGroup` · `CoreStreamProcessor.cs:831` | arrive-then-DROP (Core) |
| 2 | **Direct fan-out replaced owner relay.** `sendGroupSpixiMessage` (`CoreStreamProcessor.cs:323-413`): the sender fans out DIRECTLY to every member it holds in its OWN FriendList. The owner relays ONLY when the sender is MISSING a member (`missingContact` → send to owner with `groupSenderAddress=self` → the owner re-fans, `:395-407` + `:836-874`). So B→C delivery normally needs B to REACH C (connection or C's `relayNode`, `:141-157`); failures queue in pending and retry. Legacy routed via the owner — "owner connected suffices" matches that. | `CoreStreamProcessor.cs:323-413` | never-arrives / late (protocol) |
| 3 | **Owner-offline relay gap.** On the `missingContact` path the message goes ONLY to the owner. Owner offline → it queues until the owner returns; C sees nothing meanwhile. | `CoreStreamProcessor.cs:395-407` | delayed |

Blind groups always route via the owner (`:342-353`) — mechanism 2 applies to
NON-blind private groups. A non-owner receiver also REJECTS a
`groupSenderAddress` from a non-owner wire sender (`:879-891`, "ignoring group
sender address" → drop) — a fourth, narrower drop.

**Send-side tell:** for `chat`, the receiver sends NO received-confirmation
until the message is processed (`:926-930`). A validation drop therefore
leaves B's bubble stuck on the CLOCK tick. B's tick state is evidence.

---

## 2. The repro protocol (Damir — 3 accounts, ~20 min)

Setup: **O** = group owner · **B**, **C** = members. B and C are NOT mutual
contacts. Non-blind private group, created by O, all three in it. Enable dev
mode on C (10-tap) so the log is one tap away (#321 share/save).

| Leg | Steps | Watch on C | Watch on B |
|---|---|---|---|
| **L1 baseline** | All three online. B sends "L1-test". | Does the message appear LIVE? Then close + re-open the chat: does it appear from STORAGE? | Tick: clock → sent → delivered? |
| **L2 the claim** | O goes fully OFFLINE (kill the app). B and C stay online. B sends "L2-test". | Live? Re-open? | Tick stuck on clock? |
| **L3 late join** | O online. C offline. B sends "L3-test". C comes online after ~2 min. | Does "L3-test" arrive on C after it returns? How late? | — |
| **L4 roster check** | On C: open the group info pane. Is B in the member list AT ALL? | — | — |

After each failed leg, capture C's log (dev → share) and search for these
FINGERPRINT lines:

| Log line on C | Verdict |
|---|---|
| `Received message for group … that is invalid or that the sender … is not part of` | Message ARRIVED and Core DROPPED it — **mechanism 1** (roster asymmetry) |
| `Validating group … but sender … is not a group.` | Same drop, inner check (`GroupChat.cs` warn) |
| `… ignoring group sender address` | The narrower `:889` drop — non-owner relay attempt |
| `Received message but contact … isn't in our contact list.` | Dropped at FriendList — the group itself is not resolving |
| **No line at all** | The message NEVER ARRIVED — **mechanism 2/3** (fan-out/relay/presence) |
| Message absent live but PRESENT after re-open | UI push gap — **OURS** (C#-here; report, we fix) |

---

## 3. Verdict rules

- Fingerprint line on C + B stuck on clock → **Core, mechanism 1**. The ask:
  do not hard-drop a group message from an unknown sender — store it and
  request the roster entry (`requestBotUser` class), or accept owner-relayed
  copies. Goes on be-cutover Table B beside q11.
- No log line, L2 fails, L1 passes → **protocol, mechanism 2/3**: message
  relay needs the q11 treatment (owner/bot relay for non-mutually-connected
  members). One combined q11 row: files AND messages.
- Live-missing but storage-present → ours; bring the log and we build.

Whatever the leg results: paste the fingerprint lines + tick states into the
session. The be-cutover `[N57?]` row gets the verdict and moves to its final
home. Nothing FE ships for this item (#374 §6 rule: no FE conjuring of group
delivery).
