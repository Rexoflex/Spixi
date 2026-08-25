# NOTIFLOG VERDICT — 2026-08-22. `notif log.txt`, Android. Closes #503.

**A1.5 PASS · A2.2 NOT ANSWERED · A2.3 no evidence · `Cannot clear notifications` still gone.**
★ Written to disk at decision time (#459 ①). Filename carries the batch (#511's collision lesson).

Log: 4,822 lines · `08-22 18:33:20.1674` → `08-22 18:35:47.8235` · **one launch, 2 min 27 s** ·
`Starting Spixi spixi-0.9.22 (xcore-0.9.8k)`. The Ixian-Core pin `097341a` **is** `xcore-0.9.8k`,
so the log comes from a build that carries this batch. The `(service-extension)` string did not
exist before #510, which is a second, independent check on the same thing.

---

## 0. ★★ THE HEADLINE: the background lane RAN, and the proof is our own string, not a badge

Four `[NOTIFDIAG]` lines in 4,822. All four, verbatim:

```
08-22 18:33:20.7524|info|1:  [NOTIFDIAG] OneSignal handlers registered in the Application (#493)
08-22 18:33:21.2276|info|14: [NOTIFDIAG] raw push suppressed by mute/global master (service-extension)
08-22 18:33:21.6143|info|12: [NOTIFDIAG] raw push suppressed by mute/global master (service-extension)
08-22 18:33:21.6955|info|14: [NOTIFDIAG] raw push suppressed by mute/global master (service-extension)
```

★★ **VERIFIED AT SOURCE, NOT READ OFF THE TICK.** `where` is a **parameter**, not a literal in the
message, and the whole tree has exactly **two** call sites that can fill it:

| producer | file:line | string |
|---|---|---|
| the foreground listener | `Spixi/Platforms/Android/SPushService.cs:536` | `"foreground"` |
| **the service extension** | `Spixi/Platforms/Android/SNotificationServiceExtension.cs:89` | `"service-extension"` |

`grep -rn 'service-extension' --include=*.cs` returns that one call site and nothing else. The
emitting line is `SPushService.cs:473`, reachable only from `decidePushUncached` ← `decidePush` ←
`SNotificationServiceExtension.OnNotificationReceived`. **Therefore
`SpixiNotificationServiceExtension.OnNotificationReceived` executed three times.**

★ **This is why the false-pass mode cannot apply here.** 2.1's "4" badge was a *UI count*, and
Samsung's bundler could wear it. This is a **program trace emitted by our own code from a call
site only our own class reaches**. No platform component can produce that string.

★ **And it settles the silent half of #503 at the same time.** `[Register]`'s Java name and the
`com.onesignal.NotificationServiceExtension` meta-data in `AndroidManifest.xml` **agree in
practice** — the SDK found the class and invoked it. Until this line, only a smoke pin said so,
and a name mismatch fails silently with no error anywhere.

## 1. What the three lines prove, and what they do not

**PROVEN**

1. The background lane runs. #503's core claim — *"the handler registers and never fires"*, 3,422
   device lines with no `raw push suppressed` — is **disproven for this build**.
2. **The mute / global-master gate is enforced INSIDE the background lane.** All three pushes took
   the `!shouldDisplayRawPush(fa)` branch and returned `Suppress`. A1.2 (master OFF) and A1.3
   (muted 1:1) passed as *symptoms* on device; they now have their *mechanism* in the log.
3. `PreventDefault(true)` did not hang anything — the process ran on normally for another
   2 min 26 s after the third suppression. The parked-coroutine failure the `javap` read avoided
   (#510) does not appear.

**NOT PROVEN — say it plainly**

1. ⚠ **`[NOTIFDIAG] push posted as a Spixi row, id keyed on the sender (#495)` (`SPushService.cs:501`)
   does NOT appear anywhere in this log.** Every push in this capture was **suppressed**; none was
   **posted**. So this log is evidence for **A1.2/A1.3**, not for A1.1 or A1.4.
2. ⚠ Therefore **A1.1's own residual doubt is untouched by this log.** "One updating row" versus
   "the platform collapsing four" still rests on a tick plus an empty note. ★ **That doubt belongs
   to #495's id keying, not to #503's lane** — and the mechanism that made the last false pass
   possible (the lane not running, so the SDK posted raw rows for the bundler to collapse) is now
   positively excluded. See §4.
3. ⚠ **This capture cannot distinguish a push-woken cold start from a user launch.** The three
   extension lines land **1.06 s / 1.45 s / 1.53 s after `Starting Spixi`** and 0.47 s after handler
   registration. That ordering is what a push-woken process start looks like — and FCM does not
   replay already-delivered pushes at launch, which favours that reading — but the log alone cannot
   force it. **The clean discriminator is a `(service-extension)` line whose timestamp is NOT within
   a few seconds of a `Starting Spixi` line.** This log has none.

## 2. A2.2 and A2.3 — the second question, answered honestly as "not yet"

| row | expected | found |
|---|---|---|
| **A2.2** | `(foreground)` and **no** `already decided` | ⚠ **no `(foreground)` line anywhere.** 0 occurrences in 4,822 lines |
| **A2.3** | `already decided`, if both lanes fire | **0 occurrences.** Verified the string exists in this tree at `SPushService.cs:410` |

★ **A2.2 is NOT a pass.** The absence of `already decided` is only half of what A2.2 asks for, and
the half that is missing — a `(foreground)` line — is the half that shows the foreground lane was
exercised at all. **This capture does not cover A2.1.** A2.2 stays owed.

★ **What the log DOES say about the bytecode question, with its sample size stated:** for these
**three** notification ids, **exactly one lane fired**. The handlers were registered at
`18:33:20.7524`, **0.47 s BEFORE** the first push — so the foreground listener was live and still
did not fire. The idempotence cache (`decidedPushes`, keyed on notification id) was **never
exercised**, and is therefore still unproven in practice rather than shown unnecessary. n = 3, all
within 0.5 s of each other, on a process under 1.6 s old. **Not enough to conclude the two surfaces
are mutually exclusive.** Recorded either way, as asked.

## 3. `Cannot clear notifications` — GONE, confirmed, not assumed

The string exists in this tree at `SPushService.cs:198` (`Logging.warn`), and #503 records that it
appeared **twice on a normal start** before #493. **This log IS a normal start** — it opens at
`Starting Spixi` — and the string occurs **0 times**. ✅ **No regression. #493's half still holds.**

## 4. ★ THE CALL: #503 CLOSES

**A1.5's own acceptance criterion, written before the log existed, is:** *"`[NOTIFDIAG] raw push
suppressed…` **or** `…posted as a Spixi row…` with `(service-extension)`."* The first form is
present, three times, produced by a call site only the extension reaches. **A1.5 passes on its own
terms, and it is the row the whole batch was named for.**

With A1.1–A1.4 already passing on a killed app on hardware, and the lane now demonstrably alive:

* the **symptoms** pass on device, and
* the **mechanism** that produces them is in the log.

★ **That is what closing a row is supposed to look like**, and it is exactly what #503 did not have
last round: last round the symptoms passed while the lane provably did nothing, which is why a tick
could not be trusted. The tick and the trace now agree.

⚠ **Two things stay open and neither blocks the close:**

| | |
|---|---|
| **A1.1's row-count note** | still empty, and no `posted as a Spixi row` line exists yet. Carried to **#495**, whose id keying it actually tests — not to #503 |
| **A2.2** | still owed. One line of log from an app that is OPEN when a message arrives |

## 5. ⚠ AN UNREQUESTED FINDING, AND IT IS LARGE: a continuous decrypt-failure loop

Nobody asked for this. It is in the log and it should not go unreported.

**1,397 `|error|` lines in 2 min 27 s**, and they are **not a startup burst** — they run from
`18:33:28.86` to `18:35:46.87`, i.e. to the **last second of the capture**, on network threads 25
and 27.

| count | error |
|---|---|
| 447 | `Exception occured in StreamProcessor.receiveData: System.ArgumentNullException … bytes` |
| 392 | `Error in chacha decryption … InvalidCipherTextException: mac check in ChaCha20Poly1305 failed` |
| 110 | `Cannot decrypt message, no AES and CHACHA keys were provided.` |
| ~447 | `Exception … construct SpixiMessage from bytes: Data length is negative: …` |

★★ **The shape is the finding.** The negative-length exception carries the decoded length in its
message, and there are only **eight distinct values** — `-494369794`, `-490898821`, `-2143484945`,
`-2038621759`, `-1903019248`, `-15960088`, `-154110444`, `-599744828` — each appearing **55 or 56
times**. **The same eight undecryptable payloads are re-processed about 56 times each inside 2.5
minutes.** That is a retry loop, not eight bad messages.

⚠ **This is stated as an observation with a discriminator, NOT as a diagnosis, and NOTHING is built
on it (#294).** What it is worth here:

* It bears on **`decidePush`**, which calls `OfflinePushMessages.fetchPushMessages(true, true)` as
  its first gate. A fetch that keeps returning the same undecryptable payloads is on the #503 path.
* ★ It bears on the **idle-sound report** only in this narrow sense: **the log shows an "idle" app
  is not idle.** It burns a hot loop the whole time it is open. ⚠ It does **not** name a sound
  trigger, and no sound trigger may be touched on the strength of it. **The four `Logging.info`
  calls come first** — that is item 2, and it is unchanged by this finding.
* Discriminator worth one question: is this **one peer** or many? Threads 25 and 27 suggest few.

## 6. What was read, so the next reader can re-run it

```
grep -c "NOTIFDIAG"                 → 4      (all four quoted in §0)
grep -c "service-extension"         → 3
grep -c "foreground"                → 0
grep -ci "already decided"          → 0
grep -ci "Cannot clear notification"→ 0
grep -c "posted as a Spixi row"     → 0
grep -c "|error|"                   → 1397
grep -rn "decidePush(" --include=*.cs  → the two call sites in the §0 table
```
