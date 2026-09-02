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
  /* ★★ E1 (Damir 2026-08-29): DOODLES is the default, and TRIANGLES + LINE ART are
     RETIRED on his explicit ruling — asked for and given, because retiring a style
     silently re-skins whoever chose it and that is not a tidy-up to make on your own.
     Listed first because the picker's first entry is what a new install lands on.
     Data matrix stays (his words: "keep that tech thingy on mobile"); Live flow stays
     desktop-only. A stored 'triangles' or 'lineart' no longer matches any allowlist,
     so it FALLS THROUGH to 'doodles' on read — see chat.html / settings.html. */
  { id: 'doodles', key: 'patternStyleDoodles', label: 'Doodles' },
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
/* ★★★ AUG GROUND (Damir 2026-08-30) — the light canvas is a CHOICE now.
   The flat #EFF5EB ground became the default; the E1c teal→green wash is kept as an
   option rather than retired, on his explicit call ("leave the gradient as an option in
   chat appearance on light mode").
   ⚠ LIGHT ONLY, and that is not an oversight: dark has no wash to choose between — it
   carries the blue radial in both cases — so the row is HIDDEN in dark rather than shown
   with one option, which would read as a broken control. The stored pref survives a theme
   flip untouched; it simply has no effect until the user is back in light.
   ★ The notice card follows the ground (system-notice.css): on the saturated wash it works
   by being LIGHTER, on the flat near-white ground it has to be slightly DARKER. */
export const CHAT_GROUNDS = [
  { id: 'flat', key: 'groundFlat', label: 'Solid' },
  { id: 'gradient', key: 'groundGradient', label: 'Gradient' },
];

/* ★★★ AUG (Damir 2026-08-30): STRONG IS RETIRED — two levels, Off and Subtle.
   ⚠ THIS IS A RETIREMENT, SO IT CARRIES A MIGRATION, not just a shorter array. A user
   who chose Strong has `2` in localStorage; readPatternLevel below folds 2 → 1 so they
   land on Subtle rather than on a level that no longer exists. The same fold is repeated
   in the two pre-paint ladders (chat.html, settings.html), because a level resolved after
   first paint flashes the wrong intensity — the #690 three-ladder rule.
   ★ 'Default' was a poor label once there are only two options; it is 'Subtle' now, which
   is also the word Damir used. The KEY is unchanged so no locale loses its entry. */
export const PATTERN_LEVELS = [
  { value: 0, key: 'patternOff', label: 'Off' },
  { value: 1, key: 'patternDefault', label: 'Subtle' },
];

/**
 * Level index → the value to assign to --chat-pattern-opacity.
 *
 * @param {number} level 0 Off · 1 Default · 2 Strong
 * @param {number} [boost] multiply the alpha — for SWATCH-SIZE previews only.
 *   ★ break-my-verdict MINOR-3: at true alpha (0.06 vs 0.1 — 0.042 vs 0.1 when this
 *   was written) the Off and Default
 *   tiles are the same tile in light mode at 56px, so the control could not be read
 *   even though it was operable. The style row above already carries this exact
 *   compromise for the same reason. The LIVE preview canvas and the real chat stay
 *   truthful — a swatch is an icon for a choice, not a rendering of it.
 */
export function patternLevelVar(level, boost) {
  const n = Number(level);
  if (n <= 0) return '0';
  /* ★ AUG (2026-08-30): Strong is retired, so alpha-2 is no longer reachable from the
     picker. The TOKEN stays defined in tokens.css — it is one line from returning and
     removing it would mean re-deriving it per theme (the --border-bubble-received
     precedent) — but nothing selects it any more. A stored 2 folds to 1 upstream. */
  const tok = '--chat-pattern-alpha-1';
  return boost && boost !== 1
    ? 'calc(var(' + tok + ') * ' + boost + ')'
    : 'var(' + tok + ')';
}

/* Swatch-face amplification (see patternLevelVar's `boost`). 6× puts the three
   tiles at 0 / 0.36 / 0.6 — separable at 56px in both themes, and it keeps the
   Default:Strong RATIO intact so the tiles still rank the way the chat does.
   ★ E1 (2026-08-29): re-checked after the ladder moved to 0.06/0.10. The boost is
   unchanged at 6, but the swatch faces are NOT: Default was 0.042×6 ≈ 0.25 and is
   now 0.06×6 = 0.36, so Off↔Default separates further than before while
   Default↔Strong narrows from a 0.42 ratio to 0.60 — which is correct, because 0.60
   is the ratio the real chat now has and the swatch is meant to rank the way the
   chat does. Verified by render at 56px in both themes, not by arithmetic alone.
   ⚠⚠ THE NUMBERS ABOVE ARE PRE-E1c AND THE RENDER VERIFICATION WAS DONE AT THEM.
   E1c moved LIGHT's Default to 0.07 (dark stayed 0.065), so the SHIPPING figures are:
     light  0.07 ×6 = 0.42, Default:Strong ratio 0.07/0.10 = 0.70
     dark   0.065×6 = 0.39, ratio 0.65
   The boost of 6 is still safe — both stay below 1.0 and the "rank like the chat"
   property still holds, which is why this is a comment fix and not a code change. But
   "0.60 is the ratio the real chat now has" is no longer true of either theme, and the
   render was never repeated at 0.42/0.39. E1c walked tokens.css and system-notice.css
   and did not walk to this consumer. (Session F audit.) */
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
  /* ★★ AUG (2026-08-30): Strong retired. A stored 2 is a level that no longer exists, so
     it folds to Subtle rather than being honoured or thrown away. Legacy fractional alphas
     fold the same way — an old Bold user lands on the loudest option that still EXISTS,
     which is the same promise the pre-Aug comment made, just with a shorter ladder. */
  if (n === 1 || n === 2) return 1;          // already a level index (2 = retired Strong)
  return 1;                                  // legacy alpha: anything above 0 → Subtle
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
     three doodles tiles under a "Data matrix" selection would be showing them a
     level of something they aren't using. Flow tiles paint ONE still frame each
     (the Off tile draws nothing, so its diagonal-slash treatment still reads). */
  let swatchRaf = 0;
  g.setSwatchStyle = (id) => {
    // cancel a still-pending mount: a flow→tile flip inside one frame used to
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
   has no 2d context. A style that can't paint must fall back to a real TILE — a
   bare gradient would read as a broken tile, and the whole point of keeping a
   resolvable URI under [data-chat-pattern='flow'] (chat-pattern.css) is that this
   fallback is one attribute flip. ★ E1: that URI, and this fallback, are DOODLES
   now; both said line art / triangles before the two were retired. */
function mountFlowFace(face, opts) {
  let ctrl = null;
  try { ctrl = attachChatFlow(face, opts); } catch (e) { ctrl = null; }
  if (!ctrl) face.dataset.chatPattern = 'doodles';    // ★ E1 default style
  return ctrl;
}

/* ★★ AUG (Damir 2026-08-30, ON DEVICE): `faceAttr` — WHICH dataset attribute the tile face
   carries. It was hard-coded to `chatPattern`, which was right while this group only ever
   drew the pattern STYLE list. The ground row reuses this component (it previews a canvas,
   so it should) and set data-chat-pattern="flat" / "gradient" — values that match no rule
   in chat-pattern.css, so BOTH ground tiles inherited the document's ground and rendered
   IDENTICALLY. Damir: "on windows the canvas tiles look the same". */
function styleSwatchGroup({ options, current, ariaLabel, onPick, faceAttr = 'chatPattern' }) {
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
    face.dataset[faceAttr] = o.id;
    // the style tiles must show the PATTERN, not the user's current intensity —
    // a user sitting on "Off" would otherwise be picking between three blanks.
    // Intensity has its own swatch row directly below.
    // ★ N81 (#422): this was the literal '0.5' — the old light-mode Standard alpha,
    // which under the new ladder would paint these tiles ~12× the real pattern and
    // promise a background the chat never shows. It rode the STRONG step instead.
    /* ★★ AUG (Damir 2026-08-30, ON DEVICE): STRONG IS RETIRED, so alpha-2 was no longer
       "the loudest thing the user can actually choose" — it was a step nobody can pick,
       and at 0.1 against the intensity row's boosted 0.36 these tiles read markedly
       FAINTER than the row below them in Damir's screenshot. They ride the SAME boosted
       Subtle alpha the intensity row uses now, so all three swatch rows are painted at one
       density and the tile is legible at 64px. PATTERN_SWATCH_BOOST is the single dial. */
    face.style.setProperty('--chat-pattern-opacity', patternLevelVar(1, PATTERN_SWATCH_BOOST));
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
  row.dataset.row = 'switch';   // ★ Session I canon: switch rows are 56, nav rows 48
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
  patternStyle = 'doodles',      // W5 + ★ E1 2026-08-29: 'doodles' (default) | 'matrix' | 'flow' (desktop only)
  chatGround = 'flat',           // ★ AUG 2026-08-30: 'flat' (default) | 'gradient' — LIGHT only
  textScale = 1,
  isDesktop = typeof document === 'object' && document.documentElement.hasAttribute('data-desktop'),
  onBack,
  onPattern,                     // (level) — shell persists the index; CSS resolves the alpha
  onPatternStyle,                // (id) — shell sets data-chat-pattern + persists (W5)
  onChatGround,                  // (id) — shell sets data-chat-ground + persists (★ AUG)
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
     somehow says 'flow' sees Doodles selected, matching what chat.html's
     pre-paint script actually applies. */
  const styleOpts = PATTERN_STYLES.filter((o) => isDesktop || !o.desktopOnly);
  let styleCurrent = styleOpts.some((o) => o.id === patternStyle) ? patternStyle : 'doodles';
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

  /* ★★ AUG GROUND (Damir 2026-08-30). Rendered only in LIGHT — see CHAT_GROUNDS.
     `isLight` is read from the live document rather than passed in, because this screen
     can be open across a setTheme push (#421) and a row that was correct at build time
     would then be wrong on screen. */
  const isLight = !document.documentElement.getAttribute('data-theme')
    || document.documentElement.getAttribute('data-theme') === 'light';
  let groundCurrent = CHAT_GROUNDS.some((o) => o.id === chatGround) ? chatGround : 'flat';
  const groundSec = document.createElement('div');
  groundSec.className = 'c-settings__section';
  if (isLight) {
    const gLab = document.createElement('h3');
    gLab.className = 'c-settings__label';
    gLab.textContent = strings.chatGround || 'Canvas';
    const groundGroup = styleSwatchGroup({
      options: CHAT_GROUNDS.map((o) => ({ id: o.id, label: strings[o.key] || o.label })),
      current: groundCurrent,
      ariaLabel: strings.chatGround || 'Canvas',
      /* ★★ the face must carry data-chat-GROUND, not data-chat-pattern — see faceAttr.
         Without this both tiles preview the document's ground and look identical. */
      faceAttr: 'chatGround',
      onPick: (id) => {
        groundCurrent = id;
        /* the LIVE preview follows immediately — the swatch is not the only feedback */
        preview.setAttribute('data-chat-ground', id);
        if (onChatGround) onChatGround(id);
      },
    });
    groundSec.append(gLab, groundGroup);
  }

  const patternSec = document.createElement('div');
  patternSec.className = 'c-settings__section';
  const pLab = document.createElement('h3');
  pLab.className = 'c-settings__label';
  pLab.textContent = strings.patternIntensity || 'Opacity';
  // #334 iOS-60: swatch tiles, not text pills — the tile face IS the preview
  // mechanism (same .c-chat-canvas paint, per-level --chat-pattern-opacity).
  // ★ N81 (#422): three levels; ★ AUG (2026-08-30): TWO now — Off / Subtle.
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
  /* AUG: ground sits with the other canvas dials, after STYLE and before INTENSITY —
     what the canvas IS, then what is drawn on it, then how loud that is. groundSec is an
     empty div in dark (see isLight above), so appending it unconditionally is safe and
     keeps the order stable across a live theme flip. */
  body.append(sizeSec, styleSec, groundSec, patternSec);

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
  pushProvider = true,           // ★ P2 (#708): the third-party push opt-out; C# default TRUE
  platform = '',                 // 'android' | 'ios' | '' — the opt-out COSTS something different on each, and the row says which
  capabilities = {},             // { globalNotifications, pushProvider }
  onBack,
  onEnabled, onPreviews, onSounds,   // (next, ctrl) — §9
  onPushProvider,                // (next, ctrl) — ★ P2 (#708): ixian:notifPushProvider:on|off
  strings = getStrings(),
} = {}) {
  const { el, body: screenBody, live } = screenShell('c-settings-notifs', strings.notifications || 'Notifications', onBack);
  const failText = strings.notifFailed || 'Couldn’t update notifications.';
  /* ★ Session I (#735 §9, sheet 3b): ONE CARD GRAMMAR. Every switch row used to be its own
     card with inter-card gaps ("gaps read wrong"), while Account groups related rows in
     shared cards. The four rows are one "Notifications" group now — switchRow still
     returns a section, so appending the sections into a .c-settings__group gives the
     hub's dividers for free; the P2 note stays under the group. */
  const groupWrap = document.createElement('div');
  groupWrap.className = 'c-settings__groupwrap';
  const body = document.createElement('div');
  body.className = 'c-settings__group';
  groupWrap.append(body);
  screenBody.append(groupWrap);
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
      glyph: 'volume', hue: 'accent',   // ★ Session H: Damir's export; alert-small is the FAILED status glyph (chatlist-item) — one glyph, one meaning (#602)
      label: strings.notifSounds || 'In-app sounds',
      checked: sounds, live, failText, onToggle: onSounds,
    }));
    /* ★★ P2 (#708, privacy work order §P2 — Damir raised it again in Session G): A REAL
       OPT-OUT FOR THIRD-PARTY PUSH. Before this row, "Allow notifications" gated DISPLAY
       only: the OneSignal SDK still initialised and still registered, so a token, device
       metadata and an IP address kept reaching a US third party with notifications off.
       This switch is the genuine choice — off skips the SDK (iOS) / withdraws consent and
       opts the subscription out (Android). ⚠ THE COST DIFFERS BY PLATFORM AND THE ROW
       SAYS SO: Android polls and raises a LOCAL notification (messages arrive on the
       poll instead of instantly); iOS has no wake-up without the remote push, so nothing
       arrives until the app is opened. The sub-label is chosen by `platform`, never by
       guessing from the screen size. Threema built a feature out of exactly this choice
       (Threema Push); almost nobody else offers it. The cap comes from C#, which pushes
       it only where a push provider exists (never on Windows, where SPushService is a
       stub — a switch that changes nothing is a lie). */
    if (capabilities.pushProvider && onPushProvider) {
      body.append(switchRow({
        glyph: 'cloud-bolt', hue: 'info',   // ★ Session H: a cloud that wakes the device. NOT 'world' (the Language row) and NOT 'topology-star' (the secure notice, Damir 2026-08-30) — one glyph, one meaning (#602). bell-ringing was exported too; 'bell' already means "Allow notifications" one row above, so a second bell would blur it
        label: strings.notifPushProvider || 'Instant delivery via OneSignal',
        /* ★ Session I (#735 §9, Damir: "the OneSignal sub-label is confusing"): the SUB is
           STATE-NEUTRAL now — it says what the switch DOES, in one sentence, on both
           platforms. #712's intent (sub = the cost of the off state) read as a
           contradiction under a switch that is ON ("Off: …"). The state-dependent
           explanation — the #712 claim boundaries: token + IP to OneSignal, the per-platform
           off cost, the record it keeps — lives in the NOTE below, which follows the switch.
           The two old per-platform sub keys retire (their locales are rebuilt). */
        sub: strings.notifPushProviderSub || 'Wakes this device the moment a message arrives. Uses OneSignal, a push provider.',
        checked: pushProvider, live, failText, onToggle: onPushProvider,
      }));
      /* ★ #712 (Damir): THE FEEDBACK IS PROMINENT AND SAYS WHAT HAPPENS IN BOTH STATES.
         A note under the row, rebuilt from the STORED value on every echo (the screen is
         rebuilt on each push), so after a flip the user reads what is now true — not a
         toast that vanishes. Honest about the record: opting out stops every further
         contact and unsubscribes this device at OneSignal; it does not delete what
         OneSignal already holds (only their API can, and that key must not ship in an
         app). */
      const note = document.createElement('p');
      note.className = 'c-settings__note c-settings-notifs__push-note';
      note.setAttribute('aria-live', 'polite');
      screenBody.append(note);   // ★ Session I: under the GROUP, not inside the card
      note.textContent = pushProvider
        ? (strings.notifPushProviderOn || 'On: OneSignal wakes this device the moment a message arrives. OneSignal receives a push token for this device and sees its IP address. It never sees your messages or your contacts.')
        : (platform === 'ios'
          ? (strings.notifPushProviderOffIos || 'Off: nothing more is sent to OneSignal and this device is unsubscribed there. New messages appear when you open Spixi. The record OneSignal already holds is not deleted by this switch.')
          : (strings.notifPushProviderOffAndroid || 'Off: nothing more is sent to OneSignal and this device is unsubscribed there. Spixi checks for new messages itself and notifies you when it finds some, so they can arrive a little later. The record OneSignal already holds is not deleted by this switch.'));
    }
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
