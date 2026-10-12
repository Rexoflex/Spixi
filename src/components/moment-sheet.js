/**
 * c-moment — ★ S17 F (#1340, Damir 17:12 / 17:36 / 20:37) — THE MOMENT SHEETS. Seven one-time sheets; a user action
 * starts each one (docs/renders/whats-new/MOMENTS.md + moments-render.html = the spec). One component on today's c-sheet
 * + the c-backup-nudge stack. ★ 20:37 (Damir): the art is FULL-BLEED at the TOP of the sheet (the sheet's own corners
 * clip it; the grab handle sits white on the art) — not a card inside the sheet as the render drew it. The art ground =
 * the What's new panel (--wn-ground-a → -b), the drawings = illustrations.js illoMoment (the About glass grammar).
 * ★ 20:42 (Damir): a secondary choice in a sheet is a TEXT button, never an outline.
 *
 * showMomentSheet({ id, host, strings, ctx, onClose }) → the sheet element (opened), or null for an unknown id.
 *   id   — one of MOMENT_IDS.
 *   ctx  — { name } (offline: the sender) · { app, invitedBy, caps:[MiniAppCapabilities names] } (app) · {} otherwise.
 *          Every value lands through textContent — never markup.
 *   onClose(choice) — ONCE, after the sheet is gone: the button's value ('backup' · 'continue' ·
 *          'open' · 'ok' · 'settings'), or 'dismiss' for every quiet path (the text button, back, Esc, the scrim, a swipe). The flag
 *          was already stored by C# when it answered yes (every close path counts as seen, MOMENTS.md).
 *
 * THE CLIENT (one per shell): createMomentClient({ bridge }) → { setState(json), answer(id, arg, ok, caps),
 *   seen(id, arg), ask(id, arg, onYes, onNo, opts) }. The protocol (P28, flag SpixiFlags.S17Moments, cap `moments`):
 *   · C# → setMoments {"seen":[ids],"apps":[app ids],"lang":"<code>"|"" ,"session":true|false} on load (and to the
 *     home page when a moment is granted elsewhere — home then holds its own cards back for the session).
 *   · shell → `ixian:moment:<id>` · `ixian:moment:lang:<code>` · `ixian:moment:app:<app id>` (the ASK).
 *   · C# → momentAnswer(id, arg, "1"|"0", "<caps csv>") — C# decides (seen, one per session, never with a card,
 *     the id's own condition) and stores seen BEFORE it answers "1".
 *   · shell (home only) → `ixian:moment:card` when a hint / update / backup / rating card goes on screen.
 *   · shell (chat only) → `ixian:openPrivacy` from the auto-download offer's "Open Settings" (C# opens Settings › Privacy;
 *     the chat never writes the setting — #46 security r1 MAJOR-1).
 *   The after-the-result moments are ASKED only when the host's screen is clear, so a yes shows at once (C# stores seen at
 *   the yes; #46 r1 MINOR-1).
 *   No cap, no state, a refused or a late answer → onNo(): the user's action is never held up (ASK_WAIT_MS).
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { illoMoment } from './illustrations.js';
import { createButton } from './button.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';

export const MOMENT_IDS = ['lang', 'autodl', 'offline', 'firstixi', 'mic', 'app', 'pay'];
const MO_ART_OF = { lang: 'ai', autodl: 'autodl', offline: 'offline', firstixi: 'firstixi', mic: 'mic', app: 'app', pay: 'pay' };
/* the capability rows of the app moment: the apps-details vocabulary (cap_* / capx_*), the same fallbacks */
const MO_CAP_ORDER = ['Storage', 'MultiUser', 'Authentication', 'TransactionSigning', 'RegisteredNamesManagement'];
const MO_CAP_GLYPH = { Storage: 'database', MultiUser: 'users', Authentication: 'user-circle', TransactionSigning: 'key', RegisteredNamesManagement: 'at' };

let moSeq = 0;
const moFill = (tpl, map) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(map, k) ? String(map[k]) : m));

function moCapLabel(c, strings) {
  switch (c) {
    case 'Storage': return strings.cap_Storage || 'Local storage';
    case 'MultiUser': return strings.cap_MultiUser || 'Multi-user';
    case 'Authentication': return strings.cap_Authentication || 'Sign in as you';
    case 'TransactionSigning': return strings.cap_TransactionSigning || 'Sign transactions';
    case 'RegisteredNamesManagement': return strings.cap_RegisteredNamesManagement || 'Manage names';
    default: return '';
  }
}
function moCapExplain(c, strings) {
  switch (c) {
    case 'Storage': return strings.capx_Storage || 'Can save data on your device so it remembers things between sessions.';
    case 'MultiUser': return strings.capx_MultiUser || 'Runs shared sessions so you can use this app together with friends.';
    case 'Authentication': return strings.capx_Authentication || 'Can prove who you are to this app using your Spixi identity, without a password.';
    case 'TransactionSigning': return strings.capx_TransactionSigning || 'Can ask you to approve IXI payments. You always confirm each one yourself.';
    case 'RegisteredNamesManagement': return strings.capx_RegisteredNamesManagement || 'Can read and manage your registered Ixian names.';
    default: return '';
  }
}

/** The copy of one moment: { title, body, buttons:[[type, label, value]] } (English = the render's copy, MOMENTS.md). */
export function momentCopy(id, ctx = {}, strings = getStrings()) {
  const name = String(ctx.name || '');
  switch (id) {
    case 'lang': return {
      title: strings.momentAiTitle || 'Translated with AI',
      body: strings.languageAiNote || 'Some text in this language was translated with AI and can contain errors. Tell us if you find one.',
      buttons: [['fill', strings.momentUnderstand || 'I understand', 'ok']],
    };
    case 'autodl': return {
      title: strings.momentAutoDlTitle || 'Download photos automatically?',
      body: strings.momentAutoDlBody || 'Photos from your contacts download when they arrive, up to 10 MB each. You can change this in Settings › Privacy.',
      /* ★ #46 security r1 (MAJOR-1, Damir 22:2x "Open Settings"): the chat WebView is UNTRUSTED, so the offer never writes the
         setting from here — the fill button opens Settings › Privacy (ixian:openPrivacy) where the user picks Wi-Fi only / Always */
      buttons: [['fill', strings.momentOpenSettings || 'Open Settings', 'settings'], ['text', strings.backupNudgeSkip || 'Not now', 'dismiss']],
    };
    case 'offline': return {
      title: moFill(strings.momentOfflineTitle || 'Waiting for {name}', { name }),
      body: moFill(strings.momentOfflineBody || 'Files come directly from {name}’s device. The download continues by itself when {name} is online again.', { name }),
      buttons: [['fill', strings.ok || 'OK', 'ok']],
    };
    case 'firstixi': return {
      title: strings.momentFirstIxiTitle || 'You received your first IXI',
      body: strings.momentFirstIxiBody || 'Your wallet is only on this device. A backup is one file, locked with your password, that brings it back on a new phone.',
      buttons: [['fill', strings.backupNudgeCta || 'Back up now', 'backup'], ['text', strings.later || 'Later', 'dismiss']],
    };
    case 'mic': return {
      title: strings.momentMicTitle || 'Send voice messages',
      body: strings.momentMicBody || 'To record, Spixi needs your microphone. Your phone asks you next. Spixi uses it only while you record.',
      buttons: [['fill', strings.continue || 'Continue', 'continue'], ['text', strings.backupNudgeSkip || 'Not now', 'dismiss']],
    };
    case 'app': {
      const invited = ctx.invitedBy ? moFill(strings.momentAppInvited || '{name} invited you to this app.', { name: String(ctx.invitedBy) }) + ' ' : '';
      return {
        title: moFill(strings.momentAppTitle || 'Before you open {app}', { app: String(ctx.app || '') }),
        body: invited + (strings.momentAppBody || 'It runs inside Spixi. Only open apps from people you trust.'),
        buttons: [['fill', strings.open || 'Open', 'open'], ['text', strings.cancel || 'Cancel', 'dismiss']],
      };
    }
    case 'pay': return {
      title: strings.momentPayTitle || 'Before you pay',
      body: strings.momentPayBody || 'Payments cannot be undone. Check the contact and the amount on the next screen. The small network fee goes to the Ixian network, not to Spixi.',
      buttons: [['fill', strings.continue || 'Continue', 'continue']],
    };
    default: return null;
  }
}

/** The capability rows (known names only, the details page's order; SingleUser and unknown names never show). */
export function momentCaps(caps) {
  const list = Array.isArray(caps) ? caps : String(caps || '').split(',');
  const have = list.map((c) => String(c).trim());
  return MO_CAP_ORDER.filter((c) => have.indexOf(c) >= 0);
}

export function showMomentSheet({ id, host, strings = getStrings(), ctx = {}, onClose } = {}) {
  const copy = momentCopy(id, ctx, strings);
  if (!copy) return null;

  const content = document.createElement('div');
  content.className = 'c-moment';
  content.dataset.moment = id;

  const artBox = document.createElement('div');
  artBox.className = 'c-moment__art';
  const art = illoMoment(MO_ART_OF[id], { className: 'c-moment__illo', hello: 'Hello', greet: strings.momentHello || 'Hello' });
  if (art) artBox.append(art);

  const title = document.createElement('h3');
  title.className = 'c-moment__title';
  title.textContent = copy.title;
  moSeq += 1;
  title.id = 'c-moment-t' + moSeq;
  content.append(artBox, title);

  const caps = id === 'app' ? momentCaps(ctx.caps) : [];
  if (caps.length) {
    content.dataset.caps = '';
    const list = document.createElement('ul');
    list.className = 'c-moment__caps';
    for (const c of caps) {
      const li = document.createElement('li');
      li.className = 'c-moment__cap';
      li.dataset.cap = c;
      const tile = document.createElement('span');
      tile.className = 'c-moment__cap-tile';
      tile.setAttribute('aria-hidden', 'true');
      tile.append(icon(MO_CAP_GLYPH[c] || 'apps'));
      const txt = document.createElement('span');
      txt.className = 'c-moment__cap-text';
      const b = document.createElement('b');
      b.textContent = moCapLabel(c, strings);
      const sm = document.createElement('small');
      sm.textContent = moCapExplain(c, strings);
      txt.append(b, sm);
      li.append(tile, txt);
      list.append(li);
    }
    content.append(list);
  }

  const body = document.createElement('p');
  body.className = 'c-moment__body';
  body.textContent = copy.body;
  body.id = 'c-moment-b' + moSeq;
  content.append(body);

  let choice = null;
  const btns = document.createElement('div');
  btns.className = 'c-moment__btns';
  for (const [type, label, value] of copy.buttons) {
    const b = createButton({ label, type, size: 56, width: 'full' });
    b.dataset.value = value;
    b.addEventListener('click', () => {
      if (choice) return;                         // one latch across every button
      choice = value;
      closeSheet(sheet);
    });
    btns.append(b);
  }
  content.append(btns);

  let closed = false;
  const sheet = createSheet({
    content, host, strings,
    onDismiss: () => {
      if (closed) return;
      closed = true;
      try { if (onClose) onClose(choice || 'dismiss'); } catch (e) { /* the host's continuation */ }
    },
  });
  sheet.classList.add('c-moment__sheet');
  sheet.dataset.moment = id;
  /* #46 r1 NIT: the title names the dialog, the body describes it (both read out) */
  sheet.removeAttribute('aria-label');
  sheet.setAttribute('aria-labelledby', title.id);
  sheet.setAttribute('aria-describedby', body.id);
  openSheet(sheet);
  return sheet;
}

/* ———————————————————————————— the client ———————————————————————————— */

export const ASK_WAIT_MS = 1500;   // no answer by then = no sheet (an old exe, a busy bridge): the action goes on
const MO_LANG_RE = /^[a-z]{2}-[a-z]{2}$/;
const MO_APP_RE = /^[A-Za-z0-9._-]{1,128}$/;

function moValidArg(id, arg) {
  if (id === 'lang') return MO_LANG_RE.test(arg);
  if (id === 'app') return MO_APP_RE.test(arg);
  return arg === '';
}

export const MO_SESSION_MS = 6 * 60 * 60 * 1000;   // = SMoments.SessionMs: a session ends 6 h after its first moment / card
export function createMomentClient({ bridge, onSessionEnd = null } = {}) {
  let state = null;                               // the validated setMoments push; null = no moments (an older exe, none yet)
  const waits = new Map();                        // 'id:arg' → { onYes, onNo, timer, late }
  /* #46 r2 (MINOR-A / MINOR-3): the session ENDS here too — C# sends the time left (sessionMs); a yes in this document starts
     a fresh one — so a host that holds cards back (home) lets them go again */
  let sessionTimer = 0;
  let sessionDeadline = 0;   // #46 r3 MINOR-2: a WALL-clock deadline (a timer stops while the phone sleeps; C# uses the wall clock)
  const endSession = () => {
    clearTimeout(sessionTimer);
    sessionTimer = 0;
    sessionDeadline = 0;
    if (state && state.session) {
      state.session = false;
      /* #46 r4 (MINOR-1): LATER, never inside the caller — sessionTaken() runs in home's hintBlocked(), and a nested
         pumpHint there put two hint cards on screen */
      setTimeout(() => { try { if (onSessionEnd) onSessionEnd(); } catch (e) {} }, 0);
    }
  };
  const armSession = (ms) => {
    clearTimeout(sessionTimer);
    sessionTimer = 0;
    sessionDeadline = 0;
    if (!(ms > 0)) return;
    sessionDeadline = Date.now() + ms;
    sessionTimer = setTimeout(endSession, ms);
  };
  const checkSession = () => { if (sessionDeadline && Date.now() >= sessionDeadline) endSession(); };
  try { if (typeof document === 'object') document.addEventListener('visibilitychange', checkSession); } catch (e) {}

  const key = (id, arg) => id + ':' + arg;
  function on() {
    try { return !!state && !!bridge && bridge.cap('moments'); } catch (e) { return false; }
  }
  function seen(id, arg = '') {
    if (!state) return true;
    if (id === 'app') return state.apps.indexOf(arg) >= 0;
    if (id === 'lang') return state.lang !== arg;            // only the pending language may ask
    return state.seen.indexOf(id) >= 0;
  }

  return {
    /** setMoments(json) — anything malformed leaves the client OFF. */
    setState(json) {
      let o = null;
      try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { o = null; }
      if (!o || typeof o !== 'object' || !Array.isArray(o.seen) || !Array.isArray(o.apps)) return;
      state = {
        seen: o.seen.filter((x) => MOMENT_IDS.indexOf(x) >= 0),
        apps: o.apps.filter((x) => typeof x === 'string' && MO_APP_RE.test(x)),
        lang: (typeof o.lang === 'string' && MO_LANG_RE.test(o.lang)) ? o.lang : '',
        session: o.session === true,
      };
      const left = Number(o.sessionMs);
      /* sessionMs: the time left (C#); 0 with session true = it ends now (#46 r3 NIT-8); absent (an older exe) = the full 6 h */
      if (state.session && o.sessionMs !== undefined && Number.isFinite(left) && left <= 0) { state.session = false; armSession(0); }
      else armSession(state.session && Number.isFinite(left) && left > 0 && left <= MO_SESSION_MS ? Math.round(left) : (state.session ? MO_SESSION_MS : 0));
    },
    get state() { return state; },
    /** an ask for this moment is on its way (a second tap waits for it, it does not run the action twice) */
    pending(id, arg = '') { return waits.has(key(id, arg)) && !waits.get(key(id, arg)).timedOut; },
    /** true while this session already had a moment (home holds its cards back) */
    sessionTaken() { checkSession(); return !!state && state.session; },
    on,
    seen,
    /** ask(id, arg, onYes(caps), onNo(), { late }) — `late: true` = a yes after ASK_WAIT_MS still shows (an after-the-result
     *  moment); a confirm-step moment (mic · app · pay) passes nothing, so a late yes is dropped (the action went on). */
    ask(id, arg = '', onYes, onNo, opts = {}) {
      const no = () => { try { if (onNo) onNo(); } catch (e) {} };
      if (MOMENT_IDS.indexOf(id) < 0 || !moValidArg(id, arg) || !on() || seen(id, arg)) { no(); return false; }
      const k = key(id, arg);
      if (waits.has(k)) { no(); return false; }             // one ask per moment at a time
      const w = { onYes, onNo, late: !!opts.late, timedOut: false, timer: 0 };
      w.timer = setTimeout(() => {
        w.timedOut = true;
        if (!w.late) waits.delete(k);
        else setTimeout(() => { if (waits.get(k) === w) waits.delete(k); }, 30000);   // #46 r2 NIT-12: a late wait that never hears back goes
        no();
      }, ASK_WAIT_MS);
      waits.set(k, w);
      bridge.send('ixian:moment:' + id + (arg ? ':' + arg : ''));
      return true;
    },
    /** momentAnswer(id, arg, ok, caps) */
    answer(id, arg, ok, caps) {
      const a = String(arg == null ? '' : arg);
      const k = key(String(id), a);
      const w = waits.get(k);
      const yes = String(ok) === '1';
      if (yes && state) {                                     // C# stored it: never ask again in this document
        if (id === 'app') { if (state.apps.indexOf(a) < 0) state.apps.push(a); }
        else if (id === 'lang') state.lang = '';
        else if (state.seen.indexOf(id) < 0) state.seen.push(id);
        if (id !== 'firstixi' && !state.session) { state.session = true; armSession(MO_SESSION_MS); }
      }
      if (!w) return;
      waits.delete(k);
      clearTimeout(w.timer);
      if (w.timedOut) {                                       // the action already went on
        if (yes && w.late) { try { if (w.onYes) w.onYes(String(caps || '').split(',').filter(Boolean)); } catch (e) {} }
        return;
      }
      if (yes) { try { if (w.onYes) w.onYes(String(caps || '').split(',').filter(Boolean)); } catch (e) {} }
      else { try { if (w.onNo) w.onNo(); } catch (e) {} }
    },
  };
}

/** The CONFIRM-step moments (mic · app · pay): ask; a yes shows the sheet — its fill button = go(), every quiet close =
 *  stop(); a no, no cap or no answer within ASK_WAIT_MS = go() at once. A tap while the ask is on its way is ignored. */
export function momentBeforeAction(client, { id, arg = '', ctx = {}, ctxFor = null, host, strings = getStrings(), go, stop } = {}) {
  /* #46 r1 (MINOR-5): a second tap while the ask is on its way STOPS (the host's latch is released), it never strands it */
  if (client && client.pending(id, arg)) { try { if (stop) stop(); } catch (e) {} return; }
  let done = false;
  const g = () => { if (done) return; done = true; try { if (go) go(); } catch (e) {} };
  const st = () => { if (done) return; done = true; try { if (stop) stop(); } catch (e) {} };
  if (!client) { g(); return; }
  client.ask(id, arg, (caps) => {
    const c = ctxFor ? ctxFor(caps) : ctx;
    const sheet = showMomentSheet({ id, host, strings, ctx: c, onClose: (v) => (v === 'dismiss' ? st() : g()) });
    if (!sheet) g();
  }, g);
}

/** The AFTER-the-result moments (lang · autodl · offline · firstixi): ask; a yes calls show(caps) — the host shows the
 *  sheet when its screen is clear. A late yes still shows (the user's action is long done). */
export function momentAfterResult(client, id, arg, show) {
  if (!client) return false;
  return client.ask(id, arg || '', (caps) => { try { show(caps); } catch (e) {} }, null, { late: true });
}
