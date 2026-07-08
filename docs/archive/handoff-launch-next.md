# Handoff → next session: Launch/onboarding wired + audited. All breadth shells DONE → full-app test + BE cutover pass.

**Damir first (build + F5 + commit — ritual below).** The redesigned **launch/onboarding shell** now runs on the real C# bridge as `src/shells/launch.html`, dropped in over all five legacy launch filenames. This was the **LAST breadth shell** — chat, home (chats/wallet/apps tabs), settings, and launch are all bridge-wired now. #46 audit CLEAN (1 MAJOR fixed). **This batch DID change a component (`launch-shell.js`), so `build-demo-bundle` IS required** (unlike apps #184). Start a fresh Opus chat from this file.

## Boot ritual (read in this order)
`CLAUDE.md` (status tail) → `DECISIONS.md` row **#185** (+ #184 apps · #183 settings · #182 wallet · #177 for the bridge-wiring lineage) → **this file** →
`docs/be-cutover-brief.md` (deferred-C# work order: chat **C1–C7** · wallet **W1–W4** · settings **S1–S6** · apps **A1–A2** · **launch L1–L4**) →
`docs/launch-spec.md` (the shell's design contract) + `docs/handoff-stage4b-bridge-next.md` (the bridge-wiring PATTERN — STILL AUTHORITATIVE) →
`ARCHITECTURE.md` **§5** (surfaces = separate pages vs home-tabs) + **§3/§4/§9**.

## What #185 did (ZERO C#, frozen bridge)
- **Launch is FIVE separate C# pages**, each loading its own HTML file — NOT one page with tabs. So `build-shells.mjs` writes ONE shell source (`src/shells/launch.html`) to all five legacy filenames, each booting its own view via injected `window.__LAUNCH_VIEW__`:

  | out file | C# page | boot view | ready verb | key emits | key pushes |
  |---|---|---|---|---|---|
  | `intro.html` | LaunchPage | welcome | `ixian:introload` | `create`·`restore`·`accept`·`language:<c>`·`appearance:<i>` | setVersion·showTerms·showOnboardingSection |
  | `intro_new.html` | LaunchCreatePage | create | `ixian:onload` | `avatar`·`create:<nick>:<pass>`·`back` | setVersion·loadAvatar |
  | `intro_restore.html` | LaunchRestorePage | restore | — (none) | `selectfile`·`restore:<pass>`·`back` | setUploadedFileName·showPasswordError·removeLoadingOverlay |
  | `intro_retry.html` | LaunchRetryPage | retry | — (none) | `proceed:<pass>`·`back` | removeLoadingOverlay |
  | `onboarding.html` | OnboardPage | tail | — (none) | `joinbot` **or** `finish` | — |

- **Welcome CTAs NAVIGATE** (emit `ixian:create`/`ixian:restore`) so C# pushes the real create/restore pages — a bare LaunchPage can't process `create:<nick>:<password>`. Done via NEW additive component hooks `onGoCreate`/`onGoRestore` (absent = internal `show()`, demo unchanged).
- **Consent:** `ixian:accept` is recorded ONCE at the first welcome CTA tap — the only page whose C# handles it (premium round: "continuing = agreeing"; the fine-print Terms/Privacy sheets render on the create/restore forms).
- **create loading is INDEFINITE** (spec §2.2): the button morph spins until C# navigates to Home (success → page torn down) or native-alerts (failure → NO release signal = the wedge, **L1**). The shell deliberately never touches `ctrl` on create.
- **restore/retry ctrl:** `showPasswordError`→`ctrl.fail(msg)` (inline error), `removeLoadingOverlay`→`ctrl.fail('')` (silent). The one-shot latch absorbs C#'s double signal (error wins).
- **tail joinbot/finish are MUTUALLY EXCLUSIVE:** native `ixian:joinbot` already finishes onboarding + pops the modal, so a `tailJoined` flag suppresses the trailing `ixian:finish` on the Join path (this was the audit MAJOR). Skip → `finish` only.
- **Outgoing is serialized** through a queue (the MAUI WebView processes one navigation at a time — accept+create must both land); all sends go via `bridge.send` (native.js scheme guard).
- **#46 audit — 1 MAJOR fixed** (tail double-pop) + NITs (autoplay gated to welcome boot; all sends via `bridge.send`). Re-review CLEAN.

## Component edits this batch (→ `build-demo-bundle` REQUIRED)
- `src/components/launch-shell.js`: (1) welcome CTAs now call `opts.onGoCreate`/`onGoRestore` when provided (else internal `show()`); (2) the autoplay `setInterval` only starts on a welcome boot (`(st.opts.view||'welcome')==='welcome'`). Both additive/backward-compatible.

## OMITTED / deferred (honest v1 degrade) — BE gaps L1–L4
- **L1** create-failure: no release signal on wallet-gen failure → the Create button wedges (spec §6②).
- **L2** `create:<nick>:<password>` parse is fragile (FE gates it inline; C# guard wanted).
- **L3** onboarding "Back up now" has no OnboardPage verb → advances to the join step only; real backup deferred to the settings Backup row.
- **L4** welcome i18n live-locale (same holistic gap as settings S5 — the reloaded shell re-boots from its own en-us dict).
- Avatars = gradient fallback (repo-wide flag — `loadAvatar`'s absolute path doesn't resolve in the self-contained shell).
- Onboarding illustrations (`images/onboarding/step1–4.svg`/`restore.svg`/`join-community.svg`) fail-soft to hidden until re-export (**#174** — the truncated exports).

## Build / test ritual (Damir runs LOCALLY — PowerShell, one line each, no `&&`)
- **Component changed → run `build-demo-bundle` FIRST:** `node scripts/build-demo-bundle.mjs`
- `node scripts/build-shells.mjs launch` — writes ALL FIVE launch files (the `launch` shorthand expands to the set). (Add `chat home settings` if rebuilding those too, or `all`.)
- `node scripts/smoke-test.mjs` (jsdom — loads the DEMOS, so the launch **demo** `src/demo/launch.html` is the smoke target; the wired shell is verified by F5).
- F5 the `net10.0-windows` target (fresh install / clear onboarding pref to hit the launch flow). CLI `dotnet run` hits the 9009 packaged-launch quirk → use F5 or `-p:WindowsPackageType=None`.
- **Commit via GitHub Desktop only.** Stale 0-byte `.git\index.lock` → delete it (idle GitHub Desktop only).

## F5 eyeball (the launch flow)
- Fresh account: welcome carousel + language/appearance pills → tap **Create new account** → the real LaunchCreatePage form (nickname forms the avatar, `:` hazard gates, ≥10-char password) → **Create my account** spins → wallet generates → lands in Home → onboarding modal (backup nudge → join step; **Join** adds the Spixi Group Chat, **Not now** just finishes).
- **Restore:** welcome → **Restore existing account** → pick a backup file (basename shows + check) + password → wrong password shows an inline error, right one restores + navigates.
- **Retry** (saved wallet password failed at boot): password + Unlock; wrong = native alert, field kept.
- Cosmetic flag: the create/restore **Back** button briefly flips to the welcome view before C# pops the page (the component's form-back always does an internal `show('welcome')`); it's on the outgoing page during the pop animation — confirm it's acceptable, else a follow-up component tweak can skip the internal show when `onBack` is provided.

## After launch — the remaining roadmap
1. **Full-app Windows test** — every shell on the real bridge end-to-end (create → chat → wallet → apps → settings → onboarding).
2. **Item 5 — C# §5 repoint** (BE): canonical shell filenames + `setRoute` (currently Stage-4a drop-in over legacy filenames).
3. **Item 6 — Android device round.**
4. **BE cutover pass** — work the `docs/be-cutover-brief.md` order (C1–C7 · W1–W4 · S1–S6 · A1–A2 · L1–L4); payments/calls land here.
5. **Phase 4 freeze audit.**

## Flags / parked
- **Sandbox mount truncates large-file reads** (#175, PC): the inliner + `launch-shell.js` syntax were verified in-session (strict inline OK 1.16 MB; strip+`new Function` OK), but the bundle/jsdom regen is Damir's local gate.
- The committed `src/demo/spixi.iife.js` is **STALE** for launch (no `onGoCreate` yet) — the first local `build-demo-bundle` fixes it.
