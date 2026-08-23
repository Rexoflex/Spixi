# Handoff — the next batch. Wallet scroll · sounds · menu · requests.

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.** Damir re-confirmed it on 2026-08-22.
★ Entry prompt: `docs/next-session-prompt-2026-08-24.md`.
★ Previous handoff: `docs/handoff-2026-08-23-loop-w46.md`. DECISIONS **#514**, **#515**, **#516**.

---

## 0. STATE — read this before you plan anything

The #514–#516 batch is **built, device-walked on BOTH platforms, and CLEAN — 13 of 13.**
★★ **W‑1, the app-lock bypass, is PROVEN ON HARDWARE**, not ticked:

```
14:09:28.2599  Desktop idle lock: idle=626s gap=30s window=600s slept=False
14:09:28.2605  [LOCKDIAG] ===== cycle start: idle-lock =====
14:09:28.2605  [LOCKDIAG] +0ms [idle-lock] idle/locking · (#505) · overlayLock=True
14:09:28.3974  [LOCKDIAG] +136ms [idle-lock] lock/webview-onload · appLockMode=True
```

`overlayLock=True` means the idle lock fired **while an authorise lock was on screen** — the exact
state that produced nine idle ticks and no lock on the previous build. No `sweep/`, no
`onLockPresentFailed`, no `blank-repair-spent` anywhere in the session.

⚠ **THE FIRST THING TO CHECK: has Damir committed that batch?** It is UNCOMMITTED on his disk and
the device pass describes exactly those bytes. **Do not add to that tree until it is committed** —
the moment you do, everything he walked stops being verified. His `git rm --cached spixi-*.tar.gz`
(#513, his call) belongs in the same sitting, as its own commit.

**Baseline when you start:** Ixian-Core clean at `097341a` · pattern triangles 224×193.988 default ·
bundle **275 exports** · **18 shells** · smoke **BASELINE OK 2691 pass / the 3 KNOWN
(#136 · M5 · B3)** · cs-syntax **142 + 1 known gap** · verify-locales ALL CLEAN.

★ **THE BUILD-IDENTITY CHECK, AND IT IS NOT OPTIONAL.** Two full device rounds were burned because
the source was new and the RUNNING APP was old. Before you believe any device result:
* the source carries the change — `Select-String` the new string;
* the compiled assembly carries it — `strings -el Spixi.dll | grep <string>`, **UTF‑16, not ASCII**;
* **the running process was launched after the build** — force-stop and relaunch, then confirm a
  new-build-only string appears in the log within the first minute.
A build output being new does NOT mean the app under test is new. That is the whole lesson.

---

## 1. ★★ THE WALLET SCROLL OSCILLATOR — new, and it leads the batch

**Damir:** *"with 5 transactions, where 1 or 2 are under the fold, the scrolling is flickering,
can't scroll to bottom. It should minimise the hero any time you scroll down, so it's always the
same effect."*

**MECHANISM — confirmed with Damir, and the first reading of it was WRONG.**
The first hypothesis was that collapsing the hero shortens the scrolled content. Damir corrected it:
*"it's a sibling, I can't scroll dragging over hero."* The hero is **outside** the scroll container.
That makes it worse, not better:

1. The hero collapses → the scroller gains about a hero's height of **viewport**.
2. Max scroll offset is `scrollHeight − clientHeight`, and `clientHeight` just grew → **the maximum
   drops**.
3. With 5 transactions the list now **fits entirely** → max scroll becomes 0 → `scrollTop` clamps
   to 0.
4. `attachWalletScroll`'s `if (top <= 1) → expand` fires → the hero grows → the scroller shrinks →
   the content overflows again → the user scrolls → back to step 1.

★ That is a perfect oscillator, and it explains Damir's words exactly: **when the hero is collapsed
there is no bottom to scroll to, because everything fits.** With a long list the content overflows in
both states, nothing clamps, and it feels fine — which is why nobody caught it.

**Files:** `src/components/wallet-shell.js` (`attachWalletScroll`, near :308) ·
`src/components/wallet-hero.js` (`setWalletHeroCompact`, near :167) · the shell wiring at
`src/shells/home.html:2358`.

**THE FIX — two parts, and both are needed:**

**(a) RESERVE THE HEIGHT.** Pad the bottom of the list by exactly what the hero gives up when it
collapses. Then collapsing adds viewport **and** content in equal measure, the net is zero, nothing
ever clamps, and the effect is identical on an account with 5 transactions and one with 500.
⚠ **MEASURE the delta, do not guess it.** It must come from the element, not a constant, or it rots
the first time the hero's design changes.

**(b) LATCH THE COLLAPSE.** Once collapsed, stay collapsed until the user **deliberately scrolls
up** — not until `top <= 1`. Today a *clamp* is indistinguishable from "the user is at the top", and
that is what closes the loop. Needed even with (a).

⚠ **REJECTED, and record why:** "only collapse when there is enough content to absorb it" was
considered and rejected. It gives different behaviour on different accounts, and Damir's dial is
explicit — *"always the same effect."*

⚠ **This is not a one-liner.** It needs the delta measured, a latch that can tell a real scroll from
a clamp, pins that test the GUARANTEE rather than the shape, and a fresh reviewer. Treat it as a
proper round.

## 2. TRANSACTION SOUNDS — REMOVE THEM. Damir's call, and it reverses #506.

**Damir:** *"that's why we need to remove the sound from transactions arriving — from the
transactions in general."*

**The diagnosis is complete and it is not a code defect.** `SpixiTransactionInclusionCallbacks`
(`:37-45`) chimes on **every** `transactionVerified` callback with **no edge guard**. A restored
account walks the whole chain, discovers every historical transaction for the first time, and chimes
for each one. Damir's Android log of 2026‑08‑23 shows the app walking **60,000 blocks in 17.5
minutes** and still **36,803 behind** at the end, with an **empty activity database**
(`Activity: Opened Database … Blocks 0 - 0`) while Windows was fully populated.

★ Damir confirmed the scan itself is expected: *"phone is going through blocks only when I have a
fresh session where I restore an account, once it's done it's ok."* So nothing is broken — the app
did exactly what it was told to do, loudly. **The sound is the defect.**

**BOTH sounds go, sent and received.** They look different and they are not: `transactionSent()`
also fires on **verification**, not when the user presses send. That is what #506 recorded as
Damir's *"serious delay"* on Windows — it was never a delay, it was the chime waiting for
settlement. Both carry the same defect.

⚠ **This REVERSES #506's ruling** that money should chime once when it settles. Write the DECISIONS
row as a design reversal by Damir, **not** as a bug fix.

★ An edge guard ("chime once per txid") was the alternative and was rejected in favour of removal —
removal cannot regress, and it cannot come back on a fresh install.

## 3. THE FOUR SOUND LOG LINES — still owed, and now a BELT rather than a diagnosis

`Node.cs:1013/1018` (message sent/received) and `SpixiTransactionInclusionCallbacks.cs:37-45`.
Four `Logging.info` calls. With transactions silent the only remaining sounds are the message ones,
which are gated on `fire_local_notification && alert && App.isInForeground && getChatPage(friend) !=
null` and unmuted. **If anything still chimes after item 2, these four lines name it in one round.**
Owed since 2026‑08‑22. Cheap. Do them in the same batch.

## 4. THE MENU BATCH — unblocked since the #46 loop closed, still not started

All four calls are Damir's, taken 2026‑08‑22 with the trade-offs on the table.

1. **Mobile: the §5b ANCHORED DROPDOWN**, for the message menu **AND** the chats row menu.
   Telegram/WhatsApp grammar. ★ Not cosmetic — it fixes 4.1 **structurally**: a menu that flips
   above the pressed message when there is no room below can never cover it, so the z-order fight
   disappears instead of being tuned. `desktop-anchors.js` already has `anchorSheetAbove`.
2. **The lift STAYS, and the mobile scrim goes DEEPER** — `--surface-scrim`, 0.6 today.
   Damir: *"dim the conversation for another level, but it works."*
3. **Desktop: #268 STANDS — no backdrop wash.** The "faint background row" is
   `[data-dt-ctx-source]`, the source-row highlight #268 named as the affordance. Retune or drop it
   on desktop so it does not read as a stray background row. ⚠ Do NOT add a wash. Asked and answered
   twice.
4. **The QR opens a FULL BOTTOM SHEET** — code at scan size, the address and the explanation in one
   surface. ⚠ The `What is this address?` explainer sheet already exists beside it (#443/#453).
   **Fold the two into ONE surface; do not ship a second.**

**Rider:** the dev HUD is clipped by the 72 px rail — `position:fixed; left: var(--spacing-8)` has
no desktop offset (`src/shells/home.html`, beside the existing `:root[data-desktop]` right rule).
One line.

⚠ **Sequencing:** the anchored dropdown lands directly on the z-order and lift work that the #46
loop just reviewed. Item 1 of this handoff (wallet scroll) is independent of it; the menu batch is
not. Do the scroll work first or in a separate scope.

## 5. ★ NEW FROM DAMIR — assessed, not transcribed

### 5a. Contacts do not belong in preferences — TWO items, and they must be split

**Damir:** *"Contacts do not belong in preferences, and also behave badly — it takes the user to
Chats/contacts, and then going back from contacts goes to chats. Perhaps we should wait till the
account is a peer screen and take it from there."*

★ **These are two different things and only one of them is buildable today.**

* **(i) THE BACK-STACK IS BROKEN — a defect, fix it now.** Entering Contacts from Settings and
  pressing Back lands the user in **Chats**, not Settings. A back action that does not return where
  the user came from is wrong whatever the information architecture ends up being, and it is
  independent of (ii). ⚠ **NO MECHANISM YET** — find where the Contacts entry is pushed from
  Settings and why the return target is Chats. **Do not build past that (#294.)**
* **(ii) MOVING CONTACTS OUT OF SETTINGS is an information-architecture decision, and Damir has
  already parked it himself** — *"perhaps we should wait till the account is a peer screen."* That
  screen does not exist. **Do not build it. Record it and wait for the account screen.**

### 5b. REQUESTS — ★★ THREE FACES OF ONE DEFECT, and the mechanism is already found

Damir listed three:
* a sent **contact request** — deleting it should prompt to revoke, and explain what happens if it
  is not revoked; or revoke automatically. *"What happens on the recipient's side?"*
* a sent **payment request** — the cancel is missing, or the delete-bubble only deletes it for the
  sender.
* a sent **app invite** — cancelling in chat does nothing; it should cancel, stay in the chat, and
  say "cancelled" **on both ends**, unless the user deletes the bubble.

★★ **THEY ARE ONE DEFECT: A LOCAL REMOVAL CANNOT TELL THE PEER.** Traced at source:
`ixian:undorequest` → `SingleChatPage.xaml.cs:396` → `FriendList.removeFriend(friend)`, and the
code's own comment at `:749` says **"removeFriend WITHOUT sendLeave"**. Nothing goes on the wire.

★ **So Damir's question is answered: NOTHING happens on the recipient's side.** They keep a pending
request from somebody who withdrew it. The same shape applies to the payment request and the app
invite — every "cancel" is a local delete.

This is the NOTIF‑5 pattern again, where 3.7, 3.4 and 3.12 turned out to be one defect wearing three
faces. **Treat it as one row, not three.**

⚠ **THE GATING QUESTION IS BE, AND IT MUST BE ANSWERED FIRST:** does the Ixian stream protocol carry
a verb that withdraws a pending contact request, cancels a payment request, or cancels an app
invite? Read `SpixiMessageCode` in Ixian-Core and find out. **Ixian-Core is FROZEN at `097341a` —
read it, do not touch it.**
* **If the verbs exist:** this is FE + C# work — send the verb, and render "cancelled" on both ends.
* **If they do not:** this is a **BE row**, and the only honest FE work today is copy that does not
  lie — a confirm that says the other person may still see the request, rather than a "cancel" that
  silently does nothing. ★ That is the ⑪ delivery-lie class this project already has a name for, and
  it is on a money surface for the payment request.

**Do not design the prompt copy before the mechanism is known.** The wording depends entirely on
whether the peer can be told.

### 5c. ★ PRESS FEEDBACK — three findings, and two have named mechanisms

**Damir:** *"Rows currently highlight on tap to scroll, should highlight only when tapped to open.
Same in both chats and wallet txs. On Galaxy testing the fill animation seems to lag out a bit — it
always fills halfway, stops for a brief moment, and fills to the end, making it seem bad. Also the
fill colour should be neutral, one level above the idle row colour token."*

Files: `src/components/pressable.js` · `src/styles/base.css` (the `[data-pressed]` block, ~:290-390).

**(i) ROWS LIGHT UP WHILE SCROLLING — the threshold is not the problem.**
`PRESS_MOVE_CANCEL_PX = 10` (`pressable.js:96`) is already tight, and the cancel-on-move rule exists
and is documented. The defect is **ordering**: the tint is painted at `pointerdown`/`touchstart`,
and 10 px of finger travel takes long enough that the user SEES the tint before the cancel fires.
On a flick that leaves a trail.
★ **The fix is a short delay before PAINTING the press state, cancelled by movement — not a tighter
threshold.** Native list rows do exactly this. ⚠ It trades against the whole reason `pressable`
exists ("a row that stays inert for 300 ms reads as broken"), so the delay must be small and must be
measured on the device, not guessed. Damir's dial: *"highlight only when tapped to open."*

**(ii) ★★ THE FILL STALLS HALFWAY — THE MECHANISM IS THE ANIMATED PROPERTY.**
`base.css:385` is `transition: background-size var(--duration-300) …`, and the pressed state is
`background-size: 100% 100%`. **`background-size` is not a compositor property.** It repaints on the
MAIN THREAD every frame, so any main-thread stall freezes the sweep mid-way and it resumes when the
thread frees up — *"fills halfway, stops for a brief moment, fills to the end"*, exactly.
★ **And we know what is occupying that thread on the Galaxy:** the same device log carries **6,567
errors in 17.5 minutes** (§6, the decrypt loop) plus a chain scan. This is one symptom of two
findings meeting.
★ **The fix is to animate a COMPOSITOR property instead** — `transform: scaleX()` on a pseudo-element,
or opacity. ⚠ The precedent is already in the same file: `[data-pressed="control"]` uses
`transform: scale(0.97)`. **This is a rewrite of the row-press paint, not a tune** — it touches the
`aria-current` tonal variant, the `.c-app-item__open` special case and the retract timing, all of
which have their own recorded rulings (A5 #348, D-16 #351, #346). Treat it as its own scope.

**(iii) THE FILL COLOUR — a token dial, and the only part that is simply buildable.**
Damir: **neutral, one level above the idle row colour token.** Resolve "one level above" against the
neutral ramp rather than picking a hex, and check it in BOTH themes — the pressed tint must stay
visible on the dark surface without reading as a different row state.

## 6. Still open, carried forward

| | |
|---|---|
| **A‑6** | `(foreground)` in the Android log. Owed **three** rounds now. Ten seconds: app open on one chat, receive a message in another, export the log |
| **The sound picks** | Damir has better UI SFX candidates and asked to be **interviewed**. Conversation, not build time |
| **The Android decrypt loop** | 6,567 errors in 17.5 min — 2,358 `no AES and CHACHA keys`, 2,096 `receiveData` failures, the same few payloads re-processed **262 times each**. Runs continuously. ⚠ Observation with a discriminator (one peer or many?), **nothing built on it** |
| **BE-owned** | `Ixian-Core/Streaming/OfflinePushMessages.cs:118` — `HttpClient` with **no `Timeout`**, blocking `.Result` at `:121` and `:186`, inside a callback OneSignal gives 30 s. One line closes the last of NOTIF‑4's two-rows path. **Frozen — raise it, do not touch it** |
| **iOS #503** | `docs/ios-nse-spec.md`. Three Apple prerequisites and a design decision Damir owes (§2) |
| **`maxLogCount` = 5** | Still carries its RELEASE BLOCKER marker. Reduce before launch |
| **W‑3 repair path** | `lock/presented-blank` is PROVEN to fire. `lock/blank-repair` has **never run** — W‑4.6 did not reproduce. The detector is verified; the repair is not |
| **MAJOR‑6** | Bounded at 30 s and **unfixable on the managed surface** — no boolean overload exists. The real fix is upstream in `OneSignal-DotNet-SDK`. ⚠ Do not "fix" the line from reasoning |

## 7. ★★ THE LOOP — WHO RUNS IT

This work is done with **Fable**. ★ **THE #46 ADVERSARIAL REVIEW LOOP IS GIVEN TO OPUS MODELS.**
The builder does not review its own work, and the reviewer must be **FRESH**.

That is not ceremony, and this project has the receipts: #258's reviewer found a MAJOR the fixers had
missed; #272's found five, two of them lock-integrity bugs; #500 was an app-lock **bypass** that only
somebody trying to break it ever found. **The 2026‑08‑22 loop found 7 MAJORs in pass 1 and 7 more
from the fresh reviewers** — including a second bypass created by the fix for the first, and a
reviewer that obtained an SDK artifact the batch had declared unreachable.

**The shape:** disjoint read-only auditors → verify each finding against the tree → disjoint fix
owners → **one** pin owner → **FRESH break-my-verdict reviewers over the fixes** → loop until clean.

## 8. Rules that earned their place this round

* ★★ **A CSS PIN THAT READS ONE RULE IN ONE FILE CANNOT PIN A CASCADE.** One helper defect made
  three pins vacuous **and** hid a MAJOR for a whole batch.
* ★★ **PIN THE GUARANTEE, NOT THE SHAPE.** `catch (Exception beltEx) { throw; }` kept the shape,
  removed the guarantee, and passed the whole suite.
* ★ **MUTATE BEFORE BELIEVING, AND INVENT MUTATIONS THE WORK ORDER DOES NOT LIST.** 42 mutations
  against round 1 produced 16 greens, 14 of them real holes.
* ★ **ABSENCE OF A LINE IS NOT A DIAGNOSTIC.** W‑4.6's evidence was a *missing* line. The fix logs
  the blank lock at the moment it happens.
* ★ **A FIX CAN TRADE ONE DEFECT FOR ANOTHER** — twice this round, both caught by somebody trying to
  break the fix rather than reading it.
* ★ **THE RUNNING APP IS NOT THE BUILD OUTPUT.** Two device rounds were lost to this.
* ⚠ **DO NOT REPUBLISH A LIVE ARTIFACT FROM A STALE LOCAL COPY.** It overwrites what the user has
  already filled in. That happened this session and cost Damir a full test round.

## 9. Delivery

Windows and PowerShell at home with Android on adb, a Mac in the office for iOS. Land everything
**uncommitted** with a full green pipeline. ONE step at a time, and WAIT. Expectations in a table
OUTSIDE the pasted block, with the NUMBER to expect. `adb` is not on PATH:
`C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe`. Check the device is attached
BEFORE the run step (#450). Android:
`dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release`, then `-t:Run` as a SEPARATE command
(#320). Windows: `-f net10.0-windows10.0.19041.0 -c Debug`, then the exe separately.
`git --no-optional-locks` always. **Wipe `obj`/`bin` on any C# change (#387).**

⚠ Land tarballs into **`_deliveries/`**, never the repo root. `tar` needs `--overwrite`.
**Verify the extract landed** — a tarball that is copied but never unpacked cost a whole device round
this session. `device_bash` is capped at 45 s; stage git adds in chunks of ~20. Git strands `*.lock`
files the bridge cannot delete — `mv` them to `_to_delete/`. `git push` does not work from the
bridge. **Never `git add -A`** — the tree carries CRLF-only churn on ~116 files.
