# Build brief — PARITY BATCH B (post-#313; dials LOCKED 2026-08-07)

**Work order for a future build session.** Source of truth: `docs/legacy-parity-audit.md`
(#296) §(b) Tier-1 rows R3/R4/R7 — audit-verified with file:line in both trees; do NOT
re-derive the evidence. Line numbers are the #296-era anchors; re-anchor by symbol if
drifted. Written in the 2026-08-07 Cowork session (Damir + Claude), where Damir locked the
two open dials. **R6 is NOT here** — its dial locked the same day (full detail IN the
sheet) and it ships with the plate (handoff-2026-08-07 batch 1, item 8).

## ⚠ SEQUENCING — build AFTER the plate lands

The plate batches (handoff-2026-08-07) touch `chat.html`, `home.html`, `settings.html`
AND `HomePage`/`SettingsPage` C#. Batch B touches the same files. Do NOT build these
concurrently — start batch B only from a tree where the plate batch is committed (or
explicitly abandoned). If the plate's batch 2 (Account-as-peer, iOS-46) restructures
SettingsPage hosting, re-anchor B3's settings leg before building.

## Dials (LOCKED — Damir, 2026-08-07, this session)

- **R3 media cap → ALL PLATFORMS.** Not iOS-only legacy parity; no reason to keep the
  restriction — the pipeline is platform-neutral (native picker → file transfer).
- **R4 timestamp burn → ACK-GATED STAMP (small-C#) + one-time clear.** The
  `backupReminderTimestamp` write moves behind a real user acknowledgment so a reminder
  can never again be consumed unseen; plus a one-time clear of the already-burned stamp
  at the fix commit so everyone gets nudged promptly.
- (R6 locked separately: full tx detail in the mobile sheet — plate item 8, not batch B.)

## Rules

- **This batch is NOT zero-C#** — R4's ack-gated stamp and (likely) B3's settings share
  verb are deliberate small-C#, per the dials. Everything else stays zero-C# discipline:
  if an item beyond those two turns out to need C#, STOP, log it, skip it (#215).
- #215 verify-first applies to every "alive" claim below that has never run on a given
  platform (flagged per item). ★ #221 chat isolation untouched. No money-path changes.
- Components change → FULL pipeline, bundle BEFORE shells: `extract-strings` →
  `build-locales` → `build-strings-iife` → `build-demo-bundle` → `build-shells` →
  `i18n-lint` + `pseudo-locale-smoke` + `smoke-test`. New keys get inline en fallbacks.
- Smoke assertions per item · #46 loop after the batch (it MUST cover the C# legs) ·
  Damir F5 + commit as ONE batch (GitHub Desktop, #306). Smoke baseline at writing:
  953 pass / 4 pre-existing failures (#136 · #149③ · M5 · B3-shell).

## Items

### B1 — R3: gallery photo/GIF send, all platforms
The whole pipeline is alive both sides: shell routes photo/gif → `ixian:sendmedia`
(`chat.html:1681`), C# dispatches (`SingleChatPage.xaml.cs:167`, native picker → file
transfer — does NOT depend on the #81 BE image standard). Blocked by the single
never-true gate `cap('media')` (`chat.html:1675`); no code path anywhere sets a `media`
cap. Build: flip at the cheapest sound site — either default the `media` cap true
shell-side or drop the gate (prefer whichever keeps the cap grammar consistent; the cap
exists only as this gate). **#215 flag:** legacy ran this iOS-only, so the Windows/
Android/Mac picker path has NEVER run — verify the C# `sendmedia` handler is genuinely
platform-neutral (read the handler, then F5 one non-iOS platform) before calling it
done. If a non-iOS leg proves broken in C#, ship the working platforms and log the
broken leg as a be-cutover row — do not grow this into a C# picker rewrite.

### B2 — R4: backup nudge render + ack-gated stamp (small-C#)
FE leg (zero-C#): `HomePage.xaml.cs:2077-2085` pushes `toggleAnimatedSlider` to a stub
(`home.html:2026`); `backup-nudge.js` exists and is mounted by no shell. Mount it in the
home shell, wire the push → nudge → `ixian:backup` routes to the backup surface. Respect
the Q17 posture (restored accounts: nudge logic may be amended later — don't hard-wire
assumptions that fight it). C# leg (the dial): `:2083` currently sets
`backupReminderTimestamp` unconditionally on push — every interval burned against the
stub. Move the write behind a user ack: new verb (suggest `ixian:backupNudgeAck`)
emitted when the user acts on or dismisses the nudge; C# stamps ONLY on that verb. Plus
a ONE-TIME clear of the existing burned stamp at this fix (guard it so it runs once —
version-keyed pref or equivalent), so the first post-fix session nudges promptly.
Note: this is the batch's main C# surface — the #46 loop must adversarially cover
verb-spoofing (can a page other than home emit the ack?) and the once-only clear.

### B3 — R7: native share verb (home zero-C#, settings small-C#)
Legacy shared the address via `ixian:share` → `Share.RequestAsync`
(`HomePage.xaml.cs:318`); the handler is alive+orphaned in current (`:635`). Current
degradation: `navigator.share` is absent in WebView2/Android WebView, and the wallet-tab
Share is a SILENT no-op on WebView2 (fallback has no toast, `home.html:1350-1353`).
Build: home shell emits the live verb (zero-C#); settings surface needs a small-C# share
verb on SettingsPage — or port the hardened settings `shareAddress` (with toast) to home
as the floor if the verb route stalls. **Contract guard:** wallet → Receive → Share is
now governed by the F3/#301+#303 contract (bare address ALWAYS, no `:send:<amount>`,
Share hides while an amount is entered, QR constant `address:ixi`) — B3 must not
reintroduce any amount-bearing share path. **Gate:** the owed A10-on-WINDOWS re-test
(parity-a-f5-checklist §A10) decides the WebView2 leg — if the native verb path fails
there, the toast-fallback floor is the Windows answer, not silence.

## NOT in this batch (so nobody looks for them)

R6 mobile tx detail (plate item 8) · R5 dev cluster beyond the plate's 10-tap minimum
(own batch, rides the v1.0 item-4 work) · R11 ContactDetails description arg (small-C#,
later) · R12 scan zoom (speed dials frozen until measured — #307 note) · anything
BE-gated (be-cutover rows).

## F5 checklist seeds (write the real one at build time)

- B1: send a gallery photo AND a GIF from each available platform; receive side renders
  (existing media bubble); no regression to file-send.
- B2: fresh install (or cleared stamp) → nudge appears on schedule; acting/dismissing
  stamps; kill + relaunch → no re-nudge inside the interval; stub-burn is gone (nudge
  actually visible the first time the push fires).
- B3: share from home wallet tab on iOS + Windows (sheet opens, bare address); settings
  share leg per its chosen route; cancel the sheet → nothing happens (F3 rule).
