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

export const PATTERN_LEVELS = [        // --chat-pattern-opacity presets (0.5 = the #76 locked default)
  { value: 0, key: 'patternOff', label: 'Off' },
  { value: 0.3, key: 'patternSubtle', label: 'Subtle' },
  { value: 0.5, key: 'patternStandard', label: 'Standard' },
  { value: 0.7, key: 'patternBold', label: 'Bold' },
];
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
    face.style.setProperty('--chat-pattern-opacity', String(o.value));
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
  patternOpacity = 0.5,
  textScale = 1,
  onBack,
  onPattern,                     // (opacity) — shell sets --chat-pattern-opacity + persists
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
  bubbleIn.textContent = strings.previewIncoming || 'Pattern, gradient, text size —';
  const bubbleOut = document.createElement('div');
  bubbleOut.className = 'c-settings-appearance__bubble';
  bubbleOut.dataset.side = 'sent';
  bubbleOut.textContent = strings.previewOutgoing || '— exactly how your chats will look.';
  preview.append(bubbleIn, bubbleOut);
  body.append(preview);

  const patternSec = document.createElement('div');
  patternSec.className = 'c-settings__section';
  const pLab = document.createElement('h3');
  pLab.className = 'c-settings__label';
  pLab.textContent = strings.patternIntensity || 'Background pattern';
  // #334 iOS-60: swatch tiles, not text pills — the tile face IS the preview
  // mechanism (same .c-chat-canvas paint, per-level --chat-pattern-opacity)
  patternSec.append(pLab, swatchGroup({
    options: PATTERN_LEVELS.map((o) => ({ value: o.value, label: strings[o.key] || o.label })),
    current: patternOpacity,
    ariaLabel: strings.patternIntensity || 'Background pattern',
    onPick: (v) => { preview.style.setProperty('--chat-pattern-opacity', String(v)); if (onPattern) onPattern(v); },
  }));
  body.append(patternSec);

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
  body.append(sizeSec);

  // preview honors the incoming state
  preview.style.setProperty('--chat-pattern-opacity', String(patternOpacity));
  preview.style.setProperty('--chat-text-scale', String(textScale));
  return el;
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
    failText: strings.privacyFailed || 'Couldn’t update — try again.',
    onToggle: onReadReceipts,
  }));
  if (capabilities.typing && onTyping) body.append(switchRow({
    glyph: 'dots', hue: 'accent',
    label: strings.typingIndicators || 'Typing indicators',
    sub: strings.typingIndicatorsSub || 'Others see when you’re typing',
    checked: typingIndicators, live,
    failText: strings.privacyFailed || 'Couldn’t update — try again.',
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
  previews = true,
  sounds = true,
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
    if (onPreviews) body.append(switchRow({
      glyph: 'eye', hue: 'info',
      label: strings.notifPreviews || 'Show message previews',
      sub: strings.notifPreviewsSub || 'Off = sender and text hidden on the lock screen',
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
