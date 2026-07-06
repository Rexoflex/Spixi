/**
 * jsdom smoke test for the demo pages (#46 audit-loop step).
 * Run: npm i --no-save jsdom && node scripts/smoke-test.mjs
 * Optional arg: repo root (default = script's parent dir) — lets the script run
 * from a location where jsdom resolves, e.g. `node /x/smoke-test.mjs /repo`.
 * Asserts against COMPUTED styles where it matters ([hidden] vs author display).
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';

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
  ok(!!sinfo.querySelector('.c-chat-info__setting-section > .c-chat-info__setting'),
    'disappearing row is wrapped in a divider section (pressed/tap state confined to the row — #145b)');
  sdRow.click();
  const sdOpts = [...d.querySelectorAll('.c-chat-info__sd-option')];
  ok(sdOpts.length === 4 && sdOpts[0].getAttribute('aria-checked') === 'true',
    'option sheet: 4 radios, current one checked');
  sdOpts[1].click();                           // 1 hour
  sdOpts[2].click();                           // in-flight latch: second pick must not fire
  ok(sdSecs === 3600, 'picking 1 hour commits 3600s ONCE (latched while in flight)');
  // #145: the spinner lands in the RIGHT status slot (where the check goes), and
  // the label stays FIRST and unchanged — no left-shift (setLoading used to prepend)
  ok(sdOpts[1].children[0].classList.contains('c-chat-info__sd-option-label')
    && sdOpts[1].querySelector('.c-chat-info__sd-status .c-button__spinner')
    && !sdOpts[1].querySelector('.c-chat-info__sd-option-label + .c-button__spinner')
    && sdOpts[1].querySelector('.c-chat-info__sd-option-label').textContent === '1 hour',
    'loading spinner sits in the check slot; the label stays put (#145)');
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
  // substring match (#144 Damir): 'le' is inside both aLEx and LEia — the filter
  // must surface ALL matches A–Z, none hidden (that IS the "no hidden remainder")
  ok(filtered.join('+') === 'Alex+Leia', 'search filters to every substring match, A–Z, no hidden remainder');
  bigHost.remove();

  /* —— #143: shared money module — the helpers still behave after the move out
     of wallet-send/receive/typed-bubbles into money.js —— */
  ok(S.sanitizeAmount('1,000.5') === '1000.5' && S.sanitizeAmount('12,5') === '12.5',
    'money.sanitizeAmount: comma = grouping with a dot, else decimal (#135-M2)');
  ok(S.canonicalAmount('.5') === '0.5' && S.canonicalAmount('12.') === '12' && S.canonicalAmount('007') === '7',
    'money.canonicalAmount: canonical payload form (#137-C1/M1)');
  ok(S.formatIxiAmount('1.239') === '1.23' && S.formatIxiAmount('5.00') === '5' && S.formatIxiAmount('1,234.5') === '1,234.5',
    'money.formatIxiAmount: ≤2 decimals truncated-not-rounded, grouping kept (#76/#77)');
  ok(S.toUnits('1') === 100000000n && S.toUnits(1) === 100000000n && S.toUnits('-0.00000001') === -1n,
    'money.toUnits: exact integer 1e-8 units via BigInt (#135-M1/#138-M2)');
}

console.log('settings.html — Account/Settings shell (#146 + #147 premium)');
{
  const dom = await load('settings.html');
  const d = dom.window.document, W4 = dom.window;
  const S = W4.Spixi;
  const key = (t, k) => t.dispatchEvent(new W4.KeyboardEvent('keydown', { key: k, bubbles: true }));

  /* —— demo wiring: hub renders as the account root tab —— */
  ok(!!d.querySelector('.c-settings__hero') && !!d.querySelector('.c-settings__address-row'),
    'hub renders identity hero + own-address chip');
  ok((d.querySelector('.c-settings__address-value') || {}).textContent === '425HqzWpMkV3dTgJnS85CQen',
    'FULL own address in the chip (#99)');
  ok(!!d.querySelector('.c-bottomnav'), 'bottomnav present (Account tab active)');

  /* #147: QR-FORWARD — immediately visible, no reveal step */
  const qrEl = d.querySelector('.c-settings__qr');
  ok(!!qrEl && !!qrEl.querySelector('svg path') && !d.querySelector('.c-settings__qr-toggle'),
    'QR is immediately visible in the hero — the reveal step is GONE (#147)');
  ok(qrEl.querySelector('.c-qr').dataset.qrValue === '425HqzWpMkV3dTgJnS85CQen:ixi',
    'hero QR encodes the legacy address:ixi format');

  /* #147: tinted discs + card groups (#148: the disc is the shared .c-disc atom) */
  ok(d.querySelectorAll('.c-disc').length >= 8,
    'rows carry tinted icon discs (#147/#148 shared atom)');
  const hubErrDiscs = [...d.querySelectorAll('.c-settings .c-disc[data-hue="error"]')];
  ok(hubErrDiscs.length === 1
    && hubErrDiscs[0].closest('.c-settings__row').textContent.includes('Delete'),
    'error hue is RESERVED — only the Delete data row wears it');
  ok(d.querySelectorAll('.c-settings__group').length >= 4,
    'hub groups sit on card surfaces (#147)');

  /* #148⑤: share beside copy on the address chip */
  ok(!!d.querySelector('.c-settings__share'),
    'address chip carries a share button (§9 share ask, wallet-receive precedent)');

  /* #148⑥: language sheet — flags + a scrolling taller list (10 languages) */
  const langRow = [...d.querySelectorAll('.c-settings__row')]
    .find((r) => r.textContent.includes('Language'));
  langRow.click();
  await sleep(50);
  const langOpts = d.querySelectorAll('.c-settings__opt');
  ok(langOpts.length === 10
    && d.querySelectorAll('.c-settings__opt-flag').length === 10
    && d.querySelector('.c-settings__opts').classList.contains('c-settings__opts--scroll'),
    'language sheet: 10 languages with leading flags, list scrolls (#148⑥)');
  d.dispatchEvent(new W4.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await sleep(500);

  /* —— component-level: controllable ctrls —— */
  let themeCalls = 0, themeCtrl = null, themeVal = null;
  let lockCalls = [], lockCtrl = null;
  let nickCalls = 0, nickCtrl = null;
  let avCtrl = null;
  const host = d.createElement('div');
  d.body.append(host);
  const hub = S.createSettingsHub({
    name: 'Damir', address: 'xaddr9000', theme: 0,
    languages: [{ code: 'en-us', label: 'English' }, { code: 'de-de', label: 'Deutsch' }],
    language: 'en-us', lockEnabled: false,
    backup: { last: null, dirtyCount: 0 },
    version: '2.1.4', capabilities: { dev: true },
    onNickname: (nick, ctrl) => { nickCalls++; nickCtrl = ctrl; },
    onAvatarChange: (ctrl) => { avCtrl = ctrl; },
    onAvatarRemove: (ctrl) => { avCtrl = ctrl; },
    onTheme: (v, ctrl) => { themeCalls++; themeVal = v; themeCtrl = ctrl; },
    onLanguage: () => {},
    onLock: (next, ctrl) => { lockCalls.push(next); lockCtrl = ctrl; },
    onBackup: () => {}, onDownloads: () => {}, onContributors: () => {}, onDev: () => {},
    onChatAppearance: () => {}, onNotifications: () => {}, onSecurity: () => {}, onPrivacy: () => {},
    onDanger: () => {},
  });
  host.append(hub);

  /* §9 gating honesty: callbacks wired but caps OFF → the rows must not render */
  const hubRowText = [...hub.querySelectorAll('.c-settings__row')].map((r) => r.textContent).join('|');
  ok(hubRowText.includes('Chat appearance')
    && !hubRowText.includes('Notifications') && !hubRowText.includes('Security level')
    && !hubRowText.includes('Privacy') && !hubRowText.includes('Confirm payments'),
    'chat appearance renders ungated (FE-only); notifications/security/privacy/payment-auth hide without caps (§9 honesty)');

  /* #150⑤: confirm-payments switch — the lock ON/OFF asymmetry */
  let paCtrl = null;
  const paHost = d.createElement('div');
  d.body.append(paHost);
  const paHub = S.createSettingsHub({
    name: 'D', address: 'pa1', paymentAuth: false,
    capabilities: { paymentAuth: true },
    onPaymentAuth: (next, ctrl) => { paCtrl = ctrl; },
    onBackup: () => {},
  });
  paHost.append(paHub);
  const paRow = [...paHub.querySelectorAll('.c-settings__row')]
    .find((r) => r.textContent.includes('Confirm payments'));
  const paSw = paRow.querySelector('.c-settings__switch');
  ok(!!paSw && paSw.getAttribute('aria-checked') === 'false',
    'Confirm payments renders with its cap, starts from the pref (#150⑤)');
  paSw.click();
  ok(paSw.getAttribute('aria-checked') === 'true', 'enabling payment-auth is optimistic');
  paCtrl.done();
  paSw.click();
  ok(paSw.getAttribute('aria-checked') === 'true' && paSw.getAttribute('aria-busy') === 'true',
    'disabling payment-auth PENDS on auth — weakening security costs an auth (#150⑤)');
  paCtrl.fail();
  ok(paSw.getAttribute('aria-checked') === 'true' && !paSw.getAttribute('aria-busy'),
    'auth canceled → payment confirmation stays ON');
  paHost.remove();

  /* backup row — the standing nudge (backup-ux-spec §3.1/§4 state machine) */
  ok(hub.querySelector('.c-settings__backup-sub').textContent === 'Not backed up yet'
    && !!hub.querySelector('.c-settings__backup-badge .c-badge'),
    'never-backed-up → warning badge + status sub (the standing nudge)');
  S.setBackupStatus(hub, { last: '12 Mar', dirtyCount: 3 });
  ok(hub.querySelector('.c-settings__backup-sub').textContent.includes('3 new contacts')
    && !!hub.querySelector('.c-settings__backup-badge .c-badge'),
    'dirty state → info badge + "{n} new contacts" sub (setBackupStatus free fn)');
  S.setBackupStatus(hub, { last: '12 Mar', dirtyCount: 0 });
  ok(hub.querySelector('.c-settings__backup-sub').textContent.includes('12 Mar')
    && !hub.querySelector('.c-settings__backup-badge .c-badge'),
    'clean state → date sub, badge GONE (quiet when truthful)');

  /* nickname: EMPTY = inline error + NO commit (legacy ixian:error honesty);
     Enter+blur = ONE call (#141-M1 latch) */
  hub.querySelector('.c-settings__nick-edit').click();
  const nin = hub.querySelector('.c-settings__nick-input');
  nin.value = '   ';
  key(nin, 'Enter');
  ok(nickCalls === 0 && !hub.querySelector('.c-settings__nick-error').hidden,
    'empty nickname → inline error, NO commit (legacy validates non-empty)');
  nin.value = 'Dax';
  key(nin, 'Enter');
  nin.dispatchEvent(new W4.Event('blur'));
  ok(nickCalls === 1, 'Enter+blur double-commit latched: ONE onNickname call (#141-M1)');
  nickCtrl.done();
  ok(hub.querySelector('.c-settings__name').textContent === 'Dax', 'nickname commit lands in the hero');

  /* theme sheet (#147): VISUAL PREVIEW TILES — commit-per-pick, latched */
  const themeRow = [...hub.querySelectorAll('.c-settings__row')]
    .find((r) => r.textContent.includes('Theme'));
  themeRow.click();
  await sleep(50);
  const tiles = [...d.querySelectorAll('.c-settings__theme')];
  ok(tiles.length === 3 && tiles[0].getAttribute('aria-checked') === 'true'
    && tiles.map((t) => t.dataset.mode).join('+') === 'system+light+dark',
    'theme sheet: 3 PREVIEW TILES (system/light/dark), current checked (#147)');
  ok(tiles.every((t) => !!t.querySelector('.c-settings__theme-art')),
    'every tile carries a mini-screen preview (fixed --preview-* paints)');
  tiles[1].click();                           // Light
  tiles[2].click();                           // in-flight: must not fire
  ok(themeCalls === 1 && themeVal === 1, 'picking Light commits index 1 ONCE (latched)');
  ok(!!tiles[1].querySelector('.c-settings__opt-status .c-button__spinner'),
    'spinner lands in the tile status slot (#145③ grammar)');
  themeCtrl.done();
  /* #148②: the sheet STAYS OPEN — trying themes must not cost a reopen */
  ok(!!d.querySelector('.c-settings__themes')
    && tiles[1].getAttribute('aria-checked') === 'true'
    && tiles[0].getAttribute('aria-checked') === 'false',
    'ctrl.done keeps the sheet OPEN and moves the check (#148② — keep trying themes)');
  ok(themeRow.querySelector('.c-settings__row-value').textContent === 'Light',
    'the row value updates behind the open sheet');
  tiles[2].click();                           // latch released → a second pick works
  ok(themeCalls === 2 && themeVal === 2, 'latch releases after done — next pick commits');
  themeCtrl.done();
  key(d, 'Escape');
  await sleep(500);
  ok(!d.querySelector('.c-settings__themes'), 'user dismisses the theme sheet when done');

  /* lock: ON optimistic; OFF pending until the LockPage auth resolves (#146⑦) */
  const sw = hub.querySelector('.c-settings__switch');
  sw.click();
  ok(sw.getAttribute('aria-checked') === 'true' && lockCalls.join() === 'true',
    'lock ON flips optimistically + commits');
  lockCtrl.done();
  sw.click();
  ok(sw.getAttribute('aria-checked') === 'true' && sw.getAttribute('aria-busy') === 'true',
    'lock OFF does NOT flip — pending (aria-busy) while C# auth round-trips');
  lockCtrl.fail();
  ok(sw.getAttribute('aria-checked') === 'true' && !sw.getAttribute('aria-busy'),
    'auth canceled → switch stays ON, busy cleared');
  sw.click();
  lockCtrl.done();
  ok(sw.getAttribute('aria-checked') === 'false', 'auth success → setLockEnabled lands, switch flips OFF');

  /* avatar sheet: remove offered ONLY with a custom avatar (showRemoveAvatar honesty) */
  hub.querySelector('.c-settings__avatar').click();
  await sleep(50);
  let avOpts = [...d.querySelectorAll('.c-settings__avatar-option')];
  ok(avOpts.length === 1 && avOpts[0].textContent.includes('Choose'),
    'no custom avatar → only "Choose photo" in the sheet');
  avOpts[0].click();
  avCtrl.done({ src: 'data:image/png;base64,x' });
  await sleep(450);
  ok(!!hub.querySelector('.c-settings__avatar .c-avatar__img'),
    'picked photo renders in the hero avatar (ctrl.done({src}))');
  hub.querySelector('.c-settings__avatar').click();
  await sleep(50);
  avOpts = [...d.querySelectorAll('.c-settings__avatar-option')];
  ok(avOpts.length === 2 && avOpts[1].dataset.destructive !== undefined,
    'custom avatar present → "Remove photo" appears (destructive)');
  key(d, 'Escape');
  await sleep(500);

  /* —— Opus round: SYNC-THROW RESILIENCE (#141-m4) — a thrown shell callback
     must route to the fail path, never wedge a latch/spinner/disabled field —— */
  let lkThrows = 0, paThrows = 0;
  const twHost = d.createElement('div'); d.body.append(twHost);
  const twHub = S.createSettingsHub({
    name: 'T', address: 'tw1', lockEnabled: false, paymentAuth: false,
    capabilities: { paymentAuth: true },
    onNickname: () => { throw new Error('bridge down'); },
    onLock: () => { lkThrows++; throw new Error('bridge down'); },
    onPaymentAuth: () => { paThrows++; throw new Error('bridge down'); },
    onBackup: () => {},
  });
  twHost.append(twHub);
  const twSwitches = [...twHub.querySelectorAll('.c-settings__switch')];
  twSwitches[0].click();                       // lock ON optimistic → throw
  ok(twSwitches[0].getAttribute('aria-checked') === 'false' && !twSwitches[0].getAttribute('aria-busy'),
    'lock: a thrown onLock reverts the optimistic ON and clears aria-busy (no wedge, #141-m4)');
  twSwitches[0].click();
  ok(lkThrows === 2, 'lock switch stays operable after a thrown callback (inFlight cleared)');
  twSwitches[1].click();                       // confirm-payments ON optimistic → throw
  ok(twSwitches[1].getAttribute('aria-checked') === 'false' && paThrows === 1,
    'confirm-payments: a thrown onPaymentAuth reverts + never wedges (#141-m4)');
  twHub.querySelector('.c-settings__nick-edit').click();
  const twNin = twHub.querySelector('.c-settings__nick-input');
  twNin.value = 'NewName';
  key(twNin, 'Enter');
  ok(!twHub.querySelector('.c-settings__nick-error').hidden && !twNin.disabled,
    'nickname: a thrown onNickname shows the inline error + re-enables the input (never a stuck field, #141-m4)');
  twHost.remove();

  let rrThrows = 0;
  const pvHost = d.createElement('div'); d.body.append(pvHost);
  const pvThrow = S.createPrivacy({
    readReceipts: true, capabilities: { readReceipts: true }, onBack() {},
    onReadReceipts: () => { rrThrows++; throw new Error('x'); }, onTyping() {},
  });
  pvHost.append(pvThrow);
  const pvSw = pvThrow.querySelector('.c-settings__switch');
  pvSw.click();
  ok(pvSw.getAttribute('aria-checked') === 'true' && rrThrows === 1,
    'privacy switch: a thrown toggle reverts to the prior state (#141-m4)');
  pvSw.click();
  ok(rrThrows === 2, 'privacy switch stays operable after a thrown callback');
  pvHost.remove();

  let stThrows = 0;
  const stHost = d.createElement('div'); d.body.append(stHost);
  const stThrow = S.createSecurityLevel({
    tier: 'basic', capabilities: { securityTiers: true }, onBack() {},
    onSecurityTier: () => { stThrows++; throw new Error('x'); },
  });
  stHost.append(stThrow);
  const stCards = [...stThrow.querySelectorAll('.c-settings-security__tier')];
  stCards[1].click();                          // moderate → throw
  ok(stThrows === 1 && !stCards[1].querySelector('.c-button__spinner')
    && !stCards[1].getAttribute('aria-busy')
    && stCards[0].getAttribute('aria-checked') === 'true',
    'security tier: a thrown onSecurityTier removes the spinner, clears the latch, keeps the current tier (#141-m4)');
  stCards[1].click();
  ok(stThrows === 2, 'security tier picker stays operable after a thrown callback');
  stHost.remove();

  /* —— danger screen (#147 tone split): quiet rows + heavy cards, LOCKED confirms —— */
  let delWalletCtrl = null;
  const dhost = d.createElement('div');
  d.body.append(dhost);
  const danger = S.createSettingsDanger({
    onBack() {},
    onDeleteHistory() {}, onDeleteDownloads() {}, onDeleteAccount() {},
    onDeleteWallet: (ctrl) => { delWalletCtrl = ctrl; },
  });
  dhost.append(danger);
  const quietRows = [...danger.querySelectorAll('.c-settings__row')];
  const cards = [...danger.querySelectorAll('.c-settings-danger__card')];
  ok(quietRows.length === 2 && quietRows[0].textContent.includes('history'),
    'free-up-space tier: history + downloads as QUIET rows (#147 tone split)');
  ok(cards.length === 2 && cards[1].textContent.includes('wallet'),
    'danger zone: account + wallet as heavy cards, wallet LAST (blast-radius order)');
  cards[1].click();
  const dmodal = [...d.querySelectorAll('.c-modal')].pop();
  ok(!!dmodal && dmodal.getAttribute('role') === 'alertdialog'
    && dmodal.textContent.includes('cannot be recovered'),
    'delete-wallet confirm is an alertdialog carrying the unrecoverability line');
  ok(!!dmodal.querySelector('.c-settings-danger__confirm-warn')
    && dmodal.textContent.includes('This action cannot be undone'),
    'every delete confirm wears the standing cannot-be-undone strip (#150⑥)');
  await sleep(50);
  ok(d.activeElement && d.activeElement.textContent.trim() === 'Cancel',
    'confirm autofocuses the safe action (Cancel)');
  const dbtns = dmodal.querySelectorAll('.c-modal__actions .c-button');
  dbtns[dbtns.length - 1].click();            // confirm → in flight
  key(d, 'Escape');
  ok(!!delWalletCtrl && [...d.querySelectorAll('.c-modal')].includes(dmodal),
    'Esc mid-flight does NOT dismiss the wallet confirm (lock holds)');
  dbtns[0].click();
  ok([...d.querySelectorAll('.c-modal')].includes(dmodal), 'Cancel is dead while in flight');
  delWalletCtrl.fail('Authentication was canceled.');
  ok(!dmodal.querySelector('.c-settings-danger__confirm-error').hidden,
    'ctrl.fail surfaces the inline error and unlatches');
  delWalletCtrl = null;
  dbtns[dbtns.length - 1].click();            // fresh attempt, fresh ctrl (#138 m1)
  delWalletCtrl.done();
  await sleep(450);
  ok(![...d.querySelectorAll('.c-modal')].includes(dmodal), 'retry → ctrl.done closes the confirm');
  dhost.remove();

  /* —— backup screen: password modal, inline errors, success morph —— */
  let bkPayload = null, bkCtrl = null, exCtrl = null, exCalls = 0;
  const bhost = d.createElement('div');
  d.body.append(bhost);
  const bk = S.createSettingsBackup({
    status: { last: null, dirtyCount: 0 },
    onBack() {},
    onBackup: (p, ctrl) => { bkPayload = p; bkCtrl = ctrl; },
    onExportWallet: (ctrl) => { exCalls++; exCtrl = ctrl; },
  });
  bhost.append(bk);
  ok(!!bk.querySelector('.c-settings-backup__art-disc')
    && bk.querySelectorAll('.c-settings-backup__art-sat').length === 3,
    'hero placeholder art: shield disc + 3 satellite motifs (#146④ — illustration #6 slot)');
  ok(bk.querySelector('.c-settings-backup__status').textContent === 'Not backed up yet',
    'screen status line shares the hub-row vocabulary');
  ok(bk.querySelectorAll('.c-settings-backup__inside-tile').length === 4
    && bk.querySelectorAll('.c-settings-backup__inside-tile .c-disc').length === 4,
    'What’s-inside: 2×2 disc tiles — Identity · Wallet · Contacts · Avatar (#148③)');
  ok(!!bk.querySelector('.c-settings-backup__hero .c-settings-backup__cta'),
    'the CTA lives ON the hero panel — promise/status/action as one moment (#148③)');

  bk.querySelector('.c-settings-backup__cta').click();
  await sleep(50);
  const pmodal = [...d.querySelectorAll('.c-modal')].pop();
  const pin = pmodal.querySelector('.c-settings-backup__pw-input');
  ok(!!pin && pin.type === 'password', 'CTA opens the password confirm modal');
  const pbtns = pmodal.querySelectorAll('.c-modal__actions .c-button');
  pbtns[pbtns.length - 1].click();
  ok(!bkPayload && !pmodal.querySelector('.c-settings-backup__pw-error').hidden,
    'empty password → inline error, no bridge call');
  pin.value = 'wrong';
  pbtns[pbtns.length - 1].click();
  ok(bkPayload && bkPayload.password === 'wrong', 'confirm sends the password payload');
  key(d, 'Escape');
  ok([...d.querySelectorAll('.c-modal')].includes(pmodal),
    'Esc dead while the backup round-trips (#135-C1 lock)');
  bkCtrl.fail();
  ok(!pmodal.querySelector('.c-settings-backup__pw-error').hidden
    && [...d.querySelectorAll('.c-modal')].includes(pmodal),
    'invalid password → INLINE error on the field, modal stays (never an alert)');
  pin.value = 'right';
  pbtns[pbtns.length - 1].click();
  bkCtrl.done();
  await sleep(450);
  ok(![...d.querySelectorAll('.c-modal')].includes(pmodal),
    'ctrl.done closes the password modal');
  ok(bk.querySelector('.c-settings-backup__cta').textContent.includes('Backed up'),
    'CTA morphs to "Backed up" (#29 setSuccess)');
  S.setBackupScreenStatus(bk, { last: '5 Jul', dirtyCount: 0 });
  ok(bk.querySelector('.c-settings-backup__status').textContent.includes('5 Jul'),
    'setBackupScreenStatus refreshes the status line');

  /* advanced reveal (#147: ANIMATED — data-open drives max-height/opacity) + latched export */
  const advT = bk.querySelector('.c-settings-backup__adv-toggle');
  const advBox = bk.querySelector('.c-settings-backup__adv-box');
  ok(advT.getAttribute('aria-expanded') === 'false'
    && advBox.dataset.open === undefined && advBox.getAttribute('aria-hidden') === 'true',
    'Advanced starts collapsed (wallet-only export demoted; animated reveal)');
  advT.click();
  ok(advBox.dataset.open !== undefined && advBox.getAttribute('aria-hidden') === 'false',
    'Advanced opens via data-open (transition-friendly, a11y state carried)');
  const exBtn = bk.querySelector('.c-settings-backup__adv-box .c-button');
  exBtn.click(); exBtn.click();
  ok(exCalls === 1, 'wallet export latched — no double share');
  exCtrl.done();
  bhost.remove();

  /* Opus round: Enter-in-field submits the password; the plaintext is scrubbed
     from the DOM on close (SECURITY.md — no keys/passwords left in the WebView) */
  let bk2Payload = null, bk2Ctrl = null;
  const bhost2 = d.createElement('div'); d.body.append(bhost2);
  const bk2 = S.createSettingsBackup({
    status: { last: null, dirtyCount: 0 }, onBack() {},
    onBackup: (p, ctrl) => { bk2Payload = p; bk2Ctrl = ctrl; },
  });
  bhost2.append(bk2);
  bk2.querySelector('.c-settings-backup__cta').click();
  await sleep(50);
  const pm2 = [...d.querySelectorAll('.c-modal')].pop();
  const pin2 = pm2.querySelector('.c-settings-backup__pw-input');
  pin2.value = 'hunter2';
  key(pin2, 'Enter');
  ok(bk2Payload && bk2Payload.password === 'hunter2',
    'Enter in the password field submits the backup (guarded in-flight)');
  bk2Ctrl.done();
  await sleep(450);
  ok(pin2.value === '',
    'password is scrubbed from the field on close — no plaintext left in the DOM (SECURITY.md)');
  bhost2.remove();

  /* Opus round: a thrown onExportWallet must not wedge the Advanced export latch (#141-m4) */
  let exThrows = 0;
  const bhost3 = d.createElement('div'); d.body.append(bhost3);
  const bk3 = S.createSettingsBackup({
    status: { last: null, dirtyCount: 0 }, onBack() {},
    onBackup() {}, onExportWallet: () => { exThrows++; throw new Error('x'); },
  });
  bhost3.append(bk3);
  bk3.querySelector('.c-settings-backup__adv-toggle').click();
  const exThrowBtn = bk3.querySelector('.c-settings-backup__adv-box .c-button');
  exThrowBtn.click();                          // export → throw
  ok(exThrows === 1 && !exThrowBtn.querySelector('.c-button__spinner'),
    'wallet export: a thrown onExportWallet unlatches + clears the spinner (#141-m4)');
  exThrowBtn.click();
  ok(exThrows === 2, 'export button stays operable after a thrown callback');
  bhost3.remove();

  /* —— #147 sub-screens (settings-screens.js) —— */

  /* chat appearance — FE-only: segmented picks apply instantly to the preview */
  let patternPick = null, scalePick = null;
  const ahost = d.createElement('div');
  d.body.append(ahost);
  const appear = S.createChatAppearance({
    patternOpacity: 0.5, textScale: 1,
    onBack() {},
    onPattern: (v) => { patternPick = v; },
    onTextScale: (v) => { scalePick = v; },
  });
  ahost.append(appear);
  ok(appear.querySelector('.c-settings-appearance__preview').classList.contains('c-chat-canvas'),
    'appearance preview rides the REAL chat canvas paint (gradient + pattern mask)');
  const segs = [...appear.querySelectorAll('.c-settings-seg')];
  ok(segs.length === 2
    && segs[0].querySelectorAll('.c-settings-seg__pill').length === 4
    && segs[1].querySelectorAll('.c-settings-seg__pill').length === 4,
    'pattern intensity + text size segmented groups (4 pills each)');
  segs[0].querySelector('.c-settings-seg__pill').click();       // Off (0)
  ok(patternPick === 0
    && appear.querySelector('.c-settings-appearance__preview').style.getPropertyValue('--chat-pattern-opacity') === '0',
    'pattern pick applies INSTANTLY to the preview + fires the FE-only callback');
  [...segs[1].querySelectorAll('.c-settings-seg__pill')].pop().click();   // XL (1.25)
  ok(scalePick === 1.25, 'text-size pick fires with the scale value');
  ahost.remove();

  /* privacy — §9-gated switches: optimistic + revert-on-fail */
  let rrCtrl = null;
  const phost = d.createElement('div');
  d.body.append(phost);
  const priv = S.createPrivacy({
    readReceipts: true, typingIndicators: true,
    capabilities: { readReceipts: true, typing: true },
    onBack() {},
    onReadReceipts: (next, ctrl) => { rrCtrl = ctrl; },
    onTyping: () => {},
  });
  phost.append(priv);
  const privSw = [...priv.querySelectorAll('.c-settings__switch')];
  ok(privSw.length === 2, 'privacy: read receipts + typing switches render with caps ON');
  privSw[0].click();
  ok(privSw[0].getAttribute('aria-checked') === 'false', 'privacy toggle flips optimistically');
  rrCtrl.fail();
  ok(privSw[0].getAttribute('aria-checked') === 'true', 'ctrl.fail reverts the optimistic flip');
  const privOff = S.createPrivacy({ capabilities: {}, onBack() {}, onReadReceipts() {}, onTyping() {} });
  ok(privOff.querySelectorAll('.c-settings__switch').length === 0,
    'privacy rows hide without their caps (§9 honesty)');
  phost.remove();

  /* notifications — §9-gated master/previews/sounds */
  const nhost = d.createElement('div');
  d.body.append(nhost);
  const notifs = S.createNotificationsScreen({
    capabilities: { globalNotifications: true },
    onBack() {}, onEnabled() {}, onPreviews() {}, onSounds() {},
  });
  nhost.append(notifs);
  ok(notifs.querySelectorAll('.c-settings__switch').length === 3,
    'notifications: master + previews + sounds switches (§9-gated, caps ON)');
  nhost.remove();

  /* security level (#147 tiers) — 4 cards, latched commit */
  let tierPick = null, tierCtrl = null;
  const shost2 = d.createElement('div');
  d.body.append(shost2);
  const secEl = S.createSecurityLevel({
    tier: 'basic', capabilities: { securityTiers: true },
    onBack() {},
    onSecurityTier: (t, ctrl) => { tierPick = t; tierCtrl = ctrl; },
  });
  shost2.append(secEl);
  const tierCards = [...secEl.querySelectorAll('.c-settings-security__tier')];
  ok(tierCards.length === 4
    && tierCards.map((t) => t.dataset.tier).join('+') === 'basic+moderate+strict+custom'
    && tierCards[0].getAttribute('aria-checked') === 'true',
    'security level: Basic/Moderate/Strict/Custom tier cards, current checked (#147)');
  tierCards[2].click();                       // Strict
  tierCards[3].click();                       // in-flight: must not fire
  ok(tierPick === 'strict' && !!tierCards[2].querySelector('.c-button__spinner'),
    'tier pick commits ONCE, latched, spinner in the status slot');
  tierCtrl.done();
  ok(tierCards[2].getAttribute('aria-checked') === 'true'
    && tierCards[0].getAttribute('aria-checked') === 'false',
    'ctrl.done moves the checked state to the new tier');
  const secOff = S.createSecurityLevel({ capabilities: {}, onBack() {}, onSecurityTier() {} });
  ok(secOff.querySelectorAll('.c-settings-security__tier').length === 0,
    'security tiers hide without the cap (§9 honesty)');
  shost2.remove();

  /* —— slice 2 (settings-app.js, spec §9b): downloads · dev log · contributors —— */

  /* downloads — list render, search, open, delete confirm, clear-all */
  let openName = null, delName = null, delCtrl = null, clearCtrl = null;
  const dlhost = d.createElement('div');
  d.body.append(dlhost);
  const FILES = [
    { name: 'report.pdf', time: '05/07/2026 10:12:44' },
    { name: 'photo.jpg', time: '04/07/2026 21:03:11' },
    { name: 'invoice.pdf', time: '03/07/2026 14:40:02' },
    { name: 'note.m4a', time: '02/07/2026 09:15:37' },
    { name: 'diagram.png', time: '01/07/2026 18:22:56' },
    { name: 'deck.pptx', time: '29/06/2026 11:48:20' },
    { name: 'notes.txt', time: '25/06/2026 08:02:13' },
    { name: '<img src=x onerror=alert(1)>.zip', time: '21/06/2026 16:31:45' },
  ];
  const dl = S.createSettingsDownloads({
    files: FILES, onBack() {},
    onOpenFile: (n) => { openName = n; },
    onDeleteFile: (n, ctrl) => { delName = n; delCtrl = ctrl; },
    onClearAll: (ctrl) => { clearCtrl = ctrl; },
  });
  dlhost.append(dl);
  const dlSections = () => [...dl.querySelectorAll('.c-settings__groupwrap')[0].querySelectorAll('.c-settings__section')];
  ok(dlSections().length === 8 && dl.querySelector('.c-settings-dl__empty').hidden,
    'downloads: 8 file rows on the card, empty state hidden');
  ok(!dl.querySelector('.c-settings-dl__search').hidden,
    'search field shows at ≥8 files');
  ok(!dl.querySelector('.c-settings-dl__row img')
    && dl.textContent.includes('<img src=x onerror=alert(1)>.zip'),
    'bridge file names land as TEXT — the legacy innerHTML concat is NOT ported (XSS guard)');
  dl.querySelector('.c-settings-dl__open').click();
  ok(openName === 'report.pdf', 'row tap fires ixian:open with the file name');
  const dlInput = dl.querySelector('.c-search-field__input');
  dlInput.value = 'pdf';
  dlInput.dispatchEvent(new W4.Event('input', { bubbles: true }));
  ok(dlSections().filter((s) => !s.hidden).length === 2,
    'search narrows to name matches (frontend-only filter)');
  dlInput.value = 'zzz-no-such-file';
  dlInput.dispatchEvent(new W4.Event('input', { bubbles: true }));
  ok(!dl.querySelector('.c-settings-dl__nomatch').hidden,
    'no-match note appears when the filter empties the list');
  dlInput.value = '';
  dlInput.dispatchEvent(new W4.Event('input', { bubbles: true }));
  ok(dlSections().filter((s) => !s.hidden).length === 8, 'clearing the search restores every row');

  /* per-file delete — the house locked confirm (settingsConfirm, one contract) */
  dl.querySelector('.c-settings-dl__del').click();
  const dlModal = [...d.querySelectorAll('.c-modal')].pop();
  ok(!!dlModal && dlModal.getAttribute('role') === 'alertdialog'
    && !!dlModal.querySelector('.c-settings-danger__confirm-warn')
    && dlModal.textContent.includes('report.pdf'),
    'file delete = locked alertdialog + cannot-undo strip (#150⑥), names the file');
  const dlBtns = dlModal.querySelectorAll('.c-modal__actions .c-button');
  dlBtns[dlBtns.length - 1].click();
  ok(delName === 'report.pdf' && !!delCtrl, 'confirm fires onDeleteFile(name, ctrl)');
  delCtrl.fail('Couldn’t delete.');
  ok(!dlModal.querySelector('.c-settings-danger__confirm-error').hidden,
    'delete ctrl.fail surfaces the inline error and unlatches');
  delCtrl = null;
  dlBtns[dlBtns.length - 1].click();          // fresh attempt, fresh ctrl
  delCtrl.done();
  await sleep(450);
  ok(![...d.querySelectorAll('.c-modal')].includes(dlModal), 'retry → ctrl.done closes the confirm');
  S.setDownloads(dl, FILES.slice(1));         // C# re-pushes the whole list after delete
  ok(dlSections().length === 7, 'setDownloads mirrors the wholesale clearFiles+addFile re-push');

  /* clear-all → ixian:deleted; empty state takes over */
  const dlClear = [...dl.querySelectorAll('.c-settings__row')]
    .find((r) => r.textContent.includes('Delete all downloads'));
  ok(!!dlClear && dlClear.querySelector('.c-disc').dataset.hue === 'error',
    'clear-all is the ONE error-hue row on the downloads surface (#147 reservation)');
  dlClear.click();
  const clModal = [...d.querySelectorAll('.c-modal')].pop();
  const clBtns = clModal.querySelectorAll('.c-modal__actions .c-button');
  clBtns[clBtns.length - 1].click();
  clearCtrl.done();
  await sleep(450);
  S.setDownloads(dl, []);
  ok(!dl.querySelector('.c-settings-dl__empty').hidden
    && dl.querySelector('.c-settings-dl__search').hidden
    && dl.querySelectorAll('.c-settings__groupwrap')[0].hidden,
    'cleared list → empty state, search + list + clear-all rows retire');

  /* sync throw in onDeleteFile → fail path, modal never wedges (#141-m4) */
  const dlThrow = S.createSettingsDownloads({
    files: [{ name: 'a.txt', time: 't' }], onBack() {},
    onOpenFile() {}, onDeleteFile: () => { throw new Error('bridge not ready'); },
  });
  dlhost.append(dlThrow);
  dlThrow.querySelector('.c-settings-dl__del').click();
  const twModal = [...d.querySelectorAll('.c-modal')].pop();
  const twBtns = twModal.querySelectorAll('.c-modal__actions .c-button');
  twBtns[twBtns.length - 1].click();
  ok(!twModal.querySelector('.c-settings-danger__confirm-error').hidden,
    'sync throw in onDeleteFile routes to the inline fail path — confirm never wedges (#141-m4)');
  key(d, 'Escape');
  await sleep(500);
  dlhost.remove();

  /* dev — log viewer + copy + send (no export/tail command; send is §9-gated) */
  let sendCalls = 0, sendCtrl = null;
  const dvhost = d.createElement('div');
  d.body.append(dvhost);
  const dev = S.createSettingsDev({
    onBack() {},
    onSendLog: (ctrl) => { sendCalls++; sendCtrl = ctrl; },
  });
  dvhost.append(dev);
  ok(dev.querySelector('.c-settings-dev__log').hidden
    && !dev.querySelector('.c-settings-dev__waiting').hidden
    && dev.querySelector('.c-settings-dev__actions').hidden,
    'dev screen waits honestly until the setLog push lands (actions hidden too)');
  S.setDevLog(dev, 'line 1\n<script>alert(1)</script>\nline 3');
  S.setDevLog(dev, 'line 1\n<script>alert(1)</script>\nline 3');   // push may arrive twice
  const pane = dev.querySelector('.c-settings-dev__log');
  ok(!pane.hidden && pane.textContent.includes('<script>')
    && !pane.querySelector('script'),
    'setDevLog is idempotent and injects the log as TEXT (double-push + XSS safe)');
  ok(pane.tagName === 'PRE' && pane.childNodes.length === 1,
    'unbounded log lands as ONE text node — no per-line DOM');
  ok(!dev.querySelector('.c-settings-dev__actions').hidden,
    'Copy + Send actions appear with the log');
  dev.querySelector('.c-settings-dev__copy').click();   // jsdom has no navigator.clipboard
  ok(dev.querySelector('.c-settings__live').textContent.includes('Couldn’t copy'),
    'copy fails SOFT when the clipboard is absent (WebView honesty)');
  const sendBtn = dev.querySelector('.c-settings-dev__send');
  sendBtn.click();
  sendBtn.click();                            // latched — must not fire twice
  ok(sendCalls === 1 && !!sendCtrl, 'Send log fires ONCE, latched while in flight');
  sendCtrl.done();
  ok(sendBtn.textContent.includes('Sent'), 'send ctrl.done morphs the button to Sent');
  const devThrow = S.createSettingsDev({
    log: 'x', onBack() {},
    onSendLog: () => { throw new Error('bridge not ready'); },
  });
  dvhost.append(devThrow);
  devThrow.querySelector('.c-settings-dev__send').click();
  ok(devThrow.querySelector('.c-settings__live').textContent.includes('Couldn’t send')
    && !devThrow.querySelector('.c-settings-dev__send .c-button__spinner'),
    'sync throw in onSendLog routes to the fail path — button unlatches, no spinner left (#141-m4)');
  const devGated = S.createSettingsDev({ log: 'x', onBack() {} });
  ok(!devGated.querySelector('.c-settings-dev__send'),
    'Send log hides without its callback (§9 honesty — no bridge command yet)');
  dvhost.remove();

  /* contributors — static port of the legacy 12 */
  const con = S.createSettingsContributors({ onBack() {} });
  const conNames = [...con.querySelectorAll('.c-settings-contrib__name')];
  ok(conNames.length === 12 && conNames[0].textContent === 'Lex Scalp',
    'contributors: the legacy 12 render as a static card list');

  host.remove();
}

{
  /* static guards — #146 settings shell + #147 premium round. jsdom is
     layout/paint-blind — these read the CSS/HTML/token text. */
  const setHtml = readFileSync(join(root, 'src/demo/settings.html'), 'utf8');
  ok(setHtml.includes('components/settings-shell.css') && setHtml.includes('components/settings-backup.css')
    && setHtml.includes('components/settings-screens.css')
    && setHtml.includes('components/badge.css') && setHtml.includes('components/avatar.css'),
    'settings demo links every component stylesheet it renders (#138/#142 class)');
  ok(setHtml.includes('components/message-bubble.css') && setHtml.includes('styles/chat-pattern.css'),
    'settings demo links the chat-canvas paint pair — the appearance preview needs BOTH (#147)');
  const setCss = readFileSync(join(root, 'src/styles/components/settings-shell.css'), 'utf8');
  ok(/\.c-settings__name \{[^}]*min-width: 0/.test(setCss),
    'settings hero name has min-width:0 — long names/RTL ellipsize (#140③/#144① class)');
  ok(/\.c-settings__address-row \{[^}]*background: var\(--surface-input\)/.test(setCss)
    && /\.c-settings__copy \{[^}]*width: 32px/.test(setCss),
    'own-address chip: --surface-input + 32px copy button (#145④ parity)');
  ok(/\.c-settings__group \{[^}]*background: var\(--surface-card\)/.test(setCss),
    'hub groups sit on --surface-card (#147 — depth over hairline flatness)');
  /* #147 disc + preview tokens: defined for BOTH modes (a light-only pair would
     silently wash out in dark — the #48 dark-badge lesson) */
  const tok = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8');
  ok((tok.match(/--disc-primary-bg:/g) || []).length === 2
    && (tok.match(/--disc-error-ink:/g) || []).length === 2,
    '--disc-* token pairs defined in BOTH light and dark blocks (#147)');
  ok(/--preview-light-surface:/.test(tok) && /--preview-dark-surface:/.test(tok)
    && /--chat-text-scale: 1/.test(tok),
    'theme-preview fixed pairs + --chat-text-scale default live in tokens.css (#147)');
  ok(/\.c-settings__theme-art \{[^}]*background: var\(--preview-light-surface\)/.test(setCss),
    'theme tiles paint with the FIXED preview pair — a preview shows its OWN mode (#137 --surface-qr precedent)');
  const bkCss = readFileSync(join(root, 'src/styles/components/settings-backup.css'), 'utf8');
  ok(/\.c-settings-backup__adv-box \{[^}]*max-height: 0/.test(bkCss)
    && /\.c-settings-backup__adv-box\[data-open\]/.test(bkCss),
    'Advanced reveal animates via data-open max-height/opacity (#147 — reveals must not snap)');
  ok(/\.c-settings-backup__adv-chevron, \.c-settings-backup__adv-box \{ transition: none/.test(bkCss),
    'Advanced reveal transition is reduced-motion guarded');
  const bundleScript = readFileSync(join(root, 'scripts/build-demo-bundle.mjs'), 'utf8');
  ok(bundleScript.indexOf('settings-shell.js') < bundleScript.indexOf('settings-backup.js')
    && bundleScript.indexOf('settings-shell.js') !== -1
    && bundleScript.includes('settings-screens.js'),
    'bundle FILES: settings-shell.js → settings-backup.js → settings-screens.js registered');
  const bkJs = readFileSync(join(root, 'src/components/settings-backup.js'), 'utf8');
  ok(/import \{ backupStatusParts \} from '\.\/settings-shell\.js'/.test(bkJs),
    'backup screen imports the SHARED status vocabulary — no local copy (one nudge truth)');
  const shellJs = readFileSync(join(root, 'src/components/settings-shell.js'), 'utf8');
  ok((shellJs.match(/hue: 'error'/g) || []).length === 1,
    "hue 'error' appears exactly once in the hub (the Delete data row) — error stays reserved (#147)");

  /* —— #148 guards —— */
  ok((tok.match(/--switch-track-off:/g) || []).length === 2
    && (tok.match(/--switch-knob:/g) || []).length === 2,
    'switch control pair defined in BOTH modes (#148① — the invisible-toggle fix)');
  const baseCss2 = readFileSync(join(root, 'src/styles/base.css'), 'utf8');
  ok(/\.c-disc \{/.test(baseCss2) && /\.c-disc\[data-hue='error'\]/.test(baseCss2),
    'the tinted disc is the shared .c-disc atom in base.css (#148 — one treatment app-wide)');
  ok(/background: var\(--switch-track-off\)/.test(setCss)
    && /background: var\(--switch-knob\)/.test(setCss),
    'settings switch rides the dedicated pair (#148①)');
  const infoCss2 = readFileSync(join(root, 'src/styles/components/chat-info.css'), 'utf8');
  ok(/background: var\(--switch-track-off\)/.test(infoCss2)
    && /background: var\(--switch-knob\)/.test(infoCss2),
    'chat-info switch rides the same pair (#148 harmonization)');
  ok(/\.c-chat-info__body > :not\(\.c-chat-info__hero\)/.test(infoCss2)
    && /background: var\(--surface-card\)/.test(infoCss2),
    'chat-info sections sit on cards — the settings grammar (#148, Damir consistency call)');
  const infoJs2 = readFileSync(join(root, 'src/components/chat-info.js'), 'utf8');
  ok(/function infoDisc/.test(infoJs2)
    && (infoJs2.match(/infoDisc\((?:'[^']+'|glyph), 'error'\)/g) || []).length === 1
    && /infoDisc\('bell', 'warning'\)/.test(infoJs2),
    'chat-info rows wear discs; error disc only on the destructive rows (#148)');
  ok(/\.c-settings-backup__body > \* \{ flex: none/.test(bkCss)
    && /\.c-settings__body > \*,\n\.c-settings-danger__body > \* \{ flex: none/.test(setCss),
    'scroll-column children never shrink — the crushed-CTA class is guarded (#148③)');
  ok(/\.c-settings-backup__hero \{[^}]*background: var\(--surface-card\)/.test(bkCss),
    'backup hero is a raised PANEL carrying art/status/CTA (#148③ premium pass)');

  /* —— #149 guards (Damir chat-info review, 3 items — all layout, jsdom-blind) —— */
  ok(/\.c-chat-info__txs-list \{[^}]*margin-inline: calc\(-1 \* var\(--spacing-12\)\)/.test(infoCss2)
    && /\.c-chat-info__txs \{[^}]*overflow: hidden/.test(infoCss2),
    'chat-info tx rows run full-bleed in the card, clipped to its radius (#149①)');
  ok(/\.c-chat-info__row \{[^}]*min-height: 52px/.test(infoCss2),
    'chat-info rows breathe at 52px — settings parity (#149②)');
  ok(/\.c-chat-info__qr \{[^}]*align-self: center/.test(infoCss2)
    && /\.c-chat-info__qr svg \{ width: 148px/.test(infoCss2),
    'chat-info QR hugs the code at 148px — account-hub parity (#149③)');

  /* —— #150 guards (Damir regression screenshots) —— */
  ok(/\.c-chat-info__body > \* \{ flex: none/.test(infoCss2),
    'chat-info scroll-column children never shrink — the #149 overflow:hidden made payments the only shrinkable child and it clipped to a sliver (#150①)');
  ok(/\.c-member__actions \{[^}]*width: 100%/.test(infoCss2),
    'member-sheet actions span the row — Kick/Ban match the Pay/Request size (#150②)');
  ok((tok.match(/--surface-input-on-card:/g) || []).length === 2,
    'input-on-card pair defined in BOTH modes (#150③ — input === card made fields invisible)');
  ok(/--surface-input: var\(--surface-input-on-card\)/.test(infoCss2)
    && /--surface-input: var\(--surface-input-on-card\)/.test(setCss),
    'carded containers reassign --surface-input (the #20 contextual-override precedent, #150③)');
  const infoJs3 = readFileSync(join(root, 'src/components/chat-info.js'), 'utf8');
  ok(/notifSection\.className = 'c-chat-info__setting-section'/.test(infoJs3),
    'notifications row wrapped like the sd row — equal single-row card heights (#150④)');
  const scrCss = readFileSync(join(root, 'src/styles/components/settings-screens.css'), 'utf8');
  ok(/data-side='sent'\] \{[^}]*color: var\(--text-bubble-sent\)/.test(scrCss)
    && /data-side='received'\] \{[^}]*color: var\(--text-bubble-received\)/.test(scrCss),
    'appearance preview bubbles ride the REAL bubble ink pair — no dark-on-blue (#150⑦)');
  ok(/\.c-settings-danger__confirm-warn \{[^}]*background: var\(--disc-error-bg\)/.test(setCss),
    'cannot-undo strip styled as the error-tonal wash (#150⑥)');

  /* —— slice 2 guards (settings-app.js, spec §9b) —— */
  ok(setHtml.includes('components/settings-app.css') && setHtml.includes('components/search-field.css'),
    'settings demo links settings-app.css + search-field.css (#138 class — downloads search renders on-brand)');
  ok(bundleScript.indexOf('settings-shell.js') < bundleScript.indexOf('settings-app.js')
    && bundleScript.includes('settings-app.js'),
    'bundle FILES: settings-app.js registered AFTER settings-shell.js (imports settingsConfirm)');
  const appJs = readFileSync(join(root, 'src/components/settings-app.js'), 'utf8');
  ok(/import \{ settingsConfirm \} from '\.\/settings-shell\.js'/.test(appJs),
    'downloads deletes ride the SHARED locked confirm — no local copy (one #135-C1/#150⑥ truth)');
  ok((appJs.match(/dataset\.hue = 'error'/g) || []).length === 1,
    "error hue appears exactly once in settings-app (the clear-all row) — reservation holds (#147)");
  ok(!/\.innerHTML/.test(appJs),
    'settings-app never touches .innerHTML — bridge names/log stay text (SECURITY; the word in the doc comment is fine)');
  const appCss = readFileSync(join(root, 'src/styles/components/settings-app.css'), 'utf8');
  ok(/\.c-settings-dl__open \{[^}]*min-width: 0/.test(appCss)
    && /\.c-settings-dl__name \{[^}]*text-overflow: ellipsis/.test(appCss),
    'long file names ellipsize — min-width:0 + ellipsis (#140③ class, jsdom is layout-blind)');
  ok(/\.c-settings-dl__del \{[^}]*width: 44px/.test(appCss),
    'per-file delete keeps the 44px touch target');
  ok(/\.c-settings-dev__log\.u-scroll \{[^}]*flex: 1 1 auto/.test(appCss)
    && /min-height: 0/.test(appCss),
    'dev log pane is the sanctioned flex child of the scroll body (beats the #148③ flex:none guard)');

  /* —— 2026-07-05 post-batch fixes (Damir screenshots/asks) —— */
  ok(/\[data-theme="dark"\] \.c-settings-backup__pw-input::-ms-reveal \{ filter: invert/.test(bkCss),
    'native show-password eye (WebView2 ::-ms-reveal) tinted readable in dark mode');
  const wsJs = readFileSync(join(root, 'src/components/wallet-send.js'), 'utf8');
  const wsCss = readFileSync(join(root, 'src/styles/components/wallet-send.css'), 'utf8');
  ok(/c-wallet-send__max-warn/.test(wsJs) && /Payments cannot be undone/.test(wsJs)
    && /content: maxWarn/.test(wsJs),
    'Send-Max confirm carries the warning strip with ADAPTED text — the payment is irreversible, the fill is not (#150⑥ grammar)');
  ok(/\.c-wallet-send__max-warn \{[^}]*background: var\(--disc-error-bg\)/.test(wsCss),
    'Max strip rides the same error-tonal wash recipe as the delete confirms');
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

{
  /* static guards — #143 Opus round. ① the chat-info hero NAME is a flex item in
     a row (name-row) with white-space:nowrap; without min-width:0 its min-width
     resolves to the nowrap content width, so a long name/nickname (or RTL string)
     overflows the hero and shoves the edit pencil off-screen (the #140③ / #136①
     class — jsdom is layout-blind, guard the CSS text). ② the money helpers live
     in ONE module now (money.js); the chat/tip path must NOT reach cross-feature
     back into wallet-send/wallet-receive for them. */
  const infoCss = readFileSync(join(root, 'src/styles/components/chat-info.css'), 'utf8');
  ok(/\.c-chat-info__name \{[^}]*min-width: 0/.test(infoCss),
    'chat-info hero name has min-width:0 — long names/RTL ellipsize, no overflow (#143 ①, #140③ class)');
  ok(/\.c-chat-info__money \{[^}]*flex-wrap: wrap/.test(infoCss)
    && /\.c-chat-info__message \{ flex-basis: 100%/.test(infoCss),
    'contact money row: Message leads full-width, Pay+Request wrap to a 2-col row below (#144 Damir demo)');
  const tip = readFileSync(join(root, 'src/components/tip-sheet.js'), 'utf8');
  const recv = readFileSync(join(root, 'src/components/wallet-receive.js'), 'utf8');
  const tb = readFileSync(join(root, 'src/components/typed-bubbles.js'), 'utf8');
  ok(/from '\.\/money\.js'/.test(tip) && !/from '\.\/wallet-(send|receive)\.js'/.test(tip),
    'tip-sheet imports money helpers from the shared module, not cross-feature (#143 ②)');
  ok(/import \{ sanitizeAmount, canonicalAmount \} from '\.\/money\.js'/.test(recv),
    'wallet-receive imports sanitize/canonical from money.js (#143 ②)');
  ok(/from '\.\/money\.js'/.test(tb) && !/export function formatIxiAmount/.test(tb),
    'typed-bubbles imports formatIxiAmount from money.js (no local copy — #143 ②)');
}

{
  /* static guards — #145 chat-info polish (Damir demo review). jsdom is layout/
     paint-blind, so these read the CSS/HTML text. */
  const infoCss = readFileSync(join(root, 'src/styles/components/chat-info.css'), 'utf8');
  const baseCss = readFileSync(join(root, 'src/styles/base.css'), 'utf8');
  const chatHtml = readFileSync(join(root, 'src/demo/chat.html'), 'utf8');
  ok(/\.demo-sendpanel \{[^}]*inset: 44px 0 0 0/.test(chatHtml),
    'demo takeover starts BELOW the 44px mock statusbar — no cover (#145 ①)');
  ok(/\.c-chat-info__setting-section > \.c-chat-info__setting/.test(infoCss),
    'disappearing row uses a wrapper section for its divider — pressed/tap box stays off the gap (#145 ②)');
  ok(/\.c-chat-info__sd-status \{[^}]*color: var\(--icon-success\)/.test(infoCss)
    && /\.c-chat-info__sd-option\[data-loading\] \.c-chat-info__sd-check \{ display: none/.test(infoCss),
    'sd check uses --icon-success (both themes) + loading swaps the check for a spinner in the slot (#145 ③)');
  ok(/\.c-chat-info__address-row \{[^}]*background: var\(--surface-input\)/.test(infoCss)
    && /\.c-chat-info__copy \{[^}]*width: 32px/.test(infoCss),
    'address value sits on a --surface-input chip with a 32px copy button — member-sheet parity (#145 ④)');
  ok(/scrollbar-gutter: stable/.test(baseCss),
    'u-scroll reserves the scrollbar gutter — QR/payments expand no longer reflows content (#145 ⑤)');
}

console.log('chats.html — contacts flow (Phase 1 #2)');
{
  const dom = await load('chats.html');
  const d = dom.window.document, W = dom.window;

  // —— FAB → picker ——
  d.getElementById('fab').click();
  const picker = d.querySelector('.demo-panel .c-contacts');
  ok(!!picker, 'FAB opens the contacts picker takeover');
  const rows = [...picker.querySelectorAll('.c-contacts__row')];
  ok(rows.length === 10, 'roster renders 10 rows');
  ok(rows[0].querySelector('.c-contacts__name').textContent === 'Baracuda'
    && rows[rows.length - 1].querySelector('.c-contacts__name').textContent === '335Hxq21abcd5OP32KpR8mWzD2cF6JuEwA1vBq',
    'named contacts A–Z first, address-only after (spec §3a)');
  const pendingRow = rows.find((r) => r.dataset.pending !== undefined);
  ok(!!pendingRow && !!pendingRow.querySelector('.c-badge') && !pendingRow.disabled,
    'pending contact: badge, still tappable in browse (Damir pick)');

  // spec §7① (Damir "address now, nick later"): a NAMED row's subline is the
  // Ixian address, middle-truncated so it reads as an identity token (both ends
  // visible) — not the full address, not a name-looking stub.
  const HAN_ADDR = 'SxK7q9RmW2p4fj2soloD3vBnH8tYcF6JuEwQ2z';
  const hanSub = rows.find((r) => r.querySelector('.c-contacts__name').textContent === 'Han Solo')
    .querySelector('.c-contacts__sub').textContent;
  ok(hanSub.includes('…') && hanSub.length < HAN_ADDR.length
    && HAN_ADDR.startsWith(hanSub.split('…')[0]) && HAN_ADDR.endsWith(hanSub.split('…')[1]),
    'named row subline = middle-truncated Ixian address (spec §7①)');

  // —— search narrows on name+address substring ——
  const search = picker.querySelector('.c-search-field__input');
  search.value = 'han';
  search.dispatchEvent(new W.Event('input', { bubbles: true }));
  ok(picker.querySelectorAll('.c-contacts__row').length === 1, 'search narrows the roster');

  // F11: address substring must ALSO narrow the roster (covers the c-address branch
  // of the filter, not just the name branch) — 'qwertz990' only occurs in QWERTZ's
  // address ('5qwertz9900aa'), not in any name.
  search.value = 'qwertz990';
  search.dispatchEvent(new W.Event('input', { bubbles: true }));
  const addrMatch = [...picker.querySelectorAll('.c-contacts__row')];
  ok(addrMatch.length === 1 && addrMatch[0].querySelector('.c-contacts__name').textContent === 'QWERTZ',
    'F11: address-substring search surfaces the matching row (QWERTZ, by address)');

  search.value = '';
  search.dispatchEvent(new W.Event('input', { bubbles: true }));

  // —— Create group → multi-select ——
  const actionsCard = picker.querySelector('.c-contacts__action').closest('.c-contacts__group');
  [...picker.querySelectorAll('.c-contacts__action')][1].click();
  ok(picker.querySelector('.c-contacts__footer').hidden === false && actionsCard.hidden === true,
    'multi mode: footer Next appears, top actions hide');
  const mrows = [...picker.querySelectorAll('.c-contacts__row')];
  const rowByNameM = (n) => mrows.find((r) => r.querySelector('.c-contacts__name').textContent === n);
  // F3: assert the SPECIFIC rows, not just a count of 2 — the pending row (Ben
  // Kenobi) and the type-2 bot row (Ixian News) must be disabled, and a normal
  // contact (Han Solo) must NOT be.
  ok(mrows.filter((r) => r.disabled).length === 2, 'pending + bot rows disabled in multi-select');
  ok(!!rowByNameM('Ben Kenobi').disabled, 'the pending row specifically is disabled in multi-select');
  ok(!!rowByNameM('Ixian News').disabled, 'the type-2 bot row specifically is disabled in multi-select');
  ok(!rowByNameM('Han Solo').disabled, 'a normal contact row is NOT disabled in multi-select');
  const nextBtn = picker.querySelector('.c-contacts__footer .c-button');
  ok(nextBtn.disabled, 'Next disabled at 0 selected');
  const rowByName = rowByNameM;
  // F4: multi-select rows are role=checkbox / aria-checked (idiomatic mapping for
  // an independent multi-select roster), not role=button + aria-pressed.
  const hanRow = rowByName('Han Solo');
  ok(hanRow.getAttribute('role') === 'checkbox' && hanRow.getAttribute('aria-checked') === 'false',
    'unselected multi-select row: role=checkbox, aria-checked=false (F4)');
  hanRow.click();
  rowByName('Sarah Jo').click();
  ok(!nextBtn.disabled && nextBtn.textContent.includes('(2)'), 'Next counts the selection');
  ok(hanRow.getAttribute('aria-checked') === 'true', 'selecting a row flips aria-checked (F4)');
  ok(!!hanRow.querySelector('.c-contacts__check')
    && W.getComputedStyle(hanRow.querySelector('.c-contacts__check')).backgroundColor !== '',
    'trailing check-circle still renders (with a fill) on a checked row (F4 visual affordance)');

  // —— F2 regression: two contacts with a falsy/empty address must not collapse
  // into one Set entry and co-select each other; the emitted selection must never
  // carry a falsy address (component-level, synthetic roster — pre-fix: both
  // address-less rows were keyed on `undefined` in the selection Set).
  let f2Selection = null;
  const f2Picker = W.Spixi.createContactsPicker({
    contacts: [
      { name: 'Alice', address: 'f2-alice-addr', type: 0 },
      { name: 'Bare One', address: '', type: 0 },
      { name: 'Bare Two', address: null, type: 0 },
    ],
    onCreateGroup: () => {},
    onNext: (sel) => { f2Selection = sel; },
  });
  d.body.append(f2Picker);
  [...f2Picker.querySelectorAll('.c-contacts__action')][1].click();   // Create group → multi
  const f2Rows = [...f2Picker.querySelectorAll('.c-contacts__row')];
  const f2RowByName = (n) => f2Rows.find((r) => r.querySelector('.c-contacts__name').textContent === n);
  ok(!!f2RowByName('Bare One').disabled && !!f2RowByName('Bare Two').disabled,
    'F2: address-less contacts are blocked (disabled) in multi-select, not co-selectable');
  f2RowByName('Alice').click();
  const f2Next = f2Picker.querySelector('.c-contacts__footer .c-button');
  ok(!f2Next.disabled && f2Next.textContent.includes('(1)'),
    'F2: only the real-address contact counts toward the selection');
  f2Next.click();
  ok(Array.isArray(f2Selection) && f2Selection.length === 1 && f2Selection[0].address === 'f2-alice-addr',
    'F2: onNext payload never carries a falsy address — no ghost co-selection');
  f2Picker.remove();

  // —— group setup ——
  nextBtn.click();
  const setup = d.querySelector('.demo-panel .c-contacts-group');
  ok(!!setup, 'Next opens group setup');
  ok(setup.querySelector('.c-contacts-group__members-head').textContent.includes('2')
    && setup.querySelectorAll('.c-contacts-group__chips .c-chip').length === 2,
    'member chips mirror the selection');
  const sw = setup.querySelector('.c-contacts-group__switch');
  sw.click();
  ok(sw.getAttribute('aria-checked') === 'true', 'blind-group switch toggles');
  const nameInput = setup.querySelector('.c-contacts-group__name');
  const createBtn = setup.querySelector('.c-contacts__footer .c-button');
  const nameErr = setup.querySelector('.c-contacts-add__error');
  nameInput.value = 'bad:|name';
  createBtn.click();
  ok(!nameErr.hidden && !!d.querySelector('.demo-panel .c-contacts-group'),
    'group name containing ":|" blocked inline — never sent (bridge-audit-A.md:544)');
  nameInput.value = '   ';
  createBtn.click();
  ok(!nameErr.hidden, 'empty group name blocked inline');
  const chips = () => [...setup.querySelectorAll('.c-contacts-group__chips .c-chip')];
  chips()[0].click();
  ok(chips().length === 1, 'chip dismiss removes a member');
  chips()[0].click();
  ok(createBtn.disabled, 'Create disabled with 0 members');

  // —— F6 regression: removal must splice by the row's own index, not by object
  // identity (list.indexOf(m)) — a duplicated member object (or a look-alike with
  // the same reference) must not remove the wrong chip / collapse to indexOf's
  // first match.
  let f6Change = null;
  const dupeMember = { name: 'Dupe', address: 'dupe-addr' };
  const f6Setup = W.Spixi.createGroupSetup({
    members: [{ name: 'Alex', address: 'alex-addr' }, dupeMember, dupeMember],
    onMembersChange: (addrs) => { f6Change = addrs; },
  });
  d.body.append(f6Setup);
  const f6Chips = () => [...f6Setup.querySelectorAll('.c-contacts-group__chips .c-chip')];
  ok(f6Chips().length === 3, 'F6 setup: 3 chips render, including the duplicated member object');
  f6Chips()[1].click();          // remove the FIRST "Dupe" chip specifically (index 1)
  ok(f6Chips().length === 2 && f6Chips()[1].textContent.includes('Dupe')
    && f6Change.length === 2 && f6Change[1] === 'dupe-addr',
    'F6: removing by row index leaves the second Dupe chip intact (not both wiped via indexOf identity)');
  f6Setup.remove();

  // —— back out: setup → picker (multi → browse) → tap contact opens chat ——
  setup.querySelector('.c-topbar .c-button').click();
  ok(!d.querySelector('.demo-panel .c-contacts-group'), 'setup back returns to the picker');
  picker.querySelector('.c-topbar .c-button').click();
  ok(picker.querySelector('.c-contacts__footer').hidden === true, 'picker back exits multi-select first (not the picker)');
  [...picker.querySelectorAll('.c-contacts__row')]
    .find((r) => r.querySelector('.c-contacts__name').textContent === 'Han Solo').click();
  ok(!d.querySelector('.demo-panel .c-contacts'), 'tapping a contact opens the chat — picker closes');

  // —— component-level: onCreate payload = ixian:select grammar inputs ——
  let payload = null;
  const gs = W.Spixi.createGroupSetup({
    members: [{ name: 'A', address: 'addr-a' }, { name: 'B', address: 'addr-b' }],
    onCreate: (p, ctrl) => { payload = p; ctrl.done(); },
  });
  d.body.append(gs);
  gs.querySelector('.c-contacts-group__switch').click();
  gs.querySelector('.c-contacts-group__name').value = 'Falcon crew';
  gs.querySelector('.c-contacts__footer .c-button').click();
  ok(!!payload && payload.blind === true && payload.name === 'Falcon crew'
    && payload.addresses.join('|') === 'addr-a|addr-b',
    'onCreate payload carries name + blind flag + addresses (ixian:select grammar)');

  // —— #141-m4: sync throw routes to fail, nothing wedges ——
  const gs2 = W.Spixi.createGroupSetup({
    members: [{ name: 'A', address: 'a1' }],
    onCreate: () => { throw new Error('boom'); },
  });
  d.body.append(gs2);
  gs2.querySelector('.c-contacts-group__name').value = 'X';
  const gs2Btn = gs2.querySelector('.c-contacts__footer .c-button');
  gs2Btn.click();
  ok(!gs2.querySelector('.c-contacts-add__error').hidden && !gs2Btn.disabled,
    'sync throw in onCreate → inline error, button restored (#141-m4)');

  // —— add-contact (component-level: gate, ✓ affordance, success latch, throw) ——
  let opened = null, checked = 0;
  const add = W.Spixi.createAddContact({
    onCheckAddress: (a, ctrl) => { checked++; ctrl.done(); },
    onSendRequest: (a, ctrl) => ctrl.done(),
    onOpened: (a) => { opened = a; },
  });
  d.body.append(add);
  const addInput = add.querySelector('.c-contacts-add__input');
  const sendBtn = add.querySelector('.c-contacts__footer .c-button');
  addInput.value = 'short';
  sendBtn.click();
  ok(!add.querySelector('.c-contacts-add__error').hidden, 'short address blocked inline (20–128 QR-accept gate)');
  W.Spixi.setAddContactAddress(add, '4fj2solo4fj2solo4fj2solo');
  await sleep(400);
  ok(checked === 1 && !add.querySelector('.c-contacts-add__valid').hidden,
    'checkAddress ✓ affordance after debounce (confirm-only — silent-fail bridge contract)');
  sendBtn.click();
  await sleep(1100);
  ok(opened === '4fj2solo4fj2solo4fj2solo', 'send success → onOpened(address) — post-add opens the conversation');
  ok(sendBtn.disabled, 'send button latched after success (one request per screen visit)');

  const add2 = W.Spixi.createAddContact({ onSendRequest: () => { throw new Error('boom'); } });
  d.body.append(add2);
  add2.querySelector('.c-contacts-add__input').value = 'x'.repeat(30);
  const send2 = add2.querySelector('.c-contacts__footer .c-button');
  send2.click();
  ok(!add2.querySelector('.c-contacts-add__error').hidden && !send2.disabled
    && !add2.querySelector('.c-contacts-add__input').disabled,
    'sync throw in onSendRequest → inline error, field + button restored (#141-m4)');

  // —— F1 regression: a stale debounced checkAddress reply must not flash ✓
  // while a request is in flight (pre-fix: submit() left checkTimer running and
  // the done() callback didn't gate on inFlight).
  let slowCtrl = null, sendCtrl3 = null;
  const add3 = W.Spixi.createAddContact({
    onCheckAddress: (a, ctrl) => { slowCtrl = ctrl; },     // never resolves on its own — driven manually
    onSendRequest: (a, ctrl) => { sendCtrl3 = ctrl; },     // held open — genuine in-flight window
  });
  d.body.append(add3);
  const in3 = add3.querySelector('.c-contacts-add__input');
  const send3 = add3.querySelector('.c-contacts__footer .c-button');
  in3.value = 'y'.repeat(24);
  in3.dispatchEvent(new W.Event('input', { bubbles: true }));
  await sleep(300);                     // debounce fires, onCheckAddress captured slowCtrl
  send3.click();                        // submit while the check is still "in flight" (sendCtrl3 held open)
  slowCtrl.done();                      // stale reply arrives AFTER submit started — must be swallowed
  ok(add3.querySelector('.c-contacts-add__valid').hidden,
    'F1: a stale checkAddress ✓ reply does not surface while a send is in flight');
  sendCtrl3.done();                     // let the held submit resolve so the ctrl doesn't leak into later tests

  // —— F5 regression: setAddContactAddress no-ops mid-flight, and unlatches on a
  // genuinely new address after a latched success (pre-fix: QR return mid-submit
  // could re-enable the field, and post-success the screen was permanently stuck).
  // Also pins the setSuccess/latch fight: setSuccess is called WITHOUT a manual
  // pre-disable, so its own +1400ms restore re-enables the button instead of
  // racing unlatch()'s re-enable with a stale re-disable timer.
  let sendCtrl5 = null, sendCount5 = 0;
  const add5 = W.Spixi.createAddContact({
    onSendRequest: (a, ctrl) => { sendCtrl5 = ctrl; sendCount5++; },   // held open — genuine in-flight window
  });
  d.body.append(add5);
  const in5 = add5.querySelector('.c-contacts-add__input');
  const send5 = add5.querySelector('.c-contacts__footer .c-button');
  in5.value = 'z'.repeat(24);
  send5.click();                        // now genuinely in flight (ctrl held by the test)
  W.Spixi.setAddContactAddress(add5, 'ignored-mid-flight-address-000000');
  ok(in5.value === 'z'.repeat(24),
    'F5: setAddContactAddress no-ops while a request is in flight (field untouched)');
  sendCtrl5.done();
  await sleep(1000);                    // within the setSuccess morph window (< 1400ms) — still disabled
  ok(send5.disabled, 'F5: send button disabled during the success morph window');
  send5.click();                        // a click during the success/latch window must not re-submit
  ok(sendCount5 === 1, 'F5: latched flag blocks re-submit during the success window (call-count stays 1)');
  W.Spixi.setAddContactAddress(add5, 'brandnewaddress0000000000');
  ok(in5.value === 'brandnewaddress0000000000',
    'F5: a new address after a latched success re-fills the field immediately');
  await sleep(1500);                    // past setSuccess's +1400ms restore — this is the assertion that
                                         // fails pre-fix (stale restore re-disables after unlatch re-enables)
  ok(!send5.disabled,
    'F5: send button is enabled once setSuccess\'s own restore lands (no fight with unlatch)');
  send5.click();
  ok(sendCount5 === 2,
    'F5: a fresh submit after the new address + restore window actually fires onSendRequest again');

  // —— topbar Contacts → DIRECTORY: no Create group, tap = details (Damir round 4) ——
  d.querySelector('.c-topbar__actions .c-button[aria-label="Contacts"]').click();
  const dir = d.querySelector('.demo-panel .c-contacts[data-purpose="directory"]');
  ok(!!dir, 'topbar Contacts opens the directory picker');
  const dirActions = [...dir.querySelectorAll('.c-contacts__action')];
  ok(dirActions.length === 1 && dirActions[0].textContent.includes('Add contact'),
    'directory: Add contact only — Create group stays with the FAB');
  [...dir.querySelectorAll('.c-contacts__row')]
    .find((r) => r.querySelector('.c-contacts__name').textContent === 'Sarah Jo').click();
  const prof = d.querySelector('.demo-panel .c-chat-info');
  ok(!!prof, 'directory tap opens contact DETAILS (chat-info contact context), not the chat');
  // F18: match the exact danger-row label (scoped to .c-chat-info__danger-row), not
  // a loose .includes('Remove contact') that a hypothetical "Remove contact request"
  // row would also satisfy.
  ok(!!prof.querySelector('.c-chat-info__nick-edit') && !!prof.querySelector('.c-chat-info__txs-list')
    && [...prof.querySelectorAll('.c-chat-info__danger-row')].some((b) => b.textContent.trim() === 'Remove contact'),
    'directory profile carries the SAME controls as chat-info contact page (nickname edit · payments · remove) — Damir parity ask');
  // F13: the parity check above only confirms what's PRESENT — also assert what
  // must be ABSENT: chat-side rows (delete history, disappearing messages) never
  // render on a directory-opened (context:'contact') profile (#142③).
  ok(![...prof.querySelectorAll('button, .c-chat-info__danger-row')].some((b) => b.textContent.includes('Delete chat history'))
    && !prof.querySelector('.c-chat-info__setting'),
    'F13: directory profile drops "Delete chat history" and the disappearing-messages row (chat-side only)');
  d.querySelector('.demo-panel .c-chat-info .c-topbar .c-button').click();   // back → directory

  // pending contact → minimal profile + cancel (ixian:undorequest covers remove too)
  [...dir.querySelectorAll('.c-contacts__row')]
    .find((r) => r.querySelector('.c-contacts__name').textContent === 'Ben Kenobi').click();
  const pendPanel = d.querySelector('.demo-panel .c-contacts-pending');
  ok(!!pendPanel && !!pendPanel.querySelector('.c-badge'),
    'pending contact opens the MINIMAL profile with a Pending badge (Damir pick)');
  ok([...pendPanel.querySelectorAll('.c-button')].filter((b) => b.textContent.includes('Cancel request')).length === 1
    && !pendPanel.querySelector('.c-chat-info'),
    'pending profile: single Cancel-request action, no money/call/chat rows');
  [...pendPanel.querySelectorAll('.c-button')].find((b) => b.textContent.includes('Cancel request')).click();
  await sleep(900);
  ok(!d.querySelector('.demo-panel .c-contacts-pending'),
    'cancel request resolves and closes the pending profile');

  // #141-m4 on the pending profile too
  const pend2 = W.Spixi.createPendingContact({ name: 'X', address: 'a1', onCancelRequest: () => { throw new Error('boom'); } });
  d.body.append(pend2);
  const pend2Btn = [...pend2.querySelectorAll('.c-button')].pop();
  pend2Btn.click();
  ok(!pend2.querySelector('.c-contacts-add__error').hidden && !pend2Btn.disabled,
    'sync throw in onCancelRequest → inline error, button restored (#141-m4)');
}

{
  /* static guards — contacts batch (jsdom is layout-blind; read the source text) */
  const chatsHtml = readFileSync(join(root, 'src/demo/chats.html'), 'utf8');
  const cjs = readFileSync(join(root, 'src/components/contacts-shell.js'), 'utf8');
  const ccss = readFileSync(join(root, 'src/styles/components/contacts-shell.css'), 'utf8');
  const bundleFiles = readFileSync(join(root, 'scripts/build-demo-bundle.mjs'), 'utf8');
  ok(/contacts-shell\.css/.test(chatsHtml), 'chats demo links contacts-shell.css');
  ok(/\.demo-panel \{[^}]*inset: 44px 0 0 0/.test(chatsHtml),
    'contacts takeover starts below the 44px mock statusbar (#145① class)');
  ok(bundleFiles.indexOf('contacts-shell.js') > bundleFiles.indexOf('chat-info.js')
    && bundleFiles.indexOf('contacts-shell.js') < bundleFiles.indexOf('settings-shell.js'),
    'bundle FILES: contacts-shell after chat-info, before settings-shell (merge-safety anchor)');
  ok(/--switch-track-off/.test(ccss) && /--switch-knob/.test(ccss),
    'blind switch rides the #148① shared track/knob token pair');
  ok(/\.c-contacts__name \{[^}]*min-width: 0/.test(ccss) && /\.c-contacts__col \{[^}]*min-width: 0/.test(ccss),
    'row name/col carry min-width:0 (#140③ class)');
  ok(!/disc\('error'/.test(cjs), 'no error-hue disc in contacts (reservation #147②)');
  ok(/name\.includes\(':\|'\)/.test(cjs), 'group-name ":|" split-token gate present (bridge-audit-A.md:544)');
  // F12: the demo must emit the blind-flag bridge grammar — first char of the name
  // slot is '1' (blind) / '0' (normal) (bridge-audit-A.md:530).
  ok(/\(blind \? '1' : '0'\)/.test(chatsHtml),
    'F12: chats.html demo emits the (blind ? \'1\' : \'0\') prefix on the ixian:select string');
}

console.log('chats.html — scan shell (Phase 1 #3)');
{
  const dom = await load('chats.html');
  const d = dom.window.document, W = dom.window;

  // —— demo e2e: add-contact scan stub → full takeover, prompt → denied → scanning → decode → auto-fill ——
  d.getElementById('fab').click();
  [...d.querySelectorAll('.demo-panel .c-contacts .c-contacts__action')][0].click();
  const add = d.querySelector('.demo-panel .c-contacts-add');
  add.querySelector('.c-contacts-add__scan').click();
  const scan = d.querySelector('.demo-panel .c-scan');
  ok(!!scan && scan.dataset.state === 'prompt',
    'add-contact scan button opens the FULL scan takeover in the permission-prompt state (Damir picks ①)');
  const frame = scan.querySelector('.c-scan__frame');
  const card = scan.querySelector('.c-scan__card');
  const cta = card.querySelector('.c-button');
  ok(frame.hidden && !card.hidden && cta.textContent.includes('Allow camera'),
    'prompt state: card + Allow CTA visible, scan frame hidden');

  cta.click();                                  // demo mock: FIRST attempt DENIES (deterministic)
  await sleep(700);
  ok(scan.dataset.state === 'denied', 'first Allow attempt lands in DENIED (demo recovery-state mock)');
  ok(scan.querySelector('.c-scan__copy').textContent.includes('settings')
    && cta.textContent.includes('Try again'),
    'denied: honest recovery copy (device settings) + inline Try again — no dead end (Damir pick ④)');

  cta.click();                                  // Try again → granted
  await sleep(700);
  ok(scan.dataset.state === 'scanning' && !frame.hidden && card.hidden,
    'Try again re-requests and lands in scanning (frame shown, card gone)');
  const hint = scan.querySelector('.c-scan__hint');
  ok(!hint.hidden && hint.getAttribute('role') === 'status' && hint.textContent.length > 0,
    'scanning hint is a live role=status line');

  // torch: present (demo provides onTorch), optimistic aria-pressed flip
  const torch = scan.querySelector('.c-scan__torch');
  ok(!!torch && !torch.hidden && torch.getAttribute('aria-pressed') === 'false',
    'torch toggle present while scanning (Damir pick ③ — flip deferred)');
  torch.click();
  ok(torch.getAttribute('aria-pressed') === 'true', 'torch flips optimistically');
  await sleep(300);
  ok(torch.getAttribute('aria-pressed') === 'true', 'torch stays on after the mock ack');

  // decode → success flash → auto-fill + return (Damir pick ②)
  const SCAN_DEMO_ADDR = 'QRj2NewFriend77xKpR8mWzD2cF6JuEwA1vBq3';
  scan.querySelector('.demo-scan-sim').click();
  ok(!scan.querySelector('.c-scan__success').hidden, 'decode shows the success flash immediately');
  await sleep(600);
  ok(!d.querySelector('.demo-panel .c-scan'), 'scan view auto-returns (closes) after the decode lands');
  const addInput = add.querySelector('.c-contacts-add__input');
  ok(addInput.value === SCAN_DEMO_ADDR,
    'decoded payload auto-fills the add-contact field (ixian:qrresult → setAddress mirror)');
  await sleep(700);                             // debounce 250 + mock checkAddress 450, from the t=350 fill
  ok(!add.querySelector('.c-contacts-add__valid').hidden,
    'auto-filled address re-runs the live checkAddress ✓ (entry symmetry with typed input)');

  // —— component-level: one decode per view (allowScanning mirror, bridge-audit-B.md:170) ——
  const decoded = [];
  const s2 = W.Spixi.createScanView({ state: 'scanning', onDecode: (t) => decoded.push(t) });
  d.body.append(s2);
  W.Spixi.deliverScanResult(s2, 'a'.repeat(30));
  W.Spixi.deliverScanResult(s2, 'b'.repeat(30));
  await sleep(500);
  ok(decoded.length === 1 && decoded[0] === 'a'.repeat(30),
    'one decode per view — second deliverScanResult is swallowed (allowScanning mirror)');

  // decode gated to the scanning state (no decode before permission)
  const early = [];
  const s3 = W.Spixi.createScanView({ state: 'prompt', onDecode: (t) => early.push(t) });
  d.body.append(s3);
  W.Spixi.deliverScanResult(s3, 'c'.repeat(30));
  await sleep(450);
  ok(early.length === 0 && s3.querySelector('.c-scan__success').hidden,
    'deliverScanResult is a no-op outside the scanning state');

  // hazard gates: empty/whitespace + self-prefixed hostile payload never emit
  const bad = [];
  const s4 = W.Spixi.createScanView({ state: 'scanning', onDecode: (t) => bad.push(t) });
  d.body.append(s4);
  W.Spixi.deliverScanResult(s4, '   ');
  W.Spixi.deliverScanResult(s4, 'evil-ixian:qrresult:split-me');
  await sleep(450);
  ok(bad.length === 0 && s4.querySelector('.c-scan__success').hidden,
    'empty and \'ixian:qrresult:\'-embedding payloads are dropped, view keeps scanning (spec §1 hazards)');
  W.Spixi.deliverScanResult(s4, 'd'.repeat(30));
  await sleep(450);
  ok(bad.length === 1, 'a clean payload after a dropped hostile one still decodes (no false latch)');

  // #141-m4: sync throw in onRequestPermission → denied, CTA restored (not wedged)
  const s5 = W.Spixi.createScanView({ onRequestPermission: () => { throw new Error('boom'); } });
  d.body.append(s5);
  const s5cta = s5.querySelector('.c-scan__card .c-button');
  s5cta.click();
  ok(s5.dataset.state === 'denied' && !s5cta.disabled,
    'sync throw in onRequestPermission routes to DENIED, CTA restored (#141-m4)');

  // #141-m4: sync throw in onTorch → optimistic flip reverts
  const s6 = W.Spixi.createScanView({ state: 'scanning', onTorch: () => { throw new Error('boom'); } });
  d.body.append(s6);
  const s6torch = s6.querySelector('.c-scan__torch');
  s6torch.click();
  ok(s6torch.getAttribute('aria-pressed') === 'false',
    'sync throw in onTorch reverts the optimistic flip (#141-m4)');

  // capability gate: no onTorch → no torch affordance at all
  const s7 = W.Spixi.createScanView({ state: 'scanning' });
  d.body.append(s7);
  ok(!s7.querySelector('.c-scan__torch'), 'torch affordance absent without an onTorch callback (capability gate)');

  // cancel → onCancel (→ ixian:back, C# pops + GC.Collect)
  let cancelled = 0;
  const s8 = W.Spixi.createScanView({ onCancel: () => cancelled++ });
  d.body.append(s8);
  s8.querySelector('.c-topbar .c-button').click();
  ok(cancelled === 1, 'topbar back fires onCancel (ixian:back grammar)');
}

{
  /* static guards — scan batch (jsdom is layout-blind; read the source text) */
  const chatsHtml = readFileSync(join(root, 'src/demo/chats.html'), 'utf8');
  const sjs = readFileSync(join(root, 'src/components/scan-shell.js'), 'utf8');
  const scss = readFileSync(join(root, 'src/styles/components/scan-shell.css'), 'utf8');
  const bundleFiles = readFileSync(join(root, 'scripts/build-demo-bundle.mjs'), 'utf8');
  ok(/scan-shell\.css/.test(chatsHtml), 'chats demo links scan-shell.css');
  ok(bundleFiles.indexOf('scan-shell.js') > bundleFiles.indexOf('contacts-shell.js')
    && bundleFiles.indexOf('scan-shell.js') < bundleFiles.indexOf('settings-shell.js'),
    'bundle FILES: scan-shell after contacts-shell, before settings-shell');
  ok(/includes\('ixian:qrresult:'\)/.test(sjs),
    'hostile self-prefixed payload gate present in source (C# Splits on the literal, bridge-audit-B.md:170)');
  ok(/st\.delivered = true/.test(sjs) && /st\.delivered\) return/.test(sjs),
    'one-shot delivered latch present + checked (allowScanning mirror)');
  ok(/sanctioned: fixed-dark camera bed/.test(scss),
    'camera bed fixed-dark is a SANCTIONED raw value (fixed-pair precedent, not a theme token)');
  ok(/--disc-success-bg/.test(scss) && /--disc-success-ink/.test(scss),
    'success flash rides the #147② disc token pair (both-mode safe)');
  ok(/margin-inline: auto/.test(scss) && !/translateX\(-50%\)/.test(scss),
    'torch centering is logical/symmetric (no translateX — #151 RTL-knob class avoided)');
  ok(/aria-pressed/.test(sjs) && /'role', 'status'/.test(sjs),
    'torch uses aria-pressed; the scanning hint is role=status');
}

console.log('chats.html — periodic backup nudge (legacy #backup-prompt parity)');
{
  const dom = await load('chats.html');
  const d = dom.window.document, W = dom.window;
  const phone = d.querySelector('.demo-phone');

  // C#-fired sheet (toggleAnimatedSlider('backup-prompt') → showBackupNudge)
  let backups = 0, dismissed = 0;
  const sheet = W.Spixi.showBackupNudge({
    host: phone,
    onBackup: () => { backups += 1; },
    onDismiss: () => { dismissed += 1; },
  });
  ok(!!sheet && sheet.classList.contains('c-sheet') && phone.contains(sheet),
    'backup nudge opens as a host-mounted c-sheet (#56: legacy slide-up → sheet grammar)');
  const nTitle = sheet.querySelector('.c-backup-nudge__title');
  ok(!!nTitle && /back up/i.test(nTitle.textContent)
    && /decentralized/.test(sheet.querySelector('.c-backup-nudge__body').textContent)
    && /new contact/.test(sheet.querySelector('.c-backup-nudge__note').textContent),
    'nudge carries the legacy en-us copy set (title/desc/note — index-backup-prompt-*)');
  ok(sheet.getAttribute('aria-label') === nTitle.textContent,
    'title-less sheet is aria-labelled by the nudge title');

  const btns = [...sheet.querySelectorAll('.c-button')];
  ok(btns.length === 2, 'exactly two actions: Back up now (fill) + Not now (text)');
  btns[0].click();
  btns[0].click();                               // latch: second tap swallowed
  ok(backups === 1, 'Back up now fires onBackup ONCE (one-shot latch) — host emits ixian:backup, no new verb');
  await sleep(500);                              // overlay removal: transitionend + 400ms fallback
  ok(!phone.contains(sheet), 'CTA also closes the sheet');

  // Not-now path: dismiss only, no onBackup
  let b2 = 0;
  const sheet2 = W.Spixi.showBackupNudge({ host: phone, onBackup: () => { b2 += 1; } });
  const skip2 = [...sheet2.querySelectorAll('.c-button')][1];
  skip2.click();
  await sleep(500);
  ok(b2 === 0, 'Not now dismisses without firing onBackup (quiet skip — legacy parity)');

  // illustration slot: art leads, decorative; img error → disc fallback
  // (file-drop upgrade path — illustrations-plan #6, shared with the launch tail)
  const sheet3 = W.Spixi.showBackupNudge({ host: phone, illustration: 'images/onboarding/backup.svg' });
  const art3 = sheet3.querySelector('.c-backup-nudge__illo');
  const disc3 = sheet3.querySelector('.c-backup-nudge__disc');
  ok(!!art3 && art3.getAttribute('alt') === '' && disc3.hidden,
    'illustration opt renders a decorative img and hides the disc (art leads)');
  art3.dispatchEvent(new W.Event('error'));
  ok(!sheet3.querySelector('.c-backup-nudge__illo') && !disc3.hidden,
    'img error removes the art and reveals the tonal shield disc (never a broken sheet)');
  // no-illustration default keeps the disc (component works art-less)
  const sheet4 = W.Spixi.showBackupNudge({ host: phone });
  ok(!sheet4.querySelector('.c-backup-nudge__illo') && !sheet4.querySelector('.c-backup-nudge__disc').hidden,
    'without illustration the disc leads (default state)');

  // —— rating nudge (legacy #ratingModal → sheet; showRatingPrompt mirror) ——
  const answers = [];
  const rs = W.Spixi.showRatingNudge({ host: phone, onRate: (a) => answers.push(a) });
  ok(!!rs && rs.classList.contains('c-sheet') && phone.contains(rs),
    'rating nudge opens as a host-mounted c-sheet (nudge family)');
  ok(/enjoying Spixi/.test(rs.querySelector('.c-rating-nudge__title').textContent)
    && /feedback/.test(rs.querySelector('.c-rating-nudge__body').textContent),
    'rating carries the legacy en-us copy (rating-request-*)');
  const rbtns = [...rs.querySelectorAll('.c-button')];
  ok(rbtns.length === 2 && /loving it/.test(rbtns[0].textContent) && /Not so much/.test(rbtns[1].textContent),
    'two answers: Yes (fill) leads, Not so much (outline) follows');
  rbtns[0].click();
  rbtns[1].click();                              // ONE latch across both answers
  ok(answers.length === 1 && answers[0] === 'yes',
    'answers share one latch — first tap wins, ixian:rating:<a> emitted once');
  const rs2 = W.Spixi.showRatingNudge({ host: phone, onRate: (a) => answers.push(a) });
  [...rs2.querySelectorAll('.c-button')][1].click();
  ok(answers.length === 2 && answers[1] === 'no',
    'the negative path emits no (host routes it to support email, not the store — legacy deflection kept)');

  // static guards
  const chatsHtml2 = readFileSync(join(root, 'src/demo/chats.html'), 'utf8');
  const bnjs = readFileSync(join(root, 'src/components/backup-nudge.js'), 'utf8');
  const rnjs = readFileSync(join(root, 'src/components/rating-nudge.js'), 'utf8');
  ok(/backup-nudge\.css/.test(chatsHtml2) && /rating-nudge\.css/.test(chatsHtml2),
    'chats demo links both nudge stylesheets');
  ok(!/console\.|localStorage|sessionStorage|setInterval|setTimeout/.test(bnjs),
    'nudge component owns NO timer and no storage — the 30-day cadence stays C#-side (Preferences), no logging');
  ok(!/console\.|localStorage|sessionStorage|setInterval|setTimeout/.test(rnjs),
    'rating nudge owns NO timer/storage either — re-prompt gating stays C#-side (rating_action pref)');
}

console.log('settings.html — lock shell (Phase 1 #4)');
{
  const dom = await load('settings.html');
  const d = dom.window.document, W = dom.window;
  const toolbarBtn = (label) => [...d.querySelectorAll('.demo-toolbar .c-button')]
    .find((b) => b.textContent.includes(label));

  // —— unlock mode: chrome + empty gate ——
  toolbarBtn('Lock now').click();
  const lock = d.querySelector('.demo-lock .c-lock');
  ok(!!lock && lock.dataset.mode === 'unlock' && !lock.querySelector('.c-topbar'),
    'Lock now opens the unlock takeover — no topbar (no back from lock)');
  // #160 round (Damir screenshot): app-level copy · fixed-dark pin · equal buttons
  ok(lock.querySelector('.c-lock__title').textContent === 'Spixi is locked',
    '#160: title is app-level ("Spixi is locked", never "Wallet locked")');
  ok(lock.dataset.theme === 'dark',
    '#160: lock subtree pinned [data-theme=dark] — fixed-dark brand surface both themes');
  const input = lock.querySelector('.c-lock__input');
  const err = lock.querySelector('.c-lock__error');
  const btns = [...lock.querySelectorAll('.c-button')];
  const unlockBtn = btns.find((b) => b.textContent.includes('Unlock'));
  ok(input.type === 'password' && input.autocomplete === 'off',
    'password field is type=password, autocomplete=off (SECURITY §5)');
  // #160b⑦: our show-password eye (native ::-ms-reveal is WebView2-only)
  const reveal = lock.querySelector('.c-lock__reveal');
  reveal.click();
  ok(input.type === 'text' && reveal.getAttribute('aria-pressed') === 'true',
    '#160b⑦: eye reveals the password (type=text, aria-pressed)');
  reveal.click();
  ok(input.type === 'password' && reveal.getAttribute('aria-pressed') === 'false',
    '#160b⑦: second tap re-masks');
  unlockBtn.click();
  ok(!err.hidden, 'empty password blocked inline');
  ok(!!btns.find((b) => b.textContent.includes('fingerprint')),
    'biometric retry present (biometrics-gated; re-emits ixian:onload)');
  ok(unlockBtn.dataset.size === '56'
    && btns.find((b) => b.textContent.includes('fingerprint')).dataset.size === '56',
    '#160: Unlock + fingerprint buttons are the SAME size family (56)');
  const hatch = lock.querySelector('.c-lock__hatch');
  ok(!!hatch && !hatch.hidden, 'unlock mode shows the quiet "Use a different wallet…" link');

  // —— the spec §3 no-callback contract: wrong password → NO ctrl → auto-release ——
  input.value = 'wrong-password';
  input.dispatchEvent(new W.Event('input', { bubbles: true }));
  unlockBtn.click();
  ok(input.disabled, 'submit latches the field (aria-busy window)');
  await sleep(2100);                              // demo mock never calls ctrl on wrong password
  ok(!input.disabled && !unlockBtn.disabled && input.value === 'wrong-password',
    'no-callback contract: silent auto-release after 1600ms, value kept (spec §3)');

  // —— correct password: done → morph, field scrubbed, overlay closes ——
  input.value = 'hunter2';
  input.dispatchEvent(new W.Event('input', { bubbles: true }));
  unlockBtn.click();
  await sleep(700);
  ok(input.value === '', 'success scrubs the password from the field (SECURITY §5)');
  await sleep(900);
  ok(!d.querySelector('.demo-lock'), 'unlock success closes the takeover (mock page replacement)');

  // —— escape hatch: confirm modal → ixian:change ——
  toolbarBtn('Lock now').click();
  const lock2 = d.querySelector('.demo-lock .c-lock');
  lock2.querySelector('.c-lock__hatch').click();
  const hatchModal = d.querySelector('.c-modal');
  ok(!!hatchModal && hatchModal.textContent.includes('different wallet'),
    'escape hatch opens a confirm modal first (Damir pick — deliberateness, C# stays the boundary)');
  const modalBtns = [...hatchModal.querySelectorAll('.c-modal__actions .c-button')];
  modalBtns[modalBtns.length - 1].click();        // Go to setup
  await sleep(500);
  ok(!d.querySelector('.demo-lock'), 'confirming the hatch fires ixian:change and leaves the lock screen');

  // —— confirm-action mode (setJustConfirm) ——
  toolbarBtn('Confirm action').click();
  const conf = d.querySelector('.demo-lock .c-lock');
  ok(conf.dataset.mode === 'confirm', 'Confirm action opens confirm mode');
  ok(conf.querySelector('.c-lock__hatch').hidden, 'confirm mode hides the escape hatch');
  const cancelBtn = [...conf.querySelectorAll('.c-button')].find((b) => b.textContent.trim().includes('Cancel'));
  ok(!!cancelBtn && !cancelBtn.hidden, 'confirm mode shows Cancel (ixian:change → authSucceeded(false))');
  cancelBtn.click();
  ok(!d.querySelector('.demo-lock'), 'Cancel closes the confirm takeover');

  // setLockMode free fn flips the chrome both ways
  const flip = W.Spixi.createLockScreen({ mode: 'unlock', onCancel: () => {} });
  d.body.append(flip);
  W.Spixi.setLockMode(flip, 'confirm');
  ok(flip.dataset.mode === 'confirm' && flip.querySelector('.c-lock__hatch').hidden,
    'setLockMode(el, "confirm") — setJustConfirm mirror hides the hatch');
  W.Spixi.setLockMode(flip, 'unlock');
  ok(flip.dataset.mode === 'unlock' && !flip.querySelector('.c-lock__hatch').hidden,
    'setLockMode flips back to unlock');

  // #141-m4: sync throw in onUnlock → inline error, restored (ctrl.fail path)
  const throwLock = W.Spixi.createLockScreen({ onUnlock: () => { throw new Error('boom'); } });
  d.body.append(throwLock);
  const tIn = throwLock.querySelector('.c-lock__input');
  tIn.value = 'x';
  throwLock.querySelectorAll('.c-button').forEach((b) => { if (b.textContent.includes('Unlock')) b.click(); });
  ok(!throwLock.querySelector('.c-lock__error').hidden && !tIn.disabled,
    'sync throw in onUnlock → inline error, field restored (#141-m4)');

  // —— encpass: hub row → screen, gates, scrub ——
  const secRows = [...d.querySelectorAll('.c-settings .c-settings__body button')];
  const encRow = secRows.find((b) => b.textContent.includes('Change wallet password'));
  ok(!!encRow, 'hub Security & privacy carries the Change wallet password row (ixian:encpass nav)');
  encRow.click();
  const enc = d.querySelector('.c-encpass');
  ok(!!enc, 'row opens the encpass takeover');
  const [cur, next, repeat] = [...enc.querySelectorAll('.c-lock__input')];
  const encErr = enc.querySelector('.c-lock__error');
  const saveBtn = enc.querySelector('.c-encpass__footer .c-button');
  ok(cur.autocomplete === 'off' && next.autocomplete === 'new-password',
    'current=off, new=new-password autocomplete split (SECURITY §5)');
  ok(enc.querySelectorAll('.c-lock__reveal').length === 3,
    '#160b⑦: every encpass field carries its own show-password eye');
  cur.value = 'hunter2'; next.value = 'short'; repeat.value = 'short';
  saveBtn.click();
  ok(!encErr.hidden && encErr.textContent.includes('10'), 'new password under the 10-char floor blocked inline (§6① resolved — BE minimum)');
  next.value = 'longenough1'; repeat.value = 'longenough2';
  saveBtn.click();
  ok(!encErr.hidden && encErr.textContent.includes('match'), 'repeat mismatch blocked inline');
  let encSent = false;
  // component-level for the delimiter gate (the demo mock would accept it)
  const encGate = W.Spixi.createEncPassScreen({ onChangePassword: () => { encSent = true; } });
  d.body.append(encGate);
  const [gc, gn, gr] = [...encGate.querySelectorAll('.c-lock__input')];
  gc.value = 'oldpass-ok'; gn.value = 'has--1ec4ce59e0535704d4--inside'; gr.value = gn.value;
  encGate.querySelector('.c-encpass__footer .c-button').click();
  ok(!encGate.querySelector('.c-lock__error').hidden && encSent === false,
    'a password containing the magic changepass delimiter is NEVER sent (C# Split hazard, spec §2)');
  encGate.remove();   // fixture hygiene (f2Picker precedent) — a stray .c-encpass in <body>
                      // makes the later "!querySelector('.c-encpass')" asserts lie

  // wrong current (demo mock: current must be hunter2) → inline error on the current field
  cur.value = 'not-hunter2'; next.value = 'longenough1'; repeat.value = 'longenough1';
  saveBtn.click();
  await sleep(1100);
  ok(!encErr.hidden && !cur.disabled, 'wrong current password → inline error, fields restored');

  // success: morph → scrub → back to hub (with a REVEALED field: scrub must re-mask)
  cur.value = 'hunter2'; next.value = 'longenough1'; repeat.value = 'longenough1';
  enc.querySelector('.c-lock__reveal').click();   // reveal the current field
  ok(cur.type === 'text', '#160b⑦ setup: current field revealed before submit');
  saveBtn.click();
  await sleep(1100);
  ok(cur.value === '' && next.value === '' && repeat.value === '',
    'success scrubs all three password fields (SECURITY §5)');
  ok(cur.type === 'password',
    '#160b⑦: scrub also RE-MASKS a revealed field (never leaves plaintext mode behind)');
  await sleep(1000);
  ok(!d.querySelector('.c-encpass'), 'success returns to the hub (legacy pop mirror)');

  // back scrubs too
  encRow.click();
  const enc2 = d.querySelector('.c-encpass');
  const enc2in = enc2.querySelector('.c-lock__input');
  enc2in.value = 'sekrit';
  enc2.querySelector('.c-topbar .c-button').click();
  ok(enc2in.value === '' && !d.querySelector('.c-encpass'), 'back scrubs the fields before leaving (SECURITY §5)');

  // pagehide scrub must ACTUALLY fire (audit: was a dead element-level listener —
  // pagehide is a WINDOW event). Dispatch it on the window and confirm the field clears.
  const encPH = W.Spixi.createEncPassScreen({ onBack: () => {} });
  d.body.append(encPH);
  const encPHin = encPH.querySelector('.c-lock__input');
  encPHin.value = 'sekrit';
  W.dispatchEvent(new W.Event('pagehide'));
  ok(encPHin.value === '',
    'window pagehide scrubs the fields (backgrounded WebView — SECURITY §5; real hook, not dead element listener)');
  encPH.remove();

  // #141-m4 on encpass
  const encThrow = W.Spixi.createEncPassScreen({ onChangePassword: () => { throw new Error('boom'); } });
  d.body.append(encThrow);
  const [tc, tn, tr] = [...encThrow.querySelectorAll('.c-lock__input')];
  tc.value = 'oldpass-ok'; tn.value = 'longenough1'; tr.value = 'longenough1';
  encThrow.querySelector('.c-encpass__footer .c-button').click();
  ok(!encThrow.querySelector('.c-lock__error').hidden && !tc.disabled,
    'sync throw in onChangePassword → inline error, fields restored (#141-m4)');
  encThrow.remove(); flip.remove(); throwLock.remove();   // fixture hygiene
}

{
  /* static guards — lock batch (jsdom is layout-blind; read the source text) */
  const setHtml = readFileSync(join(root, 'src/demo/settings.html'), 'utf8');
  const ljs = readFileSync(join(root, 'src/components/lock-shell.js'), 'utf8');
  const lcss = readFileSync(join(root, 'src/styles/components/lock-shell.css'), 'utf8');
  const shellJs = readFileSync(join(root, 'src/components/settings-shell.js'), 'utf8');
  const bundleFiles = readFileSync(join(root, 'scripts/build-demo-bundle.mjs'), 'utf8');
  ok(/lock-shell\.css/.test(setHtml), 'settings demo links lock-shell.css');
  ok(bundleFiles.indexOf('lock-shell.js') > bundleFiles.indexOf('scan-shell.js')
    && bundleFiles.indexOf('lock-shell.js') < bundleFiles.indexOf('settings-shell.js'),
    'bundle FILES: lock-shell after scan-shell, before settings-shell');
  ok(!/console\./.test(ljs), 'lock-shell.js never logs (passwords in scope — SECURITY §5)');
  ok(/--1ec4ce59e0535704d4--/.test(ljs), 'the magic changepass delimiter gate is present (bridge-audit-B.md:128)');
  ok(/window\.addEventListener\('pagehide'/.test(ljs),
    'encpass scrubs on pagehide via the WINDOW (element-level pagehide never fires — audit fix; functionally asserted below)');
  ok(/c-lock__reveal/.test(ljs) && /::-ms-reveal[^}]*display: none/.test(lcss.replace(/\n/g, ' ')),
    '#160b⑦: shell-owned show-password eye + native WebView2 eye suppressed (no double eye)');
  ok(/onChangePassword/.test(shellJs) && /Change wallet password/.test(shellJs),
    'settings hub carries the encpass nav row (presence-gated — ixian:encpass exists)');
  ok(/min-height: 0/.test(lcss) && /flex: none/.test(lcss),
    'encpass body follows the scroll-column rules (#136①, #148③/#150① classes)');
  // #160 round guards
  const tok2 = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8');
  ok(/--gradient-lock:/.test(tok2) && /var\(--gradient-lock\)/.test(lcss),
    '#160: --gradient-lock token defined (code-only, fixed both themes) and consumed by .c-lock');
  ok(/dataset\.theme = 'dark'/.test(ljs),
    '#160: lock screen pins its subtree dark in JS (the #20 override precedent)');
  ok(/openModal\(createModal\(/.test(ljs),
    '#160b: the hatch modal is OPENED, not just created (createModal does not self-mount — Damir smoke-crash class)');
  ok(/c-lock__brand/.test(ljs) && /c-lock__spacer/.test(lcss) && /flex: 1\.2 1 0/.test(lcss),
    '#160b: brand/form/spacer/tail zones present — action cluster rides the lower half');
  ok(/\.demo-lock \{ position: absolute; inset: 0;/.test(setHtml)
    && /env\(safe-area-inset-top\)/.test(lcss),
    '#160b⑧: lock takeover is FULL-BLEED (gradient under the statusbar; safe-area padding for the real page)');
  ok(!/c-lock__logo \{[^}]*border-radius/.test(lcss.replace(/\n/g, ' ')) && /drop-shadow/.test(lcss),
    '#160: logo is a bare glowing glyph — no disc/circle chrome');
}

console.log('launch.html — launch/onboarding shell (Phase 1 #5)');
{
  const dom = await load('launch.html');
  const d = dom.window.document, W = dom.window;

  const shell = d.querySelector('.c-launch');
  ok(!!shell && shell.dataset.view === 'welcome', 'shell mounts on the welcome view');

  // —— premium round 2 (Damir 2026-07-06): the WHOLE launch is ONE continuous
  //    fixed-dark brand surface on --gradient-launch (supersedes #0② welcome-only) ——
  ok(d.querySelector('.c-launch__welcome').dataset.theme === 'dark',
    'brand: welcome subtree pinned dark over --gradient-launch');
  ok(shell.dataset.theme === 'dark'
    && [...d.querySelectorAll('.c-launch__view, .c-launch__tail')].every((v) => !v.dataset.theme),
    'the WHOLE shell is pinned dark on ONE continuous --gradient-launch — form views inherit the pin, none re-pin (welcome→create→restore→retry→tail)');

  // —— welcome carousel: 4 legacy-tour slides · shipped art · dots · keys ——
  const dots = [...d.querySelectorAll('.c-launch__dot')];
  ok(d.querySelectorAll('.c-launch__slide').length === 4 && dots.length === 4,
    'carousel: 4 slides + 4 dots (the SHIPPED legacy tour, step1–4 reused)');
  const arts = [...d.querySelectorAll('.c-launch__illo-img')];
  ok(arts.length === 4 && arts.every((im) => /images\/onboarding\/step[1-4]\.svg$/.test(im.getAttribute('src'))),
    'slides carry the legacy step1–4 art (dark set — welcome is pinned dark)');
  ok(dots[0].getAttribute('aria-selected') === 'true', 'dot 1 selected at rest (roving tabindex)');
  dots[2].click();
  ok(dots[2].getAttribute('aria-selected') === 'true'
    && /translateX\(-200%\)/.test(d.querySelector('.c-launch__track').style.transform),
    'dot click drives the track (and retires autoplay — the user took control)');
  d.querySelector('.c-launch__dots').dispatchEvent(new W.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
  ok(dots[1].getAttribute('aria-selected') === 'true', '←/→ arrows page the carousel');
  ok(d.querySelectorAll('.c-launch__illo[data-placeholder="true"]').length === 1,
    'ONE placeholder slot remains (backup nudge — nano-banana #6 pending)');

  // —— premium pickers: the SETTINGS sheets (one grammar app-wide) ——
  const pill = d.querySelector('.c-launch__pill');
  ok(!!pill && pill.textContent.includes('English'), 'language pill shows the current language');
  pill.click();
  const langSheet = d.querySelector('.c-settings__opts');
  ok(!!langSheet && langSheet.querySelectorAll('.c-settings__opt').length >= 10
    && !!langSheet.querySelector('.c-settings__opt-flag'),
    'language pill opens the settings option sheet (#148⑥ — flags leading, long list scrolls)');
  W.Spixi.dismissTopOverlay();
  await sleep(400);
  d.querySelector('.c-launch__pill--icon').click();
  ok(d.querySelectorAll('.c-settings__theme').length === 3,
    'appearance opens the #147 theme sheet — visual preview tiles, not a cheap inline segment');
  W.Spixi.dismissTopOverlay();
  await sleep(400);

  // —— welcome is a clean brand CHOICE; consent moved to the commit forms
  //    (Damir 2026-07-06) ——
  const ctas = [...d.querySelectorAll('.c-launch__ctas .c-button')];
  ok(ctas.length === 2 && ctas.every((b) => !b.disabled),
    'welcome shows two enabled path choices (Create new / Restore existing)');
  ok(!d.querySelector('.c-launch__welcome .c-launch__fineprint') && !d.querySelector('.c-launch__terms-box'),
    'welcome carries NO consent line or checkbox — consent lives on the create/restore forms');

  // —— create: inline gates (launch-spec §2.2 — incl. BOTH C# parse hazards) ——
  ctas[0].click();
  ok(shell.dataset.view === 'create', 'Create CTA routes internally (the shell absorbs the legacy page)');
  const create = d.querySelector('[data-launch-view="create"]');
  const nick = create.querySelector('.c-launch__input');
  const [cpw, crp] = [...create.querySelectorAll('.c-lock__input')];
  const cerr = create.querySelector('.c-lock__error');
  const cbtn = create.querySelector('.c-launch__footer .c-button');
  // consent moved onto the commit form, above the button (Damir 2026-07-06)
  const cconsent = create.querySelector('.c-launch__footer .c-launch__fineprint');
  ok(!!cconsent && /Terms of Use/.test(cconsent.textContent) && /Privacy Policy/.test(cconsent.textContent)
    && /creating an account/i.test(cconsent.textContent),
    'create form carries the consent line (Terms + Privacy) directly above the commit button');
  ok(cbtn.textContent.includes('Create my account'),
    'commit CTA reads "Create my account" — distinct from the welcome "Create new account"');
  cconsent.querySelector('.c-launch__link').click();
  ok(!!d.querySelector('.c-launch__terms-body'), 'the consent Terms link opens the in-app terms sheet');
  W.Spixi.dismissTopOverlay();
  await sleep(400);
  cbtn.click();
  ok(!cerr.hidden, 'empty nickname blocks create');
  nick.value = 'Da:mir'; cbtn.click();
  ok(!cerr.hidden && cerr.textContent.includes(':'),
    'nick containing ":" never sent (C# splits create:<nick>:<password> on the FIRST colon)');
  nick.value = 'Damir'; cpw.value = 'short'; crp.value = 'short'; cbtn.click();
  ok(!cerr.hidden, 'short password blocked (ENC_MIN — ONE truth shared with encpass)');
  cpw.value = 'longenough1'; crp.value = 'different1'; cbtn.click();
  ok(!cerr.hidden, 'repeat mismatch blocked');
  cpw.value = 'xxDamir:yy'; crp.value = 'xxDamir:yy'; cbtn.click();
  ok(!cerr.hidden,
    'password containing "<nick>:" never sent (C# Replace corruption hazard, launch-spec §1)');

  // —— functional pagehide scrub + re-mask (the #162 grammar, launch-wide) ——
  cpw.value = 'sekrit'; crp.value = 'sekrit2';
  create.querySelector('.c-lock__reveal').click();
  ok(cpw.type === 'text', 'setup: create password revealed before the scrub');
  W.dispatchEvent(new W.Event('pagehide'));
  ok(cpw.value === '' && crp.value === '' && cpw.type === 'password',
    'window pagehide scrubs + RE-MASKS the create fields (SECURITY §5)');

  // —— create done() → scrub + tail; tail: backup nudge → join step ——
  nick.value = 'Damir'; cpw.value = 'hunter2hunter2'; crp.value = 'hunter2hunter2';
  cbtn.click();
  await sleep(2800);                             // demo bridge 1600ms + 900ms morph beat
  ok(shell.dataset.view === 'tail' && cpw.value === '' && crp.value === '',
    'create done() scrubs and advances to the onboarding tail');
  const tail = d.querySelector('.c-launch__tail');
  ok(tail.dataset.step === 'backup' && tail.textContent.includes('One file protects everything'),
    'tail opens on the backup nudge (backup-ux-spec §3.3/§7 copy)');
  const backupBtns = [...tail.querySelectorAll('.c-launch__tail-step')[0].querySelectorAll('.c-button')];
  backupBtns[1].click();                         // Later — quiet, allowed
  ok(tail.dataset.step === 'join', '"Later" is a quiet allowed path → join step');

  // —— restore: file gate · inline fail (showPasswordError path) ——
  W.Spixi.setLaunchView(shell, 'restore');
  const restore = d.querySelector('[data-launch-view="restore"]');
  const rbtn = restore.querySelector('.c-launch__footer .c-button');
  const rerr = restore.querySelector('.c-lock__error');
  const rpw = restore.querySelector('.c-lock__input');
  rbtn.click();
  ok(!rerr.hidden, 'restore blocked until a backup file is picked');
  restore.querySelector('.c-launch__card .c-button').click();   // Choose backup file…
  await sleep(600);                              // demo picker resolves at 400ms
  ok(!restore.querySelector('.c-launch__file').hidden
    && restore.querySelector('.c-launch__file-name').textContent.includes('spixi-backup'),
    'setUploadedFileName renders the picked file (+ check glyph)');
  rpw.value = 'wrongpass'; rbtn.click();
  await sleep(1100);
  ok(!rerr.hidden && !rpw.disabled,
    'wrong restore password → INLINE error, fields restored (showPasswordError → ctrl.fail(msg), spec §2.3)');

  // —— retry: the native-alert contract → SILENT restore, value kept ——
  W.Spixi.setLaunchView(shell, 'retry');
  const retry = d.querySelector('[data-launch-view="retry"]');
  const tpw = retry.querySelector('.c-lock__input');
  const terr = retry.querySelector('.c-lock__error');
  tpw.value = 'wrongpass';
  retry.querySelector('.c-launch__footer .c-button').click();
  await sleep(1100);
  ok(terr.hidden && !tpw.disabled && tpw.value === 'wrongpass',
    'retry wrong password: SILENT restore, value kept (removeLoadingOverlay → ctrl.fail(\'\'), spec §2.4)');

  // —— direct API: entry routing · finish latch · self-cleaning listener ——
  const entry = W.Spixi.createLaunchShell({ view: 'retry' });
  ok(entry.dataset.view === 'retry', 'entry-point routing: view:"retry" (LaunchRetryPage repoint mirror)');
  let joins = 0, finishes = 0;
  const api = W.Spixi.createLaunchShell({
    view: 'tail',
    onJoinBot: () => { joins += 1; },
    onFinish: () => { finishes += 1; },
  });
  d.body.append(api);
  const apiSteps = [...api.querySelectorAll('.c-launch__tail-step')];
  apiSteps[0].querySelectorAll('.c-button')[0].click();   // Back up now
  ok(api.querySelector('.c-launch__tail').dataset.step === 'join',
    '"Back up now" advances too (onboarding continues after the Backup screen returns)');
  const jb = [...apiSteps[1].querySelectorAll('.c-button')];
  jb[0].click(); jb[1].click(); jb[0].click();
  ok(joins === 1 && finishes === 1, 'finish is latched: joinbot fires once, finish once');
  const apiPw = api.querySelector('[data-launch-view="create"] .c-lock__input');
  api.remove();
  apiPw.value = 'ghost';
  W.dispatchEvent(new W.Event('pagehide'));
  ok(apiPw.value === 'ghost',
    'the pagehide listener self-cleans once the shell leaves the DOM (no ghost scrubbing — leak guard)');

  // —— consent fires at the BINDING action (create commit), not the welcome tap,
  //    and is latched to ONE ixian:accept (Damir 2026-07-06) ——
  let accepts = 0;
  const cShell = W.Spixi.createLaunchShell({
    view: 'create', termsRequired: true,
    onAcceptTerms: () => { accepts += 1; },
    onCreateAccount: (n, p, ctrl) => ctrl.done(),
  });
  d.body.append(cShell);
  const cf = cShell.querySelector('[data-launch-view="create"]');
  cf.querySelector('.c-launch__input').value = 'Zed';
  [...cf.querySelectorAll('.c-lock__input')].forEach((i) => { i.value = 'longenough1'; });
  const cfBtn = cf.querySelector('.c-launch__footer .c-button');
  cfBtn.click(); cfBtn.click();
  ok(accepts === 1, 'ixian:accept fires ONCE on the create commit (consent at the binding action, latched)');
  cShell.remove();

  // —— [L2, Damir 2026-07-06]: the UNLOCK screen scrubs on pagehide too ——
  const lockEl = W.Spixi.createLockScreen({ onUnlock: () => {} });
  d.body.append(lockEl);
  const lockIn = lockEl.querySelector('.c-lock__input');
  lockIn.value = 'sekrit';
  lockEl.querySelector('.c-lock__reveal').click();
  W.dispatchEvent(new W.Event('pagehide'));
  ok(lockIn.value === '' && lockIn.type === 'password',
    '[L2] backgrounded unlock screen scrubs + re-masks (lock-spec §5 widened per launch-spec #0④)');
  lockEl.remove(); entry.remove();
}

{
  /* static guards — launch batch (jsdom is layout-blind; read the source text) */
  const ljs = readFileSync(join(root, 'src/components/launch-shell.js'), 'utf8');
  const lcss = readFileSync(join(root, 'src/styles/components/launch-shell.css'), 'utf8');
  const lhtml = readFileSync(join(root, 'src/demo/launch.html'), 'utf8');
  const lockjs2 = readFileSync(join(root, 'src/components/lock-shell.js'), 'utf8');
  const bundleList = readFileSync(join(root, 'scripts/build-demo-bundle.mjs'), 'utf8');
  ok(!/console\./.test(ljs), 'launch-shell.js never logs (passwords in scope — SECURITY §5)');
  ok(/from '\.\/lock-shell\.js'/.test(ljs)
    && bundleList.indexOf('launch-shell.js') > bundleList.indexOf('lock-shell.js'),
    'launch-shell imports passwordField/ENC_MIN from lock-shell and bundles AFTER it (one field grammar)');
  ok(/lock-shell\.css/.test(lhtml) && /launch-shell\.css/.test(lhtml),
    'launch demo links lock-shell.css (c-lock__field styles) + launch-shell.css');
  ok(/var\(--gradient-launch\)/.test(lcss) && /env\(safe-area-inset-top\)/.test(lcss)
    && /--gradient-launch:/.test(readFileSync(join(root, 'src/styles/tokens.css'), 'utf8')),
    'premium round: welcome rides the NEW --gradient-launch (tokens.css dials; the lock keeps its own recipe)');
  ok(/settingsOptionSheet/.test(ljs) && /settingsThemeSheet/.test(ljs)
    && /from '\.\/settings-shell\.js'/.test(ljs),
    'language/theme pickers REUSE the settings sheets — one picker grammar app-wide');
  for (const n of [1, 2, 3, 4]) {
    ok(readFileSync(join(root, 'src/demo/images/onboarding/step' + n + '.svg'), 'utf8').includes('<svg'),
      'legacy tour art step' + n + '.svg lives in the demo pipeline');
  }
  ok(/touch-action: pan-y/.test(lcss), 'carousel owns horizontal swipe only — vertical scroll stays native');
  ok(/isConnected/.test(ljs) && /isConnected/.test(lockjs2),
    'both window-pagehide listeners are self-cleaning (launch shell + [L2] lock screen)');
  ok((ljs.match(/\.trim\(\)/g) || []).length === 2 && /nick\.value\.trim\(\)/.test(ljs),
    'the ONLY trims are the nickname (display name) — passwords are NEVER trimmed');
  ok(/data-placeholder/.test(ljs) && /aria-hidden/.test(ljs),
    'illustration slots: placeholder-marked + decorative (copy carries the meaning)');
}

console.log('desktop.html — split-view shells (Phase 2 batch, docs/desktop-split-spec.md)');
{
  const dom = await load('desktop.html');
  const d = dom.window.document, W = dom.window;
  const frame = d.getElementById('frame');
  const esc = () => d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  const shell = (pane, id) => d.querySelector('#' + pane + ' > .dt-shell[data-shell="' + id + '"]');
  const bothVisible = (id) => !shell('pane-list', id).hidden && !shell('pane-detail', id).hidden;
  const railBtns = [...d.querySelectorAll('.dt-rail .c-bottomnav__item')];
  const rail = (label) => railBtns.find((b) => b.textContent.includes(label)).click();
  // overlays mount on the FRAME host — scrim + overlay land as DIRECT frame children (#56)
  const frameScrims = () => [...frame.children].filter((c) => c.classList.contains('c-scrim'));
  const frameSheets = () => [...frame.children].filter((c) => c.classList.contains('c-sheet'));

  // —— boot: chats owns both panes, the other three are parked ——
  ok(bothVisible('chats') && !bothVisible('apps') && !bothVisible('wallet') && !bothVisible('account'),
    'boot: chats shell owns both panes; apps/wallet/account parked');
  for (const id of ['apps', 'wallet', 'account']) {
    ok(!shell('pane-detail', id).querySelector('.dt-empty'),
      id + ' detail pane builds LAZILY (no empty state before first rail visit)');
  }

  // —— Damir 2026-07-06 ②: call icon is a 1:1 surface — group/bot omit it ——
  const chatRows = [...d.querySelectorAll('#rows .c-chatlist-item')];
  const openRow = (name) => chatRows.find((r) => r.textContent.includes(name)).click();
  openRow('Han Solo');
  ok(!!d.querySelector('#chat-topbar [aria-label="Call"]'), '1:1 chat topbar carries the Call action');
  ok(!d.querySelector('#chat-topbar [aria-label="Channels"]'), '1:1 chat has no channels trigger');
  openRow('Falcon Crew');
  ok(!d.querySelector('#chat-topbar [aria-label="Call"]'), 'group chat topbar OMITS the Call action (Damir ②)');
  openRow('Ixian News');
  ok(!d.querySelector('#chat-topbar [aria-label="Call"]'), 'bot chat topbar OMITS the Call action (Damir ②)');
  ok(!!d.querySelector('#chat-topbar [aria-label="Channels"]'), 'bot topbar carries the chevron channels trigger (06c ⑦)');

  // —— Damir 2026-07-06 ④: bot channel selector anchors BELOW the topbar ——
  d.querySelector('#chat-topbar .c-topbar__identity-wrap').click();
  await sleep(50);
  const chSheet = frameSheets()[0];
  ok(!!chSheet && chSheet.querySelector('.c-channels') !== null, 'topbar identity opens the channel selector');
  ok(chSheet.dataset.dtAnchor !== undefined && chSheet.style.top !== '' && chSheet.style.left !== '',
    'channel selector is topbar-ANCHORED on desktop (data-dt-anchor + inline rect), not a bottom sheet (Damir ④)');
  ok(frameScrims().length === 1, 'channel selector scrim mounts on the frame (one stack)');
  esc();
  await sleep(500);
  ok(frameSheets().length === 0, 'Esc dismisses the channel selector');

  // —— Damir 2026-07-06 ①: ⋮ toggles the chat-info RIGHT PANEL ——
  const infoPanel = d.getElementById('chat-info-panel');
  ok(infoPanel.hidden, 'chat-info panel starts closed');
  d.querySelector('#chat-topbar [aria-label="Chat info"]').click();
  ok(!infoPanel.hidden && !!infoPanel.querySelector('.c-chat-info[data-kind="bot"]'),
    '⋮ opens chat info in the RIGHT PANEL (bot kind for Ixian News, Damir ①)');
  ok(d.querySelector('#chat-topbar [aria-label="Chat info"]').getAttribute('aria-expanded') === 'true'
    && d.querySelector('#chat-topbar [aria-label="Chat info"]').getAttribute('aria-controls') === infoPanel.id,
    '[A1] the ⓘ toggle exposes aria-expanded=true + aria-controls when the panel is open');
  ok(!!infoPanel.querySelector('.c-chat-info__members'),
    'bot info lists MEMBERS — legacy channel-bar people-icon parity (06d, flagged chat-info gate)');
  ok(infoPanel.querySelector('.c-chat-info__members').textContent.includes('12400'),
    'bot members header carries the true channel count, not the page size');
  d.querySelector('#chat-topbar [aria-label="Chat info"]').click();
  ok(infoPanel.hidden, '⋮ toggles the panel closed');
  ok(d.querySelector('#chat-topbar [aria-label="Chat info"]').getAttribute('aria-expanded') === 'false',
    '[A1] the ⓘ toggle reflects aria-expanded=false when the panel is closed');
  d.querySelector('#chat-topbar [aria-label="Chat info"]').click();
  openRow('Han Solo');
  ok(infoPanel.hidden, 'switching chats closes the info panel (it follows the conversation)');
  d.querySelector('#chat-topbar [aria-label="Chat info"]').click();
  ok(!!infoPanel.querySelector('.c-chat-info[data-kind="contact"]'), '1:1 info renders contact kind');
  infoPanel.querySelector('[aria-label="Back"]').click();
  ok(infoPanel.hidden, 'the panel topbar back closes it');

  // —— 06c ⑧: group info = full member list + admin controls + notifications ——
  openRow('Falcon Crew');
  d.querySelector('#chat-topbar [aria-label="Chat info"]').click();
  ok(infoPanel.querySelectorAll('.c-chat-info__member-list .c-chat-info__member').length >= 4,
    'group info renders the member ROWS (6-member crew; admin kick/ban rides capabilities.admin)');
  ok(!!infoPanel.querySelector('[role="switch"]'), 'group info carries the notifications toggle (capabilities-gated)');
  d.querySelector('#chat-topbar [aria-label="Chat info"]').click();

  // —— 06c ⑩/⑰: right-click = ANCHORED dropdown + source-row highlight ——
  const crewRow = chatRows.find((r) => r.textContent.includes('Falcon Crew'));
  crewRow.dispatchEvent(new W.MouseEvent('contextmenu', { clientX: 200, clientY: 300, bubbles: true, cancelable: true }));
  await sleep(80);
  const rowMenu = frameSheets()[0];
  ok(!!rowMenu && !!rowMenu.querySelector('.c-msgmenu') && rowMenu.dataset.dtAnchor === 'menu',
    'right-click on a chat ROW opens the anchored row menu (⑰)');
  ok(crewRow.dataset.dtCtxSource !== undefined, 'the source row highlights while its menu is open');
  ok([...rowMenu.querySelectorAll('.c-msgmenu__item')].some((b) => b.textContent.includes('Pin'))
    && [...rowMenu.querySelectorAll('.c-msgmenu__item')].some((b) => b.textContent.includes('Delete chat')),
    'row menu carries the pin/delete set');
  esc();
  await sleep(500);
  ok(crewRow.dataset.dtCtxSource === undefined, 'dismissing the menu clears the highlight');
  openRow('Han Solo');
  const bubbleRow = d.querySelector('#messages .c-bubble-row');
  // the component listens on the INNER bubble (attachMessageMenu target) — a
  // real pointer hits it; dispatching on the row wrapper missed the listener
  const bubbleEl = bubbleRow.querySelector('.c-bubble, .c-tcard, .c-fbubble, .c-mbubble') || bubbleRow;
  bubbleEl.dispatchEvent(new W.MouseEvent('contextmenu', { clientX: 500, clientY: 300, bubbles: true, cancelable: true }));
  await sleep(80);
  const bubbleMenu = frameSheets()[0];
  ok(!!bubbleMenu && bubbleMenu.dataset.dtAnchor === 'menu' && bubbleRow.dataset.dtCtxSource !== undefined,
    'right-click on a BUBBLE opens the anchored message menu + highlights the bubble (⑩)');
  esc();
  await sleep(500);
  ok(bubbleRow.dataset.dtCtxSource === undefined, 'bubble highlight clears on dismiss');

  // —— 06d ①: the attach/share grid rises as a POPOVER from the composer ⊕ ——
  d.querySelector('#composer-slot .c-composer__attach').click();
  await sleep(80);
  const attachPop = frameSheets()[0];
  ok(!!attachPop && !!attachPop.querySelector('.c-attach') && attachPop.dataset.dtAnchor === 'up'
    && attachPop.style.bottom !== '' && attachPop.style.top === 'auto',
    'attach grid opens as a composer-anchored popover, not a dialog (06d ①)');
  esc();
  await sleep(500);

  // —— 06d ④: incoming call rings as a centered dialog card ——
  [...d.querySelectorAll('.demo-toolbar .c-button')].find((b) => b.textContent.includes('Incoming call')).click();
  await sleep(80);
  const callin = d.querySelector('.c-callin');
  ok(!!callin && callin.parentElement === frame, 'incoming call mounts on the frame (dialog presentation is CSS)');
  callin.querySelector('[data-kind="decline"]').click();
  await sleep(500);
  ok(!d.querySelector('.c-callin'), 'Decline settles the ring');

  // —— settings: master-detail (#0 ① / spec §2.1) ——
  rail('Account');
  ok(bothVisible('account') && !bothVisible('chats'), 'rail → Account swaps BOTH panes');
  ok(!!shell('pane-list', 'account').querySelector('.c-settings'), 'hub renders in the list pane');
  ok(!!shell('pane-detail', 'account').querySelector('.dt-empty'), 'settings detail defaults to the EMPTY state (flag ②)');
  const hubRow = (label) => [...shell('pane-list', 'account').querySelectorAll('.c-settings__row')]
    .find((r) => r.textContent.includes(label));
  hubRow('Backup').click();
  ok(!!shell('pane-detail', 'account').querySelector('.c-settings-backup'),
    'hub Backup row renders the backup screen in the DETAIL pane');
  ok(hubRow('Backup').getAttribute('aria-current') === 'page', 'picked hub row carries aria-current (tint #33)');
  hubRow('Downloads').click();
  ok(!!shell('pane-detail', 'account').querySelector('.c-settings-dl'), 'hub Downloads row swaps the detail pane');
  ok(hubRow('Downloads').getAttribute('aria-current') === 'page' && !hubRow('Backup').getAttribute('aria-current'),
    'aria-current MOVES with the pick');
  shell('pane-detail', 'account').querySelector('[aria-label="Back"]').click();
  ok(!!shell('pane-detail', 'account').querySelector('.dt-empty'),
    'screen topbar back returns to the EMPTY state, not ixian:back (spec §2.1)');
  ok(!shell('pane-list', 'account').querySelector('.c-settings__row[aria-current]'),
    'back also clears the selected-row tint');

  // —— 06c ⑫: App lock hidden on desktop (a C#-less PIN is not a real lock) ——
  ok(![...shell('pane-list', 'account').querySelectorAll('.c-settings__row')].some((r) => r.textContent.includes('App lock')),
    'App lock row is HIDDEN on desktop until the C# LockPage lands (06c ⑫)');

  // —— 06c ⑪: theme = PREVIEW TILES in the detail pane, commit live ——
  hubRow('Theme').click();
  ok(!!shell('pane-detail', 'account').querySelector('.c-settings__themes'),
    'Theme row renders the preview tiles in the DETAIL pane, not a sheet (06c ⑪)');
  ok(frameSheets().length === 0, 'no theme sheet ever hits the frame stack');
  [...shell('pane-detail', 'account').querySelectorAll('.c-settings__theme')]
    .find((t) => t.dataset.mode === 'light').click();
  await sleep(700);
  ok(d.documentElement.dataset.theme === 'light', 'picking Light commits live (tiles stay — #148②)');
  ok(hubRow('Theme').querySelector('.c-settings__row-value').textContent === 'Light',
    'the hub row value follows the pane pick');
  shell('pane-detail', 'account').querySelector('[aria-label="Back"]').click();

  // —— 06d ③: language = checked options in the pane, pick re-arms ——
  hubRow('Language').click();
  ok(!!shell('pane-detail', 'account').querySelector('.c-settings__opts'),
    'Language renders as CHECKED OPTIONS in the detail pane, not a sheet (06d ③)');
  [...shell('pane-detail', 'account').querySelectorAll('.c-settings__opt')]
    .find((o) => o.textContent.includes('Español')).click();
  await sleep(900);
  ok(hubRow('Language').querySelector('.c-settings__row-value').textContent === 'Español',
    'the hub row value follows the language pick');
  ok([...shell('pane-detail', 'account').querySelectorAll('.c-settings__opt')]
    .find((o) => o.textContent.includes('Español')).getAttribute('aria-checked') === 'true',
    'the check mark moves — the pane rebuilds with the new current');
  shell('pane-detail', 'account').querySelector('[aria-label="Back"]').click();

  // —— 06c ⑯: a picked avatar lands in the rail Account item ——
  shell('pane-list', 'account').querySelector('.c-settings__avatar').click();
  await sleep(80);
  [...frameSheets()[0].querySelectorAll('.c-settings__avatar-option')][0].click();
  await sleep(1400);
  ok(!!d.querySelector('.dt-rail .c-bottomnav__item[data-id="account"] .c-bottomnav__avatar'),
    'a set avatar replaces the Account rail glyph (06c ⑯)');

  // —— wallet: hero+list left, detail INLINE right (#0 ② / spec §2.2) ——
  rail('Wallet');
  ok(bothVisible('wallet'), 'rail → Wallet swaps both panes');
  ok(!!shell('pane-list', 'wallet').querySelector('.dt-wallet-hero .c-wallet-hero'),
    'compact hero sits atop the list pane (demo wrapper class — component CSS untouched)');
  ok(!!shell('pane-detail', 'wallet').querySelector('.dt-empty'), 'wallet detail defaults to the empty state');
  const txRow = shell('pane-list', 'wallet').querySelector('.c-txlist-item[data-txid]');
  txRow.click();
  await sleep(600); // the lifted builder dismisses its ghost stack entry (400ms fallback)
  ok(!!shell('pane-detail', 'wallet').querySelector('.c-txsheet'),
    'tx row click renders the detail INLINE in the pane (openTxSheet builder, pane host)');
  ok(frameSheets().length === 0 && frameScrims().length === 0,
    'NO sheet/scrim on the frame overlay stack for the inline tx detail (spec §5)');
  ok(txRow.getAttribute('aria-current') === 'true', 'picked tx row carries aria-current');
  const heroQa = [...shell('pane-list', 'wallet').querySelectorAll('.c-wallet-hero__qa')];
  heroQa.find((b) => b.textContent.includes('Send')).click();
  ok(!!shell('pane-detail', 'wallet').querySelector('.c-wallet-send'), 'hero Send routes the DETAIL pane');
  heroQa.find((b) => b.textContent.includes('Receive')).click();
  ok(!!shell('pane-detail', 'wallet').querySelector('.c-wallet-receive'), 'hero Receive routes the DETAIL pane');
  shell('pane-detail', 'wallet').querySelector('[aria-label="Back"]').click();
  ok(!!shell('pane-detail', 'wallet').querySelector('.dt-empty'), 'wallet detail back → empty state');

  // —— apps: list left (forced list layout), details/add/Discover right (#0 ③ / §2.3) ——
  rail('Apps');
  ok(bothVisible('apps'), 'rail → Apps swaps both panes');
  const appsList = shell('pane-list', 'apps').querySelector('.c-apps-list');
  ok(appsList.dataset.layout === 'list', 'pane list is FORCED layout:list');
  ok(!!shell('pane-detail', 'apps').querySelector('.dt-empty'), 'apps detail defaults to the empty state');
  // 06c ④: desktop rows carry an INFO button (⋮ retired) → details directly
  const infoBtn = shell('pane-list', 'apps').querySelector('.c-app-item__menu[data-dt-info]');
  ok(!!infoBtn && !shell('pane-list', 'apps').querySelector('.c-app-item__menu:not([data-dt-info])'),
    'EVERY app row swaps the ⋮ overflow for the info button (06c ④)');
  infoBtn.click();
  ok(!!shell('pane-detail', 'apps').querySelector('.c-app-details') && frameSheets().length === 0,
    'info button opens details in the DETAIL pane — no menu sheet');
  ok(!!shell('pane-list', 'apps').querySelector('.c-app-item[aria-current]'),
    'detailed app row carries aria-current');
  shell('pane-list', 'apps').querySelector('[aria-label="Add mini app"]').click();
  ok(!!shell('pane-detail', 'apps').querySelector('.c-apps-add'), 'pane ＋ routes add-app to the detail pane');
  shell('pane-list', 'apps').querySelector('.c-apps-explore').click();
  ok(!!shell('pane-detail', 'apps').querySelector('.c-apps-discover'),
    'Explore banner routes Discover to the detail pane (grid allowed there — flag ④)');

  // —— §4: the periodic backup nudge mounts on the FRAME host on desktop too ——
  [...d.querySelectorAll('.demo-toolbar .c-button')].find((b) => b.textContent.includes('Backup nudge')).click();
  await sleep(50);
  ok(frameSheets().length === 1 && !!frameSheets()[0].querySelector('.c-backup-nudge')
    && frameScrims().length === 1,
    'backup nudge = same showBackupNudge on the frame host (backup-ux-spec §4.1)');
  [...frameSheets()[0].querySelectorAll('.c-button')][1].click();   // Not now — quiet skip
  await sleep(500);
  ok(frameSheets().length === 0, 'nudge "Not now" closes it (C# owns the re-prompt cadence)');

  // —— §6a: incoming contact request in the LIST pane → staged handshake ——
  // (desktop-split-spec §6a; reuses the frozen c-contact-request + #109 handshake)
  rail('Chats');
  const reqRow = d.querySelector('#rows .c-contact-request');
  ok(!!reqRow, '§6a: incoming contact request renders in the LIST pane');
  ok(!!reqRow && !!reqRow.querySelector('[data-accept]') && !!reqRow.querySelector('[data-decline]'),
    '§6a: request row carries Accept + Decline (frozen c-contact-request)');
  ok(!!reqRow && !reqRow.classList.contains('c-chatlist-item'),
    '§6a: a pending request is NOT a chat row — unselectable into the detail pane');
  const reqTopbar = d.querySelector('#chat-topbar').textContent;
  reqRow.querySelector('[data-accept]').click();
  await sleep(1100);
  const hsRow = d.querySelector('#rows .c-chatlist-item[data-handshaking]');
  ok(!!hsRow && hsRow.getAttribute('aria-busy') === 'true',
    '§6a: Accept → handshaking chat row (aria-busy, #109 staged handshake)');
  ok(!d.querySelector('#rows .c-contact-request'), '§6a: Accept consumes the request row');
  if (hsRow) hsRow.click();
  ok(d.querySelector('#chat-topbar').textContent === reqTopbar,
    '§6a GUARANTEE: clicking a handshaking row opens NO conversation (no stranger chat pre-handshake)');
  await sleep(2800);
  const secured = [...d.querySelectorAll('#rows .c-chatlist-item')].find((r) => r.textContent.includes('Leia'));
  ok(!!secured && !secured.hasAttribute('data-handshaking') && secured.getAttribute('aria-busy') !== 'true',
    '§6a: handshake-complete clears the row to a normal openable chat');
  if (secured) secured.click();
  ok(d.querySelector('#chat-topbar').textContent.includes('Leia'),
    '§6a: the secured contact NOW opens in the detail pane');

  // —— divider drag + dblclick reset still work with EVERY shell mounted ——
  const divider = d.getElementById('divider');
  const paneList = d.getElementById('pane-list');
  divider.setPointerCapture = () => {};   // jsdom shim — capture is a browser affordance
  divider.dispatchEvent(new W.MouseEvent('pointerdown', { clientX: 360, bubbles: true }));
  divider.dispatchEvent(new W.MouseEvent('pointermove', { clientX: 460, bubbles: true }));
  divider.dispatchEvent(new W.MouseEvent('pointerup', { bubbles: true }));
  ok(/px$/.test(paneList.style.width) && paneList.style.width !== '360px',
    'divider drag resizes the list pane with all four shells mounted');
  divider.dispatchEvent(new W.MouseEvent('dblclick', { bubbles: true }));
  ok(paneList.style.width === '360px', 'divider double-click resets to 360px');

  // —— chats survive the round trip ——
  rail('Chats');
  ok(bothVisible('chats') && !bothVisible('apps'), 'rail → Chats restores the original shell');
}

{
  /* static guards — desktop batch (jsdom is layout/style-blind; read the source).
     ① conservative baseline #4: component CSS gains NO container queries and NO
     ≥700px viewport rules — desktop is COMPOSITION in the demo layer only. */
  const cssDir = join(root, 'src/styles/components');
  let containers = 0, wide = 0;
  for (const f of readdirSync(cssDir)) {
    if (!f.endsWith('.css')) continue;
    const css = readFileSync(join(cssDir, f), 'utf8');
    if (/@container/.test(css)) { containers += 1; failures.push('component CSS gained @container: ' + f); }
    for (const m of css.matchAll(/@media[^{]*?\b(?:min|max)-width:\s*(\d+)px/g)) {
      if (+m[1] >= 700) { wide += 1; failures.push('component CSS gained a ≥700px query: ' + f + ' (' + m[0] + ')'); }
    }
  }
  ok(containers === 0, 'no component CSS uses container queries (#4 conservative baseline)');
  ok(wide === 0, 'no component CSS gained ≥700px viewport rules (desktop = demo composition only)');

  /* ② the desktop demo links every stylesheet it renders (the chat.html chip.css lesson) */
  const dt = readFileSync(join(root, 'src/demo/desktop.html'), 'utf8');
  for (const css of ['settings-shell.css', 'settings-backup.css', 'settings-screens.css', 'settings-app.css',
    'lock-shell.css', 'txlist-item.css', 'wallet-hero.css', 'wallet-shell.css', 'wallet-send.css',
    'wallet-receive.css', 'apps-item.css', 'apps-shell.css', 'apps-header.css', 'apps-add.css',
    'apps-details.css', 'apps-discover.css', 'backup-nudge.css', 'chat-info.css', 'contact-request.css']) {
    ok(dt.includes('components/' + css), 'desktop demo links ' + css);
  }

  /* ③ Damir ③: sheets PRESENT as centered dialogs inside the frame — demo CSS,
     scoped to .dt-frame, component overlay.css untouched */
  ok(/\.dt-frame \.c-sheet \{[^}]*left: 50%/.test(dt) && /\.dt-frame \.c-sheet \.c-sheet__handle \{ display: none/.test(dt),
    'desktop presents sheets as centered dialogs (scoped demo CSS; #56 grammar untouched)');
  const overlayCss = readFileSync(join(root, 'src/styles/components/overlay.css'), 'utf8');
  ok(!/dt-frame/.test(overlayCss), 'overlay.css carries NO desktop rules (presentation stayed in the demo layer)');

  /* ④ the tx-detail lift keeps the sheet builder as the ONE source (no forked markup) */
  ok(/openTxSheet\(\{ tx, host: ghost/.test(dt) && /closeSheet\(sheet\)/.test(dt),
    'inline tx detail lifts the openTxSheet builder (ghost host + immediate dismiss), no duplicated tx markup');

  /* ⑤ 06c polish round (jsdom is layout-blind — source-text guards) */
  ok(/help-center\.html/.test(dt),
    'the encrypted-notice "How it works" opens the help center (06c ⑥)');
  ok(/\.dt-chat__messages \{ display: flex; flex-direction: column; \}/.test(dt)
    && /\.dt-chat__messages > :first-child \{ margin-block-start: auto; \}/.test(dt),
    'the conversation grows UPWARD from the composer (06c ⑤)');
  ok(/font-size-label-lg/.test(dt), 'pane topbar titles ride label-lg (06c ③)');
  ok(/--dt-list-w/.test(dt) && /clamp\(22px/.test(dt),
    'wallet hero type tracks the pane width via the --dt-list-w var — no container queries (06c ②)');
  ok(/\.dt-list \.c-wallet-filters \{ flex-wrap: wrap/.test(dt),
    'the misstx pill wraps below the chips in a narrow pane (06c ②)');
  const chatMobile = readFileSync(join(root, 'src/demo/chat.html'), 'utf8');
  ok(!/dots-vertical/.test(chatMobile),
    'mobile chat topbars dropped the ⋮ — identity tap owns chat info (06c ④)');
  ok(!/'phone', label: 'Call', onClick: \(\) => toastG/.test(chatMobile),
    'mobile GROUP topbar dropped the Call action too (calls = 1:1 only, ②)');

  /* ⑥ 06d refinement guards */
  ok(/\.dt-frame \.c-callin \{[^}]*translate\(-50%, -50%\)/.test(dt),
    'incoming call presents as a centered dialog card on desktop (06d ④)');
  ok(/data-dt-anchor="up"/.test(dt), 'the attach popover variant exists (06d ①)');
  const cij = readFileSync(join(root, 'src/components/chat-info.js'), 'utf8');
  ok(/kind === 'group' \|\| kind === 'bot'/.test(cij) && /LEGACY PARITY/.test(cij),
    'chat-info members gate widened to bots — FLAGGED change with the legacy-parity rationale inline');

  /* ⑦ 06d round 2 (payment sizing · downloads cards) */
  ok(/#detail-wallet \.dt-cap \{ max-width: 560px/.test(dt)
    && /c-wallet-send__amount, \.dt-frame \.c-wallet-receive__amount \{\n\s*font-size: var\(--font-size-heading-sm\)/.test(dt),
    'payment forms: pane capped at 560 + money inputs one step down (06d)');
  ok(/\.dt-frame \.c-settings-dl__row \{[^}]*var\(--surface-card\)/.test(dt),
    'downloads rows read as cards on desktop (06d)');
  ok(/c-app-details__actions \.c-button,\n\s*\.dt-frame \.c-app-details__danger \.c-button \{\n\s*width: auto; min-width: 240px; margin-inline: auto;/.test(dt),
    'app-details Install/Uninstall CTAs hug + center on desktop (06d ⑫)');
  ok(/\.dt-frame \.c-callin__name \{ color: var\(--text-neutral-01\)/.test(dt)
    && /\.dt-frame \.c-callin__circle\[data-kind="ignore"\] \{\n\s*background: var\(--surface-neutral-02\)/.test(dt),
    'call dialog re-inked for the menu surface — on-scrim tokens stay mobile-only (06d ⑬, light-mode fix)');

  /* ⑧ top-row full-width fix (Damir): detail-pane header spans the pane, content caps */
  ok(/head\.classList\.add\('dt-detailhead'\)/.test(dt) && /host\.replaceChildren\(\.\.\.parts\)/.test(dt)
    && /\.dt-detail \.dt-detailhead \{ flex: none/.test(dt),
    'router-rendered detail headers span the full pane (sit ABOVE the cap, not inside it)');
  ok(/#detail-account \.dt-cap--fill \{ max-width: none/.test(dt)
    && /#detail-account \.dt-cap--fill > \* > :not\(\.c-topbar\) \{ max-width: 640px/.test(dt),
    'Account component screens free their own topbar to full width, body stays capped (top-row fix)');
}

if (failures.length) { console.error('\nFAILED:\n' + failures.join('\n')); process.exit(1); }
console.log('\nsmoke test CLEAN');
process.exit(0); // jsdom windows hold live timers (their cleanup would hang the run)