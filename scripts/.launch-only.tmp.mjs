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

console.log('launch.html — launch/onboarding shell (Phase 1 #5)');
{
  const dom = await load('launch.html');
  const d = dom.window.document, W = dom.window;

  const shell = d.querySelector('.c-launch');
  ok(!!shell && shell.dataset.view === 'welcome', 'shell mounts on the welcome view');

  // —— #160 inheritance is WELCOME-ONLY (launch-spec #0②) ——
  ok(d.querySelector('.c-launch__welcome').dataset.theme === 'dark',
    '#160 brand: welcome subtree pinned dark over --gradient-lock');
  ok([...d.querySelectorAll('.c-launch__view, .c-launch__tail')].every((v) => !v.dataset.theme),
    'create/restore/retry/tail are NOT pinned — normal themed form surfaces');

  // —— welcome carousel: 3 slides · dots · keyboard · placeholder slots ——
  const dots = [...d.querySelectorAll('.c-launch__dot')];
  ok(d.querySelectorAll('.c-launch__slide').length === 3 && dots.length === 3,
    'carousel: 3 slides + 3 dots (illustrations-plan P1 intro set)');
  ok(dots[0].getAttribute('aria-selected') === 'true', 'dot 1 selected at rest (roving tabindex)');
  dots[2].click();
  ok(dots[2].getAttribute('aria-selected') === 'true'
    && /translateX\(-200%\)/.test(d.querySelector('.c-launch__track').style.transform),
    'dot click drives the track');
  d.querySelector('.c-launch__dots').dispatchEvent(new W.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
  ok(dots[1].getAttribute('aria-selected') === 'true', '←/→ arrows page the carousel');
  ok(d.querySelectorAll('.c-launch__illo[data-placeholder="true"]').length === 4,
    'all 4 illustration slots are marked placeholders (real-asset swap = deliberate, spec §4)');

  // —— terms gate (showTerms mirror) ——
  const ctas = [...d.querySelectorAll('.c-launch__ctas .c-button')];
  ok(ctas.length === 2 && ctas.every((b) => b.disabled),
    'terms gate: both CTAs disabled until accepted');
  const box = d.querySelector('.c-launch__terms-box');
  box.checked = true;
  box.dispatchEvent(new W.Event('change', { bubbles: true }));
  ok(ctas.every((b) => !b.disabled), 'accepting terms releases the CTAs (ixian:accept emitted once)');

  // —— create: inline gates (launch-spec §2.2 — incl. BOTH C# parse hazards) ——
  ctas[0].click();
  ok(shell.dataset.view === 'create', 'Create CTA routes internally (the shell absorbs the legacy page)');
  const create = d.querySelector('[data-launch-view="create"]');
  const nick = create.querySelector('.c-launch__input');
  const [cpw, crp] = [...create.querySelectorAll('.c-lock__input')];
  const cerr = create.querySelector('.c-lock__error');
  const cbtn = create.querySelector('.c-launch__footer .c-button');
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
  ok(/var\(--gradient-lock\)/.test(lcss) && /env\(safe-area-inset-top\)/.test(lcss),
    '#160 inheritance (lock-spec §6⑤): welcome rides --gradient-lock, full-bleed with safe-area clearance');
  ok(/touch-action: pan-y/.test(lcss), 'carousel owns horizontal swipe only — vertical scroll stays native');
  ok(/isConnected/.test(ljs) && /isConnected/.test(lockjs2),
    'both window-pagehide listeners are self-cleaning (launch shell + [L2] lock screen)');
  ok((ljs.match(/\.trim\(\)/g) || []).length === 2 && /nick\.value\.trim\(\)/.test(ljs),
    'the ONLY trims are the nickname (display name) — passwords are NEVER trimmed');
  ok(/data-placeholder/.test(ljs) && /aria-hidden/.test(ljs),
    'illustration slots: placeholder-marked + decorative (copy carries the meaning)');
}

if (failures.length) { console.error('\nFAILED:\n' + failures.join('\n')); process.exit(1); }
console.log('\nsmoke test CLEAN');
process.exit(0); // jsdom windows hold live timers (their cleanup would hang the run)