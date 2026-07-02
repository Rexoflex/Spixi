/**
 * c-button — mirrors Figma button/{32,44,56}/{default,destructive}.
 * Conventions: DECISIONS.md #16 · state layers #28 · success pattern #29 · icon API #30.
 *
 * createButton({
 *   label: string,                     // omit for icon-only (ariaLabel required)
 *   type: 'fill' | 'tonal' | 'outline' | 'text' = 'fill',
 *   size: 32 | 44 | 56 = 44,
 *   intent: 'default' | 'destructive' = 'default',
 *   width: 'hug' | 'full' = 'hug',
 *   icon: SVGElement | null,
 *   iconPosition: 'leading' | 'trailing' = 'leading',
 *   ariaLabel: string,                 // required when no label (icon-only)
 *   loading: boolean = false,
 *   disabled: boolean = false,
 *   onClick: (event) => void
 * })
 */
export function createButton({
  label,
  type = 'fill',
  size = 44,
  intent = 'default',
  width = 'hug',
  icon = null,
  iconPosition = 'leading',
  ariaLabel,
  loading = false,
  disabled = false,
  onClick,
} = {}) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'c-button';
  el.dataset.type = type;
  el.dataset.size = String(size);
  el.dataset.intent = intent;
  el.dataset.width = width;

  const hasLabel = label != null && label !== '';
  if (!hasLabel) {
    el.dataset.iconOnly = '';
    if (ariaLabel) el.setAttribute('aria-label', ariaLabel);
    // no label + no ariaLabel is an accessibility bug — make it loud in dev
    else console.warn('c-button: icon-only button requires ariaLabel');
  }

  if (icon) icon.classList.add('c-button__icon');
  if (icon && iconPosition === 'leading') el.append(icon);

  if (hasLabel) {
    const text = document.createElement('span');
    text.className = 'c-button__label';
    text.textContent = label;
    el.append(text);
  }

  if (icon && iconPosition === 'trailing') el.append(icon);

  if (onClick) el.addEventListener('click', onClick);

  // disabled BEFORE setLoading — loading remembers/restores the caller's state
  el.disabled = disabled;
  setLoading(el, loading);
  return el;
}

/**
 * Run a content mutation with an animated width morph (hug buttons only).
 * Measures old/new natural widths synchronously (no flicker), transitions
 * between them (CSS only transitions width while [data-morphing] is set),
 * then releases back to hug on transitionend (timeout fallback covers
 * reduced-motion / zero-duration, where transitionend never fires).
 */
const pendingMorph = new WeakMap(); // el → cancel fn for an in-flight release

function morphWidth(el, mutate) {
  if (el.dataset.width === 'full' || !el.isConnected) { mutate(); return; }
  const cancelPrev = pendingMorph.get(el);
  if (cancelPrev) cancelPrev(); // re-morph mid-flight: keep current width, retarget
  const w0 = el.offsetWidth;
  mutate();
  el.style.width = 'auto';
  const w1 = el.offsetWidth;
  el.style.width = w0 + 'px';
  el.dataset.morphing = '';
  void el.offsetWidth; // reflow so the transition has a start value
  el.style.width = w1 + 'px';

  let fallback;
  const cancel = () => {
    clearTimeout(fallback);
    el.removeEventListener('transitionend', onEnd);
    pendingMorph.delete(el);
  };
  const release = () => {
    cancel();
    el.style.width = '';
    delete el.dataset.morphing;
  };
  const onEnd = (e) => {
    if (e.target === el && e.propertyName === 'width') release();
  };
  el.addEventListener('transitionend', onEnd);
  // fallback must exceed --duration-200 (also covers reduced-motion 0ms, where
  // transitionend never fires); bump if the width-morph token is ever raised
  fallback = setTimeout(release, 400);
  pendingMorph.set(el, cancel);
}

/** Toggle loading state (spinner + aria-busy). Works for any type/intent. */
export function setLoading(el, loading) {
  morphWidth(el, () => {
    const existing = el.querySelector('.c-button__spinner');
    if (loading) {
      if (!existing) {
        const spinner = document.createElement('span');
        spinner.className = 'c-button__spinner';
        spinner.setAttribute('aria-hidden', 'true');
        el.prepend(spinner);
      }
      el.dataset.loading = '';
      el.setAttribute('aria-busy', 'true');
      // audit r2: loading ≠ inert — [data-loading] kills pointer-events but
      // KEYBOARD activation still fired onClick (double-payment hazard on a
      // processing Pay). Track whether WE disabled it so unload restores the
      // caller's own disabled state. CSS keeps the loading skin (not disabled).
      if (!el.disabled) { el.dataset.loadingDisabled = ''; el.disabled = true; }
    } else {
      existing?.remove();
      delete el.dataset.loading;
      el.removeAttribute('aria-busy');
      if (el.dataset.loadingDisabled !== undefined) {
        delete el.dataset.loadingDisabled;
        el.disabled = false;
      }
    }
  });
}

const CHECK_PATH = 'M5 12l5 5L20 7'; // tabler check

/**
 * Transient success morph (DECISIONS.md #29): loading off → solid success surface
 * + check + optional label swap, announced politely, restored after `duration`.
 * Use ONLY for in-place actions with no other confirmation (no toast, no navigation).
 */
export function setSuccess(el, { label = null, duration = 1400 } = {}) {
  if (el.dataset.success !== undefined) return;

  const original = [...el.childNodes].filter(n => !n.classList?.contains('c-button__spinner'));
  const originalDisabled = el.disabled;

  morphWidth(el, () => {
    el.textContent = '';
    el.dataset.success = '';
    el.disabled = true;
    delete el.dataset.loading;
    el.removeAttribute('aria-busy');

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('c-button__icon');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', CHECK_PATH);
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path);
    el.append(svg);

    const text = document.createElement('span');
    text.className = 'c-button__label';
    text.setAttribute('role', 'status'); // polite announcement
    if (label) text.textContent = label;
    el.append(text);
  });

  setTimeout(() => {
    morphWidth(el, () => {
      el.textContent = '';
      el.append(...original);
      delete el.dataset.success;
      el.disabled = originalDisabled;
    });
  }, duration);
}
