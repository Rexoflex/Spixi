/* ==== SESSION 8 (S2) — ★ S8 (#1235) DESKTOP LIGHT-DISMISS ACROSS PANES ====
 * On the BUILT home shell (index.html, jsdom), through the bundle's own overlay stack (W.Spixi):
 *   · DESKTOP (data-desktop): a window `blur` closes every quick menu that carries blurDismiss — the chats-row menu,
 *     the apps ⋯ menu, the attach popover, the shared-item menu, the member identity sheet — through the normal
 *     dismissOverlay path (onDismiss runs after the exit); a modal and an unflagged sheet stay open
 *   · a `visibilitychange` closes nothing
 *   · MOBILE (`?mobile=1`, no data-desktop): the same blur closes nothing
 * Deliberate breaks: see the S8 S2 hand-back. */
import { uiKit } from './ui-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = uiKit(h);
  const openAll = (W, d) => {
    const S = W.Spixi;
    const host = d.body;
    const m = {};
    m.row = S.openChatRowMenu({ chat: { address: 'Aaaa1111111111111111111111111111111111', name: 'Ana' }, host, capabilities: { pin: true } });
    m.app = S.openAppMenu({ app: { name: 'Notes', id: 'n1' }, host });
    m.attach = S.openAttachSheet({ host, files: true, payments: true });
    m.shared = S.openSharedItemMenu({ item: { kind: 'link', label: 'https://example.com/a', id: 'aa' }, host });
    m.member = S.openMemberSheet({ host, member: { name: 'Bor', address: 'Bbbb1111111111111111111111111111111111' } });
    m.modal = S.createModal({ title: 'Keep me', body: 'modal', host, actions: [{ label: 'OK', type: 'fill' }] });
    S.openModal(m.modal);
    m.plain = S.createSheet({ title: 'Plain', host });
    S.openSheet(m.plain);
    return m;
  };
  const QUICK = ['row', 'app', 'attach', 'shared', 'member'];
  try {
    /* desktop */
    const s = await boot('index.html');
    const { W, d } = s;
    const S = W.Spixi;
    const r = { desktop: d.documentElement.hasAttribute('data-desktop') };
    const m = openAll(W, d);
    r.allOpen = Object.values(m).every((el) => el && S.isOverlayOpen(el));
    d.dispatchEvent(new W.Event('visibilitychange'));
    r.visKeeps = Object.values(m).every((el) => S.isOverlayOpen(el));
    let dismissed = 0;
    const probe = S.createSheet({ title: 'probe', host: d.body, blurDismiss: true, onDismiss: () => { dismissed += 1; } });
    S.openSheet(probe);
    W.dispatchEvent(new W.Event('blur'));
    for (const k of QUICK) r['closed_' + k] = !S.isOverlayOpen(m[k]);
    r.modalStays = S.isOverlayOpen(m.modal);
    r.plainStays = S.isOverlayOpen(m.plain);
    await sleep(450);
    r.onDismissRan = dismissed === 1 && !probe.isConnected;
    ok(r.desktop && r.allOpen, '★ S8 #1235 overlay: desktop home — every quick menu, a modal and a plain sheet open on the stack');
    for (const k of QUICK) ok(r['closed_' + k], '★ S8 #1235 overlay: desktop window blur closes the ' + k + ' menu (blurDismiss)');
    ok(r.modalStays && r.plainStays, '★ S8 #1235 overlay: desktop window blur leaves a modal and an unflagged sheet open');
    ok(r.onDismissRan, '★ S8 #1235 overlay: the blur close runs the normal dismiss path (onDismiss once, node removed after the exit)');
    ok(r.visKeeps, '★ S8 #1235 overlay: visibilitychange closes nothing');
    for (let i = 0; i < 4; i++) { try { if (!S.dismissTopOverlay()) break; } catch (e) { break; } }
    s.dom.window.close();

    /* mobile */
    const t = await boot('index.html', { mobile: true });
    const T = t.W.Spixi;
    const mm = openAll(t.W, t.d);
    t.W.dispatchEvent(new t.W.Event('blur'));
    const rm = { mobile: !t.d.documentElement.hasAttribute('data-desktop'), keeps: QUICK.every((k) => T.isOverlayOpen(mm[k])) };
    ok(rm.mobile && rm.keeps, '★ S8 #1235 overlay: mobile (no data-desktop) — a window blur closes no quick menu ' + JSON.stringify(rm));
    t.dom.window.close();
  } catch (e) {
    ok(false, '★ S8 #1235 overlay: pin threw — ' + (e && e.stack || e));
  }
}
