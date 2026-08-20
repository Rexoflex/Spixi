# F5 checklist — the overnight batch (#441–#447)

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.** See `CLAUDE.md`.

Batch: reply-to (dark) · the pre-auth lock exposure · the banked bugs · the wallet round ·
the blockchain-scan strip · the translation round.

★ **This batch changed C# in six files. Ixian-Core is UNTOUCHED (#448)** — it goes to the
BE cutover. Wipe `Spixi\obj` and `Spixi\bin` before you build (#387). An incremental build
does NOT repackage `Resources/Raw/html`, and this batch adds a C#-pushed bare global
(`setScanProgress`) that runs at 1 Hz — a stale package means a ReferenceError every second
on the home shell.

---

## 0. Build, one step at a time

Run each line on its own and check the number before the next one.

```
node scripts\extract-strings.mjs
```

| Expect | Value |
|---|---|
| keys | 726 |
| fallback conflicts | 0 |

```
node scripts\build-locales.mjs
```

| Expect | Value |
|---|---|
| english-fallback, de-de | 9 |
| english-fallback, sl-si | 2 |
| english-fallback, it-it / id-id / lt-lt / cn-cn / ja-jp | 1 |

Every remaining fallback is a genuine loanword or the empty `handshakeReady` default.

```
node scripts\build-strings-iife.mjs
```

```
node scripts\build-demo-bundle.mjs
```

| Expect | Value |
|---|---|
| exports | 270 |
| bytes | about 953 200 |

```
node scripts\build-shells.mjs
```

| Expect | Value |
|---|---|
| shells written | 18 |

```
node scripts\i18n-lint.mjs
node scripts\pseudo-locale-smoke.mjs
node scripts\smoke-test.mjs
```

| Expect | Value |
|---|---|
| i18n-lint | clean, 1 dev-only exemption |
| pseudo-locale-smoke | 9/9 |
| smoke | BASELINE OK, 2212 pass, the same 4 known pre-existers |

**Discriminator.** A stale build and a real bug look the same. If smoke reports fewer than
2212 passes, the build did not pick the batch up. If it reports a FAILED block, that is a
real bug — send me the block.

Then wipe. ⚠ **PowerShell, not CMD** — `rmdir /s /q` is CMD syntax and does nothing here:

```
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue Spixi\obj
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue Spixi\bin
```

Nothing is printed. The wipe is not optional — six C# files changed, so #387 applies, and
it is also the whole test for **#449** in §5b.

Build. This is a full restore after the wipe, so allow a few minutes:

```
dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release
```

| Expect | Value |
|---|---|
| final line | `Build succeeded` |
| errors | 0 |
| warnings | about 1800 — the normal baseline, mostly CA2022 out of Ixian-Core |

★ **CHECK THE PHONE IS VISIBLE BEFORE THE RUN STEP.** `-t:Run` fails with
`XA0010: No available device` at the very END of a build, after all the waiting. ⚠ Note the
leading `&` — a quoted path at the start of a PowerShell line needs the call operator or
the arguments are read as a broken expression:

```
$adb = "C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe"
& $adb kill-server
& $adb start-server
& $adb devices
```

| Line ending | Meaning | Fix |
|---|---|---|
| `device` | ready | go to the run step |
| `unauthorized` | the RSA prompt is waiting on the phone | unlock, tap **Allow**, tick *Always allow from this computer* |
| `offline` | stale handshake | unplug, replug, re-run the block |
| nothing listed | USB mode or cable | shade → USB notification → **File Transfer / MTP**. Charging-only hides adb entirely. Also re-check Developer options → USB debugging; a system update can reset it |

Deploy and launch. Separate command on purpose — after a wipe, `-t:Run` alone fails
(#320):

```
dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -t:Run
```

---

## 1. ★ THE LOCK EXPOSURE (#442) — the headline. Android, app lock ON.

| | Test | Pass |
|---|---|---|
| 1.1 | Turn the app lock ON. Open the chats list. Background the app. Wait 10 s. Return. | The chat list is NEVER visible. Dark, then the lock. |
| 1.2 | Same, but background from an OPEN CONVERSATION. | The conversation is never visible. |
| 1.3 | Same, but background from the Wallet tab. | The balance is never visible. |
| 1.4 | Same, but background from the Account pane / Backup / Downloads. | Nothing readable before the lock. |
| 1.5 | Open the task switcher while Spixi is backgrounded and the lock is on. | The Spixi thumbnail is dark, not your chat list. |
| 1.6 | Unlock. | The app appears immediately. No dark screen left over. |
| 1.7 | Background WHILE the lock screen is showing. Return. Unlock. | No opaque screen after the unlock, and the password field is never covered. |
| 1.8 | Lock OFF. Background and return several times. | No dark flash at all. |
| 1.9 | Background for LESS than 5 s and return, lock ON. | No lock (the cooldown). ⚠ You WILL see the dark cover briefly — that is the dial in #442, tell me if you want it traded back. |
| 1.10 | ★ **THE DISCRIMINATOR.** Force-stop the app. Launch it COLD. | If the chat list flashes HERE too, the cold path is implicated and `MainPage` assignment is not doing what the code says — a different bug. Tell me. |

## 2. REPLY-TO (#441/#448) — NOT TESTABLE THIS ROUND. Two minutes, not twenty.

★ **The carrier is held out** for the BE cutover, so there is nothing to send. The FE is
built and the capability is declared nowhere. **Do not add `,reply` to `setCaps`** — with
no carrier that renders a Reply action which silently drops the quote.

What this section is now is a REGRESSION test: prove that holding Core out left ordinary
messaging exactly where it was.

| | Test | Pass |
|---|---|---|
| 2.1 | Long-press a message. | There is NO Reply item. |
| 2.2 | Send and receive in a 1:1 chat. | Arrives. One tick, then two. |
| 2.3 | Send and receive in a GROUP, and in a bot room. | Arrives. |
| 2.4 | Send a message to a PAID bot. | Charged as before; the wallet glyph appears. |
| 2.5 | Send a long message and one with emoji / CJK. | Arrives intact. |
| 2.6 | Force-quit, reopen the chat. | History intact, nothing malformed. |

★ **When the carrier lands**, the 2-device plan is unchanged and lives in
`docs/be-cutover-ixian-core-reply-carrier.md`. The order is: land the Core patch, restore
the two seams marked `★ THE SEAM` in `SingleChatPage.xaml.cs`, add `,reply` to `setCaps`,
rebuild BOTH devices, then run (a) B renders A's reply · (b) B force-quits and reopens ·
★ **(c) A reopens its OWN sent reply — SENDER persistence, which is exactly how C8 died on
hardware (#215)** · (d) an OLD build receives a reply · (e) a reply in a group · (f) a reply
to a deleted message.

## 3. The banked bugs (#443) — one device

| | Test | Pass |
|---|---|---|
| 3.1 | Add contact. Type a good address you do NOT have. | Green tick, Send enabled. |
| 3.2 | Type an address you ALREADY have. | A line naming the contact, a **View contact** button, NO green tick, NO red error, Send disabled. |
| 3.3 | Tap **View contact**. | The contact opens. On a wide window it lands in the same column the form used. |
| 3.4 | Type your OWN address. | "This is your own address." No View button. |
| 3.5 | Edit the field after 3.2. | The panel clears, Send comes back. |
| 3.6 | ★ 2 devices: B sends A a request. **A accepts from the chats-list card.** | The chat shows "You are now connected with …" as a centred chip. ⚠ A's chat row must NOT gain an unread badge and no notification appears. |
| 3.7 | Same, but A accepts from INSIDE the chat. | The same chip, once, not twice. |
| 3.8 | Look at an OLD chat that already has the old "has accepted your contact request" line. | Still a centred chip, not a plain bubble. |
| 3.9 | Chats: scroll the list down. | The search bar and the chips do NOT tuck away. |
| 3.10 | Apps with NOTHING installed. | The search row IS there. It does not appear-then-vanish. |
| 3.11 | Wallet: scroll the transaction list down. | Search and filters stay. The hero still collapses. |
| 3.12 | Account: a **Contacts** row under Preferences. Tap it. | You land on Chats with the contacts directory open. |
| 3.13 | Account: the ⓘ beside the address. | A sheet on the phone, a dialog on desktop. ⚠ **The copy is a draft — read it and tell me what to change.** |

## 4. The wallet round (#443)

| | Test | Pass |
|---|---|---|
| 4.1 | Wallet, tap a transaction (phone). | The sheet shows who, how much and the status at a glance. Address / date / fee / id are behind **See details**. |
| 4.2 | Tap **See details**. | It expands below, the chevron turns, the label becomes **Hide details**. |
| 4.3 | ★ Tap **View transaction on Explorer**. | The browser opens **that transaction**, not your address. |
| 4.4 | The transaction detail PAGE (desktop, or the pushed page). | Address / fee / id are shown OPEN — no disclosure there. |
| 4.5 | Hide the balance (the eye), then open a transaction. | Amounts masked. "Show amounts" reveals this view only. |
| 4.6 | "Missing a transaction?" → the sheet. | It now says something concrete about the scan. **View all transactions on Explorer** still opens your ADDRESS. |

## 5. ★ THE BLOCKCHAIN-SCAN STRIP (#444)

This only shows when the client is genuinely behind — more than 20 blocks.

| | Test | Pass |
|---|---|---|
| 5.1 | Open Wallet on a device that has been running and is current. | **NOTHING.** No strip at all. Not a bar at 100%, not "0%". |
| 5.2 | Turn the network off, force-stop, relaunch, open Wallet. | "Looking for your transactions" with a moving indeterminate bar and NO percentage. |
| 5.3 | Turn the network on. | It either disappears (you were current) or shows a stepping percentage. It steps — that is real, headers arrive 250 at a time. |
| 5.4 | Restore an account, or leave the app off for a few hours, then open Wallet. | A percentage that climbs from a low number and the strip disappears when it finishes. |
| 5.5 | Watch the wallet screen for two minutes on a current client. | The strip never blinks in and out. |
| 5.6 | Look at it beside the balance. | ⚠ **Art call: does it belong?** It is meant to read as a quiet status strip, not a second hero. Tell me if it competes. |
| 5.7 | Read the copy. | ⚠ **Copy call.** It deliberately avoids "syncing the blockchain" — the app walks block HEADERS looking for YOUR transactions. Sign it off or rewrite it. |

## 5b. 🔴 THE "Sent to <full address>" HEADER (#449) — ONE MINUTE, and do it FIRST

You reported this from the device. **I could not reproduce it from source**, so this is a
measurement, not a fix. Both surfaces that can draw that header already truncate, and the
tx detail page has done so since **#276**, which closed this exact complaint.

⚠ Do it on the CLEAN build from §0 — the wipe is the whole point of the test.

| | Test | What it means |
|---|---|---|
| 5b.1 | Open Wallet. Look at the transaction ROW in the list, before you tap it. | It should read `4JsLSm…bncdFa`. If the row is truncated and the header is not, it is the detail surface alone. |
| 5b.2 | Tap it. Read the header. | Truncated → it was a STALE `Resources/Raw/html` package (#320), and the row closes. |
| 5b.3 | Still the full address after a clean wipe and rebuild? | Then C# is pushing a `username` that is not base58-clean — a trailing space, a checksum suffix, a non-base58 character. Send me a screenshot and I will fix it at the C# push, not at either regex. |

## 6. Languages

| | Test | Pass |
|---|---|---|
| 6.1 | Account → Language → Deutsch. Walk chats, wallet, account, add-contact. | Everything translated, including the new strings. |
| 6.2 | The connected chip in German. | "Du bist jetzt mit … verbunden." |
| 6.3 | Wallet → a transaction → the explorer button in German. | "Transaktion im Explorer anzeigen". |

---

## What I could not verify

1. **No device.** Everything above is source-verified, executed in jsdom or reasoned from
   the C# — nothing was seen on a phone.
2. **iOS and Windows** remain untested, as for six batches.
3. **Whether an `OnSleep` view reaches the Android task-switcher snapshot.** The canonical
   mechanism is `FLAG_SECURE`, which also blocks screenshots and is not used. §1.5 is that
   test.
4. **Reply-to end to end.** Not testable until the cutover — see §2.
5. **That the C# compiles.** There is no .NET toolchain in the cloud container — it was
   verified by reading and by brace/paren balance against HEAD, never by a build. Smaller
   than it was: six files in one repo, against an unchanged Core.
