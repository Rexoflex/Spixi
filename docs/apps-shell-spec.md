# Apps shell — spec (`apps.html`, shell #7)

Consolidates the current `apps` + `app_new` + `app_details` pages into one shell with internal views. Built on the redesign design system + mock bridge; invents nothing — gaps become 🟡 rows or §8 proposals. Frozen C#: new bridge commands are §8 proposals only.

**Design ref:** Figma `cQ8yMZF5R0LGM9O1q9502F` node **11475-2996** ("mini apps" — List view + Grid view).
**Discovery source:** `apps.spixi.io` — a curated mini-app **directory** (categories: All · AI · Games · IoT · Tools · Dev Tools; each app = icon, name, publisher, category, description, **App URL**). The App URL feeds the existing "Get from URL" install path.

## 0. Decisions (Damir, 2026-07-04)

- **Layout = user toggle** between a **row list** (one app per row) and a **2-up card grid** — both are in the design; the shell offers a list⇄grid switch.
- **Permissions = compact chips** (not a plain-language list).
- **Per-item interaction = ⋮ overflow menu** on every app (the design shows it).
- **Discover = PARKED**: fed from the `apps.spixi.io` directory, but the feed mechanism (JSON endpoint the FE fetches vs. a §8 bridge command) is **TBD — Damir to get feed details from the team**. Build behind a capability flag until then.
- **Build order:** installed list + add-app + details **first** (all within today's bridge); wire Discover once the feed is settled.

## 1. Scope

**IN (this shell):** app-frame (topbar + bottomnav, Apps tab) · **installed apps** view with **list⇄grid toggle** · search ("Find installed apps", client-side filter) · **"Explore Spixi Mini Apps" banner** (gateway to Discover) · per-app **⋮ menu** (Open · App details · Uninstall) · **add-app** flow (URL / QR / file) · **app details / installer** (publisher, description, capability chips, version/size, install-URL+copy, Install/Uninstall/Open + confirm/loading/success/error modals) · empty state · **Discover** view **scaffolded but parked**.

**OUT / parked:** Discover grid population (needs feed) · ratings/reviews/reporting · app auto-update checks (all would need new BE — §8 if ever).

## 2. Views

### 2.1 Installed (the Apps tab) — `view=installed`
- **Topbar:** root style, title **"Apps"** (mirrors the chats root topbar).
- **Search:** `c-search-field` "Find installed apps" — filters the installed list client-side by name (+ creator when available).
- **Explore banner:** blue promo card **"Not sure where to start? Explore Spixi Mini Apps →"** → opens Discover. While Discover is parked, the banner is present but routes to a "coming soon" state (or hidden behind the capability flag — Damir's call at wire-up).
- **List⇄grid toggle:** a small segmented/icon control in the header; remembers the choice in-memory (no browser storage; a `setAppsLayout` free-fn).
- **App item** — two renderings off one model:
  - **Row (list):** rounded-square icon 48 · name (semibold) · creator (subtle subtitle) · **⋮** trailing.
  - **Card (grid):** icon 64 top-left · **⋮** top-right · name + creator below · 2 per row.
- **⋮ menu** (`c-sheet`, reuse the chats-row-menu pattern): **Open** (→ `ixian:startApp:id` / `startAppMulti:id`) · **App details** (→ `ixian:details:id`) · **Uninstall** (confirm via `c-modal` → `ixian:uninstall`).
- **Tap** an item → App details (`ixian:details:id`).
- **Add:** header "+" (or FAB) → Add-app view (`ixian:newapp`).
- **Empty state:** "No mini apps yet" + CTA (Add / Explore).

### 2.2 Add app — `view=add`
- Topbar "Add app" (push, back).
- **App URL** input (paste an appinfo URL).
- Three methods: **Get from URL** (`ixian:fetch:url`) · **Scan QR** (`ixian:quickscan` → `setScannedData(url)`) · **Pick file** (`ixian:selectAppFile`).
- **Info banner** (`c-warning-banner`, info tone): "What is a mini app?" explainer.
- **Error:** `showUrlError()` → inline invalid-URL state on the input.

### 2.3 Details / installer — `view=details`
- **Header:** app icon · name · **publisher** · **verified** badge (cryptographically signed apps).
- **Description.**
- **Capabilities = compact chips** — map the six `MiniAppCapabilities` (SingleUser, MultiUser, Authentication, TransactionSigning, RegisteredNamesManagement, Storage) to short human labels.
- **Details:** ID · version · size · **install URL** + copy-to-clipboard (`c-toast` confirm).
- **Actions:**
  - Not installed → **Install** → confirm modal (shows capability chips + source URL) → `ixian:install` → **installing** (loading modal) → **success** / **failed** modal.
  - Installed → **Open** (`ixian:startApp` / `startAppMulti`; multi-user launches a contact picker → sends the chat app-invite) + **Uninstall** → confirm → `ixian:uninstall` → **removed** modal.
- `init(name, icon, publisher, description, version, url, size, capabilities, appId, isSingleUser, isMultiuser, isAppInstalled, isAppVerified, displayLaunch)` (C#→JS, 13 args) populates it; `showInstalling/showInstallSuccess/showInstallFailed/showAppRemoved` drive the modals. All reuse `c-modal`.

### 2.4 Discover — `view=discover` (PARKED behind a capability flag)
- Reached from the Explore banner. **Card grid** of directory apps (icon · name · creator · category) · **category chips** (All · AI · Games · IoT · Tools · Dev Tools) · search · "Load more". Tap → Details (via the app's URL → `fetch` → install path).
- **Parked** until the feed source is decided; the shell renders the frame + a "coming soon" placeholder, revealed when the feed capability flips on (same parkable pattern as the chats pin/mute flags).

## 3. Model

```
app (installed):  { id, name, icon, creator?, capabilities?, installed:true }
directoryApp:     { id, name, icon, publisher, category, description, appUrl }   // discover
state:            { apps:[], query:'', layout:'list'|'grid', discover:{...} }
```

## 4. Bridge

**Existing (reuse, no C# change):** `clearApps()`, `addApp(id,name,icon)` (C#→JS) · `ixian:details:id`, `ixian:newapp`, `ixian:back` · `ixian:fetch:url`, `ixian:quickscan`+`setScannedData(url)`, `ixian:selectAppFile`, `showUrlError()` · `ixian:install`/`uninstall`, `ixian:startApp:id`/`startAppMulti:id`, `init(…)`, `showInstalling/…Success/…Failed/…Removed`.

**§8 proposals (spec only):**
- **Extend `addApp` with `publisher`** (and optionally a flags/capabilities arg) — the design shows a **creator** subtitle on installed rows, but the data exists locally (`MiniApp.publisher`); today's 3-arg `addApp(id,name,icon)` can't carry it. Until then the shell renders the row **gracefully without a creator** (parkable).
- **Discover directory feed** — either the FE fetches a JSON directory from `apps.spixi.io` (that domain is already whitelisted in the iOS WKWebView allow-list), or a new C#→JS command supplies it. **Pending Damir + team.**

## 5. Component reuse
`c-topbar` (root + push) · `c-search-field` · `c-chip` (categories + capability chips) · `c-button` · `c-modal` (install confirm / loading / success / error / uninstall) · `c-sheet` (⋮ menu, reuse `chats-row-menu`) · `c-toast` (copy) · `c-warning-banner` (info) · `c-bottomnav`. **New:** `c-app-icon` (rounded-square app-image tile, 48/64), `c-app-item` (row + card renderings), a small **list/grid toggle** control.

## 6. Build steps (each: build → adversarial audit loop → CLEAN)
1. Installed model + render pipeline + `c-app-icon` + `c-app-item` (row & card) + **list⇄grid toggle**.
2. Search + Explore banner + empty state.
3. Per-item **⋮ menu** (Open · App details · Uninstall-confirm).
4. **Add-app** view (URL / QR / file + info banner + error).
5. **Details / installer** (header + capability chips + actions + confirm/loading/success/error/removed modals).
6. **Discover** scaffold (parked capability flag; card grid + category chips frame).
7. Full-surface adversarial round (empty states, RTL, i18n, long names, missing icon/creator, capability flags off, reduced-motion) → CLEAN → demo → Damir review.

## 7. Open 🟡
- **Discover feed source** — Damir to get from the team (JSON endpoint vs §8 command).
- **`addApp` + publisher** (§8) so installed rows can show the creator the design calls for.
- **Layout persistence** — remember list/grid choice (in-memory for the demo; a real setting later).
- **Multi-user launch** — the contact-picker + chat app-invite already exists (chat screen); details "Open" wires to it.
