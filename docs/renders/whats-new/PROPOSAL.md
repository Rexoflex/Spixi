# What's new spotlight — plan v2 (render only, not built)

2026-10-11 · Damir 12:32: no tour on a new account (the welcome carousel already ran) · show what is new against the store app, not the welcome pitch · keep mini apps · the spotlight card (option A) · a "What's new" row in About · cleverer motion with a full-bleed animated background · real art for every slide. Status: **waiting for Damir's pick of the six slides and the art**. No `src/`, `Spixi/`, DECISIONS or doc change.

## 1 · When it shows

| Moment | Shows? | Why |
|---|---|---|
| New account | **No** | The welcome carousel (`launch-shell.js:286-403`) ran a minute earlier. #391 stays as it is: no modal after create. |
| Restore | **No** | The user came through the same welcome carousel. The sync note belongs to the #1304 wallet strip, not to a tour. #381 stays. |
| First start after an update (store 0.9.x → 1.0, then every release that has a set) | **Once** | The only moment with something new to say. |
| Account › About › **What's new** | **Any time** | The same card. "New" badge on the row until the user has opened it once in this version. |

A create or a restore writes `whatsnew.seen = Config.version`, so a fresh account never gets the tour, but it can open it from About.

## 2 · What to showcase (new against 0.9.22, from the walked release-readiness rows)

| # | Card | What is new | Evidence | Scene (art) |
|---|---|---|---|---|
| 1 | **Meet the new Spixi** (full bleed) | The redesign as a whole; the four chips around the phone preview cards 2–5 | the redesign | aurora drifts · phone rises · 4 chips fly in, then bob |
| 2 | **React, reply and edit** | 6 quick reactions, swipe-to-reply quote, edit after send | V-10, V-6, V-7 (WALKED) | outlined bubbles float up · bubble nudges (the swipe) · reply quote rises · reaction bar pops, heart drops · the line re-writes · pencil |
| 3 | **Voice messages** | Record and send; an old app gets a file | V-8, V-8b (WALK PASS) | full-bleed waveform breathes · mic pops with 3 pulse rings · voice bubble slides in, bars "play" |
| 4 | **Photos and albums** | Up to 10 photos in one album, full-screen viewer, location removed | V-14, V-14c, V-3, V-14d | a wall of photos pans · album pops tile by tile · a location pin drops and is struck out |
| 5 | **Your privacy, your switches** | Read receipts, typing, online status can be hidden | V-13 (WALKED PASS) | node grid with a slow ripple · three switches go off one by one · eye-off badge |
| 6 | **Mini apps, together** | Invite + one-tap accept inside the chat | V-11 (WALKED) | app tiles orbit · invite card · Accept pops with a tap ripple · three apps fly out |

**Claims:** card 4 "removes the location" holds for photos sent as photos (a file keeps the original, V-14d); the iPhone + Mac encoder rows (9-EXIF I + M) must pass before the copy ships. Card 2 says "works best with contacts on the new Spixi" (edit needs 0.9.20+, the capability check V-5). "Hide your online status" is a courtesy flag (V-13); the copy does not promise more.

**Bench (not in the six):** send money in two steps with the keypad (#1263) · groups up to 10 (V-4) · the album viewer's Save (#1263) · the 13-language note (V-17). Swap one in if you want.

## 3 · Motion — the "kick"

| Layer | Rule |
|---|---|
| Card 1 = **full bleed** | the animated aurora is the card's own ground; title, body, dots and button sit on it in white |
| The hand-off | while the finger drags 1 → 2, the aurora collapses with the finger from the whole card into the panel band (`clip-path`, follows the finger 1:1), and card 2 arrives with its own full-bleed scene in that band |
| **Depth (parallax)** | each scene has a background and a foreground layer; while the finger drags, the background moves at −0.42 × and the foreground at +0.16 × the card offset, so the scene has depth; the ends rubber-band |
| Entrance | each scene plays once, the first time its card shows (il-* + wn-* classes), then holds — the launch rule (#1263 "one entrance per lifetime") |
| Loops | backgrounds only, ≤ 0.5 Hz, transform / opacity; a card that is not on screen pauses its loops |
| Reduced motion | no animation, no parallax, every piece at its END frame (switches off, pin struck, heart placed) |
| Cost | inline SVG, no filter on a moving layer (blobs are radial gradients), no bitmap; ~118 KB raw for all six scenes (each repeats its gradient defs; one shared defs block halves it), built only when its card first shows |

## 4 · Where it lives

| Item | Proposal |
|---|---|
| Component | NEW `src/components/whats-new.js` + `src/styles/components/whats-new.css`; the scenes join `illustrations.js` (6 new art keys) and their motion joins `illo.css` |
| Auto-show | `home.html`: nudge kind `whatsnew` at the HEAD of `nudgeQueue`; backup / rating / hint cards wait until it closes |
| About row | `settings-screens.js` About: a row above "How to use Spixi"; opens the same component inside the settings WebView (trusted shell, no untrusted content) |
| C# | `HomePage.onLoaded`: push `setWhatsNew` {"version":"1.0","show":true} when `whatsnew.seen` ≠ `Config.version` AND the FE has a set for that version; `LaunchPage` create / restore OK: write `whatsnew.seen` |
| Done | verb `ixian:whatsnew:done` → C# writes `whatsnew.seen` = `Config.version` (× , Esc, "Got it" and the About path all send it) |
| Desktop | the home WebView is not the detail pane; C# hides the detail WebView while the card stands (presentation only), or no dim there |
| Per release | one table in the FE: version → slide ids. A release without a table bumps `seen` silently (#1143: no empty update) |

## 5 · Strings

New: **17 keys** (`whatsNew`, `whatsNewSub`, `whatsNewBadge`, `whatsNewGotIt`, `whatsNewEyebrow` + 6 × title / body). Reused: `next`, `close`, `about`, the About rows. Longest measured locale = fr (1.34 × en); the render checks en + a +40 % pseudo locale on a 320 × 568 phone.

## 6 · Security lens

No new `spixi.*` key (state in `SLocalOnlyStore`, like `SHints`) · no network fetch, no remote changelog (copy baked into the strings, art inline static SVG) · one push `setWhatsNew` (version must match `^[0-9.]{1,16}$`, else ignored; `textContent` only) · one verb `ixian:whatsnew:done` (no argument) · cap `whatsnew` · one P24 review packet + a gate row.

## 7 · Effort

Component + CSS ~420 lines · six scenes into `illustrations.js` (already drawn here) · home + About wiring ~80 · C# ~60 + CSH cases · 17 keys × 13 · ~12 pins. **About 1 session.**

## 8 · Dials for Damir

1. The six cards (or swap one with the bench).
2. The art direction of the six scenes (render §Art), scene by scene.
3. Hero chips: keep the "table of contents" idea, or one big object.
4. About row: badge "New" until opened, or no badge.
5. Desktop: hide the detail pane while the card stands, or no dim there.
