/**
 * App ⋮ overflow menu (spec §2.1). Tapping an app's ⋮ opens a c-sheet (reusing the
 * c-msgmenu styling, same infra as chats-row-menu): App details · Uninstall (confirm
 * via c-modal). Launch is the row's primary tap now, so it's not repeated here.
 * onAction(action, app) — 'details' | 'uninstall'.
 *
 * NB: uninstalling from the list menu assumes the bridge accepts uninstall-by-id from
 * the apps list (today `ixian:uninstall` is details-page-scoped) — flagged for BE (§8).
 *
 * openAppMenu({ app, host, onAction, strings }) → sheet
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';
import { createModal, openModal } from './modal.js';

export function openAppMenu({ app = {}, host, onAction, allowInvite = false, strings = getStrings() } = {}) {
  const content = document.createElement('div');
  content.className = 'c-msgmenu';
  const list = document.createElement('div');
  list.className = 'c-msgmenu__list';

  const act = (action) => { closeSheet(sheet); if (onAction) onAction(action, app); };
  const item = (glyph, label, onClick, destructive = false) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-msgmenu__item';
    if (destructive) b.dataset.destructive = '';
    b.append(icon(glyph, { size: 20 }), document.createTextNode(label));
    b.addEventListener('click', onClick);
    list.append(b);
  };

  /* A9 (#302) — multi-user launch for a DUAL-capability app (one declaring both
     singleUser and multiUser in its manifest, MiniApp.cs:181-211).
     Legacy asked with a modal on EVERY tap (index.html:251-269); the redesign
     dropped the choice and forced solo (home.html:1503-1507). Neither is right:
     solo relaunch is the repeated action so a per-tap modal taxes it, but the
     invite path shouldn't vanish either. Primary tap stays solo; the choice lives
     here, in the menu that already exists for secondary actions. The details page
     gets an explicit second button instead (apps-details.js).
     Only DUAL apps get this row — a multi-only app already launches multi on tap,
     and a single-only app has nothing to invite to. Flag names follow the home
     shell's model (addApp → isSingleUser/isMultiUser, home.html:2103-2104). */
  if (app.isMultiUser && app.isSingleUser && allowInvite) {
    item('user-plus', strings.launchInvite || 'Invite a contact', () => act('invite'));
  }
  item('info-circle', strings.appDetails || 'App details', () => act('details'));
  item('trash', strings.uninstall || 'Uninstall', () => {
    closeSheet(sheet);
    openModal(createModal({
      title: strings.uninstallTitle || 'Uninstall app?',
      body: (strings.uninstallBody || 'This removes {name} from your device.')
        .split('{name}').join(app.name || strings.thisApp || 'this app'),
      role: 'alertdialog', host,
      actions: [
        { label: strings.cancel || 'Cancel', type: 'text', autofocus: true },
        { label: strings.uninstall || 'Uninstall', type: 'fill', intent: 'destructive', onClick: () => { if (onAction) onAction('uninstall', app); } },
      ],
    }));
  }, true);

  content.append(list);
  const sheet = createSheet({ content, host, strings });
  openSheet(sheet);
  return sheet;
}
