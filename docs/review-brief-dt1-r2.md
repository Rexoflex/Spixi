# Review brief — DT-1 round 2 (the list density, the Windows title bar look, pinned rows)

## 1 · What landed (base = the two DT-1 commits, local `01ebe5e6`)
- **#1390 List density** — `src/shells/home.html` (the head ladder: ONE script for `spixi.chat.previewlines` + `spixi.chat.listdensity`), `src/styles/components/chatlist-item.css` (the density block, every rule under `:root[data-desktop][data-row-density=…]`), `src/components/settings-screens.js` (`createChatAppearance`: `listDensity` / `onListDensity`, the group FIRST in the chat-list card, Dense hides the Message preview wrapper), `src/styles/components/settings-screens.css` (the density tiles), `src/shells/settings.html` (`CHAT_PREFS.listDensity`, `readChatPrefs`, the handler only when `isDesktop`), 4 keys in 13 drafts + en-us.
- **#1392 Title bar** — `Spixi/Utils/DtTitleBarRules.cs` (`WayDefault = WayOff`, `titleFor` = "Spixi" always, `wayWord` unknown → "off"), `Spixi/Utils/SpixiFlags.cs`, `Spixi/Pages/Dev/DevPage.xaml.cs`, `src/shells/dev.html` (the card order + the off label), `devTitleBarOff` strings.
- **#1393 Pinned rows** — `src/styles/tokens.css` (`--surface-pinned-hover`, both themes), `chatlist-item.css` (desktop `margin-block: 1px` on rows + request cards; the pinned hover rule on the wrapper's `:hover` + `[data-hover]`).
- Tests: `scripts/pins-dt1/c-density.mjs` (new), `scripts/pins-dt1/d-pinned.mjs` (new), `b-titlebar.mjs` + `pins-s17/f-moments2.mjs` + csh `DtTitleBarTests` re-based, smoke `INDEX_KB_CEIL` 644 → 648.
- Diff of the code: `/home/claude/w/dt1-r2-code.diff`. Tree: `/home/claude/w/Spixi-d` (built). Base tree: `/home/claude/w/Spixi-b`.

## 2 · How to run
- Built shells: `Spixi/Resources/Raw/html/index.html`, `settings.html`, `dev.html`. One module: `bash /home/claude/w/runner/mk.sh /home/claude/w/Spixi-d pins-dt1/c-density` then `node scripts/zz-run1.mjs` (delete `scripts/zz-run1.mjs` after). Do NOT run the full smoke (memory).
- C#: `node scripts/run-csh.mjs` → `CSH pass=448`. MAUI C# cannot compile here.

## 3 · Must-hold invariants
- The phone list and the phone Chat appearance are unchanged (no density control, no gap, no pinned hover, no density effect even with the key stored).
- A density pick reaches an open list live; a restart opens on the stored density before first paint; under Dense the list is one line whatever the preview key says.
- Gate: the new `spixi.chat.listdensity` holds no peer data; only fixed literals reach attributes; no new verb, push or log line; the storage-listener count in home stays 4 (gate 5).
- #1392: with dev mode off, the title bar way is `off` whatever is stored; `off` paints and extends nothing; the caption is "Spixi".
- #353: the selected row keeps its own paint under the pointer; #1171: the `[data-hover]` carry paints the same as `:hover`.

## 4 · Accepted dials (do not re-open)
- Three densities (Damir), Comfortable = today = default; desktop only; Dense = one line; the control sits FIRST and Dense hides Message preview.
- The Windows look for the title bar (Damir); the maui / colors ways stay as dev experiments.
- Pinned hover = the pinned wash at about twice the alpha; the gap = 2 px (Damir picked "Gap + pinned hover").

## 5 · Verdict — CLEAN (0 MAJOR after round 2; every MINOR fixed)

| Round | Reader | MAJOR | MINOR | NIT |
|---|---|---|---|---|
| r1 | A — shells / CSS / settings + security | 0 | 4 | 4 |
| r1 | B — C# title bar + the dev card | 0 | 1 | 4 |
| r2 | fresh reader over the r1 fixes | 0 | 3 | 4 |

**Fixed (each verified in the source first):**
| Finding | Fix |
|---|---|
| r1 A-M1 — under `dense` the ladder clamped a PHONE's 2-line preview | the clamp needs `data-desktop`; the ladder moved AFTER the ?desktop / ?mobile override (c-density phone clause stores `'2'`) |
| r1 A-M2 — a dense group row truncated a short sender ("Ge…") | dense sender cap `max(40%, 7ch)` (r2 NIT-1 replaced the first fix, 70%) |
| r1 A-M3 — the placeholder glyph kept its 26 px on the 40 / 32 discs | `> svg` 22 px (compact) · 18 px (dense) |
| r1 A-M4 — the unpinned hover vs a pinned row at rest still look alike | not a defect of the picked dial (§4); a walk check in DT2-PIN, told to Damir |
| r1 A-N1 — a glyph-led dense preview sat 2 px high | `align-items: center` |
| r1 A-N4 — the phone Chat appearance gained a wrapper div | the wrapper only beside the density control; the phone DOM is byte-identical |
| r1 B-MINOR-1 — the "off paints nothing" guards were unpinned | b-titlebar `offCreate` · `offUiSettings` · `offApply` + the dev card's `off` push |
| r1 B-NIT-1 — `apply()` still dispatched a no-op under off | `if (way() == WayOff) return;` before any dispatch; the dead inner check removed (r2 NIT-3) |
| r1 B-NIT-2 — the CreateWindow comment said "off = today" | comment updated (Mac keeps "Spixi IM": Q1 was the Windows bar) |
| r2 MINOR-1 — the dense initials shadow beat hue 2's stronger #1001 shadow | the dense shadow rule `:not([data-hue="2"])` |
| r2 MINOR-2 — the r1 CSS fixes were unpinned | c-density reads the glyph, the dot, the sender cap, `align-items` and the hue-2 / hue-5 shadow winners |
| r2 MINOR-3 — the deliberate breaks were not written down | this section; the c-density header path corrected |
| r2 NIT-2 — the delivered tick is ~2.98:1 on the pinned hover | exempt, reason in the token comment (a hovered wrapped row hides its ticks; a `data-acts="0"` row is a handshaking row, no tick) |
| r2 NIT-3 — stale b-titlebar / DtTitleBar text | updated |

**Recorded, not fixed:** r1 A-N2 tile label ellipsis (lt-lt "Kompaktiškas" at the narrowest two-column width; the accessible name is whole) · r1 A-N3 the dense name 55% cap beside an empty preview (a typing row) · r1 B-NIT-3 `titleFor(way)` ignores its argument (kept: the API the call sites use) · r1 B-NIT-4 (pre-existing) the dev card shows the stored way, not the acting one on Windows 10 · r2 NIT-4 1 px of a request card's margin sits outside any hover wrapper (cosmetic) · **r1 B-Q5 lens (over-engineering, `yagni:`)**: the failed ways maui / colors still cost ~150 lines + a verb + a push + a card + 4 strings — offered to Damir: delete them once DT2-TB-LOOK passes.

**Deliberate breaks — 30, all KILLED** (one-token mutations in a full copy, the module re-run each time):
- c-density: M1 ladder admits any value · M2 dense no longer holds the preview · M3 the storage listener ignores the key · M4 compact avatar 48 · M5 dense content a column · M6 a dense rule loses the desktop gate · M7 dense padding 8 · M8 Dense does not hide Message preview · M11 the group after Message preview · M12 the tap does not write · M13 dense trailing column not reversed · M14 the settings reader drops the stored value · M10 the component ignores `isDesktop` (survived round 1 → the component-guard clause added; M9 "the host passes the handler on a phone" stays a by-design survivor: the component guard catches it) · N6 / N10 the glyph not resized · N7 sender back to 40% · N8 baseline · N9 the hue-2 shadow overridden · N11 the phone clamp · N16 the phone gets the wrapper.
- d-pinned: N1 the pinned hover rule · N2 the `[data-hover]` carry · N3 the gap · N4 the dark token · N5 the selected-row guard.
- b-titlebar: N12 `apply()` under off dispatches · N13 off creates a TitleBar · N14 the flags default back to maui · N15 the dev card default not first. csh `DtTitleBarTests` asserts `WayDefault == WayOff`.

**Numbers:** see the handoff (the final smoke after the last fix) · CSH 448.
