# F5 checklist — 2026-08-22. The four DIAGNOSED fixes · mute UX · triangles · saturated dark.

Batch: DECISIONS **#472–#478**. Uncommitted, on top of the #464–#471 batch.
Evidence for every fix: `docs/f5-verdict-2026-08-22.md`.

---

## 0. Build it

⚠ C# changed again → wipe (#387). Three files from the PREVIOUS batch must already be staged.

```powershell
Remove-Item -Recurse -Force Spixi\obj, Spixi\bin -ErrorAction SilentlyContinue
```
then the pipeline, then build, then `-t:Run` as a **separate** command.

⚠ **The pattern generator is a NEW pipeline step** and must run before the shells:

```
node scripts/generate-chat-pattern.mjs
```

| Step | Expect |
|---|---|
| generate-chat-pattern | `triangles 224×193.988 … ★ default` |
| build-demo-bundle | **273 exports** |
| build-shells | **18 shells** |
| smoke-test | **BASELINE OK — 2389 pass / the same 4** |

---

## 1. ★ F3 — the pattern prompt. TEST THIS WITH YOUR PATTERN.

This is the one that has failed three times. It must be tested with the **pattern**, not a
fingerprint — a fingerprint would have masked the bug in every previous round.

1. Lock on → background → wait 10 s → return.
2. **Expect the pattern prompt**, not the password field.
3. Dev screen → share the log.

| Search | Expect |
|---|---|
| `resume/activity-resumed` | **`lifecycle=RESUMED`** ← the whole fix in one word. `STARTED` means it is wrong again |
| `auth/maybeAuthenticate` | `→ PROMPT` with all four gates true |
| `lock/auth-returned` | **present** — it was absent every previous round |

⚠ Then the safety case, which matters as much: **background and return within 5 seconds.**
The lock should come down with **no prompt at all** and no prompt appearing afterwards over
the unlocked app.

## 2. F1 / F2 — the lock's ground

| # | Do | Expect |
|---|---|---|
| 2.1 | Background with the lock on, return | **No splash-blue status bar.** It should match the lock's dark |
| 2.2 | Cold start from the launcher | **No white flash** before the lock |
| 2.3 | Walk Chats / Wallet / Apps / Account, light **and** dark | System bars still correct everywhere — this touched the shared painter |

## 3. F6 — the scan row

| # | Do | Expect |
|---|---|---|
| 3.1 | Launch and watch the wallet for ~60 s | The row does **not** flicker in and out. "Connecting" while the target is unknown is correct |
| 3.2 | Let it reach a visible % , force-close, reopen | It **resumes near where it was** — not back to 0 % |
| 3.3 | Log → `[SCANDIAG]` | Look for `not credible, treating as UNKNOWN`. Seeing it is the fix working, not a fault |
| 3.4 | Watch the row's wording in that window | ★ **"Starting the check"**, never "Connecting" (#479). Damir: the old word read as *"the app has no connection"* |
| 3.5 | Tap the row → the "Missing a transaction?" sheet, while the target is unknown | The body says Spixi is **working out how far the blockchain has moved** — NOT the old "once it reaches the network", which stated outright that the app was offline |

## 4. Notifications — the second door

| # | Do | Expect |
|---|---|---|
| 4.1 | Mute a **private group**, background, have the other device post — **repeat 5-6 times** | Silent **every** time. This is 3.7 + 3.4: it used to work "sometimes" because the raw push slipped past |
| 4.2 | Same, watching for a **second** notification | Only ever **one** row, never an unformatted one beside it (3.12) |
| 4.3 | Turn the global master OFF, receive anything | Nothing at all |
| 4.4 | ⚠ Mute your **1:1** with someone who is also in a group with you, then have them post **to the group** | The group message **still notifies**. The audit caught this dropping group mail |
| 4.5 | Miss a call | The row clears when the ring ends — no stale "Incoming call" |
| 4.6 | Answer a call | The row clears on answer, not after hanging up |

## 5. ★ Mute UX and the badge — your July design, finally reachable

| # | Do | Expect |
|---|---|---|
| 5.1 | Long-press a chat row | A **Mute** item, with a bell-off icon (Unmute when muted) |
| 5.2 | Swipe the row | The mute action appears on the swipe too |
| 5.3 | Mute a chat with unread messages | The row shows the **bell-off glyph** AND a **toned-down count** — both. That is `createIndicators`, credited to your review of 2026-07-02 |
| 5.4 | Leave it a minute with the app open | ⚠ The badge must **not flicker away**. It did in the first cut — the 1 Hz presence tick was still zeroing it |
| 5.5 | Mute from the row, then open that chat's info | The toggle there agrees |
| 5.6 | Mute from chat info, then look at the list | The row updates. Both directions, one truth |
| 5.7 | Force-close and reopen | Every mute survives |

## 6. ★ Triangles and the saturated dark

| # | Do | Expect |
|---|---|---|
| 6.1 | Open a chat, **dark** mode | Triangles, not the doodle. Flat and even — no heavier in dark than light |
| 6.2 | Same chat, **light** mode | The same tile, inked light. Same weight |
| 6.3 | Account → Chat appearance | **Triangles** is offered and selected; Line art is still there |
| 6.4 | Pick Line art, then Triangles again | Both apply live |
| 6.5 | Dark mode generally | The ground is a **saturated blue-dark**, not grey — Telegram's saturation at a hue between it and the Spixi accent |
| 6.6 | ⚠ **Light mode everywhere** | **Byte-identical to before.** The shared grey ramp was deliberately not touched |
| 6.7 | Read text on dark: chats, wallet, settings | Contrast unchanged — every step kept its exact lightness, only saturation and hue moved |

⚠ The **lock screen** still uses the old `#13171b`. It is deliberately fixed-dark (N73) and I
left it alone rather than touch the lock surface while F1/F2 are being verified. If you want
it to match, say so and it is one line.

## 7. Regression sweep

| # | Do | Expect |
|---|---|---|
| 7.1 | Empty Chats / Contacts / Apps | Each keeps its own icon |
| 7.2 | Account: theme, language, backup, downloads, change password | All fine |
| 7.3 | Send a payment end to end | Unchanged |
| 7.4 | Make and answer a call | Ring, in-call bar, hang up — all unchanged |

## 8. Still open, and why

| | |
|---|---|
| a | **The group half of NOTIF-5 is BE.** A group push carries the SENDER'S address, so a muted group can still leak one notification when the Ixian fetch fails. The payload needs the group address |
| b | **The sound assets** — four files, still yours to pick. The app is silent until they land |
| c | **The log flood.** `missing encryption keys!` repeats twice every 2.5 s and crowds out everything else. Pre-existing and Core-side, but it is now the main obstacle to reading a device log |
| d | **iOS / Windows** — unverified for eight batches, and this batch touched all four platforms |
