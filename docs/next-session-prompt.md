Next session — Session AC is built (startup lever · landscape + the Android landscape rail · the iOS extension written · route B prepared) and awaits Damir's walk + commit; the office iPhone day is next; the endgame after it

0 · Before anything else (#215)
Read `docs/handoff-2026-09-22b.md`, then DECISIONS #916–#924. Check `device_bash`; use
`git --no-optional-locks status`. Run the four `--check` gates on the real tree. CHECK DECISIONS before
accepting any "owed" row from this prompt (#660). The FULL suite runs in the container on a SNAPSHOT
COPY (handoff §5), BEFORE and AFTER — predicted is not an acceptable last line. Reviews run on Opus —
pin the model explicitly. A file edited directly on the VM must be staged back before the next tar
lands (handoff §5). Scratch runners are `scripts/_*.tmp.mjs`, gitignored, never landed.

1 · Item 0 — is Session AC committed?
`git --no-optional-locks log -1` and `status`. If the AC delta is still uncommitted: the walk ran 2026-09-23 (17 P · 2 F · 1 N/A, #924 fixed both fails —
re-walk AC.7 + AC.8 on Android), then ONE commit. (`docs/walk-artifact-session-ac.html`, 23 rows — AC.19–AC.22 are the landscape rail, #922) and ONE commit (`docs/commit-message-session-ac.txt`)
come first — ⚠ six iOS-side C# files + a NEW project + 43 vendored files that NOTHING has compiled
(Windows F5 — never `dotnet build`, #663 — and Android compile none of that: iOS-only blocks, ios-only
reference, maccatalyst-only source), PLUS three Android-side files for the landscape rail (#922:
`SpixiLocalization` · `MainActivity` · `UIHelpers`) that Damir's ANDROID build compiles for the first
time, PLUS `HomePage.xaml.cs` (#923: a phone is one pane in every posture — every platform compiles it) — a build error there is Session AC's bug. Archive `docs/commit-message-session-ac.txt` and `docs/f5-checklist-session-ac.md` once walked.
Housekeeping Damir owes locally: `git rm --cached crash-logcat.txt mem-*.txt` + gitignore them;
delete `_to_delete/`.

2 · Startup — the phone half (#913 → #917)
The container closed the WebView-leg question it could answer: DCL and `load` are 4 ms apart, the flag
probe is off the boot path on a phone, and the measured `load` delta on the shipped shell is −13/−20 ms
at ×4 (small; `docs/sheets/session-ac/perf-ab-load.txt`). What is still owed is the PHONE's split of the
1.21 s (root page → home shell): the dev-HUD `rdy` mark, the Release STARTDIAG line, and Windows'
`copyResources: 0 copied, 51 unchanged`. Ask for them; do not build on the container number (#294).
If `rdy` says WebView creation is the bulk, the levers are #800's pre-warm shape (a home WebView created
while the node constructs — lifecycle, check with BE) or nothing; if the shell load is the bulk, the
next candidate is the 273 KB inline CSS + 264 KB main script (a split document), measured before built.

3 · THE OFFICE DAY (iPhone) — Damir, with `docs/walk-artifact-ios-office.html` (31 rows)
Order: the four portal steps (#915) → the first compile (three app files + `Spixi-PushService/`) →
iO.7 the mute test (the one question no document answers: NOTHING or a BLANK row) → iO.11/iO.11b
(the by-sender mute DIAL — a muted contact is silent in groups too, a muted group is not silent; per-
chat needs the group id in the payload = server-side) → iOS-43/44/55 → every screen → landscape →
OPTIONAL route B last (#920): the Mac Catalyst boot per
`Spixi/Platforms/MacCatalyst/NativeLibraries/README.md` — make the stamped dylib first (the TFM no
longer restores the package; the README has the download line), Debug needs one slice, Release needs
both `lipo`'d; ⚠ the July stamp never reached `dlopen`, the first run is that test; a compile error
INSIDE `RocksDbSharp/` is a vendoring finding, anywhere else the app's. Never before the iPhone walk.
When the office results come back: findings → rows, the extension's first-compile errors are Session
AC's bugs, and iO.7's answer decides whether the server-side mute becomes a cutover row.

4 · Owed loop
None from Session AC — the r2 reviewer (Opus) over its fixes ran CLEAN (0 MAJOR, #921). The next #46
loop is over whatever the office day produces (first-compile errors, iO.7's answer, findings).

5 · Still open, unchanged (do not re-derive)
 · the Android memory kill (511 MB, Release: `dumpsys meminfo`, `SpixiContentPage.Dispose()`,
   `CHAT_SPARE_ENABLED = false` as the free discriminator)
 · the 123 naive comment-strip regexes + 26 local strippers (Session R's list)
 · `docs/diagnostic-session-aa-findings.md` (AA.8 did not reproduce; still armed)
 · the translator pass (M13) · counsel on the privacy policy (#914) · the ASD-STE100 rule unconfirmed
 · DEFERRED past the testing build, none ours to start: CORE-10 → CORE-9 → L8 → the Windows data folder
   out of Documents/OneDrive → CORE-11 → #908 (disappearing messages)
 · Still Damir's: the Z.10 chooser copy · S1 timed (#872 ②) · AND-40 · the #890 dials · AC.11/AC.18 ·
   the BE cutover · the #232/#523 money-path review.

6 · AFTER THE OFFICE — the endgame, in this order (#916; do not start it before the office):
freeze (#825's two blockers: `maxLogCount 5 → 1`, retire the diagnostic probes [CDPERF]/[STARTDIAG]/
[PAINTDIAG]/[LOCKDIAG]/[SCROLL]/the dev-coexist symbol) → the sweep (`docs/audit-refactor-plan.md`
phases 1–4, deliverables only; phase 6 one item at a time on Damir's word) → the strip (shells:
`strip-release.mjs` + both gates exist; C#: a NEW one-time `strip-cs-comments` step with its own
`--check`, on the MERGE branch only — the docblocks are the audit trail the pins cite, and a pin that
quotes a comment goes red) → the introduced-vs-inherited gate re-run over the final delta (Session R:
27 rows open) → merge → TestFlight (`aps-environment production`, the IsPublish group, the extension's
distribution profile).

Rules #215 · #294 · #660 · #663 · #771 · #798 · #811 · #882 ③ · #894 · #902 · #903 · #906 · #911 · #912 ·
★ #917: a profile's self time is not the boot's delta — measure the thing you claim, twice ·
★ #918: a height-only media query is not a landscape query (portrait + keyboard is under 500 px) ·
★ #922/#923: the viewport is not the device — a landscape phone WAS two-pane (the home column read portrait);
  a posture rule reads `screen.orientation` / the display's short side, and the two constants are pinned equal ·
★ #920: a fixed line count in a pin breaks when the thing grows — derive it; an XML comment defeats a
  raw sweep exactly as a JS comment does; "stamped" and "proven to load" are different claims ·
★ #919: state the dial you could not build, in the row, the spec and the walk — not at the office.
