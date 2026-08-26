NEXT SESSION — entry prompt. After the 2026-08-27 iOS pass, its fixes, and Damir's
2026-08-28 Android walk of them.

★★ READ FIRST, IN THIS ORDER:
  1. docs/open-items-2026-08-28.md          <- the QUEUE. Eleven items, prioritised, with leads
  2. docs/remove-contact-spec-2026-08-28.md <- a full spec Damir wrote from screenshots
  3. docs/opus-review-brief-596-622.md      <- the OWED #46 loop (covers #596-#623)
Everything the batch itself did is in DECISIONS #596-#623. The consumed walk sheet and
handoff are in docs/archive/.

★★ FIRST, AND IT IS NOT OPTIONAL — THE TREE IS NOT COMMITTED.
Commit `feab1095` on `redesign/frontend` carries only THREE files (two doc deletions and
`src/components/amount-keyboard.js`); the other ~89 files of batch #596-#622 are still
uncommitted in the working tree, and that 3-file commit has been PUSHED. The build Damir
tested was made from the working tree, so the code is good — only the commit is empty.
Ask him whether he amended it before doing anything else, and verify:
    git --no-optional-locks show --stat --oneline HEAD | tail -3
If it still shows 3 files, fix that BEFORE any new work.

VERIFY THE BASELINE BEFORE TOUCHING ANYTHING. If a number differs, say so and STOP:
  bundle 297 · shells 18 · smoke BASELINE OK 3288 / the 3 known (#136 · M5 · B3)
  · locales CLEAN 773 · cs-syntax 144+1 · Ixian-Core 097341a
⚠ C# changed in this batch → wipe Spixi/obj and Spixi/bin (#387). Bundle BEFORE shells.

WHERE THE WALK LANDED (Damir, Android, 2026-08-28): 22 pass · 4 fail · 9 n/a of 35.
Four of his findings were fixed the same morning — #620 (a MONEY defect the batch itself
introduced: the tip's Enter->confirm plus #609's enterkeyhint made the dismiss key send
money), #621, #622, and #617/#618/#619. The rest is the queue in item 1 above.
★ THE NINE n/a ARE ALL iOS and are still owed — he walks them on the office Mac. They are
the rows that settle everything this batch marked UNVERIFIED: the lifted row (#606, its
FOURTH round), every keyboard row (#608/#609/#615) and the notification tap (#612).
★ He asked to be reminded: WAL3 on the iPhone — typing `1` `,` `4` must read 1.4, not 14.

TWO DECISIONS ARE OWED BY DAMIR BEFORE ANYONE CODES THEM:
  · does a preset TIP get a confirmation step at all? (#620 fixed the accidental commit;
    a deliberate one-tap send with no review is still the design as it stands)
  · are blind-group read receipts unavailable BY DESIGN (they would de-anonymise the
    reader) or merely unwired? Only one of those is ours to fix, and a permanently
    pending clock is a delivery lie either way (#275 class).

DO-NOTs
1. No Ixian-Core changes (097341a frozen); core needs = a BE row. ⚠ #617 is the worked
   example of the alternative: core discards a field on the way in, and we put it back on
   the object it hands us, because we still had it.
2. The four settled dials stay settled: the details cover removed · the ring removed on
   the chat ROW (the message ring survives, deliberately) · sender-name mobile-only · the
   address sheet hugs with explicit padding around the QR.
3. No half-landed batches. 4. No new NuGet (#495). 5. No invented data.
6. Never `margin-block-start: auto` to place slack. Space that is CHOSEN reads as design.
7. Wallet-SEND redesign still stays LAST. Input defects were in scope; the flow is not.
8. Do not build tip-in-a-flagged-bot-room: it is the money path and the derived vs real
   address question is unanswered on device (#215).
9. ⚠ Do not build TIP in a bot room without Damir's word — queue item 11. It is the
   money path, and legacy's own tip handler contains DEAD CODE that suggests it never
   worked there. (The add-contact half of that report is already fixed: #623.)

★ CARRY THESE — every one cost real time in the last two sessions:
· A NEGATIVE PIN OVER RAW FILE TEXT MATCHES ITS OWN RATIONALE COMMENT. Hit four times
  now. Strip comments, or read the cascade through `rulesFor()`.
· `indexOf` RETURNS THE FIRST MATCH. A pin that compares two `indexOf` results compares
  against the wrong call site when the needle appears more than once. Search forward FROM
  the anchor instead.
· A PIN THAT PROVES A FUNCTION EXISTS GOES GREEN ON A BUILD WHERE NOTHING CALLS IT.
· THE SUITE TESTS THE BUILT BUNDLE. A mutation applied to `src/` proves nothing about a
  behavioural pin — mutate what ships.
· RESTORE IN A SEPARATE STEP FROM THE RUN THAT MUTATES. A timed-out sweep once left a
  source file mutated and the cleanup deleted its backup.
· A LAZY MATCH ANCHORED ON A SELECTOR FINDS THAT SELECTOR IN THE HEADER COMMENT.
· `cs-syntax-check` PARSES, IT DOES NOT COMPILE (#593). Anything that adds a C# call site
  needs a real build before it is called done.
· ★ AN EXCUSE WRITTEN FOR ONE PLATFORM MUST NOT BE WORDED FOR "A PHONE" (#620). The
  comment that said "the iOS decimal pad has no return key, so Enter can never fire here
  on a phone" sat directly above the line that spent money on Android.
· ★ WCAG CONTRAST IS A TEXT INSTRUMENT. On two near-black surfaces the +0.05 flare term
  swamps the ratio; a large-area lightness step (ΔL*) is the honest measure.
· ★ A GLYPH NAME IS NOT A GLYPH (#621). Only the device shows the shape.
· ★★ TWO VERBS CAN SHARE ONE NAME (#623). A guard found in one handler is not evidence
  about a different handler called the same thing — check which verb the BUTTON sends.
  An adversarial audit raised that gate as a HIGH finding and it was wrong, and acting on
  it without checking cost a working feature for a day.
· ★★ DAMIR HAS BEEN RIGHT EVERY TIME HE PUSHED BACK THIS ROUND — on the bot group, on
  the core bump, on the freeze, and on this. When his memory of the app disagrees with a
  reading of the code, re-read the code.

LANGUAGE RULE: ASD-STE100 Simplified Technical English — chat replies and code comments.

SETUP
git clone --branch redesign/frontend https://github.com/Rexoflex/Spixi.git
git clone https://github.com/ixian-platform/Ixian-Core.git   # SIBLING, then: git checkout 097341a
cd Spixi && npm install --no-save jsdom tree-sitter tree-sitter-c-sharp

DELIVERY
The container CANNOT push. Land files through the bridge and let Damir commit, or hand him
a tarball. `git --no-optional-locks` always. ⚠ Never `git add -A` — ~116 C# files differ by
CRLF alone. Stage exactly the files with real content changes:
    git --no-optional-locks diff --ignore-cr-at-eol --name-only | ForEach-Object { git add -- $_ }
…and verify the staged count before committing. THAT is what went wrong last time.
