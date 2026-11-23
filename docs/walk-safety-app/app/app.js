/* Session Safety walk test app (docs/walk-safety.md). It talks to Spixi with the plain action bridge:
 * `xa:` + base64(JSON) — the same path the mini app SDK uses — and shows each answer on screen. It sends the load signal
 * `ixian:onload` at page load and defines `SpixiAppSdk.onInit`, as the real SDK does (below). */
(function () {
  var out = document.getElementById('out');
  function show(t) { out.textContent = 'Result: ' + t; }
  function b64(s) { return btoa(unescape(encodeURIComponent(s))); }
  function unb64(s) { try { return decodeURIComponent(escape(atob(s))); } catch (e) { return s; } }
  var n = 0;
  function nextId() { n += 1; return 'w' + n; }
  function send(o) { location.href = 'xa:' + btoa(JSON.stringify(o)); }
  var OUTSIDE = '../../safety-walk-outside';
  /* C# calls `executeUiCommand(SpixiAppSdk.ar, '<base64 of the JSON answer>')` (Utils.sendUiCommand); the SDK normally
   * defines executeUiCommand — this test app has no SDK, so it defines a small one. */
  if (typeof window.executeUiCommand !== 'function') {
    window.executeUiCommand = function (fn) {
      var args = [].slice.call(arguments, 1).map(function (a) { return a == null ? a : unb64(a); });
      return fn.apply(null, args);
    };
  }
  window.SpixiAppSdk = window.SpixiAppSdk || {};
  /* The load signal — the mechanism of the real SDK (spixi-app-sdk.js of the Spixi-Mini-Apps repo, mini-apps-sdk/, version 0.51;
   * the file is not in this repo): `fireOnLoad` navigates to `ixian:onload:<version>` one tick later, and an app calls it from the
   * window `load` event. MiniAppPage.onLoad (the `ixian:onload` verb) makes the action handler and answers with
   * `SpixiAppSdk.onInit`; since Fix batch 3 (P84) an action sent before it is refused "not ready".
   * `config.js` (loaded first) may set `window.SAFETY_WALK_NO_ONLOAD = true`: then the app never sends it, as the Fix batch 3
   * walk needs (docs/walk-safety.md, "The Fix batch 3 variant"). The file as shipped sets it to false. */
  window.SpixiAppSdk.version = 0.51;
  window.SpixiAppSdk.fireOnLoad = function () {
    setTimeout(function () { location.href = 'ixian:onload:' + window.SpixiAppSdk.version; }, 0);
  };
  /* The host answers the load signal with onInit(sessionIdHex, hostAddress) (SDK 0.50 or newer, i.e. sdkVersion >= 50, single-user app). The line under the
   * title shows that it came: the first 8 characters of the session id only, never an address. */
  window.SpixiAppSdk.onInit = function (sessionId) {
    var st = document.getElementById('state');
    if (st) { st.textContent = 'Host: connected (onInit received, session ' + String(sessionId || '').slice(0, 8) + ')'; }
  };
  window.addEventListener('load', function () {
    if (window.SAFETY_WALK_NO_ONLOAD === true) {
      var st = document.getElementById('state');
      if (st) { st.textContent = 'Host: no load signal sent (SAFETY_WALK_NO_ONLOAD)'; }
      return;
    }
    window.SpixiAppSdk.fireOnLoad();
  });
  window.SpixiAppSdk.ar = function (r) {
    var o = r;
    try { if (typeof r === 'string') o = JSON.parse(r); } catch (e) { show('answer ' + r); return; }
    if (!o || typeof o !== 'object') { show('answer ' + r); return; }
    show('answer ' + o.id + ': ' + (o.r === 'null' || o.r == null ? 'NOTHING STORED' : unb64(o.r)));
  };
  document.getElementById('save').onclick = function () {
    send({ c: 'setStorage', id: nextId(), t: 'main', k: 'walk', v: b64('inside ' + new Date().toLocaleTimeString()) });
  };
  document.getElementById('read').onclick = function () {
    send({ c: 'getStorage', id: nextId(), t: 'main', k: 'walk' });
  };
  document.getElementById('saveOut').onclick = function () {
    send({ c: 'setStorage', id: nextId(), t: OUTSIDE, k: 'walk', v: b64('outside ' + new Date().toLocaleTimeString()) });
  };
  document.getElementById('readOut').onclick = function () {
    send({ c: 'getStorage', id: nextId(), t: OUTSIDE, k: 'walk' });
  };
  document.getElementById('win').onclick = function () {
    var w = null;
    try { w = window.open('https://www.ixian.io', '_blank'); } catch (e) { show('new window: ' + e.name); return; }
    show(w ? 'new window: the page asked for one' : 'new window: blocked');
  };
  /* MAJOR #4 / C-12: can this mini app see the Spixi pages' own storage? Shows only a COUNT of keys named `spixi.*` —
   * never a value. Android: no storage (DomStorage off) · iPhone / Mac: a private store (0 expected) · Windows: C-12 is
   * OPEN (parked), so a number above 0 is the known open item, not a new failure. */
  document.getElementById('ls').onclick = function () {
    var total = 0, spixi = 0;
    try {
      total = window.localStorage.length;
      for (var i = 0; i < total; i++) { var k = window.localStorage.key(i); if (k && k.indexOf('spixi.') === 0) spixi += 1; }
    } catch (e) { show('page data: no access (' + e.name + ')'); return; }
    show('page data: ' + total + ' keys, ' + spixi + ' named spixi.*');
  };
  document.getElementById('cam').onclick = function () {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { show('camera: not available'); return; }
    navigator.mediaDevices.getUserMedia({ video: true }).then(function (s) {
      s.getTracks().forEach(function (t) { t.stop(); });
      show('camera: ALLOWED');
    }).catch(function (e) { show('camera: ' + e.name); });
  };
})();
