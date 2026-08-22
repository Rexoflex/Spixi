# F5 checklist — 2026-08-22. #505 · #506 · N86.

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.** See `CLAUDE.md`.

DECISIONS **#507** (#505 lock model + hatch) · **#508** (#506 ①–④) · **#509** (N86 QR).
Smoke baseline moved **2478 → 2564**, and the known pre-existers went **4 → 3**
(`#136 · M5 · B3` — #149③ is retired, see §5).

---

## 0. Build order

C# changed, so wipe first (#387).

```
node scripts/extract-strings.mjs
node scripts/build-locales.mjs
node scripts/build-strings-iife.mjs
node scripts/build-demo-bundle.mjs
node scripts/build-shells.mjs
node scripts/i18n-lint.mjs
node scripts/pseudo-locale-smoke.mjs
node scripts/smoke-test.mjs
node scripts/cs-syntax-check.mjs
node scripts/verify-locales.mjs
```

| Step | Expect |
|---|---|
| `build-demo-bundle` | **275 exports** |
| `build-shells` | **18 shells** |
| `smoke-test` | **BASELINE OK 2564 pass / the 3 KNOWN (#136 · M5 · B3)** |
| `cs-syntax-check` | **141 clean** + 1 known gap (a new file: `SDesktopIdle.cs`) |
| `verify-locales` | ALL CLEAN — every locale's still-English count is **2 lower** |
| `pseudo-locale-smoke` | 9/9 |

⚠ **`git add Spixi/Platforms/Windows/SDesktopIdle.cs`** — it is new.

Then wipe `Spixi\obj` and `Spixi\bin`, and build:

```
dotnet build Spixi\Spixi.csproj -f net10.0-windows10.0.19041.0 -c Debug
```

Run the exe as a **separate** command.

---

## 1. ★★ The Windows lock — the acceptance test (#505)

★ **The one that matters is 1.1.** It is the defect that locked you out mid-sentence.

| # | Do | Expect |
|---|---|---|
| 1.1 | App lock ON. Open Spixi, then click another window and type there for a minute. Click back | ★ **No lock. Ever.** Not after 5 s, not after a minute |
| 1.2 | Leave the machine completely untouched for **10 minutes** (do not move the mouse). Come back | The lock is up |
| 1.3 | Lock Windows (Win+L) for ~30 s, unlock | ★ **Spixi does NOT lock** — and does not need to. While Windows is locked Spixi is unreachable, and 30 s is not "walked away" |
| 1.4 | Lock Windows for **11+ minutes**, unlock | Spixi is locked |
| 1.5 | Sleep the machine for 11+ minutes, wake it | Spixi is locked. ⚠ This is the leg a tick counter alone cannot see |
| 1.6 | Restart the app with the lock on | Cold-start lock, unchanged |
| 1.7 | Any lock cycle, then read the log | `Desktop idle lock: idle=… gap=… window=600s slept=…` |

**Want a faster test?** Set the threshold to one minute without a rebuild — it is a
preference (`lockIdleMinutes`). If you have no easy way to write it, tell me and I will
add a temporary dev row.

## 2. ★ The escape hatch (#505, W-4.6)

| # | Do | Expect |
|---|---|---|
| 2.1 | Use the app normally for a while, clicking in and out of other windows | ★ **No black window.** This is the state that used to need a restart |
| 2.2 | If a black window DOES appear: **click the Spixi window** | It should recover on the click. If it does — send me the log, the sweep line names what it found |
| 2.3 | Search the log for `[LOCKDIAG] sweep/` | ★ **Nothing** in normal use. A `sweep/uncover` or `sweep/relock` line means the hatch fired, and I want to see it |
| 2.4 | Unlock normally after an idle lock | The app comes back, no black window, no second lock |

⚠ **Mobile must be byte-identical.** If you have the phone handy, one sanity pass:
background Android for 10 s and return (should behave exactly as before), and background
it for a minute and return (should lock).

## 3. Sounds (#506 ①)

| # | Do | Expect |
|---|---|---|
| 3.1 | Receive a message with in-app sounds on | ★ The effect plays to its **full length**, not clipped |
| 3.2 | Send a message, send a payment | Same |
| 3.3 | A burst of several messages | No clipping, no missing sounds |

⚠ If it is STILL clipped, both hypotheses are dead — say so and do not let me guess a
third. The row's own diagnosis (the file descriptor) is contradicted by Android's
documented contract; my diagnosis is that the player was being garbage-collected
mid-playback. Both are fixed. A third cause would be a real finding.

## 4. Long-press (#506 ②)

| # | Do | Expect |
|---|---|---|
| 4.1 | Long-press a message | ★ The pressed message is **bright and clearly readable**, standing above the dimmed conversation. Not tinted — lifted |
| 4.2 | Long-press a message that has **reactions** | The reactions lift WITH it — not left behind in the dark |
| 4.3 | Tap the lifted message itself | The menu closes. ⚠ This is the one that would break if the lift swallowed the tap |
| 4.4 | Long-press a message near the very bottom | ★ The **menu** is on top of the message, never the other way round |
| 4.5 | Payment / file / app / media cards, both themes | Same behaviour |

## 5. Empty states + QR + credits

| # | Do | Expect |
|---|---|---|
| 5.1 | Fresh or empty account → Wallet tab | ★ The empty state arrives **promptly**, not a second late |
| 5.2 | Same on Mini apps | Same |
| 5.3 | Dev mode on, read the HUD | The boot line now carries `wflush · wdone · aflush · adone`. ★ If `wdone` is far from `rdy`, the residual is C# reaching the flush — a different defect, and this number is how we tell |
| 5.4 | Account → the address area | ★ A **"Show QR"** row directly under the address; the address chip, copy and share stay visible. No QR resting on screen |
| 5.5 | Tap it, in **dark mode** | The code opens at full size. ★ Is the white card still overpowering? The 12 px surplus is gone — if it still glares, the next dial is the surface tint, not the size |
| 5.6 | Scan that code with another phone | ★ It must scan **exactly as before**. The quiet zone was not touched |
| 5.7 | Chat info → Show QR | Same size, same hug, same card as the hub |
| 5.8 | Settings → About/Contributors in **Deutsch** and one more locale | "Credits" and "Interface sounds" are translated |

## 6. Two Windows finds I did NOT build, and why

| Row | Status |
|---|---|
| **W-3.1** pane widths change with the picked language | ⚠ **No mechanism found.** I swept for content-derived widths and there are none in the pane chain; the width is a native preference and `setPaneMetrics` is re-pushed on every `onLoad`, including the language reload. I will not guess (#294). ★ **Send a screenshot before and after a pick, and say which pane moves** — the chats list, the Account hub column, or the rail |
| **W-5.1** the info panel flashes on open and close | ⚠ Already triaged in #248/#250: the stages paint `pageSurfaceColor`, and the residual was recorded as a **WebView2 resize limit** with a "zero-resize FLOAT pane" variant queued as YOUR dial. It is a design decision, not a bug fix — say the word and I will build the float variant |

## 7. Still open for you

1. ★ **The privacy shield on Windows deactivate — (a) drop it or (b) keep it.** One line.
   My recommendation is (a): a deactivated Windows window is still fully visible, so the
   shield blacks out a window you are looking at rather than hiding it from anyone, and
   it is the leading W-4.6 suspect. Everything in §2 ships either way.
2. **`ixian.0.log` from the FAILING session**, if it survived.
3. Two translation dials (§5.8): German "Danksagungen", Slovene "Zasluge".
4. `Config.maxLogCount` is **5** with a release-blocker marker. ⚠ Reduce to 1 before launch.

## 8. Commit

Everything is UNCOMMITTED and the pipeline is green. One batch:

```
lock model + escape hatch, sounds, long-press lift, empty-state verbs, QR (#507-#509)
```

---

# ADDENDUM — #503, the notification extension (DECISIONS #510)

★ **Android only. iOS is specified and gated — see `docs/ios-nse-spec.md` §1 for why, and
what you need from Apple before it can be built.**

⚠ **`git add Spixi/Platforms/Android/SNotificationServiceExtension.cs`** — new file.
Android build: `dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release`, then
`-t:Run` as a **separate** command. Wipe `obj`/`bin` first.

## A1. The rows that failed last time — all four are the same cause

**Kill the app completely (swipe it away) for every one of these.** That is the case
`WillDisplay` could never see.

| # | Do | Expect |
|---|---|---|
| A1.1 | App killed. Have the other device send **four messages in one chat** | ★ **ONE row that updates.** ⚠ Read the SCREENSHOT, not the badge — last time a "4" badge was Samsung bundling four separate rows and it read as a pass |
| A1.2 | App killed. Turn the **global master OFF**, then send | ★ No notification at all |
| A1.3 | App killed. **Mute one 1:1**, then have that contact send | ★ No notification. ⚠ Only the 1:1 case — a group push carries the SENDER's address, which is still a BE row |
| A1.4 | App killed. Two different chats send | Two rows, one per chat, ours — not four |
| A1.5 | Any of the above, then read the log | ★ `[NOTIFDIAG] raw push suppressed…` or `…posted as a Spixi row…` with **`(service-extension)`**. That word is the whole batch: it means the background lane finally runs |

## A2. No regression on the foreground lane

| # | Do | Expect |
|---|---|---|
| A2.1 | App OPEN on another chat, receive a message | Behaves as before |
| A2.2 | Log for that one | `(foreground)` — and **no `already decided` line**, meaning only one lane fired |
| A2.3 | If you DO see `already decided` | Not a bug — it means both lanes fired and the second was a no-op. Tell me, it settles a question the bytecode could not |
| A2.4 | Tap a notification | Opens the right chat |

## A3. ⚠ Release build specifically

| # | Do | Expect |
|---|---|---|
| A3.1 | Run the **Release** build and repeat A1.1 | ★ Still one row. The extension has NO managed reference — the manifest is its only caller — so this is the build where a linker could drop it. `[Preserve]` is there for exactly this, and Release is the only place it can be proven |

## A4. What is NOT covered

- **Groups**: a group push carries the sender's address, so a group collapses per sender.
  Unchanged, and still a BE payload row.
- **iOS**: untouched by this batch. Nothing in it can change iOS behaviour.
