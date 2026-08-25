# F5 checklist — the overnight batch (#399–#406). Android first.

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.** See `CLAUDE.md`.

Covers ONLY the legs this batch touched. Baseline before: **1992 pass / 4 known
pre-existers**. After: **2070 pass / the same 4** (#136 · #149③ · M5 · B3). ★ STATUS: F5'd on device 2026-08-19, bar round 5/5 PASS (DECISIONS #414).

---

## 0. Build — the exact commands

Generated artifacts are ALREADY REBUILT in the tarball (bundle · 18 shells ·
13 locales · strings IIFE · en-us). Re-run them anyway before you commit — the
rule is that a green smoke run does not prove the generators work (#383).

```
node scripts/extract-strings.mjs        # expect 709 keys · 0 fallback conflicts
node scripts/build-locales.mjs
node scripts/build-strings-iife.mjs
node scripts/build-demo-bundle.mjs      # ★ bundle BEFORE shells, always
node scripts/build-shells.mjs           # 18 shells
node scripts/smoke-test.mjs             # expect BASELINE OK — 2070 / the 4 known
node scripts/verify-locales.mjs         # ALL LOCALES CLEAN
node scripts/i18n-lint.mjs
node scripts/pseudo-locale-smoke.mjs    # 9/9
node scripts/i18n-overflow-audit.mjs    # NO BREAKERS
```

★ **C# changed in 9 files — wipe `Spixi\obj` and `Spixi\bin` before building.**
Both targets share them (#387: a red row can be a dirty build).

```
dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -t:Run
```
Windows two-step:
```
dotnet build Spixi\Spixi.csproj -f net10.0-windows10.0.19041.0 -c Debug
Spixi\bin\Debug\net10.0-windows10.0.19041.0\win-x64\Spixi.exe
```

Git: `git --no-optional-locks status` ALWAYS (plain `git status` strands a
0-byte `.git/index.lock` on the mounted folder and GitHub Desktop then refuses
to commit).

---

## 1. ★ FULL BLEED — AND-7 (#401). The one you asked for. ANDROID.

| # | Do this | Expect |
|---|---|---|
| 1.1 | Open the app on the **Wallet** tab | The hero gradient reaches the TOP of the screen. No strip above it. The balance and title sit BELOW the clock, not under it |
| 1.2 | Open **Chats** | The topbar surface reaches the top. The title/logotype clears the clock |
| 1.3 | Create/restore screen (`Launch`) | The violet gradient reaches the top. The Back arrow clears the clock — and there is now only ONE inset of space above it, not two (the double-pad is fixed) |
| 1.4 | Lock the app, resume it | The lock gradient reaches the top |
| 1.5 | Open **Apps**, **Account**, a **chat**, **scan** | Every topbar behaves like 1.2 |
| 1.6 | ★ Take a **call** (2 devices) and look at the in-call STRIP | The strip clears the clock AND the hang-up control is fully visible. ⚠ This is the audit's MAJOR-1 — if the hang-up is clipped or half under the clock, the native stage and the CSS disagree |
| 1.7 | A **mini-app**, and a legacy money screen (Wallet → Send) | UNCHANGED — still padded below the status bar. Those two keep native padding on purpose |

**If a screen looks wrong, read the probe (§6) before reporting — it says which
of the three numbers is at fault.**

## 2. The four #391 F5 fixes (#399)

| # | Do this | Expect |
|---|---|---|
| 2.1 | **F-1.** Fresh account → join the Spixi community, or scan a QR and send a request | **NO backup nudge.** The nudge now waits for a contact that actually ACCEPTED |
| 2.2 | F-1 continued: have the other side accept | The nudge may now appear. That is correct |
| 2.3 | **F-2.** Welcome → Create → hardware BACK | Returns to welcome, does not exit the app. Same from Restore |
| 2.4 | ★ **F-2, if 2.3 still fails**: Account → Developer → share `ixian.log` and send me the lines starting `LaunchPage verb:` and `LaunchPage back:`. That pair answers it in one look — either `ixian:view:create` never arrives, or it arrives and the field is wrong. **No password or nickname is in those lines** (verified + pinned) |
| 2.5 | **F-4.** Light theme. Lock the app (resume lock), unlock it | The status-bar strip returns to LIGHT with dark icons immediately |
| 2.6 | F-4, second path: cold start with app-lock on → unlock | Same |
| 2.7 | F-4, third path: Account → Delete wallet (do NOT confirm) → the lock appears → unlock/cancel | Same. This leg is the one the SettingsPage flows always take |
| 2.8 | **F-5** is NOT fixed — it is measured. See §6 |

## 3. Item 6 — the permanent community door (#400)

| # | Do this | Expect |
|---|---|---|
| 3.1 | Account → How to use | A **Join the Spixi community** row under the steps |
| 3.2 | Tap it | It reports done in place and stops responding. The Spixi group chat appears in Chats within a tick |
| 3.3 | Tap it again after re-opening the screen, on an account that ALREADY has the bot | It says the chat IS in your chats — never "Added". A repeat tap adds nothing (verified in Core) |
| 3.4 | The chat-list empty state on a fresh account | Still carries its own Join CTA. Both doors, one code path |

## 4. Part D (#402)

| # | Do this | Expect |
|---|---|---|
| 4.1 | Settings → Language → **Deutsch** (or fr/es/pt/ru/sl/sr) | In a chat with history, the "Show older messages" pill is TRANSLATED. Same for the unread divider, "Paid message", the empty contacts/groups lines, "Invite a contact", the group selection count |
| 4.2 | **N70.** Start the app with **no network**, then turn the network on and wait a moment | If an update is available, the notice now appears in that session. Before, it waited an hour |
| 4.3 | **N44** — already worked, now pinned. Create an account | The button shows a spinner and disables while the wallet generates |

## 5. Part E — the update notice is no longer chats-only (#403)

| # | Do this | Expect |
|---|---|---|
| 5.1 | With an update notice showing on Chats, switch to **Wallet** | The notice is still visible, BELOW the hero |
| 5.2 | Switch to **Apps**, then back to **Chats** | Visible on both, once, never duplicated |
| 5.3 | Dismiss it on Wallet, then switch tabs | It stays dismissed everywhere, and returns after a restart |

## 6. ★ THE PROBE — read this, it answers two open questions

Turn dev mode on: **10 taps on the "Chats" title**. It persists, so enable it
once and then **restart the app** to measure a cold boot. A monospace line
appears at the bottom of the home screen:

```
INSET var=24px env=0px safe=24px | BOOT rdy=812 flush=830 done=845 zero=848
```

**INSET** answers AND-7. `var` is what C# published, `env` is what the WebView
reports by itself (0 on Android without a cutout — that is expected and is the
whole reason this batch exists), `safe` is what the layout actually used.
Send me those three numbers.

**BOOT** answers F-5 ("empty states pop in about a second late"), in ms from
document start:
* `rdy` late (~1000) and the rest following it → **the DATA is late, not the
  empty state.** The shell fires its ready verb on window `load`, which waits
  for fonts and illustrations. That is the fix to make next, and it must not be
  changed blind (#177 bought that invariant with a real bug).
* `rdy`, `flush`, `done` all early and only `zero` late → the zero-state gate.

Send me one screenshot of that line on a fresh restart of an EMPTY account.

---

## 7. Commit

```
git --no-optional-locks status          # expect ~120 files, no untracked
git --no-optional-locks diff --ignore-cr-at-eol --stat    # must match plain --stat
```

Commit message:

```
batch: F5 fixes, the community door, FULL BLEED, and the bar rounds (#399-#418)

F-1 the backup nudge keys on FriendState.Approved (Friend.approved is dead —
Core defaults it true and no outgoing-request site clears it) · F-2 the launch
view report is structural, from show(), plus password-safe instrumentation ·
F-4 the strip repaints at all THREE lock-close paths · item 6 How to use gains
the permanent community row on a shared static · AND-7 the Android root view no
longer pads the top: the inset travels to the shells and every top site reads
--safe-top · N63 nine keys x seven locales · N70 the update check re-arms on the
offline->online edge · N44 verified already built and pinned · N64 (1) the
update notice follows the visible tab.

Then F5'd on device and fixed live: the bar glyph colour is a per-TAB question
since full bleed (#407), the theme must be read not cached (#408, #410), and the
status bar and navigation bar are two ends of a screen, not one colour (#409).
Plus the empty *SL{} carrier that wrote an error line to ixian.log on every
Account open (#412), and three on-screen probes.

Also logged, not built: N68 root-caused (an unobserved TcpClient task exception),
N69(b) proven, N77 measured and handed to the protocol run, N78/N79/N80 filed.

Two review rounds: three disjoint auditors then a break-my-verdict pass over the
fixes. 6 MAJOR found and fixed, incl. the in-call hang-up control clipping on
Android and a security pin that could not fail. Smoke 1992 -> 2070 / same 4.
```
