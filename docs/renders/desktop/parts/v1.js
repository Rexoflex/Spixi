/* v1.js — the v1 desktop additions only: today's v1 desktop next to v1 + the four low-risk changes.
   1 native title bar (Windows) · 2 the title strip used (macOS) · 3 chat list polish · 4 second-device warning.
   "Today" is drawn with the same kit so the ONLY differences are the additions. It is an approximation of the
   shipped home shell + window chrome (rail with the logo, list 400 px, one list, full-bleed rows). */
var R = window.R || (window.R = {});
(function () {
  'use strict';
  var ic = K.ic, esc = K.esc, wv = K.wv;

  /* v1 rows: no agents in v1 (Dispatch out); the community bot stays */
  var ROWS = D.chats.filter(function (r) { return r.p !== 'disp'; });

  /* ---------------------------------------------------------------- window chrome */
  function capButtons() {
    return '<div class="dk-tb__win">' +
      '<span><svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 5h10" stroke="currentColor"/></svg></span>' +
      '<span><svg width="10" height="10" viewBox="0 0 10 10"><rect x=".5" y=".5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor"/></svg></span>' +
      '<span><svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0l10 10M10 0l-10 10" stroke="currentColor"/></svg></span></div>';
  }
  /* today: the default window title bar (system colours, small title, 32 px) */
  function winTitleToday() {
    return '<div class="v1-tb-today nat"' + wv('native', 'Title bar · native (default MAUI / WinUI)') + '><span style="padding-left:12px">Spixi</span><span style="flex:1"></span>' + capButtons() + '</div>';
  }
  /* v1+: MAUI Window.TitleBar — icon, title, centred search box; colours from the tokens */
  function winTitleAfter(ctx, s) {
    var q = s.typed;
    var box = '<div class="dk-search v1-search' + (q != null ? ' on' : '') + '" style="width:' + (ctx.w >= 1440 ? 460 : 400) + 'px">' + ic('search', 16) +
      (q != null ? '<span style="color:var(--text-neutral-01)">' + esc(q) + '<i class="dk-caret" style="height:15px"></i></span>' : '<span>Search chats</span>') +
      '<span class="kk" style="margin-left:auto"><span class="k">Ctrl</span><span class="k">K</span></span></div>';
    return '<div class="dk-tb v1-tb"' + wv('native', 'Title bar · native (MAUI Window.TitleBar) — the search box is a native field') + '>' +
      '<span class="dk-tb__brand">' + ic('logo', 18) + '<span class="dk-tb__word">Spixi</span></span>' +
      '<div class="dk-tb__mid" style="top:6px">' + box + '</div>' + capButtons() + '</div>';
  }

  /* ---------------------------------------------------------------- rail (v1: c-bottomnav--rail) */
  function rail(ctx, s) {
    var mac = ctx.os === 'mac';
    var top = '';
    if (mac && s.after) top = '<span class="v1-lights">' + K.lights() + '</span>';
    else if (!(s.after && !mac)) top = '<span class="v1-logo">' + ic('logo', 30) + '</span>';
    var items = [['messages', 'messages-filled', 'Chats', true, '6'], ['apps', 'apps-filled', 'Apps'], ['wallet', 'wallet-filled', 'Wallet']];
    var h = '<nav class="dk-rail v1-rail"' + wv('shell', 'Rail · home shell WebView (trusted)') + '>' + top;
    items.forEach(function (it) {
      h += '<span class="dk-rail__it"' + (it[3] ? ' aria-current="page"' : '') + '>' + ic(it[3] ? it[1] : it[0], 22) + '<span>' + it[2] + '</span>' + (it[4] ? '<b class="dk-rail__badge">' + it[4] + '</b>' : '') + '</span>';
    });
    return h + '<span class="dk-rail__sp"></span><span class="dk-rail__it">' + K.av(D.me, 30, { noDot: true }) + '<span>Account</span></span></nav>';
  }

  /* ---------------------------------------------------------------- the list pane */
  function list(ctx, s) {
    var mac = ctx.os === 'mac';
    var after = s.after;
    var o = { sel: 'mira', av: 48, hover: after ? s.hover : null, hoverActs: ['pin', 'bell-off', 'info-circle', 'dots'] };
    var head;
    /* the same Spixi header in every state; on the Mac v1+ only its position changes (into the title strip) */
    head = '<div class="dk-ch"><span class="h-sm grow">Chats</span><span class="dk-ib dk-ib--a">' + ic('message-plus', 20) + '</span></div>';
    var search = (after && !mac) ? '' : '<div class="dk-sf">' + ic('search', 18) + '<span>Search chats</span></div>';
    if (after && !mac && s.typed != null) search = '';
    /* the real c-banner (banner.js): alert-square-rounded 20, text only (textContent), the optional close (x 18, 44 px target) */
    var banner = s.banner ? '<div class="v1-banner"' + wv('shell', 'Banner · home shell (existing showWarning, text only)') + '><span class="v1-banner__in">' + ic('alert-square-rounded', 20) +
      '<span>Your account is also active on another device (seen 2 min ago). New messages can go there instead of here.</span></span><span class="v1-banner__x">' + ic('x', 18) + '</span></div>' : '';
    var chips = '<div class="dk-chips">' + ['All', 'Unread', 'Groups'].map(function (c, i) { return '<span class="dk-chip"' + (i === 0 ? ' aria-pressed="true"' : '') + '>' + c + '</span>'; }).join('') + '</div>';
    var rows = s.typed ? ROWS.filter(function (r) { return K.person(r.p).name.toLowerCase().indexOf(s.typed.toLowerCase()) >= 0; }) : ROWS;
    var body;
    if (after && !s.typed) {
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

  /* ---------------------------------------------------------------- the conversation (unchanged in v1) */
  function conv(ctx, s) {
    /* the chat keeps Spixi's own 56 px top bar on both OSes; on the Mac v1+ it only moves up into the title strip */
    var c2 = { w: ctx.w, h: ctx.h, t: ctx.t, os: 'win' };
    var acts = K.tbtn(c2, 'phone') + K.tbtn(c2, 'search') + K.tbtn(c2, 'info-circle');
    return K.conv(c2, { p: 'mira', thread: D.miraThread, wide: true, acts: acts, wvl: 'Conversation · its own chat WebView' });
  }

  /* ---------------------------------------------------------------- whole window */
  function view(ctx, s) {
    s = s || {};
    var mac = ctx.os === 'mac';
    var cols = rail(ctx, s) + list(ctx, s) + conv(ctx, s);
    if (mac) {
      /* today: every shell pads below the title strip (--safe-top) → an empty band with the window buttons over it */
      var band = s.after ? '' : '<div class="v1-macband"' + wv('native', 'Title strip · empty today (shells pad by --safe-top)') + '>' + K.lights() + '</div>';
      return '<div class="v1 col grow' + (s.after ? ' v1-after' : '') + '" style="min-height:0">' + band + '<div class="dk-body" style="background:var(--surface-screen)">' + cols + '</div></div>';
    }
    return '<div class="v1 col grow' + (s.after ? ' v1-after' : '') + '" style="min-height:0">' + (s.after ? winTitleAfter(ctx, s) : winTitleToday()) + '<div class="dk-body" style="background:var(--surface-screen)">' + cols + '</div></div>';
  }

  R.V1 = {
    view: view,
    items: [
      { build: function (ctx) { return view(ctx, { after: false }); } },                          /* 0 today */
      { build: function (ctx) { return view(ctx, { after: true }); } },                           /* 1 v1+ */
      { build: function (ctx) { return view(ctx, { after: true, hover: 'jonas' }); } },          /* 2 v1+ with a hover row */
      { build: function (ctx) { return view(ctx, { after: true, banner: true }); } },            /* 3 v1+ with the second-device banner */
      { build: function (ctx) { return view(ctx, { after: true, typed: 'mi' }); } },             /* 4 v1+ typing in the title bar search */
      { build: function (ctx) { return view(ctx, { after: true, folded: true, hover: 'lea' }); } } /* 5 Pinned folded */
    ]
  };
})();
