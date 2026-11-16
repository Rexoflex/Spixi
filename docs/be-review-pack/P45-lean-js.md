# P45 · LEAN JS · PARKED — a comment strip of the shared scripts and the inline scripts; the build refuses its switch (Session Speed lean, P-07)

> **★ PARKED (Damir's ruling, 2026-11-15). Nothing here ships and nothing here needs your review now.** The review
> found a silent mis-strip in the hand-written JS scanner in each of its four rounds; the last one (r4A-1, below) is
> NOT fixed. So the build REFUSES `SpixiLeanJs` (one `<Error>` in `SpixiLeanGuard`, as for `SpixiLeanCssFull`): no
> build can pack the output of this strip. The code, its pins and the script flag `--lean-js` stay in the tree as
> tools for the session that finishes P-07. This packet records what was built and why it stopped. P-07 comes back
> with another design (a parser in the packaging path, or a build-time proof on the real files — a proposal for the
> main chat) and with a new packet.

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| MEDIUM (a transform of executable code with a hand-written scanner: a wrong strip would change behaviour on the device only — payment-intent code and the bridge wrapper are in these files) | no value moves; the files that build payment INTENTS and the lock UI are in scope of the strip | none: no verb, push, `spixi.*` key, WebView setting, sink, fetch or log line; no C# file changed | **PARKED:** built, and the build refuses the property `SpixiLeanJs` in every build (default **OFF** = today's package, byte for byte) · an open MAJOR finding of the review (r4A-1) | 2 min (the box above) · 9 min (all) |

**Look here first:** `scripts/lib/lean-strip.mjs:828` `scanJs` (the scanner), `:1213` (the one weak decision of the
slash net) and `:1375` `stripJsComments`; then `:1521` `checkJsStrip` (what every output must pass before anything is written) and the table "The proofs" below,
which says what each proof binds and what it does not.

**DECISIONS:** #1312 · #1478 · #792 · #1537 (the scope) · **#1583 (this change)** · #1581 (the gates) · #1584 (the
MSBuild switches) · #1585 (GATE 2 on a lean package) · #1587 (licence and source notices). Gate doc:
`docs/security-handover-gate.md`, section "Session Speed lean". Twin packet: P44 (lean CSS).

## What changed and why
- **Finding (research, re-measured):** `spixi.bundle.js` is 39 % comments (2,239,886 → 1,362,467 bytes) and the
  inline scripts of the shells hold 0.8 MB of comments.
- **As built (no build passes the flag now — the property is refused):** `strip-release.mjs --lean-js` writes 22 files: the three external scripts
  (`spixi.bundle.js`, `spixi.strings.js`, `spixi.icons.js`), every shell with its inline classic scripts stripped,
  and `spixi.tokens.css` as today's tokens strip (unchanged: one switch per change, #1478).
- **Every line of the three external files stays on its line** (`keepLines`): a removed comment leaves its line
  breaks; line i of the output is line i of the source minus comment text. Device logs cite these files by line
  (`spixi.bundle.js:47` is `console.warn('[P1] ' + body);`), so a log line of a lean build still points at the source.
  Inline scripts get no line promise: C# (`localizeHtml`) trims and drops lines of every shell in every build anyway.
- **What a removed comment leaves:** nothing, or ONE space when it stood between two tokens that would join; a line
  break inside it stays (automatic semicolon insertion sees the same line breaks). No character of a string, a
  template or a regular-expression literal changes.
- **No parser in the packaging path.** The Release build runs `node scripts/strip-release.mjs` on machines that may
  have no `node_modules`; so the strip is a hand-written scanner (strings, template literals with nesting, regular
  expressions against division by the previous token and the bracket stack, automatic semicolon insertion). **Where
  it knows that it cannot be certain it THROWS** — a `/` after `of` / `yield` / `await`, `await` + line break +
  `function` or `{`, `++` / `--` after `of` / `yield` / `await`, a number with a leading zero + a digit (`010`), an HTML-like comment token in code (`<!--`, `-->`, so also `n-->0`), a lone CR line end,
  anything unterminated, an unknown character. A throw = exit 1, nothing written, the build stops.
- **The slash net (review round 2).** Whether a `/` starts a regular expression or is a division cannot be decided
  by a scanner in every case, and rounds 1 and 2 each found inputs where it guessed wrong without a throw. So the
  design no longer rests on a right guess. A `/` is STRONG when the previous token alone decides it (after `=`,
  `(`, `,`, `return` … a regular expression; after a number, a string, a name on the same line … a division).
  Every other `/` is WEAK (after `)`, `}`, `++`, `--`, a word followed by a line break, a contextual word such as
  `of` / `yield` / `await` / `let`). After a weak slash, to the end of its line (the tail): **every comment that the scanner sees is
  KEPT** (reason `after-uncertain-slash`), **so is a `//` comment on the line directly after it with the rest of
  its `//` run** (a true `//` comment in the tail, which a wrong reading takes for code, would continue there —
  review round 3), the tail line is never trimmed, and the constructs that could carry a wrong reading past the
  line end are REFUSED (a weak slash inside `${ }`; a backtick, an unclosed `/*` or a `\` line continuation after
  it). A wrong reading of a weak slash can then change only how the rest of that line is cut into tokens. A strong slash that the scanner's classifier would read the other way throws. Today's
  files: 470 strong and 47 weak slashes; ONE comment is kept by this rule (`spixi.bundle.js:18462`).
- **Not stripped:** `js/html5-qrcode.min.js`, `fonts/TwemojiCountryFlags.js`, a `<script>` with `src`, a script whose
  `type` is not JavaScript (JSON, importmap, module, a template block), markup, HTML comments.
- **Kept comments** (byte for byte, on their lines), 54 under this switch: a comment with a `*SL{…}` carrier (6), a
  comment that names a licence (28), a comment with a URL (13) or an attribution word (6: four with `tabler`, the third-party icon
  set, two with `ported from`), and the one after a weak slash. A run of `//` lines counts
  as one comment, so the banner of the vendored qrcode-generator (`spixi.bundle.js:21011-21026`, "Copyright (c) 2009
  Kazuhiko Arase", MIT) and its source note at `:23263` stay.

## The proofs — what each one binds
| Proof | What it binds | What it does NOT bind | Where it runs |
|---|---|---|---|
| Post-conditions before every write (`checkJsStrip`, `lean-strip.mjs:1521`; `sameJsCode`, `:1541`) | The scanner reads the SAME code tokens (type and exact text, every literal byte for byte) in the source and in the output, with the same line-break-before flag on each token; every kept comment is there byte for byte and no other comment is left; the output compiles (`vm.Script`, compile only); for the three external files: the line count and each line a subsequence of its source line | A mistake of the SCANNER itself: the same scanner reads both sides, so a region it mis-reads (code taken for a comment) is missing on both sides. This check catches every mistake of the EMIT path. The slash net is what bounds a scanner mistake at a `/` | inside the Release build |
| GATE 1 (`--check`) | The package is exactly this transform of the committed files, in both directions | Whether the transform is right (it is computed by the same code) | Release machine, on the deployed folder |
| The parser cross-check (`x-parser-crosscheck.mjs`) | An INDEPENDENT parser (`acorn`) reads the same token stream AND the same syntax tree from every stripped script as from its source (3 external + 196 inline, 428,281 tokens); every token of an external file is on the same line; the HTML walk finds the same bodies as `jsdom` | Inputs that `acorn` itself mis-reads (the forms are named in the file's header; today's files hold none) | `smoke-packaged --lean-js` (GATE 2) and by hand. **NOT in the build and NOT in CI** (#1537: no new package there; it uses the `acorn` that the pinned `eslint` install brings) |
| Execution | The pin runs the committed and the lean copy of each external script in two sandboxes: 13 locales and every icon deep-equal, the 458 exports equal in name and type, V8 reports the same line for 251 thrown errors; the corpus programs give the same result before and after; the whole suite passes over the lean package (GATE 2); the pixel gate boots all 18 shells from the lean package | Code paths that no test runs | CI (the pin) · lead machine (GATE 2, the pixel gate) |

So the only proof that is independent of the scanner AND reads all of the code is the cross-check. **It must pass on
the deployed folder before a lean package ships, and it should become a CI pin before a default changes** (a
proposal in the handoff; it needs a ruling because of #1537).

## Files
- `scripts/lib/lean-strip.mjs:796-802` the token tables · `:828` `scanJs` · `:1213` the weak decision · `:1341`
  `keepUnits` (the `//` run rule) · `:1375` `stripJsComments` · `:1521` `checkJsStrip` · `:1541` `sameJsCode` ·
  `:1565` `deletionOnly` · `:1611` the JavaScript MIME list · `:1672` `walkHtml`.
- `scripts/lib/lean-gates.mjs` `lineInvariant`, `JS_LINE_ANCHORS`, `EXTERNAL_JS`.
- `scripts/strip-release.mjs:454` `leanCli` · `:434` `alwaysOnGates`.
- `Spixi/Spixi.csproj:535-563` the guards (the park `<Error>` at `:539`) · `:634-702` the lean swap (the three external files are "must-write").
- Pins `scripts/pins-perflean/c-js.mjs`, `a-gates.mjs`, `d-package.mjs`; the corpus (`corpus/cases.mjs`).

## Bridge surface
None. The same script files load from the same places; only their bytes differ when the property is on.

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| A regular expression is read as a division (or the reverse) and the text after it is mis-read as a comment or a string | the slash net: a strong slash is decided by the previous token; after a weak slash no comment that the scanner sees on its line, and no `//` run that starts on the next line, is removed, the line is never trimmed, and what could carry a mis-read further is refused; the compile post-condition; the cross-check | corpus (regex after `)` of `if` / `for`, after `return`, `case`, `=>`, `{`, `}`, `(`, `[`, `!`, `&&`, `?`, `:`; a declaration after `return` / `debugger` + line break; the witnesses of rounds 1 and 2 …) · pin `c-js` "the net test": the weak decision is replaced by "always regex", "always division" and an alternation; every program must still throw or behave like its source and keep its listed comments, and 7 hostile inputs must be refused by rule H (1422 runs: 180 threw, 1242 equal, 0 differed, 0 kept comments lost) · the builders' generated programs (round 2: 1,000,000; after the round-3 fix: 620,445, judged also by "every true keep-rule comment is in the output"; 0 silent differences, also under the three mutants) · cross-check |
| A string, a template literal or a URL with `//` changes | literals are copied whole, every line terminator inside them included; the token post-condition compares them byte for byte | pins `c-js` (every string of 13 locales deep-equal; the U+2028 cases of round 1) · corpus · cross-check |
| Two tokens are glued, or a line break that ASI needs is lost | a comment between two tokens becomes one space; line breaks inside a comment stay; the token post-condition compares the line-break flags | corpus (`a/**/b`, `return /* ⏎ */ x`, `return/* v */1`) · pins `c-js` · cross-check (syntax trees) |
| The line numbers of device logs move | `keepLines` + the line invariant in `--check` (always on) and in `build-shells` | pins `c-js`, `a-gates` |
| A `*SL{…}` carrier in an inline script is lost (the class of #248) | the carrier gate (raw multiset per file) | pins `c-js` (`<shell>: carrier *SL{SpixiP1} 1 → 0`) |
| A licence banner or a source note of vendored code is removed | `keepReason` + the `//` run rule | pins `c-js` (lines 21011–21026 and 23263 byte-identical) |
| The scanner meets code it does not model | it throws; the build stops; nothing is written | pins `c-js` · corpus (the refusals) |
| A package ships with the output of this strip | `SpixiLeanGuard` refuses `SpixiLeanJs` in EVERY build (the park). Limit (review round 5, recorded): the refusal reads the property when the guard runs — a targets file in the repo that sets it AFTER the guard has passed would reach the js branch of the lean target; the pin fails when a file in the repo sets the property | the harness's store, dev and target-framework rows · pin `d-package` |

## Recorded / left open
- **★ The open fault (review round 4, r4A-1): the slash net has a hole that crosses the line end.** The first word on
  the line after a tail line takes its property flag (a `.` before it) from the last token of the tail, which is
  uncertain; a slash after that word is judged strong. So a wrong reading of a weak slash can change how the NEXT
  line is read, where rule K keeps nothing: three valid inputs (`let` after `do … while (…)`; a label or `let` after
  `await` + line break) lose text inside a string, with no throw (`"object /* gone */ "` → `"object  "`). Today's
  files are not affected (the parser cross-check passes on the lean package). The sentences above that say "a wrong
  reading … can then change only how the rest of that line is cut into tokens" and "the NEXT such input cannot be
  silent" are FALSE as general claims; they are left as the record of the design. Also open: `let {` after a
  do-while is refused (r4A-2); a narrowing of rule H that no pin sees (r4A-3).
- **Why it is parked and not fixed:** four rounds, four new classes of silent mis-read, each found by a fresh reader
  with a longer fuzz. A hand-written scanner cannot be reviewed to "correct" at that cost. The two designs that can
  be: a real parser in the packaging path (`acorn`; needs a ruling, #1537), or a build-time proof on the real files
  (the strip runs with every uncertain `/` read both ways and stops when the scanner state after the line differs).
- **Review round 1 found three ways to a wrong output without a throw** (none hit by today's files): a raw U+2028 /
  U+2029 inside a string lost the spaces before it (fixed: literals are protected whatever they hold; the token
  post-condition); a declaration after `return` / `break` / `continue` / `debugger` + line break was read as an
  expression (fixed); a lone CR + a removed comment + LF joined two lines (now refused). Each is a corpus case. The
  lesson for this packet: the scanner is proven by witnesses and by the cross-check, not by construction.
- **Review round 2 found four more, all at a `/`** (`var b` + line break + `/re/`; `let` as a name; `++` after
  `of`; `await` + line break + `{`): each is fixed or refused and is a corpus case — and the slash net above was
  built so that the NEXT such input cannot be silent. What the net does not cover: a scanner mistake that is not at
  a `/` (strings, templates, numbers, comments, automatic semicolon insertion) and a wrong token before a strong
  slash. Those rest on the witnesses, the generated programs and the cross-check.
- **Review round 3 found two more:** a number in the legacy octal form (`010.in` was read as the number `010.`
  and the keyword `in` — a tokenizer mistake that is not at a `/`; such a number is refused now), and a hole in the
  first form of the net: under a wrong reading, the `//` line after a tail could be removed although it continued
  a licence comment, and blanks at the end of a tail line could be trimmed (no behaviour change; closed — the net
  text above is the corrected rule). A differential of the number pattern against `acorn` on 1.4 million inputs
  found no other difference.
- **The MSBuild targets have not run in a real MAUI build yet** (see P44, same list); the stamp protects one `obj`
  folder only (P44).
- The scanner refuses some valid JavaScript on purpose (a `/` after `of`, `yield`, `await` — `return await
  /re/.test(s)`, `for (const m of /a/g…)`, `yield /re/` —; `await` + line break + `function`, `class` or `{`; `++` /
  `--` after `of`, `yield`, `await`; a number with a leading zero + a digit; an object literal as a class heritage;
  a `/` after the `}` of a method; a hashbang; `var a = 1, b` + line break + `/`; `.` before `/`; a weak slash inside `${ }`; a backtick,
  an unclosed `/*` or a `\` line continuation after a weak slash on its line; `n-->0`; decorators; a lone CR). Today's shipped files hit none. If future source hits one, the lean
  Release build stops with the file and the line; the cure is a pair of parentheses / a space, or building without
  the switch.
- The measured gain in the research was memory (about −3 MB renderer PSS per chat document); the harness of this
  session measured the ready time (handoff). The device numbers decide the default (the main chat).
- The "emit ASCII" step of the research card is not built (not in #1537).

## How to switch it off
It cannot be switched on: `-p:SpixiLeanJs=true` stops the build with `Spixi lean packaging: SpixiLeanJs … is PARKED
in this batch`. Off is the default.

## Question for BE
None now (parked). When P-07 comes back: is a comment-only strip of the shipped JavaScript acceptable for a store
build if GATE 1 and an independent parser check pass on the deployed folder?
