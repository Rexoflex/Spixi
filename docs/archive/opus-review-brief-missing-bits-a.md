# Opus review brief — MISSING-BITS BATCH A (#256/#257): full #46 audit+fix loop

> **Work order for the Opus session.** fable built Batch A of `docs/fable-build-brief-missing-bits.md`
> (§5c split: fable builds, Opus audits — fable did NOT self-certify). Damir has F5-tested
> (or is testing) the batch. Run the **full #46 loop**: 3 disjoint READ-ONLY auditors →
> fix agents with disjoint file scopes + explicit cross-file contracts → a FRESH
> break-my-verdict re-reviewer, loop fix↔review until CLEAN. Append the verdict to THIS file.
>
> ⚠ **#175: the sandbox mount serves STALE/TRUNCATED files to bash/node** (this session it
> truncated every edited file to its pre-edit byte length — content fresh, tail cut).
> **Read/Grep file tools are the only source of truth.** Auditors must not "confirm" anything
> from a bash `cat`/`node` read of an edited file.

## 1. What Batch A is (DECISIONS #256 interview + #257 build — read both rows first)

Three zero-C# regression fixes, frozen bridge, no new verbs:

- **A1/A2 — live call UI** (the app had NONE: pushes died on undefined globals).
  NEW `src/components/call-ui.js` (`attachCallUi` glue: ring overlay + callbar +
  clear-grace + arg-count collision guard) wired into **12 shells**; component edits
  `call-overlay.js` (`ignore:false` opt) + `callbar.js` (dialing `startedAt:null`).
- **A3 — unread divider**: `addThem` extended from its 6-param truncation to the real
  11-arg shape; one-shot in-place boundary derived ONLY from the load burst; bubble
  grouping breaks at it (`positionsFor` bid arg); per-peer reset.
- **A4 — languages**: production was HARD-WIRED en-us. Boot line in **15 shells** now
  `?lang= || '*SL{language-code}'` (C#-substituted per load; un-substituted marker falls
  back to en-us inside `SpixiStrings.get()`). `extract-strings.mjs` + `i18n-lint.mjs`
  now sweep `src/shells` (receivers `s./sl./strings./window.SL.` incl. the guarded-paren
  form). home.html's `const strings = {}` leak fixed. 5 fallback conflicts fixed at
  source. 5 dictionary-less locales hidden from BOTH pickers (settings LANGS +
  launch-shell LAUNCH_LANGS — which also carried a bogus `zh-cn`). ~42 new keys
  machine-drafted ×7 locales into `src/strings/draft/*.json`.

## 2. Changed files (= audit scope inventory)

| Area | Files |
|---|---|
| NEW component | `src/components/call-ui.js` |
| Component edits | `src/components/call-overlay.js` · `callbar.js` · `launch-shell.js` (LAUNCH_LANGS only) · `apps-discover.js` (F5-round fix, §5.7) |
| Scripts | `scripts/build-demo-bundle.mjs` (FILES entry) · `extract-strings.mjs` (shell sweep) · `i18n-lint.mjs` (shell sweep) |
| Shells — call wiring + lang line | home, chat, settings, contact_details, contact_new, app_new, app_details, downloads, contributors, dev, settings_backup, settings_encryption |
| Shells — lang line only | launch, lock, scan (call UI deliberately EXCLUDED — §4 dials) |
| chat.html extras | A3 divider (addThem/positionsFor/renderLogNow/onChatScreenReady) · 4-arg addAppRequest guard · `s.call`→`callAction` · loading fallback align · call CSS links |
| home.html extras | `strings = window.SL \|\| {}` · `addApp`→`addMiniApp` key · explicit 4-arg addAppRequest ignore stub · call CSS links |
| settings.html extras | LANGS trim + hide-note · copyFailed fallback align · call CSS links |
| contact_details extras | received/sent fallback casing align · resolveCaller from page state |
| Strings | `src/strings/draft/{de-de,es-co,fr-fr,pt-br,ru-ru,sl-si,sr-sp}.json` (+42 keys each, appended after `yourAddress`) |
| Docs | `polish-roadmap.md` (M2/M3/M13/M15 + order) · `i18n-wiring-spec.md` (§mapping) · `be-cutover-brief.md` (C18 · [i18n-C#] · [SPLASH-ART] · N2) · DECISIONS #256/#257 · CLAUDE.md |

## 3. Suggested auditor scopes (3 disjoint, read-only)

- **Auditor A — calls + C# contract.** `call-ui.js` + call-overlay/callbar edits + all 12
  shell wirings vs the REAL C# (`SpixiContentPage.cs:1325-1469`, `HomePage.OnUpdateUI:1820-1866`,
  `VoIPManager.cs` stack-last sites, `StreamProcessor.cs:691+`). Re-verify (#215) fable's
  claims: single-consumer flag delivery · clear-lifecycle (no dedicated clear push;
  `clearAppRequests` precedes every pass) · arg shapes (3-arg ring / 4-arg mini-app /
  3-arg callbar, unix-secs, "0"=dialing) · verbs on `onNavigatingGlobal` reach C# from any
  page · Accept routes through C# (SECURITY.md — WebView emits intent only).
- **Auditor B — chat.html.** A3 divider end-to-end (burst gating, exactly-once C# ordering
  claim :1603 vs :1661, re-flush/re-render survival, per-peer reset, grouping break,
  deleteMessage/boundary-row edge), the 4-arg guard, the callUi spread + resolveCaller
  closure (declaration order, per-peer state), conflicts fixes.
- **Auditor C — A4 languages.** Carrier line ×15 (#248 same-line-closed; `?lang=pseudo`
  path intact; `get()` fallback), extractor + lint sweep code (regex correctness, false
  positives/negatives, `--check` gate), draft JSON validity + translation sanity, picker
  hides (settings + launch; a saved hidden-locale edge), doc corrections accuracy.

## 4. Accepted dials — do NOT re-litigate (Damir, #256)

Accept/Decline only + Esc/scrim dismiss disabled with `ignore:false` · the 400ms clear-grace ·
divider = text rows only (file/payment unread tails put it at the first unread text) ·
5 locales hidden until translated · un-substituted carrier → en-us (file:// preview) ·
call UI excluded from lock (privacy), scan (camera takeover), launch (pre-account),
empty_detail (home always visible beside it) · home-only mid-session delivery until BE C18.

## 5. Known edges fable flags for THIS loop (decide/mitigate, don't ignore)

1. **Stale secondary ring overlay / callbar.** Chat consumes the app-request state at its
   own onLoad (xaml:719-22). If a ring is active when a chat opens, BOTH home and chat
   render the overlay; answering on one sends the verb, but the resulting
   `clearAppRequests` pass is consumed by the FLAG CONSUMER (home) — the other surface's
   ring card has no removal signal until its next own consume. Decline on the stale card
   would `appReject` a now-accepted session (`VoIPManager.rejectCall` — check what that
   does to a live call). Weigh: FE auto-expire (~45-60s ring timeout mirroring VoIP's
   own), an accept/decline guard, or accept-and-document until C18.
   **F5-REPRODUCED + PARTIALLY FIXED (Damir, callbar half):** hang-up tapped on the
   chat-shown callbar ended the call, but C#'s `hideCallBar` went to stack-last (home) —
   the chat's bar ticked forever. fable landed an OPTIMISTIC LOCAL HIDE in
   `call-ui.js onHangUp` (send the verb, hide this host's bar; a failed hang-up is
   healed by the next displayCallBar push re-creating the singleton). REVIEW that fix;
   the REMOTE-hang-up staleness on non-home surfaces remains open here — rule on it.
2. **Callbar overlap**: `c-callbar` is `position:absolute top:0` at z-60 — it covers the
   topbar in home/chat. Verify that's visually acceptable (design intent per callbar.css
   docblock) and doesn't trap the topbar's a11y tree.
3. **i18n-lint shell sweep is UNTESTED in-session** (mount) — the first local run may
   surface pre-existing shell leaks as exit-1 findings. Those are REAL findings to list,
   not batch-A regressions; triage rather than revert.
4. **a11y**: `role=alertdialog` with esc/light-dismiss disabled — confirm focus trap +
   SR behavior stay sane (#205 canon; the overlay rides overlay.js machinery).
5. **`positionsFor` grouping-break** applies whenever `unreadBoundaryId` is non-null —
   verify no visual regression when the boundary row is mid-run of the SAME sender.
6. **Bundle/shell version-skew kills whole shells (LIVE repro, Damir F5 2026-07-11).**
   `build-shells` ran against a stale `spixi.iife.js` (no `attachCallUi`) → home.html's
   `const callUi = attachCallUi({...})` threw `undefined is not a function` → the ENTIRE
   left pane went blank (the initial view reveal sits after the throw), while
   empty_detail (bundle-free) rendered — a one-missing-export skew presented as a dead
   app. Fixed operationally (rebuild order: bundle BEFORE shells; smoke catches it).
   RULE ON: should the call-ui spread (and same-class future spreads) be guarded
   (`typeof attachCallUi === 'function' ? ...attachCallUi({...}) : {}` + console.error)
   so a skew degrades to "no call UI" instead of a dead page — or does fail-loud win
   (skew must never ship, smoke is the gate) with maybe a build-shells preflight that
   ASSERTS every shell-destructured name exists in the bundle it inlines? Pick one,
   land it (the preflight variant is a build-shells.mjs change, not a shell change).
7. **The #255 integrity gate had ONE false positive — FIXED during the F5 round, review
   the fix.** `apps-discover.js` legitimately carried two LITERAL 0x00 bytes as an
   unlikely join-separator (`shown.join('<NUL>')`), so `build-demo-bundle.mjs` failed
   every local rebuild with "bundle contains a NUL byte at offset 290323" — which is
   ALSO why Damir's F5 ran on a stale bundle (edge 6). fable replaced the literals with
   `const LIST_SEP = String.fromCharCode(0)` (same runtime string, byte-clean source;
   a backslash-u escape was deliberately avoided — it round-tripped back into a literal
   NUL through tool-parameter decoding, twice). Verify: no behavior change in
   `setDiscoverFeed`, no remaining NUL in any `src/**` file, and consider whether the
   gate's error hint should stop claiming "no component source contains it".

## 6. Non-negotiables (★)

- **#221 chat isolation**: call-ui adds NO cross-WebView channel (each shell renders its
  own overlay from its own pushes; coordination stays C#). Verify nothing leaks.
- **Frozen bridge**: zero new verbs — only `ixian:appAccept/appReject/hangUp/chat` emitted.
- **Money path untouched.** Wallet-send stays LAST.
- **#248**: every `*SL{…}` in any inlined source is same-line-closed (fable grepped clean —
  re-verify).
- **#215**: re-verify REACHABILITY of every C# claim, not just existence.
- Mechanical fixes land directly; architectural findings become 🟡 DECISIONS rows.
- Between fix and review passes: rebuild generators + smoke IF the environment serves real
  files; otherwise static verification via file tools + note it for Damir's local run.

## 7. After CLEAN

Damir commits Batch A as ONE batch (source + regenerated artifacts; check `git status`
for CRLF-only churn and `.fuse_hidden*` debris per #255 hygiene). Then the next fable
session runs Batch B per `docs/fable-build-brief-missing-bits-batch-b.md`.

---

## VERDICT (appended by the Opus loop, 2026-07-11 → DECISIONS #258)

**CLEAN after 2 fix rounds.** Loop as scoped: 3 disjoint read-only auditors → 4 fix agents (disjoint file
scopes) → a FRESH break-my-verdict reviewer (found 1 MAJOR the fixers missed) → corrections → a round-2
re-review (found 1 doc contradiction) → corrections → **CLEAN**. Every C# claim was re-verified for
REACHABILITY per #215; all reads via file tools (#175 — the mount truncated `chat.html`/`home.html`/
`spixi.iife.js` for bash/node all session).

### Batch A verdict: the three features are sound; the call surface has a C#-side sharp edge

| Claim (fable) | Verdict |
|---|---|
| Ring 3-arg / mini-app 4-arg / callbar 3-arg, unix-secs, `"0"` = dialing | ✅ CONFIRMED at `SpixiContentPage.cs:1387/1368/1333` + legacy `spixi.js:304` |
| No per-card clear; `clearAppRequests` precedes every pass (⇒ the 400 ms grace) | ✅ CONFIRMED (`:1355`; no C# site pushes `removeAppRequest`) |
| Delivery is SINGLE-CONSUMER (one-shot flag; stack-last ticks first) | ✅ CONFIRMED — **and worse than stated**: all 7 VoIP direct pushes target `NavigationStack.Last()`, and #225 overlays are OFF the nav stack → they can never reach the visible overlay |
| Verbs reachable from any page via `onNavigatingGlobal`; Accept routes through C# | ✅ CONFIRMED char-for-char (`:1449/:1454/:1459`); WebView emits intent only |
| A3: 11-arg push carries `read` and PRECEDES the flip (:1603 → :1661-65) | ✅ CONFIRMED; single push site; `sendUiCommand` preserves arg count → the widened `addThem` cannot break |
| A4: `language-code` in all 13 lang files · `loadLanguage` doesn't strip it · `localizeHtml` runs on every shell load · un-substituted marker → en-us | ✅ ALL CONFIRMED (`SpixiLocalization.cs:77-100/174-180`, `generatePage:1236-1258`) |
| ★ #221 chat wall · frozen bridge · money untouched · #248 markers | ✅ ALL HOLD (zero storage/postMessage/BroadcastChannel in `call-ui.js`; only `appAccept`/`appReject`/`hangUp`/`chat`/`language` emitted; `git diff -- '*.cs'` = zero real change) |

### MAJORs (3) — 1 fixed FE-side, 2 are C# and CANNOT be fixed in the WebView

1. **A stale ring on a second surface can KILL a live call.** Home rings; opening a chat makes that WebView
   ring too (present-time hand-off, `SpixiContentPage.cs:1084-90`); answering on one pushes `displayCallBar`
   to stack-last only and sends **no `clearAppRequests`** → the other card stays live, and its Decline fires
   `ixian:appReject` → **`VoIPManager.rejectCall:298-306` has NO accepted-guard** → it tears down the live
   call. **FE half LANDED:** `displayCallBar` now unconditionally drops the local ring + latches the answered
   session (closes the same-surface re-list and any page presented DURING a call). **Residual is C# → C18(a)
   broadcast + C18b(a) rejectCall guard.**
2. **A stale callbar's Hang-up fires on a dead session** (`hangupCall:319-336` has no `hasSession` guard →
   `sendAppEndSession(null, sid)`; IXICore, unverifiable from this tree → **on-device check, #215**). → **C18b(b).**
3. **An outgoing call started from a chat shows NO call UI at all** (`initiateCall:66` bars stack-last = home).
   No safe FE fix (the session GUID is C#-generated). → **C19.** The shipped-state note must read "no call UI
   in a chat, in EITHER direction", not "the ring".

### Landed fixes (all zero-C#, frozen bridge)

**`call-ui.js` / `callbar.js`** — ring dropped + session latched on `displayCallBar` (MAJOR-1 FE half) · a
**no-op `addAppRequest`** in the handler map (C# pushes it as a bare global into all 12 shells; an undefined
global throws a ReferenceError while C# evaluates the *argument*, before `native.js`'s try/catch can soften
it → 10 shells were one mini-app session away from a console-error storm) · `markAnswered`/`doneSession` latch
(the async `location.href` window let a refresh pass resurrect the answered ring) · same-session re-push now
re-resolves the caller in place (a ring that beats the roster was stuck on the truncated address) ·
`hideCallBar` clears the hang-up target · **`.c-callbar__main` is a focusable button only when the return
target actually exists** — gated on the RUNTIME address, not on the host merely passing `onReturn`, because
home passes it unconditionally while C# sends no address (⇒ home, the one surface that shows the bar, shipped
a dead SR-announced button; it lights up for free at C18(b)).

**`chat.html` (A3)** — derivation now gated on **`loadPhase && bursting`**: `loadPhase` (own flag, 5 s safety,
reset per peer AND per bot channel) because the boundary must not ride a 250 ms render-perf timer; `bursting`
because the channel-switch and `OnAppearing` paths never push `onChatScreenLoaded`, so `loadPhase` alone would
stay true for 5 s and latch a **live** message as "unread" in an open chat. Gaps >250 ms in the streamed
history fail safe to *no* divider — deliberate, same direction as the `read === undefined` guard · boundary
resets on `setSelectedChannel` (verified: C# pushes it BEFORE `loadMessages` on both paths) · `deleteMessage`
re-anchors the boundary to the next **received** row · param rename + blind-group comment.

**i18n** — **MAJOR (regression introduced by hiding 5 locales):** `App.xaml.cs:100-107` persists
`CultureInfo.CurrentCulture` on FIRST RUN, so an it/ja/id/lt OS user lands on a hidden locale **without ever
opening a picker** → the picker showed **no selection** and tapping any row silently moved them off their OS
language. Fixed with a non-actionable "pending" row (endonym + `languagePending` hint) in both pickers. Also:
**`launch.html` never passed `language:` into the launch shell** (pre-existing, wider than A4 — the launch pill
misreported the saved language in EVERY locale) → wired via `window.__SPIXI_LANG__`. Plus de-de MT fixes
(`unpin` "Lösen" → "Nicht mehr anheften"; `banBody`/`kickBody` off formal-Sie) and doc corrections (662 keys).

**Scripts** — **§5.6 RULED: FAIL LOUD, not guard-and-degrade.** A runtime `typeof attachCallUi === 'function'`
guard would silently ship a call-less app; a version skew must never leave the build. `build-shells.mjs` gained
a **preflight** that parses the bundle's `window.Spixi = {…}` export map and every shell's destructure +
`window.Spixi.x` accesses, and **exits 1 before writing anything** if a shell references a symbol the bundle it
is about to inline does not export (an unparseable destructure warns+skips — false positives are the enemy;
an unparseable *bundle* is fatal). Also a soft "components newer than the bundle" staleness warning. This is
the gate that would have caught the dead-home-pane F5. · NUL-gate hint corrected (§5.7; `src/**` re-grepped
CLEAN — `apps-discover.js` now uses `String.fromCharCode(0)`) · **+14 smoke assertions** for the batch's only
new component (ring role/actions/no-Ignore, dialing vs ticking bar, drop-ring-on-bar, clear-grace).

### Rulings on the §5 edges

| # | Ruling |
|---|---|
| 1 | Stale secondary ring: **FE auto-expire REJECTED** (a timer that hides a card C# still considers live is the same lie as the dropped Ignore action, #256). Landed the drop-ring + answered-latch instead; the residual is **C18 + C18b(a)** — `rejectCall` on an accepted call **does** kill it (verified). |
| 2 | Callbar over the topbar: **a11y is sane** (not modal, not aria-hidden, focus order intact) — it is *occlusion*, not a trap; WCAG 2.4.11 is a 2.2 AA criterion, out of the project's 2.1 AA scope. **Visual = Damir's dial** (it does cover the chat back button for the call's duration). Patch on request: reserve a row instead of overlaying. |
| 3 | i18n-lint over shells: **your local run was never pasted** — the audit found no shell leak statically, so a clean run is expected; if it exits 1, treat the hits as findings (triage), not batch-A regressions. |
| 4 | `alertdialog` with Esc/scrim disabled: **CLEAN** — focus trap, `aria-modal`, `[data-autofocus]` on Accept all survive `ignore:false`; a remote clear sets `data-silent` so no phantom `onIgnore`. |
| 5 | `positionsFor` grouping break: **CLEAN** — `withPrev`/`withNext` pass the boundary id from both sides, so the row above terminates its run and the boundary row starts a new one; corners stay coherent mid-run of the same sender. |
| 6 | Version skew: **fail-loud preflight LANDED** (above). |
| 7 | NUL false positive: **fix verified**, hint corrected, `src/**` clean. |

### 🟡 For Damir (logged, NOT silently changed)

1. **The divider's "text rows only" dial has a sharper edge than stated.** C# pushes `read` on `addFile`
   (`:1525`), `addPaymentRequest` (`:1432/1483`) and `addAppRequest` (`:1591`) too. So an unread block that
   contains **no text at all** (three files while you were away) gets **no divider whatsoever**, and an unread
   file above the first unread text reads as already-seen. Your dial as accepted, so not changed — but the fix
   is one shared `noteUnreadBoundary(id, read, localSender)` helper called from all four handlers (~6 lines).
   Say the word and it lands. (`addCall` carries no `read` arg — calls can never participate.)
2. **Callbar occludes the chat back button** (edge 2 above) — visual dial.
3. **A ring cannot be answered while the app is locked** (lock is excluded by design; C# still consumes the
   ring into home's WebView under the lock). Defensible, but it's a behavior line for the release notes.
4. **`extract-strings` still collects no `bareRefs` for shells**, so a shell-side key typo (`s.jumpToMentionn`
   with no `||` fallback) renders `undefined` in every locale and neither the extractor nor the lint catches
   it. No occurrence found today. Worth a follow-up in a scripts batch.
5. Housekeeping (from #255, still open): delete `src/components/.fuse_hidden0000001100000001`; the stale
   `src/strings/draft/*.todo.json` work-lists now contradict the shipped drafts (regenerate with `--todo` or
   delete).

### New string key introduced by this loop

`languagePending` → *"Your system language is set for Spixi, but this interface is still shown in English — its translation is on the way."* (byte-identical fallback in `settings.html` + `launch-shell.js` → no `--check` conflict; picked up by the next `extract-strings` run.)

### Damir's local run (order matters — bundle BEFORE shells; the preflight now enforces it)

```
node scripts/extract-strings.mjs      # +languagePending, expect 0 conflicts
node scripts/build-locales.mjs
node scripts/build-strings-iife.mjs
node scripts/build-demo-bundle.mjs    # call-ui.js + callbar.js changed
node scripts/build-shells.mjs         # preflight runs here
node scripts/i18n-lint.mjs && node scripts/pseudo-locale-smoke.mjs && node scripts/smoke-test.mjs
```
F5 checklist: ring on a 2nd device (list + at chat open) · answer on one surface → **the other surface's ring
disappears when the bar lands** · dialing bar shows no timer · hang-up clears · unread divider once per open,
never over a live message after a bot channel switch · Settings → Deutsch (8 locales offered) · an it-it/ja-jp
device shows its language as a non-actionable "translation pending" row instead of an empty picker.
