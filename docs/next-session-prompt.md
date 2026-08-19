Read `docs/handoff-2026-08-19i.md` FIRST, then DECISIONS.md rows #428–#432. The
previous session built R3 — the art round: N82 the colour trio, N19 the connecting
line, reply-to answered as a carrier read with no build, and N21/N14 closed by
inspection. **It is COMMITTED but NOT YET TESTED on a device.** Smoke baseline is
**2135 pass / the 4 known pre-existers** (#136 · #149③ · M5 · B3). Shells: 18. No C#
was touched in R3, so a dirty-build red row is less likely than usual — but #387 still
applies the moment anything C# lands.

SETUP — get the code yourself, both repos clone anonymously:
git clone --branch redesign/frontend https://github.com/Rexoflex/Spixi.git
git clone https://github.com/ixian-platform/Ixian-Core.git   # SIBLING folder
Core is for READING (097341a is the pinned reference). npm install jsdom --no-save.
Verify before building: Config.cs reads "spixi-0.9.22", smoke is green at 2135 / the
same 4. If it is not, say so and stop.

## ITEM 1 — MY F5 RESULTS COME FIRST

I am testing R3 when I get back, per `docs/f5-checklist-2026-08-19-r3.md`. Take my
results before you plan anything else, and do not start a new batch on top of an
untested one. Three of the checklist sections are the ones that can come back red:

* **§2.2 — dark chat with no bubble hairline.** ⚠ This is the one I changed my mind
  on. The measurement said keep it in dark (the hairline pixel reads 1.281 against
  the ground versus the bubble's own 1.120); I chose symmetric removal anyway, on the
  render. If dark now reads flat on the phone, **restoring dark alone is one line in
  `tokens.css`** — put `--border-bubble-received: rgba(255, 255, 255, 0.05);` back in
  the `[data-theme="dark"]` block. The eight `box-shadow` rules that draw it were
  deliberately kept for exactly this. Do not treat that as a defeat; it was built to
  be reversible because the numbers and the eye disagreed.
* **§3.2 — the LIGHT security notice must be UNCHANGED.** That was my explicit
  constraint and it is the half that is easiest to break by accident. It is pinned
  from both ends, so if light moved, something outside the pin did it.
* **§4 — the connecting line.** It has never been driven by real C#, only end to end
  in jsdom. The failure to report is a line that **outlives** the state — appears and
  never clears, or survives a presence tick in a chat.

## ITEM 2 — §5 OF THE CHECKLIST IS A MEASUREMENT, NOT A BUG REPORT

The tip/scroll repro (#432). I open a long conversation, scroll far up — several
screens, well past 1.5 viewports — and tip a message. **Does the view jump?**

* Jumps → `nearBottom()` is not the cause and something else re-pins. Different fix.
* Stays put → the 1.5-viewport threshold is the whole bug, and narrowing it is small.

⚠ Do NOT fix it where it was reported. It is not tip-specific — a reaction, a delete
or an edit on the same row does it too, and `nearBottom` has ~10 call sites that
#328/#333 tuned deliberately. #294: never build past a missing repro.

## ITEM 3 — THE NEXT BATCH, once R3 is green

In this order, and stop at the first one that needs a dial from me:

1. **Account as a true peer of the other three tabs.** Still the right next structural
   change. ⚠ **Security gate required**: #230 gates the in-place lock present on the
   host being HomePage, and changing which page hosts Account moves that boundary.
   Do not start this without walking that gate first.
2. **N67** delete-account / delete-wallet — F-3 rides it, N68 is already root-caused.
3. **N80** rate-me on an open counter (5th open, one new persisted preference) and
   **N72** scan feedback as confirm-as-PENDING, designed **with** N69(b). Both small,
   both unblocked by #424.

## ITEM 4 — REPLY-TO IS NOW A BE ASK WITH A DESIGN IN IT

`docs/reply-to-carrier-verification.md`. Do not re-derive it. The short version: there
is **no carrier anywhere** — not `StreamMessage`, `SpixiMessage`, `SpixiMessageCode`,
`ChatStreamMessage` or `FriendMessage` — and Spixi's C# has zero occurrences of the
word, so the "zero-C#" claim is wrong about the **scope**: it is an Ixian-Core change.
The read did find the shape: `ReactionMessage` is the precedent, `ChatStreamMessage`
is the insertion point, its parser ignores trailing bytes so old clients degrade to a
plain message, and `FriendMessage`'s deserializer has been extended additively five
times. ⚠ **Do not un-gate the capability on the BE engineer's word** — the 2-device
test in §4 of that doc comes first, and test (c), the SENDER re-opening its own reply,
is exactly how C8 died on hardware (#215).

## DO-NOTs, so they are not re-derived at cost

1. Do not re-open the light canvas or the hairline as a design question. Both are
   decided (#427/#428). Dark's hairline is reversible in one line **if I say so after
   the F5** — not on your own reading of the contrast numbers.
2. Do not touch the LIGHT security notice. Dark-only was the instruction.
3. Do not fix the tip/scroll bug inside another batch, and do not fix it where it was
   reported.
4. Do not rebuild the chat pattern ladder. N21 is closed (#431): the ladder tops out
   at 0.1 against an old effective ~0.30, confirmed on a render.
5. Do not build a general loading affordance. #417 measured `n=0` reaching the shell
   during a community-bot join — there would be nothing to show.

## STANDING RULES this project keeps re-earning

* **★ SOURCE-READING GATES CANNOT SEE A THROW, AND THEY CANNOT SEE A CASCADE.** R3
  shipped two N19 defects that read perfectly: `var(--surface-action)` does not exist,
  and an invalid `var()` inside a gradient kills the whole `background-image`, so the
  line rendered as *nothing*; and the hairline reset was one low-specificity rule
  placed high in the file, where it silently lost to four rules below it. **Both were
  found only by rendering the CSS.** If a change can break a boot, a push, a cascade
  or a multi-step sequence, RUN it.
* **★ A PIN THAT PASSES VACUOUSLY IS WORSE THAN NONE.** jsdom's cssstyle **drops a
  `border-bottom` shorthand containing `var()`**, so a light computed-style assertion
  on the topbar hairline passes for the wrong reason. Dark uses longhands and is
  genuinely observable. Do not assume this suite's computed-style assertions are
  uniformly trustworthy across shorthand versus longhand.
* Pin the SITE the behaviour runs through, and MUTATE it before believing it. Pin BOTH
  ENDS of a contract. Match on the CALL, not on a token appearing nearby — a proximity
  regex is satisfied by a comment.
* **A FIX IS NOT SMALLER THAN THE THING IT FIXES.** R3 moved seven comment blocks
  twice, because the token's meaning changed under them.
* A fallback edit is not a copy change until extract-strings has run — and for
  `strings[o.key]` tables not until the MANUAL table in `extract-strings.mjs` changes
  too. Both i18n gates compare locales against EACH OTHER, so a key missing from all
  of them is perfectly "consistent".
* Since full bleed, anything derived from "the current surface" must be READ, not
  REMEMBERED — and a LOCK outranks every other surface when it is up.
* Verify at source (#215) · never build past a missing repro (#294) · **bundle BEFORE
  shells** · DECISIONS rows at decision time · the security gate while building ·
  smoke as bookends · `git --no-optional-locks` always · #387 a red row can be a dirty
  build, so wipe `Spixi\obj` and `Spixi\bin` on any C# change.

## DELIVERY — how I work, follow it

* I run everything on Windows, in PowerShell.
* Give me ONE step at a time and WAIT for me to finish before the next. Do not stack a
  command and a prerequisite in the same message, and do not jump ahead.
* NO PARENTHESES in a pasted block. PowerShell reads "(18 shells)" as an unclosed
  expression, swallows every following line and dies having run nothing. Put the
  expectations in a table outside the block.
* Tell me what number to expect from each step so I can tell you if it is wrong. A
  stale build and a real bug often look identical — give me the discriminator.

## STILL UNVERIFIED, do not assume

The Android in-call strip — the `#elif ANDROID` branch in `CallPage` — has never been
exercised; it needs a real two-device call. **iOS and Windows are untested for the
last four batches.** The connecting line has never been driven by real C#.

Deploy — Android: `dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -t:Run`
adb: `"C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe"`
Dev mode on the phone: 10 taps on the "Chats" title. The HUD carries the INSET/BAR/BOOT
probes and the chat LOAD probe.
