# Opus #46 loop — work order: the F5 fix batch (#553–#556) + Batch E (#557)

One loop, two batches (they landed together, 2026-08-25). Builder = the fable
session; the loop is OPUS-run, the builder never adjudicates its own findings.
3 disjoint READ-ONLY auditors → fixes → a fresh break-my-verdict re-review.
Verdict to `docs/opus-review-verdict-f5-batch-e.md`; auditor reports beside it.

## The delta under review (uncommitted, on top of 0acd5ada)

C# — F5:
- `Spixi/App.xaml.cs` — EnsureNodeRunning wallet guard (F5-3, #553)
- `Spixi/Meta/Node.cs` — mainLoop fetch wallet clause (F5-3)
- `Spixi/Network/StreamProcessor.cs` — VoIP session re-check deferral, 3 legs (F5-1, #554)
- `Spixi/Platforms/Android/MainApplication.cs` — UnhandledExceptionRaiser hook (F5-2, #555)
- `Spixi/Pages/Contacts/ContactDetails.xaml.cs` · `Spixi/Pages/Home/HomePage.xaml.cs`
  — [CRASHDIAG] breadcrumbs (F5-2)

FE — F5-4/5 + Batch E:
- `src/styles/components/wallet-send.css` — picker card chrome dropped (F5-4, #556)
- `src/styles/components/wallet-receive.css` — QR card padding 0/radius/elevation ·
  desktop scroller rules · explainicon (F5-5)
- `src/components/wallet-receive.js` — flat explainer glyph (disc removed)
- `src/components/desktop-anchors.js` — NEW anchorSheetToRow (Batch E (a), #557)
- `src/styles/components/overlay.css` — [data-m-anchor] variant · deeper mobile scrim ·
  [data-dt-ctx-source] retune (a/b/c)
- `src/styles/tokens.css` — --surface-scrim-deep
- `src/components/message-menu.js` · `src/components/chats-row-menu.js` — anchor wiring
- `src/components/settings-shell.js` · `src/shells/settings.html` ·
  `src/styles/components/settings-shell.css` · `src/demo/settings.html`
  — Account QR = openAddressSheet reuse (d)
- `src/shells/home.html` — dev-HUD rail offset rider
- `scripts/smoke-test.mjs` — new pins + rebases (F5 block · Batch E block ·
  N86/PIN-G/W-c rebases · loop r1 A-3 rebase · PIN-N4 anchor rebase)

## Auditor scopes (disjoint)

- **Auditor A (C#):** the six C# files above + their callers. Threading (the
  deferred re-check vs live calls and mini-app sessions), guard edge cases
  (cold boot, OS-kill resume, locked app, delete-account flow), the F5-2 hook's
  log-content reach (the gate row accepts it knowingly — verify the acceptance is
  honest), regressions on the #549 D1 work and the #545 wipe.
- **Auditor B (components/CSS):** Batch E (a)-(c) + F5-4/5. Geometry (above/below/
  clamp, RTL, short hosts, tall menus, the chat log's overlay host), a11y (focus
  trap on a repositioned sheet, reduced motion, SR), z-order vs the #519
  `isolation: isolate` press layers and the #506② lift, both themes, the demo
  surfaces.
- **Auditor C (shells + pins):** the settings QR reuse end-to-end (mobile takeover,
  desktop pane, warm-parked Account (#546), the #443 explainer fold, strings/i18n),
  the dev-HUD rider, and EVERY pin touched this session — vacuous-pin hunt
  (mutate before believing; the #520/#496 lessons: a rebased pin is a NEW pin).

## Non-negotiables

No Ixian-Core changes (097341a) · #268 stands (no desktop wash) · the lift stays ·
no new NuGet · openAddressSheet reuse is Damir's call, do not re-litigate ·
F5-6 (Max hint) is an OPEN dial — not in scope · v1.1 stays out.

## Accepted residuals (do not re-open, verify they are stated honestly)

- The cold-push lane still posts kind "message" for call pushes — payload has no
  kind; BE row §1e-5 (security-review-for-be-engineer.md).
- The F5-2 hook logs the exception body verbatim (gate row carries the retirement
  condition).
- A fetched stale call may ring for one main-thread drain before its end-session
  lands (start→stop within the queue drain).
- F5-2 is a DIAGNOSTIC, not a fix — no logcat, no mechanism (#294).

## Verdict

Append PASS/FAIL + findings table to `docs/opus-review-verdict-f5-batch-e.md`.
MAJORs get fixed by fix agents (disjoint scopes) and re-reviewed fresh.
