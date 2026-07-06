# Native bridge adapter — src/bridge (Phase 3 item 2, DECISIONS #173)

The demos' inline mocks are the behavioral contract; `src/bridge/` carries the
same shell callbacks over the FROZEN MAUI bridge (ARCHITECTURE §2/§3,
bridge-audit-A/B). Zero C# changes required to run against today's app.
First C# repoint target: **Scan** (Damir 2026-07-06).

## 1. Files

| File | Exports | Role |
|---|---|---|
| `src/bridge/native.js` | `createNativeBridge` · `installExecuteUiCommand` · `b64ToUtf8` | transport core — no component imports |
| `src/bridge/scan-page.js` | `mountScanPage` · `html5QrcodeCamera` | scan.html replacement wiring (ScanPage) |
| `src/bridge/lock-page.js` | `mountLockPage` · `mountEncPassPage` | lock.html + settings_encryption.html wiring (LockPage / EncryptionPassword) |

All three ride the demo bundle (FILES tail) so the jsdom smoke suite can drive
them; demos stay mock-wired. The Phase 3 Vite build consumes the ESM directly.

## 2. Transport contract + deliberate legacy divergences

JS→C#: `bridge.send('ixian:…')` → `location.href`, RAW legacy composition —
no encoding (C# `HttpUtility.UrlDecode`s once; pre-encoding would double-decode
on some WebViews). The legacy `%`-in-password corruption therefore REMAINS —
mirrored, not fixed; the real fix is the §8 `ixian:secure` postMessage proposal.
`send()` throws on a non-`ixian:` string (adapter bug = fail loud).

C#→JS: `installExecuteUiCommand(win)` defines the dispatcher C# injects calls
against (`executeUiCommand(fnRef, 'b64', …)` — bare page-global function refs,
Base64 UTF-8 args, spixi.js:102 mirror). Divergences from legacy spixi.js:

| # | Divergence | Why |
|---|---|---|
| 1 | NO `escapeParameter()` on decoded args | legacy HTML-escaped for innerHTML concatenation; our shells are textContent-only — escaping would render literal `&amp;` |
| 2 | NO `alert()` on dispatch errors — `console.error`, swallow | legacy alerted stack traces at users |
| 3 | `ready()` = `ixian:onload` once, latched; NO `ixian:ready:<shellId>` dual-emit yet | several C# handlers match with `Contains` (§9.2) — unknown commands aren't provably inert; dual-emit waits for the §8 approval |

Capability handshake (#115): `SPIXI_ENV.capabilities` (generation-time token
block, ARCHITECTURE §7) → `bridge.cap(name)`. Absent env/key = OFF — every
§8/§9 feature stays gracefully gated against today's C#.

## 3. Scan adapter (`mountScanPage`)

- Camera = injectable provider; default wraps the vendored **html5-qrcode**
  global (already ships at `Resources/Raw/html/js/html5-qrcode.min.js`).
  Missing library → the CTA lands on the honest **denied** card, never a dead
  button. Torch renders only when the provider exposes `setTorch`
  (`applyVideoConstraints({advanced:[{torch}]})`, runtime-fail reverts).
- Decode → `ixian:qrresult:<raw text>` ONCE (scan-shell one-shot + adapter
  `finished` latch = allowScanning mirror), camera stopped.
- Cancel → `ixian:back` (C# pops + GC.Collect).
- **Terminal-latch rule:** decode and cancel are mutually exclusive and final.
  Back inside the 350 ms flash window drops the pending qrresult (closes the
  #162 [S1] backlog item for the real page); back after decode emits nothing
  (a second command would pop the PARENT page).

## 4. Lock adapters

`mountLockPage`: unlock → `ixian:unlock:<password>` raw after the prefix
(colons pass through — C# `Split`s on the prefix) · biometric retry →
re-emit `ixian:onload` (deliberate, bypasses the ready latch; §9 bioretry flag
stands) · hatch + confirm-Cancel → `ixian:change` · C#→JS global:
`setJustConfirm("True")`. `biometrics` flag: opts → `SPIXI_ENV.biometrics`
(one `addCustomString` in the repoint PR; absent = false = button hidden).

`mountEncPassPage`: commit → `ixian:changepass:<DELIM><old><DELIM><new>` —
**LEADING delimiter** (settings_encryption.html:110; C# takes split[1]/[2],
EncryptionPassword.xaml.cs:55). ARCHITECTURE §3's condensed line omits the
leading DELIM; audit-B + legacy source are the truth. `ENC_DELIM` is imported
from lock-shell (now exported — one truth). Back → `ixian:back`.

## 5. No-callback mirrors + §9 pre-wires

C# answers wrong passwords with NATIVE alerts only (lock-spec §3). Lock keeps
the shell's own 1600 ms auto-release. Encpass has no component-side release, so
the ADAPTER supplies one: 1600 ms without a page-pop → `ctrl.fail()` restores
the form with the inline wrong-current copy (matches the alert C# just showed;
on success C# popped the page and nothing here runs).

Pre-wired inert globals for future §9 pushes: `unlockFailed(msg)` ·
`changePassFailed(msg)` — they beat the timers the moment BE ships them.

## 6. Integration notes (repoint PR checklist, scan first)

1. Vite entry per page (Phase 3 item 4) mounts the adapter; until then the
   bundle + a minimal HTML file work identically.
2. ScanPage/LockPage `loadPage` repoints — mapping table lands with item 5.
3. `SPIXI_ENV.biometrics` custom string on LockPage generation (WinUI: false).
4. html5-qrcode stays vendored; the default provider expects the global.
5. i18n: adapters read `window.SL` (§7 plan) — dictionaries land with item 3.

## 7. Security checklist (SECURITY.md pass)

Passwords transit `send()` exactly as legacy (URL navigation — known §9.1
finding, frozen). Bridge layer: no innerHTML · no alert · no console.log
(smoke-guarded) · no storage · no password retention (shells scrub; adapters
hold no copies — the command string is handed straight to the sink).

## 8. Smoke coverage

~35 assertions appended to `scripts/smoke-test.mjs` (components.html bundle
vehicle): raw-composition emit · ready latch · capability gates · UTF-8 decode
· divergence guards (no escape, throw-swallow) · scan grant/deny/torch/one-shot
/hostile-payload/terminal-latch/[S1] race · lock unlock-latch/setJustConfirm
/unlockFailed/change/bioretry · encpass leading-delimiter format/release/back ·
static guards (bundle order, ENC_DELIM one-truth, no ixian:ready).
Run order (PC, PowerShell, `Spixi` subfolder, no `&&`):
`node scripts/build-demo-bundle.mjs` then `node scripts/smoke-test.mjs`.

## 9. Flags

① Encpass release copy: after the 1600 ms mirror the form shows the inline
"current password isn't right" line — on an actual C# SUCCESS the page is
already gone, but a slow pop (>1600 ms, the #162 [L1] family) would flash it.
Same timing family as [L1]; acceptable? ② `html5QrcodeCamera` uses
`formatsToSupport: [0]` (QR only) and default fps 10 — tune on device.
③ Demos remain mock-wired by design; extracting a shared `src/bridge/mock.js`
stays open (Damir deferred it this batch).
