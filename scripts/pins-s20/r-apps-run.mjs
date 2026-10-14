/* ==== S20 C (#1377, Damir 17:2x, the render "Spixi Session 20 Dials") — APPS: a tap on the tile opens the DETAILS, the ⋮ becomes RUN ====
 * On the BUILT index.html (jsdom, the real Apps tab path: clearApps → addApp × 2 → clearAppsDone, the bottom-nav Apps tab), GRID and
 * LIST (the stored spixi.apps.layout), ixian: verbs captured at the href setter:
 *   · the tile has NO menu: no ⋮ (.c-app-item__menu) and no ⓘ; exactly TWO buttons per tile — the tile "Open details for X"
 *     and Run "Run X" (one tab stop each, nothing else focusable inside the tile);
 *   · a tap on the tile sends `ixian:appDetails:<id>` and launches nothing;
 *   · Run on a single-user app sends `ixian:startApp:<id>` (no moments cap = the app moment goes on) and opens no details;
 *     Run on a multi-user-only app opens the in-shell contact picker (the existing launch path) and sends no startApp;
 *   · Run wears player-play (the existing icon) at 18 px in a 36 px disc filled --surface-action-tonal-default.
 * And the details page keeps what left the tile menu (BUILT app_details.html): an installed dual app shows "Invite a contact"
 * (→ ixian:startAppMulti:<id>) and Uninstall.
 * ★ #46 S20 r1: a press that starts on Run does not arm the tile's row press (pressable.js); a press on the tile does.
 * Deliberate breaks (S20 R report): the pressable.js Run skip deleted → runPress fails; home.html `appRun: true` deleted → the ⋮ menu is back and the tile tap launches → noMenu,
 * tapDetails, run fail. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep, readFileSync, join, root } = h;
  const K = aKit(h);
  const iconsSrc = readFileSync(join(root, 'src/components/icons.js'), 'utf8');
  const glyphD = (name) => {
    const m = new RegExp('"' + name + '":(\\{"v":"[^"]*",\\s*"b":"(?:[^"\\\\]|\\\\.)*"\\})').exec(iconsSrc);
    return m ? ((/ d="([^"]+)"/.exec(JSON.parse(m[1]).b) || [])[1] || null) : null;
  };
  const r = {}, n = {};
  for (const layout of ['grid', 'list']) {
    let s = null;
    try {
      s = await K.boot('index.html', { wait: 1500, storage: { 'spixi.apps.layout': layout } });
      const { d, W, push, sent } = s;
      push('clearApps');
      push('addApp', 'app.notes', 'Notes', '', 'Ixian', 'True', 'False');
      push('addApp', 'app.chess', 'Chess', '', 'Ixian', 'False', 'True');
      push('clearAppsDone');
      await sleep(250);
      const nav = d.querySelector('.c-bottomnav__item[data-id="apps"]');
      if (nav) nav.dispatchEvent(new W.MouseEvent('click', { bubbles: true, cancelable: true }));
      await sleep(250);
      const tiles = [...d.querySelectorAll('#apps-scroll .c-app-item')];
      const notes = tiles.find((t) => t.dataset.appId === 'app.notes'), chess = tiles.find((t) => t.dataset.appId === 'app.chess');
      const focusables = (t) => [...t.querySelectorAll('button, a[href], input, [tabindex]')].filter((e) => !e.disabled && e.tabIndex >= 0);
      n[layout] = { tiles: tiles.length, layout: tiles[0] && tiles[0].dataset.layout };
      r[layout + ':noMenu'] = tiles.length === 2 && tiles.every((t) => t.dataset.layout === layout && !t.querySelector('.c-app-item__menu, .c-app-item__info')
        && focusables(t).length === 2);
      const open = notes && notes.querySelector('.c-app-item__open'), run = notes && notes.querySelector('.c-app-item__run');
      r[layout + ':names'] = !!open && !!run && open.getAttribute('aria-label') === 'Open details for Notes' && run.getAttribute('aria-label') === 'Run Notes'
        && open.tagName === 'BUTTON' && run.tagName === 'BUTTON' && !open.contains(run);
      /* ★ #46 S20 r1: a press that starts on Run does not arm the tile's row sweep; a press on the tile does */
      const armed = (w) => w.hasAttribute('data-pressed') || w.hasAttribute('data-pressarm');
      const press = async (target) => {
        target.dispatchEvent(new W.MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
        await sleep(120);
        const a = armed(notes);
        target.dispatchEvent(new W.MouseEvent('pointercancel', { bubbles: true, cancelable: true }));
        await sleep(30);
        return a;
      };
      n[layout].press = { run: await press(run), tile: await press(open) };
      r[layout + ':runPress'] = n[layout].press.run === false && n[layout].press.tile === true;
      /* tap the tile → the details verb, nothing launched */
      let mark = sent.length;
      open.click();
      await sleep(80);
      const tapSent = sent.slice(mark);
      r[layout + ':tapDetails'] = tapSent.includes('ixian:appDetails:app.notes') && !tapSent.some((c) => /^ixian:startApp/.test(c));
      /* Run → the launch verb, no details */
      mark = sent.length;
      run.click();
      await sleep(120);
      const runSent = sent.slice(mark);
      r[layout + ':run'] = runSent.includes('ixian:startApp:app.notes') && !runSent.some((c) => /^ixian:appDetails/.test(c));
      /* Run on a multi-user-only app → the in-shell picker (today's launch path), no startApp */
      mark = sent.length;
      const runC = chess && chess.querySelector('.c-app-item__run');
      if (runC) runC.click();
      await sleep(300);
      const multiSent = sent.slice(mark);
      r[layout + ':multi'] = !!runC && !multiSent.some((c) => /^ixian:(startApp|appDetails)/.test(c)) && !!d.querySelector('.c-contacts');
      n[layout].multiSent = multiSent;
      /* the Run look: player-play, 18 in a 36 disc on the tonal fill */
      const svg = run.querySelector('svg');
      const cs = W.getComputedStyle(run);
      n[layout].run = { w: cs.width, h: cs.height, bg: cs.getPropertyValue('background') + ' | ' + cs.getPropertyValue('background-color'), svg: svg && W.getComputedStyle(svg).width };
      r[layout + ':look'] = !!svg && svg.querySelector('path') && svg.querySelector('path').getAttribute('d') === glyphD('player-play')
        && cs.width === '36px' && cs.height === '36px' && /surface-action-tonal-default/.test(n[layout].run.bg + '') && W.getComputedStyle(svg).width === '18px';
      if (!r[layout + ':look']) {
        /* the computed background may already be resolved — compare to the token's value */
        const tok = W.getComputedStyle(d.documentElement).getPropertyValue('--surface-action-tonal-default').trim();
        n[layout].tok = tok;
      }
      r[layout + ':noErr'] = K.noErr(s.errs);
    } catch (e) { r[layout + ':threw'] = e.message; }
    finally { if (s) s.close(); }
  }
  /* the details page keeps Invite + Uninstall */
  let s2 = null;
  try {
    s2 = await K.boot('app_details.html', { wait: 1400 });
    s2.push('init', 'Chess', '', 'Ixian', 'A chess game.', '1.0', 'https://apps.example.org/chess/appinfo.spixi', '120 KB',
      'multiUser', 'app.chess', 'True', 'True', 'True', 'False', 'True');
    await sleep(150);
    const btns = [...s2.d.querySelectorAll('button')];
    const invite = btns.find((b) => (b.getAttribute('aria-label') || b.textContent || '').trim() === 'Invite a contact');
    const uninstall = btns.find((b) => (b.textContent || '').trim() === 'Uninstall');
    if (invite) invite.click();
    await sleep(120);
    n.details = { invite: !!invite, uninstall: !!uninstall, sent: s2.sent.slice() };
    r.details = !!invite && !!uninstall && s2.sent.includes('ixian:startAppMulti:app.chess');
  } catch (e) { r.detailsThrew = e.message; } finally { if (s2) s2.close(); }

  const c = (k, m) => ok(r[k] === true, m + ' — ' + JSON.stringify(r[k] === true ? { [k]: true } : { [k]: r[k], n }).slice(0, 1400));
  for (const L of ['grid', 'list']) {
    c(L + ':noMenu', '★ S20 C (#1377): ' + L + ' — the app tile has NO menu (no ⋮, no ⓘ); exactly two focusable controls per tile: the tile and Run');
    c(L + ':names', '★ S20 C: ' + L + ' — the tile is ONE button "Open details for <app>", Run is its OWN button "Run <app>" (siblings, never nested)');
    c(L + ':tapDetails', '★ S20 C: ' + L + ' — a tap on the tile sends ixian:appDetails:<id> (the existing details path) and launches nothing');
    c(L + ':run', '★ S20 C: ' + L + ' — Run sends ixian:startApp:<id> (the existing launch path, the app moment goes on without the cap) and opens no details');
    c(L + ':multi', '★ S20 C: ' + L + ' — Run on a multi-user-only app opens the in-shell contact picker (today\'s launch path for it) and sends no startApp / appDetails');
    c(L + ':runPress', '★ S20 C (#46 S20 r1): ' + L + ' — a press that starts on Run does not arm the tile\'s row press sweep (pressable.js); a press on the tile does');
    c(L + ':look', '★ S20 C: ' + L + ' — Run = the existing player-play glyph at 18 px in a 36 px disc on --surface-action-tonal-default');
    c(L + ':noErr', '★ S20 C: ' + L + ' — no page error');
  }
  c('details', '★ S20 C: what left the tile menu stays on the details page — an installed dual app shows "Invite a contact" (→ ixian:startAppMulti:<id>) and Uninstall');
}
