# #46 loop verdict — sweep session #324–#327 (run 2026-08-10 overnight, cloud)

**Scope:** the whole 2026-08-10 sweep session — #324 (iOS-53 pin + slide + stick),
#325 (iOS-55 epoch timestamps + iOS-56 shell edge-swipe), #326 (iOS slide-out
close), #327 (chats header as list content) — over Damir's #325–#327 commit
snapshot (hash-verified). Protocol: full pipeline → 3 disjoint read-only
auditors → fixer → fresh break-my-verdict reviewer over the fixes → re-verify.
**Verdict: CLEAN after 2 rounds.** Full narrative: DECISIONS #328.

## Numbers

| Stage | Result |
|---|---|
| Baseline (pre-fix, full uncapped smoke) | 1006 pass / the same 4 pre-existers |
| Round 1 auditors | 2 MAJOR · 8 actionable MINOR · NITs |
| Round 2 reviewer (over the fixes) | 1 real catch (dead-code gate) + 4 pin catches |
| Final | **1029 pass / the same 4** · +23 pins (11 mutation-verified) · lint ✓ · pseudo 9/9 · NUL ✓ |

## MAJORs (both fixed)

1. **#326 slide left the stage tappable for 250ms** — op leaves `overlayStack`
   synchronously, so a double back-tap mid-slide fell through `popPageAsync`
   onto the native stack (the #272 pop-the-top class; NavigationProxy NRE risk).
   Fix: `InputTransparent = true` before `TranslateTo` (the park path's proven
   subtree-deadening mechanism).
2. **#324 stick loop: ~1.7s continuous pin + no user abort** — every settle-
   ladder pass re-armed 340ms (the pin keeps `nearBottom()` true), fighting user
   scrolls and yanking the @-mention FAB jump while the marker burned unseen.
   Fix: change-gated arming (`insetChanged`) + document-capture touchstart
   cancel + reduced-motion one-shot.

## MINORs fixed

Three missed W1-class timestamp surfaces (ContactDetails activity · Settings/
Downloads file ctimes → epoch + one component detect site) · `op.column < 0`
slide gate (split-view stages close instantly; narrow phone unaffected) ·
edge swipe now consumes the hand-rolled channel selector first
(`channelDropdown` probe) · text-selection drag guard · desktop chats-collapse
no longer inerts a mid-query search (`!searching` in the collapse branch) ·
demo chats.html mirrored to the shipped in-list header · epoch>0 guards on all
four detect sites · `syncHeaderPin` desktop-gated.

## Round-2 catches (all fixed)

The r1 axis gate `dx > dy*1.4` beside `dy < 50` was **dead code** (never
binding — its own cited 71/49 case still fired) → `dx > Math.max(70, dy*2)`.
Three decorative pins rebuilt condition-anchored (change-gate, collapse-branch,
arm-order — the last matched WillHide via the `…pinKeyboardScroll…` substring)
+ the ContactDetails C# half pinned.

## Logged, not fixed (dials / NITs)

- **Damir dial:** edge swipe goes dead while a text selection is active (iOS
  clears selections on tap, not drag — native edge-pop works during selection;
  our guard prioritizes never stealing a selection drag). Options: keep, or
  scope the guard to touches near the selection rects.
- #324 pin arms only on a keyboard frame EVENT (keyboard-already-up at page
  attach = thin unfixed edge) · iPad-multitasking return-memory stages back-
  close instantly · negative epoch (1601 ctime race) renders verbatim digits ·
  contact_details `stateSig` excludes epoch times from the rebuild signature
  (immutable today; add `t.timestamp` at the next touch) · s-vs-ms canon split
  (wallet 12-digit regex vs chats `<1e12` rule) · RTL left edge (no RTL locale
  ships) · composer @-mention picker not on the overlay stack.

## Invariants re-verified under attack

Lock can never take the slide path (modal ops live outside `overlayStack`) ·
park path untouched, no translated stage can reach reuse · double-close guard
airtight · KVO pin: no leak, no recursion, own-page-only, released on every
close path · ★#221 holds everywhere · Android adjustResize can never
double-compensate · hide-mask intact end-to-end on every new timestamp leg ·
kb-probe fully retired (source + built output).

## Morning protocol (Damir)

1. Open the Mac (bridge reconnects) — Claude lands the fix files onto disk.
2. `node scripts/build-demo-bundle.mjs` → `build-shells.mjs` → `smoke-test.mjs`
   (expect **1029 / the same 4**) — bundle BEFORE shells.
3. obj/bin wipe → device build (C# changed: SpixiContentPage + ContactDetails +
   SettingsPage + DownloadsPage) → grep the .app → run.
4. F5: double-tap back mid-slide (nothing falls through) · focus composer then
   immediately scroll up (no fight) · @-FAB tap right after focus (jump runs) ·
   edge swipe with the bot channel panel open (panel closes, chat stays) ·
   contact-details activity + downloads dates translated under Slovenščina ·
   desktop: type a search query, scroll — header stays.
5. Commit as ONE batch: "#328 loop fixes" (message in chat).

## Changed files (the fix batch)

`src/shells/chat.html` · `src/shells/home.html` · `src/shells/wallet_sent.html`
· `src/shells/contact_details.html` · `src/components/chats-header.js` ·
`src/components/settings-app.js` · `src/demo/chats.html` ·
`Spixi/Utils/SpixiContentPage.cs` · `Spixi/Pages/Contacts/ContactDetails.xaml.cs`
· `Spixi/Pages/Settings/SettingsPage.xaml.cs` ·
`Spixi/Pages/Downloads/DownloadsPage.xaml.cs` · `scripts/smoke-test.mjs` ·
`DECISIONS.md` (#328) · this report · + rebuilt bundle/shells (regenerate
locally, don't trust the cloud artifacts).
