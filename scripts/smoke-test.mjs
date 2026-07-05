/**
 * jsdom smoke test for the demo pages (#46 audit-loop step).
 * Run: npm i --no-save jsdom && node scripts/smoke-test.mjs
 * Optional arg: repo root (default = script's parent dir) — lets the script run
 * from a location where jsdom resolves, e.g. `node /x/smoke-test.mjs /repo`.
 * Asserts against COMPUTED styles where it matters ([hidden] vs author display).
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const root = process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..');
let JSDOM, VirtualConsole;
try { ({ JSDOM, VirtualConsole } = await import('jsdom')); }
catch { console.error('jsdom not installed — run: npm i --no-save jsdom'); process.exit(2); }

const failures = [];
const ok = (cond, msg) => { if (!cond) failures.push(msg); console.log((cond ? '  ✓ ' : '  ✗ ') + msg); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); // top-level: shared by every demo block

const load = (file) => new Promise((resolve) => {
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => failures.push(file + ' PAGE ERROR: ' + e.message));
  const dom = new JSDOM(readFileSync(join(root, 'src/demo', file), 'utf8'), {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    url: 'file://' + join(root, 'src/demo', file), virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    },
  });
  setTimeout(() => resolve(dom), 3000);
});

console.log('app-frame.html');
{
  const dom = await load('app-frame.html');
  const d = dom.window.document, W = dom.window;
  const disp = (el) => W.getComputedStyle(el).display;

  ok(d.querySelectorAll('.c-chatlist-item').length === 12, '12 chat rows render');
  ok(d.querySelectorAll('.c-txlist-item').length === 6, '6 tx rows render');
  ok([...d.querySelectorAll('.c-bottomnav__badge')].filter((b) => !b.hidden).length === 2, 'chats badges visible on both navs');

  // search: filter + highlight + clear (computed display, not attribute)
  const input = d.querySelector('.c-search-field__input');
  const clear = d.querySelector('.c-search-field__clear');
  ok(disp(clear) === 'none', 'clear button hidden while empty');
  input.value = 'money';
  input.dispatchEvent(new W.Event('input', { bubbles: true }));
  const chatRows = [...d.querySelectorAll('.c-chatlist-item')];
  ok(chatRows.filter((r) => disp(r) !== 'none').length === 1, 'excerpt search narrows to 1 row');
  ok(d.querySelectorAll('.c-highlight').length > 0, 'matches highlighted');
  clear.click();
  ok(chatRows.filter((r) => disp(r) !== 'none').length === 12, 'clear restores all rows');
  ok(d.querySelectorAll('.c-highlight').length === 0, 'highlights cleared');

  // tx filter chips
  const chips = [...d.querySelectorAll('.c-chip')];
  chips[1].click();
  const txRows = [...d.querySelectorAll('.c-txlist-item')];
  ok(txRows.filter((r) => disp(r) !== 'none').every((r) => r.dataset.direction === 'out'), 'Sent chip filters to outgoing');
  chips[0].click();
  ok(txRows.filter((r) => disp(r) !== 'none').length === 6, 'All chip restores tx rows');

  // muted chat: dual indicators
  const q = chatRows.find((r) => r.textContent.includes('QWERTZ'));
  const variants = [...q.querySelectorAll('.c-indicator')].map((i) => i.dataset.variant);
  ok(variants.join('+') === 'count-muted+muted', 'muted chat shows count-muted + bell-off');

  // overlays (#56): Esc = safe dismiss everywhere; lightDismiss governs scrim only
  const esc = () => d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  d.getElementById('fab').click();
  ok(!!d.querySelector('.c-sheet[role="dialog"]') && !!d.querySelector('.c-scrim'), 'FAB opens sheet + scrim');
  esc();
  await sleep(500); // removal via 400ms fallback (no real transitions in jsdom)
  ok(!d.querySelector('.c-sheet'), 'Esc dismisses sheet');
  d.getElementById('fab').focus(); // real clicks focus the button; jsdom's synthetic click doesn't
  d.getElementById('fab').click();
  await sleep(50);
  ok(!!d.querySelector('.c-sheet'), 'sheet reopens after close');
  d.querySelector('.c-scrim').click();
  await sleep(500);
  ok(!d.querySelector('.c-sheet'), 'scrim click dismisses sheet (lightDismiss)');
  ok(d.activeElement === d.getElementById('fab'), 'focus restored to opener');

  // nested: sheet → confirm modal on the same host
  d.getElementById('fab').click();
  await sleep(50);
  const decline = [...d.querySelectorAll('.c-button')].find((b) => b.textContent.trim() === 'Decline');
  const { Spixi } = W;
  const confirm = Spixi.createModal({
    title: 'Nested?', body: 'On top of the sheet.', role: 'alertdialog',
    host: decline.closest('.demo-phone'),
    actions: [{ label: 'Cancel', autofocus: true }],
  });
  Spixi.openModal(confirm);
  await sleep(50);
  ok(!!d.querySelector('.c-modal') && !!d.querySelector('.c-sheet'), 'modal stacks above sheet');
  d.querySelector('.c-modal .c-scrim, .c-scrim:last-of-type'); // no-op lookup guard
  [...d.querySelectorAll('.c-scrim')].pop().click();
  ok(!!d.querySelector('.c-modal'), 'scrim click does NOT close confirm modal');
  esc();
  await sleep(500);
  ok(!d.querySelector('.c-modal') && !!d.querySelector('.c-sheet'), 'Esc closes modal first (safe path), sheet stays');
  ok(Spixi.dismissTopOverlay() === true, 'dismissTopOverlay consumes back press');
  await sleep(500);
  ok(!d.querySelector('.c-sheet'), 'back hook closed the sheet');
  ok(!d.querySelector('[data-overlay-open]'), 'host scroll lock released');

  // standalone confirm flow (Decline button)
  decline.click();
  const modal = d.querySelector('.c-modal[role="alertdialog"]');
  ok(!!modal, 'Decline opens alertdialog modal');
  await sleep(50);
  ok(d.activeElement && d.activeElement.textContent.trim() === 'Cancel', 'initial focus on safe action');
  [...modal.querySelectorAll('.c-button')].find((b) => b.textContent.trim() === 'Cancel').click();
  await sleep(500);
  ok(!d.querySelector('.c-modal'), 'Cancel action closes modal');
}

console.log('components.html');
{
  const dom = await load('components.html');
  const d = dom.window.document;
  ok(d.querySelectorAll('.c-button').length > 20, 'button grid renders');
  ok(d.querySelectorAll('.c-badge').length === 10, 'badge matrix renders 10 variants');
}

console.log('wallet.html');
{
  const dom = await load('wallet.html');
  const d = dom.window.document, W = dom.window;

  /* hero + toggle contract (#134 audit: constant label + aria-pressed) */
  const hero = d.querySelector('.c-wallet-hero');
  ok(!!hero, 'wallet hero renders');
  const eye = d.querySelector('.c-wallet-hero__eye');
  ok(eye && eye.getAttribute('aria-label') === 'Hide balance', 'eye label constant (APG toggle)');
  eye.click();
  ok(eye.getAttribute('aria-pressed') === 'true'
    && d.querySelector('.c-wallet-hero__amountvalue').textContent === '••••••', 'eye masks; pressed carries state');
  eye.click();

  /* list + tools */
  ok(d.querySelectorAll('.c-txlist-item').length >= 20, 'tx rows render (deep mock history)');
  const tools = d.querySelector('.c-wallet-tools');
  ok(!!tools && !!tools.querySelector('.c-wallet-misstx'), 'sticky tools: search + #98 pill');

  /* tx detail sheet: avatar personalization + status row + fee + full address + latch */
  d.querySelector('.c-txlist-item').click();
  await sleep(50);
  const sheet = d.querySelector('.c-sheet');
  ok(!!sheet && sheet.getAttribute('aria-label') === 'Transaction details', 'row tap → labelled tx sheet');
  ok(!!sheet.querySelector('.c-txsheet__head .c-avatar'), 'contact tx → avatar in the sheet head');
  const rowLabels = [...sheet.querySelectorAll('.c-txsheet__rowlabel')].map((l) => l.textContent);
  ok(rowLabels.includes('Status') && rowLabels.includes('Fee'), 'Status always + Fee when provided');
  ok((sheet.querySelector('.c-txsheet__addrvalue') || {}).textContent === '4kdJ2fN8w1qLxCvB7tRz9fQz', 'FULL address in the chip');
  const explorerBtn = [...sheet.querySelectorAll('.c-button')].pop();
  explorerBtn.click(); explorerBtn.click();
  await sleep(500);
  ok(d.querySelectorAll('.c-toast').length <= 1, 'explorer intent latched (no double fire)');

  /* scroll choreography (#134): down → compact+tucked; brief up → tools; top → restored */
  const content = d.getElementById('wallet-content');
  const scrollTo = (y) => { content.scrollTop = y; content.dispatchEvent(new W.Event('scroll')); };
  scrollTo(300);
  ok(hero.hasAttribute('data-compact') && tools.hasAttribute('data-hidden'), 'deep scroll → hero compact + tools tucked');
  scrollTo(270);
  ok(!tools.hasAttribute('data-hidden') && hero.hasAttribute('data-compact'), 'brief up-scroll → tools return');
  scrollTo(0);
  ok(!hero.hasAttribute('data-compact'), 'absolute top → hero expands');

  /* send flow (slice 2, #135/#136): hero Send → one-screen send + #26 review, exact money */
  ok(d.querySelectorAll('.c-wallet-hero__qa[data-primary]').length === 0, 'quick actions uniform (no special Send circle)');
  ok(!!tools.offsetParent || tools.style.display !== 'none', 'tools present (flex:none guards layout collapse — #136)');
  d.querySelector('.c-wallet-hero__qa').click();
  await sleep(50);
  const send = d.querySelector('.c-wallet-send');
  ok(!!send, 'Send quick action opens the send view');
  ok(!!send.querySelector('.c-wallet-send__picker .c-wallet-send__contact .c-wallet-send__addrglyph'),
    'address row first, contact-aligned (#136)');
  /* bad-address error placement (Damir bug, round 3): under ITS input */
  send.querySelector('.c-wallet-send__picker .c-wallet-send__contact').click();
  const af = send.querySelector('.c-wallet-send__addrfield');
  af.querySelector('.c-wallet-send__addrinput').value = 'short';
  af.querySelector('.c-button').click();
  ok(!!af.querySelector('.c-wallet-send__error') && !af.querySelector('.c-wallet-send__error').hidden,
    'bad-address error renders inside the address field, not below the contacts');
  send.querySelector('.c-wallet-send__contacts .c-wallet-send__contact').click();
  const amt = send.querySelector('.c-wallet-send__amount');
  amt.value = '12.5'; amt.dispatchEvent(new W.Event('input', { bubbles: true }));
  const reviewBtn = send.querySelector('.c-wallet-send__actions .c-button');
  ok(reviewBtn.disabled === false, 'recipient + valid amount → Review enabled');
  reviewBtn.click();
  await sleep(50);
  const review = [...d.querySelectorAll('.c-sendreview')].pop();
  ok(!!review, 'Review sheet opens (#26 deliberateness step)');
  const vals = [...review.querySelectorAll('.c-sendreview__rowvalue')].map((v) => v.textContent);
  ok(vals.includes('12.5 IXI') && vals.includes('0.00001 IXI'), 'review shows EXACT amount + fee (no truncation at confirm)');

  /* receive/request (slice 3, #137): fresh frame — hero Receive → ONE progressive surface */
  const dom2 = await load('wallet.html');
  const d2 = dom2.window.document, W2 = dom2.window;
  // failed sends list under "Sent" (Damir 2026-07-05)
  const sentChip = [...d2.querySelectorAll('.c-wallet-filters .c-chip')].find((c) => c.textContent.trim() === 'Sent');
  sentChip.click();
  const sentRows = [...d2.querySelectorAll('.c-txlist-item')];
  ok(sentRows.some((r) => r.dataset.txid === 'd0013c7cae7c7c'), 'failed send lists under Sent (badge carries it)');
  ok(sentRows.length === 13 && sentRows.every((r) => r.dataset.type !== 'received'), 'Sent filter stays outgoing-only (13 out rows, none received-typed)');

  d2.querySelectorAll('.c-wallet-hero__qa')[1].click();   // Receive
  await sleep(50);
  const rec = d2.querySelector('.c-wallet-receive');
  ok(!!rec, 'Receive quick action opens the receive view');
  const rqr = rec.querySelector('.c-qr');
  ok(!!rqr && rqr.dataset.qrValue === '425HqzWpMkV3dTgJnS85CQen:ixi', 'QR encodes the legacy address:ixi receive format');
  ok(rqr.getAttribute('role') === 'img' && !!rqr.getAttribute('aria-label'), 'QR is a labelled image');
  ok((rqr.querySelector('path').getAttribute('fill') || '').includes('--on-qr'), 'QR ink rides the --on-qr token');
  ok((rec.querySelector('.c-wallet-receive__addrvalue') || {}).textContent === '425HqzWpMkV3dTgJnS85CQen', 'FULL own address in the chip (#99)');

  const reqRow = rec.querySelector('.c-wallet-receive__reqrow');
  ok(reqRow.getAttribute('aria-expanded') === 'false', 'request reveal starts collapsed');
  reqRow.click();
  ok(reqRow.getAttribute('aria-expanded') === 'true' && !rec.querySelector('.c-wallet-receive__reqbox').hidden,
    'Request an amount expands in place (one progressive surface)');
  const ramt = rec.querySelector('.c-wallet-receive__amount');
  ramt.value = '12,5'; ramt.dispatchEvent(new W2.Event('input', { bubbles: true }));
  ok(ramt.value === '12.5', 'request amount follows the send sanitize rules (shared export)');
  ok(rqr.dataset.qrValue === '425HqzWpMkV3dTgJnS85CQen:send:12.5', 'QR morphs to addr:send:amount in place');
  ramt.value = '12.'; ramt.dispatchEvent(new W2.Event('input', { bubbles: true }));
  ok(rqr.dataset.qrValue === '425HqzWpMkV3dTgJnS85CQen:send:12', 'trailing-dot amount canonicalized in the QR (audit M1)');
  ramt.value = '12.5'; ramt.dispatchEvent(new W2.Event('input', { bubbles: true }));
  const ask = rec.querySelector('.c-wallet-receive__ask');
  ok(!ask.hidden, 'amount active → send-request-to-contact strip appears');
  ok(ask.querySelectorAll('.c-wallet-receive__contact').length === 5 && !!ask.querySelector('.c-wallet-receive__none'),
    'contact strip caps at 5 with the keep-typing note (#136 scaling)');
  const target = ask.querySelector('.c-wallet-receive__contact');
  target.click(); target.click();
  ok(d2.querySelectorAll('.c-toast').length === 1, 'send-request latched on the row (no double fire, #72④)');
  const strip = [...ask.querySelectorAll('.c-wallet-receive__contact')];
  ok(!target.disabled && strip.filter((b) => b.disabled).length === strip.length - 1,
    'acted row stays enabled (focus kept) — the rest latch (audit M3)');
  const askSearch = ask.querySelector('input');
  askSearch.value = 'a'; askSearch.dispatchEvent(new W2.Event('input', { bubbles: true }));
  ok([...ask.querySelectorAll('.c-wallet-receive__contact')].some((b) => b.dataset.acted !== undefined),
    'latch survives a contact-search re-render (audit M2)');
  askSearch.value = ''; askSearch.dispatchEvent(new W2.Event('input', { bubbles: true }));
  ramt.value = '9'; ramt.dispatchEvent(new W2.Event('input', { bubbles: true }));
  ok(![...ask.querySelectorAll('.c-wallet-receive__contact')].some((b) => b.dataset.acted !== undefined)
    && [...ask.querySelectorAll('.c-wallet-receive__contact')].every((b) => !b.disabled),
    'amount edit mid-latch resets the strip — no stale sent-✓ (audit M5)');
  ok(rqr.dataset.qrValue === '425HqzWpMkV3dTgJnS85CQen:send:9', 'QR follows the new amount after the reset');
  const rcopy = rec.querySelector('.c-wallet-receive__copy');
  rcopy.click();
  ok((rcopy.getAttribute('aria-label') || '').startsWith('Couldn'), 'no clipboard → honest failure morph, no false Copied (audit m1)');

  reqRow.click();                                          // collapse clears the request
  ok(rqr.dataset.qrValue === '425HqzWpMkV3dTgJnS85CQen:ixi' && ask.hidden,
    'collapsing the reveal restores the plain receive QR (state honesty)');
  W2.Spixi.setRequestAmount(rec, 0.0000001);
  ok(rqr.dataset.qrValue === '425HqzWpMkV3dTgJnS85CQen:send:0.0000001',
    'setRequestAmount expands scientific-notation numbers (audit C1 — no 1e-7 → 17)');

  /* tipping (#138, docs/tipping-spec.md): #26-lite sheet — presets + custom, ONE latched confirm */
  let tipCalls = 0, tipPayload = null, tipCtrl = null;
  W2.Spixi.openTipSheet({
    message: { id: 'm1', excerpt: 'nice one!' }, recipient: { name: 'Han Solo', address: '4kdJ2fN8w1qLxCvB7tRz9fQz' },
    balance: 100, host: d2.querySelector('.demo-phone'),
    onTip: (p, ctrl) => { tipCalls++; tipPayload = p; tipCtrl = ctrl; },
  });
  await sleep(50);
  const tipEl = d2.querySelector('.c-tipsheet');
  ok(!!tipEl && !!tipEl.querySelector('.c-avatar') && tipEl.querySelector('.c-tipsheet__title').textContent === 'Tip Han Solo',
    'tip sheet opens with the recipient visible (#26-lite)');
  const tchips = [...tipEl.querySelectorAll('.c-chip')];
  ok(tchips.length === 4, 'presets 1/5/10 + Custom');
  const tconfirm = [...tipEl.querySelectorAll('.c-button')].pop();
  ok(tconfirm.disabled, 'confirm disabled until an amount is chosen');
  tchips[1].click();
  ok(!tconfirm.disabled && tconfirm.textContent.includes('Tip 5 IXI'), 'confirm label carries the amount (the sheet IS the review)');
  ok(tipEl.querySelector('.c-tipsheet__customrow').dataset.ghost !== undefined,
    'custom slot reserved (ghosted) from the start — sheet opens at full size, never grows');
  tchips[3].click();
  const tcustom = tipEl.querySelector('.c-tipsheet__custom');
  ok(tipEl.querySelector('.c-tipsheet__customrow').dataset.ghost === undefined, 'Custom un-ghosts the reserved input');
  tcustom.value = '250'; tcustom.dispatchEvent(new W2.Event('input', { bubbles: true }));
  ok(tconfirm.disabled && !tipEl.querySelector('.c-tipsheet__error').hidden, 'over-balance tip → inline guard, confirm stays off');
  tchips[0].click(); tchips[3].click();
  ok(tcustom.value === '', 'preset supersedes → stale custom cleared (tip-audit m3)');
  tcustom.value = '2.'; tcustom.dispatchEvent(new W2.Event('input', { bubbles: true }));
  tconfirm.click(); tconfirm.click();
  ok(tipCalls === 1 && tipPayload.amount === '2' && tipPayload.messageId === 'm1',
    'ONE latched confirm → canonical payload once (no double-tip)');
  /* in flight = locked on EVERY path (tip-audit C1: overlay opts read LIVE) */
  d2.dispatchEvent(new W2.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  [...d2.querySelectorAll('.c-scrim')].pop().click();
  await sleep(500);
  ok(!!d2.querySelector('.c-tipsheet'), 'Esc + scrim both held while the tip is in flight (live overlay lock)');
  ok(W2.Spixi.dismissTopOverlay() === true && !!d2.querySelector('.c-tipsheet'),
    'back press consumed but does NOT dismiss in flight');
  ok([...tipEl.querySelectorAll('.c-chip')].every((c) => c.disabled), 'amount controls frozen in flight (tip-audit M3)');
  tipCtrl.done();
  await sleep(1400);
  ok(!d2.querySelector('.c-tipsheet'), 'success morph closes the tip sheet');

  /* balance guard precision (tip-audit M2): 1e-8 above a 1e8 balance must trip */
  W2.Spixi.openTipSheet({ message: { id: 'm2' }, recipient: { name: 'B' }, balance: 100000000,
    host: d2.querySelector('.demo-phone'), onTip: () => {} });
  await sleep(50);
  const tip2 = d2.querySelector('.c-tipsheet');
  [...tip2.querySelectorAll('.c-chip')].pop().click();
  const in2 = tip2.querySelector('.c-tipsheet__custom');
  const btn2 = [...tip2.querySelectorAll('.c-button')].pop();
  in2.value = '100000000.00000001'; in2.dispatchEvent(new W2.Event('input', { bubbles: true }));
  ok(btn2.disabled, 'guard exact at 1e-8 over a 1e8 balance (integer units — tip-audit M2)');
  in2.value = '100000000'; in2.dispatchEvent(new W2.Event('input', { bubbles: true }));
  ok(!btn2.disabled, 'exact-balance tip allowed');
  d2.dispatchEvent(new W2.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await sleep(500);
  ok(!d2.querySelector('.c-tipsheet'), 'pre-confirm Esc still dismisses (lock is in-flight only)');

  /* lockedRecipient (#139): chat Pay — pre-picked peer, no picker, no ✕ */
  const lockHost = d2.createElement('div');
  d2.body.append(lockHost);
  const lockedSend = W2.Spixi.createWalletSend({
    lockedRecipient: { name: 'Han Solo', address: '4kdJ2fN8w1qLxCvB7tRz9fQz' },
    balance: 10, fee: 0.1, host: lockHost,
  });
  lockHost.append(lockedSend);
  ok(lockedSend.querySelector('.c-wallet-send__picker').hidden === true
    && !lockedSend.querySelector('.c-wallet-send__clear')
    && lockedSend.querySelector('.c-wallet-send__pickedname').textContent === 'Han Solo',
    'lockedRecipient: pre-picked, picker gone, no change affordance');
  lockHost.remove();

  /* request sheet (#139): amount-sheet machinery, request copy, NO balance guard */
  let reqPayload = null, reqCtrl = null;
  W2.Spixi.openRequestSheet({ recipient: { name: 'Han Solo' }, host: d2.querySelector('.demo-phone'),
    onRequest: (p, c) => { reqPayload = p; reqCtrl = c; } });
  await sleep(50);
  const reqEl = d2.querySelector('.c-tipsheet[data-kind="request"]');
  ok(!!reqEl && reqEl.querySelector('.c-tipsheet__title').textContent === 'Request from Han Solo',
    'request sheet reuses the audited amount-sheet machinery');
  [...reqEl.querySelectorAll('.c-chip')].pop().click();
  const rin = reqEl.querySelector('.c-tipsheet__custom');
  rin.value = '5000000'; rin.dispatchEvent(new W2.Event('input', { bubbles: true }));
  const rbtn = [...reqEl.querySelectorAll('.c-button')].pop();
  ok(!rbtn.disabled && rbtn.textContent.includes('Request 5000000 IXI'),
    'no balance guard on requests — the label still carries the amount');
  rbtn.click();
  ok(reqPayload && reqPayload.amount === '5000000', 'request payload canonical');
  reqCtrl.done();
  await sleep(1400);
  ok(!d2.querySelector('.c-tipsheet'), 'request success closes the sheet');

  /* multi-select + copy + split-paste (#139) — component-level in this frame */
  const selHost = d2.querySelector('.demo-phone');
  const fakeList = d2.createElement('div');
  const mkRow = (sender, text) => {
    const r = d2.createElement('div');
    r.className = 'c-bubble-row';
    if (sender) r.dataset.sender = sender;
    if (text) r.dataset.copytext = text;
    r.textContent = text;
    fakeList.append(r);
    return r;
  };
  const sr1 = mkRow('Alex', 'Crew — cabin trip is ON.');
  const sr2 = mkRow('Han Solo', 'Chewie counts as two people.');
  mkRow('', '');
  selHost.append(fakeList);
  let copied = 0;
  W2.Spixi.enterChatSelect(fakeList, { initialRow: sr1, host: selHost, onCopy: (n) => { copied = n; } });
  ok(fakeList.dataset.selecting !== undefined && !!selHost.querySelector('.c-chatselect-bar'),
    'Select → selection mode + count bar');
  sr2.click();
  ok(selHost.querySelector('.c-chatselect-bar__count').textContent.includes('2'), 'taps toggle — count reaches 2');
  [...selHost.querySelectorAll('.c-chatselect-bar .c-button')].pop().click();
  const sbuf = W2.Spixi.getChatCopyBuffer();
  ok(copied === 2 && sbuf.items.length === 2
    && sbuf.joined === 'Alex: Crew — cabin trip is ON.\nHan Solo: Chewie counts as two people.',
    'multi-copy = "Sender: text" lines (Damir pick); buffer holds the items');
  ok(!selHost.querySelector('.c-chatselect-bar') && fakeList.dataset.selecting === undefined,
    'copy exits selection mode');
  const comp = W2.Spixi.createComposer({ placeholder: 'Message' });
  selHost.append(comp);
  const sentEach = [];
  W2.Spixi.attachSplitPaste(comp, { onSendEach: (items) => sentEach.push(...items) });
  const cInput = comp.querySelector('.c-composer__input');
  cInput.value = sbuf.joined; cInput.dispatchEvent(new W2.Event('input', { bubbles: true }));
  ok(!!comp.querySelector('.c-splitpaste'), 'pasting the multi-copy → split offer appears');
  comp.querySelector('.c-splitpaste .c-button').click();
  ok(sentEach.length === 2 && sentEach[1].text === 'Chewie counts as two people.' && cInput.value === '',
    'split-paste sends RAW texts and clears the draft');
  cInput.value = 'unrelated'; cInput.dispatchEvent(new W2.Event('input', { bubbles: true }));
  ok(!comp.querySelector('.c-splitpaste'), 'the offer only appears for the matching paste');
  fakeList.remove(); comp.remove();
}

console.log('chat.html — chat info (#141)');
{
  const dom = await load('chat.html');
  const d = dom.window.document, W3 = dom.window;
  const S = W3.Spixi;
  const key = (t, k) => t.dispatchEvent(new W3.KeyboardEvent('keydown', { key: k, bubbles: true }));

  /* —— contact surface: sections render by capability —— */
  let nickCalls = 0, nickCtrl = null, delCtrl = null;
  const host = d.createElement('div');
  d.body.append(host);
  const info = S.createChatInfo({
    kind: 'contact', name: 'Han Solo', address: '4fj2addr',
    txs: [{ direction: 'out', status: 'confirmed', amount: '-1' }],
    media: [{ id: 'm1', kind: 'photo' }],
    capabilities: {},                        // media + notifications gated OFF
    onBack() {}, onPay() {}, onRequest() {},
    onNickname: (nick, ctrl) => { nickCalls++; nickCtrl = ctrl; },
    onNotifications() {},
    onDeleteHistory: (ctrl) => { delCtrl = ctrl; },
  });
  host.append(info);
  ok(!!info.querySelector('.c-chat-info__hero') && !!info.querySelector('.c-chat-info__address')
    && !!info.querySelector('.c-chat-info__money') && !!info.querySelector('.c-chat-info__txs'),
    'contact info renders hero + address + money + payments');
  ok(!info.querySelector('.c-chat-info__switch') && !info.querySelector('.c-chat-info__media'),
    'notifications + media stay hidden without their capabilities (1:1 bridge honesty)');

  const qrT = info.querySelector('.c-chat-info__qr-toggle');
  qrT.click();
  ok(qrT.getAttribute('aria-expanded') === 'true' && !!info.querySelector('.c-chat-info__qr svg path'),
    'Show QR reveals a real QR svg (lazy-built, address:ixi)');

  /* #142: payments = collapsed accordion (no tx wall on entry) */
  const txT = info.querySelector('.c-chat-info__txs-toggle');
  ok(txT.getAttribute('aria-expanded') === 'false'
    && info.querySelector('.c-chat-info__txs-list').hidden
    && txT.textContent.includes('(1)'),
    'payments arrive COLLAPSED with a count (#142)');
  txT.click();
  ok(!info.querySelector('.c-chat-info__txs-list').hidden
    && info.querySelectorAll('.c-chat-info__txs-list .c-txlist-item').length === 1,
    'expanding renders txlist-item rows (reusable component, #142)');
  ok(!info.querySelector('.c-chat-info__setting'),
    'disappearing messages stays hidden without its capability (§9 honesty)');

  /* nickname: Enter disables the input → the blur that follows must NOT
     re-commit (audit #141-M1: two ctrls for one edit) */
  info.querySelector('.c-chat-info__nick-edit').click();
  const nin = info.querySelector('.c-chat-info__nick-input');
  nin.value = 'Scoundrel';
  key(nin, 'Enter');
  nin.dispatchEvent(new W3.Event('blur'));
  ok(nickCalls === 1, 'Enter+blur double-commit latched: ONE onNickname call (audit M1)');
  nickCtrl.done();
  ok(info.querySelector('.c-chat-info__name').textContent === 'Scoundrel'
    && info.querySelector('.c-chat-info__sub').textContent === 'Han Solo'
    && !info.querySelector('.c-chat-info__sub').hidden,
    'nickname lands; the WIRE name stays visible underneath (e2e catch)');

  /* destructive confirm: locked mid-flight (#135-C1 via the #138 live-opts fix) */
  info.querySelector('.c-chat-info__danger-row').click();
  const modal = d.querySelector('.c-modal');
  ok(!!modal && modal.getAttribute('role') === 'alertdialog', 'delete-history confirm is an alertdialog');
  const btns = modal.querySelectorAll('.c-modal__actions .c-button');
  btns[btns.length - 1].click();             // confirm → in flight
  key(d, 'Escape');
  ok(!!d.querySelector('.c-modal') && !!delCtrl, 'Esc mid-flight does NOT dismiss the confirm (lock holds)');
  btns[0].click();
  ok(!!d.querySelector('.c-modal'), 'Cancel is dead while the bridge round-trips');
  delCtrl.fail('nope');
  ok(!modal.querySelector('.c-chat-info__confirm-error').hidden, 'ctrl.fail surfaces the inline error and unlatches');
  delCtrl = null;
  btns[btns.length - 1].click();             // fresh attempt, fresh ctrl (#138 m1)
  delCtrl.done();
  await sleep(450);                          // overlay teardown is animation-async
  ok(!d.querySelector('.c-modal'), 'retry → ctrl.done closes the confirm');
  host.remove();

  /* —— #142: contact CONTEXT (the contact page) + accordion View-all —— */
  let txAllCalls = 0, msgCalls = 0;
  const chost = d.createElement('div');
  d.body.append(chost);
  const many = Array.from({ length: 7 }, (_, i) => ({ direction: 'out', status: 'confirmed', amount: '-' + (i + 1) }));
  const cinfo = S.createChatInfo({
    context: 'contact', kind: 'contact', name: 'Han Solo', address: '4fj2addr',
    txs: many, selfDestruct: 0,
    capabilities: { selfDestruct: true },      // chat-side policy — must NOT render here
    onBack() {}, onMessage: () => { msgCalls++; }, onPay() {}, onRequest() {},
    onSelfDestruct() {},
    onTxAll: () => { txAllCalls++; },
    onDeleteHistory() {}, onRemoveContact() {},
  });
  chost.append(cinfo);
  ok(cinfo.querySelector('.c-topbar__title').textContent === 'Contact info'
    && cinfo.dataset.context === 'contact',
    'contact context retitles the surface (one component, two feels — #142)');
  const moneyBtns = [...cinfo.querySelectorAll('.c-chat-info__money .c-button')];
  ok(moneyBtns[0].classList.contains('c-chat-info__message') && moneyBtns[0].dataset.type === 'fill'
    && moneyBtns[1].dataset.type === 'outline',
    'contact page: Message LEADS (fill), Pay demotes to outline');
  const dRows = [...cinfo.querySelectorAll('.c-chat-info__danger-row')];
  ok(dRows.length === 1 && dRows[0].textContent.includes('Remove'),
    'contact page drops delete-history (chat action) but keeps remove-contact');
  ok(!cinfo.querySelector('.c-chat-info__setting'),
    'disappearing messages is chat-side — hidden on the contact page');
  cinfo.querySelector('.c-chat-info__txs-toggle').click();
  ok(cinfo.querySelectorAll('.c-chat-info__txs-list .c-txlist-item').length === 5
    && !!cinfo.querySelector('.c-chat-info__txs-all'),
    '7 txs: expanded preview caps at 5 + View all (#142)');
  cinfo.querySelector('.c-chat-info__txs-all').click();
  ok(txAllCalls === 1, 'View all routes to the shell (onTxAll)');
  moneyBtns[0].click();
  ok(msgCalls === 1, 'Message fires onMessage (shell opens the 1:1)');
  chost.remove();

  /* —— #142: disappearing messages (chat context, capability-gated) —— */
  let sdSecs = null, sdCtrl = null;
  const shost = d.createElement('div');
  d.body.append(shost);
  const sinfo = S.createChatInfo({
    kind: 'contact', name: 'Han', address: 'xaddr', selfDestruct: 0,
    capabilities: { selfDestruct: true },
    onBack() {}, onSelfDestruct: (secs, ctrl) => { sdSecs = secs; sdCtrl = ctrl; },
  });
  shost.append(sinfo);
  const sdRow = sinfo.querySelector('.c-chat-info__setting');
  ok(!!sdRow && sdRow.querySelector('.c-chat-info__setting-value').textContent === 'Off',
    'disappearing-messages row renders with the current value (Off)');
  sdRow.click();
  const sdOpts = [...d.querySelectorAll('.c-chat-info__sd-option')];
  ok(sdOpts.length === 4 && sdOpts[0].getAttribute('aria-checked') === 'true',
    'option sheet: 4 radios, current one checked');
  sdOpts[1].click();                           // 1 hour
  sdOpts[2].click();                           // in-flight latch: second pick must not fire
  ok(sdSecs === 3600, 'picking 1 hour commits 3600s ONCE (latched while in flight)');
  sdCtrl.done();
  await sleep(450);
  ok(!d.querySelector('.c-chat-info__sd')
    && sdRow.querySelector('.c-chat-info__setting-value').textContent === '1 hour',
    'ctrl.done closes the sheet and the row shows the new window');
  shost.remove();

  /* —— #142: send picker — FULL A–Z list, caps dead (Damir: scanning beat search) —— */
  const wsHost = d.createElement('div');
  d.body.append(wsHost);
  const ws = S.createWalletSend({
    contacts: Array.from({ length: 12 }, (_, i) => ({ name: 'C' + String.fromCharCode(90 - i), address: 'w' + i })),
    balance: 100000000, fee: 0.00001, onSend() {}, strings: {},
  });
  wsHost.append(ws);
  const wsNames = [...ws.querySelectorAll('.c-wallet-send__contacts .c-wallet-send__contactname')].map((e) => e.textContent);
  ok(wsNames.length === 12 && wsNames[0] === 'CO' && wsNames[11] === 'CZ'
    && !ws.querySelector('.c-wallet-send__contacts .c-wallet-send__none'),
    'send picker renders ALL 12 contacts A–Z — no cap, no keep-typing note (#142)');
  wsHost.remove();

  /* —— group surface: full list + search filter (#142) + kick flow (audit M2) —— */
  let kickCtrl = null;
  const ghost = d.createElement('div');
  d.body.append(ghost);
  const mems = ['Alex', 'Han', 'Lando', 'Chewie', 'Leia', 'Luke'].map((n, i) => ({ name: n, address: 'a' + i }));
  const ginfo = S.createChatInfo({
    kind: 'group', name: 'Crew', address: 'crewaddr', members: mems, memberCount: 6,
    notifications: true, capabilities: { notifications: true, admin: true },
    onBack() {},
    onNotifications: (next, ctrl) => ctrl.done(),
    onMemberAction: (act, m, ctrl) => { kickCtrl = ctrl; },
    onLeave() {},
  });
  ghost.append(ginfo);
  ok(!ginfo.querySelector('.c-chat-info__money'), 'groups hide the money row (§9 room-request ask)');
  const rowNames = [...ginfo.querySelectorAll('.c-chat-info__member-name')].map((e) => e.textContent);
  ok(rowNames.length === 6 && !ginfo.querySelector('.c-search-field'),
    '6 members: ALL 6 rows, no search below 8 — the list is scannable (#142)');
  ok(rowNames[0] === 'Alex' && rowNames[1] === 'Chewie',
    'member rows sort A–Z (#142 — scanning needs an order)');
  const sw = ginfo.querySelector('.c-chat-info__switch');
  sw.click();
  ok(sw.getAttribute('aria-checked') === 'false', 'notifications toggle flips optimistically');

  ginfo.querySelectorAll('.c-chat-info__member')[2].click();     // Han (A–Z: Alex, Chewie, Han…)
  const kickBtn = [...d.querySelectorAll('.c-sheet .c-button')].find((b) => b.textContent.trim() === 'Kick');
  ok(!!kickBtn, 'admin capability injects Kick into the member sheet');
  kickBtn.click();
  const km = [...d.querySelectorAll('.c-modal')].pop();   // LAST — a prior modal may still be tearing down
  const kb = km.querySelectorAll('.c-modal__actions .c-button');
  kb[kb.length - 1].click();
  kickCtrl.done();
  await sleep(450);
  ok(ginfo.querySelectorAll('.c-chat-info__member').length === 5
    && !ginfo.querySelector('.c-chat-info__member-note')
    && ginfo.querySelector('.c-chat-info__members .c-chat-info__label').textContent.includes('(5)')
    && ginfo.querySelector('.c-chat-info__sub').textContent === '5 members',
    'kick ctrl.done removes the row and fixes BOTH counts (audit M2)');
  ghost.remove();

  /* —— #142: 8+ members — search appears as a FILTER over the full list —— */
  const bigHost = d.createElement('div');
  d.body.append(bigHost);
  const bigMems = ['Alex', 'Han', 'Lando', 'Chewie', 'Leia', 'Luke', 'Obi-Wan', 'Rey', 'Poe']
    .map((n, i) => ({ name: n, address: 'b' + i }));
  const big = S.createChatInfo({
    kind: 'group', name: 'Crew', address: 'crewaddr', members: bigMems, memberCount: 9,
    onBack() {}, onLeave() {},
  });
  bigHost.append(big);
  ok(big.querySelectorAll('.c-chat-info__member').length === 9
    && !!big.querySelector('.c-search-field'),
    '9 members: ALL rows render + search appears from 8 (#142 — filter, not gate)');
  const bin = big.querySelector('.c-search-field__input');
  bin.value = 'le';
  bin.dispatchEvent(new W3.Event('input', { bubbles: true }));
  const filtered = [...big.querySelectorAll('.c-chat-info__member-name')].map((e) => e.textContent);
  ok(filtered.join('+') === 'Leia', 'search filters the full list (no hidden remainder)');
  bigHost.remove();
}

{
  /* static guards: demos must link every component stylesheet they render —
     jsdom is style-blind; the tip sheet shipped once with native-looking chips
     because chat.html lacked chip.css (Damir round 1) */
  const chat = readFileSync(join(root, 'src/demo/chat.html'), 'utf8');
  ok(chat.includes('components/chip.css') && chat.includes('components/tip-sheet.css'),
    'chat demo links chip.css + tip-sheet.css (tip sheet renders on-brand)');
  ok(chat.includes('components/chat-info.css'),
    'chat demo links chat-info.css (#141)');
  ok(chat.includes('components/txlist-item.css'),
    'chat demo links txlist-item.css (#142 — payment rows rendered as naked native buttons without it, Damir screenshot)');
}

{
  /* static guards — bug round 2026-07-05c (Damir): ② the live request-out card
     must ship status 'pending' ('actionable' is a request-IN state — the card
     rendered bare: no badge, no Cancel); ③ the composer ctx strip needs
     min-width:0 (it's a nested flex container — min-width:auto resolves to the
     NOWRAP excerpt's width and pushes the cancel ✕ off-screen; jsdom is
     layout-blind so we guard the CSS text); ④ every demo row-append path keeps
     the typing pill last; string patches to setPaymentStatus are silent no-ops. */
  const chat = readFileSync(join(root, 'src/demo/chat.html'), 'utf8');
  ok(/role: 'request-out', amount: p\.amount, status: 'pending'/.test(chat),
    'live request-out card ships pending + Cancel request (2026-07-05c ②)');
  ok(!/setPaymentStatus\(\w+, '/.test(chat),
    'no string patches to setPaymentStatus in the chat demo (silent no-op)');
  ok((chat.match(/keepTypingLast\(box\)/g) || []).length >= 3,
    'all demo append paths keep the typing pill last (2026-07-05c ④)');
  const compCss = readFileSync(join(root, 'src/styles/components/composer.css'), 'utf8');
  ok(/c-composer__ctx \{[^}]*min-width: 0/.test(compCss),
    'ctx strip has min-width:0 — cancel ✕ stays on-screen (2026-07-05c ③)');
}

if (failures.length) { console.error('\nFAILED:\n' + failures.join('\n')); process.exit(1); }
console.log('\nsmoke test CLEAN');
process.exit(0); // jsdom windows hold live timers (their cleanup would hang the run)