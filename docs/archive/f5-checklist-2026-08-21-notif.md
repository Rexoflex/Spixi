# F5 checklist — 2026-08-21. The four one-liners · notifications + sounds · LOCK LOG-ONLY.

> ⚠ **2026-08-23 correction (#518):** the transaction sounds this checklist describes are
> REMOVED by design reversal — `tx_sent.mp3`/`tx_received.mp3` no longer exist and a payment
> makes NO sound. The message-sound rows still stand.

Batch: DECISIONS **#464–#471**. Everything is UNCOMMITTED on your disk.

**LANGUAGE RULE: ASD-STE100.** See `CLAUDE.md`.

---

## 0. Build it

C# changed in **19 files** and **three are NEW**, so the wipe is not optional (#387).

★ **`git add` the three new files first, or the build fails for you and for everyone else**
(the #421 `theme-runtime.js` failure mode):

```
git add Spixi/Meta/SNotificationPrefs.cs Spixi/Meta/SSounds.cs Spixi/Meta/SLockDiag.cs
```

The full pipeline already ran green in the cloud. Your run is the pre-commit confirmation:

```
node scripts/extract-strings.mjs
node scripts/build-locales.mjs
node scripts/build-strings-iife.mjs
node scripts/build-demo-bundle.mjs
node scripts/build-shells.mjs
node scripts/i18n-lint.mjs
node scripts/pseudo-locale-smoke.mjs
node scripts/smoke-test.mjs
```

| Step | Expect |
|---|---|
| extract-strings | 725 keys · **0 fallback conflicts** |
| build-demo-bundle | 962519 bytes · **273 exports** |
| build-shells | **18 shells** |
| pseudo-locale-smoke | **9/9** |
| smoke-test | **BASELINE OK — 2339 pass / the 4 KNOWN pre-existers** |

⚠ **Bundle BEFORE shells**, always.
⚠ `node scripts/verify-locales.mjs` fails on **ja-jp / `chainScanNoteUnknown`**. That is
**PRE-EXISTING** — verified identical on a clean clone of the branch. Not this batch.

Then wipe and build:

```
Remove-Item -Recurse -Force Spixi\obj, Spixi\bin -ErrorAction SilentlyContinue
dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release
```

Then, as a **separate** command (a wipe makes `-t:Run` fail alone, #320):

```
dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -t:Run
```

⚠ Check the device is on adb **before** the run step (#450):

```
$adb = "C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe"
& $adb devices
```

---

## 1. ★ THE LOCK — this leg produces a DIAGNOSIS, not a verdict

**Nothing about the lock changed.** F1, F2 and F3 are still there and are meant to be. The
job is to make the log say WHY. A smoke gate proves the lock's own logic is byte-identical
to what shipped, so if any of these behave differently, that is itself a finding.

1. Turn the app lock ON.
2. Background the app. Come back. Let it ask for the pattern. Unlock.
3. Open the app fresh from the launcher (the **launch** leg — F1 is reported there too).
4. Open **Dev mode: 10 taps on the "Chats" title** → the Dev screen → **share the log**.

That log is the deliverable. It is worth more than any pass/fail below.

| Search for | It answers |
|---|---|
| `[LOCKDIAG]` | the whole story of every lock cycle |
| `auth/maybeAuthenticate` | ★ **F3.** All four gates and the branch, every time: `uiReady` · `pageVisible` · `authAttempted` · `authDeferred` → `PROMPT` or `SKIP: <which gate>` |
| `lock/onForegroundReturned` | ★ **F3.** Whether `App.OnResume` reached it at all. Paired with `resume/lock-stays-up` |
| `lock/auth-returned` | ★ **F3.** If this appears and you saw **no** prompt, the plugin returned without showing anything — the fault moves out of our gating and into `Plugin.Fingerprint`'s **device-credential** path (you use a PATTERN, not a fingerprint) |
| `bars/repaint` vs `bars/skip` | ★ **F2.** Distinguishes "never repainted" from "repainted with the wrong colour" |
| `+NNNms` on the phase lines | ★ **F1.** Which gap the white flash lives in: `pause/push-requested` → `lock/webview-onload` is the WebView window; after `OnAppearing` is lock.html's own paint |
| `lock/surface-applied` | ★ **F1.** The colours actually applied, read back from the properties |

★ **One source correction already, before you test:** the verdict's first F1 candidate — *"the
window background (MainTheme) is light"* — is **false**. `styles.xml:37` points
`windowBackground` at `@layout/splash_screen`, whose base layer is `#144576`, splash **blue**
(which also explains F2's splash-blue bar), and the LockPage constructor already paints page,
content and WebView `#13171b` **before** the push. Neither native layer can make a white
frame. The surviving suspect is the Android WebView's own renderer painting white before
`lock.html`'s instant-bg commits — and the timeline measures exactly that window.

---

## 2. The four one-liners

| # | Do this | Expect |
|---|---|---|
| **F4** | Wallet → tap a tx → **Details** (the full-screen page) | **No Close button at all.** The way out is the topbar back arrow. The bottom-sheet version (tap a row on mobile) still HAS its Close, and it still works |
| **F5** | Wallet, on an account with no transactions | **No icon and no illustration** — and no empty grey tile where the icon was. Just the headline, the line under it, and "Show my address" |
| **NOTIF-1** | Two devices. Open a **private group** → group info → turn **Notifications OFF**. Have the other device post to it while Spixi is backgrounded | **No notification.** ⚠ Then turn it back ON and confirm notifications return. Bots must still behave exactly as before |
| **N80** | — | **Nothing to test — already shipped in `f10ff1ca`.** The handoff's "dialled and unbuilt" was stale (#471) |

---

## 3. Notifications

| # | Do this | Expect |
|---|---|---|
| **NOTIF-2 a** | Account → **Notifications** (a NEW row) | The screen opens: **Allow notifications** · **Show sender name** · **In-app sounds** |
| **NOTIF-2 b** | Toggle each one, leave the screen, come back | Every switch holds its position. Nothing spins. Force-close and reopen → still held |
| **NOTIF-2 c** | Turn **Allow notifications** OFF, background the app, receive a message | No notification. Turn it back on → notifications return |
| **NOTIF-2 d** | Turn **Show sender name** ON, receive a message while backgrounded | The row reads `Name: New Message`. With it OFF it reads `New Message` — **today's copy exactly**. Message text is never shown either way |
| **NOTIF-2 e** | Open a **1:1 contact** → contact details → **Notifications** OFF | A NEW toggle on 1:1. Muted → no notification from that contact. ⚠ Local to this device; the contact is never told |
| **NOTIF-3** | Background the app, get a message, tap the notification | It goes **straight into that chat**. Previously it sat on the chat list for up to 1.5 s first |
| **NOTIF-4** | Have the other device send **five** messages to one chat without opening it | **ONE notification row**, not five, showing the newest event with "5 new messages" beside it. ⚠ Then: miss a CALL, then have them text you — the missed-call row must **survive** (it has its own id now) |

---

## 4. Sounds — expect SILENCE

**No sound assets ship, deliberately.** They are your pick; the brief says so, so none were
invented. Everything else is built and gated.

| Do this | Expect |
|---|---|
| Send and receive messages, send and receive a payment | **No sound at all.** Nothing should be audible, and nothing should be slower |
| Check the log for `playEffect` | At most one `skipped` line per asset name, not one per message |

To make it audible later, drop four files into `Spixi/Resources/Raw/sounds/` — **no code
change**:

```
message_sent.mp3   message_received.mp3   tx_sent.mp3   tx_received.mp3
```

A payment makes **one** sound, on confirmation, not one when the message arrives and another
when it settles. Call tones are untouched.

---

## 5. F6 / F7 — measurements, not fixes

Both still misbehave. Both now log.

| # | Do this | Then |
|---|---|---|
| **F6** | Leave the wallet open ~60 s while the chain scan runs | Share the log and search `[SCANDIAG]`. **Alternating** lag values = the hysteresis; a **stable** lag punctuated by `target=0` = the indeterminate re-show. Two different fixes |
| **F7** | Hide the balance (the eye), then open a tx detail | Search `[WALLETDIAG]`. `hidebalance=True` with no "Show amounts" on screen ⇒ the push did not reach the shell |

---

## 6. Your calls, raised not decided

| | Call |
|---|---|
| a | ★ **Does muting a chat also hide its unread badge?** It does today, for groups and bots — Ixian-Core `Friend.getUnreadMessageCount()` zeroes it on the same predicate. That is not new and this batch did not change it, but until now a muted group had a zeroed badge *and still notified*, which is backwards. Now they agree. If you want mute to leave the badge alone, that is a Core change |
| b | ⚠ **Core will UN-MUTE a group.** `GroupChat.cs:103` re-creates `botInfo` with `sendNotification: true` on every received `createGroup`, so a re-broadcast clobbers the user's mute. Not ours, and it matters more now the toggle works |
| c | **The sound assets.** Four files, named above |
| d | With **Allow notifications** OFF, the **Show sender name** row is inert but still tappable. Dim it, hide it, or leave it? |
| e | **"Show sender name" defaults OFF** so today's notification copy is byte-identical. Say the word if it should default ON |
