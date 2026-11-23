<#
adb-walk.ps1 - device timing walk of the Spixi Dev app on ONE Android phone over adb.

Usage:
  powershell -ExecutionPolicy Bypass -File scripts\device\adb-walk.ps1 [-Calibrate] [-Steps coldstart,scroll]
             [-Repeats 5] [-Serial <id>] [-Apk <path>] [-KillRenderer]
             [-Flags warmidle=<0|1>,sparerearm=<0|1>,sparekeep=<0|1>,noemptydetail=<0|1>] [-SeedIndex 0,50,51,52,55] [-HistorySeed 55]
  The cold start watch (opt-in, batch walktools2): -Steps coldstart-watch -Repeats 50

Walk: pre-flight, then each step x Repeats (one screenshot + one DOTNET log pull per rep), run.json after
every rep, then adb-walk-parse.ps1 -RunDir <run folder>; the exit code is the parser's.
-Flags (batch perfb1toggle; the developer build, Developer mode ON): sets the four developer switches of speed batch 1a
  before the first step. Exactly the four names in this order, each 0 or 1, no space (51 characters); anything else, or
  -Flags with -Calibrate, is a usage error before any adb command. After the pre-flight: am force-stop, logcat -c, ONE start with the
  string extra perfb1flags (the app stores the four preferences and logs one fixed line; they act at the NEXT start), a
  count of that line on the phone (30 s), a 2 s wait, am force-stop, logcat -c, a cold start (am start -W), a count of the app's own
  state line [FLAGS] warmidle=.. sparerearm=.. sparekeep=.. noemptydetail=.. (45 s), ONE filtered log pull
  (android-walk-flags-00.txt), and the state read back from that file is compared with the asked state. Equal: the
  steps run. The state is proven for ONE app process: every coldstart rep must show its own state line (none = stop,
  no-state-line), every other pull and memory phase must come from that process, and a restart inside the run (a tab
  rep reset) ends the run (unproven-process). Different, no stored line in time, no state line, or a failed start / pull: the run STOPS (a reason on the
  console and in walk.log, run.json flags.stop, exit 1), NO step runs and no number row is written. A coldstart rep
  whose pulled log shows a different state line ends the run the same way (that rep is recorded as an error). Without -Flags no
  extra is sent and no extra start is made. run.json always has a flags object (asked, logged, ok); the parser names
  the state in summary.md and exits 4 when any pulled log holds a state line that differs from the asked one; in a
  run whose asked state is not proven or differs the parser writes NO number (every metric row is "no data").
Steps (default order; the walk-steps-2 steps run after the old ones so the old rows keep their meaning):
  coldstart, mem-home, chat-intent, chat-tap, scroll, resume, resume-long, network, mem-end, mem-trim,
  resume-now, resume-3s (60 s in the background, then the chat tap at once / after 3 s; resume = after 2 s),
  chatinfo (tap on the chat header of seed chat k-1), tab-apps, tab-wallet, tab-account (tap on the tab, then
  Chats), history (seed chat k+4, swipes to older until 3 older pages were asked for; with -HistorySeed: see below).
  scroll-image runs only when named in -Steps: it needs imageChatAddress in walk.local.json. imageChatAddress must be
  the address of a dev-seed chat (Spixi/Utils/SDevSeed.cs), never a real contact; scroll-image keeps no screenshot.
  Batch filewalk - five more opt-in steps, only when named in -Steps, run after scroll-image in this order:
  scroll-files, scroll-voice, scroll-photos (per rep: logcat -c, stamp + the fa intent of the chat of fileChatAddress /
    voiceChatAddress / photoChatAddress = the file seed chats Seed 54 / 55 / 56 (t0), chatSettleMs, the chat check, a
    second stamp (stamp2 in run.json) + swipe chatOlder, swipe chatNewer, a wait (at most 4 s) until two shell scroll
    lines more than before stamp2 are in the log (the open writes its own), the log pull, BACK; a failed chat check sends no swipe and no BACK) - viewer (the chat of
    imageChatAddress = Seed 51, 52 or 53 is opened once; per rep: the chat check,
    logcat -c, stamp + tap taps.photoTile (t0), a gate on the app's own lines (shell send viewimage exactly once and
    shell frames-overlay-open, 6 s), the viewer check (screens.viewer), stamp2 + BACK, a wait (at most 4 s) for the
    frames-overlay-close line, the log pull; a failed gate or check sends no more input in that rep, a foreign window
    (the OS chooser of a tap before the thumbnail) gets none and the app is restarted, the next rep opens the chat
    again) - downloads (from Chats: the home check, the tap on
    tabAccount with the tab-account gates, a focus check, ONE swipe swipes.accountDownloads (batch fixb3: the Downloads row is
    below the first screen of the Account hub; the swipe is a fling that ends at the bottom of the hub, so its end does not
    depend on its speed), scrollSettleMs, the check of the scrolled hub (screens.accountScrolled; its PNG is deleted at once
    in a finally, never kept; a failed check sends NO tap), logcat -c, stamp + tap taps.accountDownloads (t0), a gate (shell send
    loaddownloads exactly once and shell frames-subscreen-open, 6 s), the Downloads check (screens.downloads), stamp2 +
    swipe chatNewer FIRST (the list opens at the top), then swipe chatOlder, the wait for two shell scroll lines, the log pull, BACK with the
    frames-subscreen-close gate, the tap on tabChats with its gates; from the tabAccount tap command on, any failure
    restarts the app at once: no second input on Account).
  Every restart of these steps is PROVEN (the app pid read before the rep's first tap, one different pid after, our app
  in front, then a home check whose PNG is deleted; an unread pid = not proven, no screenshot); a
  proven restart sends no recovery BACK, a restart that is not proven stops the run (no further input).
  The local keys are masked like a seed and must equal the address that the script derives for the seed (addressFor of
  Spixi/Utils/SDevSeed.cs): fileChatAddress = Seed 54, voiceChatAddress = Seed 55, photoChatAddress = Seed 56; for viewer
  imageChatAddress must be Seed 51, 52 or 53 (scroll-image keeps its old check). A missing, invalid or other key, or a missing map key
  (taps.photoTile, screens.viewer, screens.downloads: absent until the calibrate run of the operator block; for downloads
  also swipes.accountDownloads and screens.accountScrolled, batch fixb3, absent until the first calibrate of that batch; the gap
  list of downloads names all four: swipe:accountDownloads, screen:accountScrolled, tap:accountDownloads, screen:downloads),
  makes every rep of that step skipped ("no data", exit 2) with no command sent. No PNG of these
  steps is kept: the checks (also those before the input) photograph our app's screen for the probes, then the PNG is
  deleted (in a finally; a sweep at the end of each step and of the run deletes any shot-<step>-*.png left). The only
  picture of the Account hub is the check of the scrolled hub of downloads (screens.accountScrolled), for its probes
  only, deleted at once (DECISIONS #1739 (3) asks for it; it replaces the old rule "never photograph the Account screen").
  The tap on Downloads follows ONE fixed swipe, so it is safe only when the probes of screens.accountScrolled pin the scroll
  position: at least one probe ON the Downloads row (its icon) at the y of taps.accountDownloads, at least one on a row edge,
  and minMatch = the number of probes. The script refuses (a usage error before any adb command) when both keys are set and no
  probe has a y within 60 px of taps.accountDownloads, or minMatch is less than the number of probes. LIMIT: that rule cannot
  see a fling that stops short by a whole row (the rows of the hub repeat, so a one-row offset passes it). Text only, not enforced
  by the script: put ONE more probe on a feature that does not repeat (the end of the hub or its last row). An invalid
  screens.accountScrolled (present, but a bad probe or minMatch) is a usage error before any adb command; only an absent key
  keeps the calibrate picture cal-17s.
  "send" and "live" are not steps (questions for Damir: DECISIONS #1669, #1670).
  Batch photo1a - two more opt-in steps, only when named in -Steps, run after downloads in this order:
  open-seed (needs -SeedIndex: 1 to 8 whole numbers 0..55 = the dev-seed index, 0 = Seed 01, 50 = Seed 51, 55 = Seed 56; a
    comma list, no repeat; anything else is a usage error before any adb command; without -SeedIndex the step is a gap, "no
    data", no input). Per index k: a PROVEN restart (the pid read before, am force-stop, am start -W, one different pid
    after, our app in front, a home check whose PNG is deleted; not proven = the run halts, no further input), the settle of
    that restart (coldStartSettleSec), then ONE cold rep and then -Repeats warm reps; each rep: logcat -c, stamp + the fa
    intent with the address that THIS script derives for index k (Get-DevSeedAddress: never read from a file, never typed;
    walk.local.json gets no new key; masked as <seed-index k>) (t0), chatSettleMs, the chat check (PNG deleted), a wait (at most
    4 s, a count only) for the app's "[P1] chat media" line, the log pull, BACK. A failed rep (from the intent on) restarts
    the app and proves the restart before anything else is sent (fail closed); the next recorded rep of that index then
    follows ONE unrecorded warm-up open (same intent, chat check, BACK; no log pull, no row), so a new process is never
    counted as a warm open; a failed warm-up = the proven restart again and the rest of that index is skipped. A build without the new lines gives the
    old rows only (the new rows say n/a). -Flags cannot be combined with open-seed (every index restarts the app: the
    switch state of the new process would not be proven). The steps keep the AllSteps order whatever the order in
    -Steps: coldstart, mem-home, chat-intent, ..., mem-end, ..., scroll-files, scroll-voice, scroll-photos, viewer,
    downloads, open-seed, mem-photos.
  Batch fixb3 - -HistorySeed <k> (ONE whole number 0..55 = the dev-seed index, as -SeedIndex: 55 = Seed 56, the photo chat with
  100 messages and ONE older page): the step history runs as the step history-seed-kNN (NN = k, two digits) instead of history.
  Usage error before any adb command: with -Flags, with -Calibrate, without history named in -Steps, with a value that is not
  exactly one whole number 0..55 ("5,6", "56", "-1", text). Per rep: a PROVEN restart first (the pid read before, am force-stop,
  am start -W, one different pid after, our app in front, a home check whose PNG is deleted; not proven = the run halts, no
  further input), logcat -c, the fa intent with the address that THIS script derives for k (Get-DevSeedAddress: never read from
  a file, never typed; masked as <seed-index k>), chatSettleMs, the chat check, then swipes historyOlder until ONE page request
  is counted (the count of "shell send loadmore" lines) or historyMaxSwipes (t0 = the first swipe, as history), the settle, the
  chat check, the log pull, BACK. No page request after historyMaxSwipes = the rep is "no data" with a note (a chat with no older
  page cannot measure it). run.json gets the integer historySeed; the parser gives history-seed-kNN the rows of history, with
  the page rows for the first page (older pages loaded, first swipe -> 1st page). Without -HistorySeed history and every old
  step send the same commands and give a byte-identical summary.csv.
  mem-photos (the app + renderer PSS, the shape of mem-end, files meminfo-photos-app.txt / -renderer.txt): runs LAST of the
  photo1a steps (only the opt-in coldstart-watch of batch walktools2 comes after it).
  New steps take a screenshot before the input too (shot-<step>-NN-pre.png): no input when that check fails
  (except resume-now, resume-3s and scroll-image: a focus check only, as the old resume). A pre-check PNG that fails is
  deleted. The tab steps wait for the app's own frames log lines (a count only): the first tab tap is gated by the
  pre-check; the Chats tap by the tab's frames line (and for Account the SettingsPage line); the screenshot by the Chats
  frames line (and for Account the SettingsPage close line). It is taken on Chats only and is deleted when its home
  check fails: Wallet and Account data stay out of files. A tab rep that fails after its tab tap, or whose home check
  fails, restarts the app (force-stop, am start -W: a cold start lands on Chats) so no later step meets Wallet or
  Account; the same restart follows a failed cal-11. resume-now and resume-3s also delete a chat PNG that fails its check.
-Calibrate: pre-flight, device.txt, cal-*.png, tries.txt (renderer lookup), calibrate.json (no numbers); exit 0.
            It also tries each tap point of the new steps once (cal-08..13; no screenshot on Apps, Wallet, Account;
            cal-11 and cal-12 use the same frames-line gates and screen checks; a cal-11, cal-12 or cal-13 PNG that is not
            the expected screen is deleted; when cal-11 failed or was not confirmed, cal-12..13 are skipped).
            Batch filewalk (nothing at all after a failed cal-11): cal-14 (the image chat, no tap, so the photoTile
            point can be read; deleted when it is not the chat screen) whenever imageChatAddress is an image seed and
            screens.chat exists; only with taps.photoTile: cal-15 (the viewer with a dev-seed photo, only after its gate
            passed; a failed gate sends no BACK), then cal-16 (home); with tabAccount and tabChats (batch fixb3: no
            longer only with taps.accountDownloads): cal-17a (a fresh home check right before the tabAccount tap), cal-17s
            (below), cal-17 (the Downloads list, only after its gate passed; no PNG of the Account hub but cal-17s; it shows
            the newest downloads: take it right after "Remove the seed, then Seed"), cal-18 (home). A cal-15 or cal-17 PNG is kept while its screen is not
            calibrated and deleted when it fails its probes; a failure after an Account tap, or a foreign window after
            the photo tap, restarts the app and the restart is proven (not proven: no further input).
            Batch fixb3: the Downloads steps need no taps.accountDownloads to start: after cal-17a and the tabAccount tap (and its
            gates) ONE swipe (swipes.accountDownloads of the map when valid, else the fixed calibrate default
            $script:CalHubSwipe = input swipe 540 2000 540 400 150, printed in calibrate.json and walk.log: a fling over 1600 px
            that ends at the bottom of a hub about 1300 CSS px tall), scrollSettleMs, cal-17s (the scrolled hub: the one Account
            picture the calibrate keeps, ONLY while screens.accountScrolled is not set; once that key is set cal-17s is deleted at
            once, after a pass ("confirmed, not kept") and after a fail). ONLY when screens.accountScrolled passes AND
            taps.accountDownloads is set: the tap, cal-17 and cal-18 as above; otherwise the way back without the tap (tabChats, the
            two frames lines, cal-18). A failure after the Account tap restarts the app, proven. So the FIRST calibrate gives the
            keys to read from cal-17s (taps.accountDownloads, screens.accountScrolled, and the swipe if the default is changed) and a
            SECOND calibrate (the proof run) gives screens.downloads (cal-17); the second calibrate keeps no cal-17s once the
            screen key is set (to read the Downloads point again, make a calibrate run with screens.accountScrolled removed from
            a52s.json, or use the picture of the first calibrate). The probes of screens.accountScrolled must pin the scroll
            position, because the tap follows ONE fixed swipe: at least one probe ON the Downloads row (its icon) at the y of
            taps.accountDownloads, at least one on a row edge, and minMatch = the number of probes (the script refuses a map with
            both keys set where no probe is within 60 px of that y or minMatch is lower, before any adb command). That rule cannot
            see a fling that stops short by a whole row (the rows repeat): also put ONE probe on a feature that does not repeat, the
            end of the hub or its last row (text only, not enforced). Once screens.accountScrolled is set, cal-17s is deleted even
            after an error (a finally; the sweep of the run deletes it too); only an absent key keeps it.
Batch walktools (item 2) - the screen map has a second form, ONLY for screens.chat and screens.viewer. A screen of a52s.json is
  EITHER { "probes": [ {x, y, rgb, tol}, ... ], "minMatch": n }   (today's form, every screen; unchanged)
  OR     { "sets": [ { "name": "light" | "dark", "probes": [ ... ], "minMatch": n }, ... ] }   (chat and viewer only)
  The chat and the viewer are drawn with the chat appearance (the colour of the sent bubble, the ground) and in a light or a dark
  theme, so one list of probes cannot fit every appearance: put the probes on the parts that do NOT follow the appearance (the pill
  of the composer, the top bar, the close button of the viewer) and give one set per theme. 1 or 2 sets (the names are unique and one
  of light, dark); every set follows the rules of the old form (1 to 16 probes, each with x, y, rgb "#RRGGBB" and tol 0..255, on the
  screen, not the placeholder, minMatch 1..the number of ITS probes). A key that holds both forms (sets and probes or minMatch) is
  invalid (the screen is a gap: "no data"); sets on any other screen is a usage error before any adb command (accountScrolled keeps
  its own rule and its own old form); "sets" must be a list (null or an object is invalid: "screens.<name>.sets must be a list of 1 or 2
  sets"). A screen passes when AT LEAST ONE set passes. The calibrate names the set that passed in calibrate.json (probes: "ok (set
  light)", sets: one line per set with its counts, probeDetail: every probe with the set it belongs to); the rep notes of a walk do NOT
  name the passing set (a rep note is cut at 120 characters), and when none passes the note is "no set matches: light 2/4 (4), dark
  0/4 (4)" (every set: probes matched / probes in the set, then its minMatch in brackets; a pre-check says "<screen> check failed: light 2/4
  (4), dark 0/4 (4)"). Example, the chat: { "sets": [ { "name": "light", "probes": [ pill, pill, pill, Aa ], "minMatch": 4 }, { "name":
  "dark", "probes": [ pill, pill, pill, Aa ], "minMatch": 4 } ] }. The chat set holds THREE probes inside the pill of the
  composer AND ONE probe on the "Aa" glyph of the message field: the glyph is a chat-only chrome feature, the pill alone is a white strip
  that a settings or Downloads card could match. The viewer is calibrated only AFTER the chat check passes (cal-14 must confirm the chat,
  then cal-15 taps the photo), so the chat sets must be in the map BEFORE the calibrate that reads the viewer. No new step, no new adb
  command, no typed input: only the way a PNG is judged changes. The values of the sets are filled by ONE calibrate run of the operator
  block (read the pixels from cal-14 / cal-15 in each theme), never by hand from a guess.
  Batch walktools2 (item 3): screens.home may take the sets form too (since then: screens.home, screens.chat and screens.viewer; sets
  on any other screen is still a usage error before any adb command, "only screens.home, screens.chat and screens.viewer may use
  sets"). The rules of a set are the same; a home check passes when one set passes (light = the probes of the old form, dark = the
  values of the dark home). Every reader of screens.home takes both forms (the coldstart check, the tab steps, the proven restarts,
  the calibrate shots that expect home); a home in the old form keeps its behaviour and its notes byte for byte. The calibrate names
  the set that passed in the probes entry of each home shot ("ok (set light)") and adds one note when home holds sets.
Batch walktools2 (item 2) - the step coldstart-watch: opt-in (never in the default list), only when named in -Steps; it runs after
  every other step. Usage error before any adb command: with -Calibrate, with -Flags (every rep restarts the app). -Repeats 1..50.
  Per rep: am force-stop, coldStartIdleSec, logcat -c, the stamp + am start -W (t0), pidof at once (the pid P: exactly one pid of
  digits), a FIXED wait of $script:WatchWaitSec = 10 s (a script constant, run.json coldstartWatch.waitSec), the stamp + pidof (stamp2),
  the focus check (Test-AppFront). The start is PROVEN when exactly one pid is there after the wait and it is P AND our app is in
  front. A start that is NOT proven keeps its evidence BEFORE any later command that can clear a buffer (the next rep's logcat -c):
  (1) the system events by ONE new command shape, matched as a whole string:
      logcat -d -b events -v threadtime | grep -o -E '<the fixed pattern $script:WatchEventRe>' > /data/local/tmp/adbwalk-log.txt
      pulled to android-walk-coldstart-watch-NN-events.txt, then rm -f. grep -o keeps ONLY the line's time, the pid / tid columns, the
      priority letter, the tag and the numeric fields of am_proc_start, am_proc_died, am_kill, am_crash, am_anr, am_wtf of the pinned
      package (the numeric fields before it and the numeric fields right after it) and the numeric fields of killinfo: no message, no
      kill reason, no exception text and no other package name leaves the phone. logcat -c does not clear the events buffer: the
      parser counts an event only when its own time is at or after the rep's t0 (and at most 60 s after stamp2).
  (2) the app log of the pid P by the existing filtered pull (Get-LogPullCmd P, the emitter shapes of the log filter below), pulled to
      android-walk-coldstart-watch-NN.txt; when no single pid was read right after the start there is no app log pull.
  No screenshot, no tap, no key in this step. A failed evidence pull (or a failed stamp / am start / pidof) makes the rep an error:
  the parser says "no data" (exit 2). A pidof answer counts only with no timeout, no stderr text and exit 0 with pids of digits or
  exit 1 with no output; the first pidof is read once more when it cannot be read (#46 r1 F-1). Everything after the start is in a
  try / finally: an error there (an IO error of walk.log, Ctrl+C in the wait) still saves the evidence once before the error goes on
  (F-4; a second Ctrl+C, a killed process or a walk.log that stays broken can still lose it). run.json: the rep's watch object (pid,
  pidsAtStart, pidsAfter, pidInAfter, samePid, front, proven, eventsPull, events, logPull). The parser rows: starts, in front after <n> s, ends with no kill, ends with a kill, not in front, process alive;
  one facts line per start that was not proven in summary.md (numbers and fixed words only, never a raw line). Time: t0 / stamp2 come
  from the phone's date +%m-%dT%H:%M:%S.%N and the events from the threadtime stamp of logcat, both the phone's local clock and both
  without a year; the parser puts t0 into a year by the parse time and each event within 180 days of t0, so a run over New Year
  keeps its order; an event dated more than 180 days before t0 would land a year later, past the 60 s bound, and is not counted. A
  phone clock that is set (NTP, by hand) between t0 and the events can move an event out of or into the window.
Inputs: a52s.json next to this script (timing, taps, swipes, screen probes or, for chat and viewer, probe sets; the package is pinned below);
        <repo>\Claude outputs\adbwalk\walk.local.json (optional, never in git): { "seedAddresses": [...],
        "imageChatAddress": "...", "fileChatAddress": "...", "voiceChatAddress": "...", "photoChatAddress": "..."
        (each optional) }; all are masked in everything the script writes.
Output: <repo>\Claude outputs\adbwalk\<yyyyMMdd-HHmm>\ (walk) or calibrate-<yyyyMMdd-HHmm>\.
Exit:   0 ok - 1 driver failure (bad arguments, pre-flight, crash, a -Flags stop) - else the parser's code (2 no data,
        3 no run.json, 4 the switch state in a pulled log differs from the one asked with -Flags).

Safety rules (Assert-AdbCommand is an allowlist of every command shape this script can send):
- the only app this tool may drive is the pinned package com.ixilabs.spixi.dev (a52s.json must say the same)
- never uninstall, pm clear, root, reboot, rm -r, input text (no PIN or password is ever typed)
- install only with "install -r", and only an APK whose file name starts with the pinned package id
- phone files only /data/local/tmp/adbwalk-shot.png and /data/local/tmp/adbwalk-log.txt (rm -f only these two)
- input events (tap, swipe, BACK) and screencap are sent only when our activity has the focus, checked in a
  separate adb call just before (a window that takes the focus in that gap can still receive one event).
  All other commands (am, svc, settings, logcat, dumpsys, kill of the confirmed renderer, HOME, the wake key)
  do not depend on the focus. After a screencap the focus is read again; a foreign result deletes the PNG.
- coldstart-watch: the events buffer is cut ON THE PHONE by grep -o to times, pids, the six am_* tags of the pinned package with
  their numeric fields, and the numeric fields of killinfo (one exact command string; see the step above)
- the log pull is filtered ON THE PHONE by the app pid, the Core log stamp and the app's own token grammar
  ([P1] / [CDPERF] lines, "Starting Spixi", "Network client connected to <host:port>", "Received Hello: ...", and the
  ONE exact state line "[FLAGS] warmidle=<0|1> sparerearm=<0|1> sparekeep=<0|1> noemptydetail=<0|1>": no other
  [FLAGS] line passes).
  Contact addresses and other Core lines do not match; tokens of [a-z0-9_.=-] could in theory still carry
  lower-case text, and the connect line carries the node host:port.
- a notification of another app does not take the focus and can appear in a screenshot: run.json records
  device.dnd (Do not disturb) and the script warns when it is off or unknown
- the only "settings put" restores stay_on_while_plugged_in to the value read at the start
- finally: stay_on restored; Wi-Fi re-enabled when this run turned it off (the network step only runs when
  Wi-Fi was enabled at its start and adb is on USB, so the restore target is always "enabled"); both phone
  files are removed with rm -f (the result is not checked); the lock removed. The pending restore is kept in restore-pending.json (it holds an unsalted,
  truncated SHA-256 of the serial, not the serial itself) until it succeeded; the next run on THAT phone applies it first (closing the
  window skips the finally block). Hook runs use their own .lock.hook, restore-pending.hook.json and
  adb-walk-refused.hook.log.
- left changed on the phone after a run: the dev app stays running in front with the keyguard dismissed (it
  was force-stopped and cold-started when the coldstart step or -Calibrate ran); the tabs Apps, Wallet and
  Account were opened when a tab step ran; the dev-seed chats were opened (their unread state changes); logcat buffer size 16M until reboot and a cleared
  log buffer; with -Apk the build is replaced; with -KillRenderer the renderer may be killed; with -Flags the four
  developer preferences of the dev app are changed and STAY changed after the run (the next start of the app, by any
  means, runs with them), and the app was force-stopped twice and cold-started twice before the first step.
- no seed address and no serial in the files the SCRIPT writes (walk.log, run.json, calibrate.json, device.txt,
  tries.txt) and on the console (masked as <seed k> (list position) / <seed-index k> (open-seed, dev-seed index) / <serial>, "seed k" / "seed-index k" / "serial" in notes); device text
  reaches them only through a strict capture or Get-SafeNote. meminfo files, pulled logs and screenshots are
  stored as the phone returns them.
- local folders (run folder, output root, repo, APK folder, profile, local app data, temp; only when the value
  is an absolute path) are replaced by <path> in every file this script writes and every line it prints (the
  parser's own console line names the summary.md path); adb's own text of a failed pull or install
  is never shown (only the exit code and a strict capture); a failed restore ends with exit 1
- a value adb did not print is absent from run.json, never 0

Test hook: environment variable ADBWALK_ADB = full path of an adb executable to use instead of adb on PATH.
Hook runs are marked: folder prefix hook-, "adbHook": true in run.json / calibrate.json, a console banner.
#>
[CmdletBinding()]
param(
    [string]$Serial = '',
    [string]$Apk = '',
    [string[]]$Steps = @(),
    [int]$Repeats = 5,
    [switch]$Calibrate,
    [switch]$KillRenderer,
    [string[]]$Flags,
    [string[]]$SeedIndex,
    [string[]]$HistorySeed
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Off

# ---------------------------------------------------------------- constants and state
# Safety rule from the security review: the only app this tool may drive. a52s.json must carry the same id.
$script:PinnedPackage = 'com.ixilabs.spixi.dev'
$script:Inv = [System.Globalization.CultureInfo]::InvariantCulture
$script:Utf8 = New-Object System.Text.UTF8Encoding($false)
$script:Ws = [char[]]@(32, 9, 13, 10)
$script:AllSteps = @('coldstart', 'mem-home', 'chat-intent', 'chat-tap', 'scroll', 'resume', 'resume-long', 'network', 'mem-end', 'mem-trim',
    'resume-now', 'resume-3s', 'chatinfo', 'tab-apps', 'tab-wallet', 'tab-account', 'history', 'scroll-image',
    'scroll-files', 'scroll-voice', 'scroll-photos', 'viewer', 'downloads', 'open-seed', 'mem-photos', 'coldstart-watch')
# Walk steps 2: the new steps run AFTER the old ones, so every old row keeps its place and its meaning. scroll-image
# runs only when it is named in -Steps (it needs the local key imageChatAddress, the image seed of speed batch 1a).
# Batch filewalk: the five file-walk steps run after scroll-image and are opt-in too (local keys and new map keys).
# Batch walktools2 (item 2): coldstart-watch is opt-in and comes last (it force-stops and cold-starts the app in every rep).
$script:OptInSteps = @('scroll-image', 'scroll-files', 'scroll-voice', 'scroll-photos', 'viewer', 'downloads', 'open-seed', 'mem-photos', 'coldstart-watch')
$script:DefaultSteps = @($script:AllSteps | Where-Object { $script:OptInSteps -cnotcontains $_ })
# Batch filewalk: the local key of each file chat step (walk.local.json) and its index in $script:Seeds (-1 = no valid key).
$script:FileChatKeys = @{ 'scroll-files' = 'fileChatAddress'; 'scroll-voice' = 'voiceChatAddress'; 'scroll-photos' = 'photoChatAddress' }
$script:FileSeed = @{ 'fileChatAddress' = -1; 'voiceChatAddress' = -1; 'photoChatAddress' = -1 }
# Batch filewalk: the fixed time of the viewer and downloads gates (no a52s.json key: the file stays unchanged).
$script:FileGateMs = 6000
$script:ViewerReopen = $false
# #46 r1 (B1-3): the bounded wait before the log pull of a file-walk rep (the logcat mirror can lag the app's lines).
$script:FilePullWaitMs = 4000
# #46 r1 (S-W-1): set by Invoke-FileReset when the restart after a failed rep is PROVEN; Complete-Rep then clears the
# recovery flags so no BACK follows. A restart that is not proven halts the run (no further input).
$script:FileResetOk = $false
$script:FileResetN = 0
# #46 r2 (B2-2): the app pid read while adb is healthy, BEFORE the first tap command of a viewer / downloads rep (and of
# the calibrate tries); the restart proof needs a pid that differs from it. '' = not read: no tap is sent.
$script:FileRepPid = ''
# #46 r1 (S-W-4): the dev-seed addresses are derived here (Spixi/Utils/SDevSeed.cs addressFor) and a local key that is
# not the expected one is refused. $script:ImageViewerOk: imageChatAddress is one of the image seeds (Seed 51-53).
$script:FileSeedIndex = @{ 'fileChatAddress' = 53; 'voiceChatAddress' = 54; 'photoChatAddress' = 55 }
$script:FileKeyNote = @{}
$script:ImageViewerOk = $false
# Batch photo1a (open-seed): the checked -SeedIndex values (dev-seed index, 0-based), the addresses this script derives for them
# (index text -> address; masked as <seed-index k> in everything the script writes).
$script:SeedIdx = @()
$script:OpenSeedAddr = @{}
# Round 1 F1 / round 2: "<app pid>:<index>" of the last successful open (recorded or warm-up) of the current index, '' = none. A recorded
# warm rep runs after a warm-up unless the pid read before it and its index are the remembered pair (so a process that was
# restarted by anything, or an index that has no open yet, is never counted as warm); $script:OpenSeedSkipIdx: the warm-up
# open of an index failed, its remaining reps are skipped.
$script:OpenSeedWarmKey = ''
$script:OpenSeedSkipIdx = $false
# Batch fixb3 (item 4): -HistorySeed = the dev-seed index (0..55) the step history runs on (-1 = not asked) and the step name its reps
# get (history-seed-kNN, NN = the two-digit index). The address is derived by Get-DevSeedAddress and masked <seed-index k>.
$script:HistSeedIdx = -1
$script:HistorySeedStep = ''
# Batch fixb3 (item 3): the fixed swipe of -Calibrate on the Account hub (a fling from the lower part of the hub to the upper part, 150 ms;
# the hub scroller is about 1300 CSS px tall, 1 CSS px = 2.8125 px, so this fling ends at the bottom of the hub whatever its speed). It is
# used ONLY while a52s.json has no valid swipes.accountDownloads, and it is printed in calibrate.json and walk.log.
$script:CalHubSwipe = 'input swipe 540 2000 540 400 150'
$script:CalHubReady = $false
$script:CalSkip12 = ''
$script:TabNames = @{ 'tab-apps' = 'tabApps'; 'tab-wallet' = 'tabWallet'; 'tab-account' = 'tabAccount' }
$script:TabFrames = @{ 'tab-apps' = 'apps'; 'tab-wallet' = 'wallet'; 'tab-account' = 'account' }
$script:ImageSeed = -1
$script:SeedAddrCount = 0
$script:TimingKeys = @('coldStartIdleSec', 'coldStartTimeoutSec', 'coldStartSettleSec', 'chatSettleMs', 'backSettleMs',
    'scrollSettleMs', 'resumeWaitSec', 'resumeLongWaitSec', 'memQuietSec', 'wifiOffSec',
    'tabSettleMs', 'historySwipeMs', 'historyMaxSwipes', 'resumeLateTapMs')
$script:PhoneShot = '/data/local/tmp/adbwalk-shot.png'
$script:PhoneLog = '/data/local/tmp/adbwalk-log.txt'
$script:PhoneFiles = @($script:PhoneShot, $script:PhoneLog)
# No space and no quote in the stamp format: the stamped shell commands stay quote-free.
$script:StampCmd = 'date +%m-%dT%H:%M:%S.%N'
$script:LogCmd = 'logcat -d -v threadtime -s DOTNET:I'
$script:PollCmd = $script:LogCmd + ' | grep -c -e P1..boot.hold -e P1..shell.boot'
# Walk steps 2: the number of history pages the chat shell asked for (a count only, no line leaves the phone).
$script:LoadPollCmd = $script:LogCmd + ' | grep -c -e P1..shell.send.loadmore'
# Walk steps 2, tab steps: the frames lines of the app's own log (a count only, no line leaves the phone). The tab steps
# tap and photograph only after the matching line shows that the view really changed.
$script:FramePoll = @{
    apps = ($script:LogCmd + ' | grep -c -e P1..shell.frames-tab-apps')
    wallet = ($script:LogCmd + ' | grep -c -e P1..shell.frames-tab-wallet')
    account = ($script:LogCmd + ' | grep -c -e P1..shell.frames-tab-account')
    chats = ($script:LogCmd + ' | grep -c -e P1..shell.frames-tab-chats')
    settings = ($script:LogCmd + ' | grep -c -e P1..frames.open-settingspage')
    settingsclosed = ($script:LogCmd + ' | grep -c -e P1..close.settingspage.done')
    # Batch perfb1toggle (-Flags): the app's fixed "stored" line and its own start-up state line (a count only).
    flagsstored = ($script:LogCmd + ' | grep -c -e FLAGS..perfb1.extra.stored')
    flagsstate = ($script:LogCmd + ' | grep -c -e FLAGS..warmidle=')
    # Batch filewalk (viewer, downloads): the gate lines of the photo viewer and of the Downloads list (a count only).
    viewimage = ($script:LogCmd + ' | grep -c -e P1..shell.send.viewimage')
    overlayopen = ($script:LogCmd + ' | grep -c -e P1..shell.frames-overlay-open')
    loaddownloads = ($script:LogCmd + ' | grep -c -e P1..shell.send.loaddownloads')
    subscreenopen = ($script:LogCmd + ' | grep -c -e P1..shell.frames-subscreen-open')
    subscreenclose = ($script:LogCmd + ' | grep -c -e P1..shell.frames-subscreen-close')
    # #46 r1 (B1-3): the lines a file-walk rep waits for before its log pull (a count only).
    scrolllines = ($script:LogCmd + ' | grep -c -e P1..shell.scroll')
    overlayclose = ($script:LogCmd + ' | grep -c -e P1..shell.frames-overlay-close')
    # Batch photo1a (open-seed): the app's "[P1] chat media" line, which the app writes 2 s after the present (a count only).
    chatmedia = ($script:LogCmd + ' | grep -c -e P1..chat.media')
}
# The ONE command that may hold quotes, brackets and a redirect: matched by exact string equality.
$script:LogRe = '^[0-9]{2}-[0-9]{2} [0-9:.]{12} +[0-9]+ +[0-9]+ [A-Z] DOTNET *: [0-9]{2}-[0-9]{2} [0-9:.]{8,16}\|[A-Za-z]{1,10}\|[0-9]{1,6}: ((\[WEBVIEW\] [A-Z]{1,12} )?\[(P1|CDPERF)\] [a-z0-9_.=-]{1,40}( [a-z0-9_.=-]{1,40}){0,15}( \(file:///android_asset/html/[a-z.]{0,24}:[0-9]{1,6}\))?$|Starting Spixi [a-z0-9.-]{1,24} \([a-z0-9.-]{1,24}\)$|Network client connected to [A-Za-z0-9-]{1,24}(\.[A-Za-z0-9-]{1,24}){0,7}:[0-9]{1,5}$|Received Hello: Node version [0-9]{1,6}$|\[FLAGS\] warmidle=[01] sparerearm=[01] sparekeep=[01] noemptydetail=[01]$)'
$script:LogPullPrefix = 'logcat -d --pid='
$script:LogPullSuffix = ' -v threadtime -s DOTNET:I | grep -E ''' + $script:LogRe + ''' > /data/local/tmp/adbwalk-log.txt'
# Batch perfb1toggle (-Flags): time limits, the one pull name, the state line as the app logs it, the fixed stop texts.
$script:FlagsStoredWaitSec = 30
$script:FlagsStateWaitSec = 45
$script:FlagsStoreSettleMs = 2000
$script:FlagsPull = 'android-walk-flags-00.txt'
$script:FlagLineRe = '^[0-9]{2}-[0-9]{2} [0-9:.]{12} +[0-9]+ +[0-9]+ [A-Z] DOTNET *: [0-9]{2}-[0-9]{2} [0-9:.]{8,16}\|[A-Za-z]{1,10}\|[0-9]{1,6}: \[FLAGS\] warmidle=([01]) sparerearm=([01]) sparekeep=([01]) noemptydetail=([01])\z'
$script:FlagsStopText = @{
    'start-failed' = 'the start with the perfb1flags extra failed (am start gave an error)'
    'not-stored' = 'the app did not store the switch state (Developer mode off, or the build on the phone does not have this batch)'
    'no-state-line' = 'the app logged no switch state line after the cold start (or the log pull gave none)'
    'pull-failed' = 'the log pull of the switch state failed'
    'state-differs' = 'the app logged a switch state that differs from the asked state'
    'unproven-process' = 'the app process changed after the switch state was proven (a restart inside the run): the state of the new process is not proven'
}
# Batch walktools2 (item 2, coldstart-watch): the FIXED wait between the start (am start -W + pidof) and the proof (one pid = the pid of
# the start AND our app in front). A script constant, written to run.json as coldstartWatch.waitSec. F-1 (2026-11-23): the process
# ended 3 s after am start -W returned.
$script:WatchWaitSec = 10
# The ONE events pull of a start that was not proven: the events buffer, cut ON THE PHONE by grep -o to the time, the pid / tid
# columns, the priority letter, the tag and the leading numeric fields of six am_* tags of the pinned package (and the numeric
# fields that follow the package), plus the numeric fields of killinfo. Nothing else of a line can pass: no message, no reason,
# no exception text, no other package name. Matched by exact string equality (PipedCmds), written to the existing phone file.
$script:WatchEventRe = '^[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3} +[0-9]+ +[0-9]+ [A-Z] ((am_proc_start|am_proc_died|am_kill|am_crash|am_anr|am_wtf) *: \[[0-9]+(,[0-9]+)*,com\.ixilabs\.spixi\.dev(,-?[0-9]+)*[],]|killinfo *: \[-?[0-9]+(,-?[0-9]+)*)'
$script:WatchEventsCmd = 'logcat -d -b events -v threadtime | grep -o -E ''' + $script:WatchEventRe + ''' > /data/local/tmp/adbwalk-log.txt'

$script:Mode = 'walk'
$script:Hook = $false
$script:DevSerial = ''
$script:AdbPath = ''
$script:Root = ''
$script:RepoPath = ''
$script:RunDir = ''
$script:RunName = ''
$script:WalkLog = ''
$script:Cfg = $null
$script:Pkg = ''
$script:Comp = ''
$script:W = 0
$script:H = 0
$script:Tm = @{}
$script:RepeatsN = 1
$script:StepsReq = @()
$script:Seeds = New-Object System.Collections.Generic.List[object]
$script:SeedNote = @{}
$script:ShellAllow = @()
$script:LockPath = ''
$script:LockOwned = $false
$script:PendingPath = ''
$script:PendingWritten = $false
$script:StartedIso = ''
$script:StayOld = $null
$script:WifiTouched = $false
$script:WalkStarted = $false
$script:DevInfo = [ordered]@{}
$script:AppInfo = [ordered]@{}
$script:Reps = New-Object System.Collections.Generic.List[object]
$script:Mem = New-Object System.Collections.Generic.List[object]
$script:NeedRecover = $true
$script:LastFailed = $false
$script:ErrStreak = 0
$script:Halted = $false
$script:HaltNote = 'run stopped after 3 failed reps (error or no-screen) in a row'
$script:ScrollOpen = ''
$script:ScrollWhat = ''
$script:DrawingState = 0
$script:CalShots = New-Object System.Collections.Generic.List[object]
$script:TriesFile = ''
$script:ApkFull = ''
$script:ApkDir = ''
$script:RestoreFailed = $false
$script:Dnd = ''
$script:LockSuffix = ''
$script:FlagsAsked = ''
$script:FlagsAskedState = ''
$script:FlagsLogged = ''
$script:FlagsOk = $true
$script:FlagsStop = ''
$script:FlagsPid = ''
$script:LastPullPid = ''
$script:FlagsStopAfter = ''

# ---------------------------------------------------------------- text, log, console
function Protect-Text([string]$Text) {
    # Every string that leaves the script passes here: serial and seed addresses never reach a file or the console.
    # Only long values are replaced (serial >= 6, seeds 30..60 base58), so numbers in the text stay intact.
    if ($null -eq $Text) { return '' }
    $t = $Text
    # FIRST, on the raw text: local folders (both separators, case-insensitive) -> <path>; then serial, then seeds.
    $dirs = New-Object System.Collections.Generic.List[string]
    foreach ($d in @($script:RunDir, $script:Root, $script:RepoPath, $script:ApkDir, $env:USERPROFILE, $env:LOCALAPPDATA, $env:TEMP)) {
        if ($d) { $d2 = $d.TrimEnd([char]92, [char]47) } else { $d2 = '' }
        # r6-1: only an absolute folder (drive letter, UNC, or a POSIX root) is replaced: a bare word (a relative TEMP,
        # a provider-qualified -Apk) inside a seed address or the serial would cut the masks below.
        if ($d2.Length -ge 4 -and (Test-RootedDir $d2)) {
            foreach ($v in @($d2, $d2.Replace([char]92, [char]47), $d2.Replace([char]47, [char]92))) { if (-not $dirs.Contains($v)) { $dirs.Add($v) } }
        }
    }
    foreach ($v in @($dirs | Sort-Object -Property Length -Descending)) {
        $t = [regex]::Replace($t, [regex]::Escape($v), '<path>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    }
    if ($script:DevSerial -and (Test-SerialMaskable $script:DevSerial)) { $t = $t.Replace($script:DevSerial, '<serial>') }
    if ($Serial -and (Test-SerialMaskable $Serial)) { $t = $t.Replace($Serial, '<serial>') }
    # Batch photo1a: the addresses of the open-seed indexes, derived by this script (k = the dev-seed index, not a list position).
    # Round 1 F3: their own label <seed-index k>, so "<seed i>" always means a list position and never a dev-seed index.
    # Round 2: this loop runs FIRST, so an address that is also in the walk.local.json list still gets <seed-index k>; with no
    # open-seed index the table is empty and the output is the old one.
    foreach ($sk in @($script:OpenSeedAddr.Keys)) {
        $sa = [string]$script:OpenSeedAddr[$sk]
        if ($sa) { $t = $t.Replace($sa, '<seed-index ' + $sk + '>') }
    }
    for ($i = 0; $i -lt $script:Seeds.Count; $i++) {
        $s = $script:Seeds[$i]
        if ($s) { $t = $t.Replace([string]$s, '<seed ' + $i + '>') }
    }
    return $t
}

function Test-RootedDir([string]$D) {
    return ($D -cmatch '^[A-Za-z]:[\\/]' -or $D -cmatch '^[\\/]{2}[^\\/]' -or $D -cmatch '^[\\/][^\\/]')
}

function Remove-LocalFile([string]$Path) {
    # Returns $false when the file is still there after one retry.
    for ($i = 0; $i -lt 2; $i++) {
        try { if (Test-Path -LiteralPath $Path) { Remove-Item -LiteralPath $Path -Force }; return $true } catch { Start-Sleep -Milliseconds 200 }
    }
    return $false
}

function Get-Cut([string]$Text, [int]$Max) {
    # Mask first, then cut: a cut must never leave half an address behind.
    if ($null -eq $Text) { return '' }
    $t = ((Protect-Text $Text) -replace '\s+', ' ').Trim($script:Ws)
    if ($t.Length -gt $Max) { $t = $t.Substring(0, $Max) + '...' }
    return $t
}

function Get-SafeNote([string]$Text, [int]$Max = 120) {
    # Notes in the json files and adb error text: a fixed character set, at most 120 characters, no links.
    $t = Protect-Text $Text
    $t = [regex]::Replace($t, '<seed ([0-9]{1,2})>', 'seed $1')
    $t = [regex]::Replace($t, '<seed-index ([0-9]{1,2})>', 'seed-index $1')
    $t = $t.Replace('<serial>', 'serial')
    if ($t -match '[A-Za-z][A-Za-z0-9+.-]{1,15}:/' -or $t -match '(?i)www\.|data:') { return '(removed)' }
    $t = [regex]::Replace($t, '[^A-Za-z0-9 _.,:=/()%+-]', '?')
    if ($t.Length -gt $Max) { $t = $t.Substring(0, $Max) }
    return $t
}

function Get-ErrText($Err) {
    # Our own ADBWALK-* texts through Get-SafeNote; a .NET exception only as its type name + script line.
    $m = [string]$Err.Exception.Message
    if ($m -cmatch '^ADBWALK-[A-Z]+:') { return (Get-SafeNote ($m -replace '^ADBWALK-[A-Z]+:\s*', '') 300) }
    return ('driver: ' + $Err.Exception.GetType().Name + ' (line ' + $Err.InvocationInfo.ScriptLineNumber + ')')
}

function ConvertTo-MaskedObject($Obj) {
    # Mask string VALUES before serializing: masking the JSON text could rewrite numbers and names.
    if ($null -eq $Obj) { return $null }
    if ($Obj -is [string]) { return (Protect-Text $Obj) }
    if ($Obj -is [System.Collections.IDictionary]) {
        $o = [ordered]@{}
        foreach ($k in $Obj.Keys) { $o[$k] = ConvertTo-MaskedObject $Obj[$k] }
        return $o
    }
    if ($Obj -is [System.Collections.IList]) {
        $l = New-Object System.Collections.Generic.List[object]
        foreach ($x in $Obj) { $l.Add((ConvertTo-MaskedObject $x)) }
        return ,$l
    }
    return $Obj
}

function Write-JsonFile([string]$Path, $Obj) {
    $json = ConvertTo-Json -InputObject (ConvertTo-MaskedObject $Obj) -Depth 8
    [System.IO.File]::WriteAllText($Path, $json, $script:Utf8)
}

function Write-WalkLog([string]$Line) {
    if (-not $script:WalkLog) { return }
    $t = Protect-Text $Line
    # Local paths appear as file names only (no user name, no folder).
    if ($script:RunDir) { $t = $t.Replace($script:RunDir + [System.IO.Path]::DirectorySeparatorChar, '') }
    if ($script:RepoPath) { $t = $t.Replace($script:RepoPath, '<repo>') }
    $stamp = [DateTime]::Now.ToString('HH:mm:ss.fff', $script:Inv)
    [System.IO.File]::AppendAllText($script:WalkLog, ($stamp + ' ' + $t + "`r`n"), $script:Utf8)
}

function Say([string]$Line) { Write-Host ([regex]::Replace((Protect-Text $Line), '[^\x20-\x7E]', '?')) }

function Say-Log([string]$Line) {
    Say $Line
    Write-WalkLog $Line
}

function Write-TextFile([string]$Path, [string]$Text) {
    [System.IO.File]::WriteAllText($Path, (Protect-Text $Text), $script:Utf8)
}

function Write-RawFile([string]$Path, [string]$Text) {
    # Machine-read numbers (meminfo): written as returned, never masked.
    [System.IO.File]::WriteAllText($Path, $Text, $script:Utf8)
}

function Split-Lines([string]$Text) {
    if (-not $Text) { return @() }
    return @($Text -split "\r?\n")
}

function Get-FirstLine([string]$Text) {
    foreach ($l in (Split-Lines $Text)) { $c = $l.Trim($script:Ws); if ($c) { return $c } }
    return ''
}

function Get-Clean([string]$Text) {
    if ($null -eq $Text) { return '' }
    return $Text.Trim($script:Ws)
}

function Get-Pids([string]$Text) {
    return @(((Get-Clean $Text) -split '[ \t\r\n]+') | Where-Object { $_ -cmatch '^[0-9]{1,9}\z' })
}

function Test-SerialMaskable([string]$S) {
    # Masking a short or all-digit serial would rewrite numbers (a run name, a pid): such serials are refused.
    if ($S.Length -lt 6) { return $false }
    if ($S -cmatch '^[0-9]+\z' -and $S.Length -lt 10) { return $false }
    return $true
}

function Stop-Walk([string]$Why) { throw ('ADBWALK-STOP: ' + $Why) }

# ---------------------------------------------------------------- the one native-command wrapper
function ConvertTo-ArgString([string]$Arg) {
    # Windows command-line quoting (CommandLineToArgvW rules), so a path with spaces stays ONE argument.
    if ($Arg.Length -gt 0 -and $Arg -notmatch '[\s"]') { return $Arg }
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.Append([char]34)
    $bs = 0
    foreach ($ch in $Arg.ToCharArray()) {
        if ($ch -eq [char]92) { $bs++; continue }
        if ($ch -eq [char]34) {
            [void]$sb.Append([char]92, (2 * $bs + 1))
            [void]$sb.Append([char]34)
            $bs = 0
            continue
        }
        if ($bs -gt 0) { [void]$sb.Append([char]92, $bs); $bs = 0 }
        [void]$sb.Append($ch)
    }
    if ($bs -gt 0) { [void]$sb.Append([char]92, (2 * $bs)) }
    [void]$sb.Append([char]34)
    return $sb.ToString()
}

function Invoke-Native([string]$File, [string]$ArgText, [int]$TimeoutSec) {
    # Process API instead of "& adb ... 2>&1": PowerShell 5.1 turns native stderr into errors under 'Stop'.
    $res = [ordered]@{ ExitCode = -1; StdOut = ''; StdErr = ''; TimedOut = $false; Command = ''; Verb = '' }
    $p = $null
    try {
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $File
        $psi.Arguments = $ArgText
        $psi.UseShellExecute = $false
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.RedirectStandardInput = $true
        $psi.CreateNoWindow = $true
        $psi.StandardOutputEncoding = $script:Utf8
        $psi.StandardErrorEncoding = $script:Utf8
        $p = New-Object System.Diagnostics.Process
        $p.StartInfo = $psi
        [void]$p.Start()
        # stdin closed at once = "adb shell -n": adb never waits on the console.
        $p.StandardInput.Close()
        # Both streams read asynchronously: a full stderr pipe cannot block a process that writes stdout.
        $outTask = $p.StandardOutput.ReadToEndAsync()
        $errTask = $p.StandardError.ReadToEndAsync()
        if ($p.WaitForExit($TimeoutSec * 1000)) {
            $p.WaitForExit()
            $res.ExitCode = $p.ExitCode
        } else {
            $res.TimedOut = $true
            try { $p.Kill() } catch { }
            [void]$p.WaitForExit(5000)
        }
        # Bounded waits: a server process that inherited the pipe must not hang the walk.
        if ($outTask.Wait(5000)) { $res.StdOut = [string]$outTask.Result }
        if ($errTask.Wait(5000)) { $res.StdErr = [string]$errTask.Result }
    } catch {
        $res.StdErr = 'cannot run adb: ' + $_.Exception.GetType().Name
    } finally {
        if ($p) { $p.Dispose() }
    }
    return (New-Object PSObject -Property $res)
}

function Get-LogPullCmd([string]$ProcId) { return ($script:LogPullPrefix + $ProcId + $script:LogPullSuffix) }

function Initialize-Allowlist {
    # Every piped command the script sends, as a whole string; nothing else may hold a "|".
    $script:PipedCmds = @(
        $script:PollCmd,
        $script:LoadPollCmd,
        $script:FramePoll['apps'],
        $script:FramePoll['wallet'],
        $script:FramePoll['account'],
        $script:FramePoll['chats'],
        $script:FramePoll['settings'],
        $script:FramePoll['settingsclosed'],
        $script:FramePoll['flagsstored'],
        $script:FramePoll['flagsstate'],
        $script:FramePoll['viewimage'],
        $script:FramePoll['overlayopen'],
        $script:FramePoll['loaddownloads'],
        $script:FramePoll['subscreenopen'],
        $script:FramePoll['subscreenclose'],
        $script:FramePoll['scrolllines'],
        $script:FramePoll['overlayclose'],
        $script:FramePoll['chatmedia'],
        $script:WatchEventsCmd,
        'dumpsys window | grep -e mCurrentFocus=',
        'dumpsys window | grep -e mDreamingLockscreen= -e isKeyguardShowing= -e mShowingLockscreen= -e mKeyguardShowing= -e mCurrentFocus=',
        'dumpsys activity activities | grep -e mKeyguardShowing=',
        'dumpsys power | grep -e mWakefulness=',
        ('dumpsys package ' + $script:Pkg + ' | grep -e versionName= -e versionCode= -e lastUpdateTime='),
        'dumpsys display | grep -i -e framerate',
        'ps -A | grep -e sandboxed',
        'dumpsys wifi | grep -e Wi-Fi.is'
    )
    $pe = [regex]::Escape($script:Pkg)
    $ce = $pe + '/[A-Za-z0-9_.]+'
    $script:ShellAllow = @(
        '^date \+%m-%dT%H:%M:%S\.%N\z',
        ('^am force-stop ' + $pe + '\z'),
        ('^am start -W -n ' + $ce + '\z'),
        ('^am start -n ' + $ce + '\z'),
        ('^am start -n ' + $ce + ' --es fa [1-9A-HJ-NP-Za-km-z]{30,60}\z'),
        ('^am start -n ' + $ce + ' --es perfb1flags warmidle=[01],sparerearm=[01],sparekeep=[01],noemptydetail=[01]\z'),
        ('^am send-trim-memory ' + $pe + ' RUNNING_LOW\z'),
        '^logcat -c\z',
        '^logcat -G 16M\z',
        '^input tap [0-9]{1,5} [0-9]{1,5}\z',
        '^input swipe [0-9]{1,5} [0-9]{1,5} [0-9]{1,5} [0-9]{1,5} [0-9]{1,5}\z',
        '^input keyevent (3|4|KEYCODE_WAKEUP)\z',
        '^wm dismiss-keyguard\z',
        '^wm size\z',
        '^wm density\z',
        '^getprop ro\.(product\.model|build\.version\.release|build\.version\.sdk)\z',
        '^dumpsys battery\z',
        '^dumpsys activity activities\z',
        '^dumpsys activity services [A-Za-z0-9_]+(\.[A-Za-z0-9_]+)+\z',
        ('^dumpsys package ' + $pe + '\z'),
        '^dumpsys meminfo [0-9]{1,9}\z',
        ('^pm path ' + $pe + '\z'),
        ('^cmd package resolve-activity --brief -c android\.intent\.category\.LAUNCHER ' + $pe + '\z'),
        '^settings get global (stay_on_while_plugged_in|zen_mode)\z',
        '^settings put global stay_on_while_plugged_in ([0-9]|1[0-5])\z',
        '^svc power stayon usb\z',
        '^svc wifi (enable|disable)\z',
        '^screencap -p /data/local/tmp/adbwalk-shot\.png\z',
        '^rm -f /data/local/tmp/adbwalk-(shot\.png|log\.txt)\z',
        ('^pidof ' + $pe + '\z'),
        '^kill [0-9]{1,9}\z'
    )
}

function Test-Ordinal([string]$A, [string]$B) { return [string]::Equals($A, $B, [System.StringComparison]::Ordinal) }

function Test-ShellAllowed([string]$Cmd) {
    if ($script:ShellAllow.Count -eq 0) { return $false }
    # Printable ASCII only: no zero-width, soft hyphen, NUL or other look-alike in a shell string.
    if ($Cmd -cmatch '[^\x20-\x7E]') { return $false }
    # The filtered log pull: built again from the validated pid and compared as a whole string.
    if ($Cmd.StartsWith($script:LogPullPrefix, [System.StringComparison]::Ordinal)) {
        $rest = $Cmd.Substring($script:LogPullPrefix.Length)
        if ($rest -cmatch '^([0-9]{1,9}) ') { return (Test-Ordinal $Cmd (Get-LogPullCmd $Matches[1])) }
        return $false
    }
    if ($Cmd.Contains('|')) {
        foreach ($pc in $script:PipedCmds) { if (Test-Ordinal $Cmd $pc) { return $true } }
        return $false
    }
    # Everything else: no quoting, expansion, globbing, subshell, redirect, background or newline.
    if ($Cmd -match '[`$\\''"&(){}<>\[\]*?\r\n]') { return $false }
    foreach ($raw in ($Cmd -split '[;|]')) {
        $piece = $raw.Trim(' ')
        $hit = $false
        foreach ($re in $script:ShellAllow) { if ($piece -cmatch $re) { $hit = $true; break } }
        if (-not $hit) { return $false }
    }
    return $true
}

function Test-LocalPullTarget([string]$Path) {
    # A pull writes only a direct child of the current run folder with one of the known names.
    if (-not $script:RunDir) { return $false }
    try {
        $full = [System.IO.Path]::GetFullPath($Path)
        $rd = [System.IO.Path]::GetFullPath($script:RunDir)
    } catch { return $false }
    $parent = [System.IO.Path]::GetDirectoryName($full)
    if (-not [string]::Equals($parent, $rd, [System.StringComparison]::OrdinalIgnoreCase)) { return $false }
    return ([System.IO.Path]::GetFileName($full) -cmatch '^(shot|android-walk|cal)-[A-Za-z0-9-]{1,60}\.(png|txt)\z')
}

function Test-ApkName([string]$Path) {
    $name = [System.IO.Path]::GetFileName($Path)
    return ($name -cmatch ('^' + [regex]::Escape($script:PinnedPackage) + '(-|_|\.apk\z)') -and $name -cmatch '\.apk\z')
}

function Assert-AdbCommand([string[]]$A) {
    $ok = $false
    if ($A.Count -ge 1) {
        $verb = $A[0]
        if ((Test-Ordinal $verb 'devices') -or (Test-Ordinal $verb 'start-server')) { $ok = ($A.Count -eq 1) }
        elseif (Test-Ordinal $verb 'install') { $ok = ($A.Count -eq 3 -and (Test-Ordinal $A[1] '-r') -and (Test-ApkName $A[2])) }
        elseif (Test-Ordinal $verb 'pull') {
            $known = $false
            foreach ($pf in $script:PhoneFiles) { if (Test-Ordinal $pf $A[1]) { $known = $true } }
            $ok = ($A.Count -eq 3 -and $known -and (Test-LocalPullTarget $A[2]))
        }
        elseif (Test-Ordinal $verb 'shell') { $ok = ($A.Count -eq 2 -and (Test-ShellAllowed $A[1])) }
    }
    if (-not $ok) { Stop-Walk ('refused adb command (not in the allowlist): ' + ($A -join ' ')) }
}

function Invoke-Adb {
    param([string[]]$AdbArgs, [int]$TimeoutSec = 60, [switch]$NoSerial)
    Assert-AdbCommand $AdbArgs
    $all = New-Object System.Collections.Generic.List[string]
    $shown = New-Object System.Collections.Generic.List[string]
    if ((-not $NoSerial) -and $script:DevSerial) { $all.Add('-s'); $all.Add($script:DevSerial); $shown.Add('-s'); $shown.Add('<serial>') }
    for ($i = 0; $i -lt $AdbArgs.Count; $i++) {
        $a = $AdbArgs[$i]
        $all.Add($a)
        # Local paths (pull target, APK) are logged as file names only.
        if ($i -eq 2 -and ($AdbArgs[0] -ceq 'pull' -or $AdbArgs[0] -ceq 'install')) { $shown.Add([System.IO.Path]::GetFileName($a)) }
        else { $shown.Add($a) }
    }
    $parts = New-Object System.Collections.Generic.List[string]
    foreach ($a in $all) { $parts.Add((ConvertTo-ArgString $a)) }
    $argText = $parts -join ' '
    $shownParts = New-Object System.Collections.Generic.List[string]
    foreach ($a in $shown) { $shownParts.Add((ConvertTo-ArgString $a)) }
    $shownText = $shownParts -join ' '
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $r = Invoke-Native $script:AdbPath $argText $TimeoutSec
    $sw.Stop()
    $r.Command = 'adb ' + $shownText
    $r.Verb = [string]$AdbArgs[0]
    $line = 'adb ' + $shownText + ' -> exit ' + $r.ExitCode + ' (' + $sw.ElapsedMilliseconds + ' ms)'
    if ($r.TimedOut) { $line += ' TIMEOUT after ' + $TimeoutSec + ' s' }
    if ($r.ExitCode -ne 0) { $line += ' : ' + (Get-AdbWhy $r) }
    Write-WalkLog $line
    return $r
}

function Invoke-Shell([string]$Cmd, [int]$TimeoutSec = 60) {
    return (Invoke-Adb -AdbArgs @('shell', $Cmd) -TimeoutSec $TimeoutSec)
}

function Get-AdbWhy($R) {
    # pull / install: adb's own text names local paths: only the exit, a fixed word and a strict capture.
    if ($R.Verb -ceq 'pull') {
        if ($R.TimedOut) { return 'pull failed timeout' }
        return 'pull failed'
    }
    if ($R.Verb -ceq 'install') {
        $why = 'install failed'
        if (($R.StdOut + "`n" + $R.StdErr) -cmatch 'Failure \[([A-Z_]{1,60})') { $why = 'install failed: ' + $Matches[1] }
        if ($R.TimedOut) { $why += ' timeout' }
        return $why
    }
    # Other commands: stderr's first line (reduced); of stdout only its length: grep'd dumpsys / ps may name other apps.
    $why = Get-SafeNote (Get-FirstLine $R.StdErr)
    if (-not $why) { $why = 'stdout ' + $R.StdOut.Length + ' chars' }
    if ($R.TimedOut) { $why = 'timeout ' + $why }
    return $why
}

function Invoke-ShellReq([string]$Cmd, [int]$TimeoutSec = 60) {
    # A REQUIRED command: a non-zero exit stops this rep (status error), not the run.
    $r = Invoke-Shell $Cmd $TimeoutSec
    if ($r.ExitCode -ne 0 -or $r.TimedOut) {
        $short = ($Cmd -split ';')[-1].Trim(' ')
        throw ('ADBWALK-REP: "' + (Get-Cut $short 60) + '" failed (exit ' + $r.ExitCode + '): ' + (Get-AdbWhy $r))
    }
    return $r
}

function Wait-Ms([int]$Ms, [string]$Why) {
    if ($Ms -le 0) { return }
    Write-WalkLog ('wait ' + $Ms + ' ms (' + $Why + ')')
    Start-Sleep -Milliseconds $Ms
}

function Wait-Sec([int]$Sec, [string]$Why) {
    if ($Sec -le 0) { return }
    Write-WalkLog ('wait ' + $Sec + ' s (' + $Why + ')')
    Start-Sleep -Seconds $Sec
}

# ---------------------------------------------------------------- config
function Read-JsonFile([string]$Path) {
    # ReadAllText strips a BOM and reads UTF-8; ConvertFrom-Json accepts CRLF.
    $text = [System.IO.File]::ReadAllText($Path)
    return ($text | ConvertFrom-Json)
}

function Get-Field($Obj, [string]$Name) {
    if ($null -eq $Obj) { return $null }
    if ($Obj -isnot [System.Management.Automation.PSCustomObject]) { return $null }
    $p = $Obj.PSObject.Properties[$Name]
    if ($null -eq $p) { return $null }
    return $p.Value
}

function Test-HasField($Obj, [string]$Name) {
    # Batch walktools (item 2): is the key PRESENT (Get-Field gives $null for an absent key and for a JSON null alike).
    if ($null -eq $Obj) { return $false }
    if ($Obj -isnot [System.Management.Automation.PSCustomObject]) { return $false }
    return ($null -ne $Obj.PSObject.Properties[$Name])
}

function Test-IsInt($V) {
    if ($null -eq $V) { return $false }
    if (-not ($V -is [int] -or $V -is [long] -or $V -is [double] -or $V -is [decimal])) { return $false }
    return ([double]$V -eq [math]::Floor([double]$V))
}

function Get-Seed([int]$K) {
    if ($K -lt 0 -or $K -ge $script:Seeds.Count) { return $null }
    return $script:Seeds[$K]
}

function Get-SeedGap([int]$K) {
    # Only the seedAddresses list counts here: the image chat address (after it in $script:Seeds) is no seed chat.
    if ($K -ge $script:SeedAddrCount) { return ('walk.local.json has no seed address ' + $K) }
    if ($script:SeedNote.ContainsKey($K)) { return $script:SeedNote[$K] }
    if (-not (Get-Seed $K)) { return 'walk.local.json has no seed address' }
    return ''
}

function Test-OnScreen([int]$X, [int]$Y) {
    return ($X -ge 0 -and $Y -ge 0 -and $X -le ($script:W - 1) -and $Y -le ($script:H - 1))
}

function Get-TapGap([string]$Name) {
    $tap = Get-Field (Get-Field $script:Cfg 'taps') $Name
    if ($null -eq $tap) { return ('a52s.json has no taps.' + $Name) }
    $x = Get-Field $tap 'x'
    $y = Get-Field $tap 'y'
    if (-not (Test-IsInt $x) -or -not (Test-IsInt $y)) { return ('a52s.json taps.' + $Name + ' is not two integers') }
    if ($x -eq 0 -and $y -eq 0) { return ('taps.' + $Name + ' not calibrated') }
    if (-not (Test-OnScreen $x $y)) { return ('taps.' + $Name + ' is off the screen') }
    return ''
}

function Get-SwipeGap([string]$Name) {
    $sw = Get-Field (Get-Field $script:Cfg 'swipes') $Name
    if ($null -eq $sw) { return ('a52s.json has no swipes.' + $Name) }
    $v = @()
    foreach ($k in @('x1', 'y1', 'x2', 'y2', 'ms')) {
        $f = Get-Field $sw $k
        if (-not (Test-IsInt $f)) { return ('a52s.json swipes.' + $Name + '.' + $k + ' is not an integer') }
        $v += [int]$f
    }
    if ($v[0] -eq 0 -and $v[1] -eq 0 -and $v[2] -eq 0 -and $v[3] -eq 0) { return ('swipes.' + $Name + ' not calibrated') }
    if (-not (Test-OnScreen $v[0] $v[1]) -or -not (Test-OnScreen $v[2] $v[3])) { return ('swipes.' + $Name + ' is off the screen') }
    $dx = $v[2] - $v[0]
    $dy = $v[3] - $v[1]
    if ([math]::Sqrt($dx * $dx + $dy * $dy) -lt 200) { return ('swipes.' + $Name + ' is shorter than 200 px') }
    if ($v[4] -lt 100 -or $v[4] -gt 2000) { return ('swipes.' + $Name + '.ms is not 100..2000') }
    return ''
}

function Get-ProbeListGap([string]$Label, $Probes, $Min) {
    # Batch walktools (item 2): the checks of the old Get-ScreenGap, unchanged (the same order and the same texts), taken out so that a
    # set of the new form is validated by exactly the same rules. $Label = 'screens.<name>' (the old form: the texts are byte-equal to
    # the old ones) or 'screens.<name>.sets[<set name>]'. Returns '' when the list is valid.
    $probes = @($Probes)
    if ($probes.Count -eq 0) { return ($Label + ' not calibrated (no probes)') }
    $i = 0
    $placeholder = 0
    foreach ($pr in $probes) {
        $i++
        $x = Get-Field $pr 'x'
        $y = Get-Field $pr 'y'
        $rgb = [string](Get-Field $pr 'rgb')
        $tol = Get-Field $pr 'tol'
        if (-not (Test-IsInt $x) -or -not (Test-IsInt $y) -or -not (Test-IsInt $tol) -or $rgb -cnotmatch '^#[0-9A-Fa-f]{6}\z') {
            return ($Label + ' probe ' + $i + ' is invalid')
        }
        if (-not (Test-OnScreen $x $y) -or $tol -lt 0 -or $tol -gt 255) {
            return ($Label + ' probe ' + $i + ' is off the screen or tol is not 0..255')
        }
        # The contract's sample probe {0,0,#000000} is a placeholder, not a calibration.
        if ($x -eq 0 -and $y -eq 0 -and $rgb -eq '#000000') { $placeholder++ }
    }
    if ($placeholder -eq $probes.Count) { return ($Label + ' not calibrated (placeholder probe)') }
    if (-not (Test-IsInt $Min) -or $Min -lt 1 -or $Min -gt $probes.Count) { return ($Label + '.minMatch is not 1..' + $probes.Count) }
    return ''
}

function Get-ScreenGap([string]$Name) {
    # Batch walktools (item 2): a screen is EITHER { probes, minMatch } (the old form: the checks and texts are unchanged, they now
    # live in Get-ProbeListGap) OR, for chat and viewer ONLY (batch walktools2 item 3: and home), { sets: [ { name, probes, minMatch } ] }: 1 or 2 sets, the names unique and
    # light or dark, each set checked by Get-ProbeListGap. A key with both forms, and sets on another screen, are gaps (invalid).
    $scr = Get-Field (Get-Field $script:Cfg 'screens') $Name
    if ($null -eq $scr) { return ('a52s.json has no screens.' + $Name) }
    if (Test-HasField $scr 'sets') {
        if (@('home', 'chat', 'viewer') -cnotcontains $Name) { return ('screens.' + $Name + ' may not use sets (only home, chat and viewer)') }
        if ((Test-HasField $scr 'probes') -or (Test-HasField $scr 'minMatch')) { return ('screens.' + $Name + ' holds sets and probes / minMatch (one form only)') }
        # The raw property value (Get-Field would unroll a one-element list): null and an object are no list.
        $rawSets = $scr.PSObject.Properties['sets'].Value
        if ($rawSets -isnot [System.Array]) { return ('screens.' + $Name + '.sets must be a list of 1 or 2 sets') }
        $sets = @($rawSets)
        if ($sets.Count -lt 1 -or $sets.Count -gt 2) { return ('screens.' + $Name + '.sets must be a list of 1 or 2 sets') }
        $seen = @{}
        foreach ($st in $sets) {
            $sn = [string](Get-Field $st 'name')
            if ($sn -cnotmatch '\A(light|dark)\z') { return ('screens.' + $Name + '.sets has a set whose name is not light or dark') }
            if ($seen.ContainsKey($sn)) { return ('screens.' + $Name + '.sets has the name ' + $sn + ' twice') }
            $seen[$sn] = $true
            $gap = Get-ProbeListGap ('screens.' + $Name + '.sets[' + $sn + ']') @(Get-Field $st 'probes') (Get-Field $st 'minMatch')
            if ($gap) { return $gap }
        }
        return ''
    }
    return (Get-ProbeListGap ('screens.' + $Name) @(Get-Field $scr 'probes') (Get-Field $scr 'minMatch'))
}

function Get-StepGap([string]$Step) {
    $need = @()
    if ($Step -eq 'coldstart') { $need = @('screen:home') }
    elseif ($Step -eq 'chat-intent') { $need = @('screen:chat') }
    elseif ($Step -eq 'chat-tap' -or $Step -eq 'resume' -or $Step -eq 'resume-long') { $need = @('tap:chatRow1', 'screen:chat') }
    elseif ($Step -eq 'scroll') { $need = @('swipe:chatOlder', 'swipe:chatNewer', 'screen:chat', 'seed:0') }
    elseif ($Step -eq 'resume-now' -or $Step -eq 'resume-3s') { $need = @('tap:chatRow1', 'screen:chat') }
    elseif ($Step -eq 'chatinfo') { $need = @('tap:chatHeader', 'screen:chat', 'screen:chatinfo') }
    elseif ($script:TabNames.ContainsKey($Step)) { $need = @(('tap:' + $script:TabNames[$Step]), 'tap:tabChats', 'screen:home') }
    elseif ($Step -eq 'history') { $need = @('swipe:historyOlder', 'screen:chat', 'count:historyMaxSwipes') }
    elseif ($Step -eq 'scroll-image') { $need = @('swipe:chatOlder', 'swipe:chatNewer', 'screen:chat', 'image:') }
    # Batch filewalk: the new map keys (taps.photoTile, taps.accountDownloads, screens.viewer, screens.downloads) are absent
    # until the calibrate run of the operator block fills them: their absence is a gap, never a tap at a guessed point.
    elseif ($script:FileChatKeys.ContainsKey($Step)) { $need = @('swipe:chatOlder', 'swipe:chatNewer', 'screen:chat', ('key:' + $script:FileChatKeys[$Step])) }
    elseif ($Step -eq 'viewer') { $need = @('tap:photoTile', 'screen:chat', 'screen:viewer', 'image:', 'vimage:') }
    elseif ($Step -eq 'downloads') { $need = @('tap:tabAccount', 'tap:accountDownloads', 'tap:tabChats', 'swipe:chatOlder', 'swipe:chatNewer', 'screen:home', 'screen:downloads') }
    # Batch photo1a: open-seed needs the home check of the proven restart, the chat check and -SeedIndex (no map key is new).
    elseif ($Step -eq 'open-seed') { $need = @('screen:home', 'screen:chat', 'seedidx:') }
    # Batch fixb3 (item 3): downloads also needs the scroll of the Account hub and the check of the scrolled hub (appended, so the old
    # gaps keep their order and text). Item 4: history-seed-kNN needs the keys of history and the home check of the proven restart.
    if ($Step -eq 'downloads') { $need = @($need) + @('swipe:accountDownloads', 'screen:accountScrolled') }
    if ($Step -cmatch '\Ahistory-seed-k[0-9]{2}\z') { $need = @('swipe:historyOlder', 'screen:chat', 'screen:home', 'count:historyMaxSwipes') }
    foreach ($n in $need) {
        $kind, $name = $n -split ':', 2
        $gap = ''
        if ($kind -eq 'screen') { $gap = Get-ScreenGap $name }
        elseif ($kind -eq 'tap') { $gap = Get-TapGap $name }
        elseif ($kind -eq 'swipe') { $gap = Get-SwipeGap $name }
        elseif ($kind -eq 'seed') { $gap = Get-SeedGap ([int]$name) }
        elseif ($kind -eq 'count') { if ($script:Tm[$name] -lt 1) { $gap = ('a52s.json timing.' + $name + ' is 0') } }
        elseif ($kind -eq 'image') { if ($script:ImageSeed -lt 0) { $gap = 'walk.local.json has no valid imageChatAddress (the image seed of speed batch 1a)' } }
        elseif ($kind -eq 'key') {
            if ($script:FileSeed[$name] -lt 0) {
                if ($script:FileKeyNote.ContainsKey($name)) { $gap = $script:FileKeyNote[$name] }
                else { $gap = ('walk.local.json has no valid ' + $name + ' (the file seed of batch filewalk)') }
            }
        }
        elseif ($kind -eq 'vimage') { if (-not $script:ImageViewerOk) { $gap = 'walk.local.json imageChatAddress is not the address of an image seed (Seed 51-53): viewer refused' } }
        elseif ($kind -eq 'seedidx') { if ($script:SeedIdx.Count -lt 1) { $gap = 'no -SeedIndex was given (open-seed needs the dev-seed indexes, 0-55)' } }
        if ($gap) { return $gap }
    }
    return ''
}

function Get-TapText([string]$Name) {
    $tap = Get-Field (Get-Field $script:Cfg 'taps') $Name
    return ('input tap ' + [int](Get-Field $tap 'x') + ' ' + [int](Get-Field $tap 'y'))
}

function Get-SwipeText([string]$Name) {
    $sw = Get-Field (Get-Field $script:Cfg 'swipes') $Name
    return ('input swipe ' + [int](Get-Field $sw 'x1') + ' ' + [int](Get-Field $sw 'y1') + ' ' + [int](Get-Field $sw 'x2') + ' ' +
        [int](Get-Field $sw 'y2') + ' ' + [int](Get-Field $sw 'ms'))
}

# ---------------------------------------------------------------- phone output readers
function Read-Stamp([string]$Text) {
    # First line of the shell output = the phone clock, e.g. 11-12T17:45:10.123456789 -> 11-12T17:45:10.123
    $first = Get-FirstLine $Text
    $o = @{ T0 = $null; Note = '' }
    if ($first -cmatch '^([0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2})\.([0-9]{3})[0-9]*\z') { $o.T0 = $Matches[1] + '.' + $Matches[2] }
    elseif ($first -match '%N|\.N\z|:[0-9]{2}\z') { $o.Note = 'phone date has no %N' }
    else { $o.Note = 'no phone clock stamp in the shell output' }
    return $o
}

function Set-RepStamp($Rec, [string]$Text) {
    $s = Read-Stamp $Text
    if ($s.T0) { $Rec['t0'] = $s.T0 }
    else { throw ('ADBWALK-REP: ' + $s.Note) }
}

function Set-RepStamp2($Rec, [string]$Text) {
    # Batch filewalk: the second stamp of a rep (before the first swipe / the BACK), same phone-clock format as t0.
    $s = Read-Stamp $Text
    if ($s.T0) { $Rec['stamp2'] = $s.T0 }
    else { throw ('ADBWALK-REP: ' + $s.Note + ' (stamp2)') }
}

function Read-AmOutput([string]$Text) {
    $o = @{ Am = [ordered]@{}; Notes = (New-Object System.Collections.Generic.List[string]); Error = '' }
    $total = $null; $wait = $null; $state = $null
    foreach ($l in (Split-Lines $Text)) {
        $t = Get-Clean $l
        if ($t -cmatch '^TotalTime:\s*([0-9]{1,9})\z') { $total = [int]$Matches[1] }
        elseif ($t -cmatch '^WaitTime:\s*([0-9]{1,9})\z') { $wait = [int]$Matches[1] }
        elseif ($t -cmatch '^LaunchState:\s*([A-Z]{1,10})\z') { $state = $Matches[1] }
        elseif ($t.StartsWith('Status:', [System.StringComparison]::Ordinal)) {
            if ($t -cmatch '^Status:\s*([A-Za-z_]{1,20})\z') { if ($Matches[1] -cne 'ok') { $o.Notes.Add('am Status: ' + $Matches[1]) } }
            else { $o.Notes.Add('am Status: (unreadable)') }
        }
        elseif ($t -match 'current task has been brought to the front') { $o.Notes.Add('am: task brought to the front (intent not delivered)') }
        elseif ($t -match 'delivered to currently running top-most instance') { $o.Notes.Add('am: intent delivered to the running instance') }
        elseif ($t -match '^Error' -or $t -match 'Exception') { if (-not $o.Error) { $o.Error = Get-SafeNote $t } }
    }
    if ($null -ne $total) { $o.Am['totalTime'] = $total }
    if ($null -ne $wait) { $o.Am['waitTime'] = $wait }
    if ($null -ne $state) { $o.Am['launchState'] = $state }
    return $o
}

function Test-AppFront {
    # The focus line itself never leaves this function: it may name another app.
    # Exact shape only, e.g. mCurrentFocus=Window{8db8463 u0 com.ixilabs.spixi.dev/crc64e0b33a801f5f9986.MainActivity}
    $r = Invoke-Shell 'dumpsys window | grep -e mCurrentFocus='
    $re = '^mCurrentFocus=Window\{[0-9a-f]{1,16} u[0-9]{1,3} ' + [regex]::Escape($script:Pkg) + '/[A-Za-z0-9_.]{1,200}\}\z'
    foreach ($l in (Split-Lines $r.StdOut)) {
        $t = Get-Clean $l
        if ($t.StartsWith('mCurrentFocus=', [System.StringComparison]::Ordinal) -and -not $t.StartsWith('mCurrentFocus=null', [System.StringComparison]::Ordinal)) {
            return [bool]($t -cmatch $re)
        }
    }
    return $false
}

function Invoke-Back {
    # BACK only while our app has the focus; a foreign window gets no key at all. Returns: BACK sent.
    if (-not (Test-AppFront)) { return $false }
    [void](Invoke-Shell 'input keyevent 4')
    return $true
}

function Invoke-BackReq {
    if (-not (Invoke-Back)) { throw 'ADBWALK-NOSCREEN: foreign window in front (BACK not sent)' }
}

function Assert-AppFront {
    if (-not (Test-AppFront)) { throw 'ADBWALK-NOSCREEN: foreign window in front (input skipped)' }
}

function Get-ScreenState {
    $o = @{ Awake = $false; Locked = $false; Why = '' }
    $p = Invoke-Shell 'dumpsys power | grep -e mWakefulness='
    $o.Awake = ($p.StdOut -cmatch 'mWakefulness=Awake')
    $w = Invoke-Shell 'dumpsys window | grep -e mDreamingLockscreen= -e isKeyguardShowing= -e mShowingLockscreen= -e mKeyguardShowing= -e mCurrentFocus='
    $a = Invoke-Shell 'dumpsys activity activities | grep -e mKeyguardShowing='
    $txt = $w.StdOut + "`n" + $a.StdOut
    if ($txt -cmatch '(mDreamingLockscreen|isKeyguardShowing|mShowingLockscreen|mKeyguardShowing)=true') {
        $o.Locked = $true; $o.Why = $Matches[0]
    } elseif ($w.StdOut -cmatch 'mCurrentFocus=[^\r\n]*(NotificationShade|Keyguard|Bouncer)') {
        $o.Locked = $true; $o.Why = 'a system window has the focus'
    }
    return $o
}

# ---------------------------------------------------------------- screenshots and probes
function Initialize-Drawing {
    if ($script:DrawingState -eq 0) {
        # Loading the assembly is not enough (on Linux it loads, then fails on first use): make one bitmap.
        try {
            Add-Type -AssemblyName System.Drawing
            $probe = New-Object System.Drawing.Bitmap(1, 1)
            $probe.Dispose()
            $script:DrawingState = 1
        } catch { $script:DrawingState = 2 }
    }
    return ($script:DrawingState -eq 1)
}

function Get-PngSize([string]$Path) {
    # Read the IHDR chunk directly: the size check needs no System.Drawing and decodes nothing.
    if (-not $Path -or -not (Test-Path -LiteralPath $Path)) { return $null }
    $buf = New-Object byte[] 24
    $fs = [System.IO.File]::OpenRead($Path)
    try { $n = $fs.Read($buf, 0, 24) } finally { $fs.Dispose() }
    if ($n -lt 24) { return $null }
    $sig = @(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82)
    for ($i = 0; $i -lt 16; $i++) { if ($i -lt 8 -or $i -ge 12) { if ($buf[$i] -ne $sig[$i]) { return $null } } }
    $w = ([long]$buf[16] * 16777216) + ([long]$buf[17] * 65536) + ([long]$buf[18] * 256) + [long]$buf[19]
    $h = ([long]$buf[20] * 16777216) + ([long]$buf[21] * 65536) + ([long]$buf[22] * 256) + [long]$buf[23]
    return @{ W = $w; H = $h }
}

function Get-ScreenProbeSets($Scr) {
    # Batch walktools (item 2): the probe sets of a screen as a list of @{ Name; Probes; Min; IsSets }: the old form is ONE entry (Name '',
    # IsSets $false, its own probes and minMatch), the sets form is its sets in the order of the file. Min is the raw value (the caller casts
    # it inside its try, as the old Test-Probes did). The screen was validated by Get-ScreenGap.
    $list = New-Object System.Collections.Generic.List[object]
    if (Test-HasField $Scr 'sets') {
        foreach ($st in @(Get-Field $Scr 'sets')) { $list.Add(@{ Name = [string](Get-Field $st 'name'); Probes = @(Get-Field $st 'probes'); Min = (Get-Field $st 'minMatch'); IsSets = $true }) }
    } else {
        $list.Add(@{ Name = ''; Probes = @(Get-Field $Scr 'probes'); Min = (Get-Field $Scr 'minMatch'); IsSets = $false })
    }
    return ,$list
}

function Test-ProbeSetPixels($Probes, [int]$Min, $Pixels) {
    # Batch walktools (item 2): the pure decision "does this probe set match these pixels", taken out of Test-Probes: no System.Drawing, so
    # it runs on Linux too. $Pixels[i] = @(R, G, B) = the pixel read at the point of $Probes[i]. The arithmetic is the old inline loop's.
    $r = @{ Ok = $false; Matched = 0; Of = @($Probes).Count; Detail = (New-Object System.Collections.Generic.List[object]) }
    $i = 0
    foreach ($pr in $Probes) {
        $x = [int](Get-Field $pr 'x'); $y = [int](Get-Field $pr 'y'); $tol = [int](Get-Field $pr 'tol')
        $hex = ([string](Get-Field $pr 'rgb')).Substring(1)
        $wr = [Convert]::ToInt32($hex.Substring(0, 2), 16)
        $wg = [Convert]::ToInt32($hex.Substring(2, 2), 16)
        $wb = [Convert]::ToInt32($hex.Substring(4, 2), 16)
        $c = $Pixels[$i]
        $i++
        $hit = ([math]::Abs([int]$c[0] - $wr) -le $tol) -and ([math]::Abs([int]$c[1] - $wg) -le $tol) -and ([math]::Abs([int]$c[2] - $wb) -le $tol)
        if ($hit) { $r.Matched++ }
        $r.Detail.Add([ordered]@{ x = $x; y = $y; want = ('#' + $hex.ToUpperInvariant()); actual = ('#{0:X2}{1:X2}{2:X2}' -f [int]$c[0], [int]$c[1], [int]$c[2]); tol = $tol; match = [bool]$hit })
    }
    $r.Ok = ($r.Matched -ge $Min)
    return $r
}

function Get-ProbeVerdict($Sets, $PixelLists) {
    # Batch walktools (item 2): the verdict of a screen from its sets ($Sets of Get-ScreenProbeSets) and the pixels of each set
    # ($PixelLists[k] = the pixels of $Sets[k], as Test-ProbeSetPixels takes them). Pure, no System.Drawing.
    # The old form (one entry, IsSets $false): the old result, byte for byte (Note 'probes m of n match (minMatch k)' when it fails).
    # The sets form: Ok when AT LEAST ONE set passes; Set = the first passing set in file order, Matched / Of = that set's; when none
    # passes Matched / Of stay $null (no number of a set that was not the one) and Note names EVERY set's count in the compact form
    # 'no set matches: light 2/4 (4), dark 0/4 (4)' (matched/of, then the minMatch in brackets; a rep note is cut at 120 characters by Get-SafeNote). Sets = one line per set.
    $v = @{ Ok = $false; Note = ''; Matched = 0; Of = 0; Set = ''; Sets = (New-Object System.Collections.Generic.List[object]); Detail = (New-Object System.Collections.Generic.List[object]) }
    if (-not $Sets[0].IsSets) {
        $res = Test-ProbeSetPixels $Sets[0].Probes ([int]$Sets[0].Min) $PixelLists[0]
        $v.Ok = $res.Ok; $v.Matched = $res.Matched; $v.Of = $res.Of; $v.Detail = $res.Detail
        if (-not $v.Ok) { $v.Note = 'probes ' + $v.Matched + ' of ' + $v.Of + ' match (minMatch ' + [int]$Sets[0].Min + ')' }
        return $v
    }
    $parts = New-Object System.Collections.Generic.List[string]
    for ($k = 0; $k -lt $Sets.Count; $k++) {
        $min = [int]$Sets[$k].Min
        $res = Test-ProbeSetPixels $Sets[$k].Probes $min $PixelLists[$k]
        $v.Sets.Add([ordered]@{ set = $Sets[$k].Name; matched = $res.Matched; of = $res.Of; minMatch = $min; ok = [bool]$res.Ok })
        foreach ($d in $res.Detail) { $d['set'] = $Sets[$k].Name; $v.Detail.Add($d) }
        $parts.Add($Sets[$k].Name + ' ' + $res.Matched + '/' + $res.Of + ' (' + $min + ')')
        if ($res.Ok -and -not $v.Ok) { $v.Ok = $true; $v.Set = $Sets[$k].Name; $v.Matched = $res.Matched; $v.Of = $res.Of }
    }
    if (-not $v.Ok) { $v.Matched = $null; $v.Of = $null; $v.Note = 'no set matches: ' + ($parts -join ', ') }
    return $v
}

function Test-Probes([string]$Path, [string]$Name) {
    # Batch walktools (item 2): the PNG reading stays here (System.Drawing); the pixel of every probe of every set is read, the decision is
    # Get-ProbeVerdict. The old form gives the old result; the sets form adds Set, Sets and (in Detail) the set of each probe.
    $o = @{ Ok = $false; Note = ''; Matched = 0; Of = 0; Set = ''; Sets = (New-Object System.Collections.Generic.List[object]); Detail = (New-Object System.Collections.Generic.List[object]) }
    $scr = Get-Field (Get-Field $script:Cfg 'screens') $Name
    $sets = Get-ScreenProbeSets $scr
    if (-not $sets[0].IsSets) { $o.Of = $sets[0].Probes.Count } else { $o.Matched = $null; $o.Of = $null }
    if (-not (Initialize-Drawing)) { $o.Note = 'cannot read PNG'; return $o }
    $ms = $null
    $bmp = $null
    try {
        # A memory copy: the PNG on disk is never locked.
        $bytes = [System.IO.File]::ReadAllBytes($Path)
        $ms = New-Object System.IO.MemoryStream(, $bytes)
        $bmp = New-Object System.Drawing.Bitmap($ms)
        $lists = New-Object System.Collections.Generic.List[object]
        foreach ($st in $sets) {
            $pix = New-Object System.Collections.Generic.List[object]
            foreach ($pr in $st.Probes) {
                $c = $bmp.GetPixel([int](Get-Field $pr 'x'), [int](Get-Field $pr 'y'))
                $pix.Add(@([int]$c.R, [int]$c.G, [int]$c.B))
            }
            $lists.Add($pix)
        }
        $o = Get-ProbeVerdict $sets $lists
    } catch {
        $o.Ok = $false
        $o.Note = 'cannot read PNG'
        $o.Detail.Clear()
    } finally {
        if ($bmp) { $bmp.Dispose() }
        if ($ms) { $ms.Dispose() }
    }
    return $o
}

function Test-Screen([string]$Png, [string]$Name) {
    # Focus was checked before the screenshot; here: (2) the PNG size, then (3) at least minMatch probes.
    # Batch walktools (item 2): a pass of the sets form also carries Set = the name of the set that passed ('' for the old form); a failure carries
    # Sets = the number of sets that were judged (0 for the old form and for a PNG that could not be read). The walk's rep notes do NOT name the passing set
    # (a rep note is cut at 120 characters: the success note would eat the room of a failure note); calibrate.json keeps the set of each check.
    $size = Get-PngSize $Png
    if ($null -eq $size) { return @{ Ok = $false; Note = 'screenshot is not a PNG' } }
    if ($size.W -ne $script:W -or $size.H -ne $script:H) {
        return @{ Ok = $false; Note = ('screenshot is ' + $size.W + 'x' + $size.H + ', a52s.json wants ' + $script:W + 'x' + $script:H) }
    }
    $pr = Test-Probes $Png $Name
    if (-not $pr.Ok) { return @{ Ok = $false; Note = $pr.Note; Sets = [int]$pr.Sets.Count } }
    return @{ Ok = $true; Note = ''; Set = $pr.Set }
}

function Save-Shot([string]$LocalName) {
    $local = Join-Path $script:RunDir $LocalName
    if (Test-Path -LiteralPath $local) { throw ('ADBWALK-REP: ' + $LocalName + ' exists already') }
    [void](Invoke-ShellReq ('screencap -p ' + $script:PhoneShot))
    $r = Invoke-Adb -AdbArgs @('pull', $script:PhoneShot, $local) -TimeoutSec 120
    [void](Invoke-Shell ('rm -f ' + $script:PhoneShot))
    if ($r.ExitCode -ne 0 -or $r.TimedOut -or -not (Test-Path -LiteralPath $local)) {
        $left = ''
        if (-not (Remove-LocalFile $local)) { $left = ', local file not deleted' }
        throw ('ADBWALK-REP: screenshot ' + (Get-AdbWhy $r) + $left)
    }
    return $local
}

function Save-Log([string]$LocalName) {
    # Filtered ON THE PHONE (app pid + emitter shapes), then pulled byte-exact. Returns a note ('' = pulled).
    $local = Join-Path $script:RunDir $LocalName
    if (Test-Path -LiteralPath $local) { throw ('ADBWALK-REP: ' + $LocalName + ' exists already') }
    $script:LastPullPid = ''
    $p = Invoke-Shell ('pidof ' + $script:Pkg)
    $ids = @(Get-Pids $p.StdOut)
    if ($ids.Count -eq 1) { $script:LastPullPid = [string]$ids[0] }
    if ($ids.Count -ne 1) {
        [System.IO.File]::WriteAllBytes($local, (New-Object byte[] 0))
        if ($ids.Count -eq 0) { return 'app not running at pull' }
        return 'several app pids at pull'
    }
    $w = Invoke-Shell (Get-LogPullCmd $ids[0])
    # The shell returns grep's status: 1 = no matching line (an empty file, the parser says no data), not an error.
    if ($w.TimedOut -or ($w.ExitCode -ne 0 -and $w.ExitCode -ne 1)) {
        [void](Invoke-Shell ('rm -f ' + $script:PhoneLog))
        throw ('ADBWALK-REP: filtered log write failed (exit ' + $w.ExitCode + '): ' + (Get-AdbWhy $w))
    }
    $r = Invoke-Adb -AdbArgs @('pull', $script:PhoneLog, $local) -TimeoutSec 120
    [void](Invoke-Shell ('rm -f ' + $script:PhoneLog))
    if ($r.ExitCode -ne 0 -or $r.TimedOut -or -not (Test-Path -LiteralPath $local)) {
        $left = ''
        if (-not (Remove-LocalFile $local)) { $left = ', local file not deleted' }
        throw ('ADBWALK-REP: log ' + (Get-AdbWhy $r) + $left)
    }
    return ''
}

# ---------------------------------------------------------------- processes and memory
function Get-ServiceBlocks([string]$Text) {
    # A block starts at a line containing "ServiceRecord{".
    $blocks = New-Object System.Collections.Generic.List[string]
    $cur = $null
    foreach ($l in (Split-Lines $Text)) {
        if ($l.Contains('ServiceRecord{')) {
            if ($null -ne $cur) { $blocks.Add($cur.ToString()) }
            $cur = New-Object System.Text.StringBuilder
        }
        if ($null -ne $cur) { [void]$cur.AppendLine($l) }
    }
    if ($null -ne $cur) { $blocks.Add($cur.ToString()) }
    return $blocks
}

function Find-Renderer {
    # Only a CONFIRMED renderer is returned: RendererPid stays empty otherwise (never a guess).
    $o = @{ AppPid = $null; RendererPid = $null; Confirmed = $false; Note = ''; CandCount = 0
        OwnPsLines = (New-Object System.Collections.Generic.List[string]); RawLines = (New-Object System.Collections.Generic.List[string]) }
    $r = Invoke-Shell ('pidof ' + $script:Pkg)
    $ids = @(Get-Pids $r.StdOut)
    if ($ids.Count -eq 0) { $o.Note = 'app not running (pidof gave no pid)'; return $o }
    if ($ids.Count -gt 1) { $o.Note = 'pidof gave several pids'; return $o }
    $o.AppPid = [int]$ids[0]
    $ps = Invoke-Shell 'ps -A | grep -e sandboxed'
    if ($ps.TimedOut -or ($ps.ExitCode -ne 0 -and $ps.ExitCode -ne 1)) { $o.Note = 'ps -A failed (exit ' + $ps.ExitCode + ')'; return $o }
    $cands = @{}
    $providers = @{}
    foreach ($l in (Split-Lines $ps.StdOut)) {
        $tok = @((Get-Clean $l) -split '[ \t]+')
        if ($tok.Count -lt 3) { continue }
        $name = $tok[$tok.Count - 1]
        if ($tok[1] -cmatch '^[0-9]{1,9}\z' -and $name -cmatch '^([A-Za-z0-9_]+(\.[A-Za-z0-9_]+)+):sandboxed_process' -and $Matches[1].Length -le 100) {
            $cands[[int]$tok[1]] = (Get-Clean $l)
            $providers[$Matches[1]] = $true
        }
    }
    $o.CandCount = $cands.Count
    if ($cands.Count -eq 0) { $o.Note = 'no :sandboxed_process renderer found'; return $o }

    # 1) AOSP files an external isolated service under the CLIENT package: <our pkg>/...SandboxedProcessService0:0.
    $s = Invoke-Shell ('dumpsys activity services ' + $script:Pkg)
    if ($s.TimedOut -or $s.ExitCode -ne 0) { $o.Note = 'dumpsys activity services ' + $script:Pkg + ' failed (exit ' + $s.ExitCode + ')'; return $o }
    foreach ($l in (Split-Lines $s.StdOut)) {
        if ($l.Contains('ServiceRecord{') -or $l.Contains('app=ProcessRecord') -or $l.Contains('processName=') -or $l.Contains('packageName=')) { $o.RawLines.Add((Get-SafeNote (Get-Clean $l) 300)) }
    }
    $own = @{}
    foreach ($bl in (Get-ServiceBlocks $s.StdOut)) {
        $first = @(Split-Lines $bl)[0]
        if (-not $first.Contains('SandboxedProcessService')) { continue }
        if ($bl -cmatch 'app=ProcessRecord\{[0-9a-f]+ ([0-9]{1,9}):') {
            $rp = [int]$Matches[1]
            if ($cands.ContainsKey($rp)) { $own[$rp] = $true }
        }
    }
    foreach ($k in $own.Keys) { $o.OwnPsLines.Add((Get-SafeNote $cands[$k] 300)) }
    if ($own.Count -eq 1) {
        foreach ($k in $own.Keys) { $o.RendererPid = [int]$k }
        $o.Confirmed = $true
        return $o
    }
    if ($own.Count -gt 1) { $o.Note = [string]$own.Count + ' renderers filed under the app: cannot tell apart'; return $o }

    # 2) Fallback: blocks of the WebView provider package that name our pid or package as a client.
    $pe = [regex]::Escape($script:Pkg)
    $usRe = '(?<![A-Za-z0-9_.])(' + $o.AppPid + ':)?' + $pe + '(?![A-Za-z0-9_.])'
    $ours = @{}
    foreach ($prov in $providers.Keys) {
        $s2 = Invoke-Shell ('dumpsys activity services ' + $prov)
        if ($s2.TimedOut -or $s2.ExitCode -ne 0) { $o.Note = 'dumpsys activity services ' + $prov + ' failed (exit ' + $s2.ExitCode + ')'; return $o }
        foreach ($bl in (Get-ServiceBlocks $s2.StdOut)) {
            if ($bl -cnotmatch 'app=ProcessRecord\{[0-9a-f]+ ([0-9]{1,9}):') { continue }
            $rp = [int]$Matches[1]
            if ($cands.ContainsKey($rp) -and $bl -cmatch $usRe) { $ours[$rp] = $true }
        }
    }
    if ($ours.Count -eq 1) {
        foreach ($k in $ours.Keys) { $o.RendererPid = [int]$k }
        $o.Confirmed = $true
    } elseif ($ours.Count -gt 1) {
        $o.Note = [string]$ours.Count + ' renderers name the app: cannot tell apart'
    } else {
        $o.Note = 'renderer cannot be told apart (' + $cands.Count + ' sandboxed processes)'
    }
    return $o
}

function Save-Meminfo([int]$ProcId, [string]$LocalName) {
    $r = Invoke-Shell ('dumpsys meminfo ' + $ProcId)
    if ($r.ExitCode -ne 0 -or $r.TimedOut -or $r.StdOut -cnotmatch ('MEMINFO in pid ' + $ProcId + '[^0-9]')) {
        return ('dumpsys meminfo ' + $ProcId + ' gave no MEMINFO: ' + (Get-AdbWhy $r))
    }
    Write-RawFile (Join-Path $script:RunDir $LocalName) $r.StdOut
    return ''
}

# ---------------------------------------------------------------- restore state (survives a killed run)
function Get-DeviceFingerprint {
    # 16 hex chars of SHA-256 of the serial: ties a pending restore to one phone without storing the serial.
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { $h = $sha.ComputeHash($script:Utf8.GetBytes($script:DevSerial)) } finally { $sha.Dispose() }
    return (([System.BitConverter]::ToString($h)).Replace('-', '').Substring(0, 16).ToLowerInvariant())
}

function Write-Pending {
    $d = [ordered]@{ device = (Get-DeviceFingerprint); stayOld = $script:StayOld; wifiTouched = [bool]$script:WifiTouched; pid = $PID; started = $script:StartedIso }
    # Temp file + move: a crash mid-write never leaves a half file.
    $tmp = $script:PendingPath + '.tmp'
    [System.IO.File]::WriteAllText($tmp, (ConvertTo-Json -InputObject $d -Depth 8), $script:Utf8)
    if ([System.IO.File]::Exists($script:PendingPath)) { [System.IO.File]::Replace($tmp, $script:PendingPath, [NullString]::Value) }
    else { [System.IO.File]::Move($tmp, $script:PendingPath) }
    $script:PendingWritten = $true
}

function Invoke-PendingRestore {
    if (-not [System.IO.File]::Exists($script:PendingPath)) { return }
    Say-Log 'pending restore file found: an interrupted run left the phone changed'
    try { $pd = Read-JsonFile $script:PendingPath } catch { Stop-Walk 'the pending restore file is unreadable: restore the phone by hand, then delete the file' }
    # A file of another phone (or an older file without a fingerprint) is never applied here.
    if (-not (Test-Ordinal ([string](Get-Field $pd 'device')) (Get-DeviceFingerprint))) {
        Stop-Walk ([System.IO.Path]::GetFileName($script:PendingPath) + ' belongs to another phone: attach that phone, or delete the file')
    }
    $so = [string](Get-Field $pd 'stayOld')
    $wt = (Get-Field $pd 'wifiTouched') -eq $true
    if ($so -cnotmatch '^([0-9]|1[0-5])\z') {
        if ($wt) { [void](Invoke-Shell 'svc wifi enable') }
        Stop-Walk 'the pending restore file has a stayOld outside 0..15 (file kept): fix or delete the file'
    }
    $ok = $true
    if ($wt) { $ok = ((Invoke-Shell 'svc wifi enable').ExitCode -eq 0) -and $ok }
    $ok = ((Invoke-Shell ('settings put global stay_on_while_plugged_in ' + $so)).ExitCode -eq 0) -and $ok
    if (-not $ok) { Stop-Walk 'cannot apply the pending restore file (kept): check the phone' }
    [System.IO.File]::Delete($script:PendingPath)
    Say-Log 'restored the phone state left by an interrupted run'
}

function Restore-Phone {
    # Phone commands first, console output last: on Ctrl+C a console write must not skip a restore.
    if (-not $script:PendingWritten) { return }
    $msgs = New-Object System.Collections.Generic.List[string]
    $allOk = $true
    if ($script:WifiTouched) {
        $ok1 = $false
        try { $ok1 = ((Invoke-Shell 'svc wifi enable').ExitCode -eq 0) } catch { }
        if ($ok1) { $msgs.Add('finally: Wi-Fi enabled') } else { $allOk = $false; $msgs.Add('finally: WARNING svc wifi enable failed: turn Wi-Fi on by hand') }
    }
    if ($null -ne $script:StayOld) {
        $cmd = 'settings put global stay_on_while_plugged_in ' + $script:StayOld
        $ok2 = $false
        try { $ok2 = ((Invoke-Shell $cmd).ExitCode -eq 0) } catch { }
        if ($ok2) { $msgs.Add('finally: stay_on_while_plugged_in restored to ' + $script:StayOld) }
        else { $allOk = $false; $msgs.Add('finally: WARNING restore failed: run "adb shell ' + $cmd + '" by hand') }
    }
    try { [void](Invoke-Shell ('rm -f ' + $script:PhoneShot)) } catch { }
    try { [void](Invoke-Shell ('rm -f ' + $script:PhoneLog)) } catch { }
    if ($allOk) { try { [System.IO.File]::Delete($script:PendingPath) } catch { } }
    else { $script:RestoreFailed = $true; $msgs.Add('finally: the pending restore file is kept: the next run applies it first') }
    foreach ($m in $msgs) { try { Write-WalkLog $m; Say $m } catch { } }
}

# ---------------------------------------------------------------- reps
function New-Rep([string]$Step, [int]$Rep) {
    return @{ step = $Step; rep = $Rep; status = 'ok'; notes = (New-Object System.Collections.Generic.List[string]) }
}

function Add-Note($Rec, [string]$Text) {
    if ($Text) { $Rec.notes.Add((Protect-Text $Text)) }
}

function Get-Nn([int]$Rep) { return $Rep.ToString('00', $script:Inv) }

function Save-RunJson([bool]$Finished) {
    if ($script:Mode -ne 'walk' -or -not $script:RunDir -or -not $script:WalkStarted) { return }
    $doc = [ordered]@{ schema = 1; tool = 'adb-walk'; run = $script:RunName; mode = 'walk' }
    if ($script:Hook) { $doc['adbHook'] = $true }
    $doc['device'] = $script:DevInfo
    $doc['app'] = $script:AppInfo
    $flg = [ordered]@{ asked = $null; logged = 'not read'; ok = $true }
    if ($script:FlagsAsked) { $flg['asked'] = $script:FlagsAsked }
    if ($script:FlagsLogged) { $flg['logged'] = $script:FlagsLogged }
    $flg['ok'] = [bool]$script:FlagsOk
    if ($script:FlagsStop) { $flg['stop'] = $script:FlagsStop }
    $doc['flags'] = $flg
    $doc['repeats'] = $script:RepeatsN
    $doc['stepsRequested'] = [string[]]$script:StepsReq
    if ($script:SeedIdx.Count -gt 0) { $doc['seedIndex'] = [int[]]$script:SeedIdx }
    if ($script:HistSeedIdx -ge 0) { $doc['historySeed'] = [int]$script:HistSeedIdx }
    # Batch walktools2 (item 2): the fixed wait of coldstart-watch, only in a run that asked for the step (an old run.json is unchanged).
    if ($script:StepsReq -contains 'coldstart-watch') { $doc['coldstartWatch'] = [ordered]@{ waitSec = [int]$script:WatchWaitSec } }
    $doc['reps'] = $script:Reps
    $doc['memory'] = $script:Mem
    $doc['finished'] = $Finished
    Write-JsonFile (Join-Path $script:RunDir 'run.json') $doc
}

function Complete-Rep($Rec, [int]$Of) {
    $out = [ordered]@{ step = $Rec.step; rep = $Rec.rep; status = $Rec.status }
    foreach ($k in @('t0', 'stamp2', 'log', 'shot', 'shotPre', 'screen', 'screenOk', 'swipes', 'am')) { if ($Rec.ContainsKey($k)) { $out[$k] = $Rec[$k] } }
    # Batch fixb3 (item 4): the page requests of a history-seed rep (a whole number; 0 = no older page: the parser says "no data").
    if ($Rec.ContainsKey('pages')) { $out['pages'] = [int]$Rec['pages'] }
    # Batch walktools2 (item 2): the proof facts of a coldstart-watch rep (pids, front, the evidence pulls); no other rep has the key.
    if ($Rec.ContainsKey('watch')) { $out['watch'] = $Rec['watch'] }
    $full = ($Rec.notes -join ', ')
    $out['note'] = Get-SafeNote $full
    $script:Reps.Add($out)
    # error and no-screen both count toward the halt; only ok resets it.
    if ($Rec.status -eq 'error' -or $Rec.status -eq 'no-screen') {
        $script:ErrStreak++
        $script:NeedRecover = $true; $script:LastFailed = $true
    } elseif ($Rec.status -eq 'ok') {
        $script:ErrStreak = 0
        $script:NeedRecover = $false; $script:LastFailed = $false
    }
    # #46 r1 (S-W-1): a file-walk rep whose restart was PROVEN (the app is new and on Chats): no recovery BACK follows.
    if ($script:FileResetOk) { $script:FileResetOk = $false; $script:NeedRecover = $false; $script:LastFailed = $false }
    Save-RunJson $false
    $line = '[' + $Rec.step + ' ' + $Rec.rep + '/' + $Of + '] ' + $Rec.status
    if ($Rec.ContainsKey('am') -and $Rec['am'].Contains('totalTime')) { $line += ' TotalTime=' + $Rec['am']['totalTime'] }
    if ($full) { $line += ' - ' + (Get-SafeNote $full) }
    Say-Log $line
    if ($script:ErrStreak -ge 3 -and -not $script:Halted) {
        $script:Halted = $true
        Say-Log 'three failed reps in a row: the walk stops here (is the phone still attached, unlocked, the app in front?)'
    }
}

function Invoke-EnsureHome {
    # Bounded recovery. Focus FIRST: our app in front after a failure -> one BACK; a foreign window gets no key,
    # only the single "am start -W -n" that brings our app to the front. Returns: app in front.
    if (-not $script:NeedRecover) { return $true }
    $script:NeedRecover = $false
    $front = Test-AppFront
    if ($front -and $script:LastFailed) {
        Write-WalkLog 'recover: back once'
        if (Invoke-Back) { Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs' }
        $front = Test-AppFront
    }
    $script:LastFailed = $false
    if ($front) { return $true }
    Say-Log '  recover: the app is not in front: am start'
    [void](Invoke-Shell ('am start -W -n ' + $script:Comp) 60)
    Wait-Sec $script:Tm['coldStartSettleSec'] 'coldStartSettleSec'
    if (Test-AppFront) { return $true }
    $script:NeedRecover = $true
    return $false
}

function Reset-AppToChats {
    # After a tab rep that failed past its tab tap (or a cal-11 that failed): Wallet, Account or Apps may be in front,
    # and the recovery BACK would only move the task to the back (am start -W then resumes the same view). A cold start
    # always boots on the Chats tab. The coldstart pair of commands; Invoke-Shell, so this never throws on a failed exit.
    [void](Invoke-Shell ('am force-stop ' + $script:Pkg))
    [void](Invoke-Shell ('am start -W -n ' + $script:Comp) 60)
    Wait-Sec $script:Tm['coldStartSettleSec'] 'coldStartSettleSec'
    Say-Log '  tab step: the app was restarted after a failed tab rep (a cold start lands on Chats)'
    # -Flags: the new process has no proven switch state: the run ends here (no re-proof).
    if ($script:FlagsAsked) { Stop-Flags 'unproven-process' }
}

function Invoke-ShotCheck($Rec, [string]$Expect, [switch]$DropOnFail) {
    # -DropOnFail (tab steps): a PNG whose probe check fails is deleted and not recorded (it may show Wallet or Account).
    if ($Expect) { $Rec['screen'] = $Expect }
    # Focus BEFORE screencap: a foreign window is never photographed.
    if (-not (Test-AppFront)) {
        if ($Expect) { $Rec['screenOk'] = $false }
        if ($Rec.status -eq 'ok') { $Rec.status = 'no-screen' }
        Add-Note $Rec 'foreign window in front (no screenshot)'
        return
    }
    $name = 'shot-' + $Rec.step + '-' + (Get-Nn $Rec.rep) + '.png'
    $local = Save-Shot $name
    if (-not (Test-AppFront)) {
        $gone = Remove-LocalFile $local
        if ($Expect) { $Rec['screenOk'] = $false }
        if ($Rec.status -eq 'ok') { $Rec.status = 'no-screen' }
        if ($gone) { Add-Note $Rec 'foreign window during the screenshot (PNG deleted)' }
        else { Add-Note $Rec 'foreign window during the screenshot, local file not deleted' }
        return
    }
    $dropped = $false
    if (-not $DropOnFail) { $Rec['shot'] = $name }
    if ($Expect) {
        $chk = Test-Screen $local $Expect
        $Rec['screenOk'] = [bool]$chk.Ok
        if (-not $chk.Ok) {
            if ($Rec.status -eq 'ok') { $Rec.status = 'no-screen' }
            if ($DropOnFail) {
                $dropped = $true
                if (Remove-LocalFile $local) { Add-Note $Rec ('PNG deleted: ' + $chk.Note) }
                else { Add-Note $Rec ($chk.Note + ', local file not deleted') }
            } else {
                Add-Note $Rec $chk.Note
            }
        }
    }
    if ($DropOnFail -and -not $dropped) { $Rec['shot'] = $name }
}

function Invoke-LogPull($Rec) {
    $name = 'android-walk-' + $Rec.step + '-' + (Get-Nn $Rec.rep) + '.txt'
    $n = Save-Log $name
    $Rec['log'] = $name
    if ($n) { Add-Note $Rec $n }
    # -Flags: every other rep must come from the process whose state line was read (a coldstart rep proves its own).
    if ($script:FlagsAsked -and $Rec.step -cne 'coldstart') { Assert-FlagsPid $Rec }
}

function Assert-FlagsPid($Rec) {
    if ($script:LastPullPid -and $script:FlagsPid -and (Test-Ordinal $script:LastPullPid $script:FlagsPid)) { return }
    Add-Note $Rec 'app process changed after the switch state was proven'
    $Rec.status = 'error'
    Complete-Rep $Rec $script:RepeatsN
    Stop-Flags 'unproven-process'
}

function Add-AmResult($Rec, $Am) {
    if ($Am.Am.Count -gt 0) { $Rec['am'] = $Am.Am }
    foreach ($n in $Am.Notes) { Add-Note $Rec $n }
}

function Get-FlagStates([string]$Path) {
    # The state lines of one pulled log (anchored, case-sensitive); each is RE-BUILT from its four captured digits
    # (warmidle=N sparerearm=N sparekeep=N noemptydetail=N). No raw line is kept. Unreadable = no state line.
    $out = New-Object System.Collections.Generic.List[string]
    try {
        if ((Test-Path -LiteralPath $Path -PathType Leaf) -and (New-Object System.IO.FileInfo($Path)).Length -le 4194304) {
            foreach ($line in ([regex]::Split([System.IO.File]::ReadAllText($Path), '\r\n|\n|\r'))) {
                if ($line.Length -gt 1000) { continue }
                $m = [regex]::Match($line, $script:FlagLineRe)
                if ($m.Success) {
                    $out.Add('warmidle=' + $m.Groups[1].Value + ' sparerearm=' + $m.Groups[2].Value + ' sparekeep=' + $m.Groups[3].Value + ' noemptydetail=' + $m.Groups[4].Value)
                }
            }
        }
    } catch { return @() }
    return $out.ToArray()
}

function Update-FlagsLogged($Rec) {
    # After a coldstart rep's log pull: run.json flags.logged = the last state line of that start. With -Flags a
    # different state line ENDS THE RUN: the rep is recorded as an error, then Stop-Flags (Stop-Walk throws
    # ADBWALK-STOP, which Invoke-Step rethrows and the main catch / finally handle: restore, run.json, exit 1).
    # Without -Flags this only records the state.
    if (-not $Rec.ContainsKey('log')) { return }
    $states = @(Get-FlagStates (Join-Path $script:RunDir $Rec['log']))
    if ($states.Count -eq 0) {
        # -Flags: a coldstart rep is a NEW process: its own log must hold its state line (none, an unreadable or an
        # oversized file = not proven).
        if ($script:FlagsAsked) {
            Add-Note $Rec 'no switch state line in the log of this start'
            $Rec.status = 'error'
            Complete-Rep $Rec $script:RepeatsN
            Stop-Flags 'no-state-line'
        }
        return
    }
    $script:FlagsLogged = $states[$states.Count - 1]
    if ($script:FlagsAsked) {
        foreach ($st in $states) {
            if (-not (Test-Ordinal $st $script:FlagsAskedState)) {
                $script:FlagsLogged = $st
                Add-Note $Rec 'switch state differs from the asked state'
                $Rec.status = 'error'
                Complete-Rep $Rec $script:RepeatsN
                Stop-Flags 'state-differs'
            }
        }
        $script:FlagsPid = $script:LastPullPid
    }
}

function Stop-Flags([string]$Code) {
    # A -Flags stop: fixed words on the console and in walk.log (STOP: ...), flags.stop in run.json, exit 1, no step.
    $script:FlagsOk = $false
    $script:FlagsStop = $Code
    $text = [string]$script:FlagsStopText[$Code]
    if ($Code -ceq 'state-differs') { $text += ': asked ' + $script:FlagsAskedState + ', logged ' + $script:FlagsLogged }
    Stop-Walk $text
}

function Invoke-FlagsSetup {
    # Batch perfb1toggle. Called only from Invoke-Walk, only when -Flags was given; the ONE place that builds the
    # perfb1flags start. The app STORES the state at the extra start and acts at the NEXT start (cold start below).
    if (-not $script:FlagsAsked) { return }
    Say-Log ('flags: asking the app for ' + $script:FlagsAskedState + ' (the four developer preferences stay changed after the run)')
    # The extra always arrives at a fresh launch: force-stop first.
    [void](Invoke-ShellReq ('am force-stop ' + $script:Pkg))
    [void](Invoke-ShellReq 'logcat -c')
    $r = Invoke-Shell ('am start -n ' + $script:Comp + ' --es perfb1flags ' + $script:FlagsAsked) 60
    $am = Read-AmOutput ($r.StdOut + "`n" + $r.StdErr)
    if ($r.ExitCode -ne 0 -or $r.TimedOut -or $am.Error) { Stop-Flags 'start-failed' }
    foreach ($amNote in $am.Notes) { if ($amNote.Contains('intent not delivered')) { Stop-Flags 'start-failed' } }
    if (-not (Wait-LogCount 'flagsstored' ($script:FlagsStoredWaitSec * 1000))) { Stop-Flags 'not-stored' }
    Say-Log '  flags: a stored line was seen (the count is not pid-scoped; the proof is the read-back below)'
    # The app writes its preferences asynchronously: a short wait before the force-stop.
    Wait-Ms $script:FlagsStoreSettleMs 'FlagsStoreSettleMs'
    [void](Invoke-ShellReq ('am force-stop ' + $script:Pkg))
    [void](Invoke-ShellReq 'logcat -c')
    [void](Invoke-ShellReq ('am start -W -n ' + $script:Comp) 60)
    if (-not (Wait-LogCount 'flagsstate' ($script:FlagsStateWaitSec * 1000))) { Stop-Flags 'no-state-line' }
    Wait-Sec $script:Tm['coldStartSettleSec'] 'coldStartSettleSec'
    $note = ''
    try { $note = Save-Log $script:FlagsPull } catch { Stop-Flags 'pull-failed' }
    if ($note) { Stop-Flags 'no-state-line' }
    $states = @(Get-FlagStates (Join-Path $script:RunDir $script:FlagsPull))
    if ($states.Count -eq 0) { Stop-Flags 'no-state-line' }
    $script:FlagsLogged = $states[$states.Count - 1]
    foreach ($st in $states) {
        if (-not (Test-Ordinal $st $script:FlagsAskedState)) { $script:FlagsLogged = $st; Stop-Flags 'state-differs' }
    }
    $script:FlagsPid = $script:LastPullPid
    $script:FlagsOk = $true
    Save-RunJson $false
    Say-Log ('  flags: the app logged ' + $script:FlagsLogged + ' - equal to the asked state')
}

function Invoke-ColdstartRep($Rec) {
    [void](Invoke-ShellReq ('am force-stop ' + $script:Pkg))
    Wait-Sec $script:Tm['coldStartIdleSec'] 'coldStartIdleSec'
    [void](Invoke-ShellReq 'logcat -c')
    $r = Invoke-ShellReq ($script:StampCmd + '; am start -W -n ' + $script:Comp) 60
    $am = Read-AmOutput ($r.StdOut + "`n" + $r.StdErr)
    Add-AmResult $Rec $am
    Set-RepStamp $Rec $r.StdOut
    if ($am.Error) { throw ('ADBWALK-REP: am: ' + $am.Error) }
    $limit = $script:Tm['coldStartTimeoutSec']
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $seen = $false
    while ($sw.Elapsed.TotalSeconds -lt $limit) {
        $p = Invoke-Shell $script:PollCmd
        if ((Get-Clean $p.StdOut) -cmatch '^([0-9]{1,9})' -and [int]$Matches[1] -gt 0) { $seen = $true; break }
        Start-Sleep -Seconds 1
    }
    if ($seen) { Write-WalkLog ('boot line after ' + [int]$sw.Elapsed.TotalSeconds + ' s') }
    else { Add-Note $Rec ('no boot line within ' + $limit + ' s') }
    Wait-Sec $script:Tm['coldStartSettleSec'] 'coldStartSettleSec'
    Invoke-ShotCheck $Rec 'home'
    Invoke-LogPull $Rec
    Update-FlagsLogged $Rec
}

function Save-WatchPull([string]$Cmd, [string]$LocalName) {
    # Batch walktools2 (item 2): one filtered write on the phone (an allowlisted whole string: the events pull, or Get-LogPullCmd of the
    # pid of the start), the pull to the run folder, rm -f. Returns '' when the file was pulled, else fixed words (never throws on a
    # failed command: the caller records the failure; a refused command still stops the run in Assert-AdbCommand).
    $local = Join-Path $script:RunDir $LocalName
    if (Test-Path -LiteralPath $local) { return ($LocalName + ' exists already') }
    $w = Invoke-Shell $Cmd
    # grep's status: 1 = no matching line (an empty file), not an error. #46 r1 F-7: only with an empty stderr (adb itself also exits 1,
    # with its own text on stderr: that is a failed write).
    if ($w.TimedOut -or ($w.ExitCode -ne 0 -and -not ($w.ExitCode -eq 1 -and [string]::IsNullOrWhiteSpace([string]$w.StdErr)))) {
        [void](Invoke-Shell ('rm -f ' + $script:PhoneLog))
        return ('filtered write failed (exit ' + $w.ExitCode + ')')
    }
    $r = Invoke-Adb -AdbArgs @('pull', $script:PhoneLog, $local) -TimeoutSec 120
    [void](Invoke-Shell ('rm -f ' + $script:PhoneLog))
    if ($r.ExitCode -ne 0 -or $r.TimedOut -or -not (Test-Path -LiteralPath $local)) {
        $left = ''
        if (-not (Remove-LocalFile $local)) { $left = ', local file not deleted' }
        return ((Get-AdbWhy $r) + $left)
    }
    return ''
}

function Save-WatchEvidence($Rec) {
    # Batch walktools2 (item 2): a start that was NOT proven. BEFORE any command that can clear a buffer (the next rep's logcat -c):
    # (1) the system events (the ONE events pull, android-walk-coldstart-watch-NN-events.txt), (2) the app log of the pid of the start
    # (the existing filtered pull Get-LogPullCmd, android-walk-coldstart-watch-NN.txt; no pid read = not pulled). A failed pull = the rep
    # is an error (the parser: "no data", exit 2). No screenshot, no tap, no key.
    $w = $Rec['watch']
    $nn = Get-Nn $Rec.rep
    $evName = 'android-walk-coldstart-watch-' + $nn + '-events.txt'
    $e1 = Save-WatchPull $script:WatchEventsCmd $evName
    if ($e1) { $w['eventsPull'] = 'failed'; Add-Note $Rec ('events pull: ' + $e1) }
    else { $w['eventsPull'] = 'ok'; $w['events'] = $evName }
    if ($w.Contains('pid')) {
        $lgName = 'android-walk-coldstart-watch-' + $nn + '.txt'
        $e2 = Save-WatchPull (Get-LogPullCmd ([string]$w['pid'])) $lgName
        if ($e2) { $w['logPull'] = 'failed'; Add-Note $Rec ('app log pull: ' + $e2) }
        else { $w['logPull'] = 'ok'; $Rec['log'] = $lgName }
    } else {
        $w['logPull'] = 'nopid'
    }
    if ($w['eventsPull'] -ne 'ok' -or $w['logPull'] -eq 'failed') { $Rec.status = 'error' }
}

function Test-WatchPidof($R, [bool]$Stamped) {
    # Batch walktools2 (#46 r1 F-1): a pidof answer that can be read: no timeout, no stderr text, exit 0 with pids of digits only, or
    # exit 1 with no output (no process). $Stamped: the first line is the phone stamp (stamp2 + pidof), the pids follow it.
    if ($R.TimedOut -or -not [string]::IsNullOrWhiteSpace([string]$R.StdErr)) { return $false }
    $t = Get-Clean $R.StdOut
    if ($Stamped) {
        $i = $t.IndexOf([char]10)
        if ($i -lt 0) { $t = '' } else { $t = Get-Clean $t.Substring($i + 1) }
    }
    if ($R.ExitCode -eq 1) { return ($t -eq '') }
    if ($R.ExitCode -eq 0) { return ($t -cmatch '^[0-9]{1,9}([ \t]+[0-9]{1,9})*\z') }
    return $false
}

function Invoke-ColdWatchRep($Rec) {
    # Batch walktools2 (item 2): one cold start that keeps its evidence. am force-stop, coldStartIdleSec, logcat -c, the stamp + am
    # start -W (t0), pidof at once (pid P: exactly one pid of digits), the FIXED wait $script:WatchWaitSec, the stamp + pidof (stamp2),
    # the focus check. Proven = ONE pid after the wait and it is P, AND our app in front. Not proven = Save-WatchEvidence at once.
    # A failed command after the start is a note (the rep is an error after the evidence). #46 r1 F-1: a pidof answer that cannot be
    # read (timeout, stderr text, another exit, a token that is no pid) is read ONCE more, then the rep is an error. F-2: pidInAfter =
    # P is among the pids after the wait (the parser gives no "ends" class while P lives). F-4: everything after the start sits in a
    # try / finally: when anything throws there (an IO error of the walk log, Ctrl+C) the finally saves the evidence ONCE, unless proven.
    $w = [ordered]@{ proven = $false }
    $Rec['watch'] = $w
    [void](Invoke-ShellReq ('am force-stop ' + $script:Pkg))
    Wait-Sec $script:Tm['coldStartIdleSec'] 'coldStartIdleSec'
    [void](Invoke-ShellReq 'logcat -c')
    $bad = $false
    $saved = $false
    try {
        $r = Invoke-Shell ($script:StampCmd + '; am start -W -n ' + $script:Comp) 60
        $p = Invoke-Shell ('pidof ' + $script:Pkg)
        if (-not (Test-WatchPidof $p $false)) {
            Add-Note $Rec ('pidof after the start not readable (exit ' + $p.ExitCode + '), read again')
            $p = Invoke-Shell ('pidof ' + $script:Pkg)
        }
        $pOk = Test-WatchPidof $p $false
        if (-not $pOk) { Add-Note $Rec ('pidof after the start failed (exit ' + $p.ExitCode + ')'); $bad = $true }
        $am = Read-AmOutput ($r.StdOut + "`n" + $r.StdErr)
        Add-AmResult $Rec $am
        $s = Read-Stamp $r.StdOut
        if ($s.T0) { $Rec['t0'] = $s.T0 } else { Add-Note $Rec $s.Note; $bad = $true }
        if ($r.ExitCode -ne 0 -or $r.TimedOut) { Add-Note $Rec ('am start -W failed (exit ' + $r.ExitCode + ')'); $bad = $true }
        if ($am.Error) { Add-Note $Rec ('am: ' + $am.Error); $bad = $true }
        $ids = @()
        if ($pOk) { $ids = @(Get-Pids $p.StdOut) }
        $w['pidsAtStart'] = $ids.Count
        if ($ids.Count -eq 1) { $w['pid'] = [int]$ids[0] }
        Wait-Sec $script:WatchWaitSec 'coldstart-watch fixed wait'
        $r2 = Invoke-Shell ($script:StampCmd + '; pidof ' + $script:Pkg)
        $s2 = Read-Stamp $r2.StdOut
        if ($s2.T0) { $Rec['stamp2'] = $s2.T0 } else { Add-Note $Rec ($s2.Note + ' (stamp2)'); $bad = $true }
        $after = @()
        if (Test-WatchPidof $r2 $true) { $after = @(Get-Pids $r2.StdOut) }
        else { Add-Note $Rec ('pidof after the wait failed (exit ' + $r2.ExitCode + ')'); $bad = $true }
        $w['pidsAfter'] = $after.Count
        $w['pidInAfter'] = [bool]($w.Contains('pid') -and (@($after) -ccontains ([string]$w['pid'])))
        $w['samePid'] = [bool]($w.Contains('pid') -and $after.Count -eq 1 -and (Test-Ordinal ([string]$after[0]) ([string]$w['pid'])))
        $w['front'] = [bool](Test-AppFront)
        $w['proven'] = [bool]($w['samePid'] -and $w['front'])
        if (-not $w['proven']) {
            if (-not $w.Contains('pid')) { Add-Note $Rec ('not proven: no single pid right after the start (' + $ids.Count + ' pids)') }
            elseif ($w['samePid']) { Add-Note $Rec 'not proven: the process is alive, our app is not in front' }
            elseif ($after.Count -eq 0) { Add-Note $Rec 'not proven: the process of the start is gone' }
            elseif ($w['pidInAfter']) { Add-Note $Rec 'not proven: more than one pid after the wait' }
            else { Add-Note $Rec 'not proven: another pid after the wait' }
            $saved = $true
            Save-WatchEvidence $Rec
        }
    } finally {
        # F-4: reached with $saved false and not proven only when something threw after the start. ONE evidence save; its own error
        # is a note (the first error goes on to Invoke-Step, which makes the rep an error).
        if ((-not $saved) -and (-not $w['proven'])) {
            $saved = $true
            $Rec.status = 'error'
            try { Save-WatchEvidence $Rec } catch { Add-Note $Rec ('evidence after an error: ' + $_.Exception.GetType().Name) }
        }
    }
    if ($bad) { $Rec.status = 'error' }
}

function Invoke-ChatRep($Rec, [string]$How) {
    [void](Invoke-ShellReq 'logcat -c')
    if ($How -eq 'intent') {
        $r = Invoke-ShellReq ($script:StampCmd + '; am start -n ' + $script:Comp + ' --es fa ' + (Get-Seed ($Rec.rep - 1)))
        $am = Read-AmOutput ($r.StdOut + "`n" + $r.StdErr)
        Add-AmResult $Rec $am
        Set-RepStamp $Rec $r.StdOut
        if ($am.Error) { throw ('ADBWALK-REP: am: ' + $am.Error) }
    } else {
        Assert-AppFront
        $r = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-TapText 'chatRow1'))
        Set-RepStamp $Rec $r.StdOut
    }
    Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
    Invoke-ShotCheck $Rec 'chat'
    Invoke-LogPull $Rec
    Invoke-BackReq
    Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs'
}

function Invoke-ScrollRep($Rec) {
    if ($script:ScrollOpen) {
        if ($Rec.rep -eq 1) { throw ('ADBWALK-REP: ' + $script:ScrollOpen) }
        throw ('ADBWALK-SKIP: ' + $script:ScrollWhat + ' did not open (see rep 1)')
    }
    [void](Invoke-ShellReq 'logcat -c')
    Assert-AppFront
    $r = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-SwipeText 'chatOlder'))
    Set-RepStamp $Rec $r.StdOut
    Wait-Ms $script:Tm['scrollSettleMs'] 'scrollSettleMs'
    Assert-AppFront
    [void](Invoke-ShellReq (Get-SwipeText 'chatNewer'))
    Wait-Ms $script:Tm['scrollSettleMs'] 'scrollSettleMs'
    Invoke-ShotCheck $Rec 'chat'
    if ($Rec.step -ceq 'scroll-image' -and $Rec.ContainsKey('shot')) {
        # The image chat must be a dev-seed chat, but a wrong address would photograph a real contact: no PNG is kept.
        $png = Join-Path $script:RunDir ([string]$Rec['shot'])
        $Rec.Remove('shot')
        if (Remove-LocalFile $png) { Add-Note $Rec 'PNG deleted (scroll-image keeps no screenshot until the image seed exists)' }
        else { Add-Note $Rec 'PNG not deleted: local file not deleted' }
    }
    Invoke-LogPull $Rec
}

function Invoke-ResumeRep($Rec, [int]$WaitSec, [int]$TapWaitMs, [switch]$DropOnFail) {
    # $TapWaitMs: the wait between the resume and the chat tap; -1 = the old 2 s of the resume rows (unchanged).
    # -DropOnFail (resume-now, resume-3s only): a chat PNG whose probe check fails is deleted (the tap may have hit Wallet).
    [void](Invoke-ShellReq 'input keyevent 3')
    Wait-Sec $WaitSec 'resume wait'
    [void](Invoke-ShellReq 'logcat -c')
    $r = Invoke-ShellReq ('am start -W -n ' + $script:Comp) 60
    $am = Read-AmOutput ($r.StdOut + "`n" + $r.StdErr)
    Add-AmResult $Rec $am
    if ($am.Error) { throw ('ADBWALK-REP: am: ' + $am.Error) }
    if ($TapWaitMs -lt 0) { Wait-Sec 2 'after resume' } else { Wait-Ms $TapWaitMs 'after resume' }
    Assert-AppFront
    $r2 = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-TapText 'chatRow1'))
    Set-RepStamp $Rec $r2.StdOut
    Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
    Invoke-ShotCheck $Rec 'chat' -DropOnFail:$DropOnFail
    Invoke-LogPull $Rec
    Invoke-BackReq
    Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs'
}

function Get-PreCheckText([string]$Expect, $Chk, [string]$Left) {
    # Batch walktools (item 2): the text of the pre-check failure. The old form keeps the old words byte for byte. The sets form is shorter
    # (no "before the input the ... screen", no "no set matches: ") so that the counts of EVERY set fit the 120 characters of a rep note after
    # the two notes a -HistorySeed rep already holds: "PNG deleted (home check), restart proven before this rep, " (24 + 2 + 30 + 2 = 58) + "chat check
    # failed: " (19) + "light 2/4 (4), dark 0/4 (4)" (27, two sets of 4 probes) + " (PNG deleted)" (14) = 118. With the longer tail " (local file not
    # deleted)" (25) the total is 129 and Get-SafeNote cuts the END: the last 9 characters of the tail, the counts stay whole.
    if ($Chk.Sets -gt 0) { return ('ADBWALK-NOSCREEN: ' + $Expect + ' check failed: ' + ($Chk.Note -replace '^no set matches: ', '') + $Left) }
    return ('ADBWALK-NOSCREEN: before the input the ' + $Expect + ' screen check failed: ' + $Chk.Note + $Left)
}

function Invoke-PreCheck($Rec, [string]$Expect) {
    # The screen check BEFORE the input: focus first, then one screenshot (shot-<step>-NN-pre.png) and its probes.
    # A failed check stops the rep before any input (no-screen) and DELETES the PNG: the screen may be Wallet or
    # Account. Only a PNG that passed is kept (shotPre). A failed check is re-calibrated with -Calibrate.
    if (-not (Test-AppFront)) { throw 'ADBWALK-NOSCREEN: foreign window in front (no screenshot, input skipped)' }
    $name = 'shot-' + $Rec.step + '-' + (Get-Nn $Rec.rep) + '-pre.png'
    $local = Save-Shot $name
    if (-not (Test-AppFront)) {
        if (Remove-LocalFile $local) { throw 'ADBWALK-NOSCREEN: foreign window during the screenshot (PNG deleted)' }
        throw 'ADBWALK-NOSCREEN: foreign window during the screenshot, local file not deleted'
    }
    $chk = Test-Screen $local $Expect
    if (-not $chk.Ok) {
        $left = ' (PNG deleted)'
        if (-not (Remove-LocalFile $local)) { $left = ' (local file not deleted)' }
        throw (Get-PreCheckText $Expect $chk $left)
    }
    $Rec['shotPre'] = $name
}

function Invoke-OpenSeedChat([int]$K) {
    # A seed chat by the notification intent fa (the only entry besides a tap, DECISIONS 1521).
    $r = Invoke-ShellReq ('am start -n ' + $script:Comp + ' --es fa ' + (Get-Seed $K))
    $am = Read-AmOutput ($r.StdOut + "`n" + $r.StdErr)
    if ($am.Error) { throw ('ADBWALK-REP: am: ' + $am.Error) }
    Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
}

function Invoke-ChatInfoRep($Rec) {
    # Seed chat k-1 by fa, the chat check, then the tap on the chat header: Chat info opens. Then BACK twice.
    [void](Invoke-ShellReq 'logcat -c')
    Invoke-OpenSeedChat ($Rec.rep - 1)
    Invoke-PreCheck $Rec 'chat'
    Assert-AppFront
    $r = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-TapText 'chatHeader'))
    Set-RepStamp $Rec $r.StdOut
    Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
    Invoke-ShotCheck $Rec 'chatinfo'
    Invoke-LogPull $Rec
    # A Chat info page that did not open gets no BACK of its own (a second BACK on home would leave the app).
    if ($Rec['screenOk']) {
        Invoke-BackReq
        Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs'
    }
    Invoke-BackReq
    Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs'
}

function Invoke-TabRep($Rec) {
    # From Chats: the tap on one bottom tab (t0), then the tap on Chats. The screenshot is taken on Chats only:
    # the tabs Apps, Wallet and Account show TEST account data. Each view change is confirmed by the app's own
    # frames log line (no timer alone): the Chats tap goes out only after the tab (and for Account the SettingsPage)
    # showed, the screenshot only after Chats came back, and a screenshot that fails the home check is deleted.
    $tap = $script:TabNames[$Rec.step]
    $key = $script:TabFrames[$Rec.step]
    $to = 3 * $script:Tm['tabSettleMs']
    [void](Invoke-ShellReq 'logcat -c')
    Invoke-PreCheck $Rec 'home'
    Assert-AppFront
    $r = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-TapText $tap))
    # From here on the tab may be in front: a failure of any kind restarts the app (it boots on Chats), then rethrows.
    $tapped = $true
    $reset = $false
    try {
        Set-RepStamp $Rec $r.StdOut
        if (-not (Wait-LogCount $key $to)) { throw ('ADBWALK-REP: the ' + $key + ' tab did not show (no frames line): no tap back, no screenshot') }
        if ($key -eq 'account') {
            if (-not (Wait-LogCount 'settings' $to)) { throw 'ADBWALK-REP: the account settings page did not show (no frames line): no tap back, no screenshot' }
        }
        Assert-AppFront
        [void](Invoke-ShellReq (Get-TapText 'tabChats'))
        if ($key -eq 'account') {
            if (-not (Wait-LogCount 'settingsclosed' $to)) { throw 'ADBWALK-REP: the account settings page did not close (no close line): no screenshot' }
        }
        if (-not (Wait-LogCount 'chats' $to)) { throw 'ADBWALK-REP: Chats did not come back (no frames line): no screenshot' }
        Wait-Ms 300 'after the Chats frames line'
        Invoke-ShotCheck $Rec 'home' -DropOnFail
        Invoke-LogPull $Rec
        # The home check failed (the PNG is deleted, the rep is no-screen): the view is unknown, restart on Chats.
        if ($Rec['screenOk'] -ne $true) { $reset = $true; Reset-AppToChats }
    } catch {
        if ($tapped -and -not $reset -and -not ([string]$_.Exception.Message).StartsWith('ADBWALK-STOP:')) { Reset-AppToChats }
        throw
    }
}

function Invoke-HistoryRep($Rec) {
    # Seed chat k+4 (seeds 5..9: no other step opens them, so each rep starts at the newest page) by fa, the chat check,
    # then swipes to older messages until the chat shell asked for 3 older pages or historyMaxSwipes is reached.
    # t0 = the first swipe. The rep ends with BACK: the chat is closed after the rep.
    [void](Invoke-ShellReq 'logcat -c')
    Invoke-OpenSeedChat ($Rec.rep + 4)
    Invoke-PreCheck $Rec 'chat'
    $c0 = Get-LoadMoreCount
    if ($null -eq $c0) { throw 'ADBWALK-REP: cannot count the page requests in the phone log' }
    $k = 0
    $got = 0
    while ($k -lt $script:Tm['historyMaxSwipes']) {
        Assert-AppFront
        if ($k -eq 0) {
            $r = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-SwipeText 'historyOlder'))
            Set-RepStamp $Rec $r.StdOut
        } else {
            [void](Invoke-ShellReq (Get-SwipeText 'historyOlder'))
        }
        $k++
        $Rec['swipes'] = $k
        Wait-Ms $script:Tm['historySwipeMs'] 'historySwipeMs'
        $c = Get-LoadMoreCount
        if ($null -eq $c) { throw 'ADBWALK-REP: cannot count the page requests in the phone log' }
        $got = $c - $c0
        if ($got -ge 3) { break }
    }
    if ($got -lt 3) { Add-Note $Rec ('only ' + $got + ' page requests after ' + $k + ' swipes') }
    Wait-Ms $script:Tm['scrollSettleMs'] 'scrollSettleMs'
    Invoke-ShotCheck $Rec 'chat'
    Invoke-LogPull $Rec
    Invoke-BackReq
    Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs'
}

function Invoke-HistorySeedStep {
    # Batch fixb3 (item 4): the step history on ONE named dev-seed chat (-HistorySeed k), reps named history-seed-kNN. Like history: after a
    # failed rep, one bounded recovery.
    Invoke-Step $script:HistorySeedStep $script:RepeatsN $true
    if ($script:NeedRecover -and -not $script:Halted) { [void](Invoke-EnsureHome) }
    # Review round 2 (NIT 5): no reset PNG of the proven restarts stays in the run folder (as open-seed and the file steps).
    Clear-FileStepPngs
}

function Invoke-HistorySeedRestart($Rec, [int]$K) {
    # Batch fixb3 (item 4): the PROVEN restart before each rep (each rep starts at the newest page in a new process): the app pid is read
    # BEFORE (exactly one), then Invoke-FileReset (force-stop, am start -W, the settle, exactly one different pid after, our app in front, a
    # home check whose PNG is deleted). Not proven: Invoke-FileReset has halted the run (no further input) and this throws; no single pid
    # before = the same halt (as Invoke-OpenSeedRestart). First, as open-seed: the app in front on Chats (a bounded recovery).
    if (-not (Invoke-EnsureHome)) { throw 'ADBWALK-NOSCREEN: foreign window in front (the app did not come back)' }
    if (-not (Save-FileRepPid)) {
        $script:Halted = $true
        $script:HaltNote = 'run stopped: an app restart was not proven (no further input)'
        Add-Note $Rec 'restart not proven: no app pid was stored before the restart: the run stops'
        Say-Log '  restart NOT proven (no app pid was stored before the restart): the run sends no further input'
        throw 'ADBWALK-REP: cannot read the app pid before the restart: no restart, no input'
    }
    Say-Log ('  history-seed k=' + $K + ': planned restart before the rep (the "tab step" line below is the shared helper text, no tab rep ran)')
    if (-not (Invoke-FileReset $Rec ('history-seed k=' + $K + ': the restart before the rep'))) {
        throw 'ADBWALK-REP: no restart proof, so no further input'
    }
    # The restart is proven and consumed here: the rep that follows judges its own end state.
    $script:FileResetOk = $false; $script:NeedRecover = $false; $script:LastFailed = $false
    Add-Note $Rec 'restart proven before this rep'
}

function Invoke-HistorySeedRep($Rec) {
    # Batch fixb3 (item 4): the seed chat of -HistorySeed (the address THIS script derives, never read from a file or typed; masked as
    # <seed-index k>) after a proven restart, the chat check, then swipes to older messages until ONE page request is counted or
    # historyMaxSwipes. t0 = the first swipe (as history). No page request = a chat with no older page cannot measure this: the rep
    # still ends (settle, shot check, log pull, BACK) and the parser says "no data" for the missing page lines. The rep ends with BACK.
    $K = $script:HistSeedIdx
    $addr = Get-DevSeedAddress $K
    $script:OpenSeedAddr[[string]$K] = $addr
    Invoke-HistorySeedRestart $Rec $K
    [void](Invoke-ShellReq 'logcat -c')
    $r = Invoke-ShellReq ('am start -n ' + $script:Comp + ' --es fa ' + $addr)
    $am = Read-AmOutput ($r.StdOut + "`n" + $r.StdErr)
    if ($am.Error) { throw ('ADBWALK-REP: am: ' + $am.Error) }
    Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
    Invoke-PreCheck $Rec 'chat'
    $c0 = Get-LoadMoreCount
    if ($null -eq $c0) { throw 'ADBWALK-REP: cannot count the page requests in the phone log' }
    $sw = 0
    $got = 0
    while ($sw -lt $script:Tm['historyMaxSwipes']) {
        Assert-AppFront
        if ($sw -eq 0) {
            $r = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-SwipeText 'historyOlder'))
            Set-RepStamp $Rec $r.StdOut
        } else {
            [void](Invoke-ShellReq (Get-SwipeText 'historyOlder'))
        }
        $sw++
        $Rec['swipes'] = $sw
        Wait-Ms $script:Tm['historySwipeMs'] 'historySwipeMs'
        $c = Get-LoadMoreCount
        if ($null -eq $c) { throw 'ADBWALK-REP: cannot count the page requests in the phone log' }
        $got = $c - $c0
        if ($got -ge 1) { break }
    }
    $Rec['pages'] = [int]$got
    if ($got -lt 1) { Add-Note $Rec ('no page request after ' + $sw + ' swipes: a chat with no older page cannot measure this') }
    Wait-Ms $script:Tm['scrollSettleMs'] 'scrollSettleMs'
    Invoke-ShotCheck $Rec 'chat'
    Invoke-LogPull $Rec
    Invoke-BackReq
    Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs'
}

# ---------------------------------------------------------------- batch filewalk: the file chats, the viewer, Downloads
function ConvertTo-Base58([byte[]]$Bytes) {
    # #46 r1 (S-W-4): base58 (Bitcoin alphabet) by long division of the byte array; one '1' per leading zero byte.
    $alpha = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    $digits = New-Object System.Collections.Generic.List[int]
    foreach ($b in $Bytes) {
        $carry = [int]$b
        for ($j = 0; $j -lt $digits.Count; $j++) {
            $carry += $digits[$j] * 256
            $digits[$j] = $carry % 58
            $carry = [math]::Floor($carry / 58)
        }
        while ($carry -gt 0) { $digits.Add($carry % 58); $carry = [math]::Floor($carry / 58) }
    }
    $sb = New-Object System.Text.StringBuilder
    foreach ($b in $Bytes) { if ($b -eq 0) { [void]$sb.Append('1') } else { break } }
    for ($j = $digits.Count - 1; $j -ge 0; $j--) { [void]$sb.Append($alpha[$digits[$j]]) }
    return $sb.ToString()
}

function Get-DevSeedAddress([int]$Index) {
    # #46 r1 (S-W-4): the address of dev-seed contact $Index as Spixi/Utils/SDevSeed.cs addressFor makes it:
    # base58( raw33 + checksum3 ), raw33 = 0x00 + SHA-256(UTF-8 "spixi-dev-seed:" + i), checksum3 = the first 3 bytes of
    # SHA-512(SHA-512(raw33)). Only compared, never printed.
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $sha512 = [System.Security.Cryptography.SHA512]::Create()
    try {
        $h = $sha256.ComputeHash($script:Utf8.GetBytes('spixi-dev-seed:' + $Index.ToString($script:Inv)))
        $raw = New-Object byte[] 33
        [System.Array]::Copy($h, 0, $raw, 1, 32)
        $ck = $sha512.ComputeHash($sha512.ComputeHash($raw))
        $all = New-Object byte[] 36
        [System.Array]::Copy($raw, 0, $all, 0, 33)
        [System.Array]::Copy($ck, 0, $all, 33, 3)
    } finally { $sha256.Dispose(); $sha512.Dispose() }
    return (ConvertTo-Base58 $all)
}

function Clear-FileStepPngs {
    # #46 r1 (S-W-3): no PNG of the file-walk steps stays in the run folder (end of each new step and the main finally);
    # #46 r2 (B2-2): also the restart checks of -Calibrate (cal-reset-NN.png).
    if (-not $script:RunDir -or -not (Test-Path -LiteralPath $script:RunDir)) { return }
    foreach ($f in @(Get-ChildItem -LiteralPath $script:RunDir -File -ErrorAction SilentlyContinue)) {
        if ($f.Name -cmatch '^shot-(scroll-files|scroll-voice|scroll-photos|viewer|downloads|open-seed)-[A-Za-z0-9-]{1,40}\.png\z' -or $f.Name -cmatch '^cal-reset-[0-9]{2,4}\.png\z' -or $f.Name -cmatch '^shot-history-seed-k[0-9]{2}-reset-[0-9]{2,4}\.png\z') {
            if (Remove-LocalFile $f.FullName) { Write-WalkLog ('sweep: ' + $f.Name + ' deleted') }
            else { Say-Log ('  WARNING: a PNG of a file-walk step could not be deleted: ' + $f.Name + ' (delete it by hand)') }
        }
    }
    Clear-CalAccountPng
}

function Clear-CalAccountPng {
    # Batch fixb3 (item 3, review round 2 m2): the calibrate picture of the scrolled Account hub (cal-17s-account-scrolled.png) is deleted by
    # the sweep too, whenever screens.accountScrolled is set (an exception or Ctrl+C in Invoke-CalAccountScroll must not leave it). While the
    # key is absent it is KEPT: it is the one picture the lead reads. (A key that is present but invalid is a usage error at load time.)
    if (-not $script:RunDir -or -not (Test-Path -LiteralPath $script:RunDir)) { return }
    if (Get-ScreenGap 'accountScrolled') { return }
    foreach ($f in @(Get-ChildItem -LiteralPath $script:RunDir -File -ErrorAction SilentlyContinue)) {
        if ($f.Name -cmatch '^cal-17s-account-scrolled\.png\z') {
            if (Remove-LocalFile $f.FullName) { Write-WalkLog ('sweep: ' + $f.Name + ' deleted') }
            else { Say-Log ('  WARNING: the picture of the scrolled Account hub could not be deleted: ' + $f.Name + ' (delete it by hand)') }
        }
    }
}

function Invoke-FileShot($Rec, [string]$Expect, [string]$LocalName) {
    # #46 r1 (S-W-3): focus, screenshot, focus, the probe check, and the PNG deleted in a finally (a probe read that throws
    # leaves no PNG). Returns $true when the screen is $Expect. Never records the file in the rep.
    if (-not (Test-AppFront)) { Add-Note $Rec 'foreign window in front (no screenshot)'; return $false }
    $local = Save-Shot $LocalName
    $ok = $false
    try {
        if (-not (Test-AppFront)) { Add-Note $Rec 'foreign window during the screenshot'; return $false }
        $chk = Test-Screen $local $Expect
        $ok = [bool]$chk.Ok
        if (-not $ok) { Add-Note $Rec ($Expect + ' check failed: ' + $chk.Note) }
    } finally {
        if (Remove-LocalFile $local) { Add-Note $Rec ('PNG deleted (' + $Expect + ' check)') }
        else { Add-Note $Rec 'PNG not deleted: local file not deleted'; $ok = $false }
    }
    return $ok
}

function Invoke-FileShotCheck($Rec, [string]$Expect) {
    # The screen check AFTER an input (the rep's own check): screen + screenOk in the rep, no-screen when it fails.
    $Rec['screen'] = $Expect
    $ok = Invoke-FileShot $Rec $Expect ('shot-' + $Rec.step + '-' + (Get-Nn $Rec.rep) + '.png')
    $Rec['screenOk'] = $ok
    if (-not $ok -and $Rec.status -eq 'ok') { $Rec.status = 'no-screen' }
    return $ok
}

function Invoke-FilePreCheck($Rec, [string]$Expect) {
    # The check BEFORE the first input of a rep: a failure throws (no input, no-screen).
    if (-not (Invoke-FileShot $Rec $Expect ('shot-' + $Rec.step + '-' + (Get-Nn $Rec.rep) + '-pre.png'))) {
        throw ('ADBWALK-NOSCREEN: before the input the ' + $Expect + ' screen check failed: no input')
    }
}

function Invoke-FileReset($Rec, [string]$Why) {
    # #46 r1 (S-W-1, S-W-5) and r2 (B2-2): Reset-AppToChats (force-stop, am start -W; it reports nothing), then the
    # restart is PROVEN: the pid stored at the rep start (Save-FileRepPid, read while adb was healthy, before the first tap
    # command) exists, exactly one app pid is read after the restart and it differs from the stored one, our app has the
    # focus, and a fresh home check passes (the cold start lands on Chats; the PNG is deleted in a finally). The screenshot
    # comes only after the pid and focus proof: a missing stored pid or an unreadable pid after = NOT proven with NO
    # screenshot, so a restart that failed with Account in front (an adb outage too) is never photographed. Proven:
    # $script:FileResetOk (Complete-Rep then clears the recovery flags: no BACK follows). Not proven: the run is halted,
    # no further input. Returns: proven.
    Say-Log ('  ' + $Why + ': the app is restarted (am force-stop, am start -W)')
    $before = $script:FileRepPid
    $script:FileRepPid = ''
    Reset-AppToChats
    $after = @(Get-Pids (Invoke-Shell ('pidof ' + $script:Pkg)).StdOut)
    $why = ''
    if (-not $before) { $why = 'no app pid was stored before the tap' }
    elseif ($after.Count -ne 1) { $why = 'no single app pid after the restart' }
    elseif (Test-Ordinal ([string]$before) ([string]$after[0])) { $why = 'the app pid did not change' }
    elseif (-not (Test-AppFront)) { $why = 'the app is not in front after the restart' }
    else {
        $script:FileResetN++
        $name = 'shot-' + $Rec.step + '-reset-' + $script:FileResetN.ToString('00', $script:Inv) + '.png'
        if ($script:Mode -eq 'calibrate') { $name = 'cal-reset-' + $script:FileResetN.ToString('00', $script:Inv) + '.png' }
        try { if (-not (Invoke-FileShot $Rec 'home' $name)) { $why = 'the home check after the restart failed' } }
        catch {
            if (([string]$_.Exception.Message).StartsWith('ADBWALK-STOP:')) { throw }
            $why = 'the home check after the restart failed'
        }
    }
    if (-not $why) {
        $script:FileResetOk = $true
        Say-Log '  restart proven: a new app process, Chats in front'
        return $true
    }
    $script:Halted = $true
    $script:HaltNote = 'run stopped: an app restart was not proven (no further input)'
    Add-Note $Rec ('restart not proven: ' + $why + ': the run stops')
    Say-Log ('  restart NOT proven (' + $why + '): the run sends no further input')
    return $false
}

function Save-FileRepPid {
    # #46 r2 (B2-2): the app pid while adb is healthy, before the first tap command; none or several = no tap at all.
    $script:FileRepPid = ''
    $ids = @(Get-Pids (Invoke-Shell ('pidof ' + $script:Pkg)).StdOut)
    if ($ids.Count -eq 1) { $script:FileRepPid = [string]$ids[0]; return $true }
    return $false
}

function Get-ScrollBase($Rec) {
    # #46 r2 (B2-3): every chat open writes its own shell scroll line (ms=0): the count right BEFORE the stamp2 command is
    # the base, and the pull waits for base + 2 (the two swipes). Unreadable = the full bound is waited.
    $c = Get-LogCount 'scrolllines'
    if ($null -eq $c) { Add-Note $Rec 'scroll line count unreadable before the swipes'; return 999999 }
    return $c
}

function Wait-FilePull($Rec, [string]$Key, [int]$Above) {
    # #46 r1 (B1-3): the logcat mirror can lag the app's lines: wait (bounded) for the rep's own lines, then pull anyway.
    if (-not (Wait-LogCount $Key $script:FilePullWaitMs $Above)) { Add-Note $Rec ('pulled before all ' + $Key + ' lines were in the log') }
}

function Wait-FileGate([string]$OneKey, [string]$AnyKey, [int]$TimeoutMs, [int]$BaseOne = 0, [int]$BaseAny = 0) {
    # The gate of the viewer and of the Downloads list (a count only, no line leaves the phone): the count of $OneKey
    # must be EXACTLY one above $BaseOne and the count of $AnyKey at least one above $BaseAny (the walk: 0 after its
    # logcat -c; the calibrate run: the counts read before the tap). A second $OneKey line fails at once; a count that
    # cannot be read never passes; $false at the timeout (at least one poll). The gate never frees itself on a timer.
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    while ($true) {
        $a = Get-LogCount $OneKey
        $b = Get-LogCount $AnyKey
        if ($null -ne $a -and ($a - $BaseOne) -gt 1) { Write-WalkLog ('gate ' + $OneKey + ': ' + ($a - $BaseOne) + ' lines, 1 expected'); return $false }
        if ($null -ne $a -and $null -ne $b -and ($a - $BaseOne) -eq 1 -and ($b - $BaseAny) -ge 1) {
            Write-WalkLog ('gate ' + $OneKey + ' + ' + $AnyKey + ' after ' + $sw.ElapsedMilliseconds + ' ms')
            return $true
        }
        if ($sw.ElapsedMilliseconds -ge $TimeoutMs) { Write-WalkLog ('no gate ' + $OneKey + ' + ' + $AnyKey + ' within ' + $TimeoutMs + ' ms'); return $false }
        Start-Sleep -Milliseconds 300
    }
}

function Invoke-FileChatRep($Rec) {
    # scroll-files / scroll-voice / scroll-photos: the seed chat of the step's local key by fa (t0), the chat check (PNG
    # deleted), stamp2 + the two swipes, the wait for the scroll lines, the log pull, BACK. A failed chat check sends no
    # swipe and no BACK: the rep is no-screen and the next rep (or the step end) recovers by Invoke-EnsureHome.
    $addr = Get-Seed $script:FileSeed[$script:FileChatKeys[$Rec.step]]
    [void](Invoke-ShellReq 'logcat -c')
    $r = Invoke-ShellReq ($script:StampCmd + '; am start -n ' + $script:Comp + ' --es fa ' + $addr)
    $am = Read-AmOutput ($r.StdOut + "`n" + $r.StdErr)
    Add-AmResult $Rec $am
    Set-RepStamp $Rec $r.StdOut
    if ($am.Error) { throw ('ADBWALK-REP: am: ' + $am.Error) }
    Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
    # The key names a dev-seed chat (checked against the derived address); still no PNG is kept.
    if (-not (Invoke-FileShotCheck $Rec 'chat')) {
        Invoke-LogPull $Rec
        throw 'ADBWALK-NOSCREEN: the chat screen check failed: no swipe, no BACK'
    }
    $sbase = Get-ScrollBase $Rec
    Assert-AppFront
    $r2 = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-SwipeText 'chatOlder'))
    Set-RepStamp2 $Rec $r2.StdOut
    Wait-Ms $script:Tm['scrollSettleMs'] 'scrollSettleMs'
    Assert-AppFront
    [void](Invoke-ShellReq (Get-SwipeText 'chatNewer'))
    Wait-Ms $script:Tm['scrollSettleMs'] 'scrollSettleMs'
    Wait-FilePull $Rec 'scrolllines' ($sbase + 1)
    Invoke-LogPull $Rec
    Invoke-BackReq
    Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs'
}

function Invoke-ViewerRep($Rec) {
    # The image chat is open (Invoke-ViewerStep). Per rep: the chat check before the tap (PNG deleted), logcat -c, stamp +
    # tap photoTile (t0), the gate (viewimage = 1 and frames-overlay-open >= 1), the viewer check (PNG deleted), stamp2 +
    # BACK, the wait for the close line, the log pull. A failed gate or check: no more input in this rep; a foreign window
    # (the OS chooser that a tap before the thumbnail opens) gets no input: the app is restarted and the restart proven
    # (Invoke-FileReset); the next rep opens the image chat again by fa before its chat check.
    if ($script:ScrollOpen) {
        if ($Rec.rep -eq 1) { throw ('ADBWALK-REP: ' + $script:ScrollOpen) }
        throw ('ADBWALK-SKIP: ' + $script:ScrollWhat + ' did not open (see rep 1)')
    }
    if ($script:ViewerReopen) {
        if (-not (Invoke-EnsureHome)) { throw 'ADBWALK-NOSCREEN: foreign window in front (the app did not come back)' }
        Invoke-OpenSeedChat $script:ImageSeed
        $script:ViewerReopen = $false
        Add-Note $Rec 'the image chat was opened again after a failed rep'
    }
    [void](Invoke-ShellReq 'logcat -c')
    Invoke-FilePreCheck $Rec 'chat'
    if (-not (Save-FileRepPid)) { throw 'ADBWALK-REP: cannot read the app pid before the tap: no input' }
    Assert-AppFront
    # From the tap command on the screen may not be the chat: any failure re-opens the chat at the next rep.
    $script:ViewerReopen = $true
    try {
        $r = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-TapText 'photoTile'))
        Set-RepStamp $Rec $r.StdOut
        if (-not (Wait-FileGate 'viewimage' 'overlayopen' $script:FileGateMs)) {
            throw 'ADBWALK-REP: the viewer did not open (gate viewimage = 1 and frames-overlay-open): no more input in this rep'
        }
        if (-not (Invoke-FileShotCheck $Rec 'viewer')) { throw 'ADBWALK-NOSCREEN: the viewer screen check failed: no more input in this rep' }
        Assert-AppFront
        $r2 = Invoke-ShellReq ($script:StampCmd + '; input keyevent 4')
        Set-RepStamp2 $Rec $r2.StdOut
        Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs'
        Wait-FilePull $Rec 'overlayclose' 0
        Invoke-LogPull $Rec
        $script:ViewerReopen = $false
    } catch {
        if (-not ([string]$_.Exception.Message).StartsWith('ADBWALK-STOP:') -and -not (Test-AppFront)) {
            [void](Invoke-FileReset $Rec 'viewer: a foreign window is in front after the tap (the OS chooser?), no input to it')
        }
        throw
    }
}

function Invoke-ViewerStep {
    # viewer: the image chat (imageChatAddress, one of Seed 51-53) is opened ONCE by fa, as in Invoke-ScrollStep; after the
    # reps BACK closes it (or, after a failed last rep, one bounded recovery).
    $script:ScrollOpen = ''
    $script:ScrollWhat = 'the image chat'
    $script:ViewerReopen = $false
    $opened = $false
    if (-not (Get-StepGap 'viewer') -and -not $script:Halted) {
        if (-not (Invoke-EnsureHome)) {
            $script:ScrollOpen = 'the app is not in front: the image chat was not opened'
        } else {
            $r = Invoke-Shell ('am start -n ' + $script:Comp + ' --es fa ' + (Get-Seed $script:ImageSeed))
            $am = Read-AmOutput ($r.StdOut + "`n" + $r.StdErr)
            if ($r.ExitCode -ne 0 -or $r.TimedOut -or $am.Error) {
                $why = $am.Error
                if (-not $why) { $why = Get-AdbWhy $r }
                $script:ScrollOpen = 'the image chat did not open: ' + $why
                $script:NeedRecover = $true; $script:LastFailed = $true
            } else {
                $opened = $true
                # chatSettleMs: the thumbnails must have arrived (a tap before that opens the OS chooser).
                Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
            }
        }
    }
    Invoke-Step 'viewer' $script:RepeatsN $false
    if ($opened -and -not $script:Halted) {
        if ($script:NeedRecover -or $script:ViewerReopen) { [void](Invoke-EnsureHome) }
        elseif (Invoke-Back) { Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs' }
        else { Say-Log '  viewer: foreign window in front, BACK not sent'; $script:NeedRecover = $true; $script:LastFailed = $true }
    }
    $script:ViewerReopen = $false
    Clear-FileStepPngs
}

function Invoke-DownloadsRep($Rec) {
    # From Chats: the home check (PNG deleted), the tap on tabAccount with the gates of tab-account, a focus check, ONE swipe
    # (swipes.accountDownloads), scrollSettleMs, the check of the scrolled hub (screens.accountScrolled: the ONE picture of the
    # Account hub, deleted at once, a failed check sends no tap), logcat -c, stamp + tap accountDownloads (t0), the gate
    # (loaddownloads = 1 and frames-subscreen-open >= 1), the Downloads check (PNG deleted at once: it shows file names and
    # senders), stamp2 + the two swipes, the wait for the scroll lines, the log pull, BACK with the subscreen-close gate, the tap
    # on Chats with its gates. No other screenshot while the Account screen is in front.
    # From the tabAccount tap command on, any failure restarts the app at once and proves the restart (Invoke-FileReset):
    # a wrong tap on the Account screen never gets a second input.
    $to = 3 * $script:Tm['tabSettleMs']
    [void](Invoke-ShellReq 'logcat -c')
    Invoke-FilePreCheck $Rec 'home'
    if (-not (Save-FileRepPid)) { throw 'ADBWALK-REP: cannot read the app pid before the tap: no input' }
    Assert-AppFront
    try {
        [void](Invoke-ShellReq (Get-TapText 'tabAccount'))
        if (-not (Wait-LogCount 'account' $to)) { throw 'ADBWALK-REP: the account tab did not show (no frames line): no further input' }
        if (-not (Wait-LogCount 'settings' $to)) { throw 'ADBWALK-REP: the account settings page did not show (no frames line): no further input' }
        # Batch fixb3 (item 3): the Downloads row is below the first screen of the Account hub. After the gates and a focus check: ONE swipe
        # (swipes.accountDownloads: a fling that ends at the bottom of the hub), scrollSettleMs, the check of the scrolled hub
        # (screens.accountScrolled; its PNG is deleted in a finally inside Invoke-FileShot, never kept). A failed check sends no tap: it
        # throws into the catch below (the app is restarted and the restart proven). The tap goes out only after a passed check.
        Assert-AppFront
        [void](Invoke-ShellReq (Get-SwipeText 'accountDownloads'))
        Wait-Ms $script:Tm['scrollSettleMs'] 'scrollSettleMs'
        if (-not (Invoke-FileShot $Rec 'accountScrolled' ('shot-' + $Rec.step + '-' + (Get-Nn $Rec.rep) + '-scrolled.png'))) { throw 'ADBWALK-NOSCREEN: the scrolled Account hub check failed: no tap' }
        [void](Invoke-ShellReq 'logcat -c')
        Assert-AppFront
        $r = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-TapText 'accountDownloads'))
        Set-RepStamp $Rec $r.StdOut
        if (-not (Wait-FileGate 'loaddownloads' 'subscreenopen' $script:FileGateMs)) {
            throw 'ADBWALK-REP: the Downloads list did not show (gate loaddownloads = 1 and frames-subscreen-open): no further input'
        }
        if (-not (Invoke-FileShotCheck $Rec 'downloads')) { throw 'ADBWALK-NOSCREEN: the downloads screen check failed: no further input' }
        # #46 r2 (B2-3): the list opens at the TOP: chatNewer first (finger up, the list moves), then chatOlder.
        $sbase = Get-ScrollBase $Rec
        Assert-AppFront
        $r2 = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-SwipeText 'chatNewer'))
        Set-RepStamp2 $Rec $r2.StdOut
        Wait-Ms $script:Tm['scrollSettleMs'] 'scrollSettleMs'
        Assert-AppFront
        [void](Invoke-ShellReq (Get-SwipeText 'chatOlder'))
        Wait-Ms $script:Tm['scrollSettleMs'] 'scrollSettleMs'
        Wait-FilePull $Rec 'scrolllines' ($sbase + 1)
        Invoke-LogPull $Rec
        Invoke-BackReq
        if (-not (Wait-LogCount 'subscreenclose' $to)) { throw 'ADBWALK-REP: the Downloads list did not close (no frames line): no tap on Chats' }
        Assert-AppFront
        [void](Invoke-ShellReq (Get-TapText 'tabChats'))
        if (-not (Wait-LogCount 'settingsclosed' $to)) { throw 'ADBWALK-REP: the account settings page did not close (no close line)' }
        if (-not (Wait-LogCount 'chats' $to)) { throw 'ADBWALK-REP: Chats did not come back (no frames line)' }
        Wait-Ms 300 'after the Chats frames line'
    } catch {
        if (-not ([string]$_.Exception.Message).StartsWith('ADBWALK-STOP:')) { [void](Invoke-FileReset $Rec 'downloads: a failed rep after the Account tap') }
        throw
    }
}

function Invoke-OpenSeedRestart($Rec, [int]$K) {
    # Batch photo1a: the proven restart before the cold rep of the index $K (the filewalk method, Invoke-FileReset): the app
    # pid is read BEFORE (exactly one), force-stop + am start -W + the settle (Reset-AppToChats), exactly one different pid
    # after, our app in front, a home check (the PNG is deleted). Not proven: Invoke-FileReset has halted the run (no
    # further input) and this throws. Round 1 F2: no single pid before = the restart cannot be proven = the SAME halt as
    # Invoke-FileReset (Halted + HaltNote: no restart, no further input in this run), then this throws.
    if (-not (Invoke-EnsureHome)) { throw 'ADBWALK-NOSCREEN: foreign window in front (the app did not come back)' }
    if (-not (Save-FileRepPid)) {
        $script:Halted = $true
        $script:HaltNote = 'run stopped: an app restart was not proven (no further input)'
        Add-Note $Rec 'restart not proven: no app pid was stored before the restart: the run stops'
        Say-Log '  restart NOT proven (no app pid was stored before the restart): the run sends no further input'
        throw 'ADBWALK-REP: cannot read the app pid before the restart: no restart, no input'
    }
    # Round 1 F5: the shared restart helper prints its own fixed "tab step" text; this line says what this restart is.
    Say-Log ('  open-seed k=' + $K + ': planned restart before the cold rep (the "tab step" line below is the shared helper text, no tab rep ran)')
    if (-not (Invoke-FileReset $Rec ('open-seed k=' + $K + ': the restart before the cold rep'))) {
        throw 'ADBWALK-REP: no restart proof, so no further input'
    }
    # The restart is proven and consumed here: the rep that follows judges its own end state.
    $script:FileResetOk = $false; $script:NeedRecover = $false; $script:LastFailed = $false
    # Round 1 F1: a new process: no chat of this index was opened in it yet.
    $script:OpenSeedWarmKey = ''
    Add-Note $Rec 'restart proven before this rep'
}

function Invoke-OpenSeedRep($Rec, [int]$K, [bool]$Warmup = $false) {
    # One rep (cold or warm): logcat -c, stamp + the fa intent of the dev-seed address THIS script derives for the index
    # (t0), chatSettleMs, the chat check (PNG deleted), the wait (bounded, a count only) for the "[P1] chat media" line,
    # the log pull, BACK. The address is derived (Get-DevSeedAddress), never read from a file or typed; no input text.
    # From the intent command on, any failure restarts the app and proves the restart (Invoke-FileReset): fail closed.
    # Round 1 F1: $Warmup = the unrecorded warm-up open (the same shape, but no log pull; its $Rec is a scratch record).
    $addr = Get-DevSeedAddress $K
    $script:OpenSeedAddr[[string]$K] = $addr
    if (-not (Save-FileRepPid)) { throw 'ADBWALK-REP: cannot read the app pid before the intent: no input' }
    [void](Invoke-ShellReq 'logcat -c')
    try {
        $r = Invoke-ShellReq ($script:StampCmd + '; am start -n ' + $script:Comp + ' --es fa ' + $addr)
        $am = Read-AmOutput ($r.StdOut + "`n" + $r.StdErr)
        Add-AmResult $Rec $am
        Set-RepStamp $Rec $r.StdOut
        if ($am.Error) { throw ('ADBWALK-REP: am: ' + $am.Error) }
        Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
        if (-not (Invoke-FileShotCheck $Rec 'chat')) {
            if (-not $Warmup) { Invoke-LogPull $Rec }
            throw 'ADBWALK-NOSCREEN: the chat screen check failed: no BACK'
        }
        Wait-FilePull $Rec 'chatmedia' 0
        if (-not $Warmup) { Invoke-LogPull $Rec }
        Invoke-BackReq
        Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs'
        # Round 1 F1 / round 2: this process (the pid read before the intent) has now opened the chat of this index.
        $script:OpenSeedWarmKey = $script:FileRepPid + ':' + $K
    } catch {
        if (-not ([string]$_.Exception.Message).StartsWith('ADBWALK-STOP:')) {
            # Round 1 F1: the restart makes a new process (the next open is a first open); F5: the neutral line comes first.
            $script:OpenSeedWarmKey = ''
            Say-Log '  open-seed: a failed rep, the app is restarted (the "tab step" line below is the shared helper text, no tab rep ran)'
            [void](Invoke-FileReset $Rec 'open-seed: a failed rep after the intent')
        }
        throw
    }
}

function Invoke-OpenSeedWarmup($Rec, [int]$K) {
    # Round 1 F1: ONE unrecorded warm-up open of the index $K before a recorded warm rep whose app process or index differs from the last successful open (a restart, a
    # relaunch after the app died, a cold rep that failed): the same intent, the chat check, BACK (Invoke-OpenSeedRep
    # with $Warmup: no log pull, no row; a scratch record). A failed warm-up has already run the proven restart again
    # (Invoke-FileReset in Invoke-OpenSeedRep): the remaining reps of the index are skipped (fail closed) and this throws a SKIP.
    $w = New-Rep ($Rec.step + '-warmup') 0
    Say-Log ('  open-seed k=' + $K + ': one unrecorded warm-up open (the app process is new)')
    try {
        Invoke-OpenSeedRep $w $K $true
    } catch {
        $msg = [string]$_.Exception.Message
        if ($msg.StartsWith('ADBWALK-STOP:')) { throw }
        $script:OpenSeedSkipIdx = $true
        Add-Note $Rec 'warm-up open failed, rest of index skipped'
        foreach ($n in $w.notes) { $Rec.notes.Add($n) }
        throw 'ADBWALK-SKIP: the warm-up open failed'
    }
    Add-Note $Rec 'warm-up open before this rep'
}

function Invoke-OpenSeedOne($Rec, [int]$K, [bool]$Cold, [int]$Of) {
    # One recorded rep of open-seed (the status mapping of Invoke-Step). A halted run skips it.
    if ($script:Halted) {
        $Rec.status = 'skipped'
        Add-Note $Rec $script:HaltNote
    } else {
        try {
            if ($script:OpenSeedSkipIdx) { throw 'ADBWALK-SKIP: the warm-up open of this index failed, rep skipped' }
            if ($Cold) { Invoke-OpenSeedRestart $Rec $K }
            elseif (-not (Invoke-EnsureHome)) { throw 'ADBWALK-NOSCREEN: foreign window in front (the app did not come back)' }
            if ((-not $Cold) -and (Save-FileRepPid) -and ($script:OpenSeedWarmKey -cne ($script:FileRepPid + ':' + $K))) { Invoke-OpenSeedWarmup $Rec $K }
            Invoke-OpenSeedRep $Rec $K
        } catch {
            $msg = [string]$_.Exception.Message
            if ($msg.StartsWith('ADBWALK-STOP:')) { throw }
            if ($msg.StartsWith('ADBWALK-SKIP:')) { $Rec.status = 'skipped' }
            elseif ($msg.StartsWith('ADBWALK-NOSCREEN:')) { $Rec.status = 'no-screen' }
            else { $Rec.status = 'error' }
            Add-Note $Rec (Get-ErrText $_)
        }
    }
    Complete-Rep $Rec $Of
}

function Invoke-OpenSeedStep {
    # open-seed: per index (-SeedIndex, in the order given) the steps open-seed-kNN-cold (one rep, after a proven restart) and
    # open-seed-kNN (-Repeats reps). Calibration or -SeedIndex missing = ONE skipped rep "open-seed" with the gap, no input.
    $gap = Get-StepGap 'open-seed'
    if ($gap) {
        $rec = New-Rep 'open-seed' 1
        $rec.status = 'skipped'
        Add-Note $rec $gap
        Complete-Rep $rec 1
        return
    }
    foreach ($k in $script:SeedIdx) {
        $script:OpenSeedSkipIdx = $false
        $script:OpenSeedWarmKey = ''
        $nn = ([int]$k).ToString('00', $script:Inv)
        Invoke-OpenSeedOne (New-Rep ('open-seed-k' + $nn + '-cold') 1) ([int]$k) $true 1
        for ($i = 1; $i -le $script:RepeatsN; $i++) {
            Invoke-OpenSeedOne (New-Rep ('open-seed-k' + $nn) $i) ([int]$k) $false $script:RepeatsN
        }
    }
    # The step leaves Chats in front; after a failed rep, one bounded recovery.
    if ($script:NeedRecover -and -not $script:Halted) { [void](Invoke-EnsureHome) }
    # Round 1 F6: no PNG of this step stays in the run folder (the file steps sweep at their end too).
    Clear-FileStepPngs
}

function Test-TcpSerial {
    return ($script:DevSerial -cmatch ':[0-9]+\z' -or $script:DevSerial.Contains('_adb-tls-connect'))
}

function Invoke-NetworkRep($Rec) {
    # Wi-Fi off would cut a TCP adb link; and a Wi-Fi that was off must stay off: refuse both cases.
    if (Test-TcpSerial) { throw 'ADBWALK-SKIP: network step refused: adb runs over TCP (Wi-Fi), use USB' }
    $ws = Invoke-Shell 'dumpsys wifi | grep -e Wi-Fi.is'
    if ($ws.StdOut -cnotmatch '(?m)^Wi-Fi is enabled') { throw 'ADBWALK-SKIP: network step refused: Wi-Fi is not enabled at the start of the step' }
    [void](Invoke-ShellReq 'logcat -c')
    # Flag and pending file before the command: the restore happens even when this process dies right after.
    $script:WifiTouched = $true
    Write-Pending
    [void](Invoke-ShellReq 'svc wifi disable')
    Wait-Sec $script:Tm['wifiOffSec'] 'wifiOffSec'
    $r = Invoke-ShellReq ($script:StampCmd + '; svc wifi enable')
    Set-RepStamp $Rec $r.StdOut
    Wait-Sec 30 'after wifi enable'
    Invoke-LogPull $Rec
}

function Invoke-KillRendererRep($Rec) {
    $f = Find-Renderer
    if (-not $f.Confirmed -or -not $f.RendererPid) {
        $why = $f.Note
        if (-not $why) { $why = 'renderer not confirmed' }
        throw ('ADBWALK-SKIP: no confirmed renderer pid: ' + $why)
    }
    [void](Invoke-ShellReq 'logcat -c')
    $r = Invoke-Shell ($script:StampCmd + '; kill ' + $f.RendererPid)
    $s = Read-Stamp $r.StdOut
    if ($s.T0) { $Rec['t0'] = $s.T0 }
    $answer = (($r.StdOut -split "\r?\n" | Select-Object -Skip 1) -join ' ') + ' ' + $r.StdErr
    if ($r.ExitCode -ne 0 -or $r.TimedOut -or $answer -match '(?i)not permitted|denied|no such process') {
        throw ('ADBWALK-REP: kill refused (exit ' + $r.ExitCode + '): ' + (Get-SafeNote (Get-Clean $answer)))
    }
    if (-not $s.T0) { throw ('ADBWALK-REP: ' + $s.Note) }
    Wait-Sec 3 'after kill'
    $p = Invoke-Shell ('pidof ' + $script:Pkg)
    $now = @(Get-Pids $p.StdOut)
    if ($now -contains [string]$f.AppPid) { Add-Note $Rec 'app pid alive after 3 s' }
    elseif ($now.Count -gt 0) { Add-Note $Rec 'app pid changed within 3 s (restarted)' }
    else { Add-Note $Rec 'app pid gone after 3 s' }
    Invoke-ShotCheck $Rec ''
    Invoke-LogPull $Rec
}

function Invoke-RepBody($Rec) {
    $s = $Rec.step
    if ($s -eq 'coldstart') { Invoke-ColdstartRep $Rec }
    elseif ($s -eq 'chat-intent') { Invoke-ChatRep $Rec 'intent' }
    elseif ($s -eq 'chat-tap') { Invoke-ChatRep $Rec 'tap' }
    elseif ($s -eq 'scroll') { Invoke-ScrollRep $Rec }
    elseif ($s -eq 'resume') { Invoke-ResumeRep $Rec $script:Tm['resumeWaitSec'] (-1) }
    elseif ($s -eq 'resume-long') { Invoke-ResumeRep $Rec $script:Tm['resumeLongWaitSec'] (-1) }
    elseif ($s -eq 'resume-now') { Invoke-ResumeRep $Rec $script:Tm['resumeWaitSec'] 0 -DropOnFail }
    elseif ($s -eq 'resume-3s') { Invoke-ResumeRep $Rec $script:Tm['resumeWaitSec'] $script:Tm['resumeLateTapMs'] -DropOnFail }
    elseif ($s -eq 'chatinfo') { Invoke-ChatInfoRep $Rec }
    elseif ($script:TabNames.ContainsKey($s)) { Invoke-TabRep $Rec }
    elseif ($s -eq 'history') { Invoke-HistoryRep $Rec }
    elseif ($s -cmatch '\Ahistory-seed-k[0-9]{2}\z') { Invoke-HistorySeedRep $Rec }
    elseif ($s -eq 'scroll-image') { Invoke-ScrollRep $Rec }
    elseif ($script:FileChatKeys.ContainsKey($s)) { Invoke-FileChatRep $Rec }
    elseif ($s -eq 'viewer') { Invoke-ViewerRep $Rec }
    elseif ($s -eq 'downloads') { Invoke-DownloadsRep $Rec }
    elseif ($s -eq 'network') { Invoke-NetworkRep $Rec }
    elseif ($s -eq 'killrenderer') { Invoke-KillRendererRep $Rec }
    elseif ($s -eq 'coldstart-watch') { Invoke-ColdWatchRep $Rec }
}

function Invoke-Step([string]$Step, [int]$Count, [bool]$NeedsHome) {
    # Calibration is checked up front: a step whose taps or screens are missing never touches the phone.
    $gap = Get-StepGap $Step
    for ($i = 1; $i -le $Count; $i++) {
        $rec = New-Rep $Step $i
        $skip = ''
        if ($script:Halted) { $skip = $script:HaltNote }
        elseif ($gap) { $skip = $gap }
        elseif ($Step -eq 'chat-intent' -or $Step -eq 'chatinfo') { $skip = Get-SeedGap ($i - 1) }
        elseif ($Step -eq 'history') { $skip = Get-SeedGap ($i + 4) }
        if ($skip) {
            $rec.status = 'skipped'
            Add-Note $rec $skip
        } else {
            try {
                if ($NeedsHome -and -not (Invoke-EnsureHome)) { throw 'ADBWALK-NOSCREEN: foreign window in front (the app did not come back)' }
                Invoke-RepBody $rec
            } catch {
                $msg = [string]$_.Exception.Message
                if ($msg.StartsWith('ADBWALK-STOP:')) { throw }
                if ($msg.StartsWith('ADBWALK-SKIP:')) { $rec.status = 'skipped' }
                elseif ($msg.StartsWith('ADBWALK-NOSCREEN:')) { $rec.status = 'no-screen' }
                else { $rec.status = 'error' }
                Add-Note $rec (Get-ErrText $_)
            }
        }
        Complete-Rep $rec $Count
    }
}

function Invoke-ScrollStep([string]$Step, [int]$SeedK, [string]$What) {
    # scroll: seed 0 (a 1000-message text chat); scroll-image: the local imageChatAddress (walk steps 2).
    $script:ScrollOpen = ''
    $script:ScrollWhat = $What
    $opened = $false
    if (-not (Get-StepGap $Step) -and -not $script:Halted) {
        if (-not (Invoke-EnsureHome)) {
            $script:ScrollOpen = 'the app is not in front: ' + $What + ' was not opened'
        } else {
            $r = Invoke-Shell ('am start -n ' + $script:Comp + ' --es fa ' + (Get-Seed $SeedK))
            $am = Read-AmOutput ($r.StdOut + "`n" + $r.StdErr)
            if ($r.ExitCode -ne 0 -or $r.TimedOut -or $am.Error) {
                $why = $am.Error
                if (-not $why) { $why = Get-AdbWhy $r }
                $script:ScrollOpen = $What + ' did not open: ' + $why
                $script:NeedRecover = $true; $script:LastFailed = $true
            } else {
                $opened = $true
                Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
            }
        }
    }
    Invoke-Step $Step $script:RepeatsN $false
    if ($opened) {
        if (Invoke-Back) { Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs' }
        else { Say-Log ('  ' + $Step + ': foreign window in front, BACK not sent'); $script:NeedRecover = $true; $script:LastFailed = $true }
    }
}

function Invoke-MemPhase([string]$Phase) {
    $rec = [ordered]@{ phase = $Phase; status = 'ok' }
    $notes = New-Object System.Collections.Generic.List[string]
    if ($script:Halted) {
        $rec.status = 'skipped'; $notes.Add($script:HaltNote)
    } else {
        try {
            if (-not (Invoke-EnsureHome)) { $notes.Add('the app is not in front') }
            if ($Phase -eq 'trim') {
                [void](Invoke-ShellReq ('am send-trim-memory ' + $script:Pkg + ' RUNNING_LOW'))
                Wait-Sec 5 'after send-trim-memory'
            } else {
                Wait-Sec $script:Tm['memQuietSec'] 'memQuietSec'
            }
            $f = Find-Renderer
            if (-not $f.AppPid) { throw ('ADBWALK-REP: ' + $f.Note) }
            if ($script:FlagsAsked -and -not (Test-Ordinal ([string]$f.AppPid) $script:FlagsPid)) {
                $script:FlagsStopAfter = 'unproven-process'
                throw 'ADBWALK-REP: app process changed after the switch state was proven'
            }
            $rec['appPid'] = $f.AppPid
            $appFile = 'meminfo-' + $Phase + '-app.txt'
            $e = Save-Meminfo $f.AppPid $appFile
            if ($e) { throw ('ADBWALK-REP: ' + $e) }
            $rec['appFile'] = $appFile
            # Renderer data only for a CONFIRMED renderer.
            if ($f.Confirmed -and $f.RendererPid) {
                $rFile = 'meminfo-' + $Phase + '-renderer.txt'
                $e2 = Save-Meminfo $f.RendererPid $rFile
                if ($e2) { $notes.Add('renderer: ' + $e2) }
                else { $rec['rendererPid'] = $f.RendererPid; $rec['rendererFile'] = $rFile }
            }
            if ($f.Note) { $notes.Add('renderer: ' + $f.Note) }
        } catch {
            $msg = [string]$_.Exception.Message
            if ($msg.StartsWith('ADBWALK-STOP:')) { throw }
            $rec.status = 'error'
            $notes.Add((Get-ErrText $_))
        }
    }
    $full = $notes -join ', '
    $rec['note'] = Get-SafeNote $full
    $script:Mem.Add($rec)
    Save-RunJson $false
    $line = '[mem-' + $Phase + '] ' + $rec.status
    if ($rec.Contains('appPid')) { $line += ' app pid ' + $rec['appPid'] }
    if ($rec.Contains('rendererPid')) { $line += ', renderer pid ' + $rec['rendererPid'] }
    if ($full) { $line += ' - ' + (Get-SafeNote $full) }
    Say-Log $line
    if ($script:FlagsStopAfter) { Stop-Flags $script:FlagsStopAfter }
}

# ---------------------------------------------------------------- pre-flight
function Get-PackageInfo {
    $r = Invoke-Shell ('dumpsys package ' + $script:Pkg + ' | grep -e versionName= -e versionCode= -e lastUpdateTime=')
    $o = @{ VersionName = ''; VersionCode = ''; LastUpdate = '' }
    foreach ($l in (Split-Lines $r.StdOut)) {
        $t = Get-Clean $l
        if (-not $t) { continue }
        if (-not $o.VersionName -and $t -cmatch 'versionName=([0-9A-Za-z._-]{1,40})(\s|\z)') { $o.VersionName = $Matches[1] }
        if (-not $o.VersionCode -and $t -cmatch 'versionCode=([0-9]{1,12})(\s|\z)') { $o.VersionCode = $Matches[1] }
        if (-not $o.LastUpdate -and $t -cmatch 'lastUpdateTime=([0-9: -]{1,40})') { $o.LastUpdate = Get-Clean $Matches[1] }
    }
    return $o
}

function Test-PackageInstalled {
    $r = Invoke-Shell ('pm path ' + $script:Pkg)
    return ($r.ExitCode -eq 0 -and $r.StdOut -cmatch '(?m)^package:')
}

function Get-DeviceFacts {
    $f = @{}
    $rel = Get-Clean (Invoke-Shell 'getprop ro.build.version.release').StdOut
    $f.Release = ''
    if ($rel -cmatch '^[0-9A-Za-z._-]{1,20}\z') { $f.Release = $rel }
    $sdk = Get-Clean (Invoke-Shell 'getprop ro.build.version.sdk').StdOut
    $f.Sdk = ''
    if ($sdk -cmatch '^[0-9]{1,3}\z') { $f.Sdk = $sdk }
    $f.Width = $null; $f.Height = $null; $f.Density = $null
    $ws = (Invoke-Shell 'wm size').StdOut
    if ($ws -cmatch 'Physical size:\s*([0-9]{1,5})x([0-9]{1,5})') { $f.Width = [int]$Matches[1]; $f.Height = [int]$Matches[2] }
    $f.Override = ($ws -cmatch 'Override size:\s*([0-9]{1,5}x[0-9]{1,5})')
    $f.OverrideText = ''
    if ($f.Override) { $f.OverrideText = $Matches[1] }
    $wd = (Invoke-Shell 'wm density').StdOut
    if ($wd -cmatch 'Physical density:\s*([0-9]{1,4})') { $f.Density = [int]$Matches[1] }
    # The refresh rate as one rounded number; no raw dumpsys text leaves the phone.
    $disp = (Invoke-Shell 'dumpsys display | grep -i -e framerate').StdOut
    $f.Refresh = ''
    $num = $null
    if ($disp -cmatch 'mActiveRenderFrameRate=([0-9]{1,4}(\.[0-9]{1,9})?)') { $num = $Matches[1] }
    elseif ($disp -cmatch 'renderFrameRate ([0-9]{1,4}(\.[0-9]{1,9})?)') { $num = $Matches[1] }
    if ($num) { $f.Refresh = 'renderFrameRate=' + [math]::Round([double]::Parse($num, $script:Inv)) }
    return $f
}

function Select-Device {
    [void](Invoke-Adb -AdbArgs @('start-server') -NoSerial -TimeoutSec 30)
    $r = Invoke-Adb -AdbArgs @('devices') -NoSerial -TimeoutSec 30
    if ($r.ExitCode -ne 0) { Stop-Walk ('adb devices failed: ' + (Get-AdbWhy $r)) }
    $rows = New-Object System.Collections.Generic.List[object]
    foreach ($l in (Split-Lines $r.StdOut)) {
        $t = Get-Clean $l
        if (-not $t -or $t.StartsWith('List of devices') -or $t.StartsWith('*')) { continue }
        # adb prints <serial><TAB><state>; any other row is "other" and never selected. States from a fixed set only.
        $cells = $l.TrimEnd([char]13).Split([char]9)
        if ($cells.Count -ne 2 -or -not $cells[0]) { $rows.Add(@{ Id = $null; State = 'other' }); continue }
        $st = 'other'
        foreach ($known in @('device', 'unauthorized', 'offline', 'recovery', 'sideload', 'bootloader', 'host')) { if (Test-Ordinal $cells[1] $known) { $st = $known } }
        if ($cells[1].StartsWith('no permissions', [System.StringComparison]::Ordinal)) { $st = 'no permissions' }
        $rows.Add(@{ Id = $cells[0]; State = $st })
    }
    $states = @($rows | ForEach-Object { $_.State }) -join ', '
    if (-not $states) { $states = 'none' }
    Say ('  adb devices: ' + $rows.Count + ' attached (' + $states + ')')
    if ($Serial) {
        $hit = @($rows | Where-Object { $_.Id -and (Test-Ordinal $_.Id $Serial) })
        if ($hit.Count -eq 0) { Stop-Walk 'the -Serial device is not attached' }
        if ($hit[0].State -ne 'device') { Stop-Walk ('the -Serial device is in state ' + $hit[0].State) }
        $sel = $Serial
    } else {
        $ready = @($rows | Where-Object { $_.Id -and $_.State -ceq 'device' })
        if ($ready.Count -eq 0) { Stop-Walk ('no phone in state device (seen: ' + $states + '); unauthorized = accept the USB debugging prompt') }
        if ($ready.Count -gt 1) { Stop-Walk ([string]$ready.Count + ' phones in state device: pass -Serial') }
        $sel = $ready[0].Id
    }
    # A short serial cannot be masked without corrupting numbers in the output.
    if (-not (Test-SerialMaskable $sel)) { Stop-Walk 'serial too short to mask safely: pass none / use USB' }
    $sl = $sel.ToLowerInvariant()
    foreach ($word in (@($script:AllSteps) + @('killrenderer', $script:Pkg, 'shot', 'android-walk', 'meminfo', 'cal', 'summary', 'run'))) {
        if ($word.Contains($sl) -or $sl.Contains($word)) { Stop-Walk 'serial collides with an output word: masking it would rewrite file names' }
    }
    $script:DevSerial = $sel
}

function Invoke-Preflight {
    Say-Log ('pre-flight (adb: ' + [System.IO.Path]::GetFileName($script:AdbPath) + ')')
    Select-Device
    $model = Get-Clean (Invoke-Shell 'getprop ro.product.model').StdOut
    $want = [string](Get-Field (Get-Field $script:Cfg 'device') 'model')
    if (-not $model) { Stop-Walk 'cannot read ro.product.model' }
    if (-not (Test-Ordinal $model $want)) { Stop-Walk ('wrong phone: model ' + (Get-SafeNote $model) + ', a52s.json wants ' + $want) }
    # A run that was killed left its restore behind: apply it before any other gate, and before reading the "old" value.
    Invoke-PendingRestore
    $b = Invoke-Shell 'dumpsys battery'
    if ($b.StdOut -cnotmatch '(?m)^\s*level:\s*([0-9]{1,3})') { Stop-Walk 'cannot read the battery level' }
    $level = [int]$Matches[1]
    if ($level -le 50) { Stop-Walk ('battery ' + $level + '% (needs more than 50%): charge the phone') }
    $script:BatteryLevel = $level
    Say ('  phone ' + (Get-SafeNote $model) + ', battery ' + $level + '%')
    if ($Apk) {
        $before = $null
        if (Test-PackageInstalled) { $before = Get-PackageInfo }
        Say '  install -r (this can take a minute)'
        $ir = Invoke-Adb -AdbArgs @('install', '-r', $script:ApkFull) -TimeoutSec 300
        if ($ir.ExitCode -ne 0 -or $ir.StdOut -cnotmatch '(?m)^Success') {
            Stop-Walk ('install -r failed (exit ' + $ir.ExitCode + '): ' + (Get-AdbWhy $ir))
        }
        if (-not (Test-PackageInstalled)) { Stop-Walk ('after install -r ' + $script:Pkg + ' is still missing: the APK is not the dev build') }
        $after = Get-PackageInfo
        if ($before -and $before.LastUpdate -and $after.LastUpdate -eq $before.LastUpdate) {
            Stop-Walk ('install -r did not update ' + $script:Pkg + ' (lastUpdateTime unchanged): is the APK the dev build?')
        }
        Say-Log '  installed'
    }
    if (-not (Test-PackageInstalled)) { Stop-Walk ('package ' + $script:Pkg + ' is not installed') }
    $ra = Invoke-Shell ('cmd package resolve-activity --brief -c android.intent.category.LAUNCHER ' + $script:Pkg)
    $lastLine = ''
    foreach ($l in (Split-Lines $ra.StdOut)) { $c = Get-Clean $l; if ($c) { $lastLine = $c } }
    if ($lastLine -cnotmatch ('^' + [regex]::Escape($script:Pkg) + '/([A-Za-z0-9_.]{1,120})\z')) {
        Stop-Walk 'cannot resolve the launcher activity'
    }
    $script:Comp = $lastLine
    $activity = $Matches[1]
    $pi = Get-PackageInfo
    $facts = Get-DeviceFacts
    $script:Facts = $facts
    $script:PkgInfo = $pi
    $stay = Get-Clean (Invoke-Shell 'settings get global stay_on_while_plugged_in').StdOut
    if ($stay -cnotmatch '^([0-9]|1[0-5])\z') { Stop-Walk 'cannot read stay_on_while_plugged_in (not 0..15)' }
    $script:StayOld = [int]$stay
    $zen = Get-Clean (Invoke-Shell 'settings get global zen_mode').StdOut
    $script:Dnd = ''
    if ($zen -cmatch '^[1-3]\z') { $script:Dnd = 'on' } elseif ($zen -cmatch '^0\z') { $script:Dnd = 'off' }
    if ($script:Dnd -eq 'off') { Say-Log 'WARNING: Do not disturb is off: a notification of another app can appear in a screenshot (turn it on for unattended runs)' }
    elseif (-not $script:Dnd) { Say-Log 'WARNING: Do not disturb state unknown: a notification of another app can appear in a screenshot (turn it on for unattended runs)' }

    # From here on the script changes phone state: the restore is persisted FIRST.
    Write-Pending
    [void](Invoke-Shell 'input keyevent KEYCODE_WAKEUP')
    Start-Sleep -Milliseconds 500
    [void](Invoke-Shell 'wm dismiss-keyguard')
    Start-Sleep -Milliseconds 1500
    $st = Get-ScreenState
    if (-not $st.Awake) { Stop-Walk 'the screen did not wake: unlock the phone, keep it on, run again' }
    if ($st.Locked) { Stop-Walk ('unlock the phone (' + $st.Why + ' after wm dismiss-keyguard); the script never types a PIN') }
    $sr = Invoke-Shell 'svc power stayon usb'
    if ($sr.ExitCode -ne 0) { Say-Log ('  warning: svc power stayon usb failed: ' + (Get-AdbWhy $sr)) }
    $g = Invoke-Shell 'logcat -G 16M'
    if ($g.ExitCode -ne 0) { Say-Log ('  warning: logcat -G 16M failed (the log buffer may be small): ' + (Get-AdbWhy $g)) }
    $c = Invoke-Shell 'logcat -c'
    if ($c.ExitCode -ne 0) { Stop-Walk ('logcat -c failed: ' + (Get-AdbWhy $c)) }

    $dev = [ordered]@{ model = (Get-SafeNote $model) }
    if ($facts.Release) { $dev['release'] = $facts.Release }
    if ($facts.Sdk) { $dev['sdk'] = $facts.Sdk }
    if ($null -ne $facts.Width) { $dev['width'] = $facts.Width; $dev['height'] = $facts.Height }
    if ($null -ne $facts.Density) { $dev['density'] = $facts.Density }
    $dev['refresh'] = $facts.Refresh
    if ($script:Dnd) { $dev['dnd'] = $script:Dnd }
    $script:DevInfo = $dev
    $script:AppInfo = [ordered]@{ package = $script:Pkg; activity = $activity; versionName = $pi.VersionName; versionCode = $pi.VersionCode }
    Say-Log ('pre-flight ok: ' + (Get-SafeNote $model) + ' Android ' + $facts.Release + ', ' + $script:Pkg + ' ' + $pi.VersionName + ' (' + $pi.VersionCode + ')')
}

# ---------------------------------------------------------------- walk and calibrate
function Get-EstimateSec {
    $t = $script:Tm
    $n = $script:RepeatsN
    $sum = 30
    if ($script:FlagsAsked) { $sum += 60 }
    foreach ($s in $script:StepsReq) {
        if ($s -eq 'coldstart') { $sum += $n * ($t['coldStartIdleSec'] + $t['coldStartSettleSec'] + 10) }
        elseif ($s -eq 'chat-intent' -or $s -eq 'chat-tap') { $sum += $n * (($t['chatSettleMs'] + $t['backSettleMs']) / 1000 + 6) }
        elseif ($s -eq 'scroll') { $sum += 5 + $n * (2 * $t['scrollSettleMs'] / 1000 + 6) }
        elseif ($s -eq 'resume') { $sum += $n * ($t['resumeWaitSec'] + ($t['chatSettleMs'] + $t['backSettleMs']) / 1000 + 10) }
        elseif ($s -eq 'resume-long') { $sum += $t['resumeLongWaitSec'] + ($t['chatSettleMs'] + $t['backSettleMs']) / 1000 + 10 }
        elseif ($s -eq 'mem-home' -or $s -eq 'mem-end') { $sum += $t['memQuietSec'] + 6 }
        elseif ($s -eq 'mem-trim') { $sum += 11 }
        elseif ($s -eq 'network') { $sum += $t['wifiOffSec'] + 36 }
        elseif ($s -eq 'killrenderer') { $sum += 12 }
        elseif ($s -eq 'resume-now') { $sum += $n * ($t['resumeWaitSec'] + ($t['chatSettleMs'] + $t['backSettleMs']) / 1000 + 8) }
        elseif ($s -eq 'resume-3s') { $sum += $n * ($t['resumeWaitSec'] + ($t['resumeLateTapMs'] + $t['chatSettleMs'] + $t['backSettleMs']) / 1000 + 8) }
        elseif ($s -eq 'chatinfo') { $sum += $n * ((2 * $t['chatSettleMs'] + 2 * $t['backSettleMs']) / 1000 + 10) }
        elseif ($script:TabNames.ContainsKey($s)) { $sum += $n * (2 * $t['tabSettleMs'] / 1000 + 7) }
        elseif ($s -eq 'history' -and $script:HistSeedIdx -ge 0) { $sum += $n * ($t['coldStartSettleSec'] + 12 + ($t['chatSettleMs'] + $t['scrollSettleMs'] + $t['backSettleMs']) / 1000 + 6 * ($t['historySwipeMs'] / 1000 + 1) + 8) }
        elseif ($s -eq 'history') { $sum += $n * (($t['chatSettleMs'] + $t['scrollSettleMs'] + $t['backSettleMs']) / 1000 + 10 * ($t['historySwipeMs'] / 1000 + 1) + 8) }
        elseif ($s -eq 'scroll-image') { $sum += 5 + $n * (2 * $t['scrollSettleMs'] / 1000 + 6) }
        elseif ($script:FileChatKeys.ContainsKey($s)) { $sum += $n * (($t['chatSettleMs'] + 2 * $t['scrollSettleMs'] + $t['backSettleMs']) / 1000 + 10) }
        elseif ($s -eq 'viewer') { $sum += 5 + $t['chatSettleMs'] / 1000 + $n * ($t['backSettleMs'] / 1000 + 12) }
        elseif ($s -eq 'downloads') { $sum += $n * ((3 * $t['scrollSettleMs'] + 3 * $t['tabSettleMs']) / 1000 + 19) }
        # Batch photo1a: per index one restart (its own settle + 12 s of proof) and Repeats + 1 reps (the chat settle, the media wait, BACK).
        elseif ($s -eq 'open-seed') { $sum += $script:SeedIdx.Count * ($t['coldStartSettleSec'] + 12 + ($n + 1) * (($t['chatSettleMs'] + $t['backSettleMs']) / 1000 + 10)) }
        elseif ($s -eq 'mem-photos') { $sum += $t['memQuietSec'] + 6 }
        # Batch walktools2 (item 2): per rep the idle, the fixed wait and about 8 s of commands (a start that is not proven adds two pulls).
        elseif ($s -eq 'coldstart-watch') { $sum += $n * ($t['coldStartIdleSec'] + $script:WatchWaitSec + 8) }
    }
    return [int]$sum
}

function Invoke-Walk {
    $script:WalkStarted = $true
    Save-RunJson $false
    $est = Get-EstimateSec
    Say-Log ('walk: ' + ($script:StepsReq -join ', ') + ' x ' + $script:RepeatsN + ' - estimate about ' + [math]::Ceiling($est / 60) + ' min')
    if ($script:FlagsAsked) { Invoke-FlagsSetup }
    foreach ($s in $script:StepsReq) {
        if ($s -eq 'coldstart') { Invoke-Step 'coldstart' $script:RepeatsN $false }
        elseif ($s -eq 'mem-home') { Invoke-MemPhase 'home' }
        elseif ($s -eq 'chat-intent') { Invoke-Step 'chat-intent' $script:RepeatsN $true }
        elseif ($s -eq 'chat-tap') { Invoke-Step 'chat-tap' $script:RepeatsN $true }
        elseif ($s -eq 'scroll') { Invoke-ScrollStep 'scroll' 0 'the chat of seed 0' }
        elseif ($s -eq 'resume-now' -or $s -eq 'resume-3s' -or $s -eq 'chatinfo' -or $script:TabNames.ContainsKey($s)) { Invoke-Step $s $script:RepeatsN $true }
        elseif ($s -eq 'history' -and $script:HistSeedIdx -ge 0) { Invoke-HistorySeedStep }
        elseif ($s -eq 'history') {
            Invoke-Step 'history' $script:RepeatsN $true
            # The step leaves the chat closed: after a failed rep, one bounded recovery.
            if ($script:NeedRecover -and -not $script:Halted) { [void](Invoke-EnsureHome) }
        }
        elseif ($s -eq 'scroll-image') { Invoke-ScrollStep 'scroll-image' $script:ImageSeed 'the image chat' }
        elseif ($script:FileChatKeys.ContainsKey($s) -or $s -eq 'downloads') {
            # Batch filewalk: each rep starts from Chats and leaves the app there; after a failed rep, one bounded recovery.
            Invoke-Step $s $script:RepeatsN $true
            if ($script:NeedRecover -and -not $script:Halted -and -not (Get-StepGap $s)) { [void](Invoke-EnsureHome) }
            Clear-FileStepPngs
        }
        elseif ($s -eq 'viewer') { Invoke-ViewerStep }
        elseif ($s -eq 'open-seed') { Invoke-OpenSeedStep }
        elseif ($s -eq 'mem-photos') { Invoke-MemPhase 'photos' }
        elseif ($s -eq 'resume') { Invoke-Step 'resume' $script:RepeatsN $true }
        elseif ($s -eq 'resume-long') { Invoke-Step 'resume-long' 1 $true }
        elseif ($s -eq 'network') { Invoke-Step 'network' 1 $false }
        elseif ($s -eq 'mem-end') { Invoke-MemPhase 'end' }
        elseif ($s -eq 'mem-trim') { Invoke-MemPhase 'trim' }
        elseif ($s -eq 'killrenderer') { Invoke-Step 'killrenderer' 1 $true }
        # Batch walktools2 (item 2): every rep force-stops and cold-starts the app itself (no home check before a rep).
        elseif ($s -eq 'coldstart-watch') { Invoke-Step 'coldstart-watch' $script:RepeatsN $false }
    }
}

function Save-CalShot([string]$Name, [string]$Expect, $Cal) {
    $entry = [ordered]@{ file = $Name; expect = $Expect }
    $local = $null
    try {
        # Focus BEFORE screencap: a foreign window is never photographed.
        if (-not (Test-AppFront)) {
            $entry['error'] = 'foreign window in front (no screenshot)'
            Say ('  ' + $Name + ' not taken: foreign window in front')
        } else {
            $local = Save-Shot $Name
            if (-not (Test-AppFront)) {
                $entry['error'] = 'foreign window during the screenshot (PNG deleted)'
                $gone = Remove-LocalFile $local
                if (-not $gone) { $entry['error'] = 'foreign window during the screenshot, local file not deleted' }
                $local = $null
                if ($gone) { Say ('  ' + $Name + ' deleted: foreign window during the screenshot') }
                else { Say ('  ' + $Name + ' NOT deleted: foreign window during the screenshot') }
            } else {
                $Cal.files.Add($Name)
                Say ('  ' + $Name)
            }
        }
    } catch {
        $m = [string]$_.Exception.Message
        if ($m.StartsWith('ADBWALK-STOP:')) { throw }
        $entry['error'] = Get-ErrText $_
        Say ('  ' + $Name + ' failed: ' + $entry['error'])
    }
    $script:CalShots.Add(@{ Entry = $entry; Path = $local })
}

function Add-CalTry($Cal, [string]$Name, [string]$Result, [string]$Note) {
    $Cal.tries.Add([ordered]@{ name = $Name; result = $Result; note = (Get-SafeNote $Note) })
    Say ('  try ' + $Name + ': ' + $Result)
}

function Invoke-CalInput($Cal, [string]$Cmd, [string]$Label) {
    # Every tap and swipe is gated by the focus; returns $true when the input was sent.
    if (-not (Test-AppFront)) { $Cal.notes.Add($Label + ' skipped: foreign window in front'); return $false }
    [void](Invoke-Shell $Cmd)
    return $true
}

function Get-LoadMoreCount {
    # The number of "[P1] shell send loadmore" lines since the last logcat -c; $null when unreadable.
    $p = Invoke-Shell $script:LoadPollCmd
    if ($p.TimedOut) { return $null }
    if ((Get-Clean $p.StdOut) -cmatch '^([0-9]{1,9})\z') { return [int]$Matches[1] }
    return $null
}

function Get-LogCount([string]$Key) {
    # The number of lines of one frames-poll kind since the last logcat -c (a count only); $null when unreadable.
    $cmd = $script:FramePoll[$Key]
    if (-not $cmd) { return $null }
    $p = Invoke-Shell $cmd
    if ($p.TimedOut) { return $null }
    if ((Get-Clean $p.StdOut) -cmatch '^([0-9]{1,9})\z') { return [int]$Matches[1] }
    return $null
}

function Wait-LogCount([string]$Key, [int]$TimeoutMs, [int]$Above = 0) {
    # Polls every 300 ms until the count is above $Above (0 = at least one line); $false at the timeout.
    # At least one poll is made, also with a timeout of 0.
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    while ($true) {
        $c = Get-LogCount $Key
        if ($null -ne $c -and $c -gt $Above) { Write-WalkLog ('frames line ' + $Key + ' after ' + $sw.ElapsedMilliseconds + ' ms'); return $true }
        if ($sw.ElapsedMilliseconds -ge $TimeoutMs) { Write-WalkLog ('no frames line ' + $Key + ' within ' + $TimeoutMs + ' ms'); return $false }
        Start-Sleep -Milliseconds 300
    }
}

function Get-LastCalShot {
    if ($script:CalShots.Count -eq 0) { return $null }
    return $script:CalShots[$script:CalShots.Count - 1]
}

function Test-CalShotScreen($Shot, [string]$Expect) {
    # The probe check of a calibration PNG at once; a screenshot that was not taken fails.
    if ($null -eq $Shot -or -not $Shot.Path) { return $false }
    # A screen that is not calibrated is never a confirmed screen.
    if (Get-ScreenGap $Expect) { return $false }
    $chk = Test-Screen $Shot.Path $Expect
    return [bool]$chk.Ok
}

function Remove-CalShot($Cal, $Shot, [string]$Why) {
    # A calibration PNG that is not the screen it was meant to be may show Wallet or Account: it is deleted.
    $name = [string]$Shot.Entry['file']
    if (Remove-LocalFile $Shot.Path) {
        $Shot.Entry['error'] = $Why + ': PNG deleted'
        $Shot.Path = $null
        [void]$Cal.files.Remove($name)
        Say ('  ' + $name + ' deleted: ' + $Why)
    } else {
        $Shot.Entry['error'] = $Why + ': local file not deleted'
        Say ('  ' + $name + ' NOT deleted: ' + $Why)
    }
}

function Invoke-CalNewTaps($Cal) {
    # One try of each tap point and swipe of the walk-steps-2 steps; cal-log.txt then holds their log lines.
    # No screenshot while Apps, Wallet or Account is in front: those tabs show TEST account data.
    # The tab taps are gated like the walk (no logcat -c here: cal-log.txt keeps the earlier lines, so the count
    # BEFORE the tap is read and a count above it is awaited), and a screen check comes before each later input.
    $gapSeed0 = Get-SeedGap 0
    if ($gapSeed0) { $Cal.notes.Add('cal-08..10 not taken: ' + $gapSeed0) }
    elseif (Get-TapGap 'chatHeader') { $Cal.notes.Add('cal-08..10 not taken: ' + (Get-TapGap 'chatHeader')) }
    else {
        $seedI = Get-Seed 0
        [void](Invoke-Shell ('am start -n ' + $script:Comp + ' --es fa ' + $seedI))
        Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
        if (Invoke-CalInput $Cal (Get-TapText 'chatHeader') 'cal-08 tap') {
            Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
            Save-CalShot 'cal-08-chatinfo.png' 'chatinfo' $Cal
            if (Invoke-Back) { Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs' } else { $Cal.notes.Add('cal-09 BACK not sent: foreign window in front') }
            Save-CalShot 'cal-09-chat-after-info.png' 'chat' $Cal
        }
        if (Invoke-Back) { Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs' } else { $Cal.notes.Add('cal-10 BACK not sent: foreign window in front') }
        Save-CalShot 'cal-10-home-after-info.png' 'home' $Cal
    }
    # The last screenshot (cal-10, or cal-07 when cal-08..10 were not tried) must be the home screen: no tab tap otherwise.
    $homeUp = Test-CalShotScreen (Get-LastCalShot) 'home'
    # $skip12: why cal-12..13 are not tried. A cal-11 that failed (a tab tap that did not complete, or a PNG that is not
    # home) or that was not tried because home was not confirmed leaves the screen unknown: no further input.
    $skip12 = ''
    if (Get-TapGap 'tabChats') { $Cal.notes.Add('cal-11 not taken: ' + (Get-TapGap 'tabChats')) }
    elseif (-not $homeUp) {
        $Cal.notes.Add('cal-11 not taken: the last screenshot is not a confirmed home screen')
        $skip12 = 'the home screen was not confirmed before cal-11'
    }
    else {
        $tabKeys = @{ 'tabApps' = 'apps'; 'tabWallet' = 'wallet'; 'tabAccount' = 'account' }
        $to = 3 * $script:Tm['tabSettleMs']
        $failed = $false
        foreach ($tn in @('tabApps', 'tabWallet', 'tabAccount')) {
            if (Get-TapGap $tn) { $Cal.notes.Add('cal-11 ' + $tn + ' not tried: ' + (Get-TapGap $tn)); continue }
            $key = $tabKeys[$tn]
            $b = Get-LogCount $key
            $bs = 0
            $bcl = 0
            if ($key -eq 'account') { $bs = Get-LogCount 'settings'; $bcl = Get-LogCount 'settingsclosed' }
            if ($null -eq $b -or $null -eq $bs -or $null -eq $bcl) { $Cal.notes.Add('cal-11 ' + $tn + ' not tried: cannot count the frames lines in the phone log'); $failed = $true; break }
            if (-not (Invoke-CalInput $Cal (Get-TapText $tn) ('cal-11 ' + $tn))) { $failed = $true; break }
            if (-not (Wait-LogCount $key $to $b)) { $Cal.notes.Add('cal-11 ' + $tn + ': no frames line, no tap back'); $failed = $true; break }
            if ($key -eq 'account') {
                if (-not (Wait-LogCount 'settings' $to $bs)) { $Cal.notes.Add('cal-11 ' + $tn + ': no SettingsPage frames line, no tap back'); $failed = $true; break }
            }
            $bc = Get-LogCount 'chats'
            if ($null -eq $bc) { $Cal.notes.Add('cal-11 ' + $tn + ': cannot count the Chats frames lines, no tap back'); $failed = $true; break }
            if (-not (Invoke-CalInput $Cal (Get-TapText 'tabChats') 'cal-11 tabChats')) { $failed = $true; break }
            if ($key -eq 'account') {
                if (-not (Wait-LogCount 'settingsclosed' $to $bcl)) { $Cal.notes.Add('cal-11 ' + $tn + ': the SettingsPage did not close (no close line)'); $failed = $true; break }
            }
            if (-not (Wait-LogCount 'chats' $to $bc)) { $Cal.notes.Add('cal-11 ' + $tn + ': Chats did not come back (no frames line)'); $failed = $true; break }
            Wait-Ms 300 'after the Chats frames line'
        }
        if ($failed) {
            $Cal.notes.Add('cal-11 screenshot not taken: a tab tap did not complete')
            $skip12 = 'cal-11 did not complete'
            # Wallet, Account or Apps may still be in front: restart the app (it boots on Chats) before anything else.
            Reset-AppToChats
            $Cal.notes.Add('cal-11 failed: the app was restarted (a cold start lands on Chats)')
        } else {
            Save-CalShot 'cal-11-home-after-tabs.png' 'home' $Cal
            $s11 = Get-LastCalShot
            if ($s11 -and $s11.Path -and -not (Test-CalShotScreen $s11 'home')) { Remove-CalShot $Cal $s11 'not home' }
            if (-not (Test-CalShotScreen (Get-LastCalShot) 'home')) {
                $skip12 = 'the cal-11 screenshot is not a confirmed home screen'
                Reset-AppToChats
                $Cal.notes.Add('cal-11 screenshot is not home: the app was restarted (a cold start lands on Chats)')
            }
        }
    }
    $gapSeed5 = Get-SeedGap 5
    if ($skip12) { $Cal.notes.Add('cal-12..13 not taken: ' + $skip12) }
    elseif ($gapSeed5) { $Cal.notes.Add('cal-12..13 not taken: ' + $gapSeed5) }
    elseif (Get-SwipeGap 'historyOlder') { $Cal.notes.Add('cal-12..13 not taken: ' + (Get-SwipeGap 'historyOlder')) }
    else {
        $seedH = Get-Seed 5
        [void](Invoke-Shell ('am start -n ' + $script:Comp + ' --es fa ' + $seedH))
        Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
        # The chat screen must be up before any swipe; its PNG is kept (a chat or home screen), unless it is neither.
        Save-CalShot 'cal-12a-history-before.png' 'chat' $Cal
        $s12a = Get-LastCalShot
        if (-not (Test-CalShotScreen $s12a 'chat')) {
            if ($s12a -and $s12a.Path -and -not (Test-CalShotScreen $s12a 'home')) { Remove-CalShot $Cal $s12a 'not chat and not home' }
            $Cal.notes.Add('cal-12..13 not taken: the chat screen was not confirmed before the swipes')
        } else {
            $c0 = Get-LoadMoreCount
            $k = 0
            $got = 0
            if ($null -ne $c0) {
                while ($k -lt $script:Tm['historyMaxSwipes']) {
                    if (-not (Invoke-CalInput $Cal (Get-SwipeText 'historyOlder') 'cal-12 swipe')) { break }
                    $k++
                    Wait-Ms $script:Tm['historySwipeMs'] 'historySwipeMs'
                    $c = Get-LoadMoreCount
                    if ($null -eq $c) { break }
                    $got = $c - $c0
                    if ($got -ge 3) { break }
                }
            }
            Wait-Ms $script:Tm['scrollSettleMs'] 'scrollSettleMs'
            $hres = 'ok'
            if ($got -lt 3) { $hres = 'error' }
            Add-CalTry $Cal 'history' $hres ('loadmore lines ' + $got + ' after ' + $k + ' swipes')
            Save-CalShot 'cal-12-history.png' 'chat' $Cal
            $s12 = Get-LastCalShot
            if ($s12 -and $s12.Path -and -not (Test-CalShotScreen $s12 'chat') -and -not (Test-CalShotScreen $s12 'home')) { Remove-CalShot $Cal $s12 'not chat and not home' }
            if (Invoke-Back) { Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs' } else { $Cal.notes.Add('cal-13 BACK not sent: foreign window in front') }
            Save-CalShot 'cal-13-home-after-history.png' 'home' $Cal
            $s13 = Get-LastCalShot
            if ($s13 -and $s13.Path -and -not (Test-CalShotScreen $s13 'home')) { Remove-CalShot $Cal $s13 'not home' }
        }
    }
    # Batch filewalk (#46 r1 B1-1): Invoke-CalFileTaps honours a failed cal-11 (no further input).
    $script:CalSkip12 = $skip12
}

function Test-CalGateShot($Cal, $Shot, [string]$Expect) {
    # Batch filewalk: a cal PNG taken after its gate passed. While screens.<Expect> is not calibrated the gate is its only
    # check (the PNG is kept, so the probes can be read from it); once it is calibrated a PNG that fails the probes is deleted.
    if ($null -eq $Shot -or -not $Shot.Path) { return $false }
    if (Get-ScreenGap $Expect) { return $true }
    if (Test-CalShotScreen $Shot $Expect) { return $true }
    Remove-CalShot $Cal $Shot ('not ' + $Expect)
    return $false
}

function Invoke-CalReset($Cal, [string]$Why) {
    # #46 r1 (S-W-1): the calibrate form of Invoke-FileReset (the restart is proven, its notes go to calibrate.json).
    # Returns: proven. Not proven = no further input in this calibrate run.
    $rec = New-Rep 'cal' 0
    $ok = Invoke-FileReset $rec $Why
    foreach ($n in $rec.notes) { $Cal.notes.Add($n) }
    if ($ok) { $Cal.notes.Add($Why + ': the app was restarted, the restart is proven') }
    else { $Cal.notes.Add($Why + ': the restart is NOT proven: no further input') }
    return $ok
}

function Invoke-CalAccountScroll($Cal) {
    # Batch fixb3 (item 3): -Calibrate, the Account hub is in front (after the tabAccount gates): ONE swipe (swipes.accountDownloads of the
    # map when it is valid, else the fixed calibrate default $script:CalHubSwipe; a key that is PRESENT but invalid adds its gap text to the
    # note (review round 3 n3: not only "the fixed calibrate default"); the line used is printed in calibrate.json and walk.log),
    # scrollSettleMs, then cal-17s = the scrolled hub. cal-17s is KEPT ONLY while screens.accountScrolled is not set (the lead reads its
    # probes and the Downloads row from it). When the key is set the picture is DELETED at once: after a pass ('confirmed, not kept', before
    # anything else) and after a fail. $script:CalHubReady (the tap may follow) is set ONLY when screens.accountScrolled passes AND
    # taps.accountDownloads is set. Returns: the swipe was sent.
    $script:CalHubReady = $false
    $cmd = $script:CalHubSwipe
    $src = 'the fixed calibrate default'
    if (-not (Get-SwipeGap 'accountDownloads')) { $cmd = Get-SwipeText 'accountDownloads'; $src = 'swipes.accountDownloads of a52s.json' }
    elseif ($null -ne (Get-Field (Get-Field $script:Cfg 'swipes') 'accountDownloads')) { $src = 'the fixed calibrate default; swipes.accountDownloads of a52s.json is present but unusable (' + (Get-SwipeGap 'accountDownloads') + ')' }
    $Cal.notes.Add('cal-17s swipe (' + $src + '): ' + $cmd)
    Say-Log ('  cal-17s swipe (' + $src + '): ' + $cmd)
    if (-not (Invoke-CalInput $Cal $cmd 'cal-17s swipe')) { return $false }
    Wait-Ms $script:Tm['scrollSettleMs'] 'scrollSettleMs'
    Save-CalShot 'cal-17s-account-scrolled.png' 'accountScrolled' $Cal
    $s17s = Get-LastCalShot
    if (-not $s17s -or -not $s17s.Path) { $Cal.notes.Add('cal-17s not taken: no tap on Downloads'); return $true }
    try {
        if (Get-ScreenGap 'accountScrolled') {
            $Cal.notes.Add('cal-17s kept: ' + (Get-ScreenGap 'accountScrolled') + ' (read the probes of the scrolled hub and the Downloads row from it: set at least one probe ON the Downloads row (its icon) at the y of taps.accountDownloads, at least one on a row edge, and minMatch = the number of probes, because the tap follows ONE fixed swipe; the load-time rule cannot see a fling that stops short by a whole row, so also put one probe on a feature that does not repeat: the end of the hub or its last row (text only, not enforced)); no tap on Downloads')
        } elseif (Test-CalShotScreen $s17s 'accountScrolled') {
            Remove-CalShot $Cal $s17s 'confirmed, not kept'
            if (Get-TapGap 'accountDownloads') { $Cal.notes.Add('no tap on Downloads: ' + (Get-TapGap 'accountDownloads') + ' (cal-17s was deleted because screens.accountScrolled is set: read the point from the picture of the first calibrate, or make a calibrate run with screens.accountScrolled removed from a52s.json)') }
            else { $script:CalHubReady = $true }
        } else {
            Remove-CalShot $Cal $s17s 'not the scrolled Account hub'
            $Cal.notes.Add('no tap on Downloads: the scrolled hub was not confirmed')
        }
    } finally {
        # Review round 2 (m2): an exception (an IOException while the probes read the PNG, Ctrl+C) must not leave the picture of the Account hub
        # once screens.accountScrolled is set. A path that deleted it already has no Path left.
        if (-not (Get-ScreenGap 'accountScrolled') -and $s17s.Path) { Remove-CalShot $Cal $s17s 'cleanup after an error: the key is set, the picture is never kept' }
    }
    return $true
}

function Invoke-CalHubBack($Cal, [int]$To, [int]$Bcl, [int]$Bc) {
    # Batch fixb3 (item 3): the way back from the scrolled Account hub when no tap on Downloads follows: the tabChats tap and the two
    # frames-line gates, as the old path ends. Returns '' when Chats is back, else the reason (the caller restarts the app, proven).
    if (-not (Invoke-CalInput $Cal (Get-TapText 'tabChats') 'cal-18 tabChats')) { $why = 'tabChats not sent' }
    elseif (-not (Wait-LogCount 'settingsclosed' $To $Bcl)) { $why = 'the SettingsPage did not close (no close line)' }
    elseif (-not (Wait-LogCount 'chats' $To $Bc)) { $why = 'Chats did not come back (no frames line)' }
    else { $why = '' }
    if ($why) { Add-CalTry $Cal 'account-scroll' 'error' $why }
    else { Add-CalTry $Cal 'account-scroll' 'ok' 'the Account hub was scrolled, no tap on Downloads' }
    return $why
}

function Invoke-CalFileTaps($Cal) {
    # Batch filewalk: cal-14 (the image chat, no tap) whenever imageChatAddress is an image seed and screens.chat exists, so
    # the photoTile point can be read from it; cal-15..16 (one tap of taps.photoTile) only when that key exists; cal-17a..18
    # (batch fixb3: the tabAccount tap, ONE swipe, cal-17s; the one try of taps.accountDownloads only when screens.accountScrolled
    # passes AND that tap key exists). Nothing at all after a failed cal-11 (#46 r1 B1-1). No logcat -c here: the counts before each
    # tap are read and the gates wait for counts above them. The ONE picture of the Account hub is cal-17s (kept only while
    # screens.accountScrolled is not set); a viewer or Downloads PNG only after its gate passed; any failure after an Account tap,
    # or a foreign window after the photo tap, restarts the app and proves the restart.
    $to = 3 * $script:Tm['tabSettleMs']
    if ($script:CalSkip12) { $Cal.notes.Add('cal-14..18 not taken: ' + $script:CalSkip12 + ' (no further input)'); return }
    if (-not $script:ImageViewerOk) { $Cal.notes.Add('cal-14..16 not taken: walk.local.json imageChatAddress is not an image seed (Seed 51-53)') }
    elseif (Get-ScreenGap 'chat') { $Cal.notes.Add('cal-14..16 not taken: ' + (Get-ScreenGap 'chat')) }
    else {
        [void](Invoke-Shell ('am start -n ' + $script:Comp + ' --es fa ' + (Get-Seed $script:ImageSeed)))
        Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
        Save-CalShot 'cal-14-image-chat.png' 'chat' $Cal
        $s14 = Get-LastCalShot
        $reset = $false
        $vOk = $false
        if (-not (Test-CalShotScreen $s14 'chat')) {
            if ($s14 -and $s14.Path) { Remove-CalShot $Cal $s14 'not chat' }
            $Cal.notes.Add('cal-15 not taken: the image chat was not confirmed before the tap')
        } elseif (Get-TapGap 'photoTile') {
            $Cal.notes.Add('cal-15 not taken: ' + (Get-TapGap 'photoTile') + ' (read the point from cal-14)')
            $vOk = $true
        } else {
            $bv = Get-LogCount 'viewimage'
            $bo = Get-LogCount 'overlayopen'
            if ($null -eq $bv -or $null -eq $bo) { $Cal.notes.Add('cal-15 not taken: cannot count the viewer lines in the phone log'); $vOk = $true }
            elseif (-not (Save-FileRepPid)) { $Cal.notes.Add('cal-15 not taken: cannot read the app pid before the tap'); $vOk = $true }
            elseif (Invoke-CalInput $Cal (Get-TapText 'photoTile') 'cal-15 tap') {
                $vOk = Wait-FileGate 'viewimage' 'overlayopen' $script:FileGateMs $bv $bo
                if ($vOk) {
                    Add-CalTry $Cal 'viewer' 'ok' 'viewimage and frames-overlay-open lines seen'
                    Save-CalShot 'cal-15-viewer.png' 'viewer' $Cal
                    [void](Test-CalGateShot $Cal (Get-LastCalShot) 'viewer')
                } else {
                    Add-CalTry $Cal 'viewer' 'error' 'no viewimage / frames-overlay-open gate: no screenshot, no BACK'
                }
                if (-not (Test-AppFront)) {
                    # The OS chooser (a tap before the thumbnail arrived) or another window: no input to it.
                    $reset = $true
                    if (-not (Invoke-CalReset $Cal 'cal-15: a foreign window after the tap')) { return }
                } elseif ($vOk -and (Invoke-Back)) { Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs' }
            } else { $vOk = $true }
        }
        # #46 r1 (S-W-8): after a failed viewer gate no BACK at all: cal-16 decides (deleted unless home).
        if (-not $reset -and $vOk) {
            if (Invoke-Back) { Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs' } else { $Cal.notes.Add('cal-16 BACK not sent: foreign window in front') }
        }
        Save-CalShot 'cal-16-home-after-viewer.png' 'home' $Cal
        $s16 = Get-LastCalShot
        if ($s16 -and $s16.Path -and -not (Test-CalShotScreen $s16 'home')) { Remove-CalShot $Cal $s16 'not home' }
    }
    $gapDl = ''
    foreach ($tn in @('tabAccount', 'tabChats')) { if (-not $gapDl) { $gapDl = Get-TapGap $tn } }
    if ($gapDl) { $Cal.notes.Add('cal-17..18 not taken: ' + $gapDl); return }
    # #46 r1 (B1-1): a FRESH home check right before the tabAccount tap (no stale earlier shot); a home PNG is kept as
    # the old home shots are, and deleted when it is not home.
    Save-CalShot 'cal-17a-home-before.png' 'home' $Cal
    $s17a = Get-LastCalShot
    if (-not (Test-CalShotScreen $s17a 'home')) {
        if ($s17a -and $s17a.Path) { Remove-CalShot $Cal $s17a 'not home' }
        $Cal.notes.Add('cal-17..18 not taken: the home screen was not confirmed right before the tabAccount tap')
        return
    }
    $ba = Get-LogCount 'account'; $bs = Get-LogCount 'settings'; $bcl = Get-LogCount 'settingsclosed'; $bc = Get-LogCount 'chats'
    $bl = Get-LogCount 'loaddownloads'; $bso = Get-LogCount 'subscreenopen'; $bsc = Get-LogCount 'subscreenclose'
    if ($null -eq $ba -or $null -eq $bs -or $null -eq $bcl -or $null -eq $bc -or $null -eq $bl -or $null -eq $bso -or $null -eq $bsc) {
        $Cal.notes.Add('cal-17..18 not taken: cannot count the frames lines in the phone log')
        return
    }
    if (-not (Save-FileRepPid)) { $Cal.notes.Add('cal-17..18 not taken: cannot read the app pid before the tap'); return }
    if (-not (Test-AppFront)) { $Cal.notes.Add('cal-17 tabAccount skipped: foreign window in front'); return }
    # From the tap command on the Account screen may be in front: every failure restarts the app, no second input.
    $why = ''
    $gateOk = $false
    $r = Invoke-Shell (Get-TapText 'tabAccount')
    if ($r.ExitCode -ne 0 -or $r.TimedOut) { $why = 'the tabAccount tap command failed' }
    elseif (-not (Wait-LogCount 'account' $to $ba)) { $why = 'no account frames line' }
    elseif (-not (Wait-LogCount 'settings' $to $bs)) { $why = 'no SettingsPage frames line' }
    # Batch fixb3 (item 3): the swipe and cal-17s first; the tap on Downloads and cal-17 only when screens.accountScrolled passes AND
    # taps.accountDownloads is set; else the way back without the tap.
    elseif (-not (Invoke-CalAccountScroll $Cal)) { $why = 'the accountDownloads swipe was not sent' }
    elseif (-not $script:CalHubReady) { $gateOk = $true; $why = Invoke-CalHubBack $Cal $to $bcl $bc }
    elseif (-not (Invoke-CalInput $Cal (Get-TapText 'accountDownloads') 'cal-17 accountDownloads')) { $why = 'accountDownloads not sent' }
    elseif (-not (Wait-FileGate 'loaddownloads' 'subscreenopen' $script:FileGateMs $bl $bso)) { $why = 'no loaddownloads / frames-subscreen-open gate' }
    else {
        $gateOk = $true
        Add-CalTry $Cal 'downloads' 'ok' 'loaddownloads and frames-subscreen-open lines seen'
        # #46 r1 (S-W-7 / B1-5): the Downloads list shows the newest files first.
        $Cal.notes.Add('cal-17 shows the newest downloads: take it right after Remove the seed, then Seed')
        Say '  cal-17 shows the newest downloads: take it right after Remove the seed, then Seed'
        Save-CalShot 'cal-17-downloads.png' 'downloads' $Cal
        $s17 = Get-LastCalShot
        if (-not $s17.Path) { $why = 'the Downloads screenshot was not taken' }
        elseif (-not (Test-CalGateShot $Cal $s17 'downloads')) { $why = 'the Downloads screenshot is not the Downloads list' }
        elseif (-not (Invoke-Back)) { $why = 'BACK not sent' }
        elseif (-not (Wait-LogCount 'subscreenclose' $to $bsc)) { $why = 'no frames-subscreen-close line' }
        elseif (-not (Invoke-CalInput $Cal (Get-TapText 'tabChats') 'cal-18 tabChats')) { $why = 'tabChats not sent' }
        elseif (-not (Wait-LogCount 'settingsclosed' $to $bcl)) { $why = 'the SettingsPage did not close (no close line)' }
        elseif (-not (Wait-LogCount 'chats' $to $bc)) { $why = 'Chats did not come back (no frames line)' }
    }
    if ($why) {
        if (-not $gateOk) { Add-CalTry $Cal 'downloads' 'error' $why }
        [void](Invoke-CalReset $Cal ('cal-17 failed (' + $why + ')'))
        return
    }
    Wait-Ms 300 'after the Chats frames line'
    Save-CalShot 'cal-18-home-after-downloads.png' 'home' $Cal
    $s18 = Get-LastCalShot
    if ($s18 -and $s18.Path -and -not (Test-CalShotScreen $s18 'home')) {
        Remove-CalShot $Cal $s18 'not home'
        [void](Invoke-CalReset $Cal 'cal-18 screenshot is not home')
    }
}

function Invoke-Calibrate {
    $cal = [ordered]@{ schema = 1; tool = 'adb-walk'; run = $script:RunName; mode = 'calibrate' }
    if ($script:Hook) { $cal['adbHook'] = $true }
    $cal['device'] = $script:DevInfo
    $cal['app'] = $script:AppInfo
    $cal['files'] = (New-Object System.Collections.Generic.List[string])
    $cal['screenshots'] = (New-Object System.Collections.Generic.List[object])
    $cal['tries'] = (New-Object System.Collections.Generic.List[object])
    $cal['notes'] = (New-Object System.Collections.Generic.List[string])
    $script:TriesFile = Join-Path $script:RunDir 'tries.txt'
    $f = $script:Facts
    $pi = $script:PkgInfo
    $d = Invoke-Shell $script:StampCmd
    $st = Read-Stamp $d.StdOut
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.AppendLine('adb-walk calibrate ' + $script:RunName)
    [void]$sb.AppendLine('model: ' + $script:DevInfo['model'])
    [void]$sb.AppendLine('release: ' + $f.Release)
    [void]$sb.AppendLine('sdk: ' + $f.Sdk)
    [void]$sb.AppendLine('wm size (physical): ' + $f.Width + 'x' + $f.Height + '   override: ' + $f.OverrideText)
    [void]$sb.AppendLine('wm density (physical): ' + $f.Density)
    [void]$sb.AppendLine('refresh: ' + $f.Refresh)
    [void]$sb.AppendLine('battery level: ' + $script:BatteryLevel)
    [void]$sb.AppendLine('stay_on_while_plugged_in (before the run): ' + $script:StayOld)
    [void]$sb.AppendLine('resolved component: ' + $script:Comp)
    [void]$sb.AppendLine('versionName: ' + $pi.VersionName)
    [void]$sb.AppendLine('versionCode: ' + $pi.VersionCode)
    if ($st.T0) { [void]$sb.AppendLine('phone date +%m-%dT%H:%M:%S.%N: parses, stamp ' + $st.T0 + ' (exit ' + $d.ExitCode + ')') }
    else { [void]$sb.AppendLine('phone date +%m-%dT%H:%M:%S.%N: ' + $st.Note + ' (exit ' + $d.ExitCode + ')') }
    [void]$sb.AppendLine('PNG probe reader (System.Drawing): ' + (Initialize-Drawing))
    Write-TextFile (Join-Path $script:RunDir 'device.txt') $sb.ToString()
    $cal.files.Add('device.txt')
    Say '  device.txt'

    [void](Invoke-Shell ('am force-stop ' + $script:Pkg))
    [void](Invoke-Shell ('am start -W -n ' + $script:Comp) 60)
    Wait-Sec 12 'calibrate start'
    Save-CalShot 'cal-01-home.png' 'home' $cal
    $seed0 = $null
    if (-not (Get-SeedGap 0)) { $seed0 = Get-Seed 0 }
    if ($seed0) {
        [void](Invoke-Shell ('am start -n ' + $script:Comp + ' --es fa ' + $seed0))
        Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
        Save-CalShot 'cal-02-chat-intent.png' 'chat' $cal
        if (-not (Get-SwipeGap 'chatOlder')) {
            if (Invoke-CalInput $cal (Get-SwipeText 'chatOlder') 'cal-03 swipe') {
                Wait-Ms $script:Tm['scrollSettleMs'] 'scrollSettleMs'
                Save-CalShot 'cal-03-chat-scrolled.png' 'chat' $cal
            }
        } else { $cal.notes.Add('cal-03 not taken: ' + (Get-SwipeGap 'chatOlder')) }
        if (Invoke-Back) { Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs' } else { $cal.notes.Add('cal-04 BACK not sent: foreign window in front') }
        Save-CalShot 'cal-04-home-after-back.png' 'home' $cal
    } else { $cal.notes.Add('cal-02..04 not taken: ' + (Get-SeedGap 0)) }
    if (-not (Get-TapGap 'chatRow1')) {
        if (Invoke-CalInput $cal (Get-TapText 'chatRow1') 'cal-05 tap') {
            Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'
            Save-CalShot 'cal-05-chat-tap.png' 'chat' $cal
            if (Invoke-Back) { Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs' } else { $cal.notes.Add('cal-06 BACK not sent: foreign window in front') }
            Save-CalShot 'cal-06-home.png' 'home' $cal
        }
    } else { $cal.notes.Add('cal-05..06 not taken: ' + (Get-TapGap 'chatRow1')) }
    [void](Invoke-Shell 'input keyevent 3')
    Wait-Sec 3 'after home key'
    [void](Invoke-Shell ('am start -n ' + $script:Comp))
    Wait-Sec 3 'after am start'
    Save-CalShot 'cal-07-home-resumed.png' 'home' $cal
    Invoke-CalNewTaps $cal
    Invoke-CalFileTaps $cal
    Clear-FileStepPngs

    Say '  renderer lookup (lines in tries.txt):'
    $fr = Find-Renderer
    $tb = New-Object System.Text.StringBuilder
    [void]$tb.AppendLine('== renderer lookup')
    [void]$tb.AppendLine('app pid: ' + $fr.AppPid)
    [void]$tb.AppendLine('renderer pid: ' + $fr.RendererPid + '  confirmed: ' + $fr.Confirmed)
    [void]$tb.AppendLine('note: ' + (Get-SafeNote $fr.Note))
    if ($fr.OwnPsLines.Count -gt 0) {
        [void]$tb.AppendLine('--- ps -A lines of the pids named under ' + $script:Pkg)
        foreach ($l in $fr.OwnPsLines) { [void]$tb.AppendLine($l) }
    } else {
        [void]$tb.AppendLine('--- sandboxed processes in ps -A: ' + $fr.CandCount)
    }
    [void]$tb.AppendLine('--- dumpsys activity services ' + $script:Pkg + ' (ServiceRecord, app=, processName=, packageName= lines)')
    foreach ($l in $fr.RawLines) { [void]$tb.AppendLine($l) }
    Write-TextFile $script:TriesFile $tb.ToString()
    $rres = 'ok'
    if (-not $fr.Confirmed) { $rres = 'error' }
    Add-CalTry $cal 'renderer-lookup' $rres $fr.Note
    if ($fr.AppPid) {
        $e = Save-Meminfo $fr.AppPid 'meminfo-cal-app.txt'
        if ($e) { Add-CalTry $cal 'meminfo-app' 'error' $e } else { $cal.files.Add('meminfo-cal-app.txt'); Add-CalTry $cal 'meminfo-app' 'ok' '' }
    } else { Add-CalTry $cal 'meminfo-app' 'error' $fr.Note }
    if ($fr.Confirmed -and $fr.RendererPid) {
        $e = Save-Meminfo $fr.RendererPid 'meminfo-cal-renderer.txt'
        if ($e) { Add-CalTry $cal 'meminfo-renderer' 'error' $e } else { $cal.files.Add('meminfo-cal-renderer.txt'); Add-CalTry $cal 'meminfo-renderer' 'ok' '' }
    } else { Add-CalTry $cal 'meminfo-renderer' 'error' 'no confirmed renderer pid' }

    try {
        $ln = Save-Log 'cal-log.txt'
        $cal.files.Add('cal-log.txt')
        if ($ln) { $cal.notes.Add('cal-log.txt: ' + $ln) }
        Say '  cal-log.txt'
    } catch { $cal.notes.Add('cal-log.txt: ' + (Get-ErrText $_)) }
    $cal.files.Add('tries.txt')

    # Batch walktools (item 2): the notes for the sets form of screens.chat and screens.viewer, ONLY when a screen of the map holds sets (a map in
    # the old form gives the same calibrate.json as before). No new step, no new input. Each note is one line inside Get-SafeNote's alphabet.
    if ((Test-HasField (Get-Field (Get-Field $script:Cfg 'screens') 'chat') 'sets') -or (Test-HasField (Get-Field (Get-Field $script:Cfg 'screens') 'viewer') 'sets')) {
        $cal.notes.Add('chat sets: 3 pill probes and 1 on the Aa glyph of the message field (chat only, the pill alone is a white strip)')
        $cal.notes.Add('viewer is checked only after the chat check passes: fill the chat sets before the calibrate that reads the viewer')
    }
    # Batch walktools2 (item 3): screens.home in the sets form: the note says where the passing set is named (a map whose home has the old
    # form gives the calibrate.json of before).
    if (Test-HasField (Get-Field (Get-Field $script:Cfg 'screens') 'home') 'sets') {
        $cal.notes.Add('home sets: every home check names the set that passed in its probes entry, ok (set light) or ok (set dark)')
    }
    foreach ($s in $script:CalShots) {
        $e = $s.Entry
        if ($s.Path) {
            # Size first (IHDR only); a PNG of the wrong size is never decoded.
            $size = Get-PngSize $s.Path
            if ($size) { $e['width'] = $size.W; $e['height'] = $size.H; $e['sizeOk'] = ($size.W -eq $script:W -and $size.H -eq $script:H) }
            else { $e['sizeOk'] = $false }
            $gap = Get-ScreenGap $e.expect
            if (-not $e['sizeOk']) { $e['probes'] = 'not decoded: size mismatch' }
            elseif ($gap) { $e['probes'] = 'not calibrated: ' + $gap }
            else {
                $pr = Test-Probes $s.Path $e.expect
                # Batch walktools (item 2): the sets form: 'ok (set light)', matched / of of the passing set (none: null), one line per set in
                # 'sets', and every probe with its set in probeDetail. The old form writes exactly what it wrote before.
                if ($pr.Ok) { if ($pr.Set) { $e['probes'] = 'ok (set ' + $pr.Set + ')' } else { $e['probes'] = 'ok' } } else { $e['probes'] = $pr.Note }
                $e['matched'] = $pr.Matched
                $e['of'] = $pr.Of
                if ($pr.Sets.Count -gt 0) { $e['sets'] = $pr.Sets }
                $e['probeDetail'] = $pr.Detail
            }
            Say ('  check ' + $e.file + ': size ' + $e['width'] + 'x' + $e['height'] + ', probes: ' + $e['probes'])
        }
        $cal.screenshots.Add($e)
    }
    $safeNotes = New-Object System.Collections.Generic.List[string]
    foreach ($n in $cal.notes) { $safeNotes.Add((Get-SafeNote $n)) }
    $cal['notes'] = $safeNotes
    $cal.files.Add('calibrate.json')
    $cal.files.Add('walk.log')
    Write-JsonFile (Join-Path $script:RunDir 'calibrate.json') $cal
}

# ---------------------------------------------------------------- lock
function Enter-Lock {
    $script:LockPath = Join-Path $script:Root ('.lock' + $script:LockSuffix)
    $myStart = [System.Diagnostics.Process]::GetCurrentProcess().StartTime.ToUniversalTime().ToString('o', $script:Inv)
    $content = ConvertTo-Json -InputObject ([ordered]@{ pid = $PID; started = $myStart }) -Depth 8
    $bytes = $script:Utf8.GetBytes($content)
    $created = $false
    try {
        # Atomic: CreateNew fails when the file exists.
        $fs = [System.IO.File]::Open($script:LockPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
        try { $fs.Write($bytes, 0, $bytes.Length) } finally { $fs.Dispose() }
        $created = $true
    } catch { if (-not [System.IO.File]::Exists($script:LockPath)) { throw } }
    if (-not $created) {
        $live = $false
        $oldId = 0
        try {
            # Read by pattern, not ConvertFrom-Json: PowerShell 7 would turn the ISO time into a DateTime.
            $lt = [System.IO.File]::ReadAllText($script:LockPath)
            $oldStart = ''
            if ($lt -cmatch '"pid":\s*([0-9]{1,9})') { $oldId = [int]$Matches[1] }
            if ($lt -cmatch '"started":\s*"([0-9T:.Z+-]{1,40})"') { $oldStart = $Matches[1] }
            if ($oldId -gt 0 -and $oldId -ne $PID) {
                $proc = Get-Process -Id $oldId -ErrorAction SilentlyContinue
                # Only a PowerShell process can be another adb-walk run; any other live pid is a reused pid.
                if ($proc -and (@('powershell', 'pwsh', 'powershell_ise') -contains $proc.ProcessName.ToLowerInvariant())) {
                    # Same pid AND the same start time (1 s tolerance: Linux derives StartTime from clock ticks).
                    # A start time that cannot be read (either side) fails closed: refuse.
                    try {
                        $was = [DateTime]::Parse($oldStart, $script:Inv, [System.Globalization.DateTimeStyles]::RoundtripKind).ToUniversalTime()
                        $live = ([math]::Abs(($proc.StartTime.ToUniversalTime() - $was).TotalSeconds) -lt 1)
                    } catch { $live = $true }
                }
            }
        } catch { $live = $true }
        if ($live) {
            $why = 'another adb-walk run holds the lock (PID ' + $oldId + ')'
            try {
                $rl = Join-Path $script:Root ('adb-walk-refused' + $script:RefusedSuffix + '.log')
                if ([System.IO.File]::Exists($rl) -and (New-Object System.IO.FileInfo($rl)).Length -gt 65536) {
                    [System.IO.File]::WriteAllText($rl, ([DateTime]::Now.ToString('yyyy-MM-ddTHH:mm:ss', $script:Inv) + " log restarted`r`n"), $script:Utf8)
                }
                [System.IO.File]::AppendAllText($rl, ([DateTime]::Now.ToString('yyyy-MM-ddTHH:mm:ss', $script:Inv) + ' refused: ' + (Protect-Text $why) + "`r`n"), $script:Utf8)
            } catch { }
            Stop-Walk $why
        }
        [System.IO.File]::WriteAllBytes($script:LockPath, $bytes)
        Write-Host 'adb-walk: a stale lock was taken over'
    }
    $script:LockOwned = $true
}

function Exit-Lock {
    if (-not $script:LockOwned) { return }
    try {
        $lt = [System.IO.File]::ReadAllText($script:LockPath)
        if ($lt -cmatch '"pid":\s*([0-9]{1,9})' -and [int]$Matches[1] -eq $PID) { [System.IO.File]::Delete($script:LockPath) }
    } catch { Write-Host 'adb-walk: cannot remove the lock file' }
}

# ---------------------------------------------------------------- main: arguments first, no adb before they pass
function Exit-Usage([string]$Why) {
    Say ('adb-walk: ' + $Why)
    exit 1
}

if ($Calibrate) { $script:Mode = 'calibrate' }
if ($PSBoundParameters.ContainsKey('Flags')) {
    # Batch perfb1toggle: exactly the canonical state, anchored and case-sensitive; an array (PowerShell call) is joined.
    if ($Calibrate) { Exit-Usage '-Flags cannot be used with -Calibrate' }
    $flagsText = ($Flags -join ',')
    if ($flagsText -cnotmatch '\Awarmidle=[01],sparerearm=[01],sparekeep=[01],noemptydetail=[01]\z') {
        Exit-Usage '-Flags must be exactly warmidle=<0|1>,sparerearm=<0|1>,sparekeep=<0|1>,noemptydetail=<0|1> (all four names, this order, no space)'
    }
    else {
        # Only a checked text is ever adopted, whatever Exit-Usage does.
        $script:FlagsAsked = $flagsText
        $script:FlagsAskedState = $flagsText.Replace(',', ' ')
        # Not proven until the state line of the cold start has been read back and compared.
        $script:FlagsOk = $false
    }
}
if ($Repeats -lt 1 -or $Repeats -gt 50) { Exit-Usage '-Repeats must be 1..50' }
$script:RepeatsN = $Repeats
if ($Serial -and -not (Test-SerialMaskable $Serial)) { Exit-Usage 'serial too short to mask safely: pass none / use USB' }
$want = New-Object System.Collections.Generic.List[string]
foreach ($stepArg in $Steps) {
    foreach ($part in ([string]$stepArg -split ',')) {
        $stepName = $part.Trim(' ').ToLowerInvariant()
        if (-not $stepName) { continue }
        if ($script:AllSteps -notcontains $stepName) { Exit-Usage ('unknown step "' + $stepName + '" (known: ' + ($script:AllSteps -join ', ') + '; -KillRenderer adds killrenderer)') }
        $want.Add($stepName)
    }
}
if ($want.Count -eq 0) { $script:StepsReq = @($script:DefaultSteps) }
else { $script:StepsReq = @($script:AllSteps | Where-Object { $want -contains $_ }) }
if ($KillRenderer) { $script:StepsReq = @($script:StepsReq) + @('killrenderer') }
# Batch walktools2 (item 2): coldstart-watch restarts the app in every rep. Refused before any adb command with -Calibrate (a calibrate
# runs no step) and with -Flags (the switch state of each new process would not be proven).
if ($want -contains 'coldstart-watch') {
    if ($Calibrate) { Exit-Usage 'the step coldstart-watch cannot be used with -Calibrate' }
    if ($script:FlagsAsked) { Exit-Usage 'the step coldstart-watch cannot be combined with -Flags (every rep restarts the app: the new process has no proven switch state)' }
}

# Batch photo1a: -SeedIndex = the dev-seed indexes of open-seed (0..55, 0 = Seed 01; 1 to 8 values, no repeat). A string array
# on purpose: with powershell -File a comma list reaches [int[]] as ONE number (0,50,51 -> 05051), so the script splits
# and checks the text itself. Any other value, -Calibrate, -Flags with open-seed, or no open-seed step: refused here,
# before any adb command. The addresses are derived by this script and armed as masks (<seed-index k>) at once; nothing is
# read from a file and nothing is typed.
if ($PSBoundParameters.ContainsKey('SeedIndex')) {
    if ($Calibrate) { Exit-Usage '-SeedIndex cannot be used with -Calibrate' }
    $seedText = (@($SeedIndex) | ForEach-Object { [string]$_ }) -join ','
    $seedParts = @($seedText -split ',')
    if ($seedParts.Count -lt 1 -or $seedParts.Count -gt 8) { Exit-Usage '-SeedIndex takes 1 to 8 whole numbers 0..55 (the dev-seed index, 0 = Seed 01), as a comma list' }
    $seedCheck = New-Object System.Collections.Generic.List[int]
    foreach ($seedPart in $seedParts) {
        $seedTrim = $seedPart.Trim(' ')
        if ($seedTrim -cnotmatch '\A[0-9]{1,2}\z') { Exit-Usage '-SeedIndex takes only whole numbers 0..55 (the dev-seed index), as a comma list' }
        $seedNum = [int]::Parse($seedTrim, $script:Inv)
        if ($seedNum -lt 0 -or $seedNum -gt 55) { Exit-Usage '-SeedIndex takes only whole numbers 0..55 (the dev-seed index, 0 = Seed 01)' }
        if ($seedCheck.Contains($seedNum)) { Exit-Usage '-SeedIndex names an index twice' }
        $seedCheck.Add($seedNum)
    }
    if ($script:StepsReq -notcontains 'open-seed') { Exit-Usage '-SeedIndex needs the step open-seed in -Steps' }
    if ($script:FlagsAsked) { Exit-Usage '-SeedIndex (open-seed) cannot be combined with -Flags (every index restarts the app: the new process has no proven switch state)' }
    $script:SeedIdx = @($seedCheck.ToArray())
    foreach ($seedNum in $script:SeedIdx) { $script:OpenSeedAddr[[string]$seedNum] = Get-DevSeedAddress $seedNum }
}

# Batch fixb3 (item 4): -HistorySeed = ONE dev-seed index (a whole number 0..55, 55 = Seed 56) for the step history. A string array on
# purpose, as -SeedIndex (a -File comma list is joined and refused here). Refused before any adb command: with -Calibrate, with -Flags
# (every rep restarts the app: the new process has no proven switch state), without history named in -Steps, and any value that is not
# exactly one number 0..55. The address is derived by this script (Get-DevSeedAddress) and armed as a mask (<seed-index k>) at once.
if ($PSBoundParameters.ContainsKey('HistorySeed')) {
    if ($Calibrate) { Exit-Usage '-HistorySeed cannot be used with -Calibrate' }
    $histText = (@($HistorySeed) | ForEach-Object { [string]$_ }) -join ','
    if ($histText -cnotmatch '\A[0-9]{1,2}\z') { Exit-Usage '-HistorySeed takes ONE whole number 0..55 (the dev-seed index, 0 = Seed 01, 55 = Seed 56)' }
    $histNum = [int]::Parse($histText, $script:Inv)
    if ($histNum -lt 0 -or $histNum -gt 55) { Exit-Usage '-HistorySeed takes ONE whole number 0..55 (the dev-seed index, 0 = Seed 01, 55 = Seed 56)' }
    if ($want -notcontains 'history') { Exit-Usage '-HistorySeed needs the step history named in -Steps' }
    if ($script:FlagsAsked) { Exit-Usage '-HistorySeed cannot be combined with -Flags (every rep restarts the app: the new process has no proven switch state)' }
    $script:HistSeedIdx = $histNum
    $script:HistorySeedStep = 'history-seed-k' + $histNum.ToString('00', $script:Inv)
    $script:OpenSeedAddr[[string]$histNum] = Get-DevSeedAddress $histNum
}

$cfgPath = Join-Path $PSScriptRoot 'a52s.json'
if (-not (Test-Path -LiteralPath $cfgPath)) { Exit-Usage 'a52s.json is missing next to this script' }
if ((New-Object System.IO.FileInfo($cfgPath)).Length -gt 65536) { Exit-Usage 'a52s.json is larger than 64 KB' }
try { $script:Cfg = Read-JsonFile $cfgPath } catch { Exit-Usage ('a52s.json is not valid JSON (' + $_.Exception.GetType().Name + ')') }
if ((Get-Field $script:Cfg 'schema') -ne 1) { Exit-Usage 'a52s.json schema is not 1' }
$cfgPkg = [string](Get-Field $script:Cfg 'package')
# The store app holds a real account: only the pinned package is ever driven.
if ($cfgPkg -cne $script:PinnedPackage) { Exit-Usage ('a52s.json package "' + (Get-SafeNote $cfgPkg) + '" is not the pinned ' + $script:PinnedPackage + ': refused') }
$script:Pkg = $script:PinnedPackage
# Batch walktools (item 2): the sets form is for screens.chat and screens.viewer ONLY (batch walktools2 item 3: and screens.home). Any other
# screen with a sets key (accountScrolled included: it keeps its old form and its own rule below) is a usage error before any adb command.
$scrAll = Get-Field $script:Cfg 'screens'
if ($scrAll -is [System.Management.Automation.PSCustomObject]) {
    foreach ($scrKey in @($scrAll.PSObject.Properties.Name)) {
        if ((Test-HasField (Get-Field $scrAll $scrKey) 'sets') -and (@('home', 'chat', 'viewer') -cnotcontains $scrKey)) { Exit-Usage ('a52s.json screens.' + $scrKey + ' has sets: only screens.home, screens.chat and screens.viewer may use sets') }
    }
}
foreach ($scrName in @('home', 'chat', 'chatinfo', 'viewer', 'downloads')) {
    if (@(Get-Field (Get-Field (Get-Field $script:Cfg 'screens') $scrName) 'probes').Count -gt 16) { Exit-Usage ('a52s.json screens.' + $scrName + ' has more than 16 probes') }
    # Batch walktools (item 2): the same limit for every set of chat / viewer (and home, walktools2) (more than 4 sets is a gap in Get-ScreenGap, so the loop stays short).
    foreach ($limSet in @(Get-Field (Get-Field (Get-Field $script:Cfg 'screens') $scrName) 'sets' | Select-Object -First 4)) {
        if (@(Get-Field $limSet 'probes').Count -gt 16) { Exit-Usage ('a52s.json screens.' + $scrName + ' has a set with more than 16 probes') }
    }
}
# Batch fixb3 (item 3): the new screen of the Account hub has the same probe limit.
if (@(Get-Field (Get-Field (Get-Field $script:Cfg 'screens') 'accountScrolled') 'probes').Count -gt 16) { Exit-Usage 'a52s.json screens.accountScrolled has more than 16 probes' }
$cdev = Get-Field $script:Cfg 'device'
if (-not [string](Get-Field $cdev 'model')) { Exit-Usage 'a52s.json device.model is missing' }
if (-not (Test-IsInt (Get-Field $cdev 'width')) -or -not (Test-IsInt (Get-Field $cdev 'height'))) { Exit-Usage 'a52s.json device.width/height are not integers' }
$script:W = [int](Get-Field $cdev 'width')
$script:H = [int](Get-Field $cdev 'height')
if ($script:W -lt 1 -or $script:H -lt 1 -or $script:W -gt 10000 -or $script:H -gt 10000) { Exit-Usage 'a52s.json device.width/height must be 1..10000' }
# Batch fixb3 (item 3, review round 2 m2): a screens.accountScrolled that is PRESENT but invalid is a usage error (fail closed, before any adb
# command): "key set" must mean a valid key, and only an ABSENT key keeps the calibrate picture cal-17s.
if ($null -ne (Get-Field (Get-Field $script:Cfg 'screens') 'accountScrolled') -and (Get-ScreenGap 'accountScrolled')) { Exit-Usage ('a52s.json screens.accountScrolled is invalid (' + (Get-ScreenGap 'accountScrolled') + '): fix it, or remove the key (only an absent key keeps the calibrate picture)') }
# Batch fixb3 (item 3, review round 1 m4): the Downloads tap goes out after ONE fixed swipe, so it is safe only when the probes of the scrolled
# hub pin the scroll position. When BOTH screens.accountScrolled and taps.accountDownloads are set (valid), refuse before any adb command
# unless minMatch = the number of probes (every probe must match) and at least ONE probe sits within 60 px (in y) of the Downloads tap
# (the probe ON the Downloads row, e.g. its icon). That a second probe sits on a row edge is written in the header and the calibrate note.
if (-not (Get-ScreenGap 'accountScrolled') -and -not (Get-TapGap 'accountDownloads')) {
    $asScr = Get-Field (Get-Field $script:Cfg 'screens') 'accountScrolled'
    $asProbes = @(Get-Field $asScr 'probes')
    $asTapY = [int](Get-Field (Get-Field (Get-Field $script:Cfg 'taps') 'accountDownloads') 'y')
    $asNear = 0
    foreach ($asPr in $asProbes) { if ([Math]::Abs([int](Get-Field $asPr 'y') - $asTapY) -le 60) { $asNear++ } }
    if ([int](Get-Field $asScr 'minMatch') -lt $asProbes.Count) { Exit-Usage 'a52s.json screens.accountScrolled.minMatch must equal the number of probes (every probe must match: the tap on Downloads is safe only when the probes pin the scroll position)' }
    if ($asNear -lt 1) { Exit-Usage 'a52s.json screens.accountScrolled has no probe within 60 px (in y) of taps.accountDownloads: put one probe ON the Downloads row (its icon) and one on a row edge' }
}
$timing = Get-Field $script:Cfg 'timing'
foreach ($k in $script:TimingKeys) {
    $v = Get-Field $timing $k
    $max = 900
    if ($k.EndsWith('Ms', [System.StringComparison]::Ordinal)) { $max = 60000 }
    if (-not (Test-IsInt $v) -or $v -lt 0 -or $v -gt $max) { Exit-Usage ('a52s.json timing.' + $k + ' is not an integer 0..' + $max) }
    $script:Tm[$k] = [int]$v
}
Initialize-Allowlist

$script:RepoPath = [System.IO.Path]::GetFullPath((Join-Path (Join-Path $PSScriptRoot '..') '..')).TrimEnd([System.IO.Path]::DirectorySeparatorChar)
$script:Root = Join-Path (Join-Path $script:RepoPath 'Claude outputs') 'adbwalk'
$localJson = Join-Path $script:Root 'walk.local.json'
if (Test-Path -LiteralPath $localJson) {
    if ((New-Object System.IO.FileInfo($localJson)).Length -gt 65536) { Exit-Usage 'walk.local.json is larger than 64 KB' }
    $seedCount = 0
    try { $seedCount = @(Get-Field (Read-JsonFile $localJson) 'seedAddresses').Count } catch { }
    if ($seedCount -gt 64) { Exit-Usage 'walk.local.json has more than 64 seed addresses' }
    try {
        $lj = Read-JsonFile $localJson
        $k = 0
        foreach ($seedItem in @(Get-Field $lj 'seedAddresses')) {
            $str = [string]$seedItem
            if ($str -cmatch '^[1-9A-HJ-NP-Za-km-z]{30,60}\z') { $script:Seeds.Add($str) }
            else { $script:Seeds.Add($null); $script:SeedNote[$k] = ('walk.local.json seed ' + $k + ' is not a base58 address') }
            $k++
        }
        $script:SeedAddrCount = $script:Seeds.Count
        # Walk steps 2: the optional address of the image chat (the image seed of speed batch 1a). It is masked like a seed.
        $img = [string](Get-Field $lj 'imageChatAddress')
        if ($img -cmatch '^[1-9A-HJ-NP-Za-km-z]{30,60}\z') { $script:Seeds.Add($img); $script:ImageSeed = $script:Seeds.Count - 1 }
        # Batch filewalk: the optional addresses of the three file chats (the file seed), checked and masked the same way.
        # #46 r1 (S-W-4): each must be the derived address of its seed; another address is masked, never used.
        foreach ($fileKey in @('fileChatAddress', 'voiceChatAddress', 'photoChatAddress')) {
            $fileAddr = [string](Get-Field $lj $fileKey)
            if ($fileAddr -cmatch '^[1-9A-HJ-NP-Za-km-z]{30,60}\z') {
                $script:Seeds.Add($fileAddr)
                $want = Get-DevSeedAddress $script:FileSeedIndex[$fileKey]
                if (Test-Ordinal $fileAddr $want) { $script:FileSeed[$fileKey] = $script:Seeds.Count - 1 }
                else { $script:FileKeyNote[$fileKey] = ('walk.local.json ' + $fileKey + ' is not the address of Seed ' + ($script:FileSeedIndex[$fileKey] + 1) + ': step refused') }
            }
        }
        # viewer only (scroll-image keeps its old check): the image chat must be one of the image seeds 50..52.
        if ($script:ImageSeed -ge 0) {
            foreach ($imgIdx in @(50, 51, 52)) { if (Test-Ordinal ([string]$script:Seeds[$script:ImageSeed]) (Get-DevSeedAddress $imgIdx)) { $script:ImageViewerOk = $true } }
        }
    } catch { Write-Host 'adb-walk: walk.local.json is unreadable: steps that need a seed address are skipped' }
}

if ($Apk) {
    # A relative path is resolved against the PowerShell location, not the process directory.
    try { $script:ApkFull = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Apk) } catch { Exit-Usage '-Apk is not a valid path' }
    $script:ApkDir = [System.IO.Path]::GetDirectoryName($script:ApkFull)
    if (-not (Test-Path -LiteralPath $script:ApkFull -PathType Leaf) -or $script:ApkFull -cnotmatch '\.apk\z') { Exit-Usage '-Apk must name an existing .apk file' }
    # The name guard keeps "install -r" away from the store app (same signature, real account).
    if (-not (Test-ApkName $script:ApkFull)) { Exit-Usage ('the APK name does not start with ' + $script:PinnedPackage + ': refused') }
}

if ($env:ADBWALK_ADB) {
    if (-not (Test-Path -LiteralPath $env:ADBWALK_ADB -PathType Leaf)) { Exit-Usage 'ADBWALK_ADB names no file' }
    $script:AdbPath = $env:ADBWALK_ADB
    $script:Hook = $true
    Say ('TEST HOOK: adb is replaced by ' + [System.IO.Path]::GetFileName($script:AdbPath) + ' - NOT a device run')
    # A hook run never reads, applies or deletes the device run's lock, pending restore or refusal log.
    $script:LockSuffix = '.hook'
} else {
    $cmd = Get-Command 'adb.exe' -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $cmd) { $cmd = Get-Command 'adb' -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1 }
    if (-not $cmd) { Exit-Usage 'adb is not on PATH (install Android platform-tools)' }
    $script:AdbPath = $cmd.Path
}

$script:RefusedSuffix = ''
$pendingName = 'restore-pending.json'
if ($script:Hook) { $script:RefusedSuffix = '.hook'; $pendingName = 'restore-pending.hook.json' }
$script:PendingPath = Join-Path $script:Root $pendingName

$ok = $false
try {
    [void][System.IO.Directory]::CreateDirectory($script:Root)
    Enter-Lock
    $script:StartedIso = [DateTime]::UtcNow.ToString('o', $script:Inv)
    $prefix = ''
    if ($script:Hook) { $prefix = 'hook-' }
    if ($script:Mode -eq 'calibrate') { $prefix += 'calibrate-' }
    $stamp = (Get-Date).ToString('yyyyMMdd-HHmm', $script:Inv)
    $dir = Join-Path $script:Root ($prefix + $stamp)
    $n = 2
    while (Test-Path -LiteralPath $dir) { $dir = Join-Path $script:Root ($prefix + $stamp + '-' + $n); $n++ }
    [void][System.IO.Directory]::CreateDirectory($dir)
    $script:RunDir = $dir
    $script:RunName = Split-Path -Leaf $dir
    $script:WalkLog = Join-Path $dir 'walk.log'
    if ($script:Hook) { Write-WalkLog ('TEST HOOK: adb is replaced by ' + [System.IO.Path]::GetFileName($script:AdbPath) + ' - NOT a device run') }
    Say-Log ('adb-walk ' + $script:Mode + ' ' + $script:RunName + ' (package ' + $script:Pkg + ', seeds ' + @($script:Seeds | Where-Object { $_ }).Count + ')')

    Invoke-Preflight
    if ($script:Mode -eq 'calibrate') { Invoke-Calibrate } else { Invoke-Walk }
    $ok = $true
} catch {
    $m = [string]$_.Exception.Message
    if ($m.StartsWith('ADBWALK-STOP:')) { Say-Log ('STOP: ' + (Get-ErrText $_)) }
    else { Say-Log ('driver failure: ' + ((Get-ErrText $_) -replace '^driver: ', '')) }
} finally {
    Restore-Phone
    try { Clear-FileStepPngs } catch { }
    if ($script:WalkStarted) { try { Save-RunJson $ok } catch { } }
    Exit-Lock
}

function Exit-Final([int]$Code) {
    # A failed restore wins over every other result: the phone is still changed.
    if ($script:RestoreFailed) { Write-Host 'RESTORE FAILED: run the script again with the phone attached, or restore by hand'; exit 1 }
    exit $Code
}

$runShown = ''
if ($script:RunDir) { $runShown = 'Claude outputs' + [System.IO.Path]::DirectorySeparatorChar + 'adbwalk' + [System.IO.Path]::DirectorySeparatorChar + $script:RunName }
if (-not $ok) {
    if ($runShown) { Say ('run folder: ' + $runShown) }
    if ($script:WalkStarted) { Say 'run.json has finished=false; adb-walk-parse.ps1 -RunDir <run folder> still reads it' }
    Exit-Final 1
}
Say ('run folder: ' + $runShown)
if ($script:Mode -eq 'calibrate') { Exit-Final 0 }

$parser = Join-Path $PSScriptRoot 'adb-walk-parse.ps1'
if (-not (Test-Path -LiteralPath $parser)) {
    Say 'the parser adb-walk-parse.ps1 is missing next to this script: the raw files stay in the run folder'
    Exit-Final 1
}
$global:LASTEXITCODE = 0
try { & $parser -RunDir $script:RunDir | Out-Host } catch { Say ('the parser failed: ' + $_.Exception.GetType().Name); Exit-Final 1 }
$code = $LASTEXITCODE
$summary = Join-Path $script:RunDir 'summary.md'
$resultLine = ''
if (Test-Path -LiteralPath $summary) {
    foreach ($l in [System.IO.File]::ReadAllLines($summary)) { if ($l.StartsWith('RESULT: ', [System.StringComparison]::Ordinal)) { $resultLine = Get-Clean $l; break } }
}
if ($resultLine) { Say $resultLine } else { Say 'summary.md has no RESULT line' }
Exit-Final $code
