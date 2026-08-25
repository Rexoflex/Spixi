NEXT SESSION — entry prompt.

READ docs/handoff-2026-08-26-queue-and-details.md FIRST. Then the two F5 checklists it
names, and the two verdicts beside them. Do NOT re-derive any of it.

STATE: #589-#592 are COMMITTED (`597234a7`, 84 files) and, if Damir pressed Push,
on origin/redesign/frontend. #576-#588 are the batch below them.
⚠ Check DECISIONS.md ends at #592. Missing → he has not pushed → STOP and say so.

★ THE FIRST THING: ASK FOR HIS F5 RESULTS, TWICE OVER.
He was testing #584-#588 in parallel during the last session and never sent them, and
then #589-#592 landed on top. So there are TWO untriaged walks. Triage each fail with a
mechanism NAMED (#294) before touching anything. The two most likely to surprise:
  · #584 — background→resume with a chat open: a message must still render in that open
    conversation and a reply must still persist.
  · #585 — hardware back on a FRESH INSTALL welcome screen must still EXIT the app.
And from the new batch, the two dials that are eyeballs, not pass/fail:
  · the lifted chat row now carries a RING as well as a fill — lifted, or selected?
  · `--text-success` moved one ramp step darker in LIGHT ONLY (the green tip missed AA at
    12px bold). It also moves received tx amounts, tx-sheet amounts and payment-card
    amounts. Both revert in one line.

THE QUEUED WORK, in order:

1. DESKTOP ACCOUNT → CONTACTS. The one item from his walk-day list that is NOT built, and
   the analysis is done: it is NOT frontend-fixable. The detail column is a native
   WebView, so no HTML element in home.html can paint into it. It needs one small
   HomePage verb — drop the detail content so the takeover shows there, restore it on
   close — plus a close-audit at tab/chat/tx like every other pinned pane. Build it as its
   own batch; do not fold it into anything.
2. HIS ANSWER ON "Show sender name" (handoff §Owed 2). If that switch was never in a
   shipped build, delete the one-shot migration in SNotificationPrefs.cs and its pins.
3. The mini-app press rectangle needs a SCREENSHOT before any further code (#294). What
   shipped is hygiene and is documented as such.

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
Verify-first everywhere (#294/#215). DECISIONS rows (#593+) at decision time. A
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
2. No re-interviewing settled dials. Settled last batch: the address row sits above
   Contacts · the peer address sheet drops the self-only safety line · the tip is green ·
   call and payment cards hug and wrap · the details cover is DERIVED, never fetched.
3. No half-landed batches. 4. No new NuGet (#495). 5. No invented data — if the shell has
   no signal for something, say so rather than keying UI on a flag that does not exist.
6. Bundle BEFORE shells, always; and run extract-strings BEFORE the bundle whenever a
   string key changed, or the shipped bundle asks for a key the shipped dictionary lacks.
7. v1.1 items stay OUT. 8. Do NOT rebuild the address sheet — reuse openAddressSheet, and
   pass `subject: 'peer'` for anyone else's address.

DELIVERY
The container CANNOT push (the git proxy refuses to credential Rexoflex/Spixi). Commit on
Damir's machine through the bridge and let him press Push, or hand him a tarball. Verify
every extract by hashing the landed files against the cloud tree. `tar --overwrite` ·
`git --no-optional-locks` always · stage in chunks of ~20 and verify the staged count ·
never `git add -A`. Write: the F5 checklist, the handoff, the next-session prompt, and the
commit message.
