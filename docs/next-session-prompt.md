NEXT SESSION — entry prompt.
READ docs/handoff-2026-08-26-walkday.md FIRST — PART TWO is the most recent work.
Then docs/f5-findings-2026-08-26-walkday.md — that is THE PLATE, one mechanism per
row, already root-caused, with the six that are DONE marked ✅. Do NOT re-derive it.
docs/opus-review-verdict-walkday-576.md holds the earlier review rounds.
STATE: #576-#583 shipped and walked (33 pass · 1 fail · 2 n/a of 36); #584-#588 are
the triage fixes built on that walk. All of it is COMMITTED at the tip you cloned.
★ DAMIR IS F5-TESTING #584-#588 IN PARALLEL WHILE YOU WORK. Do not wait for him.
His results arrive mid-session; triage them then (see ② below).
THE JOB:
① START HERE — THE QUEUED FE WORK. All frontend, all in files that do NOT touch
   #584-#588's C#, so a correction from his F5 cannot collide with it.
   Every row is triaged with a mechanism in the findings doc — read it, don't
   re-derive it.
   (a) ★ Damir's ADDRESS-SHEET RE-LAYOUT (#582 notes) — HIS layout, do not
       re-interview: the address row goes ABOVE Contacts · the info block sits
       ABOVE the QR · the safety line BELOW the address block · every gap from
       spacing tokens, including title→content · desktop gets the mobile dismiss
       icon AND a scrollbar visible without hovering exactly over it.
   (b) The two DESKTOP ROUTING bugs, same root: opening Contacts, and changing
       language, both re-drive home.html to tab1 while the Account pane is open,
       and Contacts overtakes the LEFT pane while the right pane becomes a
       conversation. He wants the directory in the DETAIL column with the hub
       kept on the left. The spixi.landtab handshake (#238) is the existing lever.
   (c) Dark-mode LIFTED ROW wants the NEUTRAL press fill, not --surface-screen.
   (d) DESKTOP right-click menu needs the flip-above the mobile path already has
       (#557 4.1) — it currently covers the row it acts on.
   (e) A long NICKNAME is being MIDDLE-truncated: isPseudoAddressNick is
       misclassifying it. A nick ellipsizes at the END, on overflow only.
   (f) Small: the mini-app contacts picker leaves a pressed-row rectangle over the
       new screen · Account→Notifications "show sender name" is redundant · empty
       wallet activity "Show my address" must open the SHEET, not wallet Receive.
② WHEN HIS F5 RESULTS ARRIVE — triage each fail with a mechanism NAMED (#294).
   Two of the six changed behaviour on paths he never reported, so those are the
   ones to read first if they fail:
   · #584 — background→resume with a chat open. A message must still render in
     that open conversation and a reply must still persist. The first cut of this
     fix rebuilt every Friend and orphaned the page's reference.
   · #585 — hardware back on a FRESH INSTALL welcome screen must still EXIT the
     app. The first back-belt trapped it.
   The rest are the reported-bug set (wipe→restore contacts · create-back-twice ·
   mini apps gone after a wipe · muted contact silent · long-press right after a
   restore): a failure there is a fix, not a rethink.
③ NOT BUILT ON PURPOSE — read the findings doc before touching any of these:
   · The LOCKED-PHONE RING. Half is done (no ring while our app lock is up). The
     other half — hardware keys cannot silence our MediaPlayer — needs the
     NOTIFICATION to own the sound, i.e. a call-category notification with its own
     ringtone. SPEC IT FIRST. It is not a patch.
   · UN-LIKE: the affordance is missing AND #215 says the core persists only
     `like` for user reactions. Verify on device BEFORE building.
   · #574 ② (no caller nickname on the missed-call notification) · #562 ④
     recipient-side honest accept (verify the carrier first) · the THIRD
     outgoing-request site SingleChatPage:1666 · the sub-120s staleness residual
     on #574. F5-2 and §1e-5/§1e-6 stay frozen-core. Privacy toggles are v1.1.
④ A BE ROW is owed and already written: MiniAppManager builds a delete path from a
   DOWNLOADED app id, and Path.Combine returns a rooted second argument verbatim
   (security-review-for-be-engineer.md MAJOR #10). Pre-existing; the wipe made it
   a second unattended caller. ~4 lines at two sites. Do not build it silently —
   it is his and the BE engineer's call.
LANGUAGE RULE: ASD-STE100 Simplified Technical English — chat replies and code
comments.
SETUP
git clone --branch redesign/frontend https://github.com/Rexoflex/Spixi.git
git clone https://github.com/ixian-platform/Ixian-Core.git   # SIBLING, REQUIRED
cd Spixi && npm install --no-save jsdom tree-sitter tree-sitter-c-sharp
⚠ Check DECISIONS.md ends at #588. Missing → Damir has not PUSHED yet → STOP and
say so; do not work against an older tip.
Verify before you touch anything. If any number differs, say so and STOP.
bundle 293 · shells 18 · smoke BASELINE OK 3161 / the 3 KNOWN (#136 · M5 · B3)
· cs-syntax 144+1 · locales CLEAN 772 · Ixian-Core 097341a.
THE WORK
Verify-first everywhere (#294/#215). DECISIONS rows (#589+) at decision time.
Handover-gate rows AS BUILT for every new verb/key/log line. The #46 loop is
OPUS-run, builder never reviews own work, verdict to disk with the batch in the
filename.
★ CARRY THESE — they cost four review rounds across this batch:
· A store that hands you a COPY will not tell you (metaData.setLastMessage
  deep-copies, so a fix on the message never reached the row).
· Never re-measure from a state your own write changed.
· A deferred undo is NOT an undo; a synchronous re-render can replace the node
  first.
· querySelector answers in DOCUMENT ORDER, not recency.
· ★ A GUARD THAT ALREADY RAN MAKES YOUR CLEANUP A NO-OP — the mini-app sweep
  walked a dictionary the wipe had already emptied, returned 0, and logged clean.
· ★ THE PATH YOU FIXED IS RARELY THE ONLY PATH — preStart also runs on RESUME,
  and the unconditional fix was worse than the bug it closed.
· ★ A pin written FROM THE CODE defends the code. Write pins from the PROPERTY
  and prove them by MUTATION. Across this batch, mutation was repeatedly the only
  thing that showed a pin was worthless.
DO-NOTs
1. No Ixian-Core changes (097341a frozen); core needs = BE row.
2. No re-interviewing settled dials. Settled THIS batch: the address leaves the
   Account hero · #570 is a min-width FLOOR, not a placement flip · #580's marker
   is "-1" for downgrade safety · the ring is suppressed while our lock is up
   (Damir re-dialled #272 himself) · #588 re-resolves the live row, it does NOT
   reuse the pressed row's rectangle.
3. No half-landed batches. 4. No new NuGet (#495). 5. No invented data.
6. Bundle BEFORE shells, always. 7. v1.1 items stay OUT.
8. Do NOT rebuild the address sheet — reuse openAddressSheet.
9. Windows runs via TWO commands (build, then the exe) — -t:Run hits
   MSB3073/9009. Build in a NORMAL PowerShell; elevate only the RUN, and only for
   the #576 picker items. Wipe obj/bin after a C# change (#387).
10. The F5-2 hook's verbatim exception log has a retirement condition (gate row)
   — retire/logSafe-wrap it WITH the F5-2 real fix, not before.
DELIVERY
Everything UNCOMMITTED via a _deliveries/ tarball + the bridge when the desktop
is online; tar --overwrite; VERIFY THE EXTRACT LANDED (hash the extracted files
against the cloud tree). Write: the F5 checklist for the new batch (fresh
artifact, per-item notes) · the handoff · the fresh next-session prompt · the
prepared commit message. git --no-optional-locks always · never git add -A
(_scratch/ is untracked and must stay out) · git push does not work from the
bridge. If the bridge is offline, hold the tarball and say so.
