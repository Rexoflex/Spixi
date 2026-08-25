# F5 findings — the walk-day fix batch (Damir, 2026-08-25/26)

Result: **33 pass · 1 fail · 2 n/a** of 36, plus 3 new bugs and 9 pass-with-note
findings. Below, every item carries a MECHANISM or an explicit "not yet known" (#294).

★ **UPDATE 2026-08-26, same day: SIX of these are now BUILT** — see DECISIONS #587/#588
and the ✅ marks below. One adversarial round over those six found **two MAJORs inside my
own fixes**, both corrected. The rest of this document is still the queue. This doc exists so the next session does not
re-derive what the logs already settle.

---

## ✅ ★★ #565 ② — SOLVED **and FIXED** (#584). One-shot latch in core.

**The capture did its job.** `565.txt`, the second restore in one process:

```
11:21:27.2407  LaunchPage verb: ixian:restore:
11:21:27.3859  Pre-Starting node
11:21:27.4480  [RESTOREDIAG] loadChats run 2: friends=0 accFiles=15
```

**`friends=0 accFiles=15`** — the restored Acc tree is on disk with 15 files and
the in-memory list is empty. That is the middle branch the capture was built to
separate: the restore landed the tree, and nothing read it back.

**Why.** `FriendList.loadContacts()` is guarded by `FriendList.contactsLoaded`
(Ixian-Core `FriendList.cs:583-587`) — a **process-lifetime one-shot latch**:

```csharp
public static void loadContacts()
{
    if (contactsLoaded) { return; }
    contactsLoaded = true;
    lock (friends) { friends.Clear(); … }
}
```

`contactsLoaded` is cleared in exactly one place — `FriendList.init()`
(`FriendList.cs:42`), which runs once per process at node construction. And
`Node.preStart()` (`Node.cs:142-155`) is the **only** caller of `loadContacts()`.

So the Acc tree is read into memory **once per process launch**. Every later
account load in the same process — wipe → restore, restore → back to welcome →
restore, restore → lock-cancel → restore — calls `preStart()` again,
`loadContacts()` returns immediately, and `FriendList.friends` keeps whatever it
held. After a wipe that is empty, and it stays empty until the app restarts.

★ This also retires the original framing. It was never "the 3rd restart"; it is
"the first restore in a process that had not already latched". Damir's own note
is the same sentence from the other side: *"if I wipe an account and restart the
app and then restore, the contacts are populated."*

**The fix is OURS, not a BE row.** `contactsLoaded` is a **public static field**,
so Spixi can reset it on the restore/create path before `preStart()`:
`FriendList.contactsLoaded = false;`. No core change, no §1e row.

⚠ Verify-first for the next session: resetting the latch makes `loadContacts()`
run `friends.Clear()` again. Confirm no live Friend reference is held across that
call on the restore path before shipping it.

---

## ✅ ★★ BIG-1 — Create-after-wipe walks back INTO the dead account **— FIXED (#585)**

Damir: delete account → welcome → Create → OS back once (nothing) → back again →
**the app opens, connecting forever, with no account.** Restart returns to welcome.

**Mechanism, from our own source.** `SettingsPage.goToWelcome()`:

```csharp
popToRootAsync();
SpixiContentPage.disposeParkedOverlay();
hostNav.PushAsync(new LaunchPage(), …);
// Todo: also remove the parent page without causing memory leaks
```

The wipe pops to root — which is **HomePage** — and PUSHES LaunchPage on top of
it. HomePage is never removed; the TODO in that line says so.

`LaunchPage.OnBackButtonPressed` consumes back only for `create`/`restore`:

```csharp
if (currentView == "create" || currentView == "restore") { switchView("welcome"); return true; }
return base.OnBackButtonPressed();
```

So the first press leaves the create view (Damir reads that as "nothing
happened"); the second press falls through to base, pops LaunchPage, and reveals
the **still-live HomePage of the account that was just deleted**.

The log confirms it to the millisecond (`wipecreateback2x.txt`):

```
11:13:16.8503  LaunchPage back: view=create
11:13:18.7477  LaunchPage back: view=welcome
11:13:18.7582  [RESTOREDIAG] loadChats run 3: friends=0 accFiles=0
```

HomePage's `loadChats` runs 10 ms after the back press. "Connecting forever" is
the honest consequence: no wallet is loaded, so the node never starts.

**Fix shape:** remove HomePage from the stack in `goToWelcome` (close the TODO),
and/or swallow back at `view=welcome` when no wallet is loaded. Both, probably —
the first is the defect, the second is the belt.

⚠ Same class as #395 F-2, which was reported as "back EXITS the app". It now
walks INTO the app instead. The old F-2 fix addressed the view report, not the
stack.

---

## ✅ ★ BIG-2 — The wipe leaves mini-apps installed **— FIXED (#585 rider)**

`SettingsPage.wipeEverything()` enumerates the wipe in five numbered steps
(`:1090-1140`): chain caches, account, wallet, preferences. **`MiniAppManager` is
not in the list**, and `Node.stop()` only calls `MiniAppManager.stop()`
(`Node.cs:594`) — stop, not delete.

So a wiped device keeps every installed mini app, and a create or restore inherits
them. Damir is right that they belong with "all data".

⚠ Ordering matters: the wipe already stops the node before deleting, so the
removal has to sit with step 3 (the account), after `MiniAppManager.stop()`.

---

## The fail and the two n/a

| Item | Verdict | Mechanism |
|---|---|---|
| **33** — a muted contact stays quiet | **FAIL → ✅ FIXED (#586)** | The push gate works — no notification. But **the RINGTONE is not gated**: `VoIPManager.onReceivedCall` calls `SPlatformUtils.startRinging()` unconditionally, and only `SPushService` consults `SNotificationPrefs.shouldNotify`. So a muted contact rings with no notification and no explanation, then posts a missed call. The mute has to reach the ring, not only the tray. |
| **04** — the elevation log line | n/a | Damir did not read the log; the picker itself works. Not a defect. |
| **24** — un-react restores the hug | n/a | **There is no way to un-like.** Tapping the heart does nothing. So the item is untestable, and the missing affordance is itself a finding: the FE has `onToggle`, but see #215 — the CORE persists only `like` for user reactions, so an un-like needs verification before it is built. |

---

## Pass-with-note findings

| # | Row | Note | First read |
|---|---|---|---|
| 06 | #577 | A locked phone rings with no way to silence it with the hardware buttons | The ring is ours (`SPlatformUtils.startRinging` → MediaPlayer), not a telecom ring, so the volume keys do not reach it. Needs a real notification with a full-screen intent, or a volume-key hook. Not small. |
| 12 | #579 | Dark mode: the lifted row's fill is dark blue, not prominent | It inherits `--surface-screen`. Damir wants the neutral press fill instead. One token. |
| 12 | #579 | Desktop right-click menu often covers the selected row | The desktop path drops the menu from the row's bottom edge (`desktop-anchors.js`, `attachContextMenuAnchors`) with no flip-above. The mobile path already prefers above (#557 4.1) — port that. |
| 12 | #579 | "sometimes the bottom sheet opens on dark mode" | ✅ **SOLVED AND FIXED (#588)** — and it was never about dark mode. Damir's later note ("after a restore the FIRST long press opens the sheet, every next one opens the dropdown") plus his log gave the mechanism: the chats list flushes every ~2 s while the block scan runs, `renderChatsList` rebuilds every row, and the row captured at pointerdown is DETACHED by the time the 500 ms timer fires — so it measures zero and the fail-soft keeps the sheet. Fixed by re-resolving the live row by address. |
| 20 | #581 | Nicknames truncate in the middle too | `payeeDisplayName` returns the nick unchanged; the MIDDLE truncation comes from `truncateAddressMiddle` only. So a long NICK is being classified as an address — check `isPseudoAddressNick` against Damir's nick. A nick should ellipsize at the END, and only on overflow. |
| 25 | #582 | The address row should be ABOVE Contacts | One line — his call, his layout. |
| 26/30 | #582 | Sheet order: info block above the QR, safety below the address; gaps from spacing tokens; desktop needs the dismiss icon and a visible scrollbar | A real re-layout of `openAddressSheet`. The desktop scrollbar is the #556 F5-5 ② persistent-thumb rule not reaching this state. |
| 35 | #583 | Restoring shows empty, then populates after a restart | ✅ **This IS the #565 latch above** — same bug, second symptom, fixed with it (#584). |

---

## Medium and small, triaged

| Severity | Finding | First read |
|---|---|---|
| Medium | Desktop: Account → Contacts overtakes the LEFT pane and the right pane becomes a conversation; the rail jumps to Chats | The contacts takeover is a `home.html` surface, so opening it re-drives the home shell to tab1. The Account pane (#245) is a peer WebView that does not own that routing. Wants the directory in the DETAIL column with the Account hub kept on the left. |
| Medium | Changing language: the rail jumps to Chats but Account is still open | Same root as above — the `#285` language reload re-drives `home.html`, and its boot sets tab1. The `spixi.landtab` handshake (#238) is the existing lever. |
| Small | Mini app that opens the contacts picker leaves a pressed-row rectangle over the new screen | The `pressable.js` press wash is not cleared when the row's own tap navigates away. Same class as `[data-selecting]` (#336 N36). |
| Small | Desktop Account → Notifications: "show sender name" is redundant | Damir's call — remove the row. |
| Small | Empty wallet activity: "Show my address" opens wallet Receive, should open the address SHEET | One handler swap to `openAddressSheet` — and it is the #582 grammar, so it belongs with that row. |

---

## What is NOT in this list

The `RocksDB is shutting down` exception in `wipecreateback2x.txt:120` is the wipe
racing `loadTransactions`, and it is **pre-existing** — the same shape appears in
`565.txt:226` on a normal node stop. Worth a guard, not a walk-day row.

---

## ★ What the ring items became

**Item 33 (muted contact) is fixed** — a NEW `SNotificationPrefs.shouldRingForCall`
gates the ringtone on the per-contact mute and the bot flag. ⚠ Deliberately **not** on
the global notifications master: the first cut used `shouldNotify`, and the reviewer
showed that made an incoming call completely invisible (no ring, no notification, no UI)
for a user who had only silenced message banners.

**The locked-phone ring is HALF fixed.** Damir asked for a cheap alternative to a
full-screen intent — "fix it up so it doesn't ring or something". The ring is now
suppressed while OUR app lock is up, which is the state #272 created (lock wins, no call
UI) and therefore the state where an un-stoppable 45-second ring is indefensible. The
notification lane still fires and is actionable.

⚠ **The harder half is NOT built and needs scoping, not a patch.** A phone locked at the
OS level with our app in the background still rings through our own `MediaPlayer`, and
the hardware volume keys cannot reach it — `MainActivity.VolumeControlStream` only
applies while our Activity is foreground. Making the ring silenceable the way a normal
call is means the NOTIFICATION has to own the sound (a call-category notification with
its own ringtone), not our media player. That is a real piece of work on the Android
notification lane, and it should be specced before anyone starts.

