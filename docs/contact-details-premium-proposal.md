# Contact details / Chat info — the premium pass (proposal, Session X, 2026-09-17)

Damir: *"it's now too colorful, and doesn't look premium. scan for best practices and cool
looking screens and propose a change."* Nothing here is built. The mock below is CSS + a DOM
reorder injected over the REAL built shell in Chromium (432×900 @2.5, Android UA, the C# wire).

| before | mock |
|---|---|
| `docs/sheets/session-x/details-before.png` | `docs/sheets/session-x/details-mock.png` |

## 1 · What the screen does today, and where it came from

| element | today | its origin |
|---|---|---|
| row glyphs | a GRADIENT DISC per row, five hues on one screen (grey · red · violet · orange · cyan) + the accent | `c-disc` (#147, `--disc-grad-1..12`, base.css) — #618: *"one row grammar on this screen"* = the Account hub's |
| sections | one FLOATING CARD per row, radius 16, `--elevation-1`, 16 px gaps | #148: card sections, *"consistent treatment"* |
| destructive | **first** two rows; the remove disc is a red gradient fill | #618 — they took the address row's card so they would not look foreign |
| quick actions | one tonal circle (Call) under the name | Damir 2026-08-12 "premium" pass (wallet-banner grammar, chat-info.js `infoQuickAction`) |
| section titles | bold label INSIDE the card | #148 |

So the look is the sum of three earlier consistency rulings, not one bad decision. The
fix is a **grammar change on two screens**, or one screen with a written exception (§4).

## 2 · What the best-regarded screens do (2025–26; [src] = read from the app's source)

| pattern | Telegram | Signal | WhatsApp / iOS Contacts |
|---|---|---|---|
| hero | avatar 100 pt centred, title 28 medium, sub 17 [src] | avatar 80 dp centred, headlineMedium [src] | smaller rounded avatar, name + phone under |
| quick actions | 4–5 equal tiles, 40 pt icon + 11 pt label, tinted icon, tile = list block colour [src] | 5 icon-over-label buttons, 32 dp apart [src] | 3–4 tiles (chat · audio · video · search) |
| rows | grouped blocks; **monochrome tinted glyphs**, no discs [src] | flat rows + default dividers; `SignalIcons` on the secondary text colour [src] | inset-grouped cards |
| destructive | `itemDestructiveColor` **text**, bottom block [src] | Block · Report spam **last**, after a divider [src] | red text row at the end |
| dark | tone lifts; no borders | tone lifts | grouped-background set, `separator` not borders |

Rules that fall out of it: **one accent + greyscale** · row glyphs monochrome (coloured
squircles are the iOS *Settings* idiom, not a messenger's) · red = destructive only, one
group, at the bottom · hairlines or spacing, never outlined cards in dark · a colored hero
is the user's choice, never the default. (Full brief with links: the Session X handoff §research.)

## 3 · The proposal — token-level

| # | change | today → proposed | tokens / rules touched |
|---|---|---|---|
| P1 | **row glyphs monochrome** | `c-disc` gradient 32 px → bare 22 px glyph on `--icon-neutral-02`, no disc | `chat-info.js infoDisc()` → `icon()`; the `c-disc` grammar stays for the hub until §4 decides |
| P2 | **inset-grouped sections** | one card per row → one card per GROUP, rows inside with `--outline-neutral-01` hairlines inset to the label edge | `.c-chat-info__body > …` card rule → a `__group` wrapper; radius 16 → **12** (one radius on the screen) |
| P3 | **no elevation on cards** | `--elevation-1` on every card → none (light: `--surface-card` on the screen carries the lift; dark: tone lift only, #4 rule) | the two `box-shadow: var(--elevation-1)` lines |
| P4 | **destructive group placement BY KIND** (Damir 2026-09-17) | **1:1**: rows 1–2 → the FINAL group. **Group / bot**: the group (Leave group · Delete history) stays **ABOVE the member list** — today's placement (`chat-info.js:1055-1061`, after hero/money, before the roster), because the roster is unbounded (#726 batches) and a Leave at the bottom would sit under hundreds of rows. Remove contact / Leave group = `--text-error` label + `--icon-error` glyph, **no fill**; Delete history stays neutral | the 1:1 branch moves to `body.append(danger)`; the group/bot branch keeps `insertAdjacentElement('afterend')`; `[data-tone="error"]` colour rule |
| P5 | **section titles outside the card** | bold inside → `label-sm` **uppercase, `--text-neutral-02`, medium**, above the card (iOS grouped) | `.c-chat-info__label` + the wrapper |
| P6 | **quick-action row = equal ROUNDED-RECTANGLE tiles, max FOUR** (Damir 2026-09-17: five is too many; "rounded rectangle neutral") | today: 48 px tonal CIRCLES + label under, and Message* · Call · Pay · **Request** (3 from the chat header, 4 from the directory) → **Request leaves the row** (it already lives in the composer ⊕ attach sheet: File · Pay · Request) and **Mute joins**: chat header = Call · Pay · Mute (3), directory = Message · Call · Pay · Mute (4), groups/bots = Mute + what the room allows — never five. Tile = `--surface-card`, **radius 12** (the same surface + radius as the grouped cards below — one system), glyph 22 on `--icon-action-default` (the one accent), 12 px label INSIDE the tile, equal widths, ~64 tall, 8 gaps; hover/pressed = the `--surface-sheet-card-*` pair (#870). The wallet hero keeps its on-hero circles (different surface, different job) | `infoQuickAction` → tile; `.c-chat-info__qa-circle` → `__qa-tile`; the Request append (`chat-info.js:414`) goes; Mute tile bound to `onNotifications` (the switch row leaves the list) |
| P7 | **hero sub-line** | nothing under the name → the truncated address (`#211` canon) as the secondary line, tap = the address sheet (#591) | moves the address row INTO the hero; the QR stays in the sheet |
| P8 | **rhythm** | 16 px between cards → 12; row 48 (`--row-h-nav`), switch row 56, two-line row 64 | `--spacing-12` on the body gap |
| P9 | **group avatars keep their gradient** | unchanged | identity hues are data (#34), not decoration — the only colour left besides the accent |

Contrast checks owed at build (the #769 lesson): `--text-error` on `--surface-card` both
themes (a role, not a fill) · `--icon-neutral-02` glyphs ≥ 3:1 on the card in dark.

## 4 · The forks Damir decides

| fork | A | B |
|---|---|---|
| **scope of P1–P5** | this screen **and the Account hub** (keeps #618's "one row grammar" true — two screens, one batch) | this screen only, with #618 amended to "the hub keeps its discs" |
| **P6 Mute tile vs toggle row** | Mute as a tile (Telegram) — the row goes | keep the toggle row, tiles = Message/Call/Pay |
| **P7 address in the hero** | yes (Telegram/Signal put the handle under the name) | keep the address row in group 1 |
| **desktop pane** | the same CSS (the pane is the same component, #247) | — |

**PICKED (Damir, 2026-09-17): scope = B (contact details ONLY — #618 amended, the Account hub keeps its discs) · Mute = A (a tile; the toggle row goes) · address = A (under the name).** Settled, not a fork: **group/bot destructive rows stay above the members list** (#873).

Recommendation was A · A · A. It is the smaller diff in the long run (one grammar), and the
hub's coloured discs were the same iOS-Settings idiom.

## 5 · What does NOT move

★ #221: ContactDetails keeps its own WebView on the chat-header arm and on desktop (#247);
this is a CSS/JS pass inside `chat-info.js` + `chat-info.css`, no verb, no push, no storage
key, no fetch — no security-gate row. #864 (contact details in the shell) is untouched by
it and still gated on the S1 number.

## 6 · Build shape (after the picks)

One session, FE only: `chat-info.js` (P1/P2/P4/P5/P6/P7) · `chat-info.css` (P2/P3/P5/P8)
· hub only if fork 1 = A (`settings-shell.js/.css`) · render both themes on the built
`contact_details.html` through the wire (the harness in `docs/handoff-2026-09-17.md` §3)
before any pin · pins as PROPERTIES (glyph rule reads no gradient; danger group is the last
child; error label is a role) · the #46 loop.
