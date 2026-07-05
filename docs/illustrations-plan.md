# Spixi illustration & animated-SVG plan

Status: **APPROVED by Damir 2026-07-05** (style system, P1 cut = assets 1–5/7/8/13,
banner regeneration yes; backup asset 6 follows the unified-backup UX, DECISIONS #131)
· DECISIONS #130
Scope: every illustration/animation surface in the redesigned app — empty states, onboarding
(intro, create account, restore), and experience-enriching moments. Output of this doc:
(a) a locked style system, (b) a master prompt, (c) per-asset prompts ready to feed nano-banana.

Existing anchor asset: `src/demo/images/discover-apps.svg` (Explore banner). New art must sit
next to it without clashing; if its style diverges from §2, regenerate it with the same prompts.

---

## 1. Pipeline (how these get made and shipped)

1. Damir feeds the §5 prompts to nano-banana → flat vector-style stills.
2. Vectorize/clean (SVG, transparent background, layered groups named per the prompt's
   "layers" note) → `src/assets/illustrations/` → run through SVGO.
3. **Animation is OURS, in code** — we don't ask the generator for motion. Prompts request
   *layered, separable parts*; FE animates them with CSS (transform/opacity only, token
   durations/easings, `prefers-reduced-motion` → static first frame). This keeps every
   animation theme-aware, tweakable, and consistent with the motion language (#39/#29).
4. Naming: `illo-{surface}-{name}.svg` (e.g. `illo-onboarding-welcome.svg`).

## 2. Style system — the Spixi illustration language

- **Geometry**: flat 2-D vector, rounded geometric shapes (radius language of the UI —
  soft rounded-square motifs like c-app-icon), generous negative space, minimal detail.
  No gradients-as-shading except ONE soft two-stop gradient per piece (mirrors the
  deterministic avatar/app-icon gradients).
- **No people's faces.** Abstract figures/hands/devices only — avoids uncanny renders,
  keeps localization/identity neutral (the app's identity imagery is the avatar system).
- **Line work**: consistent stroke, rounded caps/joins, matching Tabler-glyph weight
  (~1.75–2 units at 24px scale) so illustrations read as grown-up icons.
- **Palette (primitives, verbatim hexes for prompts)**:
  - Core brand indigo `#3050bd` (brand-600) — primary shapes
  - Periwinkle accents `#515ee6` (blue-500), `#769dff` (brand-400)
  - Soft washes `#b7c9f4` (brand-200), `#cbcffe` (blue-200), `#e3e4fe` (blue-100)
  - Ink `#131415` (grey-950) · paper `#f9fafb` (grey-10)
  - Success moments only: `#2db38b` (green-500) · warnings only: `#e2a233` (orange-500)
- **Theme strategy**: illustrations are **theme-stable** (like the Explore banner, #124) —
  mid-value colors that read on both `grey-10` and `grey-900` surfaces; never pure white
  fills, never near-black fills. Where a piece can't be theme-stable, ship `-dark` twin.
- **Backgrounds**: always transparent. Scene grounding = a soft blue-100/200 blob or
  rounded rectangle, not a full canvas.
- **Don'ts**: no 3-D, no isometric, no skeuomorphism, no drop shadows, no text baked into
  the art (copy lives in lang files), no brand logos other than Spixi's mark when specified.

## 3. Master prompt (prefix every asset prompt with this, verbatim)

> Flat 2-D vector illustration in a minimal geometric style, clean SVG look, rounded
> corners and rounded line caps, consistent medium stroke weight, generous negative space.
> Color palette strictly: deep indigo #3050bd, periwinkle #515ee6, light periwinkle
> #769dff, soft washes #b7c9f4 #cbcffe #e3e4fe, ink #131415. Single soft two-stop
> gradient allowed (indigo → periwinkle). Transparent background, no drop shadows, no 3-D,
> no isometric perspective, no text, no letters, no human faces. Composition floats on a
> soft rounded light-periwinkle blob. Style consistent with a modern privacy-first
> messenger app. Centered subject, balanced margins, works at small sizes.

Per-asset prompts below add subject + accent rules. For success/warning accents append:
"Accent color allowed: #2db38b" (or #e2a233).

## 4. Asset inventory

| # | Surface | Asset | Type | Prio | Animated part (CSS, ours) |
|---|---|---|---|---|---|
| 1 | Onboarding intro 1 | Welcome / the Spixi world | still | P1 | parallax drift on layers (optional) |
| 2 | Onboarding intro 2 | P2P privacy story (device-to-device, no server) | animated | P1 | message dot travels the direct link; server shape stays crossed-quiet |
| 3 | Onboarding intro 3 | Wallet + mini apps in one place | still | P1 | — |
| 4 | Create account | Identity being forged (key + avatar gradient) | animated | P1 | key rotates in, gradient blob blooms, gentle loop |
| 5 | Restore account | Recovery (file/seed → identity returns) | still | P1 | checkmark pop on success (reuse #29 morph language) |
| 6 | Backup nudge | Shield + seed safely tucked | still | P2 | — |
| 7 | Chats empty | "No conversations yet" — two devices, dotted link inviting | still | P1 | — |
| 8 | Apps empty | "No mini apps yet" — empty rounded-square tiles, one glowing | still | P1 | — |
| 9 | Wallet activity empty | Coin + calm ledger lines | still | P2 | — |
| 10 | Contacts empty | Address card + handshake glyph motif | still | P2 | — |
| 11 | Search no-results (shared) | Magnifier over soft shapes | still | P2 | — |
| 12 | Desktop empty pane | "Pick a conversation" — bubble outlines | still | P2 | — |
| 13 | Install success | Animated check medallion (nano-banana item, #123) | animated | P1 | draw-on check + ring bloom (replaces plain setSuccess on THIS surface) |
| 14 | Handshake establishing | PQC key-exchange moment (ties #116 copy) | animated | P2 | two key shapes orbit → clasp; pairs with the row pulse |
| 15 | Install failed / error (shared) | Soft broken-link shape, no drama | still | P3 | — |
| 16 | Discover coming-soon | Directory storefront teaser (replaces lone rocket) | still | P3 | — |
| 17 | Explore banner (existing) | `discover-apps.svg` restyle IF it diverges from §2 | still | P3 | — |

Empty states 7–12 share one composition grammar (subject + blob + 3 floating accents) so
the set reads as a family. All render ≤ 200px tall in-app; test at 96px.

## 5. Per-asset prompts (master prefix + these)

**1 · Welcome**: "Subject: a friendly abstract messenger scene — a large rounded chat
bubble containing the two-dot Spixi-like spark, orbited by a small wallet coin and a
rounded-square mini-app tile. Mood: open, calm, inviting. Layers: bubble, coin, tile,
blob." — 3:2 canvas.

**2 · P2P privacy**: "Subject: two devices facing each other connected by ONE direct
glowing line with a small message dot on it; above them a faded, crossed-out server/cloud
shape clearly not in the path. Mood: directness, privacy. Layers: left device, right
device, link line, message dot, faded server." — 3:2. (We animate the dot along the line.)

**3 · Wallet + apps**: "Subject: a balanced trio — chat bubble, coin with subtle IXI-like
mark (abstract, no letters), rounded-square app tile — arranged in a gentle arc over the
blob. Mood: one home for everything." — 3:2.

**4 · Create account**: "Subject: an abstract identity being formed — a rounded key shape
merging into a circular avatar with a two-stop indigo-to-periwinkle gradient, small
sparkles. Mood: something unique being minted. Layers: key, avatar circle, sparkles,
blob." — square. (We bloom the gradient + rotate the key in code.)

**5 · Restore**: "Subject: a document/seed card sliding toward an outlined avatar circle
that is filling back in with the gradient. Mood: safe return, continuity. Layers: card,
avatar, motion arcs." — square. Success accent allowed: #2db38b.

**6 · Backup**: "Subject: a shield with rounded corners embracing ONE document card that
visibly bundles three small motifs — avatar circle, coin, contact card — everything in
one safe file. Mood: quiet security, not fear." — square. (Reflects the unified backup:
account file = identity + wallet + contacts, DECISIONS #131.)

**7 · Chats empty**: "Subject: two rounded chat bubbles, one solid indigo one outlined,
leaning toward each other with a dotted line between — a conversation waiting to start.
Mood: invitation." — square.

**8 · Apps empty**: "Subject: a loose 2×2 grid of empty outlined rounded-square tiles,
one tile filled with the indigo-periwinkle gradient and a subtle spark. Mood: potential,
first app goes here." — square.

**9 · Wallet empty**: "Subject: a single calm coin above three soft horizontal ledger
lines fading out. Mood: clean slate, not poverty." — square.

**10 · Contacts empty**: "Subject: an outlined contact card with avatar circle placeholder
and a small heart-handshake motif beside it. Mood: first connection ahead." — square.

**11 · No results**: "Subject: a rounded magnifying glass hovering over soft abstract
shapes, one shape peeking outside the lens. Mood: keep looking, light humor." — square.

**12 · Desktop pane**: "Subject: a large outlined chat bubble with three quiet dots,
smaller bubbles behind. Mood: ready when you are." — 3:2.

**13 · Install success**: "Subject: a bold circular medallion, indigo-to-periwinkle
gradient, containing a thick rounded checkmark; two thin celebratory rings and four tiny
sparks around it. Layers: medallion, check, rings, sparks (SEPARATE shapes)." — square.
Success accent #2db38b allowed on sparks. (We draw the check + bloom rings in CSS.)

**14 · Handshake**: "Subject: two abstract rounded key shapes from opposite sides,
teeth interlocking in the middle over a soft glow; subtle quantum-ish orbit ring around
the clasp. Layers: left key, right key, glow, ring. Mood: secure agreement." — 3:2.

**15 · Error**: "Subject: a soft rounded link/chain shape gently separated in the middle,
small neutral sparks — calm, fixable, no red panic. Warning accent #e2a233 allowed." — square.

**16 · Discover teaser**: "Subject: an awning-topped abstract storefront made of rounded
tiles, one tile lifting away like it's being taken. Mood: marketplace opening soon." — 3:2.

**17 · Explore banner (regeneration — Damir approved)**: "Subject: a cheerful cluster of
rounded-square mini-app tiles fanning out of a larger rounded container, one tile mid-air
with a small spark trail; composition reads left-to-right so it sits at the trailing edge
of a banner. IMPORTANT: must read against a solid deep-indigo #3050bd banner — use the
light washes #b7c9f4 #cbcffe #e3e4fe and paper #f9fafb for the tiles, periwinkle #769dff
accents; no dark inks." — wide 2:1, right-weighted. Replaces `discover-apps.svg`
(clipped at 132px height in the banner — keep the visual center in the upper 2/3).

## 6. Delivery + integration specs

- SVG, `viewBox` square `0 0 240 240` or 3:2 `0 0 360 240`; transparent background.
- Solid fills on named groups; FE maps key fills to CSS vars where a piece must theme
  (e.g. `fill="var(--illo-accent, #515ee6)"`) — decided per-asset at integration.
- Every animated asset ships working as a STILL first (animation is progressive polish).
- Motion rules: transform/opacity only · token durations/easings · loop ≤ 3 iterations or
  gentle infinite ≤ 0.5Hz · full `prefers-reduced-motion` stop (#39 precedent).
- Component home: empty-state art lands via the existing empty-state elements
  (`c-apps-empty`, chats empty, etc.) — an `<img>`/inline-SVG slot above the copy, no new
  component; onboarding screens land with the account shell (not yet started, #95).

## 7. Open items for Damir

1. Approve/adjust the style system (§2) — especially "no faces" and theme-stable-first.
2. Priority cut: P1 set = 1–5, 7, 8, 13 (eight assets) — enough for onboarding + the two
   built shells. OK?
3. Explore-banner restyle (17): keep current art or regenerate for consistency?
4. Where should the backup nudge (6) live — onboarding tail or account shell? (affects v1)
