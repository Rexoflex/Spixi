# Launch/onboarding shell — welcome · create · restore · retry · onboarding tail

Phase 1 #5 (finalization-roadmap), the last Phase-1 surface. Consolidates the
five legacy pages (`intro.html` · `intro_new.html` · `intro_restore.html` ·
`intro_retry.html` · `onboarding.html`) into one `launch-shell` per
ARCHITECTURE §5 row 1. Folds in `illustrations-plan.md` (P1 assets 1–6) and
the backup onboarding tail (`backup-ux-spec.md` §3.3).

**Damir interview 2026-07-06 (this spec's #0 decisions):**
① welcome = **3-slide carousel** (illustration slots 1–3) ② the #160 lock
brand treatment (fixed-dark pin + `--gradient-lock` + bare glowing logo)
extends to the **welcome view only** — create/restore/retry/tail are normal
themed form surfaces ③ tail = **backup nudge + joinbot step** (full legacy
`onboarding.html` command coverage) ④ audit backlog **[L2] approved**: the
window-`pagehide` scrub extends to `createLockScreen` (lands in this batch).

## 1. Legacy bridge grammar (bridge-audit-A §7–10, audit-B OnboardPage — FROZEN)

| page | JS→C# | C#→JS |
|---|---|---|
| intro | `introload` · `create` · `restore` · `accept` · `language:<code>` · `appearance:<int>` | `setVersion` · `showTerms` · `showOnboardingSection` |
| intro_new | `onload` · `back` · `create:<nick>:<password>` · `error` · `avatar` · `restore` | `setVersion` · `loadAvatar(path)` |
| intro_restore | `back` · `selectfile` · `restore:<password>` | `setUploadedFileName` · `showPasswordError` · `removeLoadingOverlay` |
| intro_retry | `back` · `proceed:<password>` | `removeLoadingOverlay` |
| onboarding | `back` · `joinbot` · `error` · `finish` | — |

Parsing hazards (C#-side, FE must gate — the ENC_DELIM precedent):
- `ixian:create:<nick>:<password>` — nick = text up to the FIRST `:`, password
  = remainder with `Replace(nick+":","")`. So: **nick must not contain `:`**,
  and **the password must not contain the substring `<nick>:`** (it would be
  silently corrupted). Both gated inline; §9 ask for a C#-side guard.
- `ixian:restore:` / `ixian:proceed:` — whole remainder = password; safe.

## 2. Surface — `createLaunchShell(opts)`

One mounted `<section class="c-launch">` that routes five internal views;
`view` opt = entry point (C# repoints LaunchRetryPage with `view:'retry'`).
Free fn `setLaunchView(el, view)` (`'welcome'|'create'|'restore'|'retry'|'tail'`).

```
createLaunchShell({
  view = 'welcome', termsRequired = false, version = '',
  onLanguage(code), onAppearance(int), onAcceptTerms(),          // welcome
  onCreateAccount(nick, pass, ctrl), onPickAvatar(),             // create
  onSelectFile(), onRestore(pass, ctrl),                         // restore
  onRetry(pass, ctrl),                                           // retry
  onBackupNow(), onJoinBot(), onFinish(),                        // tail
  onBack(view), strings = {}, host,
})
```

Free fns (C#→JS mirrors, #44 grammar): `setLaunchVersion(el, v)` ←
`setVersion` · `setLaunchTerms(el, required)` ← `showTerms` ·
`setLaunchAvatar(el, src)` ← `loadAvatar` · `setLaunchFile(el, name)` ←
`setUploadedFileName`.

### 2.1 Welcome (brand view — the only fixed-dark one) — PREMIUM ROUND (Damir 2026-07-06)

Subtree-pinned `data-theme="dark"` over the **new `--gradient-launch`**
(aurora recipe — violet crown halo, magenta glint, sapphire + teal corners
over violet-ink; 5 dial layers in tokens.css. Damir "more premium colors";
`--gradient-lock` stays on the lock until he converges them). Bare glowing
logo (#160 grammar), full-bleed under the statusbar (#160b⑧).

Single full-screen composition, top→bottom: floating controls · logo ·
carousel · dots · pinned CTAs · fine print · version.

- **Floating top controls**: language pill "🇺🇸 English ⌄" → the settings
  **option sheet** (`settingsOptionSheet`, #148⑥ — flags leading, long list
  scrolls; exported from settings-shell) firing `onLanguage(code)` per pick;
  appearance icon pill → the settings **theme sheet** (`settingsThemeSheet`,
  #147 preview tiles, stays open per #148②) firing `onAppearance(0|1|2)`.
  ONE picker grammar app-wide; both sheets mount on the host OUTSIDE the
  dark pin (lock hatch-modal precedent). Language inventory: `opts.languages`
  (defaults mirror the legacy 13, emoji flags per #148⑥).
- **4-slide autoplay carousel**: the SHIPPED legacy tour reused verbatim —
  `img/dark/onboarding/step1–4.svg` (copied to `src/demo/images/onboarding/`;
  dark set only — welcome is pinned dark) + the legacy en-us titles/copy as
  string defaults. Pointer-swipe, dots (`role="tablist"`, ←/→), gentle 5s
  wrap-around autoplay that retires on ANY manual nav, skips entirely under
  `prefers-reduced-motion`, and self-stops when the shell leaves the DOM.
- **CTAs always enabled** (fill + outline 56, pinned): internal view switches
  (the shell absorbs the legacy pages).
- **Terms = fine print** (premium consent — no checkbox): "By continuing,
  you agree to the Terms of Use" under the CTAs; the link opens the full
  legal text in a scrollable sheet (`strings.termsBody`, paragraphs split on
  blank lines, textContent-safe); the FIRST Create/Restore tap emits
  `onAcceptTerms()` → `ixian:accept` (one-shot, armed by `termsRequired` /
  `setLaunchTerms`; legacy accept was in-memory one-way anyway).
- Version line (`setLaunchVersion`) quiet in the footer.

### 2.2 Create (themed form view)

Topbar back (→ welcome + `onBack('create')`). Avatar picker: 96px c-avatar
placeholder + "Add a photo" chip → `onPickAvatar()` (`ixian:avatar`);
`setLaunchAvatar` swaps the preview. Fields: nickname (text, required) ·
password + repeat (lock `passwordField` grammar — shell-owned reveal eye,
`autocomplete="new-password"`). Inline gates in submit order: nick empty ·
nick contains `:` · password < ENC_MIN (8, flag ①) · repeat mismatch ·
password contains `<nick>:` (hazard §1). Legacy `ixian:error` (empty-nick
native alert) is superseded by the inline gate.

Submit → `onCreateAccount(nick, pass, ctrl)`. **Indefinite loading** — wallet
generation takes seconds and legacy shows a spinner until the page is
replaced; NO auto-release (unlike unlock's 1600ms — there is no native alert
to cover a silent failure here). `ctrl.done()` → success morph + scrub (C# is
navigating to Home; in the shell, `done()` also advances to the **tail**
view). `ctrl.fail(msg)` → restore + inline error (mock/future path). Flag ②:
wedge stance if C# ever fails silently.

### 2.3 Restore (themed form view)

Topbar back. File row: outline button "Choose backup file…" (`file-isr` glyph)
→ `onSelectFile()` (`ixian:selectfile`); `setLaunchFile(el, name)` renders the
picked name + check. Password field (`autocomplete="off"` — existing secret).
Gates: file picked · password non-empty. Submit → `onRestore(pass, ctrl)`;
loading until: `ctrl.fail(msg)` ← C# `showPasswordError` (+
`removeLoadingOverlay` — one-shot latch absorbs the double signal) → inline
error on the field; `ctrl.done()` → success morph + scrub (C# navigates).
Restore honesty line (backup-ux-spec §3.5 copy): "Restoring needs this file
and your password. Spixi can't recover either for you."

### 2.4 Retry (themed form view)

Shown when the stored wallet password fails at boot. Topbar back
(`ixian:back`). Copy: "Your wallet couldn't be unlocked with the saved
password." Password field (`autocomplete="off"`) + **Proceed** (56 fill).
Wrong password = NATIVE alert + `removeLoadingOverlay` → host calls
`ctrl.fail('')` = **silent restore** (no inline dup — the alert spoke; the
unlock-screen grammar). `ctrl.done()` → success morph + scrub. C#-side
attempt counter replaces the page with LaunchPage after N failures — not FE.

### 2.5 Onboarding tail (themed, two steps)

Entered from create success (`ctrl.done()`), or directly (`view:'tail'` — the
HomePage-modal repoint). NO back (legacy `ixian:back` exists but the modal is
a forward flow; flag ③).

1. **Backup nudge** (backup-ux-spec §3.3): illustration slot `backup` (#6),
   the §7 hero copy, **Back up now** (fill 56) → `onBackupNow()` ·
   **Later** (text, quiet) → step 2. Integration note (§9): "Back up now"
   routes via onboarding-complete + the settings Backup screen — no new verb.
2. **Join the community**: `heart-handshake` glyph, copy for the official
   Spixi bot group, **Join** (fill) → `onJoinBot()` (`ixian:joinbot`) ·
   **Not now** (text) → both then `onFinish()` (`ixian:finish` /
   `onboardingComplete` at integration).

## 3. Ctrl contract

`lockCtrl` one-shot grammar reused verbatim (done/fail, `used` latch). No
auto-release ANYWHERE in this shell: create has no covering alert; restore has
an explicit fail signal (`showPasswordError`); retry's host maps
`removeLoadingOverlay` → `fail('')`. `fail('')` = silent restore (no inline
error), `fail(msg)` = inline error + focus.

## 4. Illustration slots

`.c-launch__illo` with `data-illo="onboarding-welcome|onboarding-p2p|
onboarding-apps|create|backup"` — inline placeholder SVGs drawn to the
illustrations-plan §2 palette/geometry (rounded shapes on a blue-100 blob,
theme-stable) so Damir art-directs proportions NOW and nano-banana art drops
in later (same viewBox: 360×240 for 3:2 slots, 240×240 square). Placeholders
are marked `data-placeholder="true"` (smoke-guarded so a real-asset swap is
deliberate).

## 5. SECURITY.md checklist (password-adjacent shell — mandatory pass)

- Passwords live ONLY in field values, transiently; NO logging anywhere in
  the file (smoke-guarded like lock-shell).
- **Window `pagehide` scrub** (#162 grammar: window-level listener +
  `teardown()` on every leave path) on create/restore/retry — scrubs values
  AND re-masks reveals. Also scrub on topbar back and on `ctrl.done()`.
- **[L2, approved]** `createLockScreen` gets the same window `pagehide` scrub
  (unlock field); teardown on the hatch-confirm and cancel leave paths.
- Passwords never trimmed. `autocomplete`: create fields `new-password`,
  restore/retry `off` (lock-spec §5 stance, flag carried).
- Nick/password transit as `ixian:` URL payloads is a legacy C# reality
  (SECURITY.md known issue) — not widened by FE.

## 6. Flags for Damir's demo pass

① ENC_MIN=8 shared with encpass (legacy launch minimum unknown) ② create
wedge stance — indefinite spinner if C# dies silently (add a §9 failure verb?)
③ tail has no back — OK? ④ carousel/tail copy (all strings overridable; slide
copy defaults = the legacy en-us tour text) ⑤ backup-nudge placeholder
proportions (the only placeholder left) ⑥ ThemeAppearance int mapping assumed
0/1/2 (System/Light/Dark) ⑦ terms body is condensed v1 (full legacy legal
text rides `strings.termsBody` at i18n) ⑧ `--gradient-launch` dials (5 layers
in tokens.css) — converge the lock onto it? ⑨ join step: legacy
`join-community-img.svg` exists (light+dark) but the tail is THEMED — wire a
theme-swapped image or keep the glyph? ⑩ autoplay cadence (5s wrap).

## 7. Non-goals

Real language switching (Phase 3 i18n — the select just emits) · nano-banana
final art (§4 slots) · create loading choreography beyond setLoading (legacy
full-screen overlay not reproduced; the button morph is the loading truth) ·
avatar cropping (native picker does 960×960) · joinbot address knowledge
(C#-side constant).

## 8. Smoke assertions (scripts/smoke-test.mjs, launch block)

Carousel: 3 slides + dot nav + keyboard arrows · terms gate disables CTAs
until checked, `onAcceptTerms` fired once · create gates (empty nick · nick
with `:` · short password · mismatch · `<nick>:` hazard) block submit with
inline error · create `done()` → tail view + fields scrubbed · functional
window-`pagehide` dispatch scrubs + re-masks create fields · leak guard: the
shell's window listener SELF-CLEANS on the first `pagehide` after the element
leaves the DOM (no ghost scrubbing) · restore: submit disabled until file + password;
`fail(msg)` → inline error · retry: `fail('')` restores silently (no error
text) · tail: Later → join step; Join fires `onJoinBot` then `onFinish` ·
welcome pinned dark + `--gradient-lock`; create/restore/retry NOT pinned ·
no-logging guard on launch-shell.js · [L2] lock: window `pagehide` scrubs the
unlock field · bundle export count grows accordingly.

## 9. BE asks (ARCHITECTURE §9 queue — proposals, bridge stays frozen)

1. C#-side guard for the `create:<nick>:<password>` nick-colon/`<nick>:`
   corruption (FE gates, but the parse is fragile).
2. Backup-tail routing: "Back up now" = onboardingComplete + open Backup —
   confirm no new verb needed (reuse `ixian:backup` from Home context).
3. (carried) explicit create-failure signal instead of a silent wedge (§6②).
