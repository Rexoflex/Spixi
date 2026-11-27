# Agent contract — imgurl (pictures by a local link, the trim hook)

> ★ #1972 (2026-11-27): items 3 (the renderer-death handler) and 4 (the Windows page store) LEFT this batch. Their rows
> below (and the hook lines H1–H4) are history of the build; none of their files is in the tree.

File name: `docs/contract-imgurl.md`. The lead wrote it BEFORE any agent started (`docs/orchestration.md` § 4).
Every agent gets this file plus its own row. An agent that needs a file outside its row stops and asks the lead.
Prompt: project doc `claude/session-imgurl-prompt.md` (Ready by Damir, 2026-11-26 16:21 / 16:35). Lead: Claude Opus.
Rulings in force (do not re-open): #1642 (the design rule of the media handler), the P-25 research conditions (grants
per WebView + document version + pixel size, revoked with the document, `no-store`, C# names every file, the adopt
keeper is a ship condition, the viewer first), #1738 (3) (P-14 and P-15 in this batch), #1969 (the Windows page store,
option B), #1963 (8) (the size rule R1–R6), #1312 / #1478 (own switch per change, the old path = the fallback).

## 1 · Base
- Tree: `work/imgurl` @ `ae7b8303` "Merge pull request #29 from Rexoflex/work/fixb5" · baseline (observed by the lead in
  the cloud twin): smoke `BASELINE OK <n> / the 2 KNOWN` (expected 7094), CSH `pass=919 fail=0` (observed) · tools:
  `npm ci` on the committed lock (jsdom 29.1.1, eslint 10.14.0, tree-sitter 0.25.1, tree-sitter-c-sharp 0.23.5) · .NET SDK
  10.0.115 · `../Ixian-Core` @ `097341a` · `TZ=America/Los_Angeles` · Chromium: `/usr/bin/google-chrome` and
  `PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs`.
- The lead's switch block is ALREADY in the tree: `Spixi/Utils/SpixiFlags.cs` → `public static class ImgurlFlags`
  (`MediaOrigin`, `MediaKeep`, `TrimHook`, `RendererGone`, `WinStoreFolder`; absent = ON, a stored 0 acts only in dev mode,
  one `[FLAGS] imgurl …` line). ★ After #46 round 3 `RendererGone` was PARKED; ★ #1972: `RendererGone` and `WinStoreFolder` are REMOVED (three switches now). Nobody else edits `SpixiFlags.cs`.
- Must hold for everyone: the ★ PARAMOUNT isolation invariant (a grant of one WebView is never valid in another) · ★ C#
  touches no risky parts (no WebView-supplied path or name reaches a file op; C# names every file) · the frozen bridge: NO
  new verb, NO new push name, NO new argument shape — the URL rides the existing `setFileThumb(id, value)` and
  `viewerImage(token, value)` pushes as another accepted VALUE, and two cap words (`mediaOrigin`, `mediaKeep`) ride the
  existing `setCaps` (an older shell ignores both; an older exe declares neither) · #1312 / #1478 · the security handover
  gate (a new WebView setting, a new resource path, a log line → its section) · edit `src/`, never
  `Spixi/Resources/Raw/html` by hand · no commit, no push, no full smoke, nothing in Ixian-Core, `Spixi/Meta/**`,
  `.github/**`, `scripts/device/**`, the reply match of `SingleChatPage.xaml.cs` and `ContactNewPage.xaml.cs` (session
  `quotebox2`), `docs/process.md`, `docs/orchestration.md`, `docs/templates/**`.
- **The size rule R1–R6 (#1963 (8)), batch budget:** app C# at most **+700 code lines**, hand-written `src/**` at most
  **+250 code lines**. Per item (the lead holds the rest): 1a ≤ 300 · 1b ≤ 130 · 2–4 ≤ 220 · flags block 45 (done) ·
  1c (`src/**`) ≤ 230. R2: a new comment says WHAT or WHY, never history (no batch name, round, walk, reader or date; a
  decision number at most once per member). R5: no probe or timing line outside `#if SPIXI_DEV_COEXIST`. R6: a file over
  1,500 lines grows ONLY by lines that cannot sit elsewhere — `SingleChatPage.xaml.cs` (10,694) and `SpixiContentPage.cs`
  (7,732): call-site lines only, every new MEMBER goes into a new partial file; name each grown line in your return.
- The old path must stay byte-for-byte the base when a switch is OFF (read your diff with that question).

## 2 · Items and ownership (file scopes are disjoint)
| Item | Agent | Model (effort high) | Owns (files / folders) | Reads only | Owes | Scratch folder |
|---|---|---|---|---|---|---|
| 1a the media handler + the grants | builder-handler | **fable** (#1642) | NEW `Spixi/Utils/MediaGrants.cs` · NEW `Spixi/Platforms/iOS/MediaSchemeHandler.cs` (+ the csproj line only if the Mac build needs it named — say so) · `Spixi/Platforms/Android/WebViewRenderer.cs` · `Spixi/Platforms/Windows/WindowsWebViewHandler.cs` · `Spixi/Platforms/iOS/iOSWebViewHandler.cs` · NEW `scripts/csh/MediaGrantsTests.cs` + its lines in `scripts/csh/csh.csproj` and the test runner registration · NEW `scripts/pins-imgurl/a-handler.mjs` · the HOOK lines of § 3 (H1–H4) inserted verbatim in the three platform files · NEW `docs/be-review-pack/P113-media-origin.md` (the handler half) · its gate-section text in `/home/claude/scratch/a/gate-a.md` | `/home/claude/research/d2b/*` (the research prototype: `D2B-csharp-written.diff` is a WRITTEN, never compiled sketch — read it, do not trust it), `ViewerImage.cs`, `ChatMediaStore*.cs`, `Utils.IsAllowedURL`, `docs/security-handover-gate.md` | CSH tests (grammar, owner binding, document revocation, caps, viewer latest-wins, stable token, no-owner, mini-app, thread safety); pin a with one deliberate break per row (#802); P113 | `/home/claude/scratch/a/` |
| 1b the chat page's call sites | builder-page | opus | NEW `Spixi/Pages/Chat/SingleChatPage.MediaOrigin.cs` (partial; every new member) · `Spixi/Pages/Chat/SingleChatPage.xaml.cs` (CALL-SITE lines only: the thumb push in `processThumb`, the viewer answer `onViewImage` / `pushViewerImage`, the document start next to `thumbDoc++` in onLoad, the caps line next to `Photo1bChatCaps`, the page teardown) · `Spixi/Utils/ViewerImage.cs` (ONE new bytes form beside `dataUriOfAsync`; the old methods unchanged) · NEW `scripts/csh/MediaPushTests.cs` (+ csproj lines) · NEW `scripts/pins-imgurl/b-page.mjs` · its gate text `/home/claude/scratch/b/gate-b.md` | `MediaGrants.cs` as the interface of § 3 says (code against the interface; builder-handler writes the body — until it lands, a stub in YOUR scratch copy only) | CSH tests for the push-value rule; pin b with breaks | `/home/claude/scratch/b/` |
| 1c the chat shell + the keeper + the lab | builder-shell | opus | `src/shells/chat.html` (the `setFileThumb` / `viewerImage` acceptance, the cap read, every sink that re-checks a thumb value) · `src/components/media-viewer.js` · `src/components/media-bubble.js` (the keeper) · `src/components/typed-bubbles.js` / `src/components/media-strip.js` ONLY where a thumb value is re-checked · `src/bridge/mock.js` only if the demo needs the cap off · NEW `scripts/pins-imgurl/c-shell.mjs` · NEW `scripts/pins-imgurl/lab-media.mjs` (by hand, Playwright, NOT a pin) · its gate text `/home/claude/scratch/c/gate-c.md` · `docs/be-review-pack/P114-media-keep.md` | the built html (run the generators in YOUR copy to test) | jsdom pins with breaks; the lab numbers (base vs new, method) in `/home/claude/scratch/c/lab.md` | `/home/claude/scratch/c/` |
| 2, 3, 4 the trim hook, the renderer-death handler, the Windows page store | builder-life | opus | `Spixi/Platforms/Android/MainApplication.cs` (the trim hook) · NEW `Spixi/Platforms/Android/RendererGoneAndroid.cs` · NEW `Spixi/Platforms/Windows/WebViewLife.cs` · NEW `Spixi/Platforms/Windows/WebViewStoreFolder.cs` · NEW `Spixi/Platforms/iOS/RendererGoneApple.cs` · NEW `Spixi/Utils/TrimRules.cs`, `Spixi/Utils/RendererGoneRules.cs`, `Spixi/Utils/WebViewStoreRules.cs` (pure, CSH-run) · `Spixi/Utils/SpixiContentPage.cs` and `Spixi/App.xaml.cs` ONLY if the rebuild needs a call site (R6: name each line; prefer a new partial file `Spixi/Utils/SpixiContentPage.Life.cs`) · NEW `scripts/csh/LifeTests.cs` (+ csproj lines) · NEW `scripts/pins-imgurl/d-life.mjs` · `docs/be-review-pack/P115-trim-hook.md`, `P116-renderer-gone.md`, `P117-win-store-folder.md` · its gate text `/home/claude/scratch/d/gate-d.md` | `docs/perfb1-spare-drop-reason.md`, `SpixiContentPage.dropSpareChat` / `disposeParkedOverlay`, `Node.onLowMemory`, `MauiProgram.cs` (read: the existing trim lambda stays), the wvstore research (`/home/claude/research/wvstore.md`) | CSH tests; pin d with breaks; the dev-build test path of P-15 per platform (what the walk does) in `/home/claude/scratch/d/walk.md` | `/home/claude/scratch/d/` |
| — | lead | opus | `Spixi/Utils/SpixiFlags.cs` (the block, done) · `scripts/smoke-test.mjs` (ONE registration block) · the built html (generators only) · `docs/security-handover-gate.md` (the batch section, from the agents' texts) · the export docs · `DECISIONS.md` #2035–#2059 · `docs/lessons.md` L319–L326 · `docs/release-readiness.md` · packets index | | integration, every full smoke, the size count | |

Every agent works in ITS OWN full copy of the tree: `cp -a /home/claude/trees/base /home/claude/trees/<a|b|c|d>` (the
sibling `/home/claude/trees/Ixian-Core` link is already there), runs only its own pin modules
(`node scripts/run-pins.mjs pins-imgurl/<mod>`) and `node scripts/run-csh.mjs` in that copy, and never the full smoke.
Nothing executes in `/home/claude/spixi` (the lead's smoke runs there).

## 3 · Interfaces between items (the only way two items meet)
| Name | Shape | Provider | Consumer |
|---|---|---|---|
| **The URL** | Android + Windows: `https://spixi-media.invalid/m/<32 lower-case hex>`; iOS + Mac: `spixi-media://m/<32 lower-case hex>`. Nothing else (no query, no fragment, no path after the token, ≤ 64 chars). `MediaGrants.Prefix` gives this platform's prefix | 1a | 1b (pushes it), 1c (accepts exactly this grammar, both prefixes) |
| **`MediaGrants`** (namespace `SPIXI`, no MAUI type in its signatures, thread-safe, never throws, never logs a token / id / path) | `enum MediaKind { Thumb = 1, Viewer = 2 }` · `const int TokenHex = 32` · `string Prefix` · platform side: `void serverUp(object owner)` (this WebView's handler is installed and serving), `void serverDown(object owner)` (revokes all of the owner), `bool tryServe(object owner, string url, out byte[] bytes)` (strict grammar, `ReferenceEquals` owner, false = the handler answers 404, never the network) · page side: `bool serving(object owner)`, `void beginDocument(object owner, int doc)` (revokes every grant of the owner with another doc), `string? grant(object owner, int doc, MediaKind kind, string idHex, int px, byte[] jpeg)` (the URL, or null = push the old data: value: no server, a doc that is not the current one, a cap reached, bad input), `void revokeOwner(object owner)` · response: `string ContentType = "image/jpeg"` and the header list (`Cache-Control: no-store`, `X-Content-Type-Options: nosniff`) | 1a | 1b, the platform handlers |
| **Grant rules** (1a decides the numbers; write them in P113) | token = 16 bytes of `RandomNumberGenerator` → lower-case hex; the same (owner, doc, kind, idHex, px) while granted → the SAME URL (a stable URL is what the keeper needs); Viewer: one live grant per owner (a new one revokes the old); Thumb: a count cap and a byte cap per owner (over → null); an owner is never kept alive by the table (weak keys or explicit removal at `serverDown` / `revokeOwner`); the bytes are C#'s own re-encoded JPEG (the PO-3 store / the thumb decoder / `ViewerImage`), never a file path | 1a | 1b |
| **The owner** | the page's MAUI `Microsoft.Maui.Controls.WebView` element (`SpixiContentPage._webView`): Android `SpixiWebviewRenderer2.Element`, Windows / iOS `WebViewHandler.VirtualView`. A mini-app WebView (`ClassId == "miniapp"`, `SafetyRules.isMiniAppMarker`) never calls `serverUp` | 1a | 1b |
| **Caps** | `setCaps` gets `,mediaOrigin` only when `ImgurlFlags.MediaOrigin && MediaGrants.serving(_webView)`, and `,mediaKeep` only when `ImgurlFlags.MediaKeep` (and mediaOrigin is declared) | 1b | 1c |
| **The shell values** | `setFileThumb(id, v)` and `viewerImage(token, v)` accept, AS WELL AS today's data: values, `v` matching the URL grammar above — only with `bridge.cap('mediaOrigin')`; every sink that re-checks a thumb value uses ONE predicate; the URL only ever becomes an `<img>` `src` property | 1c | — |
| **Hook lines (1a inserts them verbatim; 1d writes the static methods they call)** | **H1** Android, in `SpixiWebViewClient`: `public override bool OnRenderProcessGone(AWebView? view, RenderProcessGoneDetail? detail) => RendererGoneAndroid.handle(view, detail, _renderer?.Element) \|\| base.OnRenderProcessGone(view, detail);` (`using Android.Webkit;` is there) · **H2** Windows, `WindowsWebViewHandler`: `protected override WebView2 CreatePlatformView() { WebViewStoreFolder.ensure(); return base.CreatePlatformView(); }` (BEFORE anything else creates the control) · **H3** Windows, inside `AttachWebResourceRequested(core)` after `dropMiniAppPrivileges(core);`: `WebViewLife.attach(core, VirtualView as global::Microsoft.Maui.Controls.WebView);` · **H4** iOS / Mac, in `SecureNavigationDelegate`: the content-process-terminated callback of `WKNavigationDelegate` (`webViewWebContentProcessDidTerminate:`) → `RendererGoneApple.handle(webView, _owner?.VirtualView as global::Microsoft.Maui.Controls.WebView);` — 1a picks the exact override / `[Export]` form that `MauiWebViewNavigationDelegate` allows and tells 1d. Signatures: `static bool RendererGoneAndroid.handle(Android.Webkit.WebView? view, Android.Webkit.RenderProcessGoneDetail? detail, Microsoft.Maui.Controls.WebView? element)` (true = handled, the app lives) · `static void WebViewStoreFolder.ensure()` (once per process, never throws) · `static void WebViewLife.attach(CoreWebView2 core, Microsoft.Maui.Controls.WebView? element)` · `static void RendererGoneApple.handle(WebKit.WKWebView webView, Microsoft.Maui.Controls.WebView? element)` | 1a (lines), 1d (methods) | — |
| Switches | `ImgurlFlags.MediaOrigin` (1a handlers serve only when ON; 1b grants only when ON) · `MediaKeep` (1b cap) · `TrimHook` · `RendererGone` (inside 1d's methods: OFF = the base behaviour, e.g. Android `handle` returns false) · `WinStoreFolder` (inside `ensure`) | lead | all |
| Pin module shape | `export default async function ({ ok, root, load, stripCode, stripCssComments, readFileSync, readdirSync, existsSync, join, JSDOM, VirtualConsole, sleep })` — every check is one `ok(cond, label)`; a source-text pin states its limits in its own header (#1735) | each builder | the lead's ONE registration line |
| `csh.csproj` lines | the builder returns the exact lines it added (Compile Include + test registration) | each builder | lead |

A change to this table goes through the lead; both sides get the new text.

## 4 · What each agent returns
- The list of files it CHANGED (the lead copies back only these) and their diff against `/home/claude/trees/base`.
- Per pin: the command, the green output line, the break it made (one-token mutation in a full copy, #802), the red
  line with the failing key. CSH: `CSH pass=<n> fail=0` in its copy and the count it added.
- The code lines it added (app C# / `src/**`) and every comment line it added (R2); the lines it grew in a file over
  1,500 lines, each named.
- What it could not prove: ⚠ C# UNCOMPILED (Android, iOS, Mac: not compiled anywhere before Damir's build; Windows: CI
  compiles it), unrun, not rendered.
- Its gate-section text and packet; the walk rows it needs (what Damir does, what the log or screen shows: pass when).
- Anything it saw outside its scope: a note, not a fix.

## 5 · Integration order and checks (the lead)
1. Copy back per agent, changed files only → the FULL pipeline (`extract-strings` → `build-locales` →
   `build-strings-iife` → `build-demo-bundle` → `build-shells`; bundle BEFORE shells) → the `--check` gates →
   `cs-syntax-check` → CSH.
2. The ONE pin registration in `scripts/smoke-test.mjs`; grep the smoke for the tokens of every edited line (L84);
   re-base each hashed pin the batch breaks (name each).
3. `pin-sweep --working`, the full smoke (one at a time, nothing beside it, L153) → the #46 loop until CLEAN (Claude
   Fable 5.2 for the security-only pass every round and for the handler files; Claude Opus for every other reader) →
   between rounds the pins the fix touches; the full smoke ONCE after the last fix (#1503) → the export docs → commit,
   ONE push of `work/imgurl`, read each commit back, the compare link for Damir's pull request (#1546).

## 6 · R4 — what stage 2 deletes (when the BE engineer and the walks accept each switch)
| Switch | Stage 2 deletes |
|---|---|
| `MediaOrigin` | the switch; the old thumbnail path `chatThumbFor` / `chatThumbOld` / `chatThumbOf` / `chatThumbCache` and `ViewerImage.dataUriOf(Async)` — the URL path's own bytes form (`chatThumbJpeg`, `ViewerImage.jpegOfAsync`) plus `MediaPushRules.valueOf` (a refused grant = the data: URI of the same bytes) then serves every WebView, so the hand twin of #46 r1 P-m4 ends; the off-case rows of pins a / b / c |
| `MediaKeep` | the switch and the keeper's off branch (the keeper stays) |
| `TrimHook` | the switch; the off case of `TrimRules` |
| `RendererGone` | the switch line of each platform method and the iOS selector answer tied to it; the fail-closed `return false` / no-action answers for the lock, the bound, the foreground and a stale view STAY |
| `WinStoreFolder` | the switch and the old-path branch of `WebViewStoreFolder.ensure` (the old store beside `Spixi.exe` is never read again) |

## 7 · Escalation log
| Item | Attempt | Model | Result | Next |
|---|---|---|---|---|
