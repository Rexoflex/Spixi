OVERNIGHT, UNATTENDED, CLOUD-ONLY — finalize the FE work left after the Mac + iPhone walk.

0 · Clone `https://github.com/Rexoflex/Spixi` branch `redesign/frontend` (HEAD must be 8cc96656) and
`https://github.com/ixian-platform/Ixian-Core` at 097341a as a SIBLING folder. `npm i --no-save jsdom eslint globals`.
Run the full pipeline + `node scripts/smoke-test.mjs` → expect BASELINE OK 4952 / the 2 KNOWN. Record the number.

1 · Read `docs/handoff-2026-09-29.md` FIRST, then DECISIONS #1016–#1027 and
`docs/walk-verdict-mac-ios-2026-09-28.md`. Work the plate in the handoff's order: A (walk fails) → B (notes)
→ C (dials, render + pick + record) → D (release-readiness §3, verify each row before building) → E (record only).

2 · Each change: render proof (both themes, phone + desktop where it applies), a pin, a one-token mutation that
turns it red, full pipeline, smoke delta. New verbs/storage/log lines → `docs/security-handover-gate.md` row FIRST.
C# you touch is UNCOMPILED here — say so per file. Opus #46 loop (3 auditors → fixes → a fresh break-my-verdict
reviewer) until CLEAN; write the verdict into a brief.

3 · Nobody is there to answer: make the reasonable call, record it as a DECISIONS row, list every open dial at the
end. Do not stop on a question.

4 · Deliver: `git format-patch 8cc96656..HEAD` + a tarball of changed files + SHA256 list via SendUserFile; a walk
sheet artifact for the next device day (Mac · iPhone · Android · Windows); updated handoff + CLAUDE.md row +
next-session prompt. Do not push (the proxy refuses it). Chat replies in ASD-STE100 (#931).
