# P70 · ONE BUILDER FOR THE C# → JS PUSH TEXT: `UiCommandText` (S15 O-11 KEPT; batch photo1a)

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| LOW (a refactor; the text is byte-identical; it HOLDS the S15 O-11 rule that every push argument is base64 in one composer) | no | none: every push has the same text and the same arguments | **none** (see below) | 3 min |

**Look here first:** `Spixi/Utils/UiCommandText.cs` (44 lines: `escape`, `build`), `Spixi/Utils/Utils.cs:295-305` (`sendUiCommand` sends `UiCommandText.build(command, arguments)` in its inherited try / catch; `escapeHtmlParameter(string)` returns `UiCommandText.escape(str)`), `Spixi/Pages/Chat/SingleChatPage.xaml.cs` (the three `UiCommandText.build` call sites; `sendBuiltCommand` `:213` logs a TYPE only).

**DECISIONS:** #1293 (O-11: every argument base64, one composer) · #1736 (main chat: fix the single-composer rule IN THE CODE) · this batch #1715 (PO-1 made the second composer), #1727, #1729, #1730.

## What and why
- **Why.** PO-1 (P65) builds a thumbnail / waveform push's text OFF the main thread. That first used a second composer, `PhotoOpenRules.uiCommandText`, and the S15 pin `pins-s15/c-transport` (rule O-11: `Utils.sendUiCommand` is the only composer of `executeUiCommand(` in `Spixi/`) went red in the full smoke (#1724 (2)). Loosening the pin to admit a second composer would weaken a SECURITY rule; so the code was changed instead (#1736).
- **What.** ONE pure class, `UiCommandText`: `escape(str)` = base64 of the UTF-8 bytes; `build(command, arguments)` = `executeUiCommand(` + command + per argument `,'<escape>'` (or `,null`) + `);`. `Utils.sendUiCommand` and the three PO-1 call sites call `build`; `PhotoOpenRules.uiCommandText` is removed. The base64 alphabet has no quote, backslash, newline, backtick or `:`, so no argument can leave its single-quoted JS literal and none can start with `data:` (the `native.js` passthrough stays unreachable from C#).
- **Byte-identical.** The round-7 reader ran 350,232 cases against the old text: 0 differences. csh `PhotoOpenTests.ui_command_text_is_sendUiCommand_text` and `escape_is_base64_of_utf8` hold it.
- **No switch.** There is no old path to fall back to: the change replaces two copies of the same escaping by one, and its result is the same bytes. A flag would keep a SECOND composer alive in the old path, which is the thing the rule forbids. The inherited try / catch of `sendUiCommand` is unchanged (its log line `Exception occured in sendUiCommand " + e` at `Utils.cs:303` is legacy and keeps its old form; the off-thread path logs the exception TYPE only).

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| A value C# did not encode reaches a JS literal | `build` appends only `'` + `escape(arg)` + `'` or `null`; its whole body is one fixed text | pin `pins-s15/c-transport` `wire` (the comment-stripped body of `UiCommandText.cs`) · csh |
| A second composer appears | EVERY occurrence of the token `executeUiCommand` in `Spixi/` C# is counted (a literal, an interpolated or verbatim string, a concat piece, a `nameof`); the only other admitted occurrence is `SpixiContentPage.p1VerbOf`'s READ of a pushed message | pin `reach`; keys `sites` (every WebView `sendMessage(` held per file), `uctTokens`, `uctUsings`, `noShadow` (no shadow class / alias / `using static`) |
| The off-thread path drifts from the main-thread path | one builder, not two copies | csh · pin a6 `bodiesWhole` (both push methods held whole by the SHA-256 of the comment-masked, normalised body; a comment-only edit does not change it) · `voiceHead` |
| A change of the builder's text | the builder is held whole; a break (`",null"` → `",'null'"`, `Encoding.UTF8` → `ASCII`, `sendUiCommand` composing its own text again) fails the csh tests | the deliberate breaks of #802 are listed in `scripts/csh/PhotoOpenTests.cs:16-19` |

## Recorded limits (INHERITED, accepted by Damir, #1746 (a); #1727)
The hand-written source pin `pins-s15/c-transport` is a scanner, not a proof. Two classes of ordinary code are NOT seen by it, and BOTH existed at the base `c0a76176`:
- **F1** a raw push to the WebView through `_webView.EvaluateJavaScriptAsync(`, `evaluateJavascript(` or `messageQueue.Enqueue(` (the pin's LIMITS line had a wrong cover claim; the text is corrected, no key changed);
- **F2** a new `sendUiCommand` overload, or a raw command word.
Also stated in the pin: code hidden on purpose (a head built from chars, a byte array or a resource; a raw string split oddly) is not caught. The hardening is the Mission Control item `n-20261118-s15-transport-pin-harden` (an audit phase, a later batch). The diff review, the Windows compile and the walk see an edit of that kind.

## NOT proven
⚠ C# UNCOMPILED here (`UiCommandText.cs`, `Utils.cs`, `SingleChatPage.xaml.cs`; the pure class runs in the C# harness, CSH `pass=766 fail=0`; Windows compiles in `redesign-ci`, Android in the operator block).
