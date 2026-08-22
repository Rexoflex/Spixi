# Next-session prompt — paste this whole block

Read docs/handoff-2026-08-23.md FIRST, then
docs/f5-verdict-2026-08-22-lock-qr.md (device truth, both platforms),
then DECISIONS rows #507-#511 plus #268, #506, N86 and iOS-63.

SETUP
  git clone --branch redesign/frontend https://github.com/Rexoflex/Spixi.git
  git clone https://github.com/ixian-platform/Ixian-Core.git   # SIBLING, REQUIRED
  npm install --no-save jsdom tree-sitter tree-sitter-c-sharp  # ONE call
Verify before touching anything: Ixian-Core clean at 097341a, HEAD carries
#507-#513, and the pipeline green - generate-chat-pattern (triangles
224x193.988 default), build-demo-bundle 275 exports, build-shells 18 shells,
smoke-test BASELINE OK 2580 pass / the 3 KNOWN (#136 . M5 . B3),
cs-syntax-check 142 clean + 1 known gap, verify-locales all clean.
If any number differs, say so and stop.

THE NOTIFLOG IS ATTACHED TO THIS MESSAGE - READ IT FIRST
  It settles #503, which passed every device symptom (A1.1-A1.4 on a KILLED
  app) but has never had its proof read. 2.1 was a FALSE PASS last round for
  exactly this reason - a Samsung bundler badge wearing our result - so a
  tick may not close this row. Search the log for:

    (service-extension)  The background lane RAN. With A1.1-A1.4 already
        passing on device, that CLOSES #503. Update
        docs/f5-verdict-2026-08-22-lock-qr.md and write the DECISIONS row.
    (foreground) only     Only the foreground listener fired. If A1.1-A1.4
        passed with NO (service-extension) line anywhere, then the extension
        is NOT what made them pass. Say so loudly and stop: that is a false
        pass for the second time and #503 needs re-diagnosing, not closing.
    already decided       BOTH lanes fired for one notification and the
        second was a no-op. NOT a bug - it answers a question the bytecode
        could not settle. Record it either way.
    Cannot clear notifications   Should be GONE since #493. If it is back,
        that is a regression.

  ⚠ The notiflog CANNOT diagnose the idle-sound bug. The sound path has no
    log lines yet - adding them is item 2. Do not try to read it out of this
    log, and do not touch a sound trigger before the probe exists.

THE WORK, in priority order
  0. THE #46 LOOP IS OWED AND COMES FIRST. #507-#511 shipped on self-review
     plus mutation only - the standard #46 calls insufficient - on a batch
     with TWO security-gate rows. Work order:
     docs/opus-review-brief-507-511.md (scopes, accepted dials, and the
     five places the builder is least confident). Run it BEFORE the menu
     batch: that batch layers an anchored dropdown straight onto the
     z-order and lift work under review. The break-my-verdict reviewer
     must be FRESH - that step is where every past loop found its MAJORs.

  1. THE MENU BATCH, only after the loop is CLEAN - all four calls are
     Damir's, taken 2026-08-22.
     (a) MOBILE: the §5b ANCHORED DROPDOWN for the message menu AND the
         chats row menu (Telegram/WhatsApp). This fixes 4.1 STRUCTURALLY -
         a menu that flips above the pressed message can never cover it,
         so the z-order fight disappears. desktop-anchors.js already has
         anchorSheetAbove.
     (b) The lift STAYS; the MOBILE scrim goes deeper (--surface-scrim 0.6).
     (c) DESKTOP: #268 STANDS, no wash. Retune or drop [data-dt-ctx-source]
         so it stops reading as a stray background row. DO NOT add a wash.
     (d) The QR opens a FULL BOTTOM SHEET - code at scan size + address +
         explanation, FOLDING IN the existing "What is this address?" sheet.
         One surface, not two.
  2. Two riders, both one-liners: the dev HUD's 72px rail offset, and FOUR
     Logging.info calls on the sound path (Node.cs:1013/1018 and
     SpixiTransactionInclusionCallbacks.cs:37-45).
  3. The sounds: Damir has better UI SFX picks and asked to be INTERVIEWED.
     That is conversation, not build time - run it in parallel.
  4. The idle-sound bug, ONLY after the probe log exists. Leading candidate:
     transactionVerified has NO edge guard beside an unconditional
     updateStatus(...Final...), so a re-verified tx chimes with no user
     action. Do not touch a trigger before the log names it.

STILL OPEN
  Privacy shield on Windows deactivate - drop (recommended) or keep. ASKED
    TWICE, still unanswered.
  ixian.0.log from the FAILING W-4.6 session, if it survived.
  W-3.1 pane widths - NO MECHANISM FOUND. Screenshot before/after a language
    pick, and WHICH pane moves. Do not guess.
  W-5.1 info-panel flash - already triaged as the #248/#250 WebView2 resize
    dial. Damir's design call, not a bug.
  A3.1 - marked n/a, but the Android commands given were -c Release. Confirm
    which configuration ran.
  iOS #503 - docs/ios-nse-spec.md. Three Apple prerequisites, and §2 is a
    decision Damir owes BEFORE any code.
  maxLogCount is 5 with a RELEASE BLOCKER marker. Reduce before launch.

TWO DECISIONS DAMIR OWES - ask early, they are one-liners
  * The 39 tracked delivery tarballs at the repo root, 60 MB in the history
    (#513). git rm --cached them (cheap, history keeps the weight) or leave
    them. A filter-repo rewrite + force-push is the only real cleanup and is
    NOT worth doing mid-review.
  * Does the ASD-STE100 language rule still stand? CLAUDE.md applies it to
    chat replies and code comments. The last session did not follow it, and
    neither do the project's recent DECISIONS rows and handoffs.

DO-NOTs
  1. Do not touch Ixian-Core. Five smoke pins enforce 097341a.
  1b. Do not start the menu batch before the #46 loop is CLEAN.
  2. Do not add a backdrop wash to desktop contextual menus (#268, re-affirmed).
  3. Do not close #503 without the (service-extension) log line.
  4. Do not build a SECOND address-explainer surface - fold the existing one in.
  5. Do not touch a sound trigger before the four log lines produce evidence.
  6. Do not guess W-3.1.

STANDING RULES
  * MUTATE BEFORE BELIEVING. FIVE of my own pins were vacuous on the first
    pass last session; reading found none of them. One matched text the
    mutation left behind, one matched an import line, one matched a lock
    around a different statement.
  * A PASS IS NOT A PROOF (#503, twice now). Read the screenshot or the log,
    not the tick.
  * A DEFECTIVE BRIEF IS THE NORMAL CASE. Two of #506's four premises were
    contradicted by the platform's own docs, and #149(3) was a stale
    expectation reported as a failure for weeks. Verify the premise.
  * A FIX CAN TRADE ONE DEFECT FOR ANOTHER (4.1: the sheet above the message
    solved "menu covered" by creating "message covered").
  * VERIFY AT SOURCE, and read the SHIPPING artifact - for #510 that meant
    disassembling the pinned OneSignal AAR with javap, which is the only
    reason preventDefault(true) was used instead of the documented-looking
    preventDefault() that parks a coroutine.
  * Check a file EXISTS before `cat >`. A date-only verdict filename
    clobbered another batch's verdict last session.
  * `EXIT=$?` after a pipe reports the LAST command. It reported success for
    a git add the bridge had killed.
  * Never build past a missing repro or a missing MECHANISM (#294).
  * Bundle BEFORE shells. DECISIONS rows at decision time. Smoke as bookends.
    git --no-optional-locks always. #387: wipe obj/bin on any C# change.
  * WRITE THE VERDICT TO DISK (#459 (1)) - and put the BATCH in the filename.

DELIVERY
  Windows + PowerShell, Android on adb, a Mac in the office for iOS.
  Land everything on his disk UNCOMMITTED with a full green pipeline.
  ONE step at a time and WAIT. Expectations in a table OUTSIDE the pasted
  block, with the NUMBER to expect. adb is not on PATH:
  C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe
  Check the device is attached BEFORE the run step (#450). Android:
  dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release, then
  -t:Run as a SEPARATE command (#320). Windows:
  -f net10.0-windows10.0.19041.0 -c Debug, then run the exe separately.

  Land delivery tarballs into _deliveries/ (gitignored), NEVER the repo root -
  39 got tracked before anyone noticed, 60 MB of binaries in the history.

  BRIDGE GOTCHAS (learned the hard way):
  tar needs --overwrite. device_bash is capped at 45s - stage git adds in
  chunks of ~20 and verify `diff --cached | wc -l` after each. Git strands
  *.lock files the bridge cannot delete - mv them to _to_delete/ or GitHub
  Desktop refuses to commit. git push does NOT work from the bridge. Never
  `git add -A`: the tree carries CRLF-only churn on ~116 files.
