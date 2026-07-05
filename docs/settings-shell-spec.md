# Settings shell spec — Account hub + Backup (Phase 1, slice 1)

Status: interview-locked by Damir 2026-07-05 (question round; DECISIONS #146),
**amended same day by the #147 PREMIUM ROUND (second question round)** — where
§3/§4 conflict with §10, §10 WINS (centered QR-forward hero, tinted discs,
card groups, preview-tile theme picker, danger tone split, new sub-screens).
Scope THIS slice: **hub + backup + danger screen**. Downloads / dev-log /
contributors screens = next slice (their hub rows exist now, routed to shell
callbacks). Onboarding tail (backup-ux-spec §3.3) = Launch shell. Wallet
cross-link (§3.4) = wallet-polish queue.

Companion: `docs/backup-ux-spec.md` (interview-approved #131) — §3.2/§4/§5/§7
are normative for the Backup screen; this doc adds the hub and the mechanics.

## 1. Damir's locked picks (2026-07-05)

1. **Slice = hub + backup first**; list screens follow.
2. **Per-row commit** — no Save button. Nickname/avatar commits map onto the
   frozen `ixian:save:<nick>` (fires immediately; side-effect: persists current
   language/lock too — harmless, they're already committed per-row).
3. **Destructive ops → nested danger screen** — hub has one calm "Delete data…"
   row; the four ops live behind it as separated bordered cards (#142④ grammar).
4. **Backup hero = token-styled placeholder** built from registry icons
   (shield-lock + satellite motifs); the slot swaps to illustration #6 later.
5. **Identity block = avatar + nickname + own address/QR** (contact-page grammar).
6. **Theme = System / Light / Dark** radio sheet — legacy enum
   `ThemeAppearance` `automatic=0, light=1, dark=2` (ThemeManager.cs:9).
7. **Lock = switch row, auth on OFF** — enable commits immediately; disable
   stays pending until the C# LockPage auth round-trips (legacy `ixian:lock:off`
   pushes the modal; `setLockEnabled("False")` lands on success).
8. Onboarding tail deferred to Launch shell.

## 2. Bridge grounding (bridge-audit-B §1/§2 — all commands EXIST, none invented)

| Surface action | Legacy command | Notes |
|---|---|---|
| nickname/avatar commit | `ixian:save:<nick>` | persists nick + promotes avatar-tmp + broadcasts; also persists lang/lock |
| avatar pick | `ixian:avatar` | C# picker → resize → `loadAvatar(tmpPath)` push; promoted at save |
| avatar remove | `ixian:remove` | immediate; C# pushes `showRemoveAvatar('0')` + default `loadAvatar` |
| theme | `ixian:appearance:<int>` | applies immediately (legacy reloads the page; new shell = live token swap) |
| language | `ixian:language:<code>` | persists immediately + reloads (per-pick commit matches legacy semantics) |
| lock on | `ixian:lock:on` | flag; legacy persisted on save — per-row model fires a follow-up `ixian:save:<nick>` |
| lock off | `ixian:lock:off` | C# pushes LockPage(true); `setLockEnabled("False")` on auth success |
| backup account | `ixian:backupAccount` | encrypted superset ZIP → OS share (backup-ux-spec §1) |
| wallet export | `ixian:backupWallet` | raw wallet.ixi → OS share |
| delete history | `ixian:deleteh` | legacy UNGATED — our locked confirm is the only guard (flag to BE) |
| delete downloads | `ixian:deleted` | |
| delete account data | `ixian:deletea` | C#-side LockPage auth gate |
| delete wallet | `ixian:delete` | C#-side LockPage auth gate; node shutdown → Launch |
| C# → JS | `setNickname` `setAppearance` `setLockEnabled` `showRemoveAvatar` `loadAvatar` `onBack` | onload pushes + lock-off resolution |

## 3. Hub anatomy (`c-settings`, Account bottomnav tab — root view)

Topbar view-variant title "Account" (no back — root tab). Body `.u-scroll`,
chat-info section grammar (`> * + *` dividers).

1. **Identity hero** — avatar-64 (BUTTON → avatar sheet: "Choose photo" /
   "Remove photo" — remove only when a custom avatar exists, legacy
   `showRemoveAvatar`) · nickname + edit pencil (chat-info nickname grammar:
   Enter/blur commit, committing latch #141-M1, Esc dead in flight; EMPTY
   nickname = inline error, no commit — legacy validates non-empty via
   `ixian:error`) · own FULL address on the input chip + honest copy morph
   (#137 m1) + "Show QR" lazy reveal (`address:ixi`, --on-qr ink).
2. **Preferences** — setting rows (#142 sd-row grammar: label · value · chevron):
   - **Theme** → radio sheet System/Light/Dark, commit-per-pick latched
     (`onTheme(index, ctrl)`); success closes the sheet, row value updates.
   - **Language** → same sheet grammar over `languages: [{code, label}]`
     (`onLanguage(code, ctrl)`).
   - **App lock** → switch row (`onLock(next, ctrl)`): ON = optimistic +
     revert-on-fail (notifications-toggle grammar); OFF = **pending, not
     optimistic** — switch stays checked + `aria-busy` until ctrl.done (auth
     succeeded) flips it; ctrl.fail (auth canceled) clears busy, stays ON.
3. **Backup row** — shield-lock glyph · "Backup" · status sub-line + badge
   (backup-ux-spec §3.1/§4 state machine): never → warning "Action needed" ·
   clean → date sub, no badge · dirty → info badge + "{n} new contacts since
   last backup". Row → `onBackup` (shell navs to the Backup screen).
   `setBackupStatus(hub, { last, dirtyCount })` free fn drives it (#44).
4. **App** — nav rows: Downloads (`onDownloads`) · Contributors
   (`onContributors`) · Developer (`onDev`, gated `capabilities.dev`) ·
   About row = static version value (`version` opt, no chevron/action).
5. **Delete data…** — single neutral nav row (trash glyph) → `onDanger`
   (danger screen). The hub stays calm (Damir pick).

## 4. Danger screen (`createSettingsDanger` — view takeover, title "Delete data")

Four separated bordered cards (#142④), each = title + consequence sub-line,
each behind the house LOCKED alertdialog confirm (#135-C1: Cancel autofocus,
Esc/scrim/Cancel dead in flight via live setOverlayOpts, confirm latched,
ctrl.fail → inline error + refocus):

| Card | Callback | Confirm copy carries |
|---|---|---|
| Delete chat history | `onDeleteHistory(ctrl)` | device-only removal; contacts keep theirs |
| Delete downloads | `onDeleteDownloads(ctrl)` | received files removed from this device |
| Delete account data | `onDeleteAccount(ctrl)` | contacts+history+avatar gone; wallet stays; C# asks for your PIN |
| Delete wallet | `onDeleteWallet(ctrl)` | REMOVES THE WALLET FROM THIS DEVICE; without backup file + password it cannot be recovered; app restarts to Launch; C# asks for your PIN |

Order = blast radius, wallet last. Account/wallet cards note the native auth
step ("Spixi will ask you to confirm with your PIN") — the LockPage gate is
C#-side; the FE confirm is deliberateness, not the security boundary.

## 5. Backup screen (`createSettingsBackup` — backup-ux-spec §3.2 verbatim)

1. Hero: **placeholder composition** — shield-lock on a tonal wash disc,
   satellite chips (user-circle · wallet · users) = the "one file bundles
   identity+wallet+contacts" story; `.c-settings-backup__art` is the swap slot
   for illustration #6. Copy per §7 (`backup-hero-title`/`-body`).
2. Status line (shared source with the hub row): never / "Backed up · {date}" /
   dirty count.
3. CTA `Back up Spixi` (fill 56 full) → **password confirm modal** (input
   type=password, inline error on the field — never an alert):
   `onBackup({ password }, ctrl)` → in-flight = fully locked (#135-C1) →
   ctrl.done closes the modal, CTA `setSuccess('Backed up')` (#29), status
   refreshes via `setBackupScreenStatus`; ctrl.fail = inline invalid-password
   error, modal stays, field refocused (legacy `ixian:error` path rendered
   inline).
4. "What's inside" rows: Identity · Wallet · Contacts · Avatar (glyphs:
   user-circle / wallet / users / photo) — plain language.
5. Restore note (muted, §7 `backup-restore-note`) — the honesty line.
6. **Advanced reveal** (QR-reveal grammar, aria-expanded): one-line explanation
   + `Export wallet file only` (outline 44) → `onExportWallet(ctrl)`, latched,
   `setSuccess('Shared')` on done.

State honesty note (§5.4 of backup-ux-spec): "Backed up" after ctrl.done is
only as true as the share-sheet ambiguity allows; the mock stamps the date on
done, the real state needs the §9 timestamp ask.

## 6. Component/API map

- `src/components/settings-shell.js` — `createSettingsHub(opts)` ·
  `createSettingsDanger(opts)` · `setBackupStatus(hub, status)`.
- `src/components/settings-backup.js` — `createSettingsBackup(opts)` ·
  `setBackupScreenStatus(el, status)`.
- CSS: `settings-shell.css` + `settings-backup.css` (semantic tokens only;
  row/hero/chip/switch grammar mirrors chat-info.css, own class names —
  `.c-settings__*`, `.c-settings-backup__*`).
- Reuse: createTopbar · createAvatar · createButton/setLoading/setSuccess ·
  createBadge · createQrSvg · createSheet/createModal (+ live setOverlayOpts
  locks) · ctrl contract `(payload, ctrl)` one-shot per attempt.
- Bundle FILES: `settings-shell.js`, `settings-backup.js` after their imports
  (end of list is fine — money.js stays first).
- **No top-level helper name collisions**: chat-info owns `ctrlFor`/`sectionLabel`
  at module scope — settings helpers are nested or uniquely named.

## 7. Icon gaps (Damir export queue)

- `world` (language row) — stand-in: `at`.
- `lock` (app-lock row) — stand-in: `square-asterisk` (reads as PIN dots).
- shield-lock is IN the registry (77) — backup row + hero are real.

## 8. §9 BE asks (accumulate for the Phase 3 table)

1. Backup: last-backup timestamp + dirty signal + explicit completion callback
   (backup-ux-spec §5 — carried).
2. `ixian:deleteh` has NO auth gate C#-side (bridge-audit-B §1) — confirm
   whether it should ride the LockPage gate like deletea/delete.
3. Version string for the About row — no bridge push exists; `SPIXI_ENV` or a
   new onload push.
4. Language list — legacy hardcodes the dropdown in settings.html; the shell
   takes `languages` opts. BE: expose available lang files, or FE ships the
   list at build time.

## 9b. Slice 2 — Downloads · Developer (log) · Contributors (interview-locked 2026-07-05)

Damir's picks: Downloads = open-on-tap + per-file delete + clear-all + search
(all four) · Dev = read-only log **viewer + copy** (no export/tail — fits the
frozen bridge) · Contributors = **static list** ported from legacy
`contributors.html` (12 names, localizable via SL). All three are modal
takeovers in legacy (back = `PopModalAsync`); in the shell they're view
takeovers from the hub rows, `createTopbar({variant:'view', onBack})`.

### Bridge grounding (bridge-audit-B §6–§8 — nothing invented)

| Surface action | Legacy command | Notes |
|---|---|---|
| downloads list in | `clearFiles()` + `addFile(name, ctime)` | ctime = `DateTime.ToString()`, LOCALE-DEPENDENT opaque string (DownloadsPage.xaml.cs:98) — display as-is, never parse |
| open file | `ixian:open:<fileName>` | OS open/preview; C# checks existence |
| delete one file | `ixian:delete:<fileName>` | C# deletes + re-pushes the whole list (clearFiles+addFile) |
| clear all | `ixian:deleted` | the danger-screen command reused; C# alerts with count |
| dev log in | `setLog(text)` | whole ixian.log as ONE string (may arrive twice — OnAppearing + onload; idempotent replace) |
| contributors | — | fully static, no pushes |

### Screens (grammar reuse — no new component types)

1. **Downloads** (`createSettingsDownloads`) — c-search-field (frontend filter,
   name match, hidden when list < ~8) · file rows on a `.c-settings__group`
   card: `file-isr` disc · name (1-line ellipsis) · ctime sub · trailing
   trash icon-button → #135-C1 locked confirm (`onDeleteFile(name, ctrl)`);
   row tap = `onOpenFile(name)` (fire-and-forget — C# owns the result) ·
   toolbar/danger row "Delete all downloads" → confirmAction + #150⑥
   cannot-undo strip (`onClearAll(ctrl)`, `ixian:deleted`) · empty state
   (download disc + copy) — also what clearFiles renders · list driven by
   free fns `setDownloads(el, files)` (wholesale re-push mirror) matching the
   clearFiles/addFile contract.
2. **Developer** (`createSettingsDev`) — read-only monospace log pane
   (`u-scroll`, pre-wrap, newest at the bottom, auto-scrolled to end on set) ·
   "Copy log" outline button (navigator.clipboard, honest morph like the
   address copy — fail-soft when clipboard is absent) · **"Send log"** outline
   button beside it (Damir follow-up): §9-gated by `onSendLog` presence —
   wallet-export grammar (latched → loading → "Sent" morph); the proposal is
   C# opening the OS email/share sheet with ixian.log ATTACHED (mailto: can't
   carry the log — URL limits) · `setDevLog(el, text)` free fn (idempotent —
   double push safe) · empty state until the push. Unbounded-log honesty:
   text lands as ONE node, no per-line DOM.
3. **Contributors** (`createSettingsContributors`) — art slot (heart-handshake
   disc, illustration swaps later per illustrations-plan) · "Special thanks"
   label + the 12 legacy names as chips/rows on a card · takes
   `contributors: [names]` opts with the legacy list as default.

Security notes: file NAMES from the bridge are untrusted → `textContent`
only, never innerHTML (legacy concatenated HTML — do NOT port that). Log text
= `textContent` into the pane. The `..` traversal gap on `ixian:open/delete:`
is C#-side (bridge-audit-B §6 unusual) — carried as a §9 flag.

### §9 additions from this slice
5. `ixian:open:<file>` / `ixian:delete:<file>`: no path sanitization C#-side
   (`..` traversal possible in principle) — BE should sanitize/normalize.
6. `addFile` ctime is `DateTime.ToString()` locale-opaque — a stable ISO
   timestamp would let the FE bucket/format properly (nice-to-have).
7. **Send log** (Damir): new command (e.g. `ixian:sendlog`) — C# opens the OS
   email/share sheet with ixian.log attached, suggested recipient
   info@ixian.io (BE picks the address/mechanism). FE ships the button
   §9-gated behind `onSendLog`.

## 10. #147 PREMIUM ROUND (Damir, 2026-07-05 — second interview; reference img)

Locked picks: ① **QR-forward centered hero** — avatar-80 / name+pencil /
QR card immediately visible (`address:ixi`, --surface-qr) / full address chip.
The reveal step is GONE: P2P "add me" is THE account action. ② **Tinted icon
discs** per row — NEW code-only token group `--disc-{hue}-{bg,ink}`
(primary/accent/info/success/warning/error/neutral; light 100/600, dark
900/300; **error hue RESERVED for destructive rows** — the hub's Delete row
only). ③ **Group cards** — hub sections sit on `--surface-card` +
elevation-1, hairlines only INSIDE cards (the flat-list grammar is gone).
④ **Theme picker = visual preview tiles** — mini screens painted with FIXED
`--preview-light/dark-*` pairs (a preview shows its OWN mode; --surface-qr
precedent); System = diagonal split via clip-path. Same latch/commit contract.
⑤ **Danger tone split** — "Free up space" (history/downloads) = quiet neutral
rows; "Danger zone" (account/wallet) = heavy bordered cards. Confirm machinery
unchanged (#135-C1). ⑥ **Motion** — the backup Advanced reveal animates
(data-open → max-height/opacity, reduced-motion guarded).

### New settings (Damir picks, all in `settings-screens.js`)

| Screen | Nature | Contract |
|---|---|---|
| **Chat appearance** | **FE-ONLY** — ungated | pattern intensity (Off/Subtle/Standard/Bold → `--chat-pattern-opacity`; 0.5 = the #76 locked default) + message text size (S/M/L/XL → `--chat-text-scale`, NEW code-only token, default 1 — **bubble adoption lands at chat-shell integration**, flagged). Live preview rides the REAL `.c-chat-canvas` paint. Persistence: WebView localStorage until a §9 pref-sync ask. |
| **Privacy** | §9-gated (`readReceipts`, `typing`) | read receipts + typing indicator switches, optimistic + revert (chat-info toggle grammar). NEW §9 asks. |
| **Notifications** | §9-gated (`globalNotifications`) | global master + lock-screen previews + in-app sounds. Legacy has only per-chat group/bot mute → NEW §9 ask. |
| **Security level** | §9-gated (`securityTiers`) | **Basic / Moderate / Strict presets + Custom** (Damir concept — flag for ARCHITECTURE/BE): a tier CASCADES lock/privacy/notification policy; FE commits the tier id (`onSecurityTier`), the cascade is BE-side. Custom = "your individual settings apply". Proposed translation table (BE to confirm): Basic = lock optional · previews on · receipts on · payment-confirm off; Moderate = lock required · auto-lock 5 min · sender-only previews · payment-confirm ON; Strict = immediate auto-lock · no previews · receipts+typing off · payment-confirm ON. |

§8 additions: read-receipts command · typing-indicator command · global
notification prefs · security-tier command + policy cascade (the table above)
· pref-sync/persistence for FE-only settings (optional).

### #148 amendments (Damir fix round + consistency call)

Switch control rides the NEW `--switch-track-off`/`--switch-knob` pair (the
old track/knob was near-invisible on cards / in dark) · theme sheet **stays
open across picks** (check moves live, latch re-releases; user dismisses) ·
backup hero = ONE raised panel (art + copy + status pill + CTA), what's-inside
= 2×2 disc tiles, and ALL settings-family scroll bodies guard `> * {flex:none}`
(scrolling flex columns crush fixed-height children — the small-CTA root
cause) · address chip gains a SHARE button (share-3; §9 share ask) · language
sheet: 10 major languages with a leading flag slot (emoji now, SVG swap
later), >6 options scroll in a taller sheet, search joins later · **the disc
is the shared `.c-disc` atom (base.css) and chat-info/contact adopts discs +
card sections** — one treatment app-wide (see DECISIONS #148 for hues).

## 11. Demo (`src/demo/settings.html`)

Phone frame (wallet.html chrome), Account tab active on bottomnav, mock
bridge: theme pick actually swaps `data-theme` (live token proof) · language
mock list (English/Deutsch/Srpski/Français) · lock-off resolves after a 900ms
fake auth (or fails via the toolbar Bridge:FAIL toggle) · backup password =
`hunter2` (wrong → inline error), done stamps the date + clears the dirty
badge · danger ctrls resolve with toasts; delete-wallet toast notes the Launch
restart · #147: every §9 cap is ON to show the gated designs; chat-appearance
picks write root vars live. Statusbar plain (no hero paint). Demo links EVERY
component stylesheet it renders (#138 lesson) incl. the chat-canvas paint pair
(message-bubble.css + chat-pattern.css) for the appearance preview.
