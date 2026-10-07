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
import { formatFileSize } from './shared-items.js';         // ★★ #1107: one size format (chat info + Downloads)

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
  function openSenderSheet() {
    const options = [{ value: '', label: strings.downloadsAllSenders || 'Everyone' }]
      .concat([...senders.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([k, l]) => ({ value: k, label: l })));
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
  return el;
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
   onOpenLink callback (no bridge verb exists → the shells don't wire it; when
   absent the URL renders as SELECTABLE TEXT rather than trying to navigate the
   WebView away). Untrusted-safe: labels/urls are curated in-code, textContent only. */
function linkRow({ label, url, onOpenLink, strings }) {
  if (onOpenLink) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-settings-links__row';
    const lab = document.createElement('span');
    lab.className = 'c-settings-links__label';
    lab.textContent = label;
    b.append(lab, icon('external-link', { size: 18 }));   // #710: "opens outside the app" — arrow-up-right is money (#709)
    b.addEventListener('click', () => onOpenLink(url));
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

/**
 * About — createSettingsAbout({ appName, version, tagline, description, links,
 * onOpenLink, onBack, strings }). STATIC in-hub takeover, zero-C# (no bridge).
 * Version shows only when provided (SPIXI_ENV / §9 push — no bridge push today).
 * Links degrade to selectable text unless onOpenLink is wired.
 */
export function createSettingsAbout({
  appName = 'Spixi',
  version = '',
  tagline,
  description,
  links,
  onOpenLink,                    // OPTIONAL (url) — wired since iOS-21 (ixian:openLink)
  host,                          // iOS-23: sheet host for the legal doc sheets
  devSeed,                       // ★ Session I: OPTIONAL { onSeed, onUnseed, status } — the DEV-BUILD seed harness (see below); absent = no card
  onBack,
  strings = getStrings(),
} = {}) {
  const { el, body } = appScreenShell(
    'c-settings-about', strings.about || 'About', onBack);

  /* hero — logo disc + app name + tagline (backup-hero / contributors art precedent) */
  const hero = document.createElement('div');
  hero.className = 'c-settings-about__hero';
  const disc = document.createElement('span');
  disc.className = 'c-disc c-settings-about__logo';
  disc.dataset.hue = 'accent';
  disc.dataset.grad = String(discGrad('logo'));
  disc.append(icon('logo', { size: 32 }));
  const nameEl = document.createElement('h2');
  nameEl.className = 'c-settings-about__app-name';
  nameEl.textContent = appName;
  const tag = document.createElement('p');
  tag.className = 'c-settings-about__tagline';
  tag.textContent = tagline || strings.aboutTagline
    || 'Private, decentralized messaging on the Ixian network.';
  hero.append(disc, nameEl, tag);
  if (version) {
    const ver = document.createElement('p');
    ver.className = 'c-settings-about__version';
    ver.textContent = version;
    hero.append(ver);
  }
  body.append(hero);

  const desc = document.createElement('p');
  desc.className = 'c-settings__note c-settings-about__desc';
  // ★ S9 A-10 (#1245, audit S-07): in-transit wording (history is not encrypted at rest), NEW key
  desc.textContent = description || strings.aboutBody2
    || 'Spixi lets you chat and send IXI directly, peer to peer. Your messages are end-to-end encrypted and your keys never leave your device.';
  body.append(desc);

  /* links card — website / network / source (degrade to text without onOpenLink) */
  const list = links || [
    { label: strings.aboutLinkWebsite || 'Website', url: 'https://www.spixi.io' },
    { label: strings.aboutLinkNetwork || 'Ixian network', url: 'https://www.ixian.io' },
    { label: strings.aboutLinkSource || 'Source code', url: 'https://github.com/ixian-platform/Spixi' },
  ];
  if (list.length) {
    const groupWrap = document.createElement('div');
    groupWrap.className = 'c-settings__groupwrap';
    const card = document.createElement('div');
    card.className = 'c-settings__group c-settings-links';
    for (const l of list) card.append(linkRow({ ...l, onOpenLink, strings }));
    groupWrap.append(card);
    body.append(groupWrap);
  }

  /* iOS-23 — Terms of Use + Privacy Policy were missing from About entirely.
     They open as the SAME in-app doc sheets onboarding uses (openLegalDoc →
     launch-shell.js), NOT as external links: app-controlled copy, works with no
     network, and English-only by #169. Nothing here depends on onOpenLink. */
  const docs = [
    { label: strings.termsLink || 'Terms of Use', doc: 'terms' },
    { label: strings.privacyLink || 'Privacy Policy', doc: 'privacy' },
  ];
  const docWrap = document.createElement('div');
  docWrap.className = 'c-settings__groupwrap';
  const docCard = document.createElement('div');
  docCard.className = 'c-settings__group c-settings-links';
  for (const d of docs) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-settings-links__row';
    const lab = document.createElement('span');
    lab.className = 'c-settings-links__label';
    lab.textContent = d.label;
    b.append(lab, icon('chevron-right', { size: 18 }));
    b.addEventListener('click', () => openLegalDoc({ doc: d.doc, host, strings }));
    docCard.append(b);
  }
  docWrap.append(docCard);
  body.append(docWrap);

  const legal = document.createElement('p');
  legal.className = 'c-settings__note c-settings-about__legal';
  legal.textContent = strings.aboutLegal || '© Ixian. Open source, MIT licensed.';
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

/**
 * How to use — createSettingsHowTo({ steps, links, onOpenLink, onBack, strings }).
 * STATIC in-hub takeover, zero-C#. Brief getting-started steps + an optional docs
 * link (degrades to text without onOpenLink).
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
  onBack,
  strings = getStrings(),
} = {}) {
  const { el, body } = appScreenShell(
    'c-settings-howto', strings.howToUse || 'How to use Spixi', onBack);

  const intro = document.createElement('p');
  intro.className = 'c-settings__note c-settings-howto__intro';
  intro.textContent = strings.howToIntro || 'A few basics to get you started.';
  body.append(intro);

  const list = steps || [
    { title: strings.howToStep1 || 'Add a contact',
      body: strings.howToStep1Body || 'Share your address or QR from Account, or scan a friend’s. Then send a request.' },
    { title: strings.howToStep2 || 'Start chatting',
      body: strings.howToStep2Body || 'Open a contact to send messages, photos and files. Everything is end-to-end between your devices.' },
    { title: strings.howToStep3 || 'Send IXI',
      body: strings.howToStep3Body || 'Send or request IXI right inside a chat. You confirm every payment on your device.' },
    { title: strings.howToStep4 || 'Back up your wallet',
      body: strings.howToStep4Body || 'Save one encrypted backup file from Account → Backup. Without it and your password, nothing can be recovered.' },
  ];
  const groupWrap = document.createElement('div');
  groupWrap.className = 'c-settings__groupwrap';
  const card = document.createElement('div');
  card.className = 'c-settings__group c-settings-howto__steps';
  let i = 0;
  for (const s of list) {
    i++;
    const step = document.createElement('div');
    step.className = 'c-settings-howto__step';
    const num = document.createElement('span');
    num.className = 'c-settings-howto__step-num';
    num.textContent = String(i);
    const txt = document.createElement('span');
    txt.className = 'c-settings-howto__step-text';
    const t = document.createElement('span');
    t.className = 'c-settings-howto__step-title';
    t.textContent = s.title;
    const b = document.createElement('span');
    b.className = 'c-settings-howto__step-body';
    b.textContent = s.body;
    txt.append(t, b);
    step.append(num, txt);
    card.append(step);
  }
  groupWrap.append(card);
  body.append(groupWrap);

  /* ★ Item 6: the community row. One-shot in the DOCUMENT (this takeover is rebuilt
     ⚠ i18n: this is a hand-built link-row, not a createButton/createChip, so
     scripts/i18n-overflow-audit.mjs does NOT harvest its labels — a clean overflow run
     says nothing about them. It is safe because .c-settings-links__label sets no
     white-space and has flex:1, so a long localized label WRAPS inside the 52px row
     rather than clipping. Keep it that way, or teach the audit this grammar first.
     on every open, so the latch does not persist — deliberately: the host knows
     nothing about the roster, and the honest failure is a second request, which
     addFriend absorbs). It reports done in place rather than through a toast, because
     the user is looking straight at the control they pressed. */
  if (onJoinCommunity) {
    const jw = document.createElement('div');
    jw.className = 'c-settings__groupwrap';
    const jc = document.createElement('div');
    jc.className = 'c-settings__group c-settings-links';
    const jb = document.createElement('button');
    jb.type = 'button';
    jb.className = 'c-settings-links__row c-settings-howto__join';
    const jlab = document.createElement('span');
    jlab.className = 'c-settings-links__label';
    jlab.textContent = strings.howToJoinCta || 'Join the Spixi community';
    const jglyph = icon('users', { size: 18 });
    jb.append(jlab, jglyph);
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
    jc.append(jb);
    const note = document.createElement('p');
    note.className = 'c-settings__note';
    note.textContent = strings.howToJoinBody
      || 'Adds the Spixi group chat to your chats, where you can ask questions and follow updates.';
    jw.append(jc, note);
    body.append(jw);
  }

  const linkList = links || [
    // iOS-21: the help centre, not the marketing home page — this is the
    // "how to use Spixi" destination (mirrors Config.guideUrl, Meta/Config.cs:32).
    { label: strings.howToLearnMore || 'Learn more', url: 'https://www.spixi.io/help-center.html' },
  ];
  if (linkList.length) {
    const lw = document.createElement('div');
    lw.className = 'c-settings__groupwrap';
    const lc = document.createElement('div');
    lc.className = 'c-settings__group c-settings-links';
    for (const l of linkList) lc.append(linkRow({ ...l, onOpenLink, strings }));
    lw.append(lc);
    body.append(lw);
  }

  return el;
}
