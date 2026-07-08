# Fable BE work order — non-money cutover rows

**Read `docs/be-conventions.md` FIRST** (the bridge rulebook). Then this triage, then the
detailed ask for each row in `docs/be-cutover-brief.md`. Every row is a JS+C# co-change.

**The fence (non-negotiable):** rows marked 🔴 touch money/signing/credentials → **HUMAN BE
ONLY.** Do not attempt them. If a 🟢 row turns out to need a signing or wallet-password
change, stop and flag it — don't improvise.

## Triage

| Row(s) | Area | Classification | Note |
|---|---|---|---|
| CH1 | Chats: group-type flag on `addChat` | 🟢 Fable-safe | trailing arg + FE already reads it. **Best first task** (worked example below). |
| CH5 | Chats: @-mention flag | 🟢 Fable-safe | trailing arg / unread payload |
| CH8 | Chats: reaction excerpt kind | 🟢 Fable-safe | emit an excerpt kind when trigger was a reaction |
| CH2 | Chats: contact-request feed + accept/decline/handshake verbs | 🟢 Fable-safe | new push + dispatch branches; no money |
| CH3 | Chats: delete / mark-read persistence + history/media wipe | 🟢 Fable-safe | reuse existing `removehistory`/`remove` verbs; **no wallet** |
| CH4 | Chats: pin/mute/favorites persistence + mute-aware unread | 🟢 Fable-safe | flags + a persist verb |
| C4 | Chat: enrich `addCall` (missed/duration/direction) | 🟢 Fable-safe | append args; `VoIPManager` already knows outcome |
| C5 | Chat: reaction `own` flag | 🟢 Fable-safe | add a bool to the reactions aggregate |
| C7 | Chat: app-invite decline verb + carry install URL | 🟢 Fable-safe | new verb + message-format fix |
| C8 | Chat: arbitrary emoji reactions (not just `like`) | 🟢 Fable-safe | dispatch emoji + store per-emoji |
| S1 | Settings: own QR/address push | 🟢 Fable-safe | a push of the address string |
| S2 | Settings: backup status | 🟢 Fable-safe | push last-backup timestamp |
| S3 | Settings: current language | 🟢 Fable-safe | push current locale |
| S4 | Settings: app version | 🟢 Fable-safe | `addCustomString("version", …)` |
| S(notif/privacy/security-level reachability) | Settings §9 family | 🟢 Fable-safe | push current state + wire toggle verbs |
| S14 | Settings: save-without-pop verb | 🟢 Fable-safe | new `ixian:apply` that persists WITHOUT popping the page |
| A1 | Apps: in-tab uninstall verb | 🟢 Fable-safe | new verb + dispatch |
| A2 | Apps: Discover feed source | 🟢 Fable-safe | feed transport, no money |
| X1 | Avatar/app-icon data-URI push | 🟢 Fable-safe | encode file → data-URI in the existing push |
| N1–N3 | Cross-cutting (page-push flash, call banner, etc.) | 🟢 Fable-safe | base-class / nav polish |
| CI1–CI5 | Chat-info (roster/activity enum, non-money parts) | 🟢 Fable-safe | CI1 already FE-corrected; enum pushes |
| CO1–CO5 | Contacts (group-create host, dual-nick, checkAddress) | 🟢 Fable-safe | **but not** any wallet step |
| S: "Change wallet password" route · Security level policy | Settings (credential) | 🟡 Human review | touches the wallet password / security tier — not signing, but credential-adjacent. Prefer human, or human-reviewed. |
| L1–L4 (create/restore wallet steps) | Launch | 🟡 Human review | wallet **creation** + password entry — credential path |
| C6, C9 | Chat: tip token / tip-in-bots | 🔴 HUMAN ONLY | tips **move money** |
| C1, C2, C3, C10 | Chat: payment enums / fiat / inline Pay / fulfilled-request | 🔴 HUMAN ONLY | payments |
| W1–W8 | Wallet: tx detail, send verb, share, fee, epoch | 🔴 HUMAN ONLY | wallet/signing |

## Suggested order (easy + high-value first)

1. **CH1** (group flag) — the template; smallest possible co-change.
2. **S4** (version), **S1/S2/S3** (QR/backup-status/current-lang) — simple pushes.
3. **CH5, CH8, C5** — single flags/args.
4. **C4, C7, C8** — chat event enrichment.
5. **A1, A2, X1** — apps + avatars.
6. **CH2, CH3, CH4** — the chats-list persistence cluster (bigger; new verbs).
7. **S14 + the §9 settings family** — settings depth.
8. Leave 🟡 for human review; never touch 🔴.

## Worked example — CH1 (the pattern for all 🟢 rows)

**Ask (be-cutover CH1):** the Groups filter is dead because `addChat` carries no
contact-type. Add a group flag.

**C# (one trailing arg, both call sites):** `HomePage.xaml.cs` ~:1030 (`updateChat`) and
~:1091 (`loadChats`) both call `sendUiCommand(this, "addChat", …existing args…)`. Append
**one** arg at the END, sourced from the friend object:

```csharp
// CH1: trailing group flag (FriendType.Group). New arg goes LAST — never reorder.
Utils.sendUiCommand(this, "addChat", /* …existing args unchanged… */,
    (friend.type == FriendType.Group).ToString());
```

**JS (`src/shells/home.html`):** the `addChat` handler reads the new trailing arg and sets
`chat.type = asBool(isGroup) ? 'group' : '1to1'`. The Groups filter logic already keys on
`chat.type === 'group'` (built, waiting) — flip it on.

**Verify:** open two groups + some 1:1s → Groups chip shows only groups; existing rows
unchanged. Build `net10.0-windows`, run, click the chip.

That's the whole shape: **find the existing call site → append at the end → read it in the
handler → the FE feature was already built and gated → it lights up.** No new abstractions,
one row per change, tiny diff, cite the row id in a comment.
