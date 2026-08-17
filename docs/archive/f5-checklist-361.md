> ✅ **CONSUMED 2026-08-17.** Results: Android A1–A3/A5–A10 PASS (A10 provisional, timer-gated) · **A4 FAIL → N36b** (select-mode native tap-highlight flash, evidence in DECISIONS #363) · Windows W1–W7 PASS. Batch committed; N36b → the fix session.

# F5 checklist — the cheap batch (#361 + loop #362)

**Build first:** the batch changes C# (SingleChatPage · HomePage · AppDetailsPage).
Build `net10.0-windows` (plain build, NOT Rebuild). For the Android legs, wipe
`obj/bin` first (stale Raw html law, #320).

Every FE artifact is PRE-BUILT in the tarball (bundle · 22 shells · locales ·
icons). You do not need to run the generators. If you want the local
confirmation: `node scripts/smoke-test.mjs` → expect **BASELINE OK — 1757 / the
4 known pre-existers**.

## Commit hygiene (do this BEFORE the F5 if easier)

1. The tarball ADDS files git does not know yet. Stage them:
   `git add src/demo/images src/assets/icons/tabler-icon-layout-grid.svg docs/f5-checklist-361.md docs/handoff-2026-08-17c.md`
   (GitHub Desktop lists them as new — tick them.)
2. The batch DELETES 22 superseded SVGs (5.2 MB of unreferenced art). A tarball
   cannot delete — run this in PowerShell at the repo root, then stage the
   deletions:

   ```powershell
   $names = 'apps-es.svg','backup.svg','chats-es.svg','explore-banner.svg','wallet-es.svg'
   $onb   = 'backup.svg','restore.svg','step1.svg','step2.svg','step3.svg','step4.svg'
   foreach ($d in 'src\demo\images','Spixi\Resources\Raw\html\images') {
     foreach ($n in $names) { Remove-Item -Force "$d\$n" -ErrorAction SilentlyContinue }
     foreach ($n in $onb)   { Remove-Item -Force "$d\onboarding\$n" -ErrorAction SilentlyContinue }
   }
   ```

   KEEP: `contacts-es.svg` + `onboarding/join-community.svg` (no PNG exists).
3. ONE commit, message: `Cheap batch: N5 N22 N24 N32 N36 N38 N2a N3a N45+N14a (#361, loop #362)`.

## The checks

| # | Item | Do | Expect |
|---|---|---|---|
| 1 | N45 art | Launch a fresh look at: welcome carousel (4 slides) · restore screen · onboarding backup step · Account → Backup · apps tab empty state (or Explore banner) · chats/wallet empty states | The PAINTERLY PNG art everywhere, no blank boxes, no blurry upscale |
| 2 | N14a | Trigger the rating nudge (dev: `showRatingPrompt` push, or the 30-day path) | The rate-me illustration above the copy; brand disc gone |
| 3 | N5 | Account → Delete data on a NARROW window (drag ~400px) and on a phone | Sub lines WRAP (no "…"), cards never clip; drag the desktop divider wide then shrink the window — the danger cards stay whole |
| 4 | N22 | Open a private GROUP chat | "N members" under the group name (same count as Group info); no 1 Hz flicker of the sub-line |
| 5 | N24 | Desktop wide: apps tab → ⋮ → App details | The row tints (action tonal); press it — the sweep is visible (pressed tonal, not invisible); close the pane → tint clears; open details for another app → tint moves |
| 6 | N24 edge | Tap two app rows fast (second while the first pane still loads) | Highlight only ever matches the pane that actually OPENED |
| 7 | N32 | Wallet with a 0 balance (or hide → fresh account) | Hero reads `0.00` and `$0.00`, not `0` / `$0`. Non-zero balances unchanged |
| 8 | N36 | Chat: long-press → Select, then tap a payment/file card and a text bubble to select/deselect | ONLY the selected tint + check circle — no pressed flash anywhere; text selection on bubble text still works |
| 9 | N38 | Desktop: wallet → Receive; and Account address row | NO Share button on either (Copy remains); on Android/iOS Share is still there and opens the system sheet |
| 10 | N2a | Apps tab, toggle list⇄grid | The toggle shows a real 4-square GRID glyph (grid target) / hamburger (list target) — never the rocket. Eyeball the glyph weight vs its neighbours (derived from your apps.svg; swap with a Figma export at will) |
| 11 | N3a | Settings → Deutsch/Русский/Slovenščina, walk onboarding copy, backup nudge, About, apps empty state | No "—" anywhere in app copy; sentences read naturally (ru slide 2 + backup card were rewritten — eyeball those) |
| 12 | N3a desktop | Back out of every chat (welcome pane) in ru/sl/sr | The right-pane welcome text carries no "—" |

## Open legs this batch does NOT touch

D-19b + D-17b (the fix session) · legs 29–30 (compact-balance, flick-cancel) · N40.
