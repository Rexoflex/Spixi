# P14 · TRANSPORT · The C# → JS push path, the batch push and the data: URI rule

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| HIGH | no | yes | shipped | 5 min |

**Look here first:** `Spixi/Utils/Utils.cs:305` — every push argument is base64 here, so no peer text (nick, message, file name) can leave the `'…'` literal of `executeUiCommand(…)`; the encoder is byte-identical to 0e85a4b8 again (O-11 (#1303)).

**DECISIONS:** #1293 · #1303 · #340 · #298 · #801 · #802 · #903 · #315 · #791 · #1264 · #1127 · #1166 · #608 · #1312

## What changed and why
- `sendUiCommand` base64-encodes every argument again; the #340 raw `data:` fast path and its two gates are deleted. Cost: a data: URI argument is 4/3 larger and the shell runs one `atob` (O-11, Damir chose FIX (#1293, #1303)).
- `src/bridge/native.js` (ours; legacy was `spixi.js`) decodes base64 → UTF-8, maps null to "", and still passes a leading `data:` through; no C# value can reach that branch (base64 has no `:`) (#1303).
- Batch transport: a chat load is ONE `addMessages(json, position)` + `messagesDone`, not one eval per row; the shell runs only 8 allow-listed row handlers (#298, #801, #802).
- Push queue: a push to a page whose document is not loaded waits in a `ConcurrentQueue`; the drain re-checks and is posted to the main thread (legacy queue, our fix #903).
- New transport-level pushes: `onRepresented` (parked page shown again, #315), `window.paintAck` (#1264), `cdpong` (a temporary round-trip probe, #791). Dev-build perf stamps log only the pushed function name (#1127, #1166).

## Files (verified at 387ca78b)
- `Spixi/Utils/Utils.cs:297` — the command name is NOT encoded; every caller passes a C# literal (variable sites `SingleChatPage.xaml.cs:5035`, `HomePage.xaml.cs:3849–3862` carry literals) (#801, #1166).
- `Spixi/Utils/SpixiContentPage.cs:659` — `sendMessage`: eval if loaded, else `Enqueue` `:671` + posted drain `:686`; `Dispose` clears the queue `:6824` (#903).
- `src/bridge/native.js:241` — the decode and the `data:` passthrough (#1303).
- `src/shells/chat.html:6734` (built `Spixi/Resources/Raw/html/chat.html:13138`) — `BATCH_ALLOW.has(item.f)` gate; integer args index `strs` (#801).
- `Spixi/Pages/Chat/SingleChatPage.xaml.cs:5486` — `clearMessages`·`addMessages`·`messagesDone` sent inside `lock (messages)` (#802).
- `Spixi/Utils/SpixiContentPage.cs:4100` — `p1VerbOf`: `[a-z0-9_]{1,30}` of the function name, never an argument; armed only when `P1Perf.enabled` (dev builds) (#1166).
- `Spixi/Utils/SpixiContentPage.cs:6724` — the one other raw-JS push: `window.__setKbInset(<int>)` (iOS, integer only) (#608).

## Bridge surface
| Verb / push | Args (shape) | Who can send it | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| every push `executeUiCommand(fn, …)` | each arg `<base64 UTF-8>` or `null` | C# → the page's own WebView only | `Utils.cs:293` | reshaped back to baseline (O-11 (#1303)) |
| `addMessages` | `<json {strs[],items[{f,a,r}]}>`, `<append\|prepend>` | C# → `chat.html` (untrusted) · SingleChatPage | `SingleChatPage.xaml.cs:5486` | ours (#801) |
| `addChats` / `addContacts` (the name is a variable; a grep misses it) | `<json {strs,items}>` | C# → `src/shells/home.html` (built `index.html`; untrusted names, excerpts) · HomePage | `HomePage.xaml.cs:3849`; shell allow-lists `home.html:4065`, `:4072` | ours (#1166) |
| `onRepresented` | none | C# → a re-presented parked page (Account) | `SpixiContentPage.cs:1575` | ours (#315) |
| `window.paintAck` | none | C# → the held chat (Android hold) | `SpixiContentPage.cs:5151` | ours (#1264) |
| `cdpong` | `<digits ≤16>` (echo of `ixian:cdping`) | C# → own shells; mini-app refused | `SpixiContentPage.cs:6326` | ours, temporary (#791) |

## Threat → rule → proof
| A hostile … could try… | What stops it | Proof |
|---|---|---|
| peer: a nick or message with `'`, `\`, newline or `${` to run script in the receiving shell | `Utils.cs:305` | `pins-s15/c-transport.mjs` "★★ S15 O-11 (#1293): Utils.sendUiCommand base64-encodes EVERY non-null argument…" (also: one composer of `executeUiCommand(`) |
| peer text inside the batch JSON calling a non-row handler (e.g. `setChatMode`) | JSON built by `JsonConvert`; `chat.html:6734` allow-list | smoke "★★ Session P L2·14 … `BATCH_ALLOW.has(item.f)` is the guard…" |
| a push for chat A landing in chat B's WebView | push takes the page object; `SingleChatPage.xaml.cs:214` refuses a second conversation per page | smoke "★★ Session P L1·3 … attach refuses a page that already holds a conversation" |
| a push sent before load is lost or reordered | `SpixiContentPage.cs:686` | smoke "★ #903 r2/r3: sendMessage RE-CHECKS pageLoaded…" |
| peer text reaching `ixian.log` through a push stamp | `SpixiContentPage.cs:4100` | `pins-s5/motion.mjs` "★ #1166 lever 4 PROBE…" |
| a non-literal command name | callers use literals only | no pin — grep only |

## Given up / left open
- Cost: every data: URI (avatars, thumbs, viewer image; 8 C# files build them) crosses as base64 of base64, 4/3 larger, held as JS strings (#1303). Planned perf lever #1 (media origin `MediaOrigin` flag: an `https://appassets…/m/<id>` / `spixi-media://` handler that serves C#'s own ids to the owning WebView) would remove most of it — not built (#1312).
- The native.js `data:` passthrough stays; only C# encoding keeps it unreachable (#1303).
- A push to a page that is not loaded, or already disposed, waits in the queue in memory with no cap; a disposed page never drains it (#903).
- `cdping`/`cdpong` and the `[CDPERF]` chat-open timing log lines ship in every build until retired (#791).

## Question for BE
None.
