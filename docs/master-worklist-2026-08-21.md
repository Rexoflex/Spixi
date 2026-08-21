# Master worklist — 2026-08-21. Supersedes `docs/master-worklist-2026-08-17.md`.

Merges Damir's 2026-08-21 list with the standing rows. **Every verdict below is verified at
source** (file:line in the notes), not inferred from an older row.

★ **THREE STANDING CONCLUSIONS ARE CORRECTED HERE.** See §0.

---

## §0 ★ CORRECTIONS to what this project believed

| Was believed | Actually |
|---|---|
| "Group RENAME / PHOTO / ADD-MEMBERS are all verified NOT in Ixian-Core → BE" (Table B q5, re-verified twice) | **Right for rename only.** ⚠ **CHANGE PHOTO transport EXISTS** — `SpixiMessageCode.avatar = 24` / `getAvatar = 25` are ADDRESS-SCOPED (`CoreStreamProcessor.sendAvatar(friend, avatar_address)`, Ixian-Core `:2323-2345`), and group avatars already ride it on join (`CoreStreamProcessor.cs:1578`). **The gap is in OUR repo**, not Core. **ADD-MEMBERS** has a latent path too: `JoinGroup` rebuilds the roster on every received `createGroup` (`GroupChat.cs:88-105`), so a re-broadcast would propagate an enlarged roster — playback-protected by timestamp, but it also resets `sendNotification` to true (`:103`). Triage + BE sign-off, not a flat no |
| The notification toggle "does not work on private groups" is an unknown | **ONE LINE.** `Spixi/Meta/Node.cs:838-839`: `if (friend.bot == false || (botInfo != null && botInfo.sendNotification))`. `friend.bot` is true ONLY for bots (`Friend.cs:250-253`); a private group goes through `setGroupMode()` and never sets it. So the first clause short-circuits TRUE for every private group and the toggle is ignored. Bots take the second clause and are honored — exactly the split Damir sees |
| There is a global notifications setting | **There is not.** `createNotificationsScreen` exists (`settings-screens.js:551-582`) but is gated on `capabilities.globalNotifications`, which the production shell never sets (`settings.html:756`). It is a built-but-dark screen. The toggle Damir HAS is per-chat, in chat-info (`chat-info.js:467-495`) |

---

## §1 The one-liners — OURS, no triage needed

| ID | Item | Where | Size |
|---|---|---|---|
| **F4** | Close button on the full-screen tx page does nothing | `wallet-shell.js:620-626` + `wallet_sent.html:316-322`. Needs its own `showClose` option — do NOT couple it to `disclose` | XS |
| **F5** | Wallet zero state must have NO glyph | `wallet-shell.js:104` `glyph: 'wallet'` | XS |
| **NOTIF-1** | ★ Private-group notification toggle ignored | `Node.cs:838-839` — the `friend.bot == false` short-circuit | XS |
| **N80** | Rating nudge waits for the 5th open (dialled: counter) | `home.html` RATING_SNOOZE_* + `HomePage.checkForRating()`, +1 pref | S |

## §2 Needs a DEVICE LOG first (#294) — ship the measurement, not a fix

| ID | Item | What to log |
|---|---|---|
| **F3** | ★ No biometric/pattern prompt on RESUME. **Two failed fixes.** | `uiReady` · `pageVisible` · `authAttempted` · `authDeferred`, and whether `OnResume` reached `onForegroundReturned()`. ⚠ Damir uses a **PATTERN** (device-credential fallback), not a fingerprint |
| **F1** | White flash before the lock, everywhere | Window background (`MainTheme`) vs the modal transition vs lock.html's instant-bg |
| **F2** | Lock status bar renders splash-blue | `repaintSystemBarsFor` is likely not called for the PAUSE-presented lock. Probably the same root as F1 |
| **F6** | Scan row appears/disappears at random | The pushed `current`/`target`/`origin` triple over ~60 s. `scan-progress.js:164-224` |
| **F7** | "Show amounts" absent on Android | Which of `hideKnown` / `walletHidden` is false. `wallet_sent.html:258` |
| **N68** | Fatal-exception OS dialog after failed-restore then create | logcat, nothing else |
| **N65** | Windows: language pick does nothing, four surfaces disagree | One device log line. `docs/n65-triage-language-pick.md` §2 |
| **I-9** | Chat info / group info slow — Damir: "skeletons are imperative" | Measure first, then build the skeleton |
| **N77** | Community-bot open 10-20 s | The dev HUD already prints `LOAD b1 ... b2 ...`. Two bursts with the same n = duplicate flush |

## §3 NOTIFICATIONS — Damir's block. All OURS.

| ID | Item | Verdict | Notes |
|---|---|---|---|
| **NOTIF-1** | Toggle ignored on private groups | ★ **OURS, one line** | See §1 |
| **NOTIF-2** | Global + per-chat toggles | **OURS, S-M** | The global SCREEN already exists and is dark — flip `capabilities.globalNotifications` and wire the verbs. Per-**1:1** has no bridge verb yet (`contact_details.html:365`); per-group and per-bot already do |
| **NOTIF-3** | Tap is slow, loads the chat list first | ★ **OURS, S** | Not a route — a POLLED GLOBAL. `SPushService.cs:131-137` opens plain `MainActivity`; `MainActivity.cs:270-283` sets `App.startingScreen`; the **1 Hz** `HomePage.updateScreen()` reads it (`:2493`). Plus a hardcoded `Task.Delay(500)` (`:262`). Push the navigation instead of polling for it |
| **NOTIF-4** | Combine 5 notifications from one chat | **OURS, S** | `SetGroup(data)` is set (`SPushService.cs:173-176`) but there is **no summary, no count, and a unique id per message** (`Node.cs:847`, CRC32 of the message id). `unreadCount` is already passed in and never used. `MessagingStyle`, or one updating notification per chat |

⚠ **Do NOT change** `sendNotification` semantics without noticing that
`Friend.getUnreadMessageCount()` returns 0 when it is false (Ixian-Core `Friend.cs:513-520`)
— muting a chat currently also zeroes its badge.

## §4 CALLS — Damir's block. All OURS, but the first is real work.

| ID | Item | Verdict | Notes |
|---|---|---|---|
| **CALL-1** | Persistent, obvious incoming call — vibrate, accept/decline from the OS | **OURS, M-L** | Today: an audible ring from the app process (`SPlatformUtils.cs:47-89`) plus a PLAIN notification. **No full-screen intent, no CallStyle, no foreground service, no Accept/Decline actions** — the code already logs this as a follow-up (`SPushService.cs:139-141`). Needs `USE_FULL_SCREEN_INTENT` in the manifest plus a `CallStyle` notification |
| **CALL-2** | Call banner below the top banner; app usable in call | **OURS, S-M** | ⚠ Partly true already — the bar is a **64 dip top strip** and everything below it IS interactive (`CallPage.xaml.cs:603-635`). What is wrong is that it OVERLAYS instead of pushing content down, so it occludes the chat topbar (the accepted #258 dial). The ask is to make it take layout space |
| **CALL-3** | Speaker button in the banner | **OURS, S** | **Nothing exists** — no `setSpeakerphoneOn` anywhere. Routing is fixed to earpiece by `AudioUsageKind.VoiceCommunication` (`SAudioPlayer.cs:71-85`). Needs a platform verb plus a control in `callbar.js` |
| **CALL-4** | Fine-tune call bubbles; "call back" only on MISSED calls | **OURS, S** | FE only |

⚠ **The Android in-call strip has never been exercised on hardware.** It needs a real
two-device call before any of CALL-1..3 is judged.

## §5 SOUND EFFECTS — Damir's block. All OURS, S.

Today there are **exactly four sounds**, all call-related, in `Spixi/Resources/Raw/sounds/`.
Nothing else in the app plays audio, and `SSystemAlert.flash()` is an **empty method** that
`Node.cs:854` calls on every message.

Plumbing already exists on all three platforms (`playSoundFromAssets` / `AVAudioPlayer` /
NAudio). What is missing is one generic verb on `Spixi/Interfaces/IPlatformUtils.cs:20-24`
plus the assets.

| ID | Item |
|---|---|
| **SND-1** | Message sent / received sound (mobile) |
| **SND-2** | Transaction sent / received sound |
| **SND-3** | Desktop sound for incoming chat / payment, with a desktop-specific off switch |

★ The "In-app sounds" switch already exists in the settings component
(`settings-screens.js:571-575`) and is dark behind the same `globalNotifications` gate — so
SND and NOTIF-2 share one wiring job.

## §6 REQUESTS — Damir's block. Mostly already tracked.

| ID | Item | Verdict |
|---|---|---|
| **N39** | Outgoing contact request: delete then prompt REVOKE plus explain. Payment request: no cancel | **OURS** — legacy `ixian:undorequest` EXISTS. Damir's open question (auto-revoke vs prompt, and what the recipient sees) is a design call to make first |
| **N10** | App invite: Cancel in chat does nothing; should cancel, keep the bubble, say "Canceled" on BOTH ends | **TRIAGE** — our half is ours; the "both ends" half may need the counterparty side |

## §7 ACCOUNT — Damir's block.

| ID | Item | Verdict |
|---|---|---|
| **N67 / F8** | ★ ONE account. Wipe = wipe clean. Delete then welcome screen | **OURS, M.** Damir's decision is made. ⚠ Destructive path: reproduce and NAME the delete-then-restore error first (#215/#294), security-gate row, and it must not strand a live wallet behind onboarding (W14/#348) |
| **F9** | Fresh account shows the OLD balance until restart | **OURS** — an echo: a live `setBalance` surviving the swap, or `IxianHandler.balances` not cleared. Separable from N69(a) |
| **N69** | First connect after account creation never completes; a request sent in that window is lost | **CORE for (a)**, ours for (b). Confirmed a THIRD time |
| **ACC-1** | Make Account a preloaded peer screen like wallet/chats/apps | **DESIGN CALL.** Today `SettingsPage` is a PUSHED page with its own WebView (#183). Trade-off: a fourth always-live WebView costs memory and adds a document to every theme/language reload sweep (#421/N71); the win is instant open. Measure the open cost first (#294) — it may be an I-9-class problem instead |

## §8 CONVERSATION — Damir's block.

| ID | Item | Verdict |
|---|---|---|
| **I-9** | Chat info / group info skeletons | §2 — measure first |
| **N15** | Group typing indicators | **TRIAGE, then split.** Sender attribution is a known BE ask (be-cutover C21); whether the GENERIC pill can show is likely ours |
| **GRP-1** | Group RENAME | ★ **CORE / BE.** Confirmed at `097341a`: no code in `SpixiMessageCode` (54 values) or `SpixiBotActionCode` (14), and re-sending `createGroup` does NOT rename on the receiver — `GroupChat.cs:68-76` applies the name only on the FIRST join |
| **GRP-2** | Group PHOTO | ★ **OURS — CORRECTED.** The address-scoped avatar transport exists and groups already use it on join. The missing piece is an owner-side "photo changed, push to members" trigger in our repo |
| **GRP-3** | ADD MEMBERS | ★ **TRIAGE plus BE sign-off — CORRECTED.** `JoinGroup` rebuilds the roster from a received `createGroup` (`GroupChat.cs:88-105`), so a re-broadcast propagates an enlarged roster. Not a supported path; it also resets `sendNotification` |
| **CALL-4** | Call bubble states | §4 |

## §9 WALLET — Damir's block.

| ID | Item | Verdict |
|---|---|---|
| **F6** | ★ "Fix the Scanning for TX" | §2 — log first |
| **WAL-1** | Redesign the SEND flow without a BE engineer | **PROBABLY OURS.** `wallet_send.html` is the last legacy page. The precedent is every other shell: a redesigned shell driving the SAME existing verbs, zero C#. ⚠ It is the MONEY path — it stays LAST, and it needs its own security-gate row. Related: **N79**, three SL ids undefined on that page in all 13 languages |
| **WAL-2** | Desktop: Send/Receive in the pane rather than overtaking the wallet | **DESIGN CALL.** Receive already opens as a takeover over the wallet view (`home.html` `mountWalletReceive`). Pane-hosting is the #225 overlay grammar and is available; the trade-off is that a money flow in a pane can be dismissed by a stray click on the master column, which a takeover cannot |

## §10 Still standing, not in Damir's list

**N64** (update-notice round: scope, no action, tone, copy) · **N70** (update check on
offline-to-online) · **N79** (three blank SL ids on Send IXI) · **N57** (group visibility,
triage, likely BE) · **N33** (group file relay, BE) · **N72** (scan path gives no feedback,
design WITH N69(b)) · **N78** (theme flip yanks to Chats, rides N71).

## §11 What is BE / Ixian-Core and cannot be done in a no-BE session

Group **rename** (GRP-1) · N69(a) the post-creation connect · N33 group file relay ·
N15 sender attribution · reply-to's carrier (held,
`docs/be-cutover-ixian-core-reply-carrier.md`) · the `GroupChat.JoinGroup`
`sendNotification` clobber noted in §0.
