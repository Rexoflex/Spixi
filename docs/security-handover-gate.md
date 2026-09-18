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
| **MAJOR #3** | The chat link-open confirm modal is spoofable. We built the linkify and the modal (#82 / #231c); legacy had no such modal | ✅ **FIXED 2026-09-06 in the sweep batch, and the mechanism below is the CORRECTED one.** Anchor: **`Spixi/Utils/Utils.cs` → `Utils.openExternal`**, the ONE external-open gate. `SingleChatPage.onNavigating` → the `ixian:openLink:` branch is now a single call into it. Three guards, all inside the gate. (a) The `HtmlDecode` is deleted. (b) A fail-closed `Uri.TryCreate` plus an `http`/`https` allow-list guards the hand-off, and the `Uri` that passed the test is the object opened. (c) `Uri.UserInfo` is refused. ⚠ **The first write-up said C# opens the exact string the modal showed. That was FALSE** (#46 loop A, MAJOR-1). `onNavigating` runs `HttpUtility.UrlDecode(e.Url)` on its first line, and that decode is kept on purpose. The property the branch enforces is narrower and true: **the destination HOST is the host the user read.** Userinfo is the only authority construct that can put a real host after readable text. Every other escape ends the host earlier, which is the safe direction. The path and the query may differ from the approved text by one decode, and that cannot move the destination. The second sink (`SettingsPage`) calls the same gate, so the two cannot drift. ⚠ Behaviour change: a genuine credentials-in-URL link no longer opens. See rows F-09 and F-10 |
| **MAJOR #6** | Mini-app WebView regressions from the iOS bring-up (#282/#283) — the global external-link handoff and the lost safe-area inset reached mini-app WebViews too | ✅ **BOTH HALVES FIXED.** (b) the safe-area inset at #401. (a) 2026-09-06 in the sweep batch. `SecureNavigationDelegate.DecidePolicy` hands a link to the OS browser only when `isTrustedHost()` proves the host is one of ours. It also requires main-frame to main-frame. See row F-11. ⚠ The classification ask SURVIVES. The `ClassId="miniapp"` marker is now read on two platforms and on neither of the other two (row O-02) |
| **`spixi.draft.*`** | OUR key, holding the user's **own unsent message text in plaintext**, in a partition third-party mini-app code may be able to read. The mechanism is legacy (MAJOR #4); this key and its contents are ours | ⚙ **PARTLY CLOSED 2026-09-06, and the residual is per-platform.** Android was already contained: `DomStorageEnabled` is false for the mini-app WebView, so that document has no `localStorage` at all. iOS is partitioned in this batch: the mini-app WebView is constructed with `WKWebsiteDataStore.NonPersistentDataStore`. **Windows and MacCatalyst are NOT partitioned**, and the premise is untested on both. See rows F-23 and O-03. O-03 names the one dev-tools line that settles Windows |

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

## Session J (2026-09-03) — the walk fixes, the rulings, seed v2, the logcat + WebView mirror

★ **Filed retroactively in the #46 loop over Sessions I–K.** Session J shipped without a gate
section, and `CLAUDE.md` requires one *before* any batch that adds a verb, a `spixi.*` key, a
WebView setting, an HTML sink, a network fetch, or a log line. Session J added **three of those
six** and the omission read, in the document as a whole, as though Session K's "zero new
`spixi.*` keys" covered the whole delta. The process failure is the finding; the rows below are
the audit that should have accompanied the batch.

| introduced | where | exposure | pin |
|---|---|---|---|
| **`spixi.kb.slot`** (new `spixi.*` localStorage key) | chat.html `rememberKbSlot` / `bootKbSlot` | **#254-clean**: one clamped integer (the measured keyboard height), no message text, no address, no id, no timestamp. It joins the mini-app-readable `file://` partition (`security-review-for-be-engineer.md` MAJOR #4), which is the judgement this table exists to record — a mini-app can read that a keyboard is ~323 px tall on this device. Accepted: it is a device-shape fact the page could measure itself. ⚠ #46 r2 changed the FORMAT to `"<px>@<width>"` (a rotation was poisoning it); still one integer pair, same exposure. | Session J slot · #46 r2 B2 |
| **`ixian:devseed:heavy`** (shell → C#) | SettingsPage, `#if SPIXI_DEV_COEXIST` only | No payload; a third fixed verb beside `ixian:devseed` / `ixian:devunseed`, seeding the 10×1000 load case. **Absent from every store build by construction** (the SpixiDevCoexist symbol, #732) — same argument as the Session I seed rows, which is why it was easy to miss. | Seed harness v2 |
| **`[KBTRAY]` log set (5 stamps)** | chat.html (`arm` · `drop by=` · `reveal` · `resize` · the ⊕ branch) | Fixed words + integers (px, ms). No address, no text, no id. `[KBTRAY] resize` fires on **every** Android window resize (each keyboard show/hide, each rotation) — volume, not exposure. TEMPORARY, retired as a set at release hardening. | `[KBTRAY]` counter (5) |
| **the logcat console mirror** (`Logging.setOptions(..., true)`) | App.xaml.cs, `#if SPIXI_DEV_COEXIST && ANDROID` | Turns Console output on so .NET Android forwards it to logcat. **Android + dev only, by construction**; the store build is byte-for-byte what it was (console off). Everything already in `ixian.log` becomes visible to any app holding READ_LOGS on that device — a dev-build exposure, accepted and retired at hardening. | Session J mirror |
| **`OnConsoleMessage` forwarding** (`WebViewRenderer.cs`) | `#if SPIXI_DEV_COEXIST`, mini-app WebView excluded by a XAML-set `ClassId` | Moves **WebView-originated text** into the persisted `ixian.log`, capped at 400 chars. This is the one genuinely new data path in Sessions I–K: the text is whatever the document printed, including uncaught-exception messages, so it is NOT the fixed vocabulary the log-line rule asks for. Dev-build only; the `ClassId` test cannot be spoofed by page content (it is a MAUI bindable set once in XAML, unreachable from JS). ⚠ #46 r1 MINOR: the guard `_renderer?.Element?.ClassId != "miniapp"` fails **open** on a disposed renderer (`null != "miniapp"`); unreachable in practice because `Control.Destroy()` precedes the chrome client's dispose. Retired at hardening. | Session J mirror |
| **`hourCycle` seeding gap** | SpixiLocalization `customStrings` | `AndroidInsetTop` is seeded into `customStrings` precisely so an unregistered carrier cannot resolve empty and log `Unknown localization key` (#401). `hourCycle` is registered only in HomePage's constructor and is not seeded. Inert today (its three carrier documents are all generated after HomePage exists) — recorded because it breaks a rule #401 wrote down. | ③ hourCycle pins |

## Session K (2026-09-03) — the chat open on the shell's paint, the localized-document cache, the walk J2 rows

**One new verb, zero new pushes, zero new HTML sinks, zero new fetches, zero new WebView
settings, zero new `spixi.*` keys, one new in-process cache, four temporary log sets.**

| introduced | where | exposure | pin |
|---|---|---|---|
| **`ixian:painted`** (chat shell → C#) ⚠ **SUPERSEDED by the `ixian:painted` accepted from five more pages row below (Session M / #766) — that row states the current shape; this one is the original chat-only entry and is kept for the record.** | chat.html onChatScreenLoaded, the second rAF after the burst render → the dispatch moved from SingleChatPage's own `Equals` branch to the shared `onNavigatingGlobal` handler, which calls the overridable `onPaintedSignal()` (SingleChatPage overrides it) | No payload, nothing parsed, nothing echoed. Effect: present the STAGED conversation now instead of at the 400 ms backstop — a no-op once presented (presentPreload.tryFinish) and a no-op on a page that is not staged. A crafted page could send it and make its own overlay appear ≤ 400 ms sooner. Two fixed-word stamps (`[CDPERF] chat painted t=` / `backstop t=`). | Session K present ×6 |
| **localized-document cache** (`SpixiContentPage.localizedHtmlCache` / `localizedFileVersion`) | generatePage, keyed on (file, `SpixiLocalization.getDictionaryVersion()`) | In-process memory only: the SAME string localizeHtml produced, held instead of recomputed. The version bumps on every dictionary mutation (language load + addCustomString), so a carrier (`LaunchBootView`, `LockAuthPending`, `devMode`, the theme name) written before a page's generatePage always invalidates. No user data enters the key (a file name + an integer). Windows writes the same `ll_*.html` it always wrote, just not on every open. | Session K cache ×3 |
| **`[CDPERF] chat ctor tap=` · `[CDPERF] chat-shell boot nav= dcl=` · `[CDPERF] appnew …` · `[SCROLL] …` · `[WV2] …`** | SingleChatPage / HomePage / AppNewPage / chat.html / SpixiContentPage (Windows-only) | Fixed words + integers (ms, frame counts, row counts, scrollHeight, a page file name). No address, no text, no id. TEMPORARY — each is a pinned SET, retired with the [CDPERF] family at release hardening. The shell lines go to the WebView console (logcat `[WEBVIEW]` in dev builds only, #754), never across the bridge. `[WV2]` goes to `ixian.log` on Windows. | Session K stamp sets ×5 |
| **WebView2 `DefaultBackgroundColor` in applyPageSurfaceColor** | SpixiContentPage, `#if WINDOWS` | A colour on the control, the same value webViewNavigating already set one event later. No exposure. | Session K #755 |
| **dark on-action inks / dark action surface · `--bubble-avatar-*` · reactions received-sticker rule · apps ⋯ anchor · the two `ariaLabel` moves** | tokens.css + component sheets/JS | CSS/DOM-attribute only. `anchorSheetToRow` is the existing #557 helper (no new positioning code). No exposure. The shipped shells are byte-checked by `build-shells --check`. | Session K rows ×10 |

## Session L (2026-09-03) — the #46 adversarial loop over Sessions I·J·K

**Zero new verbs, zero new pushes, zero new HTML sinks, zero new fetches, zero new WebView
settings. One `spixi.*` key CHANGED FORMAT, one new error surface, two log lines relocated.**

| introduced / changed | where | exposure | pin |
|---|---|---|---|
| **the built-in localization error page** | `SpixiContentPage.generateFallbackPage` (non-Android leg) | A fixed, theme-neutral `HtmlWebViewSource` that NAMES the missing shell file and its expected path. It is the last rung of a degrade ladder that replaces an `ERR_FILE_NOT_FOUND` (or, worse, a silently STALE document from a previous build). **The file name is a literal from the 26 `loadPage(...)` call sites, never user-influenced**; no `*SL{}`, no bundle, no script, no network. It renders only where localization already failed, so it must not itself depend on localization. | #46 A1 ③ |
| **`spixi.kb.slot` format** `"<px>"` → `"<px>@<width>"` | chat.html `rememberKbSlot` / `applyKbSlot` / `bootKbSlot` | Same class of datum as Session J (device shape, no user content) — one integer became two. Untagged legacy values are DROPPED on read, so the poisoned rotation value from earlier builds does not survive an upgrade. Mismatch falls back to the CSS default, never to 0. | #46 B2 ② |
| **`copyResources` diagnostics** (2 × `Logging.error`) | App.xaml.cs, recorded at constructor time, flushed after `Logging.start` | Fixed English sentences naming two **local filesystem paths** (the exe's html folder and the user folder) — the same class of path already in `ixian.log` throughout. Deferred because Ixian-Core's Logging DROPS pre-start calls (`Meta/Logging.cs:196`, verified against the 097341a sibling): a diagnostic that never lands is a silent guard. | #46 A2 ④ |
| **`localizeHtml` now deletes a partial file** | SpixiLocalization catch path | Deletes only the path it was itself given and had just opened for writing, under `Config.spixiUserFolder`. Prevents a truncated document being served as "a previous build's complete one". | #46 r2 |
| **the stage is input-dead through the entry slide** | SpixiContentPage (both reveal paths) | Removes a 1–2 frame window in which the incoming overlay was hit-testable at ~0 opacity over most of the screen — i.e. it CLOSES an input path, it does not open one. Both clears are pinned together: a stage stuck input-dead would be worse than the tap it prevents. | #46 A3 ⑤ |
| **seven `--*-neutral-on-{error,success,destructive,inverse,accent}` tokens** | tokens.css + 10 consumers | CSS only. No exposure. Restores the pre-Session-K dark ink on every fill that is not the action blue (measured collapse to 1.14:1 at worst); Damir's white-on-blue ruling is unchanged at 6.68:1. | #46 C1 census |


## Session M (2026-09-04) — the chat-appearance restructure · the apps layout · present-on-paint

**Zero new `ixian:` verbs, zero new pushes, zero new HTML sinks, zero new network fetches,
zero new WebView settings. ONE new `spixi.*` key. One new C# reach, and it is a narrowing.**

★ The `spixi.apps.layout` row is written down here **because the answer is easy and that is
exactly what makes it easy to skip.** Session J added `spixi.kb.slot` with no gate section at
all and it took an adversarial loop three sessions later to notice (#748 → Session L). The
rule from #775 is that a new key gets its row **in the same batch**, whatever its size.

| introduced / changed | where | exposure | pin |
|---|---|---|---|
| **`spixi.apps.layout`** (new `spixi.*` localStorage key) | `home.html` `readAppsLayout` (seed-time read) + `onToggleLayout` (write) | **#254-clean, and the mildest kind on this list**: the value is one of exactly **two fixed words**, `'list'` or `'grid'`, normalised by `setAppsLayout` before it is written and re-checked against the same two words on read. No user content, no address, no id, no timestamp, no count — it does not even disclose whether the user *has* any apps. It joins the mini-app-readable `file://` partition (`security-review-for-be-engineer.md` MAJOR #4), so the row is stated plainly: **a mini-app can read which of two view modes the apps tab is in.** Accepted — that is a preference about our own chrome, not a fact about the user. | #775 · the seed-time pin |
| **`patternNone`** (new string key, 13 locales) | `settings-screens.js` `createChatAppearance` | No exposure — a UI label. Recorded because it moves the string surface: `patternIntensity` retired with its card, `patternNone` added, and the #46 r1 sweep then retired `patternOff` / `patternDefault` with `PATTERN_LEVELS` — from the canonical dictionary AND from the 12 draft files that still carried translations of them: **786 → 784**. | #774 |
| **the chat-appearance screen re-renders on a live `setTheme`** | `settings.html` `setTheme` → `applyPushedTheme(…, { onApplied })` | No exposure — presentation. Scoped to the ONE view whose STRUCTURE is theme-derived (the Colour row is light-only). It tears down and rebuilds a settings sublevel; it cannot reach another shell, and it runs only when that view is the current one and the page is not exiting. Deliberately NOT a blanket rebuild: dropping an open sheet or in-flight row state on every OS flip would be a regression, not a fix. | #774 · #772 |
| **`ixian:painted` accepted from five more pages** | `SpixiContentPage` present path (the #766 grammar) | ⚠ **A NARROWING, stated as one.** These pages already presented — on a fixed 120 ms timer. They now present on their own shell's paint signal, with the timer retained as a backstop, so the reach added is one **argument-free** verb from a page that already had the bridge. It cannot carry data, cannot be replayed to any effect (the latch is one-shot per present), and a page that never sends it is exactly as it is today. ★ **Session O adds the gate that was only structural before:** `onNavigatingGlobal` now answers this verb only when `hasGeneratedContent` is true, the same test its `ixian:cdping:` sibling uses — a mini-app WebView is a third-party document, so its exclusion is ENFORCED at the dispatcher instead of resting on the fact that `MiniAppPage` holds no paint gate. | #766 generalisation |


## Session N (2026-09-05) — the legacy purge · the perf investigations · the comment-strip fork

**ONE new `ixian:` verb, TEMPORARY (`ixian:cdping:<digits>`, retires with the `[CDPERF]`
set) and its echo push (`cdpong`). Zero new HTML sinks, zero new network fetches, zero new
`spixi.*` keys, zero new WebView settings. One new BUILD reach (a Release-only MSBuild
target running node). And a large REMOVAL: four legacy documents, three C# pages, four
asset folders (bootstrap · jQuery · FontAwesome · Inter), ~7 MB of unreferenced images, a
`*SL{}` carrier, and every C# branch that read the legacy-page roster.**

★ A removal batch is where the sweep's question inverts: the risk is not "did we introduce
exposure" but "did we delete a route somebody could still take". Every deletion was
re-proved by a real reference search (exact verb / URL / call — DECISIONS Session N names
the three word-greps that were wrong this week) and the smoke suite now carries the
reachability gate that would have caught them structurally.

| introduced / changed | where | exposure | pin |
|---|---|---|---|
| **`ixian:cdping:<token>` → `cdpong(token)`** (TEMPORARY) | `SpixiContentPage.onNavigatingGlobal` beside `ixian:painted`; `chat.html` handler | The token is the shell's own `performance.now()` as an integer; C# accepts DIGITS ONLY (≤16 chars) and echoes it through `sendUiCommand`, which base64-encodes every argument — no shell text can reach a JS literal. No state, no data, no effect on any page. Retire with the `[CDPERF]` set (handoff ⑬) | `★ Session N [CDPERF] rtt` pins (digit guard · placement · one-shot) |
| **`SpixiStripReleaseHtml`** (Release-only MSBuild target) | `Spixi.csproj` | Runs `node scripts/strip-release.mjs` at build time and swaps ONE `MauiAsset` (`spixi.tokens.css`) for its comment-stripped copy. The strip touches no JS and no HTML; the two gates (`strip-release --check` · `smoke-packaged`) prove the packaged tree ≡ strip(committed) and that the suite passes over it. Fails loud if node is missing. `-p:SpixiStripHtml=false` opts out | `strip-release --check` (gate 1) · `smoke-packaged` (gate 2, recorded per release) |
| **`supportsRawDataUriArgs` = `loadedHtmlFileName != null`** (a WIDENING, stated) | `SpixiContentPage` | The legacy leg of the #340 gate (pages decoding through `js/spixi.js`'s unguarded `atob`) is gone WITH its members — every document `loadPage` can load now runs `native.js`. The mini-app leg still fails closed (null `loadedHtmlFileName`, pinned). Nothing new can be reached: the set of pages that receive raw data-URIs is exactly the set of redesigned shells, as before | `★ #340 (A-MAJOR-1) after Session N` |
| **`AppDetailsPage.onStartAppMulti` no-home fallback → `Logging.error`** | `AppDetailsPage.xaml.cs` | The branch that pushed the legacy picker is unreachable (only `HomePage.stop()` clears the singleton, and that tears the details page down). It now logs a fixed sentence + the app id and leaves the page in place. No new sink, no new verb | `★ Session N: the app-details launch uses the shell picker …` |
| **`img/app-noicon.jpg` mapped to null in `chat.html`** | `resolveAppIcon` at the `addAppRequest` boundary | The sentinel's file no longer ships; the card draws its rocket instead of requesting a missing file (a wasted fetch + a console error per invite card). Same rule the avatar sentinels already had | `★ Session N: chat.html maps C#'s img/app-noicon.jpg …` |
| **the `SpixiThemeMode` carrier is no longer written** | `ThemeManager.loadTheme` | Its only readers were the four deleted documents' `<link href="css/*SL{SpixiThemeMode}">`. `SpixiThemeName` (ten shells) unchanged | `★ Session N: the SpixiThemeMode carrier …` |
| **REMOVED: `apps.html` · `address.html` · `settings_lock.html` · `wallet_recipient.html`; `AppsPage` · `SetLockPage` · `WalletRecipientPage`; `css/` · `libs/` · `fonts/`; `js/*` except `html5-qrcode.min.js`; ~60 unreferenced images; `hasLegacyPageChrome` · `rethemesByPush`; HomePage's `ixian:lock` (bare) · `ixian:newchat` · `ixian:startAppMulti` branches** | everywhere named | Inherited surface removed: the legacy pages carried the pre-redesign decoders (`js/spixi.js`), their own `ixian:` grammars and third-party libraries (bootstrap 4, jQuery, FontAwesome). Fewer inbound verbs on HomePage, fewer documents that could ever be loaded, no legacy JS shipped at all | the `★★ Session N` block (documents · pages · folders · js/ · viewport-fit · loaders · C# readers · verbs · reachability gate · csproj premise · SHELLS≡DEFAULT) |
| **#797 (after the walk): `SContacts.leaveGroup` survives a no-route leave notice; `ContactDetails.onNavigating` cancels FIRST and re-allows only `file:`** | `SContacts.cs` · `ContactDetails.xaml.cs` · `SingleChatPage.xaml.cs` | No new verb, no new sink, no new fetch. One new log line, FIXED text, no address and no `ex.Message` (Core formats the base58 token into its exception text). REDUCED reach: an unknown `ixian:` verb from `contact_details.html` can no longer replace the page (was `e.Cancel = false` on anything unmatched). `sendLeave` now has ONE call site | `#797 ①–④` pins |

## Session O (2026-09-05) — the #46 adversarial loop over Session M + Session N's C# and #797

**Zero new verbs, zero new pushes, zero new HTML sinks, zero new fetches, zero new `spixi.*`
keys, zero new WebView settings. ONE app-wide NARROWING of the navigation policy, ONE verb
GATED, one password parse changed shape, three new fixed-word log lines.**

★ The largest security-relevant delta of the loop is a REFUSAL, and a refusal's blast radius is
everything its author did not enumerate. The row below says what is now refused, what is still
allowed, and which platform leg is NOT verified.

| introduced / changed | where | exposure | pin |
|---|---|---|---|
| **`onNavigating` cancels FIRST and re-allows ONLY `file:` — on all 19 handlers** (the #797 rule, generalised) | every `Spixi/Pages/**` page with `void onNavigating(object sender, WebNavigatingEventArgs e)` (19; at HEAD 4 had the full grammar, 9 cancelled last — 8 of them with a permissive `else`, `CallPage` had the `file:` tail — and 6 more cancelled first but kept a permissive `else`) | Before: a throw inside a branch left `e.Cancel == false`; Android's `ShouldOverrideUrlLoading` swallows the throw and LOADS the `ixian:` URL as a page — on `LockPage` that URL carries the plaintext wallet password (`ixian:unlock:<pass>`), on `LaunchPage` `ixian:create:<nick>:<pass>` / `ixian:restore:<pass>`, on `EncryptionPassword` both passwords. iOS fails closed but logs the whole URL. After: cancelled before any branch; an unknown `ixian:` verb stays on the page. Still allowed: the page's own `file:` document load (every shell is loaded through `loadPage` → `file:`). ⚠ NOT verified on device: the #768 fallback ladder returns an `HtmlWebViewSource` (no `file:` URL) — Android never raises `Navigating` for it (`WebViewRenderer.LoadHtml` calls `LoadDataWithBaseURL` without `SendNavigatingCanceled`); WinUI/iOS may report `about:blank` and the tail would cancel it. Device row: Windows, delete `<exe>\html`, app lock ON, boot — a blank lock = add `about:blank` to the shared tail, one clause | `★★ Session O ①` (a WALK over every handler, no list; cancel before any branch; exactly one `e.Cancel = false` under the verbatim `file:` head) |
| **`LockPage` `ixian:unlock:` dispatch anchored** (`StartsWith` Ordinal + one `Substring`) | `LockPage.onNavigating` | Was `Contains` + `Split(…)[1]`: a password containing the literal was truncated (a permanent lockout, since the create path stored the full string). Now the remainder after the first prefix is the password, whole. Same for `ScanPage` `ixian:qrresult:` (a QR payload) and the dead HomePage copy | `★★ Session O ②` · `⑰` |
| **`ixian:painted` gated on `hasGeneratedContent`** | `SpixiContentPage.onNavigatingGlobal` | Was accepted from any WebView incl. a mini-app (inert only because `MiniAppPage` is never staged). Now enforced, like its `ixian:cdping:` sibling. Zero behaviour change for every shell | `★★ Session O ⑤` |
| **`SContacts.leaveGroup` returns the local-removal result; both `ixian:leave` callers honour it** | `SContacts.cs` · `ContactDetails` · `SingleChatPage` | A refused `FriendList.removeFriend` (a bot that is a group member) no longer reads as "Contact removed" + pop. Failure alert reuses `global-dialog-error` / `settings-deleted-error-text` (no new string). Dead end for that bot case — logged as a BE row, not hidden | `★★ Session O ④` · `#797 ③` (rebased) |
| **three new log lines**: `leaveGroup: the leave notice could not be sent (<ExceptionType>)` · `leaveGroup: the local removal was refused` · `ScanPage` scan-result catch (`<ExceptionType>`) | `SContacts.cs` · `ScanPage.xaml.cs` | Fixed words + an exception TYPE NAME only. Never `ex.Message` (Core formats the address into it), never the payload. `ixian.log` is offered through the share sheet, so the pin bans every `ex` token but `ex.GetType().Name` | `★★ Session O ④` pair · `⑰` pair |
| **`AppDetailsPage` no-home fallback log** | `onStartAppMulti` | The app id (from the page's own URL) is logged only when it matches `[A-Za-z0-9._-]{1,64}`; otherwise its length. Raw unbounded text never reaches the log | `★ #46 r2 NIT-5 (+ r3 MINOR-1)` (the charset walk asserted by shape) |
| **`PATTERN_LEVELS` + `patternOff`/`patternDefault` RETIRED** | `settings-screens.js` · 25 locale JSONs | String surface 786 → 784. Nothing new can be reached | `★★ Session O ⑩` |
| **Chat appearance: the Colour section exists only in light** | `settings-screens.js` | An empty card no longer ships in dark. Presentation only | `★★ Session O ⑥` (source + DOM) |
| **`settings.html` `onApplied` dismisses open overlays before the rebuild** | `settings.html` | A theme flip with the Colour sheet open no longer orphans the sheet on `document.body`. `dismissOverlay()` closes the top unconditionally (a tear-down, not an Esc) | `★★ Session O ⑧` |

**Legacy, in the same handlers (his column, not ours):** `SingleChatPage.onNavigating` logs
`$"Error during navigation: {ex.Message}"` — byte-identical at the fork; the ① walk now covers
that handler, so the line is named here rather than left to be rediscovered.

## Session P (2026-09-05) — the two levers: the pre-warmed blank chat (#780) + the batch transport (#298)

**Zero new inbound `ixian:` verbs, zero new `spixi.*` keys, zero new WebView settings, zero new
fetches. TWO new outbound pushes (`addMessages` · `messagesDone`), one new hidden WebView state
(the blank spare), nineteen new log lines — eight `[CDPERF]` stamps, one shell WARN and two
shell `dbg(...)` debug lines (fixed words + integers) and eight Logging.warn/error lines (an
exception TYPE name, never its message).** Lens applied while building; the loop (DECISIONS #802) re-walked it and found the
first cut's log-line row wrong (it said four and listed seven).

| introduced / changed | where | exposure | pin |
|---|---|---|---|
| **`addMessages(base64JSON, "append"\|"prepend")` — a push that carries MESSAGE TEXT** | `SingleChatPage.loadMessages` → `chat.html` `addMessages` | **A SINK, by the gate's own definition.** The same argument-escaping path as every push (one base64 argument; JSON can never take the raw `data:` fast path because it starts with `{` — pinned) and the SAME textContent-only handlers as the per-row transport: each item is dispatched to one of the seven row renderers by an ALLOWLIST (`addMe` · `addThem` · `addPaymentRequest` · `addFile` · `addAppRequest` · `addCall` · `showContactRequest`) + its folded `addReactions`. No innerHTML, no eval of item content, no new escaping code. Integer args index the `strs` intern table (long `data:` URIs only, ≥ 256 chars — pinned, so a message body can never be read as an index). A malformed item is skipped; the rest of the history lands | `★★ Session P L2·13` · `L2·14` (source + shipped) · `L2·15` (behavioural, real dispatcher) |
| **`messagesDone`** — the end-of-batch signal | same | No argument, no data. Ends the shell's render burst; the 250 ms safety timer stays for an old exe | `L2·14` · `L2·15` |
| **the blank chat spare** — a hidden `SingleChatPage` WebView with NO friend, staged in HomePage's grid before any tap | `SpixiContentPage.warmSpareChat` / `pushSpareChat` / `dropSpareChat` · `SingleChatPage()` · `attach` | Its OWN WebView, its own JS context (#221 unchanged — nothing is shared, nothing is composed). In NO enumerator while it waits (structural + two belts), so it receives no push and no tick until attach, EXCEPT the one push its own base class makes to every page: `setInsetTop` from the keyboard/inset plumbing (a number). `onNavigating` cancels and drops every verb while blank — its own class's AND the shared `onNavigatingGlobal` set (painted · cdping · the call trio), which is gated on `friend != null` — except `ixian:onload` and the document's own `file:` load. A tap with a lock shown in place refuses the spare and falls to today's path, which drops the target (#230 unchanged). Dropped on every theme/language flip (a stale document), on low memory, on sleep (mobile), on shutdown, on host re-registration, and after 6 s without a boot. A blank page paints NO system-bar strip (the process-wide side effect, #421 MAJOR-4's class) | `L1·1`–`L1·10` |
| **the `[CDPERF]` stamps (8 kinds)**: `chat warm start` · `chat warm refused why=<word>` (four sites: the guard word · `content` · `race` in SpixiContentPage, `background` in HomePage) · `chat warm drop why=<word>` · `chat warm onload t=<int>` · `chat attach spare=1 tap=<int>ms` · `chat attach spare=0 why=<word>` · `chat batch n=<int> json=<int> t=<int>` · the shell's `batch=0\|1` token on the existing `chat-shell` line | `SpixiContentPage` · `SingleChatPage` · `HomePage` · `chat.html` | Fixed words + integers; never a URL, never message text, never an address. TEMPORARY — one SET, retired together (pinned as a set) | `L1·11` |
| **one shell WARN**: `[chat-shell] addMessages dropped=<int>\|all` | `chat.html` | The count of refused batch items, nothing from the items themselves. WARN because the release WebView drops INFO from logcat (Session J) | `L2·14` |
| **two shell debug lines**: `dbg('addMessages', { n, pos })` · `dbg('messagesDone')` | `chat.html` | The existing dev-only `dbg` channel; an item count and the word `append`/`prepend`. Never reach a release logcat | — |
| **eight Logging.warn/error lines**: `warmSpareChat: construction failed: <Type>` · `warmSpareChat: staging failed: <Type>` · `dropSpareChat: <Type>` · `pushSpareChat: attach failed: <Type>` · `chat spare warm failed: <Type>` (HomePage) · `SingleChatPage: a verb reached the blank spare and was dropped` · `loadMessages: the batch could not be serialized (<Type>)` · `loadMessages: reactions for one row were dropped (<Type>)` | `SpixiContentPage` · `SingleChatPage` · `HomePage` | `ex.GetType().Name` only — never `ex.Message` (which can carry a path or a JSON fragment), never the verb URL. The blank-verb warning carries no data at all. Permanent | `L1·2` (the blank-verb line) · `★★ Session P L1·5 / L2·12 (#802 r8)` (all seven exception logs: the type name, no `.Message`, no `+ ex`, no `{0}`) |

**Not introduced (checked):** no verb gained a new branch; the live `insertMessage` /
`updateReactions` paths are one-line delegates with `batch = null` and push the same bytes as
before. B2 (prepend from C#) and B4 (the window) were NOT built — decisions, not omissions
(DECISIONS #801).

## Session Q (2026-09-06) — the Account sublevels stop booting a WebView (#804)

**Zero new verbs, zero new pushes, zero new HTML sinks, zero new fetches, zero new `spixi.*`
keys, zero new WebView settings, zero new log lines. THREE routes changed host.**

★ Nothing in this batch is new surface. Every screen, every capability and every verb already
existed and already shipped. What changed is WHICH WebView renders three Account sublevels on a
phone — and one of those three composes a plaintext wallet password, so the change is written
down here rather than left as a routing detail.

The gate question, asked of the delta from the fork point `0e85a4b8`: *does this exposure exist
at the baseline?* The password-over-URL pattern is INHERITED (the legacy `settings_encryption`
page carried it). The long-lived host is OURS — introduced in #341, reviewed there, and shipped
on desktop since. This batch does not create it; it gives it a second form factor. So the row
below states the reach honestly, and the two guards that bound it are proven by BEHAVIOUR, not
by their presence in the source.

| introduced / changed | where | exposure | pin |
|---|---|---|---|
| **Backup · Downloads · Change password render INSIDE `settings.html` on every form factor** (the `paneMode &&` half of three cap guards removed) | `src/shells/settings.html` — `onBackup` · `onDownloads` · `onChangePassword` | REDUCED reach on the C# side: a current shell no longer emits `ixian:backup`, `ixian:downloads` or `ixian:encpass` at `SettingsPage` at all, so three page constructions and three WebView boots stop happening per Account visit. The three branches stay as the no-cap fallback (an old exe with a new shell) and `closeSublevelOverlays` still sweeps their types. No verb was added, removed or widened; `setCaps` is byte-identical and always was pushed outside the `if (paneMode)` block | `#804` PIN 1 (a WALK over all 18 shells) · PIN 2 (the caps line is outside the pane block, brace-counted) · PIN 3a–c (the fallback is still reachable) · PIN 4a/4b/4b(ii)/4c (behavioural, phone UA, built shell) |
| **`ixian:changepass:<DELIM>old<DELIM>new` now composed on a phone from a document that PARKS** | `settings.html` `case 'encpass'` (unchanged code, new reach) | The transport is untouched: same frozen verb, same delimiter, same `e.Cancel = true` before any branch (#797), same `split_url.Length == 3` refusal, and neither catch logs the URL. What is new on mobile is the HOST: `settings.html` is parked and re-presented (#315) instead of disposed on pop, so an unscrubbed form would hold three plaintext passwords in live inputs for the life of the process. Two guards bound that, both already shipping on desktop since #341 — `renderLayout` releases the screen on every view change, and `exitSettings` releases it on every park route (the routes where `exiting` makes `renderLayout` bail). ⚠ STATED, not hidden: scrubbing an input clears the DOM value; the JS strings themselves die with garbage collection, which is weaker than destroying the page. That property is inherited from #341 and is unchanged — this batch extends its reach, it does not alter it | `#804` PIN 5 (fill three fields, leave by hardware back, assert every value is empty) · PIN 5b (the same through the peer-nav park, the one route where no render can scrub) · the existing `★ #341 SECURITY` pair |
| **Downloads' file list now lands in the settings WebView on a phone too** | `SettingsPage.loadDownloads` → `clearFiles`/`addFile` | File names are PEER-SUPPLIED (`TransferManager` writes `transfer.fileName` verbatim). Unchanged handling: the component renders `textContent` only, and the open/delete verbs `encodeURIComponent` the name so `%25` round-trips exactly through C#'s single unescape. BOTH hosts already ran `TransferManager.resolveDownloadPath`, the `..` traversal guard landed in #267/Q1-② — this batch adds no host that lacks it, it removes one that had it | `#804` PIN 4b(ii) (the sublevel's only verbs are the three DATA verbs) · the existing `#267` traversal pins |

**Not introduced (checked):** no page class was deleted — `BackupPage`, `DownloadsPage` and
`EncryptionPassword` all stay constructible, and `BackupPage` in particular is still reached by
the backup NUDGE through `HomePage`'s own `ixian:backup` branch, a caller that never touches the
Account. No `spixi.*` key was added. No new string reaches a DOM sink. The `#800` pre-warm was
considered for these three pages and REJECTED: it would have left three resident WebViews at a
measured ~15 MB each while this change removes the boots entirely.

---

# ★★ THE FULL SWEEP — 2026-09-06. The census.

**This is THE sweep the gate has promised since 2026-08-15.** Every section above it is a
per-batch application of the lens. This section is the census over the WHOLE delta from the fork
point `0e85a4b8` to `e4ae4c4c`. It replaces the assertion "the redesign introduces nothing" with
a count.

⚠ **THE CENSUS WAS RE-DERIVED AGAINST THE TREE ON 2026-09-07, AFTER THE LAST FIXER.** The first
version of this section was written BETWEEN the two fix batches. It therefore reported 16 rows as
OPEN that the batch had already closed, and it described a fix batch that had been superseded.
The #46 adversarial loop found that (loop C, MAJOR-1), and this text is the correction. **Every
row below was read at its anchor on 2026-09-07.** A row this pass could not verify stays OPEN and
says why.

★ **The rule that defect bought: a census is a snapshot.** A snapshot taken in the middle of a
batch is stale before anyone reads it. The doc pass belongs after the last fixer. Its summary
must state the commit and the smoke number it was derived from, so the next reader can tell in one
line whether it still applies.

**Derived from:** working tree over `e4ae4c4c`, 2026-09-07 · smoke `BASELINE OK — 4592 pass / the
3 KNOWN pre-existers (#136 · M5 · B3)` · `cs-syntax-check: 138 file(s) parse cleanly, 1 skipped
for a known grammar gap`.

## ⚠ ADDENDUM — the four loop rounds that ran AFTER this census was re-derived

The census above was re-derived from the tree, and then the #46 loop ran four more rounds. Nothing
in the tables below became false. Three things changed, and the rows name them:

* **The external-open design changed.** Rows F-09 and F-10 are rewritten. Every external link the
  app opens now goes through one gate, `Utils.openExternal`. The pin proves a POSITIVE
  branch-scoped property: inside each `ixian:openLink:` dispatch branch, and inside the iOS
  external `http(s)` branch, the only call is the gate. A negative sweep over the OS-open
  primitives rides with it, with its homes named and its blind spot stated in its own message.
* **A new pinned property.** No `WKNavigationActionPolicy` other than `Cancel` may reach `decide`
  in `iOSWebViewHandler`, except at the one delegated site for the local `file:` load. Before this
  round nothing read that argument.
* **A defect in the test infrastructure was closed.** `stripCode` removed block comments before
  line comments, so a `/*` inside a `//` comment opened a fake block comment. It blanked 17 live
  lines across four files, and those lines were invisible to every negative sweep in the suite. A
  reproduction hid an OS-open primitive behind two ordinary comments with the whole suite green.
  The stripper is now a one-pass tokenizer, and its pin compares it against three independent
  reference strippers.

**Closing state of the batch:** smoke `BASELINE OK — 4613 pass / the 3 KNOWN pre-existers`.

⚠ **One residual of that class is NOT closed.** 123 occurrences of the naive comment regex and 26
more local strippers under 17 names remain across the suite and the scripts. Each can hide code
from the sweep that reads it. That is a next-session row, not a finding against these tables.

## The method, and the counts a reviewer can re-derive

**Eight disjoint read-only auditors, then two adversarial verifiers.** Each auditor owned one
class. Each derived its rows from the diff and not from a task list (#798). Each read the baseline
at source and did not reason about it (#215). Each row carries one question: *does this exposure
exist at the baseline?*

**★ The verifier's verdict WINS.** V1 re-tested classes A–D. V2 re-tested E–I. Between them they
refuted three impact claims, changed six severities, showed six evidence cells wrong while the
verdict survived, and found two exposures no auditor filed. Every row below is written at the
verified level. Where a verifier corrected an auditor, the row says so.

| class | what it walked | the counts it reported |
|---|---|---|
| **A** — the `ixian:` verb surface | every emit site and every dispatch branch | **135** distinct verb tokens emitted, identical in `src/` and in the shipped output · **223** emit call sites in `src/`, **222** shipped · **19** `onNavigating` handlers (baseline **29**) · **145** distinct verb literals in C#, **233** dispatch branch tests · **45** verbs dispatched at HEAD that the baseline never handled · **0** orphaned emitters · **14** handlers with no emitter, 9 of them baseline branches |
| **B** — the push surface (C# → WebView) | every path that can execute JS in a WebView | **4** shapes at **7** sites, and nothing else in the tree can run JS in a WebView · **281** `sendUiCommand` call sites · **144** distinct command names (baseline **102**) → **64** introduced, **20** retired, all 64 read at the call site · **18** documents · **22** `imageToDataUri` arguments traced to their producer · **15** `addCustomString` writers · **35** `*SL{}` carriers |
| **C** — client storage | the storage APIs first, the key names second | **7** other browser-storage mechanisms searched, **0** hits each · **119** `localStorage` call sites in **19** files · **29** key constants resolving to **27** distinct `spixi.*` keys or families · **28** distinct write expressions, every one classified · **9** families embed a peer wallet address in the key NAME |
| **D** — WebView configuration, permissions, OS reach | the platform tree, both revisions | **319** platform files at HEAD, **312** at baseline; **11** added, **4** removed · **65** files and **3,844** insertions in the platform + csproj delta, read in full · **13** Android WebView settings at both revisions, with exactly **ONE** changed value · **13** `uses-permission` at both revisions, the same 13 · **10** `DllImport` at HEAD, **6** at baseline |
| **E** — HTML sinks | 30 sink patterns, over source AND over the built bytes | shipped front end: **5** `innerHTML`, **1** `DOMParser`, **1** dynamic `<script src>` with a literal, **483** `textContent` assignments, and **0** for `eval` · `new Function` · string timers · `srcdoc` · `outerHTML` · `insertAdjacentHTML` · `document.write` · `createContextualFragment` · `<iframe>` · `<form>` · `srcset` · `setAttribute('on…')`. ★ The walk was run TWICE. The second pass over the built artefacts is what found row O-09 |
| **F** — network requests | every request-capable primitive | **0** `fetch` / `XMLHttpRequest` / `sendBeacon` / `EventSource` / `WebSocket` / dynamic `import()` across the **21** script-bearing shipped files. The shells leak through ELEMENTS, never through script · three platform allow-lists compared, and **MacCatalyst registers no WebView handler at all** |
| **G** — what reaches a log, and where the log can go | the added log lines, from the diff | **449** added log-call lines across **45** files; **311** carry a runtime value and all 311 were read · `Logging.*` call sites **257 → 675** · **19** real diagnostic families, **17** of which ship in Release · **9** `Address`-constructor catch sites found by a brace-tracking walk |
| **H** — filesystem paths built from a value the app did not choose | every path sink | **339** hits in **32** files → **315** code lines carrying **347** API occurrences · `Path.Combine` **117** · `File.Delete` **30** · `File.Move` **7** · `ZipFile.ExtractToDirectory` **1** — the one that became row F-12 |
| **I** — everything the seven named classes do not cover | the diff, bucketed | **1,189** `--name-status` lines: **A 956 · D 135 · M 97 · R 1** · all **20** build scripts read for "what can this emit, and does it validate its input" · all **11** deleted C# pages read at the baseline and checked for a dropped guard |

**★ THE SHIPPED SET, DEFINED, because three counts above use it and no two agreed.**
`Spixi/Resources/Raw/html/` holds **18** `.html` documents and **6** generated assets
(`spixi.bundle.js` · `spixi.icons.js` · `spixi.strings.js` · `spixi.base.css` ·
`spixi.tokens.css` · `spixi.chat-pattern.css`), plus `js/html5-qrcode.min.js`, `images/` and
`img/`. Class F's **21** = the 18 documents plus the 3 generated `.js` files, which is every
script-bearing file we author. Class E's **22** = those 21 plus the vendored scanner. A reviewer
re-deriving either count now knows which files to include.

**82 INTRODUCED rows were filed** across the nine deliverables and the two verifiers. They
deduplicate to the **65** findings below. Three findings were reported independently by three
auditors from three directions — the media auto-fetch widening (F-01), the log egress (O-19) and
the committed device captures (O-27). Each is ONE row here.

**Current state of the 65: 38 FIXED, 27 OPEN.** Three of the 27 are partly closed and say so
(O-01 · O-18 · O-22).

**The work that produced that state, counted from the reports on disk.** Two fix batches ran, of
five and two fixers, on disjoint file scopes — **seven fixers**. A **#46 adversarial loop** then
ran over the batch: three read-only auditors (loop A, B, C), then **three more fixers**. **Three
pin passes** followed the fix work.

**What the suite says.** The smoke suite went **4,377 → 4,592 pass**, with the same three known
pre-existers (#136 · M5 · B3). `cs-syntax-check` holds at **138** files parsing cleanly, with one
skipped for a known grammar gap. The security pins are numbered **gates 1–43**, contiguous, in
two blocks of `scripts/smoke-test.mjs`. Those blocks hold **186** `ok(` call sites. Some sit
inside walks and run once per site found, so the assertion count at run time is higher. Re-derive
the gate count with `grep -oE "GATE [0-9]+" scripts/smoke-test.mjs`.

⚠ **The batch turned pins red, and every one of them was right to go red.** The first fix batch
turned six red, and four of those six no fixer reported. They are pins whose LITERAL shape a fix
changed while the property survived. The second batch and the loop turned more red for the same reason.
Two `#341` pins went red at a comment. Eight `#495` and NOTIF-5 pins went red at a deleted
method name.
None was weakened. Each replacement was killed by its own mutation.

⚠ **The #46 loop found nine live holes in these pins and all nine are fixed.** Loop C ran eleven
real mutations and **nine survived**. The failures were all one shape: a pin bounded by CHARACTER
DISTANCE, or written from the author's list instead of a walk (#771 · #798). Gate 7 asserted
ORDER and not CONTAINMENT, so the Safari handoff could leave its own trust block. Gate 15 called a
call "fenced" when `runFencedVerb(` appeared anywhere in the preceding 400 characters, so a
wallet-password verb escaped. Gate 16 froze the `openLink` sink count at two BY LIST, so a third
sink shipped clean in a mutation. Gate 14 listed seven filesystem-API spellings, so `File.Create`
placed above the zip-slip fence passed. Gates 10, 17, 26 and 37 had the same defect in four other
shapes. All are now walks or parses. The one control mutation was caught (gate 28).

## The rows — INTRODUCED, and FIXED

★ **Ids never change.** Fifteen rows below carry an `O-` id because they were OPEN when the
census was first written and closed later in the batch. The smoke pins cite these ids, so
renumbering them would break the only link between a row and the gate that protects it. An `O-`
id in this table means "filed as open, since fixed", nothing more.

| Finding | file:line | INTRODUCED / INHERITED / MITIGATED-BY-US | Evidence at `0e85a4b8` | Fix |
|---|---|---|---|---|
| **F-01 · MAJOR · The media auto-fetch lost its host constraint.** A received message whose whole text is a URL renders as a tile when the PATH ends in a media extension. The host was not tested, and `http://` was accepted. One peer message, no tap, on chat open. ★ Found three times independently, from three directions (E-1 · F1 · B I-1) | `src/shells/chat.html` (`mediaUrlOf` → the media-extension branch · `normalizeMediaUrl` · `isAllowedMediaUrl`) · `src/components/media-bubble.js` (`createMediaBubble` → `load()` → `img.src`) | **INTRODUCED** | `0e85a4b8:Spixi/Resources/Raw/html/js/chat.js` (`linkify` — the `<img>` branch, anchored to `^https://[A-Za-z0-9]+\.(tenor\|giphy)\.com/…$`) | ✅ **FIXED, in two rounds.** Round 1: `ALLOWED_MEDIA_URL` / `isAllowedMediaUrl` mirror `Utils.IsAllowedURL`, both ends anchored, `http` dropped. Round 2 (#46 loop): the gate tested the RAW message text, and the browser lower-cases the scheme and the host before it requests. So the gate never saw the string that was fetched, and it refused 105 shapes iOS admitted. `normalizeMediaUrl` now rebuilds the URL from the parser's own fields, lower-casing the scheme and the host only. The tested string is the fetched string. That also closes two rewrites the raw text hid: userinfo, and a backslash authority. ⚠ **V2 corrected the impact:** the leak was live on **iOS and MacCatalyst only**. Android and Windows answered the request locally through `Utils.IsAllowedURL`, so the tile was merely broken there. Gate 41 |
| **F-02 · MINOR · The opt-out the code documented did not exist.** The comment beside `mediaAutoloadOn()` said "write 'off' … to opt out". **Nothing in the tree ever wrote that key**, so both gates that depend on it were permanently ON (E-1b) | `src/shells/chat.html` (`MEDIA_AUTOLOAD_KEY` / `mediaAutoloadOn`) | **INTRODUCED** | absent at `0e85a4b8` (searched: `media.autoload`, `mediaAutoload`, `MEDIA_AUTOLOAD` over `src/`, `Spixi/**/*.cs` and the shipped html — 5 hits, all reads, all ours) | ✅ **FIXED.** A real switch: `src/components/settings-screens.js` (`createPrivacy` → `mediaAutoload` / `onMediaAutoload`) and `src/shells/settings.html` (`showPrivacy`, `case 'privacy'`). No verb, no C# change. ⚠ The Privacy screen was itself DEAD — built, and never called by any shell. Gate 24 |
| **F-03 · MINOR · A remembered media URL re-fired with the preference OFF, forever.** The autoload expression was `mediaAutoloadOn() \|\| loadedMedia.has(url)`, and the set was persisted per peer. One tap on a tracking URL made a beacon that re-fired on every chat open. The stored value is also peer-authored text in the `file://` partition (C-1 · V2 miss ②, which no auditor filed) | `src/shells/chat.html` (`rememberLoadedMedia` · `MEDIA_LOADED_LEGACY_PREFIX`, and the `autoload:` argument in `buildMediaRow`) | **INTRODUCED** | the key and the set are ours (#206⑤) | ✅ **FIXED.** The persistence is retired. The set is session-only, and the retired key is removed on sight. Proven behaviourally on the BUILT shell against a store seeded with an older build's value. ⚠ **Anchor corrected 2026-09-07:** the row named `loadLoadedMedia`, and the fix deleted that function |
| **F-04 · MAJOR · The app invite carries a PEER-chosen remote image URL, and it is fetched on render** (F2 · B I-2) | `Spixi/MiniApps/MiniAppManager.cs` (`getAppInfo` — the 4th `\|\|` segment) · `Spixi/Pages/Chat/SingleChatPage.xaml.cs` (`loadMessages` → the app-invite branch, `app_image_url`) · `src/shells/chat.html` (`buildAppRow`) | **INTRODUCED** | `0e85a4b8:Spixi/MiniApps/MiniAppManager.cs` (`getAppInfo` — **three** segments, no image field) | ✅ **FIXED at the trust boundary.** ⚠ B called the URL "publisher-chosen". V2 proved it is PEER-chosen: the whole invite is the peer's wire bytes, and a hostile peer never runs `getAppInfo`. So the fix is on the RECEIVING side — `sanitizeAppInvite` / `safeAppIconUrl` — and not on the emitter. Gate 20 |
| **F-05 · MAJOR · The icon privacy gate failed open on one slash.** The shell asked "is this remote?" with `/^https?:\/\//i`; C# asked with `StartsWith("http")`. `http:/evil.example/x.gif` failed the shell test, was therefore treated as LOCAL and never gated, and the browser normalised it back and fetched it. ★ Found by V2, filed by no auditor | `src/shells/chat.html` (`buildAppRow` → `remoteIcon`) against `SingleChatPage.loadMessages` (the `StartsWith("http")` admission test) | **INTRODUCED** | both predicates are ours (#214 C7(b) + #206⑤) | ✅ **FIXED by inverting the question.** "Local" must now be PROVEN (`data:image/`). Everything else is parsed with `new URL` and gated on the resolved protocol. Pinned behaviourally with the one-slash shape in the corpus |
| **F-06 · MAJOR · iOS granted camera AND microphone to any document in any of the app's WebViews, mini-apps included.** `RequestMediaCapturePermission` received `origin` and `frame` and referenced neither. It granted unconditionally once `AVCaptureDevice` was `Authorized` — which it permanently is after the user's first QR scan (D1) | `Spixi/Platforms/iOS/iOSWebViewHandler.cs` (`MediaCaptureUIDelegate.captureRefusal`); reached because `MauiProgram.ConfigureMauiHandlers` registers the handler for `typeof(WebView)` | **INTRODUCED** | `git show 0e85a4b8:…/iOSWebViewHandler.cs` — `ConnectHandler` assigns only `NavigationDelegate`. No UI delegate exists at the baseline | ✅ **FIXED.** `captureRefusal` refuses FIRST on four tests: trusted host, `Camera` only, main frame, and the document must be the scan shell. Its catch refuses too. **The microphone is never granted.** Every refusal is a fixed word in the log. ⚠ **The origin test was rewritten in the #46 loop** (loop A, MAJOR-2). The first cut required the protocol to be `file` or empty, and nothing available here establishes what WebKit reports for a `file://` main frame. That whitelist could have denied the scanner. It is now a blacklist of the two protocols whose meaning is certain: `http` and `https`. It sits over a document test that is fail-closed, from a source traceable end to end. Gates 9 and 40 |
| **F-07 · MAJOR · The iOS content-rule allow entries were unanchored, and `file://.*` matched as a substring.** `https://evil.example/x.gif?u=https://a.tenor.com/y` CONTAINS an allowed pattern, so `ignore-previous-rules` fired and the `.*` block rule was set aside (F1(a)) | `Spixi/Platforms/iOS/iOSWebViewHandler.cs` (`CreatePlatformView` → the `url-filter` entries) | **INTRODUCED** | the rule list is ours (#293); `git grep -n 'ContentRuleList' 0e85a4b8` → absent | ✅ **FIXED.** All three `https` rules are anchored and mirror `Utils.IsAllowedURL` byte for byte. The `file` rule is `^file://`. The `.*` block rule is unchanged and still first. A failed compile now falls back to the pre-fix list instead of attaching NOTHING. ⚠ V2 §5.1's device test is still owed. The fix is correct under either answer |
| **F-08 · MAJOR · The iOS navigation catch wrote the WHOLE bridge URL into `ixian.log`, and four verb grammars carry a plaintext wallet password.** The `try` wraps `base.DecidePolicy`, which raises `Navigating`, so every page's handler runs inside it. `LockPage.doUnlock`, and `LaunchPage`'s restore and proceed branches, had no `try` and call wallet code that throws (A-1 · G-1) | `Spixi/Platforms/iOS/iOSWebViewHandler.cs` (`SecureNavigationDelegate.DecidePolicy` → the tail catch) · `Spixi/Pages/Launch/LockPage.xaml.cs` (`onNavigating` → `ixian:unlock:`) · `Spixi/Pages/Launch/LaunchPage.xaml.cs` (the create / restore / proceed branches) | **INTRODUCED** | `git show 0e85a4b8:…/iOSWebViewHandler.cs` — `DecidePolicy` is 11 lines with no try and no logging. ⚠ **A's stated search was false** and could not have found a counter-example; V1 supplied the one that proves the row: `grep -rnE 'Logging\.(error\|warn\|info\|trace)\([^)]*(current_url\|e\.Url\|AbsoluteString)'` → **1 at HEAD, 0 at the baseline** | ✅ **FIXED twice.** At the sink: `verbLabel` cuts at the second `:`, bounds the length, and refuses any character outside the ASCII alphanumerics. At the source: `LaunchPage.runFencedVerb` fences the three password branches. It logs the verb NAME and the exception TYPE, never `ex.Message`. ⚠ `ixian:changepass:` was NEVER reachable this way — `SettingsPage` already catches inside its branch. ⚠ **Gate 15 could not see a fence escape until the #46 loop rewrote it**; it now parses the `runFencedVerb` argument list |
| **F-09 · MAJOR · security MAJOR #3 — the chat link-open confirm is spoofable.** Also in the "ours" table above | **`Spixi/Utils/Utils.cs` (`Utils.openExternal`) — the gate holds the whole mechanism** · `Spixi/Pages/Chat/SingleChatPage.xaml.cs` (`onNavigating` → the `ixian:openLink:` branch) — the reachable sink, now one call | **INTRODUCED** (the linkify and the modal are ours, #82 / #231c) | legacy had no confirm modal on this path | ✅ **FIXED. Read the mechanism in `Utils.openExternal`, not in the branch.** ⚠ **The first write-up said "the `HtmlDecode` is DELETED, so C# opens the exact string the modal showed". That was FALSE** (#46 loop A, MAJOR-1, and loop C, MAJOR-6). `onNavigating` runs `HttpUtility.UrlDecode(e.Url)` on its first line. That decode is kept on purpose, so the transport pair is not symmetric. ⚠ **THE MECHANISM MOVED on 2026-09-07, and this row used to describe the old home.** The branch held its own guards, and `SettingsPage` held a copy. The rule was written twice. A pin cannot prove a control-flow property of duplicated code, and three review rounds defeated the pin that tried. So the duplication is gone. The branch is now one statement: `Utils.openExternal(link);`. **`Spixi/Utils/Utils.cs` → `Utils.openExternal` is the one external-open gate, and the claim is narrowed to what the pins prove.** Every link the two `ixian:openLink:` branches and the iOS http(s) hand-off give to the OS goes through this method. That is proven positively, per branch. ⚠ **An earlier version of this row said `Utils.openExternal` is the only method that may call a browser or launcher sink. That is FALSE** (#772, r6 MINOR-2). `Spixi/Platforms/Windows/SFileOperations.open` runs `Process.Start(UseShellExecute = true)`. For a URL that is a browser sink. A reviewer called it from the chat branch and re-opened MAJOR #3 with the whole suite green. The true tree-wide statement is narrower. No other file in the shipped C# projects calls an `OpenAsync` sink. Four named platform primitives appear only in the local-file and exec homes. The same narrowing is written in the gate's own comment, so the code and this row agree. The gate does four things. (a) It parses the string ONCE, with `Uri.TryCreate`, and it hands off that same object. (b) For the web kind it admits `http` and `https` only. (c) It refuses a non-empty `Uri.UserInfo`. (d) It runs the hand-off inside a `try`, so a throw cannot escape into `onNavigating`. The `HtmlDecode` is deleted and nothing decodes twice. The property is: **the destination HOST is the host the user read.** Userinfo is the only authority construct that can put a real host after readable text. Every other escape ends the host earlier, which is the safe direction. Path and query may differ by one decode, and that cannot move the destination. ⚠ **What the gate does NOT close is named in its own comment**: a fullwidth `U+FF20` that may map to `@` inside the parser, and the SPACE that `HttpUtility.UrlDecode` makes from a `+` (MAJOR #8). Both need a device run. ⚠ Behaviour change: a credentials-in-URL link no longer opens. ⚠ **WHAT THE PINS PROVE (gates 7 and 16), after three review rounds rewrote them.** **① THE BRANCH CALLS ONLY THE GATE — the property that carries the guarantee.** It is POSITIVE and branch-scoped. For each sink branch the pin parses the branch, lists every invocation in it, and refuses any callee that is not on a tiny named allow-list. The three subjects are the two `ixian:openLink:` dispatches and the whole iOS http(s) branch. A spelling nobody listed fails by BEING A CALL. Reflection fails for the same reason. ⚠ **The subjects come from a census, not from a file list.** A third page that gains an `ixian:openLink:` dispatch inherits the property on the commit that adds it. ⚠ **This inversion replaced three negative pins that each lost the next spelling**: r3 lost `if(`, r4 lost `var ob = Browser.Default`, r5 lost `SFileOperations.open(link)`. ⚠ **The cost is stated.** The allow-list holds the full dotted callee. A rename, or a new helper in front of the gate, turns the pin RED. That is a security review, not a refactor. **② THE OS-OPEN PRIMITIVES — a belt, and it says so.** `Process.Start(` · `Intent.ActionView` · `OpenUrl(` · `LaunchUriAsync(` may appear only in the named local-file and exec homes. ⚠ **This clause is a LIST.** It cannot see a primitive nobody listed, a call through reflection, a helper in another assembly, or an intent action built from a string. Property ① is what covers those inside the branches. **THE WALK — one sink method, one home.** It walks every `.cs` file in the shipped C# projects, plus the `Ixian-Core` sibling when the checkout has it. Every `OpenAsync(` and `TryOpenAsync(` must sit inside `Utils.openExternal`. The walk reads the METHOD NAME. A local variable, a private helper, a `using static` and a fully-qualified call are all the same call to it. It also refuses a `using` alias or a `using static` that names Browser or Launcher. **⚠ The walk read a TYPE NAME until r4 MAJOR-1**, and three ordinary spellings called the sink past it with the whole suite green. **THE POLICY VALUE (gate 7).** Every `WKNavigationActionPolicy` in `iOSWebViewHandler.cs` must be `.Cancel`. ⚠ **Position alone did not prove this, and the old clause claimed it did.** `decide` is a one-shot, so one added `decide(Allow)` makes the trailing Cancel a no-op and every http(s) URL loads in every WebView, the mini-app's included. The one site that may deliver a policy this file did not choose is the `base.DecidePolicy` delegation, for the local `file:` load. **THE READER ITSELF.** Every negative sweep in the suite reads comment-stripped source. Twice a comment token inside a literal, and then inside another comment, deleted whole methods from that output and hid them from every sweep at once. The stripper is a tokenizer now. A pin checks it against three deliberately naive reference strippers, so the pin and the repair do not share a premise. Gate 16 also freezes the gate body token for token. Gate 7 requires the iOS hand-off to sit inside its trust block. ⚠ **What no text pin can prove is named at the gate**: a fullwidth `U+FF20` inside the parser, and the space `HttpUtility.UrlDecode` makes from a `+` (MAJOR #8). Both need a device run. Gates 7 and 16 |
| **F-10 · MINOR · A second, unvalidated `openLink` sink was added on `SettingsPage`,** with no confirm in front of it (A-7 · F3) | `Spixi/Pages/Settings/SettingsPage.xaml.cs` (`onNavigating` → the `ixian:openLink:` branch) · `Spixi/Utils/Utils.cs` (`Utils.openExternal`) | **INTRODUCED** | `git show 0e85a4b8:…/SettingsPage.xaml.cs \| grep -c openLink` → **0**. The chat original is byte-identical and INHERITED | ✅ **FIXED, and the drift this row was written against is now impossible.** The second sink first got the same guards as F-09, by copy. ⚠ **On 2026-09-07 BOTH copies were deleted.** Each branch is now one call to `Utils.openExternal`, so there is no second copy to drift. Read the mechanism in F-09, and read the code in `Utils.openExternal`. ⚠ V1 checked reachability rather than trusting the row: the four URLs that reach this branch are compile-time constants in `src/components/settings-app.js`. ⚠ **Gate 16 froze the sink count at two BY LIST**, and loop C shipped a third sink past it in a mutation. The clause is now a CENSUS. It counts the files that contain the `ixian:openLink:` verb literal, and it requires the dispatch walk to have covered every one of them. A file whose branch the walk cannot climb fails the premise instead of hiding behind it. ⚠ **This row used to end "so a third page joins the pin automatically". THAT SENTENCE WAS FALSE and it is deleted.** Loop C proved it, and the pin retracted it before this document did. A floor of two can never see an addition. A census can |
| **F-11 · MAJOR · security MAJOR #6(a) — the external-link handoff reached mini-app content.** Also in the "ours" table above | `Spixi/Platforms/iOS/iOSWebViewHandler.cs` (`SecureNavigationDelegate.DecidePolicy` → the `http`/`https` branch) | **INTRODUCED** | the handoff is #283-ours; pre-#283 mini-app `http(s)` was hard-Cancel with no handoff | ✅ **FIXED.** The handoff runs only when `isTrustedHost()` proves the host is one of ours, and only main-frame to main-frame. It reads the SAME `ClassId="miniapp"` marker Android keys its privilege drops on. `isTrustedHost()` defaults to FALSE. `decide(Cancel)` is untouched and unconditional, so an `http(s)` URL still never loads in any WebView. ⚠ **Gate 7 asserted ORDER, not CONTAINMENT**, until the #46 loop. Loop C emptied the trust block and moved the handoff below it, and the suite stayed green. The gate now brace-matches the block and requires the handoff to fall inside it |
| **F-12 · MAJOR · The restore "rehome" loop is a zip-slip on Android, iOS and MacCatalyst.** `ZipFile.ExtractToDirectory` blocks a `/` traversal. But on Unix a `\` is an ordinary filename character. So `..\wallet.ixi\x` survives as ONE legal file whose NAME carries the traversal, and the loop rebuilt that name into a real path. It runs BEFORE `verifyWallet`, so the attacker needs only the archive password they chose (H-1) | `Spixi/Pages/Launch/LaunchPage.xaml.cs` (`restoreAccountFile` → the #565 "heal Windows-made backups" `foreach`) | **INTRODUCED** | `0e85a4b8:Spixi/Pages/Launch/LaunchRestorePage.xaml.cs` (`restoreAccountFile` — `ExtractToDirectory` straight to `tmpWalletFile`, **no loop**) | ✅ **FIXED.** `isPlainRelativeEntry` refuses a rooted path, a `:`, and any empty / `.` / `..` segment on BOTH separators. The destination and its parent must then resolve under a `fenceRoot`. `Directory.CreateDirectory` runs on the VALIDATED parent. ⚠ **V2 refuted the impact chain.** The row said "the planted `ll_chat.html` becomes the shell", and `localizeHtml` overwrites it. V2 then named the real primitive the row missed: unconditional DIRECTORY creation, which is a permanent wallet-path denial of service. ⚠ **Gate 14 listed seven filesystem-API spellings**; loop C placed `File.Create` above the fence and the suite stayed green. The op set is now derived from the loop body |
| **F-13 · MAJOR · A peer-controlled nickname was the identity in the NATIVE money confirm,** unescaped and unbounded. `Friend.nickname` is raw peer bytes with no length bound and no sanitiser anywhere in the tree. Newlines forge lines that read like the amount and fee rows. Length pushes the address out of view, which defeats the invariant the method's own comment states (A-9 · I-2) | `Spixi/Utils/SPayments.cs` (`recipientDisplay`, consumed by `confirmAndAuth`'s body composition) | **INTRODUCED** | `0e85a4b8:Spixi/Pages/Wallet/WalletSend2Page.xaml.cs` — the send confirm was a **WebView page**, not a native dialog, and the nickname reached it as a push argument. Searched for a native confirm on the baseline send path: only two amount-error alerts | ✅ **FIXED.** ⚠ **V1 raised this from MINOR to MAJOR** after tracing the provenance to the wire. `confirmAndAuth` now takes the ADDRESS and composes the block itself, so no call site can omit it. `displayName` / `isDisplaySafe` strip control characters and clamp to 32. ⚠ **Gate 17 matched only a first argument spelled `page`** until the #46 loop; it now parses the argument list |
| **F-14 · MINOR · The send confirm named the address the user typed, not the address that gets paid.** For an `End2End` address the resolve returns a NETWORK-supplied payment address. The fee and the broadcast used it and the dialog did not (I-3) | `Spixi/Utils/SPayments.cs` (`handleSignSend` → the `resolveExtendedAddress` await, then `confirmAndAuth`) | **INTRODUCED** | `0e85a4b8:Spixi/Pages/Wallet/WalletSendPage.xaml.cs` resolved FIRST and only then pushed `WalletSend2Page`, so the legacy confirm showed the resolved address | ✅ **FIXED.** Both signing paths pass `to.PaymentAddress.ToString()`. That is the exact field `Node.prepareTransactionFrom` credits, verified at source |
| **F-15 · MAJOR · A full, valid wallet address was written to `ixian.log` on a NORMAL rejection path.** No exception is needed: `new Address(recipient)` succeeds two statements earlier, so the logged string is a well-formed base58 address (G-2) | `Spixi/Pages/Home/HomePage.xaml.cs` (`onSendRequest` → the recipient fail-closed guard's `Logging.warn`) | **INTRODUCED** | `git show 0e85a4b8:…/WalletReceivePage.xaml.cs \| grep -n 'Logging\.'` → exactly one line, and its `onRequest` guard is silent | ✅ **FIXED.** The `recipient` term is deleted. The five diagnostic flags stay: they name nobody, and they are the values the guard branches on. ⚠ **This fix shipped with NO pin at all**, and loop C put the address back with the suite green. Gate 39 now WALKS every `Logging` call in the two request-composition twins and refuses any argument carrying a peer identity. ⚠ **The two verifiers disagree on this ONE line, and both reasons are recorded rather than averaged.** V1 downgraded it to MINOR. The baseline already writes a peer wallet address into the same log at two LIVE sites — `SpixiLocalStorageCallbacks` and `StreamProcessor`, byte-identical at HEAD. A new line of an inherited class is not a MAJOR above six siblings. V2 confirmed MAJOR, because no exception is needed to reach it. It is fixed either way. Use V1's evidence when ORDERING the remaining work |
| **F-16 · MINOR · Catches that log an `Address`-constructor exception, whose text CONTAINS the base58 address.** Ixian-Core formats the address into the message (A-4 · G-3) | 12 sites, incl. `Spixi/Utils/SpixiContentPage.cs` (`sendContactRequestGuarded`) · `Spixi/Pages/Contacts/ContactDetails.xaml.cs` (`onNavigating` → `ixian:kick:` / `ixian:ban:`) · `Spixi/Pages/Home/HomePage.xaml.cs` (`ixian:creategroup:` / `ixian:mutechat:`) | **INSTANCES introduced · MECHANISM inherited** | ⚠ **V2 downgraded this from MAJOR.** The brief's own rule is "search the baseline for the MECHANISM". `0e85a4b8:Spixi/Pages/Contacts/ContactNewPage.xaml.cs` has the identical shape twice: `Logging.error("Invalid address format: " + ex.Message)`. G filed those same two lines as its own INHERITED row | ✅ **FIXED at the 12 introduced sites** (fixed text plus `ex.GetType().Name`). The 8 inherited or out-of-scope sites are frozen by name in a pin, so a NEW one fails while a fix passes. Gate 18 |
| **F-17 · MINOR · Destructive verb handlers construct an `Address` from the WebView token with no `try`.** A malformed token throws out of the branch. On iOS that throw lands in F-08 and puts the token in the log (A-5) | `Spixi/Pages/Home/HomePage.xaml.cs` (`onAcceptRequest` · `onDeclineRequest` · the `ixian:chatinfo:` branch) | **INTRODUCED** | `git grep -n 'acceptRequest\|declineRequest' 0e85a4b8 -- '*.cs'` → no hits | ✅ **FIXED at all three.** ⚠ **V1: A filed a list, not a walk.** Its own walk over every `new Address(` under `Spixi/Pages/` found the THIRD introduced site A had missed, and three inherited siblings that correctly stay |
| **F-18 · NIT · The one INTRODUCED `Contains()` + `Split[1]` dispatch,** the shape #216 named and #797 and Session O removed everywhere else | `Spixi/Pages/Home/HomePage.xaml.cs` (`onNavigating` → the `ixian:chatinfo:` branch) | **INTRODUCED** | `git grep -c '"ixian:chatinfo' 0e85a4b8 -- '*.cs'` → **0**. It was the ONLY one of the 45 new verbs dispatched with `Contains`; the other 12 `Contains` branches all have a byte-matching baseline twin | ✅ **FIXED.** `StartsWith` Ordinal plus `Substring`, matching `ixian:mutechat:` twenty lines above. The count of `Contains("ixian:` branches now carries a pinned ceiling of 12, all inherited |
| **F-19 · MINOR · Removing a contact removed nothing from storage.** "Contact removed" left the peer's address, the user's unsent plaintext, their media URLs and the per-conversation markers behind (C-3) | `src/shells/home.html` · `src/shells/chat.html` · `src/shells/contact_details.html` (the removal answers) · `src/shells/settings.html` (`removeHistoryResult`) | **INTRODUCED** | the nine per-address key families are ours | ✅ **FIXED, and widened in the #46 loop.** ⚠ **V1 downgraded it from MAJOR** — nothing NEW can read the keys, so this is retention, not reach. `forgetPeerStorage(addr, scope)` runs on every SUCCESS branch. The helper carries no list (`k.startsWith('spixi.') && k.endsWith('.' + address)`), so it cannot drift. ⚠ The first fix covered the home shell only. The loop found five more removal answers across three shells. It also found a SIXTH path: Settings → "Delete all chat history". That path had no push at all. It now sends `removeHistoryResult("", "ok")`, which the shell reads as "every peer". Gates 35 and 43 |
| **F-20 · NIT · The account wipe was prefix-scoped and missed the one unprefixed key** (C-7) | `src/shells/settings.html` (`wipeLocalState`) | **INTRODUCED** (the wipe is ours; the key comes from the vendored library, which is byte-identical at the baseline) | `git show 0e85a4b8:…/js/html5-qrcode.min.js` carries the identical `LOCAL_STORAGE_KEY` | ✅ **FIXED.** The sweep now takes `spixi.` OR `HTML5_QRCODE_DATA`, and it is still an enumeration, never `clear()`. Gate 6 |
| **F-21 · MINOR · The repo-local NuGet feed is unscoped.** `nuget.config` adds a folder source with no `<clear/>`, no `<packageSourceMapping>`, no lock file and no recorded hash. So ANY `.nupkg` dropped into `local-nuget/` shadows a public package of that id (I-1 · D12) | `nuget.config` (`<packageSources>`) · `local-nuget/RocksDB.0.0.42.nupkg` | **INTRODUCED** | `git ls-tree 0e85a4b8 -- nuget.config` → absent | ✅ **FIXED.** `<clear/>`, an explicit nuget.org source, a mapping that binds `local` to the single id `RocksDB`, and both hashes recorded. ⚠ **V2 downgraded it from MAJOR:** only the id's owner can publish `RocksDB 0.0.42`, so this is not classic dependency confusion. The dropped-file path is the real one, and the fix is the same either way. ⚠ **Unvalidated here:** no .NET toolchain. Damir's first restore must exercise BOTH RocksDB references. Gate 22 |
| **F-22 · MINOR · The icon generator has no tag or attribute allow-list, and its output is `innerHTML`'d onto a LIVE `<svg>`** (E-4 · I-6) | `scripts/generate-icons.mjs` (the asset loop → `entries[name].b`) → `src/components/icons.js` (`iconFactory` → `svg.innerHTML = entry.b`) | **INTRODUCED** | the generator and the registry are ours (#40) | ✅ **FIXED.** ⚠ V2 sided with the MINOR reading over the NIT one. The input is a tool output that a human eyeballs as an icon, and the sink is live. The generator now runs an allow-list over the FINAL body and calls `process.exit(1)` BEFORE either write |
| **F-23 · MAJOR · The shells' `localStorage` shared one WebKit data store with mini-app documents on iOS** — the premise under MAJOR #4 and under the gate's own `spixi.draft.*` row. The repo's own device evidence (#311) proves `file://` storage persists AND crosses `ll_*` files on iOS, and mini-apps install one directory from the shells | `Spixi/Platforms/iOS/iOSWebViewHandler.cs` (`CreatePlatformView` → `createIsolatedMiniAppView` / `isMiniAppHost`) | **MECHANISM inherited · the CONTENT behind it is ours** | `git grep -n 'WKWebsiteDataStore\|WKProcessPool' 0e85a4b8` → **0**. The baseline shared the same store and simply put nothing in it | ✅ **FIXED ON iOS.** The mini-app WebView is constructed with `WKWebsiteDataStore.NonPersistentDataStore`. ⚠ It had to be done at CONSTRUCTION: `platformView.Configuration` returns a COPY, so an assignment after the fact is silently lost. **Windows and MacCatalyst are NOT partitioned** → row O-03. Gate 12 |
| **O-07 · NIT · A shipping build rendered a storage diagnostic and wrote a permanent counter.** `probeScanStorage` incremented a key on every scan mount and painted an English line over the consent card. No build symbol, no dev flag, no capability gate (C-6) | `src/bridge/scan-page.js`, shipped inside `spixi.bundle.js`, which `scan.html` loads with `<script src>` | **INTRODUCED** | absent at `0e85a4b8` (the probe is #308-ours) | ✅ **FIXED 2026-09-06, later in the batch.** The probe and its painter are deleted. One line survives on purpose: the retired key is removed on sight. The question the probe was built to answer is CLOSED (#311, C-9 both legs). ⚠ **C's anchor was wrong** — it said the probe is inlined into `scan.html`, and `grep -c "spixi.probe.scan" Spixi/Resources/Raw/html/scan.html` → **0**. Anyone re-running C's search would have wrongly closed the row |
| **O-10 · NIT · A dead `innerHTML` writer shipped in the bundle.** `illoSlot` had zero call sites (E-3) | `src/components/launch-shell.js` (`illoSlot`), shipped in `Spixi/Resources/Raw/html/spixi.bundle.js` | **INTRODUCED** | absent at `0e85a4b8` | ✅ **FIXED 2026-09-06, later in the batch.** `illoSlot` and its constants are deleted |
| **O-12 · NIT · A peer nickname was the REPLACEMENT argument of `String.prototype.replace`,** where `$&` and `` $` `` are substitution syntax (E-6) | `src/components/contacts-shell.js` (`setKnown`) | **INTRODUCED** | absent at `0e85a4b8` (the contacts shell is #153-ours) | ✅ **FIXED 2026-09-06, later in the batch.** The replacement is a FUNCTION, which returns its value literally, so a nickname can only ever be the nickname. There was no XSS: the product goes to `textContent`, so the damage was a mangled sentence. Gate 34 |
| **O-13 · NIT · Two dormant sinks took an unconstrained URL.** `linkPreview.image` and the shared-media strip rendered `<img src>` with no host or scheme test (F5) | `src/components/message-bubble.js` (the `linkPreview` card) · `src/components/chat-info.js` (the shared-media strip) | **INTRODUCED** | absent at `0e85a4b8` | ✅ **FIXED 2026-09-06, later in the batch.** The guard is in the COMPONENT, not in a future shell, so the sinks cannot be lit up without a review. `safeImageSrc(value, { allowRemote })` in `avatar.js` is fail-closed by construction, and the #46 loop extended it to the peer-composed sinks in `media-bubble.js`, `typed-bubbles.js` and `apps-details.js`. `createMediaBubble`'s `preview` is the one with real weight, because it paints on RENDER and waits for no gate. Gates 32 and 42 |
| **O-14 · MINOR · The raw QR payload tail was pushed into the wallet document and pre-filled the money compose.** Only the part before the first `:` was validated (B I-4) | `Spixi/Utils/Utils.cs` (`safeScanPayload`) · `Spixi/Pages/Home/HomePage.xaml.cs` (`quickScanForSend` and `processQRResult` → `quickScanResult`) | **INTRODUCED** | the quick-scan flow is ours | ✅ **FIXED 2026-09-06, in two steps.** `Utils.safeScanPayload` accepts only the closed grammar the shell parses: `addr` · `addr:ixi` · `addr:send:<amount>`, where the amount is digits with at most one decimal point and at most 32 characters. Anything else returns the validated address alone. Refusal is the default branch. The helper shipped first with no caller, because the two push sites were outside that fixer's file scope. Both sites now wrap their argument in it. This changes only what crosses the bridge. It parses nothing that is signed, and the native confirm still re-reads recipient, amount and fee. Gate 30 |
| **O-16 · NIT · Shipping iOS diagnostics `EvaluateJavaScript`'d into every WKWebView,** mini-apps included (B I-7) | `Spixi/Platforms/iOS/iOSWebViewHandler.cs` (the `[cam-perm]` forwards) | **INTRODUCED** (#310 / #311) | absent at `0e85a4b8` | ✅ **FIXED 2026-09-06, later in the batch.** Every `EvaluateJavaScript` site is now dominated by `isTrustedHost()`, so our diagnostics never enter a publisher's console. The interpolated values were already a fixed vocabulary, so this closes reach, not injection. Gate 28 is the model the other walks were rewritten to copy: it climbs outward to the type body and parses the real condition. A control mutation adding an unguarded site FAILED the suite, as it must |
| **O-17 · NIT · `addChatReaction` carried an unbounded peer-supplied string** into the chats document (B I-8) | `Spixi/Utils/UIHelpers.cs` (`updateChatReaction`, `REACTION_MAX`) → `Spixi/Pages/Home/HomePage.xaml.cs` | **INTRODUCED** | the verb is ours (CH8) | ✅ **FIXED 2026-09-06, later in the batch.** `REACTION_MAX = 64`, and the clamped variable is the one forwarded. This was a marshalling-cost row, not an injection row: base64 transport, `textContent` sink. Gate 29 |
| **O-21 · MINOR · The OneSignal push SUBSCRIPTION ID was logged in full on iOS.** The APNs token was correctly reduced to a length; the subscription id was not (G-6) | `Spixi/Platforms/iOS/SPushService.cs` (`[APNSDIAG]`) | **INTRODUCED** | absent at `0e85a4b8` | ✅ **FIXED 2026-09-06, later in the batch.** The line now prints `sub.Id.Length + " chars"`, the same way the token already printed. Gate 27 pins `sub.Id` plus the one following character, so `sub.Id.Substring` fails it |
| **O-23 · NIT · New log lines carried absolute filesystem paths, which on Windows contain the OS account name** (G-8) | `Spixi/App.xaml.cs` (`copyResources` → `recordStartupDiagnostic`) | **INTRODUCED** | absent at `0e85a4b8` | ✅ **FIXED 2026-09-06, later in the batch.** Neither `recordStartupDiagnostic` call names a directory. The first states what is missing and how to fix it. The second reports the exception TYPE only |
| **O-24 · NIT · Two catches on the push path logged the raw exception, without the sanitiser that sits in the same file** (G-11) | `Spixi/Platforms/Android/SPushService.cs` (`decidePush`'s outer catch) · `Spixi/Platforms/Android/SNotificationServiceExtension.cs` (the outer catch) | **INTRODUCED** | absent at `0e85a4b8` | ✅ **FIXED 2026-09-06, later in the batch.** Both catches log `ex.GetType().Name` plus `SPIXI.Utils.logSafe(ex.Message)`. Both wrap code that handles the push `fa`, which is the sender's wallet address, and `IXICore.Address` formats the offending string into its own exception message. Gates 25 and 26 |
| **O-25 · MINOR · The sanitiser was in the wrong compilation slice.** `logSafe` was `internal static` inside `Platforms/Android/`, so no shared-code site could call it (G-12) | `Spixi/Utils/Utils.cs` (`logSafe`) | **INTRODUCED** | absent at `0e85a4b8` | ✅ **FIXED 2026-09-06, later in the batch.** `logSafe` is `public static` in `Spixi/Utils/Utils.cs` and every TFM compiles it. It was the ENABLER for F-15, F-16 and O-24: those sites had no sanitiser available even if the author had wanted one. ⚠ Gate 25 does not transcribe the rule. It slices the three C# members out by brace match, then rewrites them into JS through a fixed substitution table. It REFUSES if any C#-only construct survives. A change to the C# changes what the pin executes |
| **O-26 · NIT · `isContactMuted` logged the raw exception from a `Preferences` read whose key embeds the peer address** (G-13) | `Spixi/Meta/SNotificationPrefs.cs` (`isContactMuted`) | **INTRODUCED** | absent at `0e85a4b8` | ✅ **FIXED 2026-09-06, later in the batch.** The catch logs the type plus `logSafe`. The row was speculative. It depended on a platform `Preferences` failure whose message names the key, and G could not show one. It is closed either way. Gate 26 |
| **O-37 · NIT · The HTML inliner spliced generated JS and CSS with no terminator escaping.** A `</script` sequence in an inlined source would end the block (I-9) | `scripts/lib/inline.mjs` (`inlineHtml`, the style and script splices) | **INTRODUCED** | absent at `0e85a4b8` | ✅ **FIXED 2026-09-06, later in the batch.** `breakScriptEnd` and `breakStyleEnd` rewrite `</script` and `</style` to `<\/script` and `<\/style`. Only the tokenizer sees a difference: in a JS string, a template literal, a regular expression, a CSS string or a comment, `\/` is `/`. No file the inliner reads carries either sequence today, so the built shells are byte-identical. Gate 33 |
| **O-39 · NIT · A docblock stated the opposite of what its own function does** (#772). `resolveDownloadPath`'s docblock ended with the CLAUDE.md rule "C# names its own paths", and the function's whole purpose is to accept a name the WebView supplied (H-3) | `Spixi/Data/TransferManager.cs` (the `resolveDownloadPath` docblock) | **INTRODUCED** (the guard and its docblock are ours, #267) | the baseline had no such function | ✅ **FIXED 2026-09-06, later in the batch.** The docblock states the real rule: the name is accepted, and it is confined. Gate 38 |
| **O-42 · NIT · The C# half of an untrue storage comment** (C-9, #772). Both halves asserted "WebView storage is one store per app on every platform", and nothing in this tree made that true | `Spixi/Pages/Settings/SettingsPage.xaml.cs` (`wipeEverything`, step 6) · `src/shells/settings.html` (`wipeLocalState`) | **INTRODUCED** | absent at `0e85a4b8` | ✅ **BOTH HALVES FIXED 2026-09-06.** The shell docblock was corrected in the first fix batch; the C# twin followed later in the same batch. It now states the per-platform truth, read out of the platform files. It also names the narrower rule the step relies on. No platform file separates one SPIXI SHELL from another. It also states the reversal — give any shell its own data store and "delete all data" becomes silently partial. Gate 38 |

## The rows — INTRODUCED, and OPEN

**27 rows.** Each row names what it waits on: a ruling, a device, or a named piece of work. Three
rows are partly closed and say which half is done (O-01 · O-18 · O-22).

| Finding | file:line | INTRODUCED / INHERITED / MITIGATED-BY-US | Evidence at `0e85a4b8` | Fix |
|---|---|---|---|---|
| **O-01 · MAJOR · The live wallet balance is pushed INTO the chat document.** The chat shell also PREFETCHED it. Opening the in-chat Send takeover fired a second `ixian:feeQuery:<addr>:0` with no amount, purely to obtain the balance (A-2 · B I-3) | `Spixi/Utils/SPayments.cs` (`handleFeeQuery` → `setSendQuote`, argument 4) · `Spixi/Pages/Chat/SingleChatPage.xaml.cs` (the `ixian:feeQuery:` branch, and the ungated `composeSend` capability) · `src/shells/chat.html` (`createWalletSend`, and `setSendQuote`'s routing) | **INTRODUCED** | `git grep -n 'feeQuery' 0e85a4b8 -- '*.cs'` → no hits. The baseline reached a balance on this flow only inside a composed failure sentence in a NATIVE alert. ⚠ **B's evidence cell is wrong** — the baseline did push `setBalance` into `wallet_send.html` and `wallet_send2.html`. The introduced part is the balance reaching the document that renders untrusted peer content | ⚙ **NARROWED 2026-09-06. The ruling is still OPEN, and it is needed either way.** The duplicate prefetch is deleted. `pick()` of the locked peer already fires ONE amount-0 quote at open, and that quote carries the balance and the Max ceiling. The balance now enters the chat document only while a compose is open, and it leaves with it. `closeSendTakeover` drops the view. `setSendQuote` routes to nothing when no compose is open. ★ This gate refused the identical design for tips at §#348b: *"it would put a live balance inside the chat document, and #221 keeps chat isolated from the wallet for exactly that reason."* ⚠ V1 kept it MAJOR as a POLICY row, not a live leak. The chat document has no live HTML sink, so reading it needs a chat compromise first. **Damir's ruling, and it is needed either way.** Option one: drop the number on the two peer-locked surfaces. The sheet can take a boolean verdict C# computes. Option two: record a deliberate exception here, with the depth the tip row got. Gate 36 holds the narrowing |
| **O-02 · MAJOR · The untrusted-content marker is a one-platform contract.** `ClassId="miniapp"` is declared with a comment saying platform renderers key privilege drops on it. Before this batch, only Android read it. This is the structural cause of F-06 and of the storage rows | declared `Spixi/Pages/MiniApps/MiniAppPage.xaml`; read in `Spixi/Platforms/Android/WebViewRenderer.cs` and — new in this batch — `Spixi/Platforms/iOS/iOSWebViewHandler.cs` | **INTRODUCED** (the marker and its Android consumers are ours) | `grep -c miniapp Spixi/Platforms/Windows/WindowsWebViewHandler.cs` → **0**; the same for MacCatalyst, which registers no handler at all | ⚙ **PARTLY CLOSED.** iOS now reads it twice (`isTrustedHost`, `isMiniAppHost`), and a pin holds the literal identical in all three files. **Windows and MacCatalyst read it nowhere.** Honour the marker on all four platforms, or delete the claim in the comment (#772) |
| **O-03 · MAJOR (if the premise holds) · Windows and MacCatalyst are not storage-partitioned** — the residual of the gate's own `spixi.draft.*` row | `Spixi/Platforms/Windows/WindowsWebViewHandler.cs` (no `miniapp` branch) · `Spixi/MauiProgram.cs` (`ConfigureMauiHandlers` — no MacCatalyst registration) | **MECHANISM inherited · the content behind it is ours** | nothing constructs a `CoreWebView2Environment`, a `UserDataFolder` or a WebView2 `ProfileName`, at either revision | ⛔ **OPEN, and deliberately not forced.** Both WebView2 hooks are asynchronous and must win a race against WinUI's implicit initialization. Getting it wrong renders a mini-app page as NOTHING, silently, in a wallet app that cannot be compiled here. MacCatalyst needs a csproj compile-item change, not a `\|\|`, and it has never run. **The test that settles Windows needs no build:** open a mini-app, and in its WebView2 dev tools evaluate `localStorage.length + ' \| ' + localStorage.getItem('spixi.pins')` |
| **O-04 · MINOR · A wallet RESTORE inherits the previous account's browser storage.** `onRestore` touches five Preferences and no `spixi.*` key. `wipeLocalState` has exactly one caller, delete-account | `Spixi/Pages/Launch/LaunchPage.xaml.cs` (`onRestore`) · `Spixi/Pages/Settings/SettingsPage.xaml.cs` (`wipeEverything` — the only `wipeLocalState`) | **INTRODUCED** | the keys and the wipe are ours | ⛔ **OPEN — a C# row, no new verb:** call the existing `wipeLocalState` push on the create and restore paths. A frontend fix is unsafe, because clearing at emit time would destroy a live account's state on a FAILED restore. ⚠ **V1 downgraded it from MAJOR and found the reachable precondition nobody named.** `LockPage`'s `ixian:change` branch pushes a new `LaunchPage` WITHOUT deleting the wallet. So a user who forgets the password can restore over a live account's storage |
| **O-05 · severity follows O-03 · Nine `spixi.*` key FAMILIES embed a peer wallet address in the key NAME, and `spixi.pins` holds an address array in its VALUE.** Enumerating the store yields the contact list, which of them are pinned, and per-peer message ids (C-2) | `src/shells/chat.html` · `home.html` · `settings.html` — the key constants | **INTRODUCED** | the 27 keys are ours; the partition is legacy (MAJOR #4) | ⛔ **OPEN by design.** The shape is what the redesign needs. The REACH is what the partition decides. F-19's `forgetPeerStorage` bounds the retention, and F-23 removes the reader on iOS. ⚠ V1 ranked the partition test as the gate on four of C's MAJORs, which no auditor had done |
| **O-06 · MINOR · A peer wallet address becomes a NATIVE preference key,** and it is removed only on un-mute or a full `Preferences.Clear()` (C-5) | `Spixi/Meta/SNotificationPrefs.cs` (`muteKey`, `setContactMuted`, `isContactMuted`) | **INTRODUCED** | `SNotificationPrefs` is ours (the NOTIF family) | ⛔ **OPEN.** Not reachable by a mini-app: this is the native store, not the `file://` partition. Remove the key when the contact is removed |
| **O-08 · MINOR · No gate keeps the HTML-sink count at zero.** The suite pins `innerHTML` absence in four per-FILE places. There is no sweep over `src/components/**`, `src/shells/**` or the built output, so a new sink in any other file ships silently (E-7) | `scripts/smoke-test.mjs` (the four `!/\.innerHTML/` pins; no sweep exists) | **INTRODUCED** (the suite is ours) | — | ⛔ **OPEN. This is the row that protects the fifteen MITIGATED-BY-US narrowings below on the next commit.** One sweep with a named allow-list |
| **O-09 · NIT · `document.documentElement.innerHTML` in ALL 18 built shells,** injected by the build and present in no source file | `scripts/build-shells.mjs` (the missing-asset panel emitted at `</body>`) | **INTRODUCED** | the build script is ours | ⛔ **OPEN.** The interpolated value is a join of five compile-time literals. ★ It exists in this census only because E ran its sweep a SECOND time over the built bytes. A source-only sweep is blind to it, and so is `git diff` (O-36) |
| **O-11 · NIT · A C#→JS argument may be embedded RAW inside a JS string literal** (E-5 · B I-6) | `Spixi/Utils/Utils.cs` (`sendUiCommand` → the `raw_data_uri_ok` ternary; `isTransportSafeDataUri`) | **INTRODUCED** (#340) | the baseline base64-encoded every argument | ⛔ **OPEN, no exposure found.** ⚠ Both verifiers attacked the encoder and failed. The base64 alphabet excludes `:`, so an ENCODED value can never satisfy `startsWith('data:')`. The raw scanner rejects `'`, `\`, CR, LF, backtick and `${` from index 5. `MiniAppPage` never sets `supportsRawDataUriArgs`, so the branch is structurally unreachable for it. **What is owed is a pin on the allow-list, so it cannot be widened later.** The suite pins the ternary's shape and slices the predicate, but nothing yet fixes the accepted character set |
| **O-15 · NIT · A group roster crosses into `contact_details.html`,** a second surface for a push that already existed (B I-5) | `Spixi/Pages/Contacts/ContactDetails.xaml.cs` (`loadMembersChunk` → `addMember`) | **DOCUMENT introduced · MECHANISM inherited** | the twin is `SingleChatPage.loadContacts` = `0e85a4b8:…SingleChatPage.xaml.cs:470`, byte-identical | ⛔ **OPEN as a dial.** ⚠ **V1 downgraded it and found the half B missed.** On a blind row with an empty nick the code sets `nick = "x" + address`. So the FULL address crosses in the nick argument, while the address argument says `[Unknown]`. That is INHERITED, and both shells already blank it on display (`isPseudoAddressNick`, #370). The residual is the AVATAR, and one answer must be applied at BOTH sites, never one |
| **O-18 · MINOR · `Config.maxLogCount` 1 → 5.** Five rolling `ixian.log*` files of up to 5 MB each are retained instead of one, and the log is DevPage-rendered and shareable (G-4 · D7(a) · I-7) | `Spixi/Meta/Config.cs` (`maxLogCount`, under its own RELEASE BLOCKER marker) | **INTRODUCED — a deliberate exposure INCREASE, already recorded in the #507–#511 section** | `0e85a4b8:Spixi/Meta/Config.cs` — `maxLogCount = 1` | ⚙ **CONTRACT FIXED, VALUE OPEN.** The docblock states the only two legal pairs: 5 WITH the marker, or 1 WITHOUT it. Gate 23 encodes that pair, so the release flip passes without editing a pin, and a stale marker FAILS. ⚠ **V2 refuted G's headline** ("nothing in the pin says so"): the coupling was already documented at the other end. ⚠ **The pins were BROKEN until the #46 loop, and loop C proved it by running the release flip.** Two defects. An old `>= 5` block was still live. And gate 23's marker half read the WHOLE docblock, whose contract paragraph quotes the phrase "RELEASE BLOCKER", so the marker could never go false. The pin therefore BLOCKED the release flip. The old block is deleted, and gate 23 now reads the marker from the docblock's FIRST LINE only. ★ **This is the row to re-check before handover** |
| **O-19 · MINOR · The application log can leave the device.** `onSendLog` copies `ixian.log` to a kept `spixi-log.txt` and hands it to the OS share sheet. On Windows it writes a timestamped copy into `Downloads` with no destination dialog (F4 · G-10 · D7(b)) | `Spixi/Pages/Dev/DevPage.xaml.cs` (`onSendLog`, both legs) | **INTRODUCED** | `0e85a4b8:Spixi/Pages/Home/HomePage.xaml.cs` zipped TWO files; the DevPage route and the Windows leg are ours | ⛔ **OPEN.** ⚠ Three auditors filed one mechanism at three severities (MINOR · NIT · MINOR). **MINOR is the verified level**, because it makes every G row user-exportable in one tap. `ixian:dev` is dispatched with no `devMode` test in C#; the ten-tap gate lives in the shell |
| **O-20 · MINOR · A second global unhandled-exception hook logs the full exception** (Android) (G-5) | `Spixi/Platforms/Android/MainApplication.cs` (`OnCreate` → `AndroidEnvironment.UnhandledExceptionRaiser` → `[CRASHDIAG]`) | **INTRODUCED** | absent at `0e85a4b8` | ⛔ **OPEN, and worth keeping.** It is the only evidence for the crash family it exists for. What it carries depends on the exception, which is the F-16 class one layer up. ⚠ **Anchor corrected 2026-09-07:** the row named `Spixi/App.xaml.cs`. That file holds the OTHER hook, `AppDomain.CurrentDomain.UnhandledException`, which is the FIRST one this row is a second to |
| **O-22 · MINOR · The WebView console is mirrored into `ixian.log`,** and one shell line on that path carried a wallet address (G-7) | `Spixi/Platforms/Android/WebViewRenderer.cs` (`OnConsoleMessage`, inside `#if SPIXI_DEV_COEXIST`) · `src/shells/chat.html` (`dbg('onChatScreenReady')`) | **INTRODUCED** | absent at `0e85a4b8` | ⚙ **THE IDENTIFIER HALF IS FIXED. THE MIRROR STAYS, by design.** No shell console line carries an identifier any more, and gate 37 walks `src/shells`, `src/bridge` and `src/components` to keep it that way. ⚠ Until the #46 loop the gate walked only two of those three directories. It also rejected any argument that was not a bare identifier. Loop C defeated it twice. The mirror itself is Debug-only by default, and mini-app console output is excluded by the `ClassId` test, which is a narrowing worth keeping. ⚠ It compiles into Release if `SpixiDevCoexist` is set (O-35) |
| **O-27 · NIT for exposure, MINOR for the repo · Working captures from real devices are committed.** `crash-logcat.txt` is a 64,596,876-byte UTF-16 system-wide logcat from the maintainer's phone. It carries the device build fingerprint and an activity trace of unrelated apps (D11 · G-9 · I-8) | repo root: `crash-logcat.txt` · `mem-chats.txt` · `mem-seed01.txt` · `f5repro.mjs` · `README-FIRST.txt` · `Claude outputs/` — all still tracked, re-checked 2026-09-07 | **INTRODUCED** | `git diff --name-status 0e85a4b8..HEAD` marks every one `A` | ⛔ **OPEN — Damir's `git rm --cached`.** ★ Not a credential leak: two auditors searched the decoded file independently, and V1 re-ran the search a third time on the 64 MB file. `ixian:unlock:` / `create:` / `proceed:` / `changepass` / `walletpass` / `spixi.draft` → **0**. `ixian:restore:` → 4, each truncated at the colon by `logVerbName`. Of 54 base58-shaped tokens the only non-class-name one is a Play Store id |
| **O-28 · MINOR · Windows no longer locks when the app leaves the foreground.** `locksOnBackground` is compiled `false`; the replacement is 10 minutes of session-wide input idle (D4 · I-4) | `Spixi/App.xaml.cs` (`locksOnBackground`, and the `OnResume` lock condition) · `Spixi/Platforms/Windows/SDesktopIdle.cs` | **INTRODUCED** | `0e85a4b8:Spixi/App.xaml.cs` — `OnResume` locked with no platform test | ⛔ **OPEN as a RULED POSTURE, not an oversight.** Damir chose the signal and the dial (#505, and the §2026-08-25 section above). It is written here so it is not mistaken for a defect. Between the two behaviours sits a window in which a desktop the user walked away from still shows chats and the balance |
| **O-29 · MINOR · The Android app lock is suppressed for up to 5 minutes after the app launches its own picker or save intent** (D5) | `Spixi/App.xaml.cs` (`noteOwnIntentRoundTrip` / `consumeOwnIntentSuppression`), set from `Platforms/Android/SFilePicker.cs` and `SFileOperations.cs` | **INTRODUCED** | absent at `0e85a4b8` | ⛔ **OPEN.** One-shot and time-bounded, and the file's own comment names the residual. Cut the window to the order of the round trip it exists for |
| **O-30 · NIT · A new OS reach: session-wide input-idle monitoring on Windows** (D6) | `Spixi/Platforms/Windows/SDesktopIdle.cs` (`GetLastInputInfo`, `idleFor`, the clamp) | **INTRODUCED** | `git grep -c GetLastInputInfo 0e85a4b8` → 0 files | ⛔ **OPEN, no content exposure.** A tick count, compared against a clamped threshold and discarded. ⚠ One #772 defect, still present at 2026-09-07: `idleFor`'s docblock says a failed call "fails SAFE: no idle, no lock". For a LOCK that direction fails OPEN. One word |
| **O-31 · MINOR · iOS now registers for APNs,** so a device token plus OneSignal's device metadata and the device IP reach a third party from iOS (D8) | `Spixi/Platforms/iOS/Entitlements.plist` (`aps-environment`), wired through `Spixi/Spixi.csproj` (`CodesignEntitlements`) | **INTRODUCED** | `git ls-tree 0e85a4b8 -- Spixi/Platforms/iOS` has no `Entitlements.plist` | ⛔ **OPEN, and it is the intended feature.** The value is `development`, which is wrong for TestFlight or the App Store. Only a real signing run proves which the release pipeline uses |
| **O-32 · MINOR · Android initialises the OneSignal SDK in `Application.OnCreate`,** before any screen exists, including on a first install (D9) | `Spixi/Platforms/Android/MainApplication.cs` (`OnCreate` → `registerEarly`) · `Spixi/Platforms/Android/SPushService.cs` (`ConsentRequired` immediately before `Initialize`) | **INTRODUCED** | baseline `MainApplication` has no `OnCreate` | ⛔ **OPEN, mitigated but NOT compile-verified.** The file records that the container had no NuGet egress and that the property form could not be read from the SDK surface. One fresh-install test settles it |
| **O-33 · MINOR · Android DOM storage was explicitly OFF at the baseline and is now ON** for every non-mini-app WebView. It is the ONE WebView setting that changed on any platform (D3) | `Spixi/Platforms/Android/WebViewRenderer.cs` (`OnElementChanged` → `DomStorageEnabled = … != "miniapp"`) | **INTRODUCED** | `git show 0e85a4b8:…/WebViewRenderer.cs` → `DomStorageEnabled = false;` — explicit, not a default. The other 12 settings are byte-identical | ⛔ **OPEN by design.** The redesign needs it, and the mini-app gate lands in the same line. It is what makes O-05 possible, and what makes the vendored library's key writable (O-41) |
| **O-34 · NIT · Two DEBUG-only WebView exposures, one of them process-wide.** `SetWebContentsDebuggingEnabled` is a static Android call, so it exposes EVERY WebView in the process, the mini-app one included (D13 · I-10) | `Spixi/Platforms/Android/MainActivity.cs` (`OnCreate`, `#if DEBUG`) · `Spixi/Platforms/iOS/iOSWebViewHandler.cs` (`ConnectHandler`, `#if DEBUG` → `Inspectable`) | **INTRODUCED** | absent at `0e85a4b8` | ⛔ **OPEN, Release-clean by construction.** `DEBUG` is defined only by `$(Configuration) == Debug`. Keep the guards |
| **O-35 · NIT · A Release build can be told to compile the dev harness in.** `SpixiDevCoexist` is settable on any configuration, and the csproj sanctions it for "a real-behaviour Release test build" (D14) | `Spixi/Spixi.csproj` (the `SpixiDevCoexist` PropertyGroup → `SPIXI_DEV_COEXIST`) | **INTRODUCED** | baseline defines no custom symbol at all | ⛔ **OPEN — a build-pipeline decision.** It compiles in the seed harness, its two verbs, and the WebView-console-to-log forwarder (O-22). A release gate could refuse the symbol outright |
| **O-36 · MINOR · The code that actually runs on the device is excluded from `git diff`.** `.gitattributes` marks the built shells and the generated JS/CSS `-diff` (I-5) | `.gitattributes` (the `Spixi/Resources/Raw/html/*.html` and `spixi.*.js` / `spixi.*.css` rules) | **INTRODUCED** | absent at `0e85a4b8` | ⛔ **OPEN, and ⚠ V2 elevated it: read it as a PRECONDITION of this sweep, not as a row.** Verified empirically: `git diff 0e85a4b8..HEAD --stat -- …/chat.html` reports `Bin 20016 -> 687820 bytes, 0 insertions, 0 deletions`. The brief told all nine auditors to derive their rows from the diff. Anyone who obeyed it literally was blind to the shipped shells. Row O-09 exists only because one auditor swept the built bytes anyway |
| **O-38 · NIT · A second host was added on the WebView-name→filesystem surface.** The downloads open and delete pair was copied onto `SettingsPage` (H-2) | `Spixi/Pages/Settings/SettingsPage.xaml.cs` (`onNavigating` → `ixian:openDownload:` / `ixian:deleteDownload:`) | **INTRODUCED** (the second host is ours, S16a / #267) | the first host is baseline | ⛔ **OPEN, no code change proposed.** Both hosts route through the ONE resolver, `TransferManager.resolveDownloadPath`, which H attacked item by item and could not defeat. The row exists so the gate records the surface |
| **O-40 · MINOR · The wallet-password grammar gained a SECOND host page, and that page's WebView now PARKS instead of being disposed** (A-8) | `Spixi/Pages/Settings/SettingsPage.xaml.cs` (`onNavigating` → the `ixian:changepass:` branch) | **HOST and LIFETIME introduced · the GRAMMAR inherited** | `git show 0e85a4b8:…/EncryptionPassword.xaml.cs` — the same `ixian:changepass:` split on the same delimiter | ⛔ **OPEN, no code change, and the pin question is SETTLED.** ⚠ A left it open; V1 read the suite. PIN 5 and PIN 5b are BEHAVIOURAL. They fill the three fields, then assert every value is empty after a hardware-back leave AND after a peer-nav PARK. The park is the case that matters. The branch's own guards are stronger than the baseline's. CLAUDE.md's "do not extend the password-over-URL pattern" is the standing rule this row records |
| **O-41 · NIT · Android now writes the vendored library's key.** Turning DOM storage on (O-33) also turned it on for `scan.html`, which loads the byte-identical vendored scanner (C-8) | `Spixi/Platforms/Android/WebViewRenderer.cs` (`DomStorageEnabled`) → `Spixi/Resources/Raw/html/js/html5-qrcode.min.js` (`HTML5_QRCODE_DATA`) | **REACH introduced · the WRITER inherited** | the library is byte-identical at `0e85a4b8`; DOM storage was off, so the key could not be written on Android | ⛔ **OPEN, content is a camera device id.** F-20 makes the wipe reach it |

**Also introduced, and already recorded above rather than re-filed:** `SNotificationServiceExtension`'s
pre-screen push reach (D10) is the ★ REACH INTRODUCED row in the #507–#511 section. D's own
re-walk confirms the enumeration there. The only wire-controlled values read are
`AdditionalData["fa"]` and the notification id, and both are string-only. The notification-tap
sink they feed is byte-for-byte the baseline sink.

## The rows — MITIGATED-BY-US

These are exposures that DO exist at the baseline and that the redesign made narrower. They
belong in the handover note, because his read should be "they tightened things".

| Finding | file:line | Verdict | Evidence at `0e85a4b8` |
|---|---|---|---|
| **M-01 · Fifteen HTML-sink narrowings in the chat surface alone.** The list: peer message text · the numeric-character-reference XSS the baseline's `escapeParameter` lookahead let through · the linkify markup, which put the peer URL in an `onclick` AND in unescaped inner text · the external-link modal built from HTML · display-versus-target spoofing in the link label · the peer NICKNAME at four sites · the remote BOT DESCRIPTION · the channel name · the downloaded FILE NAME inside an `href` and an `onclick` · the dev log and the dev HUD · the app capability strings · a peer WALLET ADDRESS concatenated into an inline `onclick` for kick and ban · the payment status strings · the reactions built with `innerHTML +=` | `src/components/message-bubble.js` · `chatlist-item.js` · `member-sheet.js` · `topbar.js` · `chat-info.js` · `channel-sheet.js` · `settings-app.js` · `typed-bubbles.js` · `reactions.js` · `apps-details.js` · `modal.js` | **MITIGATED-BY-US** | `0e85a4b8:Spixi/Resources/Raw/html/js/chat.js` (`addText`, `linkify`, `onExternalLink`, the nick sites, `addAppRequest`, the status and reaction writers) · `js/spixi.js` (`escapeParameter`) · `downloads.html` · `dev.html` · `app_details.html` |
| **M-02 · The bot `serverDescription` moved from `innerHTML` to `textContent` with a length clamp.** ★ **No auditor filed this** — V1 found it while cross-checking B's "inherited unchanged" verdict on the same push. It is remote-server HTML injection into the chat WebView, closed by the redesign | `src/shells/chat.html` (`setChatMode` — the description is stored as a clamped string) | **MITIGATED-BY-US** | `0e85a4b8:…/js/chat.js` — `document.getElementsByClassName("spixi-bot-description")[0].innerHTML = …` |
| **M-03 · Cancel-first on all 19 `onNavigating` handlers, verified per handler rather than assumed.** Every handler sets `e.Cancel = true` immediately after the decode and re-allows exactly one thing at the tail: its own `file:` document load. 19 `e.Cancel = false` sites in the whole tree, one per handler | every `Spixi/Pages/**` page with an `onNavigating` handler | **MITIGATED-BY-US** | **Five baseline handlers had no cancel-first at all** — `OnboardPage`, `LaunchCreatePage`, `LaunchPage`, `LaunchRestorePage`, `LockPage`, and that last one parses `ixian:unlock:<password>`. Several baseline handlers ended with `else { e.Cancel = false; return; }`, an allow-by-default for every unknown scheme |
| **M-04 · The mini-app WebView can no longer act on call state through the shared dispatcher,** and call state now reaches exactly ONE document | `Spixi/Utils/SpixiContentPage.cs` (`onNavigatingGlobal`, the `acceptsCallPushes` gate) · `Spixi/Pages/MiniApps/MiniAppPage.xaml.cs` (`acceptsCallPushes => false`) | **MITIGATED-BY-US** | `git show 0e85a4b8:Spixi/Utils/SpixiContentPage.cs` `onNavigatingGlobal`: three branches, **no gate of any kind** — a mini-app document could emit `ixian:hangUp:` and tear down a live call. ⚠ One residual is INHERITED: `onAppAccept`'s fall-through has no `acceptsCallPushes` check |
| **M-05 · The downloads open and delete verbs gained a real traversal guard, and `ixian:qrresult:` lost its `Contains` shape on the scanner's own page** | `Spixi/Data/TransferManager.cs` (`resolveDownloadPath`) · `Spixi/Pages/Scan/ScanPage.xaml.cs` (`onNavigating`) | **MITIGATED-BY-US** | the baseline branches composed `Path.Combine(downloadsPath, file_name)` from the verb payload with no check; `git grep -n 'resolveDownloadPath' 0e85a4b8` → no hits. H attacked the guard with ten escape shapes and could not defeat one |
| **M-06 · A native confirm now precedes EVERY WebView-composed signature,** with an optional biometric step that fails closed, and the peer-locked surfaces cannot propose a different payee (`expectedRecipient`) | `Spixi/Utils/SPayments.cs` (`confirmAndAuth`, and the `expectedRecipient` guard) | **MITIGATED-BY-US** | the baseline confirm was a WebView page on one flow and absent on others; there was no biometric gate and no expected-recipient test |
| **M-07 · Nothing pushes to a document that does not own the data.** 250 of 281 push sites target `this`. Each of the other 31 is type-guarded to a single class, or argument-free, or a single-argument theme sweep whose enumerator excludes untrusted pages. **There is no broadcast of data in the tree** | `Spixi/Utils/UIHelpers.cs` (`getLiveShellPages`'s `hasGeneratedContent` filter) · `Spixi/Utils/SpixiContentPage.cs` | **MITIGATED-BY-US** | the three `broadcast*` methods now target one page (`CallPage`), which is #272-ours |
| **M-08 · The pre-warmed chat WebView cannot receive another peer's data,** and it refuses to warm while a lock is staged | `Spixi/Utils/SpixiContentPage.cs` (`warmSpareChat` / `pushSpareChat` / `dropSpareChat`) · `Spixi/Pages/Chat/SingleChatPage.xaml.cs` (the `friend == null` drop branch) | **MITIGATED-BY-US** | the whole pre-warm is new (#800); the guards are what keep it from becoming a row |
| **M-09 · The log share carries ONE file, not two,** and the launch merge dispatches on an anchored verb so a password containing `ixian:create:` cannot select the create branch | `Spixi/Pages/Dev/DevPage.xaml.cs` (`onSendLog`) · `Spixi/Pages/Launch/LaunchPage.xaml.cs` (`onNavigating`) | **MITIGATED-BY-US** | `0e85a4b8:Spixi/Pages/Home/HomePage.xaml.cs` zipped `ixian.log` **and** `ixian.0.log`; the baseline launch pages were four separate documents |
| **M-10 · Android mini-apps are cut out of the storage partition, in the same batch that filled it,** and the mini-app console is not forwarded into `ixian.log` even in the dev build | `Spixi/Platforms/Android/WebViewRenderer.cs` (`DomStorageEnabled` and `OnConsoleMessage`, both keyed on `ClassId != "miniapp"`) | **MITIGATED-BY-US** | the gate is new. ⚠ **It exists on Android only** — that is row O-02 |
| **M-11 · The privacy shield, the lock grace fix, the notification deep link under a lock, and the FileProvider authority** | `Spixi/App.xaml.cs` (`OnSleep` → `showPrivacyShield`, `LOCK_GRACE_SECONDS`, `markBackgrounded`) · `Spixi/Platforms/Android/MainActivity.cs` (`tryNavigateToChat`) · `AndroidManifest.xml` (`${applicationId}.provider`) | **MITIGATED-BY-US** | `0e85a4b8:Spixi/App.xaml.cs` — `ts.Seconds > 5`, the 0–59 COMPONENT, so 63 seconds away read as 3 and never locked; no privacy shield existed; the authority was hard-coded |

## The rows — INHERITED

These go to the BE engineer untouched, with their anchors, so his pass is a review and not a
discovery exercise. **Nine were not filed anywhere before this sweep. They were written into
`docs/security-review-for-be-engineer.md` in this same session,** in a new section titled
"2026-09-06 handover sweep — INHERITED rows", and indexed from `docs/be-cutover-brief.md`.

| id | Finding | file:line |
|---|---|---|
| **H-6** | A mini-app's free JSON `t` field reaches `Path.Combine` and then `File.Open(FileMode.Create)`. `t = "../../wallet.ixi"` truncates the wallet. No capability gate, no prompt. ★ **Added to the BE blocker list** | `Spixi/MiniApps/MiniAppActionHandler.cs` (`processStorageSet`) → `Spixi/MiniApps/MiniAppStorage.cs` (`getStorageCache` / `writeStorageData`) |
| **H-7** | The mini-app install filename is the last `/`-segment of a downloaded manifest URL, unvalidated, and it is written to. Reachable from a peer's chat invite | `Spixi/MiniApps/MiniAppManager.cs` (`installFromUrl`, the `contentUrl` segment) |
| **H-8** | The native picker's display name is combined into a path and written to. Android is the only platform that skips `Path.GetFileName` | `Spixi/Pages/MiniApps/AppNewPage.xaml.cs` (`onSelectAppFile`) |
| **H-9** | `MAJOR #10`'s unvalidated `app.id` reaches four more path sinks than the one already filed — the entry point, the icon read, the install destination and the storage directory. ONE validation at install closes all of them | `Spixi/MiniApps/MiniApp.cs` (`case "id"`) and its four consumers |
| **H-10** | The Android FileProvider publishes the whole `files/` tree, which turns the S16 residual from a write into a read grant | `Spixi/Platforms/Android/Resources/xml/provider_paths.xml` |
| **G/I-1** | One log line carries a peer's MESSAGE TEXT, their wallet address and the file path together, in a file the user can share in one tap | `Spixi/Data/TransferManager.cs` (the prepare-file-transfer catch) |
| **C-12** | No storage partitioning on Windows or MacCatalyst — see row O-03 for the state after this batch | `Spixi/Platforms/Windows/WindowsWebViewHandler.cs` · `Spixi/MauiProgram.cs` |
| **D24 / D25** | `NSAllowsArbitraryLoads = true` on both Apple targets, and MacCatalyst registers NO WebView handler at all, so it has no navigation block, no allow-list, no camera gate and no partition | `Spixi/Platforms/iOS/Info.plist` · `Spixi/Platforms/MacCatalyst/Info.plist` · `Spixi/MauiProgram.cs` |
| **I-1 (nuget)** | Indexed in that section for the engineer's benefit, but ★ it is OURS and it is FIXED — see row F-21 | `nuget.config` |

**Inherited classes the sweep confirmed and did NOT re-file.** Each is already in the BE
document.

* Android MAJOR #8 — a mini-app WebView can XHR-read `wallet.ixi`.
* MAJOR #9 — `OnPermissionRequest` auto-grant.
* MAJOR #4 — the shared `file://` partition.
* MAJOR #10 — `MiniAppManager.remove`.
* MAJOR #8 — `HttpUtility.UrlDecode` turns a `+` into a space in the wallet password.
* #234 — the resume-lock Cancel bypass.
* A1 / L8 — cleartext `Preferences["walletpass"]`.
* L2 — passwords ride navigation URLs. ⚠ Still OPEN. The PARSES are deliberately unchanged,
  because live wallets were encrypted under today's behaviour.
* L6 — restore mutates before verifying.
* S16 residual — receive-time `transfer.fileName` into a path.

**Inherited rows the sweep enumerated within its own classes, for completeness.** Each line is
one row.

* Twelve `Contains("ixian:` dispatch branches, all with byte-matching baseline twins. A traced
  every hijack path. The only free-form payloads that sit below one are non-destructive. Every
  money, delete or filesystem verb uses `StartsWith` plus Ordinal, and sits above the block.
* `MiniAppPage`'s seven verbs, byte-identical to the baseline.
* The mini-app SEND_PAYMENT confirm.
* `localizeHtml`'s unescaped `*SL{}` substitution.
* `updateDebugOverlay` composing HTML in C#.
* The vendored `html5-qrcode.min.js` and its eight `innerHTML` writes. It is byte-identical
  (sha256 `660b1243…f8b1d8e` at both revisions).
* The IDN homoglyph host in the link label.
* Windows `AreDevToolsEnabled` for every WebView.
* The remote update string.
* The price-service poll.
* The mini-app publisher POST to a publisher-chosen URL.

## What the sweep REFUSED to find

**The gate's promise is a negative, so this section carries as much of its value as the rows
do.** Every line below comes from a MECHANICAL WALK, not from a list an auditor chose first
(#798), and every line names the walk. Only refusals that no verifier defeated are listed.
Where a verifier attacked one and it held, that is said.

**The verb and dispatch surface (class A).**

* **No orphaned emitter.** All 135 verb tokens the shipped shells contain have a C# dispatch literal. The four that looked orphaned were opened individually and are docblock prose.
* **No dead dispatch branch parses a password, and none is reachable from untrusted content.** All 14 unemitted literals were enumerated and each host was read. The four password branches live on `LockPage`, `LaunchPage`, `SettingsPage` and `EncryptionPassword`, none of which hosts untrusted content.
* **No verb payload becomes a filesystem path.** Every branch that touches the filesystem was walked. Downloads route through `resolveDownloadPath`. `ixian:openfile:` looks the transfer up and uses the path C# owns. The pickers are native. `ixian:language:<code>` is gated on the shipped `languages` list. ⚠ V1 re-ran this refusal with its own patterns and could not defeat it.
* **No verb payload reaches a key, a seed or the wallet file.** The only WebView token that reaches wallet storage is the password on the four inherited password branches.
* **No hijack path from a crafted payload to a destructive, money or filesystem branch.** V1 printed the whole branch ORDER of the two handlers that mix `Contains` with `StartsWith`. Every `Contains` branch sits ABOVE the free-form payloads. So the only consequence is a downgrade, never an escalation.
* **No new custom scheme and no non-`ixian:` channel to native.** The evidence: 15 navigation-assignment lines, every one the shared bridge sink · zero scheme-bearing anchors in the 18 shipped documents · zero `<form>` elements. `bridge.send` itself throws unless the command starts with `ixian:`.
* **No verb payload is interpolated into an `EvaluateJavaScript` string.**

**The push surface (class B).**

* **No JS injection through `sendUiCommand`.** V1 attacked the encoder three ways and failed each time. The base64 alphabet excludes `:`, so an encoded value can never be read as raw. The two `startsWith('data:')` tests are the same test. The raw scanner rejects every quote, backslash, newline, backtick and `${`.
* **No push carries a password, a private key, a seed phrase or wallet-file bytes.** Ten hits on the secret-name sweep, all reads: a status flag, two bools, a dev-only sentence of integers, and the mini-app's own key.
* **`Utils.imageToDataUri` cannot be steered into reading an arbitrary file.** This was the strongest hypothesis of the class — C# opening a path and base64-ing it into a document. All 22 arguments were traced, and for the two a remote party influences, all five construction paths behind them. H re-derived the same conclusion independently.
* **Nothing pushes to a document that does not own the data** (the M-07 walk). **The batch transport weakened nothing.** `BATCH_ALLOW` is a literal `Set`, tested BEFORE the handler lookup. Every argument is `String()`-coerced. The interning table cannot confuse a message body with an index.
* **No push service, notification path or platform helper reaches a WebView.** `window.SPIXI_ENV` is never injected by C# at all.

**Client storage (class C).**

* **No second browser-storage mechanism exists.** `sessionStorage`, IndexedDB, cookies, CacheStorage and service workers, WebSQL, `navigator.storage`, the File System Access API — **0 hits each** over `src/` and the built shells.
* **No cross-document channel is used as a store.** `BroadcastChannel`, `SharedWorker`, `window.name`, `history.pushState`/`replaceState`, `postMessage` — 0 hits each.
* **No key our own code writes is unprefixed** — 29 constants, all `spixi.*`. **No secret is in browser storage** — all 28 write expressions were classified. **No message HISTORY is cached.** The exdel hint's value is `{del, t, kind}`, which is the #254 ruling holding.
* **No WebView-supplied string reaches a native store as a key name.** All five call sites pass a resolved `Friend`'s address, never a verb argument.

**Platform configuration (class D).** Each of these was diffed line by line, not counted.

* **No Android permission was added or removed** — 13 `uses-permission` and 6 `uses-feature` at both revisions, the same ones, in the same order.
* **No new exported component, intent filter, service, receiver or provider.** One `android:exported` in the tree, value `false`.
* **No cleartext-traffic flag, and no linker, trim, AOT or Release-only build setting was changed** — ten property names swept, 0 hits in either revision.
* **No iOS or MacCatalyst `Info.plist` change at all** — `git diff --stat` over both is empty.
* **No JavaScript bridge object was added.** `AddJavascriptInterface`, `JavascriptInterface`, `AddHostObjectToScript`, `AddScriptToExecuteOnDocumentCreated`, `SetVirtualHostNameToFolderMapping`: 0 at HEAD and 0 at baseline. The bridge stays navigation-based.
* **No file-chooser, download, window-open, JS-dialog, geolocation, SSL-error or HTTP-auth handler exists on any platform**, at either revision. ⚠ **Read that with the two handlers that DO exist, because the sentence otherwise reads as "this WebView has no handlers"** (#46 loop C, NIT-3). `Spixi/Platforms/Android/WebViewRenderer.cs` overrides **`OnPermissionRequest`** — `request.Grant(request.GetResources())`, unconditional — and **`ShouldInterceptRequest`**, which sees every subresource request. Those two carry real authority. One decides camera and microphone for a WebView document, which is exactly what row F-06 closed on iOS. Both are byte-identical at the baseline, and both are filed elsewhere (MAJOR #9, and `Utils.IsAllowedURL`). So this is a PROSE gap and not a missed exposure. It was the one sentence in this section written from a list instead of from a walk of the overrides.
* **No cookie policy change and no user-agent change. No screenshot or recents hardening was added or removed.**
* **The navigation allow-list was not widened** — `Utils.IsAllowedURL` is byte-identical, regex included.
* **No new page hosts remote content.** Every WebView the redesign added loads a local `ll_*.html`.
* ⚠ **One refusal in this class is now DEFEATED BY OUR OWN FIX. It is written down rather than quietly dropped.** D refused "no WebKit data-store change" — `WKWebsiteDataStore` and `WKProcessPool` were 0 in both revisions. That was true when the walk ran. **This batch adds one on iOS, deliberately. See row F-23.**

**HTML sinks (class E).**

* **Zero hits for each of these, over source AND over the 22 shipped artefacts:** `eval` · `new Function` · a string-argument timer · `srcdoc` · `<iframe>` · `<object>` · `<embed>` · `<form>` · `outerHTML` · `insertAdjacentHTML` · `document.write` · `createContextualFragment` · `srcset` · a computed attribute name · a remote resource in CSS.
* **No `javascript:` or `vbscript:` URL can leave linkify.** ★ This is not asserted from the regex. V2 drove 11 hostile inputs through the SHIPPED bundle: case variants · tab-split and leading-space schemes · `data:text/html` · a raw `<img onerror>` · the numeric-character-reference form that WAS the baseline's XSS · the `paypal.com@evil.com` spoof. **0 of 11 produced a parsed element or a non-`http(s)` href.**
* **No icon name and no SVG body can come from data.** All 52 non-literal `icon(...)` call sites were enumerated. Each is a ternary between literals, or an index into a component-local map. The sink degrades to the text `"undefined"` on a prototype key.
* **Highlighting and mention splitting cannot inject** — both walk text nodes only and emit `textContent`.
* **The one sink that takes remote text is inert, and it was TESTED, not read.** `home.html`'s `_entityTa.innerHTML = s` uses a detached `<textarea>`, whose content is RCDATA: jsdom gives `children.length === 0` against `1` for the same string in a `<div>` control.
* ⚠ **One refusal must be read with a correction.** E's headline — "no peer data reaches any of the `innerHTML` sites" — HOLDS. But E does not mention the platform allow-list. A reader of E alone would over-scope F-01. A reader of F alone would under-weight the frontend widening. **They must be read together.**

**Network (class F).**

* **No scripted request exists in the shipped frontend.** 0 `fetch`, `XMLHttpRequest`, `sendBeacon`, `EventSource`, `WebSocket` or dynamic `import()` across all 21 shipped files, counted per file. Whatever the shells leak, they leak through ELEMENTS.
* **Link preview and OpenGraph unfurl are genuinely absent, not merely policy.** No fetch exists to perform one. `linkPreview` has no caller outside the component that renders it. C# does not unfurl either.
* **The apps Discover feed makes no request** — the URL constant ships and is passed to nothing.
* **No remote CSS, font or `@import`; no `<video>`, `<audio>` or `<source>`; no `window.open`.** The only `<video>` is created by the vendored QR library from a local stream.
* **The QR path makes no network request,** and its one dynamic `<script src>` is a relative literal.
* **No `WebView.Source` can be aimed at a remote host** — all 11 assignments resolve to `file://`.
* **No raw socket, DNS lookup or WebSocket is opened from `Spixi/`.**
* **No wallet address, key, password or seed is placed in any URL that leaves the device.** There are two exceptions, both inherited: the first-party explorer links. They carry the user's own public address, by design, and only on a tap.

**Logging (class G).**

* **No password VALUE is logged.** The secret-name sweep returned 17 hits and every one is a localization, config or preferences key NAME. F-08 was the only password exposure in the class, and it was a URL, not a variable.
* **No key or seed material is logged.** The one alarming hit is inside a block comment and is present verbatim at the baseline.
* **No `Debug.WriteLine`, `Android.Util.Log` or `NSLog` call was added.**
* **The log content cannot become script in the dev screen** — `setLog` routes to `pane.textContent`.
* **The dev console mirror carries no mini-app output.** `getBool` and `setBool` never receive a key that embeds an address. All nine call sites pass a compile-time constant.
* **iOS does not expose `ixian.log` through the Files app** — neither `UIFileSharingEnabled` nor `LSSupportsOpeningDocumentsInPlace` exists, at either revision.
* **No new log line prints a nickname,** and **`Config.logVerbosity` was not raised** — the growth in log volume is entirely the new call sites.

**Filesystem paths (class H).**

* **`resolveDownloadPath` holds against every escape H could construct.** The attacks: an absolute path · `..` anywhere, including mid-name · single- and double-URL-encoded separators · an alternate data stream · a name that is only dots · a directory part · an over-long name · four Unicode look-alike separators. Each attack is listed with the clause that stops it. V2 accepted this rather than re-deriving it, and spent its budget on F-12 instead.
* **`imageToDataUri` cannot be steered**, re-derived independently of class B.

**Everything else (class I).**

* **No deep link, no custom URL scheme, no intent filter, no exported component, no share target.**
* **Zero C# clipboard calls, at either revision.**
* ⚠ **THIS REFUSAL WAS FALSE, AND IT IS CORRECTED HERE** (#46 loop C, MINOR-8). It read "zero reflection sites in `Spixi/`". The truth: **one reflection site, and it is INTRODUCED.** `Spixi/Pages/Home/HomePage.xaml.cs`, the `paneDivider.HandlerChanged` handler inside the `#if WINDOWS` block, calls `typeof(Microsoft.UI.Xaml.UIElement).GetProperty("ProtectedCursor", …)` and then `prop?.SetValue`. `git grep -l "Reflection" 0e85a4b8 -- Spixi` returns nothing, and DECISIONS #242 records adding it. **The exposure is nil.** The member name is a compile-time literal. The value is a cursor. The block is Windows-only, and the whole thing is wrapped in `try`/`catch`. The finding is the REFUSAL, not the code. A refusal that one grep defeats is the worst kind of gate text. The engineer reads it as "reflection is not a surface here", and stops looking.
* **The three files holding every `JsonConvert.DeserializeObject` call diff clean against the baseline.**
* **The money-path field test, run mechanically rather than on the four sites the auditor expected.** Every place a transaction can be produced was enumerated. Every one has a native confirm before the signature. The confirm shows four fields: amount, fee, recipient and payee name. **Amount and fee PASS.** `amountToLocalizedDisplayString` never rounds, and the fee is computed after the resolve, from the same values that are signed. The other two fields failed, and became rows F-13 and F-14.
* **The dev symbol gates code ON, never a protection OFF** — all guarded sites opened and read.
* **The build scripts carry their own gates.** They are: a NUL integrity gate · a destructure preflight · short-write gates · a legal-document hold-marker gate that re-asserts after the bake.

**⚠ One refusal must be read with its opposite number, and this is the correction V1 made.**
Class A refuses that "the redesign widened the mini-app verb surface by nothing", and that is
TRUE. `MiniAppPage`'s seven verbs are byte-identical to the baseline's. The two verbs added to
the shared dispatcher are gated on `hasGeneratedContent`, which is false for it. But class D
shows the same WebView GAINED camera and microphone (F-06) and, on three platforms, the shells'
storage partition (O-03). Read alone, class A reads as net-narrowing for mini-apps. **The truth
before this batch was net-widening.** After F-06, F-11 and F-23 it is narrowing again on Android
and iOS, and unchanged on Windows and MacCatalyst.

## What could not be settled here — one test each

| what | the ONE test that settles it |
|---|---|
| **O-03** — do a mini-app document and a shell share one `localStorage` origin on Windows? | Open a mini-app; in its WebView2 dev tools (already enabled) evaluate `localStorage.length + ' \| ' + localStorage.getItem('spixi.pins')`. Non-zero or non-null = live. The same run answers whether `MiniAppPage` renders on Windows at all |
| **F-07** — does WebKit match `url-filter` as a substring? | Build for iOS, receive a chat message whose whole text is `https://<a host you control>/x.gif?u=https://a.tenor.com/y`, and watch that host's access log |
| **F-12** joints 1 and 2 — does .NET on Unix keep a `\` in an extracted entry NAME? | On a Mac or Linux box with the SDK: `ZipFile.ExtractToDirectory` an archive with an entry named `..\x.txt`, then print `Directory.EnumerateFiles(dir)` and `Path.GetFileName` of the result |
| **F-12** end to end | Restore a backup carrying one extra entry named `..\html\marker.txt`, with the RIGHT password; `<spixiUserFolder>/html/marker.txt` must not exist afterwards |
| **F-06** on hardware | A mini-app calling `getUserMedia({video:true,audio:true})` on an iPhone that has scanned a QR once. It must be refused, and the refusal word must appear in the log |
| **F-01 / F-07** end to end after the fix | One message from a second account whose whole text is a URL on a non-allow-listed host. No tile may render, and no request may reach that host |
| **F-21** — does the restore still work? | One android or ios restore AND one Windows restore. `NU1100` means the mapping excluded a needed source; a returning `NU1603` means the local feed was not consulted |
| **O-01** — the live balance in the chat document | Damir's ruling. Either it goes, or it gets a gate row with the depth the tip refusal got |
| **O-18** — `maxLogCount` | Damir's release call. The contract now lets the flip pass without editing the pin |
| **O-27** — the committed device captures | Damir's `git rm --cached` |
| **O-32** — the OneSignal consent gate | Fresh Android install, onboarding not finished: does any request leave the phone? |
| **O-04 / O-06** — how much to forget | Damir's call. Deleting the per-address families on removal changes observable behaviour if a contact is later re-added |
| **A-7 / F-09 / F-10** — does the sink `Utils.openExternal` wraps, `Browser.Default.OpenAsync`, dispatch a non-`http` scheme at all? | `ixian:openLink:javascript://x` from a dev build on Android, iOS and Windows. It decides whether the added allow-list was a live vector or defence in depth |
| **`resolveDownloadPath`** and Windows reserved device names | On Windows, print `Path.GetFullPath(Path.Combine(downloadsRoot, "CON"))`. If it returns `\\.\CON` the guard already rejects it. NIT either way |
| **H-6** on a device | A mini-app sending `STORAGE_SET` with `t = "../../probe.txt"`. ⚠ Do NOT test it against a wallet that holds anything — `FileMode.Create` truncates |
| **F-13**'s visual reach | Set a contact nickname to 40 lines, open the in-chat Pay compose, and screenshot the confirm on all three platforms. The clamp should make this moot; confirm that it does |

---

## Session T addendum — two verb RELOCATIONS onto HomePage (2026-09-08)

Damir reported, twice, that **Add contact** and **Add app** still stutter. Both pushed a C#
page with its own WebView; the screens now mount inside the home shell, so four verbs moved
to `HomePage.onNavigating`. Run through the gate's one question — *does this exposure exist
at the baseline?* — before the code was written.

| verb | what it reaches | verdict |
|---|---|---|
| `ixian:checkAddress:` | `ExtendedAddress` parse + `FriendList.getFriend` | **INHERITED.** Read-only, no I/O. The body did not change — both hosts now call `ContactNewPage.answerCheckAddress`, one truth |
| `ixian:request:` | `FriendList.addFriend` + `StreamProcessor.sendContactRequest` | **INHERITED.** `ContactNewPage.addContactCore` is the same code, moved to a static. **Nothing is signed** — a contact request is a stream message, not a transaction (SECURITY.md) |
| `ixian:fetch:` | ★ `MiniAppManager.fetch(url)` → `extractAppInfo` — **the network** | **INHERITED, RELOCATED.** The same user-typed URL, the same fetch, the same parse; only the host page differs. It is NOT the forbidden class in `CLAUDE.md` ("auto-fetch remote resources that leak IP without the media-autoload gate") — nothing here is automatic, the user types or scans a link and presses Get app. ⚠ Flagged anyway because a fetch site moving onto the page that also hosts the chats list is a widening of *where*, and the reviewer should say so out loud rather than find it |
| `ixian:selectAppFile` | `SFilePicker` → temp file → `extractAppInfo` | **INHERITED, RELOCATED.** ⚠ Carries a pre-existing hazard unchanged: `Path.Combine(tmpPath, name + ".tmp")` where `name` is the **picker-supplied filename**. The picker is native, not the WebView, so this is not the `CLAUDE.md` "WebView-supplied path" rule — but it is the same shape, it is **legacy**, and moving it does not fix it. Left exactly as found, named here so it is not mistaken for ours |

**Nothing new is rendered.** Both app paths hand their result to `AppDetailsPage`, as before.
No new storage key, no new HTML sink, no new log line carrying a payload — the two new error
logs print `ex.GetType().Name` only (sweep G-3: Ixian-Core's `Address` constructor formats the
whole base58 token into its exception text).

★ One genuinely NEW push, and it removes a guess rather than adding reach: `onRequestResult`.
The standalone page answers a rejection with a native alert and no push at all, which is why
`contact_new.html` arms a **6-second timer** and then tells the user "If nothing happened, that
address may already be a contact or invalid." That wedge was logged as an owed BE fix. The
shell-hosted screen gets the actual verdict instead.

---

## Session U (#845–#854) — the seven queued dials

Two rows added a verb or a push; the rest are CSS, strings and a deletion. Run through the
gate's one question — *does this exposure exist at the baseline?* — for each.

| what | reach | verdict |
|---|---|---|
| **`ixian:viewcontact:<address>`** — NEW verb on `SingleChatPage` (#850) | `new Address(payload)` → `FriendList.getFriend` → push `ContactDetails` for a friend that already exists | **INHERITED, RELOCATED.** Verb name, payload grammar and handler body are `ContactNewPage.onNavigating:107`, which has answered this since #435(b); `ContactDetails` also answers `ixian:kick:`/`ixian:ban:`/`ixian:sendContactRequest:` on the same address-keyed shape. The WebView-supplied token reaches exactly one thing — a LOOKUP — and a null resolves to a silent no-op: no contact created, nothing sent, nothing written. GATE 60 (c) pins the negative half (`!/addFriend\|sendContactRequest\|new Friend\(/`), because that is what makes the address safe here. ⚠ The catch logs `ex.GetType().Name`, never `ex.Message` — sweep **G-3**: Ixian-Core's `Address` ctor formats the whole base58 into its exception text. The first draft of this handler logged `ex.Message` and was fixed before it shipped. |
| **`setPaneAvailable` "1"/"0"** — NEW push to the home shell (#852) | C# → shell: one boolean, read from `rightContent.IsVisible` | **INTRODUCED, and it is display state.** No payload, no address, no user data — it says only whether a detail column is on screen, which the shell cannot compute (`data-desktop` is the #228 platform flag and is constant across resize). Same class as the `setPaneMode` pushes #240/#247 already make to the settings and contact-details shells. The shell's only use is to choose between an in-shell takeover and a C# page push; it reaches no sink. |
| `ixian:newcontact` / `ixian:newapp` (#852) | `HomePage` → `ContactNewPage` / `AppNewPage` | **INHERITED, UN-RETIRED.** #827 stopped SENDING these; the branches were never removed. They are reachable again on a wide window only. Nothing about the branches changed. |
| **★ chat-flow.js deleted** (#853) | — | **REDUCES reach.** A canvas renderer that read computed style every frame, held a rAF loop, a `ResizeObserver` and a `visibilitychange` listener, and was mounted from a TOP-LEVEL call in the chat shell's main script — where a throw aborted identity, theme and the whole bridge wiring below it (the Session F audit finding, previously guarded by a try/catch). Gone, so the hazard is structural rather than guarded. |
| `contactSpixiAddress`, `viewProfile` (#849/#850) | dictionary keys | **No reach.** Text, rendered through the same `strings.*` channel as every other label. |

**No new storage key. No new HTML sink. No new network fetch. No new log line carrying a
payload.** The money path is untouched — `signSend`, `feeQuery`, `payRequest` and the compose
surfaces were not read or modified in this batch — and the ★ chat-isolation invariant (#221)
holds: `ixian:viewcontact:` pushes a page with its OWN WebView, and every coordination step is
C#-side. The one deletion removes a JS module from the chat WebView and adds nothing to it.

⚠ **Carried, not closed:** `contact_details.html` hosts the same member sheet and has no
`viewcontact` route (#850). That is a missing feature, not an exposure — the component's
`canView` gate means the affordance does not render at all there.

## Session X (#869–#872) — the composer fix, the chooser, the row and the ticks (2026-09-17)

One question per row: does this exposure exist at the baseline?

| item | verb / key / sink / fetch / log? | verdict |
|---|---|---|
| `chat.html` composer-height publish (#869) | **ONE new log line**: `console.warn('[composer-h] publish failed — …', e)` in the outer catch. It logs a caught `Error` object, never an address, a nick or message text; the block touches only `slot.offsetHeight` and a CSS custom property. | INTRODUCED, harmless — no user data can reach it (G-3 holds: nothing formats base58 into the message) |
| `smoke-test.mjs` undeclared-identifier gate (#869) | a NEW DEV DEPENDENCY: `eslint` + `globals`, `--no-save`, dev machine only; never shipped, never in the WebView | not an app exposure — supply-chain note only: the suite header now names both, pinned versions are NOT enforced (the same standing jsdom has) |
| chooser tokens + CSS + SVG-first art (#870) | no verb, no key, no fetch — `img.src` moves from one **relative co-located** file to another (`images/add-contact.svg` → `.png` fallback), both under `Raw/html/images`, both copied from `src/demo/images` by `build-shells`; no remote host can enter the ladder | none |
| chats-row column, tick stroke, `--icon-bubble-read` literal (#871) | CSS only | none |

Nothing in Session X adds a verb, a `spixi.*` key, an HTML sink or a network fetch. The
introduced-vs-inherited census (the Session R sweep) is unchanged by it.
## Session Y (#878–#882) — the contact-details premium pass, and the gate's own hardening (2026-09-17, evening)

One question per row: does this exposure exist at the baseline?

| item | verb / key / sink / fetch / log? | verdict |
|---|---|---|
| `chat-info.js` (#878) — tiles, Mute tile, hero address, grouped cards, danger by kind | **no verb, no key, no fetch, no HTML sink**: every text node is `textContent`; the hero address is `truncateAddressMiddle()` output and an `aria-label` built from the same string; the Mute tile calls the SAME `onNotifications(next, ctrl)` the switch called (the shells' `ixian:en/disableNotifications` emit is unchanged); `onRequest` is accepted and never invoked. **ONE new log line**: `console.error('c-chat-info: action row exceeds 4 tiles (#876) — dropping', <tile action name>)` — a static string + a `data-action` token (`message|call|pay|mute`), never an address or a name | none |
| `chat-info.css` · `tokens.css` (#878/#879/#880) | CSS only (`::after` hairlines, focus ring inside the card, two role tokens) | none |
| `contact_details.html` / `chat.html` | **UNTOUCHED** (#221). ⓘ The `onRequest` handler + `openRequestForPeer()` in `contact_details.html` are now an emit site (`ixian:sendrequest:<addr>:<amount>`) with no caller — an inventory entry that is DEAD, not a new exposure; retiring it is a gate row for the session that does it (#880 ⑤, Damir's dial) | none (dead code named) |
| `smoke-test.mjs` undeclared-identifier gate (#881) | dev machine only, never shipped. The gate got STRICTER: a `<!--`/`-->` pair inside one inline script no longer deletes the code between them before the lint (a false GREEN of the #869 class), `data-src` scripts are linted, three `<script src>` globals seeded, a fixture pin proves it | not an app exposure — the tool that checks for swallowed errors now checks all of the code |

Nothing in Session Y adds a verb, a `spixi.*` key, an HTML sink or a network fetch. The
introduced-vs-inherited census (the Session R sweep) is unchanged by it.

## AND-45 (#883) — the transparent navigation bar under the composer (2026-09-18)

One question per row: does this exposure exist at the baseline?

| item | verb / key / sink / fetch / log? | verdict |
|---|---|---|
| `MainActivity.publishBottomInset` · `UIHelpers.pushBottomInsetToAllPages` · `SpixiContentPage` chrome pass | **ONE new C# → WebView push, `setInsetBottom`**, the exact twin of `setInsetTop` (#401): the argument is a dip formatted `"0.##"` invariant — a NUMBER, never an address, a name or a path — and the shell head validates it against `/^\d{1,3}(\.\d{1,2})?$/` before it reaches a style property (the same guard as the top). Push-only, fenced `#if ANDROID`, over the ONE enumerator `getLiveShellPages(true)` (#421); a throw per page is swallowed by design (a dead page must not stop the walk — the #869 rule is about a silent catch that HIDES a failure; here the failure is "that page is gone", and the next chrome pass re-pushes). No verb, no key, no fetch, no log line. | one new push, numeric, validated at the sink |
| `*SL{AndroidInsetBottom}` carrier · `SpixiLocalization.customStrings` seed | a new **localisation carrier**, seeded `"0"`, overwritten only by the number above; substituted into every generated document exactly as `AndroidInsetTop` is. The built lock shell's carrier SET is pinned as five (N83 re-based). | none |
| `Window.NavigationBarContrastEnforced = false` | window flag, API 29+ — visual only | none |
| `base.css` `--safe-bottom` · 28 CSS use sites · `apps-details.css` · `desktop-anchors.js` `resolvePx('var(--safe-bottom, 0px)')` | CSS + a computed-style probe (the R-1 pin: never `getPropertyValue`-parsed). | none |
| `chat.html` `androidInsetBottomPx()` | reads `documentElement.style.getPropertyValue('--android-inset-bottom')` — a value the SAME shell wrote from the validated carrier, `parseFloat` + `Math.max(0, …)`; feeds `rememberKbSlot`, whose 160–600 band still applies. Not a new key: the persisted `spixi.kb.slot` is unchanged in shape (`px@w`). | none |

AND-45 adds one numeric push and one numeric carrier, both validated where they land; no verb, no
`spixi.*` key, no HTML sink, no fetch. The introduced-vs-inherited census is unchanged by it.

## Session Z (#885–#890) — the Y-walk list, the flags on Windows, the glass dial (2026-09-18)

One question per row: does this exposure exist at the baseline?

| item | verb / key / sink / fetch / log? | verdict |
|---|---|---|
| `spixi.chat.glass` (#889) | **ONE new `spixi.*` localStorage key**, boolean (`'1'` or absent), read by chat.html's pre-paint script and mapped to a `data-chat-glass` attribute; nothing else reads it, nothing writes it yet (no toggle). Same class as `spixi.chat.pattern` (#236): no user data, no address, no text. It lives on the shared `file://` partition like every other chat pref (MAJOR #4's partition question is unchanged by it). | **introduced, benign** — a boolean UI pref |
| `fonts/TwemojiCountryFlags.js` + `installFlagFont()` (#888) | **A local script asset** loaded by 17 shells with a RELATIVE `src` (same folder tier as `spixi.bundle.js` — no network, no remote host, `--check` regenerates it from the committed woff2). It sets one global string; `flags.js` accepts it only if it `startsWith('data:')` and interpolates it into a `<style>` `@font-face` via `textContent` (no `innerHTML`, no `eval`). ⚠ The `startsWith` check is a SHAPE check, not a sanitiser: a payload containing `')` would break out of the `url()` into CSS. That requires replacing a file in the app's own Raw asset folder, which is already code execution at the shell's tier — the same trust as the bundle. The font face carries `unicode-range` and a `data:` src → the WebView fetches nothing. The canvas probe paints one glyph into an offscreen canvas and reads pixels — no fingerprint leaves the document. | **introduced, same tier as the bundle** — no verb, no fetch, no sink |
| `img.c-flag--img` → emoji span upgrade (#888) | reads the PNG's own filename (written by `createFlag` from a 2-letter code) and replaces the element with a `textContent` span | none |
| `settings-app.js` ASSET_CREDITS `creditFlags` (#888) | static text rows rendered by `textContent`; the licence URL is text, not a link target | none |
| `chat.html` — the #249 takeover DELETED (#887 (c)) | code REMOVED only: `createChatInfo` destructure, its cover rules, two stylesheet links. The census of sinks shrinks by the takeover's render path; no verb, no key, no fetch changed. | none (a deletion) |
| `chat-info.js` Request tile on the directory arm (#887 (d)) | re-exposes the EXISTING `onRequest` handler (`contact_details.html` → `ixian:sendrequest:<addr>:<amount>`, the emit site recorded under Session Y) on the arm #880 had hidden it from; a request = a chat message, nothing is signed | none — the verb pre-dates Session Y |
| tokens.css · chat-info.css · settings-shell.css · overlay.css · composer.css · system-notice.css · attach-sheet.css · contacts-shell.css · contact-row.css · settings-screens.css · the `sanctioned:` markers (#886/#887/#889) | CSS only | none |
| `scripts/build-shells.mjs` (#888) · `smoke-test.mjs` GATE 64/65 | dev machine only, never shipped; the generated `fonts/TwemojiCountryFlags.js` IS shipped (row 2) | none |

Session Z adds one boolean `spixi.*` key and one local script asset at the bundle's own tier; no verb, no HTML sink, no network fetch, no log line. The introduced-vs-inherited census (the Session R sweep) gains the two rows above and is otherwise unchanged.
