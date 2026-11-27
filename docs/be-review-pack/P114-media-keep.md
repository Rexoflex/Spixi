# P114 · THE CHAT SHELL TAKES A MEDIA-ORIGIN PICTURE URL AND KEEPS DECODED PICTURES (batch imgurl, item 1c)

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| LOW (a new accepted VALUE on two existing pushes, only under a cap; one document-local bounded map) | none | none: no verb, no push, no argument shape; the URL rides `setFileThumb(id, v)` / `viewerImage(token, v)`; two cap words in the existing `setCaps` | `ImgurlFlags.MediaOrigin` (C# declares `mediaOrigin`) · `ImgurlFlags.MediaKeep` (C# declares `mediaKeep`); absent = ON, a stored 0 acts only in dev mode; OFF = no cap = today's shell | 4 min |

**Look here first:** `src/shells/chat.html` `mediaUrlOk` / `fileThumbOk` / `fileThumbOf` (beside `FILE_THUMB_RE`) ·
`src/components/media-bubble.js` `MEDIA_URL_RE`, `isMediaUrl`, the keeper (`setMediaKeep`, `keepMediaImg`, `takeKeptImg`,
`bindTileImg`) and the `adopted` branch of `createMediaBubble`. The handler and the grants: P113 (1a).

## What and why
1. **The URL.** With `mediaOrigin`, C# may push a photo preview or the viewer picture as a URL of its OWN handler for this
   WebView — `https://spixi-media.invalid/m/<32 lower-case hex>` (Android, Windows) or `spixi-media://m/<32 lower-case hex>`
   (iOS, Mac) — instead of a base64 data: URI. The bytes stay out of the bridge and the JS heap; the engine fetches and
   decodes them off the main thread, near the viewport only (`loading="lazy"`, `decoding="async"`). Lab (Chromium, CPU × 4,
   not a device): 20 thumbs 927 192 → 3 420 bridge chars, push JS 45.5 → 11.6 ms, heap −0.70 MB; the viewer 1.11 M chars /
   78 ms → 170 chars / 1.8 ms, tap → full picture 349 → 177 ms, worst frame 150 → 33 ms (`/home/claude/scratch/c/lab.md`).
2. **The keeper (`mediaKeep`).** C# serves the URL `no-store`; `renderLogNow` rebuilds every tile per render, so a new
   `<img>` with the same URL could ask the handler again and show an empty tile until it answers (research D2B-4: a ship
   condition). A re-built tile ADOPTS the decoded `<img>` element of its URL (moved, bitmap and all): no request, no blank
   frame, no re-decode. ≤ 64 elements, oldest out; only a picture whose first fade ended; dropped on every `setCaps` and
   the per-peer reset; gone with the document (C# revokes the grants per document). A deleted message's picture stays in
   its kept `<img>` until it leaves the keeper (oldest out) or the document ends — the same WebView only (recorded, S-3). Lab: Chromium 158 already answers a
   re-built `<img>` from its image cache (0 re-fetches with or without the keeper, against the research's 55); the keeper's
   effect there is 3 → 0 new `<img>` on screen per render. WebKit (`spixi-media://`, iOS / Mac) is unmeasured: that is where
   the keeper is the guard.
3. **Not kept (recorded):** the quote tile of a reply to a URL photo and the reply-strip tile build a NEW `<img>` with the
   URL at every render — Chromium answers it from its image cache; WebKit may show them blank for one handler round trip
   (unmeasured: the WebKit walk row below). The paged viewer keeps no viewer URL either (C# holds ONE viewer grant per
   WebView, a new page revokes the last): a page back shows its thumbnail under the spinner and asks C# again; a
   neighbour slide shows only a thumbnail or a data: picture.

## The diff areas (`src/**`: see the size line in the batch handoff; `chat.html` (over 1,500 lines) grows only by lines that read the shell's own state — `bridge`, `fileThumbs` — and cannot sit in a component)
- `chat.html`: the import (`isMediaUrl`, `setMediaKeep`); `mediaUrlOk`, `fileThumbOk`, `fileThumbOf`, `syncMediaKeep`
  beside `FILE_THUMB_RE`; `setFileThumb`, `claimHeldThumb`, `buildFileRow`, `groupViewerItems`, `openFileOrViewer`, the
  completed-tile hand-over in `updateFile` read through them; `viewerImage` takes `mediaUrlOk(u)`; `viewerFailedToast` (the old toast lines, now one function) + `onUrlFailed`
  in `viewerTools`; `syncMediaKeep()` in `setCaps` and the per-peer reset.
- `media-bubble.js`: the grammar, the keeper, `load()` marks a URL lazy / async, one dispatching listener per `<img>`
  (`bindTileImg`: an adopted element answers the tile that holds it now).
- `message-bubble.js` `replyTileEl`, `composer.js` `ctxTile`: the quote tile and the reply strip tile take an `isMediaUrl`
  value as `img.src` (the stored preview the shell hands on), else today's `safeImageSrc` + data: rule; a URL that fails →
  the picture glyph (quote) / no tile (strip).
- `media-viewer.js`: `setSrc` takes `isMediaUrl(u)` too; a URL that fails to load → `setFailed` + `onUrlFailed` (the shell's
  existing toast); a data: decode error stays silent (today).

## Threat → rule → proof (pin `scripts/pins-imgurl/c-shell.mjs`, 15 rows, each broken at least once — #802)
| What could go wrong | What stops it | Proof |
|---|---|---|
| A peer-shaped or crafted value becomes a request (remote host, another path, a script URL) | one anchored grammar, both prefixes, 32 lower-case hex, nothing after (so at most 62 chars); only under the cap; C#, not the peer, pushes these values | c (1), (2) — 18 refused shapes |
| An older exe (no cap) changes behaviour | without `mediaOrigin` a URL is ignored as today; data: values identical with and without the caps | c (3), (4) (log DOM equal; the data: tile and viewer `<img>` carry exactly the base build's attributes) |
| The URL reaches another sink (CSS, markup, an offer preview, the photo picker) | it is written only as `<img>.src` — the tile, its quote tile, the reply strip tile; offer preview and picker stay data: only | c (7): the URL appears ONLY as those three `src` attributes |
| A failed URL shows a broken picture in a quote / the strip | `error` → the picture glyph / no tile | c (13) |
| A revoked / failed URL shows a broken picture | the `error` event → the tile's file face (idle, no src), the preview forgotten; the viewer → thumbnail + `setFailed` + toast | c (5), (6) |
| The paged viewer shows a viewer URL C# already revoked (a page back, a neighbour slide) | `fullOf` keeps data: pictures only | c (14) |
| An adopted `<img>` answers its old (dead) tile | one dispatching listener per element, re-pointed at every adoption (`bindTileImg`) | c (15) |
| The keeper grows without bound or outlives the conversation | 64, oldest out; dropped at `onChatScreenReady` and at every `setCaps`; document-local | c (10) the bound, c (11) the per-peer drop; the `setCaps` drop and the document end are not pinned (`setMediaKeep` clears on every call; a new document is a new JS context) |
| The keeper changes a first show (pop instead of fade) | only a picture that finished its first fade is adopted | c (12) |
| The keeper runs without its switch | `syncMediaKeep` needs both caps | c (9) |

## The switch `MediaKeep` and its OFF behaviour
OFF (C# does not declare `mediaKeep`): `setMediaKeep(false)` — the map stays empty, every tile builds its own `<img>`
(today's re-render); the URL path itself (`mediaOrigin`) is unchanged. `MediaOrigin` OFF: neither cap, the shell is
today's (data: only; the keeper never runs).

## What stage 2 deletes (R4)
`MediaKeep`: the switch and the keeper's off branch (`syncMediaKeep`'s `bridge.cap('mediaKeep')` term; the keeper stays) ·
`MediaOrigin`: the off-case rows of pin c ((3), the cap-absent half of (4) and (5)); the data: branches of the shell stay
for the WebViews that do not serve (a mini-app never does; an older exe).

Unproven: ⚠ device and WebKit (the lab is Chromium); the 1b push and the 1a handler are other items. WebKit walk row
(iPhone / Mac, dev build, both switches on): a chat with ≥ 10 photos, one reply quoting a photo, the reply strip open on a
photo; 5 live texts arrive; then page a photo group in the viewer 1 → 2 → 1. Pass when no tile, quote tile or strip tile
blinks empty during the arrivals, and the viewer's page back shows its thumbnail, then the picture, with no "could not be
opened" toast. One question for you:
is a document-local cache of up to 64 decoded 320 px bitmaps (≈ 26 MB worst case of renderer image memory) acceptable on
the low-memory Android path, or should the trim hook (P115) also drop it?
