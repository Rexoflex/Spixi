/* ==== SESSION 6a — ★ #1195 the chat-info media grid cap (Damir: "cap 9 now, shell only") + ★ #1194 the desktop
 * chat-info close probe (TEMPORARY, the [P1] set) ====
 * The cap on the BUILT contact_details shell (jsdom, the setSharedItems push); the probe (MAUI-bound C#) on stripCode
 * source. Deliberate breaks: DECISIONS #1194 / #1195. */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const htmlDir = join(root, 'Spixi/Resources/Raw/html');
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const guard = async (label, fn) => { try { await fn(); } catch (e) { ok(false, label + ' THREW: ' + (e && e.message)); } };
  const boot = async () => {
    const f = join(htmlDir, 'contact_details.html');
    const errs = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation/i.test(m)) errs.push(m); });
    const dom = new JSDOM(readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        const sym = Object.getOwnPropertySymbols(w.location).find((s) => s.description === 'impl');
        const impl = sym ? w.location[sym] : null;
        if (impl) Object.defineProperty(impl, 'href', { configurable: true, get() { return 'file://' + f; }, set() {} });
      },
    });
    await sleep(1500);
    const W = dom.window;
    const b64 = (v) => Buffer.from(String(v), 'utf8').toString('base64');
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map(b64));
    return { dom, W, push, errs };
  };
  const T = Math.floor(Date.now() / 1000);
  const media = (n) => Array.from({ length: n }, (_, i) => ['ab' + i.toString(16), 0, 'media', 'IMG_' + i + '.jpg', 1000, T - i * 10, 1, PNG, 1]);

  /* ——— 1. #1195: 12 media → 9 tiles in place + "Show all 12"; the full grid shows all 12; exactly 9 → no "Show all" ——— */
  await guard('#1195 cap', async () => {
    const { dom, W, push, errs } = await boot();
    const d = W.document;
    push('setContext', 'chat'); push('setAddress', '1A9xQpT7vKzm3NwR5bYc8LdE2fGh4JkPq'); push('setNickname', 'Ana');
    await sleep(300);
    push('setSharedItems', JSON.stringify(media(12)));
    await sleep(400);
    const r = {};
    r.nineInPlace = d.querySelectorAll('.c-shared__tile').length === 9;
    const all = d.querySelector('.c-shared__all');
    r.showAll12 = !!all && /12/.test(all.textContent || '');
    const S = W.Spixi;
    r.constant = S.SHARED_INLINE_MAX === 9;
    const full = S.createSharedList({ items: S.parseSharedItems(JSON.stringify(media(12))), tab: 'media', strings: {}, onOpen() {}, onBack() {} });
    r.fullGridAll = !!full && full.querySelectorAll('.c-shared__tile').length === 12;
    const exact = S.createSharedSection({ items: S.parseSharedItems(JSON.stringify(media(9))), strings: {}, onOpen() {}, onAll() {} });
    r.exactNoShowAll = !!exact && exact.querySelectorAll('.c-shared__tile').length === 9 && !exact.querySelector('.c-shared__all');
    r.noErrors = !errs.some((e) => /TypeError|ReferenceError/.test(e));
    ok(Object.values(r).every((x) => x === true),
      '★ #1195 CHAT-INFO GRID CAP on the BUILT contact_details shell (Damir: "cap 9 now, shell only"): 12 media → 9 tiles in place (3 rows) + "Show all 12"; the full grid shows all 12; exactly 9 → no "Show all" — ' + JSON.stringify(r) + ' ' + errs.slice(0, 2).join(' | '));
    try { dom.window.close(); } catch (e) {}
  });

  /* ——— 2. #1194 PROBE (TEMPORARY): the [P1] infopane close line carries from= tiles= previews= shown= shownPreviews= (integers only) ——— */
  {
    const hp = stripCode(readFileSync(join(root, 'Spixi/Pages/Home/HomePage.xaml.cs'), 'utf8'));
    const cd = stripCode(readFileSync(join(root, 'Spixi/Pages/Contacts/ContactDetails.xaml.cs'), 'utf8'));
    const r = {
      line: /P1Perf\.line\("infopane " \+ \(open \? "open" : "close"\)[^;]*\+ " from=" \+ \(long\)Math\.Round\(from\)\s*\+ " tiles=" \+ \(pane != null \? pane\.p1MediaTiles : -1\) \+ " previews=" \+ \(pane != null \? pane\.p1MediaPreviews : -1\)\s*\+ " shown=" \+ \(pane != null \? pane\.p1MediaShown : -1\) \+ " shownPreviews=" \+ \(pane != null \? pane\.p1MediaShownPreviews : -1\)\);/.test(hp),
      bothScans: (cd.match(/SharedItems\.toJson\(page\.p1NoteShared\(SharedItems\.scan\(scanned\)\)\)/g) || []).length === 2,
      counts: /if \(it\.kind == "media"\)\s*\{\s*tiles\+\+;\s*if \(it\.thumb != null\) previews\+\+;/.test(cd) && /p1MediaTiles = tiles;\s*p1MediaPreviews = previews;/.test(cd),
      /* ★ #46 r4 m3: shown= / shownPreviews= — the first 9 media rows in push order (the shell keeps C#'s order, reads 200 rows, slices 9) */
      shown: /if \(row < P1ShellRowsRead && shown < P1InlineMax\)\s*\{\s*shown\+\+;\s*if \(it\.thumb != null\) shownPreviews\+\+;\s*\}\s*\}\s*row\+\+;/.test(cd)
        && /p1MediaShown = shown;\s*p1MediaShownPreviews = shownPreviews;/.test(cd)
        && /private const int P1InlineMax = 9;/.test(cd) && /private const int P1ShellRowsRead = 200;/.test(cd),
      shellOrder: (() => { const sj = readFileSync(join(root, 'src/components/shared-items.js'), 'utf8');
        return /export const SHARED_INLINE_MAX = 9;/.test(sj) && /for \(const r of rows\.slice\(0, 200\)\)/.test(sj)
          && /list\.slice\(0, SHARED_INLINE_MAX\)/.test(sj) && !/\.sort\(/.test(sj.slice(sj.indexOf('export function parseSharedItems'), sj.indexOf('export function sharedLinkHost'))); })(),
      neverThrows: /internal System\.Collections\.Generic\.List<SharedItem> p1NoteShared\([^)]*\)\s*\{\s*try\s*\{[\s\S]*?\}\s*catch \(Exception\)\s*\{\s*\}\s*return items;\s*\}/.test(cd),
    };
    ok(Object.values(r).every(Boolean),
      '★ #1194 PROBE (TEMPORARY, the [P1] retire set): the desktop chat-info `[P1] infopane close` line adds from= (the column it shrinks from), tiles= and previews= (the media count and the ones with a preview, from the pane\'s last shared-items push, -1 = none yet), shown= / shownPreviews= (what the shell draws in place: the first 9 media rows in push order, #1195) — integers only; the counter never throws and returns the scan unchanged — ' + JSON.stringify(r));
  }
}
