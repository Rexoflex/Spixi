# Review brief — imgurl (#2035–#2059)

File name: `docs/review-brief-imgurl.md`. Work order for the #46 adversarial loop (`docs/process.md`). Written BEFORE
round 1. The VERDICT is written back into § 5 when the loop closes (#660). Readers are fresh and read-only (#1471): they
get this brief and the tree, never the lead's chat. Models by #1606 and the prompt: **Claude Fable 5.2** for the
security-only pass (every round) and for the handler files (where an error costs most, #1642); **Claude Opus** for every
other reader.

## 1 · What the batch is
| Item | What landed | Where (files) | Switch · packet |
|---|---|---|---|
| 1a the media handler + the grant table (P-25) | chat pictures by a local URL that C# serves from bytes it holds itself; a random 128-bit token per (WebView, document, kind, id, px); one owner per grant (reference identity, weak keys); revoked with the document / the page / the handler; `no-store`, `nosniff`; a request the handler does not serve gets a 404, never the network; never for a mini-app WebView | `Spixi/Utils/MediaGrants.cs` (new) · `Spixi/Platforms/Android/WebViewRenderer.cs` · `Spixi/Platforms/Windows/WindowsWebViewHandler.cs` · `Spixi/Platforms/iOS/iOSWebViewHandler.cs` · `Spixi/Platforms/iOS/MediaSchemeHandler.cs` (new) · `Spixi/Spixi.csproj` (one Mac `Compile Include` line) | `ImgurlFlags.MediaOrigin` · P113 |
| 1b the chat page's call sites | the viewer answer, then the thumbnail push, carry the URL on the EXISTING pushes `viewerImage` / `setFileThumb`; a refused grant = the data: URI of the same bytes; `beginDocument` at each onLoad, `revokeOwner` at the teardown; two cap words `mediaOrigin` / `mediaKeep` in `setCaps` | `Spixi/Pages/Chat/SingleChatPage.MediaOrigin.cs` (new partial) · `SingleChatPage.xaml.cs` (+ the R6 move to `SingleChatPage.Bot.cs`, #2055) (5 call-site lines) · `Spixi/Utils/ViewerImage.cs` (a bytes form) · `Spixi/Utils/MediaPushRules.cs` (new) | `MediaOrigin` (+ `MediaKeep` for its cap) · P113 |
| 1c the chat shell + the keeper | ONE predicate accepts the URL grammar (both prefixes, 32 lower hex) only with the cap; every sink that turns a preview into an `<img>` src uses it; lazy/async decode; a failed load = today's face; the keeper adopts decoded `<img>` elements (≤ 64) across re-renders; the viewer's URL failure = today's toast | `src/shells/chat.html` · `src/components/media-bubble.js` · `media-viewer.js` · `message-bubble.js` · `composer.js` (quote tiles) · the built html | `MediaKeep` (cap) · P114 |
| 2 P-14 the trim hook (Android 14+) | `OnTrimMemory` (base first): BACKGROUND (40) drops the parked page and the spare unless kept for a short sleep; ≥ 60 both; below 40 nothing; dev log `[TRIM]` (R5) | `Spixi/Platforms/Android/MainApplication.cs` · `Spixi/Utils/TrimRules.cs` · `Spixi/Utils/SpixiContentPage.Life.cs` | `TrimHook` · P115 |
| ~~3 P-15 the renderer-death handler~~ | REMOVED by #1972 (round 6): code, switch, pins, tests, packet P116 | — | — |
| ~~4 #1969 the Windows page store~~ | REMOVED by #1972 (round 6): code, switch, pins, tests, packet P117; its own batch `winstore` | — | — |
| switches | `ImgurlFlags` (three bits: `MediaOrigin`, `MediaKeep`, `TrimHook`; absent = ON, a stored 0 acts only in dev mode; one `[FLAGS] imgurl …` line) | `Spixi/Utils/SpixiFlags.cs` | — |
| pins / harness | `scripts/pins-imgurl/<a-handler (30) · b-page (11) · c-shell (15) · d-life (6)>` (+ by hand: `a-handler-breaks.mjs`, `lab-media.mjs`) · csh `MediaGrantsTests` (33) · `MediaPushTests` (9) · `LifeTests` (6) · `ImgurlFlagsTests` (3) | | |

Not built, and why: the chat-info viewer (`ContactDetails`, another WebView; its own caps and lifetime) · offer previews
and the photo picker strip (stay data:) · the chat-info pool (P-35, not in the tree). (Item 3, the renderer-death handler, left
by #1972.)

## 2 · How to run
- Tree: the cloud twin `/home/claude/spixi`, branch `work/imgurl` (working tree) on `redesign/frontend` @ `ae7b8303`
  ("Merge pull request #29 from Rexoflex/work/fixb5"); range = `git diff ae7b8303` + the untracked files
  (`git status --short`). Readers: copy the tree first (`cp -a /home/claude/spixi /home/claude/review/<you>`), work only
  in your copy, run only single pin modules (`node scripts/run-pins.mjs pins-imgurl/<mod>`) and `node scripts/run-csh.mjs`
  in YOUR copy — never the full smoke, never in `/home/claude/spixi`.
- Pipeline: FULL (bundle BEFORE shells) · smoke before: `BASELINE OK 7094 / the 2 KNOWN` · CSH before 919 · Ixian-Core
  @ `097341a` beside the tree · `TZ=America/Los_Angeles`.
- Known failures: the 2 KNOWN (#136 · B3).
- ⚠ C# UNCOMPILED: Android, iOS, Mac files (nobody compiles them before Damir's build); Windows: CI compiles it. Read
  platform API calls against the real MAUI / Android / WebView2 / WebKit API.

## 3 · Auditor scopes (disjoint) — rounds 1–5 (history: items 3 / 4 left by #1972; round 6's scopes are in § 6)
| Reader | Model | Scope (files) | Focus |
|---|---|---|---|
| S security-only | fable | the WHOLE delta | the PARAMOUNT isolation invariant (a grant of one WebView answers in another? a mini app? another chat, the spare, a split pane?) · a WebView value reaching a file op · a request that reaches the network · a token / id / path in a log · the old path when a switch is OFF · the gate triggers (resource paths, the iOS scheme handler + rule-list exception, the user data folder, the env variable inherited by child processes, log lines) · the dev-only crash door of P-15 in a store build |
| H handler files | fable | `MediaGrants.cs`, `MediaSchemeHandler.cs`, the media + hook members of `WebViewRenderer.cs`, `WindowsWebViewHandler.cs`, `iOSWebViewHandler.cs`, `Spixi.csproj` | correctness of the grant table (threading, caps, revocation, weak keys, the stable URL), the exact platform APIs (would it compile; is the response complete; thread of each callback), every path answers, no fall-through |
| P page + life C# | opus | `SingleChatPage.MediaOrigin.cs`, the call-site lines in `SingleChatPage.xaml.cs`, `ViewerImage.cs`, `MediaPushRules.cs`, `MainApplication.cs`, `RendererGone*.cs`, `WebViewLife.cs`, `WebViewStoreFolder.cs`, `SpixiContentPage.Life.cs`, `TrimRules.cs`, `RendererGoneRules.cs`, `WebViewStoreRules.cs`, `SpixiFlags.cs` block | the switch-OFF path is the base byte for byte · threading (drainer, pool, main) · the document / owner lifetime (the spare, reload, theme flip, desktop panes) · the twin of `chatThumbFor` (`chatThumbJpeg`) keeps every rule of the original · the Android rebuild (root page, overlays, the lock, the spare, the parked page) · the trim levels vs `SpareKeepShortSleep` · the store folder before the first WebView · R6 (no new member in a file over 1,500 lines) |
| C shell + pins | opus | `src/shells/chat.html` (the media lines), `media-bubble.js`, `media-viewer.js`, `message-bubble.js`, `composer.js`, `scripts/pins-imgurl/**`, `scripts/csh/{MediaGrantsTests,MediaPushTests,LifeTests}.cs`, the re-based pins | the predicate is the ONLY door (no other sink takes a URL; no CSS url(), no innerHTML) · cap OFF = today · the keeper (bounded, per document, needs both caps) · each new pin fails when the behaviour breaks (deliberate break per pin; derived cases); a source-text pin states its limits (#1735: a gap of the stated class is a NIT) · the re-bases keep each old claim as strong |

## 4 · Non-negotiables and accepted dials (the rows of items 3 / 4 are history since #1972)
- Must hold: the PARAMOUNT isolation invariant (#220 / #221) · C# names every file; no WebView path into a file op ·
  no token / id / URL / path / name in logs · no new verb, no new push name, no new argument shape (#1312 (B): a new
  VALUE on two pushes + two cap words, each a 🟡 row + a BE ask) · own switch per change (#1478), OFF = the old path ·
  bundle BEFORE shells · the size rule R1–R6 (#1963 (8)).
- Accepted (do not re-open): images by URL is its own batch before the launch, with the design rule of #1642 · P-14 and
  P-15 in this batch (#1738 (3)) · the Windows page store option B: the variable, `%LOCALAPPDATA%\Spixi\WebView2\<id>`,
  no move (#1969) · the BE engineer answers the six questions of P117 (the variable vs an explicit environment, the
  folder place, uninstall) — a reader may add a question, not re-decide them.

## 6 · Round 6 — the core only (#1972; the last round, no round 7)

Damir's ruling #1972 (2026-11-27): exactly one more round over a tree that delivers items 1a–1c + 2 only. Items 3 and 4
are REMOVED whole (code, switches, pins, csh tests, packets P116 / P117, gate rows, walk rows; their DECISIONS rows are
marked "moved"). Readers (fresh, read-only): **S6 Claude Fable 5.2, security-only** — the handler files and the grants
(`MediaGrants.cs`, `MediaSchemeHandler.cs`, the media members of `WebViewRenderer.cs`, `WindowsWebViewHandler.cs`,
`iOSWebViewHandler.cs`, `SingleChatPage.MediaOrigin.cs`, `ViewerImage.cs`) and the whole delta's security surface;
**P6 Claude Opus** — the page / shell / pins, and that NOTHING of items 3 and 4 is left (code, csproj lines, csh, pins,
smoke re-bases, docs that still claim them). Round 6 not CLEAN → stop, push nothing.

## 5 · Verdict — CLEAN NOT CLAIMED AT ROUND 5 (#2045): the batch stopped, not pushed (history; overtaken by #1972 and § 6–7)

| Round | Readers | MAJOR | What happened |
|---|---|---|---|
| r1 | S Fable · H Fable · P Opus · C Opus | 3 | P-M1, C-M1, C-M2 fixed (`review/round1-findings.md` in the cloud twin) |
| r2 | S Fable · PC Opus | 2 | S2-M1 (the iOS selector answer), PC2-M1 (the lifeGone pin) fixed |
| r3 | S Fable · H Fable · PC Opus | 1 | PC3-M1 (the renderer bound is SHARED by every WebView: an Apple blank view) = the second new class in a row in item 3 → rule 9: item 3 STOPPED, `RendererGone` parked OFF (#2040); PC3-m3 fixed (b-page b11); S3-2 recorded (W-9) |
| r4 | S Fable · PC Opus | 0 | MINOR: PC4 m1, m2 fixed (the test header, the read() comment + the FLAGS_FROZEN re-base); S4 MINOR 1 recorded ("Delete all data" partial on Windows, #2049) |
| r5 (last) | S Fable · PC Opus | **1** | S5 M1: the new gate row and P117 stated the "Delete all data" exposure as testers-only; the store `<id>` follows the data-folder PATH, so a public user whose Documents path changes gets an empty store and the old one is out of the wipe's reach. MINOR: S5 m1 (the remote-media gate lives only in the page store; an empty store loads tenor / giphy without a tap), PC5 m1 (the b11 header says the gate is `SemaphoreSlim(8, 8)`; it is `(1, 1)` — a pin comment, not changed after the last round), PC5 m2 (P117 question 3 restored word for word; the new text = question 7) |

After round 5 only doc corrections were made (the gate rows, P117 limit (d) + question 7, P115 / P116 wording, the blank line
inside the gate table, the c-shell row count); NO reader has read them. Code files = the round-5 readers' tree
(`review/tree-r5`). Recorded, not fixed (with reasons, round 4 / 5): H3 evaluates `VirtualView as …` before the switch (throws
only with no virtual view; with `WinAppMarker` ON the legacy line throws first) · the write order variable → `folderSet` (the
variable last: a throw sets nothing) · b11 does not hold the gate width or `GateWaitMs` (base fields) · only exactly 1 turns
`RendererGone` on · the b-page header's third b11 break gives pass=9 fail=2 · the `[FLAGS] imgurl` line is not in the log-line
counts · P113 "never the network" has the Windows no-environment exception (recorded at its line 47).

Owed before delivery: Damir's ruling for one more round over the r5 doc corrections; his choice on item 4's `<id>` design
(P117 question 7: follow the account, or remove every sibling store) and the remote-media gate (S5 m1); his choice on item 3
(#2040).

## 7 · Verdict of round 6 — NOT CLEAN (#2053): the batch stops again, NOT pushed (#1972: "Round 6 not CLEAN → stop, push nothing")

| Reader | Model | MAJOR · MINOR · NIT | What |
|---|---|---|---|
| S6 security-only | Claude Fable 5.2 | 0 · 2 · 4 | The code of items 1a–1c + 2 holds every non-negotiable (isolation by owner reference on all three engines, no server for a mini app, no WebView value into a file op, a miss never reaches the network except the recorded Windows no-environment case, no token / id / path in a log, switch OFF = base, nothing of items 3 / 4 left). MINOR: P113 said 35 pin rows (30) · DECISIONS / release-readiness / index rows still stated the round-5 surface. NIT: the 1c sink count wording · #2036's old-shell sentence · the cap is checked only in chat.html (a comment) · Chromium may log a 404 media URL to logcat (walk row A-6). |
| P6 page / shell / pins / "nothing left" | Claude Opus | **4** · 6 · 3 | The code, pins and tests are sound (every stated break red for its reason; re-bases correct; nothing of items 3 / 4 in code). MAJOR, all DOCS still describing items 3 / 4 in the reader's snapshot: M1 the handoff (round-5 text; the two sections #2040 / #2041 name were missing) · M2 release-readiness WK-IMGURL + B-35 · M3 DECISIONS #2039, #2044, #2046, #2047 unmarked / false values · M4 CLAUDE.md, decisions-index, status-log. MINOR: m1 the walk's page-store copy after the wipe · m2 the base build not pinned to `ae7b8303` · m3 A-5 without `logcat -c` · m4 the Artifact reference · m5 the brief's §§ 3–5 · m6 two script comments (smoke L42682 "the renderer-death handlers, the Windows page store", b-page header "SemaphoreSlim(8, 8)" = PC5 m1). NIT: the contract § 1 · the ImgurlFlagsTests header (one break reds two tests) · d6 checks C# and csproj only (stated). |

After round 6 (doc corrections; then, by Damir's ruling of 18:18, the R6 move of #2055 (`convertToBot()` moved whole from `SingleChatPage.xaml.cs` to the new partial `SingleChatPage.Bot.cs`; the pins `pins-imgurl/b-page` b8 and `pins-histcs/a-path` a7 re-based for it) — read by its own reader, § 8):
every MAJOR and the doc MINORs / NITs above are corrected (the handoff rewritten with § 3 "For winstore" and § 4 "For the
renderer-death design"; WK-IMGURL and B-35 restated; #2039, #2044, #2046, #2047 marked; CLAUDE.md, the index and the
status log corrected; the walk's S-1 … S-4 order, `--detach ae7b8303`, `logcat -c`, row A-6). NOT changed (true at round 6;
script / test files): smoke L42682's comment, the b-page header's gate width, the ImgurlFlagsTests header note. After this
section, by Damir's ruling of 18:18, `b-page.mjs` and `histcs/a-path.mjs` DID change for the R6 move — § 8.

## 8 · The permitted pass after round 6 (Damir 2026-11-27 18:18)

| Reader | Model | MAJOR · MINOR · NIT | What |
|---|---|---|---|
| D7 the doc corrections | Claude Opus | **1** · 7 · 5 | M1: the handoff, this brief, #2053 and CLAUDE.md still said "no code changed" after the R6 move of #2055 (corrected after the pass). MINOR: #2055's line counts mixed two counters (now `wc -l`: 10,694 → 10,698 → 10,685) · the Android rows wiped `Spixi\bin` again (the Windows page store) · S-4 weaker than fixb5's R · stale step numbers · A-6 after A-5's `logcat -c` · § 1's Mac line and an item-3 clause · #2045 / index rows unmarked. NIT: #2036's old-shell sentence · the Artifact wording · contract § 1 · section order · WK-IMGURL's owed text. |
| M7 the R6 move | Claude Fable 5.2 | 0 · 0 · 3 | The move is a move only: the method byte-identical, the page minus the 13 lines byte-identical, `partial` in every part, no `using` needed, included on every target, the only caller binds; the two re-bases keep their strength (every break red for its reason). NIT: the page is 10,686 lines by the check's counter (10,685 by `wc -l`) · the `pins-histcs/a-path` header's recipe (`sclRest(base)`) no longer reproduces the frozen hash, because `IMG_MOVE` is not a no-op at the base (the pin itself is correct; recorded, the pin file not changed) · the size is +499 after the move (the new file's 6 wrapper lines). |

By the ruling ("not clean → stop and say what is left") the batch is NOT pushed: D7 found one MAJOR. Corrected after the pass (docs only, no reader): D7 M1, its MINORs 1–7 and NITs 1, 2, 5; M7's NITs 1 and 3 (NIT 2 recorded: the pin file stays as read). What is left: one more doc-only reader pass over these corrections (Damir's ruling).

### § 8 (2) The final doc-only pass (Damir 2026-11-27 22:33: "with an end to the loop")

| Reader | Model | MAJOR · MINOR · NIT | What |
|---|---|---|---|
| D8 the doc corrections after D7 / M7 | Claude Opus | 0 · 5 · 5 (all DOC) | No fault in code, pins or tests; only the 8 doc files changed since tree-r7. MINOR: the walk header still said "wipe `Spixi\bin`" for Android · A-END's S-4 hint failed when the store folder did not exist yet · the handoff named #2035–#2055 and `imgurl-core-tree.diff` · this brief § 7 still said "no code changed". NIT: the handoff's smoke line had no tree · WK-IMGURL's evidence range · the gate section and brief § 1 did not name the R6 move · #2036 / #2055 corrected in place without a note · the handoff called § 7 "the final verdict". |

By the ruling (findings in docs only → fix, list, push): every D8 finding is **corrected after the last pass, for `docsb3` to
check** (the list is in `claude/session-imgurl-status.md`). Verdict: **delivered** (#2057). The full smoke ran on the final
tree before the push.

