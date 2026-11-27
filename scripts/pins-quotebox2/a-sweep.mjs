/* ==== The three owed sweep sites of #1963 (5) / #1966 (3) (packet P111) — the undo (`ixian:undorequest`, SingleChatPage) and the two
 * pendingDeletion re-adds (ContactNewPage.addContactCore, SpixiContentPage.sendContactRequestGuarded) run the Sent sweep after their
 * forget, as SContacts.removeContact does, behind the switch QuoteBox2Flags.SweepOnForget (absent = ON; the old path = the fallback).
 * ★ size re-base (2026-11-27, size check R6: SingleChatPage.xaml.cs and SpixiContentPage.cs must not grow): the sweep statement moved
 * out of the three sites into ONE helper, Spixi/Utils/SentSweepOnForget.cs — `SentSweepOnForget.forget(peer)` = `SPeerLocalStores.forget(peer);`
 * then `if (QuoteBox2Flags.SweepOnForget) SContacts.scheduleSentSweep();`. Each site's base line changed ONLY its callee
 * (`SPeerLocalStores.forget(` → `SentSweepOnForget.forget(`; the argument and the comment as in the base), so each site has the base's
 * line count. The claims are the old ones (the sweep once, directly after the site's forget; the switch read once per site; OFF = the
 * base statements), held now as "the site calls the helper once, in place of its base forget" + "the helper body is exactly the forget
 * then the guarded sweep".
 * SOURCE PIN (#1735) — LIMITS: the three files are MAUI- and Core-bound and UNCOMPILED here, so the keys hold the comment-stripped
 * TEXT (stripCode; brace-matched blocks), not bindings: a shadow type named SContacts / QuoteBox2Flags, an alias, a `#define`, a csproj
 * `Compile Remove`, an overload of SentSweepOnForget.forget or a call reached by reflection is not seen (the diff review and the
 * Windows compile hold those). What
 * scheduleSentSweep does is held elsewhere (pins-s9/a1-wiring, csh S9MediaTests); the switch block runs in csh QuoteBox2Tests flags_*.
 *   a1 sites     — in each branch (the undo's `if (requestRemoved) { … }`, addContactCore's `if (old_friend.pendingDeletion) { … }`,
 *                  sendContactRequestGuarded's `if (existing != null && existing.pendingDeletion) { … }`) exactly ONE
 *                  `SentSweepOnForget.forget(<the base argument>);` and no `SPeerLocalStores.forget(`; each file calls the helper once,
 *                  calls scheduleSentSweep nowhere and names QuoteBox2Flags nowhere (★ size re-base: was "the sweep statement once,
 *                  directly after the branch's SPeerLocalStores.forget"); `helper` — SentSweepOnForget.cs holds ONE type, `public static
 *                  class SentSweepOnForget`, whose body is EXACTLY `public static void forget(string? peer) { SPeerLocalStores.forget(peer);
 *                  if (QuoteBox2Flags.SweepOnForget) SContacts.scheduleSentSweep(); }` (stripCode, whitespace collapsed: the sweep once,
 *                  directly after the forget); `callers` — over every Spixi/**.cs, `SentSweepOnForget` is named only in its own file
 *                  (1) and at the three sites (1 each).
 *   a2 switch    — over every Spixi/**.cs: `QuoteBox2Flags.SweepOnForget` is read only in the helper, once (★ size re-base: was "at the
 *                  three sites, one each" — each site reaches that ONE read through its ONE helper call, a1); its key is declared once
 *                  in SpixiFlags.cs and named nowhere else in Spixi/** or src/**.
 *   a3 old path  — the undo branch (`else if (current_url.StartsWith("ixian:undorequest")) { … }`), addContactCore and
 *                  sendContactRequestGuarded with `SentSweepOnForget.forget(` given back as the base `SPeerLocalStores.forget(` equal
 *                  the base `ae7b8303` blocks (SHA-256 over stripCode, whitespace collapsed; ★ size re-base: was "with the new statement
 *                  taken out"): with the switch OFF the helper is the base forget (a1 helper), so the sites run the base statements, and
 *                  nothing else in them moved.
 *   a4 gate 18   — the LEGACY_G3 list of scripts/smoke-test.mjs holds no `Spixi/Utils/SpixiContentPage.cs ::` entry (fixb5 made that
 *                  catch log the type only; pins-fixb5/e-small-fixes e3 holds it).
 * DELIBERATE BREAKS (#802; one each in a full copy, `node scripts/run-pins.mjs --root <copy> pins-quotebox2/a-sweep`; ★ size re-base:
 * the breaks of the moved code, red as observed 2026-11-27):
 *   undo     SingleChatPage `SentSweepOnForget.forget(friend` → `SPeerLocalStores.forget(friend` → a1 (undo:once, undo:noBaseForget,
 *            callers);
 *   re-add   ContactNewPage `SentSweepOnForget.forget(old_friend` → `SPeerLocalStores.forget(old_friend` → a1 (add:once,
 *            add:noBaseForget, callers);
 *   heal     SpixiContentPage `SentSweepOnForget.forget(existing` → `SentSweepOnForget.forget(old` → a1 (guarded:once) and a3 (guarded);
 *   helper   SentSweepOnForget.cs `if (QuoteBox2Flags.SweepOnForget) SContacts` → `if (SmallFixFlags.DeclineClears) SContacts` → a1
 *            (helper) and a2 (reads);
 *   order    SentSweepOnForget.cs: the sweep line moved above `SPeerLocalStores.forget(peer);` → a1 (helper);
 *   key      SpixiFlags.cs `"flagSweepOnForget"` → `"flagSweepOnForgot"` → a2 (keyDeclared);
 *   gate 18  the SpixiContentPage.cs entry put back into LEGACY_G3 → a4 (noScp). */
import { createHash } from 'node:crypto';

export const SCP_F = 'Spixi/Pages/Chat/SingleChatPage.xaml.cs', CNP_F = 'Spixi/Pages/Contacts/ContactNewPage.xaml.cs',
  SCB_F = 'Spixi/Utils/SpixiContentPage.cs', FLAGS_F = 'Spixi/Utils/SpixiFlags.cs', HELPER_F = 'Spixi/Utils/SentSweepOnForget.cs';
export const NEW = 'if (QuoteBox2Flags.SweepOnForget) SContacts.scheduleSentSweep();';   // now only in the helper body (HELPER_BODY)
/* ★ size re-base: the sites' one change — the callee of the base forget line */
export const CALL_NEW = 'SentSweepOnForget.forget(', CALL_BASE = 'SPeerLocalStores.forget(';
export const HELPER_SIG = 'public static class SentSweepOnForget';
export const HELPER_BODY = '{ public static void forget(string? peer) { SPeerLocalStores.forget(peer); ' + NEW + ' } }';
export const SIG = {
  undo: 'else if (current_url.StartsWith("ixian:undorequest"))',
  add: 'public static AddContactOutcome addContactCore(string recipient_address_string, out string? contactName)',
  guarded: 'public void sendContactRequestGuarded(string str_address)',
};
const SITE = {
  undo: { file: SCP_F, branch: 'if (requestRemoved)', forget: 'SentSweepOnForget.forget(friend.walletAddress.ToString());' },
  add: { file: CNP_F, branch: 'if (old_friend.pendingDeletion)', forget: 'SentSweepOnForget.forget(old_friend.walletAddress?.ToString());' },
  guarded: { file: SCB_F, branch: 'if (existing != null && existing.pendingDeletion)', forget: 'SentSweepOnForget.forget(existing.walletAddress?.ToString());' },
};
/* SHA-256 of rest(block) at the base ae7b8303 (git show ae7b8303:<file>; stripCode; whitespace collapsed) */
export const BASE = {
  undo: '8f4530de4cae104a683f4dd64c739b1ff4ce6010feb798914a6d4e48a2343225',
  add: 'c593f1aefb23da417b86258effd05f0b2d4c2f15f5cb60af4cbf33fb616a1b26',
  guarded: 'c25c11b7b60fce87d965e41b8a06d5c91d9364f82de4272f78883bfe08159de2',
};

export const norm = (t) => t.replace(/\s+/g, ' ').trim();
export const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
/** the brace-matched block that opens at the first `{` after `from` (string and char literals skipped) */
export const blockAt = (t, from) => {
  const o = t.indexOf('{', from);
  if (o < 0) return { o: -1, end: -1, text: '' };
  let d = 0;
  for (let k = o; k < t.length; k++) {
    const c = t[k];
    if (c === '"') { const verb = t[k - 1] === '@'; k++; while (k < t.length && !(t[k] === '"' && !(verb && t[k + 1] === '"'))) { if (!verb && t[k] === '\\') k++; else if (verb && t[k] === '"') k++; k++; } continue; }
    if (c === '\'') { const m = /^'(?:\\.[^']*|[^'\\\n])'/.exec(t.slice(k, k + 12)); if (m) { k += m[0].length - 1; continue; } }
    if (c === '{') d++; else if (c === '}' && --d === 0) return { o, end: k + 1, text: t.slice(o, k + 1) };
  }
  return { o, end: -1, text: '' };
};
/** the block after the ONE occurrence of `sig` ('' when absent or not unique) */
export const blockOf = (t, sig) => (t.split(sig).length - 1 !== 1 ? '' : blockAt(t, t.indexOf(sig) + sig.length).text);
/** a block with the base callee given back — compared with the base block (★ size re-base: was "the new statement taken out") */
export const rest = (block) => norm(block.split(CALL_NEW).join(CALL_BASE));

export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, existsSync, join } = h;
  const raw = (f) => (existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8').replace(/^﻿/, '') : '');
  const rd = (f) => stripCode(raw(f));
  const count = (t, s) => (typeof s === 'string' ? t.split(s).length - 1 : (t.match(s) || []).length);
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const same = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());   // key order free (readdir order is not fixed)
  const T = { [SCP_F]: rd(SCP_F), [CNP_F]: rd(CNP_F), [SCB_F]: rd(SCB_F) };
  const blocks = Object.fromEntries(Object.keys(SIG).map((k) => [k, blockOf(T[SITE[k].file], SIG[k])]));

  const csFiles = [];
  const walk = (d) => { for (const e of readdirSync(join(root, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) { if (e.name !== 'bin' && e.name !== 'obj') walk(p); } else if (e.name.endsWith('.cs')) csFiles.push(p); } };
  walk('Spixi');
  const reads = {}, keyFiles = [], helperNames = {};
  for (const f of csFiles) {
    const t = rd(f);
    const c = count(t, /\bQuoteBox2Flags\.SweepOnForget\b/g);
    if (c) reads[f] = c;
    if (/flagSweepOnForget|\bSweepOnForgetKey\b/.test(t)) keyFiles.push(f);
    const hn = count(t, /\bSentSweepOnForget\b/g);
    if (hn) helperNames[f] = hn;
  }

  /* ── a1 · each site: the helper once, in place of its base forget; the helper = the forget, then the guarded sweep ── */
  const a1 = {};
  for (const k of Object.keys(SITE)) {
    const s = SITE[k], b = blocks[k];
    const at = b.indexOf(s.branch);
    const br = at >= 0 && b.indexOf(s.branch, at + 1) < 0 ? blockAt(b, at + s.branch.length).text : '';
    a1[k + ':found'] = b.length > 200 && br.length > 50;
    a1[k + ':once'] = count(br, s.forget) === 1 && count(T[s.file], CALL_NEW) === 1;
    a1[k + ':noBaseForget'] = count(br, CALL_BASE) === 0 && count(T[s.file], 'scheduleSentSweep(') === 0 && count(T[s.file], 'QuoteBox2Flags') === 0;
  }
  const HT = rd(HELPER_F);
  a1.helper = count(HT, HELPER_SIG) === 1 && norm(blockOf(HT, HELPER_SIG)) === HELPER_BODY
    && count(HT, /\b(class|struct|interface|enum|record)\b/g) === 1 && count(HT, NEW) === 1 && count(HT, 'scheduleSentSweep(') === 1;
  a1.callers = same(helperNames, { [SCP_F]: 1, [CNP_F]: 1, [HELPER_F]: 1, [SCB_F]: 1 });
  ok(F(a1).length === 0,
    '★ quotebox2 a1 sites (#1966 (3), P111): the undo, addContactCore and the pendingDeletion heal each call SentSweepOnForget.forget once in place of their base SPeerLocalStores.forget; its body = that forget, then the guarded sweep — failing: ' + JSON.stringify(F(a1)) + ' ' + JSON.stringify(helperNames));

  /* ── a2 · the switch is read only in the helper; its key only in the switch block ── */
  let srcHit = false;
  const w = (d) => { if (!existsSync(join(root, d))) return; for (const e of readdirSync(join(root, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) w(p); else if (/flagSweepOnForget/.test(raw(p))) srcHit = true; } };
  w('src');
  const a2 = {
    reads: same(reads, { [HELPER_F]: 1 }),
    keyOnlyInFlags: JSON.stringify(keyFiles) === JSON.stringify([FLAGS_F]),
    keyDeclared: count(rd(FLAGS_F), 'public const string SweepOnForgetKey = "flagSweepOnForget";') === 1,
    notInShells: !srcHit,
  };
  ok(F(a2).length === 0,
    '★ quotebox2 a2 switch (#1478): QuoteBox2Flags.SweepOnForget is read only in SentSweepOnForget.forget (once; the three sites reach it through their one call, a1); its key is declared once in SpixiFlags.cs and named nowhere else in Spixi/** or src/** — failing: ' + JSON.stringify(F(a2)) + ' ' + JSON.stringify(reads));

  /* ── a3 · switch OFF = the base statements: the blocks minus the statement are the base blocks ── */
  const got = Object.fromEntries(Object.keys(SIG).map((k) => [k, sha(rest(blocks[k]))]));
  const a3 = Object.fromEntries(Object.keys(SIG).map((k) => [k, blocks[k].length > 200 && got[k] === BASE[k]]));
  ok(F(a3).length === 0,
    '★ quotebox2 a3 old path: the undo branch, addContactCore and sendContactRequestGuarded with SentSweepOnForget.forget( given back as SPeerLocalStores.forget( are the base ae7b8303 blocks (SHA-256, stripCode, whitespace collapsed) — the switch OFF runs the base statements — failing: ' + JSON.stringify(F(a3)) + ' got ' + Object.values(got).map((x) => x.slice(0, 12)).join(' '));

  /* ── a4 · gate 18 no longer lists the fixed SpixiContentPage.cs catch ── */
  const smoke = raw('scripts/smoke-test.mjs');
  const g0 = smoke.indexOf('const LEGACY_G3 = [');
  const g1 = g0 >= 0 ? smoke.indexOf('];', g0) : -1;
  const list = g1 > g0 ? stripCode(smoke.slice(g0, g1)) : '';
  const a4 = { found: count(list, ' :: ') >= 5, noScp: !/["']Spixi\/Utils\/SpixiContentPage\.cs ::/.test(list) };
  ok(F(a4).length === 0,
    '★ quotebox2 a4 gate 18: LEGACY_G3 holds no Spixi/Utils/SpixiContentPage.cs entry — fixb5 made sendContactRequestGuarded\'s catch log the type only (pins-fixb5/e-small-fixes e3) — failing: ' + JSON.stringify(F(a4)));
}
