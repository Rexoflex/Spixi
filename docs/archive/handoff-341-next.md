# Handoff — written 2026-08-13, after #341. READ THIS FIRST.

`docs/handoff-2026-08-18.md` is CONSUMED. Archive it. This file is the live state.

**LANGUAGE RULE: write all output in ASD-STE100 Simplified Technical English.** See `CLAUDE.md`.

## State — verified, not copied

- HEAD is **`0c796e06`**, pushed to `origin/redesign/frontend`. The previous handoff said
  `0ebf5d0b` with uncommitted fixes. That was wrong. Damir committed the #340 fixes as
  `0ab92d5f` and added `.gitattributes` as `0c796e06`.
- On top of HEAD, **UNCOMMITTED on Damir's disk: the #341 batch** (58 files: 19 authored,
  39 generated). Not yet built in Visual Studio. Not yet F5-tested.
- Smoke: **BASELINE OK — 1466 pass / the 4 known pre-existers** (#136 · #149③ · M5 · B3).
  Run in the cloud twin. Damir's local run is the confirmation.
- Roslyn `csc` over both changed C# files: no CS1xxx. They parse.

## ⚠ NEW BLOCKER — Damir cannot run `build-demo-bundle.mjs` locally

His working tree is still **CRLF**. `.gitattributes` with `eol=lf` only sets LF on a FRESH
checkout; the files already on disk kept their CRLF. `build-demo-bundle.mjs:145` strips
imports with `/^import .*$/gm`, which leaves the `\r`, and the script then fails loudly:

```
Error: src/components/typed-bubbles.js:21: MULTI-LINE import — the stripper is single-line
```

`git status` shows nothing, because `.gitattributes` normalizes on commit. Two ways out:

1. **Damir repairs the tree once** (he has a shell that can unlink; the bridge cannot):
   `git add --renormalize .` then `git checkout -- .`. Verify with
   `file src/components/typed-bubbles.js` — it must not say CRLF.
2. **Or build in a cloud twin and ship the artifacts.** That is what #341 did.

Until (1) runs, every batch that touches a component needs the artifact transfer.

### How the transfer works (it worked cleanly, reuse it)

1. Clone the twin: `git clone --depth 1 https://github.com/Rexoflex/Spixi.git`, then
   `git fetch --depth 1 origin redesign/frontend && git checkout FETCH_HEAD`. The remote
   is current, so the twin is exact.
2. `npm install jsdom --no-save` in the twin. Run everything there.
3. Ship authored files as a `git diff` patch: SendUserFile → `device_commit_files` →
   `git apply` on the device. The "unable to unlink" warnings are expected and harmless;
   git still writes in place.
4. Ship generated files as one `tar czf`, extract with `tar xzf --overwrite`.
5. Move the two incoming files into `_to_delete/` afterwards.

## What #341 did

Read `DECISIONS.md` #341 for the full record. In short:

- **(a)** Change password now renders as an in-hub SUBLEVEL inside the Account pane, like
  Backup (#243) and Downloads (#267). New cap `encpassInline`. Mobile is unchanged and
  still uses the pushed `EncryptionPassword` page. W7 is not undone.
- **(f)** The label is "Change Spixi password" in all 8 locales.
- **The audit found a pre-existing data-loss bug on the shipped mobile path.** Changing the
  wallet password never updated the cached `walletpass` preference, so the next cold start
  could not open the wallet, and a backup taken in between could not be restored. Fixed on
  both routes. Escalated to `docs/security-review-for-be-engineer.md` §1b.

### 🟡 Damir must test these

1. Desktop: Account → Change Spixi password renders INSIDE the pane, with the hub beside it.
2. A wrong current password shows the inline error. A correct one morphs and returns to the hub.
3. **★ Change the password, quit the app, start it again. It must open with the NEW password.**
   That is the data-loss test. Before this batch it would have sent you to the retry screen.
4. Mobile still opens the pushed page.
5. Account → Chat appearance → Pattern style still reads translated in Deutsch. (An extract
   run had silently deleted those three translations; the extractor is fixed.)

## Two lessons this session paid for

1. **To change a locale value, change the SOURCE, not the output.** `src/strings/<code>.json`
   is GENERATED. Only `src/strings/en-us.json` and the inline `strings.X || '…'` fallbacks are
   authored, and `build-locales.mjs` REUSES the shipped legacy translation whenever the English
   matches a legacy id in `Spixi/Resources/Raw/lang/`.
2. **A key read as `strings[o.key]` is unextractable and must be in the extractor's `DYNAMIC`
   table.** `PATTERN_STYLES` was not, so the first extract run deleted every translation of the
   three style names from all seven locales. Both i18n gates were blind, because they compare
   locales against each other, and a key dropped from ALL of them still looks consistent.

## THE PUNCH LIST — every `?` answered with code evidence

Do not re-derive these. `docs/launch-punch-list.md` holds Damir's original text; the marks
below CORRECT it.

### Corrections to the punch list

| Item | Punch list said | The code says |
|---|---|---|
| **N1** local nickname | BE? | **ALREADY BUILT.** `ixian:userdefinednick:` exists (`ContactDetails.xaml.cs:303-308`), the shell already sends it (`contact_details.html:281`), and an empty value is the reset. ⚠ `setUserDefinedNick` is called with no `friend.save()` — every other mutation in that file saves. Test persistence on device before you touch it (#215). |
| **A5** group rename | BE, check first | **BE, confirmed.** No message code carries group metadata. `createGroup` sets name and members ONCE at creation (`HomePage.xaml.cs:1309`). Kick and ban exist; rename, set-avatar and add-user do not. |
| **F1** Account as peer | ? | Account IS a parked peer on MOBILE (#315/#320). It is NOT preloaded at boot, and it is NOT parked on DESKTOP — the wide branch omits `parkOnClose` (`HomePage.xaml.cs:1523`), so every desktop open rebuilds. Boot preload was REJECTED for a real reason: the staging slot holds ONE operation (`SpixiContentPage.cs:1198-1206`), so a chat tap during the preload window is silently dropped. **The cheap win is parking the wide branch too.** |
| **F2 / C2** Send flow | ? | **The redesigned Send screen ALREADY EXISTS** — `src/components/wallet-send.js`, 459 lines, mounted at `src/shells/home.html:1874` and gated off behind `bridge.cap('composeSend')`. `home.html` has NO `setCaps` handler, so the cap can never turn on. C2 is ALREADY BUILT: the redesigned Send/Receive are in-shell takeovers inset by the rail (`home.html:205`). Converting the LEGACY page to an overlay is **RISKY-DO-NOT-ATTEMPT** (#338). |
| **D1** reply | ? then FE | **BE.** The word `reply` does not appear once in the C# tree. The wire payload is message text only (`SingleChatPage.xaml.cs:811`), and the push carries 12 arguments with no parent id (`:1692`). `FriendMessage` needs a `replyToId`, and it lives in Ixian-Core. The FE half is complete and gated on `bridge.cap('reply')`, which is always false because the chat shell has no `setCaps` handler. |

### The rest, with verdicts

| Item | Verdict | Cheapest route |
|---|---|---|
| **C7** desktop share does nothing | **FE-ONLY, DEFECT, one file** | `settings.html:975-978` calls `navigator.share` and swallows every rejection with `.catch(() => {})`, then returns — the clipboard fallback sits after that `return`. WebView2 DOES expose `navigator.share` and DOES reject. The correct ladder is already written in `src/shells/home.html:1834-1846`. Copy it. |
| **I1** contact in a group cannot be removed | **FE+C#, DEFECT** | The block is in Ixian-Core (`FriendList.removeFriend` returns false). But the group list IS enumerable here: `FriendList.friends` + `friend.type == FriendType.Group` + `friend.users.hasUser(address)`. On a false return, build the blocking-group list, push it, and offer `ixian:kick:` or `sendLeave` per group. |
| **E3** backup does nothing at create | **FE+C#, DEFECT** | #185's "no verb" note is STALE — `OnboardPage.xaml.cs:41-49` handles `ixian:backup` and calls `BackupPage.backupAccount()`. The failure is a SILENT exception: the whole body is one `try` whose catch only calls `Logging.error` (`BackupPage.xaml.cs:154-157`). Most likely thrower at a fresh account: `Directory.EnumerateDirectories(…"Acc")` at `:123-125`, which throws when the folder does not exist. **Get the device log first**, then guard with `Directory.Exists` and make the catch speak. Also `launch-shell.js:994-998` advances the screen unconditionally, so a failure looks like success. |
| **E1** delete account | **FE+C#** | The behaviour Damir wants is on the WRONG ROW. `ixian:deletea` → `onDeleteAccount` stays on the screen and keeps the wallet (`SettingsPage.xaml.cs:661-680`). `ixian:delete` → `onDeleteWallet` does return to welcome (`:646-649`). Either merge the two danger rows or re-label them. Also: `:633` removes `"waletpass"` — a typo — so the plaintext wallet password survives a wallet delete (security doc §1b③), and `onDeleteAccount` lacks the open-chat sweep that `onDeleteHistory` has. |
| **E2** restore asks for a backup | **FE+C#** | Restore ACTIVELY re-arms it: `LaunchRestorePage.xaml.cs:133` calls `Preferences.Default.Remove("onboardingComplete")`, so `HomePage.xaml.cs:1412-1417` pushes the onboarding tail. A SECOND ask follows from `displayBackupReminder` (`:2184-2192`), because restore never sets `backupReminderTimestamp`. And `joinBot` (`HomePage.xaml.cs:1346-1362`) does NO existing-contact check — the guard pattern is three lines away at `ContactNewPage.xaml.cs:180-192`. |
| **D2** pin a message | **FE-ONLY** | Four per-peer localStorage patterns already exist in `chat.html` (drafts, likes, declined apps, seen mentions). The message id is a stable hex string that survives a re-flush (`SingleChatPage.xaml.cs:1692`, re-pushed by `loadMessages`). One caveat: the "contact accepted" row has the hard-coded id `01` (`StreamProcessor.cs:354`) — exclude it. A pinned banner above `#messages` must be built. |
| **D4** cancel app invite | **FE-ONLY for the sender · BE for "both ends"** | The Cancel button is DEAD today: `typed-bubbles.js:308-312` wires `oneShot(onCancel)`, and the shell never passes `onCancel` (`chat.html:1426-1443`). Mirror the `declinedApps` pattern exactly. "Cancelled on both ends" needs a new carrier — `appRequestReject` routes only to a LIVE `MiniAppPage` and the receiver's stored invite keeps no session id. |
| **D8** share a contact | **Mostly FE-ONLY** | `ixian:sendContactRequest:<address>` is a LIVE verb (`SingleChatPage.xaml.cs:279-333`), already used by the member sheet. A bare address in a body gets no special rendering today, but `looksLikeAddress` + `BASE58_TOKEN_RE` already exist (`home.html:1406`). Only the in-chat PICKER needs a small C# push: the chat WebView has no contact roster (`ixian:loadContacts` there pushes group members only). ⚠ Do NOT emit `ixian:sendrequest:` — that is a MONEY request. |
| **D3** group typing | **FE+C# small · relay UNVERIFIABLE here** | The pill is already built and un-gated for groups. The sender address IS available and thrown away: `StreamProcessor.cs:210` reads `group_sender_address`, and `:385` passes only the friend. Three small edits give attribution. But whether a group relay forwards `msgTyping` at all cannot be proven in this repo. **Two-device test first** (#215). |
| **C1** Delete data truncates | **FE-ONLY (CSS)** | `settings-shell.css:250-260` puts `nowrap`/ellipsis on `.c-settings__row-sub`; it was written for the one-line backup row and the danger rows inherited it. `.c-settings__row-top` and `.c-settings-danger__card-title` are flex rows with no `min-width: 0`. The narrow-window clipping is separate: the hub column is `flex: 0 0 var(--sd-master-w)` and `--sd-master-w` is pushed ONCE (`SettingsPage.xaml.cs:101`), so it keeps a stale pixel width when the window narrows. |
| **C3** highlight the open app | **FE-ONLY** | Copy `applyTxSelection` (`home.html:1963-1974`). `apps-item.js:25` already writes `dataset.appId`. The open signal exists at tap time. The CLOSE signal does not — `HomePage.onOverlayClosed` has no `AppDetailsPage` branch; add one later if the stale highlight annoys. |
| **C4** wallet See-details | **FE-ONLY, component change** | One builder feeds both surfaces: `openTxSheet` (`wallet-shell.js:403`). Three of the four fields are already in `.c-txsheet__meta`; only the address sits outside. ⚠ Hold the open state OUTSIDE the card, like `revealed` does — `render()` re-runs once per second on a pending transaction (#289). ⚠ The mask omits address and fee entirely, so the control must never imply hidden fields exist. |
| **A1/A2** group icon | **FE-ONLY** | `createAvatar` has NO group parameter. Add one and swap `user-circle` for the existing `users` icon in `renderPlaceholder` (`avatar.js:45-62`). Every call site already knows: `chatlist-item.js:137` gets `type`, `mode.isMulti` is in scope in `chat.html:766`. Residual gap: `addContact` has no type arg, so a zero-message group with a custom avatar is invisible. |
| **A3** white initials | **FE-ONLY, needs a per-hue clamp** | Measured: light mode with white ink is **1.83:1 at hue 60**. A single lightness cannot serve all hues. Max `l1` for 3:1 at s=58% runs from 37 (yellow) to 60 (blue). Emit `--av-l1`/`--av-l2` from a 12-band table in `avatar.js` and pin `.c-avatar { color: #fff }`. |
| **A4** gradients too similar | **FE-ONLY** | The hue spread is already full (measured: 11 of 12 buckets). The limiter is the CONSTANT saturation and lightness (`avatar.css:6-13`) plus a 40° stop delta (`avatar.js:54`). Jitter saturation from a second hash channel and widen the delta. |
| **B1** em-dashes | **FE** | 41 in `en-us.json`, 250 across the 8 locale files, plus **52 inline fallbacks** in components and shells. Change BOTH sources, then re-run the string pipeline. |
| **B3** long buttons | **FE-ONLY** | `button.css:31` is `white-space: nowrap` with NO overflow rule and NO `min-width: 0`, so a long label makes the button wider than its container. Worst case: `sendContactRequest` ru-ru, 41 characters, hug width with a leading icon, inside a sheet (`member-sheet.js:167-171`). Add `min-width: 0` and ellipsis, then shorten `backupAdvanced` and `viewAllExplorer`. |
| **B4** apps empty state | **FE** | Key `appsEmptyBody`. English is 123 characters, Slovenian 155. Present in all 8 locales. |
| **H1** line-art pattern | **ALREADY the same drawing** | `Spixi/Resources/Raw/html/img/pattern.svg` (640×640) and `src/assets/images/chat-bg-pattern.svg` share the same first path — the redesign tile is a rescaled crop of the legacy art. For a sparser look, re-point `SRC` in `generate-chat-pattern.mjs:46` and re-run with `--accept-lineart-change`. For subtlety alone, lower `PATTERN_LEVELS` (`settings-screens.js:38-43`). |
| **(d)** avatars | **FE-ONLY, one argument each** | 5 surfaces pass no image source while the data is in scope: `wallet-send.js:165`, `:188`, `:340` (all behind `composeSend`, so invisible today), `wallet-receive.js:420` (**LIVE**), `tip-sheet.js:65` (**LIVE**, and `chat.html:2060-2063` builds the recipient without one). **Damir picked: fix both live ones.** |

## The agreed order (Damir, 2026-08-13)

**Defects first.**

1. **Batch 1 — the three defects.** C7 (one file) · I1 · E3 (device log first).
2. **Batch 2 — the cheap proven wins.** The 2 live avatar surfaces (Damir approved both) ·
   N1 local nickname (verify persistence on device, then add the missing `save()`) ·
   C1 · C3 · C8.
3. **Batch 3 — copy.** B1 · B3 · B4.
4. **Batch 4 — chat.** D2 · D4 · D8 · D5 · D6.
5. **Batch 5 — visual.** A1-A4 · H1 · H2.

Deferred: D1 (BE) · A5 (BE) · D3 (two-device test first) · F2 (do not attempt) · D7 (lowest).

## Still open

- **I2** — "When on desktop adding contact" is still incomplete. Damir did not pick an option.
  **Ask him again before you plan it.**
- **F3 skeletons** — decide with Damir after C1 to C8.
- Everything in the previous handoff's "Known-open (carried)" list still stands.

## Rules — unchanged

Simplified Technical English · zero-C# unless evidence (#215) · ★ #221 chat isolation ·
measure-first (#294) · **bundle BEFORE shells** · smoke stays green · every fix gets a
mutation-honest pin, and you must PROVE the pin fails when you revert the fix · commits =
Damir · `git --no-optional-locks` · the mount FORBIDS unlink · full smoke > 45 s, so run it
in a cloud twin.
