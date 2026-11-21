# Review brief — fixb3 (Fix batch 3) (#1810–#1824)

Work order for the #46 adversarial loop (docs/process.md). Written BEFORE round 1 by the lead (Claude Opus, #1612 /
#1640). The verdict is written back into § 5 when the loop closes (#660). Readers by #1606: the security-only pass (items 1
and 2: the mini-app guard and its log lines; the delete path) → ONE fresh read-only **Claude Fable 5.2** reader per round,
one at a time (the Fable limit is shared with session `defaultsb`; a limit stop = stop and report, no fallback); every
other reader (items 3 + 4, the pins) → a fresh read-only **Claude Opus**. Builders never review their own part.

## 1 · What the batch is
| Item | What landed | Where (files) | Switch / packet |
|---|---|---|---|
| 1 · mini-app action before `ixian:onload` (#1744 (4)) | a guard at the top of `handleAction`: no handler yet → refused "not ready" (one fixed line with the command NAME only, the existing `SpixiAppSdk.ar` reply for storage / payment, no dialog, no exception); both catches log `<fixed words> (<name>, <exception type>)` — never the action text, an argument, `e.Message` or `e.ToString()` | `Spixi/Pages/MiniApps/MiniAppPage.xaml.cs` (`handleAction` + its two catches), NEW `Spixi/Utils/FixB3Rules.cs`, csh `FixB3GuardTests.cs` | none — hole-closing (#1321) · P84 |
| 2 · "Delete history" on Windows (#1744 (3)) | after a successful delete, chat info re-scans and pushes `setSharedItems` again (an empty list: the shared section goes); a scan generation drops a late older scan; chat info uses `SContacts.removeHistory` (one body; adds the Sent-copy sweep that this path missed); the chats-list delete tells an open chat-info page of that contact | `Spixi/Pages/Contacts/ContactDetails.xaml.cs`, `Spixi/Pages/Home/HomePage.xaml.cs` (`onRemoveHistoryFor`), NEW `Spixi/Utils/FixB3ChatInfoRules.cs`, csh `FixB3ChatInfoTests.cs` | none — hole-closing (#1321) · P85 |
| 3 · walk step `downloads` scrolls (#1739 (3)) | after the Account tab: one fixed swipe from the map, a screen check of the scrolled hub (PNG deleted), only then the tap; four map keys gate it; the calibrate keeps one picture of the scrolled hub | `scripts/device/adb-walk.ps1`, `adb-walk-parse.ps1` | opt-in step · P86 |
| 4 · walk step `history` on a dev-seed chat (#1742 (2)) | `-HistorySeed <k>`: a proven restart per rep, the derived address, one page request, own step name and rows; without it everything is byte-identical | the same two scripts | opt-in · P86 |

Not built: the shell half of the chat-info sheet (a "Delete media & files" box, Q-2: `src/**` is session photo1b's area).

## 2 · How to run
- Tree: your read-only copy (the lead gives its path); range = the working-tree diff against `14ae57f2`
  (`git diff 14ae57f2 -- <files>`). Pipeline: none (C# + scripts only; no html changes) · smoke before: `BASELINE OK 6660 /
  the 2 KNOWN` (observed by the lead on the base, 2026-11-18, `TZ=America/Los_Angeles`) · CSH 766 on the base · Ixian-Core
  @097341a beside the copy.
- ⚠ MAUI C# is UNCOMPILED in the cloud (`MiniAppPage`, `ContactDetails`, `HomePage`); CI compiles Windows. The pure rules
  run in the harness: `node scripts/run-csh.mjs`.
- Single pins: `node scripts/run-pins.mjs --root <copy> pins-fixb3/<mod>`. Never the full smoke.

## 3 · Auditor scopes (disjoint)
| Reader | Model | Scope (files) | Focus |
|---|---|---|---|
| S (security-only) | Fable 5.2 | items 1 + 2 whole: `MiniAppPage.xaml.cs` (`handleAction`), `FixB3Rules.cs`, `ContactDetails.xaml.cs` (`onRemoveHistory`, the shared-items path), `HomePage.xaml.cs` (`onRemoveHistoryFor`), `FixB3ChatInfoRules.cs`, `SContacts.removeHistory` (read), the csh tests, pins `a-miniapp-guard`, `b-delete-history`, the re-based pins of these files | can ANY byte of a mini-app action, an argument or an exception message reach the log (or a new sink)? Does the guard change state, throw, or reach the handler / storage / a dialog before onload? Is a not-ready reply a new channel? Does any confirm / payment / name action path change? Delete: can the re-scan show or keep deleted data, push another contact's items, run on a disposed page, race the boot scan, or delete a file it must not (the Sent sweep's rule)? Any new verb, push name, key, fetch, WebView setting, log value? The gate lens: introduced vs inherited |
| O1 (walk) | Opus | items 3 + 4: both scripts, pin `c-walk`, the re-based `pins-perfb1toggle/b-walk`, `pins-filewalk/b-walk-steps`, `pins-photo1a/c-walk` | no tap without a passed check; no Account PNG kept; the four keys gate the step; the calibrate never taps before both keys; `-HistorySeed`: usage errors before any adb call, the derived address, a proven restart or a halt, zero pages = no data; old steps and rows byte-identical; PowerShell 5.1 syntax; the allowlist |
| O2 (pins) | Opus | every new and re-based pin + the csh tests | does each key fail when its behaviour breaks (derived cases, not author-listed)? Are the re-bases the smallest honest change? Does each source pin state its limits (#1735)? |

## 4 · Non-negotiables and accepted dials
- Must hold: the PARAMOUNT isolation invariant · C# touches no risky parts · no URL / address / name / text / message in
  logs · the frozen bridge (no new verb, push name, cap, key) · #1522 (no `input text`, the allowlist, one package, the
  on-phone log filter, masks) · #1521 (no new entry into the app) · the fixb2 confirm sites of `handleAction` unchanged.
- Accepted (do not re-open): #1744 (3), (4), #1739 (3), #1742 (2) (Damir) · #1735 (a source-pin gap of a stated class is a
  NIT) · the legacy of P61 (6) that stays: the error alert shows the action text, `e.Message` goes back to the same mini
  app (both not the log; recorded in P84).

## 5 · Verdict
**CLEAN** — the security pass at S r4 (0 MAJOR, 0 MINOR), the walk at r4 (0 MAJOR; its one MINOR recorded with its reason in P86). The code files are byte-identical to what the last readers read (SHA-256 list `/home/claude/review/r4-tree.sha` of the lead's session: `MiniAppPage.xaml.cs`, `FixB3Rules.cs`, `ContactDetails.xaml.cs`, `HomePage.xaml.cs`, `FixB3ChatInfoRules.cs`, `SharedItems.cs`, `adb-walk.ps1`, `adb-walk-parse.ps1`). After S r4 only docs changed.

| Round | Reader (model) | Scope | MAJOR / MINOR / NIT | Fixed by |
|---|---|---|---|---|
| r1 | O1 (Opus) | walk (items 3 + 4) | 1 / 4 / 6 — M1 cal-17s kept after a pass; m1 inserted statements in new functions held only by raw hashes; m2 b8 calibrate scan too narrow; m3 zero pages could give a number; m4 the probes must pin the scroll | fixer-c (Sonnet) + the lead (EnsureHome before the restart, as open-seed) |
| r1 | S (Fable 5.2) | security, items 1 + 2 | 2 / 3 / 7 — M-1 the catch-line tests miss an inner exception (CODE right); M-2 pin b holds `pushSharedItems` by fragments (CODE right); m-1 the stale `lastScan` cache; m-2 a viewer decode in flight; m-3 Sent copies under 10 min | fixer-12 (Opus) |
| r2 | O2 (Opus) | walk + the tests of items 1 + 2 | 0 / 2 / 5 — m1 added single lines and the usage block not held (same class as r1 m1); m2 cal-17s after an exception | fixer-w2 (Sonnet) |
| S r2 | S2 (Fable 5.2) | security, items 1 + 2 | 0 / 1 / 8 — m-1 the push target `page` of two branches held by no pin; n-1 empty the cache at delete time; n-4 the sweep's 600 s held by no pin; n-5 the handler's own log calls | fixer-f3 (Opus) |
| r3 | O3 (Opus) | walk | 0 / 1 / 3 — m1 a zero-page rep gave scroll rows | fixer-w3 (Sonnet) |
| S r3 | S3 (Fable 5.2) | security, items 1 + 2 | 0 / 1 / 7 — m-1 two branches still held by fragments (a deconstruction / a shadow passed); n-1 `exceptionWord`'s rule held by the hash only; n-3 the directive regex; n-2, n-4 … n-7 docs / records | the lead (pins, tests, docs only; the C# bytes unchanged) |
| r4 | O4 (Opus) | walk | 0 / 1 / 3 — m1 the long calibrate notes are cut to 120 characters in `calibrate.json` (RECORDED in P86 with its reason: the lead fills the keys from the pictures by the header rule); n2 / n3 docs (P86) | — (walk CLEAN at r4) |
| S r4 | S4 (Fable 5.2) | security, items 1 + 2 (the r3 pin / test changes first) | **0 / 0 / 7** — all NIT, recorded: n-1 a non-`\n` line terminator (U+0085, U+2028, a lone CR) can hide code from k8 / k9 (the #1627 class of deliberately hidden code; the Windows compile and the diff review see it) · n-2 the ASCII rule is held by behaviour for the first character only (k6 holds the file) · n-3 k9 is red on a comment line that starts with `#` (fails safe) · n-4 a second tap of the SAME token in the one-scan window can re-arm an old decode (P85) · n-5 / n-6 docs ahead of / behind the tree (fixed at export) · n-7 Core: no chat folder → Delete history clears nothing (P85, inherited) | — |

Every MINOR of every round is fixed or recorded with its reason (P84, P85, P86). Pin limits are stated in each module (#1735).

**After the verdict (the final smoke, 2026-11-21/22):** 6691 pass + the 2 KNOWN + 1 red row, `pins-s5/p0` `P0 #1155 (4)` (it counted two
`deleteHistory()` call sites; item 2 left one, in `SContacts.removeHistory`, which still forgets the address). Re-based to the one site
after a look at the diff (green alone 5 / 5; removing the forget there turns it red). No code file changed. Expected in `redesign-ci`:
`BASELINE OK 6692 / the 2 KNOWN` = 6660 + 32.

