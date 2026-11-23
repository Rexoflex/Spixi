/* ==== walktools · C — BY HAND: runs scripts/device/adb-walk-parse.ps1 on the synthetic run folders of scripts/pins-walktools/fixtures/ and compares
 * the rows of summary.csv / summary.md with the expected values. NEEDS PowerShell (`pwsh`, tested with 7.4.6 on Linux; NOT in the smoke, because
 * CI has no PowerShell step: the source pin of the same item is scripts/pins-walktools/c-parser.mjs). Never run on Windows PowerShell 5.1.
 *
 * usage:  node scripts/pins-walktools/c-parser-run.mjs [--parser <path to adb-walk-parse.ps1>] [--base <path to the base parser>] [--base-ref <git ref>] [--pwsh <exe>]
 *   --parser   the parser under test (default: scripts/device/adb-walk-parse.ps1 of this tree)
 *   --base     the UNTOUCHED base parser to compare the old rows with; default: `git show <base-ref>:scripts/device/adb-walk-parse.ps1` (base-ref
 *              default 338d30f4, the base of work/walktools). No base = the keys that compare with it fail (they say so).
 * Exit 0 = every key green, 1 = a key failed, 2 = usage / pwsh missing. The fixtures hold NO line copied from a phone: every stamp, count and
 * address is synthetic (date 12-01, pid 4242). The parser writes summary.md / summary.csv into the run folder, so every fixture is copied to a
 * temp folder first; the repo folder is never written.
 *   r1 historyFull     — history, shell lines + the three C# lines, 3 pages x 2 reps: the 51 page rows have their numbers (hand-computed from the
 *                        fixture), `insert in n of m` notes; the old rows keep their values
 *   r2 historyShell    — the same without the C# lines: the shell rows are numbers; the C# rows (loadmore -> push, read *, push *) are n/a with the
 *                        reason `no "<line>" line`; RESULT / exit code as without the rows
 *   r3 noNewLines      — history without any new line: every page row is n/a (reason names the line); the summary without the page rows is
 *                        BYTE-IDENTICAL to the base parser's (csv and md, the `Parsed` line aside); same RESULT line and exit code
 *   r4 seedPair        — history-seed-k07 with `chat loadmore in`: first swipe -> 1st page is the load AFTER that line (the early load is not the page);
 *                        the base parser says no data on the same folder (the bug of #1827 (3))
 *   r5 seedSend        — no C# line, a `shell send loadmore` line whose stamp is AFTER the load (the shape of 2026-11-22): the first load of the window
 *   r6 seedNone        — no loadmore line of either kind: no data with the reason, exit 2
 *   r7 otherSteps      — chat-intent + downloads: summary.csv and summary.md BYTE-IDENTICAL to the base parser's (the `Parsed` line aside)
 *   r8 modeWords       — mode= words: `insert` = 1, `full` / `hybrid` = 0, a word with a digit after it / a 17-letter word / a missing word = n/a (a capital letter never reaches the reader: the line fails the phone filter grammar) with the reason
 *   r9 zeroPagesGate   — pages 0 in run.json: first swipe and every page row carry the gate reason (the step is no data / n/a for that rep)
 *   r10 strayLoad     — (review round 1 M1) seed rep with ONE send line and TWO loads in the window, no C# line: first swipe -> 1st page = no data
 *                        `2 chat load lines for 1 page requests in the window (cannot pair`; the page rows that pair (counts equal) keep their numbers
 *   r11 noPush        — (M2) history, page 1's `chat older push` line lost (2 push lines for 3 requests): `C# loadmore in -> push` of EVERY page is n/a
 *                        `2 "chat older push" lines for 3 page requests (cannot pair)`; insert / frames / read rows keep their values
 *   r12 countGuard    — (M2) the shared guard of the page rows: page 1's `shell older insert` line lost -> the 7 insert rows of every page are n/a `2 "shell older insert" lines
 *                        for 3 ...` (page 1's value is not page 2's); the lost push line of hist-nopush -> push n / json= / build= n/a; the other rows keep their values
 *   r13 pushOrder     — (M2) equal counts, but page 1's push stamp is after loadmore 2: page 1 `C# loadmore in -> push` is n/a (`not before the next`), pages 2 and 3 have values
 *   r14 loadmoreCount — (M2) history, page 2's `chat loadmore in` line lost: every C# row (read, push, the C# time) is n/a `2 "chat loadmore in" lines for 3 ...`; shell rows keep
 *   r15 extraLine     — (M2) history, page 1's `shell older insert` line written TWICE (4 insert lines for 3 requests): the insert rows of every page are n/a `4 ... (cannot pair)`; other rows keep
 * Deliberate breaks (#802): the builder's report, one one-token mutation per key in a full copy of the tree (--parser <mutated copy>). */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, cpSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const tree = resolve(here, '..', '..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const PWSH = opt('--pwsh', 'pwsh');
const PARSER = resolve(opt('--parser', join(tree, 'scripts/device/adb-walk-parse.ps1')));
const BASE_REF = opt('--base-ref', '338d30f4');
const probe = spawnSync(PWSH, ['-NoProfile', '-NonInteractive', '-Command', '$PSVersionTable.PSVersion.ToString()'], { encoding: 'utf8' });
if (probe.error || probe.status !== 0) { console.error('c-parser-run: PowerShell (' + PWSH + ') is not available: this pin needs pwsh'); process.exit(2); }
console.log('pwsh ' + probe.stdout.trim() + ' · parser ' + PARSER);
const work = mkdtempSync(join(tmpdir(), 'walktools-parse-'));
process.on('exit', () => { try { rmSync(work, { recursive: true, force: true }); } catch { /* best effort */ } });

let BASE = opt('--base', '');
if (!BASE) {
  const g = spawnSync('git', ['-C', tree, 'show', BASE_REF + ':scripts/device/adb-walk-parse.ps1'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (g.status === 0 && g.stdout.length > 1000) { BASE = join(work, 'base-adb-walk-parse.ps1'); writeFileSync(BASE, g.stdout); }
}

const cache = new Map();
function runParser(parser, fixture) {   // { code, out, csv, md, rows }
  const k = parser + '|' + fixture;
  if (cache.has(k)) return cache.get(k);
  const dst = join(work, 'run-' + cache.size);
  mkdirSync(dst, { recursive: true });
  cpSync(join(here, 'fixtures', fixture), dst, { recursive: true });
  const r = spawnSync(PWSH, ['-NoProfile', '-NonInteractive', '-File', parser, '-RunDir', dst], { encoding: 'utf8' });
  const csv = existsSync(join(dst, 'summary.csv')) ? readFileSync(join(dst, 'summary.csv'), 'utf8') : '';
  const md = existsSync(join(dst, 'summary.md')) ? readFileSync(join(dst, 'summary.md'), 'utf8') : '';
  const res = { code: r.status, out: (r.stdout || '') + (r.stderr || ''), csv, md, rows: parseCsv(csv) };
  cache.set(k, res);
  return res;
}
function parseCsv(text) {   // RFC-4180 enough for these files: quoted cells with "" escapes
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  return rows.slice(1).map((r) => ({ step: r[0], metric: r[1], n: r[2], median: r[3], min: r[4], max: r[5], unit: r[6], note: r[7], files: r[8] }));
}
const rowOf = (res, step, metric) => res.rows.find((r) => r.step === step && r.metric === metric);
const normMd = (md) => md.split('\n').filter((l) => !l.startsWith('- Parsed (PC time):')).join('\n');
const resultLine = (md) => (md.split('\n').find((l) => l.startsWith('RESULT: ')) || '');
const isPageRow = (r) => r.metric.startsWith('page ');
const mdIsPageRow = (l) => /^\| `[^`]*` \| page \d /.test(l);
const csvWithoutPages = (csv) => csv.split('\n').filter((l, i) => i === 0 || !/^[^,]*,page \d /.test(l)).join('\n');
const mdWithoutPages = (md) => normMd(md).split('\n').filter((l) => !mdIsPageRow(l)).join('\n');

const results = [];
const ok = (name, cond, detail) => { results.push([name, !!cond, detail]); console.log((cond ? '  ok   ' : '  FAIL ') + name + (cond ? '' : ' — ' + detail)); };
const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
const need = (res, step, metric) => rowOf(res, step, metric) || { median: '<row missing>', n: '', note: '<row missing>' };

// the expected values of the fixtures (hand-computed from scripts/pins-walktools/fixtures; rep 1 / rep 2 differ by +1 in some numbers: median = x.5)
const PAGE = {
  1: { 'insert rows': '50', 'insert mode=insert': '1', 'insert build=': '11.5', 'insert swap=': '3', 'insert fix=': '2', 'insert fade=': '4', 'insert ms=': '25.5', 'frames n': '35', 'frames max': '32.5', 'C# loadmore in -> push': '42', 'read passes': '1', 'read window': '100', 'read ms=': '15.5', 'read flush': '1', 'push n': '50', 'push json=': '21000', 'push build=': '7' },
  2: { 'insert rows': '50', 'insert mode=insert': '0', 'insert build=': '12.5', 'insert swap=': '4', 'insert fix=': '3', 'insert fade=': '5', 'insert ms=': '26.5', 'frames n': '34', 'frames max': '34.5', 'C# loadmore in -> push': '84', 'read passes': '2', 'read window': '200', 'read ms=': '20.5', 'read flush': '0', 'push n': '50', 'push json=': '22000', 'push build=': '8' },
  3: { 'insert rows': '50', 'insert mode=insert': '1', 'insert build=': '13.5', 'insert swap=': '5', 'insert fix=': '4', 'insert fade=': '6', 'insert ms=': '27.5', 'frames n': '33', 'frames max': '36.5', 'C# loadmore in -> push': '126', 'read passes': '3', 'read window': '300', 'read ms=': '25.5', 'read flush': '1', 'push n': '50', 'push json=': '23000', 'push build=': '9' },
};
const SHELL_ROWS = ['insert rows', 'insert mode=insert', 'insert build=', 'insert swap=', 'insert fix=', 'insert fade=', 'insert ms=', 'frames n', 'frames max'];
const CS_ROWS = ['C# loadmore in -> push', 'read passes', 'read window', 'read ms=', 'read flush', 'push n', 'push json=', 'push build='];
const ALL_ROWS = SHELL_ROWS.concat(CS_ROWS);
const sameVals = (res, step, k, exp) => Object.entries(exp).filter(([m, v]) => need(res, step, 'page ' + k + ' ' + m).median !== v).map(([m]) => 'page ' + k + ' ' + m + '=' + need(res, step, 'page ' + k + ' ' + m).median);

/* r1 */ {
  const R = runParser(PARSER, 'hist3-full');
  const bad = [1, 2, 3].flatMap((k) => sameVals(R, 'history', k, PAGE[k]));
  const t = {
    ran: R.code === 0 && R.rows.length > 0,
    rowCount: R.rows.filter(isPageRow).length === 51,
    values: bad.length === 0,
    modeNote1: need(R, 'history', 'page 1 insert mode=insert').note === 'insert in 2 of 2' && need(R, 'history', 'page 2 insert mode=insert').note === 'insert in 0 of 2' && need(R, 'history', 'page 3 insert mode=insert').note === 'insert in 2 of 2',
    oldRows: need(R, 'history', 'older pages loaded').median === '3' && need(R, 'history', 'first swipe -> 3rd page').median === '8131' && need(R, 'history', 'swipes').median === '7.5',
    appendedAfterOld: (() => { const m = R.rows.filter((r) => r.step === 'history').map((r) => r.metric); const i = m.findIndex((x) => x.startsWith('page ')); return i === 8 && m.slice(i).every((x) => x.startsWith('page ')); })(),
    optionalKind: R.rows.filter(isPageRow).every((r) => r.n !== ''),
    legend: R.md.includes('- page <k> rows (history pages 1..3'),
  };
  ok('r1 historyFull', F(t).length === 0, JSON.stringify(F(t)) + ' ' + JSON.stringify(bad));
}
/* r2 */ {
  const R = runParser(PARSER, 'hist3-shell');
  const bad = [1, 2, 3].flatMap((k) => sameVals(R, 'history', k, Object.fromEntries(SHELL_ROWS.map((m) => [m, PAGE[k][m]]))));
  const csNa = [1, 2, 3].every((k) => CS_ROWS.every((m) => { const r = need(R, 'history', 'page ' + k + ' ' + m); return r.median === 'n/a' && r.n === ''; }));
  const why = need(R, 'history', 'page 1 C# loadmore in -> push').note.includes('no "chat loadmore in" line') && need(R, 'history', 'page 2 read ms=').note.includes('no "chat older read" line') && need(R, 'history', 'page 3 push json=').note.includes('no "chat older push" line');
  const t = { ran: R.code === 0, shellValues: bad.length === 0, csharpNa: csNa, reasons: why, resultOk: resultLine(R.md) === 'RESULT: OK' };
  ok('r2 historyShell', F(t).length === 0, JSON.stringify(F(t)) + ' ' + JSON.stringify(bad));
}
/* r3 */ {
  const R = runParser(PARSER, 'hist3-old');
  const B = BASE ? runParser(BASE, 'hist3-old') : null;
  const allNa = R.rows.filter(isPageRow).length === 51 && R.rows.filter(isPageRow).every((r) => r.median === 'n/a' && /no "(shell older insert|shell older frames|chat loadmore in|chat older read|chat older push)" line/.test(r.note));
  const t = {
    ran: R.code === B?.code && R.code === 0,
    allNa,
    baseGiven: !!B,
    csvIdentical: !!B && csvWithoutPages(R.csv) === B.csv,
    mdIdentical: !!B && mdWithoutPages(R.md) === normMd(B.md),
    resultSame: !!B && resultLine(R.md) === resultLine(B.md),
    pagesAppendedOnly: !!B && R.csv.split('\n').length - B.csv.split('\n').length === 51,
  };
  ok('r3 noNewLines', F(t).length === 0, JSON.stringify(F(t)));
}
/* r4 */ {
  const R = runParser(PARSER, 'seed-pair');
  const B = BASE ? runParser(BASE, 'seed-pair') : null;
  const S = 'history-seed-k07';
  const exp = { 'insert rows': '50', 'insert mode=insert': '1', 'insert build=': '12.5', 'insert swap=': '3', 'insert fix=': '2', 'insert fade=': '4', 'insert ms=': '26.5', 'frames n': '35', 'frames max': '33.5', 'C# loadmore in -> push': '50', 'read passes': '1', 'read window': '100', 'read ms=': '14.5', 'read flush': '0', 'push n': '50', 'push json=': '21000.5', 'push build=': '8.5' };
  const bad = sameVals(R, S, 1, exp);
  const t = {
    ran: R.code === 0,
    firstPage: need(R, S, 'first swipe -> 1st page').median === '2055' && need(R, S, 'first swipe -> 1st page').n === '2',
    baseHadNoData: !!B && need(B, S, 'first swipe -> 1st page').median === 'no data',
    pageRows: bad.length === 0 && R.rows.filter(isPageRow).length === 17 && R.rows.filter(isPageRow).every((r) => r.metric.startsWith('page 1 ')),
    oldCount: need(R, S, 'older pages loaded').median === '2',
  };
  ok('r4 seedPair', F(t).length === 0, JSON.stringify(F(t)) + ' ' + JSON.stringify(bad));
}
/* r5 */ {
  const R = runParser(PARSER, 'seed-send');
  const B = BASE ? runParser(BASE, 'seed-send') : null;
  const S = 'history-seed-k07';
  const t = {
    ran: R.code === 0,
    firstPage: need(R, S, 'first swipe -> 1st page').median === '2055',
    baseHadNoData: !!B && need(B, S, 'first swipe -> 1st page').median === 'no data',
    shellRows: ['insert rows', 'insert ms=', 'frames max'].every((m) => need(R, S, 'page 1 ' + m).median !== 'n/a' && need(R, S, 'page 1 ' + m).median !== '<row missing>'),
    csNa: CS_ROWS.every((m) => need(R, S, 'page 1 ' + m).median === 'n/a'),
  };
  ok('r5 seedSend', F(t).length === 0, JSON.stringify(F(t)));
}
/* r6 */ {
  const R = runParser(PARSER, 'seed-none');
  const S = 'history-seed-k07';
  const r = need(R, S, 'first swipe -> 1st page');
  const t = {
    exit2: R.code === 2,
    noData: r.median === 'no data' && r.note.includes('no "chat loadmore in" line and no "shell send loadmore" line (no page request is proven)'),
    pageRowsNa: R.rows.filter(isPageRow).length === 17 && R.rows.filter(isPageRow).every((x) => x.median === 'n/a'),
    resultNoData: resultLine(R.md).startsWith('RESULT: NO DATA in 1 rows'),
  };
  ok('r6 seedNone', F(t).length === 0, JSON.stringify(F(t)) + ' ' + r.note);
}
/* r7 */ {
  const R = runParser(PARSER, 'other-steps');
  const B = BASE ? runParser(BASE, 'other-steps') : null;
  const t = {
    ran: R.code === B?.code && R.rows.length > 0 && R.rows.some((r) => r.median !== 'no data' && r.median !== 'n/a'),
    baseGiven: !!B,
    csvIdentical: !!B && R.csv === B.csv,
    mdIdentical: !!B && normMd(R.md) === normMd(B.md),
  };
  ok('r7 otherSteps', F(t).length === 0, JSON.stringify(F(t)));
}
/* r8 */ {
  const R = runParser(PARSER, 'hist3-modes');
  const g = (k) => need(R, 'history', 'page ' + k + ' insert mode=insert');
  const t = {
    ran: R.code === 0,
    insertIsOne: g(1).median === '1' && g(1).n === '1',
    otherWordIsZero: g(2).median === '0' && g(3).median === '0',
    notes: g(1).note.startsWith('insert in 1 of 1; value in 1 of 2 reps; ') && g(2).note.startsWith('insert in 0 of 1; value in 1 of 2 reps; '),
    badWordsNa: g(1).note.includes('no readable mode= in android-walk-history-02.txt') && !g(1).note.includes('android-walk-history-01.txt'),
  };
  ok('r8 modeWords', F(t).length === 0, JSON.stringify(F(t)) + ' ' + g(1).note);
}
/* r9 */ {
  const R = runParser(PARSER, 'seed-zeropages');
  const S = 'history-seed-k07';
  const first = need(R, S, 'first swipe -> 1st page');
  const t = {
    exit2: R.code === 2,
    firstNoData: first.median === 'no data' && first.note.includes('no page request was counted'),
    pageRowsNa: R.rows.filter(isPageRow).length === 17 && R.rows.filter(isPageRow).every((x) => x.median === 'n/a' && x.note.includes('no page request was counted')),
  };
  ok('r9 zeroPagesGate', F(t).length === 0, JSON.stringify(F(t)));
}
/* r10 */ {
  const R = runParser(PARSER, 'seed-stray');
  const S = 'history-seed-k07';
  const first = need(R, S, 'first swipe -> 1st page');
  const t = {
    exit2: R.code === 2,
    noData: first.median === 'no data' && first.note.includes('2 chat load lines for 1 page requests in the window (cannot pair'),
    pagesStillPair: need(R, S, 'page 1 insert rows').median === '50' && need(R, S, 'page 1 frames max').median === '33.5',
    csNa: need(R, S, 'page 1 C# loadmore in -> push').median === 'n/a',
  };
  ok('r10 strayLoad', F(t).length === 0, JSON.stringify(F(t)) + ' ' + first.note);
}
/* r11 */ {
  const R = runParser(PARSER, 'hist-nopush');
  const na = (k) => { const r = need(R, 'history', 'page ' + k + ' C# loadmore in -> push'); return r.median === 'n/a' && r.note.includes('2 "chat older push" lines for 3 page requests (cannot pair)'); };
  const t = {
    ran: R.code === 0,
    pairNa: [1, 2, 3].every(na),
    othersKeep: [1, 2, 3].flatMap((k) => sameVals(R, 'history', k, Object.fromEntries(SHELL_ROWS.concat(['read passes', 'read window', 'read ms=', 'read flush']).map((m) => [m, PAGE[k][m]])))).length === 0,
  };
  ok('r11 noPush', F(t).length === 0, JSON.stringify(F(t)));
}
/* r12 */ {
  const R = runParser(PARSER, 'hist-noinsert');
  const P = runParser(PARSER, 'hist-nopush');
  const INS = ['insert rows', 'insert mode=insert', 'insert build=', 'insert swap=', 'insert fix=', 'insert fade=', 'insert ms='];
  const na = (R0, k, m, txt) => { const r = need(R0, 'history', 'page ' + k + ' ' + m); return r.median === 'n/a' && r.note.includes(txt); };
  const keep = ['frames n', 'frames max'].concat(CS_ROWS);
  const t = {
    ran: R.code === 0 && P.code === 0,
    insertNa: [1, 2, 3].every((k) => INS.every((m) => na(R, k, m, '2 "shell older insert" lines for 3 page requests (cannot pair)'))),
    pushRowsNa: [1, 2, 3].every((k) => ['push n', 'push json=', 'push build='].every((m) => na(P, k, m, '2 "chat older push" lines for 3 page requests (cannot pair)'))),
    othersKeep: [1, 2, 3].flatMap((k) => sameVals(R, 'history', k, Object.fromEntries(keep.map((m) => [m, PAGE[k][m]])))).length === 0,
  };
  ok('r12 countGuard', F(t).length === 0, JSON.stringify(F(t)));
}
/* r13 */ {
  const R = runParser(PARSER, 'hist-pushorder');
  const p1 = need(R, 'history', 'page 1 C# loadmore in -> push');
  const t = {
    ran: R.code === 0,
    page1Na: p1.median === 'n/a' && p1.note.includes('is not before the next "chat loadmore in" line'),
    pages23: need(R, 'history', 'page 2 C# loadmore in -> push').median === '84' && need(R, 'history', 'page 3 C# loadmore in -> push').median === '126',
    pushRowsKeep: need(R, 'history', 'page 1 push json=').median === '21000',
  };
  ok('r13 pushOrder', F(t).length === 0, JSON.stringify(F(t)) + ' ' + p1.note);
}
/* r14 */ {
  const R = runParser(PARSER, 'hist-noloadmore');
  const na = (k, m) => { const r = need(R, 'history', 'page ' + k + ' ' + m); return r.median === 'n/a' && r.note.includes('2 "chat loadmore in" lines for 3 page requests (cannot pair)'); };
  const t = {
    ran: R.code === 0,
    csharpNa: [1, 2, 3].every((k) => ['read passes', 'read window', 'read ms=', 'read flush', 'push n', 'push json=', 'push build=', 'C# loadmore in -> push'].every((m) => na(k, m))),
    shellKeep: [1, 2, 3].flatMap((k) => sameVals(R, 'history', k, Object.fromEntries(SHELL_ROWS.map((m) => [m, PAGE[k][m]])))).length === 0,
  };
  ok('r14 loadmoreCount', F(t).length === 0, JSON.stringify(F(t)));
}
/* r15 */ {
  const R = runParser(PARSER, 'hist-extrainsert');
  const INS = ['insert rows', 'insert mode=insert', 'insert build=', 'insert swap=', 'insert fix=', 'insert fade=', 'insert ms='];
  const t = {
    ran: R.code === 0,
    insertNa: [1, 2, 3].every((k) => INS.every((m) => { const r = need(R, 'history', 'page ' + k + ' ' + m); return r.median === 'n/a' && r.note.includes('4 "shell older insert" lines for 3 page requests (cannot pair)'); })),
    othersKeep: [1, 2, 3].flatMap((k) => sameVals(R, 'history', k, Object.fromEntries(['frames n', 'frames max'].concat(CS_ROWS).map((m) => [m, PAGE[k][m]])))).length === 0,
  };
  ok('r15 extraLine', F(t).length === 0, JSON.stringify(F(t)));
}
const failed = results.filter((r) => !r[1]);
console.log('\nRESULT pass=' + (results.length - failed.length) + ' fail=' + failed.length);
process.exit(failed.length ? 1 : 0);
