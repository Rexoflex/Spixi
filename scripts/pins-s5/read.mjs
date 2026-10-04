/* ==== SESSION 5b — #1163 / #1164: #1102 IMPLIED READ REMOVED (inverted pin; replaces the 3 #1102 pins) ====
 * A msgRead marks ONLY the message it names. The rule (ImpliedRead.cs + its MSTest), the msgRead call, the
 * updateTicks push (C#) and its chat-shell receiver are gone — no new bridge surface left behind.
 * Deliberate break (#802): put the ImpliedRead call back into the msgRead case, or the updateTicks receiver back
 * into the chat shell → this pin fails for exactly that reason. */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, existsSync, join, JSDOM, VirtualConsole, sleep } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const sp = stripCode(rd('Spixi/Network/StreamProcessor.cs'));
  const rc = sp.slice(sp.indexOf('case SpixiMessageCode.msgRead:'), sp.indexOf('case SpixiMessageCode.msgDelete:'));
  const cs = ['Spixi/Network/StreamProcessor.cs', 'Spixi/Utils/UIHelpers.cs', 'Spixi/Pages/Chat/SingleChatPage.xaml.cs'].map((f) => stripCode(rd(f))).join('\n');
  const f = join(root, 'Spixi/Resources/Raw/html/chat.html');
  const html = readFileSync(f, 'utf8');
  const errs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation/i.test(m)) errs.push(m); });
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    },
  });
  await sleep(2000);
  const W = dom.window;
  const d = W.document;
  const b64 = (v) => Buffer.from(String(v), 'utf8').toString('base64');
  const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map(b64));
  const T1 = Math.floor(Date.now() / 1000) - 120;
  const toneOf = (id) => { const row = d.querySelector('#messages [data-msgid="' + id + '"]'); const ic = row ? [...row.querySelectorAll('.c-bubble__meta .c-status-icon')] : null; return ic && ic.length ? ic[ic.length - 1].dataset.tone : (ic ? 'none' : null); };
  push('onChatScreenReady');
  push('clearMessages', 'False');
  push('addMe', 'm1', 'addrMe', 'Me', '', 'first', String(T1), 'True', 'True', 'False', 'False', 'False');
  push('addMe', 'm2', 'addrMe', 'Me', '', 'second', String(T1 + 1), 'True', 'True', 'False', 'False', 'False');
  if (typeof W.messagesDone === 'function') push('messagesDone');
  push('onChatScreenLoaded');
  await sleep(400);
  const before = { m1: toneOf('m1'), m2: toneOf('m2') };
  /* the receipt for m2 arrives: the msgRead case pushes updateMessage for m2 ONLY */
  push('updateMessage', 'm2', 'second', 'True', 'True', 'True', 'False', 'False');
  await sleep(1300);   // the 900 ms ghost belt (B10)
  const r = {
    ruleGone: !existsSync(join(root, 'Spixi/Utils/ImpliedRead.cs')) && !existsSync(join(root, 'Spixi-UnitTests/ImpliedReadTests.cs')),
    callGone: rc.length > 0 && !/ImpliedRead|markThrough|updateTicks|\[READ\] implied/.test(rc),
    /* the case names only the receipted message: one updateMessage for fm, no list walk, no extra write */
    onlyFm: /UIHelpers\.updateMessage\(friend, ch, fm\);/.test(rc) && !/getMessages\(ch\)/.test(rc) && !/requestWriteMessages\(/.test(rc),
    pushGone: !/updateTicks/.test(cs),
    shellGone: typeof W.updateTicks === 'undefined' && !/updateTicks/.test(html),
    before: before.m1 === 'delivered' && before.m2 === 'delivered',
    /* behaviour on the BUILT shell: m2 turns read, m1 STAYS delivered */
    m2Read: toneOf('m2') === 'read',
    m1Stays: toneOf('m1') === 'delivered',
    noErrors: errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0,
  };
  ok(Object.values(r).every((v) => v === true),
    '★★ #1163 (#1102 → A): NO IMPLIED READ — a msgRead marks only the message it names; an older own message keeps "delivered" (honest ticks with a lossy or legacy peer); ImpliedRead.cs + its MSTest, the msgRead call, the updateTicks push and its shell receiver are all gone — ' + JSON.stringify(r) + ' errs: ' + errs.slice(0, 2).join(' | '));
  try { dom.window.close(); } catch (e) {}
}
