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
 * 4-slide autoplay carousel (LEGACY step1–4 copy; ★ S11 B #1262: the art is the
 * inline illustration set, dark set) over always-pinned
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
 *   create has no covering alert (indefinite loading, flag §6②); restore:
 *   ★ ON-1 — fail(<any reason>) = C#'s showPasswordError (the red field + the
 *   wrong-password line, the file stays), fail('') = removeLoadingOverlay under
 *   a native alert = a SILENT re-enable; retry's host maps removeLoadingOverlay →
 *   ctrl.fail('') = SILENT restore (the native alert already spoke).
 *   ★ ON-1 (#1420–#1422): create = two steps in ONE view, ONE commit; onAcceptTerms
 *   fires once at the WELCOME tap (#1421 (1)); back from create step 2 = step 1,
 *   values kept, re-reported as `create` (no C# change); the corner rings are ONE
 *   static layer above the views and under the sheets.
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
import { settingsOptionSheet, languageNote } from './settings-shell.js';
import { LANGUAGES, createFlag } from './flags.js';
import { slideSubscreenIn, slideSubscreenOut, settleSubscreenSlide } from './subscreen-slide.js';
import { LEGAL_DOCS } from './legal-docs.js';   // ★ #733: GENERATED from docs/legal at build time — the full documents
import { illoWelcome1, illoWelcome2, illoWelcome3, illoWelcome4, illoRestore } from './illustrations.js';   // ★ S11 B (#1262): the approved set, inline

const launchState = new WeakMap(); // el → st

const LAUNCH_VIEWS = ['welcome', 'create', 'restore', 'retry'];
let legalSeq = 0;                                // ★ #46 r2: a unique id per shell for the welcome legal line

function launchCtrl(onDone, onFail) {            // one-shot (lockCtrl grammar)
  let used = false;
  return {
    done: (payload) => { if (used) return; used = true; onDone(payload); },
    fail: (msg) => { if (used) return; used = true; onFail(msg); },
  };
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
  /* ★ ON-1: create always opens on step 1 (a re-entry from welcome starts the flow again;
     the nickname is kept, the passwords were scrubbed on the way out) */
  if (changed && view === 'create' && st.createGoStep && st.createStep !== 1) st.createGoStep(1, { animate: false, focus: false });
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
  if (changed) {
    /* ★ ON-1 Part B: on desktop the first field takes focus — the nickname on create,
       the password on restore (a phone does not pop its keyboard over the art). */
    if (prev && onDesktop()) {
      if (view === 'create' && st.focusCreate) st.focusCreate();
      if (view === 'restore' && st.focusRestore) st.focusRestore();
    }
    if (st.rings) guardRingsSoon(st);
  }
}

/* ★ ON-1 (#1421/#1422): BACK FROM CREATE STEP 2 LANDS ON STEP 1, values kept — with NO C#
 * change. C#'s hardware back (OnBackButtonPressed → switchView("welcome")) and the iOS
 * swipe (launchShellBack) both believe create is ONE level; while step 2 is up they now
 * show step 1 instead, and re-report `create` through the one report point so C#'s
 * currentView (which switchView just set to welcome) is create again — the next back
 * then leaves to welcome as before. Returns true when it consumed the back. */
function createStepBack(st) {
  if (st.view !== 'create' || st.createStep !== 2 || !st.createGoStep) return false;
  /* ★ #46 r1: while the account is being made the user stays on step 2 (the spinner) — the
     back is consumed and C# hears `create` again, nothing moves */
  if (!st.createBusy) st.createGoStep(1);
  if (st.opts && st.opts.onViewChange) {
    try { st.opts.onViewChange('create'); } catch { /* report only */ }
  }
  return true;
}

const errLine = () => {
  const err = document.createElement('p');
  err.className = 'c-lock__error';               // one error grammar (lock kinship)
  err.setAttribute('role', 'alert');
  err.hidden = true;
  return err;
};

/* —— ON-1 building blocks (#1420–#1422) ——————————————————————————————————————————
 * Everything below is built with createElement + textContent: the nickname and the
 * backup file name are untrusted text. */

const mk = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
/* {name} / {n} / {total} fill — the value lands in a text node, never in markup */
const fillIn = (s, map) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in map ? String(map[k]) : m));
/* phone vs desktop wording = TWO keys chosen at runtime by data-desktop (typed-bubbles.js:840 pattern) */
const onDesktop = () => typeof document !== 'undefined' && document.documentElement.hasAttribute('data-desktop');
/* ★ #46 r1: the "device" wording also fits a TABLET (it is not a phone). The shell's own
   sniff keeps an iPad / Android tablet on the phone LAYOUT (launch.html — no data-desktop);
   only the word follows the device class: iPad (or the Macintosh UA with touch, iPadOS) and
   an Android UA without "Mobile". */
const onTablet = () => {
  if (typeof navigator === 'undefined') return false;
  const u = String(navigator.userAgent || '');
  return /iPad/.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1) || (/Android/.test(u) && !/Mobile/.test(u));
};
const deviceWords = () => onDesktop() || onTablet();
/* an Enter that closes an IME composition is not a submit (composer.js:239 grammar) */
const imeBusy = (e) => !!(e && (e.isComposing || e.keyCode === 229));

/* An error line with the info glyph (ON-1 look) on the shared c-lock__error grammar. The
   message sits in its own span so the glyph never reaches textContent comparisons. */
function launchErrLine() {
  const err = errLine();
  err.classList.add('c-launch__ferr');
  const glyph = icon('info-circle', { size: 16 });
  glyph.setAttribute('aria-hidden', 'true');
  const msg = mk('span', 'c-launch__ferr-text');
  err.append(glyph, msg);
  err.setMessage = (text) => { msg.textContent = text || ''; err.hidden = !text; };
  return err;
}

/* ★ ON-1: the floating-label field. It WRAPS the shared inputs (passwordField's input +
   eye, or the nickname input) — the field logic is not forked; only the launch look is
   added around it. The label is the visible text (the placeholder is cleared) and floats
   above the value once there is one or the field has focus. */
function launchField({ input, label, end = [] }) {
  const field = mk('div', 'c-launch__field');
  const main = mk('label', 'c-launch__field-main');
  const lab = mk('span', 'c-launch__field-label', label);
  input.placeholder = '';
  input.classList.add('c-launch__field-input');
  main.append(lab, input);
  const endEl = mk('div', 'c-launch__field-end');
  const ok = mk('span', 'c-launch__field-ok');
  ok.setAttribute('aria-hidden', 'true');
  ok.hidden = true;
  ok.append(icon('check', { size: 14 }));
  endEl.append(ok, ...end);
  field.append(main, endEl);
  const sync = () => field.toggleAttribute('data-empty', !input.value);
  input.addEventListener('input', sync);
  input.addEventListener('focus', () => field.setAttribute('data-focus', ''));
  input.addEventListener('blur', () => field.removeAttribute('data-focus'));
  sync();
  return {
    field, input, sync,
    setOk: (on) => { ok.hidden = !on; },
    setError: (on) => field.toggleAttribute('data-error', !!on),
  };
}

/* ★ ON-1: the strength bar's rule — length first, a bonus for a long passphrase. It only
   ADVISES; the ≥ ENC_MIN rule is the one that gates the button. No library (Decision). */
function launchStrength(pw) {
  const n = String(pw || '').length;
  if (!n) return 0;
  let s = n < ENC_MIN ? 1 : n < 14 ? 2 : n < 18 ? 3 : 4;
  if (n >= 16 && /\s/.test(pw) && s < 4) s += 1;   // a long phrase with spaces
  return s;
}

/* ★ ON-1: the photo. Step 1 = a button (the existing avatar hook opens the picker — the
   badge sits inside it, so both open it); step 2 = the same photo, smaller, with the
   orange lock, or the initial avatar when there is no photo. */
function launchPhoto({ small = false }) {
  const b = mk(small ? 'div' : 'button', 'c-launch__photo');
  if (small) b.dataset.size = 'sm';
  else b.type = 'button';
  const ring = mk('span', 'c-launch__photo-ring');
  const img = mk('span', 'c-launch__photo-img');
  ring.append(img);
  const badge = mk('span', 'c-launch__badge');
  badge.setAttribute('aria-hidden', 'true');
  b.append(ring, badge);
  return { el: b, img, badge };
}

/* —— the corner contour rings (#1422): ONE static layer for the whole shell ——
   Slightly wobbly concentric contours (the posters/contours.js look) as a static SVG —
   deterministic, no script animation, no CSS animation. viewBox 0 0 100 100; TR centres
   just off the top-right corner, BL off the bottom-left. */
const RINGS = {
  tr: { cx: 107.7, cy: -7.7, radii: [18, 26, 34, 42, 50, 58, 66, 74, 82], a0: 84, a1: 186, seed: 7 },
  bl: { cx: -8, cy: 108, radii: [16, 24, 32, 40, 48, 56, 64, 72], a0: 264, a1: 366, seed: 11 },
};
function ringRand(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function ringPaths({ cx, cy, radii, a0, a1, seed }) {
  const r = ringRand(seed);
  const p1 = r() * 6.28, p2 = r() * 6.28, p3 = r() * 6.28;
  const rmax = radii[radii.length - 1];
  return radii.map((R, i) => {
    const k = 0.55 + 0.45 * (R / rmax);           // the wobble grows outward; rings never cross
    const drift = i * 0.11;
    let d = '';
    for (let a = a0; a <= a1 + 0.001; a += 2) {
      const t = (a * Math.PI) / 180;
      const w = k * (0.9 * Math.sin(3 * t + p1 + drift) + 0.6 * Math.sin(5 * t + p2 - drift) + 0.35 * Math.sin(9 * t + p3));
      d += (d ? 'L' : 'M') + (cx + (R + w) * Math.cos(t)).toFixed(2) + ' ' + (cy + (R + w) * Math.sin(t)).toFixed(2);
    }
    return d;
  });
}
function ringsSvg(kind) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', 'c-launch__rings-' + kind);
  for (const d of ringPaths(RINGS[kind])) {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', d);
    svg.append(p);
  }
  return svg;
}

/* Keep the rings off the content — ★ #46 r1 (auditor B): per RING STROKE, not per set.
   The first guard tested whole content boxes against the OUTER radius, so the full-width
   footer button always silenced the bottom-left set and the progress bar the top-right one
   — create showed no rings on a phone. Now each ring is tested on its own: a ring is hidden
   only when its stroke (the wobble amplitude + half the stroke + a 3 px margin) actually
   crosses a content box (text, a control, a field, a tag, the pill, the art). The inner
   rings stay. A ring never moves; a hidden one fades (launch-form.css). Layout-blind hosts
   (jsdom) see zero-size boxes and keep every ring.
   launchRingQuiet(kind, svgRect, boxes) → the indexes of the rings to hide (pure; pinned). */
export function launchRingQuiet(kind, rect, boxes) {
  const g = RINGS[kind];
  if (!g || !rect || !(rect.width > 0)) return [];
  const sx = rect.width / 100, sy = rect.height / 100;
  const cx = rect.left + g.cx * sx, cy = rect.top + g.cy * sy;
  const tol = 1.85 * sx + 0.7 + 3;               // max wobble (ringPaths: 0.9 + 0.6 + 0.35) + half the 1.4 px stroke + 3 px air
  const out = [];
  g.radii.forEach((r, i) => {
    const R = r * sx;
    const crosses = (boxes || []).some((q) => {
      if (!(q.width > 0 && q.height > 0)) return false;
      const near = Math.hypot(Math.max(q.left - cx, 0, cx - q.right), Math.max(q.top - cy, 0, cy - q.bottom));
      const far = Math.hypot(Math.max(Math.abs(q.left - cx), Math.abs(q.right - cx)), Math.max(Math.abs(q.top - cy), Math.abs(q.bottom - cy)));
      return near <= R + tol && far >= R - tol;   // the circle of radius R passes through the box
    });
    if (crosses) out.push(i);
  });
  return out;
}
/* the content boxes the guard keeps the rings off (viewport rects) */
function ringBoxes(st) {
  const root = st.root, rings = st.rings;
  const shown = (e) => { for (let x = e; x && x !== root; x = x.parentElement) if (x.hidden) return false; return true; };
  const boxes = [];
  const tw = document.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
  let n;
  while ((n = tw.nextNode())) {
    const p = n.parentElement;
    if (!n.nodeValue.trim() || !p || rings.contains(p) || !shown(p)) continue;
    const r = document.createRange();
    r.selectNodeContents(n);
    for (const q of r.getClientRects ? r.getClientRects() : []) boxes.push(q);
  }
  root.querySelectorAll('button, input, .c-launch__field, .c-launch__tag, .c-launch__banner, .c-launch__photo, .c-launch__hero-illo, .c-launch__logo, .c-launch__progress, .c-launch__pill')
    .forEach((e) => { if (shown(e)) boxes.push(e.getBoundingClientRect()); });
  return boxes.map((q) => ({ left: q.left, top: q.top, right: q.right, bottom: q.bottom, width: q.width, height: q.height }));
}
/** The guard's inputs for one shell, for a render harness: { boxes, tr, bl } (viewport rects). */
export function launchRingGeometry(el) {
  const st = launchState.get(el);
  if (!st || !st.rings) return null;
  const rect = (k) => { const svg = st.rings.querySelector('.c-launch__rings-' + k); if (!svg) return null; const b = svg.getBoundingClientRect(); return { left: b.left, top: b.top, width: b.width, height: b.height }; };
  return { boxes: ringBoxes(st), tr: rect('tr'), bl: rect('bl') };
}
function guardRings(st) {
  const root = st.root;
  const rings = st.rings;
  if (!root || !rings || !root.isConnected) return;
  const boxes = ringBoxes(st);
  const allQuiet = [];
  for (const kind of ['tr', 'bl']) {
    const svg = rings.querySelector('.c-launch__rings-' + kind);
    if (!svg) continue;
    const hide = launchRingQuiet(kind, svg.getBoundingClientRect(), boxes);
    const paths = svg.querySelectorAll('path');
    paths.forEach((p, i) => p.toggleAttribute('data-quiet', hide.includes(i)));
    if (paths.length && hide.length === paths.length) allQuiet.push(kind);
  }
  if (allQuiet.length) rings.dataset.quiet = allQuiet.join(' ');   // a set with every ring hidden (informational)
  else delete rings.dataset.quiet;
}
/* ★ S20F W-7 (#1426 = a2): in the ≥ 900 px two-column layout the card header sits where STEP 2 sits
   centred, so step 1 → 2 moves nothing; restore / retry anchor at their own normal-state centre, so the
   wrong-password line grows the card DOWNWARD only. rows 2–5 = topbar top → footer bottom, minus what the
   visible error / honest lines add (box + margins + the flex gap): ★ #46 r1 (MINOR-1) no live region is
   toggled. ★ r2 (MINOR-4): the rows depend on the WIDTH and the fonts, not the height — they are cached per
   (view, width, fonts) and the anchor follows the current room height without a re-measure. Create on step 1
   with no cache reads step 2 OUT OF FLOW (absolute + visibility hidden on its fields / footer, one synchronous
   read, no paint between) — step 1, with the focused nickname, is never hidden. Written as --launch-card-top on
   the view (launch.html: the first grid row); an unchanged room does nothing (the fitArt key grammar). */
const twoColumn = () => onDesktop() && typeof matchMedia === 'function' && matchMedia('(min-width: 900px)').matches;
const isShown = (e, top) => { for (let x = e; x && x !== top; x = x.parentElement) if (x.hidden) return false; return true; };
function quietPx(e) {
  const cs = getComputedStyle(e);
  const par = e.parentElement;
  const sib = par && [...par.children].some((c) => c !== e && !c.hidden);
  const gap = sib ? (parseFloat(getComputedStyle(par).rowGap) || 0) : 0;
  return e.offsetHeight + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0) + gap;
}
function cardRows(v) {
  const bar = v.querySelector(':scope > .c-topbar');
  const p1 = v.querySelector('.c-launch__step[data-step="1"]'), p2 = v.querySelector('.c-launch__step[data-step="2"]');
  if (!bar) return 0;
  const quiet = (region) => { let q = 0; for (const e of region.querySelectorAll('.c-launch__ferr, .c-launch__honest')) if (isShown(e, v)) q += quietPx(e); return q; };
  if (!p2 || !p2.hidden) {                       // restore / retry, or create with step 2 on screen
    const foot = p2 ? p2.querySelector('.c-launch__footer') : v.querySelector(':scope > .c-launch__footer');
    return foot ? foot.getBoundingClientRect().bottom - bar.getBoundingClientRect().top - quiet(p2 || v) : 0;
  }
  const f1 = p1 && p1.querySelector('.c-launch__fields');
  const parts = [p2.querySelector('.c-launch__fields'), p2.querySelector('.c-launch__footer')];
  if (!f1 || parts.some((x) => !x)) return 0;
  const head = f1.getBoundingClientRect().top - bar.getBoundingClientRect().top;   // rows 2–3 (topbar + progress) are shared
  p2.hidden = false;
  parts.forEach((x) => { x.style.position = 'absolute'; x.style.visibility = 'hidden'; });
  const rows = head + parts[0].offsetHeight + parts[1].offsetHeight - quiet(p2);
  parts.forEach((x) => { x.style.position = ''; x.style.visibility = ''; });
  p2.hidden = true;
  return rows;
}
function fitCard(st) {
  const v = st.views[st.view];
  if (!v || !v.classList.contains('c-launch__form') || !v.clientHeight || !twoColumn()) return;
  const fonts = document.fonts ? document.fonts.status : '';
  const key = [st.view, v.clientWidth, v.clientHeight, fonts].join('|');
  const keys = st.cardKeys || (st.cardKeys = {});
  if (keys[st.view] === key) return;
  const rowKey = [st.view, v.clientWidth, fonts].join('|');
  const cache = st.cardRows || (st.cardRows = {});
  let rows = cache[rowKey];
  if (rows === undefined) {
    rows = cardRows(v);
    if (rows > 0) cache[rowKey] = rows;
  }
  if (!(rows > 0)) return;
  const cs = getComputedStyle(v);
  const room = v.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
  v.style.setProperty('--launch-card-top', Math.max(0, Math.floor((room - rows) / 2)) + 'px');
  keys[st.view] = key;
}

/* after a switch: now (static layouts) and once the slide / step motion has settled */
function guardRingsSoon(st) {
  const run = () => {
    try { fitCard(st); } catch { /* layout only */ }   // ★ S20F W-7: before the rings read the boxes
    try { if (st.fitArt) st.fitArt(); } catch { /* art fit only */ }   // ★ #46 r2: the art first — the rings guard reads the result
    try { guardRings(st); } catch { /* decoration only — never block a switch */ }
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
  clearTimeout(st.ringsT);
  st.ringsT = setTimeout(run, 320);
}

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
      // ★ S9 L (#1246): the AI note + report link for a non-English language (not for the A4
      // hidden row). The page reloads on a pick, so the note is always in the current language.
      note: languageNote({
        code: st.language, hidden: !offered.some((l) => l.code === st.language), strings,
        onReport: opts.onReportTranslation,
      }),
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
  /* ★ ON-1 Part C (#1422, pill P2 — phone AND desktop): the pill grows to 44 px (a 48 px
     hit area, launch-shell.css) and gains a small caption under it — a globe + the
     EXISTING `language` key — so a user who cannot read the current language still finds
     the control. The caption is aria-hidden: the pill's own label already says
     "Language: …". LaunchPage.xaml.cs:73-84 is untouched. */
  const lang = document.createElement('div');
  lang.className = 'c-launch__lang';
  const caption = document.createElement('span');
  caption.className = 'c-launch__lang-caption';
  caption.setAttribute('aria-hidden', 'true');
  caption.append(icon('world', { size: 14 }), mk('span', null, strings.language || 'Language'));
  lang.append(langPill, caption);
  top.append(lang);
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

  /* ★ S11 B (#1262): the four slides draw the APPROVED illustration set INLINE (Default
     tiles: W1 round 3 · W2 round 1 · W3 round 3 · W4 round 1). The step1–4 PNGs and the
     `illustrationBase` option are gone — the art is in the bundle, so there is no file to
     miss and no error rung. The launch subtree is pinned dark, so --il-* resolve dark. */
  const defs = [
    {
      /* ★ S20F W-5 (#1425): the new order — slide 1 = the nickname promise with the ID-card art (was slide 2) */
      art: illoWelcome2,
      title: strings.slide1Title2 || 'Private chat. No phone number.',
      copy: strings.slide1Copy3 || 'Sign up with a nickname. No email, no ID, nothing personal.',
    },
    {
      /* ★ #1425: "post-quantum" supersedes #702 for the welcome only (the rsa2 gap is recorded); no server line (#703) */
      art: illoWelcome1,
      title: strings.slide2Title2 || 'Private by design.',
      copy: strings.slide2Copy2 || 'Post-quantum encrypted on your device and sent peer to peer. Only the person you write to can read it.',
    },
    {
      art: illoWelcome3,
      /* ★ ON-1 Part D (store wording rule): say IXI, never "money", and promise no
         "instant". The English source changed under the SAME keys — every locale is
         re-translated through the pipeline (strings/T.json: RETRANSLATE). */
      title: strings.slide3Title || 'Send IXI like a message.',
      copy: strings.slide3Copy || 'A private IXI wallet lives inside every chat. Send and request IXI in a tap.',
    },
    {
      art: illoWelcome4,
      title: strings.slide4Title2 || 'Play and plan together.',
      copy: strings.slide4Copy2 || 'Mini apps like Blitz Chess and Split open right in your chats.',
    },
  ];
  const slides = defs.map((s, i) => {
    const slide = document.createElement('div');
    slide.className = 'c-launch__slide';
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-label', (i + 1) + ' / ' + defs.length);
    // decorative (aria-hidden + focusable=false) — the copy carries meaning. Its entrance
    // waits while the slide is aria-hidden (launch-shell.css), so each slide plays it ONCE
    // when it first comes into view, then holds.
    slide.append(s.art({ className: 'c-launch__illo-img' }));
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
  /* ★ S20F W-4 (#1426): the 24 px side fade ONLY while the track moves (at rest the slide text sits
     8 px from the edge, a resting mask would fade it). data-moving = set when the transform changes
     (not under reduced motion, not on a detached build), cleared on the track's transitionend + a belt. */
  let movingT = 0;
  const stopMoving = () => { clearTimeout(movingT); car.removeAttribute('data-moving'); };
  track.addEventListener('transitionend', (e) => { if (e.target === track) stopMoving(); });
  const go = (i) => {
    st.slide = Math.max(0, Math.min(defs.length - 1, i));
    const tf = 'translateX(' + (st.slide * -100) + '%)';
    if (track.style.transform !== tf && v.isConnected
      && !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      car.setAttribute('data-moving', '');
      clearTimeout(movingT);
      movingT = setTimeout(stopMoving, 600);       // completes-never backstop (#326): > --duration-300
    }
    track.style.transform = tf;
    slides.forEach((s, k) => s.setAttribute('aria-hidden', String(k !== st.slide)));
    dotBtns.forEach((b, k) => {
      b.setAttribute('aria-selected', String(k === st.slide));
      b.tabIndex = k === st.slide ? 0 : -1;      // roving tabindex
    });
  };

  // gentle autoplay (premium-tour idiom): wraps every 7s until the user takes
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
    }, 7000);   // ★ S20F W-5 (#1425): 5 s → 7 s (reading time)
  }
  st.stopAuto = stopAuto;
  st.els.carousel = car;

  /* ★ #46 r2 (M2, Damir 22:4x: "the slide ART shrinks on short screens"): the title and the
     copy never clip — the art is the flexible part. CSS lets it shrink (flex-shrink, square
     aspect kept, launch-shell.css); below a floor it would only be a smudge, so a slide whose
     room for art is under ART_FLOOR px drops its art (data-art-off) and gives the text the
     space. Measured per slide from the TEXT heights alone, so the decision does not depend
     on the art's own state (no flip-flop). Layout-blind hosts (height 0) leave it alone. */
  const ART_FLOOR = 72;                          // sanctioned: px — under this the art is noise
  /* ★ #46 r3 (MINOR-B): ONE art size for the whole carousel — the smallest room any slide
     has — so the title does not jump as autoplay pages; and when that smallest room is under
     the floor, EVERY slide drops its art (not just the tight ones). The size rides
     --launch-art-room on the carousel (launch-shell.css caps the art height with it). */
  /* ★ #46 r4 → ★ r5 (M1): the LOGO and the welcome spacing are part of the room too. ONE
     decision per fit, measured synchronously (no frame paints between the trial states), and
     MONOTONIC in the window height — a shorter welcome never shows more than a taller one,
     with the art weighing more than the logo ({art + logo} > {art} > {logo} > {}):
       L0 + art   — the art fits at its floor with the logo;
       L1 + art   — it fits only without the logo (data-compact="1": logo hidden, spacing
                    tighter) — L1 is used ONLY when it keeps the art (1280 × 560 keeps its art);
       L0 − art   — the art does not fit either way, but the text fits WITH the logo;
       L2 − art   — even that does not fit: the tightest welcome (data-compact="2": smaller
                    paddings, the pill caption folds, 44 px buttons, a wider copy column).
                    Never art at L2 — it would come back below a height that had dropped it.
     Limits (recorded in DECISIONS, not fixed): the text can still clip on a landscape phone
     at 568 × 320 / 640 × 280 and under a large text zoom — L2 is the floor of this ladder.
     ★ r5 (NIT) → ★ r6 (MAJOR, structural): a fit whose INPUTS did not change does nothing
     (no trial layouts, no attribute writes). The input is the ROOM itself, not its causes:
     the carousel box at the level it was decided for (it takes every pixel the welcome
     column has left — an inset push, a version / legal line, the window, the padding of a
     level all show up there), the column width, and the font state. r5 keyed the welcome
     box and missed the safe-area PADDING inside it (C# inset pushes after the first fit).
     The carousel is observed again (the fit still runs in the next frame — no RO loop); a
     fit that changed the level re-reads its own result, finds the same key and stops. */
  let fitKey = '';
  const roomKey = () => [v.dataset.compact || '0', v.clientWidth, car.clientWidth, car.clientHeight,
    (typeof document !== 'undefined' && document.fonts) ? document.fonts.status : ''].join('|');
  st.fitArt = () => {
    const measure = () => {
      let minRoom = Infinity, minText = Infinity;
      for (const sl of slides) {
        const h = sl.clientHeight;
        if (!sl.clientWidth) return null;          // layout-blind host (or not laid out yet): leave it alone — a 0 px TALL slide is real (a squeezed window)
        const cs = getComputedStyle(sl);
        const gap = parseFloat(cs.rowGap || cs.gap) || 0;
        const pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
        let text = 0;
        for (const t of sl.querySelectorAll('.c-launch__slide-title, .c-launch__slide-copy')) text += t.getBoundingClientRect().height;
        const art = sl.querySelector('.c-launch__illo-img');
        const artMargin = art ? (parseFloat(getComputedStyle(art).marginBottom) || 0) : 0;
        minRoom = Math.min(minRoom, h - pad - text - 2 * gap - artMargin);
        minText = Math.min(minText, h - pad - text - gap);
      }
      return { minRoom, minText };
    };
    if (roomKey() === fitKey && car.clientWidth) return;   // the room it was decided for has not moved
    const setLevel = (n) => { if (n) v.dataset.compact = String(n); else delete v.dataset.compact; };
    const before = v.dataset.compact;
    setLevel(0);
    const m0 = measure();
    if (!m0) { if (before) v.dataset.compact = before; return; }
    let level = 0, art = false, m = m0;
    if (m0.minRoom >= ART_FLOOR) { art = true; }
    else {
      setLevel(1);
      const m1 = measure() || m0;
      if (m1.minRoom >= ART_FLOOR) { level = 1; art = true; m = m1; }
      else if (m0.minText >= 0) { level = 0; setLevel(0); }
      else { level = 2; setLevel(2); }
    }
    for (const sl of slides) sl.toggleAttribute('data-art-off', !art);
    if (art) car.style.setProperty('--launch-art-room', Math.floor(m.minRoom) + 'px');
    else car.style.removeProperty('--launch-art-room');
    fitKey = roomKey();                            // read AFTER the decision: the room at the level now on screen
  };

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

  /* ★ S20F W-5 (#1425/#1426): one quiet line under the dots — plain text, not a link; hidden at L2 (CSS) */
  v.append(car, dots, mk('p', 'c-launch__oss', strings.welcomeOpenSource || 'Open source'));

  // — CTAs: always enabled, pinned; internal routing (the shell ABSORBS the
  //   legacy pages). ⚠ SUPERSEDED by #1421 (1): consent is recorded at THIS tap
  //   (below), not at the create/restore commit —
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
  /* ★ ON-1 (#1421 (1)) + #46 r1: CONSENT IS RECORDED HERE, at the welcome tap, and ONLY
     here: emitAccept (latched once) is the one path — launch.html arms it with
     setLaunchTerms on C#'s showTerms push and sends ixian:accept from onAcceptTerms (its own
     recordConsent latch is gone). The legal line under these buttons is what the tap agrees to. */
  createBtn.addEventListener('click', () => {
    stopAuto();
    emitAccept(st);
    try { if (opts.onGoCreate) opts.onGoCreate(); } catch { /* notify only */ }
    show(st, 'create');
  });
  restoreBtn.addEventListener('click', () => {
    stopAuto();
    emitAccept(st);
    try { if (opts.onGoRestore) opts.onGoRestore(); } catch { /* notify only */ }
    show(st, 'restore');
  });
  ctas.append(createBtn, restoreBtn);
  v.append(ctas);

  /* ★ #46 r1 (Damir: "consent stays at welcome — the legal line stays where the tap records
     it"): ONE small line under the two buttons, because the tap above records consent
     (ixian:accept, emitAccept). Both links open the in-app legal sheets (openDocSheet +
     legalDocText — the same documents Account → About shows). The line is a template so a
     translation can order the two links; every piece lands as a text node or a button. */
  const legal = document.createElement('p');
  legal.className = 'c-launch__legal';
  const legalLink = (text, open) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-launch__link';
    b.textContent = text;
    b.addEventListener('click', open);
    return b;
  };
  const tpl = strings.welcomeConsent || 'By continuing, you agree to the {terms} and {privacy}.';
  for (const part of String(tpl).split(/(\{terms\}|\{privacy\})/)) {
    if (part === '{terms}') legal.append(legalLink(strings.termsLink || 'Terms of Use', () => openDocSheet(st, strings.termsTitle || 'Terms of Use', legalDocText('terms'))));
    else if (part === '{privacy}') legal.append(legalLink(strings.privacyLink || 'Privacy Policy', () => openDocSheet(st, strings.privacyTitle || 'Privacy Policy', legalDocText('privacy'))));
    else if (part) legal.append(part);
  }
  v.append(legal);
  /* ★ #46 r2 (m3): the consent text is announced WITH the two buttons that record it */
  legal.id = 'c-launch-legal-' + (++legalSeq);
  createBtn.setAttribute('aria-describedby', legal.id);
  restoreBtn.setAttribute('aria-describedby', legal.id);

  /* ★ #46 r3 (MINOR-A): the version line's room is RESERVED from the first paint (min-height
     in launch-shell.css) — C#'s setVersion arrives after it, and a line that appeared then
     took ~32 px from the carousel and re-sized the art under the user's eyes. Empty = an
     empty, aria-hidden box (nothing to announce). */
  const version = document.createElement('p');
  version.className = 'c-launch__version';
  version.setAttribute('aria-hidden', 'true');
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
// place.
//
// ★★ 2026-09-08 — THE MARKERS ARE GONE AND THE FULL POLICY NOW SHIPS. Damir supplied the
// one fact the document was waiting on (an undelivered message is discarded after 30 days;
// a delivered one is deleted automatically), §4.3 and the §11 table were filled, and the
// §4.4 internal changelog note was removed. `build-legal-docs` no longer prints 🟡 and
// `legalDocText('privacy')` now returns the baked document.
//
// ⚠ AND THE SENTENCE THAT USED TO STAND HERE — "the day the markers are gone, this
// constant is dead code, delete it then" — IS WRONG, so it has been removed rather than
// followed. The hold is not a one-time state: `holdReasons()` runs on EVERY bake, so any
// future edit that reintroduces a marker holds the document again and this summary is what
// renders in its place. Delete it and that edit ships an EMPTY privacy sheet instead of an
// honest short one. The constant stays as the guard it actually is; it is simply not
// reached while the document is clean. (#772: the licence-to-delete class — a comment that
// reads as an instruction is still only a claim, and this one did not survive checking.)
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
 * wording pass. This text renders ONLY while the full policy is held — which, since
 * 2026-09-08, is no longer the case: it is the fallback for a FUTURE hold, not the
 * shipping copy. Keep it accurate anyway; it is one bad edit away from being live. */
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

// one-shot ixian:accept — ★ ON-1 (#1421 (1)): emitted at the WELCOME tap (Create new /
// Restore existing), latched to one. The consent fine-print line that sat above the
// create / restore commit is gone with it: Damir's pick carries no legal line on step 2
// or restore. The Terms / Privacy sheets stay reachable from Account → About
// (openLegalDoc below).
function emitAccept(st) {
  if (!st.termsRequired || st.acceptSent) return;
  st.acceptSent = true;
  try { if (st.opts.onAcceptTerms) st.opts.onAcceptTerms(); } catch { /* pref */ }
}

/* —— the form views (★ ON-1, #1420–#1422) ——————————————————————————————————————
 * Create = TWO steps inside ONE view and ONE commit to C# (`create:<nick>:<password>`);
 * restore = one screen. Both ride the lifted --gradient-launch-form backdrop and share the
 * #615 keyboard structure: `.c-launch__body` scrolls, `.c-launch__footer` (the commit
 * button) lifts by --kb-inset. On a desktop window ≥ 900 px the same DOM lays out in two
 * columns (the hero left, ONE 460 px card right) — CSS only, no second tree. */

/* the shared topbar + the step label UNDER the title (phone: the top-right corner belongs
   to the rings; desktop: the label moves to the card's right edge by CSS) */
function formTopbar(st, title, onBack) {
  const strings = st.strings;
  const bar = createTopbar({ variant: 'view', title: '', backLabel: strings.back || 'Back', onBack });
  const t = bar.querySelector('.c-topbar__title');
  const titleEl = mk('h1', 'c-launch__head-title', title);   // the view's heading (the hero title is the visual one)
  const stepEl = mk('span', 'c-launch__head-step');
  stepEl.hidden = true;
  if (t) { t.textContent = ''; t.classList.add('c-launch__head'); t.append(titleEl, stepEl); }
  return { bar, stepEl };
}

function buildCreate(st) {
  const { opts } = st;
  const strings = st.strings;
  const v = document.createElement('div');
  v.className = 'c-launch__view c-launch__form';
  v.dataset.launchView = 'create';
  v.dataset.progress = '';

  /* —— the fields (the shared inputs, wrapped) —— */
  const nickIn = textInput({ label: strings.nickname || 'Nickname', name: 'nick' });
  const nickF = launchField({ input: nickIn, label: strings.nickname || 'Nickname' });
  const pw = passwordField({ label: strings.password || 'Password', strings });               // new-password
  const rp = passwordField({ label: strings.repeatPassword || 'Confirm password', strings });  // new-password
  const pwF = launchField({ input: pw.input, label: strings.password || 'Password', end: [pw.wrap.querySelector('.c-lock__reveal')] });
  const rpF = launchField({ input: rp.input, label: strings.repeatPassword || 'Confirm password', end: [rp.wrap.querySelector('.c-lock__reveal')] });
  const scrub = () => {
    pw.input.value = ''; rp.input.value = ''; pw.mask(); rp.mask();
    pwF.sync(); rpF.sync();
    if (st.createSync) st.createSync();
  };
  st.scrubs.push(scrub);

  /* —— header: back · "Create your account" · "1 of 2" + the two-segment progress —— */
  const { bar, stepEl } = formTopbar(st, strings.createTitle || 'Create your account', () => {
    // ★ ON-1: step 2 → step 1 keeps every value (no scrub); step 1 → welcome scrubs (SECURITY §5)
    if (st.createBusy && st.createStep === 2) return;   // ★ #46 r1: no back while the account is being made — ★ r2 (n2): on STEP 2 only (a re-entered step 1 must leave)
    if (st.createStep === 2) { goStep(1); return; }
    scrub();
    show(st, 'welcome');
    try { if (opts.onBack) opts.onBack('create'); } catch { /* nav */ }
  });
  stepEl.hidden = false;
  const progress = mk('div', 'c-launch__progress');
  progress.setAttribute('role', 'progressbar');
  progress.setAttribute('aria-valuemin', '1');
  progress.setAttribute('aria-valuemax', '2');
  const seg1 = mk('i'), seg2 = mk('i');
  progress.append(seg1, seg2);
  v.append(bar, progress);

  /* —— step 1 "Who are you on Spixi?": photo → title → tags → nickname (#1422: one order) —— */
  const pane1 = mk('div', 'c-launch__step');
  pane1.dataset.step = '1';
  const body1 = mk('div', 'c-launch__body u-scroll');
  const hero1 = mk('div', 'c-launch__hero');
  const photo1 = launchPhoto({ small: false });
  photo1.el.addEventListener('click', () => {
    // ixian:avatar → native picker → loadAvatar(path) → setLaunchAvatar (C# writes the photo at pick time)
    try { if (opts.onPickAvatar) opts.onPickAvatar(); } catch { /* picker */ }
  });
  const tags = mk('div', 'c-launch__tags');
  for (const [ic, text] of [
    ['phone-off', strings.hintNoPhoneTitle || 'No phone number'],
    ['at', strings.tagNoEmail || 'No email'],
    ['shield-lock', strings.tagNoId || 'No ID'],
  ]) {
    const tag = mk('span', 'c-launch__tag');
    const g = icon(ic, { size: 15 });
    g.setAttribute('aria-hidden', 'true');
    tag.append(g, mk('span', null, text));
    tags.append(tag);
  }
  hero1.append(photo1.el,
    mk('h2', 'c-launch__hero-title', strings.create1Title || 'Who are you on Spixi?'),
    mk('p', 'c-launch__hero-copy', strings.create1Sub || 'Pick a nickname. A photo is optional.'),
    tags);
  const fields1 = mk('div', 'c-launch__fields');
  const err1 = launchErrLine();
  fields1.append(nickF.field, err1);
  body1.append(hero1, fields1);
  const foot1 = mk('div', 'c-launch__footer');
  const addr = mk('p', 'c-launch__fnote');
  const lockG = icon('lock', { size: 15 });
  lockG.setAttribute('aria-hidden', 'true');
  addr.append(lockG, mk('span', null, deviceWords()
    ? (strings.addressNoteDevice || 'Your Spixi address is made on this device.')
    : (strings.addressNotePhone || 'Your Spixi address is made on this phone.')));
  const next = createButton({ label: strings.continue || 'Continue', size: 56, width: 'full', disabled: true });
  foot1.append(addr, next);
  pane1.append(body1, foot1);

  /* —— step 2 "Protect your account" —— */
  const pane2 = mk('div', 'c-launch__step');
  pane2.dataset.step = '2';
  pane2.hidden = true;
  const body2 = mk('div', 'c-launch__body u-scroll');
  const hero2 = mk('div', 'c-launch__hero');
  const photo2 = launchPhoto({ small: true });
  photo2.badge.append(icon('lock', { size: 18 }));
  const sub2 = mk('p', 'c-launch__hero-copy');
  hero2.append(photo2.el, mk('h2', 'c-launch__hero-title', strings.create2Title || 'Protect your account'), sub2);
  const fields2 = mk('div', 'c-launch__fields');
  const mismatch = launchErrLine();
  mismatch.classList.add('c-launch__mismatch');
  const meter = mk('div', 'c-launch__meter');
  meter.dataset.level = '0';
  for (let i = 0; i < 4; i++) meter.append(mk('i'));
  const meterLabel = mk('span', 'c-launch__meter-label');
  meterLabel.setAttribute('aria-live', 'polite');
  meter.append(meterLabel);
  const LEVELS = [
    strings.strengthWeak || 'Weak',
    strings.strengthFair || 'Fair',
    strings.strengthGood || 'Good',
    strings.strengthStrong || 'Strong',
  ];
  const checks = mk('div', 'c-launch__checks');
  const check = (text) => {
    const c = mk('span', 'c-launch__check');
    c.dataset.state = 'idle';
    const b = mk('b');
    b.setAttribute('aria-hidden', 'true');
    c.append(b, mk('span', null, text));
    checks.append(c);
    return { c, b };
  };
  const chkLen = check(fillIn(strings.checkLength || '{n}+ characters', { n: ENC_MIN }));
  const chkMatch = check(strings.checkMatch || 'Passwords match');
  const setCheck = ({ c, b }, state) => {
    if (c.dataset.state === state) return;
    c.dataset.state = state;
    b.replaceChildren();
    if (state === 'ok') b.append(icon('check', { size: 12 }));
    if (state === 'bad') b.append(icon('x', { size: 11 }));
  };
  const err2 = launchErrLine();
  const banner = mk('div', 'c-launch__banner');
  banner.setAttribute('role', 'note');
  const tile = mk('span', 'c-launch__tile');
  tile.setAttribute('aria-hidden', 'true');
  tile.append(icon('key', { size: 20 }));
  const bannerText = mk('div', 'c-launch__banner-text');
  bannerText.append(
    mk('p', 'c-launch__banner-title', strings.createWarnTitle2 || 'Write this password down'),
    mk('p', 'c-launch__banner-body', deviceWords()
      ? (strings.createWarnBodyDevice || 'It unlocks your account and wallet on this device. Nobody can reset it, not even Spixi.')
      : (strings.createWarnBodyPhone || 'It unlocks your account and wallet on this phone. Nobody can reset it, not even Spixi.')));
  banner.append(tile, bannerText);
  fields2.append(pwF.field, rpF.field, mismatch, meter, checks, err2, banner);
  body2.append(hero2, fields2);
  const foot2 = mk('div', 'c-launch__footer');
  const cta = createButton({ label: strings.createSubmit || 'Create my account', size: 56, width: 'full', disabled: true });
  const ctaLabel = () => cta.querySelector('.c-button__label');
  /* ★ #1421 (2): create runs RSA-4096 keygen OFF the UI thread (LaunchPage), so the spinner
     moves; after 2 s ONE honest line says why it can take a while. No setup screen. */
  const honest = mk('p', 'c-launch__honest', deviceWords()
    ? (strings.creatingSlowDevice || 'Making your keys on this device. This can take a few seconds.')
    : (strings.creatingSlowPhone || 'Making your keys on this phone. This can take a few seconds.'));
  honest.setAttribute('role', 'status');
  honest.hidden = true;
  foot2.append(cta, honest);
  pane2.append(body2, foot2);
  v.append(pane1, pane2);

  /* —— live state —— */
  let inFlight = false;
  let honestT = 0;
  let rpBlurred = false;
  const sync = () => {
    const name = nickIn.value.trim();
    next.disabled = !name || inFlight;
    nickF.setOk(!!name && !name.includes(':'));
    const p = pw.input.value, r = rp.input.value;
    const lenOk = p.length >= ENC_MIN;
    const match = !!r && r === p;
    // the confirm field shouts only once it is as long as the password, or after it lost focus
    const shout = !!r && !match && (r.length >= p.length || rpBlurred);
    const lvl = launchStrength(p);
    meter.dataset.level = String(lvl);
    meterLabel.textContent = lvl ? LEVELS[lvl - 1] : '';
    setCheck(chkLen, lenOk ? 'ok' : 'idle');
    setCheck(chkMatch, match ? 'ok' : shout ? 'bad' : 'idle');
    rpF.setOk(match);
    rpF.setError(shout);
    mismatch.setMessage(shout ? (strings.mismatchYet || 'The passwords don’t match yet.') : '');
    if (!inFlight) cta.disabled = !(lenOk && match);
  };
  st.createSync = sync;
  nickIn.addEventListener('input', () => { if (!st.avatarSrc) renderAvatar(); err1.setMessage(''); sync(); });
  pw.input.addEventListener('input', () => { err2.setMessage(''); sync(); });
  rp.input.addEventListener('input', () => { err2.setMessage(''); if (!rp.input.value) rpBlurred = false; sync(); });
  rp.input.addEventListener('blur', () => { if (rp.input.value) { rpBlurred = true; sync(); } });

  /* —— the step switch (★ ON-1: one view, two panes; the progress, the label and the hero
     follow). Motion: the entering pane slides in (phone) / the card content slides and the
     hero cross-fades (desktop) — launch-shell.css; reduced motion = a short fade. —— */
  const goStep = (n, { animate = true, focus = true } = {}) => {
    const from = st.createStep;
    st.createStep = n;
    v.dataset.createStep = String(n);   // the panes carry data-step; the view says which one is up
    pane1.hidden = n !== 1;
    pane2.hidden = n !== 2;
    seg1.toggleAttribute('data-on', true);
    seg2.toggleAttribute('data-on', n === 2);
    progress.setAttribute('aria-valuenow', String(n));
    stepEl.textContent = fillIn(strings.stepOf || '{n} of {total}', { n, total: 2 });
    progress.setAttribute('aria-label', stepEl.textContent);
    if (n === 2) {
      const name = nickIn.value.trim();
      sub2.textContent = fillIn(deviceWords()
        ? (strings.create2SubDevice || '{name}, this password locks your chats and your wallet on this device.')
        : (strings.create2SubPhone || '{name}, this password locks your chats and your wallet on this phone.'), { name });
      renderAvatar();
    }
    const pane = n === 1 ? pane1 : pane2;
    if (animate && from && from !== n && v.isConnected) {
      pane.dataset.enter = n > from ? 'fwd' : 'back';
      const done = () => { delete pane.dataset.enter; };
      pane.addEventListener('animationend', (e) => { if (e.target === pane || pane.contains(e.target)) done(); }, { once: true });
      setTimeout(done, 480);   // completes-never backstop (#326)
    }
    if (focus) {
      try { (n === 1 ? nickIn : pw.input).focus({ preventScroll: true }); } catch { /* focus is a courtesy */ }
    }
    if (st.root) guardRingsSoon(st);
  };
  st.createGoStep = goStep;

  const toStep2 = () => {
    if (inFlight || next.disabled) return;
    const name = nickIn.value.trim();
    if (!name) { err1.setMessage(strings.nickEmpty || 'Pick a nickname.'); return; }
    if (name.includes(':')) {
      // C# splits create:<nick>:<password> on the FIRST ':' (launch-spec §1)
      err1.setMessage(strings.nickColon || 'Nicknames can’t contain “:”.');
      nickIn.focus();
      return;
    }
    err1.setMessage('');
    goStep(2);
  };
  next.addEventListener('click', toStep2);
  // Enter on the LAST field of the step runs the main button — only while it is on
  nickIn.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !imeBusy(e) && !next.disabled) toStep2(); });

  const submit = () => {
    if (inFlight) return;
    const name = nickIn.value.trim();              // nick IS trimmed (display name); passwords NEVER
    const p = pw.input.value, r = rp.input.value;
    const fail1 = (msg) => { goStep(1); err1.setMessage(msg); nickIn.focus(); };
    if (!name) return fail1(strings.nickEmpty || 'Pick a nickname.');
    if (name.includes(':')) return fail1(strings.nickColon || 'Nicknames can’t contain “:”.');
    const fail2 = (msg, f) => { err2.setMessage(msg); if (f) f.focus(); };
    if (!p) return fail2(strings.passwordEmpty3 || 'Choose a password.', pw.input);   // ★ S9 (#1246): no "wallet"
    if (p.length < ENC_MIN) {
      return fail2((strings.newTooShort || 'The password needs at least {n} characters.').replace('{n}', String(ENC_MIN)), pw.input);
    }
    if (p !== r) return fail2(strings.repeatMismatch || 'The passwords don’t match.', rp.input);
    if (p.includes(name + ':')) {
      // Replace(nick+":","") corruption hazard — never sent (launch-spec §1; §9 C# ask)
      return fail2(strings.badPassword || 'That password contains an unsupported character sequence.', pw.input);
    }
    err2.setMessage('');
    inFlight = true;
    /* ★ #46 r1: the user STAYS on step 2 while the account is being made (and after success,
       until C# navigates) — back is held, so a later fail(msg) lands on the step on screen */
    st.createBusy = true;
    nickIn.disabled = true; pw.input.disabled = true; rp.input.disabled = true; photo1.el.disabled = true;
    next.disabled = true;
    const label = ctaLabel();
    if (label) label.textContent = strings.creatingAccount || 'Creating your account…';
    setLoading(cta, true);
    clearTimeout(honestT);
    honestT = setTimeout(() => { if (inFlight) honest.hidden = false; }, 2000);
    const settle = () => {
      inFlight = false;
      clearTimeout(honestT);
      honest.hidden = true;
      setLoading(cta, false);
      const l = ctaLabel();
      if (l) l.textContent = strings.createSubmit || 'Create my account';
    };
    // NO auto-release (spec §2.2): C# navigates on success and pushes removeLoadingOverlay
    // (→ fail('')) behind its own native alert on failure.
    const ctrl = launchCtrl(
      () => {
        /* ★ N76: C# navigates to Home from here. Hold the success morph and leave the form
           disabled — the only thing that follows is the native page change. */
        settle();
        cta.disabled = true;
        setSuccess(cta, { label: strings.created || 'Account created' });
        scrub();                                   // SECURITY §5
      },
      (msg) => {
        settle();
        st.createBusy = false;
        nickIn.disabled = false; pw.input.disabled = false; rp.input.disabled = false; photo1.el.disabled = false;
        sync();
        if (msg) err2.setMessage(msg);
      },
    );
    try {
      if (opts.onCreateAccount) opts.onCreateAccount(name, p, ctrl); else ctrl.done();
    } catch { ctrl.fail(strings.createFailed || 'Something went wrong creating the account.'); } // #141-m4
  };
  cta.addEventListener('click', submit);
  rp.input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !imeBusy(e) && !cta.disabled) submit(); });

  /* the photo on both steps: the picked photo, else step 1 asks for one (camera) and step 2
     shows the initial avatar — the avatar system IS the identity imagery */
  const renderAvatar = () => {
    const name = nickIn.value.trim();
    const has = !!st.avatarSrc;
    photo1.el.toggleAttribute('data-empty', !has);
    photo1.el.setAttribute('aria-label', has ? (strings.changePhoto || 'Change photo') : (strings.addPhoto || 'Add a photo'));
    photo1.img.replaceChildren(has
      ? createAvatar({ src: st.avatarSrc, name: name || '·', size: 148 })
      : icon('camera', { size: 40 }));
    photo1.badge.replaceChildren(icon(has ? 'pencil' : 'camera', { size: 18 }));
    photo2.img.replaceChildren(createAvatar({ src: st.avatarSrc || null, name: name || '·', size: 104 }));
  };
  renderAvatar();
  st.renderAvatar = renderAvatar;
  st.createStep = 0;
  goStep(1, { animate: false, focus: false });
  sync();
  st.focusCreate = () => { try { nickIn.focus({ preventScroll: true }); } catch { /* courtesy */ } };
  return v;
}

/* —— restore (★ ON-1: one screen — the file card, "Password", the honesty line) —— */

function buildRestore(st) {
  const { opts } = st;
  const strings = st.strings;
  const v = document.createElement('div');
  v.className = 'c-launch__view c-launch__form';
  v.dataset.launchView = 'restore';

  // ★ ON-1 (Decision 3): the field says "Password", the same word as on create — "Wallet
  // password" is gone from this view
  const pw = passwordField({ label: strings.password || 'Password', current: true, strings }); // existing secret — off
  const pwF = launchField({ input: pw.input, label: strings.password || 'Password', end: [pw.wrap.querySelector('.c-lock__reveal')] });
  const scrub = () => { pw.input.value = ''; pw.mask(); pwF.sync(); if (st.restoreSync) st.restoreSync(); };
  st.scrubs.push(scrub);

  const { bar } = formTopbar(st, strings.restoreTitle || 'Restore your account', () => {
    scrub();
    show(st, 'welcome');
    try { if (opts.onBack) opts.onBack('restore'); } catch { /* nav */ }
  });
  v.append(bar);

  const body = mk('div', 'c-launch__body u-scroll');
  const hero = mk('div', 'c-launch__hero');
  // ★ #1422: the art is BUILT by illoRestore() for this view (a clone would duplicate the
  // drawing's SVG gradient ids) — the approved restore art (S11 B #1262), decorative
  const heroIllo = illoRestore({ className: 'c-launch__hero-illo' });
  hero.append(heroIllo,
    mk('h2', 'c-launch__hero-title', strings.restoreHeroTitle || 'Welcome back'),
    // the backup holds the wallet, the contacts and the own photo — NOT the chats (#1420)
    mk('p', 'c-launch__hero-copy', strings.restoreSub || 'Your backup file and password bring back your account, contacts and wallet.'));

  const fields = mk('div', 'c-launch__fields');
  /* the file CARD (no outline — Decision 5): empty = "Choose backup file" + where it comes
     from + a chevron; chosen = green, the file name (textContent: untrusted), "Change".
     The native dialog is the existing verb; drag and drop is a follow-up (no shell handles
     a file drop today). */
  const card = mk('button', 'c-launch__filecard');
  card.type = 'button';
  const fTile = mk('span', 'c-launch__tile');
  fTile.setAttribute('aria-hidden', 'true');
  const fText = mk('span', 'c-launch__filecard-text');
  const fTitle = mk('span', 'c-launch__filecard-title');
  const fSub = mk('span', 'c-launch__filecard-sub');
  fText.append(fTitle, fSub);
  const fEnd = mk('span', 'c-launch__filecard-end');
  fEnd.setAttribute('aria-hidden', 'true');
  card.append(fTile, fText, fEnd);
  card.addEventListener('click', () => {
    try { if (opts.onSelectFile) opts.onSelectFile(); } catch { /* picker */ }
  });
  const err = launchErrLine();
  const note = mk('p', 'c-launch__fnote');
  note.dataset.align = 'start';
  note.dataset.tone = 'key';
  const keyG = icon('key', { size: 15 });
  keyG.setAttribute('aria-hidden', 'true');
  // honesty line kept (spec §2.3): self-custody has no recovery path
  note.append(keyG, mk('span', null, strings.restoreNote
    || 'Restoring needs this file and your password. Spixi can’t recover either for you.'));
  fields.append(card, pwF.field, err, note);
  body.append(hero, fields);
  v.append(body);

  const footer = mk('div', 'c-launch__footer');
  const cta = createButton({ label: strings.restoreSubmit || 'Restore account', size: 56, width: 'full', disabled: true });
  footer.append(cta);
  v.append(footer);

  let inFlight = false;
  const sync = () => { if (!inFlight) cta.disabled = !(st.fileName && pw.input.value); };
  st.restoreSync = sync;
  const setWrong = (on) => {
    pwF.setError(on);
    err.setMessage(on ? (strings.restoreFailed || 'That password didn’t open the backup.') : '');
  };
  pw.input.addEventListener('input', () => { setWrong(false); sync(); });

  const submit = () => {
    if (inFlight) return;
    if (!st.fileName) { err.setMessage(strings.fileEmpty || 'Choose your backup file first.'); return; }
    const p = pw.input.value;                      // NOT trimmed
    if (!p) { err.setMessage(strings.passwordEmpty || 'Enter your wallet password.'); pw.input.focus(); return; }
    setWrong(false);
    inFlight = true;
    pw.input.disabled = true; card.disabled = true;
    const label = cta.querySelector('.c-button__label');
    if (label) label.textContent = strings.restoringAccount || 'Restoring…';
    setLoading(cta, true);
    const settle = () => {
      inFlight = false;
      setLoading(cta, false);
      const l = cta.querySelector('.c-button__label');
      if (l) l.textContent = strings.restoreSubmit || 'Restore account';
    };
    /* ★ ON-1 BUG FIX: ONLY C#'s showPasswordError means "wrong password". The host maps it
       to fail(<a reason>); every other failure arrives as removeLoadingOverlay → fail('')
       UNDER a native alert that already said what went wrong — that path used to paint
       "That password didn't open the backup" beneath an alert saying something else. Now
       it re-enables the form silently. The staged file stays either way (C# keeps it). */
    const ctrl = launchCtrl(
      () => {                                      // C# navigates to Home
        settle();
        cta.disabled = true;
        setSuccess(cta, { label: strings.restored || 'Restored' });
        scrub();
      },
      (reason) => {
        settle();
        pw.input.disabled = false; card.disabled = false;
        sync();
        if (reason) {
          setWrong(true);
          try { pw.input.focus(); pw.input.select(); } catch { /* courtesy */ }
        }
      },
    );
    try {
      if (opts.onRestore) opts.onRestore(p, ctrl); else ctrl.done();
    } catch { ctrl.fail(''); }                     // #141-m4 (silent: a host fault is not a password verdict)
  };
  cta.addEventListener('click', submit);
  pw.input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !imeBusy(e) && !cta.disabled) submit(); });

  /* the card paints from st.fileName (setLaunchFile) */
  st.renderFile = () => {
    const has = !!st.fileName;
    card.toggleAttribute('data-file-set', has);
    fTile.replaceChildren(icon(has ? 'check' : 'download', { size: 20 }));
    fTitle.textContent = has ? st.fileName : (strings.fileChoose || 'Choose backup file');
    fSub.textContent = has ? (strings.fileChange || 'Change') : (strings.fileSub || 'The file you saved from Spixi');
    fSub.classList.toggle('c-launch__filecard-change', has);
    fEnd.replaceChildren(...(has ? [] : [icon('chevron-right', { size: 20 })]));
    sync();
  };
  st.renderFile();
  st.focusRestore = () => { try { pw.input.focus({ preventScroll: true }); } catch { /* courtesy */ } };
  st.els.fileCard = card;
  return v;
}

/* —— retry (boot: the SAVED password failed) ————————————————————————————
 * ★ S20F W-8 (#1426): rebuilt on the RESTORE form frame — the same topbar, the restore art + "Welcome
 * back" + retryCopy, ONE launchField ("Wallet password"), restore's error line, and "Unlock" directly
 * under the field (launch-form.css: the body does not grow). Behaviour as before: the password is never
 * trimmed, scrubbed on back / done / pagehide, one submit in flight; fail('') = the silent restore under
 * C#'s native alert (+ focus), fail(msg) = inline. */

function buildRetry(st) {
  const { opts } = st;
  const strings = st.strings;
  const v = document.createElement('div');
  v.className = 'c-launch__view c-launch__form';
  v.dataset.launchView = 'retry';

  const pw = passwordField({ label: strings.walletPassword || 'Wallet password', current: true, strings });
  const pwF = launchField({ input: pw.input, label: strings.walletPassword || 'Wallet password', end: [pw.wrap.querySelector('.c-lock__reveal')] });
  const scrub = () => { pw.input.value = ''; pw.mask(); pwF.sync(); };
  st.scrubs.push(scrub);

  const { bar } = formTopbar(st, strings.retryTitle || 'Unlock your wallet', () => {
    scrub();
    show(st, 'welcome');
    try { if (opts.onBack) opts.onBack('retry'); } catch { /* nav — legacy pop */ }
  });
  v.append(bar);

  const body = mk('div', 'c-launch__body u-scroll');
  const hero = mk('div', 'c-launch__hero');
  hero.append(illoRestore({ className: 'c-launch__hero-illo' }),   // its own build (#1422: a clone duplicates the gradient ids)
    mk('h2', 'c-launch__hero-title', strings.restoreHeroTitle || 'Welcome back'),
    mk('p', 'c-launch__hero-copy', strings.retryCopy
      || 'Your wallet couldn’t be unlocked with the saved password. Enter it to continue.'));
  const fields = mk('div', 'c-launch__fields');
  const err = launchErrLine();
  fields.append(pwF.field, err);
  body.append(hero, fields);
  v.append(body);

  const footer = mk('div', 'c-launch__footer');
  const cta = createButton({ label: strings.proceed || 'Unlock', size: 56, width: 'full' });
  footer.append(cta);
  v.append(footer);

  const setError = (msg, red) => {
    err.setMessage(msg);
    pwF.setError(!!msg && red);
    if (msg) pw.input.focus();
  };
  pw.input.addEventListener('input', () => setError(''));

  let inFlight = false;
  const submit = () => {
    if (inFlight) return;
    const p = pw.input.value;                    // NOT trimmed
    if (!p) return setError(strings.passwordEmpty || 'Enter your wallet password.', false);
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
        if (msg) setError(msg, true); else pw.input.focus();
      },
    );
    try {
      if (opts.onRetry) opts.onRetry(p, ctrl); else ctrl.done();
    } catch { ctrl.fail(''); }                   // #141-m4 (silent — alert-covered path)
  };
  cta.addEventListener('click', submit);
  pw.input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !imeBusy(e)) submit(); });

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

  /* ★ ON-1 (#1422): THE RINGS — ONE shared layer for every view, never per view, never
     re-created on a switch, so nothing moves or flashes on the welcome → create / restore
     slide. It sits ABOVE the views (the sliding view is an opaque layer at --z-30 — a
     layer behind the views would vanish for the length of the slide) and under every
     sheet (sheets mount on the host, outside this section). pointer-events: none. */
  const rings = document.createElement('div');
  rings.className = 'c-launch__rings';
  rings.setAttribute('aria-hidden', 'true');
  rings.append(ringsSvg('tr'), ringsSvg('bl'));
  el.append(rings);
  st.rings = rings;
  guardRingsSoon(st);                            // ★ #46 r2: the first fit (art + rings) once laid out
  try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => guardRingsSoon(st)); } catch { /* no font API */ }
  if (typeof ResizeObserver === 'function') {
    try {
      /* ★ #46 r5 (NIT): the fit runs in the NEXT frame (guardRingsSoon → rAF), never inside the observer callback —
         its trial layouts resize what is observed, which is the "ResizeObserver loop completed" error.
         ★ r6: the CAROUSEL is observed too — its box IS the room (an inset push changes it without resizing the
         shell); the fit's own level change re-triggers once and stops on the unchanged room key. */
      const ro = new ResizeObserver(() => guardRingsSoon(st));
      ro.observe(el);
      if (st.els.carousel) ro.observe(st.els.carousel);
    } catch { /* decoration only */ }
  }

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
  // ★ ON-1: C#'s hardware back while create step 2 is up = step 1 (values kept, re-reported)
  if (view === 'welcome' && createStepBack(st)) return;
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
  if (createStepBack(st)) return true;           // ★ ON-1: step 2 → step 1 first
  const from = st.view;
  st.scrubs.forEach((s) => { try { s(); } catch { /* a dead field must not block the switch */ } });
  show(st, 'welcome');
  try { if (st.opts && st.opts.onBack) st.opts.onBack(from); } catch { /* nav */ }
  return true;
}

/** ★ #46 r5: run the welcome fit NOW (art size, logo, compact level; ★ S20F: + the desktop card anchor) — the shell runs it itself on every resize
 *  (next frame); a host or a test that changed the layout synchronously can call it. No-op when nothing moved. */
export function launchWelcomeFit(el) {
  const st = launchState.get(el);
  if (!st) return;
  try { fitCard(st); } catch { /* layout only */ }   // ★ S20F W-7: the form card anchor too (#46 r1)
  if (st.fitArt) st.fitArt();
}

/** ← setVersion(Config.version) — quiet welcome footer line. */
export function setLaunchVersion(el, v) {
  const st = launchState.get(el);
  if (!st) return;
  st.els.version.textContent = v || '';
  // ★ #46 r3: never `hidden` — the box keeps its reserved height either way, only its text and a11y change
  if (v) st.els.version.removeAttribute('aria-hidden'); else st.els.version.setAttribute('aria-hidden', 'true');
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
  /* ★ #1034 → ★ ON-1: the FILE-SET state is distinct — the file card turns green and
     carries the name (textContent: C# sends the name only, no date) with "Change"; an
     empty name flips it back to "Choose backup file". `data-file-set` is the state hook
     the stylesheet reads now. The card keeps its role and its handler (the same verb). */
  if (st.renderFile) st.renderFile();
}
