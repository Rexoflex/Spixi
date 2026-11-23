# P77 · THE THIRD-PARTY LICENCE TEXTS IN THE APP PACKAGE (batch leanfollow)

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| LOW (49 plain-text files added to the package; no code, no verb, no sink) | no | none | **none** (see below) | 3 min |

**Look here first:** `Spixi/Resources/Raw/licenses/` (49 `.txt` files) · `docs/legal/third-party-notices.md` (method and limits `:18`, inventory `:96`, notices `:154`) · `docs/legal/third-party-inventory.json` · pin `scripts/pins-leanfollow/a-notices.mjs` (13 rows).

**DECISIONS:** #1625 (1) (the launch need) · this batch #1775, #1780, #1781.

## What and why
- **Why.** The package ships third-party code, fonts, icons and sounds (the built html folder: 40 files, 9 data-URLs; the NuGet natives; code compiled in from Ixian-Core). Several licences ask that their text goes with the binary. Before this batch most texts were not in the package.
- **What.** ONE inventory (37 components) against what ships, and a NEW folder `Spixi/Resources/Raw/licenses/`. Each file = a 3-line header (component · licence · the source URL or package@version of the text and its upstream SHA-256), an empty line, then the exact upstream text. The existing `MauiAsset Include="Resources\Raw\**"` packs it; the csproj pack list is unchanged.
- **Facts, not legal judgement.** Where a version, a source or a licence choice cannot be proven from the tree, the doc says **UNPROVEN — question for Damir** and guesses nothing. No third-party code is removed or replaced.
- **No switch.** Nothing runs: the files are read by nobody in the app. A switch could only leave a text out of the package.

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| A text in the package changes, or a file is added or lost | the pin holds each text whole by SHA-256 and the folder list frozen | `a-notices` rows (component table, `licenceFiles` table, per-file hash) |
| The built html folder changes | the texts are OUTSIDE `Raw/html`; nothing in the html pipeline reads them | `diff -r` base ↔ branch of `Raw/html`: no difference (#1780); `build-shells --check` ✓ |
| A WebView page reads a licence file | possible (same package as `Raw/html`), and harmless: public text, no script, no secret, no user data | — (recorded, not a defence) |
| A shipped component has no row | the inventory is built from scans of what ships; the scans and their limits are written down | notices `:18` "Method and its limits" (7 classes NOT covered) |

## Recorded limits
- The inventory covers what its stated scans find; the "Not covered" list (notices `:18`) names what was not scanned. A component of an uncovered class is a NIT by #1735, not a defect of this packet.
- The UNPROVEN list goes to Damir (status doc `claude/session-leanfollow-status.md`), not to the BE engineer.

## NOT proven
No device build in the session: that the packed files appear in each platform's package is by the wildcard rule only.
