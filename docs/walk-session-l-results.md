# WALK L — RESULTS (Damir, 2026-09-04)

**Sheet:** 26 rows. **Scored: 13 P · 0 F · 13 not run.** Two logs (`walk.log`, `walk2.log`,
UTF-16 from PowerShell's `>` — convert before reading) and two `dumpsys meminfo` tables.

## The headline: #768 is confirmed fixed ON DEVICE, and yesterday's bug report was the same cause

**W0–W4 all pass**, including the two reports that opened the day:

| Row | Result |
|---|---|
| W0 | App **starts** with no `html\` folder and shows the page naming the missing file — it used to die in the `App()` constructor with no window and no message |
| W1 | **Add app opens.** No `ERR_FILE_NOT_FOUND` |
| W2 | **Account pane is DARK** under a dark system theme |
| W3 | No white pane / flash |
| W4 | Paste: text lands. **Images do not — see the new row below** |

★★ **G1 and G2 pass**, which closes the question the alignment report was really asking. On a
clean build a grouped run lines up, and a reaction on the row above changes nothing. So the
misaligned continuation bubble Damir photographed on 2026-09-03 was the **stale Windows asset set
of #768** — one build, three faces (Add app 404 · light Account pane · the hanging bubble). The
component was never at fault, which is what the jsdom probe said at the time and what the walk
has now confirmed with his eye.

**K1–K4 pass** — the keyboard→tray swap reads clean to him, matching the log (reveal on the real
resize at 28 ms and 30 ms, nowhere near the 450 ms backstop). **R3 passes** — rotating with the
keyboard up never put the tray on top of a live keyboard. **S2** (history pill) and **S4** (his
eye on the rest) pass.

## ⚠ ONE FAILURE, FOUND BY THE LOG AND NOT BY THE SHEET

The sheet records **FAILS: none**, and R4 (split-screen) is marked `-`, not run. **But `walk2.log`
contains the failure R4 exists to catch**, so it must not be filed as a clean walk:

```
t=48528  resize ih=475 d=115        (shrink; keyboard up)
t=61057  open   ih=475 kbUp=true    (⊕ tapped)
t=61510  reveal by=backstop         ← 453 ms, no resize ever arrived
t=68521  resize ih=661 d=-186       (the grow, SEVEN SECONDS later)
```

In a small viewport (`ih=475` — split-screen or a reduced window) the ⊕ tap produces no viewport
grow inside 450 ms, so the tray appears only on the backstop. **Same symptom class as #770, a
third trigger.** Recorded as a Session M row: the rotation cases are genuinely fixed (`open
ih=408 kbUp=false` and `open ih=936 kbUp=false` both take the non-hold path, immediately) and
this one is not.

★ The lesson is the one this project keeps re-learning: **an unscored row is not a passed row.**
The sheet's "none" is true of what was tested; the log is true of what happened.

## NEW ROW — W4: image paste is not implemented on Windows

Damir: *"We still dont support image now, but text works."*

Confirmed in the tree: **`Spixi/Platforms/Windows/` contains no clipboard or paste handling at
all.** Text paste works because the WebView handles it natively into the textarea; there is no
Windows equivalent of Android's `OnCommitContent` (#716) and no clipboard-image → attachment
bridge. So this is an **unimplemented feature, not a regression** — W4 is a partial pass and is
recorded that way rather than as a clean P.

## Not run (13)

A1–A3, F1–F3, R1/R2/R4/R5, S1, S3 — **all of these are answered by the logs instead**, and
scored there: six clean chat opens with zero backstop lines, `appnew onload t=75 → present t=75`
with 0 dropped frames, `[SCROLL]` at `drop=0 / max=8–25 ms` after the first burst, rotation
passing at `kbUp=false`, and both meminfo tables captured. The only row the logs leave open is
R4, above.

## What the logs decided

- **Chat open (#764) — it is the PARSE.** `nav` = `dcl` in all six opens (117/117 · 126/125 ·
  126/125 · 138/138 · 132/132 · 144/144), so the in-document time is entirely parse and window
  load fires ~1 ms after DOMContentLoaded. Split of a ~320 ms warm open: **60 ms WebView
  creation · 125 ms parse · 30 ms push+drain · 74 ms render → painted · 30 ms → present.**
  **A retained warm chat WebView removes ~185 ms of it.** That is the BE work order, on numbers.
- **RAM (#764).** Chats list **329 MB PSS**, Seed 01 **368 MB** (Δ +39). At rest: Native 69.6 ·
  Unknown 72.6 · Graphics 67.5 · Code 50.3 · System 55.9. Against WhatsApp/Telegram ≈177 MB peak
  we are **~150 MB over at rest, before opening anything.** The FE lever (release the parked
  Account WebView + the tile budget) attacks Graphics and might recover 15–25 MB — **worth doing,
  not sufficient.** The bulk is Native + Unknown + Code, i.e. the .NET/Chromium side: **a BE row,
  now with a number instead of an adjective.**
- **`[SCROLL]`** needs no fix: `drop=0`, `max=8–25 ms` across every burst after the first page-in.
- **#766 confirmed:** `appnew onload t=75 → present t=75`. Present *equals* onload, 0 dropped
  frames — the row that was committed untested on his word, now measured.
- **L14:** `handoff pop released by cover`, not the backstop.
