/* ==== S10 C — F5 (#1254): the toast, every shell ====
 *   · BEHAVIOUR (the built chat shell's showToast): a short text leaves after 3500 ms; a 120-char text stays
 *     max(3500, 55 × 120) = 6600 ms (present at 6400, gone by 7400); a 300-char text is capped at 12 000 ms (#46 m-8);
 *   · CSS (no layout in jsdom → the toast rule as BUILT into every shell that carries it, comments stripped):
 *     symmetric 16 px insets + auto margins + width max-content + max-width min(100% - 32px, 400px), a Y-only transform
 *     (translateY(var(--spacing-8)) → translateY(0)), no left 50% / translate(-50%, the text clamped at 4 lines.
 * Deliberate breaks (C-brk): see the S10 C report. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
export default async function (h) {
  let s = null;   // the open document — closed in finally (a throw must not leave jsdom timers holding the runner)
  const { ok, root, readFileSync, readdirSync, join, stripCssComments } = h;
  const K = b1Kit(h);
  const { sleep } = K;
  const r = {};
  try {
    s = await K.open({ caps: 'reply,media' });
    const { d, W } = s;
    const host1 = d.createElement('div');
    const host2 = d.createElement('div');
    const host3 = d.createElement('div');
    d.body.append(host1, host2, host3);
    W.Spixi.showToast({ text: 'Short one.', host: host1 });
    W.Spixi.showToast({ text: 'L'.repeat(120), host: host2 });
    W.Spixi.showToast({ text: 'M'.repeat(300), host: host3 });   // ★ #46 m-8: 55 × 300 = 16.5 s → capped at 12 s
    await sleep(3000);
    r.shortAt3000 = !!host1.querySelector('.c-toast');
    await sleep(1000);   // 4000: the short one is past 3500 (+ its 400 ms exit fallback)
    r.shortGone = !host1.querySelector('.c-toast');
    await sleep(2400);   // 6400 (#46 R3-5): just under the 120-char toast's 6600
    r.longAt6400 = !!host2.querySelector('.c-toast');
    await sleep(1000);   // 7400 > 6600 + 400
    r.longGone = !host2.querySelector('.c-toast');
    await sleep(4200);   // 11 600
    r.capAt11600 = !!host3.querySelector('.c-toast');
    await sleep(1000);   // 12 600 > 12 000 + 400 (uncapped it would stay to 16.5 s)
    r.capGone = !host3.querySelector('.c-toast');
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.err = e.message; }
  finally { if (s) { try { s.W.close(); } catch (_) {} s = null; } }
  ok(Object.values(r).every((x) => x === true),
    '★ S10 C F5 (#1254): a toast stays max(3500, 55 ms × its length) — a short text leaves after 3.5 s, a 120-char text stays 6.6 s (present at 6.4 s), and none past 12 s (#46 m-8) — ' + JSON.stringify(r));

  const c = {};
  const dir = join(root, 'Spixi/Resources/Raw/html');
  const shells = readdirSync(dir).filter((f) => /\.html$/.test(f));
  const bad = [];
  const carriers = [];
  for (const f of shells) {
    const css = stripCssComments(readFileSync(join(dir, f), 'utf8'));
    const m = /\.c-toast \{([^}]*)\}/.exec(css);
    if (!m) continue;
    carriers.push(f);
    const b = m[1];
    const open = (/\.c-toast\[data-open\] \{([^}]*)\}/.exec(css) || [])[1] || '';
    const text = (/\.c-toast__text \{([^}]*)\}/.exec(css) || [])[1] || '';
    const good = /left: 16px;/.test(b) && /right: 16px;/.test(b) && /margin-inline: auto;/.test(b) && /width: max-content;/.test(b)
      && /max-width: min\(100% - 32px, 400px\);/.test(b) && /transform: translateY\(var\(--spacing-8\)\);/.test(b)
      && !/left: 50%|translate\(-50%|translateX/.test(b + open) && /transform: translateY\(0\);/.test(open)
      && /-webkit-line-clamp: 4;/.test(text);
    if (!good) bad.push(f);
  }
  c.everyShell = ['chat.html', 'index.html', 'settings.html'].every((f) => carriers.includes(f)) && bad.length === 0;
  ok(c.everyShell,
    '★ S10 C F5 (#1254): every built shell that carries the toast (' + carriers.join(' ') + ') centres it with 16 px insets + auto margins (width max-content, max-width min(100% - 32px, 400px)), moves it on Y only and clamps at 4 lines — bad: ' + bad.join(','));
}
