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
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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

  /* send flow (slice 2, #135): hero Send → one-screen send + #26 review with exact money */
  ok(d.querySelectorAll('.c-wallet-hero__qa[data-primary]').length === 0, 'quick actions uniform (no special Send circle)');
  d.querySelector('.c-wallet-hero__qa').click();
  await sleep(50);
  const send = d.querySelector('.c-wallet-send');
  ok(!!send, 'Send quick action opens the send view');
  send.querySelector('.c-wallet-send__contact').click();
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
}

if (failures.length) { console.error('\nFAILED:\n' + failures.join('\n')); process.exit(1); }
console.log('\nsmoke test CLEAN');
process.exit(0); // jsdom windows hold live timers (timestamp ticker) — exit explicitly
