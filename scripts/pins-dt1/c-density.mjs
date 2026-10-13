/* ==== #1390 (Damir 2026-10-13, the "Spixi Desktop Row Density" render, picked all three) — THE DESKTOP LIST DENSITY ====
 * On the BUILT index.html and settings.html (jsdom; ?desktop=1 / ?mobile=1 are the shells' own preview overrides):
 *   · LADDER (index.html head): spixi.chat.listdensity 'compact' | 'dense' → :root[data-row-density]; absent / any other
 *     value → 'comfortable'; under 'dense' :root[data-preview-lines] stays '1' even when spixi.chat.previewlines is '2'
 *     (a dense row is one line); a write from another document (storage event) re-reads both, live;
 *   · CSS (the cascade winner on a real row): comfortable = the 48 avatar (avatar.css, untouched); compact = the 40
 *     avatar; dense = the 32 avatar, 6 px padding, the content and the trailing column in ONE row; every density rule is
 *     under :root[data-desktop] — a phone boot with 'dense' stored keeps the 48 avatar and the column layout;
 *   · SETTINGS (Chat appearance, desktop): a "List density" radiogroup FIRST in the chat-list card — Comfortable ·
 *     Compact · Dense, Comfortable checked by default; a tap writes the literal; Dense hides the Message preview control
 *     (and Compact brings it back); a stored 'dense' reopens on Dense with the control hidden, an invalid value reads
 *     Comfortable; a phone boot has no density control (and the Message preview control as today).
 * Deliberate breaks: docs/review-brief-dt1-r2.md §5 (the DT-1 round 2 #46 verdict). */
import { aKit } from '../pins-s11/a-kit.mjs';
import { cascade } from '../pins-s19/r-cascade.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  const DK = 'spixi.chat.listdensity', PK = 'spixi.chat.previewlines';
  const r = {}, n = {};
  const TS = Math.floor(Date.now() / 1000);
  const row = (a, name, ex) => [a, name, String(TS - 60), 'img/spixiavatar.png', 'false', ex, '', '1', '', 'False', 'text', ''];
  const grow = (a, name, ex, snd, online) => [a, name, String(TS - 90), 'img/spixiavatar.png', online, ex, '', '0', 'group', 'False', 'text', snd];
  const flush = (push) => { push('clearChats'); push('addChat', ...row('A1', 'Mira', 'chess tonight?')); push('addChat', ...row('B1', 'Jonas', 'thursday'));
    push('addChat', ...grow('G1', 'Falcon', 'hey all', 'George', 'false')); push('addChat', ...[...row('O1', 'Ana', 'hi')].map((x, i) => (i === 4 ? 'true' : x))); push('clearChatsDone'); };
  let s = null;
  try {
    /* —— the ladder —— */
    const attrs = async (storage, desktop = true) => {
      const b = await K.boot('index.html', { desktop, wait: 700, storage });
      const v = [b.d.documentElement.dataset.rowDensity, b.d.documentElement.dataset.previewLines].join('/');
      b.close();
      return v;
    };
    n.ladder = {
      none: await attrs({}),
      compact: await attrs({ [DK]: 'compact' }),
      dense: await attrs({ [DK]: 'dense' }),
      upper: await attrs({ [DK]: 'DENSE' }),
      junk: await attrs({ [DK]: '"><img src=x>' }),
      comfortable: await attrs({ [DK]: 'comfortable' }),
      dense2: await attrs({ [DK]: 'dense', [PK]: '2' }),
      compact2: await attrs({ [DK]: 'compact', [PK]: '2' }),
      comfortable2: await attrs({ [PK]: '2' }),
    };
    r.ladder = JSON.stringify(n.ladder) === JSON.stringify({
      none: 'comfortable/1', compact: 'compact/1', dense: 'dense/1', upper: 'comfortable/1', junk: 'comfortable/1', comfortable: 'comfortable/1',
      dense2: 'dense/1', compact2: 'compact/2', comfortable2: 'comfortable/2',
    });

    /* —— live: another document writes the key —— */
    s = await K.boot('index.html', { desktop: true, wait: 1200, storage: { [PK]: '2' } });
    const { W, d, push } = s;
    flush(push); await sleep(300);
    const root = () => d.documentElement.dataset.rowDensity + '/' + d.documentElement.dataset.previewLines;
    n.live = [root()];
    W.localStorage.setItem(DK, 'dense');
    W.dispatchEvent(new W.StorageEvent('storage', { key: DK }));
    n.live.push(root());
    W.localStorage.setItem(DK, 'compact');
    W.dispatchEvent(new W.StorageEvent('storage', { key: 'spixi.unrelated' }));
    n.live.push(root());   // an unrelated key does not re-read
    W.dispatchEvent(new W.StorageEvent('storage', { key: DK }));
    n.live.push(root());
    r.live = JSON.stringify(n.live) === JSON.stringify(['comfortable/2', 'dense/1', 'dense/1', 'compact/2']);

    /* —— the CSS winners on a real row —— */
    const css = (W2, d2) => {
      const { win } = cascade(W2);
      const it = d2.querySelector('.c-chatlist-item[data-address="B1"]');
      const av = it && it.querySelector('.c-avatar');
      return {
        av: av ? win(av, 'width') + '|' + win(av, 'height') : '?',
        ini: av ? win(av.querySelector('.c-avatar__initials'), 'font-size') : '?',
        pad: it ? win(it, 'padding-block') : '?',
        content: it ? win(it.querySelector('.c-chatlist-item__content'), 'flex-direction') : '?',
        right: it ? win(it.querySelector('.c-chatlist-item__right'), 'flex-direction') : '?',
        align: it ? win(it.querySelector('.c-chatlist-item__content'), 'align-items') : '?',
        /* #46 r2 MINOR-2: the r1 fixes, pinned — the group glyph, the online dot, the sender cap, the hue-2 shadow */
        glyph: (() => { const g = d2.querySelector('.c-chatlist-item[data-address="G1"] .c-avatar > svg'); return g ? win(g, 'width') + '|' + win(g, 'height') : '?'; })(),
        dot: (() => { const o = d2.querySelector('.c-chatlist-item[data-address="O1"] .c-avatar__dot'); return o ? win(o, 'width') : '?'; })(),
        sender: (() => { const sd = d2.querySelector('.c-chatlist-item[data-address="G1"] .c-excerpt__sender'); return sd ? win(sd, 'max-width') : '?'; })(),
        shadow: (() => { const i0 = av && av.querySelector('.c-avatar__initials'); if (!i0) return '?'; const was = av.getAttribute('data-hue'); av.setAttribute('data-hue', '2'); const h2 = win(i0, 'text-shadow'); av.setAttribute('data-hue', '5'); const h5 = win(i0, 'text-shadow'); if (was == null) av.removeAttribute('data-hue'); else av.setAttribute('data-hue', was); return h2 + '|' + h5; })(),
      };
    };
    const setDensity = (v) => { W.localStorage.setItem(DK, v); W.dispatchEvent(new W.StorageEvent('storage', { key: DK })); };
    setDensity('comfortable'); n.comfortable = css(W, d);
    setDensity('compact'); n.compact = css(W, d);
    setDensity('dense'); n.dense = css(W, d);
    r.cssComfortable = n.comfortable.av === 'var(--size-avatar-48)|var(--size-avatar-48)' && n.comfortable.pad === 'var(--spacing-8)' && n.comfortable.content === 'column' && n.comfortable.right === 'column';
    r.cssCompact = n.compact.av === 'var(--size-avatar-40)|var(--size-avatar-40)' && n.compact.ini === '15px' && n.compact.pad === 'var(--spacing-8)' && n.compact.content === 'column'
      && n.compact.glyph === '22px|22px' && n.compact.dot !== '10px' && n.compact.sender !== n.dense.sender;
    r.cssDense = n.dense.av === 'var(--size-avatar-32)|var(--size-avatar-32)' && n.dense.ini === '12px' && n.dense.pad === '6px' && n.dense.content === 'row' && n.dense.right === 'row-reverse'
      && n.dense.align === 'center' && n.dense.glyph === '18px|18px' && n.dense.dot === '10px' && n.dense.sender === 'max(40%, 7ch)'
      && n.dense.shadow === '0 1px 2px rgba(0, 0, 0, 0.3)|0 1px 1px rgba(0, 0, 0, 0.25)';
    /* every density rule is a desktop rule */
    const { rules } = cascade(W);
    n.densitySels = [];
    for (const { r: rule } of rules) {
      if (!/data-row-density/.test(rule.selectorText)) continue;
      for (const sel of rule.selectorText.split(',')) n.densitySels.push(sel.trim());
    }
    r.desktopOnly = n.densitySels.length >= 10 && n.densitySels.every((x) => /^:root\[data-desktop\]\[data-row-density="(compact|dense)"\] /.test(x));
    s.close(); s = null;

    /* —— a phone with 'dense' stored: today's row —— */
    s = await K.boot('index.html', { desktop: false, wait: 1200, storage: { [DK]: 'dense', [PK]: '2' } });
    flush(s.push); await sleep(300);
    n.phone = css(s.W, s.d);
    n.phone.preview = s.d.documentElement.dataset.previewLines;   /* #46 r1 A-M1: dense never clamps a phone's 2-line preview */
    r.phone = !s.d.documentElement.hasAttribute('data-desktop') && n.phone.av === 'var(--size-avatar-48)|var(--size-avatar-48)' && n.phone.content === 'column' && n.phone.pad !== '6px'
      && n.phone.preview === '2';
    s.close(); s = null;

    /* —— Settings › Chat appearance —— */
    /* settings.html has no ?mobile=1 override and jsdom's UA is not a phone: a phone boot makes the #228 UA test fail */
    const asPhone = (x) => x.replace('if(!/Android|iPhone|iPad|IEMobile|Mobile/.test(u)', 'if(false&&!/Android|iPhone|iPad|IEMobile|Mobile/.test(u)');
    const openAppearance = async (storage, desktop = true) => {
      const t = await K.boot('settings.html', { desktop, wait: 1500, storage, html: desktop ? null : asPhone });
      t.push('setCaps', 'settingsApply,downloadsInline');
      await sleep(200);
      const hubRow = t.d.querySelector('[data-setting-key="chatappearance"]') || [...t.d.querySelectorAll('.c-settings__row')].find((x) => /Chat appearance/.test(x.textContent));
      if (hubRow) hubRow.click();
      await sleep(300);
      return t;
    };
    let t = await openAppearance({});
    const grp = () => t.d.querySelector('.c-settings-appearance__density');
    const radios = () => [...((grp() && grp().querySelectorAll('[role="radio"]')) || [])];
    const checked = () => (radios().find((x) => x.getAttribute('aria-checked') === 'true') || { dataset: {} }).dataset.value;
    const linesHidden = () => { const w = t.d.querySelector('.c-settings-appearance__lines-wrap'); return !!w && w.hidden === true && !!w.querySelector('.c-settings-appearance__preview-lines'); };
    const card = t.d.querySelector('.c-settings-appearance__card--list');
    const lab = grp() && t.d.getElementById(grp().getAttribute('aria-labelledby') || '-');
    n.set = {
      group: !!grp() && grp().getAttribute('role') === 'radiogroup' && !!lab && lab.textContent === 'List density',
      names: radios().map((x) => x.textContent.trim()).join('|'),
      first: !!card && !!grp() && card.firstElementChild === lab && lab.nextElementSibling === grp(),
      def: checked(),
      linesShown: !linesHidden(),
      tab: radios().map((x) => x.tabIndex).join(','),
    };
    radios()[2].click(); await sleep(60);
    n.set.wroteDense = t.W.localStorage.getItem(DK) + '/' + checked() + '/' + linesHidden();
    radios()[1].click(); await sleep(60);
    n.set.wroteCompact = t.W.localStorage.getItem(DK) + '/' + checked() + '/' + linesHidden();
    radios()[0].click(); await sleep(60);
    n.set.wroteComfortable = t.W.localStorage.getItem(DK) + '/' + checked();
    /* the radio keyboard (the shared radioArrows): End moves AND picks (writes); ArrowLeft from the first wraps to the last */
    radios()[0].dispatchEvent(new t.W.KeyboardEvent('keydown', { key: 'End', bubbles: true })); await sleep(40);
    n.set.keyEnd = t.W.localStorage.getItem(DK) + '/' + checked() + '/' + linesHidden();
    radios()[0].click(); await sleep(40);
    n.set.noErr = K.noErr(t.errs);
    t.close();
    t = await openAppearance({ [DK]: 'dense' });
    n.set.reopenDense = checked() + '/' + linesHidden();
    t.close();
    t = await openAppearance({ [DK]: 'x' });
    n.set.invalid = checked();
    t.close();
    t = await openAppearance({ [DK]: 'dense' }, false);
    n.set.phone = !t.d.documentElement.hasAttribute('data-desktop') + '/' + !grp() + '/' + !!t.d.querySelector('.c-settings-appearance__preview-lines') + '/' + !t.d.querySelector('.c-settings-appearance__lines-wrap');
    /* the COMPONENT's own guard (not only the host's): isDesktop false + a handler → still no control */
    const ca = t.W.Spixi && t.W.Spixi.createChatAppearance;
    n.set.compGuard = !!ca && !ca({ isDesktop: false, onListDensity() {}, onPreviewLines() {} }).querySelector('.c-settings-appearance__density')
      && !!ca({ isDesktop: true, onListDensity() {}, onPreviewLines() {} }).querySelector('.c-settings-appearance__density');
    t.close(); t = null;
    r.settings = n.set.group && n.set.names === 'Comfortable|Compact|Dense' && n.set.first && n.set.def === 'comfortable' && n.set.linesShown && n.set.tab === '0,-1,-1'
      && n.set.keyEnd === 'dense/dense/true' && n.set.wroteDense === 'dense/dense/true' && n.set.wroteCompact === 'compact/compact/false' && n.set.wroteComfortable === 'comfortable/comfortable'
      && n.set.noErr && n.set.reopenDense === 'dense/true' && n.set.invalid === 'comfortable' && n.set.phone === 'true/true/true/true' && n.set.compGuard;
  } catch (e) {
    r.threw = false;
    n.err = String(e && e.stack || e).slice(0, 400);
  } finally {
    if (s) s.close();
  }
  ok(Object.values(r).length >= 8 && Object.values(r).every(Boolean),
    '★ #1390 (Damir: all three, desktop only): the list density — the home ladder (spixi.chat.listdensity → data-row-density; dense holds the preview at 1 line; a storage write re-reads live), the CSS winners (48 / 40 / 32 avatars, dense = one row), every density rule under :root[data-desktop] (a phone with dense stored is unchanged), and Settings › Chat appearance › List density (first in the card, Dense hides Message preview, desktop only) — ' + JSON.stringify({ r, n }));
}
