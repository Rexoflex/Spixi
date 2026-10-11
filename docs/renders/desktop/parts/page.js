/* page.js — builds the review page from the R registry: viewers, contact sheets, states, flows,
   the X-ray layer and the 1:1 lightbox. Frames mount lazily as they come near the viewport. */
(function () {
  'use strict';
  var DIRS = ['A', 'B', 'C'];
  var SIZES = { 1280: 800, 1440: 900, 1920: 1080 };
  var xrayOn = false;

  function lsGet(k, d) { try { var v = localStorage.getItem('spx-desk-' + k); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem('spx-desk-' + k, v); } catch (e) { /* storage blocked: fine */ } }

  function specOf(box) {
    var d = box.dataset;
    return { d: d.d, v: d.v, w: +d.w, h: +d.h, t: d.t || 'light', os: d.os || 'win', i: d.i != null ? +d.i : null, f: d.f != null ? +d.f : null, s: d.s != null ? +d.s : null };
  }
  function buildFrame(sp) {
    var ctx = { w: sp.w, h: sp.h, t: sp.t, os: sp.os };
    var html;
    try {
      if (sp.v === 'main') html = R[sp.d].main(ctx);
      else if (sp.v === 'state') html = R[sp.d].states[sp.i].build(ctx);
      else if (sp.v === 'flow') html = R[sp.d].flows[sp.f].steps[sp.s].build(ctx);
      else if (sp.v === 'np') html = R.N.items[sp.i].build(ctx);
    } catch (e) { html = '<div style="padding:40px;font:16px monospace;color:red">Render error: ' + K.esc(e.message) + '</div>'; console.error(e); }
    var el = document.createElement('div');
    el.className = 'dk';
    el.setAttribute('data-theme', sp.t);
    el.setAttribute('data-os', sp.os);
    el.style.width = sp.w + 'px';
    el.style.height = sp.h + 'px';
    if (sp.os === 'mac') html = html.replace(/(<span class="k">)(Ctrl|Alt|Shift|Enter|Esc)(<\/span>)/g, function (m, a, k, b) { return a + ({ Ctrl: '⌘', Alt: '⌥', Shift: '⇧', Enter: '↩', Esc: 'esc' })[k] + b; });
    el.innerHTML = html;
    return el;
  }
  function fit(box) {
    var el = box.querySelector(':scope > .fr__in > .dk');
    if (!el) return;
    var sp = specOf(box);
    var inner = box.querySelector(':scope > .fr__in');
    var s = inner.clientWidth / sp.w;
    el.style.transform = 'scale(' + s + ')';
    el._s = s;
  }
  function mount(box) {
    var sp = specOf(box);
    var inner = box.querySelector(':scope > .fr__in');
    if (!inner) { inner = document.createElement('div'); inner.className = 'fr__in'; box.insertBefore(inner, box.firstChild); }
    inner.style.aspectRatio = sp.w + ' / ' + sp.h;
    inner.innerHTML = '';
    var el = buildFrame(sp);
    inner.appendChild(el);
    box._mounted = true;
    fit(box);
    if (xrayOn) xray(el, true);
  }
  function xray(el, on) {
    var old = el.querySelector(':scope > .xr');
    if (old) old.remove();
    if (!on) return;
    var layer = document.createElement('div');
    layer.className = 'xr';
    var s = el._s || 1;
    var base = el.getBoundingClientRect();
    el.querySelectorAll('[data-wv]').forEach(function (n) {
      var r = n.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var b = document.createElement('div');
      b.className = 'xr__b';
      b.setAttribute('data-wv', n.getAttribute('data-wv'));
      b.style.left = ((r.left - base.left) / s) + 'px';
      b.style.top = ((r.top - base.top) / s) + 'px';
      b.style.width = (r.width / s) + 'px';
      b.style.height = (r.height / s) + 'px';
      var l = document.createElement('span');
      l.className = 'xr__l';
      l.textContent = n.getAttribute('data-wvl');
      l.style.fontSize = Math.max(12, Math.min(22, 12 / Math.max(s, 0.35))) + 'px';
      l.style.lineHeight = '1.3';
      b.appendChild(l);
      layer.appendChild(b);
    });
    el.appendChild(layer);
  }
  function setXray(on) {
    xrayOn = on;
    document.documentElement.toggleAttribute('data-xray', on);
    document.querySelectorAll('.dk').forEach(function (el) { xray(el, on); });
    document.querySelectorAll('[data-xray-toggle]').forEach(function (b) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  }

  /* lazy mounting */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting && !e.target._mounted) { mount(e.target); } });
  }, { rootMargin: '1400px 0px' }) : null;
  function watch(box) {
    var sp = specOf(box);
    var inner = document.createElement('div');
    inner.className = 'fr__in';
    inner.style.aspectRatio = sp.w + ' / ' + sp.h;
    box.insertBefore(inner, box.firstChild);
    if (io) io.observe(box); else mount(box);
  }
  var ro = 'ResizeObserver' in window ? new ResizeObserver(function (es) {
    es.forEach(function (e) {
      var box = e.target.closest('.fr');
      if (box && box._mounted) { fit(box); var el = box.querySelector('.dk'); if (xrayOn && el) xray(el, true); }
    });
  }) : null;

  /* ------------------------------------------------------------------ markup helpers */
  function frBox(attrs, cap, cls) {
    var a = Object.keys(attrs).map(function (k) { return 'data-' + k + '="' + attrs[k] + '"'; }).join(' ');
    return '<figure class="fr ' + (cls || '') + '" ' + a + ' tabindex="0">' + (cap ? '<figcaption>' + cap + '</figcaption>' : '') + '</figure>';
  }
  function seg(name, opts, cur) {
    return '<span class="seg" role="group" aria-label="' + name + '">' + opts.map(function (o) { return '<button type="button" data-' + name + '="' + o[0] + '" aria-pressed="' + (String(o[0]) === String(cur) ? 'true' : 'false') + '">' + o[1] + '</button>'; }).join('') + '</span>';
  }

  function buildDir(d) {
    var dir = R[d];
    var host = document.getElementById('dir-' + d);
    if (!host) return;
    var vOs = lsGet(d + '-os', 'win'), vW = lsGet(d + '-w', '1440'), vT = lsGet(d + '-t', 'light');
    var h = '';
    /* viewer */
    h += '<div class="viewer" id="viewer-' + d + '"><div class="viewer__bar">' + seg('os', [['win', 'Windows 11'], ['mac', 'macOS 27']], vOs) + seg('w', [[1280, '1280 × 800'], [1440, '1440 × 900'], [1920, '1920 × 1080']], vW) + seg('t', [['light', 'Light'], ['dark', 'Dark']], vT) +
      '<button type="button" class="tgl" data-xray-toggle aria-pressed="false">X-ray</button><button type="button" class="tgl" data-zoom>Open 1:1</button></div>' +
      frBox({ d: d, v: 'main', w: vW, h: SIZES[vW], t: vT, os: vOs }, '', 'fr--viewer') + '</div>';
    /* contact sheet: every size × theme × platform */
    h += '<h3 class="sub">All sizes, both themes, both platforms</h3><div class="sheet">';
    [['win', 'light'], ['win', 'dark'], ['mac', 'light'], ['mac', 'dark']].forEach(function (r) {
      h += '<div class="sheet__row"><span class="sheet__lab">' + (r[0] === 'win' ? 'Windows 11' : 'macOS 27') + ' · ' + r[1] + '</span>';
      [1280, 1440, 1920].forEach(function (w) { h += frBox({ d: d, v: 'main', w: w, h: SIZES[w], t: r[1], os: r[0] }, w + ' × ' + SIZES[w], 'fr--thumb'); });
      h += '</div>';
    });
    h += '</div>';
    /* states + flows */
    var fOs = lsGet(d + '-fos', 'win'), fT = lsGet(d + '-ft', 'light');
    h += '<div class="flowbar" data-dir="' + d + '"><span class="flowbar__t">States and flows at 1440 × 900</span>' + seg('fos', [['win', 'Windows 11'], ['mac', 'macOS 27']], fOs) + seg('ft', [['light', 'Light'], ['dark', 'Dark']], fT) + '</div>';
    h += '<h3 class="sub">More states</h3><div class="grid2">';
    dir.states.forEach(function (st, i) {
      h += '<div class="step">' + frBox({ d: d, v: 'state', i: i, w: 1440, h: 900, t: fT, os: fOs }, '', 'fr--flow') + '<div class="step__cap"><b>' + st.title + '</b><p>' + st.cap + '</p></div></div>';
    });
    h += '</div>';
    dir.flows.forEach(function (fl, fi) {
      h += '<h3 class="sub" id="' + d.toLowerCase() + '-' + fl.id + '">Flow ' + (fi + 1) + ' · ' + fl.title + '</h3><ol class="grid2 flow">';
      fl.steps.forEach(function (st, si) {
        h += '<li class="step">' + frBox({ d: d, v: 'flow', f: fi, s: si, w: 1440, h: 900, t: fT, os: fOs }, '', 'fr--flow') + '<div class="step__cap"><span class="step__n">' + (si + 1) + '</span><p>' + st.cap + '</p></div></li>';
      });
      h += '</ol>';
    });
    host.innerHTML = h;
    host.querySelectorAll('.fr').forEach(watch);
    host.querySelectorAll('.fr__in').forEach(function (x) { if (ro) ro.observe(x); });

    /* viewer controls */
    var vbox = host.querySelector('.fr--viewer');
    host.querySelector('.viewer__bar').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-xray-toggle')) { setXray(!xrayOn); return; }
      if (b.hasAttribute('data-zoom')) { openBox(specOf(vbox)); return; }
      ['os', 'w', 't'].forEach(function (k) {
        if (b.dataset[k] != null) {
          b.parentNode.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          vbox.dataset[k] = b.dataset[k];
          if (k === 'w') vbox.dataset.h = SIZES[b.dataset.w];
          lsSet(d + '-' + k, b.dataset[k]);
        }
      });
      mount(vbox);
    });
    /* sheet → viewer */
    host.querySelectorAll('.fr--thumb').forEach(function (t) {
      t.addEventListener('click', function () {
        var sp = specOf(t);
        vbox.dataset.os = sp.os; vbox.dataset.w = sp.w; vbox.dataset.h = sp.h; vbox.dataset.t = sp.t;
        host.querySelectorAll('.viewer__bar button').forEach(function (x) {
          ['os', 'w', 't'].forEach(function (k) { if (x.dataset[k] != null) x.setAttribute('aria-pressed', String(x.dataset[k]) === String(vbox.dataset[k]) ? 'true' : 'false'); });
        });
        mount(vbox);
        document.getElementById('viewer-' + d).scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    /* flow bar */
    host.querySelector('.flowbar').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      var key = b.dataset.fos != null ? 'os' : b.dataset.ft != null ? 't' : null;
      if (!key) return;
      var val = b.dataset.fos != null ? b.dataset.fos : b.dataset.ft;
      b.parentNode.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      lsSet(d + (key === 'os' ? '-fos' : '-ft'), val);
      host.querySelectorAll('.fr--flow').forEach(function (f) { f.dataset[key] = val; if (f._mounted) mount(f); });
    });
  }

  /* the "not a mobile port" section + the overview cards */
  function buildStatic() {
    document.querySelectorAll('[data-autofr]').forEach(function (box) { watch(box); });
    document.querySelectorAll('.fr__in').forEach(function (x) { if (ro && !x._ro) { ro.observe(x); x._ro = 1; } });
    var np = document.getElementById('np-bar');
    if (np) np.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b || b.dataset.npt == null) return;
      np.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      document.querySelectorAll('.fr--np').forEach(function (f) { f.dataset.t = b.dataset.npt; if (f._mounted) mount(f); });
    });
  }

  /* lightbox */
  var lb;
  function openBox(sp) {
    if (!lb) {
      lb = document.createElement('div');
      lb.className = 'lb';
      lb.innerHTML = '<div class="lb__bar"><span class="lb__t"></span><button type="button" class="tgl" data-lb-fit aria-pressed="true">Fit</button><button type="button" class="tgl" data-lb-11 aria-pressed="false">1:1</button><button type="button" class="tgl" data-xray-toggle aria-pressed="' + xrayOn + '">X-ray</button><button type="button" class="tgl" data-lb-close>Close</button></div><div class="lb__stage"></div>';
      document.body.appendChild(lb);
      lb.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (e.target === lb || (b && b.hasAttribute('data-lb-close'))) { lb.hidden = true; document.body.style.overflow = ''; return; }
        if (b && b.hasAttribute('data-xray-toggle')) { setXray(!xrayOn); return; }
        if (b && (b.hasAttribute('data-lb-fit') || b.hasAttribute('data-lb-11'))) {
          var one = b.hasAttribute('data-lb-11');
          lb.querySelector('[data-lb-fit]').setAttribute('aria-pressed', one ? 'false' : 'true');
          lb.querySelector('[data-lb-11]').setAttribute('aria-pressed', one ? 'true' : 'false');
          lb.classList.toggle('lb--11', one);
          var el = lb.querySelector('.dk');
          layoutLb(el, one);
        }
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lb && !lb.hidden) { lb.hidden = true; document.body.style.overflow = ''; } });
    }
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    lb.classList.remove('lb--11');
    lb.querySelector('[data-lb-fit]').setAttribute('aria-pressed', 'true');
    lb.querySelector('[data-lb-11]').setAttribute('aria-pressed', 'false');
    lb.querySelector('.lb__t').textContent = (sp.d ? sp.d + ' · ' : '') + sp.w + ' × ' + sp.h + ' · ' + (sp.os === 'mac' ? 'macOS 27' : 'Windows 11') + ' · ' + sp.t;
    var stage = lb.querySelector('.lb__stage');
    stage.innerHTML = '';
    var holder = document.createElement('div');
    holder.className = 'lb__holder';
    var el = buildFrame(sp);
    holder.appendChild(el);
    stage.appendChild(holder);
    layoutLb(el, false);
  }
  function layoutLb(el, one) {
    var stage = lb.querySelector('.lb__stage');
    var holder = el.parentNode;
    var w = parseFloat(el.style.width), h = parseFloat(el.style.height);
    var s = one ? 1 : Math.min((stage.clientWidth - 32) / w, (stage.clientHeight - 32) / h, 1);
    el.style.transform = 'scale(' + s + ')';
    el._s = s;
    holder.style.width = (w * s) + 'px';
    holder.style.height = (h * s) + 'px';
    if (xrayOn) requestAnimationFrame(function () { xray(el, true); });
  }
  document.addEventListener('click', function (e) {
    var f = e.target.closest('.fr');
    if (!f || f.classList.contains('fr--viewer') || f.classList.contains('fr--thumb')) return;
    if (e.target.closest('button')) return;
    openBox(specOf(f));
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && document.activeElement && document.activeElement.classList.contains('fr') && !document.activeElement.classList.contains('fr--viewer')) {
      if (document.activeElement.classList.contains('fr--thumb')) document.activeElement.click(); else openBox(specOf(document.activeElement));
    }
  });

  /* tabs */
  function selectTab(id) {
    document.querySelectorAll('.tabs [role="tab"]').forEach(function (t) { t.setAttribute('aria-selected', t.dataset.tab === id ? 'true' : 'false'); });
    document.querySelectorAll('.tabpanel').forEach(function (p) { p.hidden = p.id !== 'panel-' + id; });
    lsSet('tab', id);
    var p = document.getElementById('panel-' + id);
    if (p && !p._built && R[id]) { buildDir(id); p._built = true; }
    if (p) p.querySelectorAll('.fr').forEach(function (b) { if (b._mounted) fit(b); });
  }
  window.SPX_selectTab = selectTab;
  window.SPX_buildFrame = buildFrame;

  function init() {
    buildStatic();
    document.querySelectorAll('.tabs [role="tab"]').forEach(function (t) {
      t.addEventListener('click', function () { selectTab(t.dataset.tab); var top = document.getElementById('tabs-anchor'); if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: 'start' }); });
    });
    document.querySelectorAll('[data-goto]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); selectTab(a.dataset.goto); document.getElementById('tabs-anchor').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    });
    document.querySelectorAll('[data-xray-toggle]').forEach(function (b) { if (!b.closest('.viewer__bar') && !b.closest('.lb')) b.addEventListener('click', function () { setXray(!xrayOn); }); });
    var hash = (location.hash || '').replace('#', '').toUpperCase();
    var start = ['A', 'B', 'C', 'COMPARE'].indexOf(hash) >= 0 ? (hash === 'COMPARE' ? 'compare' : hash) : lsGet('tab', 'A');
    selectTab(start);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
