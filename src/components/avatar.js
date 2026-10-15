/**
 * c-avatar — photo, or deterministic gradient placeholder (DECISIONS.md #34).
 * The identity color comes from the address hash → a stable anchor per contact.
 * Named contacts show initials; address-only contacts show the user glyph;
 * groups show the `users` glyph (N1 — the app never draws a group as a person: no initials,
 * no person glyph) — ★ V1A-M M3: or, behind the `groupavatars` flag (v1-flags.js), the emoji
 * the group's own name starts or ends with. That emoji is the group's choice, and it may be a
 * face (👤, 🧑) — N1 is about what the APP draws; never initials for a group, #364 stays.
 *
 * createAvatar({ src, name, address, size = 48, online = false, group = false })
 */
import { icon } from './icons.js';
import { v1Flag } from './v1-flags.js';

/* N1 (#364): the identity wheel is QUANTIZED to 12 curated hue anchors.
 * The old continuous hue was already uniform (#38 measured), but neighbours
 * inside the 60–180° band all read as the same olive/green. Anchors give a
 * guaranteed minimum hue distance (#1001: the lime anchor now sits in the old
 * "illegible yellow band" — Damir's palette; names solve lightness per anchor).
 * avatar.css carries one hand-tuned gradient per anchor (index = data-hue).
 * ★ #1001: the #364 "≥ 4.5:1 at both stops" floor is RELAXED for avatars (Telegram's own
 * pairs run 1.7–3.1:1); initials carry a shadow instead — see avatar.css.
 * Order matters: index i = IDENTITY_HUES[i] = avatar.css [data-hue="i"]. */
/* ★ #1001 (D-10, Damir 2026-09-28): the anchors are the TELEGRAM-CLOSE palette now (avatar.css
 * carries the hex pairs). Each hue below is the circular MIDPOINT of its new pair, so a group
 * sender's NAME (message-bubble.css, `data-idhue`) reads as the same colour as its avatar.
 * The index → family mapping is unchanged; was [0, 22, 40, 95, 135, 165, 190, 215, 245, 275, 305, 335]. */
export const IDENTITY_HUES = [6, 25, 41, 87, 133, 171, 192, 209, 245, 276, 322, 347];

function hashRaw(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  // avalanche mix (murmur3 finalizer) — plain h%N clustered similar Latin
  // names into one band (all-olive avatars); this scatters them (#38)
  h ^= h >>> 16;
  h = Math.imul(h, 0x45d9f3b);
  h = (h ^ (h >>> 16)) >>> 0;
  return h;
}

/** Anchor index 0..11 for an identity string (single source for avatar + label). */
export function identityIndex(str) {
  return hashRaw(String(str == null ? '' : str)) % IDENTITY_HUES.length;
}

export function hashHue(str) { // exported: sender labels reuse the identity hue (single source)
  return IDENTITY_HUES[identityIndex(str)];
}

/* Middle-truncate a wallet address (Damir 2026-07-07 · #211 canon): 6…6 keeps
   both ends recognisable. The ONE helper every chat surface uses — a raw address
   is never shown in full on a chat surface (topbar title, list row, sender label);
   the full address lives only in Contact details + payment/wallet surfaces. Lives
   in avatar.js (the shared identity/address module) so bubbles + list rows import
   it without a circular dependency. */
export function truncateAddressMiddle(s, head = 6, tail = 6) {
  s = String(s == null ? '' : s);
  return s.length <= head + tail + 1 ? s : s.slice(0, head) + '…' + s.slice(-tail);
}

/* D-19b (#370): detect an ADDRESS-BEARING "nick" on a blind-masked roster row.
   C# masks the address slot with '[Unknown]' but the NICK slot can still carry
   the address in TWO encodings (loop B-1): the legacy "x" + <base58> pseudo-key
   (SingleChatPage.loadContacts / ContactDetails.loadMembers — nameless member),
   and the RAW base58 echo (resolveNick falls back to senderAddress.ToString();
   ContactDetails falls back to local_fr.nickname, which IS the address for an
   unnamed contact — the #276/#279 echo class). Rendered verbatim either one IS
   the address a blind room hides (#369 amendment). Shells test roster names
   with this at INGEST — on '[Unknown]'-masked rows ONLY — and blank the DISPLAY
   name (the raw value stays usable as a key). Base58 alphabet, at or above the
   shared ADDRESS_MIN_CHARS floor (#589 raised it from 30 — see the block below),
   with an optional leading x: a real nick of that shape is implausible, and the
   failure mode in a blind room is a placeholder instead of a strange name —
   the safe direction. */
/* ★★ #589 (Damir F5 2026-08-26): "a long nickname is middle-truncated".
 *
 * The rule he states is the canon: a NICK ellipsizes at the END, on overflow only.
 * Only an ADDRESS is ever truncated in the middle. So every shape test that can
 * route a nick into `truncateAddressMiddle` has to be tight enough that a human
 * name cannot reach it — and four of them were not:
 *
 *   isPseudoAddressNick          30+ chars   (this file, #370)
 *   home.html   looksLikeAddress 20+ chars   (excerpt canon + wallet counterparty)
 *   wallet_sent nameIsAddr       20+ chars
 *   chat.html   looksAddr        24+ chars, and not even base58-restricted
 *
 * A 20-to-30 character nickname is ordinary. An IXIAN ADDRESS of that length does
 * not exist: `Address.ToString()` base58-encodes `addressWithChecksum` (Ixian-Core
 * `Address/Address.cs:362-365`) — the address plus a 3-byte checksum — and the
 * address itself is 33 or 45 bytes (`Address.cs:34`, `addressVersionLengths`).
 *
 * ⚠ MEASURED, not estimated (the audit re-derived this over 20 000 synthetic
 * addresses per version, because my first numbers were wrong in both directions):
 * v0 encodes to 49 characters 96% of the time and 48 the rest — its leading version
 * byte is zero, and Base58Check spends only one character on a leading zero byte
 * (`Utils/Base58CheckEncoding.cs:50-53`) — and v1/v2 encode to EXACTLY 65, always.
 * So the shortest real address is 48, not the 49 I first wrote, and the long form is
 * 65, not 66.
 *
 * ONE floor, with margin on both sides: 40. Eight characters of headroom below the
 * shortest address, and far above any plausible nickname. Raising a floor can only
 * match FEWER strings, so the #370 blind-room guard cannot weaken — every address it
 * has to catch is 48+, and nothing exists in the 30-to-40 window it used to cover.
 *
 * ⚠ NOT applied to the add-contact input gate (contacts-shell 20–128). That gate
 * ACCEPTS a pasted value; being permissive there is the correct direction, and a
 * wrong answer is a validation message, not a mangled name. */
export const ADDRESS_MIN_CHARS = 40;

/* The shared #211 shape test: is this string an Ixian address rather than a name?
   Base58 alphabet, at or above the floor, and it must contain a DIGIT — a long
   all-letter token is a word, and every real address carries digits. Callers that
   also accept an 'x'-prefixed pseudo-key use isPseudoAddressNick below.
   ⚠ It shares only the FLOOR with isPseudoAddressNick below — not the rule. This one
   adds a 128 upper bound and requires a digit; that one accepts a leading 'x' and does
   neither. They are two predicates with one constant, not one predicate.
   ⚠ NAMED `isAddressShaped`, not `looksLikeAddress`: contacts-shell.js already owns
   a `looksLikeAddress`, and it is a DIFFERENT job — an INPUT-acceptance gate that is
   deliberately charset-blind so it cannot reject a valid address it has not seen.
   One word, one meaning; the bundle's collision gate caught the clash. */
export function isAddressShaped(s) {
  const v = String(s == null ? '' : s);
  return v.length >= ADDRESS_MIN_CHARS && v.length <= 128
    && /^[1-9A-HJ-NP-Za-km-z]+$/.test(v) && /\d/.test(v);
}

/* ⚠ Hoisted, not rebuilt per call: this runs once per roster row on every re-render,
   and a module-scope literal also gets its pattern validated at parse time. */
const PSEUDO_ADDRESS_RE = new RegExp('^x?[1-9A-HJ-NP-Za-km-z]{' + ADDRESS_MIN_CHARS + ',}$');

export function isPseudoAddressNick(name) {
  return PSEUDO_ADDRESS_RE.test(String(name == null ? '' : name));
}

function initials(name) {
  const trimmed = name.trim();
  // must start with a letter (any script) — empty/whitespace-only and
  // address-like hex "names" get the glyph instead of initials
  if (!/^\p{L}/u.test(trimmed)) return null;
  // [...p] not p[0]: first char may be an astral-plane code point (CJK ext.)
  return trimmed.split(/\s+/).slice(0, 2).map(p => [...p][0].toLocaleUpperCase()).join('');
}

/* ★ V1A-M M3 — THE GROUP EMOJI AVATAR ("Weekend in Bled 🏔️", "🎸 Band practice").
 *
 * groupEmojiOf(name) → the emoji GRAPHEME the name ends with, else the one it starts with,
 * else ''. LAST wins over FIRST. ★ #46 r1: before the edge test the name loses, at BOTH ends,
 * whitespace and the bidi / format controls (U+200B–200F, 202A–202E, 2060, 2066–2069, FEFF —
 * an RTL name often ends with an RLM or a PDI, C-3), and at the END only a run of punctuation
 * (\p{P}: "Party 🎉!" → 🎉, C-N1). Leading punctuation is NOT stripped: "#" is \p{P} and starts
 * a keycap ("#️⃣ fans"); a keycap ends with U+20E3, so the trailing strip cannot reach into one. One grapheme = what a reader sees as one emoji: a ZWJ
 * family, a skin-tone sequence, a VS16 sequence, a flag (regional-indicator pair, or a tag
 * sequence) and a keycap each come back whole.
 *
 * WHAT COUNTS AS AN EMOJI (one grapheme):
 *   · a regional-indicator PAIR (a flag), or a keycap ([0-9#*] + optional VS16 + U+20E3);
 *   · else its FIRST code point is an \p{Extended_Pictographic} base, and every later code point is on
 *     a WHITELIST (★ #46 r1 C-1): VS16, a skin tone (U+1F3FB–1F3FF), a tag character (U+E0020–E007F),
 *     or a ZWJ immediately followed by another pictograph. Anything else — a combining-mark stack
 *     ("🎸" + 200 × U+0336 is ONE grapheme, a peer can name a group that), VS15, a stray ZWJ — is not
 *     an avatar emoji. And the grapheme is at most AV_EMOJI_MAX_UNITS code units (the longest real
 *     sequence, a kiss with two skin tones, is 15; a subdivision flag ≤ 18).
 *   · and it must be emoji-PRESENTED: a code point at or above U+1F000 (most of them are emoji-default;
 *     a few — 🏔 🕊 🌡 — are text-default and render the platform's way), an \p{Emoji_Presentation}
 *     code point, VS16, a skin-tone modifier, or a ZWJ.
 *   ⚠ That second condition is stricter than "\p{Extended_Pictographic}" alone, on purpose: ©, ®, ™, ‼
 *     and the other TEXT-default pictographs are Extended_Pictographic too, and "Acme™" must not wear a
 *     ™ in its avatar. Typed with VS16 (❤️, ☀️) they ARE emoji. A digit, a letter or "#" alone is never one.
 *
 * GRAPHEMES: Intl.Segmenter when present — ONE instance, made at the first call (never per render).
 * Without it, a fallback splitter that keeps exactly the emoji-relevant clusters together (marks
 * incl. VS15/VS16 and U+20E3, skin tones, tag characters, ZWJ + the next code point when the cluster
 * started with a pictograph (GB11), regional indicators in pairs). It is not a full UAX #29 splitter — for non-emoji text it may cut differently,
 * which cannot matter: a non-emoji edge gives '' either way.
 * PERF (the S20F scroll budget): a pure-ASCII name returns '' before any segmenting; results are
 * cached per name in a Map capped at AV_EMOJI_CACHE_MAX (oldest out first); no DOM, no layout read.
 * A name longer than 256 code units is examined only at its two 64-unit ends. */
const AV_EMOJI_CACHE_MAX = 256;
const AV_EMOJI_CACHE = new Map();
let avSegmenter = null;          // the one Intl.Segmenter, or false when the runtime has none
const AV_RI_PAIR = /^[\u{1F1E6}-\u{1F1FF}]{2}$/u;
const AV_KEYCAP = /^[0-9#*]\uFE0F?\u20E3$/u;
const AV_PICTO_ONE = /^\p{Extended_Pictographic}$/u;
const AV_EMOJI_MAX_UNITS = 32;
const AV_EDGE_CTRL = /^[\s\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]$/u;
const AV_EDGE_PUNCT = /^\p{P}$/u;
const AV_PRESENTED = /[\u{1F000}-\u{1FFFF}\uFE0F\u200D\u{1F3FB}-\u{1F3FF}]|\p{Emoji_Presentation}/u;
const AV_EXTEND = /^(?:\p{M}|[\u200D\uFE0E\uFE0F\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}])$/u;
/* the sizes avatar.css gives an emoji scale rule (`.c-avatar[data-size="N"] { --c-avatar-px }`); any other size
   stamps its own px on the emoji span. Keep the two lists equal (the a-groupemoji pin checks it). */
const AV_EMOJI_SIZES = new Set([24, 28, 32, 36, 40, 44, 48, 56, 64, 80, 96]);

function avGetSegmenter() {
  if (avSegmenter === null) {
    try {
      avSegmenter = (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function')
        ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : false;
    } catch (e) { avSegmenter = false; }
  }
  return avSegmenter;
}

/** Fallback grapheme split (no Intl.Segmenter): emoji-correct clusters — see the block above. */
function avSplitGraphemes(s) {
  const out = [];
  let cur = '', ri = 0, afterZwj = false, curPicto = false;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    const isRi = cp >= 0x1F1E6 && cp <= 0x1F1FF;
    const join = cur !== '' && ((afterZwj && curPicto) || AV_EXTEND.test(ch) || (isRi && ri % 2 === 1));
    if (join) cur += ch;
    else { if (cur) out.push(cur); cur = ch; ri = 0; curPicto = AV_PICTO_ONE.test(ch); }
    ri = isRi ? ri + 1 : 0;
    afterZwj = cp === 0x200D;
  }
  if (cur) out.push(cur);
  return out;
}

function avIsEmojiGrapheme(g) {
  if (!g || g.length > AV_EMOJI_MAX_UNITS) return false;
  if (AV_RI_PAIR.test(g) || AV_KEYCAP.test(g)) return true;
  const cps = Array.from(g);
  if (!AV_PICTO_ONE.test(cps[0])) return false;              // the base IS the pictograph
  for (let i = 1; i < cps.length; i++) {
    const cp = cps[i].codePointAt(0);
    if (cp === 0xFE0F || (cp >= 0x1F3FB && cp <= 0x1F3FF) || (cp >= 0xE0020 && cp <= 0xE007F)) continue;
    if (cp === 0x200D && i + 1 < cps.length && AV_PICTO_ONE.test(cps[i + 1])) { i++; continue; }
    return false;                                            // a mark stack, VS15 (asked-for TEXT), a stray ZWJ …
  }
  return AV_PRESENTED.test(g);
}

/* whitespace + bidi/format controls off both ends; a punctuation run off the END only (see the block above).
   Index loops, not `[…]+$` regexes: a peer-made name of 10 000 punctuation marks must stay linear. */
function avStripEdges(s) {
  let a = 0, b = s.length;
  while (a < b && AV_EDGE_CTRL.test(s[a])) a++;
  while (b > a && (AV_EDGE_CTRL.test(s[b - 1]) || AV_EDGE_PUNCT.test(s[b - 1]))) b--;
  return a === 0 && b === s.length ? s : s.slice(a, b);
}

function avEdgeGraphemes(s) {
  const head = s.length > 256 ? s.slice(0, 64) : s;
  const tail = s.length > 256 ? s.slice(-64) : s;
  const seg = avGetSegmenter();
  if (seg) {
    const first = seg.segment(head)[Symbol.iterator]().next().value;
    const last = seg.segment(tail).containing(tail.length - 1);
    return [first ? first.segment : '', last ? last.segment : ''];
  }
  const h = avSplitGraphemes(head);
  const t = tail === head ? h : avSplitGraphemes(tail);
  return [h[0] || '', t[t.length - 1] || ''];
}

/** The emoji a GROUP name starts or ends with (LAST wins), whole grapheme; '' when neither edge is one. */
export function groupEmojiOf(name) {
  const s = typeof name === 'string' ? avStripEdges(name) : '';
  if (!s || !/[^\x00-\x7F]/.test(s)) return '';          // every emoji (and every keycap) carries a non-ASCII code point
  const hit = AV_EMOJI_CACHE.get(s);
  if (hit !== undefined) return hit;
  const [first, last] = avEdgeGraphemes(s);
  const v = avIsEmojiGrapheme(last) ? last : (avIsEmojiGrapheme(first) ? first : '');
  if (AV_EMOJI_CACHE.size >= AV_EMOJI_CACHE_MAX) AV_EMOJI_CACHE.delete(AV_EMOJI_CACHE.keys().next().value);
  AV_EMOJI_CACHE.set(s, v);
  return v;
}

/** Render the deterministic gradient placeholder (anchor from address/name hash)
 *  + initials, the user glyph, or the group glyph — into `el`. Extracted so it's
 *  reusable as the fallback when a photo `src` fails to load. */
function renderPlaceholder(el, { name, address, size, group }) {
  // N1 (#364): JS supplies ONLY the deterministic anchor INDEX; the gradient
  // colors live in avatar.css per [data-hue] (the c-disc #170 grammar). The
  // supersedes-#37 note: one vivid palette + white ink serves BOTH themes.
  el.dataset.placeholder = '';
  el.dataset.hue = String(identityIndex(address || name));
  // N1: a GROUP placeholder always wears the `users` glyph — never initials,
  // never the person glyph — so a group is recognisable at a glance.
  const ini = (!group && name) ? initials(name) : null;
  // ★ V1A-M M3: a group whose name starts/ends with an emoji wears THAT emoji instead of the glyph —
  // behind v1Flag('groupavatars') (Debug ON, Release OFF = the glyph exactly as before). Groups only.
  const emo = (group && name && v1Flag('groupavatars')) ? groupEmojiOf(name) : '';
  if (ini) {
    const t = document.createElement('span');
    t.className = 'c-avatar__initials';
    t.setAttribute('aria-hidden', 'true'); // audit r2: SRs read "HS Han Solo"
    t.textContent = ini;
    el.append(t);
  } else if (emo) {
    const t = document.createElement('span');
    t.className = 'c-avatar__emoji';
    t.setAttribute('aria-hidden', 'true'); // decoration: the row/heading carries the name
    t.textContent = emo;
    // a size with no rule in avatar.css carries its own scale input (the inline width/height precedent)
    if (!AV_EMOJI_SIZES.has(size)) t.style.setProperty('--c-avatar-px', size + 'px');
    el.append(t);
  } else {
    el.append(icon(group ? 'users' : 'user-circle', { size: Math.round(size * 0.55) }));
  }
}

/* ★ Gate row O-13 — ONE test for an image source a component is asked to render.
 *
 * Two sinks took a URL with no host and no scheme test: the link-preview card and the
 * shared-media strip. Both are dormant — no shipped shell passes those fields — and both
 * are fed by a PEER-COMPOSED payload the moment they are wired. The test lives in the
 * component layer for that reason: a wiring pass cannot forget a rule it does not have
 * to remember.
 *
 * The rule, and it refuses on the unknown case:
 *   · a `data:image/` URI is LOCAL. It makes no request. It is always admitted.
 *   · an absolute http(s) URL is REMOTE. The fetch tells that host the reader's IP and
 *     the moment the reader opened the message, so the caller must opt in.
 *   · everything else gets NO src — a relative path, a protocol-relative '//host/x', a
 *     'javascript:' URL, 'blob:', 'file:', or a string the URL parser rejects.
 *
 * The value is parsed by the SAME WHATWG parser the browser uses for the request, so this
 * predicate cannot disagree with what the fetch would do. It mirrors the app-invite icon
 * predicate in chat.html, which asks the same question in the same order.
 *
 * The helper sits in avatar.js for the reason truncateAddressMiddle does (#212): both
 * message-bubble.js and chat-info.js already import from this file, and a new component
 * file would need scripts/build-demo-bundle.mjs.
 * ⚠ createAvatar's own <img> below does NOT run this test. Its src is a C# data: URI or a
 * local file path, it degrades to the gradient on error, and gating it is a live
 * behaviour change that belongs to its own row. */
export function safeImageSrc(value, { allowRemote = false } = {}) {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v) return '';
  if (/^data:image\//i.test(v)) return v;                  // local — no request leaves the device
  let proto = '';
  try { proto = new URL(v).protocol; } catch (e) { return ''; }   // unparseable → refuse
  if (proto !== 'http:' && proto !== 'https:') return '';   // only the two schemes that fetch
  return allowRemote ? v : '';                              // remote needs the caller's opt-in
}

export function createAvatar({ src = null, name = '', address = '', size = 48, online = false, group = false } = {}) {
  const el = document.createElement('span');
  el.className = 'c-avatar';
  el.dataset.size = String(size);
  if (size !== 24 && size !== 40 && size !== 48) {
    // known sizes (24/40/48) come from --size-avatar-* tokens in avatar.css;
    // anything else falls back to inline sizing until tokenized
    el.style.width = size + 'px';
    el.style.height = size + 'px';
  }

  if (src) {
    const img = document.createElement('img');
    img.className = 'c-avatar__img';
    img.alt = '';
    // Graceful fallback: a C# avatar path that doesn't resolve in a
    // self-contained shell (or a broken file) must NOT show a broken-image
    // glyph — drop the <img> and render the deterministic gradient instead
    // (worst case = today's behavior; best case = the real photo). Wire the
    // handler BEFORE setting src so a synchronously-cached error still fires.
    img.addEventListener('error', () => {
      img.remove();
      renderPlaceholder(el, { name, address, size, group });
    }, { once: true });
    img.src = src;
    el.append(img);
  } else {
    renderPlaceholder(el, { name, address, size, group });
  }

  if (online) {
    const dot = document.createElement('span');
    dot.className = 'c-avatar__dot';
    el.append(dot);
  }
  return el;
}
