# #46 loop verdict — #589 / #590 (the queued FE work), 2026-08-26

Three disjoint read-only auditors, none of them the builder, then a FRESH
break-my-verdict reviewer over the fixes. **The reviewer broke all three fixes.**
That is the number worth carrying out of this batch.

## Round 1 — three MAJORs

| # | What | Where |
|---|---|---|
| **A-MAJOR** *(the lift)* | The #572 lift ground has been DEAD CODE since it shipped. `.c-swipe__content` is a positioned child that fills the wrapper and paints an opaque `--surface-screen` of its own, so the ground painted on `.c-swipe` was never visible. The row was the list's own colour — which is exactly what Damir reported. Every ordinary mobile row is wrapped, so this is the normal case. | `message-menu.css` · `chats-swipe.css:39-42` |
| **B-MAJOR** *(the routing)* | The `spixi.landtab` hand-off cannot carry this. It is a single slot CONSUMED ON READ, and while the pane writes it the OUTGOING home document is still alive underneath — its storage listener fires first, eats the key, and the regenerated document finds nothing. On WinUI, the only platform with this pane, that event is reliable, so the fix lost the race every time. | `home.html:1165` · `settings.html` |
| **C-MAJOR** *(the routing, second half)* | Even had the key survived: C# echoes `selectTab(currentTab)` on every load, and that echo lands AFTER any boot-time correction and re-lights Chats. A boot one-shot could never have held. | `HomePage.xaml.cs:1733` |

Plus, from the same round: a **privacy one-way door** — removing the "Show sender
name" row would have left anyone who had turned it ON with the counterparty's name on
their lock screen and no control anywhere in the app to turn it off; a **real scrollbar
bug I introduced** by ungating a `::-webkit-scrollbar` WIDTH rule, which opts a Chromium
scroller out of overlay scrollbars into classic layout-consuming ones with no reserved
gutter; a **4px gutter mismatch** between the two explainer blocks, which is precisely the
one-left-edge alignment #575 was written to buy; and my own recorded MECHANISM for the
desktop scroll cap being **wrong** — the real defect was a `92px` constant that assumed a
one-line title, not host geometry.

## Round 2 — the reviewer broke every fix

| # | What |
|---|---|
| **R2-MAJOR-1** | Moving the paint to the covering child fixed the MECHANISM and **not the bug**. Measured: a black scrim drops the light list to ~#575859, where one neutral step reads at **6.2:1**; over the dark list it can barely darken what is already near-black, so the same step reads at **1.10:1**. Damir's words were "not prominent in DARK mode". A lifted chat row also had **no ring** — `chats-row-menu.js` never sets `[data-menu-target]`. → the row now takes the ring, the same 5.98:1 recipe #492 gave the lifted message. |
| **R2-MAJOR-2** | My own tab-tap flag clear **reproduced the original symptom**. `reloadShell` suppresses the overlay exit for ~5.5s, so inside that window a tab tap is answered WITHOUT closing the pane — and a locally-cleared flag left the rail claiming Chats over an Account that was still on screen. → the clear belongs to the authoritative close push only. |
| **R2-MINOR-1** | Dropping the wrapper's ground put a **translucent band of scrim through a lifted row**: `openChatRowMenu` closes an open swipe drawer BEFORE it lifts, and during that 200ms spring-back the wrapper is what shows between the action panels. |
| **R2-MINOR-6** | The tip-sheet title fix applied Damir's **name** rule to the whole **sentence**. de-de is `"{name} Trinkgeld geben"` — so the ellipsis ate the VERB on a money confirm sheet. → the name is its own span; the sentence wraps. |
| **R2-MINOR-3** | `armExitHeal` restores a wedged pane but never restored the flag — rail and screen would disagree for the rest of the session. |
| **R2-NIT-1** | The migration marked itself done BEFORE doing the work, and `setBool` swallows its own exception — a failed write would have left the preference stuck ON with nothing left to retry it. |

## ★★ Three of my own pins were green on the defects they name

Two of them were written specifically to stop round 1's MAJORs from recurring.

- `indexOf(call) < indexOf(anchor)` — deleting the call makes `indexOf` return **-1**,
  which is less than any real index. Green on the defect. **This exact trap appeared
  twice in one batch, in mirror directions.**
- A `removeItem` hunt in an 80-character look-BEHIND window — the `removeItem` lands
  *after* the identifier, so making the reader consume the key left the pin green.
- A "last writer" pin matched `setNavActive … showView … syncAccountRail` in sequence.
  That proves PROXIMITY. Appending a second `setNavActive` after the re-assert — the
  precise regression — left it green.

All three are rewritten to read the function BODY and assert the property. **19 mutations
run in total**, each turning its own pin red and nothing else.

## Stated residuals — not fixed, and why

- **A process kill with the Account pane open strands `spixi.pane.account`.** The next
  cold launch paints the rail on Account for one frame; it self-heals on the first tab tap
  or close push. Not time-bounded, because a pane can legitimately stay open for hours and
  any expiry short enough to catch a crash would kill a live pane. A heartbeat write was
  considered and rejected as the worse trade.
- **`clearPressFeedback` cannot be proven to be the mini-app rectangle's cause.** The
  module's own backstops (a 1.2s safety timer, a ~2s afterlife kill) bound any press state
  to ~2s, so this closes a real window but cannot explain a *persistent* rectangle. It
  ships as hygiene with an honest scope note; **a screenshot is owed** (#294).
- **`scrollbar-color` un-gated** may also disable overlay scrollbars in Blink. Practical
  exposure on WinUI is nil (Windows scrollbars are classic anyway). Worth a coarse-pointer
  check, not a guess.

## Numbers

bundle **296 exports** · shells **18** · smoke **3192 / the 3 KNOWN** (#136 · M5 · B3) ·
cs-syntax **144 + 1** · locales **ALL CLEAN, 770 keys** (two orphaned keys dropped by the
pipeline run the copy change required) · i18n-lint ✓ · pseudo 9/9 · Ixian-Core `097341a`
untouched.
