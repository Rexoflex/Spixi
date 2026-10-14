# Review brief — Session 20F: the S20 walk fix round (W-1 … W-12)

Work order for the #46 adversarial loop. Written before round 1; the verdict goes into §5.

## 1 · What the batch is
| W | What landed | Where (files) | DECISIONS |
|---|---|---|---|
| W-1 | the desktop rail re-syncs from the Account pane flag (storage / focus / visible) + a dev-only `[RAIL]` line naming the writer | `src/shells/home.html` | #1409 (belt), #1410 🟡 (idea, no build) |
| W-2 | Account HUB App lock row = chevron-row geometry (66 px, centred block, switch centred); Privacy / Notifications unchanged | `settings-shell.css` | #1408, #1409 |
| W-13 | my own reaction pill on the chat accent (Damir 16:18) | `reactions.css` | #1414, #1445 |
| W-3 | every in-bubble control on the chat accent (payment / app card buttons, file badge + on-tile ✕, transfer fill, "Tap to download", photo CTA, Download all, ring fill); sent card in light = accent 22 % deeper; dark Graphite ink lift | `typed-bubbles.css`, `media-bubble.css`, `tokens.css` | #1443, #1444 |
| W-4 | welcome side fade 24 px only while the track moves (`data-moving`) | `launch-shell.js`, `launch-form.css` | #1426 |
| W-5 | welcome order + texts (new keys), "Open source" under the dots, autoplay 7 s, 14 locales | `launch-shell.js`, `launch-form.css`, `src/strings/draft/*` | #1425, #1426 |
| W-6 | 24 px above the header on desktop launch views | `launch.html` | #1426 |
| W-7 | two-column card anchored where step 2 sits centred (`fitCard`, `--launch-card-top`) | `launch-shell.js`, `launch.html` | #1426 |
| W-8 | retry on the restore form frame (restore art, "Welcome back", CTA under the field); W15 cap gone; dead retry CSS removed | `launch-shell.js`, `launch.html`, `launch-form.css`, `launch-shell.css` | #1426 |
| W-9 | the attach tray takes `position: relative; z-index: var(--z-10)` (NOT isolation on #messages — the lift rule) | `attach-sheet.css` | #1409 |
| W-10 | wallet hero collapse: one height flip + band slide by transform; `::before` carries the expanded look; rows `contain: content`, async decode; phone list `will-change: transform` | `wallet-hero.css/.js`, `wallet-shell.js/.css`, `home.html` | #1409 |
| W-11 | inline code = outline chip (no fill); ``` block padded with a start rule (the r1 "short tokens inline-block" + glue extra was REMOVED at r3, #1411) | `format-bar.css`, `tokens.css` | #1409, #1411 |
| W-12 | Downloads: addFile appends to the list on screen; the empty state waits 400 ms; the From row reserved until phase 2 | `settings.html`, `settings-app.js/.css` | #1409 |
| Pins | `scripts/pins-s20f/` c-accent · c-tray · c-code · l-slides · l-fade · l-inset · l-card · l-retry · h-rail · h-hero · h-downloads (+ `paint-tray.mjs`, Playwright, not in smoke); re-based: pins-s20 f-render / q-pay / r-account-toggle, pins-s9 b2-copy / b2-toggle, pins-s11 b-launch, pins-on1 f-copy-font-motion, ring-geometry.json, smoke-test.mjs lines ~4520 / ~4751 / ~15660 / ~30478 | | |

Not built (recorded): Account in the trusted peer WebView (#1410 🟡); the call card's call-back disc stays the action blue (unmeasured on the sent tint); the de-de 320 px "Bestehendes Konto wiederherstellen" button overflow (pre-existing #1422 nowrap); the id-id `groundBlueGradient` verify-locales failure (pre-existing).

## 2 · How to run
- Tree: `/home/claude/m20f` (branch `s20f-merge`, base `3271eaf0` = Damir's HEAD), `../Ixian-Core` @ `097341a`. The batch = the working tree vs HEAD (`git -C /home/claude/m20f diff HEAD --stat`; new files are staged).
- Pipeline FULL ran; ring fixture recaptured (hash `db0ec727a824573a`). Gates: build-shells / build-locales / extract-strings `--check`, i18n-lint green; verify-locales = the pre-existing id-id only.
- Sizes (chars): chat.html 979 059 → 978 295 (CHAT 957 = 979 968) · index.html 663 407 → 664 161 (INDEX 649 = 664 576) · intro.html 270 596 → 271 211 · settings.html 594 044 → 596 528.
- A single pin: `node /tmp/claude-0/s20f/kit/runpins.mjs /home/claude/<your-copy> pins-s20f/<mod>` (then `rm -f <copy>/scripts/.runpins-tmp.mjs`).
- Playwright: `/opt/npm-tools/node_modules/playwright/index.mjs`, Chromium preinstalled. Kit scripts: `/tmp/claude-0/s20f/kit/`.
- Known failures: the 2 KNOWN (#136 · B3); flakes #1147 (5) photo fade, `pins-s15/e-send-enter`.

## 3 · Auditor scopes (disjoint)
| Auditor | Scope | Focus |
|---|---|---|
| A · chat | `typed-bubbles.css`, `media-bubble.css`, `attach-sheet.css`, `format-bar.css`, `msg-format.js`, `tokens.css` diff; pins c-* + paint-tray + re-based f-render / q-pay | W-3 coverage (every in-bubble control, every state: pending / disabled / loading / success / failed / destructive), contrast on 7 canvases × 6 sent colours × 2 themes, the @supports guard and no-color-mix fallback, sent vs received cards; W-9 layer vs every overlay in the chat (format bar, @ popover, chevron / @ FAB, menu lift + scrim, sheets, the reply strip, request pane, keyboard swap, reduced motion); W-11 rendering (RTL, sent bubble, long tokens, 320 px × text scale, quote / preview strip), chat.html budget; motion lens n/a |
| B · launch + strings + claims | `launch-shell.js`, `launch.html`, `launch-form.css`, `launch-shell.css`, `src/strings/draft/*` + generated dictionaries; pins l-* + re-based pins-on1 / b-launch / b2-copy + smoke ~4751 | retry behaviour kept EXACTLY (no trim, scrub, in-flight, launchCtrl, fail('') silent, back), the C# contract (`LaunchPage.xaml.cs` proceed / removeLoadingOverlay / showPasswordError), fitCard measuring (no visible flash, a11y side effects of toggling `hidden`, resize / font / inset / locale refits, keyboard open on desktop, < 900 px), data-moving life cycle, the welcome fit ladder with the oss line, 14 locales (register, terminology, the protected tokens, claims: never "money", "no servers", "anonymous", "post-quantum forward secrecy"; PQ only slide2Copy2), the retired keys' consumers; copy lens |
| C · home / settings / wallet + pins | `home.html`, `settings.html`, `settings-shell.css`, `settings-app.js/.css`, `wallet-hero.js/.css`, `wallet-shell.js/.css`; pins h-* + re-based r-account-toggle / b2-toggle + smoke ~4520 / ~15660 / ~30478; AND a test audit of ALL 11 new pins (mutation budget ~15: does each fail when its behaviour breaks; re-bases not weakened) | W-1 belt never steals the highlight (takeovers, contacts-from-Account, a real tab tap, the #589 language re-bake window), the dev line's gate + content (security-handover-gate rules); W-2 geometry + tap layer + desktop; W-10 the oscillator guards (deficit reserve, latch, valve, accumulators, 400 ms cache, attach-while-hidden, short lists), the expand hold, reduced motion, the hide-balance mode, a scan re-render mid-slide, desktop (no will-change), tile memory; W-12 append semantics (a delete re-push, the 5000-file cap, a NEW screen), the empty-state timer vs a real empty folder, the reserved From row when phase 2 never answers, the 8-file search field shift |

## 4 · Non-negotiables and accepted dials
- Must hold: the PARAMOUNT isolation invariant (#220/#221) · no WebView path into a file op · no password / text in logs or DOM attributes · no `innerHTML` for peer text · bundle BEFORE shells · tokens not literals (sanctioned literals marked) · CHAT 957 / INDEX 649 · the message-menu lift precondition (no stacking context on `.c-chat-canvas` / `.messages`).
- Accepted (do not re-open): W-2 = B (hub only) · W-3 = all in-bubble controls on the accent · W-4 = 24 px while moving · W-5 texts / order / oss under the dots / 7 s · W-5 PQ claim (#1425, the rsa2 gap recorded) · W-6 24 px · W-7 = a2 · W-8 = restore art · W-11 built · W-1 = the belt only.

## 5 · Verdict
**CLEAN at r4** (2026-10-14 20:3x). Final tree `/home/claude/m20f4`: smoke BASELINE OK **6148 / the 2 KNOWN (#136 · B3)** (6087 + 61 new pins) · CSH **451** · gates green except the pre-existing id-id `groundBlueGradient:Spixi` · chat.html 978 538 (CHAT 957) · index.html 664 029 (INDEX 649).

| Round | Reader | MAJOR | MINOR | NIT | Notes |
|---|---|---|---|---|---|
| r1 | A chat · B launch / strings / claims · C home + test audit (16 mutations, 7 survivors) | 4 | 14 | 9 | hover / pressed labels < 4.5 (77 / 93 combos) · slide2Copy2 "directly, device to device" in 10 locales (a route claim) · the iOS keyboard hid the focused retry / restore field · a stranded pane flag re-lit Account on every focus |
| r2 | fresh | 2 | 6 | 6 | two source pins red on the C-1 edit · the punctuation glue ran peer text out of the bubble (+10…+310 px) and hid the link / mention guards' left context |
| r3 | fresh | 1 | 2 | 5 | the bounded glue still overflowed when a chip filled the line; CJK orphans → the design change: the short-chip logic REMOVED (L145) |
| r4 | fresh, narrow | 0 | 1 | 4 | CLEAN; the 6 px chip outline at a soft wrap → recorded (#1413 ①) |

MAJORs (mechanism → fix → lesson): the hover / pressed inks equalled the rest ink on a tint of the same accent → `--chat-accent-ink-strong` + the pin walks every state (L148) · the drafts paraphrased "peer to peer" as a route → each locale's own P2P term + a ROUTE lexicon (L146) · WKWebView does not resize, the reveal ran before the inset → `revealFocused()` after the inset · the belt trusted a durable flag a crash can strand → `paneSeen` + a sessionStorage sighting (L147) · an edit to `onSettingsClosed` broke two source pins → re-based to allow exactly the new statement · the glue span made marks nowrap → removed by design (L145).

Deliberate breaks: every new pin broken by its builder (logged in each module header) + 16 (r1) + 11 (r2) + 15 (r3) + 9 (r4) reader mutations; final survivors: 1 benign (r3 M1′, letters glued — void after the removal). Recorded, not fixed: DECISIONS #1413. Lens findings to Damir: #1413 ③ (the "directly" locales), #1414 (5) the restore button.
