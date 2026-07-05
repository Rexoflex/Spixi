# Lock shell spec — Phase 1 #4 (2026-07-05)

Damir picks (interview, 4/4): **set-lock ABSORBED by the settings hub switch**
(#146⑦ authSwitchRow already speaks `ixian:lock:<on|off>`; C# repoint maps
`settings_lock.html` → settings shell) · unlock escape hatch = **quiet link +
confirm modal** · biometric retry = **re-emit `ixian:onload`** (flagged to BE)
· encpass = **settings row, old + new + repeat-new**.

So the lock shell = **unlock · confirm-action · change-encryption-password.**
SECURITY.md checklist pass is mandatory — see §5.

## 1. Bridge grammar (frozen — bridge-audit-A.md §11, bridge-audit-B.md §3)

| Direction | Command | Notes |
|---|---|---|
| out | `ixian:unlock:<password>` | LockPage `doUnlock` → `WalletStorage.verifyWallet`; wrong = NATIVE alert (no JS callback!); right = `authSucceeded` → C# pops (confirm mode) or replaces with Home. |
| out | `ixian:change` | Confirm mode = cancel (`authSucceeded(false)` + pop). Lock mode = push LaunchPage (recreate/restore) — the escape hatch. |
| out | `ixian:onload` | LockPage.onLoad relaunches native biometrics (`Plugin.Fingerprint`, skipped on WinUI) — **re-emitting it IS the retry affordance** (Damir pick; §9 ask: BE blesses the lifecycle-verb reuse or ships `ixian:bioretry`). |
| in | `setJustConfirm("True")` | Confirm-action mode flag → `setLockMode(el, 'confirm')`. |
| out | `ixian:changepass:--1ec4ce59e0535704d4--<old>--…--<new>` | EncryptionPassword page; magic delimiter so passwords may contain `:`. Wrong current = alert; success = alert + pop. |
| out | `ixian:back` | encpass only (lock screen: `ixian:back` is a C# no-op — no back from lock). |

**No wrong-password callback exists on either page** → FE contract (§3).

## 2. Surfaces

### `createLockScreen({ mode, biometrics, onUnlock, onBiometricRetry, onUseAnotherWallet, onCancel, strings })`
Boot takeover, NO topbar (there is no back). **#160 premium round (Damir
screenshot):** fixed-dark BRAND surface both themes — subtree pinned
`[data-theme="dark"]` (#20 precedent) over the new code-only
`--gradient-lock` (3 corner radials purple/blue/cyan + 215° base); bare
glowing logo (no disc); glass input; title **"Spixi is locked"** (app-level —
never "Wallet locked"; body copy keeps "wallet password", that IS the secret);
**equal 56 button family** (Unlock · fingerprint · Cancel); **#160b:** zones
(brand upper 1.2fr · action cluster lower-middle · hatch/Cancel footer — the
two flex ratios are the placement dials) · shell-owned **show-password eye**
per field (native `::-ms-reveal` is WebView2-only → suppressed; scrub also
RE-MASKS) · **full-bleed gradient** under the statusbar (LockPage owns the
screen; `env(safe-area-inset-top)` keeps content clear). Centered: logo ·
title · password field (`type=password`, autocomplete off) · **Unlock**
(56/full) · "Try fingerprint again" (outline 56, `biometrics`-gated — WinUI
hosts pass false) · mode tail:

- `mode:'unlock'` — quiet link "Use a different wallet…" → confirm modal
  (createModal, #135-C1 lock grammar; honest copy: wallet stays on the device,
  you leave to setup) → `onUseAnotherWallet()` → `ixian:change`.
- `mode:'confirm'` (setJustConfirm) — title "Confirm it's you", NO escape
  link; **Cancel** (text) → `onCancel()` → `ixian:change`.

Free fn (#44): `setLockMode(el, 'unlock'|'confirm')`.

### `createEncPassScreen({ onChangePassword, onBack, strings, host })`
View topbar ("Change wallet password") + card: current / new / repeat-new
(`type=password`; WebView2 native `::-ms-reveal` eye with the #152① dark
filter). Inline gates (never sent): any field empty · new ≠ repeat · new ===
current (pointless) · **new < 8 chars (⚠ flag ①: legacy min unknown — Damir/BE
confirm)** · any field containing the magic delimiter literal (`Split` hazard —
§9 ask: C# guard too). Submit: latched + loading + #141-m4; `ctrl.fail(msg)` →
inline error on the CURRENT field (legacy invalid-current alert path);
`ctrl.done()` → success morph "Password changed" → **scrub** → `onBack()`
(legacy pops). Hub entry: new `onChangePassword` nav row in Security & privacy
(settings-shell.js; legacy nav verb `ixian:encpass` exists, bridge-audit-A:258).

## 3. The no-callback contract (unlock pending latch)

`ixian:unlock:` gets NO reply on failure (native alert only). Submit therefore:
latch (input+button disabled, aria-busy, spinner) → if `ctrl.done()` (success —
C# is about to replace the page) keep latched + "Unlocked" morph → if
`ctrl.fail(msg)` (mock now; §9 `unlockFailed` ask later) inline error + restore
→ if NEITHER lands in **1600ms, auto-release silently** (value kept, field
re-enabled — the native alert has already told the user). Never wedges, never
double-fires (`inFlight`), never lies about what it knows.

## 4. Demo (settings.html)

Toolbar: **Lock now** (unlock mode overlay, below the mock statusbar) ·
**Confirm action** (confirm mode). Password `hunter2`. Wrong password = toast
"C# native alert" + the 1600ms auto-release (contract §3 live). Bio retry
mock re-onloads → success. Encpass from the new hub row; Bridge:FAIL toggle
drives the wrong-current path.

## 5. SECURITY.md checklist (this batch)

- Passwords exist ONLY in the field values, transiently: encpass **scrubs on
  back, on success, and on `pagehide`**; lock screen scrubs on successful morph
  + escape-hatch confirm. No echo into DOM text, no logging, no storage, no
  `console.*` in lock-shell.js (smoke-guarded).
- Shells emit intent; `verifyWallet`/`writeWallet`/LockPage remain the C#
  boundary. FE confirms are deliberateness only (#146③).
- Autocomplete: `autocomplete="off"` current / `"new-password"` new fields —
  no password-manager capture of the wallet password by default (⚠ flag ②:
  Damir may prefer allowing managers; one attribute).

## 6. Flags for Damir's demo pass

① new-password min length (8 assumed) ② autocomplete stance (§5) ③ unlock
auto-release window (1600ms) ④ escape-hatch copy ⑤ ~~logo treatment~~
RESOLVED #160 (bare glowing glyph on `--gradient-lock`; gradient recipe is
Damir-tunable — the 4 layers + alphas in tokens.css are the dials; Launch
shell should inherit this brand direction).

## 7. Non-goals

Set-lock screen (absorbed — hub switch) · PIN pad (wallet password is
free-text; C# verifies) · biometric UI (fully native) · `ixian:back` on the
lock screen (C# no-op) · real LockPage plumbing (Phase 3 native.js + repoint).
