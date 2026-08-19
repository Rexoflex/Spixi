/**
 * jsdom smoke test for the demo pages (#46 audit-loop step).
 * Run: npm i --no-save jsdom && node scripts/smoke-test.mjs
 * Optional arg: repo root (default = script's parent dir) — lets the script run
 * from a location where jsdom resolves, e.g. `node /x/smoke-test.mjs /repo`.
 * Asserts against COMPUTED styles where it matters ([hidden] vs author display).
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync as readFileSyncRaw, readdirSync, existsSync } from 'node:fs';

/* CRLF NORMALIZATION ON READ (#340; handoff-2026-08-16 "the CRLF smoke brittleness").
 * On a Windows checkout three pins failed with no code change behind them — #148③,
 * #309b, #315. Reproduced deliberately: converting exactly those three source files to
 * CRLF in an otherwise-LF twin makes exactly those three fail and nothing else. Two
 * mechanisms, one cause: #148③'s pattern contains a literal \n, and #309b/#315 use
 * bounded lookaheads ([\s\S]{0,80}?, {0,1400}?) that the extra \r per line pushes past
 * budget. Every assertion in this file is about CONTENT, never about line endings, so
 * normalizing here is the whole fix — and it is one place rather than ~200 call sites
 * and every future bounded lookahead. Buffer reads (no encoding) pass through untouched. */
const readFileSync = (p, enc) => {
  const v = readFileSyncRaw(p, enc);
  return typeof v === 'string' ? v.replace(/\r\n/g, '\n') : v;
};

const root = process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..');
let JSDOM, VirtualConsole;
try { ({ JSDOM, VirtualConsole } = await import('jsdom')); }
catch { console.error('jsdom not installed — run: npm i --no-save jsdom'); process.exit(2); }

const failures = [];
let passes = 0;
const ok = (cond, msg) => { if (!cond) failures.push(msg); else passes += 1; console.log((cond ? '  ✓ ' : '  ✗ ') + msg); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); // top-level: shared by every demo block

const load = (file) => new Promise((resolve) => {
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => failures.push(file + ' PAGE ERROR: ' + e.message));
  const dom = new JSDOM(readFileSync(join(root, 'src/demo', file), 'utf8'), {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    url: 'file://' + join(root, 'src/demo', file), virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      /* jsdom has no canvas backend: getContext() reports a not-implemented
         error through the virtual console (which we treat as a page error) and
         returns null. Stub it to null so the run exercises the FAIL-SOFT path
         every canvas consumer is required to have — W5's Live flow falls back
         to the line-art tile — instead of failing the suite on a harness gap. */
      try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
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
  // NOTE: `decline` above is app-frame's HAND-ROLLED demo button (not the shipped
  // c-contact-request) — it is a modal HOST here, nothing more. The ⑩/#266
  // single-click + one-shot grammar is asserted against the real component in the
  // "chatlist-item / chats-shell" block below.
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
  ok(reqRow.getAttribute('aria-expanded') === 'false'
    && rec.querySelector('.c-wallet-receive__reqbox').dataset.open === undefined
    && rec.querySelector('.c-wallet-receive__qr').getAttribute('aria-hidden') === 'false',
    'request reveal starts collapsed (W6: data-open, not [hidden] — [hidden] cannot animate)');
  reqRow.click();
  ok(reqRow.getAttribute('aria-expanded') === 'true'
    && rec.querySelector('.c-wallet-receive__reqbox').dataset.open !== undefined
    && rec.querySelector('.c-wallet-receive__reqbox').getAttribute('aria-hidden') === 'false',
    'Request an amount expands in place (one progressive surface)');
  ok(rec.dataset.requestOpen !== undefined
    && rec.querySelector('.c-wallet-receive__qr').getAttribute('aria-hidden') === 'true',
    'W6: opening collapses the QR section (root data flag drives the CSS) and takes it out of the SR tree');
  /* ★ W9 (Damir, Windows F5 2026-08-13) — the request flow is a MULTI-SELECT +
     ONE CTA now: "perhaps we can have a multiselect as for group creation and then
     1 SEND REQUEST button that then confirms it was sent, and we return to wallet
     screen." Everything the old per-row send pinned (the [data-acted] latch, the
     ✓ morph, the [data-needs-amount] arrow gate) is asserted GONE below, because
     the thing it guarded no longer exists — the rows only tick. #303 is untouched
     and re-asserted at every step: the QR is constant and never carries an amount. */
  const ask0 = rec.querySelector('.c-wallet-receive__ask');
  const rowsOf = (root) => [...root.querySelectorAll('.c-wallet-receive__contact')];
  const gated0 = rowsOf(ask0);
  ok(!ask0.hidden && gated0.length > 0, 'the contact list is visible before an amount is typed');
  ok(gated0.every((b) => b.getAttribute('role') === 'checkbox' && b.getAttribute('aria-checked') === 'false'
    && !!b.querySelector('.c-wallet-receive__check')),
    'W9: rows are the GROUP-CREATION grammar — role=checkbox + aria-checked + the select circle (contacts-shell pickerRow, not a bespoke one)');
  ok(gated0.every((b) => !b.disabled && b.dataset.needsAmount === undefined && b.dataset.acted === undefined),
    'W9: NO row is disabled and no [data-needs-amount]/[data-acted] survives — ticking a name is not a send, so nothing on a row needs gating');
  ok(!rec.querySelector('.c-wallet-receive__contactgo'),
    'W9: the per-row send arrow is GONE — a row can no longer fire anything');
  const rcta = rec.querySelector('.c-wallet-receive__cta');
  const rhint = ask0.querySelector('.c-wallet-receive__hint');
  ok(!!rcta && rcta.disabled && rcta.textContent.trim() === 'Send request',
    'W9: ONE primary CTA, disabled at rest');
  ok(rhint.getAttribute('role') === 'status' && rhint.textContent === 'Enter an amount to send a request',
    'W9: the rule line states the FIRST unmet condition (c-contacts__minhint grammar — same element, text swapped, never hidden: hiding it collapses its box and jumps the list under a finger)');
  const rlive = rec.querySelector('.c-wallet-receive__live');
  gated0[0].click();
  ok(gated0[0].getAttribute('aria-checked') === 'true' && d2.querySelectorAll('.c-toast').length === 0
    && rlive.textContent === '',
    'W9: ticking a row with NO amount selects it and sends nothing — selection and sending are different axes');
  ok(rhint.textContent === 'Enter an amount to send a request' && rcta.disabled,
    'W9: …and the CTA stays inert with a selection but no amount');
  rcta.click();
  ok(d2.querySelectorAll('.c-toast').length === 0 && rlive.textContent === '',
    '★ MONEY: a click on the CTA with no valid amount sends NOTHING — an explicit guard inside the handler, not just the disabled attribute (a synthetic/programmatic click must not get a request for "" off this surface)');
  ask0.querySelector('input').dispatchEvent(new W2.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  ok(d2.querySelectorAll('.c-toast').length === 0 && rlive.textContent === '',
    'Enter in the contact search is inert (the #46 audit rule survives the rewrite)');
  gated0[0].click();                                       // untick — start the real flow clean
  const ramt = rec.querySelector('.c-wallet-receive__amount');
  ramt.value = '12,5'; ramt.dispatchEvent(new W2.Event('input', { bubbles: true }));
  ok(ramt.value === '12.5', 'request amount follows the send sanitize rules (shared export)');
  ok(rqr.dataset.qrValue === '425HqzWpMkV3dTgJnS85CQen:ixi',
    '#303: the QR NEVER re-encodes to addr:send:amount — amount-request QRs are not a supported flow (Damir 2026-08-04); the amount drives only the request CTA');
  ramt.value = '12.'; ramt.dispatchEvent(new W2.Event('input', { bubbles: true }));
  ok(rqr.dataset.qrValue === '425HqzWpMkV3dTgJnS85CQen:ixi', '#303: still constant under amount edits');
  ramt.value = '12.5'; ramt.dispatchEvent(new W2.Event('input', { bubbles: true }));
  const ask = rec.querySelector('.c-wallet-receive__ask');
  ok(rowsOf(ask).every((b) => !b.disabled) && rcta.disabled
    && ask.querySelector('.c-wallet-receive__hint').textContent === 'Pick at least one contact.',
    'W9: a valid amount alone does not arm the CTA — the rule line moves on to the SECOND condition (in place, no re-render)');
  ok(rowsOf(ask).length === 5 && !!ask.querySelector('.c-wallet-receive__none'),
    'contact strip caps at 5 with the keep-typing note (#136 scaling)');
  const picks = rowsOf(ask);
  picks[0].click();
  ok(!rcta.disabled && rcta.textContent.trim() === 'Request 12.5 IXI (1)',
    '★ W9 CTA COPY: amount + count on the button itself — at the moment of commitment the user sees the number they typed and how many people it goes to, without looking away');
  picks[1].click(); picks[2].click();
  ok(rcta.textContent.trim() === 'Request 12.5 IXI (3)'
    && rcta.getAttribute('aria-label') === 'Request 12.5 IXI from 3 selected'
    && ask.querySelector('.c-wallet-receive__hint').textContent === '3 selected',
    'W9: the count is live on the CTA, its aria-label and the rule line (which becomes the count once the rule is met — the group-picker minhint behaviour)');
  const askSearch = ask.querySelector('input');
  askSearch.value = 'Han'; askSearch.dispatchEvent(new W2.Event('input', { bubbles: true }));
  ok(rcta.textContent.trim() === 'Request 12.5 IXI (3)'
    && rowsOf(ask).filter((b) => b.getAttribute('aria-checked') === 'true').length >= 1,
    'W9: the selection survives a contact-search re-render (the state-held selection replaces the state-held latch — audit M2 rule, new mechanism)');
  askSearch.value = ''; askSearch.dispatchEvent(new W2.Event('input', { bubbles: true }));
  ramt.value = '9'; ramt.dispatchEvent(new W2.Event('input', { bubbles: true }));
  ok(rcta.textContent.trim() === 'Request 9 IXI (3)'
    && rowsOf(ask).filter((b) => b.getAttribute('aria-checked') === 'true').length === 3,
    'W9: editing the amount re-labels the CTA and KEEPS the selection — who you are asking is a different axis from how much (the old latch had to be killed here because a ✓ meant "sent"; a tick means nothing of the sort)');
  ok(rqr.dataset.qrValue === '425HqzWpMkV3dTgJnS85CQen:ixi', '#303: QR constant through the amount re-edit too');
  const rcopy = rec.querySelector('.c-wallet-receive__copy');
  rcopy.click();
  ok((rcopy.getAttribute('aria-label') || '').startsWith('Couldn'), 'no clipboard → honest failure morph, no false Copied (audit m1)');

  reqRow.click();                                          // collapse clears the request
  ok(rqr.dataset.qrValue === '425HqzWpMkV3dTgJnS85CQen:ixi'
    && rec.querySelector('.c-wallet-receive__reqbox').dataset.open === undefined
    && rec.dataset.requestOpen === undefined
    && rec.querySelector('.c-wallet-receive__qr').getAttribute('aria-hidden') === 'false',
    'collapsing the reveal clears the request state and brings the QR back (#303 + W6)');
  ok(rec.querySelector('.c-wallet-receive__amount').value === ''
    && rowsOf(ask).every((b) => b.getAttribute('aria-checked') === 'false') && rcta.disabled,
    '★ W9 STATE HONESTY: collapsing clears the SELECTION as well as the amount — a reopened section that silently still had six people ticked is the same class of lie as a QR encoding an amount you can no longer see');
  W2.Spixi.setRequestAmount(rec, 0.0000001);
  ok(rec.querySelector('.c-wallet-receive__amount').value === '0.0000001',
    'setRequestAmount expands scientific-notation numbers (audit C1 — no 1e-7 → 17; asserted on the INPUT since #303 keeps the QR constant)');
  ok(rec.dataset.requestOpen !== undefined
    && rec.querySelector('.c-wallet-receive__reqbox').dataset.open !== undefined
    && rec.querySelector('.c-wallet-receive__qr').getAttribute('aria-hidden') === 'true'
    && rec.querySelector('.c-wallet-receive__cta').disabled,
    'W9: setRequestAmount still opens through the component writer (never an open box over a half-collapsed QR) and lands on the amount-only state — it can never pre-select a recipient');

  /* ——— W9: the SEND, end to end. Ordered last in this frame because a clean run
     navigates away (the demo shell returns to the wallet screen, exactly what
     Damir asked for), which detaches everything asserted above. ——— */
  rec.querySelector('.c-wallet-receive__amount').value = '2.5';
  rec.querySelector('.c-wallet-receive__amount').dispatchEvent(new W2.Event('input', { bubbles: true }));
  const sendPicks = rowsOf(rec.querySelector('.c-wallet-receive__ask'));
  sendPicks[0].click(); sendPicks[1].click();
  const sendCta = rec.querySelector('.c-wallet-receive__cta');
  ok(sendCta.textContent.trim() === 'Request 2.5 IXI (2)', 'W9: two ticked, CTA armed');
  sendCta.click();
  sendCta.click();                                         // #72④: the double tap must not double-fire
  ok(rlive.textContent === 'Request for 2.5 IXI sent to 2 contacts',
    '★ W9 CONFIRMATION: one CTA press announces ONE outcome for the whole batch — and the second press adds nothing (#72④ double-fire protection moved from the per-row latch onto the CTA, which is now the only thing that can send)');
  await sleep(20);
  ok(!d2.querySelector('.c-wallet-receive'),
    '★ W9 RETURN: a clean run leaves the receive surface — "…and we return to wallet screen"');
  ok(d2.querySelectorAll('.c-toast').length === 1
    && d2.querySelector('.c-toast').textContent.includes('sent to 2 contacts'),
    'W9: the shell confirms with exactly ONE toast carrying the batch outcome (reused toast grammar, not a bespoke banner)');

  /* ——— W9 PARTIAL FAILURE — the loop calls the LEGACY PER-CONTACT verb once per
     pick (no batch verb was invented), so one recipient can fail while the others
     go. Mounted directly with a failing callback: a demo page can only ever
     succeed. ——— */
  {
    const seen = [];
    let sentText = null;
    const failing = W2.Spixi.createWalletReceive({
      address: '425HqzWpMkV3dTgJnS85CQen',
      contacts: [
        { name: 'Han Solo', address: 'AAA' },
        { name: 'Baracuda', address: 'BBB' },
        { name: 'Sarah Jo', address: 'CCC' },
      ],
      strings: {}, host: d2.body,
      onSendRequest: ({ contact, amount }) => { seen.push(contact.address + ':' + amount); return contact.address !== 'BBB'; },
      onRequestsSent: (p) => { sentText = p.text; },
    });
    d2.body.append(failing);
    failing.querySelector('.c-wallet-receive__reqrow').click();
    const famt = failing.querySelector('.c-wallet-receive__amount');
    famt.value = '3'; famt.dispatchEvent(new W2.Event('input', { bubbles: true }));
    const frows = rowsOf(failing);
    frows[0].click(); frows[1].click(); frows[2].click();
    failing.querySelector('.c-wallet-receive__cta').click();
    ok(seen.join('|') === 'AAA:3|BBB:3|CCC:3',
      '★ W9 LOOP: the per-contact legacy verb is called ONCE PER PICK, in list order, with the canonical amount — no batch verb was invented (the bridge protocol is frozen)');
    ok(seen.length === 3,
      'W9: a mid-loop failure does not abort the loop — CCC still gets its request after BBB refused (one bad address must not swallow the requests queued behind it)');
    ok(sentText === null && !!failing.parentNode,
      '★ W9 PARTIAL FAILURE NEVER NAVIGATES: onRequestsSent is the ALL-CLEAR signal only — leaving the screen on a partial send would strand the user with no idea which half went');
    const fresult = failing.querySelector('.c-wallet-receive__result');
    ok(!fresult.hidden && fresult.dataset.tone === 'error' && fresult.textContent === 'Sent to 2. The rest are still selected. Try again.',
      'W9: the result line names the outcome in the error tone, and says the remainder is still selected');
    ok(fresult.getAttribute('aria-hidden') === 'true'
      && failing.querySelector('.c-wallet-receive__live').textContent === fresult.textContent,
      'W9: the hidden live region is the SINGLE announcer — the visible result line is aria-hidden, so a screen reader hears the outcome once, not twice');
    const fsel = rowsOf(failing).filter((b) => b.getAttribute('aria-checked') === 'true');
    ok(fsel.length === 1 && fsel[0].textContent.includes('Baracuda'),
      '★ W9 RETRY IS EXACT: the two that went are unticked and ONLY the failure stays selected — pressing the CTA again retries precisely the remainder, never a duplicate request to someone who already got one');
    ok(failing.querySelector('.c-wallet-receive__cta').textContent.trim() === 'Request 3 IXI (1)',
      'W9: …and the CTA count follows it down to 1');
    failing.remove();
  }

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
  /* —— #342 (Damir F5 item (d)): the two LIVE money surfaces that dropped the photo.
   * Both had the avatar in scope at the call site and simply did not pass it, so the
   * user saw a gradient where every other contact row in the app shows a face. The
   * tip head is the worst place for that: it is where you check WHO you are paying. */
  {
    const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
    W2.Spixi.openTipSheet({
      message: { id: 'mAv' }, recipient: { name: 'Han Solo', address: 'AVA', avatar: PNG },
      balance: 100, host: d2.querySelector('.demo-phone'), onTip: (p, c) => c.done(),
    });
    await sleep(30);
    const sheets = [...d2.querySelectorAll('.c-tipsheet')];
    const mine = sheets[sheets.length - 1];
    const img = mine.querySelector('.c-tipsheet__head .c-avatar img');
    ok(!!img && img.getAttribute('src') === PNG,
      '★ #342: the tip sheet renders the recipient PHOTO when the caller supplies one');
    /* #342 review MAJOR-2: DISMISS this sheet before leaving the block. It is inserted
     * mid-flow, and an undismissed sheet becomes the overlay-stack TOP — the later
     * "Esc + scrim both held while the tip is in flight" pin then sent both events to
     * THIS sheet instead of the locked one, so breaking the in-flight lock on a money
     * surface would still have passed. */
    W2.Spixi.dismissTopOverlay && W2.Spixi.dismissTopOverlay();
    mine.remove();
    await sleep(30);
    const noAv = W2.Spixi.createWalletReceive({
      address: '425HqzWpMkV3dTgJnS85CQen', strings: {},
      contacts: [{ name: 'Han Solo', address: 'AAA', avatar: PNG },
                 { name: 'No Photo', address: 'BBB' }],
      onSendRequest: () => true,
    });
    d2.body.append(noAv);
    noAv.querySelector('.c-wallet-receive__reqrow').click();   // the picker lives in the request sub-view
    const rows = [...noAv.querySelectorAll('.c-wallet-receive__contact')];
    const rowImg = (n) => rows[n] && rows[n].querySelector('.c-avatar img');
    ok(rows.length === 2 && !!rowImg(0) && rowImg(0).getAttribute('src') === PNG,
      '★ #342: the wallet request-from-a-contact picker renders the photo. Its roster (home.html requestableContacts) carried `avatar` all along and the row dropped the argument');
    ok(rows.length === 2 && !rowImg(1),
      '#342: a contact with no stored photo still gets the deterministic gradient — the fallback is the correct render, not a failure');
    noAv.remove();
  }
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
  /* ★ I-6 r2 (#360): the label now renders the amount in the app language's
     grouping (MINOR-5 — the CTA must agree with the field above it), so the pin
     tracks the INTENT (amount present, guard absent) tolerant of any grouper. */
  ok(!rbtn.disabled && /Request 5\D?000\D?000 IXI/.test(rbtn.textContent),
    'no balance guard on requests — the label still carries the amount (grouping per app language, #360)');
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
  // Q15: the @-mention picker rides the shared .u-scroll scrollbar grammar (#41)
  // jsdom shim: setActive() scrolls the active row into view; jsdom (layout-blind)
  // has no Element.scrollIntoView → the open would throw as an uncaught page error
  if (!W2.HTMLElement.prototype.scrollIntoView) W2.HTMLElement.prototype.scrollIntoView = function () {};
  const mcomp = W2.Spixi.createComposer({
    placeholder: 'Message',
    mentionSource: () => [{ name: 'Han Solo', address: 'a1' }, { name: 'Leia', address: 'a2' }],
  });
  selHost.append(mcomp);
  const mInput = mcomp.querySelector('.c-composer__input');
  mInput.value = '@'; mInput.setSelectionRange(1, 1);
  mInput.dispatchEvent(new W2.Event('input', { bubbles: true }));
  const mBox = mcomp.querySelector('.c-composer__mentions');
  ok(!!mBox && mBox.classList.contains('u-scroll'),
    'mention picker opens with the .u-scroll grammar (Q15)');
  mcomp.remove();
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
  ok(cinfo.querySelector('.c-topbar__title').textContent === 'Contact details'
    && cinfo.dataset.context === 'contact',
    'contact context title = "Contact details" (Damir 2026-07-08, revises #142)');
  // Damir 2026-08-12: the three chunky c-buttons became wallet-banner quick
  // actions (tonal circle + label). Message still LEADS the row.
  const moneyBtns = [...cinfo.querySelectorAll('.c-chat-info__money .c-chat-info__qa')];
  ok(moneyBtns.length === 3 && moneyBtns[0].classList.contains('c-chat-info__message')
    && moneyBtns.every((b) => !!b.querySelector('.c-chat-info__qa-circle')
      && !!b.querySelector('.c-chat-info__qa-label')),
    'contact page: Message LEADS a 3-up wallet-banner quick-action row (circle + label)');
  const dRows = [...cinfo.querySelectorAll('.c-chat-info__danger-row')];
  ok(dRows.length === 2
    && dRows.some((r) => /Delete/i.test(r.textContent))
    && dRows.some((r) => /Remove/i.test(r.textContent)),
    'contact-details keeps BOTH delete-history + remove-contact (revises #142)');
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

  /* ★ W9-② (Damir, Windows F5 2026-08-13): "Group info — if I delete chat I can't
     reactivate it, there's no Send message in group details."
     The action is what makes a ROOM reachable again once its history is gone, so it
     rides ONE rule for every room kind: supplied onMessage → a lone Message action;
     no onMessage → no row at all. That second half is the in-chat takeover
     (chat.html passes none — you are already in the conversation), and yesterday's
     pass is deliberately preserved by it. */
  const roomInfo = (kind, opts) => {
    const h = d.createElement('div'); d.body.append(h);
    const el = W3.Spixi.createChatInfo(Object.assign({
      kind, context: 'chat', name: 'The Crew', address: 'grp1', host: h,
    }, opts));
    h.append(el);
    const row = el.querySelector('.c-chat-info__money');
    const out = { el, row, labels: row ? [...row.querySelectorAll('.c-chat-info__qa-label')].map((l) => l.textContent) : [] };
    h.remove();
    return out;
  };
  let roomMsgCalls = 0;
  const grpDir = roomInfo('group', { onMessage: () => { roomMsgCalls += 1; } });
  ok(!!grpDir.row && grpDir.labels.join() === 'Message',
    'W9-②: a GROUP handed an onMessage shows a lone Message action — the way back into a group whose conversation was deleted');
  const botDir = roomInfo('bot', { onMessage: () => { roomMsgCalls += 1; } });
  ok(!!botDir.row && botDir.labels.join() === 'Message',
    '★ W9-②: …and so does a BOT/channel. #249 moved bot surfaces onto this same screen but the old test was `kind === \'group\'`, so a channel reached from the directory still dead-ended on an info screen with no way in');
  grpDir.row.querySelector('.c-chat-info__qa').click();
  ok(roomMsgCalls === 1, 'W9-②: the room Message action actually fires onMessage (the shell opens the conversation)');
  const grpChat = roomInfo('group', {});
  ok(!grpChat.row,
    'W9-②: NO onMessage → no quick-action row at all — the in-chat group-info takeover stays free of it (you are already in the conversation), exactly as yesterday\'s pass decided');
  const botChat = roomInfo('bot', {});
  ok(!botChat.row,
    'W9-②: …and an EMPTY action row is never appended either — a bot with no offered actions used to leave a bare padded div under the identity');

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

  // R2 (#201): backup fires DIRECTLY — the password modal was removed (theater:
  // C# ignores the entered password, encrypts with the stored walletpass pref,
  // be-cutover S12). CTA → onBackup({}, ctrl) with a loading→success morph, NO modal.
  bk.querySelector('.c-settings-backup__cta').click();
  await sleep(20);
  ok(bkCtrl && bkPayload && !bkPayload.password && !d.querySelector('.c-settings-backup__pw-input'),
    'CTA fires backup directly (no password modal — theater removed R2)');
  bkCtrl.done();
  await sleep(450);
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

  /* R2 (#201): backup fires directly (password theater removed) — a thrown
     onBackup must not wedge the CTA latch (#141-m4), same guard as export below. */
  let bkThrows = 0;
  const bhost2 = d.createElement('div'); d.body.append(bhost2);
  const bk2 = S.createSettingsBackup({
    status: { last: null, dirtyCount: 0 }, onBack() {},
    onBackup: () => { bkThrows++; throw new Error('x'); },
  });
  bhost2.append(bk2);
  const bk2cta = bk2.querySelector('.c-settings-backup__cta');
  bk2cta.click();
  await sleep(20);
  ok(bkThrows === 1 && !bk2cta.querySelector('.c-button__spinner'),
    'backup: a thrown onBackup unlatches + clears the spinner (#141-m4)');
  bk2cta.click();
  await sleep(20);
  ok(bkThrows === 2, 'backup CTA stays operable after a thrown callback');
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
  /* #334 iOS-60: pattern picker = SWATCH TILES (kills the label-overflow i18n
   * class); text size stays a text segGroup. */
  const segs = [...appear.querySelectorAll('.c-settings-seg')];
  // W5 split the swatches into TWO radiogroups: pattern STYLE then INTENSITY.
  // Scope the #334 assertion to the intensity row so it keeps meaning what it
  // meant (4 levels, tiles not pills) instead of counting the whole screen.
  const styleGroup = appear.querySelector('.c-settings-swatches--style');
  const intensityGroup = [...appear.querySelectorAll('.c-settings-swatches')].find((g) => g !== styleGroup);
  const swatches = [...intensityGroup.querySelectorAll('.c-settings-swatch')];
  ok(segs.length === 1
    && segs[0].querySelectorAll('.c-settings-seg__pill').length === 4
    && swatches.length === 3
    && swatches.map((s) => s.dataset.value).join() === '0,1,2'
    && swatches.every((s) => s.getAttribute('role') === 'radio' && s.getAttribute('aria-label')),
    '★ N81: pattern = 3 swatch tiles — Off / Default / Strong (role=radio + localized aria-label); text size = the one remaining segGroup (4 pills)');
  const offTile = appear.querySelector('.c-settings-swatch[data-off]');
  ok(!!offTile && swatches.every((s) => s.querySelector('.c-settings-swatch__canvas.c-chat-canvas')),
    '#334 iOS-60: every tile face rides the REAL chat-canvas paint; the Off tile is marked distinct (data-off)');
  offTile.click();
  ok(patternPick === 0
    && appear.querySelector('.c-settings-appearance__preview').style.getPropertyValue('--chat-pattern-opacity') === '0',
    'pattern pick applies INSTANTLY to the preview + fires the FE-only callback');
  [...segs[0].querySelectorAll('.c-settings-seg__pill')].pop().click();   // XL (1.25)
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

  /* ★ Item 6 (#397/#400) BEHAVIOURAL: the permanent community door in How to use.
   * The chat-list empty-state CTA is the right first impression, but it disappears the
   * moment the user adds ANY ordinary contact — after that there was no way in at all. */
  {
    let joins = 0;
    const htHost = d.createElement('div');
    d.body.append(htHost);
    const plain = S.createSettingsHowTo({ onBack() {} });
    htHost.append(plain);
    ok(!plain.querySelector('.c-settings-howto__join'),
      '★ Item 6: NO row without the hook — every existing caller (demo, tests) is untouched, and a row that cannot act must not render');
    const ht = S.createSettingsHowTo({ onBack() {}, onJoinCommunity: () => { joins++; } });
    htHost.append(ht);
    const joinBtn = ht.querySelector('.c-settings-howto__join');
    ok(!!joinBtn && joinBtn.tagName === 'BUTTON',
      '★ Item 6: How to use carries the community row — the door that does not close on the first contact');
    joinBtn.click();
    joinBtn.click();                                  // latched — a second tap must not re-request
    ok(joins === 1 && joinBtn.disabled,
      '★ Item 6: the join is OPT-IN and fires ONCE — nothing is added until the tap, and a double tap does not send a second contact request');
    /* ★ break-my-verdict MAJOR-2: this asserted /Added/i, so it CERTIFIED the stale copy —
     * and would have turned red the moment the fix actually landed. "Added" is a false
     * claim on a repeat tap: FriendList.addFriend returns null for an address already in
     * the list (Core FriendList.cs:365-370), and this row is PERMANENT, aimed at exactly
     * the users who already hold the bot. Pin what the copy must SAY. */
    ok(!/^Added\b/i.test(joinBtn.textContent.trim()) && /chats/i.test(joinBtn.textContent),
      '★ Item 6: it reports done IN PLACE and states where the chat IS, not what just happened — a repeat tap adds nothing, so "Added" would be a lie on the tap this permanent row exists to serve');
    const htThrow = S.createSettingsHowTo({ onBack() {}, onJoinCommunity: () => { throw new Error('bridge not ready'); } });
    htHost.append(htThrow);
    htThrow.querySelector('.c-settings-howto__join').click();
    ok(true, '★ Item 6: a throwing hook does not escape the row (the click above would have failed the run)');
    htHost.remove();
  }

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
  // #265 ⑩ (SUPERSEDES Q10b, Damir): the composer has NO focus ring at all, on
  // EITHER platform — the caret is the indicator (Telegram grammar). The old
  // guards demanded the 1px-desktop / 2px-mobile ring that no longer exists.
  ok(/\.c-composer__field:focus-within \{ box-shadow: none; \}/.test(compCss),
    '#265 ⑩: the composer focus ring is gone — the caret is the indicator (both platforms)');
  ok(!/--outline-width-[12]/.test(
    (compCss.match(/\.c-composer__field:focus-within \{[^}]*\}/g) || []).join('')),
    '#265 ⑩: no residual outline-width ring rule on the composer field');
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
  // Damir 2026-08-12 supersedes the #144 two-row button block: the action row is
  // now the wallet-banner quick-action grammar — one centered row of small
  // circle+label actions that stays one row for 1/2/3 actions.
  ok(/\.c-chat-info__money \{[^}]*justify-content: center/.test(infoCss)
    && /\.c-chat-info__money > \.c-chat-info__qa \{ flex: 1; max-width:/.test(infoCss)
    && !/flex-wrap: wrap/.test(infoCss.split('.c-chat-info__money {')[1].split('}')[0]),
    'contact action row: ONE centered quick-action row (wallet-banner grammar, supersedes the #144 two-row block)');
  const tip = readFileSync(join(root, 'src/components/tip-sheet.js'), 'utf8');
  const recv = readFileSync(join(root, 'src/components/wallet-receive.js'), 'utf8');
  const tb = readFileSync(join(root, 'src/components/typed-bubbles.js'), 'utf8');
  ok(/from '\.\/money\.js'/.test(tip) && !/from '\.\/wallet-(send|receive)\.js'/.test(tip),
    'tip-sheet imports money helpers from the shared module, not cross-feature (#143 ②)');
  /* ★ I-6 (#360): the import LIST grew (grouping helpers ride the same module),
     so the pin now tracks the INTENT — sanitize/canonical come from money.js —
     instead of the exact 2026-07 list. */
  ok(/import \{[^}]*\bsanitizeAmount\b[^}]*\bcanonicalAmount\b[^}]*\} from '\.\/money\.js'/.test(recv),
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

{
  /* static guard — a11y sweep Phase 2 (2026-07-08, docs/a11y-sweep-phase2.md).
     The chat SHELL hand-rolls the top-anchored channel selector (Damir Option A,
     F5 2026-07-08) instead of routing through overlay.js, so its focus management
     is verified by source markers — the shell isn't jsdom-loaded here. */
  const chatShell = readFileSync(join(root, 'src/shells/chat.html'), 'utf8');
  ok(/panel\.setAttribute\('role', 'dialog'\)/.test(chatShell)
    && /panel\.setAttribute\('aria-modal', 'true'\)/.test(chatShell),
    'channel selector panel is a dialog + aria-modal (a11y sweep)');
  ok(/function channelFocusables\(\)/.test(chatShell)
    && /channelKeydown = \(e\) => \{[\s\S]*?e\.key !== 'Tab'/.test(chatShell),
    'channel selector traps Tab within the panel (a11y sweep)');
  ok(/channelFocusin = \(e\) => \{/.test(chatShell)
    && /document\.addEventListener\('focusin', channelFocusin\)/.test(chatShell),
    'channel selector contains focus via a focusin handler (a11y sweep)');
  ok(/channelReturnFocus = document\.activeElement/.test(chatShell)
    && /rf\.focus\(\{ preventScroll: true \}\)/.test(chatShell),
    'channel selector restores focus to the trigger on close (a11y sweep)');
}

{
  /* static guards — zero-C# bug-fix batch (2026-07-08). Shell-level wiring isn't
     jsdom-loaded, so verify by source markers (like the a11y block above). */
  const chat = readFileSync(join(root, 'src/shells/chat.html'), 'utf8');
  ok(/bridge\.send\('ixian:loadContacts'\)/.test(chat) && /const groupRoster = new Map\(\)/.test(chat),
    'chat: full member roster wired via ixian:loadContacts (bug batch)');
  ok(/\.chat-channel-overlay \{ position: fixed; inset: 0; z-index: 15;/.test(chat),
    'chat: channel selector sits below the topbar (z-index 15) (bug batch)');
  ok(/autoload: mediaAutoloadOn\(\) \|\| loadedMedia\.has\(media\.url\)/.test(chat)
    && /const MEDIA_LOADED_PREFIX = 'spixi\.media\.loaded\.'/.test(chat),
    'chat: remote media loads by default + persists per peer (bug batch)');
  ok(/\[identityTitle\(\), identity\.sub \|\| ''\]\.filter\(Boolean\)/.test(chat),
    'chat: bot topbar keeps the member count next to the name (bug batch; #212 identityTitle refactor)');
  const mcss = readFileSync(join(root, 'src/styles/components/media-bubble.css'), 'utf8');
  ok(/\.c-bubble-row\[data-direction="sent"\] \.c-mbubble \{\s*border: 2px solid var\(--surface-bubble-sent\)/.test(mcss),
    'media: sent tiles carry a 2px outgoing-bubble border (bug batch)');
  const setg = readFileSync(join(root, 'src/shells/settings.html'), 'utf8');
  ok(/p === 'img\/spixiavatar\.png'/.test(setg),
    'settings: default avatar sentinel maps to gradient, not the legacy image (bug batch)');
  ok(/bridge\.cap\('settingsApply'\)/.test(setg) && /ixian:apply:/.test(setg),
    'settings: save-without-pop stay+Saved path built, gated behind settingsApply (S14) (bug batch)');
  const appd = readFileSync(join(root, 'src/shells/app_details.html'), 'utf8');
  ok(/icon: resolveIcon\(iconPath\)/.test(appd),
    'apps: details icon threaded for parity with the tab (bug batch)');
  const tok = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8');
  ok(/rgba\(132, 108, 200, 0\.22\)/.test(tok),
    'lock: gradient softened/desaturated (bug batch)');
}

{
  /* static guards — chat-polish batch (Q4/Q9/Q10a/M16, 2026-07-11). Shell wiring
     is verified by source markers (shells aren't jsdom-loaded here). */
  const chat = readFileSync(join(root, 'src/shells/chat.html'), 'utf8');
  const home = readFileSync(join(root, 'src/shells/home.html'), 'utf8');
  ok(/id="sl-payment-received">\*SL\{chat-payment-received\}/.test(chat)
    && /function displayPaymentAmount/.test(chat) && /return '\+' \+ a;/.test(chat),
    'Q4: received direct payments signed via the star-SL title carrier');
  ok(/=== PAY_REQUEST_RECEIVED_TITLE\) return a;/.test(chat),
    'Q4: translation-collision guard — a request title never signs (audit A-1)');
  ok(/if \(channelDropdown\) \{ closeChannelSelector\(\); return; \}/.test(chat),
    'Q9: channel-selector title tap toggles closed');
  ok(/if \(!document\.documentElement\.hasAttribute\('data-desktop'\)\) return;\s*\n\s*try \{\s*\n\s*const input = composerEl/.test(chat),
    'Q10a: composer entry autofocus gated to desktop (#228 flag)');
  ok(/CONNECTIVITY_TEXTS/.test(chat) && /setTopbarSub\(topbarHost, topbarSubText\(/.test(chat),
    'M16: chat connectivity → topbar sub title-state, updated IN PLACE (aria-live, audit A-2)');
  /* REBASED by #383 (N40): M16's original one-line handler routed BOTH surfaces from
     one ternary, so each push cleared the other surface — that is exactly the defect
     N40 removed (Damir dial: both may show). The invariant M16 actually owns is what
     is pinned now: connectivity drives the TITLE, and the banner exists for the rest. */
  ok(/CONNECTIVITY_TEXTS/.test(home) && /CONNECTIVITY_TEXTS\.has\(t\)\) \{ setChatsTitleState\(t\); return; \}/.test(home)
    && /createWarningBanner\(\{\s*\n\s*strings: window\.SL \|\| \{\},/.test(home)
    && /setWarning\(homeBanner, raw\);/.test(home),
    'M16 (rebased #383): home connectivity → root title-state; the banner carries everything else — and neither push clears the other any more');
}

console.log('chats-list polish batch — Q12 / Q5 / M5 (2026-07-11)');
{
  /* static guards — shell wiring isn't jsdom-loaded; verify source markers. */
  const chat = readFileSync(join(root, 'src/shells/chat.html'), 'utf8');
  const home = readFileSync(join(root, 'src/shells/home.html'), 'utf8');
  // Q12 writer (chat side): hint written on a C#-confirmed delete of the tail row,
  // AFTER the row is removed (order tail = the new last message); bots skipped; and
  // ONLY for a LOCALLY-initiated delete (C# pushes the IDENTICAL deleteMessage(id)
  // for a remote msgDelete, which never mutates core → such a hint could never expire).
  ok(/const EXDEL_PREFIX = 'spixi\.exdel\.';/.test(chat)
    && /const wasTail = order\.length > 0 && order\[order\.length - 1\] === id;/.test(chat)
    && /writeExdelHint\(rec, wasTail && localDelete\);/.test(chat)
    && /if \(!wasTail \|\| !identity\.address \|\| mode\.isBot\) return;/.test(chat),
    'Q12: chat.html writes the deleted-tail hint (post-removal, tail-only, bots skipped, LOCAL deletes only)');
  // Q12 local-delete latch (A-1): registered where the delete verb is SENT, consumed
  // in the deleteMessage bridge handler (the only ack), cleared per peer. NOT latched for
  // bots (no core delete → no echo) and SELF-EXPIRING (R-4: an id C# never echoes must not
  // be consumed later by a REMOTE delete of the same id → a hint that could never expire).
  ok(/const pendingLocalDeletes = new Set\(\);/.test(chat)
    && /if \(!mode\.isBot\) \{[\s\S]{0,240}?pendingLocalDeletes\.add\(lid\);/.test(chat)
    && /setTimeout\(\(\) => pendingLocalDeletes\.delete\(lid\), \d+\);/.test(chat)
    && /bridge\.send\('ixian:contextAction:deleteMessage:' \+ id\);/.test(chat)
    && /const localDelete = pendingLocalDeletes\.delete\(id\);/.test(chat)
    && /pendingLocalDeletes\.clear\(\);/.test(chat),
    'Q12: local-delete latch — the hint writer fires only for deletes THIS shell initiated (remote msgDelete writes none), bot-skipped + self-expiring');
  // Q12 (A-3/R-5): a robustness-created row carries a wall-clock ts C# can never push →
  // marked tsSynthetic (writer fails safe); a real C#-pushed ts clears the mark.
  ok(/fresh\.tsSynthetic = true;/.test(chat)
    && /if \(ts && rec\.tsSynthetic && ts !== rec\.ts\) rec\.tsSynthetic = false;/.test(chat)
    && /if \(deletedRec\.tsSynthetic\) return;/.test(chat),
    'Q12: synthetic-ts rows write no hint (and the mark clears once a real C# ts lands)');
  // ★ SECURITY (DECISIONS #254): the hint shape is { del, t, kind } — NO message text.
  // The shells and third-party mini-apps share the file:// localStorage partition, so
  // counterpart-authored text must never be persisted there. Guard the writer's body.
  const wxBody = (chat.match(/function writeExdelHint\([\s\S]*?\n  \}/) || [''])[0];
  ok(wxBody.length > 0
    && !/\btext\s*:/.test(wxBody)
    && !/\.slice\(0,\s*\d+\)/.test(wxBody)
    && /kind: tail \? tail\.kind : '',/.test(wxBody),
    'Q12/#254: the exdel hint persists { del, t, kind } ONLY — no counterpart message TEXT in the shared file:// storage partition');
  // Q12 reader (home side): fold-in on addChat with ts-equality expiry + the
  // #238 live trio (storage event + focus/visibility fallback).
  ok(/const EXDEL_PREFIX = 'spixi\.exdel\.';/.test(home)
    && /if \(t && t !== dh\.del\) dropExdelHint\(wallet\);/.test(home)
    && /e\.key\.indexOf\(EXDEL_PREFIX\) === 0 && e\.newValue\) applyExdelHints\(\)/.test(home)
    && /window\.addEventListener\('focus', applyExdelHints\)/.test(home),
    'Q12: home.html folds the hint in (addChat expiry on a different pushed ts + live storage/focus trio)');
  // ★ #254 reader half: no `.text` is read back — a TEXT tail degrades to an EMPTY
  // excerpt (row keeps the corrected timestamp; the next real push heals the line).
  const exBody = (home.match(/function excerptFromExdel\([\s\S]*?\n  \}/) || [''])[0];
  ok(exBody.length > 0
    && !/h\.text/.test(exBody)
    && /return \{ type: 'text', text: '' \};/.test(exBody),
    'Q12/#254: excerptFromExdel reads { kind } only — a text tail degrades to an empty excerpt (nothing cached to read)');
  // Q12 precedence (audit B-1/B-2): the hint must not clobber a live typing line
  // (a typing event re-flushes the UNCHANGED stale lastMessage ts → hint not expired)
  // nor a CH8 sticky reaction excerpt (newer info).
  const apBody = (home.match(/function applyExdelHints\([\s\S]*?\n  \}/) || [''])[0];
  ok(apBody.length > 0
    && /c\.excerpt\.type === 'draft' \|\| c\.excerpt\.type === 'typing'\)\) continue;/.test(apBody)
    && /if \(reactionExcerpts\.has\(c\.address\)\) continue;/.test(apBody),
    'Q12: applyExdelHints yields to draft/typing rows and to a CH8 sticky reaction excerpt (audit B-1/B-2)');
  // Q12/M5 flush-done path: orphan-hint prune (B-7, a natively removed contact never
  // gets another addChat to expire its hint) + the Requests-filter leave guard (B-3),
  // both BEFORE the authoritative render.
  const doneBody = (home.match(/clearChatsDone\(\) \{[\s\S]*?\n    \},/) || [''])[0];
  ok(/function pruneExdelHints\(\)/.test(home)
    && doneBody.length > 0
    && /pruneExdelHints\(\);/.test(doneBody)
    && /leaveRequestsFilterIfEmpty\(\);/.test(doneBody)
    && /renderChatsNow\(\);/.test(doneBody),
    'Q12/M5: flush-done prunes orphan hints (B-7) + runs the Requests leave guard (B-3) before the authoritative render');
  // Q12/M5 onPersist delete path: the deleted row sheds its hint, and deleting the
  // LAST outgoing request row re-runs the leave guard (the chip hides at 0).
  const persistBody = (home.match(/onPersist: \(action, chat, detail\) => \{[\s\S]*?\n    \},/) || [''])[0];
  ok(persistBody.length > 0
    && /dropExdelHint\(chat\.address\);/.test(persistBody)
    && /leaveRequestsFilterIfEmpty\(\);/.test(persistBody),
    'Q12/M5: a row delete sheds its exdel hint + re-runs the Requests leave guard (onPersist)');
  // iOS-26 SUPERSEDES Q5 (Damir 2026-07-29): groups are back IN the directory and
  // the 'start' picker — a wiped chat history must not make a group unreachable —
  // and the People/Groups chips separate them instead. Both hand-off points still
  // take directoryRoster(); what changed is that it no longer drops groups, only
  // normalizes the isGroup flag from the two signals (CH1 kind + avatar sentinel).
  ok(/contactsView\.setContacts\(directoryRoster\(\)\)/.test(home)
    && /getRoster: \(\) => directoryRoster\(\)/.test(home)
    && /groupAddrs\.add\(wallet\)/.test(home)
    && /isGroup: avatar === 'img\/spixi-group-avatar\.png'/.test(home)
    && /const isGroupContact = /.test(home)
    && !/\.filter\(\(c\) => c && !c\.isGroup && !groupAddrs\.has\(c\.address\)\)/.test(home),
    'iOS-26: directory/picker roster KEEPS groups (isGroup normalized; Q5 drop-filter gone)');
  // iOS-26 money fence: groups must never reach a payment/recipient surface.
  // peopleRoster() is the people-only view; both money consumers take it.
  ok(/const peopleRoster = \(\) => directoryRoster\(\)\.filter\(\(c\) => !c\.isGroup\)/.test(home)
    && /contacts: peopleRoster\(\)/.test(home)
    && /return peopleRoster\(\)\.filter\(\(c\) => c && !c\.pending/.test(home),
    'iOS-26/#255: createWalletSend + requestableContacts consume the people-only roster');
  // M5 (corrected round 2, Damir F5): the real outgoing-request signal is the
  // unapproved-state chat-waiting-for-response override (HomePage.xaml.cs:1606-1612),
  // NOT index-excerpt-contact-request. Carrier same-line-closed (#248) + DIRECTION
  // guard (statusType non-empty = localSender marker; the incoming fall-through
  // pushes '').
  //
  // ⚠ The original third clause asserted `index-excerpt-contact-request` was ABSENT
  // from home.html — the first-cut M5 carrier had been removed as dead. The Q2-④
  // canon (#268/#271) then RE-ADDED that same _SL key, deliberately and for a
  // different purpose: it is one of the 12 excerpt-canon carriers (→ request /
  // user-plus glyph). Both belong there, and a bare grep for the key cannot tell the
  // two uses apart — so the negative clause was stale by construction and had to go.
  // It is replaced by the assertion that actually matters: the key is wired ONLY into
  // the canon (canonEntry), and M5's own path keys on REQUEST_SENT_TEXT.
  //
  // (For the record, the old comment's premise was also wrong: the C# branch is
  // `state == Approved && !friend.approved` — reachable for an OUTGOING request the
  // peer accepted, before any real message arrives. So the key CAN reach a row.)
  ok(/<span id="sl-waiting-response">\*SL\{chat-waiting-for-response\}<\/span>/.test(home)
    && /canonEntry\('sl-ex-contact-request', 'Contact Request', 'request'\);/.test(home)
    && /if \(statusType && trimmed && trimmed === REQUEST_SENT_TEXT\) return \{ type: 'request'/.test(home),
    'M5: outgoing request = waiting-for-response carrier + direction guard (contact-request key belongs to the Q2 canon, not to M5)');
  // M5: outgoing rows ride the Requests chip (count + filter + leave-guard) and
  // light the contacts-picker pending badge via requestAddrs.
  ok(/const isReqRow = isRequestSentPush\(excerpt_msg, type\);/.test(home)
    && /chat\.request = isReqRow;/.test(home)
    && /chats\.filter\(isRequestRow\)\.length/.test(home)
    && /\(state\.chats \|\| \[\]\)\.some\(isRequestRow\)\) return;/.test(home)
    && /requestAddrs\.has\(c\.address\) \? Object\.assign\(\{\}, c, \{ pending: true \}\) : c/.test(home),
    'M5: request rows feed the Requests chip + hold the filter + pending badge in the picker');
}

console.log('chatlist-item / chats-shell — M5 request grammar');
{
  const dom = await load('chats.html');
  const W = dom.window;
  const ex = W.Spixi.createExcerpt({ type: 'request', text: 'Request sent' });
  ok(ex.dataset.type === 'request'
    && ex.querySelector('.c-excerpt__text').textContent === 'Request sent'
    && !!ex.querySelector('svg'),
    'createExcerpt renders the request type with the user-plus glyph (registered — icons.js)');
  // outgoing request rows match the Requests chip; plain chats don't; the old
  // 'requests → no chats' short-circuit in orderedChats is gone.
  ok(W.Spixi.chatMatchesFilter({ request: true }, 'requests') === true
    && W.Spixi.chatMatchesFilter({ excerpt: { type: 'request', text: 'Request sent' } }, 'requests') === true
    && W.Spixi.chatMatchesFilter({ excerpt: { type: 'text', text: 'hi' } }, 'requests') === false,
    'chatMatchesFilter: request rows (flag or excerpt-type) ride the Requests chip');
  const reqState = {
    filter: 'requests', query: '',
    chats: [{ address: 'A1', name: 'Pending Pete', request: true, excerpt: { type: 'request', text: 'Request sent' }, timestamp: 2 },
            { address: 'A2', name: 'Normal Nora', excerpt: { type: 'text', text: 'yo' }, timestamp: 3 }],
    requests: [],
  };
  const visible = W.Spixi.orderedChats(reqState);
  ok(visible.length === 1 && visible[0].address === 'A1',
    'orderedChats surfaces ONLY the outgoing-request row under the Requests filter');

  // What dropping the 'requests' short-circuit actually BUYS: the filter renders BOTH
  // surfaces at once — the incoming request CARDS and the outgoing "Request sent" ROWS
  // — each exactly once, with plain chats excluded (no double-render, no leakage).
  const mixed = {
    filter: 'requests', query: '',
    chats: [
      { address: 'A1', name: 'Pending Pete', request: true, excerpt: { type: 'request', text: 'Request sent' }, timestamp: 2 },
      { address: 'A2', name: 'Normal Nora', excerpt: { type: 'text', text: 'yo' }, timestamp: 3 },
    ],
    requests: [{ address: 'R1', name: 'Incoming Ida', timestamp: 1 }],
  };
  const mixedList = W.Spixi.createChatsList(mixed, { strings: {}, rowMenu: false });
  const cards = mixedList.querySelectorAll('.c-contact-request');
  const rows = mixedList.querySelectorAll('.c-chatlist-item');
  ok(cards.length === 1 && rows.length === 1
    && rows[0].querySelector('.c-excerpt').dataset.type === 'request'
    && !mixedList.textContent.includes('Normal Nora'),
    'Requests filter renders ONE incoming card + ONE outgoing request row (no double-render; plain chats excluded)');

  const emptyReq = W.Spixi.createChatsList({ filter: 'requests', query: '', chats: [], requests: [] }, { strings: {}, rowMenu: false });
  ok(!!emptyReq.querySelector('.c-chats-empty')
    && emptyReq.querySelector('.c-chats-empty').textContent === 'No pending requests'
    && !emptyReq.querySelector('.c-chatlist-item') && !emptyReq.querySelector('.c-contact-request'),
    'Requests filter: the empty state still renders when neither cards nor request rows exist');

  // #273: "Contact Accepted" is a SETTLED event — canon kind 'request-done', which
  // keeps the user-plus glyph but MUST NOT ride the Requests filter/chip (the
  // Damir F5 legacy-account bug: 21 phantom "requests", all accepted years ago).
  const done = W.Spixi.createExcerpt({ type: 'request-done', text: 'Contact Accepted' });
  ok(done.dataset.type === 'request-done' && !!done.querySelector('svg')
    && W.Spixi.chatMatchesFilter({ excerpt: { type: 'request-done', text: 'Contact Accepted' } }, 'requests') === false,
    '#273: request-done keeps the glyph but is EXCLUDED from the Requests filter');
  const homeSrc = readFileSync(join(root, 'src/shells/home.html'), 'utf8');
  ok(/canonEntry\('sl-ex-contact-accepted', 'Contact Accepted', 'request-done'\);/.test(homeSrc)
    && /canonEntry\('sl-ex-contact-request', 'Contact Request', 'request'\);/.test(homeSrc),
    '#273: canon types Contact Accepted as request-done; Contact Request stays request (genuinely pending)');

  // #274a: the inline (pane sublevel) option picker must NOT carry the sheet's
  // 56vh/480px cap — the pickerScreen body owns scrolling there; the mobile
  // SHEET keeps the cap (asserted by the settings.html jsdom block above).
  const inlineOpts = W.Spixi.settingsOptionSheet({
    title: 'Language', inline: true, current: 'en-us',
    options: Array.from({ length: 10 }, (_, i) => ({ value: 'l' + i, label: 'Lang ' + i })),
    commit: () => {},
  });
  ok(!inlineOpts.classList.contains('c-settings__opts--scroll'),
    '#274a: inline option picker has NO sheet max-height cap (pane list was clipped at 480px)');

  // #274b: language pick in the pane stashes the open picker across the C# page
  // reload; boot consumes the stash (language-only, 15s guard) + rebuildHub
  // refreshes a stale restored picker once setLanguage lands.
  const setSrc = readFileSync(join(root, 'src/shells/settings.html'), 'utf8');
  ok(/const VIEW_RESUME_KEY = 'spixi\.settings\.view';/.test(setSrc)
    && /stashViewForReload\(\); bridge\.send\('ixian:language:' \+ code\)/.test(setSrc)
    && /currentView = takeResumeView\(\) \|\| 'hub';/.test(setSrc)
    && /o\.v === 'language'/.test(setSrc)
    && /detailWrap\.dataset\.langBuilt !== state\.language/.test(setSrc),
    '#274b: language pick survives the C# settings reload (view stash + restored-picker refresh)');

  /* ⑩ (#266) + Q1 review (#267 loop) — the SHIPPED c-contact-request grammar:
   * · Decline is SINGLE-CLICK (the confirm modal is gone — declines are reversible);
   * · each action ONE-SHOTS (a list re-flush can't double-emit the verb);
   * · either action SPENDS THE WHOLE CARD — after Decline (ixian:undorequest →
   *   removeFriend) a stray Accept would fire ixian:accept → sendAcceptAdd on a
   *   friend C# already deleted, and vice-versa.
   * These run against the CHECKED-IN bundle → only valid after a rebuild
   * (Damir's order: build-demo-bundle → build-shells → smoke-test). */
  const d = W.document;
  ok(typeof W.Spixi.createContactRequest === 'function',
    'createContactRequest is on the bundle export map');
  if (typeof W.Spixi.createContactRequest === 'function') {
    let declines = 0, accepts = 0;
    const card = W.Spixi.createContactRequest({
      name: 'Pending Pete', address: 'A1', timestamp: Date.now(), strings: {},
      onDecline: () => { declines += 1; },
      onAccept: () => { accepts += 1; },
    });
    d.body.append(card);
    const cDecline = card.querySelector('[data-decline]');
    const cAccept = card.querySelector('[data-accept]');
    ok(!!cDecline && !!cAccept, 'contact-request card renders both actions');
    if (cDecline && cAccept) {
      cDecline.click();
      await sleep(50);                                   // a confirm modal would have opened by now
      ok(declines === 1 && !d.querySelector('.c-modal[role="alertdialog"]'),
        'Decline fires onDecline ONCE and opens NO confirm modal (single-click, #266)');
      cDecline.click();
      ok(declines === 1 && cDecline.disabled === true,
        'Decline one-shots — a second click (stale row after a re-flush) cannot double-emit the verb');
      cAccept.click();
      ok(accepts === 0 && cAccept.disabled === true,
        'Decline SPENDS the card — Accept is disabled and cannot fire ixian:accept on the removed friend');
    }
    card.remove();

    // mirror case: a FRESH card — Accept fires once and spends Decline too.
    let declines2 = 0, accepts2 = 0;
    const card2 = W.Spixi.createContactRequest({
      name: 'Pending Pat', address: 'A2', timestamp: Date.now(), strings: {},
      onDecline: () => { declines2 += 1; },
      onAccept: () => { accepts2 += 1; },
    });
    d.body.append(card2);
    const c2Decline = card2.querySelector('[data-decline]');
    const c2Accept = card2.querySelector('[data-accept]');
    if (c2Decline && c2Accept) {
      c2Accept.click();
      await sleep(50);
      ok(accepts2 === 1, 'Accept fires onAccept ONCE');
      c2Decline.click();
      ok(declines2 === 0 && c2Decline.disabled === true,
        'Accept SPENDS the card — Decline is disabled and cannot fire ixian:undorequest afterwards');
    }
    card2.remove();
  }
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
    // #279: address-only rows title as the TRUNCATED address (#276 canon) — the
    // pre-#276 expectation here checked the full address and went stale.
    && rows[rows.length - 1].querySelector('.c-contacts__name').textContent === '335Hxq21a…wA1vBq',
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
  // #265 (Damir ⑤): the confirm moved from a bottom footer bar to a TOPBAR action
  // (Signal/iOS grammar). The footer element no longer exists.
  const topNext = () => picker.querySelector('.c-topbar__actions button');
  ok(!!topNext() && actionsCard.hidden === true,
    'multi mode: the TOPBAR confirm action appears, top actions hide (#265)');
  const mrows = [...picker.querySelectorAll('.c-contacts__row')];
  const rowByNameM = (n) => mrows.find((r) => r.querySelector('.c-contacts__name').textContent === n);
  // F3: assert the SPECIFIC rows, not just a count of 2 — the pending row (Ben
  // Kenobi) and the type-2 bot row (Ixian News) must be disabled, and a normal
  // contact (Han Solo) must NOT be.
  ok(mrows.filter((r) => r.disabled).length === 2, 'pending + bot rows disabled in multi-select');
  ok(!!rowByNameM('Ben Kenobi').disabled, 'the pending row specifically is disabled in multi-select');
  ok(!!rowByNameM('Ixian News').disabled, 'the type-2 bot row specifically is disabled in multi-select');
  ok(!rowByNameM('Han Solo').disabled, 'a normal contact row is NOT disabled in multi-select');
  const nextBtn = topNext();
  ok(nextBtn.disabled, 'confirm disabled at 0 selected');
  const rowByName = rowByNameM;
  // F4: multi-select rows are role=checkbox / aria-checked (idiomatic mapping for
  // an independent multi-select roster), not role=button + aria-pressed.
  const hanRow = rowByName('Han Solo');
  ok(hanRow.getAttribute('role') === 'checkbox' && hanRow.getAttribute('aria-checked') === 'false',
    'unselected multi-select row: role=checkbox, aria-checked=false (F4)');
  hanRow.click();
  rowByName('Sarah Jo').click();
  // the topbar action is an icon button — the count rides its aria-label + the title
  ok(!topNext().disabled && /\(2\)/.test(topNext().getAttribute('aria-label') || ''),
    'confirm enables + counts the selection (#265: ≥2 required for a group)');
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
  const f2Next = f2Picker.querySelector('.c-topbar__actions button');
  // #265 MAJOR-6: a group needs ≥2 members — one selected keeps the confirm DISABLED
  // (C# rejects a 1-member payload and only logs → Create would silently do nothing).
  ok(f2Next.disabled && /\(1\)/.test(f2Next.getAttribute('aria-label') || ''),
    'F2: only the real-address contact counts; a 1-member selection cannot confirm (#265)');
  f2Next.click();
  ok(f2Selection === null,
    'F2: a below-minimum selection never emits onNext (no falsy address, no 1-member group)');
  f2Picker.remove();

  // —— group setup ——
  topNext().click();
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
  ok(!picker.querySelector('.c-topbar__actions button')
    && picker.querySelector('.c-contacts__action').closest('.c-contacts__group').hidden === false,
    'picker back exits multi-select first (topbar confirm gone, actions back) — not the picker (#265)');
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
  const sendBtn = add.querySelector('.c-contacts-add__submit');   // R2: moved under the input (was .c-contacts__footer)
  addInput.value = 'short';
  sendBtn.click();
  ok(!add.querySelector('.c-contacts-add__error').hidden, 'short address blocked inline (20–128 QR-accept gate)');
  W.Spixi.setAddContactAddress(add, '4fj2soko4fj2soko4fj2soko');
  await sleep(400);
  ok(checked === 1 && !add.querySelector('.c-contacts-add__valid').hidden,
    'checkAddress ✓ affordance after debounce (confirm-only — silent-fail bridge contract)');
  sendBtn.click();
  await sleep(1100);
  ok(opened === '4fj2soko4fj2soko4fj2soko', 'send success → onOpened(address) — post-add opens the conversation');
  ok(sendBtn.disabled, 'send button latched after success (one request per screen visit)');

  const add2 = W.Spixi.createAddContact({ onSendRequest: () => { throw new Error('boom'); } });
  d.body.append(add2);
  add2.querySelector('.c-contacts-add__input').value = 'x'.repeat(30);
  const send2 = add2.querySelector('.c-contacts-add__submit');
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
  const send3 = add3.querySelector('.c-contacts-add__submit');
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
  const send5 = add5.querySelector('.c-contacts-add__submit');
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
  W.Spixi.setAddContactAddress(add5, 'brandnewaddress9999999999');
  ok(in5.value === 'brandnewaddress9999999999',
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
  const sheet3 = W.Spixi.showBackupNudge({ host: phone, illustration: 'images/onboarding/backup.png' });
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
  const encRow = secRows.find((b) => b.textContent.includes('Change Spixi password'));
  ok(!!encRow, 'hub Security & privacy carries the Change Spixi password row (ixian:encpass nav)');
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

  /* —— #343 PRESS FEEDBACK — the behaviour that separates it from :active ————————
   * Perceived latency is the thing users called "laggy". A row that answers in 90 ms
   * feels instant even when the data takes exactly as long as before. The mechanism is
   * one delegated listener, so these assertions cover EVERY pressable surface at once. */
  {
    const pressRoot = d.createElement('div');
    pressRoot.innerHTML = '<div class="c-chatlist-item"></div><button class="c-button"></button>';
    d.body.append(pressRoot);
    const detach = W.Spixi.attachPressFeedback({ root: pressRoot });
    const row = pressRoot.querySelector('.c-chatlist-item');
    const btn = pressRoot.querySelector('.c-button');
    const pe = (type, x, y) => new W.MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });

    row.dispatchEvent(pe('pointerdown', 100, 100));
    ok(row.dataset.pressed === 'row',
      '★ #343: a press lands on pointerdown, not click. `click` fires on RELEASE, so using it would add the very delay this exists to hide');
    row.dispatchEvent(pe('pointerup', 100, 100));
    /* ★ D-16 (#351) — THE CONTRACT FLIPPED HERE, deliberately. Until #351 this pin
       asserted the press clears on release, and that instant clear was the defect:
       a 60 ms click froze the sweep at ~65% and the row snapped (Damir's recording).
       A committed ROW press now SURVIVES the release until the fill completes. */
    ok(row.dataset.pressed === 'row',
      '★ D-16 (#351): a row press SURVIVES pointerup — the completion floor holds data-pressed until --duration-300 has elapsed, so a fast click plays the same full sweep as a hold. If this cleared instantly, the fill would freeze mid-width and snap');

    row.dispatchEvent(pe('pointerdown', 100, 100));
    row.dispatchEvent(pe('pointermove', 100, 140));
    ok(row.dataset.pressed === undefined,
      '★ #343 THE RULE THAT MAKES IT NATIVE: moving past the threshold cancels the press, because that gesture is a SCROLL. Without it a flick down the chat list leaves a trail of highlighted rows — worse than no feedback at all');

    /* ★ #346 (review of #343): a CANCELLED gesture must stay cancelled until it ENDS.
       The module binds both touchstart and pointerdown because Android synthesises
       pointer events late — and onDown used to clear() unconditionally, so that late
       pointerdown re-armed the press touchmove had just cancelled AND restarted the
       travel threshold from the new origin. Exactly the trail of lit rows during a
       flick that the rule above exists to prevent. Mid-flick re-arm first: */
    row.dispatchEvent(pe('pointerdown', 100, 140));
    ok(row.dataset.pressed === undefined,
      '★ #346: a late second-stream pointerdown does NOT re-arm a press that already became a scroll. Android fires touchstart on contact and pointerdown tens of ms later, so this is the ordinary Android flick, not an edge case');
    // …and the gesture ending releases the latch, so the NEXT real tap still works.
    row.dispatchEvent(pe('pointerup', 100, 140));
    row.dispatchEvent(pe('pointerdown', 100, 100));
    ok(row.dataset.pressed === 'row',
      '★ #346: the cancel latch clears on pointerup/touchend, so a genuine next tap is unaffected. A latch that stranded would kill press feedback for the rest of the session');
    row.dispatchEvent(pe('pointerup', 100, 100));

    /* ★ #346 review MAJOR-1: a scroll with NO finger down must not latch. The capture
       listener sees momentum scrolling long after touchend, and programmatic scrolls
       (scroll-to-newest-message, focus() pulling an input into view) with no gesture at
       all. Latching on those killed the FIRST tap after any scroll for up to 1200 ms. */
    /* ★ D-16 r2 (audit C-1, mutation-proven): this pin must run on a FRESH row.
       The pointerup above leaves `row` in its afterlife with data-pressed still
       set, so a latch regression's early-return in onDown would leave the LEFTOVER
       attribute for the assertion to read — the pin passed with the very defect it
       gates re-introduced. row2 has no history, so the assertion reads only what
       THIS pointerdown armed. */
    const row2 = d.createElement('div');
    row2.className = 'c-chatlist-item';
    pressRoot.append(row2);
    pressRoot.dispatchEvent(new W.Event('scroll', { bubbles: true }));
    d.dispatchEvent(new W.Event('scroll'));
    row2.dispatchEvent(pe('pointerdown', 100, 100));
    ok(row2.dataset.pressed === 'row',
      '★ #346 review MAJOR-1: the tap straight after a settled fling still lights up. Measured in Chromium before the fix: no feedback at 100/500/900/1150 ms after the last momentum scroll event, feedback at 1400 ms — the PRESS_SAFETY_MS backstop, not the gesture');
    row2.dispatchEvent(pe('pointerup', 100, 100));

    /* ★ #346 review r2 MINOR-4: a gesture that ends with NO end event (the WebView
       swallowed it, an overlay took the finger) used to leave the in-flight flag set,
       so the next scroll re-latched and the FOLLOWING tap lost its feedback. A
       single-touch touchstart can only begin a gesture, so it releases the latch. */
    const te = (type, x, y, n = 1) => {
      const ev = new W.Event(type, { bubbles: true });
      ev.touches = Array.from({ length: n }, () => ({ clientX: x, clientY: y }));
      ev.isPrimary = true; return ev;
    };
    row.dispatchEvent(te('touchstart', 100, 100));   // gesture starts, never ends
    // NOTE: dispatch on pressRoot, which IS the attach host here. A scroll dispatched
    // on `document` never reaches a listener bound to pressRoot, and this pin was dead
    // until that was corrected.
    pressRoot.dispatchEvent(new W.Event('scroll', { bubbles: true }));
    row.dispatchEvent(te('touchstart', 100, 100));
    ok(row.dataset.pressed === 'row',
      '★ #346 review r2 MINOR-4: a touchstart releases a latch stranded by a gesture that produced no end event. Without it the next tap after ANY later scroll silently lost its feedback');
    row.dispatchEvent(te('touchend', 100, 100));

    btn.dispatchEvent(pe('pointerdown', 10, 10));
    ok(btn.dataset.pressed === 'control',
      '#343: controls get the "control" grammar (tint + scale) and rows get "row" (tint only) — a list row that scales reads as a mistake on both platforms');
    btn.dispatchEvent(pe('pointercancel', 10, 10));

    btn.disabled = true;
    btn.dispatchEvent(pe('pointerdown', 10, 10));
    ok(btn.dataset.pressed === undefined, '#343: a disabled control must look disabled, not pressable');

    detach();
    row.dispatchEvent(pe('pointerdown', 100, 100));
    ok(row.dataset.pressed === undefined, '#343: detach() really detaches (no listener leak across shells)');
    pressRoot.remove();
  }

  /* ★ D-16 (#351) — the press AFTERLIFE, timed with real timers. jsdom cannot
   * resolve the duration tokens, so readMs falls back to 300/200 ms — which makes
   * these deterministic. The margins are wide on purpose (CI timer jitter). */
  {
    const pressRoot = d.createElement('div');
    pressRoot.innerHTML = '<div class="c-chatlist-item"></div><button class="c-button"></button>';
    d.body.append(pressRoot);
    const detach = W.Spixi.attachPressFeedback({ root: pressRoot });
    const row = pressRoot.querySelector('.c-chatlist-item');
    const btn = pressRoot.querySelector('.c-button');
    const pe = (type, x, y) => new W.MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });

    // 1. A fast tap: the floor holds, then the fade runs, then everything is clean.
    row.dispatchEvent(pe('pointerdown', 100, 100));
    row.dispatchEvent(pe('pointerup', 100, 100));
    await sleep(120);
    ok(row.dataset.pressed === 'row' && row.dataset.pressfade === undefined,
      '★ D-16 (#351): 120 ms after a fast tap the sweep is STILL RUNNING (data-pressed held by the floor, no fade yet) — the release did not truncate the fill');
    await sleep(320);
    ok(row.dataset.pressed === undefined && /^(hold|out)$/.test(row.dataset.pressfade || ''),
      '★ D-16 (#351): after the floor the press hands off to the FADE (data-pressfade hold→out) — a flat colour fading in place, never the reverse sweep');
    await sleep(400);
    ok(row.dataset.pressed === undefined && row.dataset.pressfade === undefined,
      '★ D-16 (#351): the afterlife CLEANS UP — both attributes gone, no timer strands a lit row');

    // 2. A press that became a scroll earns no fill and no fade.
    row.dispatchEvent(pe('pointerdown', 100, 100));
    row.dispatchEvent(pe('pointermove', 100, 140));
    row.dispatchEvent(pe('pointerup', 100, 140));
    await sleep(360);
    ok(row.dataset.pressed === undefined && row.dataset.pressfade === undefined,
      '★ D-16 (#351): a scroll-cancelled press gets NO afterlife — Damir: "if someone wants to scroll, nothing fills"');

    // 3. pointercancel (the system took the gesture) aborts, never completes.
    row.dispatchEvent(pe('pointerdown', 100, 100));
    row.dispatchEvent(pe('pointercancel', 100, 100));
    await sleep(360);
    ok(row.dataset.pressed === undefined && row.dataset.pressfade === undefined,
      '★ D-16 (#351): pointercancel is an ABORT, not a lift — on Android a cancel IS the scroll takeover, and completing on it would light every flicked row');

    // 4. Controls keep the instant release.
    btn.dispatchEvent(pe('pointerdown', 10, 10));
    btn.dispatchEvent(pe('pointerup', 10, 10));
    ok(btn.dataset.pressed === undefined && btn.dataset.pressfade === undefined,
      '★ D-16 (#351): a CONTROL still clears on release instantly — the floor and the fade are row grammar only');

    // 5. A re-press mid-fade interrupts the fade and re-arms the sweep.
    row.dispatchEvent(pe('pointerdown', 100, 100));
    row.dispatchEvent(pe('pointerup', 100, 100));
    await sleep(360);
    row.dispatchEvent(pe('pointerdown', 100, 100));
    ok(row.dataset.pressed === 'row' && row.dataset.pressfade === undefined,
      '★ D-16 (#351): pressing a row mid-fade cancels its afterlife and re-arms the press — the fade and a new sweep never fight over one element');
    row.dispatchEvent(pe('pointercancel', 100, 100));

    detach();
    pressRoot.remove();
  }

  /* #341: release() — the scrub handle the Account pane needs. The standalone
   * settings_encryption.html page DIES on pop, so back-scrub plus the window
   * pagehide listener covered every exit there. The in-pane sublevel lives inside
   * the long-lived settings.html document, which is PARKED on close (#315), and
   * renderLayout replaces the children on paths that never touch the back button.
   * Without release() the screen becomes a detached node the window listener still
   * holds, with three plaintext passwords live in it for the life of the process. */
  const encRel = W.Spixi.createEncPassScreen({ onBack: () => {} });
  d.body.append(encRel);
  const relFields = [...encRel.querySelectorAll('.c-lock__input')];
  ok(relFields.length === 3, '#341 fixture: the screen carries the three password fields');
  relFields.forEach((i, n) => { i.value = 'secret-value-' + n; });
  relFields[0].type = 'text';                       // the show-password eye, left ON
  const encRelFn = typeof encRel.release === 'function' ? encRel.release : null;
  ok(!!encRelFn,
    '#341: createEncPassScreen exposes release(), the convention createChatAppearance already uses — the shell cannot scrub a component it has no handle on');
  // Guarded: a missing hook must report THREE clean failures, not abort the suite
  // before every later block gets to run (mutation-tested — the guard is why the
  // mutation reports instead of crashing).
  if (encRelFn) encRelFn();
  ok(!!encRelFn && relFields.every((i) => i.value === ''),
    '★ #341 SECURITY: release() clears all three password values');
  ok(!!encRelFn && relFields.every((i) => i.type === 'password'),
    '★ #341 SECURITY: release() re-masks a revealed field too — left as type=text it would show the next visitor the last password in plain text');
  if (encRelFn) encRelFn();
  ok(!!encRelFn && relFields.every((i) => i.value === ''),
    '#341: release() is idempotent — renderLayout calls it on EVERY render that is not the password sublevel');
  encRel.remove();

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
  ok(/onChangePassword/.test(shellJs) && /Change Spixi password/.test(shellJs),
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
    && /var\(--safe-top, 0px\)/.test(lcss),
    '#160b⑧: lock takeover is FULL-BLEED (gradient under the statusbar; safe-area padding for the real page) — ★ AND-7 (#401) moved the top inset behind --safe-top, because a raw env() reads 0 on Android and the lock would have padded by nothing there');
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
    && [...d.querySelectorAll('.c-launch__view')].every((v) => !v.dataset.theme),
    'the WHOLE shell is pinned dark on ONE continuous --gradient-launch — form views inherit the pin, none re-pin (welcome→create→restore→retry)');

  // —— welcome carousel: 4 legacy-tour slides · shipped art · dots · keys ——
  const dots = [...d.querySelectorAll('.c-launch__dot')];
  ok(d.querySelectorAll('.c-launch__slide').length === 4 && dots.length === 4,
    'carousel: 4 slides + 4 dots (the SHIPPED legacy tour, step1–4 reused)');
  const arts = [...d.querySelectorAll('.c-launch__slide .c-launch__illo-img')];
  ok(arts.length === 4 && arts.every((im) => /images\/onboarding\/step[1-4]\.png$/.test(im.getAttribute('src'))),
    'slides carry the step1–4 art as PNG (N45 byte dial: 150-195 KB vs 450-655 KB SVG; dark set — welcome is pinned dark)');
  ok(dots[0].getAttribute('aria-selected') === 'true', 'dot 1 selected at rest (roving tabindex)');
  dots[2].click();
  ok(dots[2].getAttribute('aria-selected') === 'true'
    && /translateX\(-200%\)/.test(d.querySelector('.c-launch__track').style.transform),
    'dot click drives the track (and retires autoplay — the user took control)');
  d.querySelector('.c-launch__dots').dispatchEvent(new W.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
  ok(dots[1].getAttribute('aria-selected') === 'true', '←/→ arrows page the carousel');
  // ★ N76 (#391): the onboarding tail is GONE from this shell — with it the backup
  // step and the join step. The backup art still ships (the periodic nudge on the home
  // shell uses the same file); what must not survive here is the tail itself.
  ok(!d.querySelector('.c-launch__tail') && !d.querySelector('.c-launch__tail-step'),
    '★ N76: no onboarding tail in the launch shell — create/restore land straight in the app');
  ok(d.querySelectorAll('.c-launch__illo[data-placeholder="true"]').length === 0,
    'NO placeholder slots remain (placeholder = img-error fallback only, iOS-2 shipped)');

  // —— premium pickers: the SETTINGS sheets (one grammar app-wide) ——
  const pill = d.querySelector('.c-launch__pill');
  ok(!!pill && pill.textContent.includes('English'), 'language pill shows the current language');
  pill.click();
  const langSheet = d.querySelector('.c-settings__opts');
  // #256/#257 hid the 5 dictionary-less locales → 8 rows. N4 (#379) shipped
  // their dictionaries and un-hid them → EXACTLY 13. The old `>= 8` was a
  // tautology after the un-hide: a stale bundle still shipping the 8-row
  // picker passed it (Opus loop r1 MINOR-2, the #288 MAJOR-2 class).
  ok(!!langSheet && langSheet.querySelectorAll('.c-settings__opt').length === 13
    && !!langSheet.querySelector('.c-settings__opt-flag'),
    'language pill opens the settings option sheet (#148⑥ — flags leading, EXACTLY 13 shipped locales post-N4)');
  W.Spixi.dismissTopOverlay();
  await sleep(400);
  // ★ N72 (#391): the appearance pill is GONE. The launch flow is fixed dark in both
  // themes, so the pick changed nothing the user could see and cost a page reload.
  ok(!d.querySelector('.c-launch__pill--icon')
    && d.querySelectorAll('.c-launch__top .c-launch__pill').length === 1,
    '★ N72: the welcome top bar carries the language pill ONLY — no appearance picker');

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
  // ★ N75 (#391): the CTAs switch IN PLACE even when the native notification hooks are
  // wired — they used to be OVERRIDES, and a wired hook meant C# pushed a whole new page.
  {
    let told = 0;
    const oneP = W.Spixi.createLaunchShell({ view: 'welcome', onGoCreate: () => { told += 1; } });
    d.body.append(oneP);
    [...oneP.querySelectorAll('.c-launch__ctas .c-button')][0].click();
    ok(oneP.dataset.view === 'create' && told === 1,
      '★ N75: onGoCreate NOTIFIES and the view still switches in place (one page, one WebView)');
    oneP.remove();
  }
  /* ★ F-2 (#395/#399) BEHAVIOURAL: every view change reports, from ONE place.
   * C# swallows the hardware back button only while it believes a FORM view is on
   * screen. Reporting from the two CTA hooks left every other route silent — the
   * form Back controls, the retry lockout, anything added later — and the reported
   * symptom was back EXITING THE APP from create/restore. */
  {
    const seen = [];
    const vp = W.Spixi.createLaunchShell({ view: 'welcome', onViewChange: (v) => seen.push(v) });
    d.body.append(vp);
    ok(seen.length === 0,
      '★ F-2: the BOOT view is NOT reported — C# chose it and put it in the carrier, and this runs during parse where an outgoing navigation races C#\'s first push (#177)');
    [...vp.querySelectorAll('.c-launch__ctas .c-button')][1].click();
    ok(seen.join() === 'restore', '★ F-2: the welcome CTA reports through show(), not through its own hook');
    vp.querySelector('[data-launch-view="restore"] .c-topbar .c-button').click();   // the back icon-button is the topbar's first control
    ok(seen.join() === 'restore,welcome',
      '★ F-2: the form BACK control reports too — it used to report through a SEPARATE hook, so a route that forgot to wire it left C# believing a form was still up');
    W.Spixi.setLaunchView(vp, 'retry');
    ok(vp.dataset.view === 'retry' && seen.join() === 'restore,welcome',
      '★ F-2: the switch C# ITSELF drives does not echo back — it already knows, and an echo is a second navigation for no new information');
    W.Spixi.setLaunchView(vp, 'retry');
    ok(seen.join() === 'restore,welcome', '★ F-2: an unchanged view reports nothing');
    vp.remove();
  }
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

  // —— create done(): scrub, hold the success morph — C# navigates to Home ——
  nick.value = 'Damir'; cpw.value = 'hunter2hunter2'; crp.value = 'hunter2hunter2';
  cbtn.click();
  /* ★ N44 (#402) — VERIFIED ALREADY BUILT, now PINNED so it cannot regress silently.
   * The worklist carried "spinner-on-button masking create/restore work" as an open
   * item; a jsdom probe on the shipped bundle shows all three commit buttons already
   * enter the loading state. Create is the one that matters — wallet generation takes
   * seconds behind a screen with nothing else moving — and it had NO assertion at all,
   * which is exactly how a build item stays open on paper while being done in code. */
  ok(!!cbtn.querySelector('.c-button__spinner') && cbtn.getAttribute('aria-busy') === 'true'
    && cbtn.disabled,
    '★ N44 (#402): CREATE masks the wallet-generation wait — spinner, aria-busy and a disabled control the moment the submit is accepted');
  await sleep(2800);                             // demo bridge 1600ms + the morph beat
  ok(shell.dataset.view === 'create' && cpw.value === '' && crp.value === '',
    '★ N76: create done() scrubs and STAYS — there is no tail to advance to, C# navigates to Home');
  ok(nick.disabled && cpw.disabled,
    '★ N76: the form stays disabled after success — the only thing that follows is the native page change');

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
  ok(!!rbtn.querySelector('.c-button__spinner') && rbtn.getAttribute('aria-busy') === 'true',
    '★ N44 (#402): RESTORE masks its wait the same way (the sibling half — the wrong-password path below then releases it)');
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

  // —— direct API: entry routing · self-cleaning listener ——
  const entry = W.Spixi.createLaunchShell({ view: 'retry' });
  ok(entry.dataset.view === 'retry', '★ N75: entry-point routing: view:"retry" — the cold-unlock boot view of the ONE launch page');
  const api = W.Spixi.createLaunchShell({ view: 'create' });
  d.body.append(api);
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
  ok(/var\(--gradient-launch\)/.test(lcss) && /var\(--safe-top, 0px\)/.test(lcss)
    && /--gradient-launch:/.test(readFileSync(join(root, 'src/styles/tokens.css'), 'utf8')),
    'premium round: welcome rides the NEW --gradient-launch (tokens.css dials; the lock keeps its own recipe) and clears the top safe area — ★ AND-7 (#401) via --safe-top, because a raw env() reads 0 on Android');
  ok(/settingsOptionSheet/.test(ljs) && /from '\.\/settings-shell\.js'/.test(ljs)
    && !/settingsThemeSheet/.test(ljs),
    '★ N72: the LANGUAGE picker reuses the settings sheet (one picker grammar app-wide); the theme sheet import left with the appearance pill');
  /* N45: the SHIPPED onboarding art is now PNG (smaller by 2.5-4x per asset);
     join-community stays SVG (no PNG export exists). PNG integrity = magic bytes
     + IEND tail, the same truncation class the old <svg check caught. */
  for (const n of ['step1', 'step2', 'step3', 'step4', 'restore', 'backup', 'rate']) {
    let png = null;
    try { png = readFileSync(join(root, 'src/demo/images/onboarding/' + n + '.png')); } catch (e) { /* missing → the pin fails, the run survives */ }
    ok(!!png && png.length > 8 && png[0] === 0x89 && png[1] === 0x50 && png.subarray(-8, -4).toString('latin1') === 'IEND',
      'N45: onboarding art ' + n + '.png ships complete (PNG magic + IEND tail — truncated or MISSING copies fail)');
  }
  {
    let svg = '';
    try { svg = readFileSync(join(root, 'src/demo/images/onboarding/join-community.svg'), 'utf8'); } catch (e) { /* missing → fail below */ }
    ok(svg.includes('<svg') && svg.trimEnd().endsWith('</svg>'),
      'onboarding art join-community.svg (SVG-only asset) is present AND complete');
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
  ok(wide === 0, 'no component CSS gained ≥700px viewport rules (#228: desktop density rides :root[data-desktop], never a viewport query)');

  /* ①b #228 — desktop type/density is a PLATFORM flag: tokens.css must carry the
     :root[data-desktop] block (not @media ≥700px), and every shell except
     launch.html (drifted; own rebuild batch) must set the flag at boot. */
  const tok = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8');
  ok(/:root\[data-desktop\]/.test(tok), 'tokens.css desktop type step keyed on :root[data-desktop] (#228)');
  ok(!/@media[^{]*min-width:\s*700px/.test(tok), 'tokens.css has NO 700px media query (type must not flip on window resize, #228)');
  {
    const shellsDir = join(root, 'src/shells');
    const exempt = new Set(['launch.html']); // drifted; gets the flag in its own rebuild batch
    for (const f of readdirSync(shellsDir)) {
      if (!f.endsWith('.html') || exempt.has(f)) continue;
      const html = readFileSync(join(shellsDir, f), 'utf8');
      ok(html.includes("setAttribute('data-desktop'"), 'shell sets the #228 platform type flag: ' + f);
    }
  }

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

console.log('native bridge adapters (Phase 3 #173, docs/native-bridge-spec.md — src/bridge over the components.html bundle)');
{
  const dom = await load('components.html');
  const d = dom.window.document, W = dom.window;
  W.TextDecoder = TextDecoder;                   // jsdom exposes atob but not TextDecoder; every real WebView has both
  const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
  const S = W.Spixi;

  // —— core transport ——
  const sent = [];
  const mkBridge = () => S.createNativeBridge({ emit: (c) => sent.push(c), win: W });
  const br = mkBridge();
  let threw = false;
  try { br.send('foo:bar'); } catch { threw = true; }
  ok(threw, 'send() fails LOUD on a non-ixian command (adapter bug, not a user path)');
  br.send('ixian:unlock:pa:ss ✓đ');
  ok(sent[sent.length - 1] === 'ixian:unlock:pa:ss ✓đ',
    'send() emits the RAW legacy composition — colons/spaces/unicode pass through unencoded (C# UrlDecodes once)');
  br.ready(); br.ready();
  ok(sent.filter((c) => c === 'ixian:onload').length === 1, 'ready() emits ixian:onload exactly ONCE (latched)');
  ok(!br.cap('selfDestruct'), 'capabilities default OFF without SPIXI_ENV (#115 graceful default)');
  W.SPIXI_ENV = { capabilities: { selfDestruct: true } };
  ok(S.createNativeBridge({ emit: () => {}, win: W }).cap('selfDestruct')
    && !S.createNativeBridge({ emit: () => {}, win: W }).cap('voice'),
    'SPIXI_ENV.capabilities drives cap() — present key ON, absent key OFF');

  // —— executeUiCommand dispatcher (legacy divergences 1+2) ——
  S.installExecuteUiCommand(W);
  let got = null;
  W.executeUiCommand((a, b) => { got = [a, b]; }, b64('Đamir ✓ 你好'), b64('<b>&"\'x'));
  ok(got && got[0] === 'Đamir ✓ 你好', 'executeUiCommand decodes Base64 → UTF-8 (unicode-safe)');
  ok(got && got[1] === '<b>&"\'x',
    'args arrive RAW — no legacy escapeParameter (textContent shells; escaping would render &amp; to users)');
  let survived = true;
  try { W.executeUiCommand(() => { throw new Error('boom'); }, b64('x')); } catch { survived = false; }
  ok(survived, 'a throwing handler is swallowed (console.error, never alert/rethrow)');

  // —— scan adapter (first repoint target) ——
  const camCalls = { start: 0, stop: 0, torch: [] };
  const stubCam = (grant = true) => ({
    start(feedEl, onText, ctrl) { camCalls.start += 1; camCalls.onText = onText; grant ? ctrl.done() : ctrl.fail(); },
    stop() { camCalls.stop += 1; },
    setTorch(on, ctrl) { camCalls.torch.push(on); ctrl.done(); },
  });
  sent.length = 0;
  const scan = S.mountScanPage({ host: d.body, bridge: mkBridge(), camera: stubCam() });
  ok(scan.el.dataset.state === 'prompt' && sent.includes('ixian:onload'),
    'mountScanPage renders the prompt state and signals ixian:onload');
  scan.el.querySelector('.c-scan__card .c-button').click();
  ok(scan.el.dataset.state === 'scanning' && camCalls.start === 1,
    'Allow camera starts the provider; grant → scanning');
  const torchBtn = scan.el.querySelector('.c-scan__torch');
  ok(!!torchBtn, 'torch affordance renders because the provider can drive it (capability-gated UI)');
  torchBtn.click();
  ok(torchBtn.getAttribute('aria-pressed') === 'true' && camCalls.torch.join() === 'true',
    'torch click drives provider.setTorch (optimistic flip held on done)');
  S.deliverScanResult(scan.el, 'abcixian:qrresult:evil');
  await sleep(450);
  ok(!sent.some((c) => c.startsWith('ixian:qrresult:')), 'hostile self-prefixed QR payload is NEVER emitted');
  S.deliverScanResult(scan.el, 'MEET-4Zq…addr');
  S.deliverScanResult(scan.el, 'SECOND');
  await sleep(450);
  ok(sent.filter((c) => c.startsWith('ixian:qrresult:')).join() === 'ixian:qrresult:MEET-4Zq…addr',
    'decode emits ixian:qrresult:<raw text> exactly once (allowScanning one-shot mirror)');
  ok(camCalls.stop >= 1, 'the camera stops on decode (page is about to pop)');
  scan.el.querySelector('[aria-label="Back"]').click();
  ok(!sent.includes('ixian:back'),
    'back AFTER decode emits nothing — C# already popped; a second command would pop the PARENT page');
  scan.el.remove();
  // cancel wins inside the 350ms flash window ([S1] closed in the real adapter)
  sent.length = 0; camCalls.stop = 0;
  const scan2 = S.mountScanPage({ host: d.body, bridge: mkBridge(), camera: stubCam() });
  scan2.el.querySelector('.c-scan__card .c-button').click();
  S.deliverScanResult(scan2.el, 'RACE');
  scan2.el.querySelector('[aria-label="Back"]').click();
  await sleep(450);
  ok(sent.filter((c) => c !== 'ixian:onload').join() === 'ixian:back',
    'Back inside the decode-flash window: ONLY ixian:back — the pending qrresult is dropped ([S1])');
  scan2.el.remove();
  // no camera library at all → visible denied state, nothing silent
  const scan3 = S.mountScanPage({ host: d.body, bridge: mkBridge(), camera: null });
  scan3.el.querySelector('.c-scan__card .c-button').click();
  ok(scan3.el.dataset.state === 'denied', 'missing camera library lands on the honest denied card, never a dead CTA');
  scan3.el.remove();

  // —— lock adapter ——
  sent.length = 0;
  const lock = S.mountLockPage({ host: d.body, bridge: mkBridge(), biometrics: true });
  ok(lock.el.dataset.mode === 'unlock' && sent.includes('ixian:onload'), 'mountLockPage boots unlock mode + onload');
  const lockInput = lock.el.querySelector('.c-lock__input');
  lockInput.value = 'hu:nter%2';
  [...lock.el.querySelectorAll('.c-button')].find((b) => b.textContent.includes('Unlock')).click();
  ok(sent[sent.length - 1] === 'ixian:unlock:hu:nter%2',
    'unlock emits the password RAW after the prefix (colons/% pass through — C# Splits on the prefix)');
  ok(lockInput.disabled, 'unlock latches while C# decides (no-callback contract)');
  W.executeUiCommand(W.unlockFailed, b64('nope'));
  ok(!lock.el.querySelector('.c-lock__error').hidden && !lockInput.disabled,
    '§9 pre-wire: an unlockFailed push lands as the inline error + restore (inert until BE ships it)');
  W.executeUiCommand(W.setJustConfirm, b64('True'));
  ok(lock.el.dataset.mode === 'confirm', 'setJustConfirm("True") flips to confirm mode over the REAL b64 pipeline');
  [...lock.el.querySelectorAll('.c-button')].find((b) => b.textContent.trim() === 'Cancel').click();
  ok(sent[sent.length - 1] === 'ixian:change', 'confirm-mode Cancel emits ixian:change (authSucceeded(false))');
  [...lock.el.querySelectorAll('.c-button')].find((b) => b.textContent.includes('fingerprint')).click();
  ok(sent[sent.length - 1] === 'ixian:onload',
    'biometric retry re-emits ixian:onload (LockPage.onLoad relaunches Plugin.Fingerprint — §9 flag stands)');
  lock.el.remove();

  // —— encpass adapter ——
  sent.length = 0;
  const enc = S.mountEncPassPage({ host: d.body, bridge: mkBridge() });
  const [cur2, next2, rep2] = [...enc.el.querySelectorAll('.c-lock__input')];
  cur2.value = 'oldpass-01'; next2.value = 'newpass-0123'; rep2.value = 'newpass-0123';
  enc.el.querySelector('.c-encpass__footer .c-button').click();
  ok(sent[sent.length - 1] === 'ixian:changepass:--1ec4ce59e0535704d4--oldpass-01--1ec4ce59e0535704d4--newpass-0123',
    'changepass composes the LEADING-delimiter format (split[1]=old, split[2]=new — settings_encryption.html:110)');
  ok(cur2.disabled, 'changepass latches while C# decides');
  await sleep(1700);
  ok(!cur2.disabled && !enc.el.querySelector('.c-lock__error').hidden,
    'encpass no-callback mirror: 1600ms release restores the form with the inline wrong-current copy');
  enc.el.querySelector('[aria-label="Back"]').click();
  ok(sent[sent.length - 1] === 'ixian:back', 'encpass back emits ixian:back');
  enc.el.remove();
}

{
  /* static guards — native bridge batch. The #153① lesson applies HARD here:
     native.js's docblock DOCUMENTS the banned words (alert(), innerHTML,
     escapeParameter, ixian:ready:<shellId> — they ARE the divergence spec), so
     the guards must test CODE, not comments — strip them first. */
  const nat = readFileSync(join(root, 'src/bridge/native.js'), 'utf8');
  const scanP = readFileSync(join(root, 'src/bridge/scan-page.js'), 'utf8');
  const lockP = readFileSync(join(root, 'src/bridge/lock-page.js'), 'utf8');
  const bl = readFileSync(join(root, 'scripts/build-demo-bundle.mjs'), 'utf8');
  // strip /* */ blocks + // line/trailing comments (no bridge string contains "//")
  const codeOf = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
  const code = codeOf(nat) + codeOf(scanP) + codeOf(lockP);
  ok(!/\.innerHTML/.test(code) && !/\balert\(/.test(code) && !/console\.log\(/.test(code),
    'bridge layer CODE: no innerHTML, no alert, no console.log (passwords transit this layer — SECURITY §5; comments exempt, #153①)');
  ok(!/escapeParameter/.test(code), 'legacy escapeParameter stays OUT of the new dispatcher (divergence 1 is deliberate)');
  ok(!/ixian:ready:/.test(code), 'no ixian:ready dual-emit until BE approves the §8 proposal (Contains-matcher hazard)');
  ok(/ENC_DELIM[^;]*from '\.\.\/components\/lock-shell\.js'/.test(lockP),
    'lock-page imports ENC_DELIM from lock-shell (one delimiter truth, no drift)');
  ok(bl.indexOf('src/bridge/native.js') > bl.indexOf('rating-nudge.js')
    && bl.indexOf('src/bridge/scan-page.js') > bl.indexOf('src/bridge/native.js')
    && bl.indexOf('src/bridge/lock-page.js') > bl.indexOf('src/bridge/scan-page.js'),
    'bundle order: shells → native core → page adapters (shared-scope resolution)');
}

console.log('native call surface (Q4-③/#270) — call.html contract + the call-ui removal');
{
  /* The per-shell call glue (call-ui.js) is DELETED: calls present on the ONE
     native CallPage hosting src/shells/call.html. Components stay (call.html +
     the demos drive them directly) — exercise them off the bundle, and statically
     guard the new shell's contract + the removal from every other shell. */
  const dom = await load('components.html');
  const d = dom.window.document, W = dom.window;
  const S = W.Spixi;

  ok(typeof S.attachCallUi !== 'function',
    'attachCallUi is GONE from the bundle (call-ui.js deleted — no shell wires per-pane call UI anymore)');
  ok(typeof S.showIncomingCall === 'function' && typeof S.showCallBar === 'function',
    'call-overlay + callbar components stay exported (call.html + demos consume them directly)');

  // —— ring component: Accept/Decline-only grammar (ignore:false, call.html) ——
  let accepted = 0;
  const ring = S.showIncomingCall({
    host: d.body, ignore: false,
    caller: { name: 'Han', address: 'ADDR1', avatar: null },
    onAccept: () => { accepted++; },
    onDecline: () => {},
  });
  const kinds = [...ring.querySelectorAll('.c-callin__circle')].map((b) => b.dataset.kind);
  ok(kinds.includes('accept') && kinds.includes('decline') && !kinds.includes('ignore'),
    'the ring offers Accept + Decline ONLY (ignore:false — no local-dismiss verb exists, C# would keep ringing)');
  ring.querySelector('[data-kind="accept"]').click();
  ring.querySelector('[data-kind="accept"]').click();
  ok(accepted === 1, 'ring actions LATCH — one outcome per ring');
  await sleep(500);
  ok(!d.querySelector('.c-callin'), 'an answered ring dismisses itself');

  // —— callbar: dialing (null startedAt) vs in-call, singleton mutate ——
  S.showCallBar({ host: d.body, text: 'Calling Han…', startedAt: null, onHangUp: () => {} });
  let bar = d.querySelector('.c-callbar');
  let time = bar && bar.querySelector('.c-callbar__time');
  ok(!!bar && !!time && time.hidden && time.textContent === '',
    'startedAt:null = DIALING — the bar shows, no timer ticks (legacy spixi.js:304)');
  S.showCallBar({ host: d.body, text: 'Han', startedAt: Date.now() - 65000, onHangUp: () => {} });
  bar = d.querySelector('.c-callbar');
  time = bar && bar.querySelector('.c-callbar__time');
  ok(d.querySelectorAll('.c-callbar').length === 1 && !!time && !time.hidden && /\d+:\d\d/.test(time.textContent),
    'a real startedAt flips the SAME bar to in-call with a duration (singleton mutate — no teardown flash)');
  S.hideCallBar(d.body);
  ok(!d.querySelector('.c-callbar'), 'hideCallBar removes the bar');

  // —— static contract guards (call.html isn't jsdom-loaded — source markers) ——
  const callShell = readFileSync(join(root, 'src/shells/call.html'), 'utf8');
  ok(/setCallUi\(kind, name, avatar, text, startedSecs, sessionId, address\)/.test(callShell),
    'call.html registers the ONE replayable setCallUi push (CallPage contract)');
  ok(/ixian:appAccept:/.test(callShell) && /ixian:appReject:/.test(callShell) && /ixian:hangUp:/.test(callShell),
    'call.html emits ONLY the existing global call verbs (intent — C# owns the call, SECURITY.md)');
  ok(/ignore: false/.test(callShell),
    'call.html ring is Accept/Decline-only (no local-dismiss verb exists)');
  const buildShellsSrc = readFileSync(join(root, 'scripts/build-shells.mjs'), 'utf8');
  ok(/call: \{ in: 'src\/shells\/call\.html', out: 'call\.html', page: 'CallPage' \}/.test(buildShellsSrc)
    && /'wallet_sent', 'call',/.test(buildShellsSrc),
    'build-shells maps call.html → CallPage + includes it in DEFAULT');
  // #288 review (MAJOR, SECOND occurrence): the launch drop-ins were NOT in DEFAULT,
  // so every routine build left them inlining a STALE artifact — #285 and #287 both shipped
  // them one dictionary behind (664 keys vs 665 = English copy in the launch language
  // picker for a translated user). ★ N75 collapsed the five outputs to ONE (intro.html);
  // the DEFAULT membership rule is what still protects against that class.
  ok(/'call', 'launch'\]/.test(buildShellsSrc)
    && !/LAUNCH_KEYS/.test(buildShellsSrc)
    && !/bootView:/.test(buildShellsSrc),
    "★ N75 + #288: ONE launch output (intro.html), built by DEFAULT — no bootView fan-out, no LAUNCH_KEYS set");
  ok(/launch:   \{ in: 'src\/shells\/launch\.html', out: 'intro\.html'/.test(buildShellsSrc)
    && !/intro_new\.html'|intro_restore\.html'|intro_retry\.html'|onboarding\.html'/.test(buildShellsSrc),
    '★ N75: the three extra launch outputs and the N76 tail output are gone from the shell map');
  ok(/const LEGACY_DEMO_KEYS = \['apps', 'payments'\]/.test(buildShellsSrc)
    && /filter\(\(k\) => !LEGACY_DEMO_KEYS\.includes\(k\)\)/.test(buildShellsSrc),
    "#288: build-shells 'all' no longer overwrites the legacy apps/wallet_send drop-ins");
  // no shell but call.html touches call UI anymore
  for (const shell of ['home', 'chat', 'settings', 'wallet_sent', 'downloads', 'contact_details',
    'contact_new', 'app_details', 'app_new', 'dev', 'contributors', 'settings_backup', 'settings_encryption']) {
    const src = readFileSync(join(root, 'src/shells/' + shell + '.html'), 'utf8');
    ok(!/attachCallUi/.test(src) && !/addCallAppRequest/.test(src) && !/displayCallBar/.test(src),
      'call-ui removal: ' + shell + '.html carries no per-pane call wiring (#270)');
  }

  /* ————— Opus #46 loop over Q4: the fixed invariants ————————————————————————— */
  const callPage = readFileSync(join(root, 'Spixi/Pages/Call/CallPage.xaml.cs'), 'utf8');
  const scp = readFileSync(join(root, 'Spixi/Utils/SpixiContentPage.cs'), 'utf8');
  const app = readFileSync(join(root, 'Spixi/App.xaml.cs'), 'utf8');

  // ★ MAJOR-1: a call surface is NEVER presented while the app is locked (the modal
  // fallback would sit ABOVE the lock — ModalStack is above the whole page tree).
  ok(/private static bool lockUp\(INavigation\? rootNav\)/.test(callPage)
    && /ModalStack\.Any\(p => p is LockPage\)/.test(callPage)
    && /NavigationStack\.LastOrDefault\(\) is LockPage/.test(callPage),
    '★ lockUp() sees all three lock shapes (in-place · modal · boot/root)');
  ok(/hasModalOverlay\(\) \|\| isLockStaging\(\)/.test(callPage)
    && /public static bool isLockStaging\(\)/.test(scp),
    '★ lockUp ALSO sees a lock that is STAGING (pushModalLoaded, ~1.3s) — a ring admitted there would land UNDER the lock as an unpoppable modal');
  ok(/if \(lockUp\(rootNav\)\)\s*\{\s*UIHelpers\.refreshAppRequests = true;\s*return null;/.test(callPage),
    '★ ensureSurface refuses to present over a lock, and re-arms the refresh flag so the ring returns after the unlock');
  ok(/CallPage\.hideSurface\(\);\s*\n\s*var lockPage = new LockPage\(true\);/.test(app),
    '★ App.OnResume tears the call surface down BEFORE staging the resume lock (no modal can sit above a lock)');
  ok(/UIHelpers\.refreshAppRequests = true;/.test(app.slice(app.indexOf('public void onUnlock'), app.indexOf('public void onLockPresentFailed'))),
    '★ onUnlock re-asserts the call state (a call that survived the lock gets its ring/bar back)');

  // ★ MAJOR-2: PopModalAsync pops the TOP modal — never pop a page we do not own.
  ok(/if \(rootNav\.ModalStack\.LastOrDefault\(\) == page\)/.test(callPage),
    '★ hideSurface only pops the modal when the CALL page is the top of the modal stack (a lock above must never be popped by a call event)');
  // MAJOR-4: state cleared synchronously; the modal→in-place hand-off re-asserts.
  ok(callPage.indexOf('lock (callLock)') < callPage.indexOf('MainThread.BeginInvokeOnMainThread(async () =>')
    && /hideSurface\(\);\s*\n\s*return;/.test(callPage)
    && /SpixiContentPage\.broadcastCallState\(\);\s*\n\s*return;/.test(callPage),
    'MAJOR-4: hideSurface clears state synchronously and re-asserts after the modal pops (answering a modal-fallback ring lands the strip)');
  // MINOR-5: the bar strip is sized, not margin-derived from an unmeasured grid.
  // #282: the bar strip grows by the iOS status-bar inset — the assignment rides
  // stripHeight (barHeightDip + inset); still SIZED directly, never margin-derived.
  ok(/double stripHeight = barHeightDip;/.test(callPage) && /stage\.HeightRequest = stripHeight;/.test(callPage) && !/h - barHeightDip/.test(callPage),
    'MINOR-5: the bar stage is SIZED, not margin-derived from an unmeasured grid height (which collapsed to a full-window input blocker)');
  // ★ the inbound mini-app gate survives the removal of the (now dead) enumerator.
  ok(!/public static List<SpixiContentPage> getLivePages/.test(scp)
    && /public virtual bool acceptsCallPushes => true;/.test(scp)
    && (scp.match(/acceptsCallPushes/g) || []).length >= 4,
    '★ #221: the dead getLivePages enumerator is gone, the INBOUND acceptsCallPushes gate is NOT (appAccept/appReject/hangUp still refuse a mini-app)');
  // the FE half: hang-up is one-shot per session; an unknown kind paints nothing.
  ok(/const hungUp = new Set\(\)/.test(callShell) && /hungUp\.has\(sid\) \? '' : sid/.test(callShell),
    'call.html: hang-up is ONE-SHOT per session (a re-assert cannot re-arm it)');
  ok(/if \(ringEl && !ringEl\.isConnected\)/.test(callShell),
    'call.html: a self-dismissed ring clears its latch (no blank full-window cover on a re-assert)');
  ok(/:root\[data-desktop\] body\[data-mode="bar"\] \.c-callbar/.test(callShell),
    'call.html: the desktop #264 floating-pill rule is overridden in bar mode (the stage IS the strip — no clipped pill)');
}

console.log('avatar-datauri.html');
{
  // Option A end-to-end (avatar/app-icon data-URI push, DECISIONS #204). The harness
  // self-checks every avatar/icon consumer against a real data:image/png URI and exposes
  // the tally on window.__HARNESS__. jsdom doesn't fetch images, so the onerror path
  // isn't exercised here — the page's bad-path row is written to pass on the pre-error
  // <img> too — but the data-URI THREADING (the thing Option A depends on) is fully proven.
  const dom = await load('avatar-datauri.html');
  const d = dom.window.document, W = dom.window;
  const h = W.__HARNESS__;
  ok(h && h.total >= 6, 'harness ran all avatar/icon consumer checks (' + (h ? h.total : 0) + ')');
  ok(h && h.allGreen, 'every consumer renders an <img> from the data URI (Option-A ready): ' + (h ? h.passed + '/' + h.total : 'n/a'));
  const heroImg = d.querySelector('.c-chat-info__hero .c-avatar__img');
  ok(heroImg && heroImg.getAttribute('src').startsWith('data:image/png'), 'createChatInfo hero renders the data-URI photo (CI5 drop closed)');
  const memberImg = d.querySelector('.c-chat-info__member .c-avatar__img');
  ok(memberImg && memberImg.getAttribute('src').startsWith('data:image/png'), 'createChatInfo member row renders the per-sender data-URI photo');
  const appImg = d.querySelector('.c-tcard__app-icon img');
  ok(appImg && appImg.getAttribute('src').startsWith('data:image/png'), 'app-invite bubble renders the data-URI icon');
}

console.log('missing-bits Batch B — B2 pattern default · B3 tx-details shell · splash boot (#259)');
{
  /* static guards — shell wiring isn't jsdom-loaded; verify source markers. */
  const chat = readFileSync(join(root, 'src/shells/chat.html'), 'utf8');
  const settings = readFileSync(join(root, 'src/shells/settings.html'), 'utf8');
  const home = readFileSync(join(root, 'src/shells/home.html'), 'utf8');
  const launch = readFileSync(join(root, 'src/shells/launch.html'), 'utf8');
  const emptyDetail = readFileSync(join(root, 'src/shells/empty_detail.html'), 'utf8');
  const txShell = readFileSync(join(root, 'src/shells/wallet_sent.html'), 'utf8');
  const buildShells = readFileSync(join(root, 'scripts/build-shells.mjs'), 'utf8');
  // B2: hard-force gone, platform-aware default, forcing script ordered above the pattern read
  ok(!/:root\[data-desktop\] \.c-chat-canvas::before \{ display: none; \}/.test(chat),
    'B2: the #207 desktop pattern hard-force is DELETED from chat.html');
  ok(!/--chat-canvas-base: var\(--neutral-1000\)/.test(chat),
    '★ N81: the desktop dark grey-1000 ground rule is RETIRED (it was #207/B2). #111213 is LIGHTER than Damir\'s new #0f1115, so keeping it would have made desktop dark PALER than mobile — the opposite of what it was written for, plus a second undocumented dark canvas colour');
  ok(/if\(!isFinite\(p\)\)lv=de\?0:1;/.test(chat),
    'B2 + ★ N81: chat boot pattern default is platform-aware — desktop Off (0), mobile Default (1). The value is a LEVEL INDEX now, not an alpha');
  ok(/else if\(p<=0\)lv=0;else if\(p===1\|\|p===2\)lv=p;else lv=p>0\.5\?2:1;/.test(chat),
    '★ N81 MIGRATION: the pre-paint script maps a LEGACY fractional pref (0.3/0.5/0.7) onto the new ladder — old Bold → Strong, everything else → Default. Old and new values overlap only at 0, which means Off in both, so the mapping needs no guessing');
  ok(chat.indexOf("p.get('desktop')==='1'") < chat.indexOf('if(!isFinite(p))lv=de?0:1;'),
    'B2: the ?desktop/?mobile preview-forcing script runs BEFORE the pattern default derives (re-pinned on the #422 literal — the ordering is the contract, not the expression)');
  ok(/const desktop = document\.documentElement\.hasAttribute\('data-desktop'\);/.test(settings)
    && /let pattern = desktop \? 0 : 1/.test(settings)
    && /pattern = readPatternLevel\(localStorage\.getItem\(CHAT_PREFS\.pattern\), pattern\);/.test(settings),
    '★ N81: settings readChatPrefs mirrors the platform-aware default on the new LEVEL ladder (desktop 0 / mobile 1) — the Chat-appearance swatch must pre-select what the chat actually paints');
  // B3: tx tap routed to the detail page; shell contract markers present
  ok(/onTx: \(tx\) => bridge\.send\('ixian:txdetails:' \+ tx\.txid\)/.test(home),
    'B3: home wallet tab routes a tx tap to ixian:txdetails:<txid>');
  ok(/addEntry\(address, username, avatar, amount, fiat, time, type, confirmed\)/.test(txShell)
    && /setData\(amount, fee, time, txid, confirmed\)/.test(txShell)
    && /hideBackButton\(\) \{ buildTopbar\(false\); \}/.test(txShell),
    'B3: wallet_sent.html carries the WalletSentPage contract (#270: the #258 §0 attachCallUi spread is RETIRED)');
  ok(/clearEntries\(\) \{ model\.entries = \[\]; model\.received = false; \}/.test(txShell),
    'B3: a lone clearEntries resets the BUFFER only (never blanks the rendered card)');
  ok(/wallet_sent: \{ in: 'src\/shells\/wallet_sent\.html'/.test(buildShells)
    && /'empty_detail', 'wallet_sent'/.test(buildShells),
    'B3: build-shells maps wallet_sent + includes it in DEFAULT');
  // splash: boot cover on all four shells, input-transparent, dropped in signalReady
  for (const [name, src] of [['home', home], ['settings', settings], ['launch', launch], ['empty_detail', emptyDetail]]) {
    ok(/id="app-boot"/.test(src) && /pointer-events: none;/.test(src)
      && /function dropAppBoot\(\)/.test(src) && /prefers-reduced-motion/.test(src),
      'splash: ' + name + ' has the input-transparent boot cover + reduced-motion-aware teardown');
  }
  ok(/html \{ background: #1b163c; \}/.test(launch) && /data-desktop/.test(launch),
    'splash: launch gained the dark instant-bg + the #228 platform flag');
  // ★ N73 (#391): ONE colour for the launch ground — the instant-bg, the page body and
  // the native surface C# paints behind the WebView. They disagreed (the body carried
  // var(--surface-screen), which is LIGHT in light mode behind a fixed-dark shell), and
  // that disagreement is the wrong status-bar strip Damir reported.
  ok(/html, body \{ margin: 0; height: 100%; background: #1b163c; \}/.test(launch)
    && !/background: var\(--surface-screen\)/.test(launch.slice(0, launch.indexOf('</head>'))),
    '★ N73: the launch page ground is the fixed launch dark, not the themed surface');
  {
    const rd = (pth) => readFileSync(join(root, pth), 'utf8');
    const scp = rd('Spixi/Utils/SpixiContentPage.cs');
    ok(/case "intro\.html":\s*\r?\n\s*return "#1b163c";/.test(scp),
      '★ N73: C# paints the SAME colour behind the launch WebView (pre-paint frame + safe-area ground)');
    {
      /* ★ AND-7 (#401, audit): OnAppearing now calls applyPlatformPageChrome() rather than
       * only the strip repaint — since the root view no longer pads the top, the PAGE's own
       * padding and the shell's --android-inset-top are what keep content clear of the
       * status bar, and both can be stale when a page is walked back to. That method opens
       * with the same setEdgeToEdge call, so the N73 behaviour is preserved, not dropped. */
      const onAppearing = scp.slice(scp.indexOf('protected override void OnAppearing()'));
      ok(/setEdgeToEdge\(liveSurfaceColorString\(\), systemBarSurfaceColorString\(\)\)/.test(scp)
        && /#if ANDROID[\s\S]{0,900}?applyPlatformPageChrome\(\);/.test(onAppearing),
        '★ N73 + AND-7: the Android bar strip follows the PAGE, at page chrome AND on OnAppearing — walking back to a page must repaint it, or the strip keeps the colour of the screen that just left');
    }
    /* ═══ ★ AND-7 (#396/#401) FULL BLEED — the strip stops existing ═══
     * #391 made the Android system-bar strip MATCH each screen; Damir asked for there
     * to be no strip: "full bleed to the top", named for the wallet hero and the launch
     * gradient. Root cause (docs/android-findings.md:47): the window already draws
     * edge-to-edge, but MainActivity's insets listener padded the ROOT CONTENT VIEW
     * down by the status-bar height, so every WebView started below it. */
    {
      const ma = rd('Spixi/Platforms/Android/MainActivity.cs');
      const listener = ma.slice(ma.indexOf('private class InsetsListener'));
      ok(/vg\?\.SetPadding\(0, 0, 0, Math\.Max\(imeInsets\.Bottom, sysInsets\.Bottom\)\);/.test(listener),
        '★ AND-7 (#401): the root view is NO LONGER padded at the top — the page tree, and every WebView with it, reaches y=0. That padding WAS the strip');
      ok(/Math\.Max\(imeInsets\.Bottom, sysInsets\.Bottom\)/.test(listener),
        '★ AND-7: the BOTTOM padding is untouched — it carries the IME inset, and the Android keyboard behaviour was measured on exactly this mechanism (#334/AND-16). Moving it into CSS would double-pad the bottom nav or re-open that round');
      ok(/publishTopInset\(sysInsets\.Top \/ density\)/.test(listener)
        && /DisplayMetrics\?\.Density/.test(listener),
        '★ AND-7: the inset is published in CSS px — Android insets are PHYSICAL pixels and CSS px are DIPs (the removed Android-15 modal hack divided by a hardcoded 3 for the same reason)');
      ok(/addCustomString\("AndroidInsetTop"/.test(ma)
        && /CultureInfo\.InvariantCulture/.test(ma),
        '★ AND-7: it travels as a generatePage carrier (the *SL{SpixiThemeName} grammar) so it lands in the FIRST FRAME — and formats invariant, or a comma-decimal locale would emit "24,5px"');
      const mapp = rd('Spixi/Platforms/Android/MainApplication.cs');
      ok(/status_bar_height/.test(mapp) && /publishTopInset/.test(mapp)
        && mapp.indexOf('publishTopInset') < mapp.indexOf('base.OnCreate();'),
        '★ AND-7: a BOOTSTRAP estimate is registered BEFORE base.OnCreate builds the MAUI app — the first document is generated inside that call, long before the insets listener has ever fired, and without it the very first screen would paint its topbar under the clock');
      ok(/\{ "AndroidInsetTop", "0" \}/.test(rd('Spixi/Lang/SpixiLocalization.cs')),
        '★ AND-7: the key is SEEDED for every platform — an unknown *SL{} key is not silently empty, localizeHtml logs an error for it on every page load (SpixiLocalization:207), and ixian.log is a file the user shares');
      /* the C# page-chrome half */
      const chromeA = scp.slice(scp.indexOf('#if ANDROID', scp.indexOf('internal void applyPlatformPageChrome()')));
      ok(/hasLegacyPageChrome\(loadedHtmlFileName \?\? ""\) \|\| !hasGeneratedContent/.test(chromeA),
        '★ AND-7: only the 8 legacy Raw/html pages and MINI-APP pages keep native top padding. Mini-app content is third-party and cannot be assumed inset-aware — hasGeneratedContent is false exactly there (it never calls loadPage)');
      /* ★ break-my-verdict MINOR-4: the push is only safe INSIDE the redesigned-shell
       * branch. Utils.sendUiCommand emits the command as a BARE GLOBAL IDENTIFIER, and the
       * 8 legacy Raw/html pages and every mini-app WebView do not define window.setInsetTop
       * — an undefined global there throws BEFORE executeUiCommand is entered, so its own
       * try/catch cannot fail soft. That is the #258 addAppRequest class, already shipped
       * once. Pin the containment, not only the branch condition. */
      {
        const elseBranch = chromeA.slice(chromeA.indexOf('this.Padding = new Thickness(0);'));
        ok(/Utils\.sendUiCommand\(this, "setInsetTop"/.test(elseBranch)
          && chromeA.split('Utils.sendUiCommand(this, "setInsetTop"').length === 2,
          '★ AND-7: the setInsetTop push fires ONLY for redesigned shells — exactly one call site, inside the branch that already proved the page is one of ours');
      }
      /* ★ AND-7b (#407, Damir F5 2026-08-19): full bleed put the WebView UNDER the status
       * bar, so the pixels behind the clock are what the SHELL paints — and the home shell
       * paints a themed topbar on Chats/Apps and the DARK HERO on Wallet. One page-level
       * colour cannot be right for both, which is what put dark glyphs over the hero.
       * Damir's rule: wallet + launch always carry light glyphs, everything else follows
       * the app theme. Pin the per-tab override AND the repaint that delivers it — a tab
       * switch navigates nothing, so nothing else would repaint. */
      ok(/protected virtual string systemBarSurfaceColorString\(\)/.test(scp)
        && /SPlatformUtils\.setEdgeToEdge\(liveSurfaceColorString\(\), systemBarSurfaceColorString\(\)\)/.test(scp)
        && !/setEdgeToEdge\([a-zA-Z.]*pageSurfaceColorString/.test(scp.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')),
        '★ AND-7b (#407): the STATUS-bar glyphs are decided by a per-PAGE-overridable surface, not by the page background — since full bleed, the two are different questions');
      /* ★ AND-7d (#409, Damir F5): and they are THREE questions, not two. The root-view
       * background is still visible at the BOTTOM (MainActivity keeps padding there), so it
       * is literally the strip behind the OS navigation controls — passing the wallet HERO
       * for both painted the navigation bar blue. */
      {
        const plat409 = rd('Spixi/Platforms/Android/SPlatformUtils.cs');
        ok(/setEdgeToEdge\(string surfaceColor = null, string topColor = null\)/.test(plat409)
          && /AppearanceLightStatusBars = topLuma > 0\.5;/.test(plat409)
          && /AppearanceLightNavigationBars = luma > 0\.5;/.test(plat409),
          '★ AND-7d (#409): the STATUS bar reads the TOP colour and the NAVIGATION bar reads the BOTTOM one — they sit on different surfaces since full bleed, and one colour for both turned the nav bar blue on the wallet tab');
        ok(/protected string liveSurfaceColorString\(\)/.test(scp),
          '★ AND-7e (#410): BOTH bar colours resolve live. The bottom used to read the field refreshed only by applyPlatformPageChrome, so a tab switch or a theme change painted the navigation bar one theme behind — Damir\'s screenshots inverted cleanly in both directions, which is a cache and not a race');
        ok(/rootView\.SetBackgroundColor\(bgColor\);/.test(plat409),
          '★ AND-7d: the root view is still painted with the BOTTOM colour — that background is what shows behind the OS navigation controls');
        for (const stub of ['Windows', 'MacCatalyst', 'iOS']) {
          ok(/setEdgeToEdge\(string surfaceColor = null, string topColor = null\)/.test(
            rd('Spixi/Platforms/' + stub + '/SPlatformUtils.cs')),
            '★ AND-7d: the ' + stub + ' stub keeps signature parity — every platform defines this method and a shared caller must compile everywhere');
        }
      }
      {
        const hpBar = rd('Spixi/Pages/Home/HomePage.xaml.cs')
          .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
        ok(/protected override string systemBarSurfaceColorString\(\)/.test(hpBar)
          && /currentTab == "tab2"[\s\S]{0,200}?ThemeManager\.getHeroColorString\(\)/.test(hpBar),
          '★ AND-7b: the WALLET tab reports the HERO colour, so its glyphs stay light over the dark hero (Damir\'s rule: wallet and launch always light, the rest follow the theme)');
        const tabBranch = hpBar.slice(hpBar.indexOf('currentTab = current_url.Split'),
          hpBar.indexOf('else if (current_url.Equals("ixian:downloads"'));
        ok(tabBranch.length > 100 && /repaintOwnSystemBars\(\);/.test(tabBranch),
          '★ AND-7b: the tab switch REPAINTS the bars. A tab change navigates nothing and closes no overlay, so without this the glyph colour would keep the previous tab\'s answer');
        ok(/getHeroColorString/.test(rd('Spixi/Utils/ThemeManager.cs')),
          '★ AND-7b: the hero colour has ONE definition, themed, mirroring tokens.css --surface-hero');
      }
      /* ★ AND-7c (#408, Damir F5 2026-08-19): the bar colour must be resolved LIVE.
       * `pageSurfaceColorString` is baked once at loadPage time, so after a theme change
       * it sits one theme behind the shell — proven on device in ONE frame: the wallet
       * override (live) said #3050bd while the default (cached) said #13171b, in the same
       * session, and both branch on the same resolved appearance. */
      ok(/return liveSurfaceColorString\(\);/.test(
        scp.slice(scp.indexOf('protected virtual string systemBarSurfaceColorString()'),
          scp.indexOf('// ★ N73 (#391): the same answer as a hex string')))
        && /return surfaceColorStringFor\(loadedHtmlFileName \?\? ""\);/.test(
          scp.slice(scp.indexOf('protected string liveSurfaceColorString()'),
            scp.indexOf('protected virtual string systemBarSurfaceColorString()'))),
        '★ AND-7c (#408): the bar surface is resolved LIVE from the theme, never read from the field cached at page load — a cached answer is how light glyphs ended up over the light Chats and Apps tabs');
      ok(/applyPageSurfaceColor\(\);\s*\r?\n#if IOS \|\| MACCATALYST/.test(scp),
        '★ AND-7c: every chrome pass re-derives the page surface too, on BOTH platforms — otherwise the pre-paint frame behind the WebView stays one theme behind the shell, which is the other half of "the OS theme switch does not follow through"');
      {
        const app = rd('Spixi/App.xaml.cs');
        const setp = rd('Spixi/Pages/Settings/SettingsPage.xaml.cs');
        ok(/SpixiContentPage\.repaintSystemBarsFor\(null\);/.test(app)
          && /SpixiContentPage\.repaintSystemBarsFor\(null\);/.test(setp)
          && !/SPlatformUtils\.setEdgeToEdge\(\);/.test(app.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''))
          && !/SPlatformUtils\.setEdgeToEdge\(\);/.test(setp.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')),
          '★ AND-7c: BOTH theme-change paths repaint from the page that is VISIBLE, not from the raw theme. The argument-less setEdgeToEdge always answers with the themed screen surface — wrong on exactly the screens whose glyphs must stay light (wallet hero, launch, lock)');
      }
      ok(!/MainActivity\.Insets\.Value\.Top \/ 3/.test(scp.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')),
        '★ AND-7: the Android-15 modal `Insets.Top / 3` hack is GONE — it existed because the root padding did not reach a modal container; with no root top padding every page is unpadded the same way and the lock/call/scan shells pad themselves');
      ok(/hasLegacyPageChrome\(loadedHtmlFileName \?\? ""\) \|\| !hasGeneratedContent/.test(
        scp.slice(scp.indexOf('#if IOS || MACCATALYST', scp.indexOf('internal void applyPlatformPageChrome()')),
          scp.indexOf('#if ANDROID', scp.indexOf('internal void applyPlatformPageChrome()')))),
        '★ security-review MAJOR #6(b), fixed with its Android twin: mini-app pages lost their iOS safe-area inset at #282 and have been rendering under the notch since — same one-token classification');
    }
    {
      /* the CSS half */
      const base = rd('src/styles/base.css');
      ok(/--safe-top: max\(env\(safe-area-inset-top, 0px\), var\(--android-inset-top, 0px\)\)/.test(base),
        '★ AND-7: ONE expression for the top safe area. iOS populates env(); Android env() is CUTOUT-ONLY (0 on an ordinary status bar), so the real inset arrives as a variable — max() is correct on both, and an unset variable degrades to the pre-batch geometry');
      {
        /* ★ break-my-verdict NIT-2: every USE site carries `, 0px`. The migration replaced
         * env(...) — which always resolves — with a bare var(); if base.css were ever
         * absent or ordered late, `calc(var(--layout-bar-top) + var(--safe-top))` would be
         * invalid-at-computed-value and the topbar height would COLLAPSE rather than
         * degrade to zero inset, which is what base.css's own header promises. */
        const bare = [];
        const walkUse = (dir) => {
          for (const f of readdirSync(dir, { withFileTypes: true })) {
            const full = join(dir, f.name);
            if (f.isDirectory()) walkUse(full);
            else if (/\.(css|html)$/.test(f.name) && !full.endsWith('base.css')) {
              const t = readFileSync(full, 'utf8')
                .replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')
                .replace(/probeMeasure\([^)]*\)/g, '');
              if (/var\(--safe-top\)/.test(t)) bare.push(f.name);
            }
          }
        };
        walkUse(join(root, 'src/styles'));
        walkUse(join(root, 'src/shells'));
        ok(bare.length === 0,
          '★ AND-7: every --safe-top USE site carries the 0px fallback, so base.css\'s stated degradation holds by construction' + (bare.length ? ' — BARE: ' + bare.join(', ') : ''));
      }
      ok(!/--safe-bottom|--android-inset-bottom/.test(base),
        '★ AND-7: there is deliberately NO bottom twin — MainActivity still pads the root bottom (the IME inset), so a bottom variable would double-pad');
      /* ★ THE STRUCTURAL PIN: no site may reach for the raw top env() again. Android
       * reads 0 there, so a new raw site is invisible on the platform this fixes. */
      /* ★ #412 (Damir's 2026-08-19 log): NO source may contain an EMPTY carrier, even
       * inside a COMMENT. localizeHtml is line-by-line and substitutes any match it
       * finds, so `*SL{}` wrote `Unknown localization key;` to ixian.log on every single
       * generation of that document — noise in the one file the user shares with us —
       * and blanked the surrounding comment text in the built output. */
      {
        const emptyCarrier = [];
        for (const d of ['src/shells', 'src/components']) {
          for (const f of readdirSync(join(root, d))) {
            if (!/\.(html|js)$/.test(f)) continue;
            if (readFileSync(join(root, d, f), 'utf8').includes('*SL{}')) emptyCarrier.push(f);
          }
        }
        ok(emptyCarrier.length === 0,
          '★ #412: no source carries an EMPTY *SL{} carrier — the localizer substitutes matches inside COMMENTS too, and an empty one writes an error line to ixian.log on every page generation' + (emptyCarrier.length ? ' — OFFENDERS: ' + emptyCarrier.join(', ') : ''));
      }
      const cssDirC = join(root, 'src/styles');
      const scanTop = [];
      /* CODE only. Every shell head DOCUMENTS why Android cannot use env(safe-area-inset-top)
       * — a pin that greps raw text would be satisfied by its own explanation, which is the
       * mutation-dead class this suite has been bitten by before (#340 r2). */
      /* One legitimate raw reader survives: the dev-HUD probe MEASURES env() on purpose,
       * to print it beside the variable so a wrong number can be attributed. */
      const codeOnly = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')
        .replace(/probeMeasure\([^)]*\)/g, '');
      const walkCss = (dir) => {
        for (const f of readdirSync(dir, { withFileTypes: true })) {
          const full = join(dir, f.name);
          if (f.isDirectory()) walkCss(full);
          else if (/\.css$/.test(f.name) && codeOnly(readFileSync(full, 'utf8')).includes('env(safe-area-inset-top')
            && !full.endsWith('base.css')) scanTop.push(f.name);
        }
      };
      walkCss(cssDirC);
      for (const f of readdirSync(join(root, 'src/shells'))) {
        if (f.endsWith('.html') && codeOnly(readFileSync(join(root, 'src/shells', f), 'utf8')).includes('env(safe-area-inset-top')) scanTop.push(f);
      }
      ok(scanTop.length === 0,
        '★ AND-7 STRUCTURAL: NO component or shell reads env(safe-area-inset-top) directly any more — every top site goes through --safe-top. A raw env() site is silently 0 on Android, i.e. invisible on the platform this batch fixes' + (scanTop.length ? ' — OFFENDERS: ' + scanTop.join(', ') : ''));
      ok(/padding-block-start: var\(--safe-top, 0px\)/.test(rd('src/styles/components/wallet-hero.css')),
        '★ AND-7 (Damir\'s named ask): the WALLET HERO gradient bleeds to y=0 and its content clears the status bar');
      ok(/padding-top: max\(var\(--spacing-16\), var\(--safe-top, 0px\)\)/.test(rd('src/styles/components/launch-shell.css')),
        '★ AND-7 (Damir\'s named ask): the LAUNCH gradient bleeds to y=0');
      ok(/height: calc\(var\(--layout-bar-top\) \+ var\(--safe-top, 0px\)\)/.test(rd('src/styles/components/topbar.css'))
        && /padding-top: var\(--safe-top, 0px\)/.test(rd('src/styles/components/topbar.css')),
        '★ AND-7: every shell topbar GROWS by the inset and keeps painting its own surface under the status bar — the #282 iOS rule, now true on Android too');
    }
    {
      /* every shell must carry the pre-paint carrier, or that shell alone paints under
       * the status bar — the #288 DEFAULT-membership class of miss, one level down. */
      /* ★ break-my-verdict MINOR-3: the numeric-guard check used to read home.html ALONE,
       * so rewriting the head script in any of the other 17 shells to drop the validation
       * kept every AND-7 pin green. The guard is the SECURITY property — a value that
       * arrives through the same *SL{} substitution channel as every other carrier, and
       * through a runtime push — so it is asserted BYTE-FOR-BYTE in the sweep instead. */
      const GUARD = "function a(v){if(/^\\d{1,3}(\\.\\d{1,2})?$/.test(String(v)))document.documentElement.style.setProperty('--android-inset-top',v+'px');}";
      const missing = [];
      const unguarded = [];
      for (const f of readdirSync(join(root, 'src/shells'))) {
        if (!f.endsWith('.html')) continue;
        const html = readFileSync(join(root, 'src/shells', f), 'utf8');
        if (!/\*SL\{AndroidInsetTop\}/.test(html)
          || !/setProperty\('--android-inset-top'/.test(html)) missing.push(f);
        if (!html.includes(GUARD) || !/window\.setInsetTop\s*=/.test(html)) unguarded.push(f);
      }
      ok(missing.length === 0,
        '★ AND-7: EVERY shell sets --android-inset-top before first paint' + (missing.length ? ' — MISSING: ' + missing.join(', ') : ''));
      ok(unguarded.length === 0,
        '★ AND-7 SECURITY, all 18: BOTH entry points — the baked carrier and the runtime setInsetTop push — go through the SAME numeric validation before anything reaches a style property' + (unguarded.length ? ' — OFFENDERS: ' + unguarded.join(', ') : ''));
      const home = rd('src/shells/home.html');
      {
        const cp = rd('Spixi/Pages/Call/CallPage.xaml.cs');
        ok(/#elif ANDROID[\s\S]{0,900}?stripHeight \+= Spixi\.MainActivity\.TopInsetDip;/.test(cp)
          && /stripHeight \+= win\.SafeAreaInsets\.Top;/.test(cp),
          '★ AND-7 audit MAJOR-1: the in-call STRIP grows by the inset on BOTH platforms. call.html\'s bar grew by --safe-top, and on Android the native stage stayed 64dip — inside `body { overflow: hidden }` that clips the identity row and the HANG-UP control, on the one surface a user must be able to hit during a call');
        /* ★ break-my-verdict MINOR-2: this is a TWO-SIDED contract and only the C# side was
         * pinned. Deleting either CSS line reaches the same user-visible failure from the
         * other direction, and the structural env() sweep cannot see a REMOVED site. */
        const callSrc = rd('src/shells/call.html');
        ok(/height: calc\(var\(--call-bar-h\) \+ var\(--safe-top, 0px\)\)/.test(callSrc)
          && /padding-top: var\(--safe-top, 0px\)/.test(callSrc),
          '★ AND-7 MAJOR-1, the OTHER half: the bar GROWS by and PADS by the same inset the native stage grew by. If the two ever disagree the hang-up control is clipped or sits under the clock');
      }
      {
        /* ★ N77 (#413, Damir 2026-08-19): MEASURE the community-bot open before building
         * a loading affordance for it. His stated mechanism — "entering re-renders each
         * message" — is already handled (the burst suppresses every render and paints
         * once), so the 10-20 s is elsewhere. Leading candidate: opening the chat runs
         * OnAppearing -> reloadScreen -> loadMessages, a SECOND full flush of the same
         * history while the first is still streaming. TWO bursts with the same n proves
         * it and needs no new UI; ONE long burst means the delivery really is that slow. */
        const chatSrc = rd('src/shells/chat.html');
        ok(/loadProbeBurstStart\(\);/.test(chatSrc) && /loadProbeBurstEnd\(\);/.test(chatSrc)
          && /if \(bursting\) \{ loadProbeRow\(\); armBurstSafety\(\); return; \}/.test(chatSrc),
          '★ N77 (#413): the chat open is MEASURED at all three points — burst start, every row (the one choke point each insert already passes through), and burst end');
        {
          /* ★ #420: the dev-only i18n exemption is CAPPED. It exists so an engineering
           * instrument can render English without evading the linter by assembling the
           * literal in a variable — which would have been easier and strictly worse. A
           * cap is what stops "dev-only" becoming the way copy gets shipped untranslated. */
          const marked = [];
          for (const d of ['src/shells', 'src/components']) {
            for (const f of readdirSync(join(root, d))) {
              if (!/\.(html|js)$/.test(f)) continue;
              const t = readFileSync(join(root, d, f), 'utf8');
              const n = (t.match(/i18n-lint-ok:dev/g) || []).length;
              if (n) marked.push(f + '×' + n);
            }
          }
          ok(marked.length === 1 && marked[0] === 'chat.html×1',
            '★ #420: the i18n dev exemption is used ONCE, on the load probe. It is greppable and counted by the linter on purpose — "dev-only" must never become the door untranslated copy walks through (found: ' + (marked.join(', ') || 'none') + ')');
        }
        ok(/if \(now - loadProbeLastPaint < 200\) return;/.test(chatSrc),
          '★ N77 (#416): the line repaints WHILE the burst runs, throttled to 200 ms. The first cut painted only at start and end, so mid-load it read n=0 — useless at the one moment it is being looked at — and an unthrottled write per message would pollute the hot path it measures');
        ok(/slCarrier\('sl-devmode', 'false'\) === 'true'/.test(chatSrc)
          && /\*SL\{devMode\}/.test(chatSrc),
          '★ N77: dev-mode gated through the carrier HomePage already registers at boot — no new verb, no storage, nothing rendered when dev mode is off');
      }
      ok(/probeMark\('rdy'\)/.test(home) && /probeMark\('flush'\)/.test(home)
        && /probeMark\('done'\)/.test(home) && /probeMark\('zero'\)/.test(home)
        && /INSET var=/.test(home),
        '★ SHIP THE MEASUREMENT (#294/#304): the dev HUD prints the three inset numbers AND the four boot marks. F-5 ("empty states pop in a second late") has two candidate mechanisms and this line says which — rdy late ⇒ the burst, only zero late ⇒ the gate');
    }

    const plat = rd('Spixi/Platforms/Android/SPlatformUtils.cs');
    ok(/setEdgeToEdge\(string surfaceColor = null, string topColor = null\)/.test(plat)
      && /0\.299 \* bgColor\.R/.test(plat) && /0\.299 \* topBgColor\.R/.test(plat),
      '★ N73 + AND-7d: bar ICON appearance reads the luminance of the colour actually painted, not the app theme — and since full bleed it reads TWO of them, because the status bar and the navigation bar no longer sit on the same surface');
    /* ★ F-4 (#395/#399): THIS PIN SHIPPED THE BUG. It counted two `repaintSystemBars`
     * call sites and passed while BOTH were in `closeOverlay` — the method the resume
     * lock never reaches. It measured the fix's existence, not its reach (#395's lesson).
     * Pin the two methods the two lock-close PATHS actually run through, by slicing them
     * out of the file: the resume lock closes via `closeModalOverlay`, and the cold-start
     * lock rewrites the navigation stack from `LockPage.performUnlock`. */
    const modalClose = scp.slice(scp.indexOf('public static bool closeModalOverlay('),
      scp.indexOf('public static void setOverlayHost('));
    ok(modalClose.length > 100 && /repaintSystemBars\(/.test(modalClose),
      '★ F-4 (#395): the RESUME lock repaints from closeModalOverlay — the method LockPage.performUnlock and the ixian:change confirm path actually call. The old pin passed with both call sites in closeOverlay, which that lock never enters');
    ok(/repaintSystemBars\(visibleSurfacePage\(host\)\);/.test(scp),
      '★ N73 review MAJOR-4 (kept): an OVERLAY hands the strip back when it closes. Nothing navigates on that path, so neither page chrome nor OnAppearing fires');
    ok(/private static SpixiContentPage\? visibleSurfacePage\(/.test(scp)
      && /public static void repaintSystemBarsFor\(/.test(scp),
      '★ F-4: an overlay still open UNDER the thing that closed is what the user sees — the repaint asks for the TOP surface, not always the host');
    {
      /* ★ break-my-verdict MINOR-1: ONE broad pin over performUnlock passed with EITHER of
       * its two calls deleted, and the third leg — the ixian:change confirm path, which
       * lives in onNavigating — had no pin at all. That is the #395 lesson one level down.
       * Three legs, three assertions, each mutation-proven by deleting its own call. */
      const lock = rd('Spixi/Pages/Launch/LockPage.xaml.cs');
      const unlock = lock.slice(lock.indexOf('private async void performUnlock()'),
        lock.indexOf('protected override bool OnBackButtonPressed()'));
      const chg = lock.slice(lock.indexOf('current_url.Equals("ixian:change"'),
        lock.indexOf('private async void performUnlock()'));
      const cut = unlock.indexOf('Navigation.InsertPageBefore(');
      ok(chg.length > 50 && /repaintSystemBarsFor\(null\)/.test(chg),
        '★ F-4 leg 1: the ixian:change CONFIRM path repaints — it takes the same modal-fallback pop, and it had no pin at all');
      ok(cut > 0 && /repaintSystemBarsFor\(null\)/.test(unlock.slice(0, cut)),
        '★ F-4 leg 2: the MODAL-FALLBACK unlock repaints. That leg is ALWAYS taken by the SettingsPage delete flows — the lock is staged on SettingsPage while the overlay host is HomePage, so closeModalOverlay returns false and PopModalAsync is not a navigation');
      ok(cut > 0 && /repaintSystemBarsFor\(home\)/.test(unlock.slice(cut)),
        '★ F-4 leg 3: the COLD-START lock unlocks by REWRITING the navigation stack (InsertPageBefore + removePage) — no navigation, no overlay teardown, so nothing else repaints the strip it painted its own fixed dark');
    }

    /* —— the launch merge: what the review broke and the fixes that hold —— */
    const lp = rd('Spixi/Pages/Launch/LaunchPage.xaml.cs');

    /* ★ F-2 (#395/#399): the view report + its instrumentation. */
    ok(/verb\.StartsWith\("ixian:view:", StringComparison\.Ordinal\)/.test(lp),
      '★ F-2: the view report is dispatched on the ANCHORED verb, the same grammar every payload verb uses (#393 MAJOR-2) — not a Contains() over the whole URL');
    ok(/v == "welcome" \|\| v == "create" \|\| v == "restore" \|\| v == "retry"/.test(lp),
      '★ F-2: the reported view is CLAMPED to the four we know. This field decides whether the hardware back button is swallowed, so it never takes an arbitrary string off a navigation URL');
    ok(/current_url\.Equals\("ixian:create", StringComparison\.Ordinal\)/.test(lp)
      && /current_url\.Equals\("ixian:restore", StringComparison\.Ordinal\)/.test(lp)
      && /current_url\.Equals\("ixian:back", StringComparison\.Ordinal\)/.test(lp),
      '★ F-2: the three legacy bare verbs stay handled — they cost nothing and a STALE built intro.html (the #288 class) still tracks its view through them');
    /* ★ audit MAJOR-3: the COMPONENT end and the C# end were both pinned; the wire
     * between them was not. Gutting `onViewChange` in the shell reproduces the reported
     * bug (hardware back exits the app from create/restore) with a fully green suite. */
    {
      const lhF2 = rd('src/shells/launch.html');
      ok(/onViewChange: \(v\) => bridge\.send\('ixian:view:' \+ v\)/.test(lhF2),
        '★ F-2 (#399) THE WIRE: launch.html actually passes onViewChange, and it sends the verb C# dispatches. Without this line the component reports into a void and C# never learns which view is on screen');
      ok(!/bridge\.send\('ixian:create'\)/.test(lhF2) && !/bridge\.send\('ixian:restore'\)/.test(lhF2)
        && !/bridge\.send\('ixian:back'\)/.test(lhF2),
        '★ F-2: the three per-hook reports are GONE from the shell — two sources of truth for one field is how the retry lockout and the form Back controls went unreported in the first place');
    }
    ok(/logVerbName\(verb\);/.test(lp) && /Logging\.info\("LaunchPage back: view=" \+ currentView\);/.test(lp),
      '★ F-2 (#215, Damir: do NOT guess): both halves are instrumented — which verbs arrive, and what the field says when back is pressed. One F5 separates "the report never lands" from "the handler never runs"');
    {
      /* ★ SECURITY (handover gate): three verbs on this page carry a WALLET PASSWORD, and
       * ixian.log is a file the user SHARES from Account → Developer. The logger must cut
       * at the verb name and never touch the payload. */
      const logger = lp.slice(lp.indexOf('private static void logVerbName('),
        lp.indexOf('protected override bool OnBackButtonPressed()'));
      ok(logger.length > 100
        && /verb\.IndexOf\(':', "ixian:"\.Length\)/.test(logger)
        && /Substring\(0, sep \+ 1\)/.test(logger),
        '★ F-2 SECURITY: the verb logger cuts at the SECOND colon — "ixian:create:bob:hunter2" reaches ixian.log as "ixian:create:". A raw log line here would write the wallet password into a file the user shares with the engineer');
      /* ★ audit MAJOR-2: the pin that used to sit here COULD NOT FAIL — it was `A || B`
       * with A unsatisfiable, so appending `+ " raw=" + verb` to the log line (writing the
       * nickname AND the wallet password into the file the user shares from Account →
       * Developer) passed the suite. Assert the property directly instead: inside this
       * method, the ONLY thing that may reach a Logging call is the cut `name` or one of
       * the two fixed strings. `verb` itself must never appear in a logging argument. */
      const logCalls = (logger.match(/Logging\.[a-z]+\([^;]*\);/g) || [])
        .map((c) => c.replace(/"(?:[^"\\]|\\.)*"/g, '""'));   // the FIXED strings say "verb:" — test the EXPRESSIONS
      ok(logCalls.length >= 3 && logCalls.every((c) => !/\bverb\b/.test(c)),
        '★ F-2 SECURITY: the RAW verb never reaches a Logging call — only the cut name or a fixed string. ixian:create:/restore:/proceed: all carry a WALLET PASSWORD, and ixian.log is shared with the engineer (found ' + logCalls.length + ' log calls)');
      ok(/char\.IsLetterOrDigit\(c\)/.test(logger),
        '★ F-2 SECURITY (#385 NIT-3): the name is alphabet-clamped before it reaches ixian.log — DevPage renders that file and offers it through the share sheet, so a control character could forge log lines');
    }
    ok(/int verb_start = current_url\.IndexOf\("ixian:", StringComparison\.Ordinal\);/.test(lp)
      && /verb\.StartsWith\("ixian:create:", StringComparison\.Ordinal\)/.test(lp)
      && /verb\.StartsWith\("ixian:restore:", StringComparison\.Ordinal\)/.test(lp)
      && /verb\.StartsWith\("ixian:proceed:", StringComparison\.Ordinal\)/.test(lp)
      && !/current_url\.Contains\("ixian:(create|restore|proceed):"\)/.test(lp),
      '★ N75 review MAJOR-2 (MONEY PATH): the merged handler dispatches on the ANCHORED verb. A Contains() test for "ixian:create:" runs before the restore and unlock branches and would match a PASSWORD containing that literal — a restore would have generated a new wallet with an EMPTY password instead of restoring');
    ok(/string payload = current_url\.Substring\(current_url\.IndexOf\("ixian:create:", StringComparison\.Ordinal\)/.test(lp)
      && /current_url\.Split\(new string\[\] \{ "ixian:restore:" \}/.test(lp)
      && /current_url\.Split\(new string\[\] \{ "ixian:proceed:" \}/.test(lp),
      '★ N75 GUARDRAIL: only the branch SELECTION moved to the anchored verb — all three password PARSES still slice current_url exactly as they always did. Existing wallets were encrypted under today\'s decode-and-parse behaviour, so changing one is a lockout vector');
    ok(/private void setCurrentView\(string view\)/.test(lp)
      && /addCustomString\("LaunchBootView", currentView\);/.test(lp)
      && !/currentView = view;\s*\r?\n\s*Utils\.sendUiCommand/.test(lp),
      '★ N75 review MINOR-2: the boot carrier is re-registered on EVERY view change. reload()/reloadAllPages() regenerate the page at any time (an OS theme flip does), and a stale carrier would re-boot the shell on welcome while C# still believed it was on create — after which one hardware back does nothing');
    const goHomeBody = lp.slice(lp.indexOf('private void goHome()'));
    ok(/private void goHome\(\)/.test(lp)
      && /await Navigation\.PushAsync\(HomePage\.Instance\(true\), Config\.defaultXamarinAnimations\);\s*\r?\n\s*removePage\(this\);/.test(goHomeBody.slice(0, 600))
      && !/\n\s*Navigation\.PushAsync\(HomePage\.Instance\(true\)/.test(goHomeBody.slice(0, 600))
      && (lp.match(/goHome\(\);/g) || []).length === 3,
      '★ N75 review MINOR-3: restore and unlock AWAIT the push before dropping this page. Since the merge this page is the navigation ROOT, and RemovePage on a root that is still displayed is rejected — removePage swallows that and Disposes anyway, leaving a disposed page under Home');
    const lh = rd('src/shells/launch.html');
    ok(!/onBack: \(\) => \{ activeCtrl = null/.test(lh) && /let activeCtrl = null;/.test(lh),
      '★ N75 review MAJOR-1: Back does NOT drop the in-flight control. The form back stays live during a submit, so Back then a wallet-generation failure would arrive at a null control, lose the release, and leave the form dead behind the loading morph — the #334 L1 wedge, which popping the page used to make impossible');
    const ls = rd('src/components/launch-shell.js');
    ok(/st\.scrubs\.forEach\(\(s\) => \{ try \{ s\(\); \}/.test(ls.slice(ls.indexOf('export function setLaunchView'))),
      '★ N75 review MINOR-1 (SECURITY §5): the C#-driven view switch — hardware back, the retry lockout — scrubs every password field. It used to POP the page, so the typed wallet password left with the WebView; now it would sit in a hidden input, still revealed if the user had unmasked it');
    const hpN76 = rd('Spixi/Pages/Home/HomePage.xaml.cs');
    /* ★ F-1 (#399) SUPERSEDES the #393 predicate this pin was written for. `friend.approved`
     * is DEAD for this purpose — Ixian-Core defaults it to true and no outgoing-request site
     * in this app clears it, so the guard was true from the moment you SENT a request and the
     * nudge fired on the community bot one second after the Join tap. The live predicate is
     * the STATE; the full pin lives beside the asset gate in the #383 block. */
    ok(/friend\.state == FriendState\.Approved && !friend\.pendingDeletion && !friend\.bot/.test(hpN76),
      '★ N76 review MAJOR-3, as corrected by F-1 (#399): an "asset" is a contact in the APPROVED STATE, not queued for deletion and not the bot — the flag this pin used to read is true from the moment a request is sent');
  }
}

console.log('#275 composer lock (legacy states) · #276 address-truncation sweep');
{
  /* static guards — C# + shell wiring (jsdom-blind surfaces). */
  const scp = readFileSync(join(root, 'Spixi/Pages/Chat/SingleChatPage.xaml.cs'), 'utf8');
  ok(/friend\.state != FriendState\.Approved && friend\.state != FriendState\.RequestReceived/.test(scp),
    '#275: onLoad locks the composer for ANY non-approved 1:1 (legacy states included)');
  const home276 = readFileSync(join(root, 'src/shells/home.html'), 'utf8');
  ok(/const cpIsAddr = looksLikeAddress\(cp\);/.test(home276)
    && /const cpDisplay = cpIsAddr \? truncateAddressMiddle\(cp\) : cp;/.test(home276)
    && /address: walletHidden \? '' : \(cpIsAddr \? cp : ''\)/.test(home276)
    && /tx\.address = walletHidden \? '' : \(tx\._raw\.address \|\| ''\)/.test(home276),
    '#276: wallet tx rows truncate an address-shaped counterparty (raw kept for search while visible; masked under global hide — #273-#281 review)');
  const txShell276 = readFileSync(join(root, 'src/shells/wallet_sent.html'), 'utf8');
  ok(/nameIsAddr \? truncateAddressMiddle\(e\.name\) : e\.name/.test(txShell276),
    '#276: tx detail title truncates an address-shaped counterparty (full address stays on the copy row)');
  const contactsSrc = readFileSync(join(root, 'src/components/contacts-shell.js'), 'utf8');
  ok(/function hasNick\(c\) \{ return !!c\.name && c\.name !== c\.address; \}/.test(contactsSrc)
    && /truncateAddressMiddle\(c\.address, 9, 6\)/.test(contactsSrc),
    '#276: contacts rows title nameless/echo contacts as the truncated address');
  // #277: tx-row title = chat-row parity (body-lg regular); amount keeps label-lg semibold.
  const txCss = readFileSync(join(root, 'src/styles/components/txlist-item.css'), 'utf8');
  ok(/\.c-txlist-item__name \{[^}]*var\(--font-size-body-lg\)/s.test(txCss)
    && !/\.c-txlist-item__name \{[^}]*font-weight/s.test(txCss)
    && /\.c-txlist-item__amount \{[^}]*var\(--font-size-label-lg\)/s.test(txCss),
    '#277: tx-row name rides body-lg regular (chat-row parity); amount keeps its emphasis');
  // #278: misstx pill collapses by MEASUREMENT (pane-width aware), not viewport only.
  const walletJs = readFileSync(join(root, 'src/components/wallet-shell.js'), 'utf8');
  const walletCss = readFileSync(join(root, 'src/styles/components/wallet-shell.css'), 'utf8');
  ok(/typeof ResizeObserver === 'function'/.test(walletJs)
    && /row\.dataset\.compact = ''/.test(walletJs)
    && /\.c-wallet-filters\[data-compact\] \.c-wallet-misstx__label \{ display: none; \}/.test(walletCss),
    '#278: Missing-a-transaction pill collapses to the info glyph when the ROW overflows (desktop pane)');

  /* ————— #288 (Opus #46 review of #284–#287) — regression pins ————————————————— */
  // MAJOR: toggling global hide left an OPEN desktop tx-detail pane rendering amount /
  // fiat / fee / counterparty and the FULL base58 address + copy button. #285 only closed
  // hide-THEN-open. THIRD regression of this class (mobile sheet → #284, desktop pane →
  // #285, live pane → #288), so both halves get pinned: the C# re-push and the shell's
  // fail-SAFE default.
  const homeCs288 = readFileSync(join(root, 'Spixi/Pages/Home/HomePage.xaml.cs'), 'utf8');
  const balIdx288 = homeCs288.indexOf('ixian:balance:');
  const balBranch288 = balIdx288 >= 0 ? homeCs288.slice(balIdx288, balIdx288 + 1800) : '';
  ok(/getOverlayPages\(\)/.test(balBranch288)
    && /is WalletSentPage/.test(balBranch288)
    && /"setHideBalance"/.test(balBranch288),
    '#288: the balance toggle re-pushes setHideBalance to every OPEN tx-detail overlay');
  const txShell288 = readFileSync(join(root, 'src/shells/wallet_sent.html'), 'utf8');
  ok(/function isMasked\(\) \{ return \(walletHidden \|\| !hideKnown\) && !revealed; \}/.test(txShell288)
    && /function canReveal\(\) \{ return hideKnown && walletHidden && !revealed; \}/.test(txShell288)
    && /const firstKnown = !hideKnown;/.test(txShell288)
    && /if \(h === walletHidden && !firstKnown\) return;/.test(txShell288),
    '#288: the tx-detail mask is fail-SAFE — masked until the hide flag actually arrives');
  // #288 F5: a lone clearEntries (every unchanged 1 Hz re-poll on a NON-Final tx) must not
  // empty the committed model — otherwise the per-view reveal re-renders a blank card.
  ok(/const staging = \{ entries: \[\], received: false \};/.test(txShell288)
    && /clearEntries\(\) \{ staging\.entries = \[\]; staging\.received = false; \}/.test(txShell288)
    && /setReceivedMode\(\) \{ staging\.received = true; \}/.test(txShell288)
    && /model\.entries = staging\.entries\.slice\(\);/.test(txShell288)
    && /model\.received = staging\.received;/.test(txShell288),
    '#288: the tx burst STAGES and commits at setData — render() is idempotent for every caller');
  // The pending strip / request card REPLACE the composer, so they are the chat's
  // bottom-most chrome and must own the iOS home-indicator inset (#282 edge-to-edge).
  const chat288 = readFileSync(join(root, 'src/shells/chat.html'), 'utf8');
  ok(/padding-block-end: calc\(var\(--spacing-12\) \+ env\(safe-area-inset-bottom, 0px\)\);/.test(chat288)
    && /\.chat-request-pane > \.c-contact-request \{/.test(chat288),
    '#288: the pending strip + request card own the iOS home-indicator inset');
  // The #286 wrap escalation latched data-compact from the PRE-wrap measurement, so a
  // wrapped pill rendered a lone ⓘ with its line otherwise blank (the affordance's NAME
  // invisible — the whole point of #98).
  const walletJs288 = readFileSync(join(root, 'src/components/wallet-shell.js'), 'utf8');
  ok(/row\.dataset\.wrap = '';[\s\S]{0,700}?delete row\.dataset\.compact;[\s\S]{0,120}?row\.dataset\.compact = ''/.test(walletJs288),
    '#288: fit() restores the misstx label once the pill wraps onto its own line');
}

console.log('missing-bits Batch C — desktop overlay grammar + form panes (M6/M7/M8)');
{
  /* static guards — presentation CSS + shell wiring (jsdom is layout-blind). */
  const overlayCss = readFileSync(join(root, 'src/styles/components/overlay.css'), 'utf8');
  const chat = readFileSync(join(root, 'src/shells/chat.html'), 'utf8');
  const home = readFileSync(join(root, 'src/shells/home.html'), 'utf8');
  ok(/:root\[data-desktop\] \.c-sheet \{/.test(overlayCss)
    && /width: min\(480px, 92%\);/.test(overlayCss)
    && /:root\[data-desktop\] \.c-sheet \.c-sheet__handle \{ display: none; \}/.test(overlayCss),
    'M6: overlay.css presents sheets as centered dialogs under :root[data-desktop]');
  ok(/\.c-sheet\[data-dt-anchor="menu"\]/.test(overlayCss) && /\.c-sheet\[data-dt-anchor="up"\]/.test(overlayCss)
    && /\[data-dt-ctx-source\]/.test(overlayCss),
    'M6: anchored dropdown/popover variants + source-row highlight exist');
  ok(/attachContextMenuAnchors\(\{ host: overlayHost, rows: '\.c-bubble-row' \}\)/.test(chat),
    'M6: chat shell anchors right-clicked message menus');
  ok(/attachContextMenuAnchors\(\{ host: document\.body, rows: '\.c-chatlist-item' \}\)/.test(home),
    'M6: home shell anchors right-clicked chat-row menus');
  ok(/anchorSheetAbove\(sheet, composerEl && composerEl\.querySelector\('\.c-composer__attach'\)/.test(chat),
    'M6: the attach grid rises from the composer ⊕ on desktop');
  // M6 component behavior over the components.html bundle (window.Spixi is live there)
  const anchors = readFileSync(join(root, 'src/components/desktop-anchors.js'), 'utf8');
  ok(/isDesktopPresentation\(\)/.test(anchors) && /return \(\) => \{\};/.test(anchors),
    'M6: desktop-anchors no-ops without data-desktop (mobile untouched)');
  ok(/CTX_FRESH_MS = 600/.test(anchors) && /\.c-msgmenu/.test(anchors),
    'M6: only a just-right-clicked .c-msgmenu sheet anchors (long-press keeps the dialog)');
  // Q2 review (#268 loop): the no-scrim change rests on ONE unasserted invariant in a
  // DIFFERENT file — desktop-anchors tags the sheet's scrim by previousElementSibling,
  // which is only the scrim because overlay.js appends `scrim, el` in that order. If
  // anyone ever wraps the sheet, appends the scrim last, or portals it, the wash
  // silently returns with nothing failing. Pin all three halves together.
  const overlayJs = readFileSync(join(root, 'src/components/overlay.js'), 'utf8');
  ok(/host\.append\(scrim, el\)/.test(overlayJs)
    && /previousElementSibling/.test(anchors)
    && /\.c-scrim\[data-dt-clear\]/.test(overlayCss),
    '#268: clearScrimFor depends on the scrim being the sheet PREVIOUS SIBLING (overlay.js append order)');
  // The scrim must stay CLICKABLE while transparent (outside-click dismissal, #56 stack).
  ok(!/\.c-scrim\[data-dt-clear\][^{]*\{[^}]*pointer-events\s*:\s*none/.test(overlayCss),
    '#268: a transparent scrim still catches the outside click (no pointer-events:none)');
}


/* —— PARITY BATCH A (DECISIONS #302) ————————————————————————————————————————
   The shells are not jsdom-loadable (#205), so shell-side items are pinned with
   STATIC assertions on the source; component-side items assert real behaviour
   over the bundle where they can. Each assertion names the failure it prevents,
   not just the feature it covers. */
console.log('parity batch A (#302) — A1..A11 + W1/W2');
{
  const chat = readFileSync(join(root, 'src/shells/chat.html'), 'utf8');
  const home = readFileSync(join(root, 'src/shells/home.html'), 'utf8');
  const cdet = readFileSync(join(root, 'src/shells/contact_details.html'), 'utf8');
  const appd = readFileSync(join(root, 'src/shells/app_details.html'), 'utf8');
  const composerJs = readFileSync(join(root, 'src/components/composer.js'), 'utf8');
  const bubbleJs = readFileSync(join(root, 'src/components/message-bubble.js'), 'utf8');
  const infoJs = readFileSync(join(root, 'src/components/chat-info.js'), 'utf8');
  const menuJs = readFileSync(join(root, 'src/components/apps-menu.js'), 'utf8');
  const shellJs = readFileSync(join(root, 'src/components/apps-shell.js'), 'utf8');
  const scanJs = readFileSync(join(root, 'src/bridge/scan-page.js'), 'utf8');
  const enUs = readFileSync(join(root, 'src/strings/en-us.js'), 'utf8');

  /* —— A1: show older messages —— */
  ok(/bridge\.send\('ixian:loadmore'\)/.test(chat), 'A1: the chat shell EMITS ixian:loadmore (was a stub verb — history >100 msgs was unreachable)');
  ok(/showOlder = \(String\(showMore\) === 'true'\)/.test(chat),
    "A1: showMore drives the pill — C#'s own end-of-history signal, not a heuristic");
  ok(/if \(showOlder\) frag\.append\(buildOlderPill\(\)\)/.test(chat) && /if \(!showOlder\) frag\.append\(createSecureNotice\(\)\)/.test(chat),
    'A1/D1: the pill is built INSIDE the render (replaceChildren would destroy an appended node), and the secure notice yields to it');
  ok(/if \(loadingOlder\) return;/.test(chat) && /olderTimeout = setTimeout/.test(chat),
    'A1: double-fire guard + timeout — each tap costs +100 rows of C# window with no ack, and a lost navigation must not strand the spinner');
  ok(/function applyOlderAnchor/.test(chat) && /arow\.offsetTop - olderAnchorOffset/.test(chat),
    'A1: scroll restores by ELEMENT anchor — a one-shot scrollHeight delta breaks when the re-flush paints across several renders');
  // NB: match a CALL, not the name — this file's comments discuss it by name.
  ok(!/attachLazyHistory\s*\(/.test(chat) && !/\battachLazyHistory\b\s*[,}]/.test(chat.replace(/\/\*[\s\S]*?\*\//g, '')),
    'A1: attachLazyHistory stays UNWIRED — it assumes a C# prepend that does not exist (docs/chat-transport-spec.md)');
  ok(/resetOlder\(\);/.test(chat), 'A1: per-peer / per-channel reset — no stale spinner or anchor riding into the next conversation');

  /* —— A2: paid-bot cost + paid marker —— */
  ok(/t\.textContent = String\(costText\)/.test(composerJs),
    'A2: setComposerCost renders costText VERBATIM — C# already sends a complete sentence, the old prefix produced "Each message costs Sending messages costs …"');
  ok(/const showCost = !!costText && \(isNaN\(costNum\) \|\| costNum > 0\)/.test(chat),
    'A2: cost gates on the NUMERIC cost — a free group also receives a formatted costText ("… 0.00000000 IXI per kB")');
  ok(/if \(flags && flags\.paid !== undefined\) rec\.paid = asBool\(flags\.paid\)/.test(chat),
    'A2: `paid` is persisted on the record — it was passed by both addMe/addThem and silently dropped');
  ok(/!!rec\.paid === paidBefore/.test(chat),
    'A2: a paid FLIP escapes the surgical status path — transactionId can land after send, and the tick-only updater would never paint the glyph');
  ok(/paid = false,/.test(bubbleJs) && /c-bubble__paid/.test(bubbleJs),
    'A2: the bubble takes a paid opt and renders a marker');
  ok(bubbleJs.indexOf("meta.append(pg)") > bubbleJs.indexOf("meta.append(st)"),
    'A2: the paid glyph is appended AFTER the status icon — setMessageStatus finds the tick by `.c-bubble__meta .c-status-icon` and replaceWith()s it');

  /* —— A3: unread-elsewhere DOT (not a count) —— */
  ok(/const next = \(Number\(n\) \|\| 0\) > 0;/.test(chat),
    'A3: the unread indicator is a BOOLEAN dot — the C# push is edge-latched and its first value includes the chat you just opened, so a rendered count would be a lie');
  ok(/backLabel: \(s\.back \|\| 'Back'\) \+ \(unreadElsewhere/.test(chat),
    "A3: unread state rides the BACK LABEL — createButton puts backLabel on aria-label, which overrides nested content, so a badge span would be announced to nobody");
  ok(/if \(unreadElsewhere && !document\.documentElement\.hasAttribute\('data-desktop'\)\)/.test(chat),
    'A3: mobile only — on desktop the chats list is beside the conversation and already carries unread');
  ok(/data-unread-dot\]::after/.test(chat) && /--surface-topbar/.test(chat),
    'A3: #48 badge grammar at topbar scale — the ring uses the TOPBAR surface, not the bottombar token');

  /* —— A4 + W1/W2: presence —— */
  ok(/export function setChatInfoPresence/.test(infoJs),
    'A4: a free-fn presence toggle exists — stateSig()/buildIfChanged no-op on an unchanged signature, so a rebuild could leave the dot green after the contact went offline');
  ok(/online: state\.online,/.test(cdet) && /if \(next === state\.online\) return;/.test(cdet),
    'A4: presence is in stateSig (a rebuild re-seeds it) and guarded on CHANGE (it arrives at the poll cadence)');
  ok(/capabilities: \{ presence: true \}/.test(cdet),
    'A4: `capabilities` is a feature GATE again — it was carrying the live value and nothing read it');
  ok(/online: kind === 'contact' && !!online/.test(infoJs),
    'A4: presence is 1:1 only — C# structurally cannot push it for a group/bot');
  // strip comments first: the docblock explaining this fix quotes the OLD regex.
  const chatCode = chat.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  ok(/const ONLINE_TEXT = slCarrier\('sl-online'/.test(chat)
    && /identity\.online = [^;]*ONLINE_TEXT/.test(chatCode)
    && !/\/online\/\.test/.test(chatCode),
    'W1: the presence dot matches a C#-substituted CARRIER — the old /online/ regex left it dead in es/fr/ru/sl/sr');
  ok(/<span id="sl-online">/.test(chat), 'W1: the sl-online carrier element exists for C# to substitute');

  /* —— A5 + A11: the shared nudge queue —— */
  ok(/showRatingPrompt\(\) \{ enqueueNudge\('rating'\); \}/.test(home) && /enqueueNudge\('backup'\)/.test(home),
    'A5/A11: both nudges are wired and both go through the queue');
  ok(/if \(String\(id \|\| ''\) !== 'backup-prompt'\) \{ dbg/.test(home),
    'A11: toggleAnimatedSlider checks its ID — legacy used the verb generically and also to CLOSE the prompt');
  ok(/function nudgeContextClear/.test(home) && /nudgeTabId !== 'chats'/.test(home) && /contactsView \|\| walletTakeover/.test(home),
    'A5/A11: context gates — C# can push both in the same frame, and neither push knows about takeovers (z-30, below sheets)');
  ok(/backedUpRecently/.test(home) && /BACKUP_STAMP_KEY = 'spixi\.backup\.last'/.test(home),
    'A11: suppressed for someone who already backed up — there is NO C# backup-done pref (be-cutover S2); this stamp is the only signal that exists');
  ok(/RATING_SNOOZE_KEY/.test(home),
    'A5: a light-dismiss snoozes locally — the component sends no verb and C# re-pushes on EVERY chat exit, which is an endless nag without this');
  ok(/backup-nudge\.css/.test(home) && /rating-nudge\.css/.test(home), 'A5/A11: both nudge stylesheets are linked (neither was)');
  ok(/illustration: 'images\/backup\.png'/.test(home), 'A11/N45: the shared backup art is used (PNG canon; it ships beside the shells)');

  /* —— A6: bot description —— */
  ok(/mode\.description = String\(botDescription/.test(chat) && /DESCRIPTION_MAX/.test(chat),
    'A6: the server description is stored and length-clamped');
  ok(/desc\.textContent = mode\.description/.test(chat) && !/innerHTML\s*=\s*mode\.description/.test(chat),
    'A6 ★: textContent, never innerHTML — this string comes from a REMOTE bot server; legacy used innerHTML (js/chat.js:245)');
  ok(/chat-channel-panel__desc/.test(chat),
    'A6: it renders on the real production component (chat-channel-panel), not the demo-only channel-sheet.js');

  /* —— A7: 64k guard —— */
  ok(/maxLength = 0,/.test(composerJs) && /if \(maxLength > 0 && text\.length > maxLength\)/.test(composerJs),
    'A7: the guard lives in the COMPONENT and returns before onSend — a shell-side return would block the send AND wipe the 64 000 chars the user typed');
  ok(composerJs.indexOf('if (onTooLong)') < composerJs.indexOf('if (onSend) onSend(text)'),
    'A7: the bail happens BEFORE onSend and therefore before the unconditional field clear');
  ok(/maxLength: MAX_MESSAGE_CHARS/.test(chat) && /MAX_MESSAGE_CHARS = 64000/.test(chat), 'A7: the shell passes legacy’s 64 000 ceiling');
  ok(/messageTooLong: "Text is too long\."/.test(enUs),
    'A7: the English fallback matches legacy `chat-text-too-long` EXACTLY — build-locales value-matches it and all 7 shipped locales come free');
  ok(/c-composer__counter/.test(composerJs), 'A7: an over-limit counter warns before the tap (the realistic trigger is a paste, not typing)');

  /* —— A8: scan zoom —— */
  ok(/getRunningTrackCameraCapabilities/.test(scanJs) && !/zoom: 2\.0/.test(scanJs),
    'A8: zoom is computed from the device capability range — a literal 2.0 is below min on percent-scale cameras and is silently ignored');
  ok(/Math\.min\(min \* 2, max\)/.test(scanJs), 'A8: min×2 clamped to max — scale-agnostic 2×');
  ok(/function applyTrackState/.test(scanJs) && /adv\.torch = !!track\.torch;/.test(scanJs),
    'A8: torch and zoom are written TOGETHER — applyConstraints replaces the advanced set, so separate writes reset each other');
  ok(!/if \(track\.torch\) adv\.torch = true/.test(scanJs),
    'A8: torch is written UNCONDITIONALLY — omitting the key on "off" leaves the engine setting untouched, i.e. the LED stays lit while the button says off');
  ok(/hasAttribute\('data-desktop'\)\) return;/.test(scanJs), 'A8: never on desktop — 2× on an already-narrow webcam FOV makes scanning worse');
  ok(/try \{ return inst\.applyVideoConstraints/.test(scanJs),
    'A8: applyVideoConstraints is wrapped in try — it THROWS SYNCHRONOUSLY when the camera is not running, which .catch() would not see');

  /* —— A9: dual-capability app launch —— */
  ok(/app\.isMultiUser && app\.isSingleUser/.test(menuJs), 'A9: the Invite row appears only for DUAL apps (multi-only already launches multi on tap)');
  ok(/case 'invite':/.test(shellJs) && /onLaunchMulti/.test(home), 'A9: the invite action reaches ixian:startAppMulti from the apps list');
  ok(/app\.hasMultiUser && app\.hasSingleUser && onLaunchMulti/.test(readFileSync(join(root, 'src/components/apps-details.js'), 'utf8')),
    'A9: the details page gets an explicit second button (its flags are hasSingleUser/hasMultiUser, NOT is*)');
  ok(/const multi = !!app\.isMultiUser && !app\.isSingleUser/.test(home),
    'A9: the primary tap still launches SOLO — solo relaunch is the repeated action, legacy taxed it with a per-tap modal');

  /* —— A10: wallet share — REBASED by F3 (#301): payload is ALWAYS the bare
     address, so the amount gate + clipboard rungs are asserted GONE, not present —— */
  ok(/function shareReceivePayload\(value\) \{/.test(home) && !/const nativeOk/.test(home),
    'F3 ★: shareReceivePayload takes NO amount — the A10 gate collapsed because the shared text never carries `:send:<amount>` (Damir 2026-08-04)');
  ok(/onShare: isDesktopPresentation\(\)\s*\n?\s*\? undefined\s*\n?\s*: \(\{ address, value \}\) => shareReceivePayload\(address \|\|/.test(home),
    'F3+N38: onShare passes the BARE address, and only off desktop — qrValue()\'s `address:ixi`/`address:send:` composition must never reach the share sheet');
  ok(/e\.name === 'AbortError' && !isWebView2\) return/.test(home),
    'F3: a WebKit AbortError (sheet shown, user dismissed) does NOTHING — batch A re-sent ixian:share there, popping a SECOND sheet after a cancel');
  ok(/window\.chrome && window\.chrome\.webview/.test(home),
    'F3: WebView2 is detected explicitly — its navigator.share exists but rejects, and THAT engine must still fall through to ixian:share (the A10 silent no-op)');
  ok(/bridge\.send\('ixian:share'\)/.test(home), 'A10/F3: the live native verb is still emitted (was a silent clipboard write on WebView2)');
  ok(!/function execCopy/.test(home),
    'F3: the clipboard/execCopy rungs are GONE from home.html — unreachable code that pretended a copy path still existed');
}

/* —— F5 FIX BATCH (DECISIONS #301) — F1 scan probe · F2 zoom clamp · F3 share · iOS-29 r4.
   Shell items are STATIC pins (#205); the F2 sweep is asserted over EVERY shell so a
   future shell added without the clamp fails loudly. */
console.log('F5 fix batch (#301) — F1/F2/F3/iOS-29 attempt 4');
{
  const chat = readFileSync(join(root, 'src/shells/chat.html'), 'utf8');
  const scanJs = readFileSync(join(root, 'src/bridge/scan-page.js'), 'utf8');
  const wrJs = readFileSync(join(root, 'src/components/wallet-receive.js'), 'utf8');
  const iosHandler = readFileSync(join(root, 'Spixi/Platforms/iOS/iOSWebViewHandler.cs'), 'utf8');

  /* —— F2: pinch is chat-only — every shell carries the scale clamp —— */
  const shellsDir = join(root, 'src/shells');
  const shellFiles = readdirSync(shellsDir).filter((f) => f.endsWith('.html'));
  ok(shellFiles.length >= 18, 'F2: the shells directory still holds the full set (' + shellFiles.length + ' found) — a miscount means this sweep is asserting over the wrong tree');
  for (const f of shellFiles) {
    const src = readFileSync(join(shellsDir, f), 'utf8');
    ok(/minimum-scale=1, maximum-scale=1, user-scalable=no/.test(src),
      'F2: ' + f + ' clamps the viewport — without it WKWebView raster-zooms the whole document on pinch (only chat may interpret pinch, as text size)');
  }
  ok(/attachPinchTextScale/.test(chat), 'F2: chat KEEPS its pinch-to-text-size gesture — the clamp is what makes the touch-event gesture receivable');
  ok(/MinimumZoomScale = 1;/.test(iosHandler) && /MaximumZoomScale = 1;/.test(iosHandler),
    'F2: the iOS ScrollView zoom belt covers the still-legacy pages (wallet_send/apps…) that ship no viewport clamp');

  /* —— F3: Share hides while an amount is set (component half) —— */
  ok(/shareBtn\.hidden = active/.test(wrJs),
    'F3: the Share button HIDES while an amount is entered — offering a share that omits the on-screen amount would be dishonest (Damir dial, hide > disable)');
  ok(/let shareBtn = null/.test(wrJs), 'F3: the share button is state-driven from sync(), not a fire-and-forget append');

  /* —— F1: scan diagnostics + re-kick (iOS-49, zero-C# by design) —— */
  ok(/function probeScanFeed/.test(scanJs) && /function scheduleScanProbe/.test(scanJs),
    'F1: the scan probe exists — #293\'s "verify with Inspector before building" was never run; this IS that verification, on-screen');
  // #46 r2 MINOR-A: the window is BOUNDED to the done closure — every atom must appear
  // BEFORE `fail: (msg)` opens, so relocating any of them into the fail path (the exact
  // regression the message names) fails this pin instead of slipping through a widened
  // character count. Pinned order: done → grant write → storage-line removal → probe.
  ok(new RegExp(
    'done: \\(payload\\) => \\{'
    + '(?:(?!fail: \\(msg\\))[\\s\\S]){0,80}?ctrl\\.done\\(payload\\);'
    + "(?:(?!fail: \\(msg\\))[\\s\\S]){0,200}?localStorage\\.setItem\\(SCAN_GRANT_KEY, '1'\\)"
    + '(?:(?!fail: \\(msg\\))[\\s\\S]){0,600}?storageProbeLine\\.remove\\(\\)'
    + '(?:(?!fail: \\(msg\\))[\\s\\S]){0,200}?scheduleScanProbe\\(el, feed, \\(\\) => finished\\);'
  ).test(scanJs),
    'F1: the probe schedules ONLY on a successful start — done → grant write → #308 line removal → scheduleScanProbe, all inside the done closure (a fail-located schedule or removal escapes the bounded window and fails here)');
  ok(/if \(isDone && isDone\(\)\) return;/.test(scanJs),
    'F1: BOTH probe timers bail once decode/cancel latched — a late probe reads the torn-down feed as dead and would overwrite "Code scanned" on a scanner that just worked');
  ok(/fail: \(msg\) => \{[\s\S]{0,240}?ctrl\.fail\(msg\);/.test(scanJs),
    'F1: fail() still reaches ctrl exactly once — the wrapper adds only the r4 grant-flag clear, never alters one-shot semantics');
  ok(/v\.paused \|\| v\.videoWidth === 0/.test(scanJs) && /r\.catch\(\(\) => \{\}\)/.test(scanJs),
    'F1: the play() re-kick fires only on a stalled video and swallows its rejection — it must never break a working camera');
  ok(/t\.muted/.test(scanJs) && /frame === 'black'/.test(scanJs),
    'F1: the probe distinguishes the three failure layers — muted track (native suspend) vs 0×0 video (inline refused) vs black frames (canvas readback)');
  ok(!/AllowsInlineMediaPlayback/.test(iosHandler),
    'F1 ★: NO AllowsInlineMediaPlayback in the handler — MAUI already sets it at construction (MauiWKWebView.CreateConfiguration); writing it again would ship a proven no-op as a "fix"');

  /* —— iOS-29 attempt 4: the CHANGED lever (#294 standing order) —— */
  ok(!/document\.body\.style\.height/.test(chat),
    'iOS-29: <body> is NEVER resized — that was the lever #294 proved wrong three times (double-topbar artifact, shipped no-op)');
  ok(/setProperty\('--kb-inset'/.test(chat),
    'iOS-29: the keyboard overlap is published as --kb-inset from visualViewport');
  ok(/margin-bottom: max\(0px, calc\(var\(--kb-inset, 0px\) - env\(safe-area-inset-bottom, 0px\)\)\)/.test(chat),
    'iOS-29: the composer margin re-uses the safe-area cushion as keyboard clearance and clamps to 0 closed — env() stays FULL with the keyboard up (#294 measurement)');
  ok(/if \(vv\.offsetTop \|\| window\.scrollY\) window\.scrollTo\(0, 0\);/.test(chat),
    'iOS-29: the pan reset stays — scrollTo(0,0) is the half #283 PROVED works; only the resize half changed lever');
}

/* —— R2 (DECISIONS #303) — keyboard both-levers · amount-QR drop. —— */
console.log('r2 (#303) — keyboard native+hardened · amount-QR drop');
{
  const chat = readFileSync(join(root, 'src/shells/chat.html'), 'utf8');
  const wrJs = readFileSync(join(root, 'src/components/wallet-receive.js'), 'utf8');
  const scp = readFileSync(join(root, 'Spixi/Utils/SpixiContentPage.cs'), 'utf8');

  /* keyboard — FE half */
  ok(/window\.__setKbInset = function/.test(chat) && /nativeKb = true/.test(chat),
    'iOS-29 r2: the native entry point exists and LATCHES — once C# frames arrive the vv writer stands down (two writers would fight)');
  ok(/\[80, 240, 480, 900, 1400\]\.map\(\(ms\) => setTimeout\(apply, ms\)\)/.test(chat),
    'iOS-29 r2: the settle ladder outlives the ~250ms keyboard animation — the on-device miss was an EARLY first resize event with no follow-up until a keystroke');
  ok(/composerEl && composerEl\.contains\(e\.target\)\) kick\(\)/.test(chat),
    'iOS-29 r2: composer focus triggers the lever directly — the user summoning the keyboard must not depend on a vv event at all');
  ok(!/document\.body\.style\.height/.test(chat), 'iOS-29 r2: body is still never resized (the #294 dead lever stays dead)');

  /* keyboard — C# half */
  ok(/loadedHtmlFileName != "chat\.html" \|\| kbChangeObserver != null/.test(scp),
    'iOS-29 r2 ★: the C# observer attaches ONLY to chat.html pages — MiniAppPage never sets loadedHtmlFileName, so third-party content is structurally excluded');
  ok(/ObserveWillChangeFrame/.test(scp) && /ObserveWillHide/.test(scp),
    'iOS-29 r2: both notifications observed — WillChangeFrame carries the settled END frame (the determinism the vv event lacks), WillHide zeroes the inset');
  ok(/window\.__setKbInset && window\.__setKbInset\(/.test(scp),
    'iOS-29 r2: the push is guard-called — a shell without the hook (or a stale build) is a silent no-op, never a JS error');
  ok(/detachKeyboardInsetObserver\(\);   \/\/ iOS-29 r2/.test(scp),
    'iOS-29 r2: observers detach on the real teardown path (Dispose-when-popped) — no leaked NSObject observers pushing into dead pages');
  ok(/op\.target\.attachKeyboardInsetObserver\(\);/.test(scp),
    'iOS-29 r2 ★★: the observer ALSO attaches at the overlay present — chat is overlay-presented on iOS and OnAppearing never fires there (review MAJOR-1; OnAppearing alone = dead native lever in the primary flow)');
  ok(/e\.FrameEnd\.Width < screen\.Width/.test(scp),
    'iOS-29 r2: floating/split iPad keyboards (narrow frame) are NOT pushed — bogus mid-screen overlap would latch the shell off its vv belt (review MINOR-5)');

  /* amount-QR drop */
  ok(!/:send:' \+ canonicalAmount/.test(wrJs) && /const qrValue = \(\) => address \+ ':ixi'/.test(wrJs),
    "#303 ★: wallet-receive NEVER composes address:send:<amount> — the QR is constant address:ixi (Damir: amount-request QRs are not supported)");
  ok(!/setQrValue\(/.test(wrJs) && !/import \{ createQrSvg, setQrValue \}/.test(wrJs),
    '#303: no QR re-encode machinery left in wallet-receive (no call sites, import dropped)');
  ok(/requestModeAnnounce/.test(wrJs) === false,
    '#303: the request-mode announcements are gone — announcing a QR mode change that no longer happens would lie to screen readers');
  ok(/onSendRequest\(\{ contact: c, amount \}\)/.test(wrJs),
    '#303: the send-request-to-contact flow SURVIVES the QR drop — only the QR encoding was removed (W8 stays live)');
}

/* —— R3 (DECISIONS #304) — iOS-49 ROOT CAUSE fix: the QR library's inline
   position stamp collapsed the feed to 0×0 (device-measured: feed 0x0 @ center,
   video style.width "0px", decode canvas 0x0, track live). —— */
console.log('r3 (#304) — scan feed inline-style collapse fix');
{
  const scanJs = readFileSync(join(root, 'src/bridge/scan-page.js'), 'utf8');
  const scanCss = readFileSync(join(root, 'src/styles/components/scan-shell.css'), 'utf8');

  ok(/new w\.Html5Qrcode\(feedEl\.id[\s\S]{0,900}feedEl\.style\.removeProperty\('position'\)/.test(scanJs),
    "#304 ★: the ctor's inline position:relative stamp is removed BEFORE start() reads clientWidth — inline beat the stylesheet, collapsing the feed to 0×0 (black preview + 0×0 decode canvas + zero scans, torch alive)");
  ok(/width: 100% !important; height: 100% !important/.test(scanCss),
    '#304: the video fill wins over the pixel width html5-qrcode inlines at start time (rotation/resize adapt; sanctioned !important, documented in the css)');
  ok(/box\.w === 0 \|\| box\.h === 0/.test(scanJs) && /indexOf\('readback-'\) === 0/.test(scanJs),
    '#304: the probe now counts a 0×0 feed box AND a blocked canvas readback as DEAD — both were blind spots that read as "healthy" while nothing could scan');
  ok(/' · box ' \+ b \+ /.test(scanJs),
    '#304: the on-screen probe line carries the feed box size — the number that would have named this bug on the first F5');
}

/* —— R4 (DECISIONS #305) — feed CSS made authoritative + grant persistence. —— */
console.log('r4 (#305) — feed !important · camera-grant persistence');
{
  const scanJs = readFileSync(join(root, 'src/bridge/scan-page.js'), 'utf8');
  const scanCss = readFileSync(join(root, 'src/styles/components/scan-shell.css'), 'utf8');
  const shellJs = readFileSync(join(root, 'src/components/scan-shell.js'), 'utf8');

  ok(/\.c-scan__feed \{ position: absolute !important; inset: 0; \}/.test(scanCss),
    '#305 ★ (rebased by #307): the feed POSITION stays stylesheet-!important — html5-qrcode inline-stamps position:relative in BOTH its ctor and start(); inset is deliberately demoted so the #307 aspect-lock (inline left/top/width/height) can size the box, with inset:0 as the fail-soft full-bleed');
  ok(/export function startScanRequest/.test(shellJs) && /st\.state !== 'prompt' \|\| !st\.beginRequest\) return/.test(shellJs),
    '#305: programmatic start rides the SAME latched CTA path, prompt-state only — no parallel permission machinery');
  ok(/localStorage\.getItem\(SCAN_GRANT_KEY\)\) startScanRequest\(el\)/.test(scanJs),
    '#305: a previously granted camera skips the consent-card tap (Damir F5: "allow doesn\'t persist"); first visit still shows the card');
  ok(/localStorage\.setItem\(SCAN_GRANT_KEY, '1'\)/.test(scanJs) && /localStorage\.removeItem\(SCAN_GRANT_KEY\)/.test(scanJs),
    '#305: the grant flag is set only on a SUCCESSFUL start and cleared on failure — revoking camera access in iOS Settings falls back to the honest prompt/denied cards');
}

/* —— #307/#308 — scan DECODE aspect-lock + the C-9 storage probe. —— */
console.log('#307/#308 — aspect-locked scan feed · C-9 storage probe');
{
  const scanJs = readFileSync(join(root, 'src/bridge/scan-page.js'), 'utf8');
  const scanCss = readFileSync(join(root, 'src/styles/components/scan-shell.css'), 'utf8');

  /* #307: the decode fix — verified region math, aspect-locked feed */
  ok(/function fitFeedBox/.test(scanJs) && /function attachFeedSizer/.test(scanJs),
    '#307: the aspect-lock exists — html5-qrcode\'s qrRegion maps per-axis client→intrinsic ratios, so decode is only undistorted when the feed box has the stream aspect (min.js-verified; r4\'s full-bleed stretched frames 1.41× → zero decode)');
  ok(/feedSizer = attachFeedSizer\(feedEl, desktop, \(\) => requestRestart\(\)\);[\s\S]{0,700}?launch\(\(inst\) => \{ ctrl\.done\(\);/.test(scanJs)
    && /const launch = [\s\S]{0,600}?instance = new w\.Html5Qrcode\(feedEl\.id/.test(scanJs),
    '#307 (rebased by #309b): the sizer attaches BEFORE launch() runs the Html5Qrcode ctor — the default box must exist before the library ever measures, and loadedmetadata (the aspect correction) always precedes the \'playing\' event where qrRegion latches');
  ok(/loadedmetadata/.test(scanJs) && /videoWidth \/ v\.videoHeight/.test(scanJs),
    '#307: the real stream aspect lands from loadedmetadata (3:4 mobile / 4:3 desktop are only the pre-metadata defaults)');
  ok(/if \(feedSizer\) \{ try \{ feedSizer\.off\(\); \} catch \(e\) \{ \/\* stale \*\/ \} feedSizer = null; \}/.test(scanJs),
    '#307: stop() releases the sizer (resize listener + MutationObserver) — Try-again attaches a fresh one');
  ok(!/qrbox/.test(scanJs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')),
    '#307: NO qrbox was added — under a non-aspect-true feed a qrbox sample distorts identically (getShadedRegionBounds returns client coords through the same per-axis ratios); the fix is the box, not the region');

  /* #308: the C-9 probe — self-serve storage verdict on the consent-card moment */
  ok(/const SCAN_PROBE_KEY = 'spixi\.probe\.scan'/.test(scanJs) && /function probeScanStorage/.test(scanJs),
    '#308: the C-9 storage probe exists — a counter key whose increment across scan entries settles same-page file:// localStorage persistence without a Mac tether');
  ok(/storage\.grant !== '1'\) storageProbeLine = paintStorageProbe\(el, storage\)/.test(scanJs),
    '#308: the storage line paints ONLY when the consent card gates (the symptom moment) — a working scanner never shows diagnostics');
  ok(/storageProbeLine\.remove\(\)/.test(scanJs) && /storageProbeLine = null/.test(scanJs)
    && !/fail: \(msg\) => \{(?:(?!ctrl\.fail)[\s\S])*?storageProbeLine/.test(scanJs),
    '#308 (#46 r1 MINOR-1): a SUCCESSFUL start removes the storage line (never the fail path — denied KEEPS it, still the symptom moment); placement pinned by the bounded F1 window above plus this fail-closure negative');
  ok(/aspect = video\.videoWidth \/ video\.videoHeight/.test(scanJs),
    '#307 (#46 r1 MINOR-2): resize RE-READS the live stream aspect before re-fitting — rotation swaps videoWidth/videoHeight, and a stale-aspect re-fit would re-open the exact distortion this fix closes');
  ok(/aria-hidden/.test(scanJs) && /pointer-events:none/.test(scanJs),
    '#308: the storage line is aria-hidden + pointer-events:none — diagnostics reach neither screen readers nor touch');
  ok(/spixi\.appearance/.test(scanJs),
    '#308: the probe also reads spixi.appearance (written by ll_settings.html) — a 1 kills the per-FILE-origin theory for cross-page keys in the same glance');
  ok(/"ll_" \+ /.test(readFileSync(join(root, 'Spixi/Utils/SpixiContentPage.cs'), 'utf8')),
    '#308 premise: generatePage still writes the literal "ll_"-prefixed localized page — the STABLE per-page name the probe\'s repo-side verdict rests on (per-visit origins ruled out in-repo)');
}

/* —— #309 — device round 1 fixes: staged-mount feed re-fit + WKWebView delegate retention. —— */
console.log('#309 — bed ResizeObserver re-fit · strong WKWebView delegate roots');
{
  const scanJs = readFileSync(join(root, 'src/bridge/scan-page.js'), 'utf8');
  const iosHandler = readFileSync(join(root, 'Spixi/Platforms/iOS/iOSWebViewHandler.cs'), 'utf8');

  ok(/new ResizeObserver\(\(\) => apply\(\)\)/.test(scanJs) && /ro\.observe\(bed\)/.test(scanJs),
    '#309: a ResizeObserver on the BED re-fits the feed on any bed-size change — C# presents this page AFTER load with no window resize event, so the staged-mount box (393×370 measured on-device) needs a structural re-fit trigger');
  ok(/aspect = v\.videoWidth \/ v\.videoHeight;[\s\S]{0,700}?apply\(\);[\s\S]{0,40}?\} catch \(e\) \{ \/\* fail soft \*\/ \}/.test(scanJs)
    && !/Math\.abs\(a - aspect\)/.test(scanJs),
    '#309: loadedmetadata ALWAYS re-fits — the aspect-changed-only short-circuit let a mis-measured bed stick when the stream aspect matched the default (the exact device symptom)');
  ok(/if \(ro\) ro\.disconnect\(\)/.test(scanJs),
    '#309: off() disconnects the bed observer with the rest of the sizer machinery');
  ok(/SecureNavigationDelegate\? _navigationDelegate;/.test(iosHandler) && /MediaCaptureUIDelegate\? _uiDelegate;/.test(iosHandler)
    && /_navigationDelegate = new SecureNavigationDelegate\(this\);/.test(iosHandler) && /_uiDelegate = new MediaCaptureUIDelegate\(\);/.test(iosHandler)
    && /platformView\.NavigationDelegate = _navigationDelegate;/.test(iosHandler) && /platformView\.UIDelegate = _uiDelegate;/.test(iosHandler),
    '#309 ★: the WKWebView delegates are STRONG-ROOTED on the handler — fields DECLARED + CONSTRUCTED + ASSIGNED (r3 MINOR-1: without the construction atoms, deleting only the `= new …` lines would assign null and drop the http/https block deterministically — the exact MAJOR #7 outcome)');
  ok(/DisconnectHandler\(WKWebView platformView\)[\s\S]{0,300}?_navigationDelegate = null;[\s\S]{0,100}?_uiDelegate = null;/.test(iosHandler),
    '#309: the roots release with the WebView they served (DisconnectHandler)');

  /* —— #310: the delegate rebuilt registrar-proof + observable —— */
  ok(/class MediaCaptureUIDelegate : NSObject, IWKUIDelegate/.test(iosHandler)
    && /\[Export\("webView:requestMediaCapturePermissionForOrigin:initiatedByFrame:type:decisionHandler:"\)\]/.test(iosHandler),
    '#310: MediaCaptureUIDelegate is an explicit NSObject + IWKUIDelegate adopter with a hand-written [Export] — the [Model]-subclass override was never invoked on device (WebKit\'s own prompt with the strong-rooted delegate in place falsified the GC-only theory)');
  ok(/\[cam-perm\]/.test(iosHandler) && /forward\(webView, "invoked type=/.test(iosHandler),
    '#310: every invocation is observable — [cam-perm] entry + AVFoundation status forward into the page console (the #304 Inspector workflow proves whether WebKit consulted us at all)');

  /* —— #311: runtime UIDelegate probe + re-assert at the first bridge navigation —— */
  ok(/probe uiDelegate=/.test(iosHandler) && /respondsToSelector=/.test(iosHandler)
    && /webView\.UIDelegate = _owner\.EnsureUiDelegate\(\);/.test(iosHandler)
    && /internal IWKUIDelegate EnsureUiDelegate\(\)/.test(iosHandler),
    '#311: the first ixian: navigation probes WHO the UIDelegate is at runtime + whether the permission selector registered, and RE-ASSERTS ours if it was swapped (the clobber fork) — through the handler root, never an unrooted instance');
  ok(/if \(!_udProbed && url\.StartsWith\("ixian:", StringComparison\.OrdinalIgnoreCase\)\)/.test(iosHandler),
    '#311: the probe is one-shot per WebView and fires at the FIRST bridge navigation — the page is alive and it lands right before the scan auto-enter getUserMedia');

  /* —— #312: the heal runs on EVERY navigation (incl. the main-frame load) —— */
  ok(/var url = navigationAction\.Request\.Url\?\.AbsoluteString \?\? "";[\s\S]{0,1200}?if \(_owner != null && !\(webView\.UIDelegate is MediaCaptureUIDelegate\)\)[\s\S]{0,120}?webView\.UIDelegate = _owner\.EnsureUiDelegate\(\);/.test(iosHandler),
    '#312: the UIDelegate heal runs on EVERY DecidePolicy call — the main-frame file:// load fires before the page parses, so the heal deterministically precedes any page-JS getUserMedia (the #311 first-ixian heal RACED the auto-enter and lost on warm entries)');
  ok(/url\.StartsWith\("ixian:", StringComparison\.OrdinalIgnoreCase\) \? "ixian:\*" : "load"/.test(iosHandler)
    && !/console\.error\('" \+ url/.test(iosHandler),
    '#312: the heal log uses a FIXED vocabulary ("load"/"ixian:*") — a raw URL interpolated into an EvaluateJavaScript string would be a JS-injection vector from navigation payloads');

  /* —— #309b: the staged-latch RE-LATCH (r3 reviewer MAJOR — the residue math was wrong) —— */
  ok(/let playedBox = null;/.test(scanJs) && /addEventListener\('playing', recordPlayed, \{ once: true \}\)/.test(scanJs),
    '#309b: the sizer records the box the library latched its decode region from (its \'playing\' listener registers first, so ours reads post-latch)');
  ok(/playedBox\.w \* playedBox\.h \* 1\.25/.test(scanJs) && /const requestRestart = \(\) => \{/.test(scanJs)
    && /if \(restarted\) return;/.test(scanJs),
    '#309b: a >25% post-\'playing\' box GROW silently stops+relaunches the camera ONCE — the latched region sampled only the top-left ~70% of the frame, clipping a bracket-filling QR\'s finder (r3 math); the fresh start latches the full box');
  ok(/if \(instance !== inst\) return;[\s\S]{0,900}?feedSizer = attachFeedSizer\(feedEl, desktop, null\);[\s\S]{0,300}?launch\(/.test(scanJs),
    '#309b: the relaunch bails when stop() ran during teardown, and the FRESH sizer attaches only after stop() resolved (r4 MINOR: a pre-stop attach hooks the DYING video and never sees the relaunched one — a different-aspect fallback camera would scan distorted with no recovery)');
  ok(/growFired = true;[\s\S]{0,80}?video = null;/.test(scanJs),
    '#309b: off() latches growFired — a detached sizer must never restart anything');
  ok(/attachFeedSizer\(feedEl, desktop, \(\) => requestRestart\(\)\)/.test(scanJs) && /attachFeedSizer\(feedEl, desktop, null\)/.test(scanJs),
    '#309b: the first sizer arms the re-latch via a deferring lambda (TDZ-safe); the post-restart sizer passes null — one re-latch per start is the contract');
}

console.log('#314 — polish batch (selectability · mention pill · toast/CTA · iOS-47/48 · i18n · backup poll · R6 sheet · dev 10-tap)');
{
  const mb = readFileSync(join(root, 'src/components/message-bubble.js'), 'utf8');
  const homeSh = readFileSync(join(root, 'src/shells/home.html'), 'utf8');
  const settingsSh = readFileSync(join(root, 'src/shells/settings.html'), 'utf8');
  const baseCss = readFileSync(join(root, 'src/styles/base.css'), 'utf8');
  const toastCss = readFileSync(join(root, 'src/styles/components/toast.css'), 'utf8');
  const lockCss = readFileSync(join(root, 'src/styles/components/lock-shell.css'), 'utf8');
  const contactsCss = readFileSync(join(root, 'src/styles/components/contacts-shell.css'), 'utf8');
  const topbarCss = readFileSync(join(root, 'src/styles/components/topbar.css'), 'utf8');
  const topbarJs = readFileSync(join(root, 'src/components/topbar.js'), 'utf8');
  const walletJs = readFileSync(join(root, 'src/components/wallet-shell.js'), 'utf8');

  /* mention ↔ linkify — BEHAVIORAL (the repro that pinned the bug, kept as the pin) */
  {
    const pinDom = new JSDOM('<!doctype html><body></body>', { pretendToBeVisual: true, url: 'file:///pin/' });
    const hadWin = 'window' in globalThis ? globalThis.window : undefined;
    const hadDoc = 'document' in globalThis ? globalThis.document : undefined;
    globalThis.window = pinDom.window; globalThis.document = pinDom.window.document;
    try {
      const { createMessageBubble } = await import('file://' + join(root, 'src/components/message-bubble.js'));
      const flat = (text, mention) => {
        const row = createMessageBubble({ text, direction: 'received', mention, strings: {} });
        const out = [];
        const walk = (n) => { for (const c of n.childNodes) {
          if (c.nodeType === 3) out.push('T:' + c.textContent);
          else if (c.classList && c.classList.contains('c-bubble__mention')) out.push('M:' + c.textContent);
          else if (c.classList && c.classList.contains('c-bubble__link')) out.push('L:' + c.textContent);
          else walk(c); } };
        walk(row);
        return out.join('|');
      };
      ok(flat('@bob.com hello', { names: [] }).includes('M:@bob.com'),
        '#314 mention: a URL-looking nick with NO roster pills WHOLE ("@bob.com", not "@bob" + ".com" — the dotted generic term)');
      ok(flat('hi @Bob site.com !', { names: ['Bob site.com'] }).includes('M:@Bob site.com'),
        '#314 mention: a multi-word roster nick with a URL-looking word pills WHOLE — mentions now split BEFORE linkify (the link button stole "site.com" out of the pill)');
      const email = flat('mail a@bob.com ok', { names: [] });
      ok(!email.includes('M:') && !email.includes('L:'),
        '#314 mention: the #231c email guard survives the inversion — "a@bob.com" is neither a pill nor a link');
      ok(flat('@Ana see x.com', { names: ['Ana'] }).includes('L:x.com'),
        '#314 mention: linkify still runs on the plain runs BETWEEN mentions (bare-domain whitelist intact)');
      ok(flat('@bob. Next', { names: [] }).includes('M:@bob') && !flat('@bob. Next', { names: [] }).includes('M:@bob.'),
        '#314 mention: a sentence-ending dot stays OUT of the pill (each dotted segment requires a following word run)');
      ok(flat('check https://mastodon.social/@gargron today', { names: ['gargron'] }).includes('L:https://mastodon.social/@gargron'),
        '#314 mention (#46 r1 MAJOR-2): a profile URL keeps its /@handle INSIDE the link — the mention pass must not steal it (mastodon/youtube/x profile links became wrong-target stumps)');
      ok(flat('youtube.com/@veritasium and @bob too', { names: ['bob'] }).includes('L:youtube.com/@veritasium')
        && flat('youtube.com/@veritasium and @bob too', { names: ['bob'] }).includes('M:@bob'),
        '#314 mention (#46 r1 MAJOR-2): a rejected path-handle and a REAL mention coexist in one message — the run stays contiguous through the rejection');
    } finally {
      if (hadWin === undefined) delete globalThis.window; else globalThis.window = hadWin;
      if (hadDoc === undefined) delete globalThis.document; else globalThis.document = hadDoc;
    }
  }
  ok(/forEachMentionSplit\(text, mention,\s*\n?\s*\(run\) => linkifyPlain\(parent, run, onLinkClick\)/.test(mb),
    '#314 mention (structure): linkifyInto delegates mention-first — plain runs go through linkifyPlain, mention spans append verbatim');

  /* toast + CTA safe-area (Damir screenshots) */
  ok(/toast\.css/.test(settingsSh),
    '#314 toast: settings.html links toast.css — the "Settings saved" toast rendered UNSTYLED in document flow under the bottom bar (the screenshot bug was a missing stylesheet, not z-index)');
  ok(/bottom: calc\(var\(--layout-bar-bottom\) \+ env\(safe-area-inset-bottom, 0px\) \+ var\(--spacing-16\)\)/.test(toastCss),
    '#314 toast: the styled toast clears the SAFE-AREA-tall iOS bottom bar (64px token vs 64+env real height)');
  ok(/c-encpass__footer \{[\s\S]{0,400}?padding-bottom: calc\(var\(--spacing-12\) \+ env\(safe-area-inset-bottom, 0px\)\)/.test(lockCss),
    '#314 CTA: the Change-password footer clears the iOS home indicator (launch-shell canonical pattern)');
  ok(/c-contacts__footer \{[\s\S]{0,400}?padding-bottom: calc\(var\(--spacing-12\) \+ env\(safe-area-inset-bottom, 0px\)\)/.test(contactsCss),
    '#314 CTA: the Add-contact footer had the IDENTICAL latent bug — swept with the same pattern');

  /* iOS-47 — Sora scoped to the wordmark */
  ok(!/\.c-topbar\[data-variant="root"\] \.c-topbar__title \{[^}]*font-display/.test(topbarCss)
    && /\.c-topbar__title > \.c-topbar__word \{\s*\n?\s*font-family: var\(--font-display\)/.test(topbarCss),
    'iOS-47: --font-display moved OFF the root title rule and onto .c-topbar__word alone — "Apps" (a plain root title) rendered Sora against the #226/B1 wordmark-only canon');
  ok(/word\.className = 'c-topbar__word'/.test(topbarJs) && /variant === 'root'\) \{[\s\S]{0,400}?const word = document\.createElement\('span'\)/.test(topbarJs),
    'iOS-47/48: the wordmark carries the __word class; plain ROOT titles get a class-less inner span (stable M16 swap target, system face)');

  /* iOS-48 — Connecting title-state */
  ok(/data-connecting/.test(homeSh) && /strings\.connecting \|\| 'Connecting'/.test(homeSh),
    'iOS-48: the connectivity push is only RECOGNIZED — the title renders the SHORT i18n copy, never the truncating legacy string');
  ok(/c-topbar__dots/.test(homeSh) && /setAttribute\('aria-hidden', 'true'\)/.test(homeSh),
    'iOS-48: the animated ellipsis is aria-hidden static glyphs (no text mutation → no aria-live spam)');
  ok(/@keyframes topbar-dot/.test(topbarCss) && /prefers-reduced-motion: reduce\) \{\s*\n?\s*\.c-topbar__dots span \{ animation: none/.test(topbarCss),
    'iOS-48: dots step via CSS opacity keyframes and hold steady under prefers-reduced-motion');
  ok(/\.c-topbar__title\[data-connecting\] > span \{\s*\n?\s*font-family: var\(--font-secondary\)/.test(topbarCss),
    'iOS-48: while connecting, the title is UI text — system face overrides the wordmark Sora for exactly that window');

  /* chrome selectability sweep */
  ok(/:root:not\(\[data-desktop\]\) \.c-bottomnav,[\s\S]{0,600}?\.fab \{[\s\S]{0,200}?-webkit-touch-callout: none;[\s\S]{0,100}?-webkit-user-select: none;/.test(baseCss),
    '#314 sweep: nav/rows/topbars/chips/FAB suppress selection AND the iOS callout on touch surfaces only (desktop drag-select intact; message TEXT rules untouched)');

  /* backup badge — the REFRESH gap (C-9 cleared storage; iOS fires none of the 3 listeners) */
  ok(/setInterval\(\(\) => \{ if \(!document\.hidden && !exiting\) refreshBackupStampIfChanged\(\); \}, 2000\)/.test(settingsSh),
    '#314 backup: a visibility+park-guarded 2s stamp poll closes the iOS refresh gap (no cross-WebView storage event, no focus/visibility on overlay pop) — change-guarded so it never rebuilds mid-edit');

  /* landtab — consumed on the deterministic C# close push */
  ok(/onSettingsClosed\(\) \{ consumeLandTab\(\); setNavActive\(nav, activeNav\); \}/.test(homeSh),
    '#314 landtab (iOS-46 leg): onSettingsClosed consumes the tab hand-off BEFORE the highlight re-sync — the storage/focus listeners never fire on iOS overlay close');

  /* R6 — full-detail tx sheet via roster join, hide fail-safe FIRST */
  ok(/enrichTx: \(tx\) => \{\s*\n?\s*if \(walletHidden \|\| !tx \|\| !tx\._raw\) return tx;/.test(homeSh),
    'R6 ★: the hide mask is the FIRST check in enrichTx — a hidden wallet returns the masked row UNTOUCHED (the #285/#288 fail-safe: enrichment can never leak name/address/avatar around the mask)');
  ok(/const byAddr = raw\.address \? contactsRoster\.find\(\(c\) => c && !isGroupContact\(c\)/.test(homeSh)
    && /const byName = !byAddr && raw\.name \? contactsRoster\.find\(\(c\) => c && !isGroupContact\(c\)/.test(homeSh),
    'R6 (#46 r1 MINOR-2): the roster join resolves counterparties over PEOPLE only — a name-collision must never print a GROUP address as the copyable payment counterparty (the #255 money-fence reasoning)');
  ok(/opts\.enrichTx === 'function'\) \? \(opts\.enrichTx\(tx\) \|\| tx\) : tx/.test(walletJs),
    'R6: wallet-shell rows pass through the host decorator when supplied; demos (no decorator) keep the raw row');

  /* iOS-22 — dev-mode 10-tap (zero-C#: the HomePage verbs never left) */
  ok(/sl-devmode/.test(homeSh) && /\*SL\{devMode\}/.test(homeSh),
    'iOS-22: the devMode custom-string carrier persists the mode across restarts (legacy index.html grammar; raw marker in preview = false)');
  ok(/taps = \(now - lastTap < 1200\) \? taps \+ 1 : 1;/.test(homeSh) && /if \(taps < 10\) return;/.test(homeSh),
    'iOS-22: 10 taps within a rolling 1.2s window — a long-lived home page cannot accumulate accidental lifetime taps (the legacy counter never reset)');
  ok(/ixian:enableDevMode/.test(homeSh) && /ixian:disableDevMode/.test(homeSh) && /bridge\.send\('ixian:dev'\)/.test(homeSh),
    'iOS-22: enable/disable toggle + the dev-log entry ride the EXISTING HomePage verbs (xaml:756-770) — zero C#');

  /* i18n drafts — the "untranslated" report was missing DRAFTS, not missing keys */
  {
    const langs = ['de-de', 'es-co', 'fr-fr', 'sr-sp', 'sl-si', 'ru-ru', 'pt-br'];
    const missing = [];
    for (const l of langs) {
      const d = JSON.parse(readFileSync(join(root, 'src/strings/draft/' + l + '.json'), 'utf8'));
      for (const k of ['people', 'groups', 'howToIntro', 'howToStep1', 'howToStep4Body', 'connecting']) {
        if (!d[k]) missing.push(l + ':' + k);
      }
    }
    ok(missing.length === 0,
      '#314 i18n: people/groups + the how-to steps + connecting carry DRAFT translations in all 7 locales (was: keys extracted fine, every locale fell back to English)' + (missing.length ? ' — MISSING ' + missing.join(', ') : ''));
  }
}

console.log('#315 — Account as a peer tab (iOS-46 route (a): park + re-present)');
{
  const scp = readFileSync(join(root, 'Spixi/Utils/SpixiContentPage.cs'), 'utf8');
  const hp = readFileSync(join(root, 'Spixi/Pages/Home/HomePage.xaml.cs'), 'utf8');
  const sp = readFileSync(join(root, 'Spixi/Pages/Settings/SettingsPage.xaml.cs'), 'utf8');
  const settingsSh = readFileSync(join(root, 'src/shells/settings.html'), 'utf8');

  ok(/public bool parkOnClose = false;/.test(scp)
    && /if \(op\.parkOnClose && op\.target\.pageLoaded\)\s*\r?\n?\s*\{[\s\S]{0,1600}?parkedOverlay = op;/.test(scp)
    && /op\.target\.Dispose\(\);\s*\/\/ tear the WebView down/.test(scp),
    '#315: closeOverlay PARKS a booted parkOnClose op — stage hidden + input-transparent, WebView kept warm, single parked slot (the dispose branch is untouched for every other overlay)');
  ok(/private static PreloadOp\? parkedOverlay = null;/.test(scp)
    && !/overlayStack\.Add\(parkedOverlay/.test(scp),
    '#315: the parked op lives OUTSIDE overlayStack — parked = CLOSED for every consumer (getOverlayPages, back handling, exit sweeps); only representParkedOverlay resurrects it');
  ok(/public static bool representParkedOverlay\(SpixiContentPage target\)[\s\S]{0,700}?if \(modalOverlayOp != null\)[\s\S]{0,120}?return false;/.test(scp),
    '#315 ★ #230 fail-closed: the re-present path REFUSES while a lock is shown in place — same guard class as pushPageLoaded (an overlay must never cover the lock)');
  ok(/representParkedOverlay\(SpixiContentPage target\)[\s\S]{0,1400}?overlayStack\.Count > 0\)[\s\S]{0,40}?return false;/.test(scp),
    '#315: re-present refuses when ANY overlay is open — the parked stage kept its old grid position, so presenting under a newer stage would layer it invisibly; the caller falls back to fresh-construct');
  ok(/setOverlayHost[\s\S]{0,3000}?disposeParkedOverlay\(\);/.test(scp),
    '#315: a re-created overlay host tears the parked page down with the stale overlays (same orphan class)');
  ok(/if \(!railPane && !parkedSettings\.isPaneMode[\s\S]{0,140}?representParkedOverlay\(parkedSettings\)\)/.test(hp)
    && /SpixiContentPage\.disposeParkedOverlay\(\);/.test(hp),
    '#315: HomePage re-presents ONLY when it is NOT the rail pane and the parked page was built non-pane (pane geometry does not survive a mode crossing); any mismatch disposes the parked instance BEFORE constructing fresh — never two live SettingsPages');
  /* ★ A9 (#348): the Account peer-pane is gated on a DESKTOP IDIOM, not on raw width.
     The pane exists to leave the home nav RAIL visible, and that rail is drawn by the
     home WebView behind `:root[data-desktop]` — a UA sniff that never fires on Android.
     A landscape phone is 700-950 DIP wide, so the old width-only test handed it the
     desktop branch: a 72dip strip left uncovered over a layout with no rail in it, and
     a settings shell that hid its own tab bar in favour of that missing rail. */
  ok(/bool railPane = wide && \(DeviceInfo\.Platform == DevicePlatform\.WinUI[\s\S]{0,120}?DevicePlatform\.MacCatalyst\)/.test(hp)
    && !/DeviceIdiom\.Desktop/.test(hp),
    '★ A9 (#348): the Account pane gate is the PLATFORM, never the IDIOM. Idiom is posture-dependent — a Surface with its keyboard detached reports Tablet, Mac Catalyst reports Tablet by default — while the shells set data-desktop on both regardless. Gating on Idiom relocates the A9 symptom instead of removing it');
  ok(/if \(railPane\)\s*\r?\n\s*\{\s*\r?\n\s*pushPageLoaded\(new SettingsPage\(true, leftPaneWidth - railWidthDip\)/.test(hp),
    '★ A9 (#348): ONE boolean drives the branch AND the re-present guard above it. Gating only the branch would park every landscape-Android Account and then refuse to re-present it — a hidden live WebView per open');
  ok(/pushPageLoaded\(new SettingsPage\(\), 4000, "settings", -1, null, default, true\)/.test(hp),
    '#315: only the NARROW Account push parks (wide keeps the #245 pane lifecycle unchanged)');
  ok(/public bool isPaneMode \{ get \{ return paneMode; \} \}/.test(sp),
    '#315: the park guard reads the hosting mode through a real accessor');
  ok(/onBack: undefined,/.test(settingsSh) && !/onBack: isDesktop \? undefined : exitSettings/.test(settingsSh),
    'iOS-46: the hub topbar has NO back arrow on any form factor — Account is a TAB (exits: peer-nav taps / rail / hardware back via handlers.onBack, all through exitSettings so held edits still save)');

  /* —— #46 r1 loop fixes over the park machinery —— */
  ok(/Utils\.sendUiCommand\(op\.target, "onRepresented"\);[\s\S]{0,200}?op\.stage\.InputTransparent = false;/.test(scp)
    && /onRepresented\(\) \{[\s\S]{0,300}?exiting = false;/.test(settingsSh)
    && /onRepresented\(\) \{[\s\S]{0,1600}?renderLayout\(\);/.test(settingsSh)
    && /onRepresented\(\) \{[\s\S]{0,1600}?state\.savedName = state\.name;[\s\S]{0,200}?state\.dirtyNick = state\.dirtyAvatar = state\.dirtyLock = false;/.test(settingsSh),
    '#46 r1 MAJOR-1 (+r2): the re-present pushes onRepresented BEFORE the stage becomes interactive; the shell resets the #199 exit latch, RECONCILES the dirty machinery with the already-persisted parking exit (r2: a stale savedName silently DROPPED a nickname revert) and repaints');
  /* review MINOR-5: comments are stripped and the window is tight again. This
   * batch's own comments had grown the method past the old 1400-char window, and
   * simply widening it degraded the pin to "both strings exist somewhere in the
   * file, in that order" — it would have passed with the dispose moved into a
   * different method. */
  {
    /* The body, not a character window. A window big enough to hold the method is
     * also big enough to hold the NEXT method, so it passed with the dispose moved
     * one method down — which is exactly the drift this pin exists to catch. */
    const uhBody = (readFileSync(join(root, 'Spixi/Utils/UIHelpers.cs'), 'utf8')
      .replace(/\r\n/g, '\n').match(/reloadAllPages\(\)\s*\n\s*\{([\s\S]*?)\n        \}\n/) || [])[1] || '';
    ok(/SpixiContentPage\.disposeParkedOverlay\(\);/.test(uhBody),
      '#46 r1 MAJOR-3: reloadAllPages drops the parked page — an OS auto-theme flip must never re-present yesterday\'s theme (the #251 EmptyDetail class)');
  }
  ok(/onLowMemory\(\)[\s\S]{0,900}?disposeParkedOverlay\(\);/.test(readFileSync(join(root, 'Spixi/Meta/Node.cs'), 'utf8')),
    '#46 r1 MINOR-3: low memory releases the warm WebView — the memory dial has a pressure valve, and the content-process-death window shrinks to presented-only');
  ok(/if \(!overlayStack\.Remove\(op\)\)[\s\S]{0,1900}?parkedOverlay = op;\s*\r?\n\s*parked = true;\s*\r?\n\s*\}\s*\r?\n\s*\}\s*\r?\n\s*MainThread\.BeginInvokeOnMainThread/.test(scp)
    && /stillParked = parkedOverlay == op;/.test(scp)
    && /op\.parkOnClose && op\.target\.pageLoaded/.test(scp),
    '#46 r1 MINOR-1 (+r2): the park claim sits between the stack-Remove and the lock CLOSE (r2 pin: anchored on the un-relocatable neighbors — moving the claim outside the lock breaks the brace run before MainThread), the deferred hide re-checks it, and only a BOOTED shell parks (pageLoaded gate — a wedged shell takes the pre-#315 dispose self-heal)');
  ok(/if \(!document\.hidden && !exiting\) refreshBackupStampIfChanged\(\)/.test(settingsSh),
    '#46 r1 MINOR-4: the backup poll pauses while PARKED (document.hidden stays false at opacity 0) and resumes via onRepresented');
  ok(/hasModalOverlay\(\)\)\s*\r?\n?\s*\{\s*\r?\n?\s*return;/.test(hp),
    '#46 r1 NIT-2: a lock-refused re-present keeps the warm instance for after the unlock (the fresh push would be dropped by the same #230 gate anyway)');

  /* —— #320: Damir device-F5 round 1 fixes —— */
  const settingsShellJs = readFileSync(join(root, 'src/components/settings-shell.js'), 'utf8');
  ok(/variant: onBack \? 'view' : 'root', title: strings\.account \|\| 'Account', onBack,/.test(settingsShellJs),
    '#320: a back-less hub (= the peer TAB) renders the ROOT topbar variant — bold action ink + root padding, exact parity with the Chats/Apps/Wallet bars (Damir: title mis-aligned + wrong face)');
  ok(/exitSettings\(\);[\s\S]{0,700}?setNavActive\(nav, 'account'\);/.test(settingsSh)
    && /onRepresented\(\) \{[\s\S]{0,2200}?setNavActive\(nav, 'account'\);/.test(settingsSh),
    '#320: the peer nav highlight snaps back to Account after an exit tap AND on re-present — bottomnav auto-selects the tapped item before onChange, so the page PARKED with the wrong tab lit (Damir: Denarnica highlighted on the Account screen)');

  /* —— #321: R5 dev-mode parity (send-log + live HUD) —— */
  const devSh = readFileSync(join(root, 'src/shells/dev.html'), 'utf8');
  const devCs = readFileSync(join(root, 'Spixi/Pages/Dev/DevPage.xaml.cs'), 'utf8');
  const homeSh2 = readFileSync(join(root, 'src/shells/home.html'), 'utf8');
  ok(/bridge\.cap\('sendlog'\)\s*\r?\n?\s*\? \{ onSendLog: \(ctrl\) => \{ bridge\.send\('ixian:sendlog'\); ctrl\.done\(\); \} \}/.test(devSh)
    && /if \(!had && bridge\.cap\('sendlog'\)\) buildDev\(\);/.test(devSh),
    '#321: Send-log is CAP-GATED (old exe → no dead button) and the screen rebuilds when the cap lands after the boot build (the onLoad burst follows parse)');
  ok(/setCaps", "sendlog"\);/.test(devCs)
    && /current_url\.Equals\("ixian:sendlog", StringComparison\.Ordinal\)/.test(devCs),
    '#321: DevPage declares the cap at onLoad and dispatches ixian:sendlog');
  ok(/string shareLogPath = Path\.Combine\(Config\.spixiUserFolder, "spixi-log\.txt"\);/.test(devCs)
    && /Share\.RequestAsync\(new ShareFileRequest/.test(devCs)
    && /#if WINDOWS[\s\S]{0,700}?Downloads[\s\S]{0,400}?#else/.test(devCs),
    '#321 §3: C# NAMES every path itself (no WebView-supplied filename), mobile shares via the OS sheet, Windows saves to Downloads (Damir desktop dial)');
  ok(/renderDevHud = \(info\) => \{/.test(homeSh2)
    && /new DOMParser\(\)\.parseFromString\(String\(info \|\| ''\), 'text\/html'\)/.test(homeSh2)
    && /cell\.textContent = a\.textContent;/.test(homeSh2)
    && !/hud\.innerHTML/.test(homeSh2),
    '#321 HUD: the C#-composed markup is parsed INERT and re-rendered as textContent cells — NEVER innerHTML\'d (the legacy sink); a parse miss falls back to a tag-stripped flat line');
  ok(/updateDebugInfo\(info\) \{ renderDevHud\(info\); \}/.test(homeSh2)
    && /if \(!devMode\) \{ hud\.hidden = true; return; \}/.test(homeSh2),
    '#321 HUD: the 1 Hz updateDebugInfo push renders ONLY while devMode is on (double-gated: C# checks devMode, the shell re-checks) and the 10-tap toggle-off hides the strip immediately');

  /* —— #322: Damir device-F5 round 2 fixes —— */
  const baseCss2 = readFileSync(join(root, 'src/styles/base.css'), 'utf8');
  ok(/:root:not\(\[data-desktop\]\) body \{\s*\n\s*-webkit-touch-callout: none;\s*\n\s*-webkit-user-select: none;/.test(baseCss2)
    && /:root:not\(\[data-desktop\]\) input,[\s\S]{0,200}?\[contenteditable\] \* \{[\s\S]{0,120}?-webkit-user-select: text;/.test(baseCss2),
    '#322 sweep: on touch, selection is suppressed at the BODY (the wallet-hero labels were the whack-a-mole tell) and re-enabled ONLY on inputs/textareas/contenteditables; explicit element-level text rules (dev log, link urls) still win');
  ok(/function titleStateTargets\(\)/.test(homeSh2)
    && /appsTopbarEl\.querySelector\('\.c-topbar__title'\)/.test(homeSh2)
    && /hero\.querySelector\('\.c-wallet-hero__title'\)/.test(homeSh2),
    '#322: the connectivity title-state lands on ALL THREE in-page tabs (chats topbar + apps topbar + wallet hero) — it was chats-only, misleading on the other tabs (Account = own WebView, accepted omission)');
  ok(/title: strings\.wallet \|\| 'Wallet',\s*\n\s*strings: walletStrings,/.test(homeSh2),
    '#322 i18n: the wallet hero title threads the translated `wallet` key — it rendered the hardcoded English default ("Wallet" on a Slovenian build, Damir screenshot)');

  /* ——— #324–#328 sweep-session pins (iOS-53/55/56/57 + the #46 loop fixes) ——— */
  const chat328 = readFileSync(join(root, 'src/shells/chat.html'), 'utf8');
  const home328 = readFileSync(join(root, 'src/shells/home.html'), 'utf8');
  const ws328 = readFileSync(join(root, 'src/shells/wallet_sent.html'), 'utf8');
  const cd328 = readFileSync(join(root, 'src/shells/contact_details.html'), 'utf8');
  const scp328 = readFileSync(join(root, 'Spixi/Utils/SpixiContentPage.cs'), 'utf8');
  const hp328 = readFileSync(join(root, 'Spixi/Pages/Home/HomePage.xaml.cs'), 'utf8');
  const chdr328 = readFileSync(join(root, 'src/components/chats-header.js'), 'utf8');
  const sapp328 = readFileSync(join(root, 'src/components/settings-app.js'), 'utf8');
  // #324: the native contentOffset pin arms in WillChangeFrame BEFORE the inset push
  ok(/if \(overlap > 0\)\s*\n\s*pinKeyboardScroll\(\);[\s\S]{0,500}\(int\)overlap/.test(scp328),
    '#324: the KVO contentOffset pin arms BEFORE the inset push on the SHOW path (WillChangeFrame precedes the pan — probe-proven ordering; reviewer r2: the loose pin matched WillHide via the unpin substring)');
  ok(/AddObserver\("contentOffset"/.test(scp328) && /unpinKeyboardScroll\(\);/.test(scp328),
    '#324: pin = KVO on contentOffset with an unpin release path (WillHide + detach)');
  ok(/#chat-composer \{ transition: margin-bottom 280ms/.test(chat328)
    && /prefers-reduced-motion: reduce\) \{ #chat-composer \{ transition: none/.test(chat328),
    '#324 r2: the composer rides the keyboard (280ms margin transition, reduced-motion instant)');
  ok(/if \(open && stick && insetChanged\) stickDuring\(340\);/.test(chat328)
    && /if \(px > 60 && stick && insetChanged\) stickDuring\(340\);/.test(chat328),
    '#328: bottom-stick is CHANGE-GATED in both writers — the exact if-conditions, not just the identifier (the settle ladder must not re-arm a ~1.7s pin window — audit MAJOR; reviewer r2: the count-based pin was decorative)');
  ok(/cancelAnimationFrame\(stickRaf\);\s*\n\s*stickEnd = 0;/.test(chat328),
    '#328: any user touch cancels the stick (the loop must never fight a scroll or yank the @-FAB jump while the mention marker burns — audit MAJOR)');
  // #325: shell edge-swipe back — sheet-first, channel-panel aware, selection-guarded
  ok(/function edgeSwipeBack|\(function edgeSwipeBack\(\)/.test(chat328)
    && /dismissTopOverlay/.test(chat328) && /ixian:back/.test(chat328),
    '#325: edge-swipe back lives in the SHELL (two native recognizer rounds died in UIKit arbitration — do not resurrect them) and consults the overlay stack before ixian:back');
  ok(/Math\.max\(70, dy \* 2\)[\s\S]{0,900}if \(channelDropdown\) \{ closeChannelSelector\(\); return; \}/.test(chat328),
    '#328: the hand-rolled channel selector (not on the overlay stack) consumes the swipe INSIDE the edge handler — sheet-first covers it (audit MINOR; anchored past the axis gate: the #252 title-tap toggle uses the same line shape elsewhere)');
  ok(/sel && !sel\.isCollapsed/.test(chat328) && /dx > Math\.max\(70, dy \* 2\)/.test(chat328),
    '#328: an active text selection is never stolen by the swipe + dominant-axis gate (audit MINOR/NIT)');
  /* #336: the Android kb-probe measured (2026-08-12) → RETIRED with the lever.
   * Both probes stay gone; AND-16 v2 (the settle-tracked re-pin on the Android
   * innerHeight shrink) is pinned present. */
  ok(!/__kbProbe|\[kb-probe\]|kbProbeAndroid/.test(chat328),
    '#336: both kb-probes are retired from the shell (measurement done)');
  ok(/AND-16 v2 \(#336\)/.test(chat328)
    && /const shrank = ih < lastIH - 60/.test(chat328)
    && /if \(shrank && wasAtBottom\) stickDuring\(500\)/.test(chat328),
    '#336/AND-16 v2: Android innerHeight-shrink re-pins the log via settle-tracked stickDuring, near-bottom judged pre-shrink');
  // #326: iOS slide-out on back-initiated overlay closes
  ok(/closeOverlay\(PreloadOp op, bool slideOut = false\)/.test(scp328)
    && /closeOverlay\(overlayOp, true\)/.test(scp328)
    && /closeOverlay\(overlays\[i\], i == overlays\.Count - 1\)/.test(scp328),
    '#326: slide-out is BACK-INITIATED only (popPageAsync + popToRootAsync topmost); close-audits stay instant');
  ok(/op\.column < 0[\s\S]{0,200}DevicePlatform\.iOS/.test(scp328),
    '#328: column-pinned (split-view) stages never slide — phone pop-grammar stays off the iPad split (audit MINOR)');
  ok(/InputTransparent = true;\s*\n\s*double w = op\.stage\.Width/.test(scp328),
    '#328: the sliding stage goes INPUT-DEAD before the animation starts (a second back-tap mid-slide fell through to the native stack — the #272 pop-the-top class, audit MAJOR)');
  ok(/op\.stage\.TranslationX = 0;/.test(scp328),
    '#326 belt: no translated stage can reach a reuse path');
  // iOS-55 (W1): epoch timestamps, numeric-detect with the >0 guard, all four surfaces
  ok(/string time = activity\.timestamp\.ToString\(\);/.test(hp328),
    'iOS-55: HomePage pushes the RAW EPOCH — DateTime.ToString under the .NET culture never followed the app language');
  ok(/&& Number\(String\(time\)\.trim\(\)\) > 0\)/.test(home328) && /timestamp: Number\(String\(time\)\.trim\(\)\) \* 1000/.test(home328),
    'iOS-55/#328: home.html numeric-detects with the epoch>0 guard (0 degrades to no-time, never a 1970 date)');
  ok(/Number\(s\) > 0\) return formatTxTimestamp\(Number\(s\) \* 1000\)/.test(ws328)
    && /formatTxTimestamp,/.test(ws328),
    'iOS-55/#328: wallet_sent formats epoch via formatTxTimestamp (destructured) with the >0 guard');
  const cdcs328 = readFileSync(join(root, 'Spixi/Pages/Contacts/ContactDetails.xaml.cs'), 'utf8');
  ok(/timestamp: Number\(String\(time\)\.trim\(\)\) \* 1000/.test(cd328)
    && /string time = activity\.timestamp\.ToString\(\);/.test(cdcs328)
    && !/= Utils\.unixTimeStampToString/.test(cdcs328),
    '#328: ContactDetails recent activity joined the W1 fix — BOTH halves (C# epoch push + shell numeric-detect; reviewer r2: the C# half was unpinned)');
  ok(/formatTxTimestamp\(Number\(s\) \* 1000\)/.test(sapp328) && /import \{ formatTxTimestamp \}/.test(sapp328),
    '#328: the downloads file-date joined the W1 fix (settings + downloads shells, one component site)');
  ok(!/unixTimeStampToHumanFormatString/.test(hp328),
    'iOS-55: no formatted-time push remains in HomePage');
  // #327: chats header = list content on mobile
  ok(/scroller\.insertBefore\(header, list\)/.test(home328)
    && /data-desktop'\)\)\s*\{\s*\n\s*document\.getElementById\('chats-header'\)\.append\(header\);\s*\n\s*attachChatsCollapse/.test(home328),
    '#327: mobile mounts the header IN the scroller (native physics); the triggered collapse is DESKTOP-ONLY');
  const chdrCss328 = readFileSync(join(root, 'src/styles/components/chats-header.css'), 'utf8');
  ok(/\.u-scroll > \.c-chats-header\.is-pinned \{\s*\n\s*position: sticky/.test(chdrCss328),
    '#327: the searching header pins sticky at the scroller top (results cannot scroll the query away)');
  ok(/searching = headerEl\.contains\(document\.activeElement\)/.test(chdr328)
    && /delta > COLLAPSE_DELTA_PX && !searching/.test(chdr328),
    '#328: the desktop collapse never fires mid-search — the && !searching lives in the COLLAPSE BRANCH itself (audit MINOR; reviewer r2: the assignment-only pin was decorative)');
  ok(/scroller\.insertBefore\(header, list\)/.test(readFileSync(join(root, 'src/demo/chats.html'), 'utf8')),
    '#328: the phone-frame demo mirrors the shipped in-list header (demo drift — audit MINOR)');
}

{
  /* —— #334 fix-session pins — regression guards over the loop's fixes —— */
  const chat334 = readFileSync(join(root, 'src/shells/chat.html'), 'utf8');
  ok(/rec\.transferStarted = true/.test(chat334)
    && /!rec\.transferStarted && !\(Number\(rec\.progress\) > 0\) && !composerLock/.test(chat334),
    '#334 loop: file-send Cancel gates on the transferStarted MODEL latch + composerLock (mid-transfer resurrect + locked-chat dead button)');
  ok(/'touchstart', 'wheel', 'mousedown', 'keydown'/.test(chat334),
    '#334 loop: the bootRepin user-input abort covers keyboard scrolling too');
  const toks334 = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8');
  ok(/--bubble-max-pct: 82%/.test(toks334) && /--layout-bubble-max: 360px/.test(toks334),
    '#334: bubble width dial = 82% / 360px (Damir)');
  const scan334 = readFileSync(join(root, 'src/bridge/scan-page.js'), 'utf8');
  ok(/match\(\/\\d\+\/g\); return m \? parseInt\(m\[m\.length - 1\], 10\)/.test(scan334),
    '#334 loop: the AND-22 camera rank keys on the LAST digit run (the camera2-prefix made the first-digit rank a no-op)');
  const set334 = readFileSync(join(root, 'src/shells/settings.html'), 'utf8');
  // reviewer r2: co-location pin — the bare greps matched the DECLARATION and the
  // pre-existing stash sites, so reverting the setLocale hygiene stayed green.
  ok(/setLocale\(code\)[\s\S]{0,1200}emptyEl = null;[\s\S]{0,900}removeItem\(VIEW_RESUME_KEY\)[\s\S]{0,600}buildPeerNav\(\);/.test(set334),
    '#334 loop: setLocale ITSELF drops the memoized empty pane + the stranded #274 reload-stash (co-located pin)');
  const home334 = readFileSync(join(root, 'src/shells/home.html'), 'utf8');
  ok(/headerQuery === '' && header\.contains\(document\.activeElement\)/.test(home334),
    '#334 AND-23: an empty-query touch scroll blurs the search field (Android sticky-header release)');
  const bundle334 = readFileSync(join(root, 'src/demo/spixi.iife.js'), 'utf8');
  ok(/c-fbubble__cancel/.test(bundle334),
    '#334: the file-send Cancel affordance shipped in the bundle');
  // #336 AND-29: home takeovers push open/closed state so hardware back closes
  // them instead of exiting the app; C# routes back via the homeBack handler.
  // (#337: homeBack gained the stale-state self-heal — pin the new shape.)
  ok(/ixian:homeoverlay:/.test(home334) && /if \(!closeTopHomeTakeover\(\)\) syncHomeOverlay\(\);/.test(home334)
    && /function closeTopHomeTakeover/.test(home334),
    '#336 AND-29: home shell pushes takeover state + exposes homeBack w/ stale-state self-heal (#337)');
  // #336 iOS-59/#15: settings hub scroll survives a takeover-sublevel round-trip.
  const set336 = readFileSync(join(root, 'src/shells/settings.html'), 'utf8');
  ok(/hubScrollTop/.test(set336) && /root\.contains\(hubEl\)/.test(set336),
    '#336 (#15): settings hub scrollTop is preserved across a takeover sublevel (About/How-to/etc.)');
}

{
  /* —— #337 audit-loop pins — the #46 pass over the #336 deltas —— */
  const home337 = readFileSync(join(root, 'src/shells/home.html'), 'utf8');
  const hp337 = readFileSync(join(root, 'Spixi/Pages/Home/HomePage.xaml.cs'), 'utf8');
  // AND-29 r3 MAJOR: the state push is DEFERRED out of the emitting task — a raw
  // location.href push in the same task as a verb nav coalesces last-wins (the
  // #185 lesson): group-create was clobber-able, pick-to-chat left stale state.
  ok(/homeOverlaySyncT = setTimeout\(/.test(home337)
    && /if \(homeOverlaySyncT\) return;/.test(home337),
    '#337 AND-29 r3: syncHomeOverlay is deferred+coalesced (never shares a navigation slot with a verb — group-create clobber)');
  ok(/attributeFilter: \['data-overlay-open'\]/.test(home337)
    && /dismissTopOverlay\(\)\) return true;/.test(home337),
    '#337 AND-29: sheet coverage = body[data-overlay-open] observer + sheet-first close ordering');
  ok((home337.match(/walletTakeoverClose = close;/g) || []).length === 2,
    '#337 AND-29: BOTH wallet takeover mounts (Receive + Send) register their close for hardware back');
  // C# half: verb parse + fresh-document reset + native-overlay-first ordering.
  ok(/ixian:homeoverlay:/.test(hp337) && /homeShellOverlayOpen = current_url\.EndsWith/.test(hp337),
    '#337 AND-29: HomePage parses the homeoverlay state push');
  ok(/private void onLoaded\(\)\s*\{[\s\S]{0,700}homeShellOverlayOpen = false;/.test(hp337),
    '#337 AND-29 MAJOR: onLoaded resets the takeover flag — a shell reload (OS theme flip/reloadAllPages) must not strand back-swallowing stale state');
  ok(/SpixiContentPage\.closeTopOverlay\(\)\)\s*\{\s*return true;\s*\}[\s\S]{0,900}if \(homeShellOverlayOpen\)/.test(hp337),
    '#337 AND-29 MAJOR: OnBackButtonPressed closes the top NATIVE overlay BEFORE routing into the shell (details-over-directory: first back must close the visible page)');
  // iOS-66 MAJOR (root-caused by the audit): stale hubScrollTop latch + hub
  // detach/re-attach on every hub render → Account snapped to the bottom on a
  // language pick. One-shot consume + mounted-guard + setLocale capture.
  const set337 = readFileSync(join(root, 'src/shells/settings.html'), 'utf8');
  ok(/const t = hubScrollTop; hubScrollTop = 0;/.test(set337),
    '#337 iOS-66: the hub scroll latch is consumed ONE-SHOT (a stale value can never be re-applied)');
  ok(/currentView === 'hub' && hubEl\.parentNode === root/.test(set337),
    '#337 iOS-66: an already-mounted hub is never detach/re-attached (replaceChildren resets the scroller)');
  ok(/setLocale\(code\)[\s\S]{0,1700}hubScrollTop = hb \? hb\.scrollTop : hubScrollTop;[\s\S]{0,300}hubEl = null;/.test(set337),
    '#337 iOS-66: setLocale captures the LIVE hub scroll (isConnected-guarded, r2) before dropping the cached hub');
  // AND-16 v2 rider: the stick abort covers a finger already down when the
  // resize-armed stick starts (touchmove; the touchstart alone had a mid-drag hole).
  const chat337 = readFileSync(join(root, 'src/shells/chat.html'), 'utf8');
  ok(/\['touchstart', 'touchmove'\]/.test(chat337),
    '#337 AND-16: the stick aborts on touchmove too (resize can arm it MID-drag — #328 class)');
  ok(/box\.scrollTop = box\.scrollHeight;\s*\n\s*bootRepin\(2000\);/.test(chat337),
    '#337 iOS-62: the bootRepin ACTIVATION call survives in onChatScreenLoaded (the abort list alone was pinned — decorative)');
  ok(/@media \(hover: hover\) and \(pointer: fine\) \{ \.chat-app-picker__item:hover/.test(chat337),
    '#337: the app-invite picker hover rides the AND-18 guard (sweep miss)');
  // W4 ride-along MAJOR: typed objects hold their own rail — the 680px desktop
  // bubble raise must not stretch fixed-width cards/tiles/file rows.
  const toks337 = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8');
  const tb337 = readFileSync(join(root, 'src/styles/components/typed-bubbles.css'), 'utf8');
  const mb337 = readFileSync(join(root, 'src/styles/components/media-bubble.css'), 'utf8');
  const msg337 = readFileSync(join(root, 'src/styles/components/message-bubble.css'), 'utf8');
  ok(/--layout-card-max: 360px/.test(toks337) && /data-desktop\][\s\S]{0,400}--layout-bubble-max: 680px/.test(toks337),
    '#337 W4: card rail minted (360, NOT desktop-raised) beside the 680px desktop bubble cap');
  ok(!/--layout-bubble-max/.test(tb337) && !/--layout-bubble-max/.test(mb337)
    && /--layout-card-max/.test(tb337) && /--layout-card-max/.test(mb337),
    '#337 W4 MAJOR: payment/app/call cards, file rows and media tiles consume the card rail — none ride the desktop bubble raise');
  ok(/max-width: min\(var\(--bubble-max-pct\), var\(--layout-bubble-max\)\)/.test(msg337),
    '#337 W4: TEXT bubbles keep the bubble token (the intended raise)');
  const sn337 = readFileSync(join(root, 'src/styles/components/system-notice.css'), 'utf8');
  ok(/calc\(var\(--layout-card-max\) \+ 40px\)/.test(sn337) && !/--layout-bubble-max/.test(sn337),
    '#337 W4 r2: the secure-notice card rides the card rail too (reviewer catch — 720px on desktop otherwise)');
  // iOS-65: bottom-centered viewer close, safe-area-inset both ends.
  const mv337 = readFileSync(join(root, 'src/components/media-viewer.js'), 'utf8');
  const mvcss337 = readFileSync(join(root, 'src/styles/components/media-viewer.css'), 'utf8');
  ok(/c-mviewer__foot/.test(mv337) && /c-mviewer__close/.test(mv337),
    '#337 iOS-65: the viewer close is the bottom-centered foot button');
  ok(/safe-area-inset-bottom/.test(mvcss337) && /var\(--safe-top, 0px\)/.test(mvcss337),
    '#337 iOS-65: viewer foot + bar carry the safe-area insets (the top-bar ✕ sat under the iOS status bar) — ★ AND-7 (#401) routes the TOP one through --safe-top, since a raw env() reads 0 on Android');
  // W1: the bundle-less empty_detail stub DECODES args (base64 bridge convention);
  // contact_details gained its missing setTheme handler.
  const ed337 = readFileSync(join(root, 'src/shells/empty_detail.html'), 'utf8');
  const cdet337 = readFileSync(join(root, 'src/shells/contact_details.html'), 'utf8');
  ok(/const bin = atob\(v\);/.test(ed337) && /new TextDecoder\(\)/.test(ed337),
    '#337 W1: the empty_detail stub dispatcher decodes base64 args (the welcome pane never re-themed — Windows runtime evidence)');
  ok(/setTheme\(name\) \{ applyPushedTheme\(name\); \}/.test(cdet337),
    '#337 W1: contact_details has a live setTheme handler (was a swallowed bare-global push). ★ N81/N71 (#421): the body is the SHARED one now — theme-runtime.js still suppresses transitions across the swap (#53), it just does it in one place instead of five');
  // W3: takeover kind chips = default size (parity with the chats header).
  const csjs337 = readFileSync(join(root, 'src/components/contacts-shell.js'), 'utf8');
  ok(/createChip\(\{ label, selected: value === 'all', strings \}\)/.test(csjs337),
    '#337 W3: contacts kind chips use the DEFAULT chip size (small variant read as a different control)');
  // W0: the iOS sim RID default is Mac-only (broke Windows Build Solution).
  const csproj337 = readFileSync(join(root, 'Spixi/Spixi.csproj'), 'utf8');
  ok(/IsOSPlatform\('osx'\)\)"/.test(csproj337),
    '#337 W0: the Debug-iOS RID default carries the IsOSPlatform osx guard');
  // #10: the two friendlier titles exist in ALL EIGHT locales; the C# sites
  // carry ??-fallbacks (hidden-locale _SL null must not kill the alert).
  const langs337 = ['en-us', 'sl-si', 'de-de', 'es-co', 'fr-fr', 'pt-br', 'ru-ru', 'sr-sp'];
  ok(langs337.every((l) => {
    const t = readFileSync(join(root, 'Spixi/Resources/Raw/lang/' + l + '.txt'), 'utf8');
    return /contact-self-title\s*=/.test(t) && /contact-exists-title\s*=/.test(t);
  }), '#337 #10: contact-self-title + contact-exists-title present in all 8 locales');
  // #366 REBASED: the guarded body moved VERBATIM to SpixiContentPage
  // .sendContactRequestGuarded (shared with ContactDetails) — the pin follows it.
  const scp337 = readFileSync(join(root, 'Spixi/Utils/SpixiContentPage.cs'), 'utf8');
  ok(/_SL\("contact-self-title"\) \?\? /.test(scp337) && /_SL\("contact-exists-title"\) \?\? /.test(scp337),
    '#337 #10: both alert sites carry ??-fallbacks (the #334 L5 hidden-locale lesson)');
  // Splash: static blue only — the animated icon stays reverted.
  const v31s337 = readFileSync(join(root, 'Spixi/Platforms/Android/Resources/values-v31/styles.xml'), 'utf8');
  ok(/windowSplashScreenBackground/.test(v31s337) && !/<item name="android:windowSplashScreenAnimatedIcon/.test(v31s337),
    '#337 splash: values-v31 keeps the static blue splash; the animated icon stays reverted (Damir F5)');
}

/* —— W5 (Damir 2026-08-12): chat background pattern STYLES ————————————————
 * Style (Line art / Data matrix / Live flow) is orthogonal to the existing
 * visibility dial; "Off" stays in the visibility control only. */
{
  const gen = readFileSync(join(root, 'scripts/generate-chat-pattern.mjs'), 'utf8');
  ok(/--chat-pattern-uri-lineart/.test(gen) && /--chat-pattern-uri-matrix/.test(gen),
    'W5: the generator emits BOTH tiles (line art + data matrix) from one run');
  ok(/LINE-ART DRIFT/.test(gen) && /accept-lineart-change/.test(gen),
    'W5: the generator REFUSES to silently reskin the shipped line-art tile (asset on disk is 248 vs the committed 314)');
  ok(/cells: 24/.test(gen) && /cell: 12/.test(gen) && /gridAlpha: 0\.16/.test(gen)
    && /pFillAfterFilled: 0\.62/.test(gen) && /pFillAfterEmpty: 0\.3/.test(gen)
    && /pBig: 0\.45/.test(gen) && /rBig: 1\.7/.test(gen) && /rSmall: 0\.9/.test(gen)
    && /smallAlpha: 0\.55/.test(gen) && /seed: 11/.test(gen),
    'W5: the Damir-approved data-matrix dial is intact (24×12 · grid 0.16 · Markov .62/.30 · 45% r1.7 · r0.9@0.55 · seed 11)');

  const pat = readFileSync(join(root, 'src/styles/chat-pattern.css'), 'utf8');
  ok(/--chat-pattern-size-lineart: 314px 314px/.test(pat),
    'W5: the SHIPPED line-art tile is still 314×314 — the matrix addition changed no existing pixel');
  ok(/--chat-pattern-size-matrix: 288px 288px/.test(pat), 'W5: the data-matrix tile is the spec 288×288');
  ok(/\[data-chat-pattern='matrix'\]/.test(pat) && /\[data-chat-pattern='flow'\]/.test(pat),
    'W5: styles switch on an ATTRIBUTE selector, not a descendant one — the settings swatches each need their own style');
  ok(/display: var\(--chat-pattern-tile, block\)/.test(pat),
    'W5: the tile hides via an INHERITED custom property, so :root and a single canvas can both drive it');
  ok(/\[data-chat-pattern='flow'\][^}]*--chat-pattern-uri: var\(--chat-pattern-uri-lineart\)/s.test(pat),
    'W5: flow keeps a resolvable tile URI — a failed canvas mount falls back to line art, never a bare gradient');

  /* W5 F5 (Damir 2026-08-13): "on light mode perhaps bump opacity, as its barely
   * visible on the strongest." Measured in Chromium, the light pattern's contrast
   * against --gradient-chat was 1.02 at Standard and 1.03 at BOLD vs dark's
   * 1.12 / 1.18 — light Bold was fainter than dark SUBTLE while carrying 2.8× the
   * opacity, because primary-200 is near-isoluminant with the sky-blue wash. The
   * INK moved, not the ladder: primary-400 puts light at 1.08 / 1.14 / 1.20, i.e.
   * parity with dark, which is left byte-identical. */
  const tok5 = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8');
  /* ★ N81 (#422) — Damir's palette supersedes the whole W5 F5 ink investigation.
   * That round measured a pattern-vs-gradient contrast ratio and moved the LIGHT
   * ink up the primary ramp, because a translucent ink multiplied by an opacity
   * made the rendered strength unreadable from either number. The new model has
   * ONE number: the ink is opaque and --chat-pattern-opacity carries the whole
   * alpha, so the ladder value IS the stroke alpha on screen. Pin the values he
   * gave, per theme, and pin the property that makes them trustworthy. */
  /* tokens.css is LAYERED — four top-level `:root` blocks and TWO
   * `[data-theme="dark"]` blocks, interleaved. A naive slice on the first
   * `[data-theme="dark"]` lands in a COMMENT on line 12 and hands the whole file
   * to `dark`, which makes every assertion below pass for the wrong reason. Walk
   * the top-level blocks instead and concatenate by selector. */
  const tokensN81 = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8');
  const blocksN81 = (sel) => {
    const out = [];
    const re = new RegExp('^' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{$', 'gm');
    let m;
    while ((m = re.exec(tokensN81)) !== null) {
      const end = tokensN81.indexOf('\n}', m.index);
      out.push(tokensN81.slice(m.index, end < 0 ? tokensN81.length : end));
    }
    return out.join('\n');
  };
  const lightN81 = blocksN81(':root');
  const darkN81 = blocksN81('[data-theme="dark"]');
  ok(lightN81.length > 1000 && darkN81.length > 1000 && !darkN81.includes('--grey-1000'),
    '★ N81 harness self-check: the token blocks split by SELECTOR, not by the first textual match — a slice on the first "[data-theme=\"dark\"]" hits a comment on line 12 and would hand the whole file to `dark`, passing every assertion below for the wrong reason');
  ok(/--chat-pattern-ink: #181a20;/.test(lightN81) && /--chat-pattern-alpha-1: 0\.042;/.test(lightN81)
    && /--chat-pattern-alpha-2: 0\.1;/.test(lightN81),
    '★ N81: LIGHT line art = rgba(24,26,32,0.042) at Default, 0.1 at Strong (Damir 2026-08-19)');
  ok(/--chat-pattern-ink: #f0f4ff;/.test(darkN81) && /--chat-pattern-alpha-1: 0\.045;/.test(darkN81)
    && /--chat-pattern-alpha-2: 0\.1;/.test(darkN81),
    '★ N81: DARK line art = rgba(240,244,255,0.045) at Default, 0.1 at Strong (Damir 2026-08-19)');
  ok(/--chat-pattern-opacity: var\(--chat-pattern-alpha-1\);/.test(lightN81)
    && /--chat-pattern-opacity: var\(--chat-pattern-alpha-1\);/.test(darkN81),
    '★ N81: the UNSET default resolves to each theme\'s own alpha — an absent preference must not fall back to one theme\'s number');
  ok(/--chat-canvas-base: #f4f6f9;/.test(lightN81) && /--gradient-chat: var\(--chat-canvas-base\);/.test(lightN81),
    '★ N82(a) (#427): LIGHT canvas is FLAT #f4f6f9 — Damir rejected the #fcfbfa cream on F5 and picked the light cool grey from the measured set. Still flat: the sky-blue diagonal wash stays gone (#422)');
  ok((lightN81.match(/--chat-canvas-base:/g) || []).length === 1
    && !/--chat-canvas-base: #fcfbfa/.test(lightN81),
    '★ N82(a): exactly ONE --chat-canvas-base declaration in the light block, and it is not the cream — a leftover declaration would win on source order (the #422 sent-meta lesson). Counted rather than grepped for the hex, because the comment that RECORDS the supersession names the old value on purpose');
  ok(/--chat-canvas-base: #0f1115;/.test(darkN81)
    && /--gradient-chat: radial-gradient\(120% 85% at 50% 0%, rgba\(80, 122, 249, 0\.10\) 0%, transparent 58%\), var\(--chat-canvas-base\);/.test(darkN81),
    '★ N81: DARK keeps its radial glow OVER the new #0f1115 base (Damir\'s P.S.) — the asymmetry with light is deliberate');
  ok(/--gradient-bubble-sent: #1956b2;/.test(lightN81) && /--gradient-bubble-sent: #1956b2;/.test(darkN81)
    && /--surface-bubble-sent: #1956b2;/.test(lightN81) && /--surface-bubble-sent: #1956b2;/.test(darkN81),
    '★ N81: ONE outgoing blue #1956B2 in BOTH themes, and the solid fallback AGREES with the gradient token (a fallback that disagrees is a colour change nobody can reproduce)');
  /* ★ N81 (#422, #46 audit MAJOR): the flat bubble INTRODUCED a sub-AA timestamp.
   * Dark's old sent gradient (#353FB7→#2046A7) carried --neutral-300 at 5.06–5.17;
   * on the flat #1956B2 the same ink measures 4.28 at 12px regular. One ink in both
   * themes now, at 5.77 — matching the one-bubble-colour logic and clearing AA.
   * Pinned as the TOKEN, both blocks, because a single-theme fix is how it broke. */
  ok(/--text-bubble-sent-meta: var\(--primary-50\);/.test(lightN81)
    && /--text-bubble-sent-meta: var\(--primary-50\);/.test(darkN81),
    '★ N81 (#422, #46 audit): the sent-bubble META ink is ONE value in BOTH themes and clears AA on #1956B2 (5.77:1 at 12px). The dark value this replaces measured 4.28 — an AA failure this batch introduced by flattening the bubble');
  ok(/box-shadow: inset 0 0 0 1px var\(--border-bubble-received\);/.test(readFileSync(join(root, 'src/styles/components/settings-screens.css'), 'utf8'))
    && /box-shadow: inset 0 0 0 1px var\(--border-bubble-received\);/.test(readFileSync(join(root, 'src/styles/components/typing-indicator.css'), 'utf8')),
    '★ N81/N82(b): the surfaces that FLOATED on the old blue canvas still READ the hairline token (transparent since #427) rather than baking their own edge — including the Chat-appearance PREVIEW bubble, the one screen whose whole job is showing what the chat looks like. If it ever baked an edge the preview would stop matching the chat');
  ok(/--text-bubble-sent-meta/.test(darkN81) && !/--text-bubble-sent-meta: var\(--neutral-300\)/.test(darkN81),
    '★ N81 (#422): the superseded dark sent-meta ink is GONE, not merely shadowed — a leftover declaration in the dark block would win on source order');
  ok(/--surface-bubble-received: #ffffff;/.test(lightN81) && /--surface-bubble-received: #1a1d24;/.test(darkN81),
    '★ N81: the incoming bubble surface, both themes (Damir 2026-08-19) — unchanged by N82');
  ok(/--border-bubble-received: transparent;/.test(lightN81)
    && !/--border-bubble-received:/.test(darkN81),
    '★ N82(b) (#427): the bubble hairline is OFF in BOTH themes — one `transparent` in :root and NO dark override. Damir chose symmetric removal against the rendered comparison; the asymmetric build (transparent in light, rgba(255,255,255,.05) in dark) is what he was shown, not what ships');
  {
    /* ★ N82(b): the eight consumers are KEPT on purpose — the token is transparent,
     * not absent, so the hairline is one line from returning in either theme.
     * Pinned because a later "dead rule" cleanup would silently make the reversal a
     * re-derivation of eight sites (#423: a comment cleanup already reverted a
     * migration once in this project). */
    const HAIR = [
      'src/styles/components/message-bubble.css', 'src/styles/components/typed-bubbles.css',
      'src/styles/components/media-bubble.css', 'src/styles/components/typing-indicator.css',
      'src/styles/components/system-notice.css', 'src/styles/components/settings-screens.css',
      'src/shells/chat.html',
    ];
    const missing = HAIR.filter((f) => !/box-shadow: inset 0 0 0 1px var\(--border-bubble-received\)/
      .test(readFileSync(join(root, f), 'utf8')));
    ok(HAIR.length === 7 && missing.length === 0,
      '★ N82(b): all seven files still READ --border-bubble-received (eight rules — typed-bubbles carries two), so restoring the hairline stays a one-line token edit. Missing: ' + (missing.join(', ') || 'none'));
  }
  ok(!/--chat-canvas-base: var\(--neutral-1000\)/.test(readFileSync(join(root, 'src/shells/chat.html'), 'utf8')),
    '★ N81: the #207 desktop dark GROUND override is retired — grey-1000 (#111213) is LIGHTER than the new #0f1115, so it would have made desktop dark paler than mobile, inverting its own purpose');

  /* ★ N82(c) (#427) — the security notice, DARK ONLY.
   * The constraint IS the design: Damir narrowed it to dark in the same breath he
   * asked for it, so light must be provably untouched. That makes the shape of the
   * change assertable — a [data-theme="dark"] override, never a token edit, because
   * editing --surface-neutral-02 would have dragged light along with it (and every
   * other consumer of that surface). Pinned from both ends. */
  {
    const notice = readFileSync(join(root, 'src/styles/components/system-notice.css'), 'utf8');
    ok(/\[data-theme="dark"\] \.c-sysnotice__card \{[^}]*background: #0c1a4a;[^}]*\}/.test(notice),
      '★ N82(c): the dark notice card is the deepened #0c1a4a (84% saturation, and still DARKER than the grey-800 it replaces) — Damir asked to go further after seeing the first #141c33 render');
    ok(/\[data-theme="dark"\] \.c-sysnotice__card \{[^}]*box-shadow: inset 0 0 0 1px rgba\(118, 157, 255, 0\.35\);[^}]*\}/.test(notice),
      '★ N82(c): the saturated edge is what makes the notice STAND OUT — 2.19:1 against the ground, where the retired bubble hairline was 1.281. "Darker" and "stands out" pull opposite ways on luminance, so the card went darker and the edge carries the prominence');
    /* ⚠ the dark rule is REMOVED before this test: its own `background: #0c1a4a` is
     * the thing being allowed, and an unanchored `.c-sysnotice__card {` matches
     * inside the dark selector too — which is how the first version of this pin
     * failed against a correct file. What is left must be light-only. */
    const noticeLight = notice.replace(/\[data-theme="dark"\][^{]*\{[^}]*\}/g, '');
    ok(!/\.c-sysnotice__card[^{]*\{[^}]*background: #/.test(noticeLight)
      && /\.c-sysnotice__card \{[^}]*background: var\(--surface-neutral-02\)/.test(noticeLight),
      '★ N82(c): ⚠ LIGHT IS UNTOUCHED — outside the dark override the card still resolves to var(--surface-neutral-02) and no literal colour is baked into it. This is the half of Damir\'s instruction that is easiest to break by accident');
    ok(/--surface-neutral-02: var\(--neutral-800\);/.test(darkN81)
      && /--surface-neutral-02: var\(--neutral-50\);/.test(lightN81),
      '★ N82(c): …and --surface-neutral-02 itself is UNCHANGED in both themes. A token edit would have recoloured every other surface that reads it — the reason this is written as a component override');
  }

  const flow = readFileSync(join(root, 'src/components/chat-flow.js'), 'utf8');
  ok(/speed: 0\.85/.test(flow) && /spacing: 15/.test(flow) && /dash: 7/.test(flow)
    && /lineWidth: 1\.25/.test(flow) && /fieldScale: 44/.test(flow),
    'W5: the RE-DIALLED Live-flow tuning (Damir F5 2026-08-13: closer · bigger · more visible movement) is verbatim');
  ok(/ctx\.lineWidth = tune\.lineWidth \* dpr;/.test(flow),
    'W5: stroke weight is a DIAL, not a hard-coded 1px — "too small" moved dash length AND line width');
  ok(/0\.9 \* \(Math\.sin\(1\.7 \* x \+ t\) \+ Math\.cos\(1\.3 \* y - 0\.8 \* t\) \+ Math\.sin\(0\.8 \* \(x \+ y\) \+ 0\.5 \* t\)\)/.test(flow),
    'W5: the angle field matches the prototype exactly');
  ok(/fps: 25/.test(flow) && /maxDpr: 2/.test(flow) && /ResizeObserver/.test(flow)
    && /visibilitychange/.test(flow) && /prefers-reduced-motion/.test(flow),
    'W5: the whole budget story is present (25fps cap · dpr≤2 · ResizeObserver · hidden pauses · reduced-motion = one still frame)');
  ok(/getPropertyValue\('--chat-pattern-ink'\)/.test(flow) && /getPropertyValue\('--chat-pattern-opacity'\)/.test(flow)
    && /if \(!ink \|\| opacity <= 0\) return;/.test(flow),
    'W5: ink + intensity are read from computed style EVERY frame — theme flips and the visibility dial (incl. Off) apply live');
  ok(/export function setChatFlowPaused/.test(flow),
    'W5: a park/unpause entry point exists for the covered-chat / backgrounded-app story');

  const flowCss = readFileSync(join(root, 'src/styles/components/chat-flow.css'), 'utf8');
  ok(/\.c-chat-canvas\[data-flow\] \{ z-index: 0; \}/.test(flowCss)
    && /\.c-chat-canvas > \.c-chat-flow \{/.test(flowCss) && /z-index: -1/.test(flowCss),
    'W5 stacking: negative-z canvas inside a [data-flow]-scoped stacking context (the corrected recipe)');
  ok(!/\.c-chat-canvas > \*\s*\{[^}]*position: relative/.test(flowCss),
    'W5 stacking: NO blanket sibling position:relative — that is what left-aligned the jump-to-latest FAB on the Windows F5');

  const chatW5 = readFileSync(join(root, 'src/shells/chat.html'), 'utf8');
  ok(/localStorage\.getItem\('spixi\.chat\.patternstyle'\)/.test(chatW5)
    && /setAttribute\('data-chat-pattern',s\)/.test(chatW5),
    'W5: the style is resolved PRE-PAINT in the same script as the intensity — no wrong-pattern flash on load');
  ok(/if\(s==='flow'&&!de\)s='lineart'/.test(chatW5),
    'W5: Live flow is desktop-only — a mobile client carrying the pref falls back to line art (battery)');
  ok(chatW5.indexOf("p.get('desktop')==='1'") < chatW5.indexOf("spixi.chat.patternstyle"),
    'W5: the ?desktop/?mobile forcing still runs BEFORE the style default derives (the B2 ordering rule)');
  ok(/attachChatFlow, syncChatFlow, detachChatFlow/.test(chatW5) && /function applyChatPatternStyle/.test(chatW5),
    'W5: the chat shell mounts/tears down the flow engine');
  ok(/function syncFlowIfActive\(\)/.test(chatW5) && /syncFlowIfActive\(\);\s*\/\/ …and repaint/.test(chatW5),
    'W5: applying prefs repaints the flow canvas — under reduced motion there is no loop to re-theme itself');

  /* W5 F5 (Damir 2026-08-13): "it doesnt auto apply to active chats". The pick
   * has to cross from the Account WebView into an ALREADY-OPEN chat, so the
   * chat re-reads the pair on the same four signals settings.html uses for
   * spixi.backup.last (#314) — and re-runs the FULL boot ladder, not a subset. */
  ok(/function readPatternPrefs\(\)/.test(chatW5) && /function applyPatternPrefs\(/.test(chatW5)
    && /function refreshPatternPrefsIfChanged\(\)/.test(chatW5),
    'W5 live-apply: the chat can re-resolve BOTH pattern prefs after boot, not only in the pre-paint script');
  ok(/window\.addEventListener\('storage', \(e\) => \{\s*if \(!e\.key \|\| e\.key === PATTERN_PREF_KEYS\.level \|\| e\.key === PATTERN_PREF_KEYS\.style\) refreshPatternPrefsIfChanged\(\);/.test(chatW5)
    && /window\.addEventListener\('focus', refreshPatternPrefsIfChanged\);/.test(chatW5)
    && /if \(document\.visibilityState === 'visible'\) refreshPatternPrefsIfChanged\(\);/.test(chatW5)
    && /setInterval\(\(\) => \{ if \(!document\.hidden\) refreshPatternPrefsIfChanged\(\); \}, 2000\);/.test(chatW5),
    'W5 live-apply: the #314 grammar verbatim — storage event + focus + visibilitychange + a visibility-guarded 2s poll (WKWebView fires no cross-WebView storage event, and a covered WebView stays "visible")');
  ok(/if \(stamp === seenPatternPrefs\) return;/.test(chatW5),
    'W5 live-apply: gated on an ACTUAL change of the stored pair — the poll is a no-op read under a live chat');
  ok(/if \(s === 'flow' && !de\) s = 'lineart';/.test(chatW5),
    'W5 live-apply: the re-resolve keeps the desktop-only rule — a mobile chat can never mount the canvas from a stored flow');
  ok(/r\.setAttribute\('data-chat-pattern', prefs\.style\);\s*\n\s*applyChatPatternStyle\(\);/.test(chatW5),
    'W5 live-apply: the attribute moves and THEN the canvas mounts/detaches — a style switch can never leave a tile and a canvas painting at once');
  /* ★ N81 (#422): this used to pin that the ×0.36 dark derivation was RE-RUN on
   * every apply. There is no derivation left to re-run — the level is an index and
   * the alpha is a per-theme token, so CSS resolves it. Pin the ABSENCE, at all
   * three sites that used to carry a copy of the multiply: if any of them grows one
   * back, the class of bug it caused (dark painting the light number after a live
   * setTheme push) comes back with it. */
  ok(!/\*\s*36\b/.test(chatW5) && !/\*\s*0\.36\b/.test(chatW5),
    '★ N81: chat.html carries NO ×0.36 dark derivation — neither in the pre-paint script nor in applyPatternPrefs');
  ok(/r\.style\.setProperty\('--chat-pattern-opacity', patternLevelVar\(prefs\.level\)\);/.test(chatW5),
    '★ N81: the live apply assigns the per-theme VAR REFERENCE, so the value resolves under whatever theme is current at paint time');
  ok(/applyPatternPrefs\(readPatternPrefs\(\)\)/.test(chatW5.slice(chatW5.indexOf('setTheme(name)'))),
    '★ N81: setTheme still re-runs the pattern ladder via the shared onApplied hook — the INTENSITY no longer needs it (CSS resolves that), but the flow canvas genuinely does: under prefers-reduced-motion there is no loop to re-theme itself');

  const setW5 = readFileSync(join(root, 'src/shells/settings.html'), 'utf8');
  ok(/patternStyle: 'spixi\.chat\.patternstyle'/.test(setW5) && /onPatternStyle: \(v\) =>/.test(setW5),
    'W5: the Account screen persists the style like the intensity pref (same origin, try/catch)');
  ok(/st === 'flow' && desktop/.test(setW5),
    'W5: readChatPrefs refuses a stored flow on mobile, mirroring what chat.html applies');

  // runtime: three options on desktop, two on mobile; the picks compose
  const dom5 = await load('settings.html');
  const wd = dom5.window;
  const wdoc = wd.document;
  wdoc.documentElement.setAttribute('data-desktop', '');
  const host5 = wdoc.createElement('div');
  wdoc.body.append(host5);
  const ap5 = wd.Spixi.createChatAppearance({ patternOpacity: 0.5, patternStyle: 'lineart', isDesktop: true });
  host5.append(ap5);
  const sg = ap5.querySelector('.c-settings-swatches--style');
  ok(!!sg && sg.getAttribute('role') === 'radiogroup', 'W5: the style picker is its own radiogroup');
  const styleTiles = [...sg.querySelectorAll('.c-settings-swatch')];
  ok(styleTiles.length === 3 && styleTiles.map((b) => b.dataset.value).join() === 'lineart,matrix,flow',
    'W5: desktop offers all three styles in spec order');
  ok(styleTiles.every((b) => b.getAttribute('role') === 'radio' && b.getAttribute('aria-label')),
    'W5: style tiles keep the #334 swatch a11y grammar (role=radio + localized label, no visible text to overflow)');
  ok(styleTiles.every((b) => b.querySelector('.c-settings-swatch__canvas').dataset.chatPattern === b.dataset.value),
    'W5: each style tile paints ITS OWN style (the inherited-custom-property contract)');
  const prev5 = ap5.querySelector('.c-settings-appearance__preview');
  styleTiles[1].click();
  ok(prev5.dataset.chatPattern === 'matrix', 'W5: the live preview reflects the style pick');
  const intensityFaces = [...ap5.querySelectorAll('.c-settings-swatches:not(.c-settings-swatches--style) .c-settings-swatch__canvas')];
  ok(intensityFaces.length === 3 && intensityFaces.every((f) => f.dataset.chatPattern === 'matrix'),
    'W5: the intensity tiles re-skin to the picked style — line-art tiles under a Data-matrix pick would be a lie (3 levels since ★ N81)');
  /* ★ N81: the tiles must carry the per-theme VAR, not a baked number. This is what
   * closes the #239 ⓐ flag — the preview used to paint the raw light-scale value
   * while the real dark chat rendered v × 0.36, so in dark theme it promised a
   * pattern the chat never showed. Same var(), same theme, same pixels. */
  ok(intensityFaces[0].style.getPropertyValue('--chat-pattern-opacity') === '0'
    && /^calc\(var\(--chat-pattern-alpha-1\) \* \d+\)$/.test(intensityFaces[1].style.getPropertyValue('--chat-pattern-opacity'))
    && /^calc\(var\(--chat-pattern-alpha-2\) \* \d+\)$/.test(intensityFaces[2].style.getPropertyValue('--chat-pattern-opacity')),
    '★ N81 (closes #239 ⓐ): each intensity tile assigns the per-theme ALPHA VAR, so the preview resolves under its own theme instead of baking one theme\'s number');
  // fail-soft: this harness has no canvas backend, so picking Live flow must
  // land on the line-art tile rather than a bare gradient or a thrown error
  styleTiles[2].click();
  ok(prev5.dataset.chatPattern === 'lineart',
    'W5 fail-soft: no 2d context → the preview falls back to the line-art tile, never a bare gradient');
  styleTiles[1].click();
  const apMobile = wd.Spixi.createChatAppearance({ patternOpacity: 0.5, patternStyle: 'flow', isDesktop: false });
  const mobileTiles = [...apMobile.querySelectorAll('.c-settings-swatches--style .c-settings-swatch')];
  ok(mobileTiles.length === 2 && mobileTiles.map((b) => b.dataset.value).join() === 'lineart,matrix',
    'W5: mobile shows two styles — Live flow is not offered');
  ok(mobileTiles[0].getAttribute('aria-checked') === 'true',
    'W5: a stored desktop-only style falls back to a SELECTED line art on mobile (never an empty radiogroup)');
}

/* —— Contact-details PREMIUM pass (Damir 2026-08-12) ——————————————————————
 * Three asks: the Pay/Request/Message buttons take the wallet-banner treatment,
 * "Delete chat history" stops shouting, and the screen gains real hierarchy. */
console.log('contact details — premium pass');
{
  const dom = await load('chats.html');
  const S = dom.window.Spixi, d = dom.window.document;
  const host = d.createElement('div');
  d.body.append(host);
  const ci = S.createChatInfo({
    context: 'contact', kind: 'contact', name: 'Marta', address: '4mkzaddr',
    online: true, txs: [{ direction: 'in', status: 'confirmed', amount: '+1' }],
    onBack() {}, onMessage() {}, onPay() {}, onRequest() {},
    onNickname() {}, onDeleteHistory() {}, onRemoveContact() {},
  });
  host.append(ci);

  // ① wallet-banner grammar: the same circle+label construction as c-wallet-hero__qa,
  //    and NO c-button left in the action row (that was the "rough" 44px trio).
  const qas = [...ci.querySelectorAll('.c-chat-info__money .c-chat-info__qa')];
  ok(qas.length === 3 && !ci.querySelector('.c-chat-info__money .c-button'),
    'premium ①: the action row is 3 quick actions, no chunky c-buttons left');
  ok(qas.map((b) => b.querySelector('.c-chat-info__qa-label').textContent).join() === 'Message,Pay,Request',
    'premium ①: Message · Pay · Request, in that order');
  ok(ci.querySelector('.c-chat-info__money').dataset.count === '3',
    'premium ①: the row carries its count so a lone action hugs instead of stretching');

  // ② quiet destructive tier — delete-history reads secondary; red stays reserved
  //    for the irreversible action (settings-shell quiet/danger precedent).
  const rows = [...ci.querySelectorAll('.c-chat-info__danger-row')];
  const hist = rows.find((r) => /Delete/i.test(r.textContent));
  const remove = rows.find((r) => /Remove/i.test(r.textContent));
  ok(hist.dataset.tone === 'quiet' && remove.dataset.tone === 'error',
    'premium ②: delete-history = quiet tier, remove-contact stays the loud one');
  ok(hist.querySelector('.c-disc').dataset.hue === 'neutral'
    && !hist.querySelector('.c-disc').hasAttribute('data-grad'),
    'premium ②: the quiet disc drops data-grad — base.css lets the per-glyph gradient win over data-hue');
  ok(remove.querySelector('.c-disc').dataset.hue === 'error',
    'premium ②: the destructive disc stays red (the reservation, #148)');

  // ③ hierarchy: identity → what you can do → the details. The address card used
  //    to sit between the hero and the actions and pushed them off the fold.
  const kids = [...ci.querySelector('.c-chat-info__body').children];
  ok(kids.indexOf(ci.querySelector('.c-chat-info__money'))
      < kids.indexOf(ci.querySelector('.c-chat-info__address')),
    'premium ③: actions come BEFORE the address card');
  ok(ci.querySelector('.c-chat-info__hero .c-avatar').dataset.size === '80',
    'premium ③: portrait-scale hero avatar (centered identity block)');

  const css = readFileSync(join(root, 'src/styles/components/chat-info.css'), 'utf8');
  ok(/\.c-chat-info__hero \{[^}]*flex-direction: column/.test(css)
    && /\.c-chat-info__hero \{[^}]*align-items: center/.test(css),
    'premium ③: the hero is a centered column, not a list-row');
  ok(/\.c-chat-info__qa-circle \{[^}]*var\(--surface-action-tonal-default\)/.test(css)
    && /\.c-chat-info__qa-circle \{[^}]*var\(--icon-action-default\)/.test(css),
    'premium ①: quick-action circles ride semantic tonal tokens (no raw hex)');
  ok(/@media \(hover: hover\)[^{]*\{\s*\.c-chat-info__qa:hover/.test(css),
    '#43: the quick action has a hover state, guarded by the hover media query');
  ok(!/@media[^{]*min-width:\s*(7|8|9|1\d)\d\d/.test(css),
    'desktop density rides :root[data-desktop], never a viewport width query');
  host.remove();
}

/* —— W7: a sublevel opened FROM an overlay must COVER its opener ——————————————
 * Damir F5 (Windows, reproducible): Account → Change wallet password and the
 * Account surface reads as frozen — only a rail tab switch clears it. Cause: the
 * ixian:encpass push pinned EncryptionPassword to grid column 1, which covers only
 * the DETAIL region of the full-span (minus rail) Account pane. The hub beside it
 * stayed VISIBLE AND LIVE, so every row the user then tapped opened its sublevel
 * *underneath* the password pane: nothing moved on screen. Not a deadlock and not
 * a stuck preload latch (presentPreload/cancelPreload always clear activePreload in
 * a finally) — which is exactly why only a TAB SWITCH cleared it: that is the one
 * path that runs requestSettingsOverlayExit → the shell exits → the SettingsPage
 * overlay is closed and disposed, so the next Account tap builds a fresh page.
 * This is the #265 ② Downloads bug, second instance. Invariant pinned here:
 * a page opened from the Account pane inherits the pane's own stage geometry
 * (column -1 + the pane's inset) and is swept when the Account itself exits. */
console.log('W7 — Change wallet password covers the Account pane it opens from');
{
  const scpW7 = readFileSync(join(root, 'Spixi/Utils/SpixiContentPage.cs'), 'utf8');
  const spW7 = readFileSync(join(root, 'Spixi/Pages/Settings/SettingsPage.xaml.cs'), 'utf8');

  ok(/pushPageLoaded\(new EncryptionPassword\(\), 4000, null, -1, null,\s*\r?\n?\s*getOverlayStageMargin\(this\)\)/.test(spW7)
    && !/pushPageLoaded\(new EncryptionPassword\(\)[^;]*paneMode \? 1 : -1/.test(spW7),
    'W7: ixian:encpass opens full-span (column -1) with the ACCOUNT PANE\'S OWN inset — it covers its opener exactly, never just the detail column (the #265 ② live-but-blind hub)');
  ok(/public Thickness stageMargin = default;/.test(scpW7)
    && /op\.stageMargin = stageMargin;/.test(scpW7),
    'W7: the op REMEMBERS the inset it was staged with (a stage.Margin read would be a UI-property read off the preload lock / a background thread)');
  ok(/public static Thickness getOverlayStageMargin\(SpixiContentPage page\)[\s\S]{0,400}?lock \(preloadLock\)[\s\S]{0,300}?overlayStack\.Find\(o => o\.target == page\)[\s\S]{0,160}?return op != null \? op\.stageMargin : default;/.test(scpW7),
    'W7: the accessor reads the OPEN overlay op under preloadLock and returns Thickness.Zero for a page that is not an overlay — mobile/push-fallback stays byte-identical to the pre-W7 default');
  ok(/internal void closeSublevelOverlays\(\)[\s\S]{0,400}?foreach \(SpixiContentPage p in getOverlayPages\(\)\)[\s\S]{0,240}?if \(p is EncryptionPassword[^)]*\)[\s\S]{0,120}?removePage\(p\);/.test(spW7),
    'W7: SettingsPage owns a close-audit for the sublevel page it opens (the closeContactDetailsOverlays / closeFormPaneOverlays family, hosted here because the Account owns this sublevel)');
  /* r3 reviewer: ANCHOR both lists on the closing paren. getOverlayPages()/getStagingPage()
   * are STATIC — they see every overlay in the app, not just this page's — so an over-broad
   * type here closes overlays the Account does not own. Unanchored, adding a 4th type passed
   * silently; the old (pre-widening) pin bounded the list from above and this restores that. */
  ok(/foreach \(SpixiContentPage p in getOverlayPages\(\)\)[\s\S]{0,200}?p is EncryptionPassword \|\| p is BackupPage \|\| p is DownloadsPage\)/.test(spW7)
    && /staging is EncryptionPassword \|\| staging is BackupPage \|\| staging is DownloadsPage\)/.test(spW7),
    '★ #340 r2: the sweep covers ALL THREE sublevels the Account stages (encpass · backup · downloads), not just the password pane. Backup/Downloads are cap-gated to non-pane mode so desktop never fires them, but on MOBILE they are ordinary overlays with the same load-then-present window — "tap Downloads, nothing appears to happen, tap back" stranded one over the home shell. Kept as an EXPLICIT type list: pushModalLoaded shares activePreload, so sweeping everything staged would cancel the resume lock');
  ok(/closeSublevelOverlays\(\)[\s\S]{0,1400}?getStagingPage\(\)[\s\S]{0,300}?popPageAsync\(\);/.test(spW7),
    '★ #340 (B-MAJOR-1): the sweep also covers the STAGING slot — pushPageLoaded is load-then-present, so for the whole boot window the password pane is in activePreload, NOT overlayStack, with its stage already parented to HomePage. Leaving the Account in that window (exactly when the screen looks frozen) would strand it over the next tab');
  ok(/resetLanguage\(\);\s*\r?\n\s*closeSublevelOverlays\(\);[\s\S]{0,80}?popPageAsync\(\);/.test(spW7)
    && /saveSettingsCore\(nick\);[\s\S]{0,200}?closeSublevelOverlays\(\);[\s\S]{0,80}?popPageAsync\(\);/.test(spW7),
    'W7: BOTH Account exit paths (ixian:back and ixian:save → onSaveSettings, i.e. the rail tab-switch route through requestSettingsOverlayExit) sweep the password pane — it can never outlive the Account and park over the next tab');
  const hpW7 = readFileSync(join(root, 'Spixi/Pages/Home/HomePage.xaml.cs'), 'utf8');
  ok(/sp\.closeSublevelOverlays\(\);\s*\r?\n\s*removePage\(sp\);/.test(hpW7),
    '★ #340 (B-MAJOR-1, scenario B): requestSettingsOverlayExit\'s DIRECT-close branch sweeps too — pageLoaded is cleared synchronously by reload(), and an OS theme flip reloads every overlay, so "Account + password pane open, theme flips, tap a tab" lands on that branch and bypasses the shell\'s own exit sweep');
  ok(/op\.stage\.Margin = new Thickness\(0\);\s*(\r?\n\s*\/\/[^\n]*)*\r?\n\s*op\.stageMargin = new Thickness\(0\);/.test(scpW7),
    '#340 (B-MINOR-1): rehomeOverlay moves the op\'s stageMargin MEMORY with the real margin — otherwise a sublevel opened from a rehomed overlay inherits a phantom inset and leaves a live uncovered strip of its opener, which is the W7 failure itself');
}

/* —— #341: Change password as an IN-PANE sublevel ————————————————————————————
 * W7 above is correct and stays. Damir's F5 ask was different: on desktop he wants
 * the form to behave like Backup (#243) and Downloads (#267) — a hub sublevel inside
 * the Account pane, not a page that covers the whole Account. So the pane route no
 * longer pushes EncryptionPassword at all: settings.html mounts createEncPassScreen
 * itself and SettingsPage dispatches ixian:changepass:.
 * The W7 pins above still guard the MOBILE route, which is unchanged.
 * The pins here guard the two things that can go wrong quietly:
 *   1. the password values outliving the screen in a PARKED document (#315), and
 *   2. a truncated password being written to the wallet. */
/* —— #343: instant chrome, the first-commit fade, and the message window ——————
 * Damir, both platforms: "entering a chat and chat info is really noticeable, laggy".
 * The log render was NOT the cause — renderLogNow already builds a detached fragment
 * and swaps it with one replaceChildren. The cause is wall-clock BEFORE that paint:
 * a ~1.4 MB document to parse, then one EvaluateJavaScriptAsync per message, then a
 * 250 ms settle. These pins hold the three fixes that do not need the BE engineer. */
/* —— #345: the shared payload leaves the shells ————————————————————————————————
 * MEASURED CAUSE (PerfTrace on Damir's Galaxy A52, not a hypothesis): opening a chat
 * cost 498 ms and 453 ms of it happened before the shell said a word —
 * generatePage(chat.html) 172 ms, then 281 ms of handover, decode, parse and execute.
 * generatePage is LINEAR in file size: 222 KB = 16 ms, 1625 KB = 114 ms, 2019 KB =
 * 172 ms. Every shell inlined the SAME ~1.6 MB of bundle, strings, icons and base CSS,
 * so Android re-read, re-localized and re-base64-encoded 26 MB of duplicate bytes
 * across the app's 22 screens. Now emitted ONCE, beside the shells. */
console.log('#345 — shared bundle, strings, icons and base CSS are external');
{
  const htmlDir = join(root, 'Spixi/Resources/Raw/html');
  const SHARED = ['spixi.bundle.js', 'spixi.strings.js', 'spixi.icons.js',
                  'spixi.tokens.css', 'spixi.base.css', 'spixi.chat-pattern.css'];
  for (const f of SHARED) {
    ok(existsSync(join(htmlDir, f)),
      '#345: ' + f + ' is emitted beside the shells — relative refs resolve because Android loads with a BaseUrl and Apple/Windows receive the whole html tree, exactly as images/ has since #176');
  }
  const chatBuilt = readFileSync(join(htmlDir, 'chat.html'), 'utf8');
  const indexBuilt = readFileSync(join(htmlDir, 'index.html'), 'utf8');

  ok(/<script src="spixi\.bundle\.js"><\/script>/.test(chatBuilt)
    && /<script src="spixi\.strings\.js"><\/script>/.test(chatBuilt)
    && /<script src="spixi\.icons\.js"><\/script>/.test(chatBuilt),
    '★ #345: the shells REFERENCE the shared payload instead of carrying it. No defer, no async, and in document order — the shells destructure window.Spixi in a following inline script, so the bundle must have executed by then');
  ok(!/window\.Spixi = \{ getStrings: getStrings/.test(chatBuilt),
    '★ #345: the 858 KB bundle is no longer INSIDE chat.html. That inlining is what made generatePage cost 172 ms, and the cost is linear in bytes');
  ok(chatBuilt.length < 600 * 1024 && indexBuilt.length < 500 * 1024,
    '★ #345 THE POINT: chat.html is under 600 KB (was 2019 KB) and index.html under 500 KB (was 1625 KB). At the measured ~0.08 ms/KB, chat.html\'s generatePage leg should fall from ~172 ms to ~30 ms');
  /* ★ #346 review r2 MINOR-1: empty_detail.html DOES get a guard now — just no bundle
     probe. #345 gated the whole block on the bundle, which meant the one shell that
     never carries it could render completely unstyled with no message: the desktop
     resting pane, silently broken. The original false alarm came from an
     UNCONDITIONAL `!window.Spixi` probe, and per-asset gating is what prevents it. */
  {
    const emptyBuilt = readFileSync(join(htmlDir, 'empty_detail.html'), 'utf8');
    ok(/SPIXI: shared asset did not load/.test(emptyBuilt) && !/!window\.Spixi&&/.test(emptyBuilt),
      '★ #345/#346: empty_detail.html is guarded for the assets it DOES reference and carries NO bundle probe. An unconditional guard fired a false alarm here — Damir saw the red panel in the desktop detail pane beside a perfectly healthy chats list — but no guard at all let it render unstyled in silence');
  }
  ok(/SPIXI: shared asset did not load/.test(chatBuilt),
    '★ #345 BOOT GUARD: the bundle now arrives at RUNTIME, so a missing or blocked file would turn the shells\' `const { … } = window.Spixi` into a TypeError behind a BLANK screen. The build-time preflight cannot cover that any more, so the shell says so on screen instead');

  /* ★ #346 (review of #345) — the guard covered ONE of the six shared files and blamed
     the wrong one. It tested only `window.Spixi`, so a missing spixi.strings.js left
     every locale silently English and a missing tokens/base CSS left the app unstyled,
     both with no message. And because the bundle's first line reads
     `window.SpixiIcons.icon`, a missing icons file makes the BUNDLE throw before it
     assigns window.Spixi — so the panel blamed spixi.bundle.js and sent triage to the
     wrong file. Probes are gated on the shell actually referencing each asset, which is
     what keeps empty_detail.html quiet. */
  ok(/!window\.SpixiIcons&&"spixi\.icons\.js"/.test(chatBuilt)
    && /!window\.SpixiStrings&&"spixi\.strings\.js"/.test(chatBuilt)
    && /--spacing-16[\s\S]{0,40}spixi\.tokens\.css/.test(chatBuilt)
    && /--spixi-base-css[\s\S]{0,40}spixi\.base\.css/.test(chatBuilt),
    '★ #346 BOOT GUARD covers icons, strings, tokens AND base CSS — and NAMES the file that failed. A silent English-everywhere or unstyled app is the invisible-failure class the strings preflight exists to prevent');
  {
    const bs = readFileSync(join(root, 'scripts/build-shells.mjs'), 'utf8');
    ok(/:root \{ --spixi-base-css: 1; \}/.test(readFileSync(join(root, 'src/styles/base.css'), 'utf8'))
      && /boot-guard probe preflight OK/.test(bs),
      '★ #346 review MINOR-1: base.css carries a load sentinel, and the BUILD fails if either probe token is renamed. Without the sentinel 59 KB of reset and layout could vanish with no message; without the build check, renaming the token would paint a red error panel over a healthy app in every shell');
    /* ★ r2 MINOR-2/3: the probe check must run BEFORE any file is written, strip
       comments, and tolerate whitespace before the colon. As first written it sat
       inside the EXTERNALS loop — so it printed "Nothing was written." after writing
       three files, leaving a NEW bundle beside 22 OLD shells — and it was a raw
       substring test, so a commented-out declaration PASSED and legal
       `--spacing-16 : 16px` FAILED. */
    ok(bs.indexOf('boot-guard probe preflight OK') < bs.indexOf('mkdirSync(OUT_DIR')
      && /replace\(\/\\\/\\\*\[\\s\\S\]\*\?\\\*\\\/\/g, ' '\)/.test(bs)
      && /token\.replace\(\/-\/g, '\\\\-'\) \+ '\\\\s\*:'/.test(bs),
      '★ #346 review r2 MINOR-2/3: the probe preflight runs before ANY write (so "Nothing was written." is true and no bundle/shell version skew can result), strips comments, and allows whitespace before the colon');
  }
  ok(chatBuilt.indexOf('spixi.icons.js"].filter') < 0
    && /\[!window\.SpixiIcons[\s\S]{0,200}!window\.Spixi&&"spixi\.bundle\.js"/.test(chatBuilt),
    '★ #346: the probes run in LOAD ORDER (icons → strings → bundle), so the ROOT CAUSE is named first when a failure cascades — icons missing makes the bundle throw too');

  const inlineLib = readFileSync(join(root, 'scripts/lib/inline.mjs'), 'utf8');
  ok(/externalNames\.has\(u\)/.test(inlineLib) && /if \(external\.has\(src\)\) return/.test(inlineLib),
    '#345: the inliner\'s strict gate still throws on an UNDECLARED relative ref — only refs explicitly declared external are exempt, so a genuinely missed <img> or <link> still fails the build');

  /* ★ #346 (review of #345) — two BUILD-PIPELINE holes #345 opened, both proven by
     mutation before these pins were written. */
  const shellsScript = readFileSync(join(root, 'scripts/build-shells.mjs'), 'utf8');
  ok(/const problems = \[\];[\s\S]{0,1200}?for \(const key of Object\.keys\(SHELLS\)\) \{/.test(shellsScript)
    && /for \(const key of keys\) \{[\s\S]{0,400}?inlineHtml\(/.test(shellsScript),
    '★ #346: the bundle preflight walks EVERY shell, not the subset being built. Since #345 there is ONE spixi.bundle.js behind all 21 consumers and it is rewritten unconditionally — so `build-shells.mjs chat` republished it for everybody while checking only chat.html. Reproduced: drop an export, build `chat`, and settings.html gets createSettingsHub === undefined with the boot guard silent, because window.Spixi DOES exist');
  ok(/\\ssrc=\["'\]/.test(inlineLib) && !/\\bsrc=\["'\]/.test(inlineLib),
    '★ #346 review MAJOR-3: the gate requires WHITESPACE before src. `\\b` matches inside `data-src=`, which is the attribute step 3 writes onto every script it successfully inlines — so the gate rejected the inliner\'s OWN output and `build-shells.mjs apps` and `payments`, both named in this script\'s usage block, died blaming an attribute that was not there');
  /* ★ #346 review r2 NIT-3: a BEHAVIOURAL check, because a source regex cannot tell a
     working gate from a broken one. Running the inliner with an EMPTY external map is
     exactly what `build-shells.mjs apps` and `payments` do — every script gets inlined
     and stamped `data-src="…"`, which is the attribute the first cut of the gate
     rejected. This must not throw. */
  try {
    const { inlineHtml } = await import('../scripts/lib/inline.mjs');
    inlineHtml(join(root, 'src/shells/lock.html'), { device: true, strict: true, external: new Map() });
    ok(true, '★ #346 review r2: the inliner accepts its OWN `data-src` output. `build-shells.mjs apps` and `payments` inline every script rather than externalising it, and the first cut of the new gate hard-failed both, blaming an attribute that was not there');
  } catch (e) {
    ok(false, '★ #346 review r2: the inliner accepts its OWN `data-src` output — it threw: ' + e.message);
  }
  ok(/<script src> not inlined/.test(inlineLib) && /tagsOnly/.test(inlineLib),
    '★ #346: a <script src> carrying defer/async/type/nonce is now a BUILD FAILURE. The inliner matched only the bare tag, and the leftover scan strips every script block before it looks — so such a tag was neither inlined nor flagged, and the shell shipped pointing at a file that is not beside it: a blank screen, no build error. The scan strips script BODIES first, so scan.html\'s runtime-injected html5-qrcode tag cannot false-positive');
}

console.log('#343 — instant chrome, first-commit fade, message window');
{
  const chatSh = readFileSync(join(root, 'src/shells/chat.html'), 'utf8');
  const pressJs = readFileSync(join(root, 'src/components/pressable.js'), 'utf8');
  const baseCss = readFileSync(join(root, 'src/styles/base.css'), 'utf8');
  const cfgCs = readFileSync(join(root, 'Spixi/Meta/Config.cs'), 'utf8');

  /* #343 device outcome: the instant-chrome skeleton, the 300 ms spinner delay and the
   * first-commit fade were REVERTED. On device they made chat entry worse, not better —
   * Damir: "it flashes some light dark screen and is worse than before". They were aimed
   * at a cause inferred from the code and never measured, which is exactly what rule #294
   * exists to prevent. Do not re-attempt them before a chrome://inspect Performance trace
   * names the real cost. What survives is the press feedback and the message window. */
  ok(!/boot-chrome/.test(chatSh) && !/chat-boot-in/.test(chatSh) && !/logEntering/.test(chatSh),
    '★ #343 REVERTED ON DEVICE EVIDENCE: no instant-chrome skeleton, no delayed spinner, no first-commit fade. Re-adding any of them without a measurement re-introduces a regression Damir already saw');
  ok(/'pointerdown'/.test(pressJs) && /'touchstart'/.test(pressJs) && !/addEventListener\('click'/.test(pressJs),
    '★ #343 device fix: BOTH touchstart and pointerdown are bound, never click. On Android WebView pointer events are synthesised from touch events and wait on gesture disambiguation, so pointerdown alone arrived late — Damir read it as "abrupt with delay". touchstart fires on contact');
  ok(/PRESS_MOVE_CANCEL_PX/.test(pressJs) && /> PRESS_MOVE_CANCEL_PX\) cancelGesture\(\)/.test(pressJs),
    '★ #343: the move-cancel rule is in the source, not just in the behavioural test above');
  ok(/if \(cancelled\) return;/.test(pressJs)
    && /cancelExpiry = setTimeout\(\(\) => \{ cancelled = false; \}, PRESS_SAFETY_MS\)/.test(pressJs)
    && !/'scroll', clear/.test(pressJs) && !/'dragstart', clear/.test(pressJs),
    '★ #346: cancel and END are different events. scroll/dragstart/threshold CANCEL (latch, no re-arm); pointerup/touchend END (latch released). The timer is only a backstop for an end event that never arrives, so a missed pointerup cannot kill press feedback for the session');
  ok(/const cancelGesture = \(\) => \{\s*\r?\n\s*if \(pointerDown\) \{/.test(pressJs)
    && /pointerDown = true;\s*\r?\n\s*\/\/ A cancelled gesture/.test(pressJs),
    '★ #346 review MAJOR-1: the latch arms ONLY while a finger is down. The capture scroll listener also sees momentum AFTER touchend, and a programmatic scroll (scroll-to-newest, focus() pulling an input into view, the keyboard reflow) with no gesture at all — measured in Chromium, the first tap up to 1150 ms after a fling settled got NO feedback, which is the very symptom this module cures, and it self-healed on the second tap');
  ok(!/'\.c-topbar__dots'/.test(pressJs),
    '★ #346: .c-topbar__dots is NOT a control. It is the iOS-48/#314 animated "Connecting…" ellipsis, built aria-hidden — a decorative inline node. The real topbar actions already match .c-button because topbar.js builds them with createButton');
  ok(/html:root \[data-pressed\] \{ transition: none; \}/.test(baseCss)
    && /html:root \[data-pressed="row"\] \{[\s\S]{0,120}?background-size: 100% 100%/.test(baseCss)
    && /html:root \[data-pressed="control"\] \{[\s\S]{0,80}?transform: scale\(0\.97\)/.test(baseCss)
    && !/\n\[data-pressed/.test(baseCss),
    '★ #343 DEVICE FIX: the press rules carry the html:root prefix. base.css loads BEFORE every component stylesheet, and .c-chatlist-item sets `background: transparent` at the same specificity — so an unprefixed rule lost on source order and the tint never painted at all on device. html:root is (0,2,1) and beats the component\'s (0,2,0) [aria-current] and :active rules from anywhere in the cascade');
  ok(/html:root \[data-pressed="row"\]\[aria-current\] \{[\s\S]{0,120}?surface-action-tonal-pressed/.test(baseCss),
    '#343: a SELECTED row presses in its own tonal family — the neutral tint must not flash over the action colour on the desktop split view');
  /* ★ #346: the old pin said "drops the scale and every transition" and only ever
     verified the scale — deleting the whole `transition: none` half left it passing. */
  ok(/@media \(prefers-reduced-motion: reduce\)[\s\S]{0,200}?\[data-pressed="control"\] \{ transform: none; \}/.test(baseCss)
    && /@media \(prefers-reduced-motion: reduce\)[\s\S]{0,900}?html:root \.fab \{\s*\n?\s*transition: none;/.test(baseCss),
    '#343/#346: reduced motion drops the scale AND every press transition — both halves verified, not just the scale');

  /* ★ #346 (review of #343) — THE PRESS RELEASE RULE MUST NOT CLOBBER COMPONENTS.
     `transition` is a shorthand: it REPLACES, it never merges. The first cut listed all
     twelve pressable selectors at `html:root …` (0,2,1), which beat every component rule
     and silently deleted their declarations in ALL 22 shells — including the 18 that
     never call attachPressFeedback(). Measured damage: .c-button[data-morphing] lost
     `width`, so the #29 success morph stopped animating; .c-bottomnav__item lost `color`,
     so the #39 select ink-fade snapped while the ::before pill beside it kept animating;
     .c-chip and the list rows slowed from their intentional 100 ms to 200 ms.
     The rule may now list ONLY components that declare no transition of their own. */
  {
    const compDir = join(root, 'src/styles/components');
    const compCss = readdirSync(compDir).filter((f) => f.endsWith('.css'))
      .map((f) => readFileSync(join(compDir, f), 'utf8')).join('\n');
    const probe = new JSDOM('<!doctype html><html><head><style>' + baseCss + '</style><style>'
      + compCss + '</style></head><body>'
      + '<button class="c-button" data-morphing id="m"></button>'
      + '<button class="c-button" id="b"></button>'
      + '<button class="c-bottomnav__item" id="n"></button>'
      + '<button class="c-chip" id="c"></button>'
      + '<div class="c-chatlist-item" id="r"></div>'
      + '<div class="c-settings__row" id="sr"></div>'
      + '<div class="c-txlist-item" id="tx"></div>'
      + '<div class="c-contacts__row" id="cr"></div>'
      + '<button class="fab" id="f"></button>'
      // …and the same set again, pressed, to prove INSTANT ON survives the cascade.
      + '<div class="c-chatlist-item" id="pr" data-pressed="row"></div>'
      + '<div class="c-contacts__row" id="pcr" data-pressed="row"></div>'
      + '<div class="c-app-item" id="pai" data-pressed="row"><button class="c-app-item__open" id="paio"></button></div>'
      + '<div class="c-apps-recents__item" id="par" data-pressed="row"></div>'
      + '<div class="c-wallet-receive__contact" id="pwr" data-pressed="row"></div>'
      // A5 (#348) review: the rest/pressed pair for EVERY row family, plus the two
      // selected variants — the coverage hole that let the .c-app-item break ship green.
      + '<div class="c-app-item" id="ai"><button class="c-app-item__open" id="aio"></button></div>'
      + '<div class="c-apps-recents__item" id="ar"></div>'
      + '<div class="c-wallet-receive__contact" id="wr"></div>'
      + '<div class="c-settings__row" id="psr" data-pressed="row"></div>'
      + '<div class="c-txlist-item" id="ptx" data-pressed="row"></div>'
      // D-16 r3 (Opus finding 2): the Downloads file row joined the family.
      + '<button class="c-settings-dl__open" id="dl"></button>'
      + '<button class="c-settings-dl__open" id="pdl" data-pressed="row"></button>'
      + '<div class="c-chatlist-item" id="rsel" aria-current="true"></div>'
      + '<div class="c-txlist-item" id="txsel" aria-current="true"></div>'
      + '<button class="c-button" id="pb" data-pressed="control"></button>'
      + '<button class="fab" id="pf" data-pressed="control"></button>'
      /* ★ N19 (#428): the connecting line REPLACES the bar's hairline, and getting
       * that reset to win is a pure cascade question — the first build wrote it as
       * one (0,2,0) rule high in topbar.css, where it lost to the view/chat
       * `border-bottom` SHORTHAND below it AND to the (0,3,0) dark overrides. It read
       * perfectly.
       * ⚠ DARK ONLY here, and deliberately: jsdom's cssstyle drops a `border-bottom`
       * shorthand containing var(), so the light bars would report transparent for
       * the wrong reason. Light is pinned by source order in the topbarCss block. */
      + '<div data-theme="dark">'
      + '<header class="c-topbar" data-variant="chat" id="tbdc"></header>'
      + '<header class="c-topbar" data-variant="chat" data-connecting-bar id="tbdcc"></header>'
      + '<header class="c-topbar" data-variant="view" data-connecting-bar id="tbdvc"></header>'
      + '</div></body></html>');
    const pw = probe.window;
    const tr = (id) => pw.getComputedStyle(pw.document.getElementById(id)).transition;
    ok(/width/.test(tr('m')) && /transform/.test(tr('m')),
      '★ #346: .c-button[data-morphing] keeps `width` AND gains `transform`. button.css:39 exists solely to animate width during the #29 success morph, and the press rule had deleted it');
    ok(/color/.test(tr('n')) && /background-color/.test(tr('n')) && /transform/.test(tr('n')),
      '★ #346: .c-bottomnav__item keeps its #39 `color` ink-fade and gains the press properties. Losing `color` made the icon ink snap while the ::before pill still animated — one control animating two ways');
    ok(/--duration-100/.test(tr('c')) && /--duration-100/.test(tr('r')),
      '★ #346: .c-chip and the list rows keep their INTENTIONAL 100 ms micro-interaction timing (chip.css:20), which the 200 ms blanket had overridden');
    ok(/border-color/.test(tr('b')) && /transform/.test(tr('b')),
      '#346: .c-button keeps color/border-color (the #28/#49 outline and text hover ink) and gains the press transform');
    ok(/transform/.test(tr('f')),
      '#346: components that declare NO transition of their own still get the release rule from base.css — .fab is a control, so it takes transform too');
    /* Scope the check to the RELEASE rule. The reduced-motion block below it legitimately
       names every pressable selector, because `transition: none` there is the point. */
    const releaseRule = baseCss.slice(
      baseCss.indexOf('/* The release transition lives on'),
      baseCss.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    ok(releaseRule.length > 100
      && !/html:root \.c-button|html:root \.c-chip|html:root \.c-bottomnav__item|html:root \.c-chatlist-item|html:root \.c-txlist-item|html:root \.c-settings__row/.test(releaseRule),
      '★ #346 THE RULE ITSELF: the release rule must not name a component that declares its own transition. Adding one back re-opens the clobber for every shell at once');
    /* ★ #346 review MINOR-3: the pin above is NEGATIVE, so deleting the release rule
       outright left it green — and that would leave the contacts picker, apps tab,
       recents strip and wallet-receive picker with no release fade at all. Positive
       probe for the row half; .fab above already covers the control half. */
    ok(/background-color/.test(tr('cr')),
      '★ #346: the four components that declare NO transition of their own still GET the release fade from base.css. Deleting the rule would make their tint snap off, and only a positive probe catches that');
    /* ★ #346 review r2 NIT-2: .c-settings__row and .c-txlist-item were REMOVED from the
       base.css list on the grounds that they declare their own transition. Nothing held
       them to that, so deleting the component declaration would make the press snap off
       with a green suite. */
    ok(/background-color/.test(tr('sr')) && /background-color/.test(tr('tx')),
      '★ #346 review r2: .c-settings__row and .c-txlist-item still declare their OWN background-color transition — which is why base.css correctly does not name them. Drop it in the component and the press release snaps off with nothing else to catch it');

    /* ★ N19 (#428) — the connecting line's border reset, resolved through the real
     * cascade rather than read off the file. */
    {
      const bbc = (id) => pw.getComputedStyle(pw.document.getElementById(id)).borderBottomColor;
      const isTransparent = (v) => /^(transparent|rgba\(0,\s*0,\s*0,\s*0\))$/.test(String(v).trim());
      /* ★ HARNESS HONESTY, and it changes what can be claimed here. jsdom's cssstyle
       * DROPS a `border-bottom` SHORTHAND that contains var() — which is exactly how
       * the light variants declare their hairline. So in light, a non-connecting bar
       * already computes to transparent for a reason that has nothing to do with this
       * feature, and a light assertion would pass vacuously (#421: a check that
       * passes vacuously is worse than no check). The dark overrides are LONGHAND
       * `border-bottom-color` with var(), which cssstyle keeps — so dark is where the
       * cascade is genuinely observable, and dark is also the half that actually
       * broke. Light is pinned by SOURCE ORDER below, which is its real mechanism. */
      ok(bbc('tbdc') === 'var(--outline-neutral-02)',
        '★ N19 harness self-check: a non-connecting DARK bar still reports its longhand hairline, so the assertions below are reading a live cascade and not an empty one');
      ok(isTransparent(bbc('tbdcc')) && isTransparent(bbc('tbdvc')),
        '★ N19 (#428): a CONNECTING bar drops its own hairline in DARK, both bordered variants — the sweep IS the bottom border while the state is live. The dark overrides are (0,3,0), so without the [data-theme="dark"] twin the reset loses HERE ONLY: the single-theme miss this project has shipped before (#423 MAJOR-3)');
      ok(!isTransparent(bbc('tbdc')),
        '★ N19: a DARK bar that is NOT connecting keeps its hairline — the reset is scoped to the state, not to the variant');
    }
    {
      const topbarCss = readFileSync(join(root, 'src/styles/components/topbar.css'), 'utf8');
      ok(/@keyframes topbar-connecting \{[^}]*background-position/.test(topbarCss)
        && /animation: topbar-connecting [\d.]+s linear infinite;/.test(topbarCss),
        '★ N19: the sweep animates BACKGROUND-POSITION on an oversized gradient — one compositable property. Animating width/inset would relayout the bar on every frame, and full bleed made the bar height arithmetic load-bearing');
      const rm = topbarCss.slice(topbarCss.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
      ok(/\[data-connecting-bar\]::after/.test(rm) && /animation: none/.test(rm)
        && /background-color: var\(--surface-action-default\)/.test(rm),
        '★ N19: under reduced motion the line HOLDS as a solid rule rather than disappearing — it is state, not decoration. The title dots follow the same rule (iOS-48)');
      /* ★ N19 LIGHT, pinned by the mechanism that actually decides it. The light
       * variants set the `border-bottom` SHORTHAND at (0,2,0); the reset is (0,2,0)
       * too, so the ONLY thing that makes it win is being declared later in the file.
       * The first build put it near the top and it silently lost to all four rules. */
      const iReset = topbarCss.lastIndexOf('[data-connecting-bar] { border-bottom-color: transparent');
      const iLastBorder = topbarCss.lastIndexOf('border-bottom: var(--outline-width-1)');
      ok(iReset > 0 && iLastBorder > 0 && iReset > iLastBorder,
        '★ N19 (#428): the hairline reset is declared AFTER the last variant `border-bottom` shorthand. Equal specificity means source order is the whole answer in light, and jsdom cannot see it (it drops var()-bearing shorthands) — so it is pinned here, positionally');
      ok(/\[data-theme="dark"\] \.c-topbar\[data-connecting-bar\]/.test(topbarCss),
        '★ N19: …and the dark twin exists in the same rule. Dropping it would break dark ONLY, with light still green');
      ok(/var\(--surface-action-default\)/.test(topbarCss) && !/var\(--surface-action\)[^-]/.test(topbarCss),
        '★ N19: the ink is --surface-action-DEFAULT. The first build used var(--surface-action), which does not exist — an invalid var() inside a gradient kills the whole background-image, so the line rendered as NOTHING while the CSS read fine. Found by rendering it');
    }
    {
      /* ★ N19 shell wiring, both ends. The chat topbar is REBUILT on six triggers
       * (setNickname, setOnlineStatus, setAvatar, setChatMode, channel select, the
       * rAF coalescer), so the attribute has to be applied FROM STATE inside the
       * render — a one-shot poke from the push handler evaporates on the next
       * presence tick. That is the #188 typing-pill defect, and it has recurred in
       * this shell often enough to be worth its own pin. */
      const chatShellSrc = readFileSync(join(root, 'src/shells/chat.html'), 'utf8');
      ok(/if \(connectivitySub\) tb\.setAttribute\('data-connecting-bar', ''\);/.test(chatShellSrc),
        '★ N19: chat.html sets the line inside renderTopbarNow FROM connectivitySub — so it survives all six topbar rebuilds');
      /* ⚠ matched on the CALL, not on the token appearing nearby: a proximity match
       * is satisfied by a comment (#421 caught three self-defeating pins of exactly
       * this shape — a word-match, a prefix-match, and one aimed at the wrong site). */
      ok(/setTopbarSub\(topbarHost[\s\S]{0,600}?bar\.setAttribute\('data-connecting-bar', ''\);[\s\S]{0,200}?bar\.removeAttribute\('data-connecting-bar'\);/.test(chatShellSrc),
        '★ N19: …and ALSO in the in-place sub-swap branch, which deliberately does not rebuild (the aria-live node must survive, audit A-2) — and it CLEARS as well as sets, or the line would outlive the state on that path. Both branches read the same connectivitySub, so they cannot disagree');
      const homeShellSrc = readFileSync(join(root, 'src/shells/home.html'), 'utf8');
      ok(/base: chatsTitleBase, bar: chatsTopbarEl/.test(homeShellSrc)
        && /strings\.tabApps \|\| 'Apps', bar: appsTopbarEl/.test(homeShellSrc),
        '★ N19: home.html carries the owning BAR on each title-state target, so one setChatsTitleState call drives the title and the line together');
      ok(/strings\.wallet \|\| 'Wallet', bar: null/.test(homeShellSrc),
        '★ N19: the wallet HERO carries bar:null deliberately — it is not a .c-topbar, has no hairline to replace, and its bottom corners are rounded by --radius-24, so a straight sweep would cut them. It keeps the title state alone');
    }

    /* ★ #346 review MAJOR-1: INSTANT ON must beat the release rules. Both are (0,2,1),
       so the winner is whichever is declared LAST. The instant-on rule used to sit
       ABOVE them and lost for exactly the five selectors the release rule names — the
       FAB and four row families ramped their tint in over 200 ms while the chat rows
       beside them snapped. Two press grammars in one flow, on the "start a chat" path. */
    for (const [id, what] of [['pb', '.c-button'], ['pf', '.fab']]) {
      ok(/^(none|)$/.test(tr(id).trim()) || tr(id).trim() === 'none',
        '★ #346: ' + what + ' has NO transition while pressed — the tint appears instantly. A 200 ms ramp in is what Damir read as "abrupt with delay", which is why the in-state is no transition at all. CONTROLS keep this; A5 (#348) changed ROWS only');
    }
    /* ★ A5 / W4b (#348, Damir): a ROW fills from the CENTRE OUTWARD instead of flashing
       a flat tint, which he read as a flicker. The fill IS motion, so rows are the one
       exception to instant-on — and that exception only works because the row rule is
       declared AFTER `html:root [data-pressed] { transition: none; }`. Both are (0,2,1),
       so source order is the entire mechanism: move it back above and every row snaps to
       full width with no sweep, silently restoring the flat tint. */
    for (const [id, what] of [['pr', '.c-chatlist-item'], ['pcr', '.c-contacts__row'],
      ['pai', '.c-app-item'], ['par', '.c-apps-recents__item'],
      ['pwr', '.c-wallet-receive__contact'], ['pdl', '.c-settings-dl__open']]) {
      ok(/background-size/.test(tr(id)),
        '★ A5 (#348): ' + what + ' animates background-size WHILE PRESSED — that transition is the centre-out sweep, and it must out-order the instant-on rule to exist at all');
    }
    /* ★ A5 (#348) review — MUTATION-HONEST, and the first cut was NOT.
       `/100%/` was matched by the REST value `0% 100%`, so the pin that claimed to prove
       the sweep completes passed with base.css's size flip deleted outright — the one
       line that makes the fill happen. `/0%/` was satisfied inside `100%` the same way.
       Both now compare the size EXACTLY, and every row family is probed rather than one.
       The review also found the fill on the wrong element for .c-app-item, which stayed
       green because the only other pin checked that a transition STRING mentioned
       background-size. So the probe reads the element that actually carries
       data-pressed. */
    const fillOf = (id) => {
      const st = pw.getComputedStyle(pw.document.getElementById(id));
      return { img: st.backgroundImage, pos: st.backgroundPosition, size: st.backgroundSize };
    };
    for (const [rest, pressed, what] of [['r', 'pr', '.c-chatlist-item'],
      ['cr', 'pcr', '.c-contacts__row'], ['aio', 'paio', '.c-app-item__open'],
      ['ar', 'par', '.c-apps-recents__item'], ['wr', 'pwr', '.c-wallet-receive__contact'],
      ['sr', 'psr', '.c-settings__row'], ['tx', 'ptx', '.c-txlist-item'],
      ['dl', 'pdl', '.c-settings-dl__open']]) {
      const a = fillOf(rest), b = fillOf(pressed);
      ok(/linear-gradient/.test(a.img),
        '★ A5 (#348): ' + what + ' carries the fill image AT REST. Declaring it only under [data-pressed] leaves the release nothing to shrink, and putting it on a CHILD of the pressed element (the .c-app-item mistake this pin now catches) means the size flip can never reach it');
      ok(a.size === '0% 100%',
        '★ A5 (#348): ' + what + ' rests at EXACTLY `0% 100%` — zero wide, full height. A substring test here passed with the whole pressed rule deleted');
      ok(/center/.test(a.pos),
        '★ A5 (#348): ' + what + ' grows from the CENTRE. Without background-position the fill wipes in from the leading edge — a different effect, and not the one that was asked for');
      ok(b.size === '100% 100%',
        '★ A5 (#348): ' + what + ' reaches EXACTLY `100% 100%` while pressed — the sweep completes and covers the row');
      ok(/linear-gradient/.test(b.img),
        '★ A5 (#348): ' + what + ' still HAS an image while pressed — the [aria-current] and [data-pressed] rules do not reset it. NOTE the honest scope: jsdom never matches :hover or :active on these probe nodes, so the shorthand sweep for THOSE states is the source-level pin below, not this one');
    }
    /* ★ A5 (#348) review r2 — THE SWEEP jsdom CANNOT DO. The probe nodes carry only
       data-pressed / aria-current, so no :hover or :active rule is ever exercised. A
       `background` SHORTHAND in one of those states resets background-image and kills the
       fill on a real device while every computed-style pin above stays green. Read the
       source instead: no state rule for a row family may use the shorthand.
       This is exactly how the .c-app-item break survived the first round. */
    {
      /* ★ review r4: `c-app-item__open` is listed EXPLICITLY. The `(?![\w-])` boundary
         below exists so `.c-app-item__info` (a different element) is not flagged — but `_`
         matches `[\w-]`, so it silently excluded `__open` too, which is exactly the box
         the fill now lives on. A `background` shorthand in its :hover or :active would
         have killed the apps sweep with the whole suite green. */
      const ROWCLS = ['c-chatlist-item', 'c-txlist-item', 'c-settings__row', 'c-contacts__row',
        'c-app-item', 'c-app-item__open', 'c-apps-recents__item', 'c-wallet-receive__contact',
        'c-settings-dl__open'];   // D-16 r3: the Downloads file row joined the family
      /* ★ review r3 — THREE FALSE NEGATIVES fixed. The first version read only the
         component folder plus two shells, examined only the FIRST `background:` in each
         rule (so a rule opening with `background: transparent` — and two shipped row
         rules do — hid every later shorthand), and missed a legal `background : red`. */
      const shellDir = join(root, 'src/shells');
      const cssFiles = readdirSync(compDir).filter((f) => f.endsWith('.css'))
        .map((f) => ['src/styles/components/' + f, readFileSync(join(compDir, f), 'utf8')])
        .concat([['src/styles/base.css', baseCss]])
        .concat(readdirSync(shellDir).filter((f) => f.endsWith('.html'))
          .map((f) => ['src/shells/' + f, readFileSync(join(shellDir, f), 'utf8')]));
      const offenders = [];
      for (const [name, txt] of cssFiles) {
        for (const m of txt.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
          const sel = m[1];
          const body = m[2];
          // EVERY shorthand in the rule, not just the first, and `background : x` too
          const decls = [...body.matchAll(/(?:^|;)\s*background\s*:\s*([^;]+)/g)].map((d) => d[1].trim());
          if (decls.length === 0) continue;
          /* ★ review r5: `background: transparent` is exempt ONLY in a rule that
             re-declares the image — that is the BASE rule, where the reset is followed by
             the fill. In a STATE rule it resets background-image to none and kills the
             sweep just as surely as a colour would, so it must still be flagged. */
          if (decls.every((v) => /^transparent\b/.test(v)) && /background-image\s*:/.test(body)) continue;
          /* Only a rule that applies TO the row matters. A descendant rule
             (`.c-contacts__row[aria-checked] .c-contacts__check`) paints a CHILD and
             cannot reset the row's own background — and a substring test would also
             flag `.c-app-item__info`, which is a different element entirely. So test
             the LAST compound of each comma-separated selector, on a class boundary. */
          for (const one of sel.split(',')) {
            const last = one.trim().split(/[\s>+~]+/).pop() || '';
            for (const c of ROWCLS) {
              if (new RegExp('\\.' + c + '(?![\\w-])').test(last)) {
                offenders.push(name + ' :: ' + one.trim());
              }
            }
          }
        }
      }
      ok(offenders.length === 0,
        '★ A5 (#348): NO `background` shorthand targets a pressable row family in any state. A shorthand resets background-image, so one of these silently deletes the centre-out fill on device while every jsdom pin stays green' + (offenders.length ? ' — found: ' + offenders.join(' | ') : ''));
      ok(/\.c-chatlist-item:active \{ background-size: 100% 100%; \}/.test(readFileSync(join(compDir, 'chatlist-item.css'), 'utf8')),
        '★ A5 (#348) review r2: :active DRIVES the fill instead of covering it. It used to paint the identical colour flat across the row, and :active lands together with data-pressed on every Chromium engine — so the flat tint hid the sweep and the press still read as the flicker this change exists to remove');
      ok(/html:root \[data-pressed="row"\] \.c-app-item__open \{[\s\S]{0,80}?background-size: 100% 100%/.test(baseCss),
        '★ A5 (#348): .c-app-item is the one family whose PRESSED element is not the PAINTED one — pressable.js flags the wrapper, the child __open draws the row, so the size flip has to reach the child');
      /* ★ review r3: and the CHILD must carry its own transition. `transition` does not
         inherit, and base.css names the wrapper — so without this the fill SNAPS to an
         opaque flat tint, which is the exact effect A5 exists to remove. r2 shipped that
         and every pin stayed green, because the probe DOM had no __open child at all. */
      /* ★ review r4: assert a NON-ZERO duration. A substring test passed on
         `background-size 0ms`, which snaps — the exact effect this pin guards against. */
      ok(/background-size\s+(?!0m?s\b)[^,]+/.test(pw.getComputedStyle(pw.document.getElementById('aio')).transition),
        '★ A5 (#348) review r3: .c-app-item__open declares its OWN background-size transition. It is the box that paints the apps row, it paints ABOVE the wrapper, and transition does not inherit — without this the apps family is the one family the centre-out fill never reaches');
      /* ★ review r5: jsdom does not evaluate @media (prefers-reduced-motion), so this is
         a SOURCE pin or it is nothing. __open's transition hard-codes 140ms rather than a
         --duration-* token, so the token-zeroing under reduce never reaches it — being
         named in this list is the only thing that stops the apps row animating for a user
         who asked it not to. */
      ok(/@media \(prefers-reduced-motion: reduce\)[\s\S]{0,700}?html:root \.c-app-item__open,/.test(baseCss),
        '★ A5 (#348) review r5: .c-app-item__open is named in the reduced-motion list. It is the ONE row family whose transition is not token-driven, so nothing else can zero it');
      ok(!/\.c-app-item \{[^}]*background-image/.test(readFileSync(join(compDir, 'apps-item.css'), 'utf8')),
        '★ A5 (#348) review r3: the fill is on __open ALONE. Declaring it on the wrapper TOO put an untransitioned opaque tint directly over the wrapper\'s own animated sweep, and grew two fills from two different centres');
    }

    /* The selected row closes in its own tonal family; without its own image it would
       revert to the neutral gradient the instant the press ended. */
    for (const [id, what] of [['rsel', '.c-chatlist-item[aria-current]'], ['txsel', '.c-txlist-item[aria-current]']]) {
      ok(/tonal-pressed|linear-gradient\(var\(--surface-action-tonal-pressed\)/.test(fillOf(id).img) && fillOf(id).size === '0% 100%',
        '★ A5 (#348): ' + what + ' carries its OWN tonal fill at rest, so the close does not flash the neutral grey over the action colour');
    }
    pw.close();
  }

  ok(/\.chat-boot__spinner \{[\s\S]{0,220}?animation: chat-boot-spin/.test(chatSh),
    '★ #346 (review of the #343 revert): .chat-boot__spinner has a BOX again. That sizing rule is PRE-#343 and the revert took it out beside the #343 delay rule, leaving an empty display:inline span that paints nothing — so the chat log was a blank rectangle for the whole entry window, WORSE than the state the revert meant to restore. #343 only ever argued the spinner should be delayed, never removed');

  /* D-16 r2 (audit C-4): downloads.html joined — it renders .c-settings__row rows
     and was the one rows-bearing shell without the mechanism (two press grammars
     for the same row family across Account sublevel vs standalone takeover). */
  for (const sh of ['chat', 'home', 'settings', 'contact_details', 'downloads']) {
    const src = readFileSync(join(root, 'src/shells/' + sh + '.html'), 'utf8');
    ok(/attachPressFeedback\(\);/.test(src) && /attachPressFeedback,/.test(src),
      '#343: ' + sh + '.html attaches press feedback (one line per shell — the delegated listener covers rows created by later re-renders)');
  }

  ok(/messagesToLoad = 50;/.test(cfgCs) && !/messagesToLoad = 100;/.test(cfgCs),
    '★ #343 (rebased by N52): the opening message window is 50 — never back to 100. Each message is its own EvaluateJavaScriptAsync (Utils.sendUiCommand:180 → SpixiContentPage:187), so 100 messages meant ~100 process-boundary crossings before anything appeared; N52 re-raised the #343 cut (25 rarely covered one screen of history) with the A52 re-measure owed');
}

/* —— I2 (#347): the desktop add-contact pane had full-width content ——————————
 * ixian:newcontact pins ContactNewPage to the detail column on a wide window
 * (HomePage.xaml.cs:502-511, the shared "formpane" tag), so on desktop this page IS a
 * pane and has to read like one. Its sibling in the same pane, app_new.html, has always
 * capped its content; contact_new.html never did, so the form ran the full width of the
 * column while everything beside it was constrained. */
/* —— #348 W14 · W2 · W8 — the batch the r2 reviewer found had NO pins at all ————— */
console.log('#348 — W14 delete · W2 auto-save · W8 tip + blindness');
{
  const sp348  = readFileSync(join(root, 'Spixi/Pages/Settings/SettingsPage.xaml.cs'), 'utf8');
  const scp348 = readFileSync(join(root, 'Spixi/Pages/Chat/SingleChatPage.xaml.cs'), 'utf8');
  const sh348  = readFileSync(join(root, 'src/shells/settings.html'), 'utf8');
  const ch348  = readFileSync(join(root, 'src/shells/chat.html'), 'utf8');

  /* —— W14: the freeze —— */
  ok(/MainThread\.BeginInvokeOnMainThread\(\(\) =>\s*\r?\n\s*\{\s*\r?\n\s*MainThread\.BeginInvokeOnMainThread\(\(\) => \{ deleteWalletWork\(\); \}\);/.test(sp348),
    '★ W14 (#348): the delete work leaves the WebView navigation callback, and does it in TWO hops. LockPage raises authSucceeded BEFORE it closes itself, and its close posts its own teardown — so a single hop is enqueued AHEAD of that and the user watches the whole wipe behind an opaque lock');
  ok(!/wipeAccountData\(\);[\s\S]{0,400}?onLoad\(\);/.test(sp348) && /private void wipeAccountData\(\)/.test(sp348),
    '★ W14 (#348): onLoad() is GONE from the delete path. It re-read the nickname, own-avatar path and primary address that the lines above it had just deleted — an NRE there escaped through authSucceeded, so LockPage never closed and hardware back was swallowed. That was the permanent freeze');
  ok(/popToRootAsync\(\);[\s\S]{0,1400}?SpixiContentPage\.disposeParkedOverlay\(\);/.test(sp348) && !/disposeParkedOverlay\(\);[\s\S]{0,200}?popToRootAsync\(\);/.test(sp348),
    '★ W14 (#348): the parked overlay is disposed AFTER the pop, not before. The non-rail Account push carries parkOnClose, so popToRootAsync PARKS this page — and disposing first is a no-op, because nothing is parked yet. Left parked, the WIPED account stays warm and re-presentable');
  ok(!/deleteInFlight = false;\s*\r?\n\s*goToWelcome\(\);/.test(sp348),
    '★ W14 (#348): the latch is NOT cleared on a route that navigates away. LockPage can raise authSucceeded twice (password, then a late biometric), and clearing it let the second one re-run the wipe and push a SECOND LaunchPage');

  ok((readFileSync(join(root, 'Spixi/Pages/Launch/LaunchPage.xaml.cs'), 'utf8').match(/IxianHandler\.getWalletList\(\)\.Count > 0/g) || []).length >= 2,
    '★ W14 (#348), after N75 merged the pages: BOTH doors refuse while a wallet exists — restore as well as create. Delete-account now routes to welcome and KEEPS the wallet, so a live wallet can sit behind onboarding — and Restore was the one door that would have run straight over it');

  /* —— W2: auto-save —— */
  ok(/onLock: \(next, ctrl\) => \{[^\n]*?ctrl\.done\(\); state\.dirtyLock = true; syncSave\(\); \}/.test(sh348)
    && /onAvatarRemove: \(ctrl\) => \{[^\n]*?ctrl\.done\(\); syncSave\(\); \}/.test(sh348),
    '★ W2 (#348): onLock and onAvatarRemove must NOT auto-save. bridge.send is a bare location.href with no queue, so two verbs in one task coalesce last-wins — ixian:apply would clobber ixian:lock:on / ixian:remove, and the save would then write the value the dropped verb was supposed to set');
  ok(/if \(lockSaved === undefined\) \{ lockSaved = v; state\.dirtyLock = false; \}/.test(sh348)
    && /else if \(v !== lockSaved\) \{ lockSaved = v; state\.dirtyLock = true; autoSave\(\); \}/.test(sh348),
    '★ W2 (#348): app-lock is persisted from C#\'s CONFIRMATION push, which is the only value C# actually holds. Saving at toggle time would persist the PRE-AUTH value on the OFF direction and clear the dirty flag with it — leaving the lock permanently on');
  ok(/lockEnabled = true;[\s\S]{0,700}?Utils\.sendUiCommand\(this, "setLockEnabled", lockEnabled\.ToString\(\)\);/.test(sp348),
    '★ W2 (#348): the lock ON path CONFIRMS too. Auto-save removes the Save control, so without this push enabling the lock had no persist trigger and no affordance at all');
  ok(/let exitSent = false;/.test(sh348) && /if \(exitSent\) return;[^\n]*\r?\n\s*exitSent = true;/.test(sh348),
    '★ W2 (#348): the outbound-verb latch is SEPARATE from the render latch. `exiting` freezes painting and self-heals; `exitSent` stops a second exit verb');
  ok(/exiting = false;\s*\r?\n\s*exitSent = false;\s*\r?\n\s*rebuildQueued = false;/.test(sh348),
    '★ W2 (#348): the heal releases BOTH latches. Holding exitSent forever turned a frozen pane into one that can never be closed — HomePage only ASKS the shell to exit and waits for an answer that would never come again');
  ok(!/renderLayout\(\);\s*\r?\n\s*syncSave\(\);\s*\r?\n\s*\}, EXIT_HEAL_MS\)/.test(sh348),
    '★ W2 (#348): the heal must NOT renderLayout. Rebuilding the current view re-runs buildScreen, and the downloads sublevel EMITS ixian:loadDownloads — a fresh verb out of a page that is mid-pop, which is the stray-verb class the latch exists to stop');

  /* —— W8: tip + blindness —— */
  {
    /* ★ review r3: the first version of this pin matched the TEXT anywhere in the file,
       so moving the guard BELOW every dereference left it green — and the guard's whole
       value is its position. Slice from the assignment to the first `tx.` use and require
       the null check inside that window. */
    // NOTE the second indexOf is anchored at `tipStart` — an earlier payment handler in
    // this same file has its own `IxiNumber balance = …` line, and an unanchored search
    // found THAT one, producing an empty slice and a pin that could never fail.
    const tipStart = scp348.indexOf('var tx = prepTx.transaction;');
    const tipEnd = scp348.indexOf('IxiNumber balance = IxianHandler.getWalletBalance', tipStart);
    // ★ review r4: if the anchor line ever disappears, indexOf returns -1 and
    // slice(tipStart, -1) would silently become "the rest of the file" — degenerating
    // this placement pin into a text-exists pin. Require a real window.
    ok(tipStart >= 0 && tipEnd > tipStart,
      '★ W8 (#348): the tip block still has both anchors the placement pin slices between');
    const tipSlice = scp348.slice(tipStart, tipEnd);
    // Structural, not length-bounded: the guard must appear inside the window, must be
    // preceded by NO dereference, and must return before the window ends. An earlier
    // version capped the gap at 1500 chars and broke the moment the block grew a comment.
    /* ★ review r5: TWO defeats closed.
       (a) the pre-guard test named three members (amount|fee|id), so inserting
           `tx.toList` or `tx.pubKey` above the guard left this green while reproducing
           the crash exactly. It is now ANY member.
       (b) the return test accepted any `return;` later in the window, so gutting the
           guard to a log-and-fall-through also stayed green. It is now scoped to the
           guard's OWN block, found by brace matching.
       Comments are stripped first, so prose mentioning `tx.fee` cannot false-positive. */
    const stripCs = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const tipCode = stripCs(tipSlice);
    const guardAt = tipCode.indexOf('if (tx == null)');
    let guardBody = '';
    if (guardAt >= 0) {
      let i = tipCode.indexOf('{', guardAt), depth = 0, j = i;
      for (; j < tipCode.length && i >= 0; j++) {
        if (tipCode[j] === '{') depth++;
        else if (tipCode[j] === '}') { depth--; if (depth === 0) break; }
      }
      guardBody = i >= 0 ? tipCode.slice(i, j + 1) : '';
    }
    ok(guardAt >= 0
      && !/\btx\.\w/.test(tipCode.slice(0, guardAt))
      && /\breturn;/.test(guardBody),
      '★ W8 (#348): the tip null-check sits BETWEEN the assignment and the first dereference. prepareTransactionFrom RETURNS NULL on insufficient funds, and the throw escapes onNavigating before e.Cancel — so the WebView navigated to the raw ixian: URL and destroyed the conversation');
  }
  ok(/if \(friend\.metaData == null \|\| friend\.metaData\.botInfo == null\)/.test(scp348),
    '★ W8 (#348): the tip guard FAILS CLOSED on missing metadata. The old `bot || (Group && …)` short-circuited for a bot and never touched botInfo; a friend can also BECOME a bot after onLoad computed the chat type, so botInfo is genuinely null here');
  ok(!/modal_title = String\.Format\(SpixiLocalization\._SL\("chat-modal-tip-title"\)/.test(scp348),
    '★ D-11 (#348b, audit): the tip TITLE ladder is GONE, not merely written. The audit proved it was DEAD CODE — both branches answer through sendTipResult, which carries no title, so modal_title was assigned and never read, and C# emits no warning for that. Damir\'s complaint ("Tip <group name>?") is fixed by removing that alert entirely; the name he sees is the tip sheet header, which the shell already resolves correctly');
  ok(/mode\.blind \? \(\(window\.SL \|\| \{\}\)\.hiddenMember/.test(ch348)
    && /senderIsAddress: \(!isSent && mode\.isMulti && !mode\.blind/.test(ch348),
    '★ W8 (#348) SECURITY: in a blind chat the sender LABEL carries no address. Gating only the member sheet made it worse — the label then took message-bubble\'s no-sheet branch, which puts the full address in title, in aria-label, and one tap from the clipboard');
  ok(/onSenderClick: \(!isSent && !mode\.blind/.test(ch348),
    '★ W8 (#348) SECURITY: a blind chat opens no member sheet. C# does not mask for bots — insertMessage sends senderAddress verbatim for bot||Group with no blindness test');
  ok(/mode\.blindKnown = \(t !== 3\) \|\| \(blindString !== undefined\)/.test(ch348),
    '★ W8 (#348): "no 7th argument" is UNKNOWN blindness for a bot, not "not blind". An exe that predates the argument still blocks tip for every bot, so offering it there would be the dead button this batch removes');
}

/* —— #348b — the F5 follow-up batch (I-8 · D-10/I-7 · D-11 · D-9② · I-5) ————————— */
console.log('#348b — F5 follow-up fixes');
{
  const scpB  = readFileSync(join(root, 'Spixi/Pages/Chat/SingleChatPage.xaml.cs'), 'utf8');
  const hpB   = readFileSync(join(root, 'Spixi/Pages/Home/HomePage.xaml.cs'), 'utf8');
  const chB   = readFileSync(join(root, 'src/shells/chat.html'), 'utf8');
  const tbCss = readFileSync(join(root, 'src/styles/components/topbar.css'), 'utf8');
  const tbJs  = readFileSync(join(root, 'src/components/topbar.js'), 'utf8');
  const baseB = readFileSync(join(root, 'src/styles/base.css'), 'utf8');
  /* ★ mutation harness 2026-08-15: the "answer the sheet" pins measure the DISTANCE from a
     catch to its sendTipResult, so a comment written between the two turned the suite red
     with the code correct. Measure on comment-free text — the pin then tracks the CODE,
     which is what it is for, and a future explanatory comment cannot break it. */
  const scpNC = scpB.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  /* —— I-8: the press fill's colour and speed (Damir's dial) —— */
  const ROWFILES = ['chatlist-item', 'txlist-item', 'settings-shell', 'contacts-shell',
    'wallet-receive', 'apps-item', 'apps-recents',
    'settings-app'];   // D-16 r3: the Downloads file row joined the family
  for (const f of ROWFILES) {
    const css = readFileSync(join(root, 'src/styles/components/' + f + '.css'), 'utf8');
    ok(/background-image: linear-gradient\(var\(--surface-action-tonal-default\), var\(--surface-action-tonal-default\)\)/.test(css),
      '★ I-8 (#348b): ' + f + ' fills with --surface-action-tonal-DEFAULT — what a SELECTED row actually paints. ★ The audit caught the first cut matching the token NAME (--surface-interactive-selected) instead of the LOOK: that token was abandoned on this very surface in 2026-07 because it is "barely visible on the near-black canvas", measured at 1.027:1 in dark and DARKER than the surface it sits on. Re-adopting it would have shipped a defect Damir had already rejected');
  }
  ok(/html:root \[data-pressed="row"\],\s*\r?\n\s*html:root \[data-pressed="row"\] \.c-app-item__open \{[\s\S]{0,900}?transition: background-size var\(--duration-300\)/.test(baseB),
    '★ I-8 (#348b): the press OPEN runs at --duration-300, and the .c-app-item__open CHILD is in the same rule. pressable.js flags the wrapper but the child is the box that paints, and it carries its own 220 ms ACCELERATE declaration — without the child selector the apps row opens on the opposite easing family from the other six');

  /* —— ★ D-16 (#351): the fill COMPLETES, then FADES — the afterlife, at source —— */
  {
    const pjs = readFileSync(join(root, 'src/components/pressable.js'), 'utf8');
    const bcss = readFileSync(join(root, 'src/styles/base.css'), 'utf8');
    ok(/if \(el && el\.dataset\.pressed === 'row'\) \{[\s\S]{0,240}?handoff\(elm, pressStart, gestureViaTouch/.test(pjs),
      '★ D-16 (#351): endGesture hands a committed ROW press to the afterlife instead of clearing — deleting this resurrects the sweep frozen at 65% from the Damir recording');
    ok(/'touchcancel', abortGesture/.test(pjs) && /'pointercancel', abortGesture/.test(pjs)
      && !/'touchcancel', endGesture/.test(pjs) && !/'pointercancel', endGesture/.test(pjs),
      '★ D-16 (#351): touchcancel/pointercancel bind the ABORT, never the release — on Android a cancel IS the scroll takeover, and a release there plays a full fill on every flick');
    ok(/readMs\('--duration-300', FILL_FALLBACK_MS\)/.test(pjs)
      && /readMs\('--duration-200', FADE_FALLBACK_MS\)/.test(pjs)
      && /fillMs - \(performance\.now\(\) - pressedAt\)/.test(pjs) && !/Date\.now\(\)/.test(pjs),
      '★ D-16 (#351): the floor reads the LIVE duration tokens and the MONOTONIC clock — a wall-clock step backwards between press and release would hold the tint for the size of the step (audit A-2)');
    ok(/if \(fadeMs <= 0\) \{ killAfterlife\(elm\); return; \}/.test(pjs),
      '★ D-16 (#351): reduced motion skips the fade states entirely — holding a flat tint over two rAFs with 0ms transitions serves nobody');
    ok(/killAfterlife\(t\);/.test(pjs)
      && /const onHide = \(\) => \{ abortGesture\(\); killAllAfterlives\(\); \};/.test(pjs),
      '★ D-16 (#351): a re-press interrupts its target’s afterlife, and hiding the page kills them ALL — no fade timer may strand a lit row across an overlay or a backgrounding');
    ok(/a\.t3 = setTimeout\(\(\) => killAfterlife\(elm\), Math\.max\(remaining, 0\) \+ fadeMs \+ 1500\);/.test(pjs)
      && /clearTimeout\(a\.t1\); clearTimeout\(a\.t2\); clearTimeout\(a\.t3\);/.test(pjs),
      '★ D-16 r2 (audit A-5): every afterlife carries an UNCONDITIONAL timer backstop and killAfterlife clears it — a rAF stall on a covered-but-not-hidden WebView must not strand a flat-tinted row until vsync resumes');
    ok(/if \(gh && !e\.touches && e\.pointerType !== 'mouse' && e\.pointerType !== 'pen'\s*\r?\n?\s*&& gh\.viaTouch && \(performance\.now\(\) - gh\.at\) < 800\) return;/.test(pjs),
      '★ D-16 r2/r3 (audit A-1 + Opus 4c): the GHOST guard — a late synthesised pointerdown after a committed TOUCH tap must not kill the earned afterlife and re-arm a spurious press. pointerType exempts a REAL mouse/pen (a hybrid laptop finger-tap-then-click must keep its feedback); a real second touch tap begins with touchstart and passes');
    ok(/const gh = t && afterlives\.get\(t\);[\s\S]{0,700}?return;\s*\r?\n\s*clear\(\);\s*\r?\n\s*if \(!t\) return;/.test(pjs),
      '★ D-16 r3 (Opus finding 5): the ghost guard runs BEFORE clear() — a ghost for row A must not kill a live press already armed on row B; the old order wiped B mid-sweep and B’s release then found nothing to complete');
    ok(/const stampTouch = \(e\) => \{\s*\r?\n?\s*if \(e && \(e\.touches \|\| e\.changedTouches\)\) lastTouchTs = performance\.now\(\);/.test(pjs)
      && (pjs.match(/stampTouch\(e\);/g) || []).length >= 4,
      '★ D-16 r3 (Opus finding 4a): lastTouchTs is stamped on EVERY touch-stream event (down/move/end/cancel) — stamping only touchstart left any press held over a second unprotected, because the release evaluates the window and the start was too old by then');
    ok(/handoff\(elm, pressStart, gestureViaTouch \|\| !!\(e && \(e\.touches \|\| e\.changedTouches\)\)\)/.test(pjs)
      && /gestureViaTouch = !!e\.touches \|\| \(performance\.now\(\) - lastTouchTs\) < 300;/.test(pjs)
      && /viaTouch: viaTouch === true,/.test(pjs),
      '★ D-16 r4 (Opus finding 2): viaTouch is PER-GESTURE state decided at ARM time and passed into handoff explicitly — deriving it at release from lastTouchTs raced Chromium’s pointerup-before-touchend order, and a still one-second press shipped unprotected');
    ok((() => {
      const rmStart = bcss.indexOf('@media (prefers-reduced-motion: reduce)');
      if (rmStart < 0) return false;
      const fabAt = bcss.indexOf('html:root .fab', rmStart);
      if (fabAt < 0) return false;
      const rmBlock = bcss.slice(rmStart, fabAt + 60);
      const rowsM = pjs.match(/PRESSABLE_ROW = \[([\s\S]*?)\]\.join/);
      if (!rowsM) return false;
      /* r5 (Opus NIT-1): derive from the LAST compound of EVERY quoted entry, and
         fail on an entry that is not class-shaped — the first cut silently skipped
         attribute/element-qualified entries and only read a descendant's first class. */
      const entries = [...rowsM[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
      const classes = entries.map((sel) => {
        const last = sel.trim().split(/[\s>+~]+/).pop() || '';
        const cm = last.match(/^\.([a-z0-9_-]+)/i);
        return cm ? cm[1] : null;
      });
      return entries.length >= 8
        && classes.every((c) => c && rmBlock.includes('html:root .' + c));
    })(),
      '★ D-16 r4 (Opus finding 1): EVERY class in PRESSABLE_ROW appears in the base.css reduced-motion kill list — a family missing from it plays its literal 220ms close under reduced motion. Membership is DERIVED from the source array (last compound, fail-loud on non-class entries), so the next family cannot repeat the settings-dl miss');
    ok(/'\.c-settings__row:not\(\.c-settings__row--static\)'/.test(pjs),
      '★ D-16 r2 (audit B-6): STATIC settings rows are excluded from the press mechanism — the CSS already gates :hover/:active behind :not(--static), and a committed fill+fade on the version row reads as a broken action');
    ok(/'\.c-settings-dl__open',/.test(pjs),
      '★ D-16 r3 (Opus finding 2): the Downloads FILE row is in PRESSABLE_ROW — without it the screen has two press grammars the wrong way round: the destructive "Delete all" row responsive, every file row dead on iOS where bare :active is unreliable');
    ok(/html:root \[data-pressfade="hold"\]\[data-pressfade\]:not\(\.c-app-item\) \{\s*transition: none;\s*background-color: var\(--surface-action-tonal-default\)/.test(bcss),
      '★ D-16 (#351): HOLD = the fill colour as a FLAT background-color with transition: none. The DOUBLED attribute is load-bearing (audit B-1): three row families gate :hover behind :not() at (0,3,0), and at (0,2,1) the hover colour beat the fade on every mouse device — a hard pop and no fade at all');
    ok(/html:root \[data-pressfade="out"\]\[data-pressfade\]:not\(\.c-app-item\) \{\s*transition: background-color var\(--duration-200\) var\(--easing-standard, ease-out\);\s*background-color: transparent/.test(bcss),
      '★ D-16 (#351): OUT fades ONLY background-color at --duration-200 — listing background-size here re-animates the collapsed image and resurrects the reverse sweep');
    ok(/html:root \[data-pressfade="out"\]\[data-pressfade\]:hover:not\(\[aria-current\]\):not\(\[data-pinned\]\):not\(\.c-app-item\) \{\s*background-color: var\(--surface-interactive-hover\)/.test(bcss),
      '★ D-16 r2 (audit B-5, rebased by N56 loop C-1): under a stationary mouse the fade LANDS on the hover wash — and keeps its hands off PINNED rows, which land on their own wash (the #353 grammar, third state)');
    ok(/html:root \[data-pressfade="hold"\]\[data-pressfade\]\[aria-current\] \{\s*background-color: var\(--surface-action-tonal-pressed\)/.test(bcss)
      && /html:root \[data-pressfade="out"\]\[data-pressfade\]\[aria-current\] \{[\s\S]{0,180}?background-color: var\(--surface-action-tonal-default\)/.test(bcss),
      '★ D-16 (#351): a SELECTED row holds tonal-PRESSED and fades to tonal-DEFAULT — its own selected paint — so the fade lands seamlessly. Mid-fade re-target happens where aria-current is patched IN PLACE (wallet tx rows); a chat row is replaced by the re-render, the accepted A-3 cut');
    ok((() => {
      const gh1 = bcss.indexOf('html:root [data-pressfade="hold"][data-pressfade]:not(.c-app-item)');
      const ga1 = bcss.indexOf('html:root [data-pressfade="hold"][data-pressfade][aria-current]');
      const gh2 = bcss.indexOf('html:root [data-pressfade="out"][data-pressfade]:not(.c-app-item)');
      const ga2 = bcss.indexOf('html:root [data-pressfade="out"][data-pressfade][aria-current]');
      return gh1 >= 0 && ga1 >= 0 && gh2 >= 0 && ga2 >= 0 && gh1 < ga1 && gh2 < ga2;
    })(),
      '★ D-16 r3 (Opus finding 3): the [aria-current] fade variants are EQUAL specificity to the generic pair — :not(.c-app-item) contributes a class, so both sit at (0,4,1) — and they win on SOURCE ORDER alone. This pin freezes that order: move the variants above the pair and a selected row fades to TRANSPARENT, blanking the open conversation’s row for 200ms');
    ok(/html:root \.c-app-item\[data-pressfade="hold"\] \.c-app-item__open \{\s*transition: none/.test(bcss)
      && /html:root \.c-app-item\[data-pressfade="out"\] \.c-app-item__open \{\s*transition: background-color var\(--duration-200\)/.test(bcss)
      && !/\.c-app-item\[data-pressfade="hold"\],[\s\S]{0,80}?background-color: transparent/.test(bcss),
      '★ D-16 r2 (audit B-2): .c-app-item — the attribute rides the wrapper, ONLY the __open child paints the fade, and NO rule forces the wrapper transparent — the first cut deleted the GRID card’s own neutral-02 surface for the length of the fade (a card blink on every press)');
    ok(/\[data-pressed\], html:root \[data-pressfade\],/.test(bcss),
      '★ D-16 (#351): the reduced-motion block covers [data-pressfade] too — the CSS belt under the JS skip');
    const tok351 = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8');
    ok(/--duration-300: 300ms/.test(tok351) && /--duration-200: 200ms/.test(tok351)
      && /--duration-300: 0ms/.test(tok351) && /--duration-200: 0ms/.test(tok351),
      '★ D-16 r2 (audit C-2): the duration tokens EXIST and the reduced-motion block zeroes them — readMs falls back silently on a rename, which would keep normal timing but break the reduced-motion collapse');
    for (const [f, sel] of [['chatlist-item', '\\.c-chatlist-item'], ['txlist-item', '\\.c-txlist-item']]) {
      const css = readFileSync(join(root, 'src/styles/components/' + f + '.css'), 'utf8');
      /* ★ #353 (Damir, F5 video): a SELECTED row has NO hover tint. This SUPERSEDES
         fix B and the row half of fix C — the tonal-hover paint was the filled
         BUTTON surface in dark, and Damir cut the state rather than re-dial it. */
      const noLegit = css.replace(/:not\(\[aria-current\]\)/g, '');
      /* N56 rebase: the chatlist hover ALSO excludes pinned rows (the pinned wash
         must survive the cursor — the same #353 grammar extended); txlist has no
         pinned state and keeps the plain compound. */
      const hoverSel = f === 'chatlist-item'
        ? sel + ':hover:not\\(\\[aria-current\\]\\):not\\(\\[data-pinned\\]\\) \\{ background-color: var\\(--surface-interactive-hover\\); \\}'
        : sel + ':hover:not\\(\\[aria-current\\]\\) \\{ background-color: var\\(--surface-interactive-hover\\); \\}';
      ok(new RegExp(hoverSel).test(css)
        && !new RegExp(sel + '[^,{]*\\[aria-current\\][^,{]*:hover|' + sel + '[^,{]*:hover[^,{]*\\[aria-current\\]').test(noLegit),
        '★ #353 (Damir): ' + f + ' — NO hover rule paints a selected row (either compound order), and the plain hover carries :not([aria-current]). The :not() is LOAD-BEARING: without it the later grey hover rule beats the selected [aria-current] paint on source order at equal specificity, and the open conversation’s row hovers GREY');
      /* ★ #353 review NIT-1: this single declaration is now the SOLE selected-row
         paint in every state outside the fade window — deleting it left the open
         conversation’s row TRANSPARENT with the whole suite green. */
      ok(new RegExp(sel + '\\[aria-current\\] \\{[^}]*background-color: var\\(--surface-action-tonal-default\\)').test(css),
        '★ #353 (Opus NIT-1): ' + f + ' — the [aria-current] rest rule carries background-color tonal-default. #353 made it the ONLY selected paint; without this pin its deletion ships an invisible selection');
    }
  }

  /* —— ★ D-10 / I-7: the tip result channel, and the frozen-sheet hazard it creates —— */
  ok(/onTip: \(payload, ctrl\) => \{[\s\S]{0,900}?tipCtrl = ctrl;/.test(chB)
    && !/onTip: \(payload, ctrl\) => \{[\s\S]{0,400}?ctrl\.done\(\);/.test(chB),
    '★ D-10 (#348b): the tip sheet WAITS for C#. ctrl.done() used to fire the instant the verb was emitted, so a failed tip showed a green "Tipped" under an Insufficient Balance dialog — the UI claiming a payment happened when it had not');
  ok(/setTipResult\(status, body, msgId\)/.test(chB) && /c\.fail\(body \|\| sl\.tipFailed/.test(chB),
    '★ D-10 (#348b): the shell renders the FAILURE BODY inline through the sheet\'s own fail() path — the path that has existed since #74 and was never called');
  ok(/tipWait = setTimeout\(/.test(chB) && /tipNoAnswer/.test(chB),
    '★ D-10 (#348b): a backstop timer exists. While a tip is in flight the sheet disables light-dismiss and Esc (money-in-flight), so an answer that never arrives would strand the user in a frozen sheet — a WORSE failure than the bug being fixed');
  {
    /* ★ THE INVARIANT THIS BATCH LIVES OR DIES ON: every exit from the tip case must
       answer exactly once. A silent return leaves the sheet frozen. Slice the case and
       require a sendTipResult in front of each `return;`. */
    const tipStart = scpB.indexOf('case "tip":');
    const tipEnd = scpB.indexOf('case "sendContactRequest":', tipStart);
    const body = scpB.slice(tipStart, tipEnd).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const returns = [...body.matchAll(/\breturn;/g)];
    const answered = returns.every((m) => /sendTipResult\(/.test(body.slice(Math.max(0, m.index - 400), m.index)));
    ok(tipStart >= 0 && tipEnd > tipStart && returns.length >= 5 && answered,
      '★ D-10 (#348b): EVERY early return in the tip case calls sendTipResult first. Adding a silent return here strands the sheet frozen with dismissal disabled — this pin is the only thing standing between a future edit and that state');
    ok(/sendTipResult\(true, ""\)/.test(body),
      '★ D-10 (#348b): the SUCCESS path answers too — the sheet morphs and closes, and the native confirmation alert is gone rather than duplicated');
  }

  /* —— D-11: name the person, not the group —— */
  /* ★ audit: EVERY exit must answer, and a THROW is an exit. */
  /* ★ r2 M7: the first version only required A try near the case and A catch that
     answers — a fence narrowed to the guard block, leaving prepareTransactionFrom,
     addReaction, sendReaction and addTransaction OUTSIDE it, passed unchanged. Anchor on
     the money lines being INSIDE the fenced region. */
  ok((() => {
    const cs = scpNC.indexOf('case "tip":');
    if (cs < 0) return false;
    const tm = /\btry\b/.exec(scpNC.slice(cs));
    if (!tm) return false;
    const ts = cs + tm.index;
    const ce = scpNC.indexOf('catch (Exception tipEx)', ts);
    if (ce < ts) return false;
    const fenced = scpNC.slice(ts, ce);
    return /Node\.prepareTransactionFrom/.test(fenced)
        && /friend\.addReaction/.test(fenced)
        && /IxianHandler\.addTransaction/.test(fenced)
        && /sendTipResult\(true, ""\)/.test(fenced);
  })()
    && /catch \(Exception tipEx\)[\s\S]{0,300}?sendTipResult\(false,/.test(scpNC)
    && /catch \(Exception idEx\)[\s\S]{0,300}?sendTipResult\(false,/.test(scpNC),
    '★ D-10 (#348b, audit): the tip case is WRAPPED. The early returns each answered, but a throw did not — and the sheet disables light-dismiss and Esc while money is in flight, so an escaping exception stranded the user in a frozen sheet. It also stops a process crash: onNavigating dispatches this bare, so an unhandled exception out of a MAUI Navigating handler kills the app on Android and iOS');
  ok(/setTipResult", ok \? "1" : "0", body \?\? "", tipMsgIdHex/.test(scpB)
    && /tipMsgIdHex = msg_id_hex;/.test(scpB)          // ← r2: without this the id is always ""
    && /tipFor = rec\.id;/.test(chB)                    // ← r2: without this tipFor is always ''
    && /if \(msgId && tipFor && msgId !== tipFor\) return;/.test(chB),
    '★ D-10 (#348b, audit): the answer is CORRELATED with its message. Neither direction carried an id, so a late answer for tip A could resolve a sheet the user had since opened on message B — morphing B green on A\'s result and dropping B\'s real answer');
  /* ★ r2 M3 — THE WORST DEFEAT FOUND. The first version pinned the C# push and the
     shell's cap CHECK, but not the shell's setCaps HANDLER. Delete the handler and C#
     emits executeUiCommand(setCaps,…) against an undefined identifier, the cap never
     lands, bridge.cap('tipResult') is permanently false, and 100% of tips take the
     ctrl.done() fallback — the exact green-"Tipped"-over-a-failed-payment bug D-10
     exists to remove — with the whole suite green. */
  ok(/if \(!bridge\.cap\('tipResult'\)\)/.test(chB) && /setCaps", "tipResult"/.test(scpB)
    && /setCaps\(list\) \{[\s\S]{0,300}?bridge\.capabilities\[c\] = true;/.test(chB),
    '★ D-10 (#348b, audit): the wait is CAPABILITY-GATED. A new shell on an old exe would otherwise freeze 12 s after a SUCCESSFUL tip and then claim it may have failed; an old shell on a new exe would show no error at all. Both combinations were worse than the bug being fixed');
  ok(/showToast\(\{ text: \(sl\.tipConfirm[\s\S]{0,80}?\.replace\('\{a\}', amt\)/.test(chB)
    && /tipAmt = payload\.amount;/.test(chB),   // ← r2: without it the toast prints "Tip  IXI"
    '★ D-10 (#348b, audit): success RESTATES THE AMOUNT. Removing the native alert also removed the only place that said what was paid — the morph reads "Tipped" and the reaction pill carries a txid, not a value, so the figure had vanished from a money flow');

  /* —— D-9②: a crash must be able to announce itself —— */
  ok(/private async Task safeFatalAlert\(string title, string body\)/.test(hpB)
    && /catch \(Exception alertEx\)/.test(hpB),
    '★ D-9② (#348b): the fatal-error alert cannot take the process down. displaySpixiAlert hosts on Application.Current.MainPage and this runs while MainPage is still being assigned — on WinUI that throws, and the throw escaped as a BLACK SCREEN with no message');
  ok(/Logging\.error\("Node\.start\(\) returned false[\s\S]{0,200}?safeFatalAlert/.test(hpB),
    '★ D-9② (#348b): LOG FIRST, then attempt the alert. The log is the only channel guaranteed to work while the app is still starting');
  ok(!/await displaySpixiAlert\("Fatal/.test(hpB),
    '★ D-9② (#348b): no unguarded fatal alert remains in the start path');

  /* —— I-5: only the logotype keeps the accent —— */
  ok(/\.c-topbar\[data-variant="root"\] \.c-topbar__title\[data-logotype\] \{ color: var\(--text-action-default\); \}/.test(tbCss)
    && !/\.c-topbar\[data-variant="root"\] \.c-topbar__title \{[^}]*color: var\(--text-action-default\)/.test(tbCss),
    '★ I-5 (#348b): the accent ink is scoped to the LOGOTYPE, not to the root variant. Root is what every tab screen uses, so Apps, Wallet and Account all inherited a brand colour meant for the wordmark alone');
  ok(/titleEl\.dataset\.logotype = '';/.test(tbJs),
    '★ I-5 (#348b): the flag is set by the branch that BUILDS the logotype. CSS cannot select a parent by its child without :has(), and the WebView baseline is conservative CSS');
  ok(/\.screen--hero \.c-topbar\[data-variant="root"\] \.c-topbar__title \{ color: var\(--text-topbar\); \}/.test(tbCss),
    '★ I-5 (#348b): the HERO rule survives. The fix removes a colour rather than adding one, so a plain root title inherits --text-topbar — the same primitives as --text-neutral-01 outside the hero, and correctly --text-on-hero inside it. Hard-setting neutral-01 would have fixed four screens and broken the fifth');
}

console.log('I2 (#347) — desktop add-contact pane grammar');
{
  const cnSrc = readFileSync(join(root, 'src/shells/contact_new.html'), 'utf8');
  const cnBuilt = readFileSync(join(root, 'Spixi/Resources/Raw/html', 'contact_new.html'), 'utf8');
  ok(/\n\s*\.c-contacts-add > :not\(\.c-topbar\) \{[\s\S]{0,160}?max-width: 640px;[\s\S]{0,80}?margin-inline: auto;/.test(cnSrc),
    '★ I2 (#347) + W10/W11 (#348): the add-contact CONTENT locks at the 640px cap, centered');
  /* ★ review MINOR-8/9: UNGATED. The first cut swapped the UA sniff for a
     `@media (min-width: 700px)` test, which abandoned the cap in the 640-700 band — a
     small landscape phone, a resized desktop window, a detail column between 640 and 700
     — so the two add-screens still disagreed across the device range. app_new.html has
     always capped unconditionally; both now do, at the same value. A phone in portrait
     is ~393px and was never affected either way. */
  ok(!/@media[^\n]*\n?\s*\.c-contacts-add > :not\(\.c-topbar\)/.test(cnSrc)
    && /max-width: 640px; margin: 0 auto;/.test(readFileSync(join(root, 'src/shells/app_new.html'), 'utf8')),
    '★ W11 (#348): BOTH add-screens cap at 640, with no gate on either. A gate on one and not the other is the drift this pair keeps producing');
  /* ★ W10 (#348) — THE GATE, and it is the fix. Damir F5\'d this as still full width.
     The rule, the DOM and the ancestor chain were all verified correct against the BUILT
     artifact with a real CSS engine, and the live packaged copy on his machine carried
     the block — so the cap was never missing, it simply never matched. Its ONE
     precondition was `:root[data-desktop]`, a UA sniff, and this was the only one of the
     three add-screens that depended on it (Change password caps on `body[data-pane]`, a
     C# PUSH; app_new capped with no gate at all). It is now a WIDTH test — the same
     signal C# uses for its own pane breakpoint (HomePage.OnPageSizeChanged, `Width < 700`)
     — so it needs nothing from the UA. */
  ok(!/:root\[data-desktop\][^\n]*\.c-contacts-add/.test(cnSrc),
    '★ W10 (#348): the cap does NOT depend on the desktop UA sniff. Putting it back behind :root[data-desktop] restores the exact failure Damir reported');
  ok(/:not\(\.c-topbar\)/.test(cnSrc),
    '★ I2 (#347): the TITLE BAR is excluded, so it spans the whole pane while only the content below it is capped — #245b, the grammar every other sublevel follows');
  ok(/max-width: 640px/.test(cnBuilt),
    'I2 (#347): the rule reached the BUILT shell, not just the source');
}

console.log('#341 — Change password renders inside the Account pane');
{
  const spEnc = readFileSync(join(root, 'Spixi/Pages/Settings/SettingsPage.xaml.cs'), 'utf8');
  const shEnc = readFileSync(join(root, 'src/shells/settings.html'), 'utf8');

  ok(/setCaps",\s*"[^"]*\bencpassInline\b/.test(spEnc),
    '#341: SettingsPage declares encpassInline — an old exe never pushes it, so a new shell falls back to the pushed EncryptionPassword page instead of emitting a verb nobody dispatches');
  ok(/if \(paneMode && bridge\.cap\('encpassInline'\)\) \{ showEncpass\(\); return; \}[\s\S]{0,80}?bridge\.send\('ixian:encpass'\)/.test(shEnc),
    '#341: the inline route is gated on BOTH paneMode and the cap, and falls through to ixian:encpass — mobile keeps the pushed page, so the #340 closeSublevelOverlays sweep still has a page to sweep');
  ok(/case 'encpass': \{[\s\S]{0,3000}?bridge\.send\('ixian:changepass:' \+ ENC_DELIM \+ oldPass \+ ENC_DELIM \+ newPass\)/.test(shEnc),
    '#341: the sublevel composes the SAME frozen verb and the SAME delimiter as src/bridge/lock-page.js — one truth, no second password grammar');

  /* ★ The security pins. Both must FAIL if the guard is removed. */
  ok(/if \(currentView !== 'encpass'\) releaseEncpass\(\);/.test(shEnc),
    '★ #341 SECURITY: every render that is not the password sublevel releases it. This document is long-lived and PARKED on close (#315), unlike the standalone settings_encryption.html page which DIES on pop — so an unreleased screen keeps three plaintext passwords in live inputs for the life of the process');
  ok(/exiting = true;[\s\S]{0,600}?releaseEncpass\(\);/.test(shEnc),
    '★ #341 SECURITY: exitSettings scrubs too. `exiting` makes renderLayout bail, so the release above never runs on the rail-tab-switch / peer-nav / hardware-back routes — the exact routes a user takes to leave the form without touching its back button');
  ok(/if \(split_url\.Length == 3 && /.test(spEnc)
    && !/split_url\.Length >= 3/.test(spEnc),
    '★ #341: the C# split must be EXACTLY 3. The shell refuses a password containing the delimiter, but a longer split means one got through, and writing split_url[2] would re-encrypt the wallet with a TRUNCATED password the user can never reproduce — an unrecoverable wallet');
  ok(/Utils\.sendUiCommand\(this, "setEncPassResult", encResult\);/.test(spEnc),
    '#341: inline there is no page pop for the shell to read as success, so SettingsPage answers explicitly. The push carries a flag only, never password material');

  /* —— #341 AUDIT ROUND 1: the six defects the loop found ————————————————————— */
  const encPage = readFileSync(join(root, 'Spixi/Pages/Settings/EncryptionPassword.xaml.cs'), 'utf8');
  const encCss = readFileSync(join(root, 'src/styles/components/lock-shell.css'), 'utf8');
  const encComp = readFileSync(join(root, 'src/components/settings-shell.js'), 'utf8');

  /* Slice each file down to its OWN changepass branch first. An unanchored /try\s*\{/
   * happily matched the openLink branch two screens earlier, so the pin passed with the
   * fence deleted — a dead pin, caught by mutation-testing it. */
  const branchOf = (src, from, to) => src.slice(src.indexOf(from), src.indexOf(to));
  const spBranch = branchOf(spEnc, 'StartsWith("ixian:changepass:"', 'Equals("ixian:backup"');
  const epBranch = branchOf(encPage, 'StartsWith("ixian:changepass:"', 'protected override bool OnBackButtonPressed');
  const FENCED = /try\s*\{[\s\S]*?writeWallet\(split_url\[2\]\)[\s\S]*?catch \(Exception ex\)[\s\S]{0,400}?Logging\.error\([^;]*ex\);/;
  ok(!/displaySpixiAlert/.test(spBranch),
    '#341: no native alert on the inline route — the screen renders its own success morph and its own error, so an alert would be a second confirmation of the same event');
  ok(FENCED.test(spBranch) && FENCED.test(epBranch),
    '★ #341 audit MAJOR-1 (BOTH routes): the wallet write is fenced. An unguarded throw escapes onNavigating, e.Cancel never runs, and iOSWebViewHandler.cs:116 logs the WHOLE URL into ixian.log — which DevPage renders and offers through the OS share sheet. That is both passwords in cleartext in a shareable file');
  ok(!/Logging\.error\([^)]*current_url/.test(spEnc) && !/Logging\.error\([^)]*current_url/.test(encPage),
    '★ #341: neither catch logs the URL — only the exception object (the create-path shape in LaunchPage)');
  ok(/Preferences\.Default\.Set\("walletpass", split_url\[2\]\);/.test(spBranch)
    && /Preferences\.Default\.Set\("walletpass", split_url\[2\]\);/.test(epBranch),
    '★ #341 audit MAJOR-2 (BOTH routes, PRE-EXISTING data loss): the cached walletpass preference follows the wallet. Node.loadWallet reads it at every cold start (Node.cs:248-256), so without this the next launch cannot open the wallet and drops the user on the retry view; and BackupPage.xaml.cs:144 encrypts the backup archive with it, so a backup taken in between needs one password for the archive and another for the wallet inside it — unrestorable');
  ok(/split_url\.Length == 3 && split_url\[2\]\.Length >= 10/.test(spEnc),
    '#341 audit MINOR-3: C# refuses an empty or short new password on its own. The inline route removed the separate EncryptionPassword page, so the settings shell would otherwise be the ONLY validator of a wallet re-encryption');
  ok(/string encResult = "2";/.test(spEnc) && /encResult = "0";/.test(spEnc) && /encResult = "1";/.test(spEnc),
    '#341 audit MINOR-2: an unusable request answers "2", not "0". Reporting it as "wrong current password" would send the user into retries that can never succeed');

  ok(/case 'encpass': \{[\s\S]{0,700}?releaseEncpass\(\);[\s\S]{0,200}?createEncPassScreen\(/.test(shEnc),
    '★ #341 audit MAJOR-1 (shell): the case releases the PREVIOUS screen before it builds a new one. renderLayout skips the release while the user is ON this view but still rebuilds — a second tap on the live hub row, a window resize (setPaneMode), setLocale, onRepresented — and each one left the old FILLED form detached with its three plaintext values');
  ok(/releaseEncpass\(\);\s*\r?\n\s*exitSent = true;\s*\r?\n\s*exiting = true;\s*\r?\n\s*armExitHeal\(\);[^\n]*\r?\n\s*bridge\.send\('ixian:save:/.test(shEnc),
    '#341 audit MAJOR-2 (shell): commitSave\'s POP path scrubs before it latches `exiting` — after that renderLayout bails, so nothing could scrub later. #341 review MINOR-6 is honest about the reach: the shipped exe pushes settingsApply, so the live Save returns earlier and STAYS on the page, where the ordinary release still runs. This pin guards the old-exe fallback');

  /* —— #341 REVIEW ROUND 2: what the break-my-verdict pass found —————————————— */
  const extractSrc = readFileSync(join(root, 'scripts/extract-strings.mjs'), 'utf8');
  ok(/patternStyleLineArt: 'Line art',[\s\S]{0,120}?patternStyleMatrix:[\s\S]{0,120}?patternStyleFlow:/.test(extractSrc),
    '★ #341 review MINOR-4: PATTERN_STYLES is in the extractor DYNAMIC table. It is read as strings[o.key] exactly like PATTERN_LEVELS, so it is unextractable — and while it was missing, the FIRST extract run silently deleted every translation of the three style names from all seven locales. Both i18n gates were blind, because they compare locales against each other and a key dropped from all of them still looks consistent');
  ok(/strings\.encpassRejected \|\|/.test(shEnc) && !/strings\.badPassword \|\|/.test(shEnc),
    '★ #341 review MINOR-2: the "2" result uses its OWN key. Re-using badPassword collided with the component value for the same key, and extract-strings sets exitCode 1 on a fallback conflict — Damir\'s documented build chain would have stopped at step 1 and rebuilt nothing');
  ok(/if \(!c \|\| c\.seq !== encpassSeq\) \{[\s\S]{0,900}?String\(ok\) === '1'[\s\S]{0,300}?showToast\(/.test(shEnc),
    '#341 review MINOR-7: a SUCCESS whose form is already gone still tells the user. The inline route suppresses the native alerts, so leaving the screen while C# validates would change the wallet password with no confirmation on any surface');
  ok(/:root\[data-desktop\] body:not\(\[data-pane\]\) \.c-encpass__footer \{[\s\S]{0,200}?padding-inline: max\(/.test(encCss)
    && !/:root\[data-desktop\] \.c-encpass__footer \{[\s\S]{0,260}?padding-inline: max\(/.test(encCss),
    '#341 review MINOR-5: the FOOTER carries the same rail as the body, so it needed the same scoping. Fixing only the body left the CTA row with a content box of about 152px on a 1128px detail region');
  ok(/writeWallet\(split_url\[2\]\);[\s\S]*?isValidPassword\(split_url\[2\]\)[\s\S]*?Preferences\.Default\.Set\("walletpass"/.test(spBranch)
    && /writeWallet\(split_url\[2\]\);[\s\S]*?isValidPassword\(split_url\[2\]\)[\s\S]*?Preferences\.Default\.Set\("walletpass"/.test(epBranch),
    '★ #341 review MAJOR-1: the write is CONFIRMED before the cached password follows it. writeWallet is called as a statement everywhere in this repo, so a failure reported by RETURN VALUE would pass the try/catch unseen — and with the preference already moved, the next cold start could not open the wallet. Asking the storage whether the NEW password opens it needs no knowledge of the return type (Ixian-Core is outside this repo)');
  ok(/const ENC_MIN = (\d+);/.exec(readFileSync(join(root, 'src/components/lock-shell.js'), 'utf8'))[1] === '10'
    && /split_url\[2\]\.Length >= 10/.test(spEnc) && /split_url\[2\]\.Length >= 10/.test(encPage),
    '#341 review NIT-10: the C# minimum and the JS ENC_MIN are the same number. They are two hand-copied literals in different languages, so this pin is the only thing that ties them together — lower ENC_MIN alone and the shell would accept a password C# answers "2" to');
  ok(/function releaseEncpass\(\) \{[\s\S]{0,900}?clearTimeout\(encpassGuard\)[\s\S]{0,600}?encpassSeq \+= 1;/.test(shEnc),
    '#341 audit MINOR-1/2: release drops the 8 s watchdog and invalidates the in-flight submit. Left running, the watchdog called focus() on a detached input; left valid, the FIRST answer could resolve a SECOND form with a false "Password changed"');
  ok(/if \(!c \|\| c\.seq !== encpassSeq\) \{/.test(shEnc),
    '#341 audit MINOR-2: setEncPassResult drops an answer that belongs to a submit the user already walked away from');
  ok(/onBack: \(\) => \{ if \(currentView === 'encpass'\) showHub\(\); \}/.test(shEnc),
    '#341 audit MINOR-3: the component calls onBack 900 ms after the success morph. Unguarded, that closed whatever sublevel the user opened in the meantime');
  ok(/:root\[data-desktop\] body:not\(\[data-pane\]\) \.c-encpass__body \{[\s\S]{0,200}?padding-inline: max\(/.test(encCss)
    && !/:root\[data-desktop\] \.c-encpass__body \{[\s\S]{0,120}?padding-inline: max\(/.test(encCss),
    '#341 audit MINOR-5: the centring rail is scoped to the STANDALONE page. In the pane the detail region already caps this element, and border-box made the second rail eat the capped width — the fields measured ~380px on a 900px region and got NARROWER as the window widened');
  /* —— C7 (#342): the desktop share button ————————————————————————————————————
   * Damir F5: "on desktop the share button beside the address does nothing." The cause
   * was the ladder's SHAPE. `navigator.share` EXISTS in WinUI WebView2 and REJECTS when
   * it cannot present a system sheet; the old code swallowed every rejection with
   * `.catch(() => {})` and RETURNED, so the clipboard fallback under it was unreachable
   * on the one engine that needs it. The correct ladder already existed in home.html
   * (shareReceivePayload, the A10 fix). One difference is deliberate: home falls through
   * to `ixian:share`, and SettingsPage dispatches no such verb, so clipboard is terminal. */
  ok(!/navigator\.share\(\{ text: addr \}\)\.catch\(\(\) => \{\}\)/.test(shEnc),
    '★ C7 (#342): the swallow-everything catch is GONE. `.catch(() => {})` followed by `return` is what made the button a silent no-op on desktop');
  /* Anchored INSIDE the catch: the terminal fallback call sits a few lines below it,
   * so an unbounded window matched that one instead and the pin passed with the catch
   * gutted. The negated group stops at the catch's own closing `});`. */
  ok(/navigator\.share\(\{ text: addr \}\)\.catch\(\(e\) => \{(?:(?!\}\);)[\s\S])*window\.chrome && window\.chrome\.webview(?:(?!\}\);)[\s\S])*copyAddressFallback\(addr\);/.test(shEnc),
    '★ C7 (#342): a rejection now falls through to the clipboard, and WebView2 is detected so its rejection is never mistaken for a user cancel');
  ok(/AbortError' && !isWebView2\) return;/.test(shEnc),
    'C7 (#342): a WebKit AbortError on a non-WebView2 engine means the sheet appeared and the user dismissed it — staying silent there is correct, and it is why the engine test is needed');
  ok(/copyAddressFallback\(addr\);\s*\r?\n\s*\}\s*$/m.test(shEnc) || /\}\s*\r?\n\s*copyAddressFallback\(addr\);\s*\r?\n\s*\}/.test(shEnc),
    'C7 (#342): the no-navigator.share engine (Android WebView) still reaches the same fallback');

  /* #342 review MINOR-1: the behavioural avatar pins run wholly inside the components,
   * so reverting the SHELL call site left them all green. This reads the shell. */
  const chatEnc = readFileSync(join(root, 'src/shells/chat.html'), 'utf8');
  ok(/avatar: rec\.avatar\s*\r?\n\s*\|\| \(mode\.isMulti \? \(groupRoster\.get\(rec\.senderAddress\) \|\| \{\}\)\.avatar : identity\.avatar\)/.test(chatEnc),
    '★ #342 review MAJOR-1: the tip recipient photo NEVER falls back to identity.avatar in a group. identity.avatar is the GROUP photo there (SingleChatPage pushes getAvatarPath(friend)), and file/app/payment rows carry no avatar at all — so the unguarded fallback put the group face beside an individual member name, on the surface where the user checks who is about to be paid. A gradient is neutral; the wrong face is not');
  /* ★ #346 (review of #342): the NAME ladder one line above the avatar ladder had the
     very fallback the avatar ladder was written to remove. */
  ok(/name: \(senderHasNick\(rec\) \? rec\.senderNick : ''\)\s*\r?\n\s*\|\| \(mode\.isMulti\s*\r?\n\s*\? \(\(n\) => \(n && !isPseudoAddressNick\(n\)\) \? n : ''\)\(\(\(groupRoster\.get\(rec\.senderAddress\) \|\| \{\}\)\.name \|\| ''\)\)\s*\r?\n\s*: identity\.name\)/.test(chatEnc)
    && !/name: rec\.senderNick \|\| identity\.name/.test(chatEnc),
    '★ #346 (+#370 loop B-6): the tip recipient NAME follows the same ladder as the photo, and its first rung is now senderHasNick-guarded — the C# address-echo printed a FULL base58 as the payee name on the money surface. identity.name stays 1:1-only (it is the GROUP name in a group)');

  ok(/glyph: 'pencil', hue: 'primary', key: 'encpass',/.test(encComp),
    '#341 audit MINOR-4: the hub row carries a key, so the pane marks it aria-current with the tonal tint while its sublevel is open — it was the only sublevel opener that announced nothing');

  /* ★ #346 (review of #341/#342) — the plaintext wallet password survived "delete
     wallet". Verified by grep at the time: every WRITE and every READ of this
     preference uses "walletpass"; onDeleteWallet removed "waletpass", one 'l', a key
     that has never existed. The value is plaintext (two "TODO: encrypt the password"
     markers in the tree), so it stayed in Android SharedPreferences / iOS
     NSUserDefaults — which unencrypted device backups include — after the one action
     whose whole meaning is "destroy the wallet". */
  ok(/Preferences\.Default\.Remove\("walletpass"\)/.test(spEnc)
    && !/Preferences\.Default\.Remove\("waletpass"\)/.test(spEnc),
    '★ #346: onDeleteWallet removes "walletpass" — the key that is actually written. The typo made the delete a no-op and left the plaintext wallet password on disk');

  // The behavioural half of this batch — release() must actually scrub — lives in
  // the settings-demo block above, where a jsdom window with the bundle is already
  // open. A static pin cannot prove a scrub.
}

/* —— Desktop PANE CONTENT RAIL (Damir 2026-08-12, Windows screenshots) ————————
 * The Change-wallet-password form and the App-details page both render in a
 * desktop pane (W7: encpass now covers the whole Account pane · HomePage:2849/2857), so they
 * rendered edge-to-edge at ~900–1200px while the Account sublevels ("How to use
 * Spixi") have held a 640px rail since #243. Both now hold the SAME rail via
 * --layout-pane-content-max; only the app-details cover stays full-bleed, and
 * the encpass CTA moved out of the bottom-pinned bar into flow under the
 * inputs. Mobile is byte-identical (verified: before/after phone screenshots
 * are pixel-equal) — the rail rides the #228 platform flag. */
console.log('desktop pane content rail (#3xx)');
{
  const tokRail = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8');
  ok(/--layout-pane-content-max:\s*640px/.test(tokRail),
    'rail: --layout-pane-content-max is a real token (640px = the Account-sublevel measurement), not a fourth copy of the literal');

  const encCss = readFileSync(join(root, 'src/styles/components/lock-shell.css'), 'utf8');
  ok(/:root\[data-desktop\] body:not\(\[data-pane\]\) \.c-encpass__body \{[^}]*var\(--layout-pane-content-max\)/s.test(encCss),
    'encpass: the STANDALONE desktop page still holds the shared pane rail. #341 gave this screen a second host — inside the Account pane the detail region already caps it at the same token, so the rule is scoped away there to stop border-box applying the rail twice');
  ok(/:root\[data-desktop\] \.c-encpass__body \{[^}]*flex: 0 1 auto/s.test(encCss),
    'encpass: the body HUGS its content on desktop — that is what lifts the CTA up under the inputs');
  ok(/:root\[data-desktop\] \.c-encpass__footer \{[^}]*border-top: 0/s.test(encCss),
    'encpass: the un-pinned desktop footer drops the bar edge (it is in flow, not a bottom bar)');
  ok(/\.c-encpass__body \{[^}]*flex: 1;[^}]*min-height: 0/s.test(encCss)
    && /\.c-encpass__footer \{[^}]*flex: none/s.test(encCss),
    'encpass: the MOBILE recipe (body flex:1 + bottom-pinned footer) is untouched — pinned is right on a phone');
  ok(!/@media[^{]*min-width:\s*(6|7|8|9|1\d)\d\d/.test(encCss),
    'encpass rail rides :root[data-desktop], never a viewport width query (#228)');

  const adCss = readFileSync(join(root, 'src/styles/components/apps-details.css'), 'utf8');
  ok(/--app-details-rail-gutter:\s*max\(0px, calc\(\(100% - var\(--layout-pane-content-max\)\) \/ 2\)\)/.test(adCss),
    'app details: the rail is a symmetric MARGIN gutter (a % padding on the column resolves against a different box than the cover’s bleed-back margin — that mismatch left the cover 672px wide in a 900px pane)');
  ok(/:root\[data-desktop\] \.c-app-details > \* \{ margin-inline: var\(--app-details-rail-gutter\); \}/.test(adCss),
    'app details: every child holds the rail');
  ok(/:root\[data-desktop\] \.c-app-details > \.c-app-hero \{ margin-inline: calc\(-1 \* var\(--spacing-16\)\); \}/.test(adCss),
    'app details: ONLY the cover breaks out of the rail (Damir: "only the cover is full width")');
  ok(/\.c-app-details > \.c-app-shots,\s*\S[^{]*\.c-app-related,\s*\S[^{]*\.c-app-details__actions \{\s*margin-inline: calc\(var\(--app-details-rail-gutter\) - var\(--spacing-16\)\)/.test(adCss),
    'app details: the edge-bleeders (scroll strips + sticky Install bar) bleed past the RAIL, not to the window edge');
  ok(!/100vw/.test(adCss),
    'app details: no vw in the bleed — 100vw counts the scrollbar and would hand the pane a horizontal overflow');
  ok(!/@media[^{]*min-width:\s*(6|7|8|9|1\d)\d\d/.test(adCss),
    'app-details rail rides :root[data-desktop], never a viewport width query (#228)');
}

/* —— multi-message selection: selection TOPBAR + bulk delete (Damir tonight) ——
 * Extends #139 (which shipped selection for copy + split-paste only, and only in
 * the demo). The load-bearing claims: the bar mounts OVER the chat topbar as the
 * native contextual bar; Delete only exists when the caller can perform one;
 * selection is keyed by MESSAGE ID so the shell's full-log re-render can re-apply
 * it; and bulk delete is a LOOP over the existing single-message bridge verb —
 * no new command was invented on the C# side. */
console.log('multi-message selection (selection topbar + bulk delete)');
{
  const dom = await load('chat.html');
  const W = dom.window, D = W.document;
  const host = D.createElement('div');          // stands in for the chat topbar slot
  const list = D.createElement('div');
  D.body.append(host, list);
  const mk = (id, sender, text) => {
    const r = D.createElement('div');
    r.className = 'c-bubble-row';
    r.dataset.msgid = id;
    if (sender) r.dataset.sender = sender;
    if (text) r.dataset.copytext = text;
    list.append(r);
    return r;
  };
  const rowA = mk('m1', 'Alex', 'one');
  const rowB = mk('m2', 'Han', 'two');
  const rowC = mk('m3', 'Han', 'three');
  let handed = null;
  const sel = W.Spixi.enterChatSelect(list, {
    initialRow: rowA, host,
    selectable: () => true,                     // cards are selectable too (delete generalises, copy filters)
    onDelete: (items) => { handed = items; },
  });
  const bar = host.querySelector('.c-chatselect-bar');
  ok(!!bar && bar.getAttribute('role') === 'toolbar' && host.classList.contains('c-chatselect-host'),
    'the selection bar mounts INTO the topbar slot and makes it the positioning context');
  const countEl = bar.querySelector('.c-chatselect-bar__count');
  ok(countEl.getAttribute('aria-live') === 'polite' && countEl.textContent.includes('1'),
    'the count is a live region — a screen reader hears the selection grow');
  ok(rowA.getAttribute('role') === 'checkbox' && rowA.getAttribute('aria-checked') === 'true'
    && rowC.getAttribute('aria-checked') === 'false' && rowA.tabIndex === 0,
    'rows become keyboard-operable checkboxes with an honest checked state');
  rowB.click(); rowC.click();
  ok(countEl.textContent.includes('3'), 'tapping further rows toggles them into the selection');
  rowB.dispatchEvent(new W.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  ok(countEl.textContent.includes('2'), 'Space toggles the focused row — the log is operable without a pointer');
  rowB.dispatchEvent(new W.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  /* ★ the chat shell replaces EVERY row node on a status tick / new message.
     A node-keyed selection would empty itself mid-gesture; this is id-keyed. */
  const fresh = [...list.children].map((r) => {
    const n = r.cloneNode(true);
    delete n.dataset.selected; n.removeAttribute('aria-checked');
    return n;
  });
  list.replaceChildren(...fresh);
  sel.refresh();
  ok(fresh.filter((r) => r.dataset.selected !== undefined).length === 3 && countEl.textContent.includes('3'),
    '★ the selection survives a full-log re-render (keyed by message id, re-painted by refresh)');
  fresh[2].remove();
  sel.refresh();
  ok(countEl.textContent.includes('2'), 'refresh prunes ids whose rows are gone (a landed delete shrinks the count)');
  const barBtns = [...bar.querySelectorAll('.c-button')];
  ok(barBtns.length === 2 && !!barBtns[1].getAttribute('aria-label')
    && barBtns[1].dataset.intent === 'destructive' && barBtns[0].dataset.intent === 'default',
    'the bar carries Copy + a destructive Delete — icon-only, both labelled for screen readers');
  barBtns[1].click();
  ok(handed && handed.length === 2 && handed[0].id === 'm1' && list.dataset.selecting !== undefined,
    'Delete hands the caller the selected ids and does NOT exit — the confirm can still be cancelled');
  D.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok(list.dataset.selecting === undefined && !host.querySelector('.c-chatselect-bar')
    && fresh[0].getAttribute('role') === null && fresh[0].dataset.selected === undefined,
    'Escape exits selection and hands the rows back clean (role/tabindex/checked/selected cleared)');
  ok(!host.classList.contains('c-chatselect-host'), 'the topbar slot loses the positioning class on exit');

  /* ★ W9-④ — DESKTOP DRAG-TO-EXTEND (Damir, Windows F5 2026-08-13: "I would like
     auto select on windows if i clicke and drag a whole message or multiple").
     Deliberately narrow: only INSIDE selection mode, only for a MOUSE. A drag that
     starts outside selection mode must keep selecting TEXT — that is the primary
     desktop reading gesture, and Damir's "drag a whole message" when he only wants
     the words. Touch/pen drags in the log are SCROLLS. */
  const dhost = D.createElement('div');
  const dlist = D.createElement('div');
  D.body.append(dhost, dlist);
  const dmk = (id, text) => {
    const r = D.createElement('div');
    r.className = 'c-bubble-row';
    r.dataset.msgid = id; r.dataset.copytext = text;
    dlist.append(r); return r;
  };
  const d1 = dmk('d1', 'one'), d2r = dmk('d2', 'two'), d3 = dmk('d3', 'three'), d4 = dmk('d4', 'four');
  const dsel = W.Spixi.enterChatSelect(dlist, { initialRow: d1, host: dhost, selectable: () => true });
  const dcount = dhost.querySelector('.c-chatselect-bar__count');
  const pd = (row, type, opts = {}) => {
    const e = new W.Event(type, { bubbles: true, cancelable: true });
    Object.assign(e, { pointerType: 'mouse', button: 0 }, opts);
    row.dispatchEvent(e);
    return e;
  };
  // press on an UNSELECTED row and range down: the anchor's new state fills the range
  pd(d2r, 'pointerdown');
  const moved = pd(d4, 'pointermove');
  ok(d2r.dataset.selected !== undefined && d3.dataset.selected !== undefined && d4.dataset.selected !== undefined
    && dcount.textContent.includes('4'),
    '★ W9-④: pressing on a message and dragging across others selects the whole RANGE (anchor→pointer), the sheet-fill convention');
  ok(moved.defaultPrevented && dlist.dataset.dragselect !== undefined,
    'W9-④: the live drag suppresses native text selection (preventDefault + [data-dragselect], which the CSS reads) — a text highlight smeared across every bubble would fight the range');
  ok(d1.dataset.selected !== undefined,
    'W9-④: rows OUTSIDE the range keep their state — a drag never silently clears a selection made somewhere else');
  // shrink the range back: re-crossing repaints from the baseline, not by accumulating toggles
  pd(d3, 'pointermove');
  ok(d4.dataset.selected === undefined && d3.dataset.selected !== undefined && dcount.textContent.includes('3'),
    'W9-④: dragging back UP shrinks the range (repainted from the pre-drag baseline, so a re-crossed row does not flip twice)');
  D.dispatchEvent(new W.Event('pointerup', { bubbles: true }));
  ok(dlist.dataset.dragselect === undefined, 'W9-④: the text-selection suppression is released with the pointer');
  // the click that follows a drag must not undo the anchor
  d3.click();
  ok(d3.dataset.selected !== undefined && dcount.textContent.includes('3'),
    'W9-④: the trailing click is swallowed — a drag that ends on a row must not immediately re-toggle it');
  // a press that never moves is still a plain tap
  pd(d3, 'pointerdown');
  D.dispatchEvent(new W.Event('pointerup', { bubbles: true }));
  d3.click();
  ok(d3.dataset.selected === undefined && dcount.textContent.includes('2'),
    'W9-④: a press with no movement stays a TAP — the long-press/tap grammar is untouched');
  // touch must not range (it would wedge the scroll)
  pd(d1, 'pointerdown', { pointerType: 'touch' });
  const tmove = pd(d4, 'pointermove', { pointerType: 'touch' });
  ok(!tmove.defaultPrevented && d4.dataset.selected === undefined,
    '★ W9-④: a TOUCH drag ranges nothing and is never preventDefault-ed — in the log that gesture is a scroll, and stealing it would wedge the conversation');
  D.dispatchEvent(new W.Event('pointerup', { bubbles: true }));
  dsel.exit();
  ok(dlist.dataset.dragselect === undefined && dlist.dataset.selecting === undefined,
    'W9-④: exiting selection mode tears the drag listeners and flags down with everything else');
  dhost.remove(); dlist.remove();
  // no Delete button at all when the caller offers no delete (the #139 copy-only shape)
  const host2 = D.createElement('div');
  D.body.append(host2);
  W.Spixi.enterChatSelect(list, { initialRow: fresh[0], host: host2, selectable: () => true });
  ok(host2.querySelectorAll('.c-chatselect-bar .c-button').length === 1,
    'no onDelete → no Delete button (a dead control is worse than a missing one)');

  const menuSrc = readFileSync(join(root, 'src/components/message-menu.js'), 'utf8');
  ok(/const selecting = \(\) => !!\(row\.closest/.test(menuSrc)
    && (menuSrc.match(/if \(selecting\(\)\) return;/g) || []).length === 2,
    'long-press AND right-click stand down while a selection runs — both gesture paths, or one opens a menu over the bar');

  const selCss = readFileSync(join(root, 'src/styles/components/chat-select.css'), 'utf8');
  ok(/\[data-selecting\] \.c-bubble-row\[role="checkbox"\]::before/.test(selCss)
    && /\[data-selecting\] \.c-bubble-row\[data-selected\]::after/.test(selCss),
    'the check circle is CSS-only (pseudo-elements) — it re-applies for free on every re-rendered row');
  ok(/z-index: var\(--z-30\)/.test(selCss) && /background: var\(--surface-topbar\)/.test(selCss),
    'the bar reads as the topbar it replaces: topbar surface, above the topbar’s --z-20');
  ok(!/:\s*#[0-9a-fA-F]{3,8}\b/.test(selCss) && !/rgba?\(/.test(selCss),
    'semantic tokens only — no raw hex/rgb VALUES in the selection styles');

  const chatShell = readFileSync(join(root, 'src/shells/chat.html'), 'utf8');
  ok(/multi-select: offered on every menu-able row/.test(chatShell) && /chat-select\.css/.test(chatShell),
    'the production chat shell offers Select in the message menu and ships the stylesheet');
  ok(/function sendDeleteMessage\(id\)/.test(chatShell)
    && (chatShell.match(/bridge\.send\('ixian:contextAction:deleteMessage:/g) || []).length === 1,
    '★ ONE delete path: bulk delete loops the EXISTING single-message verb — no new bridge command was invented');
  ok(/const keepSelectBar = topbarHost\.querySelector\('\.c-chatselect-bar'\)/.test(chatShell),
    'a topbar rebuild (presence tick, typing) re-attaches the selection bar instead of silently dropping it');
  ok(/if \(chatSelect\) chatSelect\.refresh\(\);/.test(chatShell),
    'renderLogNow re-applies the selection after it replaces every row node');
  ok(/exitChatSelect\(\);\s+\/\/ per-peer reset/.test(chatShell),
    'a chat switch exits selection — the contextual bar never survives into another conversation');
  ok(/deleteSelectedMany \|\| 'Delete \{n\} messages\?'/.test(chatShell)
    && /role: 'alertdialog'/.test(chatShell),
    'bulk delete confirms in the house alertdialog and NAMES the count (Damir’s ask)');
  ok(/const ids = items\.map\(\(it\) => it\.id\)\.filter\(Boolean\);\s+exitChatSelect\(\);/.test(chatShell),
    'the ids are snapshotted BEFORE the exit — each verb echoes a re-render that would move the rows underneath');
}

/* —— multi-message selection round 2 (Damir 2026-08-12) ——————————————————————
 * The #139 machinery already shipped (selection bar, id-keyed selection, bulk
 * delete as a LOOP over the single-message verb). This round covers the ENTRY
 * gestures Damir asked for ("long press to select"), the counted confirm
 * sentence, and the composer sheet's title. Driven END-TO-END on the demo chat
 * (the only page the harness can actually run) + source guards on the shell. */
console.log('multi-select entry gestures · counted confirm · attach sheet title');
{
  const dom = await load('chat.html');
  const W = dom.window, D = W.document;
  const phone = D.getElementById('phone-direct');
  const box = D.getElementById('messages-direct');
  const topbarSlot = D.getElementById('topbar-direct');
  const rows = [...box.querySelectorAll('.c-bubble-row')].filter((r) => r.querySelector('.c-bubble__text'));
  const cmdClick = (row) => row.dispatchEvent(new W.MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true }));

  cmdClick(rows[0]);
  const bar = topbarSlot.querySelector('.c-chatselect-bar');
  const countEl = bar && bar.querySelector('.c-chatselect-bar__count');
  ok(!!bar && box.dataset.selecting !== undefined && countEl.textContent.includes('1'),
    '★ ⌘/Ctrl-click a message ENTERS selection mode with that message picked (the desktop entry — long-press is the touch one)');
  ok(!!topbarSlot.querySelector('.c-topbar') && bar.compareDocumentPosition(topbarSlot.querySelector('.c-topbar')) !== 0,
    'the chat topbar is still mounted underneath — the selection bar COVERS it, it does not destroy it');
  rows[1].click(); rows[2].click();
  ok(countEl.textContent.includes('3') && rows[1].getAttribute('aria-checked') === 'true',
    'plain taps on further messages toggle them in — count reaches 3');
  rows[2].click();
  ok(countEl.textContent.includes('2') && rows[2].getAttribute('aria-checked') === 'false',
    'tapping a SELECTED message deselects it');
  rows[1].click(); rows[0].click();
  ok(box.dataset.selecting === undefined && !topbarSlot.querySelector('.c-chatselect-bar'),
    'deselecting the LAST message exits selection mode by itself (WhatsApp/Telegram grammar)');
  ok(!!topbarSlot.querySelector('.c-topbar') && rows[0].getAttribute('role') === null,
    'exiting restores the normal chat topbar and hands the rows back clean');

  // counted confirm → one removal per selected message
  cmdClick(rows[0]); rows[1].click(); rows[2].click();
  const bar2 = topbarSlot.querySelector('.c-chatselect-bar');
  const texts = rows.slice(0, 3).map((r) => r.querySelector('.c-bubble__text').textContent);
  [...bar2.querySelectorAll('.c-button')].pop().click();          // Delete
  await sleep(30);
  const dlg = D.querySelector('.c-modal[role="alertdialog"]');
  ok(!!dlg && /Delete 3 messages\?/.test(dlg.querySelector('.c-modal__title').textContent),
    '★ bulk delete asks with the COUNT IN THE SENTENCE — "Delete 3 messages?" (Damir’s ask)');
  ok(box.dataset.selecting !== undefined,
    'the confirm does not pre-emptively exit selection — Cancel must be able to leave everything as it was');
  [...dlg.querySelectorAll('.c-button')].pop().click();           // confirm Delete
  await sleep(50);
  ok(!box.contains(rows[0]) && !box.contains(rows[1]) && !box.contains(rows[2]),
    '★ confirming removes EVERY selected message — one delete per selected id, not one for the batch');
  ok(box.dataset.selecting === undefined && !topbarSlot.querySelector('.c-chatselect-bar')
    && !!topbarSlot.querySelector('.c-topbar'),
    'the delete exits selection and the normal topbar comes back');

  // copy joins "Sender: text" lines, in log order
  const rest = [...box.querySelectorAll('.c-bubble-row')].filter((r) => r.querySelector('.c-bubble__text'));
  cmdClick(rest[0]); rest[1].click();
  const bar3 = topbarSlot.querySelector('.c-chatselect-bar');
  [...bar3.querySelectorAll('.c-button')][0].click();             // Copy
  const buf = W.Spixi.getChatCopyBuffer();
  ok(buf && buf.items.length === 2 && buf.joined.split('\n').length === 2
    && buf.joined.split('\n').every((l) => /^[^:]+: /.test(l)),
    'copy joins the selection as "Sender: text" lines, one per message, in log order');
  ok(texts.length === 3 && !buf.joined.includes(texts[0]),
    'a deleted message can no longer land in the copy buffer (the selection was pruned with the rows)');

  /* composer ⊕ sheet: Damir — "it's titled Share, that's incorrect". Title
     dropped; the sheet keeps an ACCESSIBLE name so the dialog is still named. */
  const attach = W.Spixi.openAttachSheet({ host: phone, strings: W.SL || {} });
  await sleep(20);
  ok(!attach.querySelector('.c-sheet__title') && !/Share/.test(attach.textContent),
    '★ the attach sheet has NO "Share" title any more — the six labelled tiles are the affordance');
  ok(attach.getAttribute('aria-label') === 'Add to chat' && !attach.hasAttribute('aria-labelledby'),
    'the title-less sheet still carries an accessible name ("Add to chat" — attachTitle, translated in all 8 locales)');
  W.Spixi.closeSheet(attach);

  const chatShell2 = readFileSync(join(root, 'src/shells/chat.html'), 'utf8');
  ok(/if \(!\(e\.metaKey \|\| e\.ctrlKey\)\) return;/.test(chatShell2)
    && /startChatSelect\(row\);/.test(chatShell2),
    'the production shell carries the same ⌘/Ctrl-click entry (Shift is left alone — it extends a text selection)');
  ok(/e\.key !== 'ContextMenu' && !\(e\.shiftKey && e\.key === 'F10'\)/.test(chatShell2)
    && /openMessageMenu\(\{ row, \.\.\.menuOptsFor\(rec, row\) \}\)/.test(chatShell2),
    'keyboard users get IN via Shift+F10 / the Menu key (the menu carries Select); Esc is the way out');
  ok(/if \(chatSelect\) \{ exitChatSelect\(\); return; \}/.test(chatShell2),
    '★ back (edge-swipe) exits SELECTION first — it never leaves the conversation while the contextual bar is up');
  ok(/selectable: \(r\) => isMenuableRec\(model\.get\(r\.dataset\.msgid \|\| ''\)\)/.test(chatShell2)
    && /function isMenuableRec\(rec\)/.test(chatShell2),
    'ONE predicate decides menuable AND selectable — call logs, event chips, dividers and separators are neither');
  ok(/for \(const id of ids\) sendDeleteMessage\(id\);/.test(chatShell2),
    'the shell issues the existing single-message verb once per selected id (no invented bulk command)');
  const attachSrc = readFileSync(join(root, 'src/components/attach-sheet.js'), 'utf8');
  ok(!/title: strings\.attachTitle/.test(attachSrc) && /sheet: strings\.attachTitle/.test(attachSrc),
    'attach-sheet passes attachTitle as the sheet’s ARIA name, not as a visible heading');
  const selCss2 = readFileSync(join(root, 'src/styles/components/chat-select.css'), 'utf8');
  /* F5 shot fix: the EMPTY circle is the affordance and it sits on the patterned
     chat canvas — an outline token (neutral-700 in dark) vanished there. */
  ok(/\[role="checkbox"\]::before \{[^}]*box-shadow: inset 0 0 0 var\(--outline-width-2\) var\(--icon-neutral-02\)/.test(selCss2),
    'the UNSELECTED check circle rides the muted-ICON ink, so it stays legible on the dark chat canvas too');
  /* the AT-RULE, not the word: the file explains in a comment WHY it carries no
     per-component query, and a bare-word test failed on its own rationale. */
  ok(!/@media[^{]*prefers-reduced-motion/.test(selCss2) && /transition: background-color var\(--duration-100\)/.test(selCss2),
    'reduced motion rides the global duration-token zeroing (tokens.css) — no per-component media query');

  /* plurals across the 8 locales: this dictionary is flat (verify-locales enforces
     key + placeholder parity), so the convention is a one/many key pair whose MANY
     form is count-agnostic wherever the plural rules split above 1 (ru/sl/sr). */
  const enDict = JSON.parse(readFileSync(join(root, 'src/strings/en-us.json'), 'utf8'));
  ok(enDict.deleteSelectedMany === 'Delete {n} messages?' && enDict.attachTitle === 'Add to chat',
    'en-us carries the counted confirm + the renamed attach label');
  for (const code of ['de-de', 'es-co', 'fr-fr', 'pt-br', 'ru-ru', 'sl-si', 'sr-sp',
    'it-it', 'id-id', 'lt-lt', 'cn-cn', 'ja-jp']) {   // N4 (#379)
    const loc = JSON.parse(readFileSync(join(root, 'src/strings', code + '.json'), 'utf8'));
    ok(loc.deleteSelectedMany.includes('{n}') && loc.deleteSelectedMany !== enDict.deleteSelectedMany
      && loc.selectedCount.includes('{n}') && loc.attachTitle !== enDict.attachTitle,
      code + ': the counted confirm, the "{n} selected" bar label and the attach label are really translated');
  }
  for (const code of ['ru-ru', 'sl-si', 'sr-sp', 'lt-lt']) {   // N4 (#379): Lithuanian splits above 1 too
    const loc = JSON.parse(readFileSync(join(root, 'src/strings', code + '.json'), 'utf8'));
    ok(/\(\{n\}\)/.test(loc.deleteSelectedMany),
      code + ': plural rules split above 1 → the count sits in parentheses (count-agnostic; the flat dict has no plural categories)');
  }
}

/* —— APPS SURFACE (Damir 2026-08-12: slow Apps screen · the "+" · empty state · banner art)
   Item 1 is the expensive one and the one that silently regresses, so it is asserted
   BEHAVIOURALLY: the run counts <img> CREATIONS across a sequence of renders that
   reproduces what C# actually does (clearApps + addApp-per-app, brand-new objects,
   dispatched across frames). A rebuild-every-render regression turns those counts
   from 0 back into N and fails here. */
console.log('apps surface — perf · Add-app button · empty state · explore banner');
{
  const dom = await load('apps.html');
  const W = dom.window, d = W.document, S = W.Spixi;

  /* count img CREATION (the icon factory's cost: a new element = a new resource
     lookup + a fresh decode of a multi-hundred-KB data: URI on the device) */
  let imgsCreated = 0;
  const realCreate = d.createElement.bind(d);
  d.createElement = (tag, ...rest) => {
    if (String(tag).toLowerCase() === 'img') imgsCreated += 1;
    return realCreate(tag, ...rest);
  };
  const ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
  const mkApps = (n) => Array.from({ length: n }, (_, i) => ({ id: 'perf' + i, name: 'App ' + i, creator: 'IXI Labs', icon: ICON }));
  const pState = { apps: mkApps(5), query: '', layout: 'list' };
  const pOpts = { strings: {} };
  const pList = S.createAppsList({ apps: [], query: '', layout: 'list' }, pOpts);
  d.body.append(pList);

  imgsCreated = 0;
  S.renderAppsList(pList, pState, pOpts);
  const coldImgs = imgsCreated;
  const rows1 = [...pList.querySelectorAll('.c-app-item')];
  const icons1 = [...pList.querySelectorAll('.c-app-icon__img')];
  ok(coldImgs === 5 && rows1.length === 5, 'PERF: the first render of 5 apps builds 5 icon <img> — one per app, no duplicates');

  // an identical RE-PUSH: same apps, brand-new objects (C# re-serialises every time)
  imgsCreated = 0;
  pState.apps = mkApps(5);
  S.renderAppsList(pList, pState, pOpts);
  const rows2 = [...pList.querySelectorAll('.c-app-item')];
  ok(imgsCreated === 0, 'PERF ★: an identical re-push (tab switch → loadApps) creates ZERO new <img> — the icons are never re-decoded');
  ok(rows1.every((r, i) => r === rows2[i]),
    'PERF: the row NODES are reused by app id — an unchanged re-push mutates no DOM (was: textContent="" + rebuild)');
  ok(icons1.every((im, i) => im === [...pList.querySelectorAll('.c-app-icon__img')][i]),
    'PERF: the icon <img> nodes survive the re-push — same element, so the decoded bitmap stays in the WebView cache');

  // the burst C# really emits: clearApps (EMPTY render) then addApp×N, across frames
  imgsCreated = 0;
  pState.apps = [];
  S.renderAppsList(pList, pState, pOpts);
  pState.apps = mkApps(5);
  S.renderAppsList(pList, pState, pOpts);
  ok(imgsCreated === 0 && [...pList.querySelectorAll('.c-app-item')].every((r, i) => r === rows1[i]),
    'PERF ★: the cache survives the intermediate EMPTY render clearApps produces — the "it reloads the images on every tab switch" symptom');

  // typing in the search box must not re-decode either
  imgsCreated = 0;
  S.setAppsQuery(pList, pState, 'App 1', pOpts);
  S.setAppsQuery(pList, pState, '', pOpts);
  ok(imgsCreated === 0, 'PERF: filtering and clearing the search re-uses every row — a keystroke costs no image work');

  // …but a genuinely CHANGED icon must still repaint (the cache is not a lie)
  imgsCreated = 0;
  pState.apps = mkApps(5);
  pState.apps[2].icon = ICON + 'CHANGED';
  S.renderAppsList(pList, pState, pOpts);
  ok(imgsCreated === 1, 'PERF: a changed icon rebuilds EXACTLY that one row — reuse is field-wise, not blind');
  // layout switch is a different rendering of the same model → rows are rebuilt once
  imgsCreated = 0;
  S.setAppsLayout(pList, pState, 'grid', pOpts);
  ok(imgsCreated === 5 && pList.dataset.layout === 'grid', 'PERF: list⇄grid rebuilds once (different node shape) and not twice');
  S.setAppsLayout(pList, pState, 'list', pOpts);
  d.createElement = realCreate;

  /* ★ DUPLICATE IDS. The row cache is keyed by app id, so two entries sharing one
     (a double addApp, a malformed manifest) resolved to the SAME cached element:
     `nodes` held it twice and the insert-before reconcile just MOVED it, rendering
     ONE row for two model entries — an app silently swallowed. The reconcile must
     never render fewer rows than the model has. */
  {
    const dupList = S.createAppsList({ apps: [], query: '', layout: 'list' }, pOpts);
    d.body.append(dupList);
    const dupState = { apps: [{ id: 'same', name: 'First', creator: 'A' }, { id: 'same', name: 'Second', creator: 'B' }], query: '', layout: 'list' };
    S.renderAppsList(dupList, dupState, pOpts);
    const dupRows = [...dupList.querySelectorAll('.c-app-item')];
    ok(dupRows.length === 2 && dupRows[0] !== dupRows[1],
      'APPS DUP-ID: two apps sharing an id render TWO distinct rows — a shared cache key must not collapse the model');
    ok(dupRows.map((r) => r.textContent).join('|').includes('First') && dupRows.map((r) => r.textContent).join('|').includes('Second'),
      'APPS DUP-ID: both rows keep their OWN content (the duplicate is not a second copy of the first)');
    // and a re-push of the same shape stays stable (no growth, no collapse)
    S.renderAppsList(dupList, { apps: dupState.apps.map((a) => ({ ...a })), query: '', layout: 'list' }, pOpts);
    ok(dupList.querySelectorAll('.c-app-item').length === 2,
      'APPS DUP-ID: a re-push of the duplicate-id list is stable — still exactly 2 rows');
    dupList.remove();
  }

  const shellSrc = readFileSync(join(root, 'src/components/apps-shell.js'), 'utf8');
  const iconSrc = readFileSync(join(root, 'src/components/apps-icon.js'), 'utf8');
  const homeSrc = readFileSync(join(root, 'src/shells/home.html'), 'utf8');
  ok(!/listEl\.textContent = ''/.test(shellSrc) && !/listEl\.replaceChildren\(/.test(shellSrc),
    'PERF: renderAppsList never wipes the list — replaceChildren/textContent="" would detach and re-decode every icon');
  ok(/img\.decoding = 'async'/.test(iconSrc) && /img\.loading = 'lazy'/.test(iconSrc),
    'PERF: the app icon decodes OFF the main thread and defers below-the-fold rows (5 apps in grid = most of them)');
  ok(/requestAnimationFrame\(\(\) => \{[\s\S]{0,200}renderAppsList\(appsList, appsState, appsOpts\)/.test(homeSrc)
    && /if \(appsRenderQueued\) return;/.test(homeSrc),
    'PERF: the shell coalesces the clearApps+addApp×N burst into ONE render per frame (no render per pushed app)');

  /* —— item 2: the "+" became a labelled action —————————————————————————— */
  const textAction = d.querySelector('.c-topbar__action--text');
  ok(!!textAction && textAction.textContent.trim().length > 2,
    'ADD-APP: the Apps topbar carries a real TEXT action, not a bare "+" glyph (Damir 2026-08-12)');
  ok(!!textAction && !textAction.hasAttribute('aria-label'),
    'ADD-APP: the VISIBLE label is the accessible name — no aria-label silently overriding it with different words');
  ok(/text: strings\.addApp \|\| 'Add app'/.test(homeSrc) && /icon: 'circle-plus'/.test(homeSrc)
    && /onClick: \(\) => bridge\.send\('ixian:newapp'\)/.test(homeSrc),
    'ADD-APP: the production shell passes the label + keeps the existing ixian:newapp verb (no new bridge command)');
  const tbCss = readFileSync(join(root, 'src/styles/components/topbar.css'), 'utf8');
  ok(/\.c-topbar__action--text::after\s*\{[^}]*inset:\s*-6px 0/.test(tbCss),
    'ADD-APP: the 32px pill still presents a 44px TOUCH TARGET (house hit-expander, §5b)');
  // ★ regression: the % cap must sit on the ROW. On the BUTTON it resolves against the
  // shrink-to-fit row (itself) and truncated "Add app" to "A…" on a 390px phone.
  ok(/\.c-topbar__actions--text\s*\{[^}]*max-width:\s*62%/.test(tbCss)
    && !/\.c-topbar__action--text\s*\{[^}]*max-width:\s*62%/.test(tbCss)
    && /text-overflow: ellipsis/.test(tbCss),
    'ADD-APP: the 62% cap is on the ACTIONS ROW (a % max-width on the button resolves against itself → "A…")');
  ok(!!textAction && textAction.parentElement.classList.contains('c-topbar__actions--text'),
    'ADD-APP: topbar.js tags the actions row so that cap has something to bite on');

  /* —— item 3: the illustrated empty state —————————————————————————————— */
  let added = 0;
  const eOpts = { strings: {}, emptyIllustration: 'images/apps-es.png', onAddApp: () => { added += 1; } };
  const eState = { apps: [], query: '', layout: 'list' };
  const eList = S.createAppsList(eState, eOpts);
  d.body.append(eList);
  const es = eList.querySelector('.c-empty-state');
  ok(!!es && !!es.querySelector('.c-empty-state__title').textContent.trim()
    && !!es.querySelector('.c-empty-state__body').textContent.trim(),
    'APPS EMPTY: nothing installed → illustration + headline + a supporting line (not a bare one-liner)');
  const eImg = es && es.querySelector('.c-empty-state__illo-img');
  ok(!!eImg && eImg.getAttribute('src') === 'images/apps-es.png',
    'APPS EMPTY: the art loads as a SIBLING file (images/…) — a file:// WebView refuses an external asset URL');
  const eCta = es && es.querySelector('.c-empty-state__action .c-button');
  ok(!!eCta && eCta.dataset.size === '44' && eCta.dataset.type === 'tonal',
    'APPS EMPTY: one SECONDARY (tonal) CTA at a 44px target — the empty state does not out-shout the topbar action');
  if (eCta) eCta.click();
  ok(added === 1, 'APPS EMPTY: the CTA calls the surface callback the shell already exposes (onAddApp → ixian:newapp)');
  ok(eList.hasAttribute('data-empty'), 'APPS EMPTY: the list flags [data-empty] so the state centres in the scroller');
  S.setAppsQuery(eList, eState, 'zzz', eOpts);
  ok(!eList.querySelector('.c-empty-state') && !!eList.querySelector('.c-apps-empty') && !eList.hasAttribute('data-empty'),
    'APPS EMPTY: a search that matches nothing keeps the QUIET note — an illustration there would read as an error');
  S.setAppsQuery(eList, eState, '', eOpts);
  ok(!!eList.querySelector('.c-empty-state__action .c-button'),
    'APPS EMPTY: coming back from a no-match search restores the full state (cached node, CTA intact)');
  // an art-less render must not poison the cache for the later, fully-wired one
  const eList2 = S.createAppsList({ apps: [], query: '', layout: 'list' }, { strings: {} });
  S.renderAppsList(eList2, { apps: [], query: '', layout: 'list' }, eOpts);
  ok(!!eList2.querySelector('.c-empty-state__illo-img') && !!eList2.querySelector('.c-empty-state__action .c-button'),
    'APPS EMPTY: the empty node is cached by SHAPE — an early art-less render never pins an art-less state forever');
  ok(/emptyIllustration: 'images\/apps-es\.png'/.test(homeSrc) && /onAddApp: \(\) => bridge\.send\('ixian:newapp'\)/.test(homeSrc),
    'APPS EMPTY: the production shell wires the art + the CTA (same verb as the topbar — no new bridge verb)');
  ok(existsSync(join(root, 'Spixi/Resources/Raw/html/images/apps-es.png'))
    && existsSync(join(root, 'Spixi/Resources/Raw/html/images/explore-banner.png')),
    'APPS ART (N45): both PNGs ship next to the packaged shells (build-shells copies src/demo/images) — else both refs 404 on device');

  /* —— item 4: the explore banner illustration ——————————————————————————— */
  const banner = d.querySelector('.c-apps-explore');
  const bIllo = banner && banner.querySelector('.c-apps-explore__illo');
  ok(!!bIllo && bIllo.getAttribute('src') === 'images/explore-banner.png' && bIllo.getAttribute('alt') === '',
    'BANNER: the art is on the banner as a decorative image (alt="") — the button keeps its own accessible name');
  ok(!!bIllo && bIllo.previousElementSibling && bIllo.previousElementSibling.classList.contains('c-apps-explore__text'),
    'BANNER: the art is a FLEX SIBLING of the copy, not an absolute overlay — text can never end up underneath it');
  const bCss = readFileSync(join(root, 'src/styles/components/apps-header.css'), 'utf8');
  const illoRule = (bCss.match(/\.c-apps-explore__illo\s*\{[^}]*\}/) || [''])[0];
  ok(/align-self:\s*flex-end/.test(illoRule) && /object-position:\s*bottom right/.test(illoRule),
    'BANNER: bottom + trailing edge (Damir: "align it bottom right") — object-position keeps it cornered when the box is capped');
  ok(/max-width:\s*42%/.test(illoRule) && !/position:\s*absolute/.test(illoRule),
    'BANNER narrow width: the art SHRINKS against a 42% cap (copy keeps ≥58%) — it never crops over or hides the headline');
  ok(/:root\[data-desktop\] \.c-apps-explore__illo/.test(bCss) && !/@media[^{]*max-width[^{]*\{[^}]*c-apps-explore/.test(bCss),
    'BANNER: desktop density rides :root[data-desktop], never a viewport width query (#228)');
  const hdrSrc = readFileSync(join(root, 'src/components/apps-header.js'), 'utf8');
  ok(/illo\.addEventListener\('error', \(\) => illo\.remove\(\)/.test(hdrSrc),
    'BANNER: a blocked/missing asset removes itself — the banner stays fully usable without the art');
  ok(/illo\.loading = 'lazy'/.test(hdrSrc),
    'BANNER: the 806 KB art is LAZY — the Apps tab is hidden at shell boot and `decoding` only defers the decode, not the fetch');
  // one <link> per stylesheet: build-shells INLINES each href, so a duplicate link
  // shipped a second full copy of the file inside index.html
  ok((homeSrc.match(/components\/empty-state\.css/g) || []).length === 1,
    'SHELL CSS: empty-state.css is linked exactly ONCE in home.html (a second link inlines the whole file twice)');
  // topbar text action = size-32 pill, and button.css pins [data-size="32"] icons to 16
  ok(/icon\(a\.icon, hasText \? \{ size: 16 \} : undefined\)/.test(readFileSync(join(root, 'src/components/topbar.js'), 'utf8')),
    'TOPBAR: a text action asks for a 16px glyph — the size button.css actually renders for the 32 pill');

  /* —— copy: every locale carries the new Apps strings, really translated —— */
  const enApps = JSON.parse(readFileSync(join(root, 'src/strings/en-us.json'), 'utf8'));
  ok(enApps.addApp === 'Add app' && !!enApps.appsEmptyTitle && !!enApps.appsEmptyBody,
    'APPS COPY: en-us carries the button label + the empty-state headline and supporting line');
  for (const code of ['de-de', 'es-co', 'fr-fr', 'pt-br', 'ru-ru', 'sl-si', 'sr-sp',
    'it-it', 'id-id', 'lt-lt', 'cn-cn', 'ja-jp']) {   // N4 (#379)
    const loc = JSON.parse(readFileSync(join(root, 'src/strings', code + '.json'), 'utf8'));
    ok(loc.addApp !== enApps.addApp && loc.appsEmptyTitle !== enApps.appsEmptyTitle && loc.appsEmptyBody !== enApps.appsEmptyBody,
      code + ': Add app + the Apps empty-state copy are really translated (not the English fallback)');
  }
}

/* —— EMPTY STATES: Chats · Wallet · Contacts (Damir 2026-08-12: "add empty space
   illustration and appropriate text and some text or secondary CTA for … Wallet,
   Chats and Contacts"). Three things regress silently here and each is asserted:
   (a) the ART PATH — these are ~300 KB assets loaded as a SIBLING `images/…` file
       because a file:// WebView refuses an external URL (build-shells copies
       src/demo/images → Resources/Raw/html/images); an absolute/http src would
       render a blank box on device while every desktop demo still looked fine;
   (b) ZERO vs NO-RESULTS — the illustration + "add your first…" CTA belongs ONLY
       to a genuinely empty surface; under a filter/search miss it reads as if the
       user's data had been deleted;
   (c) the CTA must reach the callback the surface ALREADY exposes (no new bridge
       verb) and must survive translation — de-de's wallet line pushed the button
       under the bottom nav until the state went compact. */
console.log('empty states — chats · wallet · contacts (illustration + copy + secondary CTA)');
{
  const chatsSrc = readFileSync(join(root, 'src/components/chats-shell.js'), 'utf8');
  const walletSrc = readFileSync(join(root, 'src/components/wallet-shell.js'), 'utf8');
  const contactsSrc = readFileSync(join(root, 'src/components/contacts-shell.js'), 'utf8');

  /* (a) art path — sibling file, and the file really ships */
  /* N45: chats/wallet art is PNG now (byte dial); contacts-es has no PNG export
     and stays SVG. */
  for (const [surface, src, ext] of [['chats', chatsSrc, 'png'], ['wallet', walletSrc, 'png'], ['contacts', contactsSrc, 'svg']]) {
    ok(new RegExp("illustration: (?:opts\\.emptyArt !== undefined \\? opts\\.emptyArt : )?'images/" + surface + "-es\\." + ext + "'").test(src),
      surface + ': the empty state points at the SIBLING images/' + surface + '-es.' + ext + ' (an external URL loads as a blank box under file://)');
    ok(existsSync(join(root, 'src/demo/images', surface + '-es.' + ext)),
      surface + '-es.' + ext + ' really ships from src/demo/images (build-shells copies it next to the shells)');
  }

  /* (b) zero vs no-results, per surface */
  ok(/function chatsIsZero\(state\)[\s\S]{0,200}?filter \|\| 'all'\) === 'all' && !\(state\.query \|\| ''\)\.trim\(\)/.test(chatsSrc),
    'chats: the illustration + CTA are gated on the TRUE zero state (All, no query) — a filter/search miss keeps the plain note');
  ok(/if \(!q && f === 'all'\) \{[\s\S]{0,120}?createEmptyState/.test(walletSrc),
    'wallet: same gate — under a Sent/Received chip or a search, "get your first IXI" would be wrong advice');

  /* (c) the CTA rides an EXISTING callback — no invented bridge verb */
  ok(/onAction: opts\.onNewChat/.test(chatsSrc), 'chats CTA → opts.onNewChat (the FAB’s own contacts picker, no new verb)');
  ok(/onAction: opts\.onReceive/.test(walletSrc), 'wallet CTA → opts.onReceive (the hero’s Receive takeover, no new verb)');
  ok(/onAction: onAddContact/.test(contactsSrc), 'contacts CTA → onAddContact (the same action the picker’s own row offers)');
  const homeSrc = readFileSync(join(root, 'src/shells/home.html'), 'utf8');
  ok(/onNewChat: \(\) => openContacts\('start'\)/.test(homeSrc) && /onReceive: \(\) => mountWalletReceive\(\)/.test(homeSrc),
    'the PRODUCTION shell passes both zero-state callbacks (a demo-only wiring would ship a dead button)');

  /* wallet compact — the de-de clipping guard */
  ok(/compact: true,/.test(walletSrc.slice(walletSrc.indexOf('function walletEmpty'), walletSrc.indexOf('function walletEmpty') + 1400)),
    '★ the wallet zero state is COMPACT — the hero owns ~300px above it, and full rhythm put "Show my address" under the bottom nav (worst in de-de)');
  const walletCss = readFileSync(join(root, 'src/styles/components/wallet-shell.css'), 'utf8');
  ok(/\.c-wallet-txlist > \.c-empty-state\[data-compact\] \.c-empty-state__illo \{[^}]*width: clamp\(/.test(walletCss),
    'wallet trims the illustration a notch under the hero (density, not a breakpoint)');

  /* F5 2026-08-13 — "inconsistent empty state illustration location. we need it
   * consistent, I think the chats is best, to the top". Measured on a 390×844
   * home shell the illustration sat 24px below its scroller on Chats, 8px on
   * Wallet and 171px on Apps (which centres its own list). The block now owns
   * its own vertical placement: an auto END margin eats the host's free space
   * before justify-content can distribute it, so it top-anchors in any
   * flex-column host and computes to 0 in a plain block one. */
  const esCss = readFileSync(join(root, 'src/styles/components/empty-state.css'), 'utf8');
  ok(/\.c-empty-state \{[^}]*margin-block-end: auto;/s.test(esCss),
    '★ the empty state top-anchors itself — one rule in the component, not four host layouts to keep in sync (Damir F5: "the chats is best, to the top")');
  const appsCssES = readFileSync(join(root, 'src/styles/components/apps-shell.css'), 'utf8');
  ok(/justify-content: center/.test(appsCssES),
    'the apps host still declares its old centring — the component rule is what overrides it, so this pins the case the fix exists for');

  /* house rule: desktop density rides :root[data-desktop], never a viewport query */
  for (const f of ['empty-state.css', 'chats-shell.css', 'wallet-shell.css', 'contacts-shell.css']) {
    const css = readFileSync(join(root, 'src/styles/components', f), 'utf8');
    ok(!/@media[^{]*min-width:\s*(7|8|9|1\d)\d\d/.test(css),
      f + ': no ≥700px viewport rule — desktop density rides :root[data-desktop] (#228)');
  }

  /* DOM: chats + wallet render the real thing, and the CTA actually fires */
  {
    const dom = await load('chats.html');
    const W = dom.window, D = W.document, S = W.Spixi;
    let started = 0;
    const list = D.querySelector('.c-chats-list');
    S.renderChatsList(list, { chats: [], requests: [], filter: 'all', query: '' },
      { onNewChat: () => { started += 1; }, capabilities: {} });
    const es = list.querySelector('.c-empty-state');
    const illo = es && es.querySelector('.c-empty-state__illo');
    const img = es && es.querySelector('.c-empty-state__illo-img');
    const cta = es && es.querySelector('.c-empty-state__action .c-button');
    ok(!!es && illo.getAttribute('aria-hidden') === 'true' && img.getAttribute('alt') === '',
      'chats zero state: the illustration is DECORATIVE (aria-hidden + empty alt) — the headline carries the meaning');
    ok(!!es.querySelector('h2.c-empty-state__title') && /No chats yet/.test(es.querySelector('h2').textContent),
      'the headline is a real heading, not styled text — screen readers land on it');
    ok(!!cta && cta.tagName === 'BUTTON' && cta.dataset.size === '44' && /Start a chat/.test(cta.textContent),
      'the CTA is a real 44px button with a real label (hit target ≥44px, no icon-only riddle)');
    cta.click();
    ok(started === 1, 'tapping it opens the contacts picker — the same route the FAB takes');
    S.renderChatsList(list, { chats: [], requests: [], filter: 'unread', query: '' }, { onNewChat: () => {} });
    ok(!list.querySelector('.c-empty-state') && !!list.querySelector('.c-chats-empty'),
      'switching to a filter that matched nothing drops back to the plain note — no illustration, no CTA');
  }
  {
    const dom = await load('wallet.html');
    const W = dom.window, D = W.document, S = W.Spixi;
    let received = 0;
    const txlist = D.querySelector('.c-wallet-txlist');
    S.renderWalletTxList(txlist, { txs: [], filter: 'all', query: '' }, { onReceive: () => { received += 1; } });
    const es = txlist.querySelector('.c-empty-state');
    ok(!!es && es.dataset.compact !== undefined && !!es.querySelector('.c-empty-state__illo-img'),
      'wallet zero state renders the compact illustrated block');
    const cta = es.querySelector('.c-empty-state__action .c-button');
    cta.click();
    ok(received === 1 && /Show my address/.test(cta.textContent),
      'its CTA opens Receive — the address is the one thing that turns this screen non-empty');
    S.renderWalletTxList(txlist, { txs: [], filter: 'sent', query: '' }, { onReceive: () => {} });
    ok(!txlist.querySelector('.c-empty-state') && !!txlist.querySelector('.c-wallet-empty'),
      'the Sent chip with no matches keeps the plain note (the ledger is fine, the filter just missed)');
  }
  {
    const dom = await load('chats.html');
    const W = dom.window, S = W.Spixi;
    let added = 0;
    const picker = S.createContactsPicker({ contacts: [], purpose: 'start', onAddContact: () => { added += 1; } });
    const zero = picker.querySelector('.c-contacts__zero');
    ok(!!zero && zero.hidden === false && !!zero.querySelector('.c-empty-state__illo-img'),
      'contacts: an empty roster reveals the illustrated zero state (noContacts / an empty loadContacts flush)');
    zero.querySelector('.c-empty-state__action .c-button').click();
    ok(added === 1, 'its CTA is the picker’s own Add-contact action — reachable from the blank area, not just the row above');
    S.setPickerContacts(picker, [{ address: 'ADDR1', name: 'Ana' }]);
    ok(picker.querySelector('.c-contacts__zero').hidden === true,
      'the moment one contact lands, the zero state gets out of the way');
    S.setPickerMode(picker, 'multi');
    S.setPickerContacts(picker, []);
    ok(picker.querySelector('.c-contacts__zero').hidden === true,
      'group setup (multi) hides the Add-contact affordances, so the zero state hides its CTA too — no contradicting chrome');
  }

  /* copy: real translations in all 8 dictionaries (not the English fallback) */
  const enES = JSON.parse(readFileSync(join(root, 'src/strings/en-us.json'), 'utf8'));
  ok(enES.chatsEmptyCta === 'Start a chat' && enES.walletEmptyCta === 'Show my address'
    && enES.walletEmptyBody === 'Payments you send and receive show up here.',
    'EMPTY-STATE COPY: en-us carries the three CTAs + the shortened wallet line (one sentence — the second only restated the button)');
  for (const code of ['de-de', 'es-co', 'fr-fr', 'pt-br', 'ru-ru', 'sl-si', 'sr-sp',
    'it-it', 'id-id', 'lt-lt', 'cn-cn', 'ja-jp']) {   // N4 (#379)
    const loc = JSON.parse(readFileSync(join(root, 'src/strings', code + '.json'), 'utf8'));
    ok(loc.chatsEmptyBody !== enES.chatsEmptyBody && loc.walletEmptyBody !== enES.walletEmptyBody
      && loc.contactsEmptyBody !== enES.contactsEmptyBody && loc.chatsEmptyCta !== enES.chatsEmptyCta
      && loc.walletEmptyCta !== enES.walletEmptyCta,
      code + ': the Chats/Wallet/Contacts empty-state copy and CTAs are really translated');
  }
}

/* ——— ZERO-STATE LOAD GATE (Apps · Chats · Wallet) ——————————————————————————
 * An ILLUSTRATED empty state is a CLAIM about the user's account. The home shell
 * builds all three lists SYNCHRONOUSLY with an EMPTY model, before the bridge has
 * answered, and C# emits every clearX/addX as its OWN EvaluateJavaScriptAsync —
 * so an ungated render painted "No chats yet" + 294 KB of art + a CTA on every F5,
 * and repainted the whole zero state MID-BURST on every tab re-entry for a user who
 * DOES have data. The fix is one flag, `opts.zeroReady`, read at render time by all
 * three shell components: false → render NO empty node at all (a blank beat, never a
 * false claim). Regressing any of the three is invisible in a screenshot review —
 * it only shows for the ~300ms nobody screenshots — so it is asserted here. */
console.log('zero-state load gate — no illustrated empty state during the load window');
{
  const homeSrc = readFileSync(join(root, 'src/shells/home.html'), 'utf8');
  const dom = await load('chats.html');
  const S = dom.window.Spixi, D = dom.window.document;

  /* —— APPS —————————————————————————————————————————————————————————————— */
  const aOpts = { strings: {}, emptyIllustration: 'images/apps-es.png', onAddApp: () => {} };
  const aList = S.createAppsList({ apps: [], query: '', layout: 'list' }, { ...aOpts, zeroReady: false });
  D.body.append(aList);
  ok(!aList.querySelector('.c-empty-state') && !aList.hasAttribute('data-empty'),
    'GATE apps: zeroReady:false renders NO illustrated state and NO [data-empty] — the load window says nothing');
  S.renderAppsList(aList, { apps: [], query: 'zzz', layout: 'list' }, { ...aOpts, zeroReady: false });
  ok(!!aList.querySelector('.c-apps-empty'),
    'GATE apps: a no-match SEARCH is a statement about the QUERY, not the account — its quiet note is NEVER gated');
  S.renderAppsList(aList, { apps: [], query: '', layout: 'list' }, aOpts);
  ok(!!aList.querySelector('.c-empty-state') && aList.hasAttribute('data-empty'),
    'GATE apps: once the gate opens, a genuinely empty surface still reaches the full illustrated state');

  /* —— CHATS ————————————————————————————————————————————————————————————— */
  const cList = S.createChatsList({ chats: [], requests: [], filter: 'all', query: '' },
    { capabilities: {}, onNewChat: () => {}, zeroReady: false });
  D.body.append(cList);
  ok(!cList.querySelector('.c-empty-state') && !cList.querySelector('.c-chats-empty'),
    'GATE chats: the CONSTRUCTION render (F5, bridge silent) paints no zero state at all — the gap chatsFlushing never covered');
  S.renderChatsList(cList, { chats: [], requests: [], filter: 'unread', query: '' }, { capabilities: {}, zeroReady: false });
  ok(!!cList.querySelector('.c-chats-empty'), 'GATE chats: a filter miss keeps its plain note under the gate');
  S.renderChatsList(cList, { chats: [], requests: [], filter: 'all', query: '' }, { capabilities: {}, onNewChat: () => {} });
  ok(!!cList.querySelector('.c-empty-state'), 'GATE chats: gate open + empty roster → the illustrated state');

  /* —— WALLET ———————————————————————————————————————————————————————————— */
  const wList = S.createWalletTxList({ txs: [], filter: 'all', query: '' }, { onReceive: () => {}, zeroReady: false });
  D.body.append(wList);
  ok(!wList.querySelector('.c-empty-state') && !wList.querySelector('.c-wallet-empty'),
    'GATE wallet: zeroReady:false paints nothing while the payment-activity burst is still arriving');
  S.renderWalletTxList(wList, { txs: [], filter: 'sent', query: '' }, { onReceive: () => {}, zeroReady: false });
  ok(!!wList.querySelector('.c-wallet-empty'), 'GATE wallet: the Sent-chip no-results note is never gated');
  S.renderWalletTxList(wList, { txs: [], filter: 'all', query: '' }, { onReceive: () => {} });
  ok(!!wList.querySelector('.c-empty-state'), 'GATE wallet: gate open + empty ledger → the illustrated state');

  /* —— the PRODUCTION shell really wires all three ————————————————————— */
  ok(/function createZeroGate\(gateOpts, render, settleMs\)/.test(homeSrc)
    && /gateOpts\.zeroReady = false;/.test(homeSrc),
    'GATE shell: one gate factory, and it starts CLOSED — the construction render can never claim an empty account');
  ok(/const chatsZero = createZeroGate\(opts, \(\) => renderChatsNow\(\), 0\)/.test(homeSrc)
    && /chatsZero\.open\(\);\s+\/\/ the roster is authoritative/.test(homeSrc)
    && /chatsZero\.push\(/.test(homeSrc),
    'GATE shell: chats opens on its REAL end-of-burst verb (clearChatsDone) — no timer where a signal already exists');
  ok(/chatsZero\.open\(\);\s+\/\/ degrade to "render what the model holds"/.test(homeSrc),
    'GATE shell: the iOS-28 stall watchdog also opens the gate — a half-run flush must not leave the surface mute forever');
  ok(/const appsZero = createZeroGate\(appsOpts, \(\) => scheduleAppsRender\(\), ZERO_SETTLE_MS\)/.test(homeSrc)
    && /const walletZero = createZeroGate\(walletOpts, \(\) => scheduleWalletRender\(\), ZERO_SETTLE_MS\)/.test(homeSrc)
    && /const ZERO_SETTLE_MS = \d{3};/.test(homeSrc),
    'GATE shell: apps + wallet have NO done verb, so they open on a QUIET WINDOW after the last push (no new bridge verb invented)');
  ok(/appsZero\.push\(\(appsState\.apps \|\| \[\]\)\.length > 0\)/.test(homeSrc)
    && /walletZero\.push\(\(walletState\.txs \|\| \[\]\)\.length > 0\)/.test(homeSrc),
    'GATE shell: a clear() over a surface that HELD ROWS shuts the gate (refill) — over an already-empty one it does not (no blink)');
  ok(/appsZero\.push\(false\);\s+\/\/ re-arm/.test(homeSrc) && /walletZero\.push\(false\);\s+\/\/ re-arm/.test(homeSrc),
    'GATE shell: every row push RE-ARMS the window, so the settle is bounded by the GAP between pushes, not the burst length');
  ok(/setAppsHeaderEmpty\(appsHeader, !\(appsState\.apps \|\| \[\]\)\.length && appsOpts\.zeroReady !== false\)/.test(homeSrc),
    'GATE shell: the Apps header collapse rides the SAME flag — otherwise the search row folds and re-expands = a visible layout jump');
}

/* ——— multi-user mini-app launch uses the NEW picker (Damir F5 2026-08-12) ———
 * "When launching multiuser app we get the legacy contacts list selector, it
 * should be new one same as for group creation."
 * Traced: apps row tap → ixian:startAppMulti:<id> (home.html onLaunch) →
 * HomePage.onStartAppMulti (HomePage.xaml.cs:2775) / AppDetailsPage:286 → push
 * LEGACY WalletRecipientPage(false, false) → wallet_recipient.html → ixian:select
 * → HandlePickAppMultiUserSucceeded (:2789) → onJoinApp + sendAppRequest.
 * NOTE the reality vs the ask: that legacy page is opened in SINGLE-select mode
 * (multiContactMode:false) with payment:false, which INCLUDES groups, and the C#
 * handler consumes addresses.First() only. So the new picker's 'app' purpose is
 * the group-creation select GRAMMAR with launch-target RULES: SINGLE target (one,
 * not two and not many — MiniAppPage hosts exactly one peer per session),
 * groups selectable, back exits. */
console.log('contacts picker — purpose "app" (multi-user launch target)');
{
  const dom = await load('chats.html');
  const d = dom.window.document, W = dom.window;
  const S = W.Spixi;

  let appSel = null; let backs = 0;
  const roster = [
    { name: 'Han Solo', address: 'app-han', type: 0 },
    { name: 'Ixian News', address: 'app-bot', type: 2 },                 // bot: blocked for GROUPS, fine for an app invite
    { name: 'Ben Kenobi', address: 'app-pending', type: 0, pending: true },
    { name: 'Crew', address: 'app-group', type: 0, isGroup: true },      // a GROUP is a legal app target
  ];
  const ap = S.createContactsPicker({
    contacts: roster, purpose: 'app',
    onBack: () => { backs += 1; },
    onNext: (sel) => { appSel = sel; },
  });
  d.body.append(ap);

  const apConfirm = () => ap.querySelector('.c-topbar__actions button');
  ok(!!apConfirm() && ap.querySelector('.c-contacts__group').hidden === true,
    'purpose "app": the picker OPENS in the select grammar — topbar ✓ present, action rows hidden (no browse detour)');
  const apRows = [...ap.querySelectorAll('.c-contacts__row')];
  const apRow = (n) => apRows.find((r) => r.querySelector('.c-contacts__name').textContent === n);
  ok(!!apRow('Crew') && !apRow('Crew').disabled,
    'purpose "app": a GROUP is selectable — WalletRecipientPage(payment:false) listed groups, so the redesign must not drop them');
  ok(!apRow('Ixian News').disabled,
    'purpose "app": a bot is selectable — the "can’t be added to groups" rule is a GROUP rule, not an app-invite rule');
  ok(!!apRow('Ben Kenobi').disabled,
    'purpose "app": a PENDING contact stays blocked — no accepted handshake, no app session');
  ok(ap.querySelector('.c-contacts__kinds').hidden === false,
    'purpose "app": the People/Groups chips stay live (group creation pins them to people; a launch target may be either)');
  ok(apConfirm().disabled, 'purpose "app": confirm is inert at 0 selected');
  const han = apRow('Han Solo');
  ok(han.getAttribute('role') === 'radio' && han.getAttribute('aria-checked') === 'false'
    && ap.querySelector('.c-contacts__list').getAttribute('role') === 'radiogroup',
    'purpose "app": the pick is SINGLE-target — rows are radios in a radiogroup (group creation keeps role=checkbox)');
  /* a11y of that radiogroup: a group with no accessible name announces as an
     unnamed group, and a BARE child (the blocked pending row) is not accountable
     to it. Roving tabindex / arrow keys are NOT asserted — deferred #205, shared
     with every other swatch/radio grammar in this codebase. */
  ok(!!(ap.querySelector('.c-contacts__list').getAttribute('aria-label') || '').trim(),
    'purpose "app": the radiogroup carries an accessible NAME (reuses the picker’s own translated select title)');
  ok(apRow('Ben Kenobi').getAttribute('role') === 'radio'
    && apRow('Ben Kenobi').getAttribute('aria-checked') === 'false'
    && apRow('Ben Kenobi').getAttribute('aria-disabled') === 'true',
    'purpose "app": the BLOCKED pending row is a disabled radio, not a role-less element sitting bare inside the radiogroup');
  han.click();
  ok(han.getAttribute('aria-checked') === 'true' && !apConfirm().disabled
    && /\(1\)/.test(apConfirm().getAttribute('aria-label') || ''),
    'purpose "app": ONE target is enough — confirm enables at 1 (a group needs 2)');
  ok(!ap.querySelector('.c-contacts__minhint').hidden
    && ap.querySelector('.c-contacts__minhint').textContent.includes('1'),
    'purpose "app": the live hint counts the selection instead of repeating the group ≥2 rule');
  /* SINGLE-TARGET PIN (do not relax without the MiniAppPage session work — its
   * session id is sha3(appId), it relays to ONE friendOrGroup and hasUser rejects
   * anyone else, so extra invitees join a session the host never talks to). */
  apRow('Crew').click();
  ok(apRow('Crew').getAttribute('aria-checked') === 'true' && han.getAttribute('aria-checked') === 'false'
    && /\(1\)/.test(apConfirm().getAttribute('aria-label') || ''),
    'purpose "app": a SECOND pick REPLACES the first — the picker can never hand C# targets it would silently drop');
  apConfirm().click();
  ok(!!appSel && appSel.length === 1 && appSel[0].address === 'app-group',
    'purpose "app": ✓ emits onNext with exactly ONE target');
  ap.querySelector('.c-topbar').querySelector('button').click();   // topbar back = its first button
  ok(backs === 1,
    'purpose "app": topbar back LEAVES the picker (there is no browse state to fall back into — group creation flips to browse instead)');
  ap.remove();

  /* the bridge translation: a NEW verb, because ixian:startAppMulti carries no
   * target and its C# handler slices at "ixian:startAppMulti:".Length (appending
   * an address would land the whole tail in appId). Grammar mirrors the shipped
   * ixian:creategroup: payload (HomePage.xaml.cs:447) minus the blind+name prefix. */
  const cp = readFileSync(join(root, 'src/bridge/contacts-page.js'), 'utf8');
  ok(/ixian:startappwith:'\s*\+\s*appId\s*\+\s*':\|'\s*\+\s*addresses\.join\('\|'\)/.test(cp),
    'contacts-page: purpose "app" emits ixian:startappwith:<appId>:|<addr> — the creategroup payload grammar, minus blind+name');
  ok(/\.slice\(0, 1\);/.test(cp),
    'contacts-page: the launch payload carries ONE address — the bridge caps it even if a caller hands over more');
  ok(/if\s*\(!appId \|\| addresses\.length < 1\) return;/.test(cp),
    'contacts-page: a mount without an appId, or a confirm with no target, sends nothing (C# would only log and drop it)');
  ok(cp.indexOf('close();') < cp.indexOf("bridge.send('ixian:startappwith:"),
    'contacts-page: the takeover closes BEFORE the launch verb — C# pushes MiniAppPage over home; a live picker underneath would re-arm ✓ into a duplicate session');
  ok(/purpose = 'start', appId = ''/.test(cp),
    'contacts-page: mountContacts takes the appId the launch verb needs');
}

/* ——— the unselected selection circle is visible in BOTH themes (Damir F5) ———
 * "the circles are too muted while unselected, and almost invisible, we need a
 * bit stronger color one token up." --outline-neutral-02 measures 1.14:1 on
 * --surface-card in light and 1.05:1 in dark; every remaining rung of the OUTLINE
 * ladder is still under the 3:1 non-text floor (outline-03 1.42/1.20, outline-04
 * 1.63/1.33), so the step is one rung up into the muted-ICON ladder — the same
 * class of fix the chat selection circle took. */
{
  const css = readFileSync(join(root, 'src/styles/components/contacts-shell.css'), 'utf8');
  const check = css.slice(css.indexOf('.c-contacts__check {'), css.indexOf('.c-contacts__row[aria-checked='));
  ok(/border:\s*var\(--outline-width-2\)\s*solid\s*var\(--icon-neutral-03\)/.test(check),
    'contacts multi-select: the UNSELECTED check circle rides --icon-neutral-03 (4.30:1 light / 5.69:1 dark on --surface-card) — was --outline-neutral-02 at 1.14/1.05');
  // DECLARATIONS only — the rule's own comment NAMES the rejected token (it
  // records the measurements), so the raw slice can never be clean. (This is why
  // the assertion was failing red on an already-correct rule.)
  const checkDecls = check.replace(/\/\*[\s\S]*?\*\//g, '');
  ok(!/--outline-neutral-02/.test(checkDecls),
    'contacts multi-select: the invisible outline token is gone from the check circle');
  const sel = css.slice(css.indexOf('.c-contacts__row[aria-checked='));
  ok(/background:\s*var\(--surface-action-default\)/.test(sel.slice(0, 240)),
    'contacts multi-select: SELECTED is still the filled action surface + tick — the louder ring never competes with it');
}

/* ═══ W2 — the desktop nav rail is SYSTEM CHROME: always visible AND clickable ═══
 * Damir (Windows F5): the rail (Chats/Apps/Wallet/Account) must never be covered.
 * Two classes of cover: (A) legacy full-window C# PushAsync pages, (B) the shell's
 * own full-VIEWPORT takeovers. Only B is asserted here — the C# half (a
 * pushPageBesideRail conversion of the wallet/contact pages) was REVERTED
 * 2026-08-13: popPageAsync is identity-aware for overlays but pops the TOP of the
 * stack for pushed pages, so the converted pages tore down the wrong screen
 * (Wallet → Send → pick recipient destroyed Send, and WalletSentPage.onDismiss
 * threw indexing NavigationStack on a detached proxy). Case A stays open. */
console.log('W2 — desktop rail always visible (FE takeovers)');
{
  const tokens = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8');
  const railTok = /--layout-rail-width:\s*(\d+)px/.exec(tokens);
  ok(!!railTok, 'W2: --layout-rail-width is minted in tokens.css (the ONE frontend source for the rail width)');

  const nav = readFileSync(join(root, 'src/styles/components/bottomnav.css'), 'utf8');
  const railRule = nav.slice(nav.indexOf('.c-bottomnav--rail {'), nav.indexOf('.c-bottomnav--rail {') + 400);
  ok(/width:\s*var\(--layout-rail-width\)/.test(railRule),
    'W2: the rail COLUMN consumes the token — no second literal to drift from');

  const home = readFileSync(join(root, 'src/shells/home.html'), 'utf8');
  // Case B: BOTH full-viewport takeovers inset by the rail on desktop. Logical
  // inset (RTL-safe: the rail is order:-1 in a flex row, so it flips sides).
  const inset = /:root\[data-desktop\]\s*\.contacts-takeover,\s*:root\[data-desktop\]\s*\.wallet-takeover\s*\{\s*inset-inline-start:\s*var\(--layout-rail-width\);\s*\}/;
  ok(inset.test(home),
    'W2 case B: the contacts AND wallet takeovers inset-inline-start by --layout-rail-width on :root[data-desktop] — the rail is beside them, not under them');
  const insetIdx = home.search(inset);
  ok(insetIdx > 0 && !/@media[^{]*\(min-width/.test(home.slice(Math.max(0, insetIdx - 600), insetIdx)),
    'W2 case B: the inset rides the [data-desktop] platform flag, never a viewport media query (#228)');
  // Rail tap while a takeover is open: the tab wins — dismiss, then switch.
  const onChange = home.slice(home.indexOf('onChange: (id) => {'), home.indexOf("bridge.send('ixian:tab:'"));
  ok(onChange.indexOf('closeHomeTakeovers()') > -1
    && onChange.indexOf('closeHomeTakeovers()') < onChange.indexOf("id === 'account'"),
    'W2: tapping a rail tab while a takeover is open DISMISSES it first — for every tab, Account included (a live rail that does nothing is worse than no rail)');

  /* ——— the rail-width DRIFT GUARD (static C#; #245, pre-dates W2 and survives its
   * revert): HomePage insets the Account peer-pane by railWidthDip so the rail
   * stays visible beside it. CSS px are DIPs in the WebView, so a one-sided
   * re-dial would silently cover or gap the rail. ——— */
  const hp = readFileSync(join(root, 'Spixi/Pages/Home/HomePage.xaml.cs'), 'utf8');
  const railCs = /railWidthDip\s*=\s*(\d+(?:\.\d+)?)\s*;/.exec(hp);
  ok(!!railCs && !!railTok && Number(railCs[1]) === Number(railTok[1]),
    'DRIFT GUARD (#245): HomePage.railWidthDip === --layout-rail-width ('
      + (railTok ? railTok[1] : '?') + ' / ' + (railCs ? railCs[1] : '?')
      + ') — the Account peer-pane inset and the CSS rail must be re-dialed together');
}

/* ═══ multi-user mini-app launch uses the NEW picker, not the legacy selector ═══
 * Damir: "when launching multiuser app we get the legacy contacts list selector,
 * it should be new one same as for group creation." */
console.log('multi-user app launch — new picker end to end');
{
  const home = readFileSync(join(root, 'src/shells/home.html'), 'utf8');
  const launch = home.slice(home.indexOf('onLaunch: (app) => {'), home.indexOf('onOpen: (app) =>'));
  ok(/openContacts\('app', app\.id\)/.test(launch) && !/startAppMulti/.test(launch),
    'apps tab: a multi-user launch opens the in-shell picker (purpose "app") — the ixian:startAppMulti verb that pushed WalletRecipientPage is gone from both launch paths');
  ok(/function openContacts\(purpose, appId\)/.test(home) && /appId: appId \|\| ''/.test(home),
    'home shell: openContacts threads the appId into mountContacts (the launch verb needs it)');
  const pat = home.slice(home.indexOf('pickAppTargets(appId) {'), home.indexOf('/* ——— chats (wired)'));
  ok(/openContacts\('app', String\(appId\)\)/.test(pat) && /if \(!appId\) return;/.test(pat),
    'home shell: exposes pickAppTargets — AppDetailsPage has no roster, so C# hands ITS launch pick back to this one picker');
  /* ★ W9-③ (Damir: "the selection from app details closes the app details pane and
     returns to chat"): the app-details pane is a NATIVE surface above this WebView,
     so the tab underneath it is what the user is dropped onto the moment it closes
     — and on the abandon path (picker back) it is the only thing left on screen.
     Chats is the wrong answer for a launch that started in Apps. */
  ok(/activeNav = 'apps';/.test(pat) && /showView\('apps'\)/.test(pat) && /NAV_TO_TAB\.apps/.test(pat),
    'W9-③: pickAppTargets parks the shell on APPS before opening the picker, through the same chokepoint the nav uses (so C# stays in sync) — the launch can no longer end on the chats list');

  const hp = readFileSync(join(root, 'Spixi/Pages/Home/HomePage.xaml.cs'), 'utf8');
  ok(/current_url\.StartsWith\("ixian:startappwith:", StringComparison\.Ordinal\)/.test(hp)
    && /private void onStartAppWith\(string payload\)/.test(hp),
    'C# (static): HomePage answers ixian:startappwith:<appId>:|<addr>… — the picker’s verb has a handler, or the ✓ would do nothing');
  const saw = hp.slice(hp.indexOf('private void onStartAppWith'), hp.indexOf('public void pickAppTargets'));
  ok(/Split\(new string\[\] \{ ":\|" \}/.test(saw) && /FriendList\.getFriend/.test(saw),
    'C# (static): the payload is parsed with the ixian:creategroup grammar and every WebView-supplied address is resolved against FriendList (unknown = dropped)');
  ok(!/WalletRecipientPage/.test(saw),
    'C# (static): the new launch path never touches the legacy picker page');
  ok(/StreamProcessor\.sendAppRequest\(target, appId/.test(saw) && /onJoinApp\(appId, target\)/.test(saw),
    'C# (static): it feeds the SAME core the legacy pick did — one session, one app request');
  /* SINGLE-TARGET PIN (mirror of the picker's): MiniAppPage.xaml.cs:48 still has
   * "TODO randomize session id and add support for more users" (sessionId =
   * sha3(appId)), sendNetworkData relays to the single friendOrGroup and hasUser
   * rejects everyone else — so a fan-out would invite people into a session the
   * host never talks to. Do the MiniAppPage work before relaxing this. */
  ok(!/foreach\s*\(Friend/.test(saw),
    'C# (static): the launch does NOT fan out over the target list — one session, one invite, until MiniAppPage can host more');
  const ad = readFileSync(join(root, 'Spixi/Pages/MiniApps/AppDetailsPage.xaml.cs'), 'utf8');
  const adMulti = ad.slice(ad.indexOf('private void onStartAppMulti'), ad.indexOf('private async void HandlePickAppMultiUserSucceeded'));
  ok(adMulti.indexOf('home.pickAppTargets(appId)') > -1
    && adMulti.indexOf('home.pickAppTargets(appId)') < adMulti.indexOf('new WalletRecipientPage'),
    'C# (static): the app-details launch prefers the shell picker; WalletRecipientPage survives only as the no-home-shell fallback');
  /* ★ W9-③: HAND OFF FIRST, TEAR DOWN SECOND. popPageAsync() is not a plain call —
     for an overlay-mode page (#225, which is how HomePage.onAppDetails presents this
     one) it enters closeOverlay, which QUEUES a main-thread teardown that hides the
     stage, waits, detaches and Disposes this page (and on iOS awaits a 250 ms slide
     first). Arming that before issuing the pick puts the hand-off on the same queue
     as our own disposal, for no reason: nothing about closing this pane needs to
     precede opening that picker. */
  const adMultiCode = adMulti.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  ok(/home\.pickAppTargets\(appId\);\s*(?:\/\/[^\n]*)?\n\s*popPageAsync\(\);/.test(adMultiCode),
    'C# (static): the hand-off is issued BEFORE this page tears itself down — the picker must exist before the surface that asked for it can go');
}

/* ═══ BUG-1 — the chats list must never silently drop a conversation ═══════════
 * Damir F5 2026-08-13 ② "I deleted chat, then that same contact sent me messages,
 * but I dont see it in chats list": a conversation that exists, receives traffic,
 * and is unreachable from the list.
 * ① "I created group, it doesnt show in my chats list" was RETRACTED by Damir —
 * the group WAS in the list; a stale query in the chats search bar was filtering
 * it out (that is BUG-3, the search-reset work, below). The C# predicate was never
 * at fault, so the group/bot exception once asserted here is gone with it. What
 * remains is the ORIGINAL predicate, asserted so nothing relaxes it by accident. */
console.log('BUG-1 — chats-list membership (C# predicate)');
{
  const hp = readFileSync(join(root, 'Spixi/Pages/Home/HomePage.xaml.cs'), 'utf8');
  const helper = hp.slice(hp.indexOf('private FriendMessageHelper? getFriendMessageHelper'),
                          hp.indexOf('public void updateChat(Friend friend)'));
  ok(helper.length > 0, 'getFriendMessageHelper — the chats-list predicate — is where the suite expects it');

  /* ① THE PREDICATE. Returning null = "not a chat row", and the ONLY membership
   * test is "has a last message" — no exceptions. That is also why the contacts
   * DIRECTORY and the chats LIST are different surfaces: a contact you have never
   * written to is in the directory only. Relaxing this would dump roster rows into
   * the chats list, so the branch is asserted to stay a bare `return null`. */
  const nullBranch = helper.slice(helper.indexOf('if (lastmsg == null)'), helper.indexOf('string str_online'));
  ok(/^if \(lastmsg == null\) \{ return null; \}$/.test(nullBranch.trim().replace(/\s+/g, ' ')),
    'BUG-1: the chats-list predicate is exactly "no lastMessage → not a chat row" — no type-based exception may be slipped in');

  /* ② NO OTHER SILENT EXCLUSION. loadChats may drop a friend for exactly three
   * reasons: pending deletion, the predicate above, and the #219 contact-request
   * routing (incoming requestAdd → the Requests feed, not a chat row). A fourth
   * `continue` in this loop is how a conversation disappears — make it fail here. */
  const loadChats = hp.slice(hp.indexOf('private void loadChats()'), hp.indexOf('public static IxiNumber calculateReceivedAmount'));
  const loop = loadChats.slice(loadChats.indexOf('foreach (Friend friend in friends)\n                {\n                    if (friend.pendingDeletion)'),
                               loadChats.indexOf('// Sort the helper messages'));
  ok(loop.length > 0 && (loop.match(/\bcontinue;/g) || []).length === 3,
    'BUG-1: loadChats drops a friend for exactly THREE reasons — pendingDeletion, the null predicate, and the #219 incoming-request routing. A new exclusion must be argued for, not slipped in');
  ok(/!friend\.approved && lm != null && lm\.type == FriendMessageType\.requestAdd && !lm\.localSender/.test(loop),
    'BUG-1: the #219 exclusion is still narrow — an UNAPPROVED friend whose LAST message is THEIR requestAdd. An approved friend, or one who sent a follow-up, stays in the chat list');
}

/* ═══ BUG-1b + BUG-2 — END TO END against the BUILT home shell ═════════════════
 * Everything below drives the real dispatcher and the real handlers in the shipped
 * document, not a demo mock: window.executeUiCommand(window.addChat, 'b64'…) is
 * byte-for-byte what Utils.sendUiCommand injects. */
/* ★ N71/N81 (#421/#422, #46 audit MAJOR-1) — BOOT THE BUILT CHAT SHELL.
 *
 * This gate exists because of a real, shipped-to-the-audit defect: chat.html called
 * two new bundle exports (readPatternLevel / patternLevelVar) that it never added to
 * its `const { … } = window.Spixi` destructure. readPatternPrefs() runs at MODULE TOP
 * LEVEL, so the main script threw before bridge.exposeAll — nothing was exposed, C#
 * never received ixian:onload, and EVERY conversation would have booted to a
 * permanent spinner. On the most-used screen in the app.
 *
 * ⚠ NEITHER EXISTING GATE COULD SEE IT, and that is the point of adding this one:
 *   · build-shells' preflight validates DESTRUCTURED symbols against the bundle it
 *     inlines. A symbol that is never destructured is invisible to it — its premise
 *     is staleness, not omission.
 *   · every other chat pin in this suite is a REGEX READ of the file. A regex cannot
 *     see a throw.
 * The only thing that catches this class is executing the artifact, so we execute it.
 */
/* ★ N71(a) — DAMIR F5 2026-08-19. RUN the repro, do not describe it.
 *
 * This defect shipped past a full #46 round, a break-my-verdict pass and 20 mutated
 * pins, because every one of those pins READ SOURCE. The behaviour only exists in the
 * interaction between three things — the shell's cached System answer, which appearance
 * is selected, and whether C# pushes at this page at all — and no regex over any one of
 * them can see it. So the two cases are driven end to end, through the same handlers
 * and the same base64 wire C# uses, against the BUILT shell. */
console.log('★ N71(a) — the appearance picker, driven end to end');
{
  const setShellPath = join(root, 'Spixi/Resources/Raw/html/settings.html');
  if (!existsSync(setShellPath)) {
    ok(false, 'built settings shell exists (run build-shells.mjs before the smoke suite)');
  } else {
    const domS = new JSDOM(readFileSync(setShellPath, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
      url: 'file://' + setShellPath, virtualConsole: new VirtualConsole(),
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
      },
    });
    await sleep(2000);
    const WS = domS.window;
    const b64s = (v) => Buffer.from(String(v), 'utf8').toString('base64');
    const themeNow = () => domS.window.document.documentElement.dataset.theme;

    /* CASE 1 — Damir's exact report. OS dark, appearance Light (so the document booted
     * light and cached that as its System answer), then the user picks System. */
    WS.executeUiCommand(WS.setAppearance, b64s('1'));      // appearance = Light
    await sleep(50);
    WS.executeUiCommand(WS.setAppearance, b64s('0'));      // user picks System
    await sleep(50);
    WS.executeUiCommand(WS.setTheme, b64s('dark'));        // C# resolves automatic → dark
    await sleep(120);
    ok(themeNow() === 'dark',
      '★ N71(a) (Damir F5): appearance Light → pick SYSTEM with a DARK OS, and the Account FOLLOWS. This is the reported bug — the whole app went dark and the Account stayed light, because C# excluded the picker from its own sweep. Got: ' + themeNow());

    /* CASE 2 — the poisoning the #46 round was right to worry about. The pushed name is
     * the PICK when the pick is explicit, so it must NOT be cached as the OS answer. */
    WS.executeUiCommand(WS.setTheme, b64s('light'));       // a light OS
    WS.executeUiCommand(WS.setAppearance, b64s('2'));      // user picks Dark
    await sleep(50);
    WS.executeUiCommand(WS.setTheme, b64s('dark'));        // carries the PICK, not the OS
    await sleep(50);
    WS.executeUiCommand(WS.setAppearance, b64s('0'));      // user picks System; OS is light
    await sleep(120);
    ok(themeNow() === 'light',
      '★ N71(a) case 2: picking Dark then SYSTEM on a LIGHT OS lands on light with no dark flash — the explicit pick never poisons the cached System answer. Both cases, one guard, keyed on the SELECTED appearance. Got: ' + themeNow());
    domS.window.close();
  }
}

console.log('★ N71/N81 — the built CHAT shell actually boots');
{
  const chatShellPath = join(root, 'Spixi/Resources/Raw/html/chat.html');
  if (!existsSync(chatShellPath)) {
    ok(false, 'built chat shell exists (run build-shells.mjs before the smoke suite)');
  } else {
    const vcC = new VirtualConsole();
    const bootErrors = [];
    vcC.on('jsdomError', (e) => bootErrors.push(String(e.message) + ' :: ' + ((e.detail && e.detail.message) || '')));
    const domC = new JSDOM(readFileSync(chatShellPath, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
      url: 'file://' + chatShellPath, virtualConsole: vcC,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
      },
    });
    await sleep(2000);
    const WC = domC.window;
    const refErrs = bootErrors.filter((e) => /ReferenceError|is not defined/.test(e));
    ok(refErrs.length === 0,
      '★ N71/N81 (#46 MAJOR-1): the built chat shell boots with NO ReferenceError. A bundle export used but not destructured throws at module top level, before bridge.exposeAll — a permanently blank conversation. Errors: ' + (refErrs.slice(0, 2).join(' | ') || 'none'));
    ok(typeof WC.executeUiCommand === 'function' && typeof WC.addMe === 'function'
      && typeof WC.onChatScreenReady === 'function',
      '★ N71/N81: bridge.exposeAll was REACHED — the C#-callable page globals exist. This is the assertion that fails when the main script dies partway, which no regex pin can detect');
    ok(typeof WC.setTheme === 'function',
      '★ N71 (#421): setTheme is a real global on the BUILT chat shell, not just present in the source. C# emits it as a bare identifier, so this is the exact lookup the WebView performs');
    /* the shell must survive the push it will actually receive, arguments and all */
    let themeThrew = null;
    try { WC.executeUiCommand(WC.setTheme, Buffer.from('dark', 'utf8').toString('base64')); }
    catch (e) { themeThrew = e; }
    ok(themeThrew === null && domC.window.document.documentElement.dataset.theme === 'dark',
      '★ N71 (#421) END-TO-END: a real base64 setTheme push through the real dispatcher flips data-theme on the built shell — the pin is on the wire C# uses, not on the handler in isolation');
    domC.window.close();
  }
}

console.log('BUG-1b / BUG-2 — built home shell, real bridge pushes');
{
  const shellPath = join(root, 'Spixi/Resources/Raw/html/index.html');
  if (!existsSync(shellPath)) {
    ok(false, 'built home shell exists (run build-shells.mjs before the smoke suite)');
  } else {
    const vc = new VirtualConsole();
    const dom = new JSDOM(readFileSync(shellPath, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
      url: 'file://' + shellPath, virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
      },
    });
    await sleep(2000);
    const W = dom.window, d = W.document;
    const b64 = (s) => Buffer.from(String(s), 'utf8').toString('base64');
    const names = () => [...d.querySelectorAll('.c-chatlist-item')].map((r) => (r.querySelector('.c-chatlist-item__name') || {}).textContent);
    const flush = (rows) => {
      W.executeUiCommand(W.clearChats);
      for (const r of rows) W.executeUiCommand(W.addChat, ...r.map(b64));
      W.executeUiCommand(W.clearChatsDone);
    };
    const OLD_TS = Date.now() - 60000;
    const row = (ts, excerpt, unread) => ['addr1', 'Alice', ts, 'img/spixiavatar.png', 'true', excerpt, '', String(unread), '', 'False'];

    ok(typeof W.executeUiCommand === 'function' && typeof W.addChat === 'function' && typeof W.addApp === 'function',
      'the built shell boots and registers the C#-callable page globals');

    /* —— the bridge dispatcher itself (BUG-2 ①/②) —— */
    let got = null;
    W.__smokeSink = (a, b2) => { got = [a, b2]; };
    const dataUri = 'data:image/png;base64,AAECAwQF=';
    W.executeUiCommand(W.__smokeSink, dataUri, b64('Đamir ✓ 你好'));
    ok(got && got[0] === dataUri,
      'BUG-2①: an already-base64 data: URI arrives VERBATIM — C# no longer re-encodes a 240 KB icon to 320 KB, and the shell no longer atob()s it back');
    ok(got && got[1] === 'Đamir ✓ 你好',
      'BUG-2②: every OTHER argument keeps the base64 contract, unicode intact (the fast decode must not change one byte)');

    /* —— BUG-1b: a deleted chat that receives a new message MUST come back —— */
    flush([row(OLD_TS, 'hi', 0)]);
    await sleep(120);
    ok(names().length === 1, 'BUG-1b setup: the chat is in the list');
    d.querySelector('.c-chatlist-item').dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(80);
    const menu = [...d.querySelectorAll('.c-msgmenu__item')];
    const delItem = menu.find((b2) => /delete/i.test(b2.textContent));
    ok(!!delItem, 'BUG-1b setup: the row menu offers Delete chat');
    delItem.click();
    await sleep(120);
    [...d.querySelectorAll('.c-modal button')].find((b2) => /^delete$/i.test(b2.textContent.trim())).click();
    await sleep(120);
    [...d.querySelectorAll('.c-modal button')].find((b2) => /keep contact/i.test(b2.textContent)).click();
    await sleep(150);
    ok(names().length === 0, 'BUG-1b: deleting the chat removes the row (the delete still sticks)');

    flush([row(OLD_TS, 'hi', 0)]);
    await sleep(120);
    ok(names().length === 0,
      'BUG-1b: a re-flush of the SAME state keeps it deleted — the tombstone is not weakened into "any push resurrects"');

    flush([row(Date.now(), 'they messaged you', 1)]);
    await sleep(120);
    ok(names().length === 1,
      '★ BUG-1b: a STRUCTURAL FLUSH carrying a newer message + unread RESURRECTS the deleted chat. C# only emits a lone updateChat push when HomePage is top-of-stack, and even then it can land mid-flush — messages you cannot see are the worse failure');

    /* —— BUG-2 ③/④: the apps list must not blank out mid-burst —— */
    const appPush = () => { for (let k = 0; k < 4; k++) W.executeUiCommand(W.addApp, b64('app' + k), b64('App ' + k), 'data:image/png;base64,AAAA', b64('Pub'), b64('True'), b64('False')); };
    const appRows = () => d.querySelectorAll('#apps-scroll .c-app-item').length;
    W.executeUiCommand(W.clearApps); appPush();
    await sleep(150);
    ok(appRows() === 4, 'BUG-2 setup: 4 app rows render');
    // C# emits every verb as its OWN EvaluateJavaScriptAsync, so a frame can land
    // between clearApps and the first addApp. That frame used to paint an EMPTY list.
    W.executeUiCommand(W.clearApps);
    await sleep(150);
    ok(appRows() === 4,
      '★ BUG-2④: a bare clearApps does NOT blank the rendered list — the refill\'s addApp renders instead. That empty frame WAS the "flickers and always reloads some images"');
    appPush();
    await sleep(150);
    ok(appRows() === 4, 'BUG-2④: the refill still lands (the deferred render is a delay, not a drop)');
    dom.window.close();
  }
}

/* ═══ BUG-3 — a stale search query must never silently hide content ════════════
 * Damir F5 2026-08-13: "the group was in list, I had active search bar stuff in, we
 * need best ux so that it resets after tapping out" / "the search bar needs to clear
 * when we stop using it." A forgotten chats query cost him ~10 minutes and TWO
 * phantom bug reports against a chats list that was working.
 * THE RULE: a query is scoped to ONE VISIT to its surface — it survives scrolling,
 * blur and drilling into a result, and it dies the moment the surface is LEFT (tab
 * switch, takeover, Account pane). While live, the field wears the action outline
 * (`data-active`) so an on filter is legible at a glance. */
console.log('BUG-3 — search reset (static)');
{
  const sf = readFileSync(join(root, 'src/components/search-field.js'), 'utf8');
  ok(/export function resetSearchFields\(\{ keepWithin = null \} = \{\}\)/.test(sf),
    'BUG-3: search-field.js owns the shared reset — every surface inherits it from the component, none of them re-implements it');
  ok(/searchFieldRegistry\.add\(el\)/.test(sf) && /if \(!el\.isConnected\) \{ searchFieldRegistry\.delete\(el\); continue; \}/.test(sf),
    'BUG-3: every field self-registers and a detached one (a takeover that unmounted) is swept — no unregister bookkeeping for callers to forget');
  ok(/const notify = searchFieldNotify\.get\(el\);\s*if \(notify\) notify\(''\);/.test(sf),
    'BUG-3: a reset NOTIFIES onInput("") — it puts the consumer\'s MODEL back to unfiltered, it does not merely blank the input');
  ok(/el\.toggleAttribute\('data-active', on\)/.test(sf),
    'BUG-3: the field flags itself while it holds a query — the affordance is state, not a per-surface decoration');
  ok(!/addEventListener\('blur'/.test(sf) && !/'focusout'/.test(sf),
    'BUG-3: the reset is NOT blur-driven — blur fires when you tap a RESULT, so clearing there fights the click and discards the query of a user acting on it');

  const sfCss = readFileSync(join(root, 'src/styles/components/search-field.css'), 'utf8');
  const active = sfCss.slice(sfCss.indexOf('.c-search-field[data-active]'));
  ok(active.length > 0 && /var\(--outline-action-default\)/.test(active) && /var\(--text-action-default\)/.test(active),
    'BUG-3: an active filter is painted with SEMANTIC action tokens (outline + ink), not a literal colour');
  ok(sfCss.indexOf('.c-search-field[data-active]') > sfCss.indexOf(':focus-within'),
    'BUG-3: the active-filter rule follows :hover/:focus-within (equal specificity → source order), so a passing hover cannot un-mark a live filter');
  ok(!/@media[^{]*\b(min|max)-width/.test(sfCss),
    'BUG-3: no viewport media query — desktop density rides :root[data-desktop] (DESIGN_SYSTEM)');

  const home = readFileSync(join(root, 'src/shells/home.html'), 'utf8');
  ok(/function leaveSurfaceSearch\(keepWithin\)/.test(home)
    && /resetSearchFields\(\{ keepWithin: keepWithin \|\| null \}\)/.test(home),
    'BUG-3: the home shell has ONE surface-exit chokepoint, so a new exit path has one thing to call');
  const show = home.slice(home.indexOf('function showView(navId)'), home.indexOf('NUDGE QUEUE'));
  ok(/leaveSurfaceSearch\(isChats \? chatsView : isWallet \? walletView : isApps \? appsView : null\)/.test(show),
    'BUG-3: a TAB SWITCH drops the query of the tab being left and KEEPS the one being entered (the field the user can actually see)');
  ok(/function openContacts\([\s\S]{0,240}?leaveSurfaceSearch\(\);/.test(home),
    'BUG-3: opening the contacts takeover drops it too — that is Damir\'s exact path (chats → FAB → create group → back)');
  ok((home.match(/leaveSurfaceSearch\(\);\s*(?:\/\/[^\n]*)?\n?\s*const over = document\.createElement\('div'\);/g) || []).length === 2,
    'BUG-3: both wallet takeovers (Receive and Send) drop it — a cover over the tab is leaving the tab');
  ok(/setNavActive\(nav, 'account'\);[\s\S]{0,300}?leaveSurfaceSearch\(\);/.test(home),
    'BUG-3: opening the Account peer pane drops it — the tab underneath has been left');
  ok(/#wallet-scroll > \.c-wallet-tools\.is-pinned/.test(home) && /position: sticky/.test(home)
    && /walletTools\.classList\.toggle\('is-pinned'/.test(home),
    'BUG-3: the wallet tools row is the one long-lived home field INSIDE its scroller — while filtering it pins, so an active filter cannot scroll out of sight');
  ok(!/:has\(/.test(home.slice(home.indexOf('BUG-3: an ACTIVE search filter'), home.indexOf('</style>'))),
    'BUG-3: the pin is class-toggled, not :has() — the WebView floor is Chromium 102 (#4) and :has() lands at 105');
}

console.log('BUG-3 — built home shell, the exact scenario that bit Damir');
{
  const shellPath = join(root, 'Spixi/Resources/Raw/html/index.html');
  if (!existsSync(shellPath)) {
    ok(false, 'built home shell exists (run build-shells.mjs before the smoke suite)');
  } else {
    const vc = new VirtualConsole();
    const dom = new JSDOM(readFileSync(shellPath, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
      url: 'file://' + shellPath, virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
      },
    });
    await sleep(2000);
    const W = dom.window, d = W.document;
    const b64 = (s) => Buffer.from(String(s), 'utf8').toString('base64');
    const rows = () => d.querySelectorAll('#chat-scroll .c-chatlist-item').length;
    const chatSearch = () => d.querySelector('#chats-view .c-search-field__input');
    const chatField = () => d.querySelector('#chats-view .c-search-field');
    const type = (input, v) => { input.value = v; input.dispatchEvent(new W.Event('input', { bubbles: true })); };
    const tap = (sel) => { const n = d.querySelector(sel); if (n) n.dispatchEvent(new W.MouseEvent('click', { bubbles: true, cancelable: true })); return !!n; };

    W.executeUiCommand(W.clearChats);
    for (const [a, n2] of [['a1', 'Alice'], ['a2', 'Bob']]) {
      W.executeUiCommand(W.addChat, ...[a, n2, String(Date.now()), 'img/spixiavatar.png', 'true', 'hi', '', '0', '', 'False'].map(b64));
    }
    W.executeUiCommand(W.clearChatsDone);
    await sleep(150);
    ok(rows() === 2 && !!chatSearch(), 'BUG-3 setup: two chats are listed and the chats search field is mounted');

    /* ① the state itself must be legible — a filtering field is not a resting input */
    type(chatSearch(), 'zzzzz');
    await sleep(80);
    ok(rows() === 0, 'BUG-3 setup: a query that matches nothing empties the list (this is what Damir was looking at)');
    ok(chatField().hasAttribute('data-active'),
      '★ BUG-3: while a query is on, the field carries data-active — "a filter is on" is visible at a glance, not inferred from an empty list');

    /* ② DAMIR'S EXACT PATH: chats (stale query) → FAB → contacts takeover → back. */
    ok(tap('#fab'), 'BUG-3 setup: the chats FAB exists (the path Damir took to create his group)');
    await sleep(120);
    ok(rows() === 2 && chatSearch().value === '',
      '★ BUG-3: leaving chats for the contacts takeover DROPS the query — coming back from creating a group, the list is whole. This is the bug that produced two phantom reports');
    ok(!chatField().hasAttribute('data-active'), 'BUG-3: …and the field drops its active-filter mark with the query');
    const tako = d.querySelector('.contacts-takeover');
    if (tako) { const c = [...tako.querySelectorAll('button')].find((b2) => /close|back|cancel/i.test(b2.getAttribute('aria-label') || b2.textContent)); if (c) c.click(); }
    await sleep(120);

    /* ③ a TAB SWITCH is leaving the surface too; the CHIP filter must survive it. */
    tap('.c-chip[data-filter="unread"]');
    await sleep(60);
    type(chatSearch(), 'qqqq');
    await sleep(80);
    ok(chatSearch().value === 'qqqq', 'BUG-3 setup: a query is live on the chats tab, with the Unread chip selected');
    tap('.c-bottomnav__item[data-id="wallet"]');
    await sleep(80);
    tap('.c-bottomnav__item[data-id="chats"]');
    await sleep(120);
    ok(chatSearch().value === '',
      '★ BUG-3: leave the tab and come back — the query is gone. A filter can only be on for the surface you are currently looking at');
    const unread = d.querySelector('.c-chip[data-filter="unread"]');
    const allChip = d.querySelector('.c-chip[data-filter="all"]');
    ok(unread && unread.getAttribute('aria-pressed') === 'true' && allChip.getAttribute('aria-pressed') === 'false',
      '★ BUG-3: the CHIP filter is untouched by the reset — chip state and the text query are different things (leaveRequestsFilterIfEmpty owns the chip)');

    /* ④ the surface being ENTERED keeps its own query — the reset is about leaving,
     *    not about every navigation event. */
    tap('.c-bottomnav__item[data-id="wallet"]');
    await sleep(80);
    const walletSearch = d.querySelector('#wallet-view .c-search-field__input');
    ok(!!walletSearch, 'BUG-3 setup: the wallet search field is mounted');
    type(walletSearch, 'ixi');
    await sleep(80);
    ok(d.querySelector('#wallet-scroll > .c-wallet-tools').classList.contains('is-pinned'),
      '★ BUG-3: the wallet tools row pins while filtering — it is the one long-lived home field inside its scroller, so the live filter cannot scroll away unseen');
    tap('.c-bottomnav__item[data-id="wallet"]');
    await sleep(80);
    ok(walletSearch.value === 'ixi',
      'BUG-3: re-selecting the tab you are ALREADY on keeps the query — keepWithin covers the surface being entered, so the rule never eats a query in front of the user');

    /* ★ N19 (#428) — the connecting LINE, driven end to end through the real push.
     * The state already existed as a title swap (M16/#59); this batch gives it the
     * bar. Both halves are driven by one call so they cannot disagree — and that is
     * exactly what a source read cannot prove, which is why it is executed here.
     * ⚠ The apps bar matters as much as the chats bar: #322 landed the title state on
     * all three tab titles precisely because a connecting app that shows "Apps" is
     * misleading, and a line on one bar only would re-open that. */
    {
      const chatsBar = d.querySelector('#chats-view .c-topbar');
      const appsBar = d.querySelector('#apps-view .c-topbar');
      ok(!!chatsBar && !!appsBar, 'N19 setup: the chats and apps topbars are mounted in the built home shell');
      W.executeUiCommand(W.showWarning, b64('Connecting to Ixian Platform...'));
      await sleep(80);
      ok(chatsBar.hasAttribute('data-connecting-bar') && appsBar.hasAttribute('data-connecting-bar'),
        '★ N19 (#428): a recognised connectivity push lights the line on BOTH in-page bars, not just the one the user is looking at');
      ok(chatsBar.querySelector('.c-topbar__title[data-connecting]'),
        '★ N19: …and the TITLE state still lands with it. One call drives both, so the line can never outlive the state that explains it');
      W.executeUiCommand(W.showWarning, b64(''));
      await sleep(80);
      ok(!chatsBar.hasAttribute('data-connecting-bar') && !appsBar.hasAttribute('data-connecting-bar'),
        '★ N19: the clear push removes the line from both bars. C# sends "" once connected (xaml:1929) — a line that survived it would advertise an offline app forever');
      /* an UNRECOGNISED warning is a banner, never the line — the #383/N40 split */
      W.executeUiCommand(W.showWarning, b64('A new version is available'));
      await sleep(80);
      ok(!chatsBar.hasAttribute('data-connecting-bar'),
        '★ N19: an actionable/unrecognised warning goes to the BANNER and leaves the line alone. Connecting-only was Damir\'s dial, and #417 is why: a general loading affordance would sit still through the 90 s it was hired for');
      W.executeUiCommand(W.showWarning, b64(''));
      await sleep(60);
    }
    tap('.c-bottomnav__item[data-id="chats"]');
    await sleep(120);
    ok(walletSearch.value === '' && !d.querySelector('#wallet-scroll > .c-wallet-tools').classList.contains('is-pinned'),
      '★ BUG-3: the wallet field inherits the identical rule — the fix lives in search-field.js, so Apps and Wallet cannot drift from Chats');

    /* ═══ ★ N64 ① (#403) — the app-level notice is no longer chats-only ═══
     * It mounted into #chats-banner, which lives INSIDE #chats-view, and
     * `.view[hidden] { display: none }` — so "an update is available" was invisible
     * on Wallet and Apps while the far less global connectivity state reached all
     * three tab titles. Driven here through the REAL showWarning push. */
    W.executeUiCommand(W.showWarning, b64('An update is available (0.9.99)'));
    await sleep(120);
    const bannerEl = () => d.querySelector('.c-banner');
    const bannerVisible = () => {
      const b = bannerEl();
      if (!b) return false;
      for (let n = b; n && n !== d.body; n = n.parentElement) {
        if (n.hasAttribute && n.hasAttribute('hidden')) return false;
      }
      return true;
    };
    ok(!!bannerEl() && bannerVisible(),
      '★ N64 ① setup: the update notice renders on the chats tab (the only place it EVER rendered)');
    tap('.c-bottomnav__item[data-id="wallet"]');
    await sleep(120);
    ok(bannerVisible() && !!d.querySelector('#wallet-banner .c-banner'),
      '★ N64 ①: it FOLLOWS to Wallet — one element re-parented into the visible tab\'s slot. Three copies would each need their own dismissal state, and dismissing one would leave the notice standing on the next tab');
    ok(!!d.querySelector('#wallet-view > #wallet-hero + #wallet-banner'),
      '★ N64 ①: on Wallet the slot sits BELOW the hero — the hero owns the top safe area and bleeds under the status bar (AND-7 / #401), so a strip above it would land where the clock is');
    tap('.c-bottomnav__item[data-id="apps"]');
    await sleep(120);
    ok(bannerVisible() && !!d.querySelector('#apps-banner .c-banner'),
      '★ N64 ①: …and to Apps');
    tap('.c-bottomnav__item[data-id="chats"]');
    await sleep(120);
    ok(bannerVisible() && !!d.querySelector('#chats-banner .c-banner'),
      '★ N64 ①: …and back to Chats. The notice is app-level; the tab it happens to be parented to is an implementation detail');
    dom.window.close();
  }
}

/* ═══ BUG-2 — the C#/bridge side of the apps-tab cost ══════════════════════════ */
console.log('BUG-2 — apps push cost (static)');
{
  const utils = readFileSync(join(root, 'Spixi/Utils/Utils.cs'), 'utf8');
  ok(/\(raw_data_uri_ok && isTransportSafeDataUri\(arg\)\) \? arg : escapeHtmlParameter\(arg\)/.test(utils),
    'BUG-2①: sendUiCommand emits a transport-safe data: URI verbatim (240 KB stays 240 KB) and base64-encodes everything else');
  ok(/bool raw_data_uri_ok = contentPage != null && contentPage\.supportsRawDataUriArgs;/.test(utils),
    '★ #340 (A-MAJOR-1/2): the fast path is gated on the RECEIVER, not on the shape of the value. The whitelist alone assumed every receiver runs native.js — two do not');
  const scpRaw = readFileSync(join(root, 'Spixi/Utils/SpixiContentPage.cs'), 'utf8');
  ok(/public bool supportsRawDataUriArgs[\s\S]{0,900}?return loadedHtmlFileName != null && !hasLegacyPageChrome\(loadedHtmlFileName\);/.test(scpRaw),
    '★ #340 (A-MAJOR-1): the gate FAILS CLOSED — the 8 legacy Raw/html pages still decode with js/spixi.js\'s unguarded atob, so a peer nickname of "data:;base64,x" would pass the whitelist, throw on the \':\', and drop the whole push (wallet_contact_request.setData is that page\'s only writer → a blank payment-confirm screen)');
  /* #340 r2 (reviewer catch): this pin used to grep SpixiContentPage.cs for the COMMENT
   * saying MiniAppPage never calls loadPage — mutation-dead, it could not fail for any
   * code change. The invariant lives in MiniAppPage.xaml.cs, so assert it THERE. It is
   * load-bearing: MiniAppPage sets _webView directly, which is the only reason
   * loadedHtmlFileName stays null and the gate fails closed for mini-app WebViews. The
   * natural future edit — route MiniAppPage through loadPage to pick up
   * applyPlatformPageChrome / pageSurfaceColor — silently opens the gate, and
   * SpixiAppSdk.onNetworkData carries PEER BYTES to a decoder shipped inside third-party
   * app packages that can never be regenerated. */
  // r3 reviewer: strip comments before testing. Documenting this very invariant IN
  // MiniAppPage ("does NOT go through loadPage()") would otherwise fail the pin — and that
  // exact sentence already exists in SpixiContentPage.cs, so it is the likely next edit.
  const miniApp = readFileSync(join(root, 'Spixi/Pages/MiniApps/MiniAppPage.xaml.cs'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  ok(!/\bloadPage\s*\(/.test(miniApp) && /_webView = webView;/.test(miniApp),
    '★ #340 (A-MAJOR-2): MiniAppPage still bypasses loadPage, so loadedHtmlFileName stays null and the data-URI gate fails CLOSED for mini-app WebViews — the base64-per-argument SDK contract is frozen and its decoder ships outside this repo');
  ok(/public static string escapeHtmlParameter\(string str\)\s*\{\s*return Convert\.ToBase64String\(Encoding\.UTF8\.GetBytes\(str\)\);/.test(utils),
    'BUG-2①: escapeHtmlParameter itself is UNCHANGED — the escaping contract for every other caller is untouched');
  const gate = utils.slice(utils.indexOf('private static bool isTransportSafeDataUri'), utils.indexOf('public static void sendUiCommand'));
  ok(/;base64,/.test(gate) && /c != '\+' && c != '\/' && c != '=' && c != ';' && c != ',' && c != '\.' && c != '-'/.test(gate),
    'BUG-2①: the bypass is a WHITELIST — the value lands in a single-quoted JS literal, so a quote/backslash/newline (a raw path, a chat message starting with "data:") falls back to the encoded path');

  const nat = readFileSync(join(root, 'src/bridge/native.js'), 'utf8');
  ok(!/Uint8Array\.from\(bin, \(c\)/.test(nat) && /bin\.charCodeAt\(j\)/.test(nat),
    'BUG-2②: b64ToUtf8 decodes with a plain index loop, not Uint8Array.from(bin, cb) — measured 108 ms → 3.4 ms per 5-icon tab switch in Chromium');
  ok(/if \(i === len\) return bin;/.test(nat),
    'BUG-2②: the ASCII fast path returns atob\'s own output (every data: URI, address and number is ASCII) — no Uint8Array, no TextDecoder');
  ok(/a\.startsWith\('data:'\) \? a : b64ToUtf8\(a\)/.test(nat),
    'BUG-2①: the dispatcher passes a data: URI through — unambiguous, since \':\' is outside the base64 alphabet');

  const hp = readFileSync(join(root, 'Spixi/Pages/Home/HomePage.xaml.cs'), 'utf8');
  ok(/loadApps\(!appsPushedToShell\);/.test(hp) && !/loadApps\(true\);\s*\n\s*\}\s*\n\s*\}\s*\n\s*else if \(current_url\.Equals\("ixian:downloads"/.test(hp),
    '★ BUG-2③: entering tab3 no longer FORCES clearApps + addApp×N — only the first entry into a fresh document, then the shouldRefreshApps gate decides');
  ok(/appsPushedToShell = pageLoaded;/.test(hp) && /appsPushedToShell = false;/.test(hp),
    'BUG-2③: the latch is set when the rows are pushed and reset in onLoaded — a fresh document (theme flip, language reload) is always re-fed');
  const onLoaded = hp.slice(hp.indexOf('private void onLoaded()'), hp.indexOf('setAsRoot();'));
  ok(/appsPushedToShell = false;/.test(onLoaded),
    'BUG-2③: the reset is in onLoaded specifically — every ixian:onload is a NEW document that holds no app rows');

  /* #340 (C-MAJOR-1) — the latch REMOVED the per-tab-entry self-heal, so a lost or
   * interleaved push went from transient to permanent-for-the-session. Three pins. */
  const loadAppsBody = hp.slice(hp.indexOf('private void loadApps(bool forceRefresh)'), hp.indexOf('private void onStartApp(string appId)'));
  ok(/lock \(appsPushLock\)/.test(loadAppsBody) && /private volatile bool appsPushedToShell/.test(hp) && /private readonly object appsPushLock/.test(hp),
    '★ #340 (C-MAJOR-1a): loadApps is SERIALIZED. Two callers on two threads with no marshalling — tab3 entry on the UI thread, Node.updateUILoop\'s tick via updateScreen. Interleaved, the tick\'s clearApps lands between the tap\'s addApp calls and the shell drops rows it already had; the latch then made that short list stick');
  ok(loadAppsBody.indexOf('appsPushedToShell = pageLoaded;') > loadAppsBody.indexOf('"addApp"'),
    '★ #340 (C-MAJOR-1b): the latch is set AFTER the addApp loop, not before — and only if this document could receive it (sendMessage queues while unloaded and Dispose() drops that queue, so latching on a discarded push is what made an empty apps tab permanent)');
  const reloadBody = hp.slice(hp.indexOf('public override void reload()'), hp.indexOf('removeDetailContent();'));
  const reloadShellBody = hp.slice(hp.indexOf('public void reloadShell()'), hp.indexOf('int gen = ++reloadShellGen;') + 400);
  ok(/appsPushedToShell = false;/.test(reloadBody) && /appsPushedToShell = false;/.test(reloadShellBody),
    '★ #340 (C-MAJOR-1c): the latch dies with the DOCUMENT — reload() AND reloadShell(), which calls base.reload() directly and so bypasses the override. Not only when the fresh document announces itself: ixian:onload is a known-racy handshake on WinUI (the #337 belt exists for it) and apps was the one surface with no other recovery path');

  const startAppWith = hp.slice(hp.indexOf('private void onStartAppWith(string payload)'), hp.indexOf('public void pickAppTargets(string appId)'));
  ok(/Node\.MiniAppManager\.getApp\(appId\) == null/.test(startAppWith)
    && startAppWith.indexOf('getApp(appId) == null') < startAppWith.indexOf('sendAppRequest'),
    '★ #340 (C-MINOR-3): startappwith rejects an id that names no installed app BEFORE it invites anyone. MiniApp.id comes verbatim out of a downloaded appinfo.spixi with no charset validation, so an id containing the ":|" delimiter mis-splits — worst case a real address lands in parts[0] and we send a network app-invite plus a chat card for an app that does not exist, then open a blank WebView');
}

/* —— #354/#355 — D-18 load-more dead end · AND-38 balance-toggle flash ——————— */
console.log('#354/#355 — D-18 poisoned-window guard · AND-38 balance tap highlight');
{
  const scp354 = readFileSync(join(root, 'Spixi/Pages/Chat/SingleChatPage.xaml.cs'), 'utf8');
  /* comment-free text (mutation-harness rule 2026-08-15): the pin tracks CODE shape,
     so a future explanatory comment inside onLoadMore cannot break it. */
  const scpNC354 = scp354.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  ok(/private void onLoadMore\(\)\s*\{\s*messagesToShow \+= Config\.messagesToLoad;\s*if \(messagesToShow == 100\)\s*\{\s*messagesToShow \+= Config\.messagesToLoad;\s*\}\s*loadMessages\(\);/.test(scpNC354),
    '★ D-18 (#354): onLoadMore steps OVER the exact-100 window. Ixian-Core Friend.getMessages re-reads storage only when the channel is uncached OR msg_count != 100 (Friend.cs:910; 0.9.8k = commit 097341a, no git tag exists) — a request of exactly 100 returns the stale previous window, loadMessages counts it short (the show_more test at :1536) and kills the pill with history still on disk. Under the N52 dial (50) the FIRST press lands exactly on 100 — the guard fires once and the walk continues 50 → 150 → 200. Delete the guard and the dead end returns');
  /* r2 (Opus MINOR-2): strip comments BEFORE matching, and anchor on the full
     assignment with its semicolon — "= 250" and a "was 25" trailing comment both
     evaded the first cut of this pin. */
  const cfgNC354 = readFileSync(join(root, 'Spixi/Meta/Config.cs'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  ok(/messagesToLoad = 50;/.test(cfgNC354),
    '★ D-18 (#354, re-walked at N52): the chunk dial stands at 50 (Config.cs:57). The poisoned-window arithmetic HOLDS: 50 → 100 (guarded, first press) → 150 → 200 — exactly one poisoned crossing, and the guard stays reachable. If this value moves again, re-walk: only a window of EXACTLY 100 hits the Core cache test');
  const whCssRaw354 = readFileSync(join(root, 'src/styles/components/wallet-hero.css'), 'utf8');
  /* r3 (Opus r2 MINOR-4): strip CSS comments BEFORE any structural test — a rule
     narrowed to one target with the other two names parked in a comment above it
     evaded the r2 cut of this pin. */
  const whCss354 = whCssRaw354.replace(/\/\*[\s\S]*?\*\//g, '');
  /* r2 (Opus MINOR-7): pin the BEHAVIOUR, not the formatting — any selector order
     or line layout passes, as long as one rule block carries the kill and names
     all three toggle targets. some(), not find(): the __qa rule ALSO kills the
     tap highlight (pre-existing, :104). */
  ok(whCss354.split('}').some((b) => b.includes('-webkit-tap-highlight-color: transparent')
    && ['__balance', '__compactbal', '__eye'].every((s) => b.includes('.c-wallet-hero' + s))),
    '★ AND-38 (#355): all three balance-toggle tap targets kill the NATIVE Android tap highlight — the "pressed state across the row" was the OS highlight over the click-bearing balance block, not pressable.js (no press family matches the hero ancestry; home.html:290 mounts the hero directly in #wallet-view)');
  ok((() => {
    /* brace-scan, not a regex: the eye's :active must sit INSIDE the desktop media
       block, and exist exactly once — a second, bare copy anywhere would re-paint
       the wash on Android and evade a substring test. */
    const mIdx = whCss354.indexOf('@media (hover: hover) and (pointer: fine) {');
    if (mIdx < 0) return false;
    let depth = 0; let mEnd = -1;
    for (let i = whCss354.indexOf('{', mIdx); i < whCss354.length; i++) {
      if (whCss354[i] === '{') depth++;
      else if (whCss354[i] === '}') { depth--; if (!depth) { mEnd = i; break; } }
    }
    if (mEnd < 0) return false;
    const mediaBlock = whCss354.slice(mIdx, mEnd);
    /* r3 (Opus r2 MINOR-3): whitespace-tolerant — a three-line reformat of the
       rule is not a defect and must pass. */
    return /\.c-wallet-hero__eye:active\s*\{\s*background:\s*var\(--surface-wash-on-hero-pressed\);\s*\}/.test(mediaBlock)
      && (whCss354.match(/\.c-wallet-hero__eye:active/g) || []).length === 1;
  })(),
    '★ AND-38 r2 (#355, Opus MINOR-5): the eye\'s :active wash is DESKTOP-GATED like its hover — the eye IS the balance toggle, and Damir\'s dial says the toggle shows no pressed state; a bare :active would keep painting the wash on every Android tap. The quick-action circles keep their ungated :active by design (navigation, not the toggle)');
}

/* —— #356 — D-19: sender-less multi-chat rows must not impersonate the GROUP —— */
console.log('#356→#370 — D-19/D-19b honest sender on address-less bot-room rows');
{
  /* comment-free text (mutation-harness rule 2026-08-15): pins track CODE shape. */
  const scp356 = readFileSync(join(root, 'Spixi/Pages/Chat/SingleChatPage.xaml.cs'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  ok(/nick = resolveNick\(message\.senderNick, message\.senderAddress\);\s*if \(message\.senderAddress == null\)\s*\{\s*resolvedSender = reverseResolveSenderByNick\(nick\);[\s\S]{0,400}?\}\s*address = resolvedSender != null \? resolvedSender\.ToString\(\) : "";/.test(scp356),
    '★ D-19b (#370, rebased from #356): a multi-chat row with no stored sender address gets ONE roster repair try (reverseResolveSenderByNick) and otherwise sends an EMPTY slot — never friend.nickname. The #356 impersonation (the group name styled as a copyable sender address) returns if the arm regrows the group nickname');
  ok(/else if \(friend\.bot \|\| friend\.type == FriendType\.Group\)\s*\{\s*avatar = "img\/spixiavatar\.png";\s*\}\s*else\s*\{\s*avatar = IxianHandler\.localStorage\.getAvatarPath\(friend\.walletAddress\.ToString\(\)\);\s*\}/.test(scp356),
    '★ D-19 (#356): a sender-less MULTI-chat row wears the neutral avatar, never the GROUP\'s photo — while the 1:1 null-address branch keeps the friend\'s photo (there the friend IS the sender). The order matters: the bot/Group test must come before the 1:1 fallback');
  /* r2 (loop r1 MINOR): pin the SOURCE and the BUILT artifact — the built file is
     regenerated by build-shells.mjs, so a source-only revert kept a built-only pin
     green until the next build. Both must carry the fix. */
  const chat356src = readFileSync(join(root, 'src/shells/chat.html'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const chat356 = readFileSync(join(root, 'Spixi/Resources/Raw/html/chat.html'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  ok(/\(a\.senderAddress \|\| a\.senderNick \|\| ''\) === \(b\.senderAddress \|\| b\.senderNick \|\| ''\)/.test(chat356src)
    && /\(a\.senderAddress \|\| a\.senderNick \|\| ''\) === \(b\.senderAddress \|\| b\.senderNick \|\| ''\)/.test(chat356),
    '★ D-19 r2 (#356, loop r1 MAJOR-4): the bubble-run key is address OR nick — Core 0.9.8k stores every bot-room row address-less, and the address-only key merged ALL received rows into ONE run: Bob\'s message rendered under Alice\'s label (label paints on first-of-run only) wearing the last row\'s avatar. Rows with neither identity share the empty key and merge with each other only — indistinguishable by construction; #370 renders such a run UNLABELED on non-blind surfaces (legacy parity) and placeholder-labeled in blind rooms');
  ok((() => {
    const nc = readFileSync(join(root, 'Spixi/Pages/Chat/SingleChatPage.xaml.cs'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    return /string address = friend\.nickname;\s*if\s*\(address == ""\)\s*\{\s*address = message\.senderAddress != null \? message\.senderAddress\.ToString\(\) : "";\s*\}/.test(nc);
  })(),
    '★ D-19 r2 (#356, loop r1 MAJOR-5): the address seeding at the top of insertMessage guards the Address? dereference — an EMPTY friend nickname (one empty nick push persists "") plus Core 0.9.8k\'s null sender address NRE\'d on every row; history load swallowed it per-row and the chat rendered permanently empty');
  {
    const copyLadder = (t) => {
      const a = t.indexOf('if (senderHasNick(rec)) return rec.senderNick;');
      if (a < 0) return false;
      const seg = t.slice(a, a + 500);
      const b = seg.indexOf("if (mode.blind) return s.hiddenMember || 'Hidden member';");
      const c = seg.indexOf("return rec.senderAddress ? truncateAddressMiddle(rec.senderAddress, 9, 6) : '';");
      return b > 0 && c > b;
    };
    ok(copyLadder(chat356src) && copyLadder(chat356),
      '★ D-19b (#370): the multi-select COPY path carries the AMENDED ladder — nick first (blind included), blind+nameless copies the placeholder (attribution without identity), non-blind+nameless copies truncated-address-or-nothing (legacy parity; chat-select renders an empty sender as bare text)');
  }
  ok(chat356.includes(": (rec.senderAddress || null)))")
    && chat356src.includes(": (rec.senderAddress || null)))"),
    '★ D-19b (#370): a non-blind no-nick no-address sender renders NO label at all — legacy parity (#369: the placeholder is DEAD on non-blind surfaces; the public Spixi bot room must never render masked). senderIsAddress and onSenderClick key off the empty address, so nothing interactive wires up on an anonymous row');
  ok((() => {
    /* the placeholder must live in the NON-blind branch of the same ternary that
       still protects blind chats — a rewrite that drops the blind arm would pass
       a bare substring test. Anchor both arms inside one sender: expression. */
    const armOrder = (t) => {
      const at = t.indexOf('sender: (!isSent && mode.isMulti)');
      if (at < 0) return false;
      const expr = t.slice(at, t.indexOf('senderIsAddress:', at));
      const nickArm = expr.indexOf('senderHasNick(rec) ? rec.senderNick');
      const blindArm = expr.indexOf("mode.blind ? ((window.SL || {}).hiddenMember || 'Hidden member')");
      const bareArm = expr.indexOf('(rec.senderAddress || null)');
      return nickArm >= 0 && blindArm > nickArm && bareArm > blindArm;
    };
    return armOrder(chat356) && armOrder(chat356src);
  })(),
    '★ D-19b (#370, the #369 AMENDED ladder): inside the ONE sender: ternary the NICK arm comes FIRST (a real nickname shows in blind rooms too — senderHasNick keeps the address-echo out), the blind arm falls to the placeholder (never an address), and the non-blind tail falls to truncated-address-or-NOTHING. Reordering any arm re-opens either the #348 blind leak or the #369 masking complaint');
}

/* —— #357 — D-20: "Connecting…" must survive a shell reload while offline ———— */
console.log('#357 — D-20 connectivity latch dies with the document');
{
  const hp357 = readFileSync(join(root, 'Spixi/Pages/Home/HomePage.xaml.cs'), 'utf8');
  const hpNC357 = hp357.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const reload357 = hpNC357.slice(hpNC357.indexOf('public override void reload()'), hpNC357.indexOf('removeDetailContent();'));
  const reloadShell357 = hpNC357.slice(hpNC357.indexOf('public void reloadShell()'), hpNC357.indexOf('int gen = ++reloadShellGen;') + 600);
  ok(/warningDisplayed = false;/.test(reload357) && /warningDisplayed = false;/.test(reloadShell357),
    '★ D-20 (#357): warningDisplayed resets in reload() AND reloadShell() — the latch is a C# field, so it survives the document it latched FOR. A language re-bake (SettingsPage → reloadShell) while OFFLINE built a fresh document whose titles said everything is fine, and the offline branch of updateScreen (!warningDisplayed) never corrected it (Damir 2026-08-16). Same class and same fix sites as the #340 apps latch');
  /* r2 (loop r1 MINOR-10): anchor the slice on the SECOND setHideBalance
     occurrence — the push inside onLoaded — not the ixian:hidebalance handler
     ~35k chars earlier, and bound it at the updateScreen() call it must precede. */
  const shb1 = hpNC357.indexOf('"setHideBalance"');
  const shbLoaded = hpNC357.indexOf('"setHideBalance"', shb1 + 1);
  const onLoaded357 = hpNC357.slice(shbLoaded, hpNC357.indexOf('updateScreen();', shbLoaded));
  ok(shbLoaded > 0 && /Utils\.sendUiCommand\(this, "showWarning", ""\);\s*warningDisplayed = false;/.test(onLoaded357),
    '★ D-20 r2 (#357, loop r1): onLoaded pushes the ANSWER — an unconditional "" clear — then resets the latch, BEFORE its updateScreen() call. Resetting the flag alone left a hole: an OnAppearing tick during the reload window queues "Connecting…" into the fresh document and latches; the reset then wiped the latch AFTER the push painted, and the online branch (if (warningDisplayed)) never sent the clear — a fresh document could wear "Connecting…" while online. The clear makes the fresh document KNOWN-empty; updateScreen re-pushes within a tick if really offline');
  ok(/private volatile bool warningDisplayed = false;/.test(hp357),
    'D-20 r2 (#357, loop r1): warningDisplayed is volatile — same access pattern as appsPushedToShell one screen up (UI-thread writes in onLoaded/reload/reloadShell, pool-thread read+write on Node.updateUILoop\'s tick), same keyword, same reason');
}

/* —— #358 — I-2: the SELECTED chip is outlined, not a tonal-button twin ———————— */
console.log('#358 — I-2 selected-chip outline');
{
  const chipCss = readFileSync(join(root, 'src/styles/components/chip.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = chipCss.split('}');
  const selRest = blocks.find((b) => /\.c-chip\[aria-pressed="true"\]\s*\{/.test(b)) || '';
  const selHover = blocks.find((b) => /\.c-chip\[aria-pressed="true"\]:not\(:disabled\):not\(\[data-readonly\]\):hover\s*\{/.test(b)) || '';
  const selActive = blocks.find((b) => /\.c-chip\[aria-pressed="true"\]:not\(:disabled\):not\(\[data-readonly\]\):active\s*\{/.test(b)) || '';
  ok(/border-color:\s*var\(--outline-action-default\)/.test(selRest)
    && /border-color:\s*var\(--outline-action-hover\)/.test(selHover)
    && /border-color:\s*var\(--outline-action-pressed\)/.test(selActive),
    '★ I-2 (#358): the selected chip carries the OUTLINE state ladder (default/hover/pressed) — a selected chip and a tonal button both paint --surface-action-tonal-default, so "selected" and "button" rendered identically (Damir F5 2026-08-15). The border slot pre-exists on every chip (--outline-width-1), so the outline adds zero layout shift (#51 lesson)');
  ok(!/border-color:\s*transparent/.test(selRest + selHover + selActive),
    '★ I-2 r0 (#358): no aria-pressed chip block re-declares border-color: transparent — the outline must not flicker off on hover or press (the pre-I-2 rules zeroed it in all three states, and one surviving transparent would win its state back)');
  /* r2 (loop r1 MAJOR-7): active must actually PAINT under a mouse. The old ladder
     claimed "source order at equal specificity" while :not(:disabled):hover
     out-specified a bare :active by one class — the pressed rung was unreachable
     on desktop. Pin the tie: each :active twin carries the SAME :not() chain as
     its hover, and sits LATER in the file. */
  const selHoverIdx = chipCss.indexOf(':not(:disabled):not([data-readonly]):hover', chipCss.indexOf('[aria-pressed="true"]:not'));
  const selActiveIdx = chipCss.indexOf('[aria-pressed="true"]:not(:disabled):not([data-readonly]):active');
  const unselActiveIdx = chipCss.indexOf('.c-chip:not(:disabled):not([data-readonly]):active');
  ok(selHoverIdx > 0 && selActiveIdx > selHoverIdx && unselActiveIdx > 0,
    '★ I-2 r2 (#358, loop r1 MAJOR-7): the :active rules carry the SAME :not(:disabled):not([data-readonly]) chain as their hover twins and sit later in source — equal specificity + source order is what makes the pressed rung reachable by mouse; the :not([data-readonly]) also stops display-tag chips (spans match :active) from wearing the selected skin');
  ok(/\[aria-pressed="true"\]:not\(:disabled\):not\(\[data-readonly\]\):active\s*\{\s*background:\s*var\(--surface-action-tonal-default\)/.test(chipCss),
    '★ I-2 r2 (#358, loop r1 MAJOR-6): the selected PRESS keeps the DEFAULT fill — on the old tonal-pressed fill the pressed outline measured 2.31:1 in dark (200-on-500), under the 1.4.11 bar at the exact moment the outline is the "selected, not a button" signal. Press feedback = outline + ink + the #343 scale. Dial rider on the F5 checklist');
  /* r2 (loop r1: "no contrast is computed anywhere in the suite") — the claimed
     ratios are now EXECUTABLE. Resolve the token chains from tokens.css in both
     modes and compute WCAG 2.1 relative-luminance ratios; pure hex math, no Intl. */
  const tok358 = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const darkAt = tok358.indexOf('[data-theme="dark"]');
  const grab = (txt) => { const m2 = {}; for (const mm of txt.matchAll(/(--[\w-]+):\s*([^;]+);/g)) m2[mm[1]] = mm[2].trim(); return m2; };
  const lightVars = grab(tok358.slice(0, darkAt)); const darkVars = { ...lightVars, ...grab(tok358.slice(darkAt)) };
  const resolve = (vars, name, depth = 0) => { if (depth > 8) return null; const v = vars[name]; if (!v) return null; const r = v.match(/var\((--[\w-]+)/); return r ? resolve(vars, r[1], depth + 1) : v; };
  const lum = (hex) => { const h = hex.replace('#', ''); const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((u) => (u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
  /* r3 (r2 MINOR-4, mutation-proven): the fill token is PARSED from the matched
     chip.css block, not hardcoded — a chip.css fill swap must move the computed
     pair, or the pin is only testing the palette. */
  const fillOf = (block) => (block.match(/background:\s*var\((--[\w-]+)\)/) || [])[1] || null;
  const statePairs = [
    ['rest', '--outline-action-default', fillOf(selRest)],
    ['hover', '--outline-action-hover', fillOf(selHover)],
    ['press', '--outline-action-pressed', fillOf(selActive)],
  ];
  const pairs358 = [];
  for (const [mode, vars] of [['light', lightVars], ['dark', darkVars]]) {
    for (const [state, oTok, fTok] of statePairs) {
      const o = resolve(vars, oTok), f = fTok && resolve(vars, fTok);
      pairs358.push({ mode, state, r: o && f && /^#/.test(o) && /^#/.test(f) ? ratio(o, f) : 0 });
    }
  }
  ok(pairs358.every((p) => p.r >= 3),
    '★ I-2 r2 (#358): all six outline-vs-fill pairs of the selected ladder compute ≥3:1 (WCAG 1.4.11) from the LIVE token values, both modes — ' +
    pairs358.map((p) => p.mode + ' ' + p.state + ' ' + p.r.toFixed(2)).join(' · ') +
    '. A brand re-ramp that pushes any pair under the bar turns this red with no CSS change (the #241/#244 re-anchor is the precedent)');
}

/* —— #359 — D-17: the Apps search field must not paint-then-vanish ————————————— */
console.log('#359 — D-17 apps header unknown-state ghost');
{
  const ahCss = readFileSync(join(root, 'src/styles/components/apps-header.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  ok(/\.c-apps-header\[data-unknown\] \.c-apps-header__row\s*\{\s*visibility:\s*hidden;\s*\}/.test(ahCss),
    '★ D-17 (#359): the UNKNOWN window hides the search/layout row with visibility, NOT display — the box is reserved, so when rows land the row turns visible with zero layout shift, and when the zero gate opens instead, the swap to data-empty happens in a frame that was blank anyway. display:none here would re-create the has-apps down-jump the reservation exists to prevent');
  const home359 = readFileSync(join(root, 'Spixi/Resources/Raw/html/index.html'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*$/gm, '');
  ok(home359.includes("appsHeader.dataset.unknown = ''")
    && /if \('unknown' in appsHeader\.dataset\s*&& \(\(appsState\.apps \|\| \[\]\)\.length \|\| appsOpts\.zeroReady !== false\)\) \{\s*delete appsHeader\.dataset\.unknown;\s*\}/.test(home359),
    '★ D-17 (#359): the header is BORN unknown and the ghost drops exactly once, on FIRST knowledge (rows rendered, or the zero gate opened), inside the same scheduleAppsRender frame that paints the answer. One-way by construction: tab re-entry refills close zeroReady again (#340) but the deleted attribute never returns, so the row cannot blink on a slow-device mid-burst render');
  ok(/appsHeader\.dataset\.unknown = '';\s*setTimeout\(\(\) => \{ delete appsHeader\.dataset\.unknown; \}, 1500\);/.test(home359),
    '★ D-17 r2 (#359, loop r1 MAJOR-8): a 1500 ms WATCHDOG bounds the unknown window — the zero gate is armed only by apps bridge traffic, and the #340 latch gives one dropped tab3 push no second chance: without the bound, that failure hid the search field and the layout toggle for the whole session. Same philosophy as the chats stall watchdog: degrade to "render what you have", never latch a dead surface');
}

/* —— #360 — I-6: locale digit grouping, app-global, display only ——————————————— */
console.log('#360 — I-6 locale digit grouping (display skin over the #77 wire)');
{
  /* BEHAVIOURAL pins — the real functions, explicit locales (no doc shim). */
  const money360 = await import(new URL('../src/components/money.js', import.meta.url));
  const g = money360.groupAmountDisplay, u = money360.ungroupAmountInput, m360san = money360.sanitizeAmount;
  /* r3 (mutation L found the canary itself broken): sl-SI has CLDR
     minimumGroupingDigits=2, so 1234.5 renders UNGROUPED ("1234,5") on full ICU
     — the old 1234.5 probe read every Node as small-icu and skipped the
     locale-exact pins VACUOUSLY. 123456.5 groups everywhere sl data exists. */
  const icuOk = (() => { try { return new Intl.NumberFormat('sl-SI').format(123456.5) === '123.456,5'; } catch (e) { return false; } })();
  if (!icuOk) console.log('  ~ ICU canary: small-icu Node — locale-exact #360 pins skipped (grouping degrades to en, correctness pins still run)');
  ok(!icuOk || (g('3000000.5', 'sl-SI') === '3.000.000,5' && g('1234567.89', 'en-US') === '1,234,567.89'
    && g('3000000.5', 'fr-FR').endsWith(',5') && !/\d{4}/.test(g('3000000.5', 'fr-FR'))),
    '★ I-6 (#360): grouping and the decimal mark travel TOGETHER per locale — "3.000" is three thousand in sl and three point zero in en, so a mixed convention would be actively misleading. CLDR via Intl.NumberFormat, BigInt path (Ixian-scale ints never touch a float, #135-M1)');
  ok(g('007', 'en-US') === '007' && g('3.', 'en-US') === '3.' && g('.5', 'sl-SI') === ',5' && g('abc', 'sl-SI') === 'abc' && g('', 'en-US') === '',
    'I-6 (#360): mid-typing forms survive the display skin — leading zeros are not rewritten, a trailing separator stays (the user is mid-decimal), non-amounts pass through untouched');
  ok(u('1.500', 'sl-SI') === '1500' && u('1.5', 'sl-SI') === '1.5' && u('3.000.000,5', 'sl-SI') === '3000000.5'
    && u('3,000,000.5', 'en-US') === '3000000.5' && u('12,5', 'en-US') === '12,5' && u('1500.5', 'sl-SI') === '1500.5',
    '★ I-6 (#360): the input inverse is magnitude-safe BOTH ways — exactly-3-digit runs are grouping (stripped), anything else keeps its decimal meaning. en "12,5" passes through UNTOUCHED so sanitizeAmount\'s #135-M2 decimal rule still owns it, and a canonical "1500.5" dropped into a ","-decimal locale is NOT re-read as grouping');
  /* ★ r2 (loop r1 CRITICAL-1 + MAJOR-4-pins): the round-trip pin now drives the
     REAL per-edit pipeline — display + one typed digit → amountEditToCanonical →
     sanitizeAmount — across every production locale whose dictionary ships.
     The r1 pin fed the already-known canonical back to the formatter and could
     not fail. N4 (#379): the five un-hidden locales joined, as the RUNTIME
     codes docLocale() actually serves (<html lang> lowercase; cn-cn → zh-cn
     via setDocLang). Coverage note (r2 NIT-7): their separator PAIRS duplicate
     already-pinned ones (ru-RU already brings NBSP) — this is a belt over the
     exact runtime codes, not new separator coverage. */
  const LOCALES360 = ['en-US', 'de-DE', 'es-CO', 'fr-FR', 'pt-BR', 'ru-RU', 'sl-SI',
    'it-it', 'id-id', 'lt-lt', 'zh-cn', 'ja-jp'];
  ok(!icuOk || LOCALES360.every((L) => ['1234', '123456', '3000000'].every((canon) => {
    /* through the ROUTER, with the event shapes the handlers actually receive —
       a router that stops dispatching to the per-edit inverse must fail here
       (r2 mutation L found the direct-call version of this pin evadable). */
    const shown = g(canon, L);
    const typed = shown + '5';
    const canonBack = m360san(money360.amountInputToCanonical(typed, typed.length, { inputType: 'insertText', data: '5' }, L, true));
    const bksp = shown.slice(0, -1);
    const canonDel = m360san(money360.amountInputToCanonical(bksp, bksp.length, { inputType: 'deleteContentBackward', data: null }, L, true));
    /* r2 MAJOR-1: a PASTE into the non-empty field is the same mid-edit class —
       inputType routing sent it to the settled heuristic and re-opened the
       CRITICAL on the paste path. And a paste into an EMPTY field keeps the
       outside-convention reading (en "12,5" stays decimal via #135-M2). */
    const pasted = m360san(money360.amountInputToCanonical(typed, typed.length, { inputType: 'insertFromPaste', data: null }, L, true));
    return canonBack === canon + '5' && canonDel === canon.slice(0, -1) && pasted === canon + '5';
  })),
    '★ I-6 r2 (#360, loop r1 CRITICAL-1): typing a digit into a GROUPED display — and backspacing one out — round-trips exactly in every shipped locale. The r1 heuristic pattern-guessed on mid-edit strings ("1,2345" is not a settled pattern), fell through to the #135-M2 comma rule, and shipped 1.2345 for a typed 12345 into the bridge payload. The per-edit inverse strips OUR separators unconditionally; only a JUST-TYPED \'.\'/\',\' is decimal intent');
  ok(m360san(money360.amountInputToCanonical('12,5', 4, { inputType: 'insertFromPaste', data: null }, 'en-US', false)) === '12.5',
    'I-6 r3 (#360, r2 MAJOR-1): paste into an EMPTY field keeps the settled reading — en "12,5" is a decimal (#135-M2), because no separator in an empty field can be OURS');
  ok(icuOk ? (money360.amountEditToCanonical('12,', 3, ',', 'en-US') === '12.'
      && money360.amountEditToCanonical('12.', 3, '.', 'sl-SI') === '12.'
      && money360.amountCaretAfterFormat('.5', 1, ',5') === 1
      && money360.amountCaretAfterFormat('', 0, '') === 0)
    : (money360.amountEditToCanonical('12,', 3, ',', 'en-US') === '12.'),
    '★ I-6 r2 (#360, loop r1 MAJOR-2): a just-typed separator is DECIMAL INTENT in both families (en \',\' and a sl numpad \'.\' both land as \'.\'), and a caret with no digit before it lands after the leading separator instead of slamming to 0 — the old return 0 built ".52" BACKWARDS as "52,"');
  /* wiring pins — every surface goes through the one display layer. */
  const ws360 = readFileSync(join(root, 'src/components/wallet-send.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*$/gm, '');
  const wr360 = readFileSync(join(root, 'src/components/wallet-receive.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*$/gm, '');
  const ts360 = readFileSync(join(root, 'src/components/tip-sheet.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*$/gm, '');
  ok([ws360, wr360, ts360].every((f) => /addEventListener\('input', \(e\) => \{/.test(f) && /sanitizeAmount\(amountInputToCanonical\(disp, caret, e, undefined, !!state\.amount\)\)/.test(f)),
    '★ I-6 r2 (#360): all three amount inputs (send, receive, tip) route through amountInputToCanonical WITH the event — typing/deletion edits take the per-edit inverse, paste and synthetic dispatches (the QR seed path fires a plain Event) take the settled heuristic. The field holds the DISPLAY form, state holds the canonical, the #77 wire is untouched');
  ok(/amt\.value = groupAmountDisplay\(parts\[2\]\)/.test(ws360),
    '★ I-6 (#360): the QR-scan amount seeds the field in DISPLAY form — a raw canonical "1.500" (one-and-a-half with typed zeros) dropped into a ","-decimal locale would read as grouping: a 1000× error on a payment path');
  ok(/groupAmountDisplay\(fromUnits\(aU\)\)/.test(ws360) && /groupAmountDisplay\(fromUnits\(feeU\)\)/.test(ws360) && /groupAmountDisplay\(fromUnits\(aU \+ feeU\)\)/.test(ws360),
    'I-6 (#360): the review sheet groups Amount, Fee AND Total at full precision — separators are the only defence against a mistyped zero at the confirm moment (audit M3 exactness preserved: grouping adds separators, never drops digits)');
  const idx360 = readFileSync(join(root, 'Spixi/Resources/Raw/html/index.html'), 'utf8');
  ok(idx360.includes("groupAmountDisplay(zeroAmount(balance) ? '0.00' : balance)") && idx360.includes('formatIxiAmount(amount)'),
    'I-6 (#360): the built home shell routes the hero balance and the tx-row amounts through the locale layer (the hardcoded-comma amountWithCommas port is gone; tx IXI now obeys the #76/#77 truncate-not-round law the legacy port broke)');
  /* C# mirror — comment-free shape pins. */
  const utils360 = readFileSync(join(root, 'Spixi/Utils/Utils.cs'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  ok(/public static string amountToLocalizedDisplayString\(IxiNumber amount\)/.test(utils360)
    && /string frac = frac_full\.TrimEnd\('0'\);/.test(utils360)
    && !/Substring\(0, 2\)/.test(utils360.slice(utils360.indexOf('amountToLocalizedDisplayString'), utils360.indexOf('amountToLocalizedDisplayString') + 2200))
    && /SpixiLocalization\.getCurrentLanguage\(\)/.test(utils360),
    '★ I-6 r2 (#360, loop r1 MAJOR-3): the C# alert formatter keeps FULL precision (trailing zeros trimmed, NO 2-dp cap) with separators from the APP LANGUAGE. The insufficient-balance sentence exists to expose a SHORTFALL and the shortfall is usually the 0.005 fee — a 2-dp cap rendered "cost is 10, balance is 10", the exact r4-documented bug. String-only: an IxiNumber never passes through a float');
  ok(/case "de-de": case "es-co": case "fr-fr": case "pt-br": case "ru-ru": case "sl-si": case "sr-sp": case "en-us": case "it-it": case "id-id": case "lt-lt": case "cn-cn": case "ja-jp":/.test(utils360.replace(/\s+/g, ' '))
    && utils360.indexOf('switch (lang)') > utils360.indexOf('amountToLocalizedDisplayString')
    && /switch \(lang\)/.test(utils360.slice(utils360.indexOf('amountToLocalizedDisplayString'), utils360.indexOf('bytesToHumanFormatString'))),
    '★ I-6 r3 (#360, r2 MAJOR-2): the C# formatter resolves a culture ONLY for the languages the SHELL also localizes — a language with no FE dictionary keeps <html lang="en"> (build-strings-iife), so without the gate an it/id/lt user saw en-convention amounts on every FE surface and native-convention amounts in the alerts: the mixed convention I-6 exists to prevent, introduced by the batch');
  ok(/Utils\.amountToLocalizedDisplayString\(friend\.metaData\.botInfo\.cost\)/.test(readFileSync(join(root, 'Spixi/Pages/Chat/SingleChatPage.xaml.cs'), 'utf8')),
    'I-6 r2 (#360, loop r1 MINOR-8): the bot cost bar — the one other C#-composed amount — goes through the same formatter; a 0.005 IXI room rendered "0.00500000 IXI" directly above the alerts #360 fixed');
  const scp360 = readFileSync(join(root, 'Spixi/Pages/Chat/SingleChatPage.xaml.cs'), 'utf8');
  const wcrp360 = readFileSync(join(root, 'Spixi/Pages/Wallet/WalletContactRequestPage.xaml.cs'), 'utf8');
  const rawBalanceFmt = /String\.Format\(SpixiLocalization\._SL\("wallet-error-balance-text"\), (?!Utils\.amountToLocalizedDisplayString)/;
  ok(!rawBalanceFmt.test(scp360) && !rawBalanceFmt.test(wcrp360)
    && (scp360.match(/Utils\.amountToLocalizedDisplayString\(/g) || []).length >= 6
    && (wcrp360.match(/Utils\.amountToLocalizedDisplayString\(/g) || []).length >= 2,
    '★ I-6 (#360): every wallet-error-balance-text composition passes BOTH amounts through the C# mirror — no site ships a raw IxiNumber.ToString() into the sentence (Damir\'s repro: "333333333.03000000")');
}


/* ═════════ N-BATCH (cheap batch 2026-08-17): N5 · N22 · N24 · N32 · N36 · N38 ·
   N2a · N3a · N45 · N14a — every pin below was mutation-proven (fix reverted →
   pin fails → fix re-applied) at build time. ═════════ */
console.log('N-batch — static pins (N5 · N22 · N24 · N36 · N38 · N2a · N3a · N45)');
{
  const read = (pth) => readFileSync(join(root, pth), 'utf8');

  // —— N5: the Delete-data screen is responsive ——
  const ssCss = read('src/styles/components/settings-shell.css');
  ok(/\.c-settings-danger__body \.c-settings__row-sub \{\s*\n\s*white-space: normal;/.test(ssCss),
    'N5: danger-screen row subs WRAP (scoped — hub rows keep the I-11 one-line truncation)');
  ok(/\.c-settings__row-label \{[^}]*min-width: 0;/.test(ssCss.replace(/\/\*[\s\S]*?\*\//g, '')),
    'N5: the shrink hook the wrap depends on — .c-settings__row-label ships min-width:0 (the #140③ class); the loop removed three INERT duplicates the batch had added on top of it');
  ok(/flex: 0 0 clamp\(208px, var\(--sd-master-w, 328px\), calc\(100% - 320px\)\)/.test(read('src/shells/settings.html')),
    'N5 ★: the pane master column CLAMPS the stale --sd-master-w push (C# sends it once; a narrowed window starved the detail region and clipped the danger cards)');

  // —— N22: private-group topbar member count (C#) ——
  const scpN = read('Spixi/Pages/Chat/SingleChatPage.xaml.cs');
  ok(/N22 \(Damir, bot parity\)[\s\S]{0,2200}?memberCountText\(groupMemberCount\)[\s\S]{0,700}?lastGroupCountPushed = groupCountText/.test(scpN),
    'N22: a private group pushes the chat-member-count sub-line (bot parity), latched on text change — not at the 1 Hz tick (#288 churn class)');
  ok(/setOnlineStatus = false;\s*\n\s*lastGroupCountPushed = null;/.test(scpN),
    'N22: the count latch re-arms in onLoad — a WebView reload resets identity.sub, so an un-reset latch would leave the reloaded topbar countless');
  ok(/groupMemberCount = friend\.users\.contacts\.Count/.test(scpN),
    'N22: the count source is friend.users.contacts.Count — the SAME source ContactDetails pushes for the group-info surface, so topbar and pane can never disagree');

  // —— N24: apps-tab selected row (selectChat precedent) ——
  const hpN = read('Spixi/Pages/Home/HomePage.xaml.cs');
  ok(/overlay is AppDetailsPage[\s\S]{0,700}?"selectApp", \(\(AppDetailsPage\)overlay\)\.selectedAppId/.test(hpN)
    && !/pushPageLoaded\(new AppDetailsPage[\s\S]{0,400}?sendUiCommand\(this, "selectApp"/.test(hpN),
    'N24 (loop A-1): the highlight rides onOverlayPresented — presentation is the truth; a fire-and-forget push at a pushPageLoaded call site highlighted a row whose staged pane was DROPPED (lock in place / preload busy)');
  ok(/overlay is AppDetailsPage[\s\S]{0,700}?Exists\(p => p is AppDetailsPage\)[\s\S]{0,200}?"selectApp", ""/.test(hpN),
    'N24: the clear is tag-replace-guarded — the OLD pane closes AFTER its replacement presented (ContactDetails precedent), so a details→details switch keeps the new highlight');
  ok(/selectApp\(id\) \{\s*\n\s*appsState\.selectedId = id \|\| '';/.test(read('src/shells/home.html')),
    'N24: the shell handler drives selection through the MODEL (state.selectedId), like selectChat');
  const aiCss = read('src/styles/components/apps-item.css');
  ok(/\.c-app-item__open\[aria-current\] \{\s*\n\s*background-color: var\(--surface-action-tonal-default\);\s*\n\s*background-image: linear-gradient\(var\(--surface-action-tonal-pressed\)/.test(aiCss)
    && /\.c-app-item__open:hover:not\(\[aria-current\]\)/.test(aiCss),
    'N24 ★ (loop B-MAJOR-1): aria-current lives on __OPEN with the A5 selected-family IMAGE SWAP — a wrapper stamp painted a sweep of tonal-default over tonal-default (invisible) and dragged the wrapper into base.css press variants (the grid card blink)');
  const baseCssN = read('src/styles/base.css');
  ok(/\.c-app-item\[data-pressfade="hold"\] \.c-app-item__open\[aria-current\] \{\s*\n\s*background-color: var\(--surface-action-tonal-pressed\);/.test(baseCssN)
    && /\.c-app-item\[data-pressfade="out"\] \.c-app-item__open\[aria-current\] \{\s*\n\s*background-color: var\(--surface-action-tonal-default\);/.test(baseCssN)
    && /\.c-app-item\[data-pressfade="out"\] \.c-app-item__open:hover:not\(\[aria-current\]\)/.test(baseCssN),
    'N24 (loop B-MAJOR-1): the selected app row HOLDS in tonal-pressed and LANDS on tonal-default — the chatlist/txlist fade pair, mirrored for the wrapper/child split; the hover landing excludes selected');

  // —— N36: select mode opts out of press feedback ——
  ok(/if \(t\.closest\('\[data-selecting\]'\)\) return;/.test(read('src/components/pressable.js')),
    'N36 ★: pressable bails inside a [data-selecting] container — a committed fill on a control the tap will never activate reads as a broken press');
  ok(/\[data-selecting\] \.c-bubble-row \.c-button,[\s\S]{0,500}?\.c-mbubble \{ pointer-events: none; \}/.test(read('src/styles/components/chat-select.css')),
    'N36: in-bubble controls are pointer-dead while selecting — their :active flashes die at the source and the tap lands on the row (toggle), text selection on bubble text untouched');

  // —— N38: desktop hides the dead wallet-receive Share ——
  ok(/onShare: isDesktopPresentation\(\)/.test(read('src/shells/home.html'))
    && /isDesktopPresentation,/.test(read('src/shells/home.html')),
    'N38: wallet-receive Share is desktop-gated with the SAME predicate family as the Account row (#348 W9) — wallet-receive.js skips the button when onShare is absent');

  // —— N2a: the list⇄grid toggle uses a real grid glyph ——
  ok(/icon\(target === 'grid' \? 'layout-grid' : 'menu-2'/.test(read('src/components/apps-header.js')),
    'N2a: the grid-target toggle shows layout-grid, not the apps rocket — one glyph, one meaning');
  ok(read('src/components/icons.js').includes('"layout-grid"') && existsSync(join(root, 'src/assets/icons/tabler-icon-layout-grid.svg')),
    'N2a: layout-grid is a REGISTRY icon from a real asset (derived from the apps.svg square geometry — swap with a Figma export at will)');

  // —— N3a: the em-dash gates (regression: new copy with — fails the run) ——
  const emDash = String.fromCharCode(0x2014);
  const enDict = JSON.parse(read('src/strings/en-us.json'));
  ok(Object.values(enDict).every((v) => !String(v).includes(emDash)),
    'N3a ★ GATE: zero em-dashes in the en-us dictionary — the sweep holds for every future extract');
  for (const code of ['de-de', 'es-co', 'fr-fr', 'pt-br', 'ru-ru', 'sl-si', 'sr-sp',
    'it-it', 'id-id', 'lt-lt', 'cn-cn', 'ja-jp']) {   // N4 (#379): the five ride the same gate
    const dict = JSON.parse(read('src/strings/' + code + '.json'));
    ok(Object.values(dict).every((v) => !String(v).includes(emDash)),
      'N3a GATE: zero em-dashes in the BUILT ' + code + ' dictionary (drafts + the six legacy feeder values swept)');
  }
  for (const code of ['pt-br', 'ru-ru', 'sr-sp', 'sl-si',
    'it-it', 'id-id', 'lt-lt', 'cn-cn', 'ja-jp']) {   // N4 (#379): all built-locale legacy sets feed now
    const lang = read('Spixi/Resources/Raw/lang/' + code + '.txt');
    const feeders = lang.split('\n').filter((l) => /^(index-backup-prompt-desc|empty-state-detail-2) =/.test(l));
    ok(feeders.length > 0 && feeders.every((l) => !l.includes(emDash)),
      'N3a: the legacy ' + code + ' values that FEED redesigned surfaces (backup nudge reuse · empty_detail *SL) are dash-free — legacy-only ids stay untouched');
  }

  // —— N4 (#379): the five un-hidden locales ride the SHIPPED strings artifacts ——
  {
    const iife = read('src/demo/strings.iife.js');
    const shipped = read('Spixi/Resources/Raw/html/spixi.strings.js');
    for (const code of ['it-it', 'id-id', 'lt-lt', 'cn-cn', 'ja-jp']) {
      ok(iife.includes('"' + code + '":{') && shipped.includes('"' + code + '":{'),
        'N4: the ' + code + ' dictionary ships in BOTH strings artifacts (demo iife + Raw/html)');
    }
    const docMap = /var docCode = code === 'cn-cn' \? 'zh-cn' : code;/;
    ok(docMap.test(iife) && docMap.test(shipped),
      'N4: setDocLang maps cn-cn → zh-cn for the DOCUMENT locale only (cn-cn is a lang-file code, not a Chinese BCP-47 tag) — dictionary lookups stay cn-cn end-to-end');
    // behavioral: the mapping lands on <html lang> AND the lookup still returns Chinese
    const wCn = new JSDOM('<!doctype html><html lang="en"><body></body></html>', { runScripts: 'outside-only' }).window;
    wCn.eval(iife);
    const dCn = wCn.SpixiStrings.get('cn-cn');
    ok(wCn.document.documentElement.lang === 'zh-cn' && !!dCn.about && dCn.about !== wCn.SpixiStrings.enUS.about,
      'N4 (behavioral): get("cn-cn") sets <html lang="zh-cn"> and returns the Chinese dictionary, never the en fallback');
    const wJa = new JSDOM('<!doctype html><html lang="en"><body></body></html>', { runScripts: 'outside-only' }).window;
    wJa.eval(iife);
    ok(wJa.SpixiStrings.get('ja-jp').about !== wJa.SpixiStrings.enUS.about && wJa.document.documentElement.lang === 'ja-jp',
      'N4 (behavioral): get("ja-jp") sets <html lang="ja-jp"> and returns Japanese — an un-hidden locale loads end-to-end');

    /* —— N4 (Opus loop r1 MINOR-5): the four locale lists can only move TOGETHER.
     * With PENDING_LANGS empty there is no pending-row data left to catch a
     * picker row added ahead of its dictionary — the A4 half-translated-app bug
     * would return silently. So pin the sync: settings LANGS === LAUNCH_LANGS
     * === build-locales LANGS ∪ en-us, and every code ships a dictionary. */
    const codesOf = (src, marker) => {
      const seg = src.slice(src.indexOf(marker));
      return [...seg.slice(0, seg.indexOf('];')).matchAll(/'([a-z]{2}-[a-z]{2})'/g)].map((m) => m[1]);
    };
    /* r2 NIT-6: slice to the array's closing `];`, never a fixed window — a
     * fixed 900 chars truncates ~2 rows past the #378 launch-set growth and
     * the pin would false-fail at exactly the operation it guards. */
    const rowsOf = (src, marker) => {
      const seg = src.slice(src.indexOf(marker));
      return [...seg.slice(0, seg.indexOf('];')).matchAll(/code: '([a-z]{2}-[a-z]{2})'/g)].map((m) => m[1]);
    };
    const settingsLangs = rowsOf(read('src/shells/settings.html'), 'const LANGS = [');
    const launchLangs = rowsOf(read('src/components/launch-shell.js'), 'const LAUNCH_LANGS = [');
    const buildLangs = codesOf(read('scripts/build-locales.mjs'), 'const LANGS = [');
    const iifeLangs = codesOf(read('scripts/build-strings-iife.mjs'), 'const LOCALES = [');
    const same = (a, b) => a.length === b.length && a.slice().sort().join() === b.slice().sort().join();
    ok(settingsLangs.length === 13 && same(settingsLangs, launchLangs)
      && same(settingsLangs, ['en-us'].concat(buildLangs)) && same(buildLangs, iifeLangs),
      'N4: the two pickers, build-locales LANGS and build-strings-iife LOCALES agree (13 = en-us + 12) — a row cannot ship ahead of its dictionary');
    ok(settingsLangs.every((c) => existsSync(join(root, 'src/strings', c + '.json'))),
      'N4: every picker code has a built dictionary file in src/strings/');

    /* the overflow audit is a GATE, not an orphan tool (loop r1 NIT-6): a new
     * locale batch that reintroduces a breaker fails the suite here. Scope
     * honesty (r2 NIT-9): the audit covers HARVESTED call-site labels — a
     * label whose call site the harvester cannot parse is not covered.
     * process.execPath, not 'node' (r2 NIT-5): the suite must not depend on
     * PATH when invoked via an absolute node. */
    let overflowOk = true, overflowTail = '';
    try {
      const { execSync } = await import('node:child_process');
      overflowTail = execSync(JSON.stringify(process.execPath) + ' ' + JSON.stringify(join(root, 'scripts/i18n-overflow-audit.mjs')), { encoding: 'utf8' }).trim().split('\n').pop();
    } catch (e) { overflowOk = false; overflowTail = String(e.stdout || e.message).trim().split('\n').slice(-3).join(' · '); }
    ok(overflowOk && /NO BREAKERS/.test(overflowTail),
      'N4 GATE: i18n-overflow-audit reports NO BREAKERS on harvested labels — ' + overflowTail);

    /* —— N4 loop r2 F1/F4: the badge-caps class stays sentence-case in the
     * three batch-introduced locales, pinned on the BUILT dictionaries —
     * build-locales regenerates them from the legacy txt on every run, so a
     * future BE-side legacy refresh would silently revert the fix (#285/#288
     * stale-regeneration class). en FE canon is sentence-case; the 7 older
     * locales keep their inherited caps (logged residual, copy-round scope). */
    const isShout = (v) => { const L = String(v).replace(/[^A-Za-zÀ-žĀ-ſ]/g, ''); return L.length >= 4 && L === L.toUpperCase(); };
    for (const code of ['it-it', 'id-id', 'lt-lt']) {
      const dict4 = JSON.parse(read('src/strings/' + code + '.json'));
      const shouty = ['declined', 'pending', 'txPending', 'txConfirmed', 'unlocked'].filter((k) => isShout(dict4[k]));
      ok(shouty.length === 0,
        'N4 r2: ' + code + ' badge/status values are sentence-case (no ALL-CAPS legacy bleed)' + (shouty.length ? ' — SHOUTING: ' + shouty.join(', ') : ''));
    }
    {
      const idDict = JSON.parse(read('src/strings/id-id.json'));
      const idShout = ['save', 'unlock', 'install', 'proceed', 'dismiss', 'sendRequest', 'deleteHistory', 'clearDownloads'].filter((k) => isShout(idDict[k]));
      ok(idShout.length === 0,
        'N4 r2 (r1 MAJOR-1): the id-id CTA set is sentence-case in the BUILT dictionary — the legacy file was the only shouting outlier and reuse shadows any draft' + (idShout.length ? ' — SHOUTING: ' + idShout.join(', ') : ''));
      /* r3 N1: MID-value shouts ("Spixi TERKUNCI" on the app-lock title,
       * "Pembayaran sudah TERKIRIM" payment bubbles) escape the whole-value
       * predicate — pin the three surfaces with an uppercase-run check.
       * Latin-only by design (r3 N2 logged): extend to \p{Lu} when the 7
       * older locales' caps ride the copy round. */
      const midShout = (v) => /[A-ZÀ-ŽĀ-Ž]{4,}/.test(String(v));
      const idMid = ['lockTitle', 'paymentSent', 'paymentReceived'].filter((k) => midShout(idDict[k]));
      ok(idMid.length === 0,
        'N4 r3: the id-id lock title + payment bubble titles carry no mid-value shout' + (idMid.length ? ' — SHOUTING: ' + idMid.join(', ') : ''));
    }

    /* —— N4 (loop r1 MINOR-3): variant cultures resolve to the FILE code ——
     * it-ch prefix-resolves to it-it.txt but getCurrentLanguage() returned the
     * raw request: translated UI + en-convention amounts (the Utils gate knows
     * no "it-ch") + a raw-code picker row with a false languagePending hint. */
    const sl4 = read('Spixi/Lang/SpixiLocalization.cs');
    ok(/resolved_lang = found_lang_part;/.test(sl4) && /language = resolved_lang;/.test(sl4),
      'N4: SpixiLocalization.loadLanguage stores the RESOLVED file code — getCurrentLanguage() can never return a variant the culture gate and pickers do not know');
    ok(/sendUiCommand\(this, "setLanguage", SPIXI\.Lang\.SpixiLocalization\.getCurrentLanguage\(\)\);/.test(read('Spixi/Pages/Settings/SettingsPage.xaml.cs')),
      'N4: the Account hub S3 push carries the RESOLVED code, not the raw preference — a persisted "it-ch" renders the real Italiano row');
  }

  // —— N45: the PNG art really ships where devices load it ——
  for (const rel of ['images/apps-es.png', 'images/chats-es.png', 'images/wallet-es.png',
    'images/explore-banner.png', 'images/backup.png', 'images/onboarding/backup.png',
    'images/onboarding/rate.png', 'images/onboarding/restore.png', 'images/onboarding/step1.png',
    'images/onboarding/step2.png', 'images/onboarding/step3.png', 'images/onboarding/step4.png']) {
    ok(existsSync(join(root, 'Spixi/Resources/Raw/html', rel)) && existsSync(join(root, 'src/demo', rel)),
      'N45: ' + rel + ' ships in BOTH the source images dir (build-shells copies it) and the packaged Raw/html');
  }
  const n45Sweep = read('src/shells/home.html') + read('src/shells/settings.html') + read('src/shells/settings_backup.html') + read('src/components/launch-shell.js') + read('src/components/chats-shell.js') + read('src/components/wallet-shell.js') + read('src/demo/apps.html') + read('src/demo/chats.html') + read('src/demo/desktop.html');
  ok(!/images\/(?:apps-es|chats-es|wallet-es|explore-banner|backup|restore|step[1-4])\.svg'/.test(n45Sweep)
    && !/'(?:step[1-4]|restore|backup)\.svg'/.test(n45Sweep),
    'N45: no shipped reference still points at an SVG the PNG dial replaced — incl. the launch base+name concatenations the first sweep was blind to (re-review MINOR-2); contacts-es + join-community stay SVG (no PNG export exists)');
  ok(/base \+ 'step1\.png'/.test(read('src/components/launch-shell.js')) && /base \+ 'restore\.png'/.test(read('src/components/launch-shell.js')),
    'N45: the launch carousel + restore hero load the PNG canon at the SOURCE (the demo dom pin covers steps; restore had no reference pin at all — re-review MINOR-2)');
}

console.log('N-batch — behavioural pins (N32 money · N24 render · N36 press · N14a nudge)');
{
  const dom = await load('chats.html');
  const W = dom.window, d = W.document, S = W.Spixi;
  const phone = d.querySelector('.demo-phone') || d.body;

  // —— N32: absolute zero reads 0.00; nonzero keeps the #77 law ——
  ok(S.formatIxiAmount('0') === '0.00' && S.formatIxiAmount('0.000') === '0.00' && S.formatIxiAmount('+0') === '+0.00',
    'N32 ★: an absolute-zero amount renders 0.00 (locale separators via groupAmountDisplay) — the bare "0" read as broken on the hero');
  ok(S.formatIxiAmount('5') === '5' && S.formatIxiAmount('1.50') === '1.5' && S.formatIxiAmount('0.005') === '0.005',
    'N32: NONZERO display is untouched — round stays bare, trailing zeros still trim, the sub-0.01 rescue still shows the real amount (#77 law intact)');
  ok(S.zeroAmount('0') && S.zeroAmount('0.00') && S.zeroAmount('+0.0') && !S.zeroAmount('0.005') && !S.zeroAmount('1') && !S.zeroAmount('') && !S.zeroAmount('abc'),
    'N32: zeroAmount is exact — zero in any spelling, never for nonzero/empty/non-numeric (the hero keeps empty-until-pushed)');

  // —— N24: renderAppsList stamps aria-current from state.selectedId ——
  {
    const list = d.createElement('div');
    d.body.append(list);
    const st = { apps: [{ id: 'a1', name: 'Alpha' }, { id: 'a2', name: 'Beta' }], query: '', layout: 'list', selectedId: 'a2' };
    S.renderAppsList(list, st, {});
    const rows = [...list.querySelectorAll('.c-app-item')];
    const opens = rows.map((r) => r.querySelector('.c-app-item__open'));
    ok(rows.length === 2 && opens[1].getAttribute('aria-current') === 'true' && !opens[0].hasAttribute('aria-current')
      && rows.every((r) => !r.hasAttribute('aria-current')),
      'N24: aria-current sits on the selected row\'s __OPEN button — and only there (the wrapper stays attribute-free: base.css guards, SR focus announcement)');
    st.selectedId = '';
    S.renderAppsList(list, st, {});
    ok([...list.querySelectorAll('.c-app-item__open')].every((r) => !r.hasAttribute('aria-current')),
      'N24: a cleared selection sheds the highlight on REUSED rows (the stamp lives outside the row cache — rowFresh stays selection-blind)');
    list.remove();
  }

  // —— N36: a press inside a selecting container paints nothing ——
  {
    const pressRoot = d.createElement('div');
    /* loop B-NIT-9: the REAL production subject — a card .c-button inside a
       .c-bubble-row inside the selecting log (jsdom has no hit-testing, so the
       CSS pointer-events belt is invisible here; this exercises the JS bail). */
    pressRoot.innerHTML = '<div data-selecting><div class="c-bubble-row"><button class="c-button" id="np-in"></button></div></div><div class="c-chatlist-item" id="np-out"></div>';
    d.body.append(pressRoot);
    S.attachPressFeedback({ root: pressRoot });
    const pe = (type, x, y) => new W.MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
    const rowIn = pressRoot.querySelector('#np-in'), rowOut = pressRoot.querySelector('#np-out');
    rowIn.dispatchEvent(pe('pointerdown', 50, 50));
    ok(rowIn.dataset.pressed === undefined,
      'N36 ★: a pointerdown on a card button inside [data-selecting] arms NO press — the selected tint is the only sanctioned visual in select mode');
    rowIn.dispatchEvent(pe('pointerup', 50, 50));
    rowOut.dispatchEvent(pe('pointerdown', 50, 50));
    ok(rowOut.dataset.pressed === 'row',
      'N36: the SAME listener still presses normally outside the selecting container (the bail is scoped, not a kill-switch)');
    rowOut.dispatchEvent(pe('pointerup', 50, 50));
    pressRoot.remove();
  }

  // —— N14a: the rating nudge carries the rate-me art (backup-nudge grammar) ——
  {
    const sheetR = S.showRatingNudge({ host: phone, illustration: 'images/onboarding/rate.png' });
    const artR = sheetR.querySelector('.c-rating-nudge__illo');
    const discR = sheetR.querySelector('.c-rating-nudge__disc');
    ok(!!artR && artR.getAttribute('alt') === '' && discR.hidden,
      'N14a: the illustration leads (decorative alt="") and the brand disc hides — the backup-nudge grammar, one nudge family');
    artR.dispatchEvent(new W.Event('error'));
    ok(!sheetR.querySelector('.c-rating-nudge__illo') && !discR.hidden,
      'N14a: img error → the disc returns (fail-soft; a missing file can never leave a blank slot)');
    const sheetR2 = S.showRatingNudge({ host: phone });
    ok(!sheetR2.querySelector('.c-rating-nudge__illo') && !sheetR2.querySelector('.c-rating-nudge__disc').hidden,
      'N14a: no illustration opt → the pre-N14a disc look, byte-identical behaviour for demo callers');
    ok(/illustration: 'images\/onboarding\/rate\.png'/.test(readFileSync(join(root, 'src/shells/home.html'), 'utf8')),
      'N14a: the PRODUCTION shell passes the rate-me art to the nudge (N45 ships the file)');
  }
}

console.log('R1 identity round — N1 avatar rework (#364) · N34 owner chip (#365) · N26/D-5 relation (#366) · N27 remove-blocked (#367)');
{
  const read = (pth) => readFileSync(join(root, pth), 'utf8');

  /* —— N1 (#364): the anchor palette, COMPUTED contrast gate ————————————— */
  const avCss = read('src/styles/components/avatar.css');
  const pairRe = /\[data-hue="(\d+)"\]\s*\{\s*--av-c1: hsl\((\d+),\s*(\d+)%,\s*(\d+)%\);\s*--av-c2: hsl\((\d+),\s*(\d+)%,\s*(\d+)%\);/g;
  const pairs = [...avCss.matchAll(pairRe)].map((m) => m.slice(1).map(Number));
  ok(pairs.length === 12 && pairs.every((p, i) => p[0] === i),
    'N1: avatar.css carries exactly 12 [data-hue] gradient pairs, indexed 0..11');
  const hsl2lum = (h, s, l) => {
    s /= 100; l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x]; else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
    const f = (v) => { v += m; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const whiteContrast = (h, s, l) => 1.05 / (hsl2lum(h, s, l) + 0.05);
  ok(pairs.every((p) => whiteContrast(p[1], p[2], p[3]) >= 4.5 && whiteContrast(p[4], p[5], p[6]) >= 4.5),
    'N1 ★: every anchor gradient measures >= 4.5:1 under white ink at BOTH stops — computed here, not asserted');
  ok(/\.c-avatar \{[\s\S]{0,900}?color: #fff;/.test(avCss),
    'N1: avatar ink is literal #fff in BOTH themes (the c-disc #170 grammar)');
  ok(!/--avatar-grad-s1/.test(avCss) && !/text-neutral-inverse-01/.test(avCss),
    'N1: the #37 per-theme S/L vars + flipping ink token are fully retired from avatar.css');
  const avJs = read('src/components/avatar.js');
  ok(/icon\(group \? 'users' : 'user-circle'/.test(avJs),
    'N1: the placeholder glyph branches on group — users vs user-circle');
  ok(/const ini = \(!group && name\)/.test(avJs),
    'N1: initials are person-only — a NAMED group still shows the group glyph');
  // group-flag threading, one pin per consumer (silent drops were the old failure mode)
  ok(/group: type === 'group'/.test(read('src/components/chatlist-item.js')),
    'N1: chatlist rows thread type→group into the avatar (the silently-dropped `type` is consumed now)');
  ok(/group: !!identity\.group/.test(read('src/components/topbar.js')),
    'N1: the chat topbar identity threads group');
  ok(/group: kind !== 'contact'/.test(read('src/components/chat-info.js')),
    'N1: the chat-info hero threads group (group/bot kinds)');
  ok(/group: !!c\.isGroup/.test(read('src/components/contacts-shell.js')),
    'N1: contacts picker rows thread isGroup');
  ok(/group: chat\.type === 'group'/.test(read('src/components/chats-row-menu.js')),
    'N1: the row-menu/delete peer header threads type');
  ok(/group: !!mode\.isMulti/.test(read('src/shells/chat.html')),
    'N1: chat.html passes mode.isMulti as the topbar group flag');

  /* —— N26/D-5 (#366) + N27 (#367): C# source pins ————————————————————— */
  const scp366 = read('Spixi/Pages/Chat/SingleChatPage.xaml.cs');
  const base366 = read('Spixi/Utils/SpixiContentPage.cs');
  const cd366 = read('Spixi/Pages/Contacts/ContactDetails.xaml.cs');
  ok(/public static string contactRelationFor\(Address address\)/.test(base366)
    && /return "self";/.test(base366) && /return "contact";/.test(base366)
    && /return "pending";/.test(base366) && /return "none";/.test(base366),
    'D-5: contactRelationFor lives on SpixiContentPage with the 4-value vocabulary (one truth for all three pushes)');
  ok(/errorSending\.ToString\(\), relation\);/.test(scp366),
    'D-5: the per-message addMe/addThem push carries the trailing relation arg');
  ok(/relation = contactRelationFor\(resolvedSender\);/.test(scp366)
    && /!message\.localSender && !relationBlind/.test(scp366),
    'D-5 ★: relation is computed ONLY for received multi-chat rows, NEVER for a blind chat (identity-hint belt), and reads resolvedSender — a #370 reverse-resolved row gets the addressed-row treatment');
  // loop m2 REBASED: the '[Unknown]' key masked blind GROUPS only — the broad
  // botInfo predicate covers blind BOTS too (the #348 MAJOR-5 gap must not widen).
  ok(/"addContact", {2}address, nick, avatar, role\.ToString\(\), relation\);/.test(scp366)
    && /string relation = relBlind \? "" : contactRelationFor\(contactAddress\)/.test(scp366),
    'D-5: the roster addContact push carries relation, gated on the BROAD blind predicate (blind bots included)');
  ok(/message\.type == FriendMessageType\.standard && !message\.localSender && !relationBlind/.test(scp366),
    'D-5 (loop n2): the relation FriendList scan runs only for STANDARD rows — typed rows do not pay for it');
  ok(/"addMember", address, nick, avatar, contact\.Value\.getPrimaryRole\(\)\.ToString\(\), blind \? "" : contactRelationFor\(contactAddress\)\);/.test(cd366),
    'D-5: ContactDetails addMember carries relation ("" on blind rows)');
  ok(/public void sendContactRequestGuarded\(string str_address\)/.test(base366)
    && /sendContactRequestGuarded\(current_url\.Substring\("ixian:sendContactRequest:"\.Length\)\);/.test(scp366)
    && /sendContactRequestGuarded\(current_url\.Substring\("ixian:sendContactRequest:"\.Length\)\);/.test(cd366),
    'N26 ★: BOTH pages route ixian:sendContactRequest through the ONE guarded helper (self guard · heal · exists alert · requestAddSent marker)');
  ok(/catch \(Exception ex\)\s*\{\s*Logging\.warn\("sendContactRequest: invalid address payload/.test(base366),
    'N26: the address payload parse is try/catch-guarded (A-4 rule — the old SingleChatPage parse was bare)');
  ok(/FriendMessageType\.requestAddSent/.test(base366),
    'N26: the requestAddSent marker (#334 AND-17b) survived the move');
  // N27: enumerate-and-name, with the legacy alert as the empty-enumeration fallback
  ok(/f\.type == FriendType\.Group && f\.users != null && f\.users\.hasUser\(friend\.walletAddress\)/.test(cd366)
    && /sendUiCommand\(this, "removeBlocked", blockers\.ToArray\(\)\)/.test(cd366),
    'N27 ★: a refused remove enumerates the blocking groups (Core discards the list; C# re-runs the predicate and KEEPS it)');
  // loop n4 REBASED: the reference is snapshotted once (sortFriends reassigns
  // the field lock-free) — lock and iterate must use the same object.
  ok(/var friendsRef = FriendList\.friends;/.test(cd366) && /lock \(friendsRef\)/.test(cd366),
    'N27: the enumeration snapshots + locks ONE friends reference (Core lock parity, TOCTOU closed)');
  ok(/contact-details-cannotremovecontact-title/.test(cd366),
    'N27: the legacy alert survives as the empty-enumeration fallback (a refusal must always say something)');

  /* —— N26/D-5 + N27: shell source pins ————————————————————————————— */
  const chat366 = read('src/shells/chat.html');
  ok(/addThem\(id, address, nick, avatar, text, time, sent, confirmed, read, paid, errorSending, relation\)/.test(chat366),
    'D-5: chat.html addThem accepts the trailing relation (the old signature silently discarded trailing args)');
  ok(/const RELATIONS = new Set\(\['contact', 'pending', 'pending-in', 'none', 'self'\]\);/.test(chat366),
    'D-5: pushed relation values are validated against the closed vocabulary (+ pending-in, #371)');
  ok(/addContact\(address, nick, avatar, role, relation\)/.test(chat366),
    'D-5: the roster handler stopped discarding trailing args');
  ok(/requestedMembers\.add\(rec\.senderAddress\);/.test(chat366) && /requestedMembers\.clear\(\);/.test(chat366),
    'N26: the in-flight request latch exists AND resets per-peer (onChatScreenReady)');
  ok(/onRequest: \(rec\.senderAddress && relation === 'none'\)/.test(chat366),
    'N26 ★: the request button only exists for a true stranger — contact/pending/self/latched all stay inert');
  ok(/owner: isOwnerAddr\(rec\.senderAddress\)/.test(chat366),
    'N34: the member sheet carries the owner flag (matches the bubble chip)');
  ok(/roleBadge: \(!isSent && mode\.isMulti && !mode\.blind && isOwnerAddr\(rec\.senderAddress\)\)/.test(chat366),
    'N34 ★ (loop MAJOR-1): the chip gate carries !mode.blind — a blind chat must never mark one hidden member as Owner');
  ok(/if \(isOwnerAddr\(m\.address\)\) m\.owner = true;/.test(chat366),
    'N34 (loop NIT-3): collectGroupMembers uses the ONE isOwnerAddr predicate, no inline drift copy');
  // loop r2 MAJOR-1: relation must survive ALL THREE collect steps + the latch —
  // an ACTIVE contact falling to 'none' re-arms the request button (the D-5 inversion).
  ok(/relation: prev\.relation \|\| rec\.relation \|\| ''/.test(chat366)
    && /relation: prev\.relation \|\| ''/.test(chat366)
    && /requestedMembers\.has\(m\.address\) && \(m\.relation \|\| 'none'\) === 'none'\) m\.relation = 'pending'/.test(chat366),
    'D-5 ★ (loop r2 MAJOR-1a): collectGroupMembers carries relation through steps 2+3 and applies the latch');
  const chatOnReq = chat366.indexOf('onContactRequest: (m) => {');
  ok(chatOnReq >= 0 && /requestedMembers\.add\(m\.address\);/.test(chat366.slice(chatOnReq, chatOnReq + 400)),
    'N26 (loop r2 MAJOR-1b): the chat takeover onContactRequest feeds the latch like its two siblings');
  const cdet366 = read('src/shells/contact_details.html');
  ok(/addMember\(address, nick, avatar, role, relation\)/.test(cdet366)
    && /\? 'pending' : \(m\.relation \|\| ''\)/.test(cdet366),
    'D-5: contact_details stores + forwards the member relation (latch-aware)');
  ok(/onContactRequest: \(m\) => \{\s*\n\s*if \(m && m\.address && m\.address !== '\[Unknown\]'\)/.test(cdet366),
    'N26: the group-info surface wires Add-contact, masked rows never emit');
  ok(/\(onContactRequest && \(m\.relation \|\| 'none'\) === 'none'\)/.test(read('src/components/chat-info.js')),
    'N26: chat-info gates the request closure on relation none (self/unknown stay inert)');
  // loop n3: anchor the slice — a renamed helper must FAIL this pin, not
  // degrade it to a one-character vacuous match.
  const rbIdx = cdet366.indexOf('function openRemoveBlockedModal');
  ok(rbIdx >= 0 && /removeBlocked\(\) \{/.test(cdet366) && !/innerHTML/.test(cdet366.slice(rbIdx, rbIdx + 1800)),
    'N27: the shell handler + modal exist and build via textContent only (group names are peer-controlled)');
  ok(/max-height: 40vh;/.test(cdet366) && /lightDismiss: true/.test(cdet366),
    'N27 ★ (loop M1): the blocking-group list scrolls (never pushes OK past the clip) and the scrim dismisses (no Esc, no hardware-back wiring on this shell)');
  ok(/\.c-modal \{ max-height: calc\(100% - 32px\); overflow-y: auto; \}/.test(cdet366),
    'N27 (loop r2 MINOR-1): the MODAL itself caps + scrolls — fixed chrome alone must not push OK off a short landscape viewport');
  ok(/requestedMembers\.has\(m\.address\)/.test(cdet366) && /requestedMembers\.add\(m\.address\)/.test(cdet366),
    'N26 (loop m1): the contact_details request latch survives change-gated panel rebuilds');
  /* —— N27 strings in all 8 built dictionaries ————————————————————— */
  const locales366 = ['en-us', 'de-de', 'es-co', 'fr-fr', 'pt-br', 'ru-ru', 'sl-si', 'sr-sp',
    'it-it', 'id-id', 'lt-lt', 'cn-cn', 'ja-jp'];   // N4 (#379)
  ok(locales366.every((l) => {
    const t = read('src/strings/' + l + '.js');
    return /removeBlockedTitle/.test(t) && /removeBlockedIntro/.test(t) && /removeBlockedPath/.test(t);
  }), 'N27: the three remove-blocked keys exist in all 13 built dictionaries');
}

{
  /* —— behavior pins over the live bundle (components.html) ————————————— */
  const dom = await load('components.html');
  const S = dom.window.Spixi, d = dom.window.document;

  // N1: anchors + quantization
  const hues = S.IDENTITY_HUES;
  const circ = (a, b) => Math.min((a - b + 360) % 360, (b - a + 360) % 360);
  let minD = 999;
  for (let i = 0; i < hues.length; i++) for (let j = i + 1; j < hues.length; j++) minD = Math.min(minD, circ(hues[i], hues[j]));
  // >= 18°: the one 18° pair (22/40, orange vs amber) separates FURTHER by
  // lightness (L 43% vs 35% in avatar.css) — every other pair is >= 22° apart.
  ok(Array.isArray(hues) && hues.length === 12 && minD >= 18,
    'N1: 12 anchors, minimum pairwise hue distance >= 18° — the four-similar-greens class is structural now');
  ok(hues.every((h) => !(h > 45 && h < 90)),
    'N1: no anchor inside the illegible yellow band (50-80)');
  const samples = Array.from({ length: 200 }, (_, i) => 'addr' + i + 'x' + (i * 7919));
  ok(samples.every((s) => hues.includes(S.hashHue(s)) && S.hashHue(s) === hues[S.identityIndex(s)]),
    'N1: hashHue quantizes onto the anchor set — sender labels and avatars stay in agreement (single source)');

  // N1: createAvatar behavior
  const person = S.createAvatar({ name: 'Han Solo', address: 'someaddr' });
  ok(person.querySelector('.c-avatar__initials') && person.querySelector('.c-avatar__initials').textContent === 'HS'
    && /^\d+$/.test(person.dataset.hue || '') && Number(person.dataset.hue) < 12,
    'N1: person placeholder keeps initials + gains the anchor index (data-hue)');
  const grp = S.createAvatar({ name: 'Camping Group Alpha', group: true });
  ok(!grp.querySelector('.c-avatar__initials') && !!grp.querySelector('svg'),
    'N1 ★: a NAMED group renders the group glyph, never initials');
  const anon = S.createAvatar({});
  // null-safe on purpose: a mutated/reverted glyph branch must FAIL this pin,
  // not throw and silently skip the rest of the block (mutation-run lesson)
  const grpSvg = grp.querySelector('svg'), anonSvg = anon.querySelector('svg');
  ok(!!grpSvg && !!anonSvg && grpSvg.innerHTML !== anonSvg.innerHTML,
    'N1: the group glyph is a DIFFERENT glyph from the person fallback');
  const rowG = S.createChatItem({ name: 'Mexico Trip', type: 'group', timestamp: Date.now(), excerpt: { type: 'text', text: 'x' } });
  ok(!!rowG.querySelector('.c-avatar svg') && !rowG.querySelector('.c-avatar__initials'),
    'N1: a group chat ROW wears the group glyph end-to-end (type threads through createChatItem)');
  const rowP = S.createChatItem({ name: 'Ana Bell', timestamp: Date.now(), excerpt: { type: 'text', text: 'x' } });
  ok(!!rowP.querySelector('.c-avatar__initials'),
    'N1: a person chat row keeps initials (no false group flags)');

  // N34: the owner chip
  const bub = S.createMessageBubble({ direction: 'received', position: 'first', text: 'hi', sender: 'Han Solo', name: 'Han Solo', address: 'addr1', roleBadge: 'Owner' });
  const senderEl = bub.querySelector('.c-bubble__sender');
  const chipEl = senderEl && senderEl.querySelector('.c-bubble__role');
  ok(!!senderEl && senderEl.hasAttribute('data-has-role') && !!chipEl && chipEl.textContent === 'Owner',
    'N34: roleBadge renders the Owner chip INSIDE the sender row (data-has-role flips the flex layout)');
  const bub2 = S.createMessageBubble({ direction: 'received', position: 'first', text: 'hi', sender: 'Han Solo', name: 'Han Solo', address: 'addr1' });
  const sender2 = bub2.querySelector('.c-bubble__sender');
  ok(!!sender2 && !sender2.hasAttribute('data-has-role') && !bub2.querySelector('.c-bubble__role'),
    'N34: no roleBadge → the plain label path is untouched');
  // grouping repair carries the chip (the label element moves; the chip is its child)
  const wrap = d.createElement('div');
  d.body.append(wrap);
  const head = S.createMessageBubble({ direction: 'received', position: 'first', text: 'one', sender: 'Han Solo', name: 'Han Solo', address: 'addr1', roleBadge: 'Owner' });
  const tail = S.createMessageBubble({ direction: 'received', position: 'last', text: 'two', sender: null });
  wrap.append(head, tail);
  S.removeMessage(head);
  ok(tail.dataset.position === 'single' && !!tail.querySelector('.c-bubble__role'),
    'N34 ★: deleting the run head moves the sender label WITH its Owner chip to the heir');

  // N26: the member sheet relation states drive the CTA honestly
  const sheetHost = d.createElement('div');
  d.body.append(sheetHost);
  const mk = (relation, onRequest) => S.openMemberSheet({
    host: sheetHost, member: { name: 'Ana', address: 'addrX' }, relation, onRequest, strings: {},
  });
  const sContact = mk('contact', () => {});
  ok(!!sContact.querySelector('.c-badge') && ![...sContact.querySelectorAll('button')].some((b) => /contact request/i.test(b.textContent)),
    'N26: relation contact → badge, NO request button (the D-5 wrong-offer is dead)');
  sContact.remove();
  const sPending = mk('pending', () => {});
  ok(![...sPending.querySelectorAll('button')].some((b) => /contact request/i.test(b.textContent)),
    'N26: relation pending → no second request');
  sPending.remove();
  const sNone = mk('none', () => {});
  ok([...sNone.querySelectorAll('button')].some((b) => /contact request/i.test(b.textContent)),
    'N26: a true stranger still gets the request button');
  sNone.remove();

  // R2 (#371): pending-in → "Request received" badge, still no button (money/CTA safety intact)
  const sIn = mk('pending-in', () => {});
  ok([...sIn.querySelectorAll('.c-badge')].some((b) => /request received/i.test(b.textContent))
    && ![...sIn.querySelectorAll('button')].some((b) => /contact request/i.test(b.textContent)),
    'R2 (#371): relation pending-in → "Request received" badge, NO request button');
  sIn.remove();

  // D-19b (#370): the pseudo-nick detector — shape-tight both ways
  const b58tail = '3fUJEqmyx7NUkAkGyvyLCFVEznQhp2QdBDVCFHT9Ff';
  // typeof guard: a bundle without the export must FAIL this pin, not crash the
  // suite (the #361 fail-soft harness lesson).
  const ipn = typeof S.isPseudoAddressNick === 'function' ? S.isPseudoAddressNick : null;
  ok(!!ipn
    && ipn('x' + b58tail) === true
    && ipn(b58tail) === true            // loop B-1: the RAW echo encoding (no x)
    && ipn('xavier') === false
    && ipn('x1234') === false
    && ipn('') === false
    && ipn('x' + b58tail + '0') === false,
    'D-19b (#370): isPseudoAddressNick matches x-prefixed AND raw base58(30+) — the two encodings C# actually emits on masked rows (loop B-1) — while short names, real names and non-base58 tails (0/O/I/l) never blank');

  // R2 (#371) + N48 (#370): chat-info hero — singular count + own-owner chip
  const ciHost = d.createElement('div');
  d.body.append(ciHost);
  const ci1 = S.createChatInfo({ kind: 'group', memberCount: 1, members: [], blind: true, amOwner: true, strings: {} });
  ciHost.append(ci1);
  const sub1 = ci1.querySelector('.c-chat-info__sub');
  ok(!!sub1 && sub1.textContent === '1 member',
    'R2 (#371): a 1-member group hero reads "1 member", not "1 members"');
  const role1 = ci1.querySelector('.c-chat-info__self-role');
  ok(!!role1 && /you are the owner/i.test(role1.textContent),
    'N48 (#370): blind group + amOwner → the hero carries "You are the owner"');
  const ciBot = S.createChatInfo({ kind: 'bot', memberCount: 2, members: [], blind: true, amOwner: true, strings: {} });
  ciHost.append(ciBot);
  ok(!ciBot.querySelector('.c-chat-info__self-role'),
    'N48 (#373, r2 F-5): a BOT room never renders the claim even if a push carries it — getOwner() is "first roster entry learned" there (both gates: C# computes groups-only, FE renders groups-only)');
  ciBot.remove();
  ci1.remove();
  const ci2 = S.createChatInfo({ kind: 'group', memberCount: 3, members: [], blind: false, amOwner: true, strings: {} });
  ciHost.append(ci2);
  ok((ci2.querySelector('.c-chat-info__sub') || {}).textContent === '3 members'
    && !ci2.querySelector('.c-chat-info__self-role'),
    'N48 (#370): NON-blind renders NO hero chip (the self ROW already carries Owner via the address match — extend-to-hero is a logged dial) + plural stays "3 members"');
  ci2.remove(); ciHost.remove();
  wrap.remove(); sheetHost.remove();
}


/* —— #370/#371 — D-19b family rework · N48 · N49 · N50 · the R2 round ———— */
console.log('#370/#371 — D-19b reverse-resolve · N48 amOwner · N49/N50 · R2');
{
  const read = (p) => readFileSync(join(root, p), 'utf8');
  const nc = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  /* —— D-19b: the C# reverse-resolve —— */
  const scp370 = nc(read('Spixi/Pages/Chat/SingleChatPage.xaml.cs'));
  ok(/private Address\? reverseResolveSenderByNick\(string nick\)/.test(scp370)
    && /if \(friend\.metaData == null \|\| friend\.metaData\.botInfo == null\s*\|\| friend\.metaData\.botInfo\.hideParticipantAddresses\)\s*\{\s*return null;/.test(scp370),
    '★ D-19b (#370): the reverse-resolve FAILS CLOSED on blindness — a blind room, or a room whose botInfo has not loaded, never hands out an address (the #369 amendment: reverse-resolve is NON-blind-only)');
  ok(/if \(match != null\)\s*\{\s*return null;\s*\}\s*match = contact\.Key;/.test(scp370),
    '★ D-19b (#370) MONEY SAFETY: a SECOND roster member with the same nick makes the match ambiguous → null. Without this a shared nick becomes a copyable address and a tip recipient for the WRONG person');
  ok(/lock \(users\.contacts\)/.test(scp370),
    'D-19b (#370): the roster walk locks users.contacts — BotUsers serializes its own writers on the same object');
  ok(/if\s*\(resolvedSender != null\)\s*\{\s*avatar = IxianHandler\.localStorage\.getAvatarPath\(resolvedSender\.ToString\(\)\);/.test(scp370),
    'D-19b (#370): the avatar lookup reads resolvedSender — a repaired row wears its member\'s real photo, and address/avatar/relation can never disagree (one variable)');
  ok(/Address\? tipTarget = msg\.senderAddress;\s*if \(tipTarget == null\)\s*\{\s*tipTarget = reverseResolveSenderByNick\(msg\.senderNick\);/.test(scp370)
    && /if \(tipTarget == null\)\s*\{\s*Logging\.error\("Tip target message carries no sender address\."\);\s*sendTipResult\(false/.test(scp370)
    && /new ExtendedAddress\(tipTarget, AddressPaymentFlag\.OfflineTag, null\)/.test(scp370),
    '★ D-19b (#370) MONEY: the tip case RE-resolves at SPEND time and refuses honestly when the resolve fails — a roster that changed since render (nick collision appeared) refuses instead of paying the wrong member; the blind refusal above this branch is untouched');
  ok(/resolvedSenderByMsgId\[Crypto\.hashToString\(message\.id\)\] = resolvedSender\.ToString\(\);/.test(scp370)
    && /resolvedSenderByMsgId\.TryGetValue\(msg_id_hex, out string shownAddr\)\s*\|\|\s*shownAddr != tipTarget\.ToString\(\)/.test(scp370)
    && /ConcurrentDictionary<string, string> resolvedSenderByMsgId/.test(scp370),
    '★ D-19b (#370) loop A-2 — RENDER→SPEND BINDING: the tip pays ONLY the address this page pushed for that row (the one on the sheet). A roster mutation between render and spend (nick rewrite, leaver, the 500-cap eviction re-uniquing a nick) makes the spend-time resolve differ → honest refusal, never a silent payment to an address the user never saw');

  /* —— D-19b: the pseudo-nick display guard —— */
  const njs = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');   // loop C-5: JS pins track CODE shape, not comments
  const av370 = njs(read('src/components/avatar.js'));
  ok(/export function isPseudoAddressNick\(name\)/.test(av370)
    && av370.includes('^x?[1-9A-HJ-NP-Za-km-z]{30,}$'),
    'D-19b (#370, widened in loop B-1): isPseudoAddressNick lives in avatar.js (the #211 identity canon home) and matches BOTH address-bearing encodings — the legacy "x"+base58 pseudo-key AND the raw base58 echo (resolveNick / local_fr.nickname fall back to the address itself). The x is OPTIONAL in the shape or the echo leaks');
  const chat370src = read('src/shells/chat.html');
  const chat370 = read('Spixi/Resources/Raw/html/chat.html');
  ok(chat370src.includes("(addr === '[Unknown]' && isPseudoAddressNick(nick)) ? '' : (nick || '')")
    && chat370.includes("(addr === '[Unknown]' && isPseudoAddressNick(nick)) ? '' : (nick || '')"),
    '★ D-19b (#370): the chat roster ingest BLANKS a blind pseudo-nick for display — "x"+<address> IS the address the blind mask hides, and it fed the member list AND the @-mention picker (typing that mention would paste the address into an outgoing message). The raw value stays as the roster KEY');
  const cd370src = read('src/shells/contact_details.html');
  const cd370 = read('Spixi/Resources/Raw/html/contact_details.html');
  ok(cd370src.includes("(address === '[Unknown]' && isPseudoAddressNick(nick)) ? '' : (nick || '')")
    && cd370.includes("(address === '[Unknown]' && isPseudoAddressNick(nick)) ? '' : (nick || '')"),
    '★ D-19b (#370): contact_details blanks the blind pseudo-nick too — the group-info member list printed "x"+<full address> as a NAME in a blind room');

  /* —— N48: self-only amOwner —— */
  const cdcs370 = nc(read('Spixi/Pages/Contacts/ContactDetails.xaml.cs'));
  ok(/amOwner = ownerAddress != null && selfAddress != null && ownerAddress\.SequenceEqual\(selfAddress\);/.test(cdcs370)
    && /"group" : "bot",\s*amOwner \? "1" : "0"\);/.test(cdcs370),
    'N48 (#370): setGroupInfo carries MY OWN owner status as an additive 7th arg, computed from the RAW owner address — the masked owner string stays empty for blind groups (no other identity leaks)');
  ok(/bool amOwner = false;[\s\S]{0,400}?if \(friend\.type == FriendType\.Group\)[\s\S]{0,600}?amOwner = ownerAddress/.test(cdcs370),
    'N48 (#370, loop A-5): amOwner computes for GROUPS only — a BOT room\'s getOwner() degrades to "first roster entry learned" (+ the 500-cap eviction reshuffles it), which could tell a bot-room member "You are the owner"');
  ok(cd370src.includes('setGroupInfo(count, blind, admin, notifications, owner, kind, amOwner)')
    && cd370src.includes('amOwner: state.group.amOwner')
    && cd370.includes('amOwner: state.group.amOwner'),
    'N48 (#370): the shell parses the 7th arg (old exe → undefined → false) and threads it to createChatInfo');

  /* —— N49: selectChat lifecycle —— */
  const hp370 = nc(read('Spixi/Pages/Home/HomePage.xaml.cs'));
  ok(/overlay is SingleChatPage presentedChat\)\s*\{\s*if \(rightContent\.IsVisible\)\s*\{\s*Utils\.sendUiCommand\(this, "selectChat", presentedChat\.friend\.walletAddress\.ToString\(\)\);\s*\}\s*return;\s*\}/.test(hp370),
    '★ N49 (#370): the row highlight is pushed at PRESENT time (onOverlayPresented), WIDE only (r2 F-1: a phone takeover\'s close slide reveals the list before the clear — an unconditional stamp tinted the just-left row for the whole slide-out). Pattern var = presentedChat, NOT scp (a method-tail lambda already declares scp — CS0136, loop A-1)');
  ok(!/pushPageLoaded\(new SingleChatPage[\s\S]{0,400}?sendUiCommand\(this, "selectChat"/.test(hp370),
    'N49 (#370): the old call-site push is GONE (present-time is the only setter)');
  ok(/overlay is SingleChatPage\)[\s\S]{0,600}?if \(!SpixiContentPage\.getOverlayPages\(\)\.Exists\(p => p is SingleChatPage\)\)\s*\{\s*Utils\.sendUiCommand\(this, "selectChat", ""\);/.test(hp370),
    '★ N49 (#370, #369 F5): closing the conversation CLEARS the chats-list row tint — guarded like N24: a chat→chat tag-replace closes the OLD page after the new one pushed its highlight, so the clear fires only when NO conversation remains');

  /* —— N50: contact_details back-vs-overlay —— */
  ok(/public volatile bool shellOverlayOpen/.test(cdcs370)
    && /shellOverlayOpen = current_url\.EndsWith\(":1", StringComparison\.Ordinal\);/.test(cdcs370)
    && cdcs370.includes('"ixian:cdoverlay:"'),
    'N50 (#370): ContactDetails mirrors the shell overlay state from ixian:cdoverlay (volatile — nav thread writes, back path reads; the homeoverlay grammar)');
  ok(/private void onLoad\(\)\s*\{\s*shellOverlayOpen = false;/.test(cdcs370),
    'N50 (#370, loop A-3/B-4): the flag RESETS in onLoad — reloadAllPages (theme/language flip) builds a fresh document that pushes nothing, and a stale true swallowed hardware back (the #337 homeShellOverlayOpen lesson, applied here)');
  ok(/if \(shellOverlayOpen\)\s*\{\s*Utils\.sendUiCommand\(this, "cdBack"\);\s*return true;\s*\}\s*popPageAsync\(\);/.test(cdcs370),
    '★ N50 (#370, #369 F5): ContactDetails\' own back pops the SHELL overlay first — OS back over the remove-blocked modal popped the whole page from under it');
  {
    const obb = hp370.slice(hp370.indexOf('protected override bool OnBackButtonPressed()'));
    const route = obb.indexOf('is ContactDetails cd && cd.pageLoaded && cd.shellOverlayOpen');
    const close = obb.indexOf('SpixiContentPage.closeTopOverlay()');
    ok(route > 0 && close > route && /Utils\.sendUiCommand\(cd, "cdBack"\);/.test(obb),
      '★ N50 (#370): HomePage routes back INTO a ContactDetails overlay BEFORE closeTopOverlay — on desktop the details pane is a HomePage overlay, so its OnBackButtonPressed never runs and only this route can save the modal');
  }
  ok(cd370src.includes("bridge.send('ixian:cdoverlay:' + (cdOverlayLive() ? '1' : '0'))")
    && /new MutationObserver\(syncCdOverlay\)\.observe\(document\.body, \{ attributes: true, attributeFilter: \['data-overlay-open'\] \}\)/.test(cd370src)
    && cd370.includes("bridge.send('ixian:cdoverlay:' + (cdOverlayLive() ? '1' : '0'))"),
    'N50 (#370): the shell mirrors body[data-overlay-open] to C# (coalesced), source AND built');
  ok(/cdBack\(\) \{\s*if \(typeof dismissTopOverlay === 'function' && dismissTopOverlay\(\)\) return;\s*syncCdOverlay\(\);\s*\}/.test(cd370src.replace(/\/\*[\s\S]*?\*\//g, '')),
    'N50 (#370): cdBack dismisses the top overlay and SELF-HEALS a stale flag (re-sync when nothing was open) — back can never wedge (the #337 homeBack lesson)');

  /* —— R2: memberOne / pending-in / AND-35 / D-7 / I-11 / N3 —— */
  ok(/private string memberCountText\(long count\)/.test(scp370)
    && /if \(count == 1\)/.test(scp370) && scp370.includes('"chat-member-count-one"')
    && /Utils\.sendUiCommand\(this, "setOnlineStatus", memberCountText\(userCount\)\);/.test(scp370)
    && /string groupCountText = memberCountText\(groupMemberCount\);/.test(scp370),
    'R2 (#371): BOTH C# member-count sites route through memberCountText — "1 member" via the new legacy id, plural via the old format string, and a lang file missing the new id falls back to the plural (never a null sub)');
  {
    const langs = ['cn-cn','de-de','en-us','es-co','fr-fr','id-id','it-it','ja-jp','lt-lt','pt-br','ru-ru','sl-si','sr-sp'];
    ok(langs.every((l) => /^chat-member-count-one = .+$/m.test(read('Spixi/Resources/Raw/lang/' + l + '.txt'))),
      'R2 (#371): chat-member-count-one exists in ALL 13 legacy lang files');
  }
  const base370 = nc(read('Spixi/Utils/SpixiContentPage.cs'));
  ok(/if \(fr\.state == FriendState\.RequestReceived\) return "pending-in";/.test(base370),
    'R2 (#371, the #366 follow-up): RequestReceived gets its own relation token — the badge stops claiming "Request sent" for a member who asked US. Same safety class as pending: no button, no money');
  const ms370 = njs(read('src/components/member-sheet.js'));
  ok(ms370.includes("relation === 'pending' || relation === 'pending-in'")
    && ms370.includes("strings.requestReceived || 'Request received'"),
    'R2 (#371): the member sheet renders "Request received" for pending-in — badge only, the request-button arm is unreachable for both pending flavors');
  {
    const ci371 = read('src/components/chat-info.js');
    ok(/removeMemberRow[\s\S]{0,700}?count === 1 \? \(strings\.memberOne \|\| '1 member'\)/.test(ci371),
      'R2 (#371, loop B-3): the SECOND hero-sub writer (removeMemberRow, after a kick/ban) takes the singular branch too — kicking a 2-person group down to 1 must not regress to "1 members"');
    ok(ci371.includes("truncateAddressMiddle(m.address))"),
      'D-19b (#370, loop B-5): the nameless non-blind member-row fallback truncates per the #211 canon — the list printed a full ~50-char base58 as a NAME while the sheet truncated the same address');
  }
  ok(chat370src.includes("name: (senderHasNick(rec) ? rec.senderNick : '')")
    && chat370.includes("name: (senderHasNick(rec) ? rec.senderNick : '')"),
    'D-19b (#370, loop B-6): the TIP SHEET payee name rides senderHasNick — the C# address-echo printed a full base58 as the recipient NAME on the money confirm surface');
  ok(chat370src.includes('rec.senderNick !== rec.senderAddress && !isPseudoAddressNick(rec.senderNick)')
    && chat370.includes('rec.senderNick !== rec.senderAddress && !isPseudoAddressNick(rec.senderNick)'),
    'D-19b (#373, r2 F-2) BELT: senderHasNick rejects an address-SHAPED nick — the equality guard cannot fire when the address slot is empty (the Core 0.9.8k case), and the nick-first ladder would otherwise render a base58 senderNick in a BLIND room');
  ok(chat370src.includes("((n) => (n && !isPseudoAddressNick(n)) ? n : '')(((groupRoster.get(rec.senderAddress) || {}).name || ''))")
    && chat370.includes("((n) => (n && !isPseudoAddressNick(n)) ? n : '')(((groupRoster.get(rec.senderAddress) || {}).name || ''))"),
    'D-19b (#373, r2 F-3): the tip-sheet ROSTER rung carries the same shape guard — resolveNick echoes the address into the roster nick for a nameless non-blind member, so rung 2 re-introduced the full-base58 payee name');
  ok(cd370src.includes("['contact', 'pending', 'pending-in', 'none', 'self'].indexOf(relation)")
    && cd370.includes("['contact', 'pending', 'pending-in', 'none', 'self'].indexOf(relation)"),
    'R2 (#371, loop C-2): contact_details validates pending-in too — losing it there degrades the relation to none and re-offers a live request button to a member who already asked US');
  ok(JSON.parse(read('src/strings/draft/sl-si.json')).appsEmptyBody === 'Igre, orodja in AI, ki delujejo neposredno v klepetu.',
    'N3 (#371, loop C-3): the sl-si draft carries Damir\'s EXACT supplied empty-state text');
  const ss370 = njs(read('src/components/settings-screens.js'));
  ok(/body\.append\(sizeSec, styleSec, patternSec\);/.test(ss370)
    && ss370.includes("strings.patternStyle || 'Background'")
    && ss370.includes("strings.patternIntensity || 'Opacity'")
    && !ss370.includes("|| 'Pattern style'") && !ss370.includes("|| 'Background pattern'"),
    'AND-35 (#371, Damir dial): Chat appearance = Text size first, then Background, then Opacity — and the two labels renamed at the fallback source (extract-strings picks them up)');
  {
    const compDir = join(root, 'src/components');
    const shellDir = join(root, 'src/shells');
    const files = [];
    for (const d of [compDir, shellDir]) {
      for (const f of readdirSync(d)) if (/\.(js|html)$/.test(f)) files.push(join(d, f));
    }
    const dashed = files.filter((f) => readFileSync(f, 'utf8').includes("' — '"));
    ok(dashed.length === 0,
      "R2 (#371): ZERO ' — ' string joiners remain in components + shells — the 16 SR aria joiners read as commas now (spoken punctuation follows the N3a prose rule)" + (dashed.length ? ' — OFFENDERS: ' + dashed.join(', ') : ''));
  }
  {
    // ★ N75 merged the four launch pages into one file, so scope this to the RESTORE
    // branch instead of the whole document — the create guard's own copy now lives a
    // few hundred lines away in the same file.
    const lp370 = nc(read('Spixi/Pages/Launch/LaunchPage.xaml.cs'));
    const rBranch = lp370.slice(lp370.indexOf('ixian:restore:'), lp370.indexOf('ixian:proceed:'));
    ok(rBranch.includes('intro-restore-walletexists-title') && rBranch.includes('intro-restore-walletexists-text')
      && !rBranch.includes('intro-new-walletexists-title'),
      '★ D-7 (#371): the Restore guard has its OWN copy naming the way out — the Create message ("restart to continue with it") left the restoring user with zero doors');
  }
  {
    const langs7 = ['en-us','de-de','es-co','fr-fr','pt-br','ru-ru','sl-si','sr-sp'];
    ok(langs7.every((l) => {
      const t = read('Spixi/Resources/Raw/lang/' + l + '.txt');
      return /^intro-restore-walletexists-title = .+$/m.test(t) && /^intro-restore-walletexists-text = .+$/m.test(t);
    }), 'D-7 (#371): both restore-guard ids exist in en + the 7 translated lang files');
  }
  const sh370 = njs(read('src/components/settings-shell.js'));
  ok(sh370.includes("strings.chatAppearanceSub || 'Background, opacity and text size'")
    && sh370.includes("strings.appLockSub || 'Password check when Spixi opens'")
    && sh370.includes("strings.downloadsSub || 'Files you received in chats'"),
    'I-11 (#371): SOME rows carry subs — Chat appearance, App lock, Downloads (the label-alone-is-ambiguous set; every other row stays bare so subs keep reading as signal)');
  const as370 = njs(read('src/components/apps-shell.js'));
  ok(as370.includes("|| 'Games, tools and AI that run directly in your chats.'")
    && !as370.includes('It takes seconds'),
    'N3 (#371, Damir text): the apps empty-state body is ONE short line (launch-punch-list B4; sl-si carries his exact wording)');
  const en370 = read('src/strings/en-us.js');
  ok(en370.includes('"Games, tools and AI that run directly in your chats."')
    && /memberOne/.test(en370) && /youAreOwner/.test(en370) && /requestReceived/.test(en370),
    'R2 (#371): the GENERATED en dictionary carries the new keys + the short apps line (guards a stale-dictionary commit — extract/build-locales must have run after the source edits)');
}

/* —— N51–N59 + N36b — the 2026-08-17f §2 F5 fix batch ——————————————————————— */
console.log('N51–N59 + N36b — chat back grammar · reading set · toast · pinned · avatar cache');
{
  const read = (p) => readFileSync(join(root, p), 'utf8');
  const nc = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const scpCs = nc(read('Spixi/Pages/Chat/SingleChatPage.xaml.cs'));
  const hpCs = nc(read('Spixi/Pages/Home/HomePage.xaml.cs'));
  const chatSrc = read('src/shells/chat.html');
  const chatNc = nc(chatSrc);
  const chatBuilt = read('Spixi/Resources/Raw/html/chat.html');
  const setSrcNc = nc(read('src/shells/settings.html'));
  const setBuilt = read('Spixi/Resources/Raw/html/settings.html');

  /* —— N51: the chatoverlay mirror (C# side) —— */
  ok(/public volatile bool shellOverlayOpen = false;/.test(scpCs)
    && scpCs.includes('"ixian:chatoverlay:"')
    && /shellOverlayOpen = current_url\.EndsWith\(":1", StringComparison\.Ordinal\);/.test(scpCs),
    'N51: SingleChatPage mirrors the shell overlay state from ixian:chatoverlay (volatile — nav thread writes, back path reads; the N50 grammar)');
  ok(/private void onLoad\(\)\s*\{\s*shellOverlayOpen = false;/.test(scpCs),
    'N51: the flag RESETS in onLoad — a shell reload (theme/language flip) builds a fresh document that pushes nothing, and a stale true swallows hardware back (the N50 A-3/B-4 lesson)');
  ok(/if \(shellOverlayOpen\)\s*\{\s*Utils\.sendUiCommand\(this, "chatBack"\);\s*return true;\s*\}\s*popPageAsync\(\);/.test(scpCs),
    '★ N51: SingleChatPage\'s own back pops the SHELL overlay first (the pushed-page path)');
  {
    const obb = hpCs.slice(hpCs.indexOf('protected override bool OnBackButtonPressed()'));
    const cdRoute = obb.indexOf('is ContactDetails cd && cd.pageLoaded && cd.shellOverlayOpen');
    const chatRoute = obb.indexOf('is SingleChatPage chatOverlay && chatOverlay.pageLoaded && chatOverlay.shellOverlayOpen');
    const close = obb.indexOf('SpixiContentPage.closeTopOverlay()');
    ok(cdRoute > 0 && chatRoute > cdRoute && close > chatRoute && /Utils\.sendUiCommand\(chatOverlay, "chatBack"\);/.test(obb),
      '★ N51: HomePage routes back INTO a SingleChatPage overlay BEFORE closeTopOverlay — chat is a HomePage overlay on mobile (#225), so ONLY this route can save an open sheet from a whole-page pop');
  }

  /* —— N51: the chatoverlay mirror (shell side) —— */
  for (const [label, txt] of [['source', chatSrc], ['built', chatBuilt]]) {
    ok(txt.includes("bridge.send('ixian:chatoverlay:' + (chatOverlayLive() ? '1' : '0'))")
      && /new MutationObserver\(syncChatOverlay\)\.observe\(document\.body, \{ attributes: true, attributeFilter: \['data-overlay-open'\] \}\)/.test(txt)
      && /new MutationObserver\(syncChatOverlay\)\.observe\(box, \{ attributes: true, attributeFilter: \['data-overlay-open'\] \}\)/.test(txt)
      && /return document\.body\.dataset\.overlayOpen !== undefined\s*\|\| box\.dataset\.overlayOpen !== undefined\s*\|\| !!channelDropdown \|\| !!chatSelect;/.test(nc(txt)),
      'N51 (' + label + '): the mirror covers body[data-overlay-open], the BOX host (loop A-2: the reactions inspect sheet mounts on #messages — dead until C8, covered now) and the two off-stack surfaces');
  }
  ok(/chatBack\(\) \{\s*if \(channelDropdown\) \{ closeChannelSelector\(\); return; \}\s*const dismiss = window\.Spixi && window\.Spixi\.dismissTopOverlay;\s*if \(dismiss && dismiss\(\)\) return;\s*if \(chatSelect\) \{\s*if \(box\.dataset\.selecting === undefined\) \{ chatSelect = null; syncChatOverlay\(\); return; \}\s*exitChatSelect\(\);\s*return;\s*\}\s*syncChatOverlay\(\);\s*\}/.test(chatNc),
    '★ N51: chatBack arms in the edge-swipe order (#328 precedent: channel → stack → selection) and EVERY arm self-heals a stale mirror — incl. the loop A-1 belt on the select arm (a dead handle re-syncs instead of eating every press)');
  ok(/if \(chatSelect && box\.dataset\.selecting === undefined\) chatSelect = null;/.test(chatNc),
    '★ N51 (#376 loop A-1, MAJOR): a constructor-auto-exited selection (initial row not selectable) fires onExit BEFORE the handle lands — the dead-handle guard at startChatSelect drops it, or hardware back is WEDGED for the life of the conversation');
  ok((chatNc.match(/syncChatOverlay\(\);/g) || []).length === 6
    && /channelDropdown = overlay;\s*syncChatOverlay\(\);/.test(chatNc)
    && /channelDropdown = null;\s*channelSheetBody = null;\s*syncChatOverlay\(\);/.test(chatNc)
    && /onExit: \(\) => \{ chatSelect = null; syncChatOverlay\(\); \}/.test(chatNc),
    'N51: the two off-stack surfaces sync EXPLICITLY at every open/close site (6 call sites incl. the two A-1 heals — the MutationObservers only see data-overlay-open)');

  /* —— AND-37: settings back over a sheet —— */
  for (const [label, txt] of [['source', setSrcNc], ['built', nc(setBuilt)]]) {
    ok(/onBack\(\) \{\s*const dismiss = window\.Spixi && window\.Spixi\.dismissTopOverlay;\s*if \(dismiss && dismiss\(\)\) return;\s*if \(currentView !== 'hub'\) showHub\(\); else exitSettings\(\);\s*\}/.test(txt),
      '★ AND-37 (' + label + '): the Account shell\'s onBack dismisses an open sheet FIRST — back over a theme/language sheet exited the whole page onto Chats (FE-only: back always routes into this shell, both presentations)');
  }

  /* —— N54: typing scroll gate —— */
  {
    const body = chatNc.slice(chatNc.indexOf('function showTyping()'), chatNc.indexOf('function hideTyping()'));
    ok(/if \(nearBottom\(\)\) box\.scrollTop = box\.scrollHeight;/.test(body)
      && !/\n\s*box\.scrollTop = box\.scrollHeight;/.test(body),
      '★ N54: showTyping scrolls ONLY when already at the bottom — the unconditional jump yanked the view away from older messages mid-read');
  }

  /* —— N53: the scroll-to-latest badge is FED —— */
  ok(/setScrollLatestCount,/.test(chatSrc),
    'N53: setScrollLatestCount joins the chat destructure (shipped in #74, never fed until now)');
  for (const [label, txt] of [['source', chatNc], ['built', nc(chatBuilt)]]) {
    ok((txt.match(/noteArrival\(existing, rec\);/g) || []).length === 5,
      '★ N53 (' + label + '): ALL FIVE upserts (text/file/app/payment/call) count an arrival — a partial wiring would badge texts but not the payment that scrolled past you');
  }
  ok(/function noteArrival\(existing, rec\) \{\s*if \(existing \|\| bursting\) return;\s*if \(Date\.now\(\) < stlFlushQuietUntil\) return;\s*if \(rec && rec\.direction === 'sent'\) return;\s*if \(rec && rec\.kind === 'call' && !rec\.direction\) return;\s*if \(nearBottom\(\)\) return;\s*setStlUnread\(stlUnread \+ 1\);\s*\}/.test(chatNc),
    '★ N53: noteArrival counts only a LIVE incoming CREATE while scrolled up — updates, the history burst, the post-clearMessages quiet window, own sends, directionless old-exe call rows and at-bottom arrivals never inflate the badge');
  {
    const cm = chatNc.slice(chatNc.indexOf('clearMessages('), chatNc.indexOf('clearMessages(') + 2600);
    ok(/stlFlushQuietUntil = Date\.now\(\) \+ 5000;/.test(cm),
      '★ N53 (#376 loop B-1, MAJOR): clearMessages opens a 5s quiet window — the load-more/reloadScreen re-flushes have NO onChatScreenLoaded, their burst dies on a 250ms idle timer, and ONE mid-stream stall let the badge count requested HISTORY as unread (the model is wiped, every re-flushed row is a create, applyOlderAnchor holds the user scrolled up). Fails SAFE: a live arrival inside the window is missed, never miscounted');
  }
  ok((chatNc.match(/resetOlder\(\);\s*setStlUnread\(0\);/g) || []).length === 2
    && /if \(stlUnread && box\.scrollHeight - box\.scrollTop - box\.clientHeight <= 200\) setStlUnread\(0\);/.test(chatNc),
    'N53: the counter resets per peer + per bot channel (ADJACENT to each resetOlder — loop B-10a pins placement, not just presence) and clears at the CHEVRON\'s 200px threshold (loop B-5: nearBottom\'s half-viewport cleared the badge with three bubbles still unread)');
  ok(/if \(nearBottom\(\)\) box\.scrollTop = box\.scrollHeight;/.test(nc(chatBuilt).slice(nc(chatBuilt).indexOf('function showTyping()'), nc(chatBuilt).indexOf('function hideTyping()'))),
    'N54 (built): the typing gate reached the shipped shell (loop B-10b — the partial-rebuild class)');

  /* —— N52: the @-jump pulse actually READS —— */
  for (const [label, txt] of [['source', chatSrc], ['built', chatBuilt]]) {
    const kf = txt.slice(txt.indexOf('@keyframes chat-mention-pulse'), txt.indexOf('@keyframes chat-mention-pulse') + 300);
    ok(/box-shadow: 0 0 0 3px var\(--surface-warning\);/.test(kf) && !/surface-warning-inverse/.test(kf),
      '★ N52 (' + label + '): the pulse ring is the SOLID warning role — the shipped ring was the WASH tone (orange-100/orange-900), near-zero contrast on the canvas in both themes, which is why the pulse never read on device');
  }
  ok(/const live = rows\.get\(id\);/.test(chatNc)
    && /if \(mentionRowVisible\(live\) \|\| performance\.now\(\) - pulseFrom > 1500\)/.test(chatNc)
    && /requestAnimationFrame\(pulseWhenVisible\);/.test(chatNc),
    '★ N52: the pulse starts when the target row is VISIBLE (rAF poll, 1.5s cap) and RE-BINDS through the id each frame (loop B-4: renderLogNow rebuilds every row — a delivery tick mid-scroll silently killed a closed-over node\'s pulse)');
  for (const [label, txt] of [['source', chatSrc], ['built', chatBuilt]]) {
    const rm = txt.slice(txt.indexOf('prefers-reduced-motion: reduce) {\n    .c-bubble-row[data-mention-pulse]'), txt.indexOf('prefers-reduced-motion: reduce) {\n    .c-bubble-row[data-mention-pulse]') + 220);
    ok(/animation: none; box-shadow: 0 0 0 3px var\(--surface-warning\);/.test(rm),
      'N52 (' + label + ', loop B-3): reduced motion gets a STATIC held ring — "animation: none" alone meant the jump highlighted NOTHING for exactly the users who asked for less motion');
  }

  /* —— N55: optimistic request-sent toast at the emit sites —— */
  ok((nc(chatSrc).match(/contactRequestSent \|\| 'Contact request sent'/g) || []).length === 2,
    'N55: BOTH chat member-sheet emit sites toast (the sender sheet + the chat-info sheet — the latter rides the #249-retained takeover, live again when that surface revives)');
  {
    const cdSrc = read('src/shells/contact_details.html');
    const cnSrc = read('src/shells/contact_new.html');
    ok(/contactRequestSent \|\| 'Contact request sent'/.test(cdSrc) && /showToast,/.test(cdSrc)
      && /components\/toast\.css/.test(cdSrc),
      'N55: contact_details member sheet toasts (+ showToast destructured + toast.css linked — a toast with no stylesheet renders as a naked div)');
    ok(!/contactRequestSent/.test(cnSrc) && !/showToast/.test(cnSrc),
      '★ N55 (#376 loop B-2, MAJOR): contact_new gets NO optimistic toast — C# returns WITHOUT sending on three alert-and-stay paths (malformed/own/already-contact) while checkAddress validates format only, so the green "sent" fired exactly when it was false; on success the pop IS the feedback. Post-pop landing feedback = a logged Damir dial');
  }
  {
    const en = read('src/strings/en-us.js');
    ok(/contactRequestSent/.test(en) && en.includes('Contact request sent'),
      'N55: the key rode the extract → the generated en dictionary carries it');
    let drafted = 0;
    for (const loc of ['de-de', 'es-co', 'fr-fr', 'pt-br', 'ru-ru', 'sl-si', 'sr-sp']) {
      if (/contactRequestSent/.test(read('src/strings/draft/' + loc + '.json'))) drafted += 1;
    }
    ok(drafted === 7, 'N55: contactRequestSent is DRAFTED in all 7 locales — the key maps to legacy id chat-request-sent-title, so build-locales REUSES the legacy value over the draft (loop B-6); the drafts are aligned to the shipped values so a native review edits the SOURCE (#341 lesson), never a dead letter');
    ok(read('src/strings/de-de.js').includes('contactRequestSent: "Kontaktanfrage gesendet"')
      && read('Spixi/Resources/Raw/html/spixi.strings.js').includes('Kontaktanfrage gesendet')
      && read('Spixi/Resources/Raw/lang/de-de.txt').includes('chat-request-sent-title = Kontaktanfrage gesendet'),
      '★ N55 (loop B-6, r2-hardened): the de value is the CORRECT compound "Kontaktanfrage" — fixed at the LEGACY source and pinned on the SHIPPED strings artifact (the split "Kontakt Anfrage" was wrong German and legacy-reuse shadowed any draft; the #285 de-fill trap)');
  }

  /* —— N56: pinned-row wash —— */
  {
    const tok = read('src/styles/tokens.css');
    ok(/--surface-pinned: rgba\(13, 19, 36, 0\.09\);/.test(tok)
      && /--surface-pinned: rgba\(233, 236, 243, 0\.06\);/.test(tok),
      '★ N56: --surface-pinned in BOTH themes — light at 9% (loop C-2: 5% composited to a perceptual TIE with the neutral-50 hover — an unreadable marker); dark is a LIGHT lift, not a brand darken (brand-900 sits darker than the neutral-900 screen and would vanish, the #194 lesson)');
    const css = read('src/styles/components/chatlist-item.css');
    ok(/\.c-chatlist-item\[data-pinned\]:not\(\[aria-current\]\) \{ background-color: var\(--surface-pinned\); \}/.test(css),
      'N56: the pinned wash paints on the row, selected still wins (the :not() keeps the ladder: selected > pinned > hover)');
    const b = nc(read('src/styles/base.css'));
    ok(/html:root \[data-pressfade="out"\]\[data-pinned\]:not\(\[aria-current\]\):not\(\.c-app-item\) \{\s*background-color: var\(--surface-pinned\);\s*\}/.test(b)
      && /\[data-pressfade="out"\]\[data-pressfade\]:hover:not\(\[aria-current\]\):not\(\[data-pinned\]\):not\(\.c-app-item\)/.test(b),
      '★ N56 (#376 loop C-1): the press-release FADE lands a pinned row on its OWN wash — the generic out rule dropped it to transparent (a ~400ms pin blink on every tap), and the hover-landing rule now keeps its hands off pinned rows (the [aria-current] pair grammar, third state)');
    ok(/if \(pinned\) el\.dataset\.pinned = '';/.test(read('src/components/chatlist-item.js')),
      'N56 (loop C-4): the wash hook rides createChatItem itself — desktop.html (the surface the wash dial is judged on) builds rows directly and rendered NO wash without it');
    /* loop C-3: built-artifact legs for the whole CSS/cache half (the #288 partial-rebuild class) */
    const builtIndex = read('Spixi/Resources/Raw/html/index.html');
    const builtTok = read('Spixi/Resources/Raw/html/spixi.tokens.css');
    ok((builtTok.match(/--surface-pinned:/g) || []).length === 2
      && /\.c-chatlist-item\[data-pinned\]:not\(\[aria-current\]\) \{ background-color: var\(--surface-pinned\); \}/.test(builtIndex)
      && /:hover:not\(\[aria-current\]\):not\(\[data-pinned\]\) \{ background-color: var\(--surface-interactive-hover\); \}/.test(builtIndex),
      'N56 (built): tokens + row rules reached the shipped output');
    ok(/-webkit-tap-highlight-color: transparent;/.test(nc(chatBuilt).slice(nc(chatBuilt).indexOf('.c-bubble-row {'), nc(chatBuilt).indexOf('.c-bubble-row {') + 400)),
      'N36b (built): the row-level tap-highlight kill reached the shipped chat shell');
    {
      const bs = read('Spixi/Resources/Raw/html/settings.html');
      ok(/\.c-settings__row-label--stack \.c-disc \{[\s\S]{0,120}?position: absolute;/.test(bs)
        && !/margin-top: calc\(-1 \* var\(--spacing-2\)\)/.test(bs),
        'N59b (built): the group-centred disc reached the shipped Account shell and the first-cut pull-up is gone');
    }
    ok(/avatarCacheFor/.test(read('Spixi/Resources/Raw/html/spixi.bundle.js')),
      'N58 (built, r2-hardened): the avatar decode cache reached the SHIPPED bundle (Raw/html — not the demo intermediate; the #285/#288 stale-artifact class)');
  }

  /* —— N59 → N59b: Account row title↔sub gap + group centring —— */
  {
    const css = nc(read('src/styles/components/settings-shell.css'));
    const stack = css.slice(css.indexOf('.c-settings__row-label--stack'), css.indexOf('.c-settings__row-label--stack') + 320);
    ok(/position: relative;/.test(stack) && /gap: 0;/.test(stack)
      && /padding-inline-start: calc\(32px \+ var\(--spacing-12\)\);/.test(stack)
      && /\.c-settings__row-label--stack \.c-disc \{\s*position: absolute;\s*inset-inline-start: 0;\s*top: 50%;\s*transform: translateY\(-50%\);\s*\}/.test(css)
      && !/margin-top: calc\(-1 \* var\(--spacing-2\)\)/.test(css),
      '★ N59b (Damir screenshot): the disc centres against the title+sub GROUP — the disc leaves the flow, the stack carries the gutter, and the first cut\'s sub pull-up is GONE (it left the text block bottom-weighted against the disc)');
  }

  /* —— N36b: the Android select-mode flash candidate —— */
  {
    const css = nc(read('src/styles/components/message-bubble.css'));
    const row = css.slice(css.indexOf('.c-bubble-row {'), css.indexOf('.c-bubble-row {') + 400);
    ok(/-webkit-tap-highlight-color: transparent;/.test(row),
      '★ N36b (#363 candidate, repro gate met): .c-bubble-row itself kills the native tap highlight — every prior transparent in this file sat on SUB-elements, and select mode made the ROW the tap target. If the on-device flash survives THIS, a second layer hides beneath — report, do not stack fixes');
  }

  /* —— N58: avatar decode cache — BEHAVIORAL —— */
  {
    const pinDom = new JSDOM('<!doctype html><body></body>', { pretendToBeVisual: true, url: 'file:///pin/' });
    pinDom.window.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    const hadWin = 'window' in globalThis ? globalThis.window : undefined;
    const hadDoc = 'document' in globalThis ? globalThis.document : undefined;
    globalThis.window = pinDom.window; globalThis.document = pinDom.window.document;
    try {
      const { renderChatsList } = await import('file://' + join(root, 'src/components/chats-shell.js'));
      const listEl = pinDom.window.document.createElement('div');
      pinDom.window.document.body.append(listEl);
      const chat = (over) => ({
        address: 'ADDR1', name: 'Ana', avatar: 'data:image/png;base64,AAA', online: false,
        timestamp: 1700000000000, excerpt: { type: 'text', text: 'hi' }, ...over,
      });
      const opts = { rowMenu: false, strings: {} };
      renderChatsList(listEl, { chats: [chat()] }, opts);
      const av1 = listEl.querySelector('.c-avatar');
      renderChatsList(listEl, { chats: [chat()] }, opts);
      const av2 = listEl.querySelector('.c-avatar');
      ok(av1 === av2,
        '★ N58 (behavioral): an unchanged photo REUSES the previous render\'s avatar NODE — a brand-new <img> re-decodes its data-URI even when the resource is cached, which was the every-entry flicker (the #340 BUG-2② class)');
      renderChatsList(listEl, { chats: [chat({ online: true })] }, opts);
      const av3 = listEl.querySelector('.c-avatar');
      ok(av3 === av1 && !!av3.querySelector('.c-avatar__dot'),
        '★ N58 (behavioral): a presence flip PATCHES the dot on the cached node — the 1 Hz status tick (#189) must never cost a photo re-decode');
      renderChatsList(listEl, { chats: [chat({ online: false })] }, opts);
      ok(listEl.querySelector('.c-avatar') === av1 && !listEl.querySelector('.c-avatar__dot'),
        'N58 (behavioral): the dot comes OFF the cached node too');
      renderChatsList(listEl, { chats: [chat({ avatar: 'data:image/png;base64,BBB' })] }, opts);
      ok(listEl.querySelector('.c-avatar') !== av1,
        'N58 (behavioral): a CHANGED photo rebuilds honestly — the cache must never pin a stale image');
    } finally {
      if (hadWin === undefined) delete globalThis.window; else globalThis.window = hadWin;
      if (hadDoc === undefined) delete globalThis.document; else globalThis.document = hadDoc;
    }
  }
  {
    const cs = nc(read('src/components/chats-shell.js'));
    ok(/AVATAR_CACHE_MAX = 128/.test(cs) && /if \(!avatarSeen\.has\(k\)\) avCache\.delete\(k\);/.test(cs)
      && /!avatarSeen\.has\(c\.address\)/.test(cs)
      && /hit\.src === c\.avatar && hit\.group === \(c\.type === 'group'\) && hit\.name === nm/.test(cs),
      'N58: the cache is CAPPED (prune only unseen keys — a search render must not evict the list), dup-guarded (a node moved twice per render would vanish from a row), and field-wise fresh (never a joined signature — #340: joining copies the data-URI per row per render)');
  }
}

/* ═══ #383 — N12 (restore must not nudge for a backup) + N40 (connectivity vs the
   update notice). Both were traced in #381/#382 before a line was written. ═══ */
console.log('#383 — N12 restore-nudge + N40 connectivity/update');
{
  const read = (pth) => readFileSync(join(root, pth), 'utf8');
  const nc = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  /* —— N40: the C# state machine —— */
  {
    const hp = nc(read('Spixi/Pages/Home/HomePage.xaml.cs'));
    const conn = hp.indexOf('NetworkClientManager.getConnectedClients(true).Count() > 0');
    const cmp = hp.indexOf('UpdateVerify.compareVersionsWithSuffix(new_version, cur_version)');
    ok(conn > 0 && cmp > 0 && conn < cmp,
      '★ N40 (#383): connectivity is evaluated BEFORE the version check and OUTSIDE it. They used to be the two arms of one if/else, so an advertised update made the offline state unreachable FOREVER — the whole D-21 symptom (the check runs hourly, Config.cs:47, which is why the state was honest at boot and gone "after long use")');
    // the connectivity block must no longer sit inside the update `else`
    const updBlock = hp.slice(cmp, cmp + 900);
    ok(!/getConnectedClients/.test(updBlock),
      '★ N40 (#383): the version arm contains NO connectivity code — a re-nest would silently restore the starvation');
    ok(!/updateNoticeText/.test(hp),
      '★ N40 (#383, review MINOR-3): there is NO C#-side "already pushed" latch for the notice. A first cut had one; a tick that lands in a reload window would latch a DYING document and lose the notice for the whole session — the D-20/#357 strand class. The shell owns the dismissal instead, so the state cannot strand');
    const backup = hp.indexOf('displayBackupReminder();');
    ok(conn > 0 && backup > 0 && conn < backup,
      '★ N40 (#383, review MINOR-5): connectivity runs before EVERY other worker in updateScreen — a recurring throw in displayBackupReminder/loadApps/loadChats/loadTransactions aborts the tick, which would starve the connectivity state through a different door than the one this batch closed');
  }

  /* —— N40: the shell contract — the two surfaces stop clearing each other —— */
  {
    const home = read('src/shells/home.html');
    const h = home.slice(home.indexOf('showWarning(text) {'), home.indexOf('showWarning(text) {') + 1600);
    ok(/if \(!t\) \{\s*\n\s*setChatsTitleState\(''\);/.test(h)
      && /CONNECTIVITY_TEXTS\.has\(t\)\) \{ setChatsTitleState\(t\); return; \}/.test(h)
      && !/setWarning\(homeBanner, isConn/.test(h),
      '★ N40 (#383, Damir dial "both can show"): a connectivity push no longer touches the banner and a notice push no longer clears the title-state. The old one-line handler cleared whichever surface it was not addressing');
    ok(/if \(t === dismissedNotice\) return;/.test(h),
      'N40 (#383): a dismissed notice is not resurrected by a re-push — the dismissal lives in MEMORY (dies with the document = returns after a restart), never in a spixi.* localStorage key (MAJOR #4 partition rule)');
    ok(!/localStorage[^\n]*dismissedNotice|dismissedNotice[^\n]*localStorage/.test(home),
      'N40 (#383): the dismissal is not persisted — restart must bring the notice back');
    ok(/CONNECTIVITY_TEXTS\.has\(String\(cur\.textContent \|\| ''\)\.trim\(\)\)\) setWarning\(homeBanner, ''\)/.test(h),
      '★ N40 (#383, review MINOR-4): the "" belt — if an UNRECOGNISED connectivity string ever reaches the banner, the clear still collapses it. Without this, one missed CONNECTIVITY_TEXTS id would strand a permanent, DISMISSABLE "Connecting…" banner, which is the one thing non-negotiable 5 forbids');
  }

  /* —— N40: the banner component gains an OPTIONAL dismiss —— */
  {
    const b = read('src/components/banner.js');
    ok(/onDismiss \} = \{\}\)/.test(b) && /typeof onDismiss === 'function'/.test(b),
      'N40 (#383): the close control is opt-in — every existing caller (chat.html, the demo) keeps the passive strip it had');
    ok(/try \{ close\.blur\(\); \} catch/.test(b),
      'N40 (#383, review MINOR-1): dismissing moves focus OFF the control before the strip collapses');
    {
      const css = read('src/styles/components/banner.css');
      ok(/\.c-banner:not\(\[data-open\]\) \.c-banner__close \{ visibility: hidden; \}/.test(css),
        '★ N40 (#383, review MINOR-1): max-height/opacity do NOT remove a descendant from the focus order — a collapsed strip left an invisible Dismiss button in the Tab order on every boot, announced by screen readers on a screen with no banner');
      ok(/max-height: 160px;/.test(css),
        'N40 (#383, review NIT-7): the open cap fits a long localized notice beside the 44px close control — 96px clipped de-de/fr-fr on a 360px phone with no scroll and no ellipsis');
    }
    const pinDom = new JSDOM('<!doctype html><body></body>', { pretendToBeVisual: true, url: 'file:///pin/' });
    pinDom.window.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    const hadWin = 'window' in globalThis ? globalThis.window : undefined;
    const hadDoc = 'document' in globalThis ? globalThis.document : undefined;
    globalThis.window = pinDom.window; globalThis.document = pinDom.window.document;
    try {
      const { createWarningBanner, setWarning } = await import('file://' + join(root, 'src/components/banner.js'));
      const plain = createWarningBanner({ strings: {} });
      ok(!plain.querySelector('.c-banner__close') && !plain.classList.contains('c-banner--dismissable'),
        '★ N40 (#383, behavioral): NO onDismiss → no close button and no layout modifier. Connectivity must never be dismissable, and the chat shell\'s banner is untouched by this batch');
      let dismissed = 0;
      const el = createWarningBanner({ strings: {}, onDismiss: () => { dismissed += 1; } });
      setWarning(el, 'Update available (0.9.23)');
      ok(el.dataset.open !== undefined, 'N40 (#383, behavioral): the notice opens the strip');
      el.querySelector('.c-banner__close').dispatchEvent(new pinDom.window.Event('click', { bubbles: true }));
      ok(dismissed === 1 && el.dataset.open === undefined,
        '★ N40 (#383, behavioral): the close control collapses the strip AND reports the dismissal, so the shell can refuse the next identical re-push');
    } finally {
      if (hadWin === undefined) delete globalThis.window; else globalThis.window = hadWin;
      if (hadDoc === undefined) delete globalThis.document; else globalThis.document = hadDoc;
    }
  }

  /* —— N12 leg 2, as N76 left it: the restore seeds the reminder clock —— */
  {
    const lp = nc(read('Spixi/Pages/Launch/LaunchPage.xaml.cs'));
    ok(/Preferences\.Default\.Set\("backupReminderTimestamp", Clock\.getTimestamp\(\)\.ToString\(\)\);/.test(lp),
      '★ N12 (#383) leg 2, kept by N76: a restore SEEDS the reminder clock, so a restored account is never asked to back up right after restoring FROM a backup');
    ok(/Preferences\.Default\.Remove\("backupReminderTimestamp"\);/.test(lp),
      '★ N12 (#383, review MINOR-2) + N76: a CREATE clears the stamp — that absence is what ARMS the first-asset nudge, and a failed restore before it must not leave its own stamp behind');
    ok(!/onboardingFromRestore|onboardingComplete/.test(lp),
      '★ N76 (#391): the onboarding provenance preferences left with the tail — nothing writes them any more');

    // ★ N76: the tail is gone from the C# tree too, and its two steps landed where
    // Damir put them: the backup nudge on the first REAL asset, the join CTA in the
    // chat-list empty state (through the verb HomePage already had).
    const hp = nc(read('Spixi/Pages/Home/HomePage.xaml.cs'));
    ok(!/OnboardPage|completeOnboard|handleOnboardDone|onboardingComplete/.test(hp),
      '★ N76 (#391): HomePage no longer builds, finishes or gates the onboarding modal');
    ok(/private bool hasBackupWorthyAsset\(\)/.test(hp)
      && /lock \(FriendList\.friends\)/.test(hp)
      && /Node\.getAvailableBalance\(\) > 0/.test(hp),
      '★ N76 (Damir dial): the backup nudge waits for the first REAL asset — a contact OR an incoming balance. The balance leg is not optional: funds can arrive before any messaging');
    /* ★ F-1 (#399). The pin this replaces asserted only that a gate EXISTED, and the
     * gate it was written for read `friend.approved` — a flag Ixian-Core DEFAULTS TO
     * TRUE and that no outgoing-request site in this app ever clears, so the nudge
     * fired on the community bot one second after the Join tap. Pin the PREDICATE, and
     * pin the dead flag OUT of it: `state == FriendState.Approved` is the only value
     * the handshake actually writes (CoreStreamProcessor :1908/:1991/:2181/:2236). */
    const asset = hp.slice(hp.indexOf('private bool hasBackupWorthyAsset()'),
      hp.indexOf('private void displayBackupReminder()'));
    ok(/friend\.state == FriendState\.Approved/.test(asset)
      && /!friend\.pendingDeletion/.test(asset)
      && /!friend\.bot/.test(asset),
      '★ F-1 (#395/#399): the contact leg keys on the STATE — approved + not queued for deletion + not the bot. `Friend.approved` defaults to true (Core Friend.cs:196) and all four outgoing sites pass FriendState.RequestSent without touching it, so the flag is true from the moment you SEND a request');
    ok(!/friend\.approved/.test(asset),
      '★ F-1 (#399): the DEAD flag is gone from this predicate. Leaving `friend.approved &&` beside the state test is harmless today and a trap tomorrow — it reads like a second guard while contributing nothing, which is exactly how it survived the #393 review');
    const gate = hp.indexOf('if (!hasBackupWorthyAsset())');
    const stamp = hp.indexOf('Preferences.Default.Set("backupReminderTimestamp", Clock.getTimestamp().ToString());', hp.indexOf('private void displayBackupReminder()'));
    ok(gate > 0 && stamp > gate,
      '★ N76: the asset gate RETURNS before the stamp is written — a gated tick must not start the 30-day period on an empty account, or the nudge would be lost for a month');
    ok(/ixian:joinBot/.test(hp),
      '★ N76: the join verb the empty-state CTA rides is the one HomePage already had (frozen outbound bridge; note the capital B)');

    /* ★ Item 6 (#397/#400): the join is a SHARED STATIC, and How to use is the door that
     * never closes — the empty-state CTA disappears on the user's first ordinary contact. */
    ok(/public static void joinCommunity\(\)/.test(hp) && /private void joinBot\(\)\s*\r?\n\s*\{\s*\r?\n\s*joinCommunity\(\);/.test(hp),
      '★ Item 6 (#400): the join body is a PUBLIC STATIC (the BackupPage.backupAccount precedent, #243) and HomePage\'s own verb delegates to it');
    const sp = nc(read('Spixi/Pages/Settings/SettingsPage.xaml.cs'));
    ok(/current_url\.Equals\("ixian:joinBot", StringComparison\.Ordinal\)/.test(sp)
      && /HomePage\.joinCommunity\(\);/.test(sp),
      '★ Item 6 (#400): SettingsPage now HANDLES the verb it never had — How to use is rendered by this page, and its row must reach the same code path');
    ok(!/FriendList\.addFriend\(/.test(sp),
      '★ Item 6 (#400): SettingsPage does NOT carry its own copy of the addFriend call — one join body, two callers');
    /* ★ audit MAJOR-4: the component renders the row ONLY when the hook is passed, so
     * deleting one line from the shell removes the permanent community door from the
     * shipped app — and every other pin in this batch stayed green. Pin the wire. */
    ok(/onJoinCommunity: \(\) => bridge\.send\('ixian:joinBot'\)/.test(read('src/shells/settings.html')),
      '★ Item 6 (#400) THE WIRE: settings.html passes onJoinCommunity, and it sends the verb SettingsPage now handles. Without it the How-to screen silently has no community row at all');
    {
      /* the anti-duplication pin that matters: the community address exists in exactly
       * ONE place in the C# tree. Two copies drift, and the stale one keeps sending
       * contact requests to an address nobody reads. */
      const walk = (dir, out = []) => {
        for (const f of readdirSync(join(root, dir), { withFileTypes: true })) {
          if (f.name === 'obj' || f.name === 'bin') continue;
          const rel = dir + '/' + f.name;
          if (f.isDirectory()) walk(rel, out);
          else if (f.name.endsWith('.cs')) out.push(readFileSync(join(root, rel), 'utf8'));
        }
        return out;
      };
      const cs = walk('Spixi').join('\n');
      const hits = (cs.match(/419jmKRKVFcsjmwpDF1XSZ7j1fez6KWaekpiawHvrpyZ8TPVmH1v6bhT2wFc1uddV/g) || []).length;
      ok(hits === 1, '★ Item 6 (#400): the community address exists ONCE in the C# tree (found ' + hits + ')');
    }
  }

  /* —— the generator fix that unblocked this batch —— */
  {
    const gen = read('scripts/build-demo-bundle.mjs');
    ok(/readFileSync\(join\(root, f\), 'utf8'\)\.replace\(\/\\r\\n\/g, '\\n'\)/.test(gen),
      '★ #383: build-demo-bundle NORMALISES CRLF on read. 8 component sources carry CRLF in the working tree; `.` never matches \\r, so /^import .*$/gm silently FAILED to strip those imports and the pre-strip gate reported a one-line import as "MULTI-LINE" — the bundle build was DEAD. Same fix, same reason as the smoke harness\'s own #340 normalisation');
  }

  /* —— N66 (#385): the OS-follow theme path —— */
  {
    /* review NIT-1: strip comments here too — the sibling pin below strips them for
     * the same reason, and this file's prose discusses UserAppTheme. */
    const tm = read('Spixi/Utils/ThemeManager.cs').replace(/^[ \t]*\/\/.*$/gm, '');
    /* The two negatives below must see CODE only: this batch's comments quote the
     * removed line verbatim, and a comment must never satisfy — or defeat — a pin. */
    const app = read('Spixi/App.xaml.cs').replace(/^[ \t]*\/\/.*$/gm, '');

    ok(/Current\.UserAppTheme = AppTheme\.Unspecified;/.test(app)
      && !/UserAppTheme = currentTheme/.test(app)
      && !/UserAppTheme = a\.RequestedTheme/.test(app),
      '★ N66 (#385): UserAppTheme is NEVER pinned to a concrete value. Application.RequestedTheme returns UserAppTheme whenever it is set, and MAUI drops RequestedThemeChanged when RequestedTheme does not change — so the old pin made every later OS theme flip invisible and left the whole handler (re-bake + reloadAllPages + the parked-Account dispose) as unreachable code');

    ok(/RequestedThemeChanged \+=[\s\S]{0,1600}?if \(ThemeManager\.getActiveAppearance\(\) != ThemeAppearance\.automatic\)\s*\n\s*return;[\s\S]{0,300}?ThemeManager\.changeAppearance\(ThemeAppearance\.automatic\);/.test(app),
      '★ N66 (#385): the revived handler is gated on "System" and returns EARLY. Everything in it is newly reachable, and under an explicit Light/Dark pick an OS flip must not reload every page for a theme the user does not see (the #242 round-2 flicker lesson)');

    ok(/private static bool isPlatformDark\(\)[\s\S]{0,400}?Application\.Current\?\.RequestedTheme == AppTheme\.Dark/.test(tm)
      && !/UserAppTheme == AppTheme\.Dark/.test(tm),
      '★ N66 (#385): ThemeManager resolves "automatic" from the PLATFORM theme, not UserAppTheme. With UserAppTheme now Unspecified for the whole session, the old read would have resolved every automatic theme to light — a harder break than the bug being fixed');

    const uh = read('Spixi/Utils/UIHelpers.cs');
    /* ★ N71 (#421): these two invariants moved into getLiveShellPages — the ONE
     * enumerator both sweeps now run on. They are pinned at that site, because that
     * is where the behaviour runs; a pin on reloadAllPages' own body would now pass
     * while proving nothing about the push path that shares it. */
    ok(/if \(p is SpixiContentPage sp && sp\.hasGeneratedContent && !pages\.Contains\(sp\)\)/.test(uh)
      && /Application\.Current\?\.MainPage\?\.Navigation/.test(uh),
      'N66 (#385) via ★ N71 (#421): the shared enumerator tolerates an unexpected page and a null MainPage — it is reachable at any moment, on any navigation stack');

    /* ═══ ★ N71 (#421) — the OS theme flip PUSHES instead of reloading ═══════════
     * N78: an evening OS auto-switch threw the user from wherever they were back to
     * Chats with every empty-state gate re-armed, because reloadAllPages builds a
     * fresh document and home.html's Fix #8 sends ixian:tab:tab1 on every boot. A
     * PUSH creates no document, so one change closes both halves. */
    const app421 = read('Spixi/App.xaml.cs');
    ok(/SpixiContentPage\.repaintSystemBarsFor\(null\);[\s\S]{0,1400}?UIHelpers\.pushThemeToAllPages\(\);/.test(app421)
      && !/UIHelpers\.reloadAllPages\(\);/.test(app421),
      '★ N71 (#421): the RequestedThemeChanged handler PUSHES the theme and no longer calls reloadAllPages — the reload was N78 (yanked to Chats) and #385 MINOR-3 (unsaved input discarded)');
    ok(/public static void pushThemeToAllPages\(\)\s*\n\s*\{\s*\n\s*string themeName = ThemeManager\.getResolvedAppearanceName\(\);/.test(uh),
      '★ N71 (#421) + ★ #410: the pushed name is READ per push from getResolvedAppearanceName (which resolves isPlatformDark live), never remembered from boot');
    ok(/private static List<SpixiContentPage> getLiveShellPages\(bool includeModal\)/.test(uh)
      && /getLiveShellPages\(true\)/.test(uh) && /getLiveShellPages\(false\)/.test(uh),
      '★ N71 (#421): ONE enumerator, both sweeps. Every hand-rolled "re-theme them all" list in this project has missed a collection (#251 EmptyDetail · #284 getChatPages · #288 MAJOR-1 the open tx pane) — there is a single place to grow now');
    ok(/if \(includeModal && nav\?\.ModalStack != null\)/.test(uh),
      '★ N71 (#421): the PUSH sweeps the modal stack and the RELOAD does not. That asymmetry is the #385 MINOR-2 finding resolved, not a wart: reloading a page during a live call is the risk that kept ModalStack out, and swapping a CSS attribute carries none of it');
    ok(uh.indexOf('getLiveShellPages(true)') < uh.indexOf('public static void reloadAllPages()')
      && /getDefaultDetailContent\(\)\);/.test(uh),
      '★ N71 (#421): the #251 EmptyDetail resting pane is inside the shared enumerator, so the PUSH path gets it too — it is in neither the NavigationStack nor the overlay list, and every earlier sweep that forgot it shipped a stale-theme welcome pane');
    const settingsPage421 = read('Spixi/Pages/Settings/SettingsPage.xaml.cs');
    ok(/UIHelpers\.pushThemeToAllPages\(\);/.test(settingsPage421)
      && !/sendUiCommand\(home, "setTheme"/.test(settingsPage421)
      && !/getDetailContent\(\) is SpixiContentPage detail/.test(settingsPage421),
      '★ N71 (#421): the EXPLICIT-PICK path runs the SAME sweep. It used to hand-roll its own list — which is how the two theme paths drifted — and that list included getDetailContent(), DEAD since HomePage.detailContent is only ever assigned null (HomePage.xaml.cs, the #288 branch): a guard that covered nothing');

    /* ★ N71(a) — DAMIR F5 2026-08-19. This pin is INVERTED from what the #46 round
     * asked for, and the inversion is the finding. That round had me exclude the
     * picker from its own sweep; shipped alongside the shell-side guard it re-opened
     * N71(a) — pick System with the OS dark and the whole app went dark while the
     * Account stayed light, because the one surface that needed the resolved answer
     * was the one surface not told it. There must be NO exclusion: the guard keys on
     * the SELECTED appearance, not on who sent the push, and covers both cases. */
    ok(/public static void pushThemeToAllPages\(\)/.test(uh)
      && !/if \(page == except\)/.test(uh) && !/pushThemeToAllPages\(this\)/.test(settingsPage421),
      '★ N71(a) (Damir F5): the sweep has NO exclusion, and the picker calls it with no argument. An unused exclusion hook on a sweep is an invitation to re-add this exact bug, so the parameter is gone rather than defaulted');
    ok(/if \(!page\.rethemesByPush\)[\s\S]{0,1400}?page\.reload\(\);/.test(uh)
      && /public bool rethemesByPush/.test(read('Spixi/Utils/SpixiContentPage.cs')),
      '★ N71 (#421, #46 audit MAJOR): the sweep is HYBRID — push where the document has a setTheme, RELOAD where the theme is baked. The 8 legacy pages carry the theme in a <link href="css/*SL{SpixiThemeMode}"> and have no setTheme global at all, so a push both threw a bare-global ReferenceError into them AND left them in yesterday\'s theme, on the MONEY path. reload() is exactly what they got before this batch — the security gate says introduce nothing');
    ok(/add\(SpixiContentPage\.getStagingPage\(\)\);/.test(uh) && /add\(CallPage\.getLiveSurface\(\)\);/.test(uh)
      && uh.indexOf('getStagingPage') > uh.indexOf('if (includeModal)'),
      '★ N71 (#421, #46 audit): the STAGING slot and the in-place CALL surface are swept, PUSH-ONLY. Both are live WebViews in none of the standard collections; neither may be RELOADED — a reload mid-stage destroys the ixian:onload the present waits for, and reloading during a live call is what kept the modal stack out of the reload sweep');
    ok(/try \{ page\.applyPageSurfaceColor\(\); \}/.test(uh) && !/page\.applyPlatformPageChrome\(\)/.test(uh),
      '★ N71 (#421, break-my-verdict MAJOR-1): the per-page refresh is applyPageSurfaceColor and NEVER applyPlatformPageChrome. The latter looks page-local and is not — on Android it calls setEdgeToEdge, which paints the ONE activity root view and the ONE window insets controller, so running it per page let the LAST page in the list pick the system-bar glyph colour and overwrote the repaintSystemBarsFor(null) both callers run from the VISIBLE page. That is the whole #407–#410 bar round undone, on the wallet hero');
    ok(/SpixiContentPage\.disposeParkedOverlay\(\);[\s\S]{0,700}?repaintSystemBarsFor\(null\)/.test(uh),
      '★ N71 (#421, break-my-verdict MAJOR-1 belt): the sweep ENDS by re-asserting the bars from the VISIBLE page. The legacy reload() branch repaints them asynchronously from whatever page it belongs to, and ★ #410 says the bars are read from the surface actually on screen — never from whatever happened to be last in a list');

    /* ★ N71 1.5 (Damir F5 2026-08-19): the bars must find a LOCK shown in place. */
    const scp421 = read('Spixi/Utils/SpixiContentPage.cs');
    ok(/private static SpixiContentPage\? liveLockPage\(\)/.test(scp421)
      && /modalOverlayOp\.target is LockPage inPlace/.test(scp421)
      && scp421.indexOf('SpixiContentPage? lockPage = liveLockPage();') < scp421.indexOf('if (overlayStack.Count > 0)'),
      '★ N71 1.5 (Damir F5): a live LOCK outranks every other surface when the system bars are painted, and it is checked FIRST. A lock shown in place (#230) is in no navigation collection, so the bars were painted from whatever sits under it — flipping the OS theme with the lock up recoloured them against a screen that is fixed dark in both themes');
    ok(/foreach \(Page p in nav\.ModalStack\)/.test(scp421) && /nav\.NavigationStack\.LastOrDefault\(\) is LockPage top/.test(scp421),
      '★ N71 1.5: all THREE lock presentations are covered — in-place, modal stack, top of the navigation stack. The same three CallPage.lockUp() uses, because they are the same three ways a lock can be up');

    /* ★ THE BARE-GLOBAL HAZARD. C# emits `executeUiCommand(setTheme, '<b64>')` with
     * setTheme as a bare identifier (Utils.sendUiCommand builds the string), so an
     * UNDEFINED one throws a ReferenceError while the ARGUMENTS are evaluated —
     * before executeUiCommand is entered and before its own try/catch can run. That
     * is the #258 addAppRequest lesson, which cost ten shells. Now that the push
     * reaches the NavigationStack and the modal stack, EVERY shell can receive one. */
    const shellDir421 = join(root, 'src/shells');
    const missing421 = readdirSync(shellDir421).filter((f) => f.endsWith('.html'))
      /* the mutation run caught this: the first cut matched the WORD `setTheme`,
       * so a shell whose DEFINITION was deleted still passed on the comment that
       * described it. Match a definition — a `setTheme(name) {` handler-map entry
       * or a `window.setTheme =` assignment — and nothing else. */
      .filter((f) => !/(setTheme\s*\(\s*name\s*\)\s*\{|window\.setTheme\s*=)/.test(readFileSync(join(shellDir421, f), 'utf8')));
    ok(missing421.length === 0,
      '★ N71 (#421): EVERY shell defines setTheme — including the fixed-surface ones, where it is a deliberate no-op. An undefined bare global throws before the dispatcher can catch it (#258). Missing: ' + (missing421.join(', ') || 'none'));
    /* ★ THE DESTRUCTURE GATE (#46 audit MAJOR-1, then AGAIN in the fix round).
     * A shell that USES a bundle export without destructuring it is a ReferenceError,
     * and the symptom depends only on WHERE the call sits: at module top level the
     * shell dies at boot (blank conversation); inside a handler it boots perfectly and
     * breaks silently when that push arrives. It happened twice in one session, in the
     * same file, with both symptoms — so it is gated structurally rather than by
     * remembering. build-shells' preflight cannot do this: it validates the symbols a
     * shell DOES destructure, so an omitted one is invisible to it by construction. */
    /* the bundle emits ONE line: `window.Spixi = { a: a, b: b, … };` */
    const bundleSrc421 = readFileSync(join(root, 'src/demo/spixi.iife.js'), 'utf8');
    const exportLine421 = bundleSrc421.slice(bundleSrc421.lastIndexOf('window.Spixi = {'));
    const bundleExports421 = new Set(
      [...exportLine421.slice(0, exportLine421.indexOf('};')).matchAll(/([A-Za-z_$][\w$]*)\s*:/g)].map((m) => m[1]));
    /* strip JS block/line comments AND html comments — a bundle name mentioned in a
       <!-- … --> note is not a call (launch.html mentions passwordField in one) */
    const stripComments421 = (t) => t
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const undeclared421 = [];
    for (const f of readdirSync(shellDir421).filter((n) => n.endsWith('.html'))) {
      const src = readFileSync(join(shellDir421, f), 'utf8');
      const m = src.match(/const \{([\s\S]*?)\} = window\.Spixi;/);
      if (!m) continue;   // empty_detail is deliberately bundle-less
      /* record BOTH sides of an ALIASED import (`showAppRemoved: showAppRemovedModal`).
         The left side is the bundle export — genuinely imported — and the right side is
         the local binding. A shell aliases precisely so it can define its OWN global of
         the export's name (chat.html's addReactions handler, app_details' modal), so
         neither side may count as an undeclared call. */
      const declared = new Set();
      for (const tok of stripComments421(m[1]).split(/[,\n]/)) {
        const t = tok.trim();
        if (!t) continue;
        for (const half of t.split(':')) {
          const nm = half.trim();
          if (/^[A-Za-z_$][\w$]*$/.test(nm)) declared.add(nm);
        }
      }
      const body = stripComments421(src);
      for (const name of bundleExports421) {
        if (declared.has(name)) continue;
        // a bare call `name(` that is not a property access `.name(` or `window.Spixi.name(`
        if (new RegExp('(^|[^\\w$.])' + name + '\\s*\\(', 'm').test(body)) undeclared421.push(f + ':' + name);
      }
    }
    ok(undeclared421.length === 0,
      '★ THE DESTRUCTURE GATE: no shell calls a bundle export it did not destructure. Found: ' + (undeclared421.join(', ') || 'none'));
    ok(bundleExports421.size > 200 && bundleExports421.has('applyPushedTheme') && bundleExports421.has('patternLevelVar'),
      '★ the destructure gate reads a REAL export list (a mis-parsed empty set would make the gate above vacuously pass — the failure mode of every "check nothing is missing" test)');

    const themeRt421 = readFileSync(join(root, 'src/components/theme-runtime.js'), 'utf8');
    ok(/export function applyPushedTheme\b/.test(themeRt421) && /export function ignorePushedTheme\b/.test(themeRt421)
      && /theme-switching/.test(themeRt421),
      '★ N71 (#421): ONE implementation of the swap body (transitions suppressed across it, #53). Five shells carried a copy and thirteen carried none — copies drift, which is the #251/#288 story twice');
    const lockShell421 = readFileSync(join(shellDir421, 'lock.html'), 'utf8');
    const launchShell421 = readFileSync(join(shellDir421, 'launch.html'), 'utf8');
    ok(/ignorePushedTheme/.test(lockShell421) && /ignorePushedTheme/.test(launchShell421)
      && !/applyPushedTheme/.test(lockShell421) && !/applyPushedTheme/.test(launchShell421),
      '★ N71 (#421): the lock and the launch flow IGNORE the push — they are brand-dark in BOTH themes (#203 / N73), so following a flip would repaint fixed chrome against a token set that moved under it. They still DEFINE the global, which is the point');

    /* ★ settings.html is the one shell whose handler needs more than the shared body. */
    const setShell421 = readFileSync(join(shellDir421, 'settings.html'), 'utf8');
    ok(/p = readPatternLevel\(p, de \? 0 : 1\);/.test(readFileSync(join(shellDir421, 'chat.html'), 'utf8')),
      '★ N81 MIGRATION, the RUNTIME half: readPatternPrefs migrates through the SAME readPatternLevel the component exports. The pre-paint script must inline its own copy (it runs before the bundle), so these two are the pair that has to agree — pinning only the inline one left the live re-read unpinned');
    ok(/let autoTheme = document\.documentElement\.dataset\.theme \|\| '';/.test(setShell421)
      && !/const bootTheme =/.test(setShell421),
      '★ N71 (#421) + ★ #410: the Auto resolution is MUTABLE. It was a const captured at document boot, which was only safe while a flip RELOADED the document; with a push nothing rebuilds it, and a later applyTheme(0) would snap the page back to the boot theme and silently undo the push');
    ok(/if \(state\.theme === 0\) autoTheme = name === 'dark' \? 'dark' : 'light';\s*\n\s*applyPushedTheme\(name\);/.test(setShell421),
      '★ N71 (#421, #46 audit — BOTH auditors found this independently): settings.html trusts a pushed name as the SYSTEM answer ONLY while System is selected, and refreshes it BEFORE applying. The pushed value is getResolvedAppearanceName(), which returns the PICK when the pick is explicit — unguarded it poisoned the Auto cache with a value the OS never reported, and the next "System" pick painted the Account from it');
    ok(!/setTheme\(name\)[\s\S]{0,300}?spixi\.appearance/.test(setShell421),
      '★ N71 (#421): the push does NOT write spixi.appearance. An OS flip does not change the user\'s PICK (still System) — writing an idx here would silently convert their Auto choice into a hard Light/Dark one');

    /* ★ THE DO-NOT-PATCH RULE. Fix #8 is CORRECT for the reload it was written for
     * (the Save-from-Account echo, #8). N71 works by removing the reload, not by
     * touching this line — patching it in isolation would re-open #8. */
    ok(/bridge\.send\('ixian:tab:tab1'\);/.test(readFileSync(join(shellDir421, 'home.html'), 'utf8')),
      '★ N71 (#421): Fix #8 is UNCHANGED. It is correct for the Save-from-Account reload echo it exists for; N78 is fixed by removing the OS-flip RELOAD, never by weakening this line');

    ok(/public bool hasGeneratedContent[\s\S]{0,200}?return loadedHtmlFileName != null;/.test(read('Spixi/Utils/SpixiContentPage.cs'))
      && (uh.match(/hasGeneratedContent/g) || []).length >= 1,
      '★ N66 (#385, review MAJOR-1): the sweep SKIPS a page whose content we did not generate. reload() cannot re-theme such a page — it falls through to a raw Reload and RESTARTS it. That page is MiniAppPage, so an OS auto-dark flip would have destroyed a running mini-app\'s state for zero theme gain, and broken the standing rule that third-party content stays out of our sweeps');
  }

  /* —— N65 (#385): the language pick must never fail silently —— */
  {
    const loc = read('Spixi/Lang/SpixiLocalization.cs');
    const sps = read('Spixi/Pages/Settings/SettingsPage.xaml.cs');

    /* review NIT-2: the loose /missing '=' separator/ clause was ALREADY satisfied by
     * the pre-existing testFile() helper in the same file — it proved nothing about
     * the new code. Both clauses now quote the new call sites exactly. */
    ok(/Logging\.error\("Language file " \+ lang \+ " error on line " \+ line_number \+ ": missing '=' separator"\);/.test(loc)
      && /Logging\.error\("Language file " \+ lang \+ " error on line " \+ line_number \+ ": empty key"\);/.test(loc)
      && /Logging\.error\("Language " \+ lang \+ " was NOT loaded/.test(loc),
      '★ N65 (#385): a refused language file NAMES itself and the line. loadLanguage used to return false with no log line at all, and every caller gates on that return — the reported "the pick does nothing", with nothing to diagnose it');

    ok(/try\s*\n\s*\{[\s\S]{0,2000}?localized_strings\.Add\(last_key, value\);[\s\S]{0,200}?catch \(Exception ex\)[\s\S]{0,400}?success = false;/.test(loc),
      '★ N65 (#385): the parse cannot THROW out of loadLanguage. A duplicate key made Dictionary.Add throw through the WebView Navigating handler that calls it, leaking the open stream — a failure mode that skips even the else branch');

    ok(/\}\s*\n\s*finally\s*\n\s*\{[\s\S]{0,600}?sr\.Close\(\); sr\.Dispose\(\);[\s\S]{0,300}?file_stream\.Close\(\); file_stream\.Dispose\(\);/.test(loc),
      'N65 (#385, review NIT-5): the stream close sits in a FINALLY. Left after the catch it still leaks on a throw from the logging call — the exact leak this batch set out to close');

    ok(/Utils\.sendUiCommand\(this, "setLocale", SpixiLocalization\.getCurrentLanguage\(\)\);/.test(sps.split('was refused by loadLanguage')[1] || ''),
      '★ N65 (#385, review MINOR-1): a REFUSED pick answers the SCREEN, not only the log. The shell moves the check mark BEFORE it sends the verb, so without this push the picker keeps a language the app never loaded — the reported symptom, unchanged');

    ok(/private static string safeForLog\(string value\)/.test(sps)
      && !/'" \+ lang \+ "', loaded=/.test(sps) && !/Language pick '" \+ lang \+ "'/.test(sps),
      'N65 (#385, review NIT-3): a value that came off a navigation URL is clamped and stripped before it reaches ixian.log — DevPage renders that file and offers it through the share sheet, so a control character could otherwise forge log lines');

    ok(/bool languageLoaded = SpixiLocalization\.loadLanguage\(lang\);[\s\S]{0,900}?Logging\.info\("Language pick: requested/.test(sps)
      && /Logging\.error\("Language pick '" \+ langForLog \+ "' was refused/.test(sps),
      '★ N65 (#385): the pick logs the request AND the code that ended up active. That one line separates "the load failed" from "the load worked and the surfaces disagree" — the four-way split (hub dictionary / row value / checkmark / home shell) needs the second answer before any fix');
  }
}

/* #334 — baseline-honest summary (handoff-2026-08-11 QoL rider). The 4 known
 * pre-existers rendered as a red FAILED block and read as a broken run twice.
 * Exactly the known set → BASELINE OK + exit 0. Any OTHER failure — or a known
 * one ABSENT (a silent fix: update this list!) — keeps the red block + exit 1. */
const KNOWN_PREEXISTERS = [
  'contact strip caps at 5 with the keep-typing note (#136 scaling)',
  'chat-info QR hugs the code at 148px — account-hub parity (#149③)',
  'M5: request rows feed the Requests chip + hold the filter + pending badge in the picker',
  'B3: a lone clearEntries resets the BUFFER only (never blanks the rendered card)',
];
const unexpected = failures.filter((f) => !KNOWN_PREEXISTERS.some((k) => f.includes(k)));
const missingKnown = KNOWN_PREEXISTERS.filter((k) => !failures.some((f) => f.includes(k)));
if (unexpected.length || missingKnown.length) {
  if (unexpected.length) console.error('\nFAILED:\n' + unexpected.join('\n'));
  if (missingKnown.length) console.error('\nKNOWN pre-exister(s) ABSENT — silently fixed? Update KNOWN_PREEXISTERS:\n' + missingKnown.map((k) => '  ~ ' + k).join('\n'));
  process.exit(1);
}
if (failures.length) {
  console.log('\nBASELINE OK — ' + passes + ' pass / the ' + failures.length + ' KNOWN pre-existers (#136 · #149③ · M5 · B3)');
  process.exit(0);
}
console.log('\nsmoke test CLEAN');
process.exit(0); // jsdom windows hold live timers (their cleanup would hang the run)