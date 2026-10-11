/* kit.js — building blocks for the desktop frames. Each function returns an HTML string.
   Icons: the real Spixi set (src/components/icons.js, inlined at build time as window.SPX_ICONS)
   plus a few render-only extras below (stroke 1.5, the same weight). Platform: ctx.os = 'win' | 'mac'.
   X-ray: K.wv(kind, label) marks a region — kind = shell | chat | apps | native. */

var K = (function () {
  'use strict';
  var EXTRA = {
    keyboard: '<rect x="2.75" y="6.75" width="18.5" height="10.5" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6"/>',
    command: '<path d="M7 9a2 2 0 1 1 2 -2v10a2 2 0 1 1 -2 -2h10a2 2 0 1 1 -2 2v-10a2 2 0 1 1 2 2h-10"/>',
    columns: '<rect x="3.75" y="4.75" width="16.5" height="14.5" rx="2"/><path d="M12 4.75v14.5"/>',
    'side-r': '<rect x="3.75" y="4.75" width="16.5" height="14.5" rx="2"/><path d="M14.5 4.75v14.5"/>',
    'side-l': '<rect x="3.75" y="4.75" width="16.5" height="14.5" rx="2"/><path d="M9.5 4.75v14.5"/>',
    popout: '<path d="M12 4.75h-6a2 2 0 0 0 -2 2v10.5a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-6"/><path d="M14.5 4.75h4.75v4.75M19.25 4.75l-7 7"/>',
    folder: '<path d="M5 4.75h4l3 3h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10.5a2 2 0 0 1 2 -2z"/>',
    filter: '<path d="M4.75 5.75h14.5l-5.5 6.5v5.5l-3.5 1.5v-7z"/>',
    sort: '<path d="M8 9l4 -4l4 4M16 15l-4 4l-4 -4"/>',
    inbox: '<rect x="4.75" y="4.75" width="14.5" height="14.5" rx="2"/><path d="M4.75 13.25h3.5l2.25 2.5h3l2.25 -2.5h3.5"/>',
    building: '<path d="M3.75 20.25h16.5M5.75 20.25v-15a2 2 0 0 1 2 -2h8.5a2 2 0 0 1 2 2v15M9.5 8h1M9.5 12h1M9.5 16h1M13.5 8h1M13.5 12h1M13.5 16h1"/>',
    robot: '<rect x="5.75" y="8.75" width="12.5" height="10.5" rx="3"/><path d="M12 8.75v-3.5M10 13.5v.01M14 13.5v.01M10 16.5h4M3.75 12.5v3M20.25 12.5v3"/><circle cx="12" cy="4.5" r="1"/>',
    receipt: '<path d="M5.75 20.25v-15a2 2 0 0 1 2 -2h8.5a2 2 0 0 1 2 2v15l-2.75 -1.75l-2 1.75l-1.5 -1.75l-1.5 1.75l-2 -1.75z"/><path d="M9.25 8.25h5.5M9.25 12h5.5"/>',
    knight: '<path d="M8 16.25l-1.4 .7a1 1 0 0 0 -.6 .9v2.4h12v-2.4a1 1 0 0 0 -.6 -.9l-1.4 -.7z"/><path d="M9 3.75l1 2.5l-3.5 2.1a1 1 0 0 0 .5 1.9h3l-2 5.9h7.9l.1 -5c0 -3 -1.1 -6 -4 -7c-1.9 -.7 -2.9 -.4 -3 -.4z"/>',
    table: '<rect x="3.75" y="4.75" width="16.5" height="14.5" rx="2"/><path d="M3.75 9.75h16.5M9.5 9.75v9.5"/>',
    sparkles: '<path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z"/>',
    chart: '<path d="M3.75 19.25h16.5M4.75 15.25l4 -6l4 2l4 -5l3 3.5"/>',
    tag: '<path d="M3.75 6.75v5l8 8a2.4 2.4 0 0 0 3.4 0l4.6 -4.6a2.4 2.4 0 0 0 0 -3.4l-8 -8h-5a3 3 0 0 0 -3 3z"/><circle cx="8" cy="8" r="1"/>',
    note: '<path d="M13 19.75l6.75 -6.75M13 19.75v-5.75a1 1 0 0 1 1 -1h5.75v-7a2 2 0 0 0 -2 -2h-12a2 2 0 0 0 -2 2v11.75a2 2 0 0 0 2 2z"/>',
    archive: '<rect x="3.75" y="4.25" width="16.5" height="4" rx="1.5"/><path d="M5.25 8.25v9.5a2 2 0 0 0 2 2h9.5a2 2 0 0 0 2 -2v-9.5M10 12.25h4"/>',
    server: '<rect x="3.75" y="4.25" width="16.5" height="7" rx="2.5"/><rect x="3.75" y="12.75" width="16.5" height="7" rx="2.5"/><path d="M7.5 7.75v.01M7.5 16.25v.01"/>',
    plus: '<path d="M12 5.25v13.5M5.25 12h13.5"/>',
    upload: '<path d="M4.75 16.75v2a1.5 1.5 0 0 0 1.5 1.5h11.5a1.5 1.5 0 0 0 1.5 -1.5v-2M7.75 8.75l4.25 -4.25l4.25 4.25M12 4.5v11.5"/>',
    'check-circle': '<circle cx="12" cy="12" r="8.25"/><path d="M8.75 12.25l2.25 2.25l4.25 -4.5"/>',
    'shield-check': '<path d="M12 3.25a12 12 0 0 0 8.25 3a12 12 0 0 1 -8.25 14.5a12 12 0 0 1 -8.25 -14.5a12 12 0 0 0 8.25 -3z"/><path d="M9 12l2 2l4 -4"/>',
    bolt: '<path d="M13 3.25v7h6l-8 10.5v-7h-6z"/>',
    enter: '<path d="M18.25 6.25v5.5a3 3 0 0 1 -3 3h-10.5M8.75 10.75l-4 4l4 4"/>',
    clock: '<circle cx="12" cy="12" r="8.25"/><path d="M12 7.75v4.25l2.75 2.75"/>',
    'arrow-up': '<path d="M12 18.75v-13.5M6.75 10.5l5.25 -5.25l5.25 5.25"/>',
    'arrow-down': '<path d="M12 5.25v13.5M6.75 13.5l5.25 5.25l5.25 -5.25"/>',
    calendar: '<rect x="4.25" y="5.25" width="15.5" height="14.5" rx="2"/><path d="M15.5 3.25v4M8.5 3.25v4M4.25 10.25h15.5"/>',
    pause: '<rect x="6.75" y="5.25" width="3.5" height="13.5" rx="1"/><rect x="13.75" y="5.25" width="3.5" height="13.5" rx="1"/>',
    play: '<path d="M7.75 4.75v14.5l11.5 -7.25z"/>',
    hand: '<path d="M8.25 13v-7.5a1.5 1.5 0 0 1 3 0v6.5M11.25 5.5v-1.25a1.5 1.5 0 0 1 3 0v7.75M14.25 5.5a1.5 1.5 0 0 1 3 0v6.5M17.25 8.5a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1 -6 6h-2a6 6 0 0 1 -4.9 -2.6l-3 -4.6a1.6 1.6 0 0 1 2.5 -2l1.4 1.6"/>',
    eye2: '<circle cx="12" cy="12" r="2.25"/><path d="M20.75 12c-2.25 3.75 -5.25 5.75 -8.75 5.75s-6.5 -2 -8.75 -5.75c2.25 -3.75 5.25 -5.75 8.75 -5.75s6.5 2 8.75 5.75"/>',
    pulse: '<path d="M3.75 12h4l2.5 -6l3.5 12l2.5 -6h4"/>',
    wifi: '<path d="M12 18.25h.01M9.2 15.4a4 4 0 0 1 5.6 0M6.4 12.6a8 8 0 0 1 11.2 0M3.6 9.8a12 12 0 0 1 16.8 0"/>',
    volume2: '<path d="M15 8.5a5 5 0 0 1 0 7M5.75 15.25h-2v-6.5h2l4.5 -4.25v15z"/>',
    battery: '<rect x="3.75" y="7.75" width="15" height="8.5" rx="2"/><path d="M20.75 10.75v2.5M6.25 10.25v3.5M9.25 10.25v3.5M12.25 10.25v3.5"/>',
    chevup: '<path d="M6.75 14.25l5.25 -5.25l5.25 5.25"/>',
    winstart: '<path d="M4 4h7.4v7.4h-7.4zM12.6 4h7.4v7.4h-7.4zM4 12.6h7.4v7.4h-7.4zM12.6 12.6h7.4v7.4h-7.4z" fill="currentColor" stroke="none"/>'
  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function ic(name, size, cls, style) {
    size = size || 20;
    var real = window.SPX_ICONS && window.SPX_ICONS[name];
    var a = ' width="' + size + '" height="' + size + '"' + (cls ? ' class="' + cls + '"' : '') + (style ? ' style="' + style + '"' : '') + ' aria-hidden="true"';
    if (real) return '<svg viewBox="' + real.v + '" fill="currentColor"' + a + '>' + real.b + '</svg>';
    var ex = EXTRA[name];
    if (!ex) { console.warn('kit: no icon ' + name); ex = '<circle cx="12" cy="12" r="6"/>'; }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"' + a + '>' + ex + '</svg>';
  }

  /* X-ray region attributes */
  function wv(kind, label) { return ' data-wv="' + kind + '" data-wvl="' + esc(label) + '"'; }

  /* ---------------------------------------------------------------- avatars */
  function person(id) { return D.people[id] || D.cust[id] || D.team[id] || (id === 'me' ? D.me : null) || { name: id, ini: '?', g: 1 }; }
  function av(p, size, opts) {
    if (typeof p === 'string') p = person(p);
    opts = opts || {};
    var s = size || 48;
    var html = '<span class="dk-av' + (p.kind === 'group' || p.kind === 'bot' || opts.sq ? ' dk-av--sq' : '') + '" style="--av:' + s + 'px;background:var(--disc-grad-' + (p.g || 1) + ')">';
    if (p.kind === 'agent') html += ic('robot', Math.round(s * 0.52));
    else html += esc(p.ini);
    if (p.online && !opts.noDot && s >= 28) html += '<i class="dk-av__on"></i>';
    if (p.kind === 'agent' && opts.badge && s >= 32) html += '<i class="dk-av__bot">' + ic('sparkles', 11) + '</i>';
    return html + '</span>';
  }
  function grad(p) { if (typeof p === 'string') p = person(p); return 'var(--disc-grad-' + (p.g || 1) + ')'; }

  /* ---------------------------------------------------------------- chrome */
  function winTitle(ctx, o) {
    o = o || {};
    var left = o.left || ('<span class="dk-tb__brand">' + ic('logo', 18) + '<span class="dk-tb__word">Spixi</span></span>' + (o.ctx ? '<span class="dk-tb__ctx">' + esc(o.ctx) + '</span>' : ''));
    var mid = o.search === false ? '' : '<div class="dk-tb__mid"' + wv('native', 'Title bar · native (WinUI TitleBar) — the search box only opens the palette') + '><div class="dk-search" style="width:' + (ctx.w >= 1440 ? 520 : 420) + 'px">' + ic('search', 16) + '<span>' + esc(o.search || 'Search chats, people, files, actions') + '</span><span class="kk"><span class="k">Ctrl</span><span class="k">K</span></span></div></div>';
    return '<div class="dk-tb"' + (o.search === false ? wv('native', 'Title bar · native') : '') + '>' + left + mid +
      '<div class="dk-tb__right row" style="margin-inline-start:auto;gap:10px">' + (o.right || '') + '</div>' +
      '<div class="dk-tb__win" style="margin-inline-start:6px">' +
      '<span><svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 5h10" stroke="currentColor"/></svg></span>' +
      '<span><svg width="10" height="10" viewBox="0 0 10 10"><rect x=".5" y=".5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor"/></svg></span>' +
      '<span><svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0l10 10M10 0l-10 10" stroke="currentColor"/></svg></span></div></div>';
  }
  function lights(dim) {
    return '<span class="mac-lights' + (dim ? ' dim' : '') + '"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></span>';
  }

  /* frame(ctx, {nav, body, over, title}) — the whole window */
  function frame(ctx, o) {
    var h = '';
    if (ctx.os === 'mac') {
      h += '<div class="dk-body mac">' + (o.nav || '') + '<div class="dk-mc">' + o.body + '</div></div>';
    } else {
      h += winTitle(ctx, o.title || {});
      h += '<div class="dk-body win">' + (o.nav || '') + '<div class="dk-layer">' + o.body + '</div></div>';
    }
    return h + (o.over || '');
  }

  /* Windows rail (NavigationView, LeftCompact) — items [{ic, label, cur, badge}] */
  function rail(items, bottom) {
    var h = '<nav class="dk-rail"' + wv('shell', 'Navigation · shell WebView (trusted)') + '>';
    items.forEach(function (it) {
      h += '<span class="dk-rail__it"' + (it.cur ? ' aria-current="page"' : '') + '>' + ic(it.cur && it.icf ? it.icf : it.ic, 22) + '<span>' + esc(it.label) + '</span>' +
        (it.badge ? '<b class="dk-rail__badge">' + esc(it.badge) + '</b>' : '') + '</span>';
    });
    h += '<span class="dk-rail__sp"></span>' + (bottom || '') + '</nav>';
    return h;
  }

  /* macOS sidebar (source list) — sections [{title, items:[{ic|av, color, label, count, cur}]}] */
  function sidebar(ctx, sections, foot, o) {
    o = o || {};
    var h = '<nav class="dk-msb"' + wv('shell', 'Sidebar · shell WebView (trusted)') + ' style="width:' + (o.w || 220) + 'px">' +
      '<div class="dk-msb__top">' + lights() + '<span class="grow"></span><span class="mac-tbtn">' + ic('side-l', 18) + '</span></div><div class="dk-msb__s">';
    sections.forEach(function (s) {
      if (s.title) h += '<div class="dk-msb__h">' + esc(s.title) + '</div>';
      s.items.forEach(function (it) {
        var lead = it.av ? av(it.av, 20, { noDot: true }) : '<i class="dk-msb__ic" style="color:' + (it.color || 'var(--icon-action-default)') + '">' + ic(it.ic, 18) + '</i>';
        h += '<div class="dk-msb__it"' + (it.cur ? ' aria-current="page"' : '') + '>' + lead + '<span class="grow ell">' + esc(it.label) + '</span>' +
          (it.count ? '<span class="dk-msb__n' + (it.hot ? ' hot' : '') + '">' + esc(it.count) + '</span>' : '') + '</div>';
      });
    });
    return h + '</div>' + (foot || '') + '</nav>';
  }

  /* a column header: Windows = pane header, macOS = a slice of the unified toolbar */
  function colHead(ctx, left, right, o) {
    o = o || {};
    return '<div class="dk-ch' + (ctx.os === 'mac' ? ' dk-ch--mac' : '') + (o.cls ? ' ' + o.cls : '') + '">' + left + '<span class="grow"></span>' + (right || '') + '</div>';
  }
  function tbtn(ctx, name, o) {
    o = o || {};
    if (ctx.os === 'mac') return '<span class="mac-tbtn' + (o.on ? ' on' : '') + '">' + ic(name, 18) + '</span>';
    return '<span class="dk-ib' + (o.on ? ' dk-ib--on' : '') + (o.a ? ' dk-ib--a' : '') + '">' + ic(name, 20) + '</span>';
  }
  function tgroup(ctx, names, on) {
    if (ctx.os === 'mac') return '<span class="mac-cap">' + names.map(function (n) { return '<span' + (n === on ? ' class="on"' : '') + '>' + ic(n, 17) + '</span>'; }).join('') + '</span>';
    return names.map(function (n) { return tbtn(ctx, n, { on: n === on }); }).join('');
  }

  /* ---------------------------------------------------------------- the desktop chat list */
  /* rows: [{p, ex, t, u, st, muted, pin, agent, icon, draft, typing}] o: {sel, hover, focus, multi:[], drop, density, sections} */
  function chatRow(r, i, o) {
    var p = person(r.p), compact = o.density === 'compact';
    var attrs = '';
    if (o.sel === r.p) attrs += ' aria-current="true"';
    if (r.u) attrs += ' data-unread';
    if (r.muted) attrs += ' data-muted';
    if (o.focus === r.p) attrs += ' data-focus';
    if (o.drop === r.p) attrs += ' data-drop';
    if (o.multi && o.multi.indexOf(r.p) >= 0) attrs += ' data-multi';
    var hover = o.hover === r.p;
    if (hover) attrs += ' data-hover';
    var ex = r.typing ? '<span style="color:var(--text-accent)">typing…</span>' :
      r.draft ? '<span style="color:var(--text-error)">Draft:</span> <span class="ell">' + esc(r.draft) + '</span>' :
      (r.icon ? ic(r.icon, 15) : '') + '<span class="ell">' + esc(r.ex) + '</span>';
    var tick = r.st === 'read' ? '<span style="color:var(--icon-tick-read)">' + ic('checks', 16) + '</span>' : r.st === 'delivered' ? '<span style="color:var(--icon-neutral-03)">' + ic('checks', 16) + '</span>' : '';
    var right;
    if (hover) right = '<span class="dk-cr__acts">' + (o.hoverActs || ['pin', 'bell-off', 'popout', 'dots']).map(function (n) { return ic(n, 16); }).join('') + '</span>';
    else if (compact) right = '<span class="dk-cr__t">' + tick + esc(r.t) + '</span>' + (r.u ? '<span class="dk-ind' + (r.muted ? ' dk-ind--mute' : '') + '">' + r.u + '</span>' : '');
    else right = '<span class="dk-cr__t">' + tick + esc(r.t) + '</span>' + (r.u ? '<span class="dk-ind' + (r.muted ? ' dk-ind--mute' : '') + '">' + r.u + '</span>' : (r.pin ? '<span class="ic" style="color:var(--icon-neutral-03)">' + ic('pinned', 14) + '</span>' : '<span style="height:20px"></span>'));
    var sel = o.multi ? '<span class="dk-chk' + (o.multi.indexOf(r.p) >= 0 ? ' on' : '') + '">' + (o.multi.indexOf(r.p) >= 0 ? ic('check', 14) : '') + '</span>' : '';
    if (compact) {
      return '<div class="dk-cr dk-cr--c"' + attrs + '>' + sel + av(p, 24, { noDot: true }) +
        '<span class="dk-cr__n"><span class="ell">' + esc(p.name) + '</span></span><span class="dk-cr__x grow">' + ex + '</span>' +
        '<span class="dk-cr__r row">' + right + '</span></div>';
    }
    return '<div class="dk-cr"' + attrs + '>' + sel + av(p, o.av || 40, { badge: true }) + '<div class="dk-cr__c"><div class="dk-cr__n"><span class="ell">' + esc(p.name) + '</span>' +
      (r.agent ? '<span class="dk-tag dk-tag--agent">Agent</span>' : '') + (r.muted ? '<span class="ic" style="color:var(--icon-neutral-03)">' + ic('bell-off', 14) + '</span>' : '') +
      '</div><div class="dk-cr__x">' + ex + '</div></div><div class="dk-cr__r">' + right + '</div></div>';
  }
  function chatList(ctx, o) {
    o = o || {};
    var rows = o.rows || D.chats;
    var h = '';
    var secs = o.sections || [
      { title: 'Pinned', rows: rows.filter(function (r) { return r.pin; }) },
      { title: 'Chats', rows: rows.filter(function (r) { return !r.pin; }) }
    ];
    secs.forEach(function (s) {
      if (s.title) h += '<div class="dk-sech">' + ic('chevron-down', 14) + '<span>' + esc(s.title) + '</span><span class="mut">' + s.rows.length + '</span></div>';
      s.rows.forEach(function (r, i) { h += chatRow(r, i, o); });
    });
    return h;
  }
  /* the list pane (header + filter + list) */
  function listPane(ctx, o) {
    o = o || {};
    var w = o.w || 320;
    var head;
    var filt = o.filters || ['All', 'Unread 6', 'Groups', 'Agents'];
    if (ctx.os === 'mac') {
      head = colHead(ctx, '<div class="col"><span class="mac-title">' + esc(o.title || 'Chats') + '</span><span class="mac-sub">' + esc(o.sub || '6 unread') + '</span></div>', tbtn(ctx, 'filter') + tbtn(ctx, 'pencil')) +
        '<div class="mac-search">' + ic('search', 15) + '<span>Search</span></div>' +
        '<div class="mac-scope">' + filt.map(function (f, i) { return '<span' + (i === (o.filterOn || 0) ? ' aria-pressed="true"' : '') + '>' + esc(f) + '</span>'; }).join('') + '</div>';
    } else {
      head = colHead(ctx, '<span class="h-sm">' + esc(o.title || 'Chats') + '</span>', tbtn(ctx, 'filter') + tbtn(ctx, 'message-plus', { a: true })) +
        '<div class="win-sel">' + filt.map(function (f, i) { return '<span' + (i === (o.filterOn || 0) ? ' aria-selected="true"' : '') + '>' + esc(f) + '</span>'; }).join('') + '</div>';
    }
    var bulk = o.multi ? '<div class="dk-bulk"><b>' + o.multi.length + ' selected</b><span class="grow"></span>' + ['checks', 'bell-off', 'archive', 'dots'].map(function (n) { return '<span class="dk-ib" style="width:30px;height:30px;color:var(--icon-action-default)">' + ic(n, 17) + '</span>'; }).join('') + '</div>' : '';
    return '<section class="dk-pane" style="width:' + w + 'px"' + wv('shell', o.wvl || 'Chat list · shell WebView (trusted, textContent only)') + '>' + head + bulk +
      '<div class="dk-list">' + (o.inner || chatList(ctx, o)) + '</div>' + (o.foot || '') + '</section>';
  }

  /* ---------------------------------------------------------------- conversation */
  function bubbleMeta(m) {
    var tick = m.st === 'read' ? '<span style="color:var(--icon-bubble-read)">' + ic('checks', 14) + '</span>' : m.st ? ic('checks', 14) : '';
    return '<span class="dk-bub__meta">' + esc(m.t) + tick + '</span>';
  }
  function msg(m, o) {
    o = o || {};
    if (m.k === 'day') return '<div class="dk-day">' + esc(m.text) + '</div>';
    if (m.k === 'note') return '<div class="dk-note"><b>' + ic('note', 14, '', 'display:inline;vertical-align:-2px') + ' Team note · ' + esc(person(m.who).name) + '</b> · only your team sees this<br>' + esc(m.text) + '</div>';
    var out = m.k === 'out' || m.dir === 'out';
    var cls = 'dk-m ' + (out ? 'dk-m--out' : 'dk-m--in') + (m.first ? ' first' : '');
    var inner;
    if (m.k === 'in' || m.k === 'out') {
      var who = o.group && !out && m.first ? '<div class="dk-bub__who" style="background-image:' + grad(m.who) + '">' + esc(person(m.who).name) + '</div>' : '';
      inner = '<div class="dk-bub' + (m.hl ? ' dk-bub--hl' : '') + '">' + who + esc(m.text) + bubbleMeta(m) + '</div>';
    } else if (m.k === 'file') {
      inner = '<div class="dk-card' + (m.hl ? ' dk-bub--hl' : '') + '" style="width:290px;padding:10px 12px"><div class="dk-file">' + ftype(m.name, 34) + '<div class="grow col" style="min-width:0"><span class="l-sm ell">' + esc(m.name) + '</span><span class="b-xs mut">' + esc(m.meta) + ' · ' + esc(m.t) + '</span></div><span class="dk-med" style="width:34px;height:34px">' + ic('download', 18) + '</span></div></div>';
    } else if (m.k === 'req') {
      var paid = m.paid;
      inner = '<div class="dk-card"><div class="dk-card__hd">' + ic(m.icon || 'wallet', 16, 'ic-a') + esc(m.title) + '<span class="t">' + esc(m.t) + '</span></div>' +
        '<div class="dk-amt">' + esc(m.amount) + '<small>IXI</small></div><div class="dk-card__note">' + esc(m.note) + '</div>' +
        (paid ? '<span class="dk-status dk-status--' + (paid === 'pending' ? 'wait' : 'ok') + '">' + ic(paid === 'pending' ? 'clock' : 'check-circle', 16) + (paid === 'pending' ? 'Paid · confirming' : 'Paid') + '</span>' :
          '<div class="dk-card__btns"><span class="dk-btn dk-btn--out dk-btn--w">Decline</span><span class="dk-btn dk-btn--fill dk-btn--w' + (m.hot ? ' hot' : '') + '">' + ic('check', 16) + (m.payLabel || 'Pay') + '</span></div>') + '</div>';
    } else if (m.k === 'sent') {
      inner = '<div class="dk-card"><div class="dk-card__hd">' + ic('arrow-up-right', 16, 'ic-a') + 'You sent<span class="t">' + esc(m.t) + '</span></div><div class="dk-amt">' + esc(m.amount) + '<small>IXI</small></div><div class="dk-card__note">' + esc(m.note) + '</div>' +
        '<span class="dk-status dk-status--' + (m.state === 'ok' ? 'ok' : 'wait') + '">' + ic(m.state === 'ok' ? 'check-circle' : 'clock', 16) + (m.state === 'ok' ? 'Confirmed' : 'Waiting for the block · about 30 s') + '</span></div>';
    } else if (m.k === 'app') {
      inner = '<div class="dk-card"><div class="dk-card__hd"><span class="dk-med dk-med--sq" style="width:32px;height:32px;background:' + (m.bg || 'var(--disc-grad-4)') + ';color:#fff">' + ic(m.icon || 'apps', 18) + '</span><div class="col grow"><span>' + esc(m.title) + '</span><span class="b-xs mut" style="font-weight:400">' + esc(m.sub) + '</span></div><span class="t">' + esc(m.t) + '</span></div>' +
        (m.body ? '<div class="dk-card__note" style="color:var(--text-neutral-01)">' + m.body + '</div>' : '') +
        (m.btn ? '<div class="dk-card__btns">' + (m.btn2 ? '<span class="dk-btn dk-btn--out dk-btn--w">' + esc(m.btn2) + '</span>' : '') + '<span class="dk-btn dk-btn--fill dk-btn--w">' + esc(m.btn) + '</span></div>' : '') + '</div>';
    }
    if (o.group && !out && (m.k === 'in')) {
      return '<div class="dk-mrow' + (m.first ? ' first' : '') + '" style="' + (m.first ? 'margin-top:8px' : '') + '">' + (m.first ? av(m.who, 28, { noDot: true }) : '<span style="width:28px;flex:none"></span>') + '<div class="' + cls + '" style="margin-top:0">' + inner + '</div></div>';
    }
    return '<div class="' + cls + '">' + inner + '</div>';
  }
  function thread(list, o) { return list.map(function (m) { return msg(m, o); }).join(''); }

  function convHead(ctx, p, o) {
    o = o || {};
    p = person(p);
    var sub = p.kind === 'group' ? p.members + ' members' : p.kind === 'agent' ? 'Agent · runs on your server' : p.org ? p.org + (p.online ? ' · online' : '') : (p.online ? 'online' : 'last seen today 12:40');
    var left = '<div class="row" style="gap:10px;min-width:0">' + av(p, ctx.os === 'mac' ? 30 : 36, { badge: true }) + '<div class="col" style="min-width:0"><span class="dk-ctb__n ell">' + esc(p.name) + '</span><span class="dk-ctb__s' + (p.online && !p.org && p.kind !== 'agent' ? ' on' : '') + ' ell">' + esc(o.sub || sub) + '</span></div></div>';
    var acts = o.acts || (ctx.os === 'mac' ? tgroup(ctx, p.kind === 'group' ? ['search', 'info-circle'] : ['phone', 'search', 'info-circle'], o.infoOn ? 'info-circle' : null) : (p.kind === 'group' ? '' : tbtn(ctx, 'phone')) + tbtn(ctx, 'search') + tbtn(ctx, 'popout') + tbtn(ctx, 'side-r', { on: o.infoOn }));
    return colHead(ctx, left, '<div class="row" style="gap:' + (ctx.os === 'mac' ? 8 : 2) + 'px">' + acts + '</div>', { cls: 'dk-ch--conv' });
  }
  function composer(ctx, o) {
    o = o || {};
    var inner = o.focus ? '<span style="color:var(--text-neutral-01)">' + esc(o.text || '') + '<i class="dk-caret"></i></span>' : '<span>' + esc(o.placeholder || 'Message') + '</span>';
    return '<div class="dk-comp">' + (o.mode ? '<span class="dk-comp__mode"><span' + (o.mode === 'reply' ? ' aria-pressed="true"' : '') + '>Reply</span><span' + (o.mode === 'note' ? ' aria-pressed="true"' : '') + '>Team note</span></span>' : '') +
      '<div class="dk-comp__pill' + (o.focus ? ' focus' : '') + '">' + ic('circle-plus', 22, 'ic-a') + '<span class="grow ell">' + inner + '</span>' + (o.hint ? '<span class="kk mut b-xs" style="gap:4px">' + o.hint + '</span>' : ic('microphone', 20, 'ic')) + '</div>' +
      '<span class="dk-comp__send">' + ic('send-2', 20) + '</span></div>';
  }
  /* a conversation column (its own WebView) */
  function conv(ctx, o) {
    var p = o.p;
    var label = o.wvl || ('Conversation · chat WebView · chat process (' + person(p).name + ')');
    return '<section class="dk-conv"' + (o.style ? ' style="' + o.style + '"' : '') + wv('chat', label) + '>' + (o.tabs || '') + convHead(ctx, p, o) +
      (o.banner || '') + '<div class="dk-msgs' + (o.wide ? ' dk-msgs--wide' : '') + '">' + thread(o.thread, { group: person(p).kind === 'group' || person(p).kind === 'bot' }) + (o.after || '') + '</div>' +
      composer(ctx, o.composer || { placeholder: 'Message ' + person(p).name.split(' ')[0] }) + (o.over || '') + '</section>';
  }

  /* ---------------------------------------------------------------- files */
  var FT = { PDF: 'linear-gradient(180deg,#f0625b,#c9342d)', PNG: 'linear-gradient(180deg,#4fa8f0,#2a74c9)', JPG: 'linear-gradient(180deg,#4fa8f0,#2a74c9)', XLSX: 'linear-gradient(180deg,#3fbf74,#1f8a4c)', CSV: 'linear-gradient(180deg,#3fbf74,#1f8a4c)', MD: 'linear-gradient(180deg,#8a95a5,#5b6574)', GPX: 'linear-gradient(180deg,#f5a524,#d47d0a)', SVG: 'linear-gradient(180deg,#b06ef0,#7c3fc9)' };
  function ftype(name, size) {
    var ext = (name.split('.').pop() || '').toUpperCase();
    var s = size || 36;
    var lab = s < 28 && ext.length > 3 ? ext.slice(0, 3) : ext;
    return '<span class="dk-ftype" style="width:' + s + 'px;height:' + Math.round(s * 1.15) + 'px;font-size:' + Math.max(7, Math.min(9, Math.round(s * 0.26))) + 'px;background:' + (FT[ext] || FT.MD) + '">' + esc(lab) + '</span>';
  }
  function fileRow(f, o) {
    o = o || {};
    var from = f.from === 'me' ? 'You' : person(f.from).name.split(' ')[0];
    return '<div class="dk-fr"' + (o.sel ? ' aria-current="true"' : '') + '>' + ftype(f.name, 30) + '<div class="col grow" style="min-width:0"><span class="dk-fr__n ell">' + hl(f.name, o.q) + '</span><span class="dk-fr__m ell">' +
      esc((o.chat ? person(f.chat).name + ' · ' : '') + from + ' · ' + f.when + ' · ' + f.size) + '</span></div>' + (o.end || '') + '</div>';
  }
  function hl(s, q) {
    if (!q) return esc(s);
    var i = s.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return esc(s);
    return esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + q.length)) + '</mark>' + esc(s.slice(i + q.length));
  }
  function media(n, seed) {
    var h = '';
    for (var i = 0; i < n; i++) {
      var g = ((seed || 0) + i * 3) % 11 + 1;
      h += '<i class="ph' + (((seed || 0) + i) % 6 + 1) + '"></i>';
    }
    return h;
  }

  /* ---------------------------------------------------------------- chat info (stripped, perf option B) */
  function info(ctx, o) {
    var p = person(o.p);
    var w = o.w || 340;
    var h = '<aside class="dk-side" style="width:' + w + 'px"' + wv('chat', 'Chat info · its own WebView · chat process (stripped: no amounts)') + '>' +
      colHead(ctx, '<span class="l-md">' + esc(o.title || 'Chat info') + '</span>', tbtn(ctx, 'x')) +
      '<div class="dk-id">' + av(p, 64) + '<span class="h-xs">' + esc(p.name) + '</span><span class="b-sm ' + (p.online ? '' : 'mut') + '" style="' + (p.online ? 'color:var(--text-success)' : '') + '">' + (p.online ? 'online' : 'last seen today 12:40') + '</span>' +
      (p.addr ? '<span class="dk-addr mono">' + esc(p.addr) + ic('copy', 14) + '</span>' : '') + '</div>' +
      '<div class="dk-qa">' + ['phone|Call', 'bell-off|Mute', 'search|Search', 'pin|Pin'].map(function (x) { var a = x.split('|'); return '<span class="dk-qa__b"><i>' + ic(a[0], 20) + '</i>' + a[1] + '</span>'; }).join('') + '</div>' +
      '<div class="dk-seg">' + ['Files', 'Media', 'Links'].map(function (t) { return '<span' + (t === (o.tab || 'Files') ? ' aria-pressed="true"' : '') + '>' + t + '</span>'; }).join('') + '</div>';
    if ((o.tab || 'Files') === 'Files') {
      h += '<div style="padding-top:8px">' + D.files.filter(function (f) { return f.chat === o.p; }).slice(0, ctx.h >= 1000 ? 5 : 4).map(function (f, i) { return fileRow(f, { sel: o.fileSel === i }); }).join('') + '</div>';
    }
    h += '<div class="dk-sec lab-xs">Media · 24</div><div class="dk-grid">' + media(ctx.h >= 1000 ? 6 : 3, 2) + '</div>' +
      '<div class="dk-setrow">' + '<span class="dk-med" style="width:36px;height:36px">' + ic('wallet', 18) + '</span><div class="col grow"><span class="l-sm">Payments with ' + esc(p.name.split(' ')[0]) + '</span><span class="b-xs mut">Opens in Wallet · no amounts shown here</span></div>' + ic('chevron-right', 18, 'ic') + '</div>';
    return h + '</aside>';
  }

  /* ---------------------------------------------------------------- palette */
  /* groups: [{label, rows:[{lead, t, s, end, sel}]}] */
  function palette(ctx, o) {
    var h = '<div class="dk-scrim"></div><div class="dk-pal' + (o.preview ? ' dk-pal--wide' : '') + '"' + wv('chat', 'Palette · its own WebView · chat process (renders message and file names)') + (o.style ? ' style="' + o.style + '"' : '') + '>' +
      '<div class="dk-pal__in">' + ic(o.icon || 'search', 20, 'ic') + (o.q ? '<span class="q">' + esc(o.q) + '</span><i class="dk-caret"></i>' : '<span class="ph">' + esc(o.ph || 'Search chats, people, files — type > for actions') + '</span>') +
      '<span class="dk-pal__scope">' + (o.scopes || ['All', 'Chats', 'Files', 'Actions']).map(function (s) { return '<span' + (s === (o.scope || 'All') ? ' aria-pressed="true"' : '') + '>' + esc(s) + '</span>'; }).join('') + '</span></div>' +
      '<div class="dk-pal__body"><div class="dk-pal__res">';
    o.groups.forEach(function (g) {
      h += '<div class="dk-pal__g lab-xs">' + esc(g.label) + '</div>';
      g.rows.forEach(function (r) {
        h += '<div class="dk-pal__r"' + (r.sel ? ' aria-selected="true"' : '') + '>' + r.lead + '<div class="col grow" style="min-width:0"><span class="t ell">' + r.t + '</span>' + (r.s ? '<span class="s ell">' + r.s + '</span>' : '') + '</div><span class="end">' + (r.end || (r.sel ? '<span class="k">↵</span>' : '')) + '</span></div>';
      });
    });
    h += '</div>' + (o.preview || '') + '</div><div class="dk-pal__ft">' + (o.foot || '<span class="kk"><span class="k">↑</span><span class="k">↓</span></span> Move <span class="kk"><span class="k">↵</span></span> Open <span class="kk"><span class="k">Ctrl</span><span class="k">↵</span></span> New tab <span class="kk"><span class="k">Tab</span></span> Scope <span class="kk"><span class="k">Esc</span></span> Close') + '</div></div>';
    return h;
  }
  function pLead(kind, x) {
    if (kind === 'av') return av(x, 28, { noDot: true });
    if (kind === 'file') return ftype(x, 24);
    return '<span class="dk-med" style="width:28px;height:28px">' + ic(x, 16) + '</span>';
  }

  /* ---------------------------------------------------------------- native confirm (C# builds it from its own values) */
  function natConfirm(ctx, o) {
    var hello = o.hello ? '<div class="nat-hello">' + (ctx.os === 'mac' ? ic('key', 20) : ic('eye2', 20)) + '<span><b>' + (ctx.os === 'mac' ? 'Touch ID' : 'Windows Hello') + '</b> after Send · ' + esc(o.hello) + '</span></div>' : '';
    if (ctx.os === 'mac') {
      return '<div class="dk-smoke" style="background:rgba(0,0,0,.12)"></div><div class="nat mac-alert"' + wv('native', 'Native confirm · C# (NSAlert sheet) — values from C#, not from any WebView') + '>' +
        '<span class="mac-alert__icon">' + ic('logo', 34) + '</span><div class="mac-alert__t">' + esc(o.title) + '</div><div class="mac-alert__p">' + esc(o.body) + '</div>' +
        '<dl class="nat-kv mac-kv">' + o.kv.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd' + (r[2] ? ' class="m"' : '') + '>' + esc(r[1]) + '</dd>'; }).join('') + '</dl>' + hello +
        '<div class="mac-alert__b"><span class="mac-b">Cancel</span><span class="mac-b acc">' + esc(o.primary || 'Send') + '</span></div></div>';
    }
    return '<div class="dk-smoke"></div><div class="nat nat-dlg"' + wv('native', 'Native confirm · C# (ContentDialog) — values from C#, not from any WebView') + '><div class="nat-dlg__c"><div class="nat-dlg__t">' + esc(o.title) + '</div>' +
      '<div class="nat-dlg__p">' + esc(o.body) + '</div><dl class="nat-kv">' + o.kv.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd' + (r[2] ? ' class="m"' : '') + '>' + esc(r[1]) + '</dd>'; }).join('') + '</dl>' + hello + '</div>' +
      '<div class="nat-dlg__f"><span class="nat-btn nat-btn--acc">' + esc(o.primary || 'Send') + '</span><span class="nat-btn">Cancel</span></div></div>';
  }

  /* ---------------------------------------------------------------- wallet (desktop, not a hero card) */
  function chart(series, w, h, o) {
    o = o || {};
    var min = Math.min.apply(null, series), max = Math.max.apply(null, series);
    var lo = Math.floor(min / 500) * 500, hi = Math.ceil(max / 500) * 500;
    if (hi === lo) hi = lo + 500;
    var padL = 44, padB = 22, padT = 8, padR = 8;
    var cw = w - padL - padR, chh = h - padB - padT;
    function x(i) { return padL + (i / (series.length - 1)) * cw; }
    function y(v) { return padT + (1 - (v - lo) / (hi - lo)) * chh; }
    var d = series.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' ');
    var area = d + ' L' + x(series.length - 1).toFixed(1) + ' ' + (padT + chh) + ' L' + padL + ' ' + (padT + chh) + ' Z';
    var grid = '';
    for (var v = lo; v <= hi; v += 500) grid += '<line x1="' + padL + '" x2="' + (w - padR) + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '" stroke="var(--outline-neutral-02)" stroke-width="1"/><text x="' + (padL - 8) + '" y="' + (y(v) + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="var(--text-neutral-02)">' + v.toLocaleString('en-US') + '</text>';
    var labs = [[0, '11 Sep'], [10, '21 Sep'], [20, '1 Oct'], [30, '11 Oct']].map(function (l) { return '<text x="' + x(l[0]).toFixed(1) + '" y="' + (h - 5) + '" text-anchor="' + (l[0] === 0 ? 'start' : l[0] === 30 ? 'end' : 'middle') + '" font-size="11" fill="var(--text-neutral-02)">' + l[1] + '</text>'; }).join('');
    var last = series.length - 1;
    var gid = 'wg' + Math.random().toString(36).slice(2, 7);
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" style="display:block"><defs><linearGradient id="' + gid + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--surface-action-default)" stop-opacity=".22"/><stop offset="1" stop-color="var(--surface-action-default)" stop-opacity="0"/></linearGradient></defs>' +
      grid + '<path d="' + area + '" fill="url(#' + gid + ')"/><path d="' + d + '" fill="none" stroke="var(--surface-action-default)" stroke-width="2" stroke-linejoin="round"/>' +
      '<circle cx="' + x(last).toFixed(1) + '" cy="' + y(series[last]).toFixed(1) + '" r="4" fill="var(--surface-action-default)" stroke="var(--surface-screen)" stroke-width="2"/>' + labs + '</svg>';
  }
  function amt(a, dir) {
    var neg = a.charAt(0) === '-';
    return '<span class="' + (neg ? 'out' : 'in') + ' num">' + (neg ? '−' + esc(a.slice(1)) : esc(a)) + '</span>';
  }

  return { esc: esc, ic: ic, wv: wv, person: person, av: av, grad: grad, frame: frame, rail: rail, sidebar: sidebar, colHead: colHead, tbtn: tbtn, tgroup: tgroup,
    chatRow: chatRow, chatList: chatList, listPane: listPane, msg: msg, thread: thread, convHead: convHead, composer: composer, conv: conv,
    ftype: ftype, fileRow: fileRow, hl: hl, media: media, info: info, palette: palette, pLead: pLead, natConfirm: natConfirm, chart: chart, amt: amt, lights: lights };
})();
