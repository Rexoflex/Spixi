# Backup UX spec — unified backup + standing nudge

Status: interview-approved by Damir 2026-07-05 (DECISIONS #131) · builds with the
**Account shell** (#95 order — not started yet). This doc is the ready-to-build spec.

## 1. Today (grounded in `BackupPage.xaml.cs` + `settings_backup.html`)

Two buttons on one page:
- **BACKUP WALLET** → `ixian:backupWallet` → OS-shares the raw `wallet.ixi` file.
- **BACKUP WALLET AND CONTACTS** → `ixian:backupAccount` → builds an encrypted ZIP
  (`spixi.account.backup.ixi`, header `SPIXIACCB1`, encrypted with the wallet password)
  containing: `Acc/` data dir (contacts + related device data), `account.ixi`,
  `avatar.jpg`, **and `wallet.ixi`**.
- `ixian:error` → invalid-password alert (page validates the password before backing up).

**Key fact: the account backup is a strict superset of the wallet backup.** The current
two-button UX makes users choose between "partial" and "everything" with no guidance —
that's the confusion Damir flagged.

## 2. Decisions (Damir interview, 2026-07-05)

1. **One primary action** — "Back up Spixi" = the full encrypted account backup
   (identity + wallet + contacts + avatar, one file). **Wallet-only export demoted to an
   Advanced disclosure** ("Export wallet file only" — cold storage / other Ixian tools).
2. **Nudge = status-driven, quiet but standing** — not one-time, not periodic.
3. **Placement** — first-class row in the **Account shell** with live status, plus an
   **onboarding-tail prompt**; Wallet shell gets a small cross-link.

## 3. The surface (Account shell → Backup)

### 3.1 Backup row (Account shell home)
Standard settings row: shield-lock glyph · "Backup" · status sub-line + state badge:
- Never backed up → sub "Not backed up yet" + warning-tonal c-badge ("Action needed").
- Backed up, unchanged → sub "Backed up · 12 Mar".
- Backed up, data changed since → sub "3 new contacts since last backup" + info badge.
The badge doubles as the STANDING NUDGE — quiet, always truthful, never a popup.

### 3.2 Backup screen
1. **Hero block**: illustration #6 (shield bundling avatar+coin+contact motifs) + copy:
   "One file protects everything" / "Your identity, wallet, and contacts — encrypted with
   your password into a single backup file."
2. **Status line**: last backup date or "never" (same source as the row).
3. **Primary CTA**: `Back up Spixi` (fill 56, full) → password confirm (existing flow;
   `ixian:error` renders inline on the field, not an alert) → `ixian:backupAccount` →
   OS share sheet → on return, button `setSuccess` "Backed up" (#29 morph) + status
   refreshes.
4. **What's inside** disclosure: chips/rows listing Identity · Wallet · Contacts · Avatar
   (plain-language, mirrors the install-modal explain pattern).
5. **Restore note**: muted line — "Restore needs this file AND your password. Spixi can't
   recover either for you." (the honesty line; P2P = no server escrow.)
6. **Advanced disclosure**: `Export wallet file only` (outline 44) + one-line explanation
   ("The raw wallet.ixi — for cold storage or other Ixian tools. Does NOT include your
   contacts or account.") → `ixian:backupWallet`.

### 3.3 Onboarding tail
After account creation success: one screen — illustration #6, same copy, `Back up now`
(primary) / `Later` (text). "Later" is allowed and quiet — the standing row-state takes
over from there. Restore flow (existing `intro_restore`) is the counterpart and gets the
same visual language (illustration #5).

### 3.4 Wallet shell cross-link
Small row/link "Back up wallet" in wallet settings → routes to the SAME Backup screen
(no duplicate surface).

## 4. Nudge rules (state machine)

| State | Row badge | Extra |
|---|---|---|
| never + no data yet | warning badge | onboarding tail already offered |
| never + has contacts/funds | warning badge | one-time c-banner on Chats home per BE "significant data" signal (optional, flag-gated) |
| backed up, clean | none | — |
| backed up, dirty (new contacts / first funds since) | info badge + count sub-line | re-nudge is the badge ONLY — no popups |

Principles: never modal, never repeat-toast; the state is always visible in one place;
copy says what changed ("3 new contacts since last backup") so acting feels rational.

## 5. BE asks (add to ARCHITECTURE §9.5 at Account-shell build)

1. **Last-backup timestamp** — persisted + exposed to the WebView (today nothing records
   that a backup happened). Minimal: C# stores `DateTime` when `backupAccount` completes.
2. **Dirty signal** — contacts-added-since / wallet-activity-since last backup (counts or
   bool). Drives the "changed since" nudge. Mock-backed until then (capability-flagged,
   #115 convention: without the signal the row shows date-only states).
3. Password validation stays C#-side (existing `ixian:error` path) — FE renders it inline.
4. (Optional, later) `backupAccount` variant that skips the share sheet and confirms
   completion explicitly — needed for reliable "backed up" state vs "share sheet opened".

## 6. Component reuse map

Row = the standard settings-row component (Account shell) · badges = c-badge · password
confirm = c-modal w/ inline error · success = button setSuccess (#29) · disclosures =
the details/Advanced pattern (#123) · banner (optional state) = c-banner · illustration
slots per illustrations-plan #5/#6. **No new component types needed.**

## 7. Copy draft (lang-file keys at build)

- backup-title = Backup
- backup-hero-title = One file protects everything
- backup-hero-body = Your identity, wallet and contacts — encrypted with your password
  into a single backup file.
- backup-cta = Back up Spixi
- backup-done = Backed up
- backup-status-never = Not backed up yet
- backup-status-date = Backed up · {date}
- backup-status-dirty = {n} new contacts since last backup
- backup-restore-note = Restoring needs this file and your password. Spixi can't recover
  either for you.
- backup-advanced = Export wallet file only
- backup-advanced-note = The raw wallet file — for cold storage or other Ixian tools.
  Doesn't include contacts or your account.
- backup-later = Later
