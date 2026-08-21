/**
 * lock-page.js — real-bridge adapters for the Lock shell (Phase 3 item 2).
 * Grammar (bridge-audit-A.md §11, bridge-audit-B.md §3 — FROZEN):
 *   lock.html      → ixian:unlock:<password> (raw, colons pass through — C#
 *                    Splits on the prefix) · ixian:change (confirm mode =
 *                    cancel/authSucceeded(false); lock mode = push LaunchPage)
 *                    · ixian:onload re-emit = biometric retry (LockPage.onLoad
 *                    relaunches Plugin.Fingerprint — §9 flag stands).
 *                    C#→JS: setJustConfirm("True") only.
 *   settings_encryption.html → ixian:changepass:<DELIM><old><DELIM><new> —
 *                    LEADING delimiter (settings_encryption.html:110; C# takes
 *                    split[1]/split[2], EncryptionPassword.xaml.cs:55). The
 *                    condensed ARCHITECTURE §3 line omits the leading DELIM —
 *                    audit-B + legacy source are the truth.
 *
 * No-callback mirrors (spec §5): C# answers wrong passwords with NATIVE alerts
 * only. The lock shell auto-releases itself (spec §3, 1600 ms). The encpass
 * screen has no component-side release, so THIS adapter supplies one: after
 * 1600 ms with no page-pop, ctrl.fail() restores the form with the inline
 * wrong-current copy — matching the alert C# just showed; on success C# popped
 * the page and nothing here matters. Future §9 `unlockFailed`/`changePassFailed`
 * pushes are pre-wired as exposed globals (inert until BE ships them).
 *
 * SPIXI_ENV.biometrics — generation-time env flag (one addCustomString in the
 * repoint PR); absent = false = button hidden (#115 graceful default).
 */
import { createLockScreen, createEncPassScreen, setLockMode, ENC_DELIM } from '../components/lock-shell.js';
import { createNativeBridge } from './native.js';

const RELEASE_MS = 1600;                         // lock-spec §3 window, mirrored for encpass

export function mountLockPage({ host, bridge, strings, mode, biometrics } = {}) {
  const br = bridge || createNativeBridge();
  const sl = strings || (typeof window !== 'undefined' && window.SL) || {};
  const bio = biometrics !== undefined
    ? !!biometrics
    : !!(typeof window !== 'undefined' && window.SPIXI_ENV && window.SPIXI_ENV.biometrics);
  let unlockCtrl = null;                         // latest in-flight ctrl (§9 unlockFailed pre-wire)

  const el = createLockScreen({
    mode: mode || 'unlock',
    biometrics: bio,
    strings: sl,
    onUnlock(password, ctrl) {
      unlockCtrl = ctrl;
      br.send('ixian:unlock:' + password);       // raw — C# Splits on the prefix, verifyWallet decides
      // no ctrl.done(): wrong password = native alert only; the shell's own
      // 1600 ms auto-release restores the form (value kept). Success = C#
      // replaces the page mid-latch — exactly the legacy feel.
    },
    onBiometricRetry() {
      br.send('ixian:onload');                   // deliberate re-emit (bypasses ready-latch by design)
    },
    onUseAnotherWallet() { br.send('ixian:change'); },  // lock mode → LaunchPage
    onCancel() { br.send('ixian:change'); },            // confirm mode → authSucceeded(false)
  });

  br.exposeAll({
    // C# onload push (confirm mode): setJustConfirm("True")
    setJustConfirm(v) { setLockMode(el, String(v).toLowerCase() === 'true' ? 'confirm' : 'unlock'); },
    /* ★ #234: setAppLock("True") — the APP LOCK. Pushed AFTER setJustConfirm, because
       App's resume/pause lock is a justConfirm page (it pops a modal rather than
       rewriting the navigation stack) and would otherwise render Cancel, which unlocked
       the app without the password. Neither exit is offered in this mode. */
    setAppLock(v) { if (String(v).toLowerCase() === 'true') setLockMode(el, 'locked'); },
    // §9 pre-wire — inert until BE ships an explicit wrong-password push
    unlockFailed(msg) { if (unlockCtrl) unlockCtrl.fail(msg); },
  });

  (host || document.body).append(el);
  br.ready();
  return { el, bridge: br };
}

export function mountEncPassPage({ host, bridge, strings } = {}) {
  const br = bridge || createNativeBridge();
  const sl = strings || (typeof window !== 'undefined' && window.SL) || {};
  let passCtrl = null;

  const el = createEncPassScreen({
    strings: sl,
    onChangePassword(oldPass, newPass, ctrl) {
      passCtrl = ctrl;
      // LEADING delimiter — split[1]=old, split[2]=new (see docblock)
      br.send('ixian:changepass:' + ENC_DELIM + oldPass + ENC_DELIM + newPass);
      // encpass no-callback mirror: C# alerts + pops on success, alerts and
      // stays on a wrong current password — release the form to match.
      setTimeout(() => { if (passCtrl === ctrl) { passCtrl = null; ctrl.fail(); } }, RELEASE_MS);
    },
    onBack() { br.send('ixian:back'); },         // C# popPageAsync()
  });

  br.exposeAll({
    // §9 pre-wire — explicit failure push would beat the timer when it lands
    changePassFailed(msg) { if (passCtrl) { const c = passCtrl; passCtrl = null; c.fail(msg); } },
  });

  (host || document.body).append(el);
  br.ready();
  return { el, bridge: br };
}
