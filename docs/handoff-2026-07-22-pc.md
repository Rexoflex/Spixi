# HANDOFF 2026-07-22 → desktop PC (Android bring-up + Windows F5 batch) · Mac continues iOS later

**Phase:** B — platform bring-up. **The RocksDB gate is CLEARED** — the dev's
`RocksDB.0.0.42.nupkg` is committed to the repo-local feed (`local-nuget/` +
`.gitignore` exception); restore is warning-free on every TFM. Standing rules
unchanged (`docs/handoff-post-freeze.md` §1B): platform bugs only, fix small, log in
DECISIONS.md.

## What happened on the Mac (2026-07-22, session 2 — full detail in `docs/mac-bringup-log.md`)

- nupkg → `local-nuget/`, sha512-verified vs the dev's copy; android/ios NU1603 GONE.
- Node 26.5.0 installed (owed item closed) → full generator pipeline + smoke on the Mac.
- **#279**: first full Mac smoke run caught a stale pre-#276 assertion + the sort/display
  canon split (`sortedContacts` now keys on `hasNick`). Fix pair committed.
- **`rebuild generated artifacts (#273–#279)` committed** — the owed home-PC rebuild step
  is CLOSED. Repo is pull-and-run clean again.
- **★ First-ever iOS run** (iPhone 17 Pro sim, iOS 26.5, WKWebView): boot, account
  create, wallet, chats, messaging, dark-mode content all work. csproj now RID-aware for
  the RocksDB xcframework slice (simulator vs device); default Debug iOS RID pinned
  `iossimulator-arm64`.
- **Crash triage** (`docs/ios-sim-findings.md` + `_crash/*.ips` analysis): the three
  "random" crashes (attach moment / contact request / incoming call) were ONE bug —
  OneSignal's swizzling invokes `onesignal`-prefixed delegate selectors the .NET
  registrar never registered → fatal marshalling NSException. **#280** (guards in
  `WillPresentNotification` + `DecidePolicy`) + **#281** (export the prefixed
  selectors) — **sim-verified fixed** (incoming call rings, app lives).

## Desktop PC — do in this order

1. **Pull.** Everything is committed; tree should be clean. (If the Mac push didn't
   happen, ping Damir — the Mac was N commits ahead at session close.)
2. **Windows sanity F5** (`net10.0-windows10.0.19041.0`, F5 not Rebuild): confirm the
   restore stays warning-free and nothing regressed on WebView2.
3. **F5 visual checks #273–#278** (carried from the consumed 07-20 handoff — artifacts
   are now rebuilt, so #274's "stale artifacts" suspicion is testable):

   | # | Check |
   |---|---|
   | #273 | Requests chip counts ONLY real pendings; "Contact Accepted" rows keep the user-plus glyph but leave the filter; "Request sent" rows stay |
   | #274 | Account → Language: full list, scrolls · pick Deutsch → pane returns ON the picker, check moved, UI translated. If broken: F12 → `document.documentElement.outerHTML.includes('VIEW_RESUME_KEY')` → report true/false + symptom |
   | #275 | "Request sent" row → composer HIDDEN, "Waiting for {name}…" + Cancel; accept from peer → unlocks live |
   | #276 | Contacts/picker: nameless/echo rows title as truncated address · wallet rows + tx-detail truncated · full address only on copyable rows |
   | #277 | Wallet row titles = chat-row size/weight; amounts stay emphasized |
   | #278 | Narrow pane → "Missing a transaction?" pill collapses to ⓘ (tooltip); wide → full label, never clipped |

   Plus **#279**: contacts picker — named A–Z first, address-only (and echo) rows after,
   titled as truncated addresses.
4. **iOS-8 cross-check** (`docs/ios-sim-findings.md`): accept a contact request, open the
   chat, leave — does the unread badge stick on Windows too? (Suspected cross-platform
   `request-done` unread bug, NOT iOS-specific.)
5. **Android bring-up** — the archived `docs/archive/handoff-2026-07-20-pc-next.md`
   steps 3–6 are still valid and now unblocked (restore resolves RocksDB 0.0.42).
   Emulator + `chrome://inspect`; walk the Stage-4 checklist from
   `docs/mac-bringup-checklist.md`.
6. Log findings per convention (DECISIONS.md rows; platform punch lists in docs/).

## Mac — when back (testing continues)

- **Edge-to-edge fix first** (iOS-1/3/4, one change: viewport-fit=cover + safe-area
  insets + themed native background) — most visible win, Android wants it too.
- iOS-2 (backup illustration swap) · iOS-6 (keyboard shoves topbar — WKWebView
  keyboard-viewport strategy) · iOS-10 root cause (tap a Terms/external link with
  `simctl launch --console` capturing; the #280 guard now LOGS the real exception).
- Deutsch locale + date check · lock flow (Cmd+Shift+H background) · Safari pass over
  `src/demo/*.html` · Stage-5 two-device passes (second sim device works: `simctl create`).
- Device (real iPhone) path is documented in the session chat: personal-team signing
  bootstrap via a dummy Xcode project on bundle id `com.ixilabs.spixi`, then
  `dotnet build -f net10.0-ios -p:RuntimeIdentifier=ios-arm64 -p:CodesignKey="Apple Development" -t:Run`.

## Owed / gated (unchanged)

- **Opus #46 audit loop over #273–#281** (3 disjoint read-only auditors → fixes → fresh
  re-review). Highest-risk rows: #275 (state-relative C# condition) · #274 (localStorage
  handshake) · **#281 (runtime selector registration — new, native-seam class)**.
- Gated: wallet-send LAST (#232) · reply-to (BE carrier first) · #234 (BE sign-off).
- BE cutover backlog per `docs/be-cutover-brief.md` (triage grouping in the 07-20 handoff,
  now archived with it).

## Gotchas carried forward

- Mac AI-session git dance: `device_bash` cannot delete files — every git write op
  leaves `.git/*.lock` / `tmp_obj_*` cruft that gets `mv`-ed into `_to_delete/`.
  **Damir: Trash `_to_delete/`, `_to_delete_index.lock*`, and `ios-build.log` at the
  repo root whenever** (all gitignored/untracked; `_crash/` is gitignored now too but
  KEEP it — it holds the analyzed .ips reports + guarded-run logs).
- Stray untracked file noticed at session close: `src/assets/icons/Intelligence3.png`
  — not from this session; decide keep/delete on the PC.
- Mac disk fills fast: simulator RUNTIMES were the 51.5GB culprit (nine images; now one,
  iOS 26.5). `xcrun simctl runtime list` before panicking.
- `-t:Run` for iOS needs the app built first (mlaunch quirk); plain build then Run, or
  `simctl install/launch`.
