Spixi frontend redesign. Repo: C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi
Branch redesign/frontend. Ixian-Core is a SIBLING clone, frozen at 097341a.
Read docs/handoff-2026-08-31.md and follow it.

★ SESSION B IS CLOSED AND DAMIR WALKED IT: 22 pass · 0 real failures · 2 n/a (C2, F6).
  He marked A2 and B3 "fail" only because the sheet had no way to record a pass with a
  note. Both were passes. Both notes are BUILT and shipped in the same batch:
    A2 · the composer placeholder lost its padding when the ⊕ was hidden. Fixed with
         .c-composer__field[data-no-attach], driven from the SAME expression that hides
         the button, so the padding and the pill cannot disagree.
    B3 · the empty receipt row now says "nobody has seen this yet" (new key noneSeenYet,
         all 12 locales). ⚠ This reverses "no counts, no line" for ONE case only. The
         other four empty returns stay SILENT — an incoming message, a 1:1, a bot room,
         and a roster under 2 — because there we have no honest answer.

VERIFY THE BASELINE FIRST. If any number differs, say so and STOP:
  bundle 301 · shells 18 · smoke BASELINE OK 3586 / the 3 known (#136 · M5 · B3)
  · locales ALL CLEAN 776 · cs-syntax 140+1 · Ixian-Core 097341a
⚠ Smoke takes ~10 min and my bridge shell has a 45-second limit — run it in the container.
⚠ Ixian-Core shows 170 modified files. That is CRLF churn. `git diff --ignore-cr-at-eol`
  is EMPTY. Do not read it as a change and do not "fix" it.

★★ BUILD WINDOWS WITH F5. THIS COST A WALK — DECISIONS #663.
  On Windows the app reads html from AppDomain.CurrentDomain.BaseDirectory, the folder
  beside Spixi.exe (SPlatformUtils.cs:30-33). `dotnet build` for the Windows target does
  NOT stage the MauiAsset files there; only the Visual Studio deploy step does. When the
  file is missing, SpixiLocalization.localizeHtml logs an error and RETURNS WITHOUT
  WRITING, and generatePage still returns the URL to ll_chat.html in Documents\Spixi\html\
  — the user folder, which survives every wipe. ★ So the app silently serves the PREVIOUS
  build's shell and looks completely normal. Damir hit exactly this and reported a fixed
  defect as still live. Build with F5, or copy Resources\Raw\* into the output by hand.
  Android is unaffected — it reads assets from the APK with no user-folder copy.
  ⚠ `dotnet build -t:Run` does not work for the Windows target. It replaces the Build
  target and exits 9009.

Read in this order, then start:
  1. docs/handoff-2026-08-31.md               — what happened, the walk, and what is owed
  2. docs/launch-worklist-2026-08-29.md       — THE QUEUE. L1/L2/L7/L8/L11 are marked built.
  3. docs/opus-review-verdict-session-b.md    — the five-round loop, round by round
  4. DECISIONS.md #657-#663                   — the loop, the ruling, the pins, the walk
  5. docs/cdperf-2026-08-29-android.md        — the chat-info measurement (L10)

THIS SESSION IS SESSION C. THE QUEUE, IN THIS ORDER:
  L6 · Account → Contacts: the rail jumps to Chats, the right pane opens a chat, and
       mobile flickers. ⚠ #294: MEASURE the flicker before assuming it shares a cause
       with the rail. Three symptoms, possibly three bugs.
  L5 · the launch sheets are light on a dark phone.
  L10 · the bot room presents 140 ms late. ★ IT IS NOT A ONE-LINE REORDER — auditor C
       found a real ordering hazard at SpixiContentPage.cs:322-326, and the premise is
       probably wrong: a hoist moves the present by ONE dispatcher turn and recovers
       neither cost. READ THE PROBE FIRST. ★ It ENDS BY REMOVING the [CDPERF] probe —
       with the shell's ixian:cdpainted emit and the four-line pin, in ONE batch.
  L3 · swipe-back on mobile, everywhere. The largest row on the list.
  L4 · Welcome: OS back / swipe from create or restore.
  L9 · one grammar: sheets rise from the bottom, subscreens come from the right. Damir
       wants fable to take L9 with L3. ⚠ A pane on desktop must not slide (#328).

  THEN THE FIVE NEWER ROWS:
  L13 · a "leave group" check box on Delete chat for a group row. ⚠ VERIFY AT SOURCE
       FIRST. Leaving a group needs a real Core verb, and #253 already found that
       undorequest and sendLeave are not the same path. If no verb exists, do NOT build
       the check box — it becomes a control that reports an outcome it did not cause
       (⑪), which is worse than the missing option. Make it a BE row instead.
  L14 · "if i go to CHATS or APPS - then to account and then to Wallet - theres a brief
       flicker of either the chats or apps screen before wallet is shown. only in that
       order and only on wallet." The parked-Account re-present path (#315) plus the tab
       restore. ★ ANDROID ONLY so far; iOS is NOT checked. Damir rules it a MOBILE row.
       That agrees with the mechanism: Account is a parked peer tab on mobile only
       (#315) and a PANE on desktop (#245), so a DESKTOP repro would refute the theory.
       ⚠ MEASURE BEFORE ASSUMING (#294) — two mechanisms fit the words and they
       need different fixes. 🟡 The iOS leg is owed; do not close on Android alone.
  L15 · "Windows - Account - Language - no flags shown, just country abbreviations. on
       phone the flags are shown." ⚠ Same shell on both platforms, so the difference is
       RENDERING, not logic. Leading suspect: WebView2 has no colour flag glyph, so a
       regional-indicator pair falls back to its two letters. ⚠ VERIFY AT SOURCE. If it
       is confirmed, the fix is an ASSET or a text treatment, not a logic change.
  L16 · "Smaller logo on the splash screen and on light OS mode when splash is blue,
       remove the small logo background … #175595". Spixi.csproj:145 is
       <MauiSplashScreen Include="Resources\Splash\splash.svg" Color="#144576"
       BaseSize="128,128" />, and that is only the pre-31 / other-platform ground.
       ★ THE SPLASH IS ALREADY THEME-AWARE (#534 — Damir asked for it). Read at source:
         light  Android 12+ : values-v31/styles.xml:15 → #144576, and NO icon declared
         dark   Android 12+ : values-night-v31/styles.xml:18-19 → #13171b + the drawable
                              spixi_splash_icon_night.xml
       ★★ THE SQUIRCLE IS ONE MISSING LINE. With no windowSplashScreenAnimatedIcon the
       light theme falls back to the LAUNCHER ICON, and the launcher icon carries its own
       background layer. Dark supplies its own drawable, so dark has none — exactly what
       the two screenshots show.
       THE WORK: (1) #144576 → #175595 in values-v31/styles.xml, layout/splash_screen.xml
       (both gradient stops) and Spixi.csproj:145. (2) Add a LIGHT twin of the night
       drawable and declare it as windowSplashScreenAnimatedIcon — that removes the
       squircle. (3) A smaller mark is the group transform inside the drawable
       (translateX/Y 26, scale 1.75 over a 32-unit mark in a 108dp viewport), NOT
       BaseSize; change BOTH drawables and stay inside the 66% safe circle (#336 shipped
       a clipped mark once). (4) Pre-31 reads the @drawable/splash bitmap — different
       asset, decide whether it is in scope.
  L17 · "Fix the launcher icon - new logo svg used and better color- and smaller logo in
       the launcher (this can be done before we finalize work)". Spixi.csproj:143 is
       <MauiIcon Include="Resources\AppIcon\appicon.svg" Color="#000000" />. A smaller
       mark means MORE PADDING inside the SVG, because the platform masks the icon.
       ⚠ Damir owes the new logo SVG — that is his input, not ours.
       ★ He marked this one SAFE TO DO EARLY.
  L18 · "the Spixi logo and type on dark mode should be neutral01, and no longer blue,
       on light mode we keep it. its in the chats screen the title bar"
       ★ ONE declaration: topbar.css:64 —
         .c-topbar[data-variant="root"] .c-topbar__title[data-logotype]
           { color: var(--text-action-default); }
       It paints BOTH halves: the mark is an inline SVG on currentColor and the wordmark
       inherits the title ink. --text-action-default is primary-600 light / primary-400
       dark — both blue.
       FIX IN THIS PROJECT'S GRAMMAR: add ONE semantic token to tokens.css (light → the
       action role, unchanged; [data-theme="dark"] → the neutral-01 text role) and have
       topbar.css:64 consume it. ⚠ tokens.css:435 states a component file NEVER carries a
       [data-theme] selector — do not put the dark override in topbar.css.
       ⚠ Grep the other data-logotype consumers first; the desktop rail also shows a logo
       (createBottomNav logo:true, #237). Cheap and low risk — safe to do early like L17.

⚠ THAT IS MORE THAN ONE SESSION. Ask Damir what to cut before you build. L3 decides the
  size, and L17 is the row that fits anywhere.

★★ THE TWO RULES THIS SESSION PAID FOR — read them before you accept the queue.

1. ★★ CHECK DECISIONS BEFORE YOU ACCEPT AN "OWED" ROW FROM ANY HANDOFF.
   Session B opened with "run the #46 loop still owed over #507-#511". It was not owed. It
   ran on 2026-08-22 and DECISIONS #515 records it CLEAN. The only thing missing was the
   verdict in §6 of its own brief, which still read "(append here)" — so three handoffs
   read that empty section and copied "still owed" forward. It cost the session's start.
   ⚠ And when YOU finish a loop, write the verdict into the brief that ordered it, not
   only into a findings file. A verdict nobody can find is a verdict nobody has.

2. ★★ WHEN A REVIEWER FINDS THE SAME CLASS OF DEFECT TWICE, STOP PATCHING AND QUESTION
   THE DESIGN. Three rounds went into an enumerated list of reaction keys before anyone
   asked whether the list should exist. Each round added the next key and shipped a new
   divergence. Damir's one-sentence ruling deleted the class and made the fix SMALLER than
   any of the patches.

★★ RUN THE #46 ADVERSARIAL LOOP ON WHAT YOU BUILD. Session A skipped it and it cost seven
MAJORs plus two more inside the fixes. Session B ran it over those repairs and found 22 more
across five rounds, TWELVE of them inside our own fixes. Independent read-only auditors with
disjoint scopes, then fixes, then a FRESH break-my-verdict reviewer over the fixes. Repeat
until a round is clean. Then write the verdict into the brief.
★ SIZE THE SESSION AROUND THE REVIEW, NOT AROUND THE ROWS. Session B planned five rows plus
a review and delivered two rows in about seven hours.

★ PINS: pin the WIRE, not only the line. Ten mutations beat a 164-pin harness because the
READER of a piece of state was pinned and its WRITER was not. Lift and RUN the shipped
bundle, not the source module. Strip comments before a negative sweep — five of the pin
owner's own pins read PROSE and mutation found every one of them. Mutate a pin before you
believe it.
★ GATES: cs-syntax-check PARSES, it does not COMPILE. verify-locales cannot see a key that
is in no dictionary, and i18n-lint accepts an inline `strings.KEY || 'English'` fallback —
that is how a menu line shipped English in all 12 locales. Run the strings pipeline in the
same batch that adds a key: extract-strings → build-locales → build-strings-iife.
★ BUILD ORDER: build-demo-bundle.mjs BEFORE build-shells.mjs (#258 §5.6).

Do NOT re-open: the single check stays as #649/#650 left it · a bot room stops at a double
check · a group bubble is never green · the long-press menu shows READ and DOWNLOADED only,
and "delivered" does not come back · the delivery rule names NO reaction key, so do not add
one to the walk · the four other empty receipt returns stay SILENT — only the roster case
speaks · "Mark as read" is decided · kick/ban stays bot-room only · wallet-SEND redesign
stays LAST · no Ixian-Core changes (CORE-1 … CORE-6 are BE rows).

⚠ Owed by Damir, not you: L12, the bot-room half of kick/ban — no admin account on his
test set. Don't call #637 done until he walks it. He also owes the new logo SVG for L17.
⚠ Deferred by Damir, and they must not be lost: the sticky .c-money-cta under the iOS
keyboard (contact_details.html publishes no --kb-inset at all) · the iOS menu re-anchor that
runs on the first resize only while the rows keep moving for 280 ms.
⚠ Carried, not introduced: the blind-group same-nick roster collapse — two members with the
same nick become ONE roster entry, so the denominator reads one short.
⚠ BE rows: CORE-4, CORE-5, CORE-6, and the membership question on anyOtherMemberHasMessage.
⚠ The [CDPERF] probe STAYS until L10 is built.

Interview him for anything unknown, don't assume. One command per code block, real paths,
no placeholders, no trailing comments. He has been right every time he pushed back.
