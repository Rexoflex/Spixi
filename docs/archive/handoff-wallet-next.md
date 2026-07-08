# Handoff → next session: Wallet tab is wired + audited. Next = the REMAINING shells (apps · settings · launch), breadth-first.

**Damir already committed + pushed #182.** The redesigned **Wallet** surface now runs on the real C# bridge on Windows (balance hero, hide-balance, tx list, filters, send/receive/scan → native flows), alongside the already-wired Chats + Chat surfaces. All audited CLEAN. Start a fresh Opus chat from this file.

## Boot ritual (read in this order)
`CLAUDE.md` (status tail) → `DECISIONS.md` row **#182** (+ #177–#181 for the bridge-wiring lineage) → **this file** →
`docs/be-cutover-brief.md` (deferred-C# work order: chat **C1–C7** + wallet **W1–W4**) →
`docs/handoff-chat-deepening-next.md` + `docs/handoff-stage4b-bridge-next.md` (the bridge-wiring PATTERN + workflow constraints — STILL AUTHORITATIVE) →
`ARCHITECTURE.md` **§5** (29→9 shell map — decides which surfaces are separate pages vs home-tabs) + **§3/§4/§9** (verb inventory + per-view push contracts).

## What #182 did (all in `src/shells/home.html` + 3 components, ZERO C#, frozen bridge)
- **Wallet = tab2 INSIDE `home.html`** — NOT a separate page (ARCHITECTURE §5: `index.html`/`HomePage` is one shell with internal tab views). C# pushes wallet data into `index.html`; bottom nav swaps chats↔wallet client-side; Apps/Account (tab3/tab4) show a neutral placeholder pending their own wiring.
- **Wired pushes**: `setBalance`/`setHideBalance`/`clearPaymentActivity`/`addPaymentActivity`/`selectTx`.
- **Emitted verbs**: `ixian:sendixi`/`receiveixi`/`quickscan` (existing NATIVE signed flows — SECURITY.md, no signing in the WebView) · `ixian:filter:<f>` (**BRIDGE round-trip — C# re-flushes the filtered set; NOT client-side**; search stays client-side over the loaded set) · `ixian:balance:hide|show` · `ixian:explorer`.
- **Tx tap = in-page detail sheet** (Damir's call); `addPaymentActivity` has no address/fee → the sheet omits those rows (data-honest).
- **#46 audit — 2 MAJOR fixed**: (1) money was shown un-grouped/un-rounded (C# `amountToHumanFormatString` drops separators) → ported legacy `amountWithCommas`+`limitToTwoDecimals` into the shell; (2) a bare C# `null` arg (`Utils.cs:77`) crashed `atob` in `native.js` and dropped the WHOLE push → guard `a == null ? '' : b64ToUtf8(a)` (**bridge-core fix, benefits chat/home too**). +unknown tx badge, +per-tx explorer relabel. Re-review CLEAN.
- **Component edits (backward-compat)**: `txlist-item.js`/`wallet-shell.js` gained optional `timeText` (C# sends a pre-formatted time STRING, not epoch); `txlist-item.js` BADGES gained `unknown`.

## DEFERRED — needs C# (do NOT ship fragile). In `docs/be-cutover-brief.md`
- Wallet **W1** send epoch not a formatted string · **W2** address+fee+status-enum on `addPaymentActivity` (lights up the sheet's omitted rows) · **W3** tx-level explorer verb · **W4** disambiguate nickname-vs-address.
- Chat **C1–C7** (payments statusEnum+fiat+inline-Pay decision · calls enrichment · reactions own-flag/tips · app decline).
- **Strategy (Damir 2026-07-07):** ship every ZERO-C# type now → whole app working + tested → THEN one focused BE pass. Don't interleave C#; don't ship anything that misrepresents money/call state.

## NEXT WORK — breadth: wire the REMAINING shells
The whole app runs on real data once apps/settings/launch are wired like home/chat/wallet. **First: check ARCHITECTURE §5** — is the surface a separate C# page (own HTML file) or a `home.html` tab? (Wallet + Apps are home TABS; Settings + Launch are separate pages.)

Recommended order + method (same pattern as home/chat/wallet):
1. **Suggested next = Settings** (separate page `SettingsPage`→`settings.html`; mostly toggle rows — quick momentum win) OR **Apps** (home tab3, pairs with the wallet-tab pattern already in `home.html`).
2. Read the C# page's `sendUiCommand` set + legacy `js/*.js` (or `home.js` for tab3 apps) handlers = the contract. Cross-check ARCHITECTURE §3/§4.
3. Wire: `bridge.exposeAll` for C# pushes, `bridge.send` for legacy `ixian:` verbs, and **fire `bridge.ready()` on the window `load` event** (the #177 load-timing invariant — premature ready races C#'s first push → empty until refresh).
4. For a NEW separate-page shell: author `src/shells/<name>.html` + add it to `scripts/build-shells.mjs` SHELLS manifest. For a home TAB (apps): extend `src/shells/home.html` like the wallet tab (un-stub the handlers, add a view + nav swap) — no manifest change.
5. Accumulate C# gaps into `docs/be-cutover-brief.md` "Other shells" table (W-series continues).
6. #46 audit (read-only agent, file:line) → fix → re-review CLEAN → Damir F5-tests on Windows.

After all shells: full-app Windows test → Android round (`maui-integration-test-plan.md`) → item-5 C# repoint table (canonical §5 shell filenames, BE) → the BE cutover pass → Phase 4 freeze audit.

## Build / test ritual (Damir runs locally — PowerShell, one line each, no `&&`)
- If a **component** changed: `node scripts/build-demo-bundle.mjs` first.
- Always: `node scripts/build-shells.mjs` (re-inlines `src/shells/*.html` → `Spixi/Resources/Raw/html`; default = chat+home — add new separate-page shells to the manifest).
- Verify: `node scripts/smoke-test.mjs` (needs jsdom).
- F5 the `net10.0-windows` target in Visual Studio (CLI `dotnet run` hits the 9009 packaged-launch quirk → use F5 or `-p:WindowsPackageType=None`). Pre-existing C# build warnings (CoreStreamProcessor/SFilePicker/MauiProgram/ConsensusConfig) are not ours.
- **Commit via GitHub Desktop only.** If it complains about a lock, delete the stale 0-byte `.git\index.lock` (idle GitHub Desktop only) — has happened twice now.
- Every decision → a `DECISIONS.md` row.

## Key files
`src/shells/{home,chat}.html` (the wired pattern — home now has the chats+wallet tab split) · `scripts/build-shells.mjs` + `scripts/lib/inline.mjs` · `src/bridge/native.js` (null-arg guard lives here now) · `src/components/{wallet-hero,wallet-shell,txlist-item}.js` · `docs/{be-cutover-brief,handoff-chat-deepening-next,handoff-stage4b-bridge-next}.md` · `Spixi/Pages/**/*.xaml.cs` + `Spixi/Resources/Raw/html/js/*.js` (legacy contracts) · `ARCHITECTURE.md` §3/§4/§5/§9 · `DECISIONS.md` #182 · `CLAUDE.md` status.

## Flags / parked
- **Confirm the fiat sign** (`+$1,234.50` vs legacy's bare `1,234.50`) is the intended redesign — Damir F5 eyeball. Signed `$` is currently in the shell.
- **Avatars = gradient fallback** (C# avatar paths don't resolve in self-contained shells; needs data-URI or a resolvable path — repo-wide flag, also on the chat handoff).
- **Secure-notice / security URL** (chat) and wallet copy are inline in the shell (`window.SL`-overridable) — fold into the i18n extraction at the next strings pass. Note: the home shell threads `strings = {}` (bypasses `window.SL`) — a pre-existing, consistent pattern across chats+wallet, not a wallet-only bug; resolve holistically in an i18n pass.
- **Prior chat batch #178–181 is already in HEAD (`534c1e6b`)**; #182 was one clean commit (source + rebuilt bundle/index.html/chat.html + docs).
