/**
 * c-settings sub-screens (docs/settings-shell-spec.md §10, DECISIONS #147 —
 * the premium round): Chat appearance · Privacy · Notifications · Security level.
 *
 * Bridge honesty: NOTHING here has a legacy command. Chat appearance is
 * FE-ONLY (root css vars). Persistence is the HOST's job (onPattern/onTextScale)
 * — WebView localStorage until the §9 pref-sync ask, and the host MUST try/catch
 * it (DomStorageEnabled=false is possible; ARCHITECTURE). This screen never
 * touches storage, so its live preview works regardless. Privacy / Notifications
 * / Security level are §9-GATED —
 * capability-flagged designs (the 1:1-mute pattern): the shell hides them
 * until their commands land; the demo enables the caps to show the design.
 *
 * Security tiers (Damir #147): Basic / Moderate / Strict presets + Custom.
 * A tier CASCADES defaults into lock/privacy/notification policy — the
 * translation table is a §9/ARCHITECTURE proposal (spec §8); the FE treats
 * the tier as an opaque commitment (onSecurityTier) and Custom as "use my
 * individual Security & privacy settings".
 *
 * Async callbacks use the house (payload, ctrl) contract, one-shot (#138 m1).
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { discGrad } from './disc.js';
import { createTopbar } from './topbar.js';
import { attachChatFlow, detachChatFlow } from './chat-flow.js';

/* W5 (Damir 2026-08-12) — pattern STYLE, orthogonal to the intensity dial below.
 * Style picks the pattern SOURCE; intensity keeps mapping to opacity. "Off"
 * lives ONLY in the intensity control, so there is deliberately no fourth
 * style here. Live flow is DESKTOP-ONLY (constant animation = battery); the
 * picker renders two options on mobile, three on desktop. */
export const PATTERN_STYLES = [
  /* ★ Damir 2026-08-22: TRIANGLES is the default now, replacing the line-art doodle. Listed
     first because the picker's first entry is what a new install lands on. Line art is kept
     — retiring a style would silently re-skin anyone who chose it. */
  { id: 'triangles', key: 'patternStyleTriangles', label: 'Triangles' },
  { id: 'lineart', key: 'patternStyleLineArt', label: 'Line art' },
  { id: 'matrix', key: 'patternStyleMatrix', label: 'Data matrix' },
  { id: 'flow', key: 'patternStyleFlow', label: 'Live flow', desktopOnly: true },
];
/* ★ N81 (#422) — THREE levels, and the value is a LEVEL INDEX, not an alpha.
 *
 * Damir's dial: off, the new default, and one stronger step at 0.1. The change
 * that matters is not the count — it is that 0/1/2 are indices resolved to a
 * real alpha BY CSS (--chat-pattern-alpha-1 / -2 in tokens.css, per theme).
 *
 * Before this, the stored number WAS the light-mode alpha and dark derived its
 * own as value × 0.36 in JavaScript. That derivation is why a live setTheme push
 * had to remember to re-run the ladder, and why dark painted the light number
 * when it did not (the W5 F5 bug). CSS resolves var() per element under the
 * current theme, so the same class of bug cannot be written here again.
 *
 * patternLevelVar() below maps index → the var() reference; readPatternLevel()
 * migrates the old fractional prefs. */
export const PATTERN_LEVELS = [
  { value: 0, key: 'patternOff', label: 'Off' },
  { value: 1, key: 'patternDefault', label: 'Default' },
  { value: 2, key: 'patternStrong', label: 'Strong' },
];

/**
 * Level index → the value to assign to --chat-pattern-opacity.
 *
 * @param {number} level 0 Off · 1 Default · 2 Strong
 * @param {number} [boost] multiply the alpha — for SWATCH-SIZE previews only.
 *   ★ break-my-verdict MINOR-3: at true alpha (0.042 vs 0.1) the Off and Default
 *   tiles are the same tile in light mode at 56px, so the control could not be read
 *   even though it was operable. The style row above already carries this exact
 *   compromise for the same reason. The LIVE preview canvas and the real chat stay
 *   truthful — a swatch is an icon for a choice, not a rendering of it.
 */
export function patternLevelVar(level, boost) {
  const n = Number(level);
  if (n <= 0) return '0';
  const tok = n === 2 ? '--chat-pattern-alpha-2' : '--chat-pattern-alpha-1';
  return boost && boost !== 1
    ? 'calc(var(' + tok + ') * ' + boost + ')'
    : 'var(' + tok + ')';
}

/* Swatch-face amplification (see patternLevelVar's `boost`). 6× puts the three
   tiles at 0 / ~0.25 / ~0.6 — separable at 56px in both themes, and it keeps the
   Default:Strong RATIO intact so the tiles still rank the way the chat does. */
export const PATTERN_SWATCH_BOOST = 6;

/**
 * Normalise a STORED pattern preference to a level index.
 *
 * ★ Migration, and it has to be unambiguous rather than clever. Values written
 * before #422 were the light-mode alphas 0 / 0.3 / 0.5 / 0.7; values written
 * after are the indices 0 / 1 / 2. The two sets overlap only at 0, which means
 * Off in both — so a FRACTIONAL value is old, an integer 1 or 2 is new, and
 * nobody has to guess. An old Bold user keeps the loudest option available.
 *
 * @param {*} raw  the stored value (string or number), possibly absent/corrupt
 * @param {number} fallback  level to use when there is no usable value
 */
export function readPatternLevel(raw, fallback = 1) {
  const n = parseFloat(raw);
  if (!isFinite(n)) return fallback;
  if (n <= 0) return 0;
  if (n === 1 || n === 2) return n;          // already a level index
  return n > 0.5 ? 2 : 1;                    // legacy alpha: Bold → Strong, rest → Default
}
export const TEXT_SIZES = [            // --chat-text-scale — bubble adoption LIVE (message-bubble.css, 6e.2)
  { value: 0.9, key: 'textS', label: 'S' },
  { value: 1, key: 'textM', label: 'M' },
  { value: 1.1, key: 'textL', label: 'L' },
  { value: 1.25, key: 'textXL', label: 'XL' },
];
export const SECURITY_TIERS = [        // §9 proposal — see spec §8 translation table
  { id: 'basic', key: 'tierBasic', label: 'Basic',
    descKey: 'tierBasicDesc', desc: 'Convenience first. Lock optional, previews on, receipts on.' },
  { id: 'moderate', key: 'tierModerate', label: 'Moderate',
    descKey: 'tierModerateDesc', desc: 'Balanced. Lock required, auto-lock after 5 minutes, sender-only previews.' },
  { id: 'strict', key: 'tierStrict', label: 'Strict',
    descKey: 'tierStrictDesc', desc: 'Privacy first. Immediate auto-lock, no previews, receipts and typing off.' },
  { id: 'custom', key: 'tierCustom', label: 'Custom',
    descKey: 'tierCustomDesc', desc: 'Your individual Security & privacy settings apply as-is.' },
];

// one-shot ctrl (#138 m1) — module-local unique name (house collision rule)
function screensCtrl(onDone, onFail) {
  let used = false;
  return {
    done: () => { if (used) return; used = true; onDone(); },
    fail: (msg) => { if (used) return; used = true; onFail(msg); },
  };
}

/* segmented pill group — inline picker (no sheet): FE-only instant settings */
function segGroup({ options, current, ariaLabel, onPick }) {
  const g = document.createElement('div');
  g.className = 'c-settings-seg';
  g.setAttribute('role', 'radiogroup');
  g.setAttribute('aria-label', ariaLabel);
  const paint = () => {
    for (const b of g.children) {
      b.setAttribute('aria-checked', String(Number(b.dataset.value) === current));
    }
  };
  for (const o of options) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-settings-seg__pill';
    b.setAttribute('role', 'radio');
    b.dataset.value = String(o.value);
    b.textContent = o.label;
    b.addEventListener('click', () => {
      if (o.value === current) return;
      current = o.value;
      paint();
      onPick(o.value);
    });
    g.append(b);
  }
  paint();
  return g;
}

/* pattern swatch tiles (#334, iOS-60 — Damir-locked dial): the pattern picker
   renders MINI CHAT CANVASES — the REAL .c-chat-canvas paint (gradient +
   generated doodle mask, chat-pattern.css) at each level's opacity — instead of
   text pills: localized level labels overflowed the pills in longer locales
   (sl-si "Izklopljeno"/"Standardno"). The localized label LIVES ON as the
   tile's aria-label + title tooltip; only the visual text goes. Radio semantics
   + keyboard behavior mirror segGroup EXACTLY (native buttons, role=radio,
   aria-checked, Tab + Enter/Space — the #205 roving-tabindex upgrade stays a
   shared deferred item for both grammars). Off (value 0) = bare gradient +
   diagonal slash treatment via [data-off] (settings-screens.css, token ink). */
function swatchGroup({ options, current, ariaLabel, onPick }) {
  const g = document.createElement('div');
  const faces = [];
  g.className = 'c-settings-swatches';
  g.setAttribute('role', 'radiogroup');
  g.setAttribute('aria-label', ariaLabel);
  const paint = () => {
    for (const b of g.children) {
      b.setAttribute('aria-checked', String(Number(b.dataset.value) === current));
    }
  };
  for (const o of options) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-settings-swatch';
    b.setAttribute('role', 'radio');
    b.dataset.value = String(o.value);
    b.setAttribute('aria-label', o.label);
    b.title = o.label;                 // pointer users keep the word as a tooltip
    if (o.value === 0) b.dataset.off = '';
    const face = document.createElement('span');
    face.className = 'c-chat-canvas c-settings-swatch__canvas';
    face.setAttribute('aria-hidden', 'true');   // the button's aria-label names the tile
    face.style.setProperty('--chat-pattern-opacity', patternLevelVar(o.value, PATTERN_SWATCH_BOOST));   // ★ N81 (#422): index → per-theme alpha var, amplified for swatch size
    faces.push(face);
    b.append(face);
    b.addEventListener('click', () => {
      if (o.value === current) return;
      current = o.value;
      paint();
      onPick(o.value);
    });
    g.append(b);
  }
  paint();
  /* W5: the intensity tiles must show the pattern the user actually picked —
     four line-art tiles under a "Data matrix" selection would be showing them a
     level of something they aren't using. Flow tiles paint ONE still frame each
     (the Off tile draws nothing, so its diagonal-slash treatment still reads). */
  let swatchRaf = 0;
  g.setSwatchStyle = (id) => {
    // cancel a still-pending mount: a flow→lineart flip inside one frame used to
    // let the deferred mount run AFTER the detach, leaving an orphan canvas under
    // a tile face until the next style change (#46 audit)
    if (swatchRaf) { cancelAnimationFrame(swatchRaf); swatchRaf = 0; }
    for (const f of faces) f.dataset.chatPattern = id;
    if (id !== 'flow') { for (const f of faces) detachChatFlow(f); return; }
    swatchRaf = requestAnimationFrame(() => {
      swatchRaf = 0;
      for (const f of faces) mountFlowFace(f, FLOW_SWATCH_TUNE);
    });
  };
  g.releaseSwatches = () => {
    if (swatchRaf) { cancelAnimationFrame(swatchRaf); swatchRaf = 0; }
    for (const f of faces) detachChatFlow(f);
  };
  return g;
}

/* pattern STYLE swatches (W5) — same grammar as the intensity swatches above
   (native buttons, role=radio, aria-checked, localized label as aria-label +
   title), but each face carries its OWN `data-chat-pattern`. That attribute
   drives INHERITED custom properties in the generated chat-pattern.css, which
   is precisely why the styles were not keyed off a descendant selector: three
   different styles have to paint side by side in one list.

   The "flow" face mounts the real engine in STILL mode — one frame, no rAF
   loop. A live loop per swatch in a settings list is not worth the battery,
   and a static frame is an honest picture of what the style looks like. The
   density is stepped up for the small tile — these overrides are preview-only
   and never reach the chat.

   Re-scaled with the chat dial at the F5 of 2026-08-13: the tile is ~110×64,
   so it keeps the chat's dash-to-gap ratio (~0.6 here vs 0.47 in the chat) at
   roughly half the chat's absolute size, and fieldScale drops with it — at the
   chat's own 44 a 110px tile spans barely two field units and every dash comes
   out parallel, which is the exact "reads as still" failure the chat dial was
   just fixed for. lineWidth stays 1: 1.25 is chunky at this size. */
const FLOW_SWATCH_TUNE = { still: true, spacing: 8, dash: 5, lineWidth: 1, fieldScale: 20 };

/* Fail-soft for every flow face: attachChatFlow returns null when the WebView
   has no 2d context. A style that can't paint must fall back to the line-art
   TILE — a bare gradient would read as a broken tile, and the whole point of
   keeping a resolvable URI under [data-chat-pattern='flow'] (chat-pattern.css)
   is that this fallback is one attribute flip. */
function mountFlowFace(face, opts) {
  let ctrl = null;
  try { ctrl = attachChatFlow(face, opts); } catch (e) { ctrl = null; }
  if (!ctrl) face.dataset.chatPattern = 'triangles';   // ★ default style
  return ctrl;
}

function styleSwatchGroup({ options, current, ariaLabel, onPick }) {
  const g = document.createElement('div');
  const flowFaces = [];
  let styleRaf = 0;
  g.className = 'c-settings-swatches c-settings-swatches--style';
  g.setAttribute('role', 'radiogroup');
  g.setAttribute('aria-label', ariaLabel);
  const paint = () => {
    for (const b of g.children) b.setAttribute('aria-checked', String(b.dataset.value === current));
  };
  for (const o of options) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-settings-swatch';
    b.setAttribute('role', 'radio');
    b.dataset.value = o.id;
    b.setAttribute('aria-label', o.label);
    b.title = o.label;
    const face = document.createElement('span');
    face.className = 'c-chat-canvas c-settings-swatch__canvas';
    face.setAttribute('aria-hidden', 'true');
    face.dataset.chatPattern = o.id;
    // the style tiles must show the PATTERN, not the user's current intensity —
    // a user sitting on "Off" would otherwise be picking between three blanks.
    // Intensity has its own swatch row directly below.
    // ★ N81 (#422): this was the literal '0.5' — the old light-mode Standard alpha,
    // which under the new ladder would paint these tiles ~12× the real pattern and
    // promise a background the chat never shows. It rides the STRONG step instead:
    // the loudest thing the user can actually choose, so the tile is legible at
    // swatch size without lying about what Default looks like.
    face.style.setProperty('--chat-pattern-opacity', 'var(--chat-pattern-alpha-2)');
    b.append(face);
    if (o.id === 'flow') {
      // mount after layout — a 0×0 face would size the backing store to 1×1
      flowFaces.push(face);
      styleRaf = requestAnimationFrame(() => { styleRaf = 0; mountFlowFace(face, FLOW_SWATCH_TUNE); });
    }
    b.addEventListener('click', () => {
      if (o.id === current) return;
      current = o.id;
      paint();
      onPick(o.id);
    });
    g.append(b);
  }
  paint();
  g.releaseSwatches = () => {
    if (styleRaf) { cancelAnimationFrame(styleRaf); styleRaf = 0; }
    for (const f of flowFaces) detachChatFlow(f);
  };
  return g;
}

/* switch row — optimistic toggle w/ revert (the chat-info notifications grammar) */
function switchRow({ glyph, hue, label, sub, checked, live, failText, onToggle }) {
  const section = document.createElement('div');
  section.className = 'c-settings__section';
  const row = document.createElement('div');
  row.className = 'c-settings__row c-settings__row--static';
  const lab = document.createElement('span');
  lab.className = 'c-settings__row-label' + (sub ? ' c-settings__row-label--stack' : '');
  const disc = document.createElement('span');
  disc.className = 'c-disc';
  disc.dataset.hue = hue;
  disc.dataset.grad = String(discGrad(glyph));
  disc.append(icon(glyph, { size: 16 }));
  if (sub) {
    const top = document.createElement('span');
    top.className = 'c-settings__row-top';
    top.append(disc, document.createTextNode(label));
    const s = document.createElement('span');
    s.className = 'c-settings__row-sub';
    s.textContent = sub;
    lab.append(top, s);
  } else {
    lab.append(disc, document.createTextNode(label));
  }
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'c-settings__switch';
  toggle.setAttribute('role', 'switch');
  toggle.setAttribute('aria-checked', String(!!checked));
  toggle.setAttribute('aria-label', label);
  const knob = document.createElement('span');
  knob.className = 'c-settings__switch-knob';
  toggle.append(knob);
  let inFlight = false;
  toggle.addEventListener('click', () => {
    if (inFlight) return;
    inFlight = true;
    const next = toggle.getAttribute('aria-checked') !== 'true';
    toggle.setAttribute('aria-checked', String(next));       // optimistic
    const ctrl = screensCtrl(
      () => { inFlight = false; },
      (msg) => {
        toggle.setAttribute('aria-checked', String(!next));  // revert
        if (live) live.textContent = msg || failText;
        inFlight = false;
      },
    );
    try {
      onToggle(next, ctrl);
    } catch (ex) {
      ctrl.fail();                                           // sync throw → revert (#141-m4; one-shot safe)
    }
  });
  row.append(lab, toggle);
  section.append(row);
  return section;
}

function screenShell(className, title, onBack) {
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
 * Chat appearance — FE-ONLY (#147): live preview canvas + pattern intensity +
 * message text size. Picks apply INSTANTLY (root css vars via callbacks) —
 * no bridge, no latch; the preview rides the REAL .c-chat-canvas paint.
 */
export function createChatAppearance({
  patternOpacity = 1,             // ★ N81 (#422): a LEVEL index (0/1/2), not an alpha
  patternStyle = 'triangles',    // W5 + 2026-08-22: 'triangles' (default) | 'lineart' | 'matrix' | 'flow' (desktop only)
  textScale = 1,
  isDesktop = typeof document === 'object' && document.documentElement.hasAttribute('data-desktop'),
  onBack,
  onPattern,                     // (level) — shell persists the index; CSS resolves the alpha
  onPatternStyle,                // (id) — shell sets data-chat-pattern + persists (W5)
  onTextScale,                   // (scale) — sets --chat-text-scale (bubble adoption: chat-shell integration, #147 flag)
  strings = getStrings(),
} = {}) {
  const { el, body } = screenShell('c-settings-appearance', strings.chatAppearance || 'Chat appearance', onBack);

  /* live preview — real canvas class: gradient + generated pattern mask */
  const preview = document.createElement('div');
  preview.className = 'c-chat-canvas c-settings-appearance__preview';
  preview.setAttribute('aria-hidden', 'true');
  const bubbleIn = document.createElement('div');
  bubbleIn.className = 'c-settings-appearance__bubble';
  bubbleIn.dataset.side = 'received';
  bubbleIn.textContent = strings.previewIncoming || 'Pattern, gradient, text size…';
  const bubbleOut = document.createElement('div');
  bubbleOut.className = 'c-settings-appearance__bubble';
  bubbleOut.dataset.side = 'sent';
  bubbleOut.textContent = strings.previewOutgoing || '…exactly how your chats will look.';
  preview.append(bubbleIn, bubbleOut);
  body.append(preview);

  /* W5 — STYLE first, then INTENSITY: the user picks what the pattern IS
     before deciding how loud it is. Live flow is dropped from the list on
     mobile (desktop-only, Damir 2026-08-12); a mobile user whose stored pref
     somehow says 'flow' sees Line art selected, matching what chat.html's
     pre-paint script actually applies. */
  const styleOpts = PATTERN_STYLES.filter((o) => isDesktop || !o.desktopOnly);
  let styleCurrent = styleOpts.some((o) => o.id === patternStyle) ? patternStyle : 'triangles';
  const styleSec = document.createElement('div');
  styleSec.className = 'c-settings__section';
  const stLab = document.createElement('h3');
  stLab.className = 'c-settings__label';
  stLab.textContent = strings.patternStyle || 'Background';
  const styleGroup = styleSwatchGroup({
    options: styleOpts.map((o) => ({ id: o.id, label: strings[o.key] || o.label })),
    current: styleCurrent,
    ariaLabel: strings.patternStyle || 'Background',
    onPick: (id) => {
      styleCurrent = id;
      applyPreviewStyle(id);
      if (onPatternStyle) onPatternStyle(id);
    },
  });
  styleSec.append(stLab, styleGroup);
  // AND-35 (#371, Damir dial): the SIZE control leads — appended below, before
  // this section (build order unchanged; only the visual order flips).

  const patternSec = document.createElement('div');
  patternSec.className = 'c-settings__section';
  const pLab = document.createElement('h3');
  pLab.className = 'c-settings__label';
  pLab.textContent = strings.patternIntensity || 'Opacity';
  // #334 iOS-60: swatch tiles, not text pills — the tile face IS the preview
  // mechanism (same .c-chat-canvas paint, per-level --chat-pattern-opacity).
  // ★ N81 (#422): three levels now — Off / Default / Strong.
  const intensityGroup = swatchGroup({
    options: PATTERN_LEVELS.map((o) => ({ value: o.value, label: strings[o.key] || o.label })),
    current: patternOpacity,
    ariaLabel: strings.patternIntensity || 'Opacity',
    onPick: (v) => { preview.style.setProperty('--chat-pattern-opacity', patternLevelVar(v)); if (onPattern) onPattern(v); },
  });
  patternSec.append(pLab, intensityGroup);

  const sizeSec = document.createElement('div');
  sizeSec.className = 'c-settings__section';
  const sLab = document.createElement('h3');
  sLab.className = 'c-settings__label';
  sLab.textContent = strings.textSize || 'Message text size';
  sizeSec.append(sLab, segGroup({
    options: TEXT_SIZES.map((o) => ({ value: o.value, label: strings[o.key] || o.label })),
    current: textScale,
    ariaLabel: strings.textSize || 'Message text size',
    onPick: (v) => { preview.style.setProperty('--chat-text-scale', String(v)); if (onTextScale) onTextScale(v); },
  }));
  // AND-35 (#371, Damir dial): Text size first, then Background (style), then
  // Opacity (intensity) — the pattern pair reads as one topic under two labels.
  body.append(sizeSec, styleSec, patternSec);

  // preview honors the incoming state
  preview.style.setProperty('--chat-pattern-opacity', patternLevelVar(patternOpacity));
  preview.style.setProperty('--chat-text-scale', String(textScale));
  applyPreviewStyle(styleCurrent);
  /* The preview mounts a LIVE engine (rAF + ResizeObserver + a document
     visibilitychange listener). settings.html's renderLayout() replaces the
     screen's children wholesale — on Back, on setLocale, on setPaneMode, on
     onRepresented — so without an explicit release the loop keeps running
     against a detached node forever, and the listener pins the whole discarded
     subtree. Every re-entry would add another. Same shape as, and released
     alongside, releaseDownloads (#267). (#46 audit) */
  el.release = () => {
    detachChatFlow(preview);
    if (styleGroup.releaseSwatches) styleGroup.releaseSwatches();
    if (intensityGroup.releaseSwatches) intensityGroup.releaseSwatches();
  };
  return el;

  /* The big preview mirrors the chat exactly: tile styles are pure CSS (the
     attribute switches the inherited URI), flow mounts the real engine. It runs
     LIVE here — unlike the swatches — because this is the one place the user is
     deciding whether they want motion at all, and it is a single canvas.
     Declared as a hoisted function so the style section above can call it
     before the preview's own initial paint below. */
  function applyPreviewStyle(id) {
    preview.dataset.chatPattern = id;
    if (id === 'flow') mountFlowFace(preview);
    else detachChatFlow(preview);
    if (intensityGroup.setSwatchStyle) intensityGroup.setSwatchStyle(id);
  }
}

/**
 * Privacy — §9-GATED toggles (read receipts / typing indicators). No legacy
 * commands exist; every row renders ONLY when its capability is flagged.
 */
export function createPrivacy({
  readReceipts = true,
  typingIndicators = true,
  capabilities = {},             // { readReceipts, typing }
  onBack,
  onReadReceipts,                // (next, ctrl) — §9
  onTyping,                      // (next, ctrl) — §9
  strings = getStrings(),
} = {}) {
  const { el, body, live } = screenShell('c-settings-privacy', strings.privacy || 'Privacy', onBack);

  const note = document.createElement('p');
  note.className = 'c-settings__note';
  note.textContent = strings.privacyNote ||
    'These apply to everyone you chat with. Turning one off also hides theirs from you.';
  body.append(note);

  if (capabilities.readReceipts && onReadReceipts) body.append(switchRow({
    glyph: 'checks', hue: 'info',
    label: strings.readReceipts || 'Read receipts',
    sub: strings.readReceiptsSub || 'Others see when you’ve read their messages',
    checked: readReceipts, live,
    failText: strings.privacyFailed || 'Couldn’t update. Try again.',
    onToggle: onReadReceipts,
  }));
  if (capabilities.typing && onTyping) body.append(switchRow({
    glyph: 'dots', hue: 'accent',
    label: strings.typingIndicators || 'Typing indicators',
    sub: strings.typingIndicatorsSub || 'Others see when you’re typing',
    checked: typingIndicators, live,
    failText: strings.privacyFailed || 'Couldn’t update. Try again.',
    onToggle: onTyping,
  }));
  return el;
}

/**
 * Notifications — §9-GATED (global master + preview text + in-app sounds).
 * Legacy only mutes groups/bots per-chat; the global surface is a proposal.
 */
export function createNotificationsScreen({
  enabled = true,
  previews = false,              // matches the SHIPPED C# default (KEY_SENDER_NAME = false)
  sounds = true,
  isDesktop = typeof document === 'object' && document.documentElement.hasAttribute('data-desktop'),
  capabilities = {},             // { globalNotifications }
  onBack,
  onEnabled, onPreviews, onSounds,   // (next, ctrl) — §9
  strings = getStrings(),
} = {}) {
  const { el, body, live } = screenShell('c-settings-notifs', strings.notifications || 'Notifications', onBack);
  const failText = strings.notifFailed || 'Couldn’t update notifications.';
  if (capabilities.globalNotifications) {
    if (onEnabled) body.append(switchRow({
      glyph: 'bell', hue: 'warning',
      label: strings.notifAll || 'Allow notifications',
      checked: enabled, live, failText, onToggle: onEnabled,
    }));
    /* ★★ #597 (Damir, 2026-08-27 — D3): THE ROW IS BACK, ON MOBILE ONLY.
     *
     * #589 removed it everywhere. The finding it implemented said "DESKTOP Account →
     * Notifications" in its own text (f5-findings-2026-08-26-walkday.md:160), so the
     * fix was one platform wider than the ask. On a phone the notification IS the
     * surface — a banner with no sender is a banner you cannot triage — and on the
     * desktop, where the window is usually open, it is the redundancy Damir named.
     *
     * ⚠ `isDesktop` is read from the document, not from the window width, because
     * `data-desktop` is a UA stamp set before first paint and is constant across a
     * resize (settings.html:11). A pane is not a phone.
     *
     * NOTIF-2 (2026-08-21) still applies to the LABEL: the old wording promised
     * control over "sender and text". There is no text to control — AND-15 (#334)
     * builds a per-TYPE line ("New Message", "Payment received", …) with no sender
     * name and no message body — so the row governs the one thing a notification can
     * carry, and the sub-label says so. */
    if (onPreviews && !isDesktop) body.append(switchRow({
      glyph: 'eye', hue: 'info',
      label: strings.notifSender || 'Show sender name',
      sub: strings.notifSenderSub || 'Message text is never shown in notifications',
      checked: previews, live, failText, onToggle: onPreviews,
    }));
    if (onSounds) body.append(switchRow({
      glyph: 'alert-small', hue: 'accent',
      label: strings.notifSounds || 'In-app sounds',
      checked: sounds, live, failText, onToggle: onSounds,
    }));
  }
  return el;
}

/**
 * Security level — §9-GATED tier picker (#147: Basic/Moderate/Strict presets
 * + Custom). Selecting commits the TIER (onSecurityTier — the cascade into
 * lock/privacy/notification policy is BE-side per the spec §8 table); Custom
 * hands control back to the individual settings. Latched per pick.
 */
export function createSecurityLevel({
  tier = 'basic',
  capabilities = {},             // { securityTiers }
  onBack,
  onSecurityTier,                // (tierId, ctrl) — §9/ARCHITECTURE proposal
  strings = getStrings(),
} = {}) {
  const { el, body, live } = screenShell('c-settings-security', strings.securityLevel || 'Security level', onBack);
  if (!capabilities.securityTiers || !onSecurityTier) return el;

  const note = document.createElement('p');
  note.className = 'c-settings__note';
  note.textContent = strings.securityNote ||
    'A level sets lock, privacy and notification policy together. You can switch anytime.';
  body.append(note);

  const group = document.createElement('div');
  group.className = 'c-settings-security__tiers';
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', strings.securityLevel || 'Security level');
  body.append(group);

  let current = tier;
  let inFlight = false;
  const cards = new Map();
  const paint = () => {
    for (const [id, c] of cards) c.setAttribute('aria-checked', String(id === current));
  };
  for (const t of SECURITY_TIERS) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'c-settings-security__tier';
    card.setAttribute('role', 'radio');
    card.dataset.tier = t.id;
    const head = document.createElement('span');
    head.className = 'c-settings-security__tier-head';
    const nm = document.createElement('span');
    nm.className = 'c-settings-security__tier-name';
    nm.textContent = strings[t.key] || t.label;
    const status = document.createElement('span');
    status.className = 'c-settings__opt-status';
    const tick = icon('check', { size: 18 });
    tick.classList.add('c-settings__opt-check');
    status.append(tick);
    head.append(nm, status);
    const desc = document.createElement('span');
    desc.className = 'c-settings-security__tier-desc';
    desc.textContent = strings[t.descKey] || t.desc;
    card.append(head, desc);
    card.addEventListener('click', () => {
      if (inFlight || t.id === current) return;
      inFlight = true;
      card.dataset.loading = '';
      card.setAttribute('aria-busy', 'true');
      const spinner = document.createElement('span');
      spinner.className = 'c-button__spinner';
      spinner.setAttribute('aria-hidden', 'true');
      status.append(spinner);
      const ctrl = screensCtrl(
        () => {
          inFlight = false;
          delete card.dataset.loading;
          card.removeAttribute('aria-busy');
          spinner.remove();
          current = t.id;
          paint();
          live.textContent = (strings.securityLevel || 'Security level') + ': ' + (strings[t.key] || t.label);
        },
        (msg) => {
          inFlight = false;
          delete card.dataset.loading;
          card.removeAttribute('aria-busy');
          spinner.remove();
          live.textContent = msg || strings.securityFailed || 'Couldn’t change the security level.';
        },
      );
      try {
        onSecurityTier(t.id, ctrl);
      } catch (ex) {
        ctrl.fail();                                         // sync throw → clean up spinner/latch (#141-m4)
      }
    });
    cards.set(t.id, card);
    group.append(card);
  }
  paint();
  return el;
}
