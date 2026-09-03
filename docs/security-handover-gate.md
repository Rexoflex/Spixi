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

### #349–#351 — the Android pass, the PerfTrace deletion, D-16 (2026-08-16)

| Item | file:line | Verdict | Action |
|---|---|---|---|
| **#350 deletes `PerfTrace` and its call sites** | `Spixi/Utils/PerfTrace.cs` (gone) + four .cs files | **REMOVES exposure** | The scaffold logged timing lines into `ixian.log` and logcat unconditionally. Deletion-only diff; the log surface SHRINKS |
| **#351 `data-pressfade` — a NEW DOM attribute** | `pressable.js`, `base.css` | No exposure | Set and removed by our own JS on row elements. Never persisted, never logged, never sent. No `spixi.*` key, no `ixian:` verb, no `innerHTML`/`eval` sink, no fetch, no WebView setting |
| **#351 downloads.html attaches the press mechanism + the file row joins the family** | `src/shells/downloads.html`, `settings-app.css` | No exposure | Presentation only. The file-name handling (textContent, encodeURIComponent on the verbs) is untouched |
| **#349 runsheet + findings docs** | docs only | No exposure | The PERF numbers quoted contain timings only |

**The batch adds no verb, no key, no sink, no fetch, no WebView setting, and no log line.**

### #364–#368 — the R1 identity round, lens applied while building (2026-08-17)

| Item | file:line | Verdict | Baseline? | Action |
|---|---|---|---|---|
| **`removeBlocked` — a NEW push into the contact-details WebView** | `ContactDetails.xaml.cs` (onRemove) → `contact_details.html` | **INTRODUCED** | The push channel is legacy; the verb is ours | **SHIPPED, narrow.** It carries group nicknames (peer-controlled — the group creator names the group) + wallet addresses. The shell renders BOTH via `textContent` only (modal title/body/list — verified end to end incl. modal.js); each arg is transport-escaped (base64) by `Utils.sendUiCommand`. No storage write, no log line, no echo back |
| **The trailing `relation` arg on addThem/addContact/addMember** | `SingleChatPage.xaml.cs` (insertMessage, loadContacts) · `ContactDetails.xaml.cs` (loadMembers) | **INTRODUCED** | The pushes are legacy; the arg is ours | **Blind-gated on the SENDING side** (broad `botInfo.hideParticipantAddresses` predicate — never the '[Unknown]' mask alone, which skips blind bots): an is-in-your-contacts hint beside a masked identity would de-anonymize. FE validates against a closed 4-value vocabulary before it touches any state. Not persisted, not logged |
| **`ixian:sendContactRequest:` gains a SECOND page (ContactDetails)** | `ContactDetails.xaml.cs` (onNavigating) → `SpixiContentPage.sendContactRequestGuarded` | **Verb inherited (SingleChatPage #99/#334) · dispatch site introduced** | The guarded body is byte-moved, not re-implemented | Both pages route through ONE helper — self guard, pendingDeletion heal, exists alert, requestAddSent marker all preserved. **HARDENED in the move:** the address parse (peer-influenced URL payload) now sits in try/catch — the old inline parse could throw out of `onNavigating` (the A-4 class, process-fatal on Android/iOS) |
| **The N27 enumeration under `lock`** | `ContactDetails.xaml.cs` (onRemove) | **INTRODUCED** | Core runs the identical loop in `isFriendInGroup` | Snapshot-then-lock ONE reference (`sortFriends()` reassigns the field lock-free); fail-safe catch → the legacy alert. No new lock order, called only from the UI thread |
| **Avatar palette + Owner chip + group glyph** | avatar.js/.css · message-bubble.js/.css · threading sites | No exposure | Presentation only | The chip gate carries `!mode.blind` (a blind chat must never mark one hidden member as Owner — loop MAJOR-1). Hue quantization to 12 buckets REDUCES the pre-existing blind-avatar color-correlation channel (360→12) |
| **3 new string keys + 7 locale drafts** | src/strings/draft/*.json | No exposure | — | Static UI copy; zero em-dashes (N3a gates hold) |

### #370–#371 — the D-19b family + R2, lens applied while building (2026-08-17)

| Item | file:line | Verdict | Baseline? | Action |
|---|---|---|---|---|
| **`reverseResolveSenderByNick` — C# hands a roster ADDRESS to a row that stored none** | `SingleChatPage.xaml.cs` (insertMessage · the tip case) | **INTRODUCED** | The roster + the address are the user's OWN local data; the display slot is legacy | The resolve reads MY OWN `friend.users` roster only — no network, no new data crosses any boundary. NEVER blind (unknown botInfo fails closed). EXACT single nick match or nothing (a collision would make a copyable address + a TIP RECIPIENT for the wrong member). The tip path RE-resolves at spend time, so a roster change between render and spend refuses instead of paying wrong. One implementation — the shell deliberately gets NO copy of the rule (its roster view is partial) |
| **Blind pseudo-nick display guard** | avatar.js `isPseudoAddressNick` · chat.html addContact · contact_details.html addMember | **Exposure INHERITED (C# baseline :466-472 pushes "x"+address as a blind nick) · the member-LIST + @-mention surfaces that rendered it are OURS (#248/#210)** | Legacy showed it too (`innerHTML = nick` in legacy chat.js) — but the redesign ADDED the roster list + the mention picker, which could paste the address into an OUTGOING message | Display blanked at ingest on our surfaces (placeholder renders instead); the raw value stays as the roster KEY; the C# convention untouched (inherited — his, if he wants the source fixed) |
| **`ixian:cdoverlay:1|0` — a NEW nav verb (N50)** | contact_details.html → `ContactDetails.xaml.cs` | **INTRODUCED** | The homeoverlay twin shipped in #336 (same class) | Display-state mirror only: ONE bit, no payload, volatile field, parsed with Ordinal EndsWith. Drives back-routing only; cannot navigate, store, or echo |
| **`cdBack` — a NEW C#→shell push (N50)** | `ContactDetails.xaml.cs` · HomePage back route → contact_details.html | **INTRODUCED** | homeBack twin (#336) | No arguments; the handler calls the shared `dismissTopOverlay()` and self-heals the mirror. A forged/stale push at worst closes a sheet |
| **`amOwner` — 7th arg on setGroupInfo (N48)** | `ContactDetails.xaml.cs` → contact_details.html → chat-info.js | **INTRODUCED** | The push is #248-ours already | ONE bit about MYSELF, computed from the raw owner address; the blind owner-ADDRESS suppression is untouched (the masked string stays ""). Reveals nothing about any other member; rendered only in my own UI |
| **`pending-in` relation token (R2)** | `SpixiContentPage.contactRelationFor` → member-sheet.js | **INTRODUCED (vocabulary widened)** | The #366 relation arg is ours; same blind gates apply unchanged | Same safety shape as 'pending': badge only, no request button, no money. Both shells validate against the closed vocabulary |
| **D-7 restore copy · I-11 subs · AND-35 renames · aria joiners · locale drafts** | lang/*.txt · settings-shell.js · settings-screens.js · 9 aria sites · draft/*.json | No exposure | — | Static UI copy; textContent sinks only; zero em/en-dashes (the N3a gates hold all 8 dictionaries) |
| **`Logging.warn` in the reverse-resolve catch** | `SingleChatPage.xaml.cs` (reverseResolveSenderByNick) | **INTRODUCED** | Log channel is legacy | Exception message only — no nick, no address, no user data |
| **`selectChat` re-timing + the "" clear (N49)** | `HomePage.xaml.cs` (onOverlayPresented / onOverlayClosed) | Existing verb, existing payload — call sites moved | The #182 push is ours already | Display-state only; no new data crosses |
| **`resolvedSenderByMsgId` (the A-2 render→spend binding)** | `SingleChatPage.xaml.cs` | **INTRODUCED** | — | In-memory only, per page instance; msgid→address of the user's OWN roster; never persisted, never logged, never pushed. TIGHTENS the money path (the tip refuses on render/spend divergence) |

### #375 — N51–N59 + N36b + AND-37, the F5 fix batch, lens applied while building (2026-08-17)

| Item | file:line | Verdict | Baseline? | Action |
|---|---|---|---|---|
| **`ixian:chatoverlay:1\|0` — a NEW nav verb (N51)** | chat.html → `SingleChatPage.xaml.cs` | **INTRODUCED** | The cdoverlay (#370) + homeoverlay (#336) twins — same class, third instance | Display-state mirror only: ONE bit, no payload, volatile field, parsed with Ordinal EndsWith. Drives back-routing only; cannot navigate, store, or echo |
| **`chatBack` — a NEW C#→shell push (N51)** | `SingleChatPage.xaml.cs` + HomePage back route → chat.html | **INTRODUCED** | cdBack twin (#370) | No arguments; the handler dismisses via the shared `dismissTopOverlay()` or the two off-stack arms (channel selector, select mode) and self-heals the mirror. A forged/stale push at worst closes a sheet |
| **AND-37 — settings onBack sheet arm** | settings.html | No exposure | — | Reorders EXISTING in-shell back handling; no new verb (the back route into this shell was already unconditional both presentations) |
| **N55 toast + `contactRequestSent` key** | chat.html ×2 · contact_details.html · strings (contact_new: NONE — the #376 loop removed it, B-2: C# alert-and-stay paths made the optimistic toast false) | No exposure | — | textContent sink via the shared c-toast; NO new storage key (a landing-page localStorage stash was considered and deliberately NOT built — MAJOR #4 posture); the emits are the EXISTING sendContactRequest verbs, unchanged |
| **N58 avatar node cache** | chats-shell.js | No exposure | — | In-memory per-list WeakMap of DOM nodes the list ALREADY renders; never persisted; capped at 128; the data-URIs were already in the DOM every render |
| **N53 badge · N54 gate · N52 pulse · N56 wash · N59 gap · N36b tap-highlight** | chat.html · scroll-latest wiring · tokens.css · chatlist-item.css · settings-shell.css · message-bubble.css | No exposure | — | Display-only counters and CSS; no storage, no sink, no fetch, no WebView setting |
| **N52 `messagesToLoad` 25→50** | Config.cs:57 | No exposure | — | Window size only; the D-18 poisoned-window guard re-walked and HOLDS (50→100 guarded→150) |

### #379 — N4 locale expansion, lens applied while building (2026-08-17, cloud)

| Item | file:line | Verdict | Baseline? | Action |
|---|---|---|---|---|
| **5 new FE dictionaries + drafts + glossaries** | src/strings/{it-it,id-id,lt-lt,cn-cn,ja-jp}.json/.js · draft/* · both strings artifacts · 22 rebuilt shells | No exposure | — | Static UI copy through textContent sinks only; verify-locales token/placeholder gates green; the glossary jsons carry legacy `<a href>` reference values but build-locales NEVER reads glossaries — all 13 shipped dictionaries are HTML-free (Opus loop r1 verified) |
| **Utils.cs culture-gate +5 codes (cn-cn resolves as zh-cn)** | Utils.cs:129-131 | No exposure | The switch is #360-ours | Number-display formatting only; string-built, no float, no new data path |
| **`setDocLang` cn-cn → zh-cn** | build-strings-iife.mjs → both strings artifacts | No exposure | The side effect is #269-ours | Sets `<html lang>` only; dictionary lookups stay cn-cn; Intl consumers get a real tag instead of junk |
| **`loadLanguage` stores the RESOLVED code + S3 pushes it** | SpixiLocalization.cs · SettingsPage.xaml.cs (S3) | No new verb | The setLanguage push is legacy | Same verb, same closed vocabulary — the payload becomes the resolved file code (13 known values) instead of a raw OS culture string; strictly narrows what reaches the shell |
| **Un-hidden pickers (13 rows)** | settings.html · launch-shell.js | No exposure | The ixian:language verb is legacy | Vocabulary widened by 5 codes that SpixiLocalization already ships; the picker still emits only list codes |
| **Legacy lang txt edits (18 ids ×5 · id-id un-swap/case sweep · dash/overflow sweeps)** | Resources/Raw/lang/*.txt | No exposure | — | Static copy; C# testFile grammar verified (no quotes, no argCount drift); all consumers fallback-guarded |
| **New build tools (overflow audit · smoke execSync gate)** | scripts/i18n-overflow-audit.mjs · smoke-test.mjs | No exposure | — | Build/CI-time only, never shipped; execSync runs process.execPath on a repo-fixed path, no user input |

### #381–#382 — the N12/N40 triage session, lens applied (2026-08-18, cloud)

**Nothing to gate: this session shipped DOCS ONLY.** No source file was
changed — no verb, no `spixi.*` key, no WebView setting, no HTML sink, no
network fetch, no log line. Smoke stayed at the 1947/same-4 baseline
because no code moved.

Two fix shapes were RECORDED for later rounds. Both are pre-gated here so
the round that builds them does not re-derive the verdict:

| Planned item | Shape | Pre-verdict |
|---|---|---|
| **N12 leg 2** — seed `backupReminderTimestamp` in `LaunchRestorePage.onRestore` | Writes an EXISTING C# Preference key with a clock value | No exposure — no new key, no new surface, no user input |
| **N12 leg 1** — restore provenance to the onboarding tail | A C# Preference read at `OnboardPage` construction, delivered as a **C#→WebView push**, NOT a new `ixian:` verb | Inbound push only; the outbound bridge stays frozen. ⚠ The build must keep it a push — an `ixian:` addition would need its own gate row |
| **N40** — latch/ordering fix in `HomePage.updateScreen` | Assigns an existing `volatile bool`, reorders two arms of one `if/else`, adds a `try` | No exposure — no new data path; the pushed strings are the existing localized `showWarning` vocabulary |

### #383 — N12 + N40, lens applied while building (2026-08-18, cloud)

| Item | file:line | Verdict | Baseline? | Action |
|---|---|---|---|---|
| **`onboardingFromRestore` + `backupReminderTimestamp` seeds** | LaunchRestorePage.xaml.cs (onRestore) · LaunchCreatePage.xaml.cs | No exposure | `backupReminderTimestamp` is a baseline key | C# Preferences, not `spixi.*` localStorage — outside the mini-app storage partition (MAJOR #4). Values are a bool and a clock stamp; no address, no content |
| **`OnboardingFromRestore` custom string + `*SL{}` carrier** | HomePage.xaml.cs (pre-OnboardPage) · src/shells/launch.html | No new verb | The carrier grammar is legacy (#314 devMode) | Inbound C#→WebView only. Vocabulary = `"true"`/`"false"`; an un-substituted marker fails safe to the backup step. The outbound `ixian:` bridge is untouched |
| **`tailSkipBackup` opt** | launch-shell.js buildTail | No exposure | — | Pure presentation: which of two already-built steps opens first |
| **updateScreen restructure (connectivity first, own try)** | HomePage.xaml.cs updateScreen | No exposure | The block is legacy | Reorders existing arms and drops a latch. No new data path; the pushed strings stay the existing localized `showWarning` vocabulary |
| **Dismissable update notice** | banner.js · banner.css · src/shells/home.html | No exposure | — | Dismissal is an in-memory variable — deliberately NOT a `spixi.*` key (MAJOR #4). No verb, no fetch, no sink: `textContent` only |
| **CRLF normalisation on read** | scripts/build-demo-bundle.mjs | No exposure | — | Build-time only, never shipped. Reads the same repo files it always read |

**No verb, no `spixi.*` key, no WebView setting, no HTML sink, no network fetch, no new
log line.** The gate finds nothing in this batch.

### #385 — N66 theme fix + N65 instrumentation, lens applied while building (2026-08-18, cloud)

| Item | file:line | Verdict | Baseline? | Action |
|---|---|---|---|---|
| **`UserAppTheme` stays `Unspecified`** | App.xaml.cs (boot + the RequestedThemeChanged handler) | No exposure | The pin is baseline (it is what we removed) | Presentation only. It changes which theme MAUI reports, nothing else. No data path |
| **`isPlatformDark()`** | ThemeManager.cs | No exposure | — | Reads `Application.Current?.RequestedTheme`. No storage, no bridge, no fetch |
| **The revived OS-flip handler** | App.xaml.cs | ★ Newly REACHABLE legacy code | The body is baseline (#251/#315/AND-1) | `reloadAllPages` + `disposeParkedOverlay` have been dead since the boot event. They now run on a real OS flip. They regenerate live WebViews from the same assets as any page open — no new surface, no new data. **Consequence to watch, not an exposure:** a regenerated page loses transient DOM state, so an in-progress password field is cleared. The shells already scrub those on every leave path (#341) |
| **`reloadAllPages` hardening** | UIHelpers.cs | No exposure | — | Null `MainPage`, a non-`SpixiContentPage`, and a throwing reload no longer propagate. Strictly narrows what can escape |
| **★ NEW LOG LINES (N65)** | SpixiLocalization.cs · SettingsPage.xaml.cs | No secret leaves | — | ⚠ `ixian.log` is rendered by DevPage and offered through the share sheet, so this is checked deliberately. What is written: the requested language code, the resolved language code, a bool, a language-file line NUMBER, a translation KEY, and `ex.Message` from parsing a SHIPPED asset. No wallet data, no password, no address, no nickname, no message content, no path from a WebView |

**No verb, no `spixi.*` key, no WebView setting, no HTML sink, no network fetch.** The new
log lines are the one item the gate flags, and they carry no user secret.

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

Four MAJORs the redesign introduced were found by our own review loops and fixed before
they ever reached him: the back-dismissable in-place lock (**#2**), the call ring that
could cover — and pop — the lock (**#5**), the GC-collectable WKWebView delegates that
could silently drop the http/https block (**#7**), and **#438** below.

And two legacy items were tightened in passing: the `waletpass` typo, so delete-wallet now
actually clears the plaintext password (#346), and the downloads path traversal (#267).

The handover note should say this. His read should be "they tightened things", not "here
is a pile".

---

## The 2026-08-20 batch through the gate (#441–#447)

Four things in this batch touch the gate. Three introduce nothing; one is ours and is
fixed.

**★ #438 — a PRE-AUTH CONTENT EXPOSURE, and it is OURS.** With the app lock on, a resume
painted the full chats list for about a second before the lock appeared. Apply the gate's
one question — *does this exposure exist at the baseline?* — and the answer is **no**: at
`0e85a4b8` the resume lock was a plain modal push, which flickered but never showed the
page underneath. **#229 introduced it**, by staging the lock's WebView hidden on the
current page and presenting only once `lock.html` signalled ready. So it is ours, and it
was fixed before handover (#442): a synchronous opaque cover in the lock's own ground
colour, over every page-tree grid and the modal stack, released only when the lock is
really on screen or when auth succeeds. Android's task-switcher snapshot is covered too.
🟡 One residual is UNVERIFIED on device: whether a view added at `OnSleep` reaches that
snapshot at all. `FLAG_SECURE` is the canonical mechanism and is deliberately not used,
because it would also block screenshots — a product decision, not a security one.

**M1 reply-to would add a PEER-CONTROLLED reference to the message body path** (#441) — the
same hostile-parsing family the worklist puts N18 in. ⚠ **It did NOT ship** (#448): the
carrier is held out for the BE cutover, so nothing in the shipped build parses a reply
reference. The gate walk below therefore describes the HELD patch in
`docs/be-cutover-ixian-core-reply-carrier.md`, and it is the review the BE engineer should
be handed with it:

* it is **length-clamped** to `CoreConfig.maxMessageIdSize` before anything keeps it, and
  the declared length is bounded against the remaining buffer BEFORE the allocation;
* the parse sits in a `try` that degrades to "no reply" — **a throw there would reach the
  receive path and lose the whole message**, so failing closed would mean failing lossy;
* an **unknown target fails soft** to a generic quote label: never nothing (which reads as
  a broken render), never a throw;
* it reaches the WebView **hex-encoded** and is used only as a `Map` key. It never reaches
  `innerHTML`, an attribute, a selector, a path or a URL — the quote's visible text comes
  from the shell's own local row, not from the peer payload;
* nothing new lands in a `spixi.*` storage key.

**The add-contact duplicate check** (#443) adds a local detection branch and one echoed
argument. No new sink, no new storage, and it makes the screen send FEWER requests than
before.

**Two new `spixi.*` keys** (#443, N80): `spixi.rating.opens` (a small integer) and
`spixi.rating.lastopen` (a timestamp). Neither is personal, so neither widens MAJOR #4 —
which is the standing question for anything written to that partition.

---

## ★ 2026-08-25 — the app-lock GRACE WINDOW moved. Damir's call (#496 / #484).

**This is a deliberate change to an authentication gate, so it is written up here rather
than left in a DECISIONS row.** The introduced-vs-inherited question does not apply — the
pause lock is entirely ours (#442/#454) — so the honest framing is the second one this
gate uses: *is the exposure smaller, the same, or larger than the design it replaces, and
did the person who owns the product make the call with the cost in front of him?*

### What changed

The five-second no-auth window used to be measured from the last successful
**authentication** (`unlockedDate`). It is now measured from the moment the app went
**away** (`backgroundedDate`).

### Why

Damir, on device: the lock felt *"sketchy, sometimes yes sometimes no"*. That is the old
design seen from outside — a quick app-switch after a minute of ordinary use still asked
for the pattern, while the same switch ten seconds after unlocking did not. Neither clock
is visible to the user, so the behaviour reads as random. Offered as a dial with the
trade-off attached; he chose measure-from-backgrounding.

### What is unchanged

* The window is still **five seconds** and it is still the only thing between a background
  and a prompt. One constant now feeds both branches.
* **Cold start always prompts.** Process death clears the stamp, and the no-stamp path
  falls back to the old measure.
* Any absence **longer than the window** prompts, on every platform.
* `dismissPauseLock` still does **not** touch `unlockedDate` — a grace dismissal is not an
  authentication and must never be recorded as one.

### ⚠ What is given up, stated plainly

**The window can no longer be used up.** Under the old measure, five seconds after
authenticating the user was asked on every background, indefinitely. Under this one, an
app that is never away for longer than the window is never re-asked.

The reason this is acceptable, and it is the whole argument: the app lock guards a phone
that **leaves the user's hands**. An app that was away for two seconds did not leave them,
and an attacker who has the unlocked device in the foreground is already past this gate —
they can read the screen without backgrounding anything. What the window does NOT do is
substitute for the lock: cold start, and every absence past five seconds, still prompt.

This is the same threat model Signal and WhatsApp ship.

### ★★ The audit found a BYPASS in the first cut of this. Read this part.

The paragraph below used to promise that a re-entrant pause hook could not push the clock
forward. **It could — across a resume, not within one.** The stamp was read and cleared at
the top of `OnResume` unconditionally, *including* on the branch where the lock stays up
and is still unauthenticated. Two sequences then opened the app with no password:

* away for hours → the lock stays up → press **Home** → tap Spixi within 5 s → the grace
  test sees a 2-second absence and `dismissPauseLock` pops the lock. `dismissPauseLock`
  performs no authentication of its own; **the grace test IS the gate.**
* worse, because it needs no deliberation: away for hours → the pattern prompt appears →
  **`ConfirmDeviceCredential` is a separate Android Activity**, so presenting it pauses
  Spixi and lays a fresh stamp → the user presses **Back** → resume inside 5 s → in.

Fixed (#500) by restoring the stamp on that branch, so the absence keeps accumulating
until the lock is actually resolved. `markBackgrounded()` is a no-op while the stamp is
non-null, so every pause during the prompt leaves the original leaving edge in place.

⚠ Both halves are pinned now — the within-cycle property AND the across-resume one — and
`docs/f5-checklist-2026-08-25-android.md` §3.6/§3.7 walk the two sequences on hardware.
The lesson is the one this project keeps paying for: a lifecycle callback firing at an edge
nobody was reasoning about. Fifth time (#442, #454, #460, #472, #500).

### The hardening that rides with it

* The stamp is taken at the **first** edge of a background cycle, and it is **restored**
  rather than cleared whenever the lock stays up, so neither a re-entrant pause hook nor a
  second resume can push the clock forward and make an old absence look fresh. **Both**
  properties are pinned.
* A **negative elapsed time is rejected** — a clock moved backwards would otherwise make
  any absence look like it happened in the future and satisfy the window. The same guard
  already protected `ownIntentFresh()`; it now protects both grace tests.
* The two grace tests — the Android pause-lock branch and the older present-the-lock branch
  that iOS, Windows and MacCatalyst take — read **one** answer from **one** constant. They
  were two independently written `5`s, and the second had already been wrong once (#229:
  `ts.Seconds` is the 0-59 component, so 63 seconds away read as 3 and never locked).

### Verification owed

`docs/f5-checklist-2026-08-25-android.md` §3. **Four** rows must never fail: **3.2** (away
10 s → prompt), **3.4** (cold start → prompt), and the two the audit added — **3.6** (cancel
the prompt, then try to get back in) and **3.7** (Home and straight back while the lock is
up). If any fails, this reverts in one line: the fallback expression already contains the
old measure.

### #507–#511 — the lock model, the notification extension, QR (2026-08-22)

⚠ **This row was written LATE — after the batch was built and committed, not while building.**
The gate says the lens is applied WHILE building so the sweep finds nothing. It found two
things worth arguing, which is the argument for not skipping it again.

| Item | file:line | Verdict | Evidence at `0e85a4b8` | Action |
|---|---|---|---|---|
| **`SpixiNotificationServiceExtension` — a NEW ENTRY POINT into our process, named from the manifest** | `Spixi/Platforms/Android/SNotificationServiceExtension.cs` · `AndroidManifest.xml` | ★ **REACH INTRODUCED, MECHANISM INHERITED** | The push payload already reached `handleNotificationReceived` and already fed `fa` into `showLocalNotification` (#495). What is new is WHEN: a BACKGROUND or killed-app push now reaches OUR parsing code, where previously the SDK rendered it natively | **SHIPPED, and the reach is the point of the row.** `fa` comes from the push payload, i.e. off the network. It flows to exactly two places, both pre-existing: `new IXICore.Address(fa)` (throws on malformed → caught, `postOurPushRow` returns false → the caller falls back) and `showLocalNotification`, which puts it in an Intent `Action` + extra that `MainActivity` already reads. A crafted `fa` can therefore aim the notification's tap at an arbitrary address — **the same exposure the local path has carried since NOTIF-4**, now reachable from a cold push. ⚠ Worth one line to the BE engineer: the payload's `fa` is trusted, and the group case already needs a payload change |
| **`Preferences` key `lockIdleMinutes`** | `Spixi/Platforms/Windows/SDesktopIdle.cs` | **INTRODUCED**, no exposure | — | ★ **NOT a `spixi.*` key.** MAUI Essentials `Preferences` is native app storage, not the `file://` localStorage partition mini-app code may share, so **MAJOR #4 does not apply**. Value is an int, read-only to the watcher, clamped 1 min – 24 h so an edited preference cannot make the app lock on every poll |
| **`GetLastInputInfo` — a NEW P/Invoke (`user32.dll`)** | `SDesktopIdle.cs` | **INTRODUCED**, no exposure | — | Reads a tick count for the last input event in this Windows session. **No content, no window titles, no keystrokes** — a single integer. Nothing leaves the device; it is compared against a threshold and discarded. Same `[DllImport("user32.dll")]` shape `SSystemAlert.cs` already ships |
| **A 30-second background poll for the life of the process** | `SDesktopIdle.loop()` | **INTRODUCED**, no exposure | — | Windows only. Two integer reads per tick; the try sits INSIDE the loop so one bad poll cannot end the watcher |
| **`clearPaymentActivityDone` / `clearAppsDone` — two NEW C# → WebView pushes** | `HomePage.xaml.cs` | **INTRODUCED**, no exposure | The push channel is legacy; these two verbs are ours | **They carry NO ARGUMENTS.** Each is a bare signal that a synchronous flush finished. Nothing peer-controlled, nothing persisted, no sink. Recorded in the ARCHITECTURE §4 push contract beside `clearChatsDone`, which they mirror |
| **New log lines: the idle lock, the sweep, the push decision** | `SDesktopIdle.cs` · `App.xaml.cs` (`sweep/uncover`, `sweep/relock`, `idle/locking`) · `SPushService.decidePush` | **INTRODUCED** | The baseline had none of these paths | **Reviewed and kept.** `ixian.log` is DevPage-rendered and shareable, so this matters. The idle line carries **durations only**. The sweep lines are fixed strings. ⚠ **One carries an identifier**: `push <notificationId> already decided` logs OneSignal's own notification id — an opaque SDK id, not an address, not message content, not a key. Kept because it is the only evidence that both lanes fired for one notification. No line carries a password, key, seed, address or message text |
| **`Config.maxLogCount` 1 → 5** | `Spixi/Meta/Config.cs` | ★ **INTRODUCED — an exposure INCREASE, deliberately** | Baseline kept one previous session | **Damir's call, taken with the reason stated.** Five times the retained history in a log that DevPage can share. Nothing new is *written*; what changes is how much survives. Carries a `RELEASE BLOCKER — REDUCE TO 1 BEFORE LAUNCH` marker and a smoke pin that fails if the marker is deleted. ⚠ **This is the row to re-check before handover** |
| The z-band (scrim 40 / message 42 / sheet 44), the lift, `pointer-events:none` | `overlay.css`, `message-menu.css/js`, `tokens.css` | No exposure | Presentation only | None. The lifted row is dead to hit-testing, so it cannot capture input intended for the scrim |
| QR: 12 px card padding dropped; hub reveal | `settings-shell.js/css`, `chat-info.css` | No exposure | Presentation only | ★ The **4-module ISO quiet zone is untouched and pinned**. This is a wallet address; a misread is the worst class of defect in the app, and the pin exists so a later "trim the white a bit more" cannot reach it |
| Credit strings in 12 locale drafts | `src/strings/draft/*.json` | No exposure | Two short UI labels | None |

**#507–#511 adds no `ixian:` verb, no `spixi.*` localStorage key, no WebView setting, no
`innerHTML`/`eval` sink and no network fetch.** It adds **one Android entry point**, **one
native `Preferences` key**, **one `user32` P/Invoke**, **two argument-free C# → WebView
pushes**, and **several log lines**, all argued above.

🟡 **Two carried to the BE engineer:** the push payload's `fa` is trusted end-to-end (and the
group case needs a payload change anyway — the same row this family has carried since #493);
and `maxLogCount` must return to 1 before launch.

---

## Batch #517–#519 (2026-08-23, the scroll/sounds/press round) — the sweep, applied WHILE building

| Item | file:line | Verdict | Evidence at `0e85a4b8` | Action |
|---|---|---|---|---|
| **New log lines: the sound belt** | `SSounds.cs` (`SND play: <asset>`) · `Node.cs` (`SND-1 … type=<enum>`, `SND notif posted: call\|message alert=<bool>`) · `VoIP/VoIPManager.cs` (`SND call-tone: dialing/ringing/busy/error`) | **INTRODUCED** | The baseline logged no audio triggers | **Reviewed and kept.** Every value is a compile-time constant, an enum name or a bool — **no address, no nickname, no message text, no id**. The message-effect lines sit AFTER the mute/preference gates, so a muted app logs nothing about the chat that stayed silent. `SSounds.play` is `public static` and logs its argument, so the no-PII property holds by caller discipline — its only callers are the two message effects, and a pin holds the caller count |
| **Deleted: the SND-2 chime + two assets** | `SpixiTransactionInclusionCallbacks.cs` · `Resources/Raw/sounds/tx_*.mp3` | Removal — exposure DECREASE | The chime itself post-dates the fork | None. Code and assets removed; nothing new reachable |
| The press-layer CSS, the paint delay, the wallet reserve | `base.css` · `pressable.js` · `wallet-shell.js` | No exposure | Presentation only | No verb, no storage key, no sink, no fetch. The press delay changes WHEN a row paints, never what a tap does |

**#517–#519 adds no `ixian:` verb, no `spixi.*` localStorage key, no WebView setting, no
HTML sink and no network fetch.** It adds **seven log lines** (argued above) and removes an
audio path.

---

## Batch #522–#529 (2026-08-23, THE WALLET PASS) — the sweep, applied WHILE building

★ This batch touches MONEY. Every row below was asked at design time; the delta also gets
its own section in `docs/security-review-for-be-engineer.md` for the human BE review
(#232/#523: the delta ships to users only after he sees it).

| Item | file:line | Verdict | Evidence at `0e85a4b8` | Action |
|---|---|---|---|---|
| **NEW verb `ixian:signSend:<addr>:<amount>`** (HomePage + SingleChatPage) | `SPayments.handleSignSend` | **INTRODUCED — the W5 hand-off** | Baseline money entry = the native pages; the WebView never proposed a payment | **The wall holds by construction.** The verb is a PROPOSAL. C# re-validates the address (`ExtendedAddress.Validate`), re-parses the amount (`IxiNumber`), computes its OWN fee, re-checks the balance, then shows a NATIVE `DisplayAlert` built ONLY from those values — never from WebView text — and signs through the SAME sanctioned path the legacy pages use (`Node.sendTransactionFrom`). A confirm-before-sign ORDER pin + a mutation run hold it. Re-entry is latched (one confirm app-wide). A malicious WebView can at worst put a proposal in front of the user's eyes |
| **NEW verb `ixian:payRequest:<msgIdHex>`** (SingleChatPage) | `SPayments.handlePayRequest` | **INTRODUCED** | Baseline paid a request through WalletContactRequestPage — same sign site, NO native confirm, NO null guard | The extracted legacy body PLUS: the native confirm, the PA1 auth step, the `transaction == null` guard (the legacy page NREs there — inherited row for BE), a settled-state re-check after the await, and the same re-entry latch. The message id resolves against the friend's OWN message list; an unknown id answers `cancel` and touches nothing |
| **NEW verb `ixian:feeQuery:<addr>:<amount>`** (both pages) | `SPayments.handleFeeQuery` | **INTRODUCED** | Legacy computed fees native-side only | Read-only: validate → estimate → push. Nothing broadcast, nothing stored. The estimate signs a DISCARDED throwaway tx — the identical mechanism `Node.calculateTransactionFee` has always used (baseline `WalletSend2Page:52`) |
| **NEW verb `ixian:sendrequest:` on SingleChatPage** | `onSendRequestFromChat` | **INTRODUCED (the W8 grammar, second host)** | The verb exists on HomePage since #268 | PEER-SCOPED: the address must equal the open conversation's peer (Ordinal string compare, fail closed + log) + the approved/Normal/!bot guard mirrored from HomePage. A request is a chat message; nothing signed |
| **NEW verb `ixian:sendScan`** (HomePage) | `quickScanForSend` | **INTRODUCED** | Baseline scan → WalletSendPage | Opens the SAME native ScanPage; the decoded string goes back to the shell verbatim as a push. The shell only fills an input with it — no sink, no eval, textContent/value only |
| **NEW verb `ixian:paymentAuth:on\|off`** (SettingsPage) | SettingsPage `onNavigating` | **INTRODUCED (PA1)** | No payment auth at baseline | Sets ONE bool preference. Turning it ON tightens security; turning it OFF needs the app in hand. No data crosses |
| **NEW pushes: `setSendQuote` · `signSendResult` · `payRequestResult` · `quickScanResult` · `setPaymentAuth` · `setCaps`(home)** | shells `home/chat/settings` | **INTRODUCED** | Push channel is legacy | Arguments: numbers as strings, status enums, a scanned string, a bool, a caps list. `signSendResult`/`payRequestResult` MAY carry a C#-LOCALIZED error sentence (the legacy alert bodies) — rendered `textContent`-only in the sheet's error line. No address book data, no keys, no message text. All handlers defined in every shell their page reaches (#258) |
| **NEW preference `paymentauth`** | `SPayments.PAYMENT_AUTH_PREF` | **INTRODUCED** | — | Native `Preferences`, never localStorage, never the WebView. A bool |
| **Biometric use on the money path** | `SPayments.confirmAndAuth` | **INTRODUCED (PA1)** | Baseline used Plugin.Fingerprint for the app lock only | Same plugin, same config shape as LockPage:630. FAIL-CLOSED on auth errors while the setting is on; WinUI skip mirrors the lock. No fingerprint data is readable by the app (OS API) |
| **New log lines** | `SPayments.cs` (4× `Logging.error/warn`) · `SingleChatPage` (2× warn) | **INTRODUCED** | — | Reviewed: exception messages + fixed strings. **No amount, no address, no key reaches the log.** The peer-scope warning logs a fixed sentence, not the mismatched address |
| **Receive inversion + address sheet** | `wallet-receive.js` | No exposure | Presentation only | The QR still encodes ONLY `address:ixi` (#303 pinned); Share carries the bare address structurally |
| **Cancel request = the existing msgDelete path** | `chat.html confirmCancelRequest` | No NEW exposure | `msgDelete` is a baseline protocol verb, receiver-honored | No new verb. The confirm modal states the both-ends removal honestly. The blanked-request ghost guard renders nothing from a blanked row |
| **Ghost guard input** | `chat.html addPaymentRequest` | No exposure | — | A skip, not a sink — nothing rendered, nothing stored |

**#522–#529 adds six `ixian:` verbs, six pushes, one native preference and six log lines —
argued above. It adds NO `spixi.*` localStorage key, NO WebView setting, NO HTML sink and
NO network fetch.** The money wall (compose in the WebView, C# re-parses + native confirm +
signs) is stronger than the baseline's: the legacy confirm never showed the destination
address (`wallet_send_2.html:133` unwritten), the new one always does.

🟡 **Carried to the BE engineer (inherited, untouched):** `WalletContactRequestPage:148`
NRE class (no null guard on a failed broadcast) · `requestFundsResponse` state mutation
gated on an open chat page (`StreamProcessor.cs:234`) · the legacy pages themselves until
the §5 repoint retires them.

---

## Batch W (2026-08-24 overnight, #536) — the wallet F5 follow-ups

No new `ixian:` verb. No new push (one new status VALUE on an existing push, `gone` — row
below). No new preference. ONE fixed-text log line (row below). The batch re-routes two
EXISTING verbs, adds one validation gate on scanned data and moves presentation.

| Item | file:line | Verdict | Evidence | Action |
|---|---|---|---|---|
| **Hero scan now emits `ixian:sendScan`** (was `ixian:quickscan`) | `home.html` hero `onScan` · `HomePage.quickScanForSend` | No NEW exposure — an existing verb, a second caller | `ixian:sendScan` introduced #523 (row above): same native ScanPage, decoded string returned verbatim as a push | The hero is PAYMENT intent; the payload lands in the compose's address input (value only) or — W-f — picks a roster contact by EXACT address equality (`c.address === scannedAddr`). Never a prefix match, never a name match. Old exe (no caps): the legacy `ixian:quickscan` route, unchanged |
| **Request-in Pay → the review sheet → `ixian:payRequest:<id>`** | `chat.html openPayRequestReview` · `SPayments.handlePayRequest` | No NEW exposure — the same verb, one more explicit step BEFORE it | Baseline (#523): Pay emitted the verb directly | The sheet is a PROPOSAL surface: it shows the amount C# pushed for the card and a fee it asked for through `ixian:feeQuery` (read-only). Confirm emits the unchanged verb; C# still re-resolves the message, re-parses the amount, shows the NATIVE confirm (+ PA1 auth) and signs. The shell never sees a key. The sheet opens only for a purely numeric card amount (`/^\d+(\.\d+)?$/`); anything else keeps the direct verb |
| **`setSendQuote` push routed to the review sheet** when no compose is open | `chat.html setSendQuote` | No exposure | Same push, same argument shape | Echo-matched: a quote for another (address, amount) pair is dropped in the sheet exactly as in the compose |
| **Pending request-in Details DROPPED** | `chat.html buildPaymentRow` (`onDetails: null` under the cap) | REMOVES a route | The legacy `WalletContactRequestPage` (its :148 NRE class + the Decline #526 removed) is no longer reachable from the card | Old exe keeps the native view |
| **"Confirm payments" HIDDEN on WinUI** (cap + seed withheld) | `SettingsPage:134-152` | REMOVES a no-op control | `SPayments.confirmAndAuth:381` returns before the biometric gate on WinUI | The preference is untouched; a Windows user who set it ON on another platform keeps the value — it is simply never presented where it cannot act |
| **`setSendRecipient` free fn** | `wallet-send.js` | No exposure | — | Programmatic pick of a roster object the shell already holds; seeds the amount through the same input handler the keyboard uses (sanitized) |
| **`openPaymentReview` export** | `wallet-send.js` | No exposure | The compose's own review sheet, extracted | Same DOM, same latch (#72④), same in-flight lock (audit C1). `textContent` only |
| **Shared row `contact-row.js`** · `contact-row.css` · the W-h gate | components / smoke | No exposure | Presentation + a build-time gate | `textContent` only; the badge label is a string constant |
| **Sounds #535** | `Resources/Raw/sounds/message_*.mp3` | No exposure | Same two asset paths | CC0 audio, same licence row as #497/#521 |

| **`payRequestResult` gains a status value: `gone`** (loop r1 A-1) | `SPayments.handlePayRequest` (3×) · `SingleChatPage.onPayRequest` (1×) | INTRODUCED — a new VALUE on an existing push, not a new push | Baseline: "cancel" for six reasons | The five UNPAYABLE cases (not found / own / settled, zero, settled mid-confirm, group/bot) now say so; "cancel" is only the user backing out. The shell maps `gone` to a fixed localized sentence; the message slot stays empty. An old shell treats an unknown status as `fail` (its `else` branch) — never as success |
| **`quickScanForSend` VALIDATES before it pushes** (loop r1 B-4) | `HomePage.quickScanForSend` | REMOVES reach — external data no longer enters the money compose unvalidated | Baseline (#523) forwarded `e.Value` verbatim | `ExtendedAddress.Validate` on the part before the first `:`; a failure logs a FIXED sentence (no payload in the log) and shows the legacy invalid-address alert |
| **New log line** | `HomePage.quickScanForSend` (`Logging.warn`, fixed text) | INTRODUCED | — | "Scanned payload is not an Ixian address" — no payload, no address |
| **Sheet teardown hooks `_closeReview` / `closePayReview`** | `wallet-send.js`, `chat.html`, `home.html` | No exposure | — | Close an orphaned overlay when its screen goes; nothing crosses |

**Batch W adds NO `ixian:` verb, NO new push (one new status VALUE on `payRequestResult`),
NO `spixi.*` localStorage key, NO WebView setting, NO HTML sink, NO network fetch and ONE
fixed-text log line.** It removes one legacy route from the card, hides one no-op control
and adds one validation gate on scanned data.

---

## Batch A (2026-08-24 overnight, #539–#541) — info · groups · the remove-contact data bug

| Item | file:line | Verdict | Evidence | Action |
|---|---|---|---|---|
| **NEW verb `ixian:removehistory:<addr>`** (HomePage) | `HomePage.onRemoveHistoryFor` → `SContacts.removeHistory` | **INTRODUCED — address-scoped twin of ContactDetails' `ixian:removehistory`** | Baseline: the chats-list delete reached NO verb (the A6 bug) | `FriendList.getFriend(new Address(addr))` — an unknown/malformed address is a no-op inside try/catch (the A-4 rule); the body is `friend.deleteHistory()` — the legacy ContactDetails body. Result pushed |
| **NEW verb `ixian:removecontact:<addr>:<leave>`** (HomePage) | `HomePage.onRemoveContactFor` → `SContacts.removeContact` | **INTRODUCED — DESTRUCTIVE, address-scoped** | Baseline: nothing | Placed ABOVE the Contains() branches (#216/#393). `leave` is a literal `1`/`0` token (anything else = 0). Bots/groups take the #248 leave body (result `left`); people take `FriendList.removeFriend` — Core's group-member REFUSAL stands; with `leave=1` C# leaves each shared group first (the user ticked them behind an additional confirm that states their chats go too). The removed contact's OPEN conversation (an overlay, #225) is closed through the page's own overlay-aware `popPageAsync` (loop r1: `removeDetailContent` closed nothing). Result pushed with the blocking groups on refusal |
| **NEW verb `ixian:sharedGroups:<addr>`** (HomePage) · **`ixian:sharedGroups`** (ContactDetails) | `HomePage.onSharedGroupsFor` · `ContactDetails` | **INTRODUCED — read-only** | — | Enumerates `FriendList.friends` under the same lock Core uses; pushes name/address pairs, each arg transport-escaped, rendered via textContent |
| **NEW verb `ixian:openChat:<addr>`** (ContactDetails) | `ContactDetails` | **INTRODUCED — navigation** | The arg-less `ixian:chat` existed | Only for a KNOWN friend (`FriendList.getFriend != null`); pops the overlay then `HomePage.onChat` — the existing route |
| **NEW pushes `removeContactResult(addr, status, pairs…)` · `removeHistoryResult(addr, status)` · `setSharedGroups(addr, pairs…)`** | shells `home` / `contact_details` | **INTRODUCED** | — | Status enums + name/address pairs. The shell un-tombstones on a refusal (a vanished row with the data on disk was the lie). No HTML sink; textContent only |
| **New log lines** | `SContacts.cs` (2× warn) · `HomePage` (3× error) · `ContactDetails` (2× warn) | INTRODUCED | — | FIXED TEXT ONLY (loop r1): no `ex.Message` on any handler whose token is peer-supplied — Core's `Address` ctor formats the base58 into its exception text. No address, no name reaches the log |
| **The bridge OUTBOX (loop r1)** | `src/bridge/native.js createNativeBridge` | No exposure — transport ORDER | The MAUI WebView drops the first of two same-turn `location.href` sets (launch.html #N75) | Every shell's default sink serializes sends one macrotask apart. Nothing new crosses; commands that used to be DROPPED now arrive (a destructive verb landing where it was silently lost is the honest outcome — every one still sits behind the shell's confirm steps) |
| **`.c-modal:not([data-open])` pointer-dead (loop r1)** | `overlay.css` | Closes a re-entry | A closing modal's action re-fired | Same rule sheets have had since #46 MAJOR-3 |
| **A1: bot member identities shown** | `chat-info.js` (bot rows/sheet) | REVERSES the #348 MAJOR-5 masking for BOT rooms only | Legacy `chat.js addContact` showed nick + avatar for every pushed member; C# never masked bot rows (`loadContacts` masks `type == Group` only) | Nothing new crosses the bridge — the shell already held the data; blind GROUPS keep the mask. Recorded as Damir's call (#541) |
| **A7 / A8 / A9 / A3** | components + CSS | No exposure | Presentation | — |

**Batch A adds four `ixian:` verbs (one destructive, address-scoped, above the Contains block), three pushes, no `spixi.*` localStorage key, no WebView setting, no HTML sink, no network fetch, and nine fixed-text log lines.** The destructive verb runs the SAME body the legacy ContactDetails page has always run, behind the shell's two confirm steps.

---

## Batch B (2026-08-24 overnight, #543–#544) — requests lifecycle

| Item | file:line | Verdict | Evidence | Action |
|---|---|---|---|---|
| **NEW verb `ixian:undorequest:<addr>`** (HomePage) | `HomePage.onUndoRequestFor` | **INTRODUCED — DESTRUCTIVE (removeFriend), address-scoped twin of SingleChatPage's page-scoped `ixian:undorequest`** | Baseline: deleting the "Request sent" row reached nothing | Above the Contains() block. GUARDED: 1:1 only, `!approved` AND the last message is MY `requestAdd` — the exact shape the row is built from; otherwise `fail`. No notification to the peer (none exists — RC1). Result pushed; fixed-text log |
| **NEW context action `ixian:contextAction:cancelInvite:<id>`** (SingleChatPage) | the `contextAction` switch | **INTRODUCED — a REMOTE delete (sendMsgDelete) without the local half** | The plain `deleteMessage` action does both halves | GUARDED to an OWN `appSession` message in a non-bot chat: a crafted id for any other message answers `fail` and sends nothing. The sender's message stays on disk; the "Canceled" state is shell-side metadata |
| **NEW pushes `undoRequestResult(addr, status)` · `cancelInviteResult(id, status)`** | shells `home` / `chat` | INTRODUCED | — | Status enums only |
| **NEW localStorage key `spixi.app.canceled.<peer>`** | `chat.html` | INTRODUCED — same class as `spixi.app.declined.<peer>` (#214) | — | The user's OWN action metadata (which invites they withdrew); message ids only, no content. SECURITY.md-OK by the same reasoning as the declined set |
| **New log line** | `HomePage.onUndoRequestFor` (1× error, fixed text) | INTRODUCED | — | No token |

**Batch B adds one destructive address-scoped verb (guarded to one message shape), one remote-only context action (guarded to an own app invite), two pushes, one `spixi.*` key of the #214 class, and one fixed-text log line.**

---

## Batch C (2026-08-24 overnight, #545–#548) — account lifecycle + theme splash

| Item | file:line | Verdict | Evidence | Action |
|---|---|---|---|---|
| **`ixian:deletea` = THE FULL WIPE** (SettingsPage) | `SettingsPage.wipeEverything` | CHANGED SCOPE — a destructive verb that now removes MORE (wallet + prefs + WebView keys) | Baseline: delete-account kept the wallet; delete-wallet was a second verb | Same LockPage auth gate, same two-hop dispatch, same `deleteInFlight` latch. The enumeration is in #545; the order (shutdown FIRST) is the F-3 fix. `Preferences.Default.Clear()` removes the plaintext `walletpass` (#346's concern) with everything else |
| **`ixian:delete` (wallet) RETIRED** | `SettingsPage` dispatch | REMOVES a verb's own body | — | An old shell's emit maps to the full wipe behind the same gate — never a half-delete |
| **NEW push `wipeLocalState`** | `settings.html` | INTRODUCED — a REMOVAL of `spixi.*` keys | — | Enumerates keys with the `spixi.` prefix and removes them; never a blanket `clear()`; no data crosses, a count is logged to the dev channel |
| **`warmParkedOverlay` / `parkOnLoad`** | `SpixiContentPage`, `HomePage.warmAccountAfterFirstPaint` | No exposure — presentation lifecycle (#315's own rules) | — | A hidden, loaded SettingsPage in the parked slot — the same object a parked-on-close page is; every #315 guard applies (lock up → nothing; low memory → disposed). The page's own WebView isolation is unchanged (§1/#221) |
| **C4 return hop** | `home.html openContacts`, `contacts-page.js` | No exposure | — | An `ixian:settings` emit on the user's own Back — an existing verb |
| **Night splash resources** | `Platforms/Android/Resources/values-night-v31`, `drawable/spixi_splash_icon_night.xml`, `layout-night/splash_screen.xml` | No exposure | Resource files | — |
| **New log lines** | `SettingsPage.wipeEverything` (9× error, each `"wipe: <step> threw: " + ex`) · `HomePage.warmAccountAfterFirstPaint` (1× info, 1× warn) · `SpixiContentPage` (2× info) | INTRODUCED | — | The wipe's exception texts carry no user data (storage paths at most — the same class the legacy wallet route logged) |

**Batch C retires one verb, widens one destructive verb's scope to "everything" behind the same gate, adds one removal push, no `spixi.*` key, no WebView setting, no HTML sink, no network fetch.**

---

## Batch D (2026-08-24 overnight, #549) — the missed-call notification

| Item | file:line | Verdict | Evidence | Action |
|---|---|---|---|---|
| **Android notification TAG `spixi.call` on call rows; the sweep enumerates active rows** | `Platforms/Android/SPushService.cs` | No exposure — notification presentation | `GetActiveNotifications` (API 23+) | The tag is a fixed string; the sweep reads only `Tag`/`Id` of our own rows. No content crosses; the log line on the pre-M fallback is fixed text |
| **iOS identifier prefix `call-` + enumerated removal** | `Platforms/iOS/SPushService.cs` | No exposure | `GetDeliveredNotifications` | Same |
| **Per-contact call-row cancel on chat open** | `SingleChatPage.onResume` | No exposure | — | The id is CRC32 of the address (the existing scheme); one warn line with the exception message, no address |

**Batch D adds no verb, no push, no key, no fetch, no sink; two fixed-text log lines.**

## The F5 fix batch + Batch E (2026-08-25, #553–#557) — the sweep, applied WHILE building

| Item | file:line | Verdict | Evidence | Action |
|---|---|---|---|---|
| **F5-3 wallet-loaded guards** (EnsureNodeRunning · the mainLoop fetch condition) | `App.xaml.cs` EnsureNodeRunning · `Meta/Node.cs` mainLoop | No exposure — the guards NARROW: code that ran with no wallet now does not run | `IxianHandler.wallets.Count` reads a count, touches no key material | One new fixed-text log line ("no wallet is loaded - the launch flow owns the node"); carries no address, no path |
| **F5-1 VoIP session-check deferral** (accept/reject/end re-check on the main thread) | `Network/StreamProcessor.cs` handleAppRequestAccept/Reject/EndSession | No exposure — reordering of EXISTING handling; no new parse, no new sink | The deferred block runs the same code the sync path ran; `MainThread.BeginInvokeOnMainThread` is the same dispatcher handleAppRequest already used for this session's creation | Three new `[NOTIFDIAG]` log lines, fixed text, no address/session bytes |
| **F5-2 crash diagnostic** (UnhandledExceptionRaiser hook + breadcrumbs) | `Platforms/Android/MainApplication.cs` · `Pages/Contacts/ContactDetails.xaml.cs` · `Pages/Home/HomePage.xaml.cs` | ⚠ REACH, accepted knowingly: the hook logs `args.Exception` VERBATIM into ixian.log — an exception message can carry user data (the Address-ctor class this project already logs around) | ixian.log is DevPage-shareable and `maxLogCount` = 5 (the standing RELEASE BLOCKER row) | Accepted for the diagnostic's life: the crash it hunts is unlogged today, and the stack IS the deliverable. The breadcrumb lines are fixed text + two booleans + the SContacts status word (the fixed ok/left/blocked/fail vocabulary — loop A-7 correction), no address. The hook fires only for exceptions with managed frames (a pure Java-side throw goes to Java's default handler — A-7). 🟡 RETIRE or logSafe-wrap the hook's message once F5-2 is closed — carried on the fix session's plate |
| **Batch E (a) anchored dropdown** | `desktop-anchors.js` anchorSheetToRow + overlay.css `[data-m-anchor]` | No exposure — presentation-only; the #56 overlay grammar, focus trap and money-sheet JS locks untouched | Reads rects, writes inline left/top/width on the OPEN sheet | z-order re-verified: no new z-index anywhere (pinned) |
| **Batch E (b)/(c) scrim + highlight retune** | tokens.css `--surface-scrim-deep` · overlay.css | No exposure — colors | — | — |
| **Batch E (d) Account QR reuse** | settings-shell.js · settings.html | No exposure — REMOVES a surface (the hub's second QR construction); the sheet it opens is the SHIPPED #527 surface, unchanged | `openAddressSheet` renders the address the hub already renders in its chip | No new verb, no new key, no new fetch |

**The batch adds no verb, no spixi.* key, no WebView setting, no HTML sink, no network fetch. New log lines: 1 (F5-3) + 3 (F5-1, `[NOTIFDIAG]`) + 7 breadcrumbs + 1 hook line (`[CRASHDIAG]` family) — all fixed text except the F5-2 hook's exception body, accepted above with its retirement condition.**

### The same-day fold-ins (#560–#562), through the gate

| Item | file:line | Verdict | Evidence | Action |
|---|---|---|---|---|
| **#560 money-list parity + sticky CTA** | wallet-send.css · wallet-receive.css · home.html (takeover padding) | No exposure — CSS only | — | — |
| **#561 swipe: desktop gate + settle-then-fire** | chats-swipe.js | No exposure — gesture presentation; the fired ACTIONS are unchanged | The 280 ms deferral delays the SAME onAction; no new action | — |
| **#562 hide request** | chats-row-menu.js · chat.html · home.html | ⚠ ONE new localStorage key family: `spixi.hidereq.<addr>` — ADDRESS-BEARING key name; value = the hide time (un-armed) or {ts, unread} JSON (the armed durable tombstone). Same class as the shipped `spixi.draft.<addr>`/`spixi.exdel.<addr>` (MAJOR #4 partition premise applies to the whole family; no message content, no secret) | The key is written by the chat shell, consumed and REMOVED by home.html; sends NO verb (a REMOVED send — the FE stops calling `ixian:undorequest` from two surfaces; the C# verb remains for the incoming Decline) | Rides the MAJOR #4 mini-app-partition row like its siblings; nothing new to fix before handover |

**No new verb, no new fetch, no new sink; one new address-bearing localStorage key in an existing accepted family; two REMOVED verb emissions.**

### The walk-day fixes (#564–#565), through the gate

| Item | file:line | Verdict | Evidence | Action |
|---|---|---|---|---|
| **#564 restore-alert strings + fallbacks** | 13 × `Resources/Raw/lang/*.txt` · LaunchPage alert sites | No exposure — fixed text | — | — |
| **#565 backup separator + restore hardening** | BackupPage (zip entry names) · LaunchPage (normalizer + exists-guards) | No exposure — same files, same paths, C# names every path itself (no WebView-supplied names) | The normalizer only rehomes files INSIDE the tmp extraction dir whose names carry a backslash; `Path.GetFileName` strips any directory part first | One new fixed-text warn line ("the backup carries NO Acc tree") — no address, no filename |

### The #567 bot-leave mitigation, through the gate

| Item | file:line | Verdict | Evidence | Action |
|---|---|---|---|---|
| **#567 one leave grammar (sendLeave → immediate removeFriend, 4 sites)** | SContacts.cs leaveGroup · ContactDetails.xaml.cs (ixian:leave + onRemove) · SingleChatPage.xaml.cs (ixian:leave) | No exposure — behavior-order change on EXISTING calls; no new verb, no key, no sink, no fetch. The existing [CRASHDIAG] breadcrumbs carry no address (bot= flag only). Removal now happens BEFORE the server acknowledges — a lost `sendLeave` leaves the server thinking membership persists, which is the SAME residual the baseline crash produced (sendBye never ran); net server-knowledge exposure is unchanged or better. | Mutation-proven pins #567 ①–④ | BE §1e-6 restores the acknowledged grammar |

**#568 (queued, not built): the planned Win32 open-dialog fallback keeps the gate lens — the path comes from the OS dialog, never from the WebView; log line prints the exception only.**

### The walk-day fix batch (#576–#583), AS BUILT

| Item | file:line | Verdict | Evidence | Action |
|---|---|---|---|---|
| **#576 Win32 picker fallback** | `Platforms/Windows/SFilePicker.cs` | No new exposure — and it REMOVES one class of surprise. The chosen path comes from the OS common dialog, never from the WebView; `OFN_NOCHANGEDIR` stops the dialog moving the process working directory; `OFN_FILEMUSTEXIST`/`OFN_PATHMUSTEXIST` mean the path names a real file. The media filter deliberately does NOT widen to All-files, so the fallback cannot hand an avatar consumer a file the picker it replaces could not. | The pre-declared #568 row promised exactly this shape. P/Invoke only — **no new NuGet** (#495). | 3 new log lines, all fixed text plus one BOOLEAN (`elevated=`), one Win32 error CODE, and one exception TYPE. ⚠ The open-failure line logs `ex.GetType().Name`, never `ex.Message` — an IOException embeds the full local path and ixian.log is DevPage-shareable. |
| **#577 Android application context** | `Platforms/Android/SPlatformUtils.cs` · `SSpixiPermissions.cs` · `SAudioRecorder.cs` · `SAudioPlayer.cs` | No exposure — the SAME calls, on a context that exists. `Platform.AppContext` is the process-wide application context (the lane `SPushService` already used); permission checks, `GetSystemService` and `Assets` all accept it. No new permission is requested, and the request path still needs an Activity. | The failure was a NULL dereference, not a privilege question. | 1 new fixed-text warn line (no Activity to request on). No address, no filename. |
| **#578 outgoing-request unread** | `Pages/Home/HomePage.xaml.cs` · `Utils/SpixiContentPage.cs` · `Pages/Contacts/ContactNewPage.xaml.cs` | No exposure — a COUNT is restored to what it was. No verb, no key, no sink, no fetch. The heal only ever writes 0 over a value its own predicate proves came from the local marker. | The marker message itself is unchanged; only the counter it incidentally raised is put back. | 1 new fixed-text info line. No address. |
| **#579 pressed-row lift** | `chats-row-menu.js` · `chats-shell.js` · `message-menu.css` | No exposure — presentation only. The #56 overlay grammar, the focus trap and the money-sheet JS locks are untouched; no new z-index (it reuses `--z-42`, the #506② band). The lift state is module-scoped, not a `spixi.*` key. | z-order re-verified: the lift clears the z-40 scrim and stays under the z-44 sheet. | — |
| **#580 declined-call marker** | `VoIP/VoIPManager.cs` · `SingleChatPage.xaml.cs` · `HomePage.xaml.cs` · 13 × lang files | ⚠ ONE new value written into a stored message body: the fixed ASCII token `-1`. It is never transmitted (`rejectCall` sends only the session id), never rendered (C# composes the label), and carries no user data. | The body of a non-answered call was previously empty; this replaces empty with a constant on the local-decline path only. | No new verb, no new key. 1 new localized string ×13. |
| **#581 tip truncation + reaction floor** | `tip-sheet.js/.css` · `reactions.js` | ⚠ A PRIVACY IMPROVEMENT, not a cost: the tip sheet stops rendering the peer's full base58 at the payment confirm moment (#211 canon). The reaction floor is a measured `min-width` — presentation only, no new sink. | The truncation is display-only; the address itself is unchanged everywhere it is copyable. | — |
| **#582 the address leaves the hub** | `settings-shell.js` · `wallet-receive.js/.css` | ⚠ A PRIVACY IMPROVEMENT: the Account hub no longer renders the user's address AT REST. It is shown only when the sheet is opened deliberately — one fewer surface to shoulder-surf, and one fewer place a screenshot leaks it. No second QR construction remains to drift against the sheet (#149③, retired structurally). | `openAddressSheet` is the SHIPPED #527 surface, unchanged in what it discloses. | No new verb, no new `spixi.*` key, no new fetch. |
| **#583 stale-call gate + restore split** | `Network/StreamProcessor.cs` · `Pages/Launch/LaunchPage.xaml.cs` · `HomePage.xaml.cs` | ⚠★ **A REAL EXPOSURE FIXED, and it is ours to claim**: the restore used to write the decrypted zip OVER the staged envelope. That was already true at the baseline shape, but the batch adds a scratch file — so the batch also adds the sweep that DELETES an orphaned `wallet.ixi.tmp.zip` (a DECRYPTED account archive holding the plaintext `Acc` tree, `account.ixi` and `avatar.jpg`) left by a killed process. Without the sweep the new scratch file would be a new residue; with it, both the new file and any orphan are cleaned on the next attempt. The stale-call notification goes through `SNotificationPrefs.shouldNotify`, so a muted contact or a global switch-off is honoured. | The `[RESTOREDIAG]` capture prints COUNTS and one boolean only — no address, no nickname, no filename — and is bounded to the boot window plus empty-roster runs. | Net: one residue class REMOVED. 3 new fixed-text log lines. |

**The batch adds no `ixian:` verb, no `spixi.*` localStorage key, no WebView setting, no
HTML sink and no network fetch. It REMOVES two disclosure surfaces (the resting hub
address; the full base58 on the tip sheet) and one on-disk residue class (the orphaned
decrypted account archive). New log lines: 8, all fixed text plus one boolean, one Win32
error code, one exception type name and three counts.**

⚠ The **F5-2 hook's verbatim exception log** retirement condition is UNCHANGED and still
open — F5-2 has not closed, so the hook and its log stay exactly as the gate row records
them.

### The walk-day TRIAGE fixes (#584–#588), AS BUILT

| Item | file:line | Verdict | Evidence | Action |
|---|---|---|---|---|
| **#584 contacts re-arm** | `Meta/Node.cs` preStart | No exposure — it re-reads a tree the app already owns, from the path it already read it on. The re-arm is gated on an EMPTY list, so it cannot discard data a live page is holding. | `FriendList.contactsLoaded` is a public static field; Ixian-Core is untouched. | 1 new log line: `[RESTOREDIAG] preStart: contacts read, friends={n}` — a COUNT, no address, no filename. |
| **#585 stale-page removal** | `Pages/Settings/SettingsPage.xaml.cs` goToWelcome | ⚠★ **A PRIVACY IMPROVEMENT and it is ours to claim.** The wiped account's HomePage was left in the navigation stack, undisposed, with its WebView document live — nickname, avatar, chat rows and balance of a DELETED account, reachable by pressing back twice. Both are closed: the pages are removed AND disposed (`Dispose` sets `webView.Source = null` and disconnects the handler). | Damir's log: `LaunchPage back: view=welcome` then HomePage's own `loadChats` 10 ms later. | 2 new fixed-text log lines + one count. |
| **#585 back belt** | `Pages/Launch/LaunchPage.xaml.cs` | No exposure — navigation only. Gated on `NavigationStack.Count > 1` so the ROOT launch page still exits the app. | — | 1 new fixed-text line. |
| **#585 mini-app wipe** | `MiniApps/MiniAppManager.cs` removeAllApps | ⚠★ **A REAL RESIDUE CLASS REMOVED.** A wiped device kept every installed mini app, and a create or restore inherited them — third-party code surviving a "delete all data". ⚠ RESIDUAL, INHERITED: the delete path builds its target with `Path.Combine(appsPath, app.id)` where `app.id` comes from a downloaded `appinfo.spixi`; `Path.Combine` returns a ROOTED second argument verbatim. The sweep now enumerates real subdirectories of `appsPath`, so THIS caller cannot be steered — but `remove(app_id)` (pre-existing, `:334`) still can. **BE row owed** (`security-review-for-be-engineer.md`): validate `app.id` at both sites with a `GetFullPath().StartsWith(appsPath)` check. | The sweep reads `Directory.EnumerateDirectories(appsPath)` and skips `tmpPath`. | 1 new log line per failed delete — the PATH is app-owned, not user data. |
| **#586 ring gates** | `VoIP/VoIPManager.cs` · `Meta/SNotificationPrefs.cs` | No exposure — it makes the app QUIETER, never louder. `shouldRingForCall` is a new read-only predicate over existing preferences; no new key, no new store. | The gate fails OPEN on a throw, so it can never silence a call by accident. | 3 new fixed-text log lines. No address. |
| **#587 row address** | `chatlist-item.js` · `desktop-anchors.js` | ⚠ A wallet ADDRESS is now a `data-address` attribute on every chat row in the home shell's DOM. That shell already renders the address (truncated) as row text and holds the full address in its JS model, so this discloses nothing new to anything that can read the document — and the mini-app partition premise (MAJOR #4) is about localStorage, not about the shell's own DOM. Presentation only; no new key, no new sink. | The value is used exactly once, by `querySelector` inside the same document. | — |

**The triage batch adds no `ixian:` verb, no `spixi.*` localStorage key, no WebView
setting, no HTML sink and no network fetch. It REMOVES one residue class (installed
mini apps surviving a wipe) and one disclosure surface (the deleted account's live
WebView document). New log lines: 8, all fixed text plus counts. One BE row is owed
for the pre-existing `app.id` path-traversal at `MiniAppManager.remove`.**


---

## #589 / #590 — the queued FE work + its #46 loop (2026-08-26)

Written AS BUILT, per the CLAUDE.md rule.

**One new `spixi.*` storage key: `spixi.pane.account`.** Value is the literal `'1'`.
It carries no address, no nickname, no message text and no timestamp — the same shape
`spixi.settings.view` was ruled acceptable at (#254). It says one thing: the Account
pane is currently on screen. Written by `settings.html`, read by `home.html`, both on
the shared `file://` partition that MAJOR #4 describes, and a mini app reading it learns
only that the user has a settings pane open. **Not an introduced exposure.**

⚠ The key it REPLACED would have been worse and is worth recording: the first cut used
the existing `spixi.landtab` hand-off, which is consumed on read — that is a shared
single slot two documents race for, and racing on a slot is how state ends up applied to
the wrong surface. The durable flag has no reader that mutates it.

**No new verb.** No `ixian:` command was added, changed or removed. The bridge stays
frozen.

**One new C# entry point: `SNotificationPrefs.migrateSenderNameOptOut()`**, called from
`App.OnStart`. It writes ONE preference back to its shipped default and reads nothing
else. It is privacy-INCREASING by construction: the preference it clears is the one that
puts a counterparty's nickname into a lock-screen notification. It touches no wallet, no
key material and no message content, and it cannot throw out of `OnStart`.

**One new log line**, fixed text, no interpolation of user data:
`"SNotificationPrefs: sender-name preference returned to the default (#589 — its control was removed)"`.

**One control REMOVED from the UI** ("Show sender name"). Its verb and preference remain,
so nothing downstream changes shape. ⚠ 🟡 **Damir owes one answer**: was that switch ever
in a build a real user ran? If not, the migration is a permanent one-shot mutation of
preference state for nobody, and deleting it is the cleaner end state.

**No new HTML sink and no new network fetch.** The address sheet re-layout, the lift, the
menu placement and the predicates are all `textContent`, class names and CSS.

**A predicate that guards a blind group room was RAISED, not lowered.** `isPseudoAddressNick`
went from a 30-character floor to 40. Raising a floor can only match fewer strings, so the
question is whether anything it must catch lives in the 30-to-40 window. Measured against
Ixian-Core `097341a`: v0 addresses encode to 48 or 49 characters and v1/v2 to exactly 65,
and both pseudo-key forms C# builds are the address plus at most one `x`. **Nothing exists
in that window.** Pinned with a 48-character fixture — the shortest real length — so the
floor cannot later be raised into the guard without a red test.

---

## #591 / #592 — the contact/chat details redesign (2026-08-26)

⚠ **THE #589 SECTION ABOVE SAYS "No new verb." THAT IS TRUE OF #589 AND NOT OF THIS
BATCH** — read them together, and read this line first.

**ONE NEW VERB: `ixian:call` on `ContactDetails`.** The verb itself is not new to the app
(`SingleChatPage` has handled it since the call surface landed, #270); what is new is that
the CONTACT DETAILS document can now reach it. That is new reach for that WebView, so it
is written here rather than assumed.

What it can do: `VoIPManager.initiateCall(friend)` for the ONE friend this page was
constructed with. It cannot name a target — there is no address argument, and `friend` is
the page's own field, set in the constructor. So a compromised details document can start
a call with the contact whose details are open and with nobody else.

**It is gated twice, and the audit is why.** The first cut shipped it unconditionally, and
that was a MAJOR: `initiateCall` runs the full path — permission prompt, a call bubble
written into history, CallPage presented, a dial tone, power locks, 45 seconds of ringing
— on a contact who is not `Approved`, i.e. one who receives nothing. Same class as the
⑪ delivery lie the composer lock exists to prevent. Now:
- the ACTION is revealed only by a `showCallButton` push, sent when
  `!isGroup && codecs > 0 && friend.state == FriendState.Approved`;
- the VERB re-checks the same predicate, because a contact can leave `Approved` between
  the push and the tap.

Both are the gate `SingleChatPage:889` already uses. One rule, two call sites, no drift.

**No new `spixi.*` storage key. No new WebView setting. No new HTML sink. No new network
fetch** — and the cover is the point worth stating: it is a decorative band, and it is
DERIVED, never fetched. A blurred crop of the photo the page already renders, over the
identity gradient the fallback avatar already computes. A remote banner would have been
the obvious way to build it and would have re-opened the #82 IP-leak posture on a surface
that also carries a Pay button.

**One PRIVACY-relevant copy change.** `openAddressSheet` gained `subject: 'peer'`. The
self-only safety line ("sharing it is safe: it never gives anyone access to your wallet")
is a claim about the READER's wallet, so it is dropped in peer mode rather than re-worded
— a true sentence about the wrong person's money, beside a Pay button, is worse than no
sentence. The Share control is fenced at the COMPONENT for the same reason: `ixian:share`
shares the user's OWN primary address (`HomePage:908-913`), so a Share button on a
contact's address would send the wrong one. A caller cannot re-introduce it.

**One log line: none.** **One new C# `using` (`SPIXI.VoIP`, `Spixi`) — no new dependency.**

---

# #596–#615 — the 2026-08-27 iOS device pass, AS BUILT

The gate asks one question per finding: **does this exposure exist at the baseline
(`0e85a4b8`)?** No → we introduced it → we fix it before handover. Yes → legacy → it goes
to the engineer untouched. Applied while building, so the sweep finds nothing.

## ★★ #613 — the bot-room mask. The one row on this batch that needed the question asked properly.

**What changed:** `hideParticipantAddresses` no longer masks a BOT room's participants.
`Utils.hidesParticipants(friend)` returns true only for `FriendType.Group`, and every
identity-display site now asks it: `SingleChatPage` (the roster relation, the owner push,
the `setChatMode` arg, the nick→address reverse-resolve, the message relation),
`ContactDetails.showFriend`, and — independently — `chat.html`'s `mode.blind`.

**Does the exposure exist at the baseline? YES — and more of it.** Legacy qualifies
**every** mask it applies on `friend.type == FriendType.Group`
(`0e85a4b8:Spixi/Pages/Chat/SingleChatPage.xaml.cs:465-466`), so at the fork point a bot
room's participant addresses were always visible, and a nameless member's row fell back to
the **full** address (`:1174`). Our redesign hid them, then; this batch returns to parity,
and the redesign's own #211 canon means the address is now shown middle-truncated rather
than in full.

★ **So this REMOVES a divergence we introduced. It is not an introduced exposure**, and by
the gate's own rule the baseline behaviour goes to the engineer as it stands.

⚠ **What is deliberately NOT restored: the money path.** `SingleChatPage`'s tip refusal
still reads the raw `hideParticipantAddresses`. A blind group pays a **derived** address
(`GroupChat.DeriveGroupAddress`), and nothing in this tree establishes whether a
flagged bot room's roster addresses are real or derived. Identity display is restored;
spending waits for an on-device answer (#215). ⚠ A bot server that genuinely wants private
participants is a NEW capability and needs its own decision — #348 inherited it silently
from a flag on the wire, and that is the thing this row un-does.

## New verb: `ixian:launchoverlay:<0|1>` (#614)

One boolean, shell → C#, absolute (never a toggle), no payload beyond `0`/`1`. It is
dispatched on the **anchored** prefix like every payload verb, and the value is not parsed
— `EndsWith(":1")`. It carries no address, no nickname and no password, and it is
consumed only to decide whether hardware back routes into the shell. It joins the four
that already exist (`homeoverlay`, `chatoverlay`, `cdoverlay`) and is the same shape.
⚠ `LaunchPage` is the page whose verbs carry a **wallet password**; the existing
`logVerbName` rule — cut at the verb name, never log the payload — is untouched and still
pinned, and this verb adds nothing that could be logged.

## New C# reach: the keyboard-inset allow-list (#608)

`attachKeyboardInsetObserver` was scoped `loadedHtmlFileName != "chat.html"`; it is now a
literal allow-list `{ "chat.html", "index.html", "intro.html" }` matched with
`Array.IndexOf` — **exact string equality, never a prefix or a contains test.**

★ The security property the old single-name check *implied* is now asserted directly, and
the pin forbids the shapes that would break it: `MiniAppPage` never sets
`loadedHtmlFileName`, so third-party content matches no entry and is structurally
excluded, and a `StartsWith`/`Contains` test would be the way that stops being true. The
observer pushes one integer (a keyboard height in points) into a guard-called global; it
reads nothing from the page. The iOS-53 `contentOffset` clamp stays chat-only.

## Everything else on this batch

**No new `spixi.*` storage key.** **No new network fetch** — and #596 removes one of the
few surfaces that could have grown into one: the contact-details cover is deleted, so the
"a cover needs a source" argument that kept a remote banner out is now moot by absence.
**No new HTML sink.** **No new WebView setting.** **No new log line** except one
diagnostic that carries no user data: `LaunchPage back: view=… overlay=…` (an enum-like
view name clamped to four literals, and a boolean).

⚠ **One privacy-relevant control returns, deliberately** (#597): "Show sender name" is
restored in Account → Notifications on **mobile only**, and its shipped default is
**FALSE** — unchanged. The one-shot migration that forced it back to false is deleted,
which is the *removal* of a silent preference write, not the addition of one. The
preference is read at exactly one place (`Node.cs`, when a notification is composed) and
that site is untouched.

⚠ **`#604` and `#606` are UNVERIFIED on hardware.** Neither changes a trust boundary —
one is a press-feedback latch, the other paints a decorative copy of a chat row into the
same document — but they are flagged here because "built and unverified" is a state the
gate should be able to see.

## Session I (2026-09-02) — the walk fallout, the L14 handshake, the seed harness, the legal bake

**Four new verbs, two new pushes, one new build-time read, zero new HTML sinks, zero new
fetches, zero new WebView settings, zero new `spixi.*` keys.**

| introduced | where | exposure | pin |
|---|---|---|---|
| **`ixian:handoff`** (shell → C#) | settings.html `exitSettings('handoff')` → SettingsPage `Equals` dispatch, the SAME branch as `ixian:back` | No payload. Fixed verb; the only difference from `ixian:back` is that the pop is deferred to `popOnCoverPainted()` (400 ms backstop). A crafted page could send it and get… a delayed close of its own overlay. Nothing logged but two fixed words (`[L14] handoff pop released by cover|backstop`). | L14 handshake ①②③ |
| **`ixian:coverpainted`** (shell → C#) | home.html, the second rAF after the directory takeover mounts → HomePage `Equals` dispatch → `SpixiContentPage.coverPainted()` | No payload, nothing parsed, nothing echoed. Effect: release a waiting Account pop if one exists — a no-op otherwise. Sending it early makes the Account pane close ≤ 600 ms sooner than the backstop would; it cannot open, keep, or reach anything. | L14 handshake ④⑤ |
| **`onHandoff`** (C# → home shell push) | HomePage `onCoverHandoff()` → `consumeLandTab('handoff')` | Reads the existing `spixi.landtab` key exactly as the storage/visibility/focus consumers do (fixed keyword + timestamp, consumed on read). Adds a `handoff` word to the `[LANDTAB]` probe's closed vocabulary. | L14 handshake ⑥ |
| **`ixian:devseed` / `ixian:devunseed`** (shell → C#) + **`setDevSeed`** (C# → settings shell) | SettingsPage, `#if SPIXI_DEV_COEXIST` only; Utils/SDevSeed.cs is wrapped whole in the same symbol | **ABSENT FROM EVERY STORE BUILD BY CONSTRUCTION** — the symbol is defined by the SpixiDevCoexist property (#732), which a store build never passes; the file compiles to nothing, the dispatch does not exist, the push never lands, the About card never renders. In a dev build: writes 50 hash-derived contacts + history through Core's FriendList (no network, no notification — Node's wrapper is deliberately not used), removes exactly those 50. Status strings are fixed English sentences with counts. `[DEVSEED]` log lines carry counts only. Removed with SpixiDevCoexist at release hardening. | Seed harness ×5 |
| **`[CDPERF] chat …`** log lines (5) + the shell's `console.info('[CDPERF] chat-shell …')` | SingleChatPage · chat.html onChatScreenLoaded | Fixed words + integers (ms, row counts, frame counts). No address, no text, no id. TEMPORARY — retired as a set once the L10-shape fix is measured (the #663 grammar). The shell line goes to the WebView console (logcat `chromium`), never across the bridge. | [CDPERF] set-pin |
| **build-time read of `docs/legal/*.md`** → `src/components/legal-docs.js` (#733) | scripts/lib/legal-docs.mjs, run by build-demo-bundle | The text reaches the DOM through openDocSheet's existing renderer: text nodes + `https://` anchors (validated) + `<strong>`; `**` / `#` / `-` / `1.` markers are stripped, nothing is innerHTML'd. Editorial markers HOLD a document (the honest #730 summary renders instead). Retires TERMS_DEFAULT — which still claimed "collects no personal data". | #733 ×12 |
| **`[PAINTDIAG]` set** | — | **REMOVED** (two emits, one handler, two stamps). The reversal is pinned. | Session I ② reversal |
| **`hourCycle`** custom string (C# → every generated document) | HomePage boot `SpixiLocalization.addCustomString("hourCycle", Utils.deviceHourCycle())`; carried by `<span id="sl-hourcycle">` in chat/home/contact_details; copied onto `<html data-hour-cycle>` by a boot line that accepts only "h23"/"h12" | One of two fixed words, derived from the OS 12/24-hour setting — not user data, not an identifier. The boot line ignores anything else (a raw marker, an empty string). No verb, no key, no sink (`dataset`, not innerHTML). | ③ hourCycle pins (11) |
| **notification accent #175595** | SPushService.SetColor + the OneSignal manifest accent | A colour. No exposure. | notification accent ≡ splash |
| **`--bubble-*` / row / canon / composer / menu tokens** | tokens.css + the component sheets | CSS only. No exposure. The shipped shells are byte-checked by `build-shells --check`. | ③ (≈40 pins) |

## Session K (2026-09-03) — the chat open on the shell's paint, the localized-document cache, the walk J2 rows

**One new verb, zero new pushes, zero new HTML sinks, zero new fetches, zero new WebView
settings, zero new `spixi.*` keys, one new in-process cache, four temporary log sets.**

| introduced | where | exposure | pin |
|---|---|---|---|
| **`ixian:painted`** (chat shell → C#) | chat.html onChatScreenLoaded, the second rAF after the burst render → SingleChatPage `Equals` dispatch → `onPainted()` | No payload, nothing parsed, nothing echoed. Effect: present the STAGED conversation now instead of at the 400 ms backstop — a no-op once presented (presentPreload.tryFinish) and a no-op on a page that is not staged. A crafted page could send it and make its own overlay appear ≤ 400 ms sooner. Two fixed-word stamps (`[CDPERF] chat painted t=` / `backstop t=`). | Session K present ×6 |
| **localized-document cache** (`SpixiContentPage.localizedHtmlCache` / `localizedFileVersion`) | generatePage, keyed on (file, `SpixiLocalization.getDictionaryVersion()`) | In-process memory only: the SAME string localizeHtml produced, held instead of recomputed. The version bumps on every dictionary mutation (language load + addCustomString), so a carrier (`LaunchBootView`, `LockAuthPending`, `devMode`, the theme name) written before a page's generatePage always invalidates. No user data enters the key (a file name + an integer). Windows writes the same `ll_*.html` it always wrote, just not on every open. | Session K cache ×3 |
| **`[CDPERF] chat ctor tap=` · `[CDPERF] chat-shell boot nav= dcl=` · `[CDPERF] appnew …` · `[SCROLL] …` · `[WV2] …`** | SingleChatPage / HomePage / AppNewPage / chat.html / SpixiContentPage (Windows-only) | Fixed words + integers (ms, frame counts, row counts, scrollHeight, a page file name). No address, no text, no id. TEMPORARY — each is a pinned SET, retired with the [CDPERF] family at release hardening. The shell lines go to the WebView console (logcat `[WEBVIEW]` in dev builds only, #754), never across the bridge. `[WV2]` goes to `ixian.log` on Windows. | Session K stamp sets ×5 |
| **WebView2 `DefaultBackgroundColor` in applyPageSurfaceColor** | SpixiContentPage, `#if WINDOWS` | A colour on the control, the same value webViewNavigating already set one event later. No exposure. | Session K #755 |
| **dark on-action inks / dark action surface · `--bubble-avatar-*` · reactions received-sticker rule · apps ⋯ anchor · the two `ariaLabel` moves** | tokens.css + component sheets/JS | CSS/DOM-attribute only. `anchorSheetToRow` is the existing #557 helper (no new positioning code). No exposure. The shipped shells are byte-checked by `build-shells --check`. | Session K rows ×10 |
