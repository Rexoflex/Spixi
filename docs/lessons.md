# Lessons — rules learned, one line each

An INDEX of the rules this project learned the hard way. Each line is a present-tense rule with the DECISIONS row(s)
where it was learned; the full story stays in `DECISIONS.md` (read a row with `grep -n '^| #\?NNN ' DECISIONS.md`).
Numbering is Spixi's own (L1, L2 …). "Also" names the matching lesson in the Spixi Bot repo
(`Spixi-bot/docs/lessons.md`, "Bot Ln"), several of which came from here.
Add a lesson at the end of its theme with the next free L number; never renumber. Written 2026-10-01 (#1097).

Note on #906: the rule "a status row records what a session found, not what the tree is" (Bot L8 cites #906) is
stated in **#905**; #906 is the legal-hold loop row. L35 cites both.

## Verify & measure

| L# | Lesson | DECISIONS | Also |
|---|---|---|---|
| L1 | Verify the premise at source and on the device before you build, including that the branch is reachable. A store that holds a key does not prove that the key persists. | #215 (C8 reactions built, then reverted), #441, #430, #253, #258 | Bot L1 |
| L2 | Audit the brief before you build. Plans are often wrong (6 of 11 items in one case, a third of a brief in another). | #297, #314, #811 | Bot L1 |
| L3 | Measure before you choose a lever. After two wrong guesses, ship a probe, not a third fix. | #294 (iOS keyboard, third failure), #470, #482 | Bot L2 |
| L4 | A measurement outranks your own source trace. When it falsifies the trace, do not build the fix that was costed for it. | #688, #811, #894 | Bot L2 |
| L5 | "No signal exists" is a claim, and it needs evidence. Check when each hook fires, not only that it exists. | #650 (single tick) | — |
| L6 | Read the rule that causes a mismatch before you describe or fix it. Otherwise the fix can be a no-op. | #653 (wallet CTAs) | — |
| L7 | A defect reproduced in a harness can differ from the defect that was reported. The reporter's words name the mechanism. | #639 | Bot L24 |
| L8 | Characterize the real behaviour from the device log before you assert a cause. A pass tick with a crash in its log is not a pass. | #577, #516, #566 | Bot L24, Bot L18 |
| L9 | When the same defect class appears twice, question the design. Do not apply a third patch, because an open-ended list invites the next item. | #658, #806, #953, #959 | Bot L6 |
| L10 | Offer a dial only with its true cost attached. Otherwise the answer looks like the user's choice but is wrong. | #461 | — |

## Tests & pins

| L# | Lesson | DECISIONS | Also |
|---|---|---|---|
| L11 | A pin that reads a call site proves only the call site. Pin the site that the behaviour actually runs through. | #395, #646 | Bot L3 |
| L12 | Every pin declares `stripCode` or raw. Comments satisfy or defeat raw-text sweeps, so count the needle and strip the comments. | #771, #632, #806 | Bot L3 |
| L13 | Mutate before you believe a pin. Mutation finds vacuous pins that reading misses (seven sessions running). | #682, #687, #694, #659, #802 | Bot L5 |
| L14 | Negative pins read the BUILT bundle and are paired with a positive behaviour check. Two negatives pass on a build that cannot send. | #627, #827 | — |
| L15 | Derive a set or refusal from the code, never from the author's enumerated list. The case you did not think of is the defect. | #798, #658 | Bot L4 |
| L16 | Slice harnesses by content, not by line number or fixed length. A pin that moves between files keeps reading the old file. | #559, #682, #854 | — |
| L17 | A gate must prove that it can execute, inside the suite's real header and imports. A gate that is green by silence is a dead gate. | #810, #881, #828, #834 | — |
| L18 | When you retire a token, sweep the files the commit touched. A grep for the name misses pins that count it or pins re-based only in their message. | #859, #861, #892 | — |
| L19 | A pin must not claim a property that it cannot observe. When the property is visual, the walk is the gate. | #953 | — |
| L20 | A comment that states an invariant the code does not enforce is a defect. | #772, #958 | Bot L9 |
| L21 | A source-reading gate cannot see arithmetic. Execute the code that computes numbers. | #444 | — |
| L22 | A `catch (_) {}` around a one-line write is a feature that silently never runs. Gate undeclared identifiers by scope. | #869, #881, #940 | — |

## Review

| L# | Lesson | DECISIONS | Also |
|---|---|---|---|
| L23 | The builder never reviews its own work. Use disjoint read-only auditors, then fixers, then a fresh break-my-verdict reviewer, on Opus. | #46, #542, #235, #352, #880 | — |
| L24 | Review the fixes too. Each round's headline MAJOR is often inside the previous round's repair. | #647, #657, #943, #405 | — |
| L25 | Run the adversarial pass before the batch leaves the machine. It finds defects the builder shipped. | #616 | Bot L22 |
| L26 | Never skip the loop on a "small" batch. The skipped loop is itself the finding. | #512, #515 | — |

## Build & walk

| L# | Lesson | DECISIONS | Also |
|---|---|---|---|
| L27 | On Windows, build with F5 (or copy `Resources\Raw`). Plain `dotnet build` serves the previous shell and looks normal. | #663, #1069 | — |
| L28 | The artifact chain is source → bundle → shells. Rebuild the bundle BEFORE the shells, or you test old code. | #283, #398, #854 | — |
| L29 | `cs-syntax-check` and `node --check` parse but do not compile. Any new C# call site needs a real build before it is done. | #593, #648, #854 | — |
| L30 | Edit source assets under `src/`, never build outputs under `Resources/Raw`. The next build overwrites them silently. | #693 | — |
| L31 | A loader that fails open is worse than a loud one. A missing asset folder must not render as a normal-looking stale page. | #768, #663 | — |
| L32 | Render on the BUILT shell, in both themes, before you write the pin and before Damir spends a rebuild. | #742, #749, #886, #690, #683 | — |
| L33 | A walk sheet must accept notes on PASS rows, or it swallows findings. | #843 | — |

## Docs & state

| L# | Lesson | DECISIONS | Also |
|---|---|---|---|
| L34 | A loop is not finished until its verdict is written into the brief that ordered it. | #660 | Bot L7 |
| L35 | A findings row closes when someone walks it, not when the code lands. Re-verify open rows before you work them, because many are already built. | #905 (#906), #826, #845, #1034 | Bot L8 |
| L36 | Re-measure the baseline in a clean clone at session start. If a number differs, say so and stop. | #681, #723, #736 | — |
| L37 | Log a decision at the moment it is given, and mark superseded rows instead of deleting them. | #418, #398, #660 | — |
| L38 | A new `spixi.*` key, verb or sink gets its security-gate row in the same batch. | #775, #784 | — |

## Platform quirks

| L# | Lesson | DECISIONS | Also |
|---|---|---|---|
| L39 | Two `location.href` bridge sends in one turn drop the first. Send everything through the serialized outbox. | #542, #185, #337 | — |
| L40 | iOS keyboard: do not resize `body` under WKWebView's focus pan. `env(safe-area-inset-bottom)` stays full while the keyboard is up. | #294, #301 | Bot L2 |
| L41 | iOS: MAUI re-assigns `UIDelegate` after connect. Strong-root the delegate and re-assert it on every navigation. | #309, #310, #312 | — |
| L42 | Android: the task snapshot shows the screen from before the lock. Changing the live view tree cannot reach it. | #461 | — |
| L43 | A system-bar colour that lags by exactly one theme is a cache, not a race. Read the cache first. | #408, #410 | — |
| L44 | Test sheets must use the target shell's syntax. A CMD `rmdir` in PowerShell reports success and does nothing. | #450 | — |
| L45 | Read large files with the file tools. The sandbox mount truncates them for bash and node. Check the mounts against `.sln` at session start. | #175, #258, #673 | — |

## Added from the Bot repo and session 0 (2026-10-01)

| L# | Lesson | DECISIONS | Also |
|---|---|---|---|
| L46 | Run git on the mounted repo with `--no-optional-locks`. A stranded `index.lock` blocks GitHub Desktop. | #882 | Bot L17 |
| L47 | `grep -c $'\0'` matches every line. Count NUL bytes with `tr -dc '\000' \| wc -c`. | #854 (Session S, #811) | Bot L11 |
| L48 | Ask "is this worth doing at all?" before you specify an item. Many open rows were already built or retired. | #1097, #905 | Bot L15 |
| L49 | A failure message must prove its setup first. The BUILD walk row must name something only the new build shows; "it starts" proves nothing (a stale shell starts too). | #663, #1100 | Bot L18, Bot L23 |
| L50 | Keep CLAUDE.md to the rules and "where we are now". 324 KB of history made every session slow and stale. | #1097 | Bot L10 |
| L51 | Incremental iOS (and Android) builds do not repackage `Resources/Raw` html. When the html changed: wipe `obj`/`bin`, plain build, then Run, and check the new bundle is what runs. | #320, #449 | — |

## Added in session 1 (2026-10-01)

| L# | Lesson | DECISIONS | Also |
|---|---|---|---|
| L52 | A quick runner that runs only the new pin block hides the global gates (#345 size ceiling). Run the FULL smoke before you claim green. | #1112 (r1 C1) | — |
| L53 | Check that a pin's slice is not empty. A `slice(indexOf(a), indexOf(b))` with a missing anchor tests nothing and passes. | #1112 (r1 C4) | — |
| L54 | A pin that reads `querySelector(…).textContent` without a guard crashes the whole smoke on one rename. Use `(… \|\| {})`. | #1112 (r2 C10, r5 R5-1) | — |
| L55 | A file path is not an identity: a delete frees it for the next same-named download. Match on path AND recorded size, and re-check at every lookup. | #1112 (r4 R4-1, r5 R5-3) | — |
| L56 | A rule protected only by source-text pins survives a bypass that keeps the text. Move it into a pure helper and execute it (MSTest + the csh harness). | #1112 (r5 R5-2) | — |
| L57 | A long-press state machine has three entry paths (timer, platform contextmenu, right button). Reset the "fired" flag on the NEXT gesture start — first line of pointerdown, before any button check — and on keydown; never on a timer (late contextmenus exist). Copy the house grammar (message-menu.js / chats-row-menu.js) instead of writing a new one. | #1122 (r1 B1, r2 R2-M1, r3 R3-M1) | — |
| L58 | Replacing ARIA semantics on a reused component can drop its styling: the chip's selected look keys on aria-pressed, a role=tab chip needs its own aria-selected rule. Render after an a11y fix. | #1122 (r2 R2-M2) | — |
| L59 | A "persisted last X" field is not a sighting until you know WHICH clock stamped it — Core stamps many incoming lines with the local RECEIVE time. Read the writer before you trust a timestamp. | #1122 (r1 A1) | — |
| L60 | Decoding a peer's file in the app process (the key holder) is a security-gate row the moment you write it: sniff the first bytes, cap the size, bound BOTH sides of the decode. | #1122 (r1 A2), #1121 | — |
| L61 | A slice-and-replace edit of a source file must name BOTH anchors next to each other — a far end anchor deletes everything between (session 2 lost three exports; build-shells caught it). | #1122 | — |
| L62 | MSTest that never runs on the branch's CI is not "executed". Put the C# harness in the repo (`scripts/csh`) and run it as a gate. | #1122 (r1 C M2) | — |
| L63 | A temporary probe is still code with a security property (no user data in a log line): pin its grammar by EXECUTING it on both sides (jsdom for the shell, the csh harness for C#) — two pinned integers let a one-token mutation through. | #1129 (r1 C-1) | — |
| L64 | Before building a "re-send" fix, read the sender: Core already queued the nick on the server (pending + server). Test the failing case on a device first (#294) — a fix for a mechanism you did not prove is a guess. | #1129 (A9) | — |
| L65 | Two layers with the SAME z-index token (composer and topbar both --z-20) cannot be told apart by an overlay placed between them on purpose. When an overlay is meant to sit under one bar, check every sibling that shares that bar's token. | #1129 (A12) | — |
| L66 | A size cap on a CDP event measures the event, not your payload: Runtime.consoleAPICalled carries a stack trace of up to 200 frames. Turn the capture off or cap the parsed value. | #1129 (r3 MINOR-2) | — |
| L67 | A source pin that reads the CALLEE is blind to a deleted CALL SITE (the drainer start, updateFile → thumb, the live enqueue): pin the caller's body, or execute the path. | #1135 (r1 C) | — |
| L68 | A contrast claim over a scrim must be COMPUTED by the pin (tokens composited over a white and a black photo, both themes); a token called "scrim" was 0.35 alpha in light → 2.2:1. Never pin the token name. | #1135 (r3 M1) | — |
| L69 | When a pin is re-based to a new rule, re-run the old mutant: the re-base can drop the half the old pin covered (the tile's live path while the new pin used a card). | #1135 (r5) | — |
| L70 | A CSS pin that asks "does some rule say X" (`includes`, matching rules) is not "what the browser applies": specificity let a tile rule beat the reduced-motion ring. Pin the COMPUTED style on every kind. | #1149 (fix r1 B-M1) | — |
| L71 | A document-wide UI state (a quiet / seen map) must be reset where the document switches peers, or the "fixed" flicker comes back on the second open. Test A → B → A, not one open. | #1149 (fix r2 MAJ1) | — |
| L72 | A test double of a locked resource must model the LOCK, not only the data: a model whose flush never waited behind a running write hid a dropped-request loss (the real flush blocks on Core's flushLock, and the writer then removes the new request with the old one). | #1162 (r1 M1) | — |
| L73 | Test a guard with the call site's REAL arguments: a test passing maxDrop = 3 proved the trim, the production value is 1 (window = want + 1), so the fix never ran on device. Mirror the caller's numbers in the test and pin the caller. | #1162 (r3 M-1) | — |
| L74 | Parallel agents in ONE container share the scratchpad: give every agent its own script names (two agents ran each other's `breaks.py` and mutated a copy). | #1166 | — |
| L75 | On a 2-core / 8 GB cloud twin, never run more than ONE full smoke at a time: 5 parallel smokes were OOM-killed and timed out jsdom boots (false fails); agents run their own pin module, the main session runs the one full smoke after the merge. | #1166 | — |
| L76 | A wall-clock pin (a 600 ms window) must start its clock AFTER any heavy static setup (a stylesheet walk): late in a loaded 14-min smoke the setup alone ate the window and the pin flaked 2 runs in 3. | #1186 | — |
| L77 | A per-NODE gesture guard fails when the list re-renders under the finger (the replacement never saw the pointerdown): keep ONE press record per document (capture phase, keyed by pointerId) and let each node ask it. | #1183 | — |
| L78 | A component with no transition of its own, closed through a generic remover that waits for `transitionend`, is removed by the FALLBACK timer: the slow close was the 400 ms fallback, readable in the log (close → removal 410 ms). | #1180 | — |
| L79 | A "refresh this row" push from a side surface (chat info) must re-push ONLY a row the open page already holds, through the row push alone: the scan reads far more history than the page loads, and the generic insert path created the row as a new arrival (+ read side effects). | #1190 (#46 r4 M1) | — |
| L80 | Before you design an old-app fallback, read what the OLD app does at its tag (`git show <tag>:file`): #1189 (4) assumed a legacy app shows an edit as a second message; 0.9.20+ replaces in place and 0.9.19- drops it — the ✏️ marker was not needed. | #1199 | — |
| L81 | Two "time" fields are two clocks: a received message's `timestamp` is the SENDER's, `receivedTimestamp` is THIS device's arrival. "Keep the original time" = keep the field the row already shows (pass it back into the replace), never swap in the other clock. | #1199 (#46 r2) | — |
| L82 | A text that LEAVES the device must not carry a local-only label: Core's `Friend.nickname` returns the user's private alias first, so a quote name from it leaked the alias to the peer — use only names the sender declared, or none. | #1198 (#46 r1) | — |
| L83 | A fix that adds a "pending" state must give EVERY way out of it an answer: the r1 fix made a voice download tap `loading` and the r2 reader found the path that replaced the pending play silently — list the exits (replace, clear, call, hide, delete, stall, complete-but-no-play) and push for each. | #1209 |
| L84 | Agents that never run the full smoke miss the INLINE smoke pins their change re-bases (the #1065 Escape regex): after any shell keyboard / composer change, grep smoke-test.mjs for the edited line's tokens before the merge smoke. | #1209 |
| L85 | `App.isInForeground` is "focused", not "on screen", on a desktop (WinUI OnSleep fires on focus loss, #505): a phone-only rule (the pocket) goes behind `#if ANDROID \|\| IOS`, and a `#if` split inside an expression breaks the tree-sitter parse check — assign in a statement. | #1209 |
| L86 | A log line that never shows is not proof it was never written: Core's Logging set `Console.ForegroundColor` before every sink, Android throws there, and every warn/error of the Android dev build vanished from logcat AND the file (AND-47 looked "cosmetic" for two weeks). Count the swallowed-exception lines before trusting an absence. | #1222 |
| L87 | Never re-run a handler by dispatching a synthetic DOM event: a fake `scroll` reaches every capture listener (press cancel, probes, lazy history). Name the function and call it. | #1226 (#46 r3) |
| L88 | A colour layer that a state SELECTOR switches on and off moves the flash instead of removing it (grey→white at loaded, white→grey at loading): give the layer one owner state and an opacity transition. | #1221 (#46 r1–r3) |
| L89 | A C# harness stub must sit in the REAL namespace of the type it stands for: `StreamMessage` stubbed in `IXICore.Streaming` matched a wrong `using` and hid CS0246 on every target (the type is `IXICore.StreamMessage`; ImplicitUsings is off). | #1241 (#46 r1 A-MAJOR-1) |
| L90 | After merging agents' smoke registrations, check the BRACES: two agents put their pin line inside the previous block's `for (…) {` — the pins would have run once per loop member. Registration lines go at top level. | #1241 |
| L91 | The same defect class found three times (letter-shaped "emoji" through a category filter) is a design signal, not a fourth patch: switch a deny filter to an ALLOW-LIST when the sender side only ever sends a known set. | #1232 (#46 r4) |
| L92 | A CSS fix must be checked on the COMPUTED value, and its pin must read the LAST declaration of the property in the rule: a later `white-space: normal` in the same rule cancelled the `nowrap` fix and a presence regex stayed green. | #1242 (picks r3) |
| L93 | Before fixing an auditor's MAJOR, diff its copy against the delivered tree: a reader's own deliberate break left in its copy was reported as a defect (its file was 10 min newer than the copy). | #1242 (picks r4) |
| L94 | `pkill -f <pattern>` / a `pgrep` loop kills the shell that runs it when the pattern is in its own command line (exit 144 twice): kill by pid from `ps` filtered with `[n]ode`, or never kill — fix the input and start a new run. | #1242 |
| L95 | A detached cloud smoke run dies with a container restart or a turn boundary without its done marker: always end the run with `echo SMOKEDONE rc=$?` and treat a log without it as NOT run. | #1241 |
