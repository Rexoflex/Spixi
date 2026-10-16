/* ==== S20I OW-X-SELECT — desktop: the app chrome is not drag-selectable (Drop D) ====
 * Office walk 2026-10-15 (Damir 21:04 / 22:48, Mac): an accidental click-drag painted blue selection over the rail, the
 * section headings, the chat rows and the welcome slides. Mechanism: the touch-only `user-select: none` blocks in base.css
 * are scoped :root:not([data-desktop]), so on desktop nothing turned selection off. Fix: :root[data-desktop] body none,
 * `text` again ONLY on typed fields, the message text and the addresses; W9-④ (no text highlight during a desktop ROW
 * drag, [data-dragselect]) restated at equal specificity after it.
 * jsdom does not inherit user-select, so "effective" = the first own non-auto value walking up from the element
 * (WebKit inherits -webkit-user-select; Chromium resolves `auto` from the parent — the same answer here).
 *   (1) BUILT index.html / chat.html / intro.html / settings.html with data-desktop: NO element resolves to `auto`
 *       (= selectable by default), and every element that DECLARES `text` itself is an allowed one (fields, the message
 *       text, an address, or one of the explicit settings/wallet-receive copy targets);
 *   (2) synthetic probes in chat.html: .c-bubble__text → text; the same inside [data-dragselect] → none; an input → text;
 *       a contenteditable child → text; a full address (.c-addr-sheet__addr) → text; a plain heading → none; #46 r1: the
 *       TRUNCATED address displays (chat info, the Account header; r2: the declined list, the sheet's folded short form) and
 *       the payment card's fixed hint → none; the tx id, a file name, a mini app's URL and (r3) a photo caption → text;
 *   (3) the phone (no data-desktop) is unchanged: body none, input text (the #322 block), message text INSIDE a bubble none
 *       (#46 r1 N1: probed inside .c-bubble; on the phone iOS-33 and the #322 body rule both give none — the S20I change is
 *       desktop-only, so this leg guards against a desktop rule leaking to the phone, not against an iOS-33 removal).
 * Deliberate breaks (S20I report): (a) the `:root[data-desktop] body` rule removed → (1) fails (elements resolve auto);
 *   (b) the dragselect restatement removed → (2) fails (bubble text stays `text` during a row drag);
 *   (c) `.c-bubble__text` dropped from the re-enable list → (2) fails (message text none on desktop). */
import { b2Kit } from '../pins-s9/b2-kit.mjs';
const ALLOW = /^(INPUT|TEXTAREA)$/;
const ALLOW_CLASS = /(^|\s)(c-bubble__text|c-mgrid__caption|c-fbubble__name|c-txsheet__addrvalue|c-txsheet__rowvalue--id|c-member__addr-text|c-sendreview__addr|c-contacts-pending__addr|c-app-details__urlvalue|c-wallet-receive__addrvalue|c-settings-dev__log|c-settings-links__url|c-settings-contrib__credit-who)(\s|$)/;   // #46 r1 N2: the real class names of the explicit settings-app.css text rules
export default async function (h) {
  const { ok } = h;
  const { boot } = b2Kit(h);
  const own = (W, el) => { const s = W.getComputedStyle(el); return s.webkitUserSelect || s.userSelect || ''; };
  const eff = (W, el) => { for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const v = own(W, n); if (v && v !== 'auto') return v; } return 'auto'; };
  const allowed = (el) => ALLOW.test(el.tagName) || el.isContentEditable || el.hasAttribute('contenteditable') || !!el.closest('[contenteditable]') || ALLOW_CLASS.test(el.className && el.className.baseVal == null ? el.className : '');
  const sweep = {};
  for (const file of ['index.html', 'chat.html', 'intro.html', 'settings.html']) {
    let s = null;
    const r = { n: 0, auto: [], badText: [] };
    try {
      s = await boot(file, { wait: 900 });
      const { W, d } = s;
      d.documentElement.setAttribute('data-desktop', '');
      for (const el of d.body.querySelectorAll('*')) {
        if (/^(SCRIPT|STYLE|TEMPLATE|svg|path|g|circle|rect|line|polyline|polygon|ellipse|defs|use|linearGradient|radialGradient|stop|clipPath|mask|symbol|title|desc|filter|feGaussianBlur|feOffset|feBlend|feColorMatrix|feComposite|feFlood|feMerge|feMergeNode|text|tspan|pattern|image|foreignObject)$/.test(el.tagName)) continue;
        r.n++;
        const e = eff(W, el);
        if (e === 'auto' && r.auto.length < 5) r.auto.push(el.tagName + '.' + String(el.className || '').slice(0, 40));
        if (own(W, el) === 'text' && !allowed(el) && r.badText.length < 5) r.badText.push(el.tagName + '.' + String(el.className || '').slice(0, 40));
      }
      r.body = eff(W, d.body);
    } catch (e) { r.err = String(e); }
    finally { try { s && s.dom.window.close(); } catch (e) {} }
    sweep[file] = r;
  }
  const sw = Object.entries(sweep);
  ok(sw.every(([, r]) => !r.err && r.n > 20 && r.body === 'none' && r.auto.length === 0),
    `★ S20I OW-X-SELECT (1): on desktop no element of index / chat / intro / settings is selectable by default (body none, nothing resolves to auto) — ${JSON.stringify(sweep)}`);
  ok(sw.every(([, r]) => r.badText.length === 0),
    `★ S20I OW-X-SELECT (1): on desktop only fields, the message text and the addresses declare text — ${JSON.stringify(Object.fromEntries(sw.map(([f, r]) => [f, r.badText])))}`);
  // (2) + (3) synthetic probes on the built chat shell
  let s = null;
  const p = {};
  try {
    s = await boot('chat.html', { wait: 900 });
    const { W, d } = s;
    const host = d.createElement('div');
    host.innerHTML = '<div class="c-chatlist"><p class="c-bubble__text" id="pt">hi</p></div>'
      + '<div class="c-chatlist" data-dragselect=""><div class="c-bubble"><p class="c-bubble__text" id="pd">drag</p></div></div>'
      + '<input id="pi"><div contenteditable="true" id="pc"><b id="pcb">x</b></div>'
      + '<span class="c-member__addr-text" id="pa">addr</span><h2 id="ph">Chats</h2>'
      /* #46 r1 M1: a TRUNCATED address display stays unselectable (a drag-copied "425Hqz…XyZ12" is not an address) */
      + '<span class="c-chat-info__addr-value" id="ptr">425Hqz…XyZ12</span><span class="c-settings__addr-text" id="ptr2">425Hqz…XyZ12</span>'
      + '<span class="c-settings__ignored-addr" id="ptr3">425HqzWpM…XyZ12</span><div class="c-addr-sheet__addr"><span class="c-addr-sheet__short" id="ptr4">425HqzWp … AbXyZ12</span></div>'
      + '<p class="c-tcard__note" id="pnote">Not enough IXI</p>'
      /* #46 r1 M2: the real copy targets keep drag-select — the #1041 tx id, a payment card's note, a file name, a mini app's URL */
      + '<span class="c-txsheet__rowvalue--id" id="pid"><span class="c-txsheet__idhead">abc</span></span>'
      + '<p class="c-mgrid__caption" id="pcap">caption</p><span class="c-fbubble__name" id="pf">a.pdf</span><span class="c-app-details__urlvalue" id="pu">https://x</span>'
      /* #46 r1 N1: the phone probe of the iOS-33 rule — message text INSIDE a bubble, outside any drag */
      + '<div class="c-bubble"><p class="c-bubble__text" id="pbt">in a bubble</p></div>';
    d.body.appendChild(host);
    const v = (id) => eff(W, d.getElementById(id));
    d.documentElement.setAttribute('data-desktop', '');
    p.desk = { text: v('pt'), drag: v('pd'), input: v('pi'), ce: v('pcb'), addr: v('pa'), head: v('ph'), trunc: v('ptr'), trunc2: v('ptr2'),
      trunc3: v('ptr3'), trunc4: v('ptr4'), hint: v('pnote'), txid: v('pid'), file: v('pf'), url: v('pu'), cap: v('pcap') };
    d.documentElement.removeAttribute('data-desktop');
    p.phone = { body: eff(W, d.body), input: v('pi'), text: v('pbt'), head: v('ph') };
  } catch (e) { p.err = String(e); }
  finally { try { s && s.dom.window.close(); } catch (e) {} }
  const D = p.desk || {}, P = p.phone || {};
  ok(!p.err && D.text === 'text' && D.drag === 'none' && D.input === 'text' && D.ce === 'text' && D.addr === 'text' && D.head === 'none'
     && D.trunc === 'none' && D.trunc2 === 'none' && D.trunc3 === 'none' && D.trunc4 === 'none' && D.hint === 'none'
     && D.txid === 'text' && D.file === 'text' && D.url === 'text' && D.cap === 'text',
    `★ S20I OW-X-SELECT (2): desktop — message text + fields + full addresses + the tx id / file name / app URL / a photo caption (#46 r3) selectable; a heading, the card hint and every TRUNCATED address display not (#46 r1 M1, r2 M1); NOTHING during a row drag (W9-④) — ${JSON.stringify(p)}`);
  ok(!p.err && P.body === 'none' && P.input === 'text' && P.text === 'none' && P.head === 'none',
    `★ S20I OW-X-SELECT (3): the phone is unchanged (#322 body none · fields text · iOS-33 bubble text none) — ${JSON.stringify(p)}`);
}
