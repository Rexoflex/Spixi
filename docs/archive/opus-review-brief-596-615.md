# Opus #46 work order — the review of #596–#615

**Run this in a FRESH session. The builder does not review his own work.**
Batch built 2026-08-27/28 in a cloud container against `07efd414`. Read
`docs/handoff-2026-08-28.md` first, then `docs/f5-verdict-2026-08-27-ios.md` for what the
batch was answering.

## Protocol

3 disjoint read-only auditors → fix agents with explicit cross-file contracts → a FRESH
**break-my-verdict** reviewer over the highest-risk CLEANs → loop until clean. Verdict
appended to THIS file, with the batch in the filename.

## Non-negotiables — do not re-litigate these

* ★ **#221 chat isolation.** Nothing in this batch composes chat into a shared context.
  Verify it, do not assume it: #606 appends a cloned chat ROW into the home shell's own
  document (not chat's), and #608 widens a C# keyboard observer's allow-list.
* **The frozen bridge.** One new verb, `ixian:launchoverlay:<0|1>` — see the handover-gate
  row. No other verb was added or changed in shape.
* **Ixian-Core is frozen at `097341a`.** Nothing here touches it.
* **The four decided design dials** (cover removed · ring removed · sender-name mobile-only
  · address sheet hugs) are Damir's, taken on 2026-08-27. Audit the *implementation*.

## Auditor scopes (disjoint)

**A — the money path and the keyboard.** `money.js` (#607), `amount-keyboard.js` (#609),
`tip-sheet.js/.css` (#610), `wallet-send.js`, `overlay.css` + the two shell publishers +
`SpixiContentPage` (#608), `launch-shell.css` (#615).
★ Start at **#607**: it is a silent wrong-amount fix on the money path. Attack the caret
rule with sequences the pin does not drive — paste into a non-empty field, a separator
typed mid-string, two separators, a locale whose group and decimal are both '.', an IME
composition. Assert the PARSED VALUE, never the field text.
★ Then **#608's blast radius**: `.c-sheet` on mobile gained `bottom`, `max-height` and
`overflow-y`. Every sheet in the app is affected. Find one where the new cap or the new
scroll container changes something at `--kb-inset: 0`.

**B — the C# reach.** `Utils.hidesParticipants` and its five call sites (#613),
`HomePage.updateScreen` (#612), `VoIPManager` (#611), `LaunchPage` (#614),
`SNotificationPrefs`/`App` (#597 deletion), the keyboard allow-list (#608).
★ **#613 is the one to break.** Enumerate every remaining raw read of
`hideParticipantAddresses` and decide, per site, whether leaving it raw is right. The
money-path exclusion is deliberate — argue with it. And check the inverse: is a blind
private GROUP still fully masked, on every surface, after this change?
★ **#612**: the deep link is now retried for up to 10 ticks. Find a state where that
retries into something worse than dropping it — a wiped account, a deleted contact, a
second push arriving mid-wait, the lock closing between two ticks.

**C — the shells, the CSS cascade and the pins.** `chats-row-menu.js` + `message-menu.css`
+ `tokens.css` (#605/#606), `chat-info.js/.css` (#596), `wallet-receive.css` (#598/#599),
`contacts-shell.css` (#600), `settings.html` (#601), `chatlist-item` + `home.html` (#602),
the tip ladder in `chat.html` (#603), `pressable.js` (#604), and **every pin added or
rewritten in this batch**.
★ **#606's ghost**: it clones a live DOM subtree into `sheet.parentNode`. Look for what a
clone breaks — duplicate `id`s are handled, but check `aria` references, the timestamp
ticker, `data-*` the shell queries globally, images re-decoding, and what happens if the
list re-renders or the window resizes while a ghost is up.
★ **The pins.** 17 of 17 mutations were caught, but mutation only proves the pin fails
when the fix is removed — not that it passes for the right reason. Two were vacuous on
first write (one compared a token with itself; one matched its own rationale comment).
Assume there is a third.

## ⚠ A round of adversarial audit ALREADY RAN — read DECISIONS #616 first

Two independent auditors were pointed at this batch before it left the machine and found
three defects (one MAJOR, two HIGH) plus six MEDIUMs, all fixed in the tree. **That was
two auditors, not this protocol, and the builder adjudicated his own findings** — which is
exactly the reason this loop still runs. Do not spend your first hour re-deriving what
#616 already records; spend it on what round 1 did NOT look at, and on whether round 1's
fixes are themselves right. The three highest-value re-checks:

* **the `hidesAddresses` / `blind` split** (`src/shells/chat.html`). One wire value, two
  named meanings. Find a third consumer of either that is now reading the wrong one.
* **`#612`'s new state machine.** It gained a pending-address key, an unblocked-only
  counter, and a fall-through. Three interacting pieces written in one pass.
* **`#606`'s `repaintRowGhost`.** It removes and re-creates a ghost from inside a render
  loop. Look for re-entrancy, and for the case where the re-render happens while the menu
  is CLOSING.

## Known-and-accepted — do not report as findings

* **#604 and #606 are UNVERIFIED on hardware** and say so in their own comments and rows.
* The **message** ring (`[data-menu-target]`) is deliberately kept — flagged for Damir.
* The **tip refusal** in a flagged bot room deliberately still reads the raw flag (#215).
* **C2** and the **local-notification tap** are BE rows, written up, out of scope.
* The **bot-group freeze** and **swipe-back** are specced, not built, on purpose.

## The one question the reviewer should answer that nobody asked

★ #613 removes a mask. The handover-gate row argues it is the *removal of a divergence we
introduced*, because the baseline shows a bot room's addresses. **Check that argument
against the fork point yourself** (`git show 0e85a4b8:Spixi/Pages/Chat/SingleChatPage.xaml.cs`)
rather than taking the row's word for it. If the argument does not hold, this is the one
change in the batch that should not ship.
