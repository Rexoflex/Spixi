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
