# Opus adversarial review — Mac session (#282 + #283)

Range `c0ceae1e..fd5b308b` (2026-07-27). Three read-only Opus auditors on disjoint scopes
(native C# · web source · cross-cutting contracts) + a verification pass. `[verified]` = re-checked
against source in-session. Known-open iOS-26..32 not re-reported except as root-cause mechanisms
for iOS-29 / iOS-31.

## MAJOR — #283 fixes that don't actually fire

1. **Delete-history immediacy (iOS-24/25) is a no-op [verified].** `SingleChatPage.loadMessages()`
   returns early on `messages.Count == 0` *before* the `clearMessages` push. That empty state is
   exactly what exists right after `deleteHistory()`, so the open conversation (both the per-contact
   `ContactDetails.onRemoveHistory` path and any live pane) keeps rendering wiped messages until
   re-entered. The inline comment describes behaviour the function does not have. Fix: emit
   `clearMessages` before the empty guard (or special-case the emptied reload).

2. **Launch/onboarding shells never rebuilt — iOS-2 didn't ship [verified].** `build-shells.mjs`
   `DEFAULT` = 17 shells and excludes `LAUNCH_KEYS`. #283 edited `launch-shell.js` (ships only in the
   5 launch shells) but the pipeline ran the 17-shell default, so generated `intro*.html` /
   `onboarding.html` still call the old one-arg `illoSlot('backup')` and contain zero
   `fitTile` / `backupIllustration`. iOS-2 is marked FIXED but is not in the built output.
   Fix: `node scripts/build-shells.mjs all` (or fold launch into the rebuild whenever a component it
   ships in changes), then re-verify the 5 files.

3. **iOS-31 root cause (unread sticks after accepting a request) [verified].**
   `SingleChatPage.loadMessages()` sets `friend.metaData.unreadMessageCount = 0` then pushes
   `friend.getUnreadMessageCount()` (a derived accessor) instead of the literal `0`;
   `updateMessageReadStatus` deliberately never marks a `requestAdd` message read, so the accessor
   keeps returning >=1 -> row + Unread chip + tab badge stay stuck. Second leg:
   `HomePage.setContactStatus` coalesces into `contactStatusCache`, a **struct** in a `List<>`
   (mutations hit a copy) gated on `timestamp > cacheItem.timestamp` with the new push using
   `timestamp = 0` -> dropped inside the 1s drain window. Fix: push literal `0` at the call site;
   longer-term, mark requestAdd read locally while keeping the receipt suppressed.

4. **iOS-29 root cause (composer stays under keyboard) [verified].** `chat.html` gates the
   body-resize on `delta = innerHeight - vv.height > 60`, but the pan-undo `scrollTo(0,0)` (which
   fixes the topbar) is ungated — hence "topbar stays, composer doesn't." On device WKWebView
   (`ContentInsetAdjustmentBehavior = Never`, scroll disabled) `innerHeight` tracks `vv.height`, so
   `delta ~= 0` and the whole resize branch is permanently dead. Fix: baseline against a
   boot-captured layout height, or drive `body.style.height = vv.height` whenever the composer input
   has focus (correct whether the engine insets, resizes, or pans); gate on `vv.offsetTop > 0`, which
   is proven live on device.

## MAJOR — mini-app sandbox regressions

5. **External-link handoff applies to third-party mini-app WebViews [verified].** `iOSWebViewHandler`
   is registered globally for `typeof(WebView)` (`MauiProgram.cs:51`) and `MiniAppPage` uses a plain
   `<WebView>` running third-party publisher code (self-flagged at `MiniAppPage.xaml.cs:406`). #283's
   new `LinkActivated -> Browser.OpenAsync` now lets a scripted `a.click()` punch any https URL out to
   the OS browser with no confirm — previously all http/https from a mini-app was Cancel-blocked dead.
   No `TargetFrame` check either, so iframe anchors hand off despite the comment. Fix: scope the
   handoff to the trusted host shells; keep mini-app WebViews Cancel-only (or require the redesigned
   confirm-modal). **Security — log in `security-review-for-be-engineer.md`.**

6. **Mini-app pages lose the safe-area inset [verified].** `MiniAppPage` sets `Source` directly and
   never calls `loadPage()`, so `loadedHtmlFileName` is null -> `hasLegacyPageChrome("")` false ->
   `Padding = 0`, with `ContentInsetAdjustmentBehavior = Never` and no `viewport-fit=cover` in
   third-party HTML. Mini-app top UI renders under the notch. Fix: classify MiniAppPage explicitly
   (restore its historical inset).

## MINOR
- Global "delete all history" (`SettingsPage.onDeleteHistory`) only sets `shouldRefreshContacts` and
  never re-renders an open conversation — matters in desktop split-pane [verified].
- Missing `env(safe-area-inset-bottom)` on bottom chrome #282 didn't cover: toast,
  `.chat-pending-strip` + request pane, encpass footer.
- `fitTile` clamps tile aspect to 0.75 -> still letterboxes very tall media *and* downscales small
  media below 1:1.
- Backup stamp uses cross-WebView `file://` localStorage (plausibly unshared on WKWebView) -> iOS-19
  may not be fixed on device; it is also the only remaining backup prompt (the C# reminder path is a
  `dbg()` no-op in home.html).
- No `env(safe-area-inset-left/right)` anywhere, though iPhone landscape is allowed.
- Backup date formats with the default locale, not `docLocale()`; the standalone backup shell doesn't
  refresh its own status line after stamping.

## Docs/state
- CLAUDE.md was not updated for #283 and pointed the next session at the superseded
  `handoff-2026-07-27-issues.md` (plate = iOS-6/8/10/2, all claimed done). Addressed this session.
- `| 283 |` and `| iOS-32 |` table rows render detached (blank line / appended after prose).

## Clean / refuted
- viewport-fit=cover set == `hasLegacyPageChrome` list (8/8, no drift); generated artifacts fresh
  except the 5 launch shells; XSS/DOM-injection, env() fallbacks, tick-token scoping, wallet `onTx`
  desktop-gate, and the `backup.svg` asset canon all clean.
- `App.xaml.cs`, `Spixi.csproj`, `ThemeManager`, `Utils`, `UIHelpers`, `SPushService` unchanged in
  range (empty diff) — no Android/Windows regression possible from the range's edits.
