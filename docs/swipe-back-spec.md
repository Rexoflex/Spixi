# One-level-per-gesture back, on mobile — a spec, not a batch

**Status: SPECCED. Nothing here is built.** Damir asked for it on 2026-08-27 and said
in the same breath: *"if it's big, it can get its own session."* It is big. This
document is what that session should start from.

> *"On mobile — swipe gestures for back for all screens, sheets, keyboards and dialogs.
> Always one level down: if a sheet, closes the sheet; the next one goes back a level,
> and so on."*
> *"It needs to follow the OS rule — iOS for example doesn't have back buttons, so it's
> swiping for back and it needs to be working."*

---

## 1. ★ The finding that decides the shape: iOS receives no back signal at all

Every back mechanism in this app hangs off `OnBackButtonPressed`, and **that is the
Android hardware-back hook**. There are 26 overrides of it across the page tree. On iOS:

* nothing raises it — there is no `OnBackPressed`/`OnBackPressedCallback` anywhere in
  `Spixi/Platforms/`, and no `UIScreenEdgePanGestureRecognizer` or `SwipeGestureRecognizer`
  in the C# (the only `PanGestureRecognizer` in the tree is the desktop divider);
* the pages that *are* on a navigation stack have `NavigationPage.SetHasNavigationBar(this, false)`
  set on ~30 sites, and UIKit disables `interactivePopGestureRecognizer` when the bar is
  hidden. ⚠ Whether MAUI's iOS renderer re-enables it is **not answerable from this repo**
  and needs one device check;
* the surfaces that matter most are not on the stack at all. Chat, Account, contact
  details, the form pane and the tx detail are **overlay-presented** — attached into a
  host `Grid` and revealed by a property flip (`SpixiContentPage.pushPageLoaded`), never
  pushed. A pop gesture cannot see them by construction.

★ **So on iOS today, "back" is a topbar arrow inside a shell, and nothing else.** That is
the real gap. The gesture is the requested delivery mechanism; the missing signal is the
actual work.

## 2. What already exists, and is good

The one-level-per-press model is already built — for Android. It is worth keeping.

| Layer | Where |
|---|---|
| Native overlay stack | `SpixiContentPage`: `overlayStack`, `pushPageLoaded`, `closeTopOverlay`, `hasModalOverlay`, `isLockStaging`. Locks are deliberately kept OUT of the stack |
| The ordered chain | `HomePage.OnBackButtonPressed` — modal overlay → ring → Account `onBack` → contact-details `cdBack` → chat `chatBack` → `closeTopOverlay()` → `homeBack` → base |
| Shell → C# state wire | `ixian:homeoverlay` / `ixian:chatoverlay` / `ixian:cdoverlay` (+ `ixian:launchoverlay`, #614), each an absolute, coalesced push |
| DOM overlay stack | `src/components/overlay.js`: `stack`, `openOverlay`, `dismissTopOverlay`. `escDismiss: false` makes back **consume without closing** — the money-in-flight lock |

## 3. The gaps a consistent model has to close

1. ★ **iOS has no entry point.** Everything above is unreachable there.
2. **11 of 13 shells emit `ixian:back` but only 4 import `dismissTopOverlay`.** A sheet
   open in `app_details`, `app_new`, `contact_new`, `contributors`, `dev`, `downloads`,
   `scan`, `settings_backup`, `settings_encryption` or `wallet_sent` is **not a back
   level at all** — back skips it and leaves the page.
3. **Shell-internal takeovers are not `overlay.js` entries** — home contacts/new-chat,
   wallet Receive/Send, chat-info, chat select mode, the hand-rolled channel selector,
   settings sublevels. Roughly 8-10 surfaces, each tracked its own way.

## 4. Size, honestly

**~55-60 distinct surfaces**, in six groups: 26 native pages with a back override · ~6
overlay-presented pages that are not stack entries · 4 shell back routers · 23 components
that open DOM overlays · 8-10 shell-internal takeovers · and the special cases that must
STAY non-standard (the lock swallows unconditionally, the call ring swallows, money sheets
consume-without-closing, LaunchPage's in-place views).

## 5. ★ The recommended shape

**Do not build an iOS edge-swipe recogniser in C# first.** The stack it would pop is the
wrong abstraction — the most important surfaces are not on it.

1. **Give iOS a back SIGNAL, in the page.** A JS edge-swipe in the shells, raising exactly
   what `OnBackButtonPressed` raises today. `WKWebView.ScrollView.ScrollEnabled = false`
   and `body { overflow: hidden }` mean a horizontal gesture fights no scroller. One
   shared component (`src/components/edge-back.js`), attached once per shell like
   `attachPressFeedback()` is — that is the house pattern and it is the reason a new shell
   needs one line rather than a page of wiring.
2. **Make every shell a back router.** Import `dismissTopOverlay`, publish the overlay
   state, define the `…Back` handler. It is three lines per shell and it closes gap 2 for
   all eleven at once. #614 is the worked example.
3. **Bring the shell-internal takeovers into `overlay.js`'s stack**, or give each an entry
   in its shell's `…Back`. This is the biggest single piece and the one worth doing
   carefully; it is also where "one level per gesture" is actually decided.
4. **Then, and only then**, consider the native gesture for the pushed pages that really
   are on the stack (wallet send/receive/recipient/sent, scan, app-new, contact-new).

⚠ Keep the four exceptions explicit and pinned: the lock, the call ring, money-in-flight,
and LaunchPage. A model that unwinds *everything* uniformly would let a gesture dismiss a
lock or cancel a signing confirm, which is a security regression, not a polish win.

## 6. What ships before that session

`#614` only: the launch flow gained the back route it was missing, because an EXISTING
control was behaving wrongly there — hardware back changed the view underneath an open
sheet. That is a defect fix, not the model.
