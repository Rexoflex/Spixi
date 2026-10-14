/* ==== S20 G (#1379) — the New group screen: ONE "Set group photo" tab stop, and the "n / 10" counter reads right in RTL ====
 * On the BUILT index.html (jsdom), the real path (FAB → Create group → pick 3 → Next), the document set to dir="rtl" first:
 *   · ONE TAB STOP: inside the group hero exactly one focusable control does the photo pick, and exactly one element in the
 *     accessibility tree is named "Set group photo" (the photo button); the visible label stays a POINTER target (out of the
 *     tab order, aria-hidden) and a click on it still picks (ixian:groupavatar);
 *   · RTL "n / 10": the counter (the members head and the picker's line) is an LTR isolate — its text sits in an element with
 *     dir="ltr" (the HTML bidi isolate), while the line around it keeps the document's direction (rtl). Without it the bidi
 *     algorithm reorders "3 / 10" to read "10 / 3" in an RTL document (the S18 walk note).
 * jsdom has no bidi layout: the visual order was checked in Chromium for the S20 R report (the counter's "3" left of "10").
 * Deliberate breaks (S20 R report): the label's tabIndex / aria-hidden lines removed → oneStop fails; ★ #46 r1: the label's
 * mousedown preventDefault removed → oneStop fails (a mouse press would focus the hidden label); groupCounterNode
 * without `c.dir = 'ltr'` → rtlHead + rtlPicker fail. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  const people = Array.from({ length: 4 }, (_, i) => ['G' + String(i).padStart(2, '0') + 'member' + 'x'.repeat(42), 'Person ' + (i + 1)]);
  const r = {}, n = {};
  let s = null;
  try {
    s = await K.boot('index.html', { wait: 1500 });
    const { d, W } = s;
    d.documentElement.setAttribute('dir', 'rtl');
    s.push('addContacts', JSON.stringify({ strs: [], items: people.map(([a, nm]) => ({ f: 'addContact', a: [a, nm, '', 'False', '0', 'contact', ''] })) }));
    await sleep(200);
    d.getElementById('fab').click();
    await sleep(400);
    [...d.querySelectorAll('.c-contacts__action')].find((b) => /Create group/.test(b.textContent)).click();
    await sleep(100);
    const rowFor = (a) => d.querySelector('.c-contacts__row[data-address="' + a + '"]');
    for (let i = 0; i < 3; i++) rowFor(people[i][0]).click();
    await sleep(50);
    /* the picker's line: "3 / 10" */
    const hint = d.querySelector('.c-contacts__minhint');
    const isoOf = (box) => { const w = box && [...box.querySelectorAll('[dir]')].find((x) => /\d+\s*\/\s*\d+/.test(x.textContent)); return w || null; };
    const hIso = isoOf(hint);
    n.picker = { text: hint && hint.textContent, iso: hIso && hIso.getAttribute('dir'), lineDir: hint && (hint.closest('[dir]') || {}).getAttribute && hint.closest('[dir]').getAttribute('dir') };
    r.rtlPicker = !!hint && hint.textContent === '3 / 10' && !!hIso && hIso.getAttribute('dir') === 'ltr' && hIso.textContent === '3 / 10'
      && hint.closest('[dir]') === d.documentElement && d.documentElement.getAttribute('dir') === 'rtl';
    d.querySelector('.c-contacts .c-topbar__actions button').click();
    await sleep(400);
    const g = d.querySelector('.c-contacts-group');
    const count = g.querySelector('.c-contacts-group__members-count');
    const cIso = isoOf(count);
    n.head = { text: count && count.textContent, iso: cIso && cIso.getAttribute('dir') };
    r.rtlHead = !!count && count.textContent === '3 / 10' && !!cIso && cIso.getAttribute('dir') === 'ltr' && cIso.parentElement === count;
    /* one tab stop for the photo */
    const hero = g.querySelector('.c-contacts-group__hero');
    const av = g.querySelector('.c-contacts-group__avatar'), lab = g.querySelector('.c-contacts-group__photo-label');
    const inTabOrder = (e) => !e.disabled && e.tabIndex >= 0 && !e.closest('[hidden]');
    const hiddenFromAT = (e) => !!e.closest('[aria-hidden="true"]');
    const pickers = [av, lab].filter(Boolean);
    const name = (e) => (e.getAttribute('aria-label') || e.textContent || '').trim();
    const named = [...hero.querySelectorAll('button, [role="button"]')].filter((e) => !hiddenFromAT(e) && name(e) === 'Set group photo');
    n.stops = { av: av && [av.tabIndex, hiddenFromAT(av)], lab: lab && [lab.tabIndex, hiddenFromAT(lab)], named: named.length };
    const picks = () => s.sent.filter((x) => x === 'ixian:groupavatar').length;
    const md = new W.MouseEvent('mousedown', { bubbles: true, cancelable: true });
    lab.dispatchEvent(md);
    n.stops.mousedownKept = md.defaultPrevented;   // ★ #46 S20 r1: a mouse press does not focus the label (its default is cancelled)
    lab.click();
    r.oneStop = md.defaultPrevented && pickers.length === 2 && pickers.filter(inTabOrder).length === 1 && inTabOrder(av) && !hiddenFromAT(av)
      && named.length === 1 && named[0] === av && hiddenFromAT(lab) && picks() === 1;
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.threw = e.message; } finally { if (s) s.close(); }
  const c = (k, m) => ok(r[k] === true, m + ' — ' + JSON.stringify(r[k] === true ? { [k]: true, n: n[k === 'oneStop' ? 'stops' : k === 'rtlHead' ? 'head' : 'picker'] } : { [k]: r[k], threw: r.threw, n }).slice(0, 1200));
  c('oneStop', '★ S20 G (#1379): New group — ONE tab stop for the photo: the photo button is the only focusable pick and the only "Set group photo" in the accessibility tree; the visible label is a pointer target only (tabindex -1, aria-hidden) and its click still picks');
  c('rtlHead', '★ S20 G: RTL — the members head "n / 10" is an LTR isolate (dir="ltr"), so it reads n-then-cap in an RTL document');
  c('rtlPicker', '★ S20 G: RTL — the picker line "n / 10" is an LTR isolate inside a line that keeps the document direction (rtl)');
  c('noErr', '★ S20 G: no page error');
}
