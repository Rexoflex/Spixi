Next session — commit Session AB, read the startup numbers, walk AB.5, then the landscape round

0 · Before anything else (#215)
Read `docs/handoff-2026-09-22.md`, then DECISIONS #911–#912 (and #902–#910 if the loop or the delete
thread comes up). Check `device_bash`; use `git --no-optional-locks status`. Run the four `--check`
gates on the real tree. CHECK DECISIONS before accepting any "owed" row from this prompt (#660). The
FULL suite runs in the container on a SNAPSHOT COPY (handoff §5), BEFORE and AFTER — predicted is not
an acceptable last line. Reviews run on Opus — pin the model explicitly. A file edited directly on the
VM must be staged back before the next tar lands (handoff §5).

1 · Item 0 — Session AB is walked (15 P · 0 F · 2 N) and UNCOMMITTED
If Damir has committed: verify with `git log -1`, then archive `docs/commit-message-session-ab.txt`
and `docs/f5-checklist-session-ab.md`. If not: #912 (four small app-side fixes) landed AFTER the walk
and needs ONE more F5 + Android build — checklist §1b. `App.xaml.cs` and `AppDelegate.cs` have not
been compiled; a compile error there is item 0 and it is this session's bug.
Local smoke should read 4776 (container 4774 + the two M1 gates when Ixian-Core sits beside the repo).

2 · Read the [STARTDIAG] numbers (#912 ④) before touching startup
Damir was asked to paste five `[STARTDIAG] … at +N ms` lines from a cold launch (Debug, and the
Release build the checklist names). Write them into a DECISIONS row FIRST. Then, and only then:
 · "node constructed" is the bulk → plan the node boot off the UI thread WITH BE: grep every page
   that touches `Node.Instance` / `IxianHandler` before HomePage is up; the retry/lock/launch roots
   assume a node. Do not build it blind (#294).
 · "home shell loaded" is the bulk → the WebView + the 540 KB home shell; ours.
 · Release is already ~1.5 s or under → it was the Debug build. Record that and STOP.
Windows second launch must read `copyResources: 0 copied, 51 unchanged` (#912 ③).

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
