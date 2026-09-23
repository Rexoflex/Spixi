Next session — Session AC is built (startup lever · landscape + the Android landscape rail · the iOS extension written · route B prepared) and awaits Damir's walk + commit; the office iPhone day is next; the endgame after it

0 · Before anything else (#215)
Read `docs/handoff-2026-09-22b.md`, then DECISIONS #916–#926. Check `device_bash`; use
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

2 · Startup — the numbers are in (#913 → #917 → #925)
Release Android: logger 102 · node 216 · wallet 384 · root page 532 · home shell 1973 ms. Windows: 131 · 276 ·
374 · 491 · 1960. The WebView leg (root page → home shell) is ~1.45 s on BOTH and does not shrink in Release;
the shell's own boot is 380 ms (`rdy`) and a WARM WebView parses a same-size document in 81 ms (#800's chat
spare, same log). So ~1 s is the first WebView of the process initialising, serialised after a 0.5 s native
boot. The lever is parallelism — the #800 shape on the FIRST WebView (created at process start beside the
node boot) — and it is a DESIGN step first: the lifecycle of a WebView that exists before the root page, on
Android and WinUI, with BE. Not a lighter document, not a comment strip (#294: the parse is 80 ms warm).
Measure the same five lines after.

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
None from Session AC — #921 (over #917–#920) and #926 (over #922–#924, 3 MAJOR fixed, r2 holds) both
ran on Opus. The next #46 loop is over whatever the office day produces (first-compile errors, iO.7's answer, findings).

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
