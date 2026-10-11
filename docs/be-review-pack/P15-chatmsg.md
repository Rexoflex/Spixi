# P15 · CHATMSG · Chat messages: reply, edit, reactions, receive guards, links, native copy

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| HIGH | no — but the native copy can overwrite a copied payment address (clipper residual) | yes | shipped | 7 min |

**Look here first:** `Spixi/Utils/SpixiContentPage.cs:6376` — `tryTakeCopySlot` (750 ms) is the only bound on a script in the CHAT WebView writing the clipboard with no tap on iOS/Mac; a compromised chat can still swap a copied address once per 750 ms (#1035).

**DECISIONS:** #1137 · #1197 · #1198 · #1199 · #1207 · #1232 · #1248 · #1128 · #1231 · #1028 · #1035 · #1247 · #805 · #801 · #1106 · #928 · #1155 · #1223 · #1148 · #1245

## What changed and why
- Rule: no Ixian-Core change; Spixi only uses what Core 097341a already does (#1137). The held reply carrier patch is not applied (#1198).
- Reply = TEXT: `"> " + [name: ] + excerpt + "\n" + body` in a normal `chat` body; no name in 1:1, never the private alias (#1198).
- Edit = Core's existing `chatStream` (code 53) replace, same id, sequence + 1, push OFF; own text, ≤ 24 h, newest 25, < 20 edits, not bot rooms (#1199).
- Capability ask/answer = Core's existing `getAppProtocols`/`appProtocols`: approved 1:1 only, ≤ 1 answer/60 s, ids `spixi.reply.1`, `spixi.edit.1`, `spixi.voice.1` (#1197, #1207).
- Reactions: 6 quick emoji as an index (#1232); reactions and deletes go out with push OFF through `sendSpixiMessage` (#1248, #1128). Wire answer: no new code, no new field; new USES of codes 53, 43/44 and the push flag.

## Files (verified at 387ca78b)
- `Spixi/Network/StreamProcessor.cs:819` — receive guard: non-bot replace of an unknown id, or replace/stream onto a non-text or system row → dropped, receipt sent (#1199); `:764`, `:790` drop a one-byte (system-line) id (#1231); `:1008` `claimAnswer` gates the capability answer (#1197).
- `Spixi/Pages/Chat/SingleChatPage.xaml.cs:2301` — `EditRules.canEdit` re-check on C#'s own copy; `:2323` sends the replace (#1199).
- `Spixi/Pages/Chat/SingleChatPage.xaml.cs:2197` — `composeReply`: target looked up in C#'s own list; name from `replyNameOf` `:2173` (#1198).
- `Spixi/Pages/Chat/SingleChatPage.xaml.cs:4813` — `react:<hex>:<0–5>` validated, then the legacy `like` writer + `sendSilentReaction` (#1232, #1248).
- `Spixi/Utils/Utils.cs:796` — `openExternal`: http/https only, empty `UserInfo`, the same `Uri` opened (closes the link-open spoof found by the handover sweep, #805).
- Also ours, local only: `ArrivalGuard`/`CoreMessageWriter` (no lost arrival, #1155), `ChatHeal` (#1223), `SReactionFlags` (#1148), `SLocalOnlyStore` (#1245), `SPeerLocalStores`, `LinkRule` (#1106).

## Bridge surface
| Verb / push | Args (shape) | Who can send it | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| `ixian:chatreply:` | `<hex id>:<text>` | `src/shells/chat.html` → `Raw/html/chat.html` (untrusted) · SingleChatPage | `SingleChatPage.xaml.cs:641` | ours (#1198) |
| `ixian:chatedit:` | `<hex id>:<text>` | same | `:661` → `:2263` | ours (#1199) |
| `ixian:quotejump:` | `<hex id>` | same | `:677` → `:2348` | ours (#1198) |
| `ixian:contextAction:react:` | `<hex id>:<int 0–5>` | same | `:4813` | reshaped (#1232) |
| `ixian:openLink:` | `<url>` | same (peer text) | `:870` → `Utils.cs:796` | reshaped (#805) |
| `ixian:copytext:` | `<digits ≤16>:<base64url ≤64000>` | every own shell incl. chat; mini-app refused | `SpixiContentPage.cs:6329` | ours (#1028) |
| `ixian:haptic:` | `<click\|long\|success>` | every own shell; mini-app refused | `SpixiContentPage.cs:6401` | ours (#1247) |
| `addMessages` / `messagesDone` | `<json {strs,items[{f,a,r}]}>, <append\|prepend>` / none or `<show_more>` | C# → chat | `SingleChatPage.xaml.cs:5486`, `:5488` | ours (#801) |
| `jumpToMessage` | `<hex id>` (C#'s own) | C# → chat | `:5179` | ours (#1106) |
| addMe/addThem 14–16, updateMessage 8–11 | `edited`, `quoteName`, `quoteText` | C# → chat | insertMessage / updateMessage | reshaped (#1198) |
| `setCaps` | `<csv words>` (`reply`, `edit`, …) | C# → chat (also home, settings, chat info, dev) | `:1646` | ours (#1198) |
| `addChatReaction` | `<addr>,<nick>,<reaction ≤64>,<ts>,<addr\|"">` | C# → `src/shells/home.html` (built `index.html`; untrusted names) | `HomePage.xaml.cs:3947` | ours (#928) |
| `nativeCopyResult` | `<digits>, <"1"\|"0">` | C# → the asking shell | `SpixiContentPage.cs:6373` | ours (#1028) |

## Threat → rule → proof
| A hostile … could try… | What stops it | Proof |
|---|---|---|
| peer: rewrite its file/payment/system row, or add an "edit" of an id we lack as a new message | `StreamProcessor.cs:819` | `pins-s6b/cs.mjs` "#1199 C#: the chatStream case drops…" |
| peer: draw a fake system chip (one-byte id) | `StreamProcessor.cs:764` | csh `S8RulesTests.peers_cannot_write_a_one_byte_id_row` |
| compromised chat WebView: edit a peer's or an old message | `SingleChatPage.xaml.cs:2301` | csh `EditRulesTests`; `pins-s6b/cs.mjs` "#1199 C#: ixian:chatedit…" |
| peer link: `https://paypal.com@evil.example` | `Utils.cs:796` | smoke "★★ gate 16 (Utils.openExternal)" |
| stranger: fingerprint the build / presence via `getAppProtocols` | `StreamProcessor.cs:1008` | csh `SpixiProtocolsTests.only_a_known_approved_normal_1to1_contact_is_answered` |
| compromised chat WebView: swap a copied address | `SpixiContentPage.cs:6358`, `:6371`, `:6376` | smoke "★★ #1028 security gate…"; residual: walk only |

## Given up / left open
- Clipper: a foreground compromised chat can write once per 750 ms; options are a native confirm for address-like text or a native per-tap token (#1035).
- Core's replace has no type check; ours is a belt for non-bot chats only. Bot rooms keep Core's behaviour (#1199).
- Sender authenticity is Core's: CORE-15 (a failed decrypt does not stop `receiveData`) is inherited; our guards do not prove the sender. No DECISIONS row; the ask is in `docs/be-cutover-brief.md`.
- Feature fingerprint to approved contacts (the new-verb asks in `docs/security-review-for-be-engineer.md`, #1197, #1207); two equal excerpts on the peer can match the newer one (#1198).

## Question for BE
Is it OK that Spixi now SENDS `chatStream` replaces (edit) and `appProtocols` answers with Core's existing codes 53 and 44, with no Core change (yes / no)?
