/* ==== S19 F2 (#1371, Damir S18 walk, Android: "Enter or paste" — the chooser sheet jumped up as the keyboard rose) ====
 * On the BUILT index.html (jsdom), through the real path: FAB → New chat picker → "Add contact" → the chooser sheet.
 *   · ENTER: in the SAME tick as the tap (no await between the click and the reads) the sheet node AND its scrim are gone
 *     from the DOM, it is off the overlay stack, the host no longer carries data-overlay-open (no other overlay is open), and
 *     focus sits in the form's address input — the sheet never slides while the keyboard comes up;
 *   · SCAN keeps today's close: right after the tap the sheet is still in the DOM (its exit slide runs, data-open removed),
 *     and it is gone after the 400 ms fallback;
 *   · overlay.js itself: dismissOverlay(el, { instant: true }) on a plain sheet runs onDismiss synchronously and removes
 *     the scrim (the normal close's bookkeeping, not a bare node.remove()).
 * Deliberate breaks (S19 F2 report): contacts-page.js onEnter back to closeAddSheet() (the ENTER clause fails: the node is
 * still there); the instant branch in dismissOverlay deleted (ENTER + the overlay clause fail); onEnter's focus line deleted
 * (the focus half fails). */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  const openSheet = async (s) => {
    const { d } = s;
    d.getElementById('fab').click();
    await sleep(500);
    const row = [...d.querySelectorAll('.c-contacts .c-contacts__action')].find((x) => /Add contact/.test(x.textContent || ''));
    if (row) row.click();
    await sleep(300);
    return d.querySelector('.c-sheet--add-contact');
  };
  const r = {};
  let s = null;
  try {
    /* —— ENTER: instant —— */
    s = await K.boot('index.html', { wait: 1200 });
    let sheet = await openSheet(s);
    const S = s.W.Spixi;
    r.path = !!sheet && S.isOverlayOpen(sheet);
    const scrim = sheet && sheet.previousElementSibling;
    const host = sheet && sheet.parentElement;
    const enter = sheet && sheet.querySelector('.c-contacts-addsheet__item[data-kind="enter"]');
    enter.click();
    /* same tick — nothing awaited since the click */
    const input = s.d.querySelector('.c-contacts-add__input');
    r.enterGone = !sheet.isConnected && !!scrim && scrim.classList.contains('c-scrim') && !scrim.isConnected && !S.isOverlayOpen(sheet)
      && !!host && !host.hasAttribute('data-overlay-open');
    r.enterFocus = !!input && s.d.activeElement === input;
    s.close();

    /* —— SCAN: today's slide —— */
    s = await K.boot('index.html', { wait: 1200 });
    sheet = await openSheet(s);
    sheet.querySelector('.c-contacts-addsheet__item[data-kind="scan"]').click();
    const still = sheet.isConnected && !sheet.hasAttribute('data-open') && !s.W.Spixi.isOverlayOpen(sheet);
    await sleep(500);
    r.scanSlides = still && !sheet.isConnected;

    /* —— overlay.js: the instant close keeps the bookkeeping —— */
    let dismissed = 0;
    const el = s.W.Spixi.createSheet ? s.W.Spixi.createSheet({ title: 'T', onDismiss: () => { dismissed++; } }) : null;
    s.W.Spixi.openSheet(el);
    await sleep(60);
    const sc = el.previousElementSibling;
    const okClose = s.W.Spixi.dismissOverlay(el, { instant: true });
    r.overlay = okClose === true && dismissed === 1 && !el.isConnected && !!sc && !sc.isConnected && !s.d.body.hasAttribute('data-overlay-open');
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.threw = e.message; }
  finally { if (s) s.close(); }
  const c = (k, m) => ok(r[k] === true, m + ' — ' + JSON.stringify({ [k]: r[k], threw: r.threw }));
  c('path', '★ S19 F2: the real path opens the chooser sheet (FAB → New chat → Add contact)');
  c('enterGone', '★ S19 F2 (#1371): "Enter or paste" removes the sheet + its scrim in the SAME tick as the tap (no exit slide), off the stack, and the host drops data-overlay-open');
  c('enterFocus', '★ S19 F2 (#1371): …and the address input of the mounted form holds focus right after the tap (the keyboard comes up over a still screen)');
  c('scanSlides', '★ S19 F2: "Scan QR code" keeps today\'s close — the sheet is still in the DOM right after the tap (exit slide, data-open gone) and removed by the 400 ms fallback');
  c('overlay', '★ S19 F2: dismissOverlay(el, { instant: true }) runs the normal close\'s bookkeeping synchronously — onDismiss once, the scrim removed, the host\'s data-overlay-open cleared');
  c('noErr', '★ S19 F2: no page error on either path');
}
