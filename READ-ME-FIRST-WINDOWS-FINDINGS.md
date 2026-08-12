# READ ME FIRST — Windows F5 findings (2026-08-12)

**From:** Windows Cowork session (Damir F5-testing on Windows, latest pulled `main` —
does NOT include the Mac session's uncommitted #314+ batch).
**To:** the Mac android/iOS session. Fold these into your batch (or a follow-up commit)
AFTER your current batch lands. No repo files were modified on Windows — this file is
new and merge-safe. Delete it once every finding is absorbed into DECISIONS/CLAUDE logs.

Priority order: W0 breaks the Windows build outright — one-line fix. W1 is
root-caused and CONFIRMED with runtime evidence — fix first among the UX items.
W2–W4 are desktop UX defects observed on Windows, traced to their source files.

---

## W0 — Windows solution builds break on the iOS bring-up RID default (one-line guard)

**Symptom:** VS "Build Solution" on Windows fails with NETSDK "The RuntimeIdentifier
platform 'iossimulator-arm64' and the PlatformTarget 'x64' must be compatible"
(RuntimeIdentifierInference.targets:350).

**Cause:** the iOS bring-up block (Spixi.csproj, "iOS bring-up (2026-07-22)") defaults
Debug iOS builds to `RuntimeIdentifier=iossimulator-arm64` with no OS guard. On
Windows, SPIXI.sln maps Debug → Platform x64 for Spixi, so evaluating the
`net10.0-ios` TFM collides (Apple RID vs PlatformTarget x64).

**Fix (Mac side, keeps the bring-up intact):** append an OS guard to that
PropertyGroup's condition:

```xml
<PropertyGroup Condition="$(TargetFramework.Contains('-ios')) and '$(RuntimeIdentifier)' == '' and '$(Configuration)' == 'Debug' and $([MSBuild]::IsOSPlatform('osx'))">
```

Not fixed locally on Windows (csproj is a hot file in your batch — avoiding the
conflict). Windows workaround in use meanwhile: `dotnet build Spixi\Spixi.csproj -c
Debug -f net10.0-windows10.0.19041.0 -p:Platform=x64` (Windows TFM only). Related,
no code change needed: a fresh Windows clone also needs `dotnet restore SPIXI.sln`
before first VS build (Spixi-PushService assets error is just missing restore).

---

## W1 — CONFIRMED: live `setTheme` pushes send base64; shell handlers compare plain strings

**Symptom (Damir, Windows):** after a theme pick, the desktop right pane (EmptyDetail
welcome) keeps the old theme; leftovers appear in both directions.

**Runtime evidence (DevTools on `ll_empty_detail.html`):**
- `document.documentElement.dataset.theme` → `'dark'` while the app was light.
- `typeof window.setTheme` → `"function"`, `typeof window.executeUiCommand` → `"function"`
  (shell is current, #251 handler present — NOT a stale-Raw build).
- Wrapper on `window.setTheme`, then a theme pick in Account →
  **`PUSH RECEIVED: ZGFyaw==`** — base64 of `"dark"`. The push arrives; the argument
  is encoded.
- Manual `window.setTheme('light')` flips the pane instantly → handler logic is fine;
  decoding is the entire gap.

**Root cause:** `Utils.sendUiCommand` base64-encodes EVERY argument
(`escapeHtmlParameter` = `Convert.ToBase64String`, Spixi/Utils/Utils.cs:36; wrap at
:112). That is the established bridge convention — handlers decode their own args
(home.html:287 "pushes data via executeUiCommand(fnRef, b64…)"). The `setTheme`
handlers added in #251 / Round 2 skipped the decode:

| Shell | Line | Behavior on base64 input |
|---|---|---|
| `src/shells/empty_detail.html` | 104 | `if (name==='light'\|\|name==='dark')` → **silent no-op** → pane never re-themes (Damir's repro) |
| `src/shells/home.html` | 2044 | `name==='dark' ? 'dark' : 'light'` → **always coerces to LIGHT** |
| `src/shells/chat.html` | 2636 | same coercion → always LIGHT |
| `src/shells/wallet_sent.html` | 410 | same coercion → always LIGHT |

Consequence of the coercion: picking LIGHT appears to work (by accident), picking DARK
never propagates to live panes — which is why earlier light-direction F5 checks passed.

**Push call sites (C#, all correct — do not change):** SettingsPage.xaml.cs:398–426
(pick-time: home + detailContent + defaultDetailContent + all overlays),
HomePage.xaml.cs:2332 (`onOverlayClosed`), HomePage.xaml.cs:2485 (`OnAppearing`).

**Fix (shell-side, keeps the bridge convention uniform):** in each of the four
`setTheme` handlers, decode before comparing:

```js
setTheme(name) {
  let t = name;
  if (t !== 'light' && t !== 'dark') { try { t = atob(t); } catch (e) {} }
  // ...existing logic, using t
}
```

(`atob` is safe here — payload is ASCII 'light'/'dark'. Keeping the plain-string
accept path means a future unencoded C# push still works.)

**Also in scope:**
1. `src/shells/contact_details.html` has NO `setTheme` handler at all (only the boot
   substitution at line 7). A live chat-info/group-info pane can never re-theme. Add
   the #251-style global + dispatcher stub (copy from empty_detail.html:100–111) with
   the decode above.
2. SECONDARY (separate, lower priority — file under its own decision): native
   backings are only computed at load/reload, never on live re-theme —
   `pageSurfaceColor` / page + Content + WebView `BackgroundColor`
   (SpixiContentPage.cs:102, applyPageSurfaceColor), WinUI
   `WebView2.DefaultBackgroundColor` (SpixiContentPage.cs:139), and #248 stage
   backings (SpixiContentPage.cs:1136/1276 read the stale field). After a pick, every
   live pane keeps old-theme native surfaces → old-theme flashes/slivers on
   present/resize until that page reloads. Consider a native re-apply pass over the
   same page set the pick-time push already enumerates.

Shell edits ⇒ shell rebuild + Raw regeneration (the usual pipeline; remember the
incremental-build-doesn't-repackage-Raw gotcha).

**Verify on device:** pick dark from a light app → home list, an open conversation,
the welcome pane, and an open chat-info pane all flip WITHOUT reload; repeat
light-direction; exit/re-enter Account (onOverlayClosed/OnAppearing re-assert paths).

---

## W2 — Desktop nav rail is covered by full-window surfaces (must ALWAYS stay visible)

**Requirement (Damir):** the left rail (Chats/Apps/Wallet/Account) is system chrome on
desktop — always visible and interactive. Today two kinds of surfaces cover it:

**A. Legacy full-window `Navigation.PushAsync` pages.** Confirmed on Windows:
- Receive ("Prejmi") — `WalletReceivePage` (loads legacy `wallet_request.html`):
  HomePage.xaml.cs:813, 817, 1404.
- Same class presumably applies to the other legacy wallet pages still pushed
  full-window (wallet_send / send_2 / recipient when reached via legacy paths) —
  audit `PushAsync` call sites reachable from desktop.

**B. The contacts/new-chat takeover inside home.html.** It is a full-VIEWPORT cover
mounted over the shell (home.html:137 "Contacts takeover — full-viewport cover
mounted OVER the shell"; `src/styles/components/contacts-shell.css`;
`openContacts('start')` via FAB / topbar). Since the desktop rail lives INSIDE
home.html (rail variant of bottomnav, home.html:164–170, 675–677), the takeover
covers the rail too. Observed on Windows for both the "Contacts" directory and the
new-chat picker ("Stiki").

**Existing pattern to copy (case A):** the wide-mode Account pins an overlay with a
rail inset — `pushPageLoaded(..., stageMargin: new Thickness(railWidthDip, 0, 0, 0))`,
HomePage.xaml.cs:1464–1465. Desktop-wide presentations of these pages should go
through `pushPageLoaded` with the rail inset (or `column: 1` detail-slot where that's
the better fit) instead of `PushAsync`; narrow/mobile behavior unchanged.

**Fix direction (case B):** on `:root[data-desktop]`, the takeover should cover only
the area beside the rail (inset `left` by the rail width, or mount it inside the
active-view container instead of the viewport). Rail stays clickable; tapping a rail
tab while the takeover is open should dismiss it (define the expected behavior).

---

## W3 — All/People/Groups chips undersized on the contacts takeover

**Symptom:** the filter chips on the Contacts directory / new-chat picker are visibly
smaller than the chats-list chips (All/Unread/Groups) — same-looking control, two
sizes on adjacent screens.

**Where:** the takeover's chip row is `.c-contacts__kinds`
(contacts-shell.css:67–77). `chip.css` defines two sizes — default
(`--spacing-4/--spacing-12`, `--font-size-body-sm`, chip.css:40–42) and a small
variant (`--spacing-4/--spacing-8`, `--font-size-body-xs`, chip.css:46–48). The
takeover renders the SMALL variant; the chats header renders the default.

**Fix:** use the same chip variant as the chats header (default/body-sm) on the
takeover — one variant/class change at the takeover's chip construction
(contacts-page.js / contacts-shell.css), no new CSS.

---

## W4 — Chat bubble max-width too small on desktop

**Symptom:** in a wide desktop conversation pane, bubbles cap out narrow (~1/3 of the
pane) — looks wrong (screenshot: group chat with long announcement message wrapping
hard while the pane is mostly empty).

**Where:** `message-bubble.css:64` — `max-width: min(var(--bubble-max-pct),
var(--layout-bubble-max))`; production values resolve to `min(85%, 480px)`
(chat.html:229). The 480px cap is mobile-tuned.

**Fix direction:** desktop override of the token, e.g. under `:root[data-desktop]`
raise `--layout-bubble-max` (Damir to pick the value — something in the 640–720px
range, or a %-of-pane cap). One-token change; keep mobile untouched.

---

## W5 — PRODUCT DECISION (Damir, 2026-08-12): chat background pattern styles

Prototyped and approved on Windows (local-only test block in Raw chat.html — NOT
committed; everything needed to productionize is below).

**Design:** Chat appearance gains a pattern STYLE picker with three options —
**Line art** (the current doodle tile), **Data matrix** (new), **Live flow**
(new, animated) — while the existing visibility control (Off/Subtle/Standard →
`--chat-pattern-opacity`) stays as-is. The two dials are orthogonal: style picks
the pattern source, visibility keeps mapping to opacity. "Off" lives ONLY in the
visibility control (no fourth style). Label the flow option as animated
("Live flow"). All three keep taking ink from `--chat-pattern-ink` per theme.

**Plumbing:** persist the style like the intensity pref and apply it in the SAME
pre-paint pref script (B2 #256) so the pattern never flashes the wrong style on
load; the appearance preview should reflect style as well. **Live flow is
DESKTOP-ONLY (Damir decision 2026-08-12)** — not offered on Android/iOS (constant
animation = battery cost); the style picker shows two options on mobile, three on
desktop.

**Data matrix tile** (Damir-approved look: faint 12px grid + dots snapped to cell
centers, two sizes, clustered runs). Deterministic generator — extend
`scripts/generate-chat-pattern.mjs` to emit it (same mask/data-URI mechanism as
the doodle; ~11KB URI vs the doodle's 325KB):

- Tile: 24×24 cells, 12px cell → 288×288, seamless by construction.
- Grid: 0.6px lines at every cell boundary, `fill-opacity: 0.16` (alpha inside
  the MASK → grid renders far fainter than dots under one ink color).
- Dots at cell centers, Markov run-bias per row: P(fill)=0.62 if left neighbor
  filled, else 0.30 (produces the punch-card streaks). Filled cell → 45% big dot
  r=1.7 full alpha, else small dot r=0.9 at `fill-opacity: 0.55`.
- Reference impl seed: PRNG seed 11 (any seed fine — regenerate to taste).
- mask-size: 288px 288px.

**Live flow engine** (canvas behind the log, replaces the ::before tile when
active). Spec of the working prototype:

- **LOCKED tuning (Damir F5 2026-08-12): speed 0.4 · spacing 20px · dash length
  4.5px · field scale 95px.** Grid of short dashes (lineWidth 1px·dpr, round
  caps); each dash angled by a smooth time-drifting field:
  `angle(x,y,t) = 0.9·(sin(1.7x+t) + cos(1.3y−0.8t) + sin(0.8(x+y)+0.5t))`
  with x,y in units of the field scale (95px) and `t = seconds × speed (0.4)`.
- Reads `--chat-pattern-ink` + `--chat-pattern-opacity` from computed style every
  frame → theme switches and the visibility dial apply live; opacity 0 renders
  nothing (visibility Off works).
- Budget: ~25fps cap (skip frames under 40ms), devicePixelRatio capped at 2,
  ResizeObserver on the chat canvas, `visibilitychange` pauses the rAF loop,
  `prefers-reduced-motion: reduce` → single static frame, no loop.
- Needs a covered/parked pause story on the C# side too (overlay over the chat,
  app backgrounded) — the WebView keeps running otherwise.
- Stacking (corrected after a Windows F5 regression): canvas as first child of
  `.c-chat-canvas` with `position:absolute; inset:0; pointer-events:none;
  z-index:-1`, and `.c-chat-canvas` gets `position:relative; z-index:0` so it
  forms its own stacking context (negative child then paints above the
  element's gradient background but below ALL in-flow content). Do NOT touch
  sibling positioning — a blanket `position:relative` on children pulls the
  absolutely-positioned jump-to-latest FAB into flow (left-aligned FAB + blank
  band above the composer). The static `::before` tile is hidden while flow is
  active.

---

## Suggested verification checklist (Windows, after the batch lands)

1. W1: theme pick both directions → every live surface flips without reload
   (home list, conversation, welcome pane, chat info); no old-theme pane after
   Account exit.
2. W2: open Receive and the new-chat/Contacts takeover on desktop → rail visible and
   clickable in both.
3. W3: chips on takeover visually identical to chats-header chips.
4. W4: bubbles in a wide pane use the new cap; narrow window unchanged.
