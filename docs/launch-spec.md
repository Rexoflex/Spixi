# Launch/onboarding shell — welcome · create · restore · retry · onboarding tail

Phase 1 #5 (finalization-roadmap), the last Phase-1 surface. Consolidates the
five legacy pages (`intro.html` · `intro_new.html` · `intro_restore.html` ·
`intro_retry.html` · `onboarding.html`) into one `launch-shell` per
ARCHITECTURE §5 row 1. Folds in `illustrations-plan.md` (P1 assets 1–6) and
the backup onboarding tail (`backup-ux-spec.md` §3.3).

**Damir interview 2026-07-06 (this spec's #0 decisions):**
① welcome = carousel (shipped as the **4-slide legacy tour**, §2.1) ② **SUPERSEDED by the premium round (DECISIONS #165)** — the #160 brand
treatment (fixed-dark pin + bare glowing logo) now covers the **whole
shell**: ONE continuous `--gradient-launch` surface across welcome → create
→ restore → retry → tail, glass inputs, transparent topbar (originally
welcome-only) ③ tail = **backup nudge + joinbot step** (full legacy
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

### 2.1 Welcome (brand view — the shell-wide fixed-dark pin) — PREMIUM ROUND (Damir 2026-07-06)

Subtree-pinned `data-theme="dark"` over the **new `--gradient-launch`**
(aurora recipe — violet crown halo, magenta glint, sapphire + teal corners
over violet-ink; 5 dial layers in tokens.css. Damir "more premium colors").
The pin is set ONCE at the shell root and covers ALL views (§0②
superseded): form views inherit it — no per-view re-pin, glass inputs,
transparent topbar. `--gradient-lock` (lock-spec §6⑤) is CONVERGED onto this aurora recipe
at ~8–10% quieter colour layers (§6⑧ RESOLVED). Bare glowing logo (#160
grammar), full-bleed under the statusbar (#160b⑧).

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
- **Consent is NOT on welcome** (premium round — welcome stays a clean
  brand choice, no consent line or checkbox). The consent line ("By
  creating an account / By restoring your account, you agree to the [Terms
  of Use] and acknowledge the [Privacy Policy]") sits on the **create and
  restore forms, directly above the commit button**. Both links open
  **in-app** in the shared `openDocSheet` renderer (mini-markup: `# `
  heading · `- ` list item · blank line = separator · `[label](https://…)`
  link · ✕ close; textContent + https-only anchors — NEVER `innerHTML`).
  `onAcceptTerms()` → `ixian:accept` fires at the BINDING action — the
  create/restore commit (`emitAccept`, one-shot latch, armed by
  `termsRequired` / `setLaunchTerms`) — NOT on a welcome tap. The terms
  encryption clause reflects the real hybrid PQ crypto (RSA-4096 + ECDH
  secp521r1 + ML-KEM-1024/CRYSTALS-Kyber = FIPS 203 handshake;
  AES-256-GCM + ChaCha20-Poly1305 messages), per docs.ixian.io. Terms §3.3
  = minimum-age clause (16, or the higher local minimum — added 2026-07-06,
  aligned to the Privacy Policy's under-16 clause; counsel confirms final
  wording and mirrors it into the canonical legal doc).
- Version line (`setLaunchVersion`) quiet in the footer.

### 2.2 Create (form view — inherits the shell dark pin, glass inputs)

Topbar back (→ welcome + `onBack('create')`). Avatar picker: 96px c-avatar
placeholder + "Add a photo" chip → `onPickAvatar()` (`ixian:avatar`);
`setLaunchAvatar` swaps the preview. Fields: nickname (text, required) ·
password + repeat (lock `passwordField` grammar — shell-owned reveal eye,
`autocomplete="new-password"`). Inline gates in submit order: nick empty ·
nick contains `:` · password < ENC_MIN (10, §6① RESOLVED — the BE minimum;
the password-length hint is shown proactively, not only as an error) ·
repeat mismatch · password contains `<nick>:` (hazard §1). Legacy
`ixian:error` (empty-nick native alert) is superseded by the inline gate.
The form is two labelled groups (profile · password); the consent line
(§2.1) sits above the commit button; CTA = "Create my account".

Submit → `onCreateAccount(nick, pass, ctrl)`. **Indefinite loading** — wallet
generation takes seconds and legacy shows a spinner until the page is
replaced; NO auto-release (unlike unlock's 1600ms — there is no native alert
to cover a silent failure here). `ctrl.done()` → success morph + scrub (C# is
navigating to Home; in the shell, `done()` also advances to the **tail**
view). `ctrl.fail(msg)` → restore + inline error (mock/future path). Flag ②:
wedge stance if C# ever fails silently.

### 2.3 Restore (form view — inherits the shell dark pin, premium hero)

Topbar back. Premium hero illustration
(`src/demo/images/onboarding/restore.svg`, shipped legacy art) above the
form; the consent line (§2.1) sits above the commit button. File row: outline button "Choose backup file…" (`file-isr` glyph)
→ `onSelectFile()` (`ixian:selectfile`); `setLaunchFile(el, name)` renders the
picked name + check. Password field (`autocomplete="off"` — existing secret).
Gates: file picked · password non-empty. Submit → `onRestore(pass, ctrl)`;
loading until: `ctrl.fail(msg)` ← C# `showPasswordError` (+
`removeLoadingOverlay` — one-shot latch absorbs the double signal) → inline
error on the field; `ctrl.done()` → success morph + scrub (C# navigates).
Restore honesty line (backup-ux-spec §3.5 copy): "Restoring needs this file
and your password. Spixi can't recover either for you."

### 2.4 Retry (form view — inherits the shell dark pin)

Shown when the stored wallet password fails at boot. Topbar back
(`ixian:back`). Copy: "Your wallet couldn't be unlocked with the saved
password." Password field (`autocomplete="off"`) + **Proceed** (56 fill).
Wrong password = NATIVE alert + `removeLoadingOverlay` → host calls
`ctrl.fail('')` = **silent restore** (no inline dup — the alert spoke; the
unlock-screen grammar). `ctrl.done()` → success morph + scrub. C#-side
attempt counter replaces the page with LaunchPage after N failures — not FE.

### 2.5 Onboarding tail (two steps — inherits the shell dark pin)

Entered from create success (`ctrl.done()`), or directly (`view:'tail'` — the
HomePage-modal repoint). NO back (legacy `ixian:back` exists but the modal is
a forward flow; flag ③).

1. **Backup nudge** (backup-ux-spec §3.3): illustration slot `backup` (#6),
   the §7 hero copy, **Back up now** (fill 56) → `onBackupNow()` ·
   **Later** (text, quiet) → step 2. Integration note (§9): "Back up now"
   routes via onboarding-complete + the settings Backup screen — no new verb.
2. **Join the community**: illustration
   `src/demo/images/onboarding/join-community.svg` (shipped legacy art — ⚠ DELETED in Session N, 2026-09-05: N76 retired the tail and nothing loaded it,
   dark set — §6⑨ RESOLVED by the shell-wide pin), copy for the official
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

Shipped legacy art is wired as `<img>` (with `onerror` hide fallbacks,
decorative `alt=""`): carousel slides 1–4 →
`src/demo/images/onboarding/step1–4.svg` · restore hero → `restore.svg` ·
tail join step → `join-community.svg`. Final art drops in by replacing the
files under the SAME names (prompts:
`docs/onboarding-illustration-prompts.md`; PNG must stay transparent to
composit on the gradient). The ONE remaining inline placeholder is the
backup nudge (`ILLOS.backup` in launch-shell.js), marked
`data-placeholder="true"` — the smoke guard asserts EXACTLY ONE such slot,
so a real-asset swap is deliberate (update the guard when it lands).

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

① **RESOLVED: ENC_MIN=10** (the BE minimum; lock-shell's export raised
8→10 — the ONLY lock-shell change of the premium round) ② create wedge
stance — indefinite spinner if C# dies silently (add a §9 failure verb?)
③ tail has no back — OK? ④ carousel/tail copy (all strings overridable; slide
copy defaults = the legacy en-us tour text) ⑤ backup-nudge placeholder
proportions (the only placeholder left) ⑥ ThemeAppearance int mapping assumed
0/1/2 (System/Light/Dark) ⑦ i18n: Terms/Privacy/consent copy currently lives
as demo strings in `src/demo/launch.html` + component defaults — ship via the
SL channel (launch-spec §6⑦ = finalize task 2); the `openDocSheet`
mini-markup markers (`# ` · `- ` · blank line · `[label](https://…)`) must
survive translation ⑧ **RESOLVED: `--gradient-lock` converged onto the
launch aurora** (same recipe, ~8–10% quieter colour layers) ⑨ **RESOLVED
by the shell-wide dark pin**: tail is pinned dark; the legacy art is wired
as `src/demo/images/onboarding/join-community.svg` (dark set) ⑩ autoplay
cadence (5s wrap).

## 7. Non-goals

Real language switching (Phase 3 i18n — the select just emits) · nano-banana
final art (§4 slots) · create loading choreography beyond setLoading (legacy
full-screen overlay not reproduced; the button morph is the loading truth) ·
avatar cropping (native picker does 960×960) · joinbot address knowledge
(C#-side constant).

## 8. Smoke assertions (scripts/smoke-test.mjs, launch block)

Carousel: 4 slides (shipped legacy step1–4 art) + dot nav + keyboard
arrows · welcome carries NO consent line or checkbox · consent line on the
create/restore forms directly above the commit button (Terms + Privacy
links open the in-app `openDocSheet` sheet) · `ixian:accept` fires ONCE at
the create/restore commit (latched) · create gates (empty nick · nick
with `:` · short password · mismatch · `<nick>:` hazard) block submit with
inline error · create `done()` → tail view + fields scrubbed · functional
window-`pagehide` dispatch scrubs + re-masks create fields · leak guard: the
shell's window listener SELF-CLEANS on the first `pagehide` after the element
leaves the DOM (no ghost scrubbing) · restore: submit disabled until file + password;
`fail(msg)` → inline error · retry: `fail('')` restores silently (no error
text) · tail: Later → join step; Join fires `onJoinBot` then `onFinish` ·
the WHOLE shell pinned dark on ONE continuous `--gradient-launch` (form
views inherit the pin, none re-pin) · exactly ONE
`data-placeholder="true"` illo slot (the backup nudge) ·
no-logging guard on launch-shell.js · [L2] lock: window `pagehide` scrubs the
unlock field · bundle export count grows accordingly.

## 9. BE asks (ARCHITECTURE §9 queue — proposals, bridge stays frozen)

1. C#-side guard for the `create:<nick>:<password>` nick-colon/`<nick>:`
   corruption (FE gates, but the parse is fragile).
2. Backup-tail routing: "Back up now" = onboardingComplete + open Backup —
   confirm no new verb needed (reuse `ixian:backup` from Home context).
3. (carried) explicit create-failure signal instead of a silent wedge (§6②).
