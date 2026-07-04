# MAUI integration test — Round 1: Chats shell + Chat screen on device

**Goal:** prove the redesigned **chats shell** (`chats.html`) and **chat screen** (`chat.html`) render correctly and behave correctly with real touch input inside the *actual* MAUI WebView — on **Android** (testable on your PC) and **iOS** (needs a Mac, flagged below). This is the first real integration spike: it converts "works in desktop Chrome against a mock" into "works in the shipping engine on a real device."

Prepared 2026-07-04. Companion files: `scripts/build-test-shells.mjs` (packaging) + the harness code in §5.

---

## 1. Scope — what this round tests, and what it deliberately doesn't

**In scope (Round 1):**

- Does the WebView engine **render** our components correctly — layout, token CSS, fonts, inline SVG icons, light/dark, avatars, status glyphs, safe-area/notch handling.
- Do the **touch interactions** work on a real finger: list scroll + collapsing header, row swipe (Pin/Mute), long-press context menu, request Accept → handshake staging, and on the chat screen: composer + keyboard, message menu, reactions, media tap-to-load, typing indicator, scroll-to-latest, incoming-call overlay.
- Platform engine differences (Android Chromium WebView vs iOS **WKWebView**, which is the strict one).

**Deliberately deferred to Round 2 (bridge wiring):**

- Real C#↔JS bridge round-trips. Round 1 runs the shells on their **built-in mock data** — they are fully self-contained and exercise every interaction without any backend. That isolates *rendering + behaviour* from *bridge fidelity*, so a failure in Round 1 is unambiguously a WebView/CSS/JS issue, not a bridge mismatch. §9 sketches the Round 2 bridge smoke test.

---

## 2. How the app loads WebView HTML (so the harness is accurate)

Confirmed from the codebase:

- Pages inherit **`SpixiContentPage`** and call **`loadPage(webView, "file.html")`**; it builds a `WebViewSource` via `generatePage(...)` and wires the Navigating/Navigated handlers.
- **Android:** `HtmlWebViewSource` with inline HTML, **BaseUrl `file:///android_asset/html/`** — relative asset paths resolve against that. WebView settings: JS on, `AllowFileAccessFromFileURLs = true`, `CacheMode = NoCache`, **`DomStorageEnabled = false`** (⇒ no `localStorage`/`sessionStorage` — our components already never use them, good).
- **iOS:** `UrlWebViewSource`, HTML copied to app-data and loaded via **`file://`** in **WKWebView**. The navigation delegate **blocks all `http`/`https`** except `file://`, `tenor.com`, `giphy.com`, `apps.spixi.io`. It also **disables the WebView's own scroll + bounce** and **hides the keyboard input-accessory bar**.
- **Bridge (Round 2):** JS→C# = `ixian:` URLs intercepted in `Navigating` (`e.Cancel = true`); C#→JS = `EvaluateJavaScriptAsync` wrapping `executeUiCommand(...)`, queued until `document.readyState === "complete"`.

**Consequence for us:** to remove per-platform path-resolution as a variable, Round 1 ships each shell as a **single self-contained HTML file** (all CSS, JS, and fonts inlined). That's what `build-test-shells.mjs` produces.

---

## 3. Step 0 — package the self-contained test shells (PC, ~1 min)

From the project root (`Spixi Rework Of Frontend/Spixi`), on a real terminal:

```
node scripts/build-test-shells.mjs
```

This writes **`Spixi/Resources/Raw/html/chats.test.html`** and **`chat.test.html`** — each a single file with every stylesheet, the `spixi.iife.js` + `icons.iife.js` bundles, and all fonts (base64) inlined. Because they live under `Resources/Raw`, MAUI packages them automatically.

**Instant PC sanity check (no build yet):** open either `*.test.html` directly in Chrome, press **F12 → device toolbar** (📱), pick a phone preset. This confirms the inlining worked and the layout is sane. It is **not** a substitute for the real WebView (it won't catch WKWebView quirks) — it's a 30-second "did packaging work" gate before you spend time on a build.

Re-run the script after any component/CSS/bundle change to refresh the test files.

---

## 4. Step 1 — the test harness page (non-destructive)

A tiny page that hosts the WebView and lets you flip between the two shells. It **adds** files; it changes nothing existing.

**`RedesignTestPage.xaml`** (place next to the other pages, e.g. `Spixi/Pages/`):

```xml
<?xml version="1.0" encoding="utf-8" ?>
<local:SpixiContentPage xmlns="http://schemas.microsoft.com/dotnet/2021/maui"
             xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"
             xmlns:local="clr-namespace:SPIXI"
             x:Class="SPIXI.RedesignTestPage" Title="Redesign Test">
  <Grid RowDefinitions="Auto,*">
    <HorizontalStackLayout Grid.Row="0" Spacing="8" Padding="8" BackgroundColor="#111">
      <Button Text="Chats" Clicked="OnChats"/>
      <Button Text="Chat"  Clicked="OnChat"/>
    </HorizontalStackLayout>
    <WebView Grid.Row="1" x:Name="webView" VerticalOptions="Fill" HorizontalOptions="Fill"/>
  </Grid>
</local:SpixiContentPage>
```

**`RedesignTestPage.xaml.cs`:**

```csharp
using System.Web;

namespace SPIXI
{
    public partial class RedesignTestPage : SpixiContentPage
    {
        public RedesignTestPage()
        {
            InitializeComponent();
            NavigationPage.SetHasNavigationBar(this, false);
            // base loadPage() wires Navigating/Navigated + the readyState queue for us
            loadPage(webView, "chats.test.html");

            // Round 2 only: observe what the shell emits toward C#. Harmless in Round 1
            // (the shells emit no ixian: on mock data). Does NOT cancel — base handles that.
            webView.Navigating += (s, e) =>
            {
                var url = HttpUtility.UrlDecode(e.Url ?? "");
                if (url.StartsWith("ixian:")) System.Diagnostics.Debug.WriteLine("[shell→C#] " + url);
            };
        }

        void OnChats(object s, EventArgs e) => loadPage(webView, "chats.test.html");
        void OnChat(object s, EventArgs e)  => loadPage(webView, "chat.test.html");
    }
}
```

**Reach it without touching navigation flows** — in `App.xaml.cs` (or wherever `MainPage` is first set), boot straight into it in Debug only:

```csharp
#if DEBUG
    MainPage = new NavigationPage(new RedesignTestPage());
    return;                // remove these 2 lines to restore normal startup
#endif
```

> If `SpixiContentPage.loadPage` turns out to expect the derived page to own the `Navigating` handler, wire `Navigating="onNavigating"` in the XAML instead and move the logging there — but try the base wiring first; it's how the shipping pages work.

---

## 5. Step 2 — make it easy to *see* and debug

- **Android remote inspect (do this):** ensure `Android.Webkit.WebView.SetWebContentsDebuggingEnabled(true)` is active for debug builds (add it in the Android WebView renderer under `#if DEBUG` if not already). Then on your PC open **`chrome://inspect`** → your emulator/device → **inspect** the live WebView: full DevTools, DOM, and **`console.log`** from inside the shell. This is your best "see what's happening" tool on PC.
- **iOS remote inspect (on the Mac):** Safari → Develop → \<simulator/device\> → the WebView, for the WKWebView equivalent.
- **Capture:** screen-record each platform walking the checklist (Android emulator has a built-in recorder; iOS simulator File → Record Screen). Screenshots of any glitch. That's what you send back for us to triage.

---

## 6. Environment setup per platform

### 6a. Windows / WebView2 — fastest first look (PC, optional but recommended)
MAUI can target Windows, which uses **WebView2 (Chromium)** — closest to our demo Chrome, so it's the lowest-bar "does it run in a real MAUI WebView at all" check. Build/run the `net*-windows` target from Visual Studio. Good for a first render pass and quick iteration; **not** representative of iOS.

### 6b. Android emulator — the real Round-1 target on PC ✅
Requirements on your PC: **Visual Studio 2026** with the **.NET MAUI** workload (includes the Android SDK + an emulator image). **It must be 2026, not 2022** — the app targets **.NET 10** (`net10.0-android`, Microsoft.Maui.Controls 10.0.71, Android target SDK 35), which only VS 2026 builds. **Run VS 2026 as Administrator** (a known 2026 quirk otherwise leaves the emulator dropdown empty). Create/launch an AVD (a Pixel-class phone, recent API level). Then run the Android target of `SPIXI.sln` (F5 / `dotnet build -t:Run -f net10.0-android`). Also worth: deploy to a **physical Android phone** over USB — real touch + a real (possibly older) System WebView version is the most honest test. *(Known 2026 snags to expect: builds targeting Android API 35 on .NET 10 occasionally cancel silently — re-run / ensure the latest 2026 update; SDK-path mismatch errors (XA5300/XA5207) are fixed by pointing VS at the SDK it installed.)*

### 6c. iOS simulator — ⚠️ **MAC REQUIRED** (do this tonight)
MAUI iOS **cannot build or run from Windows alone** — it needs a Mac with **Xcode** + the iOS simulator (Windows can only "pair to Mac," and you still need the Mac). On the Mac: install Xcode + the **.NET 10 SDK** and build with **VS Code + the .NET MAUI extension** or the CLI (`dotnet build -t:Run -f net10.0-ios`) — note **Visual Studio for Mac is retired**, so it's VS Code / CLI, not a Mac IDE. Target the iOS simulator (iPhone 15/16 — a notched device, to test safe-area). WKWebView is where the real surprises live, so this pass matters most.

---

## 7. The test checklist — walk this on **each** platform

Tick pass/fail; note the platform. (C = Chats shell, `chats.test.html`; K = Chat screen, `chat.test.html`.)

### Rendering & layout
- [ ] Page loads (no blank screen, no error overlay).
- [ ] **Fonts** render as Sora (headings) + Source Sans (body), not a system fallback. *(Font loading is the #1 thing that silently breaks — see §8.)*
- [ ] **Inline SVG icons** all render (nav, topbar, chips, status glyphs, composer).
- [ ] Token colors correct; **delivered vs read** status glyphs correct.
- [ ] **Dark mode**: toggle the OS/app theme → shell follows (`prefers-color-scheme`). Both light and dark legible.
- [ ] Avatars: photos + colored initials both render; no broken-image boxes.
- [ ] **Safe area / notch (iOS especially):** top bar and bottom nav clear the status bar / home indicator; nothing clipped or under the notch.
- [ ] No horizontal overflow / sideways scroll; rows fill width.

### Chats shell (C) — touch behaviour
- [ ] **Scroll** the list: smooth, momentum feels native.
- [ ] **Collapsing header**: scrolling down retracts search + chips smoothly; it reveals again **only at the very top** (not mid-scroll).
- [ ] **Swipe a row** left/right: Pin/Mute panel reveals; short release springs back; full-swipe fires the action.
- [ ] **Only one** swipe drawer open at a time; tapping an open row closes it.
- [ ] **Long-press a row**: context sheet opens (Pin/Mute/Mark read/Chat info/Delete); doesn't fight a vertical scroll or a swipe.
- [ ] **Filter chips** (All/Unread/Groups) switch the list; "Park pin/mute" toggle hides the swipe/menu affordances.
- [ ] **Accept** a contact request → button latches "Accepting…", row becomes the "Establishing a quantum-secure handshake…" chat (pulsing), then secures (~2.6 s). Long-press it mid-handshake → "Cancel handshake".
- [ ] Requests sit in **chronological** position (one near top, "Lando C." buried ~5 days down).

### Chat screen (K) — touch behaviour
- [ ] Message history scrolls; date separators + unread divider render.
- [ ] **Composer**: tap the input → keyboard opens; the composer stays visible above the keyboard (**iOS keyboard-avoidance is a known risk** — see §8); typing grows the field; send works.
- [ ] **Long-press a message** → message menu (reply/copy/react/delete etc.).
- [ ] **Reactions**: add/juggle reactions; the "+N" overlap + reactions sheet work.
- [ ] **Media tile**: tap-to-load affordance shows; full-screen viewer opens/closes. *(A remote non-whitelisted image URL will be blocked on iOS by design — see §8; use the local/fixture media.)*
- [ ] **Typing indicator** + **scroll-to-latest** button appear and behave.
- [ ] **Incoming-call overlay** shows and dismisses.

---

## 8. Known-likely issues & first fixes (triage guide)

| Symptom | Likely cause | First fix |
|---|---|---|
| Text in a system font, not Sora/Source Sans | `@font-face` not loading in the WebView | The packaging script base64-inlines fonts, which sidesteps path issues; if it still fails, confirm the woff2 files existed at build time (script warns if not) and that the `font-family` names match. |
| Composer hidden behind the on-screen keyboard (iOS) | WKWebView doesn't resize for the keyboard; the app **hides the input-accessory bar** | Test first; if broken, the shell needs `visualViewport`-based bottom padding, or the iOS handler must allow keyboard resize. Log it — it's a known WKWebView pain, fixable in shell JS. |
| Inner lists don't scroll on iOS | The iOS handler **disables the WebView's own scroll**; our scroll is inside `overflow` divs | Confirm `.u-scroll` containers scroll with momentum; if stiff, add `-webkit-overflow-scrolling: touch`. |
| A remote media image never loads on iOS | WKWebView delegate **blocks non-whitelisted http/https** | Expected by design (P2P/allow-list). Use fixture/local media for the test; real media rides the file-transfer/whitelist path. |
| Swipe/long-press feels off or double-fires | Pointer-event vs touch-event differences per engine | Note exactly which gesture on which engine; our gesture code is pointer-event based — WKWebView quirks here are fixable in `chats-swipe.js` / `chats-row-menu.js`. |
| Blank screen on Android | An asset didn't inline, or a JS error | `chrome://inspect` the WebView, read the console. |
| Anything relying on storage silently no-ops | Android `DomStorageEnabled = false` | We don't use storage; if something does, that's the bug. |

**None of these are architectural dead-ends** — they land in shell JS/CSS or a thin per-platform WebView setting, never a C# rewrite or FE rework.

---

## 9. Round 2 (next, after Round 1 passes) — bridge smoke test

Once rendering + touch are good, wire a minimal C#↔JS round-trip to validate the real bridge against our `mock.js` contract: (a) C#→JS — from the harness, after `Navigated`, call `Utils.sendUiCommand(this, "addChat", ...)` and confirm the shell renders it; (b) JS→C# — make one shell action emit an `ixian:` URL and confirm the harness's `Navigating` logger catches it with the right arguments/encoding. This is where the `mock.js`-vs-real deltas surface; keep it separate from Round 1.

---

## 10. Success criteria & what to send back

**Round 1 passes when:** both shells load on Android **and** iOS, fonts + icons + dark mode render, and every checklist interaction works with touch — with any glitches captured. Send back: a screen recording per platform walking §7, screenshots of any glitch, and the checklist with pass/fail + notes. That's enough for us to triage and fix quickly.

---

## 11. ⚠️ What needs a Mac (for tonight)

- **iOS simulator testing (§6c)** — the entire iOS pass. Xcode + iOS simulator on a Mac; Windows cannot build/run iOS on its own.
- **Safari Web Inspector** for the iOS WebView (the WKWebView equivalent of `chrome://inspect`).

Everything else — packaging, the harness, Windows/WebView2, and the full **Android** pass — you can do on your PC now.
