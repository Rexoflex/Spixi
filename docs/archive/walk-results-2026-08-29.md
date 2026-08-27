# F5 walk results — 2026-08-29 build (#624–#637)

Damir, Android + Windows, same evening the batch landed. **37 pass**, 3 fail, 2 n/a,
4 dials, plus one MAJOR he found outside the sheet.

## Fails

| row | what | verdict |
|---|---|---|
| **6.2** | A private group still offered **Remove from group / Ban from group** | ★ MY MISS — fixed, see below |
| **7.3** | The mini-app tile ghost | ★ MY FIX WAS AIMED AT THE WRONG MECHANISM — fixed, see below |
| **7.4** | A genuine new tap after it | same cause as 7.3 |

## ★★ 6.2 — TWO MEMBER SHEETS, AND I GATED THE WRONG ONE

*"its still present when clicking/tapping on a member in conversation … If you open chat
info — then the member sheet doesn't have the actions."*

He is precise, and he is right. There are **two** surfaces that offer Kick/Ban:

| surface | file | gated by option A? |
|---|---|---|
| Group info → member row → sheet | `chat-info.js:671` | ✅ yes — `capabilities.admin && kind === 'bot'` |
| **In-chat, tap a sender** | `chat.html openMember:2429` | ❌ NO — `mode.admin` alone |

The second is the one a user actually reaches, and it emitted `ixian:kick` / `ixian:ban`
with no room-kind test at all.

⚠ **This is V-8's pattern, repeated by me on the day I pinned its lesson**: *"#616 fixed
the twin surface, which #249 records as unreachable, and left the live one."* Fixed with
`mode.admin && mode.isBot`, and **both gates are now asserted in ONE pin**, because the
whole finding is that they drift apart.

## ★★ 7.3 / 7.4 — V-15 FIXED A REAL DEFECT, BUT NOT THE ONE HE REPORTED

*"it lights up native sharp rectangle blue tint which residues still over the contacts,
so not handled."*

**Sharp rectangle** and **blue** are the tell: that is Android's own tap highlight, not
`pressable.js`'s rounded, animated fill. V-15's refuter reproduced a *pressable.js* ghost
in jsdom, I reproduced it too — before and after, on the shipped bundle — and I shipped a
fix for it. That defect was real. **It was not this one.**

The cause: `.c-app-item__open` — the actual tap target for opening a mini-app — carries
**no** `-webkit-tap-highlight-color`. Its two 40px siblings `__menu` and `__info` do. So
the platform paints a square wash over the tile, and it survives the navigation, which is
the "residues still over the contacts" half.

★ **This is the THIRD instance in one batch** — V-14 (#618's chat-info row), V-16 (the
explore banner), and now this. Three whack-a-mole misses is the signal that the
per-component list is the wrong shape, so the kill moved to the **body**:

```css
:root:not([data-desktop]) body { -webkit-tap-highlight-color: transparent; }
```

`-webkit-tap-highlight-color` INHERITS, so one declaration reaches every descendant, and a
new control can no longer forget it. This is the move `#322` already made **in the same
block, for user-select, with the same reasoning**. Desktop is untouched.
⚠ V-15's pressable.js change STAYS — it fixes a real ghost, it is pinned behaviourally,
and it is orthogonal to this.

## ★★ THE MAJOR HE FOUND OUTSIDE THE SHEET — legacy money screens are still reachable

*"When on chat info or contact details, and pressing SEND or RECEIVE it fires the LEGACY
SEND and RECEIVE SCREENS. Nothing legacy was supposed to exist in this app anymore."*

Confirmed at source. `contact_details.html:453-454`:

```javascript
onPay: () => bridge.send('ixian:send'),
onRequest: () => bridge.send('ixian:request'),
```

→ `ContactDetails.xaml.cs:392-399`:

```csharp
else if (current_url.Equals("ixian:request", …)) hostNav.PushAsync(new WalletReceivePage(friend), …);
else if (current_url.Equals("ixian:send", …))    hostNav.PushAsync(new WalletSendPage(…), …);
```

**The redesigned answer already exists and is proven** — `chat.html` does the same job with
no native page at all (`:2769-2770`):

```javascript
if (id === 'pay')     { if (bridge.cap('composeSend'))    openSendTakeover();  else bridge.send('ixian:send'); }
if (id === 'request') { if (bridge.cap('composeRequest')) openRequestForPeer(); else bridge.send('ixian:request'); }
```

`openSendTakeover` mounts `createWalletSend({ lockedRecipient })` IN THE SHELL and emits
`ixian:signSend:<addr>:<amount>` → `SPayments.handleSignSend` → the native confirm → sign.
`openRequestForPeer` opens the amount sheet and emits `ixian:sendrequest:<addr>:<amount>`.

### The inventory — what is actually reachable

★ **`contact_details` is the ONLY live route into the legacy money pages.** Everything else
is either an old-exe fallback the shipped shell never takes, or has no emitter at all:

| site | reachable? |
|---|---|
| `contact_details.html:453-454` → `ContactDetails:392-399` | ★ **YES — the defect** |
| `SingleChatPage:486,503` | no — the `composeSend`/`composeRequest` caps are always declared (`:909`) |
| `HomePage.onSendIxi/onReceiveIxi` ← `ixian:sendixi`/`ixian:receiveixi` | no — **no shell emits either verb** |
| `HomePage.onSend/onReceive` | no — XAML event handlers with no live binding |
| `WalletRecipientPage` ← `AppDetailsPage:346`, `HomePage:1486` | ★ **YES — keep this one** |

### The fix, in two parts

**A · the defect.** Give `contact_details` the takeover chat.html already has:
· destructure `createWalletSend`, `openRequestSheet`, `setSendQuote`, `setSendError`;
· link `wallet-send.css` + `contact-row.css` (the W-h gate will catch a miss);
· port `openSendTakeover` / `openRequestForPeer` and the `signSendResult` / `setSendQuote`
  / result handlers;
· in `ContactDetails.xaml.cs`: route `ixian:signSend` → `SPayments.handleSignSend`,
  `ixian:feeQuery` → `SPayments.handleFeeQuery`, `ixian:sendrequest` → the same handler
  SingleChatPage uses, and declare `setCaps("composeSend,composeRequest")`;
· DELETE the `ixian:send` / `ixian:request` branches and their two pushes.

**B · decision 4, properly.** Once nothing reaches them, delete `WalletSendPage`,
`WalletReceivePage` and their HTML, the same treatment `WalletContactRequestPage` got in
#635 — including the `hasLegacyPageChrome` / `pageSurfaceColorFor` case labels and the
`.csproj` entries. ⚠ **`WalletRecipientPage` STAYS** — `AppDetailsPage` and `HomePage`
still push it, so it is not dead.

## Notes on rows that PASSED

* **3.2** *"PRETTY much the same, if we can speed it up it's always welcome."* → the
  bot-room present-first work in `docs/cdperf-2026-08-29-android.md` is exactly that.
* **4.7** *"theres no confirmation dialog here, do we need it is the question. for now its
  ok."* → a group row's Delete goes straight through. 🟡 Open question, logged, not built.
* **5.4 n/a** *"you cant send it to a group, groups have no addresses."* ★ So the
  `mode.type !== 0` arm of `canSheet` guards a state that cannot occur from our own UI.
  It stays — a `requestFunds` CAN still arrive over the wire (StreamProcessor has no group
  gate) — but the row was written from a premise the app does not allow.
* **5.5** *"its a pass, but canceled card disappears on both devices on the redesign and
  legacy."* ★ This REFINES queue item 15: the CARD is fine on both ends. What is left of
  that row is the chats-list excerpt, not the card.
* **6.1 n/a** *"i dont have admin rights with these test accounts, will test another
  time."* ⚠ **The bot-room half of option A is UNVERIFIED.** That is the half he asked me
  to protect, and a mistake there takes a working feature away. It needs a real admin
  account before this batch is called done.

## Dials

| | |
|---|---|
| 8.1 crossfade | **Keep** — *"add a slide out please as well, when closing"* → D1 |
| 8.2 explore banner | **Keep** |
| 8.3 foreign-convention paste | **Keep** — *"not sure what you mean by this"* → explained below; the answer stands until he says otherwise |
| 8.4 tip dialog | (no note) |

### 8.3 explained, because the row did not explain itself

`#625` is about pasting an amount written in the **other** number convention. Before it:
`1,234.56` pasted in a German app became **1.23456**, and `1.234,56` pasted in an English
app became **1.23456** — both a thousandfold UNDER, in neither convention. Now each is read
as **1234.56**. Nothing ambiguous moved: `1,500` still reads 1.5 in German and 1500 in
English, and `12,5` still reads 12.5 everywhere. It only fires on a string that cannot be
read locally at all.
