# Build pipeline spec — Phase 3 item 4 (`build-shells.mjs` → `Spixi/Resources/Raw/html`)

Turns the redesigned shells into the actual HTML files the MAUI WebView loads.
Decision (DECISIONS #176, this session): **extend the proven custom scripts**
rather than introduce Vite — no new toolchain, no `node_modules` to ship,
self-contained output sidesteps all per-platform asset-path issues, and it
reuses `build-demo-bundle.mjs` (components → IIFE) + the inlining logic already
in `build-test-shells.mjs`. Graduate to Vite later if ever needed.

## 1. Output: 9 shell files (ARCHITECTURE §5)

Each shell is one self-contained `.html` (all CSS/JS/fonts/strings inlined) in
`Spixi/Resources/Raw/html`. Per §5, multiple C# page classes load the **same**
shell file and pick a view with one `setRoute('<view>')` call on load — the C#
diff stays ~one line per page class (that's item 5, BE).

| Shell file | Absorbs (legacy `loadPage` names) | C# page classes that will point here | Demo source |
|---|---|---|---|
| `launch.html` | intro, intro_new, intro_restore, intro_retry, onboarding | LaunchPage, LaunchCreatePage, LaunchRestorePage, LaunchRetryPage, OnboardPage | `src/demo/launch.html` |
| `lock.html` | lock, settings_lock, settings_encryption | LockPage, SetLockPage, EncryptionPassword | lock-shell (in `settings.html` demo) |
| `home.html` | index, empty_detail | HomePage, EmptyDetail | `src/demo/chats.html` (+ `app-frame` tab frame · `desktop` empty pane) |
| `chat.html` | chat | SingleChatPage | `src/demo/chat.html` |
| `payments.html` | wallet_send, wallet_send_2, wallet_recipient, wallet_request, wallet_sent, wallet_contact_request | WalletSendPage, WalletSend2Page, WalletRecipientPage, WalletReceivePage, WalletSentPage, WalletContactRequestPage | `src/demo/wallet.html` |
| `contacts.html` | contact_new, contact_details | ContactNewPage, ContactDetails | contacts-shell (in `chats.html` demo) |
| `apps.html` | apps, app_new, app_details | AppsPage, AppNewPage, AppDetailsPage | `src/demo/apps.html` |
| `settings.html` | settings, settings_backup, downloads, dev, contributors | SettingsPage, BackupPage, DownloadsPage, DevPage, ContributorsPage | `src/demo/settings.html` |
| `scan.html` | scan | ScanPage | scan-shell (in `chats.html` demo) |

Deleted legacy (no new shell): `address.html` (orphan, §5). Untouched:
`MiniAppPage` runtime (loads mini-apps' own HTML, not our surface).

## 2. Per-shell entry templates (`src/shells/*.html`) — NEW

The demos are *harnesses* (mock data, theme/lang toggles, several shells on one
page like `desktop`). Production shells need a clean single-shell entry. So
`build-shells.mjs` builds from small dedicated entry templates in `src/shells/`,
NOT the demo files — the demos stay the browser dev/QA vehicle.

Each entry = shell container + a boot script that (a) reads `setRoute` to pick
the internal view, (b) instantiates the one shell, (c) reads config from
`window.SPIXI_ENV`. Two staged variants of the boot data source:

- **Stage 4a — render test (mock data, ZERO C# change).** Boot from the shell's
  mock fixtures (reuse the demo's mock module). Emit to the shell filename AND,
  for a first Windows render with no BE work, also drop-in over a legacy filename
  the page already loads (e.g. `home.html`→`index.html`, `chat.html`→`chat.html`).
  This is maui-integration-test-plan Round 1, now in the *real* app.
- **Stage 4b — bridge-wired (Round 2 + item 5).** Swap mock for `src/bridge/
  native.js`; C# repoint per §5 (`loadPage` + `setRoute`). `scan` is the first
  repoint target (native-bridge-spec §6).

## 3. `build-shells.mjs` mechanics (reuse, don't reinvent)

1. Run `build-demo-bundle.mjs`'s output (`spixi.iife.js`) + `icons.iife.js` +
   `strings.iife.js` — already generated.
2. For each `src/shells/<name>.html` entry: inline every `<link rel=stylesheet>`
   → `<style>`, every `<script src>` → `<script>`, every `@font-face url()` →
   base64 `data:` (the exact transforms already in `build-test-shells.mjs`;
   factor them into a shared `scripts/lib/inline.mjs`).
3. Write self-contained `Spixi/Resources/Raw/html/<shell>.html`. Because it's
   under `Resources/Raw`, MAUI packages it automatically (no `.csproj` edit —
   `Raw/**` is already a MauiAsset; VERIFY in build).
4. A syntax/inclusion smoke gate mirroring `build-demo-bundle`'s `new Function`
   check + assert zero unresolved `../` refs remain (the current
   `build-test-shells` "unresolved refs" warning must become a hard fail).

## 4. `window.SL` injection (ties to item 3 + ARCHITECTURE §7)

Each built shell embeds a **default `en-us`** `window.SL` block inline (so the
file renders correctly standalone, and the browser render test works). At MAUI
integration, C# overrides it via its existing token-injection into inline JS
(ARCHITECTURE §7) — a `<!-- SPIXI_SL_BLOCK -->` marker comment delimits the block
so the C# side (or a post-step) can replace it per device locale. `window.
SPIXI_ENV` (Platform/theme/devMode/capabilities) is a separate marked block.

## 5. Build order (ARCHITECTURE §5 rollout: one shell at a time)

1. **`chat.html` + `home.html` first** — highest value, they're the
   maui-integration-test-plan Round 1 targets; get them rendering in the real
   app on Windows (Stage 4a, zero C# change).
2. Then `payments` · `apps` · `settings` · `contacts` · `launch` · `lock`.
3. `scan.html` — first to go **bridge-wired** (Stage 4b), per native-bridge-spec.

Each shell: build → self-contained file → open in a plain browser + phone
emulation (30s packaging sanity) → Windows/WebView2 render (real app) → checklist
(maui-integration-test-plan §7) → then its C# repoint row (item 5).

## 6. Decisions for Damir (review before I build)

- ① **First Windows render = Stage 4a drop-in (mock data, zero C#)?** Fast path:
  overwrite `index.html`/`chat.html` in `Resources/Raw/html` with the built
  shells and run the existing app — no BE. (Recommended; reversible via git.)
- ② **Entry templates in `src/shells/` (new dir)** — OK to add this dir, or
  prefer generating entries from an inline manifest inside `build-shells.mjs`?
- ③ **`home.html` composition** — chats-list is clear; confirm the tab frame
  (bottomnav from `app-frame`) + contacts/wallet/apps tabs all live inside
  `home.html`, or whether wallet/apps tabs deep-link to their own shells.
- ④ **Keep or drop the throwaway `WebViewTest` app** now that we build into the
  real `Spixi/Resources/Raw/html`?

Nothing here touches the frozen bridge or C# beyond the §5 one-liners.
