/* ==== S20H Drop B — F-C (Account icons + one icon per meaning) · ⑦ (the wallet tip body) · ⑨ (the light chip shine) ====
 *   (1) On the BUILT settings.html (jsdom, the hub with every cap): the nine rows wear Damir's icons — Declined requests =
 *       user-cancel · Change Spixi password = key · Theme = sun-moon · Chat appearance = palette · Backup = file-export ·
 *       How to use Spixi = book · Version = versions · Developer = code · Contributors = award (svg markup = the registry's);
 *   (2) no two hub rows wear the same glyph; (3) data-hue only on Delete data ('error') — the dead per-row hue names are gone,
 *       the colours still come from the row order (data-grad on every other disc); (4) the optical fixes: the Confirm payments
 *       disc carries data-glyph="wallet" and the built CSS scales it 1.11, the user-cancel disc is moved by its own box;
 *   (5) one warning glyph: the launch field-error line, Add contact and Add app error lines build alert-square-rounded;
 *   (6) the registry has the 9 new / re-exported icons and NOT the 5 proven-unused ones (Damir: delete them);
 *   (7) ⑦: the wallet tip body no longer opens with the title's first words, in en-us and the 13 drafts (each translated);
 *   (8) ⑨: in LIGHT --chip-lift-ink resolves to the tonal fill itself (a plain fill), in DARK to white (the shine stays).
 * Deliberate breaks (S20H report): ① Theme back to adjustments-alt → (1) fails; ② `hue: 'warning'` back on Confirm payments →
 *   (3) fails; ③ the wallet scale rule removed → (4) fails; ④ apps-add.js back to alert-small → (5) fails; ⑤ the light
 *   --chip-lift-ink back to #ffffff → (8) fails. */
import { b2Kit } from '../pins-s9/b2-kit.mjs';
const MAP = { 'Declined requests': 'user-cancel', 'Change Spixi password': 'key', Theme: 'sun-moon', 'Chat appearance': 'palette', Backup: 'file-export', 'How to use Spixi': 'book', Version: 'versions', Developer: 'code', Contributors: 'award' };
const GONE = ['chevron-up', 'devices-2', 'dots-vertical', 'message-2-plus', 'phone-check'];   // #46 r1 MINOR-5: circle-dashed-plus, user-square-rounded, arrows-maximize stay (docs/renders/desktop parts use them)
const LOCALES = ['de-de', 'es-co', 'fr-fr', 'sr-sp', 'sl-si', 'ru-ru', 'pt-br', 'it-it', 'id-id', 'lt-lt', 'cn-cn', 'ja-jp', 'sq-al'];
export default async function (h) {
  const { ok, root, readFileSync, join, stripCode } = h;
  const { boot } = b2Kit(h);
  const r = {};
  let s = null;
  try {
    s = await boot('settings.html');
    s.push('setCaps', 'paymentAuth,encpass,ignoredRequests,dev,readReceipts,typing,hideOnline,photoPreviews,globalNotifications');
    s.push('setLockEnabled', 'True');
    s.push('setVersion', 'spixi-0.9.22');
    await h.sleep(250);
    const { W, d } = s;
    const reg = (n) => (W.SpixiIcons && W.SpixiIcons.icon ? W.SpixiIcons.icon(n).innerHTML : null);
    const rows = [...d.querySelectorAll('.c-account .c-settings__row')].filter((x) => x.querySelector('.c-disc'));
    const labelOf = (x) => (x.textContent || '').trim();
    r.wrong = [];
    for (const [lab, name] of Object.entries(MAP)) {
      const row = rows.find((x) => labelOf(x).startsWith(lab));
      const svg = row && row.querySelector('.c-disc svg');
      if (!svg || !reg(name) || svg.innerHTML !== reg(name)) r.wrong.push(lab + '≠' + name);
    }
    const seen = new Map();
    r.dupes = [];
    for (const x of rows) { const k = x.querySelector('.c-disc svg').innerHTML; if (seen.has(k)) r.dupes.push(labelOf(x).slice(0, 20) + '=' + seen.get(k)); else seen.set(k, labelOf(x).slice(0, 20)); }
    r.rows = rows.length;
    r.hues = rows.map((x) => x.querySelector('.c-disc')).filter((dd) => dd.hasAttribute('data-hue')).map((dd) => dd.dataset.hue + ':' + labelOf(dd.closest('.c-settings__row')).slice(0, 12));
    r.grads = rows.map((x) => x.querySelector('.c-disc')).filter((dd) => dd.dataset.hue !== 'error').every((dd) => /^\d+$/.test(dd.dataset.grad || ''));
    const wal = rows.find((x) => labelOf(x).startsWith('Confirm payments'));
    const uc = rows.find((x) => labelOf(x).startsWith('Declined requests'));
    r.marks = !!wal && wal.querySelector('.c-disc').dataset.glyph === 'wallet' && !!uc && uc.querySelector('.c-disc').dataset.glyph === 'user-cancel';
  } catch (e) { r.err = String((e && e.stack) || e).slice(0, 300); }
  finally { try { if (s) s.dom.window.close(); } catch (e) { /* closed */ } }
  ok(r.wrong && r.wrong.length === 0 && !r.err, `★ S20H F-C (1): the nine Account rows wear Damir's icons (user-cancel, key, sun-moon, palette, file-export, book, versions, code, award) — ${JSON.stringify({ wrong: r.wrong, rows: r.rows, err: r.err })}`);
  ok(r.dupes && r.dupes.length === 0 && r.rows >= 17, `★ S20H F-C (2): no two Account hub rows share a glyph (was info-circle × 2) — ${JSON.stringify({ dupes: r.dupes, rows: r.rows })}`);
  ok(JSON.stringify(r.hues) === JSON.stringify(['error:Delete data…']) && r.grads, `★ S20H F-C (3): only Delete data carries a hue ('error', red outside the spread); every other disc takes its colour from the row order — ${JSON.stringify({ hues: r.hues, grads: r.grads })}`);
  const css = readFileSync(join(root, 'Spixi/Resources/Raw/html/settings.html'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const optical = /\.c-account \.c-disc\[data-glyph='wallet'\] > svg \{ transform: scale\(1\.11\); \}/.test(css)
    && /\.c-account \.c-disc\[data-glyph='user-cancel'\] > svg \{ transform: translate\(-8\.33%, -2\.08%\); \}/.test(css);
  ok(r.marks && optical, `★ S20H F-C (4): the optical fixes — Confirm payments' wallet ×1.11 (17.5 → ~19.5 of 24, like the others), user-cancel moved back by 2 / 0.5 units of its own box — ${JSON.stringify({ marks: r.marks, optical })}`);
  const src = (f) => stripCode(readFileSync(join(root, f), 'utf8'));
  const warn = /const glyph = icon\('alert-square-rounded'/.test(src('src/components/launch-shell.js'))
    && /const errGlyph = icon\('alert-square-rounded'/.test(src('src/components/contacts-shell.js'))
    && /err\.append\(icon\('alert-square-rounded'/.test(src('src/components/apps-add.js'))
    && !/icon\('alert-small'/.test(src('src/components/contacts-shell.js') + src('src/components/apps-add.js'));
  ok(warn, '★ S20H F-C (5): one warning glyph — the launch field errors, Add contact and Add app error lines use alert-square-rounded ("i" = information only; alert-small retired from the error lines)');
  const icons = readFileSync(join(root, 'src/components/icons.js'), 'utf8');
  const has = (n) => new RegExp('"' + n + '":\\{"v"').test(icons);
  const newOk = ['user-cancel', 'key', 'sun-moon', 'palette', 'file-export', 'book', 'versions', 'code', 'award'].every(has);
  const goneOk = GONE.every((n) => !has(n));
  ok(newOk && goneOk, `★ S20H F-C (6): the registry has the nine Account icons and none of the 5 proven-unused ones — ${JSON.stringify({ newOk, stillThere: GONE.filter(has) })}`);
  const en = JSON.parse(readFileSync(join(root, 'src/strings/en-us.json'), 'utf8'));
  const bad = [];
  const firstWords = (t) => String(t || '').toLowerCase().split(/\s+/).slice(0, 2).join(' ');
  if (en.hintWalletBody2 !== 'Open a chat with a contact and pay from there.' || firstWords(en.hintWalletBody2) === firstWords(en.hintWalletTitle)) bad.push('en-us');
  for (const l of LOCALES) {
    const dd = JSON.parse(readFileSync(join(root, 'src/strings/draft/' + l + '.json'), 'utf8'));
    const body = dd.hintWalletBody2, title = dd.hintWalletTitle;
    const sameStart = /^(cn|ja)/.test(l) ? String(body).slice(0, 4) === String(title).slice(0, 4) : firstWords(body) === firstWords(title);
    if (!body || body === en.hintWalletBody2 || sameStart || /IXI/.test(body) && /^(Send|Sende|Envía|Envoyez|Pošaljite|Pošljite|Отправляйте|Envie|Invia|Kirim|Siųskite|Dërgoni)/.test(body)) bad.push(l);
  }
  ok(bad.length === 0, `★ S20H ⑦ (#1423): the wallet tip body no longer repeats the title's "Send IXI" — "Open a chat with a contact and pay from there." in en-us + translated in the 13 drafts — ${JSON.stringify(bad)}`);
  const tok = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const lightLift = [...tok.matchAll(/(?:^|\n):root\s*\{([\s\S]*?)\n\}/g)].map((m) => /--chip-lift-ink:\s*([^;]+);/.exec(m[1])).find(Boolean);
  const darkLift = [...tok.matchAll(/\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/g)].map((m) => /--chip-lift-ink:\s*([^;]+);/.exec(m[1])).find(Boolean);
  ok(!!lightLift && lightLift[1].trim() === 'var(--surface-action-tonal-default)' && !!darkLift && darkLift[1].trim().toLowerCase() === '#ffffff',
    `★ S20H ⑨ (#1423, Damir: plain in light, keep in dark): the selected chip's lift mixes toward the tonal fill itself in light (a plain fill) and toward white in dark — ${JSON.stringify({ light: lightLift && lightLift[1], dark: darkLift && darkLift[1] })}`);
}
