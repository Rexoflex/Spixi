/**
 * c-glass-card — the glass card family on the Chats list (★ S11 A, DECISIONS #1262; design "Spixi Hint Cards").
 * ONE card grammar for two jobs: the UPDATE notice (it replaces the orange c-banner for the update case ONLY —
 * connectivity and every other warning keep their surfaces) and the quiet "Did you know?" HINTS (tips 5–9, then 1, 3, 4).
 * Glass: no outline — a faint blue / violet tint over the card ground, a top highlight, a soft low shadow
 * (glass-card.css; tokens.css region A). One entrance, then hold; reduced motion = static.
 *
 *   createGlassCard({ variant, art, eyebrow, title, text, linkLabel, onLink, onDismiss, strings }) → el
 *   createUpdateCard({ version, onHowTo, onDismiss, strings })  → el   (blue app-style icon, NO Update button —
 *        Spixi is installed many ways; "How to update" opens one page that covers every platform)
 *   createHintCard({ tip, onLearnMore, onDismiss, canLearn, strings }) → el   (a tip without a Learn-more target has no
 *        link; ★ S12 A (#1267): nor one whose target canLearn(def) refuses — a `web:` page on an exe without `hintHelp`)
 *
 * PURE rules (pinned on the built shell):
 *   HINT_TIPS · HINT_IDS — the list, in show order; the ids are the C# whitelist (Spixi/Utils/S11HintRules.cs TipIds)
 *   parseHintsState(json) → { firstSeen, lastShown, done:[ids], off, now } | null   (the C# `setHints` push, validated)
 *   pickHint(state, { now, blocked }) → tip id | null
 *       never while blocked (the update card, the backup or the rating prompt) · never with hints off ·
 *       never in the first 3 days after setup (firstSeen) · at most one every 7 days (lastShown) ·
 *       the FIRST tip in list order that is not done.
 *   updateVersionOf(text, templates) → version | null
 *       recognises the C#-localized "update available" notice (`global-update-available`, one `{0}` hole in all
 *       13 lang files) by its template's prefix + suffix and returns what C# put in the hole — only a version-shaped
 *       token (≤ 32 chars of [0-9A-Za-z.+-]); anything else is not an update notice.
 *
 * Text is text: every string lands through textContent (the version is C#'s own, re-validated above).
 *
 * ★ S11 A2 (#1263): ONE entrance per card lifetime (R2-m2) — after the entrance ends (animationend, or a 2.5 s
 * backstop) the card carries `data-held` and glass-card.css drops its animation, so moving the card between the
 * tab slots (#403) or showing its tab again never replays it. No live region (NIT): a card is INSERTED, and an
 * inserted role=status is announced unreliably — the update card is a labelled group, a hint a labelled note.
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';

export const HINT_SETUP_GRACE_MS = 3 * 24 * 60 * 60 * 1000;   // never in the first 3 days after setup
export const HINT_GAP_MS = 7 * 24 * 60 * 60 * 1000;           // at most one every 7 days

/* The tips, in show order. `learn` names the in-app target the host opens with EXISTING navigation
   (home.html hintLearnMore): backup = Settings › Backup (ixian:backup) · wallet / apps = the tab · addcontact =
   the contacts directory's Add contact. `learn: ''` = no Learn more (tip 9, quantum, nophone).
   ★ S11 A2 (#1263, R1-M2): a tip's web page is C#-OWNED, the way the update card's is (`ixian:updateHelp` →
   Config.updateHelpUrl, HomePage) — never a URL from this document (the openLink sink stays at its two pages).
   ★ S12 A (#1267): `learn: 'web:<id>'` = that page — the shell sends the fixed verb `ixian:hintHelp:<id>` (cap
   `hintHelp`) and C# maps the id to its own compile-time URL (S11HintRules.helpUrlFor → Config.networkHelpUrl).
   Without the cap the card has NO Learn more (createHintCard canLearn). A new tip id must join S11HintRules.TipIds too
   (the C# whitelist refuses an id it does not know).
   Tip 2 is HELD (#1267) until the new site has a page:
     { id: 'e2e',     glyph: 'lock',           learn: '' },   // "End-to-end encrypted" · "Only you and the person you write to can read it."
*/
export const HINT_TIPS = [
  { id: 'backup', glyph: 'shield-lock', learn: 'backup' },
  { id: 'wallet', glyph: 'wallet', learn: 'wallet' },
  { id: 'apps', glyph: 'apps', learn: 'apps' },
  { id: 'addcontact', glyph: 'qrcode', learn: 'addcontact' },
  { id: 'tip', glyph: 'heart-handshake', learn: '' },
  { id: 'network', glyph: 'topology-star', learn: 'web:network' },   // ★ S12 A (#1267): tip 1
  { id: 'quantum', glyph: 'shield-lock', learn: '' },                // ★ S12 A (#1267): tip 3
  { id: 'nophone', glyph: 'square-asterisk', learn: '' },            // ★ S12 A (#1267): tip 4
];
export const HINT_IDS = HINT_TIPS.map((t) => t.id);

/** The copy of one tip — explicit `strings.key || 'English'` lines so extract-strings sees every key. */
export function hintCopy(id, strings = getStrings()) {
  switch (id) {
    case 'backup': return { title: strings.hintBackupTitle || 'Your backup is your account', text: strings.hintBackupBody || 'Only your backup can restore a lost phone.' };
    /* ★ S11 A2 (#1263, R2 copy): a group chat cannot pay — the line names a CONTACT (a new key: a changed meaning) */
    case 'wallet': return { title: strings.hintWalletTitle || 'Money like a message', text: strings.hintWalletBody2 || 'Send IXI to a contact in a chat.' };
    case 'apps': return { title: strings.hintAppsTitle || 'Mini apps in chats', text: strings.hintAppsBody || 'Play or work together inside a chat.' };
    case 'addcontact': return { title: strings.hintAddContactTitle || 'Add people in person', text: strings.hintAddContactBody || 'Scan a QR code when you meet.' };
    /* ★ S11 A2 (#1263, R2 copy): platform-neutral — a desktop opens the menu with a right-click, not a long-press */
    case 'tip': return { title: strings.hintTipTitle || 'Say thanks with a tip', text: strings.hintTipBody2 || 'Open a message’s menu and choose Tip.' };
    /* ★ S12 A (#1267): tips 1, 3, 4 (the design's table; tip 4 never says "no servers") */
    case 'network': return { title: strings.hintNetworkTitle || 'Decentralized', text: strings.hintNetworkBody || 'Spixi runs on the Ixian network of independent nodes.' };
    case 'quantum': return { title: strings.hintQuantumTitle || 'Ready for quantum computers', text: strings.hintQuantumBody || 'Current Spixi apps use post-quantum encryption.' };
    /* ★ S12 A2 (#1267, R2-m4): platform-neutral — a desktop has no phone (a changed meaning = a new key) */
    case 'nophone': return { title: strings.hintNoPhoneTitle || 'No phone number', text: strings.hintNoPhoneBody2 || 'Your account is a key on your device.' };
    default: return null;
  }
}

const finiteMs = (v) => {
  const n = typeof v === 'number' ? v : (typeof v === 'string' && /^\d{1,16}$/.test(v) ? Number(v) : NaN);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

/** PURE — the C# `setHints` push → a validated state, or null (anything malformed is no state at all). */
export function parseHintsState(raw) {
  let o = raw;
  if (typeof raw === 'string') {
    if (raw.length > 4096) return null;
    try { o = JSON.parse(raw); } catch (e) { return null; }
  }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  const firstSeen = finiteMs(o.firstSeen);
  const lastShown = o.lastShown == null || o.lastShown === '' ? 0 : finiteMs(o.lastShown);
  const now = finiteMs(o.now);
  if (Number.isNaN(firstSeen) || Number.isNaN(lastShown) || Number.isNaN(now)) return null;
  const done = Array.isArray(o.done) ? o.done.filter((x) => HINT_IDS.includes(x)) : [];
  return { firstSeen, lastShown, done: [...new Set(done)], off: o.off === true, now };
}

/** PURE — which tip (if any) may show now. */
export function pickHint(state, { now, blocked = false } = {}) {
  if (!state || state.off || blocked) return null;
  const t = Number.isFinite(now) ? now : state.now;
  if (!Number.isFinite(t)) return null;
  if (!(state.firstSeen > 0) || t - state.firstSeen < HINT_SETUP_GRACE_MS) return null;   // a firstSeen in the future = too early (C# clamps it)
  if (state.lastShown > 0) {
    const since = t - state.lastShown;
    if (since >= 0 && since < HINT_GAP_MS) return null;   // a clock moved BACK past lastShown must not freeze hints forever
  }
  const done = new Set(state.done || []);
  const tip = HINT_TIPS.find((x) => !done.has(x.id));
  return tip ? tip.id : null;
}

const VERSION_RE = /^[0-9A-Za-z][0-9A-Za-z.+-]{0,31}$/;
/** PURE — the version inside a C#-localized update notice, or null when `text` is not one. */
export function updateVersionOf(text, templates = []) {
  const t = String(text == null ? '' : text).trim();
  if (!t || t.length > 600) return null;
  for (const tpl of templates) {
    const s = String(tpl == null ? '' : tpl).trim();
    const at = s.indexOf('{0}');
    if (at < 0 || s.indexOf('{0}', at + 3) >= 0) continue;   // exactly one hole
    const pre = s.slice(0, at), post = s.slice(at + 3);
    if (t.length <= pre.length + post.length || !t.startsWith(pre) || !t.endsWith(post)) continue;
    const mid = t.slice(pre.length, t.length - post.length);
    if (VERSION_RE.test(mid)) return mid;
  }
  return null;
}

/** The generic card. `art` is an element (decorative — it is hidden from assistive tech here). */
export function createGlassCard({ variant = 'hint', art = null, eyebrow = '', title = '', text = '', linkLabel = '', onLink, onDismiss, strings = getStrings() } = {}) {
  const el = document.createElement('div');
  el.className = 'c-glass-card';
  el.dataset.variant = variant;
  // ★ S11 A2 (#1263, NIT): no live region on an INSERTED node — the update card is a labelled group, a hint a note
  el.setAttribute('role', variant === 'update' ? 'group' : 'note');
  if (title) el.setAttribute('aria-label', title);
  holdEntrance(el);

  if (art) {
    const a = document.createElement('div');
    a.className = 'c-glass-card__art';
    a.setAttribute('aria-hidden', 'true');
    a.append(art);
    el.append(a);
  }
  const body = document.createElement('div');
  body.className = 'c-glass-card__body';
  if (eyebrow) {
    const e = document.createElement('p');
    e.className = 'c-glass-card__eyebrow';
    e.textContent = eyebrow;
    body.append(e);
  }
  const ti = document.createElement('p');
  ti.className = 'c-glass-card__title';
  ti.textContent = title;
  body.append(ti);
  if (text) {
    const tx = document.createElement('p');
    tx.className = 'c-glass-card__text';
    tx.textContent = text;
    body.append(tx);
  }
  if (linkLabel && typeof onLink === 'function') {
    const l = document.createElement('button');
    l.type = 'button';
    l.className = 'c-glass-card__link';
    const lab = document.createElement('span');
    lab.textContent = linkLabel;
    l.append(lab, icon('chevron-right', { size: 16 }));
    l.addEventListener('click', () => { try { onLink(); } catch (e) { /* the host's navigation */ } });
    body.append(l);
  }
  el.append(body);
  if (typeof onDismiss === 'function') {
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'c-glass-card__close';
    x.setAttribute('aria-label', strings.dismiss || 'Dismiss');
    x.append(icon('x', { size: 20 }));
    x.addEventListener('click', () => {
      try { x.blur(); } catch (e) {}   // #383 MINOR-1: focus leaves the control before the card goes
      try { onDismiss(); } catch (e) { /* caller-side bookkeeping only */ }
    });
    el.append(x);
  }
  return el;
}

/* ★ S11 A2 (#1263, R2-m2): one entrance, then `data-held` (glass-card.css: animation none) — the first
   animationend of the card's OWN entrance, or the backstop when no animation runs (reduced motion, a hidden slot). */
export const GLASS_HOLD_MS = 2500;
function holdEntrance(el) {
  let t = 0;
  const hold = () => {
    clearTimeout(t);
    el.removeEventListener('animationend', onEnd);
    el.setAttribute('data-held', '');
  };
  const onEnd = (e) => { if (e.target === el) hold(); };
  el.addEventListener('animationend', onEnd);
  t = setTimeout(hold, GLASS_HOLD_MS);
}

function artTile(cls, glyph, size) {
  const t = document.createElement('span');
  t.className = cls;
  t.append(icon(glyph, { size }));
  return t;
}

/** The update card: "Spixi {version} is available" · "Update it where you got Spixi." · How to update ›  · ×.
 *  ★ S11 A2 (#1263, R2-m4): no `onHowTo` → no link (the host passes one only to an exe with the `updateHelp` verb). */
export function createUpdateCard({ version = '', onHowTo, onDismiss, strings = getStrings() } = {}) {
  const v = VERSION_RE.test(String(version)) ? String(version) : '';
  const card = createGlassCard({
    variant: 'update',
    art: artTile('c-glass-card__appicon', 'logo', 26),   // ★ S11 A2 (#1263, NIT): the app's own mark — an app icon, not a download arrow
    title: (strings.updateCardTitle || 'Spixi {version} is available').split('{version}').join(v),
    text: strings.updateCardBody || 'Update it where you got Spixi.',
    linkLabel: strings.updateCardLink || 'How to update',
    onLink: onHowTo,
    onDismiss,
    strings,
  });
  card.dataset.version = v;
  return card;
}

/** One hint card. Unknown tip → null. ★ S12 A (#1267): `canLearn(def)` — the host says whether it can open this tip's
    Learn more (a `web:` page needs the exe's `hintHelp` cap); false = the card has no link. Default: every target. */
export function createHintCard({ tip, onLearnMore, onDismiss, canLearn = null, strings = getStrings() } = {}) {
  const def = HINT_TIPS.find((t) => t.id === tip);
  const copy = def && hintCopy(def.id, strings);
  if (!copy) return null;
  const learn = !!def.learn && (typeof canLearn !== 'function' || canLearn(def) === true);
  const card = createGlassCard({
    variant: 'hint',
    art: artTile('c-glass-card__tipart', def.glyph, 26),
    eyebrow: strings.hintEyebrow || 'Did you know?',
    title: copy.title,
    text: copy.text,
    linkLabel: learn ? (strings.hintLearnMore || 'Learn more') : '',
    onLink: learn ? () => { if (onLearnMore) onLearnMore(def.learn); } : null,
    onDismiss,
    strings,
  });
  card.dataset.tip = def.id;
  return card;
}
