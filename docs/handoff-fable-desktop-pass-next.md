# Handoff → next fable BUILD session (post-#246, desktop-pass remaining sweep)

> Paste the block below as the fable session prompt. Context: DESKTOP PASS 2 (#240–#245b)
> is committed (`18ddba2b`); the Opus #46 review (#246) PASSED with 1 shell fix landed +
> follow-ups logged. This session builds the REMAINING desktop-pass units. §5c: **fable
> BUILDS ONLY** — no smoke/bundle/shell runs; end with Damir's exact local commands;
> adversarial review is a SEPARATE Opus session; Damir F5s + commits.

---

You are fable, the BUILD agent for the Spixi frontend redesign. Read in this order before
touching anything: `docs/fable-build-brief-desktop-pass.md` (your standing work order — §0
directives, §3 units, §4 gates, §5 command list) → `docs/handoff-fable-desktop-pass-next.md`
(this file) → DECISIONS **#240–#246** → `docs/desktop-split-spec.md` → `CLAUDE.md` ground
rules (★ chat isolation, C#-touches-no-risky-parts, #232 directives).

## Where things stand
- **#240–#245b COMMITTED** (`18ddba2b`): Account = peer pane + sublevels, native pane
  divider (D1), S14 apply / S15 backup, #241/#244 semantic color rework. Units 1 (rail),
  2 (Account-as-pane), 3 (Account entries) and D1 are DONE.
- **#246 = Opus #46 review of that batch → PASS, 0 MAJOR.** One mechanical fix landed:
  `src/shells/settings.html loadAvatar` else-branch now clears `avatarPickPending`
  (canceled-pick stale-latch was false-marking a later reload push dirty). Shell-only.
  Lock un-dismissability with `stageMargin`, save-if-dirty close-audit, chat isolation,
  mobile-sheet byte-identical, accent-not-flipped all verified holding.
- **This tree is UNCOMMITTED beyond `18ddba2b`** = the #246 delta (settings.html avatar
  fix + doc updates). Damir commits it (title/description in the #246 chat). Build on top.

## Your build target this session: the remaining desktop-pass sweep
Spec row FIRST in `desktop-split-spec.md`, then build, then self-review (pre-filter, not
the gate), then an Opus-brief entry, then Damir F5. Build in this order:

1. **UNIT 6 — chat-info as an integrated desktop PANE (small C#, non-risky; the next unit).**
   A separate shell/WebView BESIDE the open conversation (the "separate but integrated"
   ask), NOT the mobile takeover. ★ isolation (#221): its OWN WebView; selection/refresh
   via C# verbs only (`ixian:details` today — A5's ContactDetails-repoint findings apply,
   see be-cutover). Narrow windows keep the mobile takeover. Reuse the #225 column-host
   machinery (same as Account-as-pane unit 2). Files: a chat-info shell entry in
   `build-shells.mjs` + `HomePage.xaml.cs` pane host + the chat-info shell. Verify in
   self-review: no JS bridge between the conversation pane and the info pane; the
   SettingsPage/lock invariants aren't disturbed; back/close audit.
2. **#225-M2 — resize across the pane breakpoint strands an open overlay** (accepted-known
   through #245). Fold the structural fix into this pass (resize-narrow should exit or
   re-home the pinned pane cleanly, not leave it invisible-but-open).

## GATES — do not violate (#232 / fable brief §4)
- **reply-to (unit 4) = BE-VERIFY-FIRST.** BE says no C#, but the app tree has ZERO reply
  plumbing — get the BE engineer to NAME the carrier + F5 a round-trip/persist on TWO
  devices BEFORE building (#215/C8-revert lesson). FE is built + cap-gated. Do NOT build on
  assumption this session.
- **#234 resume-lock Cancel bypass = human-BE-review-blocked** (security surface). Not this
  session unless Damir/BE sign off.
- **Wallet-SEND lands LAST of everything.** `composeSend` stays gated OFF.
- **Any security-flagged item → human BE review before build**, not just a log.
- **★ Chat isolation:** every pane = its own WebView; cross-pane coordination via C# verbs
  only; `src/demo/desktop.html` is art-direction, not architecture.

## NOT your build items (Damir/BE follow-ups from #246 — leave unless Damir asks)
- 🟡 Solid info badge white-on-`--surface-info` ≈3.96:1 <AA (`badge.css:25`, sole consumer)
  — Damir's reserved color dial (repoint `--surface-info → info-600`, or badge-only).
- 🟡 Sent-bubble read/delivered ticks <3:1 on the vivid re-anchored green — Damir F5 eyeball.
- 🟡 Warning-surface hue NIT · Figma mirror of #241/#244 primitives + link tokens · the
  accent-flip decision (#244 open).
- 🟡 Resume-lock STAGING input-freeze on a non-Grid legacy host (pre-existing, ≤1.2s
  input-only) — security-flagged, BE-gated (security-review-for-be-engineer.md MINOR).
- 🟡 3 gated-OFF nav rows (changePassword/security/privacy) lack `key:` — add when those
  caps light up (adding now forces a bundle rebuild for zero prod value).

## Environment (#175)
PC mount serves STALE/truncated file contents to bash/node/grep — treat the Read/Edit/Write
file tools as source of truth; verify inline `node --check` + the strict inliner, never the
mount. Do NOT run the build/smoke commands (§5c); hand Damir the exact subset per touched
files at the end.

## End of batch
List Damir's exact local commands per §5:
- Component/JS changed → `node scripts/build-demo-bundle.mjs` → `node scripts/build-shells.mjs`
  → `node scripts/smoke-test.mjs`
- Shell/CSS only → `node scripts/build-shells.mjs` → `node scripts/smoke-test.mjs`
- Then build **net10.0-windows** (NOT Rebuild Solution) → F5 → commit. Then queue the Opus
  adversarial session over a fresh review brief.
