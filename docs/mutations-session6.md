# Deliberate breaks — session 6 (each: one-token mutation, rebuilt, the pin went red for exactly that reason, restored green)
| Pin | Mutation | Result |
|---|---|---|
| view #1 | media-viewer.js `if (token) img.dataset.pending = ''` → `if (false)` | killed |
| view #1 | load guard `if (!fullSrc \|\| …) return;` → `if (false) return;` | killed (after the redundant inner check was removed) |
| view #2 | tap-outside `&& !downOnImg` removed | killed |
| view #2 | `< TAP_PX` → `< 1000` | killed |
| view #3 | close `--duration-100` → `--duration-200` | killed |
| view #4 | probe `'fade flip dec='` → `'fade flip DEC='` | killed |
| group #4 | chat.html cont `(a.kind…)==='text' && (b.kind…)==='text'` → `true` | killed |
| group G1–G5 · menu M1–M6 | agent A list (DECISIONS #1182 / #1183) | killed |
| hover 1–5 | agent B list (#1184) | killed |
| cs (7) + csh (2) | agent C list (#1175–#1178) | killed |
