# THE OVERNIGHT WORK ORDER — v1 batches A–E (#532–#534, set 2026-08-23)

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.**
★ Entry prompt: `docs/next-session-prompt.md`. This doc is the whole brief.
★ Pre-reads: `docs/handoff-2026-08-24-wallet-pass.md` (the state you inherit) ·
DECISIONS **#532** (the reconciled v1 list) · **#533** (the three dials, answered) ·
**#534** (the splash dial) · `docs/opus-review-wallet-pass-522-530.md` (the last loop).

## 0. Preconditions — verify, and STOP if any number differs

The wallet pass (#522–#531) must be COMMITTED AND PUSHED before this session's
clone carries it. Verify on the fresh clone:

| Check | Expect |
|---|---|
| `node scripts/build-demo-bundle.mjs` | **277** exports |
| `node scripts/build-shells.mjs` | **18** shells |
| `node scripts/smoke-test.mjs` | **BASELINE OK 2823 / the 3 KNOWN** (#136 · M5 · B3) |
| `node scripts/cs-syntax-check.mjs` | **143** clean + 1 known gap |
| `node scripts/verify-locales.mjs` | ALL LOCALES CLEAN |
| Ixian-Core (SIBLING clone) | clean at `097341a` |
| `Spixi/Utils/SPayments.cs` | EXISTS in the clone (else the push is missing — STOP) |

## 1. The batches, in build order (each area verify-first, #294/#215)

### ★ Batch W — the wallet F5 follow-up round (RUNS FIRST — Damir's walk, 2026-08-23)

READ `docs/f5-findings-2026-08-23-wallet-pass.md` — it carries the evidence and the
verified root cause. Items: **W-a** chat.html links NO `wallet-send.css` (the whole
unstyled in-chat compose/review class; + verify `modal.css`) · **W-b** compose
polish after W-a · **W-c** the address sheet: internal scroll + viewport caps +
the PREMIUM on-brand pass (Account reuses it) · **W-d** request-in Pay → the NEW
review sheet BEFORE the native confirm; pending-request Details stops routing to
the legacy WalletContactRequestPage · **W-e** hero scan emits `ixian:sendScan`
(payment intent — an `addr:ixi` QR must compose, not add-contact) · **W-f** a
scanned KNOWN address auto-picks the contact (new `setSendRecipient` free fn) ·
**W-g** "Confirm payments" HIDDEN on Windows (no-op there — platform-gate the cap
push; amends #525) · **W-h** the NEW structural gate: every destructured+mounted
component family has its stylesheet linked in that shell · **W-i** Send reorders to
AMOUNT ON TOP (then search → address row → contacts; picked row replaces the list;
Review stays bottom) · **W-j** ONE contact-row grammar across Send/Receive/Contacts
(directory anatomy: avatar-48 + name + truncated address + online dot; Receive
keeps the select circle; shared builder or matched CSS) · **W-k** amount inputs get
`enterkeyhint` + Next/Go → blur (keyboard drops, list browsable). Damir's baked-in
defaults: picked-recipient behavior as today · multi-select stays on Receive ·
rosters stay people-only (#255).


### Batch A — info + groups + the remove-contact data bug (the big one)

- **A1 Bot-group members (Damir: "check the legacy").** VERIFY AT SOURCE what C#
  pushes for a bot channel roster (SingleChatPage loadMembers / addContact path,
  the blind flag, CI1/CI7 history) and what the LEGACY app showed for the Spixi
  bot group. A public group must list members: nickname when present, else the
  #211 truncated address — plus add-member as usual. If the bot protocol genuinely
  does not carry the roster → document with file:line, BE row, do NOT fake one.
- **A2 Leave group on the bot info.** The #248/#249 leave forward exists for
  groups; find why bots miss it and add it.
- **A3 Actions on top.** Contact info AND group info: the action rows (Delete chat
  history · Remove contact / Leave group) move to the TOP of the surface.
- **A4 1:1 shared groups.** A strip in 1:1 chat info listing groups both of you
  are in. Data: check what C# can answer cheaply (a read-only
  `ixian:sharedGroups:<addr>` → push; FriendList group membership scan). Non-money
  C# is fine — handover-gate row as built.
- **A5 Remove contact = a BOTTOM SHEET (Damir's shape).** The sheet shows the
  shared groups (A4's data) with an option to leave them cleanly, behind an
  additional confirm step. Damir asked for options explored — build the
  recommended shape, list the alternatives in the handoff for his F5.
- **A6 ★ THE DATA BUG: remove contact does not remove.** 1:1 AND groups: after
  delete-chat + the second remove-contact dialog, the contact is still in
  Contacts. Trace the whole chain (chats-row-menu → verb → C# handler →
  FriendList/persistence) and fix it C#-side. Destructive verb — confirm steps
  stay, handover-gate row.
- **A7 Delete-chat checkbox restyle.** The long-press delete modal reuses the
  GROUP-CREATION checkbox grammar (the contacts-shell pickerRow circle), not the
  off-brand native checkbox.
- **A8 Chat-info skeletons (Damir's override of #264-no-skeletons).** Skeletons on
  chat info + group info while the pushes land. Also measure WHY it is slow —
  a cheap data-side win is allowed if found.
- **A9 Timestamp-alpha rider.** Outgoing timestamp + status icons at 0.7 alpha;
  ONLY the READ tick stays 1.0. (message-bubble.css.)

### Batch B — requests lifecycle (#533 ①)

- **B1 Contact-request revoke prompt.** Deleting an outgoing PENDING contact
  request → PROMPT ("Revoke the contact request?") — NEVER auto-revoke. Revoke =
  the `ixian:undorequest` path. VERIFY at source what the recipient sees after
  undorequest (probably nothing changes for them — the copy must say so honestly).
- **B2 App-invite cancel (#533 ①, the locked shape).** Sender taps Cancel →
  confirm → the SENDER'S card flips to a persistent **"Canceled"** (the #214
  declined-tombstone pattern: per-peer localStorage set + a terminal
  createAppBubble state — verify 'canceled' exists in the component, add if not)
  AND the RECIPIENT'S invite is REMOVED via the existing delete path (msgDelete).
  Removed, not labeled — the both-ends label waits for RC1 (BE). The sender keeps
  the bubble unless they delete it.

### Batch C — account lifecycle (#532/#533 ②③ + #534)

- **C1 Delete account = FULL wipe → welcome.** Trace `onDeleteAccount` (the #288
  flag: no live-chat sweep). "All data" gets ENUMERATED, then wiped: friends,
  messages, wallet, Preferences, the `spixi.*` localStorage keys, avatar files,
  downloads — land on the LaunchPage welcome. FOLD IN **F-3** (the restore crash:
  fatal exception + empty lists, recovers on restart — the #395 notes point at the
  goHome() deferral; root-cause by reading, flag what needs a device repro).
- **C2 The delete-wallet option is REMOVED** (redundant next to C1 — #532). Row
  out of the danger zone; take the C# verb with it and note both in the gate doc.
- **C3 Account warm-boot (#533 ②).** AFTER the chats list first paints, C#
  pre-creates the parked SettingsPage (the #315 park infra) — instant open, zero
  boot cost. Keep the onLowMemory disposal. Measure nothing regresses on boot.
- **C4 Contacts = a first-class Account row + a correct back-stack (#533 ③).**
  FIND THE #294 MECHANISM FIRST (why Back from Contacts lands in Chats), then
  build the IA move on it: Account hub row → contacts directory → Back returns to
  Account. The old entry points keep working.
- **C5 Theme-aware splash (#534).** Android: `values-night-v31/styles.xml`
  (near-black `windowSplashScreenBackground`) + a night logo variant where the
  icon is drawn — resource files only, verify against the existing
  `values-v31/styles.xml:15` + `spixi_splash_anim.xml` setup. Windows: verify the
  themed `.app-boot` cover is all there is (expect no work). iOS: queued for the
  Mac session, note it.

### Batch D — calls (mechanism first, #294)

- **D1 Missed-call notification.** Reported: the remote hang-up removes the
  incoming-call notification and NO missed-call notification remains. Trace the
  notification lifecycle (VoIPManager hang-up path · SPushService · Node call
  notifications) — find where the incoming one is cancelled and where a missed
  one should post. Fix so a missed call leaves a persistent notification. Do not
  guess: the mechanism gets named in the handoff with file:line.

### Batch E — ONLY if the night still has room: the menu batch

`docs/handoff-2026-08-25-menu-requests.md` §2, all four calls already Damir's:
(a) anchored dropdown (message menu + chats row menu, mobile) · (b) deeper mobile
scrim · (c) desktop #268 stands, retune `[data-dt-ctx-source]` · (d) the Account
QR sheet = REUSE `openAddressSheet` (#527 built it). Rider: the dev-HUD 72 px rail
offset. ⚠ Re-verify z-order against the #519 `isolation: isolate` ground.

## 2. If time runs short — the priority cut

**Batch W FIRST, whole** (it is the surface Damir just walked) → A6 (the data bug)
→ A1/A2 (bot group) → B1/B2 → C1/C2 → A3/A7/A8/A9 (cheap) → C3/C4 → C5 → D1 → E.
A batch that starts, finishes — half-built surfaces do not land.

## 3. Standing rules (unchanged, the ones that earn their keep)

Verify-at-source before building (#294/#215) · DECISIONS rows at decision time ·
a handover-gate row for EVERY new verb/key/log line, as built · no Ixian-Core
changes (`097341a` frozen; core needs = BE row) · builder never reviews own work —
the #46 OPUS loop runs per batch (A alone, then B+C+D together is acceptable),
verdict to disk WITH THE BATCH IN THE FILENAME · mutate before believing — invent
mutations the work order does not list · a pass is not a proof, read the log ·
bundle BEFORE shells · the smoke number will move — record the new baseline in the
handoff you write.

## 4. Delivery

Cloud-only night (the #398 precedent): both repos clone anonymously; land the
result via SendUserFile + the bridge when Damir's desktop is online — tarball into
`_deliveries/` only, `tar --overwrite`, VERIFY THE EXTRACT LANDED. Everything
UNCOMMITTED; write the F5 checklist (update the Wallet Pass F5 artifact pattern —
a fresh artifact for this batch) + the morning handoff + the next-session prompt.
`git --no-optional-locks` · never `git add -A` · `git push` does not work from the
bridge. If the bridge is offline at dawn, hold the tarball and say so.
