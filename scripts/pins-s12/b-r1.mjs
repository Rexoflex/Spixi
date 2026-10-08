/* ==== S12 B round-1 (#46) fixes — EXECUTED on the BUILT settings.html (jsdom) unless marked ====
 *   R2-m1  About › Licences → Contributors → back returns to ABOUT on every back path (the topbar arrow, the hardware
 *          back C# routes into handlers.onBack, the iOS edge swipe); the hub's own Contributors row still returns to the
 *          hub; in pane mode the hub keeps About selected while Contributors is open from About
 *   R2-m4  "Your keys, your device" (NEW key aboutWhyKeysTitle2); no component reads the retired aboutWhyKeysTitle
 *   NIT    US English fallbacks: "Licenses", "Help Center"
 *   NIT    the dev-seed rows' label takes the free width again (built CSS: a row's DIRECT label is flex: 1)
 *   a11y   the "{0} of 6 seen" line is a polite, atomic live region
 * Deliberate breaks: see the S12 B round-1 report. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep, root, readFileSync, readdirSync, join, stripCode, stripCssComments } = h;
  const K = aKit(h);
  let s = null;
  const close = () => { if (s) { s.close(); s = null; } };
  const hubRow = (re) => [...s.d.querySelectorAll('button.c-settings__row')].find((x) => re.test(x.textContent || ''));
  const view = () => (s.d.querySelector('.c-settings-contrib') ? 'contrib' : s.d.querySelector('.c-settings-about') ? 'about'
    : s.d.querySelector('.c-settings--hub') ? 'hub' : '?');
  const settle = () => sleep(450);
  const toLicences = async () => {
    const a = hubRow(/^\s*About/); if (a) a.click(); await settle();
    const l = s.d.querySelector('button.c-settings-about__licences'); if (l) l.click(); await settle();
  };
  const swipe = () => {
    const ev = (type, x) => { const e = new s.W.Event(type, { bubbles: true }); Object.defineProperty(e, 'touches', { value: x == null ? [] : [{ clientX: x, clientY: 300 }] }); return e; };
    s.d.dispatchEvent(ev('touchstart', 5)); s.d.dispatchEvent(ev('touchmove', 140)); s.d.dispatchEvent(ev('touchend', null));
  };
  const a = {};
  try {
    /* a PHONE document: jsdom's UA reads desktop, and the edge-swipe recogniser is not attached on a desktop — the
       shell's own UA test is neutralised so this boot runs the phone path (the takeover + the edge swipe) */
    s = await K.boot('settings.html', { html: (t) => t.replace("document.documentElement.setAttribute('data-desktop','')", 'void 0') });
    a.phone = !s.d.documentElement.hasAttribute('data-desktop');
    await toLicences();
    a.opened = view() === 'contrib';
    const arrow = s.d.querySelector('.c-settings-contrib .c-topbar button');
    if (arrow) arrow.click(); await settle();
    a.arrow = view() === 'about';
    await toLicences();                         // from About again (we are on About)
    const l = s.d.querySelector('button.c-settings-about__licences'); if (view() === 'about' && l) { l.click(); await settle(); }
    s.push('onBack'); await settle();
    a.hardware = view() === 'about';
    s.push('onBack'); await settle();
    a.thenHub = view() === 'hub';
    await toLicences();
    swipe(); await settle();
    a.swipe = view() === 'about';
    s.push('onBack'); await settle();
    const c = hubRow(/^\s*Contributors/); if (c) c.click(); await settle();
    const arrow2 = s.d.querySelector('.c-settings-contrib .c-topbar button');
    if (arrow2) arrow2.click(); await settle();
    a.hubRowUnchanged = view() === 'hub';
    if (c) c.click(); await settle();
    s.push('onBack'); await settle();
    a.hubRowHardware = view() === 'hub';
    a.noErr = K.noErr(s.errs);
    close();

    /* pane mode: About stays selected while its Licences screen is open; the hub's Contributors row selects itself */
    s = await K.boot('settings.html', { desktop: true });
    s.push('setPaneMode', '1');
    await settle();
    const cur = () => { const r = s.d.querySelector('.c-settings__row[aria-current]'); return r ? r.getAttribute('data-setting-key') : null; };
    const ab = hubRow(/^\s*About/); if (ab) ab.click(); await settle();
    a.paneAbout = cur() === 'about';
    const lic = s.d.querySelector('button.c-settings-about__licences'); if (lic) lic.click(); await settle();
    a.paneLicences = !!s.d.querySelector('.c-settings-contrib') && cur() === 'about';
    s.push('onBack'); await settle();
    a.paneBack = !!s.d.querySelector('.c-settings-about') && cur() === 'about';
    const cr = hubRow(/^\s*Contributors/); if (cr) cr.click(); await settle();
    a.paneHubRow = !!s.d.querySelector('.c-settings-contrib') && cur() === 'contributors';
    close();

    /* copy + a11y on the built shell */
    s = await K.boot('settings.html');
    const ab2 = hubRow(/^\s*About/); if (ab2) ab2.click(); await settle();
    const facts = [...s.d.querySelectorAll('.c-settings-about__fact .c-settings-links__label')].map((x) => x.textContent);
    a.keysDevice = facts[2] === 'Your keys, your device' && !/your phone/i.test(s.d.body.textContent);
    a.licenses = !!s.d.querySelector('.c-settings-about__licences') && s.d.querySelector('.c-settings-about__licences').textContent.trim() === 'Licenses';
    s.push('onBack'); await settle();
    const ht = hubRow(/^\s*How to use Spixi/); if (ht) ht.click(); await settle();
    const seen = s.d.querySelector('.c-settings-howto__seen');
    a.live = !!seen && seen.getAttribute('aria-live') === 'polite' && seen.getAttribute('aria-atomic') === 'true';
    a.helpCenter = [...s.d.querySelectorAll('.c-settings-howto__more .c-settings-links__label')].some((x) => x.textContent === 'Help Center');
    close();
  } catch (e) { a.err = String(e && e.stack || e).slice(0, 300); }
  finally { close(); }
  ok(Object.values(a).every((x) => x === true),
    '★ S12 B r1 (#46 R2-m1/m4, NITs) (EXECUTED): About › Licences → back (arrow · hardware · edge swipe) returns to About and the hub row still returns to the hub; pane mode keeps About selected; "Your keys, your device"; "Licenses" / "Help Center"; the seen line is a polite live region — ' + JSON.stringify(a));

  /* SOURCE: the retired key has no consumer; the built CSS gives a row's direct label the free width (dev-seed rows) */
  const comps = readdirSync(join(root, 'src/components')).filter((f) => /\.js$/.test(f) && !/iife/.test(f));
  const retired = comps.every((f) => !/strings\.aboutWhyKeysTitle\b/.test(stripCode(readFileSync(join(root, 'src/components', f), 'utf8'))));
  const css = stripCssComments(readFileSync(join(root, 'Spixi/Resources/Raw/html/settings.html'), 'utf8'));
  const flex = /\.c-settings-links__row > \.c-settings-links__label \{ flex: 1; \}/.test(css);
  const gate = readFileSync(join(root, 'docs/security-handover-gate.md'), 'utf8');
  const listed = /\| `spixi\.\*` localStorage keys \| \*\*17\*\*/.test(gate) && /\| \*\*`spixi\.howtoSeen`\*\*/.test(gate);
  ok(retired && flex && listed,
    '★ S12 B r1 (SOURCE): no component reads the retired aboutWhyKeysTitle; the built settings CSS gives a row\'s direct .c-settings-links__label flex: 1 (the dev-seed chevron sits at the edge); the gate doc counts 17 spixi.* keys and lists spixi.howtoSeen (r1 R2-m3) — ' + JSON.stringify({ retired, flex, listed }));
}
