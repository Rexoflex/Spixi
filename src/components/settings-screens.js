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
/* ★ Session M (#774): the Colour control is a VALUE ROW that opens the house option sheet,
   not a third tile pair — see createChatAppearance. The direction is safe and already
   travelled: build-demo-bundle.mjs orders settings-shell BEFORE settings-screens, and
   settings-app.js imports settingsConfirm across the same edge. settings-shell.js imports
   nothing from this file, so there is no cycle to create. */
import { settingsOptionSheet } from './settings-shell.js';

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

/* ★ Session M (#783): THE PATTERN_LEVELS ARRAY IS GONE. Session M folded the intensity
   control into the Background row, which deleted `swatchGroup` — the array's only reader.
   What remained described a control that no longer exists, so it is retired here, and its
   two labels (`patternOff`, `patternDefault`) leave the extractor table with it and so
   leave every locale.
   ⚠ THE LEVEL ITSELF IS STILL REAL: 0 and 1 are still the stored values, and
   readPatternLevel below still folds a stored 2 — the retired Strong step — to 1. Only the
   labelled picker is retired. That fold is repeated in the two pre-paint ladders
   (chat.html, settings.html), because a level resolved after first paint flashes the wrong
   intensity — the #690 three-ladder rule. */

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

/* Swatch-face amplification (see patternLevelVar's `boost`) — the tiles paint the real
   chat alpha multiplied, because at true alpha a 64px tile of a 0.07-alpha pattern is a
   blank rectangle and the control cannot be read even though it is operable.
   ★ HISTORY, kept because the number outlived its reason: 6× was chosen when this row was
   the INTENSITY control, to put Off / Default / Strong at 0 / 0.36 / 0.6 — separable at
   56px while keeping the Default:Strong ratio the chat had, so the tiles ranked the way the
   chat ranked. #774 retired that control: the tiles pick a PATTERN now, not a level, so
   "rank like the chat" is not a job any more and 6 was left carrying a justification that
   no longer described it (#772).
   ★★ Session M (Damir, on the render sheet: *"make the doodle pattern also fainter on the
   tiles"*) — AND THE REQUEST NAMES A REAL DEFECT IN THE SHAPE OF THE DIAL, not just a value.
   ONE multiplier cannot balance TWO artworks with different ink coverage: doodles is dense
   line art and the data matrix is scattered dots, so at a shared 6× the doodles tile shouts
   while the matrix tile whispers, side by side, at the same nominal alpha. That imbalance is
   what he was looking at.
   So the boost is PER STYLE now: this constant stays the shared default (matrix, live flow —
   the low-coverage tiles that need the amplification) and a high-coverage style overrides it
   below. Picked by render, six candidates (6 · 4.5 · 3 · 2 · 1.5 · 1) in both themes, on the
   real built shell, with the two questions rendered as SEPARATE strips — one moving the
   shared dial (which shows what the matrix costs) and one moving doodles alone. Both strips
   are in docs/sheets/session-m/.
   ⚠ Do NOT "simplify" this back to one number by lowering the shared value: the shared strip
   is exactly the evidence against it — at ×3 the matrix is already faint and by ×2 it is
   gone, so a single dial soft enough for doodles erases the tile beside it. */
export const PATTERN_SWATCH_BOOST = 6;

/* Per-style overrides of the boost above. Keyed by PATTERN_STYLES id; anything absent takes
   the shared default. Deliberately NOT exported — it is an internal dial of this screen.
   (The shared constant is exported, but nothing outside this file reads that either.)
   REVERSAL: empty this map and every tile returns to the shared 6×, i.e. to the doodles tile
   Damir asked to quieten. The values ARE the picks, so they are the thing to move: 4.5 is one
   step louder, 2 one step softer, both rendered on the sheet. */
const PATTERN_SWATCH_BOOSTS = {
  /* doodles at ×3 sits at the same visual weight as the matrix tile at ×6 in BOTH themes —
     which is the point of the whole change, since the two tiles are read side by side. */
  doodles: 3,
};

/** The swatch boost for one style id — the override, or the shared default. */
function swatchBoost(id) {
  return Object.prototype.hasOwnProperty.call(PATTERN_SWATCH_BOOSTS, id)
    ? PATTERN_SWATCH_BOOSTS[id]
    : PATTERN_SWATCH_BOOST;
}

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

/* ★★ Session M (#774): `swatchGroup` — the INTENSITY row's builder — is DELETED here.
   It lost its only caller when Background absorbed Opacity, and an unreachable builder for
   a retired control is the same hazard as the retired card itself: it reads as live code,
   it keeps its own `setSwatchStyle` / `releaseSwatches` contract alive in the reader's head,
   and it is one call site from coming back. Its two genuinely shared behaviours already live
   in the style group below — the [data-off] tile treatment (now the None member) and the
   flow-face release — so nothing was lost with it.
   What it was: mini chat canvases at each LEVEL's opacity instead of text pills, because
   localized level labels overflowed the pills in longer locales (sl-si "Izklopljeno" /
   "Standardno"). That reasoning is why the STYLE tiles below carry their label as an
   aria-label + title rather than as visible text, and it is recorded here so the next person
   to consider putting words back on a swatch knows it was tried. Recover it from git if the
   intensity axis ever returns — it will need a per-theme value story again (#422). */

/* pattern STYLE swatches (W5) — native buttons, role=radio, aria-checked, the localized
   label as aria-label + title (never visible text — see the note above on why), and each
   face carries its OWN `data-chat-pattern`.
   ⚠ This said "same grammar as the intensity swatches above" until Session M deleted them.
   The sentence was true when written and became a pointer to nothing (#772); the grammar it
   named is described here now rather than by reference. That attribute
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
/* ★ Session M (#774): `off` — an option that paints NO pattern. The Background control
   absorbed the retired Opacity card, so "None" is now a member of THIS list rather than
   level 0 of a second one, and it has to look like the bare ground the chat will show:
   opacity 0 (nothing to draw) plus the [data-off] diagonal slash the intensity row's Off
   tile carried, so it reads as a distinct state and not as a broken tile.
   ⚠ The face deliberately gets NO faceAttr: a value matching no rule in chat-pattern.css
   inherits the document's — the exact AUG faceAttr defect — and here that inheritance is
   harmless only because the opacity is 0. Setting nothing says "this tile draws nothing"
   in one place instead of relying on two. */
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
    if (o.off) b.dataset.off = '';                     // ★ Session M (#774): the None tile's slash treatment
    else face.dataset[faceAttr] = o.id;
    /* Every pattern tile paints at the SAME level (1) — the tile answers "which pattern",
       never "how much of it", so a user sitting on None must still see three distinguishable
       pictures rather than three blanks. Only the None member paints nothing, and it says so
       with an empty face plus the [data-off] slash rather than with a low alpha.
       ★ N81 (#422): this was the literal '0.5' — the old light-mode Standard alpha — which
       under the index ladder would paint these tiles ~12× the real pattern and promise a
       background the chat never shows.
       ★★ AUG (Damir 2026-08-30, ON DEVICE): and then it rode alpha-2, the retired Strong
       step, which at 0.1 read markedly FAINTER than the intensity row beside it.
       ★★ Session M: the amplification is PER STYLE (swatchBoost) — one multiplier cannot
       balance two artworks with different ink coverage, which is why the dense doodles tile
       shouted next to the scattered matrix one. ⚠ The sentences above that describe this as
       "the SAME boosted alpha the intensity row uses" and "PATTERN_SWATCH_BOOST is the single
       dial" were both true when written and are both false now; they are rewritten rather
       than left as a pointer to a row that no longer exists (#772). */
    face.style.setProperty('--chat-pattern-opacity', o.off ? '0' : patternLevelVar(1, swatchBoost(o.id)));
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
  host,                          // ★ Session M (#774): the Colour sheet's host — hubFor grammar below
  onBack,
  onPattern,                     // (level) — shell persists the index; CSS resolves the alpha
  onPatternStyle,                // (id) — shell sets data-chat-pattern + persists (W5)
  onChatGround,                  // (id) — shell sets data-chat-ground + persists (★ AUG)
  onTextScale,                   // (scale) — sets --chat-text-scale (bubble adoption: chat-shell integration, #147 flag)
  strings = getStrings(),
} = {}) {
  const { el, body } = screenShell('c-settings-appearance', strings.chatAppearance || 'Chat appearance', onBack);
  /* the createSettingsHub / createSettingsDanger idiom, verbatim: an explicit host wins,
     otherwise the demo phone frame, otherwise the sheet's own default (document.body). */
  const hostFor = () => host || el.closest('.demo-phone') || undefined;

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

  /* ★★ Session M (#774) — THE BACKGROUND CONTROL ABSORBED THE OPACITY CARD.
     Damir, from the device: *"we have 3 which are quite similar and confusing this way…
     currently we have 3 almost identical rows."* Background, Canvas and Opacity all
     rendered as the same widget — a pair of ~56px patterned tiles — so three different
     questions wore one costume, and the costume LIED about two of them: the Canvas tiles
     showed the doodle pattern rather than the ground they pick, and the Opacity tiles
     showed a pattern rather than an intensity.
     So the goal is NOT "one card fewer". It is that each control looks like the question
     it asks: a pattern choice earns swatches (it is inherently visual), a binary with no
     texture to preview does not. Background keeps tiles and gains a None member; Colour
     becomes a value row.

     ★★★ THE STORAGE IS UNCHANGED, AND THAT IS DELIBERATE — it is the safer half of this
     batch. The spec (docs/chat-appearance-restructure-spec.md §4) assumed the (style,
     level) PAIR would collapse into one stored value, which would mean a new key, a
     migration, and that migration repeated in all three pre-paint ladders (the #690 rule).
     None of it is necessary: with Strong retired the level is already binary, so
     `level 0` IS "None" and `level 1 + style` IS that style — the collapse is total and
     LOSSLESS in the direction that matters, and it can be computed at render time from the
     two keys that already exist. Net: zero migration, zero new key, zero ladder change,
     and chat.html / settings.html keep reading exactly what they read today.
     ⚠ Consequence worth stating because it is a FEATURE and not an oversight: picking None
     leaves the stored STYLE untouched, so a user who goes None → Doodles → None → Matrix
     never loses the pattern they had. The pair is only ever read as one value here.
     REVERSAL: this is the whole restructure — restore the separate style/intensity groups
     from git and the three-identical-rows defect returns with them. */
  const styleOpts = PATTERN_STYLES.filter((o) => isDesktop || !o.desktopOnly);
  /* the style axis and the level axis, kept apart INSIDE this screen. `styleCurrent` is
     the style the user last chose (or the default) and survives a None pick; `levelCurrent`
     is 0 or 1 and is what None actually writes. */
  let styleCurrent = styleOpts.some((o) => o.id === patternStyle) ? patternStyle : 'doodles';
  let levelCurrent = Number(patternOpacity) > 0 ? 1 : 0;
  const bgOpts = [
    /* ★ Session M: a NEW string, and the only one this restructure adds. The retired
       `patternOff` ("Off") was translated in every locale and was still NOT reused: under
       a "Background" heading "Off" names the CONTROL rather than the option, which is the
       same class of lie the tiles were telling. */
    { id: 'none', label: strings.patternNone || 'None', off: true },
    ...styleOpts.map((o) => ({ id: o.id, label: strings[o.key] || o.label })),
  ];
  const bgValue = () => (levelCurrent > 0 ? styleCurrent : 'none');
  const styleSec = document.createElement('div');
  styleSec.className = 'c-settings__section';
  const stLab = document.createElement('h3');
  stLab.className = 'c-settings__label';
  stLab.textContent = strings.patternStyle || 'Background';
  const styleGroup = styleSwatchGroup({
    options: bgOpts,
    current: bgValue(),
    ariaLabel: strings.patternStyle || 'Background',
    onPick: (id) => {
      if (id === 'none') {
        levelCurrent = 0;
        /* the live preview follows in the same frame — the tile ring is not the only
           feedback, and this preview is the whole reason the screen has one. */
        preview.style.setProperty('--chat-pattern-opacity', patternLevelVar(0));
        if (onPattern) onPattern(0);
        return;
      }
      styleCurrent = id;
      applyPreviewStyle(id);
      /* ★ coming BACK from None has to restore the intensity as well as the style, or the
         user picks a pattern and nothing appears. The write is CONDITIONAL so a plain
         style swap does not re-write a value that has not changed. */
      if (levelCurrent === 0) {
        levelCurrent = 1;
        preview.style.setProperty('--chat-pattern-opacity', patternLevelVar(1));
        if (onPattern) onPattern(1);
      }
      if (onPatternStyle) onPatternStyle(id);
    },
  });
  styleSec.append(stLab, styleGroup);
  // AND-35 (#371, Damir dial): the SIZE control leads — appended below, before
  // this section (build order unchanged; only the visual order flips).

  /* ★★ AUG GROUND (Damir 2026-08-30). Rendered only in LIGHT — see CHAT_GROUNDS.
     `isLight` is read from the live document rather than passed in, because this screen
     can be open across a setTheme push (#421) and a row that was correct at build time
     would then be wrong on screen.
     ⚠ Session M: that sentence was TRUE of the read and FALSE of the outcome (#772) —
     reading the live document at BUILD time is exactly what makes a rebuild correct, and a
     setTheme push rebuilds nothing on its own. The row survived an OS flip into dark and
     sat there with no effect. settings.html now re-renders THIS view from the setTheme
     handler's onApplied, which is what makes the sentence true; the read stays here
     because the rebuild depends on it. */
  const isLight = !document.documentElement.getAttribute('data-theme')
    || document.documentElement.getAttribute('data-theme') === 'light';
  let groundCurrent = CHAT_GROUNDS.some((o) => o.id === chatGround) ? chatGround : 'flat';
  /* ★ Session J (same finding): the live PREVIEW carried data-chat-ground only after a pick —
     at build it inherited the document's, and settings.html's root never carries one, so the
     preview painted FLAT under a Gradient swatch. It is stamped from the current value at build. */
  preview.setAttribute('data-chat-ground', groundCurrent);
  /* ★ Session M: the colour card is a SINGLE ROW, so it takes the hub's card padding (4)
     rather than the appearance screen's section padding (12) — a 48px row inside a 12px
     section reads as a row floating in a box.
     ⚠ The section is built ONLY in light. It used to be created and appended
     unconditionally, which painted an empty 8px card in dark. */
  let groundSec = null;
  if (isLight) {
    groundSec = document.createElement('div');
    groundSec.className = 'c-settings__section c-settings-appearance__groundsec';
    /* ★★ Session M (#774): A VALUE ROW, NOT A TILE PAIR — and this is the FIX, not a
       layout preference. Two near-identical coloured rectangles is precisely the confusion
       being removed; shipping the colour control as another swatch row would delete a card
       and keep the defect. The shape is the house one for a one-of-N choice that does not
       deserve a card of its own (settingsOptionSheet), so nothing is invented here.
       REVERSAL: swap this block for styleSwatchGroup({ faceAttr: 'chatGround' }) and the
       AUG tiles are back. */
    /* ★ no h3 here, and that is the point: the other two cards are "heading + control",
       this one IS the control. A heading above a row that repeats the same word was the
       first thing the restructure was supposed to stop doing. */
    const groundLabel = (id) => {
      const o = CHAT_GROUNDS.find((g) => g.id === id);
      return o ? (strings[o.key] || o.label) : id;
    };
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'c-settings__row c-settings-appearance__ground';
    const lab = document.createElement('span');
    lab.className = 'c-settings__row-label';
    lab.textContent = strings.chatGround || 'Canvas';
    const val = document.createElement('span');
    val.className = 'c-settings__row-value';
    val.textContent = groundLabel(groundCurrent);
    row.append(lab, val, icon('chevron-right', { size: 18 }));
    row.addEventListener('click', () => {
      settingsOptionSheet({
        title: strings.chatGround || 'Canvas',
        options: CHAT_GROUNDS.map((o) => ({ value: o.id, label: strings[o.key] || o.label })),
        current: groundCurrent,
        host: hostFor(),
        strings,
        /* FE-only pref: there is nothing to round-trip, so the commit succeeds in the
           same tick. The sheet's (value, ctrl) contract is honoured rather than
           side-stepped — ctrl.done() is what closes the sheet and moves the check. */
        commit: (v, ctrl) => {
          groundCurrent = v;
          val.textContent = groundLabel(v);
          preview.setAttribute('data-chat-ground', v);
          if (onChatGround) onChatGround(v);
          ctrl.done();
        },
      });
    });
    groundSec.append(row);
  }

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
  // AND-35 (#371, Damir dial): Text size first, then Background.
  /* ★ Session M: THREE cards in light — size, background, colour. In dark the colour card
     does not exist, so only two are appended. A live theme flip re-renders this whole
     screen (settings.html onApplied), which is what keeps the order correct. */
  body.append(sizeSec, styleSec);
  if (groundSec) body.append(groundSec);

  // preview honors the incoming state
  preview.style.setProperty('--chat-pattern-opacity', patternLevelVar(levelCurrent));
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
    /* ★ Session M: ONE group now. The intensity group's release went with its card — and
       it was load-bearing while it existed (a flow face keeps a rAF loop + a
       visibilitychange listener alive against a detached node), which is why the surviving
       group's release is still called and not tidied away. */
    if (styleGroup.releaseSwatches) styleGroup.releaseSwatches();
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
    /* ★ Session M: the `intensityGroup.setSwatchStyle(id)` call lived here — the intensity
       tiles had to re-skin to the chosen style, or a user on "Data matrix" was offered
       levels of doodles. With one control there is no second row to keep honest. */
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
