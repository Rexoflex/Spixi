# Flag emojis on Windows — brief for a later session (2026-09-18)

Damir's report: 🇸🇮 renders as the letters "SI" on Windows, while Slack shows the flag. Read, not built.

> **STATUS 2026-09-18 — BUILT in Session Z (DECISIONS #888), on Damir's "build it fully".** Two things in this
> brief did not survive the build: (a) a `@font-face` `url()` beside the shell is CORS-BLOCKED from a `file://`
> document (Chromium serialises the file: origin as `null`), so the asset ships as a generated classic script
> carrying a `data:` URL (`fonts/TwemojiCountryFlags.js`, from the committed woff2) — §2's "the browser fetches
> the woff2" route is wrong for our shells; (b) the font is installed ONLY when the canvas probe says a flag does
> NOT paint — not scoped to Windows by a platform flag — so a phone that paints flags never loads it. §5 step 1's
> WebView2 check is the walk row (`docs/walk-artifact-session-z.html`); the container proved the route in
> Chromium from `file://`, not in WebView2. The rest of the brief is the record of why.
Everything below was discussed in Session V's wrap-up; the mechanism is stated so the session that builds
it verifies rather than re-investigates (#215). Windows-only polish; sits AFTER the spare decision in the
order of `next-session-prompt.md`.

## 1 · Why it happens (not a Spixi bug)

Segoe UI Emoji — the Windows system emoji font — deliberately ships **no flag glyphs** (Microsoft's stance
on disputed territories). A flag is two *regional-indicator* characters (U+1F1E6–U+1F1FF: 🇸 + 🇮), and
with no glyph for the pair the font falls back to the letter forms. Chromium, Edge and WebView2 all use the
system emoji font on Windows, so every Chromium app shows the same thing. Firefox shows flags only because
it bundles its own Twemoji font. Android, iOS and macOS ship flags natively — this is never seen on the
phone, which is why it surfaced late.

Slack and Discord solve it by **not using the system font at all**: they replace every emoji with an image
from their own set at render time (Slack: its own sprites; Discord: Twemoji images).

## 2 · The route: a flags-only font, not images

Two routes exist. The image route is what Slack does and it is heavy for us: a new HTML sink in `chat.html`
(emoji text → `<img>`/`<span>` at render), a handover row under #221, and a bundle of PNG/SVG. **The font
route is the one to build**, and it is a proven trick rather than something we invent:

* TalkJS publishes a **flags-only subset of Twemoji as one woff2**: `country-flag-emoji-polyfill`,
  `TwemojiCountryFlags.woff2`, ~78 KB. It exists for exactly this case (Chrome/Edge on Windows).
* One `@font-face` with `unicode-range: U+1F1E6-1F1FF` (plus `U+1F3F4, U+E0060-E007F` if the sub-national
  tag-sequence flags — England, Scotland, Wales — are wanted; the subset covers them).
* The family is **prepended** to the emoji font stack, scoped to Windows.
* No JS, no image replacement, no new HTML sink; `textContent` rendering is untouched; nothing under #221
  changes. Zero C# unless the shells cannot yet tell they are on Windows (see §4).

### ★ Does it override other emojis on Windows? No — by mechanism, not by care.

`unicode-range` is a hard filter: the browser consults this `@font-face` **only** for code points inside the
declared range, and skips it for everything else even though the family is first in the stack. The range
is the regional-indicator block (26 letters) and, optionally, the tag-sequence block. No face, hand,
object, symbol or text lives in those blocks. So on Windows: flags come from the Twemoji subset, every
other emoji stays Segoe UI Emoji, exactly as today. The only glyphs that ALSO route through the font are the
26 regional-indicator letters standing alone (a lone 🇸), which nothing renders in practice.

That mix — Twemoji flags beside Segoe faces — is what Slack on Windows shows; since Segoe has no flags of
its own there is nothing for the flags to be inconsistent with.

### ★ Is it used only on Windows? Yes, and the "only" holds without a switch to forget.

A browser downloads a `@font-face` only when rendered text matches **both** its family and its range. On
Android/iOS/mac the family is not in the stack (the CSS variable that carries it is set only under the
Windows selector), so the file is never fetched, let alone used, and the native flags stay.

## 3 · Cost in our tree (measure before asserting — #294)

| item | what | note |
|---|---|---|
| the woff2 | one external Raw asset next to the shells (like `spixi.icons.js`) | **not inlined** — 78 KB into every shell would eat the #345 ceilings for nothing |
| `@font-face` + stack | in the shared emoji/body font tokens; family prepended via a CSS var set only under the Windows selector | `unicode-range` as above |
| NOTICES | Twemoji graphics are **CC-BY 4.0** | the notices pin (`Copyright … Paweł Kuna … html5-qrcode …`) will insist on the entry |
| a pin | the font file is reachable from `chat.html` (and `settings.html` for the picker) in BOTH homes (#861) | derive the range from the CSS, do not restate it |
| the one thing to VERIFY | that **WebView2** honours a bundled `@font-face` for regional-indicator pairs before falling back to Segoe | Chrome/Edge do — the polyfill exists because they do — and WebView2 is the same engine, but it is tested on Damir's machine in the walk, not asserted |

## 4 · The language picker — reuse, with one rule

Because flags are text glyphs, the same font covers the picker on Windows with zero extra work, and the
phone renders them natively. The UX caution is the usual one: **a flag is a country, not a language.**
English → 🇬🇧 or 🇺🇸, Spanish → 🇪🇸 or 🇲🇽, Portuguese → 🇵🇹 or 🇧🇷 are choices someone reads as a
statement; Arabic has no answer at all.

**The resolution: never pick a nation for a language — let the LOCALE pick it, and it already has.** Every
one of our locales is language-plus-region, so the flag is the region half of the code the app already
carries. `es-co` is Colombian Spanish → 🇨🇴, not Spain; `pt-br` → 🇧🇷; `en-us` → 🇺🇸. The flag is then an
honest statement ("the Spanish as spoken in Colombia" — which is what the translation is), and a second
Spanish would arrive as `es-es` with its own flag, nothing renamed.

| locale | label (own script — the PRIMARY label) | flag (derived from the region) |
|---|---|---|
| en-us | English | 🇺🇸 |
| es-co | Español | 🇨🇴 |
| pt-br | Português | 🇧🇷 |
| de-de | Deutsch | 🇩🇪 |
| fr-fr | Français | 🇫🇷 |
| it-it | Italiano | 🇮🇹 |
| sl-si | Slovenščina | 🇸🇮 |
| sr-sp | Srpski | 🇷🇸 ⚠ see below |
| lt-lt | Lietuvių | 🇱🇹 |
| ru-ru | Русский | 🇷🇺 |
| id-id | Bahasa Indonesia | 🇮🇩 |
| ja-jp | 日本語 | 🇯🇵 |
| cn-cn | 中文 | 🇨🇳 ⚠ see below |

Two rules make it hold: the **name in its own script stays the primary label** and the flag is decoration
(the name is what a user scans for and what a screen reader speaks — `aria-hidden` on the flag); and the
flag is **derived from the code, never hand-picked per language**, so it cannot be argued about later.

⚠ Two codes are not ISO and will derive to the wrong or no flag: `sr-sp` (Serbia is `RS`) and `cn-cn`
(`zh` is the language, `CN` the region → `zh-cn`). Either correct the codes — a rename with a migration of
any stored language pref, which touches C# (the language pick, N65) — or keep a two-entry override map
beside the derivation and record why. The override is the cheaper first step; the rename is the honest
one. Decide in the row.

## 5 · Order of work when it is built

1. `--check`-style verification on Damir's Windows machine FIRST: a throwaway HTML with the `@font-face`
   and 🇸🇮 in WebView2 (F5, #663). If WebView2 does not pick the bundled font, the route is images, and this
   brief's cost table is wrong — stop and re-plan.
2. The asset, the `@font-face`, the Windows-scoped variable, NOTICES, the pin in both homes.
3. The picker: flag derived from the locale region; the two overrides or the rename; `aria-hidden`.
4. Walk rows: a flag in a chat message on Windows light/dark; every picker entry on Windows AND on the
   phone (the phone must be unchanged); one non-flag emoji beside a flag to prove Segoe still draws it.
5. Row in `DECISIONS.md` with the measured size and the WebView2 result.
