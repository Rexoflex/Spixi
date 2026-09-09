/**
 * i18n extraction sweep (DECISIONS §B①–③ · handoff-desktop-toprow-i18n-next.md).
 *
 * Sweeps every component in src/components for the canonical string pattern
 *   strings.<key> || '<english fallback>'
 * (single- or double-quoted, and multi-line `+`-concatenated fallbacks), plus
 * the dynamic `strings['<prefix>' + var]` families whose keys come from data
 * tables (resolved from a small curated map below — enumerable and bounded).
 * A4: ALSO sweeps src/shells/*.html for the shell-inline receiver forms
 * (`s.key || '…'` / `sl.key || '…'` / `window.SL.key || '…'`) — these keys
 * were never extracted, so they could never be translated in any locale.
 * It then:
 *   - emits the canonical en-us dictionary (src/strings/en-us.js + .json),
 *   - infers a render CONTEXT per key (component, kind, length) for translators,
 *   - maps each key to a legacy SpixiLocalization id (Resources/Raw/lang/en-us.txt)
 *     by English-value match, so shipped translations can be reused,
 *   - writes the translator context sheet (docs/i18n-strings.md).
 *
 * Run:  node scripts/extract-strings.mjs [--root <dir>] [--check]
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const rootArg = argv.includes('--root') ? argv[argv.indexOf('--root') + 1] : null;
const CHECK_ONLY = argv.includes('--check');
const ROOT = rootArg ? rootArg : join(__dirname, '..');

const COMPONENTS_DIR = join(ROOT, 'src', 'components');
const SHELLS_DIR = join(ROOT, 'src', 'shells');   // A4: shell-inline keys were NEVER swept → untranslatable in every locale
const LEGACY_TXT = join(ROOT, 'Spixi', 'Resources', 'Raw', 'lang', 'en-us.txt');
const OUT_JS = join(ROOT, 'src', 'strings', 'en-us.js');
const OUT_JSON = join(ROOT, 'src', 'strings', 'en-us.json');
const OUT_DOC = join(ROOT, 'docs', 'i18n-strings.md');
const SKIP = new Set(['icons.js', 'icons.iife.js']);

const DYNAMIC = {
  cap_MultiUser: 'Multi-user',
  cap_Authentication: 'Sign in as you',
  cap_TransactionSigning: 'Sign transactions',
  cap_RegisteredNamesManagement: 'Manage names',
  cap_Storage: 'Local storage',
  capx_MultiUser: 'Runs shared sessions so you can use this app together with friends.',
  capx_Authentication: 'Can prove who you are to this app using your Spixi identity, without a password.',
  capx_TransactionSigning: 'Can ask you to approve IXI payments. You always confirm each one yourself.',
  capx_RegisteredNamesManagement: 'Can read and manage your registered Ixian names.',
  capx_Storage: 'Can save data on your device so it remembers things between sessions.',
  'status-sending': 'Sending',
  'status-sent': 'Sent',
  'status-delivered': 'Delivered',
  'status-read': 'Read',
  'status-failed': 'Failed',
  chatsFilter_all: 'All',
  chatsFilter_unread: 'Unread',
  chatsFilter_favorites: 'Favorites',
  chatsFilter_groups: 'Groups',
  chatsFilter_requests: 'Requests',
  themeSystem: 'System',
  themeLight: 'Light',
  themeDark: 'Dark',
  /* ★ Session M (#783): `patternOff` and `patternDefault` were HERE, and they are gone.
   * They labelled the pattern-intensity picker, and Session M folded that control into the
   * Background row. Deleting a row from this table is what removes the key from en-us.json
   * and therefore from every locale on the next build-locales run.
   * ⚠ THE TRAP THIS PAIR RECORDS, kept because it is about the table and not about them:
   * a dynamic key is read as strings[o.key], so renaming or retiring one in a component
   * changes NOTHING until this table changes too. Both i18n gates are blind by
   * construction — they compare locales against EACH OTHER, so a key missing from all of
   * them stays perfectly "consistent". */
  /* ★★ AUG GROUND (Damir 2026-08-30): the light canvas choice. These two are dynamic
     (`strings[o.key]` off CHAT_GROUNDS) so the sweep cannot see them — the same reason
     every other key in this table is listed here.
     ★★ #855 — HELD, NOT RETIRED, and the distinction is Damir's own word. He retired the
     gradient OPTION "for now", which leaves CHAT_GROUNDS with one member, which hides the
     whole Canvas row (a one-option chooser reads as a broken control — his 2026-09-04
     ruling). So all three of these — plus `chatGround`, the row's label — are currently
     UNREAD.
     ⚠ THE TABLE'S USUAL RULE IS "a key nothing reads is a key that rots", and #853 applied
     it to patternStyleDoodles/Flow an hour earlier. These are the exception for the reason
     `--chat-pattern-alpha-2` is: the control is ONE LINE from returning, the twelve
     translations already exist and are good, and dropping them means re-drafting all of
     them to restore a row that was never redesigned. Retiring them is correct the day the
     option is retired for good rather than "for now" — and that is a decision, not a tidy-up. */
  groundFlat: 'Solid',
  groundGradient: 'Gradient',
  // #341 review MINOR-4: PATTERN_STYLES is read as strings[o.key], so it is
  // unextractable and MUST live here. It did not, so the
  // three style names existed in the locale files only until the next extract run —
  // and that run silently deleted every translation of them. Both i18n gates were
  // blind to it: they compare locales against each other, and a key dropped from
  // ALL of them stays "consistent".
  /* ★★ #835: patternStyleDoodles and patternStyleFlow REMOVED with their styles (Damir,
     2026-09-09) — the same removal E1 made for patternStyleTriangles / patternStyleLineArt,
     and for the same reason: a key nothing reads is a key that rots. Deleting the row here
     is what actually drops it from en-us.json and therefore from all twelve locales, which
     is exactly the trap the note above this table records — retiring a style in the
     COMPONENT changes nothing until this table changes too, and both i18n gates are blind
     to it because they compare locales against each other. */
  patternStyleMatrix: 'Data matrix',
  textS: 'S',
  textM: 'M',
  textL: 'L',
  textXL: 'XL',
  tierBasic: 'Basic',
  tierBasicDesc: 'Convenience first. Lock optional, previews on, receipts on.',
  tierModerate: 'Moderate',
  tierModerateDesc: 'Balanced. Lock required, auto-lock after 5 minutes, sender-only previews.',
  tierStrict: 'Strict',
  tierStrictDesc: 'Privacy first. Immediate auto-lock, no previews, receipts and typing off.',
  tierCustom: 'Custom',
  tierCustomDesc: 'Your individual Security & privacy settings apply as-is.',
  sdOff: 'Off',
  sdHour: '1 hour',
  sdDay: '1 day',
  sdWeek: '1 week',
  filterAll: 'All',
  filterSent: 'Sent',
  filterReceived: 'Received',
  txConfirmed: 'Confirmed',
  txPending: 'Pending',
  txFailed: 'Failed',
  txUnknown: 'Unknown',
  sendFile: 'Send file',
  photo: 'Photo',
  gif: 'GIF',
  sendPayment: 'Send payment',
  requestPayment: 'Request payment',
  appInvite: 'App invite',
  backupInsideIdentity: 'Identity',
  backupInsideIdentitySub: 'Your account and its keys',
  backupInsideWallet: 'Wallet',
  backupInsideWalletSub: 'Your funds stay yours',
  backupInsideContacts: 'Contacts',
  backupInsideContactsSub: 'Everyone you’ve connected with',
  backupInsideAvatar: 'Avatar',
  backupInsideAvatarSub: 'Your profile photo',
};
const DYNAMIC_SOURCES = {
  cap_: 'apps-details.js (capLabel, APP_CAP_LABELS)',
  capx_: 'apps-details.js (capExplain, APP_CAP_EXPLAIN)',
  'status-': 'message-bubble.js (status glyph aria-label)',
  chatsFilter_: 'chats-header.js (CHATS_FILTERS)',
  theme: 'settings-shell.js (THEME_OPTIONS)',
  /* ★ Session M (#783): this row named PATTERN_LEVELS, which no longer exists. The prefix
     still has readers — patternNone and the three patternStyle* names — so the row is
     retargeted rather than deleted; deleting it would drop those four to "dynamic". */
  pattern: 'settings-screens.js (PATTERN_STYLES, bgOpts)',
  text: 'settings-screens.js (TEXT_SIZES)',
  tier: 'settings-screens.js (TIERS)',
  sd: 'chat-info.js (disappearing-message options)',
  filter: 'wallet-shell.js (TX_FILTERS)',
  tx: 'wallet-shell.js / txlist-item.js (TX status meta)',
  send: 'attach-sheet.js (ATTACH_ITEMS)',
  photo: 'attach-sheet.js (ATTACH_ITEMS)',
  gif: 'attach-sheet.js (ATTACH_ITEMS)',
  app: 'attach-sheet.js (ATTACH_ITEMS)',
  backupInside: 'settings-backup.js (what’s-inside tiles)',
};

const ESC = { n: '\n', t: '\t', r: '\r', "'": "'", '"': '"', '`': '`', '\\': '\\', '/': '/', '0': '\0', b: '\b', f: '\f', v: '\v' };

function parseStringLiteral(src, i) {
  const q = src[i];
  if (q !== "'" && q !== '"' && q !== '`') return null;
  let s = '';
  i++;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') {
      const n = src[i + 1];
      if (n === 'u') {
        if (src[i + 2] === '{') {
          const close = src.indexOf('}', i + 3);
          s += String.fromCodePoint(parseInt(src.slice(i + 3, close), 16));
          i = close + 1; continue;
        }
        s += String.fromCharCode(parseInt(src.slice(i + 2, i + 6), 16));
        i += 6; continue;
      }
      if (n === 'x') {
        s += String.fromCharCode(parseInt(src.slice(i + 2, i + 4), 16));
        i += 4; continue;
      }
      s += (n in ESC) ? ESC[n] : n;
      i += 2; continue;
    }
    if (q === '`' && c === '$' && src[i + 1] === '{') return { value: s, end: i, template: true };
    if (c === q) return { value: s, end: i + 1 };
    s += c; i++;
  }
  return null;
}
function skipWs(src, i) { while (i < src.length && /\s/.test(src[i])) i++; return i; }
function parseFallback(src, i) {
  const first = parseStringLiteral(src, i);
  if (!first || first.template) return null;
  let value = first.value, end = first.end;
  for (;;) {
    const j = skipWs(src, end);
    if (src[j] !== '+') break;
    const k = skipWs(src, j + 1);
    const next = parseStringLiteral(src, k);
    if (!next || next.template) break;
    value += next.value; end = next.end;
  }
  return { value, end };
}
function lineOf(src, idx) { let n = 1; for (let i = 0; i < idx; i++) if (src[i] === '\n') n++; return n; }
function kindAround(src, idx) {
  const from = src.lastIndexOf('\n', idx - 1) + 1;
  let to = src.indexOf('\n', idx); if (to < 0) to = src.length;
  const ctx = src.slice(Math.max(from - 80, 0), to).toLowerCase();
  if (ctx.includes('aria-label') || ctx.includes("setattribute('aria")) return 'aria';
  if (/\bplaceholder\b/.test(ctx)) return 'placeholder';
  if (/badgelabel|badgetype|createbadge|\bbadge\b/.test(ctx)) return 'badge';
  if (/\btitle\s*[:=]/.test(ctx) || ctx.includes('title:')) return 'title';
  if (/failmsg|failed|error|showerr|couldn/.test(ctx)) return 'error';
  if (/\blabel\s*[:=]|label\.textcontent|\blabel\b/.test(ctx)) return 'label';
  if (ctx.includes('.textcontent') || ctx.includes('textcontent =')) return 'text';
  return 'text';
}

/* —— the comment mask (Session T) ———————————————————————————————————————————
 * ★★ THE DEFECT THIS CLOSES. The component sweep tested for a comment AFTER it had
 * already recorded a fallback-carrying site and `continue`d, so the guard only ever
 * protected BARE references — and its own comment said "skip matches inside comments",
 * an invariant the code did not enforce (#772). The cost shipped: `settings-app.js`
 * explains the sweep by QUOTING the canonical pattern inside its docblock, that
 * quotation was scraped as a real reference, and the key it invented rode all thirteen
 * dictionaries. #771 in its oldest costume — the prose is the sweep's input.
 *
 * ⚠ WHY A MASK AND NOT A WIDER LINE TEST. The old test was line-oriented (`//` earlier
 * on the line, or a line trimmed to `*`/`/*`), which cannot see a block comment whose
 * continuation lines carry no leading star. Blanking the comment SPANS answers the
 * question the sweep is actually asking, and it answers it the same way for every form.
 *
 * ⚠ COMMENT BYTES ONLY. String and template bodies are left INTACT: a template literal
 * carries live code inside `${…}`, so blanking string bodies would blind the sweep to
 * real sites. Strings and regex literals are tracked solely so a `//` inside one of them
 * ("https://…", /\/\//) cannot open a comment. Length and newlines are preserved, so
 * every index into the mask is valid in the ORIGINAL source — which is what lets the
 * fallback be parsed out of `src` at a position found in `masked`. */
function maskComments(src) {
  const out = src.split('');
  const blank = (a, b) => { for (let i = a; i < b && i < out.length; i++) if (out[i] !== '\n') out[i] = ' '; };
  let i = 0, prev = '';
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { let j = src.indexOf('\n', i); if (j < 0) j = src.length; blank(i, j); i = j; continue; }
    if (c === '/' && src[i + 1] === '*') { let j = src.indexOf('*/', i + 2); j = j < 0 ? src.length : j + 2; blank(i, j); i = j; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < src.length) { if (src[j] === '\\') { j += 2; continue; } if (src[j] === c) { j++; break; } j++; }
      i = j; prev = '"'; continue;
    }
    /* a '/' here is a regex literal only where an operand cannot be — otherwise it is
       division, and consuming to the next '/' would swallow real code. */
    if (c === '/' && /[(,=:[!&|?{};+\-*%~^<>]/.test(prev)) {
      let j = i + 1, cls = false;
      while (j < src.length) {
        const d = src[j];
        if (d === '\\') { j += 2; continue; }
        if (d === '[') cls = true; else if (d === ']') cls = false;
        else if (d === '/' && !cls) { j++; break; }
        else if (d === '\n') break;
        j++;
      }
      i = j; prev = '/'; continue;
    }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out.join('');
}

/* The HTML form. A shell is markup, and `</div>` puts a '/' after a '<' on nearly
 * every line — exactly the operand position the regex-literal rule above reads as the
 * start of a literal, and a URL's "https://" is not a comment either. So the JS mask is
 * applied ONLY inside <script> regions, where its rules are the right ones; everything
 * outside is left byte-for-byte. Offsets are preserved, so callers index the original. */
function maskCommentsHtml(src) {
  let out = src;
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(src))) {
    const a = m.index + m[0].indexOf('>') + 1, b = a + m[1].length;
    out = out.slice(0, a) + maskComments(src.slice(a, b)) + out.slice(b);
  }
  return out;
}

const dict = new Map();
const conflicts = [];
const bareRefs = new Map();
const dynamicSites = [];
function record(key, value, file, line, kind) {
  const comp = basename(file);
  if (dict.has(key)) {
    const e = dict.get(key);
    if (e.value !== value) conflicts.push({ key, existing: e.value, incoming: value, file: comp, line });
    e.sources.push(`${comp}:${line}`); e.kinds.add(kind); e.component.add(comp); return;
  }
  dict.set(key, { value, sources: [`${comp}:${line}`], kinds: new Set([kind]), component: new Set([comp]) });
}

const files = readdirSync(COMPONENTS_DIR).filter((f) => f.endsWith('.js') && !SKIP.has(f)).sort();
for (const f of files) {
  const src = readFileSync(join(COMPONENTS_DIR, f), 'utf8');
  /* ★ THE SCAN RUNS OVER THE MASK, THE PARSE OVER THE SOURCE. Comment bytes are blanked
     in `masked` at the same offsets, so a docblock that quotes the canonical pattern
     yields no match at all — the guard now runs BEFORE the record instead of after the
     `continue` that skipped it. Indices are shared, so the fallback is still read out of
     the real source. */
  const masked = maskComments(src);
  const re = /strings\.([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = re.exec(masked))) {
    const key = m[1];
    let j = skipWs(src, re.lastIndex);
    if (src[j] === '|' && src[j + 1] === '|') {
      j = skipWs(src, j + 2);
      const fb = parseFallback(src, j);
      if (fb) { record(key, fb.value, f, lineOf(src, m.index), kindAround(src, m.index)); re.lastIndex = fb.end; continue; }
    }
    const at = `${f}:${lineOf(src, m.index)}`;
    if (!bareRefs.has(key)) bareRefs.set(key, []);
    bareRefs.get(key).push(at);
  }
  const red = /strings\[([^\]]+)\]/g;
  let d;
  while ((d = red.exec(masked))) dynamicSites.push({ expr: d[1].trim(), file: f, line: lineOf(src, d.index) });
}

/* —— A4: shell sweep (src/shells/*.html) ————————————————————————————————————
 * Shells read the dictionary as `const s = window.SL || {}` / `const sl = …` /
 * direct `window.SL.key` (incl. the `window.SL && window.SL.key` guard form),
 * so the component regex never saw them. Only FALLBACK-CARRYING sites are
 * recorded (a bare `s.foo` in a shell is usually a local variable, not a
 * string ref — no bareRefs noise); an empty-string fallback is skipped (state
 * defaults, not copy). The fallback may sit after ONE closing paren:
 * `(window.SL && window.SL.image) || 'Image'`. */
const shellFiles = readdirSync(SHELLS_DIR).filter((f) => f.endsWith('.html')).sort();
for (const f of shellFiles) {
  const src = readFileSync(join(SHELLS_DIR, f), 'utf8');
  const masked = maskCommentsHtml(src);      // same guard as the component sweep, script-scoped
  const re = /(?:window\.SL(?:\s*&&\s*window\.SL)?|\b(?:s|sl|strings))\.([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = re.exec(masked))) {
    const key = m[1];
    let j = skipWs(src, re.lastIndex);
    if (src[j] === ')') j = skipWs(src, j + 1);       // the guarded-window.SL paren form
    if (src[j] !== '|' || src[j + 1] !== '|') continue;
    j = skipWs(src, j + 2);
    const fb = parseFallback(src, j);
    if (!fb || !fb.value) continue;                   // no literal / empty → not copy
    record(key, fb.value, f, lineOf(src, m.index), kindAround(src, m.index));
    re.lastIndex = fb.end;
  }
}
/* —— M13 (2026-09-08): the STATIC a11y sweep ————————————————————————————————
 * A shell's boot markup carries a11y labels that must be correct on the FIRST paint,
 * before any component has run — so they cannot be written as `strings.x || '…'` and
 * this sweep never saw them. They were English in every locale. They now carry
 * `data-sl-aria="<key>"` beside the English `aria-label`, which the shell's own boot
 * walk swaps for the dictionary value; the attribute stays as the fallback.
 * ⚠ THE SWEEP HAS TO KNOW ABOUT THE MECHANISM, or a key introduced this way can never
 * be translated — which is the exact class of defect it was introduced to fix. The
 * English literal in `aria-label` IS the fallback, so the pair reads like every other
 * site: key + fallback. Order-independent: either attribute may come first. */
const ARIA_PAIR = /(?:aria-label="([^"]*)"\s+data-sl-aria="([A-Za-z_$][\w$]*)"|data-sl-aria="([A-Za-z_$][\w$]*)"\s+aria-label="([^"]*)")/g;
for (const f of shellFiles) {
  const src = readFileSync(join(SHELLS_DIR, f), 'utf8');
  let a;
  while ((a = ARIA_PAIR.exec(src))) {
    const value = a[1] !== undefined ? a[1] : a[4];
    const key = a[2] !== undefined ? a[2] : a[3];
    if (!value || value.startsWith('*SL{')) continue;
    record(key, value, f, lineOf(src, a.index), 'label');
  }
}

for (const [key, value] of Object.entries(DYNAMIC)) {
  const prefix = Object.keys(DYNAMIC_SOURCES).find((p) => key.startsWith(p)) || '';
  const comp = (DYNAMIC_SOURCES[prefix] || 'dynamic').split(' ')[0];
  if (!dict.has(key)) dict.set(key, { value, sources: [comp + ' (dynamic)'], kinds: new Set(['label']), component: new Set([comp]), dynamic: true });
}

function norm(s) {
  return s.toLowerCase().replace(/\{[^}]*\}/g, '').replace(/[’']/g, "'").replace(/[^a-z0-9]+/g, ' ').trim();
}
const legacy = new Map();
let legacyCount = 0;
if (existsSync(LEGACY_TXT)) {
  for (const raw of readFileSync(LEGACY_TXT, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith(';')) continue;
    const eq = line.indexOf('='); if (eq < 0) continue;
    const id = line.slice(0, eq).trim(); const val = line.slice(eq + 1).trim();
    if (!id || id === 'language-code' || id === 'language') continue;
    legacyCount++;
    const n = norm(val); if (!n) continue;
    if (!legacy.has(n)) legacy.set(n, []);
    legacy.get(n).push(id);
  }
}
function legacyIdFor(value) { const hit = legacy.get(norm(value)); return hit ? hit[0] : ''; }

const keys = [...dict.keys()].sort();
const placeholderRe = /\{[^}]+\}/g;
const byComponent = new Map();
for (const key of keys) {
  const comp = [...dict.get(key).component][0];
  if (!byComponent.has(comp)) byComponent.set(comp, []);
  byComponent.get(comp).push(key);
}
let mapped = 0;
const rows = keys.map((key) => {
  const e = dict.get(key);
  const legacyId = legacyIdFor(e.value); if (legacyId) mapped++;
  const ph = (e.value.match(placeholderRe) || []).join(' ');
  const len = e.value.length;
  const lenTag = len <= 20 ? 'short' : len <= 60 ? 'medium' : 'long';
  return { key, value: e.value, kind: [...e.kinds].join('/'), component: [...e.component][0], legacyId, ph, lenTag };
});

if (!CHECK_ONLY) {
  mkdirSync(dirname(OUT_JS), { recursive: true });
  mkdirSync(dirname(OUT_DOC), { recursive: true });
  const jsBody = keys.map((k) => `  ${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${JSON.stringify(dict.get(k).value)},`).join('\n');
  writeFileSync(OUT_JS, `/* GENERATED by scripts/extract-strings.mjs — DO NOT EDIT BY HAND.\n * Canonical en-us dictionary swept from component \`strings.KEY || 'fallback'\`\n * defaults. ${keys.length} keys. Regenerate after any component copy change.\n */\nexport const enUS = {\n${jsBody}\n};\nexport default enUS;\n`);
  const obj = {}; for (const k of keys) obj[k] = dict.get(k).value;
  writeFileSync(OUT_JSON, JSON.stringify(obj, null, 2) + '\n');

  let md = `# i18n strings — canonical en-us dictionary + context sheet\n\n`;
  md += `> GENERATED by \`scripts/extract-strings.mjs\`. ${keys.length} keys swept from component \`strings.KEY || 'fallback'\` defaults. Hand this to translators alongside the 13 \`Resources/Raw/lang/*.txt\` files.\n\n`;
  md += `- **Legacy id** = matching \`SpixiLocalization\` key in \`en-us.txt\` (reuse the shipped translation). Blank/— = **new key, needs translation.**\n`;
  md += `- **Kind**: aria = screen-reader label · badge/title/label/placeholder/error/text = where it renders.\n`;
  md += `- **Len**: rough budget — short ≤20, medium ≤60, long >60 chars. Keep tight-UI strings (buttons, badges, chips) near the English length.\n`;
  md += `- **{…}** placeholders MUST survive translation verbatim (e.g. \`{n}\`, \`{date}\`, \`{count}\`, \`{q}\`).\n\n`;
  md += `Summary: **${keys.length}** keys · **${mapped}** map to a legacy id · **${keys.length - mapped}** new · legacy dict has **${legacyCount}** ids · **${conflicts.length}** fallback conflicts to resolve (see end).\n\n`;
  for (const [comp, ckeys] of [...byComponent.entries()].sort()) {
    md += `## ${comp} (${ckeys.length})\n\n`;
    md += `| Key | English | Kind | Len | {…} | Legacy id |\n|---|---|---|---|---|---|\n`;
    for (const key of ckeys.sort()) {
      const r = rows.find((x) => x.key === key);
      const val = r.value.replace(/\|/g, '\\|').replace(/\n/g, '␤');
      md += `| \`${key}\` | ${val} | ${r.kind} | ${r.lenTag} | ${r.ph || ''} | ${r.legacyId ? '`' + r.legacyId + '`' : '—'} |\n`;
    }
    md += `\n`;
  }
  md += `## Dynamic key families\n\nKeys built at runtime as \`strings['<prefix>' + token]\`; enumerated in the extractor's \`DYNAMIC\` table so the pseudo-locale pass covers them.\n\n`;
  md += `| Prefix | Source | Tokens |\n|---|---|---|\n`;
  const dynByPrefix = {};
  for (const k of Object.keys(DYNAMIC)) {
    const p = Object.keys(DYNAMIC_SOURCES).find((x) => k.startsWith(x)) || '?';
    (dynByPrefix[p] ||= []).push(k.slice(p.length));
  }
  for (const [p, toks] of Object.entries(dynByPrefix)) md += `| \`${p}\` | ${DYNAMIC_SOURCES[p] || ''} | ${toks.join(', ')} |\n`;
  md += `\n`;
  if (conflicts.length) {
    md += `## Fallback conflicts (resolve at source before wiring)\n\nThe same \`strings.KEY\` renders **different English** in different places. A dictionary key can hold only one value, so wiring the provider would override every site with one string. Either rename to distinct keys, or unify the copy. The extractor keeps the **first** value (sorted by file).\n\n`;
    md += `| Key | Kept (first) | Also seen | Where |\n|---|---|---|---|\n`;
    const seen = new Set();
    for (const c of conflicts) {
      if (seen.has(c.key + c.incoming)) continue; seen.add(c.key + c.incoming);
      md += `| \`${c.key}\` | ${dict.get(c.key).value.replace(/\|/g, '\\|')} | ${c.incoming.replace(/\|/g, '\\|')} | ${c.file}:${c.line} |\n`;
    }
    md += `\n`;
  }
  const trulyBare = [...bareRefs.keys()].filter((k) => !dict.has(k)).sort();
  if (trulyBare.length) {
    md += `## No-fallback references — NOT localizable via this channel\n\nReferenced as \`strings.KEY\` whose fallback is a JS constant/variable, not a string literal, so they are absent from the dictionary and always render their English source. Handle separately:\n\n- the Terms/Privacy legal text — since #733 it is not a \`strings.*\` reference at all: the FULL documents are baked from \`docs/legal/*.md\` into \`src/components/legal-docs.js\` at build time (\`scripts/lib/legal-docs.mjs\`). **ENGLISH-ONLY BY DECISION (#169)** — intentionally NOT translated (legal copy needs per-jurisdiction review); every locale renders English. Their TITLES (\`termsTitle\`/\`privacyTitle\`) ARE translated.\n- \`walletTitle\` — falls back to a passed-in wallet name/label (dynamic), so it has no fixed English to translate.\n\n`;
    for (const k of trulyBare) md += `- \`${k}\` — ${bareRefs.get(k).join(', ')}\n`;
    md += `\n`;
  }
  writeFileSync(OUT_DOC, md);
}

console.log(`extract-strings: swept ${files.length} components + ${shellFiles.length} shells`);
console.log(`  ${keys.length} keys (${keys.length - Object.keys(DYNAMIC).filter((k) => dict.get(k) && dict.get(k).dynamic).length} static + ${Object.keys(DYNAMIC).filter((k) => dict.get(k) && dict.get(k).dynamic).length} dynamic-only)`);
console.log(`  ${mapped} mapped to legacy SL ids · ${keys.length - mapped} new · legacy dict ${legacyCount} ids`);
console.log(`  ${conflicts.length} fallback conflicts · ${[...bareRefs.keys()].filter((k) => !dict.has(k)).length} no-fallback refs · ${dynamicSites.length} dynamic sites`);
if (conflicts.length) { console.log('\nCONFLICTS:'); for (const c of conflicts) console.log(`  ${c.key} @ ${c.file}:${c.line}: "${c.existing}" vs "${c.incoming}"`); }
if (conflicts.length) process.exitCode = 1;

/* ★ Session H review (auditor C, MINOR-3): --check used to mean "skip the writes and
 * gate conflicts only" — a NEW `strings.key || 'English'` fallback shipped English in
 * all thirteen locales with extract --check, i18n-lint AND the suite all green (the
 * suite even documents the class at its 7.6 pins and then left it to discipline).
 * --check now means CHECK: the swept dictionary is compared against the en-us.json on
 * disk and any drift — a missing key, a stale key, a changed fallback — exits 1. */
if (CHECK_ONLY) {
  const swept = {}; for (const k of keys) swept[k] = dict.get(k).value;
  let onDisk = null;
  try { onDisk = JSON.parse(readFileSync(OUT_JSON, 'utf8')); } catch (e) { onDisk = null; }
  const drift = [];
  if (onDisk === null) drift.push('en-us.json missing/unreadable');
  else {
    for (const k of Object.keys(swept)) {
      if (!(k in onDisk)) drift.push('missing on disk: ' + k);
      else if (onDisk[k] !== swept[k]) drift.push('stale value on disk: ' + k);
    }
    for (const k of Object.keys(onDisk)) if (!(k in swept)) drift.push('orphan on disk (no longer swept): ' + k);
  }
  if (drift.length) {
    console.error('\nextract-strings --check: the dictionary is STALE (' + drift.length + ' drift(s)) — run the full pipeline (extract → build-locales → build-strings-iife → bundle → shells):');
    for (const d of drift.slice(0, 20)) console.error('  ' + d);
    if (drift.length > 20) console.error('  … +' + (drift.length - 20) + ' more');
    process.exitCode = 1;
  } else {
    console.log('extract-strings --check: en-us.json matches the sweep \u2713');
  }
}
