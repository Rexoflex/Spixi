Next session — Session W: close the icons, then the spare experiment decides the rest

0 · Before anything else (#215)
Everything below is recorded with its mechanism. Do not re-investigate it. Verify the mechanism still holds, then build. Two rows in Session U's brief were already built; one row in Session V's brief (the stroke-width sweep) could not be built as written because the attribute does not exist — that check paid for itself a third time.

⚠⚠ Working constraints (#860) — unchanged
`device_bash` fails; only stage / commit / list-dir work. No git, node or gate runs on the machine from a session. A batch lands as files plus ONE PowerShell paste. `DECISIONS.md` is edited by staging, appending in the container, committing back. A doc move is a `Move-Item` in Damir's PowerShell (★ Session V: `git` is NOT on that shell's PATH and `&&` is not its syntax — one cmdlet per line; deletions/renames are picked up at commit time from VS or Claude Code). ★ New in Session V: the container CAN build the bundle (`build-demo-bundle` with the legal bake stubbed — docs/legal is not staged) and run any gate that reads the built bundle, so behavioural pins are verified before they land. Do that; do not ship a pin you have not run.

Where Session V left it
Read `docs/handoff-2026-09-16b.md` first. Uncommitted on disk: `generate-icons.mjs` (`--check`, the ink fix), `smoke-test.mjs` (GATE 63; GATE 54 re-based), the Add-contact chooser (`contacts-shell.js/.css`, `contacts-page.js`), rows #862–#864, the docs. Damir's pastes (`docs/f5-checklist-session-v.md`) regenerated the registry, strings, locales, bundle and shells, re-exported the icons and removed the dead files.

1 · ★★ Ask first
* The last suite line. It should be **BASELINE OK / the 2 KNOWN** — the first clean baseline since 2026-09-10. Anything red is NEW.
* The walk results — Session V's §1 (the chooser) and §2 (the thin icons in the dark-mode chat topbar), and Session U's §5.1/§5.5 (Doodles/Gradient landing). Still unreported.
* Did the two commits land (icons separately, per #856)? Damir commits from VS or Claude Code — no git on his PowerShell.
* `CHAT_SPARE_ENABLED = false` — run yet? It decides §3.

2 · The icons are closed
82 in the Figma frame (11735:1277), all 1.50, `#131415` ink; 91 in the registry; GATE 63 green. Do not reopen. If a new glyph is ever needed: add it to that frame, export the frame into `src/assets/icons/`, run `generate-icons` → `--check`. The gate names any straggler.

3 · The stutter, then the contact-details batch (#864)
`docs/contact-details-in-shell-read.md` is the plan. It is gated on the spare experiment: improved → the resident spare is the cost, and #800 traded the wrong way (retire the spare); unchanged → the `[CDPERF]` probe comes back on the details open (#294) and the in-shell batch is the treatment. The batch is C# — 9 HomePage verbs, 19 pushes re-targeted with the address, 9 handover rows — so it is a Claude Code session with F5 (#663), not this shape. Two forks are non-negotiable: the chat header keeps the page (#221), the desktop panes keep the page (#247/#836). Shape: takeover subscreen, not a `c-sheet`.

4 · Then, in order (unchanged)
* Two removable items (#857/#858) — pure deletion, measured.
* AND-40 — needs a run that kills; chase native/graphics.
* AND-36 / AND-39 — repro first.
* The freeze (#825) — last; it removes instruments AND-40 still uses.
* The BE cutover — `be-cutover-brief.md`, `security-review-for-be-engineer.md` first.

Rules that earned their place
#215 verify-first · #294 measure, don't guess (Session V: the stroke-width attribute did not exist; the weight was derivable from geometry) · #663 F5, never `dotnet build` · #771 strip comments before a negative sweep · #772 a comment stating an unenforced invariant is a defect · #798 a sweep from the author's list is not a sweep · #828 harnesses from the suite's own header · #846 exclusions by rule · #859/#861 re-base BOTH halves, sweep the whole range · ★ #863: re-entrancy on an overlay reads `isOverlayOpen`, never a handle `onDismiss` releases 400 ms late.

```powershell
node scripts/pin-sweep.mjs <first commit of the session> HEAD
```

Files
* `DECISIONS.md` — 527 rows. #862 (the gate and the three findings), #863 (the chooser), #864 (the contact-details read).
* `docs/handoff-2026-09-16b.md` · `docs/f5-checklist-session-v.md` · `docs/contact-details-in-shell-read.md` · `docs/commit-message-session-v.txt`.
* `scripts/pin-sweep.mjs` — read sites for a range; where to look, not what failed.
* `docs/release-readiness.md` · `docs/android-test-quickstart.md` (adb is Step Zero).

Chat isolation (#221) still governs anything touching contact details; ContactDetails keeps its own WebView on the chat-header arm and on desktop deliberately (#247). The security handover gate — any batch adding a verb, storage key, HTML sink, network fetch or log line needs a row; G-3: never log `ex.Message` where `Address` formats base58 into it.
