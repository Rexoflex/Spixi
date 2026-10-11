# Thread — a new illustration and motion language (proposal)

2026-10-11 · Damir 12:57: "a new visual language that could be used instead of the one we have … put Spixi at the level of the incumbents and above, not too wild". Render only; the copy and the What's new plan are unchanged (PROPOSAL.md).

## Why it fits Spixi

| | Thread | Today's glossy tiles |
|---|---|---|
| Says something | the line IS the product claim: one direct line, no server in the middle | decorative; could be any app |
| Ownable | a single-line + off-register mark that nobody in messaging uses (WhatsApp / Telegram / Signal / Viber use flat clip-art, stickers or 3-D blobs) | close to the generic "3-D glossy icon" trend |
| Light and dark | from tokens; one drawing, both themes | fixed dark panels (#130 theme-stable compromise) |
| Motion | the line draws, then one spark travels it; continuous across cards | many small pops and glows per scene |
| New feature art | ~30 min: a few lines + two planes on the thread | ~0.5 day: layered gloss tiles |
| Weight | ~3–5 KB per scene (no filters, no gradients) | ~15–25 KB per scene (filters, gradient defs) |
| Risk | can feel too quiet next to the brand gradient → the hero inverts onto brand indigo | can feel busy; dated when the trend passes |

## What it would replace (if picked)

The 14 drawings in `illustrations.js` (welcome 1–4, restore, chats / contacts / add-contact / apps / wallet empty, explore, backup, rating) and the six What's new scenes, one by one, behind the same `illustrationFor` names; `illo.css` keeps the motion classes, Thread adds `th-*`. The launch flow (fixed dark aurora) would show the hero treatment: white line on brand indigo.

## Technical notes

- The spark uses SVG `animateMotion` (Chromium WebView2 / Android WebView / WKWebView all support it); it starts 2.2 s after the scene appears and pauses with the card. Reduced motion: no spark, end frame.
- No `filter`, no gradient, no bitmap; stroke-dash drawing on `pathLength="1"`; transform / opacity only.
- Colour = 7 values per theme (ground, dot grid, ink, two planes, on-accent ink, spark), all from the brand ramps; would become `--th-*` tokens in `tokens.css`.

## Dials for Damir

1. Thread as THE language (replace the glossy set over time), or only for What's new.
2. Accent plane: brand indigo (as rendered), or the violet of the new connecting line (#1262).
3. Dot-grid ground: keep, or a plain tinted ground.
4. If picked: redraw order — What's new six → welcome 1–4 → empty states → backup / rating.
