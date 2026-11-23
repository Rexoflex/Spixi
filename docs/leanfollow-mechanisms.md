# Speed lean follow-up (`leanfollow`) — the mechanisms, written before the fixes (#294)

Base: `redesign/frontend` @ `55feaddc` ("Merge pull request #15 from Rexoflex/work/fixb2"). Every `file:line` below
is of that tree. Sources of the scope: #1625 (1)–(3), #1741 (3), #1745; the findings #1585, #1586, #1587 and the
review round 5 of Speed lean (`docs/review-brief-perflean.md` § 5.2, r5B-1 and r5B-2).

## 1 · Why the PLAIN `smoke-packaged` is red on four rows in any copy

`node scripts/smoke-packaged.mjs` (no lean flag) copies the repo into a temp folder WITHOUT `.git`, `node_modules`,
`obj`, `bin`, `local-nuget` and `_to_delete` (`scripts/smoke-packaged.mjs:65`), links back `node_modules` and
`local-nuget` (`:66`, `:79`), strips the copy and runs the copy's suite with `cwd` = the copy (`:89-94`). It does NOT
link the Ixian-Core sibling: only the lean path does (`:270`). The copy is therefore (a) not a git work tree and (b)
has no `../Ixian-Core`.

| Row | Where it reads | Why it is red in the copy | Cause class |
|---|---|---|---|
| `★ S15 D (O-27, #1293): .gitignore ignores the device captures …` | `scripts/pins-s15/d-build.mjs:138` — `git -c core.excludesFile= check-ignore --no-index --stdin …` with `cwd` = the copy | `git check-ignore` needs a work tree, also with `--no-index`; the copy has no `.git`, git exits 128 (`fatal: not a git repository`), the pin throws at `:140` | (a) no work tree |
| `★ #1101 F-1b …` | `scripts/smoke-test.mjs:41094` — `join(root, '..', 'Ixian-Core', 'Streaming', 'Friends', 'Friend.cs')` | the read fails, the pin sets `coreFriend = ''` and fails BY DESIGN (#46 r1 C10: a missing sibling fails the pin) | (b) no Core sibling |
| `A10 (#1128) …` (the silent deletes) | `scripts/smoke-test.mjs:42226` — `join(root, '../Ixian-Core/Streaming/CoreStreamProcessor.cs')` | the same: the Core file is not there | (b) |
| `S14` (the backup rules) | `scripts/pins-s14/a1-backup-back.mjs:60` — `const core = join(root, '..', 'Ixian-Core')` | the folder / file names are READ from Core's `LocalStorage` / `PendingMessageProcessor`; without the sibling the pin fails | (b) |

#1585 proved the four on a `git archive` copy of the Speed lean base with `pins-s14/a1-backup-back` +
`pins-s15/d-build`; this batch re-proves them on `55feaddc` before the fix (the session's status doc holds the run).

**Fix at the cause, both classes (no row is silenced, no other session's row is edited):**
- (b) the plain path links the Ixian-Core sibling next to the copy, exactly as the lean path does (`:270`), when
  `root/../Ixian-Core` exists; every link is removed by itself before the temp folder is deleted (the lean path's
  `removeLinks`, #46 perflean r2 S-3 — the plain path today deletes with `rmSync` while two links are inside the
  copy, `:105`).
- (a) the copy is made a git work tree with NO history: `git init -q` in the copy, after the copy and before the
  suite. `git check-ignore --no-index` then reads the copy's own `.gitignore` files — the committed bytes — and
  `core.excludesFile=` keeps the global excludes out, as in the real tree. Only S15 D calls git in the suite (a grep of
  `scripts/smoke-test.mjs` and `scripts/pins-*/*.mjs` for git calls: `pins-s15/d-build.mjs:138` is the one call), so no
  other row sees the new `.git`. The same step goes into the lean path, so the "copy" entry of
  `scripts/pins-perflean/lean-expected-reds.json` (S15 D) is no longer red there and is removed (a stale entry fails
  the lean judge, `smoke-packaged.mjs:204`).
- Limit, stated: without an Ixian-Core sibling (a PC tree without it) the three Core rows stay red in the plain run,
  as they are red in the main suite of such a tree; the run says "no Ixian-Core sibling" in one line.

## 2 · What each packaging hole lets through today

### Hole 1 — `SpixiLeanJs` is refused only in `SpixiLeanGuard` (review r5B-1)
- The park of P-07 is ONE `<Error>` in `SpixiLeanGuard` (`Spixi/Spixi.csproj:539`). The guard reads the property
  when it runs. `SpixiLeanReleaseHtml` reads it again later, at its own run: the flag line (`:646`) adds `--lean-js`
  and the must-write list (`:676`) adds the three external scripts.
- A target that runs AFTER the guard and sets `SpixiLeanJs=true` (an imported `.targets` file with
  `AfterTargets="SpixiLeanGuard"`, a `Directory.Build.targets` in a folder above the repo, which MSBuild imports
  by walking up) reaches the js branch: the package then holds the parked JS strip's output. The reader of round 5
  ran it on the harness project (the call `--lean-css --lean-js`).
- What it needs: a lean CSS build that passes the guard — an Android dev build with the dev app id. A production
  build cannot be made lean this way (a skipped guard runs again through `DependsOnTargets` and refuses).
- **Fix:** a belt `<Error>` as the FIRST task of `SpixiLeanReleaseHtml` when `SpixiLeanJs` is not `false`, before the
  `RemoveDir` and before `node`. The js branch stays in the file, unreachable (#1583: it stays for the session that
  finishes P-07; removing BOTH Errors re-opens it).

### Hole 2 — the out-folder test protects `Raw/html` only (review r5B-2)
- The asset glob is `Resources\Raw\**` (`Spixi/Spixi.csproj:268`): every file under `Spixi/Resources/Raw` ships,
  with its sub-path as the `LogicalName`.
- The lean `--out` refuses a folder inside `Raw/html` (`scripts/strip-release.mjs:512-537`: by real path, by the
  path as written, by device + inode), but not the rest of `Resources/Raw`:
  `--out Spixi/Resources/Raw/html/../lean2 --lean-css` writes 21 files that the next build packs as extra assets;
  GATE 1 on `assets/html` does not see them.
- The plain `--out` (`scripts/strip-release.mjs:318-333`, the tokens-only strip) refuses nothing: `--out` anywhere
  writes `spixi.tokens.css` there, also under `Resources/Raw` (an extra asset) or into `Raw/html` itself (the
  committed sheet replaced by its stripped form).
- The MSBuild side: both targets write under `$(IntermediateOutputPath)` (`:587`, `:642`); the lean guard refuses an
  empty value and the project folder (`:547`), not a folder under `Resources\Raw`. With
  `-p:IntermediateOutputPath=Resources\Raw\obj\` the strip output is written where the glob of the NEXT build packs
  it, and the lean target empties a folder there (`:650`).
- Who can do it: a hand command or a build-line property; the build itself always passes a folder under `obj`.
- **Fix (refuses more, never less):** one rule in `strip-release.mjs` for EVERY `--out` (plain and lean): the out
  folder must not be `Spixi/Resources/Raw` or inside it — by the three tests the lean path already has (real path,
  path as written, device + inode of each parent), against `Resources/Raw` instead of `Raw/html` — with ONE
  exception: the source folder `Raw/html` itself together with `--in-place` (smoke-packaged strips its temp COPY in
  place; plain and lean). `--in-place` becomes valid with any `--out` (today: only with a lean flag). The csproj gets
  the same refusal for a lean build in `SpixiLeanGuard` (an `IntermediateOutputPath` under `Resources\Raw`) and a belt
  in `SpixiLeanReleaseHtml` before its `RemoveDir`. The tokens-only target `SpixiStripReleaseHtml` is NOT edited (its
  bytes are pinned, #1584): its `Exec` fails on the script's refusal, so the build stops.

## 3 · The licence texts (#1587, #1625 (1)) — what is known before the inventory
- `Spixi/Resources/Raw/html/js/html5-qrcode.min.js` (375,364 bytes) holds no licence text; it is in the fork point
  `0e85a4b8` (inherited); the notices doc says Apache-2.0, which asks for a copy of the licence with every
  distribution.
- The Sora font is embedded as a `data:` URL in the shipped stylesheets; no OFL text is in the package (`Raw/html`
  holds no `.txt` and no licence file; the whole package holds none: `find Spixi/Resources` on the base).
- `docs/legal/third-party-notices.md:26-28` names qrcodejs, jQuery, Bootstrap and clipboard.js; `Raw/html/js` holds
  only `html5-qrcode.min.js` on the base.
- The inventory of every third-party file and embedded asset is item 1's first step (the table in the notices doc).
  Facts only, no legal judgment; an unproven licence is a question for Damir, never a guess.
