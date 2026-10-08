/* ==== S11 C (#1262) — the Settings › Privacy auto-download row and the Developer flash switches, EXECUTED on the BUILT
 * settings.html / dev.html (jsdom; C# pushes via executeUiCommand; outgoing ixian: verbs captured) ====
 *   · Privacy: with the `photoAutoDl` cap the row sits right after "Load pictures and GIFs", shows the seeded value (Off by
 *     default), opens the option sheet (Off · Wi-Fi only · Always); a pick sends ixian:photoAutoDl:<value>:<load pictures 1|0>
 *     and the echo moves the value in place; turning "Load pictures" off sends the mirror (…:0); an unknown echo reads Off;
 *     no cap → no row (the W-g rule)
 *   · Developer: no flash card before C# pushes positions; setFlashDev('1,1,1') → three switches ON; a tap sends
 *     ixian:devflash:<name>:1 (that action OFF) and moves optimistically; a malformed push is ignored
 * Deliberate breaks: see the S11 C report. */
import { b2Kit } from '../pins-s9/b2-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = b2Kit(h);
  let s = null;
  const close = () => { if (s) { try { s.W.close(); } catch (_) {} s = null; } };
  const openPrivacy = async () => {
    const pr = [...s.d.querySelectorAll('button.c-settings__row')].find((x) => /^\s*Privacy/.test(x.textContent || ''));
    if (pr) pr.click();
    await sleep(250);
  };
  const row = () => s.d.querySelector('.c-settings-privacy [data-pref="photoAutoDl"]');
  const value = () => { const r = row(); const v = r && r.querySelector('.c-settings__row-value'); return v ? v.textContent : null; };
  const a = {};
  try {
    s = await boot('settings.html');
    /* jsdom's file:// origin has no localStorage (it throws, so the switch would fail back) — an in-memory one, like the app's */
    const mem = {};
    Object.defineProperty(s.W, 'localStorage', { configurable: true, value: { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } } });
    s.push('setCaps', 'readReceipts,typing,hideOnline,photoPreviews,photoAutoDl');
    s.push('setPhotoAutoDl', 'off');
    await sleep(150);
    await openPrivacy();
    const r = row();
    const secs = [...s.d.querySelectorAll('.c-settings-privacy .c-settings__body > .c-settings__section')];
    const mediaIdx = secs.findIndex((x) => /Load pictures and GIFs/.test(x.textContent));
    a.placed = !!r && mediaIdx >= 0 && secs[mediaIdx + 1] === r;
    a.seeded = value() === 'Off' && /Download photos automatically/.test(r ? r.textContent : '') && /10 MB/.test(r ? r.textContent : '');
    r.querySelector('button.c-settings__row').click();
    await sleep(200);
    const opts = [...s.d.querySelectorAll('.c-settings__opt')];
    a.sheet = opts.length === 3 && opts.map((o) => o.textContent.trim()).join('|') === 'Off|Wi-Fi only|Always';
    const b0 = s.sent.length;
    const always = opts.find((o) => /Always/.test(o.textContent));
    if (always) always.click();
    await sleep(60);
    a.sent = JSON.stringify(s.sent.slice(b0)) === JSON.stringify(['ixian:photoAutoDl:always:1']);
    s.push('setPhotoAutoDl', 'always');
    await sleep(500);
    a.echo = value() === 'Always';
    /* the Load-pictures switch → the C# mirror */
    const media = [...s.d.querySelectorAll('.c-settings-privacy .c-settings__switch')].find((x) => x.getAttribute('aria-label') === 'Load pictures and GIFs');
    const b1 = s.sent.length;
    if (media) media.click();
    await sleep(60);
    a.mirror = !!media && s.sent.slice(b1).includes('ixian:photoAutoDl:always:0') && mem['spixi.media.autoload'] === 'off';
    s.push('setPhotoAutoDl', 'mobile');
    await sleep(60);
    a.unknownOff = value() === 'Off';
    a.noErr = s.errs.filter((e) => /ReferenceError|TypeError|SyntaxError|dispatch failed/.test(e)).length === 0;
    close();
    /* no cap → no row */
    s = await boot('settings.html');
    s.push('setCaps', 'readReceipts,typing,hideOnline,photoPreviews');
    await sleep(150);
    await openPrivacy();
    a.noCapNoRow = !!s.d.querySelector('.c-settings-privacy') && !row();
  } catch (e) { a.err = e.message; }
  finally { close(); }
  ok(Object.values(a).every((x) => x === true),
    '★ S11 C (#1262) Settings › Privacy "Download photos automatically": after Load pictures, Off by default, the sheet offers Off · Wi-Fi only · Always, a pick sends ixian:photoAutoDl:<value>:<load pictures>, the echo moves the value, Load pictures off sends the mirror, an unknown echo reads Off, no cap → no row — ' + JSON.stringify(a));

  const d = {};
  try {
    s = await boot('dev.html');
    await sleep(100);
    d.hiddenFirst = !s.d.querySelector('.c-dev-flash');
    s.push('setFlashDev', '1,1,1');
    await sleep(60);
    const sws = () => [...s.d.querySelectorAll('.c-dev-flash [role="switch"]')];
    d.three = sws().length === 3 && sws().every((x) => x.getAttribute('aria-checked') === 'true');
    const b0 = s.sent.length;
    sws()[0].click();
    await sleep(40);
    d.tap = JSON.stringify(s.sent.slice(b0)) === JSON.stringify(['ixian:devflash:candidate:1']) && sws()[0].getAttribute('aria-checked') === 'false';
    sws()[2].click();
    await sleep(40);
    d.tapInput = s.sent[s.sent.length - 1] === 'ixian:devflash:input:1';
    s.push('setFlashDev', '0,0,1');
    await sleep(40);
    d.echo = sws().map((x) => x.getAttribute('aria-checked')).join() === 'false,false,true';
    s.push('setFlashDev', '1,1');
    s.push('setFlashDev', '1,1,2');
    await sleep(40);
    d.malformed = sws().map((x) => x.getAttribute('aria-checked')).join() === 'false,false,true';
    d.noErr = s.errs.filter((e) => /ReferenceError|TypeError|SyntaxError|dispatch failed/.test(e)).length === 0;
  } catch (e) { d.err = e.message; }
  finally { close(); }
  ok(Object.values(d).every((x) => x === true),
    '★ S11 C 10-FLASH (#1262) Developer switches on the built dev shell: hidden until C# pushes positions; three switches; a tap sends ixian:devflash:<name>:1 and moves optimistically; the echo sets them; a malformed push is ignored — ' + JSON.stringify(d));
}
