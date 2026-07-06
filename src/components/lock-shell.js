/**
 * lock-shell — unlock · confirm-action · change-encryption-password
 * (docs/lock-spec.md, Phase 1 #4). Bridge grammar (bridge-audit-A.md §11,
 * bridge-audit-B.md §3 — FROZEN): ixian:unlock:<password> · ixian:change ·
 * ixian:onload re-emit (biometric retry, Damir pick) · ixian:changepass with
 * the magic delimiter. Set-lock is ABSORBED by the settings hub switch.
 *
 * SECURITY.md: passwords live ONLY in field values, transiently — scrubbed on
 * back/success/pagehide/escape-hatch; no logging, no storage, no DOM echo.
 * Shells emit intent; WalletStorage.verifyWallet / LockPage stay the C#
 * boundary. NO logging of any kind in this file (smoke-guarded).
 *
 * createLockScreen({ mode = 'unlock', biometrics = false, onUnlock,
 *                    onBiometricRetry, onUseAnotherWallet, onCancel, strings })
 *   onUnlock(password, ctrl) — NO-CALLBACK CONTRACT (spec §3): C# answers a
 *     WRONG password with a NATIVE alert only. ctrl.done() = keep latched +
 *     "Unlocked" morph (C# is replacing the page) · ctrl.fail(msg) = inline
 *     error (mock / future §9 unlockFailed) · NEITHER within 1600ms =
 *     silent auto-release (value kept — the native alert already spoke).
 *   onBiometricRetry() — re-emit ixian:onload (LockPage.onLoad relaunches
 *     Plugin.Fingerprint); button hidden unless biometrics (WinUI hosts: false).
 *   onUseAnotherWallet() — AFTER the confirm modal → ixian:change (lock mode:
 *     C# pushes LaunchPage). Unlock mode only.
 *   onCancel() — confirm mode Cancel → ixian:change (authSucceeded(false)).
 *   Free fn: setLockMode(el, 'unlock'|'confirm')  (setJustConfirm mirror).
 *
 * createEncPassScreen({ onChangePassword, onBack, strings, host })
 *   onChangePassword(oldPass, newPass, ctrl) — shell emits ixian:changepass
 *     (delimiter-joined C#-side). ctrl.fail(msg) → inline error on the CURRENT
 *     field (legacy invalid-current path) · ctrl.done() → success morph →
 *     scrub → onBack(). Inline gates in submit() — see ENC_DELIM hazard.
 */
import { icon } from './icons.js';
import { createTopbar } from './topbar.js';
import { createButton, setLoading, setSuccess } from './button.js';
import { createModal, openModal } from './modal.js';

const lockState = new WeakMap(); // el → { mode, inFlight, els, opts }

// C# splits the changepass URL on this literal (bridge-audit-B.md:128) — a
// password CONTAINING it would shift the split slots. Gated here; §9 ask: C#
// must guard too.
const ENC_DELIM = '--1ec4ce59e0535704d4--';
export const ENC_MIN = 10;         // §6① resolved (Damir 2026-07-06): matches the BE wallet-password minimum. SHARED with launch-shell (one truth)
const UNLOCK_RELEASE_MS = 1600;    // spec §3 auto-release window (flag ③)

function lockCtrl(onDone, onFail) {              // one-shot (settingsCtrl grammar)
  let used = false;
  return {
    done: (payload) => { if (used) return; used = true; onDone(payload); },
    fail: (msg) => { if (used) return; used = true; onFail(msg); },
  };
}

/**
 * Password field with OUR show-password eye (#160b⑦, Damir): the #152① native
 * `::-ms-reveal` is WebView2-only — Android/iOS WebKit have none, so the
 * shell owns the toggle (native eye suppressed in CSS to avoid a double eye).
 * mask() re-masks (scrub paths — never leave a revealed field behind).
 * EXPORTED: launch-shell reuses the exact grammar (launch-spec §2.2–2.4).
 */
export function passwordField({ label, current = false, strings = {} }) {
  const wrap = document.createElement('div');
  wrap.className = 'c-lock__field';
  const input = document.createElement('input');
  input.type = 'password';
  input.className = 'c-lock__input';
  // SECURITY §5: current = off (never offer to save the wallet password);
  // new fields = new-password (managers must not autofill the OLD one).
  // ⚠ spec §6 flag ②: Damir may prefer manager-friendly settings.
  input.autocomplete = current ? 'off' : 'new-password';
  input.spellcheck = false;
  input.placeholder = label;
  input.setAttribute('aria-label', label);

  const reveal = document.createElement('button');
  reveal.type = 'button';
  reveal.className = 'c-lock__reveal';
  reveal.setAttribute('aria-pressed', 'false');
  reveal.setAttribute('aria-label', strings.showPassword || 'Show password');
  reveal.append(icon('eye', { size: 20 }));
  const setGlyph = (shown) => {
    reveal.textContent = '';
    reveal.append(icon(shown ? 'eye-off' : 'eye', { size: 20 }));
  };
  reveal.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    reveal.setAttribute('aria-pressed', String(show));
    reveal.setAttribute('aria-label', show
      ? (strings.hidePassword || 'Hide password')
      : (strings.showPassword || 'Show password'));
    setGlyph(show);
    input.focus();
  });
  const mask = () => {
    if (input.type === 'password') return;
    input.type = 'password';
    reveal.setAttribute('aria-pressed', 'false');
    reveal.setAttribute('aria-label', strings.showPassword || 'Show password');
    setGlyph(false);
  };
  wrap.append(input, reveal);
  return { wrap, input, mask };
}

function lockSync(st) {
  const { title, copy, hatch, cancel } = st.els;
  const { strings } = st.opts;
  const confirm = st.mode === 'confirm';
  st.els.root.dataset.mode = st.mode;
  // #160 (Damir): the whole APP is locked, not just the wallet — never
  // "Wallet locked"; the body copy keeps "wallet password" (that IS the secret)
  title.textContent = confirm
    ? (strings.confirmTitle || 'Confirm it’s you')
    : (strings.lockTitle || 'Spixi is locked');
  copy.textContent = confirm
    ? (strings.confirmCopy || 'Enter your wallet password to continue.')
    : (strings.lockCopy || 'Enter your wallet password to unlock.');
  hatch.hidden = confirm;                        // escape hatch = unlock mode only
  cancel.hidden = !confirm;                      // Cancel = confirm mode only
}

export function createLockScreen({
  mode = 'unlock', biometrics = false, onUnlock, onBiometricRetry,
  onUseAnotherWallet, onCancel, strings = {},
} = {}) {
  const el = document.createElement('section');
  el.className = 'c-lock';                       // NO topbar — there is no back from lock
  // #160 (Damir): fixed-dark brand surface — pin the SUBTREE to dark tokens
  // ([data-theme] is an unscoped attribute selector, tokens.css:497; the #20
  // contextual-override precedent, zero token duplication). --gradient-lock
  // never flips, so both themes render the same brand moment.
  el.dataset.theme = 'dark';

  // #160b zones (Damir): brand centers in the UPPER share; the action cluster
  // lands in the lower half ("middle / lower-middle of the lower half");
  // hatch/cancel become a quiet footer. Ratios live in lock-shell.css.
  const brand = document.createElement('div');
  brand.className = 'c-lock__brand';

  const logo = document.createElement('span');
  logo.className = 'c-lock__logo';               // #160: bare glyph, no disc (Damir)
  logo.setAttribute('aria-hidden', 'true');
  logo.append(icon('logo', { size: 56 }));
  brand.append(logo);

  const title = document.createElement('h1');
  title.className = 'c-lock__title';
  const copy = document.createElement('p');
  copy.className = 'c-lock__copy';
  brand.append(title, copy);

  const form = document.createElement('div');
  form.className = 'c-lock__form';

  const pwField = passwordField({ label: strings.walletPassword || 'Wallet password', current: true, strings });
  const input = pwField.input;
  form.append(pwField.wrap);

  // SECURITY §5 widened per Damir 2026-07-06 (#162 backlog [L2], launch-spec
  // #0④): a backgrounded unlock screen scrubs too — window-level pagehide
  // (element-level never fires, the #162 audit class). The lock screen has no
  // unmount hook (it IS the page), so the listener self-cleans on the first
  // pagehide after the element leaves the DOM (demo/jsdom re-creation guard).
  const onPageHide = () => {
    if (!el.isConnected) { window.removeEventListener('pagehide', onPageHide); return; }
    input.value = '';
    pwField.mask();
  };
  window.addEventListener('pagehide', onPageHide);

  const err = document.createElement('p');
  err.className = 'c-lock__error';
  err.setAttribute('role', 'alert');
  err.hidden = true;
  form.append(err);

  const unlockBtn = createButton({ label: strings.unlock || 'Unlock', size: 56, width: 'full' });
  form.append(unlockBtn);

  let bio = null;
  if (biometrics && onBiometricRetry) {          // WinUI hosts pass biometrics:false
    bio = createButton({
      label: strings.bioRetry || 'Try fingerprint again',
      type: 'outline', size: 56, width: 'full',   // #160: equal-size button family
    });
    bio.addEventListener('click', () => {
      // re-emit ixian:onload — LockPage.onLoad relaunches AuthenticateAsync
      // (Damir pick; §9 flag: BE blesses the reuse or ships ixian:bioretry)
      try { onBiometricRetry(); } catch { /* nav-style fire-and-forget (#141-m4 scope: no latch to wedge) */ }
    });
    form.append(bio);
  }

  const tail = document.createElement('div');
  tail.className = 'c-lock__tail';

  // unlock mode: quiet escape hatch (Damir pick: link + confirm modal;
  // C# LaunchPage stays the real boundary — the FE modal is deliberateness #146③)
  const hatch = document.createElement('button');
  hatch.type = 'button';
  hatch.className = 'c-lock__hatch';
  hatch.textContent = strings.otherWallet || 'Use a different wallet…';
  hatch.addEventListener('click', () => {
    openModal(createModal({                      // #160b: createModal doesn't self-mount
      title: strings.otherWalletTitle || 'Use a different wallet?',
      body: strings.otherWalletBody
        || 'You’ll leave this screen and go to setup to create or restore another wallet. Your current wallet stays encrypted on this device.',
      role: 'alertdialog',
      host: el.closest('.demo-phone') || undefined,
      actions: [
        { label: strings.cancel || 'Cancel', type: 'text', autofocus: true },
        {
          label: strings.otherWalletCta || 'Go to setup', type: 'fill', intent: 'destructive',
          onClick: () => {
            input.value = '';                    // SECURITY §5: scrub before leaving
            pwField.mask();
            try { if (onUseAnotherWallet) onUseAnotherWallet(); } catch { /* nav — nothing to wedge */ }
          },
        },
      ],
    }));
  });
  tail.append(hatch);

  // confirm mode: Cancel → ixian:change (authSucceeded(false) + pop)
  const cancel = createButton({ label: strings.cancel || 'Cancel', type: 'text', size: 56, width: 'full' }); // #160 family
  cancel.addEventListener('click', () => {
    input.value = '';                            // SECURITY §5: scrub on cancel
    pwField.mask();
    try { if (onCancel) onCancel(); } catch { /* nav — nothing to wedge */ }
  });
  tail.append(cancel);

  const spacer = document.createElement('div');
  spacer.className = 'c-lock__spacer';
  spacer.setAttribute('aria-hidden', 'true');

  el.append(brand, form, spacer, tail);

  const st = {
    mode: mode === 'confirm' ? 'confirm' : 'unlock',
    inFlight: false,
    opts: { onUnlock, strings },
    els: { root: el, title, copy, hatch, cancel, input, err, unlockBtn },
  };
  lockState.set(el, st);

  const setError = (msg) => { err.textContent = msg; err.hidden = !msg; };

  const submit = () => {
    if (st.inFlight) return;
    const pass = input.value;                    // NOT trimmed — passwords may edge-space
    if (!pass) {
      setError(strings.passwordEmpty || 'Enter your wallet password.');
      input.focus();
      return;
    }
    setError('');
    st.inFlight = true;
    input.disabled = true;
    if (bio) bio.disabled = true;
    setLoading(unlockBtn, true);
    let settled = false;
    const restore = () => {
      st.inFlight = false;
      input.disabled = false;
      if (bio) bio.disabled = false;
      setLoading(unlockBtn, false);
    };
    // spec §3: NO wrong-password callback exists — auto-release silently if
    // neither ctrl lands (the native alert has already told the user; value kept)
    const release = setTimeout(() => { if (!settled) { settled = true; restore(); } }, UNLOCK_RELEASE_MS);
    const ctrl = lockCtrl(
      () => {                                    // success: C# is replacing the page
        if (settled) return;
        settled = true;
        clearTimeout(release);
        st.inFlight = false;                     // morph owns the button; field stays disabled
        setLoading(unlockBtn, false);
        setSuccess(unlockBtn, { label: strings.unlocked || 'Unlocked' });
        input.value = '';                        // SECURITY §5: scrub — the page is going away
        pwField.mask();
      },
      (msg) => {                                 // mock now; §9 unlockFailed later
        if (settled) return;
        settled = true;
        clearTimeout(release);
        restore();
        setError(msg || strings.unlockFailed || 'That password didn’t unlock the wallet.');
        input.focus();
      },
    );
    try {
      if (onUnlock) onUnlock(pass, ctrl);
    } catch { ctrl.fail(); }                     // #141-m4
  };
  unlockBtn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  input.addEventListener('input', () => setError(''));

  lockSync(st);
  return el;
}

/** setJustConfirm("True") mirror — flips title/copy/hatch/cancel. */
export function setLockMode(el, mode) {
  const st = lockState.get(el);
  if (!st || (mode !== 'unlock' && mode !== 'confirm') || st.mode === mode) return;
  st.mode = mode;
  lockSync(st);
}

/* ————————————————— change encryption password ————————————————— */

export function createEncPassScreen({
  onChangePassword, onBack, strings = {}, host,
} = {}) {
  const el = document.createElement('section');
  el.className = 'c-encpass';

  const scrub = () => {                          // values AND reveal state (§5)
    cur.value = ''; next.value = ''; repeat.value = '';
    curF.mask(); nextF.mask(); repF.mask();
  };

  // SECURITY 5: scrub on a backgrounded WebView. pagehide is a WINDOW event, so
  // an element-level listener never fires; bind the window and tear it down on
  // either leave path so abandoned screens do not accumulate listeners.
  const onPageHide = () => scrub();
  window.addEventListener('pagehide', onPageHide);
  const teardown = () => window.removeEventListener('pagehide', onPageHide);

  el.append(createTopbar({
    variant: 'view',
    title: strings.changePassword || 'Change wallet password',
    onBack: () => { scrub(); teardown(); if (onBack) onBack(); },
    backLabel: strings.back || 'Back',
  }));

  const body = document.createElement('div');
  body.className = 'c-encpass__body u-scroll';

  const note = document.createElement('p');
  note.className = 'c-encpass__note';
  note.textContent = strings.encpassNote
    || 'This is the password that encrypts your wallet on this device. Spixi can’t recover it for you.';
  body.append(note);

  const card = document.createElement('div');
  card.className = 'c-encpass__card';
  const curF = passwordField({ label: strings.currentPassword || 'Current password', current: true, strings });
  const nextF = passwordField({ label: strings.newPassword || 'New password', strings });
  const repF = passwordField({ label: strings.encpassRepeat || 'Repeat new password', strings });
  const cur = curF.input, next = nextF.input, repeat = repF.input;
  card.append(curF.wrap, nextF.wrap, repF.wrap);

  const err = document.createElement('p');
  err.className = 'c-lock__error';
  err.setAttribute('role', 'alert');
  err.hidden = true;
  card.append(err);
  body.append(card);
  el.append(body);

  const footer = document.createElement('div');
  footer.className = 'c-encpass__footer';
  const saveBtn = createButton({ label: strings.changeCta || 'Change password', size: 56, width: 'full' });
  footer.append(saveBtn);
  el.append(footer);

  const setError = (msg, focusEl) => {
    err.textContent = msg;
    err.hidden = !msg;
    if (msg && focusEl) focusEl.focus();
  };

  let inFlight = false;
  const submit = () => {
    if (inFlight) return;
    const o = cur.value, n = next.value, r = repeat.value;
    if (!o) return setError(strings.currentEmpty || 'Enter your current password.', cur);
    if (!n) return setError(strings.newEmpty || 'Enter a new password.', next);
    if (n.length < ENC_MIN) {                    // ⚠ spec §6 flag ①
      return setError((strings.encpassTooShort || 'The new password needs at least {n} characters.').replace('{n}', String(ENC_MIN)), next);
    }
    if (n !== r) return setError(strings.encpassMismatch || 'The new passwords don’t match.', repeat);
    if (n === o) return setError(strings.sameAsOld || 'The new password matches the current one.', next);
    if (o.includes(ENC_DELIM) || n.includes(ENC_DELIM)) {
      // C# Split hazard (spec §2) — never sent; §9 ask logged for a C#-side guard
      return setError(strings.badPassword || 'That password contains an unsupported character sequence.', next);
    }
    setError('');
    inFlight = true;
    cur.disabled = true; next.disabled = true; repeat.disabled = true;
    setLoading(saveBtn, true);
    const restore = () => {
      inFlight = false;
      cur.disabled = false; next.disabled = false; repeat.disabled = false;
      setLoading(saveBtn, false);
    };
    const ctrl = lockCtrl(
      () => {
        restore();
        scrub();                                 // SECURITY §5: scrub on success
        setSuccess(saveBtn, { label: strings.passwordChanged || 'Password changed' });
        setTimeout(() => { teardown(); if (onBack) onBack(); }, 900); // legacy pops after its success alert
      },
      (msg) => {
        restore();
        setError(msg || strings.wrongCurrent || 'That current password isn’t right.', cur);
      },
    );
    try {
      if (onChangePassword) onChangePassword(o, n, ctrl); else ctrl.done();
    } catch { ctrl.fail(); }                     // #141-m4
  };
  saveBtn.addEventListener('click', submit);
  repeat.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  cur.addEventListener('input', () => setError(''));
  next.addEventListener('input', () => setError(''));
  repeat.addEventListener('input', () => setError(''));

  return el;
}
