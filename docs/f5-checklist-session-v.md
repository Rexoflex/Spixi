# F5 checklist — Session V (#862–#864): the icon gate, the icons, the Add-contact sheet

**Round 2 (after the first run).** The first run regenerated the registry (GATE 63 (a)/(d)
green), built the chooser (GATE 54 green) and named the 10 old-weight glyphs (GATE 63 (b)/(c),
correct). It also found three things that are now fixed on disk — read them before pasting:

* **GATE 51 (a)** — `build-locales --check` exits 1 for a key drafted in NO locale. The five
  chooser strings had no drafts. They are drafted now in all twelve `src/strings/draft/*.json`
  (the gate's own rule: no allow-list, a translator writes the draft). Re-run the pipeline.
* **#345** — index.html measured 538 677 chars against a 516 KB ceiling. 3 276 of the overshoot
  is the chooser's stylesheet; ~7 000 predates this session (home.html grew in Session U and the
  pin was not run afterwards). Ceiling re-based 516 → 528 with the delta stated, per its method.
* **GATE 63 (e)** was red because step 1's `git rm` had not run — the two dead SVGs are still
  in the tree. It is step 1 again below.
* `&&` is not PowerShell 5.1 syntax, and `git` is not on that shell's PATH. Every command is its
  own line, and file removes/moves use `Remove-Item` / `Move-Item` — git sees them as deletions and
  renames when you commit from Visual Studio or Claude Code.

```powershell
# ── 1 · the two dead SVGs (byte-identical to their -filled twins; the generator never read them)
Remove-Item src\assets\icons\apps.svg, src\assets\icons\messages.svg   # git is not on the PowerShell PATH; the deletion is staged when you commit from VS / Claude Code

# ── 2 · the art, if step 0 did not land last time (URL is short-lived — if it 404s, export
#        node 11739:19202 from Figma as PNG @2x to the same path)
if (-not (Test-Path src\demo\images\add-contact.png)) { curl.exe -L -o src\demo\images\add-contact.png "https://www.figma.com/api/mcp/asset/85080dab-fadd-4e3a-b583-a52881d97f7c.png" }

# ── 3 · the gate is green already (you regenerated); this just proves it
node scripts/generate-icons.mjs --check

# ── 4 · strings → locales → bundle → shells (the drafts are new; bundle BEFORE shells)
node scripts/extract-strings.mjs
node scripts/build-locales.mjs --check        # EXPECT exit 0: "every key is drafted or reused"
node scripts/build-locales.mjs
node scripts/build-strings-iife.mjs
node scripts/build-demo-bundle.mjs            # 317 exports
node scripts/build-shells.mjs

# ── 5 · the suite. EXPECT exactly two reds: GATE 63 (b) and (c), naming the 10.
#        #345, GATE 51 (a) and GATE 63 (e) must be green now. The 2 KNOWN stay 2.
node scripts/smoke-test.mjs
node scripts/i18n-lint.mjs
node scripts/pseudo-locale-smoke.mjs
node scripts/verify-locales.mjs

# ── 6 · which pins read what this session touched
node scripts/pin-sweep.mjs --working

# ── 7 · archive the consumed handoffs (Move-Item: git is not on the PowerShell PATH)
Move-Item docs\handoff-2026-09-09.md docs\archive\
Move-Item docs\handoff-2026-09-09b.md docs\archive\
Move-Item docs\f5-checklist-session-t.md docs\archive\
Move-Item docs\commit-message-session-t.txt docs\archive\
Move-Item docs\commit-message-session-s.txt docs\archive\
Move-Item docs\walk-artifact-session-t2.html docs\archive\
```

Then **F5 in Visual Studio, never `dotnet build`** (#663). No C# changed, so no obj/bin wipe.

---

## §0 — what the suite will say, and why that is correct

| pin | expected | why |
|---|---|---|
| GATE 63 (a) `--check` green | ✓ after step 3 | the registry equals a fresh generation |
| GATE 63 (b) one export generation | ✗ names 9 | `alert-small bell-ringing cloud-bolt layout-grid message-plus phone-done phone-end user-pentagon volume` still carry `#131415` |
| GATE 63 (c) one stroke weight | ✗ names 8 | `alert-small bell-ringing checks-l cloud-bolt message-plus phone-done phone-end volume` measure 2.00 against a set at 1.50 |
| GATE 63 (d) ink themes · registry clean | ✓ | after step 3 there is no `black` in icons.js |
| GATE 63 (e) no dead SVG | ✓ after step 1 | red on the first run only because `git rm` had not run |
| GATE 54 (a0/a/a3/a4/a5) | ✓ | the chooser, on the BUILT bundle |
| GATE 51 (a) build-locales --check | ✓ | the five chooser strings are drafted in all twelve locales now |
| #345 index.html ceiling | ✓ | re-based 516 → 528 with the delta stated (3 276 chooser CSS + ~7 000 pre-existing) |
| the 2 KNOWN | 2 | #136 · B3 — unchanged |

(b) and (c) go green the moment the 10 are re-exported at 1.5 and `generate-icons` is re-run. If any of
them is deliberately 2.0, say which and the rule gets an exclusion **by rule, not by list**.

---

## §1 — the walk (phone)

| # | do | expect |
|---|---|---|
| 1.1 | Contacts → **Add contact** | a bottom sheet: "Add contact", the illustration, the lead line, two cards — **Scan QR code** / **Enter or paste a Spixi address**. The directory stays visible under the scrim |
| 1.2 | tap **Enter or paste** | the sheet slides down, the form is up, the address field has focus and the keyboard is up |
| 1.3 | Back from the form | the directory, intact |
| 1.4 | Add contact → **Scan QR code** | the form is up for a beat, then the scanner. Cancel the scanner → the form (type instead). Scan a real code → the form with the address filled and the ✓ |
| 1.5 | Add contact → tap the scrim | the sheet closes, nothing else changed. Tap Add contact **immediately** again → the sheet opens again (this was a dead window before) |
| 1.6 | Add contact → sheet open → tap the Chats tab | no sheet left behind over the chat list |
| 1.7 | dark mode → repeat 1.1 | the sheet, the cards and the medallions theme; the illustration reads on dark |
| 1.8 | if `add-contact.png` failed to download | the art slot shows the `user-plus` glyph tile, not a hole |

## §2 — the icons (phone, after step 3)

| # | do | expect |
|---|---|---|
| 2.1 | open a 1:1 chat, look at the **topbar** | the smallest glyphs in the app, at the lighter stroke — this is the honest test |
| 2.2 | **dark mode**, same topbar + a populated chats list | every glyph is ink-coloured. **A black glyph here is the #862 defect** and means step 3 did not run |
| 2.3 | any screen showing `checks-l` (double-tick large) | ink-coloured in dark mode — it shipped black before this |
| 2.4 | the ten named in §0 | visibly heavier than their neighbours until re-exported |

## §3 — desktop (Windows)

| # | do | expect |
|---|---|---|
| 3.1 | wide window, a conversation open, Contacts → Add contact | the form opens in the **pane**, as before — no sheet (the #836 fork) |
| 3.2 | narrow the window below the pane, Add contact | the chooser, as a centred dialog |
