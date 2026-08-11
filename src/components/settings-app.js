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
import { settingsConfirm } from './settings-shell.js';

// one-shot ctrl (#138 m1) — module-local unique name (house collision rule)
function appCtrl(onDone, onFail) {
  let used = false;
  return {
    done: () => { if (used) return; used = true; onDone(); },
    fail: (msg) => { if (used) return; used = true; onFail(msg); },
  };
}

// legacy contributors.html list (static; localizable via opts)
export const CONTRIBUTORS = [
  'Lex Scalp', 'w4r3z4s', '#Zinsi', '¥0_brkz', 'YT', 'Serg',
  'hau Nguyen Dinh', 'Spoony', 'Sam', 'Chris45', 'Ayze LYC', 'Dilaks',
];

const SEARCH_MIN = 8;            // search appears once the list needs scanning

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
  strings = getStrings(),
} = {}) {
  const { el, body, live } = appScreenShell(
    'c-settings-dl', strings.downloads || 'Downloads', onBack);
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

  const fileRow = ({ name, time }) => {
    const section = document.createElement('div');
    section.className = 'c-settings__section';
    const row = document.createElement('div');
    row.className = 'c-settings-dl__row';
    row.dataset.name = name;

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'c-settings-dl__open';
    const disc = document.createElement('span');
    disc.className = 'c-disc';
    disc.dataset.hue = 'info';
    disc.dataset.grad = String(discGrad('file-isr'));
    disc.append(icon('file-isr', { size: 16 }));
    const meta = document.createElement('span');
    meta.className = 'c-settings-dl__meta';
    const nm = document.createElement('span');
    nm.className = 'c-settings-dl__name';
    nm.textContent = name;                 // UNTRUSTED — textContent only
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
      meta.append(tm);
    }
    open.append(disc, meta);
    if (onOpenFile) open.addEventListener('click', () => onOpenFile(name));
    else open.disabled = true;
    row.append(open);

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
      const hit = !query || name.toLowerCase().includes(query);
      s.hidden = !hit;
      if (hit) visible++;
    }
    noMatch.hidden = !(card.childElementCount > 0 && visible === 0);
    live.textContent = query
      ? (strings.downloadsMatches || '{n} files match').split('{n}').join(String(visible))
      : '';
  }

  function render(list) {
    card.replaceChildren(...list.map(fileRow));
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

/** Wholesale list update — mirrors the clearFiles + addFile(name, ctime) push. */
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
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          () => { setSuccess(copyBtn, { label: strings.copied || 'Copied' }); },
          () => { live.textContent = strings.copyLogFailed || 'Couldn’t copy — select the log text instead.'; },
        );
      } else {
        live.textContent = strings.copyLogFailed || 'Couldn’t copy — select the log text instead.';
      }
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
    b.append(lab, icon('arrow-up-right', { size: 18 }));
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
  desc.textContent = description || strings.aboutBody
    || 'Spixi lets you chat and send IXI directly, peer-to-peer — no central server holds your messages or your keys. Everything stays on your device and the Ixian network.';
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
  legal.textContent = strings.aboutLegal || '© Ixian — open source, MIT licensed.';
  body.append(legal);

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
      body: strings.howToStep1Body || 'Share your address or QR from Account, or scan a friend’s — then send a request.' },
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
