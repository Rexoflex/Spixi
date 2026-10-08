/* ==== S11 H (#1263) — Request (Receive), 2-step flow A, on the BUILT home shell ====
 *   · STEP ORDER: step 1 = "Show my address" + the W9 multi-select + "Continue (n)" (disabled at 0); Continue → step 2:
 *     the From chip (the picks), the amount + keypad, the request CTA (disabled until an amount). The top-bar Back on
 *     step 2 returns to step 1 with the ticks AND the amount kept; Continue brings the amount back.
 *   · THE WIRE, BYTE-FOR-BYTE: "Request 25 IXI (2)" → `ixian:sendrequest:<Ada>:25` then `…:<Bob>:25`, ONCE PER PICK, in
 *     roster order (the W9 loop, no batch verb) — then the all-clear closes the takeover (the old exit).
 *   · de-DE: the keypad's "," → the request carries 2.5.
 *   · #303: "Show my address" (step 1) opens the address sheet whose QR is the constant `<own>:ixi` — with an amount on
 *     the keypad, still no amount in it. */
import { hKit } from './h-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = hKit(h);
  const { sleep, ADA, BOB } = K;
  const r = {};
  let s = null;
  const open = async (opts = {}) => {
    s = await K.boot(opts);
    K.wallet(s);
    await sleep(80);
    [...s.d.querySelectorAll('.c-wallet-hero__qa')][1].click();   // Receive
    await sleep(350);
    return s.d.querySelector('.wallet-takeover .c-wallet-receive');
  };
  const back = () => s.d.querySelector('.wallet-takeover .c-topbar .c-button').click();
  const reqs = () => s.sent.filter((x) => /^ixian:sendrequest:/.test(x));
  try {
    let v = await open();
    const next = v.querySelector('.c-wallet-receive__next');
    const cta = v.querySelector('.c-wallet-receive__cta');
    const rows = () => [...v.querySelectorAll('.c-wallet-receive__contact')];
    r.step1 = v.dataset.step === '1' && !!v.querySelector('.c-wallet-receive__addrbtn') && rows().length === 2
      && next.disabled && next.textContent.trim() === 'Continue (0)' && cta.hidden
      && !!v.querySelector('.c-wallet-receive__amount').closest('[hidden]') && !v.querySelector('.c-wallet-receive__step--who').hidden;
    rows()[0].click(); rows()[1].click();
    r.count = !next.disabled && next.textContent.trim() === 'Continue (2)' && v.querySelector('.c-wallet-receive__hint').textContent === '2 selected';
    next.click();
    await sleep(20);
    const chip = v.querySelector('.c-wallet-receive__chip');
    r.step2 = v.dataset.step === '2' && !cta.hidden && next.hidden && cta.disabled && cta.textContent.trim() === 'Send request'
      && /From/.test(chip.textContent) && chip.querySelector('.c-wallet-receive__chipnames').textContent === 'Ada, Bob'
      && chip.querySelectorAll('.c-avatar').length === 2 && !!v.querySelector('.c-wallet-receive__step--who').closest('[hidden]');
    K.type(v, '25');
    r.cta = !cta.disabled && cta.textContent.trim() === 'Request 25 IXI (2)' && cta.getAttribute('aria-label') === 'Request 25 IXI from 2 selected';
    back();
    await sleep(30);
    r.backIsAStep = !!s.d.querySelector('.wallet-takeover') && v.dataset.step === '1'
      && rows().filter((b) => b.getAttribute('aria-checked') === 'true').length === 2;
    v.querySelector('.c-wallet-receive__addrbtn').click();   // #303 with an amount on the keypad
    await sleep(40);
    const qr = s.d.querySelector('.c-addr-sheet .c-qr');
    r.qrConstant = !!qr && qr.dataset.qrValue === 'OWNz8xC4vB7nM2qW5eR9tY3uI6oP1aS:ixi';
    s.W.Spixi.dismissTopOverlay();
    await sleep(450);
    next.click();
    await sleep(20);
    r.amountKept = K.shown(v, '.c-wallet-receive__amount') === '25' && cta.textContent.trim() === 'Request 25 IXI (2)';
    cta.click();
    cta.click();                                             // #72④: no double fire
    await sleep(30);
    r.wire = reqs().join('|') === 'ixian:sendrequest:' + ADA + ':25|ixian:sendrequest:' + BOB + ':25';
    await sleep(500);
    r.allClearCloses = !s.d.querySelector('.wallet-takeover') && !!s.d.querySelector('.c-toast');
    r.noErr1 = K.noErr(s.errs);
    s.close(); s = null;

    v = await open({ lang: 'de-DE' });
    v.querySelector('.c-wallet-receive__contact').click();
    v.querySelector('.c-wallet-receive__next').click();
    await sleep(20);
    r.deKey = v.querySelector('.c-amount-pad__key[data-key="dec"]').textContent === ',';
    K.type(v, '2,5');
    r.deShown = K.shown(v, '.c-wallet-receive__amount') === '2,5';
    v.querySelector('.c-wallet-receive__cta').click();
    await sleep(30);
    r.deWire = reqs().join('|') === 'ixian:sendrequest:' + ADA + ':2.5';
  } catch (e) { r.err = e.message; }
  finally { if (s) { s.close(); s = null; } }
  ok(Object.values(r).length >= 13 && Object.values(r).every((x) => x === true),
    '★ S11 H (#1263) REQUEST 2-STEP on the built home shell: step 1 = Show my address + the W9 multi-select + Continue (n) · step 2 = the From chip, the keypad, the request CTA · Back on step 2 = step 1 (ticks + amount kept) · #303 the sheet QR stays <own>:ixi · "Request 25 IXI (2)" → sendrequest …Ada:25 then …Bob:25, once each, roster order · all-clear closes · de-DE "," → 2.5 on the wire — ' + JSON.stringify(r));
}
