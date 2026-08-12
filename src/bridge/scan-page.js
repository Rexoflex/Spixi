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

/* ————————————————————————————————————————————————————————————————————————————
 * D1 (#307) — ASPECT-LOCKED FEED: why the r4 full-bleed feed decoded NOTHING.
 * Verified in the vendored min.js BEFORE touching layout (#215 gate; #306 order).
 *
 * With no qrbox, html5-qrcode latches qrRegion = {0,0,clientW,clientH} from the
 * feed box at the video's FIRST 'playing' event (setupUi), then every frame maps
 * it through PER-AXIS ratios videoWidth/clientWidth and videoHeight/clientHeight
 * and draws into a clientW×clientH canvas (foreverScan). The sampled frame is
 * therefore undistorted ⇔ the feed box has the stream's intrinsic aspect:
 *   · r4 full-bleed 393×737 over the 480×640 stream → every frame stretched
 *     1.41× taller than wide → finder squares became rectangles → ZERO decode.
 *   · r3's accidental 262×349 (0.751 vs the stream's 0.750) was uniform → it
 *     scanned. Both device measurements fit; only layout changed between them.
 * (An explicit qrbox would NOT have fixed this: getShadedRegionBounds returns
 * CLIENT coords and foreverScan applies the same per-axis ratios, so the sample
 * distorts identically under a full-bleed feed — and stops matching the visible
 * cutout. The handoff's fallback (b) is unsound alone; (a) is the fix.)
 *
 * So the feed box is SIZED to the stream aspect: contain-fit, centered in the
 * camera bed, the bed's dark ground as letterbox — the classic scanner look,
 * and exactly the geometry the library assumes. Ordering guarantee: the default
 * box (3:4 mobile / 4:3 desktop picks) is applied BEFORE start(), and the real
 * aspect lands on 'loadedmetadata', which ALWAYS precedes the 'playing' event
 * where the library measures. A late correction (exotic race) keeps decode
 * sound — per-frame ratios stay uniform whenever box aspect == stream aspect —
 * at worst the sampled region anchors top-left of the resized box (logged NIT).
 * Fail-soft everywhere: if this sizer never runs, the stylesheet inset:0 keeps
 * the r4 full-bleed feed (camera visible, decode degraded, probe box names it).
 * ———————————————————————————————————————————————————————————————————————————— */
function fitFeedBox(feedEl, aspect) {
  try {
    const bed = feedEl.parentElement;
    if (!bed) return;
    const bw = bed.clientWidth, bh = bed.clientHeight;
    if (!(bw > 0) || !(bh > 0) || !(aspect > 0)) return;   // unlaid-out bed → keep the fail-soft inset
    let w = bw, h = bw / aspect;
    if (h > bh) { h = bh; w = bh * aspect; }
    const s = feedEl.style;
    s.left = Math.round((bw - w) / 2) + 'px';
    s.top = Math.round((bh - h) / 2) + 'px';
    s.width = Math.round(w) + 'px';
    s.height = Math.round(h) + 'px';
  } catch (e) { /* stylesheet inset:0 fallback — never break scanning over layout */ }
}

function attachFeedSizer(feedEl, desktop, onGrow) {
  // Default until metadata: mobile rear cameras stream portrait 3:4 (the device-
  // measured 480×640); the #263 desktop path picks a landscape 4:3 webcam.
  let aspect = desktop ? 4 / 3 : 3 / 4;
  /* #309b: `playedBox` = the feed box at the video's 'playing' event — the box the
   * LIBRARY latched its decode region from (its own 'playing' listener registers
   * first, in setupSurface, so ours reads post-latch). When a later re-fit GROWS
   * the box significantly past it, the latched region samples only the top-left
   * corner of the frame (r3 reviewer math: a bracket-filling QR's finder falls
   * outside) → report it ONCE via onGrow (debounced — present-growth is a single
   * reflow, but let it settle) so the provider can silently re-latch. */
  let playedBox = null;
  let growTimer = null;
  let growFired = false;
  const maybeGrow = () => {
    if (!playedBox || !onGrow || growFired || growTimer) return;
    try {
      const r = feedEl.getBoundingClientRect();
      if (!(r.width * r.height > playedBox.w * playedBox.h * 1.25)) return;
      growTimer = setTimeout(() => {
        growTimer = null;
        try {
          const r2 = feedEl.getBoundingClientRect();
          if (!growFired && playedBox && r2.width * r2.height > playedBox.w * playedBox.h * 1.25) {
            growFired = true;
            onGrow();
          }
        } catch (e) { /* fail soft */ }
      }, 150);
    } catch (e) { /* fail soft */ }
  };
  const apply = () => { fitFeedBox(feedEl, aspect); maybeGrow(); };
  apply();                                       // box is right BEFORE the ctor/start() ever measures
  let video = null;                              // the found surface — re-read on resize (#46 r1 MINOR-2)
  const fromVideo = (v) => {
    try {
      video = v;
      if (!(v.videoWidth > 0) || !(v.videoHeight > 0)) return;
      aspect = v.videoWidth / v.videoHeight;
      // #309: ALWAYS re-fit here — the first device round proved the BED can be wrong
      // while the aspect is right (auto-enter starts the camera on a STAGED page, bed
      // ~393×370 pre-present; the old aspect-changed-only short-circuit let that
      // mis-measured box stick: top-anchored 279×370 feed, frame half on black).
      apply();
    } catch (e) { /* fail soft */ }
  };
  const hook = () => {
    const v = feedEl.querySelector('video');
    if (!v) return false;
    video = v;
    if (v.readyState >= 1) fromVideo(v);         // metadata already in (late attach)
    else v.addEventListener('loadedmetadata', () => fromVideo(v), { once: true });
    // #309b: record the region-latch box (see playedBox above). Also covers the
    // late-attach case: if 'playing' already fired, latch the CURRENT box now.
    const recordPlayed = () => {
      try { const r = feedEl.getBoundingClientRect(); if (r.width > 0) playedBox = { w: r.width, h: r.height }; } catch (e) { /* fail soft */ }
    };
    if (v.readyState >= 3 && !v.paused) recordPlayed();
    else v.addEventListener('playing', recordPlayed, { once: true });
    return true;
  };
  let mo = null;
  if (!hook()) {                                 // video appears async (post-getUserMedia)
    try {
      mo = new MutationObserver(() => { if (hook() && mo) { mo.disconnect(); mo = null; } });
      mo.observe(feedEl, { childList: true });
    } catch (e) { /* no MO → default aspect holds; mobile default == mobile reality */ }
  }
  // #46 r1 MINOR-2: rotation SWAPS videoWidth/videoHeight — a resize re-fit with the
  // boot-time aspect would re-open the exact distortion this file exists to close. So
  // the aspect is RE-READ from the live surface on every resize before the re-fit.
  // Known residue (lib limitation, logged): qrRegion stays latched to the client dims
  // it measured at 'playing', so a mid-scan resize can still leave the sampled region
  // anchored top-left of the new box — the floor is r4 (never worse), and re-entering
  // the page re-latches everything.
  const onResize = () => {
    try { if (video && video.videoWidth > 0 && video.videoHeight > 0) aspect = video.videoWidth / video.videoHeight; } catch (e) { /* keep last */ }
    apply();
  };
  window.addEventListener('resize', onResize);
  // #309 — the structural fix for the staged-mount trap: C# loads this page while it is
  // STAGED (pre-present, smaller layout) and presents it later WITHOUT a window resize
  // event, so on the auto-enter path (#305 grant → camera starts at mount) the bed grows
  // under a box measured too small. A ResizeObserver on the BED re-fits on ANY bed-size
  // change — present-growth, rotation, desktop pane drags. Re-fitting a child's absolute
  // geometry cannot resize the bed itself, so no observer feedback loop. If the camera
  // reached 'playing' before the growth, the re-fit alone is NOT enough — the library's
  // latched region would sample only the top-left corner (r3 reviewer math) — which is
  // what the playedBox/onGrow re-latch above exists for (#309b).
  let ro = null;
  try {
    const bed = feedEl.parentElement;
    if (bed && typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(() => apply());
      ro.observe(bed);
    }
  } catch (e) { ro = null; /* window-resize belt still covers the common cases */ }
  return {
    off() {
      try { if (mo) mo.disconnect(); } catch (e) { /* already gone */ }
      mo = null;
      try { if (ro) ro.disconnect(); } catch (e) { /* already gone */ }
      ro = null;
      if (growTimer) { try { clearTimeout(growTimer); } catch (e) { /* gone */ } growTimer = null; }
      growFired = true;                          // a detached sizer must never restart anything
      video = null;
      window.removeEventListener('resize', onResize);
    },
  };
}

/** Default camera provider over the vendored html5-qrcode library. */
export function html5QrcodeCamera(win) {
  const w = win || window;
  if (!w.Html5Qrcode) return null;
  let instance = null;
  let feedSizer = null;                          // #307: active aspect-lock for the running start

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
      const desktop = (w.document || document).documentElement.hasAttribute('data-desktop');
      /* launch() = one camera bring-up. Factored out of start() (#309b) so the
       * grow re-latch below can run it AGAIN silently: the first run reports to
       * the page ctrl (consent card → scanning); a re-latch run must not — the
       * page is already scanning and scanCtrl is one-shot anyway. */
      const launch = (onUp, onFail) => {
        instance = new w.Html5Qrcode(feedEl.id, { formatsToSupport: [0] }); // 0 = QR_CODE
        /* iOS-49 ROOT CAUSE (#304, device-measured 2026-08-04): html5-qrcode
         * stamps `style.position = "relative"` INLINE on its container —
         * overriding scan-shell.css's absolute — collapsing the feed to 0×0
         * (BLACK preview, 0px video, 0×0 decode canvas, live torch). The
         * stylesheet !important (#305) is the war-ender; this removeProperty
         * stays as the belt, re-run on every launch (each ctor re-stamps). */
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
        // devices). Every failure logs the REAL error (F12-diagnosable).
        const up = () => onUp(inst);
        if (desktop) {
          w.Html5Qrcode.getCameras()
            .then((cams) => {
              const real = (cams || []).filter((c) => !/ir camera|infrared|depth|virtual/i.test(c.label || ''));
              const pick = real[0] || (cams || [])[0];
              return go(pick ? { deviceId: { exact: pick.id } } : { facingMode: 'user' });
            })
            .then(up)
            .catch((e1) => {
              // enumerate/deviceId path failed → last-resort plain user-facing ask
              go({ facingMode: 'user' }).then(up).catch(onFail('desktop user-facing fallback; first error: ' + e1));
            });
        } else if (/Android/i.test(((w.navigator || navigator).userAgent) || '')) {
          /* #334 AND-22 (Damir Samsung walk: "fisheye" preview + poor decode): a
           * bare facingMode:'environment' on a multi-lens Android can rank the
           * ULTRA-WIDE first. Enumerate like #263 and prefer the MAIN back
           * camera: back-facing only → drop named non-main lenses → lowest
           * camera index ("camera2 0, facing back" = main on Samsung/Pixel).
           * Every failure steps down to the pre-#334 behavior. iOS deliberately
           * keeps the bare environment ask — its scan is device-verified (#313). */
          w.Html5Qrcode.getCameras()
            .then((cams) => {
              const backs = (cams || []).filter((c) => /back|rear|environment/i.test(c.label || ''));
              const mains = backs.filter((c) => !/ultra|tele|macro|depth|infrared|fisheye|virtual/i.test(c.label || ''));
              // loop MINOR-3: take the LAST digit run — "camera2 0, facing back"
              // leads with the API level's 2, which ranked every lens equal.
              const rank = (c) => { const m = (c.label || '').match(/\d+/g); return m ? parseInt(m[m.length - 1], 10) : 99; };
              const pick = (mains.length ? mains : backs).sort((a, b) => rank(a) - rank(b))[0];
              return go(pick ? { deviceId: { exact: pick.id } } : { facingMode: 'environment' });
            })
            .then(up)
            .catch((e1) => {
              go({ facingMode: 'environment' })
                .then(up)
                .catch((e2) => {
                  go({ facingMode: 'user' }).then(up).catch(onFail('android fallback chain; errors: ' + e1 + ' | ' + e2));
                });
            });
        } else {
          go({ facingMode: 'environment' })
            .then(up)
            .catch((e1) => {
              go({ facingMode: 'user' }).then(up).catch(onFail('mobile user-facing fallback; first error: ' + e1));
            });
        }
      };
      /* #309b — the staged-latch RE-LATCH (r3 reviewer MAJOR: the residue math was
       * wrong). If the camera reaches 'playing' while C# still has the page STAGED
       * (the #305 auto-enter runs at mount), the library latches its decode region
       * to the small box; after present-growth the sampled region covers only the
       * top-left ~70% of the frame — a BRACKET-FILLING QR's top-right finder falls
       * outside it and can never decode (uniform ratios, so it LOOKS healthy).
       * The sizer reports a significant post-'playing' box GROW exactly once →
       * silently stop + relaunch: the fresh start latches the full-size box.
       * ~300ms feed blip, once, only when the race armed; permission cannot
       * re-prompt (granted this session — and #309's delegate fix auto-grants).
       * Torch/zoom re-derive via applyPreferredZoom→applyTrackState on the new
       * track (a lit torch comes back on with the zoom write). */
      let restarted = false;                       // one re-latch per start
      const requestRestart = () => {
        if (restarted) return;
        const inst = instance;
        if (!inst) return;                         // page stopped meanwhile (cancel/decode)
        restarted = true;
        // the old sizer dies NOW (no stale grow timers over the teardown) …
        if (feedSizer) { try { feedSizer.off(); } catch (e) { /* stale */ } }
        const relaunch = () => {
          if (instance !== inst) return;           // stop() ran during teardown — stay down
          // … and the FRESH sizer attaches only AFTER stop() resolved (r4 reviewer
          // MINOR): the library's close() has removed the old <video> by now, so
          // hook() finds an empty feed, the MutationObserver installs, and the
          // RELAUNCHED video gets hooked — metadata/aspect for a possibly DIFFERENT
          // camera + the rotation re-read. A pre-stop attach would hook the DYING
          // video synchronously and never see the new one (a different-aspect
          // fallback camera would then scan distorted with no recovery). No onGrow —
          // one re-latch per start is the contract.
          feedSizer = attachFeedSizer(feedEl, desktop, null);
          launch(
            (ni) => { applyPreferredZoom(ni, true); },
            (label) => (err) => { try { console.error('scan re-latch failed (' + label + ')', err); } catch (e2) { /* console gone */ } },
          );
        };
        try { inst.stop().then(relaunch, relaunch); } catch (e) { relaunch(); }
      };
      /* #307: aspect-lock the feed BEFORE the library measures anything (see the
       * block comment above). Re-attached per start — Try-again gets a fresh one.
       * The lambda defers the requestRestart reference (declared above via const —
       * evaluated only when a grow actually fires). */
      if (feedSizer) { try { feedSizer.off(); } catch (e) { /* stale */ } }
      feedSizer = attachFeedSizer(feedEl, desktop, () => requestRestart());
      const fail = (label) => (err) => {
        try { console.error('scan camera start failed (' + label + ')', err); } catch (e2) { /* console gone */ }
        ctrl.fail();
      };
      /* A8: the real completion anchor legacy never had. Every successful start
         path routes through here instead of calling ctrl.done() directly. */
      launch((inst) => { ctrl.done(); applyPreferredZoom(inst, true); }, fail);
    },
    stop() {
      const inst = instance;
      instance = null;
      track.zoom = null;                         // A8: next start re-probes from scratch
      track.torch = false;
      if (feedSizer) { try { feedSizer.off(); } catch (e) { /* stale */ } feedSizer = null; }  // #307
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

/* ————————————————————————————————————————————————————————————————————————————
 * D2 (#308) — C-9 STORAGE PROBE, self-serve (no Mac tether). Diagnostics only.
 *
 * The #305 grant flag did not survive a ScanPage relaunch (#306). Repo facts
 * pinned first (#215): the generated page name is the LITERAL prefix "ll_" +
 * page — `ll_scan.html`, STABLE per page (SpixiContentPage.generatePage), so
 * the per-VISIT-origin hedge is dead; cross-page keys DO live on different
 * files (ll_settings.html vs ll_scan.html → the per-FILE-origin theory stays
 * live for those); no custom WKWebsiteDataStore anywhere (MAUI default). What
 * only the device can answer is whether file:// localStorage persists AT ALL —
 * so every mount runs this probe and, exactly when the consent card gates
 * (= the symptom moment), paints one aria-hidden line:
 *
 *   storage probe — ll_scan.html · grant:0 · probe:N · appearance:X
 *
 *   · probe INCREMENTS across scan entries → same-page localStorage persists →
 *     the storage theory is DEAD and the grant clearing is a logic path
 *     (remember: an iOS-Settings revoke legitimately clears it — ask Damir).
 *   · probe stuck at 0 (write ok) → reads are session-ephemeral → C-9 CONFIRMED:
 *     every spixi.* localStorage feature is dead on iOS → be-cutover row
 *     (C# preference push / capability grammar), NOT a scan patch. Log it big.
 *   · write:ERR(name) → localStorage structurally dead on file:// → same
 *     escalation, with the exception name as evidence.
 *   · appearance:1 (written by ll_settings.html on a theme pick) → cross-FILE
 *     visibility works too → the per-file-origin theory is dead as well.
 *     appearance:0 alone is ambiguous (dead storage kills it identically) —
 *     the runsheet's Inspector variant stays the tie-breaker for that leg.
 *
 * Healthy platforms: the line renders only under the consent card (first-ever
 * visit or post-revoke), never over a working scanner; SRs skip it entirely.
 * English-only diagnostics — the #301 probe-line precedent. Retire/gate with
 * the consent fix once C-9 has its verdict.
 * ———————————————————————————————————————————————————————————————————————————— */
const SCAN_PROBE_KEY = 'spixi.probe.scan';

function probeScanStorage() {
  const r = { page: '?', grant: '0', probe: '0', appearance: '0', write: 'ok' };
  try { r.page = String(location.pathname || '').split('/').pop() || '?'; } catch (e) { /* opaque env */ }
  try { r.grant = localStorage.getItem(SCAN_GRANT_KEY) ? '1' : '0'; } catch (e) { r.grant = 'ERR:' + (e && e.name); }
  let n = 0;
  try { n = parseInt(localStorage.getItem(SCAN_PROBE_KEY) || '0', 10) || 0; r.probe = String(n); } catch (e) { r.probe = 'ERR:' + (e && e.name); }
  try { localStorage.setItem(SCAN_PROBE_KEY, String(n + 1)); } catch (e) { r.write = 'ERR:' + (e && e.name); }
  try { r.appearance = localStorage.getItem('spixi.appearance') != null ? '1' : '0'; } catch (e) { r.appearance = 'ERR:' + (e && e.name); }
  return r;
}

function paintStorageProbe(el, storage) {
  try {
    const d = document.createElement('p');
    d.setAttribute('aria-hidden', 'true');       // diagnostics never reach screen readers
    d.style.cssText = 'position:absolute;left:12px;right:12px;bottom:calc(8px + env(safe-area-inset-bottom,0px));'
      + 'z-index:3;margin:0;text-align:center;font:11px/1.4 -apple-system,sans-serif;'
      + 'color:rgba(255,255,255,0.55);pointer-events:none;';
    d.textContent = 'storage probe — ' + storage.page + ' · grant:' + storage.grant
      + ' · probe:' + storage.probe + ' · appearance:' + storage.appearance
      + (storage.write !== 'ok' ? ' · write:' + storage.write : '');
    el.appendChild(d);
    return d;                                    // #46 r1 MINOR-1: caller removes it when scanning starts
  } catch (e) { /* fail soft — the console line above already carries the verdict */ }
  return null;
}

export function mountScanPage({ host, bridge, strings, camera } = {}) {
  const br = bridge || createNativeBridge();
  const sl = strings || (typeof window !== 'undefined' && window.SL) || {};
  const cam = camera !== undefined ? camera : html5QrcodeCamera();
  let el = null;
  let finished = false;                          // decode/cancel are terminal (C# pops the page)
  let storageProbeLine = null;                   // #308 line — lives only while consent gates (#46 r1 MINOR-1)

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
          // #46 r1 MINOR-1: the storage line is consent-card evidence — a successful
          // start enters 'scanning', so it must not linger over the live camera (it
          // sat above the success flash, z3 > z2). Denied keeps it: still the symptom.
          if (storageProbeLine) { try { storageProbeLine.remove(); } catch (e) { /* gone */ } storageProbeLine = null; }
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
  // #308: the C-9 storage probe runs on EVERY mount (console) and paints its line
  // only when the consent card is about to gate — the exact symptom moment.
  const storage = probeScanStorage();
  try { console.error('[scan-probe] storage', JSON.stringify(storage)); } catch (e) { /* console gone */ }
  if (storage.grant !== '1') storageProbeLine = paintStorageProbe(el, storage);
  // #305: a previously granted camera skips the consent-card tap — auto-enter the
  // SAME request path (latched, honest: failure lands on the denied card and clears
  // the flag). First-ever visit still shows the card; nothing is captured unbidden.
  try {
    if (cam && localStorage.getItem(SCAN_GRANT_KEY)) startScanRequest(el);
  } catch (e) { /* private mode → card stays, exactly as before */ }
  return { el, bridge: br };
}
