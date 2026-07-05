# Handoff (Fable) — post-merge state + next frontend batch

Session 2026-07-05 (F). Paste into the new chat. `DECISIONS.md` is the source of
truth. Boot ritual: read `CLAUDE.md` → `DECISIONS.md` (rows **#146–#154**) →
`docs/finalization-roadmap.md` → this file.

**The Mac↔PC reconciliation described in `handoff-fable-next-batch.md` §🏠 is
DONE.** The two histories are merged and verified. This brief tells you (1) what
the merge produced, (2) one bookkeeping cleanup to do first, (3) the next batch
to build.

---

## ✅ MERGE COMPLETE — what's now on `redesign/frontend`

The `account 2/2` line (settings-shell completion) and the `Contacts` line were
merged into a single 2-parent commit. Only the **generated bundle**
(`src/demo/spixi.iife.js`) truly conflicted; it was **regenerated from the
merged component sources** (not hand-merged), per the standing rule. The three
other overlapping files (`DECISIONS.md`, `scripts/build-demo-bundle.mjs`,
`scripts/smoke-test.mjs`) three-way-merged cleanly (both sides' additions kept).

**Verified after the merge:**

| Check | Result |
|---|---|
| `node scripts/build-demo-bundle.mjs` | clean — **196 exports**, syntax check passes |
| Bundle vs. committed blob | identical (rebuild is reproducible; tree stays clean) |
| `node scripts/smoke-test.mjs` | **GREEN** — 306 checks through the settings + prior sections, **contacts flow ALL PASS**, `smoke test CLEAN` |
| Working tree | clean (0 changes); line-ending noise from the cross-OS pull normalized |

Both feature areas are present and exercised at runtime against the merged
bundle:

- **Settings shell — COMPLETE.** Hub · identity/QR · theme tiles · language ·
  backup (+ password modal, scrub-on-close) · danger zone · chat-appearance ·
  privacy · notifications · security tiers · **downloads · developer/log ·
  contributors**. (`settings-shell.js`, `settings-backup.js`,
  `settings-screens.js`, `settings-app.js`.) Opus round CLEAN (#151); Slice 2
  CLEAN (#152–#153).
- **Contacts — COMPLETE.** FAB → contacts picker takeover · add-contact
  (address gate + debounced `checkAddress` ✓ + send request) · two-step group
  creation (multi-select → setup: avatar/name/member chips/blind toggle) ·
  directory + pending profile. (`contacts-shell.js`.) Opus audit loop CLEAN
  (#154).

---

## 🧹 DO FIRST — reconcile the duplicated DECISIONS rows

Because both branches appended to `DECISIONS.md`, the merge kept **both sides'
rows** (correct — that's the append/keep-both rule), which left **colliding row
numbers**: there are now two `#152`, two `#153`, plus `#154`. Nothing is lost;
the numbers just need to be made monotonic before the next append.

- The **settings-completion** rows: Slice-2 build + fix round (Downloads / Dev /
  Contributors) and the "park-the-batch, merge-later" bookkeeping row.
- The **contacts** rows: the batch build (#153) and its Opus audit loop (#154).

Renumber the settings-completion pair to sit before the contacts rows (or
whatever order Damir prefers), keeping every rationale line intact. Then append
a fresh **merge row**, e.g.:

> **#155 | 2026-07-05 | Mac (contacts) ↔ PC-origin (settings completion) MERGED
> on `redesign/frontend` (2-parent). Only real conflict = generated
> `spixi.iife.js` → regenerated from merged sources (196 exports); the other 3
> shared files [DECISIONS/build-bundle/smoke] 3-way-merged keep-both. Post-merge:
> build clean, `smoke-test.mjs` GREEN (settings + contacts flow), tree clean,
> cross-OS line-endings normalized. Duplicate #152/#153 rows from the keep-both
> merge renumbered. Merge-safety rule (#152, "don't touch settings-*.js") is now
> LIFTED — the merge it protected is done. | merge reconciliation | ✅ merged +
> verified**

---

## NEXT BATCH — Phase 1 #3: **Scan shell**

Per `finalization-roadmap.md` Phase 1, with Account/Settings (#1) and Contacts
(#2) both done, **Scan is next**. It is the natural dependency of the
add-contact "Scan" entry point you already stubbed (#153) and of
wallet-receive's QR-in symmetry.

### Scope (from the roadmap + legacy `Pages/Scan/ScanPage`)

- **Camera view** — mock camera in the demo (no real `html5-qrcode` in-sandbox);
  render the scan frame, torch toggle, and the cancel/back affordance.
- **States** — permission-prompt, permission-denied (honest recovery copy, no
  dead-end), scanning, decode-success. Wire the decoded payload out via the
  frozen bridge grammar (QR payloads are `ixian:`/`address:ixi` inventory —
  confirm exact verbs against `docs/audit/bridge-audit-A.md`).
- **Entry symmetry** — the add-contact Scan button (currently a nav stub) and
  wallet-receive's QR-out are the two ends; keep QR-in / QR-out consistent.

### Interview Damir FIRST on the unknowns
- Is Scan a full takeover screen, or a sheet off add-contact / wallet?
- Decode-success behavior: auto-fill the add-contact field and return, or
  confirm-in-place first?
- Torch + camera-flip affordances now, or defer to device testing?
- Permission-denied path: inline retry vs. deep-link to OS settings (what can
  the bridge actually trigger).

### Then Phase 1 tail (after Scan)
- **#4 Lock shell** — unlock · confirm-action · set-lock · change-encryption-
  password. Small but security-adjacent → the `SECURITY.md` checklist pass is
  mandatory; shells emit intent, C# `LockPage` is the real boundary.
- **#5 Launch / onboarding** — welcome (lang/theme/terms) · create · restore ·
  retry · onboarding tail. Brand-heavy; code-first structural draft, Damir
  art-directs in the demo. `illustrations-plan.md` + the backup onboarding tail
  fold in.

After Phase 1, Phase 2 is the cross-cutting sweep (desktop split-views, dark-mode
verification, a11y focus/SR pass, copy polish) and Phase 3 is integration
(`native.js` bridge adapter, i18n dictionaries, Vite → `Resources/Raw/html`, the
C# `loadPage` repoint table, device tests).

---

## Carried open 🟡 (still unresolved after the merge)

- **#151 RTL switch-knob** — `.c-settings__switch-knob` / `.c-chat-info__switch`
  use `translateX(20px)`, not direction-aware; the "on" knob slides the wrong
  way in RTL. Deferred to a whole-app RTL pass. Contacts' local switch shares
  the same token pair and caveat (#153).
- **#154 contacts backlog** — `setPickerMode`↔selection-preservation coupling ·
  per-keystroke re-sort (memoize) · dead `[data-blocked]`/`[data-pending]`
  datasets · action-label wrap on long locales · blind-disc `users` glyph
  overloaded 3 ways · demo `openPanel` has no focus-trap/restore. All logged,
  none blocking — Damir calls which to action.
- **Icon gaps** — `world` (language) + plain `lock` (stand-ins in place);
  `user-plus` (contacts, `user-circle` stand-in). Real glyph exports pending
  (Phase 2 B2 export pass).
- **§9 / §8 bridge asks** — accumulated across settings + contacts (backup
  timestamp · 1:1 mute · shared-media inventory · presence · group name/avatar
  edit · room-wide request · tip fee · share command · self-destruct window ·
  nickname lookup · roster `addContact` pending flag · `':|'` C#-side sanitize ·
  path-traversal on `ixian:open/delete` · send-log verb). These belong in the
  **ARCHITECTURE §9 sync table** (Phase 3 item 1) for the BE review — never new
  `ixian:` commands.

---

## Working agreements

Code-first per surface: **spec (interview Damir on the unknowns) → build on the
mock bridge + smoke assertions → `node scripts/build-demo-bundle.mjs` then
`node scripts/smoke-test.mjs` → Damir demo pass → `DECISIONS.md` row → commit.**
Bridge is frozen; new needs become §8/§9 proposals in `ARCHITECTURE.md`.

**Environment gotcha (persists across sessions):** an agent sandbox mounted over
this repo can serve **stale/truncated reads** of recently written files, and a
careless write to `.git` can corrupt the index. Trust the real-terminal /
file-tool view over `wc -l` in a sandbox; verify the bundle tail after any
rebuild; run build + smoke where the files are known-good. On a machine where the
sandbox mirror is verified fresh, in-session build+smoke is fine (Mac, #153);
otherwise keep it to Damir's local run.
