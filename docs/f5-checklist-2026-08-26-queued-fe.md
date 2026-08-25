# F5 checklist — the queued FE batch (#589 / #590), 2026-08-26

**Build:** C# changed in **2** files (`SNotificationPrefs.cs`, `App.xaml.cs`) → **wipe
`obj`/`bin`** (#387). Components changed → the FULL pipeline already ran in-session;
your local run is the pre-commit confirmation.

```
node scripts/extract-strings.mjs && node scripts/build-locales.mjs \
  && node scripts/build-strings-iife.mjs && node scripts/build-demo-bundle.mjs \
  && node scripts/build-shells.mjs && node scripts/smoke-test.mjs
```
Expect: bundle **296** · shells **18** · smoke **3192 / the 3 known** · locales **770 keys**.
⚠ The key count drops 772 → 770: two keys (`notifSender`, `notifSenderSub`) are orphaned
by the removed row and the pipeline drops them. That is correct, not a loss.

---

## 1 · The address sheet — Damir's layout

| # | Do | Expect |
|---|---|---|
| 1.1 | Account → the **address row is now ABOVE Contacts** | his order |
| 1.2 | Tap it | info block → QR → caption → address chip (Copy + Share) → safety line. Each explanation sits beside what it explains |
| 1.3 | Both explainer blocks | every line of copy starts at the SAME left edge (a 4px step was found and fixed) |
| 1.4 | **DESKTOP**: open it in the Account pane | the **X** is now there (it used to be hidden — and un-hiding it also fixed the dialog opening with focus still on the opener) |
| 1.5 | **DESKTOP**: make it overflow (a long locale, a short window) | the **scrollbar is visible without hovering**, and nothing is clipped at the foot |
| 1.6 | Wallet → empty activity → **"Show my address"** | opens the **sheet**, not the Receive screen. The hero's Receive still opens the takeover |

⚠ **1.7 — EYEBALL, not a pass/fail.** On a tall phone the sheet keeps its near-full height
and the slack now collects **above the QR**, so the info paragraph sits alone at the top
with ~110px of air below it. It used to sit at the foot. If it reads as a hole, say so —
the alternative is one line.
⚠ **1.8 — EYEBALL.** The safety block and the address chip are now adjacent and both paint
`--surface-neutral-02`. Two identical-looking cards in a row may read as one broken block.

## 2 · The lifted row — ★ THE ONE THAT WAS WRONG TWICE

| # | Do | Expect |
|---|---|---|
| 2.1 | **DARK MODE**, chats list, long-press a row | the row is clearly lifted: one neutral step up **AND a ring** |
| 2.2 | Light mode, same | the same, and it must not look heavier than dark |
| 2.3 | Open a row's swipe drawer, then long-press it | no translucent band flashes through the row as the drawer springs back |

★ Why this needed two rounds: the ground #572 added has been **dead code since it shipped**
— an opaque child was covering it — and after that was fixed, the measurement said one
neutral step is worth **1.10:1** in dark, because a black scrim cannot darken an
already-black list. **The ring is what actually does the work in dark.** If the ring reads
as "selected" on a row rather than "lifted", say so — the fallback is elevation.

## 3 · Desktop right-click menu

| # | Do | Expect |
|---|---|---|
| 3.1 | Right-click a chat row **near the bottom** of the window | the menu opens **ABOVE** the row and never covers it |
| 3.2 | Right-click a row near the top | it opens below — there is no room above |
| 3.3 | Same on a message bubble | same rule |

## 4 · Nicknames

| # | Do | Expect |
|---|---|---|
| 4.1 | A contact with a **long nickname** (20+ characters, no spaces) | the name is never `abc…xyz` middle-truncated anywhere. Only an ADDRESS is |
| 4.2 | Tip or Request that contact | the sheet's title keeps the **verb** and ellipsizes only the **name** |
| 4.3 | Switch to **Deutsch** and repeat 4.2 | de-de puts the name first — the action word must still be readable |

## 5 · Language + the Account rail — ★ 2 STEPS, THE ORDER MATTERS

| # | Do | Expect |
|---|---|---|
| 5.1 | **DESKTOP**: open Account, change the language | the UI re-localizes and the **rail still shows Account** (it used to jump to Chats) |
| 5.2 | Immediately after 5.1 — **within ~5 seconds** — tap **Chats** in the rail | whatever the pane does, the rail and the screen must **agree**. This is the window where C# answers a tab tap without closing the pane, and an earlier draft of this fix got it wrong here |
| 5.3 | Close the Account pane normally | the rail falls back to the tab underneath |
| 5.4 | Mobile: nothing about any of this should differ | unchanged |

## 6 · Notifications

| # | Do | Expect |
|---|---|---|
| 6.1 | Account → Notifications | two switches: the master and In-app sounds. "Show sender name" is gone |
| 6.2 | Receive a message | the notification reads its per-type line with **no sender name** — the shipped default |

⚠ **6.3 — A QUESTION FOR YOU, NOT A TEST.** Removing that row would have left anyone who
had turned it ON stuck with a counterparty's name on their lock screen and no way to turn
it off, so the batch adds a one-shot migration back to the default. **Was that switch ever
in a build a real user ran?** It shipped 2026-08-21. If the answer is no, the migration is
a permanent one-shot mutation of preference state for nobody and should be deleted.

## 7 · The mini-app press rectangle — ★ EVIDENCE, NOT A FIX

| # | Do | Expect |
|---|---|---|
| 7.1 | Open a mini app that shows the contacts picker | ideally no pressed-row rectangle over the new screen |

⚠ **Honest scope.** `pressable.js`'s own backstops already bound any press state to ~2
seconds, so what shipped closes a real window but **cannot** explain a rectangle that
persists. If it is still there, **a screenshot is owed** and the cause is elsewhere (#294).

---

## Not built, and why

- **Desktop Account → Contacts** still overtakes the left pane. It is **not FE-fixable**:
  the detail column is a native WebView, and no HTML element in `home.html` can paint into
  it. Putting the directory there needs one small `HomePage` verb — specced, not guessed.
