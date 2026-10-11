/* dir-c.js — C · STAGE. The chat stays a narrow column; the thing you do together opens large beside
   it — a mini-app session, a file, a payment request, an agent artifact — each in its own sandbox. */
var R = window.R || (window.R = {});
(function () {
  'use strict';
  var ic = K.ic, esc = K.esc, wv = K.wv;

  var cThread = D.miraThread.slice(4, 10).concat([
    { k: 'in', text: 'Also — chess tonight? 😄', t: '13:58', first: true },
    { k: 'app', dir: 'in', title: 'Chess', sub: 'Mira started a game · you play white', icon: 'knight', bg: 'var(--disc-grad-7)', body: '<span class="dk-live">On stage</span> · move 9', t: '13:59', first: true },
    { k: 'in', text: 'Your move 😏', t: '14:12' },
    { k: 'out', text: 'Thinking… that knight is annoying', t: '14:13', st: 'read', first: true }
  ]);

  /* ------------------------------------------------------------ objects on the stage */
  var BOARD = ['r.bq.rk.', 'pp..bppp', '..np.n..', '..p.p...', '..B.P...', '..NP.N..', 'PPP..PPP', 'R.BQ.RK.'];
  var GL = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  function chess(size, o) {
    o = o || {};
    var hl = o.hl || ['g8', 'f6'];
    var cells = '';
    for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) {
      var ch = BOARD[r][c], sq = 'abcdefgh'[c] + (8 - r);
      var light = (r + c) % 2 === 0;
      var piece = ch === '.' ? '' : '<b class="' + (ch === ch.toUpperCase() ? 'w' : '') + '" style="font-size:' + Math.round(size / 8 * 0.78) + 'px">' + GL[ch.toLowerCase()] + '</b>';
      cells += '<i class="' + (light ? 'l' : 'd') + (hl.indexOf(sq) >= 0 ? ' h' : '') + '">' + piece + '</i>';
    }
    return '<div class="chess" style="width:' + size + 'px">' + cells + '</div>';
  }
  function chessApp(ctx, sw, sh, o) {
    o = o || {};
    var size = Math.min(sh - 40, sw - 300, 620);
    var side = '<div class="col app3p" style="width:220px;gap:12px;color:var(--text-neutral-01)">' +
      '<div class="col" style="gap:6px;padding:12px;border-radius:10px;background:#2b2b2b;color:#f1f1f1"><div class="row" style="justify-content:space-between"><b>Mira</b><span style="font-family:ui-monospace,monospace">4:51</span></div></div>' +
      '<div style="padding:10px 12px;border-radius:10px;background:#f4f1e8;color:#3a3326;font-size:13px;line-height:22px;font-family:ui-monospace,monospace;height:' + Math.max(120, size - 170) + 'px;overflow:hidden">' +
      ['1. e4 e5', '2. Nf3 Nc6', '3. Bc4 Bc5', '4. d3 d6', '5. Nc3 Nf6', '6. O-O O-O', '7. Bg5 Be7', '8. Bd2 c5?!', '9. … Nf6'].map(function (m, i) { return '<div' + (i === 8 ? ' style="background:#e9dfb9;border-radius:4px;padding:0 4px"' : '') + '>' + m + '</div>'; }).join('') + '</div>' +
      '<div class="col" style="gap:6px;padding:12px;border-radius:10px;background:' + (o.yourMove ? '#f5f682' : '#ffffff') + ';color:#1d1d1d;box-shadow:0 0 0 1px rgba(0,0,0,.08)"><div class="row" style="justify-content:space-between"><b>You · white</b><span style="font-family:ui-monospace,monospace">5:12</span></div>' + (o.yourMove ? '<span style="font-size:13px">Your move</span>' : '') + '</div></div>';
    return '<div class="row" style="gap:24px;align-items:center">' + chess(size, o) + side + '</div>';
  }
  function pdfView(ctx, sw, sh, doc) {
    if (doc === 'tix') {
      var th = Math.min(sh - 30, 520), tw = Math.round(th * 0.72);
      return '<div class="pdfp" style="width:' + tw + 'px;height:' + th + 'px;padding:36px 40px;display:flex;flex-direction:column;gap:10px"><h4 style="font-size:18px">Concert ticket × 2</h4><p style="font-size:11px">Križanke · Ljubljana · Thursday 16 Oct · doors 19:30</p>' +
        '<div style="display:flex;gap:14px;align-items:center;margin-top:10px"><div style="width:110px;height:110px;background:repeating-linear-gradient(90deg,#222 0 3px,#fff 3px 6px),repeating-linear-gradient(0deg,#222 0 3px,transparent 3px 7px);background-blend-mode:multiply;border:6px solid #fff;box-shadow:0 0 0 1px #ddd"></div><p style="font-size:12px;line-height:19px;color:#333">Row 12 · seats 14–15<br>Holder: Jonas Berg<br>Order 88-2104</p></div>' + Array(8).join('<div class="ln"></div>') + '</div>';
    }
    var h = Math.min(sh - 30, 720), w = Math.round(h * 0.72);
    var thumbs = '<div class="col" style="gap:10px;width:84px">' + [1, 2, 3, 4, 5].map(function (n) { return '<div class="col" style="gap:4px;align-items:center"><div class="pdfp" style="width:64px;height:86px;padding:8px;' + (n === 3 ? 'box-shadow:0 0 0 2px var(--outline-action-default)' : '') + '">' + Array(6).join('<div class="ln" style="height:3px;margin:4px 0"></div>') + '</div><span class="b-xs mut">' + n + '</span></div>'; }).join('') + '</div>';
    var page = '<div class="pdfp" style="width:' + w + 'px;height:' + h + 'px;padding:40px 44px"><h4 style="font-size:18px">Residential Lease Agreement</h4><p style="font-size:11px">Draft v3 · Rua da Rosa 41, 2º, Lisbon · page 3 of 9</p>' +
      '<p style="font-size:12px;line-height:19px;color:#333;margin-top:16px"><b>§ 6 Deposit.</b> The Tenants pay a deposit of <span class="hl" style="padding:0 2px">EUR 2,400, split in equal halves</span>, before the keys are handed over.</p>' + Array(5).join('<div class="ln"></div>') +
      '<p style="font-size:12px;line-height:19px;color:#333;margin-top:12px"><b>§ 7 Move-in.</b> The tenancy starts on <span class="hl" style="padding:0 2px">1 November 2026</span>.</p>' + Array(Math.max(4, Math.round(h / 40))).join('<div class="ln"></div>') + '</div>';
    return '<div class="row" style="gap:24px;align-items:flex-start">' + thumbs + page + '</div>';
  }
  function requestObj(ctx, o) {
    o = o || {};
    var paid = o.paid;
    return '<div class="dk-sheet" style="position:static;transform:none;width:460px;padding:24px;display:flex;flex-direction:column;gap:16px;border:1px solid var(--outline-neutral-02)">' +
      '<div class="row" style="gap:12px">' + K.av('mira', 44) + '<div class="col grow"><span class="b-sm mut">Payment request from</span><span class="l-md">Mira Novak</span></div><span class="dk-tag ' + (paid ? 'dk-tag--ok' : 'dk-tag--warn') + '">' + (paid ? 'Paid' : 'Open') + '</span></div>' +
      '<div class="col"><span class="dk-amt num" style="font-size:40px;line-height:46px;font-family:var(--font-display)">120.00<small style="font-size:16px">IXI</small></span><span class="b-sm mut">≈ $148.20 · Lisbon flat · your half of the deposit</span></div>' +
      '<div class="dk-setrow" style="margin:0;flex-direction:column;align-items:stretch;gap:8px;box-shadow:none;background:var(--surface-neutral-02)">' +
      [['Deposit (§ 6 of the lease)', '240.00'], ['Your half', '120.00'], ['Network fee', '0.01'], ['Balance now', '1,284.52'], ['Balance after', '1,164.51']].map(function (r, i) { return '<div class="row b-sm"' + (i === 3 ? ' style="border-top:1px solid var(--outline-neutral-02);padding-top:8px"' : '') + '><span class="grow mut">' + r[0] + '</span><span class="num">' + r[1] + ' IXI</span></div>'; }).join('') + '</div>' +
      (paid ? '<div class="col" style="gap:10px"><div class="dk-setrow" style="margin:0;background:var(--surface-success-inverse);box-shadow:none"><span style="color:var(--icon-success)">' + ic('check-circle', 24) + '</span><div class="col grow"><span class="l-sm">Paid · 2 of 5 blocks</span><span class="mono mut">tx 3b9e 1d70 … 5a2c</span></div></div><div class="row" style="gap:8px"><span class="dk-btn dk-btn--tonal dk-btn--w">' + ic('download', 16) + 'Receipt</span><span class="dk-btn dk-btn--tonal dk-btn--w">' + ic('external-link', 16) + 'Explorer</span></div></div>'
        : '<div class="row" style="gap:10px"><span class="dk-btn dk-btn--out dk-btn--lg dk-btn--w">Decline</span><span class="dk-btn dk-btn--fill dk-btn--lg dk-btn--w">Pay 120.00 IXI</span></div><span class="b-xs mut" style="text-align:center">The request text comes from Mira. Amount, address and fee come from Spixi. You confirm in a native dialog.</span>') +
      '</div>';
  }
  function artifact(ctx, sw) {
    var w = Math.min(sw - 60, 820);
    var legs = [['Koper', 'Villach', '06:10', '09:02', '4.1 °C'], ['Villach', 'Tarvisio', '09:20', '10:05', '5.2 °C'], ['Tarvisio', 'Salzburg', '10:15', '13:40', '7.8 °C'], ['Salzburg', 'Munich', '14:00', '16:40', '—']];
    var bars = [3.9, 4.1, 4.4, 4.8, 5.2, 5.9, 6.6, 7.2, 7.8, 6.1, 4.9, 4.6];
    var max = 9, bw = 22, ch = 120;
    var svg = '<svg width="' + (bars.length * (bw + 8) + 40) + '" height="' + (ch + 26) + '"><line x1="34" x2="' + (bars.length * (bw + 8) + 36) + '" y1="' + (ch - 5 / max * ch) + '" y2="' + (ch - 5 / max * ch) + '" stroke="var(--outline-warning)" stroke-dasharray="4 3"/><text x="30" y="' + (ch - 5 / max * ch + 4) + '" text-anchor="end" font-size="11" fill="var(--text-warning)">5 °C</text>' +
      bars.map(function (v, i) { var h = v / max * ch; return '<rect x="' + (38 + i * (bw + 8)) + '" y="' + (ch - h) + '" width="' + bw + '" height="' + h + '" rx="4" fill="' + (v > 5 ? 'var(--surface-warning)' : 'var(--surface-action-default)') + '" opacity="' + (v > 5 ? 1 : .8) + '"/>'; }).join('') +
      '<text x="38" y="' + (ch + 18) + '" font-size="11" fill="var(--text-neutral-02)">06:00</text><text x="' + (38 + 11 * (bw + 8)) + '" y="' + (ch + 18) + '" font-size="11" fill="var(--text-neutral-02)">13:20</text></svg>';
    return '<div class="col" style="width:' + w + 'px;gap:16px;padding:28px 32px;border-radius:16px;background:var(--surface-screen);box-shadow:var(--elevation-2);border:1px solid var(--outline-neutral-02)">' +
      '<div class="row" style="gap:10px">' + K.av('disp', 32) + '<div class="col"><span class="h-sm">Route report · TR-44</span><span class="b-sm mut">Dispatch · generated 13:05 · from live telemetry</span></div></div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">' + [['Distance', '512 km'], ['ETA Munich', '16:40'], ['Reefer peak', '7.8 °C']].map(function (x, i) { return '<div class="dk-stat"><span class="lab-xs">' + x[0] + '</span><span class="v"' + (i === 2 ? ' style="color:var(--text-warning)"' : '') + '>' + x[1] + '</span></div>'; }).join('') + '</div>' +
      '<div><span class="lab-xs">Reefer 17 temperature, °C per 40 min</span>' + svg + '</div>' +
      '<table class="dk-tbl"><thead><tr><th>From</th><th>To</th><th>Depart</th><th>Arrive</th><th class="r">Reefer max</th></tr></thead><tbody>' + legs.map(function (l) { return '<tr><td>' + l[0] + '</td><td>' + l[1] + '</td><td class="num">' + l[2] + '</td><td class="num">' + l[3] + '</td><td class="r num"' + (l[4] === '7.8 °C' ? ' style="color:var(--text-warning);font-weight:600"' : '') + '>' + l[4] + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }

  var OBJ = {
    chess: { label: 'Chess', icon: 'knight', bg: 'var(--disc-grad-7)', live: true, wv: ['apps', 'Mini-app "Chess" · its own WebView · apps process (sandbox)'], prov: '<b>Chess 1.4</b> · apps.spixi.io · multi-user session with Mira · cannot see this chat or your wallet' },
    pdf: { label: 'Lease draft v3.pdf', icon: 'file-text', bg: 'linear-gradient(180deg,#f0625b,#c9342d)', wv: ['chat', 'File viewer · its own WebView · chat process (renders a peer’s file)'], prov: '<b>Lease draft v3.pdf</b> · from Mira Novak · Today 09:13 · 2.4 MB · scripts off' },
    tix: { label: 'Concert-tickets.pdf', icon: 'file-text', bg: 'linear-gradient(180deg,#f0625b,#c9342d)', wv: ['chat', 'File viewer · its own WebView · chat process'], prov: '<b>Concert-tickets.pdf</b> · you sent it · Today 11:16 · 180 KB · scripts off' },
    req: { label: 'Request · 120 IXI', icon: 'wallet', bg: 'var(--disc-grad-4)', wv: ['shell', 'Payment request · wallet WebView (trusted) · amount from C#'], prov: '<b>Payment request</b> · shown by your wallet · the chat only sent the request id' },
    art: { label: 'Route report · TR-44', icon: 'chart', bg: 'var(--disc-grad-8)', wv: ['chat', 'Agent artifact · its own WebView · chat process (sandboxed renderer)'], prov: '<b>Artifact from Dispatch</b> (agent) · rendered by Spixi · no scripts, no network' }
  };

  function stage(ctx, sw, sh, s) {
    var cur = s.obj || 'chess';
    var tabs = s.tabs || ['chess', 'pdf', 'req'];
    var o = OBJ[cur];
    var head = '<div class="dk-stage__hd"' + wv('shell', 'Stage frame · shell WebView (object tabs, trusted)') + '>' + tabs.map(function (t) {
      var x = OBJ[t];
      return '<span class="dk-obj"' + (t === cur ? ' aria-selected="true"' : '') + '><span class="ob" style="background:' + x.bg + '">' + ic(x.icon, 14) + '</span><span class="ell">' + esc(x.label) + '</span>' + (x.live ? '<span class="dk-live">Live</span>' : '') + '</span>';
    }).join('') + '<span class="grow"></span><span class="dk-btn dk-btn--ghost" style="height:32px">' + ic('archive', 16) + 'Shelf · 24</span>' + K.tbtn(ctx, 'popout') + K.tbtn(ctx, 'arrows-maximize') + '</div>';
    var contentH = sh - 56 - 48 - 30 - 40;
    var content;
    if (cur === 'chess') content = chessApp(ctx, sw, contentH, { yourMove: s.yourMove !== false });
    else if (cur === 'pdf') content = pdfView(ctx, sw, contentH);
    else if (cur === 'tix') content = pdfView(ctx, sw, contentH, 'tix');
    else if (cur === 'req') content = requestObj(ctx, { paid: s.paid });
    else content = artifact(ctx, sw);
    if (s.loading) content = '<div class="col" style="align-items:center;gap:16px"><span class="dk-med dk-med--sq" style="width:72px;height:72px;background:var(--disc-grad-7);color:#fff">' + ic('knight', 36) + '</span><span class="h-sm">Opening Chess with Mira…</span><span class="b-sm mut">Checking the app package (SHA-256) · starting a sandbox</span><span style="width:220px;height:4px;border-radius:2px;background:var(--surface-progress-track);overflow:hidden"><i style="display:block;width:62%;height:100%;background:var(--surface-progress-fill)"></i></span></div>';
    var foot = cur === 'chess' ? '<div class="dk-stage__ft">' + K.av('mira', 22, { noDot: true }) + '<span><b style="color:var(--text-neutral-01)">Mira</b> is on the stage</span><span class="dk-live">Live</span><span class="grow"></span><span>Moves travel end-to-end in this chat</span><span class="dk-btn dk-btn--ghost" style="height:30px">Leave game</span></div>'
      : (cur === 'pdf' || cur === 'tix') ? '<div class="dk-stage__ft"><span>Page 3 of 9</span><span class="grow"></span><span class="kk"><span class="k">Ctrl</span><span class="k">F</span></span>Find<span class="dk-btn dk-btn--ghost" style="height:30px">' + ic('message', 16) + 'Quote page in chat</span><span class="dk-btn dk-btn--ghost" style="height:30px">' + ic('download', 16) + 'Save a copy</span></div>'
      : cur === 'req' ? '<div class="dk-stage__ft">' + ic('shield-check', 16, 'ic') + '<span>The wallet owns this view. The chat cannot change the amount or the address.</span></div>'
      : '<div class="dk-stage__ft">' + ic('shield-check', 16, 'ic') + '<span>Agent output is untrusted input: rendered as data, never run.</span><span class="grow"></span><span class="dk-btn dk-btn--ghost" style="height:30px">' + ic('message', 16) + 'Ask Dispatch</span></div>';
    var shelf = s.shelf ? shelfDrawer(ctx, s) : '';
    return '<section class="dk-stage">' + head + '<div class="col grow" style="min-height:0;position:relative"' + wv(o.wv[0], o.wv[1]) + '><div class="dk-prov">' + ic(cur === 'req' ? 'wallet' : 'shield-check', 14, 'sh') + '<span>' + o.prov + '</span></div><div class="dk-stage__c">' + content + '</div>' + foot + '</div>' + shelf + '</section>';
  }

  function objCard(kind, title, sub, who, sel, pv) {
    var prev = pv || '';
    return '<div class="dk-ocard"' + (sel ? ' aria-selected="true"' : '') + '><div class="dk-ocard__pv" style="background:var(--surface-neutral-03)">' + prev + '</div><div class="dk-ocard__b"><span class="l-sm ell">' + title + '</span><span class="row b-xs mut" style="gap:6px">' + (who ? K.av(who, 16, { noDot: true }) : '') + '<span class="ell">' + sub + '</span></span></div></div>';
  }
  function shelfItems(q) {
    var it = [
      ['pdf', 'Lease draft v3.pdf', 'Mira · Today', 'mira', '<div class="pdfp" style="width:64px;height:84px;padding:8px">' + Array(7).join('<div class="ln" style="height:3px;margin:4px 0"></div>') + '</div>'],
      ['app', 'Chess · live', 'Mira · move 9', 'mira', '<div style="width:84px">' + chess(84) + '</div>'],
      ['req', 'Request · 120 IXI', 'Mira · open', 'mira', '<span class="dk-amt" style="font-size:22px">120<small>IXI</small></span>'],
      ['art', 'Route report · TR-44', 'Dispatch · 13:05', 'disp', '<span style="color:var(--icon-action-default)">' + ic('chart', 40) + '</span>'],
      ['img', 'Lisbon-flat-floorplan.png', 'Mira · Mon', 'mira', '<i class="ph3" style="width:100%;height:100%;display:block"></i>'],
      ['pdf', 'Lease draft v2.pdf', 'Mira · 28 Sep', 'mira', '<div class="pdfp" style="width:64px;height:84px;padding:8px">' + Array(7).join('<div class="ln" style="height:3px;margin:4px 0"></div>') + '</div>'],
      ['app', 'Split · Lisbon flat', 'Mira · settled', 'mira', '<span class="dk-med dk-med--sq" style="width:48px;height:48px;background:var(--disc-grad-4);color:#fff">' + ic('receipt', 24) + '</span>'],
      ['gpx', 'Cabin-route.gpx', 'Falcon Crew · Alex', 'alex', '<span style="color:var(--icon-warning)">' + ic('topology-star', 40) + '</span>'],
      ['md', 'Lease-checklist.md', 'Studio Kvadrat · Noor', 'noor', '<div class="col" style="gap:5px;width:70%">' + Array(5).join('<i style="height:5px;border-radius:3px;background:var(--outline-neutral-03);display:block"></i>') + '</div>'],
      ['img', 'Cabin-photo.jpg', 'Falcon Crew · Rin', 'rin', '<i class="ph5" style="width:100%;height:100%;display:block"></i>'],
      ['pdf', 'Lease draft v1.pdf', 'Mira · 21 Sep', 'mira', '<div class="pdfp" style="width:64px;height:84px;padding:8px">' + Array(7).join('<div class="ln" style="height:3px;margin:4px 0"></div>') + '</div>'],
      ['pdf', 'Concert-tickets.pdf', 'Jonas · You', 'me', '<div class="pdfp" style="width:64px;height:84px;padding:8px">' + Array(7).join('<div class="ln" style="height:3px;margin:4px 0"></div>') + '</div>']
    ];
    if (q) it = it.filter(function (x) { return /lease/i.test(x[1]); });
    return it;
  }
  function shelfDrawer(ctx, s) {
    var items = shelfItems(s.shelfQ).slice(0, 8);
    return '<div class="dk-shelfdraw"' + wv('shell', 'Shelf · shell WebView (names textContent only, previews by C#)') + '><div class="row" style="gap:8px;padding:12px 16px"><span class="l-md grow">Shelf · Mira Novak · 24 objects</span>' + K.tbtn(ctx, 'x') + '</div>' +
      '<div class="row" style="gap:6px;padding:0 16px 10px">' + ['All', 'Files', 'Apps', 'Payments', 'Artifacts', 'Links'].map(function (c, i) { return '<span class="dk-chip"' + (i === 0 ? ' aria-pressed="true"' : '') + '>' + c + '</span>'; }).join('') + '</div>' +
      '<div class="dk-shelf" style="grid-template-columns:repeat(4,minmax(0,1fr));padding:0 16px 16px">' + items.map(function (x, i) { return objCard(x[0], esc(x[1]), esc(x[2]), x[3], i === 0, x[4]); }).join('') + '</div></div>';
  }

  /* ------------------------------------------------------------ the Stage view */
  function view(ctx, s) {
    s = s || {};
    var W = ctx.w, H = ctx.h, mac = ctx.os === 'mac';
    var hasSide = mac && W >= 1440;
    var full = W >= 1920;
    var left = '';
    var leftW = 0;
    if (full) {
      leftW = mac ? 290 : 300;
      left = K.listPane(ctx, { w: leftW, sel: s.p || 'mira', av: 36, filters: ['All', 'Unread', 'Groups'], sections: [{ title: 'Pinned', rows: D.chats.filter(function (r) { return r.pin; }) }, { title: 'Chats', rows: D.chats.filter(function (r) { return !r.pin; }) }] });
    } else if (!hasSide) {
      leftW = 64;
      var ppl = ['mira', 'falcon', 'disp', 'jonas', 'comm', 'lea', 'sven', 'tomaz', 'studio', 'noor', 'kai'];
      left = '<nav class="dk-strip"' + wv('shell', 'People strip · shell WebView (trusted)') + '>' + (mac ? '<span style="height:28px;display:flex;align-items:center;transform:scale(.85)">' + K.lights() + '</span>' : '') + ppl.map(function (id) {
        var r = D.chats.filter(function (x) { return x.p === id; })[0] || {};
        return '<span style="position:relative">' + '<span class="' + (id === (s.p || 'mira') ? 'dk-strip__cur' : '') + '" style="display:block;border-radius:50%">' + K.av(id, 40, { noDot: true }) + '</span>' + (r.u && !r.muted ? '<i class="dk-strip__u"></i>' : '') + '</span>';
      }).join('') + '</nav>';
    }
    var convW = full ? 440 : W >= 1440 ? (mac ? 380 : 400) : 380;
    var p = s.p || 'mira';
    var conv = '<div class="row" style="width:' + convW + 'px;flex:none;align-items:stretch">' + K.conv(ctx, { p: p, thread: s.thread || cThread, infoOn: false, composer: s.composer,
      acts: ctx.os === 'mac' ? K.tgroup(ctx, ['phone', 'search', 'archive'], null) : K.tbtn(ctx, 'phone') + K.tbtn(ctx, 'search') + K.tbtn(ctx, 'side-r', { on: true }) }) + '</div>';
    var navW = mac ? (hasSide ? (W >= 1920 ? 214 : 200) : 0) : 73;
    var sw = W - navW - leftW - convW;
    var sh = H - (mac ? 0 : 40);
    var stg = s.noStage ? emptyStage(ctx, s) : stage(ctx, sw, sh, s);
    var over = (s.pal ? K.palette(ctx, s.pal) : '') + (s.over || '');
    var nav = R.N.personalNav(ctx, s.nav || 'Chats', { collapse: !hasSide, third: 'archive', thirdLabel: 'Shelf', sbw: W >= 1920 ? 214 : 200 });
    return K.frame(ctx, { nav: nav, body: left + conv + stg, over: over, title: { search: 'Search chats, people, objects, actions' } });
  }
  function emptyStage(ctx, s) {
    return '<section class="dk-stage"' + wv('shell', 'Stage frame · shell WebView') + '><div class="dk-stage__hd"><span class="b-sm mut">Nothing on the stage yet</span></div><div class="dk-stage__c"><div class="col" style="align-items:center;gap:12px;text-align:center;max-width:380px">' +
      '<span class="dk-med dk-med--sq" style="width:72px;height:72px;background:var(--disc-grad-7);color:#fff">' + ic('knight', 34) + '</span><span class="h-sm">Mira invited you to Chess</span><span class="b-sm mut">Join to open the game here, beside the chat. The app runs in its own sandbox and cannot read this conversation.</span>' +
      '<div class="row" style="gap:8px;margin-top:6px"><span class="dk-btn dk-btn--out dk-btn--lg">Not now</span><span class="dk-btn dk-btn--fill dk-btn--lg">Join on stage</span></div></div></div></section>';
  }

  /* ------------------------------------------------------------ the Shelf across all chats */
  function shelfAll(ctx, s) {
    s = s || {};
    var mac = ctx.os === 'mac', hasSide = mac && ctx.w >= 1440;
    var items = shelfItems(s.q);
    var cols = ctx.w >= 1920 ? 6 : ctx.w >= 1440 ? 5 : 4;
    var main = '<section class="col grow" style="min-width:0;overflow:hidden;background:var(--surface-neutral-02)"' + wv('shell', 'Shelf · shell WebView (names textContent only; previews rendered by C#)') + '>' +
      '<div class="dk-ch" style="height:auto;padding:16px 24px 0;flex-direction:column;align-items:stretch;gap:12px;background:var(--surface-screen);border-bottom:1px solid var(--outline-neutral-02)"><div class="row" style="gap:10px">' + (!hasSide && mac ? K.lights() + '<span style="width:12px"></span>' : '') + '<span class="h-sm grow">Shelf · everything shared with you</span>' +
      '<span class="dk-sf" style="margin:0;width:300px;height:34px' + (s.q ? ';box-shadow:0 0 0 2px var(--outline-focus)' : '') + '">' + ic('search', 16) + '<span class="b-sm"' + (s.q ? ' style="color:var(--text-neutral-01)"' : '') + '>' + (s.q ? esc(s.q) + '<i class="dk-caret"></i>' : 'Search objects in all chats') + '</span></span></div>' +
      '<div class="row" style="gap:6px;padding-bottom:12px">' + ['All 312', 'Files 188', 'Apps 14', 'Payments 61', 'Artifacts 9', 'Links 40'].map(function (c, i) { return '<span class="dk-chip"' + ((s.q ? i === 1 : i === 0) ? ' aria-pressed="true"' : '') + '>' + c + '</span>'; }).join('') + '<span class="grow"></span><span class="dk-chip">From anyone' + ic('chevron-down', 12) + '</span><span class="dk-chip">Any time' + ic('chevron-down', 12) + '</span></div></div>' +
      (s.q ? '<div class="b-sm mut" style="padding:14px 24px 0">' + items.length + ' files match “lease” in 2 chats</div>' : '<div class="lab-xs" style="padding:16px 24px 0">Newest first</div>') +
      '<div class="dk-shelf" style="grid-template-columns:repeat(' + cols + ',minmax(0,1fr));padding:12px 24px 24px">' + items.map(function (x, i) { return objCard(x[0], esc(x[1]), esc(x[2]), x[3], s.q && i === 0, x[4]); }).join('') + '</div></section>';
    var nav = R.N.personalNav(ctx, 'Shelf', { collapse: !hasSide, third: 'archive', thirdLabel: 'Shelf', sbw: 214 });
    return K.frame(ctx, { nav: nav, body: main, title: { search: 'Search chats, people, objects, actions' }, over: s.over || '' });
  }

  var natPay = { title: 'Send 120.00 IXI to Mira Novak?', body: 'Payment request "Lisbon flat · your half of the deposit". Spixi built this from its own data.',
    kv: [['To', 'Mira Novak'], ['Address', '1Rk9 3Fz7 Qe2W 8xLm 4bQ2', 1], ['Amount', '120.00 IXI'], ['Network fee', '0.0100 IXI'], ['Total', '120.0100 IXI']], hello: 'asks for your PIN, face or fingerprint (proposed)' };

  function palC(q) {
    if (!q) return { scopes: ['All', 'Chats', 'Objects', 'Actions'], groups: [
      { label: 'Recent', rows: [
        { lead: K.pLead('av', 'mira'), t: 'Mira Novak', s: 'On stage: Chess (your move) · Lease draft v3.pdf', sel: true },
        { lead: K.pLead('av', 'disp'), t: 'Dispatch', s: 'On stage: Route report · TR-44' },
        { lead: K.pLead('av', 'falcon'), t: 'Falcon Crew', s: '3 unread · Alex: Deposit received' }] },
      { label: 'On a stage now', rows: [{ lead: '<span class="dk-med dk-med--sq" style="width:28px;height:28px;background:var(--disc-grad-7);color:#fff">' + ic('knight', 16) + '</span>', t: 'Chess with Mira', s: 'Live · move 9 · your move' }] }] };
    return { q: q, scopes: ['All', 'Chats', 'Objects', 'Actions'], groups: [
      { label: 'Chats', rows: [
        { lead: K.pLead('av', 'mira'), t: K.hl('Mira Novak', q), s: 'Opens with: <b>Chess</b> (live, your move) on the stage', sel: true },
        { lead: K.pLead('av', 'tripjm'), t: 'Jonas & ' + K.hl('Mira', q) + ' · Porto', s: 'Group · 3 members' }] },
      { label: 'Objects', rows: [{ lead: K.pLead('file', 'Lease draft v3.pdf'), t: 'Lease draft v3.pdf', s: 'from ' + K.hl('Mira', q) + ' · Today' }] }] };
  }

  var jonasSimple = D.jonasThread;

  R.C = {
    key: 'C', name: 'Stage',
    main: function (ctx) { return view(ctx, {}); },
    states: [
      { id: 'pdf', title: 'A file on the stage', cap: 'Mira’s lease, page 3, beside the chat. Quote the page into the chat or save a copy (native dialog). The viewer is its own WebView with scripts off.', build: function (ctx) { return view(ctx, { obj: 'pdf' }); } },
      { id: 'art', title: 'An agent artifact on the stage', cap: 'Dispatch sends a report, not a wall of text. Spixi renders it as data in a sandboxed viewer; nothing in it can run.', build: function (ctx) { return view(ctx, { p: 'disp', obj: 'art', tabs: ['art'], thread: [{ k: 'day', text: 'Today' }, { k: 'out', text: 'How does TR-44 look?', t: '13:03', st: 'read', first: true }, { k: 'in', text: 'Here is the route report. Reefer 17 went over 5 °C between Tarvisio and Salzburg.', t: '13:05', first: true }, { k: 'app', dir: 'in', title: 'Route report · TR-44', sub: 'Artifact · on stage', icon: 'chart', bg: 'var(--disc-grad-8)', t: '13:05' }, { k: 'in', text: 'Proposal: reroute via Tarvisio saves about 1 h 40 min. Approve?', t: '13:18', first: true }] }); } },
      { id: 'shelf', title: 'The shelf of one chat', cap: 'Everything shared in this conversation: files, app sessions, payments, artifacts, links. One click puts it on the stage.', build: function (ctx) { return view(ctx, { obj: 'chess', shelf: true }); } },
      { id: 'all', title: 'The shelf across all chats', cap: 'A place for all the things people shared with you, filtered by kind, person and time.', build: function (ctx) { return shelfAll(ctx, {}); } }
    ],
    flows: [
      { id: 'f1', title: 'Open a chat from the keyboard', steps: [
        { cap: '<span class="kk"><span class="k">Ctrl</span><span class="k">K</span></span> from Jonas’s chat. Recent chats show what is on their stage.', build: function (ctx) { return view(ctx, { p: 'jonas', thread: jonasSimple, obj: 'tix', tabs: ['tix'], pal: palC('') }); } },
        { cap: 'Type <b>mi</b>. The result says the chat opens with Chess, live, your move.', build: function (ctx) { return view(ctx, { p: 'jonas', thread: jonasSimple, obj: 'tix', tabs: ['tix'], pal: palC('Mi') }); } },
        { cap: '<span class="k">↵</span> opens Mira and puts the game back on the stage, exactly where it was.', build: function (ctx) { return view(ctx, { composer: { focus: true, text: '' } }); } }
      ] },
      { id: 'f2', title: 'Send a payment', steps: [
        { cap: 'Click Mira’s request card. The request opens on the stage, drawn by the WALLET from C# data, not by the chat.', build: function (ctx) { return view(ctx, { obj: 'req' }); } },
        { cap: '<b>Pay 120.00 IXI</b> → the NATIVE confirm. The stage cannot sign; only the dialog can.', build: function (ctx) { return view(ctx, { obj: 'req', over: K.natConfirm(ctx, natPay) }); } },
        { cap: 'Paid. The request object turns into a receipt; the chat card shows Paid.', build: function (ctx) { return view(ctx, { obj: 'req', paid: true, thread: cThread.map(function (m) { return m.k === 'req' ? Object.assign({}, m, { paid: 'pending' }) : m; }) }); } }
      ] },
      { id: 'f3', title: 'Use a mini-app beside a chat', steps: [
        { cap: 'Mira starts a game. The invite says what it is; the stage offers to open it here.', build: function (ctx) { return view(ctx, { noStage: true, thread: cThread.slice(0, 7).concat([{ k: 'app', dir: 'in', title: 'Chess', sub: 'Mira invited you · you play white', icon: 'knight', bg: 'var(--disc-grad-7)', btn: 'Join', btn2: 'Decline', t: '13:59', first: true }]) }); } },
        { cap: '<b>Join on stage</b>: Spixi checks the package and starts the app in its own sandbox, in the apps process.', build: function (ctx) { return view(ctx, { obj: 'chess', loading: true, tabs: ['chess'] }); } },
        { cap: 'Playing, with the chat beside the board. Moves travel end-to-end in the same conversation.', build: function (ctx) { return view(ctx, {}); } }
      ] },
      { id: 'f4', title: 'Find a file across chats', steps: [
        { cap: 'The Shelf: everything people shared with you, from every chat.', build: function (ctx) { return shelfAll(ctx, {}); } },
        { cap: 'Type <b>lease</b>; Files is picked. Three drafts from Mira, one checklist from Noor.', build: function (ctx) { return shelfAll(ctx, { q: 'lease' }); } },
        { cap: 'Open → the PDF goes on the stage, beside Mira’s chat, scrolled to the message.', build: function (ctx) {
          var t = cThread.map(function (m) { return m.k === 'file' ? Object.assign({}, m, { hl: true }) : m; }).slice(0, 7);
          return view(ctx, { obj: 'pdf', thread: t });
        } }
      ] }
    ]
  };
})();
