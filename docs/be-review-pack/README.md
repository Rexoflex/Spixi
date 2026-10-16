# BE review pack — every C# and bridge change since the fork, in one sitting

For: the BE engineer. Snapshot of `redesign/frontend` at **387ca78b** (Session 15 addendum) against the fork point **`0e85a4b8`**; Ixian-Core at **097341a**. Why it exists: DECISIONS #1312 — BE reviews our changes ONCE at handover instead of approving each one first. Written 2026-10-11 (DECISIONS #1320), docs only, no code changed.

> **Session Safety update (#1465–#1470, 2026-10-16).** Five new packets, each fix behind its own flag (S-4 has none: a resource): P33 (mini-app paths: legacy H-6, H-8, H-9 + MAJOR #10 fixed), P34 (Android share roots: H-10 narrowed), P35 (native confirms on chat + chat info), P36 (delete-all behind the lock: CH3), P37 (the Windows mini-app marker: O-02). Still OPEN: MAJOR #8 (Android mini-app file access), C-12 (Windows storage partition, parked), D24 (parked). Read P33 with P06 in the first sitting (+6 min); P34–P37 in the second (+17 min).
>
> **Session 17 update (#1331–#1350).** New packets P26 (What's new + the bar ink) and P28 (the Moment sheets), both behind flags; P27 is reserved. Read them with P12–P25 in the second sitting (+10 min).
>
> **Session 16 update (#1321–#1325).** The S16 batch fixed flags F1–F5, F8 and MAJOR #9 (#1322) and built L8 (#1323) and the F3/F4 media gate behind flags. New packets P24 (L8) and P25 (the media gate). P01, P03, P05, P07, P09–P12 and P21 are re-verified at the S16 tree (`626ce787` + the S16 diff); the other packets keep their 387ca78b lines.

> **Readings taken while Damir was away (unattended run, 2026-10-11).**
> 1. DECISIONS numbers: the tree ends at #1312. **#1313** is Damir's (legacy MAJOR #8 file access + MAJOR #9 camera/mic grant become OURS to fix; recorded in the S15 status and the perf prompt, but NOT in `DECISIONS.md` at 387ca78b — Damir adds or confirms it). The perf research's six PROPOSED rows (its #1313–#1318) move up one to **#1314–#1319**, same order. This pack takes **#1320**.
> 2. Location: `docs/be-review-pack/` (#1312 (6) and the session prompt). #1312 (3) says "collected in the gate doc" — the gate doc gets a pointer to this folder, not a copy. Packets for NEW work (perf levers, L8) go here too, as P24 onward — not in `docs/review-packets/` as the research proposed.
> 3. 23 packets by change group. Added **P02 money** (not in the prompt's candidate list; it is the riskiest group). "The data: URI transport (O-11)" is part of **P14 transport**. Theme and language are one packet (P23).
> 4. "Shipped" = in the tree at 387ca78b. The Session 15 C# compiled on Android + Windows (#1309); iPhone + Mac are not walked on that build.
> 5. Condensing found **eight things that contradict an earlier verdict or doc** (table below). They are FLAGGED, not fixed. The ours ones must be fixed before handover (gate rule).
> 6. Total reading time is ≈ 2 h 53 min (3 h 05 min with the S16 packets), over the 1–2 h target. The packets were kept complete; the **96-minute path** (103 with P24) below covers every money / key / lock / file-system packet except P16 (the password form in the parked Account pane) and the planned P17.
> 7. Where an older doc disagrees with a packet, the packet wins: it was checked against the tree at 387ca78b (#215). The stale lines are listed in `docs/handoff-2026-10-11.md` for us to correct.

## How to read a packet (5 minutes each)
Header row: risk · money / keys · bridge change · status · minutes. Then **Look here first** = the one line to open in the IDE. Then the DECISIONS rows, the files (file:line at 387ca78b), the bridge table (every `ixian:` verb WebView → C# and every C# → JS push, `Utils.sendUiCommand` → `executeUiCommand`, the group added or reshaped), threat → rule → proof (pins in `scripts/pins-sN/`, labels in `scripts/smoke-test.mjs`, C# harness tests in `scripts/csh/`), what we gave up, and ONE question for you.

## The trust model in 10 lines (SECURITY.md §1–§4)
1. Chat and anything that renders peer / remote content lives in its OWN WebView; never one DOM or JS context with the wallet or another pane (#220).
2. Panes coordinate only through C#; no JS bridge between WebViews.
3. Untrusted shells: chat, chat info / contact details, home (peer names + previews), downloads and the Settings inline Downloads list (peer file names), app details (remote text), mini-apps.
4. A WebView only ASKS (an `ixian:` navigation). Its own `SpixiContentPage.onNavigating` answers; no page answers another page's WebView.
5. No key, seed or password is pushed INTO a WebView. Legacy exception: passwords ride `ixian:` URLs OUT of lock / launch / settings (L2, kept on purpose).
6. Only C# signs and broadcasts: `SPayments.confirmAndAuth` is a NATIVE dialog built from the values that get signed (P02).
7. C# names every file it writes; a WebView sends ids or tokens, never paths (exceptions are listed in P11).
8. Every push argument is base64 in one composer, `Utils.sendUiCommand` (O-11, P14); the one raw script is the int-only keyboard inset (P14).
9. Mini-app WebViews reach only their own verb list in `MiniAppPage` plus the base `onNavigatingGlobal` verbs; every global verb we added refuses a mini-app (P06, P07).
10. Ixian-Core is frozen and BE-only; the wire protocol is unchanged (new USES of existing codes are in P15).

## Review order
1. The eight flags below (10 min). 2. **103-minute path** (with steps 1 and 3): P01–P11 (lock, money, password, restore, overlay over the lock, mini-apps, WebView config, QR, contacts, media, downloads) + P24 (the password at rest). 3. `core-asks.md` (5 min). 4. P12–P23 + P25 (~75 min; a second sitting, or read only the "Look here first" lines). 5. `legacy-not-ours.md` (5 min) — yours, seen once.

## ⚠ Found while condensing — the eight flags (found at 387ca78b; status at the S16 tree)
| # | Packet | Finding | Ours / legacy | Status |
|---|---|---|---|---|
| F1 | P01 | `ixian:change` on an app lock fires `authSucceeded(false)` and `App.onUnlock` (`App.xaml.cs:463`) ignores the bool → unlocks with no password. #234 is closed in the SHELL only (#458). Reachable by script in lock.html; WebView2 DevTools are on in every Windows build (legacy, `SpixiContentPage.cs:523`) | legacy path, our close incomplete | **fixed #1322**: LockPage refuses `ixian:change` on every lock with no Cancel; `onUnlock` releases only on true; the cold-start leg removed (the RESTORE-B sheet sends no verb, #1324) |
| F2 | P05 | A user navigation supersedes a lock that is still STAGING (`SpixiContentPage.cs:3609`, #629); a chat script can cancel a desktop idle lock in its ≤ 1.2 s load | ours (#629) | **fixed #1322**: drop + warn while a lock stages (< 5 s, monotonic); `cancelPreload` never cancels a lock. Recorded: past 5 s a supersede still orphans the lock op |
| F3 | P12 | `ixian:voicerec:start` opens the mic with no C# gesture or foreground check; the gate doc says "only after a tap" | ours (#1207) | **fixed #1322** → P25 (flag `MediaInputGate`: foreground, no lock, this chat on screen) |
| F4 | P10 | `ixian:pasteImage` reads the clipboard image with no gesture; `mediaSend` can then send it to the open chat | ours (#1156) | **fixed #1322** → P25 (the same gate before the clipboard read) |
| F5 | P09 | `ixian:declineRequest:` from home removes ANY friend, Approved included (`HomePage.xaml.cs:6946`); `ixian:removecontact` has no native confirm | ours | **fixed #1322**: decline removes only what the request card shows. ⚠ OPEN: home `removecontact` still removes any contact with no native confirm — decision owed (P09) |
| F6 | P21 | Legacy `ixian:sendLog` (`HomePage.xaml.cs:1633`) still zips the log and opens the share sheet without the O-19 dev-mode gate | legacy verb, no shell sends it | confirmed; delete? (BE) |
| F7 | P13 | `ixian:appAccept` from chat / home / contact details answers a ringing call (mic on); the gate refuses mini-apps only (#272) | legacy, narrowed by us | confirmed by reading |
| F8 | P11 · P21 | `DownloadsPage` logs the whole exception (`:175`, `:193`, `:235`) though #1107's pin says type only; the `mutechat` warn line is ours (#476), filed as inherited | ours | **fixed #1322**: type names only (+ the SettingsPage twins); mutechat logs a length |

## All packets (HIGH first)
| id | Title | Risk | Money / keys | Bridge | Status | Min |
|---|---|---|---|---|---|---|
| [P01](P01-lock.md) | App lock, grace window, desktop idle lock | HIGH | yes — the lock; password in `ixian:unlock:` | yes | shipped · F1 fixed | 7 |
| [P02](P02-money.md) | Payments: signSend, pay a request, tip | HIGH | yes — sign + broadcast | yes | shipped | 8 |
| [P03](P03-walletpass.md) | The wallet password: change, cleartext copy, backup | HIGH | yes — the password | yes | shipped · L8 built → P24 | 7 |
| [P04](P04-restore.md) | Restore, backup, create, account wipe | HIGH | yes — wallet files | yes | shipped | 8 |
| [P05](P05-overlay.md) | Overlay navigation, present-on-paint, pane hand-offs | HIGH | the lock | yes | shipped · F2 fixed | 8 |
| [P06](P06-miniapps.md) | Mini-apps: install, uninstall, invites, camera refusal | HIGH | no | yes | shipped | 8 |
| [P07](P07-webview.md) | WebView config, navigation policy, base verb dispatch | HIGH | no | yes | shipped (Mac not walked) · MAJOR #9 Android fixed | 7 |
| [P08](P08-qr.md) | QR scan: what a scanned code can do | HIGH | yes — fills the send form | yes | shipped | 6 |
| [P09](P09-contacts.md) | Contacts, requests, groups | HIGH | no | yes | shipped · F5 fixed · ⚠ `removecontact` confirm owed | 8 |
| [P10](P10-media.md) | Photos, camera, paste, file send, previews, auto-download | HIGH | no (peer bytes decoded in-process) | yes | shipped · F4 fixed → P25 | 8 |
| [P11](P11-downloads.md) | Downloads, shared items, delete / open / show | HIGH | no | yes | shipped · F8 fixed | 6 |
| [P12](P12-voice.md) | Voice messages | HIGH | no (the mic) | yes | shipped · F3 fixed → P25 | 5 |
| [P13](P13-calls.md) | Call surface, call controls, decline-with-message | HIGH | no (the mic) | yes | shipped (Speaker: dev builds) · ⚠ F7 | 8 |
| [P14](P14-transport.md) | C# → JS push path, batch push, data: URI rule (O-11) | HIGH | no | yes | shipped | 5 |
| [P15](P15-chatmsg.md) | Reply, edit, reactions, receive guards, links, native copy | HIGH | clipboard address swap | yes | shipped | 7 |
| [P16](P16-spare.md) | Warm chat spare, parked Account, Account sublevels | HIGH | password form in the parked pane | no | shipped | 6 |
| [P17](P17-perf-planned.md) | Planned perf levers: media URL handler, chat renderer profile, https origin, chat-info pool | HIGH | yes — lever #8 (wallet beside home) / option B | yes (planned) | **planned, flagged** | 6 |
| [P18](P18-notif.md) | Push, the two push extensions, mute, notification prefs | MED | no | yes | shipped | 7 |
| [P19](P19-avatars.md) | Avatars and group photo | MED | no | yes | shipped | 6 |
| [P20](P20-privacy.md) | Read receipts, typing, hide online, last seen | MED | no | yes | shipped | 5 |
| [P21](P21-dev.md) | Dev mode, Send log, dev seed, perf stamps, log lines | MED | no (the log) | yes | shipped · ⚠ F6 | 6 |
| [P22](P22-build.md) | Build, store gates, manifests, supply chain | MED | no | no | shipped | 6 |
| [P23](P23-theme.md) | Theme, language, hints, About / help links | LOW | no | yes | shipped | 5 |
| [P24](P24-walletpass-l8.md) | L8: the wallet password in SecureStorage (flag `SecureWalletPass`) | HIGH | yes — the password at rest | yes (dev verb) | shipped, flag ON · Mac not walked | 7 |
| [P25](P25-media-input-gate.md) | F3/F4: the mic and the clipboard only for the chat on screen (flag `MediaInputGate`) | HIGH | no (the mic, the clipboard) | yes (gated verbs) | shipped, flag ON | 5 |
| [P26](P26-whats-new.md) | S17: the "What's new" card + the About / Contributors status-bar ink (flag `S17Bridge`) | LOW | no | yes (1 push, 2 verbs) | built, flag ON | 4 |
| P27 | reserved (desktop Hello — not built) | — | — | — | — | — |
| [P28](P28-moments.md) | S17: seven one-time Moment sheets (flag `S17Moments`); `ixian:photoAutoDl:` one-shot on a chat page | LOW–MEDIUM | no (the pay moment only delays the FE review) | yes (2 pushes, 2 verbs) | built, flag ON | 6 |
| [P29](P29-file-size.md) | S20 E: the file size on the file card in both directions (flag `S20FileSize`) | LOW | no | `addFile` arg 20 widened · 1 dev verb, 1 dev push | built, flag ON · ⚠ uncompiled | 3 |
| [P30](P30-restore-keeps-contacts.md) | S20G P0 + F-1: a restore never deletes an earlier contact list (kept as `restore-previous/<stamp>`, ask first, delete account wipes it); Account closes the open chat (flag `S20G`) | MEDIUM | no | 0 new verbs to the app shells · 1 dev verb, 1 dev push · 4 C# alert keys | built, flag ON · ⚠ uncompiled | 3 |
| P30 | not built — the S20 notification strip: no OS notification carries message text (Node.cs per-type line), so nothing to strip | — | — | — | — | — |
| [P31](P31-v1am-moments-and-tips.md) | V1A-M M1 + M2: the "What is IXI?" moment (id `ixihelp`, home only; obeys the session rule, never takes it) and two word tips on the Chats screen (ids `wordrequest`, `wordphonebook` on the S11 hint verb) (flags `V1IxiHelp`, `V1Hints`) | LOW | no | 1 new moment id · 2 new hint ids · 2 caps · 2 dev verbs, 1 dev push · 2 prefs | built, flags ON · ⚠ uncompiled | 3 |
| [P32](P32-s20i-address-moment.md) | S20I: the "How people find you" moment on the Account hub (id `addrhelp`, a Settings page ON SCREEN only, every account once; obeys the session rule, never takes it) (flag `S20AddrHelp`) | LOW | no | 1 new moment id · 1 cap · 1 extra setMoments push at the Account present · 1 pref | built, flag ON · ⚠ uncompiled | 2 |
| [P33](P33-miniapp-paths.md) | Session Safety S-1 · S-2 · S-3: the mini-app id, the storage table and the picked file name build no path outside the app's own folders; the install catch deletes only what it created (one Install tap with id `../..` deleted the Spixi folder) (flags `SafeAppId`, `SafeStorage`, `SafePick`) | HIGH | yes — `wallet.ixi` was reachable | no new verb · SDK storage refusal keeps its answer shape · 3 dev switch names, 1 dev push · 3 prefs | built, flags ON · ⚠ uncompiled · MAJOR #8 still open | 6 |
| [P34](P34-android-share.md) | Session Safety S-4: the Android FileProvider publishes Downloads, Sent and the cache only; Share grants a staged copy `cache/share/<guid>/<leaf>` (60-min prune) | MEDIUM | yes — the wallet backup Share granted the wallet file itself | none (an Android resource + C# staging) | built, NO runtime flag (resource) · ⚠ uncompiled | 4 |
| [P35](P35-native-confirm.md) | Session Safety S-5: a native OK / Cancel before removecontact · removehistory · leave · kick · ban on chat + chat info (one confirm app-wide, no time bound, other alerts dropped while it is up); home keeps its sheet (D5) (flag `NativeConfirm`) | MEDIUM–HIGH | no | 5 verbs gated · 1 push word `cancelled` · 4 C# alert keys · 1 shell line · 1 dev switch name | built, flag ON · ⚠ uncompiled | 7 |
| [P36](P36-history-lock.md) | Session Safety S-6: `ixian:deleteh` and `ixian:deleted` present `LockPage(true)` first and act on success only (flag `HistoryLock`) | MEDIUM | no | 2 verbs gated · 1 dev switch name | built, flag ON · ⚠ uncompiled | 3 |
| [P37](P37-windows-miniapp-marker.md) | Session Safety O-02: the Windows handler honours `ClassId="miniapp"` — no DevTools, host objects, permissions, new windows or downloads for the mini app (flag `WinAppMarker`); ⚠ C-12 (storage partition) still OPEN, parked | MEDIUM | no | WebView2 drops only · 1 dev switch name | built, flag ON · ⚠ uncompiled (Windows F5) | 3 |
| [Core](core-asks.md) | Everything that needs Ixian-Core (BE-only) | — | — | — | asks | 5 |
| [Legacy](legacy-not-ours.md) | Inherited exposures we did NOT change | — | — | — | yours | 5 |

Total ≈ 3 h 05 min: packets 2 h 45 min (+12 min for P24–P25) + flags, Core asks and legacy 20 min. Session Safety adds P33–P37: +23 min (6 + 4 + 7 + 3 + 3). The 103-minute path = the flags (10) + P01–P11 (81) + P24 (7) + Core asks (5); P25 goes with P12 in the second sitting.
