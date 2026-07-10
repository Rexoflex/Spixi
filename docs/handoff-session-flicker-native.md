# HANDOFF — flicker elimination + native punch (session 2026-07-09→10, Fable)

> **THE pickup doc.** Damir moves to the home computer: commit on the Mac per §1, then a fresh session
> reads THIS file first. Supersedes `docs/handoff-flicker-fable.md` (work order, done) and folds in
> `docs/handoff-flicker-next.md` (rounds 1–2 detail). Decision rows: **#222 #223 #224 #225 #226** —
> read them for full rationale; this doc is the operational summary.
> Session baseline commit: `9e574280` (round 1) is already on origin/redesign/frontend.

## 1. COMMIT STATE — do this on the Mac first

**Working tree holds ~36 modified files, UNCOMMITTED = rounds 2+3 + native punch.** They interlock
(shells were rebuilt cumulatively) → **ONE commit**:

```
native flicker rounds 2+3 (overlay nav #224/#225) + native punch: system-ui, desktop density, window sizing (#226)
```

Before committing: delete `_to_delete/` in the repo root (session temp incl. stale git lock files).
If GitHub Desktop complains about a locked index: remove `.git/index.lock` (bridge sessions leave it —
known). Then push → pull at home/VM → **Rebuild Solution** (embedded html changed) → run.
⚠ Build the **net10.0-windows** target only — net10.0-android has a PRE-EXISTING RocksDbSharp version
conflict (ActivityStorage.cs, 25 errors), unrelated to this work, untouched, needs its own fix.

## 2. WHAT SHIPPED (four layers, chronological)

**Round 1 (#222, committed 9e574280):** load-then-move staging (`SpixiContentPage.pushPageLoaded`) —
pages load invisibly, present on `ixian:onload`; theme-aware surfaces (`ThemeManager.getSurfaceColor`
#f9fafb/#13171b; legacy wallet pages keep launch-blue via `surfaceColorFor` map; lock always-dark);
WinUI `WebView2.DefaultBackgroundColor` (white-flash kill, `ToWindowsColor()`); C#-substituted boot theme
`*SL{SpixiThemeName}` in every shell head script (localStorage/matchMedia = demo fallback only);
Account slide fix. #46 loop #223: 2 MAJOR + 4 MINOR fixed (bot-chat bail race, iOS insets, stale-theme
reload, staged-chat message routing, legacy surfaces, double-tap orphans) → Opus CLEAN.

**Round 2 (#224):** Damir F5 findings — settings shell "auto" now trusts the C#-injected boot theme
(WebView matchMedia disagreed with the app on WinUI); `setTheme` push handler in home.html + chat.html
(live re-theme, #53 transition suppression, display-only); killed TWO always-true reloads that
double-booted Home on every Account exit (`onSaveSettings`'s unconditional changeAppearance-reload +
`OnAppearing(fromSettings)`'s `loadPage`); Account theme pick no longer reloads settings.html;
AppNew/Backup/EncryptionPassword wired (incl. the Account hub's own `ixian:backup`).

**Round 3 (#225) — OVERLAY NAVIGATION, the architecture change.** WinUI repaints a WebView2's
composition surface on every (re)attach — pushed page presenting, pop re-attaching the page below,
pane re-host — so push/pop navigation flickers STRUCTURALLY (why rounds 1–2 only dimmed it).
Redesigned screens are now **never pushed**: they load hidden inside HomePage's Grid and are **shown
in place**; close = remove + Dispose; Home is never detached. Key API (`SpixiContentPage`):
- `pushPageLoaded(target, timeoutMs=4000, tag=null, column=-1, replaces=null)` — overlay when
  HomePage is top-of-stack, else automatic round-1 push fallback (e.g. from legacy AppsPage).
  `tag:"chat"` = new conversation replaces the old AFTER it's visible (seamless switch; wide=column 1,
  narrow=full-span). `replaces:` = chained nav (AppNew→AppDetails) closes the CALLER after its
  successor shows.
- `closeOverlay/closeTopOverlay/getTopOverlay/getOverlayPages/getStagingPage` + `onOverlayClosed`
  host hook (Account exit refresh, rating) + `hostNav` (native pushes/modals from overlay pages ride
  the ROOT NavigationPage) + overlay-aware `popPageAsync/popToRootAsync/removePage` +
  `displaySpixiAlert` routed via MainPage.
- Still native pushes (untouched trust model): wallet money pages, scan, lock modal, mini-apps.
- Integration: `Utils.getChatPage/getChatPages` see overlay+staging chats (message routing);
  `UIHelpers.reloadAllPages` reloads overlays; HomePage `onUpdateUI` ticks the top overlay;
  OnBackButtonPressed closes top overlay; SettingsPage setTheme fans out to overlays.
Fixes structurally: conversation open/switch flicker (both widths), Account open/theme/save/exit,
"always returns to chats list" (Home keeps its tab), pushed-utility flicker. #46 Opus round-3:
1 MAJOR (chained-nav ghost frame) → fixed via `replaces` → **CLEAN**.

**Native punch (#226):** B1 — `--font-ui` system-ui stack; `--font-primary`+`--font-secondary` →
`var(--font-ui)`; NEW `--font-display: "Sora", system-ui` used ONLY by the topbar wordmark
(topbar.css root variant); Source Sans 3 RETIRED (face+preloads removed; shells ~70KB lighter, Sora is
the single embedded data-URI font). B3 — desktop (≥700px) type step: heading-sm 24→20/26,
heading-xs 20→18/24, body-lg 18→15/22 (row names), body-sm 14→13/18 (excerpts), label-md 16→14/20
(buttons/inputs); chat rows `padding-block: spacing-8` (≈64px, Telegram-class); mobile untouched;
heading-lg/display keep large desktop values (hero/launch). Windows sizing
(Platforms/Windows/App.xaml.cs): logical 1000×700 default / **480×360 min**, DPI-scaled
(GetDpiForWindow), min enforced by `OverlappedPresenter.PreferredMinimum*` (no resize-fighting, no
on-close ArgumentException — that crash is fixed), size persisted to Preferences + restored clamped
to work area, first run centred. Reviewer CLEAN.

## 3. F5 CHECKLIST (home computer, after pull+rebuild; BOTH themes, key combo = light app + dark OS)

WIDE window: chat open/switch/rapid-switch (old stays until new fully drawn) · double-click rows ·
chat back. NARROW (<700 logical): conversation, chat-info, add-contact, ADD MINI APP (fetch→details→
back — the `replaces` chain), app-details, Account, Backup, Change password. ACCOUNT: opens matching
app theme on Auto · theme pick re-themes instantly incl. Home + open chat behind · save/exit = zero
reload, lands on the SAME tab you left · language change = ONE visible Home reload (expected, strings
baked). NATIVE PUNCH eyeball: type/density vs Telegram dark-vs-dark both widths · launch/lock brand
screens (headings now system-ui — opt any brand moment back in with one `font-family:
var(--font-display)` line) · drag window edges (solid OS minimum 480×360 logical, zero jitter) ·
relaunch restores size · app close = no debugger break. FLOWS: a wallet send/receive from chat + from
Home (native pushes still work over overlays, return cleanly) · incoming call while chat open · bot
chat (bail → alert on the visible page) · chat from notification (≤4s fallback acceptable, report if
seen). If ANY pushed screen hangs ~4s = timeout fallback → report which (its shell didn't signal
onload).

## 4. KNOWN/DEFERRED (all logged in DECISIONS rows)

- **Desktop resize across 700px with a chat overlay open** strands it until reopened (M2, #225) —
  rework at the desktop split-view pass (desktop-split-spec).
- overlayMode locked at stage time (legacy push racing a stage → overlay waits beneath; self-heals).
- Account "explicit→Auto within one visit" resolves to the visit's boot theme (self-heals on reopen).
- Tab-intent from Account's bottomnav (tapping Wallet in Account lands on last-used tab, not Wallet) —
  needs a tiny verb/localStorage handshake; DESIGN, not bug, since Home now keeps its tab.
- S14 save-without-pop (Account exit on save) — BE verb, still queued.
- apps.html / wallet_send.html / launch+lock outputs NOT theme-injected/rebuilt (their src drifted
  before this session) — rebuild in their own batch, diff will include unrelated drift.
- iOS pass: preload insets re-apply landed blind (M2 #223) — verify at the iOS phase.
- Android: RocksDbSharp build breakage (pre-existing); Android F5 of overlays pending.
- Figma mirrors pending: type tokens (B1 fonts) + keys-responsive desktop values (B3) — 🟡 #226.
- B2 (WebView pixel scale), B4 (excerpt canon gaps), B5 (avatar uniformity) — open punch-list items.
- Reviewer flag-only: maximize persists as normal size · window position not restored · per-monitor
  DPI staleness of the minimum.
- `-webkit-font-smoothing: antialiased` (base.css:15) left as-is — no-op on Windows; revisit on Mac.

## 5. NEXT SESSION — suggested order

1. ~~Damir F5 verdict on §3 → dial B3 token values~~ **DONE 2026-07-10 (#227 dial 2 + #228 trigger):**
   heading-sm 18 · heading-xs 16 · body-lg 14 (row names) · NEW body-md 15 (bubbles) · NEW label-lg 16/
   label-sm 13. **#228: trigger = `:root[data-desktop]` platform flag** (head-top snippet × 14 shells;
   launch exempt) — type constant across resize, 700px stays pane-split only, smoke ≥700px guard passes
   again + new flag assertions. Extras: tx rows padding-block 8 desktop · search field 36px desktop ·
   wallet IXI amount + compactbal = `--font-display` (Sora, zero cost — brand-font opt-in #1 done).
   Owed: further brand-font opt-ins (launch/lock) → `node scripts/build-shells.mjs` (default set) →
   `node scripts/smoke-test.mjs` → F5 vs TG/Discord → ONE commit (#227+#228).
2. Remaining punch: B4 excerpt canon + B5 avatars (FE), B2 scale check.
3. Tab-intent push + S14 (small C#/BE), then the desktop split-view pass (fixes M2 structurally).
4. Figma mirrors (type + keys-responsive), then the drifted-shells rebuild batch.

## 5b. SESSION 2026-07-10 ADDENDUM (#227–#229, uncommitted on top of §1's tree)

Type dial 2 (#227) + **platform-flag trigger `:root[data-desktop]`** replacing the 700px type query
(#228: 14 shell head snippets, launch exempt; tx-row + search-field desktop density; wallet IXI amount
back on Sora; smoke guard modernized + new assertions; charset moved head-first in 12 shells) +
**lock modal load-then-present + overlay-close hide-then-dispose (#229, C#:** SpixiContentPage/App/
SettingsPage/LockPage; #46 review run, MAJOR input-freeze + biometric-defer + fail-closed + TotalSeconds
lock-bypass all fixed**)**. F5 adds: resize across 700px = type CONSTANT (panes still split) · app→lock
in both themes + from Settings confirms (delete wallet/account, lock off) · chat-info→conversation back
(no flash) · background >60s → resume MUST lock (TotalSeconds fix) · wallet balance renders Sora ·
search 36px / tx+chat rows ≈64px desktop. Damir sign-off owed: ≤1.3s staging exposure on resume-lock
(input frozen, screen visible) — DECISIONS #229.
**#230 (same day, F5 round 2):** the modal push STILL flashed (WebView re-attach, #225-class) → lock now
SHOWN IN PLACE (opacity flip) when host is top-of-stack + no modal above; modal push = fallback only.
`closeModalOverlay`/`hasModalOverlay`/`onPresentedInPlace`; HomePage back swallowed while locked.
Also: LockPage using System.Linq (CS1929) · "24 build errors" = the pre-existing net10.0-android
RocksDbSharp breakage — F5 with Framework=net10.0-windows only, don't Rebuild Solution.
Opus review session must cover #230 alongside #227–#229.

## 5c. NEXT-SESSION WORKFLOW (Damir 2026-07-10 — efficiency split, applies from now on)

Build sessions (fable): BUILD ONLY — no smoke/bundle/shell runs, no long commands; end each batch by
listing the exact commands for Damir to run locally. Adversarial review = SEPARATE Opus session over
a prepared brief; fable's in-session self-review is a pre-filter, not the sign-off. Damir F5s and
commits. Next session order: (1) Damir's F5 verdict + QUIRKS LIST triage — zero-C# quick fixes land
in ONE polish batch, bigger items get DECISIONS/be-cutover rows; (2) brand-font opt-ins (launch/lock);
(3) B4 excerpt canon · B5 avatar uniformity · B2 pixel-scale check; (4) then the desktop split-view
pass (fixes #225-M2) and the drifted-shells rebuild batch (launch gets the #228 flag there).

## 6. REVIEW/SECURITY TRAIL (for Damir + BE engineer)

Every batch ran the #46 loop with an Opus adversarial reviewer: #223 CLEAN · round 2 CLEAN ·
round 3 NOT CLEAN→`replaces` fix→CLEAN · #226 CLEAN. ★ rules verified each round: no signing/
broadcast, no keys/passwords across the bridge, no WebView-supplied paths, NO chat↔pane JS bridge —
overlays are N isolated WebViews in HomePage's native Grid = the sanctioned #221 model (NOT rejected
#220); money flows stay on native C# pages. BE-facing notes: `docs/security-review-for-be-engineer.md`
§1 (#222 staging lifecycle + #225 overlay model, with the specific review asks). One process note:
compile-sanity by review missed `ToWindowsColor` once (caught at first real build) — consider adding a
`dotnet build` smoke to the loop when an environment allows it.

## 7. FILE MAP (the whole uncommitted diff)

C#: `Spixi/Utils/SpixiContentPage.cs` (staging+overlay machinery — the file to review deeply),
`Utils/ThemeManager.cs` (getSurfaceColor/getResolvedAppearanceName), `Utils/Utils.cs` +
`Utils/UIHelpers.cs` (overlay routing), `Pages/Home/HomePage.xaml.cs` (host, onChat overlay,
onOverlayClosed, back, wiring), `Pages/Chat/SingleChatPage.xaml.cs` (surface, deferred reveal, back,
bot alert, hostNav), `Pages/Settings/SettingsPage.xaml.cs` (theme live-push, save fix, modals),
`Pages/Contacts/ContactDetails.xaml.cs` + `ContactNewPage.xaml.cs`, `Pages/MiniApps/AppDetailsPage
.xaml.cs` + `AppNewPage.xaml.cs` (replaces chains) + `AppsPage.xaml.cs`,
`Platforms/Windows/App.xaml.cs` (window sizing). FE: `src/styles/tokens.css` (fonts + desktop step),
`src/styles/base.css` (SS3 face removed), `src/styles/components/topbar.css` (wordmark) +
`chatlist-item.css` (row density), `src/shells/*.html` (boot-theme injection, setTheme handlers,
settings bootTheme/applyTheme, SS3 preload removal), `Spixi/Resources/Raw/html/*` (14 rebuilt shells).
Docs: DECISIONS #222–#226, this file, `handoff-flicker-next.md`, `font-size-audit.md`,
`native-feel-punch-list.md`, `security-review-for-be-engineer.md`.
