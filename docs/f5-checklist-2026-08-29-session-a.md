# F5 checklist — SESSION A: L1 · L2 · L8 (DECISIONS #642–#647)

> ⚠⚠ **READ THIS FIRST.** The first version of this batch was gated green at 3453 pins and
> was BADLY BROKEN. The #46 adversarial loop then found **seven MAJORs**, and the
> break-my-verdict pass over the fixes found **two more inside the repairs**. Nine in total.
> The worst one: contact-details **Pay and Request did nothing at all**, after deleting the
> native screens they replaced. Everything below is the FIXED build.
>
> The rows marked ★★★ are the ones that were broken and are now claimed fixed. Walk those
> first — they are where I have been wrong once already.


Three rows: the legacy Send/Receive screens (L1), the group delivery ticks (L2), the
chat-info slide-out (L8). Walk them in that order — L1 changes the money surface, so
it is the one to stop on if something is wrong.

## ⚠ THE BASELINE MOVED. Three numbers are different on purpose.

| Gate | Was | Now | Why |
|---|---|---|---|
| cs-syntax | 143 + 1 | **140 + 1** | three C# pages were DELETED (L1 part B) |
| locales | CLEAN **772** | CLEAN **774** | two copy keys for the read detail |
| smoke | BASELINE OK 3402 | **BASELINE OK 3474** | 72 new pins (22 from the loop) |
| bundle | 299 | **299** | unchanged |
| shells | 18 | **18** | unchanged |
| Ixian-Core | `097341a` | `097341a` | untouched, as required |

## Build and deploy

The generators already ran in the delivery. Re-running them is idempotent and only
confirms the numbers. `generate-chat-pattern` is NOT needed — nothing pattern-related
changed.

```
node scripts/build-demo-bundle.mjs
```

```
node scripts/build-shells.mjs
```

```
node scripts/verify-locales.mjs
```

```
node scripts/cs-syntax-check.mjs
```

```
node scripts/smoke-test.mjs
```

★★ **SEVEN C# files changed and THREE C# pages were DELETED, so the wipe is NOT
optional (#387).** A stale `obj` keeps a deleted page's generated XAML and the build
fails in a way that looks like my mistake.

```powershell
Remove-Item -Recurse -Force Spixi\obj, Spixi\bin -ErrorAction SilentlyContinue
```

★★ **AND THE BRIDGE CANNOT DELETE.** The nine dead files were moved to `_to_delete/`.
Remove that folder yourself before you build, or they stay in the tree:

```powershell
Remove-Item -Recurse -Force _to_delete
```

---

# L1 · the legacy Send and Receive screens

★ This is the row you named. Everything here is on the money surface.

| # | Do | Expect |
|---|---|---|
| ★★★ 1.1 | Open a 1:1 contact from the contacts directory. Tap **Send**. | The compose opens **inside the page**, with the contact already locked in as the recipient. **NOT** the old Send screen. |
| 1.2 | Enter an amount. | A fee appears only after the quote lands. No invented fee. |
| 1.3 | Tap Send, then confirm on the NATIVE dialog. | The tx goes out and the compose morphs to success. |
| 1.4 | Repeat 1.3 but CANCEL the native dialog. | The compose re-enables silently. No error copy. |
| ★★★ 1.5 | Tap **Request**. | The amount sheet opens in the page. Enter an amount → the request card lands in the conversation. |
| 1.6 | With the compose open, press **hardware back**. | The compose closes. The page stays. ⚠ If the whole page pops, stop — that is the cover not being reported to C#. |
| 1.7 | Open the same contact from a **chat header** (Chat info). Tap Send. | Same in-page compose. |
| 1.8 | Open a **GROUP** info. | No Send and no Request. Groups never had them. |
| 1.9 | Wallet tab → **Send**. | Unchanged: the wallet compose you already have. |
| 1.10 | Wallet tab → **Receive**. | Unchanged: the Receive takeover. |
| 1.11 | Wallet zero state → **Show my address**. | The address sheet. |
| 1.12 | In a 1:1 chat, composer ⊕ → **Pay**, then ⊕ → **Request**. | Both open the in-chat compose, exactly as before. |
| 1.13 | Apps → an app that asks for a recipient. | The recipient PICKER still opens. ⚠ `WalletRecipientPage` STAYS — if this is broken, I deleted one page too many. |

★ **The one thing that can be wrong and look right:** the Request sheet. It needs two
stylesheets the first cut missed. If the amount sheet opens **unstyled** — naked text,
no chips — say so; the gate caught this once already and it can regress.

---

# L2 · the group delivery ticks

⚠ **PRIVATE GROUPS ONLY.** The bot room already worked and this row does not touch it.
Row 2.7 exists to prove I did not break it.

| # | Do | Expect |
|---|---|---|
| 2.1 | In a **private group** with a member who is offline or gone, send a message. | A **clock**, until a member confirms. ⚠ #649: the single check was REMOVED — Damir ruled it a lie, and there is no truthful trigger for it with Core frozen (CORE-3). The clock is honest: the message is on your device. |
| ★★★ 2.2 | Wait for one other member to receive it. | **Double check.** ★ THIS IS THE ACTUAL DEFECT YOU REPORTED — it no longer waits for everybody, so one absent member cannot hold the clock for the room. |
| 2.3 | Have every member read it. | Still a **plain double check**. **NEVER a green one.** |
| ★★★ 2.4 | **Long-press** your own message in that group. | The menu shows one quiet line above the actions: *"2 of 3 delivered · 1 read"*. |
| 2.5 | Long-press a message someone ELSE sent. | No delivery line. |
| 2.6 | Long-press your own message in a **1:1** chat. | No delivery line. The bubble already says everything. |
| ★★★ 2.7 | Send in a **BOT room**. | Clock → double check, and **never green**. Exactly as before this batch. ⚠ If a bot room changed at all, that is a regression. |
| 2.8 | Send a **file** in a private group. | Its card advances to the double check the same way. |
| 2.9 | Open the group again after a restart. | The ticks are still where they were. They persist. |
| 2.10 | Turn the phone offline and send in a private group. | A **clock**, and it stays. ✅ This is the row you ruled on — the false single check is gone (#649). ⚠ **The RED expiry half is NOT walkable.** `CoreConfig.messageExpirationSeconds = 86400 * 5` — five days, on NETWORK time, so the phone clock cannot move it. I wrote the original row without checking the number. The code is real (`markGroupCopyFailed`, #647) but only a temporary debug-only override can demonstrate it. Mark the red half n/a. |
| ★★★ 2.11 | 3-member group. Send. Have ONE member read it. | Bubble: plain double check. **Chats list row: also a double check.** ⚠ The first fix left the list on a single check — same defect, one field over. |
| ★★★ 2.12 | The same message, in the chats list, after it fails. | The list shows the failed state too. It had no failed state at all before this round. |

🟡 **Your dial, still open:** counts vs a member list inside the menu. Counts are built.
A list is a later row.

---

# L8 · the chat-info slide-out

| # | Do | Expect |
|---|---|---|
| 3.1 | Open a chat → tap the header → chat info slides in. Tap **Back**. | It slides **out** to the right. Same speed as it came in. |
| 3.2 | Same, but close with **hardware back**. | Also slides. This one never did before. |
| 3.3 | Open chat info, then switch tabs. | It closes **instantly**. A tab switch is not a back gesture. |
| 3.4 | On a wide window with the info as a PANE. | It closes instantly. A pinned column must not slide across its neighbour. |
| ★★★ 3.5 | Press back TWICE FAST during the slide. | The chat stays open and **the app does NOT exit**. ⚠ In the first build the second press backgrounded the app while the panel was still visibly sliding. |
| ★★★ 3.7 | Open and close chat info ten times, then press back on the chats list. | Back still works normally. ⚠ The swallow that fixes 3.5 is a latch; it is time-bounded to 1 s so it cannot wedge, and this row is the check that it doesn't. |
| 3.8 | On **Windows**, close chat info. | It flips instantly — no slide. ⚠ **Deliberate**, and a 🟡 dial for you: the slide-IN does run on Windows, so entry and exit disagree there. I excluded WinUI because this file records a WebView2 repaint hazard and I cannot test Windows from here. Say the word and it goes on. |
| 3.6 | iOS: close any other pushed screen with back. | Unchanged — #326 keeps its own timing. |

---

## 🟡 One known residual, your dial

The roster pre-pull that makes row 2.4 work excludes **bot rooms by TYPE**. The 500-member
cap that made that exclusion necessary is a property of the roster class, which a private
group uses too — so a very large private group pays the same cost at chat open that it
already pays when you open Group info. The precise fix is to gate on the member count
rather than the room type, which needs the count pushed to the shell. Not built at the end
of a long session; logged with the mechanism in #647.

## What I could not test, and you can

* 1.3 and 1.5 need real funds and a real peer.
* 2.1–2.4 need a private group with at least three members, one of them absent.
* 2.7 needs the bot room.
* 3.6 needs the iPhone.

## Report back

Row number, what you saw, and the two adjectives if something looks wrong. The last
walk found three real defects on a green suite, and two of the three were named by
adjectives rather than by steps.
