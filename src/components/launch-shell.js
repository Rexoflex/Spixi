/**
 * launch-shell — welcome carousel · create · restore · retry
 * (docs/launch-spec.md, Phase 1 #5 — the LAST Phase-1 surface). Absorbs the
 * legacy launch pages (ARCHITECTURE §5 row 1): intro / intro_new /
 * intro_restore / intro_retry. Bridge grammar (bridge-audit-A §7–10 —
 * FROZEN): introload · accept · language:<code> · create:<nick>:<password> ·
 * avatar · selectfile · restore:<password> · proceed:<password> · back.
 *
 * ★ N76 (#391, Damir's product dial): the ONBOARDING TAIL IS GONE. Create and
 * restore now land straight in the app. The two steps it carried MOVED, they
 * did not die: the backup nudge fires on the FIRST REAL ASSET (a contact, a
 * message, an incoming balance — HomePage.displayBackupReminder) and the
 * join-the-community CTA lives in the chat-list EMPTY STATE, still opt-in.
 * ★ N72: the welcome APPEARANCE picker is gone too — the whole launch flow is
 * fixed dark in both themes, so the pick changed nothing the user could see.
 *
 * Interview #0 (Damir 2026-07-06): ① welcome carousel ② the #160 brand
 * treatment (fixed-dark pin + brand gradient + bare glowing logo) is
 * WELCOME-ONLY — create/restore/retry are normal themed surfaces
 * ⚠ SUPERSEDED (review NIT-2): N72 pinned the WHOLE flow dark — createLaunchShell
 * sets dataset.theme='dark' on .c-launch, the root of every view. Read the N72
 * paragraph above as current; this interview note is a dated record only.
 * ③ [L2] the
 * window-pagehide scrub also lands on createLockScreen (lock-shell.js).
 *
 * PREMIUM REWORK (Damir demo pass 2026-07-06): single full-bleed screen —
 * 4-slide autoplay carousel (LEGACY step1–4 art + copy, dark set — the
 * shipped intro.html illustrations, reused verbatim) over always-pinned
 * CTAs · the language pill reuses the settings sheet (settingsOptionSheet
 * #148⑥ flags — ONE picker grammar app-wide; the appearance pill left with
 * N72) · terms = fine print; the first Create/Restore
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
 *   onAcceptTerms, onGoCreate, onGoRestore,
 *   onCreateAccount(nick, pass, ctrl), onPickAvatar, onSelectFile,
 *   onRestore(pass, ctrl), onRetry(pass, ctrl), onBack(view), strings, host })
 *   onGoCreate/onGoRestore (optional, ★ N75): NOTIFICATIONS, not overrides — the
 *   view switch always happens in place. The native shell uses them to record
 *   consent and to keep C# in step with the on-screen view.
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
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createTopbar } from './topbar.js';
import { createButton, setLoading, setSuccess } from './button.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';
import { createAvatar } from './avatar.js';
import { passwordField, ENC_MIN } from './lock-shell.js';
import { settingsOptionSheet } from './settings-shell.js';
import { LANGUAGES, createFlag } from './flags.js';
import { slideSubscreenIn, slideSubscreenOut, settleSubscreenSlide } from './subscreen-slide.js';
import { LEGAL_DOCS } from './legal-docs.js';   // ★ #733: GENERATED from docs/legal at build time — the full documents

const launchState = new WeakMap(); // el → st

const LAUNCH_VIEWS = ['welcome', 'create', 'restore', 'retry'];

function launchCtrl(onDone, onFail) {            // one-shot (lockCtrl grammar)
  let used = false;
  return {
    done: (payload) => { if (used) return; used = true; onDone(payload); },
    fail: (msg) => { if (used) return; used = true; onFail(msg); },
  };
}

/* —— illustration slots ————————————————————————————————————
   Welcome slides reuse the legacy art verbatim (originally img/dark/onboarding/
   step1–4.svg — that folder is deleted, Session N — now src/demo/images/onboarding/*.png — Damir premium rework;
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

function illoSlot(name, src) {
  const slot = document.createElement('div');
  slot.className = 'c-launch__illo';
  slot.dataset.illo = name;                      // illustrations-plan naming
  slot.setAttribute('aria-hidden', 'true');      // decorative — copy carries meaning
  if (src) {
    // iOS-2 (#283): REAL asset first — the #245b canon (same art as the backup
    // nudge + Account→Backup pane, images/backup.png — N45). Join-step <img> grammar;
    // load error → the token-styled placeholder below, so a missing asset
    // degrades to the old look, never a blank slot.
    const img = document.createElement('img');
    img.className = 'c-launch__illo-img';
    img.src = src;
    img.alt = '';                                // decorative — copy carries meaning
    img.draggable = false;
    img.addEventListener('error', () => {
      img.remove();
      slot.dataset.placeholder = 'true';
      slot.innerHTML = ILLOS[name] || '';
    }, { once: true });
    slot.append(img);
    return slot;
  }
  slot.dataset.placeholder = 'true';             // real-asset swap = deliberate
  slot.innerHTML = ILLOS[name] || '';
  return slot;
}

/* —— view plumbing ———————————————————————————————————————————— */

/* ★ F-2 (#395/#399): ONE reporting point for the whole component.
 *
 * The hardware back button is C#'s, and C# can only swallow it while it believes a
 * FORM view is on screen. Before this, only the two welcome CTA hooks told it
 * anything (`onGoCreate`/`onGoRestore`) and the topbar Back told it separately
 * (`onBack`) — three call sites, and every OTHER way a view can change told it
 * nothing at all: the retry lockout, a future deep link, and the boot view itself.
 * Reporting from `show()` makes the contract structural: if the view changed, C#
 * heard about it, whatever moved it.
 *
 * `silent` suppresses the echo for the one switch C# ITSELF drives (setLaunchView) —
 * it already knows, and an echo would be a second navigation for no new information.
 * The report is fired AFTER the DOM switch and fenced: a throwing or absent host hook
 * must never strand the user on the view they just left. */
function show(st, view, silent) {
  const changed = st.view !== view;
  const prev = st.view;
  st.view = view;
  st.root.dataset.view = view;
  const reveal = () => { for (const [name, node] of Object.entries(st.views)) node.hidden = name !== view; };
  /* ★ Session H (walk row 31): create / restore SLIDE over welcome and slide back off it,
     on the shared in-shell grammar (subscreen-slide.js — desktop and reduced-motion get
     the plain swap from the stylesheet, not from a check here). The boot view (prev ===
     null) and any switch on a detached root swap at once. The welcome view stays
     UNHIDDEN under an entering form and is unhidden BEFORE a leaving one, so the slide
     always runs over the page it reveals. A switch landing mid-flight settles the
     previous one first (settle → its reveal → this one). */
  const prevNode = prev ? st.views[prev] : null;
  const nextNode = st.views[view];
  if (changed && prevNode && nextNode && st.root.isConnected) {
    settleSubscreenSlide(st.root);
    if (prev === 'welcome') {
      nextNode.hidden = false;
      slideSubscreenIn(st.root, nextNode, reveal, { positioned: 'host', append: false });
    } else if (view === 'welcome') {
      st.views.welcome.hidden = false;
      slideSubscreenOut(st.root, prevNode, reveal, { positioned: 'host' });
    } else {
      reveal();
    }
  } else {
    reveal();
  }
  if (changed && !silent && st.opts && st.opts.onViewChange) {
    try { st.opts.onViewChange(view); } catch { /* report only — never block the switch */ }
  }
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
  // st.root is null for the openLegalDoc re-use path (no launch view mounted) —
  // guard rather than dereference, or About's Terms row would throw (iOS-23).
  return st.opts.host || (st.root && st.root.closest('.demo-phone')) || undefined;
}

/* ★ L15 (2026-08-31): this file used to carry its OWN copy of the thirteen
 * languages, and the comment that stood here admitted the hazard in its own words —
 * "keep the two in sync BY HAND". It is gone. Both pickers now read LANGUAGES from
 * flags.js, so a language, a label or a flag is added ONCE.
 * What the deleted note said and is still true: a locale whose dictionary has not
 * landed is not listed at all (build-locales.mjs LANGS, N4/#379) — picking one would
 * translate only the C# layer and leave every shell string English. The old zh-cn
 * entry was also a WRONG code; SpixiLocalization ships cn-cn. */
const LAUNCH_LANGS = LANGUAGES;

/* A4 fallback row (settings.html carries the same guard, one grammar).
 * App.xaml.cs:100-107 auto-detects CultureInfo on FIRST RUN and PERSISTS it when
 * SpixiLocalization ships the code. If that code had no picker row, the
 * pill/picker showed no selection and any tap silently moved the user off their
 * OS language → when `opts.language` is a code we don't list, append ONE row for
 * it (endonym + flag). It renders as selected and is inert (the picker
 * early-returns on value === current), and the sheet carries a hint that the
 * interface stays English until its dictionary lands.
 * N4 (#379): the five pending rows (it/id/lt/cn/ja) GRADUATED into LAUNCH_LANGS.
 * The list is empty; the guard grammar stays for any future
 * legacy-code-without-dictionary state (unknown codes degrade to a raw-code row).
 * (cn-cn: .NET reports zh-cn, which C# can't map → those users land on en-us;
 * the zh→cn map is a logged C# dial, #378.) */
const PENDING_LANGS = [];
/* list + the current code when it isn't in `base` (unknown → raw-code label) */
function launchLangList(base, code) {
  if (!code || base.some((l) => l.code === code)) return base;
  return base.concat([PENDING_LANGS.find((l) => l.code === code) || { code, label: code, flag: '' }]);
}

function buildWelcome(st) {
  const { opts } = st;
  const strings = st.strings;
  const v = document.createElement('div');
  v.className = 'c-launch__welcome';
  v.dataset.theme = 'dark';                      // #20/#160 subtree pin — welcome only

  // — floating top control: the language pill. It opens the settings sheet (one
  //   picker grammar app-wide; the sheet mounts on the host OUTSIDE the dark pin
  //   — the lock hatch-modal precedent). N72 removed the appearance pill. —
  const top = document.createElement('div');
  top.className = 'c-launch__top';

  const offered = (opts.languages && opts.languages.length) ? opts.languages : LAUNCH_LANGS;
  st.language = opts.language || offered[0].code;
  // A4: the saved locale may be one we don't offer (hidden until translated) —
  // it still gets a row, so the pill reads it and the picker shows it selected.
  const languages = launchLangList(offered, st.language);
  const langHint = () => (offered.some((l) => l.code === st.language)
    ? undefined
    : (strings.languagePending
      || 'Your system language is set for Spixi, but this interface is still shown in English. Its translation is on the way.'));
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
    /* ★ L15: the pill draws through the SAME function as the picker row it opens.
     * It carried a raw emoji of its own, so on Windows it showed "US" beside
     * "English" — one defect, two surfaces, and the pill is the one a new user sees
     * FIRST. Now neither can be right while the other is wrong. */
    const flagEl = cur.flag ? createFlag(cur.flag) : null;
    langFlag.replaceChildren();
    if (flagEl) langFlag.append(flagEl);
    langFlag.hidden = !flagEl;
    langLabel.textContent = cur.label;
    langPill.setAttribute('aria-label', (strings.language || 'Language') + ': ' + cur.label);
  };
  syncLang();
  langPill.append(langFlag, langLabel, icon('chevron-down', { size: 16 }));
  langPill.addEventListener('click', () => {
    settingsOptionSheet({
      title: strings.language || 'Language',
      hint: langHint(),                          // A4: only when the saved locale isn't offered
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

  /* ★ N72 (#391, Damir's product call): the APPEARANCE pill is gone. The whole
     launch flow is a fixed-dark brand surface in both themes (dataset.theme = 'dark'
     below), so the pick changed nothing the user could see and cost a page reload.
     The app rides the system theme until the user reaches Account → Appearance.
     ⚠ This comment used to add "the shell carries no theme boot script". L5 gave it
     one — the root now carries the real theme so the launch SHEETS follow the phone —
     and the fixed chrome is unaffected because it is pinned on its own subtree.
     ⚠⚠ It also spelled the carrier out in prose, and that is not free: generatePage
     substitutes text-based and does not skip comments (N83), and this file is inlined
     whole into the bundle. The marker is named indirectly here for that reason. */
  top.append(langPill);
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
      img: base + 'step1.png',
      title: strings.slide1Title || 'Built for you. Owned by you.',
      copy: strings.slide1Copy || 'Encrypted on your device and opened only by the person you sent to. Simple, private messaging with no account and no phone number.',
    },
    {
      img: base + 'step2.png',
      title: strings.slide2Title || 'No phone number. No email. Just a nickname.',
      copy: strings.slide2Copy || 'Your unique Spixi address is the only identity you need. Sign up in seconds and share nothing personal. The account is yours alone.',
    },
    {
      img: base + 'step3.png',
      title: strings.slide3Title || 'Send money like you send a message.',
      copy: strings.slide3Copy || 'A private IXI wallet lives inside every chat. Send and receive payments in a tap, as simple and instant as saying hello.',
    },
    {
      img: base + 'step4.png',
      title: strings.slide4Title || 'Mini Apps, right inside your chats.',
      copy: strings.slide4Copy || 'Play games, run tools, chat with on-device AI, or automate your world, all without ever leaving the conversation.',
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
  // only run autoplay when this shell actually BOOTS at welcome — every view is
  // built up front (welcome hidden on a retry boot), and a ticking timer on a
  // hidden welcome is pure waste (go() is view-gated anyway). Demo boots welcome.
  if (!reduced && (st.opts.view || 'welcome') === 'welcome') {
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
  /* ★ N75 (#391): the welcome CTAs ALWAYS switch in place now — one page hosts
     every view, so there is no page to push and no frame to flicker. The
     onGoCreate/onGoRestore hooks stayed, but their meaning changed from OVERRIDE
     to NOTIFICATION: the native shell uses them to record consent and to tell C#
     which view is on screen (C# needs that for the hardware back button). The
     switch happens either way, so a throwing or absent hook cannot strand the
     user on the welcome screen. */
  createBtn.addEventListener('click', () => {
    stopAuto();
    try { if (opts.onGoCreate) opts.onGoCreate(); } catch { /* notify only */ }
    show(st, 'create');
  });
  restoreBtn.addEventListener('click', () => {
    stopAuto();
    try { if (opts.onGoRestore) opts.onGoRestore(); } catch { /* notify only */ }
    show(st, 'restore');
  });
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
//
// ★ #733 (Session I): THE FULL DOCUMENTS SHIP IN-APP. `LEGAL_DOCS` is generated from
// docs/legal/*.md by scripts/lib/legal-docs.mjs on every bundle build — what the user
// accepts on the create/restore commit is what the user can read, offline, in full.
// The hand-written TERMS summary is RETIRED (it still claimed "IXI Labs collects no
// personal data" after #730 fixed that claim on the privacy side — a hand copy drifts;
// a build-step read cannot). The PRIVACY summary below survives ONLY as the held-doc
// fallback: while docs/legal/privacy-policy.md carries an editorial marker (the §4.3/§11
// retention placeholder is Damir's to fill; the §4.4 "(Updated Session G/#708…)" note
// is internal history), the bake HOLDS that document and this summary renders in its
// place. The day the markers are gone, this constant is dead code — delete it then
// (a grep for PRIVACY_HELD_SUMMARY finds every consumer).
//
// The one-paragraph "dud" of walk row A15 (#731), named: nothing was stale and nothing
// shadowed the body — the legacy lang dictionary has no privacy/terms body key and
// extract-strings lists both bodies as no-fallback refs — the sheet rendered exactly the
// hand-written constant, which at 47d955e8 was ONE paragraph plus the English-only
// line. The summary was the content. The fix is the full document, not a longer summary.
//
// LEAD: one line above every document — the English-only line, kept from the old
// summaries' tail (Damir #733: "keep the English-only line"); the document's own
// "Last updated" line follows it from the bake.
const LEGAL_LEAD_ENGLISH_ONLY = 'This document is provided in English only.';
/* ★ Session H gate sweep (OURS-3) + #730: the claim boundaries (no phone/email · content
 * stays on device · push token+IP to OneSignal on Android/iOS unless switched off · NO
 * push provider on Windows/Catalyst — pushProviderSupported() is false there and the
 * switch is never rendered) are facts and must survive any rewrite. 🟡 Damir: the #730
 * wording pass. This text renders ONLY while the full policy is held (see above). */
const PRIVACY_HELD_SUMMARY = 'No phone number or email is required. Your messages stay on your device, and IXI Labs cannot read your message history or access your wallet keys.\n\nOn Android and iOS, notification delivery uses OneSignal, a push provider: a push token and your IP address reach it. You can turn this off in Settings → Notifications. The desktop app uses no push provider.\n\nThe full Privacy Policy is provided in English only.';

/** The sheet text for a legal document: the baked full document under the lead line,
 *  or — for a HELD document — the honest summary. Pure; one source for the four callers
 *  (consent line ×2, openLegalDoc ×2). */
function legalDocText(doc) {
  const baked = LEGAL_DOCS[doc];
  if (baked && baked.text) return LEGAL_LEAD_ENGLISH_ONLY + '\n\n' + baked.text;
  if (doc === 'privacy') return PRIVACY_HELD_SUMMARY;
  // terms is never held today (no marker in terms-of-use.md); if it ever is, the bake
  // prints the hold and the sheet must still open — the English-only line + a pointer.
  return LEGAL_LEAD_ENGLISH_ONLY + '\n\nThe full document is available at [spixi.io](https://www.spixi.io).';
}

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
  // ★ #733: `**bold**` → <strong>, wrapped around the link pass. Split on the bold
  // marker pairs first; each fragment then goes through appendRich — still text nodes +
  // validated https anchors only; the markers themselves never reach the DOM.
  const appendInline = (el, s) => {
    const parts = String(s).split(/\*\*([^*\n]+?)\*\*/);   // odd indexes = bold runs
    parts.forEach((part, k) => {
      if (!part) return;
      if (k % 2) { const b = document.createElement('strong'); appendRich(b, part); el.append(b); }
      else appendRich(el, part);
    });
  };
  // "# " = heading, "## " = sub-heading (#733), "- " = list item, "1. " = numbered item
  // (#733), else a paragraph. Markers are stripped — the TEXT stays verbatim (text nodes
  // + validated links only, XSS-safe).
  let list = null, listKind = '';
  const openList = (kind) => {
    if (list && listKind === kind) return list;
    list = document.createElement(kind); listKind = kind;
    list.className = 'c-launch__terms-list';
    bodyEl.append(list);
    return list;
  };
  for (const raw of String(text).split('\n')) {
    const line = raw.replace(/\r$/, '');       // CRLF safety only — deliberately not trimmed (passwords are never trimmed; guard-counted)
    if (!line) { list = null; continue; }
    const numbered = /^\d+\. /.exec(line);
    if (line.startsWith('## ')) {
      list = null;
      const h = document.createElement('h5');
      h.className = 'c-launch__terms-h c-launch__terms-h--sub';
      h.textContent = line.slice(3);
      bodyEl.append(h);
    } else if (line.startsWith('# ')) {
      list = null;
      const h = document.createElement('h4');
      h.className = 'c-launch__terms-h';
      h.textContent = line.slice(2);
      bodyEl.append(h);
    } else if (line.startsWith('- ') || numbered) {
      const ul = openList(numbered ? 'ol' : 'ul');
      const li = document.createElement('li');
      appendInline(li, numbered ? line.slice(numbered[0].length) : line.slice(2));
      ul.append(li);
    } else {
      list = null;
      const p = document.createElement('p');
      appendInline(p, line);
      bodyEl.append(p);
    }
  }

  const sheet = createSheet({ content: bodyEl, host: st.docHost || hostEl(st), title, strings });
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

/**
 * iOS-23 — the SAME legal documents, reachable from Account -> About.
 * Onboarding shows Terms/Privacy as in-app doc sheets (never an external link):
 * the copy is app-controlled, works offline, and is deliberately ENGLISH-ONLY
 * (#169 — titles ARE translated, bodies are not). Account -> About must show the
 * identical text from the identical source, so this exports the launch renderer
 * rather than duplicating legal copy into settings-app.js, where the two would
 * silently drift.
 *   openLegalDoc({ doc: 'terms' | 'privacy', host, strings })
 */
export function openLegalDoc({ doc = 'terms', host, strings = getStrings() } = {}) {
  const ctx = { strings, docHost: host, opts: { host }, root: null };
  if (doc === 'privacy') {
    openDocSheet(ctx, strings.privacyTitle || 'Privacy Policy', legalDocText('privacy'));
  } else {
    openDocSheet(ctx, strings.termsTitle || 'Terms of Use', legalDocText('terms'));
  }
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
  termsLink.addEventListener('click', () => openDocSheet(st, strings.termsTitle || 'Terms of Use', legalDocText('terms')));
  fine.append(termsLink);
  fine.append(' ' + (strings.finePrintAck || 'and acknowledge the') + ' ');
  const privacyLink = document.createElement('button');
  privacyLink.type = 'button';
  privacyLink.className = 'c-launch__link';
  privacyLink.textContent = strings.privacyLink || 'Privacy Policy';
  privacyLink.addEventListener('click', () => openDocSheet(st, strings.privacyTitle || 'Privacy Policy', legalDocText('privacy')));
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
    || 'Without it and your backup file, your account and wallet can’t be recovered, not even by us.';
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
      () => {
        /* ★ N76: C# navigates to Home from here — there is no tail to hop to any
           more. Hold the success morph and leave the form disabled: the ONLY
           thing that follows this state is the native page change. Re-enabling
           the fields would offer a second create on a screen that is leaving. */
        inFlight = false;
        setLoading(cta, false);
        setSuccess(cta, { label: strings.created || 'Account created' });
        scrub();                                 // SECURITY §5
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
  heroIllo.src = base + 'restore.png';           // legacy restore art (dark set — launch is pinned dark)
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

/* —— shell ————————————————————————————————————————————————— */

export function createLaunchShell(opts = {}) {
  const { view = 'welcome', termsRequired = false, version = '', strings = getStrings() } = opts;
  const el = document.createElement('section');
  el.className = 'c-launch';
  el.dataset.theme = 'dark';                       // premium round 2: the WHOLE launch is
  // one continuous fixed-dark brand surface on --gradient-launch (welcome→create→
  // restore→retry). The lock screen precedent: forms live on the gradient with
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
  el.append(st.views.welcome, st.views.create, st.views.restore, st.views.retry);

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
  /* ★ F-2: the BOOT view is not reported. C# chose it and put it in the carrier, so
     it already knows — and this line runs during PARSE, where an outgoing navigation
     races C#'s first push (the #177 load-timing invariant). Only real CHANGES report. */
  show(st, LAUNCH_VIEWS.includes(view) ? view : 'welcome', true);
  return el;
}

/** Entry-point router mirror — ★ N75: ONE C# page now hosts every launch view
 *  and switches them with this push (#44 free-fn grammar). */
export function setLaunchView(el, view) {
  const st = launchState.get(el);
  if (!st || !LAUNCH_VIEWS.includes(view) || st.view === view) return;
  /* ★ review MINOR-1 (SECURITY §5): every view switch the COMPONENT drives scrubs the
     password fields it leaves behind (the topbar Back handlers do it explicitly). This
     entry point is the one C# drives — hardware back, and the retry lockout — and it
     used to switch without scrubbing. Before N75 those paths POPPED the page and the
     WebView went with it; now the typed wallet password would sit in a hidden input,
     still revealed if the user had unmasked it, until pagehide. Scrub every field the
     shell owns: each scrub clears and re-masks only its own, so this is safe to run
     on any switch. */
  st.scrubs.forEach((s) => { try { s(); } catch { /* a dead field must not block the switch */ } });
  show(st, view, true);      // ★ F-2: C# drove this one — do not echo it back
}

/** ★ L3 (#706): ONE LEVEL BACK, from the shell's own gesture. The same exit the view's
 *  Back arrow takes — scrub, show welcome, report through `show()` — so the swipe and the
 *  arrow cannot disagree. Returns true when a view was left; false on welcome, where the
 *  shell has nothing to unwind (LaunchPage swallows hardware back there too, #585). */
export function launchShellBack(el) {
  const st = launchState.get(el);
  if (!st || st.view === 'welcome') return false;
  const from = st.view;
  st.scrubs.forEach((s) => { try { s(); } catch { /* a dead field must not block the switch */ } });
  show(st, 'welcome');
  try { if (st.opts && st.opts.onBack) st.opts.onBack(from); } catch { /* nav */ }
  return true;
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
