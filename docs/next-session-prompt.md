Next session — Session AB is committed; the startup lever is the WebView leg, walk AB.5, then the landscape round

0 · Before anything else (#215)
Read `docs/handoff-2026-09-22.md`, then DECISIONS #911–#912 (and #902–#910 if the loop or the delete
thread comes up). Check `device_bash`; use `git --no-optional-locks status`. Run the four `--check`
gates on the real tree. CHECK DECISIONS before accepting any "owed" row from this prompt (#660). The
FULL suite runs in the container on a SNAPSHOT COPY (handoff §5), BEFORE and AFTER — predicted is not
an acceptable last line. Reviews run on Opus — pin the model explicitly. A file edited directly on the
VM must be staged back before the next tar lands (handoff §5).

1 · Item 0 — Session AB is walked (15 P · 0 F · 2 N) and COMMITTED as `bef1be21`
Verify with `git --no-optional-locks log -1`. Three doc files were edited AFTER that commit (#913:
DECISIONS, the handoff, this prompt) — they ride the next commit. Archive
`docs/commit-message-session-ab.txt` and `docs/f5-checklist-session-ab.md` (consumed). `App.xaml.cs`
compiled on Windows + Android; `AppDelegate.cs` (#912 ②) still waits for an iOS build.
Local smoke should read 4776 (container 4774 + the two M1 gates when Ixian-Core sits beside the repo).

2 · Startup — the numbers are in (#913); the lever is the WebView leg, NOT the node
Relaunch on Android Debug: logger up +609 · node +700 · wallet +958 · root page +1244 · home shell
loaded +2455 ms. The node boot is 91 ms — do NOT plan the off-thread boot. The leg to work on is
root page set → home shell loaded = 1.21 s (WebView cold spin-up + the 543 KB home shell to `load`),
which a Release build will not shrink. Steps, in order, none blind (#294):
 · Ask Damir for the dev-HUD `rdy` mark (10 taps on the chats logotype, restart): it is ms from
   document start to the ready verb, so it splits the 1.21 s into WebView spin-up vs shell load.
 · If `rdy` is the bulk: `signalReady` fires on window `load`, which waits for fonts and
   illustrations (#177 — the ready verb's timing is a CONTRACT with C#'s first flush; read #177
   before moving it). Measure DOMContentLoaded vs load on the built shell first (jsdom or Playwright
   on `Spixi/Resources/Raw/html/index.html`), then decide between: ready at DOMContentLoaded + first
   paint; deferring the 105 KB flag font past first paint; slimming the first document.
 · If the WebView spin-up is the bulk: it is the platform's; the only lever is warming it earlier
   (a WebView created while the node constructs) — check with BE, it touches lifecycle.
 · Ask for the Release numbers too (checklist §1 command) so the projection (~1.8–2.0 s) is a fact.
Windows second launch must read `copyResources: 0 copied, 51 unchanged` (#912 ③) — ask.

3 · Walk AB.5 (the one starred row with no device result)
Wallet tab → Account → Contacts → a contact → Message → close Contacts → tap a transaction → its back
arrow → expected: EMPTY pane, not the chat (#902 helper; pin green, device unheard). Ten seconds.

4 · Build — the landscape round (AND-31 / AND-32 / AND-33 / AND-34)
Unchanged from the last prompt: RENDER FIRST on the built shells at a landscape phone viewport,
subject asserted before each shot (#811/#893), fix what the renders show, then the phone.
 · AND-31 wallet: the hero eats the height · AND-32 apps: the sticky Explore banner
 · AND-33 tx details: cut off, no scroll · AND-34 chat appearance: the preview squeezes
⚠ AND-36 (rotation leaves a row highlighted) is verify-first; #897/#902 may have moved it.

5 · Then
 · Damir's rulings on the THREE privacy wordings (`docs/legal/proposed-amendments-2026-09-19.md`) →
   rebake → counsel.
 · An iPhone build: it compiles `AppDelegate.excludeHistoryFromBackup` for the first time (#912 ②),
   and there has been no iOS walk since ~2026-08-27.
 · APP-1 restore test on a second phone (owed, not blocking).
 · DEFERRED past the testing build, in this order, none ours to start: CORE-10 (authorship check on
   delete, rule proposed) → CORE-9 (real deletion) → L8 (wallet password → SecureStorage) → the Windows
   data folder out of Documents/OneDrive (ours, but moves the wallet) → CORE-11 (history at rest) →
   #908 (disappearing messages).
 · Still open and his: the Z.10 chooser copy · S1 timed (#872 ②) · AND-40 · the #890 dials · the
   translator pass · the freeze (#825) · the BE cutover · the #232/#523 money-path review.
 · `docs/diagnostic-session-aa-findings.md` is still LIVE.

Rules #215 · #294 · #660 · #663 · #771 · #798 · #811 · #882 ③ · #894 · #902 · #903 · #906 ·
★ #911: a walk closes hypotheses in both directions; "can't do X" from a walk is a finding to READ
  before it is a row to fix ·
★ #912: measure before moving a boot off a thread; a backup exclusion is a security dial with a
  restore-side cost — the wallet stays in, and that is written down.
