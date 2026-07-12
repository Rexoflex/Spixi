# Opus #46 work order — MISSING BITS BATCH B (#259: B2 pattern · B3 tx-details shell · splash boot)

> **Audit loop over the Batch B build.** Run per the #46 protocol: 3 disjoint READ-ONLY
> auditors → fix agents (disjoint scopes, explicit cross-file contracts) → a FRESH
> break-my-verdict re-reviewer → loop until CLEAN. Verdict + evidence tables get
> appended to THIS file. Damir directive 2026-07-12: the loop runs as Opus-delegated
> agents inside the fable session (token conservation) — same rigor, same
> independence rules (no auditor fixes; the re-reviewer never saw the fixes made).
>
> ⚠ #175: the PC mount serves STALE/TRUNCATED copies of edited/large files to
> bash/node (this session: home/settings/launch/empty_detail.html stale;
> build-shells.mjs truncated at 7,309 B). **File tools (Read/Grep) are the only
> source of truth.** wallet_sent.html + chat.html + wallet-shell.js were byte-fresh
> and node --check green at build time.

## What was built (DECISIONS #259; brief `fable-build-brief-missing-bits-batch-b.md`)

1. **B2** — `src/shells/chat.html`: `?desktop/?mobile` forcing script MOVED above the
   pattern boot script; pattern boot script now defaults desktop→0 / mobile→0.5 when
   the `spixi.chat.pattern` key is unset; the `:root[data-desktop]
   .c-chat-canvas::before{display:none}` hard-force DELETED (dark grey-1000 ground
   rule kept). `src/shells/settings.html readChatPrefs()`: same platform-aware default.
2. **B3** — NEW `src/shells/wallet_sent.html` (WalletSentPage drop-in; ghost-lifted
   `.c-txsheet` detail card; buffered burst model rendering at `setData`;
   `hideBackButton` topbar rebuild; `wallet-unknown-*` `*SL{}` equality carriers;
   `attachCallUi` spread + the 4 CSS links; defensive `setTheme`). `wallet-shell.js`:
   `onTx` opt in `renderWalletTxList` (+ docblock), additive `tx.avatar` →
   `createAvatar src` in `openTxSheet`. `home.html`: `walletOpts.onTx` →
   `ixian:txdetails:<txid>`. `build-shells.mjs`: `wallet_sent` in SHELLS + DEFAULT.
3. **Splash** — `.app-boot` cover (pulsing registry logo, reduced-motion respected,
   dropped at window load w/ transitionend+timeout) on home / settings / launch /
   empty_detail; launch also gained the dark instant-bg (had NONE) + the queued #228
   platform flag.
4. **B1** — no FE change; downloads gate re-verified (settings-shell.js:847 /
   settings.html:411).

## Auditor scopes (3 agents, read-only, file:line findings)

- **A — B3 end-to-end vs the real C#:** `src/shells/wallet_sent.html` +
  `wallet-shell.js` deltas + `home.html` onTx + `build-shells.mjs` vs
  `Spixi/Pages/Wallet/WalletSentPage.xaml.cs` + `HomePage.xaml.cs:473/:1053-1098` +
  `Utils.cs sendUiCommand` + `SpixiContentPage.sendMessage/pageLoaded`. Re-verify
  REACHABILITY (#215) of every claim: arg shapes/order (clearEntries-before-early-
  return; setReceivedMode before addEntry; setData closes the burst), the ghost-lift
  overlay lifecycle (openOverlay/dismissOverlay on a detached host — focus, listeners,
  the 400ms removal vs the reparented card, repeated re-renders), the unknown-name
  carriers (do `wallet-unknown-recipient/sender` exist in ALL 13 lang files?), avatar
  path handling (X1-excluded → raw path; `img/` sentinel), money display (verbatim
  decimals + sign canon vs #77 — is the fee exempt correctly?), pane vs pushed
  lifecycles (hideBackButton only wide; dismiss verb only narrow-meaningful — what
  does ixian:dismiss do when pane-hosted? WalletSentPage.onDismiss pops
  ASYNC — verify a pane-hosted dismiss can't pop the WRONG page), preflight coverage
  (destructured symbols exist in the bundle export map).
- **B — B2 + splash:** chat.html script ORDER (theme → flag → forcing → pattern) +
  default derivation both themes (×0.36 rounding vs token defaults 0.5/0.18) +
  settings.html readChatPrefs/createChatAppearance pre-selection + the deleted
  hard-force (any OTHER rule still forcing the pattern off on desktop? demo files
  intentionally untouched) + `.app-boot` on all four shells (z-index vs every shell
  surface; teardown paths incl. views with no ready verb — launch restore/retry/tail;
  reduced-motion; double-load edges; empty_detail regeneration blink dial;
  icons.iife.js absent → fail-soft; a11y of role=status).
- **C — cross-cutting contracts:** ★ #221 chat wall (no new cross-WebView channels;
  wallet_sent renders only its OWN pushes) · money path VIEW-ONLY (no compose/sign/
  emit beyond dismiss/viewexplorer/txdetails) · frozen bridge (zero new verbs — every
  emitted verb pre-exists in C#) · #248 same-line-closed markers (sweep all touched
  files) · #254 storage ruling not widened (no new localStorage keys) · zero new
  string keys claim · bundle-before-shells preflight still sound with the new shell ·
  no literal NUL bytes.

## Accepted dials (do NOT re-litigate — flag only if they break something)

- empty_detail gets the uniform boot cover although it is static/instant (a ~1-frame
  logo moment on pane regeneration reads as the mark settling in) — Damir can drop it.
- The tx detail personalizes with the CONTACT avatar only when the name is not the
  C#-localized "Unknown" string; unknown → bare Sent/Received + direction circle.
- Explorer button label stays the component default ("View in Explorer") — this verb
  IS tx-scoped here (unlike the home tab's address-scoped override).
- The desktop demo's inline ghost-sheet detail is NOT forked to match (redone at a
  later demo pass, #256).
- Launch gets the #228 flag in this batch (it was queued in CLAUDE.md for "its
  rebuild batch").
- Boot cover drops at window LOAD (fail-safe), not at first data — data latency after
  load shows the shell's own progressive states.

## Non-negotiables (violations = MAJOR)

★ #221 isolation · money untouched (wallet-send LAST, B3 view-only) · frozen bridge ·
fail-loud over guard-and-degrade (#258 §5.6) · #248 markers · no NUL bytes ·
verify-first (#215) — an unverifiable claim in the build is a finding, not a pass.

---

## VERDICT (appended by the loop, 2026-07-12) — **CLEAN, 0 MAJOR**

Ran per the Damir directive as Opus-delegated agents inside the fable session:
3 disjoint read-only auditors → 1 mechanical fix + 1 accepted-as-mitigated + 1
logged edge → a FRESH break-my-verdict re-reviewer (found 1 more MINOR) → fix →
reviewer confirmation. All reads via file tools (#175: the mount served the four
edited shells STALE, build-shells.mjs truncated at 7,309 B, and wallet_sent.html
truncated at its PRE-EDIT byte length after the fix — every "fail" investigated
and attributed to the mount, real files verified intact via Read).

| Auditor | Scope | Verdict |
|---|---|---|
| A | B3 shell vs C# (arg shapes · lone-clearEntries · ghost-lift lifecycle · carriers in all 13 lang files · money display · verbs · preflight · call-UI contract · view-only security) | 0 MAJOR / 2 MINOR + 2 NIT |
| B | B2 order/defaults/hard-force-gone/#76-untouched + splash on all 4 shells (z/timing/reduced-motion/teardown/a11y) | 0 MAJOR / 1 MINOR |
| C | ★#221 · money view-only · frozen bridge (every `ixian:` classified, zero C# change) · #248 · #254 · zero new keys · pipeline/inliner refs · NUL · doc consistency | CLEAN |
| Re-review | Fix regression check + fresh attack (stale received flag · ghost-lift focus · pattern consumers · launch #228 blast radius · launch 5-file injection order) | HOLDS; +1 MINOR |

**Fixes LANDED (both mechanical, shell-only → `build-shells` picks them up):**
1. **B-1:** `.app-boot { pointer-events: none }` in all four shells — the ~400 ms
   fade teardown could occlude-and-block a cold-start call overlay (z-60 < z-99);
   `none` restores exact pre-batch input behavior (there was no cover before).
   Re-reviewer confirmed regression-free.
2. **Re-review MINOR-1:** `wallet_sent.html render()` re-homes keyboard focus
   (class+index match, first-focusable fallback, try/catch-guarded incl. the
   SVGAnimatedString edge) across the live status re-render's `replaceChildren`.
   Reviewer: FIX CONFIRMED.

**Accepted as mitigated / logged, NOT changed:**
- **A-1** pane-hosted back-button window: `buildTopbar(true)` at parse could emit
  `ixian:dismiss` → `popPageAsync()` pops the WRONG page when pane-hosted — but
  C# keeps the webView `Opacity=0` until AFTER the `hideBackButton` push
  (WalletSentPage.xaml.cs:34/:62/:67), so the button is gone before the page is
  visible. Defense-in-depth would be C#-side (push hideBackButton first) — logged,
  zero-C# batch.
- **A-2** boot spinner shows indefinitely IF WalletSentPage's FIRST poll
  early-returns (`lastActivityStatus` inits 0; only breaks if IXICore
  `ActivityStatus.Unknown == 0` — enum outside this tree, #215-unverifiable).
  Legacy-parity (legacy rendered blank fields in the same case). → be-cutover
  wallet note: BE confirms the enum value / pushes an initial burst
  unconditionally.
- **A-informational:** the B3 wallet-shell.js deltas add BEHAVIOR, not symbols —
  a stale bundle passes the preflight and silently ships the old tap-→-sheet
  behavior. Accepted per the #258 §5.6 ruling (mtime warning + bundle-before-
  shells order is the guard); consequence is graceful, non-crashing.
- **A-NITs:** `model.data.amount` stored-unused; fee trailing zeros (legacy
  parity). Re-review informational: pre-ready taps reach synchronously-built UI —
  PRE-EXISTING architecture, unchanged by this batch.

**Non-negotiables re-verified:** ★ #221 wall HOLDS (wallet_sent renders only its
own pushes; only pre-existing theme-key READ) · money path VIEW-ONLY (verbs:
onload/dismiss/viewexplorer + call verbs; home adds only `ixian:txdetails:` —
all pre-existing C#, zero C# change) · #248 markers same-line-closed (sweep
clean; carriers verified in ALL 13 lang files) · #254 not widened (no new
storage) · zero new string keys · preflight/inliner refs all resolve · no NUL.
