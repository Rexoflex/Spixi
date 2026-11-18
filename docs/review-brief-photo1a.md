# Review brief — photo1a: media after the first paint, fewer file checks, thumbnails and waveforms made once, one walk step (#1715–#1734)

File name: `docs/review-brief-photo1a.md`. Work order for the #46 loop of session "Photo open 1a" (2026-11-17). Written
BEFORE round 1. Readers by Damir's standing rule **#1606**: the security-only pass (PO-3, PO-6, every new log line) and
the reader of the riskiest file (`Spixi/Utils/ChatMediaStoreRules.cs` + `ChatMediaStore.cs`: derived files at rest) are
fresh read-only **Claude Fable 5.2** instances; every other reader is a fresh read-only **Claude Opus** instance; all at
high effort; no fallback below the named model — stop and report. The builder of PO-3 never reviews it (#1471). Not
CLEAN at round 5 → stop. Between rounds: the affected pins (#1503); the full smoke once after the last fix. Verdict: § 5.

## 1 · What the batch is
Rulings #1641 (the batch), #1642 (images by URL = a later batch; do not block it), #1643 (150 ms for a photo-heavy chat).
Damir, main chat 19:40: the main problem is MEMORY with many images, and the image work must be "rock solid": for the
store, correctness comes before speed — **a wrong, stale or foreign picture (or waveform) is a MAJOR finding**.

| Item | What landed | Files | Switch |
|---|---|---|---|
| PO-0 | Three developer-only lines through `P1Perf.line`: `[P1] chat onload-main ms=`, `[P1] chat read rows= passes= ms=`, `[P1] chat media thumbs= hit= pre= voice= vpre= held= q=` (once per document, 2 s after the present); the `[FLAGS] photo1a …` line (all builds) | `SingleChatPage.xaml.cs` (R1), `PhotoOpenRules.cs`, `SpixiFlags.cs` | none (dev lines) |
| PO-1 | An open's thumbnail, waveform and offer-preview jobs are held until the shell's paint signal (or the 400 ms backstop, or at once when the paint was seen); the thumbnail / waveform push text is built off the main thread (byte-identical to `Utils.sendUiCommand`) | `SingleChatPage.xaml.cs`, `PhotoOpenRules.cs` | `PhotoMediaAfterPaint` |
| PO-5 | One file-check pass per row (`SharedItems.localArgOf` overload with the path; `fileSizeArgOnce`); the re-check after the pushes only when an in-app delete notification moved a generation counter during the load; the 1:1 avatar and the row preferences read once per load (a `[ThreadStatic]` row cache scoped to the batch) | `SingleChatPage.xaml.cs`, `SharedItems.cs`, `PhotoOpenRules.cs` | `PhotoFewerFileChecks` |
| PO-3 | The 320 px thumbnail kept in the app cache (`<CacheDirectory>/spixi-media1/<acct>/<chat>/<hash>.t1`, a header with the key hash, a source tag, the payload length and hash); a true LRU of 128 JPEG byte arrays; one store call in each delete path; Android only | `ChatMediaStoreRules.cs`, `ChatMediaStore.cs`, `SingleChatPage.xaml.cs` (R2: `chatThumbFor`), the delete paths (`SContacts.cs`, `SettingsPage.xaml.cs`, `ContactDetails.xaml.cs`, `DownloadsPage.xaml.cs`, `LaunchPage.xaml.cs`, `UIHelpers.cs`, SCP `deleteMessage`) | `PhotoThumbStore` |
| PO-6 | A voice row's `durMs|peaks` kept by the same store (`.v1`); the open reads it instead of the Opus decode; Android only | the same + `voiceInfoFor` | `VoicePeaksStore` |
| W | Opt-in walk steps `open-seed` (`-SeedIndex`, a proven restart + a cold rep + warm reps per index) and `mem-photos` (last); parser rows (new rows not required); the hashed pins re-based | `scripts/device/adb-walk.ps1`, `adb-walk-parse.ps1`, `scripts/pins-photo1a/c-walk.mjs`, `scripts/pins-filewalk/b-walk-steps.mjs`, `scripts/pins-perfb1toggle/b-walk.mjs` | — |
| T | CSH `PhotoOpenTests` (19), `ChatMediaStoreTests` (57); pins `pins-photo1a/a-open`, `b-store`, `c-walk`; the re-based keys of the existing pins the batch breaks on purpose | `scripts/csh/**`, `scripts/pins-*` | — |

**After round 2 (2026-11-18): PO-3 and PO-6 are PARKED** (the Fable 5.2 limit, #1719): not in the branch; `docs/parked/photo1a-po3-po6.patch` + `docs/parked/photo1a-po3-po6.md` (the open round-2 findings G1–G7). Rounds 3+ read the branch without them.

Not built: anything under `src/` or the built html (the shell half is "Photo open 1b"); a URL handler (#1642).

## 2 · How to run
- Tree: `/home/claude/spixi`, branch `work/photo1a`, the WORKING TREE (uncommitted) on base `redesign/frontend` @
  `c0a76176` ("Merge pull request #14 from Rexoflex/work/docs-2026-11-17"). The diff: `git -C /home/claude/spixi diff
  HEAD -- Spixi scripts` plus the untracked files (`git status --short`). The contract `docs/contract-photo1a.md` (§ 3
  interfaces, § 4 the store rules) and `docs/photo1a-mechanisms.md` are the claims to attack.
- Baseline: `redesign-ci` on `3066e658` and `c0a76176`: `BASELINE OK — 6564 pass / the 2 KNOWN`, CSH 633. Now: CSH
  `pass=709 fail=0` (633 + 19 + 57) · gates ✓ · `cs-syntax-check` 283 files ✓ · tools jsdom 29.1.1, .NET SDK 10.0.115,
  PowerShell 7.4.6 (B3's dry runs). Ixian-Core @ `097341a` at `/home/claude/Ixian-Core` (read-only).
- A reader READS. It may run pin modules (`node scripts/run-pins.mjs --root <copy> <dir/mod>`), the C# harness and
  `pwsh` dry runs with a fake adb (`ADBWALK_ADB`) in a COPY of the tree under `/home/claude/_review/<its name>/` (with
  `ln -s /home/claude/Ixian-Core /home/claude/_review/<its name>/Ixian-Core`), and only while `pgrep -f smoke-test.mjs`
  prints nothing. It never contacts a phone, installs nothing, changes no file of the tree, uses no scheduling tool.
- ⚠ The MAUI files are compiled by no machine in the cloud: read them as a compiler would (the pure rules compile and
  run in the harness; Windows compiles in `redesign-ci`; Android in the operator block; iOS / Mac in the Apple phase).

## 3 · Auditor scopes (disjoint)
| Auditor | Model | Scope (files) | Focus |
|---|---|---|---|
| S-store | Fable 5.2 | `ChatMediaStoreRules.cs`, `ChatMediaStore.cs`, SCP `chatThumbFor` / `voiceInfoFor` and their helpers, `ChatMediaStoreTests.cs` | the six rules of contract § 4: names from hashes only; the cache area; never stale, never foreign (account, chat, id, source version, torn writes, concurrent puts, the OS deleting the cache, a sender-chosen duplicate id); the bound; the LRU; nothing new crosses the bridge; the OFF path byte for byte |
| S-delete | Fable 5.2 | every delete path (`SContacts.cs`, `SettingsPage.xaml.cs`, `ContactDetails.xaml.cs`, `DownloadsPage.xaml.cs`, `LaunchPage.xaml.cs`, `UIHelpers.cs`, SCP `deleteMessage`) + every NEW log line of the batch (`[P1] chat …`, `[FLAGS] photo1a`) | is a delete path missing (search the whole `Spixi/` tree for message / file / history / contact / account deletion)? does each call delete the right thing at the right time (after the delete, not before; no wipe of a folder that is not the store)? the late-put guard; the log lines carry fixed words and integers only, developer builds only |
| C-open | Opus | SCP region R1 (PO-0, PO-1, PO-5), `PhotoOpenRules.cs`, `SharedItems.cs`, `PhotoOpenTests.cs` | correctness and threads: the hold (open / hold / release / drop across onLoad, loadMessages, onPainted, the backstop, a reload, a load-more, a disposed page, a second open); no media lost, none sent twice, none sent to the wrong document; the command text is byte-identical; PO-5's arguments byte-identical with the switch ON and OFF; the re-check rule's lost cases; the row cache's lifetime |
| C-walk | Opus | `adb-walk.ps1`, `adb-walk-parse.ps1`, `pins-photo1a/c-walk.mjs`, the two re-based walk pins | #1522 (one package, the allowlist, the filter on the phone, no address in files, no typed input, no new verb); the proven restart; the old steps byte-identical; the new rows not required; the masks |
| P | Opus | `pins-photo1a/a-open.mjs`, `b-store.mjs`, the re-based keys of the existing pins | does each pin fail when the behaviour breaks? a deliberate break per key; derived, not author-listed cases |
| B (each round) | Fable 5.2 | the fixes of the round + the claims of § 4 | break-my-verdict |

## 4 · Non-negotiables and accepted dials
- Must hold: the PARAMOUNT isolation invariant · C# touches no risky parts · no WebView or network value as a path or a
  name · no URL / address / name / text / path in a log line · no new verb, push argument, `spixi.*` key, fetch · each
  change its own switch, OFF = the old path byte for byte (#1478) · no file under `src/` or the built html.
- Accepted (do not re-open): the store is Android only (contract § 4.7) · the shell half is a later batch (#1641) · the
  thumbnail stays a base64 data URI on the bridge (images by URL = #1642).

## 5 · Verdict
**CLEAN NOT CLAIMED at round 5** (2026-11-18 ~03:00): round 5 found 1 MAJOR — a PIN gap, not a code defect. By the
prompt ("not CLEAN at round 5 → stop") and rule 9 of the lead skill (three rounds in a row found a new class of hole in
the hand-written source pins), the batch is NOT delivered: no push. The question to Damir is DECISIONS #1724.

| Round | Readers (model) | MAJOR | Where | Fixed by |
|---|---|---|---|---|
| r1 | S-store (Fable 5.2), S-delete (Fable 5.2), C-open (Opus), C-walk (Opus) | 2 | the store: the 60 s late-put timer; derived files left by a declined request and others | Fable builder (generations, sweep, direct calls); Opus (open-path MINORs); Sonnet (walk MINORs) |
| r2 | break-my-verdict (Fable 5.2), C-open + walk (Opus) | 1 + 1 | the store: links under the per-key paths (G1); stale pins after the fixes | the store: NOT fixed — the Fable 5.2 limit (#1719), PO-3 / PO-6 parked; pins re-based (Sonnet); walk warm-up key (Sonnet) |
| r3 | code + walk (Opus), pins P (Opus) | 0 code · 4 pins | a11 read `git show HEAD:`; S20 E and A5 `candidate` held only the else copies; the smoke line (already added after the snapshot) | Sonnet (pins); lead (two small code fixes: delete-all bumps per file; the counting only in dev builds) |
| r4 | break-my-verdict (Opus) | 0 code · 1 pin | a7: `bool avatarFinal = false;` → `true` stayed green | Sonnet (pins) |
| r5 | break-my-verdict (Opus) | 0 code · 1 pin | the `RowCache` class (the once-values' lifetime) is held by no key (`once = sharedOnce` stays green) | — (last round: not changed, rule 8) |

**Round 5 findings, recorded (not changed — the code files are byte-identical to the round-5 reader's tree; SHA-256
below):** M-1 (MAJOR, pin) the `RowCache` lifetime: hold the class whole and `count('new PhotoOpenRules.LoadOnce(') ===
1` · m-1 (MINOR, pin) `owner = null!` makes PO-5 silently off (covered by the M-1 fix) · m-2 (MINOR, pin) `int readRows =`
can move after the trim · m-3 (MINOR, brittle pin) `fPathWrites` / `avatarFinalWrites` count over the whole page: count
inside `insertMessage` · n-1 the new `localArgOf` overload body unpinned (unreachable) · n-2 `MediaHold.release` without
`held.Clear()` keeps released closures until the next open (memory; add `count == 0`) · n-3 whole-text keys break on an
equivalent refactor (the house method; recorded). **No code defect was found in rounds 3, 4 and 5** (three fresh Opus
readers over PO-0 / PO-1 / PO-5 / W). The security-only pass (Fable 5.2) read PO-0's log lines in rounds 1 and 2 with no
finding; after round 2 the `[FLAGS]` line only lost two fixed tokens; no Fable reader read the branch after round 2 (the
limit).

**After round 5, the full smoke** (the last gate): **The full smoke of the final tree (2026-11-18 03:00–03:50, cloud twin, jsdom 29.1.1, TZ=America/Los_Angeles): 6588 pass + 2 red + the 2 KNOWN — NOT `BASELINE OK`** (expected 6590 = 6564 + 26). The two red rows are inline / module pins that the affected-pin runs did not select (L236): (1) the inline N51 pin `smoke-test.mjs:13167` requires `private void onLoad() { shellOverlayOpen = false;` — PO-0's `long onloadT0 = P1Perf.now();` now stands before it (direction: move the clock after that statement, or re-base N51 naming the clock); (2) `pins-s15/c-transport` (S15 O-11, a SECURITY pin): `Utils.sendUiCommand` must be the only composer of `executeUiCommand(` in `Spixi/` — PO-1's `PhotoOpenRules.uiCommandText` is a second composer (byte-identical, base64 of every argument, csh-proven), so the pin's rule "a value C# did not encode can no longer reach a JS literal" needs a security view (direction: route `sendUiCommand` itself through one shared builder, or a Fable 5.2-read re-base that admits exactly that builder). Both are code / pin changes after the last round: not made (rule 8). 

Code files as the round-5 reader read them (SHA-256): `SingleChatPage.xaml.cs` 2fd34e1c… · `PhotoOpenRules.cs`
cc61527d… · `SharedItems.cs` 5edff441… · `SpixiFlags.cs` b89f31b4… · `DownloadsPage.xaml.cs` d8bfebe6… ·
`SettingsPage.xaml.cs` b7dd346e… · `adb-walk.ps1` 2fc646d6… · `adb-walk-parse.ps1` 319d7f18….
