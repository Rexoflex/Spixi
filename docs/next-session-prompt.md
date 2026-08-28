Spixi frontend redesign. Repo: C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi
Branch redesign/frontend. Ixian-Core is a SIBLING clone at ..\Ixian-Core, frozen at 097341a.
Read docs/handoff-2026-09-01.md and follow it.

★★ GET STRAIGHT TO WORK. Damir's order, 2026-08-31: this session BUILDS batch 1. It does
  NOT open with a review. The adversarial-loop material in the handoff is INFORMATION.
  When you finish, WRITE A HANDOFF THAT ORDERS the #46 loop over everything unaudited —
  the next session runs it, then the final FE batch, then the Mac, then polish.

VERIFY THE BASELINE FIRST. If any number differs, say so and STOP:
  bundle 307 · shells 18 · smoke BASELINE OK 3632 / the 3 known (#136 · M5 · B3)
  · locales ALL CLEAN 776 · cs-syntax 140+1 · i18n-lint ✓ · pseudo 9/9
  · Ixian-Core 097341a (170 modified files = CRLF churn; --ignore-cr-at-eol is EMPTY)
⚠ Smoke takes ~6 min and the bridge shell kills anything past 45 s — run it in the container.
⚠ cs-syntax-check needs tree-sitter, whose native build FAILS on the device VM. Container too.
⚠ CHECK WHAT IS MOUNTED before anything else. Ixian-Core is OUTSIDE the git repo; if
  $HOME/mnt/ shows only Spixi, ask Damir to add it. Session C lost two rows to this.

★★ BUILD WINDOWS WITH F5 — DECISIONS #663. `dotnet build` does not stage the MauiAsset
  files beside Spixi.exe, localizeHtml then returns without writing, and generatePage still
  hands back a URL into Documents\Spixi\html\ — so the app silently serves the PREVIOUS
  build's shell and looks completely normal. Android is unaffected.
★ BUNDLE BEFORE SHELLS, always (#258 §5.6).
★ ANDROID ICON/SPLASH CHANGES NEED AN UNINSTALL. Launchers and the splash theme are cached
  hard; a plain redeploy shows the old ones.

THIS IS SESSION D. BATCH 1 — deliberately smaller than session C (two new mechanisms, not
seven). Full detail in the handoff.

  1. **L13 · the leave-group check box.** ★ FULLY TRACED, nothing to discover.
     `ixian:removecontact:<addr>` and `ixian:removehistory:<addr>` (HomePage.xaml.cs:636/640)
     are already per-address twins of the page-scoped verbs, with results pushed back. Add
     ONE more twin, `ixian:leavegroup:<addr>`, calling the same sendLeave + removeFriend
     `ixian:leave` already does (#567, ContactDetails.xaml.cs:652). Shell: a check box in the
     existing openDeleteFlow (chats-row-menu.js:614), gated on the isRoomRow() already there.
     ★ WHAT IT MAY PROMISE (Core read at 097341a, #672): the leave rides the PENDING-message
     path with a push, so it reaches offline members; on their device handleLeave runs
     users.delUser(sender) — the leaver really leaves their roster — and an OWNER leaving
     removes the group outright.
  2. **L14 + L6③ · the mobile flicker.** ⚠ MEASURE FIRST (#294). ONE bug: the parked-peer
     re-present (#315). C# shows the home WebView on the tab it left and the shell cannot run
     until a later task, so a frame of the old tab is unavoidable from inside the document —
     the fix is C#. ⚠ THE RISK: it may be the L10 class, where the instrument must exist
     before the fix can be trusted. If the measurement says so, TELL DAMIR BEFORE BUILDING.
  3. **Two cleanups.** Delete the orphaned launcher set once Damir confirms the new icon
     (list at MainActivity.cs; nothing references it). Remove the dead `payments` target at
     scripts/build-shells.mjs:53 — it points at WalletSendPage / wallet_send.html, both
     deleted in session A.
  4. **The group-row delete confirmation.** Damir: "do we need it is the question. For now
     its ok." BRING HIM THE OPTIONS; DO NOT BUILD EITHER.
  STRETCH, only if the measurements are cheap: the wallet tx shimmer and the chats-row
  avatar flicker. Both measure-first; two unknowns in one batch is how a session grows.

AFTER THIS: session E runs the loop you order · then L3 + L4 + L9 (the final FE batch) ·
then the Mac (nine iOS rows + the two keyboard items) · then polish.

★★ THE RULES THIS PROJECT KEEPS PAYING FOR:
1. ★★ **TRACE WHAT THE PLATFORM ACTUALLY READS, not the artifact you expect to matter.**
   Session C got this wrong FOUR times and Damir caught three: the launcher icon came from
   MainActivity's [Activity] attribute, not from MauiIcon — two of his clean rebuilds were
   spent before anyone read that line.
2. ★★ **CHECK A BLOCKING CLAIM AT SOURCE BEFORE REPEATING IT.** "Damir owes the new logo
   SVG" (it was in the repo), "wallet-SEND redesign stays LAST" (session A finished it),
   "A1 needs the office Mac" (it needs neither iOS nor a Mac). All three blocked work for
   weeks. Anything shaped "owed by Damir" or "stays LAST" gets opened, not repeated.
3. ★★ **STRIP COMMENTS BEFORE ANY NEGATIVE SWEEP.** Use the top-level `stripCode` helper in
   smoke-test.mjs. Session C broke this FIVE times, three of them after writing the rule
   down. A comment explaining an absence necessarily NAMES the thing that is absent.
4. ★★ **MUTATE EVERY PIN BEFORE BELIEVING IT.** Eight of session C's were wrong on first
   run. Reading found none of them. And READ BOTH HOMES: two mutations survived a full
   suite because the pins ran the shipped bundle while the mutation changed the source.
5. **When a reviewer finds the same class twice, question the DESIGN.** Damir deleted the
   whole flag-artwork class with one sentence after two rounds of patching it.
6. **MEASURE BEFORE ASSUMING (#294)** — and make sure the instrument can tell the fix from
   the bug. L10's existing probe improved either way; it needed a new line to be honest.
7. **SIZE THE SESSION AROUND THE REVIEW, NOT THE ROWS.**

Do NOT re-open: the emoji flags STAY wherever the device can paint one (img/flags/*.png is
the FALLBACK, and the test is a canvas paint, never a platform guess) · the Android launcher
icon comes from MainActivity's [Activity] attribute · A1 is a BE row (#675) · the wallet-SEND
redesign is DONE · the [CDPERF] probe is gone (both numbers are in cdperf-2026-08-29-android)
· the rail lights Account while the Account-launched directory is open · nothing is restored
to the detail column on close · ignorePushedTheme stays retired · the single check stays as
#649/#650 left it · a bot room stops at a double check · a group bubble is never green · the
long-press menu shows READ and DOWNLOADED only · the delivery rule names NO reaction key ·
only the roster case speaks when the receipt list is empty · "Mark as read" is decided ·
kick/ban stays bot-room only · no Ixian-Core changes.

⚠ Owed by Damir: L12 (an admin account) · the walk. NOTHING ELSE.

Interview him for anything unknown, don't assume. One command per code block, real paths,
no placeholders. He has been right every time he pushed back.
