# N40 triage — "Connecting…" stops showing after long use (D-21 candidate)

**Status: TRIAGE COMPLETE — NO CODE WRITTEN** (#380 budget mode, scope was
triage only). Prime suspect NAMED and traced in code. One **zero-device**
check can confirm it before any repro session.

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.** See `CLAUDE.md`.

Symptom (Damir, list 2): the "Connecting…" state stops appearing on a LIVE
document after long app use while offline. Distinct from **D-20 (#357)**,
which killed the state on a FRESH document (language re-bake) and is fixed.

---

## 1. The machine, in one place

| Part | Site |
|---|---|
| Tick | `Node.updateUILoop` — 2 s, gated on `running` (`Meta/Node.cs:389-407`) |
| Tick gates | `HomePage.OnUpdateUI` — returns unless `App.isInForeground`, then ticks only the page that is **last in the NavigationStack** (`HomePage.xaml.cs:2404-2442`) |
| The block | `HomePage.updateScreen` `try` at `:2335-2381` |
| Update branch | `:2342` compare → `:2344` push `showWarning("<update available>")` |
| Online branch | `:2349` `getConnectedClients(true).Count() > 0` → `:2351-2356` clear |
| Offline branch | `:2360-2371` delay counter → push `global-connecting-dlt` |
| Latch | `warningDisplayed`, `volatile` (`:146`); resets at `:1486` (onLoaded), `:2854`, `:2873` |
| Version source | `checkForUpdate` (`:2746-2755`) → `UpdateVerify` |
| Version config | `Config.cs:44` `version = "spixi-0.9.22"` · `:46` `https://resources.ixian.io/spixi-update.txt` · `:47` **check period = 1 hour** |
| Shell | `home.html:2843-2852` `showWarning` — connectivity text → topbar TITLE-state, anything else → the banner. `CONNECTIVITY_TEXTS` at `:583-589` |
| Chat twin | `SingleChatPage.xaml.cs:2475-2513` — the same connectivity code **without** an update branch |

---

## 2. Verdict — M1 (update-branch starvation) is the prime suspect

The update test and the connectivity test are the two arms of ONE
`if/else` (`:2342` / `:2346`). When the update arm wins, the connectivity
arm **never runs**:

1. Offline → the offline branch pushes `global-connecting-dlt` and sets
   `warningDisplayed = true`. The title shows "Connecting…". Correct.
2. `UpdateVerify` completes with a server version above `0.9.22`.
   Until it completes, `checkForUpdate` returns `"(checking)"` /
   `"(not checked)"` / `"(error)"` — every sentinel starts with `(`, so
   `:2340` substitutes `cur_version` and the compare is 0 → the
   connectivity arm runs. **This is why the state works at first.**
3. From that tick on, the update arm wins every 2 s. The shell then
   CLEARS the title-state, because `showWarning` routes any
   unrecognised text to the banner and calls
   `setChatsTitleState('')` (`home.html:2848-2851`).
4. `warningDisplayed` stays **`true` forever** — the update arm never
   assigns it. So even if the block reached the connectivity arm again,
   the offline push is guarded by `if (!warningDisplayed)` (`:2363`).
5. Result: no "Connecting…" on a live document, permanently, while
   offline. No document replacement is needed. This matches the symptom
   exactly.

**Why "after long use":** the check is asynchronous and re-runs on a
**1-hour** period (`Config.cs:47`). The window in which the app is
honest is the window before the first successful check.

This is the same suspect the #357 loop r1 note recorded. It is now traced
end to end, and the second-order defect is named: **the update arm does not
own the latch it competes for.**

### ★ RESULT of the zero-device check (Damir, 2026-08-18)

The served file advertises **0.9.22 — the same number as the real build**
(`Config.cs:44`). The compare is therefore 0 on an unmodified build, the update
arm never wins, and **M1 cannot explain the symptom as observed** unless the
device was running an older build at the time.

**What this changes.** The #383 fix stays correct and necessary — the starvation
is real and fires for every user the moment 0.9.23 is published — but it is NOT
proven to be what Damir saw. **§4 stays live**, and its step 2 (a long offline
soak on an unmodified 0.9.22 build) is now the decisive leg. If "Connecting…"
disappears again there, the live mechanism is M2, M3 or M4 below, and step 4
(home versus the chat screen) splits them.

### The zero-device check — how it was run

Open `https://resources.ixian.io/spixi-update.txt` in any browser and read
the version it serves.

* **Served version > 0.9.22** → M1 is confirmed by construction. Every
  device on this build loses the offline indicator one hour after boot.
  No repro session is needed; go straight to the fix.
* **Served version ≤ 0.9.22** → M1 cannot fire on this build. Run the
  protocol in §4.

---

## 3. The other mechanisms, and what each one looks like

| # | Mechanism | Fits? | Sign on the device |
|---|---|---|---|
| **M1** | Update arm starves the connectivity arm (§2) | ★ best | The **update banner is visible** on the chats tab while "Connecting…" is absent |
| **M2** | Phantom connected client — `getConnectedClients(true) > 0` while the app is really offline, so the ONLINE arm clears the state (`:2351-2355`). Sub-case: flaky connectivity resets `connectivityWarningDelayCounter` (`:2356`) before the 2-tick delay completes, so the push never fires | plausible | **Neither** home **nor** the chat screen shows the state — the chat twin uses the same gate (`SingleChatPage:2476`) |
| **M3** | Tick starvation — `App.isInForeground` false, `running` false, or HomePage not last in the NavigationStack (`:2404-2426`) | plausible | The dev HUD freezes (see §4) and balances/timestamps stop moving |
| **M4** | Exception starvation — anything in the `try` throws (a malformed `UpdateVerify.serverVersion` reaching `compareVersionsWithSuffix`), so the `catch` at `:2378` skips the connectivity arm on every tick | plausible | The log repeats `Exception occurred in HomePage.UpdateScreen` every 2 s |
| **M5** | D-20 class on a live document — the shell lost the title node while the latch stayed true | low | Only after a WebView reload that did NOT re-fire `ixian:onload` (an Android renderer restart). `onLoaded` (`:1486`) heals every normal reload |

**The sharpest single discriminator:** the chat screen has the same
connectivity code and **no** update arm. So:

* home silent **and** chat shows "Connecting…" → the fault is home-only →
  **M1** or **M4**.
* both silent → the shared gate is lying → **M2**.

---

## 4. Repro protocol (only if the §2 check does not settle it)

Do this on one device, in this order. Each step is a decision, not a
measurement.

1. **Arm the HUD.** Tap the chats title 10 times (dev mode,
   `home.html:550-566`). The HUD updates on the same 2 s tick
   (`updateDebugOverlay`, `:2284-2296`).
2. **Go offline** (flight mode) and stay in the app until the state is
   gone. Note the elapsed time — **cross the 1-hour mark**
   (`Config.cs:47`); that is the M1 window.
3. **Read the screen** when the state is gone:
   * Is an **update banner** on the chats tab? → **M1. Stop.**
   * Do the HUD numbers still move? **No** → **M3. Stop.**
4. **Open any chat.** Does the chat screen show "Connecting…"?
   * **Yes** → home-only → M1 or M4 → go to 5.
   * **No** → **M2** (the shared `getConnectedClients(true)` gate returns
     a phantom client). Capture the connection state from the log.
5. **Read the log** for the 2 s cadence:
   * `Exception occurred in HomePage.UpdateScreen` repeating → **M4**;
     the exception text names the throwing call.
   * No exception → **M1** with the banner not visible (short or
     scrolled copy) — confirm against the served version file.

**Log lines that decide it** (all already in the code, nothing to add):

| Line | Means |
|---|---|
| `Exception occurred in HomePage.UpdateScreen: …` (`:2380`, `:2400`) | M4 — the connectivity arm is skipped |
| `Exception occurred in updateUILoop: …` (`Node.cs:404`, `Node.cs:415`) | M3 — the tick itself is failing |
| `Error in selecting start screen: …` (`:2316`) | an early `return` inside `updateScreen` (`:2319`) — the whole block is skipped that tick |

---

## 5. Fix shape — NOT built, for the R-round that takes N40

All three parts are small and C#-side. They are listed so the next
session does not re-derive them; **none is authorised by this session.**

1. **The update arm must own its latch.** Set `warningDisplayed = true`
   beside the push at `:2344`, so the state machine stays coherent.
2. **Connectivity must outrank an update notice**, or the two must share
   the surface. Today an available update permanently hides an offline
   app. Evaluate connectivity FIRST and let the update notice take the
   banner only while the app is connected — the shell already routes the
   two to different surfaces (title-state vs banner,
   `home.html:2848-2851`), so both can be visible at once. **Design dial
   (Damir):** show both, or keep one arm.
3. **Do not let the version check starve the block.** Move the
   update `try` below the connectivity block, or give the update
   computation its own `try`, so a throw at `:2378` can never take the
   connectivity state with it (M4).

⚠ `SingleChatPage` needs no change — it has no update arm.
