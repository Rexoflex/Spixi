/* dir-b.js — B · OFFICE. Spixi for business: team inbox, directory, ledger, tools dock (mini-apps
   and agents beside the chat), approvals. Same world as the Spixi for Business concept renders. */
var R = window.R || (window.R = {});
(function () {
  'use strict';
  var ic = K.ic, esc = K.esc, wv = K.wv;

  function nav(ctx, cur) {
    if (ctx.os === 'mac') {
      if (ctx.w < 1440) return '';
      return K.sidebar(ctx, [
        { items: [{ ic: 'inbox', label: 'Inbox', count: '12', hot: true, cur: cur === 'Inbox' }, { ic: 'users', label: 'Directory', color: '#0ea5e9', cur: cur === 'Directory' },
          { ic: 'receipt', label: 'Ledger', color: '#16a34a', cur: cur === 'Ledger' }, { ic: 'check-circle', label: 'Approvals', color: '#f59e0b', count: '3', cur: cur === 'Approvals' }, { ic: 'apps', label: 'Apps & agents', color: '#a855f7' }] },
        { title: 'Views', items: [{ ic: 'user-circle', label: 'Assigned to me', count: '4', color: 'var(--icon-neutral-02)' }, { ic: 'circle-dashed-plus', label: 'Unassigned', count: '3', color: 'var(--icon-neutral-02)' }, { ic: 'clock', label: 'Waiting on customer', count: '2', color: 'var(--icon-neutral-02)' }] },
        { title: 'Agents', items: [{ av: 'disp', label: 'Dispatch', count: '1' }, { av: 'ledg', label: 'Ledger agent' }] },
        { title: 'Teams', items: [{ ic: 'users', label: 'Ops · 8', color: 'var(--icon-neutral-02)' }, { ic: 'users', label: 'Finance · 4', color: 'var(--icon-neutral-02)' }] }
      ], '<div class="dk-msb__foot"><span class="dk-ws__logo" style="width:26px;height:26px;border-radius:7px;font-size:11px">NF</span><div class="col grow"><b style="font-weight:600">Northwind Freight</b><span class="mac-sub">Maja Kos · Ops lead</span></div>' + ic('chevron-down', 16, 'ic') + '</div>', { w: 224 });
    }
    return K.rail([
      { ic: 'inbox', label: 'Inbox', cur: cur === 'Inbox', badge: '12' },
      { ic: 'users', label: 'People', cur: cur === 'Directory' },
      { ic: 'receipt', label: 'Ledger', cur: cur === 'Ledger' },
      { ic: 'check-circle', label: 'Approve', cur: cur === 'Approvals', badge: '3' },
      { ic: 'apps', icf: 'apps-filled', label: 'Tools' }
    ], '<span class="dk-rail__it" style="padding-top:4px">' + K.av(D.me, 30, { noDot: true }) + '<span>Account</span></span>');
  }
  function title(ctx) {
    return { left: '<span class="dk-ws"><span class="dk-ws__logo">NF</span>Northwind Freight' + ic('chevron-down', 14, 'ic') + '</span>', search: 'Search people, conversations, ledger, files',
      right: '<span class="dk-tag dk-tag--ok" style="height:22px;padding:0 8px">● Ixian · PQ hybrid</span>' };
  }

  /* ------------------------------------------------------------ inbox */
  function inboxRow(r, o) {
    var p = K.person(r.c);
    var a = r.a ? K.person(r.a) : null;
    var wait = r.w ? '<span class="dk-tag ' + (/h/.test(r.w) || parseInt(r.w, 10) >= 30 ? 'dk-tag--warn' : '') + '">' + ic('clock', 11) + r.w + '</span>' : '';
    var state = r.s === 'done' ? '<span class="dk-tag dk-tag--ok">Done</span>' : r.s === 'new' ? '<span class="dk-tag dk-tag--info">New</span>' : r.s === 'waiting' ? '<span class="dk-tag">Waiting</span>' : '';
    var attrs = (o.sel === r.c ? ' aria-current="true"' : '') + (r.u ? ' data-unread' : '') + (o.focus === r.c ? ' data-focus' : '');
    return '<div class="dk-cr dk-ir"' + attrs + '>' + K.av(p, 36, { badge: true }) + '<div class="dk-cr__c" style="gap:2px">' +
      '<div class="dk-cr__n"><span class="ell">' + esc(p.name) + '</span><span class="mut ell" style="font-weight:400;font-size:12px">' + esc(p.org || '') + '</span></div>' +
      '<div class="dk-cr__x"><span class="ell">' + (r.st === 'read' ? '' : '') + esc(r.ex) + '</span></div>' +
      '<div class="row" style="gap:6px;margin-top:3px">' + '<span class="dk-tag ' + (r.lab === 'Approval' ? 'dk-tag--agent' : '') + '">' + esc(r.lab) + '</span>' + state + wait + '<span class="grow"></span>' +
      (a ? '<span class="row b-xs mut" style="gap:4px">' + K.av(a, 16, { noDot: true }) + (r.a === 'maja' ? 'You' : esc(a.name.split(' ')[0])) + '</span>' : '<span class="b-xs" style="color:var(--text-warning);font-weight:600">Unassigned</span>') +
      '</div></div><div class="dk-cr__r" style="align-self:flex-start;padding-top:2px"><span class="dk-cr__t">' + esc(r.t) + '</span>' + (r.u ? '<span class="dk-ind">' + r.u + '</span>' : '') + '</div></div>';
  }
  function inboxPane(ctx, o) {
    o = o || {};
    var mac = ctx.os === 'mac';
    var w = ctx.w >= 1920 ? 400 : ctx.w >= 1440 ? (mac ? 340 : 360) : 320;
    var tabs = ['Mine 4', 'Team 11', 'Unassigned 3', 'Done'];
    var head = mac ? K.colHead(ctx, (o.lights ? K.lights() + '<span style="width:10px"></span>' : '') + '<div class="col"><span class="mac-title">Inbox</span><span class="mac-sub">12 open · 3 unassigned</span></div>', K.tbtn(ctx, 'filter') + K.tbtn(ctx, 'pencil')) +
      '<div class="mac-scope">' + tabs.map(function (t, i) { return '<span' + (i === 1 ? ' aria-pressed="true"' : '') + '>' + t + '</span>'; }).join('') + '</div>'
      : K.colHead(ctx, '<span class="h-sm">Inbox</span>', K.tbtn(ctx, 'filter') + K.tbtn(ctx, 'sort') + K.tbtn(ctx, 'message-plus', { a: true })) +
      '<div class="win-sel">' + tabs.map(function (t, i) { return '<span' + (i === 1 ? ' aria-selected="true"' : '') + '>' + t + '</span>'; }).join('') + '</div>';
    var rows = D.inbox.map(function (r) { return inboxRow(r, o); }).join('');
    return '<section class="dk-pane" style="width:' + w + 'px"' + wv('shell', 'Team inbox · shell WebView (trusted, textContent only)') + '>' + head +
      '<div class="dk-list" style="padding-top:2px">' + rows + '</div></section>';
  }

  /* ------------------------------------------------------------ conversation with assignment bar */
  function assignBar(ctx, o) {
    o = o || {};
    if (o.other) return '<div class="dk-abar">' + K.av('luka', 20, { noDot: true }) + '<span class="b-sm"><b>Luka is on this one</b> · since 12:55</span><span class="grow"></span><span class="dk-btn dk-btn--ghost">Note to Luka</span><span class="dk-btn dk-btn--tonal">Take over</span></div>';
    var narrow = ctx.w < 1440 || (ctx.os === 'mac' && ctx.w < 1920);
    return '<div class="dk-abar">' + K.av('maja', 20, { noDot: true }) + '<span class="b-sm ell"><b>Assigned to you</b> · Open · waiting 12 min</span><span class="grow"></span>' + (narrow ? '<span class="dk-ib" style="width:28px;height:28px">' + ic('users', 16) + '</span>' : '<span class="dk-btn dk-btn--ghost">' + ic('users', 16) + 'Reassign</span>') + '<span class="dk-btn dk-btn--tonal">' + ic('check', 16) + (narrow ? 'Done' : 'Mark done') + '</span></div>';
  }
  function convB(ctx, o) {
    o = o || {};
    return K.conv(ctx, { p: o.p || 'ana', thread: o.thread || D.anaThread, banner: assignBar(ctx, o.bar), wide: ctx.w >= 1920,
      composer: o.composer || { placeholder: 'Reply to Ana' }, wvl: 'Conversation · chat WebView · chat process (Ana Ruiz)' });
  }

  /* ------------------------------------------------------------ tools dock */
  function dockStrip(ctx, cur) {
    var it = [['user-square-rounded', 'customer'], ['receipt', 'invoices'], ['robot', 'dispatch', 1], ['folder', 'files'], ['plus', 'add']];
    return '<div class="dk-dock"' + wv('shell', 'Tool strip · shell') + '>' + it.map(function (x) { return '<span class="dk-dock__b"' + (x[1] === cur ? ' aria-current="true"' : '') + '>' + ic(x[0], 20) + (x[2] ? '<i class="bd"></i>' : '') + '</span>'; }).join('') + '</div>';
  }
  function customerCard(ctx, w) {
    var p = D.cust.ana;
    return '<aside class="dk-side" style="width:' + w + 'px;border-inline-start:0"' + wv('shell', 'Customer card · shell WebView (trusted) — may show ledger data') + '>' +
      K.colHead(ctx, '<span class="l-md">Customer</span>', K.tbtn(ctx, 'popout') + K.tbtn(ctx, 'dots')) +
      '<div class="col" style="padding:16px;gap:14px;overflow:hidden">' +
      '<div class="row" style="gap:12px">' + K.av(p, 52) + '<div class="col grow" style="min-width:0"><span class="h-xs">' + esc(p.name) + '</span><span class="b-sm mut">Logistics lead · ' + esc(p.org) + '</span><span class="dk-status dk-status--ok" style="margin-top:2px">' + ic('shield-check', 14) + 'Key verified in person · 2 Sep</span></div></div>' +
      '<span class="dk-addr mono" style="align-self:flex-start">' + esc(p.addr) + ic('copy', 14) + '</span>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap"><span class="dk-tag dk-tag--info">Key account</span><span class="dk-tag">Cold chain</span><span class="dk-tag">Koper ↔ Munich</span>' + ic('plus', 14, 'ic') + '</div>' +
      '<div class="dk-setrow" style="margin:0;flex-direction:column;align-items:stretch;gap:8px"><span class="lab-xs">This conversation</span>' +
      [['Owner', K.av('maja', 18, { noDot: true }) + ' You'], ['State', 'Open'], ['Label', 'Invoice'], ['Opened', 'Today 13:02']].map(function (kv) { return '<div class="row b-sm" style="gap:8px"><span class="mut" style="width:70px">' + kv[0] + '</span><span class="row" style="gap:6px">' + kv[1] + '</span></div>'; }).join('') + '</div>' +
      '<div class="dk-setrow" style="margin:0;flex-direction:column;align-items:stretch;gap:8px"><div class="row"><span class="lab-xs grow">Open requests to pay</span><span class="b-xs" style="color:var(--text-action-default);font-weight:600">Ledger ›</span></div>' +
      '<div class="row" style="gap:10px">' + ic('receipt', 18, 'ic-a') + '<div class="col grow"><span class="l-sm">INV-2291 · September</span><span class="b-xs mut">due 15 Oct</span></div><b class="num">12,500.00</b></div></div>' +
      '<div class="dk-setrow" style="margin:0;flex-direction:column;align-items:stretch;gap:7px"><div class="row"><span class="lab-xs grow">Team notes · 3</span><span class="b-xs mut">only your team</span></div>' +
      [['luka', 'Luka', 'Dispatch proposes a reroute via Tarvisio. Waiting for Maja.', '13:10'], ['luka', 'Luka', 'Prefers calls before 10:00.', 'Mon'], ['priya', 'Priya', 'Pays within 5 days, never late.', 'Sep']].map(function (n) { return '<div class="row b-sm" style="gap:8px;align-items:flex-start">' + K.av(n[0], 18, { noDot: true }) + '<span class="grow"><b>' + n[1] + ':</b> ' + n[2] + '</span><span class="b-xs mut">' + n[3] + '</span></div>'; }).join('') +
      '<div class="dk-sf" style="margin:2px 0 0;height:32px;border-radius:8px">' + ic('note', 15) + '<span class="b-sm">Add a note for the team</span></div></div>' +
      (ctx.h >= 1000 ? '<div class="col" style="gap:4px"><span class="lab-xs">Files · 6</span>' + D.bizFiles.filter(function (f) { return f.org === 'Adriatic Shipping'; }).slice(0, 3).map(function (f) { return '<div class="row" style="gap:10px;padding:4px 0">' + K.ftype(f.name, 24) + '<div class="col grow" style="min-width:0"><span class="l-sm ell">' + esc(f.name) + '</span><span class="b-xs mut">' + esc(K.person(f.from).name + ' · ' + f.when) + '</span></div></div>'; }).join('') + '</div>' : '') +
      '</div></aside>';
  }
  function invoicesApp(ctx, w, o) {
    o = o || {};
    var sent = o.sent;
    return '<aside class="dk-side" style="width:' + w + 'px;border-inline-start:0"' + wv('apps', 'Mini-app "Invoices" · its own WebView · apps process (sandbox)') + '>' +
      K.colHead(ctx, '<span class="dk-med dk-med--sq" style="width:28px;height:28px;background:var(--disc-grad-4);color:#fff">' + ic('receipt', 16) + '</span><span class="l-md">Invoices</span>', K.tbtn(ctx, 'popout') + K.tbtn(ctx, 'x')) +
      '<div class="dk-prov">' + ic('shield-check', 14, 'sh') + '<span><b>Invoices 3.0</b> · Northwind (own app) · may ask to post a payment request</span></div>' +
      '<div class="app-inv grow col" style="padding:16px;gap:10px;overflow:hidden;font-size:13px">' +
      '<div class="row" style="justify-content:space-between"><b style="font-size:17px">New invoice</b><span style="opacity:.6">INV-2304</span></div>' +
      '<div style="padding:10px 12px;border-radius:8px;background:rgba(30,90,60,.08)"><small style="opacity:.6">Bill to</small><br><b>Adriatic Shipping</b> · Ana Ruiz</div>' +
      [['Reefer 17 · defrost service', '1', '260.00'], ['Express re-route TR-44', '1', '80.00']].map(function (r) { return '<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid rgba(30,60,40,.15)"><span style="flex:1">' + r[0] + '</span><span style="width:24px;opacity:.6">×' + r[1] + '</span><b style="width:70px;text-align:right">' + r[2] + '</b></div>'; }).join('') +
      '<div style="display:flex;justify-content:space-between;font-size:16px;padding-top:4px"><span>Total</span><b>340.00 IXI</b></div><div style="opacity:.65">Due 25 Oct · Net 14</div>' +
      (sent ? '<div style="margin-top:auto;padding:12px;border-radius:8px;background:var(--inv-ok);color:#fff;font-weight:600">✓ Request posted in the chat with Ana</div>'
        : '<div style="margin-top:auto;display:flex;gap:8px"><span style="flex:1;text-align:center;padding:10px;border-radius:8px;border:1.5px solid var(--inv-acc);color:var(--inv-acc);font-weight:700">Save draft</span><span style="flex:1.4;text-align:center;padding:10px;border-radius:8px;background:var(--inv-acc);color:var(--inv-on);font-weight:700">Request 340 IXI from Ana</span></div>') +
      '</div></aside>';
  }
  function agentPanel(ctx, w) {
    return '<aside class="dk-side" style="width:' + w + 'px;border-inline-start:0"' + wv('apps', 'Agent session pane "Dispatch" · its own WebView · apps process') + '>' +
      K.colHead(ctx, K.av('disp', 28) + '<div class="col"><span class="l-md">Dispatch</span><span class="b-xs mut">Agent · ops-server-2 · your hardware</span></div>', K.tbtn(ctx, 'pause') + K.tbtn(ctx, 'x')) +
      '<div class="dk-prov">' + ic('shield-check', 14, 'sh') + '<span><b>Can</b> message drivers, read telemetry · <b>Cannot</b> pay or delete</span></div>' +
      '<div class="col" style="padding:14px;gap:12px;overflow:hidden">' +
      '<div class="dk-setrow" style="margin:0;flex-direction:column;align-items:stretch;gap:8px;box-shadow:0 0 0 1.5px var(--outline-action-default)"><div class="row" style="gap:8px"><span class="dk-tag dk-tag--agent">Proposal</span><span class="b-xs mut grow">13:18</span></div>' +
      '<b class="l-md">Reroute TR-44 via Tarvisio</b><span class="b-sm mut">Saves about 1 h 40 min. Reefer 17 stays under 5 °C if the defrost finishes by 15:10.</span>' +
      '<div class="row" style="gap:8px"><span class="dk-btn dk-btn--out dk-btn--w">Review</span><span class="dk-btn dk-btn--fill dk-btn--w">Approve…</span></div></div>' +
      '<span class="lab-xs">Routines</span>' +
      [['Morning fleet check', 'Every day 06:30', 'Last: OK 06:31'], ['Reefer temperature watch', 'Every 5 min', 'Last: 7.8 °C ⚠'], ['Weekly route report', 'Mon 08:00', 'Next: in 2 days']].map(function (r, i) {
        return '<div class="row" style="gap:10px;padding:6px 0;border-bottom:1px solid var(--outline-neutral-01)"><span class="dk-med" style="width:30px;height:30px">' + ic(i === 1 ? 'pulse' : 'clock', 16) + '</span><div class="col grow" style="min-width:0"><span class="l-sm ell">' + r[0] + '</span><span class="b-xs mut">' + r[1] + ' · ' + r[2] + '</span></div>' + ic('player-play', 16, 'ic') + ic('pause', 16, 'ic') + '</div>';
      }).join('') +
      '<span class="b-xs mut">Every agent action waits for your approval in a native dialog. The agent never holds keys.</span></div></aside>';
  }
  function dock(ctx, tool, o) {
    var w = ctx.w >= 1920 ? 380 : ctx.w >= 1440 ? 340 : 300;
    var panel = tool === 'invoices' ? invoicesApp(ctx, w, o) : tool === 'dispatch' ? agentPanel(ctx, w) : tool === 'none' ? '' : customerCard(ctx, w);
    return '<div class="row" style="align-items:stretch;flex:none;border-inline-start:1px solid var(--outline-neutral-03)">' + panel + dockStrip(ctx, tool) + '</div>';
  }

  function view(ctx, s) {
    s = s || {};
    var mac = ctx.os === 'mac', collapse = mac && ctx.w < 1440;
    var body = inboxPane(ctx, { sel: s.sel || 'ana', focus: s.focus, lights: collapse }) + convB(ctx, s.conv || {}) + dock(ctx, s.tool || 'customer', s.toolOpt || {});
    var over = (s.pal ? K.palette(ctx, s.pal) : '') + (s.over || '');
    return K.frame(ctx, { nav: nav(ctx, 'Inbox'), body: body, over: over, title: title(ctx) });
  }

  /* ------------------------------------------------------------ directory */
  function directory(ctx, s) {
    s = s || {};
    var mac = ctx.os === 'mac', collapse = mac && ctx.w < 1440;
    var tab = s.tab || 'People';
    var facets = '<section class="dk-pane" style="width:230px"' + wv('shell', 'Directory · shell WebView (trusted)') + '>' +
      (mac ? K.colHead(ctx, (collapse ? K.lights() + '<span style="width:10px"></span>' : '') + '<span class="mac-title">Directory</span>', K.tbtn(ctx, 'user-plus')) : K.colHead(ctx, '<span class="h-sm">Directory</span>', K.tbtn(ctx, 'user-plus', { a: true }))) +
      '<div class="dk-list" style="padding:0 8px">' +
      [['users', 'Everyone', '248', tab === 'People' && !s.org], ['building', 'Customers', '186'], ['building', 'Suppliers', '44'], ['users', 'Our team', '12'], ['robot', 'Agents', '2']].map(function (f) { return '<div class="dk-fac"' + (f[3] ? ' aria-current="true"' : '') + '>' + ic(f[0], 18) + '<span class="grow">' + f[1] + '</span><span class="mut num">' + f[2] + '</span></div>'; }).join('') +
      '<div class="dk-sech" style="padding-inline:8px">' + ic('chevron-down', 14) + 'Organisations</div>' +
      [['Adriatic Shipping', '3'], ['Port of Koper', '5'], ['Milano Freddo', '2'], ['Nordhavn Cargo', '4'], ['Alpen Logistik', '2'], ['Rotterdam Dock 4', '1'], ['Graz Depot', '2']].map(function (f) { return '<div class="dk-fac"' + (s.org === f[0] ? ' aria-current="true"' : '') + '><span class="dk-ws__logo" style="background:var(--disc-grad-' + (f[0].length % 11 + 1) + ')">' + f[0].split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2) + '</span><span class="grow ell">' + f[0] + '</span><span class="mut num">' + f[1] + '</span></div>'; }).join('') +
      '</div></section>';
    var main = '<section class="col grow" style="min-width:0;overflow:hidden"' + wv('shell', 'Directory table · shell WebView (trusted)') + '>' +
      '<div class="dk-ch" style="height:auto;padding:14px 20px 0;flex-direction:column;align-items:stretch;gap:10px"><div class="row" style="gap:10px"><span class="h-sm grow">' + (tab === 'Files' ? 'Files in all conversations' : 'People') + '</span>' +
      '<span class="dk-sf" style="margin:0;width:260px;height:32px">' + ic('search', 16) + '<span class="b-sm' + (s.q ? '" style="color:var(--text-neutral-01)' : '') + '">' + esc(s.q || 'Filter by name, org, tag') + '</span></span>' + (tab === 'Files' ? '' : '<span class="dk-btn dk-btn--fill">' + ic('user-plus', 16) + 'Add contact</span>') + '</div>' +
      '<div class="win-sel" style="padding:0;margin:0">' + ['People', 'Organisations', 'Files', 'Agents'].map(function (t) { return '<span' + (t === tab ? ' aria-selected="true"' : '') + '>' + t + '</span>'; }).join('') + '</div></div>';
    var insp = '';
    if (tab === 'Files') {
      var files = D.bizFiles.slice();
      if (s.org) files = files.filter(function (f) { return f.org === s.org && /BoL|lading/i.test(f.name); });
      main += '<div class="row" style="gap:6px;padding:10px 20px"><span class="dk-chip"' + (s.org ? ' aria-pressed="true"' : '') + '>Type: PDF' + ic('chevron-down', 12) + '</span><span class="dk-chip"' + (s.org ? ' aria-pressed="true"' : '') + '>' + (s.org ? 'Org: ' + esc(s.org) : 'Any organisation') + ic('chevron-down', 12) + '</span><span class="dk-chip">Any person' + ic('chevron-down', 12) + '</span><span class="dk-chip">Any time' + ic('chevron-down', 12) + '</span><span class="grow"></span><span class="b-sm mut">' + files.length + ' files</span></div>' +
        '<div style="padding:0 12px;overflow:hidden"><table class="dk-tbl"><thead><tr><th>Name</th><th>From</th><th>Organisation</th><th>Date</th><th class="r">Size</th></tr></thead><tbody>' +
        files.map(function (f, i) { return '<tr' + (s.fileSel === i ? ' aria-selected="true"' : '') + '><td><span class="dk-cell">' + K.ftype(f.name, 22) + '<span class="ell" style="max-width:220px">' + K.hl(f.name, s.q ? 'BoL' : '') + '</span></span></td><td><span class="dk-cell">' + K.av(f.from, 22, { noDot: true }) + esc(K.person(f.from).name) + '</span></td><td class="mut">' + esc(f.org) + '</td><td class="mut">' + esc(f.when) + '</td><td class="r mut num">' + esc(f.size) + '</td></tr>'; }).join('') +
        '</tbody></table></div>';
      if (s.fileSel != null) {
        var f = files[s.fileSel];
        insp = '<aside class="dk-side" style="width:' + (ctx.w >= 1440 ? 400 : 340) + 'px"' + wv('chat', 'File preview · its own WebView · chat process (renders the file)') + '>' + K.colHead(ctx, '<span class="l-md ell">' + esc(f.name) + '</span>', K.tbtn(ctx, 'download') + K.tbtn(ctx, 'x')) +
          '<div class="dk-prov">' + ic('eye2', 14) + '<span>From <b>' + esc(K.person(f.from).name) + '</b> · ' + esc(f.org) + ' · ' + esc(f.when) + '</span></div>' +
          '<div class="grow" style="display:grid;place-items:center;padding:16px;background:var(--surface-neutral-02)"><div class="pdfp" style="width:300px;height:400px"><h4>Bill of Lading</h4><p>No. ADS-4410 · Koper → Munich · Reefer 17</p>' + Array(5).join('<div class="ln"></div>') + '<div class="ln hl" style="width:70%"></div>' + Array(10).join('<div class="ln"></div>') + '</div></div>' +
          '<div class="row" style="gap:8px;padding:12px 16px;border-top:1px solid var(--outline-neutral-02)"><span class="dk-btn dk-btn--fill dk-btn--w">' + ic('message', 16) + 'Show in conversation</span><span class="dk-btn dk-btn--tonal">' + ic('download', 16) + 'Save</span></div></aside>';
      }
    } else {
      var people = ['ana', 'davor', 'marco', 'mila', 'hans', 'sofia', 'erik', 'oskar', 'lin', 'ruth', 'disp', 'ledg'];
      main += '<div class="row" style="gap:6px;padding:10px 20px"><span class="dk-chip" aria-pressed="true">All 248</span><span class="dk-chip">Online now 37</span><span class="dk-chip">Key verified 212</span><span class="dk-chip">Tag: Key account</span><span class="grow"></span><span class="b-sm mut">Sorted by last contact</span></div>' +
        '<div style="padding:0 12px;overflow:hidden"><table class="dk-tbl"><thead><tr><th>Name</th><th>Organisation</th><th>Ixian address</th><th>Key</th><th>Owner</th><th>Last contact</th></tr></thead><tbody>' +
        people.map(function (id, i) {
          var p = K.person(id);
          var owner = ['maja', 'priya', 'luka', 'luka', 'maja', 'tea', 'priya', 'maja', 'tea', 'luka', null, null][i];
          return '<tr' + (i === 0 ? ' aria-selected="true"' : '') + '><td><span class="dk-cell">' + K.av(p, 28) + '<span class="col"><b style="font-weight:600">' + esc(p.name) + '</b>' + (p.kind === 'agent' ? '<span class="b-xs mut">Agent</span>' : '') + '</span></span></td><td class="mut">' + esc(p.org || '') + '</td><td class="mono mut">' + esc(p.addr || ('1' + p.ini + 'q 7Hd2 …' + (i * 37 + 11) + 'xK')) + '</td><td>' + (i % 5 === 3 ? '<span class="dk-tag dk-tag--warn">Not verified</span>' : '<span class="dk-tag dk-tag--ok">' + ic('shield-check', 11) + 'Verified</span>') + '</td><td>' + (owner ? '<span class="dk-cell">' + K.av(owner, 20, { noDot: true }) + esc(K.person(owner).name.split(' ')[0]) + '</span>' : '<span class="mut">—</span>') + '</td><td class="mut">' + ['13:41', 'Yesterday', '12:55', 'Fri', '12:20', '13:30', '11:47', 'Yesterday', '11:02', '10:15', '13:18', '09:00'][i] + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      if (ctx.w >= 1920 || (ctx.w >= 1440 && !mac)) insp = '<div class="row" style="align-items:stretch;flex:none;border-inline-start:1px solid var(--outline-neutral-03)">' + customerCard(ctx, ctx.w >= 1920 ? 380 : 330) + '</div>';
    }
    main += '</section>';
    return K.frame(ctx, { nav: nav(ctx, 'Directory'), body: facets + main + insp, title: title(ctx), over: s.over || '' });
  }

  /* ------------------------------------------------------------ ledger */
  function ledger(ctx, s) {
    s = s || {};
    var mac = ctx.os === 'mac', collapse = mac && ctx.w < 1440;
    var tab = s.tab || 'Activity';
    var head = '<div class="dk-ch" style="height:auto;padding:14px 20px 0;flex-direction:column;align-items:stretch;gap:10px"><div class="row" style="gap:8px">' + (collapse ? K.lights() + '<span style="width:12px"></span>' : '') + '<span class="h-sm grow">Ledger · Treasury wallet</span>' +
      '<span class="dk-btn dk-btn--fill">' + ic('arrow-up-right', 16) + 'Send</span><span class="dk-btn dk-btn--tonal">' + ic('arrow-down-left', 16) + 'Request</span><span class="dk-btn dk-btn--tonal">' + ic('upload', 16) + 'Export CSV</span></div>' +
      '<div class="win-sel" style="padding:0;margin:0">' + ['Activity', 'Requests 3', 'Payees', 'Reports'].map(function (t) { return '<span' + (t.indexOf(tab) === 0 ? ' aria-selected="true"' : '') + '>' + t + '</span>'; }).join('') + '</div></div>';
    var stats = '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;padding:14px 20px 6px">' +
      [['Balance', '182,450.25', 'IXI', ''], ['In · October', '+70,030.00', 'IXI', 'color:var(--text-amount-positive)'], ['Out · October', '−47,920.64', 'IXI', ''], ['Open requests', '13,640.00', 'IXI · 3', 'color:var(--text-warning)']].map(function (x) { return '<div class="dk-stat"><span class="lab-xs">' + x[0] + '</span><span class="v" style="' + x[3] + '">' + x[1] + '<small>' + x[2] + '</small></span></div>'; }).join('') + '</div>';
    var body = '';
    var sel = s.sel != null ? s.sel : 0;
    if (tab === 'Requests') {
      body = '<div style="padding:8px 12px 0"><table class="dk-tbl"><thead><tr><th>From</th><th>Reference</th><th>Asked by</th><th>Due</th><th class="r">Amount (IXI)</th><th>State</th></tr></thead><tbody>' +
        D.requests.map(function (r, i) {
          var st = s.paid && i === 0 ? '<span class="dk-status dk-status--wait">' + ic('clock', 14) + 'Paid · confirming</span>' : '<span class="dk-tag dk-tag--warn">Open</span>';
          return '<tr' + (i === sel ? ' aria-selected="true"' : '') + '><td><span class="dk-cell"><span class="dk-ws__logo" style="background:var(--disc-grad-' + (r.who.length % 11 + 1) + ')">' + r.who.split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2) + '</span>' + esc(r.who) + '</span></td><td>' + esc(r.ref) + '</td><td class="mut">' + esc(r.from) + '</td><td class="mut">' + esc(r.due) + '</td><td class="r"><b class="num">' + esc(r.amt) + '</b></td><td>' + st + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    } else {
      body = '<div class="row" style="gap:6px;padding:10px 20px"><span class="dk-chip">' + ic('calendar', 14) + '1 Oct – 11 Oct</span><span class="dk-chip" aria-pressed="true">All</span><span class="dk-chip">In</span><span class="dk-chip">Out</span><span class="dk-chip">Pending</span><span class="grow"></span><span class="dk-sf" style="margin:0;width:220px;height:32px">' + ic('search', 16) + '<span class="b-sm">Find a payment</span></span></div>' +
        '<div style="padding:0 12px;overflow:hidden"><table class="dk-tbl"><thead><tr><th>Date ' + ic('arrow-down', 12, '', 'display:inline;vertical-align:-1px') + '</th><th>Counterparty</th><th>Reference</th><th class="r">Amount</th><th class="r">Fee</th><th class="r">Balance</th><th>Status</th></tr></thead><tbody>' +
        D.ledger.slice(0, ctx.h >= 1000 ? 14 : 10).map(function (r, i) {
          return '<tr' + (i === sel ? ' aria-selected="true"' : '') + '><td class="mut num">' + esc(r.d) + '</td><td>' + esc(r.who) + '</td><td class="mut">' + esc(r.ref) + '</td><td class="r">' + K.amt(r.amt) + '</td><td class="r mut num">' + esc(r.fee) + '</td><td class="r num">' + esc(r.bal) + '</td><td>' + (r.st === 'confirmed' ? '<span class="dk-status dk-status--ok" style="font-weight:500">' + ic('check-circle', 14) + 'Final</span>' : '<span class="dk-status dk-status--wait" style="font-weight:500">' + ic('clock', 14) + '3 of 5</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    var insp = '';
    if (ctx.w >= 1440 || tab === 'Requests') {
      var iw = ctx.w >= 1920 ? 380 : 340;
      if (tab === 'Requests') {
        var r = D.requests[sel];
        insp = '<aside class="dk-side" style="width:' + iw + 'px"' + wv('shell', 'Request detail · shell WebView (trusted)') + '>' + K.colHead(ctx, '<span class="l-md">Request to pay</span>', K.tbtn(ctx, 'x')) +
          '<div class="col" style="padding:16px;gap:14px"><div class="col"><span class="b-sm mut">' + esc(r.who) + ' asks</span><span class="dk-amt" style="font-size:30px;line-height:36px">' + esc(r.amt) + '<small>IXI</small></span><span class="b-sm mut">' + esc(r.ref) + ' · due ' + esc(r.due) + '</span></div>' +
          '<div class="dk-setrow" style="margin:0">' + K.av('ana', 34) + '<div class="col grow"><span class="l-sm">Ana Ruiz · Adriatic Shipping</span><span class="mono mut">1Adr 9kQe 33Wm Tz7P 0vNc</span></div></div>' +
          '<div class="dk-setrow" style="margin:0;flex-direction:column;align-items:stretch;gap:6px"><span class="lab-xs">Invoice lines</span>' + [['Koper → Munich · 12 runs', '10,800.00'], ['Reefer surcharge', '1,450.00'], ['Port handling', '250.00']].map(function (l) { return '<div class="row b-sm"><span class="grow">' + l[0] + '</span><span class="num">' + l[1] + '</span></div>'; }).join('') + '<div class="row b-sm" style="border-top:1px solid var(--outline-neutral-02);padding-top:6px"><b class="grow">Total</b><b class="num">12,500.00</b></div></div>' +
          '<div class="row b-sm" style="gap:8px">' + ic('file-text', 16, 'ic') + 'INV-2291-September.pdf · from the chat</div>' +
          (s.paid ? '<div class="dk-setrow" style="margin:0;background:var(--surface-success-inverse);box-shadow:none"><span style="color:var(--icon-success)">' + ic('check-circle', 22) + '</span><div class="col"><span class="l-sm">Paid · waiting for 5 blocks</span><span class="mono mut">tx 91c2…7e0a</span></div></div>'
            : '<span class="dk-btn dk-btn--fill dk-btn--lg" style="width:100%">Pay 12,500.00 IXI</span><span class="b-xs mut" style="text-align:center">Above 10,000 IXI: Hello / Touch ID and a second approver (policy, proposed)</span>') + '</div></aside>';
      } else {
        var l = D.ledger[sel];
        insp = '<aside class="dk-side" style="width:' + iw + 'px"' + wv('shell', 'Payment inspector · shell WebView (trusted)') + '>' + K.colHead(ctx, '<span class="l-md">Payment</span>', K.tbtn(ctx, 'x')) +
          '<div class="col" style="padding:16px;gap:12px"><div class="col"><span class="b-sm mut">Sent to ' + esc(l.who) + '</span><span class="dk-amt" style="font-size:30px;line-height:36px">' + esc(l.amt.replace('-', '')) + '<small>IXI</small></span><span class="b-sm mut">' + esc(l.ref) + ' · ' + esc(l.d) + '</span></div>' +
          '<div class="dk-setrow" style="margin:0;background:var(--surface-warning-inverse);box-shadow:none"><span style="color:var(--icon-warning)">' + ic('clock', 20) + '</span><div class="col"><span class="l-sm">3 of 5 blocks</span><span class="b-xs mut">Final in about a minute</span></div></div>' +
          '<dl class="col" style="margin:0;gap:8px;font-size:13px">' + [['Approved by', 'Maja Kos · ' + (ctx.os === 'mac' ? 'Touch ID' : 'Windows Hello')], ['Fee', l.fee + ' IXI'], ['Balance after', l.bal + ' IXI'], ['Transaction', '<span class="mono">a41e 0c77 … 93bd 2f10</span>'], ['Block', '4,812,402']].map(function (kv) { return '<div class="row" style="gap:12px"><dt class="mut" style="width:96px;flex:none">' + kv[0] + '</dt><dd style="margin:0">' + kv[1] + '</dd></div>'; }).join('') + '</dl>' +
          '<div class="col" style="gap:8px"><span class="dk-btn dk-btn--tonal" style="justify-content:flex-start">' + ic('message', 16) + 'Open the conversation</span><span class="dk-btn dk-btn--tonal" style="justify-content:flex-start">' + ic('external-link', 16) + 'Open in explorer</span></div></div></aside>';
      }
    }
    var main = '<section class="col grow" style="min-width:0;overflow:hidden"' + wv('shell', 'Ledger · shell WebView (trusted) — no chat content') + '>' + head + stats + body + '</section>';
    return K.frame(ctx, { nav: nav(ctx, 'Ledger'), body: main + insp, title: title(ctx), over: s.over || '' });
  }

  /* ------------------------------------------------------------ approvals */
  function approvals(ctx, s) {
    s = s || {};
    var mac = ctx.os === 'mac', collapse = mac && ctx.w < 1440;
    var items = [
      ['robot', 'Dispatch', 'Reroute TR-44 via Tarvisio', 'Agent proposal · saves about 1 h 40 min', 'agent'],
      ['receipt', 'Ana Ruiz · Adriatic Shipping', 'Pay INV-2291 · 12,500.00 IXI', 'Request to pay · due 15 Oct', 'pay'],
      ['key', 'Marco Bianchi · Port of Koper', 'Gate B-2 access for a guest driver', 'Today 14:00–16:00', 'access']
    ];
    var list = '<section class="dk-pane" style="width:' + (ctx.w >= 1440 ? 440 : 400) + 'px"' + wv('shell', 'Approvals · shell WebView (trusted)') + '>' +
      K.colHead(ctx, (collapse ? K.lights() + '<span style="width:10px"></span>' : '') + '<span class="h-sm">Waiting on you</span><span class="dk-ind" style="margin-left:6px">3</span>', '') +
      '<div class="dk-list" style="padding:4px 10px">' + items.map(function (it, i) {
        return '<div class="dk-setrow" style="margin:0 0 10px;' + (i === 0 ? 'box-shadow:0 0 0 2px var(--outline-action-default)' : '') + '"><span class="dk-med">' + ic(it[0], 20) + '</span><div class="col grow" style="min-width:0"><span class="b-xs mut">' + esc(it[1]) + '</span><span class="l-sm">' + esc(it[2]) + '</span><span class="b-xs mut">' + esc(it[3]) + '</span></div></div>';
      }).join('') + '<div class="row b-xs mut" style="gap:6px;padding:6px 4px">' + ic('shield-check', 14) + 'Approve opens a native dialog. Nothing here acts by itself.</div></div></section>';
    var detail = '<section class="col grow" style="min-width:0;overflow:hidden"' + wv('apps', 'Proposal detail · the agent’s session pane · apps process') + '>' + K.colHead(ctx, K.av('disp', 32) + '<div class="col"><span class="l-md">Reroute TR-44 via Tarvisio</span><span class="b-xs mut">Dispatch · proposed 13:18 · expires 14:30</span></div>', '') +
      '<div class="col" style="padding:20px;gap:16px;max-width:760px">' +
      '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">' + [['ETA now', '18:20'], ['ETA new', '16:40'], ['Reefer 17 peak', '4.6 °C']].map(function (x) { return '<div class="dk-stat"><span class="lab-xs">' + x[0] + '</span><span class="v">' + x[1] + '</span></div>'; }).join('') + '</div>' +
      '<div class="dk-setrow" style="margin:0;flex-direction:column;align-items:stretch;gap:8px"><span class="lab-xs">What changes</span>' + ['Driver Tomislav gets the new route on his device', 'Gate slot at Koper moves from 18:30 to 16:45', 'Ana Ruiz gets the new ETA in the chat'].map(function (t) { return '<div class="row b-sm" style="gap:8px">' + ic('check', 16, 'ic-a') + t + '</div>'; }).join('') + '</div>' +
      '<div class="dk-setrow" style="margin:0;flex-direction:column;align-items:stretch;gap:6px"><span class="lab-xs">What it cannot do</span><span class="b-sm">Move money · delete messages · add people. Its manifest says so, and C# enforces it.</span></div>' +
      '<div class="row" style="gap:10px"><span class="dk-btn dk-btn--out">Decline</span><span class="dk-btn dk-btn--tonal">Ask Dispatch</span><span class="dk-btn dk-btn--fill">Approve…</span></div></div></section>';
    return K.frame(ctx, { nav: nav(ctx, 'Approvals'), body: list + detail, title: title(ctx), over: s.over || '' });
  }

  var natAgent = { title: 'Approve the Dispatch proposal?', body: 'Dispatch is an agent. It proposed this; Spixi acts only after your approval.', primary: 'Approve',
    kv: [['Agent', 'Dispatch · ops-server-2'], ['Action', 'Reroute TR-44 via Tarvisio'], ['Effects', 'New route to 1 driver, gate slot moves, 1 message to Ana Ruiz'], ['Money', 'None']] };
  var natPay = { title: 'Pay 12,500.00 IXI to Adriatic Shipping?', body: 'Request INV-2291 from Ana Ruiz. Spixi built this from its own data.',
    kv: [['To', 'Adriatic Shipping (Ana Ruiz)'], ['Address', '1Adr 9kQe 33Wm Tz7P 0vNc', 1], ['Amount', '12,500.00 IXI'], ['Network fee', '0.0200 IXI'], ['Total', '12,500.02 IXI']], hello: 'required above 10,000 IXI (policy, proposed)' };
  var natReq = { title: 'Invoices wants to post a payment request', body: 'A mini-app asks Spixi to send this request in your chat with Ana Ruiz.', primary: 'Post request',
    kv: [['App', 'Invoices 3.0 · Northwind'], ['To', 'Ana Ruiz · Adriatic Shipping'], ['Amount', '340.00 IXI'], ['Reference', 'INV-2304']] };

  function palB(q) {
    if (!q) return { ph: 'Search people, chats, ledger', scopes: ['All', 'People', 'Conversations', 'Ledger', 'Files'], groups: [
      { label: 'Assigned to you · 4', rows: [
        { lead: K.pLead('av', 'ana'), t: 'Ana Ruiz', s: 'Adriatic Shipping · Invoice · waiting 12 min', sel: true },
        { lead: K.pLead('av', 'disp'), t: 'Dispatch', s: 'Agent · proposal waiting on you' },
        { lead: K.pLead('av', 'hans'), t: 'Hans Gruber', s: 'Alpen Logistik · waiting on customer' }] },
      { label: 'Actions', rows: [
        { lead: K.pLead('ic', 'user-plus'), t: 'Assign to…', end: '<span class="kk"><span class="k">Ctrl</span><span class="k">Shift</span><span class="k">A</span></span>' },
        { lead: K.pLead('ic', 'check'), t: 'Mark done', end: '<span class="kk"><span class="k">Ctrl</span><span class="k">D</span></span>' }] }] };
    return { q: q, scopes: ['All', 'People', 'Conversations', 'Ledger', 'Files'], groups: [
      { label: 'Organisation', rows: [{ lead: '<span class="dk-ws__logo" style="width:28px;height:28px;border-radius:8px;background:var(--disc-grad-7)">AS</span>', t: K.hl('Adriatic Shipping', q), s: '3 people · 2 open conversations · 1 open request' }] },
      { label: 'People', rows: [
        { lead: K.pLead('av', 'ana'), t: K.hl('Ana Ruiz', ''), s: K.hl('Adriatic Shipping', q) + ' · open · assigned to you', sel: true },
        { lead: K.pLead('av', 'davor'), t: 'Davor Petek', s: K.hl('Adriatic Shipping', q) + ' · waiting · Priya' }] },
      { label: 'Ledger', rows: [{ lead: K.pLead('ic', 'receipt'), t: 'INV-2291 · 12,500.00 IXI', s: K.hl('Adriatic Shipping', q) + ' · open · due 15 Oct' }] }] };
  }

  R.B = {
    key: 'B', name: 'Office',
    main: function (ctx) { return view(ctx, {}); },
    states: [
      { id: 'dir', title: 'Contacts as a directory', cap: 'People, organisations, files and agents as tables. Owner, key status, last contact. The card on the right is the same one the inbox shows.', build: function (ctx) { return directory(ctx, {}); } },
      { id: 'ledger', title: 'The wallet as a ledger', cap: 'Reference, amount, fee and running balance as columns; date range, filters, CSV export (C# writes the file and picks the folder with you).', build: function (ctx) { return ledger(ctx, {}); } },
      { id: 'approve', title: 'Waiting on you', cap: 'Agent proposals, requests to pay and access requests in one queue. The detail is the agent’s own pane; Approve is a native dialog.', build: function (ctx) { return approvals(ctx, {}); } },
      { id: 'approve2', title: 'Approve an agent action', cap: 'The native dialog names the agent, the effects and "Money: none". The agent only proposed; C# does the work.', build: function (ctx) { return approvals(ctx, { over: K.natConfirm(ctx, natAgent) }); } },
      { id: 'agent', title: 'An agent beside the chat', cap: 'The Dispatch session pane in the tools dock: its proposal, its routines (pause, run now), and what it can and cannot do.', build: function (ctx) { return view(ctx, { tool: 'dispatch' }); } }
    ],
    flows: [
      { id: 'f1', title: 'Open a chat from the keyboard', steps: [
        { cap: '<span class="kk"><span class="k">Ctrl</span><span class="k">K</span></span> starts with what is assigned to you.', build: function (ctx) { return view(ctx, { sel: 'sofia', conv: { p: 'sofia', thread: [{ k: 'day', text: 'Today' }, { k: 'in', text: 'Can we move the Milan pickup to 07:00?', t: '13:30', first: true }], bar: { other: false } }, pal: palB('') }); } },
        { cap: 'Type <b>adri</b>: the organisation, its people with owner and state, and its open ledger items.', build: function (ctx) { return view(ctx, { sel: 'sofia', conv: { p: 'sofia', thread: [{ k: 'day', text: 'Today' }, { k: 'in', text: 'Can we move the Milan pickup to 07:00?', t: '13:30', first: true }] }, pal: palB('Adri') }); } },
        { cap: '<span class="k">↵</span> opens Ana’s conversation with the cursor in the composer. The bar says who owns it; team notes stay in the card.', build: function (ctx) { return view(ctx, { sel: 'ana', conv: { composer: { focus: true, text: '' } } }); } }
      ] },
      { id: 'f2', title: 'Pay an invoice', steps: [
        { cap: 'Ledger › Requests. INV-2291 came in the chat; its lines and the PDF are in the detail.', build: function (ctx) { return ledger(ctx, { tab: 'Requests' }); } },
        { cap: '<b>Pay</b> → the NATIVE confirm, built by C#. Proposed: a policy that asks for Hello / Touch ID above 10,000 IXI.', build: function (ctx) { return ledger(ctx, { tab: 'Requests', over: K.natConfirm(ctx, natPay) }); } },
        { cap: 'Paid. The ledger shows it confirming; C# also marks the request paid in Ana’s chat.', build: function (ctx) { return ledger(ctx, { tab: 'Requests', paid: true }); } }
      ] },
      { id: 'f3', title: 'Use a mini-app beside a chat', steps: [
        { cap: 'Tools dock › Invoices. The team’s own mini-app opens beside the chat, in the apps process.', build: function (ctx) { return view(ctx, { tool: 'invoices' }); } },
        { cap: '<b>Request 340 IXI from Ana</b> → a NEW app capability: the app asks, Spixi shows a native dialog.', build: function (ctx) { return view(ctx, { tool: 'invoices', over: K.natConfirm(ctx, natReq) }); } },
        { cap: 'The request is a normal Spixi payment request in the chat. The app shows it is done.', build: function (ctx) { return view(ctx, { tool: 'invoices', toolOpt: { sent: true }, conv: { thread: D.anaThread.concat([{ k: 'req', dir: 'out', title: 'Payment request', amount: '340.00', note: 'INV-2304 · Reefer 17 defrost + re-route', t: '14:16', first: true, payLabel: 'Pay' }]) } }); } }
      ] },
      { id: 'f4', title: 'Find a file across chats', steps: [
        { cap: 'Directory › Files: every file from every conversation, with who sent it and from which organisation.', build: function (ctx) { return directory(ctx, { tab: 'Files' }); } },
        { cap: 'Filter PDF + Adriatic Shipping, type <b>BoL</b>. The preview is its own WebView in the chat process.', build: function (ctx) { return directory(ctx, { tab: 'Files', org: 'Adriatic Shipping', q: 'BoL', fileSel: 0 }); } },
        { cap: '<b>Show in conversation</b> opens Ana’s chat at the message, highlighted.', build: function (ctx) {
          var t = [{ k: 'day', text: '9 Oct' }, { k: 'in', text: 'Bill of lading for the Munich run.', t: '10:02', first: true }, { k: 'file', dir: 'in', name: 'BoL-ADS-4410.pdf', meta: '288 KB · PDF', t: '10:02', hl: true }, { k: 'out', text: 'Thanks Ana, filed.', t: '10:20', st: 'read', first: true }].concat(D.anaThread);
          return view(ctx, { conv: { thread: t } });
        } }
      ] }
    ]
  };
})();
