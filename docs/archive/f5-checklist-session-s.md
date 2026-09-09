# F5 checklist — Session S (2026-09-08)

Batch: **#811**. `src/shells/settings.html` + `scripts/smoke-test.mjs` + the rebuilt
`Spixi/Resources/Raw/html/settings.html`. **No C# changed. No component changed.**

```
node scripts/build-shells.mjs settings     # already run in-session; re-run to be sure
node scripts/smoke-test.mjs                # expect the 3 known pre-existers, +3 assertions
node scripts/strip-release.mjs --check <deployed>    # optional, unchanged by this batch
```

⚠ **No `obj`/`bin` wipe is needed** — nothing under `Spixi/**.cs` moved. Android: build and
run as usual. Windows: **F5, never `dotnet build`** (#663).

---

## §1 — THE ONE TAP. It decides the whole session, and it needs no tools.

This is your own iOS walk row **L3**, asked on Android.

> Open **Account → Backup**.

| what you see | what it means | what happens next |
|---|---|---|
| It **slides in** from the right, the Account's own top bar stays, no white flash, no full-screen page swap | **#804 is live in this build.** Candidate 1 is dead | go to §2 — the jank is real and the probe will name it |
| The **whole screen swaps** to a new page (the How-to-use row does NOT do this) | **#804 is NOT in the build you judged.** The three rows are still on the old pushed-page route | nothing to fix. Rebuild from `e4ae4c4c` or later and re-judge. §2 and §3 are then the confirmation, not the hunt |

Do the same for **Change password** and **Downloads**. How-to-use is the reference: it has
always been a sublevel and you describe it as opening "just nicely".

★ Answer this row before reading any further. Everything below assumes the slide.

---

## §2 — THE NUMBERS. Eight lines of logcat, and they cost one tap each.

A temporary probe is in this build. Every Account sublevel now stamps what it cost.

```
adb logcat -c
adb logcat | grep "CDPERF] settings-sub"
```

Then, in the app: **How to use → back → Backup → back → Change password → back → Downloads → back.**

You get, per row:

```
[CDPERF] settings-sub backup build=6ms      ← the synchronous render (buildScreen + insert)
[CDPERF] settings-sub backup paint=21ms     ← tap → the frame the browser COMMITTED
[CDPERF] settings-sub downloads list=169ms n=12   ← downloads only: tap → the list on glass
```

**How to read it, and the reference numbers are a desktop x86 through the same probe:**

| reading | means |
|---|---|
| `paint` on Backup / Change password is close to `paint` on **How to use** | the screens cost the same, and what you feel is NOT the screen build. The mechanism is outside the WebView — go to §3 |
| `paint` on Backup / Change password is **2× or more** How-to-use's | the screen build IS the cost on your device, and the probe has named which of `build` (JS) and `paint` (JS + frame) carries it |
| `list=` is large, or `n=` is large | **this one is already explained.** `loadDownloads` sends one `addFile` marshal per file, each its own `EvaluateJavaScriptAsync`, each after a `File.GetCreationTime` stat, on the UI thread, and the request fires at the START of the 300 ms slide. The batch fix is specified and ready (#811 §3) and is gated on your `n=` |

★ **`n=` is the number this session could not get.** If your Downloads is empty or nearly so,
the one mechanism the measurements found cannot be what you are feeling — say so and the
Downloads work does not get built.

⚠ Nothing should stamp when you go BACK to the hub, and nothing should stamp twice for one
tap. If either happens, the hook is wrong — report it, do not work around it.

---

## §3 — the paired gfxinfo capture. #804 asked for it and it has never come back.

Unchanged from `docs/f5-checklist-session-q.md` §3, and the rules are what make it mean
anything:

* **Arm A — the Account minute:** Backup → back → Change password → back → Downloads → back, ×3.
* **Arm B — the control:** scroll 50 conversations and open three.

```
adb shell dumpsys gfxinfo com.ixilabs.spixi.dev reset
   … the arm …
adb shell dumpsys gfxinfo com.ixilabs.spixi.dev
```

Record **Total frames · Janky % · 90th / 95th / 99th · GPU time**, and:

* battery temperature at the **start and end** of every capture;
* **end − start > 3 °C VOIDS that capture** — cool the phone and run it again;
* the two arms must **start within 1 °C** of each other;
* run **A → B → B → A** to cancel drift;
* state the profile. Use the **empty** account or the **light** seed. ⚠ Never the heavy
  seed (10 × 1000) — on that profile no number means anything.

Reference, from #803 before #804: **Account 12.19 % janky, 99th 48 ms, GPU idle at 11 ms;
control 4.09 %.**

---

## §4 — the pin (no device needed)

`node scripts/smoke-test.mjs` — three new assertions:

* the `[CDPERF] settings-sub` probe is present in the source **and in the built shell**;
* **GATE 44 (a)** actually RUNS `scripts/strip-release.mjs` through a symlinked path;
* **GATE 44 (b)** walks every main-module guard under `scripts/`.

⚠ **(a) creates a directory junction in your temp folder and removes it.** It needs no
elevation on Windows. If it fails, the pin goes RED and prints the reason — that is the
property it exists to defend.

---

## §5 — M13, the i18n batch (#812). Different build sequence, read this.

This batch changed components, strings and every shell, so it is the **FULL** pipeline, not
`build-shells settings`:

```
node scripts/extract-strings.mjs      # expect 788 keys (was 786), 0 fallback conflicts
node scripts/build-locales.mjs
node scripts/build-strings-iife.mjs
node scripts/build-demo-bundle.mjs
node scripts/build-shells.mjs
node scripts/smoke-test.mjs
node scripts/i18n-lint.mjs && node scripts/pseudo-locale-smoke.mjs && node scripts/verify-locales.mjs
```

**What to check on the device — it is a11y, so use the reader, not your eyes:**

| # | do | expect |
|---|---|---|
| M1 | Set the language to **Deutsch**. Turn on TalkBack (Android) or VoiceOver (iOS). Open **Account → Backup** and focus the back arrow. | It says **"Zurück"**, not "Back". Before this batch every shell said "Back" in all 12 languages. |
| M2 | Focus the bottom navigation bar as a landmark. | The landmark is named from the dictionary, not "Main". |
| M3 | Open any screen while it is still loading and focus the spinner. | It says **"Wird geladen"**, not "Loading". |
| M4 | Switch back to English and repeat M1. | Everything reads in English again — the attribute is still the fallback. |
| M5 | Nothing visible changed. | ★ This batch touches only accessible names. If any VISIBLE text moved or changed, that is a regression, not the feature. |

⚠ **The other half of M13 is yours, not code:** `verify-locales` reports 15 (ru-ru) to 76
(it-it) keys per locale that are still English. That is the translator pass.

## §6 — the bubble grouping dial (#813)

`build-shells` only (CSS/token change, no component, no bundle rebuild needed — but the full
sequence in §5 covers it).

| # | do | expect |
|---|---|---|
| G1 | Open the chat in your screenshot — the run of received messages. | They read as **one block**: **1px** between them (dial D, your pick), and the shared corners are 4px instead of 8px. The gap BETWEEN runs is unchanged at 10px, so the contrast is larger, not just tighter — run pitch 33px against a 42px break. |
| G2 | Look at a single message with nothing before or after it. | Unchanged — fully rounded, 18px, with its tail. |
| G3 | Look at chips, cards, the attach sheet, the tx rows. | ★ Unchanged. The grouped corners used to read the SHARED `--radius-8`; they have their own token now, which is the point of the change. |
| G4 | Sanity: is D too tight on a long run of multi-line messages? | The sheet was single-line bubbles. If a run of wrapped messages reads as a wall, C (2px) is one token back — the ladder is in the `--bubble-gap-inner` comment. |

## §7 — the glass separators (#816) + the grouping window (#814)

`build-shells` only — CSS, tokens and one shell constant. No component, no bundle change.

| # | do | expect |
|---|---|---|
| S1 | Open a chat with a date break, both themes. | The **Today / Yesterday** pill is frosted — translucent, the pattern softly visible through it, a hairline instead of a chip. |
| S2 | Open a chat with unread messages. | The **unread strip stays FULL WIDTH** (your call) and is frosted the same way. |
| S3 | ★ Scroll that chat hard, up and down. | No new stutter. Main-thread cost measured identical (90 vs 91 ms) but **that instrument cannot see the GPU** — this row is the real test. If it stutters, say so: the fallback tint (option C) is a one-block change. |
| S4 | ★ `dumpsys gfxinfo` GPU column, before/after. | The one number this session could not take. Same protocol as §3. |
| S5 | #General: **Mary's 05:04 and 05:06 messages**. | ONE avatar and ONE name label, not two. The grouping window went 90 s → 5 min. |
| S6 | Two messages from the same person **more than 5 minutes apart**. | Still separate — a new avatar and label. That break is intentional. |
| S7 | A group where two different people post within a minute of each other. | ★ Each keeps their OWN label and avatar. The wider window makes the sender check load-bearing; this is the row that would catch #356 coming back. |

## §8 — the chat row inset (#817)

`build-shells` only.

| # | do | expect |
|---|---|---|
| I1 | Open any chat. | Bubbles sit **8 px further out** on both sides — the body is now where the tail tip used to be (24→16 px), the tip at 8 px. Longer messages wrap one line later. |
| I2 | Long-press to enter selection mode. | ★ The selection tick moved out with the rows. It reads the same token by design (Session J) — but it is a second thing to look at. |
| I3 | A group chat with avatars. | The avatar column is unchanged (12 px, aligned to the composer ⊕). Only the opposite edge moved. |
| I4 | ★ Your dial. | The composer pill's edge is 12 px, so the tail tip now sits 4 px outside it. WhatsApp does the same. If it reads wrong, `20px` puts the tip exactly on the composer edge — third arm of `docs/sheets/session-s/bubble-inset.png`. |

## §9 — the composer inset (#818)

| # | do | expect |
|---|---|---|
| C1 | Open a 1:1 chat. | The composer pill, the ⊕ and the send disc all sit **8 px** off the screen edges (was 12). |
| C2 | ★ Open a GROUP chat. | The **avatar's left edge and the ⊕'s left edge are the same line.** That alignment is the only reason `--bubble-avatar-inset` exists, and it lives in a different file from the composer — moving one without the other is the failure this row catches. |
| C3 | Look at the whole edge. | Bubble tail tip 8 · composer 8 · avatar column 8. The bubble BODY stays at 16 — a two-step rhythm, not a miss. |

## §10 — the Privacy Policy is live (#819)

Needs `build-demo-bundle` → `build-shells` (the legal text lives in the shared bundle).

| # | do | expect |
|---|---|---|
| P1 | Account → **Privacy Policy**. | The **FULL document** — 18 sections — not the three-paragraph summary. |
| P2 | Find §4.3 "How long it is held" and the §11 retention table. | Both say an undelivered message is **discarded after 30 days**, and that a delivered one is deleted automatically on fetch. |
| P3 | Read §4.4 (OneSignal). | No `(Updated Session G/#708: …)` note. The paragraph itself is unchanged and still correct. |
| P4 | Account → **Terms**. | Unchanged — it was never held. |
| P5 | The create/restore consent line. | Still opens both documents. |

## What is NOT in this batch

* No fix for Backup or Change password. Nothing measured named one (#294).
* No fix for M13's VISIBLE English — there isn't any left. See DECISIONS #812.
* No Downloads batch transport. Specified, ready, gated on `n=` from §2.
* The probe is **TEMPORARY** and a pin holds it in place. It comes out with its pin once
  the numbers have named the mechanism.
