# Handoff → next session: Apps tab wired + audited. Next = the LAST breadth shell (launch/onboarding).

**Damir first (build + F5 + commit — ritual below).** The redesigned **Apps tab (tab3)** now runs on the real C# bridge inside `src/shells/home.html`, alongside the already-wired Chats + Wallet tabs and the standalone Settings + Chat shells. #46 audit CLEAN (post-fix). This was a **pure shell wiring — NO component changed — so no `build-demo-bundle` this batch.** Start a fresh Opus chat from this file.

## Boot ritual (read in this order)
`CLAUDE.md` (status tail) → `DECISIONS.md` row **#184** (+ #182 wallet-tab + #177 for the bridge-wiring lineage) → **this file** →
`docs/be-cutover-brief.md` (deferred-C# work order: chat **C1–C7** · wallet **W1–W4** · settings **S1–S6** · **apps A1–A2**) →
`docs/handoff-settings-next.md` + `docs/handoff-wallet-next.md` + `docs/handoff-stage4b-bridge-next.md` (the bridge-wiring PATTERN + workflow constraints — STILL AUTHORITATIVE) →
`ARCHITECTURE.md` **§5** (which surfaces are separate pages vs home-tabs) + **§3/§4/§9**.

## What #184 did (all in `src/shells/home.html`, ZERO C#, frozen bridge, NO component edit)
- **Apps = home tab3** (ARCHITECTURE §5 — an internal `HomePage` view like wallet, NOT a separate page; a standalone `apps.html` would get no pushes). Joins chats (tab1) + wallet (tab2) as a swappable view; C# drives it lazily on `ixian:tab:tab3` → `loadApps` (HomePage.xaml.cs:305).
- **Wired C#→JS pushes**: `clearApps()` · `addApp(id, name, icon, publisher, isSingleUser, isMultiUser)` (HomePage:1567 — **6-arg**, richer than apps-shell-spec's 3-arg assumption). `publisher` → the creator subtitle (real data → the spec's §7/§8 "add publisher" ask is **already satisfied**). `icon` is a local file path that doesn't resolve in the self-contained shell → **ignored** so `c-app-icon` falls back to a deterministic gradient tile (avatar-flag parity). `isSingleUser/isMultiUser` accepted for signature parity, unused in v1.
- **Emitted verbs**: row tap → `ixian:appDetails:<id>` · Add (topbar + action) → `ixian:newapp` · nav swap → `ixian:tab:tab3` (already there).
- **CRITICAL bridge correction:** inside `HomePage`, `ixian:details:<id>` is **CONTACT/friend details** (HomePage:274) — apps MUST use `ixian:appDetails:` (HomePage:408). The standalone legacy `apps.html` uses `ixian:details:` only because `AppsPage` has its own handler. Don't copy that verb into the home shell.
- **Reused components** (already in the shipped bundle — that's why no rebuild): `createAppsList`/`renderAppsList`/`setAppsQuery`/`setAppsLayout`/`createAppsHeader` + list⇄grid toggle + client-side search + empty state. rAF-batched render (no `clearAppsDone` signal — wallet parity).
- **v1 interaction = tap → details** (spec §2.1 + legacy `AppsPage` parity): the details page (AppDetailsPage, still legacy) owns launch (single vs multi), uninstall, and permissions. One gesture reaches everything; avoids guessing launch mode at the list level and the list-scoped-uninstall gap.
- **#46 audit — 1 MAJOR fixed**: `appMenu:false` suppresses the ⋮ *handler* but `apps-item.js:45` still renders the `menuBtn` element (dead, focusable, ~40px tap-zone per row). Hidden via shell CSS `#apps-view .c-app-item__menu { display:none }`. Root-cause **component** fix (guard `menuBtn` creation on `onMenu`) is tracked for the standalone repoint (be-cutover apps note). +MINOR stale CSS-block comment refreshed · +NIT unused model fields dropped.

## OMITTED — deferred to the standalone apps-shell repoint (honest v1 degrade)
- **Discover** feed (categories + live directory). Explore banner is hidden via CSS until the feed source is decided — FE fetch of `apps.spixi.io/data/apps.json` (domain whitelisted) vs a §8 bridge push. → be-cutover **A2**; Damir to get the feed contract from the team.
- **Direct-launch** (`ixian:startApp`/`startAppMulti`) + a **recents strip** — FE work; both verbs exist but need a list-level single/multi decision. The full standalone apps shell (`src/demo/apps.html`, already built: recents, details/add/discover surfaces) is the repoint target.
- **Per-row ⋮ menu** (App details / Uninstall) — OFF in v1 because **list-scoped uninstall has no home-tab bridge verb** (uninstall is AppDetailsPage-scoped). → be-cutover **A1** (`ixian:uninstall:<id>`).

## NEXT WORK — the LAST breadth shell: launch / onboarding
`LaunchPage` → `intro.html` (ARCHITECTURE §5, a separate page). Unlike the tabs, this is **brand-heavy** — code-first draft, then Damir art-direction. Read `docs/illustrations-plan.md` + the launch/onboarding notes first.
1. Read `Spixi/Pages/**/LaunchPage*.xaml.cs` `sendUiCommand` set + legacy `intro.html`/onboarding JS = the contract. Cross-check ARCHITECTURE §3/§4/§9 (create-account guard, create-failure, backup-tail already logged in §9.5).
2. Wire: `bridge.exposeAll` for pushes, `bridge.send` for `ixian:` verbs, `bridge.ready()` on window **load** (#177 invariant).
3. Accumulate C# gaps in `docs/be-cutover-brief.md` "Other shells" table (continue the letter series — next is an **L** row).
4. #46 audit (read-only agent, file:line, **file tools not bash** — the mount truncates large shells, #175) → fix → re-review CLEAN → Damir F5.

After launch: full-app Windows test → Android round → item-5 C# repoint table (§5 shell names, BE) → the BE cutover pass (chat/wallet/settings/apps asks) → Phase 4 freeze audit.

## Build / test ritual (Damir runs LOCALLY — PowerShell, one line each, no `&&`)
- **NO component changed this batch → SKIP `build-demo-bundle`.** (If you touch a component next time, run it FIRST.)
- `node scripts/build-shells.mjs` (DEFAULT = chat+home+settings; re-inlines `src/shells/home.html` into `Spixi/Resources/Raw/html/index.html`).
- Verify: `node scripts/smoke-test.mjs` (jsdom). NOTE: smoke loads the **demos**, not `src/shells/*` (production shells navigate via `location.href`, which jsdom can't do) — the apps **demo** (`src/demo/apps.html`) stays the smoke target; the wired tab is verified by F5.
- F5 the `net10.0-windows` target in Visual Studio (CLI `dotnet run` hits the 9009 packaged-launch quirk → use F5 or `-p:WindowsPackageType=None`).
- **Commit via GitHub Desktop only.** Stale 0-byte `.git\index.lock` → delete it (idle GitHub Desktop only).

## Flags / parked
- **Sandbox mount truncates large-file reads** (#175 class): `home.html` reads back at 510/622 lines in-session (`wc -c`=27823, `cp` copies truncated), so node/jsdom can't validate it here. The edits are verified via the file tool (true content, braces balanced) + the strict inliner. Damir's local `build-shells` + `smoke` is the gate.
- **F5 eyeball (Apps tab):** installed apps render as gradient icon tiles (avatar-flag — real C# icon paths don't resolve in-shell) with the creator subtitle · list⇄grid toggle + "Find installed apps" search work · tap a row opens the app details page · the topbar **+** opens AppNewPage · the Explore/Discover banner is intentionally hidden (parked) · empty state shows before C# flushes.
- **Avatars/app-icons = gradient fallback** (repo-wide flag — C# media paths don't resolve in self-contained shells).
