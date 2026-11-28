/* ==== The developer-build line of the reply match (contract-quotebox2 § 3c, packet P112; docs/quotebox2-mechanism.md § 4) —
 * `[QB2] reply match reply=<id hex> found=<0|1> cand=<n> deep=<n|-1> idx=<n> via=<load|live> ui=<0|1>`, once per reply-shaped row
 * of SingleChatPage.matchReply, both outcomes, compiled only with SPIXI_DEV_COEXIST (R5).
 * ★ size re-base (2026-11-27, size check R6: SingleChatPage.xaml.cs must not grow): the dev group moved out of matchReply into ONE
 * partial-class member, `SingleChatPage.tryReplyMatch` in Spixi/Pages/Chat/SingleChatPage.ReplyMatch.cs. matchReply's ONE change is its
 * base call line (`ReplyQuote.tryMatch(message.message, replyTime, self, idx, preferred, out match)` → `tryReplyMatch(message, replyTime,
 * self, idx, preferred, out match, channel, index != null)`); tryReplyMatch makes the ONE real tryMatch call, then (dev only) logs the line
 * from its result, then returns that result — so the group's second tryMatch is gone and `found=` is the real match's outcome. The claims
 * are the old ones (one dev group, no other directive; the store build = the base; its own catch; the words; the class dev-only), moved.
 * SOURCE PIN (#1735) — LIMITS: SingleChatPage.xaml.cs / .ReplyMatch.cs are MAUI- and Core-bound and UNCOMPILED here, so the keys hold
 * the comment-stripped TEXT (stripCode; brace-matched blocks; preprocessor lines kept), not bindings: a `#define`, a csproj that defines
 * SPIXI_DEV_COEXIST in a store build (the store-release gate of Spixi.csproj, O-35, holds that), a shadow type named ReplyMatchLog /
 * Logging, an overload of tryReplyMatch in another partial file of a name this pin does not walk, or a call reached by reflection is not
 * seen. The words of the line (grammar, id sanitising, bounds) and the candidate count run in csh QuoteBox2Tests; the deny-list of b4
 * is a word list, not a data-flow proof.
 *   b1 group     — matchReply holds NO preprocessor directive and exactly ONE `tryReplyMatch(` call, the line CALL_IF, inside its
 *                  existing `try { … }`, and no `ReplyQuote.tryMatch(`; tryReplyMatch is declared once (SIG_H, in RM_F) and named
 *                  nowhere else in Spixi/** (★ size re-base: was "matchReply holds ONE group before the base tryMatch");
 *                  RM_F holds exactly ONE preprocessor group, `#if SPIXI_DEV_COEXIST` … `#endif` (no #else / #elif, no other
 *                  directive), inside tryReplyMatch, after its `bool found = …;` and before its `return found;`; RM_F minus the helper's
 *                  body is exactly the usings, the namespace and `public partial class SingleChatPage { SIG_H }` (no other member).
 *   b2 old path  — matchReply with CALL_IF given back as the base line equals the base `ae7b8303` body (SHA-256 over stripCode,
 *                  whitespace collapsed), and tryReplyMatch with its group cut is exactly `{ bool found = ReplyQuote.tryMatch(
 *                  message.message, replyTime, self, idx, preferred, out match); return found; }` with the parameters of SIG_H in the
 *                  order CALL_IF passes them: without the symbol the store build makes the base call with the base arguments and the
 *                  base out, and returns its result (a throw of tryMatch reaches matchReply's catch as in the base).
 *   b3 own catch — the group is ONE statement `try { … } catch (Exception) { }`: a throw of the line stays in its own catch and
 *                  never reaches matchReply's catch (which would draw the fallback box), and `found` is set before it and returned
 *                  after it.
 *   b4 words     — the group names `Logging.info("[QB2] " +`, `ReplyMatchLog.body(`, `ReplyMatchLog.candidates(` once each and no
 *                  other Logging call; `message.message` only as the first argument of `ReplyMatchLog.candidates(` (★ size re-base:
 *                  the group's own tryMatch is gone); the group assigns nothing (no `found` / `match` write, no `out`); no address /
 *                  name / text word (friend, walletAddress, address, nick…, …Name, quoteText, excerpt…, `.body`, `.text`,
 *                  `.targetIdHex`). Keys: `foundAssign` — tryReplyMatch assigns `found` exactly once, `bool found =
 *                  ReplyQuote.tryMatch(message.message, replyTime, self, idx, preferred, out match);`; `logCall` — the whole
 *                  `Logging.info(…);` statement (whitespace collapsed, comments stripped) equals the contract § 3c call with ALL its
 *                  arguments (`self, found && match != null, ReplyMatchLog.candidates(message.message, idx), replyDeepCached(channel)
 *                  ?.Count ?? -1, idx.Count, viaLoad, MainThread.IsMainThread` — `found && match != null` is the old `qb2Found`, and
 *                  `viaLoad` is `index != null` by CALL_IF, b1); `noOtherMessage` — after the one `message.message` argument is removed
 *                  no `.message` of anything remains; `noExcerpt` — no `[Ee]xcerpt` / `byExcerpt` anywhere in the group. NOT proven:
 *                  that those arguments are the right VALUES at run time (the call text is held, not its data flow).
 *   b5 class     — `public static class ReplyMatchLog` is declared once, in SpixiFlags.cs, wholly inside `#if SPIXI_DEV_COEXIST` …
 *                  `#endif`; Spixi/** names ReplyMatchLog nowhere else but inside tryReplyMatch's group; the `"[QB2] "` literal is
 *                  in that group only (★ size re-base: was "inside matchReply's group").
 * DELIBERATE BREAKS (#802; one token each in a full copy, `node scripts/run-pins.mjs --root <copy> pins-quotebox2/b-matchlog`;
 * ★ size re-base: the breaks of the moved code, red as observed 2026-11-27):
 *   group    RM_F `#if SPIXI_DEV_COEXIST` → `#if SPIXI_DEV_COEXIS` → b1 (one, insideHelper), b2 (helper), b3, b4, b5 (onlyHere,
 *            qb2Once) — the group is no longer found at all;
 *   call     SingleChatPage `out match, channel, index != null) && match != null` → `out match, channel, index == null) && match !=
 *            null` → b1 (found, insideTry), b2 (body);
 *   base     RM_F `preferred, out match);` → `null, out match);` → b1 (insideHelper), b2 (helper), b3 (foundAround), b4 (foundAssign);
 *   result   RM_F `return found;` → `return true;` → b1 (insideHelper), b2 (helper), b3 (foundAround);
 *   back     a `#if SPIXI_DEV_COEXIST` / `#endif` pair put back into matchReply around its `long replyTime = …` line → b1 (noDirective),
 *            b2 (body);
 *   catch    the group's `catch (Exception) { }` → `catch (InvalidOperationException) { }` → b3 (ownCatch);
 *   words    `ReplyMatchLog.body(self,` → `ReplyMatchLog.body(message.message,` → b4 (onlyAsArg, logCall, noOtherMessage);
 *   class    SpixiFlags.cs `#if SPIXI_DEV_COEXIST` above ReplyMatchLog → `#if SPIXI_CSH` → b5 (wrapped);
 *   found    `ReplyMatchLog.body(self, found && match != null,` → `ReplyMatchLog.body(self, found || match != null,` → b4 (logCall);
 *   swap     `replyDeepCached(channel)?.Count ?? -1, idx.Count,` → `idx.Count, replyDeepCached(channel)?.Count ?? -1,` → b4 (logCall);
 *   via      `viaLoad, MainThread` → `!viaLoad, MainThread` → b4 (logCall);
 *   ui       `MainThread.IsMainThread` → `true` → b4 (logCall);
 *   assign   `found = ReplyQuote.tryMatch(` → `found = !ReplyQuote.tryMatch(` → b1 (insideHelper), b2 (helper), b3 (foundAround),
 *            b4 (foundAssign);
 *   message  `+ channelSnapshot(channel)[0].message` appended to the Logging.info argument (`MainThread.IsMainThread) + …);`) → b4 (logCall, noOtherMessage);
 *   excerpt  `+ string.Join(",", idx.byExcerpt.Keys)` appended to the Logging.info argument (`MainThread.IsMainThread) + …);`) → b4 (logCall, noExcerpt). */
import { createHash } from 'node:crypto';

export const SCP_F = 'Spixi/Pages/Chat/SingleChatPage.xaml.cs', FLAGS_F = 'Spixi/Utils/SpixiFlags.cs',
  RM_F = 'Spixi/Pages/Chat/SingleChatPage.ReplyMatch.cs';
export const SIG = 'private bool matchReply(FriendMessage message, int channel, ReplyQuote.Index? index, out ReplyQuote.Match? match)';
export const BASE_IF = 'if (ReplyQuote.tryMatch(message.message, replyTime, self, idx, preferred, out match) && match != null)';
/* ★ size re-base: matchReply's one changed line, and the member it calls */
export const CALL_IF = 'if (tryReplyMatch(message, replyTime, self, idx, preferred, out match, channel, index != null) && match != null)';
export const SIG_H = 'private bool tryReplyMatch(FriendMessage message, long replyTime, string self, ReplyQuote.Index idx, string? preferred, out ReplyQuote.Match? match, int channel, bool viaLoad)';
export const HELPER_STORE = '{ bool found = ReplyQuote.tryMatch(message.message, replyTime, self, idx, preferred, out match); return found; }';
export const RM_OUTSIDE = 'using IXICore; using IXICore.Meta; using IXICore.Streaming; using Microsoft.Maui.ApplicationModel; using System; namespace SPIXI { public partial class SingleChatPage { ' + SIG_H + ' } }';
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
  const same = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());   // key order free (readdir order is not fixed)
  const body = bodyOf(rd(SCP_F), SIG);
  const RM = rd(RM_F);
  /* the signature spans two lines in the file: matched with any whitespace run where SIG_H has one space */
  const sigRe = new RegExp(SIG_H.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'), 'g');
  const sigHits = [...RM.matchAll(sigRe)];
  const hAt = sigHits.length === 1 ? sigHits[0].index : -1;
  const hB = hAt >= 0 ? blockAt(RM, hAt + sigHits[0][0].length) : { o: -1, end: -1, text: '' };
  const hBody = hB.text;
  const g = groupOf(hBody);
  const G = g ? g.inner : '';
  const FOUND = 'bool found = ReplyQuote.tryMatch(message.message, replyTime, self, idx, preferred, out match);';
  const csFiles = [];
  const walk = (d) => { for (const e of readdirSync(join(root, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) { if (e.name !== 'bin' && e.name !== 'obj') walk(p); } else if (e.name.endsWith('.cs')) csFiles.push(p); } };
  walk('Spixi');
  const helperNames = {};
  for (const f of csFiles) { const c = count(rd(f), /\btryReplyMatch\b/g); if (c) helperNames[f] = c; }

  /* ── b1 · matchReply: no directive, the one call inside its try; the helper: one group between found and return ── */
  const tm = /\btry\s*\{/.exec(body), tryAt = tm ? tm.index : -1;
  const tryB = tryAt >= 0 ? blockAt(body, tryAt) : { o: -1, end: -1 };
  const ifAt = body.indexOf(CALL_IF);
  const fAt = hBody.indexOf(FOUND), rAt = hBody.lastIndexOf('return found;');
  const b1 = {
    found: body.length > 300 && count(body, CALL_IF) === 1 && count(body, /\btryReplyMatch\s*\(/g) === 1,
    noDirective: body.length > 300 && count(body, DIRECTIVE) === 0 && count(body, /\bReplyQuote\s*\.\s*tryMatch\b/g) === 0,
    insideTry: ifAt > tryB.o && ifAt < tryB.end,
    declaredOnce: hAt >= 0 && same(helperNames, { [SCP_F]: 1, [RM_F]: 1 }),
    one: g !== null && count(RM, DIRECTIVE) === 2 && count(hBody, DIRECTIVE) === 2,
    insideHelper: g !== null && fAt >= 0 && g.at > fAt && rAt > g.end && norm(hBody.slice(rAt)) === 'return found; }',
    onlyMember: hB.end > 0 && norm(RM.slice(0, hB.o) + ' ' + RM.slice(hB.end)) === RM_OUTSIDE,
  };
  ok(F(b1).length === 0,
    '★ quotebox2 b1 group (R5, P112): matchReply has no directive and calls tryReplyMatch once inside its try; SingleChatPage.ReplyMatch.cs holds only tryReplyMatch, with ONE `#if SPIXI_DEV_COEXIST` … `#endif` group between `found` and `return found;` — failing: ' + JSON.stringify(F(b1)) + ' ' + JSON.stringify(helperNames));

  /* ── b2 · the call given back = the base body; the helper without its group = the base call, returned ── */
  const got = sha(norm(body.split(CALL_IF).join(BASE_IF)));
  const store = g ? norm(hBody.slice(0, g.at) + ' ' + hBody.slice(g.end)) : '';
  const b2 = { body: body.length > 300 && got === BASE, helper: store === HELPER_STORE };
  ok(F(b2).length === 0,
    '★ quotebox2 b2 old path: matchReply with its tryReplyMatch line given back as the base tryMatch line is the base ae7b8303 body (SHA-256, stripCode, whitespace collapsed), and tryReplyMatch without its group makes that base call and returns it — a store build runs the base statements — failing: ' + JSON.stringify(F(b2)) + ' got ' + got.slice(0, 12));

  /* ── b3 · the line has its own catch ── */
  const gt = G.trim();
  const tb = gt.startsWith('try') ? blockAt(gt, 3) : { end: -1 };
  const b3 = {
    ownTry: tb.end > 0,
    ownCatch: tb.end > 0 && norm(gt.slice(tb.end)) === 'catch (Exception) { }',
    foundAround: g !== null && count(hBody, /\bfound\s*=[^=]/g) === 1 && fAt >= 0 && fAt < g.at && rAt > g.end,
  };
  ok(F(b3).length === 0,
    '★ quotebox2 b3 own catch: the group is ONE `try { … } catch (Exception) { }` — a throw of the [QB2] line never reaches matchReply\'s catch (the fallback box); `found` is set before it and returned after it — failing: ' + JSON.stringify(F(b3)));

  /* ── b4 · the words of the group ── */
  const b4 = {
    logOnce: count(G, /\bLogging\s*\./g) === 1 && count(G, 'Logging.info("[QB2] " + ReplyMatchLog.body(') === 1,
    bodyOnce: count(G, /\bReplyMatchLog\s*\.\s*body\s*\(/g) === 1,
    candOnce: count(G, /\bReplyMatchLog\s*\.\s*candidates\s*\(/g) === 1,
    onlyAsArg: count(G, /\bmessage\s*\.\s*message\b/g) === 1 && count(G, 'ReplyMatchLog.candidates(message.message, idx)') === 1
      && count(G, /\btryMatch\b/g) === 0,
    foundAssign: count(norm(hBody), FOUND) === 1 && count(hBody, /\bfound\s*=[^=]/g) === 1,
    logCall: (norm(G).match(/Logging\s*\.\s*info\s*\([^;]*;/g) || []).join('|')
      === 'Logging.info("[QB2] " + ReplyMatchLog.body(self, found && match != null, ReplyMatchLog.candidates(message.message, idx), replyDeepCached(channel)?.Count ?? -1, idx.Count, viaLoad, MainThread.IsMainThread));',
    noOtherMessage: !/\.\s*message\b/.test(G.replace(/\bmessage\s*\.\s*message\b/g, () => '').replace(/\s+/g, ' ')) && count(G, /\bmessage\s*\.\s*message\b/g) === 1,
    noExcerpt: !/[Ee]xcerpt/.test(G),
    noWrite: !/\bout\b/.test(G) && !/(^|[^.\w])(match|found)\s*=[^=]/.test(G) && !/(^|[^=!<>])=(?!=)/.test(G.replace(/"[^"\n]*"/g, '""').replace(/=>/g, '')),
    noWords: !/\b(friend|walletAddress|[Aa]ddress\w*|nick\w*|\w*Name|quoteText|excerpt\w*)\b/.test(G)
      && !/(?<!ReplyMatchLog)\.\s*(body|text|targetIdHex)\b/.test(G),
  };
  ok(F(b4).length === 0,
    '★ quotebox2 b4 words (G-3): the group logs once, the contract call with all its arguments (logCall); `message.message` only as the first argument of candidates; no write, no other `.message`, no excerpt, address, name or text word — failing: ' + JSON.stringify(F(b4)));

  /* ── b5 · the class is dev-only; nobody else names it ── */
  const FL = rd(FLAGS_F);
  const cAt = FL.indexOf('public static class ReplyMatchLog');
  const before = cAt >= 0 ? FL.slice(0, cAt).match(DIRECTIVE) || [] : [];
  const cB = cAt >= 0 ? blockAt(FL, cAt) : { end: -1 };
  const after = cB.end > 0 ? (FL.slice(cB.end).match(DIRECTIVE) || []) : [];
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
    onlyHere: same(names, { [RM_F]: 2, [FLAGS_F]: 1 }) && count(G, /\bReplyMatchLog\b/g) === 2,
    qb2Once: same(qb2, { [RM_F]: 1 }) && count(G, '"[QB2] "') === 1,
  };
  ok(F(b5).length === 0,
    '★ quotebox2 b5 class (R5): ReplyMatchLog is declared once in SpixiFlags.cs, wholly inside #if SPIXI_DEV_COEXIST … #endif; Spixi/** names it only inside tryReplyMatch\'s group, and the "[QB2] " literal is there only — failing: ' + JSON.stringify(F(b5)) + ' ' + JSON.stringify(names));
}
