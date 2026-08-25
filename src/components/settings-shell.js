/**
 * c-settings — Account hub + danger screen (docs/settings-shell-spec.md,
 * DECISIONS #146 build · #147 premium round).
 *
 * #147 (Damir, reference-driven): identity hero CENTERED + QR-FORWARD (P2P —
 * "add me" is THE account action: avatar/name, QR card immediately visible,
 * full address chip under it, no reveal step) · rows carry TINTED ICON DISCS
 * (--disc-* token pairs; error hue reserved for destructive) · hub groups sit
 * on CARD surfaces (--surface-card) · theme picker = VISUAL PREVIEW TILES
 * (fixed --preview-* paints; System splits diagonally) · danger screen split:
 * quiet "free up space" rows vs heavy account/wallet cards.
 *
 * Commit grammar (#146): PER-ROW, no Save button. nickname/avatar → immediate
 * ixian:save:<nick> (side-effect persists lang/lock — already committed
 * per-row); theme/language ride their legacy immediate commands
 * (ixian:appearance:<int> — automatic=0/light=1/dark=2, ThemeManager.cs:9 —
 * and ixian:language:<code>). Lock OFF is PENDING, not optimistic (C# LockPage
 * auth → setLockEnabled("False")).
 *
 * Sub-screens (chat appearance / privacy / notifications / security level)
 * live in settings-screens.js — the hub only navs to them, capability-gated.
 *
 * Async callbacks use the house (payload, ctrl) contract, one-shot (#138 m1).
 * Icon stand-ins (#146 gaps): language 'at' (world pending), lock
 * 'square-asterisk' (lock pending).
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { discGrad } from './disc.js';
import { createAvatar } from './avatar.js';
import { createButton, setLoading } from './button.js';
import { createTopbar } from './topbar.js';
import { createBadge } from './badge.js';
// ★ Batch E (d) (#557): createQrSvg + overlayId left with the inline QR reveal —
// the hub renders no code of its own now; openAddressSheet owns the surface
import { createModal, openModal } from './modal.js';
import { setOverlayOpts, dismissOverlay } from './overlay.js';
import { openAddressSheet } from './wallet-receive.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';

export const THEME_OPTIONS = [           // legacy enum ThemeAppearance (ThemeManager.cs:9)
  { value: 0, key: 'themeSystem', label: 'System' },
  { value: 1, key: 'themeLight', label: 'Light' },
  { value: 2, key: 'themeDark', label: 'Dark' },
];

// one-shot ctrl (#138 m1) — named uniquely: chat-info owns `ctrlFor` at module scope
function settingsCtrl(onDone, onFail) {
  let used = false;
  return {
    done: (payload) => { if (used) return; used = true; onDone(payload); },
    fail: (msg) => { if (used) return; used = true; onFail(msg); },
  };
}

function settingsLabel(text) {
  const l = document.createElement('h3');
  l.className = 'c-settings__label';
  l.textContent = text;
  return l;
}

/* tinted icon disc (#147) — data-hue rides the --disc-* token pairs */
function settingsDisc(glyph, hue) {
  const d = document.createElement('span');
  d.className = 'c-disc';
  d.dataset.hue = hue;
  d.dataset.grad = String(discGrad(glyph));
  d.append(icon(glyph, { size: 16 }));
  return d;
}

/* backup row/screen share one status vocabulary (backup-ux-spec §3.1/§4):
   { last: string|null (pre-formatted date label), dirtyCount: number } */
export function backupStatusParts(status = {}, strings = getStrings()) {
  const { last = null, dirtyCount = 0 } = status;
  if (!last) {
    return {
      text: strings.backupStatusNever || 'Not backed up yet',
      badgeType: 'warning', badgeLabel: strings.backupActionNeeded || 'Action needed',
    };
  }
  if (dirtyCount > 0) {
    return {
      text: (strings.backupStatusDirty || '{n} new contacts since last backup')
        .split('{n}').join(String(dirtyCount)),
      badgeType: 'info', badgeLabel: strings.backupUpdate || 'Update',
    };
  }
  return {
    text: (strings.backupStatusDate || 'Backed up · {date}').split('{date}').join(last),
    badgeType: null, badgeLabel: '',
  };
}

/* shared radio option sheet (language & friends) — sd-sheet grammar (#142):
   commit-per-pick, latched; spinner in the fixed status slot (#145③).
   EXPORTED: the launch welcome reuses it for its language pill (one picker
   grammar app-wide — launch premium rework, Damir 2026-07-06). */
export function settingsOptionSheet({ title, hint, options, current, host, strings = getStrings(), commit, onPicked, inline = false }) {
  const wrap = document.createElement('div');
  wrap.className = 'c-settings__opts';
  // #148⑥: long pickers (language) — in the SHEET the list scrolls inside a
  // TALLER capped sheet (56vh/480px). #274: INLINE (pane detail screen) that
  // sheet cap CLIPPED the list mid-column with an invisible-until-hover thumb
  // (Damir F5: languages cut off) — inline, the pickerScreen body
  // (.c-settings__body.u-scroll) owns the scrolling, so the list just flows.
  if (!inline && options.length > 6) wrap.classList.add('c-settings__opts--scroll', 'u-scroll');
  wrap.setAttribute('role', 'radiogroup');
  wrap.setAttribute('aria-label', title);
  if (hint) {
    const h = document.createElement('p');
    h.className = 'c-settings__opts-hint';
    h.textContent = hint;
    wrap.append(h);
  }
  let inFlight = false;
  // #242 inline mode (pane detail screen): the list stays mounted after a pick,
  // so the check has to MOVE — track the option nodes and repaint on commit.
  const optEls = new Map();
  const paintChecks = () => {
    for (const [v, el] of optEls) el.setAttribute('aria-checked', String(v === current));
  };
  for (const o of options) {
    const opt = document.createElement('button');
    opt.type = 'button';
    opt.className = 'c-settings__opt';
    opt.setAttribute('role', 'radio');
    opt.setAttribute('aria-checked', String(o.value === current));
    if (o.flag) {                              // #148⑥: leading flag slot (emoji now; SVG assets can swap in)
      const fl = document.createElement('span');
      fl.className = 'c-settings__opt-flag';
      fl.setAttribute('aria-hidden', 'true');
      fl.textContent = o.flag;
      opt.append(fl);
    }
    const lab = document.createElement('span');
    lab.className = 'c-settings__opt-label';
    lab.textContent = o.label;
    const status = document.createElement('span');
    status.className = 'c-settings__opt-status';
    const tick = icon('check', { size: 18 });
    tick.classList.add('c-settings__opt-check');
    status.append(tick);
    opt.append(lab, status);
    opt.addEventListener('click', () => {
      if (inFlight || o.value === current) return;
      inFlight = true;
      opt.dataset.loading = '';
      opt.setAttribute('aria-busy', 'true');
      const spinner = document.createElement('span');
      spinner.className = 'c-button__spinner';
      spinner.setAttribute('aria-hidden', 'true');
      status.append(spinner);
      const ctrl = settingsCtrl(
        () => {
          if (inline) {
            // #242: no sheet to close — release the latch, move the check
            // (the theme-tiles stay-open grammar) and report.
            inFlight = false;
            opt.removeAttribute('aria-busy');
            delete opt.dataset.loading;
            spinner.remove();
            current = o.value;
            paintChecks();
          } else {
            closeSheet(sheet);
          }
          if (onPicked) onPicked(o);
        },
        (msg) => {
          inFlight = false;
          opt.removeAttribute('aria-busy');
          delete opt.dataset.loading;
          spinner.remove();
          if (onPicked) onPicked(null, msg);
        },
      );
      try {
        commit(o.value, ctrl);
      } catch (ex) {
        ctrl.fail();                          // sync throw → clear spinner/latch (#141-m4)
      }
    });
    optEls.set(o.value, opt);
    wrap.append(opt);
  }
  if (inline) return wrap;                    // #242: a pane detail screen hosts the list
  const sheet = createSheet({ content: wrap, host, title, strings });
  openSheet(sheet);
  return sheet;
}

/* theme sheet (#147): VISUAL PREVIEW TILES — light/dark painted with the FIXED
   --preview-* pairs (a preview must show its own mode regardless of the active
   theme; the --surface-qr precedent), System = diagonal split. Same latch +
   commit-per-pick contract as the option sheet.
   EXPORTED: the launch welcome reuses it for its appearance control (preview
   tiles keep the pick visible on the pinned-dark welcome — launch premium
   rework, Damir 2026-07-06). */
export function settingsThemeSheet({ current, host, strings = getStrings(), commit, onPicked, inline = false }) {
  const wrap = document.createElement('div');
  wrap.className = 'c-settings__themes';
  wrap.setAttribute('role', 'radiogroup');
  wrap.setAttribute('aria-label', strings.theme || 'Theme');
  let inFlight = false;
  const tilesByValue = new Map();
  // #148②: the sheet STAYS OPEN after a pick — trying themes must not cost a
  // reopen per try (Damir). The check moves live; the user dismisses when done.
  const paint = () => {
    for (const [v, t] of tilesByValue) t.setAttribute('aria-checked', String(v === current));
  };
  for (const o of THEME_OPTIONS) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'c-settings__theme';
    tile.setAttribute('role', 'radio');
    tile.dataset.mode = ['system', 'light', 'dark'][o.value];
    tile.setAttribute('aria-checked', String(o.value === current));
    const art = document.createElement('span');
    art.className = 'c-settings__theme-art';
    art.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i++) {                 // mini screen: bar + two lines
      const line = document.createElement('span');
      line.className = 'c-settings__theme-line';
      art.append(line);
    }
    const lab = document.createElement('span');
    lab.className = 'c-settings__theme-label';
    lab.textContent = strings[o.key] || o.label;
    const status = document.createElement('span');
    status.className = 'c-settings__opt-status';
    const tick = icon('check', { size: 18 });
    tick.classList.add('c-settings__opt-check');
    status.append(tick);
    const foot = document.createElement('span');
    foot.className = 'c-settings__theme-foot';
    foot.append(lab, status);
    tile.append(art, foot);
    tile.addEventListener('click', () => {
      if (inFlight || o.value === current) return;
      inFlight = true;
      tile.dataset.loading = '';
      tile.setAttribute('aria-busy', 'true');
      const spinner = document.createElement('span');
      spinner.className = 'c-button__spinner';
      spinner.setAttribute('aria-hidden', 'true');
      status.append(spinner);
      const settle = () => {
        inFlight = false;
        tile.removeAttribute('aria-busy');
        delete tile.dataset.loading;
        spinner.remove();
      };
      const ctrl = settingsCtrl(
        () => {
          settle();
          current = o.value;
          paint();                             // sheet stays open (#148②) — keep trying
          if (onPicked) onPicked(o);
        },
        (msg) => {
          settle();
          if (onPicked) onPicked(null, msg);
        },
      );
      try {
        commit(o.value, ctrl);
      } catch (ex) {
        ctrl.fail();                           // sync throw → settle spinner/latch (#141-m4)
      }
    });
    tilesByValue.set(o.value, tile);
    wrap.append(tile);
  }
  if (inline) return wrap;                    // #242: pane detail screen hosts the tiles (already stay-open)
  const sheet = createSheet({ content: wrap, host, title: strings.theme || 'Theme', strings });
  openSheet(sheet);
  return sheet;
}

export function createSettingsHub({
  name = '',                     // account nickname (legacy setNickname push)
  address = '',                  // own address — identity truth
  avatarSrc = null,              // custom avatar path (legacy loadAvatar push)
  hasCustomAvatar = false,       // legacy showRemoveAvatar flag
  theme = 0,                     // ThemeAppearance index
  languages = [],                // [{ code, label }] — §9 ask: list source
  language = '',                 // current code
  lockEnabled = false,
  paymentAuth = false,           // #150⑤: confirm-payments preference (§9-gated)
  backup = {},                   // { last, dirtyCount } — see backupStatusParts
  version = '',                  // About row value (§9 ask: no bridge push exists)
  capabilities = {},             // { dev, downloads, contributors, changePassword, globalNotifications, securityTiers, readReceipts, typing, paymentAuth }
  host,
  onNickname,                    // (nick, ctrl) — shell fires ixian:save:<nick>
  onShare,                       // ({ address }) — NO legacy share command (§9, wallet-receive precedent); shell can navigator.share
  onAddressInfo,                 // #443: ⓘ beside copy/share — explains what the address IS
  onContacts,                    // ★ N42 (#443): open the contacts directory from Account
  onAvatarChange,                // (ctrl) — ixian:avatar picker; ctrl.done({ src })
  onAvatarRemove,                // (ctrl) — ixian:remove
  onTheme,                       // (index, ctrl) — ixian:appearance:<int>
  onLanguage,                    // (code, ctrl) — ixian:language:<code>
  onThemeNav,                    // (#242) optional — return true to TAKE the Theme row tap
                                 // (pane master-detail: detail screen instead of the sheet)
  onLanguageNav,                 // (#242) same for the Language row
  onLock,                        // (next, ctrl) — ON optimistic; OFF pending (auth)
  onPaymentAuth,                 // (next, ctrl) — #150⑤ §9; same ON/OFF asymmetry as lock
  onChangePassword,              // nav → change-encryption-password takeover (lock shell, ixian:encpass nav — bridge-audit-A:258)
  onChatAppearance,              // nav → chat-appearance screen (FE-only, #147)
  onNotifications,               // nav → notifications screen (§9-gated)
  onSecurity,                    // nav → security-level screen (§9-gated, #147 tiers)
  onPrivacy,                     // nav → privacy screen (§9-gated)
  onBackup,                      // nav → backup screen
  onDownloads, onContributors, onDev,   // nav (screens) — capability-gated: no SettingsPage open-verb exists
  onAbout,                       // nav → About takeover (static, zero-C#, ungated)
  onHowTo,                       // nav → How-to-use takeover (static, zero-C#, ungated)
  onDanger,                      // nav → danger screen
  onSave,                        // OPTIONAL explicit Save affordance (Damir, legacy parity): a topbar
                                 // check action → the shell commits everything + pops (ixian:save).
                                 // Absent = the #146 per-row / on-exit commit only (backward-compatible).
  onBack,                        // OPTIONAL back affordance — the hub is a root tab in
                                 // the home-integrated design (no back), but a STANDALONE
                                 // pushed page (legacy SettingsPage) needs one, esp. on
                                 // desktop where there's no hardware back. Absent = no
                                 // back button (root-tab behavior preserved).
  strings = getStrings(),
} = {}) {
  const el = document.createElement('div');
  el.className = 'c-settings';

  const topbar = createTopbar({
    // #320 (Damir F5 of #315): NO onBack = the hub is a PEER TAB (iOS-46) — its
    // topbar must read exactly like the other tabs' ROOT bars (bold action ink,
    // 16px inline padding, no view hairline; heading-sm is shared per #58).
    // 'view' stays for a legacy standalone-pushed presentation that supplies onBack.
    variant: onBack ? 'view' : 'root', title: strings.account || 'Account', onBack,
    // Save button (Damir, legacy parity): the #146 model commits per-row / on-exit
    // with NO Save button — this OPTIONAL trailing action adds an explicit commit
    // (the shell fires ixian:save → persist nick/lang/lock/avatar + pop). Topbar
    // actions are icon-buttons, so it's a `check` glyph with a labeled aria-name.
    actions: onSave ? [{ icon: 'check', label: strings.save || 'Save', onClick: () => onSave() }] : [],
  });
  el.append(topbar);
  // Tag the Save action so setSettingsSaveVisible can address it structurally
  // (Damir F5 r2: Save shows only while there are unsaved changes).
  const saveAct = topbar.querySelector('.c-topbar__actions button');
  if (saveAct) saveAct.dataset.save = '';

  // Save-without-pop confirmation (S14, gated OFF today): the shell calls this after
  // an ixian:apply — morph the topbar check to a brief "Saved" state + announce it.
  el.showSaved = () => {
    live.textContent = strings.saved || 'Saved';
    const act = topbar.querySelector('.c-topbar__actions button');
    if (act) {
      act.setAttribute('data-saved', '');
      act.setAttribute('aria-label', strings.saved || 'Saved');
    }
    clearTimeout(el._savedTimer);
    el._savedTimer = setTimeout(() => {
      if (act) { act.removeAttribute('data-saved'); act.setAttribute('aria-label', strings.save || 'Save'); }
      live.textContent = '';
    }, 1600);
  };

  const body = document.createElement('div');
  body.className = 'c-settings__body u-scroll';
  el.append(body);

  const live = document.createElement('p');
  live.className = 'c-settings__live';
  live.setAttribute('aria-live', 'polite');
  el.append(live);

  const hostFor = () => host || el.closest('.demo-phone') || undefined;

  /* ——— identity hero: CENTERED, QR-FORWARD (#147) ——— */
  const hero = document.createElement('div');
  hero.className = 'c-settings__hero';

  const avatarBtn = document.createElement('button');
  avatarBtn.type = 'button';
  avatarBtn.className = 'c-settings__avatar';
  avatarBtn.setAttribute('aria-label', strings.changePhoto || 'Change photo');
  let avatarEl = createAvatar({ src: avatarSrc, name, address, size: 80 });
  avatarBtn.append(avatarEl);
  const avatarEditDot = document.createElement('span');
  avatarEditDot.className = 'c-settings__avatar-edit';
  avatarEditDot.setAttribute('aria-hidden', 'true');
  avatarEditDot.append(icon('pencil', { size: 12 }));
  avatarBtn.append(avatarEditDot);
  const renderAvatar = () => {
    const next = createAvatar({ src: avatarSrc, name, address, size: 80 });
    avatarEl.replaceWith(next);
    avatarEl = next;
  };

  if (onAvatarChange || onAvatarRemove) {
    avatarBtn.addEventListener('click', () => {
      const wrap = document.createElement('div');
      wrap.className = 'c-settings__avatar-sheet';
      let inFlight = false;
      const option = (label, glyph, destructive, run) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'c-settings__avatar-option';
        if (destructive) b.dataset.destructive = '';
        b.append(icon(glyph, { size: 20 }), document.createTextNode(label));
        b.addEventListener('click', () => {
          if (inFlight) return;
          inFlight = true;
          b.setAttribute('aria-busy', 'true');
          const ctrl = settingsCtrl(
            (payload) => {
              if (payload && 'src' in payload) { avatarSrc = payload.src; hasCustomAvatar = !!payload.src; }
              else { avatarSrc = null; hasCustomAvatar = false; }
              renderAvatar();
              closeSheet(sheet);
            },
            (msg) => {
              inFlight = false;
              b.removeAttribute('aria-busy');
              live.textContent = msg || strings.avatarFailed || 'Couldn’t update the photo.';
            },
          );
          try {
            run(ctrl);
          } catch (ex) {
            ctrl.fail();                       // sync throw → unlatch + inline error (#141-m4)
          }
        });
        wrap.append(b);
      };
      if (onAvatarChange) option(strings.choosePhoto || 'Choose photo', 'photo', false, onAvatarChange);
      // remove only when a CUSTOM avatar exists (legacy showRemoveAvatar honesty)
      if (onAvatarRemove && hasCustomAvatar) option(strings.removePhoto || 'Remove photo', 'trash', true, onAvatarRemove);
      const sheet = createSheet({
        content: wrap, host: hostFor(),
        title: strings.profilePhoto || 'Profile photo', strings,
      });
      openSheet(sheet);
    });
  } else {
    avatarBtn.disabled = true;
  }
  hero.append(avatarBtn);

  const nameRow = document.createElement('div');
  nameRow.className = 'c-settings__name-row';
  const nameEl = document.createElement('span');
  nameEl.className = 'c-settings__name';
  nameEl.textContent = name;
  nameRow.append(nameEl);
  hero.append(nameRow);

  /* nickname edit — chat-info grammar (#141-M1 committing latch); EMPTY nick =
     inline error, no commit (legacy validates non-empty via ixian:error) */
  if (onNickname) {
    const pencil = createButton({
      type: 'text', size: 44, icon: icon('pencil', { size: 18 }),
      onClick: startNickEdit,
    });
    pencil.classList.add('c-settings__nick-edit');
    pencil.setAttribute('aria-label', strings.editNickname || 'Edit nickname');
    nameRow.append(pencil);

    const nickErr = document.createElement('span');
    nickErr.className = 'c-settings__nick-error';
    nickErr.setAttribute('role', 'alert');
    nickErr.hidden = true;
    hero.append(nickErr);

    function startNickEdit() {
      if (nameRow.querySelector('.c-settings__nick-input')) return;
      nickErr.hidden = true;
      const input = document.createElement('input');
      input.className = 'c-settings__nick-input';
      input.type = 'text';
      input.value = name;
      input.setAttribute('aria-label', strings.nickname || 'Nickname');
      nameEl.hidden = true;
      pencil.hidden = true;
      nameRow.insertBefore(input, nameEl);
      input.focus();
      let closed = false;
      let committing = false;                 // #141-M1: Enter→disable→blur double-commit latch
      const closeEdit = () => {
        if (closed) return;
        closed = true;
        input.remove();
        nameEl.hidden = false;
        pencil.hidden = false;
      };
      const showErr = (msg) => {
        committing = false;
        input.disabled = false;
        nickErr.textContent = msg;
        nickErr.hidden = false;
        input.focus();
      };
      const commit = () => {
        if (closed || committing) return;
        const nick = input.value.trim();
        if (nick === name) { closeEdit(); return; }
        if (!nick) {                          // legacy: empty nickname is invalid
          showErr(strings.nicknameEmpty || 'Enter a nickname. It’s how contacts see you.');
          return;
        }
        committing = true;
        input.disabled = true;
        const ctrl = settingsCtrl(
          () => {
            name = nick;
            nameEl.textContent = name;
            closeEdit();
            pencil.focus();                   // #137 M3: never drop focus
          },
          (msg) => showErr(msg || strings.nicknameFailed || 'Couldn’t save the nickname.'),
        );
        try {
          onNickname(nick, ctrl);
        } catch (ex) {
          ctrl.fail();                        // sync throw → re-enable input + inline error (#141-m4)
        }
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        else if (e.key === 'Escape') {
          e.stopPropagation();
          if (committing) return;             // no escape hatch mid-flight
          closeEdit();
          pencil.focus();
        }
      });
      input.addEventListener('blur', commit);
    }
  }

  /* ★★ #575 (Damir, D13/F23) — THE ADDRESS LEAVES THE HERO.
   *
   * The hub carried THREE address affordances: the full base58 chip with copy and
   * share (#137/#148⑤), a "What is this address?" text action (#443/#453), and a
   * "Show QR" row (Batch E (d), #557). His spec collapses all of them into ONE row
   * in the section below, and he confirmed the chip retires with them.
   *
   * Nothing is lost. `openAddressSheet` — the ONE address surface (#527) — carries
   * the code, the full address, copy, Share and the explainer, and #575 puts copy
   * and Share side by side on its chip. The hub keeps the identity (avatar and
   * nickname) and nothing else, so the address is never at rest on the screen.
   *
   * ⚠ `onShare` and `onAddressInfo` are NOT retired from the options. onShare is
   * forwarded into the sheet below; onAddressInfo now has no consumer here, and the
   * shells keep passing it — see the row for why that is deliberate. */
  body.append(hero);

  /* ——— row builders (disc + label · value · chevron; #142 grammar) ——— */
  const settingRow = ({ glyph, hue, label, value = '', sub = '', badgeSlot = false, onClick, cls, key }) => {
    const section = document.createElement('div');
    section.className = 'c-settings__section';
    const row = document.createElement(onClick ? 'button' : 'div');
    if (onClick) row.type = 'button';
    row.className = 'c-settings__row' + (onClick ? '' : ' c-settings__row--static') + (cls ? ' ' + cls : '');
    if (key) row.dataset.settingKey = key;
    const lab = document.createElement('span');
    lab.className = 'c-settings__row-label' + (sub ? ' c-settings__row-label--stack' : '');
    if (sub) {
      const top = document.createElement('span');
      top.className = 'c-settings__row-top';
      top.append(settingsDisc(glyph, hue), document.createTextNode(label));
      const s = document.createElement('span');
      s.className = 'c-settings__row-sub';
      s.textContent = sub;
      lab.append(top, s);
    } else {
      lab.append(settingsDisc(glyph, hue), document.createTextNode(label));
    }
    row.append(lab);
    const val = document.createElement('span');
    val.className = 'c-settings__row-value';
    val.textContent = value;
    row.append(val);
    let badge = null;
    if (badgeSlot) {
      badge = document.createElement('span');
      badge.className = 'c-settings__backup-badge';
      row.append(badge);
    }
    if (onClick) {
      row.append(icon('chevron-right', { size: 18 }));
      row.addEventListener('click', onClick);
    }
    section.append(row);
    return { section, row, val, sub: lab.querySelector('.c-settings__row-sub'), badge };
  };

  const group = (labelText) => {
    const wrap = document.createElement('div');
    wrap.className = 'c-settings__groupwrap';
    if (labelText) wrap.append(settingsLabel(labelText));
    const card = document.createElement('div');
    card.className = 'c-settings__group';
    wrap.append(card);
    return { wrap, card };
  };

  /* app-lock / confirm-payments share ONE switch grammar (#146⑦/#150⑤):
     turning ON = optimistic + revert-on-fail; turning OFF = PENDING (stays
     checked + aria-busy until the LockPage auth round-trips — weakening a
     security setting must cost an auth). A SYNCHRONOUS throw in the shell
     callback routes to the fail path (#141-m4) so the switch never wedges. */
  const authSwitchRow = ({ glyph, hue, label, sub, checked, failMsg, onToggle }) => {
    const section = document.createElement('div');
    section.className = 'c-settings__section';
    const row = document.createElement('div');
    row.className = 'c-settings__row c-settings__row--static';
    const lab = document.createElement('span');
    lab.className = 'c-settings__row-label' + (sub ? ' c-settings__row-label--stack' : '');
    if (sub) {
      const top = document.createElement('span');
      top.className = 'c-settings__row-top';
      top.append(settingsDisc(glyph, hue), document.createTextNode(label));
      const s = document.createElement('span');
      s.className = 'c-settings__row-sub';
      s.textContent = sub;
      lab.append(top, s);
    } else {
      lab.append(settingsDisc(glyph, hue), document.createTextNode(label));
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
      let ctrl;
      if (next) {
        toggle.setAttribute('aria-checked', 'true');         // optimistic ON
        ctrl = settingsCtrl(
          () => { inFlight = false; },
          (msg) => {
            toggle.setAttribute('aria-checked', 'false');    // revert
            live.textContent = msg || failMsg;
            inFlight = false;
          },
        );
      } else {
        toggle.setAttribute('aria-busy', 'true');            // pending — auth decides
        ctrl = settingsCtrl(
          () => {
            toggle.removeAttribute('aria-busy');
            toggle.setAttribute('aria-checked', 'false');    // setLockEnabled("False") landed
            inFlight = false;
          },
          (msg) => {
            toggle.removeAttribute('aria-busy');             // auth canceled/failed → stays ON
            if (msg) live.textContent = msg;
            inFlight = false;
          },
        );
      }
      try {
        onToggle(next, ctrl);
      } catch (ex) {
        ctrl.fail();                                         // sync throw → revert/clear (#141-m4)
      }
    });
    row.append(lab, toggle);
    section.append(row);
    return section;
  };

  /* ——— ★ #575: the UNTITLED section — the two things that are about PEOPLE and
     ABOUT ME. It sits first, above "Preferences", and carries no label because
     neither row is a setting: one opens a list, one opens the address surface. ——— */
  const me = group();

  /* ★ N42 (#443, Damir): a way to REACH the contact list from Account. It was only
     ever reachable from the chats topbar, which is not where someone looks for "my
     people". Opt-in: a host that cannot route there passes no handler and no row
     appears. ★ #575 moved it out of "Preferences" into this section. */
  if (onContacts) me.card.append(settingRow({
    glyph: 'users', hue: 'info',
    label: strings.contacts || 'Contacts', key: 'contacts',
    sub: strings.contactsSub || 'See and manage everyone you have added',
    onClick: () => onContacts(),
  }).section);

  /* ★ #575: THE ONE ADDRESS ENTRY. It replaces the hero chip, the "Show QR" row and
     the "What is this address?" action — three affordances for one value.
     ⚠ The subtitle is the whole point of the row: it says what the address IS, which
     is the job #443 gave the retired text action. `onAddressInfo` is therefore not
     called any more, and it is left in the options on purpose — the shells still pass
     it, and a signature change would be a silent breakage for a host that has not
     been rebuilt. It is a no-op here, not a lie. */
  if (address) me.card.append(settingRow({
    glyph: 'qrcode', hue: 'accent',
    label: strings.spixiAddress || 'Spixi address', key: 'address',
    sub: strings.spixiAddressSub || 'This is your address. Tap to view.',
    onClick: () => {
      openAddressSheet({
        address, strings, host: hostFor(),
        onShare: onShare ? (p) => onShare({ address: p.address }) : undefined,
      });
    },
  }).section);

  if (me.card.childElementCount) body.append(me.wrap);

  /* ——— preferences ——— */
  const prefs = group(strings.preferences || 'Preferences');

  if (onTheme) {
    const themeLabelFor = (v) => {
      const o = THEME_OPTIONS.find((x) => x.value === v) || THEME_OPTIONS[0];
      return strings[o.key] || o.label;
    };
    const t = settingRow({
      glyph: 'adjustments-alt', hue: 'accent', label: strings.theme || 'Theme', key: 'theme',
      value: themeLabelFor(theme),
      onClick: () => { if (onThemeNav && onThemeNav()) return; settingsThemeSheet({
        current: theme, host: hostFor(), strings,
        commit: (v, ctrl) => onTheme(v, ctrl),
        onPicked: (o, msg) => {
          if (!o) { live.textContent = msg || strings.themeFailed || 'Couldn’t change the theme.'; return; }
          theme = o.value;
          t.val.textContent = strings[o.key] || o.label;
          live.textContent = (strings.theme || 'Theme') + ': ' + (strings[o.key] || o.label);
        },
      }); },
    });
    prefs.card.append(t.section);
  }

  if (onLanguage && languages.length) {
    const langLabelFor = (code) => (languages.find((l) => l.code === code) || {}).label || code;
    const lg = settingRow({
      glyph: 'world', hue: 'info',             // #146 icon gap resolved — 'world' exported
      label: strings.language || 'Language', key: 'language',
      value: langLabelFor(language),
      onClick: () => { if (onLanguageNav && onLanguageNav()) return; settingsOptionSheet({
        title: strings.language || 'Language',
        options: languages.map((l) => ({ value: l.code, label: l.label, flag: l.flag })),
        current: language, host: hostFor(), strings,
        commit: (code, ctrl) => onLanguage(code, ctrl),
        onPicked: (o, msg) => {
          if (!o) { live.textContent = msg || strings.languageFailed || 'Couldn’t change the language.'; return; }
          language = o.value;
          lg.val.textContent = o.label;
          live.textContent = (strings.language || 'Language') + ': ' + o.label;
        },
      }); },
    });
    prefs.card.append(lg.section);
  }

  if (onChatAppearance) prefs.card.append(settingRow({
    glyph: 'messages', hue: 'primary',
    label: strings.chatAppearance || 'Chat appearance', key: 'chatappearance',
    // I-11 (#371): subs on SOME rows only — where the label alone does not say
    // what is inside (15c A14: one line, truncates; write to the width).
    sub: strings.chatAppearanceSub || 'Background, opacity and text size',
    onClick: () => onChatAppearance(),
  }).section);

  if (capabilities.globalNotifications && onNotifications) prefs.card.append(settingRow({
    glyph: 'bell', hue: 'warning',
    label: strings.notifications || 'Notifications', key: 'notifications',
    onClick: () => onNotifications(),
  }).section);

  if (prefs.card.childElementCount) body.append(prefs.wrap);

  /* ——— security & privacy (lock · tiers · privacy · backup nudge) ——— */
  const sec = group(strings.securityPrivacy || 'Security & privacy');

  /* app lock — switch row (#146⑦). ON optimistic, OFF pending-auth. */
  if (onLock) sec.card.append(authSwitchRow({
    glyph: 'lock', hue: 'success',              // #146 icon gap resolved — 'lock' exported
    label: strings.appLock || 'App lock',
    sub: strings.appLockSub || 'Password check when Spixi opens',   // I-11 (#371)
    checked: lockEnabled,
    failMsg: strings.lockFailed || 'Couldn’t turn on the app lock.',
    onToggle: onLock,
  }));

  /* confirm payments (#150⑤, Damir): require PIN/biometric before a payment
     leaves the review step. §9-GATED (no bridge command; C# LockPage is the
     plausible plumbing). SECURITY.md note: the toggle is a PREFERENCE — the
     enforcement lives C#-side, shells still emit intent only. Lock-row
     asymmetry applies: ON optimistic, OFF = auth round-trip (weakening a
     security setting must cost an auth). Cascades from the #147 tiers. */
  if (capabilities.paymentAuth && onPaymentAuth) sec.card.append(authSwitchRow({
    glyph: 'wallet', hue: 'warning',
    label: strings.paymentAuth || 'Confirm payments',
    sub: strings.paymentAuthSub || 'PIN or biometrics before anything is sent',
    checked: paymentAuth,
    failMsg: strings.paymentAuthFailed || 'Couldn’t turn on payment confirmation.',
    onToggle: onPaymentAuth,
  }));

  /* Change Spixi password — the lock-shell encpass screen (Phase 1 #4, docs/lock-spec.md).
     Still CAPABILITY-GATED on `capabilities.changePassword`, but the capability is LIVE
     now: S7 landed in #283 (SettingsPage dispatches ixian:encpass → EncryptionPassword),
     and #341 added the in-pane sublevel route beside it. The gate now only hides the row
     on an old exe that pushes no caps. */
  // #341: `key` lets the pane mark this row as the current one (aria-current + the
  // tonal tint) while its sublevel is open, exactly like backup/downloads/theme/
  // language. Without it the row was the only sublevel opener that announced nothing.
  if (capabilities.changePassword && onChangePassword) sec.card.append(settingRow({
    glyph: 'pencil', hue: 'primary', key: 'encpass',
    label: strings.changePassword || 'Change Spixi password',
    onClick: () => onChangePassword(),
  }).section);

  if (capabilities.securityTiers && onSecurity) sec.card.append(settingRow({
    glyph: 'user-cog', hue: 'primary',
    label: strings.securityLevel || 'Security level',
    onClick: () => onSecurity(),
  }).section);

  if ((capabilities.readReceipts || capabilities.typing) && onPrivacy) sec.card.append(settingRow({
    glyph: 'eye-off', hue: 'info',
    label: strings.privacy || 'Privacy',
    onClick: () => onPrivacy(),
  }).section);

  /* backup row — the STANDING NUDGE (backup-ux-spec §3.1) */
  if (onBackup) {
    const b = settingRow({
      glyph: 'shield-lock', hue: 'success',
      label: strings.backup || 'Backup',
      sub: ' ', badgeSlot: true, cls: 'c-settings__row--backup', key: 'backup',
      onClick: () => onBackup(),
    });
    // the status line keeps its own identity — setBackupStatus/smoke/css hook
    // onto it (the #147 settingRow refactor silently dropped this class; smoke caught it)
    b.sub.classList.add('c-settings__backup-sub');
    sec.card.append(b.section);
    el._backupBits = { subEl: b.sub, badgeSlot: b.badge, strings };   // setBackupStatus hook
    setBackupStatus(el, backup);
  }

  if (sec.card.childElementCount) body.append(sec.wrap);

  /* ——— app ——— */
  const app = group(strings.app || 'App');
  /* How to use + About — STATIC in-hub takeovers, zero-C# (no bridge verb),
     always available (ungated). */
  if (onHowTo) app.card.append(settingRow({
    glyph: 'info-square-rounded', hue: 'info', label: strings.howToUse || 'How to use Spixi',
    key: 'howto',
    onClick: () => onHowTo(),
  }).section);
  if (onAbout) app.card.append(settingRow({
    glyph: 'info-circle', hue: 'neutral', label: strings.about || 'About', key: 'about',
    onClick: () => onAbout(),
  }).section);
  /* Downloads — CAPABILITY-GATED: HomePage-driven separate page, no SettingsPage
     open-verb (bridge-audit-B §6/§8). Built + ready, gated OFF until BE adds a
     SettingsPage nav verb (be-cutover S8). Contributors is STATIC (component data,
     no verb needed) — un-gated by the shell since #240 (S10 verb obsolete). */
  if (capabilities.downloads && onDownloads) app.card.append(settingRow({
    glyph: 'download', hue: 'info', label: strings.downloads || 'Downloads', key: 'downloads',
    sub: strings.downloadsSub || 'Files you received in chats',   // I-11 (#371)
    onClick: () => onDownloads(),
  }).section);
  if (capabilities.contributors && onContributors) app.card.append(settingRow({
    glyph: 'heart-handshake', hue: 'accent', label: strings.contributors || 'Contributors',
    key: 'contributors',
    onClick: () => onContributors(),
  }).section);
  if (capabilities.dev && onDev) app.card.append(settingRow({
    glyph: 'settings', hue: 'neutral', label: strings.developer || 'Developer', key: 'dev',
    onClick: () => onDev(),
  }).section);
  if (version) app.card.append(settingRow({
    glyph: 'info-circle', hue: 'neutral', label: strings.version || 'Version', value: version,
  }).section);
  if (app.card.childElementCount) body.append(app.wrap);

  /* ——— danger nav — ONE calm row (error disc reserved for exactly this) ——— */
  if (onDanger) {
    const dz = group();
    dz.card.append(settingRow({
      glyph: 'trash', hue: 'error', label: strings.deleteData || 'Delete data…',
      key: 'danger',
      onClick: () => onDanger(),
    }).section);
    body.append(dz.wrap);
  }

  return el;
}

/* free fn (#44): Save action visibility — Damir F5 r2: the topbar check shows
   ONLY while there are unsaved changes (nickname edit / picked avatar); a clean
   hub has no Save. The shell owns dirty-tracking and calls this on every flip.
   No-op when the hub was built without onSave. */
export function setSettingsSaveVisible(hub, visible) {
  const b = hub.querySelector('.c-topbar__actions button[data-save]');
  if (b) b.hidden = !visible;
}

/* free fn (#44): live backup-row state — the badge IS the standing nudge */
export function setBackupStatus(hub, status = {}) {
  const bits = hub._backupBits;
  if (!bits) return;
  const parts = backupStatusParts(status, bits.strings);
  bits.subEl.textContent = parts.text;
  bits.badgeSlot.replaceChildren();
  if (parts.badgeType) {
    bits.badgeSlot.append(createBadge({ type: parts.badgeType, weight: 'tonal', label: parts.badgeLabel }));
  }
}

/**
 * Danger screen (#147 tone split): "Free up space" = QUIET rows (history,
 * downloads — reversible-ish, device-local) · "Danger zone" = HEAVY bordered
 * cards (account data, wallet). Every action behind the house LOCKED
 * alertdialog confirm (#135-C1: Cancel autofocus, Esc/scrim/Cancel dead in
 * flight via live setOverlayOpts, confirm latched). The LockPage auth on
 * account/wallet is C#-SIDE — the FE confirm is deliberateness, not the
 * security boundary.
 */
/**
 * Shared LOCKED destructive confirm (#135-C1 + #150⑥) — the house alertdialog
 * for every account-shell delete: Cancel autofocus, Esc/scrim/Cancel dead in
 * flight (live setOverlayOpts), confirm latched, sync throw → fail path
 * (#141-m4), standing cannot-undo warning strip. Used by the danger screen
 * AND the downloads screen (slice 2) — exported so the contract lives once.
 */
export function settingsConfirm({ title, bodyText, confirmLabel, host, strings = getStrings(), run }) {
  let inFlight = false;
  const extra = document.createElement('div');
  // #150⑥ (Damir): EVERY account-shell delete confirm carries the standing
  // irreversibility warning as its own strip — not buried in body copy
  const warn = document.createElement('p');
  warn.className = 'c-settings-danger__confirm-warn';
  warn.append(icon('alert-square-rounded', { size: 18 }),
    document.createTextNode(strings.cannotUndo || 'This action cannot be undone.'));
  const err = document.createElement('p');
  err.className = 'c-settings-danger__confirm-error';
  err.setAttribute('role', 'alert');
  err.hidden = true;
  extra.append(warn, err);
  const modal = createModal({
    title, body: bodyText, content: extra, role: 'alertdialog', host,
    actions: [
      { label: strings.cancel || 'Cancel', type: 'text', autofocus: true,
        onClick: () => (inFlight ? false : undefined) },
      {
        label: confirmLabel, type: 'fill', intent: 'destructive',
        onClick: () => {
          if (inFlight) return false;
          inFlight = true;
          err.hidden = true;
          const btns = modal.querySelectorAll('.c-modal__actions .c-button');
          const confirmBtn = btns[btns.length - 1];
          setLoading(confirmBtn, true);
          setOverlayOpts(modal, { escDismiss: false, lightDismiss: false });
          const fail = (msg) => {
            inFlight = false;
            setLoading(confirmBtn, false);
            setOverlayOpts(modal, { escDismiss: true });
            err.textContent = msg || strings.actionFailed || 'Something went wrong. Try again.';
            err.hidden = false;
            confirmBtn.focus();
          };
          try {
            run(settingsCtrl(() => dismissOverlay(modal), fail));
          } catch (ex) {
            fail();
          }
          return false;                    // closes on ctrl.done only
        },
      },
    ],
    strings,
  });
  openModal(modal);
  return modal;
}

export function createSettingsDanger({
  host,
  onBack,
  onDeleteHistory,               // (ctrl) — ixian:deleteh (legacy UNGATED — §9 flag)
  onDeleteDownloads,             // (ctrl) — ixian:deleted
  onDeleteAccount,               // (ctrl) — ixian:deletea (C# LockPage gate)
  onDeleteWallet,                // (ctrl) — ixian:delete (C# LockPage gate → Launch)
  strings = getStrings(),
} = {}) {
  const el = document.createElement('div');
  el.className = 'c-settings-danger';
  el.append(createTopbar({ variant: 'view', title: strings.deleteData || 'Delete data…', onBack }));

  const body = document.createElement('div');
  body.className = 'c-settings-danger__body u-scroll';
  el.append(body);

  const hostFor = () => host || el.closest('.demo-phone') || undefined;

  const confirmAction = (opts) => settingsConfirm({ ...opts, host: hostFor(), strings });

  /* quiet tier — plain rows on a group card */
  const quietWrap = document.createElement('div');
  quietWrap.className = 'c-settings__groupwrap';
  quietWrap.append(settingsLabel(strings.freeUpSpace || 'Free up space'));
  const quiet = document.createElement('div');
  quiet.className = 'c-settings__group';
  quietWrap.append(quiet);
  const quietRow = (label, sub, buildOpts) => {
    const section = document.createElement('div');
    section.className = 'c-settings__section';
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'c-settings__row';
    const lab = document.createElement('span');
    lab.className = 'c-settings__row-label c-settings__row-label--stack';
    const top = document.createElement('span');
    top.className = 'c-settings__row-top';
    const disc = document.createElement('span');
    disc.className = 'c-disc';
    disc.dataset.hue = 'neutral';
    disc.dataset.grad = String(discGrad('trash'));
    disc.append(icon('trash', { size: 16 }));
    top.append(disc, document.createTextNode(label));
    const s = document.createElement('span');
    s.className = 'c-settings__row-sub';
    s.textContent = sub;
    lab.append(top, s);
    row.append(lab, icon('chevron-right', { size: 18 }));
    row.addEventListener('click', () => confirmAction(buildOpts()));
    section.append(row);
    quiet.append(section);
  };

  if (onDeleteHistory) quietRow(
    strings.deleteAllHistory || 'Delete all chat history',
    strings.deleteHistorySub || 'Messages go from this device. Contacts keep theirs.',
    () => ({
      title: strings.deleteAllHistoryTitle || 'Delete all chat history?',
      bodyText: strings.deleteAllHistoryBody || 'Every conversation is removed from this device.',
      confirmLabel: strings.deleteConfirm || 'Delete',
      run: (ctrl) => onDeleteHistory(ctrl),
    }),
  );
  if (onDeleteDownloads) quietRow(
    strings.deleteDownloads || 'Delete downloads',
    strings.deleteDownloadsSub || 'Files received in chats go from this device.',
    () => ({
      title: strings.deleteDownloadsTitle || 'Delete downloads?',
      bodyText: strings.deleteDownloadsBody || 'Received files are removed from this device. Senders keep theirs.',
      confirmLabel: strings.deleteConfirm || 'Delete',
      run: (ctrl) => onDeleteDownloads(ctrl),
    }),
  );
  if (quiet.childElementCount) body.append(quietWrap);

  /* heavy tier — bordered destructive cards */
  const heavyWrap = document.createElement('div');
  heavyWrap.className = 'c-settings__groupwrap';
  heavyWrap.append(settingsLabel(strings.dangerZone || 'Danger zone'));
  body.append(heavyWrap);
  const heavy = document.createElement('div');
  heavy.className = 'c-settings-danger__cards';
  heavyWrap.append(heavy);
  const card = (title, sub, buildOpts) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-settings-danger__card';
    const t = document.createElement('span');
    t.className = 'c-settings-danger__card-title';
    t.append(icon('trash', { size: 20 }), document.createTextNode(title));
    const s = document.createElement('span');
    s.className = 'c-settings-danger__card-sub';
    s.textContent = sub;
    b.append(t, s);
    b.addEventListener('click', () => confirmAction(buildOpts()));
    heavy.append(b);
  };

  /* ★ Batch C (#545, Damir #532): ONE destructive door. "Delete account" is the FULL
     wipe — wallet included — and lands on welcome; the separate "Delete wallet" card is
     GONE (redundant). The copy states the whole list and the one thing that matters:
     without the backup file AND the password nobody can recover it. onDeleteWallet is
     still accepted as an opt for older callers but renders nothing. */
  if (onDeleteAccount) card(
    strings.deleteAccount || 'Delete account',
    strings.deleteAccountSub || 'Removes everything from this device: wallet, contacts, chats, files and settings.',
    () => ({
      title: strings.deleteAccountTitle || 'Delete this account?',
      bodyText: strings.deleteAccountBody || 'Your wallet, contacts, chat history, files and settings are removed from this device. Without your backup file AND your password nobody can recover the account. Spixi asks you to confirm with your PIN, then shows the welcome screen.',
      confirmLabel: strings.deleteAccountConfirm || 'Delete account',
      run: (ctrl) => onDeleteAccount(ctrl),
    }),
  );

  return el;
}
