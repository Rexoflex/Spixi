# Opus #46 loop — overnight batch #1028–#1037 (verdict)

Scope: every commit `26889f1c..HEAD` (the 2026-09-29 overnight plate, handoff `docs/handoff-2026-09-29.md`).
Protocol: 3 disjoint read-only auditors → verify against the tree → fixes → a FRESH break-my-verdict reviewer per round, until CLEAN.

## Verdict: **CLEAN at round 5.**

| Round | Reader | MAJOR | MINOR | NIT | Row |
|---|---|---|---|---|---|
| r1 | 3 auditors (A: copy verb + bridge · B: ticks + file card · C: CSS / tokens / Mac chrome) | 2 | 7 | several | #1035 |
| r2 | fresh break-my-verdict over #1035 | 1 (conditional) | 4 | 3 | #1036 |
| r3 | fresh reader over #1036 | 0 | 2 | 3 | #1037 |
| r4 | fresh reader over #1037 | 0 | 1 | 2 | #1038 |
| r5 | fresh reader over the r4 fix | 0 | 0 | 1 (comment, applied) | #1038 |

## The MAJORs

1. **r1-A — the native copy verb was a gesture-less clipboard write on iOS/Mac.** C# cannot see a tap. Bounded: refused unless the app is in the foreground; one accepted write per 750 ms process-wide; mini-apps refused as the first statement. Residual filed for the BE engineer (`docs/security-review-for-be-engineer.md`, NATIVE COPY).
2. **r1-C — #1030 made the dark sheet the same tone as the dark hairline, input, row-hover and settings-card tokens** (1.00:1 dividers, inputs, chips). New `-sheet` tokens remapped inside `.c-sheet, .c-modal`, plus a DERIVED pin: every dark token equal to the sheet ground is remapped or allow-listed with a reason.
3. **r2 (conditional on a Mac window inset > 0)** — the call page got the window inset pushed, `call.html`'s bar grew, the native strip did not → the hang-up row would clip. The strip now grows on `IOS || MACCATALYST`.

## Mutations

87 one-token mutations across the rounds (`#1028` 17 · `P.13/P.22` 17 · `#1029/#1030` 7 · `#1031/#1032` 8 · r1 fixes 23 · r2 9 · r3 4 · r4 2). Survivors: 5 in total, each turned into a stronger pin, a narrowed pin, or a withdrawn clause (the RTL arrow clause: 2 dots cannot distinguish direction). Zero survivors at close.

## Recorded, not fixed (dials / residuals)

- A timed-out copy's late native write can still land (edge).
- A pushed Mac inset stays until the next chrome pass (full-screen toggle).
- Mention picker and channel selector keep the 700 menu surface; the message dropdown is 800 (dial).
- The code tile's hover drops its label under 4.5:1 while hovered.
- Pressed action text on the dark in-sheet pressed fill reads 4.43:1 (transient; hover 5.21).
- ContactNewPage `[M5]` HasStrings probe reads clipboard PRESENCE — retire at the freeze.
- `recordCopied` has no slot generation counter (no wrong-"1" path found).
- Multi-window (future): the call strip should read the stage's own window.

## Final numbers

Suite (container, Core sibling @097341a): **BASELINE OK — 4968 / the 2 KNOWN** (#136 · B3), **+16 vs 4952**. `cs-syntax-check` 186 clean + 3 known skips. `build-shells --check` ✓ · `extract-strings --check` ✓ · i18n-lint ✓ · pseudo 9/9 · verify-locales ALL CLEAN.

⚠ **C# UNCOMPILED here:** `Spixi/Utils/SpixiContentPage.cs` · `Spixi/Pages/Home/HomePage.xaml.cs` · `Spixi/Pages/Chat/SingleChatPage.xaml.cs` · `Spixi/Pages/Call/CallPage.xaml.cs`. The first compile is Damir's F5 (Windows) / Android / Mac / iPhone build.
