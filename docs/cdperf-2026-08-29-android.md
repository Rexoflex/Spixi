# [CDPERF] — the chat-info measurement, Android, 2026-08-29

Damir's device run, seven opens, `adb logcat | Select-String "CDPERF"`. This is the
number item 6 was waiting on. **It settles two questions and opens a third.**

## Raw

| open | constructed | document loaded | presented | content painted |
|---|---|---|---|---|
| 1 | **64 ms** | 136 | 148 | 306 |
| 2 | 11 | 117 | 127 | 278 |
| 3 | 38 | 125 | 134 | 281 |
| 4 | 12 | 100 | 109 | 267 |
| 5 | 12 | 80 | **293** | **621** |
| 6 | 12 | 106 | **266** | **562** |
| 7 | 12 | 110 | **281** | **574** |

All seven logged `group`. ⚠ Damir reports the first three were a **1:1** chat info and the
rest the bot group — see "the third question" below.

## 1 · The present-first change works, and it is measurable

`presented` now lands **10–20 ms after `document loaded`** on opens 1–4. Before this batch
that gap was the flat `await Task.Delay(120)` in `presentPreload`, so the same opens would
have presented at ~230–260 ms instead of 109–148 ms. The double-rAF ready signal costs
about two frames and buys the guarantee that the skeleton has painted.

## 2 · ★ MY STATED SUSPICION WAS WRONG, AND THE PROBE IS WHY WE KNOW

`#630` said the rest of the wait was likely `generatePage` re-localizing and rewriting a
168 KB shell on every open. **It is not.** `constructed` is **64 ms once, then 11–12 ms**.
The file write is warm after the first open and it is not worth touching. Had we "fixed"
it on the reasoning in that row we would have spent a batch on 12 ms.

What the pre-present time actually is: `document loaded` at 80–136 ms is the **WebView
document boot** — creating the WebView, parsing the shell, executing the inlined bundle.
That is the floor for this architecture, and it is the only remaining lever before present.

## 3 · ★★ THE REAL FINDING: THE **BOT ROOM** PAYS ~140 ms BEFORE IT IS PRESENTED

★ **CORRECTED by the controlled run.** The first pass said "a ROOM pays ~180 ms". That was
an inference from an UNLABELLED run and it is **wrong**. A private group presents as fast
as a 1:1. Only the bot room pays.

| open | constructed | document loaded | presented | content painted |
|---|---|---|---|---|
| **bot group** | 37 | 108 | **250** | **541** |
| **private group** | 35 | 104 | 111 | 251 |
| **1:1** | 17 | 88 | 106 | 257 |

doc → presented: **+142 ms** bot · **+7 ms** private group · **+18 ms** 1:1.
presented → content: **+291 ms** bot · +140 ms private group · +151 ms 1:1.

The mechanism is `ContactDetails.onLoad`, which runs **synchronously on the UI thread**
inside the `WebView.Navigating` handler:

```
ixian:onload  →  onNavigating  →  onLoad()      ← roster enumeration + one
                                                   sendUiCommand PER MEMBER
              →  webViewNavigating → signalPreloadReady()  ← only now
```

`loadMembers(blind)` walks `friend.users.contacts` and builds one `addMember` push per
member — a string build plus a marshal each — before the present is even *queued*. So the
scope is not "a room": it is **a room with a LARGE roster**, and the bot room is the only
surface that has one (up to the 500 cap, reshuffled by eviction). A handful of
private-group members costs nothing measurable, which the 7 ms above says outright.

★ **THE FIX is this batch's idea one step further: present BEFORE the data burst.**
`signalPreloadReady()` should run ahead of `onLoad()`'s roster work. Expected result: the
bot room presents at ~110 ms like the other two, and the skeleton covers the members
arriving — which is exactly what the skeleton is for. It touches the one surface that needs
it and leaves the two that are already fast alone.

⚠ Ordering hazard to respect: `webViewNavigating` presents AFTER the page's own handler by
multicast subscription order, deliberately (`SpixiContentPage.cs:322-326`), so this is not
a one-line reorder. It wants the present hoisted inside `ContactDetails` itself, the way a
page that sets `deferPreloadReady` calls `signalPreloadReady()` at its own reveal point.

## The `isGroup` question — ANSWERED, no defect

The controlled run logged **`contact`** for the 1:1 and `group` for both rooms. `isGroup` is
correct. The first pass's seven opens were all rooms; the 3/4 split Damir remembered was
not what happened. ✅ The `[CDPERF]` probe can be removed once the fix above is built and
re-measured — keep it until then, because it is the only way to confirm the bot room
actually moves.

## What the probe was worth

Two of the three things this measurement produced were CORRECTIONS to reasoning that
looked sound in writing: `generatePage` was not the bottleneck, and the roster cost is
bot-room-only rather than room-wide. Neither would have been caught by reading the code
more carefully — only by running it.

---

# ★★ THE SECOND MEASUREMENT — 2026-08-31, after L10 shipped

Damir's device, `adb logcat | Select-String "CDPERF"`, two consecutive opens of the **bot
group** info panel. **This is the number the probe was kept alive for, and it settles the
row.**

| | constructed | document loaded | presented | onLoad returned | roster burst | content painted |
|---|---|---|---|---|---|---|
| open 1 | 19 | 95 | **104** | 106 | **124** | 730 |
| open 2 | 39 | 133 | **139** | 140 | **155** | 579 |
| *before (bot, 2026-08-29)* | 37 | 108 | **250** | — | — | 541 |

## 1 · ★★ The present moved, and by exactly what was predicted

**250 ms → 104 ms.** `presented` now lands **9 ms after `document loaded`**, which is what a
1:1 and a private group have always done (+18 and +7). The bot room's ~140 ms penalty is
**gone**, and the prediction in the row was 110 ms.

## 2 · ★★ THE DISCRIMINATOR PASSES — the post is real

This is why the two extra log points existed. The first cut of the fix used
`MainThread.BeginInvokeOnMainThread`, which runs **inline** when already on the main thread,
so the burst never left the dispatcher turn and **nothing moved** — while `presented` would
have improved anyway and reported a success.

```
onLoad returned +106   →   roster burst +124     (open 1, +18 ms later)
onLoad returned +140   →   roster burst +155     (open 2, +15 ms later)
```

**`roster burst` is AFTER `onLoad returned` on both opens.** `Dispatcher.Dispatch` genuinely
posted; the UI thread was released; a frame could be composited in between. Had the burst
timestamp been the smaller one, the fix would have been a no-op wearing a green number.

## 3 · ⚠ AND THE HONEST HALF: time-to-CONTENT did not improve, and may be slightly worse

`content painted` is **730** and **579**, against **541** before. Two samples, one of them an
outlier, so the average is ~110 ms later.

That is the **expected trade and it should be recorded as a trade, not as a win**: the total
work is unchanged, and it has been *reordered*. Before, the roster burst finished before the
pane was ever shown. Now the pane appears at ~104 ms with its skeleton and the members land
afterwards, competing with the WebView's own first paint.

* **What the user gains:** the panel opens **146 ms sooner**, which is the complaint.
* **What it costs:** the roster completes ~110 ms later than it used to.
* ★ **This is what the skeleton is for** (#630) — but it is a trade, and if Damir would
  rather have both, the next lever is **chunking the burst** (N members per dispatcher turn)
  so the WebView can paint between chunks. ⚠ Not built: two samples do not justify more
  machinery, and #294 says measure first.

## 4 · The probe is REMOVED with this entry

Six C# log points, the `ixian:cdpainted` handler, the shell's emit and the smoke pin, in one
batch, exactly as the row required. **The numbers above are the record** — the instrument is
gone, so this table is the only place they now exist.
