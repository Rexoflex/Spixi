/* np.js — "Desktop, not a mobile port": the desktop chat list and the desktop wallet, on Windows 11
   and macOS 27. Also exports R.N.wallet(ctx, o) and R.N.personalNav(ctx, cur) for A and C. */
var R = window.R || (window.R = {});
(function () {
  'use strict';
  var ic = K.ic, esc = K.esc, wv = K.wv;

  function personalNav(ctx, cur, o) {
    o = o || {};
    if (ctx.os === 'mac') {
      if (o.collapse) return '';
      var walletSub = cur === 'Wallet' ? [{ ic: 'chart', label: 'Overview', color: '#16a34a', cur: true }, { ic: 'clock', label: 'Activity', color: '#16a34a' }, { ic: 'arrow-down-left', label: 'Requests', count: '2', color: '#16a34a' }, { ic: 'qrcode', label: 'Addresses', color: '#16a34a' }] : null;
      var secs = [{ items: [{ ic: 'messages', label: 'Chats', count: '6', hot: true, cur: cur === 'Chats' }, { ic: o.third || 'folder', label: o.thirdLabel || 'Files', color: '#f59e0b', cur: cur === (o.thirdLabel || 'Files') },
        { ic: 'apps', label: 'Apps', color: '#a855f7' }, { ic: 'wallet', label: 'Wallet', color: '#16a34a', cur: cur === 'Wallet' && !walletSub }] }];
      if (walletSub) secs.push({ title: 'Wallet', items: walletSub });
      secs.push({ title: 'Pinned', items: [{ av: 'mira', label: 'Mira Novak', count: '2' }, { av: 'falcon', label: 'Falcon Crew', count: '3' }] });
      secs.push({ title: 'Agents', items: [{ av: 'disp', label: 'Dispatch', count: '1' }] });
      if (!walletSub) secs.push({ title: 'Communities', items: [{ av: 'comm', label: 'Ixian Community', count: '12' }] });
      return K.sidebar(ctx, secs, '<div class="dk-msb__foot">' + K.av(D.me, 26, { noDot: true }) + '<div class="col grow"><b style="font-weight:600">Maja Kos</b><span class="mac-sub">Online · 14 relays</span></div>' + ic('settings', 18, 'ic') + '</div>', { w: o.sbw || 214 });
    }
    return K.rail([
      { ic: 'messages', icf: 'messages-filled', label: 'Chats', cur: cur === 'Chats', badge: '6' },
      { ic: o.third || 'folder', label: o.thirdLabel || 'Files', cur: cur === (o.thirdLabel || 'Files') },
      { ic: 'apps', icf: 'apps-filled', label: 'Apps' },
      { ic: 'wallet', icf: 'wallet-filled', label: 'Wallet', cur: cur === 'Wallet' }
    ], '<span class="dk-rail__it" style="padding-top:4px">' + K.av(D.me, 30, { noDot: true }) + '<span>Account</span></span>');
  }

  /* ---------------------------------------------------------------- the desktop wallet */
  function wallet(ctx, o) {
    o = o || {};
    var W = ctx.w, mac = ctx.os === 'mac';
    var w = D.wallet;
    var inspW = W >= 1920 ? 380 : W >= 1440 ? 340 : 0;
    var sel = o.sel != null ? o.sel : 2;
    var head;
    var actions = '<span class="dk-btn dk-btn--fill">' + ic('arrow-up-right', 16) + 'Send</span><span class="dk-btn dk-btn--tonal">' + ic('arrow-down-left', 16) + 'Request</span><span class="dk-btn dk-btn--tonal">' + ic('qrcode', 16) + 'Receive</span>';
    if (mac) {
      head = K.colHead(ctx, (o.lights ? K.lights() + '<span style="width:12px"></span>' : '') + '<div class="col"><span class="mac-title">Overview</span><span class="mac-sub">Main wallet · 1Mk4 …9QzE</span></div>',
        '<span class="mac-cap" style="padding:0 2px;gap:0">' + '<span style="width:auto;padding:0 10px;gap:6px;display:inline-flex;align-items:center;font-size:13px;font-weight:600">' + ic('arrow-up-right', 16) + 'Send</span><span style="width:auto;padding:0 10px;gap:6px;display:inline-flex;align-items:center;font-size:13px">' + ic('arrow-down-left', 16) + 'Request</span><span style="width:auto;padding:0 10px;gap:6px;display:inline-flex;align-items:center;font-size:13px">' + ic('qrcode', 16) + 'Receive</span></span>' + K.tbtn(ctx, 'upload') + K.tbtn(ctx, 'side-r', { on: !!inspW }), { cls: 'dk-ch--conv' });
    } else {
      head = '<div class="dk-ch" style="height:auto;padding:16px 20px 0;align-items:flex-start;flex-direction:column;gap:10px"><div class="row" style="width:100%;gap:8px"><span class="h-sm grow">Wallet</span>' + actions + '<span class="dk-ib">' + ic('upload', 20) + '</span><span class="dk-ib' + (inspW ? ' dk-ib--on' : '') + '">' + ic('side-r', 20) + '</span></div>' +
        '<div class="win-sel" style="padding:0;margin:0">' + ['Overview', 'Activity', 'Requests 2', 'Addresses'].map(function (t, i) { return '<span' + (i === 0 ? ' aria-selected="true"' : '') + '>' + t + '</span>'; }).join('') + '</div></div>';
    }
    var chartW = W - (mac ? (o.collapse ? 0 : 214) : 74) - inspW - 64;
    var chartH = W >= 1920 ? 210 : W >= 1440 ? 168 : 150;
    var bal = '<div class="row" style="gap:28px;align-items:flex-end;padding:18px 24px 6px;flex-wrap:wrap">' +
      '<div class="col"><span class="lab-xs">Balance</span><span style="font-family:var(--font-display);font-size:' + (W >= 1440 ? 40 : 34) + 'px;line-height:1.1;font-weight:600;letter-spacing:-.02em" class="num">' + w.bal + '<small style="font-size:16px;margin-left:6px;color:var(--text-neutral-02)">IXI</small></span>' +
      '<span class="b-sm mut">≈ ' + w.fiat + ' · <span style="color:var(--text-amount-positive);font-weight:600">' + w.delta + ' IXI (' + w.deltaPct + ')</span> in 30 days</span></div>' +
      '<div class="col" style="gap:2px"><span class="lab-xs">In · 30 days</span><span class="l-md num" style="color:var(--text-amount-positive)">+1,208.00</span></div><div class="col" style="gap:2px"><span class="lab-xs">Out · 30 days</span><span class="l-md num">−993.48</span></div><div class="col" style="gap:2px"><span class="lab-xs">Pending</span><span class="l-md num">0</span></div>' +
      '<span class="grow"></span><span class="dk-seg dk-seg--l">' + ['1W', '1M', '3M', '1Y', 'All'].map(function (r) { return '<span' + (r === '1M' ? ' aria-pressed="true"' : '') + '>' + r + '</span>'; }).join('') + '</span></div>' +
      '<div style="padding:4px 24px 8px">' + K.chart(w.series, chartW, chartH) + '</div>';
    var reqs = '<div class="row" style="gap:10px;padding:2px 24px 12px">' + w.requests.map(function (r) {
      var p = K.person(r.who);
      return '<div class="dk-setrow" style="margin:0;flex:1;min-width:0">' + K.av(p, 32, { noDot: true }) + '<div class="col grow" style="min-width:0"><span class="l-sm ell">' + (r.dir === 'in' ? esc(p.name) + ' asks ' + r.amt + ' IXI' : 'You asked ' + esc(p.name.split(' ')[0]) + ' for ' + r.amt + ' IXI') + '</span><span class="b-xs mut ell">' + esc(r.note) + ' · ' + r.when + '</span></div>' +
        (r.dir === 'in' ? '<span class="dk-btn dk-btn--fill">Pay</span>' : '<span class="dk-tag">Waiting</span>') + '</div>';
    }).join('') + '</div>';
    var rows = w.rows.slice(0, W >= 1920 ? 12 : W >= 1440 ? 9 : 7);
    var table = '<div class="row" style="gap:8px;padding:4px 24px 10px"><span class="l-md grow">Activity</span><span class="dk-chips" style="padding:0;flex-wrap:nowrap">' + ['All', 'Incoming', 'Outgoing', 'Apps'].map(function (c, i) { return '<span class="dk-chip"' + (i === 0 ? ' aria-pressed="true"' : '') + '>' + c + '</span>'; }).join('') + '</span>' +
      '<span class="dk-sf" style="margin:0;width:200px;height:32px">' + ic('search', 16) + '<span class="b-sm">Filter activity</span></span></div>' +
      '<div style="padding:0 16px"><table class="dk-tbl"><thead><tr><th>Date ' + ic('arrow-down', 12, '', 'display:inline;vertical-align:-1px') + '</th><th>With</th><th>Note</th><th class="r">Amount (IXI)</th><th>Status</th></tr></thead><tbody>' +
      rows.map(function (r, i) {
        var p = K.person(r.who);
        return '<tr' + (i === sel ? ' aria-selected="true"' : '') + '><td class="mut">' + esc(r.d) + '</td><td><span class="dk-cell">' + K.av(p, 24, { noDot: true }) + '<span class="ell" style="max-width:140px">' + esc(p.name) + '</span></span></td><td><span class="ell" style="display:inline-block;max-width:' + (W >= 1920 ? 280 : 170) + 'px;vertical-align:middle">' + esc(r.note) + '</span>' + (r.app ? ' <span class="dk-tag dk-tag--info">' + esc(r.app) + '</span>' : '') + '</td><td class="r">' + K.amt(r.amt) + '</td><td><span class="dk-status dk-status--ok" style="font-weight:500">' + ic('check-circle', 14) + 'Confirmed</span></td></tr>';
      }).join('') + '</tbody></table></div>';
    var insp = '';
    if (inspW) {
      var r = w.rows[sel], p = K.person(r.who);
      insp = '<aside class="dk-side" style="width:' + inspW + 'px"' + wv('shell', 'Payment inspector · shell WebView (trusted)') + '>' + K.colHead(ctx, '<span class="l-md">Payment</span>', K.tbtn(ctx, 'dots') + K.tbtn(ctx, 'x')) +
        '<div class="col" style="padding:18px;gap:14px">' +
        '<div class="col" style="gap:2px"><span class="b-sm mut">You sent</span><span class="dk-amt num" style="font-size:30px;line-height:36px">' + esc(r.amt.replace('-', '')) + '<small>IXI</small></span><span class="b-sm mut">≈ $106.70 · ' + esc(r.d) + '</span></div>' +
        '<div class="dk-setrow" style="margin:0">' + K.av(p, 36) + '<div class="col grow" style="min-width:0"><span class="l-sm">' + esc(p.name) + '</span><span class="mono mut ell">' + esc(p.addr || '') + '</span></div>' + ic('message', 18, 'ic-a') + '</div>' +
        '<div class="col" style="gap:0">' + [['check-circle', 'Signed on this device', '19:30:02', true], ['check-circle', 'In block 4,812,331', '19:30:31', true], ['check-circle', 'Final · 5 of 5 blocks', '19:32:41', true]].map(function (s, i, a) {
          return '<div class="row" style="gap:10px;align-items:flex-start"><div class="col" style="align-items:center"><span style="color:var(--icon-success)">' + ic(s[0], 18) + '</span>' + (i < a.length - 1 ? '<i style="width:2px;height:18px;background:var(--outline-success-inverse);display:block"></i>' : '') + '</div><span class="b-sm grow">' + s[1] + '</span><span class="b-xs mut num">' + s[2] + '</span></div>';
        }).join('') + '</div>' +
        '<dl class="col" style="margin:0;gap:8px;font-size:13px">' + [['Note', esc(r.note)], ['App', 'Split 2.1 · mini-app payment'], ['Network fee', '0.0100 IXI'], ['Transaction', '<span class="mono">7f3a 9c21 … 44d0 c91e</span>']].map(function (kv) { return '<div class="row" style="gap:12px"><dt class="mut" style="width:96px;flex:none">' + kv[0] + '</dt><dd style="margin:0" class="grow">' + kv[1] + '</dd></div>'; }).join('') + '</dl>' +
        '<div class="col" style="gap:8px"><span class="dk-btn dk-btn--tonal" style="justify-content:flex-start">' + ic('message', 16) + 'Open chat with Mira</span><span class="dk-btn dk-btn--tonal" style="justify-content:flex-start">' + ic('external-link', 16) + 'Open in explorer</span><span class="dk-btn dk-btn--tonal" style="justify-content:flex-start">' + ic('download', 16) + 'Save receipt (PDF)</span></div>' +
        '</div></aside>';
    }
    var main = '<section class="col grow" style="min-width:0;overflow:hidden;background:var(--surface-screen)"' + wv('shell', 'Wallet · shell WebView (trusted) — no chat content here') + '>' + head + '<div class="col grow" style="min-height:0;overflow:hidden">' + bal + reqs + table + '</div></section>';
    var nav = personalNav(ctx, 'Wallet', { collapse: o.collapse, third: o.third, thirdLabel: o.thirdLabel });
    return K.frame(ctx, { nav: nav, body: main + insp, title: { search: 'Search chats, people, payments, actions' } });
  }

  /* ---------------------------------------------------------------- the desktop chat list */
  function chatsView(ctx) {
    var mac = ctx.os === 'mac';
    var rows = D.chats.map(function (r) {
      var c = Object.assign({}, r);
      if (c.p === 'falcon') c.typing = true;
      if (c.p === 'tomaz') { c.draft = 'Sure, sending the QR now'; }
      return c;
    });
    var list = K.listPane(ctx, { w: mac ? 320 : 340, rows: rows, sel: 'mira', hover: 'jonas', av: 40, filters: mac ? ['All', 'Unread', 'Groups', 'Agents'] : ['All', 'Unread 6', 'Groups', 'Agents', '@ Mentions'],
      sections: [
        { title: 'Pinned', rows: rows.filter(function (r) { return r.pin; }) },
        { title: 'Agents', rows: rows.filter(function (r) { return r.agent; }) },
        { title: 'Chats', rows: rows.filter(function (r) { return !r.pin && !r.agent; }) }
      ] });
    var conv = K.conv(ctx, { p: 'mira', thread: D.miraThread, wide: true });
    return K.frame(ctx, { nav: personalNav(ctx, 'Chats'), body: list + conv });
  }

  R.N = {
    personalNav: personalNav,
    wallet: wallet,
    items: [
      { build: chatsView }, { build: chatsView },
      { build: function (ctx) { return wallet(ctx, {}); } }, { build: function (ctx) { return wallet(ctx, {}); } }
    ]
  };
})();
