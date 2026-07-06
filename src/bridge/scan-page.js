/**
 * scan-page.js — real-bridge adapter for the Scan shell (Phase 3 item 2;
 * FIRST C# repoint target, Damir 2026-07-06). Mirrors legacy scan.html
 * (bridge-audit-B.md §5): decode happens IN the WebView (html5-qrcode,
 * vendored at Resources/Raw/html/js/html5-qrcode.min.js), success emits
 * `ixian:qrresult:<text>` (C# allowScanning one-shot → pops the page → raises
 * scanSucceeded to the parent), cancel emits `ixian:back` (pop + GC.Collect).
 *
 * mountScanPage({ host, bridge, strings, camera })
 *   host    — mount target (default document.body)
 *   bridge  — createNativeBridge() instance (injectable for tests/demos)
 *   strings — SL dictionary (default window.SL — ARCHITECTURE §7)
 *   camera  — provider { start(feedEl, onText, ctrl), stop(), setTorch? } —
 *             default wraps the vendored Html5Qrcode global; null/absent
 *             library → permission CTA lands on 'denied' with honest copy
 *             (integration gap is visible, never silent — spec §4).
 * Returns { el, bridge } (tests introspect both).
 */
import { createScanView, deliverScanResult } from '../components/scan-shell.js';
import { createNativeBridge } from './native.js';

/** Default camera provider over the vendored html5-qrcode library. */
export function html5QrcodeCamera(win) {
  const w = win || window;
  if (!w.Html5Qrcode) return null;
  let instance = null;
  return {
    start(feedEl, onText, ctrl) {
      if (!feedEl.id) feedEl.id = 'spixi-scan-feed'; // Html5Qrcode mounts by element id
      instance = new w.Html5Qrcode(feedEl.id, { formatsToSupport: [0] }); // 0 = QR_CODE
      instance
        .start({ facingMode: 'environment' }, { fps: 10 }, (decodedText) => onText(decodedText))
        .then(() => ctrl.done())
        .catch(() => ctrl.fail());               // permission denied / no camera
    },
    stop() {
      const inst = instance;
      instance = null;
      if (inst) { try { inst.stop().catch(() => {}); } catch { /* already stopped */ } }
    },
    setTorch(on, ctrl) {
      if (!instance) { ctrl.fail(); return; }
      instance.applyVideoConstraints({ advanced: [{ torch: on }] })
        .then(() => ctrl.done())
        .catch(() => ctrl.fail());               // unsupported track → button reverts
    },
  };
}

export function mountScanPage({ host, bridge, strings, camera } = {}) {
  const br = bridge || createNativeBridge();
  const sl = strings || (typeof window !== 'undefined' && window.SL) || {};
  const cam = camera !== undefined ? camera : html5QrcodeCamera();
  let el = null;
  let finished = false;                          // decode/cancel are terminal (C# pops the page)

  const stopCamera = () => { if (cam) { try { cam.stop(); } catch { /* fail soft */ } } };

  el = createScanView({
    state: 'prompt',
    strings: sl,
    onRequestPermission(ctrl) {
      if (!cam) { ctrl.fail(); return; }         // library missing — visible, honest (spec §4)
      const feed = el.querySelector('.c-scan__feed');
      cam.start(feed, (text) => deliverScanResult(el, text), ctrl);
    },
    onDecode(text) {                             // one-shot upstream (scan-shell gate)
      if (finished) return;
      finished = true;
      stopCamera();
      br.send('ixian:qrresult:' + text);         // raw legacy composition — C# splits on the literal
    },
    onCancel() {
      if (finished) return;
      finished = true;
      stopCamera();
      br.send('ixian:back');                     // C# pops + GC.Collect()
    },
    // torch affordance only when the provider can drive it (capability-gated UI)
    onTorch: cam && cam.setTorch ? (on, ctrl) => cam.setTorch(on, ctrl) : undefined,
  });

  (host || document.body).append(el);
  br.ready();                                    // ixian:onload — C# flushes queued pushes
  return { el, bridge: br };
}
