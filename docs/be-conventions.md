# BE conventions — how the Spixi C#↔WebView bridge works (rules for the BE agent)

**Purpose.** This is the rulebook for anyone (esp. a delegated AI agent) landing the C#
changes in `be-cutover-brief.md`. The bridge is a tiny, rigid contract. **Mimic the
existing patterns exactly. Change as little as possible. Add nothing that wasn't asked
for.** Every ask is a JS↔C# *co-change*: the shell handler (JS) and the C# push/dispatch
land together, in the same manner as the code already around them.

Verified against source 2026-07-08 (file:line cited throughout). If a claim here
disagrees with the code, the code wins — re-read it.

## 0. Hard rules (read first)

1. **NEVER touch money/signing paths.** Wallet send, transaction signing/broadcast,
   payment-request *pay*, balance math → **HUMAN BE ONLY**. Do not write, "fix", or
   refactor these even if a row looks adjacent. If a task requires signing, stop and flag.
2. **Every change is a JS+C# co-change.** Add the C# push/verb AND the matching shell
   handler in the SAME change. Never land one half.
3. **Never reorder or retype existing `sendUiCommand` arguments.** The JS side reads them
   positionally. New args go at the **END** of the signature only.
4. **One ask = one minimal change.** No new abstractions, no helper classes, no renames,
   no "while I'm here" cleanups, no touching unrelated verbs. Match the surrounding style.
5. **Analyze the existing call site before writing.** Find the nearest existing
   `sendUiCommand`/`onNavigating` branch that does something similar and copy its exact shape.
6. **The frozen bridge stays working.** Existing `ixian:` verbs and `executeUiCommand`
   pushes must behave identically after your change.

## 1. The bridge is exactly two mechanisms

### 1a. C# → WebView (push data / call a JS function)

`Spixi/Utils/Utils.cs:61` — `sendUiCommand`:

```csharp
Utils.sendUiCommand(this, "jsFunctionName", arg1, arg2, ...);
```

builds the string `executeUiCommand(jsFunctionName,'arg1','arg2',...);` (Utils.cs:65-82)
and evaluates it in the WebView. On the JS side `executeUiCommand` (in
`src/bridge/native.js`) resolves `jsFunctionName` as a **page-global function** and calls
it with the args. In the redesigned shells that global is a key in the shell's `handlers`
object, exposed via `bridge.exposeAll(handlers)`.

- **Args are always strings.** `null` is passed through as the JS literal `null`
  (Utils.cs:75-78) — the shell guards against it (`native.js` null-guard, DECISIONS #182).
- **Bools** are passed as `bool.ToString()` → `"True"` / `"False"` (or `""`); the shell
  parses with its `asBool` helper.
- Strings are HTML-escaped via `escapeHtmlParameter` (Utils.cs:73).
- Messages sent before the page finishes loading are **queued** and flushed on
  `Navigated` (SpixiContentPage.cs:66-99) — you don't manage this.

**To add a new push:** at the existing C# call site that already knows the data, add one
`Utils.sendUiCommand(this, "newFn", a, b);` and add a `newFn(a, b) { … }` entry to the
shell's `handlers` object. Nothing else.

### 1b. WebView → C# (a command / user action)

The shell calls `bridge.send('ixian:verb')` or `bridge.send('ixian:verb:arg')`, which sets
`location.href`. The page's `onNavigating(WebNavigatingEventArgs e)` catches it
(e.g. `SingleChatPage.xaml.cs:86`):

```csharp
string current_url = HttpUtility.UrlDecode(e.Url);
e.Cancel = true;                                   // never actually navigates
if (onNavigatingGlobal(current_url)) return;       // shared verbs handled first
if (current_url.Equals("ixian:verb", StringComparison.Ordinal)) { onVerb(); }
else if (current_url.StartsWith("ixian:verb:")) {
    string arg = current_url.Substring("ixian:verb:".Length);
    onVerb(arg);
}
```

- **No-arg verbs** → `.Equals("ixian:verb", StringComparison.Ordinal)`.
- **Arg verbs** → `.StartsWith("ixian:verb:")` then `.Substring(prefix.Length)`. Multiple
  args are colon-joined (`ixian:create:<nick>:<pass>`) and `.Split(':')` — check the
  existing verb for its exact split.
- Handlers are small `private` methods on the page (`onRequestIxi()`,
  `onViewPayment(tx_id)`, …).

**To add a new verb:** add one `else if` branch to that page's `onNavigating`, copying the
substring pattern of the branch above it, calling a new small handler method. On the JS
side, `bridge.send('ixian:newverb:' + arg)`. Nothing else.

## 2. Pages, HTML loading, and the §5 repoint

Every screen is a `SpixiContentPage` subclass (`Spixi/Utils/SpixiContentPage.cs:32`).

- `loadPage(webView, "file.html")` (SpixiContentPage.cs:46) sets `_webView.Source` to the
  HTML under `Resources/Raw/html/` and wires `Navigating`→`onNavigating`.
- **§5 repoint = change the `"file.html"` string** in a page's `loadPage(...)` call to the
  redesigned shell's filename. That is the entire integration for a page. (Mapping table:
  ARCHITECTURE §5. This is the "one-liner per page" the roadmap refers to.)
- `generatePage`/`localizeHtml` (SpixiContentPage.cs:173-195) bakes localization + custom
  strings into an `ll_*.html` copy at load time — you don't touch this.

## 3. Strings & config to the WebView

- **User-facing text** → `SpixiLocalization._SL("some-key")` (add the key to the language
  resources the same way existing keys are added). Never hardcode UI English in C#.
- **Config / feature flags for the shell** → `SpixiLocalization.addCustomString(key, value)`
  (e.g. `Platform`, `devMode`, `SpixiThemeName`). These are baked into the HTML and read
  JS-side as `window.SL[key]`. Use this for boolean/scalar env the shell needs at boot.
- The redesigned shells read strings via `getStrings()` / `window.SL` — a new
  `addCustomString` key is available there with no extra plumbing.

## 4. Where the dispatch lives (per surface)

| Surface | C# page (onNavigating + pushes) | Shell (handlers + bridge.send) |
|---|---|---|
| Chat | `Pages/Chat/SingleChatPage.xaml.cs` (~:86 dispatch) | `src/shells/chat.html` |
| Chats list / Wallet / Apps tabs | `Pages/Home/HomePage.xaml.cs` | `src/shells/home.html` |
| Settings/Account | `Pages/Settings/SettingsPage.xaml.cs` | `src/shells/settings.html` |
| Contact details / add | `Pages/Contacts/*.xaml.cs` | `src/shells/contact_*.html` |
| Launch/onboarding | `Pages/Launch/*.xaml.cs` | `src/shells/launch.html` |
| Scan / Lock | `Pages/*` | `src/shells/scan.html` / `lock.html` |

`onNavigatingGlobal` (shared across pages) handles common verbs (back, app requests,
call bar) — check it before adding a verb, so you don't duplicate one.

## 5. Checklist for each BE row

1. Read the row in `be-cutover-brief.md` and its cited file:line.
2. Confirm it is **not** a money/signing row (§0.1). If it is → stop, hand to human BE.
3. Find the existing `sendUiCommand` call site (for a push) or `onNavigating` branch (for a
   verb) nearest to the feature; copy its exact shape.
4. C#: add the push arg (at the end) or the `else if` branch + small handler. Nothing else.
5. JS: add/adjust the matching `handlers.fn` or `bridge.send('ixian:verb…')` in the shell.
6. Keep the diff tiny and self-explanatory; a one-line comment citing the row id (e.g.
   `// CH1`) is enough. No refactors.
7. Verify existing verbs/pushes still behave (frozen-bridge rule).
8. It must build (`net10.0-windows`) and be exercised in the running app — a bridge change
   that only "looks right" isn't done.

## 6. Anti-patterns (do NOT do these)

- Inventing a generic "command router" / reflection layer — the `if/else if` chain IS the
  pattern; extend it.
- Changing an existing verb's arg order/format to "clean it up".
- Adding features the row didn't ask for (extra fields, speculative flags).
- Bundling multiple rows into one sprawling change — one row, one small diff.
- Touching wallet/payment/signing code for any reason.
