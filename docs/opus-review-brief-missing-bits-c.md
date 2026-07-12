# Opus #46 work order — MISSING BITS BATCH C (#261: M6 desktop overlay grammar · M7/M8 form panes)

> Loop protocol per #46: 3 disjoint READ-ONLY auditors → fixes (disjoint scopes) →
> a FRESH break-my-verdict re-reviewer → until CLEAN. Verdict appended HERE.
> Runs as Opus-delegated agents inside the fable session (Damir directive).
> ⚠ #175: bash/node mount serves STALE/TRUNCATED copies of edited/large files
> (this session: overlay.css + smoke-test.mjs stale; chat.html/home.html markers
> fresh at check time but treat every bash read as suspect). File tools only.

## What was built (DECISIONS #261; spec desktop-split-spec §6e.6)

- **M6 (zero-C#):** `overlay.css` `:root[data-desktop]` block (sheets → centered
  dialogs; `[data-dt-anchor]`/`="menu"`/`="up"` fade-in-place variants;
  `[data-dt-ctx-source]` highlight). NEW `src/components/desktop-anchors.js`
  (`attachContextMenuAnchors` 600ms-observer recipe + `anchorSheetAbove`; no-ops
  without data-desktop) + bundle FILES entry. chat.html wires `.c-bubble-row`
  menus + the attach-⊕ popover; home.html wires `.c-chatlist-item` row menus.
- **M7/M8 (small C#):** HomePage `ixian:newcontact`/`newapp` →
  `pushPageLoaded(page, 4000, "formpane", wide ? 1 : -1)`; new
  `closeFormPaneOverlays()` called at tab-switch / onChat / onTransaction.
- Smoke: static-guard blocks for Batch B + C appended.

## Auditor scopes

- **A — M6 CSS + component:** overlay.css desktop block vs the demo source rules
  (desktop.html:205-237/:302-305/:320-328 — verbatim? specificity vs `.dt-frame`
  inside the demo, which has `data-desktop` on `<html>`: production rules win —
  confirm value-identical so the demo doesn't shift). desktop-anchors.js vs the
  demo recipe :1127-1162/:1249-1258 (600ms rule, removedNodes cleanup, clamps,
  host-rect math when host = document.body, detach correctness, direct-child
  observer vs where sheets actually mount — overlay.js `host.append(scrim, el)`).
  Sheet lifecycle: does the dialog presentation break any sheet content that
  assumed bottom-sheet geometry (member sheet ≥8 filter, tip sheet, reactions
  inspect, launch Terms doc sheet under max-height 76%, settings pickers on a
  narrow desktop window)? Transitions: transitionend still fires for dismiss
  (opacity/transform), reduced-motion behavior, the `[data-open]` state pairs.
  a11y: #205 focus machinery presentation-independent; role=dialog APG nit is an
  ACCEPTED dial. Money sheet: `wallet-send.js` lightDismiss/escDismiss JS-side —
  confirm the CSS cannot weaken dismissal.
- **B — M7/M8 C# vs the #247 machinery:** HomePage edits (newcontact/newapp
  routing, closeFormPaneOverlays + its 3 call sites) vs SpixiContentPage
  pushPageLoaded/rehomeOverlay/relayoutPinnedOverlays/closeOverlay + the #230
  lock guard. Attack: tag-replace across DIFFERENT page types (formpane:
  ContactNewPage ↔ AppNewPage — is closeOverlay type-agnostic?); a formpane open
  while Account pane opens (stage order/z); back/hardware-back from a pinned
  formpane (does the #240 back routing reach it?); the ScanPage hand-off from a
  PINNED ContactNewPage (root-nav push while overlay current — does overlayMode
  fall back correctly for the NEXT pushPageLoaded?); narrow-resize re-home;
  removePage on a form mid-typing (accepted dial — verify no crash path);
  rightContent.IsVisible as the wide test (same as onSettings/onChat).
  ★ C# risk fence: the edits must be presentation-only routing — no new verbs,
  no signing/keys/filesystem/password paths (CLAUDE.md "C# touches no risky
  parts"); flag ANY drift.
- **C — cross-cutting:** ★ #221 (no new cross-WebView channels; the observer
  reads DOM only) · frozen bridge (zero NEW ixian: emissions — grep the touched
  files) · #248 markers · no NUL · zero new strings claim · bundle FILES entry +
  preflight coverage for the new destructures (attachContextMenuAnchors,
  anchorSheetAbove) · smoke additions reference real markers (each regex actually
  matches the current files — false-green guards are worse than none) · doc
  consistency (DECISIONS #261 vs diffs; polish-roadmap M6/M7/M8; §6e.6).

## Accepted dials (do NOT re-litigate)

- Long-press/keyboard menu opens stay centered dialogs (600ms rule, demo-locked).
- Navigate-away closes a form pane and discards typed input (one-field forms).
- role=dialog on right-click dropdowns (APG menu semantics = later dial).
- The desktop demo is not forked; production selectors out-specifying `.dt-frame`
  with identical values is the intended no-op.
- Install-confirm stays modal; contacts picker stays a takeover (#256).

## Non-negotiables (violations = MAJOR)

★ #221 · money untouched · frozen bridge · C# = presentation-only routing (no
risky parts) · #248 · fail-loud (#258 §5.6) · verify-first (#215).

---

## VERDICT (appended by the loop, 2026-07-12) — **CLEAN, 0 MAJOR**

3 disjoint read-only Opus auditors → 1 fix landed → a FRESH break-my-verdict
Opus re-reviewer = HOLDS/CLEAN.

| Auditor | Scope | Verdict |
|---|---|---|
| A | M6 CSS vs the demo (verbatim? specificity vs `.dt-frame` inside desktop.html) · desktop-anchors.js vs the demo recipe · sheet-content compatibility under the dialog presentation · lifecycle/transitions · money locks · a11y · mobile-leak sweep | **CLEAN** (3 NITs). Key proofs: anchored cascade is correct (transform stays `none` at (0,4/5,0) specificity; opacity rides the base `[data-open]`) · production selectors out-specify the demo's with identical values → the demo renders byte-identically · NO sheet content assumes bottom-sheet geometry · every new rule is `:root[data-desktop]`-scoped. |
| B | M7/M8 C# vs the #225/#247 machinery — reachability, tag-replace across page types, the full interaction matrix (chat-open race · Account pane · own back · hardware back · QR root-nav hand-off · narrow re-home · double-tap), the C# risk fence | **CLEAN, 2 MINOR**. Matrix all PASS (closeOverlay is synchronous w.r.t. overlayStack → no staging race; popPageAsync routes an overlay's own back to closeOverlay; hardware back reaches the pane with no save-audit needed; relayoutPinnedOverlays is tag/type-agnostic; the #230 lock guard precedes staging). |
| C | ★#221 · frozen bridge (zero new emissions, verb-by-verb) · #248 · NUL · zero strings · bundle FILES + preflight coverage · EVERY new smoke regex matched against the current files · doc consistency | **CLEAN**. |
| Re-review | The fix + fresh attacks (non-body hosts · scroll-lock interplay · stale-ctx anchor · popover overflow · narrow second-form reachability · smoke spot-check) | **HOLDS/CLEAN** (1 informational NIT). |

**Fix landed (B-MINOR-1, C# — 3 sites in HomePage.xaml.cs):** form pane ↔
chat-info pane now cross-close BIDIRECTIONALLY (`openContactDetails` →
`closeFormPaneOverlays()` after its toggle-close foreach; the newcontact/newapp
handlers → `closeContactDetailsOverlays()` before staging) — no col-1 stacking,
no resurfacing stale pane. Re-reviewer verified: toggle-close early-return
preserves the form; removePage is overlayStack-synchronous (no race with the
following pushPageLoaded); onNavigating-thread safe (pre-existing precedent);
forms are no-ops in onOverlayPresented/Closed so col-2 state can't corrupt.

**Accepted as dials / logged, NOT changed:**
- **B-MINOR-2:** AppNewPage → AppDetailsPage still presents full-window on wide
  (fetch/file paths, out of M7/M8 scope) → the add-app flow jumps pane→full at
  fetch. Cosmetic; pinning AppDetailsPage = a later dial (Damir).
- **B-NIT-1:** tapping a chat while a formpane is still STAGING drops the chat
  (preload guard) — the accepted double-tap-during-staging class.
- **Re-review NIT-1:** a right-click on a menu-less CALL row records a stale ctx
  that could anchor the next menu within 600ms (touchscreen-desktop long-press
  only, ~unreachable; home.html immune). Hardening noted, not built.
- **A-NITs:** redundant explicit padding-bottom (documented intent) · anchored
  dropdowns inherit max-height 76% + scroll (long menus scroll, correct) ·
  host-rect math assumes the body host (demo-parity).
- **B-NIT-2 (build hygiene, pre-existing):** the BUILT launch shells in
  Resources/Raw/html carry #255-class NUL debris — Damir's rebuild regenerates;
  per #255 do not commit stale built artifacts.

**Non-negotiables re-verified:** ★#221 HOLDS · frozen bridge (zero new verbs;
C# delta = pushPageLoaded args + a private close helper) · C# risk fence
(presentation-only routing; lock guard precedes staging) · #248 clean · no NUL
in sources · zero new strings · money untouched.
