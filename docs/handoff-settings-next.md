# Handoff → next session: Settings/Account hub is wired + audited. Next = the LAST breadth shells (apps · launch).

**Damir first (build + F5 + commit — see the ritual below).** The redesigned **Account/Settings** hub now runs on the real C# bridge via `SettingsPage` (nickname · avatar · theme · language · app-lock · backup-nav · delete-data), alongside the already-wired Chats + Chat + Wallet surfaces. #46 audit CLEAN (post-fix). Start a fresh Opus chat from this file.

## Boot ritual (read in this order)
`CLAUDE.md` (status tail) → `DECISIONS.md` row **#183** (+ #177–#182 for the bridge-wiring lineage) → **this file** →
`docs/be-cutover-brief.md` (deferred-C# work order: chat **C1–C7** · wallet **W1–W4** · settings **S1–S6**) →
`docs/handoff-wallet-next.md` + `docs/handoff-stage4b-bridge-next.md` (the bridge-wiring PATTERN + workflow constraints — STILL AUTHORITATIVE) →
`ARCHITECTURE.md` **§5** (which surfaces are separate pages vs home-tabs) + **§3/§4/§9**.

## What #183 did (all in `src/shells/settings.html` + one component edit, ZERO C#, frozen bridge)
- **settings.html = a STANDALONE separate page** (ARCHITECTURE §5 shell #8, loaded by `SettingsPage` — NOT a home tab; no bottom nav, has a topbar back button). `build-shells.mjs` manifest repointed `settings` from the demo → `src/shells/settings.html` and added `settings` to `DEFAULT` (now chat+home+settings).
- **Wired C#→JS pushes**: `setNickname` · `setAppearance`(0/1/2) · `setLockEnabled`("True"/"False") · `showRemoveAvatar`("1"/"0") · `loadAvatar` · `onBack`. Coalesced into one rAF hub rebuild.
- **Emitted verbs** (every one a real `SettingsPage.onNavigating` branch): `ixian:save:<nick>` · `ixian:back` · `ixian:avatar` · `ixian:remove` · `ixian:appearance:<int>` · `ixian:language:<code>` (legacy `lang-data` codes) · `ixian:lock:on|off` · `ixian:backup` (→ legacy BackupPage) · `ixian:deleteh`/`deleted`/`deletea`/`delete`.
- **KEY MODEL — `ixian:save` persists AND POPS** (`onSaveSettings`), so nickname + avatar-tmp are held LOCAL and committed on **EXIT** (dirty → `ixian:save:<nick>`, clean → `ixian:back`). Theme/language/lock ride their own immediate verbs; theme/language make C# RELOAD the page (onLoad re-pushes). Load-timing #177 honored.
- **Component edit** (backward-compat, **needs bundle rebuild**): `createSettingsHub` gained an optional `onBack` → topbar back button (standalone page has no hardware back on desktop; default undefined = old root-tab behavior).
- **#46 audit — 1 real bug fixed**: pick-photo → remove-photo → exit RESURRECTED the removed avatar (`dirtyAvatar` was set-only → exit `ixian:save` promoted the leftover `avatar-tmp.jpg`) → cleared `dirtyAvatar` on any non-tmp `loadAvatar` + in `onAvatarRemove`. Re-review CLEAN.

## OMITTED — no `SettingsPage` bridge support → rows hidden (honest degrade). In `docs/be-cutover-brief.md` S1–S6
- **S1** own-address push (the QR-forward hero is dark without it) · **S2** backup-status signal · **S3** current-language push · **S4** version push · **S5** i18n live-locale in shells (holistic) · **S6** lock-OFF auth-cancel signal (for the spec's pending-OFF UX; today = optimistic-OFF, legacy parity).
- Also hidden because they're **HomePage-driven separate pages, not repointed**: Downloads/Dev/Contributors (HomePage.xaml.cs:312/316/436). And **Change wallet password** (`ixian:encpass` = the lock/encryption page, not routed by SettingsPage). These light up at the §5 C# repoint (cross-cutting item 5) — the redesigned components already exist (`settings-app.js`, lock shell).

## NEXT WORK — breadth: wire the LAST shells (apps · launch)
Same pattern as home/chat/wallet/settings. **First check ARCHITECTURE §5**: Apps = home **tab3** (extend `src/shells/home.html` like the wallet tab — un-stub `addApp`/`clearApps`/`addAppRequest`, add a view + nav swap, no manifest change). Launch = a separate page (`LaunchPage`→`intro.html`; brand-heavy, code-first draft + Damir art-direction; `illustrations-plan.md`).
1. Read the C# page's `sendUiCommand` set + legacy `js/*.js` (or `home.js` for apps) handlers = the contract. Cross-check ARCHITECTURE §3/§4.
2. Wire: `bridge.exposeAll` for pushes, `bridge.send` for `ixian:` verbs, `bridge.ready()` on window **load** (#177 invariant).
3. Accumulate C# gaps in `docs/be-cutover-brief.md` "Other shells" table (continue the letter series).
4. #46 audit (read-only agent, file:line) → fix → re-review CLEAN → Damir F5.

After all shells: full-app Windows test → Android round → item-5 C# repoint table → the BE cutover pass → Phase 4 freeze audit.

## Build / test ritual (Damir runs LOCALLY — PowerShell, one line each, no `&&`)
- A **component changed** this batch (`settings-shell.js` onBack) → `node scripts/build-demo-bundle.mjs` FIRST.
- Then `node scripts/build-shells.mjs` (DEFAULT now = chat+home+settings; re-inlines into `Spixi/Resources/Raw/html`).
- Verify: `node scripts/smoke-test.mjs` (jsdom). NOTE: smoke-test loads the **demos**, not `src/shells/*` (production shells navigate via `location.href`, which jsdom can't do) — the settings **demo** stays the smoke target; the wired shell is verified by F5.
- F5 the `net10.0-windows` target in Visual Studio (CLI `dotnet run` hits the 9009 packaged-launch quirk → use F5 or `-p:WindowsPackageType=None`).
- **Commit via GitHub Desktop only.** Stale 0-byte `.git\index.lock` → delete it (idle GitHub Desktop only).

## Flags / parked
- **Sandbox mount truncates large-file reads** (#175 class): the working-tree `src/demo/spixi.iife.js` reads back truncated in-session (so node/jsdom can't run here); the shell's small inline script is `node --check` green and the strict inliner resolved every ref. Damir's local rebuild produces the real bundle.
- **Nickname/theme edge (legacy parity):** editing the nickname then changing theme/language reloads the page and discards the pending nick (legacy loses it too). Not fixed — needs a persist-without-pop verb (BE).
- **Avatars = gradient fallback** (repo-wide flag — C# avatar paths don't resolve in self-contained shells).
- **F5 eyeball:** account hero (avatar + nickname, NO QR/address yet — S1) · theme swap · app-lock on/off (off → LockPage) · Backup opens the legacy BackupPage · Delete data screen → the four deletes (account/wallet hit LockPage auth).
