# Handoff — Slice 2 built (Downloads · Dev log · Contributors) + 2 fixes (2026-07-05)

For the next conversation. Read `CLAUDE.md`, then `DECISIONS.md` **#152 + #153**, then this.

## Status: slice 2 BUILT + #153 fix round, awaiting re-verify → Opus round

#153 (Damir's first smoke run): the one red was the innerHTML guard matching
its own doc comment — tightened to `\.innerHTML`, code was clean. Plus a NEW
**"Send log"** button beside Copy log (§9-gated `onSendLog`, wallet-export
grammar; command proposal = spec §9b ask ⑦, OS email share w/ attachment →
info@ixian.io suggested).

Interview-locked (Damir, this session): Downloads = open + per-file delete +
clear-all + search · Dev = log viewer + copy (bridge has only `setLog`) ·
Contributors = static legacy-12 port. Spec = `settings-shell-spec.md` **§9b**.

### What changed (eyeball in GitHub Desktop)
- **NEW** `src/components/settings-app.js` + `src/styles/components/settings-app.css`
  — `createSettingsDownloads`/`setDownloads` (wholesale `clearFiles`+`addFile`
  mirror), `createSettingsDev`/`setDevLog` (idempotent — legacy double-push),
  `createSettingsContributors`/`CONTRIBUTORS`. Names/log = textContent ONLY
  (legacy innerHTML concat NOT ported).
- `settings-shell.js` — **`settingsConfirm` exported** (the #135-C1/#150⑥
  locked confirm lives once); danger's confirmAction = 1-line wrapper (net
  deletion). No behavior change.
- `settings-backup.css` — **fix ①**: dark-mode `::-ms-reveal` invert (the
  show-password eye is the WebView2 NATIVE control; it ignored our tokens).
- `wallet-send.js`/`wallet-send.css` — **fix ②**: Send-MAX confirm wears the
  #150⑥ strip, ADAPTED text "Payments cannot be undone." (Damir picked
  adapted over verbatim — the fill is editable, the payment isn't).
- `src/demo/settings.html` — hub rows live (8 mock files incl. ellipsize +
  XSS-shaped names, mock log push); links settings-app.css + search-field.css.
- `scripts/build-demo-bundle.mjs` — settings-app.js registered (after
  settings-shell.js — it imports settingsConfirm).
- `scripts/smoke-test.mjs` — **+27 assertions** (functional + static, incl.
  both fixes; XSS guards; #141-m4 sync-throw on delete AND send-log; send
  latch/morph/§9-gating; innerHTML guard fixed per #153).

### Verify (Damir, PowerShell, Spixi subfolder, no `&&`)
```
node scripts/build-demo-bundle.mjs
node scripts/smoke-test.mjs
```
Expect ALL green. Then demo pass on `src/demo/settings.html` (Downloads /
Developer — incl. Send log — / Contributors rows) + wallet demo Max dialog +
backup password eye in dark.

### Then: OPUS ROUND over slice 2 (standing order)
Damir's rule: adversarial audit = **Opus**, not fable. Scope: settings-app.js/
.css, the settingsConfirm export refactor, wallet-send Max strip, the +23
smoke block. Slice 1 (#146–#151) is already CLEAN + verified — don't re-churn.

### Open items (carried)
- 🟡 RTL switch-knob travel (#151) — whole-app RTL pass later.
- §9 asks grew (spec §9b ⑤⑥): open/delete path sanitization C#-side · ISO
  ctime. Fold into the Phase 3 table.
- No mono font token — dev log uses a raw ui-monospace stack (flag at DS pass).
- Warn-strip promotion to a shared atom if a third surface adopts it (#152).

## Next slice after the Opus round (roadmap order)
**Contacts** (add-contact + profile — profile EXISTS via `createChatInfo`
`context:'contact'`; bridge inventory in `docs/audit/bridge-audit-A.md`) →
Scan → Lock (SECURITY.md checklist mandatory) → Launch/onboarding.
Interview Damir first on add-contact unknowns.

## Working agreements (unchanged, #142)
Code-first: spec (interview) → build on mock bridge + smoke → Damir runs
build+smoke → demo pass → DECISIONS row → commit. **No sandbox builds** (mount
truncates); file tools only for source.
