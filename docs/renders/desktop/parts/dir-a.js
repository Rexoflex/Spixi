/* dir-a.js — A · DECK. Keyboard first: palette, native tabs, split groups, chat + info + files
   side by side, pop-out windows, drag and drop, tray and toasts. */
var R = window.R || (window.R = {});
(function () {
  'use strict';
  var ic = K.ic, esc = K.esc, wv = K.wv;

  function nav(ctx, cur) {
    if (ctx.os === 'mac') {
      if (ctx.w < 1440) return '';
      return K.sidebar(ctx, [
        { items: [{ ic: 'messages', label: 'Chats', count: '6', hot: true, cur: cur === 'Chats' }, { ic: 'folder', label: 'Files', color: '#f59e0b', cur: cur === 'Files' },
          { ic: 'apps', label: 'Apps', color: '#a855f7' }, { ic: 'wallet', label: 'Wallet', color: '#16a34a', cur: cur === 'Wallet' }] },
        { title: 'Pinned', items: [{ av: 'mira', label: 'Mira Novak', count: '2' }, { av: 'falcon', label: 'Falcon Crew', count: '3' }] },
        { title: 'Agents', items: [{ av: 'disp', label: 'Dispatch', count: '1' }] },
        { title: 'Communities', items: [{ av: 'comm', label: 'Ixian Community', count: '12' }] }
      ], '<div class="dk-msb__foot">' + K.av(D.me, 26, { noDot: true }) + '<div class="col grow"><b style="font-weight:600">Maja Kos</b><span class="mac-sub">Online · 14 relays</span></div>' + ic('settings', 18, 'ic') + '</div>', { w: ctx.w >= 1920 ? 220 : 210 });
    }
    return K.rail([
      { ic: 'messages', icf: 'messages-filled', label: 'Chats', cur: cur === 'Chats', badge: '6' },
      { ic: 'folder', label: 'Files', cur: cur === 'Files' },
      { ic: 'apps', icf: 'apps-filled', label: 'Apps' },
      { ic: 'wallet', icf: 'wallet-filled', label: 'Wallet', cur: cur === 'Wallet' }
    ], '<span class="dk-rail__it">' + ic('keyboard', 22) + '<span>Keys</span></span><span class="dk-rail__it" style="padding-top:4px">' + K.av(D.me, 30, { noDot: true }) + '<span>Account</span></span>');
  }

  /* native tab strip (WinUI TabView / NSWindow tabs) */
  function tabs(ctx, list, active, o) {
    o = o || {};
    var h = '<div class="dk-tabs"' + wv('native', 'Tabs · native (WinUI TabView / macOS window tabs)') + '>';
    list.forEach(function (id, i) {
      var p = K.person(id);
      h += '<span class="dk-tab"' + (id === active ? ' aria-selected="true"' : '') + '>' + K.av(p, 18, { noDot: true }) + '<span class="ell">' + esc(p.name) + '</span>' +
        (o.unread && o.unread.indexOf(id) >= 0 ? '<i class="dot"></i>' : '') + (ctx.os === 'mac' ? '' : '<span class="x">' + ic('x', 14) + '</span>') + '</span>';
    });
    h += '<span class="dk-tabs__end">' + (o.end !== false ? '<span class="dk-ib" style="width:28px;height:28px">' + ic('plus', 16) + '</span>' + (ctx.os === 'mac' ? '' : '<span class="dk-ib" style="width:28px;height:28px">' + ic('columns', 16) + '</span>') : '') + '</span></div>';
    return h;
  }
  function statusBar(ctx, o) {
    if (ctx.os === 'mac') return '';
    o = o || {};
    return '<div class="dk-sb"' + wv('native', 'Status bar · native') + '><span class="row" style="gap:6px"><i class="dot"></i>Online · 14 relays</span><span>Synced 14:15</span><span class="row" style="gap:5px">' + ic('lock', 13) + 'Locks after 5 min idle</span>' +
      (o.msg ? '<span style="color:var(--text-neutral-01)">' + o.msg + '</span>' : '') +
      '<span class="dk-sb__end"><span class="kk"><span class="k">Ctrl</span><span class="k">K</span></span>Search<span class="kk"><span class="k">Ctrl</span><span class="k">/</span></span>Shortcuts</span></div>';
  }

  /* the Deck view. s: {active, tabs, unread, split, right ('info'|'send'|'app'|'none'), listSel, hover, focus, multi, drop, thread, composer, pal, over, sb, infoTab, fileSel} */
  function view(ctx, s) {
    s = s || {};
    var W = ctx.w, mac = ctx.os === 'mac';
    var hasSide = mac && W >= 1440;
    var listW = W >= 1920 ? 330 : W >= 1440 ? (mac ? 300 : 320) : (mac ? 290 : 286);
    var rightW = W >= 1920 ? 340 : W >= 1440 ? 330 : 300;
    var split = s.split != null ? s.split : W >= 1920;
    var right = s.right || 'info';
    var active = s.active || 'mira';
    var threads = { mira: D.miraThread, falcon: D.falconThread, jonas: D.jonasThread, disp: [{ k: 'day', text: 'Today' }, { k: 'in', text: 'Route TR-44 is ready for your review.', t: '12:58', first: true }] };

    var list = K.listPane(ctx, { w: listW, density: 'compact', sel: s.listSel || active, hover: s.hover, focus: s.focus, multi: s.multi, drop: s.drop,
      lights: mac && !hasSide, filters: ['All', 'Unread', 'Groups', 'Agents'],
      sections: [
        { title: 'Pinned', rows: D.chats.filter(function (r) { return r.pin; }) },
        { title: 'Agents', rows: D.chats.filter(function (r) { return r.agent; }) },
        { title: 'Chats', rows: D.chats.filter(function (r) { return !r.pin && !r.agent; }) }
      ] });
    if (mac && !hasSide) list = list.replace('<div class="dk-ch dk-ch--mac">', '<div class="dk-ch dk-ch--mac">' + K.lights() + '<span style="width:10px"></span>');

    var tabList = s.tabs || ['mira', 'falcon', 'jonas'];
    var g1 = '<div class="col grow" style="min-width:0">' + tabs(ctx, split ? tabList.filter(function (t) { return t !== 'falcon'; }) : tabList, active, { unread: s.unread || ['falcon'] }) +
      '<div class="row grow" style="min-height:0;align-items:stretch">' + K.conv(ctx, { p: active, thread: s.thread || threads[active], infoOn: right === 'info', composer: s.composer, after: s.after, banner: s.banner }) + '</div></div>';
    var g2 = split ? '<div class="col grow" style="min-width:0;border-inline-start:1px solid var(--outline-neutral-03)">' + tabs(ctx, ['falcon', 'disp'], 'falcon', { end: false }) +
      '<div class="row grow" style="min-height:0;align-items:stretch">' + K.conv(ctx, { p: 'falcon', thread: D.falconThread }) + '</div></div>' : '';

    var side = '';
    if (right === 'info') side = K.info(ctx, { p: active, w: rightW, tab: s.infoTab, fileSel: s.fileSel });
    else if (right === 'send') side = sendPane(ctx, rightW, s.send || {});
    else if (right === 'app') side = splitApp(ctx, rightW + 40, s.app || {});

    var body = list + g1 + g2 + side;
    var inner = '<div class="col grow" style="min-width:0"><div class="row grow" style="min-height:0;align-items:stretch">' + body + '</div>' + statusBar(ctx, { msg: s.sb }) + '</div>';
    var over = '';
    if (s.pal) over += K.palette(ctx, s.pal);
    if (s.over) over += s.over;
    return K.frame(ctx, { nav: nav(ctx, s.nav || 'Chats'), body: inner, over: over, title: { search: 'Search chats, people, files, actions' } });
  }

  /* trusted wallet send pane (shell WebView, NOT the chat) */
  function sendPane(ctx, w, o) {
    var to = K.person(o.to || 'jonas');
    var sent = o.sent;
    return '<aside class="dk-side" style="width:' + w + 'px"' + wv('shell', 'Wallet send · shell WebView (trusted) — composes intent only') + '>' +
      K.colHead(ctx, '<span class="l-md">' + (sent ? 'Sent' : 'Send IXI') + '</span>', K.tbtn(ctx, 'x')) +
      '<div class="col" style="padding:16px;gap:14px">' +
      '<div class="col" style="gap:6px"><span class="lab-xs">To</span><div class="dk-setrow" style="margin:0">' + K.av(to, 36, { noDot: true }) + '<div class="col grow"><span class="l-sm">' + esc(to.name) + '</span><span class="mono mut">' + esc(to.addr || '') + '</span></div></div></div>' +
      '<div class="col" style="gap:6px"><span class="lab-xs">Amount</span><div class="dk-setrow" style="margin:0;justify-content:space-between"><span class="dk-amt" style="font-size:28px;line-height:34px">25.00<small>IXI</small></span><span class="b-sm mut">≈ $30.88</span></div></div>' +
      '<div class="col" style="gap:6px"><span class="lab-xs">Note · only on this device</span><div class="dk-setrow" style="margin:0"><span class="b-sm">Concert tickets</span></div></div>' +
      '<div class="dk-setrow" style="margin:0;flex-direction:column;align-items:stretch;gap:6px">' +
      '<div class="row b-sm"><span class="grow mut">Network fee</span><span class="num">0.0100 IXI</span></div><div class="row b-sm"><span class="grow mut">Total</span><b class="num">25.0100 IXI</b></div><div class="row b-sm"><span class="grow mut">Balance after</span><span class="num">1,259.51 IXI</span></div></div>' +
      (sent ? '<div class="dk-setrow" style="margin:0;background:var(--surface-success-inverse);box-shadow:none"><span style="color:var(--icon-success)">' + ic('check-circle', 22) + '</span><div class="col grow"><span class="l-sm">Sent · waiting for the block</span><span class="mono mut">tx 7f3a…c91e</span></div></div>'
        : '<span class="dk-btn dk-btn--fill dk-btn--lg" style="width:100%">Review</span><span class="b-xs mut" style="text-align:center">Spixi asks you to confirm in a native dialog. This pane cannot send by itself.</span>') +
      '</div></aside>';
  }

  /* third-party mini-app beside the chat (apps process) */
  function splitApp(ctx, w, o) {
    var done = o.done;
    return '<aside class="dk-side" style="width:' + w + 'px"' + wv('apps', 'Mini-app "Split" · its own WebView · apps process (sandbox)') + '>' +
      K.colHead(ctx, '<span class="dk-med dk-med--sq" style="width:28px;height:28px;background:var(--disc-grad-4);color:#fff">' + ic('receipt', 16) + '</span><span class="l-md">Split</span><span class="dk-tag dk-tag--ok">Live with Mira</span>', K.tbtn(ctx, 'popout') + K.tbtn(ctx, 'x')) +
      '<div class="dk-prov">' + ic('shield-check', 14, 'sh') + '<span><b>Split 2.1</b> · apps.spixi.io · sandboxed · cannot read this chat or your wallet</span></div>' +
      '<div class="app-split grow col" style="padding:18px;gap:12px;overflow:hidden">' +
      '<div style="font-size:20px;font-weight:700">Lisbon flat 🏠</div><div style="font-size:13px;opacity:.75">Shared with Mira · 3 items</div>' +
      [['Rent deposit', '240.00', 'Mira'], ['Cleaning', '60.00', 'Maja'], ['Keys + lock change', '36.00', 'Mira']].map(function (r) {
        return '<div style="display:flex;justify-content:space-between;padding:10px 12px;border-radius:10px;background:rgba(127,100,60,.1);font-size:14px"><span>' + r[0] + '<br><small style="opacity:.7">paid by ' + r[2] + '</small></span><b>' + r[1] + '</b></div>';
      }).join('') +
      '<div style="margin-top:auto;padding:14px;border-radius:12px;background:#f0a33a;color:#2a1a05;font-size:15px"><b>Maja owes Mira 108.00 IXI</b><br><small>after cleaning is split</small></div>' +
      (done ? '<div style="text-align:center;font-size:13px;opacity:.8">✓ Summary posted to the chat</div>' : '<div style="display:flex;gap:8px"><span style="flex:1;text-align:center;padding:10px;border-radius:10px;border:1.5px solid currentColor;font-weight:700">Post summary to chat</span><span style="flex:1;text-align:center;padding:10px;border-radius:10px;background:#3b2f1f;color:#fffaf2;font-weight:700">Settle 108 IXI</span></div>') +
      '</div></aside>';
  }

  /* ------------------------------------------------------------ states */
  function shortcuts(ctx) {
    var groups = [
      ['Find and jump', [['Ctrl K', 'Search chats, people, files, actions'], ['Ctrl Shift F', 'Find files across chats'], ['Alt ↑ / Alt ↓', 'Previous / next chat'], ['Alt Shift ↓', 'Next unread chat'], ['Ctrl 1…9', 'Go to tab 1…9']]],
      ['Tabs and windows', [['Ctrl Tab', 'Next tab'], ['Ctrl W', 'Close tab'], ['Ctrl \\', 'Split into a second group'], ['Ctrl Shift N', 'Open chat in a new window'], ['Ctrl I', 'Chat info']]],
      ['In a chat', [['Enter', 'Send'], ['Shift Enter', 'New line'], ['↑', 'Edit your last message'], ['Ctrl U', 'Attach a file'], ['Ctrl Shift A', 'Open an app beside the chat']]],
      ['Wallet and safety', [['Ctrl Shift S', 'Send IXI (native confirm)'], ['Ctrl Shift W', 'Open the wallet'], ['Ctrl L', 'Lock Spixi now'], ['Ctrl Alt S', 'Show Spixi from anywhere (global)'], ['Ctrl /', 'This sheet']]]
    ];
    var h = '<div class="dk-scrim"></div><div class="dk-sheet" style="width:860px;padding:22px 26px"' + wv('shell', 'Shortcut sheet · shell WebView · shortcuts are handled in C#') + '><div class="row" style="margin-bottom:14px"><span class="h-sm grow">Keyboard shortcuts</span><span class="b-sm mut" style="margin-inline-end:12px">Change them in Settings › Keyboard</span>' + ic('x', 20, 'ic') + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px 32px">';
    groups.forEach(function (g) {
      h += '<div class="col" style="gap:2px"><span class="lab-xs" style="margin-bottom:6px">' + g[0] + '</span>' + g[1].map(function (r) {
        return '<div class="row" style="height:30px;border-bottom:1px solid var(--outline-neutral-01)"><span class="grow b-sm">' + esc(r[1]) + '</span><span class="kk">' + r[0].split(' ').map(function (k) { return k === '/' && r[0].indexOf('/') > 0 && r[0] !== 'Ctrl /' ? '<span class="mut" style="margin:0 2px">/</span>' : '<span class="k">' + esc(k) + '</span>'; }).join('') + '</span></div>';
      }).join('') + '</div>';
    });
    return h + '</div></div>';
  }
  function dropGhost(ctx) {
    return '<div style="position:absolute;left:250px;top:300px;display:flex;align-items:center;gap:10px;padding:10px 14px 10px 10px;border-radius:12px;background:var(--surface-menu);box-shadow:var(--elevation-3);transform:rotate(-3deg);border:1px solid var(--outline-neutral-02)"' + wv('native', 'Drag and drop · native — C# reads the dropped file, never a path from a WebView') + '>' + K.ftype('Q3-report.pdf', 30) +
      '<div class="col"><span class="l-sm">Q3-report.pdf</span><span class="b-xs mut">from ' + (ctx.os === 'mac' ? 'Finder' : 'File Explorer') + ' · 1.2 MB</span></div></div>' +
      '<svg style="position:absolute;left:300px;top:340px" width="22" height="28" viewBox="0 0 22 28"><path d="M2 2v20l5-5 4 9 4-2-4-9h7z" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/></svg>' +
      '<div style="position:absolute;left:96px;top:262px;padding:6px 10px;border-radius:8px;background:var(--surface-neutral-inverse-01);color:var(--text-neutral-inverse-01);font-size:12px;font-weight:600;box-shadow:var(--elevation-2)">Drop to attach to Jonas Berg · you review before it sends</div>';
  }
  function trayScreen(ctx) {
    var mac = ctx.os === 'mac';
    var h = '<div class="nat" style="position:absolute;inset:0;background:linear-gradient(135deg,var(--wall-a),var(--wall-b))"></div>';
    /* a work app in front of Spixi (Spixi is hidden, still running) */
    h += '<div class="nat-win" style="left:120px;top:' + (mac ? 90 : 70) + 'px;width:900px;height:600px;background:var(--nat-bg)"><div style="height:36px;border-bottom:1px solid var(--nat-line);display:flex;align-items:center;gap:10px;padding:0 14px;font:13px var(--nat-font);color:var(--nat-ink2)">' + (mac ? K.lights() : '') + 'Quarterly plan' + (mac ? '' : '.docx — Word') + '</div><div style="padding:40px 60px;display:flex;flex-direction:column;gap:12px">' + '<div style="height:14px;width:40%;border-radius:4px;background:var(--nat-line)"></div>' + Array(9).join('<div style="height:8px;border-radius:4px;background:var(--nat-line);opacity:.7"></div>') + '</div></div>';
    if (mac) {
      /* macOS: menu bar + Spixi menu-bar extra (needs an AppKit bundle under Catalyst) + notification banner + Dock */
      h += '<div class="nat mac-menubar"' + wv('native', 'Menu bar extra · native (AppKit bundle under Catalyst — later)') + '><b>Finder</b><span>File</span><span>Edit</span><span>View</span><span>Go</span><span>Window</span><span>Help</span><span style="flex:1"></span>' +
        '<span class="on" style="color:var(--nat-ink)">' + ic('logo', 15) + '<i class="mac-mbdot"></i></span>' + ic('wifi', 15) + ic('battery', 17) + '<span>Sun 11 Oct  14:15</span></div>';
      h += '<div class="nat mac-banner"' + wv('native', 'Notification · native (UNUserNotificationCenter) — the reply goes to C#, no WebView') + '><span class="mac-banner__ic">' + ic('logo', 22) + '</span><div class="col grow" style="min-width:0"><div class="row" style="gap:6px"><b style="font-size:13px">Mira Novak</b><span style="margin-left:auto;font-size:11px;color:var(--nat-ink2)">now</span></div><span style="font-size:13px;color:var(--nat-ink2)">Also — chess tonight? 😄</span>' +
        '<div class="nat-inp" style="margin-top:8px;border-radius:8px;border-bottom-width:1px;height:28px;font-size:12px"><span style="flex:1">Reply…</span>' + ic('send-2', 14) + '</div></div></div>';
      h += '<div class="nat mac-dock"' + wv('native', 'Dock · macOS') + '>' + ['folder', 'world', 'calendar', 'note'].map(function (n, i) { return '<span class="mac-dock__i" style="background:var(--disc-grad-' + [7, 6, 11, 2][i] + ')">' + ic(n, 26) + '</span>'; }).join('') +
        '<span class="mac-dock__i" style="background:linear-gradient(160deg,#5b8cff,#3050bd)">' + ic('logo', 28) + '<b class="mac-dock__b">3</b><i class="mac-dock__run"></i></span></div>';
      return h;
    }
    h += '<div class="nat nat-toast" style="right:16px;bottom:64px"' + wv('native', 'Toast · native (Windows App SDK notification) — reply goes to C#, no WebView') + '><div class="nat-toast__hd"><span style="color:var(--nat-accent)">' + ic('logo', 16) + '</span>Spixi<span style="margin-inline-start:auto">now</span>' + ic('dots', 16) + ic('x', 16) + '</div>' +
      '<div class="row" style="gap:12px;align-items:flex-start">' + K.av('mira', 44, { noDot: true }) + '<div class="col"><b style="font-size:14px">Mira Novak</b><span style="font-size:14px;color:var(--nat-ink2)">Also — chess tonight? 😄</span></div></div>' +
      '<div class="nat-inp"><span class="grow" style="flex:1">Type a reply</span>' + ic('send-2', 16) + '</div><div class="row" style="gap:8px"><span class="nat-btn">Mark as read</span><span class="nat-btn">Open chat</span></div></div>';
    h += '<div class="nat nat-menu" style="right:96px;bottom:300px"' + wv('native', 'Tray menu · native (Win32 notify icon)') + '><div style="font-weight:600">' + ic('logo', 16) + 'Spixi</div><hr><div class="on">Open Spixi<span class="e">Ctrl Alt S</span></div><div>3 unread chats</div><div>Do not disturb<span class="e">1 hour ›</span></div><hr><div>' + ic('lock', 16) + 'Lock Spixi now</div><div>Quit</div></div>';
    h += '<div class="nat nat-task" ' + wv('native', 'Taskbar · Windows') + '>' + ['winstart', 'search', 'folder', 'world'].map(function (n) { return '<span class="nat-task__i" style="color:var(--nat-ink)">' + ic(n, 22) + '</span>'; }).join('') +
      '<span class="nat-task__i run" style="color:var(--nat-accent)">' + ic('logo', 24) + '<b style="position:absolute;top:2px;right:2px;min-width:16px;height:16px;border-radius:8px;background:#c42b1c;color:#fff;font-size:10px;line-height:16px;text-align:center">3</b></span>' +
      '<div class="nat-tray"><span>' + ic('chevup', 16) + '</span><span style="color:var(--nat-accent);position:relative;padding:4px;border-radius:4px;background:var(--nat-foot)">' + ic('logo', 18) + '</span>' + ic('wifi', 16) + ic('volume2', 16) + ic('battery', 18) + '<span style="text-align:end;line-height:15px">14:15<br>11/10/2026</span>' + ic('bell', 16) + '</div></div>';
    return h;
  }
  function popout(ctx) {
    var mac = ctx.os === 'mac';
    var bar = mac ? '<div style="height:34px;flex:none;display:flex;align-items:center;gap:10px;padding-left:12px;background:var(--surface-neutral-02);font-size:12px;color:var(--text-neutral-02)">' + K.lights() + '<span style="margin-left:auto;margin-right:auto;transform:translateX(-30px)">Falcon Crew</span></div>'
      : '<div style="height:34px;flex:none;display:flex;align-items:center;gap:8px;padding-left:12px;background:var(--surface-neutral-02);font-size:12px;color:var(--text-neutral-02)">' + ic('logo', 14, 'ic-a') + 'Falcon Crew — Spixi<span style="margin-left:auto;display:flex">' +
      '<span style="width:40px;display:grid;place-items:center">' + ic('pin', 14) + '</span><span style="width:40px;display:grid;place-items:center">—</span><span style="width:40px;display:grid;place-items:center">' + ic('x', 14) + '</span></span></div>';
    var win = '<div class="nat-win" style="right:60px;top:110px;width:440px;height:660px;' + (mac ? 'border-radius:14px' : '') + '"' + wv('chat', 'Pop-out window · native window · its own chat WebView (chat process)') + '>' + bar +
      '<div class="dk-conv" style="flex:1">' + K.convHead(ctx, 'falcon', { acts: K.tbtn(ctx, 'search') }) + '<div class="dk-msgs">' + K.thread(D.falconThread, { group: true }) + '</div>' + K.composer(ctx, { placeholder: 'Message Falcon Crew' }) + '</div></div>';
    return win;
  }

  /* ------------------------------------------------------------ palette specs */
  function palRecent() {
    return { groups: [
      { label: 'Recent', rows: [
        { lead: K.pLead('av', 'mira'), t: 'Mira Novak', s: 'Also — chess tonight?', end: '<span class="kk"><span class="k">Ctrl</span><span class="k">1</span></span>', sel: true },
        { lead: K.pLead('av', 'falcon'), t: 'Falcon Crew', s: '3 unread · Alex: Deposit received', end: '<span class="kk"><span class="k">Ctrl</span><span class="k">2</span></span>' },
        { lead: K.pLead('av', 'disp'), t: 'Dispatch', s: 'Agent · Route TR-44 is ready for your review' }] },
      { label: 'Actions', rows: [
        { lead: K.pLead('ic', 'message-plus'), t: 'New chat', end: '<span class="kk"><span class="k">Ctrl</span><span class="k">N</span></span>' },
        { lead: K.pLead('ic', 'wallet'), t: 'Send IXI…', end: '<span class="kk"><span class="k">Ctrl</span><span class="k">Shift</span><span class="k">S</span></span>' },
        { lead: K.pLead('ic', 'folder'), t: 'Find a file…', end: '<span class="kk"><span class="k">Ctrl</span><span class="k">Shift</span><span class="k">F</span></span>' },
        { lead: K.pLead('ic', 'lock'), t: 'Lock Spixi', end: '<span class="kk"><span class="k">Ctrl</span><span class="k">L</span></span>' }] }
    ] };
  }
  function palJo() {
    return { q: 'jo', groups: [
      { label: 'Chats', rows: [
        { lead: K.pLead('av', 'jonas'), t: K.hl('Jonas Berg', 'jo'), s: 'You: Thursday then. I send it now.', sel: true },
        { lead: K.pLead('av', 'tripjm'), t: K.hl('Jonas & Mira · Porto', 'jo'), s: 'Group · 3 members' }] },
      { label: 'Messages', rows: [
        { lead: K.pLead('av', 'falcon'), t: 'Falcon Crew', s: 'Rin: …and <mark>Jo</mark>nas brings the speaker' }] },
      { label: 'Actions', rows: [
        { lead: K.pLead('ic', 'wallet'), t: 'Send IXI to Jonas Berg…', s: 'Opens the wallet. You confirm in a native dialog.' },
        { lead: K.pLead('ic', 'phone'), t: 'Call Jonas Berg' }] }
    ] };
  }
  function palSend() {
    return { q: '>send 25 jonas', icon: 'command', scope: 'Actions', groups: [
      { label: 'Actions', rows: [
        { lead: K.pLead('ic', 'wallet'), t: 'Send <b>25 IXI</b> to <b>Jonas Berg</b>', s: 'Wallet opens with this filled in. Nothing is sent yet.', sel: true },
        { lead: K.pLead('ic', 'arrow-down-left'), t: 'Request 25 IXI from Jonas Berg', s: 'Posts a payment request in the chat' }] },
      { label: 'Recent with Jonas', rows: [
        { lead: K.pLead('ic', 'arrow-up-right'), t: 'Train tickets · 22.00 IXI', s: '28 Sep · sent' }] }
    ] };
  }
  function palFiles(withPv) {
    var pv = withPv ? '<div class="dk-pal__pv"' + wv('chat', 'Quick Look · its own WebView · chat process (renders the file)') + '><div class="dk-prov">' + ic('eye2', 14) + '<span><b>Lease draft v3.pdf</b> · from Mira Novak · Today 09:13</span></div><div class="grow" style="display:grid;place-items:center;padding:16px"><div class="pdfp" style="width:300px;height:390px"><h4>Residential Lease</h4><p>Draft v3 · Lisbon, Rua da Rosa 41</p>' + Array(4).join('<div class="ln"></div>') + '<div class="ln hl" style="width:80%"></div><div class="ln hl" style="width:60%"></div>' + Array(12).join('<div class="ln"></div>') + '</div></div><div class="row b-xs mut" style="padding:8px 12px;gap:10px;border-top:1px solid var(--outline-neutral-02)">Page 3 of 9<span class="grow"></span><span class="kk"><span class="k">Space</span></span>Close preview</div></div>' : '';
    return { q: 'lease', icon: 'folder', scope: 'Files', ph: '', preview: pv, groups: [
      { label: 'Files · 4', rows: D.files.filter(function (f) { return /lease/i.test(f.name); }).map(function (f, i) {
        var from = f.from === 'me' ? 'You' : K.person(f.from).name;
        return { lead: K.pLead('file', f.name), t: K.hl(f.name, 'lease'), s: esc(K.person(f.chat).name + ' · ' + from + ' · ' + f.when + ' · ' + f.size), sel: i === 0, end: i === 0 ? '<span class="kk"><span class="k">Space</span></span><span class="k">↵</span>' : '' };
      }) },
      { label: 'Messages', rows: [{ lead: K.pLead('av', 'mira'), t: 'Mira Novak', s: 'I went through the <mark>lease</mark> with the agent.' }] }
    ], foot: '<span class="kk"><span class="k">Space</span></span> Preview <span class="kk"><span class="k">↵</span></span> Show in chat <span class="kk"><span class="k">Ctrl</span><span class="k">S</span></span> Save a copy <span class="kk"><span class="k">Esc</span></span> Close' };
  }

  var natSend = { title: 'Send 25.00 IXI to Jonas Berg?', body: 'Spixi built this from its own data. Check the address before you send.',
    kv: [['To', 'Jonas Berg'], ['Address', '13Hq 7PdN Vw3K s9Ta 2cX8', 1], ['Amount', '25.00 IXI'], ['Network fee', '0.0100 IXI'], ['Total', '25.0100 IXI']], hello: 'asks for your PIN, face or fingerprint (proposed)' };
  var natApp = { title: 'Split wants to send a payment', body: 'A mini-app asks Spixi to pay. Only you can approve it.', primary: 'Pay',
    kv: [['App', 'Split 2.1 · apps.spixi.io'], ['To', 'Mira Novak'], ['Address', '1Rk9 3Fz7 Qe2W 8xLm 4bQ2', 1], ['Amount', '108.00 IXI'], ['Network fee', '0.0100 IXI']] };

  R.A = {
    key: 'A', name: 'Deck', os: ['win', 'mac'],
    main: function (ctx) { return view(ctx, {}); },
    states: [
      { id: 'keys', title: 'Shortcut sheet', cap: '<span class="kk"><span class="k">Ctrl</span><span class="k">/</span></span> Every command has a key. C# owns the global keys, so a chat page cannot take them over.', build: function (ctx) { return view(ctx, { over: shortcuts(ctx) }); } },
      { id: 'drop', title: 'Drop a file on a chat', cap: 'Drag from File Explorer onto any row or tab. The chat opens with the file attached; you press Send. C# reads the file, the WebView never gets a path.', build: function (ctx) { return view(ctx, { drop: 'jonas', over: dropGhost(ctx) }); } },
      { id: 'multi', title: 'Hover actions and multi-select', cap: 'Hover a row: pin, mute, pop out, more. Ctrl-click or Shift-click selects several; act on all of them at once.', build: function (ctx) { return view(ctx, { hover: 'jonas', multi: ['comm', 'sven', 'kai'] }); } },
      { id: 'popout', title: 'Chat in its own window', cap: '<span class="kk"><span class="k">Ctrl</span><span class="k">Shift</span><span class="k">N</span></span> A native window with its own chat WebView. Keep it on a second screen, pin it on top.', build: function (ctx) { return view(ctx, { tabs: ['mira', 'jonas'], over: popout(ctx) }); } },
      { id: 'tray', title: 'Tray and notifications', cap: 'Spixi keeps running in the tray. The toast and its reply box are native; the reply goes straight to C#. Preview text follows the privacy setting.', build: function (ctx) { return trayScreen(ctx); } }
    ],
    flows: [
      { id: 'f1', title: 'Open a chat from the keyboard', steps: [
        { cap: '<span class="kk"><span class="k">Ctrl</span><span class="k">K</span></span> from anywhere, even with focus inside a chat. C# catches the key before the page.', build: function (ctx) { return view(ctx, { active: 'falcon', tabs: ['falcon', 'mira'], right: 'none', pal: palRecent() }); } },
        { cap: 'Type <b>jo</b>. Chats first, then message hits (the optional part, COMPARE Q2), then actions. Arrows move.', build: function (ctx) { return view(ctx, { active: 'falcon', tabs: ['falcon', 'mira'], right: 'none', pal: palJo() }); } },
        { cap: '<span class="k">↵</span> opens Jonas in a new tab with the cursor in the composer. <span class="kk"><span class="k">Ctrl</span><span class="k">W</span></span> closes it.', build: function (ctx) { return view(ctx, { active: 'jonas', tabs: ['falcon', 'mira', 'jonas'], listSel: 'jonas', right: 'none', composer: { focus: true, text: '' }, sb: 'Opened in tab 3' }); } }
      ] },
      { id: 'f2', title: 'Send a payment', steps: [
        { cap: 'In the palette, type <b>&gt;send 25 jonas</b>. The palette only parses what you typed.', build: function (ctx) { return view(ctx, { active: 'jonas', tabs: ['mira', 'jonas'], right: 'none', pal: palSend() }); } },
        { cap: 'The wallet send pane opens beside the chat. It is the trusted wallet WebView, not the chat.', build: function (ctx) { return view(ctx, { active: 'jonas', tabs: ['mira', 'jonas'], right: 'send' }); } },
        { cap: '<b>Review</b> → the NATIVE confirm. C# builds it from its own values. Proposed: Windows Hello (Touch ID on a Mac) after Send.', build: function (ctx) { return view(ctx, { active: 'jonas', tabs: ['mira', 'jonas'], right: 'send', over: K.natConfirm(ctx, natSend) }); } },
        { cap: 'Sent. C# pushes the payment card into the chat and the state into the wallet pane.', build: function (ctx) { return view(ctx, { active: 'jonas', tabs: ['mira', 'jonas'], right: 'send', send: { sent: true }, thread: D.jonasThread.concat([{ k: 'sent', dir: 'out', amount: '25.00', note: 'Concert tickets', t: '11:22', first: true }]) }); } }
      ] },
      { id: 'f3', title: 'Use a mini-app beside a chat', steps: [
        { cap: '<span class="kk"><span class="k">Ctrl</span><span class="k">Shift</span><span class="k">A</span></span> or ⊕ in the composer. The app picker rises from the composer.', build: function (ctx) { return view(ctx, { right: 'none', over: appPicker(ctx) }); } },
        { cap: 'Split opens beside the chat in its own sandboxed WebView, in the apps process. Mira joins the same session.', build: function (ctx) { return view(ctx, { right: 'app' }); } },
        { cap: '<b>Settle</b> → the mini-app SEND_PAYMENT path ends in the same kind of native confirm, with the app named.', build: function (ctx) { return view(ctx, { right: 'app', over: K.natConfirm(ctx, natApp) }); } },
        { cap: 'The summary lands in the chat as an app card; the app shows it is done.', build: function (ctx) { return view(ctx, { right: 'app', app: { done: true }, thread: D.miraThread.concat([{ k: 'app', dir: 'out', title: 'Split · Lisbon flat', sub: 'Shared with Mira', icon: 'receipt', body: 'Maja → Mira · <b>108.00 IXI</b> · settled', t: '14:16', first: true }]) }); } }
      ] },
      { id: 'f4', title: 'Find a file across chats', steps: [
        { cap: '<span class="kk"><span class="k">Ctrl</span><span class="k">Shift</span><span class="k">F</span></span> opens the palette in Files. Type <b>lease</b>: every file from every chat, newest first.', build: function (ctx) { return view(ctx, { active: 'falcon', tabs: ['falcon'], right: 'none', pal: palFiles(false) }); } },
        { cap: '<span class="k">Space</span> previews it (Quick Look) in its own WebView, without opening the chat.', build: function (ctx) { return view(ctx, { active: 'falcon', tabs: ['falcon'], right: 'none', pal: palFiles(true) }); } },
        { cap: '<span class="k">↵</span> jumps to the message in Mira’s chat, highlighted. Chat info shows the file in Files.', build: function (ctx) {
          var t = D.miraThread.map(function (m) { return m.k === 'file' ? Object.assign({}, m, { hl: true }) : m; });
          return view(ctx, { active: 'mira', tabs: ['falcon', 'mira'], thread: t, fileSel: 0, sb: 'Jumped to Lease draft v3.pdf' });
        } }
      ] }
    ]
  };

  function appPicker(ctx) {
    var apps = [['Split', 'receipt', 4], ['Chess', 'knight', 7], ['Polls', 'chart', 8], ['Notes', 'note', 2], ['Whiteboard', 'pencil', 10], ['Browse', 'apps', 1]];
    return '<div class="dk-pop" style="left:' + (ctx.w >= 1440 ? 420 : 380) + 'px;bottom:76px;width:360px"' + wv('chat', 'App picker · part of the chat WebView (it only asks C# to open an app)') + '><div class="lab-xs" style="padding:2px 4px 10px">Open beside this chat</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">' +
      apps.map(function (a, i) { return '<div class="col" style="align-items:center;gap:6px;padding:10px 4px;border-radius:12px;' + (i === 0 ? 'background:var(--surface-action-tonal-default)' : '') + '"><span class="dk-med dk-med--sq" style="width:44px;height:44px;background:var(--disc-grad-' + a[2] + ');color:#fff">' + ic(a[1], 22) + '</span><span class="l-sm">' + a[0] + '</span></div>'; }).join('') +
      '</div><div class="row b-xs mut" style="gap:6px;padding:10px 4px 0">' + ic('shield-check', 14) + 'Apps run in their own sandbox, outside this chat</div></div>';
  }
  R.A.view = view;
})();
