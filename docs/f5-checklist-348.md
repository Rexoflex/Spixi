# F5 checklist — batch #348 (W15 · W14 · W2 · A9 · A7 · W4a · W9 · W11 · W10 · W8 · A5 · W1)

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.** See `CLAUDE.md`.

Ordered by risk. Stop at the first ★ item that fails and report it — the ones below it
depend on the same code.

---

## 0. ⚠ THE CORE GATE — do this BEFORE you apply the tarball

Ixian-Core moved `0.9.8j` → `0.9.8k` and the app was never rebuilt against it. Core is a
shared-source import with no version pin, so it changes every platform build at once.

| # | Step | Expected |
|---|---|---|
| 0.1 | Wipe `obj/bin`. Rebuild the CLEAN tree (no tarball applied) | The app starts |
| 0.2 | Send a message in a 1:1 chat | It sends and it arrives |
| 0.3 | Receive a message in a 1:1 chat | It arrives and it renders |
| 0.4 | Send and receive in a GROUP | Both work |

**If any of 0.2-0.4 fails, that is Core, not this batch.** Stop and say so.

---

## 1. Apply the batch

```
tar xzf spixi-348.tar.gz --overwrite
node scripts/build-demo-bundle.mjs
node scripts/build-shells.mjs
node scripts/smoke-test.mjs        # expect: BASELINE OK — 1603 pass / the 4 known pre-existers
```
Then build `net10.0-windows` (NOT Rebuild). **This build is the first compile of the C#** —
there is no .NET in the cloud container, so four C# files have never been through a compiler.

---

## 2. ★ W14 — the freeze. The highest-risk item in the batch.

⚠ **Use a throwaway account.** These actions destroy data.

| # | Step | Expected |
|---|---|---|
| 2.1 | Account → Delete account → confirm → enter the password | The lock closes FIRST, then the wipe runs. **The app must not hang.** |
| 2.2 | Where do you land? | The **welcome** screen |
| 2.3 | On welcome, tap **Create account** | It refuses: "An account already exists on this device. Restart Spixi to continue with it." **This is expected** — delete-account keeps the wallet on purpose |
| 2.4 | On welcome, tap **Restore account** | It refuses with the same message. **This guard is new.** Before this batch it would have run over the live wallet |
| 2.5 | Restart the app | It boots back into the app with an emptied account. Expected — `onboardingComplete` is untouched by delete-ACCOUNT |
| 2.6 | Now Account → Delete **wallet** → confirm → password | Lock closes, teardown runs, you land on **welcome**. **No hang** |
| 2.7 | Read `ixian.log` for `PERF` | `W14 account wipe start/done` and `W14 shutdown start/done`. **Note the shutdown number** — it decides whether the teardown ever needs moving off the UI thread |
| 2.8 | Restart after the wallet delete | Welcome, and Create now works |

---

## 3. ★ W2 — Account auto-save. There is no Save button any more.

| # | Step | Expected |
|---|---|---|
| 3.1 | Account → tap the nickname → type a new one → press Enter (or tap away) | A **"Settings saved"** toast. No check icon anywhere |
| 3.2 | Leave Account, come back | The new nickname is there |
| 3.3 | Change the nickname and change it **back** to the original, then commit | **No toast** — nothing was dirty, so nothing saved |
| 3.4 | Account → change the avatar → pick a photo | Toast, and the photo is promoted immediately |
| 3.5 | Pick a photo, then leave Account WITHOUT any other action, then return | The photo is still there. **Before this batch, leaving threw it away** |
| 3.6 | ★ Turn app-lock **ON**. Then force-quit and restart | The lock is asked for. **This was silently unpersisted before** |
| 3.7 | ★ Turn app-lock **OFF** → authenticate. Force-quit and restart | No lock. **This is the one that could not be turned off at all in the first cut** |
| 3.8 | Desktop: open Account, switch to Chats, come back several times | The pane always repaints and always responds. Never a frozen surface |

---

## 4. ★ A9 — Android landscape Account

| # | Step | Expected |
|---|---|---|
| 4.1 | Android phone, **landscape**, tap Account | A full-screen Account with **its own bottom tab bar**. No uncovered strip on the left |
| 4.2 | Rotate to portrait and back | Still usable both ways |
| 4.3 | Windows desktop, tap Account | Unchanged from before — the pane with the rail beside it |

---

## 5. ★ W8 — tip in bot groups (money path)

| # | Step | Expected |
|---|---|---|
| 5.1 | Spixi bot group → long-press a received message | The menu now shows **Tip** |
| 5.2 | Tip a small amount you CAN afford | It sends. The confirmation names the SENDER, not the group |
| 5.3 | ★ Tip an amount you CANNOT afford | A clear **"Insufficient Balance"** dialog naming the total cost and your balance. **The chat must not disappear** — before this, it threw and the WebView navigated away |
| 5.4 | Normal group → long-press a received message | Tip still there, unchanged |
| 5.5 | 1:1 chat | Tip still there, unchanged |
| 5.6 | A blind group, if you have one | **No Tip**, and tapping a sender opens **no** member sheet |

---

## 6. A7 · W4a · W9 · W11 · W10 · W15 — the visual set

| # | Step | Expected |
|---|---|---|
| 6.1 | Android: tap the **+** FAB | **No residue rectangle** left behind |
| 6.2 | The screen it opens | Titled **"New chat"**, not "Contacts" |
| 6.3 | Topbar → Contacts | Still titled **"Contacts"** |
| 6.4 | Desktop: Wallet, select a transaction row | Its selected colour **matches** a selected chat row |
| 6.5 | Desktop: Account → the address block | **No Share button** — copy only |
| 6.6 | Mobile: Account → the address block | Share **is** there |
| 6.7 | ★ Desktop: **+** → Add contact | The form sits in a **640px** column, centred, title bar full width |
| 6.8 | Desktop: Apps → Add app | Also **640**, matching |
| 6.9 | ★ Desktop: log out to welcome → **Create account** and **Restore account** | The content column is capped, centred. The **gradient still bleeds full width** and the hero art is untouched |
| 6.10 | A group member with no nickname → tap the sender | The sheet TITLE is a truncated address, not the full one. The address FIELD below is still full and copyable |

---

## 7. A5 — the centre-out press fill

| # | Step | Expected |
|---|---|---|
| 7.1 | Press and hold a chat row | The tint grows from the **middle outward**, not a flat flash |
| 7.2 | Press a wallet row, a settings row, a contacts row, an **apps** row | All four behave the same |
| 7.3 | Flick-scroll the chat list | **No trail of lit rows** |
| 7.4 | Turn on Reduce Motion, press a row | Instant flat tint, no animation |

---

## 8. W1 — the bot channel switch

| # | Step | Expected |
|---|---|---|
| 8.1 | Spixi bot group → switch channel | The log paints **faster** than before. It used to always wait 250 ms |
| 8.2 | Open a normal chat | Unchanged |

---

## 9. Owed measurements, while you are on device

- **Android Release `PERF` numbers.** They decide whether any further performance work is
  worth doing. `PerfTrace` stays until they exist, and **must be deleted before release**.
- **W10 console line**, if the add-contact cap still looks wrong: open F12 on that pane and
  read `document.documentElement.hasAttribute('data-desktop')`.
- **D1 two-device test**, if you want reply-to next: is a message's id the same on both
  devices? Reactions imply yes. Five minutes, and the whole design rests on it.

---

## Dials — my calls, easy to reverse

| Item | What I chose | Reverse it by |
|---|---|---|
| A5 close | The fill **retracts to the centre** rather than fading | One line per row component |
| Add-screen cap | **640, unconditional**, both screens | Put a gate back |
| Delete-account alert | **Dropped** — welcome is the confirmation | Re-add `displaySpixiAlert` |
| Auto-save toast | Fires on **every** change | Suppress for the avatar |
