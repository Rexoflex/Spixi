# Opus review brief — CHATS-LIST POLISH batch (#253, roadmap batch 3: Q12 · Q5 · M5)

> **Work order for a FRESH Opus session: the full #46 adversarial AUDIT+FIX LOOP over
> DECISIONS #253 (both rounds).** fable BUILT this batch (§5c split — build and audit
> are separate sessions); Damir F5-tested BOTH rounds and passed them. Your verdict
> gets APPENDED to this brief. Entry-read order: this file → DECISIONS **#253**
> (batch + same-day M5 round-2 amend) → **#219** (CH2b request feed — M5 pairs it)
> → **#238** (landtab localStorage precedent — Q12 generalizes it) → CLAUDE.md
> ground rules. The batch is UNCOMMITTED in the working tree; commit happens after
> this loop is CLEAN.

## Loop protocol (#46 — non-negotiable shape)

1. **3+ READ-ONLY auditors, DISJOINT scopes** (below). Findings with file:line,
   severity MAJOR/MINOR/NIT. Auditors read REAL files via the Read/Grep FILE TOOLS
   (see Environment). No fixes from auditors.
2. **Fix agents** with disjoint file scopes and EXPLICIT cross-file contracts
   (the shared contracts in this batch: `spixi.exdel.<addr>` hint shape
   `{del,t,kind,text}` written by chat.html / read by home.html · `chat.request`
   flag read by chats-shell.js `chatMatchesFilter` · `pending:true` roster field
   read by contacts-shell picker rows). Mechanical fixes land directly;
   **architectural findings become 🟡 DECISIONS rows — never silent changes.**
3. **FRESH break-my-verdict re-reviewer** over the fixed state (the #235 lesson:
   re-challenge the highest-risk CLEANs, don't rubber-stamp).
4. Loop fix ↔ review until CLEAN. Components changed by fixes ⇒ note that Damir's
   local run needs `build-demo-bundle` → `build-shells` → `smoke-test` (full
   sequence); shell-only fixes ⇒ `build-shells` only.
5. End-state: verdict + findings table appended to THIS file; DECISIONS #253
   status updated; polish-roadmap + CLAUDE.md synced.

## Batch scope (what to audit — file:line deltas)

All ZERO-C#; frozen bridge (zero new verbs); components changed ⇒ FULL build.
C# files are cited as READ-ONLY contract evidence, none were modified.

### Q12 — delete → stale chats-list excerpt (localStorage handshake)

Verified contract (re-verify it): local delete NEVER re-pushes HomePage
(SingleChatPage.xaml.cs:1150-1159 → its own `deleteMessage`:1727 pushes only the
chat WebView; UIHelpers.cs:69 = REMOTE deletes only + only while HomePage is
top-of-stack; no `shouldRefreshContacts` on delete). Ixian-Core's
`friend.deleteMessage` lastMessage-recompute is OUTSIDE the tree (unverifiable,
#215) — the design must stay correct in BOTH worlds (it self-expires if C# turns
out to correct itself).

- `src/shells/chat.html` — writer:
  - :2302-2340 (≈) `EXDEL_PREFIX` + `writeExdelHint(deletedRec, wasTail)` — tail-only,
    bots SKIPPED (their lastMessage may live in another channel), `del` =
    `Math.max(prev.del, rec.ts)` (sequential-delete + arrive-then-delete races),
    `text` only for text tails, capped 120, fail-soft try/catch.
  - :1835-1850 (≈) `deleteMessage(id)` handler — `wasTail` captured BEFORE removal,
    hint written AFTER removal (order tail = new last message), then renderLog.
- `src/shells/home.html` — reader:
  - :844-880 (≈) `getExdelHint` / `dropExdelHint` / `excerptFromExdel` (kind→chatlist
    grammar; text tails re-run `excerptFromRaw` = GIF/heart/address canon) /
    `applyExdelHints` + the #238 live trio (storage event key-prefix filtered +
    focus + visibilitychange).
  - :1343-1350 (≈) addChat fold-in: expiry `if (t && t !== dh.del) dropExdelHint`
    else apply (draft keeps priority; CH8 sticky reaction applies AFTER and wins);
    `dh.t` re-times the row.
  - :540 onPersist row-delete sheds the hint.

### Q5 — groups OUT of the contacts takeover (both purposes)

Verified contract: `loadContacts` (HomePage.xaml.cs:1150-1183) pushes EVERY friend,
NO type arg; loadChats runs before loadContacts (:1743-1744); X1 passes `img/`
sentinels through un-encoded.

- `src/shells/home.html`:
  - :377-391 `groupAddrs` Set + `requestAddrs` Set + `directoryRoster()` (filter
    groups by CH1-kind set + `isGroup` sentinel flag, then map `pending:true`).
  - :400 / :411 the ONLY two roster hand-off points (scheduleContactsRender +
    openContacts getRoster) consume `directoryRoster()`.
  - :1283 addChat feeds `groupAddrs` BEFORE the tombstone gate (deleted group
    chat still filters).
  - :1575 addContact `isGroup: avatar === 'img/spixi-group-avatar.png'` — checked
    BEFORE `resolveAvatar` (which nulls sentinels).

### M5 — outgoing contact request (round 2 = the shipped mechanism)

Verified contract (re-verify REACHABILITY, not just existence — the round-1 lesson:
the first cut matched `index-excerpt-contact-request`, which sits inside the
APPROVED-state else, xaml:1280, and never reaches a chat row): for ANY unapproved
non-bot friend the excerpt is OVERRIDDEN to `_SL(chat-waiting-for-response)`
(xaml:1273-1279). The sender row exists because ContactNewPage.xaml.cs:203 adds a
LOCAL `requestAddSent` marker (localSender) → pushed status-type arg NON-EMPTY
(xaml:1360-1378); the INCOMING unapproved fall-through (#219 MINOR) pushes
type='' → direction guard keeps it plain text.

- `src/shells/home.html`:
  - :168 carrier `<span id="sl-waiting-response">*SL{chat-waiting-for-response}</span>`
    (same-line-closed, #248) · :314-334 (≈) `REQUEST_SENT_TEXT` + `isRequestSentPush`.
  - :807 excerptFromRaw branch (statusType-guarded) → `{type:'request', text: SL.requestSent}`.
  - :1286-1287 addChat `isReqRow` → `requestAddrs` add/delete (BEFORE tombstone gate) ·
    :1326 `chat.request = isReqRow` (always-set boolean; upsertChat spread-merge clears
    a settled request).
  - :650 chip count = incoming cards + outgoing rows · :662-666 `isRequestRow` +
    `leaveRequestsFilterIfEmpty` holds while either exists.
- `src/components/chats-shell.js`:
  - :46-49 `chatMatchesFilter` case 'requests' now admits rows (`chat.request` ||
    excerpt-type 'request') · :76-90 `orderedChats` — the 'requests' short-circuit
    REMOVED · :92-97 orderedTimeline docblock updated. Incoming CARDS unchanged
    (orderedRequests).
- `src/components/chatlist-item.js` :68-72 `EXCERPT_GLYPHS.request = 'user-plus'`
  (registry-guarded — degrades to text until the B2 export).
- `src/styles/components/chatlist-item.css` :135-138 request tone (action ink).
- Picker pending badge: NO component change — `contacts-shell.js` already renders
  `pending` rows (:92-128, #153 grammar); home threads it via `directoryRoster()`.

### Test surface

- `scripts/smoke-test.mjs` — new block "chats-list polish batch — Q12 / Q5 / M5"
  (~:1593) + "chatlist-item / chats-shell — M5 request grammar" jsdom block
  (createExcerpt request type · chatMatchesFilter admits flag/excerpt-type rows,
  rejects plain chats · orderedChats surfaces only request rows under 'requests').
  Round-1 static guards were UPDATED in round 2 (waiting-response carrier + the
  dead round-1 marker asserted ABSENT + requests-chip/pending-badge guards).

### Verification already done (don't redo, do challenge)

Round 1: full build + smoke IN-SESSION, 363 ✓ / 0 fail. Round 2: bundle
(698,447 B) + 15 shells rebuilt; the 5 model behaviors PASS via direct node import
of chats-shell.js; every static-guard regex grep-confirmed against real files.
Full round-2 smoke run = Damir's machine only (see Environment). Damir F5-passed
both rounds ("perfect").

## Non-negotiables to re-verify (fail the verdict if broken)

- ★ **#221 chat wall**: the Q12 handshake crosses WebViews via SAME-ORIGIN
  localStorage ONLY (the #238 precedent) — no shared JS context, no bridge verb,
  no chat-content path into any other pane's JS. Verify nothing else leaked.
- **Money path untouched**: no edits near payment compose/sign; `formatIxiAmount`/
  #77/#252-Q4 signing logic untouched by this batch.
- **Frozen bridge**: zero new `ixian:` verbs, zero C# edits (C# citations are
  read-only evidence).
- **#248 marker rule**: every `*SL{}` carrier same-line-closed; NO literal
  unclosed `*SL{` in anything a built page inlines (runtime probes assemble
  `'*SL'+'{'`). Check the built shells too (`Spixi/Resources/Raw/html/index.html`).
- **Surface containment**: mobile and desktop behavior changes are EXACTLY the
  three items; no drive-by changes to unrelated components (the bundle diff is
  regeneration only).
- **🟡 SECURITY RULING REQUIRED (flagged in #253, not silent):** the Q12 text-tail
  hint persists ONE capped (120-char) line of possibly COUNTERPART-authored text
  in localStorage — beyond the drafts/likes own-data precedents, same line the
  list displays. Auditors must RULE on keep-vs-drop-`text` (drop = row degrades
  to an empty excerpt until the next real push). Either outcome = a 🟡 DECISIONS
  row naming the tradeoff; if kept, it also goes to the BE security review list.

## Accepted NITs / dials — do NOT re-litigate (Damir has them)

- Request rows also show under All (not Requests-only) — dial.
- The 'start' picker excludes groups too ("pick a PERSON") — dial if Damir wants
  them back; group tap in 'start' would just open the chat.
- "Request sent" is toned-excerpt weight, not a pill — dial.
- Q12 hint drops the C# "You:" excerpt prefix; kind labels come from window.SL
  (properly localized) while CH6 canon stays en-us best-effort — accepted class.
- Bots skipped by the Q12 writer (multi-channel lastMessage ambiguity) — accepted.
- Chat emptied by deleting the last message ⇒ blank excerpt line — accepted.
- Zero-message custom-avatar group invisible to the Q5 filter — rides the
  existing §9 addContact type-arg BE ask.
- `applyExdelHints` re-applies + re-renders on every focus when a hint exists
  (coalesced, cheap) — accepted.
- `user-plus` glyph degrades to text until Damir's B2 Tabler export — accepted.
- A user literally typing "Waiting for response" excerpt-collides — CH6
  false-positive class, accepted.

## Suggested auditor scopes (disjoint)

- **A — Q12 writer + C# contract** (`src/shells/chat.html` + read-only
  SingleChatPage/UIHelpers/HomePage): tail detection, del semantics under
  race interleavings (delete→receive→delete, multi-delete, send-after-delete,
  desktop peer-switch/reparent, per-peer keying), bot skip, fail-soft paths,
  #221 wall.
- **B — home.html reader + M5 + Q5 wiring**: hint fold-in/expiry vs draft/
  reaction/handshake/tombstone/pin interplay, storage-trio correctness, ts-unit
  equality (both sides ms), requestAddrs/groupAddrs lifecycle (add/clear/leak
  across flushes), chip count/leave-guard, directoryRoster consumption points
  (are there ONLY two?), setContactStatus interference.
- **C — components + CSS + demos + smoke**: chats-shell filter/ordering changes
  vs every consumer (chats.html/desktop.html demos, chats-header counts,
  renderChatsList empty states), chatlist-item request excerpt (a11y: SR text,
  tone contrast both themes), picker pending-row consequences (multi-select
  block, aria), smoke assertions actually pin the behaviors.

## Environment (#175 — ESCALATED this session, read carefully)

- The PC sandbox mount serves STALE/TRUNCATED copies of some files to bash/node —
  this session it truncated `src/components/chats-shell.js` and
  `scripts/smoke-test.mjs` MID-SESSION (real files intact). **Read/Grep/Edit/Write
  FILE TOOLS are the ONLY source of truth.** If bash/node output contradicts a
  file-tool Read, the file tool wins.
- Grep may DISPLAY `/*` as `\*` (display artifact) — confirm with Read before
  "fixing" comment syntax.
- If a build/smoke run is needed in-session and a file is mount-truncated:
  resync it by rewriting the EXACT file-tool content through bash
  (`cat > file <<'EOF'`, the #204 method) — content must be byte-identical to
  the file-tool view. Otherwise leave build+smoke to Damir's local run and
  verify via file tools + targeted `node --input-type=module -e` imports of
  small, freshly-resynced modules.
- NEVER write a literal unclosed `*SL{` in any file a built page inlines
  (#248 boot-crash class) — this brief and smoke-test.mjs are safe (not inlined).

## After the loop

CLEAN verdict appended here → Damir commits #253 + loop fixes as ONE batch →
next build session = roadmap batch 4 (M12 pattern default/levels · Q14 lock
small-viewport · Q1/Q2 launch dials).

---

# ✅ VERDICT — Opus #46 loop, 2026-07-11 (DECISIONS #254 + #255)

**CODE: CLEAN — 0 MAJOR outstanding.** 1 MAJOR found and fixed, 1 required security
ruling issued, 6 further fixes landed, re-review by a fresh break-my-verdict agent
holds. **Loop shape as ordered:** 3 disjoint read-only auditors (A chat.html writer +
C# delete contract · B home.html reader + M5/Q5 · C components/CSS/demos/smoke) → 3
fix agents with disjoint file scopes + the named cross-file contracts → fresh
re-reviewer (re-challenged the highest-risk CLEANs per the #235 lesson) → 2
recommended one-liners landed + smoke resynced.

## ★ REQUIRED RULING — Q12 text persistence: **DROP `text`** (→ DECISIONS #254)

The hint ships as **`{del, t, kind}`**. Not a judgment call in the end — the evidence
decided it: the shells load from a bare local path (`SPlatformUtils.getHtmlBaseUrl()`
= `Config.spixiUserFolder + "/html/"` on Windows/iOS/Mac/Android) → a **`file://`**
document, and **mini-apps** (third-party, publisher-supplied code) load from
`"file://" + app_entry_point` (`MiniAppPage.xaml.cs:58`). Chromium-based WebViews put
**all `file://` documents in ONE localStorage partition**; WKWebView shares the default
`WKWebsiteDataStore` unless told otherwise. So the shells' localStorage is plausibly
readable by untrusted mini-app code — SECURITY.md §1 / ★ #221 class. We do not widen
that by one line of counterpart-authored message text. Text tails degrade to an empty
excerpt (correct timestamp, self-heals on the next push); non-text kinds keep their
`window.SL` label. **Reversible** if BE confirms per-platform storage isolation.

**Escalated (bigger than Q12, NOT fixed here → `docs/security-review-for-be-engineer.md`
MAJOR #4):** the same premise implicates **already-shipped** keys — `spixi.draft.<addr>`
persists the user's own composed **plaintext**, and `exdel/likes/pins/mentions/app.declined`
disclose contact addresses. The real fix is a **separate storage partition for the
mini-app WebView** (C#/platform). BE must first *verify* the sharing on-device (#215
lesson — a 5-line test mini-app answers it).

## Findings

| ID | Sev | file:line | Finding | Disposition |
|---|---|---|---|---|
| **A-1** | **MAJOR** | `chat.html:1835-1846` · `StreamProcessor.cs:459-462` · `UIHelpers.cs:69-77` · `SingleChatPage.xaml.cs:1727` | The Q12 writer fired on **REMOTE** deletes too. A remote `msgDelete` pushes the **byte-identical** `deleteMessage(id)` UI command as the local menu delete but **never mutates core** (only `SingleChatPage:1146/1154` calls `friend.deleteMessage`) → C# keeps pushing the same `lastMessage` ts → the hint **could never expire**, while the conversation **re-shows the message on the next open**. List↔conversation divergence, worse than the stale excerpt Q12 fixes. *(The brief's own contract note — "UIHelpers:69 = remote only, HomePage-top-of-stack only" — is what hid it: the top-of-stack gate is on the HomePage notify; the **chat-page push at :71 is ungated**.)* | **FIXED** — `pendingLocalDeletes` latch (registered at the delete-verb send site, consumed in the handler, **bot-skipped + 10s self-expiring** so a never-echoed id can't be consumed by a later remote delete, cleared per peer). The C# half → **be-cutover C16**. |
| **A-2** | ruling | `chat.html:2318` | Counterpart text in a store shared with mini-apps. | **RULED: dropped** → #254 + security-review MAJOR #4. |
| **B-1** | **MAJOR** | `home.html:1343-1350`, `:865-877` | The fold-in clobbered a live **`typing`** excerpt: a typing event sets `shouldRefreshContacts` → full `loadChats` → `addChat` arrives with `type='typing'` **and the unchanged stale ts** → `t === del` → the cached hint line overwrote the live signal, for exactly as long as the hint lives. | **FIXED** — typing guard in both `addChat` and `applyExdelHints` (mirrors the draft guard). Expiry still runs *before* the guard, so typing can't make a hint immortal (re-reviewer verified). |
| B-2 | MINOR | `home.html:865-877` | `applyExdelHints` skipped only `draft` → on every focus/storage event it replaced a CH8 **sticky reaction** excerpt with the hint line (flip-flop). | **FIXED** — precedence now identical in both paths: **draft > typing/handshake > reaction > hint > pushed**. |
| B-3 | MINOR | `home.html:663-671` | `leaveRequestsFilterIfEmpty()` was called only from accept/decline. **M5 created two new ways for the last request to vanish** — an outgoing row settling on a re-flush, or being deleted — leaving the Requests filter active + empty with its chip `display:none` at count 0: no chip shows selected, no way back except guessing. | **FIXED** — also called from `clearChatsDone` and the `onPersist` delete branch (idempotent, early-bails unless filter==='requests' && both feeds empty). |
| B-4 | MINOR | `home.html:1015` | **The "exactly two roster hand-off points" claim is false** — a **third** consumer, `createWalletSend({contacts: contactsRoster})`, takes the **unfiltered** roster → groups would appear as **money recipients**, pending contacts unbadged. Cap-gated OFF (`composeSend`). | **NOT touched** (money surface; wallet-send is LAST + human BE review, #232) → **🟡 DECISIONS #255(a): fix as a prerequisite of the wallet-send batch.** Claim corrected in #253/#255. |
| B-5 | MINOR | `home.html:314-334` | The direction guard proves *localSender*, not *request-ness*: an unapproved friend whose tail is any locally-sent message also renders "Request sent". | **Accepted class** (documented, #255(d)) — no reliable signal without the §9 `addContact` state arg (**C17**). |
| B-7 / A-4 | MINOR | `home.html:844-880` | `spixi.exdel.*` keys were never pruned for natively-removed contacts → dead keys + unbounded retention. | **FIXED** — `pruneExdelHints()` at flush-done (reaps addresses with no row; re-reviewer confirmed it cannot reap a live hint). |
| A-3 / R-5 | MINOR | `chat.html:1803` | Rows robustness-created by `updateMessage` carry a wall-clock `Date.now()` ts C# can never push → via `Math.max` it poisoned `del` and silently no-op'd Q12 for that chat. | **FIXED** — `tsSynthetic` mark → writer fails safe; the mark **clears** when a real C# ts lands. |
| A-6 | NIT | `chat.html` | A delete mid-load-burst computes `wasTail` against a partial log. | **FIXED** — `bursting` early-return. |
| **C1** | **MAJOR (hygiene)** | `src/demo/spixi.iife.js` (~offset 283,926) | The generated bundle contains a **NUL byte** → git treats it **and every built shell that inlines it** as **binary/undiffable** (Damir cannot review the diff), and a NUL landing in code instead of a comment kills the bundle outright. #175 mount-corruption debris from the build session — all component sources are clean. | **GUARDED** — `build-demo-bundle.mjs` gained a fail-loud post-write integrity gate (NUL / lone surrogate / short write, naming #175). **Damir's local rebuild regenerates the file clean — do not commit the current bundle.** |
| C2 | MINOR | `chatlist-item.js:68-72` | The "`user-plus` degrades to text until the B2 export" dial is **false** — it IS registered (`icons.js:81`); the glyph ships. | **FIXED** (comment + smoke now assert the glyph renders). Dial list corrected. |
| C3 | MINOR | `smoke-test.mjs` | Nothing pinned the behavior removing the `orderedChats` short-circuit buys. | **FIXED** — jsdom: under `filter:'requests'`, 1 card + 1 outgoing row + 1 plain chat → exactly one `.c-contact-request`, exactly one `.c-chatlist-item`, plain chat excluded; plus the empty-state copy. |
| C4 / C5 | MINOR | `src/demo/chats.html` | M5 had **no demo surface** (no `counts` → Requests chip hidden) and the demo's own request row used the OLD grammar. | **FIXED** — counts wired + shipped grammar. Its `pending` test tightened `c.pending !== false` → `!!c.pending` (a plain contact tap no longer mints a fake "request sent" row). |
| C6 | MINOR | `contacts-shell.js:120-129` | A **pending** contact tapped in the directory opens the full profile with **no cancel-request affordance**; `createPendingContact` is built but unmounted (no C# state flag). | **🟡 be-cutover C17** (rides the §9 `addContact` state-arg ask — one arg also fixes the Q5 zero-message-group residual). |
| C7 | MINOR | `chats-shell.js:182-226` | Outgoing "Request sent" rows are fully menuable — **delete** hides a LIVE pending request from the list. | **🟡 Damir dial** (#255(c)): gate the row menu for `chat.request` rows, or accept (the contacts-picker badge still shows it). |
| C8 / C9 / B-6 / R-8 | NIT | components + #253 | `request` missing from the model docblock · pending-row disabled state had no SR reason · "`index-excerpt-self` empty in ALL locales" is false (`id-id.txt:305` = "Saya:"; M5 doesn't depend on it) · a preview-only SL fallback guess. | Docblock + a11y reason (`noGroupPending`) **FIXED**; doc claims **corrected in #253**. |

## Non-negotiables — re-verified

- ★ **#221 chat wall — HOLDS.** The only cross-WebView channel is same-origin
  localStorage (the #238 precedent); no shared JS context, no bridge wire between panes.
  After #254 the payload carries **no chat content at all** (`{del,t,kind}`).
- **Money path — untouched.** Nothing edited near payment compose/sign; `createWalletSend`'s
  roster deliberately left alone (B-4 → backlog row, not a drive-by).
- **Frozen bridge — HOLDS.** Zero new `ixian:` verbs, zero C# edits (all C# cited read-only).
  The only verb touched is the pre-existing `ixian:contextAction:deleteMessage:`.
- **#248 marker rule — HOLDS.** Every `*SL{…}` carrier same-line-closed; no literal
  unclosed `*SL{` in components/demos/shells; runtime probes assemble the needle.
- **Surface containment — HOLDS.** Changes are exactly Q12/Q5/M5 + these fixes.

## ⚠ Two commit-hygiene blockers for Damir (mechanical, not logic)

1. **Rebuild in order** — the checked-in `spixi.iife.js` + built shells **predate** the
   fix-pass component edits *and* carry the NUL byte. `build-demo-bundle` →
   `build-shells` → `smoke-test`, then commit.
2. **Check the diff shape** — the re-reviewer saw `git status` list ~30 files incl. **12
   C# files** whose `git diff --ignore-cr-at-eol` collapses to **zero** (pure CRLF/LF
   churn from in-session rewrites / the #175 mount). Content-wise zero-C# **holds**, but
   confirm on the real checkout that the commit touches only: `src/shells/chat.html` ·
   `src/shells/home.html` · `chatlist-item.js/.css` · `chats-shell.js` · `contacts-shell.js` ·
   `src/demo/chats.html` · `src/demo/spixi.iife.js` · `scripts/smoke-test.mjs` ·
   `scripts/build-demo-bundle.mjs` · `Spixi/Resources/Raw/html/*` · docs. `git checkout --`
   any EOL-only file. (Also: `src/components/.fuse_hidden0000001100000001` is FUSE debris —
   delete it, don't commit it.)
