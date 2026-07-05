/**
 * scan-shell — Scan takeover (Phase 1 #3, docs/scan-spec.md). Bridge grammar
 * (bridge-audit-B.md §5): legacy scan.html decodes IN the WebView and emits
 * ixian:qrresult:<text>; C# is allowScanning ONE-SHOT, pops the page, then
 * raises scanSucceeded to the parent page. Cancel/back → ixian:back.
 *
 * createScanView({ state = 'prompt', onRequestPermission, onDecode, onTorch,
 *                  onCancel, strings })
 *   onRequestPermission(ctrl) — ctrl.done() → scanning · ctrl.fail() → denied
 *     (honest recovery copy + Try again; NO OS-settings deep link — no bridge
 *     verb exists, Damir pick). Latched while in flight, #141-m4 guarded.
 *   onDecode(text) — fires ONCE per view (allowScanning mirror,
 *     bridge-audit-B.md:170) ~350ms after the success flash; the host forwards
 *     to ixian:qrresult:<text> and closes (auto-fill + return, Damir pick).
 *   onTorch(on, ctrl) — OPTIONAL; absent = no torch affordance. Optimistic
 *     aria-pressed flip; ctrl.fail()/sync throw reverts (#141-m4). Camera-flip
 *     deferred to device testing (Damir pick).
 *   onCancel() — topbar back → ixian:back (C# pops + GC.Collect()).
 *
 * Free fns (#44): setScanState(el, 'prompt'|'denied'|'scanning')
 *                 deliverScanResult(el, text) — decode entry point (html5-qrcode
 *                 callback at Phase 3 integration; mock button in the demo).
 *
 * deliverScanResult gates (never emitted): not in 'scanning' · already
 * delivered · empty/whitespace payload · payload containing the literal
 * 'ixian:qrresult:' (C# Splits on it — a hostile QR could truncate itself
 * into a different payload; spec §1 + §9 ask for a C#-side guard).
 */
import { icon } from './icons.js';
import { createTopbar } from './topbar.js';
import { createButton, setLoading } from './button.js';

const scanState = new WeakMap(); // el → { state, delivered, requesting, opts, els }

function scanCtrl(onDone, onFail) {              // one-shot (contactsCtrl grammar)
  let used = false;
  return {
    done: (payload) => { if (used) return; used = true; onDone(payload); },
    fail: (msg) => { if (used) return; used = true; onFail(msg); },
  };
}

const STATES = ['prompt', 'denied', 'scanning'];

function sync(st) {
  const { root, frame, hint, torch, card, disc, cardTitle, cardCopy, cta } = st.els;
  const { strings } = st.opts;
  const scanning = st.state === 'scanning';
  root.dataset.state = st.state;

  frame.hidden = !scanning;
  hint.hidden = !scanning;
  if (torch) torch.hidden = !scanning;
  card.hidden = scanning;
  if (scanning) {
    hint.textContent = strings.scanHint || 'Point your camera at a Spixi QR code';
    return;
  }

  const denied = st.state === 'denied';
  disc.dataset.hue = denied ? 'warning' : 'primary';
  disc.textContent = '';
  // eye-off = "camera blocked" stand-in on the denied disc (spec §5①)
  disc.append(icon(denied ? 'eye-off' : 'scan', { size: 20 }));
  cardTitle.textContent = denied
    ? (strings.scanDeniedTitle || 'Camera access is off')
    : (strings.scanPromptTitle || 'Scan a QR code');
  cardCopy.textContent = denied
    ? (strings.scanDeniedCopy
      || 'Spixi can’t use the camera right now. Allow camera access for Spixi in your device settings, then try again.')
    : (strings.scanPromptCopy
      || 'Spixi needs the camera to scan a contact’s QR code. Nothing is captured until you allow it.');
  const label = cta.querySelector('.c-button__label');
  if (label) {
    label.textContent = denied
      ? (strings.tryAgain || 'Try again')
      : (strings.allowCamera || 'Allow camera');
  }
}

export function createScanView({
  state = 'prompt', onRequestPermission, onDecode, onTorch, onCancel, strings = {},
} = {}) {
  const el = document.createElement('section');
  el.className = 'c-scan';
  el.append(createTopbar({
    variant: 'view',
    title: strings.scanTitle || 'Scan QR code',
    onBack: onCancel,                            // → ixian:back (C# pops + GC.Collect)
    backLabel: strings.back || 'Back',
  }));

  const cam = document.createElement('div');
  cam.className = 'c-scan__camera';

  // feed slot — html5-qrcode mounts its <video> here at Phase 3; demo leaves it dark
  const feed = document.createElement('div');
  feed.className = 'c-scan__feed';
  feed.setAttribute('aria-hidden', 'true');
  cam.append(feed);

  const frame = document.createElement('div');
  frame.className = 'c-scan__frame';
  frame.setAttribute('aria-hidden', 'true');
  for (const pos of ['tl', 'tr', 'bl', 'br']) {
    const c = document.createElement('span');
    c.className = 'c-scan__corner';
    c.dataset.pos = pos;
    frame.append(c);
  }
  cam.append(frame);

  const hint = document.createElement('p');
  hint.className = 'c-scan__hint';
  hint.setAttribute('role', 'status');
  cam.append(hint);

  let torch = null;
  if (onTorch) {                                 // capability-gated affordance (spec §2)
    torch = document.createElement('button');
    torch.type = 'button';
    torch.className = 'c-scan__torch';
    torch.setAttribute('aria-pressed', 'false');
    torch.setAttribute('aria-label', strings.torch || 'Torch');
    torch.append(icon('eye', { size: 20 }));     // icon gap: no bulb/flashlight glyph (spec §5①)
    let torchBusy = false;
    torch.addEventListener('click', () => {
      if (torchBusy) return;
      const on = torch.getAttribute('aria-pressed') !== 'true';
      torch.setAttribute('aria-pressed', String(on));   // optimistic
      torchBusy = true;
      const ctrl = scanCtrl(
        () => { torchBusy = false; },
        () => { torchBusy = false; torch.setAttribute('aria-pressed', String(!on)); },
      );
      try { onTorch(on, ctrl); } catch { ctrl.fail(); } // #141-m4
    });
    cam.append(torch);
  }

  // prompt / denied card
  const card = document.createElement('div');
  card.className = 'c-scan__card';
  const disc = document.createElement('span');
  disc.className = 'c-disc';
  const cardTitle = document.createElement('p');
  cardTitle.className = 'c-scan__card-title';
  const cardCopy = document.createElement('p');
  cardCopy.className = 'c-scan__copy';
  const cta = createButton({ label: strings.allowCamera || 'Allow camera', size: 44, width: 'full' });
  card.append(disc, cardTitle, cardCopy, cta);
  cam.append(card);

  // decode success flash (visual; the role=status hint carries the SR announcement)
  const success = document.createElement('div');
  success.className = 'c-scan__success';
  success.hidden = true;
  success.setAttribute('aria-hidden', 'true');
  const successDisc = document.createElement('span');
  successDisc.className = 'c-scan__success-disc';
  successDisc.append(icon('check', { size: 32 }));
  success.append(successDisc);
  cam.append(success);

  el.append(cam);

  const st = {
    state: STATES.includes(state) ? state : 'prompt',
    delivered: false,
    requesting: false,
    opts: { onRequestPermission, onDecode, onTorch, onCancel, strings },
    els: { root: el, frame, hint, torch, card, disc, cardTitle, cardCopy, cta, success },
  };
  scanState.set(el, st);

  cta.addEventListener('click', () => {          // Allow camera / Try again — same request
    if (st.requesting) return;
    st.requesting = true;
    setLoading(cta, true);
    const ctrl = scanCtrl(
      () => { st.requesting = false; setLoading(cta, false); setScanState(el, 'scanning'); },
      () => { st.requesting = false; setLoading(cta, false); setScanState(el, 'denied'); },
    );
    try {
      if (onRequestPermission) onRequestPermission(ctrl); else ctrl.done();
    } catch { ctrl.fail(); }                     // #141-m4
  });

  sync(st);
  return el;
}

/** Move between permission states; 'scanning' shows frame + hint + torch. */
export function setScanState(el, state) {
  const st = scanState.get(el);
  if (!st || !STATES.includes(state) || st.state === state) return;
  st.state = state;
  sync(st);
}

/**
 * Decode entry point (html5-qrcode callback in the app; mock in the demo).
 * One-shot per view (allowScanning mirror); success flash → onDecode(text).
 */
export function deliverScanResult(el, text) {
  const st = scanState.get(el);
  if (!st || st.state !== 'scanning' || st.delivered) return;
  const payload = String(text == null ? '' : text).trim();
  if (!payload) return;
  if (payload.includes('ixian:qrresult:')) return;   // hostile self-prefixed QR (spec §1)
  st.delivered = true;
  st.els.success.hidden = false;
  st.els.hint.textContent = st.opts.strings.scanned || 'Code scanned';
  setTimeout(() => {                             // let the flash land (spec §5④)
    if (st.opts.onDecode) st.opts.onDecode(payload);
  }, 350);
}
