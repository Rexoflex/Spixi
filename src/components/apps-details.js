/**
 * c-app-details — mini-app details / installer (spec §2.3; premiumised per Damir 2026-07-04).
 * Hero cover + header (icon overlaps the cover; name/publisher/verified sit BELOW it —
 * installed apps get a compact **Open pill** in the header, App-Store style), screenshots
 * strip (Store order: artwork before words), description (clamped + Read more),
 * capability CHIPS (tap-to-explain), meta rows, trust line, related tiles, an Advanced
 * disclosure for the dev install-URL. Actions: NOT installed → sticky full-width Install
 * bar (conversion CTA); installed → NO sticky bar — Open is the header pill, Uninstall is
 * a quiet destructive text-row at the page bottom (confirm modal). Install confirm =
 * c-modal (chips tap-to-explain + source); on confirm the Install button morphs inline
 * (loading → success check → re-render as installed).
 *
 * createAppDetails({ app, strings, host, onInstall(app,ctrl), onUninstall, onLaunch,
 *                    onReport, onInstalled, onCopyUrl }) → view
 *   onInstall(app, { done, fail }) — the caller runs the real install and calls done()/fail().
 */
import { createAppIcon } from './apps-icon.js';
import { hashHue } from './avatar.js';
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

/** Hero cover (App-Store style). app.cover → the artwork; otherwise the app's own
 *  icon blurred behind its deterministic hue gradient (reuses the c-app-icon hue
 *  recipe so an app's hero always matches its tile). A bottom scrim keeps the
 *  overlapping icon + name legible over bright covers. */
function appHero(app) {
  const hero = document.createElement('div');
  hero.className = 'c-app-hero';
  if (app.cover) {
    const art = document.createElement('img');
    art.className = 'c-app-hero__art';
    art.src = app.cover; art.alt = '';
    hero.append(art);
  } else {
    const hue = hashHue(app.name || 'app');
    hero.dataset.placeholder = '';
    hero.style.setProperty('--ai-h1', hue);
    hero.style.setProperty('--ai-h2', (hue + 40) % 360);
    if (app.icon) {                              // blurred copy of the icon adds depth over the gradient
      const art = document.createElement('img');
      art.className = 'c-app-hero__art';
      art.dataset.blur = '';
      art.src = app.icon; art.alt = '';
      hero.append(art);
    }
  }
  const scrim = document.createElement('div');
  scrim.className = 'c-app-hero__scrim';
  hero.append(scrim);
  return hero;
}

/** Titled section wrapper (reused by permissions / screenshots / related). */
function detailsSection(title) {
  const sec = document.createElement('section');
  sec.className = 'c-app-details__section';
  if (title) {
    const h = document.createElement('h2');
    h.className = 'c-app-details__sectiontitle';
    h.textContent = title;
    sec.append(h);
  }
  return sec;
}

/** Screenshot gallery — horizontal scroll-snap strip (rendered only when the app
 *  ships screenshots; graceful omit otherwise, pending the BE preview payload). */
function screenshotStrip(shots, strings) {
  const sec = detailsSection(strings.preview || 'Preview');
  const strip = document.createElement('div');
  strip.className = 'c-app-shots';
  strip.setAttribute('role', 'region');                  // labelled scroll region (a11y scroll-container pattern)
  strip.tabIndex = 0;                                    // focusable so the strip scrolls with arrow keys
  strip.setAttribute('aria-label', strings.preview || 'Preview');
  shots.forEach((src, i) => {
    const img = document.createElement('img');
    img.className = 'c-app-shots__item';
    img.loading = 'lazy';
    img.src = src;
    img.alt = (strings.screenshot || 'Screenshot') + ' ' + (i + 1) + ' / ' + shots.length;   // region has readable content
    strip.append(img);
  });
  sec.append(strip);
  return sec;
}

/** "More mini apps" — compact tappable tiles (reuse c-app-icon). Each opens that
 *  app's details via onOpen. Rendered only when the app carries related entries. */
function relatedStrip(related, strings, onOpen) {
  const sec = detailsSection(strings.moreApps || 'More mini apps');
  const strip = document.createElement('div');
  strip.className = 'c-app-related';
  for (const rel of related) {
    // plain buttons — role="listitem" would override button semantics for SRs (#106③ precedent)
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'c-app-related__item';
    tile.append(createAppIcon({ src: rel.icon, name: rel.name, size: 56 }));
    const nm = document.createElement('span');
    nm.className = 'c-app-related__name';
    nm.textContent = rel.name || '';
    tile.append(nm);
    if (onOpen) tile.addEventListener('click', () => onOpen(rel));
    strip.append(tile);
  }
  sec.append(strip);
  return sec;
}

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
  if (explain) {
    line = document.createElement('p');
    line.className = 'c-app-caps__explain';
    line.setAttribute('role', 'status');                 // announce chip-tap explanations to SRs (polite)
    if (reserve) line.dataset.reserve = '';
  }
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

export function createAppDetails({ app = {}, strings = {}, host, onInstall, onUninstall, onLaunch, onReport, onInstalled, onCopyUrl, onOpen } = {}) {
  const el = document.createElement('div');
  el.className = 'c-app-details';
  const caps = normalizeCaps(app.capabilities);

  /* hero cover + overlapping header */
  el.append(appHero(app));
  const header = document.createElement('div');
  header.className = 'c-app-details__header';
  header.append(createAppIcon({ src: app.icon, name: app.name, size: 72 }));
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
  if (app.installed) {
    // installed → compact Open pill in the header (App-Store pattern); no sticky bar
    const openPill = createButton({ label: strings.openApp || 'Open', type: 'fill', size: 44,
      icon: icon('player-play', { size: 18 }), onClick: () => { if (onLaunch) onLaunch(app); } });
    openPill.classList.add('c-app-details__openpill');
    header.append(openPill);
  }
  el.append(header);

  /* screenshots first — artwork sells before words (Store order; graceful omit without previews) */
  if (Array.isArray(app.screenshots) && app.screenshots.length) {
    el.append(screenshotStrip(app.screenshots, strings));
  }

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
    more.setAttribute('aria-expanded', 'false');
    more.addEventListener('click', () => {
      const clamped = desc.dataset.clamped !== undefined;
      if (clamped) delete desc.dataset.clamped; else desc.dataset.clamped = '';
      more.textContent = clamped ? (strings.readLess || 'Read less') : (strings.readMore || 'Read more');
      more.setAttribute('aria-expanded', clamped ? 'true' : 'false');
    });
    // only show "Read more" when the text actually clamps (overflows the line-clamp).
    // measured after layout — the view isn't in the DOM at build time.
    more.hidden = true;
    const revealIfClamped = () => { more.hidden = !(desc.scrollHeight > desc.clientHeight + 1); };
    if (typeof ResizeObserver !== 'undefined') {
      // stays observing (rotation/resize can change the clamp); syncs only while STILL
      // clamped so it never fights an expanded state. GC'd with the view (self-referential).
      const ro = new ResizeObserver(() => {
        if (desc.clientHeight > 0 && desc.dataset.clamped !== undefined) revealIfClamped();
      });
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
  metaRow(strings.developer || 'Developer', publisher);
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

  /* more mini apps (graceful — only when related entries are provided) */
  if (Array.isArray(app.related) && app.related.length) {
    el.append(relatedStrip(app.related, strings, onOpen));
  }

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
        showToast({ text: strings.copied || 'Copied', tone: 'success', host });
      });
      urlRow.append(u, copyBtn);
      adv.append(urlRow);
      const shareHint = document.createElement('p');
      shareHint.className = 'c-app-details__sharehint';
      shareHint.textContent = strings.shareHint
        || 'Share this link with anyone — they can add the app in Spixi from it.';
      adv.append(shareHint);
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

  /* actions — installed: quiet destructive Uninstall row at the very bottom (scrolled-to,
     not sticky; Open lives as the header pill + list tap-to-launch). Not-installed: the
     sticky Install bar stays — it's a conversion CTA and the page's single action. */
  if (app.installed) {
    const danger = document.createElement('div');
    danger.className = 'c-app-details__danger';
    danger.append(createButton({ label: strings.uninstall || 'Uninstall', type: 'text', size: 44, width: 'full', intent: 'destructive',
      icon: icon('trash', { size: 20 }), onClick: () => openUninstallConfirm({ app, host, strings, onUninstall }) }));
    el.append(danger);
  } else {
    const actions = document.createElement('div');
    actions.className = 'c-app-details__actions';
    const installBtn = createButton({ label: strings.install || 'Install', type: 'fill', size: 56, width: 'full',
      icon: icon('download', { size: 20 }),
      onClick: () => openInstallConfirm({ app, caps, host, strings, onInstall, installBtn, onInstalled }) });
    actions.append(installBtn);
    el.append(actions);
  }
  return el;
}

/* —— install confirm = c-modal (rich content slot) → inline button morph —— */
function openInstallConfirm({ app, caps, host, strings, onInstall, installBtn, onInstalled }) {
  const content = document.createElement('div');
  content.className = 'c-app-install';
  // identity anchor — the app's icon (same deterministic hue as its tile/hero) so the
  // dialog visually reads as THIS app, Store-install style. Reuses c-app-icon, no new assets.
  const idrow = document.createElement('div');
  idrow.className = 'c-app-install__icon';
  idrow.append(createAppIcon({ src: app.icon, name: app.name, size: 48 }));
  content.append(idrow);
  if (caps.length) {
    const lead = document.createElement('p');
    lead.className = 'c-app-install__lead';
    lead.textContent = strings.installLead || 'This app can do the following — tap any to learn more:';
    content.append(lead, capChips(caps, strings, { explain: true, reserve: true }));
  }
  if (app.url) {
    const src = document.createElement('p');
    src.className = 'c-app-install__src';
    // domain, not the full URL — the dialog is a decision moment, the domain is the trust
    // signal; the full URL stays one tap away (details → Advanced). Unparseable → full string.
    let from = app.url;
    try { from = new URL(app.url).hostname || app.url; } catch { /* keep full string */ }
    src.textContent = (strings.source || 'Source: ') + from;
    src.title = app.url;
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
