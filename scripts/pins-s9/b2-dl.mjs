/* ==== SESSION 9 (B2) — DOWNLOADS IN A DESKTOP DIALOG (#1173 (8), #1246 D = B) ====
 * On the BUILT downloads.html (jsdom):
 *   · before any push the page is a page: ← "Back", Esc sends nothing
 *   · setPresentation('dialog') → :root[data-presentation=dialog], the SAME topbar button becomes ✕ "Close"
 *     (the x glyph) and still sends ixian:back; Esc sends ixian:back once
 *   · with a confirm open (delete a file) Esc closes the confirm and sends NO ixian:back
 *   · an unknown kind is ignored; setPresentation('page') restores ← "Back" and Esc goes quiet again
 * Deliberate breaks: see the S9 B2 report. */
import { b2Kit } from './b2-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = b2Kit(h);
  try {
    const s = await boot('downloads.html');
    const { d, W, push, sent } = s;
    push('clearFiles'); push('addFile', 'notes.txt', 'Oct 7'); push('addFile', 'a.pdf', 'Oct 6');
    await sleep(250);
    const btn = () => d.querySelector('.c-topbar > button');
    const glyph = () => { const p = btn() && btn().querySelector('svg path'); return p ? p.getAttribute('d') : ''; };
    const esc = () => { const e = new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }); (d.activeElement || d.body).dispatchEvent(e); };
    const backGlyph = glyph();
    let n0 = sent.length;
    esc(); await sleep(30);
    ok(!d.documentElement.hasAttribute('data-presentation') && btn() && btn().getAttribute('aria-label') === 'Back' && sent.length === n0,
      '★ S9 #1173(8): without the push Downloads is a page — ← "Back", Esc sends nothing');

    push('setPresentation', 'dialog');
    await sleep(30);
    const xGlyph = glyph();
    const xRef = (() => { const i = W.SpixiIcons && W.SpixiIcons.icon && W.SpixiIcons.icon('x'); const p = i && i.querySelector('path'); return p ? p.getAttribute('d') : '?'; })();
    ok(d.documentElement.dataset.presentation === 'dialog' && btn().getAttribute('aria-label') === 'Close'
      && xGlyph === xRef && xGlyph !== backGlyph && d.querySelectorAll('.c-topbar > button').length === 1,
    '★ S9 #1173(8) D=B: setPresentation("dialog") turns the SAME topbar button into ✕ "Close" (the x glyph)');
    n0 = sent.length;
    btn().click(); await sleep(30);
    ok(JSON.stringify(sent.slice(n0)) === '["ixian:back"]', '★ S9 #1173(8): the ✕ sends ixian:back (C# closes the dialog) — ' + JSON.stringify(sent.slice(n0)));
    n0 = sent.length;
    esc(); await sleep(30);
    ok(JSON.stringify(sent.slice(n0)) === '["ixian:back"]', '★ S9 #1173(8): Esc in the dialog sends ixian:back — ' + JSON.stringify(sent.slice(n0)));

    /* a confirm open → Esc is the confirm's */
    await sleep(700);   // past the Esc burst latch
    const del = d.querySelector('.c-settings-dl__del');
    if (del) del.click();
    await sleep(120);
    const confirmUp = d.body.dataset.overlayOpen !== undefined;
    n0 = sent.length;
    esc(); await sleep(450);
    const backs = sent.slice(n0).filter((c) => c === 'ixian:back').length;
    ok(confirmUp && backs === 0 && d.body.dataset.overlayOpen === undefined,
      '★ S9 #1173(8): with a confirm open, Esc closes the CONFIRM and sends no ixian:back — ' + JSON.stringify({ confirmUp, backs }));

    push('setPresentation', 'bogus');
    await sleep(30);
    const stillDialog = d.documentElement.dataset.presentation === 'dialog' && btn().getAttribute('aria-label') === 'Close';
    push('setPresentation', 'page');
    await sleep(30);
    await sleep(700);
    n0 = sent.length;
    esc(); await sleep(30);
    ok(stillDialog && !d.documentElement.hasAttribute('data-presentation') && btn().getAttribute('aria-label') === 'Back'
      && glyph() === backGlyph && sent.length === n0,
    '★ S9 #1173(8): an unknown kind is ignored; setPresentation("page") restores ← "Back" and Esc goes quiet');
    s.dom.window.close();
  } catch (e) {
    ok(false, '★ S9 B2 downloads-dialog pins threw: ' + (e && e.stack || e));
  }
}
