/* ==== S14 E — Wallet: ★ S14 (#1289) empty state without search/chips · (#1290) IXI art, no bank card · (#1291) one inset ====
 * #1289 MECHANISM: the search pill + the All/Sent/Received chips (the tools row) stood above the zero state on a wallet
 * with NO transactions — nothing to search or filter — and pushed "Show my address" under the bottom nav (390×844:
 * button bottom 803 vs nav top 780). Now walletLedgerEmpty(state) (wallet-shell.js) hides the tools; a filter or a
 * search that finds nothing is NOT the zero state (state.filter / state.query) and keeps them.
 * #1290: the zero-state art was two payment cards with an EMV chip + a contactless mark — IXI is peer-to-peer, not a
 * bank card. Two IXI drawings (walletEmptyA / walletEmptyB); WALLET_EMPTY_ART wires one into the slot.
 * #1291: the tx rows inset their content 12px (txlist-item.css) while the tools and the sync row inset 16px. jsdom has
 * no layout → the shared token is pinned on the CASCADE (computed declared value), the px were measured in Chromium.
 * BEHAVIOUR on the BUILT index.html (home shell, jsdom; the C# pushes via executeUiCommand).
 * Deliberate breaks: see the S14 E report. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  let s = null;
  const close = () => { if (s) { try { s.close(); } catch (e) {} s = null; } };
  const q = (sel) => s.d.querySelector('#wallet-scroll ' + sel);
  const toolsShown = () => { const t = q('.c-wallet-tools'); return !!t && !t.hidden && !t.closest('[hidden]:not(#wallet-view)'); };
  const toolsFull = () => toolsShown() && !!q('.c-wallet-tools .c-search-field input') && q('.c-wallet-tools .c-wallet-filters').querySelectorAll('.c-chip').length === 3;
  const flush = async (filter, rows) => {
    s.push('clearPaymentActivity', filter);
    for (const r of rows) s.push('addPaymentActivity', ...r);
    s.push('clearPaymentActivityDone');
    await sleep(120);
  };
  const TX = ['tx1', '1', 'Alice', '1760000000', '12.5', '1.20', 'true'];
  try {
    s = await K.boot('index.html');
    s.push('selectTab', 'tab2');
    await sleep(100);
    /* ⓪ load beat (no push yet): no rows → no tools either (gate-independent: no jump when the burst lands) */
    const beat = !toolsShown() && !q('.c-empty-state');
    s.push('setScanProgress', '100', '600', '0', '0');
    /* ① a wallet with NO transactions: the zero state, no search pill, no chips — the sync row stays */
    await flush('all', []);
    const sync = q('.c-scanprog');
    const r1 = { beat, zero: !!q('.c-wallet-txlist > .c-empty-state'), noTools: !toolsShown(), sync: !!sync && !sync.hidden };
    ok(r1.beat && r1.zero && r1.noTools && r1.sync,
      '★ S14 (#1289): a wallet with NO transactions shows the zero state WITHOUT the search pill and the filter chips (the load beat before the burst too); the sync row stays — ' + JSON.stringify(r1));
    /* ② the first transaction arrives → search + the 3 chips are back, the zero state is gone */
    await flush('all', [TX]);
    const r2 = { full: toolsFull(), row: !!q('.c-txlist-item'), noZero: !q('.c-empty-state') };
    ok(r2.full && r2.row && r2.noZero,
      '★ S14 (#1289): one transaction → the search pill and the three chips come back above the row — ' + JSON.stringify(r2));
    /* ③ filtered to zero (C# answers the Sent chip with no rows) and searched to zero: NOT the zero state */
    const sent = [...q('.c-wallet-filters').querySelectorAll('.c-chip')][1];
    if (sent) sent.click();
    await flush('sent', []);
    const r3a = { full: toolsFull(), note: !!q('.c-wallet-empty'), noZero: !q('.c-empty-state') };
    await flush('all', [TX]);
    const inp = q('.c-wallet-tools .c-search-field input');
    if (inp) { inp.value = 'zzz-nobody'; inp.dispatchEvent(new s.W.Event('input', { bubbles: true })); }
    await sleep(60);
    const r3b = { full: toolsFull(), note: !!q('.c-wallet-empty'), noZero: !q('.c-empty-state') };
    ok(!!sent && !!inp && r3a.full && r3a.note && r3a.noZero && r3b.full && r3b.note && r3b.noZero,
      '★ S14 (#1289): a filter (Sent → 0 rows) or a search that finds nothing is NOT the zero state — the tools stay, the plain "no results" note shows — ' + JSON.stringify({ r3a, r3b }));
    /* ③b ★ #46 r3 (MINOR-5): the ledger EMPTIES (a 0-row push, filter all) while the search still holds a query — the
       state.query clause alone keeps this off the zero state (txs is empty, the filter is all): the tools stay (the user
       clears the search from them), no zero art, the plain "no results" note */
    await flush('all', []);
    const r3c = { query: !!inp && inp.value === 'zzz-nobody', full: toolsFull(), note: !!q('.c-wallet-empty'), noZero: !q('.c-empty-state'),
      noArt: !q('svg[data-illo="walletEmpty"]') };
    ok(!!inp && r3c.query && r3c.full && r3c.note && r3c.noZero && r3c.noArt,
      '★ S14 (#1289, #46 r3): NO transactions (a 0-row push, filter All) while a search query is set is NOT the zero state either — the search pill + the 3 chips stay, no zero-state art, the plain "no results" note — ' + JSON.stringify(r3c));
    if (inp) { inp.value = ''; inp.dispatchEvent(new s.W.Event('input', { bubbles: true })); }

    /* —— (#1290) the art in the wallet slot: an IXI drawing, no card / chip / contactless —— */
    await flush('all', []);
    const S = s.W.Spixi;
    const art = q('.c-empty-state__illo > svg[data-illo="walletEmpty"]');
    const which = art && art.getAttribute('data-art');
    const OLD = /wlBr|wlLc|width="140" height="88"|M50 21a8 8|M55 18a12 12/;   // the card body · the EMV chip grid · the contactless arcs
    const html = art ? art.innerHTML : '';
    const r4 = { which, wired: which === S.WALLET_EMPTY_ART, ab: ['walletEmptyA', 'walletEmptyB'].includes(which), noCard: !!html && !OLD.test(html) };
    ok(r4.wired && r4.ab && r4.noCard,
      '★ S14 (#1290): the wallet zero state draws the WIRED IXI art (WALLET_EMPTY_ART) — none of the payment-card body, EMV chip or contactless arcs — ' + JSON.stringify(r4));
    /* both variants fit the family: decorative, per-call ids, refs local, il-* entrance pieces (so data-held applies), --il-* tokens */
    const fam = {};
    for (const n of ['walletEmptyA', 'walletEmptyB']) {
      const f = S['illo' + n[0].toUpperCase() + n.slice(1)];
      const a = f && f(); const b = f && f();
      const ids = (x) => [...x.querySelectorAll('[id]')].map((e) => e.id);
      const own = a ? new Set(ids(a)) : new Set();
      const refs = a ? [...a.querySelectorAll('*')].flatMap((e) => e.getAttributeNames().flatMap((k) => { const v = e.getAttribute(k) || ''; return [...v.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]).concat(/href$/.test(k) && v[0] === '#' ? [v.slice(1)] : []); })) : [];
      fam[n] = !!a && a.getAttribute('aria-hidden') === 'true' && a.getAttribute('focusable') === 'false' && a.getAttribute('data-illo') === n
        && ids(a).every((x) => !ids(b).includes(x)) && refs.length > 0 && refs.every((r) => own.has(r))
        && a.querySelectorAll('.il-pop, .il-fly, .il-drop').length >= 2 && a.querySelectorAll('.il-tw').length >= 3
        && /var\(--il-glow\)/.test(a.innerHTML) && /var\(--il-orbit/.test(a.innerHTML) && !OLD.test(a.innerHTML);
    }
    ok(fam.walletEmptyA && fam.walletEmptyB, '★ S14 (#1290): both IXI variants are family drawings — decorative, ids unique per call, every ref local, il-* entrance pieces + twinkles, --il-* tokens, no card — ' + JSON.stringify(fam));

    /* —— (#1291) ONE inset: tx row content = tools = sync row (the cascade; jsdom has no layout) —— */
    await flush('all', [TX]);
    const cs = (sel) => { const e = q(sel); if (!e) return null; const c = s.W.getComputedStyle(e); return [c.paddingInlineStart || c.getPropertyValue('padding-inline-start'), c.paddingInlineEnd || c.getPropertyValue('padding-inline-end'), c.getPropertyValue('padding-inline')].join('|'); };
    const r5 = { row: cs('.c-wallet-txlist > .c-txlist-item'), tools: cs('.c-wallet-tools'), sync: cs('.c-scanprog') };
    const tok = (v) => !!v && /var\(--spacing-16\)/.test(v);
    ok(tok(r5.row) && r5.row === r5.tools && r5.tools === r5.sync,
      '★ S14 (#1291): the tx row insets its content on the SAME token as the search/chips row and the sync row (--spacing-16, logical → RTL mirrors) — ' + JSON.stringify(r5));
    ok(K.noErr(s.errs), '★ S14 E: the home shell raised no page error — ' + JSON.stringify(s.errs.slice(0, 3)));
    close();

    /* —— (#1289 follow-up) the empty-ledger "Missing a transaction?" link: only after the scan ended, the pill's flow —— */
    const linkShown = () => { const l = q('.c-wallet-misstx-link'); return !!l && !l.hidden; };
    /* open the sheet from `el`, press its action, return { label, verbs } — the bridge commands the flow sends */
    const flow = async (el) => {
      const b0 = s.sent.length;
      if (el) el.click();
      await sleep(80);
      const sh = [...s.d.querySelectorAll('.c-sheet')].pop();
      const out = { sheet: !!(sh && sh.querySelector('.c-misstx')), label: sh ? (sh.getAttribute('aria-label') || ((sh.querySelector('h2, [class*="title"]') || {}).textContent || '')) : null };
      const act = sh && [...sh.querySelectorAll('.c-button')].pop();
      if (act) act.click();
      await sleep(400);
      out.verbs = s.sent.slice(b0).filter((c) => /^ixian:/.test(c));
      return out;
    };
    s = await K.boot('index.html');
    s.push('selectTab', 'tab2');
    s.push('setScanProgress', '100', '600', '0', '0');           // scan running
    await flush('all', []);
    const r6a = { zero: !!q('.c-wallet-txlist > .c-empty-state'), sync: !q('.c-scanprog').hidden, link: linkShown() };
    s.push('setScanProgress', '600', '600', '100', '0');         // scan ended → the sync row goes
    await sleep(80);
    const lk = q('.c-wallet-misstx-link');
    const r6b = { syncGone: q('.c-scanprog').hidden, link: linkShown(), text: lk && lk.textContent, under: !!lk && !!lk.previousElementSibling && lk.previousElementSibling.classList.contains('c-empty-state__body') };
    const viaLink = await flow(lk);
    close();
    s = await K.boot('index.html');
    s.push('selectTab', 'tab2');
    s.push('setScanProgress', '600', '600', '100', '0');
    await flush('all', [TX]);
    const pill = q('.c-wallet-filters .c-wallet-misstx');
    const r6c = { noLink: !q('.c-wallet-misstx-link'), pill: toolsFull() && !!pill && !pill.hidden };
    const viaPill = await flow(pill);
    const same = viaLink.sheet && viaPill.sheet && viaLink.label === viaPill.label && viaLink.verbs.includes('ixian:explorer') && JSON.stringify(viaLink.verbs) === JSON.stringify(viaPill.verbs);
    ok(r6a.zero && r6a.sync && !r6a.link && r6b.syncGone && r6b.link && r6b.under && r6b.text === (pill && pill.getAttribute('aria-label')) && r6c.noLink && r6c.pill && same,
      '★ S14 (#1289 follow-up): empty + scan running → NO "Missing a transaction?" link (the sync row is the entry); empty + scan ended → the link under the zero-state line, same label as the pill, and its tap runs the PILL\'s flow (same sheet, same bridge send); with transactions → no link, the pill sits in the chips row — ' + JSON.stringify({ r6a, r6b, r6c, viaLink, viaPill }));
  } catch (e) {
    ok(false, '★ S14 E e-wallet threw: ' + e.message);
  } finally { close(); }
}
