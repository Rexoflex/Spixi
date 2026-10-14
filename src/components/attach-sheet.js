/**
 * c-attach — composer ⊕ attach sheet (#87①, Damir interview 2026-07-03):
 * TILE GRID on c-sheet (creation verbs scan better as tiles; still the same
 * overlay stack). Bridge-real actions: file / pay / request / app invite.
 * Photo + GIF are DESIGNED-IN but FEATURE-FLAGGED (`media: false`) until the
 * BE image standard lands (#81) — the #64 voice-flag precedent.
 *
 * TITLE-LESS since 2026-08-12 (Damir): "Share" was wrong for a grid that sends
 * a file / payment / request / app invite INTO the chat. `strings.attachTitle`
 * is now the sheet's ARIA name only — see the createSheet call.
 *
 * openAttachSheet({ host, media = false, apps = true, payments = true,
 *                   onAction, strings }) → sheet
 * openAttachTray({ composerEl, …same flags, onAction, strings }) → tray | null
 *   ★ #705: the MOBILE presentation — the grid under the composer, not over it.
 *   The sheet stays the desktop popover (M6). Same tiles, same gates, one builder.
 *   onAction(id) — 'file' | 'photo' | 'camera' | 'pay' | 'request' | 'app'
 *   (shell routes: sendfile / sendmedia / camera / payment intent / app invite)
 *   media    — #81 flag: reveals Photos (★ S9: C# declares `media` with the photo pipeline).
 *   camera   — ★ S9: reveals Camera (needs media too; C# declares `camera` on Android + iOS only).
 *   apps     — gate the App-invite tile: no single chat-invite verb exists on
 *              every host (SingleChatPage has none), so the shell can hide it.
 *   payments — gate Pay + Request: 1:1 only (C# rejects them in groups/bots).
 *   files    — gate Send file: C# refuses a file in a bot room and in a blind group.
 *
 * ★★ AN EMPTY SHEET DOES NOT OPEN (#46 loop, MAJOR-2). In a bot room every flag is
 * false, so every tile is filtered out. The sheet opened with no tiles, no title and
 * no text. That is a control that reports an outcome it did not cause.
 * `attachTilesFor` is the ONE predicate. This file uses it to refuse to open. The
 * shell uses it to hide the composer ⊕. Do not write that rule a second time.
 * Two copies can drift, and a drift shows a ⊕ that opens nothing.
 *
 * ⚠ THE FLAG DEFAULTS FAIL OPEN (round 2). An absent flag takes the default below, and
 * three of the four defaults are TRUE. That is deliberate: every caller passes a PARTIAL
 * object and must keep its tiles. It also means this module cannot protect a caller that
 * does not yet know its room. A caller that has no answer must pass an EXPLICIT false for
 * every gate. The chat shell does exactly that: `attachFlags()` writes its room-known test
 * into all four flags, so a room whose type has not arrived yields no tile and no ⊕.
 * Do not read a missing flag as "no".
 *
 * ★★ `attachTilesFor` IS ALSO THE ACTION GATE (round 3). The chat shell calls it a
 * second time when a tile is TAPPED, and drops the action when the tapped id is no
 * longer in the list. A sheet can outlive the answer it was built from: the room type
 * can arrive while the sheet is open. So the same list decides what is DRAWN and what
 * is DONE. Keep this function pure and cheap for that reason — it runs on every tap as
 * well as on every open, and it must never be given a side effect.
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';
import { composerMotion, emitComposerShift, slideBand, stopBand, bandY, canSlide } from './composer.js';   // ★ S20 A (#1378): the one composer motion

const ATTACH_ACTIONS = [
  /* ★ #1355 (Damir 13:41 "having payment as the last 2 items"): the ORDER is Photos · Camera · File / App invite · Pay ·
     Request — the most used first, the two money tiles last. Was File · Photos · Camera / Pay · Request · App invite. */
  /* ★ S9 (#1244 P = B): Photos (the system picker, ≤ 10, verb sendmedia) + Camera (Android + iOS: C# declares the
     `camera` capability there only, verb camera). The GIF tile is GONE (the `gif` string key stays, unused). "Photos"
     is a NEW key (`photos`): the meaning changed from one photo to a multi-pick. */
  { id: 'photo', glyph: 'photo', label: 'Photos', key: 'photos', flag: 'media' },
  { id: 'camera', glyph: 'camera', label: 'Camera', key: 'camera', flag: 'camera' },
  { id: 'file', glyph: 'file-isr', label: 'Send file', key: 'sendFile', flag: 'files' },
  { id: 'app', glyph: 'rocket', label: 'App invite', key: 'appInvite', flag: 'apps' },
  { id: 'pay', glyph: 'arrow-up-right', label: 'Send payment', key: 'sendPayment', flag: 'payments' },
  { id: 'request', glyph: 'arrow-down-left', label: 'Request payment', key: 'requestPayment', flag: 'payments' },
];

/* ★★ THE ONE PREDICATE — which tiles survive the gates.
   `openAttachSheet` and the chat shell both call this. The shell hides the composer ⊕
   when the list is empty. This file refuses to open an empty sheet. One rule, two
   users, no drift.
   Each default matches the `openAttachSheet` signature below. A caller can pass a
   partial object. An absent flag takes the default. */
export function attachTilesFor(flags) {
  const f = flags || {};
  const enabled = {
    media: f.media === undefined ? false : !!f.media,
    apps: f.apps === undefined ? true : !!f.apps,
    payments: f.payments === undefined ? true : !!f.payments,
    files: f.files === undefined ? true : !!f.files,
    /* ★ S9: Camera needs BOTH the media gate and its own capability — an absent flag = no tile (fails closed, like media) */
    camera: f.camera === undefined ? false : (!!f.camera && (f.media === undefined ? false : !!f.media)),
  };
  return ATTACH_ACTIONS.filter((a) => !a.flag || enabled[a.flag]);
}

/* True when at least one tile survives. Use this to show or hide the ⊕. */
export function hasAttachTiles(flags) { return attachTilesFor(flags).length > 0; }

/* `files` defaults TRUE — every existing caller keeps its tile without a change, and a
   surface that cannot send files says so explicitly. Legacy had no file capability in a
   blind group and the C# still refuses one there; offering the tile anyway was a control
   that reported an outcome it did not cause. */
export function openAttachSheet({ host, media = false, camera = false, apps = true, payments = true, files = true, onAction, strings = getStrings() } = {}) {
  const tiles = attachTilesFor({ media, camera, apps, payments, files });
  /* ★★ NO TILE, NO SHEET. A sheet with no tile explains nothing and does nothing.
     The shell keeps the ⊕ hidden for the same condition, so this path is the belt.
     The caller must accept null. */
  if (!tiles.length) return null;

  const grid = buildAttachGrid(tiles, strings, (id) => {
    closeSheet(sheet);
    if (onAction) onAction(id);
  });

  /* TITLE: none (Damir 2026-08-12 — "it's titled Share, that's incorrect").
   * Nothing here is sharing: the tiles SEND things into this conversation (a
   * file, a payment, a payment request, an app invite), and no single noun
   * covers all four without lying ("Attach" is file-only, "Send" mis-describes
   * Request). WhatsApp/Telegram/iMessage all ship this grid title-less — the ⊕
   * that opened it plus six labelled tiles are the whole affordance, and a
   * heading only steals a sheet row. The dialog still needs an ACCESSIBLE name,
   * so attachTitle lives on as c-sheet's aria-label fallback ("Add to chat" —
   * the one honest umbrella for all six). */
  const sheet = createSheet({
    content: grid, host,
    strings: { ...strings, sheet: strings.attachTitle || 'Add to chat' },
    blurDismiss: true,   // ★ S8 (#1235): desktop — a click in another pane closes the popover
  });
  openSheet(sheet);
  return sheet;
}

/* The tile grid, shared by the sheet (desktop popover) and the tray (mobile). ONE
   builder, so a tile cannot exist in one presentation and not the other. */
function buildAttachGrid(tiles, strings, onPick) {
  const grid = document.createElement('div');
  grid.className = 'c-attach';
  for (const a of tiles) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'c-attach__tile';
    const med = document.createElement('span');
    med.className = 'c-attach__medallion';
    med.setAttribute('aria-hidden', 'true');
    med.append(icon(a.glyph, { size: 22 }));
    const label = document.createElement('span');
    label.className = 'c-attach__label';
    /* ★ S9: the two new tiles spell their fallback here so extract-strings collects the keys (photos, camera) */
    label.textContent = a.id === 'photo' ? (strings.photos || 'Photos')
      : a.id === 'camera' ? (strings.camera || 'Camera')
      : (strings[a.key] || a.label);
    tile.append(med, label);
    tile.addEventListener('click', () => onPick(a.id));
    grid.append(tile);
  }
  return grid;
}

/* ═══ ★ #705 (Session G, Damir): THE TRAY — the attach grid UNDER the composer ═══
 *
 * WhatsApp grammar: the grid takes the KEYBOARD's slot, below the bar, and the
 * conversation shrinks above it. The composer stays visible and usable the whole
 * time; the ⊕ that opened the tray turns into a ✕ and closes it.
 * ⚠ NOT AN OVERLAY. It has no scrim, it is in the document flow, and it does not
 *   trap focus — the bar above it is meant to stay live. So it is NOT on the shared
 *   overlay stack, and the shell must close it on back itself (chat.html `chatBack`,
 *   the edge swipe and Escape all do), the same way the bot channel selector is
 *   handled. `isAttachTrayOpen` is the predicate for those sites.
 * ⚠ The keyboard: opening the tray BLURS the composer input so the soft keyboard
 *   drops and the tray takes its place instead of stacking under it. Focusing the
 *   input again (the user taps the field) closes the tray — the shell wires that.
 *
 * openAttachTray({ composerEl, media, apps, payments, files, onAction, strings })
 *   → tray element, or null when no tile survives (same rule as the sheet).
 * revealAttachTray(tray) — opens a tray mounted with `hold` (Session K), one frame.
 * closeAttachTray(tray) — exit transition then removal; idempotent.
 * isAttachTrayOpen(composerEl) — the tray sits directly after the composer. */
const TRAY_EXIT_MS = 300;   // > --duration-200; covers reduced-motion 0 ms
const trayState = new WeakMap();   // tray → { composerEl, closing }

/* ★ #721 (Damir on device): THE KEYBOARD AND THE TRAY SWAP SEAMLESSLY. Opening while the
   keyboard is up: the input blurs (the keyboard drops) and the tray takes the slot at
   its full height at once — no rise animation stacked on the keyboard's own retreat.
   `instant` is decided by the caller from `document.activeElement`. */
/* ★ Session K (walk J2 K1, Damir: "keyboard up → ⊕: a flash, the composer jumps high up and
   back for a few hundred ms"): `hold` mounts the tray CLOSED with no transition and returns
   it; the caller opens it with revealAttachTray() in the frame the keyboard has actually
   LEFT (chat.html handKeyboardToTray — the mirror of #721's handTrayToKeyboard). `instant`
   gave the tray its full slot in the same frame as the blur, but Android hides the keyboard
   100–300 ms AFTER the blur, so for that window the composer sat on keyboard + tray. */
export function openAttachTray({ composerEl, media = false, camera = false, apps = true, payments = true, files = true, onAction, strings = getStrings(), instant = false, hold = false } = {}) {
  if (!composerEl || !composerEl.parentNode) return null;
  const tiles = attachTilesFor({ media, camera, apps, payments, files });
  if (!tiles.length) return null;
  const slot = composerEl.parentElement;
  const vis = slot.offsetHeight - bandY(composerEl);   // ★ S20 A: the bar's top on screen now (a closing slide included)
  let inset = composerEl.hasAttribute('data-tray-open') ? null : composerEl.offsetHeight;   // the bar before it gives up the inset
  const existing = composerEl.nextElementSibling;
  if (existing && existing.classList.contains('c-attach-tray')) {
    /* ★ Session H review MINOR-1 (auditor A): a CLOSING tray kept the class for its
       300 ms exit, so a third ⊕ tap inside that window was handed the dying tray and
       no-op'd — the user tapped a fourth time. A closing tray is not "already open":
       drop it now and build fresh, so ⊕ during the exit re-opens in one tap. */
    const st = trayState.get(existing);
    if (!st || !st.closing) return existing;   // genuinely open — no-op
    if (inset == null) inset = -(st.inset || 0);   // the dying tray already holds the inset: carry its measure
    abortTrayClose(existing);
  }

  const tray = document.createElement('div');
  tray.className = 'c-attach-tray';
  tray.setAttribute('role', 'group');
  tray.setAttribute('aria-label', strings.attachTitle || 'Add to chat');
  tray.append(buildAttachGrid(tiles, strings, (id) => {
    closeAttachTray(tray);
    if (onAction) onAction(id);
  }));
  trayState.set(tray, { composerEl, closing: false });

  const btn = composerEl.querySelector('.c-composer__attach');
  if (btn) btn.setAttribute('aria-expanded', 'true');
  const input = composerEl.querySelector('.c-composer__input');
  if (input && document.activeElement === input) input.blur();   // the tray takes the keyboard's slot

  composerEl.after(tray);
  publishTrayContentHeight(tray);
  watchTrayContent(tray);
  if (hold) {
    tray.dataset.instant = '';   // no slide: it opens in ONE frame when revealed
    return tray;                 // closed until revealAttachTray(tray) — which hands over the inset (B1)
  }
  /* ★ B1 + ★★ S20 A (#1378, "the inset drop before every rise"): data-tray-open AND data-open land in THIS frame — the
     rise path used to give the tray its height two rAFs later, so the bar's foot dropped 46 px (3-button bar) first. */
  markComposerTrayOpen(composerEl);
  tray.dataset.open = '';
  trayState.get(tray).inset = inset < 0 ? -inset : Math.max(0, (inset || 0) - composerEl.offsetHeight);
  if (instant) {
    tray.dataset.instant = '';   // #721: swapped with the keyboard, not animated
    emitComposerShift(composerEl, 'set');
    return tray;
  }
  /* ★★ S20 A (#1378, A1): full height from the first frame (the log re-reserves ONCE on 'open'); the rise is transform
     only — the tray up from below, the bar from where it was on screen. The height transition re-laid out the log on
     every frame (3–4 frames 34–107 ms apart in Damir's recording). */
  const { ms, easing } = composerMotion('open');
  const from = Math.max(0, slot.offsetHeight - vis);
  const T = tray.offsetHeight;
  const ran = ms > 0 && canSlide(tray) && T > 0;
  if (ran) {
    slideBand(trayBand(slot, tray), from, 0, ms, easing);
    slideBand([tray], T, 0, ms, easing);
  }
  emitComposerShift(composerEl, 'open', { ms: ran ? ms : 0, easing, dy: from });
  return tray;
}
function trayBand(slot, tray) {
  const out = [];
  if (slot) for (const c of slot.children) { if (c === tray) break; out.push(c); }
  return out;
}

/* ★★ B1 (#46 loop) — WHO CARRIES THE HOME-INDICATOR INSET. The bar pads `--composer-pad-block + --safe-bottom`;
 * `.c-composer[data-tray-open]` drops that to `--spacing-8` because the TRAY (bottom-most chrome then) carries the inset.
 * THE RULE: the composer surrenders the inset ONLY in the frame something else takes it — the non-hold paths (which open
 * in that frame) and revealAttachTray for a held tray (a held tray has no height: its inset would be clipped, and the pill
 * + the log dropped 32 px on a notched iPhone / 46 px on a 3-button Android bar). Only the close's END takes it back, so
 * a hold cancelled in its window leaves the composer exactly as found (removing a never-written attribute is a no-op).
 * REVERSAL: write it at mount again and the lurch returns. */
function markComposerTrayOpen(composerEl) {
  if (composerEl) composerEl.setAttribute('data-tray-open', '');
}

/* ★ Session AE: the tray is never shorter than its own tiles — the open height is max(the keyboard slot, the grid),
   the grid measured here (before the tray has a height its box is still its content) and again on every grid resize,
   published as `--tray-content-h`; + the top border (border-box). The trade: a jump on the keyboard ↔ tray swap when a
   keyboard is shorter than two tile rows (Damir's dial) instead of clipped tiles on a fresh install. */
function publishTrayContentHeight(tray) {
  try {
    const grid = tray.querySelector('.c-attach');
    if (!grid) return;
    const content = Math.ceil(grid.getBoundingClientRect().height || grid.scrollHeight || 0);
    if (!(content > 0)) return;
    const border = parseFloat(getComputedStyle(tray).borderTopWidth) || 0;
    tray.style.setProperty('--tray-content-h', Math.ceil(content + border) + 'px');
  } catch (_) { /* no layout engine (jsdom) or a detached tray: the stylesheet's slot fallback stands */ }
}
/* ★ Session AE (MINOR-4): a rotation / inset push / width change re-flows the grid — a ResizeObserver on it re-publishes
   (window resize is the belt); closeAttachTray disconnects it. */
function watchTrayContent(tray) {
  const st = trayState.get(tray);
  const grid = tray.querySelector('.c-attach');
  if (!st || !grid) return;
  const republish = () => publishTrayContentHeight(tray);
  try {
    if (typeof ResizeObserver === 'function') { st.ro = new ResizeObserver(republish); st.ro.observe(grid); }
  } catch (_) { st.ro = null; }
  st.onResize = republish;
  window.addEventListener('resize', republish);
}
function unwatchTrayContent(tray) {
  const st = trayState.get(tray);
  if (!st) return;
  try { if (st.ro) st.ro.disconnect(); } catch (_) {}
  if (st.onResize) window.removeEventListener('resize', st.onResize);
  st.ro = null; st.onResize = null;
}

/* ★ Session K: open a HELD tray (see `hold` above) — one frame, no transition. Idempotent;
   a tray that closed meanwhile (a back press inside the hold) is left alone. */
export function revealAttachTray(tray) {
  const st = tray && trayState.get(tray);
  if (!st || st.closing || !tray.isConnected) return false;
  const h0 = st.composerEl.offsetHeight;
  markComposerTrayOpen(st.composerEl);   // ★ B1: the inset hand-off, in the frame the tray gets its height
  tray.dataset.open = '';
  st.inset = Math.max(0, h0 - st.composerEl.offsetHeight);   // ★ S20 A: what the bar gave up (the close's slide adds it back)
  emitComposerShift(st.composerEl, 'set');   // ★ S20 A: the reserve in this same frame
  return true;
}

/* ★ #721: `instant` removes the tray with no exit transition — used when the keyboard is
   about to take the slot: the caller holds the tray until the viewport actually shrinks
   (the keyboard is up), then drops it in one frame, so the composer never dips to the
   bottom and rises again between the two. */
/* ★★ S20 A (#1378, "the jump at the start of the close"): data-tray-open came off FIRST (+46 px) and the height shrank
   per frame. Now the layout is HELD: the bar + tray slide down by transform (the shell holds the reserve, slides the
   rows), and the removal, the attribute and the reserve land in the frame the slide ends. */
export function closeAttachTray(tray, { instant = false } = {}) {
  const st = tray && trayState.get(tray);
  if (!st || st.closing) return false;
  st.closing = true;
  unwatchTrayContent(tray);   // ★ Session AE: the grid observer + resize belt go with the tray
  const composerEl = st.composerEl;
  const btn = composerEl.querySelector('.c-composer__attach');
  if (btn) btn.setAttribute('aria-expanded', 'false');
  const slot = composerEl.parentElement;
  const band = trayBand(slot, tray);
  let done = false;
  const end = () => {
    if (done) return;
    done = true;
    clearTimeout(st.timer);
    if (trayState.get(tray) !== st) return;   // aborted by a re-open (abortTrayClose) — the new tray owns the bar now
    stopBand(band);
    stopBand([tray]);
    tray.remove();
    trayState.delete(tray);
    st.composerEl.removeAttribute('data-tray-open');
    emitComposerShift(composerEl, 'end');
  };
  st.end = end;
  const { ms, easing } = composerMotion('close');
  const opened = tray.dataset.open !== undefined && tray.isConnected && !!slot;
  if (instant || !opened || !(ms > 0) || !canSlide(tray)) { end(); return true; }
  const T = tray.offsetHeight;
  const dy = Math.max(0, T - (st.inset || 0));   // the slot shrinks by the tray, less the inset the bar takes back
  if (!(T > 0)) { end(); return true; }
  emitComposerShift(composerEl, 'close', { dy, ms, easing });
  slideBand(band, bandY(composerEl), dy, ms, easing, true);   // a close mid-open starts where the band is on screen
  const [a] = slideBand([tray], bandY(tray), T, ms, easing, true);
  if (a) a.onfinish = end;
  st.timer = setTimeout(end, Math.max(TRAY_EXIT_MS, ms + 120));   // a timeline that does not tick still ends
  return true;
}
/* a re-open inside the close: the dying tray goes now, without its end (the new 'open' re-reserves) */
function abortTrayClose(tray) {
  const st = trayState.get(tray);
  if (st) clearTimeout(st.timer);
  stopBand(trayBand(tray.parentElement, tray));
  stopBand([tray]);
  tray.remove();
  trayState.delete(tray);
}

export function isAttachTrayOpen(composerEl) {
  const n = composerEl && composerEl.nextElementSibling;
  return !!(n && n.classList.contains('c-attach-tray') && trayState.has(n) && !trayState.get(n).closing);
}
