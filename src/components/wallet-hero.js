/**
 * c-wallet-hero — the Wallet home hero (spec docs/wallet-shell-spec.md §2, #133/#134).
 * Hero-region pattern (#20: `surface/hero` + on-hero inks, gradient overlay), screen
 * title at heading-sm (#58), balance in tabular numerals (#21) with the unit inline,
 * an optional fiat line (renders ONLY when the bridge provides one — balance-level
 * fiat source is a §9 question; Damir's app-frame reference shows it, so the demo
 * seeds it), a hide-balance eye toggle, and the three quick actions from the reference:
 * Send (primary) · Receive · Scan.
 *
 * Balance/fiat arrive PRE-FORMATTED strings from the bridge (#55/#77) — component dumb.
 * Hidden state masks amount + fiat with bullets; the real strings live only in the
 * WeakMap (no DOM/aria leak). Eye = aria-pressed toggle with a CONSTANT label
 * ("Hide balance" — APG: pressed carries the state, the label must not flip); the
 * glyph is state-vocabulary per member-sheet: eye = visible, eye-off = hidden.
 *
 * The hero owns the top safe-area inset (`env(safe-area-inset-top)`) so the status-bar
 * region paints hero-colored with NO seam — the #22 watch-item surface.
 *
 * createWalletHero({ title, balance, unit, fiat, hidden, strings,
 *                    onSend, onReceive, onScan, onToggleHidden }) → header
 * Free fns (#44): setWalletBalance(el, { balance, fiat }) — bridge balance tick;
 *                 setBalanceHidden(el, hidden) — eye state (shell owns persistence, §7).
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';

const MASK = '••••••';
const store = new WeakMap();   // el → { balance, fiat, hidden, strings }

function renderAmounts(el) {
  const s = store.get(el);
  if (!s) return;
  const amount = el.querySelector('.c-wallet-hero__amountvalue');
  const fiat = el.querySelector('.c-wallet-hero__fiat');
  const compact = el.querySelector('.c-wallet-hero__compactbal');
  if (amount) amount.textContent = s.hidden ? MASK : (s.balance || '');
  if (compact) compact.textContent = s.hidden ? MASK : (s.balance || '');
  if (fiat) {
    fiat.textContent = s.hidden ? '••••' : (s.fiat || '');
    fiat.hidden = !s.fiat;
  }
  const eye = el.querySelector('.c-wallet-hero__eye');
  if (eye) {
    eye.setAttribute('aria-pressed', String(!!s.hidden));   // label stays constant (APG)
    eye.textContent = '';
    eye.append(icon(s.hidden ? 'eye-off' : 'eye', { size: 22 }));   // glyph = state (member-sheet vocabulary)
  }
}

function quickAction({ glyph, label, onClick }) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'c-wallet-hero__qa';
  const circle = document.createElement('span');
  circle.className = 'c-wallet-hero__qacircle';
  circle.append(icon(glyph, { size: 24 }));
  b.append(circle, document.createTextNode(label));
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

export function createWalletHero({
  title = 'Wallet', balance = '', unit = 'IXI', fiat = '', hidden = false,
  strings = getStrings(), onSend, onReceive, onScan, onToggleHidden,
} = {}) {
  const el = document.createElement('header');
  el.className = 'c-wallet-hero';

  const trow = document.createElement('div');
  trow.className = 'c-wallet-hero__titlerow';
  const t = document.createElement('h1');
  t.className = 'c-wallet-hero__title';
  t.textContent = strings.walletTitle || title;
  trow.append(t);
  // compact balance — visible only while the hero is minimized on scroll (#134 scroll UX)
  const toggleHidden = () => {
    const s = store.get(el);
    s.hidden = !s.hidden;
    renderAmounts(el);
    if (onToggleHidden) onToggleHidden(s.hidden);   // shell persistence stays in sync (audit M4)
  };
  const cb = document.createElement('span');
  cb.className = 'c-wallet-hero__compactbal u-tabular';
  cb.setAttribute('aria-hidden', 'true');   // the full balance block stays the AT source
  // minimized hero: tapping the compact balance toggles hide too (Damir #135; pointer
  // convenience — the balance-block/eye path returns when the hero expands)
  cb.addEventListener('click', toggleHidden);
  trow.append(cb);
  el.append(trow);

  const bal = document.createElement('div');
  bal.className = 'c-wallet-hero__balance';
  const label = document.createElement('div');
  label.className = 'c-wallet-hero__label';
  label.textContent = strings.availableBalance || 'Available Balance';
  bal.append(label);

  const row = document.createElement('div');
  row.className = 'c-wallet-hero__amountrow';
  const amount = document.createElement('div');
  amount.className = 'c-wallet-hero__amount u-tabular';
  const value = document.createElement('span');
  value.className = 'c-wallet-hero__amountvalue';
  const u = document.createElement('span');
  u.className = 'c-wallet-hero__unit';
  u.textContent = unit;
  amount.append(value, u);                               // gap via CSS margin — no stray text node
  const eye = document.createElement('button');
  eye.type = 'button';
  eye.className = 'c-wallet-hero__eye';
  eye.setAttribute('aria-label', strings.hideBalance || 'Hide balance');   // constant (APG toggle)
  eye.addEventListener('click', (e) => {
    // stopPropagation is LOAD-BEARING (Damir #136: center-taps "did nothing"): the toggle
    // re-render DETACHES the tapped svg, so the balance-block guard's closest() failed on
    // the orphaned target and the bubbled click toggled BACK (double-toggle = net zero)
    e.stopPropagation();
    toggleHidden();
  });
  // pointer convenience (Damir #135): tapping ANYWHERE on the balance block toggles too —
  // the eye stays the accessible control (keyboard/SR path)
  bal.addEventListener('click', toggleHidden);
  row.append(amount, eye);
  bal.append(row);

  const f = document.createElement('div');
  f.className = 'c-wallet-hero__fiat u-tabular';
  bal.append(f);
  el.append(bal);

  const actions = document.createElement('div');
  actions.className = 'c-wallet-hero__actions';
  actions.append(
    // all three identical — the special filled Send circle "felt weird" (Damir #135)
    quickAction({ glyph: 'arrow-up-right', label: strings.send || 'Send', onClick: onSend }),
    quickAction({ glyph: 'arrow-down-left', label: strings.receive || 'Receive', onClick: onReceive }),
    quickAction({ glyph: 'scan', label: strings.scan || 'Scan', onClick: onScan }),
  );
  el.append(actions);

  store.set(el, { balance, fiat, hidden: !!hidden, strings });
  renderAmounts(el);
  return el;
}

/** Bridge balance tick (#44). Pass pre-formatted strings; fiat '' hides the line. */
export function setWalletBalance(el, { balance, fiat } = {}) {
  const s = store.get(el);
  if (!s) return el;
  if (balance != null) s.balance = balance;
  if (fiat != null) s.fiat = fiat;
  renderAmounts(el);
  return el;
}

/** Set the hidden state explicitly (shell restores its in-memory preference, §7). */
export function setBalanceHidden(el, hidden) {
  const s = store.get(el);
  if (!s) return el;
  s.hidden = !!hidden;
  renderAmounts(el);
  return el;
}

/** Minimize/restore the hero (scroll UX, #134): balance block + quick actions collapse,
 *  the title row gains a compact balance. Pure state toggle — the scroll wiring lives
 *  in wallet-shell's attachWalletScroll. */
export function setWalletHeroCompact(el, compact) {
  if (!el) return el;
  if (compact) el.dataset.compact = ''; else delete el.dataset.compact;
  // collapsed zones leave the a11y tree + tab order (#113 inert pattern + fallback for
  // pre-inert WebViews — conservative baseline #4)
  for (const zone of el.querySelectorAll('.c-wallet-hero__balance, .c-wallet-hero__actions')) {
    if (compact) {
      zone.setAttribute('aria-hidden', 'true');
      if ('inert' in zone) zone.inert = true;
      for (const b of zone.querySelectorAll('button')) b.tabIndex = -1;
    } else {
      zone.removeAttribute('aria-hidden');
      if ('inert' in zone) zone.inert = false;
      for (const b of zone.querySelectorAll('button')) b.removeAttribute('tabindex');
    }
  }
  return el;
}
