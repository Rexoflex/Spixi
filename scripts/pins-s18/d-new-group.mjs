/* ==== #1361 (S18, Damir's pick A + the group identity card on top) — NEW GROUP ====
 * On the BUILT home shell (index.html, jsdom), through the real path: FAB → Create group → pick → the topbar ✓ (Next):
 *   · the members card: a header row "Members" · "n / 10", each chip led by a 24 px face (aria-hidden — the chip keeps its
 *     "<name>, remove" name and stays the whole dismiss target);
 *   · THE BUG FIX: down to 1 member, Create is DISABLED and the rule line (groupNeedsTwo + the info-circle glyph,
 *     role=status) sits INSIDE the members card — no name-field error, nothing sent; at 10 the line is groupLimitNote;
 *   · the hero: the #1358 band (the --identity-band token, the SAME token the address card's band reads — resolved
 *     value-identical to the #1358 picture in both themes), a camera badge on the photo and an action label that is
 *     itself the pick; after the C# photo push (loadGroupAvatar) the badge is a pencil and both say "Change group photo";
 *   · the blind disc wears --disc-hub-8; the blind switch's border is --outline-neutral-02; the screen sits on the
 *     settings ground with settings cards, and the body + footer cap at --layout-pane-content-max.
 * Rule-resolved = the winning declaration among the stylesheet rules that match the element (jsdom has no layout).
 * Deliberate breaks (S18 C report): `createBtn.disabled = list.length === 0` → the bug-fix clause; the rule line appended
 * to the body instead of the card → the bug-fix clause; groupNeedsTwo/LimitNote swapped → the cap clause; no face
 * prepended → the members clause; setGroupAvatar keeps the camera → the photo clause; the label's click listener dropped →
 * the photo clause; .c-addr-sheet__band back to the
 * literal gradient → the band clause; --disc-hub-8 → -7 on the blind disc → the disc/switch clause; the switch border
 * back to -01 → the disc/switch clause; the ground back to --surface-screen → the ground clause.
 * ★ #46 r1 (R3-MINOR-1 / NOTE2) the component clause: settle() without the disabled re-assert → failKeepsRule; submit
 * without the length check → forcedClickInert; renderMembers without the `if (!inFlight)` guard → noReenableMidFlight. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep, readFileSync, join, root } = h;
  const K = aKit(h);
  const iconsSrc = readFileSync(join(root, 'src/components/icons.js'), 'utf8');
  const glyphD = (name) => {
    const m = new RegExp('"' + name + '":(\\{"v":"[^"]*",\\s*"b":"(?:[^"\\\\]|\\\\.)*"\\})').exec(iconsSrc);
    return m ? ((/ d="([^"]+)"/.exec(JSON.parse(m[1]).b) || [])[1] || null) : null;
  };
  const svgD = (el) => { const p = el && el.querySelector('svg path'); return p ? p.getAttribute('d') : null; };
  /* the winning declaration of `prop` among the top-level style rules matching `el` (specificity, then source order) */
  const spec = (sel) => {
    const s = sel.replace(/:not\(([^)]*)\)/g, ' $1');
    const a = (s.match(/#[\w-]+/g) || []).length;
    const b = (s.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) || []).length;
    const c = (s.replace(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|::?[\w-]+(\([^)]*\))?/g, ' ').match(/[a-z][\w-]*/gi) || []).length;
    return a * 10000 + b * 100 + c;
  };
  const declared = (el, prop) => {
    let best = null, order = 0;
    for (const sh of el.ownerDocument.styleSheets) {
      let rules = [];
      try { rules = sh.cssRules; } catch (e) { continue; }
      for (const r of rules) {
        order++;
        if (!r.selectorText || !r.style) continue;          // @media / @supports blocks are not walked (none of these rules sit in one)
        const v = r.style.getPropertyValue(prop);
        if (!v) continue;
        for (const sel of r.selectorText.split(',')) {
          let m = false;
          try { m = el.matches(sel.trim()); } catch (e) {}
          if (!m) continue;
          const sp = spec(sel.trim());
          if (!best || sp > best.sp || (sp === best.sp && order > best.order)) best = { sp, order, v: v.trim(), sel: sel.trim() };
        }
      }
    }
    return best ? best.v : '';
  };
  /* resolve var() chains through the element's computed custom properties, then canonicalise (hex → rgb, spacing,
     trailing zeros) so a minified build and the #1358 source compare by VALUE */
  const resolve = (W, el, v) => { let n = 0; while (/var\(--[\w-]+\)/.test(v) && n++ < 10) v = v.replace(/var\((--[\w-]+)\)/g, (m0, k) => W.getComputedStyle(el).getPropertyValue(k).trim()); return v; };
  const canon = (v) => String(v).toLowerCase()
    .replace(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})\b/g, (m0, r, g, b) => 'rgb(' + parseInt(r, 16) + ',' + parseInt(g, 16) + ',' + parseInt(b, 16) + ')')
    .replace(/\s+/g, '').replace(/(^|[^\d])\.(\d)/g, '$10.$2').replace(/(\d\.\d*?)0+(?=[^\d]|$)/g, '$1').replace(/\.(?=[^\d])/g, '');
  /* the #1358 picture (wallet-receive.css at b7776acb, address-sheet-render.html A) — the token must keep it value-identical */
  const PICTURE = {
    light: canon('radial-gradient(60% 140% at 12% 0%, rgba(154, 122, 255, .85) 0%, transparent 70%), radial-gradient(55% 150% at 92% 10%, rgba(255, 142, 198, .80) 0%, transparent 70%), radial-gradient(70% 120% at 55% 120%, rgba(108, 159, 255, .75) 0%, transparent 70%), linear-gradient(180deg, #F3EFFF, #E2DCFD)'),
    dark: canon('radial-gradient(60% 140% at 12% 0%, rgba(91, 70, 240, .85) 0%, transparent 70%), radial-gradient(55% 150% at 92% 10%, rgba(192, 63, 147, .80) 0%, transparent 70%), radial-gradient(70% 120% at 55% 120%, rgba(47, 99, 255, .75) 0%, transparent 70%), linear-gradient(180deg, #1D1A3D, #14122C)'),
  };
  const NEEDS_TWO = 'Select at least 2 people to create a group.';
  const LIMIT = 'A group can have up to 10 members besides you.';
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const people = Array.from({ length: 12 }, (_, i) => ['G' + String(i).padStart(2, '0') + 'member' + 'x'.repeat(42), 'Person ' + (i + 1)]);
  const r = { members: {}, fix: {}, cap: {}, photo: {}, band: {}, disc: {}, ground: {}, comp: {} };
  let s = null;
  try {
    s = await K.boot('index.html', { wait: 1500 });
    const { d, W } = s;
    s.push('addContacts', JSON.stringify({ strs: [], items: people.map(([a, n]) => ({ f: 'addContact', a: [a, n, '', 'False', '0', 'contact', ''] })) }));
    await sleep(200);
    d.getElementById('fab').click();
    await sleep(400);
    [...d.querySelectorAll('.c-contacts__action')].find((b) => /Create group/.test(b.textContent)).click();
    await sleep(100);
    const rowFor = (a) => d.querySelector('.c-contacts__row[data-address="' + a + '"]');
    for (let i = 0; i < 3; i++) rowFor(people[i][0]).click();
    d.querySelector('.c-contacts .c-topbar__actions button').click();
    await sleep(400);
    let g = d.querySelector('.c-contacts-group');
    const parts = (gp) => ({
      head: gp.querySelector('.c-contacts-group__members-head'),
      card: gp.querySelector('.c-contacts-group__members'),
      chips: () => [...gp.querySelectorAll('.c-contacts-group__chips > .c-chip')],
      rule: gp.querySelector('.c-contacts-group__rule'),
      create: gp.querySelector('.c-contacts__footer .c-button'),
      nameErr: gp.querySelector('.c-contacts-add__error'),
    });
    let P = parts(g);
    /* —— members: header row + faces —— */
    const t = P.head.querySelector('.c-contacts-group__members-title'), c = P.head.querySelector('.c-contacts-group__members-count');
    r.members.head = !!t && t.textContent === 'Members' && !!c && c.textContent === '3 / 10' && P.head.firstElementChild === t && P.head.lastElementChild === c;
    r.members.faces = P.chips().length === 3 && P.chips().every((ch, i) => {
      const f = ch.firstElementChild;
      return !!f && f.matches('.c-avatar[data-size="24"]') && f.getAttribute('aria-hidden') === 'true'
        && ch.getAttribute('aria-label') === 'Person ' + (i + 1) + ', remove' && ch.tagName === 'BUTTON' && !ch.querySelector('button');
    });
    r.members.twoToNine = P.rule.hidden && !P.create.disabled;
    /* —— the bug fix: down to 1 member —— */
    P.chips()[0].click();
    P.chips()[0].click();
    g.querySelector('.c-contacts-group__name').value = 'Weekend hike';
    const sentBefore = s.sent.length;
    P.create.click();
    await sleep(50);
    r.fix.count = c.textContent === '1 / 10' && P.chips().length === 1;
    r.fix.disabled = P.create.disabled === true && P.create.getAttribute('aria-describedby') === P.rule.id;
    r.fix.lineInCard = !P.rule.hidden && P.rule.parentElement === P.card && P.card.lastElementChild === P.rule
      && P.rule.textContent.trim() === NEEDS_TWO && P.rule.getAttribute('role') === 'status' && svgD(P.rule) === glyphD('info-circle');
    r.fix.nothingSent = !s.sent.slice(sentBefore).some((x) => /^ixian:creategroup/.test(x)) && P.nameErr.hidden;
    /* —— the hero photo: camera + the label are the pick; the C# push turns them to "change" —— */
    const av = g.querySelector('.c-contacts-group__avatar'), lab = g.querySelector('.c-contacts-group__photo-label'), badge = g.querySelector('.c-contacts-group__badge');
    r.photo.before = !!glyphD('camera') && !!glyphD('pencil') && glyphD('camera') !== glyphD('pencil') && !!av && !!lab && !!badge && av.contains(badge) && svgD(badge) === glyphD('camera')
      && av.getAttribute('aria-label') === 'Set group photo' && lab.tagName === 'BUTTON' && lab.textContent === 'Set group photo';
    const picks = () => s.sent.filter((x) => x === 'ixian:groupavatar').length;
    lab.click();                                                   // the LABEL alone is the pick
    const byLabel = picks();
    av.click();                                                    // pending pick: the one latch holds
    r.photo.labelPicks = byLabel === 1 && picks() === 1;
    s.push('loadGroupAvatar', PNG);
    await sleep(50);
    r.photo.after = !!av.querySelector('img.c-contacts-group__avatar-img') && av.contains(badge) && svgD(badge) === glyphD('pencil')
      && av.getAttribute('aria-label') === 'Change group photo' && lab.textContent === 'Change group photo';
    av.click();
    r.photo.released = picks() === 2;
    /* —— the band: ONE token for the hero and the address card, the #1358 picture in both themes —— */
    const hero = g.querySelector('.c-contacts-group__hero');
    const band = hero && hero.firstElementChild;
    W.Spixi.openAddressSheet({ address: '4JsLSmAF4yp3j1T5gcrAkiFF2fYJSe4XM7rJBngtPmPUw2kL5AXKvvwg5yYbncdFa', host: d.body, name: 'Shang Tsung' });
    await sleep(100);
    const aBand = d.querySelector('.c-addr-sheet__band');
    r.band.oneToken = !!band && band.matches('.c-contacts-group__band') && band.getAttribute('aria-hidden') === 'true' && !!aBand
      && declared(band, 'background') === 'var(--identity-band)' && declared(aBand, 'background') === 'var(--identity-band)';
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') d.documentElement.setAttribute('data-theme', 'dark'); else d.documentElement.removeAttribute('data-theme');
      r.band[theme] = canon(resolve(W, band, declared(band, 'background'))) === PICTURE[theme]
        && canon(resolve(W, aBand, declared(aBand, 'background'))) === PICTURE[theme];
    }
    d.documentElement.removeAttribute('data-theme');
    W.Spixi.closeAddressSheet();
    /* —— the blind disc + the switch —— */
    const disc = g.querySelector('.c-contacts-group__blind .c-disc');
    r.disc.hub8 = !!disc && declared(disc, 'background') === 'var(--disc-hub-8)';
    r.disc.switchBorder = /var\(--outline-neutral-02\)/.test(declared(g.querySelector('.c-contacts-group__switch'), 'border'));
    /* —— ground, cards, the 640 column —— */
    r.ground.screen = declared(g, 'background') === 'var(--surface-settings-ground)'
      && declared(g.querySelector('.c-contacts__footer'), 'background') === 'var(--surface-settings-ground)';
    r.ground.cards = [hero, P.card, g.querySelector('.c-contacts-group__blind').parentElement].every((x) => declared(x, 'background') === 'var(--surface-settings-card)');
    /* re-based in S18 merge (wide-frame measure): the body caps its CARDS (max-width + auto margins), the footer by padding */
    r.ground.column = /max\(var\(--spacing-16\),\s*calc\(\(100% - var\(--layout-pane-content-max\)\) \/ 2\)\)/.test(declared(g.querySelector('.c-contacts__footer'), 'padding-inline'))
      && [...g.querySelectorAll('.c-contacts-group__body > .c-contacts__group')].every((x) => /var\(--layout-pane-content-max\)/.test(declared(x, 'max-width')) && /auto/.test(declared(x, 'margin-inline')));
    /* —— the cap: back to the picker (the 3 picks are kept), pick 7 more → 10 —— */
    g.querySelector('.c-topbar .c-button').click();
    await sleep(100);
    for (let i = 3; i < 10; i++) rowFor(people[i][0]).click();
    d.querySelector('.c-contacts .c-topbar__actions button').click();
    await sleep(400);
    g = d.querySelector('.c-contacts-group');
    P = parts(g);
    r.cap.ten = P.chips().length === 10 && P.head.querySelector('.c-contacts-group__members-count').textContent === '10 / 10'
      && !P.rule.hidden && P.rule.parentElement === P.card && P.rule.textContent.trim() === LIMIT && svgD(P.rule) === glyphD('info-circle')
      && !P.create.disabled;
    /* —— ★ #46 R3-MINOR-1 / R3-NOTE2: the component itself, through the bundle (W.Spixi.createGroupSetup) — a request in
       flight while chips are removed, then the C# failure; and a force-enabled Create at 1 member —— */
    const calls = [];
    let held = null;
    const gs = W.Spixi.createGroupSetup({
      members: people.slice(0, 3).map(([a, n]) => ({ address: a, name: n })),
      onCreate: (payload, ctrl) => { calls.push(payload); held = ctrl; },
    });
    d.body.append(gs);
    const C = parts(gs);
    const gsName = gs.querySelector('.c-contacts-group__name');
    gsName.value = 'Trip';
    C.create.click();
    await sleep(30);
    r.comp.held = calls.length === 1 && !!held && calls[0].addresses.length === 3 && C.create.disabled === true;
    C.chips()[0].click();                                  // 3 → 2 mid-flight: the rule says nothing, Create must STAY off
    await sleep(10);
    r.comp.noReenableMidFlight = C.chips().length === 2 && C.create.disabled === true;
    C.chips()[0].click();                                  // 2 → 1 mid-flight
    await sleep(10);
    held.fail();
    await sleep(30);
    r.comp.failKeepsRule = C.chips().length === 1 && C.create.disabled === true && C.create.getAttribute('aria-describedby') === C.rule.id
      && !C.rule.hidden && C.rule.textContent.trim() === NEEDS_TWO;
    gsName.dispatchEvent(new W.Event('input', { bubbles: true }));   // clears the failure's name line
    C.create.disabled = false;                             // a stale / forced enable at 1 member
    C.create.click();
    await sleep(30);
    r.comp.forcedClickInert = calls.length === 1 && C.nameErr.hidden;
    gs.remove();
    r.noErrors = K.noErr(s.errs.filter((e) => !/Could not parse CSS/.test(e)));
  } catch (e) { r.threw = e.message; }
  finally { if (s && s.close) s.close(); }
  const all = (o) => Object.values(o).every((v) => v === true);
  ok(all(r.members) && r.noErrors === true && !r.threw,
    '★ #1361 members (the real path FAB → Create group → 3 picks → Next): the card head is ONE row, "Members" at the start and "3 / 10" at the end; every chip is led by a 24 px face (aria-hidden) and keeps its "<name>, remove" name as ONE button; with 2–9 members the rule line is gone and Create is live — ' + JSON.stringify(r.members) + (r.threw ? ' threw: ' + r.threw : ''));
  ok(all(r.fix),
    '★★ #1361 THE BUG FIX: two chips removed → 1 member: the head says "1 / 10", Create is DISABLED (described by the rule line), the rule line — "' + NEEDS_TWO + '" + the info-circle glyph, role=status — is the LAST child of the members card, and a tap on Create sends nothing and raises no name-field error (the old `=== 0` let 1 member reach a host error under the NAME) — ' + JSON.stringify(r.fix));
  ok(all(r.comp) && Object.keys(r.comp).length === 4,
    '★ #46 R3-MINOR-1 / R3-NOTE2 (component, W.Spixi.createGroupSetup): 3 members, named, Create → the request is HELD; removing a chip mid-flight (3 → 2) never re-enables Create; down to 1, held.fail() leaves Create DISABLED and described by the rule line ("' + NEEDS_TWO + '") — settle() re-asserts the member rule; a Create force-enabled at 1 member reaches no onCreate and raises no name error (submit\'s own length check) — ' + JSON.stringify(r.comp));
  ok(all(r.cap),
    '★ #1361 the cap: back to the picker, 10 picked → Next: "10 / 10", the rule line in the card is "' + LIMIT + '" with its glyph, and Create stays live — ' + JSON.stringify(r.cap));
  ok(all(r.photo),
    '★ #1361 the photo: a camera badge on the 88 px photo and an action label that is itself a button doing the SAME pick (one latch — a second tap while pending sends nothing); the C# loadGroupAvatar push puts the photo in, turns the badge to a pencil and both the photo button\'s name and the label to "Change group photo"; the latch releases — ' + JSON.stringify(r.photo));
  ok(all(r.band),
    '★★ #1361 tokens first: the hero band (the hero\'s first child, aria-hidden) and the address card\'s .c-addr-sheet__band both declare var(--identity-band), and that token resolves VALUE-IDENTICAL to the #1358 picture in light AND dark — ' + JSON.stringify(r.band));
  ok(all(r.disc),
    '★ #1361: the blind disc wears the hub violet (rule-resolved var(--disc-hub-8)) and the blind switch\'s border is --outline-neutral-02 (the settings switch; the local copy had drifted to -01, the card colour in dark) — ' + JSON.stringify(r.disc));
  ok(all(r.ground),
    '★ #1361: the group screen and its footer sit on --surface-settings-ground, the hero / members / blind cards are --surface-settings-card, and the body + footer column caps at --layout-pane-content-max, centred (#1362) — ' + JSON.stringify(r.ground));
}
