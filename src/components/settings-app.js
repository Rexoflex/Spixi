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
import { formatTxTimestamp } from './timestamp.js';   // iOS-55/#328: epoch ctimes → localized display
import { createTopbar } from './topbar.js';
import { openLegalDoc } from './launch-shell.js';   // iOS-23: ONE source for the legal copy (#169)
import { createButton, setLoading, setSuccess } from './button.js';
import { createSearchField } from './search-field.js';
import { settingsConfirm, settingsOptionSheet } from './settings-shell.js';
import { copyText } from './clipboard.js';   // ★ #993: the shared copy with the file:// fallback
import { fillFileName, createFileTile } from './typed-bubbles.js';   // ★ #1005: one file-name truncation, the extension kept
import { formatFileSize } from './timestamp.js';            // ★★ #1107: one size format (chat info + Downloads) — ★ S11 F4 (#1263): its home is timestamp.js
import { createAvatar, safeImageSrc } from './avatar.js';                 // ★ S10 F7 (#1254): the From sheet's sender avatars
import { illoChatsEmpty, illoAddContact, illoWelcome3, illoAppsEmpty, illoBackup, illoWelcome1 } from './illustrations.js';   // ★ S12 B (#1267): the How-to step art (the S11 set)

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
 * onDeleteFile, onClearAll, strings }).
 * files: [{ name, time }] (time = the opaque ctime string).
 * Free fn: setDownloads(el, files) — the clearFiles/addFile wholesale mirror.
 */
export function createSettingsDownloads({
  files = [],
  host,
  onBack,
  onOpenFile,                    // (name) — ixian:open:<name>, fire-and-forget
  onDeleteFile,                  // (name, ctrl) — ixian:delete:<name>; C# re-pushes the list
  onClearAll,                    // (ctrl) — ixian:deleted; C# re-pushes (empty)
  onShowInChat,                  // ★★ #1107 (name) — ixian:showDownloadInChat:<name>; only on a row with a known sender
  strings = getStrings(),
} = {}) {
  const { el, body, live } = appScreenShell(
    'c-settings-dl', strings.downloads || 'Downloads', onBack);
  /* ★★ #1107 (part 5b): newest first (C# also pushes in that order); a sender filter appears once phase 2 named at
     least one sender (setDownloadSenders — matched through the file's own message, never by name). */
  let senderKey = '';                  // '' = all senders
  let current = [];
  const hostFor = () => host || el.closest('.demo-phone') || undefined;

  /* search — frontend name filter (#67 chat-list precedent, no bridge) */
  let query = '';
  const search = createSearchField({
    placeholder: strings.searchDownloads || 'Search files',
    ariaLabel: strings.searchDownloads || 'Search files',
    strings,
    onInput: (v) => { query = v.trim().toLowerCase(); applyFilter(); },
  });
  const searchWrap = document.createElement('div');
  searchWrap.className = 'c-settings-dl__search';
  searchWrap.append(search);
  body.append(searchWrap);

  /* ★★ #1107: the sender filter — ONE "From: <who>" chip (shown only when a sender is known) that opens the option
     sheet: "Everyone" + every sender, sorted, with a search field once the list is long. Chips per sender did not
     scale (Damir: "it could be 50 or more people"; #1111). No sort control: newest first only (#1111). */
  /* ★ G-5 (#1119, Damir picked C of three renders: "the From chip looks small / out of place"): a SECTION HEADER over
     the list — the shown-file count on the left, an accent text button "From: <who> ▾" on the right, both on the card's
     edge. Same sheet, same filter, same strings; no chip. The row hides when no sender is known (as the chip did). */
  const controls = document.createElement('div');
  controls.className = 'c-settings-dl__controls';
  let senders = new Map();             // key → label, from the current list
  let avatars = new Map();             // ★ S10 F7: key → data:image URI (setDownloadsAvatars; validated by the shell)
  const countEl = document.createElement('span');
  countEl.className = 'c-settings-dl__count';
  const fromChip = document.createElement('button');
  fromChip.type = 'button';
  fromChip.className = 'c-settings-dl__from-btn';
  fromChip.setAttribute('aria-haspopup', 'dialog');
  const fromLab = document.createElement('span');
  fromLab.className = 'c-settings-dl__from-label';
  fromChip.append(fromLab, icon('chevron-down', { size: 16 }));
  fromChip.addEventListener('click', () => openSenderSheet());
  controls.append(countEl, fromChip);
  body.append(controls);
  const fromLabel = () => (strings.downloadsFromChip || 'From: {name}').split('{name}').join(
    senderKey ? (senders.get(senderKey) || '') : (strings.downloadsAllSenders || 'Everyone'));
  function paintFromChip() {
    fromLab.textContent = fromLabel();
    if (senderKey) fromChip.dataset.active = ''; else delete fromChip.dataset.active;
  }
  function paintCount(n) {
    countEl.textContent = n === 1 ? (strings.downloadsCountOne || '1 file')
      : (strings.downloadsCount || '{n} files').split('{n}').join(String(n));
  }
  /* ★ S10 F7 (#1254, Damir pick C): each row = a 40 px avatar (the pushed photo, else the name's gradient initials) +
     "{n} files · last {when}" — counted from the list on screen (`current`, all files, not the search). {when} = the
     sender's newest epoch time in the row's own date format (formatTxTimestamp; no relative form exists); an old exe's
     opaque time string gives no "last" part. "Everyone" = a tonal people disc + the total. */
  const filesLabel = (n) => (n === 1 ? (strings.downloadsSenderFilesOne || '1 file')
    : (strings.downloadsSenderFiles || '{n} files').split('{n}').join(String(n)));
  function senderStats() {
    const stats = new Map();             // key → { n, newest (epoch s, 0 = unknown) }
    for (const f of current) {
      if (!f.senderKey) continue;
      const st = stats.get(f.senderKey) || { n: 0, newest: 0 };
      st.n++;
      const t = String(f.time || '').trim();
      if (/^\d{1,12}$/.test(t) && Number(t) > st.newest) st.newest = Number(t);
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
      commit: (value, ctrl) => { senderKey = value; paintFromChip(); applyFilter(); ctrl.done(); },
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
  function renderSenders(list) {
    senders = new Map();
    for (const f of list) if (f.senderKey && f.sender && !senders.has(f.senderKey)) senders.set(f.senderKey, f.sender);
    if (senderKey && !senders.has(senderKey)) senderKey = '';   // (#46 r2 R2-1) a filter on a sender no longer listed is cleared — the chip hides with it, so nothing could clear it
    controls.hidden = senders.size === 0;
    paintFromChip();
  }

  /* list card */
  const groupWrap = document.createElement('div');
  groupWrap.className = 'c-settings__groupwrap';
  const card = document.createElement('div');
  card.className = 'c-settings__group';
  groupWrap.append(card);
  body.append(groupWrap);

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

  /* no-matches note (search active, nothing left) */
  const noMatch = document.createElement('p');
  noMatch.className = 'c-settings__note c-settings-dl__nomatch';
  noMatch.textContent = strings.downloadsNoMatch || 'No files match your search.';
  noMatch.hidden = true;
  body.append(noMatch);

  /* clear-all — the ONE error-hue destructive row on this surface (#147⑤ reservation) */
  let clearWrap = null;
  if (onClearAll) {
    clearWrap = document.createElement('div');
    clearWrap.className = 'c-settings__groupwrap';
    const clearCard = document.createElement('div');
    clearCard.className = 'c-settings__group';
    const section = document.createElement('div');
    section.className = 'c-settings__section';
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'c-settings__row';
    const lab = document.createElement('span');
    lab.className = 'c-settings__row-label';
    const disc = document.createElement('span');
    disc.className = 'c-disc';
    disc.dataset.hue = 'error';
    disc.dataset.grad = String(discGrad('trash'));
    disc.append(icon('trash', { size: 16 }));
    lab.append(disc, document.createTextNode(strings.clearDownloads || 'Delete all downloads'));
    row.append(lab, icon('chevron-right', { size: 18 }));
    row.addEventListener('click', () => settingsConfirm({
      title: strings.clearDownloadsTitle || 'Delete all downloads?',
      bodyText: strings.deleteDownloadsBody || 'Received files are removed from this device. Senders keep theirs.',
      confirmLabel: strings.deleteConfirm || 'Delete',
      host: hostFor(), strings,
      run: (ctrl) => onClearAll(ctrl),     // sync throw handled inside settingsConfirm
    }));
    section.append(row);
    clearCard.append(section);
    clearWrap.append(clearCard);
    body.append(clearWrap);
  }

  const fileRow = ({ name, time, size, sender, senderKey: rowSender }) => {
    const section = document.createElement('div');
    section.className = 'c-settings__section';
    const row = document.createElement('div');
    row.className = 'c-settings-dl__row';
    row.dataset.name = name;
    if (rowSender) row.dataset.sender = rowSender;   // ★★ #1107: the From filter's key

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'c-settings-dl__open';
    const disc = createFileTile(name);     // ★ A3 (#1126): the chat's file-type tile (PNG · PDF …), the same builder
    const meta = document.createElement('span');
    meta.className = 'c-settings-dl__meta';
    const nm = document.createElement('span');
    nm.className = 'c-settings-dl__name';
    fillFileName(nm, name);                // UNTRUSTED — textContent only (★ #1005: keeps the extension)
    meta.append(nm);
    if (time) {
      const tm = document.createElement('span');
      tm.className = 'c-settings-dl__time';
      // iOS-55/#328 (W1 class): C# now pushes raw EPOCH SECONDS — all-digits
      // formats via formatTxTimestamp/docLocale (translated, chat-row parity);
      // anything else = an OLD exe's culture-opaque DateTime string → verbatim.
      const s = String(time).trim();
      tm.textContent = (/^\d{1,12}$/.test(s) && Number(s) > 0)
        ? formatTxTimestamp(Number(s) * 1000)
        : time;                            // opaque locale string — never parsed
      /* ★★ #1107: · size, then "from <sender>" on its own line (only when C# matched it through the file's message) */
      const sz = formatFileSize(size);
      if (sz) tm.textContent += ' · ' + sz;
      meta.append(tm);
    }
    if (sender) {
      const from = document.createElement('span');
      from.className = 'c-settings-dl__time c-settings-dl__from';
      from.textContent = (strings.downloadsFrom || 'from {name}').split('{name}').join(sender);   // peer-chosen name — textContent only
      meta.append(from);
    }
    open.append(disc, meta);
    if (onOpenFile) open.addEventListener('click', () => onOpenFile(name));
    else open.disabled = true;
    row.append(open);

    if (onShowInChat && rowSender) {
      const go = document.createElement('button');
      go.type = 'button';
      go.className = 'c-settings-dl__go';   // (#46 r1 B11) its own class — never matched as the delete button
      go.setAttribute('aria-label', (strings.downloadsShowInChat || 'Show {name} in chat').split('{name}').join(name));
      go.append(icon('message', { size: 18 }));
      go.addEventListener('click', () => onShowInChat(name));
      row.append(go);
    }

    if (onDeleteFile) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'c-settings-dl__del';
      del.setAttribute('aria-label',
        (strings.deleteFile || 'Delete {name}').split('{name}').join(name));
      del.append(icon('trash', { size: 18 }));
      del.addEventListener('click', () => settingsConfirm({
        title: strings.deleteFileTitle || 'Delete this file?',
        bodyText: (strings.deleteFileBody || '“{name}” is removed from this device.')
          .split('{name}').join(name),
        confirmLabel: strings.deleteConfirm || 'Delete',
        host: hostFor(), strings,
        run: (ctrl) => onDeleteFile(name, ctrl),
      }));
      row.append(del);
    }
    section.append(row);
    return section;
  };

  function applyFilter() {
    let visible = 0;
    for (const s of card.children) {
      const rowEl = s.querySelector('.c-settings-dl__row');
      const name = rowEl ? (rowEl.dataset.name || '') : '';
      const hit = (!query || name.toLowerCase().includes(query))
        && (!senderKey || (rowEl && rowEl.dataset.sender === senderKey));   // ★★ #1107
      s.hidden = !hit;
      if (hit) visible++;
    }
    noMatch.hidden = !(card.childElementCount > 0 && visible === 0);
    paintCount(visible);   // ★ G-5: the header counts what is SHOWN
    live.textContent = (query || senderKey)
      ? (strings.downloadsMatches || '{n} files match').split('{n}').join(String(visible))
      : '';
  }

  function render(list) {
    current = list;
    // newest first (stable: an old exe's opaque time string sorts as 0 and keeps C#'s order)
    const sorted = list.slice().sort((a, b) => (Number(b.time) || 0) - (Number(a.time) || 0));
    card.replaceChildren(...sorted.map(fileRow));   // fileRow sets data-sender (#46 r3 R3-7: no per-row search)
    renderSenders(list);
    const has = list.length > 0;
    groupWrap.hidden = !has;
    empty.hidden = has;
    searchWrap.hidden = list.length < SEARCH_MIN;
    if (clearWrap) clearWrap.hidden = !has;
    applyFilter();
  }
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
export function setDownloads(el, files = []) {
  if (el._dlRender) el._dlRender(files);
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
 * Contributors — createSettingsContributors({ contributors, onBack, strings }).
 * Static thank-you screen (legacy contributors.html port): art slot + the
 * names on a card. Illustration swaps into the art slot later
 * (illustrations-plan.md language decision).
 */
export function createSettingsContributors({
  contributors = CONTRIBUTORS,
  credits = ASSET_CREDITS,        // ★ #502 — overridable, same shape as contributors
  onBack,
  strings = getStrings(),
} = {}) {
  const { el, body } = appScreenShell(
    'c-settings-contrib', strings.contributors || 'Contributors', onBack);

  /* art slot — token-styled placeholder (backup-hero precedent) */
  const art = document.createElement('div');
  art.className = 'c-settings-contrib__art';
  art.setAttribute('aria-hidden', 'true');
  const disc = document.createElement('span');
  disc.className = 'c-disc c-settings-contrib__art-disc';
  disc.dataset.hue = 'accent';
  disc.dataset.grad = String(discGrad('heart-handshake'));
  disc.append(icon('heart-handshake', { size: 32 }));
  art.append(disc);
  body.append(art);

  const lead = document.createElement('p');
  lead.className = 'c-settings__note c-settings-contrib__lead';
  lead.textContent = strings.contributorsLead ||
    'Spixi is better because these people cared. Special thanks to:';
  body.append(lead);

  const groupWrap = document.createElement('div');
  groupWrap.className = 'c-settings__groupwrap';
  const card = document.createElement('div');
  card.className = 'c-settings__group c-settings-contrib__card';
  const list = document.createElement('ul');
  list.className = 'c-settings-contrib__list';
  for (const name of contributors) {
    const li = document.createElement('li');
    li.className = 'c-settings-contrib__name';
    li.textContent = name;
    list.append(li);
  }
  card.append(list);
  groupWrap.append(card);
  body.append(groupWrap);

  /* ★ #502: the asset credits, under their own heading and their own card. */
  if (credits.length) {
    const h = document.createElement('h3');
    h.className = 'c-settings__label c-settings-contrib__credits-title';   // ★ #1040: the hub's section-label grammar ("Preferences"), not a centred note
    h.textContent = strings.creditsTitle || 'Credits';
    body.append(h);

    const creditsWrap = document.createElement('div');
    creditsWrap.className = 'c-settings__groupwrap';
    const creditsCard = document.createElement('div');
    creditsCard.className = 'c-settings__group c-settings-contrib__card c-settings-contrib__card--credits';
    const creditsList = document.createElement('ul');
    creditsList.className = 'c-settings-contrib__credits';
    for (const c of credits) {
      const li = document.createElement('li');
      li.className = 'c-settings-contrib__credit';
      const what = document.createElement('span');
      what.className = 'c-settings-contrib__credit-what';
      what.textContent = creditLabel(c, strings);
      const who = document.createElement('span');
      who.className = 'c-settings-contrib__credit-who';
      // Proper nouns — deliberately NOT localized. i18n-lint-ok:proper-noun
      who.textContent = c.source + ' · ' + c.licence;
      li.append(what, who);
      creditsList.append(li);
    }
    creditsCard.append(creditsList);
    creditsWrap.append(creditsCard);
    body.append(creditsWrap);
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

/* ★ S12 B (#1267) — the About hero art: the Spixi mark on a violet tile, a dashed orbit with three satellites
   (★ S14 (#1279, Damir 12:24): a heart, a chat bubble and a gold star — the heart and star are the rating art's
   own (illustrations.js `rating`: rnHeart / rnStar gradients, white gloss), the lock and IXI coin retired) and small
   sparkles. Inline so the --ab-* tokens (tokens.css) theme it;
   a still drawing (no motion → nothing for reduced motion to stop). Built element by element with
   createElementNS from the static table below — no markup string, no innerHTML (this file has none). Gradient
   ids are unique per call. */
const AB_NS = 'http://www.w3.org/2000/svg';
let abSeq = 0;
function abEl(tag, attrs, kids) {
  const n = document.createElementNS(AB_NS, tag);
  for (const k of Object.keys(attrs || {})) n.setAttribute(k, String(attrs[k]));
  for (const c of kids || []) n.append(c);
  return n;
}
const abStop = (o, v, a) => abEl('stop', { offset: o, style: 'stop-color:' + v + (a != null ? ';stop-opacity:' + a : '') });
const AB_HEART = 'M0 8.5C-6.5-1.8-19-.2-19 10.2-19 18-6 25.5 0 29.5 6 25.5 19 18 19 10.2 19-.2 6.5-1.8 0 8.5Z';   /* illustrations.js `rating` */
const AB_STAR = 'M0-13.5 4-4.8 13.4-4.1 6.3 2.2 8.5 11.6 0 6.6-8.5 11.6-6.3 2.2-13.4-4.1-4-4.8Z';
const abSpark = (x, y, r) => abEl('path', { d: `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z` });
function aboutHeroArt({ tile = true } = {}) {
  abSeq += 1;
  const id = (n) => n + '-ab' + abSeq;
  const url = (n) => 'url(#' + id(n) + ')';
  const lin = (n, a, b, diag) => abEl('linearGradient', { id: id(n), x1: 0, y1: 0, x2: diag ? 1 : 0, y2: 1 }, [abStop(0, a), abStop(1, b)]);
  /* ★ S13 B (About "Banner hero"): `tile: false` draws the scene WITHOUT its centre — no glow, floor, tile or mark —
     for the band, where the overlapping app icon (createSettingsAbout) is the centre object instead */
  const centre = tile ? [
    abEl('ellipse', { cx: 150, cy: 72, rx: 120, ry: 66, fill: url('g') }),
    abEl('ellipse', { cx: 150, cy: 136, rx: 46, ry: 5, style: 'fill:var(--ab-floor)' }),
  ] : [];
  const tileRects = tile ? [
    abEl('rect', { x: 116, y: 42, width: 68, height: 72, rx: 22, style: 'fill:var(--ab-tile-shadow)', filter: url('f') }),
    abEl('rect', { x: 110, y: 30, width: 80, height: 80, rx: 22, fill: url('t') }),
    abEl('rect', { x: 110, y: 30, width: 80, height: 80, rx: 22, fill: url('h') }),
  ] : [];
  const svg = abEl('svg', { viewBox: '0 0 300 150', class: 'c-settings-about__art', 'aria-hidden': 'true', focusable: 'false' }, [
    abEl('defs', {}, [
      ...(tile ? [
        abEl('radialGradient', { id: id('g') }, [abStop(0, 'var(--ab-glow)'), abStop(1, 'var(--ab-glow)', 0)]),
        lin('t', 'var(--ab-tile-a)', 'var(--ab-tile-b)', true),
        abEl('linearGradient', { id: id('h'), x1: 0, y1: 0, x2: 0, y2: 1 }, [abStop(0, '#fff', 0.32), abStop(0.55, '#fff', 0)]),
        abEl('filter', { id: id('f'), x: '-50%', y: '-50%', width: '200%', height: '200%' }, [abEl('feGaussianBlur', { stdDeviation: 7 })]),
      ] : []),
      lin('b', 'var(--ab-bubble-a)', 'var(--ab-bubble-b)', true),
      /* the rating art's literal stops (they read on the band in both themes, so no tokens; ★ S14 #1288: their offset
         shades are navy now, was violet, for the blue band) */
      abEl('radialGradient', { id: id('hr'), cx: 0.35, cy: 0.3, r: 0.85 }, [abStop(0, '#FFB3C8'), abStop(0.45, '#FF6F96'), abStop(1, '#E23A6A')]),
      abEl('radialGradient', { id: id('st'), cx: 0.38, cy: 0.3, r: 0.85 }, [abStop(0, '#FFF1B8'), abStop(0.5, '#FFD15C'), abStop(1, '#F2A93B')]),
    ]),
    ...centre,
    abEl('ellipse', { cx: 150, cy: 84, rx: 118, ry: 34, fill: 'none', style: 'stroke:var(--ab-orbit)', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-dasharray': '0.1 6' }),
    ...tileRects,
    /* the heart (the rating art's path, scaled): a soft offset shade under it instead of a blur filter, then the gloss */
    abEl('g', { transform: 'translate(58 50.5) scale(0.84)' }, [
      abEl('path', { d: AB_HEART, transform: 'translate(0 2.6)', fill: '#0d2f6b', 'fill-opacity': 0.26 }),
      abEl('path', { d: AB_HEART, fill: url('hr') }),
      abEl('path', { d: 'M-12.5 5.2c2.6-1.6 5.6-.7 6.9 1', fill: 'none', stroke: '#fff', 'stroke-opacity': 0.7, 'stroke-width': 2.4, 'stroke-linecap': 'round' }),
    ]),
    /* the chat bubble with its three dots */
    abEl('path', { d: 'M214 39a9 9 0 0 1 9 -9h24a9 9 0 0 1 9 9v8a9 9 0 0 1 -9 9h-18l-7 6v-6.6a9 9 0 0 1 -8 -8.4z', fill: url('b') }),
    abEl('g', { style: 'fill:var(--ab-bubble-dot)' }, [226, 235, 244].map((cx) => abEl('circle', { cx, cy: 43, r: 2.4 }))),   /* ★ S14 (#1288): blue dots in the now-white bubble */
    /* the gold star (the rating art's), its shade and its small highlight */
    abEl('g', { transform: 'translate(244 104)' }, [
      abEl('path', { d: AB_STAR, transform: 'translate(0 2.4)', fill: '#0d2f6b', stroke: '#0d2f6b', 'fill-opacity': 0.26, 'stroke-opacity': 0.26, 'stroke-width': 3.2, 'stroke-linejoin': 'round' }),
      abEl('path', { d: AB_STAR, fill: url('st'), stroke: url('st'), 'stroke-width': 3.2, 'stroke-linejoin': 'round' }),
      abEl('ellipse', { cx: -3.2, cy: -4.2, rx: 2.6, ry: 1.4, fill: '#fff', opacity: 0.65, transform: 'rotate(-35 -3.2 -4.2)' }),
    ]),
    abEl('g', { style: 'fill:var(--ab-spark)' }, [
      abSpark(92, 22, 5), abSpark(222, 14, 3.5), abSpark(96, 106, 4.5), abSpark(270, 74, 4),
      abEl('circle', { cx: 34, cy: 96, r: 1.6 }), abEl('circle', { cx: 268, cy: 40, r: 1.4 }), abEl('circle', { cx: 196, cy: tile ? 126 : 121, r: 1.5 }),   /* on the band: lifted off its lower edge */
    ]),
  ]);
  /* the mark is the icon registry's own `logo` (one source for the Spixi mark) */
  if (tile) {
    const mark = icon('logo', { size: 44 });
    mark.setAttribute('x', '128'); mark.setAttribute('y', '48');
    mark.setAttribute('class', 'c-settings-about__mark');
    svg.append(mark);
  }
  return svg;
}

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
  onBack,
  strings = getStrings(),
} = {}) {
  const { el, body } = appScreenShell(
    'c-settings-about', strings.about || 'About', onBack);

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
  band.append(aboutHeroArt({ tile: false }));
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
