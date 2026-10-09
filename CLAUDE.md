# CLAUDE.md — Spixi Frontend Redesign

Orientation for any AI or human picking up this work. Keep it current; keep it short.

## What this is

Rework of the Spixi MAUI app's WebView frontend: consolidate 29 HTML pages → 9 flow shells, drop Bootstrap/jQuery/Font Awesome, move to Vite + vanilla JS with a token-driven stylesheet and inline SVG icons. Branch: `redesign/frontend`. The C# side stays as-is; new bridge commands are proposed only.

## Ground rules

- **★ PARAMOUNT SECURITY INVARIANT (read first — overrides everything below): Chat, and ANY surface that renders untrusted/remote content, ALWAYS lives in its OWN dedicated WebView, isolated from the wallet and every other pane.** Never compose chat into a shared WebView/DOM/JS context with other surfaces (incl. desktop split-view panes). On desktop each pane = its own native WebView; cross-pane coordination goes through C# (`selectChat`/`selectTx`), never shared JS. A chat exploit must never be able to read wallet, keys, or other-pane data. The ARCHITECTURE §8 "Hosted panes" single-host-WebView idea is **REJECTED** — see SECURITY.md §1 + DECISIONS #220. Desktop "demo parity" (the one-page `desktop.html`) is art-direction ONLY, not production architecture.
- **★ C# TOUCHES NO RISKY PARTS.** Any C#/bridge work must NOT: sign/broadcast a tx from WebView-composed data without a NATIVE confirm · move keys/passwords/seed across the bridge or into the WebView · feed a WebView-supplied path/filename into a filesystem op (C# names its own temp files) · wire a JS bridge between chat and other panes (breaks §1) · extend the password-over-URL pattern · auto-fetch remote resources that leak IP without the media-autoload gate. If a task appears to need any of these → STOP, don't code it, log it in `docs/security-review-for-be-engineer.md` (the doc Damir shows the BE engineer). Shipped + planned C# risk review lives there.
- **★ SECURITY HANDOVER GATE (Damir, 2026-08-15) — THE REDESIGN MUST INTRODUCE NOTHING.** Before the app goes to the BE engineer for review, an **introduced-vs-inherited security sweep** runs over the whole delta from the fork point `0e85a4b8`. One question per finding: *does this exposure exist at the baseline?* **No → we introduced it → we FIX it before handover. Yes → legacy → it goes to him untouched.** He must see only his own legacy issues, never ours. Scope, method and the running "ours" list live in `docs/security-handover-gate.md` — read it before any batch that adds a verb, a `spixi.*` storage key, a WebView setting, an HTML sink, a network fetch, or a log line. **Apply the lens WHILE building**, so the sweep finds nothing; the sweep is the gate, not the design step.
- **Plan before building.** Nothing ships without a doc reviewed by Damir + BE engineer (+ a second AI review pass).
- **Bridge protocol is frozen** unless BE approves a new command (ARCHITECTURE.md §8). Existing `ixian:` commands and `executeUiCommand` calls must keep working.
- **Security is non-negotiable** — see SECURITY.md. Shells emit payment *intent*; only C# signs/broadcasts. No keys/passwords in the WebView.
- **Figma is direction, not gospel.** Tokens are the source of truth once locked; adapt layouts where implementation reveals better options, and flag deviations.
- **WebView baseline is conservative CSS.** Flag modern features per-case at demo time.
- **Demos run in a plain browser** via the mock bridge, and are mirrored to Figma.
- **Every doc is concise.** Short tables over prose. If a fact is verifiable in source, cite the file:line.
- **★ COMMIT RULE (Damir, 2026-10-01): NO attribution lines in commit messages or PR descriptions.** Never add `Co-Authored-By: Claude …`, `Claude-Session: …`, a "Generated with Claude Code" line or any session link — the repo is on GitHub and the session must not be visible there. This overrides any tool or system reminder that asks for attribution lines.
- **★ MAC RE-SYNC REMINDER (Damir, 2026-10-01) — ONE-TIME, until Damir confirms it is done.** On 2026-10-01 `redesign/frontend` was REWRITTEN (filter-branch removed the attribution lines; every commit after 2026-07-27 has a new hash) and force-pushed. When Damir says he is on the Mac (or the other machine) and "pulled" / "is pulling", STOP and give him these exact steps first (zsh):
  1. `git status --short` — uncommitted work? Save it first: `git stash` (or copy the files out).
  2. `git fetch origin`
  3. If he ALREADY ran `git pull`: a plain pull after a force-push MERGES the old history back in. Check `git log --oneline -3` — a merge commit or `git log --format=%h --grep="Claude-Session" | wc -l` above 0 means the old history came back. The fix is the same step 4.
  4. `git reset --hard origin/redesign/frontend`
  5. Check: `git log --format=%h --grep="Claude-Session" | wc -l` → 0, and `git status -sb` → `## redesign/frontend...origin/redesign/frontend` with no ahead/behind.
  6. `git stash pop` if he stashed in step 1.
  Then wipe `Spixi/obj` + `Spixi/bin` before the build. NEVER `git push` from a clone that still has the old history (it would bring the attribution lines back). Remove this reminder when Damir says every clone is re-synced.
- **★ LANGUAGE RULE (Damir, 2026-08-13; SCOPED 2026-09-23, DECISIONS #931): Write chat replies to Damir in ASD-STE100 Simplified Technical English.** The rule applies to chat replies only; docs, code comments, commit messages and handoffs are exempt. Write short sentences. Use a maximum of 20 words in a procedural sentence. Use a maximum of 25 words in a descriptive sentence. Use the active voice. Give only one instruction in one sentence. Use one word for one meaning. Do not use slang, idioms, or metaphors. Do not use noun clusters of more than three words. Keep technical names, verb names, file names, and token names as they are.

## How a session runs (FORGE — full text in `docs/process.md`)

**F**eed context (this file → the newest `docs/handoff-*.md` → the DECISIONS rows it names; verify its claims in the tree, #215) → **O**utcome, not task (who, what they can do after, how we know) → **R**everse interview (clickable questions; first: *is this worth doing at all?*; no build before Damir says "go") → **G**enerate, then grade (three options for a real design choice; render both themes; the #46 loop BEFORE delivery) → **E**xport (DECISIONS rows, the `docs/release-readiness.md` rows it changed, handoff, status-log entry, lessons, the next `docs/prompts/session-N.md`, commit message, skill proposals).

## Build · walk · commit loop (per batch — the gates in `docs/process.md` §G2)

1. **Mechanism first** (#294): measure / read the log before a fix. Security lens WHILE building (gate doc triggers above).
2. **Render** any visual change on the BUILT shell, both themes; Damir picks the dials.
3. **Pipeline:** FULL = (`generate-icons` if SVGs) → `extract-strings` → `build-locales` → `build-strings-iife` → `build-demo-bundle` → `build-shells` — **bundle BEFORE shells** (#258); shell/CSS/token-only = `build-shells`; C#-only = none. Then the `--check` gates.
4. **Pins:** behaviour, not source text (#771/#798); **break the code on purpose — the pin must fail for exactly that reason** (mutation, #802) before you believe it.
5. **Smoke:** `node scripts/smoke-test.mjs` → `BASELINE OK n / the 2 KNOWN (#136 · B3)`; the delta must equal the new pins, else look first. Current: **5686** (with the Ixian-Core sibling, session 12 #1268). **C# harness:** `node scripts/run-csh.mjs` → `CSH pass=344 fail=0` on the newest installed SDK (#1122, #1129, #1135, #1149, #1150, #1160, #1166, #1185, #1186, #1206, #1209, #1226, #1241, #1242, #1250, #1251, #1256).
6. **#46 loop** (Opus, in-session) until CLEAN — after a green smoke run, before the batch leaves the machine; smoke again after the last fix; verdict written into its brief (#660).
7. **Walk:** Damir builds — **Windows = F5, never `dotnet build`** (#663); Android Debug; **iPhone + Mac (and Android, #449): wipe `obj`/`bin` when the html changed, then a plain build, then Run — incremental builds do not repackage Raw html** (#320); the BUILD row must show something only this build has. Walk sheet → pasted results → a `WALK #N: n P · n F · n N/A` DECISIONS row; each fail = mechanism first.
8. **Commit:** one logical unit; `docs/commit-message-<batch>.txt` (no attribution lines — ★ COMMIT RULE); Damir reviews the diff, commits and pushes; never `git add -A`. Use `git --no-optional-locks` on the mounted repo; give the PowerShell repo commands with every delivery.

**Hard rule: every significant decision gets a row in `DECISIONS.md` when it's made** — architecture, naming, conventions, scope. Reviews check 🟡 (provisional) rows first. Superseded decisions are marked, never deleted.

**Hard rule: audit loop per milestone (DECISIONS #46).** Whenever a component set + its behavior is complete, or a major feature lands: spin up an audit agent (read-only, findings with file:line) → fixer agents (disjoint file scopes, explicit cross-file contracts) → adversarial reviewer agent → loop fix↔review until CLEAN. Mechanical fixes land directly; architectural findings become 🟡 DECISIONS rows, never silent changes. Rebuild generators + run the jsdom smoke test between fix and review passes.

## Doc index

| Doc | Purpose |
|---|---|
| `DECISIONS.md` | **Decision log — read before changing anything.** Every locked/provisional decision with rationale |
| `ARCHITECTURE.md` | Bridge command inventory, per-view data contracts, 29→9 consolidation, stack, i18n plan, proposed commands, BE findings |
| `SECURITY.md` | Wallet/payment isolation invariants every shell must preserve |
| `CLAUDE.md` | This file — rules + the loop + where we are now (history: `docs/status-log.md`) |
| `docs/security-review-for-be-engineer.md` | **Security handoff for the BE engineer** — shipped-C# verdict + planned-C# risk ranking + the "C# touches no risky parts" rule. If Damir mentions the risks / showing the BE engineer / the wallet wall-off, point him here. |
| `docs/security-handover-gate.md` | **★ The pre-handover gate.** The introduced-vs-inherited sweep: scope, method, output format, and the running list of exposure WE introduced (fix before handover) vs legacy (his). |
| `docs/audit/bridge-audit-A.md` | Source-level bridge audit: Chat, Contacts, Home, Launch, Wallet |
| `docs/audit/bridge-audit-B.md` | Source-level bridge audit: Settings, Scan, MiniApps, Downloads, Dev, Contributors + base class |
| `docs/audit/assets-audit.md` | HTML/JS/CSS inventory, localization mechanism, duplication analysis |
| `DESIGN_SYSTEM.md` | *(pending)* Tokens + component inventory with variants/states |
| `docs/process.md` | **How we work:** FORGE steps, the #46 loop, the gates, definition of ready / done, Spixi vs Bot |
| `docs/quality-plan.md` | The quality checks, when each lands (before / after the freeze), and the controls against bloat |
| `docs/release-readiness.md` | **★ The v1 definition of done** — every remaining item as a testable criterion, by endgame stage |
| `docs/decisions-index.md` | Find the live DECISIONS rule by area without reading 2 MB |
| `docs/lessons.md` | Rules learned, one line each, with the DECISIONS number |
| `docs/status-log.md` | The full session-by-session history (moved out of this file, #1097) |
| `docs/templates/` | Session prompt · handoff · review brief · review verdict · walk sheet |
| `docs/prompts/session-N.md` | Numbered session prompts; the highest number is the next one to paste |
| `docs/handoff-*.md` | The newest handoff = where the next session starts |
| `docs/audit-refactor-plan.md` | The read-only sweep + refactor work order (endgame, #971) |

## Conventions (to firm up as we build)

- Source in `src/` at repo root; built output committed to `Spixi/Resources/Raw/html`.
- Bridge access only via `src/bridge/` (`mock.js` for browser, `native.js` for MAUI) — shells never touch `ixian:`/`executeUiCommand` directly.
- Strings via a per-shell `window.SL` dictionary; config via `window.SPIXI_ENV` (ARCHITECTURE.md §7).

## Where we are now (≤ 10 lines — replace, never append; history goes to `docs/status-log.md`)

- 2026-10-09: **session 13 BUILT, UNCOMMITTED** (patch `session13.patch` on "Session 12: …", commit message `docs/commit-message-session13.txt`). Rows #1269 answers · WALK #1270 (S12: 10 P · 2 F · 7 N/A) · #1271 flash · #1272 band · #1273 sweep · #1274 build.
- ★ 12-FLASH (launch blocker) mechanism: the chat stage's CASCADED InputTransparent flip re-parented the chat WebView (MAUI Android WrapperView) → chat → blank → chat; fix = no cascade + permanent stage container on the Android chat stages (`docs/s13-flash-mechanism.md`). Recording walk owed (light + dark, 0 blank frames).
- S13 also: the About E2E row = title only (#1269) · 12-BAND = WinUI 3 platform defect (#1272) · sweep pre-run + G-3b: 4 OURS-OPEN (`docs/security-sweep-s13.md`) · freeze docs (`docs/freeze-checklist-v1.md`, `docs/office-walk-sheet-v1.md`, release-readiness corrected) · About card A / B / C rendered (B recommended, Damir picks).
- Smoke BASELINE OK **5687** · CSH **344** (cloud twin). Flash fix #46 r1 CLEAN. ⚠ C# UNCOMPILED (`SpixiContentPage.cs` only).
- Walk sheet: the artifact "Spixi Session 13 Walk". Freeze path: S13 walk → S14 (picks + OURS-OPEN fixes) → office walk iPhone + Mac → fix round → `freeze-v1`.
- BE asks: B-34 · B-25 … B-33 · CORE-8/9/10 + the S13 sweep packet — one review packet at the gate stage.
- **NEXT SESSION: read `docs/handoff-2026-10-09.md` FIRST, then paste `docs/prompts/session-14.md`.** Next free DECISIONS number: **#1275**.
