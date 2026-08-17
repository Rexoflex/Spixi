# F5 checklist — batch #354–#355 (D-18 load-more guard · AND-38 balance toggle)

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.** See `CLAUDE.md`.

Ordered by risk. Stop at the first ★ item that fails and report it.

⚠ First Mac-clone batch. The commands below are macOS shell, not PowerShell.

---

## 1. Apply the batch

```
tar xzf spixi-354.tar.gz
rm docs/handoff-2026-08-15c.md docs/next-session-prompt.md
node scripts/smoke-test.mjs        # expect: BASELINE OK — 1671 pass / the 4 known pre-existers
```

The `rm` line completes the archive move. The tarball adds the archive copies;
a tarball cannot delete the originals. ⚠ `next-session-prompt.md` is archived AS
`docs/archive/next-session-prompt-2026-08-15.md` — the plain-name slot already holds
the consumed 2026-08-04 file, which stays untouched.

Then build. ⚠ **The #320 law applies to EVERY leg below: wipe `obj/` and `bin/`, then
plain Build, then Run.** An incremental build does NOT repackage `Raw/html`, and §3
tests a change that lives there — an incremental build makes §3 a false FAIL.
Targets: run §2 AND §3 on the A52 (`net10.0-android`) — one build covers both, and
§2 needs a REAL chat with 100+ messages, which lives on your account, not on a fresh
run. ⚠ Do NOT use `net10.0-maccatalyst` for this checklist: the catalyst RocksDB
reference needs an uncommitted local shim (`Spixi.csproj:86`, the #279 boot failure),
and a fresh clone does not have it. §4.1 needs `net10.0-windows`, only if the PC is
still in play. **This build is the first compile of the #354 guard** — the cloud
has no .NET. The guard is six lines in `onLoadMore`; if the build fails, read the
error before anything else.

## 2. ★ D-18 — the load-more history bug

Use a chat with MORE than 100 messages.

| # | Step | Expected |
|---|---|---|
| 2.1 | Open the chat | The last 25 messages show. The "Show older messages" pill shows |
| 2.2 | Press the pill repeatedly | The window grows 50 → 75 → **125** → 150… The pill NEVER dies while older messages exist |
| 2.3 | Keep pressing to the end | The FULL history shows. Verify one message you know is old (from months back) is present |
| 2.4 | At the true start | The pill is gone and the "start of the conversation" notice shows — at the real first message, not before |
| 2.5 | Known edge (logged, not fixed) | When the window lands EXACTLY on the total, the pill stays for ONE dead press, then hides. This is legacy-identical (NIT-10) |

## 3. AND-38 — the balance toggle, on the A52

| # | Step | Expected |
|---|---|---|
| 3.1 | Tap the balance NUMBER | The value swaps to •••••. **No flash anywhere on the row** |
| 3.2 | Tap the EYE | The value swaps. **No pressed wash on the eye** on touch |
| 3.3 | Scroll down, tap the compact balance in the title row | Same: swap only, no flash |
| 3.4 | ★ Dial question for you | The three quick-action circles (Send / Receive / Scan) KEEP their pressed wash on tap — they navigate, they are not the toggle. If your dial meant TOTAL hero silence, say so; one line removes it |

## 4. Owed re-checks (carry-over)

| # | Item | Source |
|---|---|---|
| 4.1 | 2.3b residual — Windows leg, if the PC is still in play: full `obj`/`bin` wipe, rebuild, then check a SELECTED row under the cursor. Expected: no tonal hover | handoff-2026-08-16b §6 |
| 4.2 | Flick-scroll cancel on the A52 — a flick over rows must fill NOTHING | f5-checklist-351 step 3.3, still owed |

## 5. Commit

Review the diff in GitHub Desktop. One commit, both batches. Suggested message:

```
D-18 load-more guard and AND-38 balance-toggle fix (#354, #355)
```
