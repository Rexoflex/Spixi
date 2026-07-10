/**
 * c-member — group member identity sheet (#99, Damir-approved round 8).
 * Opened by tapping a sender label or its avatar in group/bot chats: the
 * nickname is user-set and spoofable — the ADDRESS is the truth, so it shows
 * FULL and copyable, plus the contact-request path (normal/bot groups).
 * BLIND groups render the hidden-identity state instead (no address, no
 * request) — bridge must flag blindness per chat (BE question, #99).
 *
 * openMemberSheet({ host, member: { name, address, avatar }, blind = false,
 *                   relation = 'none' | 'pending' | 'contact',  // shell knows
 *                   onRequest,        // 'none' → "Send contact request"
 *                   onMessage,        // 'contact' → "Message" (open 1:1)
 *                   onPay, onRequestPayment, // 'contact' ONLY (round 10):
 *                                     // payment affordances stay behind the
 *                                     // contact relationship — pointing money
 *                                     // UI at unverified strangers = scam bait
 *                   onViewContact,    // 'contact': identity block tappable →
 *                                     // full contact page (shell nav)
 *                   strings }) → sheet
 * relation states (Damir sanity check): none → request button · pending →
 * "Request sent" badge (no button) · contact → "In your contacts" badge +
 * Message + Pay|Request row + tappable identity.
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createAvatar } from './avatar.js';
import { createButton } from './button.js';
import { createBadge } from './badge.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';

export function openMemberSheet({
  host,
  member = {},
  blind = false,
  relation = 'none',
  onRequest,
  onMessage,
  onPay,
  onRequestPayment,
  onViewContact,
  actions = [],     // #141 chat-info: capability-injected rows (admin kick/ban) —
                    // [{ label, glyph, destructive, onClick }]; the CALLER owns
                    // any confirm flow, the sheet just closes itself first
  strings = getStrings(),
} = {}) {
  const content = document.createElement('div');
  content.className = 'c-member';

  if (blind) {
    const med = document.createElement('span');
    med.className = 'c-member__blind-medallion';
    med.setAttribute('aria-hidden', 'true');
    med.append(icon('eye-off', { size: 22 }));
    const t = document.createElement('span');
    t.className = 'c-member__blind-title';
    t.textContent = strings.blindTitle || 'Identities are hidden in this group';
    const sub = document.createElement('span');
    sub.className = 'c-member__blind-sub';
    sub.textContent = strings.blindSub ||
      'Members of a blind group can’t be viewed or added to contacts.';
    content.append(med, t, sub);
  } else {
    // identity block — for CONTACTS it's a button → full contact page
    // (round 10; the page itself lands with the contacts shell)
    const canView = relation === 'contact' && !!onViewContact;
    const id = document.createElement(canView ? 'button' : 'div');
    id.className = 'c-member__id';
    if (canView) {
      id.type = 'button';
      id.addEventListener('click', () => { closeSheet(sheet); onViewContact(member); });
    }
    id.append(createAvatar({
      src: member.avatar, name: member.name, address: member.address, size: 48,
    }));
    const nameRow = document.createElement('span');
    nameRow.className = 'c-member__name';
    nameRow.textContent = member.name || member.address || '';
    // #249 loop C-1: mirror the member-row Owner/Admin badge in the sheet's
    // identity block (row and sheet must not disagree about who owns the group).
    if (member.owner || member.admin) {
      const roleBadge = createBadge({
        type: 'info', weight: 'tonal',
        label: member.owner ? (strings.owner || 'Owner') : (strings.admin || 'Admin'),
      });
      roleBadge.classList.add('c-member__role-badge');
      nameRow.append(roleBadge);
    }
    if (canView) {
      const chev = icon('chevron-right', { size: 18 });
      chev.classList.add('c-member__chevron');
      nameRow.append(chev); // affordance: identity leads somewhere
    }
    id.append(nameRow);
    content.append(id);

    if (member.address) {
      const label = document.createElement('span');
      label.className = 'c-member__addr-label';
      label.textContent = strings.ixianAddress || 'Ixian address';
      const addrRow = document.createElement('div');
      addrRow.className = 'c-member__addr';
      const addr = document.createElement('span');
      addr.className = 'c-member__addr-text u-tabular';
      addr.textContent = member.address;
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'c-member__copy';
      copy.setAttribute('aria-label', strings.copyAddress || 'Copy address');
      copy.append(icon('copy', { size: 18 }));
      copy.addEventListener('click', () => {
        if (navigator.clipboard) navigator.clipboard.writeText(member.address).catch(() => {});
        copy.textContent = '';
        copy.append(icon('check', { size: 18 })); // brief confirmation morph
        copy.setAttribute('aria-label', strings.copied || 'Copied'); // SRs hear the confirm too (freeze audit)
        setTimeout(() => {
          copy.textContent = '';
          copy.append(icon('copy', { size: 18 }));
          copy.setAttribute('aria-label', strings.copyAddress || 'Copy address');
        }, 1400);
      });
      addrRow.append(addr, copy);
      content.append(label, addrRow);
    }

    // relation-aware footer (Damir sanity check): never offer a request to
    // someone who's already a contact or already asked
    if (relation === 'contact') {
      const badge = createBadge({
        type: 'success', weight: 'tonal',
        label: strings.inContacts || 'In your contacts', icon: 'check',
      });
      badge.classList.add('c-member__relation');
      content.append(badge);
      if (onMessage) {
        const msg = createButton({
          label: strings.message || 'Message',
          type: 'fill', size: 44,
          icon: icon('messages', { size: 18 }),
          onClick: () => { closeSheet(sheet); onMessage(member); },
        });
        msg.dataset.width = 'full';
        msg.classList.add('c-member__request');
        content.append(msg);
      }
      // payment pair — CONTACTS ONLY (round 10 guard rail)
      if (onPay || onRequestPayment) {
        const payRow = document.createElement('div');
        payRow.className = 'c-member__payrow';
        if (onPay) payRow.append(createButton({
          label: strings.sendPayment || 'Pay', type: 'outline', size: 44,
          icon: icon('arrow-up-right', { size: 18 }),
          onClick: () => { closeSheet(sheet); onPay(member); },
        }));
        if (onRequestPayment) payRow.append(createButton({
          label: strings.requestPayment || 'Request', type: 'outline', size: 44,
          icon: icon('arrow-down-left', { size: 18 }),
          onClick: () => { closeSheet(sheet); onRequestPayment(member); },
        }));
        content.append(payRow);
      }
    } else if (relation === 'pending') {
      const badge = createBadge({
        type: 'info', weight: 'tonal',
        label: strings.requestSent || 'Request sent', icon: 'clock-hour-10',
      });
      badge.classList.add('c-member__relation');
      content.append(badge);
    } else if (onRequest) {
      const req = createButton({
        label: strings.sendContactRequest || 'Send contact request',
        type: 'fill', size: 44,
        icon: icon('heart-handshake', { size: 18 }),
        onClick: (e) => {
          // state-changing → latch (r2 guard family); shell/bridge confirms
          if (e.currentTarget.dataset.acted !== undefined) return;
          e.currentTarget.dataset.acted = '';
          e.currentTarget.disabled = true;
          closeSheet(sheet);
          onRequest(member);
        },
      });
      req.dataset.width = 'full';
      req.classList.add('c-member__request');
      content.append(req);
    }
  }

  // capability-injected actions (#141) — rendered LAST in both branches
  // (an admin can still act on a blind-group member; the model has the
  // address even when the UI hides it). Sheet closes BEFORE the callback so
  // a caller's confirm modal never stacks under the sheet scrim.
  if (actions.length) {
    const actRow = document.createElement('div');
    actRow.className = 'c-member__actions';
    let acted = false;   // one latch across the row (#141 audit m8): a double-
                         // click must not fire two actions once the sheet closes
    for (const a of actions) {
      actRow.append(createButton({
        label: a.label, type: 'outline', size: 44,
        intent: a.destructive ? 'destructive' : 'default',
        icon: a.glyph ? icon(a.glyph, { size: 18 }) : null,
        onClick: () => {
          if (acted) return;
          acted = true;
          closeSheet(sheet);
          if (a.onClick) a.onClick(member);
        },
      }));
    }
    content.append(actRow);
  }

  const sheet = createSheet({
    content, host, strings,
    title: '', // content carries the identity — a title would duplicate the name
  });
  sheet.setAttribute('aria-label', strings.memberDetails || 'Member details');
  openSheet(sheet);
  return sheet;
}
