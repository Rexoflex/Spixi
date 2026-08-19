# F5 checklist — R3, the art round (#428–#432)

**Build first, in this order.** Bundle BEFORE shells, always.

| Step | Command | Expect |
|---|---|---|
| 1 | `node scripts/extract-strings.mjs` | 708 keys · 0 fallback conflicts |
| 2 | `node scripts/build-locales.mjs` | 12 locales, no error |
| 3 | `node scripts/build-strings-iife.mjs` | wrote `src/demo/strings.iife.js` |
| 4 | `node scripts/build-demo-bundle.mjs` | 267 exports |
| 5 | `node scripts/build-shells.mjs` | 18 shells written |
| 6 | `node scripts/i18n-lint.mjs` | no hardcoded strings |
| 7 | `node scripts/pseudo-locale-smoke.mjs` | 9/9 |
| 8 | `node scripts/smoke-test.mjs` | **BASELINE OK — the 4 known pre-existers only** |
| 9 | `dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -t:Run` | no C# changed this batch — no `obj`/`bin` wipe needed |

⚠ **No C# file was touched in R3.** If a row below looks wrong, suspect a stale
build artifact before suspecting the code — the shells are inlined at step 5, and
an incremental deploy does not always repackage `Raw/html` (#320).

---

## §1 — N82(a) the light canvas

| # | Do | Expect |
|---|---|---|
| 1.1 | Light mode. Open any conversation. | The canvas is a cool light grey, not the warm cream. No yellow cast under the white incoming bubbles. |
| 1.2 | Look at an incoming (white) bubble against the canvas. | It reads as a distinct card, more clearly than before — separation went 1.034 → 1.083. |

## §2 — N82(b) the bubble hairline, OFF in BOTH themes

Your pick, made on the rendered comparison.

| # | Do | Expect |
|---|---|---|
| 2.1 | Light chat. | No 1px outline on incoming bubbles. |
| 2.2 | **Dark chat.** | No outline either. ⚠ This is the half you were shown and chose: dark bubbles now separate on their own **1.120** against the ground, where the hairline was reading **1.281**. If dark now feels flat, say so — restoring dark alone is one line in `tokens.css` and the eight rules that draw it were deliberately kept. |
| 2.3 | Media tile · typing pill · payment/app/call/file cards · the unread divider. | Same treatment as the bubbles — all eight surfaces read one token, so none of them can drift from the bubble. |
| 2.4 | Account → Chat appearance, the preview bubble. | Matches the real chat exactly, in both themes. |

## §3 — N82(c) the security notice, DARK ONLY

| # | Do | Expect |
|---|---|---|
| 3.1 | **Dark.** Open a brand-new chat so the secure notice shows. | Deep saturated navy card with a blue edge. It should read as sitting ABOVE the thread — its edge is 2.19:1 where the retired bubble hairline was 1.281. |
| 3.2 | ⚠ **Light.** Same screen. | **Unchanged from before this batch** — same grey card, same ink. This was your explicit constraint and it is the easiest half to break by accident. If light looks different, that is a bug. |
| 3.3 | Read the notice text and tap "Learn more" in dark. | Title/body/link all legible (13.99 / 8.93 / 6.37) — all better than on the old grey card. |

🟡 **Flagged, not fixed:** the light notice and the media tile ride
`--surface-neutral-02` (`#edf0f2`), which is DARKER than the new canvas, so their
separation moved **1.107 → 1.057** and they now carry no edge. Acting on it would
have changed the light notice, which you ruled out. Your dial.

## §4 — N19 the connecting line

Force it: turn Wi-Fi and mobile data off, or put the phone in airplane mode, then
watch the top of the screen.

| # | Do | Expect |
|---|---|---|
| 4.1 | Go offline on the **Chats** tab. | The title becomes "Connecting…" AND an animated blue gradient sweeps left-to-right along the bar's bottom edge. The bar's own hairline is gone while it sweeps — the sweep IS the border. |
| 4.2 | Switch to the **Apps** tab while still offline. | Same line there. (#322 put the title state on all three tabs; a line on one bar only would re-open that.) |
| 4.3 | Switch to the **Wallet** tab. | Title state only, **no line** — the hero is not a topbar and its bottom corners are rounded, so a straight sweep would cut them. Deliberate; tell me if you want it. |
| 4.4 | Open a **conversation** while offline. | The chat topbar carries the line too, and the presence sub reads "Connecting…". |
| 4.5 | While offline in a chat, let a presence/nick push land (or switch bot channels). | ⚠ The line SURVIVES. The chat topbar is rebuilt on six triggers; if the line blinks off after a tick, the state-driven apply regressed. |
| 4.6 | Come back online. | Line and title clear together on every surface. A line that outlives the state is the failure to report. |
| 4.7 | Trigger a non-connectivity warning (an update notice). | Banner, **no line**. Connecting-only was your dial. |
| 4.8 | Enable "Reduce motion" in Android accessibility settings, go offline. | The line HOLDS as a solid blue rule instead of sweeping. It must not disappear — it is state, not decoration. |

## §5 — the tip/scroll repro (#432) — one minute, decides the next fix

**Do not fix anything here. This is a measurement.**

| # | Do | Report |
|---|---|---|
| 5.1 | Open a LONG conversation — enough that you can scroll several screens up. | |
| 5.2 | Scroll **far** up, well past two screens from the bottom. | |
| 5.3 | Long-press a message that is on screen and tip it. | **Does the view jump to the bottom — yes or no?** |

* **Jumps** → `nearBottom()` is not the cause; something else re-pins, and narrowing
  the 1.5-viewport threshold would not have helped. Different fix.
* **Stays put** → the threshold is the whole bug, and the fix is small and contained.

Either way the same is true of a reaction, a delete or an edit on that row — this
was never about tipping.

## §6 — regression sweep (nothing here changed, so nothing here should move)

| # | Do | Expect |
|---|---|---|
| 6.1 | Flip the OS theme while on Wallet. | Still stays on Wallet (#421's acceptance test). |
| 6.2 | Account → Chat appearance → pattern Off / Default / Strong. | Ladder behaves as it did; the preview matches the chat. |
| 6.3 | Wallet tab, dark and light. | System bars unchanged — no C# ran this batch. |
