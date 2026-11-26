/* ==== fixb5 · A — the removal of an OLD add-contact chooser never clears the handle of the NEW one (#1877); EXECUTED on the BUILT bundle ====
 *
 * LIMITS — read first (DECISIONS 1735: the limits of a pin are stated, not hidden).
 *   · jsdom, NOT a WebView. It evaluates the BUILT Spixi/Resources/Raw/html/spixi.icons.js + spixi.bundle.js (the two files the built home
 *     shell index.html loads) in a bare document and mounts the contacts takeover through `Spixi.mountContacts`, the way GATE 54 does; it does
 *     not load index.html itself. Paint, the real transitionend and the device's frame timing are NOT proven: the old chooser's removal is
 *     the 400 ms fallback timer of overlay.js (on a device it is usually the transitionend, the same `remove()` and the same onDismiss).
 *   · requestAnimationFrame is stubbed as setTimeout(0) like GATE 54. Every wait is a polled STATE (the node left the DOM), with a hang guard
 *     that can only fail the row; there is no fixed sleep that a slow machine could outrun.
 *   · The pin proves the end state that matters (no chooser is left open after a programmatic close of the takeover); it does not prove the
 *     handle's identity directly — the handle is private to mountContacts.
 *
 * KEYS (one `ok` each):
 *   fixb5 a1 the premise holds: the first chooser S1 was dismissed (Esc) and is still in the DOM, closed and off the overlay stack, while a re-tap opened a
 *            second chooser S2 that IS on the stack
 *   fixb5 a2 S1's removal fired (it left the DOM) and S2 is still on the stack and in the DOM (the old removal did not close the new chooser)
 *   fixb5 a3 a programmatic close of the takeover after that takes S2 down: it leaves the DOM, no chooser is on the stack, none carries data-open
 *   fixb5 a4 a chooser opened after all that is ONE fresh chooser and the takeover closes it again (the handle still works for a plain open / close)
 * DELIBERATE BREAK (#802) — in a COPY of the tree, in src/bridge/contacts-page.js (then the bundle and the shells rebuilt there):
 *   b1 `onDismiss: () => { if (addSheet === sheet) addSheet = null; }` → `onDismiss: () => { addSheet = null; }` (the old guard-less line)
 *      → a3 red (S2 stays in the DOM and on the stack after the close); a4 red too (the stranded S2 is still on the stack)
 */
export default async function (h) {
  const { ok, root, JSDOM, readFileSync, join, sleep } = h;
  if (!JSDOM) { ok(false, 'fixb5 a-chooser: jsdom is unavailable — an unrunnable pin is a RED one (GATE 44)'); return; }
  const dir = join(root, 'Spixi/Resources/Raw/html');
  const bundle = readFileSync(join(dir, 'spixi.bundle.js'), 'utf8');
  const icons = readFileSync(join(dir, 'spixi.icons.js'), 'utf8');
  const home = readFileSync(join(dir, 'index.html'), 'utf8');
  const HANG = 10000;   // wall-clock hang guard: it can only FAIL a row

  const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'file:///pin/' });
  const w = dom.window;
  w.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  w.cancelAnimationFrame = (id) => clearTimeout(id);
  w.eval(icons);
  w.eval(bundle);
  const S = w.Spixi;
  const doc = w.document;
  const choosers = () => [...doc.querySelectorAll('.c-sheet--add-contact')];
  const waitFor = async (cond) => { const t0 = Date.now(); while (!cond()) { if (Date.now() - t0 > HANG) return false; await sleep(10); } return true; };
  const addRow = () => { const rows = [...doc.querySelectorAll('button, [role="button"]')].filter((r) => /add contact/i.test(r.textContent || '')); return rows[rows.length - 1]; };

  ok(/<script src="spixi\.bundle\.js"/.test(home) && /<script src="spixi\.icons\.js"/.test(home) && /mountContacts\(\{/.test(home),
    'fixb5 a0 the files this pin evaluates are the ones the built home shell loads, and that shell mounts the contacts takeover (index.html: spixi.icons.js, spixi.bundle.js, mountContacts)');

  const view = S.mountContacts({
    host: doc.body, bridge: { send: () => {} }, strings: {},
    purpose: 'start', getRoster: () => [{ address: 'AAAA1111', name: 'Ann' }], onClose: () => {},
  });
  /* open S1, dismiss it (Esc), re-open S2 while S1 still slides out */
  addRow().click();
  const s1 = choosers()[0] || null;
  const s1Presented = await waitFor(() => !!s1 && s1.hasAttribute('data-open'));
  doc.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  const s1Lingers = !!s1 && s1.isConnected && !s1.hasAttribute('data-open') && !S.isOverlayOpen(s1);
  addRow().click();
  const s2 = choosers().find((e) => e !== s1) || null;
  const s2OnStack = !!s2 && S.isOverlayOpen(s2);
  ok(!!s1 && s1Presented && s1Lingers && !!s2 && s2OnStack && choosers().filter((e) => S.isOverlayOpen(e)).length === 1,
    'fixb5 a1 premise: the first chooser was presented, dismissed and still lingers (closed, off the stack); a re-tap opened a second one that is on the stack — ' + JSON.stringify({ s1Presented, s1Lingers, hasS2: !!s2, s2OnStack }));

  /* the OLD chooser's removal fires (its onDismiss runs) */
  const s1Gone = await waitFor(() => !!s1 && !s1.isConnected);
  ok(s1Gone && !!s2 && s2.isConnected && S.isOverlayOpen(s2),
    'fixb5 a2 the old chooser was removed and the new one is untouched (still in the DOM and on the overlay stack) — ' + JSON.stringify({ s1Gone, s2Connected: !!s2 && s2.isConnected, s2OnStack: !!s2 && S.isOverlayOpen(s2) }));

  /* a programmatic close of the takeover must take the new chooser down with it */
  await waitFor(() => !!s2 && s2.hasAttribute('data-open'));
  view.close('auto');
  const s2Gone = await waitFor(() => !!s2 && !s2.isConnected);
  const left = choosers();
  ok(s2Gone && left.length === 0 && !left.some((e) => S.isOverlayOpen(e) || e.hasAttribute('data-open')),
    'fixb5 a3 a programmatic close of the takeover after the old removal leaves no chooser open — ' + JSON.stringify({ s2Gone, choosersLeft: left.length, onStack: left.filter((e) => S.isOverlayOpen(e)).length, dataOpen: left.filter((e) => e.hasAttribute('data-open')).length }));

  /* the handle still serves a plain open / close on a fresh takeover */
  const view2 = S.mountContacts({
    host: doc.body, bridge: { send: () => {} }, strings: {},
    purpose: 'start', getRoster: () => [{ address: 'BBBB2222', name: 'Bo' }], onClose: () => {},
  });
  addRow().click();
  const fresh = choosers();
  const freshOnStack = fresh.filter((e) => S.isOverlayOpen(e));
  await waitFor(() => fresh.length === 1 && fresh[0].hasAttribute('data-open'));
  view2.close('auto');
  const freshGone = await waitFor(() => choosers().length === 0);
  ok(fresh.length === 1 && freshOnStack.length === 1 && freshGone,
    'fixb5 a4 a plain open then a programmatic close: exactly one chooser opened and none is left — ' + JSON.stringify({ opened: fresh.length, onStack: freshOnStack.length, freshGone }));
  w.close();
}
