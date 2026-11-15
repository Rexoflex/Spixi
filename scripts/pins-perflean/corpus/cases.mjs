/* The hostile-input corpus of the lean strips (P-06 CSS, P-07 JS) — docs/contract-perflean.md.
 * Data, one case per entry:
 *   { id, kind: 'js' | 'css' | 'html', input, expect }           the exact output
 *   { id, kind, input, throws: '<regexp source>' }                the strip must THROW, message matching
 *   js:   keepLines (default true = the three external files; false = an inline script)
 *   html: css / js (default both true) = the lean flags given to leanHtml
 * Runner: node scripts/pins-perflean/x-parser-crosscheck.mjs --corpus (every JS case that does
 * not throw is also checked by acorn: the same token stream, and with keepLines every token on
 * the same line; every case must be idempotent).
 * Control characters are built with String.fromCharCode, never typed or escaped (#257).
 */
const CR = String.fromCharCode(13);
const NUL = String.fromCharCode(0);
const BT = '`';

export default [
  /* ── JS: strings ── */
  { id: 'js-str-slash-star', kind: 'js', input: 'var a = "/* not */"; // c', expect: 'var a = "/* not */";' },
  { id: 'js-str-dslash', kind: 'js', input: "var u = 'http://x//y'; /* c */ f(u);", expect: "var u = 'http://x//y';  f(u);" },
  { id: 'js-str-quotes-escapes', kind: 'js', input: 'var s = \'it\\\'s /* x */ "q"\' + "a\\"//b"; // tail', expect: 'var s = \'it\\\'s /* x */ "q"\' + "a\\"//b";' },
  { id: 'js-str-line-continuation', kind: 'js', input: "var s = 'a\\\n// not a comment';", expect: "var s = 'a\\\n// not a comment';" },
  { id: 'js-str-licence-marker-in-string', kind: 'js', input: "var s = '/*! no */'; /* drop */", expect: "var s = '/*! no */';" },
  /* ── JS: template literals ── */
  { id: 'js-tpl-nested', kind: 'js', input: 'var t = ' + BT + 'a ${ ' + BT + 'b ${ c /* x */ } d' + BT + ' } e' + BT + '; // z', expect: 'var t = ' + BT + 'a ${ ' + BT + 'b ${ c  } d' + BT + ' } e' + BT + ';' },
  { id: 'js-tpl-subst-strings', kind: 'js', input: 'var t = ' + BT + "${ '/*' } not ${ \"*/\" }" + BT + '; /* real */', expect: 'var t = ' + BT + "${ '/*' } not ${ \"*/\" }" + BT + ';' },
  { id: 'js-tpl-subst-comment', kind: 'js', input: 'var t = ' + BT + 'x${ a /* c */ }y' + BT + ';', expect: 'var t = ' + BT + 'x${ a  }y' + BT + ';' },
  { id: 'js-tpl-backtick-in-string-in-subst', kind: 'js', input: 'var t = ' + BT + "x${ '" + BT + "' + \"" + BT + '" }y' + BT + '; // c', expect: 'var t = ' + BT + "x${ '" + BT + "' + \"" + BT + '" }y' + BT + ';' },
  { id: 'js-tpl-blank-line-trailing-spaces', kind: 'js', keepLines: false, input: 'var t = ' + BT + 'a  \n\n  b' + BT + '; // c\n// only\nx();', expect: 'var t = ' + BT + 'a  \n\n  b' + BT + ';\nx();' },
  { id: 'js-tpl-comment-like-content', kind: 'js', input: 'var t = ' + BT + '// not\n/* not */' + BT + '; // yes', expect: 'var t = ' + BT + '// not\n/* not */' + BT + ';' },
  { id: 'js-tpl-object-in-subst', kind: 'js', input: 'var t = ' + BT + '${ { a: 1 }.a / 2 }' + BT + '; // c', expect: 'var t = ' + BT + '${ { a: 1 }.a / 2 }' + BT + ';' },
  /* ── JS: regular expressions ── */
  { id: 'js-re-class-slash-star', kind: 'js', input: 'var r = /[/*]/g; var s = 1; /* real */ var t = 2;', expect: 'var r = /[/*]/g; var s = 1;  var t = 2;' },
  { id: 'js-re-escaped-slash', kind: 'js', input: 'var r = /\\//; /* c */', expect: 'var r = /\\//;' },
  { id: 'js-re-class-bracket', kind: 'js', input: 'var r = /[\\]/]/; // c', expect: 'var r = /[\\]/]/;' },
  { id: 'js-re-dquote', kind: 'js', input: 'var r = /"/; var s = "x"; // c', expect: 'var r = /"/; var s = "x";' },
  { id: 'js-re-squote', kind: 'js', input: "var r = /'/; var s = 'x'; // c", expect: "var r = /'/; var s = 'x';" },
  { id: 'js-re-after-if-paren', kind: 'js', input: 'if (a) /x*/.test(s) && f(); // c', expect: 'if (a) /x*/.test(s) && f(); // c' },   // rule K: the `/` after `)` of an `if` is WEAK; the comment in its tail stays (sibling: js-r2-sib-if-paren)
  { id: 'js-re-after-while-paren', kind: 'js', input: 'while (a) /[*/]/.exec(s); // c', expect: 'while (a) /[*/]/.exec(s); // c' },   // rule K (sibling: js-r2-sib-while-paren)
  { id: 'js-re-after-return', kind: 'js', input: 'function f() { return /a\\/b*/.source; } // c', expect: 'function f() { return /a\\/b*/.source; }' },
  { id: 'js-re-after-arrow', kind: 'js', input: 'var f = () => /[//]/.test(x); // c', expect: 'var f = () => /[//]/.test(x);' },
  { id: 'js-re-after-brace-open', kind: 'js', input: '{ /x*/.test(s); } // c', expect: '{ /x*/.test(s); }' },
  { id: 'js-re-after-brace-close-block', kind: 'js', input: 'if (a) {}\n/foo*/g.test(s); // c', expect: 'if (a) {}\n/foo*/g.test(s); // c' },   // rule K: a `/` after the `}` of a block is weak (sibling: js-r2-sib-brace-close-block)
  { id: 'js-re-after-semicolon', kind: 'js', input: 'a();/b*/.test(c); // c', expect: 'a();/b*/.test(c);' },
  { id: 'js-re-after-comma', kind: 'js', input: 'f(1, /,*/g); // c', expect: 'f(1, /,*/g);' },
  { id: 'js-re-after-open-paren', kind: 'js', input: 'f(/[)]*/); // c', expect: 'f(/[)]*/);' },
  { id: 'js-re-after-open-bracket', kind: 'js', input: 'var a = [/]*/]; // c', expect: 'var a = [/]*/];' },
  { id: 'js-re-after-bang', kind: 'js', input: 'if (!/x*/.test(s)) {} // c', expect: 'if (!/x*/.test(s)) {}' },
  { id: 'js-re-after-and', kind: 'js', input: 'a && /x*/.test(s); // c', expect: 'a && /x*/.test(s);' },
  { id: 'js-re-after-question-colon', kind: 'js', input: 'var v = c ? /a*/ : /b*/; // c', expect: 'var v = c ? /a*/ : /b*/;' },
  { id: 'js-re-after-typeof', kind: 'js', input: 'var k = typeof /x*/; // c', expect: 'var k = typeof /x*/;' },
  { id: 'js-re-v-flag', kind: 'js', input: 'var r = /[[a-z]--[aeiou]]/v; // c', expect: 'var r = /[[a-z]--[aeiou]]/v;' },
  { id: 'js-re-after-case', kind: 'js', input: 'switch (x) { case 1: /a*/.test(s); break; default: /b*/.test(s); } // c', expect: 'switch (x) { case 1: /a*/.test(s); break; default: /b*/.test(s); }' },
  { id: 'js-re-after-label', kind: 'js', input: 'lbl: /a*/.test(s); // c', expect: 'lbl: /a*/.test(s);' },
  /* ── JS: divisions (a regex reading would run to the end of the line and throw) ── */
  { id: 'js-div-chain', kind: 'js', input: 'var x = a / b / c; // c', expect: 'var x = a / b / c;' },
  { id: 'js-div-paren', kind: 'js', input: 'var x = (a) / 2\nvar y = 1; // c', expect: 'var x = (a) / 2\nvar y = 1;' },
  { id: 'js-div-postfix', kind: 'js', input: 'x++ / y\n// c', expect: 'x++ / y\n// c' },   // r3 A-2 (2): the `//` line right after a tail line stays (rule K); was 'x++ / y\n'
  { id: 'js-div-index', kind: 'js', input: 'a[0] / b\n// c', expect: 'a[0] / b\n' },
  { id: 'js-div-call-tail', kind: 'js', input: 'fn() / 2 // tail', expect: 'fn() / 2 // tail' },   // rule K: a `/` after the `)` of a call is weak (sibling: js-r2-sib-div-call-tail)
  { id: 'js-div-object', kind: 'js', input: 'x = {} / 2\n', expect: 'x = {} / 2\n' },
  { id: 'js-div-fexpr', kind: 'js', input: 'x = function () {} / 2\n', expect: 'x = function () {} / 2\n' },
  { id: 'js-div-class-expr', kind: 'js', input: 'x = class {} / 2\n', expect: 'x = class {} / 2\n' },
  { id: 'js-div-this-null', kind: 'js', input: 'x = this / 2 + null / 3\n', expect: 'x = this / 2 + null / 3\n' },
  { id: 'js-div-property-keyword', kind: 'js', input: 'x = a.return / 2 + b.typeof / 3\n', expect: 'x = a.return / 2 + b.typeof / 3\n' },
  /* ⚠ acorn 8.19 MISREADS this one (it starts a regular expression after `?.typeof`; it checks only `.`
     before a keyword) — V8 compiles it as two divisions. So this case is checked by V8, not by acorn. */
  { id: 'js-div-optional-chain-keyword', kind: 'js', acorn: false, input: 'x = b?.typeof /3/ 4 // c\n', expect: 'x = b?.typeof /3/ 4\n' },
  { id: 'js-div-assign', kind: 'js', input: 'x /= 2; // c', expect: 'x /= 2;' },
  { id: 'js-div-after-comment', kind: 'js', input: 'a /* c */ / b\n', expect: 'a  / b\n' },
  { id: 'js-div-comment-in-object', kind: 'js', input: 'var o = { a: 1 /* c */ } / 2;', expect: 'var o = { a: 1  } / 2;' },
  { id: 'js-div-object-newline', kind: 'js', input: 'var o = { a: 1, /* c */ }\n/ 2;', expect: 'var o = { a: 1,  }\n/ 2;' },
  /* ── JS: glue and line terminators ── */
  { id: 'js-glue-block', kind: 'js', input: 'let/**/b = new/**/B, c = a/**/in/**/o, d = typeof/**/e', expect: 'let b = new B, c = a in o, d = typeof e' },
  { id: 'js-glue-plus', kind: 'js', input: 'a+/**/+b', expect: 'a+ +b' },
  { id: 'js-glue-two-comments', kind: 'js', input: 'x = a/**//* x */instanceof B', expect: 'x = a instanceof B' },
  { id: 'js-glue-not-js', kind: 'js', acorn: false, input: 'a/**/b', expect: 'a b' },
  { id: 'js-asi-line-comment', kind: 'js', input: 'a //c\n/b/g', expect: 'a\n/b/g' },
  { id: 'js-asi-return', kind: 'js', input: 'function f() { return /* \n */ x }', expect: 'function f() { return\n x }' },
  { id: 'js-asi-prefix-inc', kind: 'js', input: 'a\n/* c */++b', expect: 'a\n++b' },
  { id: 'js-asi-comment-then-newline', kind: 'js', input: 'a /* c */\n++b', expect: 'a\n++b' },
  { id: 'js-multiline-keeplines', kind: 'js', input: 'a();\n/* one\n two\n three */ b();', expect: 'a();\n\n\n b();' },
  { id: 'js-multiline-inline-drop', kind: 'js', keepLines: false, input: 'a();\n  // only comment\n\n/* block\n spanning */\nb();', expect: 'a();\n\nb();' },
  { id: 'js-eof-line-comment', kind: 'js', input: 'var a = 1; // end', expect: 'var a = 1;' },
  { id: 'js-crlf', kind: 'js', input: 'var a = 1; // c' + CR + '\nvar b = \'/*\'; /* x' + CR + '\n y */ var c;' + CR + '\n', expect: 'var a = 1;' + CR + '\nvar b = \'/*\';' + CR + '\n var c;' + CR + '\n' },
  /* ── JS: kept comments ── */
  { id: 'js-carrier-in-code-and-comment', kind: 'js', input: "if ('*SL{X}' === '1') f(); /* *SL{Y} */ // *SL{Z}\n/* plain */ g('*SL{X}');", expect: "if ('*SL{X}' === '1') f(); /* *SL{Y} */ // *SL{Z}\n g('*SL{X}');" },
  { id: 'js-carrier-line-tail', kind: 'js', input: "if (x) return;          // 'pseudo', '*SL{K}', junk\ny();", expect: "if (x) return;          // 'pseudo', '*SL{K}', junk\ny();" },
  /* a URL INSIDE A STRING is not a comment; the comment after it has no keep word, so it goes (a URL comment is KEPT since review S-4: js-r1-s4-*) */
  { id: 'js-url-in-strings', kind: 'js', input: "var u = 'http://example.com/a'; // plain note", expect: "var u = 'http://example.com/a';" },
  { id: 'js-licence-bang', kind: 'js', input: '/*! keep me */\nvar a = 1; /* drop */', expect: '/*! keep me */\nvar a = 1;' },
  { id: 'js-licence-run', kind: 'js', input: '// Copyright (c) X\n// Licensed under the MIT license:\n//  http://x\n// plain\nvar a;', expect: '// Copyright (c) X\n// Licensed under the MIT license:\n//  http://x\n// plain\nvar a;' },
  { id: 'js-licence-run-broken', kind: 'js', input: '// Copyright X\n\n// plain\nvar a;', expect: '// Copyright X\n\n\nvar a;' },
  { id: 'js-licence-words', kind: 'js', input: '/* SPDX-License-Identifier: MIT */ /* (c) \u00a9 2020 */ /* Apache-2.0 */ /* @preserve */ /* LIMIT */ x;', expect: '/* SPDX-License-Identifier: MIT */ /* (c) \u00a9 2020 */ /* Apache-2.0 */ /* @preserve */  x;' },
  /* ── JS: modern syntax ── */
  { id: 'js-modern', kind: 'js', input: 'lbl: for (const k of o) { a?.b ?? c ** 2; x = 1_000 / 2; y = .5 / 2; z = 0x1F / 2n; } // c', expect: 'lbl: for (const k of o) { a?.b ?? c ** 2; x = 1_000 / 2; y = .5 / 2; z = 0x1F / 2n; }' },
  { id: 'js-class', kind: 'js', input: 'class A extends B { static #x = /re*/g; /* c */ m() { return /a*/; } get g() { return 1 / 2; } static { /s*/.test(q); } }\nvar d = class {} / 2;', expect: 'class A extends B { static #x = /re*/g;  m() { return /a*/; } get g() { return 1 / 2; } static { /s*/.test(q); } }\nvar d = class {} / 2;' },
  { id: 'js-class-field-asi', kind: 'js', input: 'class A {\n  f = () => {}\n  g = 1\n  m() { return /x*/; } // c\n}', expect: 'class A {\n  f = () => {}\n  g = 1\n  m() { return /x*/; }\n}' },
  { id: 'js-object-methods', kind: 'js', input: 'var o = { if() { return /i*/; }, get x() { return 2 / 1; }, [k]() {}, async m() { await f(); }, ...r }; // c', expect: 'var o = { if() { return /i*/; }, get x() { return 2 / 1; }, [k]() {}, async m() { await f(); }, ...r };' },
  { id: 'js-async-arrow', kind: 'js', input: 'var f = async (a, { b }) => { const [c] = await g(a); return c / b; }; // c', expect: 'var f = async (a, { b }) => { const [c] = await g(a); return c / b; };' },
  { id: 'js-ternary-object', kind: 'js', input: 'var v = a ? { b: 1 } : { c: 2 }; // c', expect: 'var v = a ? { b: 1 } : { c: 2 };' },
  /* ── JS: refusals ── */
  { id: 'js-throw-html-open', kind: 'js', input: 'a <!-- b', throws: 'HTML-like comment "<!--"' },
  { id: 'js-throw-html-close', kind: 'js', input: 'x\n--> y', throws: 'HTML-like comment "-->"' },
  { id: 'js-throw-unterminated-string', kind: 'js', input: "var s = 'abc\nx';", throws: 'unterminated string' },
  { id: 'js-throw-unterminated-template', kind: 'js', input: 'var t = ' + BT + 'abc', throws: 'unterminated template' },
  { id: 'js-throw-unterminated-comment', kind: 'js', input: 'a(); /* x', throws: 'unterminated block comment' },
  { id: 'js-throw-unterminated-regex', kind: 'js', input: 'var r = /abc\n/;', throws: 'unterminated regular expression' },
  { id: 'js-throw-nul', kind: 'js', input: 'a' + NUL + 'b', throws: 'NUL' },
  { id: 'js-throw-yield-slash', kind: 'js', input: 'x = yield / 2', throws: 'after "yield"' },
  { id: 'js-throw-of-slash', kind: 'js', input: 'for (const x of /a/g.exec(s)) {}', throws: 'after "of"' },
  { id: 'js-throw-after-method-body', kind: 'js', input: 'var o = { m() {} / 2 }', throws: 'method' },
  { id: 'js-throw-brace-after-expr', kind: 'js', input: 'x {}', throws: 'same line' },
  { id: 'js-throw-hashbang', kind: 'js', input: '#!/usr/bin/env node\nx();', throws: 'hashbang' },
  { id: 'js-throw-unclosed-paren', kind: 'js', input: 'f(a', throws: 'ends inside' },
  /* ── JS: the fixes of review round 1 (A-1 raw U+2028 / U+2029 and CR, A-2 ASI after return / break / continue / debugger, A-3 lone CR, A-6 extends, S-4 kept URLs and
     attribution words) and the witnesses of the scanner mutations that survived the first pins (the lead's own list, V8-checked: c-js runs every js-r1-* case in V8, both keepLines modes) ── */
  ...((LS, PS) => [
    { id: 'js-r1-a1-ls-keep', kind: 'js', input: '/* c */ var s = "a   ' + LS + 'b"; s.length', expect: ' var s = "a   ' + LS + 'b"; s.length' },
    { id: 'js-r1-a1-ls-nokeep', kind: 'js', keepLines: false, input: '/* c */ var s = "a   ' + LS + 'b"; s.length', expect: ' var s = "a   ' + LS + 'b"; s.length' },
    { id: 'js-r1-a1-ps-keep', kind: 'js', input: '/* c */ var s = "a   ' + PS + 'b"; s.length', expect: ' var s = "a   ' + PS + 'b"; s.length' },
    { id: 'js-r1-a1-ps-nokeep', kind: 'js', keepLines: false, input: '/* c */ var s = "a   ' + PS + 'b"; s.length', expect: ' var s = "a   ' + PS + 'b"; s.length' },
    { id: 'js-r1-a1-ls-line-comment', kind: 'js', input: 'var s = "a\t ' + LS + '" // c\n; s.length', expect: 'var s = "a\t ' + LS + '"\n; s.length' },
    { id: 'js-r1-a1-json-ls', kind: 'js', keepLines: false, input: '/* c */ var j = JSON.parse(\'{"k":"x  ' + LS + '  y"}\'); j.k.length', expect: ' var j = JSON.parse(\'{"k":"x  ' + LS + '  y"}\'); j.k.length' },
    { id: 'js-r1-a1-json-ps-keep', kind: 'js', input: '/* c */ var j = JSON.parse(\'{"k":"x  ' + PS + '  y"}\'); j.k.length', expect: ' var j = JSON.parse(\'{"k":"x  ' + PS + '  y"}\'); j.k.length' },
    { id: 'js-r1-a1-template-ls', kind: 'js', input: '/* c */ var s = ' + BT + 'a  ' + LS + 'b' + BT + '; s.length', expect: ' var s = ' + BT + 'a  ' + LS + 'b' + BT + '; s.length' },
    { id: 'js-r1-a1-template-ps-nokeep', kind: 'js', keepLines: false, input: '/* c */ var s = ' + BT + 'a  ' + PS + 'b' + BT + '; s.length', expect: ' var s = ' + BT + 'a  ' + PS + 'b' + BT + '; s.length' },
    { id: 'js-r1-a1-continuation-ls', kind: 'js', input: '/* c */ var s = \'a  \\' + LS + 'b\'; s.length', expect: ' var s = \'a  \\' + LS + 'b\'; s.length' },
    { id: 'js-r1-a2-debugger-function', kind: 'js', input: 'var s = "/", n = 0; function g() { n++ }\ndebugger\nfunction f() {}\n/[/* x */]/.test(s) && g()\nn', expect: 'var s = "/", n = 0; function g() { n++ }\ndebugger\nfunction f() {}\n/[/* x */]/.test(s) && g()\nn' },
    { id: 'js-r1-a2-return-function', kind: 'js', input: 'var s = "/", n = 0; function g() { n++ }\nfunction h(c) { if (c) return\nfunction f() {}\n/[/* x */]/.test(s) && g() }\nh(0); n', expect: 'var s = "/", n = 0; function g() { n++ }\nfunction h(c) { if (c) return\nfunction f() {}\n/[/* x */]/.test(s) && g() }\nh(0); n' },
    { id: 'js-r1-a2-break-function', kind: 'js', input: 'var s = "/", n = 0; function g() { n++ }\nfor (;;) { if (n) break\nfunction f() {}\n/[/* x */]/.test(s) && g() }\nn', expect: 'var s = "/", n = 0; function g() { n++ }\nfor (;;) { if (n) break\nfunction f() {}\n/[/* x */]/.test(s) && g() }\nn' },
    { id: 'js-r1-a2-continue-function', kind: 'js', input: 'var s = "/", n = 0, k = 0; function g() { n++ }\nfor (; k < 2; k++) { if (k) continue\nfunction f() {}\n/[/* x */]/.test(s) && g() }\nn', expect: 'var s = "/", n = 0, k = 0; function g() { n++ }\nfor (; k < 2; k++) { if (k) continue\nfunction f() {}\n/[/* x */]/.test(s) && g() }\nn' },
    { id: 'js-r1-a2-debugger-class', kind: 'js', input: 'var s = "/", n = 0; function g() { n++ }\ndebugger\nclass A {}\n/[/* x */]/.test(s) && g()\nn', expect: 'var s = "/", n = 0; function g() { n++ }\ndebugger\nclass A {}\n/[/* x */]/.test(s) && g()\nn' },
    { id: 'js-r1-a2-debugger-async-function', kind: 'js', input: 'var s = "/", n = 0; function g() { n++ }\ndebugger\nasync function f() {}\n/[/* x */]/.test(s) && g()\nn', expect: 'var s = "/", n = 0; function g() { n++ }\ndebugger\nasync function f() {}\n/[/* x */]/.test(s) && g()\nn' },
    { id: 'js-r1-a2-break-label-regex', kind: 'js', input: 'var s = "/", n = 0; function g() { n++ }\nL: for (var k = 0; k < 2; k++) { if (k) break L\n/[/* x */]/.test(s) && g() }\nn', expect: 'var s = "/", n = 0; function g() { n++ }\nL: for (var k = 0; k < 2; k++) { if (k) break L\n/[/* x */]/.test(s) && g() }\nn' },
    { id: 'js-r1-a2-continue-label-regex', kind: 'js', input: 'var s = "/", n = 0; function g() { n++ }\nL: for (var k = 0; k < 2; k++) { if (k) continue L\n/[/* x */]/.test(s) && g() }\nn', expect: 'var s = "/", n = 0; function g() { n++ }\nL: for (var k = 0; k < 2; k++) { if (k) continue L\n/[/* x */]/.test(s) && g() }\nn' },
    { id: 'js-r1-a2-break-label-function', kind: 'js', input: 'var s = "/", n = 0; function g() { n++ }\nL: for (;;) { if (n) break L\nfunction f() {}\n/[/* x */]/.test(s) && g() }\nn', expect: 'var s = "/", n = 0; function g() { n++ }\nL: for (;;) { if (n) break L\nfunction f() {}\n/[/* x */]/.test(s) && g() }\nn' },
    { id: 'js-r1-a2-yield-function', kind: 'js', input: 'var s = "/", n = 0; function g() { n++ }\nfunction* q() { yield\nfunction f() {}\n/[/* x */]/.test(s) && g() }\nvar it = q(); it.next(); it.next(); n', expect: 'var s = "/", n = 0; function g() { n++ }\nfunction* q() { yield\nfunction f() {}\n/[/* x */]/.test(s) && g() }\nvar it = q(); it.next(); it.next(); n' },
    { id: 'js-r1-a2-return-semicolon-function', kind: 'js', input: 'var s = "/", n = 0; function g() { n++ }\nfunction h(c) { if (c) return;\nfunction f() {}\n/[/* x */]/.test(s) && g() }\nh(0); n', expect: 'var s = "/", n = 0; function g() { n++ }\nfunction h(c) { if (c) return;\nfunction f() {}\n/[/* x */]/.test(s) && g() }\nh(0); n' },
    { id: 'js-r1-a2-await-function-refused', kind: 'js', input: 'async function h() { var g = 1; await\nfunction f() {}\n/[/* x */]/g }\n1', throws: 'after "await" and a line break' },
    { id: 'js-r1-a2-await-class-refused', kind: 'js', input: 'async function h() { var g = 1; await\nclass A {}\n/[/* x */]/g }\n1', throws: 'after "await" and a line break' },
    { id: 'js-r1-a2-await-async-function-refused', kind: 'js', input: 'async function h() { var g = 1; await\nasync function f() {}\n/[/* x */]/g }\n1', throws: 'after "await" and a line break' },
    { id: 'js-r1-a2-await-sloppy-function-refused', kind: 'js', keepLines: false, input: 'var s = "/", n = 0; function g() { n++ }\nfunction h() { await\nfunction f() {}\n/[/* x */]/.test(s) && g() }\nvar await; h(); n', throws: 'after "await" and a line break' },
    { id: 'js-r1-a3-lone-cr-before-block-keep', kind: 'js', input: 'a = 1' + CR + '/* c */\nb = 2', throws: 'lone CR' },
    { id: 'js-r1-a3-lone-cr-before-block-nokeep', kind: 'js', keepLines: false, input: 'a = 1' + CR + '/* c */\nb = 2', throws: 'lone CR' },
    { id: 'js-r1-a3-lone-cr-before-line-keep', kind: 'js', input: 'a' + CR + '// c\nb', throws: 'lone CR' },
    { id: 'js-r1-a3-lone-cr-before-line-nokeep', kind: 'js', keepLines: false, input: 'a' + CR + '// c\nb', throws: 'lone CR' },
    { id: 'js-r1-a3-lone-cr-in-block-comment', kind: 'js', keepLines: false, input: 'var a = 1 /* c' + CR + '*/\nvar b = 2\na + b', throws: 'lone CR' },
    { id: 'js-r1-a3-cr-in-string-continuation', kind: 'js', keepLines: false, input: 'var a = "x\\' + CR + 'y" /* c */\na.length', expect: 'var a = "x\\' + CR + 'y"\na.length' },
    { id: 'js-r1-a3-crlf-nokeep', kind: 'js', keepLines: false, input: 'var a = 1 /* c */' + CR + '\nvar b = 2 // d' + CR + '\na + b', expect: 'var a = 1' + CR + '\nvar b = 2' + CR + '\na + b' },
    { id: 'js-r1-a3-crlf-block-multiline', kind: 'js', input: 'var a = 1 /* c' + CR + '\n d */' + CR + '\nvar b = 2 // d' + CR + '\na + b', expect: 'var a = 1' + CR + '\n' + CR + '\nvar b = 2' + CR + '\na + b' },
    { id: 'js-r1-a6-extends-call-class', kind: 'js', input: 'function M(c) { return c } class A extends M(class {}) {} /* c */ typeof A', expect: 'function M(c) { return c } class A extends M(class {}) {}  typeof A' },
    { id: 'js-r1-a6-extends-class-expression', kind: 'js', input: 'class A extends class { m() { return 3 } } { } /* c */ new A().m()', expect: 'class A extends class { m() { return 3 } } { }  new A().m()' },
    { id: 'js-r1-a6-extends-function-expression', kind: 'js', input: 'class A extends function () { this.v = /x/.source } { } /* c */ new A().v', expect: 'class A extends function () { this.v = /x/.source } { }  new A().v' },
    { id: 'js-r1-a6-decrement-compare-refused', kind: 'js', input: 'var n = 2, k = 0; while (n-->0) k++; /* c */ k', throws: 'n-- > 0' },
    { id: 'js-r1-mut-comment-switch-keep', kind: 'js', input: 'var log = [];\n/*/\nlog.push(\'A\');\n/*/\nlog.push(\'B\');\n/**/\nlog.join()', expect: 'var log = [];\n\n\n\nlog.push(\'B\');\n\nlog.join()' },
    { id: 'js-r1-mut-comment-switch-nokeep', kind: 'js', keepLines: false, input: 'var log = [];\n/*/\nlog.push(\'A\');\n/*/\nlog.push(\'B\');\n/**/\nlog.join()', expect: 'var log = [];\nlog.push(\'B\');\nlog.join()' },
    { id: 'js-r1-mut-line-comment-ends-at-ls', kind: 'js', keepLines: false, input: 'var x = 1 // note' + LS + 'x = 2\nx', expect: 'var x = 1' + LS + 'x = 2\nx' },
    { id: 'js-r1-mut-line-comment-ends-at-ps-keep', kind: 'js', input: 'var x = 1 // note' + PS + 'x = 2\nx', expect: 'var x = 1' + PS + 'x = 2\nx' },
    { id: 'js-r1-mut-return-block-one', kind: 'js', input: 'function f() { return/* v */1 } f()', expect: 'function f() { return 1 } f()' },
    { id: 'js-r1-mut-return-block-quote', kind: 'js', input: 'function f() { return/* v */"q" } f()', expect: 'function f() { return "q" } f()' },
    { id: 'js-r1-mut-case-regex', kind: 'js', input: 'var s = "\'", r = \'\'; switch (true) { case /\'/.test(s): r = \' /* a */ \'; break; } r', expect: 'var s = "\'", r = \'\'; switch (true) { case /\'/.test(s): r = \' /* a */ \'; break; } r' },
    { id: 'js-r1-mut-paren-newline-division', kind: 'js', keepLines: false, input: 'var a = 6, b = 2, g = 1, s;\nvar x = (a)\n/ b / g; s = "/* a */"; [x, s]', expect: 'var a = 6, b = 2, g = 1, s;\nvar x = (a)\n/ b / g; s = "/* a */"; [x, s]' },
    { id: 'js-r1-mut-paren-newline-division-string', kind: 'js', input: 'var a = 6, s, g = 1;\nvar x = (a)\n/ "/".length / g; s = "/* a */"; /* c */ [x, s]', expect: 'var a = 6, s, g = 1;\nvar x = (a)\n/ "/".length / g; s = "/* a */"; /* c */ [x, s]' },   // rule K: the comment in the tail of a weak slash stays (sibling: js-r2-sib-*)
    { id: 'js-r1-mut-paren-newline-division-comment', kind: 'js', input: 'var a = 8, b = 2, c = 2;\nvar x = (a)\n/ b /* c */ / c; x', expect: 'var a = 8, b = 2, c = 2;\nvar x = (a)\n/ b /* c */ / c; x' },   // rule K: the comment in the tail of a weak slash stays (sibling: js-r2-sib-*)
    { id: 'js-r1-a2-break-await-label-function', kind: 'js', input: 'var s = "/", n = 0; function g() { n++ }\nawait: for (;;) { if (n) break await\nfunction f() {}\n/[/* x */]/.test(s) && g() }\nn', expect: 'var s = "/", n = 0; function g() { n++ }\nawait: for (;;) { if (n) break await\nfunction f() {}\n/[/* x */]/.test(s) && g() }\nn' },
    { id: 'js-r1-mut-template-escapes', kind: 'js', input: 'var v = 1; var t = ' + BT + '\\${v} /* k */ ${ v /* c */ + 1 } ${ ' + BT + '${v}' + BT + ' }' + BT + '; t', expect: 'var v = 1; var t = ' + BT + '\\${v} /* k */ ${ v  + 1 } ${ ' + BT + '${v}' + BT + ' }' + BT + '; t' },
    { id: 'js-r1-mut-template-escaped-backtick', kind: 'js', input: 'var t = ' + BT + 'a\\' + BT + ' /* k */ b' + BT + ' /* c */ + 1; t', expect: 'var t = ' + BT + 'a\\' + BT + ' /* k */ b' + BT + '  + 1; t' },
    { id: 'js-r1-mut-kept-licence-touched-line', kind: 'js', keepLines: false, input: 'var a = 1; /* x */ var b = 2; /*! keep   \n   me */ var c = 3   \na + b + c', expect: 'var a = 1;  var b = 2; /*! keep   \n   me */ var c = 3   \na + b + c' },
    { id: 'js-r1-mut-kept-licence-block-keep', kind: 'js', input: 'var a = 1; /* x */ var b = 2; /* MIT   \n   x */   \nvar c = 3 /* y */   \na + b + c', expect: 'var a = 1;  var b = 2; /* MIT   \n   x */   \nvar c = 3\na + b + c' },
    { id: 'js-r1-s4-url-line-comment-kept', kind: 'js', input: 'function f(s) {\n  // http://stackoverflow.com/questions/18729405/how-to-convert\n  var a = 1; /* drop */\n  return a;\n}', expect: 'function f(s) {\n  // http://stackoverflow.com/questions/18729405/how-to-convert\n  var a = 1;\n  return a;\n}' },
    { id: 'js-r1-s4-url-block-kept', kind: 'js', input: 'var a = 1; /* see https://example.com/x */ var b = 2; /* drop */', expect: 'var a = 1; /* see https://example.com/x */ var b = 2;' },
    { id: 'js-r1-s4-url-in-run', kind: 'js', input: '// a plain line\n// from https://x.example/y\nvar a; // tail', expect: '// a plain line\n// from https://x.example/y\nvar a;' },
    { id: 'js-r1-s4-attribution-words', kind: 'js', input: '/* @author Someone */ a(); /* adapted from X */ b(); /* ported from Y */ c(); /* from StackOverflow */ d(); /* plain */ e();', expect: '/* @author Someone */ a(); /* adapted from X */ b(); /* ported from Y */ c(); /* from StackOverflow */ d();  e();' },
    { id: 'js-r1-s4-trailing-url-comment-kept', kind: 'js', input: 'var u = \'http://example.com/a\'; // http://example.com/a is the same text', expect: 'var u = \'http://example.com/a\'; // http://example.com/a is the same text' },
  ])(String.fromCharCode(0x2028), String.fromCharCode(0x2029)),
  /* ── JS: review round 2 — the siblings of the cases whose comment moved into a tail (rule K): the removable comment sits on the NEXT line, outside the tail ── */
  { id: 'js-r2-sib-if-paren', kind: 'js', input: "var s = \"'\", n = 0, a = 1; function f() { n++ }\nif (a) /'/.test(s) && f();\n/* c */ n", expect: "var s = \"'\", n = 0, a = 1; function f() { n++ }\nif (a) /'/.test(s) && f();\n n" },   // wrong reading (division) would open a string at the quote of `/'/` — the next line is outside the tail, its comment goes
  { id: 'js-r2-sib-while-paren', kind: 'js', input: "var s = '\"', n = 0, a = 1;\nwhile (a) /[\"]/.test(s) && (a = 0, n++);\n/* c */ n", expect: "var s = '\"', n = 0, a = 1;\nwhile (a) /[\"]/.test(s) && (a = 0, n++);\n n" },   // same, with a double quote in a class
  { id: 'js-r2-sib-brace-close-block', kind: 'js', input: "var s = \"foo'\", n = 0, a = 1;\nif (a) {}\n/foo'*/g.test(s) && n++;\n// c\nn", expect: "var s = \"foo'\", n = 0, a = 1;\nif (a) {}\n/foo'*/g.test(s) && n++;\n// c\nn" },   // same, after the `}` of a block; r3 A-2 (2): the `//` line right after the tail line now stays (was removed)
  { id: 'js-r2-sib-div-call-tail', kind: 'js', input: "function fn() { return 8 }\nvar r = fn() / 2 + \"/\"\n// tail\nr", expect: "function fn() { return 8 }\nvar r = fn() / 2 + \"/\"\n// tail\nr" },   // wrong reading (regex) would run to the quote in the string; r3 A-2 (2): the `//` line right after the tail line now stays (was removed)
  { id: 'js-r2-sib-paren-newline-division-string', kind: 'js', input: "var a = 6, s, g = 1;\nvar x = (a)\n/ \"/\".length / g; s = \"/* a */\";\n/* c */ [x, s]", expect: "var a = 6, s, g = 1;\nvar x = (a)\n/ \"/\".length / g; s = \"/* a */\";\n [x, s]" },   // wrong reading (regex) swallows a quote: the strip would throw or mis-scan; the comment of the NEXT line goes
  { id: 'js-r2-sib-paren-newline-division-comment', kind: 'js', input: "var a = 8, b = 2, c = 2;\nvar x = (a)\n/ b / c;\n/* c */ x", expect: "var a = 8, b = 2, c = 2;\nvar x = (a)\n/ b / c;\n x" },   // rule H leaves no reading in which this tail ends in another state, so nothing here can be mis-scanned into the next line: the sibling pins only that the next-line comment goes
  /* ── JS: review round 2 — the four findings in all forms, rule K (a comment in the tail of a weak slash stays), rule H (refusals), `.` + `/`, and the witnesses of the mutants the round-2 reader found alive ── */
  { id: 'js-r2-a1-var-binding', kind: 'js', input: "/* c */ var s = \"x\", n = 0;\nvar b\n/[/* x */]/.test(s) && n++\nn", expect: " var s = \"x\", n = 0;\nvar b\n/[/* x */]/.test(s) && n++\nn" },   // r2 A-1: var binding without initializer + line break + regex
  { id: 'js-r2-a1-let-binding', kind: 'js', keepLines: false, input: "/* c */ var s = \"x\", n = 0;\nlet b\n/[/* x */]/.test(s) && n++\nn", expect: " var s = \"x\", n = 0;\nlet b\n/[/* x */]/.test(s) && n++\nn" },   // r2 A-1: let binding
  { id: 'js-r2-a1-comma-binding-refused', kind: 'js', input: "var s = \"x\", n = 0;\nvar a = 1, b\n/[/* x */]/.test(s) && n++\nn", throws: "after \",\"" },   // r2 A-1: a later declarator — refused
  { id: 'js-r2-a2a-await-brace-refused', kind: 'js', input: "var s;\nasync function g() {\n  var x = await\n  { a: 1 }\n  / (s = \" / /* x */ \") // \"\n  return s.length\n}\ng()", throws: "after \"await\" and a line break" },   // r2 A-2 (a)
  { id: 'js-r2-a2b-of-prefix-refused', kind: 'js', input: "var seen;\nObject.defineProperty(RegExp.prototype, \"zz\", { get() { seen = this.source; return 0 }, set(v) {} });\nfor (var x of ++/[/* x */]/.zz + \"ab\") ;\nseen", throws: "right after \"of\"" },   // r2 A-2 (b)
  { id: 'js-r2-a2b-yield-prefix-refused', kind: 'js', input: "var seen;\nObject.defineProperty(RegExp.prototype, \"zz\", { get() { seen = this.source; return 0 }, set(v) {} });\nfunction* g() { yield --/[/* x */]/.zz }\ng().next(); seen", throws: "right after \"yield\"" },   // r2 A-2 (b)
  { id: 'js-r2-a2b-await-prefix-refused', kind: 'js', input: "var seen;\nObject.defineProperty(RegExp.prototype, \"zz\", { get() { seen = this.source; return 0 }, set(v) {} });\nasync function g() { await ++/[/* x */]/.zz; return seen }\ng()", throws: "right after \"await\"" },   // r2 A-2 (b)
  { id: 'js-r2-a2c-let-name-brace', kind: 'js', input: "/* c */ var let = 1, x;\nx = let\n{ a: 1 }\n/[/* x */]/.test(\"x\") ? \"x matches\" : \"x does not match\"", expect: " var let = 1, x;\nx = let\n{ a: 1 }\n/[/* x */]/.test(\"x\") ? \"x matches\" : \"x does not match\"" },   // r2 A-2 (c)
  { id: 'js-r2-a2c-let-decl-brace-nl', kind: 'js', keepLines: false, input: "/* c */ let\n{ a } = { a: 3 }; a", expect: " let\n{ a } = { a: 3 }; a" },   // let + line break + { is a declaration
  { id: 'js-r2-a6-of-nl-object', kind: 'js', keepLines: false, input: "var r = []; for (var x of\n{ a: 1, b: [3] }.b) r.push(x); /* c */ r", expect: "var r = []; for (var x of\n{ a: 1, b: [3] }.b) r.push(x);  r" },   // r2 A-6: was refused, now read
  { id: 'js-r2-k-after-paren', kind: 'js', input: "var a = 6, b = 2, x = 0; x = f(a) / b /* k */ / 1; /* k2 */ x\nfunction f(v) { return v }", expect: "var a = 6, b = 2, x = 0; x = f(a) / b /* k */ / 1; /* k2 */ x\nfunction f(v) { return v }" },   // rule K: comment after ")" + "/" kept
  { id: 'js-r2-k-after-brace', kind: 'js', input: "var o = 1;\nif (o) {}\n/x/.test(\"x\") /* k */\n/* gone */ o", expect: "var o = 1;\nif (o) {}\n/x/.test(\"x\") /* k */\n o" },   // rule K: comment after "}" + "/" kept
  { id: 'js-r2-k-after-name-nl', kind: 'js', keepLines: false, input: "var a = 8, b = 2, g = 1;\nvar x = a\n/ b /* k */ / g; x", expect: "var a = 8, b = 2, g = 1;\nvar x = a\n/ b /* k */ / g; x" },   // rule K: name + line break + "/"
  { id: 'js-r2-k-after-postfix', kind: 'js', input: "var a = 4, x; x = a++ / 2 /* k */; [x, a]", expect: "var a = 4, x; x = a++ / 2 /* k */; [x, a]" },   // rule K: "++" + "/"
  { id: 'js-r2-k-before-weak-removed', kind: 'js', input: "var a = 6, x; x = /* gone */ (a) / 2 /* k */; x", expect: "var a = 6, x; x =  (a) / 2 /* k */; x" },   // a comment BEFORE the weak slash: removed
  { id: 'js-r2-k-strong-removed', kind: 'js', input: "var a = 6, x; x = a / 2 /* gone */; x = (/x/) /* gone2 */; x", expect: "var a = 6, x; x = a / 2 ; x = (/x/) ; x" },   // after a STRONG slash: removed
  { id: 'js-r2-h-backtick-refused', kind: 'js', input: "var a = 6, x; x = (a) / 2 + " + BT + "k" + BT + "; x", throws: "backtick" },   // rule H
  { id: 'js-r2-h-open-block-refused', kind: 'js', input: "var a = 6, x; x = (a) / 2 /* k\n */; x", throws: "does not end on the same line" },   // rule H
  { id: 'js-r2-h-continuation-refused', kind: 'js', input: "var a = 6, x; x = (a) / 2 + \"s\\\nt\"; x", throws: "at the line end" },   // rule H
  { id: 'js-r2-h-subst-refused', kind: 'js', input: "var a = 6, t = " + BT + "${ (a) / 2 }" + BT + "; t", throws: "template substitution" },   // rule H
  { id: 'js-r2-h-ls-in-tail-kept', kind: 'js', input: "/* c */ var a = 6, x; x = (a) / 2 + \"p   " + String.fromCharCode(0x2028) + "q\".length; x", expect: " var a = 6, x; x = (a) / 2 + \"p   " + String.fromCharCode(0x2028) + "q\".length; x" },   // a U+2028 in a tail is never trimmed
  { id: 'js-r2-dot-slash-refused', kind: 'js', input: "var a = { b: 1 }; a./x/", throws: "right after \"\\.\"" },   // "." + "/"
  { id: 'js-r2-optdot-slash-refused', kind: 'js', input: 'var a = { b: 1 }; a?./x/', throws: 'right after "\\?\\."' },   // rule S: "?." + "/"
  { id: 'js-r2-dot-nl-slash-refused', kind: 'js', keepLines: false, input: 'var a = { b: 1 }; a.\n/x/', throws: 'right after "\\."' },   // rule S: "." + a line break + "/"
  { id: 'js-r2-m-exprend-regex', kind: 'js', input: "var s = \"/\", n = 0;\nvar x = /a/\nfunction f() {}\n/[/* x */]/.test(s) && n++\nn", expect: "var s = \"/\", n = 0;\nvar x = /a/\nfunction f() {}\n/[/* x */]/.test(s) && n++\nn" },   // mutation exprend_regex
  { id: 'js-r2-m-arrow-nl-stmt', kind: 'js', input: "var s = \"/\", n = 0;\nvar x = () => {}\nfunction f() {}\n/[/* x */]/.test(s) && n++\nn", expect: "var s = \"/\", n = 0;\nvar x = () => {}\nfunction f() {}\n/[/* x */]/.test(s) && n++\nn" },   // mutation arrow_nl_stmt
  { id: 'js-r2-m-else-do-stmt', kind: 'js', input: "var s = \"/\", n = 0, a = 0;\nif (a) n = 5; else function f() {}\n/[/* x */]/.test(s) && n++\nn", expect: "var s = \"/\", n = 0, a = 0;\nif (a) n = 5; else function f() {}\n/[/* x */]/.test(s) && n++\nn" },   // mutation else_do_stmt
  { id: 'js-r2-m-label-colon', kind: 'js', input: "var s = \"/\", n = 0;\nL: function f() {}\n/[/* x */]/.test(s) && n++\nn", expect: "var s = \"/\", n = 0;\nL: function f() {}\n/[/* x */]/.test(s) && n++\nn" },   // mutation label_colon
  { id: 'js-r2-m-label-colon-case', kind: 'js', input: "var s = \"/\", n = 0;\nswitch (1) { case 1: function f() {}\n/[/* x */]/.test(s) && n++ }\nn", expect: "var s = \"/\", n = 0;\nswitch (1) { case 1: function f() {}\n/[/* x */]/.test(s) && n++ }\nn" },   // mutation label_colon (case)
  { id: 'js-r2-m-yield-nl-block', kind: 'js', input: "var s = \"/\", n = 0;\nfunction* g() { yield\n{ a: 1 }\n/[/* x */]/.test(s) && n++ }\nvar it = g(); it.next(); it.next(); n", expect: "var s = \"/\", n = 0;\nfunction* g() { yield\n{ a: 1 }\n/[/* x */]/.test(s) && n++ }\nvar it = g(); it.next(); it.next(); n" },   // mutation yield_nl_block
  { id: 'js-r2-m-optchain-digit', kind: 'js', input: "var a = 1; var x = (a?.5:1) /* c */; x", expect: "var a = 1; var x = (a?.5:1) ; x" },   // mutation optchain_digit
  { id: 'js-r2-m-optchain-digit-nl', kind: 'js', keepLines: false, input: "var a = null, s;\nvar x = a?.5:{ b: 1 }\n/ (s = \" / /* c */ \") // \"\ns.length", expect: "var a = null, s;\nvar x = a?.5:{ b: 1 }\n/ (s = \" / /* c */ \") // \"\ns.length" },   // mutation optchain_digit
  { id: 'js-r2-m-num-dot', kind: 'js', input: "var s; var x = 5. / (s = \" / /* c */ \") // \"\ns.length", expect: "var s; var x = 5. / (s = \" / /* c */ \")\ns.length" },   // tokenizer mutation num_dot (behaviour)
  { id: 'js-r2-m-this-value', kind: 'js', input: "var s; var x = this / (s = \" / /* c */ \") // \"\ns.length", expect: "var s; var x = this / (s = \" / /* c */ \")\ns.length" },   // tokenizer mutation this_value (behaviour)
  { id: 'js-r2-k-ls-ends-no-tail', kind: 'js', input: "var a = 6, x, y;\nx = (a) / 2 " + String.fromCharCode(0x2028) + " y = 3 // k\n;[x, y]", expect: "var a = 6, x, y;\nx = (a) / 2 " + String.fromCharCode(0x2028) + " y = 3 // k\n;[x, y]" },   // K2 witness: a raw U+2028 does not end a tail (only LF / CR do): the comment after it is still in the tail and stays
  { id: 'js-r2-k-ls-in-tail-not-trimmed', kind: 'js', input: "var a = 6, x;\nx = /* c */ (a) / 2   " + String.fromCharCode(0x2028) + " x", expect: "var a = 6, x;\nx =  (a) / 2   " + String.fromCharCode(0x2028) + " x" },   // K3 witness: the removed comment touches the line, the blanks before the U+2028 INSIDE the tail are never trimmed
  { id: 'js-r2-k-chain-tail', kind: 'js', input: "var a = 6, x;\nx = (a) / 2 +\n/y/.test(\"y\") /* k */;\nx", expect: "var a = 6, x;\nx = (a) / 2 +\n/y/.test(\"y\") /* k */;\nx" },   // K4 witness: a slash whose previous token lies in a tail is weak again, so the comment on the next line stays too
  { id: 'js-r2-s-disagree-label-refused', kind: 'js', input: "L: for (;;) { break L / 2 }", throws: "disagrees with the grammar" },   // rule S: a division by the token before it (a name on the same line) where the classifier says regex (the label of break) — refused, invalid JS anyway
  { id: 'js-r2-s-disagree-continue-refused', kind: 'js', input: "L: for (;;) { continue L / 2 }", throws: "disagrees with the grammar" },   // rule S: the same with continue
  { id: 'js-r2-m-eof-kept-comment-spaces', kind: 'js', input: "var x = 1 /* c */; x // MIT   ", expect: "var x = 1 ; x // MIT   " },   // mutation eof_protected: the blanks of a kept line comment that ends the file are its own
  { id: 'js-r2-m-drop-after-kept-line-comment', kind: 'js', keepLines: false, input: "var n = 1 // MIT\n/* c */\nn", expect: "var n = 1 // MIT\n\nn" },   // mutation drop_first_line: the line break that ends a kept line comment is not dropped with the empty line after it
  /* ── JS: review round 3 — r3A-1 (a number with a leading zero + a digit is refused; modern zero forms read), r3A-2 (the `//` run after a
     tail line, no trim on a tail line, `let` in a single-statement position is the plain name), r3A-3 (rule-H witnesses: `netH` = the net
     test runs them too — the real strip refuses by rule H, and with the rule-H arm removed a mutant of the weak decision changes the V8
     result; `mustKeep` = exact substrings every non-throwing output of the net test, real and mutant, must still hold) ── */
  { id: 'js-r3-a1-octal-dot-in-refused', kind: 'js', input: 'Number.prototype.in = 4;\nvar s = 010.in / 2 + "/" + " /* gone */ " // "\ns', throws: 'leading zero followed by a digit' },   // r3A-1: the reviewer's witness (was: "/* gone */" removed inside the string)
  { id: 'js-r3-a1-octal-refused', kind: 'js', input: 'var x = 010; /* c */ x', throws: 'leading zero followed by a digit \\(the legacy octal form\\)' },
  { id: 'js-r3-a1-00-do-refused', kind: 'js', keepLines: false, input: 'Number.prototype.do = 1;\nvar x = 00.do; /* c */ x', throws: 'leading zero followed by a digit' },
  { id: 'js-r3-a1-08-refused', kind: 'js', input: 'var x = 08 / 2; /* c */ x', throws: 'leading zero followed by a digit' },
  { id: 'js-r3-a1-09-5-refused', kind: 'js', input: 'var x = 09.5; /* c */ x', throws: 'leading zero followed by a digit' },
  { id: 'js-r3-a1-00-refused', kind: 'js', input: 'var x = [1, 00]; x', throws: 'leading zero followed by a digit' },
  { id: 'js-r3-a1-zero-sep-refused', kind: 'js', input: 'var x = 0_1; x', throws: 'right after a leading zero' },   // a syntax error in JavaScript
  { id: 'js-r3-a1-zero-forms-read', kind: 'js', input: 'var a = [0, 0.5, 0., .0, 0e1, 0E-1, 0.e1, 0x1f, 0X1F, 0o17, 0O7, 0b1, 0B1, 0n, 0x1fn, 0o7n, 0b1n, 1_000, 0.0_1, 1e1_0, 0..toString(2), 0.5.toFixed(1), 10.5 / 2 / 1]; /* c */ a.join()', expect: 'var a = [0, 0.5, 0., .0, 0e1, 0E-1, 0.e1, 0x1f, 0X1F, 0o17, 0O7, 0b1, 0B1, 0n, 0x1fn, 0o7n, 0b1n, 1_000, 0.0_1, 1e1_0, 0..toString(2), 0.5.toFixed(1), 10.5 / 2 / 1];  a.join()' },   // every valid modern form with a leading 0 still reads
  { id: 'js-r3-a2a-let-run-after-tail', kind: 'js', input: 'var a = 1, b = 8, let;\nif (a) let\nb\n/ 2 // Copyright (c) 2009 X /\n// Permission is hereby granted, free of charge\n+ 0', expect: 'var a = 1, b = 8, let;\nif (a) let\nb\n/ 2 // Copyright (c) 2009 X /\n// Permission is hereby granted, free of charge\n+ 0', mustKeep: ['// Copyright (c) 2009 X /\n// Permission is hereby granted, free of charge'] },   // r3A-2 (a): the reviewer's witness (was: line 5 removed)
  { id: 'js-r3-a2a-let-run-after-tail-inline', kind: 'js', keepLines: false, input: 'var a = 1, b = 8, let;\nif (a) let\nb\n/ 2 // Copyright (c) 2009 X /\n// Permission is hereby granted, free of charge\n+ 0', expect: 'var a = 1, b = 8, let;\nif (a) let\nb\n/ 2 // Copyright (c) 2009 X /\n// Permission is hereby granted, free of charge\n+ 0', mustKeep: ['// Copyright (c) 2009 X /\n// Permission is hereby granted, free of charge'] },
  { id: 'js-r3-a2b-let-tail-blanks', kind: 'js', input: 'var a = 1, b = 8, let;\nif (a) let\nb\n/* gone */ / 2 // MIT /   \n+ 0', expect: 'var a = 1, b = 8, let;\nif (a) let\nb\n / 2 // MIT /   \n+ 0', mustKeep: ['// MIT /   \n'] },   // r3A-2 (b): the reviewer's witness (was: the three blanks trimmed)
  { id: 'js-r3-a2b-let-tail-blanks-inline', kind: 'js', keepLines: false, input: 'var a = 1, b = 8, let;\nif (a) let\nb\n/* gone */ / 2 // MIT /   \n+ 0', expect: 'var a = 1, b = 8, let;\nif (a) let\nb\n / 2 // MIT /   \n+ 0', mustKeep: ['// MIT /   \n'] },
  { id: 'js-r3-a2-tail-blanks-kept', kind: 'js', input: 'var a = 6, x;\nx = /* gone */ (a) / 2   \nx', expect: 'var a = 6, x;\nx =  (a) / 2   \nx' },   // r3A-2 fix 1 with the real scanner: the blanks at the end of a tail line stay (a comment removed before the weak slash)
  { id: 'js-r3-a2-tail-blanks-kept-crlf', kind: 'js', keepLines: false, input: 'var a = 6, x;' + CR + '\nx = /* gone */ (a) / 2 \t ' + CR + '\nx', expect: 'var a = 6, x;' + CR + '\nx =  (a) / 2 \t ' + CR + '\nx' },
  { id: 'js-r3-a2-tail-blanks-kept-eof', kind: 'js', input: 'var a = 6, x;\nx = /* gone */ (a) / 2   ', expect: 'var a = 6, x;\nx =  (a) / 2   ' },   // the same at the end of the input
  { id: 'js-r3-a2-no-tail-blanks-trimmed', kind: 'js', input: 'var a = 6, x;\nx = /* gone */ a / 2   \nx', expect: 'var a = 6, x;\nx =  a / 2\nx' },   // a STRONG slash: no tail, the line is trimmed as before
  { id: 'js-r3-a2-run-after-tail', kind: 'js', input: 'function f(v) { return v }\nvar a = 6, x = f(a) / 2\n// k1\n   // k2\n\t// k3\nx', expect: 'function f(v) { return v }\nvar a = 6, x = f(a) / 2\n// k1\n   // k2\n\t// k3\nx', mustKeep: ['// k1\n   // k2\n\t// k3'] },   // r3A-2 fix 2 with the real scanner: the `//` line right after a tail line and the rest of its run stay
  { id: 'js-r3-a2-run-after-tail-crlf-inline', kind: 'js', keepLines: false, input: 'function f(v) { return v }' + CR + '\nvar a = 6, x = f(a) / 2' + CR + '\n  // k1' + CR + '\n// k2' + CR + '\nx', expect: 'function f(v) { return v }' + CR + '\nvar a = 6, x = f(a) / 2' + CR + '\n  // k1' + CR + '\n// k2' + CR + '\nx' },
  { id: 'js-r3-a2-run-not-after-tail', kind: 'js', keepLines: false, input: 'function f(v) { return v }\nvar a = 6, x = f(a) / 2\n\n// gone\nx = f(a) / 2\n/* gone2 */ // gone3\nx = a / 2\n// gone4\nx', expect: 'function f(v) { return v }\nvar a = 6, x = f(a) / 2\n\nx = f(a) / 2\nx = a / 2\nx' },   // a blank line or a block comment between, or a STRONG slash: removed as before
  { id: 'js-r3-a2-let-if-name', kind: 'js', input: 'var a = 1, b = 8, let;\nif (a) let\nb\n/ 2 /* k */', expect: 'var a = 1, b = 8, let;\nif (a) let\nb\n/ 2 /* k */' },   // r3A-2 fix 3: `let` after the `)` of if is the plain name — a division (the old reading, a regular expression, runs to the line end and throws)
  { id: 'js-r3-a2-let-else-name', kind: 'js', input: 'var a = 0, b = 8, let;\nif (a) {} else let\nb\n/ 2 /* k */', expect: 'var a = 0, b = 8, let;\nif (a) {} else let\nb\n/ 2 /* k */' },
  { id: 'js-r3-a2-let-while-name', kind: 'js', input: 'var b = 8, let;\nwhile (0) let\nb\n/ 2 /* k */', expect: 'var b = 8, let;\nwhile (0) let\nb\n/ 2 /* k */' },
  { id: 'js-r3-a2-let-for-name', kind: 'js', keepLines: false, input: 'var b = 8, let;\nfor (;0;) let\nb\n/ 2 /* k */', expect: 'var b = 8, let;\nfor (;0;) let\nb\n/ 2 /* k */' },
  { id: 'js-r3-a2-let-label-name', kind: 'js', input: 'var b = 8, let;\nL: let\nb\n/ 2 /* k */', expect: 'var b = 8, let;\nL: let\nb\n/ 2 /* k */' },
  { id: 'js-r3-a2-let-case-decl', kind: 'js', input: '/* c */ var c = 1, n = 0;\nswitch (1) { case c: let b\n/\'/.test("\'") && n++ }\nn', expect: ' var c = 1, n = 0;\nswitch (1) { case c: let b\n/\'/.test("\'") && n++ }\nn' },   // `case x:` is not a label: `let b` there IS a declaration, the `/` after it + a line break a regular expression (a division reading throws)
  { id: 'js-r3-a2-let-decl-list', kind: 'js', input: '/* c */ var n = 0;\n{ let b\n/\'/.test("\'") && n++ }\nn', expect: ' var n = 0;\n{ let b\n/\'/.test("\'") && n++ }\nn' },   // in a statement list `let` stays a declaration
  { id: 'js-r3-h-backtick-witness', kind: 'js', netH: true, input: 'var a = 4, y, x = (a) / 2 + "/" + "' + BT + '"\ny = "' + BT + '/* gone */" // "\n;[x, y]', throws: 'then a backtick on the same line' },   // r3A-3: without the backtick arm a regex reading opens a template across the line end and "/* gone */" goes
  { id: 'js-r3-h-open-block-witness', kind: 'js', netH: true, input: 'var a = 4, y, x = (a) / 2 + "/" + "/*"\ny = "*/ /* gone */ " // "\n;[x, y]', throws: 'does not end on the same line' },   // r3A-3: without the "/*" arm
  { id: 'js-r3-h-continuation-lf-witness', kind: 'js', netH: true, input: 'var a = 4, x = (a) / 2 + "/" + " // \\\n/* gone */ " // "\nx', throws: 'at the line end' },   // r3A-3: without the "\\" arm
  { id: 'js-r3-h-continuation-crlf-witness', kind: 'js', netH: true, input: 'var a = 4, x = (a) / 2 + "/" + " // \\' + CR + '\n/* gone */ " // "' + CR + '\nx', throws: 'at the line end' },   // r3A-3 (i): a backslash, then CR LF — the arm must see CRLF too
  { id: 'js-r3-h-subst-depth1-witness', kind: 'js', netH: true, input: 'var a = 4, t = ' + BT + '${ (a) / 2 + \'/"\' }"\n/* gone */ ' + BT + ' + "' + BT + '}" + "' + BT + '" // "\nt', throws: 'template substitution' },   // r3A-3: the weak slash right inside "${"
  { id: 'js-r3-h-subst-nested-paren-witness', kind: 'js', netH: true, input: 'var a = 4, t = ' + BT + '${ ((a) / 2 + \'/"\' + ")") }"\n/* gone */ ' + BT + ' + "' + BT + '}" + "' + BT + '" // "\nt', throws: 'template substitution' },   // r3A-3 (ii): inside a "(" inside "${" — an arm that looks only at the innermost frame misses it
  { id: 'js-r3-h-subst-nested-template-witness', kind: 'js', netH: true, input: 'var a = 4, t = ' + BT + '<${ ' + BT + '${ (a) / 2 + \'/"\' }"\n/* gone */ ' + BT + ' + "' + BT + '}" + "' + BT + '" // "\n}>' + BT + '; t', throws: 'template substitution' },   // r3A-3: in a template nested in another template's substitution
  /* ── CSS ── */
  { id: 'css-content-string', kind: 'css', input: '.a { content: "/* not a comment */"; } /* real */', expect: '.a { content: "/* not a comment */"; }' },
  { id: 'css-url-dslash', kind: 'css', input: '.a { background: url(//host/a.png); } /* c */', expect: '.a { background: url(//host/a.png); }' },
  { id: 'css-url-quoted-paren', kind: 'css', input: '.a { background: url( "a)b/*c.png" ); } /* c */', expect: '.a { background: url( "a)b/*c.png" ); }' },
  { id: 'css-url-unquoted-star', kind: 'css', input: '.zz { background: url(x/*y); }\n/* real */\n.zz2 { --zz-k4: 1; }\n', expect: '.zz { background: url(x/*y); }\n.zz2 { --zz-k4: 1; }\n' },
  { id: 'css-carrier-kept', kind: 'css', input: '/* *SL{Foo} */\n.a { color: red; }', expect: '/* *SL{Foo} */\n.a { color: red; }' },
  { id: 'css-licence-kept', kind: 'css', input: '/*! (c) X */\n.a{}\n/* SIL OFL 1.1 */\n/* drop */\n.b{}', expect: '/*! (c) X */\n.a{}\n/* SIL OFL 1.1 */\n.b{}' },
  { id: 'css-kept-protected-from-ws-pass', kind: 'css', input: '/* MIT   \n\n\n\n  x */\n.a{}', expect: '/* MIT   \n\n\n\n  x */\n.a{}' },
  { id: 'css-comment-runs', kind: 'css', input: '/* a */ /* b */\n.a { x: 1 }', expect: '.a { x: 1 }' },
  /* ★ F1 — a comment inside a VALUE stays (custom properties are serialized as written; a value
     with var() keeps its author text in the CSSOM), and so does the white space of its statement */
  { id: 'css-comment-in-custom-property', kind: 'css', input: ':root { --k: 1px /* c */ 2px; }', expect: ':root { --k: 1px /* c */ 2px; }' },
  { id: 'css-f1-var-value-comment', kind: 'css', input: '.a {\n  background: linear-gradient(red, transparent),   /* c */   \n    var(--x);\n}\n', expect: '.a {\n  background: linear-gradient(red, transparent),   /* c */   \n    var(--x);\n}\n' },
  { id: 'css-f1-custom-before-semicolon', kind: 'css', input: ':root { --x: 1px /* c */; }', expect: ':root { --x: 1px /* c */; }' },
  { id: 'css-f1-custom-block-value', kind: 'css', input: ':root { --x: { a: b; /* c */ } ; }', expect: ':root { --x: { a: b; /* c */ } ; }' },
  { id: 'css-f1-after-custom-semicolon', kind: 'css', input: ':root { --easing: cubic-bezier(.2,0,0,1); /* after */ }', expect: ':root { --easing: cubic-bezier(.2,0,0,1);  }' },
  { id: 'css-f1-selector-list', kind: 'css', input: '.a, /* c */ .b {}', expect: '.a, /* c */ .b {}' },
  { id: 'css-f1-before-semicolon', kind: 'css', input: '.a { color: red /* c */; }', expect: '.a { color: red /* c */; }' },
  { id: 'css-f1-at-boundaries', kind: 'css', input: '.a { /* c */ color: red; /* d */ }', expect: '.a {  color: red;  }' },
  { id: 'css-f1-custom-multiline', kind: 'css', input: ':root {\n  --shadow: 0 1px red,   \n\n    0 2px blue;\n}\n/* x */\n', expect: ':root {\n  --shadow: 0 1px red,   \n\n    0 2px blue;\n}\n' },
  { id: 'css-f1-media', kind: 'css', input: '@media (x) { /* c */ .a {} /* d */ }', expect: '@media (x) {  .a {}  }' },
  { id: 'css-f1-custom-at-sheet-start', kind: 'css', input: '--x: a /* c */ b; /* d */\n.a{}', expect: '--x: a /* c */ b;\n.a{}' },
  /* ★ F1-2 — the white-space pass never reaches inside a url( … ) or a string */
  { id: 'css-f1-multiline-url', kind: 'css', input: 'a{background:url(\n  x.png  \n) } /* c */', expect: 'a{background:url(\n  x.png  \n) }' },
  /* today's stripCssComments reads `\/*` as a comment opener (it does not know CSS escapes) — the lean strip does */
  { id: 'css-escape-not-comment', kind: 'css', input: '.a\\/* {} /* c */', expect: '.a\\/* {}' },
  /* the token-glue probes: since F1 a comment between two tokens is never at a statement boundary, so it STAYS
     (the glue throw guards removable comments only, and none can sit between two name characters) */
  { id: 'css-glue-dimension-kept', kind: 'css', input: '.a { border: 1px/**/solid; }', expect: '.a { border: 1px/**/solid; }' },
  { id: 'css-glue-selector-kept', kind: 'css', input: '.a/**/.b {}', expect: '.a/**/.b {}' },
  { id: 'css-throw-unterminated-comment', kind: 'css', input: '.a { } /* x', throws: 'unterminated CSS comment' },
  { id: 'css-throw-newline-in-string', kind: 'css', input: '.a { content: "a\nb"; }', throws: 'unescaped line break' },
  { id: 'css-throw-unterminated-url', kind: 'css', input: '.a { background: url(x.png', throws: 'unterminated url' },
  { id: 'css-throw-nul', kind: 'css', input: '.a{}' + NUL, throws: 'NUL' },
  /* ── HTML ── */
  { id: 'html-tags-in-comment', kind: 'html', input: '<!-- <style>/* x */</style><script>// y</script> -->\n<p>x</p>', expect: '<!-- <style>/* x */</style><script>// y</script> -->\n<p>x</p>' },
  { id: 'html-json-script', kind: 'html', input: '<script type="application/json">{"a":"//","b":"/* */"}</script>', expect: '<script type="application/json">{"a":"//","b":"/* */"}</script>' },
  { id: 'html-importmap', kind: 'html', input: '<script type="importmap">{"imports":{"a":"//x/a.js"}} /* not js */</script>', expect: '<script type="importmap">{"imports":{"a":"//x/a.js"}} /* not js */</script>' },
  { id: 'html-src-with-body', kind: 'html', input: '<script src="a.js">// body</script>', expect: '<script src="a.js">// body</script>' },
  { id: 'html-module-untouched', kind: 'html', input: '<script type="module">// x\nimport a from "b";</script>', expect: '<script type="module">// x\nimport a from "b";</script>' },
  { id: 'html-js-mime', kind: 'html', input: '<script type=" Text/JavaScript ">var a; // c\n</script>', expect: '<script type=" Text/JavaScript ">var a;\n</script>' },
  { id: 'html-upper-end-tag', kind: 'html', input: '<script>var a = 1; // c\n</SCRIPT>', expect: '<script>var a = 1;\n</SCRIPT>' },
  { id: 'html-attr-gt-in-quotes', kind: 'html', input: '<div title="a>b"><style data-x="1>2">.a{} /* c */</style></div>', expect: '<div title="a>b"><style data-x="1>2">.a{}</style></div>' },
  { id: 'html-style-and-script', kind: 'html', input: '<style>\n.a { color: red; } /* c */\n</style>\n<script>\n// lead\nvar s = "</p>"; /* c */\n</script>', expect: '<style>\n.a { color: red; }\n</style>\n<script>\nvar s = "</p>";\n</script>' },   // the lean CSS rule: only the comment and its blanks go; the line break before the rule stays
  { id: 'html-css-only', kind: 'html', js: false, input: '<style>.a{} /* c */</style><script>// k\n</script>', expect: '<style>.a{}</style><script>// k\n</script>' },
  { id: 'html-js-only', kind: 'html', css: false, input: '<style>.a{} /* c */</style><script>// k\n</script>', expect: '<style>.a{} /* c */</style><script></script>' },   // keepLines false: a line that held only a comment goes, with its line break
  { id: 'html-template-content', kind: 'html', input: '<template><script>// x\nvar a;</script><style>/* y */.a{}</style></template>', expect: '<template><script>var a;</script><style>.a{}</style></template>' },   // template content is parsed as markup: its bodies are raw text like any other
  { id: 'html-textarea-rcdata', kind: 'html', input: '<textarea><script>// x</script></textarea>', expect: '<textarea><script>// x</script></textarea>' },
  { id: 'html-title-rcdata', kind: 'html', input: '<title></style><style>/* x */</title><style>/* y */.a{}</style>', expect: '<title></style><style>/* x */</title><style>.a{}</style>' },
  { id: 'html-abrupt-comments', kind: 'html', input: '<!--><style>/* a */.a{}</style><!---><script>// b\n</script>', expect: '<!--><style>.a{}</style><!---><script></script>' },
  { id: 'html-throw-script-end-lookalike', kind: 'html', input: '<script>var s = "</scriptx>";</script>', throws: 'inside a <script> body' },
  { id: 'html-throw-comment-open-in-script', kind: 'html', input: '<script>var s = "<!--";</script>', throws: 'escape states' },
  { id: 'html-throw-svg-style', kind: 'html', input: '<svg><style>/* x */</style></svg>', throws: 'foreign content' },
  { id: 'html-throw-unknown-attr', kind: 'html', input: '<script language="js">x</script>', throws: 'does not understand' },
  { id: 'html-throw-noscript', kind: 'html', input: '<noscript><style>/* x */</style></noscript>', throws: 'noscript' },
  { id: 'html-throw-unterminated-script', kind: 'html', input: '<script>var a;', throws: 'unterminated <script>' },
  { id: 'html-throw-cdata', kind: 'html', input: '<![CDATA[ x ]]>', throws: 'CDATA' },
  /* ── review round 1 (pins round): the lean CSS white-space rule, the keep rules, the HTML walk. Expected outputs are written by hand from the rule, then checked against the code. Control characters and U+00A0 / U+0130 are built with String.fromCharCode. ── */
  { id: 'css-b1-nbsp-lines', kind: 'css', input: '.a' + String.fromCharCode(160) + '\n' + String.fromCharCode(160) + '\n.b{color:red}\n/* c */\n', expect: '.a' + String.fromCharCode(160) + '\n' + String.fromCharCode(160) + '\n.b{color:red}\n' },
  { id: 'css-b1-hex-escape-space-eol', kind: 'css', input: '.a\\3A \n.b { color: red } /* c */', expect: '.a\\3A \n.b { color: red }' },
  { id: 'css-b8-escaped-space-eol', kind: 'css', input: '.a\\ \n{ color: red; }', expect: '.a\\ \n{ color: red; }' },
  { id: 'css-b2-var-decl-no-comment', kind: 'css', input: '.a {\n  margin: var(--g)   \n\n\n\n   auto;   \n}\n/* c */', expect: '.a {\n  margin: var(--g)   \n\n\n\n   auto;   \n}\n' },
  { id: 'css-ws-line-without-comment-untouched', kind: 'css', input: '.a {   \n\n\n\n  color: red;   \n}\n\n\n\n/* c */\n.b{}', expect: '.a {   \n\n\n\n  color: red;   \n}\n\n\n\n.b{}' },
  { id: 'css-ws-five-blank-lines-no-comment', kind: 'css', input: '.a{}\n\n\n\n\n\n.b{}  \n', expect: '.a{}\n\n\n\n\n\n.b{}  \n' },
  { id: 'css-ws-tail-blanks-go', kind: 'css', input: '.a { color: red;   /* c */   \n}', expect: '.a { color: red;\n}' },
  { id: 'css-ws-two-comments-tail', kind: 'css', input: '.a { color: red;\t/* c */ /* d */  \n}', expect: '.a { color: red;\n}' },
  { id: 'css-ws-mid-line-bytes-only', kind: 'css', input: '.a { color: red; /* c */ /* d */ x: y }', expect: '.a { color: red;   x: y }' },
  { id: 'css-ws-own-line-with-its-terminator', kind: 'css', input: '.a{}\n   /* c */   \n.b{}', expect: '.a{}\n.b{}' },
  { id: 'css-ws-own-line-before-blank-lines', kind: 'css', input: '.a{}\n/* c */\n\n\n\n.b{}', expect: '.a{}\n\n\n\n.b{}' },
  { id: 'css-ws-last-line-no-terminator', kind: 'css', input: '.a{}\n   /* c */   ', expect: '.a{}\n' },
  { id: 'css-ws-only-comment', kind: 'css', input: '/* c */', expect: '' },
  { id: 'css-ws-two-comments-own-line', kind: 'css', input: '/* a */ /* b */\n.a { x: 1 }', expect: '.a { x: 1 }' },
  { id: 'css-ws-crlf-stays-crlf', kind: 'css', input: 'a {' + String.fromCharCode(13) + '\n  /* c */' + String.fromCharCode(13) + '\n  color: red; /* d */' + String.fromCharCode(13) + '\n}' + String.fromCharCode(13) + '\n', expect: 'a {' + String.fromCharCode(13) + '\n  color: red;' + String.fromCharCode(13) + '\n}' + String.fromCharCode(13) + '\n' },
  { id: 'css-ws-lone-cr-lines', kind: 'css', input: '.a{}' + String.fromCharCode(13) + '/* c */' + String.fromCharCode(13) + '.b{}', expect: '.a{}' + String.fromCharCode(13) + '.b{}' },
  { id: 'css-ws-ff-lines', kind: 'css', input: '.a{}' + String.fromCharCode(12) + '/* c */' + String.fromCharCode(12) + '.b{}', expect: '.a{}' + String.fromCharCode(12) + '.b{}' },
  { id: 'css-ws-multiline-owns-lines', kind: 'css', input: '.a{}\n  /* x\n   y */  \n.b{}', expect: '.a{}\n.b{}' },
  { id: 'css-ws-multiline-owns-lines-crlf', kind: 'css', input: '.a{}' + String.fromCharCode(13) + '\n/* x' + String.fromCharCode(13) + '\n y */' + String.fromCharCode(13) + '\n.b{}', expect: '.a{}' + String.fromCharCode(13) + '\n.b{}' },
  { id: 'css-spans-content-both-kept', kind: 'css', input: '.a { /* x\n y */ color: red }', expect: '.a { /* x\n y */ color: red }' },
  { id: 'css-spans-content-both-kept-crlf', kind: 'css', input: '.a { /* x' + String.fromCharCode(13) + '\n y */ color: red }', expect: '.a { /* x' + String.fromCharCode(13) + '\n y */ color: red }' },
  { id: 'css-spans-blanks-before', kind: 'css', input: '.a {\n  /* x\n y */ color: red }', expect: '.a {\n   color: red }' },
  { id: 'css-spans-blanks-after', kind: 'css', input: '.a { /* x\n y */\n  color: red }', expect: '.a {\n  color: red }' },
  { id: 'css-spans-owns-lines', kind: 'css', input: '.a {\n  /* x\n y */\n  color: red }', expect: '.a {\n  color: red }' },
  { id: 'css-surv-var-outer', kind: 'css', input: '.a { margin: var(--gap) /* outer */ auto; }', expect: '.a { margin: var(--gap) /* outer */ auto; }' },
  { id: 'css-surv-box-shadow-ring', kind: 'css', input: '.a { box-shadow: /* ring */ var(--ring), var(--shadow); }', expect: '.a { box-shadow: /* ring */ var(--ring), var(--shadow); }' },
  { id: 'css-b3-if-semicolon-in-parens', kind: 'css', input: '#t { width: if(media(width > 1px): 10px; /* c */ else: 20px); }', expect: '#t { width: if(media(width > 1px): 10px; /* c */ else: 20px); }' },
  { id: 'css-b3-brace-in-var-fallback', kind: 'css', input: '#t { width: var(--nope, { /* c */ }); }', expect: '#t { width: var(--nope, { /* c */ }); }' },
  { id: 'css-b4a-escaped-brace', kind: 'css', input: '.a\\{/* c */b { color: red }', expect: '.a\\{/* c */b { color: red }' },
  { id: 'css-b4a-escaped-semicolon', kind: 'css', input: '.a\\;/* c */b { color: red }', expect: '.a\\;/* c */b { color: red }' },
  { id: 'css-b4a-escaped-close', kind: 'css', input: '.a\\}/* c */b { color: red }', expect: '.a\\}/* c */b { color: red }' },
  { id: 'css-cp-after-inner-block-kept', kind: 'css', input: ':root { --x: { a: b } /* c */ ; }', expect: ':root { --x: { a: b } /* c */ ; }' },
  { id: 'css-licence-in-statement', kind: 'css', input: '.a { color: /* (c) MIT */ red; }', expect: '.a { color: /* (c) MIT */ red; }' },
  { id: 'css-source-url-kept', kind: 'css', input: '/* https://example.com/x */\n.a{} /* c */', expect: '/* https://example.com/x */\n.a{}' },
  { id: 'css-attribution-kept', kind: 'css', input: '/* ported from X */\n/* @author Y */\n/* adapted from Z */\n.a{}', expect: '/* ported from X */\n/* @author Y */\n/* adapted from Z */\n.a{}' },
  { id: 'css-b4b-escaped-url-throws', kind: 'css', input: '.a { background: \\75rl(x;/*y); } /* z */ .b { color: red }', throws: 'an escaped name right before' },
  { id: 'css-b4b-escaped-url-quoted-throws', kind: 'css', input: '.a { background: \\75rl("x"); }', throws: 'an escaped name right before' },
  { id: 'css-escape-at-statement-start-throws', kind: 'css', input: '.a{} \\2d\\2d x { }', throws: 'an escape at the start of a statement' },
  { id: 'css-dash-escape-at-statement-start-throws', kind: 'css', input: '.a{ -\\-x: 1 /* c */ }', throws: 'an escape at the start of a statement' },
  { id: 'html-b5a-svg-math-mismatch-throws', kind: 'html', input: '<svg></math><style>/* c */ .a{}</style></svg>', throws: 'innermost open foreign element' },
  { id: 'html-b5a-svg-math-mismatch-2-throws', kind: 'html', input: '<svg><math></svg><style>.a{}</style>', throws: 'innermost open foreign element' },
  { id: 'html-b5a-nested-svg-throws', kind: 'html', input: '<svg><svg></svg><style>/* c */ .a{}</style></svg>', throws: 'inside <svg>' },
  { id: 'html-b5a-math-svg-nested-throws', kind: 'html', input: '<math><svg></svg><style>/* c */.a{}</style></math>', throws: 'inside <svg>' },
  { id: 'html-b5a-both-svg-closed', kind: 'html', input: '<svg><svg></svg></svg><style>/* c */ .a{}</style>', expect: '<svg><svg></svg></svg><style> .a{}</style>' },
  { id: 'html-b5a-stray-svg-end', kind: 'html', input: '</svg><style>/* c */ .a{}</style>', expect: '</svg><style> .a{}</style>' },
  { id: 'html-b5a-self-closing-svg', kind: 'html', input: '<svg/><style>.a{} /* c */</style>', expect: '<svg/><style>.a{}</style>' },
  { id: 'html-svg-title-throws', kind: 'html', input: '<svg><title>x</title></svg>', throws: '<title> inside' },
  { id: 'html-svg-textarea-throws', kind: 'html', input: '<svg><textarea></textarea></svg>', throws: '<textarea> inside' },
  { id: 'html-svg-script-throws', kind: 'html', input: '<svg><script>// c\n</script></svg>', throws: '<script> inside' },
  { id: 'html-b5b-script-type-absent', kind: 'html', input: '<script>var a; // c\n</script>', expect: '<script>var a;\n</script>' },
  { id: 'html-b5b-script-type-empty', kind: 'html', input: '<script type="">var a; // c\n</script>', expect: '<script type="">var a;\n</script>' },
  { id: 'html-b5b-script-type-space', kind: 'html', input: '<script type=" ">var a; // c\n</script>', expect: '<script type=" ">var a; // c\n</script>' },
  { id: 'html-b5b-script-type-tab-newline', kind: 'html', input: '<script type="\t\n">var a; // c\n</script>', expect: '<script type="\t\n">var a; // c\n</script>' },
  { id: 'html-b5b-script-type-mime-upper', kind: 'html', input: '<script type="TEXT/JavaScript">var a; // c\n</script>', expect: '<script type="TEXT/JavaScript">var a;\n</script>' },
  { id: 'html-b5b-script-type-mime-trimmed', kind: 'html', input: '<script type=" application/javascript\n">var a; // c\n</script>', expect: '<script type=" application/javascript\n">var a;\n</script>' },
  { id: 'html-b5b-script-type-mime-params', kind: 'html', input: '<script type="text/javascript;charset=utf-8">var a; // c\n</script>', expect: '<script type="text/javascript;charset=utf-8">var a; // c\n</script>' },
  { id: 'html-b5b-script-type-plain', kind: 'html', input: '<script type="text/plain">var a; // c\n</script>', expect: '<script type="text/plain">var a; // c\n</script>' },
  { id: 'html-b5c-style-type-absent', kind: 'html', input: '<style>.a{} /* c */</style>', expect: '<style>.a{}</style>' },
  { id: 'html-b5c-style-type-empty', kind: 'html', input: '<style type="">.a{} /* c */</style>', expect: '<style type="">.a{}</style>' },
  { id: 'html-b5c-style-type-css', kind: 'html', input: '<style type="text/css">.a{} /* c */</style>', expect: '<style type="text/css">.a{}</style>' },
  { id: 'html-b5c-style-type-upper', kind: 'html', input: '<style type="TEXT/CSS">.a{} /* c */</style>', expect: '<style type="TEXT/CSS">.a{}</style>' },
  { id: 'html-b5c-style-type-spaced-before', kind: 'html', input: '<style type=" text/css">.a{} /* c */</style>', expect: '<style type=" text/css">.a{} /* c */</style>' },
  { id: 'html-b5c-style-type-spaced-after', kind: 'html', input: '<style type="text/css ">.a{} /* c */</style>', expect: '<style type="text/css ">.a{} /* c */</style>' },
  { id: 'html-b5c-style-type-less', kind: 'html', input: '<style type="text/less">.a{} /* c */</style>', expect: '<style type="text/less">.a{} /* c */</style>' },
  { id: 'html-style-type-x-template', kind: 'html', input: '<style type="text/x-template">.a{} /* keep me */</style>', expect: '<style type="text/x-template">.a{} /* keep me */</style>' },
  { id: 'html-b5d-select-throws', kind: 'html', input: '<select><style>/* c */ .a{}</style></select>', throws: '<select> is open' },
  { id: 'html-b5d-select-script-throws', kind: 'html', input: '<select><script>// c\n</script></select>', throws: '<select> is open' },
  { id: 'html-b5d-select-closed', kind: 'html', input: '<select></select><style>.a{} /* c */</style>', expect: '<select></select><style>.a{}</style>' },
  { id: 'html-b5d-frameset-throws', kind: 'html', input: '<frameset><script>// c\n</script>', throws: '<frameset> is open' },
  { id: 'html-b5d-frameset-closed-throws', kind: 'html', input: '<frameset></frameset><style>.a{} /* c */</style>', throws: '<frameset> is open' },
  { id: 'html-b8-u0130', kind: 'html', input: '<p>' + String.fromCharCode(304) + '</p><style>.a{} /* c */</style>', expect: '<p>' + String.fromCharCode(304) + '</p><style>.a{}</style>' },
  { id: 'html-b8-u0130-upper-tags', kind: 'html', input: '<P>' + String.fromCharCode(304) + '</P><STYLE TYPE="text/css">.a{} /* c */</STYLE>', expect: '<P>' + String.fromCharCode(304) + '</P><STYLE TYPE="text/css">.a{}</STYLE>' },
  { id: 'html-comment-bang-end', kind: 'html', input: '<!-- a --!><style>.a{} /* c */</style>', expect: '<!-- a --!><style>.a{}</style>' },
  { id: 'html-comment-bang-end-then-dash-end', kind: 'html', input: '<!-- a --!><style>.a{} /* c */</style><!-- b -->', expect: '<!-- a --!><style>.a{}</style><!-- b -->' },
  { id: 'html-comment-dash-end-hides-style', kind: 'html', input: '<!-- a --><style>.a{} /* c */</style>', expect: '<!-- a --><style>.a{}</style>' },
  { id: 'html-iframe-throws', kind: 'html', input: '<iframe><style>/* c */</style></iframe>', throws: '<iframe> element' },
  { id: 'html-xmp-throws', kind: 'html', input: '<xmp><style>/* c */</style></xmp>', throws: '<xmp> element' },
  { id: 'html-noembed-throws', kind: 'html', input: '<noembed></noembed>', throws: '<noembed> element' },
  { id: 'html-plaintext-throws', kind: 'html', input: '<plaintext>', throws: '<plaintext> element' },
  /* —— review round 1, the url() view of the CSS post-condition (a quoted url with white space before the quote) —— */
  { id: 'css-url-quoted-paren-ws', kind: 'css', input: '.a{background:url( "a)b/*c.png" )}\n/* c */', expect: '.a{background:url( "a)b/*c.png" )}\n' },
  { id: 'css-url-tab-single-quote', kind: 'css', input: '.a{background:url(\t\'a)b\' )} /* c */', expect: '.a{background:url(\t\'a)b\' )}' },
  { id: 'css-url-upper-star', kind: 'css', input: '.a{background:URL( "x/*y" )} /* c */', expect: '.a{background:URL( "x/*y" )}' },
  { id: 'css-url-escaped-quote', kind: 'css', input: '.a{background:url(  "a\\"b)c" )} /* c */', expect: '.a{background:url(  "a\\"b)c" )}' },
  { id: 'css-url-quoted-linebreak', kind: 'css', input: '.a{background:url( "a\nb" )} /* c */', throws: 'a CSS string with an unescaped line break' },
  { id: 'css-url-unquoted-spaces', kind: 'css', input: '.a{background:url( x )} /* c */', expect: '.a{background:url( x )}' },
  { id: 'css-url-empty', kind: 'css', input: '.a{background:url()} /* c */', expect: '.a{background:url()}' },
  { id: 'css-url-empty-space', kind: 'css', input: '.a{background:url( )} /* c */', expect: '.a{background:url( )}' },
  { id: 'css-url-bad-quote-inside', kind: 'css', input: '.a{background:url(a"b/*c)} /* d */', expect: '.a{background:url(a"b/*c)}' },
  /* ── review round 2 (pins round): block CONTEXTS (value blocks keep their comments, the rules context still strips), CDO / CDC, the slash-star keep, empty sheets, the CRLF string, custom-property names, integration points, and the survivors of the round-2 mutation run. The first group is the builder's witness list (every output has the same cssRules in Chromium as its source); the css-r2x / html-r2x cases are written by hand from the rule. ── */
  { id: 'css-r2b1-property-initial', kind: 'css', input: '@property --p { syntax: "*"; inherits: false; initial-value: {a; /* c */ b}; }', expect: '@property --p { syntax: "*"; inherits: false; initial-value: {a; /* c */ b}; }' },
  { id: 'css-r2b1-property-multiline', kind: 'css', input: '@property --p {\n  syntax: "*";\n  inherits: false;\n  initial-value: {\n    a;\n    /* c */\n    b\n  };\n}\n', expect: '@property --p {\n  syntax: "*";\n  inherits: false;\n  initial-value: {\n    a;\n    /* c */\n    b\n  };\n}\n' },
  { id: 'css-r2b1-decl-block-value', kind: 'css', input: '.a{ color: {var(--x); /* c */ red}; }', expect: '.a{ color: {var(--x); /* c */ red}; }' },
  { id: 'css-r2b1-decl-block-in-media', kind: 'css', input: '@media (x) { .a{ color: {var(--x); /* c */ red}; } }', expect: '@media (x) { .a{ color: {var(--x); /* c */ red}; } }' },
  { id: 'css-r2b1-decl-block-in-page', kind: 'css', input: '@page { color: {var(--x); /* c */ red}; }', expect: '@page { color: {var(--x); /* c */ red}; }' },
  { id: 'css-r2b1-function-result', kind: 'css', input: '@function --f() { result: {a; /* c */ b}; }', expect: '@function --f() { result: {a; /* c */ b}; }' },
  { id: 'css-r2b1-var-then-block', kind: 'css', input: '.a{ color: var(--x) {a; /* c */ b}; }', expect: '.a{ color: var(--x) {a; /* c */ b}; }' },
  { id: 'css-r2b1-after-value-block', kind: 'css', input: '.a{ color: {a} /* c */ ; b: c; /* d */ }', expect: '.a{ color: {a} /* c */ ; b: c;  }' },
  { id: 'css-r2b1-nested-colon-kept', kind: 'css', input: '.a { &:hover { /* c */ color: red } }', expect: '.a { &:hover { /* c */ color: red } }' },
  { id: 'css-r2b1-nested-rule-no-colon', kind: 'css', input: '.a { & > b { /* c */ color: red } }', expect: '.a { & > b {  color: red } }' },
  { id: 'css-r2b1-nested-media-in-rule', kind: 'css', input: '.a { @media (x) { /* c */ color: red } }', expect: '.a { @media (x) {  color: red } }' },
  { id: 'css-r2b1-keyframes', kind: 'css', input: '@keyframes x { /* a */ from { /* c */ opacity: 0 } 50% { opacity: .5; /* d */ } }', expect: '@keyframes x {  from {  opacity: 0 } 50% { opacity: .5;  } }' },
  { id: 'css-r2b1-font-face', kind: 'css', input: '@font-face { /* a */ src: url(x) /* c */; }', expect: '@font-face {  src: url(x) /* c */; }' },
  { id: 'css-r2b1-media-colon-in-parens', kind: 'css', input: '@media (min-width: 1px) { a:hover { /* c */ color: red } }', expect: '@media (min-width: 1px) { a:hover {  color: red } }' },
  { id: 'css-r2b1-top-hover', kind: 'css', input: 'a:hover { /* c */ }', expect: 'a:hover {  }' },
  { id: 'css-r2b1-decl-then-colon-block', kind: 'css', input: '.a { color: red; b:c { /* c */ } }', expect: '.a { color: red; b:c { /* c */ } }' },
  { id: 'css-r2b1-before-pseudo', kind: 'css', input: 'a::before { /* c */ content: "x" }', expect: 'a::before {  content: "x" }' },
  { id: 'css-r2b1-attr-colon', kind: 'css', input: '[a\\:b], [x="a:b"] { /* c */ color: red }', expect: '[a\\:b], [x="a:b"] {  color: red }' },
  { id: 'css-r2b1-page-first', kind: 'css', input: '@page :first { /* c */ margin: 0 }', expect: '@page :first {  margin: 0 }' },
  { id: 'css-r2b1-supports', kind: 'css', input: '@supports (a:b) { .c { /* d */ color: red } }', expect: '@supports (a:b) { .c {  color: red } }' },
  { id: 'css-r2b1-layer-import-namespace', kind: 'css', input: '@layer a, b; /* c */\n@import url(x.css); /* d */\n@namespace svg url(x); /* e */\n.a{}', expect: '@layer a, b;\n@import url(x.css);\n@namespace svg url(x);\n.a{}' },
  { id: 'css-r2b1-vendor-document', kind: 'css', input: '@-moz-document url-prefix() { a:hover { /* c */ color: red } }', expect: '@-moz-document url-prefix() { a:hover {  color: red } }' },
  { id: 'css-r2b1-unknown-at', kind: 'css', input: '@foo { a:hover { /* c */ color: red } }', expect: '@foo { a:hover { /* c */ color: red } }' },
  { id: 'css-r2b1-grouping-in-decls', kind: 'css', input: '.a { @media (x) { b:hover { /* c */ color: red } } }', expect: '.a { @media (x) { b:hover { /* c */ color: red } } }' },
  { id: 'css-r2b3-cdo-url', kind: 'css', input: '.a{ --x:<!--url(/*) \'a */) ; /* c */ \' ; --y: 1; } \'', throws: 'CDO / CDC token' },
  { id: 'css-r2b3-cdc', kind: 'css', input: '--> .a { /* c */ }', throws: 'CDO / CDC token' },
  { id: 'css-r2b4-slash-star', kind: 'css', input: '/* licence MIT *//* reset */* { box-sizing: border-box }', expect: '/* licence MIT *//* reset */* { box-sizing: border-box }' },
  { id: 'css-r2b4-slash-star-run', kind: 'css', input: '/*! x *//* a *//* b */*{}', expect: '/*! x *//* a *//* b */*{}' },
  { id: 'css-r2b4-slash-space-star', kind: 'css', input: '/*! x */ /* a */* {}', expect: '/*! x */ * {}' },
  { id: 'css-r2b5-crlf-in-string', kind: 'css', input: '.a::before { content: "a\\' + String.fromCharCode(13) + '\nb"; /* c */ quotes: "x" "y"; }', expect: '.a::before { content: "a\\' + String.fromCharCode(13) + '\nb";  quotes: "x" "y"; }' },
  { id: 'css-r2b6-name-space', kind: 'css', input: '.a { --x y:hover { color: red; /* c */ } }', expect: '.a { --x y:hover { color: red; /* c */ } }' },
  { id: 'css-r2b6-comment-in-name', kind: 'css', input: '.a{ --/* n */x: { a; /* c */ b }; }', expect: '.a{ --/* n */x: { a; /* c */ b }; }' },
  { id: 'css-r2b6-cp-ws-before-colon', kind: 'css', input: '.a{ --x /* n */ : 1 /* c */ 2; /* d */ }', expect: '.a{ --x /* n */ : 1 /* c */ 2;  }' },
  { id: 'css-surv-cp-second', kind: 'css', input: '.a{ color: red; --x: { a; /* c */ b }; }', expect: '.a{ color: red; --x: { a; /* c */ b }; }' },
  { id: 'css-surv-mismatched-closer', kind: 'css', input: '.a{ b: (c } d: e; /* c */ }', expect: '.a{ b: (c } d: e; /* c */ }' },
  { id: 'css-surv-hash-url', kind: 'css', input: '.a{ b: #url(/*); /* c */ x: y }', expect: '.a{ b: #url(/*); /* c */ x: y }' },
  { id: 'css-surv-quoted-url-in-func', kind: 'css', input: '.a{ b: f( url("x") ; /* c */ ) }', expect: '.a{ b: f( url("x") ; /* c */ ) }' },
  { id: 'css-surv-crlf-string', kind: 'css', input: '.a::after{ content: "a\\' + String.fromCharCode(13) + '\nb"; } /* c */', expect: '.a::after{ content: "a\\' + String.fromCharCode(13) + '\nb"; }' },
  { id: 'html-surv-attr-style', kind: 'html', input: '<a title=\'> <style>/* c */ a{} </style>\'>x</a>', expect: '<a title=\'> <style>/* c */ a{} </style>\'>x</a>' },
  { id: 'html-surv-script-src-empty', kind: 'html', input: '<script src="">/* c */ x()</script>', expect: '<script src="">/* c */ x()</script>' },
  { id: 'html-surv-x-javascript', kind: 'html', input: '<script type="application/x-javascript">/* c */ x()\n</script>', expect: '<script type="application/x-javascript"> x()\n</script>' },
  { id: 'html-r2b2-foreignobject', kind: 'html', input: '<!doctype html><body><svg><foreignObject><div></svg></div></foreignObject><style>/* <!-- */ .a{color:red} /* --> */</style></svg><p class=a>x</p>', throws: 'after an integration point' },
  { id: 'html-r2b2-math-mi', kind: 'html', input: '<math><mi></mi></math><style>/* c */ .a{}</style>', throws: 'after an integration point' },
  { id: 'html-r2b2-svg-plain-ok', kind: 'html', input: '<svg><g></g></svg><style>/* c */ .a{}</style>', expect: '<svg><g></g></svg><style> .a{}</style>' },
  { id: 'css-r2x-nested-hover-empty', kind: 'css', input: '.a { &:hover { /* c */ } }', expect: '.a { &:hover { /* c */ } }' },
  { id: 'css-r2x-nested-hover-multiline', kind: 'css', input: '.a {\n  &:hover {\n    /* c */\n    color: red;\n  }\n}\n', expect: '.a {\n  &:hover {\n    /* c */\n    color: red;\n  }\n}\n' },
  { id: 'css-r2x-nested-gt-b-empty', kind: 'css', input: '.a { & > b { /* c */ } }', expect: '.a { & > b {  } }' },
  { id: 'css-r2x-nested-descendant-hover', kind: 'css', input: '.a { & b:hover { /* c */ } }', expect: '.a { & b:hover { /* c */ } }' },
  { id: 'css-r2x-nested-hover-outer-goes', kind: 'css', input: '.a { &:hover { color: red; /* c */ } } /* gone */', expect: '.a { &:hover { color: red; /* c */ } }' },
  { id: 'css-r2x-colon-block-outer-goes', kind: 'css', input: '.a { color: red; b:c { /* c */ } } /* gone */', expect: '.a { color: red; b:c { /* c */ } }' },
  { id: 'css-r2x-unknown-at-plain-inner', kind: 'css', input: '@unknown { .x { /* c */ } }', expect: '@unknown { .x {  } }' },
  { id: 'css-r2x-media-upper-case', kind: 'css', input: '@MEDIA (x) { a:hover { /* c */ } }', expect: '@MEDIA (x) { a:hover {  } }' },
  { id: 'css-r2x-vendor-keyframes', kind: 'css', input: '@-webkit-keyframes x { from { /* c */ opacity: 0 } }', expect: '@-webkit-keyframes x { from {  opacity: 0 } }' },
  { id: 'css-r2x-container', kind: 'css', input: '@container (min-width: 1px) { a:hover { /* c */ } }', expect: '@container (min-width: 1px) { a:hover {  } }' },
  { id: 'css-r2x-layer-block', kind: 'css', input: '@layer x { a:hover { /* c */ } }', expect: '@layer x { a:hover {  } }' },
  { id: 'css-r2x-scope', kind: 'css', input: '@scope (.a) { b:hover { /* c */ } }', expect: '@scope (.a) { b:hover { /* c */ } }', note: '#46 r3 B-1: @scope is a declaration list for the strip; a statement with a colon before its brace is ambiguous there, kept' },
  { id: 'css-r3-scope-value-block', kind: 'css', input: '@scope (.a) { color: {var(--x); /* c */ red}; }', expect: '@scope (.a) { color: {var(--x); /* c */ red}; }', note: '#46 r3 B-1: Chromium keeps the block value as text (cssText, getPropertyValue)' },
  { id: 'css-r3-scope-bare', kind: 'css', input: '@scope { color: {var(--x); /* c */ red}; }', expect: '@scope { color: {var(--x); /* c */ red}; }' },
  { id: 'css-r3-scope-to', kind: 'css', input: '@scope (.a) to (.b) { margin: {var(--x); /* c */ 1px}; }', expect: '@scope (.a) to (.b) { margin: {var(--x); /* c */ 1px}; }' },
  { id: 'css-r3-scope-in-media', kind: 'css', input: '@media screen { @scope (.a) { margin: {var(--x); /* c */ 1px}; } }', expect: '@media screen { @scope (.a) { margin: {var(--x); /* c */ 1px}; } }' },
  { id: 'css-r3-scope-boundary-goes', kind: 'css', input: '@scope (.a) { /* x */ .b { color: red; /* y */ } }', expect: '@scope (.a) {  .b { color: red;  } }' },
  { id: 'css-r3-charset-after-comment-refused', kind: 'css', input: '/* Spixi theme */\n@charset "windows-1252";\n.a::before { content: "x"; }\n', throws: '`@charset` rule that is not at the very start', note: '#46 r3 B-2: the removed comment would move @charset to byte 0, where the browser honours it' },
  { id: 'css-r3-charset-touching-comment-refused', kind: 'css', input: '/* c */@charset "utf-8";', throws: '`@charset` rule that is not at the very start' },
  { id: 'css-r3-charset-first-stays', kind: 'css', input: '@charset "utf-8";\n/* c */\n.a { color: red; }\n', expect: '@charset "utf-8";\n.a { color: red; }\n' },
  { id: 'css-r2x-starting-style', kind: 'css', input: '@starting-style { a:hover { /* c */ } }', expect: '@starting-style { a:hover {  } }' },
  { id: 'css-r2x-document', kind: 'css', input: '@document url(x) { a:hover { /* c */ } }', expect: '@document url(x) { a:hover {  } }' },
  { id: 'css-r2x-counter-style', kind: 'css', input: '@counter-style x { /* c */ system: cyclic; }', expect: '@counter-style x {  system: cyclic; }' },
  { id: 'css-r2x-font-feature-values', kind: 'css', input: '@font-feature-values X { @styleset { /* c */ a: 1 } }', expect: '@font-feature-values X { @styleset {  a: 1 } }' },
  { id: 'css-r2x-grouping-in-decls-outer-goes', kind: 'css', input: '.a { color: red; @media (x) { b:hover { /* c */ } } /* gone */ }', expect: '.a { color: red; @media (x) { b:hover { /* c */ } }  }' },
  { id: 'css-r2x-colon-after-kept-value', kind: 'css', input: '.a { color: red /* k */ ; b: c(d:e) { /* c */ } }', expect: '.a { color: red /* k */ ; b: c(d:e) { /* c */ } }' },
  { id: 'css-r2x-colon-before-paren-ambiguous', kind: 'css', input: '.a { b: (c:d) { /* c */ x } }', expect: '.a { b: (c:d) { /* c */ x } }' },
  { id: 'css-r2x-colon-in-parens-not-ambiguous', kind: 'css', input: '.a { b(c:d) { /* c */ x: y } }', expect: '.a { b(c:d) {  x: y } }' },
  { id: 'css-r2x-at-statement-not-ambiguous', kind: 'css', input: '.a { @foo x:y { /* c */ } }', expect: '.a { @foo x:y {  } }' },
  { id: 'css-r2x-value-block-depth2', kind: 'css', input: '.a{ color: { x { /* c */ } /* d */ y }; }', expect: '.a{ color: { x { /* c */ } /* d */ y }; }' },
  { id: 'css-r2x-property-nested-braces', kind: 'css', input: '@property --p { initial-value: { a { /* c */ } b }; /* gone */ }', expect: '@property --p { initial-value: { a { /* c */ } b };  }' },
  { id: 'css-r2x-cp-then-cp-block', kind: 'css', input: '.a{ --x: 1; /* c */ --y: { a; /* d */ b }; /* e */ }', expect: '.a{ --x: 1;  --y: { a; /* d */ b };  }' },
  { id: 'css-r2x-cp-name-then-brace', kind: 'css', input: '.a{ --x{ a; /* c */ } }', expect: '.a{ --x{ a;  } }' },
  { id: 'css-r2x-cp-space-after-dashes', kind: 'css', input: '.a{ -- x: 1; /* c */ }', expect: '.a{ -- x: 1;  }' },
  { id: 'css-r2x-empty-sheet-comments', kind: 'css', input: '/* a */\n/* b */\n', expect: '' },
  { id: 'css-r2x-single-comment-sheet', kind: 'css', input: '/* a */', expect: '' },
  { id: 'css-r2x-blank-sheet', kind: 'css', input: '   \n', expect: '   \n' },
  { id: 'css-r2x-empty-sheet', kind: 'css', input: '', expect: '' },
  { id: 'css-r2x-cdo-in-string', kind: 'css', input: '.a{content:"<!--"} /* c */', expect: '.a{content:"<!--"}' },
  { id: 'css-r2x-cdo-in-comment', kind: 'css', input: '/* <!-- --> */ .a{} /* c */', expect: ' .a{}' },
  { id: 'css-r2x-cdo-in-url', kind: 'css', input: '.a{background:url(<!--)} /* c */', expect: '.a{background:url(<!--)}' },
  { id: 'css-r2x-cdo-throws', kind: 'css', input: '.a{} <!-- .b{}', throws: 'CDO / CDC token' },
  { id: 'css-r2x-cdc-throws', kind: 'css', input: '.a{} --> .b{}', throws: 'CDO / CDC token' },
  { id: 'css-r2x-slash-star-plain-removed', kind: 'css', input: '.a{} /* a *//* b */ * {}', expect: '.a{}  * {}' },
  { id: 'css-r2x-slash-star-after-line-start', kind: 'css', input: '.a{}\n/* a */* {}', expect: '.a{}\n* {}' },
  { id: 'css-r2x-crlf-in-single-quote', kind: 'css', input: '.a{ content: \'a\\' + String.fromCharCode(13) + '\nb\'; /* c */ x: y }', expect: '.a{ content: \'a\\' + String.fromCharCode(13) + '\nb\';  x: y }' },
  { id: 'html-r2x-ip-desc-throws', kind: 'html', input: '<svg><desc></desc></svg><style>/* c */ .a{}</style>', throws: 'after an integration point' },
  { id: 'html-r2x-ip-desc-upper-script-throws', kind: 'html', input: '<svg><DESC></DESC></svg><script>var a; // c\n</script>', throws: 'after an integration point' },
  { id: 'html-r2x-ip-foreignobject-upper-throws', kind: 'html', input: '<svg><FOREIGNOBJECT></FOREIGNOBJECT></svg><script>var a; // c\n</script>', throws: 'after an integration point' },
  { id: 'html-r2x-ip-foreignobject-selfclosing-throws', kind: 'html', input: '<svg><foreignObject/></svg><style>/* c */ .a{}</style>', throws: 'after an integration point' },
  { id: 'html-r2x-ip-annotation-xml-throws', kind: 'html', input: '<math><annotation-xml></annotation-xml></math><script>var a; // c\n</script>', throws: 'after an integration point' },
  { id: 'html-r2x-ip-mtext-throws', kind: 'html', input: '<math><mtext></mtext></math><style>/* c */ .a{}</style>', throws: 'after an integration point' },
  { id: 'html-r2x-ip-mo-throws', kind: 'html', input: '<math><mo></mo></math><style>/* c */ .a{}</style>', throws: 'after an integration point' },
  { id: 'html-r2x-ip-mn-throws', kind: 'html', input: '<math><mn></mn></math><style>/* c */ .a{}</style>', throws: 'after an integration point' },
  { id: 'html-r2x-ip-ms-throws', kind: 'html', input: '<math><ms></ms></math><style>/* c */ .a{}</style>', throws: 'after an integration point' },
  { id: 'html-r2x-ip-after-the-bodies-ok', kind: 'html', input: '<style>/* c */ .a{}</style><svg><desc></desc></svg>', expect: '<style> .a{}</style><svg><desc></desc></svg>' },
  { id: 'html-r2x-ip-script-before-ok', kind: 'html', input: '<script>var a; // c\n</script><math><mi></mi></math><p>x</p>', expect: '<script>var a;\n</script><math><mi></mi></math><p>x</p>' },
  { id: 'html-r2x-ip-names-outside-foreign-ok', kind: 'html', input: '<mi></mi><desc></desc><style>/* c */ .a{}</style>', expect: '<mi></mi><desc></desc><style> .a{}</style>' },
  { id: 'html-r2x-foreign-without-ip-ok', kind: 'html', input: '<svg><g/><path/></svg><math><mfrac></mfrac></math><style>/* c */ .a{}</style>', expect: '<svg><g/><path/></svg><math><mfrac></mfrac></math><style> .a{}</style>' },
  { id: 'html-r2x-attr-single-quote-script', kind: 'html', input: '<a title=\'> <script>// c\n</script>\'>x</a><script>var a; // c\n</script>', expect: '<a title=\'> <script>// c\n</script>\'>x</a><script>var a;\n</script>' },
  { id: 'html-r2x-script-src-empty-and-type', kind: 'html', input: '<script src="" type="text/javascript">// c\nx()</script>', expect: '<script src="" type="text/javascript">// c\nx()</script>' },
  { id: 'html-r2x-x-javascript-upper', kind: 'html', input: '<script type="Application/X-JavaScript">var a; // c\n</script>', expect: '<script type="Application/X-JavaScript">var a;\n</script>' },
  { id: 'css-r2x-brackets-then-rules-context-1', kind: 'css', input: '[y={ /* c */ }] { } a:hover { /* d */ }', expect: '[y={ /* c */ }] { } a:hover {  }' },
  { id: 'css-r2x-brackets-then-rules-context-2', kind: 'css', input: '.a{ b( { /* c */ } ) } c:hover { /* d */ }', expect: '.a{ b( { /* c */ } ) } c:hover {  }' },
  { id: 'css-r2x-brackets-then-rules-context-3', kind: 'css', input: '.a{ f( { x { /* c */ } } ) } c:hover { /* d */ }', expect: '.a{ f( { x { /* c */ } } ) } c:hover {  }' },
  { id: 'css-r2x-cp-top-level-after-rule', kind: 'css', input: '.a{} --x: { a; /* c */ b }; .b{ /* e */ }', expect: '.a{} --x: { a; /* c */ b }; .b{  }' },
  { id: 'css-r2x-cp-top-level-second', kind: 'css', input: '.a{} --x: 1; --y: { a; /* c */ b }; /* e */ .b{}', expect: '.a{} --x: 1; --y: { a; /* c */ b };  .b{}' },
  { id: 'css-r2x-cp-top-level-start', kind: 'css', input: '--x: { a; /* c */ b }; /* d */\n.a{}', expect: '--x: { a; /* c */ b };\n.a{}' },
  { id: 'css-r2x-cp-top-level-in-media', kind: 'css', input: '@media (x) { .a{} --y: { a; /* c */ b } /* f */ }', expect: '@media (x) { .a{} --y: { a; /* c */ b } /* f */ }' },
];
