Read docs/handoff-2026-08-19h.md FIRST, then DECISIONS.md rows #421-#427.
The previous session landed N71 (the theme push, which also closed N78) and N81 (my
chat palette), plus two F5 fixes on top (#425). All of it is F5'd on Android and
COMMITTED. Smoke baseline is 2111 pass / the 4 known pre-existers (#136 - #149(3) - M5
- B3). Shells: 18.

SETUP - get the code yourself, both repos clone anonymously:
  git clone --branch redesign/frontend https://github.com/Rexoflex/Spixi.git
  git clone https://github.com/ixian-platform/Ixian-Core.git      # SIBLING folder
Core is for READING (097341a is the pinned reference). npm install jsdom --no-save.
Verify before building: Config.cs reads "spixi-0.9.22", smoke is green at 2111 / the
same 4. If it is not, say so and stop.

THE BATCH IS R3 - the art and atmosphere round. Start with N82, it is the quickest win
and it is entirely my call already made.

  N82 - THE COLOUR TRIO (DECISIONS #427, all three decided, just build them):
    (a) Light chat canvas #fcfbfa -> #f4f6f9. The warm cream is rejected. Token is
        --chat-canvas-base in the :root block of src/styles/tokens.css.
    (b) REMOVE the bubble hairline - it looks bad. * MEASURED, AND THE TWO THEMES
        DISAGREE, so do not do this symmetrically: in LIGHT the new canvas alone gives
        1.083 separation, better than cream ever gave WITH the hairline (1.055), so
        removing it is free. In DARK the hairline IS the edge - 1.281 against the
        ground versus the bubble's own 1.120. So: DROP IT IN LIGHT, KEEP IT IN DARK,
        and SHOW ME the dark comparison before you touch dark. My complaint was formed
        looking at light mode.
        Sites carrying --border-bubble-received today: message-bubble.css (.c-bubble
        received), typed-bubbles.css (cards, plus a box-shadow:none on the sent
        variant), media-bubble.css, typing-indicator.css, system-notice.css,
        settings-screens.css (the Chat-appearance preview bubble) and the
        .chat-event__chip rule inside src/shells/chat.html. They were all given it in
        #422 for the same reason; they all come off together in light.
    (c) The security notice: DARKER and MORE SATURATED so it stands out - * IN DARK
        MODE ONLY. LIGHT MODE KEEPS ITS NOTICE EXACTLY AS IT IS. That means a
        [data-theme="dark"] override, NOT a shared token edit - a token edit would drag
        light along with it, which is the thing I explicitly do not want.

  N14 - the rest of the nudges/notices work. * THE RADIAL GRADIENT IS DROPPED (my call,
    #422) - colour only, see N82(c). Backup nudge (dialog on Windows / sheet on mobile)
    and rating nudge ride along; the rating nudge uses the rate-me illustration in
    images/. Size S.

  N21 - chat pattern. * PROBABLY ALREADY CLOSED by #422: it asked for "all levels more
    subtle, current subtle becomes the new strongest", and the new ladder tops out at
    0.1 against an old effective ~0.3. SHOW ME first. Do not mark it done from the
    numbers, and do not rebuild the ladder assuming it is still open.

  N19 - the connecting/loading line (animated gradient under the topbar).
    ASK ME THE DIAL BEFORE BUILDING: connecting-only, or a shared loading affordance?
    And read DECISIONS #417 first - N77 measured that during a community-bot join
    essentially NOTHING reaches the shell, so a loading affordance may have nothing to
    show. If that applies here too, say so instead of building it.

ALSO OPEN, ITS OWN SESSION - the tip/scroll bug (DECISIONS #426(b)). Tipping a message
that is scrolled UP jumps the view to the bottom. Already diagnosed at source and NOT
tip-specific: renderLogNow() decides whether to re-pin using nearBottom(), which is
scrollTop + clientHeight * 1.5 >= scrollHeight - a ONE-AND-A-HALF VIEWPORT window, so a
reaction, a delete or an edit on the same row does it too. Do not fix it inside R3:
nearBottom has ~10 call sites and was tuned by #328/#333. The question that decides the
fix is whether it also happens in a LONG conversation scrolled far up, or only a screen
or two above the bottom - ask me, I can test it in a minute.

SEPARATE, NOT PART OF R3 - reply-to (M1). I asked whether it could ride the art round.
It cannot: the whole surface already shipped behind a capability flag (#79/#25), so
there is no art and no code, only a missing ANSWER. Do it as a standalone
carrier-verification step, no build: read whether a reply reference survives
StreamMessage round-trip AND persistence in Ixian-Core, then tell me what a 2-device F5
would have to show. * #232 says verify the carrier ON DEVICE before trusting the BE
"zero-C#" claim - that claim is the same shape as C8, which looked green in the store
and was disproven on hardware (#215).

DO-NOTs, so they are not re-derived at cost:
1. Do not restore the radial gradient on the notice. Colour only, dark mode only.
2. Do not remove the bubble hairline in DARK without showing me the comparison first.
3. Do not build an N19 loading affordance before checking #417's measurement applies.
4. Do not fix the tip/scroll bug inside this batch, and do not fix it where it was
   reported - it is not about tipping.
5. Do not un-gate reply-to on the BE engineer's word. Carrier first, device second.

STANDING RULES this project keeps re-earning:
  - * SOURCE-READING GATES CANNOT SEE A THROW, AND THEY CANNOT SEE AN INTERACTION.
    The last batch shipped a defect past a full review round, a break-my-verdict pass
    and 20 mutated pins, because every pin READ SOURCE - the bug only existed in the
    interaction between a shell's cached value, which appearance was selected, and
    whether C# pushed at that page at all. Two more MAJORs were found only by EXECUTING
    the built artifact; one would have booted every conversation to a permanent spinner.
    If a change can break a shell's boot, a push, or a multi-step user sequence, RUN it.
    smoke-test.mjs now has a destructure gate, a jsdom boot gate and an end-to-end
    picker sequence for exactly this. Do not weaken them.
  - Pin the SITE the behaviour runs through, and MUTATE it before believing it. Pin BOTH
    ENDS of a contract - the last batch's worst bug had the shell end pinned and the C#
    end unpinned.
  - * A FIX IS NOT SMALLER THAN THE THING IT FIXES. Last batch, a repair regressed the
    #407-#410 bar work, a comment cleanup silently reverted a migration, and a review's
    correct diagnosis came with a wrong remedy that re-opened the headline bug.
  - A fallback edit is not a copy change until extract-strings has run - and for
    strings[o.key] tables (PATTERN_LEVELS, PATTERN_STYLES) not until the MANUAL table in
    extract-strings.mjs changes too. Both i18n gates are blind to that class: they
    compare locales against EACH OTHER, so a key missing from all of them is perfectly
    "consistent".
  - Since full bleed, anything derived from "the current surface" must be READ, not
    REMEMBERED - and a LOCK outranks every other surface when it is up.
  - Verify at source (#215) - never build past a missing repro (#294) - bundle BEFORE
    shells - DECISIONS rows at decision time - the security gate while building - smoke
    as bookends - git --no-optional-locks always.
  - #387: a red row can be a DIRTY BUILD - wipe Spixi\obj and Spixi\bin on any C#
    change, both targets share them.

DELIVERY - how I work, follow it:
  - I run everything on Windows, in PowerShell.
  - Give me ONE step at a time and WAIT for me to finish before the next. Do not stack
    a command and a prerequisite in the same message, and do not jump ahead.
  - NO PARENTHESES in a pasted block. PowerShell reads "(18 shells)" as an unclosed
    expression, swallows every following line and dies having run nothing. Annotate with
    # or put the expectations in a table outside the block.
  - Tell me what number to expect from each step so I can tell you if it is wrong. A
    stale build and a real bug often look identical - give me the discriminator.

STILL UNVERIFIED, do not assume: the Android in-call strip (the #elif ANDROID branch in
CallPage) has never been exercised - it needs a real two-device call, and the last batch
added the call surface to the theme sweep. iOS and Windows are untested for the last
three batches.

Deploy - Android: dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -t:Run
adb: "C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe"
Dev mode on the phone: 10 taps on the "Chats" title. The HUD carries the INSET/BAR/BOOT
probes and the chat LOAD probe.
