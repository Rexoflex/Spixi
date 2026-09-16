Next session — Session X: the suite line, the walks, then the spare experiment decides the rest

0 · Before anything else (#215)
Everything below is recorded with its mechanism. Do not re-investigate it. Verify the mechanism still holds, then build. Session W's §0 check found the icons red on disk in two ways the brief had called closed (#865) — that check has now paid for itself four sessions running. Run `generate-icons --check` in the container against the staged tree before believing any statement about the icons, including this one.

⚠⚠ Working constraints (#860) — unchanged, plus two from Session W
`device_bash` fails; only stage / commit / list-dir work. No git, node or gate runs on the machine from a session. A batch lands as files plus ONE PowerShell paste — one cmdlet per line, no `&&`, no `git` (`Remove-Item` / `Move-Item`; VS or Claude Code picks the deletions up at commit). `DECISIONS.md` is edited by staging, appending in the container, committing back. The container CAN build the bundle (`build-demo-bundle`, legal bake stubbed) and run any gate that reads it — do that; never ship a pin you have not run in both halves (#861). ★ #865: **the bridge stamps a C2PA `<metadata>` manifest into any SVG it writes** (by content, not by name) and may report the write as rejected while the bytes are on disk — SVGs travel ZIPPED (`Expand-Archive -Force` in the paste), and EVERY committed file is re-staged and byte-compared before it is called landed. ★ #868: `generate-icons` now DROPS exactly that manifest (base64 body only; anything else in `<metadata>` still fails closed), so a stamped SVG no longer turns GATE 63 red — the zip is still the honest state of the tree, the tolerance is what stops the loop. ★★ #868, NON-NEGOTIABLE: ONE session writes `smoke-test.mjs`, `DECISIONS.md` and `docs/` at a time. V and W wrote the same tree in parallel on 09-16 and it cost a round (W re-based eight pattern pins and missed three; V's clean SVGs were being stamped while W diagnosed why). If another session is open on this tree, READ only. ★ #865: a Figma MCP asset URL renders the node WITH its page — a glyph enters the repo only by exporting the frame or the node from Figma.

Where Session W (and V round 3, #868) left it
Read `docs/handoff-2026-09-16c.md` first. Uncommitted on disk: the regenerated icon registry, `generate-chat-pattern.mjs` + the 15 KB `chat-pattern.css` (#866), `smoke-test.mjs` (8 + 3 pattern pins re-based), `generate-icons.mjs` (the manifest tolerance, #868), four comment-only fixes, rows #865–#868, the docs, and `docs/icons-fix-session-w.zip` (paste step 1 consumes it). Damir had NOT run the Session V paste or walks when W opened; the W paste (`docs/f5-checklist-session-w.md`) supersedes V's paste and carries everything.

1 · ★★ Ask first
* The last suite line. It should be **BASELINE OK / the 2 KNOWN** — the first clean baseline since 2026-09-10. Anything red is NEW; get the line verbatim.
* Did paste step 1 run (the zip)? If `--check` still says `REJECTED … tag <metadata>`, it did not.
* The walk results — V §1 (chooser), V §2 (dark-topbar icons), V §3 (desktop), W.1 (pattern unchanged), and Session U §5.1/§5.5 (Doodles/Gradient landing). Still unreported after three sessions.
* Did the two commits land (icons separately, per #856)?
* `CHAT_SPARE_ENABLED = false` — run yet? Checklist W §3 has the line, the signal and what to time. It decides §3 below.

2 · The icons are closed — on the CLEAN bytes
82 in the Figma frame (11735:1277) + 4 pulled by URL and cleaned to the same shape; 86 stroke glyphs at 1.50 / `#131415`, 91 in the registry, `--check` green in the container. If a new glyph is ever needed: add it to that frame, export the frame (or the node) from Figma into `src/assets/icons/`, run `generate-icons` → `--check`. Never the asset URL. The gate names any straggler.

3 · The stutter, then the contact-details batch (#864)
`docs/contact-details-in-shell-read.md` is the plan. Gated on the spare experiment: improved → the resident spare is the cost (#800 traded the wrong way — retire the spare); unchanged → the `[CDPERF]` probe comes back on the details open (#294) and the in-shell batch is the treatment. The batch is C# — 9 HomePage verbs, 19 pushes re-targeted with the address, 9 handover rows — a Claude Code session with F5 (#663), not this shape. Two forks are non-negotiable: the chat header keeps the page (#221), the desktop panes keep the page (#247/#836). Shape: takeover subscreen, not a `c-sheet`.

4 · Then, in order
* ~~Two removable items (#857/#858)~~ — #857 ② is DONE (#866, −239 KB). #858's duplication is NOT a deletion (#867: a measured trade #345 made) — a `[CDPERF]`-style inline-vs-external timing on one shell is what would reopen it, nothing else.
* The settings swatch's `110px 191px` base mask rule (named in #866, not touched) — the doodles aspect surviving in settings CSS, invisible (None tile at opacity 0); two lines, its own pass, pin 7501 re-based in both halves.
* AND-40 — needs a run that kills; chase native/graphics.
* AND-36 / AND-39 — repro first.
* The freeze (#825) — last; it removes instruments AND-40 still uses.
* The BE cutover — `be-cutover-brief.md`, `security-review-for-be-engineer.md` first.

Rules that earned their place
#215 verify-first (Session W: "closed" was red on disk) · #294 measure, don't guess · #663 F5, never `dotnet build` · #771 strip comments before a negative sweep (Session W: three inherited raw sweeps moved onto stripped CSS) · #772 a comment stating an unenforced invariant is a defect · #798 a sweep from the author's list is not a sweep · #828 harnesses from the suite's own header · #846 exclusions by rule · #859/#861 re-base BOTH halves, sweep the whole range · #863 re-entrancy on an overlay reads `isOverlayOpen` · ★ #865 re-stage and compare every committed file; SVGs zipped.

```powershell
node scripts/pin-sweep.mjs <first commit of the session> HEAD
```

Files
* `DECISIONS.md` — 531 rows. #865 (the two SVG findings), #866 (the doodles retirement, measured), #867 (the duplication read), #868 (the bridge-stamp tolerance + the three re-bases + the one-writer rule).
* `docs/handoff-2026-09-16c.md` · `docs/f5-checklist-session-w.md` · `docs/f5-checklist-session-v.md` (walk sheets only) · `docs/contact-details-in-shell-read.md` · `docs/commit-message-session-w.txt`.
* `scripts/pin-sweep.mjs` — read sites for a range; where to look, not what failed.
* `docs/release-readiness.md` · `docs/android-test-quickstart.md` (adb is Step Zero).

Chat isolation (#221) still governs anything touching contact details; ContactDetails keeps its own WebView on the chat-header arm and on desktop deliberately (#247). The security handover gate — any batch adding a verb, storage key, HTML sink, network fetch or log line needs a row; G-3: never log `ex.Message` where `Address` formats base58 into it.
