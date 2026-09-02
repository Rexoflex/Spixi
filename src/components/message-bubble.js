/**
 * c-bubble — chat message bubble (Figma message-bubble 11288:4442; DECISIONS
 * #63 grouping, #14 width rule). Core text variant; typed bubbles (payment/
 * file/app/call), reactions and reply rendering arrive in later batches —
 * markup is extension-ready. Bridge: addMe/addThem 11-arg contract (§4).
 *
 * createMessageBubble({
 *   direction: 'sent' | 'received',
 *   position: 'single' | 'first' | 'middle' | 'last',   // grouping (#63)
 *   text, timestamp,
 *   status: 'sending'|'sent'|'delivered'|'read'|'failed',// sent only
 *   sender,                   // group chats: name label on first-of-group
 *   showAvatar, name, address, avatar,                   // received groups: on last-of-group
 *   onSenderClick,            // group chats (#99): label + avatar become BUTTONS
 *                             // → member sheet (identity verification; blind
 *                             // groups simply don't pass it)
 *   onRetry,                  // failed sent messages: retry circle + caption tap
 *   reply: { sender, address, text,    // §8-GATED (#25): quoted strip — render
 *            kind, thumb },   // ONLY behind the reply capability handshake.
 *                             // kind: 'gif'|'image'|'file'|'payment'|'call'|'voice'
 *                             // → glyph chip in the quote; thumb (data-URI,
 *                             // shell-composed) replaces the glyph for media
 *   onReplyClick,             // tap on the quote → shell scrolls to original
 *   edited: false,            // §8-GATED (#25): "edited" marker in the meta
 *   onLinkClick(url),         // URLs in text render as link BUTTONS (never
 *                             // real <a> — no default-nav/middle-click bypass
 *                             // of the shell's external-link warning)
 *   linkPreview: { url, title, domain, image }, // §8-GATED: P2P has no server
 *                             // to unfurl — the SENDER composes the preview
 *                             // into the message (Signal-style), bridge carries it
 *   strings
 * })
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createAvatar, hashHue, truncateAddressMiddle } from './avatar.js';
import { createStatusIcon } from './chatlist-item.js';
import { createBadge } from './badge.js';
import { dayBucketLabel, docLocale, timeOpts } from './timestamp.js';

function bubbleTime(d) {
  return d.toLocaleTimeString(docLocale(), timeOpts());   // ★ Session I: follows the device's 12/24-hour setting
}

/* linkify (Damir 2026-07-03; EXTENDED 2026-07-10 #231c): URLs become BUTTONS
   routed through onLinkClick (the shell's existing external-link warning) —
   XSS-safe, DOM-built, no innerHTML; trailing sentence punctuation stays text.
   #231c: also matches `www.`-prefixed hosts AND bare domains on a common-TLD
   whitelist (Damir F5: "github.com" must link without https://) — the
   whitelist keeps file.txt / node.js / version tokens plain text. An email
   guard in linkifyInto keeps a@b.com plain. Scheme-less matches get https://
   prefixed for the CLICK; the display stays as the user typed it. OG/thumbnail
   link previews remain §8/BE-gated (sender-composed card, be-cutover §82) —
   client-side unfurl is CORS-blocked + an IP-leak (#232 human-BE-review class). */
const BARE_TLDS = 'com|org|net|io|ai|app|dev|co|me|xyz|info|news|link|site|online|network|finance|exchange|market|money|cash|gg|tv|sh|so|to|us|uk|de|fr|es|it|nl|pl|cz|sk|ch|at|se|no|fi|dk|be|pt|gr|hr|rs|ba|si|hu|ro|bg|eu|ca|au|nz|jp|kr|in|br|mx|ar|za|tr|il|ae|sg|hk|tw|id|th|vn|ph|my';
const URL_RE = new RegExp(
  'https?:\\/\\/[^\\s<>"\']+' +
  '|www\\.[^\\s<>"\']+' +
  '|[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\\.(?:' + BARE_TLDS + ')(?:\\/[^\\s<>"\']*)?',
  'gi');
/* #231c: a long URL used to wrap across 3+ bubble lines with a dangling tail
   (Damir screenshot) — display is truncated past 64 chars; the button carries
   the FULL url on click/title and the shell's confirm modal shows it in full
   (never navigate on a hidden target).
   #235 HARDENING: the label must always SURFACE THE REAL HOST. Two spoofs the
   old middle-truncate allowed: (1) userinfo — "https://paypal.com@evil.com"
   reads paypal-leading but navigates to evil.com; (2) a crafted long URL
   pushing "…@evil.com" out of the elided middle. Now: any URL carrying
   userinfo is REBUILT host-first (userinfo dropped from the label), and long
   labels are END-truncated (host is always fully visible at the start; the
   tail — where a path "@domain" could masquerade as a host — is never shown).
   Unparseable input (URL_RE makes this near-impossible) also end-truncates. */
function displayUrl(url) {
  const MAX = 64;
  let u = null;
  try { u = new URL(/^https?:\/\//i.test(url) ? url : 'https://' + url); } catch (_) { u = null; }
  if (!u || !u.host) return url.length <= MAX ? url : url.slice(0, MAX - 1) + '…';
  const hasUserinfo = !!(u.username || u.password);
  if (!hasUserinfo && url.length <= MAX) return url;      // short + honest: as typed
  // rebuild host-first: userinfo stripped, scheme dropped, END-truncated — the
  // real host is always fully visible at the start of the label
  const host = u.host;
  // #235b (Opus review F1): a host LONGER than the budget must NOT end-truncate —
  // that hides the registrable domain ("paypal.com.<64-char-pad>.evil.com" would
  // render "paypal.com.…", eliding the true evil.com). Middle-truncate the HOST so
  // both the leading label AND the trailing registrable domain stay visible.
  if (host.length > MAX) return host.slice(0, MAX - 25) + '…' + host.slice(-24);
  const rest = (u.pathname === '/' && !u.search && !u.hash) ? '' : u.pathname + u.search + u.hash;
  const label = host + rest;
  return label.length <= MAX ? label : label.slice(0, MAX - 1) + '…';
}

/* reply-quote kind identifiers (Damir 2026-07-03): glyph per original type,
   label fallback when the shell sends no excerpt text */
const REPLY_KIND_GLYPHS = {
  gif: 'photo', image: 'photo', file: 'file-isr',
  payment: 'wallet', call: 'phone', voice: 'microphone', app: 'rocket',
};
function REPLY_KIND_LABELS(kind, strings = getStrings()) {
  return {
    gif: 'GIF',
    image: strings.image || 'Image',
    file: strings.file || 'File',
    payment: strings.payment || 'Payment',
    call: strings.call || 'Voice call',
    voice: strings.voiceMessage || 'Voice message',
    app: strings.app || 'App',
  }[kind] || '';
}

/* emoji-only detection (Damir 2026-07-03): 1–3 emoji and nothing else render
   BIG with the meta dropped below. Covers ZWJ sequences, skin tones, VS16. */
/* ★ Session I (#731/#735): FLAGS were missed — a flag is a PAIR of Regional Indicator
   symbols (🇸🇮 = U+1F1F8 U+1F1EE), which \p{Extended_Pictographic} does not match, so
   "🇸🇮" rendered as ordinary text in a bubble. One glyph = a pictographic run (with its
   modifiers / ZWJ chain / an optional tag sequence, the subdivision flags 🏴󠁧󠁢󠁥󠁮󠁧󠁿) OR a regional
   pair OR a keycap. Same 1–3 cap. */
const EMOJI_GLYPH = '(?:\\p{Extended_Pictographic}(?:️|\\p{Emoji_Modifier})*(?:‍\\p{Extended_Pictographic}(?:️|\\p{Emoji_Modifier})*)*(?:[\\u{E0020}-\\u{E007F}]+)?|\\p{Regional_Indicator}{2}|[0-9#*]️?⃣)';
const EMOJI_ONLY_RE = new RegExp('^(?:' + EMOJI_GLYPH + '\\s*){1,3}$', 'u');
/* @-mention highlighting (Damir 2026-07-09, premium mentions, DECISIONS #210).
   A mention token = "@" + a name; rendered as a styled span (color + bold, theme-
   aware, XSS-safe textContent — never innerHTML). When the shell supplies the known
   member `names`, matching is name-anchored + word-boundary-gated so "@bob" never
   lights up inside "@bobby" and an email like "a@b.com" is left alone; otherwise a
   generic `@word` fallback keeps mentions visible in 1:1 chats with no roster.
   `self` keys (lowercased) get the stronger self-mention treatment (`data-self`). */
function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
/* #314 (Damir F5 2026-08-07, repro'd before fixing per #215): a URL-looking nick
   with NO roster entry ("@bob.com" in a 1:1) split at the dot — the generic term
   forbade dots, so the pill wrapped only "@bob". Interior dotted segments are now
   allowed (each dot must be FOLLOWED by a word run, so a sentence-ending "@bob."
   still pills only "@bob"). Bounded repetition ({0,3}) keeps the term linear —
   no nested quantifiers, no backtracking blowup (the #235 DoS review class). */
const GENERIC_TERM = '[\\p{L}\\p{N}_]{1,48}(?:\\.[\\p{L}\\p{N}_]{1,48}){0,3}';
const GENERIC_MENTION_RE = () => new RegExp('@(' + GENERIC_TERM + ')(?![\\p{L}\\p{N}_])', 'giu');
/* Match ANY @word (so a mention of the local user highlights even before we know
   their nick — Damir F5 2026-07-09), with known member names as LEADING, longest-
   first alternatives so multi-word nicks ("@John Doe") match fully instead of just
   "@John". The generic term is always the last alternative. */
function buildMentionRe(names) {
  const alts = [];
  if (names && names.length) {
    for (const n of names.map((x) => String(x == null ? '' : x).trim()).filter(Boolean).sort((a, b) => b.length - a.length)) {
      alts.push(escapeRe(n));
    }
  }
  alts.push(GENERIC_TERM);
  // a pathological name (e.g. a lone surrogate) can throw under the `u` flag →
  // fall back to the plain generic matcher rather than aborting the log render (review m2)
  try { return new RegExp('@(' + alts.join('|') + ')(?![\\p{L}\\p{N}_])', 'giu'); }
  catch (_) { return GENERIC_MENTION_RE(); }
}
/* #314: the ONE mention-matching pass, split-callback form. onPlain(run) receives
   every non-mention text run (contiguous — splitting happens ONLY at accepted
   mention matches, so an email guard reading run-internal context stays sound);
   onMention(span) receives a built .c-bubble__mention span. */
function forEachMentionSplit(text, mention, onPlain, onMention) {
  const re = mention._re || (mention._re = buildMentionRe(mention.names));
  const selfSet = mention._self || (mention._self = new Set((mention.self || []).map((s) => String(s).toLowerCase())));
  re.lastIndex = 0;
  // #46 r1 MAJOR-2 (mentions now run BEFORE linkify): the boundary class must also
  // reject an "@" glued to URL-STRUCTURAL chars (/ : = ? & % #), or the mention
  // pass steals "@handle" out of the middle of a profile URL
  // ("mastodon.social/@user", "youtube.com/@channel", "?ref=@bob") — splitting the
  // run so linkifyPlain links only the stump and the real target becomes
  // unreachable. A rejected "@" stays inside its contiguous run, so linkifyPlain
  // still sees (and links) the FULL URL, path-handle included.
  // #46 r2 ACCEPTED RESIDUAL: chars legal in URL paths but NOT in this class
  // (- . ~ + , ; parens) can still let a mention split a link ("site.com/a-b-@user")
  // — closing them would kill natural pills ("ok.@bob", "hi,@bob"). The natural
  // profile-URL grammar is fully covered; the residual needs a path that GLUES
  // one of those chars to an @handle — contrived, accepted (#315 row).
  const WORD_BEFORE = /[\p{L}\p{N}_@\/:=?&%#]/u;
  let last = 0, m;
  while ((m = re.exec(text))) {
    // boundary-BEFORE the "@": if the char preceding it is a word char, another
    // "@" or a URL-structural char, this is not a mention (e.g. an email
    // "a@bob.com" or a profile-URL "/@user") — leave it as plain text (it stays
    // in the run flushed by the next match / the tail append).
    const prev = m.index > 0 ? text[m.index - 1] : '';
    if (prev && WORD_BEFORE.test(prev)) {
      if (re.lastIndex === m.index) re.lastIndex++;
      continue;
    }
    if (m.index > last) onPlain(text.slice(last, m.index));
    const span = document.createElement('span');
    span.className = 'c-bubble__mention';
    span.textContent = m[0];                 // "@Name" verbatim (safe)
    if (selfSet.has(String(m[1]).toLowerCase())) span.dataset.self = '';
    onMention(span);
    last = m.index + m[0].length;
    if (re.lastIndex === m.index) re.lastIndex++;   // zero-width guard (defensive)
  }
  if (last < text.length) onPlain(text.slice(last));
}
function appendWithMentions(parent, text, mention) {
  if (!mention || !text || text.indexOf('@') === -1) { parent.append(text); return; }
  forEachMentionSplit(text, mention, (run) => parent.append(run), (span) => parent.append(span));
}
/* #235 DoS guard: the bare-domain alternation backtracks per start position on
   a crafted no-TLD token ("a.a.a.a…" ~50KB) → an O(n²) matchAll scan freezes
   the chat pane (victim-side render DoS; isolated to the chat WebView per §1,
   but still a freeze). Real chat messages are far below this cap — oversized
   text skips linkify entirely and renders as plain text (mentions still work;
   the mention pass is a single linear exec). */
const LINKIFY_MAX = 4096;
/* #314 ORDERING (Damir F5 2026-08-07, repro'd first per #215): linkify used to run
   OUTER and mentions only in its gaps — a multi-word roster nick with a URL-looking
   word ("@Bob site.com") had "site.com" consumed as a LINK BUTTON before the
   mention regex ever saw it, splitting the pill at the text-node boundary. Mentions
   now split FIRST (roster names beat URL detection — a mention is the more specific
   read of the same characters) and each remaining plain run is linkified alone.
   The #231c email guard is unaffected: a rejected "@…" after a word char stays
   INSIDE its plain run, so linkifyPlain still sees "a@bob.com" contiguous. */
function linkifyInto(parent, text, onLinkClick, mention = null) {
  if (text.length > LINKIFY_MAX) { appendWithMentions(parent, text, mention); return; }
  if (mention && text.indexOf('@') !== -1) {
    forEachMentionSplit(text, mention,
      (run) => linkifyPlain(parent, run, onLinkClick),
      (span) => parent.append(span));
    return;
  }
  linkifyPlain(parent, text, onLinkClick);
}
function linkifyPlain(parent, text, onLinkClick) {
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    // #231c email/token guard: a scheme-less match glued to a word char, @, dot,
    // dash or slash is part of a larger token ("a@b.com", "path/x.com") → stays
    // plain text (the skipped run is flushed by the next match / tail append).
    const prev = m.index > 0 ? text[m.index - 1] : '';
    if (prev && /[\w@.\-\/]/.test(prev)) continue;
    let url = m[0];
    const trail = url.match(/[.,!?;:]+$/);
    if (trail) url = url.slice(0, url.length - trail[0].length);
    // unbalanced closing parens are sentence punctuation: "(see https://x.com)"
    while (url.endsWith(')') &&
           (url.split('(').length < url.split(')').length)) url = url.slice(0, -1);
    if (!url) continue;
    if (m.index > last) parent.append(text.slice(last, m.index));
    const href = /^https?:\/\//i.test(url) ? url : 'https://' + url;  // #231c: click target for scheme-less links
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-bubble__link';
    b.textContent = displayUrl(url);   // #235: host-first label; long labels truncated for display only (full url on title/click)
    b.title = url;
    if (onLinkClick) b.addEventListener('click', () => onLinkClick(href));
    parent.append(b);
    last = m.index + url.length;
  }
  if (last < text.length) parent.append(text.slice(last));
}

/* Copy the FULL address to the clipboard + brief inline "Copied" feedback.
   truncateAddressMiddle now lives in avatar.js (#211 canon — shared, no cycle). */
function copySenderAddress(btn, address, strings) {
  const revert = truncateAddressMiddle(address);
  const flash = () => {
    btn.textContent = strings.copied || 'Copied';
    setTimeout(() => { if (btn.isConnected) btn.textContent = revert; }, 1200);
  };
  // flash "Copied" ONLY on a real success — never claim a copy that didn't happen
  // (honest-failure parity with wallet-receive). No clipboard API → do nothing.
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(address).then(flash, () => {});
  } catch (_) {}
}

export function createMessageBubble({
  direction = 'received',
  position = 'single',
  text = '',
  timestamp = null,
  status = null,
  sender = null,
  senderIsAddress = false,     // nameless group/bot sender → sender IS a raw address
  showAvatar = false,
  name = '',
  address = '',
  avatar = null,
  onSenderClick = null,
  onRetry = null,
  reply = null,
  onReplyClick = null,
  edited = false,
  paid = false,                // A2 (#302): this message cost IXI (C# `paid` = transactionId != "")
  onLinkClick = null,
  linkPreview = null,
  mention = null,              // { names:[…], self:[…] } → @-mention highlight (#210); null = off
  roleBadge = null,            // N34 (#365): 'Owner' chip label, top-right of the sender row; null = off
  strings = getStrings(),
} = {}) {
  // row wrapper: aligns bubble + optional avatar gutter (received groups)
  const row = document.createElement('div');
  row.className = 'c-bubble-row';
  row.dataset.direction = direction;
  row.dataset.position = position;

  if (direction === 'received' && (showAvatar || sender !== null)) {
    const gutter = document.createElement('span');
    gutter.className = 'c-bubble-row__gutter';
    // avatar renders once per group, bottom-aligned on the LAST bubble;
    // other rows keep the gutter width so bubbles align
    if (showAvatar && (position === 'last' || position === 'single')) {
      const av = createAvatar({ src: avatar, name, address, size: 24 });
      if (onSenderClick) { // #99: avatar opens the member sheet too
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'c-bubble-row__avatar-btn';
        b.setAttribute('aria-label', (strings.viewMember || 'View member') + (name ? ', ' + name : ''));
        b.addEventListener('click', onSenderClick);
        b.append(av);
        gutter.append(b);
      } else {
        gutter.append(av);
      }
    }
    row.append(gutter);
  }

  const el = document.createElement('div');
  el.className = 'c-bubble';
  if (text && EMOJI_ONLY_RE.test(text.trim())) el.dataset.emojiOnly = ''; // big emoji, meta below (Damir 2026-07-03)

  // sender label: group chats, first bubble of a group, identity-hued (premium).
  // Hash key mirrors createAvatar's (address || name) so label + avatar agree.
  if (sender && (position === 'first' || position === 'single')) {
    // A nameless sender (no nick — bots / some group members) shows its ADDRESS
    // middle-truncated. Its TAP now opens the member sheet — the SAME pattern as a
    // named sender (Damir F5 2026-07-08): the sheet holds the full address + copy
    // action, so identity/copy is consistent for named and nameless alike. Direct
    // clipboard copy stays ONLY as a fallback when no member sheet is wired (e.g.
    // blind groups). Otherwise a plain span.
    const copyable = senderIsAddress && !!address;             // → truncated + monospace display
    const interactive = copyable || !!onSenderClick;
    const s = document.createElement(interactive ? 'button' : 'span');
    s.className = 'c-bubble__sender';
    if (copyable) s.dataset.address = '';                       // style hook (monospace/copy affordance)
    if (interactive) {
      s.type = 'button';
      if (onSenderClick) {
        // named OR nameless → member sheet (full address + copy live there)
        if (copyable) {
          s.title = address;                                    // full address on hover
          s.setAttribute('aria-label', (strings.viewMember || 'View member') + ', ' + address);
        }
        s.addEventListener('click', onSenderClick);
      } else {
        // no member sheet wired (e.g. blind group) → direct clipboard copy fallback
        s.title = address;                                       // full address on hover
        s.setAttribute('aria-label', (strings.copyAddress || 'Copy address') + ': ' + address);
        s.addEventListener('click', () => copySenderAddress(s, address, strings));
      }
    }
    s.textContent = copyable ? truncateAddressMiddle(sender) : sender;
    s.style.setProperty('--sender-h', hashHue(address || name || sender));
    /* N34 (#365): Owner chip rides INSIDE the sender label so the grouping
       repair (removeMessage moves the label to the run heir) carries it for
       free. data-has-role flips the label to flex → chip lands top-right. */
    if (roleBadge) {
      s.dataset.hasRole = '';
      const chip = createBadge({ type: 'info', weight: 'tonal', label: roleBadge });
      chip.classList.add('c-bubble__role');
      s.append(chip);
      // the copyable variant sets an explicit aria-label (overrides content) —
      // keep the role audible there too
      if (copyable && s.hasAttribute('aria-label')) {
        s.setAttribute('aria-label', s.getAttribute('aria-label') + ', ' + roleBadge);   // R2 (#371): spoken-punctuation canon
      }
    }
    el.append(s);
  }

  // reply quote (batch 3b, §8-gated #25 — bridge has no reply yet): identity-
  // hued strip above the text; the quote itself is shell-supplied (sender +
  // excerpt + kind/thumb), tap = scroll-to-original (shell duty via onReplyClick)
  if (reply && (reply.text || reply.sender || reply.kind)) {
    const q = document.createElement(onReplyClick ? 'button' : 'div');
    q.className = 'c-bubble__reply';
    if (onReplyClick) {
      q.type = 'button';
      q.addEventListener('click', onReplyClick);
      q.setAttribute('aria-label',
        (strings.replyTo || 'Show replied message') + (reply.sender ? ', ' + reply.sender : ''));
    }
    q.style.setProperty('--reply-h', hashHue(reply.address || reply.sender || ''));
    // media/typed originals show a small identifier (Damir 2026-07-03):
    // shell-composed thumb (data-URI) for media, kind glyph otherwise
    if (reply.thumb) {
      const th = document.createElement('img');
      th.className = 'c-bubble__reply-thumb';
      th.src = reply.thumb;
      th.alt = '';
      q.append(th);
    } else if (reply.kind && REPLY_KIND_GLYPHS[reply.kind]) {
      const g = document.createElement('span');
      g.className = 'c-bubble__reply-glyph';
      g.setAttribute('aria-hidden', 'true');
      g.append(icon(REPLY_KIND_GLYPHS[reply.kind], { size: 16 }));
      q.append(g);
    }
    const info = document.createElement('span');
    info.className = 'c-bubble__reply-info';
    if (reply.sender) {
      const qs = document.createElement('span');
      qs.className = 'c-bubble__reply-sender';
      qs.textContent = reply.sender;
      info.append(qs);
    }
    const qt = document.createElement('span');
    qt.className = 'c-bubble__reply-text';
    qt.textContent = reply.text || REPLY_KIND_LABELS(reply.kind, strings);
    info.append(qt);
    q.append(info);
    el.append(q);
  }

  const body = document.createElement('span');
  body.className = 'c-bubble__text';
  linkifyInto(body, text, onLinkClick, mention); // URLs → link buttons, @names → mention spans, rest plain
  el.append(body);

  // link preview card (§8-GATED — sender-composed payload, P2P can't unfurl)
  if (linkPreview && (linkPreview.title || linkPreview.domain)) {
    const lp = document.createElement(onLinkClick ? 'button' : 'div');
    lp.className = 'c-bubble__linkpreview';
    if (onLinkClick) {
      lp.type = 'button';
      lp.addEventListener('click', () => onLinkClick(linkPreview.url));
    }
    if (linkPreview.image) {
      const img = document.createElement('img');
      img.className = 'c-bubble__linkpreview-img';
      img.src = linkPreview.image;
      img.alt = '';
      lp.append(img);
    }
    const col = document.createElement('span');
    col.className = 'c-bubble__linkpreview-info';
    if (linkPreview.title) {
      const t = document.createElement('span');
      t.className = 'c-bubble__linkpreview-title';
      t.textContent = linkPreview.title;
      col.append(t);
    }
    if (linkPreview.domain) {
      const d2 = document.createElement('span');
      d2.className = 'c-bubble__linkpreview-domain';
      d2.textContent = linkPreview.domain;
      col.append(d2);
    }
    lp.append(col);
    el.append(lp);
  }

  const meta = document.createElement('span');
  meta.className = 'c-bubble__meta u-tabular';
  if (edited) { // §8-gated (#25) — "edited" precedes the time, WhatsApp-style
    const ed = document.createElement('span');
    ed.className = 'c-bubble__edited';
    ed.textContent = strings.edited || 'edited';
    meta.append(ed);
  }
  if (timestamp != null) {
    const d = new Date(timestamp);
    if (!isNaN(d)) { // audit r2: one malformed bridge ts crashed the whole render
      const t = document.createElement('time');
      t.setAttribute('datetime', d.toISOString());
      t.textContent = bubbleTime(d);
      meta.append(t);
    }
  }
  if (direction === 'sent' && status) {
    const st = createStatusIcon(status);
    if (st) {
      st.setAttribute('width', 14);
      st.setAttribute('height', 14);
      // announce delivery state (audit: glyphs were aria-hidden = invisible to SRs)
      st.removeAttribute('aria-hidden');
      st.setAttribute('role', 'img');
      st.setAttribute('aria-label', strings['status-' + status] || status);
      meta.append(st);
    }
  }
  /* A2 (#302): paid marker. AFTER the status icon deliberately — setMessageStatus
     finds the tick via `.c-bubble__meta .c-status-icon` and replaceWith()s it, so a
     glyph appended before it would break that lookup; appended after, both survive.
     Legacy's CSS REPLACED the delivery tick with the wallet glyph
     (spixiui-light.css:2544-2550 `.paid .statusIndicator{display:none!important}`) —
     deliberately not copied: that lost delivery state to show cost state.
     Rendered for both directions; legacy only ever set `paid` on own messages, so
     the received case simply never fires today rather than being gated out. */
  if (paid) {
    const pg = icon('wallet', { size: 14 });
    if (pg) {
      pg.classList.add('c-bubble__paid');
      pg.removeAttribute('aria-hidden');
      pg.setAttribute('role', 'img');
      pg.setAttribute('aria-label', strings.paidMessage || 'Paid message');
      meta.append(pg);
    }
  }
  if (meta.childNodes.length) el.append(meta);

  // failed sent message (Damir 2026-07-03, r2): clean bubble — retry circle
  // hugging it + red "Not delivered" caption carry the error (both retry-able).
  // data-failed drives the width rule in css.
  if (direction === 'sent' && status === 'failed') {
    row.dataset.failed = '';
    const stack = document.createElement('div');
    stack.className = 'c-bubble-stack';
    const note = document.createElement('span');
    note.className = 'c-bubble-failnote';
    if (onRetry) {
      // audit r2: double-activation re-emitted the resend before the shell could
      // swap the row — resend stays repeatable, so guard re-entry (no hard latch);
      // circle + caption share one guard so tapping both can't double-fire either
      let lastRetry = 0;
      const retryGuarded = (e) => {
        const t = Date.now();
        if (t - lastRetry < 500) return;
        lastRetry = t;
        onRetry(e);
      };
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'c-bubble-retry';
      retry.setAttribute('aria-label', strings.retry || 'Retry');
      retry.append(icon('rotate-clockwise-2', { size: 16 }));
      retry.addEventListener('click', retryGuarded);
      const line = document.createElement('div');
      line.className = 'c-bubble-line'; // retry hugs the bubble (Damir 2026-07-03)
      line.append(retry, el);
      stack.append(line);
      note.textContent = strings.notDelivered || 'Not delivered · Tap to retry';
      note.addEventListener('click', retryGuarded);
    } else {
      // no resend path (BE-gated) — clean bubble + honest caption, no dead affordance
      stack.append(el);
      note.textContent = strings.notDeliveredNoRetry || 'Not delivered';
    }
    stack.append(note);
    row.append(stack);
    return row;
  }

  row.append(el);
  return row;
  // NOTE: mount messages inside a container with role="log" (chat shell duty)
}

/* —— IN-PLACE UPDATERS (DECISIONS #86: bridge updateMessage/deleteMessage get
   surgical DOM updates — no full re-render, no flicker, scroll stays put).
   #44 free-fn convention. —— */

/** Bridge updateMessage → status tick (sending/sent/delivered/read) on a SENT
 *  row. 'failed' restructures the row (retry circle + caption) — the shell
 *  re-creates via createMessageBubble({status:'failed'}) and replaces. */
export function setMessageStatus(row, status, strings = getStrings()) {
  if (status === 'failed') {
    console.warn('setMessageStatus: "failed" restructures the row — re-create it via createMessageBubble and replace');
    return;
  }
  const st = row.querySelector('.c-bubble__meta .c-status-icon');
  if (!st) return; // received rows / no meta — nothing to tick
  const next = createStatusIcon(status);
  if (!next) return;
  next.setAttribute('width', 14);
  next.setAttribute('height', 14);
  next.removeAttribute('aria-hidden');
  next.setAttribute('role', 'img');
  next.setAttribute('aria-label', strings['status-' + status] || status);
  st.replaceWith(next);
}

/** Bridge deleteMessage → remove the row AND repair #63 grouping around it:
 *  the group's head passes its sender label down, the tail passes its avatar
 *  up, and neighbor corner radii re-derive from data-position. */
export function removeMessage(row) {
  const pos = row.dataset.position;
  const dir = row.dataset.direction;
  const isGroupRow = (el, positions) =>
    !!el && el.classList && el.classList.contains('c-bubble-row') &&
    el.dataset.direction === dir && positions.includes(el.dataset.position);

  if (pos === 'first') {
    const next = row.nextElementSibling;
    if (isGroupRow(next, ['middle', 'last'])) {
      next.dataset.position = next.dataset.position === 'middle' ? 'first' : 'single';
      // heir inherits the group head: sender label (group chats) moves down,
      // keeping its identity hue (--sender-h travels with the element)
      const label = row.querySelector('.c-bubble__sender');
      const heir = next.querySelector('.c-bubble');
      if (label && heir && !heir.querySelector('.c-bubble__sender')) heir.prepend(label);
    }
  } else if (pos === 'last') {
    const prev = row.previousElementSibling;
    if (isGroupRow(prev, ['first', 'middle'])) {
      prev.dataset.position = prev.dataset.position === 'middle' ? 'last' : 'single';
      // avatar renders on the last-of-group — it moves up to the new tail
      // (firstElementChild: may be the bare avatar OR its #99 button wrap)
      const av = row.querySelector('.c-bubble-row__gutter')?.firstElementChild;
      const prevGutter = prev.querySelector('.c-bubble-row__gutter');
      if (av && prevGutter && !prevGutter.childNodes.length) prevGutter.append(av);
    }
  }
  // middle: [first, middle*, last] stays contiguous — no repair needed
  row.remove();
}

/** Day separator (design: centered pill). Shares the day-bucket ladder with
 *  the chat list (timestamp.js) — today → strings.today. */
export function createDateSeparator(ts, strings = getStrings(), now = Date.now()) {
  const el = document.createElement('div');
  el.className = 'c-datesep';
  el.setAttribute('role', 'separator');
  const pill = document.createElement('span');
  pill.className = 'c-datesep__pill';
  pill.textContent = dayBucketLabel(ts, strings, now, strings.today || 'Today');
  el.append(pill);
  return el;
}
