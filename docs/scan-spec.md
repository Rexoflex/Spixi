# Scan shell spec — Phase 1 #3 (2026-07-05)

Damir picks (interview, 4/4): **full takeover** · decode = **auto-fill + return**
· **torch now, camera-flip deferred** · permission-denied = **inline retry +
honest copy** (no OS-settings deep link — no bridge verb exists; frozen bridge).

## 1. Bridge grammar (bridge-audit-B.md §5 — no new commands)

| Direction | Command | Notes |
|---|---|---|
| out | `ixian:qrresult:<text>` | Legacy scan.html decodes IN the WebView (html5-qrcode) and emits the payload; C# `processQRResult` is `allowScanning` one-shot, POPS the page, then raises `scanSucceeded` to the parent page (bridge-audit-B.md:170). |
| out | `ixian:back` | Cancel/back — C# pops + `GC.Collect()` (camera memory). |
| in | — | None. The parent page receives the result (e.g. add-contact `setAddress`). |

Payload is a RAW passthrough — the shell never interprets `<addr>:ixi` /
`<addr>:send` routing (that's the parent page's `processQRResult`, per page:
bridge-audit-A.md:200/244/560).

**Hazards gated FE-side (never emitted):** empty/whitespace decodes · payloads
containing the literal `ixian:qrresult:` (C# `Split`s on that literal — a
hostile QR could truncate itself into a different payload; §9 ask: C# should
guard too). One decode per view (`delivered` latch mirrors `allowScanning`).

## 2. Surface

`createScanView({ state, onRequestPermission, onDecode, onTorch, onCancel, strings })`
— full takeover: view topbar ("Scan QR code", back = `onCancel` → `ixian:back`),
camera area below.

| State | UI |
|---|---|
| `prompt` | Card on the (dark) camera area: primary `scan` disc · "Scan a QR code" · why-copy · **Allow camera** CTA → `onRequestPermission(ctrl)`; `ctrl.done()` → scanning, `ctrl.fail()` → denied. Latched + #141-m4 guarded. |
| `denied` | Same card, warning `eye-off` disc, honest recovery copy (camera is off; enable it for Spixi in device settings) + **Try again** (same handler re-requests — no dead end, no deep link). |
| `scanning` | 240px corner-bracket frame over a scrim cutout · `role=status` hint · **torch** toggle (`aria-pressed`, optimistic flip, `ctrl.fail()`/sync-throw reverts; hidden when `onTorch` absent — mock in demo, real torch at Phase 3 device tests). Camera-flip DEFERRED (Damir). |
| decode | Success flash (disc + check, status text "Code scanned") → after ~350ms `onDecode(text)` fires ONCE; host forwards to `ixian:qrresult:` and closes (auto-fill + return). |

Free fns (#44): `setScanState(el, state)` · `deliverScanResult(el, text)` — the
decode entry point (html5-qrcode callback in the app, mock button in the demo);
ignored unless scanning + un-delivered.

## 3. Entry symmetry (QR-in / QR-out)

- **add-contact scan button** (was the #153 nav stub) → opens Scan; result
  returns via `setAddContactAddress` (mirrors bridge `setAddress`), live
  `checkAddress` ✓ re-runs. Wired in chats.html.
- **wallet-send recipient** + home `ixian:quickscan` are the same takeover at
  their integration (bridge-audit-A.md:243/560) — no per-caller variants.
- QR-out (wallet-receive / settings identity card) untouched.

## 4. Demo (chats.html)

Mock camera (no html5-qrcode in-sandbox). Deterministic mock: FIRST Allow
attempt DENIES (recovery state demoable + smoke-stable), Try again grants.
"Simulate QR decode" demo-only button injects a fresh 37-char address →
auto-fills add-contact. Toasts label every mock bridge hop.

## 5. Flags for Damir's demo pass

① Torch glyph = `eye` STAND-IN (no bulb/flashlight in Tabler registry — icon
gap, B2 export list; `eye-off` doubles as the denied disc). ② Frame size/scrim
darkness (240px / 0.45) — eyeball on phone frame. ③ Denied copy wording. ④
Success-flash duration (350ms) before the view closes.

## 6. Non-goals

Camera-flip (deferred) · in-place decode confirmation (rejected — legacy pops
immediately; caller's validation is the confirm) · OS-settings deep link (no
bridge verb; would be a §8 proposal if BE wants it) · real camera/permission
plumbing (Phase 3 native.js + device tests).
