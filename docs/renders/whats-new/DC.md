# Downloads + Contributors — premium (render)

2026-10-11 · Damir 15:34: "prep render for downloads and contributors … premiumized as you suggest and perhaps a bit more". Render only.

| Item | Detail |
|---|---|
| Downloads · summary | a card on top: `downloadsCount` + total size, a storage bar by kind (photos / PDF / ZIP …, one colour per kind, grows in once), a legend with each kind's size, `clearDownloads` as a red text action |
| Downloads · filters | chips All · Photos · Files (`all`, `photos`, `sharedFiles`) + today's `downloadsFromChip` (From: Everyone) on the right |
| Downloads · list | grouped by day (`today`, `yesterday`, then the date) with each day's size; photos as a 3-column THUMBNAIL grid with a size badge (the real received photo, by URL — after Session 16 lever #1 so the list stays light; until then the type tile); other files as rows with a coloured type tile + a format tag, the name, `downloadsFrom` · size · time |
| Downloads · actions | the per-row chat + trash icons go; actions live in SELECT mode (`select` / `cancel` in the bar, or long-press a file): check marks, a floating bar with `selectedCount`, "Show in chat" (one file) and `delete` |
| Contributors · header | the About band grammar in a warmer key (violet → pink, light `#6f7dff → #a35cff → #ff7ab6`, dark `#2c3fa8 → #5a2aa8 → #8a2a6e`), a glass heart with the `heart-handshake` glyph etched, coloured bokeh, twinkles, a slow float; white bar ink |
| Contributors · names | "Thank you" + `contributorsLead`; each name a chip with a coloured initial disc; chips pop in one by one (≤ .85 s total); a tap bounces the chip and throws 8 small sparkles (reduced motion: none) |
| Contributors · credits | `creditsTitle`; each credit a row: a type tile (sounds / icons / flags), the label, the FULL source text (CC-BY asks for the attribution and the licence link on the shipped artifact — never shorten it), a licence pill, an external-link mark |
| New strings (drafts) | `thanks` "Thank you" · `showInChat` "Show in chat" (one file; today's `downloadsShowInChat` names the person) |
| Cost | Downloads: thumbnails only through the media handler (lever #1), lazy below the fold; Contributors: one SVG header, no filter on a moving layer except the bokeh blur (static), loops ≤ 0.3 Hz |
