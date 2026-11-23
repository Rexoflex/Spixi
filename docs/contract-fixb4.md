# Agent contract — fixb4 (Fix batch 4)

The lead writes this file BEFORE any agent starts (`docs/orchestration.md` § 4). Every agent gets this file plus its own
row. An agent that needs a file outside its row stops and asks the lead. Prompt: the project doc
`claude/session-fixb4-prompt.md` (from the line "---" down).

## 1 · Base
- Tree: `work/fixb4` from `redesign/frontend` @ `338d30f4` ("Merge pull request #18 from Rexoflex/work/defaultsb").
  Expected baseline (CLAUDE.md of the base): smoke 6774 rows (`BASELINE OK`, or 6768 + the 6 flake rows of
  `pins-fixb1/e-header`) / the 2 KNOWN (#136 · B3) · CSH `pass=806 fail=0`.
  Tools: Node 22 · jsdom 29.1.1 · eslint 10.14.0 · globals 17.14.0 · tree-sitter 0.25.1 · tree-sitter-c-sharp 0.23.5
  (L160) · .NET SDK 10.0.115 · Ixian-Core @ `097341a` as the sibling `../Ixian-Core` · `TZ=America/Los_Angeles` (L214).
- Must hold for everyone: the PARAMOUNT isolation invariant · C# touches no risky parts · the frozen bridge: NO new
  `ixian:` verb (#1312; a new C# → JS push only where § 3 names it) · #1478: each change its OWN switch, the old path
  = the fallback · the security handover gate triggers (a `spixi.*` key, a push, a log line, an HTML sink) · edit
  `src/`, never `Spixi/Resources/Raw/html` by hand (the lead runs the generators) · no commit, no push, no full smoke,
  nothing in Ixian-Core · the size ceiling of `chat.html` (995 KB built, ~1.8 KB left) is NOT raised · claims rules:
  never "money", "no servers", "anonymous", "post-quantum forward secrecy".
- Files of other sessions are never touched: `Spixi/Pages/Chat/SingleChatPage.xaml.cs` (histcs) · `scripts/device/**`,
  `Spixi/Utils/SDevSeed*.cs`, the body of `GATE 54` in `scripts/smoke-test.mjs`, `scripts/pins-fixb1/e-header.mjs`
  (walktools) · `docs/orchestration.md`, `docs/templates/**`, `docs/release-readiness.md`, `docs/walk-safety-app/**`
  (docsb) · `Spixi/Spixi.csproj`, `.github/**`, `docs/legal/**`, `Spixi/Resources/Raw/licenses/**` (leanfollow) · the
  lock code, `SPayments.cs`, the send / sign / broadcast path, `Spixi/Meta/**`.

## 2 · Phases
**Phase M (mechanisms, read-only, runs while the baseline smoke runs):** agents READ the tree and `git log` / `git show`
only. They run NO node script, no test, no browser, no build (L153: nothing executes beside the full smoke). Output:
a findings file in their scratch folder. The lead writes `docs/fixb4-mechanisms.md` from them (#294).
**Phase B (build, after the baseline):** the rows of § 4 are filled by the lead after phase M.

## 3 · Interfaces between items (the only way two items meet)
| Name | Shape | Provider | Consumer |
|---|---|---|---|
| Push `setNewAccountDefaults(media, density)` (C# → JS, launch shell only; the ONE new push of the batch, #1312 — no new `ixian:` verb) | two string arguments, each exactly `"1"` or `"0"`. `media === "1"` → `localStorage.setItem('spixi.media.autoload', 'off')`; `density === "1"` → `localStorage.setItem('spixi.chat.listdensity', 'compact')`. Any other value → that key is not touched. Writes NO other key, removes nothing, logs nothing, sends no verb; each write in its own `try`. | `LaunchPage.xaml.cs` (B2) | `src/shells/launch.html` handler object (B2's region) |
| When C# sends it | ONLY at the three new-account sites: the create body right after `DefaultsRules.writeNewAccount(…)` (`LaunchPage.xaml.cs:595`, after the `wipeLocalState` push of `:589`), and right after each `applyRestorePrefs(pass);` (base lines `:1163`, `:1241`; `:1196`, `:1275` after the build). Never in `proceed`, `onLoad`, the retry view or any start path. Not sent at all when both arguments would be `"0"` (= the old path, byte-equal behaviour). | B2 | — |
| Switches (`Spixi/Utils/SpixiFlags.cs`, own block + `readFixb4()` called right after `readPhoto1b();`) | `DefaultMediaTapToLoad` (key `flagDefaultMediaTap`) and `DefaultListCompact` (key `flagDefaultListCompact`): int prefs, absent = 1, a stored 0 acts only in dev mode (`S16PassRules.effectiveFlag`), start value `false`, read once. One line `[FLAGS] fixb4 mediatap=<0|1> listcompact=<0|1>` (the BUILD row of the walk). | B2 | the walk |
| `density` argument | `"1"` only when `DefaultListCompact` AND the platform is a desktop (Windows or Mac — the predicate the app already uses for its desktop carrier; B2 names it with `file:line`). The phone has no density control: nothing is written there. | B2 | — |
| Log line at a write site | `[DEFAULTS] new account page: mediatap=<0|1> compact=<0|1>` (fixed words + digits; the args that were sent; written also when nothing is sent, with `0 / 0`). | B2 | the walk |
| Reveal of the focused field (Android, item 2) | `src/shells/launch.html` `launchKeyboardInset` region only; writes ONLY `.c-launch__body.scrollTop`; runs only on the resize model (Android UA); iOS / Mac / Windows behave as before (the code returns at once there). | B3 | — |

## 4 · Items and ownership — phase M
| Item | Agent | Model (effort high) | Reads | Returns | Scratch |
|---|---|---|---|---|---|
| 5 broken-picture tile · 7 drag and drop | `mech-chat` | Opus | `src/shells/chat.html`, `src/components/**`, C# of the file send path (read only), `git log -S` | `findings.md` | `/home/claude/scratch/mech-chat/` |
| 2 protect-account keyboard · 6 dev log half row | `mech-layout` | Opus | `src/components/launch-shell.js`, `src/shells/launch.html`, `src/shells/dev.html`, `src/styles/**`, C# insets (read only) | `findings.md` | `/home/claude/scratch/mech-layout/` |

## 4b · Items and ownership — phase B (build; each agent in its OWN full copy `/home/claude/work/<id>/`, L74)
| Item | Agent | Model (high) | Owns (files / regions) | Owes (pins + one deliberate break each, #802) |
|---|---|---|---|---|
| 1 slide 4 | `texts` | Sonnet | `src/components/launch-shell.js` (the slide-4 copy line ONLY) · `src/strings/**` (en-us, the drafts, the built dictionaries as the generators write them) | `scripts/pins-fixb4/a-slide4.mjs`: every locale's slide-4 text names Blitz Chess and none of Split / Tic-tac-toe; the key exists in all 14 locales + en-us; `build-locales --check` green |
| 3 + 4 the two defaults | `defaults` | Opus | `Spixi/Utils/SpixiFlags.cs` (own block + `readFixb4`) · NEW `Spixi/Utils/PageDefaultsRules.cs` · `Spixi/Pages/Launch/LaunchPage.xaml.cs` (exactly the three call lines of § 3, nothing else) · `src/shells/launch.html` (the `setNewAccountDefaults` handler and the header comment's push list ONLY) · `scripts/csh/PageDefaultsTests.cs` + its Compile line in `scripts/csh/csh.csproj` · the re-bases of hashed pins its C# edits break (name each) | csh tests (args, flags line, log line, desktop rule, both off = no push); `scripts/pins-fixb4/b-defaults.mjs` (jsdom on the BUILT intro.html: the push writes exactly the two keys for "1", nothing for other values, no verb; the C# call sites by a tree-sitter walk or the stated-limit source check of #1735) |
| 2 keyboard · 6 dev log | `layout` | Sonnet | `src/shells/launch.html` (the `launchKeyboardInset` script region ONLY) · `src/styles/components/settings-app.css` (the `.c-settings-dev__log` rule ONLY) | Chromium proofs by hand: `scripts/pins-fixb4/c-keyboard-render.mjs`, `scripts/pins-fixb4/d-devlog-render.mjs` (measured geometry, base vs new, light + dark, PNGs to `/home/claude/scratch/renders/`); smoke pins `scripts/pins-fixb4/c-keyboard.mjs`, `d-devlog.mjs` (jsdom, stated limits) |
| 5 the tile | `tile` | Sonnet | `docs/walk-photo1b.md` (rows W-2 and A-2 ONLY) · `scripts/pins-fixb4/e-tile-states.mjs` | the pin: my unsent image file = the progress face, byte-equal cap ON vs OFF; after `updateFile(100, True)` = the file card + `ixian:openfile`; a reopen of a complete broken file = the card (ON after the quiet wait, OFF at once); breaks named in the report |
| 7 drag and drop | — (mechanism only, § 7 of the mechanisms doc) | — | nothing | the question for Damir |

**Shared rules of phase B:** every node / dotnet / Chromium run is wrapped in `flock /home/claude/work/.heavy.lock …` (2 cores, 7 GB: one heavy run at a time). An agent may run the generators in its own copy to test; the lead regenerates once after the merge. No agent edits `scripts/smoke-test.mjs` (the lead writes the ONE fixb4 registration block). `chat.html` is not touched by any agent.

## 5 · What each agent returns
- The list of files it CHANGED (phase M: none — the repo copy is read-only).
- Per pin: the command, the green line, the break it made (one-token mutation in a full copy, #802), the red line.
- What it could not prove (⚠ C# UNCOMPILED, unrun, not rendered).
- Anything outside its scope: a note, not a fix.

## 6 · Integration order and checks (the lead)
1. Copy back per agent, changed files only → the FULL pipeline (bundle BEFORE shells) → the `--check` gates.
2. Pin registrations in `scripts/smoke-test.mjs` (ONE block, fixb4): check the scope each line landed in.
3. The full smoke (one at a time, L153) + CSH → the #46 loop until CLEAN → export → commit → ONE push (#1546).

## 7 · Escalation log
| Item | Attempt | Model | Result | Next |
|---|---|---|---|---|
