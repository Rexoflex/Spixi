# Handoff → Opus: Phase 3 items 1+2 DONE (§9 sync table · native bridge). Next = items 3–6, then Phase 4 freeze.

> **Damir first:** this session's work is verified (your smoke run = ALL CLEAN
> after the #173b guard fix). **Commit via GitHub Desktop** — suggested as two
> commits: "Phase 3: §9 BE sync table" (#172: ARCHITECTURE.md + DECISIONS row)
> and "Phase 3: native bridge adapter" (#173/#173b: src/bridge/* +
> lock-shell ENC_DELIM export + build-demo-bundle + smoke-test + spec +
> DECISIONS + CLAUDE.md + regenerated spixi.iife.js). Then a fresh Opus chat
> starts from this file.

Boot ritual: `CLAUDE.md` → `DECISIONS.md` tail rows (**#172, #173/#173b**) →
this file → `docs/native-bridge-spec.md` → `finalization-roadmap.md` Phase 3.

## What this session did

- **#172 — Phase 3 item 1.** ARCHITECTURE **§9.5 rewritten into the ONE
  BE-review table**: 50 rows (Chat/Wallet/Apps/Settings/Contacts/Scan/Lock/
  Launch), Kind legend (signal · data · confirm · config · guard), consolidates
  DECISIONS #120–#171 on top of the audited #119 sync; #42 muted-badge ask
  restored (was lost in the #119 rewrite). **§8 gained 5 fully-specified
  proposal rows** (ixian:sendlog · Share app · OS share sheet · settings
  preference family incl. security tiers + confirm-payments · addApp
  publisher); footer cross-ref updated. Adversarial completeness/ref review
  CLEAN. **Open: Damir schedules the BE review of §8+§9.5.**
- **#173 — Phase 3 item 2.** **`src/bridge/` created** (it never existed — the
  demos' inline mocks were the de-facto contract): `native.js` transport core
  (raw `ixian:` emit w/ fail-loud prefix guard · `executeUiCommand` dispatcher
  w/ 3 deliberate legacy divergences: no escapeParameter, no alert, no
  ixian:ready dual-emit · latched `ixian:onload` · `SPIXI_ENV.capabilities`
  handshake, absent = OFF) + **scan** adapter (injectable camera provider over
  vendored html5-qrcode; terminal decode/cancel latch — closes #162 [S1]) +
  **lock/encpass** adapters (leading-delimiter changepass — audit-B:128 +
  settings_encryption.html:110 are the truth, ARCHITECTURE §3's condensed line
  omits it; 1600ms encpass no-callback mirror; inert `unlockFailed`/
  `changePassFailed` §9 pre-wires). `ENC_DELIM` exported from lock-shell (one
  truth). Bundle FILES +3 · smoke +~35 · spec `docs/native-bridge-spec.md`.
  Fresh-eyes adversarial review = CLEAN (6 sections).
- **#173b.** Damir's smoke run went red on the new static guards — they
  matched native.js's OWN DOCBLOCK (the #153① lesson repeated: the header
  documents the banned words). Guards now comment-strip first; re-run = ALL
  CLEAN (Damir-confirmed, authoritative).

## Interview picks on record (don't re-ask)

Scope = core + scan & lock reference adapters · **scan = FIRST C# repoint
target** · smoke rides the main suite · shared `mock.js` extraction DEFERRED
(spec §9③) · #171 honesty flags resolved earlier the same day (no copy
changes; "PIN or biometrics" deferred until tiers land).

## Next work (roadmap Phase 3, in order)

3. **i18n goes live** — per-shell `window.SL` token block (ARCHITECTURE §7 —
   no C# changes; `getStrings`/`setStrings` instant switch stays §8-gated).
   The 607-key dict + 7 locales are READY (#166–#169); remaining from #166:
   wire the provider swap + `strings.iife.js` tag into the non-desktop demos
   (one-liner each). Adapters already read `window.SL` (native-bridge-spec §6⑤).
4. **Vite build** → `Spixi/Resources/Raw/html`; per-shell double-check against
   the ARCHITECTURE §5 absorbed-page command inventories. Bridge files are
   plain ESM — Vite consumes them directly; the demo bundle stays the smoke
   vehicle.
5. **C# repoint mapping table** (BE executes): one `loadPage` line per page
   class, **scan first**, then lock (+ `SPIXI_ENV.biometrics` custom string,
   spec §6③). Deliverable = table, not C# edits (frozen bridge).
6. **Device tests** — `maui-integration-test-plan.md` +
   `android-test-quickstart.md` (Round 1 already passed on Android, #121).
   Then **Phase 4**: full-app #46 freeze audit → smoke count locked →
   DECISIONS freeze row → BE handoff doc.

Parked/flags to carry: native-bridge-spec §9 ①–③ · §9.5 BE review scheduling ·
[L1]/[L2 done]/[S1 closed] ledger in #162/#173 · desktop launch composition
(desktop-split-spec ⑮) · **illustrations UNPARKED (#174): 3D glossy set adopted
(supersedes #130 flat-2D); backup.svg approved; step1–4/restore/join-community
exports were TRUNCATED — Damir re-exports, hardened smoke guard verifies; then
flip the launch backup slot off `data-placeholder` + update the one-placeholder
assertion; light-theme pass on non-dark-pinned assets.**

## Workflow constraints (hard-won — respect them)

- **Bridge FROZEN.** New needs = §8/§9 rows in ARCHITECTURE.md, never new verbs.
- **PC sandbox is hostile (#142/#165/#173):** the mount serves STALE copies of
  session-edited files and CORRUPTED reads of large files (icons.iife.js came
  back truncated this session). Trust the FILE TOOLS for truth; `node --check`
  small new files only; **Damir runs `node scripts/build-demo-bundle.mjs` then
  `node scripts/smoke-test.mjs` locally** (PowerShell, `Spixi` subfolder, no
  `&&`). Mac sessions may build in-sandbox (#155 note).
- **Commit via GitHub Desktop only** — sandbox git showed phantom staged
  deletions (#165); never commit from the sandbox.
- **Static smoke guards must be comment-exempt** (#153①/#173b — twice now).
- Every decision → a DECISIONS.md row; interview Damir on unknowns before
  building; #46 adversarial loop per batch (read-only agents, file-tools-only,
  findings with file:line).

## Key files this session

`ARCHITECTURE.md` (§8 +5 rows, §9.5 rewrite) · `src/bridge/{native,scan-page,lock-page}.js` ·
`src/components/lock-shell.js` (ENC_DELIM export) · `scripts/build-demo-bundle.mjs` ·
`scripts/smoke-test.mjs` (+~35, #173b guard fix) · `docs/native-bridge-spec.md` ·
`DECISIONS.md` #172–#173b · `CLAUDE.md` status.
