# F5 checklist — #346 (the #46 loop over #342, #343, #345)

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.** See `CLAUDE.md`.

## Build order — it matters

```
node scripts/build-demo-bundle.mjs     ← a component changed (pressable.js)
node scripts/build-shells.mjs
node scripts/smoke-test.mjs            ← expect BASELINE OK — 1536 pass / the 4 known
```

Then build `net10.0-windows`. **Do NOT Rebuild Solution** — that trips the pre-existing
Android RocksDbSharp errors.

The C# change is one line plus comments in `SettingsPage.xaml.cs`, and 7 corrected
comments on the `PerfTrace` call sites. No new file.

## Commit shape

Commit `.gitattributes` **alone, first**. It is presentation-only and deserves its own
line in the history. Everything else is one batch.

## What to test

| # | Test | Expect |
|---|---|---|
| 1 | Open a chat | A visible spinner in the log while it loads. Before this batch the log was a blank rectangle |
| 2 | Tap and hold a button that morphs to a success state (Save in Account) | The width ANIMATES to the new label. It was snapping |
| 3 | Switch bottom-nav tabs | The icon ink fades with the pill. The ink was snapping while the pill animated |
| 4 | Tap a chat row, a chip, a settings row, the FAB | The tint appears INSTANTLY and fades out. No ramp in, on any of them |
| 5 | **Flick the chat list, let it settle, then tap a row once** | The tap tints. This is the one I broke and fixed — before the fix the first tap after any scroll was dead for up to 1.2 s, then worked on the second tap |
| 6 | Flick the list and watch mid-scroll | No trail of lit rows |
| 7 | In a GROUP, long-press a message from someone with no nickname → Tip | The sheet says that member's truncated address, NOT the group's name. The photo was already right |
| 8 | Desktop Account → Share address | Still copies to the clipboard and toasts. Unchanged, confirming nothing regressed |
| 9 | Open every tab and the Account pane | No red "Spixi could not load" panel anywhere |
| 10 | ⚠ **Delete wallet** (a throwaway account) | Behaves as before. The fix removes a plaintext preference that used to survive — nothing visible, but confirm the flow still completes |

## I2 (#347) — the desktop add-contact pane

| # | Test | Expect |
|---|---|---|
| 11 | Desktop: `+` → Add contact | The form sits in a 640px column, centred in the pane. The title bar still spans the full pane width. The Send request button fills the 640 column, not the pane |
| 12 | Compare it with `+` → Add app in the same column | Both are capped now. **Add app caps at 560, add contact at 640** — pick one. A one-line change in either file makes them match |
| 13 | Mobile: Add contact | Unchanged, full width |

## What NOT to expect

- No visual change to layout, colour or spacing anywhere.
- No change to chat entry speed. This batch fixes correctness, not latency. The #345
  performance win is unchanged.

## If something looks wrong

The boot guard now names the file that failed, in load order, so the FIRST name in the
red panel is the root cause. `spixi.icons.js` failing also makes the bundle throw — the
panel used to blame the bundle for that.
