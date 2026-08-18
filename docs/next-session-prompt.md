★ THIS IS AN OVERNIGHT, UNATTENDED, CLOUD-ONLY SESSION. My computer is OFF. Do not
call any device tool (device_bash, device_stage_files, device_commit_files,
device_list_dir) - they will fail. Do not ask me questions; I am not there. Where a
choice is genuinely mine, pick the reasonable option, STATE the assumption in the
handoff, and carry on. Deliver everything with SendUserFile (a tarball) - that
reaches me on my phone and survives my laptop being closed.

SETUP - get the code yourself, both repos clone anonymously (verified 2026-08-18):

  git clone --branch redesign/frontend https://github.com/Rexoflex/Spixi.git
  git clone https://github.com/ixian-platform/Ixian-Core.git      # HEAD = 097341a

Clone Ixian-Core as a SIBLING of the Spixi folder (Spixi.csproj imports
..\..\Ixian-Core\IXICore.projitems). You will not compile C# - there is no MAUI
workload here - so Core is for READING (the group/wallet/friend logic lives there
and is the source of truth for anything I ask about behaviour).

VERIFY BEFORE YOU BUILD ANYTHING, and STOP with a one-paragraph answer if it fails:
- Spixi/Meta/Config.cs reads "spixi-0.9.22";
- the head commit CONTAINS the launch-flow round: Spixi/Pages/Launch/LaunchPage.xaml.cs
  is the merged page (it holds onCreateAccount AND onRestore AND proceed), and
  LaunchCreatePage / LaunchRestorePage / LaunchRetryPage / OnboardPage are GONE;
- scripts/build-shells.mjs emits ONE launch output (intro.html), 18 shells total.
If the head does not contain that batch, I failed to push - say so and stop.

Then: npm install jsdom --no-save, and read docs/handoff-2026-08-19e.md FIRST.

★ #380 BUDGET MODE IS LIFTED FOR THIS RUN ONLY - this is a big batch and I want it
done properly, not cheaply. What is NOT lifted: verify every plan at source before
building it (#215), never build past a missing repro (#294), mutation-prove new
pins, one DECISIONS row per decision at the time it is made, the security-handover
gate while building, and bundle BEFORE shells. Smoke stays a bookend: baseline once
(expect 1992 / the 4 known pre-existers) and final once (state the number). You may
run ONE #46 audit loop at the end with up to three disjoint read-only auditors plus
a break-my-verdict reviewer - that is the standard for a batch this size.

ORDER MATTERS. Build in this order and treat each part as independently shippable,
so if you run long I still get everything before the cut. If a part balloons, STOP
at a triage doc and move to the next one - do not half-build.

PART A - THE #391 F5 FIXES (DECISIONS #395)

F-1 backup nudge fires on an UNACCEPTED contact - ROOT CAUSE FOUND, just fix it.
Friend.approved DEFAULTS TO TRUE (Ixian-Core Streaming/Friends/Friend.cs:196, ctor
:233) and every outgoing request adds the friend without passing it
(HomePage.joinBot:1378, ContactNewPage:195, SingleChatPage:1426,
SpixiContentPage:2389), so the #393 MAJOR-3 guard is dead code. Use
friend.state == FriendState.Approved, keep !pendingDeletion / !bot / the balance
leg, and re-pin the smoke on the STATE.

F-2 hardware back exits the app from the create/restore view. The view switch and
the topbar Back both work, so C#'s currentView is wrong. DO NOT GUESS: add one log
line in LaunchPage.onNavigating naming every verb it receives (the N65
instrumentation precedent) so one F5 answers it. Then make it structural - the
component must report EVERY view change from ONE place, inside show() in
launch-shell.js, instead of only from the two CTA hooks.

F-3 restore = fatal exception. DEFERRED BY ME - DO NOT TOUCH IT. It rides the
delete-account / delete-wallet batch (N67). Suspects are already recorded in
handoff section 2; do not re-derive them, do not "just look".

F-4 the status bar stays dark after unlocking - ROOT CAUSE FOUND. #393 put
repaintSystemBars in closeOverlay, but the resume lock closes through
closeModalOverlay (SpixiContentPage.cs:647, from LockPage.performUnlock:165 and
:119), and the non-confirm path ends in InsertPageBefore + removePage
(LockPage.xaml.cs:177) with no navigation. Repaint at both lock-close sites. ALSO
FIX THE PIN - it counted two call sites in the wrong method and passed.

F-5 empty states pop in ~1s late on every screen after a restart. Triage first.
Prime suspect is the zero-state load-window gate (chats-shell.js:164, zeroReady ===
false returns null), possibly just newly visible now that I test empty accounts.
Answer "does the gate open late, or does the burst arrive late" before touching it.

PART B - ITEM 6, DECIDED, BUILD IT (small). The join-community CTA keeps its place
in the chat-list empty state AND gains a permanent row in How to use, so a user who
adds one ordinary contact does not lose the door. No dismissible chat row.
★ Verified shape, do not rediscover: createSettingsHowTo is
src/components/settings-app.js:553, rendered by src/shells/settings.html:1039, host
SettingsPage - and SettingsPage does NOT handle ixian:joinBot (zero hits; only
HomePage:788 -> its private joinBot():1376-1391). Add the action row and make the
join a SHARED STATIC both pages call (the BackupPage.backupAccount() precedent,
#243). No second verb, no duplicated addFriend, still opt-in.

PART C - THE FULL-BLEED ROUND (AND-7, DECISIONS #396). This is the one I care most
about. I want no strip at all: the launch gradient and the WALLET HERO (the balance
area) must reach the top of the screen. Already triaged in
docs/android-findings.md:47 - MainActivity's InsetsListener pads the root view top
by sysInsets.Top while SetDecorFitsSystemWindows(false) already draws edge-to-edge,
so the fix is to stop padding the top and feed the real top inset to the shells as
a CSS variable (Android env(safe-area-inset-top) is cutout-only, which is why the
iOS #282 chrome reads 0 there). Scope: launch gradient, wallet hero, every shell
topbar, and the bottom inset while you are in there.
★ I cannot measure for you tonight, so SHIP THE MEASUREMENT: put the real
sysInsets.Top and what env() reports into the on-screen dev/debug surface (the #304
probe precedent) so my first F5 confirms or kills the numbers in one look. Keep the
#391 strip colours as the pre-paint frame - they stop being the mechanism.

PART D - THREE SMALL ONES FROM THE MASTER LIST, all already triaged at source:
- N63: the English-fallback tail in the 7 older locales (de/fr/es/pt/ru/sl/sr) -
  10 named keys incl. showOlderMessages, unreadElsewhere, paidMessage, noPeople,
  noGroups, launchInvite, groupSelectedCount, tipNoAnswer, appUrlPlaceholder.
  Mechanical: draft them, rebuild locales, and let verify-locales + the overflow
  audit prove it. Flag anything you are not confident about for native review.
- N70: the update notice never appears when the app STARTED OFFLINE - UpdateVerify
  runs at start then hourly (Config.cs:47). Re-arm the check on the offline->online
  transition; the connectivity arm in HomePage.updateScreen already sees that edge.
- N44: spinner-on-button while create/restore work (setLoading already exists) -
  it lands in the launch flow you are already inside for Part A.

PART E - N64 ①, THE UPDATE-NOTICE SCOPE BUG ONLY. homeBanner mounts into
#chats-banner, which sits inside #chats-view, and .view[hidden]{display:none} - so
an app-level notice is invisible on Wallet and Apps while the less-global
connectivity state reaches all three tab titles. Fix the SCOPE. Leave the other
three N64 design problems alone - those need my eye.

PART F - ONLY IF EVERYTHING ABOVE IS BUILT, GREEN AND REVIEWED: N71, the theme
push-vs-reload round (the biggest open red, root-caused in handoff 19c section 2 -
the revived OS-flip path RELOADS where the working explicit-pick path PUSHES, and
settings.html has no setTheme handler at all, along with eleven other shells).
If you reach it with real time left, take it. If not, leave it completely - a
half-done theme round is worse than none, and I would rather have Parts A-E clean.
Do NOT start it if Parts A-E are not finished.

NOT THIS SESSION, at all: N57 (Core-side, my protocol run) - N67 delete-account /
delete-wallet (needs the delete->restore error reproduced on a device first, and
F-3 rides it) - N68 (needs logcat) - N60/N61 (inherited, device) - N63's siblings
in R3/R5/R6/R8/R9 - anything in the deferred pile.

DELIVERABLES, all through SendUserFile as ONE tarball at the end (plus an earlier
one if you finish Parts A-C well before the rest, so I have something either way):
- source + docs only, never node_modules, and tell me which generated files I must
  rebuild myself;
- an updated handoff that supersedes 19e, and a next-session prompt;
- ONE F5 checklist covering only the legs you touched, with the exact build and git
  commands (I wipe obj/bin and I commit);
- DECISIONS rows written AS you decide, not summarised at the end;
- a short "what I could not verify without a device" list - I would rather have an
  honest gap than a confident guess.

★ REMEMBER #395: a smoke pin can PASS and still prove nothing - F-4 shipped because
its pin asserted the fix EXISTED rather than that it ran on the path the bug takes.
Pin the site the behaviour goes through, and mutation-prove it.
★ REMEMBER #387: a red row can be a DIRTY BUILD - but you cannot rebuild tonight,
so where that is the likely explanation, SAY SO instead of coding around it.
