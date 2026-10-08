/* ==== S11 F (#1262) — the Apps tab pre-push, the SHELL half (BUILT index.html in jsdom, the pins-s10 d-kit boot).
 * Damir: "I have a feeling it loads when I open mini apps." C# now sends the installed list ~2 s after boot while the user
 * is on another tab (pins-s11/f-wiring.mjs). That only removes the wait if the shell BUILDS the rows while the Apps view is
 * hidden and the first visit reuses them:
 *   · a clearApps → addApp×N → clearAppsDone burst on the Chats tab renders N rows into the HIDDEN #apps-view (no
 *     ixian:tab:tab3 needed, the Chats view stays the visible one, no empty state)
 *   · the first Apps tab tap shows those SAME row elements at once (no re-build, no new push needed) and tells C#
 *     ixian:tab:tab3 (C# finds the document fed → its gate decides, nothing forced)
 *   · a later push of the same list (the tick after an install elsewhere) keeps the row elements (no icon re-decode)
 * Deliberate breaks: see the S11 F report. */
import { dKit } from '../pins-s10/d-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = dKit(h);
  let s = null;
  try {
    s = await boot('index.html', { storage: {} });
    const { W, d, push, sent } = s;
    const tap = (sel) => { const n = d.querySelector(sel); if (n) n.dispatchEvent(new W.MouseEvent('click', { bubbles: true, cancelable: true })); return !!n; };
    const ICON = 'data:image/png;base64,iVBORw0KGgo=';
    const burst = () => {
      push('clearApps');
      push('addApp', 'app.chess', 'Chess', ICON, 'Ixian', 'False', 'True');
      push('addApp', 'app.notes', 'Notes', ICON, 'Ixian', 'True', 'False');
      push('clearAppsDone');
    };
    const rows = () => [...d.querySelectorAll('#apps-scroll .c-app-item')];
    const appsView = d.getElementById('apps-view');
    const chatsView = d.getElementById('chats-view');
    const tab3 = () => sent.filter((c) => c === 'ixian:tab:tab3').length;

    /* —— the pre-push: the user is on Chats —— */
    const tab3Before = tab3();
    burst();
    await sleep(300);
    const pre = rows();
    const names = pre.map((r) => (r.textContent || '').replace(/\s+/g, ' ').trim());
    const listEl = d.querySelector('#apps-scroll > *');
    const r1 = {
      hidden: !!appsView && appsView.hidden === true && !!chatsView && chatsView.hidden === false,
      built: pre.length === 2 && names[0].includes('Chess') && names[1].includes('Notes'),
      noEmpty: !!listEl && listEl.dataset.empty === undefined && !d.querySelector('#apps-scroll .c-empty-state'),
      noTab: tab3() === tab3Before,
    };
    ok(Object.values(r1).every(Boolean),
      '★ S11 F (#1262): the pre-push burst on the Chats tab BUILDS the app rows inside the hidden Apps view — Chats stays visible, no empty state, no ixian:tab:tab3 — so the first Apps visit has nothing left to build — ' + JSON.stringify(r1));

    /* —— the first Apps visit —— */
    tap('.c-bottomnav__item[data-id="apps"]');
    await sleep(60);
    const first = rows();
    const r2 = {
      shown: appsView.hidden === false && chatsView.hidden === true,
      same: first.length === 2 && first.every((el, i) => el === pre[i]) && first.every((el) => el.isConnected),
    };
    await sleep(300);
    r2.tab3 = tab3() === tab3Before + 1;
    ok(Object.values(r2).every(Boolean),
      '★ S11 F (#1262): the first Apps tab tap shows the pre-pushed rows AT ONCE — the same elements, nothing re-built, no push waited for — and still tells C# ixian:tab:tab3 (a fed document: its gate decides, nothing forced) — ' + JSON.stringify(r2));

    /* —— a later re-push of the same list keeps the rows —— */
    burst();
    await sleep(300);
    const again = rows();
    ok(again.length === 2 && again.every((el, i) => el === pre[i]),
      '★ S11 F (#1262): a later push of the SAME list (the tick after shouldRefreshApps) reuses the row elements — no icon re-decode on the visible tab');
  } catch (e) {
    ok(false, '★ S11 F apps pre-push (shell) — threw: ' + (e && e.message));
  } finally {
    if (s) { try { s.dom.window.close(); } catch (e) {} }
  }
}
