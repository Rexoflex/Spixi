NEXT SESSION — entry prompt. OVERNIGHT, after the 2026-08-27 iOS device pass.

READ IN THIS ORDER. Do NOT re-derive any of it, and do NOT re-open a decision it records:
  1. docs/f5-verdict-2026-08-27-ios.md                 <- the state and the findings
  2. docs/next-session-prompt-2026-08-27-overnight.md  <- the work order, in priority order
  3. docs/f5-checklist-2026-08-27-ios-office.md        <- the sheet that produced them

STATE: HEAD is `eeed6549` plus the doc commits from the pass. The three code batches
(#576-#588, #589-#592, #593) are on origin. ⚠ Damir has ALREADY given his F5 results —
they are the verdict. Do not ask for them again.

RESULT: 48 pass · 14 fail · 2 n/a · 1 not walked of 65. Push notifications on iOS are
CONFIRMED WORKING (C1-C3). The 14 fails are five defects, not fourteen.

★★ THE CONSTRAINT THAT SHAPES THIS SESSION
Damir is at HOME: Windows and Android. iOS is at the OFFICE.
Four of the worst rows PASS on Android and fail only on iOS.
★ FIX EVERYTHING IN THE LIST, iOS ROWS INCLUDED. That is not a scope cut.
⚠ For the iOS-only rows, mark them UNVERIFIED and say what you could not exercise.
Never write "pass" for a thing you never saw run. Damir walks them on the Mac next evening.

★ THE FIVE DEFECTS, in priority order (detail in the work order, §2):
  P1 the LIFTED ROW — does not lift on iOS at all, dark or light; on row 12 it sits BEHIND
     the dim. ★ Fourth round on this row, and all three earlier rounds were Android-only.
     ⚠ Damir's call: REMOVE THE RING on both platforms — and it ships WITH the iOS fix,
     never before, because the ring is the only thing that works in dark today (1.10:1).
  P2 the NUMPAD — four defects. It hides the tip sheet, it cannot be dismissed, and typing
     1 , 4 yields `14.` on WALLET-SEND. ★ A silent wrong-amount defect. Wallet-send IS in
     scope: the standing "wallet-send stays LAST" rule is about the send-flow redesign,
     not about input that corrupts what the user typed.
  P3 NOTIFICATIONS — C8 (a notification tap lands on the chats list, not the chat; the
     payload already carries `fa` to route on) · 33 (a muted contact still gets a
     missed-call notification) · C2 (the badge resets to 1 instead of accumulating).
  P4 the DECIDED design changes — remove the details cover · restore "Show sender name" on
     MOBILE only and DELETE its one-shot migration · the address sheet (verdict §14) · the
     safety block gets colour.
  P5 small and new — the Contacts FILTER CHIPS drag vertically and clip · the Account
     screen keeps its scroll anchor when returning from a PEER TAB · the declined-call
     glyph is missing from the excerpt · the tip sheet truncates a nickname like an address
     (the Request sheet does it correctly — copy that) · German overflows.
  P6 INVESTIGATE AND WRITE, do not claim — ★ the Spixi BOT GROUP takes minutes to load on
     iOS and FREEZES the app (10 s on Android), and after a restart never reaches the final
     message · the KEYBOARD cannot be dismissed while creating or restoring an account.

★★ FOUR DECISIONS ARE TAKEN. Do not re-interview them.
  · the details cover: REMOVE for v1, do not polish it
  · the ring: REMOVE on Android AND iOS, shipped with the iOS lift fix
  · "Show sender name": RESTORE on MOBILE, stays removed on DESKTOP, migration DELETED
  · the address sheet: it HUGS its content, and the QR gets EXPLICIT block padding.
    ⚠ Never `margin-block-start: auto` again. Space that is CHOSEN reads as design; space
    that is LEFT OVER reads as a mistake, at identical pixel counts. See verdict §14.

★★ THREE ROWS ARE RETIRED. Delete them wherever they appear.
  · "the four sound assets are outstanding / the app is silent" — FALSE. All six files the
    code asks for are in Resources/Raw/sounds AND in the built bundle. The notification
    tone is UNNotificationSound.Default — the OS owns it. This claim has been carried since
    2026-08-24.
  · C7 — a PASS. The notification sounded.
  · the backup prompt on adding a contact — NOT a defect. DECISIONS #131 locked the nudge
    as "status-driven quiet-but-standing … no popups". A prompt was deliberately never
    built. Wanting one now is a NEW design decision, not a bug fix.

STILL QUEUED FROM THE LAST ROUND
1. DESKTOP ACCOUNT → CONTACTS. The one walk-day item NOT built, and the analysis is done:
   it is NOT frontend-fixable. The detail column is a native WebView, so no HTML element in
   home.html can paint into it. It needs one small HomePage verb — drop the detail content
   so the takeover shows there, restore it on close — plus a close-audit at tab/chat/tx.
   Its own batch. Do not fold it into anything.
2. The MINI-APP PRESS RECTANGLE is ★ ANDROID-ONLY — confirmed on iOS this pass, where it
   does not reproduce. So it IS reproducible at home. It follows the list/grid shape and is
   too fast to screenshot (#294 stands).

OWED BY DAMIR — one item only
  `#565 ②`'s [RESTOREDIAG] lines from a restore-then-restart. Everything else is closed.

★ DOCS WERE ARCHIVED 2026-08-27. 48 consumed handoffs, checklists, verdicts, commit
messages and old entry prompts moved to `docs/archive/`. What is LIVE in `docs/` is now
the whole live set — if a document is not in `docs/`, it is history, not a gap.
Still live and worth knowing:
  · `f5-findings-2026-08-26-walkday.md`   — the NOT-BUILT-ON-PURPOSE list below cites it
  · `f5-checklist-2026-08-26-{walkday,queued-fe,details}.md` — the source rows for the
    batches being fixed; the iOS sheet renumbers nothing, so ids map straight across
  · `f5-verdict-2026-08-21-ios.md`        — ⚠ two of its claims are CORRECTED by
    `ios-push-findings-2026-08-24-office.md`. Read the correction first
  · `ios-push-findings-2026-08-24-office.md` · `ios-push-workorder-2026-08-24.md` ·
    `ios-nse-spec.md` — iOS push. ★ The NSE is NOT in this session: it is gated on an App
    Group that does not exist at Apple yet
  · `opus-review-verdict-{walkday-576,589-590,591-592}.md` — the audits of the batches
    being fixed

NOT BUILT ON PURPOSE — read the findings doc before touching any of these: the
locked-phone ring (the NOTIFICATION has to own the sound; spec it, do not patch it) ·
un-like (#215 — the core persists only `like`; verify on device first) · #574 ② · #562 ④ ·
the third outgoing-request site (SingleChatPage:1666) · privacy toggles are v1.1.

A BE ROW IS OWED AND WRITTEN: MiniAppManager builds a delete path from a downloaded app
id, and Path.Combine returns a rooted second argument verbatim
(security-review-for-be-engineer.md MAJOR #10). Pre-existing. Damir's and the engineer's
call, not a silent fix.

LANGUAGE RULE: ASD-STE100 Simplified Technical English — chat replies and code comments.

SETUP
git clone --branch redesign/frontend https://github.com/Rexoflex/Spixi.git
git clone https://github.com/ixian-platform/Ixian-Core.git   # SIBLING, then: git checkout 097341a
cd Spixi && npm install --no-save jsdom tree-sitter tree-sitter-c-sharp

VERIFY BEFORE TOUCHING ANYTHING. If any number differs, say so and STOP.
bundle 296 · shells 18 · smoke BASELINE OK 3208 / the 3 KNOWN (#136 · M5 · B3)
· cs-syntax 144+1 · locales CLEAN 771 · Ixian-Core 097341a.

THE WORK
Verify-first everywhere (#294/#215). DECISIONS rows (#594+) at decision time. A
handover-gate row AS BUILT for every new verb, spixi.* key or log line. The #46 loop is
OPUS-run, the builder never reviews his own work, verdict to disk with the batch in the
filename.

★ CARRY THESE — they cost four review rounds and seven bad pins across the last batch:
· A `:not()` CARRIES ITS ARGUMENT'S SPECIFICITY. `.a > :not(.b):not(.c):not(.d)` is
  (0,4,0) and beats a class plus a pseudo-class.
· AT EQUAL SPECIFICITY, LATER WINS — so a new rule declared ABOVE the one it means to
  override is a no-op. This happened TWICE in one file, four rules apart, in the same
  batch that had just gained the comment explaining it.
· `indexOf` RETURNS -1, AND -1 IS LESS THAN EVERY INDEX. An order pin must assert both
  operands are found first. This also appeared twice, in mirror directions.
· A PIN'S FIXTURE CAN GUARANTEE ITS OWN RESULT — a short address fed to a truncator, an
  absence guaranteed by a handler nobody passed. Feed it the real shape.
· A DURABLE FLAG AND A CONSUMED HAND-OFF ARE DIFFERENT TOOLS. Anything that must survive
  a document reload cannot ride a slot some other document reads first.
· REMOVING A CONTROL IS NOT THE SAME AS CHANGING WHAT IT CONTROLLED — unless it wrote a
  persisted preference, which is then stuck with no UI to reach it.
· WRITE PINS FROM THE PROPERTY AND PROVE THEM BY MUTATION. Reading them twice does not
  work; across the last batch, mutation was the only thing that found seven bad ones.

DO-NOTs
1. No Ixian-Core changes (097341a frozen); core needs = a BE row.
2. No re-interviewing settled dials. Settled and CONFIRMED ON DEVICE this pass: the
   address row sits above Contacts · the peer address sheet drops the self-only safety
   line · the tip is green · call and payment cards hug and wrap.
   ⚠ THE DETAILS COVER IS NO LONGER A SETTLED DIAL — it is being REMOVED for v1 (Damir,
   2026-08-27). The old "DERIVED, never fetched" rule is moot. Do not preserve it, do not
   polish it, delete the surface.
3. No half-landed batches. 4. No new NuGet (#495). 5. No invented data — if the shell has
   no signal for something, say so rather than keying UI on a flag that does not exist.
6. Bundle BEFORE shells, always; and run extract-strings BEFORE the bundle whenever a
   string key changed, or the shipped bundle asks for a key the shipped dictionary lacks.
7. v1.1 items stay OUT. 8. Do NOT rebuild the address sheet — reuse openAddressSheet, and
   pass `subject: 'peer'` for anyone else's address. ⚠ Its LAYOUT does change this session
   (verdict §14): a spacing and sizing change INSIDE the existing surface, not a rebuild.
9. ★ Never place slack with `margin-block-start: auto`. Space that is CHOSEN reads as
   design; space that is LEFT OVER reads as a mistake, at identical pixel counts.

DELIVERY
The container CANNOT push (the git proxy refuses to credential Rexoflex/Spixi). Commit on
Damir's machine through the bridge and let him press Push, or hand him a tarball. Verify
every extract by hashing the landed files against the cloud tree. `tar --overwrite` ·
`git --no-optional-locks` always · stage in chunks of ~20 and verify the staged count ·
never `git add -A`. Write: the F5 checklist, the handoff, the next-session prompt, and the
commit message.
