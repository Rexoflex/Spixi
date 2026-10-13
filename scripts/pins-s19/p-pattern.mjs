/* ==== S19 F1 (S18 walk PATTERN-STALE, Damir 2026-10-12 21:2x, Windows desktop) ====
 * On the BUILT chat.html (jsdom), a DESKTOP boot (?desktop=1 → :root[data-desktop]) with spixi.chat.pattern NEVER stored
 * (settings writes it only on None / from None) paints the pattern ON from the head script; then a Background change
 * (spixi.chat.ground) and the attach re-read (onChatScreenReady → refreshPatternPrefsIfChanged, the CLAIMED spare) must
 * keep it ON: --chat-pattern-opacity stays var(--chat-pattern-alpha-1) and resolves non-zero; the new ground is applied
 * (the re-read really ran). The same on a phone boot, and a stored 0 (None) still reads Off after the re-read.
 * Deliberate break (S19 report): chat.html readPatternPrefs back to readPatternLevel(p, de ? 0 : 1) → the desktop clause
 * fails (opacity 0 after the claim). */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  const run = async (desktop, storage) => {
    const s = await K.boot('chat.html', { wait: 900, desktop, storage });
    try {
      const R = s.d.documentElement;
      const read = () => ({
        op: R.style.getPropertyValue('--chat-pattern-opacity').trim(),
        alpha: parseFloat(s.W.getComputedStyle(R).getPropertyValue('--chat-pattern-alpha-1')),
        ground: R.getAttribute('data-chat-ground'),
      });
      const before = read();
      s.W.localStorage.setItem('spixi.chat.ground', 'blue');   // a Background change in Settings
      s.push('onChatScreenReady', 'addrPeer');                  // the claim: the spare re-reads every appearance pref
      await sleep(120);
      const after = read();
      return { flag: R.hasAttribute('data-desktop'), before, after };
    } finally { s.close(); }
  };
  const r = {};
  try {
    const dk = await run(true, {});
    r.desktopFlag = dk.flag === true;
    r.desktopBoot = dk.before.op === 'var(--chat-pattern-alpha-1)';
    r.desktopClaimed = dk.after.ground === 'blue' && dk.after.op === 'var(--chat-pattern-alpha-1)' && dk.after.alpha > 0;
    const ph = await run(false, {});
    r.phoneClaimed = ph.flag === false && ph.before.op === 'var(--chat-pattern-alpha-1)' && ph.after.ground === 'blue' && ph.after.op === 'var(--chat-pattern-alpha-1)';
    const off = await run(true, { 'spixi.chat.pattern': '0' });
    r.storedNoneStaysOff = off.before.op === '0' && off.after.ground === 'blue' && off.after.op === '0';
    if (!Object.values(r).every((v) => v === true)) r.detail = JSON.stringify({ dk, ph, off });
  } catch (e) { r.threw = e.message; }
  ok(Object.values(r).every((v) => v === true),
    '★ S19 F1 (PATTERN-STALE): a desktop chat with the pattern level never stored keeps the pattern ON after a Background change and the attach re-read (the claimed spare) — the live ladder defaults to 1 like the head script and settings; a phone too; a stored None stays Off — ' + JSON.stringify(r));
}
