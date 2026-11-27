/* ==== Property tests of the parsers that take UNTRUSTED input (quality plan item 5; the list: scripts/quality/parsers.md) ====
 * fast-check, FIXED seed (SEED below), a bounded run count per property; the whole module runs in well under 30 s.
 * Every property names the defect class it catches. Row names: `QTOOLS <id>: <property>`; a row for a defect that is
 * KNOWN and not fixed is `QTOOLS-KNOWN <id>: <defect>` (contract I5): it PASSES while the stored counterexample still
 * reproduces the defect and goes RED when the code is fixed (then: delete the row, widen the property's domain).
 *
 * HOW THE CODE IS LOADED. The shipped ES modules are imported straight from src/ (`import()` of the file) under a jsdom
 * `document` that this module installs on globalThis for its own run and removes again at the end. The parsers that sit
 * inside src/shells/chat.html (an inline script) and the one private function of contacts-shell.js are cut out of the
 * SOURCE TEXT by anchor and brace-matching and built with `new Function`: a moved or renamed anchor turns the
 * `QTOOLS extract` row red (fail closed), it never silently skips a property.
 *
 * SELF-TEST (#802, L5, L18). Each property is run a second time against a MUTATED COPY of the parser — the copy is
 * written to the OS temp dir (never to src/), one edit per mutant, the anchor must occur exactly once — and the pin
 * requires that property to FAIL for that mutant. The `QTOOLS break` rows say which edit and show the counterexample.
 *
 * WHAT THIS CANNOT SEE. (1) The C# parsers (FsCheck is not in this batch). (2) What a WebView does with a DOM this
 * file proved safe (CSS, the shell's confirm modal): the property reads the DOM the parser builds, not the pixels.
 * (3) A homograph host (an IDN that LOOKS like another): the label and the real host are both punycode-normalised by
 * the URL parser, so they agree. (4) Checksums: the JS side holds only SHAPE gates for addresses (the base58 alphabet and
 * a length window); the checksum is C#'s (Base58CheckEncoding) and is not tested here. (5) Inputs outside the generators:
 * a counterexample-free run is evidence, not proof. (6) Timing rows read the CPU time of the process, not the wall clock; F4 compares the cost at 16 000 and 64 000 chars (measured: the correct code 17 ms at 64 000, the scanning mutant 900 ms, a ratio of 15 against 4; limits 8× and 600 ms). The linkify cap (B3) is pinned by behaviour: no link button over LINKIFY_MAX. (7) Seeds: QTOOLS_SEED / QTOOLS_RUNS_X change the seed and the run count for a hand sweep; every property holds on the shipped code for any seed, or its defect is held. */
import fc from 'fast-check';
import { pathToFileURL } from 'node:url';
import { mkdtempSync, mkdirSync, copyFileSync, readdirSync as rdir, writeFileSync, readFileSync as rfile, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as pjoin } from 'node:path';

/* QTOOLS_SEED overrides the seed (and QTOOLS_RUNS_X the run count factor) for a sweep by hand; the smoke and CI never set it. */
export const SEED = Number(process.env.QTOOLS_SEED) || 20261127;
const RUNS_X = Number(process.env.QTOOLS_RUNS_X) || 1;

/* ───────────────────────────── generators ───────────────────────────── */
const PIECES = ['*', '_', '~', '`', '```', '``', '\n', '\n```\n', ' ', ' ', 'a', 'b', '1', 'é', 'ž', '😀', '👍🏽', '\u200d', '\u200f', '\ufeff', '@', '@bob',
  '.', ',', '!', '?', ';', ':', '(', ')', '[', '<', '>', '&', '"', '\'', '/', '\\', '#', '%', '-', '=', 'https://', 'http://', 'www.', 'x.com', 'a.b.c',
  'github.com/a_b_c', 'paypal.com@evil.com', 'javascript:', 'data:', '<img src=x onerror=alert(1)>', '<script>x</script>', '&lt;b&gt;', '</pre>',
  '\ud83d', '\ude00', 'İ', 'ß'];
const soup = (max = 40) => fc.array(fc.constantFrom(...PIECES), { maxLength: max }).map((a) => a.join(''));
const DENSE = ['*', '*', '_', '_', '~', '`', '```', '\n', ' ', 'a', 'b', 'é', 'x.com', 'https://', 'www.', '@a', '1', '.', '<b>', '😀', 'A', 'B', 'Ab'];
const dense = (max = 40) => fc.array(fc.constantFrom(...DENSE), { maxLength: max }).map((a) => a.join(''));
const anyStr = fc.oneof(
  { weight: 4, arbitrary: dense() },
  { weight: 3, arbitrary: soup() },
  { weight: 2, arbitrary: fc.string({ unit: 'grapheme', maxLength: 40 }) },
  { weight: 1, arbitrary: fc.string({ unit: 'binary', maxLength: 40 }) },
  { weight: 1, arbitrary: fc.string({ maxLength: 60 }) });
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const digitStr = (minLength, maxLength) => fc.string({ unit: fc.constantFrom(...'0123456789'), minLength, maxLength });
const LOCALES = ['zh-CN', 'de-DE', 'en-US', 'es-CO', 'fr-FR', 'id-ID', 'it-IT', 'ja-JP', 'lt-LT', 'pt-BR', 'ru-RU', 'sl-SI', 'sq-AL', 'sr-RS'];

/* ───────────────────────────── small helpers ───────────────────────────── */
const must = (c, m) => { if (!c) throw new Error(m); };
const MARKNL = new Set(['*', '_', '~', '`', '\n']);   // marks, and the one newline a fence takes with it
const counts = (s) => { const m = new Map(); for (let i = 0; i < s.length; i++) m.set(s[i], (m.get(s[i]) || 0) + 1); return m; };
/* a is x with chars deleted: the multiset difference holds only `allowed` chars, and a is a subsequence of x */
function onlyDeletes(a, x, allowed) {
  let j = 0;
  for (let i = 0; i < x.length && j < a.length; i++) if (x[i] === a[j]) j++;
  if (j !== a.length) return false;
  const ca = counts(a), cx = counts(x);
  for (const [ch, n] of cx) { const d = n - (ca.get(ch) || 0); if (d < 0 || (d > 0 && !allowed.has(ch))) return false; }
  return ca.size <= cx.size;
}
const sigOf = (root) => [...root.querySelectorAll('*')].map((e) => e.localName).sort().join(',');
const FORBIDDEN_ATTR = /^(on|href$|src$|srcdoc$|style$|action$|formaction$|xlink)/i;
function checkAllow(root, allow) {   /* allow: tag → { attrs:Set, cls:Set|null } ; every element and attribute must be in it */
  for (const e of root.querySelectorAll('*')) {
    const a = allow[e.localName];
    must(a, 'element <' + e.localName + '> is not in the allow-list');
    for (const at of e.attributes) {
      must(a.attrs.has(at.name) && !FORBIDDEN_ATTR.test(at.name), '<' + e.localName + ' ' + at.name + '> is not in the allow-list');
      if (at.name === 'class' && a.cls) must(a.cls.has(at.value), '<' + e.localName + ' class="' + at.value + '"> is not in the allow-list');
    }
  }
}
const A = (attrs, cls) => ({ attrs: new Set(attrs), cls: cls ? new Set(cls) : null });
const FMT_ALLOW = {
  strong: A(['class'], ['c-fmt-b']), em: A(['class'], ['c-fmt-i']), s: A(['class'], ['c-fmt-s']),
  code: A(['class', 'dir'], ['c-fmt-code']), pre: A(['class', 'dir', 'tabindex'], ['c-fmt-pre']),
};
const BUBBLE_ALLOW = {
  ...FMT_ALLOW,
  button: A(['type', 'class', 'title'], ['c-bubble__link']),
  span: A(['class', 'data-self'], ['c-bubble__mention']),
};
/* the text a reader sees in a bubble body: text nodes, with a link button read as the URL it carries */
function bodyText(node) {
  let r = '';
  for (const c of node.childNodes) {
    if (c.nodeType === 3) r += c.nodeValue;
    else if (c.localName === 'button') r += c.title;
    else r += bodyText(c);
  }
  return r;
}
const isoLinkTarget = (url) => (/^https?:\/\//i.test(url) ? url : 'https://' + url);
/* CPU time of this process (user + system, ms), not the wall clock: a busy machine does not inflate it */
const timeIt = (f) => { const c0 = process.cpuUsage(); f(); const c = process.cpuUsage(c0); return (c.user + c.system) / 1000; };

/* ───────────────────────────── the pin ───────────────────────────── */
export default async function (h) {
  const { ok, root, readFileSync, join, JSDOM } = h;
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  const GLOBALS = ['window', 'document', 'NodeFilter', 'Node', 'Element', 'HTMLElement', 'DocumentFragment', 'Event', 'CustomEvent'];
  const saved = new Map();
  for (const g of GLOBALS) { saved.set(g, Object.getOwnPropertyDescriptor(globalThis, g)); Object.defineProperty(globalThis, g, { value: dom.window[g] || dom.window, configurable: true, writable: true }); }
  globalThis.window = dom.window;
  const temps = [];
  try {
    await run();
  } finally {
    for (const [g, d] of saved) { if (d) Object.defineProperty(globalThis, g, d); else delete globalThis[g]; }
    for (const t of temps) { try { rmSync(t, { recursive: true, force: true }); } catch (e) { /* best effort */ } }
    dom.window.close();
  }

  async function run() {
    /* ── loading ── */
    const FILES = { fmt: 'components/msg-format.js', link: 'components/link-rule.js', bubble: 'components/message-bubble.js', avatar: 'components/avatar.js',
      money: 'components/money.js', typed: 'components/typed-bubbles.js', shared: 'components/shared-items.js', hl: 'components/highlight.js', native: 'bridge/native.js' };
    const textOf = (base, f) => readFileSync(join(base, 'src', f), 'utf8');
    const cut = (t, a, b) => { const i = t.indexOf(a); const j = i < 0 ? -1 : t.indexOf(b, i); if (i < 0 || j < 0) throw new Error('anchor not found: ' + a); return t.slice(i, j); };
    const block = (t, sig) => {
      const i = t.indexOf(sig); if (i < 0) throw new Error('anchor not found: ' + sig);
      let d = 0;
      for (let k = t.indexOf('{', i); k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return t.slice(i, k + 1); }
      throw new Error('unbalanced block: ' + sig);
    };
    const chatFns = (base, M) => {
      const t = textOf(base, 'shells/chat.html');
      const src = [cut(t, 'const REPLY_TEXT_MAX', '\n'), cut(t, 'const QUOTE_NAME_ME', '\n'), cut(t, 'const QUOTE_NAME_PEER', '\n'),
        cut(t, 'const QUOTE_TYPED_EXACT', '/* the hex id test for an outgoing quotejump'), cut(t, 'const GROUP_ARG_RE', '\n'),
        block(t, 'function parseGroupArg(v)'), block(t, 'function parseTransferArg(v)'),
        cut(t, 'const MEDIA_EXT', '\n'), cut(t, 'const ALLOWED_MEDIA_URL', 'function buildMediaRow'),
        'function iconGate(rec, mediaAutoloadOn) {\n' + cut(t, 'const rawIcon = rec.iconUrl', 'return createAppBubble') + 'return iconUrl; }'].join('\n');
      return new Function('stripFormat', 'voiceQuoteText', 'peerQuoteName', 'window',
        src + '\nreturn { capQuoteText, replyFallbackQuote, parseGroupArg, parseTransferArg, mediaUrlOf, iconGate };')(M.fmt.stripFormat, M.bubble.voiceQuoteText, () => 'PEER', { SL: {} });
    };
    const addrFns = (base) => {
      const t = textOf(base, 'components/contacts-shell.js');
      const src = [cut(t, 'const ADDR_MIN', '\n'), cut(t, 'const ADDR_MAX', '\n'), block(t, 'function looksLikeAddress(a)')].join('\n');
      return new Function(src + '\nreturn { looksLikeAddress };')();
    };
    const loadMods = async (base, names) => {
      const M = {};
      for (const n of names) {
        if (n === 'chat' || n === 'addr') continue;
        M[n] = await import(pathToFileURL(join(base, 'src', FILES[n])).href);
      }
      if (names.includes('chat')) M.chat = chatFns(base, M);
      if (names.includes('addr')) M.addr = addrFns(base);
      return M;
    };
    const mutantBase = (edits) => {
      const dir = mkdtempSync(pjoin(tmpdir(), 'qtools-e-'));
      temps.push(dir);
      for (const sub of ['components', 'bridge']) {
        mkdirSync(pjoin(dir, 'src', sub), { recursive: true });
        for (const f of rdir(pjoin(root, 'src', sub))) if (f.endsWith('.js')) copyFileSync(pjoin(root, 'src', sub, f), pjoin(dir, 'src', sub, f));
      }
      mkdirSync(pjoin(dir, 'src/shells'), { recursive: true });
      copyFileSync(pjoin(root, 'src/shells/chat.html'), pjoin(dir, 'src/shells/chat.html'));
      for (const [file, from, to] of edits) {
        const p = pjoin(dir, 'src', file);
        const t = rfile(p, 'utf8');
        const n = t.split(from).length - 1;
        if (n !== 1) throw new Error('mutation anchor occurs ' + n + 'x in ' + file + ': ' + from.slice(0, 60));
        writeFileSync(p, t.replace(from, () => to));
      }
      return dir;
    };
    const runProp = (arb, pred, runs, shrink, ex) => {
      let r;
      try { r = fc.check(fc.property(arb, pred), { seed: SEED, numRuns: runs * RUNS_X, endOnFailure: !shrink, examples: ex || [] }); }
      catch (e) { return { ok: false, why: 'harness: ' + String(e && e.message).slice(0, 160) }; }
      if (!r.failed) return { ok: true };
      const err = r.errorInstance ? String(r.errorInstance.message || r.errorInstance).slice(0, 140) : 'predicate returned false';
      return { ok: false, why: err + ' · counterexample ' + fc.stringify(r.counterexample).slice(0, 220), ce: r.counterexample };
    };
    const execSpec = (s, M, shrink) => {
      try { return s.run ? s.run(M) : runProp(s.arb(), (v) => s.pred(M, v), s.runs || 150, shrink, s.examples); }
      catch (e) { return { ok: false, why: 'threw ' + String(e && e.message).slice(0, 160) }; }
    };

    /* ───────────────────────────── the properties ───────────────────────────── */
    const FMT_ADV = [['*a ×21000', '*a '.repeat(21000)], ['_ ×64000', '_'.repeat(64000)], ['`a\\n ×16000', '`a\n'.repeat(16000)], ['a_ ×32000 + _', 'a_'.repeat(32000) + '_'],
      ['* ×30000 sp * ×30000', '*'.repeat(30000) + ' ' + '*'.repeat(30000)], ['```\\n ×15000', '```\n'.repeat(15000)], ['~ ×30000', '~ '.repeat(30000)], ['*a\\n ×20000', '*a\n'.repeat(20000)]];
    const HOST_PADS = ['a.', 'a-', 'www.', 'http://', '(', 'x@', 'ab.cd', '😀.'];
    const ENC = (s) => Buffer.from(s, 'utf8').toString('base64');
    const mkReply = fc.record({
      sender: fc.oneof(anyStr, fc.constant('')), text: fc.oneof(anyStr, fc.constant('')), address: anyStr,
      kind: fc.constantFrom(undefined, 'gif', 'image', 'file', 'payment', 'call', 'voice', 'app', 'x'),
      thumb: fc.oneof(anyStr, fc.constantFrom('javascript:alert(1)', 'data:image/png;base64,AAAA', 'data:image/svg+xml;base64,AAAA', 'https://evil.example/x.png')),
      tile: fc.oneof(fc.constant(null), fc.record({ type: fc.constantFrom('image', 'file', 'voice', 'x'), src: anyStr, ext: anyStr })),
    });
    const bubbleOf = (M, text, extra) => M.bubble.createMessageBubble({ direction: 'received', position: 'single', text, strings: {}, ...extra });
    const nameArb = fc.array(fc.oneof(anyStr, fc.constantFrom('John Doe', 'a.b', '(x)', '[y]', '$^*+?', 'bob.com', '\ud83d')), { maxLength: 4 });

    const SPECS = [
      { id: 'F1', name: 'msg-format parse / strip / spans / render never throw; the token tree holds only b i s code pre; null is empty', mods: ['fmt'], runs: 300,
        examples: [['*a* _b_ ~c~ `d` x'], ['```\ncode\n```'], [null]],
        arb: () => fc.oneof(anyStr, fc.constantFrom(null, undefined)),
        pred: (M, t) => {
          const tree = M.fmt.parseFormat(t), st = M.fmt.stripFormat(t), sp = M.fmt.formatSpans(t), fr = M.fmt.renderFormat(t);
          must(Array.isArray(tree) && typeof st === 'string' && Array.isArray(sp) && fr.nodeType === 11, 'result types');
          if (t == null) must(tree.length === 0 && st === '', 'null / undefined is empty');
          const good = (nodes) => nodes.every((n) => typeof n === 'string' || (Array.isArray(n) && (((n[0] === 'b' || n[0] === 'i' || n[0] === 's') && good(n.slice(1)))
            || ((n[0] === 'code' || n[0] === 'pre') && n.length === 2 && typeof n[1] === 'string'))));
          must(good(tree), 'token tree holds a node that is not string / b / i / s / code / pre');
          for (const [k, a, b] of sp) must(['b', 'i', 's', 'code', 'pre'].includes(k) && Number.isInteger(a) && a >= 0 && b > a && b <= String(t).length, 'span out of bounds');
        },
        breaks: [{ id: 'F1-tag', note: 'a mark node gets an unknown tag', edits: [['components/msg-format.js', 'out.push([tag, ...kids]);', 'out.push([tag + \'x\', ...kids]);']] }] },
      { id: 'F2', name: 'msg-format strip: the text minus marks — a subsequence of the input, only * _ ~ ` dropped, no marks → unchanged', mods: ['fmt'], runs: 300,
        arb: () => anyStr,
        pred: (M, t) => {
          const s = M.fmt.stripFormat(t);
          must(onlyDeletes(s, t, MARKNL), 'strip kept a char that is not in the input, or dropped a char that is not a mark or a fence newline');
          if (!/[*_~`]/.test(t)) must(s === t, 'no marks yet the text changed');
        },
        breaks: [{ id: 'F2-code', note: 'strip drops the text of code spans and blocks', edits: [['components/msg-format.js', 'else if (n[0] === \'code\' || n[0] === \'pre\') r += n[1];', 'else if (n[0] === \'code\' || n[0] === \'pre\') r += \'\';']] }] },
      { id: 'F3', name: 'msg-format render: only strong / em / s / code / pre with their own class and attributes; serialise → reparse adds no element; the text is the strip minus block newlines', mods: ['fmt'], runs: 300,
        examples: [['`<script>x</script>` *<b>*'], ['```\n<img src=x onerror=1>\n```']],
        arb: () => anyStr,
        pred: (M, t) => {
          const host = document.createElement('div');
          host.append(M.fmt.renderFormat(t));
          checkAllow(host, FMT_ALLOW);
          const re = document.createElement('div');
          re.innerHTML = host.innerHTML;
          must(sigOf(re) === sigOf(host), 'serialise → reparse changes the element set: ' + sigOf(host) + ' vs ' + sigOf(re));
          must(onlyDeletes(host.textContent, M.fmt.stripFormat(t), new Set(['\n'])), 'the rendered text is not the strip text (minus newlines at blocks)');
        },
        breaks: [{ id: 'F3-innerHTML', note: 'inline code is set with innerHTML instead of textContent', edits: [['components/msg-format.js', 'c.textContent = n[1];', 'c.innerHTML = n[1];']] }] },
      { id: 'F4', name: 'msg-format cost: parse + strip of crafted runs grows near-linearly (time at 64 000 chars < 8 × time at 16 000, best of 3, unless under 150 ms) and stays under 600 ms (measured: correct code 17 ms at 64k, the scanning mutant 900 ms)', mods: ['fmt'],
        run: (M) => {
          const best = (s) => { M.fmt.parseFormat(s.slice(0, 8000)); let m = Infinity; for (let k = 0; k < 3; k++) m = Math.min(m, timeIt(() => { M.fmt.parseFormat(s); M.fmt.stripFormat(s); })); return m; };
          for (const [n, unit] of [['_', '_'], ['*a ', '*a '], ['`a\n', '`a\n'], ['a_ then _', 'a_'], ['* sp *', '* ']]) {
            const small = best(unit.repeat(Math.ceil(16000 / unit.length))), big = best(unit.repeat(Math.ceil(64000 / unit.length)));
            if (big > 600 || (big > 150 && big > 8 * Math.max(small, 1))) return { ok: false, why: JSON.stringify(n) + ': ' + Math.round(small) + ' ms at 16k, ' + Math.round(big) + ' ms at 64k' };
          }
          return { ok: true };
        },
        breaks: [{ id: 'F4-scan', note: 'the closer search scans the list from its start', edits: [['components/msg-format.js', 'while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] < x) lo = mid + 1; else hi = mid; }', 'lo = 0; while (lo < arr.length && arr[lo] < x) lo++; hi = lo;']] }] },
      { id: 'L1', name: 'link-rule urlSpans: ordered, non-overlapping, slice = url, no space or < > " \', only http / https (the shown scheme is the opened one), never glued to a word', mods: ['link'], runs: 400,
        arb: () => fc.oneof(anyStr, fc.array(fc.constantFrom('https://', 'http://', 'javascript://', 'ftp://', 'www.', 'a.com', 'x.io/', '%0a', '@', '.', ' ', '(', ')', ',', 'data:', '[', ':', '//'), { maxLength: 10 }).map((a) => a.join(''))),
        pred: (M, t) => {
          let end = 0;
          for (const sp of M.link.urlSpans(t)) {
            must(sp.start >= end && sp.end > sp.start && t.slice(sp.start, sp.end) === sp.url, 'span order / slice');
            end = sp.end;
            must(!/[\s<>"']/.test(sp.url), 'a URL holds a space or < > " \'');
            const prev = sp.start > 0 ? t[sp.start - 1] : '';
            must(!(prev && /[\w@.\-/]/.test(prev)), 'a URL glued to a word char');
            if (/^[a-z][a-z0-9+-]*:\/\//i.test(sp.url)) must(/^https?:\/\//i.test(sp.url), 'a link that shows the scheme ' + sp.url.split(':')[0] + ' but is opened as https');
            let u = null;
            try { u = new URL(isoLinkTarget(sp.url)); } catch (e) { u = null; }
            if (u) must(u.protocol === 'http:' || u.protocol === 'https:', 'a link with the scheme ' + u.protocol);
          }
        },
        breaks: [{ id: 'L1-scheme', note: 'the first alternative accepts any scheme before ://', edits: [['components/link-rule.js', '\'https?:\\\\/\\\\/[^\\\\s<>"\\\']+\'', '\'[a-z]+:\\\\/\\\\/[^\\\\s<>"\\\']+\'']] }] },
      { id: 'B1', name: 'bubble text: never throws; only the allow-listed elements / attributes; every click target is http(s); the text read back is the strip text', mods: ['fmt', 'link', 'bubble'], runs: 200,
        arb: () => fc.record({ t: fc.oneof(anyStr, soup(80)), names: nameArb }),
        pred: (M, v) => {
          const clicks = [];
          const row = bubbleOf(M, v.t, { mention: { names: v.names, self: v.names.slice(0, 1) }, onLinkClick: (u) => clicks.push(u) });
          const body = row.querySelector('.c-bubble__text');
          checkAllow(body, BUBBLE_ALLOW);
          const re = document.createElement('div'); re.innerHTML = body.innerHTML;
          must(sigOf(re) === sigOf(body), 'serialise → reparse changes the element set');
          for (const b of body.querySelectorAll('button')) {
            must(b.type === 'button' && /^\S+$/.test(b.title), 'a link button without its type or with a spaced target');
            b.click();
          }
          for (const u of clicks) must(/^https?:\/\//i.test(u), 'click target ' + u);
          for (const sp of body.querySelectorAll('span')) must(sp.textContent.startsWith('@'), 'a mention span that does not start with @');
          must(onlyDeletes(bodyText(body), M.fmt.stripFormat(v.t), new Set(['\n'])), 'the text read back differs from the strip text');
        },
        breaks: [{ id: 'B1-anchor', note: 'a link is built as <a>', edits: [['components/message-bubble.js', 'const b = document.createElement(\'button\');\n    b.type = \'button\';\n    b.className = \'c-bubble__link\';', 'const b = document.createElement(\'a\');\n    b.type = \'button\';\n    b.className = \'c-bubble__link\';']] }] },
      { id: 'B2', name: 'bubble link label: the host a reader sees (before the first / ? # \\) is the real host; no userinfo; a truncated label keeps the whole host', mods: ['fmt', 'link', 'bubble'], runs: 300,
        arb: () => fc.oneof(
          fc.record({ pre: fc.constantFrom('', 'https://', 'http://', 'HTTPS://', 'www.'), user: fc.constantFrom('', 'paypal.com@', 'a:b@', 'x%40y@'), host: fc.string({ unit: fc.constantFrom(...'abcdexyz0189-.'), minLength: 1, maxLength: 90 }),
            tld: fc.constantFrom('.com', '.org', '.io', '.xyz'), port: fc.constantFrom('', ':8080'), path: fc.oneof(fc.constant(''), fc.string({ unit: fc.constantFrom(...'ab/-_.?#@:%\\'), maxLength: 90 })) })
            .map((r) => r.pre + r.user + r.host + r.tld + r.port + (r.path ? '/' + r.path : '')),
          fc.tuple(fc.oneof(fc.integer({ min: 40, max: 75 }), fc.constantFrom(63, 65)), fc.constantFrom('', '/x', '/a/b?c#d'), fc.constantFrom('', 'https://', 'www.')).map(([n, path, pre]) => pre + 'a'.repeat(n - 4) + '.com' + path),
          fc.array(fc.constantFrom(...HOST_PADS, 'https://', 'evil.com', '@', '/'), { maxLength: 12 }).map((a) => a.join(''))),
        pred: (M, u) => {
          const row = bubbleOf(M, ' ' + u + ' ', { onLinkClick: () => {} });
          for (const b of row.querySelectorAll('.c-bubble__link')) {
            const url = b.title, label = b.textContent;
            let real = null;
            try { real = new URL(isoLinkTarget(url)); } catch (e) { continue; }
            const body = label.replace(/^https?:\/\//i, '').replace(/^[/\\]+/, '');
            const cutAt = body.search(/[/?#\\]/);
            const token = cutAt < 0 ? body : body.slice(0, cutAt);
            const at = token.lastIndexOf('@');
            must(at <= 0, 'userinfo shows in the label: ' + label);
            const hostText = token.slice(at + 1);
            if (real.host.length === 64 && label.includes('…')) continue;   /* held: QTOOLS-KNOWN B2-64 (only the host-visibility clauses below) */
            if (!label.includes('…')) {
              let lu = null;
              try { lu = new URL('https://' + hostText); } catch (e) { lu = null; }
              must(lu && lu.host === real.host, 'label host ' + hostText + ' ≠ real host ' + real.host);
            } else if (real.host.length > 64) {
              must(label.startsWith(real.host.slice(0, 39)) && label.endsWith(real.host.slice(-24)), 'a long host is not shown by its two ends: ' + label);
            } else {
              must(label.toLowerCase().startsWith(real.host.toLowerCase()), 'a truncated label hides part of the host ' + real.host + ': ' + label);
            }
          }
        },
        breaks: [{ id: 'B2-userinfo', note: 'userinfo is no longer rebuilt out of a short label', edits: [['components/message-bubble.js', 'if (!hasUserinfo && url.length <= MAX) return url;', 'if (url.length <= MAX) return url;']] }] },
      { id: 'B3', name: 'bubble cap (#235): text over LINKIFY_MAX gets no link button (mentions stay), text under it does; crafted runs build in < 2.5 s each', mods: ['fmt', 'link', 'bubble'],
        run: (M) => {
          const mk = (s) => bubbleOf(M, s, { onLinkClick: () => {}, mention: { names: ['John Doe'], self: [] } });
          const links = (s) => mk(s).querySelectorAll('.c-bubble__link').length;
          const unit = 'https://a.com @bob ';
          const under = unit.repeat(Math.floor((M.link.LINKIFY_MAX - 1) / unit.length)), over = unit.repeat(Math.ceil((M.link.LINKIFY_MAX + 1) / unit.length));
          if (under.length > M.link.LINKIFY_MAX || over.length <= M.link.LINKIFY_MAX) return { ok: false, why: 'harness: sizes' };
          if (links(under) < 1) return { ok: false, why: 'a text of ' + under.length + ' chars has no link' };
          if (links(over) !== 0) return { ok: false, why: 'a text of ' + over.length + ' chars (over the cap ' + M.link.LINKIFY_MAX + ') has ' + links(over) + ' link buttons' };
          if (mk(over).querySelectorAll('.c-bubble__mention').length < 1) return { ok: false, why: 'mentions are gone over the cap' };
          for (const [n, s] of [['a. ×4500', 'a.'.repeat(4500)], ['a.a. ×4500 + !', 'a.a.'.repeat(2250) + '!'], ['www. ×2250', 'www.'.repeat(2250)], ['a. ×10000', 'a.'.repeat(10000)],
            ['😀‍ ×20000', '😀\u200d'.repeat(20000)], ['@a. ×1500', '@a.'.repeat(1500)]]) {
            const dt = timeIt(() => mk(s));
            if (dt > 2500) return { ok: false, why: n + ' took ' + Math.round(dt) + ' ms' };
          }
          return { ok: true };
        },
        breaks: [{ id: 'B3-cap', note: 'the LINKIFY_MAX cap is gone', edits: [['components/message-bubble.js', 'const big = text.length > LINKIFY_MAX;', 'const big = false;'], ['components/message-bubble.js', 'if (text.length > LINKIFY_MAX) { appendWithMentions(parent, text, mention); return; }', '']] }] },
      { id: 'R1', name: 'reply quote: the quote holds one sender span (only when a sender is given) and one text span, both text only; the tile is a data: raster or a glyph; the text cannot make a sender line', mods: ['fmt', 'link', 'bubble'], runs: 250,
        arb: () => mkReply,
        pred: (M, r) => {
          const row = bubbleOf(M, 'hi', { reply: r, onReplyClick: () => {}, sender: 'Zed', position: 'single' });
          const q = row.querySelector('.c-bubble__reply');
          if (!(r.text || r.sender || r.kind)) { must(!q, 'a quote with nothing in it is drawn'); return; }
          must(q, 'the quote is missing');
          const info = q.querySelector('.c-bubble__reply-info');
          const kids = [...info.children];
          const senders = kids.filter((k) => k.className === 'c-bubble__reply-sender'), texts = kids.filter((k) => k.className === 'c-bubble__reply-text');
          must(senders.length === (r.sender ? 1 : 0) && texts.length === 1 && kids.length === senders.length + 1, 'the quote line holds ' + kids.map((k) => k.className).join(' + '));
          if (r.sender) must(senders[0].textContent === String(r.sender) && senders[0].children.length === 0, 'the sender line is not the sender text alone');
          must(texts[0].children.length === 0, 'the quote text made an element');
          if (r.text) must(texts[0].textContent === r.text, 'the quote text changed');
          must(row.querySelectorAll('.c-bubble__sender').length === 1, 'a second sender label in the bubble');
          for (const img of q.querySelectorAll('img')) must(/^data:image\/(?:jpeg|png|gif|webp);base64,[A-Za-z0-9+/]+=*$/i.test(img.getAttribute('src')), 'a quote picture that is not a local raster');
          for (const e of q.querySelectorAll('*')) for (const at of e.attributes) must(!/^on/i.test(at.name) && at.name !== 'href', 'attribute ' + at.name + ' on <' + e.localName + '>');
        },
        breaks: [{ id: 'R1-sender', note: 'the sender line is written with innerHTML', edits: [['components/message-bubble.js', 'qs.textContent = reply.sender;', 'qs.innerHTML = reply.sender;']] }] },
      { id: 'R2', name: 'chat.html quote: capQuoteText cuts at a grapheme (≤ 140, never a lone surrogate, a prefix + …); replyFallbackQuote reads kind words only from its own table and puts the name in the sender field only', mods: ['fmt', 'link', 'bubble', 'chat'], runs: 300,
        arb: () => fc.record({ text: fc.oneof(anyStr, fc.constantFrom('constructor', '__proto__', 'toString', 'hasOwnProperty', '💸 Payment', '🎤 1:23', '📷 x', '📎 ', '🎤'), fc.string({ unit: 'grapheme', minLength: 120, maxLength: 200 })),
          name: fc.oneof(fc.string({ unit: fc.constantFrom(...'abc DÉ😀<>*'), maxLength: 30 }), fc.constant('')) }),
        pred: (M, v) => {
          const C = M.chat;
          const lone = (s) => /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(s);
          const cap = C.capQuoteText(v.text, 140);
          const seg = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(cap)].length;
          must(seg <= 140, 'cap holds ' + seg + ' graphemes');
          if (cap !== v.text) must(cap.endsWith('…') && v.text.startsWith(cap.slice(0, -1)), 'a cut text is not a prefix + …');
          if (!lone(v.text)) must(!lone(cap), 'the cut made a lone surrogate');
          const q = C.replyFallbackQuote({ quoteText: v.text, quoteName: v.name });
          if (!v.text) { must(q === null, 'an empty quote is drawn'); return; }
          must(q.sender === v.name && q.fallback === true && q.address === '', 'the sender field is not the name alone');
          const typed = ['💸 Payment', '📞 Call', '🚀 App', '🎤'].includes(v.text);
          if (!typed && !/^🎤 \d{1,2}:\d{2}$/u.test(v.text) && !/^(📷|📎) ./su.test(v.text)) must(q.kind === null, 'kind ' + String(q.kind) + ' from the text ' + JSON.stringify(v.text));
          must(q.kind === null || typeof q.kind === 'string', 'kind is not a string');
        },
        breaks: [{ id: 'R2-cut', note: 'the cap cuts UTF-16 units', edits: [['shells/chat.html', 'return parts.length > max ? parts.slice(0, max - 1).join(\'\') + \'…\' : text;', 'return parts.length > max ? text.slice(0, max - 1) + \'…\' : text;']] },
          { id: 'R2-proto', note: 'the kind table is read with [] (prototype keys)', edits: [['shells/chat.html', 'if (Object.prototype.hasOwnProperty.call(QUOTE_TYPED_EXACT, raw)) {', 'if (QUOTE_TYPED_EXACT[raw] !== undefined) {']] }] },
      { id: 'A1', name: 'address shape (avatar.js isAddressShaped / isPseudoAddressNick / truncateAddressMiddle, contacts-shell looksLikeAddress) agree with an independent oracle; truncate is idempotent', mods: ['avatar', 'addr'], runs: 500,
        arb: () => fc.oneof(
          fc.string({ unit: fc.constantFrom(...B58), minLength: 0, maxLength: 140 }),
          fc.string({ unit: fc.constantFrom(...B58.replace(/\d/g, '')), minLength: 38, maxLength: 130 }),
          fc.tuple(fc.string({ unit: fc.constantFrom(...B58), minLength: 25, maxLength: 70 }), fc.constantFrom('0', 'O', 'I', 'l', ' ', '\n', '\u00a0', 'é', '-', '_', '😀', '\u0000'), fc.nat(60))
            .map(([s, c, p]) => s.slice(0, p % (s.length + 1)) + c + s.slice(p % (s.length + 1))),
          anyStr),
        pred: (M, s) => {
          const len = s.length, allB58 = [...s].every((c) => B58.includes(c) && c.length === 1), digit = [...s].some((c) => c >= '0' && c <= '9');
          must(M.avatar.isAddressShaped(s) === (len >= 40 && len <= 128 && allB58 && digit), 'isAddressShaped disagrees with the oracle');
          must(M.avatar.isPseudoAddressNick(s) === (len >= 40 && allB58), 'isPseudoAddressNick disagrees with the oracle');
          must(M.addr.looksLikeAddress(s) === (len >= 20 && len <= 128 && [...s].every((c) => c.trim() !== '')), 'looksLikeAddress disagrees with the oracle');
          if (allB58) {
            const tr = M.avatar.truncateAddressMiddle(s);
            must(M.avatar.truncateAddressMiddle(tr) === tr, 'truncate is not idempotent');
            must(tr.length <= 13 && (len <= 13 ? tr === s : tr.startsWith(s.slice(0, 6)) && tr.endsWith(s.slice(-6))), 'truncate keeps the wrong ends');
          }
          for (const f of [M.avatar.isAddressShaped, M.avatar.isPseudoAddressNick]) must(f(null) === false && f(undefined) === false, 'null is an address');
        },
        breaks: [{ id: 'A1-digit', note: 'isAddressShaped no longer needs a digit', edits: [['components/avatar.js', '&& /^[1-9A-HJ-NP-Za-km-z]+$/.test(v) && /\\d/.test(v);', '&& /^[1-9A-HJ-NP-Za-km-z]+$/.test(v);']] }] },
      { id: 'A2', name: 'safeImageSrc: only a data:image/ URI, or http(s) when remote is allowed; never javascript: blob: file: // or a relative path; groupEmojiOf returns an edge emoji of the name, else empty', mods: ['avatar'], runs: 400,
        arb: () => fc.record({ v: fc.oneof(anyStr, fc.array(fc.constantFrom('data:image/png;base64,AA', 'javascript:alert(1)', ' ', '\t', 'ja\tvascript:', 'https://x.io/a.png', 'HTTP://x', '//evil.example/x', 'blob:abc', 'file:///etc/passwd', 'data:text/html,<b>', 'DATA:IMAGE/png', '\n', 'x', ':'), { maxLength: 5 }).map((a) => a.join(''))), remote: fc.boolean(),
          stem: fc.string({ unit: fc.constantFrom(...'abcxyz '), minLength: 1, maxLength: 8 }), emo: fc.constantFrom('😀', '👍🏽', '🇸🇮', '👨‍👩‍👧', '❤️', '1️⃣'), where: fc.constantFrom('end', 'start') }),
        pred: (M, o) => {
          const r = M.avatar.safeImageSrc(o.v, { allowRemote: o.remote });
          if (r !== '') {
            must(r === o.v.trim(), 'the value was rewritten');
            const local = /^data:image\//i.test(r);
            let p = ''; try { p = new URL(r).protocol; } catch (e) { p = ''; }
            must(local || (o.remote && (p === 'http:' || p === 'https:')), 'a source that is not local and not allowed remote: ' + r);
          }
          const name = o.where === 'end' ? o.stem + o.emo : o.emo + o.stem;
          const g = M.avatar.groupEmojiOf(name);
          must(g === o.emo, 'groupEmojiOf(' + JSON.stringify(name) + ') = ' + JSON.stringify(g));
          const any = M.avatar.groupEmojiOf(o.v);
          must(any === '' || o.v.includes(any), 'an emoji that is not in the name');
        },
        breaks: [{ id: 'A2-scheme', note: 'the scheme test is gone: remote needs no http(s)', edits: [['components/avatar.js', 'if (proto !== \'http:\' && proto !== \'https:\') return \'\';', '']] },
          { id: 'A2-edge', note: 'the edge grapheme is the whole name', edits: [['components/avatar.js', 'return [first ? first.segment : \'\', last ? last.segment : \'\'];', 'return [s, s];']] }] },
      { id: 'M1', name: 'money sanitizeAmount: any string → digits + one dot + ≤ 8 decimals, idempotent, never signed; a decimal string keeps its value (thousand commas, comma decimal), decimals beyond 8 are cut not rounded', mods: ['money'], runs: 500,
        arb: () => fc.oneof(
          fc.record({ int: digitStr(1, 26), frac: digitStr(0, 12), fmt: fc.constantFrom('dot', 'comma', 'group', 'none') })
            .map((r) => ({ kind: 'dec', ...r, int: r.int.replace(/^0+(?=\d)/, ''), fmt: r.fmt === 'group' && !r.frac ? 'dot' : r.fmt })),
          anyStr.map((s) => ({ kind: 'junk', s })),
          fc.array(fc.constantFrom('1', '2', '0', '.', ',', '-', '+', 'e', ' ', '٣', '5'), { maxLength: 14 }).map((a) => ({ kind: 'junk', s: a.join('') })),
          fc.tuple(digitStr(0, 6), fc.constantFrom('.', ','), digitStr(9, 20)).map(([a, s, b]) => ({ kind: 'junk', s: a + s + b }))),
        pred: (M, v) => {
          const cut8 = (f) => (f + '00000000').slice(0, 8);
          if (v.kind === 'junk') {
            const o = M.money.sanitizeAmount(v.s);
            must(/^\d*(\.\d{0,8})?$/.test(o), 'sanitize output ' + JSON.stringify(o) + ' is outside digits[.digits≤8]');
            must(M.money.sanitizeAmount(o) === o, 'sanitize is not idempotent');
            must(M.money.toUnits(o) >= 0n, 'a sanitized amount is negative');
            return;
          }
          let txt;
          if (v.fmt === 'dot') txt = v.int + (v.frac ? '.' + v.frac : '');
          else if (v.fmt === 'comma') txt = v.int + (v.frac ? ',' + v.frac : '');
          else if (v.fmt === 'group') txt = v.int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (v.frac ? '.' + v.frac : '');
          else txt = v.int;
          const want = BigInt(v.int) * 100000000n + BigInt(cut8(v.fmt === 'none' ? '' : v.frac));
          const san = M.money.sanitizeAmount(txt);
          must(/^\d*(\.\d{0,8})?$/.test(san), 'sanitize output ' + JSON.stringify(san) + ' is outside digits[.digits≤8]');
          const got = M.money.toUnits(san);
          must(got === want, 'sanitize(' + txt + ') = ' + got + ' units, wanted ' + want);
        },
        breaks: [{ id: 'M1-9dec', note: 'the decimal clamp is 9 digits', edits: [['components/money.js', 'dec.slice(0, 8)', 'dec.slice(0, 9)']] },
          { id: 'M1-comma', note: 'a comma beside a dot is read as the decimal mark', edits: [['components/money.js', 's = s.includes(\'.\') ? s.replace(/,/g, \'\') : s.replace(/,/g, \'.\');', 's = s.replace(/,/g, \'.\');']] }] },
      { id: 'M2', name: 'money canonicalAmount / toUnits: canonical is (0|[1-9]\\d*)(.\\d+)?, idempotent, keeps the value; toUnits is exact BigInt even past 2^53', mods: ['money'], runs: 400,
        arb: () => fc.oneof(fc.array(fc.constantFrom('0', '0', '1', '9', '.', ',', 'a', '-'), { maxLength: 16 }).map((a) => a.join('')), anyStr, fc.tuple(digitStr(1, 30), digitStr(0, 8)).map(([i, f]) => i + '.' + f)),
        pred: (M, x) => {
          const s = M.money.sanitizeAmount(x), c = M.money.canonicalAmount(s);
          must(c === '' || /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(c), 'canonical form ' + JSON.stringify(c));
          must(M.money.canonicalAmount(c) === c, 'canonical is not idempotent');
          must(M.money.toUnits(c || '0') === M.money.toUnits(s || '0'), 'canonical changed the value of ' + JSON.stringify(s));
          const [i = '0', d = ''] = s.split('.');
          must(M.money.toUnits(s || '0') === BigInt(i || '0') * 100000000n + BigInt((d + '00000000').slice(0, 8)), 'toUnits is not the exact value of ' + JSON.stringify(s));
        },
        breaks: [{ id: 'M2-float', note: 'toUnits goes through Number', edits: [['components/money.js', 'const u = BigInt(i || \'0\') * 100000000n + BigInt((d + \'00000000\').slice(0, 8));', 'const u = BigInt(Math.round(Number((i || \'0\') + \'.\' + (d + \'00000000\').slice(0, 8)) * 1e8));']] },
          { id: 'M2-zeros', note: 'leading zeros are kept', edits: [['components/money.js', 's = s.replace(/^0+(?=\\d)/, \'\');', '']] }] },
      { id: 'M3', name: 'money formatIxiAmount: never throws; a decimal amount shows its integer part exactly and at most 2 decimals unless that would read 0; truncated, never rounded, never overstated, never signed differently', mods: ['money'], runs: 500,
        arb: () => fc.oneof(
          fc.record({ sign: fc.constantFrom('', '', '-', '+'), int: digitStr(1, 20), frac: digitStr(0, 10), grp: fc.boolean() }).map((r) => ({ kind: 'dec', ...r })),
          anyStr.map((s) => ({ kind: 'junk', s }))),
        pred: (M, v) => {
          if (v.kind === 'junk') { must(typeof M.money.formatIxiAmount(v.s) === 'string' && typeof M.money.formatFiatAmount(v.s) === 'string', 'not a string'); return; }
          const ip = v.int.replace(/^0+(?=\d)/, '');
          const input = v.sign + (v.grp ? v.int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : v.int) + (v.frac ? '.' + v.frac : '');
          const shown = M.money.formatIxiAmount(input);
          const m = /^([+-]?)([\d,]+)(?:\.(\d+))?$/.exec(shown);
          must(m, 'shown ' + JSON.stringify(shown) + ' is not a plain number');
          const sInt = m[2].replace(/,/g, '').replace(/^0+(?=\d)/, ''), sFrac = m[3] || '';
          must(m[1] === v.sign, 'the sign changed');
          must(sInt === ip, 'the integer part changed: ' + shown);
          must(v.frac.startsWith(sFrac) || /^0*$/.test(sFrac) , 'the fraction ' + sFrac + ' is not a prefix of ' + v.frac + ' (rounded?)');
          const nonzero = /[1-9]/.test(v.int + v.frac);
          if (nonzero) must(/[1-9]/.test(sInt + sFrac), 'a nonzero amount reads zero: ' + shown);
          if (ip !== '0') must(sFrac.length <= 2, 'more than 2 decimals on a nonzero integer part');
        },
        breaks: [{ id: 'M3-round', note: 'the fraction is rounded to 2 digits instead of cut', edits: [['components/money.js', 'let frac = rawFrac.slice(0, 2).replace(/0+$/, \'\');', 'let frac = String(Math.round(Number(\'0.\' + rawFrac) * 100)).padStart(2, \'0\').slice(0, 3).replace(/0+$/, \'\');']] }] },
      { id: 'M4', name: 'money group → ungroup round trip: for every shipped locale a canonical amount survives groupAmountDisplay → ungroupAmountInput exactly', mods: ['money'], runs: 400,
        arb: () => fc.record({ loc: fc.constantFrom(...LOCALES), int: fc.oneof(digitStr(1, 14).map((s) => s.replace(/^0+(?=\d)/, '') || '0'), fc.constantFrom('0', '1000', '10000', '1234567')), frac: fc.oneof(fc.constant(''), digitStr(1, 8)) }),
        pred: (M, v) => {
          const c = v.int + (v.frac ? '.' + v.frac : '');
          const disp = M.money.groupAmountDisplay(c, v.loc), back = M.money.ungroupAmountInput(disp, v.loc);
          must(back === c, v.loc + ': ' + c + ' → ' + JSON.stringify(disp) + ' → ' + JSON.stringify(back));
        },
        breaks: [{ id: 'M4-space', note: 'only an ASCII apostrophe is stripped as a grouper (the no-break space stays)', edits: [['components/money.js', 'let s = String(display == null ? \'\' : display).replace(/[\\s\']/g, \'\');', 'let s = String(display == null ? \'\' : display).replace(/[\']/g, \'\');']] }] },
      { id: 'P1', name: 'payment card: peer strings (amount, name, fiat) land as text — the element and attribute names equal those of a benign card of the same role and status', mods: ['typed'], runs: 150,
        arb: () => fc.record({ role: fc.constantFrom('request-in', 'request-out', 'sent', 'received'), status: fc.constantFrom('actionable', 'pending', 'processing', 'failed', 'completed', 'declined', 'canceled'), insufficient: fc.boolean(),
          amount: fc.oneof(anyStr, fc.constantFrom('<img src=x onerror=1>', '1e5', '-5', 'NaN', 'Infinity', '+12.5', '٣')), name: anyStr, fiat: fc.oneof(anyStr, fc.constantFrom('$5.00', '<$0.01')) }),
        pred: (M, v) => {
          const sig = (o) => {
            const row = M.typed.createPaymentBubble({ ...o, strings: {}, onPay() {}, onDecline() {}, onCancel() {}, onRetry() {}, onDetails() {} });
            const set = new Set();
            for (const e of row.querySelectorAll('*')) set.add(e.localName + '(' + [...e.attributes].map((a) => a.name).filter((n) => n !== 'aria-label').sort().join(',') + ')');
            return set;
          };
          const base = sig({ role: v.role, status: v.status, insufficient: v.insufficient, amount: '12.5', name: 'Ann', fiat: '$5.00' });
          for (const s of sig(v)) must(base.has(s), 'peer data made the element ' + s);
        },
        breaks: [{ id: 'P1-html', note: 'the amount is written with innerHTML', edits: [['components/typed-bubbles.js', 'num.textContent = formatIxiAmount(shownAmount);', 'num.innerHTML = formatIxiAmount(shownAmount);']] }] },
      { id: 'N1', name: 'file names: fillFileName keeps the whole name (text and title), fileKind never throws and labels ≤ 4 chars', mods: ['typed'], runs: 400,
        arb: () => fc.oneof(anyStr, fc.tuple(fc.string({ unit: 'grapheme', maxLength: 30 }), fc.constantFrom('.pdf', '.tar.gz', '.', '.é́', '.😀', '.abcdefghi', '', '.ß', '.comß')).map(([a, b]) => a + b)),
        pred: (M, n) => {
          const el = document.createElement('div');
          M.typed.fillFileName(el, n);
          must(el.textContent === n && el.title === n, 'the name changed: ' + JSON.stringify(el.textContent));
          must(el.children.length === 0 || (el.children.length === 2 && [...el.children].every((c) => c.localName === 'span')), 'unexpected children');
          const k = M.typed.fileKind(n);
          must(typeof k.family === 'string' && (n.toUpperCase().length !== n.length || k.label.length <= 4), 'fileKind ' + JSON.stringify(k));   /* held: QTOOLS-KNOWN N1-upper (a name whose upper case is longer) */
          must(typeof M.typed.isPhotoFileName(n) === 'boolean', 'isPhotoFileName');
        },
        breaks: [{ id: 'N1-dup', note: 'the stem is cut one code point late (a char shows twice)', edits: [['components/typed-bubbles.js', 'head.textContent = cps.slice(0, cut).join(\'\');', 'head.textContent = cps.slice(0, cut + 1).join(\'\');']] }] },
      { id: 'S1', name: 'shared items + chat args: parseSharedItems keeps only well-formed rows; sharedLinkHost holds no userinfo / path; parseGroupArg / parseTransferArg equal an oracle', mods: ['shared', 'fmt', 'link', 'bubble', 'chat'], runs: 400,
        arb: () => fc.record({
          json: fc.oneof(fc.array(fc.tuple(fc.constantFrom('a1', 'FF', '0'), fc.constantFrom(1, '-5', null), fc.constantFrom('media', 'file', 'link'), anyStr, fc.constantFrom(5, -1, null, '12', 'x'), fc.constantFrom(1700000000, 'x', null), fc.constantFrom(0, 1, true), fc.constantFrom('data:image/png;base64,AA', 'x', null, 5), fc.constantFrom(0, 1)), { maxLength: 3 }).map((a) => JSON.stringify(a)), anyStr, fc.array(fc.array(fc.oneof(fc.constantFrom('a1', 'F'.repeat(130), 'media', 'file', 'link', 'x', 'data:image/png;base64,AA', 'data:image/svg+xml,<svg>', 'javascript:1', '', null, 1, 0, true, -1), anyStr), { minLength: 7, maxLength: 10 }), { maxLength: 4 }).map((a) => JSON.stringify(a))),
          label: fc.oneof(anyStr, fc.array(fc.constantFrom('paypal.com@evil.com', 'https://', 'a.com\\@b.com', '?', '#', '[::1]', 'x:80', '%40', ' '), { maxLength: 5 }).map((a) => a.join(''))),
          grp: fc.oneof(anyStr, fc.tuple(fc.constantFrom('0123456789abcdef', '0123456789ABCDEF', '0123', 'zzzzzzzzzzzzzzzz'), fc.constantFrom('0', '1', '9', '10', '11', '01', '-1', '1.5', ''), fc.constantFrom('1', '2', '10', '11', '0', ''), fc.constantFrom('', 'ab', 'AB' + '0'.repeat(62), '0'.repeat(65), 'g')).map((a) => a.join('|'))),
          tr: fc.oneof(anyStr, fc.tuple(fc.constantFrom('live', 'paused', 'Live', 'x', ''), fc.constantFrom('0', '9', '99', '100', '007', '1e1', '', '-1', '12 ')).map((a) => a.join(':'))) }),
        pred: (M, v) => {
          const items = M.shared.parseSharedItems(v.json);
          must(Array.isArray(items) && items.length <= 200, 'items');
          for (const it of items) {
            must(/^[0-9a-fA-F]{1,128}$/.test(it.id) && M.shared.SHARED_KINDS.includes(it.kind), 'a row with id ' + it.id + ' / kind ' + it.kind);
            must(typeof it.label === 'string' && (it.thumb === null || /^data:image\/(png|jpeg|gif|webp);base64,/.test(it.thumb)), 'label / thumb');
            for (const n of [it.n, it.size, it.ts]) must(Number.isFinite(n), 'a non-finite number ' + n);
          }
          const host = M.shared.sharedLinkHost(v.label);
          must(typeof host === 'string' && !/[@/\\?#\s]/.test(host), 'host ' + JSON.stringify(host));
          const g = M.chat.parseGroupArg(v.grp), p = v.grp.split('|');
          const dec = (s) => s.length >= 1 && s.length <= 2 && [...s].every((c) => c >= '0' && c <= '9');
          const gOk = p.length === 4 && /^[0-9a-f]{16}$/i.test(p[0]) && dec(p[1]) && dec(p[2]) && Number(p[2]) >= 1 && Number(p[2]) <= 10 && Number(p[1]) < Number(p[2]) && p[3].length <= 64 && /^[0-9a-f]*$/i.test(p[3]);
          must(gOk ? (g && g.gid === p[0].toLowerCase() && g.index === Number(p[1]) && g.count === Number(p[2]) && g.cap === p[3].toLowerCase()) : g === null, 'parseGroupArg(' + JSON.stringify(v.grp) + ') = ' + JSON.stringify(g));
          const t = M.chat.parseTransferArg(v.tr), tp = v.tr.split(':');
          const tOk = tp.length === 2 && (tp[0] === 'live' || tp[0] === 'paused') && dec(tp[1]);
          must(tOk ? (t && t.state === tp[0] && t.pct === Number(tp[1])) : t === null, 'parseTransferArg(' + JSON.stringify(v.tr) + ') = ' + JSON.stringify(t));
        },
        breaks: [{ id: 'S1-index', note: 'parseGroupArg accepts index ≥ count', edits: [['shells/chat.html', 'if (!(count >= 1 && count <= 10 && index >= 0 && index < count)) return null;', 'if (!(count >= 1 && count <= 10 && index >= 0)) return null;']] },
          { id: 'S1-host', note: 'sharedLinkHost reads the text before the first slash', edits: [['components/shared-items.js', 'return u.hostname || \'\';', 'return String(label).replace(/^https?:\\/\\//i, \'\').split(\'/\')[0];']] }] },
      { id: 'B64', name: 'bridge b64ToUtf8: the base64 of any UTF-8 text decodes to that text (a leading U+FEFF aside); any bytes decode to a well-formed string', mods: ['native'], runs: 300,
        arb: () => fc.oneof(fc.tuple(fc.string({ unit: 'grapheme', maxLength: 60 }).filter((s) => !s.startsWith('\ufeff')), fc.uint8Array({ maxLength: 40 })).map(([s, b]) => ({ s, b })), fc.uint8Array({ maxLength: 60 }).map((b) => ({ s: null, b }))),
        pred: (M, v) => {
          if (v.s !== null) must(M.native.b64ToUtf8(ENC(v.s)) === v.s, 'round trip of ' + JSON.stringify(v.s));
          const out = M.native.b64ToUtf8(Buffer.from(v.b).toString('base64'));
          must(typeof out === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(out), 'decoded bytes hold a lone surrogate');
        },
        breaks: [{ id: 'B64-latin1', note: 'the UTF-8 decode is gone (a Latin-1 read)', edits: [['bridge/native.js', 'return new TextDecoder().decode(bytes);', 'return bin;']] }] },
      { id: 'H1', name: 'search highlight: the text of the root never changes; a highlight span holds exactly the query (case-folded); clearing restores the markup exactly (texts where lower-casing keeps the length)', mods: ['hl'], runs: 300,
        arb: () => fc.record({ texts: fc.array(anyStr.filter((s) => s.toLocaleLowerCase().length === s.length), { minLength: 1, maxLength: 3 }), q: fc.oneof(fc.string({ unit: fc.constantFrom(...'abAB1 _.é'), minLength: 0, maxLength: 3 }), anyStr.filter((s) => s.toLocaleLowerCase().length === s.length)), a: fc.nat(8), n: fc.integer({ min: 1, max: 3 }), swap: fc.boolean() })
          .map((v) => { const src = v.texts[0].slice(v.a, v.a + v.n); return { texts: v.texts, q: src && v.swap ? [...src].map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join('') : v.q }; }),
        pred: (M, v) => {
          const rootEl = document.createElement('div');
          for (const t of v.texts) { const sp = document.createElement('span'); sp.textContent = t; rootEl.append(sp); }
          const html0 = rootEl.innerHTML, text0 = rootEl.textContent;
          M.hl.setHighlights(rootEl, v.q);
          must(rootEl.textContent === text0, 'the text changed');
          for (const e of rootEl.querySelectorAll('*')) must(e.localName === 'span' && (e.parentNode === rootEl || e.className === 'c-highlight'), 'an element that is not a span or highlight');
          for (const sp of rootEl.querySelectorAll('.c-highlight')) must(sp.textContent.toLocaleLowerCase() === String(v.q).toLocaleLowerCase(), 'a highlight holds ' + JSON.stringify(sp.textContent) + ' for the query ' + JSON.stringify(v.q));
          M.hl.setHighlights(rootEl, v.q);
          M.hl.clearHighlights(rootEl);
          must(rootEl.innerHTML === html0, 'clear did not restore the markup');
          must(rootEl.querySelectorAll('.c-highlight').length === 0, 'a highlight is left after clear');
        },
        breaks: [{ id: 'H1-case', note: 'the highlight shows the lower-cased query instead of the message text', edits: [['components/highlight.js', 'mark.textContent = text.slice(i, i + q.length);', 'mark.textContent = q;']] }] },
      { id: 'G1', name: 'media gate (chat.html mediaUrlOf, isAllowedMediaUrl, giphyDirectFromShare, normalizeMediaUrl) + the app-invite icon gate: only https tenor / giphy single-label hosts and apps.spixi.io become a fetch URL, the host the text names is the host fetched; an icon is a data:image URI, or http(s) only when media autoload is on', mods: ['fmt', 'link', 'bubble', 'chat'], runs: 500,
        examples: ['https://media.tenor.com/abc/x.gif', 'https://media.tenor.com@evil.example/x.gif', 'https://giphy.com/gifs/excited-yay-l0HlvtIPzPdt2usKs', 'HTTPS://Media.Tenor.com/x.gif'].map((text) => [{ text, icon: 'javascript:alert(1)', autoload: true }]),
        arb: () => fc.record({
          text: fc.oneof(
            fc.tuple(fc.constantFrom('https://', 'HTTPS://', 'http://', 'https:\\\\', 'https:///', ' https://'), fc.constantFrom('media.tenor.com', 'media1.giphy.com', 'i.giphy.com', 'giphy.com', 'www.giphy.com', 'tenor.com', 'c.tenor.com', 'apps.spixi.io', 'APPS.SPIXI.IO', 'a.b.tenor.com', 'media.tenor.com.evil.example', 'media.tenor.com@evil.example', 'evil.example', 'media.tenor.com:8443', 'media.tenor.com\\\\@evil.example', '127.0.0.1', '[::1]', 'tenor.com.', 'xn--e1afmkfd.com'),
              fc.constantFrom('', '/', '/x.gif', '/a/b.png?x=1#f', '/gifs/excited-yay-l0HlvtIPzPdt2usKs', '/gifs/excited', '/stickers/a-b-c-AbCdEfG12', '/clips/x-AbCdEfG12', '/%2e%2e/x.gif', '/a b.gif', '/x.gif\n', '/\\evil.example/x.gif', '/x.GIF', '/i/abc'), fc.constantFrom('', ' ', '\n'))
              .map((a) => a.join('')),
            anyStr),
          icon: fc.oneof(anyStr, fc.constantFrom('data:image/png;base64,AA', 'DATA:IMAGE/png,x', 'javascript:alert(1)', 'https://x.example/i.png', 'http://x.example/i.png', '//x.example/i.png', 'blob:x', ' https://x.example/i.png', 'file:///x', 'data:text/html,<b>')),
          autoload: fc.boolean() }),
        pred: (M, v) => {
          const m = M.chat.mediaUrlOf(v.text);
          if (m) {
            const U = new URL(m.url);
            must(U.protocol === 'https:' && !U.username && !U.password && U.port === '', 'fetch URL ' + m.url + ' has scheme / userinfo / port');
            must(/^[a-z0-9]+\.(?:tenor|giphy)\.com$/.test(U.host) || U.host === 'apps.spixi.io', 'fetch host ' + U.host + ' is not allow-listed');
            must(m.url === 'https://' + U.host + U.pathname + U.search + U.hash, 'the fetch string is not the normalised URL');
            must(m.kind === 'gif' || m.kind === 'image', 'kind ' + m.kind);
            const src = new URL(v.text.trim());
            const share = /^(www\.)?giphy\.com$/.test(src.hostname.toLowerCase());
            must(src.host.toLowerCase() === U.host || (share && U.host === 'i.giphy.com'), 'the text names host ' + src.host + ' but ' + U.host + ' is fetched');
          }
          if (/\s/.test(v.text.trim())) must(m === null, 'a text with a space inside is a media URL');
          const ic = M.chat.iconGate({ iconUrl: v.icon }, () => v.autoload);
          must(ic === null || /^data:image\//i.test(ic) || (v.autoload && ['http:', 'https:'].includes(new URL(ic).protocol)), 'icon source ' + ic + ' with autoload ' + v.autoload);
          if (!v.autoload) must(ic === null || /^data:image\//i.test(ic), 'a remote icon without autoload');
        },
        breaks: [{ id: 'G1-allow', note: 'isAllowedMediaUrl accepts every normalised URL', edits: [['shells/chat.html', 'if (ALLOWED_MEDIA_URL.test(u)) return true;', 'return true;']] },
          { id: 'G1-icon', note: 'every URL that parses is a remote icon (javascript: too)', edits: [['shells/chat.html', 'remoteIcon = (proto === \'http:\' || proto === \'https:\');', 'remoteIcon = true;']] }] },
      { id: 'J1', name: 'jpegSize: never throws on any text; a JPEG built with a frame header gives its exact width and height; anything else gives null', mods: ['typed'], runs: 300,
        examples: [['data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/wAARCAABAAEDASIAAhEBAxEB/9k=']],
        arb: () => fc.oneof(
          fc.record({ app: fc.array(fc.uint8Array({ minLength: 0, maxLength: 30 }), { maxLength: 3 }), w: fc.integer({ min: 1, max: 65535 }), h: fc.integer({ min: 1, max: 65535 }), sof: fc.constantFrom(0xC0, 0xC1, 0xC2, 0xC9), tail: fc.uint8Array({ maxLength: 20 }) })
            .map((r) => ({ r })),
          fc.uint8Array({ maxLength: 80 }).map((b) => ({ bytes: b })), anyStr.map((s) => ({ s }))),
        pred: (M, v) => {
          if (v.r) {
            const b = [0xFF, 0xD8];
            for (const a of v.r.app) b.push(0xFF, 0xE0, (a.length + 2) >> 8, (a.length + 2) & 255, ...a);
            b.push(0xFF, v.r.sof, 0, 17, 8, v.r.h >> 8, v.r.h & 255, v.r.w >> 8, v.r.w & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1, ...v.r.tail);
            const got = M.typed.jpegSize('data:image/jpeg;base64,' + Buffer.from(b).toString('base64'));
            must(got && got.w === v.r.w && got.h === v.r.h, 'jpegSize = ' + JSON.stringify(got) + ' for ' + v.r.w + 'x' + v.r.h);
            return;
          }
          const uri = v.bytes ? 'data:image/jpeg;base64,' + Buffer.from(v.bytes).toString('base64') : v.s;
          const got = M.typed.jpegSize(uri);
          must(got === null || (Number.isInteger(got.w) && Number.isInteger(got.h) && got.w > 0 && got.h > 0 && got.w <= 65535 && got.h <= 65535), 'jpegSize = ' + JSON.stringify(got));
        },
        breaks: [{ id: 'J1-swap', note: 'width and height swapped', edits: [['components/typed-bubbles.js', 'return w > 0 && h > 0 ? { w, h } : null;', 'return w > 0 && h > 0 ? { w: h, h: w } : null;']] }] },
    ];

    /* ───────────────────────────── held defects (contract I5) ───────────────────────────── */
    const HELD = [
      { id: 'L1-parse', mods: ['link'], property: 'L1', defect: 'urlSpans links text that is not a URL (http://a:b, https://a.com:99999, http://%): the button opens a target that does not parse',
        reproduces: (M) => { const sp = M.link.urlSpans('http://a:b'); if (sp.length !== 1) return false; try { new URL(sp[0].url); return false; } catch (e) { return true; } },
        fix: [['components/link-rule.js', '    out.push({ start: m.index, end: m.index + url.length, url });', '    try { new URL(/^https?:\\/\\//i.test(url) ? url : \'https://\' + url); } catch (e) { continue; }\n    out.push({ start: m.index, end: m.index + url.length, url });']] },
      { id: 'B2-64', mods: ['fmt', 'link', 'bubble'], property: 'B2', defect: 'a link whose host is exactly 64 chars and has a path loses the last char of the host in its label (…aaa.co… for …aaa.com)',
        reproduces: (M) => { const host = 'a'.repeat(60) + '.com'; const l = bubbleOf(M, ' https://' + host + '/x ', { onLinkClick: () => {} }).querySelector('.c-bubble__link'); return !!l && !l.textContent.includes(host.slice(-6)); },
        fix: [['components/message-bubble.js', 'return label.length <= MAX ? label : label.slice(0, MAX - 1) + \'…\';', 'return label.length <= MAX ? label : (host.length > MAX - 2 ? host + \'…\' : label.slice(0, MAX - 1) + \'…\');']],
        fix2: [['components/message-bubble.js', 'return label.length <= MAX ? label : label.slice(0, MAX - 1) + \'…\';', 'return label.length <= MAX ? label : (host.length >= MAX ? host : label.slice(0, MAX - 1) + \'…\');']] },
      { id: 'H1-case-fold', mods: ['hl'], property: 'H1', defect: 'search highlight marks the wrong characters in text where lower-casing changes the length (İ → i̇): the span holds " " or nothing for the query b',
        reproduces: (M) => { const r = document.createElement('div'); const sp = document.createElement('span'); sp.textContent = 'İb b'; r.append(sp); M.hl.setHighlights(r, 'b'); return [...r.querySelectorAll('.c-highlight')].some((x) => x.textContent.toLocaleLowerCase() !== 'b'); },
        fix: [['components/highlight.js', 'if (i === -1) continue;', 'if (i === -1 || lower.length !== text.length) continue;']] },
      { id: 'N1-upper', mods: ['typed'], property: 'N1', defect: 'fileKind labels a file by its upper-cased extension: ß becomes SS, so the label passes 4 chars (x.comß → COMSS)',
        reproduces: (M) => M.typed.fileKind('x.comß').label.length > 4,
        fix: [['components/typed-bubbles.js', 'const label = ext && ext.length <= 4 ? ext.toUpperCase() : (ext ? ext.slice(0, 3).toUpperCase() : \'\');', 'const label = (ext && ext.length <= 4 ? ext.toUpperCase() : (ext ? ext.slice(0, 3).toUpperCase() : \'\')).slice(0, 4);']] },
      { id: 'S1-inf', mods: ['shared'], property: 'S1', defect: 'parseSharedItems passes Infinity through as a size (the JSON number 1e999 or the text "1e999"); C# never writes it, so no peer path is known',
        reproduces: (M) => { const it = M.shared.parseSharedItems('[["a1",1,"media","","1e999",1700000000,0,null,0]]'); return it.length === 1 && it[0].size === Infinity; },
        fix: [['components/shared-items.js', 'size: Number(size) || 0, ts: Number(ts) || 0,', 'size: Number.isFinite(Number(size)) ? Number(size) : 0, ts: Number(ts) || 0,']] },
      { id: 'M1-mangle', mods: ['money'], property: 'M1', defect: 'sanitizeAmount keeps the digits of any text: 1e5 → 15, -5 → 5, "5 IXI" → 5 (right for a keystroke filter; the QR seed addr:send:<amount> feeds it raw)',
        reproduces: (M) => M.money.sanitizeAmount('1e5') === '15' && M.money.sanitizeAmount('-5') === '5' && M.money.sanitizeAmount('5 IXI') === '5',
        fix: [['components/money.js', 'let s = String(raw || \'\');', 'let s = String(raw || \'\'); if (/[^0-9.,\\s]/.test(s)) return \'\';']] },
    ];

    /* ───────────────────────────── run ───────────────────────────── */
    for (const s of SPECS) {
      let M;
      try { M = await loadMods(root, s.mods); }
      catch (e) { ok(false, 'QTOOLS extract ' + s.id + ': cannot load the parser — ' + String(e && e.message).slice(0, 200)); continue; }
      const r = execSpec(s, M, true);
      ok(r.ok, 'QTOOLS ' + s.id + ': ' + s.name + (r.ok ? '' : ' — ' + r.why));
      for (const b of s.breaks || []) {
        let rb;
        try {
          const dir = mutantBase(b.edits);
          rb = execSpec(s, await loadMods(dir, s.mods), false);
        } catch (e) { rb = { ok: true, why: 'mutant could not be built: ' + String(e && e.message).slice(0, 200) }; }
        ok(!rb.ok && !/^harness|could not be built/.test(rb.why || ''), 'QTOOLS break ' + b.id + ' (' + b.note + ') is caught by ' + s.id + (rb.ok ? ' — NOT CAUGHT' + (rb.why ? ' (' + rb.why + ')' : '') : ' — ' + String(rb.why).slice(0, 200)));
      }
    }
    for (const hd of HELD) {
      let reproduces = false, fixedRed = false, why = '';
      try { reproduces = !!hd.reproduces(await loadMods(root, hd.mods)); } catch (e) { reproduces = false; why = String(e && e.message).slice(0, 120); }
      ok(reproduces, 'QTOOLS-KNOWN ' + hd.id + ': ' + hd.defect + (reproduces ? '' : ' — NOT REPRODUCED (' + why + '): fixed or moved; delete this row and widen the property ' + hd.property));
      for (const [k, fx] of [['fix', hd.fix], ['fix 2', hd.fix2]].filter((x) => x[1])) {
        fixedRed = false;
        try { fixedRed = !hd.reproduces(await loadMods(mutantBase(fx), hd.mods)); } catch (e) { why = String(e && e.message).slice(0, 120); }
        ok(fixedRed, 'QTOOLS break KNOWN ' + hd.id + ' goes red on a fixed copy (' + k + ': the row stops reproducing)' + (fixedRed ? '' : ' — ' + why));
      }
    }
  }
}
