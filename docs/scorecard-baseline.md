# OpenSSF Scorecard baseline — Rexoflex/Spixi (read 2026-11-27, session `qtools`, builder-b)

Where the score comes from, and which failing check has an owner. One line per check with a score below 10. **Not a
Scorecard score:** no full CLI run was possible (below), so there is no aggregate number for the repository.

## How it was read (two parts, said plainly)

| Part | Method | Covers |
|---|---|---|
| **CLI** | `scorecard` v5.7.0 (`github.com/ossf/scorecard` release, sha256 `3b08ec0a…8235d3` checked against the release's checksum file), `--local` over a copy of the work tree (`git ls-files -co --exclude-standard` of `work/qtools`, so it holds this batch's new files and builder-a's `codeql.yml`). `--checks` = the file-based ones. | Binary-Artifacts, Dangerous-Workflow, Dependency-Update-Tool, License, Pinned-Dependencies, SAST, Security-Policy, Token-Permissions, Vulnerabilities |
| **By hand** | `--repo=github.com/Rexoflex/Spixi` was REFUSED: the session's proxy answers 403 to GitHub GraphQL (`githubv4.Query … 403`, ListCommits), and the token in `gh auth token` is invalid. The host checks were read from the REST API (`gh api repos/Rexoflex/Spixi/...`: repo, branches, rulesets, commits, contributors, releases) and from the tree of `master`. | Branch-Protection, Code-Review, Maintained, CI-Tests, CII-Best-Practices, Contributors, Signed-Releases, Packaging, Fuzzing |

Fuzzing also failed in the CLI (OSS-Fuzz status search 403); it is read by hand. Vulnerabilities printed 10, but
`api.osv.dev` is not reachable from here, so that 10 is **not proven** (it may be an empty read).

**Which branch the real workflow measures.** Scorecard reads the repository's DEFAULT branch, and that is `master`
(the fork point `0e85a4b8`, upstream's `spixi-0.9.22`, no `SECURITY.md`, no `package.json`, only upstream's `dotnet.yml`),
not `redesign/frontend`. The CLI part above reads the work tree (what the score will be when the redesign is on `master`);
the by-hand part reads `master` and the repository settings. `.github/workflows/scorecard.yml` is inert until it is on
`master` (its comment says so): the weekly schedule never fires, and a push to `redesign/frontend` runs only a notice job,
because ossf/scorecard-action v2.6.0 stops with "only the default branch is supported" on any non-pull-request event whose
ref is not the default branch (`options/options.go`, `Validate`).

File-based CLI result of this tree: Pinned-Dependencies 5 · SAST 10 · Token-Permissions 0 · Dependency-Update-Tool 0 ·
Binary-Artifacts 5 · Security-Policy 4 · License 9 · Dangerous-Workflow 10 · Vulnerabilities 10 (unproven). The same
copy WITHOUT the new `.github` files (this batch's two workflows and builder-a's CodeQL files): Pinned-Dependencies 0,
SAST 0, the rest equal; the aggregate the CLI prints for these nine checks moves 4.4 to 5.7 (Scorecard's weights, nine
checks only: not the repository's score).

## Failing checks (score below 10)

Who fixes: **this batch** = a new file of this batch inside `.github/` · **owed: …** = a file this batch may not edit ·
**Damir (repo settings)** = a setting or a decision of the owner; no branch rule is changed by this batch.

| Check | Score | Why | Who fixes it |
|---|---|---|---|
| Pinned-Dependencies | 5 (CLI) | 11 GitHub-owned action uses are tag-pinned, not SHA-pinned: `redesign-ci.yml` lines 37, 43, 51, 56, 169, 194, 200, 208 (`checkout@v7` x4, `setup-node@v7`, `setup-dotnet@v6` x2, `upload-artifact@v7`) and upstream's `dotnet.yml` lines 18, 23, 30 (`checkout@v4` x2, `setup-dotnet@v3`). All uses in the new files are pinned by full SHA. | **owed: redesign-ci.yml / dotnet.yml.** Replace each tag by the commit and keep the tag as a comment: `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1` · `actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0` · `actions/setup-dotnet@0f4a354dd5547a28c70b7853dbd95d5b67886e73 # v6.1.0` · `actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2` (v4 and v3 in `dotnet.yml`: the same pins work if it is moved to the same majors). |
| Pinned-Dependencies (NuGet) | part of the 5 | `sbom.yml` line 129 `dotnet restore` has no lock file: the check wants `packages.lock.json` + `--locked-mode`, or central package management. It sees `sbom.yml` because that job sets `shell: bash`; the same restore in `redesign-ci.yml` (windows-build) and `dotnet.yml` is not counted (inferred: a Windows step with no shell set runs PowerShell, and the check parses only shell scripts; the CLI counted one NuGet command in all). | **owed** (outside this batch): a lock file means a change of `Spixi/Spixi.csproj` (`RestorePackagesWithLockFile`) and a committed `packages.lock.json` per project, with the first restore on all four target frameworks. A decision for the lead and Damir; not done here. |
| Token-Permissions | 0 (CLI) | `dotnet.yml` has no top-level `permissions:` ("no topLevel permission defined"). Every other workflow has `contents: read` at the top, and the CLI reports no job-level write permission (`scorecard.yml` grants `security-events: write` to its one job, for the SARIF upload). One file fails the whole check. | **owed: dotnet.yml.** One line, `permissions:` / `contents: read`, at the top. |
| Dependency-Update-Tool | 0 (CLI) | No `dependabot.yml` or Renovate config in the tree. | **owed** (a new file outside this batch's three): `.github/dependabot.yml` for `github-actions` (keeps the SHA pins current), `nuget` and `npm`. The npm entry must ignore `jsdom` (it stays 29.1.1, L160). Dependabot SECURITY updates are also off in the repository: **Damir (repo settings)**. |
| Binary-Artifacts | 5 (CLI) | 5 binaries are committed: `Spixi/Platforms/Android/lib/{arm64-v8a,armeabi-v7a,x86_64}/librocksdb.so` and the two `librocksdb_full.a` of `RocksDB.xcframework`. Upstream's custom-built RocksDB (the 0.0.42 build), present at the fork point. `local-nuget/RocksDB.0.0.42.nupkg` is a zip and is not flagged. | **Damir (with the BE engineer):** the libraries are the BE side's; a source build in CI would replace them. Not for this batch, and not changed by the redesign. |
| Security-Policy | 4 (CLI) | `SECURITY.md` exists but is the frontend security model: "no linked content found" (no address, no private-reporting link). `master` has no `SECURITY.md` at all, so on `master` it reads lower. | **Damir (repo settings + text):** a reporting address or the private vulnerability reporting switch of the repository, and a short "how to report" paragraph. |
| License | 9 (CLI) | "license file does not contain an FSF or OSI license": `LICENSE` is upstream's MIT text ("Copyright (c) 2019 Ixian"); the detector does not match it. The cause was not traced. | Nobody: upstream's file, one point; do not edit. |
| Branch-Protection | by hand: 0 | The default branch `master` has no protection (`branches/master` `protected: false`, `branches/master/protection` 404). The one ruleset, `protect-redesign-frontend` (active, no bypass: deletion, non-fast-forward, pull request with 0 approvals, merge-method "merge" only, two required checks), names `refs/heads/redesign/frontend` only. Even with a token that can read it, the check looks at `master`. | **Damir (repo settings):** a rule for `master`, or the default branch changed to the protected one. Not changed here. |
| Code-Review | by hand: 0 | The newest 30 commits read on `master` are upstream's direct commits; the newest 5 pull requests of the fork all go to `redesign/frontend` and the ruleset asks for 0 approving reviews (a one-person fork: no second human). The check counts changesets approved by someone other than the author. | **Damir (repo settings):** a required review (needs a second reviewer; an accepted gap in a one-person fork, if he decides so). |
| Maintained | by hand: 0 | `master`'s newest commit is 2026-06-16 (164 days before this reading), `has_issues` is false: no commit and no issue activity on the default branch in the last 90 days. The pushes to `redesign/frontend` do not count. | Nobody: it moves when the redesign is merged into `master`. |
| CII-Best-Practices | by hand: 0 | No OpenSSF Best Practices badge. | **Damir:** registering at bestpractices.dev is his decision; no file in the repository. |
| Fuzzing | by hand: 0 (CLI -1) | No fuzz target in the tree. | Planned: #16 (SharpFuzz on the C# parsers, "after freeze, parsers stable", `docs/contract-qtools.md` § 7). |
| Contributors | by hand: not proven | The API lists 10 contributors (upstream's: IxiAngel, firestorm40, jakapozun ...). The check needs the `company` field of each user; those users are outside the one reachable repository. Likely below 10. | Nobody: upstream's history. |

Not scored (-1, not failures): **Packaging** (no publishing workflow), **Signed-Releases** (no release: `releases` is
empty), **CI-Tests** (no merged pull request on `master` to read). **At 10:** Dangerous-Workflow. **SAST** is 10 in the
file-based run only because `codeql.yml` is in the work tree; on `master` it reads from the pull requests merged there,
so it is open until then.

## What moves when

| Event | Moves |
|---|---|
| `scorecard.yml` reaches `master` | the weekly run and the SARIF in the Security tab start (code scanning alerts, category `scorecard`); Branch-Protection stays "unknown" in the workflow (the default token cannot read classic rules; no secret is used) |
| the redesign is merged into `master` | Maintained, Security-Policy (`SECURITY.md`), SAST, Pinned-Dependencies and the rest of the file-based checks are read from the redesign tree |
| the owed file edits above | Pinned-Dependencies (actions), Token-Permissions, Dependency-Update-Tool |

## Fork aspect

`Rexoflex/Spixi` is a fork of `ixian-platform/Spixi`. The history of `master`, `dotnet.yml`, the five RocksDB binaries and
`LICENSE` are upstream's, and Scorecard cannot tell them from ours. `dotnet.yml` (push to `master` / `development`) is
left as it is by the earlier rulings, so its two findings (tag pins, no top-level `permissions`) are listed as owed
rather than fixed.

## Re-run

```
# file-based, from a clean copy of the tree (node_modules and ignored files left out):
git ls-files -co --exclude-standard -z | xargs -0 -I{} cp --parents {} /tmp/tree
scorecard --local=/tmp/tree --checks=Binary-Artifacts,Dangerous-Workflow,Dependency-Update-Tool,License,Pinned-Dependencies,SAST,Security-Policy,Token-Permissions,Vulnerabilities --show-details
# the whole set, on a machine with a token that can reach GraphQL:
GITHUB_AUTH_TOKEN=<a read token> scorecard --repo=github.com/Rexoflex/Spixi --show-details
```
