# F5 checklist — 2026-08-20, the device round (#454–#459)

**Read `docs/handoff-2026-08-21.md` first.** This sheet is the acceptance test.

⚠ **C# changed in six files** → wipe `obj` and `bin` before building (#387).
⚠ **PowerShell.** `rmdir /s /q` is CMD and silently does nothing. No unquoted parentheses.
A quoted path at the start of a line needs the call operator `&`.

---

## 0. Build

Run these ONE AT A TIME. Expected output is in the table under each block.

```powershell
Remove-Item -Recurse -Force .\Spixi\obj, .\Spixi\bin -ErrorAction SilentlyContinue
```

```powershell
node scripts\build-demo-bundle.mjs
node scripts\build-shells.mjs
node scripts\smoke-test.mjs
```

| Step | Expect exactly |
|---|---|
| `build-demo-bundle` | `bundle written: … 273 exports` |
| `build-shells` | `18 shell(s) written` |
| `smoke-test` | `BASELINE OK — 2280 pass / the 4 KNOWN pre-existers` |

Optional, new this batch — it needs one npm install and then takes about a second:

```powershell
npm install --no-save tree-sitter tree-sitter-c-sharp
node scripts\cs-syntax-check.mjs
```

| Step | Expect exactly |
|---|---|
| `cs-syntax-check` | `137 file(s) parse cleanly ✓ · 1 skipped for a known grammar gap` |

**Check the phone is on adb BEFORE the run step** (#450) — `-t:Run` only looks for a
device at the END of the build, so a phone adb cannot see costs you the whole build first.

```powershell
adb kill-server; adb start-server; adb devices
```

`device` = ready · `unauthorized` = unlock the phone and tick *Always allow* ·
`offline` = replug · nothing listed = the USB notification must be **File Transfer / MTP**.

```powershell
dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release
```

```powershell
dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -t:Run
```

---

## 1. ★ THE LOCK (#454) — this is the acceptance test

Turn the app lock ON first. Then, for each row: open the screen, press Home, wait
about ten seconds, and come back.

| # | Do this | Expect | This is the row that failed before |
|---|---|---|---|
| 1.1 | Chats list → Home → return | The lock, immediately. **No chat list, not even for a frame** | ★ yes |
| 1.2 | Open a conversation → Home → return | The lock. No message text at any point | ★ yes |
| 1.3 | Wallet tab → Home → return | The lock. No balance, no rows | ★ yes |
| 1.4 | Account → Home → return | The lock. No address | ★ yes |
| 1.5 | Open any sheet, leave it open → Home → return | The lock over it | ★ yes |
| 1.6 | Switch apps and come straight back (under a second) | The lock, then the password. Not the old screen | |
| 1.7 | Unlock, then within 5 seconds press Home and return | Straight back in, **no password asked** | cooldown, unchanged |
| 1.8 | Unlock, wait 10 s, press Home, return | Password required | cooldown, unchanged |

### 1.8b ★ #461 — the task-switcher thumbnail
With the lock ON, background the app and open the task switcher.

| Expect | Not |
|---|---|
| A blank / icon placeholder where Spixi's thumbnail was | Your chat list |

This is the SAME picture as the resume flash — Android draws the snapshot during the
app-open animation, before your app draws anything. That is why 1.1–1.5 still showed the
chat list briefly after the first build.

Then confirm the trade you were promised: with the lock on, **take a screenshot inside
Spixi**. It must still work — this uses `setRecentsScreenshotEnabled`, not `FLAG_SECURE`.

And confirm it is symmetric: turn the app lock **OFF**, background, open the task
switcher → the thumbnail is **back**.

### 1.9 ★ #460 — fingerprint must appear, and this one FAILED on the first build
Lock the app, background it, wait, return.

| Expect | Not |
|---|---|
| The fingerprint prompt, **on the way back** | Straight to the Spixi password field |

This is the leg you found first. The guard was on `App.isInForeground`, which is cleared
at Android's **OnStop** — one step after the **OnPause** where the lock is created — so it
was still true and did nothing. The prompt fired into the pausing activity, androidx
cancelled it, and the attempt latched. It is an explicit latch now.

### 1.10 ★ #234 — the Cancel bypass is closed
On the lock you get after backgrounding: **there must be no Cancel button and no
"use a different wallet" link.** Before this batch, Cancel opened the app without the
password. Then confirm the escape survives: force-stop Spixi and reopen it → the
COLD-START lock **does** still offer "use a different wallet" → it leads to setup.

### 1.11 Things that must NOT lock
| Do this | Expect |
|---|---|
| Attach a file or pick an avatar, then come back | No lock |
| Split screen: put Spixi beside another app, tap the other pane | **No lock.** Spixi keeps showing its screen |
| Turn the app lock OFF, then background and return | No lock, and **no dark flash** |

⚠ **C3.1.** You reported a flash on the lock-OFF path too. I could not find a repro for
it and did not guess (#294). If you still see it, tell me **which screen** and whether it
is dark or light — the lock path cannot cause it now, so it is something else.

### 1.12 C4.1 — cold start
Force-stop and reopen. Expect **dark screen → spinner → the fingerprint prompt**.
The password form must NOT flash before the prompt. Cancel the prompt → the form appears.

---

## 2. G5 — Account share (#455)

Account → the address row → the **rightmost** icon.

| Expect | Not |
|---|---|
| The Android share sheet | A "Copied" toast |

The middle icon is still Copy — it shows a check-mark morph, no toast. Those two
behaviours are how you tell which button you actually hit.

---

## 3. #449 — the tx header address

You need a counterparty with **no nickname**. Wallet → tap that transaction.

| Where | Expect |
|---|---|
| The list row | `4JsLSm…bncdFa` (already correct before) |
| ★ The sheet header, under "Sent to" | `4JsLSm…bncdFa` — **truncated, same as the row** |
| Inside "See details" | The FULL address, with the copy button. This one is meant to be full |

The row and the header disagreeing on one screen was the bug.

---

## 4. #456 — a fresh wallet

Needs a **newly created** wallet (not restored), with no transactions and no balance.

| Expect | Not |
|---|---|
| Hero, then "No activity yet" | A "Checking for your transactions" row |
| No "Missing a transaction?" pill either | |

Then check it comes back honestly: on a **restored** wallet, or once any balance or
transaction arrives, the scan row must appear as before.

---

## 5. Re-test — the eight fixes from the last round you have not seen

These landed after your sweep and are untested. Walk §B, §D and §G of
`docs/f5-scenarios-2026-08-20.md` against this build.

| # | Check |
|---|---|
| 5.1 | The scan row anchors correctly across an app restart (does not fall back to 0%) |
| 5.2 | The scan row has the same left/right inset as the tools row above it |
| 5.3 | The tx header is two lines — kicker over counterparty |
| 5.4 | Status sits inside the drawer, not twice on one screen |
| 5.5 | The tx sheet has a Close button under the explorer CTA |
| 5.6 | The wallet zero state shows the glyph tile, no illustration |
| 5.7 | The address explainer is a text action **under** the address row |
| 5.8 | A pending tx: hide balances → open detail → "Show amounts" → the card is **not blank** |

---

## What I did NOT do, and why

| | |
|---|---|
| `FLAG_SECURE` | Not used — `setRecentsScreenshotEnabled` gives the blank thumbnail without costing your screenshots (#461). Below Android 13 nothing is applied at all |
| C3.1, the lock-OFF flash | No repro, no file:line. #294 |
| Reply-to | Held for the BE cutover. Five smoke pins fail if the Core carrier sneaks back |
| iOS / Windows lock | The pause hook is Android only. Neither platform has been on a device for six batches — I did not change them blind |
