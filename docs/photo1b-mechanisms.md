# photo1b — the mechanisms, re-read in the base tree BEFORE the fixes (#294)

Base `55feaddc` (Fix batch 2 merged). The two reports read the code at `20ada92`; Fix batch 2 changed `chat.html`,
`typed-bubbles.js` and the tokens after them, so every line below was found again in THIS tree. `chat.html` =
`src/shells/chat.html` (source lines). `SCP` = `Spixi/Pages/Chat/SingleChatPage.xaml.cs`.

## A · The history view (`claude/history-research-2026-11-18.md`)
| # | Mechanism (report) | Found in the base tree | Holds? |
|---|---|---|---|
| H1 | A page of older messages REBUILDS every row of the log (report `:5946-5970`) | `messagesDone` → `renderLogNow()` (`chat.html:7020-7023`); `renderLogNow` builds ALL of `order` into one fragment and swaps it (`:5872-5990`, `replaceChildren` `:5960`) | yes |
| H2 | Whole-log passes inside the render: payment dedup (`requestTxids`), photo-group plan, positions | `:5913-5927` (dedup over `order`), `planPhotoGroups(ids)` `:5929` (def `:3036`), `positionsFor(shownIds)` `:5934` (def `:2207`) | yes |
| H3 | The anchor is taken at `addMessages`, a separate push from `messagesDone` (jump risk 1) | `addMessages` `:6951` (`if (pos === 'prepend' && !prependAnchor) prependAnchor = firstVisibleAnchor();`); restore in the render `:5964` → `restorePrependAnchor` `:6255-6262` (`box.scrollTop += …`) | yes |
| H4 | The fix is in the same task as the swap (no frame painted before it) | `:5960` swap → `:5964` restore, same call | yes |
| H5 | The fade pass walks from the NEWEST row up; rows below the band are skipped one by one, so up in old history it reads every row below the screen | `composerFadePass` `:8894-8922`: loop from `kids.length - 1`; `if (r.top >= bandBottom) continue;` | yes |
| H6 | The fade pass also runs on every scroll frame (`scheduleComposerFade` on `scroll`) and once per render | `:8933` (`box.addEventListener('scroll', scheduleComposerFade …)`); `composerFadeNow()` at the end of `renderLogNow` `:5989` | yes |
| H7 | `orderInsert` is O(n) per row (filter + walk) → O(page · n) per page | `:6398-6404` | yes |
| H8 | The request fires within max(160 px, one screen) of the top, no fling gate | `attachLazyHistory` `:6378-6385`, `LAZY_HISTORY_MIN_PX = 160` `:6235`; `lazy-history.js:54-58` | yes |
| H9 | HV-5: the first page steps over 100 rows (50 → 150) | C#, NOT the page: `SCP:1084-1103` (`if (messagesToShow == 100) messagesToShow += Config.messagesToLoad;`) — the page takes any page size. Out of this batch (contract § 7 / § 8) | yes (C#) |
| H10 | Missing lines: no per-page insert line, no frames line per page | `lastPaintMs` is set for a prepend (`:7013`) but printed only on the open (`:7457`); `p1.js` has `p1Shown` | yes |

## B · The photo / voice open (`claude/photo-open-research-2026-11-17.md` § 2, § 3, § 6)
| # | Mechanism (report) | Found in the base tree | Holds? |
|---|---|---|---|
| P1 | The photo tile builds a hidden file face (`fileFace`: glyph tile, cap, CTA / hint) for EVERY tile, also a complete local photo that will show its picture | `createImageFileBubble` `typed-bubbles.js:1117-1208`: `el.append(fileFace(…))` `:1180`; `fileFace` `:1049-1103` | yes |
| P2 | `jpegSize` reads the JPEG head (atob of up to 4 KB) for a tile whose size is FIXED at 320 × 320 | `sizeHint: pic ? jpegSize(pic) : null` `typed-bubbles.js:1145`; `width: PHOTO_TILE_PX, height: PHOTO_TILE_PX` `:1142`; `setImageFileThumb` `:1244` | yes |
| P3 | The media tile builds an overlay icon (`icon()` → `innerHTML` parse) and a spinner state on build | `media-bubble.js:183`, `:188` (overlay icons by state) | yes (read for the builder) |
| P4 | On picture load the log is re-pinned (`pinLogEnd`) although a fixed tile never changes height | `chat.html:3186` (`onLoad: photoTile ? () => { if (nearBottom()) pinLogEnd(); }`) | yes |
| P5 | A `setFileThumb` push patches the tile in place (`setImageFileThumb`), then the box `load` listener runs a fade pass | `chat.html:7842-7860`; `:8935` (`box.addEventListener('load', scheduleComposerFade, { capture: true })`) | yes |
| P6 | A voice row builds 40 bar spans and writes `--voice-h` on each, also for a flat placeholder (no peaks yet) | `buildVoiceBody` `message-bubble.js:819-863` (40 × `span.c-voice__bar`); `paintVoice` `:965-972` (40 `style.setProperty` + `data-played` per paint) | yes |
| P7 | A `voiceInfo` push repaints the row (40 writes again) | `chat.html:7316-7331` → `paintVoiceRow` `:2738` | yes |
| P8 | The open's `[CDPERF] chat-shell` line has one `paint=` number (no split) and no count of media pushes before the paint signal | `chat.html:7457-7460`; the present `ixian:painted` `:7470` | yes |
| P9 | The page drops all thumbnails at every open | `onChatScreenReady` `:7195` (`fileThumbs.clear()`) — unchanged by this batch (the C# half, PO-1 / PO-3, is `photo1a`) | yes |

## C · The chat backgrounds (`claude/chat-backgrounds-proposal-2026-11-17.md`)
The proposal's `tokens.css` line numbers were read at `3066e658`; Fix batch 2 added `--outline-select-ring` and moved
lines by +2 (e.g. the light pattern alpha `:1684` → `:1686`, dark `:2122` → `:2124`, light Aurora `:2520` → `:2522`).
The `tokens` agent finds each token by its rule, not by the line number. The alpha lives in `tokens.css`, not in
`scripts/generate-chat-pattern.mjs` (its header: "All alpha lives INSIDE the mask … the opacity ladder
(--chat-pattern-alpha-*) and the per-canvas ink stay the only dials") — so the generator and its output do not change.

## D · The cap path (the switches)
The chat page's caps are pushed ONCE per `onLoad` from `SCP:1648` (`Utils.sendUiCommand(this, "setCaps", caps)`),
before the load task; the shell's `setCaps` only adds (`chat.html:7395-7405`). So the caps are in before the first
`messagesDone`; a render before them (the 500 ms fallback `:6015`) takes the old path.
