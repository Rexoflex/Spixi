# ★ SECURITY HANDOVER GATE — the redesign must introduce nothing

**Set by Damir, 2026-08-15.** Referenced as a ground rule in `CLAUDE.md`, so it carries
into every session.

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.** See `CLAUDE.md`.

## The rule

Before the app goes to the BE engineer for review, an **introduced-vs-inherited security
sweep** runs over the whole delta from the fork point `0e85a4b8`.

**One question per finding: does this exposure exist at the baseline?**

- **No → we introduced it → we FIX it before handover.**
- **Yes → legacy → it goes to him untouched.**

He must see only his own legacy issues. Never ours. That is the whole point: the redesign
introduces no security or privacy regression, and the handover should prove it rather
than assert it.

## When it runs

**As the LAST gate before handover, not earlier** — every remaining batch adds surface, so
sweeping first means sweeping twice. Reply-to is the clearest example: the locked design
puts a marker in the message body that the FE parses, which is a new parsing surface for
peer-controlled content.

**But apply the lens WHILE building.** The sweep is the gate, not the design step. A batch
that adds a verb, a `spixi.*` key, a WebView setting, an HTML sink, a network fetch or a
log line should already have asked the question.

## The surface, measured 2026-08-15

| Target | Size | Why it is in scope |
|---|---|---|
| C# vs the fork point | **50 files, ~6,900 insertions** | Everything the redesign added on the native side |
| `ixian:` verbs the shells emit | **112** | Each is an untrusted string crossing into C#. Check validation, path and filename handling, anything reaching a filesystem op or a URL, anything near money or keys |
| `spixi.*` localStorage keys | **16** | The shells run on `file://`, which mini-app code may share (MAJOR #4). What is in each key matters |
| Changed platform / WebView / Utils files | 37 | WebView config, delegates, permissions, link handoff. Both MAJOR #6 and MAJOR #7 lived here |
| `innerHTML` / `eval` sinks in the FE | 14 | XSS from peer-controlled content — nicknames, message text, app names, file names |
| FE source | 317 files | The rest of the sweep surface |

Also sweep: **network fetches** that could leak the user's IP to a third party (the #82
media-autoload class) · **what reaches `ixian.log`**, because DevPage renders it and offers
it through the OS share sheet · **anything touching a password or key** across the bridge.

## Output format

One row per finding. No prose verdicts.

| Finding | file:line | INTRODUCED / INHERITED / MITIGATED-BY-US | Evidence at `0e85a4b8` | Fix |
|---|---|---|---|---|

Every **INTRODUCED** row is fixed before handover. Every **INHERITED** row is handed over
unchanged, with its file:line, so his pass is a review and not a discovery exercise.

## Known state, 2026-08-15

### Ours — MUST be fixed before handover

| Item | What | Status |
|---|---|---|
| **MAJOR #3** | The chat link-open confirm modal is spoofable. We built the linkify and the modal (#82 / #231c); legacy had no such modal | OPEN |
| **MAJOR #6** | Mini-app WebView regressions from the iOS bring-up (#282/#283) — the global external-link handoff and the lost safe-area inset reached mini-app WebViews too | OPEN, rides with the iOS work |
| **`spixi.draft.*`** | OUR key, holding the user's **own unsent message text in plaintext**, in a partition third-party mini-app code may be able to read. The mechanism is legacy (MAJOR #4); this key and its contents are ours | OPEN — fix regardless of what the sweep concludes |

### #348 — the F5 batch, lens applied while building (2026-08-15)

Every row below was asked at build time, not at sweep time.

| Item | file:line | Verdict | Evidence at `0e85a4b8` | Action |
|---|---|---|---|---|
| Blind-chat sender LABEL carried the peer's full address in `title`, in `aria-label`, and one tap from the clipboard | `src/shells/chat.html:1274` → `src/components/message-bubble.js:340-346` | **INTRODUCED** | Legacy has no sender-label surface and no member sheet — both are ours (#99) | **FIXED in-batch.** A blind chat now renders a neutral `hiddenMember` placeholder and passes no address at all. Covers blind GROUPS too, which were never protected on this surface |
| Member sheet reachable in a blind BOT (`mode.type === 3` admitted it) | `src/shells/chat.html:1294` | **INTRODUCED** | Same — the sheet is ours | **FIXED in-batch.** Gated on `mode.blind`, plus `blind: mode.blind` as a belt |
| Tip widened to BOT groups — a WebView-composed amount reaching `IxianHandler.addTransaction` | `Spixi/Pages/Chat/SingleChatPage.xaml.cs:1149` | **REACH introduced, MECHANISM inherited** | The identical guard blocks bots at `0e85a4b8` (verified with `git show 0e85a4b8:…` — same two lines). The no-native-confirm tip flow itself is legacy and already ships for normal groups | **SHIPPED — Damir asked for it.** ⚠ It inherits a real gap: the amount is composed in the WebView and C# signs and broadcasts with only a POST-HOC alert. That is a CLAUDE.md "risky part". Widening its reach is worth one line in the BE handover |
| Tip NRE could navigate the WebView to a raw `ixian:` URL | `Spixi/Pages/Chat/SingleChatPage.xaml.cs:1202` | **INHERITED** (the null return predates us; our widening made it reachable from more chats) | `prepareTransactionFrom` already returned null at the fork point | **FIXED in-batch** — null-checked, `WalletSend2Page:113` precedent |
| `setChatMode` 7th argument (blindness) | `Spixi/Pages/Chat/SingleChatPage.xaml.cs:674` | No exposure | Additive argument on an existing push, boolean, no sink | None |
| New `Logging.error` lines on the delete path | `Spixi/Pages/Settings/SettingsPage.xaml.cs` (W14 block) | **INTRODUCED** (the baseline had no try/catch here) | — | **Reviewed and kept.** `ixian.log` is rendered by DevPage and shareable, so this matters. None of the lines touch a password, a key or a seed; the worst case is an exception carrying a wallet FILE PATH, which is not a secret and which legacy already logs elsewhere |
| Auto-save persists more often | `src/shells/settings.html` | No new exposure | Existing `ixian:apply` verb, no new key, no new sink | None. ★ The lens DID change the design: a typing debounce would have broadcast every half-typed nickname to every contact. The component commits on Enter/blur only, so the broadcast count is unchanged |

**No `ixian:` verb was added. No `spixi.*` key was added. No WebView setting, `innerHTML`/`eval` sink or network fetch was added.**

### #348b — the cheap-fix batch, lens applied while building (2026-08-15)

| Item | file:line | Verdict | Evidence at `0e85a4b8` | Action |
|---|---|---|---|---|
| **`setTipResult` — a NEW push into the chat WebView** | `Spixi/Pages/Chat/SingleChatPage.xaml.cs:989` | **INTRODUCED** — and it is the one row in this batch that had to be argued | The push channel `Utils.sendUiCommand` is legacy; this VERB is ours | **SHIPPED, deliberately narrow.** It carries a status flag, a body string and the message id the shell ITSELF sent. ★ The lens changed the design: the first draft pushed the WALLET BALANCE into the chat WebView so the sheet could warn before the send. That was **REJECTED** — it would put a live balance inside the chat document, and #221 keeps chat isolated from the wallet for exactly that reason. The balance figure now appears only inside the failure body C# already composed for the native alert, and only after a failed attempt |
| **`setCaps "tipResult"` — a NEW capability push** | `Spixi/Pages/Chat/SingleChatPage.xaml.cs` (after the `setChatMode` branches) | **INTRODUCED** | The `bridge.cap()` grammar is ours (#242); this capability name is new | No exposure. It carries one constant string that C# chooses. The shell only sets a boolean in `bridge.capabilities` from it. No value from a PEER can reach it |
| **The message id round-trips WebView → C# → WebView** | `chat.html` (`tipFor`) ↔ `SingleChatPage.xaml.cs:1167` (`tipMsgIdHex`) | No new exposure | The id already travelled WebView → C# on every `ixian:contextAction:` | **The return leg is echo-only.** C# stores the hex it received and sends the same characters back. It is compared with `!==` and used for nothing else. It is never used as a path, a key or a lookup |
| **`Crypto.stringToHash` on a peer-visible id** | `Spixi/Pages/Chat/SingleChatPage.xaml.cs:1160` | **INHERITED** | The identical call is at the fork point on the same line of the same method | **HARDENED anyway.** It now sits in its own try/catch that answers the sheet. A malformed id used to throw out of `onNavigating`, which is process-fatal on Android and iOS |
| **`Logging.error` on the tip failure paths** | `SingleChatPage.xaml.cs` (`tipEx`, `idEx`) | **INTRODUCED** (the baseline had no try/catch here) | — | **Reviewed and kept.** `ixian.log` is rendered by DevPage and is shareable. The lines carry an exception and a message id. No password, key, seed or address. The id is a hash of a message both peers already hold |
| **`showToast` restating the tip amount** | `src/shells/chat.html` (`setTipResult`) | No new exposure | The amount was composed IN this document a moment earlier | It is set with `.replace('{a}', amt)` into a component that assigns `textContent`. No `innerHTML`, and the value never leaves the document |
| **The wallet BALANCE now renders inside the chat WebView** | `SingleChatPage.xaml.cs:1312` and `:1330` → `chat.html` `setTipResult` | **DISCLOSURE inherited · SURFACE introduced** | ⚠ Damir asked this at F5 and it was checked, not assumed. `wallet-error-balance-text` is on this same tip flow at the fork point — `git show 0e85a4b8:…SingleChatPage.xaml.cs` lines **629** and **968**, same string, same two arguments (total cost, current balance). Legacy showed it in a NATIVE alert | **KEPT.** What changed is the RENDERING SURFACE, not the disclosure: the same sentence now lands in the chat document's DOM instead of a MAUI dialog. Checked: it is **not persisted** (no `spixi.*` key, no localStorage write), **not logged** (no `Logging` call carries `short_body` or `alert_body`), **not sent** anywhere, and no peer-controlled value reaches it. A mini-app WebView cannot read another WebView's DOM — MAJOR #4 is about the shared `file://` STORAGE partition, and this writes no storage. ★ The stronger version of this WAS rejected: a live balance PUSHED into the chat document so the sheet could warn before sending. What ships is one composed sentence, only after a failed attempt |
| I-8 — the press fill, and I-5 — the title colour | CSS and `topbar.js` | No exposure | Presentation only | None |

**#348b adds no `ixian:` verb** (the tip verb it uses is the existing
`ixian:contextAction:tip:`), **no `spixi.*` key, no WebView setting, no `innerHTML`/`eval`
sink and no network fetch.** It adds **two C# → WebView pushes** and **five log lines**, all
argued above.

🟡 **One residual, INHERITED, carried to the BE engineer:** a throw after
`friend.addReaction` leaves a local tip pill on a message whose sheet reports failure. The
three-step sequence and its order are legacy; #348b added the `catch`, not the window. See
D-10 in `docs/f5-findings-2026-08-15.md`.

⚠ This list is **not assumed complete.** It is what is known today. The sweep exists
because the security doc was never written as an introduced-vs-inherited census.

### Legacy — his, hand over untouched

| Item | What |
|---|---|
| **MAJOR #8** | ANDROID: a mini-app WebView can XHR-read arbitrary app files, **including `wallet.ixi`**. `AllowFileAccess` + `AllowFileAccessFromFileURLs` are true for every WebView and `Utils.IsAllowedURL` only filters http/https |
| **MAJOR #9** | ANDROID: `OnPermissionRequest` auto-grants mic and camera to every WebView, mini-apps included |
| **MAJOR #4** | The shells' localStorage may be readable by mini-app code (shared `file://` partition). ⚠ The mechanism is legacy; **we widened what sits behind it** — see `spixi.draft.*` above |
| **#234** | The resume/privacy lock shows a Cancel that unlocks the app WITHOUT the password |
| **L8** | The wallet password is stored in PLAINTEXT `Preferences["walletpass"]`. Two legacy `// TODO: encrypt the password` markers mark the intent. Should move to SecureStorage |
| **L2** | Passwords ride navigation URLs and are form-decoded, so `+` becomes a space. ⚠ Self-consistent — **do NOT "fix" the transport**, it would lock out existing users. Needs a migration |

### We already caught and fixed our own — worth saying in the handover

Three MAJORs the redesign introduced were found by our own review loops and fixed before
they ever reached him: the back-dismissable in-place lock (**#2**), the call ring that
could cover — and pop — the lock (**#5**), and the GC-collectable WKWebView delegates that
could silently drop the http/https block (**#7**).

And two legacy items were tightened in passing: the `waletpass` typo, so delete-wallet now
actually clears the plaintext password (#346), and the downloads path traversal (#267).

The handover note should say this. His read should be "they tightened things", not "here
is a pile".
