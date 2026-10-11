# Desktop discovery renders (v1.1+ track)

Render only. Nothing in `src/`, `Spixi/` or any other doc changes. Open **`desktop-render.html`** in a browser (one self-contained page).

| File | What |
|---|---|
| `desktop-render.html` | the built page: three directions at 1280 × 800, 1440 × 900, 1920 × 1080, light and dark, Windows 11 and macOS 27; states; the four key flows; the "not a mobile port" chat list and wallet; X-ray of the WebView / process layout |
| `PROPOSAL-A-deck.md` | A · Deck — power user, keyboard first |
| `PROPOSAL-B-office.md` | B · Office — Spixi for business |
| `PROPOSAL-C-stage.md` | C · Stage — the chat plus the thing you do together |
| `COMPARE.md` | side by side, the base all three need, my pick, questions, sources |
| `build-render.mjs` | rebuilds the page: `node docs/renders/desktop/build-render.mjs` (Node only, no packages) |
| `parts/` | page template and CSS, `kit.js` / `kit.css` (frame building blocks), `data.js` (fictional data), `np.js`, `dir-a.js`, `dir-b.js`, `dir-c.js`, `page.js` |
| `img/` | two v1 screenshots taken from `src/demo/desktop.html` |

The build reads `src/styles/tokens.css`, `src/components/icons.js` and `src/assets/fonts/sora-latin-wght-normal.woff2` from the tree, so a token change shows up on the next build.

X-ray colours: blue = shell WebView (trusted) · red = chat process (peer content) · purple = apps process (third-party code) · green = native C#.
