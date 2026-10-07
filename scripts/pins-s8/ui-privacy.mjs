/* ==== SESSION 8 (S2) — ★ S8 (#1234) THE THREE PRIVACY SWITCHES ON THE SETTINGS PAGE ====
 * On the BUILT settings.html (jsdom), C# pushes via executeUiCommand, verbs captured at the href setter:
 *   · with the caps readReceipts · typing · hideOnline the Privacy screen shows the three rows, seeded by
 *     setReadReceipts / setTypingIndicators / setHideOnline; "Hide my online status" exists and each sub says the
 *     reciprocal rule (the honest #1234 texts)
 *   · a tap sends ixian:readReceipts:off · ixian:typingIndicators:on · ixian:hideOnline:on (optimistic flip), the
 *     matching echo keeps it; an echo that disagrees rolls the switch back to the STORED value
 *   · an echo with no tap in flight moves the mounted switch in place
 *   · no cap → no row (an old exe never gets a verb nobody dispatches)
 * Deliberate breaks: see the S8 S2 hand-back. */
import { uiKit } from './ui-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = uiKit(h);
  const openPrivacy = async (s) => {
    const b = [...s.d.querySelectorAll('button, [role="button"]')].find((x) => /^\s*Privacy/.test(x.textContent || ''));
    if (b) b.click();
    await sleep(200);
  };
  const sw = (d, k) => d.querySelector('[data-pref="' + k + '"] .c-settings__switch');
  const sub = (d, k) => { const r = d.querySelector('[data-pref="' + k + '"] .c-settings__row-sub'); return r ? r.textContent : ''; };
  try {
    let s = await boot('settings.html', { mobile: true, wait: 1200 });
    let { d, push, sent } = s;
    push('setCaps', 'readReceipts,typing,hideOnline');
    push('setReadReceipts', 'True'); push('setTypingIndicators', 'False'); push('setHideOnline', 'False');
    await sleep(250);
    /* ★ S8 r1 (B-NIT): the hub row's sub-line names the whole screen, not 1 of its 5 rows */
    const hubRow = [...d.querySelectorAll('button, [role="button"]')].find((x) => /^\s*Privacy/.test(x.textContent || ''));
    const hubSub = hubRow && hubRow.querySelector('.c-settings__row-sub');
    ok(!!hubSub && hubSub.textContent === 'Read receipts, typing, online status and media',
      '★ S8 #1234 privacy: the Settings hub "Privacy" sub-line describes the screen — ' + JSON.stringify(hubSub && hubSub.textContent));
    await openPrivacy(s);
    /* ★ S8 r1 (B-NIT): each of the 3 switches is described by its own hint (aria-describedby → that row's sub) */
    const described = ['readReceipts', 'typingIndicators', 'hideOnline'].map((k) => {
      const x = sw(d, k); const id = x && x.getAttribute('aria-describedby');
      const el = id && d.getElementById(id);
      return !!el && el.closest('[data-pref]') === x.closest('[data-pref]') && el.classList.contains('c-settings__row-sub') && el.textContent === sub(d, k) && sub(d, k).length > 0;
    });
    ok(described.every(Boolean), '★ S8 #1234 privacy: each switch has aria-describedby → its own hint — ' + described.join(','));
    const seeded = ['readReceipts', 'typingIndicators', 'hideOnline'].map((k) => sw(d, k) && sw(d, k).getAttribute('aria-checked')).join(',');
    const label = (d.querySelector('[data-pref="hideOnline"]') || {}).textContent || '';
    ok(seeded === 'true,false,false', '★ S8 #1234 privacy: the three rows render with the pushed values — ' + seeded);
    ok(/Hide my online status/.test(label)
      && /you don’t see when they read yours/.test(sub(d, 'readReceipts'))
      && /you don’t see when they type/.test(sub(d, 'typingIndicators'))
      && /Older apps and the network can still see when you are online/.test(sub(d, 'hideOnline')),
    '★ S8 #1234 privacy: "Hide my online status" exists and every sub states the reciprocal rule');

    let n0 = sent.length;
    sw(d, 'readReceipts').click(); sw(d, 'typingIndicators').click(); sw(d, 'hideOnline').click();
    await sleep(30);
    const verbs = JSON.stringify(sent.slice(n0));
    ok(verbs === '["ixian:readReceipts:off","ixian:typingIndicators:on","ixian:hideOnline:on"]', '★ S8 #1234 privacy: the taps send the three verbs — ' + verbs);
    push('setReadReceipts', 'False'); push('setTypingIndicators', 'True');
    push('setHideOnline', 'False');            // C# stored OFF → the hide switch must roll back
    await sleep(250);
    const after = ['readReceipts', 'typingIndicators', 'hideOnline'].map((k) => sw(d, k).getAttribute('aria-checked')).join(',');
    ok(after === 'false,true,false', '★ S8 #1234 privacy: matching echoes keep the flip, a disagreeing echo rolls back to the stored value — ' + after);
    push('setHideOnline', 'True');             // no tap in flight → in place
    await sleep(250);
    ok(sw(d, 'hideOnline') && sw(d, 'hideOnline').getAttribute('aria-checked') === 'true', '★ S8 #1234 privacy: an echo with no tap in flight moves the mounted switch in place');
    s.dom.window.close();

    s = await boot('settings.html', { mobile: true, wait: 1200 });
    s.push('setCaps', 'photoPreviews');
    await sleep(250);
    await openPrivacy(s);
    const none = ['readReceipts', 'typingIndicators', 'hideOnline'].every((k) => !s.d.querySelector('[data-pref="' + k + '"]'));
    ok(none && !!s.d.querySelector('.c-settings-privacy'), '★ S8 #1234 privacy: without the caps the three rows are absent');
    s.dom.window.close();
    /* ★ S8 r1 (B-NIT): the three retired privacy keys (the old shared note + the one-way subs) are gone from every draft */
    const { readdirSync, readFileSync, join, root } = h;
    const dir = join(root, 'src/strings/draft');
    const stale = readdirSync(dir).filter((f) => /^[a-z]{2}-[a-z]{2}\.json$/.test(f)).filter((f) => {
      const o = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      return ['privacyNote', 'readReceiptsSub', 'typingIndicatorsSub'].some((k) => Object.prototype.hasOwnProperty.call(o, k));
    });
    ok(stale.length === 0, '★ S8 #1234 privacy: no draft locale keeps privacyNote / readReceiptsSub / typingIndicatorsSub — ' + (stale.join(',') || 'none'));
  } catch (e) {
    ok(false, '★ S8 #1234 privacy: pin threw — ' + (e && e.stack || e));
  }
}
