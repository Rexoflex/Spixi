# gate-diff — what it checks, how a row names a change, and its calibration

`node scripts/quality/gate-diff.mjs --base <sha> --head <sha> [--root <dir>] [--json]` (interface I4 of
`docs/contract-qtools.md`). Exit 0 = every item is named · 1 = an item is MISSING · 2 = a commit, the merge base, a head file
or the diff cannot be read, or the arguments are wrong (fail closed). One line per item
`KIND file:line token → row: found (docs/security-handover-gate.md:<n>)` or `→ row: MISSING`, then a summary line; the LAST
line is exactly `GATE-DIFF OK` or `GATE-DIFF FAIL` (not with `--json`). The rules in full are in the head comment of the script; this page holds the decisions
and the numbers behind them. Pins: `node scripts/run-pins.mjs pins-qtools/d-gatediff`.

## 1 · The defect class

A batch adds security surface and `docs/security-handover-gate.md` gets no row for it. The handover sweep then has to
discover it instead of reading it (CLAUDE.md ★ SECURITY HANDOVER GATE).

## 2 · Decisions

| Question | Decision | Why |
|---|---|---|
| Range | `git merge-base base head` .. head, added lines only (`-U0 -M`) | For a merge `first parent .. merge` the merge base is the first parent (the calibration ranges). For a pull request, commits the base gained after the branch point are not the batch's |
| Attributes | the file list from `--name-status -z` (no content); the lines from ONE `-U0 --text --no-ext-diff --no-textconv` diff; `core.attributesFile=/dev/null`; a scanned file with no readable section → exit 2; a `.gitattributes` at any depth is `check-changed` | Without `--text` a committed `-diff` / `binary` (or a NUL byte) prints "Binary files differ" and the file was dropped with exit 0. The tree has 16 `-diff` files of the scanned kinds today outside the built ones (`src/components/icons.js`, the 14 `src/strings/*.js`, `src/styles/chat-pattern.css`) and 43 `.cs` under `Spixi/Platforms/MacCatalyst/RocksDbSharp/`; on the 30 merges `src/strings/*.js` changed 42 times and the first version read none of them (0 items in them) |
| Which lines | `Spixi/**` and `src/**` `.cs .js .mjs .html .css`, `Spixi/*.csproj`; comments blanked, strings kept; tests skipped only OUTSIDE `Spixi/` | Comments carry many `ixian:` / `File.Delete(` words that are not code (k12 of the pins). Every file under `Spixi/` can ship (`SpeedTest.cs`, a `Test/` folder) |
| Built files | `Spixi/Resources/Raw/html/**` and `*.iife.js` skipped; a NEW Raw html file is a `resource-path` item, and its lines are scanned only when it has no `src/shells/` twin | The shell source is scanned; scanning the build too lists every change twice |
| `src/demo/**`, tests, `scripts/**` | not scanned for line kinds | The demo is the plain-browser mock, not packaged; scripts and tests do not ship |
| `check-changed` paths | `scripts/quality/**`, `scripts/lib/**` (the checks import `lean-strip` / `lean-gates`), `scripts/pins-qtools/**`, `.github/**`, `docs/bridge-contract.json`, `package.json`, `package-lock.json`, `.gitattributes` (any depth). NOT `scripts/smoke-test.mjs` | The smoke file changes in 18 of the 30 merges: every pull request would need the row, and the smoke's own gates hold it |
| "New" | a literal (verb, key, path) that appears nowhere in the scanned trees at the merge base, comments included, is new; a call (write, fetch, setting, sink) is new on every added line | Moved code does not list old verbs and keys. A call has no stable identity across a move, so a moved call is listed again: a row names it once more (the calibration saw no such case) |
| Verbs | `docs/bridge-contract.json` (I3) at both ends: a new key, or an existing verb with a new sender shell or handler file; UNION the added-line literals `ixian:<name>` | The contract sees verbs the literal scan misses (a composed sender in a shell it parses); the literal scan works before the contract exists and when it is stale |
| `spixi.*` keys (doc trigger) | INCLUDED as `storage-key`, with the native keys of `Preferences` / `SecureStorage` / `SLocalOnlyStore` (`"flag…"` values and `…PrefKey` constants) | Precise (a new literal), and the gate rows always name a key as written: 29 hits on 30 merges, 29 found |
| HTML sinks (doc trigger) | INCLUDED as `html-sink` (innerHTML / outerHTML assignment but `= ''`, insertAdjacentHTML, DOMParser, document.write, eval, new Function, srcdoc …) | 0 hits on the 48 calibration ranges: no cost today. XSS from peer content is the class the gate exists for |
| Log lines (doc trigger) | NOT a kind | 60 new log calls on the 30 merges; 24 of them get their text from a builder (`flagsLine(…)`, `P1Perf.line(HistoryOlderRules.olderReadBody(…))`), so the added line holds no text to name; the rows name a line by its shape (`[FLAGS] fixb5 opusmanaged=<0\|1>`), not as written. A name rule would be loose or would fail most batches. Gate 18 of the smoke holds the log lines that carry user data |
| Which gate lines | only ADDED lines whose nearest heading above them (outside a code fence) is ALSO added by the diff: the batch's own section or subsection | An edit of an old row ("No `innerHTML`" → one more word) or a line added to an old section counted as found in the first version. Every batch of the 30 writes its own `## Session …` section, so the calibration did not move |
| What names an item | a gate line from the row above with one of the item's names in a code span (`` `…` ``), as written, with no identifier character glued on; the names per kind are in the head comment: the token (settings, verbs, keys, paths, URL hosts); for file-write, network-call and html-sink NOT the API token (`fetch`, `innerHTML`, `File.Delete`, `HttpClient`) but the C# member / JS function, a declared variable of 4+ characters, a `file:line` within 3 lines, or (in a table row) a C# type that is NEW at the merge base | Plain-text matching let prose words ("put", "wipe") name file writes; an API token named every site of the batch ("it never uses `innerHTML`" counted); a row about "the menu label of `SpixiContentPage`" named a new partial file of that old class. The member, `file:line` and new-type forms are how the rows already name sites (P-store rows name `ChatMediaStoreRules.cs:1277`, the seed rows `SDevSeed.cs:236-237`) |
| Other docs | ONLY `docs/security-handover-gate.md` | The gate doc is the one the handover reads. A packet in `docs/be-review-pack/` that names an item does not count (k11 of the pins); the calibration counts such an item as MISSING and marks it "pack only" |
| Skip token | NONE | The script reads no commit message and no pull request text; a file marker is a comment and is blanked (k10). The answer to MISSING is a row |
| Shapes added after review | a type with its namespace (`new System.IO.FileStream(`, `new global::System.Net.Http.HttpClient()`, our own `DevLogTail.cs:108` shape); FileInfo `.CopyTo(` a path-like argument, `.Create()` / `.OpenWrite()` / `.CreateText()` / `.AppendText()` on an instance; `ImageSource.FromUri(`, `UriImageSource`, `UrlWebViewSource`, `new Uri("https://…")`; JS `setAttribute('src', 'https://…')`; CSS remote `url(` / `@import` | each was a stated shape the patterns did not reach (k17, k18) |
| Run as a program | the main-module guard compares `realpathSync` of `process.argv[1]` and of the module | Through a symlinked TMPDIR the base copy of the runner exited 0 with no output (k20) |

## 3 · Calibration on the last 30 merges of `redesign/frontend`

Range per row: first parent .. merge. Run with this script (after review round 1) on 2026-11-27 (no `docs/bridge-contract.json` at any of these
commits: the verbs come from the added lines). Kinds: wv = webview-setting, res = resource-path, fw = file-write,
net = network-call, key = storage-key, sink = html-sink, chk = check-changed. Rows found = items named by an added row.

| Merge | Batch | Items per kind | Rows found | MISSING | Read of each MISSING |
|---|---|---|---|---|---|
| `ae7b8303` | #29 fixb5 | key 2 | 2 | 0 | |
| `c211d7de` | #30 quotebox | — | 0 | 0 | |
| `0eda93f5` | #28 walktools2 | chk 3 | 3 | 0 | |
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
| `55598a82` | #8 perflean | chk 3 · res 1 | 1 | 3 | `scripts/lib/inline.mjs`, `lean-gates.mjs`, `lean-strip.mjs`: NEW RULE — `scripts/lib/**` became a check input with qtools (the checks import it); at the time it fed only the build strip, whose rows name the targets and the script, not the files |
| `a964790c` | #7 docs-2026-11-15 | — | 0 | 0 | |
| `b579ecb3` | #6 perfb1 | fw 6 · key 4 | 10 | 0 | |
| `a54808c6` | #5 walksteps2 | — | 0 | 0 | |
| `7c195242` | #4 docs-2026-11-13 | — | 0 | 0 | |
| `1a9f5e07` | #3 tooling | — | 0 | 0 | |
| `30e7f24a` | #2 docs-2026-11-12 | — | 0 | 0 | |
| `9a5005be` | #1 orch | — | 0 | 0 | |

**Totals (30 merges): 121 hits (key 29 · res 52 · fw 32 · chk 7 · wv 1; verb, net, sink 0) · 117 found · 4 MISSING
(1 a true miss of the doc, 3 of the new `scripts/lib/**` rule) · 0 false positives · 4 misses (below).** 117 + 4 = 121.
Every hit was read against its diff line: all 121 are real changes of their kind. Against the first version: +5
`check-changed` (`package.json` and `package-lock.json` in walktools2, the three `scripts/lib` files in perflean); the
tighter row rule moved no found item to MISSING here (every found file-write is named by its member, a `file:line` or a new
type, never by the API token alone). No merge of the 30 adds an `ixian:` verb, a network call or an HTML sink (checked by a raw grep of the
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
too: **71 items, 36 found, 35 MISSING (36 + 35 = 71), 0 false positives** (verb 6 of 6 found; webview-setting 6;
file-write 33; key 22; resource-path 3; check-changed 1). To re-run:

```sh
for c in 68585acc 9521f487 562366e4 866462e1 652e1973 e3a628d0 2a469442 a43dd4c5 3271eaf0 0ee74d2a 7a7316df c277ec5f \
         35ebb04c 052aac6b e2e84629 fc8e184c 46dc729c e54699bd; do
  node scripts/quality/gate-diff.mjs --base $c^1 --head $c | tail -2
done
```

| Commit | Session | Items | Found | MISSING | Read |
|---|---|---|---|---|---|
| `68585acc` | HK1 (b): the CI workflow | chk 1 | 0 | 1 | TRUE MISS: `.github/workflows/redesign-ci.yml` added with no gate row |
| `9521f487` | Safety | fw 10 · wv 6 · res 1 · key 6 | 12 | 11 (fw 8 · wv 3) | PACK ONLY: P33–P37 name `AreDevToolsEnabled`, `AreHostObjectsAllowed`, `pruneShareFolder`, `stageForShare` …; the gate rows say "DevTools off, host objects off" in prose. A miss of the gate doc by this rule |
| `562366e4` | 20I Drop D | key 1 | 1 | 0 | |
| `866462e1` | 20H Drop B | — | 0 | 0 | |
| `652e1973` | 20H Drop A | — | 0 | 0 | |
| `e3a628d0` | V1A-M Drop 2 | key 2 | 2 | 0 | |
| `2a469442` | 20G | fw 8 · res 1 · key 1 | 2 | 8 (fw) | PACK ONLY: P30 names `RestoreMoves.keepPrevious`, `wipeEverything`; the gate section does not |
| `a43dd4c5` | 20F | key 1 | 1 | 0 | |
| `3271eaf0` | 20 | key 1 | 1 | 0 | |
| `0ee74d2a` | DT-1 P1 | key 2 | 2 | 0 | |
| `7a7316df` | DT-1 round 2 | key 1 | 1 | 0 | |
| `c277ec5f` | 19 | — | 0 | 0 | |
| `35ebb04c` | 18 | verb 1 | 1 | 0 | |
| `052aac6b` | 17 | verb 4 · key 4 | 6 | 2 (key) | TRUE MISS: `spixi.chat.sentcolour`, `spixi.chat.corners` are in no gate row and no packet |
| `e2e84629` | 16 | key 2 | 2 | 0 | (the new SecureStorage key `walletpass` via `PassKey` is a MISS of the key patterns) |
| `fc8e184c` | 15 | fw 14 · res 1 | 2 | 13 (fw) | PROSE ONLY: the restore rows describe the moves; no row names `RestoreMoves` / `prepareOne` / `wipeEverything` or a line (before the pack existed). 3 of the 13 (`SettingsPage.xaml.cs:1668-1685`) were "found" by the bare tokens `File.Delete` / `Directory.Delete` in the first version |
| `46dc729c` | 14 | verb 1 · fw 1 · key 1 | 3 | 0 | |
| `e54699bd` | 13 | — | 0 | 0 | |

The six verbs of 13–18 (`ixian:devmoments`, `ixian:moment`, `ixian:openPrivacy`, `ixian:whatsnew`, `ixian:topsurface`,
`ixian:aboutLink`) are all found. Older sections often name a change in prose or only in the packet: the rule is new, so
the first runs on old ranges fail; from the qtools batch on, a section names each item in a code span.

## 5 · What the script can and cannot see

| Sees | Cannot see |
|---|---|
| the added lines of the scanned files, with comments blanked | a verb, key, path or URL composed at run time (`'ixian:' + v`, a variable host) |
| a literal that is new against the merge base | a new use of an old literal; a call whose identifying token is on another line (a FileStream's FileMode on the next line) |
| the primitive calls of the six kinds and the two doc triggers | a write or fetch through a helper (ours or Core's); C# → JS pushes and `EvaluateJavaScriptAsync`; log lines |
| C# WebView settings, hooks and CoreWebView2 events in the listed shapes | a setting through reflection, XAML, a manifest / plist / provider xml, or a helper it does not know |
| new packaged files, new shells, C# path literals and constants, csproj asset items | the packaged content of a build (what MSBuild actually packs) |
| every changed file, whatever its attributes (`--text`; a file it still cannot read is exit 2) | a diff driver it does not neutralise (none known: `--no-ext-diff --no-textconv --text`) |
| `docs/bridge-contract.json` at both ends (I3) when both parse | a contract whose `verbs` is not an object (falls back to the literal scan and says so in a `note:` line) |
| that a line of the batch's own section names the item | whether the row's verdict is right, or that the row naming the member is about this change (a log-line row that names the member counts for a write in it) |
| `Spixi/**`, `src/**`, `.github/**`, `scripts/quality/**`, the contract | Ixian-Core, the push service project, anything outside these trees |

## 6 · How a batch passes

For each MISSING line, add a row to the batch's OWN section of `docs/security-handover-gate.md` (a heading the same change
adds) that names it in a code span: the setting, verb, key or path as written, a URL's host; for a write, fetch or sink
the member / function (`` `Store.saveIt` ``) or the site (`` `Store.cs:42` ``) — the API name alone (`fetch`, `innerHTML`)
does not count; for a new store, its new class in the verdict row; for a check change, the file or the workflow's
`name:`. Then run the script again.
