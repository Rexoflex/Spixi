/**
 * c-rating-nudge — the "are you enjoying Spixi?" prompt (backup-nudge sibling).
 *
 * Legacy grounding (HomePage.xaml.cs:1438 checkForRating + index.html
 * #ratingModal): C# fires the `showRatingPrompt` command while
 * Preferences("rating_action") == "show" — i.e. it RE-PROMPTS until answered;
 * answering either way marks it "done" (HomePage.xaml.cs:348). Yes → store
 * review URL (per-platform, Config.cs:50–51) · No → support email — the
 * negative path deflects into support instead of a store review. Verbs
 * `ixian:rating:yes` / `ixian:rating:no` are EXISTING audited Home verbs
 * (HomePage.xaml.cs:325) — bridge stays frozen. All of that C# logic is
 * UNCHANGED; at integration `showRatingPrompt` maps to showRatingNudge().
 *
 * showRatingNudge({ host, illustration, onRate, onDismiss, strings }) → the
 *   sheet element (already opened). "Yes, I am loving it" (fill) → onRate('yes')
 *   + close · "Not so much…" (outline) → onRate('no') + close — ONE latch across
 *   both. Scrim/Esc → plain dismiss, NO verb (C# re-prompts later — legacy
 *   parity; a sheet's light-dismiss IS the "not now" the legacy modal never had).
 * illustration = optional img src (backup-nudge grammar: decorative alt="",
 *   error → falls back to the brand-mark disc). N14a: shells point it at the
 *   rate-me art (images/onboarding/rate.png) — upgrade by FILE DROP.
 * Copy defaults = the legacy en-us lang block (rating-request-*), overridable
 * via strings.rating* (SL channel at i18n).
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createButton } from './button.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';

export function showRatingNudge({ host, illustration = '', onRate, onDismiss, strings = getStrings() } = {}) {
  const content = document.createElement('div');
  content.className = 'c-rating-nudge';

  const disc = document.createElement('div');
  disc.className = 'c-rating-nudge__disc';
  disc.setAttribute('aria-hidden', 'true');
  disc.append(icon('logo'));                     // the brand mark asks (legacy spixirounded.svg)

  let art = null;                                // N14a — the rate-me illustration leads; disc = fallback
  if (illustration) {
    art = document.createElement('img');
    art.className = 'c-rating-nudge__illo';
    art.src = illustration;
    art.alt = '';                                // decorative — the copy carries meaning
    art.draggable = false;
    disc.hidden = true;
    art.addEventListener('error', () => { art.remove(); disc.hidden = false; }, { once: true });
  }

  const title = document.createElement('h3');
  title.className = 'c-rating-nudge__title t-heading-xs';
  title.textContent = strings.ratingTitle || 'Are you enjoying Spixi?';

  const body = document.createElement('p');
  body.className = 'c-rating-nudge__body t-body-sm';
  body.textContent = strings.ratingBody || 'Your feedback helps us make it better.';

  let used = false;                              // ONE latch across both answers
  const answer = (a) => {
    if (used) return;
    used = true;
    closeSheet(sheet);
    try { if (onRate) onRate(a); } catch { /* host emits ixian:rating:<a> */ }
  };

  const yes = createButton({ label: strings.ratingYes || 'Yes, I am loving it', size: 56, width: 'full' });
  yes.addEventListener('click', () => answer('yes'));

  const no = createButton({ label: strings.ratingNo || 'Not so much…', type: 'outline', size: 56, width: 'full' });
  no.addEventListener('click', () => answer('no'));

  if (art) content.append(art);
  content.append(disc, title, body, yes, no);

  const sheet = createSheet({ content, host, onDismiss, strings });
  sheet.classList.add('c-rating-nudge__sheet');
  // self-labelling content (no c-sheet title row — nudge-family look)
  sheet.setAttribute('aria-label', strings.ratingTitle || 'Are you enjoying Spixi?');
  openSheet(sheet);
  return sheet;
}
