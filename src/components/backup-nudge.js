/**
 * c-backup-nudge — the periodic "don't forget to back up" prompt.
 *
 * Legacy parity (Damir 2026-07-06 — supersedes backup-ux-spec §2.2 "not
 * periodic"): legacy HomePage.updateScreen → displayBackupReminder() shows the
 * index.html #backup-prompt slide-up at most once per Config.backupReminder
 * (30 days), tracked C#-side in Preferences("backupReminderTimestamp").
 * That C# cadence is UNCHANGED — the FE owns NO timer and NO storage. At
 * integration, the legacy C#→JS command toggleAnimatedSlider('backup-prompt')
 * maps to showBackupNudge() (#56 grammar: sliders → c-sheet on the host).
 *
 * showBackupNudge({ host, illustration, onBackup, onDismiss, strings }) →
 *   the sheet element (already opened). "Back up now" → onBackup() + close —
 *   the host emits ixian:backup (audited legacy Home verb; bridge stays
 *   frozen). "Not now" / scrim / Esc → plain dismiss (onDismiss). CTA is
 *   one-shot latched.
 * illustration = optional img src (launch-shell grammar: decorative alt="",
 *   error → falls back to the tonal shield disc). Point it at the shared
 *   backup art (illustrations-plan #6, the SAME file the launch tail uses) —
 *   the nudge upgrades by FILE DROP, no component edit.
 * Copy defaults = the legacy en-us lang block (index-backup-prompt-*),
 * overridable via strings.backupNudge* (ships via the SL channel at i18n).
 */
import { icon } from './icons.js';
import { createButton } from './button.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';

export function showBackupNudge({ host, illustration = '', onBackup, onDismiss, strings = {} } = {}) {
  const content = document.createElement('div');
  content.className = 'c-backup-nudge';

  const disc = document.createElement('div');
  disc.className = 'c-backup-nudge__disc';
  disc.setAttribute('aria-hidden', 'true');
  disc.append(icon('shield-lock'));

  let art = null;
  if (illustration) {
    art = document.createElement('img');
    art.className = 'c-backup-nudge__illo';
    art.src = illustration;
    art.alt = '';                                // decorative — the copy carries meaning
    art.draggable = false;
    disc.hidden = true;                          // art leads; disc is the fallback
    art.addEventListener('error', () => { art.remove(); disc.hidden = false; }, { once: true });
  }

  const title = document.createElement('h3');
  title.className = 'c-backup-nudge__title t-heading-xs';
  title.textContent = strings.backupNudgeTitle || 'Don’t forget to back up';

  const body = document.createElement('p');
  body.className = 'c-backup-nudge__body t-body-sm';
  body.textContent = strings.backupNudgeBody
    || 'Spixi is fully decentralized — your data stays on your device only. '
    + 'To keep your contacts safe and restore everything later, create a backup now.';

  let used = false;                              // one-shot: CTA rides the latch
  const cta = createButton({ label: strings.backupNudgeCta || 'Back up now', size: 56, width: 'full' });
  cta.addEventListener('click', () => {
    if (used) return;
    used = true;
    closeSheet(sheet);
    try { if (onBackup) onBackup(); } catch { /* host emits ixian:backup */ }
  });

  const skip = createButton({ label: strings.backupNudgeSkip || 'Not now', type: 'text', size: 56, width: 'full' });
  skip.addEventListener('click', () => closeSheet(sheet));

  const note = document.createElement('p');
  note.className = 'c-backup-nudge__note t-body-xs';
  note.textContent = strings.backupNudgeNote
    || 'It’s recommended to back up every time you add a new contact.';

  if (art) content.append(art);
  content.append(disc, title, body, cta, skip, note);

  const sheet = createSheet({ content, host, onDismiss, strings });
  sheet.classList.add('c-backup-nudge__sheet');
  // the content is self-labelling (no c-sheet title row — legacy prompt look)
  sheet.setAttribute('aria-label', strings.backupNudgeTitle || 'Don’t forget to back up');
  openSheet(sheet);
  return sheet;
}
