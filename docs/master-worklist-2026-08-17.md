# Master worklist — 2026-08-17 reconciliation

Damir's list 1 + list 2, deduplicated, reconciled against the live plan
(`handoff-2026-08-16d.md` §3), the findings register (`f5-findings-2026-08-15.md`)
and what is already built. New items get stable IDs **N1–N45** so sessions can
reference them. Duplicates between the two lists are merged and noted.

*2026-08-18: **N4 BUILT** (#378/#379, its own cloud session) — 13 locales live, launch-set dial + native review open. R2 is now fully closed.*

*2026-08-17 (late): the D-19b family + N48/N49/N50 + the R2 round are BUILT
(#370–#373). Struck below. N4 stays open (needs its own session). N51–N55
added from Damir's #370-era F5 walk (all code-verified). Also struck:
the FIVE #361 rows this doc predated (N5 · N24 · N36 · N38 · N45) — the §F
item-2 "bug batch" proposal became the #361 batch the same day, and only the
R1/R2 strikes were ever applied here.*

---

## A. Already DONE — strike from both lists

| Item | Where |
|---|---|
| Apps empty-state search bar flicker (list 2) | **D-17, built #359** — your F5 items 13–14 |
| "Connecting…" dies on language change (list 1 origin) | **D-20, built #357** — F5 items 6–8. ⚠ List 2's "connecting not showing after long use" is DIFFERENT and new → **N40** |
| Bot-room sender impersonation | **D-19, built #356** |
| Digit grouping / amount readability | **I-6, built #360** (zero-balance 2-decimals dial = **N32**, small rider) |
| Selected chip vs button ambiguity | **I-2, built #358** |

## B. Already TRACKED — no new rows needed

| Item (both lists) | Tracked as | State |
|---|---|---|
| Delete account → remove all data → welcome | **D-9** | Table A next-but-one |
| Reply messages, non-C# way | **D1** — design LOCKED: reference rides the message BODY as an id, resolved locally, no protocol change (that IS the minimal-C# way; three small C# pieces remain). NEW rider **N6**: auto-@mention the replied author in groups | Table A row 3 |
| Group rename / photo / add members (owner) | **Table B q5** — verified NOT in Ixian-Core; A5 + CI7 stay BLOCKED. Re-verified at `097341a` | Parked, BE |
| Chat-info loads slowly, skeletons imperative | **I-9** — Damir escalation noted; still measure-first (#294), then build | Table A tail, now prioritized |
| Welcome/create/restore flicker | **I-1 + welcome flicker** (one native transition, mobile only). Spinner-on-button during create/restore = NEW rider in **N44** | Table A tail |
| A52 slow entering chats | **Measured and closed** #349: 234 ms cold / 212 ms warm, no segment dominates, verdict "no further chat-entry perf work". Remaining honest levers: I-1 (transition masks latency), **I-12**/#298 (transport prepend, not bigger reflush), I-10 (app-pane, measure first) | Tracked |
| Restore copy / locale round | **D-7 + I-11 + AND-35** — one locale round; N3/N4 fold into it | Table A tail |

## C. NEW — bugs first (the fix-first rule)

| ID | Item | Owner | Size |
|---|---|---|---|
| ~~**N13**~~ | **CLOSED 2026-08-18 (Damir, on device): the onboarding "Back up now" CTA WORKS.** The #334 L3/AND-5 wiring is live (`OnboardPage.xaml.cs:41-48` `ixian:backup` → `BackupPage.backupAccount()`; the restore path sets `walletpass` before the modal, so the CTA works after a restore too). No build was needed | — | done |
| ~~**N40**~~ | **BUILT #383** (triage `docs/n40-triage-connecting.md` → fix). Connectivity now runs first and unconditionally in `HomePage.updateScreen`; the update notice is a separate, dismissable surface; both may show (Damir dial). F5 = `docs/f5-checklist-2026-08-18-n12-n40.md` §B | C# | done |
| **N63** | **English-fallback tail in the 7 OLDER locales** (Damir, F5 2026-08-18: the chat "Show older messages" pill is always English). NOT a wiring bug — `showOlderMessages` exists and resolves correctly; the 5 N4 locales (it/id/lt/cn/ja) carry real translations, the 7 older ones (de/fr/es/pt/ru/sl/sr) carry the en-us value. Measured at source: **10 keys untranslated in ALL 7** — `showOlderMessages` · `unreadElsewhere` · `paidMessage` · `noPeople` · `noGroups` · `launchInvite` · `groupSelectedCount` · `tipNoAnswer` · `appUrlPlaceholder` · `filter` (⚠ a few are legitimately identical in some languages — `filter` in de, `https://…` everywhere — so the fill needs a human eye, not a script). Per-locale tails on top: de 26 · fr 35 · es 20 · pt 24 · ru 16 · sl 18 · sr 18 of 708. Class = the #285/#287 fallback tail; these keys landed in batches AFTER the 7 were last filled. Fix = drafts + the standard string pipeline (extract → build-locales → build-strings-iife → bundle → shells → verify-locales + i18n-lint + pseudo + **i18n-overflow-audit**) | FE copy | S |
| **N64** | **The update notice — one design round** (Damir, F5 2026-08-18, screenshot; logged not built). The #383 fix made this strip render for the first time, and it shows four problems. ① **SCOPE — it is chats-only by accident, not by decision.** `homeBanner` mounts into `#chats-banner`, which sits inside `#chats-view` (`src/shells/home.html:281-283`), and `.view[hidden]{display:none}` — so an app-level notice is invisible on Wallet and Apps, while the LESS global connectivity state lands on all three tab titles (`titleStateTargets`, #322). Hoist it above the tab views. It is dismissable and pushes once per document, so it cannot nag. ② **★ NO ACTION — the biggest flaw.** The copy says "please update" and offers only a ✕; the user must find the store alone. Either add an Update CTA or reword so it stops instructing. A CTA = a NEW outbound verb (precedent `ixian:spixiAppsLink` → `Browser.Default.OpenAsync`, `HomePage.xaml.cs:867-870`) + a URL in `Config.cs` beside `spixiAppsUrl:34` → **needs a security-gate row and Damir's dial (store link vs release page, and per-platform)**. ③ **TONE — it wears the warning costume.** `--surface-warning-inverse` / `--text-warning` / `--icon-warning` + the `alert-square-rounded` glyph (`banner.js` · `banner.css`) is the "something is broken" role; an available update is neutral information → info role + a download/arrow-up-circle glyph. ⚠ the strip is shared with actionable warnings, so re-tone per KIND, not the whole component. ④ **COPY — ~100 chars, wraps to two lines above the fold.** `global-update-available` (`Raw/lang/*.txt:658` en-us) ends in filler ("Please update for best experience" / "um das beste Erlebnis zu haben"); ~30 chars would do. Legacy key ×12 locales → **fold into N63's copy round**. NITs: the ✕ is centred against a two-line block (moot once the copy is one line) · the amber-on-dark pairing has not been eyeballed since the #244 re-anchor | FE + small C# (② only) | S–M |
| **N65** 🔴 | **WINDOWS: the language pick does NOTHING, and four surfaces disagree at once** (Damir F5 2026-08-18, 2 screenshots). Observed in ONE frame: the Account hub renders in **French**, its Langue row VALUE says **Deutsch**, the picker CHECKMARK sits on **Português (Brasil)**, and the whole rest of the app is **German**. Picking pt-br changed nothing. Prime suspect, verified at source: `SettingsPage.xaml.cs:469-497` gates EVERYTHING on `if (SpixiLocalization.loadLanguage(lang))` — pref, `setLocale` push, `HomePage.reloadShell()` and the live-chat reloads all sit INSIDE that `if`, so a `false` return is a **silent, total no-op with no alert and no log line**. `loadLanguage` (`SpixiLocalization.cs:34-70+`) returns false whenever the asset read fails (`SPlatformUtils.getAsset`) or the code resolves to no file. Triage order: (1) does `loadLanguage("pt-br")` return false on Windows — add a temporary log line, do NOT guess; (2) if it returns TRUE, the four-way split is a state problem, so enumerate the FOUR sources separately — the hub dictionary (baked at generatePage via `*SL{language-code}`), the row value (`setLanguage` push), the checkmark (`selectedLanguage`/`Preferences["language"]`), the home shell (its own bake); (3) whatever the cause, the handler must **never fail silently** — an unhandled pick needs a visible error. ⚠ German UI + French hub means the app has been carrying a stale mixture for some time — check whether the pick EVER worked on Windows after #285 | C# + FE | **🟡 #385: TRIAGED + the silent failure CLOSED.** The parse now names its failure and cannot throw out of `loadLanguage`; the handler logs the request, the result and the active code. Proven at source: all 13 language files are clean, so a parse cannot be the cause, and `de-de` loads on Windows — so the leading hypothesis is now `loaded=True` + a four-way state split. **One device log line decides it** — protocol in `docs/n65-triage-language-pick.md` §2. The split itself is NOT fixed |
| **N66** 🔴 | **Theme: some surfaces do not follow the OS theme** (Damir F5 2026-08-18, Android + Windows). ANDROID with theme = System, OS dark: the whole app is dark **except the Account screen, which stays light** — and it stays light across screen switches. Picking Dark or Light explicitly themes everything correctly, so **only the OS-follow path is broken**. WINDOWS shows the sibling: the chat/message pane and the list pane disagree on theme in one window. Prime suspect: Account is the PARKED peer WebView (#315 park-don't-dispose) and the OS-flip re-theme fan-out does not reach a parked document — the #314 loop already caught a "stale-theme park" once, and #251 fixed EmptyDetail for the same class (a resting pane in NO re-theme collection). Entry points: the OS-flip handler → `reloadAllPages` / the `setTheme` push · `SpixiContentPage` overlay + parked-page enumeration (the #284 `getChatPages` lesson: every "reload them all" helper has missed a collection at least once) · `onRepresented`. Fix shape: enumerate parked/peer/detail surfaces in the OS-flip path exactly like the explicit pick does — the explicit pick works, so **diff the two paths** rather than inventing a third | C# | **✅ #385: ROOT-CAUSED + FIXED (C#-only).** It was not a missed collection — the whole OS-follow handler was UNREACHABLE. `App.xaml.cs` pinned `UserAppTheme` at boot, and the handler pinned it again as its first line; MAUI drops `RequestedThemeChanged` when the resolved `RequestedTheme` does not change, so the handler disabled itself the first time it ran. `UserAppTheme` now stays `Unspecified`, `ThemeManager` resolves "automatic" from the platform theme, and the revived handler is gated on System. ⚠ **The ANDROID leg (Account light under system-dark) does not follow from this mechanism alone** — if it survives the fix, inspect the parked instance and `data-theme` on device |
| **N67** 🔴 | **★ ONE destructive action: "Delete Spixi account"** (Damir product call 2026-08-18). Today wallet deletion and account deletion are separate doors, and the flow **errors when deleting the account and then restoring**. Ship exactly ONE action that wipes everything, with copy that says so plainly before the user commits (wallet + identity + contacts + history + downloads), and remove the second door. ⚠ This is destructive-path work: it needs the delete→restore error reproduced and named FIRST (#215), a security-gate row, and it must not strand a live wallet behind onboarding (the W14/#348 guard, `LaunchRestorePage`/`LaunchCreatePage`). Related history: #284 delete-all live-chat sweep · #264 delete-data modal · the `deleteh`/`deleted`/`deletea`/`delete` verb family in `SettingsPage` | C# + FE + copy | M |
| **N68** | **A fatal-exception OS dialog after "failed restore → create"** (Damir F5 2026-08-18, §A5 — the checklist leg PASSED functionally, the app kept running, but the OS crash dialog appeared). Needs **logcat**, nothing else, before any code (#215). Suspected neighbourhood: the abandoned-restore cleanup (a `.tmp` wallet file left in `Config.spixiUserFolder`, `LaunchRestorePage:178`) meeting `Node.generateWallet` on the create path. Related: AND-24 (native dialogs read ugly) — but this one is a real unhandled throw, not a styling row | C# | **repro + logcat first** |
| **N69** 🔴 | **The FIRST connect after account creation never completes until the app is restarted** — and a contact request sent during that window is silently lost (Damir F5 2026-08-18, §B1). Fresh account, real internet: "Connecting…" showed and stayed. Scanning a QR to send a contact request during that window **appeared to succeed and did not send**. After a restart the app connected normally. ★ Two separate defects, and note the FIRST one is NOT a UI bug: the indicator was TRUTHFUL — `getConnectedClients(true)` really was empty, so the app genuinely was not connected. (a) the post-creation connect path does not establish a DLT client until a restart — C#/Ixian-Core, likely the same neighbourhood as N57 · (b) an outgoing contact request accepted while disconnected must either QUEUE and report as pending, or be refused with an honest message — today it reports success and vanishes. **(b) is the user-facing lie and can be fixed independently of (a).** ⚠ (a) is a strong candidate for the ORIGINAL N40/D-21 report too — see `docs/n40-triage-connecting.md` M2 | C# + Core | **triage first** |
| **N70** | **The update notice does not appear when the app started OFFLINE and connectivity arrives later** (Damir F5 2026-08-18, §B3). `UpdateVerify` runs at start and then on a **1-hour** period (`Config.cs:47`), so a start-offline session shows nothing until the next period elapses or the app restarts. Not a regression — inherited behaviour that #383 made visible. Fix shape: re-arm the version check on the offline→online transition (the connectivity arm in `HomePage.updateScreen` already sees that edge). Small; rides N64's update-notice round | C# | S |
| ~~**N5**~~ | **BUILT #361** (danger-sub wrap + min-width chain + the master-column clamp; #362 refined; F5 pass #363) | FE | done |
| **N10** | App-invite **Cancel in chat doesn't work** — should cancel, keep the bubble, say "Canceled" on BOTH ends | C# here + maybe BE (counterpart side) | triage |
| **N33** | Group file transfer only relays from the CREATOR when members aren't mutually connected; others' files reach the creator only | **BE / protocol → new Table B q11** | BE |
| ~~**N36**~~ | **BUILT #361** (pressable bails in `[data-selecting]`, in-bubble controls pointer-dead). The Android A4 flash is a DIFFERENT layer → **N36b** — RE-OBSERVED by Damir 2026-08-17 (repro gate met) → promoted into the N51+ fix batch → **BUILT #375** (the #363 one-liner on .c-bubble-row; ⚠ if the flash survives on device, a SECOND layer hides beneath — report, do not stack) | FE | done |
| ~~**N49**~~ | **BUILT #370** — highlight rides onOverlayPresented (wide only, r2 F-1) + guarded clear on close | FE | done |
| ~~**N50**~~ | **BUILT #370** — cdoverlay/cdBack wiring (homeoverlay grammar) + onLoad reset + HomePage route | FE | done |
| **N15** | Group typing indicator shows NOTHING (bot + private). Sender attribution is a known BE ask (be-cutover C21); whether the GENERIC pill can show in groups may be ours — triage first | triage → likely split | M |
| **N39** | Request/cancel story: payment request has no cancel (does sender-side bubble delete revoke it?); outgoing contact-request delete should prompt revoke + explain (legacy `ixian:undorequest` EXISTS — likely buildable without BE) | C# here + FE | M |
| ~~**N51**~~ | **BUILT #375** (chatoverlay/chatBack mirror — the N50 grammar + the two off-stack arms; #376 A-1 dead-handle wedge fixed) + **AND-37** (settings onBack sheet arm, FE-only) | C# + FE | S |
| ~~**N52**~~ | **BUILT #375** (ring → SOLID --surface-warning + visible-start rAF poll; #376: reduced-motion static ring + id re-bind; messagesToLoad 25→50, D-18 re-walked — ⚠ A52 re-measure owed) | FE + C# 1-line | S |
| ~~**N53**~~ | **BUILT #375** (all five upserts feed the badge; #376 B-1 re-flush quiet window + B-5 200px clear) | FE | S |
| ~~**N54**~~ | **BUILT #375** (nearBottom gate) | FE | XS |
| ~~**N55**~~ | **BUILT #375** at THREE sites; contact_new deliberately NONE (#376 B-2 — C# alert-and-stay paths made it false; post-pop feedback = open dial) | FE | S |
| **N57** | **TRIAGED #375 → `docs/n57-triage-group-visibility.md`** — FE + C# push path exonerated; 3 candidate mechanisms ALL Core-side; Damir runs the 4-leg protocol; be-cutover [N57?] updated. ★ RE-OBSERVED post-#375-F5 in normal use — reproduces readily; the protocol + dev-log capture is the TOP Damir action | triage → likely BE | triage |
| ~~**N58**~~ | **BUILT #375** (avatar NODE decode cache, the #340 class; presence dot patched in place) | FE | S |
| ~~**N59**~~ | **BUILT #375 → N59b same day** (Damir screenshot: disc now centres against the title+sub GROUP — absolute disc, stack gutter, pull-up dropped) | FE | XS |
| **N60** | ★ Android app UPDATE wiped the account (Damir 2026-08-17: deploying the new build over the existing install forced a restore). App DATA must survive an in-place update. Prime suspect: an APK signature mismatch between the installed build and the new one → the deploy uninstalls+reinstalls (data gone). NOT app code until proven: next update, deploy WITHOUT uninstalling and capture the build/adb output (INSTALL_FAILED_UPDATE_INCOMPATIBLE = the confirmation). Mitigation: ONE configuration per test device; if mismatch recurs, pin an explicit keystore for Debug AND Release in the csproj (one-time ops change). Release-user upgrade integrity rides the same answer | ops → maybe csproj | triage |
| **N61** | ★ Restore shows chats WITH excerpts but every conversation is EMPTY (Damir 2026-08-17; bot rooms refill — they re-fetch history from the bot server). VERIFIED AT SOURCE, INHERITED: the backup has NEVER contained message history — `BackupPage.backupAccount` archives `Acc/` (one level, non-recursive) + account.ixi + avatar.jpg + wallet.ixi and never touches `Chats/` (byte-identical at fork `0e85a4b8`); history lives at `<spixiUserFolder>/Chats/<addr>/<channel>/*.ixi` (Ixian-Core LocalStorage.cs:546). The excerpts render because lastMessage rides the Friend metadata in `Acc/`. Fix shape (C# HERE, small-medium): recursively archive `Chats/` in backupAccount + carry it through the restore move (LaunchRestorePage extracts generically, :207); ⚠ dials: history can be LARGE (opt-in "include messages"? size cap?) and `Downloads/`/avatars scope — Damir picks. Rides the R4 restore round beside N12/N13 | C# here | M |
| ~~**N56**~~ | **BUILT #375** (--surface-pinned 9%/6% + ladder + press-fade landing; values = Damir eyeball dial) | FE | XS |

## D. NEW — buildable, grouped into rounds

**R1 — Identity round (chat surfaces) — ✅ BUILT 2026-08-17 (#364–#368, with D-5)**
- ~~**N1** Avatar system rework~~ **BUILT #364** (12 quantized anchors + white ink both themes + group glyph; the hashHue-distribution suspect was disproven — S/L was the cause)
- ~~**N34** Owner chip~~ **BUILT #365** (Owner-ONLY — "Admin" has no data source in Core; blind-gated)
- **N22** ~~built earlier~~ **BUILT #361** (private-group member count)
- ~~**N26** member-sheet Add contact~~ **BUILT #366** (relation rides the bridge; BOTH surfaces; request-payment NOT built — no address-bearing money verb on SingleChatPage, logged)
- ~~**N27** name the blocking groups~~ **BUILT #367** (in-shell modal; path-out is text — tap-through = follow-up dial)

**R2 — Copy & locale round — ✅ RUN 2026-08-17 (#371; D-7 + I-11 + AND-35 + the one-liners)**
- ~~**N3**~~ **#371 partial**: apps empty-state = Damir's short line · 17 aria joiners de-dashed · de-de 40 + sl-si 2 en-dashes rewritten. OPEN residue: the "simpler friendlier voice" app-wide sweep has NO target list (ask Damir) · ru copula dashes + lt-lt legacy dashes = Damir's call
- ~~**N4**~~ **BUILT #378/#379 (cloud session, 2026-08-18).** The five dictionaries ship (it/id/lt/cn/ja: reuse 120-128 + draft 584-592 each), culture gate + both pickers moved together, overflow audit ran (29 breakers fixed, gate tool committed), #46 loop on Opus 3 rounds → CLEAN. OPEN DIAL (#378): the launch 15–20 set — proposal = 13 existing + tr/pl/ko/vi/uk; NO build beyond the five until Damir answers. Native review of the 5 drafts = open (docs/n4-review-notes.md)
- ~~**N32**~~ built #361

**R3 — Art & atmosphere round (with the I-3 design round)**
- **N14** Nudges/notices: security notice redesign + subtle blue-ish top-center radial gradient (transparent bottom) on security notice, backup nudge (dialog on Windows / sheet on mobile) and rating nudge; rating nudge uses the `rate-me` illustration from images/. (M)
- ~~**N45**~~ **BUILT #361** (PNG-per-asset by bytes, 13 sites rewired, rating-nudge illustration grammar = N14a; #362 fixed 2 demo refs)
- **N21** Chat pattern: dig up the legacy lineart pattern; make ALL levels more subtle — current subtle becomes the new strongest. (S–M)
- **N19** Connecting/loading: animated gradient line as the topbar's bottom border — decide connecting-only vs shared loading affordance (design dial first). (M)

**R4 — Onboarding & restore round (with I-1)**
- ~~**N13**~~ **CLOSED** (works on device, 2026-08-18) → the round now opens on **N12**.
- ~~★ **N12**~~ **BUILT #383** — both legs landed (tail opens on the join step for a restored account; the 30-day reminder clock is seeded at the restore). Damir's dial: the join step STAYS. F5 = `docs/f5-checklist-2026-08-18-n12-n40.md` §A. The community-bot-post-restore half of the row is still OPEN. Original triage below, kept for the file:line evidence:
- **N12** — **restore must NOT nudge for a backup** (Damir 2026-08-18: "when restoring an account, we shouldn't nudge the user to back up immediately, since it's restoring from backup"). **TRIAGED AT SOURCE 2026-08-18 (#381), TWO independent legs, both fire on a fresh restore:**
  - **Leg 1 — the onboarding tail.** `LaunchRestorePage.onRestore:155` removes `onboardingComplete` exactly like `LaunchCreatePage:190`; `HomePage.onLoad:1446-1452` pushes `OnboardPage` whenever that key is absent, and the tail's FIRST step is the backup nudge (`launch-shell.js buildTail:985-1006`). Nothing carries the restore/create provenance, so the two are indistinguishable at that point.
  - **Leg 2 — the periodic reminder.** `HomePage.displayBackupReminder:2274-2282` fires on the first tick whenever `backupReminderTimestamp` is absent, which it is on a fresh install (restore does not seed it) → `toggleAnimatedSlider("backup-prompt")` → `home.html:2864` → `enqueueNudge('backup')`. The shell's own suppressor `backedUpRecently()` (`home.html:2222`, key `spixi.backup.last`, 30 days) is also empty on a fresh install, so nothing stops it.
  - **Fix shape (small; not built).** Leg 2 = one line in `onRestore`: seed `backupReminderTimestamp` with `Clock.getTimestamp()` — the key and the 30-day period (`Config.cs:76`) already exist, so the first reminder lands one full interval after the restore. Leg 1 = provenance + a start step: a Preference set in `onRestore`, read where `OnboardPage` is constructed, delivered to the shell as a C#→WebView push (a push, NOT a new `ixian:` verb — the outbound bridge stays frozen), and `buildTail` starts at the join step. ⚠ **Damir dial:** the cheaper variant is to skip onboarding altogether on a restore (set `onboardingComplete` in `onRestore`, zero shell change) — it also drops the "Join the community" step for restoring users. Pick before the build.
  - Community bot works post-restore when already in contacts (address check) — unchanged, still part of this item. (M)
- **N44** Spinner-on-button masking create/restore work (setLoading exists). (S)

**R5 — Calls round**
- **N11** One round: bubble states polish · Call back ONLY on ended/missed calls (today it shows during a live call) · call banner BELOW the topbar so the app stays usable in-call (chats list starts under it) · Speaker toggle in the banner · OS-side real ringing (persistent/vibrating notification with accept/decline — fullScreenIntent class on Android). (L)

**R6 — Notifications round**
- **N35** Per-chat notification toggle must work on private groups (works on bot only today) + a global toggle · Android: tapping an OS notification deep-links STRAIGHT into that chat (today: chat list first, slow) · combine multiple notifications from the same chat into one (MessagingStyle grouping). (M–L)
  - *Damir repro 2026-08-17: 15 messages from one sender = 15 tray rows. VERIFIED cause: `SPushService.showLocalNotification` calls `manager.Notify(messageId, ...)` with a UNIQUE id per message; `SetGroup(data)` is set but no group SUMMARY exists, so Android never collapses. NO FE lever exists (the tray is native). Damir dial 2026-08-17: goes to the BE ENGINEER, not us — logged as **be-cutover NT1** (cheap interim = stable per-chat id + SetNumber; proper fix = MessagingStyle + summary, pairs with this round's deep-link ask). Ask politely at the cutover.*

**R7 — Wallet & money round**
- **N25** TX details: collapse address/date/fee/txid under "See details" + chevron. (S–M)
- **N31** Tipping should not ALSO create a payment bubble — verify what creates it, then dial. (S triage)
- ~~**N38**~~ **BUILT** — account half #348-W9, wallet-receive half #361 (same `isDesktopPresentation` predicate)
- **N43** Search bars appear only when content overflows (chats + wallet; wallet also only once the hero is minimized) — dial then build. (S–M)

**R8 — Desktop round**
- **N9** Send/Receive live in the detail pane instead of overtaking the wallet — tradeoffs on request. (design dial)
- ~~**N24**~~ **BUILT #361** (+#362: aria-current on `__open`, present-time push — the precedent N49 copied)
- **N29** Very wide window: left-align bubbles vs centered max-width column (WhatsApp style, affects composer) — dial. (design)
- **N30** Sounds: desktop incoming chat/payment + a desktop-specific toggle; mobile send/receive/tx sounds. (M)

**R9 — Apps & icons**
- **N2** Icon audit: missing icons, duplicate/misfit uses; includes the list⇄grid toggle using a REAL grid glyph (today it reuses the apps icon). (S–M)
- **N41** Downloads: filter by date/user/type; explore media-tiles view. (M)

## E. NEW — questions needing an answer or a Damir dial (no build yet)

| ID | Question | Short position |
|---|---|---|
| **N7** | Account as a preloaded peer screen like wallet/chats/apps? | Feasible. Trade: memory + boot cost of one more live WebView vs instant tab entry. Middle path: idle-warmup after first paint. Needs a session to measure (#294) |
| **N8** | Send flow redesign WITHOUT the BE engineer? | The compose/review takeover already exists behind `bridge.cap` — the question is whether legacy `ixian:` verbs suffice for the cutover. Needs one verification session against `be-cutover-brief.md`; verdict before building |
| **N16** | Pin message | Design first: LOCAL pin (per device, zero protocol) vs synced pin (protocol/BE). Local-first recommended; sticky row + jump is FE |
| **N18** | Share contact via Spixi (picker → contact bubble + inline add) | Buildable shape exists, BUT it is a NEW peer-controlled body-marker surface — same hostile-parsing class as reply-to. Design + gate care together with D1 |
| **N42** | Contact-list affordance in Account too? | Dial — cheap either way |
| **N28** | "Do we need skeletons??" | Chat-info: yes (I-9, measured first). App-wide: no — zero-gates + reserved boxes are working; skeletons only where a real measured wait exists |
| **N46** | Delete-flow rework: BRANDED checkboxes + a UX pass (#369, Damir: off-brand) | ★ REMIND Damir near master-list completion — his explicit ask |
| **N47** | Support nickname RESET to address-only? (#369 B3 — today a nick cannot be removed) | Dial |
| ~~**N48**~~ | **BUILT #370** (groups-only, loop A-5; hero chip in blind rooms) | done |

## F. Sequencing proposal (your rule: fix and finalize, BE last)

1. **F5 the #356–#360 batch** (in progress) — commit.
2. **Bug batch:** N13 · N5 · N36 · N38 · N24 (+ N40/N10 triage) — small, high-irritation.
3. **Table A as planned:** D-5 → D-9 → D1 (+N6, +N18 design together).
4. **Rounds in this order:** R1 identity → R2 copy/locale → R4 onboarding → R7 wallet → R3 art → R6 notifications → R8 desktop → R5 calls → R9 apps.
5. **Table B** grows by one: **q11 = N33** (group file relay). q1 (D-14/D-19 sender nulling) remains the urgent one.
6. Security sweep stays LAST, before handover.

*Anything in E answered by you (a dial) moves into its round; anything answered "no" gets a one-line DECISIONS row so it never comes back.*

---

## R5 round — added 2026-08-18 from the #385 Android F5 (Damir)

| Item | What | Where | Size |
|---|---|---|---|
| **N71** 🔴 | **The OS-flip theme path should PUSH, not RELOAD — and it must reach the Account surface.** The #385 fix revived `RequestedThemeChanged`, and the revived path calls `reloadAllPages()`. Damir's F5 shows the cost and the gap in one round: (a) ★ **Account keeps the OLD theme after Light → System** when the OS is dark (repro: landscape, Account, pick Light, pick System) — `SettingsPage` EXCLUDES `this` from the `setTheme` fan-out (`overlay != this`) and the shell's `applyTheme(0)` then resolves "auto" from the STALE `bootTheme`, exactly what `ThemeManager` says shells must never do; **`settings.html` has NO `setTheme` handler at all** (the W1/#336 class — `contact_details` was given one, `settings`, `scan`, `downloads`, `dev`, `contributors`, `app_details`, `app_new`, `contact_new`, `settings_backup`, `settings_encryption`, `call` were not); (b) an OS flip **EJECTS the user from the page they are on** — Contributors drops back to Chats (`reload()` on a modal/overlay); (c) an OS flip always reloads the chats screen; (d) the Account top bar recolors a beat after the rest. One fix answers all four: make the OS-flip path do what the EXPLICIT pick path does — the C#-resolved `setTheme` fan-out, no reload — and give every live shell a `setTheme` handler, starting with `settings.html`, then stop excluding `this` from the pick fan-out. ⚠ FE + C#: shells → `build-shells`, components → bundle FIRST (#383) | C# + FE | M |
| **N72** | **Remove the theme picker from the welcome / onboarding flow** (Damir product call, F5 2026-08-18). The launch and lock shells are FIXED DARK in both themes by design (`src/shells/launch.html` and `lock.html` carry no `*SL{SpixiThemeName}` boot script), so the picker there changes nothing the user can see. Ride the system theme until the user reaches the app proper | FE | S |
| **N73** | **Status-bar / edge-to-edge colour on the pre-login and utility screens** (Damir F5 2026-08-18, 2 screenshots). Wrong strip colour on the welcome screen right after an appearance switch (correct after a restart), on the account-creation screen, and it changes again on the Developer log page. Damir's framing: ride the **full-bleed round** for welcome, restore, onboarding and the in-app wallet — do them together, not one screen at a time | FE + C# (`setEdgeToEdge`) | M |
| **N74** | **N65 is NOT a load failure — it is Windows-only state.** ★ The #385 instrumentation answered it: on Android `Language pick: requested 'pt-br', loaded=True, active now 'pt-br'` (and the same for `sl-si`), and the pick WORKS end to end on Android. So `loadLanguage` is not the fault; the four-way split Damir screenshotted is a WINDOWS state problem. Next: the same log line from Windows, then enumerate the four sources separately — `docs/n65-triage-language-pick.md` §3 | C# + FE | **triage first** |

**★ STATUS UPDATE 2026-08-18, after the #385 F5 (DECISIONS #386 + #387):**
**N65 is NOT 🔴 any more — it did not reproduce on either platform** after an
`obj`/`bin` wipe and a clean rebuild. `loaded=True` on Windows and Android, and
every pick applies to all four surfaces. Treat the row above as WATCH-ONLY; the
instrumentation stays in the build. **N66 is CLOSED on both platforms** — A1–A9
pass, including A4. **N74 is answered and closed with it.** The live item out of
this round is **N71**.

| **N75** | **Collapse the launch flow to ONE hosted page — the flicker Damir reports is FIVE WebView boots of the SAME document** (Damir 2026-08-18). Verified at source: `scripts/build-shells.mjs` emits ONE source, `src/shells/launch.html`, FIVE times — `intro.html` (welcome) · `intro_new.html` (create) · `intro_restore.html` (restore) · `intro_retry.html` (retry) · `onboarding.html` (tail) — and the ONLY difference is an injected `bootView`. Five C# pages (`LaunchPage`, `LaunchCreatePage`, `LaunchRestorePage`, `LaunchRetryPage`, `OnboardPage`) each construct their own WebView and re-parse the same large document, and every step is also a native page push. **The shell already holds every view and can switch in-document with zero flicker.** So this is not a preload problem — it is a "stop navigating" problem. Fix shape, in order of value: (1) host welcome + create + restore + retry in ONE page with ONE WebView and switch views by push, the four verb sets are small and disjoint; (2) leave the TAIL separate — it runs post-account under `HomePage`; (3) if the C# page identity must be kept for any of them, use the EXISTING `PreloadOp` park machinery (#315) instead of inventing a second one. ⚠ Do this WITH N73 (full-bleed) — same files, same F5 | C# + FE | M–L |
| **N76** | **Cut the backup and join-bot steps out of the onboarding tail** (Damir question, 2026-08-18 — product dial, his call). Today: welcome → create → **backup** → **join Spixi bot**, or welcome → restore → **join Spixi bot**. Recommendation on file: **(a) BACKUP — move it out of the create flow and trigger it on the first REAL asset** (first contact added · first message sent · ★ first incoming balance — the balance leg is not optional, a user can receive funds before any messaging event). At creation the user has nothing to lose and has not seen the app; the loss cost grows from zero. The machinery already exists — `backupReminderTimestamp` (#383), the 30-day period (`Config.cs:76`) and the standing Account row. **(b) JOIN BOT — drop the step, fold the CTA into the chat-list EMPTY STATE.** A new user's chat list is empty anyway, which is the worst first impression a messenger can make; the empty state is the natural home for "Join the Spixi community", it costs no screen, it does not auto-add a contact the user never asked for (`ixian:joinbot` is opt-in today and must stay opt-in), and unlike an onboarding step it is STILL THERE tomorrow for the user who skipped it. Net: welcome → create, and welcome → restore. Two screens removed, which is also the cheapest half of N75 | FE + C# | M |
