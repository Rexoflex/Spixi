Read `docs/handoff-2026-08-19g.md` FIRST, then `DECISIONS.md` rows #399–#418.

The previous session ran overnight unattended and then continued live with Damir on a
real Android device. It landed one large batch — the four #391 F5 fixes, the permanent
community door, **AND-7 full bleed**, the locale tail, the offline→online update check,
the update-notice scope — plus two review rounds (6 MAJOR found and fixed), four
follow-up rounds from his F5 on the system bars, and three on-device probes.
Smoke 1992 → **2070 / the same 4 known pre-existers**. It IS F5'd: the bar round passed
5/5 on device.

**If Damir has not committed it yet, do NOT start new work.** Help him land it —
`docs/f5-checklist-2026-08-18-overnight.md` has the build and git commands (the commit
message is in §7; the smoke number is now 2069).

**Once it is committed, the next batch is N71** — the theme push-vs-reload round.
Root cause is recorded in handoff 19c §2: the revived OS-flip path RELOADS where the
working explicit-pick path PUSHES, and `settings.html` has no `setTheme` handler at all,
along with eleven other shells. Diff the two paths rather than inventing a third
(#385's lesson), and verify at source before building (#215).

★ **N78 is why N71 is now urgent rather than merely next.** Damir on device: an OS theme
flip yanks the user to Chats from wherever they were, and every screen then re-runs its
empty-state gate — so his phone's evening auto-switch interrupts whatever he is doing.
Cause: `reloadAllPages` builds a fresh document and `home.html:3079` (Fix #8)
unconditionally sends `ixian:tab:tab1` on every boot. Fix #8 is CORRECT for the case it
was written for. ⚠ **Do not patch it in isolation** — a PUSHED theme creates no new
document, so N71 fixes both halves at once.

After N71, the strongest candidate is **Account as a true peer of the other three tabs**
(Damir's call this session). It is still the parked overlay descended from the old
slide-in sidebar, which is why it misses the tab repaint path and why the desktop rail
reverts to Chats while the pane is open. ⚠ It needs the security handover gate walked:
#230 gates the in-place lock present on the host being HomePage, and changing which page
hosts Account moves that boundary.

**Do NOT build N77** (the community-bot load). It was measured on device and handed to
the BE/protocol run: one join produced 6690 log lines — 5682 duplicate `s2data` enqueues
to one relay in 68 s, 478 signature-verification failures, 17 RSA decrypt failures.
Nothing reaches the shell, so no FE loading state can help.

Standing rules this batch re-earned the hard way: pin the SITE the behaviour runs
through and MUTATE it before believing it — the batch shipped three pins that matched
their own comments and one security pin that could not fail; a fallback edit is not a
copy change until `extract-strings` has run; and since full bleed, anything derived from
"the current surface" must be READ, not REMEMBERED.
