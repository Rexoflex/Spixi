NEXT SESSION — entry prompt. After the #46 loop on #596–#623 (2026-08-29) and the three
fixes it produced.

★★ READ FIRST, IN THIS ORDER:
  1. docs/open-items-2026-08-29.md          <- the QUEUE. 29 items, prioritised, with leads
  2. docs/opus-review-verdict-596-623.md    <- the loop's VERDICT: 19 findings, every MAJOR
                                               and HIGH reproduced by a fresh refuter
  3. docs/remove-contact-spec-2026-08-28.md <- a full spec Damir wrote from screenshots
`open-items-2026-08-28.md` and `opus-review-brief-596-622.md` are CONSUMED and already
moved to `docs/archive/`.

★ The tree is committed and clean. The 3-file `feab1095` problem from the last prompt is
gone: `f31c4c28` carries 97 files and `ac5068cf` seven more.

VERIFY THE BASELINE BEFORE TOUCHING ANYTHING. If a number differs, say so and STOP:
  bundle 298 · shells 18 · smoke BASELINE OK 3302 / the 3 known (#136 · M5 · B3)
  · locales CLEAN 773 · cs-syntax 144+1 · Ixian-Core 097341a
⚠ bundle 297 → 298 and smoke 3288 → 3302 are from the 2026-08-29 session and are DELIBERATE
(one new export, fourteen new pins). ⚠ C# changed → wipe Spixi/obj and Spixi/bin (#387).
Bundle BEFORE shells. ⚠ The smoke suite takes about ten minutes and the bridge shell on
Damir's machine has a 45-second limit — run it in the container, or in a terminal he owns.

★★ PRIORITY, AND IT IS NOT NEGOTIABLE: THE MONEY PATH — queue items 1–4.
A paste into a non-empty amount field sends the wrong amount, on every money surface and in
every shipped locale. It is reproduced end-to-end with the values that reach the bridge. The
tip has no native confirm at all, so on that surface it is silent. And the pin that should
have caught the last money defect reads `src/` instead of the bundle — a build that spends
money on the Enter key passes BASELINE OK today. Read the verdict's V-1/V-2/V-3 in full
before writing a line: the obvious fix is a known regression.

DAMIR'S DECISIONS — settled, do not re-open (queue, top section)
  · a preset TIP gets a REVIEW SHEET like Send · "mark as read" is WIRED, not removed
  · DECLINE lives on the card only · the NATIVE PAYMENT PAGE IS REMOVED, properly
  · the chats-row call glyph is the reference (built) · kick/ban HIDDEN for the owner
  · blind-group status is NOT a defect — retired · a cold bot room opens fast for him,
    so CHAT INFO is the present-first target, not the chat
  · chat info CROSSFADES the skeletons into the content — but TRY THE SLIDE-IN ALONE
    FIRST, it may mask the flicker on its own (his own suggestion) · a USER CLICK ALWAYS
    WINS a staging page (the warm-park yields) · the blind mask now FAILS CLOSED — he ran
    the device check and it is built

DO-NOTs
1. No Ixian-Core changes (097341a frozen); core needs = a BE row.
2. The four settled dials stay settled: the details cover removed · the ring removed on the
   chat ROW (the message ring survives, deliberately) · sender-name mobile-only · the
   address sheet hugs with explicit padding around the QR.
3. No half-landed batches. 4. No new NuGet (#495). 5. No invented data.
6. Never `margin-block-start: auto` to place slack. Space that is CHOSEN reads as design.
7. Wallet-SEND redesign still stays LAST. Input defects are in scope; the flow is not.
8. Do not build TIP in a bot room — queue item 29. Damir now reports legacy has its own
   problem there and wants to look first.

★ CARRY THESE — every one has cost real time, and the last loop added five:
· ★★ THE SUITE TESTS THE BUILT BUNDLE. `rdf('src/…')` proves the source right and says
  nothing about what shipped. This is not theory: the #620 money pin was mutation-proved
  green on a bundle that spent 7 IXI on the Enter key.
· ★★ A MUTATION HARNESS THAT CATCHES 17 OF 17 CAN STILL BE MEASURING ITSELF. Nine pins in
  the last batch were vacuous or near-vacuous, including all four of its newest C# pins and
  the one holding its most contested change. When you add a pin, ask what it asserts when
  the FIX is present but WRONG — not only when the fix is absent.
· ★★ A NEGATIVE PIN GOES GREEN ON A BUILD WHERE THE FEATURE IS GONE. Pair every negative
  with a positive that proves the thing still works.
· ★★ ONE EVENT, TWO SURFACES, ONE GLYPH. #621 swapped the chats row and never swapped the
  call card, and no pin compared them. Pin the INVARIANT, not the value.
· ★★ A WALL-CLOCK TIMER MUST NOT OUTLIVE ITS NODE OR ITS SCREEN. The list rebuilds every
  row constantly; a release is delivered to the node under the finger, not to the node the
  press armed. #589's rule holds: the SCREEN cancels, not each call site.
· A NEGATIVE PIN OVER RAW FILE TEXT MATCHES ITS OWN RATIONALE COMMENT. Strip comments.
· `indexOf` RETURNS THE FIRST MATCH — count the needle before you anchor on it.
· A PIN THAT PROVES A FUNCTION EXISTS GOES GREEN WHERE NOTHING CALLS IT.
· `cs-syntax-check` PARSES, IT DOES NOT COMPILE (#593). New C# call sites need a real build.
· AN EXCUSE WRITTEN FOR ONE PLATFORM MUST NOT BE WORDED FOR "A PHONE" (#620).
· A GLYPH NAME IS NOT A GLYPH (#621) — read the path geometry, or the device.
· ★★ TWO VERBS CAN SHARE ONE NAME (#623). Check which verb the BUTTON sends. An adversarial
  audit raised that gate as HIGH and was WRONG, and acting on it cost a working feature.
· ★★ DAMIR HAS BEEN RIGHT EVERY TIME HE PUSHED BACK. When his memory of the app disagrees
  with a reading of the code, re-read the code. In this loop an auditor said his call-glyph
  ruling was wrong; he was right and the auditor had named the wrong side of a real defect.

PLATFORMS — ask before assuming. Damir is on **Windows and Android**; the office Mac is
occasional. Two live rows are iOS-ONLY and a clean Android walk will not clear them (the
#606 ghost family). One is ANDROID-ONLY by mechanism (the #604 press residue). Say which is
which when you hand work back.

LANGUAGE RULE: ASD-STE100 Simplified Technical English — chat replies and code comments.

SETUP
git clone --branch redesign/frontend https://github.com/Rexoflex/Spixi.git
git clone https://github.com/ixian-platform/Ixian-Core.git   # SIBLING, then: git checkout 097341a
cd Spixi && npm install --no-save jsdom tree-sitter tree-sitter-c-sharp
⚠ The Ixian-Core working copy on Damir's machine shows 170 modified files. `git diff -w` is
empty on every one — it is an EOL/BOM rewrite, the content is pristine, and the M1 hold-out
gate passes. Do not "fix" it.

DELIVERY
The container CANNOT push. Land files through the bridge and let Damir commit, or hand him a
tarball. `git --no-optional-locks` always. ⚠ Never `git add -A` — ~116 C# files differ by
CRLF alone. Stage exactly the files with real content changes:
    git --no-optional-locks diff --ignore-cr-at-eol --name-only | ForEach-Object { git add -- $_ }
…and verify the staged count before committing.
⚠ A git read through the bridge can leave a zero-byte `.git\index.lock` that the mount will
not let the container delete. Damir clears it: `Remove-Item .git\*.lock -Force`.
⚠ `_deliveries/` holds tarballs the container staged (gitignored). Damir can delete them.
