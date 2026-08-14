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
