# Release readiness — what remains before v1.0

Written 2026-09-06 (end of Session Q). **Re-synced 2026-09-07**, after the security handover
sweep and its #46 loop closed rows this file reported as open. Every claim below was checked
against the tree, not copied from a doc. Several of the docs it draws on are stale, and where
they are, this file says so.

⚠ **What the re-sync changed:** §0's security-MAJOR row · §1's "ours" table (all three rows) ·
§1's `maxLogCount` note · §1's "gates that have never run" (the sweep HAS run) · §1's blocker
count (13 → 15) · §2's PV1 row · §3's stale-row line · §7 in full. Nothing about the hardware
walks, the BE engagement or the freeze changed. Those claims are unchanged and still true.

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
| real Terms + Privacy | ✅ **both bake** (2026-09-17 check: privacy 17 945 chars / 18 sections as of 2026-09-19 — +3 is the #899 header date; it read 17 942 on 09-17, `build-legal-docs --check` green). ⚠ This row read HELD until 2026-09-17 |
| dev-mode / send-log | ✅ #321 |
| the redesigned SEND flow | ✅ built (#523), legacy pages retired (#640), `composeSend` pushed **unconditionally** at `HomePage.xaml.cs:1965` — ⚠ but see the review gate in §1 |
| the security MAJORs | ⚙ **the three OURS rows moved 2026-09-06** — two closed, one partly closed. The inherited ones are still his. §1 |
| thermal parity (iOS-32) | ❌ **never measured**, and it is Damir's own stated ship gate |

`DECISIONS #532` (2026-08-23) added: the menu batch · W10 · **`maxLogCount` 5→1** · the #232
money review · **the final security handover sweep** · the translator pass.

---

## §1 · Blockers — a public build should not go out with these open

### Ours — the three rows in the gate's "ours" column

The handover gate's promise is "the redesign introduced nothing". Three items sit in its
**"ours — fix before handover"** column. **All three moved on 2026-09-06.** Two are closed. One is
partly closed, and its residual is per-platform. Re-checked at source on 2026-09-07.

| item | what | state, and where |
|---|---|---|
| **security MAJOR #3** | the chat link-open confirm modal is spoofable. We built the modal; legacy had none | ✅ **FIXED.** `SingleChatPage.onNavigating` → the `ixian:openLink:` branch, and the same three guards on the `SettingsPage` twin. The `HtmlDecode` is deleted. A fail-closed `http`/`https` allow-list guards the sink. `Uri.UserInfo` is refused. ⚠ The property is **the destination HOST is the host the user read** — NOT byte-identity. `onNavigating` still `UrlDecode`s on its first line, on purpose. Gate rows F-09 · F-10 |
| **security MAJOR #6(a)** | the iOS global link handoff gives **mini-app** content a one-tap, no-confirm Safari launch. Introduced by our own iOS bring-up | ✅ **FIXED.** `iOSWebViewHandler` → `SecureNavigationDelegate.DecidePolicy`. The handoff needs `isTrustedHost()` AND main-frame to main-frame AND `LinkActivated`. It fails closed. `decide(Cancel)` is unchanged. ⚠ The classification ask SURVIVES as gate row **O-02**: two platforms read the `ClassId="miniapp"` marker, and two read it nowhere |
| **`spixi.draft.*`** | our key, holding the user's own unsent plaintext, in a `file://` localStorage partition a mini-app may be able to read | ⚙ **PARTLY CLOSED.** Android was already contained (`DomStorageEnabled` false for the mini-app WebView). iOS is partitioned now (`WKWebsiteDataStore.NonPersistentDataStore` at construction). **Windows and MacCatalyst are NOT partitioned, and the premise is untested there.** Gate rows F-23 · O-03 · O-05 |

⚠ **The gate's census now records 65 introduced findings: 38 fixed, 27 open.** None of the 27 is a
live leak that this project can close alone. They wait on a ruling, a device, or a named piece of
work, and every row says which. Read `docs/security-handover-gate.md` §"★★ THE FULL SWEEP" before
planning any security work.

### One-line release blockers, still open

| item | where | note |
|---|---|---|
| **`maxLogCount = 5`** | `Spixi/Meta/Config.cs` (`maxLogCount`) | carries a literal `RELEASE BLOCKER — REDUCE TO 1 BEFORE LAUNCH` marker on the first line of its docblock. Five logs feed a file DevPage renders and shares. ⚠ **The flip now edits this file alone.** Gate 23 asserts the legal PAIR — 5 with the marker, or 1 without it — and the old `>= 5` pin, which the flip would have had to edit, is deleted. Gate row **O-18** |
| **live diagnostic verbs / log sets** | `HomePage.xaml.cs` (`ixian:landtabprobe:`, `[EXCERPTDIAG]`), the `[CDPERF]` set, `[SCROLL]`, `[PAINTDIAG]` | all designed to retire as sets; none has |
| ~~**the Privacy Policy**~~ | `docs/legal/privacy-policy.md` | ✅ **CLOSED — and it was already closed when this row was written.** Session S (`9e099ee7`, 08 September 2026) removed ALL THREE markers this row names: the ⟨PLACEHOLDER⟩ for the undelivered-message retention period in §4.3, the second one in the §11 table, and the Session G/#708 annotation. Damir confirmed the period with whoever operates `ipn.ixian.io` — **30 days**, stated twice and consistently. ⚠ This page's own §0 already said the privacy doc BAKES; §1 said HELD. The two contradicted each other for eleven days (the #660 class). ⚠ Session AA also corrected the header date, which still read 29 August while the retention clause was written on 08 September — the date a user or a reviewer relies on. ⚠ **A lawyer has still not read it**; that is a separate judgement from "nothing is held", and it is not one this repo can record for itself |

### Gates that have never run

| gate | who | why it blocks |
|---|---|---|
| ~~**the final security handover sweep**~~ | us | ✅ **RAN 2026-09-06.** Eight disjoint auditors, two verifiers, seven fixers in two batches, a #46 adversarial loop with three more auditors and three more fixers, three pin passes. Result: 65 introduced findings, 38 fixed, 27 open, plus 11 MITIGATED-BY-US and 9 new INHERITED rows. The census is `docs/security-handover-gate.md` §"★★ THE FULL SWEEP". "We introduced nothing" is now a count, not an assertion |
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
| ~~**#234**~~ | ✅ **CLOSED #458 (2026-08-20)** — the app-owned locks present in a `'locked'` mode with no exit; Cancel survives only on the confirm screen that turns the lock OFF, where it is harmless (#499). This row and the BE doc's §1a read OPEN until 2026-09-17 |
| **A1 / L8** | the wallet password is stored in **cleartext** `Preferences["walletpass"]`. There is no `SecureStorage` anywhere in the tree |
| **MAJOR #10** | `MiniAppManager.remove` builds a delete path from a downloaded `app.id` — arbitrary directory delete, and the account wipe became a second caller |
| **L6** | restore mutates the lock flags and overwrites `walletpass` **before** verifying the password |
| **S16 residual** | receive-time `Path.Combine(downloadsPath, transfer.fileName)` — a **remote peer's** filename composed into a path |
| **C16 · W11 · Q1-ESC · N57? · CORE-1 · CORE-4 · CORE-8 · the membership question** | part of the **15** rows `be-cutover-brief.md` classes as blockers. ⚠ **That set is now ENUMERATED**, in that file's § Blockers, and every row was re-checked against the tree. The count 13 came from this page and was never derived. `C15` is off the list — it is fixed. `CH3` is demoted. Most notable of what remains: a remote delete never persists and the message comes back · a paid request stays "pending" for ever if the requester's chat was closed · Core may not verify room membership on a reaction, which would make a delivery double-check forgeable. ⚠ **Session AD (2026-09-23, #928) moved two of these:** **W11** is LANDED (the response is stored before the chat-page gate; the row lookup is the payer side's own rule — loop r1 MAJOR fixed) and **C16**'s premise was REFUTED at Core `097341a` (the remote delete DOES persist; the app-side gap was the local delete's list row, fixed). **L6 is still open and still OURS** — named for its own mini-session, not built (walked past by order, #927). |

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
* **Privacy toggles (PV1)** — a privacy-first app whose privacy switches are mostly omitted,
  because `SettingsPage` has no verbs for them. ⚙ The Privacy screen itself is now REACHABLE, and
  it carries one real switch: media auto-load. That screen was built and called by no shell until
  2026-09-06 (gate rows F-02 · F-03). The rest of PV1 still needs verbs.
* ~~**i18n residual (M13)**~~ — ✅ **CLOSED (#812 · #821).** The row was stale by two months: the
  CODE half was closed by #269 on 2026-07-12, the day AFTER the F5 that recorded it, and a
  `?lang=pseudo` sweep over all 18 built shells found no visible English left. Session T closed
  the last of it — six keys were the English string in **all twelve** locales because they were
  added after the last drafting round and were in no draft file, so `build-locales` silently fell
  back to English. Filled, and **GATE 51** now fails the build when it happens again. What
  remains is the **translator pass** (§4), which is Damir's, not code.
* ~~**Add contact / Add app stutter**~~ — ✅ **BUILT (#827).** Damir reported it twice. Both
  screens pushed a C# page with its own WebView (the 130–230 ms cold boot #803 measured); they
  now mount inside the home shell, the way #804 did for the Account rows. GATE 54 proves it
  against the built bundle. 🟡 The C# is uncompiled until his next build.

---

## §3 · Ours, buildable today, no decision needed

iOS-56b edge-swipe in subscreens · iOS-18 multi-user picker still on the old design ·
AND-28 existing contacts show no avatar (verify-first, needs the phone) · AND-36 rotation leaves a
row highlighted (mechanism narrowed in #826 — the highlight only clears when a conversation CLOSES,
and a rotation re-homes rather than closes; one repro decides it, and #897 may have moved it) ·
the four landscape rows (AND-31/32/33/34 — one render-first round) · Q1 restore file-set state ·
the wallet sync/block-height surface.

⚠ **FIVE MORE rows left this list on 2026-09-19 because they were already built (#905, the #660
class — 7 of the 17 rows this list has carried were already built when someone checked):** **iOS-43** (Session J removed the
ellipsis; the action row wraps, `typed-bubbles.css:108-123`) · **iOS-44** (the attach tray under a
pinned composer, #705/#749/#761) · **iOS-55** (#325/#328, W1 landed — raw epoch + `formatTxTimestamp`)
· **AND-35** (Session U #845; its own findings row already said so) · **R7** (both legs: `home.html`
`shareAddress` → `ixian:share`, and `SettingsPage:318` handles the same verb). The three iOS rows
need an **iPhone re-verify, not a build** — there has been no iOS walk since ~2026-08-27.

⚠ **Two rows left this list on 2026-09-08 because they were already built** (#826, the #660
class): **AND-30** — the member sheet has been relation-aware since #366/#370/#613 and C# sends
the relation at `SingleChatPage:1107` and `:2971`; and **AND-37** — fixed by N51 the day after it
was written, `settings.html onBack()` consumes back into `dismissTopOverlay()` first. Both need a
device re-verify, not a build. **M13** is closed (§2). ⚠ The "five stale rows in `be-cutover-brief.md`" are done:
that file was verified row by row on 2026-09-06 and 26 rows changed state (§7).

---

## §4 · Waiting on Damir

A decision, a dial, an asset, or one device test. Several of these unblock more than themselves.

| what | why it matters |
|---|---|
| **iOS-67 Inspector call** | one call gates a broken core flow on iOS |
| **AND-25 / AND-27 logcats** | two crash-class defects nobody has characterised |
| **iOS-32 thermal measurement** | a stated ship gate |
| ~~**the Privacy Policy text**~~ | ✅ **no longer blocked on Damir** — the retention period he owed landed in Session S and the document carries no marker. What remains for a store track is a counsel read, not an answer from him |
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

⚠ **RE-SYNCED 2026-09-07.** The 2026-09-06 state verification walked the brief and this paragraph
is what it found.

`be-cutover-brief.md` holds **116** rows, not "~119". Every one was verified against the tree, and
**26 changed state**. The §7 hint had named eleven stale rows: **ten of the eleven were stale**,
and sixteen more were found that the hint did not name. The one that was NOT stale is `L2` —
passwords still ride navigation URLs, and the PARSES are deliberately unchanged, because live
wallets were encrypted under today's behaviour. The blocker set is now enumerated in that file's
§ Blockers, as **15** rows. The `N3` truncation is written out in full. The four `C18` entries are
merged into two.

**Still stale elsewhere, and not re-synced by that pass:**

* ~~`docs/legacy-parity-audit.md`~~ ✅ **already corrected** — checked 2026-09-19: the prose reads 14 and carries its own note ("earlier copies of this paragraph said 13, which never matched its own tables — corrected 2026-09-06"). This bullet was itself stale, in the paragraph warning about stale rows.
* `docs/ios-sim-findings.md` — ⚙ **two of them closed 2026-09-19**: iOS-42 and iOS-45 both said the real legal documents were "not in this repo" and the app showed placeholder copy. Both have been false since #733 baked the full documents into `LEGAL_DOCS`; `TERMS_DEFAULT`/`PRIVACY_DEFAULT` no longer exist. Any remaining OPEN-but-passed rows still want a sweep before he opens the file.

Fix those two before he opens them, or he spends a morning on rows that are already in his tree.

## Addendum 2026-09-23 (DECISIONS #931–#933) — three rows on this page moved

* **S1 is CLOSED** (Damir: keep the chat spare); **#864** (contact details in the home shell) is an ordinary
  later-update item, no longer gated on a timing.
* **The strip (§5's freeze → sweep → strip)** is SHAPED (#933): ONE branch, one cleanup — code comments in
  three tiers (session prose removed · a present-tense "why" kept where it guards something non-obvious ·
  nothing else), a scripted first pass then a reading pass per site then the #46 loop; everything that is
  history (handoffs, walk sheets, checklists, verdicts, sheets, CLAUDE.md's status log) moves to a private
  `spixi-workshop` repo; `DECISIONS.md` rewritten by area to the CURRENT design (~80 entries). A tag
  `pre-strip` marks the last full commit. L6 sits at the start of that run, before the freeze.
* **The Apple portal steps are DONE (#932)** — the office iPhone day is the next physical step.
