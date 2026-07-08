# Handoff → avatar + app-icon path resolution (next batch)

Track C (scan + lock shells, DECISIONS #203) is committed. This is the next
recommended item: the highest-visibility "looks unfinished" polish — real
avatar photos and app icons currently fall back to gradients almost everywhere.

## Read order
`CLAUDE.md` status tail → DECISIONS #203 → this file → `docs/be-cutover-brief.md`
(cross-cutting "Avatars in self-contained shells"). Working constraints unchanged
(frozen bridge; zero-C# first; per-surface #46 loop; build→smoke→F5).

## The problem (grounded)
C# pushes avatars/icons as **filesystem paths**, not image data:
- avatars: `getAvatarPath(address)` / `getOwnAvatarPath()` → `loadAvatar`/`setAvatar`/`addContact`/`addChat`/`addFile`/`addPaymentRequest`/`addAppRequest` (e.g. `HomePage.xaml.cs:669/860/1030`, `SingleChatPage.xaml.cs:458/1257`, `ContactDetails.xaml.cs:189`).
- app icons: `icon.png` under the app storage dir (`MiniAppManager.cs:374`); the apps tab currently **drops** the icon arg entirely → gradient tile (#184).

The shells load from the Raw assets origin (`SpixiContentPage.cs:179`, `BaseUrl = getAssetsBaseUrl()+"html/"`). A raw filesystem path as `<img src>` is generally cross-origin/blocked → `avatar.js` fires `onerror` → deterministic gradient placeholder. So the fallback is *working as designed*; the real photo just rarely loads.

**Important nuance to resolve first:** #190 recorded that on **WinUI F5**, counterpart avatar paths *did* resolve. So WebView2 may already load these paths while Android/iOS won't. **Confirm actual per-platform behavior before building anything** — the fix scope depends on it.

## What's already FE-ready
`avatar.js createAvatar({ src })` accepts **any** `src` — a path, a `data:` URI, or a virtual-host URL — and gracefully degrades on error. So no avatar-component change is needed to consume a better source; the FE is waiting on a *resolvable* source.

## The decision (mostly C#/native → likely folds into the BE cutover)
- **Option A — C# data-URI push (recommended, cleanest, FE-ready):** C# reads the image bytes, base64-encodes, pushes `data:image/png;base64,…` instead of a path. Robust on every platform, no origin issues. Cost: a change at each avatar/icon push site + payload size (avatars are small; consider a cache/dedupe). FE consumes it as-is.
- **Option B — WebView virtual-host / asset-loader:** map a scheme (WebView2 `SetVirtualHostNameToFolderMapping`, Android `WebViewAssetLoader`) to the avatar/app storage dir; C# pushes URLs under that host. More native plumbing, per platform.
- Either way this is a native concern → **land it in the one BE cutover**, with a new brief row (e.g. `X1 avatars/app-icons: data-URI push`).

## Concrete FE work that IS zero-C# (do these regardless)
1. **App-icon tile wiring** — the apps tab (`src/shells/home.html` tab3, #184) and `addAppRequest` app cards drop the pushed icon; thread the icon arg into the tile/`createAvatar` `src` so a resolvable icon shows once the source lands. (Component: `apps-item.js` / `apps-list.js` / typed-bubbles app card.)
2. **Verify `src` threading** across every avatar-bearing surface (chat bubbles, chats list, contact details, member sheet, wallet tx rows) — confirm each passes the C# avatar arg into `createAvatar({ src })` and none silently drop it.
3. **Test harness for data-URIs** — feed a known `data:` URI through a demo to prove the whole chain renders a real image (validates Option A end-to-end before BE writes C#).

## First action
Investigate the real resolution behavior (WinUI vs Android — #190 says WinUI resolves), then recommend A vs B to Damir. In parallel, land FE tasks 1–2 (zero-C#, safe now). Log the chosen C# approach as a be-cutover row.

## Build / verify (unchanged)
Components changed → `node scripts/build-demo-bundle.mjs` first, then
`node scripts/build-shells.mjs` → `node scripts/smoke-test.mjs` → F5.
Sandbox: validate edits with the file tools; the smoke suite's contacts block
has a slow real-timer tail (run it detached, it force-exits(0) at the end).
