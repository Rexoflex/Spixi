# Handoff YYYY-MM-DD<x> — <one-line state>

File name: `docs/handoff-YYYY-MM-DD<x>.md`. Read this FIRST, then DECISIONS <rows>. Number block of this session:
#<a>–#<b> (used: #<a>–#<c>; #<d>–#<b> stay empty) · lessons L<a>–L<b> (used: <…>). The main chat gives the next
block; it writes the next prompt (`claude/session-<name>-prompt.md`).

## 0 · State
- Branch: `work/<batch>` @ "<commit message>" · base: `redesign/frontend` @ "<commit message>" · push: made AFTER
  this commit, each commit read back through the GitHub API (#1546 (3)) · pull request: Damir opens it with the compare
  link `https://github.com/Rexoflex/Spixi/compare/redesign/frontend...work/<batch>?expand=1` (the link, the title and the
  description to paste are in the status doc and in Mission Control; the session does not open it, #1546) · merge = Damir (a merge commit, #1505)
- Delivery without push access (fallback): <PC tree, in place / patches + tarball + SHA256> · commit message file(s): <list>
- CI (`redesign-ci`): <not run yet at the time of this commit — it runs on the pull request that Damir opens; the main chat reads it | fallback: not run, Damir's push starts it>
- Smoke: `BASELINE OK — <n> / the 2 KNOWN (#136 · B3)` · environment: <PC | cloud twin + Ixian-Core @097341a> · tool versions: <jsdom …> · delta <+n> = <new pins> · CSH <n>
- Checks: pin-sweep --working read · build-shells --check · extract-strings --check · generate-icons --check · build-legal-docs --check · i18n-lint · pseudo 9/9 · verify-locales · cs-syntax-check — not run, and why: <list>
- Review: <CLEAN at rN | CLEAN not claimed at rN — why (= the batch is NOT done; the owed round goes into the next prompt — docs/process.md loop step 7)> · brief `docs/review-brief-<batch>.md` · models: <lead, builders, reviewers>
- ⚠ C# UNCOMPILED: <files> (the next build is the first compile; CI compiles Windows only)
- New files to `git add`: <list> · Uncommitted work from other sessions: <none / list>
- Definition of done: rows changed in `docs/release-readiness.md`: <IDs → new state>
- Still owed: <walks per platform · first compile · open rulings>

## 1 · What this session did
| Item | Result | Evidence (file:line / pin / DECISIONS / render) | DoD row |
|---|---|---|---|

## 2 · Walk
Sheet: `docs/walk-<batch>.md` = the Artifact "<name>" (<n> rows, <platforms>). Result: <n P · n F · n N/A | owed>.

## 3 · Proposed next steps (the main chat decides)
Outcome: <who can do what afterwards, how we know>
1. <first step>
2. <…>

## 4 · Open questions and dials
| For | Question (with its options) | Blocks |
|---|---|---|
| Damir / BE | | |

## 5 · Recorded, not changed
- <item — why not changed>

## 6 · Lessons (also appended to docs/lessons.md)
- <one line each, with the DECISIONS number>

## 7 · Repo commands for Damir (PowerShell, one line at a time, no `&&`)
How to check out and build the branch:
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git status -sb
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch work/<batch>
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git pull --ff-only
```
- `git pull --ff-only` matters when the local branch exists already (a re-walk after a fix round must build the new commit).
- iPhone / Mac legs: the same git lines in the Mac clone (zsh). ★ MAC RE-SYNC REMINDER of `CLAUDE.md` comes first there.
- Windows: wipe `Spixi\obj` + `Spixi\bin` when C# changed, then **F5 in Visual Studio, never `dotnet build`** (#663).
- Android / iPhone / Mac: wipe `Spixi/obj` + `Spixi/bin` when the html or C# changed, then a plain build, then Run (#320, #449).
- The BUILD row of the walk sheet names something only this build shows.

Normal path (#1546): the session pushed `work/<batch>`; Damir opens the compare link of § 0, checks "base repository:
Rexoflex/Spixi · base: redesign/frontend" and clicks "Create pull request" with the pasted title and description.

After the walk: paste the results in the main chat. Merge the pull request on GitHub — after the walk or before it:
Damir decides per pull request (#1495 was not adopted, #1502); check that its base is `Rexoflex/Spixi` →
`redesign/frontend`; the merge is "Create a merge commit" (#1505). Then `git switch redesign/frontend` and `git pull`.

Fallback, when the push failed — Damir makes the branch and the pull request:
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch -c work/<batch>
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git add <named files — never -A>
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git commit -F docs\commit-message-<batch>.txt
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git push -u origin work/<batch>
```
Then open `https://github.com/Rexoflex/Spixi/compare/redesign/frontend...work/<batch>?expand=1` and check the line
"base repository: Rexoflex/Spixi · base: redesign/frontend" before "Create pull request". Do NOT use the link that
`git push` prints (`…/pull/new/work/<batch>`): on a fork it opens the pull request against `ixian-platform/Spixi`.
