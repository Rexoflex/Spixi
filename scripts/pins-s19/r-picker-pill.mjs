/* ==== S19 F12 (#1371, Damir S18 walk: the picker's multi-select confirm was a bare ✓ icon) — the TONAL LABELLED PILL ====
 * On the BUILT index.html (jsdom), the shipped picker component (W.Spixi.createContactsPicker) under the shipped CSS:
 *   · GROUP (purpose 'start' → Create group): the top-bar confirm is the topbar.js TEXT action — a tonal 32 px pill
 *     (.c-topbar__action--text, data-type tonal, data-size 32, not icon-only) whose visible label is "Next" and which keeps
 *     the check glyph; disabled at 0 / 1 selected (a group needs 2), enabled at 2 with the count in its aria-label
 *     ("Next (2)" — the accessible name starts with the visible text, WCAG 2.5.3); a tap hands the selection to onNext;
 *   · APP INVITE (purpose 'app'): the same pill labelled "Start", disabled until one target, "Start (1)" after it;
 *   · browse mode has no confirm at all.
 * Deliberate breaks (S19 F12 report): the `text:` field dropped from the action (pill fails — back to the 44 icon button);
 * syncNext without the disabled line (gate fails). */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  const r = {}, n = {};
  let s = null;
  const roster = [
    { name: 'Ana', address: 'addr-ana-0000000000000000000000000000000001', type: 0 },
    { name: 'Ben', address: 'addr-ben-0000000000000000000000000000000002', type: 0 },
    { name: 'Cid', address: 'addr-cid-0000000000000000000000000000000003', type: 0 },
  ];
  const pill = (btn, label) => !!btn && btn.classList.contains('c-topbar__action--text') && btn.dataset.type === 'tonal' && btn.dataset.size === '32'
    && !btn.hasAttribute('data-icon-only') && (btn.querySelector('.c-button__label') || {}).textContent === label && !!btn.querySelector('svg.c-button__icon');
  try {
    s = await K.boot('index.html', { wait: 1200 });
    const { W, d } = s;
    let picked = null;
    const g = W.Spixi.createContactsPicker({ contacts: roster, purpose: 'start', onCreateGroup() {}, onNext: (sel) => { picked = sel; } });
    d.body.append(g);
    const confirm = (root) => root.querySelector('.c-topbar__actions button');
    n.browse = !!confirm(g);
    [...g.querySelectorAll('.c-contacts__action')][1].click();   // Create group → multi
    await sleep(20);
    const rows = () => [...g.querySelectorAll('.c-contacts__row')];
    const b0 = confirm(g);
    n.g0 = { label: b0 && (b0.querySelector('.c-button__label') || {}).textContent, aria: b0 && b0.getAttribute('aria-label'), disabled: b0 && b0.disabled, cls: b0 && b0.className };
    r.pill = !n.browse && pill(b0, 'Next');
    rows()[0].click();
    const one = { disabled: confirm(g).disabled, aria: confirm(g).getAttribute('aria-label') };
    rows()[1].click();
    const two = { disabled: confirm(g).disabled, aria: confirm(g).getAttribute('aria-label') };
    n.gate = { zero: n.g0.disabled, one, two };
    r.gate = n.g0.disabled === true && n.g0.aria === 'Next' && one.disabled === true && one.aria === 'Next (1)' && two.disabled === false && two.aria === 'Next (2)';
    confirm(g).click();
    r.next = Array.isArray(picked) && picked.length === 2;
    g.remove();
    /* app invite */
    const a = W.Spixi.createContactsPicker({ contacts: roster, purpose: 'app', onNext() {} });
    d.body.append(a);
    const ab = confirm(a);
    const a0 = { disabled: ab && ab.disabled, aria: ab && ab.getAttribute('aria-label') };
    [...a.querySelectorAll('.c-contacts__row')][0].click();
    const a1 = { disabled: confirm(a).disabled, aria: confirm(a).getAttribute('aria-label') };
    n.app = { a0, a1 };
    r.app = pill(ab, 'Start') && a0.disabled === true && a0.aria === 'Start' && a1.disabled === false && a1.aria === 'Start (1)';
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.threw = e.message; }
  finally { if (s) s.close(); }
  const c = (k, m) => ok(r[k] === true, m + ' — ' + JSON.stringify(r[k] === true ? { [k]: true } : { [k]: r[k], threw: r.threw, n }));
  c('pill', '★ S19 F12 (#1371): the group picker\'s confirm is the tonal labelled pill — "Next" + the check glyph, 32 px, the topbar text-action class (no confirm in browse mode)');
  c('gate', '★ S19 F12: the pill is disabled at 0 and 1 selected, enabled at 2, and its aria-label carries the count ("Next (2)")');
  c('next', '★ S19 F12: a tap on the enabled pill hands the 2-member selection to onNext');
  c('app', '★ S19 F12: the app-invite picker wears the same pill labelled "Start" — disabled until one target, "Start (1)" after it');
  c('noErr', '★ S19 F12: no page error');
}
