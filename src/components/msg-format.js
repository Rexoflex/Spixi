/**
 * msg-format — WhatsApp-style message formatting (S20 F, DECISIONS #1378).
 *
 *   *bold*  _italic_  ~strike~  `code`  ```block```
 *
 * The grammar is SHARED with the C# strip (builder S): both read the vectors in
 * scripts/pins-s20/f-vectors.json, whose "grammar" field is the exact rule set this
 * file implements. Syntax inspired by ixian-platform/Spixi PR #50; no code taken from it
 * (it escaped twice and wrote innerHTML). Everything here builds DOM nodes and text
 * nodes — the message text is never parsed as HTML.
 *
 * parseFormat(text)            → token tree: a string = text; ['b'|'i'|'s', ...children];
 *                                ['code', text]; ['pre', text]
 * renderFormat(text, {onText}) → DocumentFragment. onText(run, parent) receives every
 *                                PLAIN run (outside code) so the bubble's mention +
 *                                linkify pass can split it; default = a text node.
 * stripFormat(text)            → plain text, marks and fences dropped (quote, chat-list
 *                                preview, search). Copy keeps the text AS TYPED.
 *
 * URLs (#46 r1 MINOR-1): a URL that linkify would link (link-rule.js, the same rule, the same #235 cap) is opaque to
 * the marks — no mark opens or closes inside it, so `…/main/__init__.py` and `site.com/*promo*` stay one link; marks
 * AROUND it still apply (`*https://ixian.io*` = a bold link). A URL's trailing * _ ~ are not part of it (like linkify's
 * trailing punctuation), so the closing mark of `*https://ixian.io*` stays a mark.
 *
 * Cost: O(n log n) — every closer search is a binary search over pre-computed closer
 * positions bounded by the line end, so a crafted 64 000-char run of openers cannot
 * freeze the chat (the same class as the linkify DoS guard, #235).
 */

import { LINKIFY_MAX, urlSpans } from './link-rule.js';

const FMT_MARK_TAG = { '*': 'b', '_': 'i', '~': 's' };
const FMT_LD_RE = /[\p{L}\p{N}]/u;      // letter / digit, Unicode-aware (C#: char.IsLetterOrDigit)
const FMT_WS_RE = /\s/;                 // whitespace (C#: char.IsWhiteSpace)
const FMT_FENCE = '```';

function fmtIsLD(ch) { return !!ch && FMT_LD_RE.test(ch); }
function fmtIsWS(ch) { return !!ch && FMT_WS_RE.test(ch); }

/* first index in the sorted array `arr` whose value is >= x */
function fmtLowerBound(arr, x) {
  let lo = 0, hi = arr.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] < x) lo = mid + 1; else hi = mid; }
  return lo;
}

function fmtCtx(s) {
  const n = s.length;
  // nl[i] = index of the first '\n' at or after i (n when none)
  const nl = new Int32Array(n + 1);
  nl[n] = n;
  for (let i = n - 1; i >= 0; i--) nl[i] = s[i] === '\n' ? i : nl[i + 1];
  // positions inside a URL linkify would link (≤ the #235 cap only — over it nothing is linked, nothing is protected)
  const inUrl = new Uint8Array(n);
  if (n <= LINKIFY_MAX && /[*_~]/.test(s)) {
    for (const sp of urlSpans(s)) {
      let e = sp.end;
      while (e > sp.start && /[*_~]/.test(s[e - 1])) e--;   // a URL's trailing marks are marks
      inUrl.fill(1, sp.start, e);
    }
  }
  // valid CLOSER positions per mark: preceded by a non-space, followed by the end or a non-letter/digit, not in a URL
  const closers = { '*': [], '_': [], '~': [] };
  for (let j = 1; j < n; j++) {
    const c = s[j];
    if (c !== '*' && c !== '_' && c !== '~') continue;
    if (inUrl[j]) continue;
    if (fmtIsWS(s[j - 1])) continue;
    if (j + 1 < n && fmtIsLD(s[j + 1])) continue;
    closers[c].push(j);
  }
  return { s, n, nl, closers, inUrl };
}

/* step 3: emphasis in the run [a, b) — pushes strings / nodes onto out */
function fmtEmph(ctx, a, b, out) {
  const { s, nl, closers, inUrl } = ctx;
  let i = a, textStart = a;
  while (i < b) {
    const c = s[i];
    const tag = FMT_MARK_TAG[c];
    if (tag && !inUrl[i] && (i === a || !fmtIsLD(s[i - 1])) && i + 1 < b && !fmtIsWS(s[i + 1])) {
      const list = closers[c];
      const k = fmtLowerBound(list, i + 2);
      const j = k < list.length ? list[k] : -1;
      const limit = Math.min(b, nl[i + 1]);   // no newline inside, never past the run
      if (j !== -1 && j < limit) {
        if (i > textStart) fmtPushText(out, s.slice(textStart, i));
        const kids = [];
        fmtEmph(ctx, i + 1, j, kids);
        if (ctx.spans) ctx.spans.push([tag, i, j + 1]);
        out.push([tag, ...kids]);
        i = j + 1;
        textStart = i;
        continue;
      }
    }
    i++;
  }
  if (b > textStart) fmtPushText(out, s.slice(textStart, b));
}

function fmtPushText(out, str) {
  if (!str) return;
  const last = out.length ? out[out.length - 1] : null;
  if (typeof last === 'string') out[out.length - 1] = last + str;
  else out.push(str);
}

/* step 2: inline code in the segment [a, b), emphasis in the runs between */
function fmtInline(ctx, a, b, out) {
  const { s, nl } = ctx;
  let runStart = a;
  let k = s.indexOf('`', a);
  while (k !== -1 && k < b) {
    const m = s.indexOf('`', k + 1);
    if (m !== -1 && m < b && m < nl[k] && m > k + 1) {
      fmtEmph(ctx, runStart, k, out);
      out.push(['code', s.slice(k + 1, m)]);
      if (ctx.spans) ctx.spans.push(['code', k, m + 1]);
      runStart = m + 1;
      k = s.indexOf('`', m + 1);
    } else {
      k = m;   // literal backtick; the next candidate is the next backtick
    }
  }
  fmtEmph(ctx, runStart, b, out);
}

/** The token tree (see the header). Adjacent text is merged. */
export function parseFormat(text) { return fmtParse(text, null); }

/** Where each matched node sits: [kind, start, end) with its marks / fences — the Aa bar's unwrap test (#46 r1 MINOR-2). */
export function formatSpans(text) {
  const spans = [];
  fmtParse(text, spans);
  return spans;
}

function fmtParse(text, spans) {
  const s = text == null ? '' : String(text);
  const out = [];
  if (!s) return out;
  const ctx = fmtCtx(s);
  ctx.spans = spans;
  // step 1: code blocks — an opening fence at a line start, closed by the next ``` anywhere
  let segStart = 0;
  let p = 0;
  while (p <= s.length - 3) {
    const f = s.indexOf(FMT_FENCE, p);
    if (f === -1) break;
    if (f !== 0 && s[f - 1] !== '\n') { p = f + 1; continue; }
    const close = s.indexOf(FMT_FENCE, f + 3);
    if (close === -1) break;   // no later ``` at all → no later block can close either
    let body = s.slice(f + 3, close);
    if (body.startsWith('\n')) body = body.slice(1);
    if (body.endsWith('\n')) body = body.slice(0, -1);
    if (!body) { p = f + 1; continue; }
    fmtInline(ctx, segStart, f, out);
    out.push(['pre', body]);
    if (spans) spans.push(['pre', f, close + 3]);
    segStart = p = close + 3;
  }
  fmtInline(ctx, segStart, s.length, out);
  return out;
}

function fmtStripNodes(nodes) {
  let r = '';
  for (const n of nodes) {
    if (typeof n === 'string') r += n;
    else if (n[0] === 'code' || n[0] === 'pre') r += n[1];
    else r += fmtStripNodes(n.slice(1));
  }
  return r;
}

/** Plain text: matched marks and fences dropped, the content kept as typed. */
export function stripFormat(text) {
  const s = text == null ? '' : String(text);
  if (!/[*_~`]/.test(s)) return s;   // the common case: nothing to parse
  return fmtStripNodes(parseFormat(s));
}

const FMT_TAG_EL = { b: 'strong', i: 'em', s: 's' };
const FMT_TAG_CLASS = { b: 'c-fmt-b', i: 'c-fmt-i', s: 'c-fmt-s' };

function fmtDefaultOnText(run, parent) { parent.append(document.createTextNode(run)); }

function fmtRenderNodes(nodes, parent, onText) {
  for (let x = 0; x < nodes.length; x++) {
    const n = nodes[x];
    if (typeof n === 'string') {
      /* a block is a block box: the one newline that separates it from the text around it would add a blank line */
      let t = n;
      if (x > 0 && Array.isArray(nodes[x - 1]) && nodes[x - 1][0] === 'pre' && t[0] === '\n') t = t.slice(1);
      if (x + 1 < nodes.length && Array.isArray(nodes[x + 1]) && nodes[x + 1][0] === 'pre' && t.endsWith('\n')) t = t.slice(0, -1);
      if (t) onText(t, parent);
      continue;
    }
    const kind = n[0];
    if (kind === 'code') {
      const c = document.createElement('code');
      c.className = 'c-fmt-code';
      c.dir = 'ltr';                           // code reads left to right inside an RTL message (an isolated run)
      c.textContent = n[1];                    // as typed — no mention / link / mark inside code
      parent.append(c);
    } else if (kind === 'pre') {
      const p = document.createElement('pre');
      p.className = 'c-fmt-pre';
      p.dir = 'ltr';
      p.textContent = n[1];
      p.tabIndex = 0;                          // a sideways-scrolling block must be reachable by keyboard
      parent.append(p);
    } else {
      const e = document.createElement(FMT_TAG_EL[kind]);
      e.className = FMT_TAG_CLASS[kind];
      fmtRenderNodes(n.slice(1), e, onText);
      parent.append(e);
    }
  }
}

/** DOM render — never innerHTML. onText(run, parent) appends a plain run into parent. */
export function renderFormat(text, { onText = fmtDefaultOnText } = {}) {
  const frag = document.createDocumentFragment();
  fmtRenderNodes(parseFormat(text), frag, onText || fmtDefaultOnText);
  return frag;
}
