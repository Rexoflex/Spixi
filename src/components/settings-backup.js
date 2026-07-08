/**
 * c-settings-backup — the Backup screen (docs/backup-ux-spec.md §3.2, built per
 * docs/settings-shell-spec.md §5, DECISIONS #146).
 *
 * ONE primary action: "Back up Spixi" = the full encrypted account backup
 * (identity + wallet + contacts + avatar — ixian:backupAccount is a strict
 * SUPERSET of the wallet backup). Wallet-only export is demoted to an Advanced
 * reveal (ixian:backupWallet — cold storage / other Ixian tools).
 *
 * CTA → fires the backup DIRECTLY (NO password prompt — DECISIONS #199 / be-cutover
 * S12): ixian:backupAccount ignores any entered password and encrypts with the stored
 * `walletpass` pref (bridge-audit-B §2), and the wallet-only export never prompted —
 * so the confirm modal was pure theater + inconsistent. Latched → loading → ctrl.done
 * morphs setSuccess "Backed up" (#29) and refreshes the status line (mirrors the
 * Advanced wallet export). Real password-protected backup = BE ask S12.
 *
 * Hero = token-styled PLACEHOLDER composition (#146④): shield-lock on a wash
 * disc + satellite motifs (identity/wallet/contacts). `.c-settings-backup__art`
 * is the swap slot for illustration #6 when the illustration language lands.
 *
 * State honesty (backup-ux-spec §5.4): "backed up" after ctrl.done is only as
 * true as the share-sheet ambiguity allows — the real state needs the §9
 * timestamp/completion asks; mocks stamp the date on done.
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { discGrad } from './disc.js';
import { createButton, setLoading, setSuccess } from './button.js';
import { createTopbar } from './topbar.js';
import { overlayId } from './overlay.js';           // advanced-reveal aria id only (password modal removed, #199)
import { backupStatusParts } from './settings-shell.js';

export function createSettingsBackup({
  status = {},                   // { last, dirtyCount } — same vocabulary as the hub row
  host,
  illustration = null,           // OPTIONAL art src (launch grammar: decorative alt="", img
                                 // error → the token-styled shield placeholder). Damir: images/backup.svg.
  onBack,
  onBackup,                      // ({}, ctrl) — ixian:backupAccount (no password arg, #199)
  onExportWallet,                // (ctrl) — ixian:backupWallet (Advanced)
  strings = getStrings(),
} = {}) {
  const el = document.createElement('div');
  el.className = 'c-settings-backup';
  el.append(createTopbar({ variant: 'view', title: strings.backupTitle || 'Backup', onBack }));

  const body = document.createElement('div');
  body.className = 'c-settings-backup__body u-scroll';
  el.append(body);

  const live = document.createElement('p');
  live.className = 'c-settings-backup__live';
  live.setAttribute('aria-live', 'polite');
  el.append(live);

  /* ——— hero: placeholder art + copy (illustration #6 swap slot) ——— */
  const heroSec = document.createElement('div');
  heroSec.className = 'c-settings-backup__hero';
  const art = document.createElement('div');
  art.className = 'c-settings-backup__art';
  art.setAttribute('aria-hidden', 'true');
  const buildPlaceholderArt = () => {          // token-styled fallback (shield + satellites)
    const disc = document.createElement('span');
    disc.className = 'c-settings-backup__art-disc';
    disc.append(icon('shield-lock', { size: 48 }));
    art.append(disc);
    for (const [glyph, pos] of [['user-circle', 'a'], ['wallet', 'b'], ['users', 'c']]) {
      const sat = document.createElement('span');
      sat.className = 'c-settings-backup__art-sat';
      sat.dataset.pos = pos;
      sat.append(icon(glyph, { size: 16 }));
      art.append(sat);
    }
  };
  if (illustration) {
    // launch/backup-nudge grammar: decorative img, fail-soft to the placeholder
    const img = document.createElement('img');
    img.className = 'c-settings-backup__illustration';
    img.src = illustration;
    img.alt = '';
    img.addEventListener('error', () => { art.replaceChildren(); buildPlaceholderArt(); }, { once: true });
    art.append(img);
  } else {
    buildPlaceholderArt();
  }
  heroSec.append(art);
  const heroTitle = document.createElement('h2');
  heroTitle.className = 'c-settings-backup__title';
  heroTitle.textContent = strings.backupHeroTitle || 'One file protects everything';
  const heroBody = document.createElement('p');
  heroBody.className = 'c-settings-backup__copy';
  heroBody.textContent = strings.backupHeroBody ||
    'Your identity, wallet and contacts — encrypted with your password into a single backup file.';
  heroSec.append(heroTitle, heroBody);

  /* status line — shared source with the hub row */
  const statusLine = document.createElement('p');
  statusLine.className = 'c-settings-backup__status';
  heroSec.append(statusLine);
  body.append(heroSec);

  /* ——— primary CTA → latched backup (NO password prompt, #199) ———
     lives ON the hero panel (#148③): promise → status → action, one moment.
     The password-confirm modal was REMOVED: ixian:backupAccount ignores any typed
     password + encrypts with the stored walletpass pref, and wallet-export never
     prompted, so the confirm step was theater + inconsistent. Fires directly here,
     mirroring the Advanced wallet export (latched → loading → optimistic success).
     No completion callback exists (C#→JS none) → ctrl.done is optimistic ("share
     sheet opened"). Real password-protected backup = BE ask S12. */
  let backingUp = false;                                 // latched (one share at a time)
  const cta = createButton({
    label: strings.backupCta || 'Back up now', type: 'fill', size: 56, width: 'full',
    onClick: runBackup,
  });
  cta.classList.add('c-settings-backup__cta');
  heroSec.append(cta);

  function runBackup() {
    if (backingUp) return;
    backingUp = true;
    setLoading(cta, true);
    const ctrl = backupCtrl(
      () => {
        backingUp = false;
        setLoading(cta, false);
        setSuccess(cta, { label: strings.backupDone || 'Backed up' });   // #29 morph
        live.textContent = strings.backupDone || 'Backed up';
      },
      (msg) => {
        backingUp = false;
        setLoading(cta, false);
        live.textContent = msg || strings.backupFailed || 'Couldn’t back up.';
      },
    );
    try {
      onBackup({}, ctrl);                                // 2-arg (payload, ctrl) contract preserved
    } catch (ex) {
      ctrl.fail();                                       // sync throw → unlatch + clear spinner (#141-m4)
    }
  }

  /* ——— what's inside — 2×2 disc tiles (#148③ premium pass) ——— */
  const inside = document.createElement('div');
  inside.className = 'c-settings-backup__inside';
  const insideTitle = document.createElement('h3');
  insideTitle.className = 'c-settings-backup__label';
  insideTitle.textContent = strings.backupInside || 'What’s inside';
  inside.append(insideTitle);
  const grid = document.createElement('div');
  grid.className = 'c-settings-backup__inside-grid';
  inside.append(grid);
  for (const [glyph, hue, titleKey, titleFb, subKey, subFb] of [
    ['user-circle', 'primary', 'backupInsideIdentity', 'Identity', 'backupInsideIdentitySub', 'Your account and its keys'],
    ['wallet', 'success', 'backupInsideWallet', 'Wallet', 'backupInsideWalletSub', 'Your funds stay yours'],
    ['users', 'info', 'backupInsideContacts', 'Contacts', 'backupInsideContactsSub', 'Everyone you’ve connected with'],
    ['photo', 'accent', 'backupInsideAvatar', 'Avatar', 'backupInsideAvatarSub', 'Your profile photo'],
  ]) {
    const tile = document.createElement('div');
    tile.className = 'c-settings-backup__inside-tile';
    const disc = document.createElement('span');
    disc.className = 'c-disc';
    disc.dataset.hue = hue;
    disc.dataset.grad = String(discGrad(glyph));
    disc.append(icon(glyph, { size: 16 }));
    const tt = document.createElement('span');
    tt.className = 'c-settings-backup__inside-title';
    tt.textContent = strings[titleKey] || titleFb;
    const ts = document.createElement('span');
    ts.className = 'c-settings-backup__inside-sub';
    ts.textContent = strings[subKey] || subFb;
    tile.append(disc, tt, ts);
    grid.append(tile);
  }
  body.append(inside);

  /* restore note — the honesty line (P2P: no server escrow) */
  const note = document.createElement('p');
  note.className = 'c-settings-backup__note';
  note.textContent = strings.backupRestoreNote ||
    'Restoring needs this file and your password. Spixi can’t recover either for you.';
  body.append(note);

  /* ——— Advanced reveal — wallet-only export (QR-reveal grammar) ——— */
  if (onExportWallet) {
    const adv = document.createElement('div');
    adv.className = 'c-settings-backup__advanced';
    const advRow = document.createElement('button');
    advRow.type = 'button';
    advRow.className = 'c-settings-backup__adv-toggle';
    advRow.setAttribute('aria-expanded', 'false');
    advRow.append(document.createTextNode(strings.advanced || 'Advanced'));
    const chev = icon('chevron-down', { size: 18 });
    chev.classList.add('c-settings-backup__adv-chevron');
    advRow.append(chev);
    const advBox = document.createElement('div');
    advBox.className = 'c-settings-backup__adv-box';
    advBox.setAttribute('aria-hidden', 'true');       // animated reveal (#147) — data-open drives it
    advBox.id = overlayId('c-settings-backup-adv');
    advRow.setAttribute('aria-controls', advBox.id);
    const advNote = document.createElement('p');
    advNote.className = 'c-settings-backup__adv-note';
    advNote.textContent = strings.backupAdvancedNote ||
      'The raw wallet file — for cold storage or other Ixian tools. Doesn’t include contacts or your account.';
    let exporting = false;                                       // latched (one share at a time)
    const exportBtn = createButton({
      label: strings.backupAdvanced || 'Export wallet file only', type: 'outline', size: 44, width: 'full',
      onClick: () => {
        if (exporting) return;
        exporting = true;
        setLoading(exportBtn, true);
        const ctrl = backupCtrl(
          () => {
            exporting = false;
            setLoading(exportBtn, false);
            setSuccess(exportBtn, { label: strings.backupShared || 'Shared' });
          },
          (msg) => {
            exporting = false;
            setLoading(exportBtn, false);
            live.textContent = msg || strings.backupExportFailed || 'Couldn’t export the wallet file.';
          },
        );
        try {
          onExportWallet(ctrl);
        } catch (ex) {
          ctrl.fail();                       // sync throw → unlatch + clear spinner (#141-m4)
        }
      },
    });
    advBox.append(advNote, exportBtn);
    advRow.addEventListener('click', () => {
      const open = advBox.dataset.open === undefined;
      if (open) advBox.dataset.open = '';
      else delete advBox.dataset.open;
      advBox.setAttribute('aria-hidden', String(!open));
      advRow.setAttribute('aria-expanded', String(open));
    });
    adv.append(advRow, advBox);
    body.append(adv);
  }

  el._statusBits = { statusLine, strings };                      // setBackupScreenStatus hook
  setBackupScreenStatus(el, status);
  return el;
}

/* free fn (#44): the screen's status line — same vocabulary as the hub row */
export function setBackupScreenStatus(el, status = {}) {
  const bits = el._statusBits;
  if (!bits) return;
  bits.statusLine.textContent = backupStatusParts(status, bits.strings).text;
}

/* one-shot ctrl (#138 m1) — module-local (chat-info owns `ctrlFor`) */
function backupCtrl(onDone, onFail) {
  let used = false;
  return {
    done: () => { if (used) return; used = true; onDone(); },
    fail: (msg) => { if (used) return; used = true; onFail(msg); },
  };
}
