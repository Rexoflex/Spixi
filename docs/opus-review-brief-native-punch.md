# Opus adversarial review brief — flicker/native-punch era (#227–#231)

> For a SEPARATE Opus review session (workflow §5c, handoff-session-flicker-native.md). fable's
> in-session self-review was a pre-filter only; **this brief is the sign-off gate.** Written
> 2026-07-10 by the fable build session. Findings ritual: report file:line, MAJOR/MINOR/NIT;
> mechanical fixes may land directly; architectural findings = 🟡 DECISIONS rows, never silent.

## Boot ritual

1. Read `CLAUDE.md` (root) — ★ security invariants first; then `docs/handoff-session-flicker-native.md`
   (§2 what shipped, §5b addendum) and DECISIONS rows **#222–#231**.
2. ⚠ **Environment:** bash/node in the sandbox may serve STALE or TRUNCATED file copies (#165/#175
   class). Trust the **Read tool only** for file contents; tell any sub-agents explicitly.
3. Do NOT run bundle/shell builds or smoke — Damir runs those locally. Static review only
   (+ `node --check` on /tmp transcriptions if needed).

## Scope — two layers

### Layer 1 (owed from the flicker sessions): #227–#230, mostly C#

Commit state: #222 committed (9e574280); rounds 2+3 + native punch + #227–#230 sit in the
working tree / recent commits — review the REAL files, not the handoff summaries.

| Row | What | Files | Review asks |
|---|---|---|---|
| #227 | Type dial 2 (desktop type/density values) | `src/styles/tokens.css` | values only via `:root[data-desktop]`; mobile untouched; no viewport type queries left |
| #228 | Platform flag `:root[data-desktop]` — head snippet ×14 shells; charset moved head-first | `src/shells/*.html`, `Spixi/Resources/Raw/html/*` | snippet identical across shells; launch exempt (documented); charset within first 1024 bytes; no FOUC-order regression vs the boot-theme script |
| #229 | Lock modal load-then-present + overlay-close hide-then-dispose | `Spixi/Utils/SpixiContentPage.cs`, `App.xaml.cs`, `Pages/Settings/SettingsPage.xaml.cs`, `Pages/Settings/LockPage.xaml.cs` | input-freeze during staging; biometric defer; **fail-closed paths** (stage timeout, disposed host); the TotalSeconds lock-bypass fix; ≤1.3s staging exposure (Damir sign-off logged?) |
| #230 | Lock SHOWN IN PLACE (opacity flip; modal push = fallback) | `SpixiContentPage.cs` (`modalOverlayOp`/`closeModalOverlay`/`hasModalOverlay`/`onPresentedInPlace`), `HomePage.xaml.cs` (back swallow), `LockPage.xaml.cs` | ★ **the security-critical one**: lock must be un-dismissable — back swallowed on every path; `modalOverlayOp` NOT closable via overlay APIs; stranded-lock disposal clears the latch fail-closed; the opaque stage eats ALL pointer input incl. during animations; wrong-password auto-release can't leave the app unlocked-but-hidden |

★ rules to verify each row: no signing/broadcast paths touched · no keys/passwords across the
bridge · no WebView-supplied filesystem paths · NO chat↔pane JS bridge (overlays stay N isolated
WebViews) · lock/auth logic changes are presentation-timing only.

### Layer 2 (this batch): #231 — FE-only closeout, zero-C#

| Item | Files | Review asks |
|---|---|---|
| Brand fonts | `src/styles/components/lock-shell.css` (`.c-lock__title`), `launch-shell.css` (`.c-launch__slide-title`, `.c-launch__hero-title`) | `--font-display` resolves (Sora face lives in base.css — confirm both shells inline base.css); no other UI text caught; tail/backup/join titles reuse slide-title (launch-shell.js:283/916/945) — intended |
| B4 excerpt canon | `src/shells/home.html` (`BASE58_TOKEN_RE`/`looksLikeAddress`/`domainOf`/`canonExcerptText`, wired in `excerptFromRaw`; `truncateAddressMiddle` added to the window.Spixi destructure) | ordering: typing → CH6 phrase → heart → GIF-URL → canon (GIF chip must win over domain-only); split(/(\s+)/) join fidelity (whitespace preserved exactly); digit-guard false-positive posture acceptable; draft excerpts intentionally NOT canonicalized (user's own text); `truncateAddressMiddle` IS in the bundle export map (verified: spixi.iife.js expose); no XSS surface (textContent rendering unchanged) |
| B5 avatars | `src/styles/components/avatar.css` | border moved container→`.c-avatar__img`: footprint identical under border-box; no other CSS depended on the container border (grep found only contacts-shell disabled-opacity + topbar dot-ring — both unaffected); 1px img border slightly insets the photo — acceptable?; presence dot ring untouched |
| B2 | `docs/native-feel-punch-list.md` B2 block | probe steps sane; claim "no WinUI zoom override" (grep showed Android renderer only) — verify nothing in `Platforms/Windows/` or WebView wiring sets ZoomFactor/RasterizationScale |
| #231b type-role fix | `chatlist-item.css` (`.c-excerpt` body-md→body-sm), `txlist-item.css` (`__time`/`__fiat` body-md→body-sm) | hierarchy restored both breakpoints (desktop name 14 > excerpt 13; mobile 18 > 14); sweep for OTHER components still riding body-md in a SECONDARY-line role since the #227 body-md=bubbles repurpose (search `font-size-body-md` across src/styles — bubbles/settings body copy legitimately keep it); no truncation/line-height regressions at 13px |
| #231c linkify | `src/components/message-bubble.js` (`BARE_TLDS`/`URL_RE`/`displayUrl`, `linkifyInto` prev-char guard + href normalization) | ⚠ COMPONENT change → bundle rebuild required (verify Damir's command list says so). Adversarial cases: `a@b.com` / `x...github.com` glued tokens stay text (guard char class `[\w@.\-/]` — is `-` correctly escaped mid-class?); alternation overlap (scheme alt must consume before www/bare alts — matchAll advance); trailing-punctuation trim still runs AFTER the wider match (a bare `github.com.` keeps the dot out); `displayUrl` only affects textContent — full URL must reach onLinkClick + title; scheme-less href = `https://` + url (never http); zero-width/regex-DoS: URL_RE is linear, no nested quantifiers over the same class?; mention interplay — link buttons must not swallow @mention spans (gap routing via appendWithMentions unchanged); smoke-test may assert on old link textContent (full URL) — if it fails there it's the TEST to update |
| #231c min-width | `Platforms/Windows/App.xaml.cs` (`MinWidthDip` 480→384) | constant-only; confirm the #226 machinery (DPI scaling, PreferredMinimum, restore-clamp) needs no companion change at 384; layout floor sanity = Damir's F5 |
| C14 logged (not built) | `docs/be-cutover-brief.md` C14 | OG/link-preview correctly routed to sender-composed §8 + human-BE-review gate (#232) — verify no client-side fetch snuck into the linkify change (there is none: display/click only) |

## Known/accepted (don't re-flag)

- Best-effort false positives in B4 (literal 20+ char base58-ish strings a user typed) — CH6 posture.
- Launch shell OUTPUT not rebuilt — deferred to its own batch (#228 flag + src drift, handoff §4).
- net10.0-android RocksDbSharp build breakage — pre-existing, out of scope.
- Desktop resize across 700px stranding an open overlay (M2 #225) — deferred to the split-view pass.
- Quirks-list triage deferred app-wide (Damir 2026-07-10).

## Exit ritual (do ALL of this, in order)

1. **Verdict:** CLEAN, or findings list (file:line, MAJOR/MINOR/NIT). Mechanical fixes land
   directly (file tools only — bash mount is stale); architectural findings = 🟡 DECISIONS rows,
   never silent changes.
2. **Docs:** update DECISIONS #231 (+ new rows for any findings) and
   `handoff-session-flicker-native.md` §5b / `handoff-desktop-pass.md` §1 with the review outcome.
3. **ARCHIVE consumed briefs** → move to `docs/archive/` with a one-line 🗄️ STALE header
   (house pattern, see `docs/archive/handoff-opus.md`): THIS file
   (`opus-review-brief-native-punch.md`) once the review is done, plus the superseded
   `handoff-flicker-fable.md` / `handoff-flicker-next.md` if still at top level. Leave
   `handoff-session-flicker-native.md` in place (referenced as the #222–#231 record) and
   `handoff-desktop-pass.md` (the live pickup doc).
4. **WRITE THE NEXT BUILD BRIEF for fable:** `docs/fable-build-brief-desktop-pass.md` —
   consume `handoff-desktop-pass.md` §0/§2 + your review outcome into a concrete work order:
   any review findings fable must fix FIRST, then the desktop-pass units in §2 order (rail →
   Account pane → Account entries → reply-to [carrier verification gate! #215 lesson] → pin →
   chat-info pane), each with files, contracts, gates (zero-C# vs BE-blocked vs
   human-BE-review-blocked per #232), and the §5c rules (build-only, no long commands, end with
   Damir's local command list). Point CLAUDE.md's pickup line at it.
5. End by giving Damir: the review verdict summary + his local command list
   (`build-demo-bundle` → `build-shells` → `smoke-test` → F5 → commit).
