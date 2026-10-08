/* ==== S11 A — items 3 + 6 (#1262) ====
 *   item 3 — MIT out of the app copy: the About screen BUILT in the settings shell ends with "© Ixian" (a NEW key,
 *     aboutLegal2) and says "MIT" nowhere; the retired key `aboutLegal` is not read by any component; the Source code
 *     row stays (the code stays public).
 *   item 6 — the Downloads rows breathe: the BUILT Downloads shell CSS gives each row 4 px block padding and the press
 *     target 8 px (was 4), tokens only, and the two icon buttons keep their 44 px box. A rendered list is checked too:
 *     each row lives in its own section, so the space has to be the row's own padding (a sibling selector between rows
 *     could never match).
 * Deliberate breaks: see the S11 A report. */
import { aKit } from './a-kit.mjs';
export default async function (h) {
  const { ok, root, readFileSync, readdirSync, join, stripCssComments, stripCode } = h;
  const K = aKit(h);
  let s = null;
  const a = {};
  try {
    s = await K.boot('settings.html');
    const { W } = s;
    const el = W.Spixi.createSettingsAbout({ strings: W.SL || {}, onOpenLink: () => {} });
    const legal = el.querySelector('.c-settings-about__legal');
    a.copyright = !!legal && legal.textContent === '© Ixian';
    a.noMit = !/\bMIT\b/.test(el.textContent);
    a.sourceRowStays = /github\.com\/ixian-platform\/Spixi/.test(readFileSync(join(root, 'src/components/settings-app.js'), 'utf8'))
      && el.querySelectorAll('.c-settings-links__row').length >= 3;
    a.oldKeyUnread = readdirSync(join(root, 'src/components')).filter((f) => /\.js$/.test(f) && !/iife/.test(f))
      .every((f) => !/strings\.aboutLegal\b/.test(stripCode(readFileSync(join(root, 'src/components', f), 'utf8'))));
    a.noErr = K.noErr(s.errs);
  } catch (e) { a.err = e.message; }
  finally { if (s) { s.close(); s = null; } }
  ok(Object.values(a).every((x) => x === true),
    '★ S11 A item 3 (#1262): About ends with "© Ixian" (NEW key aboutLegal2) and says MIT nowhere; no component reads the retired aboutLegal; the Source code row stays — ' + JSON.stringify(a));

  const d = {};
  const css = stripCssComments(readFileSync(join(root, 'Spixi/Resources/Raw/html/downloads.html'), 'utf8'));
  // the rule whose WHOLE selector is `sel` (a descendant form such as `.c-account .c-settings-dl__open` is another rule)
  const rule = (sel) => ((new RegExp('(?:^|[}\\n])\\s*' + sel.replace(/[.[\]()]/g, (m) => '\\' + m) + ' \\{([^}]*)\\}')).exec(css) || [])[1] || '';
  d.rowPad = /padding-block: var\(--spacing-4\);/.test(rule('.c-settings-dl__row'));
  d.openPad = /padding: var\(--spacing-8\);/.test(rule('.c-settings-dl__open')) && /min-height: var\(--row-h-nav\);/.test(rule('.c-settings-dl__open'));
  d.targets = ['.c-settings-dl__del', '.c-settings-dl__go'].every((x) => /width: 44px;/.test(rule(x)) && /height: 44px;/.test(rule(x)));
  d.tokensOnly = !/padding[^;]*\d+px/.test(rule('.c-settings-dl__row') + rule('.c-settings-dl__open'));
  try {
    s = await K.boot('downloads.html');
    const { W } = s;
    const el = W.Spixi.createSettingsDownloads({ strings: W.SL || {}, files: [{ name: 'a.pdf', time: '1700000000', size: 10 }, { name: 'b.png', time: '1700000001', size: 20 }], onOpenFile: () => {}, onDeleteFile: () => {} });
    W.document.body.append(el);
    const rows = [...el.querySelectorAll('.c-settings-dl__row')];
    d.rowsEachInOwnSection = rows.length === 2 && rows.every((r) => r.parentNode.classList.contains('c-settings__section') && r.parentNode.children.length === 1);
    d.rowPadComputed = rows.every((r) => { const c = W.getComputedStyle(r); return /var\(--spacing-4\)/.test(c.getPropertyValue('padding-block') + c.paddingTop); });
  } catch (e) { d.err = e.message; }
  finally { if (s) { s.close(); s = null; } }
  ok(Object.values(d).every((x) => x === true),
    '★ S11 A item 6 (#1262): the built Downloads shell spaces its rows — 4 px block padding per row (each row is alone in its section, so it is the row\'s own padding) and an 8 px press target, tokens only; delete / show-in-chat keep 44 px — ' + JSON.stringify(d));
}
