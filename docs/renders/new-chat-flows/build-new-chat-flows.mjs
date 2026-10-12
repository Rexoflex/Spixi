/**
 * build-new-chat-flows — writes new-chat-flows-render.html (same folder): the three screens behind the New chat
 * picker, TODAY (faithful redraws) and two directions each, as phone frames in light and dark:
 *   1 · the Add contact SCREEN  — createAddContact      (src/components/contacts-shell.js:667)
 *   2 · the Add contact SHEET   — createAddContactSheet (contacts-shell.js:1249), opened over createContactsPicker
 *   3 · the New group SCREEN    — createGroupSetup      (contacts-shell.js:949)
 * Host routing: src/bridge/contacts-page.js (openAddContact :263 · mountAddContact · openGroupSetup :163).
 * READS src/ (never writes it): glyphs from src/components/icons.js (one hidden <symbol> sprite, <use> per glyph),
 * the sheet art from IL_ART.addContact in src/components/illustrations.js (round twinkle dots only — no four-point
 * sparkle in the source, used as it is), the identity hue from identityIndex in src/components/avatar.js, the disc
 * slot from discGrad in src/components/disc.js. Colour values are the resolved tokens of src/styles/tokens.css
 * (light = :root, dark = [data-theme="dark"]) — copied into the .t-light / .t-dark blocks of page.template.html.
 *
 *   node docs/renders/new-chat-flows/build-new-chat-flows.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const { ICONS } = await imp('src/components/icons.js');
const { identityIndex } = await imp('src/components/avatar.js');
const { discGrad } = await imp('src/components/disc.js');

/* ---- the add-contact art, exactly as the app builds it (IL_ART.addContact: scan frame, person disc, plus badge,
   scan line, three round twinkle dots + two small dots — no four-point sparkle in the source) ---- */
const ilSrc = fs.readFileSync(path.join(ROOT, 'src/components/illustrations.js'), 'utf8');
const a0 = ilSrc.indexOf('const IL_ART = {');
const a1 = ilSrc.indexOf('\n};', a0);
// eslint-disable-next-line no-eval
const IL_ART = (0, eval)('(' + ilSrc.slice(a0 + 15, a1 + 2) + ')');
const AD = IL_ART.addContact;
if (!AD) throw new Error('IL_ART.addContact missing');
/* the twinkles must be the round dot (adDot = two circles); a four-point star would be a <path> under il-tw */
if (!/<g id="adDot@@"><circle[^>]*\/><circle[^>]*\/><\/g>/.test(AD.b) || /<path[^>]*class="il-tw/.test(AD.b)) throw new Error('add-contact twinkles are not round dots — redraw them as dots');
let adSeq = 0;
function addArt(size) {
  adSeq += 1;
  const b = AD.b.split('@@').join('-n' + adSeq);
  return '<svg class="il-art" viewBox="' + AD.vb + '" width="' + size + '" height="' + size + '" aria-hidden="true">' + b + '</svg>';
}

/* ---- icons: one sprite, <use> per glyph ---- */
const used = new Set();
const ic = (name, size = 24, cls = '') => {
  if (!ICONS[name]) throw new Error('missing icon ' + name);
  used.add(name);
  return '<svg class="ic' + (cls ? ' ' + cls : '') + '" width="' + size + '" height="' + size + '" fill="none" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
};
function sprite() {
  const sym = [...used].sort().map((n) => '<symbol id="i-' + n + '" viewBox="' + ICONS[n].v + '">' + ICONS[n].b + '</symbol>').join('');
  /* a "photo" for the photo-set states (a picture, not an asset of the app) */
  const photo = '<symbol id="ph-photo" viewBox="0 0 100 100"><defs><linearGradient id="phSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f7cf7"/><stop offset=".55" stop-color="#b07cf0"/><stop offset="1" stop-color="#ffb38a"/></linearGradient><linearGradient id="phSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d4fb8"/><stop offset="1" stop-color="#14245c"/></linearGradient></defs>'
    + '<rect width="100" height="100" fill="url(#phSky)"/><circle cx="64" cy="52" r="13" fill="#ffe2b0"/><path d="M0 64 L22 44 L38 58 L52 40 L74 62 L100 46 V100 H0Z" fill="#3a2f7a" opacity=".85"/><rect y="70" width="100" height="30" fill="url(#phSea)"/><path d="M10 80h26M48 86h30M20 92h22" stroke="#ffe2b0" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round"/></symbol>';
  return '<svg class="sprite" aria-hidden="true" focusable="false">' + sym + photo + '</svg>';
}

/* ---- copy: the shipped strings (src/strings/en-us.json), plus the NEW keys a direction needs (marked) ---- */
const S = {
  newChat: 'New chat', addContact: 'Add contact', createGroup: 'Create group', newGroup: 'New group',
  searchContacts: 'Search contacts', all: 'All', people: 'People', groups: 'Groups',
  addContactNote: 'Enter an Ixian address to send a contact request.',
  ixianAddress: 'Ixian address', sendRequest: 'Send request', requestSent: 'Request sent',
  validAddress: 'Looks like a valid Ixian address', badAddress: 'That doesn’t look like an Ixian address.',
  alreadyContactNamed: '{name} is already in your contacts.', viewContact: 'View contact',
  contactSpixiAddress: 'Spixi address', edit: 'Edit', scanQrTitle: 'Scan QR code',
  addContactSheetLead: 'You can add a new contact by scanning their QR code, or by entering or pasting their Spixi address.',
  addContactScanLabel: 'Scan QR code', addContactScanHint: 'Their QR code needs to be visible on another device, so you can scan it with this one.',
  addContactEnterLabel: 'Enter or paste a Spixi address', addContactEnterHint: 'Type or paste their Spixi address (for example 42Spox…M3rci98).',
  showMyAddress: 'Show my address',
  setGroupPhoto: 'Set group photo', changeGroupPhoto: 'Change group photo', groupName: 'Group name',
  members: 'members', membersTitle: 'Members', groupCounter: '{n} / {max}',
  groupNeedsTwo: 'Select at least 2 people to create a group.', groupLimitNote: 'A group can have up to 10 members besides you.',
  blindGroup: 'Blind group', blindGroupSub: 'Members can’t see each other’s identity. Only you, the creator, can.',
  createGroupCta: 'Create group', removeFromGroup: 'Remove from group',
  /* the term fix (A + B): the contact flow says "Spixi address" — value edits + one split key (see the page) */
  addContactNoteSpixi: 'Enter a Spixi address to send a contact request.',
  validAddressSpixi: 'Looks like a valid Spixi address',
  NEW_addContactBadAddress: 'That doesn’t look like a Spixi address.',
  /* B only */
  NEW_paste: 'Paste',
  NEW_addContactCompare: 'Check that the start and the end match the address on their screen.',
  NEW_addressShortened: 'This address is shortened. Copy the whole address and paste it again.',
  NEW_groupAddMembers: 'Add people',
};

/* ---- people (49 characters = a v0 Ixian address, base58 — avatar.js ADDRESS_MIN_CHARS note) ---- */
const ADDR = '4Fq8ZtkR2mWc7NhY5vLbE3dPjx9TsGuA6rKeHnB2wQ7Vyz5Ma';
const P = [
  { name: 'Air', address: '3Kp7TzQw2nYb8VhR5cLmE4dGjx6SsFuA9rKeHnB2wQ7VxA1c' },
  { name: 'amigocn', address: '2Vb9KcTq7mWz3NhY5vLbE8dPjx4TsGuA6rKeHnC2wQ5Vpz8Ld' },
  { name: 'Bojana', address: '4Hc2YmRt8kWq7NhZ5vLbE3dPjx9TsGuA6rKeHnB2wQ7Vyz2Rk' },
  { name: 'Damir K.', address: '3Zt5WnPq2mVc7NhY5vLbE3dPjx9TsGuA6rKeHnB2wQ7Vyx7Fe' },
  { name: 'Elena M.', address: '4Wd8QnTk3mWc7NhY5vLbE3dPjx9TsGuA6rKeHnB2wQ7Vyz9Bj' },
  { name: 'Ixi Ops', address: '2Qe7RtYm4kWc7NhY5vLbE3dPjx9TsGuA6rKeHnB2wQ7Vyz3Mn' },
  { name: 'Luka', address: '3Mf6TpZq9nWc7NhY5vLbE3dPjx9TsGuA6rKeHnB2wQ7Vyz6Gs' },
  { name: 'Marko V.', address: '4Pa3XkWr5mWc7NhY5vLbE3dPjx9TsGuA6rKeHnB2wQ7Vyz4Hu' },
  { name: 'Nina', address: '2Rg4VzKp6mWc7NhY5vLbE3dPjx9TsGuA6rKeHnB2wQ7Vyz8Ct' },
  { name: 'Sara P.', address: '3Tb8NcWq1mWc7NhY5vLbE3dPjx9TsGuA6rKeHnB2wQ7Vyz5Dv' },
];
const short96 = (a) => a.slice(0, 9) + '…' + a.slice(-6);          // contacts-shell.js shortAddress (9 … 6)
const short88 = (a) => a.slice(0, 8) + ' … ' + a.slice(-8);        // wallet-receive.js #1358 (8 … 8)
const SHORT_COPIED = ADDR.slice(0, 8) + '…' + ADDR.slice(-8);      // a user copied the SHORT form somewhere

/* avatar (avatar.css pairs, identityIndex(address || name)) */
const AV = ['#FC797D,#D95029', '#F78445,#CB6300', '#E6B816,#DC8400', '#97B72F,#439A15', '#67C05E,#00A157', '#00C79C,#00A297',
  '#00C2DA,#0096D0', '#2CB1FF,#3480EC', '#909CFF,#8A68E3', '#BB8DFA,#AE59C8', '#E57DCC,#CF4A8C', '#F778A0,#DA4959'];
const initials = (n) => { const w = String(n).trim().split(/\s+/).filter(Boolean); return ((w[0] || '')[0] + (w.length > 1 ? (w[1][0] || '') : '')).toUpperCase(); };
function av(name, address, size, cls = '') {
  const [c1, c2] = AV[identityIndex(address || name)].split(',');
  const inner = name ? '<span class="av-i">' + initials(name) + '</span>' : ic('user-circle', Math.round(size * 0.55));
  return '<span class="av' + (cls ? ' ' + cls : '') + '" style="--av1:' + c1 + ';--av2:' + c2 + ';width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.375) + 'px">' + inner + '</span>';
}

/* discs: TODAY = the base.css .c-disc (avatar pair + 15% shade, slot = discGrad(glyph)); directions = the hub palette */
const discToday = (glyph, size = 32) => '<span class="dsc g-' + discGrad(glyph) + '" style="width:' + size + 'px;height:' + size + 'px">' + ic(glyph, 20) + '</span>';
const discHub = (hub, glyph, size = 32, gsize = 20) => '<span class="dsc hub hub-' + hub + '" style="width:' + size + 'px;height:' + size + 'px">' + ic(glyph, gsize) + '</span>';

/* ---- the phone frame ---- */
function phone(theme, o) {
  return '<div class="ph t-' + theme + (o.kb ? ' has-kb' : '') + '">'
    + '<div class="sb"><span>15:42</span><span class="sb-r">5G <i class="sig"></i> 43%</span></div>'
    + '<div class="tb"><span class="tb-back">' + ic('arrow-left', 24) + '</span><span class="tb-title">' + o.title + '</span></div>'
    + '<div class="bd ' + (o.bd || '') + '">' + o.body + '</div>'
    + (o.footer ? '<div class="ft' + (o.ftCls ? ' ' + o.ftCls : '') + '">' + o.footer + '</div>' : '')
    + (o.kb ? keyboard(o.kb) : '')
    + (o.overlay ? '<div class="ov' + (o.kb ? ' ov-kb' : '') + '"><div class="scrim"></div>' + o.overlay + '</div>' : '')
    + (o.kb ? '' : '<div class="hi"></div>') + '</div>';
}
function keyboard(chip) {
  const keys = (s) => s.split('').map((k) => '<span class="kb-k">' + k + '</span>').join('');
  return '<div class="kb"><div class="kb-strip">' + (chip === true ? '' : '<span class="kb-chip">' + ic('copy', 16) + '<span>' + chip + '</span></span>') + '</div>'
    + '<div class="kb-row">' + keys('qwertyuiop') + '</div><div class="kb-row kb-r2">' + keys('asdfghjkl') + '</div>'
    + '<div class="kb-row"><span class="kb-k kb-w">⇧</span>' + keys('zxcvbnm') + '<span class="kb-k kb-w">⌫</span></div>'
    + '<div class="kb-row"><span class="kb-k kb-w2">?123</span><span class="kb-k">,</span><span class="kb-k kb-sp"></span><span class="kb-k">.</span><span class="kb-k kb-w2 kb-go">' + ic('check', 18) + '</span></div></div>';
}
const fig = (inner, cap, sub) => '<figure class="fg">' + inner + '<figcaption><b>' + cap + '</b>' + (sub ? ' · ' + sub : '') + '</figcaption></figure>';
const spinner = '<span class="spin" aria-hidden="true"></span>';
const btn = (label, o = {}) => '<span class="btn btn-56' + (o.dis ? ' is-dis' : ' btn-fill') + (o.cls ? ' ' + o.cls : '') + '">' + (o.busy ? spinner : '') + (o.icon ? ic(o.icon, 20) : '') + label + '</span>';
const caret = '<i class="caret"></i>';

/* =====================================================================================================
   1 · ADD CONTACT SCREEN
   ===================================================================================================== */
function s1Today(state) {
  const focus = state === 'focus';
  const val = { valid: ADDR, error: SHORT_COPIED, known: P[0].address, sending: ADDR }[state] || '';
  const input = '<span class="t1-input' + (focus ? ' is-focus' : '') + (state === 'sending' ? ' is-dim' : '') + '">'
    + (val ? '<span class="t1-val">' + val + '</span>' : '<span class="t1-ph">' + (focus ? caret : '') + S.ixianAddress + '</span>') + '</span>';
  let after = '';
  if (state === 'valid') after = '<p class="t1-valid">' + ic('check', 16, 'ok') + '<span>' + S.validAddress + '</span></p>';
  if (state === 'error') after = '<p class="t1-err">' + S.badAddress + '</p>';
  if (state === 'known') after = '<div class="t1-known"><p>' + S.alreadyContactNamed.replace('{name}', 'Air') + '</p><span class="btn-o32">' + S.viewContact + '</span></div>';
  const group = '<div class="cg t1-group"><div class="t1-field">' + input + '<span class="t1-scan' + (state === 'sending' ? ' is-dim' : '') + '">' + ic('scan', 20) + '</span></div>' + after + '</div>';
  return '<p class="t1-note">' + S.addContactNote + '</p>' + group
    + btn(S.sendRequest, { dis: state === 'known', busy: state === 'sending' });
}

function s1A(state) {
  const focus = state === 'focus';
  const val = { valid: ADDR, error: SHORT_COPIED, known: P[0].address, sending: ADDR }[state] || '';
  const bad = state === 'error';
  const field = '<span class="fx' + (focus ? ' is-focus' : '') + (bad ? ' is-bad' : '') + (state === 'sending' ? ' is-dim' : '') + '">'
    + (val ? '<span class="fx-val">' + val + '</span>' : '<span class="fx-ph">' + (focus ? caret : '') + S.contactSpixiAddress + '</span>')
    + (state === 'valid' ? '<span class="fx-ok">' + ic('check', 16) + '</span>' : '')
    + '<span class="fx-sep"></span><span class="fx-btn">' + ic('scan', 22) + '</span></span>';
  let after = '';
  if (state === 'valid') after = '<p class="ln ln-ok">' + ic('check', 16) + '<span>' + S.validAddressSpixi + '</span></p>';
  if (bad) after = '<p class="ln ln-bad">' + ic('alert-small', 20) + '<span>' + S.NEW_addContactBadAddress + '</span></p>';
  if (state === 'known') after = '<div class="a1-known">' + av('Air', P[0].address, 32) + '<span class="a1-known-t">' + S.alreadyContactNamed.replace('{name}', 'Air') + '</span><span class="a1-known-b">' + S.viewContact + '</span></div>';
  return '<section class="card a1-card"><label class="lab">' + S.contactSpixiAddress + '</label>' + field + after + '</section>'
    + '<p class="cap">' + ic('info-circle', 18) + '<span>' + S.addContactNoteSpixi + '</span></p>'
    + btn(S.sendRequest, { dis: state === 'known', busy: state === 'sending' });
}

/* B — the identity preview: a valid address becomes the person card of #1358, start … end (8 + 8) */
function idCard(o) {
  return '<section class="idc">'
    + '<span class="idc-band"></span>'
    + (o.edit ? '<span class="idc-edit">' + ic('pencil', 16) + S.edit + '</span>' : '')
    + av(o.name || '', o.address, 64, 'idc-av')
    + (o.name ? '<p class="idc-name">' + o.name + '</p>' : '')
    + '<p class="idc-addr">' + short88(o.address) + '</p>'
    + (o.line || '') + '</section>';
}
function s1B(state) {
  if (state === 'focus' || state === 'error' || state === 'idle') {
    const bad = state === 'error';
    const field = '<span class="fx fx-b' + (state === 'focus' ? ' is-focus' : '') + (bad ? ' is-bad' : '') + '">'
      + (bad ? '<span class="fx-val">' + SHORT_COPIED + '</span>' : '<span class="fx-ph">' + (state === 'focus' ? caret : '') + S.contactSpixiAddress + '</span>')
      + (bad ? '' : '<span class="paste">' + ic('copy', 16) + S.NEW_paste + '</span>')
      + '<span class="fx-sep"></span><span class="fx-btn">' + ic('scan', 22) + '</span></span>';
    const err = bad ? '<p class="ln ln-bad">' + ic('alert-small', 20) + '<span>' + S.NEW_addressShortened + '</span></p>' : '';
    return '<section class="card a1-card"><label class="lab">' + S.contactSpixiAddress + '</label>' + field + err + '</section>'
      + '<p class="cap">' + ic('info-circle', 18) + '<span>' + S.addContactNoteSpixi + '</span></p>'
      + btn(S.sendRequest, { dis: true });
  }
  if (state === 'known') {
    return idCard({ name: 'Air', address: P[0].address, edit: true, line: '<p class="idc-line">' + S.alreadyContactNamed.replace('{name}', 'Air') + '</p>' })
      + btn(S.viewContact, { icon: 'user-circle' });
  }
  const ok = '<p class="idc-line idc-ok">' + ic('check', 16) + S.validAddressSpixi + '</p>';
  return idCard({ address: ADDR, edit: state !== 'sending', line: ok })
    + '<p class="cap">' + ic('shield-lock', 18) + '<span>' + S.NEW_addContactCompare + '</span></p>'
    + btn(S.sendRequest, { busy: state === 'sending' });
}

const S1 = {
  today: [
    fig(phone('light', { title: S.addContact, body: s1Today('focus'), bd: 'bd-scr', kb: true }), 'Enter or paste, field focused', 'light (Damir’s screenshot)'),
    fig(phone('dark', { title: S.addContact, body: s1Today('focus'), bd: 'bd-scr', kb: true }), 'Field focused', 'dark'),
    fig(phone('light', { title: S.addContact, body: s1Today('valid'), bd: 'bd-scr' }), 'Pasted, valid', 'the tail of the address is cut off'),
    fig(phone('dark', { title: S.addContact, body: s1Today('error'), bd: 'bd-scr' }), 'Pasted the SHORT form', 'error, field unmarked'),
    fig(phone('light', { title: S.addContact, body: s1Today('known'), bd: 'bd-scr' }), 'Already a contact', 'Send disabled'),
    fig(phone('dark', { title: S.addContact, body: s1Today('sending'), bd: 'bd-scr' }), 'Sending', 'dark'),
  ],
  a: [
    fig(phone('light', { title: S.addContact, body: s1A('focus'), bd: 'bd-g', kb: '4Fq8ZtkR2mWc7NhY5vLb…' }), 'Field focused', 'the keyboard offers the copied address'),
    fig(phone('dark', { title: S.addContact, body: s1A('idle'), bd: 'bd-g' }), 'Idle', 'dark'),
    fig(phone('light', { title: S.addContact, body: s1A('valid'), bd: 'bd-g' }), 'Pasted, valid', 'light'),
    fig(phone('dark', { title: S.addContact, body: s1A('error'), bd: 'bd-g' }), 'Bad address', 'the field says it too'),
    fig(phone('light', { title: S.addContact, body: s1A('known'), bd: 'bd-g' }), 'Already a contact', 'who, and a way there'),
    fig(phone('dark', { title: S.addContact, body: s1A('sending'), bd: 'bd-g' }), 'Sending', 'dark'),
  ],
  b: [
    fig(phone('light', { title: S.addContact, body: s1B('focus'), bd: 'bd-g', kb: true }), 'Field focused', 'Paste in the field (new verb)'),
    fig(phone('dark', { title: S.addContact, body: s1B('valid'), bd: 'bd-g bd-col' }), 'Pasted or scanned, valid', 'start … end, like their card'),
    fig(phone('light', { title: S.addContact, body: s1B('valid'), bd: 'bd-g bd-col' }), 'Pasted or scanned, valid', 'light'),
    fig(phone('dark', { title: S.addContact, body: s1B('known'), bd: 'bd-g bd-col' }), 'Already a contact', 'the button changes job'),
    fig(phone('light', { title: S.addContact, body: s1B('error'), bd: 'bd-g' }), 'Pasted the short form', 'the error names the cause'),
    fig(phone('dark', { title: S.addContact, body: s1B('sending'), bd: 'bd-g bd-col' }), 'Sending', 'dark'),
  ],
};

/* =====================================================================================================
   2 · ADD CONTACT SHEET (over the New chat picker)
   ===================================================================================================== */
function picker() {
  const act = (glyph, label) => '<span class="pk-act">' + discToday(glyph) + '<span>' + label + '</span></span>';
  const rows = P.slice(0, 6).map((c) => '<span class="pk-row">' + av(c.name, c.address, 48) + '<span class="col"><span class="nm">' + c.name + '</span><span class="sub">' + short96(c.address) + '</span></span></span>').join('');
  return '<div class="cg pk-acts">' + act('user-plus', S.addContact) + act('users', S.createGroup) + '</div>'
    + '<span class="srch">' + ic('search', 20) + S.searchContacts + '</span>'
    + '<div class="chips"><span class="chip is-on">' + S.all + '</span><span class="chip">' + S.people + '</span><span class="chip">' + S.groups + '</span></div>'
    + '<div class="cg pk-list">' + rows + '</div>';
}
function sheet(content, o = {}) {
  return '<div class="sh' + (o.cls ? ' ' + o.cls : '') + '"><span class="sh-h"></span><p class="sh-t">' + S.addContact + '</p>' + content + '</div>';
}
function s2TodaySheet() {
  const item = (glyphs, label, hint) => '<span class="it"><span class="med">' + glyphs + '</span><span class="it-t"><span class="it-l">' + label + '</span><span class="it-h">' + hint + '</span></span></span>';
  return sheet('<div class="sh-hero">' + addArt(128) + '<p class="sh-lead">' + S.addContactSheetLead + '</p></div>'
    + '<div class="its">'
    + item(ic('scan', 28) + '<span class="med-in">' + ic('qrcode', 11) + '</span>', S.addContactScanLabel, S.addContactScanHint)
    + item(ic('pencil', 28), S.addContactEnterLabel, S.addContactEnterHint) + '</div>');
}
function s2ASheet(press) {
  const item = (hub, glyphs, label, hint, on) => '<span class="it it-a' + (on ? ' is-press' : '') + '"><span class="med med-hub hub-' + hub + '">' + glyphs + '</span><span class="it-t"><span class="it-l">' + label + '</span><span class="it-h">' + hint + '</span></span></span>';
  return sheet('<div class="sh-hero">' + addArt(128) + '<p class="sh-lead">' + S.addContactSheetLead + '</p></div>'
    + '<div class="its">'
    + item(8, ic('scan', 26) + '<span class="med-in">' + ic('qrcode', 10) + '</span>', S.addContactScanLabel, S.addContactScanHint, press)
    + item(7, ic('pencil', 24), S.addContactEnterLabel, S.addContactEnterHint) + '</div>');
}
function s2BSheet(state) {
  const focus = state === 'focus';
  if (state === 'valid') {
    return sheet(idCard({ address: ADDR, edit: true, line: '<p class="idc-line idc-ok">' + ic('check', 16) + S.validAddressSpixi + '</p>' }).replace('class="idc"', 'class="idc idc-sheet"')
      + '<p class="cap cap-sh">' + ic('shield-lock', 18) + '<span>' + S.NEW_addContactCompare + '</span></p>'
      + btn(S.sendRequest), { cls: 'sh-b' });
  }
  const field = '<span class="fx fx-sh' + (focus ? ' is-focus' : '') + '"><span class="fx-ph">' + (focus ? caret : '') + S.contactSpixiAddress + '</span>'
    + '<span class="paste">' + ic('copy', 16) + S.NEW_paste + '</span></span>';
  const row = (hub, glyph, label, extra) => '<span class="rw">' + discHub(hub, glyph) + '<span class="rw-l">' + label + '</span>' + (extra || '') + ic('chevron-right', 20, 'rw-end') + '</span>';
  const rows = '<div class="sh-rows">' + row(8, 'scan', S.addContactScanLabel) + row(7, 'qrcode', S.showMyAddress) + '</div>';
  const hero = focus ? '' : '<div class="sh-hero sh-hero-b">' + addArt(96) + '<p class="sh-lead sh-lead-b">' + S.addContactSheetLead + '</p></div>';
  return sheet(hero + '<div class="sh-field">' + field + '</div>' + rows + (focus ? '' : ''), { cls: 'sh-b' });
}
const S2 = {
  today: [
    fig(phone('light', { title: S.newChat, body: picker(), bd: 'bd-scr' }), 'New chat', 'the entry: Add contact row'),
    fig(phone('light', { title: S.newChat, body: picker(), bd: 'bd-scr', overlay: s2TodaySheet() }), 'Add contact sheet', 'light (Damir’s screenshot)'),
    fig(phone('dark', { title: S.newChat, body: picker(), bd: 'bd-scr', overlay: s2TodaySheet() }), 'Add contact sheet', 'dark'),
  ],
  a: [
    fig(phone('light', { title: S.newChat, body: picker(), bd: 'bd-scr', overlay: s2ASheet(false) }), 'Coloured tiles', 'light'),
    fig(phone('dark', { title: S.newChat, body: picker(), bd: 'bd-scr', overlay: s2ASheet(true) }), 'Same, Scan pressed', 'dark'),
  ],
  b: [
    fig(phone('light', { title: S.newChat, body: picker(), bd: 'bd-scr', overlay: s2BSheet('idle') }), 'The field is in the sheet', 'light'),
    fig(phone('dark', { title: S.newChat, body: picker(), bd: 'bd-scr', overlay: s2BSheet('idle') }), 'The field is in the sheet', 'dark'),
    fig(phone('light', { title: S.newChat, body: picker(), bd: 'bd-scr', overlay: s2BSheet('focus'), kb: '4Fq8ZtkR2mWc7NhY5vLb…' }), 'Field tapped', 'the sheet rides the keyboard'),
    fig(phone('dark', { title: S.newChat, body: picker(), bd: 'bd-scr', overlay: s2BSheet('valid') }), 'Valid → the person card', 'Send in the sheet'),
  ],
};

/* =====================================================================================================
   3 · NEW GROUP
   ===================================================================================================== */
const sw = (on) => '<span class="sw' + (on ? ' is-on' : '') + '"><i></i></span>';
function s3Today(o) {
  const ms = P.slice(0, o.n);
  const hero = '<div class="cg t3-hero"><span class="t3-av">' + ic('users', 32) + '</span><p class="t3-hint">' + S.setGroupPhoto + '</p>'
    + '<span class="t3-name' + (o.focus ? ' is-focus' : '') + '">' + (o.name ? '<span>' + o.name + (o.focus ? caret : '') + '</span>' : '<span class="ph-t">' + (o.focus ? caret : '') + S.groupName + '</span>') + '</span>'
    + (o.err ? '<p class="t1-err">' + S.groupNeedsTwo + '</p>' : '') + '</div>';
  const mem = '<div class="cg t3-mem"><p class="t3-head">' + S.members + ' · ' + ms.length + '</p><div class="t3-chips">'
    + ms.map((m) => '<span class="chip chip-l">' + m.name + ic('x', 16) + '</span>').join('') + '</div></div>';
  const blind = '<div class="cg t3-blind"><span class="t3-brow">' + discToday('users') + '<span class="col"><span class="nm">' + S.blindGroup + '</span><span class="sub sub-w">' + S.blindGroupSub + '</span></span>' + sw(false) + '</span></div>';
  return hero + mem + blind;
}
function s3A(o) {
  const ms = P.slice(0, o.n);
  const photo = o.photo ? '<svg class="ph-img" viewBox="0 0 100 100" aria-hidden="true"><use href="#ph-photo"/></svg>' : ic('users', 32);
  const hero = '<section class="card a3-hero"><span class="a3-av">' + photo + '<span class="a3-badge">' + ic(o.photo ? 'pencil' : 'camera', 16) + '</span></span>'
    + '<span class="a3-photo">' + (o.photo ? S.changeGroupPhoto : S.setGroupPhoto) + '</span>'
    + '<span class="a3-name' + (o.focus ? ' is-focus' : '') + '">' + (o.name ? '<span>' + o.name + (o.focus ? caret : '') + '</span>' : '<span class="ph-t">' + (o.focus ? caret : '') + S.groupName + '</span>') + '</span></section>';
  const counter = S.groupCounter.replace('{n}', ms.length).replace('{max}', 10);
  const rule = ms.length < 2 ? '<p class="ln ln-rule">' + ic('info-circle', 18) + '<span>' + S.groupNeedsTwo + '</span></p>'
    : ms.length >= 10 ? '<p class="ln ln-rule">' + ic('info-circle', 18) + '<span>' + S.groupLimitNote + '</span></p>' : '';
  const mem = '<section class="card a3-mem"><p class="a3-head"><span>' + S.membersTitle + '</span><span class="a3-count">' + counter + '</span></p><div class="a3-chips">'
    + ms.map((m) => '<span class="chip chip-l chip-av">' + av(m.name, m.address, 24) + '<span class="chip-n">' + m.name + '</span>' + ic('x', 16, 'chip-x') + '</span>').join('') + '</div>' + rule + '</section>';
  const blind = '<section class="card a3-blind"><span class="t3-brow">' + discHub(8, 'users') + '<span class="col"><span class="nm">' + S.blindGroup + '</span><span class="sub sub-w">' + S.blindGroupSub + '</span></span>' + sw(o.blind) + '</span></section>';
  return hero + mem + blind;
}
function s3B(o) {
  const ms = P.slice(0, o.n);
  const photo = o.photo ? '<svg class="ph-img" viewBox="0 0 100 100" aria-hidden="true"><use href="#ph-photo"/></svg>' : ic('users', 34);
  const hero = '<section class="idc b3-hero"><span class="idc-band"></span><span class="b3-av">' + photo + '<span class="a3-badge">' + ic(o.photo ? 'pencil' : 'camera', 16) + '</span></span>'
    + '<span class="b3-name' + (o.focus ? ' is-focus' : '') + '">' + (o.name ? '<span>' + o.name + (o.focus ? caret : '') + '</span>' : '<span class="ph-t">' + (o.focus ? caret : '') + S.groupName + '</span>') + '</span></section>';
  const counter = S.groupCounter.replace('{n}', ms.length).replace('{max}', 10);
  const rule = ms.length < 2 ? '<p class="ln ln-rule b3-rule">' + ic('info-circle', 18) + '<span>' + S.groupNeedsTwo + '</span></p>' : '';
  const rows = ms.map((m) => '<span class="b3-row">' + av(m.name, m.address, 40) + '<span class="col"><span class="nm">' + m.name + '</span><span class="sub">' + short96(m.address) + '</span></span><span class="b3-x">' + ic('x', 20) + '</span></span>').join('');
  const mem = '<p class="sec-lab"><span>' + S.membersTitle + '</span><span>' + counter + '</span></p>'
    + '<section class="card b3-mem"><span class="b3-row b3-add">' + discHub(7, 'user-plus', 40, 22) + '<span class="b3-add-l">' + S.NEW_groupAddMembers + '</span></span>' + rows + '</section>' + rule;
  const blind = '<section class="card a3-blind"><span class="t3-brow">' + discHub(8, 'users') + '<span class="col"><span class="nm">' + S.blindGroup + '</span><span class="sub sub-w">' + S.blindGroupSub + '</span></span>' + sw(o.blind) + '</span></section>';
  return hero + mem + blind;
}
const ftBtn = (dis, busy) => btn(S.createGroupCta, { dis, busy });
const S3 = {
  today: [
    fig(phone('light', { title: S.newGroup, body: s3Today({ n: 2 }), bd: 'bd-scr', footer: ftBtn(false) }), 'Idle, 2 members', 'light (Damir’s screenshot)'),
    fig(phone('dark', { title: S.newGroup, body: s3Today({ n: 2 }), bd: 'bd-scr', footer: ftBtn(false) }), 'Idle', 'dark'),
    fig(phone('light', { title: S.newGroup, body: s3Today({ n: 2, name: 'Weekend hike', focus: true }), bd: 'bd-scr', footer: ftBtn(false), kb: true }), 'Naming', 'Return = Done (#977)'),
    fig(phone('dark', { title: S.newGroup, body: s3Today({ n: 1, name: 'Weekend hike', err: true }), bd: 'bd-scr', footer: ftBtn(false) }), 'Chip removed → 1 member → Create', 'error under the NAME'),
  ],
  a: [
    fig(phone('light', { title: S.newGroup, body: s3A({ n: 2 }), bd: 'bd-g', footer: ftBtn(false), ftCls: 'ft-g' }), 'Idle, 2 members', 'light'),
    fig(phone('dark', { title: S.newGroup, body: s3A({ n: 2 }), bd: 'bd-g', footer: ftBtn(false), ftCls: 'ft-g' }), 'Idle', 'dark'),
    fig(phone('light', { title: S.newGroup, body: s3A({ n: 5, name: 'Weekend hike', photo: true, blind: true }), bd: 'bd-g', footer: ftBtn(false), ftCls: 'ft-g' }), 'Photo, name, 5 members, blind on', 'light'),
    fig(phone('dark', { title: S.newGroup, body: s3A({ n: 1, name: 'Weekend hike' }), bd: 'bd-g', footer: ftBtn(true), ftCls: 'ft-g' }), '1 member', 'Create waits, the rule says why'),
    fig(phone('light', { title: S.newGroup, body: s3A({ n: 10, name: 'Climbing club', photo: true }), bd: 'bd-g', footer: ftBtn(false), ftCls: 'ft-g' }), '10 members (the cap)', 'light'),
  ],
  b: [
    fig(phone('light', { title: S.newGroup, body: s3B({ n: 2 }), bd: 'bd-g', footer: ftBtn(false), ftCls: 'ft-g' }), 'Idle, 2 members', 'light'),
    fig(phone('dark', { title: S.newGroup, body: s3B({ n: 2 }), bd: 'bd-g', footer: ftBtn(false), ftCls: 'ft-g' }), 'Idle', 'dark'),
    fig(phone('light', { title: S.newGroup, body: s3B({ n: 5, name: 'Weekend hike', photo: true }), bd: 'bd-g', footer: ftBtn(false), ftCls: 'ft-g' }), 'Photo, name, 5 members', 'the body scrolls under Create'),
    fig(phone('dark', { title: S.newGroup, body: s3B({ n: 1, name: 'Weekend hike', blind: true }), bd: 'bd-g', footer: ftBtn(true), ftCls: 'ft-g' }), '1 member, blind on', 'Add people is right there'),
    fig(phone('light', { title: S.newGroup, body: s3B({ n: 2, name: 'Weekend hi', focus: true }), bd: 'bd-g', footer: ftBtn(false), ftCls: 'ft-g', kb: true }), 'Naming', 'light'),
  ],
};

/* ---- assemble ---- */
const slots = {
  S1_TODAY: S1.today, S1_A: S1.a, S1_B: S1.b,
  S2_TODAY: S2.today, S2_A: S2.a, S2_B: S2.b,
  S3_TODAY: S3.today, S3_A: S3.a, S3_B: S3.b,
};
let out = fs.readFileSync(path.join(HERE, 'page.template.html'), 'utf8');
for (const [k, v] of Object.entries(slots)) {
  const tag = '<!--@@' + k + '@@-->';
  if (!out.includes(tag)) throw new Error('template slot missing ' + k);
  out = out.replace(tag, () => v.join(''));
}
out = out.replace('<!--@@SPRITE@@-->', () => sprite());
fs.writeFileSync(path.join(HERE, 'new-chat-flows-render.html'), out);
console.log('wrote new-chat-flows-render.html', (Buffer.byteLength(out) / 1024).toFixed(0) + ' KB', '· icons', used.size, '· art', adSeq);
