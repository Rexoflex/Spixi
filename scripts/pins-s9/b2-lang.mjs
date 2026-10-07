/* ==== SESSION 9 (B2) — THE LANGUAGE NOTE ON EVERY PICKER (#1246 L = A, #1143) ====
 * On the BUILT settings.html / intro.html (jsdom):
 *   · Settings hub sheet, current = de-de: the note (role=note) sits ABOVE the radiogroup and OUTSIDE it, in German,
 *     with a link button; a tap sends exactly `ixian:reportTranslation:de-de` (a double tap = one verb);
 *     the CHECKED row carries [data-autofocus] (a keyboard open lands on it, not on the link)
 *   · current = en-us: no note anywhere
 *   · the desktop pane picker (setPaneMode) shows the same note; after a pick + setLocale it follows the NEW language
 *     and disappears for English
 *   · A4 hidden fallback language: the pending hint shows, the note does not
 *   · Launch pill (intro.html?lang=fr-fr): the note in French, the link sends `ixian:reportTranslation:fr-fr`;
 *     intro.html in English: no note
 * Deliberate breaks: see the S9 B2 report. */
import { b2Kit } from './b2-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = b2Kit(h);
  const NOTE_DE = 'Einige Texte in dieser Sprache wurden mit KI übersetzt und können Fehler enthalten. Sag uns Bescheid, wenn du einen findest.';
  const langRow = (s) => [...s.d.querySelectorAll('button.c-settings__row')].find((x) => x.textContent.includes((s.W.SL && s.W.SL.language) || 'Language'));
  const noteOf = (root) => root && root.querySelector('.c-settings__opts-note');
  try {
    /* —— Settings hub sheet, de-de —— */
    let s = await boot('settings.html', { query: 'lang=de-de' });
    s.push('setLanguage', 'de-de');
    await sleep(250);
    let row = langRow(s);
    if (row) row.click();
    await sleep(250);
    let sheet = s.d.querySelector('.c-sheet');
    let note = noteOf(sheet);
    const group = sheet && sheet.querySelector('[role="radiogroup"]');
    const text = note && note.querySelector('.c-settings__opts-note-text');
    const link = note && note.querySelector('button.c-settings__opts-note-link');
    ok(!!note && note.getAttribute('role') === 'note' && !!text && text.textContent === NOTE_DE
      && !!link && link.textContent === 'Übersetzungsfehler melden',
    '★ S9 #1246 L: Settings language sheet (de-de) shows the AI note + "Report" link in the CURRENT language — ' + JSON.stringify(note && note.textContent));
    ok(!!group && !!note && !group.contains(note)
      && !!(note.compareDocumentPosition(group) & s.W.Node.DOCUMENT_POSITION_FOLLOWING),
    '★ S9 #1246 L: the note sits ABOVE the radiogroup and outside it (a link is not a radio)');
    const checked = group && group.querySelector('[aria-checked="true"]');
    ok(!!checked && checked.hasAttribute('data-autofocus') && group.querySelectorAll('[data-autofocus]').length === 1,
      '★ S9 #1246 L: the CHECKED language row carries [data-autofocus] — a keyboard open lands on it, not on the link');
    let n0 = s.sent.length;
    if (link) { link.click(); link.click(); }
    await sleep(30);
    let verbs = JSON.stringify(s.sent.slice(n0));
    ok(verbs === '["ixian:reportTranslation:de-de"]',
      '★ S9 #1246 L: the link sends ixian:reportTranslation:<current code>, once per burst — ' + verbs);
    s.dom.window.close();

    /* —— English: no note —— */
    s = await boot('settings.html');
    s.push('setLanguage', 'en-us');
    await sleep(250);
    row = langRow(s);
    if (row) row.click();
    await sleep(250);
    sheet = s.d.querySelector('.c-sheet');
    ok(!!sheet && !!sheet.querySelector('[role="radiogroup"]') && !noteOf(s.d),
      '★ S9 #1246 L: English (en-us) → the picker has NO note');
    s.dom.window.close();

    /* —— Desktop pane picker: note, then it follows an in-place re-localize —— */
    s = await boot('settings.html', { query: 'lang=de-de' });
    s.push('setLanguage', 'de-de'); s.push('setPaneMode', 'true');
    await sleep(300);
    row = langRow(s);
    if (row) row.click();
    await sleep(300);
    const det = s.d.querySelector('.sd-detail');
    note = noteOf(det);
    ok(!!note && note.textContent.startsWith('Einige Texte') && !s.d.querySelector('.c-sheet'),
      '★ S9 #1246 L: the desktop pane picker (inline) shows the note too — ' + JSON.stringify(note && note.textContent.slice(0, 30)));
    const pick = (label) => { const o = [...s.d.querySelectorAll('.sd-detail .c-settings__opt')].find((x) => x.textContent.includes(label)); if (o) o.click(); };
    pick('Français'); await sleep(50); s.push('setLocale', 'fr-fr'); await sleep(350);
    note = noteOf(s.d.querySelector('.sd-detail'));
    const frOk = !!note && note.textContent.startsWith('Une partie du texte');
    n0 = s.sent.length;
    const frLink = note && note.querySelector('button');
    if (frLink) frLink.click();
    await sleep(30);
    const frVerb = JSON.stringify(s.sent.slice(n0));
    pick('English'); await sleep(50); s.push('setLocale', 'en-us'); await sleep(350);
    const enGone = !noteOf(s.d.querySelector('.sd-detail')) && !!s.d.querySelector('.sd-detail [role="radiogroup"]');
    ok(frOk && frVerb === '["ixian:reportTranslation:fr-fr"]' && enGone,
      '★ S9 #1246 L: after a pane pick + setLocale the note follows the NEW language (fr → its own verb arg), and English drops it — ' + JSON.stringify({ frOk, frVerb, enGone }));
    s.dom.window.close();

    /* —— A4 hidden fallback language: the hint, no note —— */
    s = await boot('settings.html');
    s.push('setLanguage', 'xx-yy');
    await sleep(250);
    row = langRow(s);
    if (row) row.click();
    await sleep(250);
    sheet = s.d.querySelector('.c-sheet');
    ok(!!sheet && !!sheet.querySelector('.c-settings__opts-hint') && !noteOf(s.d),
      '★ S9 #1246 L: a hidden (A4 fallback) language keeps its pending hint and gets NO AI note (its UI is English)');
    s.dom.window.close();

    /* —— Launch pill —— */
    s = await boot('intro.html', { query: 'lang=fr-fr' });
    const pill = s.d.querySelector('.c-launch__pill');
    if (pill) pill.click();
    await sleep(250);
    note = noteOf(s.d);
    n0 = s.sent.length;
    const lLink = note && note.querySelector('button.c-settings__opts-note-link');
    if (lLink) lLink.click();
    await sleep(30);
    verbs = JSON.stringify(s.sent.slice(n0));
    ok(!!note && note.textContent.startsWith('Une partie du texte') && verbs === '["ixian:reportTranslation:fr-fr"]',
      '★ S9 #1246 L: the Launch language pill shows the note (fr) and its link sends ixian:reportTranslation:fr-fr — ' + verbs);
    s.dom.window.close();
    s = await boot('intro.html');
    const pill2 = s.d.querySelector('.c-launch__pill');
    if (pill2) pill2.click();
    await sleep(250);
    ok(!!s.d.querySelector('[role="radiogroup"]') && !noteOf(s.d), '★ S9 #1246 L: the Launch pill in English has NO note');
    s.dom.window.close();
  } catch (e) {
    ok(false, '★ S9 B2 language-note pins threw: ' + (e && e.stack || e));
  }
}
