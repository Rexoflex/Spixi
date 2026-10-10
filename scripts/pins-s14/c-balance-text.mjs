/* ==== S14 unit C — #1286 no balance in a result TEXT pushed to a WebView.
 *
 * Before S14 `ixian:signSend:<peer>:<huge>` answered signSendResult('fail', "…current balance is X") BEFORE any native
 * confirm — one call read the exact balance into the chat document. payRequestResult (SPayments) and setTipResult (the tip
 * path in SingleChatPage, twice) had the same sentence. Now every over-balance answer to a WebView is
 * SPayments.insufficientText() = the existing "wallet-error-balance-title" key, no number. O-01 (setSendQuote carries the
 * balance + Max for the in-chat Send) is ACCEPTED for v1 (Damir 2026-10-09) and is the ONE allowed sink below.
 *
 * Behaviour over text (#771/#798): a small taint walk over the comment-stripped C# (nothing here can execute — MAUI-bound).
 * Sources = the balance reads (getAvailableBalance / getWalletBalance / IxianHandler.balances / the "wallet-error-balance-text"
 * sentence, whose {1} IS the balance). Taint flows through assignments (`x = …tainted…`) and through a method whose `return`
 * is tainted (its name becomes a source), to a fixpoint. Sinks = the WebView pushes (Utils.sendUiCommand, sendTipResult,
 * sendTipResultFor, SingleChatPage.push, batch.*). A tainted argument at a sink fails, except the accepted list (by command word + file).
 * Native alerts (displaySpixiAlert) are NOT sinks: the user reads those, a script does not.
 * Deliberate breaks (S14 C): restore the balance sentence in signSend · in payRequest · in the tip belt · route the
 * balance through a local variable into sendTipResult · insufficientText formats the balance — each fails its key.
 * #46 r3 (MINOR-3) breaks, each → noLeak false naming the site: a static field set in handleFeeQuery and pushed in
 * handlePayRequest (M18) · the same via a `Type.Prop` property store · a field initializer that reads the balance ·
 * a `foreach (var b in <balance>)` binding pushed as the fail text. */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join } = h;
  const FILES = ['Spixi/Utils/SPayments.cs', 'Spixi/Pages/Chat/SingleChatPage.xaml.cs', 'Spixi/Pages/Contacts/ContactDetails.xaml.cs'];
  const src = Object.fromEntries(FILES.map((f) => [f, stripCode(readFileSync(join(root, f), 'utf8'))]));
  const ACCEPTED = [
    { file: 'Spixi/Utils/SPayments.cs', cmd: 'setSendQuote' },                     // O-01, accepted for v1 (#1286)
    { file: 'Spixi/Pages/Chat/SingleChatPage.xaml.cs', cmd: 'addPaymentRequest' },  // C2: ONE bit per request card (amount the PEER chose, verified balance only) — listed with O-01 (#1286)
  ];

  /* the balanced (...) after index `open` (the '(' itself); string literals skipped */
  const argsAt = (t, open) => {
    let d = 0;
    for (let i = open; i < t.length; i++) {
      const c = t[i];
      if (c === '"') { i++; while (i < t.length && t[i] !== '"') { if (t[i] === '\\') i++; i++; } continue; }
      if (c === '(') d++;
      else if (c === ')') { d--; if (d === 0) return t.slice(open + 1, i); }
    }
    return '';
  };
  /* the expression after `=` up to the ';' at depth 0 */
  const rhsAt = (t, from) => {
    let d = 0;
    for (let i = from; i < t.length; i++) {
      const c = t[i];
      if (c === '"') { i++; while (i < t.length && t[i] !== '"') { if (t[i] === '\\') i++; i++; } continue; }
      if (c === '(' || c === '[' || c === '{') d++;
      else if (c === ')' || c === ']' || c === '}') { if (d === 0) return t.slice(from, i); d--; }
      else if (c === ';' && d === 0) return t.slice(from, i);
    }
    return '';
  };
  const SEEDS = [/\bgetAvailableBalance\s*\(/, /\bgetWalletBalance\s*\(/, /\bIxianHandler\.balances\b/, /"wallet-error-balance-text"/,
    /\bcalculateTransactionFeeFromAvailableBalance\s*\(/];
  const taintedIn = (expr, names) => SEEDS.some((r) => r.test(expr)) || [...names].some((n) => new RegExp('\\b' + n + '\\b').test(expr));

  /* methods (signature + balanced body), per file; a LOCAL's taint is local to a method body (a name in one method is not
     the same variable in another), and a method whose `return` is tainted becomes a source everywhere (its name) — to a
     fixpoint. ★ #46 r3 (MINOR-3): a FIELD or PROPERTY carries a value across methods (`lastBal = balance;` in one method,
     `…("fail", lastBal)` in another), so the walk is CLASS-level too: any name DECLARED at class level in a file (the text
     outside every method body) that receives a tainted value anywhere in that file (a plain or `this.` / `Type.` store,
     or its own initializer) is a source in EVERY method of that file. And `foreach (var x in <tainted>)` taints `x`. */
  const SIG = /\b(?:public|private|internal|protected)\s+(?:static\s+)?(?:async\s+)?(?:override\s+)?[\w<>?\[\],.]+\s+(\w+)\s*\([^)]*\)\s*\{/g;
  const bodies = [];
  const classText = {};      // per file: the text with every method body blanked = the class-level declarations
  const classNames = {};     // per file: every identifier DECLARED at class level (`name =`, `name;`, `name { get`)
  const fields = {};         // per file: the class-level names that received a tainted value somewhere in the file
  for (const f of FILES) {
    const t = src[f];
    let ct = t;
    for (const m of t.matchAll(SIG)) {
      let d = 0, end = -1;
      for (let i = m.index + m[0].length - 1; i < t.length; i++) { if (t[i] === '{') d++; else if (t[i] === '}') { d--; if (d === 0) { end = i; break; } } }
      if (end > 0) {
        bodies.push({ f, name: m[1], at: m.index, body: t.slice(m.index + m[0].length, end), vars: new Set() });
        ct = ct.slice(0, m.index + m[0].length) + ' '.repeat(end - m.index - m[0].length) + ct.slice(end);
      }
    }
    classText[f] = ct;
    classNames[f] = new Set([...ct.matchAll(/\b([A-Za-z_]\w*)\s*(?:=(?![=>])|;|\{\s*(?:get|set|init)\b)/g)].map((m) => m[1]));
    fields[f] = new Set();
  }
  const methods = new Set();
  /* a store `name =` at `at` in `text`: the member path before it (`this.` / `Type.`) or none */
  const storeOf = (text, m) => {
    const pre = text.slice(Math.max(0, m.index - 80), m.index);
    const mm = pre.match(/(?:^|[^\w.])((?:[A-Za-z_]\w*\.)*)$/);
    return mm ? mm[1] : '';
  };
  for (let pass = 0, grew = true; grew && pass < 30; pass++) {
    grew = false;
    /* class-level initializers (`static IxiNumber x = <tainted>;`) */
    for (const f of FILES) {
      const ct = classText[f];
      for (const m of ct.matchAll(/\b([A-Za-z_]\w*)\s*\+?=(?![=>])/g)) {
        if (fields[f].has(m[1]) || !classNames[f].has(m[1])) continue;
        if (taintedIn(rhsAt(ct, m.index + m[0].length), new Set([...methods, ...fields[f]]))) { fields[f].add(m[1]); grew = true; }
      }
    }
    for (const B of bodies) {
      const names = new Set([...B.vars, ...methods, ...fields[B.f]]);
      for (const m of B.body.matchAll(/\b([A-Za-z_]\w*)\s*\+?=(?![=>])/g)) {
        const path = storeOf(B.body, m);
        const member = path !== '';
        const isField = classNames[B.f].has(m[1]) && (!member || /^(?:this\.|[A-Z]\w*\.)$/.test(path));
        if (member && !isField) continue;                                   // a store into another object's member — not followed
        if ((isField ? fields[B.f].has(m[1]) : B.vars.has(m[1])) || !taintedIn(rhsAt(B.body, m.index + m[0].length), names)) continue;
        if (isField) fields[B.f].add(m[1]); else B.vars.add(m[1]);
        names.add(m[1]); grew = true;
      }
      for (const m of B.body.matchAll(/\bforeach\s*\(\s*[\w<>?\[\],.]+\s+([A-Za-z_]\w*)\s+in\s+/g)) {
        if (B.vars.has(m[1])) continue;
        let d = 1, i = m.index + m[0].length;
        for (; i < B.body.length; i++) { if (B.body[i] === '(') d++; else if (B.body[i] === ')') { d--; if (d === 0) break; } }
        if (taintedIn(B.body.slice(m.index + m[0].length, i), names)) { B.vars.add(m[1]); names.add(m[1]); grew = true; }
      }
      if (!methods.has(B.name)) {
        for (const r of B.body.matchAll(/\breturn\s+/g)) {
          if (taintedIn(rhsAt(B.body, r.index + r[0].length), names)) { methods.add(B.name); grew = true; break; }
        }
      }
    }
  }
  /* sinks, per method body */
  const leaks = [];
  for (const B of bodies) {
    const names = new Set([...B.vars, ...methods, ...fields[B.f]]);
    for (const m of B.body.matchAll(/(?<![\w.])(Utils\.sendUiCommand|sendTipResultFor|sendTipResult|push|batch\.\w+)\s*\(/g)) {
      const a = argsAt(B.body, m.index + m[0].length - 1);
      if (!taintedIn(a, names)) continue;
      const cmd = (a.match(/^\s*\w+\s*,\s*"(\w+)"/) || [])[1] || m[1];
      const acc = ACCEPTED.find((x) => x.file === B.f && x.cmd === cmd);
      if (acc) { acc.hit = true; continue; }
      leaks.push(B.f.split('/').pop() + ' ' + B.name + ' ' + cmd);
    }
  }
  const spVars = new Set(bodies.filter((B) => B.name === 'handleFeeQuery').flatMap((B) => [...B.vars]));
  const sp = src['Spixi/Utils/SPayments.cs'];
  const scp = src['Spixi/Pages/Chat/SingleChatPage.xaml.cs'];
  const body = (t, sig) => { const s = t.indexOf(sig); return s < 0 ? '' : t.slice(s, t.indexOf('\n        }\n', s)); };
  const insuf = body(sp, 'public static string insufficientText()');
  const r = {
    noLeak: leaks.length === 0,
    walkSees: methods.has('estimateMaxAmount') && spVars.has('balance') && spVars.has('maxAmount'),   // the walk is live: O-01's own source is found
    acceptedLive: ACCEPTED.every((x) => x.hit),   // the walk really reaches both accepted sinks (a stale allow-list cannot hide)
    acceptedOnly: (sp.match(/"setSendQuote"/g) || []).length === 2,
    textHasNoNumber: /return SpixiLocalization\._SL\("wallet-error-balance-title"\);/.test(insuf) && !/Format|balance|Balance\(|\+/.test(insuf.replace('wallet-error-balance-title', '')),
    signSendUses: /if \(amount \+ fee > availableBalance\)\s*\{\s*Utils\.sendUiCommand\(page, "signSendResult", "fail", insufficientText\(\)\);\s*return;/.test(sp),
    payRequestUses: /if \(amount \+ fee > availableBalance\)\s*\{\s*Utils\.sendUiCommand\(page, "payRequestResult", msgIdHex, "fail", insufficientText\(\)\);\s*return;/.test(sp),
    tipUses: (scp.match(/sendTipResult\(false, SPayments\.insufficientText\(\)\);/g) || []).length === 2,
  };
  ok(Object.values(r).every((x) => x === true),
    '★ S14 (#1286): no balance (or a number derived from it) reaches a WebView in a RESULT TEXT — signSend / payRequest / the tip answer over-balance with SPayments.insufficientText() (the existing "Insufficient Balance" key); a taint walk from the balance reads (through locals, `foreach` bindings, methods that return a tainted value, and class-level FIELDS / PROPERTIES — a field or property that receives a tainted value anywhere in a file, or by its initializer, is a source in every method of that file) to every sendUiCommand / sendTipResult / push / batch.* in SPayments, SingleChatPage and ContactDetails finds only the two accepted sinks (O-01 setSendQuote in SPayments, the C2 addPaymentRequest bit in SingleChatPage) — ' + JSON.stringify({ ...r, leaks }));
}
