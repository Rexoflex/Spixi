# F5 checklist — the PLATE batch (#314 + #315), 2026-08-07 №2

**One file, one pass.** Build first (C# CHANGED — SpixiContentPage / HomePage /
SettingsPage / UIHelpers / Node.cs):

```
rm -rf Spixi/obj/Debug/net10.0-ios Spixi/bin/Debug/net10.0-ios
dotnet build Spixi/Spixi.csproj -f net10.0-ios -c Debug -p:RuntimeIdentifier=ios-arm64 -p:CodesignKey="Apple Development" -p:ValidateXcodeVersion=false
# + the same with -t:Run -p:_DeviceName=AI15
grep -c "__setKbInset" Spixi/bin/Debug/net10.0-ios/ios-arm64/Spixi.app/html/chat.html   # ≥1 (bundle sanity)
grep -c "onRepresented" Spixi/bin/Debug/net10.0-ios/ios-arm64/Spixi.app/html/settings.html   # ≥1 (#315 shell contract shipped)
```

Language: Slovenian (it exercises the i18n items). ✅/✗ each; anything ✗ gets the
symptom + a screenshot if visual.

## A — #314 polish (zero-C#)

| # | Step | Expect |
|---|------|--------|
| A1 | Long-press a bottom-nav label; long-press a chat ROW (not the text) | No text selection, no iOS copy callout — the row menu (long-press) still opens |
| A2 | Long-press message TEXT in a chat | Unchanged iOS-33 behavior: menu opens, whole-message Copy works |
| A3 | Chat: receive/send `@bob.com hello` from a contact NOT in your roster nick list | The pill wraps the WHOLE `@bob.com` (was: `@bob` only) |
| A4 | Chat: a message that is a profile URL — `https://mastodon.social/@Mastodon` or `youtube.com/@veritasium` | ONE link button carrying the whole URL incl. `/@handle`; tapping shows the full URL in the confirm |
| A5 | Account → change anything → Save ("Nastavitve shranjene" toast) | Styled toast CARD floats ABOVE the bottom bar (was: unstyled text under it — your screenshot) |
| A6 | Account → Change wallet password | The "Spremeni geslo" CTA clears the home indicator (breathing room below — your 2nd screenshot) |
| A7 | Contacts → Add contact | Same: CTA clears the home indicator |
| A8 | Look at the four tab titles | Apps title = SAME face as Wallet/Account (system); the Spixi wordmark on Chats KEEPS its brand face (Sora) |
| A9 | Airplane mode ON briefly (or kill Wi-Fi+cell), watch the Chats topbar | Short "Povezovanje" + three ANIMATED dots (no truncation); normal title returns on reconnect |
| A10 | Account → Kako uporabljati Spixi | Intro + all 4 steps in SLOVENIAN (was English) |
| A11 | Contacts picker chips | Vse / Osebe / Skupine — all three translated (was: only "Vse") |
| A12 | Do a backup (Account → Varnostna kopija → share), come BACK to the hub | The "Potreben ukrep" badge clears within ~2 s, row shows the backup date; ALSO kill+reopen the app → still cleared |
| A13 | Wallet → tap a tx from a KNOWN contact | Sheet shows avatar + nickname + amount + fiat + status + date + txid (copy works) + the counterparty ADDRESS with copy (new: even when the row showed a nickname) |
| A14 | Wallet → hide balances (eye) → tap the same tx | Sheet fully MASKED — no name, no address, no avatar, no amounts (the fail-safe) |
| A15 | Chats tab: tap the Spixi LOGO 10× fast | Toast "Razvijalski način omogočen" + a new topbar icon (sliders glyph) → opens the dev log. 10× again → off. While ON: kill + reopen the app → icon still there |

## B — #315 Account as a peer tab (C# — the batch to watch)

| # | Step | Expect |
|---|------|--------|
| B1 | Open Account (first time this launch) | Normal (COLD — unchanged speed, by design). **No back arrow on the hub** — exits are the bottom tabs |
| B2 | Tap Chats in Account's bottom nav | You land on CHATS (landtab now deterministic on iOS — was: whatever tab you left home on) |
| B3 | Re-open Account | **INSTANT** — no boot spinner, no reload; the page is exactly where you left it |
| B4 | Repeat B2/B3 five times fast, incl. a tap mid-transition | Never a duplicate/blank Account, never stuck |
| B5 | Account → edit nickname → leave via Chats (auto-saves) → re-open Account | No phantom Save button; nickname shows the saved value |
| B6 | …then edit the nick BACK to the old value → leave | Save appears while editing, and the REVERT actually sticks (re-open + check a contact's view of you if handy) — the r2 catch |
| B7 | With Account parked (i.e. after opening+leaving it): flip iOS dark/light in Control Center → open Account | Correct NEW theme (the page rebuilds fresh — slightly slower, that's right); NOT yesterday's theme |
| B8 | App lock ON: leave Account, lock the app (background+return), unlock, open Account | Works — either instant (kept warm) or a normal cold open; NEVER a blank page or Account visible OVER the lock |
| B9 | Background the app hard (open Camera + a big game for a few minutes), return, open Account | If you EVER see a blank/dead Account here: report it — that's the jetsam'd-parked-WebView window (accepted risk, has fallbacks via theme-flip/low-mem) |
| B10 | Hardware-back equivalents: swipe-from-edge on the Account hub (if any gesture nav) | Exits Account (saves if dirty) — no dead ends |

## C — regression spot-checks (5 min)

| # | Step | Expect |
|---|------|--------|
| C1 | Scan a QR (the #307–#313 saga) | Still: no dialogs warm, decode works, torch works |
| C2 | Chat keyboard (iOS-29/#303) | Composer still lifts correctly |
| C3 | A normal URL in chat (`https://spixi.io`) + an email (`a@b.com`) in one message | URL links, email stays plain text |
| C4 | Desktop later (Windows pass): wallet tx tap | Still routes to the detail PAGE (pane) — sheet is mobile-only |

## Commit (after F5 — ONE commit, GitHub Desktop, #306)

```
Plate batch (#314-#315): all 9 polish items (selectability sweep, mention-pill
mentions-first fix, toast/CTA safe-area, iOS-47 wordmark-only Sora, iOS-48 short
Connecting + dots, i18n drafts x7 locales, backup-badge refresh poll + landtab
via onSettingsClosed, R6 full-detail tx sheet w/ people-only roster join,
dev-mode 10-tap restore) + Account as a peer tab (iOS-46 route (a): park +
instant re-present, onRepresented shell contract, no hub back arrow); #46 loop
2 rounds clean (4 MAJOR-class catches fixed + mutation-pinned); #316-#318 dial
rows (Figma mirroring retired, R3/R4 locked) from the parallel Cowork session;
smoke 996 pass / same 4 pre-existing
```

Files: everything modified/untracked EXCEPT `_mention-repro.mjs` / `_mr2.mjs`
(session scratch — delete them) — src components/shells/styles/strings + built
`Spixi/Resources/Raw/html` + 5 C# files + scripts/smoke-test.mjs + docs
(DECISIONS #314–#319 · CLAUDE.md · ios-sim-findings 5 rows · this checklist ·
handoff-2026-08-07b.md · security-review addendum · the parallel session's 4
docs if not already staged).
