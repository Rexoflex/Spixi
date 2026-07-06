# Handoff → fable: finalize the Launch premium round (Phase 1 #5)

Opus has run the #46 adversarial audit loop over the launch premium round (DECISIONS
**#165**) and it is **CLEAN**. Damir ran `build-demo-bundle` + `smoke-test` on the PC =
GREEN. What remains is **non-adversarial finalization** — that's your part. Do NOT
re-run the audit loop (Damir standing order: adversarial review = Opus, not fable).

## What shipped this round (context)

The whole launch flow is now one continuous fixed-dark `--gradient-launch` brand
surface (welcome → create → restore → retry → tail), forms use glass inputs. Restore
got a premium hero; the tail + restore use the shipped legacy art. `--gradient-lock`
was converged onto the launch aurora. `ENC_MIN` is 10 (BE minimum). Terms + Privacy
open **in-app** in one `openDocSheet` renderer (mini-markup + https linkifier + ✕
close). **Consent moved off welcome onto the create+restore forms**, above the commit
button, and `ixian:accept` fires at the binding action (`emitAccept`, latched), not
the welcome tap. Create form is two labelled groups; its CTA is "Create my account".
Full detail: DECISIONS **#165**.

## Your finalize tasks (all mechanical — no logic/audit)

### 1. Drop in the real illustrations (when the art is ready)
Prompts to generate them: **`docs/onboarding-illustration-prompts.md`** (6 images,
tuned to the dark aurora palette). Swap points, all already wired with `onerror`
hide fallbacks and decorative `alt=""`:
- Carousel slides 1–4 → `src/demo/images/onboarding/step1.svg … step4.svg` (currently
  the shipped legacy tour art).
- Restore hero → `src/demo/images/onboarding/restore.svg` (currently legacy
  `restore-1.svg`).
- Tail join step → `src/demo/images/onboarding/join-community.svg` (currently legacy).
- Backup nudge → the ONE remaining placeholder: inline `ILLOS.backup` SVG in
  `launch-shell.js` (`data-placeholder="true"`; smoke guard expects exactly one such
  slot — if you replace it with a file `<img>`, update that guard).
Keep filenames identical to avoid touching the wiring; if PNG, keep them transparent
so they composit on the gradient.

### 2. i18n / localization (launch-spec §6⑦)
The Terms/Privacy/consent copy currently lives as demo strings in
`src/demo/launch.html` + component defaults. Ship via the SL channel. Strings to
localize (all read from `strings.*` with English fallbacks in `launch-shell.js`):
`termsTitle` · `termsBody` · `privacyTitle` · `privacyBody` · `createConsent` ·
`restoreConsent` · `finePrintAck` · `termsLink` · `privacyLink` · `close` ·
`passwordHint` · `createProfileLabel` · `createPasswordLabel` · `createWarnTitle` ·
`createWarnBody` · `restoreHeroTitle` · `restoreHeroCopy` · `slide1Title…slide4Copy` ·
`createSubmit` ("Create my account") · `restoreSubmit`.
The `openDocSheet` mini-markup is localization-safe: `# ` heading, `- ` list item,
blank line = separator, `[label](https://…)` = link. Keep those markers when
translating; the text between them is free.

### 3. launch-spec.md alignment (spec↔code drift — per DECISIONS #165)
Update these sections so the spec matches the code:
- **§0②** — brand gradient is no longer "welcome-only"; the WHOLE shell is pinned dark
  on one continuous `--gradient-launch` (glass inputs, transparent topbar).
- **§2.1 / consent** — consent is NOT fine print on welcome; it sits on the
  create+restore forms above the commit button, and `ixian:accept` fires at the
  create/restore commit (`emitAccept`, one-shot latch), not on the welcome tap.
- **§6①** — ENC_MIN RESOLVED to 10 (BE minimum).
- **§6⑧** — `--gradient-lock` RESOLVED: converged onto the launch aurora (~8–10%
  quieter colour layers).
- **§7 / terms** — encryption clause now reflects the real hybrid PQ crypto
  (RSA-4096 + ECDH secp521r1 + ML-KEM-1024/CRYSTALS-Kyber = FIPS 203 handshake;
  AES-256-GCM + ChaCha20-Poly1305 messages), per docs.ixian.io.

## Hard constraints (unchanged)
- **Bridge FROZEN** — launch emits ONLY the audited verb set. No new verbs. Missing
  capability = §8/§9 proposal.
- **Don't touch `settings-*.js` / `lock-shell.js`** beyond what's already landed
  (the ONLY lock-shell change this round was `ENC_MIN` 8→10).
- The `openDocSheet` renderer is textContent + https-only anchors — keep it that way
  (never `innerHTML`, never route user input through it).

## ⚠ Commit + environment notes
- **Commit from GitHub Desktop, not a sandbox.** The session sandbox's git index is
  corrupted by a flaky mount — it shows phantom *staged deletions* of `tokens.css` and
  a dozen CSS files. A sandbox `git commit` would delete them. GitHub Desktop reads the
  real `.git` correctly; the true diff is just the files listed below.
- Also delete the stray `src/components/.fuse_hidden…` FUSE artifact if it appears.

## Files changed this round (eyeball in GitHub Desktop)
`src/components/launch-shell.js` · `src/components/lock-shell.js` (ENC_MIN only) ·
`src/styles/components/launch-shell.css` · `src/styles/tokens.css` (--gradient-lock
only) · `src/demo/launch.html` · `scripts/smoke-test.mjs` · **new:**
`src/demo/images/onboarding/join-community.svg`, `.../restore.svg`,
`docs/onboarding-illustration-prompts.md`, `docs/handoff-fable-launch-premium.md` ·
regenerate `src/demo/spixi.iife.js`.

## Parked (logged, not fixed)
- Backup nudge illustration still a placeholder (see task 1).
- Terms have no explicit minimum-age clause; the Privacy Policy has an under-16 clause
  — flagged to Damir/counsel, not changed.
- Consent pattern is a "sign-in wrap" (no checkbox) — Damir/counsel confirmed direction;
  if maximum defensibility is wanted later, add a one-tap "Agree & Continue" gate.
