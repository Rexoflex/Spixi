# Fable build brief — DESKTOP PASS (post-#233 review)

> **Work order for the next fable BUILD session.** Consumes `handoff-desktop-pass.md` §0/§2 +
> the Opus review outcome (#233/#234). Entry-read order: this file → `handoff-desktop-pass.md`
> → DECISIONS **#231 #232 #233 #234** (+ #225 overlay model, #221/#220 isolation).
> §5c workflow: **fable BUILDS ONLY** — no smoke/bundle/shell runs, no long commands; end the
> batch with the exact local commands for Damir. Adversarial review = a SEPARATE Opus session
> over a fresh brief; fable's self-review is a pre-filter, not the gate. Damir F5s + commits.

## 0. Standing directives (Damir #232 — do not violate)

- **Wallet-SEND lands LAST of everything.** `composeSend` stays capability-gated OFF.
- **Any security-flagged item = HUMAN BE REVIEW before build** (gate on sign-off, not just a log).
- **★ Chat isolation:** conversation = its OWN WebView, gated from the rest of the app; every
  desktop pane = its own WebView; cross-pane coordination via C# verbs ONLY; `src/demo/desktop.html`
  is art-direction, NOT architecture (#220 rejected, #221 model).
- **Environment:** PC mount serves STALE/truncated data to bash/node — use the file tools
  (Read/Edit/Write) as source of truth; verify inline `node --check` / the strict inliner, not the mount.

## 1. Tree state you inherit (UNCOMMITTED — Damir commits first)

The #231 batch + the 2 review fixes from #233 sit uncommitted in the working tree:
- #231/#231b/#231c FE (brand fonts, B4/B5, type-role, linkify, min-width) — see `handoff-desktop-pass.md` §5/§6.
- **#233 review fixes (landed by Opus):** (1) `Spixi/Utils/SpixiContentPage.cs` `pushPageLoaded`
  now drops a staged overlay when `modalOverlayOp != null` (the #230 lock-cover guard);
  (2) `src/styles/components/contact-request.css` `__sub` body-md→body-sm; (3) `src/styles/tokens.css`
  §2b comment NIT. These are CSS/C# only → NO extra bundle rebuild beyond what #231c already forces.

Damir's commit for this tree = `handoff-desktop-pass.md` §5 (add "+ Opus review #233 fixes:
lock-cover guard + contact-request sub size" to the description). Then the desktop pass builds on top.

## 2. ITEM 1 (DO FIRST) — resolve #234, the resume-lock Cancel bypass ⚠ SECURITY

**Finding (Opus #233, MAJOR, pre-existing):** the resume/privacy lock (`App.xaml.cs:251`
`new LockPage(true)` = confirm mode) shows a **Cancel** button that emits `ixian:change` →
`authSucceeded(false)` → `App.onUnlock` (ignores the bool) → **app unlocks WITHOUT the password.**
Settings-confirm locks are SAFE (they check `e.Value`). Full chain + files: DECISIONS #234 /
`security-review-for-be-engineer.md` §1a.

- **GATE (do NOT build blind — #215 lesson):** Damir must first F5-confirm on-device that the
  resume lock actually renders a Cancel AND that tapping it unlocks. It is a lock/auth surface →
  ★ security-flagged → the fix decision is Damir's + the BE engineer's per #232.
- **The knot:** `justConfirm` couples two axes — (1) close-in-place-vs-rebuild-Home on unlock
  (resume wants close) and (2) show-a-Cancel-escape (resume must NOT). So guarding `App.onUnlock`
  on the bool ALONE is insufficient (Cancel still closes the lock → visible app, latch stuck).
- **Candidate fixes to put to Damir/BE (pick one after confirm):**
  (a) give the resume lock a mode that closes-in-place but renders NO Cancel (split the confirm
      mode into "confirm-action" (Cancel) vs "reauth" (no Cancel)); e.g. a new
      `setLockMode(el,'reauth')` / a `showCancel:false` flag threaded from a new
      `setJustConfirm`-adjacent push, wired so `App.onResume` requests the no-Cancel variant.
  (b) make `App.onUnlock` release ONLY on `authSucceeded(true)` AND make the resume lock's
      `ixian:change` NOT close (stay locked) — i.e. Cancel is inert on the resume lock.
- **Files:** `src/components/lock-shell.js` (`lockSync` cancel visibility) · `src/bridge/lock-page.js`
  (mode push) · `Spixi/Pages/Launch/LockPage.xaml.cs` (`ixian:change` under a reauth mode) ·
  `Spixi/App.xaml.cs` (`onUnlock` bool guard + which mode `OnResume` requests). Component change →
  bundle rebuild. **Gate: BE sign-off before landing** (security surface). Fail-closed target: a
  resume lock requires auth to dismiss, on every path.

## 2a. Opus re-audit #235 follow-ups (the break-my-verdict pass found more)

A 2-agent adversarial re-audit of #233's two highest-risk CLEANs found real holes. State:

- **✅ #234 is USER-CONFIRMED** (Damir on-device: resume/confirm lock Cancel bypasses; boot lock has no Cancel). Item 1 above is now "decide + build the fix", not "confirm".
- **✅ LANDED in review (C#, no build churn):** in-place lock over a NON-HomePage host was back-dismissable (`App.OnResume` stages on `CurrentPage`; legacy pages pop themselves with no back-guard). Fixed by requiring `op.host == overlayHost` in `SpixiContentPage.presentPreload.canShowInPlace` — legacy-page hosts now get a real (un-poppable) modal lock. Nothing to build; Damir F5: resume onto Wallet-Send/Scan/Backup, background, resume → lock appears, hardware/gesture back does NOT dismiss it.
- **🟡 BE (be-cutover C15, security-flagged #232):** chat link-open confirm modal is spoofable — C# `HtmlDecode`s the URL after the modal showed it (`paypal.com&commat;evil.example.com` → opens `evil.example.com`). Root fix is C#. **Human BE review before any related build.**
- **🟡 FE MINORs (fable, fold into the chat-polish/desktop pass — bundle rebuild):**
  1. `message-bubble.js displayUrl` can hide a userinfo host in the elided middle
     (`google.com…@evil.com`) — make it always surface the real host (parse + show host prominently),
     so the truncated label can't read like a trusted domain.
  2. `linkifyInto` is O(n²) on a crafted ~50KB no-TLD token (`a.a.a…`) → chat-pane render freeze
     (isolated to the chat WebView per §1, but a victim-side DoS). Add a length guard: skip linkify
     (render raw text via `appendWithMentions`) above a sane message-length cap.

## 3. DESKTOP PASS units (#232 ④; build in this order, spec FIRST)

Spec update FIRST: `docs/desktop-split-spec.md` + the interview flags, then build. Reference:
`src/demo/desktop.html` (#89). Each unit: spec row → build → self-review → Opus-brief entry → Damir F5.
BE asks → `docs/be-cutover-brief.md`; security-flagged ones BLOCK on human BE review (#232).

1. **Left NAV RAIL replacing bottomnav on desktop** — zero-C#. Production via `:root[data-desktop]`
   + a rail variant of the nav component (demo has `vertical-bottomnav rail`). Keep the same
   items/badges/free-fn API (`setNavActive`/`setNavBadge`). Files: nav component CSS/JS +
   `src/shells/home.html` desktop branch.
2. **Account as a PANE, not a full-window takeover** — small C#. #225 `pushPageLoaded` already does
   column placement (chat: wide=column 1); give SettingsPage the same on wide windows (column + no
   full-span), keep the `onOverlayClosed` refresh + rating hook. Files: `HomePage.xaml.cs onSettings`
   (column arg) + `SpixiContentPage`/settings overlay wiring. ★ each pane stays its own WebView.
3. **Account missing entries per the settings DEMOs** — zero-C# now. Diff `src/demo/settings.html`
   vs shipped `src/shells/settings.html`; add every zero-C# row; BE-gated rows (S14 save-without-pop
   etc.) stay capability-gated OFF (built + ready). Files: `settings-shell.js` + `src/shells/settings.html`.
4. **Reply-to in chat** — ⚠ **BE-VERIFY-FIRST GATE (#215 lesson, the C8 revert).** BE says NO C#
   needed, but the app tree has ZERO reply plumbing (grep: no reply/quote in `Pages/`,`Utils/`) →
   the carrier must be Ixian-Core / SpixiMessage-side or an in-band payload convention. **Get the BE
   engineer to name the exact carrier, then F5 a reply round-trip on TWO devices + re-enter the chat
   (persistence) BEFORE building.** FE is ready: bubble quote + composer context strip + menu Reply
   are BUILT + cap-gated (#79/#25) — this is un-gating + wiring, not new UI. Do NOT build on assumption.
5. **Pin chat** — zero-C# interim. FE `pinned` flag + pinned-first sort already exist in chatlist;
   interim persistence = localStorage per-peer (drafts/myLikes class); durable = CH4 at cutover.
   Wire the row-menu Pin action → flag + persist + re-render. Files: `chats-row-menu.js` +
   `src/shells/home.html`.
6. **Chat-info as an integrated desktop PANE** — separate shell/WebView BESIDE the open
   conversation (the "separate but integrated" ask), NOT the mobile takeover. Own WebView (§1);
   selection/refresh via C# (`ixian:details` today; A5's ContactDetails-repoint findings apply).
   Narrow windows keep the takeover. Files: a chat-info shell entry in `build-shells.mjs` +
   `HomePage.xaml.cs` pane host. ★ isolation: its own WebView, C#-mediated selection.
7. This pass also structurally fixes **#225-M2** (resize across 700px strands an open overlay).

## 4. Gates cheat-sheet

- **zero-C#:** rail (1) · Account entries (3) · pin (5). Build freely.
- **small C#, non-risky:** Account-as-pane (2) · chat-info pane host (6). Fine to build (no signing/
  keys/paths/pane-bridge); confirm the pane keeps its own WebView.
- **BE-verify-first:** reply-to (4) — name the carrier + F5 round-trip/persist BEFORE building.
- **human-BE-review-blocked:** #234 lock fix (2) — Damir/BE sign-off first. Wallet-send = LAST (#232).

## 5. End-of-batch — Damir's local command list (fable does NOT run these)

Per the batch's touched files:
- Component/JS changed (lock-shell, nav, chatlist menu, chat-info, etc.):
  `node scripts/build-demo-bundle.mjs` → `node scripts/build-shells.mjs` → `node scripts/smoke-test.mjs`
- Shell/CSS only: `node scripts/build-shells.mjs` → `node scripts/smoke-test.mjs`
- Then build **net10.0-windows** (NOT Rebuild Solution — trips the pre-existing android RocksDbSharp
  errors) → F5 → commit. List the exact subset per unit.
