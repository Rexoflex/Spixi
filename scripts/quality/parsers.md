# Parsers of untrusted input (JS) — the list the property tests read

Scope: JS code in `src/**` that reads text a PEER controls (message text, names, quotes, file names, payment strings, C#-forwarded
wire arguments) or text that comes from a QR / paste / feed. C# parsers are not in this list (FsCheck is not in the batch; #16 plans
fuzzing after the freeze). Tests: `scripts/pins-qtools/e-props.mjs` (fast-check 4.11.0, seed 20261127). Run:
`node scripts/run-pins.mjs pins-qtools/e-props`.

Load key — **import**: the shipped ES module is imported from `src/` under a jsdom `document` · **extract**: the function is private or
sits in the inline script of `src/shells/chat.html` / in `contacts-shell.js`, so the pin cuts its source text by anchor + brace match and builds
it with `new Function` (a moved anchor turns a `QTOOLS extract` row red) · **via bubble**: the private function is reached through
the exported `createMessageBubble`.

Property ids: F format · L link rule · B bubble · R reply quote · A address / avatar · M money · P payment card · N file name · S shared /
chat args · B64 bridge decode · H highlight. A held row (`QTOOLS-KNOWN`, contract I5) is listed under "Held" at the end.

## Tested

| Parser · function | file:line | Input source | Properties tested (row) | Load |
|---|---|---|---|---|
| message marks `parseFormat`, `formatSpans` | `src/components/msg-format.js:131`, `:134` | peer (message text) | never throws on any string, null, lone surrogates; token tree holds only b / i / s / code / pre (F1) | import |
| `stripFormat` | `msg-format.js:179` | peer (message text; reply quote, chat-list preview) | result is the input minus only `* _ ~ \``, a subsequence; no marks = unchanged (F2) | import |
| `renderFormat` | `msg-format.js:225` | peer | DOM holds only strong / em / s / code / pre with their own class + attributes; serialise → reparse adds no element; text = strip text minus block newlines (F3); cost on crafted 20 000 – 64 000-char runs (F4) | import |
| link rule `urlSpans` | `src/components/link-rule.js:21` | peer | ordered, non-overlapping, `slice = url`, no space / `< > " '`, not glued to a word char, any scheme that parses is http / https (L1) | import |
| `linkifyPlain` / `displayUrl` (link buttons) | `src/components/message-bubble.js:282`, `:95` | peer | only allow-listed elements + attributes in the body; every click target is `http(s)://`; label host (before the first `/ ? # \`) = real host, no userinfo, a truncated label keeps the whole host (B1, B2) | via bubble |
| mentions `buildMentionRe`, `forEachMentionSplit` | `message-bubble.js:203`, `:220` | peer (text) + roster nicks (peer) | names with regex metacharacters and lone surrogates never throw; a mention span starts with `@` and holds only text (B1) | via bubble |
| `createMessageBubble` text path (marks + mentions + links + emoji-only RE `:182`) | `message-bubble.js:312` | peer | text read back from the DOM = strip text; cost on crafted 9 000 – 20 000-char link text, a 20 000-unit emoji-joiner run, @-runs (B1, B3) | import |
| reply quote DOM (sender line, text, tile) | `message-bubble.js:426` (in `createMessageBubble`), `replyTileEl :136`, `setReplyQuoteTile :165` | peer (quote sender, text, kind, tile, thumb) | one sender span only when a sender is given, one text span, both text only; the text cannot make a second sender label; a picture is a local raster `data:` URI; no `on*` / `href` (R1) | via bubble |
| reply quote text `capQuoteText`, `replyFallbackQuote` | `src/shells/chat.html:2286`, `:2294` | peer (C#'s quote line: name + excerpt) | cap ≤ 140 graphemes, a prefix + `…`, no lone surrogate made; a kind comes only from the table's own keys (`constructor`, `__proto__` are text); the name lands in the sender field alone. Names are taken without control chars: C# strips them (`Spixi/Utils/ReplyQuote.cs:252`), so the `\u0001me` marker cannot be sent by a peer (R2) | extract |
| address shape `isAddressShaped`, `isPseudoAddressNick` | `src/components/avatar.js:121`, `:131` | peer (nick, roster name) | equal an independent oracle (base58 alphabet, 40 – 128, a digit); null is no address (A1) | import |
| `looksLikeAddress` (add-contact gate) | `src/components/contacts-shell.js:676` | local (paste, QR text of a peer) | equals an oracle (20 – 128, no whitespace) (A1) | extract |
| `truncateAddressMiddle` | `avatar.js:56` | peer (address) | idempotent; ≤ 13 chars; keeps both ends (A1) | import |
| `safeImageSrc` | `avatar.js:329` | peer (thumb, link-preview image) | the result is `''` or the trimmed value; only a `data:image/` URI, or http(s) when remote is allowed; never `javascript:` `blob:` `file:` `//` (A2) | import |
| `groupEmojiOf` | `avatar.js:258` | peer (group name) | an emoji at either edge is found whole (flags, skin tones, ZWJ, keycap); the result is `''` or part of the name (A2) | import |
| money `sanitizeAmount` | `src/components/money.js:32` | local keypad, QR seed `addr:send:<amount>` (peer-made) | any string → `\d*(\.\d{0,8})?`, idempotent, never signed; decimal text keeps its exact value in units (dot, comma decimal, thousand commas); decimals past 8 are cut, not rounded (M1) | import |
| `toUnits`, `canonicalAmount` | `money.js:43`, `:52` | local | canonical is `(0\|[1-9]\d*)(\.\d+)?`, idempotent, value kept; `toUnits` is the exact BigInt value past 2^53 (M2) | import |
| `formatIxiAmount`, `formatFiatAmount` | `money.js:326`, `:360` | peer (the amount string of a payment card; C# formats it) | a decimal amount keeps its integer part and sign, shows ≤ 2 decimals (more only to keep a sub-0.01 value visible), is cut not rounded, a nonzero amount never reads zero; any string gives a string (M3) | import |
| `groupAmountDisplay` → `ungroupAmountInput` | `money.js:103`, `:128` | local / QR / paste | for the 14 shipped locales a canonical amount survives the round trip exactly (M4) | import |
| payment card `createPaymentBubble` | `src/components/typed-bubbles.js:204` | peer (amount, name, fiat) | element + attribute names equal those of a benign card of the same role and status (P1) | import |
| `fillFileName`, `fileKind`, `isPhotoFileName` | `typed-bubbles.js:590`, `:693`, `:960` | peer (file name) | text and title equal the name for any string; label ≤ 4 chars; never throw (N1) | import |
| `parseSharedItems`, `sharedLinkHost` | `src/components/shared-items.js:81`, `:102` | C# wire rows carrying peer file names and links | rows keep a hex id, a known kind, a data-URI-only thumb, finite numbers; a host holds no `@ / \ ? #` or space (S1) | import |
| `parseGroupArg`, `parseTransferArg` | `src/shells/chat.html:3022`, `:3289` | C# wire args (peer file group / transfer state) | equal a split-based oracle: ranges (index < count ≤ 10, pct ≤ 99), hex only, anything else `null` (S1) | extract |
| `b64ToUtf8` | `src/bridge/native.js:45` | every bridge argument (peer text rides in it) | base64 of any UTF-8 text decodes to the text (a leading U+FEFF aside); any bytes give a well-formed string (B64) | import |
| search highlight `setHighlights`, `clearHighlights` | `src/components/highlight.js:17`, `:10` | peer text (DOM) + local query | the text of the root never changes; a highlight holds the query; clear leaves none (H1, on texts whose lower case keeps the length) | import |

## Listed, not tested

| Parser | file:line | Why not |
|---|---|---|
| `parseMediaItems` | `src/shells/chat.html:1718` | C# JSON, thumbs gated by a regex; reads shell constants and state (`MEDIA_*`); the cut-out would need five more anchors. Next batch. |
| `parseReactions`, `reactionEmoji` | `chat.html:3853`, `:3923` | peer emoji are folded to ❤️ unless in the six quick reactions or a skin-tone pair: the table is the guard; needs shell state (`myLikes`, `QUICK_REACTIONS`). Pinned by `pins-s8` (emoji-cases.json). |
| `parseAppsFeed`, `feedEntryToApp` | `src/components/apps-feed.js:46`, `:25` | dormant: only the demos wire it. It passes `icon` / `url` / `github` through unfiltered into `img.src` (`apps-details.js:86`): the O-13 class the day a shell fetches the feed. |
| `setSendAddress`, `setSendRecipient` (the `addr:send:amount` split) | `src/components/wallet-send.js:871`, `:901` | need the built send view; the amount goes through `sanitizeAmount` (M1), the address is shape-checked by C#. |
| `parseHintsState`, `moValidArg` | `src/components/glass-card.js:88`, `src/components/moment-sheet.js:230` | C# pushes (local state / a language or app id in a moment); not peer text. Both are strict validators (size cap, numeric range, whitelist); not tested here. |
| C# twins (`LinkRule.cs`, `ReplyQuote.cs`, `S20FormatRules`) | `Spixi/Utils/` | C#: FsCheck is not in this batch. |

## What the tests do not prove

- **No checksum in JS.** Address checks here are shape gates (alphabet, length window); the checksum is C#'s (`Base58CheckEncoding`).
- **IDN / homograph hosts.** A host written with look-alike letters is shown as typed and normalised to punycode only when navigated: the label
  and the real host agree for the URL parser. The shell's confirm modal is the guard.
- **Notes (behaviour read, not a property):** `toUnits` throws on `NaN`, `±Infinity`, numbers ≥ 1e21 (the `toFixed` exponent form) and on any
  non-decimal string (fail closed); `formatIxiAmount` passes a non-numeric string through as it is (documented); `b64ToUtf8` drops a leading
  U+FEFF (the legacy `TextDecoder` read) and `atob` throws on invalid base64.

## Held (contract I5) — `QTOOLS-KNOWN <id>`; each row passes while its stored input reproduces the defect, and a second row proves a fixed copy turns it red

| Id | Defect | Stored input | Where |
|---|---|---|---|
| L1-parse | the link rule links text that is not a URL; the button opens a target that does not parse | `http://a:b` (also `https://a.com:99999`, `http://%`) | `link-rule.js:33` (no `new URL` test before `out.push`) |
| B2-64 | a link with a 64-char host and a path loses the last char of the host in its label (`….co…`) | `https://` + `a`×60 + `.com/x` | `message-bubble.js:112` (`label.slice(0, MAX - 1)` cuts into the host when `host.length === MAX`) |
| H1-case-fold | the highlight marks the wrong characters where lower-casing changes the length | text `İb b`, query `b` → spans `" "` and `""` | `highlight.js:30-39` (indexes of the lower-cased copy are used on the original) |
| S1-inf | `parseSharedItems` lets `Infinity` through as a size | `[["a1",1,"media","","1e999",1700000000,0,null,0]]` | `shared-items.js:91` (`Number(size) \|\| 0`) |
| M1-mangle | `sanitizeAmount` keeps the digits of any text (`1e5` → 15, `-5` → 5, `5 IXI` → 5); right for a keystroke filter, wrong for the QR seed | `1e5`, `-5`, `5 IXI` | `money.js:32-40` |

Not held (no reachable peer path): `createMessageBubble` with a quote `kind` that is an Object prototype key (`constructor`, `__proto__`) writes
`function Object() { [native code] }` as the quote text and logs `icons: unknown icon` (`message-bubble.js:121-131`, `:156`: `{…}[kind]` and
`REPLY_KIND_GLYPHS[kind]` are read without an own-key test). The shell's kind comes from its own vocabulary (`replyKindOf`) and the fallback reads
its table with `hasOwnProperty`, so no peer text reaches it today; R1's domain is the shell's vocabulary plus one unknown word.
