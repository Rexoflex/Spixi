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
 *   onAction(id) — 'file' | 'photo' | 'gif' | 'pay' | 'request' | 'app'
 *   (shell routes: sendfile / sendmedia / payment intent / app invite)
 *   media    — #81 flag: reveals Photo + GIF (BE image standard).
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

const ATTACH_ACTIONS = [
  { id: 'file', glyph: 'file-isr', label: 'Send file', key: 'sendFile', flag: 'files' },
  { id: 'photo', glyph: 'photo', label: 'Photo', key: 'photo', flag: 'media' },
  { id: 'gif', glyph: 'gif', label: 'GIF', key: 'gif', flag: 'media' },
  { id: 'pay', glyph: 'arrow-up-right', label: 'Send payment', key: 'sendPayment', flag: 'payments' },
  { id: 'request', glyph: 'arrow-down-left', label: 'Request payment', key: 'requestPayment', flag: 'payments' },
  { id: 'app', glyph: 'rocket', label: 'App invite', key: 'appInvite', flag: 'apps' },
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
  };
  return ATTACH_ACTIONS.filter((a) => !a.flag || enabled[a.flag]);
}

/* True when at least one tile survives. Use this to show or hide the ⊕. */
export function hasAttachTiles(flags) { return attachTilesFor(flags).length > 0; }

/* `files` defaults TRUE — every existing caller keeps its tile without a change, and a
   surface that cannot send files says so explicitly. Legacy had no file capability in a
   blind group and the C# still refuses one there; offering the tile anyway was a control
   that reported an outcome it did not cause. */
export function openAttachSheet({ host, media = false, apps = true, payments = true, files = true, onAction, strings = getStrings() } = {}) {
  const tiles = attachTilesFor({ media, apps, payments, files });
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
    label.textContent = strings[a.key] || a.label;
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
export function openAttachTray({ composerEl, media = false, apps = true, payments = true, files = true, onAction, strings = getStrings(), instant = false, hold = false } = {}) {
  if (!composerEl || !composerEl.parentNode) return null;
  const tiles = attachTilesFor({ media, apps, payments, files });
  if (!tiles.length) return null;
  const existing = composerEl.nextElementSibling;
  if (existing && existing.classList.contains('c-attach-tray')) {
    /* ★ Session H review MINOR-1 (auditor A): a CLOSING tray kept the class for its
       300 ms exit, so a third ⊕ tap inside that window was handed the dying tray and
       no-op'd — the user tapped a fourth time. A closing tray is not "already open":
       drop it now and build fresh, so ⊕ during the exit re-opens in one tap. */
    const st = trayState.get(existing);
    if (!st || !st.closing) return existing;   // genuinely open — no-op
    existing.remove();
    trayState.delete(existing);
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
  if (hold) {
    tray.dataset.instant = '';   // no height transition: it opens in ONE frame when revealed
    return tray;                 // closed until revealAttachTray(tray) — which hands over the inset (B1)
  }
  /* ★ B1: the non-hold paths open in THIS frame, so the hand-off happens in this frame too —
     byte-identical to what the mount used to do. Only the held path defers it. */
  markComposerTrayOpen(composerEl);
  if (instant) {
    tray.dataset.instant = '';   // attach-sheet.css: no height transition on this tray
    tray.dataset.open = '';
    return tray;
  }
  // two rAFs so the closed height paints first and the rise animates
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (tray.isConnected && !trayState.get(tray).closing) tray.dataset.open = '';
  }));
  return tray;
}

/* ★★ B1 (#46 loop, MAJOR on iPhone X-class) — WHO CARRIES THE HOME-INDICATOR INSET.
 * The contract: composer.css pads the bar by `--composer-pad-block + env(safe-area-inset-bottom)`;
 * attach-sheet.css `.c-composer[data-tray-open]` drops that to a flat `--spacing-8` because the
 * TRAY is bottom-most chrome then and carries the inset itself (`.c-attach-tray .c-attach` pads
 * `--spacing-16 + env(safe-area-inset-bottom)`).
 * THE DEFECT: the attribute was written at MOUNT. On the Session-K `hold` path the mount is up
 * to 450 ms before the tray gets a height, and a held tray is `height:0; overflow:hidden` — its
 * env() padding is CLIPPED, so for that whole window nobody carried the inset. Measured on an
 * iPhone with a home indicator, portrait: the bar's bottom pad went 6+34=40 → 8, i.e. the pill
 * AND (through --composer-h → #messages) the whole bottom of the conversation dropped 32 px at
 * the instant of the ⊕ tap, sat there for the keyboard-hide window, then the tray arrived.
 * (Android is 6 → 8 and no defect: env(safe-area-inset-bottom) is 0 there — the root view is
 * padded by the insets listener instead.) Before K1 the `instant` path set both attributes in
 * one frame, so the change was swallowed inside the ~268 px swap.
 * THE RULE: THE COMPOSER SURRENDERS THE INSET ONLY IN THE FRAME SOMETHING ELSE TAKES IT — the
 * non-hold paths above (which open in that same frame), and revealAttachTray for a held tray.
 * It is NOT taken back on reveal: staying set is the intended END state, and closeAttachTray is
 * the one place it comes off — a hold cancelled inside the window therefore leaves the composer
 * exactly as it was found (removeAttribute on an attribute never written is a no-op).
 * REVERSAL: write this at mount again (above `composerEl.after(tray)`, unconditional) and the
 * 32 px lurch returns on every notched iPhone whose keyboard is up when ⊕ is tapped. */
function markComposerTrayOpen(composerEl) {
  if (composerEl) composerEl.setAttribute('data-tray-open', '');
}

/* ★ Session K: open a HELD tray (see `hold` above) — one frame, no transition. Idempotent;
   a tray that closed meanwhile (a back press inside the hold) is left alone. */
export function revealAttachTray(tray) {
  const st = tray && trayState.get(tray);
  if (!st || st.closing || !tray.isConnected) return false;
  markComposerTrayOpen(st.composerEl);   // ★ B1: the inset hand-off, in the frame the tray gets its height
  tray.dataset.open = '';
  return true;
}

/* ★ #721: `instant` removes the tray with no exit transition — used when the keyboard is
   about to take the slot: the caller holds the tray until the viewport actually shrinks
   (the keyboard is up), then drops it in one frame, so the composer never dips to the
   bottom and rises again between the two. */
export function closeAttachTray(tray, { instant = false } = {}) {
  const st = tray && trayState.get(tray);
  if (!st || st.closing) return false;
  st.closing = true;
  const btn = st.composerEl.querySelector('.c-composer__attach');
  if (btn) btn.setAttribute('aria-expanded', 'false');
  st.composerEl.removeAttribute('data-tray-open');
  if (instant) { tray.remove(); trayState.delete(tray); return true; }
  delete tray.dataset.open;
  let done = false;
  const remove = () => {
    if (done) return;
    done = true;
    tray.removeEventListener('transitionend', onEnd);
    tray.remove();
    trayState.delete(tray);
  };
  const onEnd = (e) => { if (e.target === tray && e.propertyName === 'height') remove(); };
  tray.addEventListener('transitionend', onEnd);
  setTimeout(remove, TRAY_EXIT_MS);
  return true;
}

export function isAttachTrayOpen(composerEl) {
  const n = composerEl && composerEl.nextElementSibling;
  return !!(n && n.classList.contains('c-attach-tray') && trayState.has(n) && !trayState.get(n).closing);
}
