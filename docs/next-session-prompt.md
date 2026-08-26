NEXT SESSION — entry prompt. After the #624–#641 batch and Damir's F5 walk of it.

★★ READ FIRST, IN THIS ORDER:
  1. docs/launch-worklist-2026-08-29.md   <- THE QUEUE. Everything left before launch,
                                             Damir's own pre-launch list merged with what
                                             remains of the review queue. L1 and L2 are
                                             the two he called out by name.
  2. docs/walk-results-2026-08-29.md      <- his F5 walk: 37 pass, 3 fail, every note
  3. docs/cdperf-2026-08-29-android.md    <- the chat-info measurement (L10)
  4. docs/fatal-language-change-2026-08-29.md  <- the false fatal (L11)
`open-items-2026-08-29.md`, `open-items-2026-08-29b.md` and the 08-29 F5 checklist are
CONSUMED and already in `docs/archive/`.

VERIFY THE BASELINE BEFORE TOUCHING ANYTHING. If a number differs, say so and STOP:
  bundle 299 · shells 18 · smoke BASELINE OK 3402 / the 3 known (#136 · M5 · B3)
  · locales CLEAN 772 · cs-syntax 143+1 · Ixian-Core 097341a
⚠ C# changed and a page was DELETED last batch → wipe Spixi/obj and Spixi/bin (#387).
Bundle BEFORE shells. `cs-syntax-check` PARSES, it does not COMPILE (#593).
⚠ The smoke suite takes ~10 minutes and the bridge shell has a 45-second limit — run it in
the container, or in a terminal Damir owns.

★★ START WITH L1 — THE LEGACY SEND AND RECEIVE SCREENS. Damir: *"Nothing legacy was
supposed to exist in this app anymore, we need to clean it out."* The inventory is already
done: contact_details is the ONLY live route, and chat.html has the proven replacement.
Then L2, the group delivery ticks — traced end to end, and the fix does NOT need Core.

★ ANDROID: `adb` FIRST, ALWAYS — docs/android-test-quickstart.md "STEP ZERO".
The SDK is at `C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe`, NOT
under %LOCALAPPDATA%. Establish it BEFORE offering any `dotnet build -f net10.0-android`.
★★ WHEN YOU HAND HIM COMMANDS: the REAL path, never a `<placeholder>`; ONE command per
fenced block; NEVER a trailing `# comment`. Four round trips were lost to this on 08-29 and
every one was the instruction's formatting, not his reading. A block with two lines in it
will be pasted as one line.

DO-NOTs
1. No Ixian-Core changes (097341a frozen). CORE-1 (kick/ban) and CORE-2 (a receiver-side
   "Canceled") are written up in be-cutover-brief.md.
2. Do not restore Kick/Ban in private groups — they lied. Do not touch delete-messages in
   private groups; Damir confirmed it works.
3. Do not remove the [CDPERF] probe until the bot room is re-measured (L10).
4. No half-landed batches. 5. No new NuGet (#495). 6. No invented data.
7. Wallet-SEND redesign still stays LAST. Input defects are in scope; the flow is not.

★★ CARRY THESE — the four the 08-29 walk added are at the top, and each cost real time:
· ★★ A DEFECT REPRODUCED IN A HARNESS IS NOT NECESSARILY THE DEFECT HE REPORTED. V-15's
  ghost reproduced before-and-after on the shipped bundle and was still the wrong
  mechanism; his two adjectives — "sharp rectangle", "blue" — named the real one. Read the
  device words for the mechanism before trusting a reproduction that agrees with you.
· ★★ COUNT THE SURFACES, NOT THE FIX. Kick/ban had TWO member sheets and #637 gated one —
  V-8's own lesson, repeated the same day it was pinned. When a rule has more than one
  home, pin them TOGETHER or they drift.
· ★★ CHECK THE MECHANISM, NOT THE QUEUE'S SUMMARY OF IT. Three findings in one batch had
  the wrong stated premise: item 6's ("waits for data" — a flat 120 ms hold), V-15's, and
  the kick/ban discriminator, which would have been backwards.
· ★★ THE FIRST STACK IN A LOG IS NOT THE FIRST EVENT. The 08-29 fatal was chased through
  `receiveData` for a while; the cause was a dialog title one letter different from its two
  siblings, ABOVE the window the grep showed.
· ★★ THE SUITE TESTS THE BUILT BUNDLE. `rdf('src/…')` says nothing about what shipped.
· ★★ A MUTATION HARNESS THAT CATCHES 17 OF 17 CAN STILL BE MEASURING ITSELF.
· ★★ A NEGATIVE PIN GOES GREEN ON A BUILD WHERE THE FEATURE IS GONE. Pair it.
· ★★ `indexOf` RETURNS THE FIRST MATCH — COUNT THE NEEDLE. And a negative over raw file
  text matches its own rationale comment: strip comments, or do not NAME in prose the thing
  the negative forbids.
· ★★ A TEXTUAL FENCE DOES NOT FOLLOW CODE INTO A LAMBDA that resumes after an await.
· ★★ DO NOT RUN A FILE-MUTATING JOB ACROSS OTHER EDITS.
· ★★ THE OBVIOUS DISCRIMINATOR CAN BE BACKWARDS: a bot room's Friend is FriendType.NORMAL
  with `bot` true.
· ★★ DAMIR HAS BEEN RIGHT EVERY TIME HE PUSHED BACK.

PLATFORMS — ask before assuming. Damir is on **Windows and Android**; the office Mac is
occasional. The nine iOS rows are still owed. ⚠ L12: the BOT-ROOM half of kick/ban is
UNVERIFIED — he has no admin account on the test set, and it is the half he asked to
protect.

LANGUAGE RULE: ASD-STE100 Simplified Technical English — chat replies and code comments.

SETUP
git clone --branch redesign/frontend https://github.com/Rexoflex/Spixi.git
git clone https://github.com/ixian-platform/Ixian-Core.git   # SIBLING, then: git checkout 097341a
cd Spixi && npm install --no-save jsdom tree-sitter tree-sitter-c-sharp
⚠ The Ixian-Core working copy shows ~170 modified files; `git diff -w` is empty on every
one — an EOL/BOM rewrite, content pristine. Do not "fix" it.

DELIVERY
The container CANNOT push. Land files through the bridge and let Damir commit.
`git --no-optional-locks` always. ⚠ Never `git add -A` — ~116 C# files differ by CRLF alone.
⚠ The bridge cannot DELETE: a file that must go is moved to `_to_delete/` and Damir removes
it. `_deliveries/` holds the tarballs (gitignored) and he can clear them.
