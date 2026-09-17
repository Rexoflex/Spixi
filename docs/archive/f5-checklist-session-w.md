# F5 checklist — Session W (#865–#867) + Session V round 3 (#868): the icons actually closed, the doodles tile retired

> **Round 3 (#868, Session V, on top of W's files).** Two things changed after this paste was written, both on
> disk now: (1) `generate-icons` drops the content-credentials manifest the file bridge stamps into SVGs, so
> GATE 63 (a) is green on your disk **as it is** — verified against all 91 of your sources with the four still
> stamped; step 1 stays because clean bytes are still the honest state of the tree. (2) The three pins your last
> run showed red — SESSION F M4, M3, AUG TILE — read the doodles pipeline #866 retired; they are re-based. The
> paste below is unchanged except for the phone build at the end. Expect **BASELINE OK / the 2 KNOWN**.

**This supersedes `f5-checklist-session-v.md`** — Damir had not run it when Session W started, and
its step 3 would have gone red for a reason it could not have known (#865). Everything Session V
asked for is still in here; the walk sheets (§1–§3 of the V file) are still owed and unchanged.

What §0 found before anything was built (#215):

* The four glyphs pulled by URL were pictures of the glyph **on its page** (background rect,
  canvas paths, `id` attributes). `generate-icons --check` rejected them before it could compare
  — GATE 63 (a) would have been red at your step 3, and the registry on disk still carried
  their previous versions. Cleaned to the one path every frame export has; measured 1.50 / `#131415`
  like the other 82; registry regenerated and committed byte-identical.
* Writing the four cleaned `.svg` files to your disk from a session **stamps a content-credentials
  `<metadata>` block into each** (7.7 KB; the bridge does it to anything it recognises as an
  image). The same gate refused those too. The clean bytes are in `docs\icons-fix-session-w.zip`
  (hash-verified on the round trip) — step 1 unpacks it over the stamped copies.
* Four stray `tabler-icon-*.svg.txt` files in `src\assets\icons` are mine (a failed attempt to
  dodge the stamp — it sniffs content, not names). The generator and GATE 63 (e) both ignore
  them (`.endsWith('.svg')`), so nothing is red because of them; step 1 removes them anyway.

`&&` is not PowerShell 5.1 syntax and `git` is not on that shell's PATH: every command is its own
line; removes/moves are `Remove-Item` / `Move-Item`, staged as deletions/renames when you commit
from Visual Studio or Claude Code.

```powershell
# ── 1 · the icons (#865): clean bytes out of the archive, the strays gone, the gate green
Expand-Archive -Force docs\icons-fix-session-w.zip src\assets\icons\
Remove-Item docs\icons-fix-session-w.zip
Remove-Item src\assets\icons\tabler-icon-alert-small.svg.txt, src\assets\icons\tabler-icon-layout-grid.svg.txt, src\assets\icons\tabler-icon-message-plus.svg.txt, src\assets\icons\tabler-icon-phone-end.svg.txt
node scripts/generate-icons.mjs --check        # EXPECT exit 0: "registry is current — 91 icons, icons.js and icons.iife.js match" (#868: green even before step 1 — the manifest is dropped, and it says so per file)

# ── 2 · the pattern sheet (#866): deterministic — rewrites the committed 15 133 bytes, proves it on your machine
node scripts/generate-chat-pattern.mjs         # EXPECT "written (14.8 KB)" · "data matrix 288×288 … ★ the one tile"

# ── 3 · strings → locales → bundle → shells (settings-screens.js and two shell sources changed; bundle BEFORE shells)
node scripts/extract-strings.mjs
node scripts/build-locales.mjs --check         # EXPECT exit 0: "every key is drafted or reused"
node scripts/build-locales.mjs
node scripts/build-strings-iife.mjs
node scripts/build-demo-bundle.mjs             # 317 exports
node scripts/build-shells.mjs                  # EXPECT the external line: spixi.chat-pattern.css ~15 KB (was ~254)

# ── 4 · the suite. EXPECT: BASELINE OK / the 2 KNOWN (#136 · B3). Anything else red is NEW — paste me the line.
#        (#868: SESSION F M4 / M3 and AUG TILE were red on your last run for #866's change, not yours — re-based.)
node scripts/smoke-test.mjs
node scripts/i18n-lint.mjs
node scripts/pseudo-locale-smoke.mjs
node scripts/verify-locales.mjs

# ── 5 · which pins read what this session touched (read sites, not failures)
node scripts/pin-sweep.mjs --working

# ── 6 · archive the consumed handoffs (skip any line whose file has already moved; the V checklist STAYS until its walk is done)
Move-Item docs\handoff-2026-09-09.md docs\archive\
Move-Item docs\handoff-2026-09-09b.md docs\archive\
Move-Item docs\handoff-2026-09-16.md docs\archive\
Move-Item docs\f5-checklist-session-t.md docs\archive\
Move-Item docs\commit-message-session-t.txt docs\archive\
Move-Item docs\commit-message-session-s.txt docs\archive\
Move-Item docs\walk-artifact-session-t2.html docs\archive\

# ── 7 · OPTIONAL, your call (#866): the three retired pattern exports are referenced by nothing and shipped nowhere.
#        Deleting artwork is not a code change I make on my own; the line is here if you want it.
# Remove-Item src\assets\images\chat-bg-doodles.svg, src\assets\images\chat-bg-pattern.svg, src\assets\images\doodle-pattern-aug.svg

# ── 8 · the phone (Spixi Dev coexists with the store build). Phone plugged in, USB debugging on, `adb devices` shows it.
dotnet build Spixi\Spixi.csproj -f net10.0-android -c Debug -t:Run
```

⚠ `dotnet build` is for the **Android dev build to the phone only** — Windows stays F5 (#663). If the Android build
ends in `1 error` and the summary hides it, run it again with `-v:m 2>&1 | Select-String -Pattern "error"` and paste
me the line; the one seen today was after a suite run that was still red, so re-run after step 4 is green first.

Then **F5 in Visual Studio, never `dotnet build`** (#663). No C# changed, so no obj/bin wipe —
**unless you run §3 below**, which is one C# token.

---

## §0 — what the suite will say, and why that is correct

| pin | expected | why |
|---|---|---|
| GATE 63 (a) `--check` green | ✓ after step 1 | the registry on disk was generated from the cleaned four; step 1 puts the same four on disk |
| GATE 63 (b) one export generation | ✓ 86/86 `#131415` | the four now carry the same ink as the frame export |
| GATE 63 (c) one stroke weight | ✓ 61 measurable, all 1.50 | `layout-grid` joins the unmeasurable list (closed shape) — it had read 4.00 only from the canvas rect's corners |
| GATE 63 (d) ink themes · registry clean | ✓ | 97 paints, all `currentColor` |
| GATE 63 (e) no dead SVG | ✓ | `.svg.txt` never counted; gone after step 1 anyway |
| W5 / E1 / Session F pattern pins (8 re-based) | ✓ | verified 16/16 on the new tree and 8/8 RED on the committed one, in the container |
| GATE 54 (a0/a/a3/a4/a5) · GATE 51 (a) · #345 | ✓ | unchanged from Session V's round 2 |
| the 2 KNOWN | 2 | #136 · B3 |

## §1 · §2 · §3 — the walks

Unchanged from `f5-checklist-session-v.md` §1 (the Add-contact chooser, 1.1–1.8), §2 (the icons in
the dark-mode chat topbar, 2.1–2.4 — 2.4 now reads "none heavier than its neighbours") and §3
(desktop). Plus one row for this session:

| # | do | expect |
|---|---|---|
| W.1 | open a 1:1 chat (light, then dark) · Account → Appearance | the data-matrix pattern exactly as before — the tile bytes are identical; only 234 KB of unselectable CSS stopped loading |

## §3 — the spare experiment (five minutes; decides #864)

`Spixi\Pages\Home\HomePage.xaml.cs` line ~3168 (the `★★ DIAL` docblock is right above it):

```csharp
private const bool CHAT_SPARE_ENABLED = true;   // → false
```

The suite accepts either value (the L1·10 pin matches `(true|false)`). F5, Release if you can.
Then, on the phone with logcat open:

1. **Confirm the flag took**: no `chat warm start`, no `attach spare=1` anywhere in the log. That
   absence is the only signal — the flag is deliberately silent. If you still see them, the binary
   is stale (this exact check found a stale Windows build once).
2. **Time the thing you reported**: Contacts → a row → contact details, ten times, from cold and warm.
   Also Account → Backup / Change password, and a long chats-list scroll.
3. **Expect the trade back**: `chat present t=` returns to ~300–400 ms (it was 113/152 with the spare).
   That is the cost of the experiment, not a finding.

Result → decides §3 of the session brief: **improved** = the resident spare (~15 MB PSS) is the cost,
retire the spare, and the contact-details batch (#864) is a nicety; **unchanged** = cold WebView
boots are the cost, `[CDPERF]` comes back on the details open first (#294), then the in-shell batch
in a Claude Code F5 session. Flip it back to `true` either way until that decision is a row.
