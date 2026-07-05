# Opus audit brief — Scan (#158) + Lock (#159/#160) batches, ONE combined loop

Point Opus at this file — it is SELF-CONTAINED (the earlier scan-only brief is
archived in `docs/archive/`). Run the **#46 audit loop** over BOTH batches
together: read-only adversarial audit (findings with file:line) → fixer pass →
fresh adversarial reviewer → loop fix↔review until CLEAN. Damir reviews the
diff in GitHub Desktop after.

## Boot ritual

`CLAUDE.md` → `DECISIONS.md` rows **#151–#160** (rows were RENUMBERED at the
#157 merge row — contacts build = #155, its audit = #156) → `docs/scan-spec.md`
→ `docs/lock-spec.md` → this file. Bridge truth: `bridge-audit-B.md` §5 (Scan)
· `bridge-audit-A.md` §11 (LockPage) · `bridge-audit-B.md` §3–§4
(EncryptionPassword/SetLockPage).

## Scope (both batches — built by fable on the PC, Damir-smoked, unaudited)

**Scan (#158):**

| File | What it is |
|---|---|
| `src/components/scan-shell.js` | NEW — `createScanView` (prompt/denied/scanning states, torch, permission ctrl) + free fns `setScanState` / `deliverScanResult` (one-shot decode, hazard gates) |
| `src/styles/components/scan-shell.css` | NEW — fixed-dark camera bed (sanctioned raws, --surface-qr fixed-pair precedent), bracket frame + scrim cutout, torch chip, card on bed, success flash |
| `src/demo/chats.html` | add-contact scan stub → real takeover; deterministic permission mock (1st Allow DENIES); `demo-scan-sim` decode button; `openAddContact` restructured to hold the add element |
| smoke + bundle | `chats.html — scan shell` block (+~22) + static guards; FILES entry after contacts-shell |

**Lock (#159 + #160/#160b premium round):**

| File | What it is |
|---|---|
| `src/components/lock-shell.js` | NEW — `createLockScreen` (unlock/confirm, no topbar, escape-hatch modal, bio-retry re-onload, the §3 no-callback auto-release contract) + `setLockMode` + `createEncPassScreen` (3 fields, inline gates incl. the changepass-delimiter hazard, scrub on back/success/pagehide) |
| `src/styles/components/lock-shell.css` | NEW — boot-takeover layout, #51 focus grammar, #152① `::-ms-reveal` dark fix, #150③ input-on-card; **#160/#160b premium round:** fixed-dark brand surface (subtree `data-theme="dark"` pin + glass input + bare glowing logo), brand/form/spacer/tail zones, shell-owned show-password eye (native `::-ms-reveal` suppressed; scrub RE-MASKS — check all 4 fields × all scrub paths), full-bleed + `env(safe-area-inset-top)` |
| `src/styles/tokens.css` | +`--gradient-lock` (#160, code-only, fixed both themes — check the dark-pin interplay: nothing inside `.c-lock` may assume light-theme values; the escape-hatch MODAL mounts on the HOST (outside the pin) and stays themed — verify that reads as intended, both themes) |
| `src/components/settings-shell.js` | +`onChangePassword` param + "Change wallet password" nav row (Security & privacy; merge-safety is LIFTED #157 — this edit is sanctioned) |
| `src/demo/settings.html` | toolbar Lock now / Confirm action overlays · `showEncPass` · hub row wiring · `.demo-lock` chrome |
| `scripts/smoke-test.mjs` | +~24 assertions (`settings.html — lock shell` block + static guards) |
| `scripts/build-demo-bundle.mjs` | +2 FILES entries (scan-shell, lock-shell — both before settings-shell) |
| `docs/lock-spec.md` · `docs/settings-shell-spec.md` (hub row note) | Specs — check code ↔ spec drift both ways |

## HARD CONSTRAINTS for fixers

1. Bridge FROZEN. Lock emits ONLY `ixian:unlock:<password>` · `ixian:change` ·
   re-emitted `ixian:onload` (Damir-picked retry; already flagged for BE
   blessing) · `ixian:changepass` (delimiter-joined C#-side) · `ixian:back`
   (encpass only — it's a C# no-op on the lock page). Scan: `ixian:qrresult:` +
   `ixian:back`. Missing capability = §8/§9 proposal, never a new verb.
2. **SECURITY.md checklist is part of this audit** (lock-spec §5): password
   scrub coverage (back/success/pagehide/hatch/cancel — find the path that
   DOESN'T scrub), no logging, no storage, no DOM echo of password text,
   autocomplete stance, shells emit intent only.
3. Mechanical fixes land directly; architectural findings = 🟡 DECISIONS rows.
4. **Verification per pass: PC batch (#142) — DAMIR runs
   `node scripts/build-demo-bundle.mjs` then `node scripts/smoke-test.mjs`
   (PowerShell, `Spixi` subfolder, no `&&`) and pastes output between passes.**

## Where to look hard — Scan

- **One-shot decode latch vs view lifecycle:** `delivered` never resets — the
  host-close race: onDecode fires at +350ms; cancel (back) in that window →
  onDecode fires into a removed panel (`closeScan` then `setAddContactAddress`
  on a live `add` — what if the ADD panel closed too?). Wedge/no-op paths
  with file:line.
- **Permission ctrl races:** double-click on Allow (`st.requesting` latch);
  ctrl resolving AFTER view removal; `setLoading` restore vs sync() relabel
  ordering.
- **Torch:** `torchBusy` + optimistic flip — rapid taps; late ctrl.done after
  a second tap; aria-pressed truth vs mock state.
- **Fixed-dark bed CSS:** on-camera raw inks in BOTH themes; the 9999px
  box-shadow cutout on the conservative WebView baseline;
  `inset-inline`/`margin-inline` support.
- **Hazard gates:** trim semantics (inner whitespace legit?); the
  `ixian:qrresult:` literal check — case sensitivity vs C# `Contains`; silent
  drop vs hinted.
- **A11y:** role=status hint updates; torch aria-pressed + label; card CTA
  focus across prompt↔denied relabel; the takeover itself vs the carried
  focus-trap backlog (#156 — don't re-open, don't worsen).
- **Entry symmetry:** `setAddContactAddress` unlatch/in-flight interplay
  (#156-F5) with a QR result arriving mid-send or post-success.
- **Spec drift:** scan-spec.md §2 vs code; Damir flags §5①–④ are HIS calls.

## Where to look hard — Lock

- **The §3 no-callback contract:** `UNLOCK_RELEASE_MS` auto-release vs a LATE
  `ctrl.done()`/`ctrl.fail()` (mock resolving at 1601ms — `settled` flag
  ordering); double-submit during the window; Enter-key vs click races;
  ctrl.done path leaves the FIELD disabled by design (page is being replaced) —
  verify no path back to an enabled screen with a wedged field (e.g. demo
  close fails, setSuccess restore interplay — the #156-F5 class!). `setSuccess`
  captures `originalDisabled` on the unlock button: check nothing re-enables
  what should stay latched or vice versa.
- **Escape-hatch modal:** created per-click — leak on repeat opens? host
  resolution (`el.closest('.demo-phone')`) outside the demo; scrub-before-nav
  actually runs on BOTH hatch confirm and confirm-mode Cancel.
- **setLockMode mid-flight:** flipping unlock↔confirm while a submit is in
  flight (chrome swaps but the latch persists — anything inconsistent?).
- **Encpass gate order + messages:** which field gets focus per error; error
  strip is SHARED (one `role=alert`) — stale text between distinct failures;
  delimiter gate covers old+new but repeat only transitively; trim semantics
  (passwords are NOT trimmed — verify consistently, incl. the lock screen).
- **Scrub completeness:** `pagehide` listener is on the SECTION element —
  does it ever fire there (it bubbles on window/document; element-level
  listener may be dead code → fix to a real hook or remove honestly).
- **CSS:** `.c-lock` centered layout at short viewports (keyboard up — 419×~500
  effective); `max-width: 320px` vs desktop pane; `heading-sm` title vs #58;
  focus-visible on the hatch link; both-theme contrast of `--text-error` on
  `--surface-screen` and card.
- **Settings-shell edit blast radius:** the new row is presence-gated —
  confirm NOTHING else in the hub moved (smoke's older assertions still pin
  row counts?); settings-shell-spec drift.
- **Cross-batch:** scan + lock both re-use the one-shot ctrl grammar — confirm
  parity with settingsCtrl/contactsCtrl (no drift in double-fire semantics).

## Known/parked (do NOT re-flag)

- Scan: torch glyph = `eye` stand-in, denied disc = `eye-off` (no
  bulb/flashlight in the registry — B2 export queue) · camera-flip deferred
  (Damir pick) · no OS-settings deep link (no bridge verb) · real
  camera/permission plumbing = Phase 3 (html5-qrcode mounts in
  `.c-scan__feed`) · first-Allow-denies is a DELIBERATE deterministic demo
  mock (scan-spec §4).
- ENC_MIN=8 is Damir flag ① (lock-spec §6) — his call, not a finding.
- Autocomplete stance = flag ② — his call.
- 1600ms window = flag ③ — his call (but DO flag a mechanical race if found).
- Bio-retry via `ixian:onload` re-emit is a Damir pick with a standing BE
  flag — don't re-litigate the design, do check the button's states.
- Set-lock page absorbed by the hub switch — decided (#159), not drift.

## After CLEAN

Update the batch DECISIONS rows (#158, #159/#160) with the audit outcome + backlog,
have Damir rebuild bundle + smoke one last time, and list the
eyeball-in-Desktop files.
