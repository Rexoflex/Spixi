# gate-diff — what it checks, how a row names a change, and its calibration

`node scripts/quality/gate-diff.mjs --base <sha> --head <sha> [--root <dir>] [--json]` (interface I4 of
`docs/contract-qtools.md`). Exit 0 = every item is named · 1 = an item is MISSING · 2 = a commit, the merge base, a head file
or the diff cannot be read, or the arguments are wrong (fail closed). One line per item
`KIND file:line token → row: found (docs/security-handover-gate.md:<n>)` or `→ row: MISSING`, then a summary line and
`GATE-DIFF OK` / `GATE-DIFF FAIL`. The rules in full are in the head comment of the script; this page holds the decisions
and the numbers behind them. Pins: `node scripts/run-pins.mjs pins-qtools/d-gatediff`.

## 1 · The defect class

A batch adds security surface and `docs/security-handover-gate.md` gets no row for it. The handover sweep then has to
discover it instead of reading it (CLAUDE.md ★ SECURITY HANDOVER GATE).

## 2 · Decisions

| Question | Decision | Why |
|---|---|---|
| Range | `git merge-base base head` .. head, added lines only (`-U0 -M`) | For a merge `first parent .. merge` the merge base is the first parent (the calibration ranges). For a pull request, commits the base gained after the branch point are not the batch's |
| Which lines | `Spixi/**` and `src/**` `.cs .js .mjs .html`, `Spixi/*.csproj`; comments blanked, strings kept | Comments carry many `ixian:` / `File.Delete(` words that are not code (k12 of the pins) |
| Built files | `Spixi/Resources/Raw/html/**` and `*.iife.js` skipped; a NEW Raw html file is a `resource-path` item, and its lines are scanned only when it has no `src/shells/` twin | The shell source is scanned; scanning the build too lists every change twice |
| `src/demo/**`, tests, `scripts/**` | not scanned for line kinds | The demo is the plain-browser mock, not packaged; scripts and tests do not ship. A change to `scripts/quality/**`, `.github/**` or `docs/bridge-contract.json` is a `check-changed` item |
| "New" | a literal (verb, key, path) that appears nowhere in the scanned trees at the merge base, comments included, is new; a call (write, fetch, setting, sink) is new on every added line | Moved code does not list old verbs and keys. A call has no stable identity across a move, so a moved call is listed again: a row names it once more (the calibration saw no such case) |
| Verbs | `docs/bridge-contract.json` (I3) at both ends: a new key, or an existing verb with a new sender shell or handler file; UNION the added-line literals `ixian:<name>` | The contract sees verbs the literal scan misses (a composed sender in a shell it parses); the literal scan works before the contract exists and when it is stale |
| `spixi.*` keys (doc trigger) | INCLUDED as `storage-key`, with the native keys of `Preferences` / `SecureStorage` / `SLocalOnlyStore` (`"flag…"` values and `…PrefKey` constants) | Precise (a new literal), and the gate rows always name a key as written: 29 hits on 30 merges, 29 found |
| HTML sinks (doc trigger) | INCLUDED as `html-sink` (innerHTML / outerHTML assignment but `= ''`, insertAdjacentHTML, DOMParser, document.write, eval, new Function, srcdoc …) | 0 hits on the 48 calibration ranges: no cost today. XSS from peer content is the class the gate exists for |
| Log lines (doc trigger) | NOT a kind | 60 new log calls on the 30 merges; 24 of them get their text from a builder (`flagsLine(…)`, `P1Perf.line(HistoryOlderRules.olderReadBody(…))`), so the added line holds no text to name; the rows name a line by its shape (`[FLAGS] fixb5 opusmanaged=<0\|1>`), not as written. A name rule would be loose or would fail most batches. Gate 18 of the smoke holds the log lines that carry user data |
| What names an item | an added gate-doc line with one of the item's names in a code span (`` `…` ``), as written, with no identifier character glued on; per kind the names are listed in the head comment (token; the C# member / JS function; the path forms; a `file:line` within 3 lines; in a NEW C# file, the type in a table row) | Plain-text matching let prose words ("put", "wipe") name file writes. The member, `file:line` and new-type forms are how the rows already name sites (P-store rows name `ChatMediaStoreRules.cs:1277`, the seed rows `SDevSeed.cs:236-237`) |
| Other docs | ONLY `docs/security-handover-gate.md` | The gate doc is the one the handover reads. A packet in `docs/be-review-pack/` that names an item does not count (k11 of the pins); the calibration counts such an item as MISSING and marks it "pack only" |
| Skip token | NONE | The script reads no commit message and no pull request text; a file marker is a comment and is blanked (k10). The answer to MISSING is a row |

## 3 · Calibration on the last 30 merges of `redesign/frontend`

Range per row: first parent .. merge. Run with this script on 2026-11-27 (no `docs/bridge-contract.json` at any of these
commits: the verbs come from the added lines). Kinds: wv = webview-setting, res = resource-path, fw = file-write,
net = network-call, key = storage-key, sink = html-sink, chk = check-changed. Rows found = items named by an added row.

| Merge | Batch | Items per kind | Rows found | MISSING | Read of each MISSING |
|---|---|---|---|---|---|
| `ae7b8303` | #29 fixb5 | key 2 | 2 | 0 | |
| `c211d7de` | #30 quotebox | — | 0 | 0 | |
| `0eda93f5` | #28 walktools2 | chk 1 | 1 | 0 | |
| `14e291b1` | #26 lockb | key 3 | 3 | 0 | |
| `f2641461` | #27 voicefix | — | 0 | 0 | |
| `23c9c495` | #25 docsb2 | — | 0 | 0 | |
| `462ba3e4` | #24 histcs | key 2 | 2 | 0 | |
| `a7d83db7` | #23 fixb4 | key 2 | 2 | 0 | |
| `5d1ec6f1` | #22 walktools | — | 0 | 0 | |
| `f97ad528` | #21 docsb | — | 0 | 0 | |
| `ff5cd4d3` | #20 leanfollow | chk 1 · res 49 | 50 | 0 | |
| `338d30f4` | #18 defaultsb | key 3 | 3 | 0 | |
| `1ad3a44e` | #17 fixb3 | — | 0 | 0 | |
| `c9d6bf64` | #19 photo1b | key 5 | 5 | 0 | |
| `14ae57f2` | #16 photo1a | res 2 · fw 19 · key 4 | 25 | 0 | |
| `55feaddc` | #15 fixb2 | key 2 | 2 | 0 | |
| `c0a76176` | #14 docs-2026-11-17 | — | 0 | 0 | |
| `3066e658` | #12 filewalk | fw 7 | 6 | 1 | `File.Delete` in `SDevSeed.deleteFileChatTmp` (`SDevSeed.cs:631`): TRUE MISS of the doc — the "FILE SEED" row says "the temp leaf in `Sent/` by its exact name" in prose and names neither the member nor the line |
| `06a4845d` | #13 coldstart1 | wv 1 | 1 | 0 | |
| `8b3c4ae4` | #11 fixb1 | key 2 | 2 | 0 | |
| `cdc4f717` | #10 docs-2026-11-16 | — | 0 | 0 | |
| `efcde241` | #9 perfb1toggle | — | 0 | 0 | |
| `55598a82` | #8 perflean | res 1 | 1 | 0 | |
| `a964790c` | #7 docs-2026-11-15 | — | 0 | 0 | |
| `b579ecb3` | #6 perfb1 | fw 6 · key 4 | 10 | 0 | |
| `a54808c6` | #5 walksteps2 | — | 0 | 0 | |
| `7c195242` | #4 docs-2026-11-13 | — | 0 | 0 | |
| `1a9f5e07` | #3 tooling | — | 0 | 0 | |
| `30e7f24a` | #2 docs-2026-11-12 | — | 0 | 0 | |
| `9a5005be` | #1 orch | — | 0 | 0 | |

**Totals (30 merges): 116 hits (key 29 · res 52 · fw 32 · chk 2 · wv 1; verb, net, sink 0) · 115 found · 1 MISSING (a true
miss of the doc) · 0 false positives · 4 misses (below).** Every hit was read against its diff line: all 116 are real
changes of their kind. No merge of the 30 adds an `ixian:` verb, a network call or an HTML sink (checked by a raw grep of the
added lines against each merge's first parent, comments included).

**MISSES — changes of the kinds that the diff shows and the script does not list (4, all one shape: a write through a
helper, not a primitive call; every one has a row that describes it):**

| Merge | Change | Why the script does not see it |
|---|---|---|
| `ae7b8303` fixb5 | the Home decline calls `SContacts.scheduleSentSweep()` and `ChatMediaStore.deleteChat(…)` (deletes files) | a call of our own delete helper; only the File / Directory / FileInfo primitives are a kind |
| `14ae57f2` photo1a | the store's delete calls in seven files that the batch edits (`ChatMediaStore.deleteChat(…)` …) | the same; the store's own primitives (19) are listed |
| `b579ecb3` perfb1 | the dev seed writes chat rows through `IxianHandler.localStorage.requestWriteMessages` | a Core write |
| `3066e658` filewalk | the same Core write for the file seed | a Core write |

Seen in the diffs, NOT one of the kinds (no change made): the `EvaluateJavaScriptAsync("document.readyState")` of perfb1
(a JS evaluation; the row counts "JS evaluations +1"), the launch intent extra `perfb1flags` of perfb1toggle (an input), the
lockfile and `npm ci` of walktools2 (dependencies), pref writes through an existing key constant (fixb4, defaultsb).

**False positives found while calibrating, and the fix (the totals above are after the fixes):**

| Seen | Cause | Fix |
|---|---|---|
| `resource-path voicefile` (`KindVoiceFile = "voicefile"`, filewalk) | the path-constant suffix `File` takes kind tags | the suffix list is `FolderName / Dir / Directory / Path / FileName / Extension / Ext / Prefix / Suffix` |
| `network-call GetAsync` on `SecureStorage` (S16 older range) | `.GetAsync(` is not only HttpClient's | `GetAsync` / `DeleteAsync` / `SendAsync` count only on a receiver named …Http… / …Client… / …Web… |
| `storage-key` for message-text keys (`AddedKey = "chat-group-added-you"`) | any `…Key` constant | only `…PrefKey / StoreKey / SecureKey / StorageKey / SettingKey` constants, `"flag…"` values and literal keys of the three stores |
| file writes in `put` / `wipe` "found" by prose words | plain-text name match | names count only inside a code span |
| nested types took the store's writes out of `ChatMediaStoreRules` | the nearest `class` line above | the types are brace-tracked (comments and strings blanked) |
| (by reading, no hit) `.Language =`, `.Replace(a, b, c)` | a string / culture property, `string.Replace` with a comparison | removed |

## 4 · Older ranges (supplement, not the 30 merges)

The 30 merges add no verb, fetch or sink, so 18 single-commit sessions before the first merge (`commit^ .. commit`) were run
too: **71 items, 39 found, 32 MISSING, 0 false positives** (verb 6 found of 6; webview-setting 6; file-write 33; key 22).

| Commit | Session | MISSING | Read |
|---|---|---|---|
| `68585acc` | HK1 (b): the CI workflow | 1 (chk) | TRUE MISS: the commit added `.github/workflows/redesign-ci.yml` with no gate row |
| `9521f487` | Safety | 11 (fw 8 · wv 3) | PACK ONLY: P33–P37 name `AreDevToolsEnabled`, `AreHostObjectsAllowed`, `pruneShareFolder`, `stageForShare` …; the gate rows say "DevTools off, host objects off" in prose. A miss of the gate doc by this rule |
| `2a469442` | 20G | 8 (fw) | PACK ONLY: P30 names `RestoreMoves.keepPrevious`, `wipeEverything`; the gate section does not |
| `052aac6b` | 17 | 2 (key) | TRUE MISS: `spixi.chat.sentcolour`, `spixi.chat.corners` are in no gate row and no packet |
| `fc8e184c` | 15 | 10 (fw) | PROSE ONLY: the restore rows describe the moves; no row names `RestoreMoves` / `prepareOne` or a line (before the pack existed) |

The six verbs of 13–18 (`ixian:devmoments`, `ixian:moment`, `ixian:openPrivacy`, `ixian:whatsnew`, `ixian:topsurface`,
`ixian:aboutLink`) are all found; S16's new SecureStorage key `walletpass` (`PassKey`) is a MISS of the key patterns (stated in
the script's head). Older sections often name a change in prose or only in the packet: the rule is new, so the first runs on
old ranges fail; from the qtools batch on a section names each item in a code span.

## 5 · What the script can and cannot see

| Sees | Cannot see |
|---|---|
| the added lines of the scanned files, with comments blanked | a verb, key, path or URL composed at run time (`'ixian:' + v`, a variable host) |
| a literal that is new against the merge base | a new use of an old literal; a call whose identifying token is on another line (a FileStream's FileMode on the next line) |
| the primitive calls of the six kinds and the two doc triggers | a write or fetch through a helper (ours or Core's); C# → JS pushes and `EvaluateJavaScriptAsync`; log lines |
| C# WebView settings, hooks and CoreWebView2 events in the listed shapes | a setting through reflection, XAML, a manifest / plist / provider xml, or a helper it does not know |
| new packaged files, new shells, C# path literals and constants, csproj asset items | the packaged content of a build (what MSBuild actually packs) |
| `docs/bridge-contract.json` at both ends (I3) when both parse | a contract whose `verbs` is not an object (falls back to the literal scan and says so in a `note:` line) |
| that an added gate line names the item | whether the row's verdict is right, or that the row naming the member is about this change |
| `Spixi/**`, `src/**`, `.github/**`, `scripts/quality/**`, the contract | Ixian-Core, the push service project, anything outside these trees |

## 6 · How a batch passes

For each MISSING line, add a row to the batch's section of `docs/security-handover-gate.md` that names it in a code span:
the setting, verb, key, path or sink as written; for a write, fetch or JS sink the member / function (`` `Store.saveIt` ``)
or the site (`` `Store.cs:42` ``); for a new store, its class in the verdict row; for a CI change, the file or the
workflow's `name:`. Then run the script again.
