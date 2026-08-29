Spixi frontend redesign. Repo: C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi
Branch redesign/frontend. Ixian-Core is a SIBLING clone at ..\Ixian-Core, frozen at 097341a.
Read docs/handoff-2026-09-02.md and follow it. §4 is your whole job.

★★ THIS IS SESSION E AND IT RUNS THE #46 LOOP. NOTHING ELSE.
  Damir's order, 2026-08-31, unchanged: work → a handoff that ORDERS the loop → a session
  that RUNS it → L3+L4+L9 → the Mac → polish. Session D wrote the order; you execute it.
  DO NOT build rows. DO NOT start a batch. DO NOT "fix one thing while you're in there"
  outside what the loop itself finds.
  ★★ WRITE THE VERDICT INTO docs/handoff-2026-09-02.md — the file that ordered the loop.
  The #515 lesson: a verdict that is not written back is a verdict nobody can find.

VERIFY THE BASELINE FIRST. If any number differs, say so and STOP:
  bundle 307 · shells 18 · smoke BASELINE OK 3660 / the 3 known (#136 · M5 · B3)
  · locales ALL CLEAN 779 · cs-syntax 140+1 · i18n-lint ✓ · pseudo 9/9
  · Ixian-Core 097341a (170 modified files = CRLF churn; --ignore-cr-at-eol is EMPTY)
★ THAT NUMBER WAS MEASURED AFTER THE LAST EDIT TO THE SUITE. Session D's entry baseline was
  one pin low because three documents copied a figure recorded 37 minutes before the last
  pin landed (#681). Measure last, then write.
⚠ Smoke takes ~6 min and the bridge shell kills anything past 45 s — run it in the container.
⚠ cs-syntax-check needs tree-sitter, whose native build FAILS on the device VM. Container too.
⚠ CHECK WHAT IS MOUNTED before anything else. Ixian-Core is OUTSIDE the git repo; if
  $HOME/mnt/ shows only Spixi, ask Damir to add it. Session C lost two rows to this.
⚠ THE TREE HAS SIXTEEN DELETED FILES pending Damir's `git rm` (the launcher orphan set,
  #679 — list in the handoff §3). If they are back, he has not run it; do not re-delete
  silently, ask.

THE SCOPES — disjoint, read-only, independent (handoff §4a):
  A · the C# delta — onLeaveGroupFor · the ixian:leavegroup: and ixian:landtabprobe:
      branches and their placement above the legacy Contains() chain · SContacts.leaveGroup
      reached from a SECOND caller for the first time · AND session C's POST-LOOP work,
      which no auditor has ever seen: MainActivity.cs's [Activity] icon attribute,
      appicon.svg, appiconfg.svg, Spixi.csproj, security-review-for-be-engineer.md.
  B · the shells — home.html's leavegroup/removehistory branch, leaveGroupResult,
      consumeLandTab's new argument and EVERY call site, the three fallback consumers,
      plus the built Resources/Raw/html output.
  C · components — openDeleteFlow's third box, the note, the CTA relabel and its listener
      ordering against deleteCheckbox's own · the three new strings in all 13 dictionaries
      · the built bundle.
  D · THE SUITE ITSELF — the 20 new pins, adversarially. Two of session D's were vacuous on
      the first pass and reading found neither. Assume more.

★★ THE RULES THIS PROJECT KEEPS PAYING FOR:
1. ★★ TRACE WHAT THE PLATFORM ACTUALLY READS, not the artifact you expect to matter.
2. ★★ CHECK A BLOCKING CLAIM AT SOURCE BEFORE REPEATING IT. Session D opened L13's "fully
   traced, nothing to discover" and found two thirds of it already built, and the missing
   third in the half the row did not name.
3. ★★ STRIP COMMENTS BEFORE ANY NEGATIVE SWEEP. Use the top-level stripCode in
   smoke-test.mjs. A comment explaining an absence necessarily NAMES the thing absent.
4. ★★ MUTATE EVERY PIN BEFORE BELIEVING IT, AND READ BOTH HOMES — src/components AND
   src/demo/spixi.iife.js. ★ Two new pin classes from session D: BOUND A SLICE BY THE NEXT
   DECLARATION, NEVER BY A CHARACTER COUNT (a fixed window ran on into the neighbouring
   handler when the mutation made the code shorter), and A BARE KEY NAME IS A PREFIX TEST
   (/leaveGroupNote/ passed over strings.leaveGroupNoteX).
   ⚠ The harness: cp -al the tree, ONE edit per copy, os.remove before writing (never write
   through a hardlink), three runs at a time — seven concurrent jsdom runs wedge this box.
5. When a reviewer finds the same class twice, question the DESIGN.
6. MEASURE BEFORE ASSUMING (#294) — and make sure the instrument can tell the fix from the
   bug. L14 was NOT built for exactly this reason (#677).
7. SIZE THE SESSION AROUND THE REVIEW, NOT THE ROWS.

⚠ Owed by Damir: the ⏱ [LANDTAB] Android walk (handoff §7) · L12 (an admin account) · the
  session-D walk. NOTHING ELSE.
Do NOT re-open anything in handoff §8.
Interview him for anything unknown, don't assume. One command per code block, real paths,
no placeholders. He has been right every time he pushed back.
