/* ==== The developer-build line of the reply match (contract-quotebox2 § 3c, packet P112; docs/quotebox2-mechanism.md § 4) —
 * `[QB2] reply match reply=<id hex> found=<0|1> cand=<n> deep=<n|-1> idx=<n> via=<load|live> ui=<0|1>`, once per reply-shaped row
 * in SingleChatPage.matchReply, both outcomes, compiled only with SPIXI_DEV_COEXIST (R5).
 * SOURCE PIN (#1735) — LIMITS: SingleChatPage.xaml.cs is MAUI- and Core-bound and UNCOMPILED here, so the keys hold the
 * comment-stripped TEXT (stripCode; brace-matched blocks; preprocessor lines kept), not bindings: a `#define`, a csproj that defines
 * SPIXI_DEV_COEXIST in a store build (the store-release gate of Spixi.csproj, O-35, holds that), a shadow type named ReplyMatchLog /
 * Logging or a call reached by reflection is not seen. The words of the line (grammar, id sanitising, bounds) and the candidate
 * count run in csh QuoteBox2Tests; the deny-list of b4 is a word list, not a data-flow proof.
 *   b1 group     — matchReply holds exactly ONE preprocessor group, `#if SPIXI_DEV_COEXIST` … `#endif` (no #else / #elif, no
 *                  other directive), inside its existing `try { … }`, before the base `if (ReplyQuote.tryMatch(…, out match) …)`.
 *   b2 old path  — matchReply with the group cut equals the base `ae7b8303` body (SHA-256 over stripCode, whitespace collapsed):
 *                  without the symbol the method is the base's.
 *   b3 own catch — the group is ONE statement `try { … } catch (Exception) { }`: a throw of the line stays in its own catch and
 *                  never reaches matchReply's catch (which would draw the fallback box).
 *   b4 words     — the group names `Logging.info("[QB2] " +`, `ReplyMatchLog.body(`, `ReplyMatchLog.candidates(` once each and no
 *                  other Logging call; `message.message` only as the first argument of `ReplyMatchLog.candidates(` and of the ONE
 *                  `ReplyQuote.tryMatch(` that gives `found` (its out is a group-local, never `match`; the group assigns no
 *                  `match`) — ⚠ the contract's "only in candidates" was widened by that one pure call, see the builder report;
 *                  no address / name / text word (friend, walletAddress, address, nick…, …Name, quoteText, excerpt…, `.body`,
 *                  `.text`, `.targetIdHex`). Keys (round 1): `foundAssign` — `qb2Found` is assigned exactly `bool qb2Found =
 *                  ReplyQuote.tryMatch(message.message, replyTime, self, idx, preferred, out ReplyQuote.Match? qb2Match) && qb2Match !=
 *                  null;`; `logCall` — the whole `Logging.info(…);` statement (whitespace collapsed, comments stripped) equals the
 *                  contract § 3c call with ALL its arguments (`self, qb2Found, ReplyMatchLog.candidates(message.message, idx),
 *                  replyDeepCached(channel)?.Count ?? -1, idx.Count, index != null, MainThread.IsMainThread`); `noOtherMessage` — after
 *                  the two `message.message` arguments are removed no `.message` of anything remains; `noExcerpt` — no
 *                  `[Ee]xcerpt` / `byExcerpt` anywhere in the group. NOT proven: that those arguments are the right VALUES at run time
 *                  (the call text is held, not its data flow).
 *   b5 class     — `public static class ReplyMatchLog` is declared once, in SpixiFlags.cs, wholly inside `#if SPIXI_DEV_COEXIST` …
 *                  `#endif`; Spixi/** names ReplyMatchLog nowhere else but inside matchReply's group; the `"[QB2] "` literal is
 *                  in that group only.
 * DELIBERATE BREAKS (#802; one token each in a full copy, `node scripts/run-pins.mjs --root <copy> pins-quotebox2/b-matchlog`; red as
 * observed 2026-11-27):
 *   group    `#if SPIXI_DEV_COEXIST` (matchReply) → `#if SPIXI_DEV_COEXIS` → b1 (one, insideTry, beforeMatch), b2, b3, b4, b5 (onlyHere,
 *            qb2Once) — the group is no longer found at all;
 *   base     `out match) && match != null` → `out match) || match != null` → b1 (found, beforeMatch), b2;
 *   catch    the group's `catch (Exception) { }` → `catch (InvalidOperationException) { }` → b3 (ownCatch);
 *   words    `ReplyMatchLog.body(self,` → `ReplyMatchLog.body(message.message,` → b4 (onlyAsArg);
 *   class    SpixiFlags.cs `#if SPIXI_DEV_COEXIST` above ReplyMatchLog → `#if SPIXI_CSH` → b5 (wrapped);
 *   (round 1, b4 call text — each in the group, red as observed 2026-11-27: BREAKS4)
 *   found    `ReplyMatchLog.body(self, qb2Found,` → `ReplyMatchLog.body(self, !qb2Found,` → b4 (logCall);
 *   swap     `replyDeepCached(channel)?.Count ?? -1, idx.Count,` → `idx.Count, replyDeepCached(channel)?.Count ?? -1,` → b4 (logCall);
 *   via      `index != null` → `index == null` → b4 (logCall);
 *   ui       `MainThread.IsMainThread` → `true` → b4 (logCall);
 *   assign   `&& qb2Match != null;` → `|| qb2Match != null;` → b4 (onlyAsArg, foundAssign);
 *   message  `+ channelSnapshot(channel)[0].message` appended to the Logging.info argument (`MainThread.IsMainThread) + …);`) → b4 (logCall, noOtherMessage);
 *   excerpt  `+ string.Join(",", idx.byExcerpt.Keys)` appended to the Logging.info argument (`MainThread.IsMainThread) + …);`) → b4 (logCall, noExcerpt). */
import { createHash } from 'node:crypto';

export const SCP_F = 'Spixi/Pages/Chat/SingleChatPage.xaml.cs', FLAGS_F = 'Spixi/Utils/SpixiFlags.cs';
export const SIG = 'private bool matchReply(FriendMessage message, int channel, ReplyQuote.Index? index, out ReplyQuote.Match? match)';
export const BASE_IF = 'if (ReplyQuote.tryMatch(message.message, replyTime, self, idx, preferred, out match) && match != null)';
/* SHA-256 of the matchReply body at the base ae7b8303 (git show ae7b8303:<file>; stripCode; whitespace collapsed) */
export const BASE = '534b0a5e4c145fb6151ccd7d6eeb0a505d4ae488b662a1bdfd2c011b72cbac2d';

export const norm = (t) => t.replace(/\s+/g, ' ').trim();
export const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
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
export const bodyOf = (t, sig) => (t.split(sig).length - 1 !== 1 ? '' : blockAt(t, t.indexOf(sig) + sig.length).text);
const DIRECTIVE = /^[ \t]*#[ \t]*(if|elif|else|endif|define|undef|region|endregion|pragma|line|nullable)\b.*$/gm;
/** the ONE `#if SPIXI_DEV_COEXIST` … `#endif` group of `t` (lines included): { at, end, text } or null */
export const groupOf = (t) => {
  const m = /^[ \t]*#if SPIXI_DEV_COEXIST[ \t]*$/m.exec(t);
  if (!m) return null;
  const e = /^[ \t]*#endif[ \t]*$/m.exec(t.slice(m.index));
  if (!e) return null;
  const end = m.index + e.index + e[0].length;
  return { at: m.index, end, text: t.slice(m.index, end), inner: t.slice(m.index + m[0].length, m.index + e.index) };
};

export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, existsSync, join } = h;
  const raw = (f) => (existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8').replace(/^﻿/, '') : '');
  const rd = (f) => stripCode(raw(f));
  const count = (t, s) => (typeof s === 'string' ? t.split(s).length - 1 : (t.match(s) || []).length);
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const body = bodyOf(rd(SCP_F), SIG);
  const g = groupOf(body);
  const G = g ? g.inner : '';

  /* ── b1 · one group, inside the existing try, before the base match ── */
  const tm = /\btry\s*\{/.exec(body), tryAt = tm ? tm.index : -1;
  const tryB = tryAt >= 0 ? blockAt(body, tryAt) : { o: -1, end: -1 };
  const ifAt = body.indexOf(BASE_IF);
  const b1 = {
    found: body.length > 300 && count(body, BASE_IF) === 1,
    one: g !== null && count(body, DIRECTIVE) === 2,
    insideTry: g !== null && g.at > tryB.o && g.end < tryB.end,
    beforeMatch: g !== null && ifAt > g.end && ifAt < tryB.end,
  };
  ok(F(b1).length === 0,
    '★ quotebox2 b1 group (R5, P112): SingleChatPage.matchReply holds exactly ONE `#if SPIXI_DEV_COEXIST` … `#endif` group (no other directive), inside its existing try and before the base tryMatch — failing: ' + JSON.stringify(F(b1)));

  /* ── b2 · the group cut = the base body ── */
  const cut = g ? body.slice(0, g.at) + body.slice(g.end) : body;
  const got = sha(norm(cut));
  ok(g !== null && got === BASE,
    '★ quotebox2 b2 old path: matchReply with its SPIXI_DEV_COEXIST group cut is the base ae7b8303 body (SHA-256, stripCode, whitespace collapsed) — a store build runs the base statements — got ' + got.slice(0, 12));

  /* ── b3 · the line has its own catch ── */
  const gt = G.trim();
  const tb = gt.startsWith('try') ? blockAt(gt, 3) : { end: -1 };
  const b3 = { ownTry: tb.end > 0, ownCatch: tb.end > 0 && norm(gt.slice(tb.end)) === 'catch (Exception) { }' };
  ok(F(b3).length === 0,
    '★ quotebox2 b3 own catch: the group is ONE `try { … } catch (Exception) { }` — a throw of the [QB2] line never reaches matchReply\'s catch (the fallback box) — failing: ' + JSON.stringify(F(b3)));

  /* ── b4 · the words of the group ── */
  const b4 = {
    logOnce: count(G, /\bLogging\s*\./g) === 1 && count(G, 'Logging.info("[QB2] " + ReplyMatchLog.body(') === 1,
    bodyOnce: count(G, /\bReplyMatchLog\s*\.\s*body\s*\(/g) === 1,
    candOnce: count(G, /\bReplyMatchLog\s*\.\s*candidates\s*\(/g) === 1,
    onlyAsArg: count(G, /\bmessage\s*\.\s*message\b/g) === 2 && count(G, 'ReplyMatchLog.candidates(message.message, idx)') === 1
      && count(G, /ReplyQuote\.tryMatch\(message\.message, replyTime, self, idx, preferred, out ReplyQuote\.Match\? (\w+)\) && \1 != null/g) === 1,
    foundAssign: count(norm(G), 'bool qb2Found = ReplyQuote.tryMatch(message.message, replyTime, self, idx, preferred, out ReplyQuote.Match? qb2Match) && qb2Match != null;') === 1
      && count(G, /\bqb2Found\s*=[^=]/g) === 1,
    logCall: (norm(G).match(/Logging\s*\.\s*info\s*\([^;]*;/g) || []).join('|')
      === 'Logging.info("[QB2] " + ReplyMatchLog.body(self, qb2Found, ReplyMatchLog.candidates(message.message, idx), replyDeepCached(channel)?.Count ?? -1, idx.Count, index != null, MainThread.IsMainThread));',
    noOtherMessage: !/\.\s*message\b/.test(G.replace(/\bmessage\s*\.\s*message\b/g, () => '').replace(/\s+/g, ' ')) && count(G, /\bmessage\s*\.\s*message\b/g) === 2,
    noExcerpt: !/[Ee]xcerpt/.test(G),
    noMatchWrite: !/\bout\s+match\b/.test(G) && !/(^|[^.\w])match\s*=[^=]/.test(G),
    noWords: !/\b(friend|walletAddress|[Aa]ddress\w*|nick\w*|\w*Name|quoteText|excerpt\w*)\b/.test(G)
      && !/(?<!ReplyMatchLog)\.\s*(body|text|targetIdHex)\b/.test(G),
  };
  ok(F(b4).length === 0,
    '★ quotebox2 b4 words (G-3, no text / name / address): the group logs once through Logging.info("[QB2] " + ReplyMatchLog.body(…)), names ReplyMatchLog.candidates once, `message.message` only as the first argument of candidates and of the one tryMatch that gives found (a group-local out), assigns `qb2Found` once and no `match`, holds the contract call with all its arguments (logCall), refuses any other `.message` / excerpt, and names no address / name / text word — failing: ' + JSON.stringify(F(b4)));

  /* ── b5 · the class is dev-only; nobody else names it ── */
  const FL = rd(FLAGS_F);
  const cAt = FL.indexOf('public static class ReplyMatchLog');
  const before = cAt >= 0 ? FL.slice(0, cAt).match(DIRECTIVE) || [] : [];
  const cB = cAt >= 0 ? blockAt(FL, cAt) : { end: -1 };
  const after = cB.end > 0 ? (FL.slice(cB.end).match(DIRECTIVE) || []) : [];
  const csFiles = [];
  const walk = (d) => { for (const e of readdirSync(join(root, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) { if (e.name !== 'bin' && e.name !== 'obj') walk(p); } else if (e.name.endsWith('.cs')) csFiles.push(p); } };
  walk('Spixi');
  const names = {}, qb2 = {};
  for (const f of csFiles) {
    const t = rd(f);
    const c = count(t, /\bReplyMatchLog\b/g);
    if (c) names[f] = c;
    const q = count(t, '"[QB2] "');
    if (q) qb2[f] = q;
  }
  const b5 = {
    once: count(FL, 'public static class ReplyMatchLog') === 1,
    wrapped: before.length > 0 && /#if SPIXI_DEV_COEXIST\s*$/.test(before[before.length - 1]) && after.length > 0 && /#endif\s*$/.test(after[0])
      && !/#/.test(cB.end > 0 ? FL.slice(cAt, cB.end).replace(/"[^"\n]*"/g, '""').replace(/'.'/g, "''") : '#'),
    onlyHere: JSON.stringify(names) === JSON.stringify({ [SCP_F]: 2, [FLAGS_F]: 1 }) && count(G, /\bReplyMatchLog\b/g) === 2,
    qb2Once: JSON.stringify(qb2) === JSON.stringify({ [SCP_F]: 1 }) && count(G, '"[QB2] "') === 1,
  };
  ok(F(b5).length === 0,
    '★ quotebox2 b5 class (R5): ReplyMatchLog is declared once in SpixiFlags.cs, wholly inside #if SPIXI_DEV_COEXIST … #endif; Spixi/** names it only inside matchReply\'s group, and the "[QB2] " literal is there only — failing: ' + JSON.stringify(F(b5)) + ' ' + JSON.stringify(names));
}
