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
import { settingsOptionSheet, createThemePicker, radioArrows } from './settings-shell.js';   // the Privacy screen's photo auto-download picker; ★ #1353 THE theme picker + the shared radio keyboard
/* ★ Session M (#774): the Colour control is a VALUE ROW that opens the house option sheet,
   not a third tile pair — see createChatAppearance. The direction is safe and already
   travelled: build-demo-bundle.mjs orders settings-shell BEFORE settings-screens, and
   settings-app.js imports settingsConfirm across the same edge. settings-shell.js imports
   nothing from this file, so there is no cycle to create. */

/* W5 (Damir 2026-08-12) — pattern STYLE, orthogonal to the intensity dial below.
 * Style picks the pattern SOURCE; intensity keeps mapping to opacity. "Off"
 * lives ONLY in the intensity control, so there is deliberately no fourth
 * style here. Live flow is DESKTOP-ONLY (constant animation = battery); the
 * picker renders two options on mobile, three on desktop. */
export const PATTERN_STYLES = [
  /* ★★ #835 (Damir, mid-run): "we will remove the dodole and just keep matrix and no
     pattern canvas". Asked back, because "no pattern canvas" could mean either retire the
     canvas RENDERER or keep Live flow and stop the canvas painting the still tiles, and he
     answered: "just lets keep the matrix, so removeing excess bloat that is renderer is ok
     i guess." So DOODLES and LIVE FLOW are retired and `chat-flow.js` is deleted outright.
     ⓘ ONE STYLE LEFT IS THE POINT, not an accident of this list: with #774 having folded
     the intensity dial into this same control, Background now renders exactly two tiles —
     None and Data matrix — which is Damir's "the Background control stops being a picker".
     ★ RETIREMENT IS A FALL-THROUGH, NOT A MIGRATION — the #422 rule, and it is what keeps
     a device that stored 'doodles' or 'flow' from rendering nothing: neither value matches
     any allowlist any more, so all three pre-paint ladders (chat.html's head script,
     chat.html's live re-resolve, settings.html's readChatPrefs — the #690 three-ladder
     rule) land on the one style (contours since #997). The stored string is deliberately left alone.
     ⓘ #866 (Session W) then retired the doodles TILE from the generated chat-pattern.css as
     well — #835 had left it emitted (233 KB, 94% of the sheet, selectable by nothing) because
     the generator's drift guard owned the asset; the guard went with it. The source SVG may
     still sit in src/assets/images unreferenced — deleting artwork is Damir's call. */
  /* ★★ #997 (Damir 2026-09-28): CONTOURS replace the data matrix (picked from constellation ·
     fine lattice · contours on the three grounds). Still ONE style; 'matrix' falls through. */
  /* ★★ S17 C (#1334, Damir 19:13): the id stays 'contours' (every stored pref keeps working) but the TILE is the
     render's Waves now and the LABEL is "Waves" — same key, new value in every locale. */
  /* ★★ S17 C (#1335, Damir 19:22 "add it, name 'Contours'"): the render's topographic rings — a NEW id and key. FIRST, as in
     the render (None · Contours · Waves, Damir 19:49 "that's what we want") */
  { id: 'rings', key: 'patternRings', label: 'Contours' },
  { id: 'contours', key: 'patternStyleContours', label: 'Waves' },
];/* ★ N81 (#422) — THREE levels, and the value is a LEVEL INDEX, not an alpha.
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
  /* ★★ #855 (Damir, 2026-09-09, asked and answered): "for gradient, yes I mean retire the
     option for now." This REVERSES his 2026-08-30 ruling quoted above — recorded as a
     reversal rather than by deleting that paragraph, because the next reader has to be able
     to see that "leave the gradient as an option" was a real ruling that a later one
     replaced, or they will restore it as a fix. (#853 shipped the DEFAULT flip first and
     asked which he meant; this is the answer.)
     ⚠ "FOR NOW" IS LOAD-BEARING, so nothing is deleted that would have to be re-derived:
     the `--gradient-chat` token, its `[data-chat-ground='gradient']` rules and the whole
     onChatGround plumbing all stay. Restoring the option is putting one line back here.
     ⓘ ONE MEMBER MEANS THE ROW DOES NOT RENDER — see the guard below. That is Damir's own
     rule, re-ruled explicitly on 2026-09-04 for the dark case: a one-option chooser reads
     as a broken control, so the row is ABSENT rather than shown with nothing to choose. */
  { id: 'flat', key: 'groundFlat', label: 'Mist' }   /* ★ S17 C (Damir 15:55): the canvas NAMES — no "… gradient", no "Brand"; keys kept, values changed */,
  /* ★★ #998 (Damir 2026-09-28, the polish round): the option is BACK as the BRAND GRADIENT —
     light only (★ #1066: and a DARK brand gradient since 2026-09-29, blue-violet → midnight), never the default (tokens.css #1002: #CCD0EC → #D0C9EB → #D5C3EB with its own
     ink #3A2F66). The restore was the one line #855 promised; the label is a NEW key because
     "Gradient" translations named the retired teal wash. */
  { id: 'gradient', key: 'groundBrandGradient', label: 'Iris' },
  /* ★★ #1080 F15 (Damir 2026-09-30, from his green title-bar screenshot; picked G2 of a rendered
     3-way): a SOFT GREEN gradient — LIGHT ONLY (`lightOnly`). There is no dark green rule, so in dark
     the dot is not offered and a stored 'green' paints the flat midnight ground (tokens.css). */
  /* ★★ S8 (#1237, Damir 2026-10-07): green is offered in DARK too (DG1 "Forest" — tokens.css has a dark rule now), and a
     fourth ground joins: BLUE — light B1 "Sky", dark DB1 "Azure". Both themes offer the same four: Solid · Brand · Green ·
     Blue. The `lightOnly` filter below stays as the mechanism (no member uses it today). */
  /* ★ S17 C (Damir 15:55): the order of the render — Mist · Iris · Spixi · Meadow, then the three NEW canvases */
  { id: 'blue', key: 'groundBlueGradient', label: 'Spixi' },
  { id: 'green', key: 'groundGreenGradient', label: 'Meadow' },
  /* ★★ S17 C (#1334): ADDED next to today's four (15:09) — tokens.css carries each one's ground, ink and Auto sent colour */
  { id: 'aurora', key: 'groundAurora', label: 'Aurora' },
  { id: 'dusk', key: 'groundDusk', label: 'Dusk' },
  { id: 'ocean', key: 'groundOcean', label: 'Ocean' },
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
  /* ★ #1351 (Damir 2026-10-12: "reduce the opacity of background patterns by 20 % in all cases"): a boosted swatch is
     capped by --chat-pattern-tile-max (absent = 1, the old implicit opacity clamp). On light Aurora alpha × boost is
     above 1 (0.192 × 6 = 1.15), so the clamp swallowed every alpha step there and the tiles never got lighter; that
     ground caps its tiles at 0.8 (= 20 % under the 1 they showed), every other ground keeps 1. */
  return boost && boost !== 1
    ? 'min(var(--chat-pattern-tile-max, 1), calc(var(' + tok + ') * ' + boost + '))'
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
  /* ★ S17 C (#1335): the rings tile carries more ink than the waves tile — one step softer in the tiles */
  rings: 4.5,
  /* ★ #835: the `doodles: 3` override retired with its style. It existed because ONE
     multiplier cannot balance two artworks with different ink coverage — dense doodle line
     art against the matrix's scattered dots. With a single tile left there is nothing to
     balance it against, so the shared default is the whole answer again and this map is
     empty BY MEANING rather than by neglect. It stays (and swatchBoost stays) because the
     next style added will need it, and an empty map is the honest state of "no overrides". */
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
/* ★ S17 C (#1334): TEXT_SIZES (S · M · L · XL) is RETIRED — the text size is a 12–22 px slider now (the render); the four
   preset keys leave the extractor table and every locale with it. Recover from git (S8 era) if presets ever return. */
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
   "Standardno"). That reasoning is why the STYLE tiles below USED TO carry their label only as
   an aria-label + title. ★ #1040 put a small visible name back on each tile (a corner pill —
   a ~170px tile, not a ~60px pill, so the overflow that forced it out does not apply); the
   aria-label is still the accessible name. Recover the level row from git if the
   intensity axis ever returns — it will need a per-theme value story again (#422). */

/* pattern STYLE swatches (W5) — native buttons, role=radio, aria-checked, the localized
   label as the aria-label AND (★ #1040) a visible aria-hidden corner pill, and each
   face carries its OWN `data-chat-pattern`.
   ⚠ This said "same grammar as the intensity swatches above" until Session M deleted them.
   The sentence was true when written and became a pointer to nothing (#772); the grammar it
   named is described here now rather than by reference. That attribute
   drives INHERITED custom properties in the generated chat-pattern.css, which
   is precisely why the styles were not keyed off a descendant selector: three
   different styles have to paint side by side in one list.

   ★ #835: the "flow" face — and FLOW_SWATCH_TUNE and mountFlowFace with it — retired
   alongside Live flow. Their fail-soft ("a style that cannot paint falls back to a real
   TILE") has nothing left to fall back FROM: the one surviving style IS a tile. */

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
    b.setAttribute('aria-label', o.label);   // ★ #1041: no `title` — the visible pill names the tile now, a hover tooltip only repeated it
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
    /* ★ #1040 (Damir 2026-09-29: the two tiles "are not clear" — a slashed tile and a faint
       wave): each tile now NAMES itself with a small pill inside its bottom corner. This
       revisits #774's "label on aria-label + title only", whose reason was localized labels
       overflowing the old PILL row; a tile is ~170px wide and the pill ellipsizes, so the
       longest locale label (it-it "Curve di livello", 16 chars) still fits. The pill is aria-hidden — the
       button's aria-label stays the accessible name, so a reader does not hear it twice. */
    const cap = document.createElement('span');
    cap.className = 'c-settings-swatch__label';
    cap.setAttribute('aria-hidden', 'true');
    cap.textContent = o.label;
    b.append(face, cap);
    b.addEventListener('click', () => {
      if (o.id === current) return;
      current = o.id;
      paint();
      onPick(o.id);
    });
    g.append(b);
  }
  paint();
  /* ★ #835: KEPT, and now a no-op by construction. This existed to stop a flow face's rAF
     loop + visibilitychange listener running against a detached node after
     settings.html's renderLayout() replaces the screen's children. Every tile is static
     now, so there is nothing to release — but the hook and its CALL SITE stay wired,
     because the next animated swatch would otherwise reintroduce that leak silently.
     Deleting the hook is the change that would hide it. */
  g.releaseSwatches = () => {};
  return g;
}

/* switch row — optimistic toggle w/ revert (the chat-info notifications grammar) */
function switchRow({ glyph, grad, hue, label, sub, checked, live, failText, onToggle }) {
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
  disc.dataset.grad = String(grad || discGrad(glyph));   // ★ S9: `grad` keeps a row's colour when its glyph changes
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

/* ★ S17 C (Damir 20:21): the ONE "picked" mark of the appearance tiles (theme phones, chat-list cards) — a white check in a
   blue disc, shown by CSS only on the [aria-checked="true"] tile; decoration (the radio role carries the state) */
function pickMark() {
  const m = document.createElement('span');
  m.className = 'c-settings-appearance__pick';
  m.setAttribute('aria-hidden', 'true');
  m.append(icon('check', { size: 14 }));
  return m;
}

/**
 * Chat appearance — FE-ONLY (#147): every pick applies INSTANTLY to the live preview and is written by the host
 * (localStorage, the chat shell's #690 ladders read it) — no bridge, no latch; the preview rides the REAL
 * .c-chat-canvas paint and the real bubble tokens.
 *
 * ★★ S17 C (#1334, Damir 2026-10-11 14:27 "a premium chat appearance screen", appearance-render.html, LOCKED) —
 * FIVE CARDS: (1) the live preview (the canvas, its pattern, a date chip, a received bubble with a sender name, a sent
 * bubble with ticks) + the text-size slider 12–22 px; (2) the CANVAS as a row of mini chats — today's four (renamed Mist,
 * Iris, Spixi, Meadow, 15:55) + NEW Aurora, Dusk, Ocean; (3) the BACKGROUND (None · Waves · Contours) + the NEW bubble
 * colour (Auto + 6) + the NEW bubble corners (4–22 px); (4) the THEME as three mini phones (only with `onTheme`);
 * (5) the chat-list message preview (1 / 2 lines as mini lists) + the Tips switch.
 * ★ ADDITIONS, NOT REPLACEMENTS (15:09): today's canvases and their exact look stay (tokens.css), the default stays Mist
 * + the pattern; nobody's chat changes until they pick something. ★ TODAY'S BUBBLE LOOK STAYS (15:16): only a colour
 * (data-chat-sent) and a radius (--bubble-radius) are layered on top; the received glass edge is untouched.
 * ★ A canvas pick resets the bubble colour to Auto (Damir, interview). ★ The corners default is 18 px = today (the tail
 * and group corners scale so 18 → 4 px exactly). ★ Desktop, wide: two columns (the preview stays put on the left).
 * Motion: colour / ground / radius ease ≤ .45 s; reduced motion = instant (settings-screens.css).
 * The storage is UNCHANGED for every existing control (pattern level + style, ground, text scale, preview lines); two
 * NEW keys only, for the two new controls (spixi.chat.sentcolour · spixi.chat.corners — the host writes them).
 */
export const BUBBLE_COLOURS = [
  { id: 'auto', key: 'bubbleColourAuto', label: 'Auto' },
  { id: 'blue', key: 'colourBlue', label: 'Blue' },
  { id: 'violet', key: 'colourViolet', label: 'Violet' },
  { id: 'teal', key: 'colourTeal', label: 'Teal' },
  { id: 'pink', key: 'colourPink', label: 'Pink' },
  { id: 'orange', key: 'colourOrange', label: 'Orange' },
  { id: 'graphite', key: 'colourGraphite', label: 'Graphite' },
];
export const BUBBLE_CORNERS = { min: 4, max: 22, def: 18 };
export const TEXT_SIZE_PX = { min: 12, max: 22, base: 16 };
/* ★ S17 C v3 (Damir 21:50, replaces the 21:24 file): EVERY canvas carries its OWN flat bubble colour (Auto) in tokens.css —
   each ground rule (root + descendant) sets the sent colour, its card and its meta ink, so a tile never inherits another
   canvas's colour and "Auto" is simply no data-chat-sent. */

/* ★ #1353: radioArrows (the one radio-group keyboard) moved to settings-shell.js — imported above */

export function createChatAppearance({
  patternOpacity = 1,             // ★ N81 (#422): a LEVEL index (0/1), not an alpha
  patternStyle = 'contours',     // ★ S17 C: 'contours' ("Waves") | 'rings' ("Contours")
  chatGround = 'flat',           // ★ S17 C: flat (Mist) · gradient (Iris) · blue (Spixi) · green (Meadow) · aurora · dusk · ocean
  textScale = 1,
  sentColour = 'auto',           // ★ S17 C (#1334): 'auto' | a BUBBLE_COLOURS id
  corners = BUBBLE_CORNERS.def,  // ★ S17 C (#1336): 4–22 px
  theme,                         // ★ S17 C: the THEME_OPTIONS value (0 System · 1 Light · 2 Dark); the card renders only with onTheme
  isDesktop = typeof document === 'object' && document.documentElement.hasAttribute('data-desktop'),
  host,                          // kept so existing callers stay valid (#1019)
  onBack,
  onPattern,                     // (level) — the host persists the index; CSS resolves the alpha
  onPatternStyle,                // (id)
  onChatGround,                  // (id)
  onTextScale,                   // (scale) — on release of the slider
  onSentColour,                  // ★ S17 C (id) — 'auto' clears the key
  onCorners,                     // ★ S17 C (px) — on release of the slider
  onTheme,                       // ★ S17 C (value, ctrl) — the host's theme commit (ixian:appearance:<v>); no handler → no card
  previewLines = '1',            // ★ S11 (#1262): '1' | '2'
  onPreviewLines,                // ('1' | '2') — no handler → no card row
  hintsOn = true,                // ★ S11 (#1262): C# (SHints) owns the value
  onHints,                       // (next, ctrl) — no handler → no row
  strings = getStrings(),
} = {}) {
  const { el, body } = screenShell('c-settings-appearance', strings.chatAppearance || 'Chat appearance', onBack);
  body.classList.add('c-settings-appearance__body');
  const card = (cls) => { const c = document.createElement('section'); c.className = 'c-settings__section c-settings-appearance__card ' + cls; return c; };
  const label = (text, id) => { const h = document.createElement('h3'); h.className = 'c-settings__label'; h.textContent = text; if (id) h.id = id; return h; };

  /* ── state ── */
  const styleOpts = PATTERN_STYLES.filter((o) => isDesktop || !o.desktopOnly);
  let styleCurrent = styleOpts.some((o) => o.id === patternStyle) ? patternStyle : 'contours';
  let levelCurrent = Number(patternOpacity) > 0 ? 1 : 0;
  const groundsHere = CHAT_GROUNDS.filter((o) => !o.lightOnly || document.documentElement.getAttribute('data-theme') !== 'dark');
  let groundCurrent = groundsHere.some((o) => o.id === chatGround) ? chatGround : 'flat';
  let groundStored = chatGround;   // (#46 r1 of #1080) a stored light-only pick shows as flat, a tap on flat still WRITES flat
  let colourCurrent = BUBBLE_COLOURS.some((o) => o.id === sentColour) ? sentColour : 'auto';
  const clampInt = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
  let cornersCurrent = clampInt(corners, BUBBLE_CORNERS.min, BUBBLE_CORNERS.max, BUBBLE_CORNERS.def);
  let sizePx = clampInt(Number(textScale) * TEXT_SIZE_PX.base, TEXT_SIZE_PX.min, TEXT_SIZE_PX.max, TEXT_SIZE_PX.base);
  /* the colour the background tiles show: the pick, else the canvas's own (its ground rule) */
  const tileSent = () => (colourCurrent !== 'auto' ? colourCurrent : '');
  const setSent = (node, v) => { if (v) node.setAttribute('data-chat-sent', v); else node.removeAttribute('data-chat-sent'); };

  /* ── (1) the preview + the text size ── */
  const c1 = card('c-settings-appearance__card--preview');
  const preview = document.createElement('div');
  preview.className = 'c-chat-canvas c-settings-appearance__preview';
  preview.setAttribute('aria-hidden', 'true');
  const chip = document.createElement('span');
  chip.className = 'c-settings-appearance__chip';
  chip.textContent = (strings.today || 'Today');
  const bubbleIn = document.createElement('div');
  bubbleIn.className = 'c-settings-appearance__bubble';
  bubbleIn.dataset.side = 'received';
  const who = document.createElement('span');
  who.className = 'c-settings-appearance__who';
  who.textContent = (strings.previewSender || 'Ana Kovač');
  const inText = document.createElement('span');
  inText.textContent = (strings.previewIncoming || 'Pattern, gradient, text size…');
  const inMeta = document.createElement('span');
  inMeta.className = 'c-settings-appearance__meta';
  inMeta.textContent = '13:27';
  bubbleIn.append(who, inText, inMeta);
  const bubbleOut = document.createElement('div');
  bubbleOut.className = 'c-settings-appearance__bubble';
  bubbleOut.dataset.side = 'sent';
  const outText = document.createElement('span');
  outText.textContent = (strings.previewOutgoing || '…exactly how your chats will look.');
  const outMeta = document.createElement('span');
  outMeta.className = 'c-settings-appearance__meta';
  outMeta.append('13:42', icon('checks', { size: 14 }));
  bubbleOut.append(outText, outMeta);
  /* ★ S17 C (Damir 19:45 "on desktop make the preview mimic a bigger vertical chat canvas"): two more messages, shown only
     in the tall desktop preview (settings-screens.css), so the left column reads as a real conversation */
  const mkBubble = (side, text, time, ticks) => {
    const b = document.createElement('div');
    b.className = 'c-settings-appearance__bubble c-settings-appearance__bubble--more';
    b.dataset.side = side;
    const t = document.createElement('span');
    t.textContent = text;
    const m = document.createElement('span');
    m.className = 'c-settings-appearance__meta';
    m.append(time);
    if (ticks) m.append(icon('checks', { size: 14 }));
    b.append(t, m);
    return b;
  };
  const moreOut = mkBubble('sent', (strings.previewOutgoing2 || 'Trying a new look.'), '13:31', true);
  const moreIn = mkBubble('received', (strings.previewIncoming2 || 'Looks great!'), '13:35', false);
  preview.append(chip, bubbleIn, moreOut, moreIn, bubbleOut);

  const sizeRow = document.createElement('div');
  sizeRow.className = 'c-settings-appearance__slider c-settings-appearance__size';
  const sizeId = 'c-settings-size-label';
  const sizeSmall = document.createElement('span');
  sizeSmall.className = 'c-settings-appearance__a c-settings-appearance__a--s';
  sizeSmall.setAttribute('aria-hidden', 'true');
  sizeSmall.textContent = 'A';
  const sizeRange = document.createElement('input');
  sizeRange.type = 'range';
  sizeRange.className = 'c-settings-appearance__range';
  sizeRange.min = String(TEXT_SIZE_PX.min); sizeRange.max = String(TEXT_SIZE_PX.max); sizeRange.step = '1';
  sizeRange.value = String(sizePx);
  sizeRange.setAttribute('aria-labelledby', sizeId);
  const sizeLarge = document.createElement('span');
  sizeLarge.className = 'c-settings-appearance__a c-settings-appearance__a--l';
  sizeLarge.setAttribute('aria-hidden', 'true');
  sizeLarge.textContent = 'A';
  const sizeVal = document.createElement('output');
  sizeVal.className = 'c-settings-appearance__val';
  sizeRow.append(sizeSmall, sizeRange, sizeLarge, sizeVal);
  c1.append(label((strings.textSize || 'Message text size'), sizeId), preview, sizeRow);

  /* ── (2) the canvas: a row of mini chats ── */
  let groundSec = null;
  let dots = null;
  if (groundsHere.length > 1) {
    groundSec = card('c-settings-appearance__groundsec');
    const labId = 'c-settings-ground-label';
    const row = document.createElement('div');
    row.className = 'c-settings-appearance__ground';
    dots = document.createElement('div');
    dots.className = 'c-settings-appearance__dots';
    dots.setAttribute('role', 'radiogroup');
    dots.setAttribute('aria-labelledby', labId);
    radioArrows(dots);   // ★ #1035: a radio group — arrows move AND select, Home/End, wrap, RTL mirrored (the shared helper)
    for (const o of groundsHere) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'c-settings-appearance__dot';
      b.dataset.value = o.id;
      b.setAttribute('role', 'radio');
      const name = (strings[o.key] || o.label);
      b.setAttribute('aria-label', name);
      const face = document.createElement('span');
      face.className = 'c-chat-canvas c-settings-appearance__dot-face';
      face.setAttribute('aria-hidden', 'true');
      face.setAttribute('data-chat-ground', o.id);
      const r = document.createElement('i'); r.className = 'c-settings-appearance__mini c-settings-appearance__mini--r';
      const sb = document.createElement('i'); sb.className = 'c-settings-appearance__mini c-settings-appearance__mini--s';
      const r2 = document.createElement('i'); r2.className = 'c-settings-appearance__mini c-settings-appearance__mini--r2';
      const ok = document.createElement('span'); ok.className = 'c-settings-appearance__ok'; ok.append(icon('check', { size: 14 }));
      const cap = document.createElement('span');
      cap.className = 'c-settings-appearance__dot-name';   // the render: the name is a pill INSIDE the tile, at its foot
      cap.setAttribute('aria-hidden', 'true');
      cap.textContent = name;
      face.append(r, sb, r2, ok, cap);
      b.append(face);
      b.addEventListener('click', () => {
        if (groundCurrent === o.id && groundStored === o.id) return;
        groundCurrent = o.id;
        groundStored = o.id;
        if (onChatGround) onChatGround(o.id);
        /* ★ S17 C (Damir, interview): a canvas pick resets the bubble colour to Auto — the canvas shows its OWN sent colour */
        if (colourCurrent !== 'auto') { colourCurrent = 'auto'; if (onSentColour) onSentColour('auto'); }
        paint();
      });
      dots.append(b);
    }
    row.append(dots);
    groundSec.append(label((strings.chatGround || 'Canvas'), labId), row);
  }

  /* ── (3) background + bubble colour + corners ── */
  const c3 = card('c-settings-appearance__card--bubbles');
  const bgOpts = [
    { id: 'none', label: (strings.patternNone || 'None'), off: true },
    ...styleOpts.map((o) => ({ id: o.id, label: (strings[o.key] || o.label) })),
  ];
  const bgValue = () => (levelCurrent > 0 ? styleCurrent : 'none');
  const styleGroup = styleSwatchGroup({
    options: bgOpts,
    current: bgValue(),
    ariaLabel: (strings.patternStyle || 'Background'),
    onPick: (id) => {
      if (id === 'none') {   // ★ Session M (#774): None writes the LEVEL only; the style survives
        levelCurrent = 0;
        if (onPattern) onPattern(0);
        paint();
        return;
      }
      styleCurrent = id;
      if (levelCurrent === 0) { levelCurrent = 1; if (onPattern) onPattern(1); }
      if (onPatternStyle) onPatternStyle(id);
      paint();
    },
  });
  const colours = document.createElement('div');
  colours.className = 'c-settings-appearance__colours';
  colours.setAttribute('role', 'radiogroup');
  const colLab = 'c-settings-colour-label';
  colours.setAttribute('aria-labelledby', colLab);
  for (const o of BUBBLE_COLOURS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-settings-appearance__colour';
    b.dataset.value = o.id;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', (strings[o.key] || o.label));
    const face = document.createElement('span');
    face.className = 'c-settings-appearance__colour-face';
    face.setAttribute('aria-hidden', 'true');
    if (o.id === 'auto') { face.dataset.auto = ''; face.textContent = 'A'; }
    b.append(face);
    b.addEventListener('click', () => {
      if (colourCurrent === o.id) return;
      colourCurrent = o.id;
      if (onSentColour) onSentColour(o.id);
      paint();
    });
    colours.append(b);
  }
  radioArrows(colours);   // the same radio keyboard as the canvas row (#46 r2 NIT-10: the shared helper)
  const cornersRow = document.createElement('div');
  cornersRow.className = 'c-settings-appearance__slider c-settings-appearance__corners';
  const cornersId = 'c-settings-corners-label';
  const cnS = document.createElement('span'); cnS.className = 'c-settings-appearance__cn c-settings-appearance__cn--s'; cnS.setAttribute('aria-hidden', 'true');
  const cornersRange = document.createElement('input');
  cornersRange.type = 'range';
  cornersRange.className = 'c-settings-appearance__range';
  cornersRange.min = String(BUBBLE_CORNERS.min); cornersRange.max = String(BUBBLE_CORNERS.max); cornersRange.step = '1';
  cornersRange.value = String(cornersCurrent);
  cornersRange.setAttribute('aria-labelledby', cornersId);
  const cnL = document.createElement('span'); cnL.className = 'c-settings-appearance__cn c-settings-appearance__cn--l'; cnL.setAttribute('aria-hidden', 'true');
  const cornersVal = document.createElement('output');
  cornersVal.className = 'c-settings-appearance__val';
  cornersRow.append(cnS, cornersRange, cnL, cornersVal);
  c3.append(label((strings.patternStyle || 'Background')), styleGroup,
    label((strings.bubbleColour || 'Bubble colour'), colLab), colours,
    label((strings.bubbleCorners || 'Bubble corners'), cornersId), cornersRow);

  /* ── (4) theme (only when the host can commit one) ── */
  let c4 = null;
  let themePick = null;
  if (onTheme) {
    c4 = card('c-settings-appearance__card--theme');
    const tId = 'c-settings-theme-label';
    /* ★ #1353 (Damir 12:57, picked A): THE theme picker — the same component as Account › Theme (createThemePicker,
       settings-shell.js): portrait mini chats, System on the diagonal, the rim + corner check. The commit is the hub's
       (onTheme → applyTheme + ixian:appearance), so a pick here and a pick in the sheet are one path. */
    themePick = createThemePicker({
      current: theme, strings, labelledBy: tId,
      commit: (v, ctrl) => { onTheme(v, ctrl); if (onTheme.length < 2) ctrl.done(); },   // a host that takes no ctrl = done at once (the old optimistic move)
    });
    c4.append(label((strings.theme || 'Theme'), tId), themePick);
  }

  /* ── (5) the chat list + tips ── */
  let c5 = null;
  let lineBtns = [];
  let linesCurrent = previewLines === '2' ? '2' : '1';
  if (onPreviewLines || onHints) {
    c5 = card('c-settings-appearance__card--list c-settings-appearance__previewsec');
    if (onPreviewLines) {
      const lId = 'c-settings-lines-label';
      const g = document.createElement('div');
      g.className = 'c-settings-appearance__lines c-settings-appearance__preview-lines';
      g.setAttribute('role', 'radiogroup');
      g.setAttribute('aria-labelledby', lId);
      lineBtns = [['1', strings.previewLinesOne || '1 line'], ['2', strings.previewLinesTwo || '2 lines']].map(([v, name]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'c-settings-appearance__line';
        b.dataset.value = v;
        b.setAttribute('role', 'radio');
        const list = document.createElement('span');
        list.className = 'c-settings-appearance__minilist';
        list.setAttribute('aria-hidden', 'true');
        for (let n = 0; n < 2; n++) {
          const it = document.createElement('span'); it.className = 'c-settings-appearance__minirow';
          const av = document.createElement('i'); av.className = 'c-settings-appearance__miniav';
          const tx = document.createElement('span'); tx.className = 'c-settings-appearance__minitx';
          const t0 = document.createElement('i'); t0.className = 'c-settings-appearance__minit'; tx.append(t0);
          for (let m = 0; m < Number(v); m++) { const l = document.createElement('i'); l.className = 'c-settings-appearance__minil'; tx.append(l); }
          it.append(av, tx); list.append(it);
        }
        const t = document.createElement('span');
        t.className = 'c-settings-appearance__line-name';
        t.textContent = name;
        b.append(list, t, pickMark());
        b.addEventListener('click', () => {
          if (linesCurrent === v) return;
          linesCurrent = v;
          paint();
          onPreviewLines(v);
        });
        g.append(b);
        return b;
      });
      radioArrows(g);   // #46 r1 M1
      c5.append(label((strings.chatPreviewLines || 'Message preview'), lId), g);
    }
    if (onHints) {
      const hintsSec = switchRow({
        glyph: 'info-circle', hue: 'accent',
        label: (strings.hintsSwitch || 'Tips on the Chats screen'),
        checked: hintsOn, onToggle: onHints,
      });
      hintsSec.dataset.pref = 'hintsOn';
      c5.append(hintsSec);
    }
  }

  /* ── paint: every visible state from the five values ── */
  function paint() {
    preview.setAttribute('data-chat-ground', groundCurrent);
    preview.dataset.chatPattern = styleCurrent;
    preview.style.setProperty('--chat-pattern-opacity', patternLevelVar(levelCurrent));
    preview.style.setProperty('--chat-text-scale', String(sizePx / TEXT_SIZE_PX.base));
    preview.style.setProperty('--bubble-radius', cornersCurrent + 'px');
    for (const n of ['--bubble-radius-group', '--bubble-radius-origin']) preview.style.setProperty(n, Math.max(2, Math.round(cornersCurrent * 0.22)) + 'px');   // ★ S17 C (#1334): 18 → 4, as the chat
    setSent(preview, colourCurrent !== 'auto' ? colourCurrent : '');
    sizeVal.textContent = String(sizePx);
    sizeRange.setAttribute('aria-valuetext', sizePx + ' px');
    sizeRange.style.setProperty('--p', ((sizePx - TEXT_SIZE_PX.min) / (TEXT_SIZE_PX.max - TEXT_SIZE_PX.min) * 100) + '%');
    cornersVal.textContent = String(cornersCurrent);
    cornersRange.setAttribute('aria-valuetext', cornersCurrent + ' px');
    cornersRange.style.setProperty('--p', ((cornersCurrent - BUBBLE_CORNERS.min) / (BUBBLE_CORNERS.max - BUBBLE_CORNERS.min) * 100) + '%');
    if (dots) {
      for (const b of dots.children) {
        const on = b.dataset.value === groundCurrent;
        b.setAttribute('aria-checked', String(on));
        b.tabIndex = on ? 0 : -1;
        const f = b.querySelector('.c-settings-appearance__dot-face');
        f.dataset.chatPattern = styleCurrent;
        f.style.setProperty('--chat-pattern-opacity', patternLevelVar(levelCurrent));   // a mini CHAT: the chat's own alpha, no swatch boost
        setSent(f, '');   // #46 r1 m1: a canvas tile shows ITS OWN colour (a canvas pick resets the bubble colour to Auto)
      }
    }
    /* the background tiles sit on the picked canvas */
    styleGroup.setAttribute('data-chat-ground', groundCurrent);
    setSent(styleGroup, tileSent());
    for (const b of styleGroup.children) b.setAttribute('aria-checked', String(b.dataset.value === bgValue()));
    /* the colour discs: each its own colour; Auto = the canvas's own */
    colours.setAttribute('data-chat-ground', groundCurrent);
    for (const b of colours.children) {
      const on = b.dataset.value === colourCurrent;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
      /* Auto = the canvas's OWN colour (its ground rule, through the group's data-chat-ground) — never the pick */
      setSent(b.firstElementChild, b.dataset.value === 'auto' ? '' : b.dataset.value);
    }
    for (const b of lineBtns) {
      const on = b.dataset.value === linesCurrent;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    }
  }

  sizeRange.addEventListener('input', () => { sizePx = clampInt(sizeRange.value, TEXT_SIZE_PX.min, TEXT_SIZE_PX.max, sizePx); paint(); });
  sizeRange.addEventListener('change', () => { if (onTextScale) onTextScale(Math.round((sizePx / TEXT_SIZE_PX.base) * 10000) / 10000); });
  cornersRange.addEventListener('input', () => { cornersCurrent = clampInt(cornersRange.value, BUBBLE_CORNERS.min, BUBBLE_CORNERS.max, cornersCurrent); paint(); });
  cornersRange.addEventListener('change', () => { if (onCorners) onCorners(cornersCurrent); });

  /* ── layout: the cards; desktop, wide = two columns (the preview card stays on the left) ── */
  const left = document.createElement('div');
  left.className = 'c-settings-appearance__col c-settings-appearance__col--a';
  left.append(c1);
  const right = document.createElement('div');
  right.className = 'c-settings-appearance__col c-settings-appearance__col--b';
  for (const c of [groundSec, c3, c4, c5]) if (c) right.append(c);
  body.append(left, right);
  let ro = null;
  if (isDesktop && typeof ResizeObserver === 'function') {
    ro = new ResizeObserver((ents) => {
      const w = ents[0] && ents[0].contentRect ? ents[0].contentRect.width : 0;
      body.toggleAttribute('data-cols', w >= 720);
    });
    ro.observe(body);
  }
  paint();
  /* the render opens the canvas row ON the picked canvas: once laid out, scroll it into view (a no-op when it is visible) */
  if (dots && typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      const on = dots.querySelector('[aria-checked="true"]');
      if (!on || !dots.clientWidth) return;
      const l = on.offsetLeft - dots.offsetLeft, r = l + on.offsetWidth;
      if (l < dots.scrollLeft || r > dots.scrollLeft + dots.clientWidth) dots.scrollLeft = Math.max(0, l - 18);
    });
  }

  /* #341 / #46: the shell's release hook — the swatch group's (static now) and the width observer */
  el.release = () => {
    if (styleGroup.releaseSwatches) styleGroup.releaseSwatches();
    if (ro) { ro.disconnect(); ro = null; }
  };
  return el;
}

/**
 * Privacy — the media-autoload switch, plus CAP-GATED toggles (read receipts /
 * typing indicators / ★ S8 #1234 hide online). Those rows render ONLY when the exe
 * flags the capability AND the shell passes the handler (verbs since S8).
 *
 * ★ THE MEDIA ROW IS FRONTEND-ONLY (security sweep, row E-1b). It writes
 * `spixi.media.autoload`, which the chat shell already read but which NOTHING in
 * the tree ever wrote — so the documented opt-out did not exist and the gate it
 * guards was permanently on. The shell owns the key (the chat-appearance
 * preferences work the same way), so this needs no verb and no C# change.
 * The two documents are different WebViews on ONE localStorage origin, and the
 * chat shell reads the key on every render — so a change here applies to each
 * conversation opened after it, not to a conversation already on screen.
 */
export function createPrivacy({
  readReceipts = true,
  typingIndicators = true,
  mediaAutoload = true,          // FE-only: spixi.media.autoload (the shell reads it per render)
  photoPreviews = true,          // ★ #1133 (A5 #1124): C#-held (SChatPrefs.photoPreviews), default ON
  hideOnline = false,            // ★ S8 (#1234): C#-held (SChatPrefs.hideOnline), default OFF
  capabilities = {},             // { readReceipts, typing, hideOnline }
  onBack,
  onReadReceipts,                // (next, ctrl) — ★ S8 (#1234): ixian:readReceipts:on|off, resolved by the echo
  onTyping,                      // (next, ctrl) — ★ S8 (#1234): ixian:typingIndicators:on|off, resolved by the echo
  onHideOnline,                  // (next, ctrl) — ★ S8 (#1234): ixian:hideOnline:on|off, resolved by the echo
  onMediaAutoload,               // (next, ctrl) — FE-only, writes localStorage
  onPhotoPreviews,               // (next, ctrl) — ★ #1133: ixian:photoPreviews:on|off, resolved by the echo
  photoAutoDl = 'off',           // ★ S11 C (#1262): C#-held (SAutoDownload) — 'off' (default) | 'wifi' | 'always'
  onPhotoAutoDl,                 // (value, ctrl) — ★ S11 C: ixian:photoAutoDl:<value>:<load pictures 0|1>, resolved by the echo
  host = document.body,          // ★ S11 C: the option sheet's host
  strings = getStrings(),
} = {}) {
  const { el, body, live } = screenShell('c-settings-privacy', strings.privacy || 'Privacy', onBack);

  if (onMediaAutoload) body.append(switchRow({
    // ★ S9 privacy icons = A (Damir): the row is about fetching from the sender's host. The disc keeps
    //   the colour it had (and that the picked render showed) — the glyph hash would repaint it.
    glyph: 'world-download', grad: discGrad('photo'), hue: 'info',
    label: strings.loadMedia || 'Load pictures and GIFs',
    // the sub says WHAT IT COSTS, because that is the whole reason the row exists
    sub: strings.loadMediaSub || 'Loading tells the sender’s host that you opened the chat',
    checked: mediaAutoload, live,
    failText: strings.privacyFailed || 'Couldn’t update. Try again.',
    onToggle: onMediaAutoload,
  }));

  /* ★ S11 C (#1262, Damir: Privacy, default OFF): "Download photos automatically" — Off · Wi-Fi only · Always, a value
     row (the Message-preview grammar: a stacked nav row → the house option sheet). The sub says the two limits. The
     handler exists only with the exe's cap (the W-g rule). data-pref + setAutoDl = the in-place echo (settings.html). */
  if (onPhotoAutoDl) {
    const autoOpts = [
      { value: 'off', label: strings.photoAutoDlOff || 'Off' },
      { value: 'wifi', label: strings.photoAutoDlWifi || 'Wi-Fi only' },
      { value: 'always', label: strings.photoAutoDlAlways || 'Always' },
    ];
    const autoTitle = strings.photoAutoDlTitle || 'Download photos automatically';
    let autoCur = (photoAutoDl === 'wifi' || photoAutoDl === 'always') ? photoAutoDl : 'off';
    const autoLabel = (v) => (autoOpts.find((o) => o.value === v) || autoOpts[0]).label;
    const sec = document.createElement('div');
    sec.className = 'c-settings__section';
    sec.dataset.pref = 'photoAutoDl';
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'c-settings__row c-settings-privacy__autodl';
    row.dataset.row = 'stacked';
    row.setAttribute('aria-haspopup', 'dialog');
    const lab = document.createElement('span');
    lab.className = 'c-settings__row-label c-settings__row-label--stack';
    const disc = document.createElement('span');
    disc.className = 'c-disc';
    disc.dataset.hue = 'info';
    disc.dataset.grad = String(discGrad('download'));
    disc.append(icon('download', { size: 16 }));
    const top = document.createElement('span');
    top.className = 'c-settings__row-top';
    top.append(disc, document.createTextNode(autoTitle));
    const sub = document.createElement('span');
    sub.className = 'c-settings__row-sub';
    sub.textContent = strings.photoAutoDlHint || 'Photos up to 10 MB, only while “Load pictures and GIFs” is on.';
    lab.append(top, sub);
    const val = document.createElement('span');
    val.className = 'c-settings__row-value';
    val.textContent = autoLabel(autoCur);
    row.append(lab, val, icon('chevron-right', { size: 18 }));
    const paintAuto = (v) => { autoCur = v; val.textContent = autoLabel(v); };
    row.addEventListener('click', () => settingsOptionSheet({
      title: autoTitle,
      options: autoOpts, current: autoCur, host, strings,
      commit: (v, ctrl) => {
        const wrapped = {
          done: () => { paintAuto(v); ctrl.done(); },
          fail: (msg) => { ctrl.fail(msg); if (live) live.textContent = strings.privacyFailed || 'Couldn’t update. Try again.'; },
        };
        try { onPhotoAutoDl(v, wrapped); } catch (ex) { wrapped.fail(); }
      },
    }));
    sec.setAutoDl = (v) => paintAuto((v === 'wifi' || v === 'always') ? v : 'off');
    sec.append(row);
    body.append(sec);
  }

  // ★ #1133: photo previews in chats (handler only with the exe's cap; data-pref = in-place echo)
  if (onPhotoPreviews) {
    const pv = switchRow({
      glyph: 'photo', grad: discGrad('eye'), hue: 'accent',   // ★ S9 privacy icons = A (was 'eye'; colour kept)
      label: strings.photoPreviewsTitle || 'Show photo previews in chats',
      sub: strings.photoPreviewsHint || 'Photos you sent or downloaded show as a picture in the chat. Off: every photo stays a file card.',
      checked: photoPreviews, live,
      failText: strings.privacyFailed || 'Couldn’t update. Try again.',
      onToggle: onPhotoPreviews,
    });
    pv.dataset.pref = 'photoPreviews';
    body.append(pv);
  }

  /* ★ S8 (#1234): the three C#-held privacy switches. Each sub says BOTH directions (the rule is reciprocal —
     Damir's pick), so the shared note that said "turning one off also hides theirs" is retired: it was false for
     hide-online (ON hides) and every row now says it itself. data-pref = the in-place echo (settings.html). */
  const privacyRow = (pref, opts) => {
    const r = switchRow({ ...opts, live, failText: strings.privacyFailed || 'Couldn’t update. Try again.' });
    r.dataset.pref = pref;
    /* ★ S8 r1 (#1234): the switch's name is the label only — its hint (the reciprocal rule) is its description */
    const hint = r.querySelector('.c-settings__row-sub');
    const sw = r.querySelector('[role="switch"]');
    if (hint && sw) {
      hint.id = 'c-privacy-hint-' + pref;
      sw.setAttribute('aria-describedby', hint.id);
    }
    body.append(r);
  };
  if (capabilities.readReceipts && onReadReceipts) privacyRow('readReceipts', {
    glyph: 'checks', hue: 'info',
    label: strings.readReceipts || 'Read receipts',
    sub: strings.readReceiptsHint || 'When off, others don’t see when you read their messages, and you don’t see when they read yours.',
    checked: readReceipts, onToggle: onReadReceipts,
  });
  if (capabilities.typing && onTyping) privacyRow('typingIndicators', {
    glyph: 'dots', hue: 'accent',
    label: strings.typingIndicators || 'Typing indicators',
    sub: strings.typingIndicatorsHint || 'When off, others don’t see when you type, and you don’t see when they type.',
    checked: typingIndicators, onToggle: onTyping,
  });
  if (capabilities.hideOnline && onHideOnline) privacyRow('hideOnline', {
    glyph: 'eye-off', hue: 'info',
    label: strings.hideOnlineTitle || 'Hide my online status',
    sub: strings.hideOnlineHint || 'When on, Spixi asks others’ apps to hide your online status and last seen, and you don’t see theirs. Older apps and the network can still see when you are online.',
    checked: hideOnline, onToggle: onHideOnline,
  });
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
  callRingtone = true,           // ★ E-W4 (#1118): matches the C# default (KEY_CALL_RINGTONE = true)
  isDesktop = typeof document === 'object' && document.documentElement.hasAttribute('data-desktop'),
  pushProvider = true,           // ★ P2 (#708): the third-party push opt-out; C# default TRUE
  platform = '',                 // 'android' | 'ios' | '' — the opt-out COSTS something different on each, and the row says which
  capabilities = {},             // { globalNotifications, pushProvider }
  onBack,
  onEnabled, onPreviews, onSounds,   // (next, ctrl) — §9
  onCallRingtone,                // (next, ctrl) — ★ E-W4: ixian:callRingtone:on|off
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
      glyph: 'volume', hue: 'accent',   // ★ Session H: Damir's export; the FAILED status glyph is alert-square-rounded since #1044 (chatlist-item) — one glyph, one meaning (#602)
      label: strings.notifSounds || 'In-app sounds',
      checked: sounds, live, failText, onToggle: onSounds,
    }));
    /* ★ E-W4 (#1114 (4), Damir: a "Call ringtone" on/off, default on, every platform). Off = an incoming call
       shows its card but makes no sound here. Its own glyph: phone-incoming is the call ring (bell = Allow
       notifications, volume = In-app sounds — one glyph, one meaning, #602). */
    if (onCallRingtone && capabilities.callRingtone) body.append(switchRow({
      glyph: 'phone-incoming', hue: 'success',
      label: strings.notifCallRingtone || 'Call ringtone',
      checked: callRingtone, live, failText, onToggle: onCallRingtone,
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
      /* ★ #1050 (Damir, PR.17 on the premium walk): OneSignal is its OWN card, with its note as a
         FOOTNOTE directly under that card — the grouped-list footer pattern. In the shared card
         the note sat under all four rows and read as a caption for the whole group; the note is
         about THIS switch only. Card 1 keeps the display rows (allow · sender · sounds). */
      const pushWrap = document.createElement('div');
      pushWrap.className = 'c-settings__groupwrap c-settings-notifs__push';
      const pushGroup = document.createElement('div');
      pushGroup.className = 'c-settings__group';
      pushWrap.append(pushGroup);
      screenBody.append(pushWrap);
      pushGroup.append(switchRow({
        glyph: 'cloud-bolt', hue: 'info',   // ★ Session H: a cloud that wakes the device. NOT 'world' (the Language row) and NOT 'topology-star' (the secure notice, Damir 2026-08-30) — one glyph, one meaning (#602). bell-ringing was exported too; 'bell' already means "Allow notifications" one row above, so a second bell would blur it
        label: strings.notifPushProvider || 'Instant delivery via OneSignal',
        /* ★ Session I (#735 §9, Damir: "the OneSignal sub-label is confusing"): the SUB is
           STATE-NEUTRAL now — it says what the switch DOES, in one sentence, on both
           platforms. #712's intent (sub = the cost of the off state) read as a
           contradiction under a switch that is ON ("Off: …"). The state-dependent
           explanation — the #712 claim boundaries: token + IP to OneSignal, the per-platform
           off cost, the record it keeps — lives in the NOTE below, which follows the switch.
           The two old per-platform sub keys retire (their locales are rebuilt). */
        /* ★ #1040 → #1041 (#46 r1, auditor C M5): NO sub. The first cut shortened it to "Uses
           OneSignal, a push provider." — which repeated the LABEL ("…via OneSignal") and, with the
           switch OFF, sat above "Off: nothing more is sent to OneSignal" as a contradiction (the
           #735 §9 class). The label says who; the note below the card says what happens, per state. */
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
      pushWrap.append(note);   // ★ #1050: the footnote of the OneSignal card, inside its wrap (under the card, never inside it)
      note.textContent = pushProvider
        ? (strings.notifPushProviderOn || 'On: OneSignal wakes this device the moment a message arrives. OneSignal receives a push token for this device and sees its IP address. It never sees your messages or your contacts.')
        : (platform === 'ios'
          ? (strings.notifPushProviderOffIos || 'Off: nothing more is sent to OneSignal and this device is unsubscribed there. New messages appear when you open Spixi. The record OneSignal already holds is not deleted by this switch.')
          : (strings.notifPushProviderOffAndroid || 'Off: nothing more is sent to OneSignal and this device is unsubscribed there. Spixi checks for new messages itself and notifies you when it finds some, so they can arrive a little later. The record OneSignal already holds is not deleted by this switch.'));
    }
  }
  if (!body.children.length) groupWrap.remove();   // ★ #1050: never an empty card (e.g. only the push row rendered)
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
