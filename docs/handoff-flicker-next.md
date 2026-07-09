# Handoff — native flicker fix (#222): state, C# review map, next steps

> **For the next session (or continuing this one).** Work order was `docs/handoff-flicker-fable.md`;
> decision row DECISIONS #222. Goal here: make the C# trivially reviewable — every change listed with
> file:line, why it's safe, and what to test. FE changes are one mechanical pattern across shells.
> Written 2026-07-09 (Fable build session). Round 1: audit loop CLEAN (#223), committed 9e574280.
> **ROUND 2 (same day, DECISIONS #224): Damir's F5 findings all fixed, reviewer CLEAN** — dual-pane
> load-then-swap, Account auto-theme = C# truth, save/theme-change double-reload bugs killed, live setTheme
> push, AppNew/Backup/EncPass wired. Remaining: commit+push → VM pull → rebuild → §4 F5 v2.

## 1. What this changeset does (one paragraph)

Kills the native push-transition flicker three ways: (1) **load-then-move** — the tapped screen's WebView
loads invisibly on the current screen and is presented only once its shell signals it's ready, so no blank/
half-booted frame is ever visible; (2) **theme-matched surface** — every native background that could peek
through now uses the redesign's screen surface in the CURRENT theme (light `#f9fafb` / dark `#13171b`),
never the legacy launch-blue; (3) **deterministic boot theme** — C# substitutes the active theme name into
each shell's head script at page-open, so a shell can never boot in the wrong theme (the old path trusted
localStorage/OS scheme). Account additionally stops sliding in (it was the one push without the
no-animation flag).

## 2. C# review map (ALL C# touched, nothing else)

| File | Change | Why it's safe |
|---|---|---|
| `Spixi/Utils/ThemeManager.cs` (+`getSurfaceColorString/getSurfaceColor`) | New theme-aware surface color; legacy `getBackgroundColor()` (launch-blue) kept for legacy call sites | Pure color lookup; no bridge, no state |
| `Spixi/Utils/SpixiContentPage.cs` — `loadPage` | Sets page + Content + WebView `BackgroundColor` = surface | Cosmetic; runs before Source loads |
| — `webViewNavigating` | (a) fires the preload-ready signal on `ixian:onload` (skipped when `deferPreloadReady`); (b) WINDOWS: sets `WebView2.DefaultBackgroundColor` = surface (kills WebView2's default WHITE pre-paint frame) | (a) reads the nav URL only, cancels nothing, runs AFTER the page's own handler (multicast order); (b) cosmetic platform property |
| — `checkIfPageLoaded` (iOS/Android blocks) | post-load page bg `getBackgroundColor` → `getSurfaceColor` | Same call sites, better color; legacy pages get neutral instead of blue behind safe-areas |
| — NEW preload machinery (`PreloadOp`, `pushPageLoaded`, `signalPreloadReady`, `presentPreload`, `cancelPreload`, `presentPlain`, flags `deferPreloadReady`/`presentedFromPreload`) | Stages target page's Content in a `ContentView` (Opacity 0, InputTransparent) inside the host's Grid → WebView gets a handler and loads; on ready → content restored to the page → `PushAsync(Config.defaultXamarinAnimations)`. 4s timeout presents anyway; any staging exception → plain push; host popped mid-stage → target `Dispose()`d; single-preload static guard (double-tap safe) | **No bridge/protocol change at all.** The staged page keeps its OWN WebView + JS context + its own `ixian:` handlers — same native-tree containment as the shipped desktop `rightContent` pattern. All UI mutations marshalled to main thread; `lock` + `Interlocked` guard the present/cancel/timeout race (first wins, rest no-op) |
| — `popPageAsync` | If called BY a currently-staged page (chat's bot-not-ready bail), cancels the preload + disposes instead of popping the visible page | Guard clause only; normal pops unchanged |
| `Pages/Home/HomePage.xaml.cs` | Pushes → `pushPageLoaded` at :221 add-contact, :288 chat-info, `onContactDetails`, `onSettings` (**also the Account slide fix**), `onChat` (dup-guard + popToRoot flow kept; dead `animated` var removed), `onInstallApp`, `onAppDetails`. `rightContent` host bgs → surface (were blue) | Call-site swaps only; every wrapped page class unchanged |
| `Pages/Chat/SingleChatPage.xaml.cs` | Ctor: bg → surface (**was #223766 navy even in light = THE reported light-mode dark flash**); `deferPreloadReady=true`; `signalPreloadReady()` in the FadeTo-reveal `finally`; `OnAppearing` skips ONE `reloadScreen` after a preload-present (staged load already ran it); `ixian:details`/app-details pushes → `pushPageLoaded` | Reveal timing unchanged for normal pushes; skip-flag consumed once |
| `Pages/Contacts/ContactDetails.xaml.cs` :90 · `Pages/MiniApps/AppsPage.xaml.cs` `onDetails` | Push → `pushPageLoaded` | Call-site swaps |

**★ rules check:** touches NO signing/broadcast, NO keys/passwords, NO WebView-supplied paths, NO chat↔pane
JS bridge (isolation §1 intact — logged in `security-review-for-be-engineer.md` §1 with the teardown
lifecycle note), NO password-over-URL, NO remote fetches. It is background colors + navigation timing + an
animation flag, exactly per the work order.

## 3. FE changes (mechanical, same pattern × 13 shells)

- `src/shells/*.html` head script: prefer `*SL{SpixiThemeName}` (substituted "light"/"dark" by
  `SpixiLocalization.localizeHtml` at page open; registered by `ThemeManager.loadTheme` at startup + on
  appearance change) → fall back to the old localStorage/OS path (browser demos keep working — the literal
  `*SL{` string fails the light/dark check). Body-tail theme blocks now no-op when `data-theme` is already
  set (they could have overridden the injected theme with stale localStorage).
- `src/shells/settings.html`: boot `applyTheme(0)` REMOVED — it forced the OS scheme and wrote `'0'` over
  the persisted appearance pick until C#'s `setAppearance` landed (its own wrong-theme flash + a
  persistence bug). Picks/pushes still applyTheme+persist.
- `Spixi/Resources/Raw/html/*`: rebuilt via `node scripts/build-shells.mjs all`; drifted regenerations of
  UNTOUCHED shells (apps, wallet_send, the 5 launch outputs) were reverted so the commit stays focused —
  their src had moved since the last build; rebuild them in their own batch.

## 4. Damir's F5 checklist — v2 (BOTH themes; light app + dark OS is the key config)

WIDE window (dual-pane): 1. click chat rows — old conversation stays until the new one appears fully drawn
(no dark second, no boot flicker); 2. double-click a row — nothing extra happens; 3. switch chats rapidly.
NARROW window (<700px): 4. conversation push · 5. chat-info · 6. add-contact · 7. ADD MINI APP (new) ·
8. app-details · 9. Account · 10. Backup + Change password from Account (new). For each: no blank/white/
dark/wrong-theme frame, fully-drawn single paint, Account does not slide.
THEME: 11. Account on appearance=Auto must match the rest of the app (dark app → dark Account); 12. pick
Light/Dark in Account — Account re-themes INSTANTLY (no reload flash) and Home + open chat pane re-theme
behind; 13. exit Account (Save) — NO home reboot flash (the move-to-home itself stays until BE lands S14);
14. change language + Save — one visible Home reload is EXPECTED (strings are baked); 15. bot/group chat ·
16. chat from a notification (may take up to 4s — fallback; report if seen).
If a pushed screen ever hangs ~4s before presenting, that's the timeout fallback — report which screen.

## 5. Status / next steps (tick as they land)

- [x] Implementation (C# + shells + rebuild) — in Damir's working tree, UNCOMMITTED
- [x] Docs: DECISIONS #222 · security-review §1 note · punch-list §A status · this brief
- [x] `docs/font-size-audit.md` — the type/density/window-size analysis (proposals only; includes the
  Windows min-size resize-fighting finding, `Platforms/Windows/App.xaml.cs:26–29,60–72`)
- [x] **#46 audit loop DONE — DECISIONS #223.** Audit: 2 MAJOR / 5 MINOR / 5 NIT (security CLEAN) → all
  MAJORs + 4 MINORs FIXED (abandoned-preload race · iOS insets re-apply · reload() re-localizes · staged chat
  receives live messages · legacy pages keep legacy surface · rejected preload disposed) → **Opus adversarial
  re-review: VERDICT CLEAN** (every fix verified correct, no new defects, compile-sanity OK)
- [ ] Damir F5 per §4 → ONE commit: `native flicker: load-then-present + theme-matched bg + account slide (#222)`
- [ ] Cleanup: delete `_to_delete/` in the repo root (session temp; bridge can't delete files)

## 6. Watch items for the reviewer (be adversarial here)

- Content re-parenting (page → stage → page → PushAsync): proven pattern hosted-direction (desktop
  rightContent); the RESTORE+push direction is the novel part — verify on WinUI first, Android second.
- `updateScreen`'s 1-second timer targets `NavigationStack.Last()` — a staged page isn't in the stack, so
  it only catches up on present (by design; chat re-runs it in onLoad).
- Bot-not-ready path (`SingleChatPage.onLoad` Thread.Sleep loop): under preload it now cancels cleanly via
  `popPageAsync`, but `DisplayAlert` on a never-presented page is untested — worst case the alert is lost.
- Theme change / OS-theme change mid-stage (`UIHelpers.reloadAllPages` walks the nav stack; staged page not
  in it — it presents with the boot-time theme; next open is correct). Rare; acceptable? Flag if not.
