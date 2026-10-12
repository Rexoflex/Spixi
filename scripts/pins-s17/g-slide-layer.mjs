/* ==== S17 walk fix (#1351, Damir 2026-10-12 11:20 video) — the sliding layer is ALWAYS lifted out of the flow ====
 * The defect: About, Downloads and Contributors opened (and closed) as a box drawn from mid-screen under the Account
 * hub's "App" header, then jumped to full screen when the slide settled. Mechanism (measured in Chromium on the built
 * shell, hub scrolled 600 px): the sliding layer computed `position: relative; top: 413` — S17 gave those three screen
 * roots `position: relative` in settings-app.css with ONE class, the layer's `.c-subslide--viewport { position: fixed }`
 * also had ONE class and an EARLIER sheet, so the screen root won the tie and the layer fell into the page flow below
 * the still-mounted hub. How to use Spixi (no own position) computed `fixed; top: 0` throughout.
 * The fix lives in subscreen-slide.css: `.c-subslide.c-subslide--viewport` / `.c-subslide.c-subslide--host` (0,2,0).
 *
 * The pin is BEHAVIOURAL and generic: on the BUILT settings.html (jsdom, which resolves the cascade with specificity),
 * EVERY hub row that mounts a sublevel screen is opened through the REAL click path; its screen root then carries the
 * layer classes the slide adds, and its computed position must be `fixed` (viewport mode) and `absolute`
 * (host mode). The four named screens must be among the ones checked, so a renamed row cannot silently empty the pin.
 * Deliberate break (S17 walk report): the single-class `.c-subslide--viewport` rule back in the built shell → About /
 * Downloads / Contributors compute `relative` and this pin fails naming them; How to use Spixi still passes. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  let s = null;
  const open = async () => {
    if (s && s.close) s.close();
    s = await K.boot('settings.html', { wait: 800 });
    s.push('setCaps', 'settingsApply,backupInline,downloadsInline,encpass,encpassInline,globalNotifications,ignoredRequests,callRingtone');   // = SettingsPage.xaml.cs's caps (r1 MINOR: every sublevel the app slides)
    s.push('setVersion', 'spixi-0.9.22');
    await sleep(300);
  };
  /* the row's own name = the first text node of its label (the subtitle is a separate span) */
  const nameOf = (b) => { const t = b.querySelector('.c-settings__row-label'); const w = (t || b).ownerDocument.createTreeWalker(t || b, 4); let n; while ((n = w.nextNode())) { const x = n.textContent.trim(); if (x) return x; } return ''; };
  try {
    await open();
    const rowsIn = () => [...s.d.querySelectorAll('#settings-root button.c-settings__row')];
    const labels = rowsIn().map(nameOf).filter(Boolean);
    const checked = [];
    const bad = [];
    let fresh = true;
    for (const label of labels) {
      /* a row that leaves the shell (Contacts, a sheet, a native page) can latch the pane — every row after one starts
         on a fresh boot, so each screen is reached exactly as a user reaches it from a clean Account hub */
      if (!fresh) await open();
      fresh = false;
      const { d, W } = s;
      const root = d.getElementById('settings-root');
      const btn = rowsIn().find((b) => nameOf(b) === label);
      if (!btn) continue;
      const hub = root.firstElementChild;
      btn.click();
      await sleep(550);
      const scr = root.lastElementChild;
      if (!scr || scr === hub) continue;
      const cls = String(scr.className);
      scr.classList.add('c-subslide', 'c-subslide--viewport');
      const v = W.getComputedStyle(scr);
      const vp = v.position;   /* jsdom does not expand the `inset` shorthand (top reads auto) — the position is the defect */
      scr.classList.remove('c-subslide--viewport');
      scr.classList.add('c-subslide--host');
      const hp = W.getComputedStyle(scr).position;
      scr.classList.remove('c-subslide', 'c-subslide--host');
      checked.push(label);
      if (vp !== 'fixed' || hp !== 'absolute') bad.push(label + ' [' + cls.split(' ')[0] + '] viewport=' + vp + ' host=' + hp);
    }
    const must = ['How to use Spixi', 'About', 'Downloads', 'Contributors'];
    const missing = must.filter((m) => !checked.includes(m));
    ok(bad.length === 0 && missing.length === 0 && checked.length >= 4,
      '★ S17 walk fix (#1351, Damir 11:20 video): every hub sublevel the Account screen mounts is lifted OUT of the flow while it slides — its root under the slide classes computes `position: fixed` (viewport) and `absolute` (host), whatever position the screen gives itself; checked ' + checked.length + ' screens (' + checked.join(' · ') + ')' + (bad.length ? ' — WRONG: ' + bad.join('; ') : '') + (missing.length ? ' — NOT REACHED: ' + missing.join(', ') : ''));
  } finally {
    if (s && s.close) s.close();
  }
}
