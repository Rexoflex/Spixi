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
import { createScanView, deliverScanResult, startScanRequest } from '../components/scan-shell.js';
import { createNativeBridge } from './native.js';

/* #305: remember that the camera was granted once, so the shell's consent card
 * doesn't gate EVERY visit (Damir F5: "allow camera doesn't persist"). A boolean
 * only — no addresses, no content (the #254 storage rule); the OS permission is
 * still the real authority (our C# WKUIDelegate mirrors AVFoundation, which only
 * shows its sheet once). Cleared whenever a start fails, so a user who revokes
 * camera access in Settings falls back to the honest prompt/denied cards. */
const SCAN_GRANT_KEY = 'spixi.scan.granted';

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
      /* iOS-49 ROOT CAUSE (#304, device-measured 2026-08-04): the Html5Qrcode ctor
       * stamps `style.position = "relative"` INLINE on its container — overriding
       * scan-shell.css's `position:absolute; inset:0` — so the feed collapses to a
       * 0×0 point in the centered flex camera: BLACK preview, video style.width
       * "0px", and a 0×0 decode canvas (zero scans) while the track runs (torch
       * worked). Remove the stamp BEFORE start() reads clientWidth; the stylesheet
       * absolute returns and everything downstream sizes itself correctly. Runs on
       * every start, so the Try-again path (new ctor = new stamp) is covered too. */
      feedEl.style.removeProperty('position');
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

/* ————————————————————————————————————————————————————————————————————————————
 * F1 (#301) — iOS-49 scan diagnostics + best-effort re-kick. ZERO-C# BY DESIGN.
 *
 * The 2026-08-04 iPhone F5: torch works (track LIVE) while nothing ever scans.
 * The prescribed fix — set AllowsInlineMediaPlayback at WKWebView construction —
 * was verified a NO-OP before building: MAUI's own MauiWKWebView.CreateConfiguration
 * (dotnet/maui release/10.0.1xx) already sets AllowsInlineMediaPlayback = true and
 * MediaTypesRequiringUserActionForPlayback = None on every WKWebView it constructs
 * (iOSWebViewHandler → base.CreatePlatformView → MauiWKWebView), and the vendored
 * html5-qrcode already sets playsInline + muted on its <video>. Both halves of
 * iOS-49's "remaining half" are therefore ALREADY in place, and the real failing
 * layer is unknown: #293's own "verify with Inspector before building (#215)" was
 * never run. So this probe IS that verification, on-screen (no Mac tether needed):
 *
 *   · ~1.2 s after a successful start: log full video/track/frame state to the
 *     console AND, if the <video> is stalled (0×0 or paused), re-call play() —
 *     a known, free WebKit nudge that may fix rendering outright.
 *   · ~2.8 s: re-probe. Still dead → paint a compact readout into the scan hint
 *     (role=status): video WxH/ready/paused · track live/muted · frame black?.
 *     track.muted=true ⇒ WebKit suspended capture natively (C#/WebKit-side);
 *     video 0×0 ⇒ inline rendering refused; healthy video + black frames ⇒
 *     canvas readback; NO line shown but still no scans ⇒ decode-side (console).
 *
 * Healthy platforms never show the line (probe logs one line and stops), so this
 * ships everywhere (Android bring-up gets it free). Fail-soft: nothing here can
 * break scanning — every step is try/wrapped and read-only except video.play().
 * ———————————————————————————————————————————————————————————————————————————— */
function probeScanFeed(feedEl) {
  try {
    const v = feedEl && feedEl.querySelector('video');
    const s = v && v.srcObject;
    const t = s && s.getVideoTracks ? s.getVideoTracks()[0] : null;
    let frame = 'n/a';                           // black-frame sample — only meaningful with pixels
    if (v && v.videoWidth > 0) {
      try {
        const c = document.createElement('canvas');
        c.width = c.height = 8;
        const g = c.getContext('2d');
        g.drawImage(v, 0, 0, 8, 8);
        const d = g.getImageData(0, 0, 8, 8).data;
        let max = 0;
        for (let i = 0; i < d.length; i += 4) max = Math.max(max, d[i], d[i + 1], d[i + 2]);
        frame = max < 16 ? 'black' : 'live';
      } catch (e) { frame = 'readback-' + (e && e.name); }  // SecurityError etc. — itself diagnostic
    }
    // #304: the box the video RENDERS in — the failure this probe originally
    // missed was a 0×0 feed (library inline-style collapse), which reads as a
    // perfectly healthy video. Layout is part of the diagnosis now.
    const fr = feedEl && feedEl.getBoundingClientRect ? feedEl.getBoundingClientRect() : null;
    const box = fr ? { w: Math.round(fr.width), h: Math.round(fr.height) } : null;
    return {
      video: v ? { w: v.videoWidth, h: v.videoHeight, ready: v.readyState, paused: v.paused, inline: v.playsInline !== false } : null,
      track: t ? { state: t.readyState, muted: t.muted, enabled: t.enabled } : null,
      frame,
      box,
      dead: !v || v.videoWidth === 0 || v.paused || (t ? t.muted : false) || frame === 'black'
        || String(frame).indexOf('readback-') === 0        // a blocked readback ALSO blocks the decoder — that is dead, not healthy (#304 blind spot)
        || !box || box.w === 0 || box.h === 0,             // frames nobody can see or scan
    };
  } catch (e) { return { video: null, track: null, frame: 'probe-' + (e && e.name), dead: true }; }
}

function scanProbeLine(p) {
  const v = p.video ? p.video.w + 'x' + p.video.h + ' ready=' + p.video.ready + (p.video.paused ? ' PAUSED' : '') + (p.video.inline ? '' : ' NOINLINE') : 'NO VIDEO';
  const t = p.track ? p.track.state + (p.track.muted ? ' MUTED' : '') + (p.track.enabled ? '' : ' DISABLED') : 'no track';
  const b = p.box ? p.box.w + 'x' + p.box.h : '?';
  return 'scan probe — video ' + v + ' · box ' + b + ' · track ' + t + ' · frame ' + p.frame;
}

function scheduleScanProbe(el, feedEl, isDone) {
  const say = (msg, p) => { try { console.error('[scan-probe] ' + msg, JSON.stringify(p)); } catch (e) { /* console gone */ } };
  // isDone() = the mount's terminal latch (decode/cancel). Both timers bail on it:
  // after a decode stopCamera() pauses the video, so a late probe would read the
  // torn-down feed as "dead" and overwrite the "Code scanned" hint (role=status —
  // an SR would announce the diagnostic) on a scanner that just WORKED (#46 audit).
  setTimeout(() => {
    if (isDone && isDone()) return;              // scanned/cancelled — probing torn-down state
    const p1 = probeScanFeed(feedEl);
    say('t+1.2s', p1);
    if (!p1.dead) return;                        // healthy — one console line, no UI
    try {                                        // the free nudge: WebKit sometimes starts
      const v = feedEl && feedEl.querySelector('video');   // rendering on a second play()
      if (v && (v.paused || v.videoWidth === 0)) { const r = v.play(); if (r && r.catch) r.catch(() => {}); }
    } catch (e) { /* fail soft */ }
    setTimeout(() => {
      if (isDone && isDone()) return;            // decode landed between probes — stay silent
      const p2 = probeScanFeed(feedEl);
      say('t+2.8s (after re-kick)', p2);
      if (!p2.dead) return;                      // re-kick fixed it — say nothing on screen
      try {
        const hint = el.querySelector('.c-scan__hint');
        if (hint && !hint.hidden) hint.textContent = scanProbeLine(p2);
      } catch (e) { /* fail soft */ }
    }, 1600);
  }, 1200);
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
      // F1 (#301): wrap done() so a SUCCESSFUL start schedules the probe; fail()
      // passes through untouched (denied state needs no probe). One-shot semantics
      // live in the underlying scanCtrl — this wrapper adds no state.
      const probed = {
        done: (payload) => {
          ctrl.done(payload);
          try { localStorage.setItem(SCAN_GRANT_KEY, '1'); } catch (e) { /* private mode */ }
          scheduleScanProbe(el, feed, () => finished);
        },
        fail: (msg) => {
          try { localStorage.removeItem(SCAN_GRANT_KEY); } catch (e) { /* private mode */ }
          ctrl.fail(msg);
        },
      };
      cam.start(feed, (text) => deliverScanResult(el, text), probed);
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
  // #305: a previously granted camera skips the consent-card tap — auto-enter the
  // SAME request path (latched, honest: failure lands on the denied card and clears
  // the flag). First-ever visit still shows the card; nothing is captured unbidden.
  try {
    if (cam && localStorage.getItem(SCAN_GRANT_KEY)) startScanRequest(el);
  } catch (e) { /* private mode → card stays, exactly as before */ }
  return { el, bridge: br };
}
