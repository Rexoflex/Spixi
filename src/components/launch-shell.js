/**
 * launch-shell — welcome carousel · create · restore · retry · onboarding tail
 * (docs/launch-spec.md, Phase 1 #5 — the LAST Phase-1 surface). Absorbs the
 * five legacy launch pages (ARCHITECTURE §5 row 1): intro / intro_new /
 * intro_restore / intro_retry / onboarding. Bridge grammar (bridge-audit-A
 * §7–10, audit-B OnboardPage — FROZEN): introload · accept · language:<code> ·
 * appearance:<int> · create:<nick>:<password> · avatar · selectfile ·
 * restore:<password> · proceed:<password> · joinbot · finish · back.
 *
 * Interview #0 (Damir 2026-07-06): ① welcome carousel ② the #160 brand
 * treatment (fixed-dark pin + brand gradient + bare glowing logo) is
 * WELCOME-ONLY — create/restore/retry/tail are normal themed surfaces
 * ③ tail = backup nudge (backup-ux-spec §3.3) + joinbot step ④ [L2] the
 * window-pagehide scrub also lands on createLockScreen (lock-shell.js).
 *
 * PREMIUM REWORK (Damir demo pass 2026-07-06): single full-bleed screen —
 * 4-slide autoplay carousel (LEGACY step1–4 art + copy, dark set — the
 * shipped intro.html illustrations, reused verbatim) over always-pinned
 * CTAs · language pill + appearance control reuse the settings sheets
 * (settingsOptionSheet #148⑥ flags / settingsThemeSheet #147 preview tiles —
 * ONE picker grammar app-wide) · terms = fine print; the first Create/Restore
 * tap emits ixian:accept (continuing = agreeing — no checkbox) · welcome
 * rides the new --gradient-launch (Damir "more premium colors" ask; the lock
 * keeps --gradient-lock until he converges them).
 *
 * SECURITY.md: passwords live ONLY in field values, transiently — scrubbed on
 * back / ctrl.done / window pagehide (#162 grammar; the shell registers ONE
 * self-cleaning window listener that scrubs every password field it owns).
 * Passwords are NEVER trimmed. NO logging of any kind in this file
 * (smoke-guarded like lock-shell).
 *
 * C# parse hazards gated inline (launch-spec §1, the ENC_DELIM precedent):
 * ixian:create:<nick>:<password> — nick = text up to the FIRST ':' and the
 * password remainder is Replace(nick+":","")-ed, so a nick containing ':' or
 * a password containing '<nick>:' would be silently corrupted. Never sent.
 *
 * createLaunchShell({ view, termsRequired, version, onLanguage(code),
 *   onAppearance(int), onAcceptTerms, onCreateAccount(nick, pass, ctrl),
 *   onPickAvatar, onSelectFile, onRestore(pass, ctrl), onRetry(pass, ctrl),
 *   onBackupNow, onJoinBot, onFinish, onBack(view), strings, host })
 *   Ctrl contract (spec §3): one-shot done/fail; NO auto-release anywhere —
 *   create has no covering alert (indefinite loading, flag §6②); restore
 *   fails via showPasswordError → ctrl.fail(msg); retry's host maps
 *   removeLoadingOverlay → ctrl.fail('') = SILENT restore (the native alert
 *   already spoke — the unlock-screen grammar).
 *
 * Free fns (#44, C#→JS mirrors): setLaunchView(el, view) ·
 *   setLaunchVersion(el, v) ← setVersion · setLaunchTerms(el, required) ←
 *   showTerms · setLaunchAvatar(el, src) ← loadAvatar ·
 *   setLaunchFile(el, name) ← setUploadedFileName.
 */
import { icon } from './icons.js';
import { createTopbar } from './topbar.js';
import { createButton, setLoading, setSuccess } from './button.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';
import { createAvatar } from './avatar.js';
import { passwordField, ENC_MIN } from './lock-shell.js';
import { settingsOptionSheet, settingsThemeSheet } from './settings-shell.js';

const launchState = new WeakMap(); // el → st

const LAUNCH_VIEWS = ['welcome', 'create', 'restore', 'retry', 'tail'];

function launchCtrl(onDone, onFail) {            // one-shot (lockCtrl grammar)
  let used = false;
  return {
    done: (payload) => { if (used) return; used = true; onDone(payload); },
    fail: (msg) => { if (used) return; used = true; onFail(msg); },
  };
}

/* —— illustration slots ————————————————————————————————————
   Welcome slides reuse the SHIPPED legacy art verbatim (img/dark/onboarding/
   step1–4.svg, copied to src/demo/images/onboarding/ — Damir premium rework;
   the welcome is pinned dark so only the dark set rides). The backup nudge
   keeps its placeholder (nano-banana asset #6 pending, illustrations-plan §2
   palette; data-placeholder = the swap stays deliberate). Static strings
   only — innerHTML carries no user data. */
const ILLO_G = (id) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">`
  + '<stop offset="0" stop-color="#3050bd"/><stop offset="1" stop-color="#515ee6"/>'
  + '</linearGradient></defs>';
const ILLOS = {
  backup:
    `<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">${ILLO_G('ilg-b')}`
    + '<circle cx="120" cy="126" r="84" fill="#e3e4fe"/>'
    + '<path d="M120 44 L180 66 V132 Q180 178 120 200 Q60 178 60 132 V66 Z" fill="url(#ilg-b)"/>'
    + '<rect x="94" y="92" width="52" height="68" rx="10" fill="#f9fafb"/>'
    + '<circle cx="110" cy="110" r="7" fill="#769dff"/>'
    + '<circle cx="130" cy="110" r="7" fill="#b7c9f4"/>'
    + '<rect x="104" y="128" width="32" height="8" rx="4" fill="#cbcffe"/>'
    + '<rect x="104" y="142" width="24" height="8" rx="4" fill="#cbcffe"/>'
    + '</svg>',
};

function illoSlot(name) {
  const slot = document.createElement('div');
  slot.className = 'c-launch__illo';
  slot.dataset.illo = name;                      // illustrations-plan naming
  slot.dataset.placeholder = 'true';             // real-asset swap = deliberate
  slot.setAttribute('aria-hidden', 'true');      // decorative — copy carries meaning
  slot.innerHTML = ILLOS[name] || '';
  return slot;
}

/* —— view plumbing ———————————————————————————————————————————— */

function show(st, view) {
  st.view = view;
  st.root.dataset.view = view;
  for (const [name, node] of Object.entries(st.views)) node.hidden = name !== view;
}

const errLine = () => {
  const err = document.createElement('p');
  err.className = 'c-lock__error';               // one error grammar (lock kinship)
  err.setAttribute('role', 'alert');
  err.hidden = true;
  return err;
};

const textInput = ({ label, name }) => {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'c-launch__input';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = label;
  input.setAttribute('aria-label', label);
  if (name) input.dataset.field = name;
  return input;
};

/* —— welcome (the ONLY brand view — #160 treatment; premium rework) ——— */

function hostEl(st) {
  return st.opts.host || st.root.closest('.demo-phone') || undefined;
}

// #148⑥ inventory shape (settings parity — flags emoji now, SVG swaps later);
// overridable via opts.languages, real list ships with i18n (Phase 3)
const LAUNCH_LANGS = [
  { code: 'en-us', label: 'English', flag: '🇺🇸' },
  { code: 'zh-cn', label: '中文', flag: '🇨🇳' },
  { code: 'es-co', label: 'Español', flag: '🇨🇴' },
  { code: 'de-de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr-fr', label: 'Français', flag: '🇫🇷' },
  { code: 'it-it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'ja-jp', label: '日本語', flag: '🇯🇵' },
  { code: 'pt-br', label: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'ru-ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'sl-si', label: 'Slovenščina', flag: '🇸🇮' },
  { code: 'sr-sp', label: 'Srpski', flag: '🇷🇸' },
];

function buildWelcome(st) {
  const { opts } = st;
  const strings = st.strings;
  const v = document.createElement('div');
  v.className = 'c-launch__welcome';
  v.dataset.theme = 'dark';                      // #20/#160 subtree pin — welcome only

  // — floating top controls: language pill + appearance. BOTH open the
  //   settings sheets (one picker grammar app-wide; the sheets mount on the
  //   host OUTSIDE the dark pin — the lock hatch-modal precedent) —
  const top = document.createElement('div');
  top.className = 'c-launch__top';

  const languages = (opts.languages && opts.languages.length) ? opts.languages : LAUNCH_LANGS;
  st.language = opts.language || languages[0].code;
  const langPill = document.createElement('button');
  langPill.type = 'button';
  langPill.className = 'c-launch__pill';
  langPill.setAttribute('aria-haspopup', 'dialog');
  const langFlag = document.createElement('span');
  langFlag.className = 'c-launch__pill-flag';
  langFlag.setAttribute('aria-hidden', 'true');
  const langLabel = document.createElement('span');
  langLabel.className = 'c-launch__pill-label';
  const syncLang = () => {
    const cur = languages.find((l) => l.code === st.language) || languages[0];
    langFlag.textContent = cur.flag || '';
    langFlag.hidden = !cur.flag;
    langLabel.textContent = cur.label;
    langPill.setAttribute('aria-label', (strings.language || 'Language') + ': ' + cur.label);
  };
  syncLang();
  langPill.append(langFlag, langLabel, icon('chevron-down', { size: 16 }));
  langPill.addEventListener('click', () => {
    settingsOptionSheet({
      title: strings.language || 'Language',
      options: languages.map((l) => ({ value: l.code, label: l.label, flag: l.flag })),
      current: st.language,
      host: hostEl(st),
      strings,
      commit: (code, ctrl) => {
        // legacy ixian:language persists + reloads intro; fire-and-forget here
        try { if (opts.onLanguage) opts.onLanguage(code); } catch { /* pref */ }
        ctrl.done();
      },
      onPicked: (o) => { if (o) { st.language = o.value; syncLang(); } },
    });
  });

  const themeBtn = document.createElement('button');
  themeBtn.type = 'button';
  themeBtn.className = 'c-launch__pill c-launch__pill--icon';
  themeBtn.setAttribute('aria-label', strings.appearance || 'Appearance');
  themeBtn.setAttribute('aria-haspopup', 'dialog');
  themeBtn.append(icon('adjustments-alt', { size: 18 }));
  let themeCurrent = 0;                          // ThemeAppearance: system (flag §6⑥)
  themeBtn.addEventListener('click', () => {
    // #147 preview tiles — the pick stays VISIBLE on the pinned-dark welcome
    settingsThemeSheet({
      current: themeCurrent,
      host: hostEl(st),
      strings,
      commit: (val, ctrl) => {
        try { if (opts.onAppearance) opts.onAppearance(val); } catch { /* pref */ }
        ctrl.done();
      },
      onPicked: (o) => { if (o) themeCurrent = o.value; },
    });
  });
  top.append(langPill, themeBtn);
  v.append(top);

  const logo = document.createElement('span');
  logo.className = 'c-launch__logo';             // bare glowing glyph (#160, no disc)
  logo.setAttribute('aria-hidden', 'true');
  logo.append(icon('logo', { size: 44 }));
  v.append(logo);

  // — carousel: the SHIPPED legacy tour (step1–4 art + en-us copy verbatim);
  //   swipe + dots + arrows + gentle autoplay —
  const car = document.createElement('div');
  car.className = 'c-launch__carousel';
  const track = document.createElement('div');
  track.className = 'c-launch__track';
  car.append(track);

  const base = opts.illustrationBase || 'images/onboarding/';
  const defs = [
    {
      img: base + 'step1.svg',
      title: strings.slide1Title || 'Built for you. Owned by you.',
      copy: strings.slide1Copy || 'No servers, no middlemen. Every message is encrypted and stays on your device — delivered straight to your contact, and to no one else.',
    },
    {
      img: base + 'step2.svg',
      title: strings.slide2Title || 'No phone number. No email. Just a nickname.',
      copy: strings.slide2Copy || 'Your unique Spixi address is the only identity you need. Sign up in seconds and share nothing personal — the account is yours alone.',
    },
    {
      img: base + 'step3.svg',
      title: strings.slide3Title || 'Send money like you send a message.',
      copy: strings.slide3Copy || 'A private IXI wallet lives inside every chat. Send and receive payments in a tap — as simple and instant as saying hello.',
    },
    {
      img: base + 'step4.svg',
      title: strings.slide4Title || 'Mini Apps, right inside your chats.',
      copy: strings.slide4Copy || 'Play games, run tools, chat with on-device AI, or automate your world — all without ever leaving the conversation.',
    },
  ];
  const slides = defs.map((s, i) => {
    const slide = document.createElement('div');
    slide.className = 'c-launch__slide';
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-label', (i + 1) + ' / ' + defs.length);
    const img = document.createElement('img');
    img.className = 'c-launch__illo-img';
    img.src = s.img;
    img.alt = '';                                // decorative — the copy carries meaning
    img.draggable = false;
    img.addEventListener('error', () => { img.hidden = true; }, { once: true });
    slide.append(img);
    const h = document.createElement('h1');
    h.className = 'c-launch__slide-title';
    h.textContent = s.title;
    const p = document.createElement('p');
    p.className = 'c-launch__slide-copy';
    p.textContent = s.copy;
    slide.append(h, p);
    track.append(slide);
    return slide;
  });

  // dots (tablist; ←/→ keyboard)
  const dots = document.createElement('div');
  dots.className = 'c-launch__dots';
  dots.setAttribute('role', 'tablist');
  dots.setAttribute('aria-label', strings.introPages || 'Introduction');
  const dotBtns = defs.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-launch__dot';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', s.title);
    b.addEventListener('click', () => { stopAuto(); go(i); });
    dots.append(b);
    return b;
  });
  dots.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { stopAuto(); go(st.slide + 1); dotBtns[st.slide].focus(); }
    if (e.key === 'ArrowLeft') { stopAuto(); go(st.slide - 1); dotBtns[st.slide].focus(); }
  });

  st.slide = 0;
  const go = (i) => {
    st.slide = Math.max(0, Math.min(defs.length - 1, i));
    track.style.transform = 'translateX(' + (st.slide * -100) + '%)';
    slides.forEach((s, k) => s.setAttribute('aria-hidden', String(k !== st.slide)));
    dotBtns.forEach((b, k) => {
      b.setAttribute('aria-selected', String(k === st.slide));
      b.tabIndex = k === st.slide ? 0 : -1;      // roving tabindex
    });
  };

  // gentle autoplay (premium-tour idiom): wraps every 5s until the user takes
  // control (any manual nav/swipe = theirs now); prefers-reduced-motion = off;
  // self-stops when the shell leaves the DOM (demo/jsdom re-creation guard)
  let autoTimer = null;
  const stopAuto = () => { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } };
  const reduced = typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced) {
    autoTimer = setInterval(() => {
      if (!v.isConnected) { stopAuto(); return; }
      if (st.view === 'welcome') go((st.slide + 1) % defs.length);
    }, 5000);
  }
  st.stopAuto = stopAuto;

  // pointer swipe (pan-y stays native — CSS touch-action)
  let downX = null;
  car.addEventListener('pointerdown', (e) => { downX = e.clientX; });
  car.addEventListener('pointerup', (e) => {
    if (downX === null) return;
    const dx = e.clientX - downX;
    downX = null;
    if (Math.abs(dx) < 40) return;               // sanctioned: swipe threshold
    stopAuto();
    go(st.slide + (dx < 0 ? 1 : -1));
  });

  v.append(car, dots);

  // — CTAs: always enabled, pinned; internal routing (the shell ABSORBS the
  //   legacy pages). CONSENT moved to the create/restore forms (Damir
  //   2026-07-06): the welcome is a clean brand choice, and ixian:accept now
  //   fires at the BINDING action (the actual create/restore commit), not here —
  const ctas = document.createElement('div');
  ctas.className = 'c-launch__ctas';
  const createBtn = createButton({ label: strings.createCta || 'Create new account', size: 56, width: 'full' });
  const restoreBtn = createButton({ label: strings.restoreCta || 'Restore existing account', type: 'outline', size: 56, width: 'full' });
  createBtn.addEventListener('click', () => { stopAuto(); show(st, 'create'); });
  restoreBtn.addEventListener('click', () => { stopAuto(); show(st, 'restore'); });
  ctas.append(createBtn, restoreBtn);
  v.append(ctas);

  const version = document.createElement('p');
  version.className = 'c-launch__version';
  version.hidden = true;
  v.append(version);

  st.els.version = version;
  go(0);
  return v;
}

/* —— legal docs + consent (shared by create/restore) ———————————————————
   Damir 2026-07-06: consent lives at the BINDING action (the create/restore
   commit), not on the welcome nav tap. Terms + Privacy open IN-APP in one
   sheet renderer; ixian:accept fires once, on the first commit. */

// LEGAL COPY — ENGLISH ONLY (Damir decision, DECISIONS #169). The Terms of Use and
// Privacy Policy are intentionally NOT localized: they have no `strings.*` dictionary
// entry, so every locale renders this English text by design. Localizing legal copy
// requires per-jurisdiction legal review and is out of scope for the i18n batch. Their
// TITLES (termsTitle / privacyTitle) ARE translated.
const TERMS_DEFAULT = 'Spixi is a decentralised, self-custodial app on the Ixian Platform. You are solely responsible for your wallet, backup file and password — no other way to recover them exists. IXI Labs collects no personal data. You must be at least 16 years old (or the higher minimum age your country requires) to use Spixi.\n\nThe full document is provided in English only.';
const PRIVACY_DEFAULT = 'IXI Labs does not collect any personal data through the Spixi app. No phone number or email is required, your messages stay on your device, and IXI Labs cannot access your message history or wallet keys.\n\nThe full Privacy Policy is provided in English only.';

function openDocSheet(st, title, text) {
  const strings = st.strings;
  const bodyEl = document.createElement('div');
  bodyEl.className = 'c-launch__terms-body u-scroll';
  // inline [label](https://…) → anchors (validated https only); the rest is
  // plain text nodes. Content is app-controlled (strings), never user input.
  const appendRich = (el, s) => {
    const re = /\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g;
    let last = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > last) el.append(s.slice(last, m.index));
      const a = document.createElement('a');
      a.className = 'c-launch__link';
      a.href = m[2];
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = m[1];
      el.append(a);
      last = m.index + m[0].length;
    }
    if (last < s.length) el.append(s.slice(last));
  };
  // "# " = heading, "- " = list item, else a paragraph. Markers are stripped —
  // the TEXT stays verbatim (text nodes + validated links only, XSS-safe).
  let list = null;
  for (const raw of String(text).split('\n')) {
    const line = raw.replace(/\r$/, '');       // CRLF safety only — deliberately not trimmed (passwords are never trimmed; guard-counted)
    if (!line) { list = null; continue; }
    if (line.startsWith('# ')) {
      list = null;
      const h = document.createElement('h4');
      h.className = 'c-launch__terms-h';
      h.textContent = line.slice(2);
      bodyEl.append(h);
    } else if (line.startsWith('- ')) {
      if (!list) { list = document.createElement('ul'); list.className = 'c-launch__terms-list'; bodyEl.append(list); }
      const li = document.createElement('li');
      appendRich(li, line.slice(2));
      list.append(li);
    } else {
      list = null;
      const p = document.createElement('p');
      appendRich(p, line);
      bodyEl.append(p);
    }
  }
  const sheet = createSheet({ content: bodyEl, host: hostEl(st), title, strings });
  // explicit close affordance (scrim tap + Esc still work) — obvious corner tap
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'c-launch__sheet-close';
  closeBtn.setAttribute('aria-label', strings.close || 'Close');
  closeBtn.append(icon('x', { size: 20 }));
  closeBtn.addEventListener('click', () => closeSheet(sheet));
  sheet.append(closeBtn);
  openSheet(sheet);
}

// one-shot ixian:accept — emitted at the binding action (create/restore commit)
function emitAccept(st) {
  if (!st.termsRequired || st.acceptSent) return;
  st.acceptSent = true;
  try { if (st.opts.onAcceptTerms) st.opts.onAcceptTerms(); } catch { /* pref */ }
}

// consent line for the commit screens: "{lead} [Terms of Use] and acknowledge
// the [Privacy Policy]." — both open IN-APP (openDocSheet)
function consentLine(st, lead) {
  const strings = st.strings;
  const fine = document.createElement('p');
  fine.className = 'c-launch__fineprint';
  fine.append((lead || 'By continuing, you agree to the') + ' ');
  const termsLink = document.createElement('button');
  termsLink.type = 'button';
  termsLink.className = 'c-launch__link';
  termsLink.textContent = strings.termsLink || 'Terms of Use';
  termsLink.addEventListener('click', () => openDocSheet(st, strings.termsTitle || 'Terms of Use', strings.termsBody || TERMS_DEFAULT));
  fine.append(termsLink);
  fine.append(' ' + (strings.finePrintAck || 'and acknowledge the') + ' ');
  const privacyLink = document.createElement('button');
  privacyLink.type = 'button';
  privacyLink.className = 'c-launch__link';
  privacyLink.textContent = strings.privacyLink || 'Privacy Policy';
  privacyLink.addEventListener('click', () => openDocSheet(st, strings.privacyTitle || 'Privacy Policy', strings.privacyBody || PRIVACY_DEFAULT));
  fine.append(privacyLink, '.');
  return fine;
}

/* —— create (themed form view) ————————————————————————————————— */

function buildCreate(st) {
  const { opts } = st;
  const strings = st.strings;
  const v = document.createElement('div');
  v.className = 'c-launch__view';
  v.dataset.launchView = 'create';

  const pw = passwordField({ label: strings.password || 'Password', strings });               // new-password (group label carries "Wallet")
  const rp = passwordField({ label: strings.repeatPassword || 'Confirm password', strings });  // new-password
  const scrub = () => { pw.input.value = ''; rp.input.value = ''; pw.mask(); rp.mask(); };
  st.scrubs.push(scrub);

  v.append(createTopbar({
    variant: 'view',
    title: strings.createTitle || 'Create your account',
    backLabel: strings.back || 'Back',
    onBack: () => {
      scrub();                                   // SECURITY §5: scrub before leaving
      show(st, 'welcome');
      try { if (opts.onBack) opts.onBack('create'); } catch { /* nav */ }
    },
  }));

  const body = document.createElement('div');
  body.className = 'c-launch__body u-scroll';

  // — Profile group (Damir 2026-07-06 UX: two LABELLED sections read better than
  //   three anonymous stacked inputs). Avatar + nickname belong together —
  const gProfile = document.createElement('div');
  gProfile.className = 'c-launch__group';
  const lProfile = document.createElement('p');
  lProfile.className = 'c-launch__group-label';
  lProfile.textContent = strings.createProfileLabel || 'Your profile';
  gProfile.append(lProfile);

  // avatar preview: identity forms as the nick is typed (deterministic hue —
  // the avatar system IS the identity imagery, illustrations-plan §2)
  const avRow = document.createElement('div');
  avRow.className = 'c-launch__avatar';
  const avSlot = document.createElement('span');
  avSlot.className = 'c-launch__avatar-slot';
  const renderAvatar = () => {
    avSlot.replaceChildren(createAvatar({
      src: st.avatarSrc || null,
      name: nick.value.trim() || '·',
      size: 96,
    }));
  };
  const avBtn = createButton({ label: strings.addPhoto || 'Add a photo', type: 'outline', size: 44 });
  avBtn.addEventListener('click', () => {
    // ixian:avatar → native picker → loadAvatar(path) → setLaunchAvatar
    try { if (opts.onPickAvatar) opts.onPickAvatar(); } catch { /* picker */ }
  });
  avRow.append(avSlot, avBtn);
  const nick = textInput({ label: strings.nickname || 'Nickname', name: 'nick' });
  nick.addEventListener('input', () => { if (!st.avatarSrc) renderAvatar(); setError(''); });
  gProfile.append(avRow, nick);
  body.append(gProfile);

  // — Wallet-password group: the two secrets + the length hint, under one label —
  const gSec = document.createElement('div');
  gSec.className = 'c-launch__group';
  const lSec = document.createElement('p');
  lSec.className = 'c-launch__group-label';
  lSec.textContent = strings.createPasswordLabel || 'Wallet password';
  gSec.append(lSec, pw.wrap, rp.wrap);
  // proactive password condition (BE requires ENC_MIN) — shown UP FRONT, not
  // only as a post-submit error (Damir 2026-07-06)
  const hint = document.createElement('p');
  hint.className = 'c-launch__hint';
  hint.textContent = (strings.passwordHint || 'Use at least {n} characters.').replace('{n}', String(ENC_MIN));
  gSec.append(hint);
  body.append(gSec);

  const err = errLine();
  body.append(err);

  // prominent recovery callout (Damir 2026-07-06: "make it impossible to miss")
  // — self-custody has no backdoor. A tinted panel, not a quiet footnote.
  const warn = document.createElement('div');
  warn.className = 'c-launch__callout';
  warn.setAttribute('role', 'note');
  const warnTitle = document.createElement('p');
  warnTitle.className = 'c-launch__callout-title';
  warnTitle.textContent = strings.createWarnTitle || 'Spixi doesn’t store your password.';
  const warnBody = document.createElement('p');
  warnBody.className = 'c-launch__callout-body';
  warnBody.textContent = strings.createWarnBody
    || 'Without it and your backup file, your account and wallet can’t be recovered — not even by us.';
  warn.append(warnTitle, warnBody);
  body.append(warn);
  v.append(body);

  const footer = document.createElement('div');
  footer.className = 'c-launch__footer';
  // consent at the binding action, right above the commit button (Damir 2026-07-06)
  const consent = consentLine(st, strings.createConsent || 'By creating an account, you agree to the');
  const cta = createButton({ label: strings.createSubmit || 'Create my account', size: 56, width: 'full' });
  footer.append(consent, cta);
  v.append(footer);

  const setError = (msg, focusEl) => {
    err.textContent = msg;
    err.hidden = !msg;
    if (msg && focusEl) focusEl.focus();
  };
  pw.input.addEventListener('input', () => setError(''));
  rp.input.addEventListener('input', () => setError(''));

  let inFlight = false;
  const submit = () => {
    if (inFlight) return;
    const name = nick.value.trim();              // nick IS trimmed (display name); passwords NEVER
    const p = pw.input.value, r = rp.input.value;
    if (!name) return setError(strings.nickEmpty || 'Pick a nickname.', nick);
    if (name.includes(':')) {
      // C# splits create:<nick>:<password> on the FIRST ':' (launch-spec §1)
      return setError(strings.nickColon || 'Nicknames can’t contain “:”.', nick);
    }
    if (!p) return setError(strings.passwordEmpty2 || 'Choose a wallet password.', pw.input);
    if (p.length < ENC_MIN) {
      return setError((strings.newTooShort || 'The password needs at least {n} characters.').replace('{n}', String(ENC_MIN)), pw.input);
    }
    if (p !== r) return setError(strings.repeatMismatch || 'The passwords don’t match.', rp.input);
    if (p.includes(name + ':')) {
      // Replace(nick+":","") corruption hazard — never sent (launch-spec §1; §9 C# ask)
      return setError(strings.badPassword || 'That password contains an unsupported character sequence.', pw.input);
    }
    setError('');
    inFlight = true;
    nick.disabled = true; pw.input.disabled = true; rp.input.disabled = true; avBtn.disabled = true;
    setLoading(cta, true);
    // NO auto-release (spec §2.2): wallet generation takes seconds and there
    // is no covering native alert — the morph is the loading truth (flag §6②).
    const ctrl = launchCtrl(
      () => {                                    // C# navigates to Home; shell → tail
        inFlight = false;
        setLoading(cta, false);
        setSuccess(cta, { label: strings.created || 'Account created' });
        scrub();                                 // SECURITY §5
        setTimeout(() => {
          nick.disabled = false; pw.input.disabled = false; rp.input.disabled = false; avBtn.disabled = false;
          show(st, 'tail');
        }, 900);                                 // the encpass morph beat
      },
      (msg) => {
        inFlight = false;
        nick.disabled = false; pw.input.disabled = false; rp.input.disabled = false; avBtn.disabled = false;
        setLoading(cta, false);
        if (msg) setError(msg, pw.input);
      },
    );
    emitAccept(st);                              // consent at the binding action (spec §5)
    try {
      if (opts.onCreateAccount) opts.onCreateAccount(name, p, ctrl); else ctrl.done();
    } catch { ctrl.fail(strings.createFailed || 'Something went wrong creating the account.'); } // #141-m4
  };
  cta.addEventListener('click', submit);
  rp.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

  renderAvatar();
  st.renderAvatar = renderAvatar;
  return v;
}

/* —— restore (themed form view) ———————————————————————————————— */

function buildRestore(st) {
  const { opts } = st;
  const strings = st.strings;
  const v = document.createElement('div');
  v.className = 'c-launch__view';
  v.dataset.launchView = 'restore';

  const pw = passwordField({ label: strings.walletPassword || 'Wallet password', current: true, strings }); // existing secret — off
  const scrub = () => { pw.input.value = ''; pw.mask(); };
  st.scrubs.push(scrub);

  v.append(createTopbar({
    variant: 'view',
    title: strings.restoreTitle || 'Restore your account',
    backLabel: strings.back || 'Back',
    onBack: () => {
      scrub();
      show(st, 'welcome');
      try { if (opts.onBack) opts.onBack('restore'); } catch { /* nav */ }
    },
  }));

  const body = document.createElement('div');
  body.className = 'c-launch__body u-scroll';

  // — premium hero (Damir 2026-07-06: "more premium; move the input+button
  //   lower"; premium round 2: the SHIPPED legacy restore illustration + a warm
  //   welcome-back line anchor the top, the form group drops toward the CTA
  //   (c-launch__lower margin-top:auto) —
  const base = opts.illustrationBase || 'images/onboarding/';
  const hero = document.createElement('div');
  hero.className = 'c-launch__hero';
  const heroIllo = document.createElement('img');
  heroIllo.className = 'c-launch__hero-illo';
  heroIllo.src = base + 'restore.svg';           // legacy restore art (dark set — launch is pinned dark)
  heroIllo.alt = '';                             // decorative — the copy carries meaning
  heroIllo.draggable = false;
  heroIllo.addEventListener('error', () => { heroIllo.hidden = true; }, { once: true });
  const heroTitle = document.createElement('h1');   // the view's primary heading (topbar title is a nav label div)
  heroTitle.className = 'c-launch__hero-title';
  heroTitle.textContent = strings.restoreHeroTitle || 'Welcome back';
  const heroCopy = document.createElement('p');
  heroCopy.className = 'c-launch__hero-copy';
  heroCopy.textContent = strings.restoreHeroCopy
    || 'Choose your backup file and enter your wallet password to bring your account back to this device.';
  hero.append(heroIllo, heroTitle, heroCopy);
  body.append(hero);

  // — form group, pinned to the lower third above the CTA —
  const lower = document.createElement('div');
  lower.className = 'c-launch__lower';

  const card = document.createElement('div');
  card.className = 'c-launch__card';
  const fileBtn = createButton({
    label: strings.chooseFile || 'Choose backup file…',
    type: 'outline', size: 56, width: 'full', icon: icon('file-isr', { size: 20 }),
  });
  fileBtn.addEventListener('click', () => {
    try { if (opts.onSelectFile) opts.onSelectFile(); } catch { /* picker */ }
  });
  const fileRow = document.createElement('p');
  fileRow.className = 'c-launch__file';
  fileRow.hidden = true;
  const fileGlyph = document.createElement('span');
  fileGlyph.className = 'c-launch__file-check';
  fileGlyph.setAttribute('aria-hidden', 'true');
  fileGlyph.append(icon('check', { size: 16 }));
  const fileName = document.createElement('span');
  fileName.className = 'c-launch__file-name';    // textContent only — names are untrusted
  fileRow.append(fileGlyph, fileName);
  card.append(fileBtn, fileRow, pw.wrap);
  const err = errLine();
  card.append(err);
  lower.append(card);

  // honesty line kept (spec §2.3): self-custody has no recovery path
  const note = document.createElement('p');
  note.className = 'c-launch__note';
  note.textContent = strings.restoreNote
    || 'Restoring needs this file and your password. Spixi can’t recover either for you.';
  lower.append(note);
  body.append(lower);
  v.append(body);

  const footer = document.createElement('div');
  footer.className = 'c-launch__footer';
  // consent at the binding action, right above the commit button (Damir 2026-07-06)
  const consent = consentLine(st, strings.restoreConsent || 'By restoring your account, you agree to the');
  const cta = createButton({ label: strings.restoreSubmit || 'Restore account', size: 56, width: 'full' });
  footer.append(consent, cta);
  v.append(footer);

  const setError = (msg, focusEl) => {
    err.textContent = msg;
    err.hidden = !msg;
    if (msg && focusEl) focusEl.focus();
  };
  pw.input.addEventListener('input', () => setError(''));

  let inFlight = false;
  const submit = () => {
    if (inFlight) return;
    if (!st.fileName) return setError(strings.fileEmpty || 'Choose your backup file first.');
    const p = pw.input.value;                    // NOT trimmed
    if (!p) return setError(strings.passwordEmpty || 'Enter your wallet password.', pw.input);
    setError('');
    inFlight = true;
    pw.input.disabled = true; fileBtn.disabled = true;
    setLoading(cta, true);
    // no auto-release: restore HAS an explicit fail signal — the host maps
    // showPasswordError (+removeLoadingOverlay; one-shot latch absorbs the
    // double signal) → ctrl.fail(msg) (spec §2.3)
    const ctrl = launchCtrl(
      () => {                                    // C# navigates to Home
        inFlight = false;
        setLoading(cta, false);
        setSuccess(cta, { label: strings.restored || 'Restored' });
        scrub();
      },
      (msg) => {
        inFlight = false;
        pw.input.disabled = false; fileBtn.disabled = false;
        setLoading(cta, false);
        setError(msg || strings.restoreFailed || 'That password didn’t open the backup.', pw.input);
      },
    );
    emitAccept(st);                              // consent at the binding action (spec §5)
    try {
      if (opts.onRestore) opts.onRestore(p, ctrl); else ctrl.done();
    } catch { ctrl.fail(); }                     // #141-m4
  };
  cta.addEventListener('click', submit);
  pw.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

  st.els.fileRow = fileRow;
  st.els.fileName = fileName;
  return v;
}

/* —— retry (boot: the SAVED password failed) ———————————————————— */

function buildRetry(st) {
  const { opts } = st;
  const strings = st.strings;
  const v = document.createElement('div');
  v.className = 'c-launch__view';
  v.dataset.launchView = 'retry';

  const pw = passwordField({ label: strings.walletPassword || 'Wallet password', current: true, strings });
  const scrub = () => { pw.input.value = ''; pw.mask(); };
  st.scrubs.push(scrub);

  v.append(createTopbar({
    variant: 'view',
    title: strings.retryTitle || 'Unlock your wallet',
    backLabel: strings.back || 'Back',
    onBack: () => {
      scrub();
      show(st, 'welcome');
      try { if (opts.onBack) opts.onBack('retry'); } catch { /* nav — legacy pop */ }
    },
  }));

  const body = document.createElement('div');
  body.className = 'c-launch__body u-scroll';
  const copy = document.createElement('p');
  copy.className = 'c-launch__note';
  copy.textContent = strings.retryCopy
    || 'Your wallet couldn’t be unlocked with the saved password. Enter it to continue.';
  body.append(copy);

  const card = document.createElement('div');
  card.className = 'c-launch__card';
  card.append(pw.wrap);
  const err = errLine();
  card.append(err);
  body.append(card);
  v.append(body);

  const footer = document.createElement('div');
  footer.className = 'c-launch__footer';
  const cta = createButton({ label: strings.proceed || 'Unlock', size: 56, width: 'full' });
  footer.append(cta);
  v.append(footer);

  const setError = (msg, focusEl) => {
    err.textContent = msg;
    err.hidden = !msg;
    if (msg && focusEl) focusEl.focus();
  };
  pw.input.addEventListener('input', () => setError(''));

  let inFlight = false;
  const submit = () => {
    if (inFlight) return;
    const p = pw.input.value;                    // NOT trimmed
    if (!p) return setError(strings.passwordEmpty || 'Enter your wallet password.', pw.input);
    setError('');
    inFlight = true;
    pw.input.disabled = true;
    setLoading(cta, true);
    const ctrl = launchCtrl(
      () => {                                    // C# loads the wallet + navigates
        inFlight = false;
        setLoading(cta, false);
        setSuccess(cta, { label: strings.unlocked || 'Unlocked' });
        scrub();
      },
      (msg) => {
        // wrong password = NATIVE alert + removeLoadingOverlay → host sends
        // fail('') = SILENT restore, value kept (the unlock-screen grammar,
        // spec §2.4); fail(msg) = inline (mock / future §9 signal)
        inFlight = false;
        pw.input.disabled = false;
        setLoading(cta, false);
        if (msg) setError(msg, pw.input); else pw.input.focus();
      },
    );
    try {
      if (opts.onRetry) opts.onRetry(p, ctrl); else ctrl.done();
    } catch { ctrl.fail(''); }                   // #141-m4 (silent — alert-covered path)
  };
  cta.addEventListener('click', submit);
  pw.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

  return v;
}

/* —— onboarding tail: backup nudge → join step (spec §2.5) ————————— */

function buildTail(st) {
  const { opts } = st;
  const strings = st.strings;
  const v = document.createElement('div');
  v.className = 'c-launch__tail';
  v.dataset.step = 'backup';

  let finished = false;                          // finish is once (latch)
  const finish = () => {
    if (finished) return;
    finished = true;
    try { if (opts.onFinish) opts.onFinish(); } catch { /* nav — modal pops */ }
  };
  const toJoin = () => { v.dataset.step = 'join'; backupStep.hidden = true; joinStep.hidden = false; };

  // step 1 — backup nudge (backup-ux-spec §3.3: quiet Later is ALLOWED;
  // the standing settings-row state takes over from there)
  const backupStep = document.createElement('div');
  backupStep.className = 'c-launch__tail-step';
  backupStep.append(illoSlot('backup'));
  const bTitle = document.createElement('h1');
  bTitle.className = 'c-launch__slide-title';
  bTitle.textContent = strings.backupHeadline || 'One file protects everything';
  const bCopy = document.createElement('p');
  bCopy.className = 'c-launch__slide-copy';
  bCopy.textContent = strings.backupCopy
    || 'Your identity, wallet and contacts — encrypted with your password into a single backup file.';
  const backupBtn = createButton({ label: strings.backupCta || 'Back up now', size: 56, width: 'full' });
  backupBtn.addEventListener('click', () => {
    // integration (§9): onboarding-complete + the settings Backup screen —
    // no new verb; onboarding continues on return, so advance now
    try { if (opts.onBackupNow) opts.onBackupNow(); } catch { /* nav */ }
    toJoin();
  });
  const laterBtn = createButton({ label: strings.backupLater || 'Later', type: 'text', size: 56, width: 'full' });
  laterBtn.addEventListener('click', toJoin);
  backupStep.append(bTitle, bCopy, backupBtn, laterBtn);

  // step 2 — join the official bot (legacy onboarding.html joinbot/finish)
  const base = opts.illustrationBase || 'images/onboarding/';
  const joinStep = document.createElement('div');
  joinStep.className = 'c-launch__tail-step';
  joinStep.hidden = true;
  const jIllo = document.createElement('img');    // the SHIPPED legacy join-community art
  jIllo.className = 'c-launch__tail-illo';
  jIllo.src = base + 'join-community.svg';
  jIllo.alt = '';                                 // decorative — the copy carries meaning
  jIllo.draggable = false;
  jIllo.addEventListener('error', () => { jIllo.hidden = true; }, { once: true });
  const jTitle = document.createElement('h1');
  jTitle.className = 'c-launch__slide-title';
  jTitle.textContent = strings.joinTitle || 'Join the Spixi community';
  const jCopy = document.createElement('p');
  jCopy.className = 'c-launch__slide-copy';
  jCopy.textContent = strings.joinCopy
    || 'Say hi in the official Spixi group chat and get updates from the team.';
  const joinBtn = createButton({ label: strings.joinCta || 'Join the community', size: 56, width: 'full' });
  joinBtn.addEventListener('click', () => {
    if (finished) return;                        // one-shot: joinbot rides the finish latch
    try { if (opts.onJoinBot) opts.onJoinBot(); } catch { /* contact add — C#-side */ }
    finish();
  });
  const skipBtn = createButton({ label: strings.joinSkip || 'Not now', type: 'text', size: 56, width: 'full' });
  skipBtn.addEventListener('click', finish);
  joinStep.append(jIllo, jTitle, jCopy, joinBtn, skipBtn);

  v.append(backupStep, joinStep);
  return v;
}

/* —— shell ————————————————————————————————————————————————— */

export function createLaunchShell(opts = {}) {
  const { view = 'welcome', termsRequired = false, version = '', strings = {} } = opts;
  const el = document.createElement('section');
  el.className = 'c-launch';
  el.dataset.theme = 'dark';                       // premium round 2: the WHOLE launch is
  // one continuous fixed-dark brand surface on --gradient-launch (welcome→create→
  // restore→retry→tail). The lock screen precedent: forms live on the gradient with
  // glass fields. Sheets still mount on the host OUTSIDE this pin (themed pickers).

  const st = {
    opts, strings,
    root: el,
    view: null,
    slide: 0,
    termsRequired: !!termsRequired,
    acceptSent: false,
    language: '',
    avatarSrc: null,
    fileName: '',
    views: {},
    els: {},
    scrubs: [],                                  // every password scrub, one registry
  };
  launchState.set(el, st);

  st.views.welcome = buildWelcome(st);
  st.views.create = buildCreate(st);
  st.views.restore = buildRestore(st);
  st.views.retry = buildRetry(st);
  st.views.tail = buildTail(st);
  el.append(st.views.welcome, st.views.create, st.views.restore, st.views.retry, st.views.tail);

  // SECURITY §5 + #162 grammar: ONE window-level pagehide listener scrubs
  // every password field the shell owns (backgrounded WebView). The shell IS
  // the page (no unmount hook), so the listener self-cleans on the first
  // pagehide after the element leaves the DOM (demo/jsdom re-creation guard).
  const onPageHide = () => {
    if (!el.isConnected) { window.removeEventListener('pagehide', onPageHide); return; }
    st.scrubs.forEach((s) => s());
  };
  window.addEventListener('pagehide', onPageHide);

  setLaunchVersion(el, version);
  show(st, LAUNCH_VIEWS.includes(view) ? view : 'welcome');
  return el;
}

/** Entry-point router mirror — C# repoints LaunchRetryPage with view:'retry',
 *  the HomePage onboarding modal with view:'tail' (#44 free-fn grammar). */
export function setLaunchView(el, view) {
  const st = launchState.get(el);
  if (!st || !LAUNCH_VIEWS.includes(view) || st.view === view) return;
  show(st, view);
}

/** ← setVersion(Config.version) — quiet welcome footer line. */
export function setLaunchVersion(el, v) {
  const st = launchState.get(el);
  if (!st) return;
  st.els.version.textContent = v || '';
  st.els.version.hidden = !v;
}

/** ← showTerms() — C# only calls it when terms are NOT yet accepted. Premium
 *  rework: consent is fine-print (continuing = agreeing), so this only arms
 *  the one-shot ixian:accept emitted on the first Create/Restore tap. */
export function setLaunchTerms(el, required) {
  const st = launchState.get(el);
  if (!st) return;
  st.termsRequired = !!required;
  if (st.termsRequired) st.acceptSent = false;   // arm the one-shot on (re-)gate
}

/** ← loadAvatar(path) — native picker result lands as the create preview. */
export function setLaunchAvatar(el, src) {
  const st = launchState.get(el);
  if (!st) return;
  st.avatarSrc = src || null;
  st.renderAvatar();
}

/** ← setUploadedFileName(name) — restore file pick confirmation. */
export function setLaunchFile(el, name) {
  const st = launchState.get(el);
  if (!st) return;
  st.fileName = name || '';
  st.els.fileName.textContent = st.fileName;
  st.els.fileRow.hidden = !st.fileName;
}
