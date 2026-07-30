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

  /* ————————————————————————————————————————————————————————————————————————
   * A8 (#302) — camera track state (zoom + torch).
   *
   * Both zoom and torch are applied through track.applyConstraints({advanced:[…]}),
   * which REPLACES the constraint set rather than merging into it. Applied
   * separately (as torch was), a torch toggle can silently reset the zoom and a
   * zoom retry can kill the torch. So both live in one object and are always
   * written together.
   *
   * Legacy parity note: legacy set `showZoomSliderIfSupported: true` AND
   * `showTorchButtonIfSupported: true` (scan.html:70-76) but passed them to
   * Html5Qrcode.start(), whose config surface is {fps,qrbox,aspectRatio,disableFlip,
   * videoConstraints} — both keys are read only by the Html5QrcodeSCANNER render
   * path. So legacy rendered NEITHER a slider nor a torch button. The only zoom
   * behaviour legacy actually had was the auto-applied 2× at :79-84, and that is
   * what is restored here. (Torch is a redesign addition, not a survivor.)
   * ———————————————————————————————————————————————————————————————————————— */
  const track = { zoom: null, torch: false };

  function applyTrackState(inst) {
    const adv = {};
    if (track.zoom != null) adv.zoom = track.zoom;
    // Always WRITE torch, never omit it: an absent key leaves the engine's current
    // photo setting untouched, so omitting it on "off" left the LED burning while the
    // button reported off (audit MAJOR). Advanced sets are best-effort, so an explicit
    // torch:false on a torch-less track is ignored exactly as before.
    adv.torch = !!track.torch;
    // applyVideoConstraints THROWS SYNCHRONOUSLY when the camera isn't running
    // (getRenderedCameraOrFail) — a bare .catch() would not catch that, hence try.
    try { return inst.applyVideoConstraints({ advanced: [adv] }); }
    catch (e) { return Promise.reject(e); }
  }

  /* Legacy applied a LITERAL zoom of 2.0 after a 1 s setTimeout. Both details are
     wrong and are deliberately not copied:
       • the literal — `zoom` is a device-defined MediaSettingsRange. Plenty of
         Android stacks report {min:1,max:10}, others report percent-like
         {min:100,max:400} where 2.0 is BELOW min and is silently ignored or
         clamped. Advanced constraints are best-effort, so the fix would look
         applied and do nothing. Compute min×2 instead: scale-agnostic, 1→2 and
         100→200 both mean "2×".
       • the 1 s timer — legacy called start() fire-and-forget with no .then, so it
         had no completion anchor and guessed. We have one. */
  function applyPreferredZoom(inst, retry) {
    try {
      if (instance !== inst) return;                  // stopped / restarted since
      // Never on desktop: a webcam's FOV is already narrow, so 2× just forces the
      // user to hold the code further away. Also keeps the #263 device-pick path
      // completely untouched.
      if ((w.document || document).documentElement.hasAttribute('data-desktop')) return;
      const caps = inst.getRunningTrackCameraCapabilities();
      const zoom = caps && caps.zoomFeature && caps.zoomFeature();
      if (!zoom || !zoom.isSupported()) {
        // some Android stacks populate capabilities a tick after play — one retry
        if (retry) setTimeout(() => applyPreferredZoom(inst, false), 700);
        return;
      }
      const min = zoom.min(), max = zoom.max(), step = zoom.step();
      // min>0 first: {min:0,max:10} would make max/min Infinity, pass the ratio test,
      // and then pin zoom to 0 — the widest setting, the opposite of the intent.
      if (!(min > 0) || !(max > min) || (max / min) < 1.5) return;
      let z = Math.min(min * 2, max);
      if (step > 0) z = Math.min(min + Math.round((z - min) / step) * step, max);
      track.zoom = z;
      applyTrackState(inst).catch(() => { track.zoom = null; });   // fail soft, always
    } catch (_) { /* capability probing must never break scanning */ }
  }

  return {
    start(feedEl, onText, ctrl) {
      if (!feedEl.id) feedEl.id = 'spixi-scan-feed'; // Html5Qrcode mounts by element id
      instance = new w.Html5Qrcode(feedEl.id, { formatsToSupport: [0] }); // 0 = QR_CODE
      const inst = instance;
      const go = (source) => inst.start(source, { fps: 10 }, (decodedText) => onText(decodedText));
      // #263 (Damir F5: desktop "Allow" → BLACK feed): a bare
      // { facingMode: 'environment' } on a LAPTOP can rank a virtual/IR/depth
      // device first (Windows Hello etc.) — permission succeeds, the stream
      // renders black. On desktop ENUMERATE and pick the first real-looking
      // camera by deviceId (getCameras() itself raises the permission prompt);
      // fall back to facingMode 'user' (laptop webcams are user-facing).
      // Mobile keeps environment-first with a user fallback (front-only
      // devices). Every failure now logs the REAL error (was swallowed —
      // F12-diagnosable if a black feed persists).
      const desktop = (w.document || document).documentElement.hasAttribute('data-desktop');
      const fail = (label) => (err) => {
        try { console.error('scan camera start failed (' + label + ')', err); } catch (e2) { /* console gone */ }
        ctrl.fail();
      };
      /* A8: the real completion anchor legacy never had. Every successful start
         path routes through here instead of calling ctrl.done() directly. */
      const started = () => { ctrl.done(); applyPreferredZoom(inst, true); };
      if (desktop) {
        w.Html5Qrcode.getCameras()
          .then((cams) => {
            const real = (cams || []).filter((c) => !/ir camera|infrared|depth|virtual/i.test(c.label || ''));
            const pick = real[0] || (cams || [])[0];
            return go(pick ? { deviceId: { exact: pick.id } } : { facingMode: 'user' });
          })
          .then(started)
          .catch((e1) => {
            // enumerate/deviceId path failed → last-resort plain user-facing ask
            go({ facingMode: 'user' }).then(started).catch(fail('desktop user-facing fallback; first error: ' + e1));
          });
      } else {
        go({ facingMode: 'environment' })
          .then(started)
          .catch((e1) => {
            go({ facingMode: 'user' }).then(started).catch(fail('mobile user-facing fallback; first error: ' + e1));
          });
      }
    },
    stop() {
      const inst = instance;
      instance = null;
      track.zoom = null;                         // A8: next start re-probes from scratch
      track.torch = false;
      if (inst) { try { inst.stop().catch(() => {}); } catch { /* already stopped */ } }
    },
    setTorch(on, ctrl) {
      const inst = instance;
      if (!inst) { ctrl.fail(); return; }
      // A8: route through the shared track state so toggling the torch cannot
      // silently drop the applied zoom (advanced constraints REPLACE, not merge).
      const prev = track.torch;
      track.torch = !!on;
      applyTrackState(inst)
        .then(() => ctrl.done())
        .catch(() => { track.torch = prev; ctrl.fail(); });   // unsupported track → button reverts
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
