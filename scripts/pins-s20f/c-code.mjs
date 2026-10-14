/* ==== S20F W-11 (#1409 "build it"): INLINE CODE = AN OUTLINE CHIP · THE PADDED BLOCK ====
 * On the BUILT chat.html (jsdom; the r-cascade winner per element) — a received row and a sent row with code + a mention:
 *   (1) CHIP ≠ MENTION: the code chip paints NO fill (no background winner) where the @-mention has its tonal pill; it
 *       draws a 1 px INSET outline (box-shadow `inset 0 0 0 var(--outline-width-1) var(--fmt-rule)`); its padding is
 *       `1px 6px` (the mention's `0 3px`); the rule ink = --outline-fmt-code on a received bubble (light → --outline-neutral-02,
 *       dark → --outline-neutral-04) and --outline-on-hero on a sent one.
 *   (2) ★ r3 INLINE (the S20F short-chip logic is REMOVED — data-short / inline-block in r0, the c-fmt-nb glue in r1 / r2:
 *       one defect per round, so the design went): a code span is ONE inline span.c-fmt-code as at HEAD — no data-short, no
 *       c-fmt-nb, no display / white-space override, `overflow-wrap: anywhere`; "`foo`.evil.com" / "`x`/evil.com" no link,
 *       "`x`/@Me" / "`x`:@Me" no pill, "`x`https://a.com" its link (HEAD's results; controls "evil.com" / "@Me" do form).
 *   (3) THE BLOCK: padding `var(--spacing-8) var(--spacing-12)`, margin `var(--spacing-8) 0`, `--radius-8`, a 3 px START rule
 *       (`border-inline-start: 3px solid var(--fmt-rule)`, the pre is dir=ltr), still `white-space: pre` + `overflow-x: auto` +
 *       `max-width: 100%` (the sideways scroll), and its fill per direction is unchanged.
 * Deliberate breaks (S20F report): the code background put back (`.c-fmt-code { background: var(--surface-bubble-received-quote) }`)
 * → CHIP · `border-inline-start` → `border-left` → BLOCK · (r3) the r2 glue + the data-short mark put back in msg-format.js
 * → INLINE · (r3) `.c-fmt-code[data-short] { display: inline-block }` put back in format-bar.css → INLINE. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
import { cascade } from '../pins-s19/r-cascade.mjs';
export default async function (h) {
  const { ok, readFileSync, join, root, stripCssComments } = h;
  const K = b1Kit(h);
  const r = {};
  const got = {};
  let s = null;
  try {
    s = await K.open({ group: true, rows: false, hist: (x) => {
      x.push('addThem', 'k1', 'addrAna', 'Ana', '', 'hi @Me run `npm` then `npm install --save x`\n```\nnode a.mjs\n```', String(K.T0), 'True', 'True', 'True', 'False', 'False');
      x.push('addThem', 'k3', 'addrAna', 'Ana', '', 'run `smoke`. then', String(K.T0 + 30), 'True', 'True', 'True', 'False', 'False');
      /* the reader's r2 runs: a link / a mention across a chip as at HEAD (c* = the controls) */
      const NOGLUE = { n1: 'see `foo`.evil.com now', n2: 'open `x`/evil.com please', n3: 'cc `x`/@Me hi', n4: 'cc `x`:@Me hi', n5: 'get `x`https://a.com now',
        n6: '`lol`' + '\u{1F602}'.repeat(6) + ' ok', n7: '`ok`' + '!'.repeat(90), n8: 'see `smoke`' + '.'.repeat(70) + ' end', n9: 'ok `x`!!!! go',
        c1: 'see evil.com now', c2: 'cc @Me hi' };   // c* = the controls: a link / a pill DO form without a chip
      let i = 40; for (const [id, t] of Object.entries(NOGLUE)) x.push('addThem', id, 'addrAna', 'Ana', '', t, String(K.T0 + (i++)), 'True', 'True', 'True', 'False', 'False');
      x.push('addMe', 'k2', 'addrMe', 'Me', '', 'ok `smoke` and\n```\nnode b.mjs\n```', String(K.T0 + 60), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '');
    } });
    const { W, d } = s;
    const C = cascade(W);
    const row = (id) => K.rowOf(d, id);
    const rc = row('k1') && row('k1').querySelector('code.c-fmt-code');
    const sc = row('k2') && row('k2').querySelector('code.c-fmt-code');
    const men = row('k1') && row('k1').querySelector('.c-bubble__mention');
    const rp = row('k1') && row('k1').querySelector('pre.c-fmt-pre');
    const sp = row('k2') && row('k2').querySelector('pre.c-fmt-pre');
    const bg = (el) => C.win(el, 'background') || C.win(el, 'background-color');
    got.chip = rc && { bg: bg(rc), shadow: C.win(rc, 'box-shadow'), pad: C.win(rc, 'padding'), rule: C.win(rc, '--fmt-rule'), sentRule: sc && C.win(sc, '--fmt-rule') };
    got.men = men && { bg: bg(men), pad: C.win(men, 'padding') };
    /* the rule token per theme, read as the cascade winner on :root */
    const de = d.documentElement;
    de.setAttribute('data-theme', 'light'); const tokL = C.win(de, '--outline-fmt-code');
    de.setAttribute('data-theme', 'dark'); const tokD = C.win(de, '--outline-fmt-code');
    de.setAttribute('data-theme', 'light');
    got.tok = [tokL, tokD, C.win(de, '--outline-on-hero')];
    r.chip = !!got.chip && !got.chip.bg && !!got.men && /var\(--surface-action-tonal-default\)/.test(got.men.bg)
      && /^inset 0 0 0 var\(--outline-width-1\) var\(--fmt-rule\)$/.test(got.chip.shadow) && got.chip.pad === '1px 6px' && got.chip.pad !== got.men.pad
      && got.chip.rule === 'var(--outline-fmt-code)' && got.chip.sentRule === 'var(--outline-on-hero)'
      && tokL === 'var(--outline-neutral-02)' && tokD === 'var(--outline-neutral-04)' && /^rgba\(255, ?255, ?255, ?0\.45\)$/.test(got.tok[2]);
    /* (2) ★ r3 (the short-chip line logic REMOVED — a defect in three rounds, r1 orphans · r2 unbounded overflow · r3 bounded
       overflow + CJK orphans): a code span is ONE inline span.c-fmt-code as at HEAD — no data-short, no c-fmt-nb wrapper, no
       display override, overflow-wrap anywhere (it wraps like text); the reader's runs keep HEAD's link / mention result */
    const S = W.Spixi;
    const R = (t) => { const host = d.createElement('div'); host.append(S.renderFormat(t)); return host; };
    const cases = ['see `smoke`. ok', 'a `--check`, then', '(`x`!) y', 'see `abcdefghijklmnopqrstuvwx`. end', '`ok`' + '!'.repeat(90), '`lol`\u{1F602}\u{1F602} ok', 'これ`npm`。次'].map(R);
    const log = d.getElementById('messages');
    got.inline = { short: [...cases, log].reduce((n, h) => n + h.querySelectorAll('code[data-short]').length, 0), nb: [...cases, log].reduce((n, h) => n + h.querySelectorAll('.c-fmt-nb').length, 0),
      shape: cases[0].innerHTML.replace(/ dir="ltr"/, ''), disp: rc && C.win(rc, 'display'), wrap: rc && C.win(rc, 'overflow-wrap'), ws: rc && C.win(rc, 'white-space'),
      rules: C.rules.filter(({ r: ru }) => /c-fmt-nb|c-fmt-code\[data-short\]/.test(ru.selectorText)).length, strip: S.stripFormat('see `smoke`. ok'), text: cases[0].textContent };
    const I = got.inline;
    r.inline = I.short === 0 && I.nb === 0 && I.shape === 'see <code class="c-fmt-code">smoke</code>. ok' && !I.disp && I.wrap === 'anywhere' && !I.ws && I.rules === 0
      && I.strip === 'see smoke. ok' && I.text === 'see smoke. ok';
    const ng = (id) => { const rw = row(id); return rw ? { links: [...rw.querySelectorAll('.c-bubble__link')].map((x) => x.title || x.textContent), pills: rw.querySelectorAll('.c-bubble__mention').length } : null; };
    got.noglue = {}; for (const id of ['n1', 'n2', 'n3', 'n4', 'n5', 'c1', 'c2']) got.noglue[id] = ng(id);
    const NG = got.noglue;
    r.headLinks = !!NG.n1 && NG.n1.links.length === 0 && NG.n2.links.length === 0 && NG.n3.pills === 0 && NG.n4.pills === 0
      && NG.n5.links.length === 1 && /a\.com/.test(NG.n5.links[0]) && NG.c1.links.length === 1 && NG.c2.pills === 1;   // c1 / c2 = the controls
    /* (3) the block — jsdom's CSSOM drops the logical border shorthand, so the start rule is read from the built sheet's own
       .c-fmt-pre rule text (the cascade winners carry the rest) */
    const css = stripCssComments(readFileSync(join(root, 'Spixi/Resources/Raw/html/chat.html'), 'utf8'));
    const preRules = [...css.matchAll(/(^|\})\s*\.c-fmt-pre\s*\{([^}]*)\}/g)].map((m) => m[2]);
    got.preRule = preRules.map((x) => x.replace(/\s+/g, ' ').trim());
    const startRule = preRules.some((b) => /border-inline-start:\s*3px solid var\(--fmt-rule\)/.test(b)) && !preRules.some((b) => /border-(left|right)\s*:/.test(b));
    got.pre = rp && { pad: C.win(rp, 'padding'), margin: C.win(rp, 'margin'), radius: C.win(rp, 'border-radius'), ws: C.win(rp, 'white-space'), ox: C.win(rp, 'overflow-x'), max: C.win(rp, 'max-width'), dir: rp.dir, bgR: bg(rp), bgS: sp && bg(sp), ruleS: sp && C.win(sp, '--fmt-rule') };
    const P = got.pre;
    r.block = startRule && preRules.length === 1 && !!P && P.pad === 'var(--spacing-8) var(--spacing-12)' && P.margin === 'var(--spacing-8) 0' && P.radius === 'var(--radius-8)'
      && P.ws === 'pre' && P.ox === 'auto' && P.max === '100%' && P.dir === 'ltr'
      && P.bgR === 'var(--surface-bubble-received-quote)' && P.bgS === 'var(--surface-wash-on-hero)' && P.ruleS === 'var(--outline-on-hero)';
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.err = e.message + ' ' + (e.stack || '').split('\n')[1]; }
  finally { if (s) s.W.close(); }
  ok(Object.values(r).every((v) => v === true),
    '★ S20F W-11 (#1409): inline code is an OUTLINE chip (no fill, a 1 px inset rule in --outline-fmt-code / --outline-on-hero, padding 1px 6px — not the filled @-mention pill) that stays ONE inline span as at HEAD (no data-short, no c-fmt-nb, wraps like text; links / mentions across a chip as at HEAD), and the ``` block has the 8 / 12 padding, the 8 px margin, radius 8 and a 3 px border-inline-start in the same rule ink, still scrolling sideways — '
    + JSON.stringify({ r, got }));
}
