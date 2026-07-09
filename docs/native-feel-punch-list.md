# Native-feel / Crispness punch list

> **Purpose / reminder:** the punch list for making Spixi's redesigned WebView UI read as crisp and native
> as a native desktop app (the Telegram-desktop comparison, Damir 2026-07-09). Two buckets: (A) the NATIVE
> flicker fixes (small C#, grounded file:line) and (B) frontend crispness dials. If Damir mentions "native
> feel", "crispness", "flicker", or "feels un-native" in any session → this is the doc.
> Prepared 2026-07-09 (Opus). Pairs with be-cutover-brief.md (N1/N3), SECURITY.md §1, DECISIONS #220/#221.

## A. Flicker — the NATIVE causes (safe C#; none touch the risky parts)

The frontend already killed the WebView-internal flicker (theme flip via a head-top `data-theme` script; blank gap via an instant themed background + boot spinner, #190/#191). What remains is native. **Decided approach (Damir 2026-07-09): "load then move" — keep the user on the CURRENT screen until the incoming screen's WebView has loaded (signals `ixian:onload`), then present it.** Theme-agnostic — no blank / half-booted / wrong-theme frame is ever shown. A theme-matched background is the cheaper complement for screens where full preload is too costly.

### Affected screens (all pushed pages → same native cause)
| Screen | Opened at | Symptom |
|---|---|---|
| **Conversation** | `HomePage.xaml.cs:839` (`PushAsync(new SingleChatPage)`) · `ContactDetails.xaml.cs:90` | **In LIGHT mode: a DARK flash** before the conversation paints (the chat shell boots dark before the light theme applies — see root cause) |
| **Chat info (1:1)** | `HomePage.xaml.cs:288/491` · `SingleChatPage.xaml.cs:369` (`ContactDetails`) | **Massive flicker** (Damir), same class as Add Contact |
| **Add Contact** | `HomePage.xaml.cs:221` (`ContactNewPage`) | Massive flicker |
| **App details** | `HomePage.xaml.cs:1799/1793` · `AppsPage:91` · `SingleChatPage:944` (`AppDetailsPage`) | Flicker |
| **Account** | `HomePage.xaml.cs:726` (`SettingsPage`) | Frame flash + a SLIDE-IN — this push omits `Config.defaultXamarinAnimations` (=`false`, `Config.cs:56`) so it animates; the others already pass it |

### Root-cause notes
- **Native blank frame:** `Spixi/Utils/SpixiContentPage.cs` (the base class every screen inherits) sets NO `BackgroundColor` on the page or its WebView → the native surface shows before the WebView paints.
- **Light-mode DARK flash on chat open:** the chat shell resolves its boot theme from localStorage before paint (`src/shells/chat.html:301`; instant-bg `html[data-theme="dark"]{background:#13171b}` at :21). On a freshly-pushed conversation WebView the correct (light) theme isn't applied in time, so it boots DARK then flips to light. → **Any background fix MUST be theme-aware** — a hardcoded dark bg would BREAK light mode (this exact symptom). Best: C# injects the current theme (SPIXI_ENV / data-attr) so the boot bg is right before paint, OR "load then present" avoids showing the boot at all.

### Fixes (priority order)
1. **Load-then-present (PRIMARY — Damir's pick, ~½ day).** On tap, preload the incoming page's WebView offscreen, keep the user on the current screen until it signals `ixian:onload`, then present the already-painted page. Theme-agnostic; no flash anywhere. Apply first to the worst offenders (conversation, chat-info, app-details, add-contact).
2. **Theme-matched background (complement, cheap).** Set `SpixiContentPage` (+ its WebView) `BackgroundColor` to the CURRENT-theme surface (light surface in light mode, `#13171b` in dark) from `SpixiThemeMode`/appearance. Base-class → covers every pushed page; reduces flash where preload isn't applied. NEVER hardcode dark.
3. **Account slide (one line).** Pass `Config.defaultXamarinAnimations` to the `SettingsPage` push (`HomePage.xaml.cs:726`).

All safe C# (background colour + navigation timing + an animation flag) — none touch the risky parts; still run the #46 audit + an Opus review. **Test EVERY screen in BOTH light and dark** (the light-mode dark-flash is why).

## B. Crispness — frontend dials (ranked by leverage)

> Caveat: the reference screenshot is Spixi **light** vs Telegram **dark**; dark UIs read sleeker. Judge
> like-for-like: **Spixi dark vs Telegram dark**.

**B1 — Native font rendering (the biggest lever) → DECISION: `system-ui` everywhere.** Telegram desktop draws in native SF Pro; Spixi uses Sora + Source Sans 3 as web fonts in a WebView (`src/styles/tokens.css:123-124`; faces `src/styles/base.css:26-44`), which render softer — the un-native tell.
- **Decision (Damir 2026-07-09): use `system-ui` across ALL surfaces** — chat list, nav, settings, wallet, apps AND the conversation — the **WhatsApp / Viber model** (they draw the device's system font everywhere). Token: `--font-ui: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;`.
- **What `system-ui` resolves to:** the OS's DEFAULT UI font — **SF Pro on iOS/macOS**; on Android the device default, which is the **OEM font** natively (the Motorola font on a Moto Edge 30, One UI font on Samsung, Roboto on Pixel/stock). **Caveat — through an Android WebView, `system-ui` commonly falls back to Roboto** rather than the exact OEM face (the WebView bundles its own font config); still the standard Android UI look, just maybe not pixel-identical to the OEM font the native apps show.
- **Field note (Damir's observation):** Telegram HARDCODES Roboto in its chat LIST, so on a Moto its list shows Roboto while its CONVERSATION shows the Moto system font; WhatsApp + Viber use the system font EVERYWHERE. `system-ui` puts Spixi in the WhatsApp/Viber camp (native-consistent, follows the device) — NOT Telegram's hardcoded-Roboto-in-list quirk.
- **Keep Sora for brand DISPLAY headings only** (wordmark, hero); all UI + conversation text = `system-ui`. Source Sans 3 retires from the UI under this decision (kept only if a distinct reading face is ever wanted later — currently not).
- Because the conversation is its own isolated WebView (§1), set the token in BOTH stylesheets (home/settings shells + chat shell) — same value, no shared cascade.
- Verify `-webkit-font-smoothing: antialiased` / `text-rendering` aren't softening text; check WebView pixel scale (B2).

**B2 — WebView pixel scaling.** A blurry WebView is often a `devicePixelRatio` / scale mismatch. Confirm the
WebView renders at the display's integer scale on WinUI + macCatalyst (a fractional scale softens everything).

**B3 — Density / vertical rhythm.** Telegram rows are tighter and uniform; Spixi rows read taller/variable and
spend more vertical space on chrome first (a large rounded search pill + a filter-chip row) before the list.
- Tighten chat-row line-height + vertical padding toward a **consistent row height** (~Telegram's ~64px).
- Make the **search field more compact**; consider collapsing the filter-chip row on scroll (scroll-collapse search already exists, #67) to reclaim vertical space.

**B4 — Excerpt + address canon gaps.** The screenshot shows a **raw base58 excerpt** ("tempestTeraNova →
3JDNzTw5…") and **full URLs** (github.com, vyral-labs.com) as excerpts — reads unfinished. Canon work exists
(CH6 excerpt canon best-effort; address truncation #211/#212) but cases still slip through.
- Audit excerpt rendering for **raw addresses → middle-truncated / nickname**, and **URLs → domain only**.
- Never show full base58 as a name OR an excerpt (extends #212 to the excerpt line).

**B5 — Avatar uniformity.** Telegram avatars are uniform and slightly smaller; Spixi's read larger/heavier.
Normalise avatar size + circular mask across photo and gradient-initials variants; consider a touch smaller in
the list to tighten rhythm.

## C. How to verify
- **Flicker:** F5 sweep across every push + tab switch (+ desktop pane show/hide later); Add Contact and Account are the two known-worst — both resolved by A1(+A2 for Account).
- **Crispness:** side-by-side **Spixi dark vs Telegram dark** at 100% scale; check text sharpness (B1/B2), row rhythm (B3), and that no row shows a raw address/URL (B4).

## D. Routing
- A1/A2 = safe C#, small — fold into the BE-cutover PR (they're already cleared against the standing rule).
- B1–B5 = FE/design; run through the #46 audit loop like any component change (B1 is a design-system decision — decide the font stack once, apply via tokens, verify both themes).
