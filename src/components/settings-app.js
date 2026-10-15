/**
 * c-settings "App" screens — Downloads · Developer (log) · Contributors
 * (docs/settings-shell-spec.md §9b, slice 2 — interview-locked 2026-07-05).
 *
 * Bridge honesty (bridge-audit-B §6–§8, all commands EXIST):
 * - Downloads: list arrives WHOLESALE (clearFiles + addFile(name, ctime) per
 *   file, re-pushed after any change) → setDownloads(el, files) mirrors that.
 *   ctime is DateTime.ToString() — LOCALE-DEPENDENT OPAQUE STRING: display
 *   as-is, never parse. Row tap → ixian:open:<name> (fire-and-forget, C# owns
 *   the result). Trash → ixian:delete:<name> behind the house locked confirm;
 *   C# deletes then re-pushes the list. "Delete all" → ixian:deleted (the
 *   danger-screen command reused).
 * - Dev: setLog(text) pushes the WHOLE ixian.log as one string, possibly
 *   twice (OnAppearing + onload) → setDevLog is an idempotent replace. No
 *   export/tail command exists — this screen is viewer + copy ONLY (Damir).
 * - Contributors: fully static (legacy contributors.html); names ship as opts
 *   with the legacy 12 as default.
 *
 * SECURITY: file names and log text come from the bridge → textContent ONLY
 * (the legacy page concatenated names into innerHTML — NOT ported). The
 * `..` traversal gap on ixian:open/delete is C#-side (§9 flag 5).
 *
 * Async callbacks use the house (payload, ctrl) contract, one-shot; every
 * shell callback is try/catch-guarded to the fail path (#141-m4).
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { discGrad } from './disc.js';
import { formatTxTimestamp, dayBucketLabel, docLocale, timeOpts } from './timestamp.js';   // iOS-55/#328: epoch ctimes → localized display
import { createTopbar } from './topbar.js';
import { openLegalDoc } from './launch-shell.js';   // iOS-23: ONE source for the legal copy (#169)
import { createButton, setLoading, setSuccess } from './button.js';
import { createSearchField } from './search-field.js';
import { settingsConfirm, settingsOptionSheet } from './settings-shell.js';
import { copyText } from './clipboard.js';   // ★ #993: the shared copy with the file:// fallback
import { fillFileName, fileKind } from './typed-bubbles.js';   // ★ #1005: one file-name truncation, the extension kept
import { formatFileSize } from './timestamp.js';            // ★★ #1107: one size format (chat info + Downloads) — ★ S11 F4 (#1263): its home is timestamp.js
import { createKindTile } from './file-tile.js';   // ★ S20G Q-1 / B-5: the file type tile, shared with chat info › Files (its CSS: file-tile.css)
import { createAvatar, safeImageSrc } from './avatar.js';                 // ★ S10 F7 (#1254): the From sheet's sender avatars
import { illoChatsEmpty, illoAddContact, illoWelcome3, illoAppsEmpty, illoBackup, illoWelcome1, illoAboutGlass, illoContribHeart } from './illustrations.js';   // ★ S12 B (#1267): the How-to step art (the S11 set)

// one-shot ctrl (#138 m1) — module-local unique name (house collision rule)
function appCtrl(onDone, onFail) {
  let used = false;
  return {
    done: () => { if (used) return; used = true; onDone(); },
    fail: (msg) => { if (used) return; used = true; onFail(msg); },
  };
}

/**
 * ★ #502 (Damir, 2026-08-25) — THIRD-PARTY ASSET CREDITS, kept SEPARATE from the names.
 *
 * The four in-app effect sounds are CC0, which requires no attribution at all. This is
 * here because it is the decent answer and because someone who wonders where a sound in
 * the app came from should be able to find out — not because anything is owed.
 *
 * ⚠ NOT merged into CONTRIBUTORS. Those are people who worked on Spixi; a licence credit
 * is a different kind of fact, and folding one into the other makes both harder to read
 * and quietly implies the wrong thing about both.
 *
 * ⚠ The LABEL is localized and the rest is not: a product name, a domain and an SPDX
 * identifier are proper nouns and must read identically in every language. `source` and
 * `licence` are curated in-code and rendered as textContent — never a link, because no
 * bridge verb opens one and a dead link is worse than selectable text (the About-screen
 * ruling, `linkRow` below).
 *
 * ⚠ AND THE LABEL IS RESOLVED BY A SWITCH, NOT BY `strings[c.key]`. `extract-strings` is a
 * STATIC sweep — it reads `strings.someKey || 'fallback'` out of the source and cannot see
 * a computed property. A dynamic lookup here compiled and linted clean and would have
 * shipped an English-only label in all thirteen locales, silently, because the fallback
 * would win every time. Adding a credit is therefore two lines: the entry below and its
 * case in `creditLabel`.
 */
function creditLabel(credit, strings) {
  switch (credit.key) {
    case 'creditSounds': return strings.creditSounds || 'Interface sounds';
    case 'creditIcons': return strings.creditIcons || 'Interface icons';
    case 'creditFlags': return strings.creditFlags || 'Country flags';
    default: return credit.fallback;   // a credit added without its case still renders
  }
}

export const ASSET_CREDITS = [
  {
    key: 'creditSounds',
    fallback: 'Interface sounds',
    source: 'UI SFX — uisfx.com',
    licence: 'CC0 1.0',
  },
  /* ★ #710 (Damir, 2026-08-30): the icon set is Tabler Icons (Paweł Kuna), exported
     through Figma as filled outlines. MIT requires the copyright notice and the licence
     text to travel with the software; a credit row here plus the notice in
     docs/legal/third-party-notices.md satisfies it. Attribution in the UI is not
     required by MIT but is the house courtesy. */
  {
    key: 'creditIcons',
    fallback: 'Interface icons',
    source: 'Tabler Icons — tabler.io/icons, © Paweł Kuna',
    licence: 'MIT',
  },
  /* ★ L15b (Session Z): the flags-only Twemoji face used on Windows, where the system
     emoji font draws no flags (flags.js installFlagFont). Twemoji artwork is CC-BY 4.0 —
     attribution is REQUIRED, so this row and the notice in
     docs/legal/third-party-notices.md are the licence's ask, not courtesy. */
  {
    key: 'creditFlags',
    fallback: 'Country flags',
    /* ★ #46 loop (B-8): CC-BY asks for the licence LINK and a statement of CHANGES on the
       shipped artifact, not only in a repo doc the device never receives — so both ride here. */
    source: 'Twemoji — © Twitter, Inc. and other contributors; the Mozilla twemoji-colr build, subset to country flags by TalkJS — creativecommons.org/licenses/by/4.0',
    licence: 'CC-BY 4.0 (subset)',
  },
];

// legacy contributors.html list (static; localizable via opts)
export const CONTRIBUTORS = [
  'Lex Scalp', 'w4r3z4s', '#Zinsi', '¥0_brkz', 'YT', 'Serg',
  'hau Nguyen Dinh', 'Spoony', 'Sam', 'Chris45', 'Ayze LYC', 'Dilaks',
];

const SEARCH_MIN = 8;            // search appears once the list needs scanning
const SENDER_SEARCH_MIN = 8;     // ★★ #1107: the From sheet gets a search field past this many entries

// view-takeover shell — settings-screens grammar (module-local, house collision rule)
function appScreenShell(className, title, onBack) {
  const el = document.createElement('div');
  el.className = className;
  el.append(createTopbar({ variant: 'view', title, onBack }));
  const body = document.createElement('div');
  body.className = 'c-settings__body u-scroll';
  el.append(body);
  const live = document.createElement('p');
  live.className = 'c-settings__live';
  live.setAttribute('aria-live', 'polite');
  el.append(live);
  return { el, body, live };
}

/**
 * Downloads — createSettingsDownloads({ files, host, onBack, onOpenFile,
 * onDeleteFile, onClearAll, onShowInChat, strings }).
 * files: [{ name, time, size?, sender?, senderKey? }] (time = epoch seconds, or an old exe's opaque ctime string).
 * Free fn: setDownloads(el, files, { sendersKnown }) — the clearFiles/addFile wholesale mirror.
 * ★ S20F W-12 (#1409): `waiting` = no empty state until the first setDownloads (the host's quiet window decides
 *   "empty"); `awaitSenders` = the From row is RESERVED (laid out, invisible, inert) from the first non-empty paint
 *   until a setDownloads with sendersKnown — so phase 2 moves no row. Without a sender then, the row STAYS reserved for
 *   this screen (★ S20G R-5; was the #46 r1 C-3 move, −52 px); a phase 2 that never comes releases it DL_SENDERS_BACKSTOP_MS after the
 *   first non-empty paint (C-4, the #326 completes-never grammar; 12 s — a phase 2 slower than that moves the list twice,
 *   −52 then +52: the recorded trade, #46 r2 MINOR-3).
 *
 * ★ S17 E (#1336, downloads-contributors-render.html, LOCKED): the premium screen —
 *   · a SUMMARY card: "{n} files · {total}", a storage bar by kind (one colour per kind, grows in once), a legend with
 *     each kind's size, and — only where the host passes onClearAll — the red "Delete all downloads" action
 *   · FILTERS: All · Photos · Files (only when both kinds are listed) + today's "From: <who> ▾" (only when a sender is
 *     known; the #1107 sheet, unchanged)
 *   · the list GROUPED BY DAY with each day's size; photos as a 3-column grid of TYPE tiles with a size badge (the real
 *     thumbnail is the pickup — it needs the media handler, Session 16 lever #1); other files as rows with a coloured
 *     type tile + format tag, the name, "from {name} · size · time"
 *   · the per-row chat + trash buttons are gone: actions live in SELECT mode ("Select" / "Cancel" in the bar, or a
 *     long-press / right-click on a file) — check marks, a floating bar with "{n} selected", "Show in chat" (exactly one
 *     file with a known sender) and Delete (confirm, then onDeleteFile per name)
 * Untrusted: a file name and a sender name are PEER-chosen — textContent only, never markup, never a selector.
 */
const DL_LONG_PRESS_MS = 500;
const DL_LEGEND_MAX = 4;          // kinds named in the bar + legend; the rest is "Other"
const DL_SENDERS_BACKSTOP_MS = 12000;   // ★ S20F W-12 (#46 r2 MINOR-3): a phase 2 slower than this is a scan failure in practice
/* the family's name in the legend when its files carry more than one format (one format = the format itself: PDF, ZIP) */
function dlKindLabel(family, strings) {
  switch (family) {
    case 'image': return strings.photos || 'Photos';
    case 'pdf': return 'PDF';                                      // i18n-lint-ok:proper-noun
    case 'doc': return strings.downloadsKindDocs || 'Documents';
    case 'archive': return strings.downloadsKindArchives || 'Archives';
    case 'audio': return strings.downloadsKindAudio || 'Audio';
    case 'video': return strings.downloadsKindVideo || 'Videos';
    case 'code': return strings.downloadsKindCode || 'Code';
    default: return strings.downloadsKindOther || 'Other';
  }
}
/* a calm, stable tone for a photo's type tile (the name picks it — the same file keeps its colour) */
function dlTone(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return String(h % 8);
}
/* ★ S20G R-5 (the Downloads scroll jitter, Android): the list's Intl work, cached at MODULE level — one time-of-day
   formatter per locale + hour cycle (toLocaleTimeString built a formatter per row: the profile's top self time), and the
   size / day labels memoised per value. The key also carries the strings that feed them (Today, Yesterday, the units),
   so a language switch can never read a stale label. timestamp.js's own sizeNumber / dayBucketLabel stay as they are. */
const dlFmt = { key: '', clock: null, size: new Map(), day: new Map() };
function dlFormats(strings) {
  const loc = docLocale() || '';
  const key = [loc, document.documentElement.dataset.hourCycle || '', strings.today, strings.yesterday, strings.unitB, strings.unitKB, strings.unitMB, strings.unitGB].join('|');
  if (dlFmt.key !== key) { dlFmt.key = key; dlFmt.clock = null; dlFmt.size.clear(); dlFmt.day.clear(); }
  return dlFmt;
}
function dlClock(ms, strings) {
  const F = dlFormats(strings);
  if (!F.clock) {
    try { F.clock = new Intl.DateTimeFormat(docLocale(), timeOpts()); }   // = toLocaleTimeString(docLocale(), timeOpts()), built once
    catch (e) { F.clock = { format: (d) => d.toLocaleTimeString(docLocale(), timeOpts()) }; }
  }
  return F.clock.format(new Date(ms));
}
function dlSize(bytes, strings) {
  const F = dlFormats(strings);
  const k = dlBytes(bytes);
  let v = F.size.get(k);
  if (v === undefined) { v = formatFileSize(k, strings); F.size.set(k, v); }
  return v;
}
/* a day group's label — once per GROUP (not per file), memoised per calendar day + today's date (Today / Yesterday move) */
function dlDayLabel(ep, dayKey, now, strings) {
  const F = dlFormats(strings);
  const n = new Date(now);
  const k = dayKey + '@' + n.getFullYear() + '-' + n.getMonth() + '-' + n.getDate();
  let v = F.day.get(k);
  if (v === undefined) { v = dayBucketLabel(ep * 1000, strings, now, strings.today || 'Today'); F.day.set(k, v); }
  return v;
}
const dlEpoch = (time) => { const s = String(time == null ? '' : time).trim(); return (/^\d{1,12}$/.test(s) && Number(s) > 0) ? Number(s) : 0; };
const dlBytes = (size) => { const b = Number(size); return Number.isFinite(b) && b > 0 ? b : 0; };

export function createSettingsDownloads({
  files = [],
  host,
  onBack,
  onOpenFile,                    // (name) — ixian:open:<name>, fire-and-forget
  onDeleteFile,                  // (name, ctrl) — ixian:delete:<name>; C# re-pushes the list
  onClearAll,                    // (ctrl) — ixian:deleted; the host re-asks the list
  onShowInChat,                  // ★★ #1107 (name) — ixian:showDownloadInChat:<name>; only for a file with a known sender
  waiting = false,               // ★ W-12: the list is on its way — no empty state before the first setDownloads
  awaitSenders = false,          // ★ W-12: phase 2 will answer — reserve the From row until it does
  strings = getStrings(),
} = {}) {
  const { el, body, live } = appScreenShell(
    'c-settings-dl', strings.downloads || 'Downloads', onBack);
  let sendersPending = !!awaitSenders;
  let sendersBackstop = 0;
  let senderKey = '';                  // '' = all senders
  let kindFilter = 'all';              // 'all' | 'photo' | 'file'
  let current = [];
  let query = '';
  let selecting = false;
  const sel = new Set();               // selected file NAMES (a name is the list's own key)
  const hostFor = () => host || el.closest('.demo-phone') || undefined;
  const canSelect = !!(onDeleteFile || onShowInChat);

  /* —— the bar's Select / Cancel (a plain accent text button, render "tbtn") —— */
  const bar = el.querySelector('.c-topbar');
  const selBtn = document.createElement('button');
  selBtn.type = 'button';
  selBtn.className = 'c-settings-dl__selbtn';
  selBtn.addEventListener('click', () => setSelecting(!selecting));
  if (bar && canSelect) {
    const acts = document.createElement('div');
    acts.className = 'c-topbar__actions';   // the bar's trailing-action slot (topbar.js grammar)
    acts.append(selBtn);
    bar.append(acts);
  }

  /* search — frontend name filter (#67 chat-list precedent, no bridge) */
  const search = createSearchField({
    placeholder: strings.searchDownloads || 'Search files',
    ariaLabel: strings.searchDownloads || 'Search files',
    strings,
    onInput: (v) => { query = v.trim().toLowerCase(); paintList(); },
  });
  const searchWrap = document.createElement('div');
  searchWrap.className = 'c-settings-dl__search';
  searchWrap.append(search);
  body.append(searchWrap);

  /* —— the summary card —— */
  const sum = document.createElement('section');
  sum.className = 'c-settings-dl__sum';
  const sumTop = document.createElement('div');
  sumTop.className = 'c-settings-dl__sum-top';
  const countEl = document.createElement('span');
  countEl.className = 'c-settings-dl__count';
  const totalEl = document.createElement('span');
  totalEl.className = 'c-settings-dl__total';
  sumTop.append(countEl, totalEl);
  const barEl = document.createElement('div');
  barEl.className = 'c-settings-dl__bar';
  barEl.setAttribute('aria-hidden', 'true');   // the legend below says the same in words
  const legend = document.createElement('div');
  legend.className = 'c-settings-dl__legend';
  sum.append(sumTop, barEl, legend);
  if (onClearAll) {
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'c-settings-dl__clear';   // the ONE error-hue destructive action on this surface (#147⑤ reservation)
    clear.textContent = strings.clearDownloads || 'Delete all downloads';
    clear.addEventListener('click', () => settingsConfirm({
      title: strings.clearDownloadsTitle || 'Delete all downloads?',
      bodyText: strings.deleteDownloadsBody || 'Received files are removed from this device. Senders keep theirs.',
      confirmLabel: strings.deleteConfirm || 'Delete',
      host: hostFor(), strings,
      run: (ctrl) => onClearAll(ctrl),     // sync throw handled inside settingsConfirm
    }));
    sum.append(clear);
  }
  body.append(sum);
  let barGrown = false;                  // the bar grows in ONCE per screen, never on a re-push
  function paintSummary() {
    const n = current.length;
    countEl.textContent = n === 1 ? (strings.downloadsCountOne || '1 file')
      : (strings.downloadsCount || '{n} files').split('{n}').join(String(n));
    const total = current.reduce((a, f) => a + dlBytes(f.size), 0);
    const tsz = formatFileSize(total);
    totalEl.textContent = tsz ? '· ' + tsz : '';
    /* by kind: the family, labelled by its one format (PDF, ZIP) or by the family's name when it mixes formats */
    const by = new Map();
    for (const f of current) {
      const { family, label } = fileKind(f.name);
      const k = by.get(family) || { family, bytes: 0, labels: new Set() };
      k.bytes += dlBytes(f.size);
      k.labels.add(label || '');
      by.set(family, k);
    }
    let kinds = [...by.values()].filter((k) => k.bytes > 0).sort((a, b) => (b.family === 'image') - (a.family === 'image') || b.bytes - a.bytes);   // photos first (the render), then by size
    if (kinds.length > DL_LEGEND_MAX) {
      const rest = kinds.slice(DL_LEGEND_MAX - 1);
      kinds = kinds.slice(0, DL_LEGEND_MAX - 1).concat([{ family: 'other', bytes: rest.reduce((a, k) => a + k.bytes, 0), labels: new Set(['', '?']) }]);
    }
    const segs = [];
    const items = [];
    kinds.forEach((k, i) => {
      const seg = document.createElement('i');
      seg.dataset.kind = k.family;
      seg.style.flexGrow = String(k.bytes);
      if (!barGrown) seg.style.animationDelay = (i * 0.12) + 's';
      segs.push(seg);
      const one = k.labels.size === 1 ? [...k.labels][0] : '';
      const lab = (k.family === 'image' || !one) ? dlKindLabel(k.family, strings) : one;
      const it = document.createElement('span');
      it.dataset.kind = k.family;
      it.textContent = lab + ' · ' + formatFileSize(k.bytes);
      items.push(it);
    });
    barEl.replaceChildren(...segs);
    barEl.hidden = segs.length === 0;   // an old exe pushes no sizes: no bar, no legend — the count stays
    legend.replaceChildren(...items);
    legend.hidden = items.length === 0;
    if (segs.length) { if (barGrown) barEl.dataset.grown = ''; barGrown = true; }   // a re-push never replays the growth
  }

  /* —— filters: All · Photos · Files + the From chip (#1107 sheet) —— */
  const controls = document.createElement('div');
  controls.className = 'c-settings-dl__controls';
  const kindWrap = document.createElement('div');
  kindWrap.className = 'c-settings-dl__kinds';
  const kindChips = [['all', strings.all || 'All'], ['photo', strings.photos || 'Photos'], ['file', strings.sharedFiles || 'Files']].map(([id, lab]) => {
    const c = document.createElement('button');
    c.type = 'button';
    c.className = 'c-settings-dl__chip';
    c.dataset.kind = id;
    c.textContent = lab;
    c.addEventListener('click', () => { kindFilter = id; paintList(); });
    kindWrap.append(c);
    return [id, c];
  });
  let senders = new Map();             // key → label, from the current list
  let avatars = new Map();             // ★ S10 F7: key → data:image URI (setDownloadsAvatars; validated by the shell)
  const fromChip = document.createElement('button');
  fromChip.type = 'button';
  fromChip.className = 'c-settings-dl__chip c-settings-dl__from-btn';
  fromChip.setAttribute('aria-haspopup', 'dialog');
  const fromLab = document.createElement('span');
  fromLab.className = 'c-settings-dl__from-label';
  fromChip.append(fromLab, icon('chevron-down', { size: 16 }));
  fromChip.addEventListener('click', () => openSenderSheet());
  controls.append(kindWrap, fromChip);
  body.append(controls);
  const fromLabel = () => (strings.downloadsFromChip || 'From: {name}').split('{name}').join(
    senderKey ? (senders.get(senderKey) || '') : (strings.downloadsAllSenders || 'Everyone'));
  function paintFromChip() {
    fromLab.textContent = fromLabel();
    fromChip.title = fromLab.textContent;   // ★ S18 D1 (DL-SCREEN): the label ellipsizes; the FULL "From: <name>" stays in the tooltip + the name (the text content)
    if (senderKey) fromChip.dataset.active = ''; else delete fromChip.dataset.active;
  }
  /* ★ S10 F7 (#1254, Damir pick C): each sheet row = a 40 px avatar + "{n} files · last {when}" — counted from the
     whole list (`current`). {when} = the sender's newest epoch time; an old exe's opaque time gives no "last" part. */
  const filesLabel = (n) => (n === 1 ? (strings.downloadsSenderFilesOne || '1 file')
    : (strings.downloadsSenderFiles || '{n} files').split('{n}').join(String(n)));
  function senderStats() {
    const stats = new Map();
    for (const f of current) {
      if (!f.senderKey) continue;
      const st = stats.get(f.senderKey) || { n: 0, newest: 0 };
      st.n++;
      const t = dlEpoch(f.time);
      if (t > st.newest) st.newest = t;
      stats.set(f.senderKey, st);
    }
    return stats;
  }
  function openSenderSheet() {
    const stats = senderStats();
    const everyone = document.createElement('span');
    everyone.className = 'c-settings__opt-glyph';
    everyone.append(icon('users', { size: 20 }));
    const options = [{ value: '', label: strings.downloadsAllSenders || 'Everyone', avatar: everyone, sub: filesLabel(current.length) }]
      .concat([...senders.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([k, l]) => {
        const st = stats.get(k) || { n: 0, newest: 0 };
        let sub = filesLabel(st.n);
        if (st.newest > 0) {
          sub += ' · ' + (strings.downloadsSenderLast || 'last {when}').split('{when}').join(formatTxTimestamp(st.newest * 1000));
        }
        return { value: k, label: l, sub, avatar: createAvatar({ src: avatars.get(k) || null, name: l, address: k, size: 40 }) };
      }));
    const sheet = settingsOptionSheet({
      title: strings.downloadsFilterSender || 'From',
      options, current: senderKey, host: hostFor(), strings,
      commit: (value, ctrl) => { senderKey = value; paintFromChip(); paintList(); ctrl.done(); },
    });
    const list = sheet && sheet.querySelector('.c-settings__opts');
    if (list && options.length > SENDER_SEARCH_MIN) {
      const f = createSearchField({
        placeholder: strings.downloadsSearchSenders || 'Search people',
        ariaLabel: strings.downloadsSearchSenders || 'Search people',
        strings,
        onInput: (v) => {
          const q = v.trim().toLowerCase();
          for (const o of list.querySelectorAll('.c-settings__opt')) {
            const t = (o.querySelector('.c-settings__opt-label') || {}).textContent || '';
            o.hidden = !!q && !t.toLowerCase().includes(q);
          }
        },
      });
      f.classList.add('c-settings-dl__sender-search');
      list.parentNode.insertBefore(f, list);
    }
  }

  /* —— the list (day groups) —— */
  const listEl = document.createElement('div');
  listEl.className = 'c-settings-dl__list';
  body.append(listEl);

  /* empty state — also what a clearFiles push renders */
  const empty = document.createElement('div');
  empty.className = 'c-settings-dl__empty';
  const emptyDisc = document.createElement('span');
  emptyDisc.className = 'c-disc';
  emptyDisc.dataset.hue = 'info';
  emptyDisc.dataset.grad = String(discGrad('download'));
  emptyDisc.append(icon('download', { size: 16 }));
  const emptyText = document.createElement('p');
  emptyText.className = 'c-settings__note';
  emptyText.textContent = strings.downloadsEmpty || 'Files you receive in chats appear here.';
  empty.append(emptyDisc, emptyText);
  body.append(empty);

  /* no-matches note (a search or a filter left nothing) */
  const noMatch = document.createElement('p');
  noMatch.className = 'c-settings__note c-settings-dl__nomatch';
  noMatch.textContent = strings.downloadsNoMatch || 'No files match your search.';
  noMatch.hidden = true;
  body.append(noMatch);

  /* —— select mode: the floating bar —— */
  const selbar = document.createElement('div');
  selbar.className = 'c-settings-dl__selbar';
  const selN = document.createElement('b');
  selN.className = 'c-settings-dl__selcount';
  const goBtn = document.createElement('button');
  goBtn.type = 'button';
  goBtn.className = 'c-settings-dl__go';
  goBtn.append(icon('message', { size: 18 }));
  const goLab = document.createElement('span');
  goLab.textContent = strings.showInChat || 'Show in chat';
  goBtn.append(goLab);
  goBtn.addEventListener('click', () => {
    const name = [...sel][0];
    const f = current.find((x) => x.name === name);
    if (sel.size !== 1 || !f || !f.senderKey || !onShowInChat) return;
    setSelecting(false);
    onShowInChat(name);
  });
  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'c-settings-dl__del';
  delBtn.append(icon('trash', { size: 18 }));
  const delLab = document.createElement('span');
  delLab.textContent = strings.delete || 'Delete';
  delBtn.append(delLab);
  delBtn.addEventListener('click', () => {
    const names = [...sel];
    if (!names.length || !onDeleteFile) return;
    const one = names.length === 1;
    settingsConfirm({
      title: one ? (strings.deleteFileTitle || 'Delete this file?')
        : (strings.deleteFilesTitle || 'Delete {n} files?').split('{n}').join(String(names.length)),
      bodyText: one ? (strings.deleteFileBody || '“{name}” is removed from this device.').split('{name}').join(names[0])
        : (strings.deleteFilesBody || 'The files are removed from this device. Senders keep theirs.'),
      confirmLabel: strings.deleteConfirm || 'Delete',
      host: hostFor(), strings,
      run: (ctrl) => {
        /* one verb per file (the frozen ixian:delete…:<name>); the confirm closes once every file answered */
        let left = names.length;
        const sub = { done: () => { if (--left === 0) { setSelecting(false); ctrl.done(); } }, fail: (m) => ctrl.fail(m) };
        for (const n of names) onDeleteFile(n, sub);
      },
    });
  });
  if (onShowInChat) selbar.append(selN, goBtn); else selbar.append(selN);
  if (onDeleteFile) selbar.append(delBtn);
  if (canSelect) el.append(selbar);

  /* select mode repaints the marks in place — never the list, so a long-press never pulls the row from under the finger */
  function paintMarks() {
    for (const b of listEl.querySelectorAll('.c-settings-dl__open')) {
      const row = b.closest('.c-settings-dl__row');
      markSelected(b, row ? row.dataset.name : '');
    }
    paintSelbar();
  }
  function setSelecting(on) {
    selecting = !!on && current.length > 0;
    if (!selecting) sel.clear();
    paintMarks();
  }
  function toggle(name) {
    if (!selecting) selecting = true;
    if (sel.has(name)) sel.delete(name); else sel.add(name);
    paintMarks();
  }
  function paintSelbar() {
    if (selecting) el.dataset.selecting = ''; else delete el.dataset.selecting;
    selBtn.textContent = selecting ? (strings.cancel || 'Cancel') : (strings.select || 'Select');
    selBtn.hidden = current.length === 0;
    selN.textContent = (strings.selectedCount || '{n} selected').split('{n}').join(String(sel.size));
    const on = selecting && sel.size > 0;
    if (on) selbar.dataset.on = ''; else delete selbar.dataset.on;
    selbar.setAttribute('aria-hidden', on ? 'false' : 'true');
    for (const b of selbar.querySelectorAll('button')) b.tabIndex = on ? 0 : -1;
    const only = sel.size === 1 ? current.find((x) => x.name === [...sel][0]) : null;
    goBtn.hidden = !(only && only.senderKey);
    if (only) goBtn.setAttribute('aria-label', (strings.downloadsShowInChat || 'Show {name} in chat').split('{name}').join(only.name));
    else goBtn.removeAttribute('aria-label');
  }

  /* a tap opens (or, in select mode, toggles); a long-press or a right-click selects */
  let firedAt = 0;                       // the last long-press (screen-wide: its release must not count as a tap)
  function wirePress(btn, name) {
    let timer = 0, x0 = 0, y0 = 0;
    const clear = () => { if (timer) { clearTimeout(timer); timer = 0; } };
    btn.addEventListener('pointerdown', (e) => {
      if (!canSelect || (e.pointerType === 'mouse' && e.button !== 0)) return;
      x0 = e.clientX; y0 = e.clientY;
      clear();
      timer = setTimeout(() => { timer = 0; firedAt = Date.now(); toggle(name); }, DL_LONG_PRESS_MS);
    });
    btn.addEventListener('pointermove', (e) => { if (timer && (Math.abs(e.clientX - x0) > 10 || Math.abs(e.clientY - y0) > 10)) clear(); });
    for (const t of ['pointerup', 'pointercancel', 'pointerleave']) btn.addEventListener(t, clear);
    btn.addEventListener('contextmenu', (e) => {
      if (!canSelect) return;
      e.preventDefault();                                       // no callout / menu over a file
      if (Date.now() - firedAt < 900) return;                  // the long-press already took it (Android sends both)
      toggle(name);
    });
    btn.addEventListener('click', (e) => {
      if (Date.now() - firedAt < 900) { e.preventDefault(); return; }   // the release after a long-press is not a tap
      if (selecting) { toggle(name); return; }
      if (onOpenFile) onOpenFile(name);
    });
  }
  function check() {
    const ck = document.createElement('span');
    ck.className = 'c-settings-dl__ck';
    ck.setAttribute('aria-hidden', 'true');
    ck.append(icon('check', { size: 14 }));
    return ck;
  }
  function markSelected(btn, name) {
    if (selecting) btn.setAttribute('aria-pressed', sel.has(name) ? 'true' : 'false');
    else btn.removeAttribute('aria-pressed');
  }

  /* a photo: a cell of the 3-column grid — the type tile at cell size (the thumbnail is the pickup) + a size badge */
  function photoCell(f) {
    const row = document.createElement('div');
    row.className = 'c-settings-dl__row c-settings-dl__row--th';
    row.dataset.name = f.name;
    if (f.senderKey) row.dataset.sender = f.senderKey;   // ★★ #1107: the From filter's key
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-settings-dl__open c-settings-dl__th';
    const sz = dlSize(f.size, strings);
    b.setAttribute('aria-label', sz ? f.name + ', ' + sz : f.name);   // peer-chosen — an attribute VALUE, never markup
    /* the picture layer (a tone + the photo glyph today; the thumbnail later) — it shrinks into the cell when picked */
    const img = document.createElement('span');
    img.className = 'c-settings-dl__th-img';
    img.dataset.tone = dlTone(f.name);
    img.setAttribute('aria-hidden', 'true');
    const glyph = icon('photo', { size: 30 });
    glyph.classList.add('c-settings-dl__th-glyph');
    img.append(glyph);
    b.append(img, check());
    const lab = fileKind(f.name).label;
    if (lab) {
      const tag = document.createElement('span');
      tag.className = 'c-settings-dl__th-tag';
      tag.setAttribute('aria-hidden', 'true');
      tag.textContent = lab;
      b.append(tag);
    }
    if (sz) {
      const s = document.createElement('span');
      s.className = 'c-settings-dl__sz';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = sz;
      b.append(s);
    }
    markSelected(b, f.name);
    wirePress(b, f.name);
    row.append(b);
    return row;
  }
  /* any other file: a row — the coloured type tile + its format tag, the name, "from {name} · size · time" */
  function fileRow(f, timeOfDay) {
    const row = document.createElement('div');
    row.className = 'c-settings-dl__row';
    row.dataset.name = f.name;
    if (f.senderKey) row.dataset.sender = f.senderKey;
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'c-settings-dl__open';
    const tile = createKindTile(f.name);   // ★ S20G Q-1: the shared type tile (file-tile.js); (#46 r1 B-1) aria-hidden decoration
    const meta = document.createElement('span');
    meta.className = 'c-settings-dl__meta';
    const nm = document.createElement('span');
    nm.className = 'c-settings-dl__name c-file-name';   // ★ S20G Q-1: the shared name type (file-tile.css)
    fillFileName(nm, f.name);              // UNTRUSTED — textContent only (★ #1005: keeps the extension)
    meta.append(nm);
    row._dlParts = rowParts(f, timeOfDay);   // ★ S20G R-5: kept on the row — a phase-2 patch re-derives it (B-6) and rewrites only what changed
    fillTimeLine(row, meta, f.sender || '');
    open.append(check(), tile, meta);
    markSelected(open, f.name);
    wirePress(open, f.name);
    row.append(open);
    return row;
  }

  /* the "size · time" part of a row's line (cached formatters) — the build and the phase-2 patch both read it (★ S20G B-6) */
  function rowParts(f, timeOfDay) {
    const parts = [];
    const sz = dlSize(f.size, strings);
    if (sz) parts.push(sz);
    const ep = dlEpoch(f.time);
    if (ep) {
      parts.push(timeOfDay ? dlClock(ep * 1000, strings) : formatTxTimestamp(ep * 1000));
    } else if (f.time) {
      parts.push(String(f.time));          // an old exe's opaque locale string — never parsed
    }
    return parts.join(' · ');
  }
  /* the "from {name} · size · time" line — built with the row, and PATCHED in place by phase 2 (★ S20G R-5) */
  function fillTimeLine(row, meta, sender) {
    row._dlSender = sender;
    let tm = meta.querySelector(':scope > .c-settings-dl__time');
    if (!sender && !row._dlParts) { if (tm) tm.remove(); return; }
    if (!tm) { tm = document.createElement('span'); tm.className = 'c-settings-dl__time c-file-meta'; meta.append(tm); }   // ★ S20G Q-1: the shared meta type
    tm.textContent = '';
    if (sender) {
      const from = document.createElement('span');
      from.className = 'c-settings-dl__from';
      from.textContent = (strings.downloadsFrom || 'from {name}').split('{name}').join(sender);   // peer-chosen name — textContent only
      tm.append(from);
    }
    if (row._dlParts) tm.append(document.createTextNode((sender ? ' · ' : '') + row._dlParts));
  }

  const isPhoto = (f) => fileKind(f.name).family === 'image';
  /* the controls row: the kind chips (a mixed list) + the From chip (reserved until phase 2 — W-12) */
  let fromKept = false;                  // ★ S20G R-5: this screen laid the From row out — it is never collapsed under the list
  function paintControls() {
    const hasPhoto = current.some(isPhoto);
    const hasFile = current.some((f) => !isPhoto(f));
    const mixed = hasPhoto && hasFile;
    if (!mixed) kindFilter = 'all';        // a filter on a kind no longer listed is cleared — its chips hide with it
    kindWrap.hidden = !mixed;
    const pending = sendersPending && senders.size === 0 && current.length > 0;   // ★ W-12: the row phase 2 fills
    if (pending && !sendersBackstop) sendersBackstop = setTimeout(() => { sendersPending = false; fromKept = false; if (el.isConnected) paintList(); }, DL_SENDERS_BACKSTOP_MS);
    if (pending) fromKept = true;
    /* ★ S20G R-5 (was #46 r1 C-3, "the one remaining move"): phase 2 naming NO sender keeps the reserved row (laid out,
       invisible, inert) — the list under it never jumps 52 px up. The backstop (C-4) still releases it. */
    const reserve = (pending || fromKept) && senders.size === 0 && current.length > 0;
    controls.hidden = !mixed && senders.size === 0 && !reserve;
    fromChip.hidden = senders.size === 0 && !reserve;
    if (reserve) { fromChip.dataset.reserved = ''; fromChip.disabled = true; fromChip.setAttribute('aria-hidden', 'true'); }
    else if ('reserved' in fromChip.dataset) { delete fromChip.dataset.reserved; fromChip.disabled = false; fromChip.removeAttribute('aria-hidden'); }
    for (const [id, c] of kindChips) c.setAttribute('aria-pressed', String(id === kindFilter));
  }
  function paintList() {
    for (const n of [...sel]) if (!current.some((f) => f.name === n)) sel.delete(n);   // a re-push drops what went
    if (selecting && current.length === 0) selecting = false;
    paintControls();

    /* newest first (stable: an old exe's opaque time sorts as 0 and keeps C#'s order) */
    const shown = current.slice().sort((a, b) => dlEpoch(b.time) - dlEpoch(a.time)).filter((f) =>
      (!query || f.name.toLowerCase().includes(query))
      && (!senderKey || f.senderKey === senderKey)                                       // ★★ #1107
      && (kindFilter === 'all' || (kindFilter === 'photo' ? isPhoto(f) : !isPhoto(f))));
    /* day groups, in list order; a file without an epoch time joins one group with no day label */
    const now = Date.now();
    const groups = [];
    const byKey = new Map();
    for (const f of shown) {
      const ep = dlEpoch(f.time);
      let key = '~';
      if (ep) { const d = new Date(ep * 1000); key = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
      let g = byKey.get(key);
      if (!g) { g = { ep, key, label: ep ? dlDayLabel(ep, key, now, strings) : '', files: [] }; byKey.set(key, g); groups.push(g); }   // ★ S20G R-5: the label once per group
      g.files.push(f);
    }
    const out = [];
    for (const g of groups) {
      const sec = document.createElement('section');
      sec.className = 'c-settings-dl__group';
      const h = document.createElement('h3');
      h.className = 'c-settings-dl__day';
      const hl = document.createElement('span');
      hl.className = 'c-settings-dl__day-label';
      hl.textContent = g.label;
      sec._dlTod = !!g.label;              // ★ S20G B-6: the patch path re-labels the group (Today → Yesterday) + re-clocks its rows
      if (g.ep) { sec._dlEp = g.ep; sec._dlKey = g.key; }
      const hs = document.createElement('span');
      hs.className = 'c-settings-dl__day-size';
      hs.textContent = dlSize(g.files.reduce((a, f) => a + dlBytes(f.size), 0), strings);
      h.append(hl, hs);
      if (g.label || hs.textContent) sec.append(h);
      const ph = g.files.filter(isPhoto);
      const fl = g.files.filter((f) => !isPhoto(f));
      if (ph.length) {
        const grid = document.createElement('div');
        grid.className = 'c-settings-dl__grid';
        grid.append(...ph.map(photoCell));
        sec.append(grid);
      }
      if (fl.length) {
        const box = document.createElement('div');
        box.className = 'c-settings-dl__files';
        box.append(...fl.map((f) => fileRow(f, !!g.label)));
        sec.append(box);
      }
      out.push(sec);
    }
    listEl.replaceChildren(...out);
    const has = current.length > 0;
    listEl.hidden = !has;
    noMatch.hidden = !(has && shown.length === 0);
    live.textContent = (query || senderKey || kindFilter !== 'all')
      ? (strings.downloadsMatches || '{n} files match').split('{n}').join(String(shown.length))
      : '';
    paintSelbar();
  }

  function renderSenders(list) {
    senders = new Map();
    for (const f of list) if (f.senderKey && f.sender && !senders.has(f.senderKey)) senders.set(f.senderKey, f.sender);
    if (senderKey && !senders.has(senderKey)) senderKey = '';   // (#46 r2 R2-1) a filter on a sender no longer listed is cleared
    paintFromChip();
  }

  /* ★ S20G R-5: phase 2 (setDownloadSenders) re-pushes the SAME files with senders added. It used to rebuild the whole
     list (60 rows, every Intl call again: 120–430 ms at CPU × 4, landing mid-scroll). Now a push whose row set is
     unchanged (name · time · size, in order) and no From filter in force PATCHES the rows in place — each row's sender key
     and its "from" line, only where they changed — and repaints the controls row; a full paint only when the row set
     changes (or a From filter makes the shown set depend on the senders). */
  let rowSig = null;
  const sigOf = (list) => list.map((f) => f.name + '\u0000' + f.time + '\u0000' + f.size).join('\u0001');
  /* ★ S20G B-6 (#46 r1): the patch also re-derives each group's day label and each row's clock / date text from the
     cached formatters (a Map hit each) and writes only what changed — a same-rows re-push after midnight (Today →
     Yesterday) or an hour-cycle / language change is never left stale. */
  function patchSenders() {
    const by = new Map(current.map((f) => [f.name, f]));
    const now = Date.now();
    for (const sec of listEl.children) {
      if (!sec._dlEp) continue;
      const hl = sec.querySelector(':scope > .c-settings-dl__day > .c-settings-dl__day-label');
      const lab = dlDayLabel(sec._dlEp, sec._dlKey, now, strings);
      if (hl && hl.textContent !== lab) hl.textContent = lab;
    }
    for (const row of listEl.querySelectorAll('.c-settings-dl__row')) {
      const f = by.get(row.dataset.name);
      if (!f) continue;
      if (f.senderKey) { if (row.dataset.sender !== f.senderKey) row.dataset.sender = f.senderKey; }
      else if ('sender' in row.dataset) delete row.dataset.sender;
      const meta = row.querySelector('.c-settings-dl__meta');
      if (!meta) continue;                 // a photo cell: no time line (its size is in the row signature)
      const sec = row.closest('.c-settings-dl__group');
      const parts = rowParts(f, !!(sec && sec._dlTod));
      if (row._dlSender !== (f.sender || '') || row._dlParts !== parts) { row._dlParts = parts; fillTimeLine(row, meta, f.sender || ''); }
    }
  }
  function render(list, opts) {
    if (opts && opts.sendersKnown) { sendersPending = false; clearTimeout(sendersBackstop); }
    current = (list || []).map((f) => Object.assign({}, f, { name: String(f && f.name != null ? f.name : '') }));
    const was = senderKey;
    renderSenders(current);
    const sig = sigOf(current);
    const has = current.length > 0;
    sum.hidden = !has;
    empty.hidden = has || waitingFirst;
    waitingFirst = false;
    searchWrap.hidden = current.length < SEARCH_MIN;
    if (sig === rowSig && !was && !senderKey) {   // the same rows, no From filter: patch, never rebuild
      paintControls();
      patchSenders();
      paintSelbar();
      return;
    }
    rowSig = sig;
    paintSummary();
    paintList();
  }
  let waitingFirst = !!waiting;            // ★ W-12: the build paint is not the list's answer
  render(files);

  el._dlRender = render;                   // setDownloads hook
  /* ★ S10 F7: the avatars arrive in their own push right after the senders; they are read when the sheet opens. A
     value that is not a local data:image URI is dropped here too (safeImageSrc without allowRemote). */
  el._dlAvatars = (entries) => {
    avatars = new Map();
    for (const [k, v] of entries || []) {
      const src = safeImageSrc(v);
      if (typeof k === 'string' && src) avatars.set(k, src);
    }
  };
  return el;
}

/** ★ S10 F7 (#1254): the From sheet's avatars — entries = [[senderKey, dataUri], …] (the shell validated them). */
export function setDownloadsAvatars(el, entries = []) {
  if (el && el._dlAvatars) el._dlAvatars(entries);
}

/** Wholesale list update — mirrors the clearFiles + addFile(name, ctime[, size]) push. */
export function setDownloads(el, files = [], opts) {
  if (el._dlRender) el._dlRender(files, opts);
}

/**
 * Developer — createSettingsDev({ log, onBack, onSendLog, strings }).
 * Read-only log viewer + Copy + Send (Damir). The log lands as ONE text node
 * (unbounded legacy dumps — no per-line DOM).
 * Send log is §9-GATED by callback presence: NO bridge command exists — the
 * proposal is C# opening the OS email/share sheet with ixian.log attached
 * (target e.g. info@ixian.io; spec §9b ask ⑦). A mailto: fallback is NOT
 * honest here — the log dwarfs URL limits.
 * Free fn: setDevLog(el, text) — idempotent (the push may arrive twice).
 */
export function createSettingsDev({
  log = '',
  onBack,
  onSendLog,                     // (ctrl) — §9: OS email/share with the log attached
  strings = getStrings(),
} = {}) {
  const { el, body, live } = appScreenShell(
    'c-settings-dev', strings.developer || 'Developer', onBack);

  const note = document.createElement('p');
  note.className = 'c-settings__note';
  note.textContent = strings.devNote || 'The Spixi log on this device. Read-only.';
  body.append(note);

  const pane = document.createElement('pre');
  pane.className = 'c-settings-dev__log u-scroll';
  pane.setAttribute('tabindex', '0');      // keyboard-scrollable region
  pane.setAttribute('aria-label', strings.devLog || 'Application log');
  body.append(pane);

  const waiting = document.createElement('p');
  waiting.className = 'c-settings__note c-settings-dev__waiting';
  waiting.textContent = strings.devWaiting || 'Waiting for the log…';
  body.append(waiting);

  const actions = document.createElement('div');
  actions.className = 'c-settings-dev__actions';

  const copyBtn = createButton({
    label: strings.copyLog || 'Copy log', type: 'outline', size: 44,
    icon: icon('copy', { size: 18 }),
    onClick: () => {
      const text = pane.textContent;
      if (!text) return;
      // fail-soft: clipboard can be absent/denied in the WebView (address-copy grammar)
      copyText(text).then((copied) => {   // ★ #993: + the file:// fallback
        if (copied) setSuccess(copyBtn, { label: strings.copied || 'Copied' });
        else live.textContent = strings.copyLogFailed || 'Couldn’t copy. Select the log text instead.';
      });
    },
  });
  copyBtn.classList.add('c-settings-dev__copy');
  actions.append(copyBtn);

  /* Send log (Damir) — wallet-export grammar: latched, loading, success morph,
     sync throw → fail path (#141-m4). The share itself is C#'s (§9b ask ⑦). */
  if (onSendLog) {
    let sending = false;                   // latched (one share at a time)
    const sendBtn = createButton({
      label: strings.sendLog || 'Send log', type: 'outline', size: 44,
      icon: icon('share-3', { size: 18 }),
      onClick: () => {
        if (sending || !pane.textContent) return;
        sending = true;
        setLoading(sendBtn, true);
        const ctrl = appCtrl(
          () => {
            sending = false;
            setLoading(sendBtn, false);
            setSuccess(sendBtn, { label: strings.sent || 'Sent' });
          },
          (msg) => {
            sending = false;
            setLoading(sendBtn, false);
            live.textContent = msg || strings.sendLogFailed || 'Couldn’t send the log.';
          },
        );
        try {
          onSendLog(ctrl);
        } catch (ex) {
          ctrl.fail();                     // sync throw → unlatch + clear spinner (#141-m4)
        }
      },
    });
    sendBtn.classList.add('c-settings-dev__send');
    actions.append(sendBtn);
  }
  body.append(actions);

  const apply = (text) => {
    pane.textContent = text || '';         // UNTRUSTED — textContent only
    const has = !!text;
    pane.hidden = !has;
    waiting.hidden = has;
    actions.hidden = !has;
    if (has) pane.scrollTop = pane.scrollHeight;   // newest entries at the end
  };
  apply(log);

  el._devApply = apply;                    // setDevLog hook
  return el;
}

/** Idempotent whole-log replace — the legacy setLog(text) mirror. */
export function setDevLog(el, text) {
  if (el._devApply) el._devApply(text);
}

/**
 * Contributors — createSettingsContributors({ contributors, credits, onBack, strings }).
 * ★ S17 E (#1336, downloads-contributors-render.html, LOCKED): the thank-you screen —
 *   · a warm FULL-BLEED header (the About band's grammar in a violet → pink key, --dc-a/b/c): a glass heart with the
 *     heart-handshake glyph etched, coloured bokeh, twinkles, a slow float (illoContribHeart, two decorative layers);
 *     the top bar floats over it with white ink and turns solid once the header has scrolled under it (About's rule)
 *   · "Thank you" + contributorsLead
 *   · each name a chip with a coloured initial disc; the chips pop in one by one; a tap bounces the chip and throws
 *     eight small sparkles (decoration — reduced motion: none)
 *   · the credits: one row per credit — a type tile, the label, the FULL source text (CC-BY asks for the attribution and
 *     the licence link on the shipped artifact: never shortened), a licence pill. No external-link mark: no verb opens
 *     a link from here (the About ruling), so the source stays selectable text.
 */
const CONTRIB_SPARKS = 8;
const CREDIT_GLYPH = { creditSounds: 'volume', creditIcons: 'icons', creditFlags: 'flag' };
export function createSettingsContributors({
  contributors = CONTRIBUTORS,
  credits = ASSET_CREDITS,        // ★ #502 — overridable, same shape as contributors
  onHeader,                       // ★ S17 (#1339): OPTIONAL (over) — as About's: the header under the status bar, or not
  onBack,
  strings = getStrings(),
} = {}) {
  const { el, body } = appScreenShell(
    'c-settings-contrib', strings.contributors || 'Contributors', onBack);
  el.classList.add('c-settings-contrib--hdr');
  const bar = el.querySelector('.c-topbar');
  const solidAt = () => Math.max(0, (body.firstElementChild ? body.firstElementChild.offsetHeight : 0) * 0.55);
  let overHdr = null;
  body.addEventListener('scroll', () => {
    const solid = body.scrollTop > solidAt();
    if (bar) bar.toggleAttribute('data-solid', solid);
    if (onHeader && overHdr !== !solid) { overHdr = !solid; try { onHeader(overHdr); } catch (e) { /* presentation only */ } }
  }, { passive: true });
  if (onHeader) { overHdr = true; try { onHeader(true); } catch (e) { /* presentation only */ } }

  /* the header — decoration (aria-hidden); "Thank you" below is the heading */
  const band = document.createElement('div');
  band.className = 'c-settings-contrib__band';
  band.setAttribute('aria-hidden', 'true');
  const art = illoContribHeart();
  band.append(art.bg, art.fg);
  body.append(band);

  const lead = document.createElement('div');
  lead.className = 'c-settings-contrib__head';
  const thanks = document.createElement('h2');
  thanks.className = 'c-settings-contrib__thanks';
  thanks.textContent = strings.thanks || 'Thank you';
  const p = document.createElement('p');
  p.className = 'c-settings-contrib__lead';
  p.textContent = strings.contributorsLead ||
    'Spixi is better because these people cared. Special thanks to:';
  lead.append(thanks, p);
  body.append(lead);

  const reduce = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const card = document.createElement('div');
  card.className = 'c-settings-contrib__card';
  const list = document.createElement('ul');
  list.className = 'c-settings-contrib__list';
  contributors.forEach((name, k) => {
    const li = document.createElement('li');
    li.className = 'c-settings-contrib__chip';
    li.style.setProperty('--d', (0.25 + Math.min(k, 12) * 0.05).toFixed(2) + 's');   // the pop-in, one by one (≤ .85 s)
    const disc = document.createElement('i');
    disc.className = 'c-settings-contrib__initial';
    disc.dataset.tone = String(k % 6);
    disc.setAttribute('aria-hidden', 'true');
    const letter = [...String(name).replace(/[^\p{L}\p{N}]/gu, '')][0] || [...String(name)][0] || '?';   // a code point, never half a pair
    disc.textContent = letter.toLocaleUpperCase();
    const nm = document.createElement('span');
    nm.className = 'c-settings-contrib__name';
    nm.textContent = name;
    li.append(disc, nm);
    /* a tap: the chip bounces and throws sparkles — pure decoration, no verb */
    li.addEventListener('click', () => {
      li.classList.remove('is-burst');
      void li.offsetWidth;                 // restart the bounce
      li.classList.add('is-burst');
      if (reduce()) return;
      for (let i = 0; i < CONTRIB_SPARKS; i++) {
        const s = document.createElement('span');
        s.className = 'c-settings-contrib__spark';
        s.dataset.tone = String(i % 4);
        s.setAttribute('aria-hidden', 'true');
        const an = i / CONTRIB_SPARKS * Math.PI * 2;
        s.style.setProperty('--x', (Math.cos(an) * 34).toFixed(1) + 'px');
        s.style.setProperty('--y', (Math.sin(an) * 24).toFixed(1) + 'px');
        s.addEventListener('animationend', () => s.remove());
        setTimeout(() => s.remove(), 900);   // backstop: no animation (jsdom, a hidden pane) never piles them up
        li.append(s);
      }
    });
    list.append(li);
  });
  card.append(list);
  body.append(card);

  /* ★ #502: the asset credits, under their own heading and their own card. */
  if (credits.length) {
    const h = document.createElement('h3');
    h.className = 'c-settings__label c-settings-contrib__credits-title';   // ★ #1040: the hub's section-label grammar ("Preferences"), not a centred note
    h.textContent = strings.creditsTitle || 'Credits';
    body.append(h);
    const creditsCard = document.createElement('div');
    creditsCard.className = 'c-settings-contrib__card c-settings-contrib__card--credits';
    const creditsList = document.createElement('ul');
    creditsList.className = 'c-settings-contrib__credits';
    for (const c of credits) {
      const li = document.createElement('li');
      li.className = 'c-settings-contrib__credit';
      const tile = document.createElement('span');
      tile.className = 'c-settings-contrib__tile';
      tile.dataset.credit = CREDIT_GLYPH[c.key] ? c.key : 'other';
      tile.setAttribute('aria-hidden', 'true');
      tile.append(icon(CREDIT_GLYPH[c.key] || 'heart-handshake', { size: 20 }));
      const tx = document.createElement('span');
      tx.className = 'c-settings-contrib__credit-text';
      const what = document.createElement('span');
      what.className = 'c-settings-contrib__credit-what';
      what.textContent = creditLabel(c, strings);
      const who = document.createElement('span');
      who.className = 'c-settings-contrib__credit-who';
      // Proper nouns — deliberately NOT localized. i18n-lint-ok:proper-noun
      who.textContent = c.source;
      const lic = document.createElement('span');
      lic.className = 'c-settings-contrib__licence';
      lic.textContent = c.licence;   // i18n-lint-ok:proper-noun (an SPDX identifier)
      tx.append(what, who, lic);
      li.append(tile, tx);
      creditsList.append(li);
    }
    creditsCard.append(creditsList);
    body.append(creditsCard);
  }

  return el;
}

/* Shared link renderer for About / How-to. A link OPENS via the optional
   onOpenLink(url, id) callback (★ S14 #1285: settings.html sends the fixed `id` as
   `ixian:aboutLink:<id>` — C# owns the URL; `url` is for display / the demo); when
   absent the URL renders as SELECTABLE TEXT rather than trying to navigate the
   WebView away). Untrusted-safe: labels/urls are curated in-code, textContent only.
   ★ S12 B (#1267): an optional leading icon tile (`glyph` + `grad`, the hub's squircle grammar) and an
   optional second line (`sub`); without them the row is the one it always was. */
function linkRow({ id, label, url, sub, glyph, grad, onOpenLink, strings }) {
  if (onOpenLink) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-settings-links__row';
    if (glyph) b.append(aboutTile(glyph, grad));
    const lab = rowText(label, sub);
    b.append(lab, icon('external-link', { size: 18 }));   // #710: "opens outside the app" — arrow-up-right is money (#709)
    b.addEventListener('click', () => onOpenLink(url, id));
    return b;
  }
  const wrap = document.createElement('div');
  wrap.className = 'c-settings-links__row c-settings-links__row--static';
  const lab = document.createElement('span');
  lab.className = 'c-settings-links__label';
  lab.textContent = label;
  const u = document.createElement('span');
  u.className = 'c-settings-links__url';
  u.textContent = url;                       // selectable text (no WebView navigation)
  wrap.append(lab, u);
  return wrap;
}

/* ★ S12 B (#1267) — the row parts About B and How to use A share. */
/* the coloured icon tile: the hub's .c-disc squircle (settings-shell.css `.c-account .c-disc`), its colour picked per
   row from the hub ramp (--disc-hub-N) so the screens match the reference rather than the hash */
function aboutTile(glyph, grad) {
  const t = document.createElement('span');
  t.className = 'c-disc c-settings-links__tile';
  t.dataset.grad = String(grad || discGrad(glyph));
  t.setAttribute('aria-hidden', 'true');
  t.append(icon(glyph, { size: 20 }));
  return t;
}
/* the label column: a title and an optional second line */
function rowText(label, sub) {
  const col = document.createElement('span');
  col.className = 'c-settings-links__text';
  const lab = document.createElement('span');
  lab.className = 'c-settings-links__label';
  lab.textContent = label;
  col.append(lab);
  if (sub) {
    const s = document.createElement('span');
    s.className = 'c-settings-links__sub';
    s.textContent = sub;
    col.append(s);
  }
  return col;
}
/* a labelled group: "Why Spixi" over its card (the hub's section-label grammar) */
function aboutGroup(body, title, cls) {
  const wrap = document.createElement('section');
  wrap.className = 'c-settings__groupwrap c-settings-about__group' + (cls ? ' ' + cls : '');
  const h = document.createElement('h3');
  h.className = 'c-settings__label';
  h.textContent = title;
  const card = document.createElement('div');
  card.className = 'c-settings__group c-settings-links';
  wrap.append(h, card);
  body.append(wrap);
  return card;
}

/* ★ S12 B (#1267): the version chip shows what C# pushes (`Config.version` = "spixi-0.9.22") without the
   `spixi-` prefix, and only a plain version string — anything else gets NO chip rather than a strange one. */
export function aboutVersionText(version) {
  const v = String(version == null ? '' : version).trim().replace(/^spixi-/i, '');
  return /^[0-9A-Za-z.+-]{1,32}$/.test(v) ? v : '';
}

/* ★ S17 B (#1332): the S12–S14 hand-built band art (aboutHeroArt: orbit, heart, bubble, star) is RETIRED — the band is
   the full-bleed Glass header now (illustrations.js illoAboutGlass). Recover it from git (S14, #1279) if ever wanted. */

/* ★ S13 B (About "Banner hero"): ONE entrance (the band's gradient drift + the app icon settling .92 → 1), then
   `data-held` (settings-app.css: animation none) — the glass-card precedent (glass-card.js holdEntrance): the first
   animationend of the icon's own entrance, or the backstop when no animation runs (reduced motion, a hidden pane). */
const ABOUT_HOLD_MS = 2500;
function holdAboutEntrance(hero, target) {
  let t = 0;
  const hold = () => {
    clearTimeout(t);
    target.removeEventListener('animationend', onEnd);
    hero.setAttribute('data-held', '');
  };
  const onEnd = (e) => { if (e.target === target) hold(); };
  target.addEventListener('animationend', onEnd);
  t = setTimeout(hold, ABOUT_HOLD_MS);
}

/**
 * About — createSettingsAbout({ appName, version, tagline, links, onOpenLink, host, onLicences, onRate, devSeed,
 * onBack, strings }). STATIC in-hub takeover.
 * ★ S12 B (#1267, design "B, hero card-led"): a hero card (art · name · tagline · version chip), "Why Spixi" (three
 * facts), "Links" (the three external rows — ★ S14 #1285: ixian:aboutLink:<id>), "Legal and support" (Privacy · Terms as
 * the in-app doc sheets · Licences → the host's Contributors credits · Rate Spixi, ONLY with `onRate`), "© Ixian".
 * Optional rows (Licences, Rate) render only when the host can act on them.
 */
export function createSettingsAbout({
  appName = 'Spixi',
  version = '',
  tagline,
  links,
  onOpenLink,                    // OPTIONAL (url, id) — wired since iOS-21; ★ S14 (#1285): the shell sends the id (ixian:aboutLink:<id>)
  host,                          // iOS-23: sheet host for the legal doc sheets
  onLicences,                    // ★ S12 B (#1267): OPTIONAL — opens the Contributors credits (the host's own screen)
  onRate,                        // ★ S12 B (#1267): OPTIONAL — settings.html passes it only with bridge.cap('rate')
  devSeed,                       // ★ Session I: OPTIONAL { onSeed, onUnseed, status } — the DEV-BUILD seed harness (see below); absent = no card
  whatsNew,                      // ★ S17 (#1333): OPTIONAL { version, isNew, onOpen } — the "What's new" row (badge "New" while isNew); absent = no row
  onHeader,                      // ★ S17 (#1339): OPTIONAL (over) — true while the full-bleed header is under the status bar (the host tells C# the bar ink)
  onBack,
  strings = getStrings(),
} = {}) {
  const { el, body } = appScreenShell(
    'c-settings-about', strings.about || 'About', onBack);
  /* ★ S17 B (#1332, kit-render.html "About · full-bleed header", art = Glass, LOCKED): the band grew into a FULL-BLEED
     header under the status bar and the top bar. The top bar floats over it with white ink (the region tokens are
     re-assigned in scope, the .screen--hero precedent, #20) and turns SOLID again once the header has scrolled under
     it, so the title never sits white-on-white over the cards. */
  el.classList.add('c-settings-about--hdr');
  const bar = el.querySelector('.c-topbar');
  const solidAt = () => Math.max(0, (body.firstElementChild ? body.firstElementChild.offsetHeight : 0) * 0.55);
  let overHdr = null;
  const onScroll = () => {
    const solid = body.scrollTop > solidAt();
    if (bar) bar.toggleAttribute('data-solid', solid);
    if (onHeader && overHdr !== !solid) { overHdr = !solid; try { onHeader(overHdr); } catch (e) { /* presentation only */ } }
  };
  body.addEventListener('scroll', onScroll, { passive: true });
  if (onHeader) { overHdr = true; try { onHeader(true); } catch (e) { /* presentation only */ } }

  /* hero card */
  const hero = document.createElement('div');
  hero.className = 'c-settings__group c-settings-about__hero';   // the settings card (surface + shadow), restyled by its own rule
  const nameEl = document.createElement('h2');
  nameEl.className = 'c-settings-about__app-name';
  nameEl.textContent = appName;
  const tag = document.createElement('p');
  tag.className = 'c-settings-about__tagline';
  /* ★ S12 B (#1267): a NEW key — the line changed meaning (messaging AND payments) */
  tag.textContent = tagline || strings.aboutTagline2
    || 'Private messaging and payments on the Ixian network.';
  /* ★ S13 B (Damir's pick, "Banner hero"): a decorative band in the hint-art gradient carrying the art's orbit,
     satellites and sparkles (the tile-less art), and the app icon — the registry's own `logo` — overlapping the band's
     lower edge. Both are decoration (aria-hidden): the name below is the heading. */
  const band = document.createElement('div');
  band.className = 'c-settings-about__band';
  band.setAttribute('aria-hidden', 'true');
  /* ★ S17 B (#1332): the band = the Glass header — a ground layer (the deeper launcher-blue pair + a deep stop, three
     drifting light fields, a sheen, a top scrim) and the art layer (three frosted objects on one arc round the icon:
     the chat bubble, the app tile, the coin; no specular streak, no padlock; a slow float). Static art, one entrance. */
  const glass = illoAboutGlass({ className: 'c-settings-about__art' });
  band.append(glass.bg, glass.fg);
  const appIcon = document.createElement('div');
  appIcon.className = 'c-settings-about__appicon';
  appIcon.setAttribute('aria-hidden', 'true');
  appIcon.append(icon('logo', { size: 44 }));
  hero.append(band, appIcon, nameEl, tag);
  holdAboutEntrance(hero, appIcon);
  const v = aboutVersionText(version);
  if (v) {
    const ver = document.createElement('p');
    ver.className = 'c-settings-about__version';
    const vl = document.createElement('span');
    vl.textContent = strings.aboutVersion || 'Version';
    const vn = document.createElement('span');
    vn.className = 'c-settings-about__version-num';
    vn.textContent = v;
    ver.append(vl, ' ', vn);
    hero.append(ver);
  }
  body.append(hero);

  /* ★ S17 A/B (#1333): "What's new" — opens the What's new card (the host's own component, in this trusted shell). The
     "New" badge stays until the user has opened it in this version (the host decides `isNew`; C# owns the seen
     version). The sub line names the version and the count, like the card's own eyebrow. */
  if (whatsNew && typeof whatsNew.onOpen === 'function') {
    const card = document.createElement('div');
    card.className = 'c-settings__group c-settings-links c-settings-about__wn';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-settings-links__row c-settings-about__wn-row';
    const ver = aboutVersionText(whatsNew.version || version);
    const sub = (strings.whatsNewSub || 'Spixi {0} · 6 new things').split('{0}').join(ver || '');
    b.append(aboutTile('rocket', 8), rowText(strings.whatsNew || 'What’s new', sub));
    if (whatsNew.isNew) {
      const badge = document.createElement('span');
      badge.className = 'c-settings-about__new';
      badge.textContent = strings.whatsNewBadge || 'New';
      b.append(badge);
    }
    b.append(icon('chevron-right', { size: 18 }));
    b.addEventListener('click', () => {
      const nb = b.querySelector('.c-settings-about__new');
      if (nb) nb.remove();   // opened in this version: the badge goes at once (C# records the seen version)
      try { whatsNew.onOpen(); } catch { /* the row must not throw out of the screen */ }
    });
    card.append(b);
    body.append(card);
  }

  /* Why Spixi — three facts (no rows to tap). No post-quantum line, no "server" wording (#1267). */
  const why = aboutGroup(body, strings.aboutWhy || 'Why Spixi', 'c-settings-about__why');
  for (const f of [
    { glyph: 'topology-star', grad: 5, title: strings.aboutWhyNetworkTitle || 'Decentralized',
      text: strings.aboutWhyNetworkBody || 'Runs on the Ixian network, peer to peer.' },
    /* ★ S13 (#1269 (1), Damir): the E2E row is the title alone — the old second line ("Only the person you write to…",
       singular, wrong for groups and bot rooms) is DROPPED and its key retired; no neutral line (the row reads clean). */
    { glyph: 'lock', grad: 8, title: strings.aboutWhyE2eTitle || 'End-to-end encrypted' },
    /* ★ S12 B (r1 R2-m4): platform-neutral ("device", not "phone") — a NEW key, the old aboutWhyKeysTitle is retired */
    { glyph: 'key', grad: 2, title: strings.aboutWhyKeysTitle2 || 'Your keys, your device',
      text: strings.aboutWhyKeysBody || 'Keys are made and kept on this device.' },
  ]) {
    const r = document.createElement('div');
    r.className = 'c-settings-links__row c-settings-about__fact';
    r.append(aboutTile(f.glyph, f.grad), rowText(f.title, f.text));
    why.append(r);
  }

  /* Links — website / network / source (degrade to text without onOpenLink). Today's three URLs, unchanged.
     ★ S14 (#1285): each row carries a FIXED id — the verb sends the id, C# maps it to its own Config URL
     (SettingsPage.aboutLinkUrl: website → aboutUrl · network → aboutNetworkUrl · source → sourceCodeUrl). */
  const list = links || [
    { id: 'website', label: strings.aboutLinkWebsite || 'Website', url: 'https://www.spixi.io', glyph: 'world', grad: 8 },
    { id: 'network', label: strings.aboutLinkNetwork || 'Ixian network', url: 'https://www.ixian.io', glyph: 'topology-star', grad: 5 },
    { id: 'source', label: strings.aboutLinkSource || 'Source code', url: 'https://github.com/ixian-platform/Spixi', glyph: 'code', grad: 3 },
  ];
  if (list.length) {
    const card = aboutGroup(body, strings.aboutLinks || 'Links');
    for (const l of list) card.append(linkRow({ ...l, onOpenLink, strings }));
  }

  /* Legal and support. iOS-23: Terms + Privacy open as the SAME in-app doc sheets onboarding uses (openLegalDoc →
     launch-shell.js), NOT as external links: app-controlled copy, works with no network, English-only by #169. */
  const legalCard = aboutGroup(body, strings.aboutLegalSupport || 'Legal and support');
  const navRow = (glyph, grad, label, onClick, cls) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-settings-links__row' + (cls ? ' ' + cls : '');
    b.append(aboutTile(glyph, grad), rowText(label), icon('chevron-right', { size: 18 }));
    b.addEventListener('click', onClick);
    return b;
  };
  legalCard.append(
    navRow('shield-lock', 1, strings.privacyLink || 'Privacy Policy', () => openLegalDoc({ doc: 'privacy', host, strings })),
    navRow('file-text', 6, strings.termsLink || 'Terms of Use', () => openLegalDoc({ doc: 'terms', host, strings })),
  );
  if (onLicences) {
    legalCard.append(navRow('heart-handshake', 2, strings.aboutLicences || 'Licenses',
      () => { try { onLicences(); } catch { /* the row must not throw out of the screen */ } }, 'c-settings-about__licences'));
  }
  /* Rate Spixi — a voluntary visit: intent only (ixian:rating:yes from the host); C# owns the store URL. */
  if (onRate) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-settings-links__row c-settings-about__rate';
    b.append(aboutTile('star', 9), rowText(strings.aboutRate || 'Rate Spixi', strings.aboutRateBody || 'Tell others what you think'),
      icon('external-link', { size: 18 }));
    b.addEventListener('click', () => { try { onRate(); } catch { /* the row must not throw out of the screen */ } });
    legalCard.append(b);
  }

  const legal = document.createElement('p');
  legal.className = 'c-settings__note c-settings-about__legal';
  /* ★ S11 A (#1262, Damir): the licence name leaves the app copy — the line is the copyright alone. A NEW key (a
     changed meaning is a new key): `aboutLegal` (the old line that named the licence) is retired. The Source code row above
     stays (the code stays public); the Contributors/licences credits are untouched. */
  legal.textContent = strings.aboutLegal2 || '© Ixian';
  body.append(legal);

  /* ★ Session I ② — THE SEED HARNESS CARD (DEV BUILDS ONLY, Damir: "button in About").
     Rendered ONLY when the host passes `devSeed`, and settings.html passes it ONLY after
     C# pushed `setDevSeed` — which SettingsPage sends under `#if SPIXI_DEV_COEXIST`, the
     compile symbol Spixi.csproj defines for a SpixiDevCoexist build (#732). A store build
     has no symbol, no push, no card, no verbs. Fifty deterministic contacts with history
     go through the REAL message store (FriendList.addFriend + addMessageWithType), so the
     [CDPERF] chat-open stamps and the chats-list rows are measured at 50, not at 3.
     English-only by the #301 precedent: an engineering instrument that cannot ship. The
     `i18n-lint-ok:dev` marks are counted by a smoke pin (#420's cap, now two sites). */
  if (devSeed && (devSeed.onSeed || devSeed.onSeedHeavy || devSeed.onUnseed)) {
    const wrap = document.createElement('div');
    wrap.className = 'c-settings__groupwrap c-settings-about__devseed';
    const head = document.createElement('p');
    head.className = 'c-settings__note';
    head.textContent = 'Dev build (SpixiDevCoexist) — seed harness. Fifty test contacts with history, through the real message store. Light = 2–40 messages each (Seed 12 has 40). Heavy = Seed 01–10 with 1000 each, the rest 40; heavy tops light up in place. Remove before measuring anything else.';   // i18n-lint-ok:dev — dev-build instrument, compiled out of release (#732)
    wrap.append(head);
    const card = document.createElement('div');
    card.className = 'c-settings__group c-settings-links';
    const row = (label, onClick) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'c-settings-links__row';
      const lab = document.createElement('span');
      lab.className = 'c-settings-links__label';
      lab.textContent = label;
      b.append(lab, icon('chevron-right', { size: 18 }));
      b.addEventListener('click', () => { if (onClick) onClick(); });
      return b;
    };
    if (devSeed.onSeed) card.append(row('Seed 50 · light (2–40 messages)', devSeed.onSeed));         // i18n-lint-ok:dev — dev-build instrument (#732)
    if (devSeed.onSeedHeavy) card.append(row('Seed 50 · heavy (10 × 1000 + 40 × 40)', devSeed.onSeedHeavy));   // i18n-lint-ok:dev — ★ Session J count dial (#747)
    if (devSeed.onUnseed) card.append(row('Remove seeded contacts', devSeed.onUnseed));   // i18n-lint-ok:dev — dev-build instrument (#732)
    wrap.append(card);
    const status = document.createElement('p');
    status.className = 'c-settings__note c-settings-about__devseed-status';
    status.textContent = devSeed.status || '';
    wrap.append(status);
    body.append(wrap);
  }

  return el;
}

/* ★ S12 B (#1267) — How to use: which steps this device has opened. `spixi.howtoSeen` holds a JSON array of step
   numbers 1–6 and nothing else; anything that is not exactly that reads as "none seen" (validated on read), and
   every access is fenced (private mode / a full store throws). Not personal: six small integers. */
export const HOWTO_SEEN_KEY = 'spixi.howtoSeen';
export const HOWTO_STEPS = 6;
export function readHowToSeen(storage) {
  try {
    const raw = storage && storage.getItem(HOWTO_SEEN_KEY);
    if (typeof raw !== 'string' || raw.length > 64) return [];
    const a = JSON.parse(raw);
    if (!Array.isArray(a) || a.length > HOWTO_STEPS) return [];
    if (!a.every((n) => Number.isInteger(n) && n >= 1 && n <= HOWTO_STEPS)) return [];
    return [...new Set(a)].sort((x, y) => x - y);
  } catch { return []; }
}
function writeHowToSeen(storage, seen) {
  try { if (storage) storage.setItem(HOWTO_SEEN_KEY, JSON.stringify([...seen].sort((x, y) => x - y))); } catch { /* not kept — the screen still works */ }
}
function howToStorage() {
  try { return window.localStorage; } catch { return null; }
}
let howToSeq = 0;

/**
 * How to use — createSettingsHowTo({ steps, links, onOpenLink, onJoinCommunity, storage, onBack, strings }).
 * STATIC in-hub takeover, zero-C#.
 * ★ S12 B (#1267, design "A, calm expandable list"): an intro, a "{0} of 6 seen" line + bar, six rows that each open
 * (one at a time; a button with aria-expanded over its region) to the approved illustration and two lines of text —
 * no "Show me" in v1 — then "Need more help?": the community row (unchanged behaviour) and Help centre.
 */
export function createSettingsHowTo({
  steps,
  links,
  onOpenLink,
  /* ★ Item 6 (#397/#400): the PERMANENT door into the Spixi community. The chat-list
     empty-state CTA is the right first impression, but it disappears the moment the
     user adds any ordinary contact — after that there was no way in at all. Optional:
     without the hook the row is not rendered, so every other caller (demo, tests) is
     unchanged. Opt-in by construction — nothing is added until it is tapped. */
  onJoinCommunity,
  storage = howToStorage(),      // ★ S12 B: the seen-state store (localStorage); null = nothing kept
  onBack,
  strings = getStrings(),
} = {}) {
  const { el, body } = appScreenShell(
    'c-settings-howto', strings.howToUse || 'How to use Spixi', onBack);

  const intro = document.createElement('p');
  intro.className = 'c-settings__note c-settings-howto__intro';
  intro.textContent = strings.howToIntro2 || 'Six things worth knowing. Tap one to see how it works.';
  body.append(intro);

  const list = steps || [
    { glyph: 'message', grad: 8, art: illoChatsEmpty, title: strings.howTo2Step1 || 'Start a chat',
      body: strings.howTo2Step1Body || 'Tap the new-chat button on Chats and pick a contact.' },
    { glyph: 'qrcode', grad: 1, art: illoAddContact, title: strings.howTo2Step2 || 'Add a contact by QR',
      body: strings.howTo2Step2Body || 'Show your QR from Account, or scan a friend’s in Contacts › Add contact.' },
    { glyph: 'wallet', grad: 4, art: illoWelcome3, title: strings.howTo2Step3 || 'Send IXI in a chat',
      body: strings.howTo2Step3Body || 'Tap + in a chat to send or request IXI. You confirm every payment on your device.' },
    { glyph: 'apps', grad: 5, art: illoAppsEmpty, title: strings.howTo2Step4 || 'Use mini apps',
      body: strings.howTo2Step4Body || 'Open Apps to find mini apps you can use together in a chat.' },
    { glyph: 'shield-lock', grad: 2, art: illoBackup, title: strings.howTo2Step5 || 'Back up your account',
      body: strings.howTo2Step5Body || 'Save one encrypted backup file from Account › Backup. Without it and your password, nothing can be recovered.' },
    { glyph: 'eye-off', grad: 6, art: illoWelcome1, title: strings.howTo2Step6 || 'Stay private',
      body: strings.howTo2Step6Body || 'Your messages are end-to-end encrypted. Keep your password to yourself.' },
  ];
  const total = list.length;
  const seen = new Set(readHowToSeen(storage).filter((n) => n <= total));

  /* progress: "2 of 6 seen" + a thin bar (the bar is decoration; the line carries the number) */
  const prog = document.createElement('div');
  prog.className = 'c-settings-howto__progress';
  const progText = document.createElement('span');
  progText.className = 'c-settings-howto__seen';
  /* ★ S12 B (r1 R2 a11y): the count is announced when a row is opened for the first time (the badges are aria-hidden) */
  progText.setAttribute('aria-live', 'polite');
  progText.setAttribute('aria-atomic', 'true');
  const bar = document.createElement('span');
  bar.className = 'c-settings-howto__bar';
  bar.setAttribute('aria-hidden', 'true');
  const fill = document.createElement('span');
  fill.className = 'c-settings-howto__bar-fill';
  bar.append(fill);
  prog.append(progText, bar);
  body.append(prog);
  const paintProgress = () => {
    progText.textContent = (strings.howToSeen || '{0} of 6 seen').split('{0}').join(String(seen.size));
    fill.style.inlineSize = (total ? Math.round((seen.size / total) * 100) : 0) + '%';
  };
  paintProgress();

  const groupWrap = document.createElement('div');
  groupWrap.className = 'c-settings__groupwrap';
  const card = document.createElement('div');
  card.className = 'c-settings__group c-settings-howto__steps';
  howToSeq += 1;
  const items = [];
  const setOpen = (it, open) => {
    it.head.setAttribute('aria-expanded', String(open));
    it.region.hidden = !open;
    it.item.toggleAttribute('data-open', open);
    if (open && !it.region.firstChild) {
      /* the art is drawn when the row opens (six drawings at once is wasted work), and dropped when it closes */
      if (typeof it.s.art === 'function') it.region.append(it.s.art({ className: 'c-settings-howto__art' }));
      const t = document.createElement('p');
      t.className = 'c-settings-howto__text';
      t.textContent = it.s.body;
      it.region.append(t);
    } else if (!open) {
      it.region.replaceChildren();
    }
  };
  list.forEach((s, idx) => {
    const n = idx + 1;
    const item = document.createElement('div');
    item.className = 'c-settings-howto__item';
    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'c-settings-links__row c-settings-howto__head';
    head.id = 'howto-h' + howToSeq + '-' + n;
    const region = document.createElement('div');
    region.className = 'c-settings-howto__panel';
    region.id = 'howto-p' + howToSeq + '-' + n;
    region.setAttribute('role', 'region');
    region.setAttribute('aria-labelledby', head.id);
    head.setAttribute('aria-controls', region.id);
    const tile = document.createElement('span');
    tile.className = 'c-settings-howto__tile';
    tile.append(aboutTile(s.glyph || 'info-circle', s.grad));
    const badge = document.createElement('span');
    badge.className = 'c-settings-howto__check';
    badge.setAttribute('aria-hidden', 'true');
    badge.append(icon('check', { size: 10 }));
    tile.append(badge);
    head.append(tile, rowText(s.title), icon('chevron-down', { size: 18 }));
    item.append(head, region);
    card.append(item);
    const it = { n, s, item, head, region, badge };
    const markSeen = () => { badge.hidden = !seen.has(n); item.toggleAttribute('data-seen', seen.has(n)); };
    it.markSeen = markSeen;
    markSeen();
    items.push(it);
    setOpen(it, false);
    head.addEventListener('click', () => {
      const opening = head.getAttribute('aria-expanded') !== 'true';
      for (const o of items) if (o !== it && o.head.getAttribute('aria-expanded') === 'true') setOpen(o, false);   // one open at a time
      setOpen(it, opening);
      if (opening && !seen.has(n)) {
        seen.add(n);
        writeHowToSeen(storage, seen);
        markSeen();
        paintProgress();
      }
    });
  });
  groupWrap.append(card);
  body.append(groupWrap);

  /* Need more help? — the community row (Item 6, unchanged behaviour) + Help centre (the existing guide link). */
  const linkList = links || [
    // iOS-21: the help centre, not the marketing home page — this is the
    // "how to use Spixi" destination (mirrors Config.guideUrl, Meta/Config.cs:32). ★ S14 (#1285): id 'help' → Config.guideUrl.
    { id: 'help', label: strings.howToHelpCentre || 'Help Center', url: 'https://www.spixi.io/help-center.html', glyph: 'world', grad: 8 },
  ];
  if (onJoinCommunity || linkList.length) {
    const more = aboutGroup(body, strings.howToMoreHelp || 'Need more help?', 'c-settings-howto__more');
    /* ★ Item 6: the community row. One-shot in the DOCUMENT (this takeover is rebuilt
       on every open, so the latch does not persist — deliberately: the host knows
       nothing about the roster, and the honest failure is a second request, which
       addFriend absorbs). It reports done in place rather than through a toast, because
       the user is looking straight at the control they pressed.
       ★ S12 B (#1267): the row joins the "Need more help?" card with an icon tile and its explanation as the second
       line (the same howToJoinBody copy that sat under the card); the behaviour is unchanged. */
    if (onJoinCommunity) {
      const jb = document.createElement('button');
      jb.type = 'button';
      jb.className = 'c-settings-links__row c-settings-howto__join';
      const jtext = rowText(strings.howToJoinCta || 'Join the Spixi community',
        strings.howToJoinBody || 'Adds the Spixi group chat to your chats, where you can ask questions and follow updates.');
      const jlab = jtext.querySelector('.c-settings-links__label');
      const jglyph = icon('chevron-right', { size: 18 });
      jb.append(aboutTile('users', 5), jtext, jglyph);
      jb.addEventListener('click', () => {
        if (jb.disabled) return;
        jb.disabled = true;
        try { onJoinCommunity(); } catch { /* the row must not throw out of the screen */ }
        /* ★ audit MINOR: NOT "Added". FriendList.addFriend returns NULL when the address is
           already in the list (Ixian-Core FriendList.cs:366-370), so a repeat tap adds
           nothing — and this row is PERMANENT, aimed exactly at users who are past their
           first contact and most likely to hold the bot already. The confirmation has to be
           true in both cases, so it states where the chat IS rather than what just happened. */
        jlab.textContent = strings.howToJoinDone || 'Spixi group chat is in your chats';
        jglyph.replaceWith(icon('check', { size: 18 }));
      });
      more.append(jb);
    }
    for (const l of linkList) more.append(linkRow({ ...l, onOpenLink, strings }));
  }

  return el;
}
