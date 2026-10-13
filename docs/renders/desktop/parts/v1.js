/* v1.js — the v1 desktop additions in the DT-1 scope (Damir, 2026-10-12): today's v1 desktop next to v1 + the changes.
   A chat list polish (both) · B Windows title bar in the token colours, NO search (the list keeps its field) ·
   C second-device warning (the existing banner, fixed text) · D chat info grows the window (#1179 b).
   The Spixi logo stays in the rail on Windows AND Mac. The Mac keeps today's title strip (the strip work is v1.1).
   "Today" is drawn with the same kit so the ONLY differences are the additions. It is an approximation of the
   shipped home shell + window chrome (rail with the logo, list 400 px, one list, full-bleed rows). */
var R = window.R || (window.R = {});
(function () {
  'use strict';
  var ic = K.ic, esc = K.esc, wv = K.wv;

  /* v1 rows: no agents in v1 (Dispatch out); the community bot stays */
  var ROWS = D.chats.filter(function (r) { return r.p !== 'disp'; });
  var WARN = 'Spixi uses one device per account. Using this account on another device at the same time can lose messages.';

  /* ---------------------------------------------------------------- window chrome */
  function capButtons() {
    return '<div class="dk-tb__win">' +
      '<span><svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 5h10" stroke="currentColor"/></svg></span>' +
      '<span><svg width="10" height="10" viewBox="0 0 10 10"><rect x=".5" y=".5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor"/></svg></span>' +
      '<span><svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0l10 10M10 0l-10 10" stroke="currentColor"/></svg></span></div>';
  }
  /* today: the default MAUI / WinUI title bar (system colours, "Spixi IM" caption from App.CreateWindow, 32 px) */
  function winTitleToday() {
    return '<div class="v1-tb-today nat"' + wv('native', 'Title bar · native (default MAUI / WinUI, system colours)') + '><span style="padding-left:12px">Spixi IM</span><span style="flex:1"></span>' + capButtons() + '</div>';
  }
  /* v1+: the bar in the TOKEN colours (light and dark, re-applied on a theme change), NO search box.
     tb = 'name' (the word "Spixi", recommended: the logo is already in the rail) · 'icon' (icon + name) · 'none' (caption buttons only) */
  function winTitleAfter(ctx, s) {
    var tb = s.tb || 'name';
    var left = tb === 'none' ? '' : '<span class="dk-tb__brand">' + (tb === 'icon' ? ic('logo', 16) : '') + '<span class="v1-tb__word">Spixi</span></span>';
    return '<div class="dk-tb v1-tb"' + wv('native', 'Title bar · native (MAUI Window.TitleBar, or AppWindow.TitleBar colours) — token colours, no search') + '>' +
      left + '<span style="flex:1"></span>' + capButtons() + '</div>';
  }

  /* ---------------------------------------------------------------- rail (v1: c-bottomnav--rail) — the logo stays on both OSes */
  function rail(ctx, s) {
    var items = [['messages', 'messages-filled', 'Chats', true, '6'], ['apps', 'apps-filled', 'Apps'], ['wallet', 'wallet-filled', 'Wallet']];
    var h = '<nav class="dk-rail v1-rail"' + wv('shell', 'Rail · home shell WebView (trusted)') + '><span class="v1-logo">' + ic('logo', 30) + '</span>';
    items.forEach(function (it) {
      h += '<span class="dk-rail__it"' + (it[3] ? ' aria-current="page"' : '') + '>' + ic(it[3] ? it[1] : it[0], 22) + '<span>' + it[2] + '</span>' + (it[4] ? '<b class="dk-rail__badge">' + it[4] + '</b>' : '') + '</span>';
    });
    return h + '<span class="dk-rail__sp"></span><span class="dk-rail__it">' + K.av(D.me, 30, { noDot: true }) + '<span>Account</span></span></nav>';
  }

  /* ---------------------------------------------------------------- the list pane */
  function list(ctx, s) {
    var after = s.after;
    var o = { sel: 'mira', av: 48, hover: after ? s.hover : null, hoverActs: ['pin', 'bell-off', 'info-circle', 'dots'] };
    var head = '<div class="dk-ch"><span class="h-sm grow">Chats</span><span class="dk-ib dk-ib--a">' + ic('message-plus', 20) + '</span></div>';
    /* the list keeps its own search field on Windows AND Mac (no search in the title bar) */
    var search = '<div class="dk-sf">' + ic('search', 18) + '<span>Search chats</span></div>';
    /* the real c-banner (banner.js): alert-square-rounded 20, text only (textContent), the optional close (x 18, 44 px target) */
    var banner = s.banner ? '<div class="v1-banner"' + wv('shell', 'Banner · home shell (existing showWarning, text only, fixed text)') + '><span class="v1-banner__in">' + ic('alert-square-rounded', 20) +
      '<span>' + esc(WARN) + '</span></span><span class="v1-banner__x">' + ic('x', 18) + '</span></div>' : '';
    var chips = '<div class="dk-chips">' + ['All', 'Unread', 'Groups'].map(function (c, i) { return '<span class="dk-chip"' + (i === 0 ? ' aria-pressed="true"' : '') + '>' + c + '</span>'; }).join('') + '</div>';
    var rows = ROWS;
    var body;
    if (after) {
      var pinned = rows.filter(function (r) { return r.pin; }), rest = rows.filter(function (r) { return !r.pin; });
      body = '<div class="dk-sech">' + ic(s.folded ? 'chevron-right' : 'chevron-down', 14) + '<span>Pinned</span><span class="mut">' + pinned.length + '</span></div>' +
        (s.folded ? '' : pinned.map(function (r, i) { return K.chatRow(r, i, o); }).join('')) +
        '<div class="dk-sech">' + ic('chevron-down', 14) + '<span>Chats</span><span class="mut">' + rest.length + '</span></div>' +
        rest.map(function (r, i) { return K.chatRow(r, i, o); }).join('');
    } else {
      body = rows.map(function (r, i) { return K.chatRow(r, i, o); }).join('');
    }
    return '<section class="dk-pane v1-list' + (after ? '' : ' v1-today') + '" style="width:400px"' + wv('shell', 'Chat list · home shell WebView (trusted, textContent only)') + '>' +
      head + banner + search + chips + '<div class="dk-list">' + body + '</div></section>';
  }

  /* ---------------------------------------------------------------- the conversation (unchanged in v1) + the chat info pane */
  function conv(ctx, s) {
    var c2 = { w: ctx.w, h: ctx.h, t: ctx.t, os: 'win' };
    var acts = K.tbtn(c2, 'phone') + K.tbtn(c2, 'search') + K.tbtn(c2, 'info-circle', { on: !!s.info });
    return K.conv(c2, { p: 'mira', thread: D.miraThread, wide: true, acts: acts, wvl: 'Conversation · its own chat WebView' });
  }
  function infoPane(ctx) {
    return '<div class="v1-info">' + K.info({ w: 360, h: ctx.h, t: ctx.t, os: 'win' }, { p: 'mira', w: 360 }) + '</div>';
  }

  /* ---------------------------------------------------------------- whole window */
  function view(ctx, s) {
    s = s || {};
    var mac = ctx.os === 'mac';
    var cols = rail(ctx, s) + list(ctx, s) + conv(ctx, s) + (s.info ? infoPane(ctx) : '');
    if (mac) {
      /* the Mac keeps today's title strip above the WebViews (#993 / B2): the strip work is v1.1 */
      var band = '<div class="v1-macband"' + wv('native', 'Title strip · native, above the WebViews (unchanged in DT-1)') + '>' + K.lights() + '</div>';
      return '<div class="v1 col grow' + (s.after ? ' v1-after' : '') + '" style="min-height:0;height:100%">' + band + '<div class="dk-body" style="background:var(--surface-screen)">' + cols + '</div></div>';
    }
    return '<div class="v1 col grow' + (s.after ? ' v1-after' : '') + '" style="min-height:0;height:100%">' + (s.after ? winTitleAfter(ctx, s) : winTitleToday()) + '<div class="dk-body" style="background:var(--surface-screen)">' + cols + '</div></div>';
  }

  /* ---------------------------------------------------------------- D: the window on a screen (1920 × 1080 frame) */
  /* s.win = { x, w } in screen px; the window is 760 tall. s.ghost = the window outline before it grew. */
  function screen(ctx, s) {
    var mac = ctx.os === 'mac';
    var top = mac ? 34 : 0, bar = mac ? 0 : 48;
    var wh = 760, wy = top + Math.round((ctx.h - top - bar - wh) / 2);
    var w = s.win.w, x = s.win.x;
    var wctx = { w: w, h: wh, t: ctx.t, os: ctx.os };
    var h = '<div class="v1-scr' + (mac ? ' v1-scr--mac' : '') + '"' + wv('native', 'The desktop (work area)') + '>';
    if (mac) h += '<div class="v1-menubar"><b>Spixi</b><span>File</span><span>Edit</span><span>View</span><span>Window</span><span>Help</span><span style="flex:1"></span><span>Mon 12 Oct 21:50</span></div>';
    if (s.ghost) h += '<div class="v1-ghost" style="left:' + s.ghost.x + 'px;top:' + wy + 'px;width:' + s.ghost.w + 'px;height:' + wh + 'px"><span>before: ' + s.ghost.w + ' px</span></div>';
    h += '<div class="v1-win' + (mac ? ' v1-win--mac' : '') + '" style="left:' + x + 'px;top:' + wy + 'px;width:' + w + 'px;height:' + wh + 'px">' + view(wctx, s) + '</div>';
    if (s.dim) h += '<div class="v1-dim" style="left:' + s.dim.x + 'px;top:' + (wy + wh + 14) + 'px;width:' + s.dim.w + 'px"><i></i><span>' + esc(s.dim.label) + '</span><i></i></div>';
    if (!mac) h += '<div class="nat-task" style="justify-content:center;display:flex;align-items:center"><span class="nat-task__i run" style="color:var(--text-logotype)">' + ic('logo', 24) + '</span></div>';
    return h + '</div>';
  }

  R.V1 = {
    view: view,
    items: [
      { build: function (ctx) { return view(ctx, { after: false }); } },                            /* 0 today */
      { build: function (ctx) { return view(ctx, { after: true }); } },                             /* 1 v1+ (bar = "Spixi") */
      { build: function (ctx) { return view(ctx, { after: true, hover: 'jonas' }); } },            /* 2 v1+ with a hover row */
      { build: function (ctx) { return view(ctx, { after: true, banner: true }); } },              /* 3 v1+ with the second-device banner */
      { build: function (ctx) { return view(ctx, { after: true, tb: 'icon' }); } },                /* 4 Q1: icon + name */
      { build: function (ctx) { return view(ctx, { after: true, folded: true, hover: 'lea' }); } }, /* 5 Pinned folded */
      { build: function (ctx) { return view(ctx, { after: true, tb: 'none' }); } },                /* 6 Q1: caption buttons only */
      /* D · #1179 (b), on a 1920 × 1080 screen. Window 1180 restored: rail 72 + list 400 + conversation 708. */
      { build: function (ctx) { return screen(ctx, { after: true, win: { x: 200, w: 1180 } }); } },                                   /* 7 before: info closed */
      { build: function (ctx) { return screen(ctx, { after: true, info: true, win: { x: 200, w: 1180 }, dim: { x: 672, w: 348, label: 'conversation 348 px (squeezed)' } }); } },   /* 8 today: squeeze */
      { build: function (ctx) { return screen(ctx, { after: true, info: true, win: { x: 200, w: 1540 }, ghost: { x: 200, w: 1180 }, dim: { x: 672, w: 708, label: 'conversation 708 px (kept)' } }); } },  /* 9 v1+: grow right */
      { build: function (ctx) { return screen(ctx, { after: true, info: true, win: { x: 380, w: 1540 }, ghost: { x: 740, w: 1180 }, dim: { x: 852, w: 708, label: 'conversation 708 px (kept)' } }); } }   /* 10 v1+: no room on the right → move left */
      ,
      { build: function (ctx) { return screen(ctx, { after: true, info: true, win: { x: 200, w: 1540 }, ghost: { x: 200, w: 1180 }, dim: { x: 672, w: 708, label: 'conversation 708 px (kept)' } }); } }   /* 11 Mac: grow right (RequestGeometryUpdate) */
    ]
  };
})();
