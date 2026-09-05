# F5 CHECKLIST — SESSION M (2026-09-04)

Three items shipped: **⑦ the chat-appearance restructure (#783)** · **⑧ the apps layout
(#784)** · **① present-on-paint for the five DATA pages (#785)**. One was ruled not-built:
**② the split-screen tray backstop (#786)** — logged, no code, nothing to test.

The clickable version of the rows below, with P/F/N and copyable result blocks, is
`docs/walk-artifact-session-m.html` — open it in a browser and walk from there.

---

## 0 · Before anything: the pipeline already ran on your machine

The generators ran here through the bridge and the gates came back green, so **you do not
need to re-run them to test** — the built shells under `Spixi/Resources/Raw/html` are
current. Re-run them anyway before you commit, as the pre-commit confirmation, because
**the container's run is not your machine's**:

```powershell
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"
node scripts\extract-strings.mjs
node scripts\build-locales.mjs
node scripts\build-strings-iife.mjs
node scripts\build-demo-bundle.mjs      # BUNDLE BEFORE SHELLS, always
node scripts\build-shells.mjs
node scripts\i18n-lint.mjs
node scripts\pseudo-locale-smoke.mjs
node scripts\verify-locales.mjs
node scripts\smoke-test.mjs             # the long one — expect BASELINE OK
```

Expected, and every one of these was seen green in the container:

```
bundle 321 exports · shells 18 · smoke BASELINE OK 4090 / the 3 known (#136 · M5 · B3)
locales ALL CLEAN 786 · i18n-lint OK (6 dev exemptions) · pseudo 9/9
cs-syntax 141 clean + 1 known gap · extract-strings --check OK · build-shells --check OK
build-legal-docs --check OK (terms baked · privacy HELD)
```

⚠ `cs-syntax-check` reports SKIPPED on the bridge VM (no tree-sitter there). It ran in the
container: **141 clean + 1 known gap.**

## 1 · Build

⚠⚠ **WINDOWS: BUILD WITH F5, never a bare `dotnet build` (#663).** The VS Deploy step is
what stages `Resources\Raw\**`; a bare build leaves the previous build's `ll_*.html` in
`Documents\Spixi\html` and the app serves it looking completely normal. That is #768, and
its fix makes the failure *visible* — it does not stage the assets for you.

**C# changed this batch** (`SpixiContentPage.cs` · `SingleChatPage.xaml.cs` ·
`HomePage.xaml.cs`), so this is a real build, not a shell refresh:

```powershell
# Visual Studio: F5 on the net10.0-windows target (NOT Rebuild Solution —
# that trips the pre-existing android RocksDbSharp errors)
```

For Android, the usual:

```powershell
dotnet build -f net10.0-android -t:Run
```

---

## 2 · The rows

### A · Chat appearance — the restructure (#783). Account → Chat appearance.

| # | Do | Expect |
|---|---|---|
| A1 | Open it in LIGHT | **THREE cards**: Message text size · Background · Canvas. The old *Opacity* card is gone |
| A2 | Look at Background | **Three tiles**: None (empty, diagonal slash) · Doodles · Data matrix. On desktop, four — Live flow last |
| A3 | Tap **None** | The live preview loses its pattern immediately. The gradient/ground stays |
| A4 | Tap **Doodles** | ★ The pattern comes BACK. This is the one regression the restructure could have shipped — None stores level 0, and coming back has to restore the level as well as the style |
| A5 | Tap **Data matrix**, then **None**, then **Data matrix** | Matrix returns, not Doodles. None never forgets the style you were on |
| A6 | Look at **Canvas** | A ROW — "Canvas … Gradient ›" — not a third pair of tiles. That is the fix, not a layout preference |
| A7 | Tap it | The house option sheet opens with Solid / Gradient. Pick the other one: the sheet closes, the row's value changes, and the preview follows |
| A8 | Switch the app to DARK (Account → Theme) and come back | **TWO cards.** The Canvas row is absent — not greyed, not a one-option chooser. Your ruling |
| A9 | ★ With Chat appearance OPEN, flip the **OS** theme (Windows settings / Android quick tile) | The screen re-renders and the Canvas row appears or disappears with the theme. Before this batch it survived into dark and sat there doing nothing |
| A10 | Open a chat | Whatever you picked is what the chat paints. Pattern, ground, text size |
| A11 | Set text size XL and look at the screen again | Nothing clips; the three cards still fit and scroll |
| A12 | ★ Look at the Background row in BOTH themes | The doodles tile no longer shouts next to the matrix one — comparable weight. It is ×3 where the matrix stays ×6 (#787). Too faint now? ×4.5 is one step back |

★ **The doodles tile is quieter (#787)** — you asked for it, and the ask named a real defect
in the *shape* of the dial: one multiplier cannot balance two artworks with different ink
coverage, so the boost is per style now. The candidate strips are in
`docs/sheets/session-m/` and in the walk artifact; ×4.5 and ×2 are one word away.

★ **Two one-word dials are yours and I did not take them** — say the word and they are a
one-line change: the card is still called **Canvas** (the spec's paraphrase was "Colour";
you never said either), and the empty tile is called **None** (a new string; "Off" was
already translated but reads as *the control* being off under a Background heading).

### B · Apps — grid by default, and the view sticks (#784). Apps tab.

| # | Do | Expect |
|---|---|---|
| B1 | Fresh install / cleared storage → open Apps | **GRID**, 2-up tiles |
| B2 | Toggle to list | List |
| B3 | Kill the app and reopen → Apps | **Still list.** This is the whole row: it used to forget |
| B4 | Toggle back to grid, kill, reopen | Still grid |
| B5 | Switch tabs away and back a few times | No flip between column and 2-up. The value is read once, at seed time, before the first paint |

### C · Present-on-paint (#785). Nothing to look for except *sooner*.

| # | Do | Expect |
|---|---|---|
| C1 | Open a chat, tap the header → chat info | Appears filled. **No empty panel, no spinner flash** — if you see either, that is the one failure mode of this change and it is a FAIL |
| C2 | Apps → tap an app → App details | Same: filled when it appears |
| C3 | Wallet → tap a transaction (desktop pane and phone) | The detail card appears filled |
| C4 | Open Account | The hub appears with your nickname, avatar and version already on it — never a blank hub that fills in |
| C5 | Account → Downloads | The list appears settled. An account with NO downloads must still open promptly |
| C6 | Do all of the above on a slow/cold start | Same. Nothing may appear EMPTY and then fill |
| C7 | Open a conversation a few times | Unchanged from before — the chat has its own mechanism and this batch only moved where its verb is received |

★ C1–C5 should each feel up to ~120 ms quicker. The honest test is not a stopwatch, it is
C6: **the change can only make a page appear earlier, never later**, so the only way it can
be wrong is by presenting something before it is filled.

### D · The numbers, if you want them (optional)

With logcat mirroring on, the chats flush now stamps the C# side:

```
[CDPERF] chats flush rows=… reqs=… dispatch=…ms
```

Pair it with the shell probe's `flush` / `done` marks on the same boot: `dispatch` is how
long C# took to emit ~60 rows, the probe marks are when the renderer executed them. The
pair is what separates "C# is slow to emit" from "the renderer is slow to execute" — the
same split that decided the chat-open route.

---

## 3 · If something is wrong

- **A page appears empty then fills** → the present signal fires too early in that shell.
  Name the page; the fix is one line and it is in that shell's own render function.
- **A page feels SLOWER** → that should be impossible (the timer is still there as a
  backstop). Say which, and it is a real finding.
- **Apps opens on the wrong view** → say whether storage was empty. Empty → grid is
  correct; non-empty → the stored value must win.
- **Chat appearance shows four cards** → you are on a stale asset set. F5, not `dotnet
  build` (§1).
