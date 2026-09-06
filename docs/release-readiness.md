# Release readiness — what remains before v1.0

Written 2026-09-06 (end of Session Q). Every claim below was checked against the tree, not
copied from a doc — several of the docs it draws on are stale, and where they are, this file
says so.

**The one-line answer: nothing architectural is left. What remains is verification, one BE
engagement, and a freeze that has never been scheduled.** The build is feature-complete against
every phase of `docs/finalization-roadmap.md` except Phase 4.

---

## §0 · The scope that was locked, scored against the tree

`DECISIONS #295` (2026-07-29) locked v1.0 and **deferred the BE cutover to v1.1**. That row is
newer than `docs/archive/handoff-post-freeze.md`, so where the two disagree, #295 wins.

| #295 said v1.0 is | state today |
|---|---|
| polish + platform fixes | continuous; no defined end — §3 lists what is left |
| Android bring-up | ✅ built, run, walked (Walk N, 15 P · 0 F) |
| real Terms + Privacy | ⚠ **Terms live. PRIVACY IS HELD** — `build-legal-docs` prints 🟡 on every run and bakes `privacy: { text: null }`; the app ships the placeholder summary |
| dev-mode / send-log | ✅ #321 |
| the redesigned SEND flow | ✅ built (#523), legacy pages retired (#640), `composeSend` pushed **unconditionally** at `HomePage.xaml.cs:1965` — ⚠ but see the review gate in §1 |
| the security MAJORs | ❌ not closed — §1 |
| thermal parity (iOS-32) | ❌ **never measured**, and it is Damir's own stated ship gate |

`DECISIONS #532` (2026-08-23) added: the menu batch · W10 · **`maxLogCount` 5→1** · the #232
money review · **the final security handover sweep** · the translator pass.

---

## §1 · Blockers — a public build should not go out with these open

### Ours to fix, and the gate's own rule says so

The handover gate's promise is "the redesign introduced nothing". Three items sit in its
**"ours — fix before handover"** column, still open in the tree:

| item | what | where |
|---|---|---|
| **security MAJOR #3** | the chat link-open confirm modal is spoofable — `HtmlDecode` runs AFTER the modal has shown the pre-decode URL, so the user approves one string and navigates to another. We built the modal; legacy had none | `Spixi/Pages/Chat/SingleChatPage.xaml.cs:746` |
| **security MAJOR #6(a)** | the iOS global link handoff gives **mini-app** content a one-tap, no-confirm Safari launch — no `TargetFrame` / main-frame test, no MiniAppPage classification. Introduced by our own iOS bring-up | `Spixi/Platforms/iOS/iOSWebViewHandler.cs:101` |
| **`spixi.draft.*`** | our key, holding the user's own unsent plaintext, in a `file://` localStorage partition a mini-app may be able to read. The gate says "fix regardless of what the sweep concludes" | `src/shells/chat.html` |

### One-line release blockers, still open

| item | where | note |
|---|---|---|
| **`maxLogCount = 5`** | `Spixi/Meta/Config.cs:94` | carries a literal `RELEASE BLOCKER — REDUCE TO 1 BEFORE LAUNCH` marker. Five logs feed a file DevPage renders and shares |
| **live diagnostic verbs / log sets** | `HomePage.xaml.cs` (`ixian:landtabprobe:`, `[EXCERPTDIAG]`), the `[CDPERF]` set, `[SCROLL]`, `[PAINTDIAG]` | all designed to retire as sets; none has |
| **the Privacy Policy** | `docs/legal/privacy-policy.md` | HELD on a `⟨PLACEHOLDER⟩`, a "DAMIR TO CONFIRM" note and a session annotation. Needs counsel, not a batch |

### Gates that have never run

| gate | who | why it blocks |
|---|---|---|
| **the final security handover sweep** — introduced-vs-inherited over the whole delta from `0e85a4b8` | us | Only the per-batch lens plus ONE partial sweep (#642–#722) have run. The gate doc's own census says it is "not assumed complete". Until it runs, "we introduced nothing" is an assertion, not a finding |
| **the #232/#523 money-path review** | BE engineer | `security-review-for-be-engineer.md` says the W5/W6/PA1 delta "must not ship to users before your review" — and it is enabled in every build today |
| **the BE security walkthrough (A3)** | BE engineer + Damir | ordered FIRST in the post-freeze plan; never held |
| **iOS-32 thermal / battery parity vs legacy Spixi** | Damir | his own words: "a ship gate". Never measured. Unplugged, Release build, side by side |
| **a current iOS walk** | Damir | Sessions I → Q (2026-08-31 → 09-06) have **never been on an iPhone**. The pre-warm, the batch transport, the legacy purge, the density pass and #804 are all unverified there |

### The BE engineer's, inherited — his to fix, but still unsafe until he does

These go to him untouched by the gate's rule. "Inherited" answers *whose*, not *whether it is safe*.

| item | what |
|---|---|
| **MAJOR #8 (Android)** | a mini-app WebView can XHR-read arbitrary app files **including `wallet.ixi`** (`WebViewRenderer.cs:431`, `AllowFileAccessFromFileURLs = true` for every WebView) |
| **MAJOR #9 (Android)** | `OnPermissionRequest` auto-grants mic and camera to every WebView, mini-apps included, with no prompt |
| **#234** | the resume / privacy lock shows **Cancel**, and Cancel unlocks the app with no password — a lock bypass on a self-custodial wallet, confirmed on device |
| **A1 / L8** | the wallet password is stored in **cleartext** `Preferences["walletpass"]`. There is no `SecureStorage` anywhere in the tree |
| **MAJOR #10** | `MiniAppManager.remove` builds a delete path from a downloaded `app.id` — arbitrary directory delete, and the account wipe became a second caller |
| **L6** | restore mutates the lock flags and overwrites `walletpass` **before** verifying the password |
| **S16 residual** | receive-time `Path.Combine(downloadsPath, transfer.fileName)` — a **remote peer's** filename composed into a path |
| **C15 · C16 · CH3 · W11 · Q1-ESC · N57? · CORE-8 · the membership question** | the 13 rows `be-cutover-brief.md` classes as blockers — most notably: a remote delete never persists and the message comes back; a paid request stays "pending" for ever if the requester's chat was closed; and Core may not verify room membership on a reaction, which would make a delivery double-check forgeable |

### Crash-class, open, and nobody has captured the log

| item | what |
|---|---|
| **AND-25** | remove-contact throws a fatal exception — native crash dialog, reproducible. **Needs a logcat at repro** |
| **AND-27** | mic denied → re-asked natively → **no call screen appeared at all**. Needs a clean repro |
| **iOS-67** | the FAB → contacts picker does not respond to taps, then exits to the chats list. iOS only. ⚠ the findings doc says **"Do NOT fix before this test runs. Rule #215"** — one `elementFromPoint` call in Safari Inspector decides it |

---

## §2 · Visible gaps — a user notices, nothing is broken

Mostly features built and gated OFF waiting for a BE verb. The cutover was deferred to v1.1, so
these are a scope decision, not a defect list.

* **Reply-to** — the whole surface is built behind a cap. Un-gating is one line. What is missing
  is an ANSWER: does the protocol carry a reply id? #232 says verify **on device** first (1 h).
* **Pin / mute / favorites**, **contact-request tombstone**, **arbitrary emoji reactions**,
  **tips**, **shared media feed in chat info**, **group rename / re-avatar**, **"you were added
  to a group"**, **mini-app session accept UI**, **return-to-call from the bar** — all built or
  specified, all waiting on a C# or Core row.
* **Privacy toggles (PV1)** — a privacy-first app whose privacy switches are omitted because
  `SettingsPage` has no verbs for them.
* **i18n residual (M13)** — ⚠ the most user-visible item on this page: several surfaces still
  render **English under a chosen locale**. This one is ours and buildable now.
* **Add contact / Add app stutter** — Damir, 2026-09-06. Same mechanism #804 cured for the three
  Account rows; priced in `docs/handoff-2026-09-06b.md`.

---

## §3 · Ours, buildable today, no decision needed

The i18n residual (M13) · iOS-44 attach sheet under the composer · iOS-56b edge-swipe in
subscreens · iOS-55 untranslated tx timestamps · iOS-18 multi-user picker still on the old
design · iOS-43 clipped button label · AND-28 existing contacts show no avatar · AND-30 "Add
contact" offered for someone who already is one · AND-36 rotation leaves a row highlighted ·
AND-37 back over an Account sheet lands on Chats · the four landscape rows (AND-31/32/33/34) ·
AND-35 chat-appearance copy + order · R7 share-sheet home leg · Q1 restore file-set state ·
the wallet sync/block-height surface · and the five stale rows in `be-cutover-brief.md`.

---

## §4 · Waiting on Damir

A decision, a dial, an asset, or one device test. Several of these unblock more than themselves.

| what | why it matters |
|---|---|
| **iOS-67 Inspector call** | one call gates a broken core flow on iOS |
| **AND-25 / AND-27 logcats** | two crash-class defects nobody has characterised |
| **iOS-32 thermal measurement** | a stated ship gate |
| **the Privacy Policy text** | a store-submission blocker |
| **the #232 BE walkthrough** | unblocks the live money path, L8, and MAJOR #4/#6 in one engagement |
| **the translator pass** | ~585 machine-drafted keys per locale across 12 locales, in `src/strings/draft/*.todo.json` |
| **R4 backup-reminder dial** | the reminder is dead AND silently burning its own intervals — on a self-custodial wallet |
| **Q16 delete-account verification** | does `ixian:delete*` actually purge? unverified |
| dials still open | R3 media cap scope · R6 mobile tx depth · AND-24 native dialog styling · AND-39 tap-fill characterisation · M17 create-group · the privacy-shield-on-deactivate posture (asked twice) |

---

## §5 · Phase 4 — the freeze, which has never been scheduled

`docs/finalization-roadmap.md:94-97` defines it and **none of its four items has happened**:

1. a full-app #46 audit loop (the per-batch loops are not this),
2. the final smoke count locked,
3. a DECISIONS freeze row,
4. **a handoff doc for the BE engineer**.

⚠ **And there is no store-submission path anywhere in this repo.** No Play checklist, no App
Store checklist, no release-build runbook. The only submission-adjacent facts on record are that
`aps-environment` must be `production` for TestFlight, and that the iOS provisioning profile
"exists but expired". iOS push is separately blocked on Apple (`docs/ios-nse-spec.md` — three of
its six prerequisites are Apple-side).

---

## §6 · Platform truth

| platform | built | run | walked | note |
|---|---|---|---|---|
| Windows | ✅ ⚠ **F5 only** — `dotnet build` silently serves the previous build's shell (#663) | ✅ | partially | the last verdict is an assertion — "I think Windows works as well" — with walk rows still `?` |
| Android | ✅ | ✅ | ✅ current (Walk N) | the largest open defect set, and both open crashes |
| iOS | ✅ | ✅ | ⚠ **not since ~2026-08-27** | six sessions of work unverified there; push blocked on Apple |
| Mac Catalyst | compiles only | ❌ **never ran** | ❌ | blocked on a Catalyst slice; last touched 2026-07-22 |

---

## §7 · Before the BE engineer reads anything

`be-cutover-brief.md` holds ~119 rows and **at least eleven are stale** — reported landed
elsewhere and never marked here (S5/L4 · S7 · S13 · CO2 · C9's premise · L1 · L2 · L3 · L5 · L7 ·
W9). `docs/legacy-parity-audit.md` has never been updated and its prose count (13) disagrees with
its own tables (14). `docs/ios-sim-findings.md` carries three rows marked OPEN that the same file
later records as device passes. `id C18` appears four times with two different verdicts, and one
row (`N3`, line 156) is **truncated mid-word** and cannot be read.

Fix the brief before he opens it, or he spends a morning on rows that are already in his tree.
