# HANDOFF — next session: DESKTOP PASS (post #231/#232)

> **THE pickup doc for the next build session.** Supersedes `handoff-session-flicker-native.md`
> as entry point (that doc stays as the flicker/native-punch record; its §5c workflow split
> STILL APPLIES: fable builds only / Opus reviews separately over a brief / Damir runs
> smoke+builds+F5+commits). Decision rows to read first: **#231 #232** (+#225 overlay model,
> #221 isolation model, #89 desktop demo).

## 0. Standing directives (Damir 2026-07-10, row #232 — do not violate)

- **Wallet-SEND lands LAST of everything.** `composeSend` stays capability-gated OFF.
- **Anything security-flagged = HUMAN BE REVIEW before build** (not just a log entry).
- **★ Chat isolation REAFFIRMED:** conversation = its OWN WebView, gated from the rest of the
  app. Desktop pass must keep every pane its own WebView; cross-pane coordination via C# verbs
  only; `src/demo/desktop.html` is art-direction, NOT architecture (#220 rejected, #221 model).

## 1. STATE — what's in flight

- **#231 batch (this tree, uncommitted):** brand fonts (lock/launch → --font-display) · B4
  excerpt canon (home.html) · B5 avatar borders · B2 probe prepped · **#231b type-role fix**
  (excerpt rendered BIGGER than the row name on desktop — `.c-excerpt` + tx `__time`/`__fiat`
  body-md→body-sm) · **#231c linkify** (www./bare-domain pickup + long-URL display truncation,
  message-bubble.js — the COMPONENT change that makes the bundle rebuild REQUIRED) · **#231c
  min-width** (App.xaml.cs MinWidthDip 480→384, TG-class — the one safe C# constant) · OG/thumbnail
  link previews logged as **be-cutover C14** (sender-composed §8; ★ human BE review first, #232)
  · docs (#231/#232 rows, punch-list, Opus brief). Damir: `node scripts/build-demo-bundle.mjs` →
  `node scripts/build-shells.mjs` → `node scripts/smoke-test.mjs` → F5 → commit
  (title/description + F5 checklist at the bottom of this file).
- **Opus adversarial review DONE 2026-07-10 (#233) → PASS** (brief archived to
  `docs/archive/opus-review-brief-native-punch.md`). 2 mechanical fixes landed directly:
  (1) `SpixiContentPage.pushPageLoaded` drops a staged overlay when `modalOverlayOp != null`
  (#230 gap — a programmatic notification-driven overlay could cover an in-place lock);
  (2) `.c-contact-request__sub` body-md→body-sm (#231b sweep miss). Rest CLEAN.
  **⚠ #234 — PRE-EXISTING MAJOR: resume-lock Cancel unlocks without the password** (Damir must
  F5-confirm + decide the fix — it is item 1 of `docs/fable-build-brief-desktop-pass.md`).
- F5 verdict #227–#230 = PASS; app-wide quirks triage DEFERRED until most is done.
- Launch OUTPUT rebuild deferred to its own batch (#228 flag + #231 title font land there).

## 2. DESKTOP PASS — scope (#232 ④, build in this order)

Today desktop is "still essentially a mobile app". Spec update FIRST (`desktop-split-spec.md`
+ interview flags), then build. Reference: `src/demo/desktop.html` (#89) for art direction.

1. **Left NAV RAIL** replacing bottomnav on desktop — production shells via `:root[data-desktop]`
   + a rail variant of the nav component (demo has `vertical-bottomnav rail`). Same items/badges/
   free-function API (`setNavActive`/`setNavBadge`).
2. **Account as a PANE, not a full-window takeover.** #225 `pushPageLoaded` already does column
   placement (chat: wide=column 1). Give SettingsPage the same treatment on wide windows
   (column + no full-span), keep `onOverlayClosed` refresh + rating hook. Small C#.
3. **Account missing entries per the settings DEMOs** (`src/demo/settings.html` vs shipped
   `src/shells/settings.html`): add every zero-C# row now; BE-gated rows (S14 save-without-pop
   etc.) stay capability-gated OFF, built + ready.
4. **Reply-to in chat.** BE engineer: NO C# needed. ⚠ VERIFY FIRST (#215 lesson — the C8 revert):
   the app tree has ZERO reply plumbing (grep: no reply/quote in Pages/, Utils/), so the carrier
   must be Ixian-Core / SpixiMessage-side or an in-band payload convention. **Get the BE engineer
   to name the exact carrier, then F5 a reply round-trip on TWO devices + re-enter the chat
   (persistence) BEFORE building.** FE is ready: bubble quote + composer context strip + menu
   Reply are BUILT and cap-gated (#79/#25) — this is un-gating + wiring the carrier.
5. **Pin chat.** FE `pinned` flag + pinned-first sort already exist in chatlist. Interim
   persistence = localStorage per-peer (drafts/myLikes class, zero-C#); durable = CH4 at cutover.
   Wire the row-menu Pin action → flag + persist + re-render.
6. **Chat-info as an integrated desktop PANE** — separate shell/WebView shown BESIDE the open
   conversation (the "separate but integrated" ask), not the mobile takeover. Own WebView (§1);
   selection/refresh via C# (`ixian:details` today; A5's ContactDetails-repoint findings apply).
   Narrow windows keep the takeover.
7. This pass also structurally fixes **#225-M2** (resize across 700px strands an open overlay).

Each unit: spec row → build → self-review → Opus brief entry → Damir F5. BE asks that surface
go to `docs/be-cutover-brief.md`, security-flagged ones BLOCK on human BE review (#232).

## 3. AFTER the desktop pass (roadmap order)

Quirks triage batch (Damir's list, when most is done) → BE cutover leftovers (C1–C3 inline pay ·
resend · CH3/CH4 persist · W1–W4 · S14 · L1–L4 · §5 legacy-page retirement) → full Windows test →
Android (FIX RocksDbSharp FIRST — blocks the build; then overlay/avatar/file-access F5) → iOS pass
(WKWebView: X1 data-URIs land here, insets #223 blind, biometrics) → Phase 4 freeze audit + Figma
mirrors (type tokens #226/#227 + queue) + locale build. **Wallet-send LAST (#232).**

## 4. Environment rules (unchanged)

- PC mount serves STALE data to bash — file tools (Read/Edit/Write) only for source of truth.
- Build sessions run NOTHING long: end each batch with the exact local commands for Damir.
- F5 net10.0-windows only; Rebuild Solution trips the pre-existing android RocksDbSharp errors.

## 5. Commit for the CURRENT tree (#231 + #232 docs)

**Title:**
```
native-punch closeout (#231–#231c): brand fonts, excerpt canon, avatar borders, excerpt/name size fix, linkify www/bare+truncation, min-width 384 + strategy row #232
```

**Description:**
```
F5 verdict #227-#230 = PASS (lock flicker gone); app-wide quirks triage deferred.
FE + one safe C# constant; message-bubble.js changed -> full build sequence
(build-demo-bundle -> build-shells -> smoke).

- Brand fonts: .c-lock__title, .c-launch__slide-title (carousel + onboarding tail),
  .c-launch__hero-title -> var(--font-display) (Sora). UI chrome stays system-ui (B1/#226).
- B4 excerpt canon (home.html): base58 tokens (20-128, digit guard) -> middle-truncated,
  URLs -> domain only, lone GIF URLs keep the GIF chip. Extends #211/#212 to excerpts.
- B5 avatars: container hairline dropped (gradient placeholders borderless);
  hairline moved to photo <img> only. Same footprint/mask both variants.
- #231b: excerpts rendered BIGGER than row names on desktop (excerpt rode body-md,
  which the #227 dial repurposed for bubbles at 15px, vs body-lg names at 14px).
  .c-excerpt -> body-sm (13 desktop / 14 mobile); tx-row time+fiat -> body-sm (parity).
- #231c linkify (message-bubble.js): URL_RE now catches www.-hosts and bare domains
  on a common-TLD whitelist (github.com links without https://); email/token guard
  keeps a@b.com plain; scheme-less links get https:// prefixed for the CLICK only;
  long URLs display middle-truncated >64 chars (full URL on title + confirm modal).
  OG/thumbnail preview = be-cutover C14 (sender-composed s8; human BE review first).
- #231c min-width: Platforms/Windows/App.xaml.cs MinWidthDip 480 -> 384 (TG-class).
- #231c link alignment: .c-bubble__link text-align:start (button default CENTERED
  a wrapped long URL's 2nd line).
- B2: no WinUI zoom/scale override found; F12 probe steps in native-feel-punch-list.
- Docs: DECISIONS #231+#231b (batch) + #232 (strategy: wallet-send LAST, security items
  gate on human BE review, chat isolation reaffirmed, desktop-pass scope);
  opus-review-brief-native-punch.md (covers #227-#231b); handoff-desktop-pass.md
  (next-session pickup); punch-list B2/B4/B5 statuses; CLAUDE.md status.

Opus adversarial review owed over #227-#231b (brief in docs/). Launch output rebuild
still deferred to its own batch.
```

## 6. F5 / TEST CHECKLIST for this session's changes

Run first: `node scripts/build-demo-bundle.mjs` → `node scripts/build-shells.mjs` →
`node scripts/smoke-test.mjs` (bundle rebuild REQUIRED — message-bubble.js changed).
Then F5 net10.0-windows, BOTH themes:

**#231b type hierarchy (the screenshot bug):**
- [ ] Chat list: nickname clearly LARGER than the excerpt line (desktop 14 vs 13)
- [ ] Narrow/mobile-width sanity: name 18 vs excerpt 14 — excerpt 16→14 is a visible
      step DOWN, confirm it reads right (flag if too small → dial body-sm mobile)
- [ ] Wallet tab: tx name (16) > time/fiat (13); rows align rhythm-wise with chat list
- [ ] Unread rows: semibold excerpt still smaller than the name

**B4 excerpt canon:**
- [ ] Row whose last message is a raw address → shows 6…6 truncated, not full base58
- [ ] Row whose last message is a URL (github.com/foo/bar…) → domain only
- [ ] Tenor/giphy/.gif link → still the GIF chip, NOT a domain
- [ ] Normal text, emoji, ❤️→"Reacted", Draft:, File/Payment glyph rows — unchanged

**B5 avatars:**
- [ ] Gradient avatars: NO hairline ring (both themes; check hover/selected rows)
- [ ] Photo avatars: hairline present, photo not visibly inset vs gradient neighbors
- [ ] Presence dot ring unchanged; topbar chat avatar + member sheet unaffected

**Brand fonts:**
- [ ] Lock screen title = Sora (launch titles land at the launch rebuild batch)
- [ ] Topbar view titles / buttons / body text still system-ui

**#231c linkify (conversation, send these as messages):**
- [ ] `github.com` and `www.github.com` → link buttons (blue/underline), open the confirm modal
- [ ] `https://www.github.com` → still links (no regression)
- [ ] Confirm modal for a scheme-less link shows `https://github.com` (the real target)
- [ ] `a@b.com` and `file.txt` and `node.js` → plain text, NOT links
- [ ] A very long URL (the medium.com one) → truncated `…` display; if it still wraps,
      the 2nd line is LEFT-aligned (not centered); click → confirm modal shows the FULL url
- [ ] Trailing punctuation: `see github.com.` → link excludes the final dot
- [ ] Incoming (received bubble) links look right in both themes

**#231c min window width:**
- [ ] Drag the window edge: floor is now ≈384 logical (Telegram-class), no jitter, layout
      usable at the floor (composer, rows); relaunch restores size

**B2 probe (punch-list B2):**
- [ ] F12 in any shell → `devicePixelRatio` equals the Windows display scale; hairlines crisp

**Regression sweep (files touched = home.html, 2 list CSS, 2 brand CSS, avatar.css):**
- [ ] Chat list scroll/filter/search + requests card render normally (home.html touched)
- [ ] smoke-test green (excerpt assertions may reference body-md — if one fails there,
      it's the test needing the #231b update, not the code; report it)
