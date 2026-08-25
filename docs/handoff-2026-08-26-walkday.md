# Handover — the WALK-DAY FIX BATCH (2026-08-26)

**Everything the entry prompt ordered is BUILT and REVIEWED.** DECISIONS
**#576–#583**, all UNCOMMITTED on top of `3d6703a7`, delivered via the
`_deliveries/` tarball + the bridge.

Damir answered both opening questions: the exe was launched from an **ELEVATED**
PowerShell (so #568's classic E_FAIL branch is confirmed), and the walk produced
**no new findings**, so the whole session went to the queue.

## What landed

| Row | What |
|---|---|
| **#576** (#568) | The Windows picker falls back to `comdlg32 GetOpenFileNameW` when the WinUI picker's broker refuses an elevated process. Owner = the MAUI window, `OFN_NOCHANGEDIR`, zeroed buffer, cancel told apart from failure, and the elevation state LOGGED so the branch never has to be asked about again. |
| **#577** (#573) | The Android ring path takes the APPLICATION context. One helper, four reads, three Activity-only members guarded — including one in a `finally` the catch above did not cover, which threw out of `stopRinging`. |
| **#578** (#572 ①) | An outgoing contact request stopped raising the user's own unread count, plus a bounded heal for requests already pending. Fixed in C#, where the number lives. |
| **#579** (#572 ③) | The long-pressed chat row lifts above the deep scrim on mobile, on the `.c-swipe` wrapper — the only node the `will-change` stacking context cannot cap. |
| **#580** (#572 ④) | A locally declined call reads "Call declined" in the bubble AND the chats row, and still does after a restart. |
| **#581** (#569 + #570) | The tip sheet obeys the #211 truncation canon at the component, and a short bubble gets a measured width floor so the heart and the Tipped chip stop landing on the timestamp. |
| **#582** (#575 + #572 ②) | The address left the Account hero. One row, with Contacts, opening the polished sheet: smaller QR, near-full height, a dismiss control, Share beside Copy, one left edge in the explainer. |
| **#583** (#574 ① + #565) | A queued call request no longer rings as if it were fresh, and the restore reports WHICH way it failed. |

## The loop — `docs/opus-review-verdict-walkday-576.md`

Three reviewers, none of them the builder. **Round 1** split C# and FE; **round 2**
attacked the fixes, which is where this project's defects live. **9 MAJORs**, two
reproduced empirically.

The three worth carrying:

- **#572 ④ was inert in the chats list.** `metaData.setLastMessage` deep-copies, so
  a fix applied to the message never reached the row — and the stale copy is what
  persists. Two surfaces disagreeing means one of them is reading a snapshot.
- **#570's placement flip oscillated at 60 fps**, on exactly the bubbles it was
  written for, because it re-measured a box its own write had grown. Rebuilt as
  Damir's other candidate, measured through `max-content`.
- **One mistyped restore password made the correct one fail forever**, because the
  zip was written OVER the staged envelope before the wallet was verified. That one
  was underneath #565 all along.

★ And, three separate times, **a pin was defending the defect** — asserting the exact
line a correct fix would delete. Every pin in this batch was rewritten from the
property and mutation-proven: two batched runs of seven mutations each, every one
turning its own pin red and nothing else.

## Pipeline at delivery

bundle **293 exports** (+1: `liftedRowAddress`) · shells **18** · smoke
**BASELINE OK 3139 / the 3 KNOWN** (#136 · M5 · B3) · cs-syntax **144 + 1** ·
locales **ALL CLEAN, 772 keys** · i18n-lint ✓ · pseudo 9/9 · Ixian-Core `097341a`
untouched.

⚠ **C# changed in 11 files → wipe `obj`/`bin` (#387).**

## The walk

`docs/f5-checklist-2026-08-26-walkday.md` — 36 items, and the artifact twin has the
per-item notes plus the Copy-findings button.

## Still owed from Damir

1. **#565 ②** — the `[RESTOREDIAG]` capture. It brackets `loadChats` at both ends
   now and prints the three numbers that split the three candidate layers apart.
   Checklist items 33–34 produce it.
2. **#573** — did the notification reach the tray in the headless repro? The ring is
   fixed; the tray half was never confirmed.
3. **#503** — the `(service-extension)` notiflog line, unchanged from last round.
4. **W-3.1** — the screenshot. No mechanism, no fix (#294).

## Queued, not built

- **Recipient-side honest accept** (#562 ④) — the #109 grammar, carrier verify first.
- **The F5-2 REAL fix** = BE §1e-6, when the core unfreezes. The F5-2 hook's verbatim
  exception log keeps its retirement condition until then.
- **#574 ②** — the missed-call notification carries no caller nickname.
- **A THIRD outgoing-request site** (`SingleChatPage:1666`, add-from-group-member)
  writes no `requestAddSent` marker at all — pre-existing, found during #578.
- **Privacy toggles** stay v1.1, by Damir's call.

## Residual the review named and I did not close

Below the #574 gate's margin, a request aged under ~120 s cannot be told from a live
call without a trustworthy shared clock. The budget is shortened by the age it can
attribute, so the window is smaller than it was — but a transport-level "this was
redelivered" flag would close it properly. That is a BE row, not ours.

---

# PART TWO — the walk triage (#584–#588), same day

Damir walked the batch on both platforms (**33 pass · 1 fail · 2 n/a of 36**) and sent
three logs. The logs did the work: **`[RESTOREDIAG]` named #565 outright**, and the flush
cadence in a second log named a finding he had filed as "sometimes the bottom sheet
opens on dark mode".

## Six fixed

| Row | What |
|---|---|
| **#584** | The contacts one-shot latch. `friends=0 accFiles=15` — tree on disk, list empty. `loadContacts` is read once per process; `preStart` re-arms it, **only when the list is empty**. |
| **#585** | Create-after-wipe walked back into the deleted account. `goToWelcome` now removes AND disposes every page beneath the new LaunchPage; back is swallowed only when something sits behind. |
| **#585 rider** | The wipe takes the mini apps — by sweeping the directory, because the wipe stops the manager first and that empties the list. |
| **#586** | A muted contact rang anyway. New `shouldRingForCall`, and no ring while our own lock is up. |
| **#588** | The first long press after a restore. Rows carry `data-address`; the anchor re-resolves the live row. |

## The review found two MAJORs *in the fixes*

That is the number worth carrying. Both were mine:

1. **The unconditional latch re-arm was a regression on a commoner path than the bug.**
   `preStart()` also runs on RESUME, where `friends` is populated — and `loadContacts()`
   starts with `friends.Clear()` and rebuilds every Friend as a NEW object. The app
   routes by reference identity, so an open conversation would be orphaned: an arriving
   message renders nowhere, and a typed reply is persisted from the wrong list, i.e.
   dropped. Now gated on an empty list, which is the only state that can orphan nothing.
2. **The mini-app sweep was a no-op.** The wipe's step 1 already ran
   `MiniAppManager.stop()`, which clears `appList` — so the dictionary walk deleted
   nothing, returned 0, and left a clean log while every app survived. It sweeps the
   directory now.

Plus five MINORs, each a real user-facing edge: the back belt trapped a fresh install ·
removed pages were not disposed, leaving the wiped account's WebView live · only index 0
was removed, so an overlay-presented wipe could leave a legacy page behind · the ring gate
inherited the global notifications master, which would make a call invisible for a user
who only silenced banners · and the first cut of #588 carried the pressed row's
**rectangle** forward, which the same flush re-sorts — pointing the menu at one
conversation while it acted on another.

★ And again: several of my pins were asserting the buggy line, so the correct fix would
have turned them red. All rewritten from the property.

## Numbers at delivery

bundle **293 exports** · shells **18** · smoke **BASELINE OK 3161 / the 3 KNOWN** ·
cs-syntax **144 + 1** · locales **ALL CLEAN, 772 keys** · i18n-lint ✓ · pseudo 9/9 ·
Ixian-Core `097341a` untouched. ⚠ **C# changed in 16 files → wipe `obj`/`bin`.**

## What is queued, not built

`docs/f5-findings-2026-08-26-walkday.md` is the full list with a mechanism per row.
The headline items: Damir's address-sheet re-layout and the address row above Contacts ·
the two desktop routing bugs (Contacts and a language change re-drive `home.html` to
tab1 under an open Account pane) · the dark-mode lifted-row fill · the desktop
right-click menu needs the flip-above the mobile path has · a long nickname is being
middle-truncated.

⚠ **Three things are deliberately NOT built**, and each says why in the findings doc:
the locked-phone ring needs the NOTIFICATION to own the sound (a scoping job, not a
patch) · un-like is missing as an affordance AND the core persists only `like`, so it
needs on-device verification first (#215) · and one BE row is now owed for a
pre-existing path-traversal in `MiniAppManager.remove`.

