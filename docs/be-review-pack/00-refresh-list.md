# 00 · Refresh list — stale or wrong lines in the BE review pack

Checked against `redesign/frontend` HEAD `052aac6b` (S17 committed); fork point `0e85a4b8`.
Method: every `file:line` citation in the pack re-read at HEAD by script; base = the tree each packet names (`387ca78b`, or the S16 tree `e2e84629` for P01 P03 P05 P07 P09–P12 P21 P24 P25; P26/P28 at `052aac6b`).
This file changes nothing — the BE-pack refresh (or S18) applies it.
Line numbers at HEAD move again with every commit, so the refresh re-checks each line before it edits.

"Shift" in the tables = the same code, only the line moved (S16 + S17 inserts). Any other note = the text or the meaning changed too.

## 1 · Pack-wide

### Cross-cutting
| # | where | what is stale or wrong | fix |
|---|---|---|---|
| X1 | README (no row) | No list of the 14 legacy `ixian:` verb names that no longer exist in C# since the fork: `addrecipient` `copy` `decline` `error2` `finish` `getMaxAmount` `joinbot` `newchat` `onboardingComplete` `pick` `receiveixi` `select` `send` `sendixi`. 11 C# files deleted: OnboardPage, LaunchCreatePage, LaunchRestorePage, LaunchRetryPage, AppsPage, SetLockPage, WalletContactRequestPage, WalletReceivePage, WalletRecipientPage, WalletSend2Page, WalletSendPage; `copy` / `newchat` / `onboardingComplete` / `receiveixi` / `sendixi` were removed from HomePage | one README line "verbs that are gone" |
| X2 | `DECISIONS.md:1419` (#1320; not a pack file) | "73 new verbs / 117 pushes", no method. String-literal grep (`"ixian:<name>` and `sendUiCommand(…, "<name>")` in `Spixi/*.cs` vs `0e85a4b8`) gives 87 / 112 at `387ca78b` and 91 / 117 at HEAD (+4 verbs `moment` `openPrivacy` `topsurface` `whatsnew`; +5 pushes `momentAnswer` `openScreen` `setMoments` `setWhatsNew` `window.setFlagsDev`) | refresh: state the number with its method (the kit's `00-start-here.md` uses 91 / 117 with the method); S18 writes the DECISIONS correction row |
| X3 | `CLAUDE.md:84` (outside the pack) | still "S17 BUILT, UNCOMMITTED"; HEAD `052aac6b` is the S17 commit | S18 |
| X4 | README + P07 P09 P10 P11 P12 P24 P25 P26 P28 status cells | "shipped" / "fixed" / "built" mean different things. S16 C# (`e2e84629`) is compiled and walked on Android + Windows only (Damir's S16 walk, 14 P · 1 F · 1 N/A — the WALK row is still owed, project doc `claude/session-16-walk-notes.md`); iPhone + Mac are not walked. S17 C# (`052aac6b`) is committed and not yet compiled (`docs/handoff-2026-10-11c.md:10`) | define the status words ONCE in the README (e.g. shipped = compiled + walked on the named platforms; committed = in the tree, not compiled / walked) and use them in every header |
| X5 | `HomePage.xaml.cs:1822–1823` vs `security-handover-gate.md:1994` | `ixian:disableDevMode` removes only `flagSecureWalletPass` / `flagMediaInputGate`; `flagS17Bridge` / `flagS17Moments` keep a stored 0, which acts again when dev mode is turned back on (`S16PassRules.effectiveFlag`, `S16PassRules.cs:35–38`) — the case S16 #46 r1 NIT-2 fixed for the S16 keys. The gate row says the S17 keys follow "the S16 flag rules exactly" | **code, not docs** (S17b / S18): two more `Remove` lines + a pin; or correct the gate row |
| X6 | P18 (no packet owns it) | #1346 (notification sender name ON by default, S17) is a C# change with no packet: `Spixi/Meta/SNotificationPrefs.cs:121`, `Spixi/Utils/FileRowRules.cs` (`sanitizeMemberName` :171, `memberNameForNotification` :213). P28:50 names it in a threat row only | P18 takes it (P18 still says default off, see P18 below) |
| X7 | packets | no packet carries a diff command; the kit's `00-diffs.md` now carries them | nothing in the packets; README may point to `00-diffs.md` |
| X8 | README "the stale lines are listed in `docs/handoff-2026-10-11.md`" (:16) and the base tree `626ce787` (:7) | `626ce787` is not on origin; the S16 commit is `e2e84629` | name `e2e84629`; point to this file |
| X9 | README :1–:3 | no pointer to the review-day kit (`00-start-here.md`, `00-decision-sheet.md`, `00-diffs.md`); the README review order (:33–:34) and the kit's reading path (`00-start-here.md` §4) must say the same | one line at the top of the README: "Start with `00-start-here.md`"; take the reading path from the kit |

### README.md
| line | what is stale or wrong | fix |
|---|---|---|
| :3 | snapshot "387ca78b" | "P01–P23 at 387ca78b (P01 P03 P05 P07 P09–P12 P21 re-checked at e2e84629); P24–P25 at e2e84629; P26/P28 at 052aac6b; checked again at 052aac6b (this file)" |
| :7 | `626ce787` | `e2e84629` (X8) |
| :10 | "#1313 … NOT in `DECISIONS.md` at 387ca78b — Damir adds or confirms it" | #1313 is recorded (`DECISIONS.md:1418`); #1314–#1319 are still NOT in DECISIONS.md |
| :12 | "23 packets" | 27 packets (P01–P26, P28; P27 reserved) |
| :13 | "Shipped = in the tree at 387ca78b …"; P24/P25 called shipped though not in 387ca78b | X4: define the status words once |
| :15 | "≈ 2 h 53 min (3 h 05 min with the S16 packets)" — S17 missing | add "3 h 15 min with P26 / P28" |
| :19 | "the files (file:line at 387ca78b)" | "file:line at the tree the packet names" |
| :34 | step 4 "P12–P23 + P25 (~75 min)" — the sum is 77; P26 + P28 missing | "P12–P23 + P25 + P26 + P28 (~87 min)" |
| :36 | heading "status at the S16 tree" | "status at HEAD 052aac6b" (statuses still true; the Finding lines below are stale) |
| :39 F1 | `App.xaml.cs:463` (`onUnlock`) | `:492` (the true-only check `:496`); `SpixiContentPage.cs:523` holds |
| :40 F2 | `SpixiContentPage.cs:3609` (supersede) | `:3627` (:3609 is now `target.Dispose()`) |
| :43 F5 | `HomePage.xaml.cs:6946` | `:7024` (`removeFriend`; `onDeclineRequest` :6981, `declineAllowed` :7009); ⚠ OPEN still true |
| :44 F6 | `HomePage.xaml.cs:1633` (`sendLog`) | `:1648`; still ungated |
| :45 F7 | scope "chat / home / contact details" | 16 page types answer `appAccept` (every page that runs `onNavigatingGlobal` except MiniAppPage, `acceptsCallPushes` default true `SpixiContentPage.cs:2516`); line `:6435` holds |
| :57–:62 | P07 P09 P10 P11 P12 status "fixed" | X4 wording |
| :61 / P11:5 | README "shipped · F8 fixed", packet header "shipped" | align (see P11) |
| :67 P17 | status "planned, flagged" reads as built behind a flag | "planned (flagged when built)" — nothing is built |
| :74 P24 | "shipped, flag ON · Mac not walked" | X4: committed `e2e84629`, flag ON (OFF is dev-only), compiled + walked on Android + Windows, iPhone + Mac pending |
| :75 P25 | "shipped, flag ON" | same as P24 |
| :76 P26 | bridge "1 push, 2 verbs"; status "built" | "1 push, 2 verbs, 1 dev verb (+ `setFlagsDev` 3rd digit)"; X4 wording |
| :78 P28 | title "`ixian:photoAutoDl:` one-shot on a chat page" is WRONG (removed before commit, #46 r1 MAJOR-1); risk "LOW–MEDIUM" vs packet LOW; bridge "2 pushes, 2 verbs" vs packet "3 pushes, 3 verbs, 1 dev verb" | "… `ixian:openPrivacy` one-shot on a chat page"; align risk with P28:5; "3 pushes, 3 verbs, 1 dev verb" |
| :82 | "Total ≈ 3 h 05 min: packets 2 h 45 min (+12 min for P24–P25)" — 2 h 45 already includes the +12; P26 + P28 missing | "Total ≈ 3 h 15 min: packets 2 h 55 (P01–P23 2 h 33 + P24–P25 12 + P26 / P28 10) + flags, Core, legacy 20" |

### core-asks.md
| line | what is stale or wrong | fix |
|---|---|---|
| :3 | "Spixi paths … verified at 387ca78b" | "Spixi lines at HEAD 052aac6b" after the fixes below |
| :7 SYNC-1 | "(a wallet 'verifying' strip is the app-side answer)" — the strip is built (#1324, "Sync strip (pick A)") | add "built #1324"; `Node.cs:341` holds |
| :8 SYNC-2 · :10 SYNC-4 | "proposed #1319" — #1314–#1319 still not in DECISIONS.md | keep "proposed", say "not recorded" |
| :9 SYNC-3 | `Node.cs:888` · `:898` · `:1032` · `:1549` · `:1566` | `:895` · `:905` · `:1039` · `:1556` · `:1573` |
| :18 REPLY | `SingleChatPage.xaml.cs:2323` | `:2338` |
| (missing rows) | P04's question (`Node.loadWallet` in-process after wipe + restore), P06's (icon rewrite in Core's `AppDataMessage` parse), P19:53 (group photo in Core's pending queue, #1231) and P20:54 (stop keepalives when hidden) are Core / architecture asks not listed here | add one row each, or say in each packet why it is not a Core ask |
| Core lines (`Meta/CoreConfig.cs`, `Streaming/*`, `Network/*`) | not checked — Ixian-Core is not in this clone | — |

### legacy-not-ours.md
| line | what is stale or wrong | fix |
|---|---|---|
| :3 | "anchor verified by grep at `387ca78b`" but the column says "Where (HEAD)" | "at HEAD 052aac6b" after the fixes below |
| :13 MAJOR #4 | `WebViewRenderer.cs:482` (DomStorage off) | `:515` (:482 is `JavaScriptEnabled`) |
| :15 L8 | row is BUILT (#1323) but still in the legacy table; lines "at 387ca78b" | move to "Legacy rows we CLOSED" with the flag-OFF caveat, or give HEAD lines: plaintext read / write `WalletPassStore.cs:227` / `:230–232` (flag OFF only); callers `LaunchPage.xaml.cs:605` `:721` `:1116`, `SettingsPage.xaml.cs:691`, `EncryptionPassword.xaml.cs:90` |
| :16 L2 | `SettingsPage.xaml.cs:319` | `:381` (`LaunchPage.xaml.cs:150` holds) |
| :18 chat-info | `ContactDetails.xaml.cs:1107` · `:599` · `:1120` | `:1109` · `:601` · `:1122` |
| :19 chat admin | `SingleChatPage.xaml.cs:793` · `:799` · `:815` | `:803` · `:809` · `:825` |
| :22 LOG-25 | `SingleChatPage.xaml.cs:3586` | `:3609` |
| :24 | "`MiniAppPage`'s seven verbs" — correct (7 branches `MiniAppPage.xaml.cs:153–222`); P09:43 says 8 | fix P09, not this line |
| :30 L6 | `LaunchPage.xaml.cs:697` | `:700` (`applyRestorePrefs`) |
| :31 | `TransferManager.cs:831` | `:866` |
| :32 G/I-1 | `SpixiLocalStorageCallbacks.cs:40` · `:53` | `:54` · `:77` |
| :35 §5.1 tip | `SingleChatPage.xaml.cs:4594` confirm → `:4617` broadcast | `:4617` → `:4640` |
| :40 mutechat | `HomePage.xaml.cs:1351` | `:1357` |
| holds | `:7` (`:484` `Utils.cs:857` `:162`), `:8` (`:59`), `:9–:12`, `:14`, `:17`, `:21`, `:24` (`SpixiContentPage.cs:523`), `:29` (`LockPage :456`, `App :496`), `:33`, `:34`, `:42` | — |

### docs/security-handover-gate.md (pointer + P24–P28 rows only)
| line | what is stale or wrong | fix |
|---|---|---|
| :3 | pointer says "(README + P01–P23 + Core asks + legacy)"; P24–P28 missing | "P01–P26, P28 (P27 reserved)" |
| :1955 · :1968 · :1755 | P25 rows correct, but none is tagged "🟡 BE (P25)" although P25 asks BE a real question | add the tag |
| :1982 | "Verdict … see DECISIONS (S17 row)" | name **#1348** |
| :1994 | S17 flag keys "the S16 flag rules exactly" — not true for `disableDevMode` | X5 (code fix, or correct the row) |
| holds | P24 rows :1947 :1964; P26 rows :1986–:1988; P28 rows :1989–:1992, :1997–:1998 | — |

## 2 · Per packet

### P01 · `P01-lock.md`

Status / content
- :9 DECISIONS list has no #1324, though :17 cites it.
- Nothing else out of date; S17 did not touch the lock.

Stale citations (2)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P01:37 | SettingsPage:1046 · :1415 | SettingsPage:1126 · :1495 | shift |

### P02 · `P02-money.md`

Status / content
- :17 "Files (verified at 387ca78b)" — not re-checked at S16 / S17.
- :9 DECISIONS list: add S17 #1344 (`onBeforeReview`, the pay moment before the send review; `SPayments.cs` unchanged; covered in P28:51).
- :34 `signSendResult` "11 sites" — 10 send sites (`SPayments.cs:282–373`); the 11th hit is the doc comment.
- Missing push site: `addPaymentActivity` is also sent from `HomePage.xaml.cs:4808`. FYI: `ixian:txdetails:` also handled at `HomePage.xaml.cs:1478`.
- :57 contradiction still true at HEAD (SECURITY.md :33 still names `WalletSend2Page`, :35 / :52 still call §5.1 open).

Stale citations (21)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P02:7 | SingleChatPage:4617 | SingleChatPage:4640 | shift |
| P02:22 | SingleChatPage:4507 · :4594 · :4617 | SingleChatPage:4530 · :4617 · :4640 | shift |
| P02:28 | HomePage:975 · ContactDetails:880 | HomePage:990 · ContactDetails:882 | shift |
| P02:29 | HomePage:979 · ContactDetails:884 | HomePage:994 · ContactDetails:886 | shift |
| P02:31 | SingleChatPage:764 · :4374 | SingleChatPage:774 · :4397 | shift |
| P02:32 | SettingsPage:1055 | SettingsPage:1150 | shift |
| P02:33 | HomePage:1757 | HomePage:1772 | shift |
| P02:36 | SingleChatPage:1213 · :1232 | SingleChatPage:1223 · :1242 | shift |
| P02:37 | SingleChatPage:3929 | SingleChatPage:3952 | shift |
| P02:38 | SettingsPage:267 · :1065 · :1419 | SettingsPage:329 · :1160 · :1514 | shift |
| P02:39 | HomePage:4798 | HomePage:4861 | shift |
| P02:40 | ContactDetails:1222 | ContactDetails:1224 | shift |
| P02:55 | ContactDetails:1107 | ContactDetails:1109 | shift |

### P03 · `P03-walletpass.md`

Status / content
- :18 "verified at the S16 tree" — S17 moved every SettingsPage / HomePage line.
- Files missing: `Spixi/Meta/WalletPassStore.cs` (the `write` at "look here first", the read at `Node.cs:412`), `Spixi/Utils/S16PassRules.cs`, `Spixi/Utils/SpixiFlags.cs` (both in P24), `src/bridge/lock-page.js:85` (sends `ixian:changepass:`).
- :49 contradictions still true at HEAD (gate O-40 "OPEN" `security-handover-gate.md:1191`; SECURITY.md:56 "never actually cleared").

Stale citations (14)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P03:7 | SettingsPage:615 · :579 · :591 | SettingsPage:691 · :655 · :667 | shift |
| P03:19 | SettingsPage:319 | SettingsPage:381 | shift |
| P03:20 | SettingsPage:575 | SettingsPage:651 | shift |
| P03:21 | SettingsPage:636 | SettingsPage:712 | shift |
| P03:30 | SettingsPage:527 | SettingsPage:603 | shift |
| P03:31 | HomePage:1289 · SettingsPage:497 | HomePage:1295 · SettingsPage:573 | shift |
| P03:32 | SettingsPage:636 | SettingsPage:712 | shift |
| P03:38 | SettingsPage:568 | SettingsPage:644 | shift |
| P03:39 | SettingsPage:591 | SettingsPage:667 | shift |
| P03:40 | SettingsPage:575 · :577 | SettingsPage:651 · :653 | shift |

### P04 · `P04-restore.md`

Status / content
- :5 "plaintext `walletpass`" — L8 is ON (#1323, `SpixiFlags.cs:20`).
- :25 "account backup encrypted with `Preferences["walletpass"]` (legacy)" — now `WalletPassStore.read()` + refuse (`BackupPage.xaml.cs:357–362`, #1323).
- :54 "L8 plaintext … SecureStorage move = Session 16 (#1300)" — built in #1323 (contradicts P03:15, P24, legacy :15).
- :56 "dead option, Session 16 (#1311)" — fixed by #1324 (RESTORE-B sheet explains and closes, no verb; contradicts P01:17).
- :9 DECISIONS list: add #1323, #1324. :18 "verified at 387ca78b".
- :59 question: `Node.loadWallet()` is now the S16 overload `loadWallet(pass)`.
- Files missing: `Spixi/Meta/WalletPassStore.cs` (BackupPage reads it; LaunchPage writes it 3×), `Spixi/Meta/Node.cs` (`loadWallet(string)`, the subject of the question).
- The question is a Core / architecture ask not in core-asks.md (see §1).

Stale citations (26)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P04:7 | LaunchPage:922 · :938 · :1041 | LaunchPage:926 · :942 · :1045 | shift |
| P04:20 | LaunchPage:905 · :913 · :922 · :929 | LaunchPage:909 · :917 · :926 · :933 | shift |
| P04:21 | LaunchPage:970 · :1000 · :1001 | LaunchPage:974 · :1004 · :1005 | :1001: now `Node.loadWallet(pass)` (S16 L8) |
| P04:24 | SettingsPage:437 · :1546 · :1634 · :1666 | SettingsPage:499 · :1641 · :1729 · :1761 | shift |
| P04:25 | BackupPage:381 · :376 · :309 | BackupPage:357 · :403 · :323 | :381: GONE: `Preferences["walletpass"]` → `WalletPassStore.read()` :357, refuse :358; rewrite the line |
| P04:35 | SettingsPage:786 · :793 | SettingsPage:869 · :884 | shift |
| P04:36 | SettingsPage:437 | SettingsPage:499 | shift |
| P04:38 | SettingsPage:1640 | SettingsPage:1735 | shift |
| P04:39 | BackupPage:309 | BackupPage:323 | shift |
| P04:45 | LaunchPage:913 · :922 | LaunchPage:917 · :926 | shift |
| P04:49 | SettingsPage:1546 | SettingsPage:1641 | shift |
| P04:59 | LaunchPage:1001 | LaunchPage:1005 | now `Node.loadWallet(pass)` (S16 L8) |

### P05 · `P05-overlay.md`

Status / content
- :17 "verified at the S16 tree" — S17 moved HomePage / SettingsPage / SpixiContentPage lines.
- Files missing: `Spixi/Utils/S16SecRules.cs` (`overlayRefused`, `StagingRefuseMs` — the subject of the question), `Spixi/Pages/Contacts/ContactNewPage.xaml.cs` (`checkAddress:` :108, `request:` :85, still live), `Spixi/Pages/MiniApps/AppNewPage.xaml.cs` (listed in P06), `src/bridge/native.js:147` (sends `painted`), `src/bridge/contacts-page.js:247` / `:252`.
- Extra push sites not listed (files are listed): `chatBack` SingleChatPage:9495 · `cdBack` ContactDetails:1416 · `onChatShown` HomePage:3130 · `setPaneMode` ContactDetails:142, SettingsPage:194 · `setInsetTop/Bottom/Sides` SpixiContentPage:794 / :884 / :888.
- S17 `ixian:moment:` now sits in the base dispatch at `SpixiContentPage.cs:6460` (P28) — why `cdping` moved.

Stale citations (35)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P05:22 | SpixiContentPage:6477 | SpixiContentPage:6487 | shift |
| P05:23 | SettingsPage:377 · :1233 · HomePage:5449 | SettingsPage:439 · :1313 · HomePage:5499 | shift |
| P05:24 | HomePage:1443 · :1459 | HomePage:1449 · :1465 | shift |
| P05:30 | ContactDetails:529 | ContactDetails:531 | shift |
| P05:31 | HomePage:1736 | HomePage:1742 | shift |
| P05:33 | SpixiContentPage:6460 | SpixiContentPage:6470 | :6460 is now S17 `ixian:moment:` |
| P05:34 | HomePage:1020 | HomePage:1026 | shift |
| P05:35 | SettingsPage:377 · :393 | SettingsPage:439 · :455 | shift |
| P05:36 | HomePage:1712 · :1443 | HomePage:1718 · :1449 | shift |
| P05:37 | HomePage:1177 · :1181 · :1201 · :1205 | HomePage:1183 · :1187 · :1207 · :1211 | shift |
| P05:38 | HomePage:5792 · :5847 · :5774 | HomePage:5842 · :5897 · :5824 | shift |
| P05:40 | HomePage:5599 · :5591 · :5467 · :5427 · :5714 | HomePage:5649 · :5641 · :5517 · :5477 · :5764 | shift |
| P05:41 | HomePage:5454 | HomePage:5504 | shift |
| P05:42 | SettingsPage:65 · :151 | SettingsPage:75 · :198 | shift |
| P05:49 | HomePage:5011 | HomePage:5061 | shift |
| P05:51 | HomePage:1459 · :5449 | HomePage:1465 · :5499 | shift |
| P05:52 | SpixiContentPage:6477 | SpixiContentPage:6487 | shift |
| P05:57 | security-handover-gate.md:138 · :151 | security-handover-gate.md:140 · :153 | the "ONE bit" rows are `cdoverlay` :140 and `chatoverlay` :153; :138 / :151 were wrong already at S16 (another row, a table header) |

### P06 · `P06-miniapps.md`

Status / content
- :56 "Android: no `getUserMedia` refusal … `WebViewRenderer.cs:55` still grants every request (MAJOR #9 … Session 16)" — fixed in #1322 (contradicts P07:16, legacy :8).
- :54 still lists MAJOR #9 among legacy left to BE; lists MAJOR #8 as legacy for BE, but #1313 made it ours (legacy :7).
- :9 DECISIONS list: add #1313, #1322. :18 "verified at 387ca78b".
- Files missing: `Spixi/Utils/AuditRules.cs` (`isHttpsUrl`, `packageTempName`, `trySplitKeyValue` — the fences the threat rows rely on), `src/bridge/contacts-page.js:205` (sends `startappwith`).
- FYI: legacy chat verbs `ixian:app:` (SingleChatPage:721) and `ixian:installApp:` (:726) not in the bridge table.
- The question is a Core / architecture ask not in core-asks.md (see §1).

Stale citations (27)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P06:21 | WebViewRenderer:482 | WebViewRenderer:515 | shift |
| P06:23 | HomePage:6251 · :6292 · :6313 | HomePage:6314 · :6355 · :6376 | shift |
| P06:24 | SingleChatPage:4217 · :4228 | SingleChatPage:4240 · :4251 | shift |
| P06:30 | HomePage:1674 | HomePage:1689 | shift |
| P06:31 | HomePage:1200 | HomePage:1215 | shift |
| P06:32 | HomePage:1192 · :1196 | HomePage:1207 · :1211 | shift |
| P06:33 | HomePage:1696 | HomePage:1711 | shift |
| P06:34 | SingleChatPage:726 | SingleChatPage:736 | :726 is now legacy `installApp` |
| P06:35 | SingleChatPage:721 · :4200 | SingleChatPage:731 · :4223 | shift |
| P06:36 | SingleChatPage:4747 | SingleChatPage:4770 | shift |
| P06:39 | HomePage:6331 · :5542 · :5610 | HomePage:6394 · :5605 · :5673 | shift |
| P06:40 | HomePage:6204 · :6444 | HomePage:6267 · :6507 | shift |
| P06:41 | HomePage:6188 · :6441 | HomePage:6251 · :6504 | shift |
| P06:48 | SingleChatPage:4228 | SingleChatPage:4251 | shift |
| P06:51 | HomePage:6292 | HomePage:6355 | shift |
| P06:55 | HomePage:1696 · :1196 | HomePage:1711 · :1211 | shift |
| P06:56 | WebViewRenderer:55 | WebViewRenderer:59 | GONE: grant-all removed; `OnPermissionRequest` :59 grants VIDEO only to the scan WebView (#1322); rewrite |

### P07 · `P07-webview.md`

Status / content
- :5 "MAJOR #9 Android fixed" — X4 wording (walked on Android: S16-M9 P).
- :17 base dispatch "gained painted, cdping, copytext, haptic" — add S17 `ixian:moment:` (#1340, `SpixiContentPage.cs:6460`).
- :19 "verified at the S16 tree" — S17 moved every SpixiContentPage line.
- Files missing: `Spixi/Pages/MiniApps/MiniAppPage.xaml:14` (the `miniapp` marker the question is about), `Spixi/Platforms/Windows/WindowsWebViewHandler.cs` (the "reads neither" claim; unchanged since fork).
- :25 two citations were already wrong at S16 (rows below).

Stale citations (13)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P07:25 | S16SecRules:98 · ScanPage:73 | S16SecRules:103 · ScanPage:85 | :98: `captureRefusal`; :98 = `MiniAppMarker` (wrong already at S16); :73: `file:` branch (refusal warn :93); wrong already at S16 |
| P07:27 | SpixiContentPage:6840 | SpixiContentPage:6850 | shift |
| P07:34 | SpixiContentPage:6460 · :6477 | SpixiContentPage:6470 · :6487 | shift |
| P07:35 | SpixiContentPage:6482 · :6511 | SpixiContentPage:6492 · :6521 | shift |
| P07:36 | SpixiContentPage:6554 · :6566 | SpixiContentPage:6564 · :6576 | shift |
| P07:37 | SpixiContentPage:6877 | SpixiContentPage:6887 | shift |
| P07:46 | SpixiContentPage:6477 · :6511 · :6566 | SpixiContentPage:6487 · :6521 · :6576 | shift |

### P08 · `P08-qr.md`

Status / content
- :18 "Files (verified at 387ca78b)" — not re-checked; HomePage lines +15…+63.
- :52 "the legacy OnPermissionRequest grants every request (MAJOR #9)" — fixed #1322 (`WebViewRenderer.cs:59–82`, P07).
- :52 "Windows and MacCatalyst have no permission handler" — MacCatalyst uses the iOS handler incl. `RequestMediaCapturePermission` (#1245, `MauiProgram.cs:50–54`, `Spixi.csproj:597–601`); only Windows has none.
- Missing handler / push sites: `ixian:qrresult:` also in `AppNewPage.xaml.cs:88` (P08:51 names only ContactNewPage); push `setScannedData` `AppNewPage.xaml.cs:152` / `:159`; `ixian:quickscan` `HomePage.xaml.cs:980`, `ContactNewPage.xaml.cs:96`, `AppNewPage.xaml.cs:84`; `ixian:checkAddress:` `HomePage.xaml.cs:1183`, `ContactNewPage.xaml.cs:108`. AppNewPage is not in the file list.

Stale citations (20)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P08:19 | HomePage:2340 · :2372 | HomePage:2359 · :2391 | shift |
| P08:20 | HomePage:2377 · :2387 · :2424 · :2447 | HomePage:2396 · :2406 · :2443 · :2466 | shift |
| P08:22 | ScanPage:57 | ScanPage:69 | shift |
| P08:23 | HomePage:1170 | HomePage:1185 | shift |
| P08:25 | HomePage:5287 | HomePage:5350 | shift |
| P08:30 | HomePage:983 | HomePage:998 | shift |
| P08:31 | HomePage:1211 | HomePage:1226 | shift |
| P08:32 | HomePage:1200 | HomePage:1215 | shift |
| P08:33 | ScanPage:57 | ScanPage:69 | shift |
| P08:34 | HomePage:2372 · :2424 | HomePage:2391 · :2443 | shift |
| P08:35 | HomePage:2450 | HomePage:2469 | shift |
| P08:36 | HomePage:2399 | HomePage:2418 | shift |
| P08:38 | HomePage:5287 | HomePage:5350 | shift |
| P08:45 | ScanPage:57 | ScanPage:69 | shift |
| P08:50 | HomePage:6418 | HomePage:6481 | shift |

### P09 · `P09-contacts.md`

Status / content
- :5 "F5 fixed" — X4 wording. :19 "verified at the S16 tree" — S17 moved every HomePage / Settings / Chat / ContactDetails line.
- :43 "`MiniAppPage.xaml.cs:148` handles its own 8 verbs" — 7 (`MiniAppPage.xaml.cs:153–222`; legacy :24 says seven).
- :57 option B "has no row yet" — still true, but P17 names the planned flag `StrippedChatInfo` (P17:43), and option B covers `contact_details.html` only (P17:33) — NOT home.html, the page F5 is about.
- :9 DECISIONS list ends at #1322 / #1324; add #1340 if the refresh keeps per-packet S17 rows.
- Missing sites (files listed, lines not): `removeContactResult` ContactDetails:582 · `removeHistoryResult` ContactDetails:1164, SettingsPage:1888 · `leaveGroupResult` SingleChatPage:872, ContactDetails:1011 · `undoRequestResult` SingleChatPage:1018 · `setSharedGroups` ContactDetails:724 · `ixian:joinBot` home twin HomePage:1680.
- Same verb, other meaning: `ixian:declineRequest:` on the chat page (`SingleChatPage.xaml.cs:486`) declines a PAYMENT request (P02) — worth one line.
- Rule / store files named by class only: `Spixi/Meta/SRequestIgnore.cs`, `Spixi/Utils/ChatsListRules.cs` (`GroupLimit` :178).

Stale citations (45)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P09:7 | ContactDetails:547 | ContactDetails:549 | shift |
| P09:21 | HomePage:6767 · :6816 | HomePage:6817 · :6866 | shift |
| P09:22 | HomePage:6397 | HomePage:6447 | shift |
| P09:23 | HomePage:3903 · :4101 · :6951 · :6959 · :6963 · :6974 · S16SecRules:83 | HomePage:3953 · :4151 · :7001 · :7009 · :7013 · :7024 · S16SecRules:85 | :83: `declineAllowed`; :83 is its comment |
| P09:25 | SingleChatPage:950 | SingleChatPage:960 | shift |
| P09:30 | HomePage:1006 | HomePage:1012 | shift |
| P09:31 | ContactDetails:547 | ContactDetails:549 | shift |
| P09:32 | HomePage:1002 · :1031 | HomePage:1008 · :1037 | shift |
| P09:33 | ContactDetails:712 · HomePage:1010 | ContactDetails:714 · HomePage:1016 | shift |
| P09:34 | HomePage:1401 · :1756 · :1761 | HomePage:1407 · :1762 · :1767 | shift |
| P09:35 | HomePage:1089 · :1107 | HomePage:1095 · :1113 | shift |
| P09:36 | ContactDetails:607 | ContactDetails:609 | shift |
| P09:38 | SettingsPage:674 | SettingsPage:750 | shift |
| P09:39 | SettingsPage:819 · SingleChatPage:950 | SettingsPage:895 · SingleChatPage:960 | shift |
| P09:40 | HomePage:6760 · :6831 · :6896 · :7008 | HomePage:6810 · :6881 · :6946 · :7058 | shift |
| P09:41 | HomePage:1425 · :3905 · :6512 · :6913 · SettingsPage:1755 | HomePage:1440 · :3955 · :6562 · :6976 · SettingsPage:1835 | `setChatFavorite` :1440, `setSharedGroups` :6976; both were never updated at S16 |
| P09:42 | ContactDetails:298 · :423 · :496 · SingleChatPage:1468 | ContactDetails:300 · :425 · :498 · SingleChatPage:1478 | shift |
| P09:48 | ContactDetails:566 | ContactDetails:568 | shift |
| P09:50 | HomePage:6959 | HomePage:7009 | shift |
| P09:52 | HomePage:1131 · :2570 · :6408 | HomePage:1137 · :2576 · :6458 | :6408: `getFriend` + null return :6458–6461 |

### P10 · `P10-media.md`

Status / content
- :5 "F4 fixed → P25" — X4 wording. :16 "verified at the S16 tree" — S17 moved every SingleChatPage / SettingsPage line.
- :9 DECISIONS list: S17 #1340 replaced the chat's `photoAutoDl` write with `ixian:openPrivacy` (`SingleChatPage.xaml.cs:692`) — touches the auto-download surface; covered only in P28.
- :57 the three stale docs are still stale at HEAD (`security-review-for-be-engineer.md` transfer.fileName residual, :798 "no C# reads clipboard content"; `SPhotoGroups.cs:20` "ONE app preference string").
- Files missing: `Spixi/Meta/SChatPrefs.cs` and `Spixi/Meta/SAutoDownload.cs` (the two switches the question relies on), `Spixi/Platforms/{Android,iOS,MacCatalyst,Windows}/SThumbnail.cs` (the in-process decoder BE is asked to accept), `Spixi/Platforms/*/SClipboardImage.cs`, `Spixi/Utils/ImageSniff.cs`, `Spixi/Utils/S10FixRules.cs` (`finalLeaf`), `Spixi/Utils/SpixiFlags.cs` + `S16SecRules.cs:60` (the P25 gate on `pasteImage`).

Stale citations (33)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P10:7 | SingleChatPage:7529 | SingleChatPage:7544 | shift |
| P10:19 | SingleChatPage:3063 · :3069 · :3086 · :3097 · :7263 · :7276 | SingleChatPage:3078 · :3084 · :3101 · :3112 · :7278 · :7291 | shift |
| P10:20 | SingleChatPage:2744 · :3537 | SingleChatPage:2759 · :3552 | shift |
| P10:29 | SingleChatPage:2897 | SingleChatPage:2912 | shift |
| P10:30 | SingleChatPage:3318 | SingleChatPage:3333 | shift |
| P10:31 | SingleChatPage:3266 · :3280 | SingleChatPage:3281 · :3295 | shift |
| P10:32 | SingleChatPage:7593 · :7673 | SingleChatPage:7608 · :7688 | shift |
| P10:33 | SettingsPage:1003 · :1015 | SettingsPage:1083 · :1095 | shift |
| P10:34 | SingleChatPage:2977 | SingleChatPage:2992 | shift |
| P10:35 | SingleChatPage:3314 | SingleChatPage:3329 | shift |
| P10:36 | SingleChatPage:2529 · :2866 | SingleChatPage:2544 · :2881 | shift |
| P10:37 | SingleChatPage:7239 · :7472 | SingleChatPage:7254 · :7487 | shift |
| P10:38 | SingleChatPage:6904 | SingleChatPage:6919 | shift |
| P10:39 | SingleChatPage:7657 | SingleChatPage:7672 | shift |
| P10:40 | SettingsPage:1008 · SingleChatPage:7070 | SettingsPage:1088 · SingleChatPage:7085 | shift |
| P10:41 | SettingsPage:1022 | SettingsPage:1102 | shift |
| P10:42 | SingleChatPage:6238 | SingleChatPage:6253 | shift |
| P10:47 | SingleChatPage:7525 | SingleChatPage:7540 | shift |
| P10:49 | SingleChatPage:2744 | SingleChatPage:2759 | shift |
| P10:50 | SingleChatPage:2725 | SingleChatPage:2740 | shift |
| P10:57 | SingleChatPage:2903 | SingleChatPage:2918 | shift |

### P11 · `P11-downloads.md`

Status / content
- :5 header "shipped" vs README:61 "shipped · F8 fixed" (the packet's own :54 says F8 fixed) — align; X4 wording.
- :17 "verified at the S16 tree" — S17 moved every SettingsPage / ContactDetails line.
- **Missing verb:** `ixian:deleted` (deletes EVERY file in Downloads, no name) — `SettingsPage.xaml.cs:524` → `onDeleteDownloads` :2044; S17 #1349 now sends it from Settings › Downloads "Clear all" (`src/shells/settings.html:1849`). Not in P11; add a bridge row + threat row.
- :49 cites `ViewerRules.cs:54` for `fileMatches` — :54 is `mayDeleteLocal`; `fileMatches` is `SharedItems.cs:77` → `Spixi/Utils/FileMatch.cs` (not in the file list).

Stale citations (27)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P11:7 | SettingsPage:750 | SettingsPage:826 | shift |
| P11:19 | SettingsPage:1840 · :723 · :726 · :750 | SettingsPage:1920 · :799 · :802 · :826 | :726: twin at :766 |
| P11:29 | SettingsPage:1865 · :666 | SettingsPage:1945 · :742 | shift |
| P11:30 | SettingsPage:683 | SettingsPage:759 | shift |
| P11:31 | SettingsPage:705 | SettingsPage:781 | shift |
| P11:32 | SettingsPage:723 | SettingsPage:799 | shift |
| P11:33 | ContactDetails:639 | ContactDetails:641 | shift |
| P11:34 | ContactDetails:663 · :845 | ContactDetails:665 · :847 | shift |
| P11:35 | ContactDetails:680 | ContactDetails:682 | shift |
| P11:36 | ContactDetails:729 | ContactDetails:731 | shift |
| P11:37 | ContactDetails:776 | ContactDetails:778 | shift |
| P11:38 | ContactDetails:654 · :835 | ContactDetails:656 · :837 | shift |
| P11:39 | ContactDetails:771 | ContactDetails:773 | shift |
| P11:41 | SettingsPage:1925 · :1926 · :1953 · :1954 | SettingsPage:2005 · :2006 · :2033 · :2034 | shift |
| P11:42 | SettingsPage:1895 | SettingsPage:1975 | shift |
| P11:48 | SettingsPage:1840 | SettingsPage:1920 | shift |
| P11:54 | SettingsPage:1689 · :1850 | SettingsPage:1769 · :1930 | shift |

### P12 · `P12-voice.md`

Status / content
- :5 "F3 fixed → P25" — X4 wording. :17 "verified at the S16 tree" — S17 moved every SingleChatPage line.
- :56 (1) contradiction RESOLVED: the gate row (now :1755) says "no tap check exists" — drop it. (2) `be-cutover-brief.md` "v1.1, not v1.0" still there (now :707). (3) security review "never cleaned yet" still there (`security-review-for-be-engineer.md:877`).
- Files missing: `Spixi/Utils/S16SecRules.cs:60` + `Spixi/Utils/SpixiFlags.cs:23` (the P25 gate both voice verbs rely on), `Spixi/Utils/SpixiProtocols.cs` (`spixi.voice.1`, the route depends on it), `Spixi/Meta/SVoicePlayed.cs` (the played flag, :14).

Stale citations (24)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P12:7 | SingleChatPage:8276 | SingleChatPage:8291 | send gate :8360 |
| P12:19 | SingleChatPage:8056 · :8268 · :8360 | SingleChatPage:8071 · :8283 · :8375 | :8268: `voiceCapFor` checks |
| P12:21 | SingleChatPage:8214 · :8849 | SingleChatPage:8229 · :8864 | shift |
| P12:22 | SingleChatPage:8461 | SingleChatPage:8476 | shift |
| P12:23 | SingleChatPage:8627 | SingleChatPage:8642 | shift |
| P12:31 | SingleChatPage:8264 | SingleChatPage:8279 | shift |
| P12:32 | SingleChatPage:689 · :8319 | SingleChatPage:699 · :8334 | shift |
| P12:33 | SingleChatPage:693 · :8335 | SingleChatPage:703 · :8350 | shift |
| P12:34 | SingleChatPage:697 · :8557 | SingleChatPage:707 · :8572 | shift |
| P12:35 | SingleChatPage:8081 | SingleChatPage:8096 | shift |
| P12:36 | SingleChatPage:7824 | SingleChatPage:7839 | shift |
| P12:37 | SingleChatPage:8099 | SingleChatPage:8114 | shift |
| P12:38 | SingleChatPage:9058 | SingleChatPage:9073 | shift |
| P12:44 | SingleChatPage:8268 | SingleChatPage:8283 | shift |
| P12:46 | SingleChatPage:8569 · :8576 | SingleChatPage:8584 · :8591 | shift |
| P12:56 | security-handover-gate.md:1753 · be-cutover-brief.md:703 | security-handover-gate.md:1755 · be-cutover-brief.md:707 | gate :1753: the row now says "no tap check exists" — drop contradiction (1); :703: heading :705; text still stale |

### P13 · `P13-calls.md`

Status / content
- F7 scope: :33 "any page via `onNavigatingGlobal` (chat, home, contact, call)", :51 and :60 "chat / home / contact" — 16 page types answer `appAccept` at HEAD (CallPage, SingleChatPage, ContactDetails, ContactNewPage, ContributorsPage, DevPage, DownloadsPage, EmptyDetail, HomePage, AppDetailsPage, AppNewPage, ScanPage, BackupPage, EncryptionPassword, SettingsPage, WalletSentPage); only MiniAppPage is refused (`acceptsCallPushes` false, `MiniAppPage.xaml.cs:463`). Same for README F7.
- :17 "Files (verified at 387ca78b)".
- Files missing: `Spixi/Pages/Contacts/ContactDetails.xaml.cs:894` (`ixian:call` → `initiateCall` :921; sender `src/shells/contact_details.html:642`), `Spixi/Utils/SpixiFlags.cs:23` + `Spixi/Utils/S16SecRules.cs:60` (the F7 answer: no call verb reaches the media gate; P25:56 and P12:51 point readers here).
- Extra push site: `setCallRingtone` also at `SettingsPage.xaml.cs:318` (on load).
- :57 contradiction still stands (`security-review-for-be-engineer.md:60` "rings audibly"; `VoIPManager.cs:237` suppresses the ring under the lock).
- :45 `VoIPManager.cs:678` is `if(currentCallCalleeAccepted)`; the `startVoIPSession()` it describes is at `:685` (holds, but name :685).

Stale citations (13)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P13:7 | SpixiContentPage:6197 | SpixiContentPage:6350 | shift |
| P13:23 | SingleChatPage:1076 | SingleChatPage:1086 | shift |
| P13:33 | SpixiContentPage:6197 · :6221 · :6423 | SpixiContentPage:6350 · :6374 · :6586 | shift |
| P13:35 | SettingsPage:963 | SettingsPage:1058 | shift |
| P13:39 | SingleChatPage:1081 · SettingsPage:968 | SingleChatPage:1091 · SettingsPage:1063 | shift |
| P13:44 | SpixiContentPage:6197 · :6221 · :6423 | SpixiContentPage:6350 · :6374 · :6586 | shift |
| P13:48 | SingleChatPage:1078 | SingleChatPage:1088 | shift |
| P13:60 | SpixiContentPage:6197 | SpixiContentPage:6350 | shift |

### P14 · `P14-transport.md`

Status / content
- :18 "Files (verified at 387ca78b)".
- :48 "8 C# files build them" (data: URIs) — 8 sites in 5 files (SingleChatPage, SharedItems, Utils, ViewerImage, S11MediaRules; P17:21 agrees).

Stale citations (18)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P14:19 | SingleChatPage:5035 · HomePage:3849 · :3862 | SingleChatPage:5058 · HomePage:3912 · :3925 | shift |
| P14:20 | SpixiContentPage:6824 | SpixiContentPage:6987 | shift |
| P14:22 | src/shells/chat.html:6734 · Raw/html/chat.html:13138 | src/shells/chat.html:6873 · Raw/html/chat.html:13516 | :13138: built output |
| P14:23 | SingleChatPage:5486 | SingleChatPage:5509 | shift |
| P14:24 | SpixiContentPage:4100 | SpixiContentPage:4118 | shift |
| P14:25 | SpixiContentPage:6724 | SpixiContentPage:6887 | shift |
| P14:31 | SingleChatPage:5486 | SingleChatPage:5509 | shift |
| P14:32 | HomePage:3849 · src/shells/home.html:4065 · :4072 | HomePage:3912 · src/shells/home.html:4171 · :4178 | shift |
| P14:33 | SpixiContentPage:1575 | SpixiContentPage:1581 | shift |
| P14:34 | SpixiContentPage:5151 | SpixiContentPage:5250 | shift |
| P14:35 | SpixiContentPage:6326 | SpixiContentPage:6489 | shift |
| P14:41 | src/shells/chat.html:6734 | src/shells/chat.html:6873 | shift |
| P14:44 | SpixiContentPage:4100 | SpixiContentPage:4118 | shift |

### P15 · `P15-chatmsg.md`

Status / content
- :18 "Files (verified at 387ca78b)".
- Files missing: `Spixi/Utils/SystemLineRules.cs` (`isReservedId` :17), `Spixi/Utils/SpixiProtocols.cs` (`claimAnswer` :132) — the receive guards and the capability answer of the question.
- :39 `setCaps` "also home, settings, chat info, dev" — sites `ContactDetails.xaml.cs:244`, `DevPage.xaml.cs:191`, `HomePage.xaml.cs:2844`, `SettingsPage.xaml.cs:305`; ContactDetails, DevPage, SettingsPage are not in the file list.
- :7 / :51 the 750 ms constant is `COPY_MIN_INTERVAL_MS` at `SpixiContentPage.cs:6694`.

Stale citations (22)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P15:7 | SpixiContentPage:6376 | SpixiContentPage:6539 | shift |
| P15:20 | SingleChatPage:2301 · :2323 | SingleChatPage:2316 · :2338 | shift |
| P15:21 | SingleChatPage:2197 · :2173 | SingleChatPage:2212 · :2188 | shift |
| P15:22 | SingleChatPage:4813 | SingleChatPage:4836 | shift |
| P15:30 | SingleChatPage:2263 | SingleChatPage:2278 | shift |
| P15:31 | SingleChatPage:2348 | SingleChatPage:2363 | shift |
| P15:32 | SingleChatPage:4813 | SingleChatPage:4836 | shift |
| P15:33 | SingleChatPage:870 | SingleChatPage:880 | shift |
| P15:34 | SpixiContentPage:6329 | SpixiContentPage:6492 | shift |
| P15:35 | SpixiContentPage:6401 | SpixiContentPage:6564 | shift |
| P15:36 | SingleChatPage:5486 · :5488 | SingleChatPage:5509 · :5511 | shift |
| P15:37 | SingleChatPage:5179 | SingleChatPage:5202 | shift |
| P15:39 | SingleChatPage:1646 | SingleChatPage:1660 | shift |
| P15:40 | HomePage:3947 | HomePage:4010 | shift |
| P15:41 | SpixiContentPage:6373 | SpixiContentPage:6536 | shift |
| P15:48 | SingleChatPage:2301 | SingleChatPage:2316 | shift |
| P15:51 | SpixiContentPage:6358 · :6371 · :6376 | SpixiContentPage:6521 · :6534 · :6539 | shift |

### P16 · `P16-spare.md`

Status / content
- :17 "Files (verified at 387ca78b)".
- :44 "#1311 (a), mechanism owed" — #1324 built the `[THEME]` diagnostic lines; mechanism still owed; mention #1324.
- :28 "#804 removed three emits from the current shells" — `src/shells/settings.html:1099` / `:1251` / `:1278` still send `ixian:downloads` / `backup` / `encpass` (old-exe branch); `home.html:1158` / `:3703` send `ixian:backup` (HomePage:1285).
- File missing: `Spixi/Pages/Home/HomePage.xaml.cs` — every caller of the lifecycle: `warmSpareChat` :4363, `pushSpareChat` :3181, `representParkedOverlay` :2997, `disposeParkedOverlay` :3010, `dropSpareChat` :903 / :1815 / :1826, `ixian:backup` :1285 (+ `src/shells/home.html`).

Stale citations (22)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P16:18 | SpixiContentPage:1756 · :1763 | SpixiContentPage:1762 · :1769 | shift |
| P16:19 | SpixiContentPage:1984 | SpixiContentPage:1990 | method at :1970 |
| P16:22 | SpixiContentPage:1537 | SpixiContentPage:1543 | method at :1533 |
| P16:23 | UIHelpers:540 | UIHelpers:542 | shift |
| P16:24 | Node.cs:1019 · :1022 · App.xaml.cs:1369 | Node.cs:1026 · :1029 · App.xaml.cs:1407 | shift |
| P16:25 | SettingsPage:1488 | SettingsPage:1583 | shift |
| P16:28 | SettingsPage:631 · :645 · :497 | SettingsPage:714 · :728 · :573 | shift |
| P16:33 | src/shells/chat.html:8351 | src/shells/chat.html:8496 | shift |
| P16:35 | SpixiContentPage:1763 · :1984 · :1537 · :3924 | SpixiContentPage:1769 · :1990 · :1543 · :3942 | shift |
| P16:36 | src/shells/settings.html:907 · :720 | src/shells/settings.html:945 · :748 | shift |
| P16:37 | UIHelpers:540 · SettingsPage:899 | UIHelpers:542 · SettingsPage:994 | shift |
| P16:38 | WebViewRenderer:482 | WebViewRenderer:515 | shift |

### P17 · `P17-perf-planned.md`

Status / content
- :12 "No `SpixiFlags` class, flag or `[FLAGS]` line exists in the tree yet" — FALSE: `Spixi/Utils/SpixiFlags.cs` holds 4 flags with `[FLAGS]` lines (S16 #1322 / #1323, S17 #1338 / #1340); say "none of the perf flags exists".
- :35 "none exists in the tree" — true for the perf flags only.
- :9 "proposed #1314–#1319 … not yet in DECISIONS.md" — still true (holds).
- README:67 "planned, flagged" vs packet "planned (flagged when built)" — fix the README (§1).
- Missing sites: `setAvatarFor` also `SingleChatPage.xaml.cs:5887`, `HomePage.xaml.cs:3888`; `setSharedItems` also `ContactDetails.xaml.cs:837`.
- Option B covers chat info only; twins on other pages: `kick` / `ban` / `leave` SingleChatPage:803 / :809 / :825, `txdetails` HomePage:1478, `removecontact` / `removehistory` HomePage:1012 / :1008 — say so (P09 relies on it).

Stale citations (19)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P17:7 | WebViewRenderer:126 | WebViewRenderer:159 | shift |
| P17:16 | WebViewRenderer:126 | WebViewRenderer:159 | shift |
| P17:17 | WebViewRenderer:450 · :451 | WebViewRenderer:483 · :484 | shift |
| P17:18 | WebViewRenderer:289 | WebViewRenderer:322 | shift |
| P17:21 | SingleChatPage:3118 · :7270 · :7861 | SingleChatPage:3141 · :7293 · :7884 | shift |
| P17:22 | ContactDetails:1222 · :1107 · :547 · :599 · :1120 | ContactDetails:1224 · :1109 · :549 · :601 · :1122 | shift |
| P17:28 | WebViewRenderer:126 | WebViewRenderer:159 | shift |
| P17:29 | SingleChatPage:7231 · :7649 · ContactDetails:771 · :654 · HomePage:3821 | SingleChatPage:7254 · :7672 · ContactDetails:773 · :656 · HomePage:3884 | :771: row names 4 pushes for 5 anchors: :771 = viewerImage, :654 = setSharedItems |

### P18 · `P18-notif.md`

Status / content
- **#1346 (S17): sender name now ON by default** (`SNotificationPrefs.cs:121`) — out of date: :14 "sender name (default off)"; :7 "(sender-name on) their nicknames" (now the common case); :24 "prefixed only when opted in" (code same, default flipped); :43 "name opt-in"; :59 question "opted-in nicknames" (premise changed). Also: the iOS extension store keeps its own `senderName = false` (`SPushPrefsShare.cs:69`) until the next app write; the pin label `scripts/smoke-test.mjs:14758` still says "default off is today's copy".
- :56 "`HomePage.xaml.cs:1342` still echoes the token" — fixed #1322 (F8); `:1357` logs `len=` only (README F8 and legacy :40 agree).
- :55 stale-doc anchors drifted (rows below); the docs are still stale.
- :9 DECISIONS list: add #1346. :18 "Files (verified at 387ca78b)".
- Files missing: `Spixi-PushService/NotificationService.cs` (extension entry point, `SpixiPushGate` calls :46–50), `Spixi/Utils/FileRowRules.cs` (`sanitizeMemberName` :171, `memberNameForNotification` :213 — X6).

Stale citations (26)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P18:7 | SPushPrefsShare:123 | SPushPrefsShare:124 | shift |
| P18:22 | SPushPrefsShare:273 · :284 · :125 · :148 | SPushPrefsShare:274 · :285 · :126 · :149 | shift |
| P18:23 | SNotificationPrefs:407 · :284 | SNotificationPrefs:414 · :291 | shift |
| P18:24 | Node.cs:1362 | Node.cs:1369 | shift |
| P18:30 | SettingsPage:942 · :948 · :982 | SettingsPage:1037 · :1043 · :1077 | shift |
| P18:31 | SettingsPage:954 | SettingsPage:1049 | shift |
| P18:32 | HomePage:1308 | HomePage:1323 | shift |
| P18:33 | ContactDetails:1024 · SingleChatPage:778 | ContactDetails:1026 · SingleChatPage:788 | shift |
| P18:34 | SettingsPage:253 · :263 | SettingsPage:315 · :325 | shift |
| P18:35 | ContactDetails:396 | ContactDetails:398 | shift |
| P18:36 | HomePage:1378 · :3190 | HomePage:1393 · :3253 | shift |
| P18:43 | Node.cs:1362 | Node.cs:1369 | shift |
| P18:45 | HomePage:1344 · :1351 | HomePage:1359 · :1366 | shift |
| P18:55 | be-cutover-brief.md:219 · security-handover-gate.md:1515 | be-cutover-brief.md:221 · security-handover-gate.md:1517 | :219: :221–223, text unchanged and still stale; :1515: text unchanged and still stale |
| P18:56 | HomePage:1342 | HomePage:1357 | gone: the token echo; :1357 logs len only (#1322 F8) |

### P19 · `P19-avatars.md`

Status / content
- :9 DECISIONS list ends #1303 (nothing later touches avatars). :18 "Files (verified at 387ca78b)".
- Files missing: `Spixi/Utils/ImageSniff.cs` (the question's subject, symbol only), `src/bridge/contacts-page.js` (sends `groupavatar`), `src/components/chat-info.js` (sends `groupPhoto`), the other `ResizeImage`s the packet calls "not checked": iOS `SFilePicker.cs:220`, Mac `:128`, Windows `:191`.
- Push sites not listed: `setAvatar` `SingleChatPage.xaml.cs:1369`, `ContactDetails.xaml.cs:1353`.
- :53 group photo in Core's pending queue (#1231) is "a BE ask" but not in core-asks.md (§1).
- :7 short `:677` after `SFilePicker.cs` means `StreamProcessor.cs:677` (holds) — name the file.

Stale citations (29)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P19:23 | ContactDetails:1261 · :1305 · :1294 · :1310 | ContactDetails:1263 · :1307 · :1296 · :1312 | shift |
| P19:24 | HomePage:2495 · :2472 · :2576 | HomePage:2514 · :2491 · :2595 | shift |
| P19:25 | ContactDetails:1376 · :1383 | ContactDetails:1378 · :1385 | shift |
| P19:26 | src/shells/home.html:2193 · src/shells/chat.html:1849 | src/shells/home.html:2204 · src/shells/chat.html:1870 | shift |
| P19:31 | HomePage:3821 · :3825 · SingleChatPage:5864 | HomePage:3884 · :3888 · SingleChatPage:5887 | shift |
| P19:32 | ContactDetails:1383 | ContactDetails:1385 | shift |
| P19:33 | SingleChatPage:7973 · :1447 | SingleChatPage:7996 · :1457 | shift |
| P19:34 | HomePage:2521 | HomePage:2540 | shift |
| P19:35 | SettingsPage:1910 | SettingsPage:2006 | two sites now: :2006 and :2034 |
| P19:36 | HomePage:1088 | HomePage:1103 | shift |
| P19:37 | ContactDetails:603 · :1259 | ContactDetails:605 · :1261 | shift |
| P19:43 | src/shells/home.html:2193 · src/shells/chat.html:1849 | src/shells/home.html:2204 · src/shells/chat.html:1870 | shift |
| P19:46 | HomePage:2472 | HomePage:2491 | shift |
| P19:47 | ContactDetails:1261 | ContactDetails:1263 | shift |
| P19:48 | SingleChatPage:1380 | SingleChatPage:1390 | shift |
| P19:51 | SingleChatPage:7255 | SingleChatPage:7278 | shift |
| P19:52 | ContactDetails:1383 | ContactDetails:1385 | shift |

### P20 · `P20-privacy.md`

Status / content
- :17 "Files (verified at 387ca78b)"; title differs from README:70 (wording only).
- Files missing: `Spixi/Utils/PrivacyRules.cs` (every gate), `src/components/settings-screens.js` (sends the 3 verbs).
- :54 question (stop keepalives when hidden) is not in core-asks.md; nearest PRESENCE :19 is a different ask (§1).

Stale citations (18)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P20:19 | SingleChatPage:6523 | SingleChatPage:6546 | shift |
| P20:20 | SingleChatPage:808 · :810 | SingleChatPage:818 · :820 | shift |
| P20:23 | SingleChatPage:990 · HomePage:6960 · SettingsPage:1759 | SingleChatPage:1000 · HomePage:7038 · SettingsPage:1855 | shift |
| P20:30 | SettingsPage:1010 | SettingsPage:1105 | shift |
| P20:31 | SettingsPage:1017 | SettingsPage:1112 | shift |
| P20:32 | SettingsPage:1023 | SettingsPage:1118 | shift |
| P20:33 | SingleChatPage:6975 · SettingsPage:1013 · :1728 | SingleChatPage:6998 · SettingsPage:1108 · :1824 | :1013: written after settings.html, means SettingsPage; :1728: written after settings.html, means SettingsPage |
| P20:34 | SettingsPage:1020 · :1729 | SettingsPage:1115 · :1825 | shift |
| P20:35 | SettingsPage:1026 · :1730 | SettingsPage:1121 · :1826 | shift |
| P20:41 | SingleChatPage:6523 | SingleChatPage:6546 | shift |
| P20:42 | SingleChatPage:808 | SingleChatPage:818 | shift |

### P21 · `P21-dev.md`

Status / content
- :5 header lacks "⚠ F6" (README:71 has it).
- :42 push `window.setFlagsDev` `<0|1>,<0|1>` — now FOUR values `sp,mg,sb,sm` (S17; P24:40 same).
- :34 / :54 S17 added `ixian:devflash:s17m:` (DevPage:71) and `ixian:devflash:s17:` (:89) — not in the bridge table (in P26:29, P28:40).
- :9 DECISIONS list ends #1324; add #1338 / #1340 (S17 dev flag verbs). :18 "verified at the S16 tree" — DevPage +79 since.
- :37 "HomePage `:1825`" was wrong when written (:1822 at S16).
- Files missing: `Spixi/Utils/S15SecRules.cs` (`devLogExportAllowed` :80, the gate), `Spixi/Utils/S16PassRules.cs` (`parseFlagTail`), `Spixi/Utils/S11ChatRules.cs` (`applyFlashVerb`, `parseContainerVerb`), `Spixi/Utils/SpixiFlags.cs`, `src/components/settings-app.js` (sends `devseed`).

Stale citations (32)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P21:7 | DevPage:245 · HomePage:1642 · :1804 | DevPage:285 · HomePage:1648 · :1810 | shift |
| P21:19 | DevPage:245 · :259 · :261 | DevPage:285 · :299 · :301 | shift |
| P21:20 | HomePage:1642 | HomePage:1648 | shift |
| P21:21 | SettingsPage:112 · :334 · :349 | SettingsPage:159 · :396 · :411 | shift |
| P21:32 | DevPage:116 | DevPage:152 | shift |
| P21:33 | DevPage:93 | DevPage:129 | shift |
| P21:34 | DevPage:71 | DevPage:107 | :71 is now devflash:s17m |
| P21:35 | SettingsPage:112 | SettingsPage:159 | shift |
| P21:36 | HomePage:1804 · :1811 | HomePage:1810 · :1817 | shift |
| P21:37 | HomePage:1825 · SettingsPage:347 | HomePage:1828 · SettingsPage:409 | :1825: wrong already at S16 (:1822) |
| P21:38 | SettingsPage:127 · :286 | SettingsPage:174 · :348 | shift |
| P21:39 | SettingsPage:1352 | SettingsPage:1432 | shift |
| P21:40 | DevPage:199 | DevPage:235 | shift |
| P21:41 | DevPage:215 | DevPage:251 | shift |
| P21:42 | DevPage:232 | DevPage:272 | shape changed: 4 values sp,mg,sb,sm |
| P21:43 | DevPage:155 | DevPage:191 | shift |
| P21:49 | DevPage:245 | DevPage:285 | shift |
| P21:50 | HomePage:1642 | HomePage:1648 | shift |
| P21:52 | HomePage:1351 | HomePage:1357 | shift |
| P21:54 | DevPage:81 · :104 · :124 | DevPage:117 · :140 · :160 | :81: plus 2 new S17 dev-mode tests :77 (s17m) · :95 (s17) |
| P21:62 | HomePage:1642 | HomePage:1648 | shift |

### P22 · `P22-build.md`

Status / content
- 0 stale citations; status holds (nothing in #1321–#1350 touches build files).
- Not covered as code: the 43 vendored `Spixi/Platforms/MacCatalyst/RocksDbSharp/*.cs` (#920; `.gitattributes:83` `-diff`, so a plain `git diff` shows 0 lines — use `--text`, 20 074 lines). P22 names only `MANIFEST.sha256` and `AutoNativeImport.cs`.
- Files missing: `Spixi/Platforms/iOS/Entitlements.plist` (default APNs, only via csproj:132), `Spixi/Platforms/Android/Resources/xml/backup_rules.xml` · `data_extraction_rules.xml`, `Spixi/Platforms/iOS/Info.plist` · `Spixi/Platforms/MacCatalyst/Info.plist` (ATS D24), `.gitattributes`.
- :5 money cell ("no direct — but the native RocksDB code … runs inside the wallet process") vs README:72 "no"; title wording differs.
- :26 D25 anchor `MauiProgram.cs:50` vs legacy :34 `:54` — both valid lines, different anchors.
- Ambiguous short refs (all hold): :21 `:132`, :22 `:145` / `:68` mean `Spixi.csproj`.

Stale citations (0) — all 22 citations hold at HEAD.

### P23 · `P23-theme.md`

Status / content
- :9 DECISIONS list ends #1311; `UIHelpers.pushThemeToAllPages` now writes a `[THEME] push name=… pages=n` line (#1311 (a) / #1324, S16) — not in P23.
- S17 #1340 adds `SMoments.noteLanguage` after a language pick (`SettingsPage.xaml.cs:977`, P28) — not reflected. :15 "Files (verified at 387ca78b)".
- Missing sites: legacy home `ixian:rating:` (`HomePage.xaml.cs:1576`, sent by `home.html:3791`); `ixian:language:` on Launch (`LaunchPage.xaml.cs:239`); pushes `setLanguage` (SettingsPage:362) and `setHintsOff` (:320) on load.
- Files missing: `Spixi/Meta/SHints.cs`, `Spixi/Utils/S16FixRules.cs` (`themeWord`), senders `src/components/settings-app.js` · `settings-shell.js` · `settings-screens.js` · `glass-card.js` · `rating-nudge.js`.

Stale citations (25)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P23:17 | SettingsPage:1136 | SettingsPage:1231 | shift |
| P23:19 | HomePage:924 | HomePage:933 | shift |
| P23:21 | SettingsPage:1082 | SettingsPage:1177 | shift |
| P23:27 | SettingsPage:485 | SettingsPage:561 | shift |
| P23:28 | SettingsPage:473 | SettingsPage:549 | shift |
| P23:29 | HomePage:924 · :932 | HomePage:933 · :941 | shift |
| P23:30 | HomePage:944 | HomePage:959 | shift |
| P23:31 | SettingsPage:970 | SettingsPage:1065 | shift |
| P23:32 | SettingsPage:457 | SettingsPage:533 | shift |
| P23:33 | SettingsPage:779 | SettingsPage:862 | shift |
| P23:34 | SettingsPage:818 · :1077 | SettingsPage:909 · :1172 | shift |
| P23:35 | HomePage:5449 · :5870 · UIHelpers:505 | HomePage:5512 · :5933 · UIHelpers:506 | shift |
| P23:36 | SettingsPage:869 · :883 · :930 | SettingsPage:960 · :974 · :1025 | shift |
| P23:37 | SettingsPage:979 · HomePage:2831 | SettingsPage:1074 · HomePage:2894 | shift |
| P23:42 | HomePage:924 | HomePage:933 | shift |
| P23:43 | SettingsPage:1136 | SettingsPage:1231 | shift |
| P23:49 | SettingsPage:833 | SettingsPage:924 | short ref after SpixiLocalization; means SettingsPage (safeForLog) |
| P23:50 | src/shells/settings.html:1942 | src/shells/settings.html:2010 | shift |

### P24 · `P24-walletpass-l8.md`

Status / content
- :5 "shipped … Mac not walked" — S16 C# is walked on Android + Windows only; iPhone is not walked either (X4).
- :40 setFlagsDev shape `<0|1>,<0|1>` — now up to 4 digits (`DevPage.xaml.cs:272`, `src/shells/dev.html:348`; gate :1994 says "3rd / 4th digit").
- :14 "`ixian:disableDevMode` removes it" — true for this flag; the S17 flags are not removed (X5).
- Flag note for the decision sheet: the flag is a DEV-only fallback (a stored 0 is inert without dev mode), not a release kill switch.
- Files missing (shell): `src/shells/dev.html` (`:299` devflash, `:347` setFlagsDev parser), `src/shells/settings_backup.html`, `src/components/settings-backup.js`, `src/shells/launch.html:306` (`ixian:proceed:`); `Spixi/Meta/Config.cs:28` (the 3-attempt limit of the retry view).

Stale citations (8)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P24:14 | HomePage:1816 | HomePage:1817 | branch :1817, removes at :1822–1823 |
| P24:29 | SpixiFlags:23 | SpixiFlags:34 | init; :23 = MediaInputGate |
| P24:31 | SettingsPage:615 | SettingsPage:691 | shift |
| P24:32 | SettingsPage:1729 | SettingsPage:1809 | :1729 is now the wipeEverything() declaration |
| P24:33 | SettingsPage:804 | SettingsPage:878 | :878–880 |
| P24:39 | DevPage:71 | DevPage:107 | :71 is now devflash:s17m |
| P24:40 | DevPage:232 | DevPage:272 | shape now up to 4 digits (also dev.html:348) |
| P24:41 | SettingsPage:793 | SettingsPage:869 | shift |

### P25 · `P25-media-input-gate.md`

Status / content
- :5 "shipped behind flag" — X4 (walked on Android + Windows only).
- :29 / :7 `S16SecRules.cs:58` / `:54` were already wrong at S16 (rows below).
- Files missing: `Spixi/App.xaml.cs` (`isInForeground` :27, `isAppLockActive` :142, `interruptAll("lock")` :686 :891) and `Spixi/Utils/SpixiContentPage.cs` (`hasModalOverlay` :2308, `isLockStaging` :2326, `getTopOverlay` :2447) are read by the gate but not in the Files list; `Spixi/Platforms/*/SClipboardImage.cs`; shell senders `src/shells/chat.html`, `src/components/composer.js`, `src/shells/dev.html`.

Stale citations (21)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P25:7 | SingleChatPage:8234 · S16SecRules:58 | SingleChatPage:8249 · S16SecRules:60 | `RefuseHidden` is :58 |
| P25:14 | SingleChatPage:8276 · :8345 · :2897 · :2903 | SingleChatPage:8291 · :8360 · :2912 · :2918 | :8276: startRecording :8298 |
| P25:15 | SingleChatPage:8252 | SingleChatPage:8267 | shift |
| P25:23 | SingleChatPage:8707 | SingleChatPage:8722 | shift |
| P25:29 | S16SecRules:58 · :54 | S16SecRules:60 · :56 | :58 = `RefuseHidden`; :54: :56–58 |
| P25:30 | SingleChatPage:8234 · :8244 · :8264 · :8352 | SingleChatPage:8249 · :8259 · :8279 · :8367 | shift |
| P25:32 | SpixiFlags:21 · DevPage:71 | SpixiFlags:23 · DevPage:107 | :71: :107–108 |
| P25:38 | SingleChatPage:8264 · :693 · :8335 | SingleChatPage:8279 · :703 · :8350 | shift |
| P25:39 | SingleChatPage:2893 | SingleChatPage:2908 | shift |
| P25:40 | DevPage:71 | DevPage:107 | :107–108 |

### P26 · `P26-whats-new.md`

Status / content
- :5 "built behind flag" — X4 (S17 committed `052aac6b`, C# uncompiled per `handoff-2026-10-11c.md:10`).
- Reshaped push not in the bridge table: `window.setFlagsDev` gets a 3rd digit (`DevPage.xaml.cs:272`).
- `disableDevMode` does not drop `flagS17Bridge` (X5).
- Files missing (shell): `src/shells/home.html`, `src/shells/settings.html` (topsurface, whatsnew:done), `src/shells/dev.html`.

Stale citations (6)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P26:20 | SettingsPage:253 · :269 · :472 · :480 | SettingsPage:288 · :306 · :510 · :514 | :253: :288–291; :253 is a paymentAuth cap comment |
| P26:27 | SettingsPage:472 | SettingsPage:510 | shift |
| P26:28 | SettingsPage:480 | SettingsPage:514 | shift |

### P28 · `P28-moments.md`

Status / content
- README:78 title / risk / bridge contradict the packet (see §1 README :78); the packet (:5, :17, :46) is right.
- :9 "MOMENTS.md" has no path — `docs/renders/whats-new/MOMENTS.md`.
- Files missing: `scripts/pins-s17/f-moments2.mjs` (second pin file); C# the logic reads: `Spixi/Meta/SAutoDownload.cs`, `SHints`, `Spixi/Pages/Settings/BackupPage.xaml.cs` (`lastBackupTimestamp`), `Spixi/Meta/SLocalOnlyStore.cs`; shell: `src/components/moment-sheet.js` (sends `ixian:moment:`, :300), `src/shells/chat.html`, `home.html`, `settings.html`, `contact_details.html`, `src/components/wallet-send.js` (`onBeforeReview`, #1344).
- #1346 lives here only as a threat row (:50); the packet that owns it is P18 (X6).
- `disableDevMode` does not drop `flagS17Moments` (X5).

Stale citations (9)

| packet line | cites | at HEAD | fix |
|---|---|---|---|
| P28:22 | S17MomentRules:48 · :83 · :119 · :126 | S17MomentRules:49 · :84 · :120 · :128 | shift |
| P28:25 | SettingsPage:270 · SingleChatPage:1655 · :1664 · SettingsPage:255 | SettingsPage:307 · SingleChatPage:1650 · :1661 · SettingsPage:293 | :1655: :1650–1653 (:1655 = camera cap); :255: ambiguous: :255 = caps string start; moments cap :293–296 |
| P28:26 | SettingsPage:939 | SettingsPage:977 | shift |

## 3 · Counts

| packet | stale citations | packet lines touched | status / content items |
|---|---|---|---|
| P01 | 2 | 1 | 2 |
| P02 | 21 | 13 | 5 |
| P03 | 14 | 10 | 3 |
| P04 | 26 | 12 | 8 |
| P05 | 35 | 18 | 4 |
| P06 | 27 | 17 | 6 |
| P07 | 13 | 7 | 5 |
| P08 | 20 | 15 | 4 |
| P09 | 45 | 20 | 7 |
| P10 | 33 | 21 | 4 |
| P11 | 27 | 17 | 4 |
| P12 | 24 | 16 | 3 |
| P13 | 13 | 8 | 6 |
| P14 | 18 | 13 | 2 |
| P15 | 22 | 17 | 4 |
| P16 | 22 | 12 | 4 |
| P17 | 19 | 8 | 6 |
| P18 | 26 | 15 | 5 |
| P19 | 29 | 17 | 5 |
| P20 | 18 | 11 | 3 |
| P21 | 32 | 21 | 6 |
| P22 | 0 | 0 | 6 |
| P23 | 25 | 18 | 4 |
| P24 | 8 | 8 | 5 |
| P25 | 21 | 10 | 3 |
| P26 | 6 | 3 | 4 |
| P28 | 9 | 3 | 5 |
| **total** | **555** | **331** | **123** |

Pack-wide (§1): 9 cross-cutting rows (X1–X9; X5 is a code fix, X2 and X3 are outside the pack), README 22 rows, core-asks 7, legacy-not-ours 14 (11 with stale lines), gate doc 5.

A citation that appears on several packet lines counts once per line. Ambiguous short refs (noted in the fix column) are counted with the file they mean.
