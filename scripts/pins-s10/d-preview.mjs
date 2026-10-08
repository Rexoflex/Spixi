/* ==== SESSION 10 (D) — P4 "Message preview" (#1254, Damir pick 2B) — ★ S11 re-base (#1261/#1263): default 1 LINE, and the
 *      settings control is an INLINE segmented "1 line | 2 lines" (the Text size grammar), no option sheet ====
 * BUILT shells in jsdom (d-kit: in-memory localStorage installed before the head scripts):
 *   · index.html (home) reads spixi.chat.previewlines at boot → :root[data-preview-lines]: absent / invalid → '1'
 *     (★ S11 re-base), '2' → '2'; re-read on storage (that key, or a clear) · visibilitychange (visible) · pageshow
 *   · '2' → the excerpt is ONE inline flow (computed: -webkit-box, clamp 2, overflow-wrap anywhere, sender + text
 *     inline, 2 lines tall, the trailing column grows with it); '1' → the single nowrap line (unchanged)
 *   · a group row reads "Han Solo: text" (a real space after the colon, outside the sender span "Han Solo:"); the
 *     glyph carries a gap in the inline flow; unread keeps the text bold
 *   · settings.html Chat appearance: ★ S11 re-base (#1261/#1263) — a "Message preview" segmented control right under
 *     Text size (radiogroup, "1 line | 2 lines", "1 line" checked by default); a tap writes '1' | '2' and the check
 *     follows; a stored '2' re-opens on "2 lines"; an invalid stored value reads "1 line"
 * Deliberate breaks: see the S10 D report. */
import { dKit } from './d-kit.mjs';
const KEY = 'spixi.chat.previewlines';
export default async function (h) {
  const { ok, sleep, stripCssComments } = h;
  const { boot } = dKit(h);
  try {
    /* —— home: the boot read —— */
    const attrAt = async (storage) => { const s = await boot('index.html', { storage, wait: 900 }); const v = s.d.documentElement.dataset.previewLines; s.dom.window.close(); return v; };
    const boots = { absent: await attrAt({}), one: await attrAt({ [KEY]: '1' }), two: await attrAt({ [KEY]: '2' }), junk: await attrAt({ [KEY]: '3"]' }) };
    ok(boots.absent === '1' && boots.one === '1' && boots.two === '2' && boots.junk === '1',   /* ★ S11 re-base (#1261/#1263): the default is 1 line */
      '★ S10 P4 (★ S11 re-base #1261/#1263): home reads spixi.chat.previewlines at boot — absent → 1 (the default), "2" → 2, "1" → 1, an invalid value → 1 — ' + JSON.stringify(boots));

    /* —— home: re-read on storage / visibilitychange / pageshow, and the row CSS —— */
    const s = await boot('index.html', { storage: { [KEY]: '2' } });   /* ★ S11 re-base (#1261/#1263): the 2-line cases boot with the key '2' */
    const { W, d, push, ls } = s;
    const TS = String(Math.floor(Date.now() / 1000));
    const row = (a, name, ex, kind, ek, snd, unread = '0') => [a, name, TS, 'img/spixiavatar.png', 'false', ex, '', unread, kind, 'False', ek, snd];
    push('clearChats');
    push('addChat', ...row('g1', 'Camping Group', 'I was there just 2 hours ago and the whole campsite was already full', 'group', 'text', 'Han Solo', '2'));
    push('addChat', ...row('f1', 'John', 'Skynet-access-codes.md', '', 'file', ''));
    push('clearChatsDone');
    await sleep(400);
    const exOf = (name) => { const it = [...d.querySelectorAll('.c-chatlist-item')].find((x) => (x.querySelector('.c-chatlist-item__name') || {}).textContent === name); return it ? it.querySelector('.c-excerpt') : null; };
    const g = exOf('Camping Group'), f = exOf('John');
    const cs = (el) => (el ? W.getComputedStyle(el) : {});
    const root = () => d.documentElement.dataset.previewLines;
    const sender = g && g.querySelector('.c-excerpt__sender');
    const r = {
      text: !!g && g.textContent === 'Han Solo: I was there just 2 hours ago and the whole campsite was already full',
      senderSpan: !!sender && sender.textContent === 'Han Solo:' && !!sender.nextSibling && sender.nextSibling.nodeType === 3 && sender.nextSibling.nodeValue === ' ',
      two: root() === '2',
      flow: cs(g).display === '-webkit-box' && cs(g).getPropertyValue('-webkit-line-clamp') === '2' && cs(g).overflowWrap === 'anywhere' && cs(g).whiteSpace === 'normal'
        && cs(g).getPropertyValue('-webkit-box-orient') === 'vertical' && cs(g).overflow === 'hidden'   /* (#46 r1 R3-4) the clamp needs both */
        && /^calc\(2 \* var\(--line-height-body-sm\)\)$/.test(cs(g).minHeight),
      inline: cs(sender).display === 'inline' && cs(g && g.querySelector('.c-excerpt__text')).display === 'inline' && cs(g && g.querySelector('.c-excerpt__text')).whiteSpace === 'normal',
      glyphGap: !!f && /var\(--spacing-4\)/.test(cs(f.querySelector(':scope > svg')).marginInlineEnd || cs(f.querySelector(':scope > svg')).getPropertyValue('margin-inline-end')),
      unreadBold: /semibold/.test(cs(g && g.querySelector('.c-excerpt__text')).fontWeight),
      rightGrows: /\+ 2 \* var\(--line-height-body-sm\)/.test(cs(g && g.closest('.c-chatlist-item').querySelector('.c-chatlist-item__right')).minHeight),
    };
    /* (#46 r1 R3-2) the peer name and the peer text are bidi-isolated in the inline flow */
    r.bidi = cs(g.querySelector('.c-excerpt__sender-name')).unicodeBidi === 'isolate' && cs(g.querySelector('.c-excerpt__text')).unicodeBidi === 'isolate';
    /* (#46 r1 R3-3) a name over 24 grapheme clusters shows capped in 2-line mode; the full name stays the text (the
       accessible name) and the title; an emoji (one grapheme, two code units) is never split; ≤ 24 → no cap */
    const LONG = 'Bartholomew Montgomery-Fitzwilliam the Third of Somewhere';
    const EMO = '👩‍👩‍👧‍👦'.repeat(30);
    push('addChat', ...row('g2', 'Long room', 'the message must still show', 'group', 'text', LONG));
    push('addChat', ...row('g3', 'Emoji room', 'hi', 'group', 'text', EMO));
    push('addChat', ...row('g4', 'Exact room', 'hi', 'group', 'text', 'x'.repeat(24)));
    await sleep(350);
    const sOf = (name) => { const e = exOf(name); return e && e.querySelector('.c-excerpt__sender'); };
    const sl = sOf('Long room'), se2 = sOf('Emoji room'), sx = sOf('Exact room');
    const segs = (t) => [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(t)].map((x) => x.segment);
    const nameEl = sl && sl.querySelector('.c-excerpt__sender-name');
    r.cap = !!sl && sl.dataset.short === segs(LONG).slice(0, 24).join('').trimEnd() + '…' && sl.title === LONG && sl.textContent === LONG + ':'
      && !!se2 && se2.dataset.short === EMO.slice(0, EMO.length / 30 * 24) + '…'
      && !!sx && sx.dataset.short === undefined && !sx.title
      && !!nameEl;   /* #46 r2 MINOR-1: the hiding lives in @supports (jsdom applies no @supports rule) — asserted as CSS text in capCss */
    {
      const idx = s.d.documentElement.outerHTML;
      r.capCss = /@supports \(content: "x" \/ ""\) \{\s*:root\[data-preview-lines="2"\] \.c-chatlist-item \.c-excerpt__sender\[data-short\]::before \{\s*content: attr\(data-short\) \/ '';\s*unicode-bidi: isolate;\s*\}\s*:root\[data-preview-lines="2"\] \.c-chatlist-item \.c-excerpt__sender\[data-short\] > \.c-excerpt__sender-name \{\s*position: absolute;[^}]*clip-path: inset\(50%\);[^}]*\}\s*\}/.test(stripCssComments(idx));   /* ★ #46 r2 MINOR-1: cap + hide ONLY where the empty-alt content syntax exists (else the full name flows, never read twice) */
    }
    /* storage: another document writes the key */
    ls.setItem(KEY, '1');
    const se = (key) => { let e; try { e = new W.StorageEvent('storage', { key }); } catch (x) { e = new W.Event('storage'); Object.defineProperty(e, 'key', { value: key }); } W.dispatchEvent(e); };
    se('spixi.other'); await sleep(10);
    r.otherKeyIgnored = root() === '2';
    se(KEY); await sleep(10);
    r.storage = root() === '1';
    r.oneLine = cs(g).display === 'flex' && cs(g.querySelector('.c-excerpt__text')).whiteSpace === 'nowrap' && cs(sender).display === 'flex';
    /* visibilitychange (visible) */
    ls.setItem(KEY, '2');
    d.dispatchEvent(new W.Event('visibilitychange')); await sleep(10);
    r.visibility = root() === '2';
    /* pageshow */
    ls.setItem(KEY, '1');
    W.dispatchEvent(new W.Event('pageshow')); await sleep(10);
    r.pageshow = root() === '1';
    /* a clear (key null) re-reads → the default (★ S11 re-base: 1 line) */
    ls.setItem(KEY, '2');
    se(KEY); await sleep(10);
    ls.clear();
    se(null); await sleep(10);
    r.clearDefault = root() === '1';
    r.noErrors = s.errs.filter((e) => /ReferenceError|TypeError/.test(e)).length === 0;
    s.dom.window.close();
    ok(Object.values(r).every(Boolean),
      '★ S10 P4 (2B): in 2-line mode the chats-row excerpt is ONE inline flow — "Han Solo: text" (a real space, the sender span still "Han Solo:"), -webkit-box vertical clamp 2 overflow hidden, overflow-wrap anywhere, the peer name + text bidi-isolated, a name over 24 graphemes shown capped (full name = text + title), 2 lines tall, the glyph with its gap, unread bold, the trailing column grown; home re-reads the key on storage / visibilitychange / pageshow, and "1" is the single nowrap line — ' + JSON.stringify(r));

    /* —— (#46 r1 R3-3) an engine WITHOUT Intl.Segmenter caps by code points: a surrogate pair is never cut —— */
    const sn = await boot('index.html', { storage: {}, noSegmenter: true });
    sn.push('clearChats');
    sn.push('addChat', ...row('g1', 'Smiles', 'hi', 'group', 'text', '😀'.repeat(30)));
    sn.push('clearChatsDone');
    await sleep(350);
    const snd2 = sn.d.querySelector('.c-excerpt__sender');
    ok(!(sn.W.Intl && sn.W.Intl.Segmenter) && !!snd2 && snd2.dataset.short === '😀'.repeat(24) + '…',
      '★ S10 #46 r1 R3-3: without Intl.Segmenter the 2-line sender cap counts code points — 24 whole emoji + "…", never half a surrogate pair — ' + JSON.stringify(snd2 && snd2.dataset.short && snd2.dataset.short.length));
    sn.dom.window.close();

    /* —— desktop list: the same rule —— */
    const sd = await boot('index.html', { storage: { [KEY]: '2' }, desktop: true });   /* ★ S11 re-base (#1261/#1263) */
    sd.push('clearChats');
    sd.push('addChat', ...row('g1', 'Camp', 'a long message that wraps', 'group', 'text', 'Ana'));
    sd.push('clearChatsDone');
    await sleep(400);
    const gd = sd.d.querySelector('.c-excerpt');
    ok(sd.d.documentElement.hasAttribute('data-desktop') && sd.d.documentElement.dataset.previewLines === '2' && !!gd && sd.W.getComputedStyle(gd).display === '-webkit-box',
      '★ S10 P4: the desktop chats list takes the same 2-line flow');
    sd.dom.window.close();

    /* —— settings: the Chat appearance row —— */
    const openAppearance = async (storage) => {
      const t = await boot('settings.html', { storage, wait: 1500 });
      t.push('setCaps', 'settingsApply,downloadsInline');
      await sleep(200);
      const hubRow = t.d.querySelector('[data-setting-key="chatappearance"]') || [...t.d.querySelectorAll('.c-settings__row')].find((x) => /Chat appearance/.test(x.textContent));
      if (hubRow) hubRow.click();
      await sleep(300);
      return t;
    };
    /* ★ S11 re-base (#1261/#1263): the inline segmented control (the Text size grammar) replaced the row + sheet */
    let t = await openAppearance({});
    const seg = () => t.d.querySelector('.c-settings-appearance__preview-lines');
    const pills = () => [...((seg() && seg().querySelectorAll('.c-settings-seg__pill')) || [])];
    const checked = () => (pills().find((p) => p.getAttribute('aria-checked') === 'true') || {}).textContent;
    const secs = [...t.d.querySelectorAll('.c-settings-appearance .c-settings__section')];
    const sizeIdx = secs.findIndex((x) => /Message text size/.test(x.textContent));
    const plIdx = secs.findIndex((x) => x.contains(seg()));
    const sizeSeg = secs[sizeIdx] && secs[sizeIdx].querySelector('.c-settings-seg');
    const st = {
      control: !!seg() && seg().getAttribute('role') === 'radiogroup' && seg().getAttribute('aria-label') === 'Message preview'
        && seg().classList.contains('c-settings-seg') && !!sizeSeg && seg().className.split(' ')[0] === sizeSeg.className.split(' ')[0]
        && /Message preview/.test(((secs[plIdx] && secs[plIdx].querySelector('.c-settings__label')) || {}).textContent),
      pills: pills().map((p) => p.textContent).join('|') === '1 line|2 lines' && pills().every((p) => p.getAttribute('role') === 'radio'),
      default1: checked() === '1 line',
      underTextSize: sizeIdx >= 0 && plIdx === sizeIdx + 1,
      noSheetRow: !t.d.querySelector('.c-settings-appearance .c-settings__row-value') || ![...t.d.querySelectorAll('.c-settings-appearance .c-settings__row')].some((x) => /Message preview/.test(x.textContent)),
    };
    if (pills()[1]) pills()[1].click();
    await sleep(60);
    st.wrote2 = t.ls.getItem(KEY) === '2' && checked() === '2 lines' && !t.d.querySelector('.c-settings__opt');
    if (pills()[0]) pills()[0].click();
    await sleep(60);
    st.wrote1 = t.ls.getItem(KEY) === '1' && checked() === '1 line';
    st.noErrors = t.errs.filter((e) => /ReferenceError|TypeError/.test(e)).length === 0;
    t.dom.window.close();
    t = await openAppearance({ [KEY]: '2' });
    st.reopen2 = checked() === '2 lines';
    t.dom.window.close();
    t = await openAppearance({ [KEY]: 'x' });
    st.invalid1 = checked() === '1 line';
    t.dom.window.close();
    ok(Object.values(st).every(Boolean),
      '★ S10 P4 (★ S11 re-base #1261/#1263): Chat appearance has a "Message preview" INLINE segmented control right under Text size — the same radiogroup grammar, "1 line | 2 lines", "1 line" checked by default; a tap writes spixi.chat.previewlines "2" | "1" and the check follows (no sheet); a stored "2" reopens on "2 lines", an invalid value reads "1 line" — ' + JSON.stringify(st));
  } catch (e) {
    ok(false, '★ S10 D preview pins threw: ' + (e && e.stack || e));
  }
}
