/**
 * c-app-details — mini-app details / installer (spec §2.3; premiumised per Damir 2026-07-04).
 * Header (icon, name, publisher, verified badge via c-badge),
 * description (clamped + Read more), capability CHIPS (reuse c-chip readonly),
 * an Advanced disclosure for the dev install-URL, a "runs securely" trust line,
 * and the actions. Install confirm = a **c-modal** (permission chips tap-to-explain +
 * source); on confirm the Install button **morphs inline** (loading → success check →
 * re-render as installed) — no separate installing/success modals. Uninstall = confirm modal.
 *
 * createAppDetails({ app, strings, host, onInstall(app,ctrl), onUninstall, onLaunch,
 *                    onReport, onInstalled, onCopyUrl }) → view
 *   onInstall(app, { done, fail }) — the caller runs the real install and calls done()/fail().
 */
import { createAppIcon } from './apps-icon.js';
import { createButton, setLoading, setSuccess } from './button.js';
import { createChip } from './chip.js';
import { createBadge } from './badge.js';
import { createModal, openModal } from './modal.js';
import { showToast } from './toast.js';
import { icon } from './icons.js';

const APP_CAP_LABELS = {
  MultiUser: 'Multi-user',
  Authentication: 'Sign in as you',
  TransactionSigning: 'Sign transactions',
  RegisteredNamesManagement: 'Manage names',
  Storage: 'Local storage',
};
const APP_CAP_EXPLAIN = {
  MultiUser: 'Runs shared sessions so you can use this app together with friends.',
  Authentication: 'Can prove who you are to this app using your Spixi identity — without a password.',
  TransactionSigning: 'Can ask you to approve IXI payments. You always confirm each one yourself.',
  RegisteredNamesManagement: 'Can read and manage your registered Ixian names.',
  Storage: 'Can save data on your device so it remembers things between sessions.',
};

function normalizeCaps(caps) {
  let arr = [];
  if (Array.isArray(caps)) arr = caps.slice();
  else if (typeof caps === 'string') arr = caps.split(',').map((s) => s.trim());
  else if (caps && typeof caps === 'object') arr = Object.keys(caps).filter((k) => caps[k]);
  return arr.filter((c) => c && c !== 'SingleUser');
}
function capLabel(c, strings) { return strings['cap_' + c] || APP_CAP_LABELS[c] || c; }
function capExplain(c, strings) { return strings['capx_' + c] || APP_CAP_EXPLAIN[c] || ''; }

/** Capability chips (reuse c-chip readonly). explain:true → tappable chips that reveal
 *  a plain-language line beneath (the install-confirm "tap to explain"). */
function capChips(caps, strings, { explain = false, reserve = false } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'c-app-caps';
  const row = document.createElement('div');
  row.className = 'c-app-caps__row';
  let line;
  // explain → tappable chips that fill a plain-language line. reserve (modal only) pins
  // the line's height so revealing text doesn't resize the dialog (flicker). In the details
  // page there's no modal to flicker, so the line just grows.
  if (explain) { line = document.createElement('p'); line.className = 'c-app-caps__explain'; if (reserve) line.dataset.reserve = ''; }
  for (const c of caps) {
    if (explain) {
      row.append(createChip({
        label: capLabel(c, strings), icon: 'shield-lock', size: 'small',
        onClick: () => { line.textContent = capExplain(c, strings); },
      }));
    } else {
      row.append(createChip({ label: capLabel(c, strings), icon: 'shield-lock', size: 'small', readonly: true }));
    }
  }
  wrap.append(row);
  if (explain) wrap.append(line);
  return wrap;
}

export function createAppDetails({ app = {}, strings = {}, host, onInstall, onUninstall, onLaunch, onReport, onInstalled, onCopyUrl } = {}) {
  const el = document.createElement('div');
  el.className = 'c-app-details';
  const caps = normalizeCaps(app.capabilities);

  /* header */
  const header = document.createElement('div');
  header.className = 'c-app-details__header';
  header.append(createAppIcon({ src: app.icon, name: app.name, size: 64 }));
  const htext = document.createElement('div');
  htext.className = 'c-app-details__heading';
  const name = document.createElement('h1');
  name.className = 'c-app-details__name';
  name.textContent = app.name || '';
  htext.append(name);
  const pubrow = document.createElement('div');
  pubrow.className = 'c-app-details__pubrow';
  const publisher = app.publisher || app.creator;   // list row calls it "creator"; bridge init calls it "publisher"
  if (publisher) {
    const pub = document.createElement('span');
    pub.className = 'c-app-details__publisher';
    pub.textContent = publisher;
    pubrow.append(pub);
  }
  if (app.verified) pubrow.append(createBadge({ label: strings.verified || 'Verified', type: 'accent', icon: 'checks' }));
  htext.append(pubrow);
  header.append(htext);
  el.append(header);

  /* description (clamped + Read more) */
  if (app.description) {
    const desc = document.createElement('p');
    desc.className = 'c-app-details__desc';
    desc.dataset.clamped = '';
    desc.textContent = app.description;
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'c-app-details__more';
    more.textContent = strings.readMore || 'Read more';
    more.addEventListener('click', () => {
      const clamped = desc.dataset.clamped !== undefined;
      if (clamped) delete desc.dataset.clamped; else desc.dataset.clamped = '';
      more.textContent = clamped ? (strings.readLess || 'Read less') : (strings.readMore || 'Read more');
    });
    // only show "Read more" when the text actually clamps (overflows the line-clamp).
    // measured after layout — the view isn't in the DOM at build time.
    more.hidden = true;
    const revealIfClamped = () => { more.hidden = !(desc.scrollHeight > desc.clientHeight + 1); };
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => { if (desc.clientHeight > 0) { revealIfClamped(); ro.disconnect(); } });
      ro.observe(desc);
    } else if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(revealIfClamped);
    }
    el.append(desc, more);
  }

  /* capability chips (display) */
  if (caps.length) {
    const sec = document.createElement('section');
    sec.className = 'c-app-details__section';
    const h = document.createElement('h2');
    h.className = 'c-app-details__sectiontitle';
    h.textContent = strings.permissions || 'Permissions';
    sec.append(h, capChips(caps, strings, { explain: true }));   // tap a chip → plain-language line (grows; no modal to flicker)
    el.append(sec);
  }

  /* meta rows */
  const meta = document.createElement('div');
  meta.className = 'c-app-details__meta';
  const metaRow = (label, value) => {
    if (value == null || value === '') return;
    const r = document.createElement('div');
    r.className = 'c-app-details__metarow';
    const l = document.createElement('span');
    l.className = 'c-app-details__metalabel';
    l.textContent = label;
    const v = document.createElement('span');
    v.className = 'c-app-details__metavalue';
    v.textContent = String(value);
    r.append(l, v);
    meta.append(r);
  };
  metaRow(strings.version || 'Version', app.version);
  metaRow(strings.size || 'Size', app.size);
  if (meta.childNodes.length) el.append(meta);

  /* trust line */
  const trust = document.createElement('p');
  trust.className = 'c-app-details__trust';
  trust.append(icon('shield-lock', { size: 16 }));
  const tt = document.createElement('span');
  tt.textContent = strings.runsSecurely || 'Runs securely inside Spixi — nothing leaves your device without your permission.';
  trust.append(tt);
  el.append(trust);

  /* Advanced disclosure — dev install URL + copy + app id */
  if (app.url || app.id) {
    const adv = document.createElement('details');
    adv.className = 'c-app-details__advanced';
    const sum = document.createElement('summary');
    sum.textContent = strings.advanced || 'Advanced';
    adv.append(sum);
    if (app.url) {
      const urlRow = document.createElement('div');
      urlRow.className = 'c-app-details__url';
      const u = document.createElement('span');
      u.className = 'c-app-details__urlvalue';
      u.textContent = app.url;
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'c-app-details__copy';
      copyBtn.setAttribute('aria-label', strings.copyUrl || 'Copy link');
      copyBtn.append(icon('copy', { size: 18 }));
      copyBtn.addEventListener('click', () => {
        if (onCopyUrl) onCopyUrl(app.url);
        showToast({ text: strings.copied || 'Link copied', tone: 'success', host });
      });
      urlRow.append(u, copyBtn);
      adv.append(urlRow);
    }
    if (app.id) {
      const idRow = document.createElement('div');
      idRow.className = 'c-app-details__metarow';
      const l = document.createElement('span'); l.className = 'c-app-details__metalabel'; l.textContent = strings.appId || 'App ID';
      const v = document.createElement('span'); v.className = 'c-app-details__metavalue'; v.textContent = String(app.id);
      idRow.append(l, v); adv.append(idRow);
    }
    el.append(adv);
  }

  /* actions */
  const actions = document.createElement('div');
  actions.className = 'c-app-details__actions';
  if (app.installed) {
    actions.append(
      createButton({ label: strings.openApp || 'Open', type: 'fill', size: 56, width: 'full',
        icon: icon('player-play', { size: 20 }), onClick: () => { if (onLaunch) onLaunch(app); } }),
      createButton({ label: strings.uninstall || 'Uninstall', type: 'outline', size: 56, width: 'full', intent: 'destructive',
        icon: icon('trash', { size: 20 }), onClick: () => openUninstallConfirm({ app, host, strings, onUninstall }) }),
    );
  } else {
    const installBtn = createButton({ label: strings.install || 'Install', type: 'fill', size: 56, width: 'full',
      icon: icon('download', { size: 20 }),
      onClick: () => openInstallConfirm({ app, caps, host, strings, onInstall, installBtn, onInstalled }) });
    actions.append(installBtn);
  }
  el.append(actions);
  return el;
}

/* —— install confirm = c-modal (rich content slot) → inline button morph —— */
function openInstallConfirm({ app, caps, host, strings, onInstall, installBtn, onInstalled }) {
  const content = document.createElement('div');
  content.className = 'c-app-install';
  if (caps.length) {
    const lead = document.createElement('p');
    lead.className = 'c-app-install__lead';
    lead.textContent = strings.installLead || 'This app can do the following — tap any to learn more:';
    content.append(lead, capChips(caps, strings, { explain: true, reserve: true }));
  }
  if (app.url) {
    const src = document.createElement('p');
    src.className = 'c-app-install__src';
    src.textContent = (strings.source || 'Source: ') + app.url;
    content.append(src);
  }
  openModal(createModal({
    title: (strings.installTitle || 'Install {name}?').split('{name}').join(app.name || 'this app'),
    content, role: 'dialog', host,
    actions: [
      { label: strings.cancel || 'Cancel', type: 'text', autofocus: true },
      { label: strings.install || 'Install', type: 'fill', onClick: () => runInstall({ app, host, strings, onInstall, installBtn, onInstalled }) },
    ],
  }));
}

/** Inline install morph: button → loading → success check → onInstalled (re-render installed). */
function runInstall({ app, host, strings, onInstall, installBtn, onInstalled }) {
  if (!installBtn) { if (onInstall) onInstall(app, { done: () => {}, fail: () => {} }); return; }
  setLoading(installBtn, true);
  const done = () => {
    setLoading(installBtn, false);
    setSuccess(installBtn, { label: strings.installed || 'Installed' });
    if (onInstalled) setTimeout(() => onInstalled(app), 1200);   // re-render as installed after the check
  };
  const fail = () => { setLoading(installBtn, false); showAppInstallFailed({ host, strings }); };
  if (onInstall) onInstall(app, { done, fail }); else done();
}

function openUninstallConfirm({ app, host, strings, onUninstall }) {
  openModal(createModal({
    title: strings.uninstallTitle || 'Uninstall app?',
    body: (strings.uninstallBody || 'This removes {name} from your device.').split('{name}').join(app.name || 'this app'),
    role: 'alertdialog', host,
    actions: [
      { label: strings.cancel || 'Cancel', type: 'text', autofocus: true },
      { label: strings.uninstall || 'Uninstall', type: 'fill', intent: 'destructive', onClick: () => { if (onUninstall) onUninstall(app); } },
    ],
  }));
}

/* —— bridge-driven progress states (kept for the C# showInstalling/…Failed hooks) —— */
export function showAppInstalling({ host, strings = {}, name = '' } = {}) {
  const m = createModal({
    title: strings.installing || 'Installing…',
    body: (strings.installingBody || 'Installing {name}…').split('{name}').join(name || 'the app'),
    host, escDismiss: false,
  });
  openModal(m);
  return m;
}
export function showAppInstalled({ host, strings = {}, onView } = {}) {
  openModal(createModal({
    title: strings.installedTitle || 'Installed', body: strings.installedBody || 'The mini app is ready to use.',
    host, actions: [{ label: strings.viewApp || 'View app', type: 'fill', autofocus: true, onClick: () => { if (onView) onView(); } }],
  }));
}
export function showAppInstallFailed({ host, strings = {} } = {}) {
  openModal(createModal({
    title: strings.failedTitle || 'Install failed', body: strings.failedBody || 'Something went wrong installing this app. Please try again.',
    role: 'alertdialog', host, actions: [{ label: strings.ok || 'OK', type: 'fill', autofocus: true }],
  }));
}
export function showAppRemoved({ host, strings = {} } = {}) {
  openModal(createModal({
    title: strings.removedTitle || 'App removed', body: strings.removedBody || 'The mini app was uninstalled.',
    host, actions: [{ label: strings.ok || 'OK', type: 'fill', autofocus: true }],
  }));
}
