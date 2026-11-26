/* ==== Two of the three small fixes (DECISIONS #1963 (5), packet P104) — the Home decline also runs the Sent sweep and drops the
 * chat's kept media, as its twin SContacts.removeContact does; sendContactRequestGuarded logs the exception TYPE only.
 * The other three sites of #1963 (5) are OWED, not built here: the undo (`ixian:undorequest`, SingleChatPage) and the two
 * pendingDeletion re-adds (ContactNewPage.addContactCore, SpixiContentPage.sendContactRequestGuarded) — P104 names them.
 * SOURCE PIN (#1735) — LIMITS: HomePage.xaml.cs and SpixiContentPage.cs are MAUI- and Core-bound and UNCOMPILED here, so the keys
 * hold the comment-stripped TEXT (stripCode; brace-matched bodies), not bindings: a shadow type named SContacts / ChatMediaStore /
 * SmallFixFlags, an alias, a `#define`, a csproj `Compile Remove` or a call reached by reflection is not seen (the diff review and
 * the Windows compile hold those). What scheduleSentSweep and deleteChat do is held elsewhere (pins-s9/a1-wiring,
 * pins-photo1a/b-store, csh S9MediaTests / ChatMediaStoreTests); the switch block runs in csh (OpusManagedTests flags_*).
 *   e1 decline   — HomePage.onDeclineRequest: inside `if (removed) { … }`, between `SPeerLocalStores.forget(…)` and
 *                  `SNotificationPrefs.forgetContact(…)`, exactly `if (SmallFixFlags.DeclineClears) SContacts.scheduleSentSweep();` then
 *                  `if (SmallFixFlags.DeclineClears) ChatMediaStore.deleteChat(friend.walletAddress);` — the order of the twin
 *                  SContacts.removeContact (read from it: forget → sweep → deleteChat → forgetContact); each once in the body.
 *   (e2 is left free: the undo of #1963 (5) is owed, not built.)
 *   e3 log       — the catch of the Address parse in sendContactRequestGuarded is exactly
 *                  `{ Logging.warn("sendContactRequest: invalid address payload: " + ex.GetType().Name); return; }`; the method names
 *                  `ex.Message` / `ex.ToString` / `ex.StackTrace` nowhere. No switch (a hole-closing fix, #1321).
 *   e4 switch    — over every Spixi/**.cs: `SmallFixFlags.DeclineClears` is read only at the two decline lines; its key is declared
 *                  once in SpixiFlags.cs and named nowhere else in Spixi/** or src/**.
 *   e5 old path  — onDeclineRequest with the two new lines taken out, and sendContactRequestGuarded with the log line given back
 *                  its base text, equal the base `0eda93f5` bodies (SHA-256 over stripCode, whitespace collapsed): the switch OFF
 *                  runs the base statements, and nothing else in the two bodies moved.
 * DELIBERATE BREAKS (#802; one token each in a full copy, `node scripts/run-pins.mjs --root <copy> pins-fixb5/e-small-fixes`):
 *   decline `SContacts.scheduleSentSweep();` → `SContacts.sweepSentOnce();` → e1 (sweepOnce, twinOrder, adjacent) and e5;
 *   decline `SmallFixFlags.DeclineClears) ChatMediaStore` → `SmallFixFlags.OpusManagedOnly) ChatMediaStore` → e1 (mediaOnce,
 *   twinOrder, adjacent), e4 (reads) and e5; log `ex.GetType().Name` → `ex.Message` → e3 (typeOnly, noMessage). */
import { createHash } from 'node:crypto';

export const HP_F = 'Spixi/Pages/Home/HomePage.xaml.cs', SCP_F = 'Spixi/Utils/SpixiContentPage.cs', SC_F = 'Spixi/Utils/SContacts.cs',
  FLAGS_F = 'Spixi/Utils/SpixiFlags.cs';
export const SIG = {
  decline: 'private void onDeclineRequest(string address)',
  guarded: 'public void sendContactRequestGuarded(string str_address)',
  twin: 'public static string removeContact(Friend friend, bool leaveSharedGroups, out List<string> blockers)',
};
export const NEW = {
  dSweep: 'if (SmallFixFlags.DeclineClears) SContacts.scheduleSentSweep();',
  dMedia: 'if (SmallFixFlags.DeclineClears) ChatMediaStore.deleteChat(friend.walletAddress);',
  log: 'Logging.warn("sendContactRequest: invalid address payload: " + ex.GetType().Name);',
  logBase: 'Logging.warn("sendContactRequest: invalid address payload: " + ex.Message);',
};
/* SHA-256 of rest(body) at the base 0eda93f5 (git show 0eda93f5:<file>; stripCode; whitespace collapsed) */
export const BASE = {
  decline: '488a6840b09b0d24d678f797add8d845f832250fa93265edc71d882fbe618ea6',
  guarded: 'eb7d1e662c83000b5461dd9e5a3145ab3281be8a2b87f0ff5b17b7ababbfd56b',
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
/** the body of the ONE member with this signature ('' when absent or not unique) */
export const bodyOf = (t, sig) => (t.split(sig).length - 1 !== 1 ? '' : blockAt(t, t.indexOf(sig) + sig.length).text);
/** a body with the new lines taken out and the log line given back — compared with the base body */
export const rest = (body) => norm(body.split(NEW.dSweep).join('').split(NEW.dMedia).join('').split(NEW.log).join(NEW.logBase));

export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, existsSync, join } = h;
  const raw = (f) => (existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8').replace(/^﻿/, '') : '');
  const rd = (f) => stripCode(raw(f));
  const count = (t, s) => (typeof s === 'string' ? t.split(s).length - 1 : (t.match(s) || []).length);
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const HP = rd(HP_F), SCP = rd(SCP_F), SC = rd(SC_F);
  const dec = bodyOf(HP, SIG.decline), guarded = bodyOf(SCP, SIG.guarded), twin = bodyOf(SC, SIG.twin);

  /* ── e1 · the decline: the twin's calls in the twin's order, inside the success branch ── */
  const ifRemoved = dec.indexOf('if (removed)');
  const okB = ifRemoved >= 0 ? blockAt(dec, ifRemoved).text : '';
  const seq = (t, list) => list.map((s) => (count(t, s) === 1 ? t.indexOf(s) : -1));
  const DEC_ORDER = ['SPeerLocalStores.forget(friend.walletAddress.ToString());', NEW.dSweep, NEW.dMedia, 'SNotificationPrefs.forgetContact(friend.walletAddress.ToString());'];
  const TWIN_ORDER = ['SPeerLocalStores.forget(friend.walletAddress?.ToString());', 'scheduleSentSweep();', 'ChatMediaStore.deleteChat(friend.walletAddress);', 'SNotificationPrefs.forgetContact(friend.walletAddress?.ToString());'];
  const rising = (p) => p.every((x, i) => x >= 0 && (i === 0 || x > p[i - 1]));
  const e1 = {
    found: dec.length > 200 && okB.length > 50 && twin.length > 200,
    sweepOnce: count(dec, 'scheduleSentSweep(') === 1 && count(dec, NEW.dSweep) === 1,
    mediaOnce: count(dec, 'ChatMediaStore.') === 1 && count(dec, NEW.dMedia) === 1,
    twinOrder: rising(seq(twin, TWIN_ORDER)) && rising(seq(okB, DEC_ORDER)),
    adjacent: norm(okB).includes(norm(DEC_ORDER.join(' '))),
  };
  ok(F(e1).length === 0,
    '★ fixb5 e1 decline (#1963 (5), P104): HomePage.onDeclineRequest runs, in its `if (removed)` branch only, `if (SmallFixFlags.DeclineClears) SContacts.scheduleSentSweep();` then `if (SmallFixFlags.DeclineClears) ChatMediaStore.deleteChat(friend.walletAddress);` between SPeerLocalStores.forget and SNotificationPrefs.forgetContact — the order of its twin SContacts.removeContact — failing: ' + JSON.stringify(F(e1)));

  /* ── e3 · the log line: the exception TYPE only ── */
  const pAt = guarded.indexOf('address = new Address(str_address);');
  const cAt = pAt >= 0 ? guarded.indexOf('catch', pAt) : -1;
  const catchB = cAt >= 0 ? blockAt(guarded, cAt).text : '';
  const e3 = {
    found: catchB.length > 10,
    typeOnly: norm(catchB) === norm('{ ' + NEW.log + ' return; }'),
    noMessage: !/\bex\s*\.\s*(Message|ToString|StackTrace)\b/.test(guarded) && !/[+,(]\s*ex\s*[),;]/.test(guarded),
  };
  ok(F(e3).length === 0,
    '★ fixb5 e3 log (#1963 (5), P104; no switch, #1321): the Address-parse catch of sendContactRequestGuarded is exactly `{ Logging.warn("sendContactRequest: invalid address payload: " + ex.GetType().Name); return; }` — a type name cannot carry the address; the method names no ex.Message / ToString / StackTrace — failing: ' + JSON.stringify(F(e3)));

  /* ── e4 · the switch is read only at its own two lines; its key only in the switch block ── */
  const csFiles = [];
  const walk = (d) => { for (const e of readdirSync(join(root, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) { if (e.name !== 'bin' && e.name !== 'obj') walk(p); } else if (e.name.endsWith('.cs')) csFiles.push(p); } };
  walk('Spixi');
  const reads = {}, keyFiles = [];
  for (const f of csFiles) {
    const t = rd(f);
    const c = count(t, /\bSmallFixFlags\.DeclineClears\b/g);
    if (c) reads[f] = c;
    if (/flagDeclineClears|\bDeclineClearsKey\b/.test(t)) keyFiles.push(f);
  }
  let srcHit = false;
  const w = (d) => { if (!existsSync(join(root, d))) return; for (const e of readdirSync(join(root, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) w(p); else if (/flagDeclineClears/.test(raw(p))) srcHit = true; } };
  w('src');
  const e4 = {
    reads: JSON.stringify(reads) === JSON.stringify({ [HP_F]: 2 }),
    keyOnlyInFlags: JSON.stringify(keyFiles) === JSON.stringify([FLAGS_F]),
    keyDeclared: count(rd(FLAGS_F), 'public const string DeclineClearsKey = "flagDeclineClears";') === 1,
    notInShells: !srcHit,
  };
  ok(F(e4).length === 0,
    '★ fixb5 e4 switch (#1478): SmallFixFlags.DeclineClears is read only at the two decline lines of HomePage; its key is declared once in SpixiFlags.cs and named nowhere else in Spixi/** or src/** — failing: ' + JSON.stringify(F(e4)) + ' ' + JSON.stringify(reads));

  /* ── e5 · switch OFF = the base statements: the bodies minus the change are the base bodies ── */
  const e5 = { decline: sha(rest(dec)) === BASE.decline, guarded: sha(rest(guarded)) === BASE.guarded };
  ok(F(e5).length === 0,
    '★ fixb5 e5 old path: onDeclineRequest without its two new lines and sendContactRequestGuarded with its base log line are the base 0eda93f5 bodies (SHA-256, stripCode, whitespace collapsed) — the switch OFF runs the base statements — failing: ' + JSON.stringify(F(e5)) + ' got ' + sha(rest(dec)).slice(0, 12) + ' ' + sha(rest(guarded)).slice(0, 12));
}
