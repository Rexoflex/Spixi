# F5 checklist — batch #349–#352 (Android pass close · PerfTrace deletion · D-16 press fill)

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.** See `CLAUDE.md`.

Ordered by risk. Stop at the first ★ item that fails and report it.

---

## 1. Apply the batch

```
tar xzf spixi-351.tar.gz
Remove-Item "Spixi\Utils\PerfTrace.cs"
node scripts/build-demo-bundle.mjs
node scripts/build-shells.mjs
node scripts/smoke-test.mjs        # expect: BASELINE OK — 1669 pass / the 4 known pre-existers
```

⚠ **The `Remove-Item` line is required.** A tarball cannot delete a file, and a leftover
`PerfTrace.cs` breaks the build — every call site is gone.

Then build `net10.0-windows` (NOT Rebuild). **This build is the first compile of the C#
deletions** — there is no .NET in the cloud container. The diff is deletion-only, so the
risk is small, and the balance scan showed zero delta.

## 2. ★ D-16 — the press fill, on Windows (mouse)

| # | Step | Expected |
|---|---|---|
| 2.1 | Click a chat row FAST | The fill completes its full sweep to 100%, then fades in place. **No freeze at partial width, no snap, no reverse sweep** |
| 2.2 | Press and HOLD a chat row, then release | Fill completes during the hold, stays, then fades on release |
| 2.3 | Click the ALREADY-SELECTED chat row (desktop split view), pointer resting on it | The row stays in the blue tonal family through the whole press. **No grey flash at any point** |
| 2.3b | HOVER the selected chat row, and the selected tx row, without clicking | **No colour change at all** — a selected row has no hover tint any more (#353) |
| 2.4 | Wallet: click a tx row | Identical behaviour to the chat row |
| 2.5 | Account: click a row · Contacts: click a row · Apps: click a tile (list AND grid) | Same fill + fade everywhere. ★ Grid: the CARD surface must NOT blink during the fade |
| 2.6 | Apps: a static check — the version row in Account | **No fill at all** — static rows are excluded now |
| 2.7 | Mouse-down a row, drag 15px away, release | The fill cancels (retract) — a drag is not a click |
| 2.8 | Windows Settings → Accessibility → Visual effects → Animation effects OFF, restart Spixi, press a row | Instant flat tint, no sweep, no fade. Turn it back on after |

## 3. D-16 — on the A52 (touch)

| # | Step | Expected |
|---|---|---|
| 3.1 | Fast tap a chat row | The fill completes smoothly, then fades — even though the finger left early. **This is the fix for your recording** |
| 3.2 | Tap a row and watch while the chat opens | **No reverse sweep on the list** — the fill completes and fades, or the screen replaces it |
| 3.3 | Flick-scroll the chat list hard (the open leg from the Android pass) | **No trail of lit rows**, no row stays lit |
| 3.4 | Account → Downloads (with files present) | Tapping a FILE row now gives the same fill as every other row. Before, file rows were dead |

## 4. PerfTrace gone

| # | Step | Expected |
|---|---|---|
| 4.1 | `adb logcat -d | findstr PERF` after opening a chat | **Nothing.** The scaffold is deleted |

## 5. Known and accepted (do not report these)

- A chats-list update DURING the ~0.6 s afterlife cuts that row's fill (the row is
  rebuilt). Mobile never shows it — the opened chat covers the list.
- A hold longer than 1.2 s loses its tint mid-hold (the pre-existing safety timer).
- The trash button beside a Downloads file row keeps its plain legacy press.
- A selected, hovered row still LANDS on the button colour after everything — that is
  fix C, the I-2 token pass, next batch.

## Commit

One batch: `git commit -F commit-message-351.txt` (file in the tarball root).
