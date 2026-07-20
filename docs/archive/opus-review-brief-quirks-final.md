# Opus #46 review brief — QUIRKS-FINAL (DECISIONS #266–#270)

## HANDOFF → Q4 session (read first — written by the Q1/Q2/Q3 Opus loop, 2026-07-12)

Q1, Q2 and Q3 each ran a full loop to CLEAN (verdicts at the bottom of this file).
**Q4 (the native call surface, #270) was NOT audited — it is untouched and still owed.**

**Files I changed that the Q4 loop ALSO owns — re-verify against them, don't assume:**

| File | What this loop changed | Why Q4 must look |
|---|---|---|
| `Spixi/Utils/SpixiContentPage.cs` | **`pushPageLoaded` only**: a CHAINED push (`replaces:`) now INHERITS the replaced overlay's `tag`+`column` when the caller passed the defaults; the same-tag stale sweep now EXCLUDES `op.replaces` (it would otherwise close it, then the `replaces` branch would fall through to `removePage` on a non-overlay → spurious throw + a `Dispose` racing the fade). | Q4 rewired broadcasts + set lock stages to ZIndex 200 in this same file. My edits touch **neither** `pushModalLoaded` nor the CallPage static slot, and CallPage is not in `overlayStack` — so the change *should* be inert for the call surface. **Verify that, don't assume it.** The `modalOverlayOp != null` fail-closed drop still precedes any staging (`:820`), so the lock invariant is intact. |
| `Spixi/Pages/Home/HomePage.xaml.cs` | `ixian:appDetails:` StartsWith gained its missing colon · `ixian:sendrequest:` dispatch `Contains`→`StartsWith(Ordinal)` · `onSendRequest` gained a fail-closed recipient guard. | Q4 added the ring's hardware-back guard here. No overlap with the verb chain I touched, but both edit `onNavigating`/back paths. |
| `src/shells/chat.html` | composer-lock rework (`requestResolved` latch, `markRequestResolved`, early-lock guards), context-menu gating, the `#sl-waiting-response` carrier. | Q4 removed `attachCallUi` from this shell. Different regions; the `const { … } = window.Spixi` destructure is shared — a stale-bundle preflight failure will now point at whichever is wrong. |
| `src/shells/home.html` | excerpt canon (self-prefix carrier + collision guard), the wallet Receive contact filter, the i18n merge (`slWith` Proxy), Receive/Send titles. | Q4 removed `attachCallUi` here too, and home is the surface the C18 broadcast used to target. |
| `src/shells/settings.html` | downloads sublevel: `encodeURIComponent` on the file name, `dlBuf`/`downloadsEl` release on leave. | One of Q4's 13 de-wired shells. |
| `scripts/smoke-test.mjs` | decline assertions moved out of the app-frame block into a real component block; two `#268` scrim statics added. | Q4 re-based the call block in the same file. Check for no duplicate/renamed consts. |
| `scripts/build-shells.mjs` | **NEW preflight**: fails the build if `src/demo/strings.iife.js` lacks `setDocLang`. | Q4 added `call` to SHELLS/DEFAULT here. ⚠ **The build now HARD-FAILS unless `build-strings-iife` runs before `build-shells`** — fold that into the Q4 build order. |
| `scripts/build-strings-iife.mjs` | `SpixiStrings.get()` now sets `document.documentElement.lang` (the document-locale fix — see VERDICT Q3). | New shell `call.html` gets the locale for free, but only after `build-strings-iife` re-runs. |

**Noticed about the call surface while reading shared files (NOTICED ≠ AUDITED — the Q4 loop still owes its own pass):**
- The `acceptsCallPushes` **inbound** gate still holds: `SpixiContentPage.onNavigatingGlobal` claims only `appAccept:` / `appReject:` / `hangUp:` and refuses a surface with `acceptsCallPushes == false` — a mini-app still cannot emit a call verb (Q2 auditor B verified this incidentally while proving `ixian:sendrequest:` is unreachable from a mini-app WebView).
- `pushModalLoaded` (the lock path) is genuinely untouched by everything this loop landed — the "a lock always covers a live call" claim in #270 rests on the same `modalOverlayOp` machinery that Q1's auditor C re-verified is fail-closed.
- `src/components/call-ui.js` is still on disk (the tombstone). `git rm` is still owed at commit.
- The built shells under `Spixi/Resources/Raw/html/` are stale AND the launch ones still read as **binary** to ripgrep (#255 NUL debris). Never commit them as-is — the rebuild regenerates them.

**Build order for Damir after Q4 (order is now load-bearing in two places):**
`extract-strings` → `build-locales` → **`build-strings-iife`** → **`build-demo-bundle`** → `build-shells` → `i18n-lint` + `pseudo-locale-smoke` + `smoke-test`.
Expect **+3 new keys** (`waitingForAccept`, `viewExplorerAddress`, `newChat`) — no more; this loop introduced none.


> **Work order for the SEPARATE Opus review session(s).** fable built the final
> quirks round (work order `docs/fable-build-brief-quirks-final.md`, all four
> batches + Damir's desktop-scrim add-on) in one session, 2026-07-12. Per §5c:
> fable does not self-certify — run the full #46 loop here. **One loop per
> batch** (Q1 → Q2 → Q3 → Q4), each = 2–3 disjoint READ-ONLY auditors → fix
> agents (disjoint file scopes, explicit cross-file contracts) → a FRESH
> break-my-verdict re-reviewer → loop until CLEAN. Append each verdict to THIS
> file. After the last CLEAN + Damir's commits: **freeze → `git tag
> audit-baseline` → `docs/audit-refactor-plan.md` phase 1.**
>
> #175: the sandbox mount serves stale/truncated copies to bash/node — file
> tools (Read/Grep) are the ONLY source of truth. Damir runs generators + smoke
> locally. #215: re-verify any C# claim you extend.

## ★ Non-negotiables (a violation = MAJOR)

- **#221 chat isolation** — CallPage is its own WebView; no pane merge, no
  shared JS context; mini-apps receive nothing (`acceptsCallPushes` outbound
  AND inbound gates intact — verify both directions survived the rewiring).
- **Money = C# signs** — ⑥ is a requestFunds CHAT MESSAGE; verify nothing in
  the new HomePage `onSendRequest` signs/broadcasts. Wallet-send untouched.
- **Frozen bridge** — new verbs are sanctioned copies/routings only:
  `ixian:sendrequest:` (HomePage, verbatim lift), `ixian:loadDownloads`/
  `openDownload:`/`deleteDownload:` (SettingsPage, cap-gated `downloadsInline`),
  `setCallUi` (CallPage-only push). Everything else = existing verbs.
- **#248** same-line `*SL{}` markers (13 new carriers in home.html, 1 in
  chat.html — sweep them).
- **#214 no dead buttons** · **#265 gate**: bundled imports one-line, un-aliased.
- **Build order**: bundle → shells → smoke. The bundle changed (contact-request,
  desktop-anchors, call-ui removal) → full sequence.

## Batch Q1 (#266 + #267) — request-flow correctness + panes

**Files:** `src/shells/chat.html` (composer lock ⑪) · `src/components/contact-request.js`
(⑩ single-click decline) · `scripts/smoke-test.mjs` (re-based decline block) ·
`Spixi/Pages/Home/HomePage.xaml.cs` (① app-details formpane routing + closeFormPaneOverlays)
· `Spixi/Pages/Settings/SettingsPage.xaml.cs` (② verbs + loadDownloads + caps) ·
`Spixi/Pages/Downloads/DownloadsPage.xaml.cs` (② guard adoption) ·
`Spixi/Data/TransferManager.cs` (② `resolveDownloadPath`) · `src/shells/settings.html`
(② sublevel + dlBuf handlers).

**Auditor scopes:** A = ⑪ end-to-end vs the real C# (SingleChatPage:648-652 /
:1900-1904 / :353; the early-lock via the `sl-waiting-response` carrier; per-peer
reset; the accept-click unlock rationale; can ANY compose path still fire while
pending — attach sheet, drafts, Enter, IME?). B = ⑩ + smoke (does anything else
depend on the decline confirm? desktop.html §6a flow; the one-shot disable vs the
home requests-feed re-flush). C = ①/② C# (formpane tag-replace vs the #262
bidirectional cross-close; the settings dlBuf settle vs a sublevel closed
mid-burst; **the traversal resolver — attack it**: unicode separators, trailing
dots/spaces on Windows, `CON`/device names, case-folding, a name that IS the
root; `Directory.Exists` guard; cap-gating on an old exe).

**Known dials (don't re-litigate):** no confirm on Cancel-request or Decline
(Damir F5'd the two-step as a bug — flag ONLY if you find an irreversible
consequence) · downloads inline = pane-only (mobile keeps the takeover) ·
option (a) was built without re-asking (the brief marked it recommended; Damir
said save questions for last — his sign-off rides the F5).

**⑪ tick-lie enumeration result (verify, then keep in the verdict):** compose
paths = composer/attach/call-button; all pre-approval states now lock all three
(call button was already Approved-gated C#-side, xaml:667). No other FE path
composes a message.

## Batch Q2 (#268) — excerpt canon · wallet request · scrim

**Files:** `src/shells/home.html` (12 excerpt carriers + canonEntry builder +
⑥ contacts/onSendRequest) · `Spixi/Pages/Home/HomePage.xaml.cs` (`onSendRequest`)
· `src/components/desktop-anchors.js` + `src/styles/components/overlay.css` +
`src/shells/chat.html` (scrim) .

**④ deliverable table (the enumeration — verify rows, then this IS the spec):**

| FriendMessageType branch (HomePage.getFriendMessageHelper) | _SL key = en-us | FE type → glyph |
|---|---|---|
| state != Approved | chat-waiting-for-response = Waiting for response | request → user-plus (M5 direction guard) |
| requestFunds local/remote | index-excerpt-payment-request-sent/-received | payment → wallet |
| sentFunds local/remote | index-excerpt-payment-sent/-received | payment → wallet |
| appSession local/remote | chat-app-invite-sent/-received | app-invite → apps |
| requestAdd approved | index-excerpt-contact-accepted = Contact Accepted | request → user-plus (NEW) |
| requestAdd !approved | index-excerpt-contact-request = Contact Request | request → user-plus (NEW) |
| fileHeader | index-excerpt-file = File | file → file-isr |
| voiceCall connected | index-excerpt-voice-call = Voice Call | call → phone |
| voiceCall empty+ended local | chat-call-no-answer = No answer | call-missed → phone-off (NEW — the bug) |
| voiceCall empty+ended remote | chat-call-missed = Missed call | call-missed → phone-off (NEW — the bug) |
| default | *(raw body)* | text (B4 canon) · reaction/gif/draft/typing specials |

All glyphs exist in the registry (phone-off:56 · user-plus:81) — no icon exports.
**Audit:** the canonEntry dual-registration (carrier value + en fallback) — can a
locale where one phrase translates EQUAL to another phrase mis-type an excerpt?
(same accepted class as #252's collision guard — check the guard posture is
stated). The carriers must be same-line (#248). Preview (no C#) must degrade to
en-us matching.

**⑥:** verify the lifted parse handles the component's canonical amount (it
emits `<addr>:<amount>` single-entry, no trailing `|`), `IxiNumber` negative/zero
rejects, `displaySpixiAlert` on HomePage, NO pop. FE: the roster filter
(`directoryRoster().filter(!pending)`) — is `contacts` captured at MOUNT time
(stale roster if the takeover stays open across a flush)? (It is — accepted?
flag as MINOR if a live re-feed is cheap.)

**Scrim (Damir add-on):** `[data-dt-clear]` tags the sheet's PREVIOUS SIBLING
(overlay.js:106 `host.append(scrim, el)`) — verify the assumption holds for both
anchor paths + that dismissal/Esc/stack grammar is untouched; the channel
selector's hand-rolled scrim went transparent on desktop too (Damir said "all
contextual menus" — flag at F5 if he meant only the three examples). Demo
desktop.html keeps its wash (own recipe) — noted divergence, not a bug.

## Batch Q3 (#269) — i18n sweep

**Files:** `src/shells/home.html` only (walletStrings merge + nav/topbar/FAB
labels). New keys: `waitingForAccept` (#266) · `viewExplorerAddress` · `newChat`
— inline fallbacks; Damir's extract-strings run harvests them + machine-drafts.

**Per-shell audit table (from the sweep agent — spot-verify, then it goes to the
inventory):** all 17 shells thread the live `window.SL`; components all default
`getStrings()`; the ONLY FE leaks were home.html's `walletStrings` one-key
override (whole wallet tab English) + the hardcoded chrome labels. C# = the four
HomePage alert sites (be-cutover [i18n-C#], enumerated). **Gate blindness
(INVENTORY, not a fix):** i18n-lint sees only direct DOM-sink literals;
extract --check only fallback conflicts → object-literal `label:`/`title:`
props, partial strings objects, static HTML attributes, C# all slip both gates.

**Audit:** the `walletStrings` merge happens at BOOT — confirm nothing reads it
before `window.SL` is set (script order) and that `tkStrings = assign({}, SL,
walletStrings)` double-merge stays harmless. Verify `?lang=pseudo` would now
show pseudo on the wallet tab + nav (leak test is Damir's local run).

## Batch Q4 (#270) — the native call surface ★ own loop, on-device gate

**Files:** NEW `Spixi/Pages/Call/CallPage.xaml(.cs)` + NEW `src/shells/call.html`
· `Spixi/Utils/SpixiContentPage.cs` (broadcast rewiring; per-page
displayCallBar/hideCallBar/displayAppRequests DELETED; getOverlayHost; lock stage
ZIndex 200) · `Spixi/Pages/Home/HomePage.xaml.cs` (back guard) ·
`scripts/build-shells.mjs` (+call) · `scripts/build-demo-bundle.mjs` (−call-ui) ·
`src/components/call-ui.js` (**tombstone — Damir `git rm` at commit**) · 13
shells (wiring + CSS links removed) · `scripts/smoke-test.mjs` (re-based block).

**Auditor scopes:** A = CallPage presenter state machine (the dedicated static
slot vs the lock's `modalOverlayOp` — can they interleave? lock during ring; ring
during lock — `ensureSurface` refuses staging over `hasModalOverlay()`, then
WHAT presents the ring? verify the modal fallback path fires and is dismissable
ONLY via hideSurface; the 100ms teardown vs a same-tick re-present; the
SizeChanged unsubscribe; ZIndex on WinUI — **if Children-order wins over ZIndex
on any platform, the bar hides under later overlays: on-device item + a
re-order fallback ready**). B = the C# rewiring completeness (grep: NOTHING
pushes addCallAppRequest/displayCallBar/hideCallBar/clearAppRequests/4-arg
addAppRequest to any page anymore; updateScreen/OnAppearing/overlay-present
passes now just re-assert surface state — idempotent?; VoIP threads →
marshaling; the C18b guards + 45s timeout NOT regressed). C = call.html + shell
removals (contract vs CallPage push; ring latch; bar hang-up idempotence; the
13 shells still parse — the destructure edits; the build-shells preflight will
catch a stale bundle, but verify no shell still references a removed symbol;
smoke re-base correctness).

**Known dials (flag only if sharper than stated):** bar NOT presented over
pushed LEGACY pages (they lost the legacy strip — last repoint targets) ·
return-to-call inert (be-cutover C22) · the 4-arg mini-app card push deleted
(dead traffic; C20 decision row updated) · bar-strip resize = one WebView
resize (compositor lag class, #248) · demo desktop.html keeps its own demo
call toggles (components stay exported).

**★ ON-DEVICE ACCEPTANCE (Damir F5, the #215 gate — the shape was built to the
lock precedent but NOT device-verified):** 2-device — ring covers the whole
window on every layout (single, dual-pane, Account open) · identity always
right (nick + avatar from C#) · Accept → full-window morphs to the top strip,
app below live · outgoing call from a chat → strip appears (C19) · decline /
remote hang-up / 45s timeout / answer-elsewhere all dismiss · hardware back
dead during ring, normal in bar state · lock over a live call covers the strip
· a call while a legacy money page is open → ring still appears (modal
fallback) · no call UI remnant in any shell.

## Findings for the audit inventory (NOT fixed — freeze rule)

1. `TransferManager.cs:542` — receive-time `transfer.fileName` traversal
   (remote-peer-supplied name into Path.Combine) → be-cutover S16 residual.
2. Mini-app session requests have NO UX anywhere (pre-existing; push now
   removed) → C20 decision.
3. i18n gate blindness (component-prop literals / partial strings objects /
   static HTML attrs / C# slip i18n-lint + extract --check) → refactor-phase
   lint item.
4. `src/components/.fuse_hidden0000001100000001` still present (#255
   housekeeping) + stale `draft/*.todo.json`.
5. Shells capture `strings` once at boot — a future runtime locale swap
   wouldn't propagate (C# reloads today; harmless).
6. Demo `desktop.html` diverges on two counts: scrim wash on anchored menus +
   its own call-ui toggles (production changed; demo not forked — by rule).
7. `detailContent` in HomePage is never assigned since #263 — inert legacy
   sites (flagged there; still true). **Q4 update:** `getLivePages()` (its only
   remaining consumer) is now deleted, so `HomePage.getDetailContent()` is
   reachable only from `Utils.getChatPage`/`reloadAllPages`/`SettingsPage` —
   all of which still work; the *assignment* gap is unchanged.
8. contact-request.js `host` param now unused (kept for API stability);
   `declineTitle`/`declineBody` string keys orphaned — prune at extract
   (`declineNote` never existed — that part of the claim was speculative).
9. Wallet Receive contact strip captures the roster at mount (no live re-feed
   while the takeover is open) — cheap MINOR if the loop wants it.

### Added by the Opus Q1/Q2/Q3 loop (2026-07-12)

10. **The shells have NO automated i18n gate.** `pseudo-locale-smoke.mjs` renders
    3 components and never loads a shell; `i18n-lint.mjs` only sees literals on
    direct DOM-sink lines. A `strings:` **prop object** — the exact bug class that
    anglicized the whole wallet tab — is invisible to both **by construction**.
    Cheap guard: a static smoke assert that no shell passes a `strings:` value
    other than the live dict or `slWith(...)`. → refactor-phase lint item.
11. **Static HTML attributes are un-i18n'd across the board**: `aria-label="Loading"`
    on the boot spinner in ~14 shells · `aria-label="Messages"` on chat's log region ·
    `<title>` in 13 shells · the bottom-nav landmark name ("Main"). All need either
    new keys or C#-side `*SL{}` substitution (which works inside an attribute).
12. **`Friend.approved` vs `Friend.state` is the project's most load-bearing
    unverifiable premise** (#215 class). `Friend`/`FriendState` are Ixian-Core;
    nothing in-tree assigns `FriendState.Approved`, yet ⑪'s unlock, the chat-list
    excerpt, the call button and now the money-request guard all read `state`.
    `approved` is written by the two accept handlers and means "I approved THEM",
    NOT "the handshake completed". Anything new that gates on connectedness should
    check **both** — and an on-device F5 should settle the coupling once, for good.
13. **The `.fuse_hidden…` file and stale `draft/*.todo.json` are still present**
    (#255 housekeeping) — and `src/components/.fuse_hidden0000001100000001` carries
    a `strings = {}` (the #257 empty-default class). Not bundled (no `.js`), but
    delete it before the freeze.
14. **Built shells under `Spixi/Resources/Raw/html/` are stale, and the five launch
    ones still read as BINARY to ripgrep** (#255 NUL debris). The rebuild
    regenerates them — never commit them as-is.
15. **Build order is now load-bearing in TWO places** (both fail-loud): the bundle
    preflight (#258) and the new strings-IIFE preflight (Q3). `build-strings-iife`
    and `build-demo-bundle` must BOTH precede `build-shells`.
16. `chatlist-item.js` maps an **outgoing unanswered call** and an **incoming missed
    call** to the same `call-missed` type, which the CSS tints `--text-error` — an
    outgoing "No answer" should not read as an alarm. Needs a `call-noanswer` type.
17. `SSystemAlert.cs:37` hardcodes `CloseButtonText = "OK"` and **ignores** its
    `cancel` parameter. Zero callers today — a landmine if ever wired.

### Added by the Opus Q4 loop (2026-07-12)

18. **`PopModalAsync` is pop-the-TOP everywhere in this tree** — there is no
    `RemoveModal(page)` in MAUI. `LockPage.xaml.cs:122/171`, `HomePage:1299`,
    `OnboardPage:34/65/70`, `DevPage:99`, `ContributorsPage:85` all assume they
    are the top modal. Q4's CallPage was the first code that could push a
    *second* modal, which is what surfaced it. The invariant is now
    "the lock and the call surface are mutually exclusive" (Q4 verdict MAJOR-1/2),
    so nothing stacks modals today — but **any future second modal re-opens this
    whole class**. → refactor-phase item: a `popModal(page)` helper that refuses
    when the page is not top.
19. **`OnDisappearing() → Dispose()` (`SpixiContentPage:1573-1578`) is guarded only
    by `NavigationStack.Contains(this)`, not `ModalStack`** — so a modal page that
    is covered by another modal has its WebView torn down while it is still on the
    stack. Unreachable today (see 18), and the guard was NOT widened because
    MAUI's Disappearing-vs-pop ordering can't be verified from the tree (#215) and
    a wrong guard would leak every popped modal's WebView. → BE/on-device item.
20. **The 45s ring timeout keeps running while the app is locked** — correct
    (the call is real), but it means a call that arrives during a lock can expire
    unseen. Product dial for Damir, not a defect.
21. **Nothing re-broadcasts call state on a 1s cadence** — `UIHelpers.refreshAppRequests`
    is a one-shot set by `StreamProcessor` on call events. Every "the surface will
    re-assert itself" recovery path in Q4 therefore depends on *something* re-arming
    that flag (`OnAppearing`, overlay-present, and now `ensureSurface`'s two
    refusal branches + `onUnlock` + `closeModalOverlay`). Worth a single
    `broadcastCallState()` at the end of `VoIPManager.onReceivedCall` at the BE
    pass — it would make the ring's first paint event-driven instead of
    tick-driven (≤1s today).

## Damir's F5/build checklist (after the loops)

1. `git rm src/components/call-ui.js` (tombstoned — sandbox can't delete).
2. FULL build: `node scripts/extract-strings.mjs` (expect +3 keys:
   `waitingForAccept`/`viewExplorerAddress`/`newChat`) → `build-locales` →
   `build-strings-iife` → **`build-demo-bundle` → `build-shells`** →
   `i18n-lint` + `pseudo-locale-smoke` + `smoke-test`.
3. Build net10.0-windows (NOT Rebuild). New files: `Spixi/Pages/Call/CallPage.xaml(.cs)`
   — MAUI globs pick them up; verify the xaml compiles (x:Class SPIXI.CallPage).
4. F5 per-batch checklists (#266–#270 status columns) — ⑪ and ③ are the
   2-device ones.
5. Commit order: Q1 (#266+#267) · Q2 (#268) · Q3 (#269) · Q4 (#270) — one
   commit per batch, per the work order.

## Open questions for Damir (saved for last, per his instruction)

1. **② mobile**: downloads inline is PANE-ONLY (mobile keeps the DownloadsPage
   takeover, Backup parity). Want the sublevel on mobile too? (One gate flip —
   `paneMode &&` → cap-only.)
2. **Scrim scope**: the bot channel selector was included as a "contextual
   menu" (no wash on desktop). Keep, or wash back?
3. **⑩/⑪ grammar**: Decline AND Cancel-request are now single-click,
   confirm-free. Sign-off at F5.
4. **③ return-to-call** (tap the call strip → open that conversation) = C22,
   a ~1h C# route. Want it in the BE cutover?
5. **⑨** group-join chip is BE-gated (GJ1) — nothing to see until the C#
   message exists.

---
*(Opus verdicts get appended below, one section per batch.)*

---

## VERDICT Q1 (#266 + #267) — **PASS after fixes** · 5 MAJOR + 8 MINOR found, all landed

Loop: 3 disjoint read-only auditors (A ⑪ end-to-end vs the real C# · B ⑩ + smoke + the requests re-flush · C ①/② C# + the traversal guard) → 3 fix agents (disjoint scopes: JS shell+component · C# · smoke+settings) → a FRESH break-my-verdict re-reviewer (found 1 MAJOR the fixers missed) → round-2 fixes → CLEAN.

### Evidence table — what was actually wrong

| # | Sev | Finding (file:line) | Landed fix |
|---|---|---|---|
| 1 | **MAJOR** | **Accept left the request pane ARMED, and Decline then DELETED the contact you just accepted.** `chat.html:1636` unlocked the composer but never removed the pane, and nothing C#-side clears it: `SingleChatPage.onAcceptFriendRequest:886-895` sets `friend.approved = true` + `sendAcceptAdd` and pushes **no UI command**, never calls `loadMessages` → the `clearMessages`→`removeRequestPane` path never fires. One tap on the still-live Decline → `ixian:undorequest` → `FriendList.removeFriend` (`xaml:353-359`). Legacy did it right in JS (`js/chat.js:1880-1883`). The docblock's "C#'s re-flush after accept clears it" was **false**. | `markRequestResolved()` (per-peer latch + `setComposerLock(null)` + `removeRequestPane()`) on the Accept click; docblock corrected. |
| 2 | **MAJOR** | **Accepting from the CHATS-LIST card left an open conversation with a permanently hidden composer.** `HomePage.onAcceptRequest` never reaches an open `SingleChatPage`; the shell's only `'incoming'` release was a non-waiting presence text, but `updateScreen:1884-1898` pushes `chat-online` **only** if `friend.online && setOnlineStatus == false` and pushes **nothing** when the freshly-approved peer is OFFLINE. | **One-line C#**: `_waitingForContactConfirmation = true` is now also set in `updateScreen`'s pending branch (`:1906-1917`) → the existing `:1900-1904` block becomes a general *was-pending → is-Approved* edge detector that pushes `showRequestSentModal("0")` once, on **every** accept path. Shell: `"0"` now clears ANY lock + drops the pane (was: `'outgoing'` only). |
| 3 | **MAJOR** | **A spent card could still fire the other action.** `contact-request.js:65` disabled only the clicked Decline; Accept stayed live → decline (friend removed) → Accept → `sendAcceptAdd` to a deleted contact. | Either action now SPENDS the card (both buttons disabled). `setLoading` on an already-disabled button still renders the "Accepting…" latch (`button.js:128` only restores what it disabled) — verified. |
| 4 | **MAJOR** | **The re-based decline assertions would FAIL Damir's build.** `smoke-test.mjs:110-114` sat in the **app-frame** block and clicked app-frame's **hand-rolled** demo button (`app-frame.html:404-421`), which still opened a confirm modal and never disabled → both new assertions red. | Assertions moved into a real component block (`createContactRequest`, counters, one-shot + spent-card + mirror case); app-frame's inline demo decline converted to the shipped grammar. |
| 5 | **MAJOR** (re-review) | **The Downloads open/delete could resolve onto the WRONG FILE.** Both hosts took the name off the `HttpUtility.UrlDecode`d url (**form** decoding: `+` → space), and the shells sent the name **unencoded**. File names are PEER-SUPPLIED (`TransferManager:587` writes `transfer.fileName` verbatim). `C++ notes.pdf` → silently no-ops; a decoy named `invoice%2Epdf` survives canonicalization → resolves onto the real `invoice.pdf` → **a wrong-file DELETE the confirm dialog never named**. | Both halves: C# takes the name off the RAW url with `Uri.UnescapeDataString` (decode exactly once), and the shells now `encodeURIComponent(name)` (`settings.html`, `downloads.html`). The traversal guard still runs on the decoded name — `..%2f` stays rejected, fail-closed. The contract is written into both C# docblocks. |
| 6 | MAJOR | `DownloadsPage.loadFiles` (the **mobile / old-exe only** downloads path) had no `Directory.Exists` guard while its SettingsPage twin got one — nothing in the tree ever creates the Downloads folder → `DirectoryNotFoundException` out of `OnAppearing` on a device that never completed a transfer. | Guard mirrored. |
| 7 | MINOR | Two greedy `Contains("ixian:save:")` / `("ixian:apply:")` branches made the new download verbs' ordering load-bearing, and were **self-injectable** (a nickname containing `ixian:save:` sent via `apply:` rewrote the nick + popped the page). | → `StartsWith(Ordinal)` + `Substring`. SettingsPage now has **zero** `Contains` dispatch. |
| 8 | MINOR | ① was **half-landed**: the chained `AppNewPage → AppDetailsPage` pushes (`:178`, `:213`, `AppDetailsPage:249`, `replaces: this`) passed no tag/column → `-1` = full-span → "+" → add-app opens as a col-1 pane, then picking a file blows details up to a **full-window takeover** (exactly quirk ①). | `pushPageLoaded` now inherits the replaced overlay's tag+column on a chained push (3 callers in the tree, all in this chain — blast radius is exactly the intended one). Re-review then found the stale-sweep double-teardown → excluded `op.replaces` from the tag sweep. |
| 9 | MINOR | A pending **GROUP** would take the early lock (C#'s waiting branch is the `else` of `if (friend.bot)` → covers groups) → composer hidden with **no strip and no request pane** = a chat with zero affordance. | Early lock gated `!mode.isMulti` (safe: `setChatMode` is pushed before the first `updateScreen`). |
| 10 | MINOR (re-review) | The message **context menu** was the last ungated outbound surface: a pending-outgoing chat still renders one row (the empty `requestAddSent` marker falls through `insertMessage`'s `requestAdd` special-case, `xaml:1306-1322`), so long-press → **React** (`contextAction:like`) / **Tip** were reachable on a non-contact. | Menu is no longer ATTACHED while locked (an opened menu with every action gated would be a dead menu, #214); `onMenuAction` + `reactToMessage` keep their own guards. |
| 11 | MINOR | `File.Delete` / `SFileOperations.open` unwrapped inside a `WebNavigating` handler; the delete branch refreshed the list only on success (a rejected name → silently stale). | try/catch → `Logging.warn`; the list refresh is now unconditional. |
| 12 | MINOR | `resolveDownloadPath` accepted an alternate-data-stream name (`file.txt:secret`) and would break entirely if `downloadsPath` ever ended with a separator. | `Path.GetFileName(name) != name` (Ordinal) + `GetInvalidFileNameChars()` + a `TrimEndingDirectorySeparator`-anchored root. **Verified this rejects nothing legitimate**: the list is built from `Path.GetFileName` over `Directory.EnumerateFiles`, so a file that exists on disk can never contain an invalid char. |
| 13 | NIT | `HomePage:676` `StartsWith("ixian:appDetails")` was missing its colon while `:678` slices `"ixian:appDetails:".Length`; `callVisible` was the one per-peer flag missing from `onChatScreenReady`'s reset; the settings downloads sublevel retained a detached `downloadsEl` + a pending settle timer after leaving. | All three landed. |

### ★ Invariants — re-verified holding
`#221` chat isolation (nothing composes chat into another pane's DOM/JS) · **money**: nothing in Q1 signs, broadcasts, or moves funds; `pushModalLoaded` / `stageMargin` / the lock-covers-everything invariant (#230/#235) untouched — the `modalOverlayOp != null` fail-closed drop still precedes any staging (`SpixiContentPage:820`) · **frozen bridge**: the only new verbs are the sanctioned `ixian:loadDownloads` / `openDownload:` / `deleteDownload:` (cap-gated `downloadsInline`), and cap-gating degrades cleanly in BOTH directions (old exe + new shell → `ixian:downloads` takeover; new exe + stale shell → never emits) · `#214` no dead buttons · `#248` the `sl-waiting-response` carrier is same-line · `#265` no multi-line/aliased import added.

### 🟡 Logged, NOT fixed (F5 / Damir / BE — never silently changed)
1. **★ The one load-bearing premise this batch cannot prove from the tree (#215 class):** `friend.approved = true` ⇒ `friend.state == FriendState.Approved`. `Friend`/`FriendState` live in **Ixian-Core, outside this repo**; nothing in-tree ever assigns `FriendState.Approved`. The whole ⑪ unlock chain reads `state`. Strong circumstantial evidence says the coupling holds (an accepted contact shows Online in chat and a real chat-list excerpt — both gated on `state == Approved`), and the FE latch carries the current page-load either way. **F5 (2-device): accept an incoming request in-chat, back out, RE-OPEN the chat — the composer must be live with no request pane.** If it isn't, the coupling is false and C# needs an explicit unlock push.
2. **Unapproved GROUPS keep the delivery lie** (fix #9 above deliberately does not lock them — a lock with no affordance is worse). Whether a real group ever sits in a pending state is core-side. **F5:** does a fresh group ever show "Waiting for response" in the topbar? If yes → BE row.
3. `waitingForAccept` is not in any dictionary yet → the strip is English until Damir's `extract-strings` + `build-locales` run.
4. Decline/Cancel-request are now confirm-free single-click (Damir's F5 verdict, brief §Q1 dials) — no irreversible consequence found: `HomePage.onDeclineRequest`/`onAcceptRequest` both null-guard, so a double-emit is idempotent.
5. `TransferManager:587` — the peer-supplied `transfer.fileName` is still trusted at **receive** time (be-cutover S16 residual). This loop hardened only open/delete.

---

## VERDICT Q2 (#268) — **PASS after fixes** · 4 MAJOR + 6 MINOR found, all landed. ★ MONEY: signs nothing.

Loop: 3 disjoint auditors (A ④ excerpt canon vs the real C# enumeration · B ⑥ the money surface · C the desktop scrim) → 2 fix agents (C# / `home.html`) + 2 direct fixes (CSS, smoke) → a FRESH break-my-verdict re-reviewer (found 1 MAJOR in the fix itself) → round-2 fix → CLEAN.

### ★ MONEY VERDICT — `onSendRequest` signs nothing, and could not be made to
Two independent readers traced it to the leaves. Its complete leaf set is `String.Split` · `ExtendedAddress.Validate` · `IxiNumber` · `FriendList.getFriend` · `Node.addMessageWithType(..., FriendMessageType.requestFunds, ...)` · `StreamProcessor.transactionRequest` · `displaySpixiAlert` · `Logging`. **No `Transaction` is constructed; no wallet/seed/private key is touched anywhere in the path** (a repo-wide grep for `signTransaction`/`sendTransactionFrom`/`prepareTransactionFrom`/`new Transaction(` returns zero hits inside it). A request is a **chat message**; the payer still reviews and signs in the native flow. The WebView is handed no balance, no fee, no key. The FE amount is `[0-9.]`-sanitized (`money.js sanitizeAmount`/`canonicalAmount`, `requestable()` requires a `1-9`), so no `+`, comma, exponent, `:` or `|` can reach the C# grammar. The wallet **SEND** path was not touched and stays gated (`composeSend` cap OFF). Mini-apps cannot emit the verb (`onNavigatingGlobal` claims only `appAccept`/`appReject`/`hangUp`; a mini-app's own `onNavigating` drops everything else).

### Evidence table

| # | Sev | Finding (file:line) | Landed fix |
|---|---|---|---|
| 1 | **MAJOR** | **The money strip offered UNAPPROVED contacts, and lied about it.** The shell's `pending` flag is fed only from the OUTGOING "Request sent" chat-row marker — but CH2b routes an **incoming**, not-yet-accepted request OUT of the chats list into the Requests feed, so that contact has **no chat row**, is never flagged pending, and **renders in the strip**. `onSendRequest` guarded only `request_friend != null && _amount > 0` — **no approval check**. Tapping it latches "Request sent ✓" and announces it, for a `requestFunds` message that cannot arrive: the ⑪ delivery-lie class, on a money surface. | **C# fail-closed guard** (the security boundary) + an FE filter that also excludes `state.requests` (the UX half). Every rejection path now alerts (`global-invalid-address-*`, existing keys) + logs — the silent no-op is gone. |
| 2 | **MAJOR** | **A GROUP or a BOT could be asked for money.** The shell excludes groups heuristically (an avatar sentinel + a CH1 kind flag that only exists for contacts WITH a chat row) → a custom-avatar, message-less group slips through; C# then resolved it and composed the request against the group Friend. | Same guard, **fail-closed on type**: only `FriendType.Normal` passes (Group/Payment/Temporary/any future Ixian-Core member is rejected), plus `!bot`. |
| 3 | **MAJOR** (re-review) | **The new guard checked the wrong flag.** `approved` means *"I approved THEM"* (its only two writes are the accept handlers), so a contact **I** added who hasn't accepted me is still `approved == true` — the exact outgoing-pending recipient the guard was written to reject. | The guard now requires **both** `approved` **and** `state == FriendState.Approved` (the app's canonical "we are connected" test — a non-Approved friend has its excerpt forced to "waiting for response" and gets no call button). Covers both directions; cannot reject a contact that shows a normal chat row today. |
| 4 | **MAJOR** | **The excerpt canon is defeated by C#'s "You:" self-prefix.** `getFriendMessageHelper` prefixes `_SL("index-excerpt-self")` onto **7 of the 11** canon phrases for own-messages. The canon only worked because that key is EMPTY in en-us — it is **`Saya:` in `id-id`** (`lang/id-id.txt:305`), and `App.xaml.cs` persists the OS culture on first run. So in Indonesian **every outgoing event row loses its glyph** — the exact bug ④ exists to kill — and it is a landmine for the other 12 locales the moment a translator fills the key in. | A `#sl-ex-self` carrier + a `selfStrippedKey()` retry: the canon is re-tried with the prefix stripped, and the strip is applied **only when the stripped key HITS a canon entry** (so a counterpart message can never have its text altered). The displayed text keeps the prefix as C# composed it (dial). |
| 5 | MINOR | `canonEntry` had an **asymmetric** collision posture: an en-us fallback couldn't clobber an entry, but a **carrier value could** — silently re-typing an excerpt (a payment rendered with a call glyph) in some future locale. No shipped collision exists (all 13 lang files checked), but `chat.html`'s #252 guard explicitly refuses to act when a translation collision makes a signal ambiguous. | Ambiguous key → `null` (degrades to plain text; `excerptFromRaw` already gates on `if (kind)`). `EXCERPT_CANON` is now `Object.create(null)` — a message of literally `toString`/`constructor` previously resolved to an inherited **function** as its excerpt type. |
| 6 | MINOR | The `sendrequest` dispatch was `Contains(...)` (legacy's form — safe only on WalletReceivePage, which had no other data verbs). On HomePage it sits AHEAD of every data-carrying verb. | → `StartsWith(Ordinal)`, matching every verb added since #216. |
| 7 | MINOR | Light mode: with the wash gone, an anchored desktop menu was separated from the page by **shadow only** — `--surface-menu` == `--surface-screen` (both `neutral-10`), so a white dropdown over the white chats list read as loose text. | `1px solid var(--outline-neutral-03)` on `:root[data-desktop] .c-sheet[data-dt-anchor]` (art dial — drop it and re-dial the elevation if Damir prefers). |
| 8 | MINOR | The whole no-scrim feature rests on ONE unasserted line in a **different** file (`overlay.js` `host.append(scrim, el)` → the previous-sibling lookup). If anyone ever wraps the sheet or appends the scrim last, the wash silently returns with nothing failing. | Two static smoke assertions: the append-order/previous-sibling/`[data-dt-clear]` triad, and "a transparent scrim still catches the outside click" (no `pointer-events: none`). |

### Scrim — the two structural hazards do NOT exist (attacked, held)
A scrim is created **fresh** per open (`overlay.js:97`) and never pooled, and modals never route through `clearScrimFor` → **a stale `data-dt-clear` can never transparent-ize a MODAL**. Appends are end-only, so an EXITING scrim/sheet pair cannot break the previous-sibling lookup for a new one. Dismissal grammar is byte-untouched: the scrim click listener, Esc, `dismissTopOverlay`, the `[data-overlay-open]` scroll lock, and `.c-scrim`'s default `pointer-events` are all unchanged — a transparent scrim still catches the click. Mobile is byte-identical (every rule `:root[data-desktop]`-gated; `desktop-anchors.js` early-returns without the flag). The channel selector's #205 focus trap/restore is intact (the change there is one CSS line).

### ④ — the enumeration table in §Q2 above is CORRECTED
There is **no** canon entry for `chat-waiting-for-response` (the unapproved-state phrase is handled AFTER the canon by M5, direction-gated). The canon has **12** entries. Also missing from the original table: `friend.isTyping` overrides everything (keyed on the TYPE, not the text — locale-proof by construction), and the **self-prefix column** (finding #4) — which is precisely what the table not modelling it cost.

### 🟡 Logged, NOT fixed
1. **Rejection copy dial:** an unapproved/group/bot recipient is reported with `global-invalid-address-*` — the address is valid, the *relationship* isn't. Misdirects the user on a money surface. Needs a new key → Damir's call (string freeze).
2. **An outgoing unanswered call renders in error-RED** in the chat list: `chatlist-item.js:69` maps both `chat-call-no-answer` (outgoing) and `chat-call-missed` (incoming) to one `call-missed` type, and the CSS tints it `--text-error`. Red = "you missed something" is the wrong grammar for a call *you* placed. Needs a `call-noanswer` type + neutral tone (component change → bundle rebuild). Damir dial.
3. **The Receive contact strip is a snapshot** (roster captured at mount; no `setContacts` on the component). With the C# guard in place this is now cosmetic, not a lie. Cheap MINOR if Damir wants it.
4. **Invisible-but-blocking scrim** (Damir dial): with no wash, an open desktop dropdown still swallows clicks and freezes the wheel with zero cue. Native dropdowns dismiss on scroll — a `wheel`-once → dismiss would restore the affordance.
5. **`createWalletSend` still consumes the UNFILTERED roster** (groups/pending as money recipients) — cap-gated OFF, deliberately untouched, and it must be fixed as a **prerequisite of the wallet-send batch** (restating the #255 backlog; the new guards do NOT cover it).
6. Demo `desktop.html` keeps its own anchor recipe → still shows the wash there (noted divergence, not a bug).

---

## VERDICT Q3 (#269) — **CLEAN** (0 MAJOR in the break-my-verdict pass) · but the sweep had MISSED 3 MAJORs, now fixed

Loop: 2 auditors (A `home.html` merge/script-order · B an INDEPENDENT leak re-hunt across all 18 shells + the C# alert sites) → 1 fix agent + 1 direct fix → a FRESH break-my-verdict re-reviewer → **0 MAJOR**.

**The #269 sweep's headline claim — "the only FE leaks were `home.html`'s `walletStrings` one-key override + the hardcoded chrome" — was FALSE.** Both auditors independently found the same bigger one:

| # | Sev | Finding | Landed fix |
|---|---|---|---|
| 1 | **MAJOR** | **`<html lang="en">` is hardcoded in all 18 shells and nothing ever sets it** — while `timestamp.js docLocale()` reads exactly that attribute, and it is THE locale for every `Intl`/`toLocale*` call in the components. So a German/French/Russian user got **English weekday names in the date separators, English month abbreviations in the chat list and tx rows, and 12-hour clocks** — on top of correctly translated copy. This is very likely the core of Damir's "languages are not fully wired". Neither lint gate can see it. | Fixed in **one place**, not 18: the generated `SpixiStrings.get(code)` now also sets `document.documentElement.lang` (BCP-47-shaped codes only · `Intl.getCanonicalLocales` in a try/catch · `typeof document` guard · **and a `!locales[code]` guard** so a dictionary-less hidden locale (it/ja/id/cn/lt) keeps `lang="en"` rather than getting foreign date formats on English copy). Covers all 18 shells + the demos on the next `build-strings-iife`. |
| 2 | **MAJOR** | **The Receive/Send takeover titles used dictionary keys that DO NOT EXIST** (`tkStrings.receiveTitle` / `sendTitle`) → hardcoded English in every locale, **on the very surface #269 declared fixed**. A German user taps "Empfangen" (correctly translated, `wallet-hero.js`) and lands on a screen titled "Receive". | Use the EXISTING, translated `receive` / `send` keys. No new key. |
| 3 | **MAJOR** | **The merge was Proxy-hostile → the `?lang=pseudo` leak gate was BLIND on the wallet tab.** Under pseudo, `window.SL` is a get-trap-only Proxy; `Object.assign` copies only own enumerable keys → the merge produced an **empty** dictionary → the wallet tab fell back to English, i.e. the pre-fix bug — so the one manual gate Damir is told to run could not see the surface it exists to check. (Real locales are plain objects → production was fine.) | `slWith()` — a delegating Proxy (`get` + `has`), reading `window.SL` live. Verified safe: **no component spreads, enumerates, `JSON.stringify`s or `Object.assign`s its `strings` argument** anywhere in `src/components` (bracket reads are served by the `get` trap). The redundant `tkStrings` double-merge was collapsed. |
| 4 | MINOR | The fix could ship as a **silent no-op**: the shells inline `strings.iife.js` verbatim, so running `build-shells` without `build-strings-iife` first loses the locale fix with no error and no gate. | **New preflight in `build-shells.mjs`**: hard-fails if the inlined strings IIFE lacks `setDocLang` (mirrors the #258 bundle preflight). |
| 5 | MINOR | The BE row's citation was wrong and one site was missed. | `docs/be-cutover-brief.md` [i18n-C#] corrected: "No recipient selected" is at `HomePage.xaml.cs:**1175**` (not :1112), and **`LockPage.xaml.cs:214`** hardcodes `"Cancel"` on the biometric-failure dialog (localized title/body, English button) — **missed by the #269 sweep**. Plus a latent note: `SSystemAlert.cs:37` hardcodes `CloseButtonText = "OK"` and ignores its `cancel` param (zero callers today). **Logged, not fixed** — freeze rule honoured. |

**Re-verified CLEANs (attacked, held):** script order is sound in **every** shell (`icons.iife` → `strings.iife` → `window.SL = get(...)` → bundle → shell script, all plain non-defer scripts in document order, and `inline.mjs` rewrites `<script src>` **in place** so the built shells keep it) — the "merge builds an empty dict because SL isn't set yet" hazard does not occur · **no other partial-`strings` object exists** anywhere in `src/shells` or `src/components` (re-verified independently — this was the bug class, a miss here would have been a MAJOR; the wallet tab really was the only one) · the batch still introduces **exactly 3** new keys, none colliding → `extract --check` will not block the build · the C# alert sites were logged, not silently fixed.

### 🟡 Logged, NOT fixed (inventory / new-key asks)
1. `chat.html:305` `aria-label="Messages"` on the `role="log"` region — static English, and **no suitable existing key** (`message`/`chatPlaceholder` are CTA/placeholder senses; labelling the log with a CTA key would be worse). New-key ask: `messageLog: "Messages"`.
2. `aria-label="Loading"` on the boot spinner in **~14 shells** (static HTML; the `loading` key exists but no JS reaches the node before `window.SL`). Either re-label in each boot script or substitute C#-side (`*SL{}` works inside an attribute).
3. `<title>` is hardcoded English in 13 shells (SR-reachable document name).
4. The bottom-nav landmark is announced as **"Main"** in every locale (`bottomnav.js` `ariaLabel = 'Main'`); the visible labels ARE threaded. New-key ask.
5. **Structural:** the shells have **no** automated i18n gate at all. `pseudo-locale-smoke.mjs` only renders 3 components and never loads a shell; `i18n-lint.mjs` only sees literals on direct DOM-sink lines. A `strings:` prop object is invisible to both **by construction** — which is exactly why the original bug survived. A static smoke assert ("no shell passes a `strings:` object that isn't the live dict or `slWith(...)`") is the cheap guard; a real shell-level pseudo pass is the thorough one. → refactor-phase lint item.
6. Demo pages still hard-blank the dictionary (`const strings = {}` in `demo/wallet.html`, `settings.html`, `chats.html`, `apps.html`, `chat.html`) — demo-only, but a manual `?lang=de-de` pass on a DEMO will show English and *look* like a regression. Don't misdiagnose it at F5.
7. **F5 premise (could not verify from the tree):** the on-device WebView must ship full ICU data for de-de/ru-ru/sr-sp/sl-si/pt-br. A small-ICU Android WebView would silently keep English date formats even with the correct `lang`. Check one date-separator per locale.

---

## VERDICT Q4 (#270) — **PASS after fixes** · 5 MAJOR + 5 MINOR found, all landed. ★ The two headline MAJORs were **lock-integrity** bugs.

Loop: 3 disjoint read-only auditors (A = the CallPage presenter state machine × the lock interleave · B = C# rewiring completeness + marshaling + the #221/#265 gates · C = `call.html` + the 13 de-wirings + the build/smoke re-base) → fixes landed → a FRESH break-my-verdict re-reviewer, which **found a 5th MAJOR the fix set had missed** (a lock that is *staging*) and landed it → CLEAN. File tools only (#175); Damir runs the build + smoke.

**All three auditors independently converged on the same root cause:** the ring's **modal fallback**. MAUI's `ModalStack` sits above the *entire* page tree — above the ZIndex-200 lock stage that the whole #230/#233 lock model rests on. Everything below follows from that one line.

### Evidence table — what was actually wrong

| # | Sev | Finding (file:line) | Landed fix |
|---|---|---|---|
| 1 | **MAJOR ★ security** | **The RING presented ABOVE the lock screen.** `ensureSurface` refused the *in-place* stage while locked (`CallPage:318-321`) and then **fell straight through to `PushModalAsync`** (`:374-393`) — which lands above the lock in all three lock shapes (in-place `modalOverlayOp`; a pushed-modal lock; the boot lock as root page). On a **locked** device the ring painted the **caller's nickname + avatar** and offered **Accept/Decline**. It also corrupted the lock's own dismissal: `LockPage.performUnlock:171` pops the *top* modal → a successful unlock popped the **ring**, leaving the lock on screen. Pre-#270 the DOM ring rendered *under* the lock — this was a **new** exposure, and it contradicted CallPage's own docblock ("a lock must cover everything, including a live call's UI"). | **The lock and the call surface are now mutually exclusive, and the lock wins.** New `CallPage.lockUp(rootNav)` (in-place · modal · boot/root) → `ensureSurface` returns null and **re-arms `UIHelpers.refreshAppRequests`**, so the ring/bar re-presents on the first UI tick after the unlock. The call keeps running and **ringing audibly** meanwhile. Matches the #258 accepted dial ("no ring while locked"). |
| 2 | **MAJOR ★ security** | **A call event could POP THE LOCK.** `hideSurface`'s modal branch did `rootNav.PopModalAsync(false)` whenever `ModalStack.Contains(page)` — but `PopModalAsync` pops the **TOP** of the stack, not `page`. Reachable without exotic timing: on a legacy page → incoming call → ring presented **modally** → user backgrounds >5s and resumes → `App.OnResume:246` (its `CurrentPage` check cannot see a modal) stages the lock, `canShowInPlace` fails (`ModalStack.Count != 0`) → the **lock is pushed above the ring** → the 45s ring timeout or a remote hang-up fires → `hideSurface` → **the LOCK is popped**. `App.isLockScreenActive` stays `true` (only `onUnlock`/`onLockPresentFailed` clear it) ⇒ **no further lock for the whole session**. | Three layers: (a) `App.OnResume` now calls `CallPage.hideSurface()` **before** staging the resume lock → nothing can be modal-above a lock; (b) `hideSurface` pops **only** when `ModalStack.LastOrDefault() == page` (fail-closed belt, `Logging.error` if ever hit); (c) `OnBackButtonPressed` now returns `isRingPresented()` instead of a blanket `true`, so a modal that outlives its call stays dismissable instead of wedging the app. |
| 3 | **MAJOR (re-review)** | **`lockUp()` was blind to a lock that is STAGING.** `pushModalLoaded` loads the lock invisibly for up to **~1.3s** before presenting — during that window `hasModalOverlay()` is false, the ModalStack is empty and the nav top is the host, so a ring arriving there was still admitted, took the modal fallback, and ended up **unpoppable under the lock** (fix #2's fail-closed branch then leaves a dead page on the stack; on WinUI there is no hardware back to escape it). The fix set's own comment claimed this was "unreachable by construction" — it was not. | New `SpixiContentPage.isLockStaging()` (derived from `activePreload`, so it can never latch on and kill the call UI) folded into `lockUp()`. |
| 4 | **MAJOR (functional)** | **Answering a modal-fallback ring left the call with NO UI at all.** `showBar`'s `wasModal` branch called `hideSurface()` and then **synchronously** `ensureSurface()` — but `MainThread.BeginInvokeOnMainThread` **posts** even when already on the main thread, so `ensureSurface` saw the dying modal, re-used it as the "bar" (a full-window opaque cover), and the queued teardown then cleared the presenter entirely. Net: a live call with no strip and **no hang-up**. | `hideSurface` now clears its statics **synchronously** (they are `callLock`-guarded and touch no view — this also closes a second-call/teardown race where a new ring could re-use a dying page), and **re-asserts `broadcastCallState()` once the modal has really popped**. `showBar`'s `wasModal` branch simply hands off and returns. |
| 5 | **MAJOR (FE)** | **The desktop call bar rendered as a clipped pill on an opaque band.** `callbar.css:26-35` (`:root[data-desktop] .c-callbar`, specificity **0-3-0**) OUT-SPECIFIES `call.html`'s `body[data-mode="bar"] .c-callbar` (**0-2-1**) — and `call.html:10` sets `data-desktop` on every desktop UA, i.e. on WinUI, the platform this batch targets. The #264 floating pill (8px offset, 560px, radius-full) was laid into a stage viewport that is **exactly** `--call-bar-h` tall with `overflow:hidden` ⇒ its bottom 8px + radius were **clipped**, with the rest of the opaque native stage showing as a band around it. | `:root[data-desktop] body[data-mode="bar"] .c-callbar` (0-4-1) + its `[data-open]` twin take the strip back on the production surface. The floating pill is a DOM-overlay grammar; **this stage IS the strip**. `callbar.css` untouched → the demos keep the pill. **Damir: art dial.** |
| 6 | MINOR | **The bar could become a full-window input blocker.** `applyStageLayout` derived the strip from a bottom margin over `grid.Height` — which is `-1`/NaN before the first arrange → margin 0 → the **opaque, input-eating** stage covered the whole window. | The stage is now **sized** (`VerticalOptions.Start` + `HeightRequest = barHeightDip`); no measurement dependency, nothing to race. |
| 7 | MINOR | **File I/O on the UI thread at ring-paint time.** `Utils.imageToDataUri` (`File.Exists` + `ReadAllBytes` + Base64) ran *inside* the `MainThread` lambda (`CallPage:186/225`) while the cheap fields were already computed off-thread. | Avatar + contact snapshot hoisted **off** the main thread in both `showRing` and `showBar` (the snapshot also removes a start/end race that could pair one call's text with another's identity). |
| 8 | MINOR | **The 1500ms reveal timer was not identity-scoped** — call A's timer could reveal call B's stage before its shell booted (an opaque cover with no Accept/Decline). | `revealSurface(owner)`; a foreign timer bails. |
| 9 | MINOR | **A re-created host orphaned the call stage** (`setOverlayHost` tears down stale overlays and a stale in-place lock, but knew nothing about the call stage) → `current` stays non-null forever ⇒ **no ring/bar for this call or any later one until restart**. | `setOverlayHost` → `CallPage.hideSurface()` + re-arm; a live call re-stages onto the new host on the next tick. |
| 10 | MINOR | **`broadcastCallState` NRE'd on a teardown race and swallowed it** (`currentCallContact` is nulled on another thread; the `catch` logged a warn and left a **stale** surface up). Plus: the ring latch in `call.html` was never reset when `call-overlay.js` self-dismissed on Accept, so a re-assert in that window rendered **nothing** behind a full-window, back-swallowing cover; and a re-assert **re-armed** the hang-up latch after the user had already hung up. | C#: single null-checked snapshot → a torn-down call = hide. FE: `!ringEl.isConnected` latch reset · `hungUp` Set (hang-up is one-shot per session) · an unknown `kind` no longer paints an empty opaque strip. |
| 11 | MINOR (build) | **`smoke-test.mjs:3476` would have FAILED Damir's build** — the B3 assertion still asserted `/'empty_detail', 'wallet_sent'\]/`, but `build-shells.mjs:79` now ends `'wallet_sent', 'call']`. (Exactly the Q1 failure mode: a stale assertion blocking the pre-commit gate.) | Regex re-based. **+11 new assertions** pinning every invariant above. |

### ★ Invariants — attacked, holding
**#221 chat isolation:** CallPage keeps its **own** WebView; the outbound wall is now *structural* — there is no broadcast left at all, the only call-state push in the tree is `Utils.sendUiCommand(this, "setCallUi", …)` at `CallPage.xaml.cs` into CallPage's own WebView. The **inbound** gate is intact and still load-bearing: `onAppAccept` / `onAppReject` / `onNavigatingGlobal`'s `hangUp` all refuse a surface with `acceptsCallPushes == false`, and `MiniAppPage.xaml.cs:410` still overrides it false. The now-dead `getLivePages()` enumerator was deleted (zero callers) — **the gate was deliberately NOT deleted with it**, and its docblock now says why. · **Money:** nothing in Q4 signs, broadcasts or touches a key; wallet-send untouched. · **Frozen bridge:** `setCallUi` is the only new push; the shell emits only the pre-existing `ixian:appAccept`/`appReject`/`hangUp`. · **Lock covers everything (#230/#235):** `pushModalLoaded` / `stageMargin` / `modalOverlayOp` untouched — and the lock invariant is now **stronger** than #270 shipped it (mutual exclusion, not just z-order). · **#265 guards:** `rejectCall`'s accepted-guard, `hangupCall`'s `hasSession` guard and the 45s ring timeout (incl. the callee TOCTOU re-check) are unmodified — and with ONE surface, a stale ring cannot exist elsewhere, so the C# guard alone is sufficient now that the FE's own "drop the ring on displayCallBar" half is gone. · **#214:** the bar renders `.c-callbar__main` inert (no `onReturn`) — verified in `callbar.js`. · **#248 / #265 import gate:** no `*SL{}` marker or bundled import touched.

### Post-loop: one more stale smoke assertion (Damir's run, same class as #11)
`smoke-test.mjs` M5 asserted that `*SL{index-excerpt-contact-request}` was **absent** from `home.html` (the first-cut M5 carrier had been removed as dead) — but the **Q2-④ canon (#268/#271) deliberately re-added that same `_SL` key** as one of its 12 excerpt carriers (→ `request` / user-plus glyph). A bare grep cannot tell the two uses apart, so the negative clause was stale **by construction**. Replaced with what actually matters: the key is wired only into `canonEntry`, and M5's path keys on `REQUEST_SENT_TEXT`. **The old comment's premise was also wrong** — the C# branch is `state == Approved && !friend.approved` (`HomePage.xaml.cs:1606-1657`), which IS reachable: an **outgoing** request the peer accepted, before any real message arrives, renders "Contact Request" as its excerpt. Cosmetic, but real — logged for the BE pass (arguably C# should clear that excerpt on approval).

### Files changed by this loop
`Spixi/Pages/Call/CallPage.xaml.cs` · `Spixi/Utils/SpixiContentPage.cs` · `Spixi/App.xaml.cs` · `Spixi/Spixi.csproj` (CallPage.xaml `MauiXaml` entry — parity with every other page) · `src/shells/call.html` · `scripts/smoke-test.mjs`.
**No component change** → the build sequence is #270's own (the bundle must still be rebuilt to drop `call-ui.js`): `build-demo-bundle` → `build-shells` → `smoke-test` → `net10.0-windows`.

### 🟡 Must be settled ON DEVICE (the #215 gate — the presenter was built to the lock precedent, not device-verified)
1. **ZIndex vs Children order.** The lock (200) over an in-place call stage (100), and the call stage over any #225 overlay (0), rest **entirely** on MAUI honouring `VisualElement.ZIndex` inside a `Grid`. If a platform falls back to insertion order, an overlay staged *after* a live ring (a push-notification `onChat` → `pushPageLoaded`, which has no call guard) would **cover the ring** → an unanswerable call. **Fallback if F5 shows it:** `grid.Children.Remove(callStage); grid.Children.Add(callStage);` at the end of `presentPreload`'s overlay branch (do not pre-emptively implement).
2. **Lock ↔ call, both orders** (the two MAJORs): call arrives while locked → **no ring is shown** (by design now) but the phone **rings**; unlock → the ring/bar appears within ~1s. Lock arrives during a call → the surface drops and returns on unlock. **Confirm neither wedges, and that the lock is never dismissed by a call ending.**
3. **Answering from a legacy page** (money flow / scan / mini-app on top): the ring is modal, and after Accept there is **no call bar until you return to Home** — the class-doc dial, now re-armed so it appears the moment the legacy page goes away. Damir: acceptable, or does the bar need to ride legacy pages too (that is the §5 repoint)?
4. **Ring → bar transition:** `applyStageLayout` dispatches, so the stage may stay full-window for a frame or two after Accept. Eyeball for a flash.
5. **Desktop bar** is now a full-width strip, not the #264 pill (MAJOR-5). Art dial.
6. **iOS:** the in-place ring inherits HomePage's safe-area padding → its scrim may stop below the notch. iOS pass.

### 🟡 Logged, NOT fixed (never silently changed)
1. **`PopModalAsync` is pop-the-top everywhere in this tree** (inventory #18) — safe only because nothing stacks modals now. Any future second modal re-opens the whole class. → refactor-phase `popModal(page)` helper.
2. **`OnDisappearing → Dispose()` is not `ModalStack`-guarded** (inventory #19) — a modal covered by another modal has its WebView torn down. Unreachable today; the guard was **not** widened because MAUI's Disappearing-vs-pop ordering is unverifiable from the tree (#215) and a wrong guard would leak every popped modal's WebView. → BE/on-device.
3. **The ring's first paint is tick-driven** (`onReceivedCall` never broadcasts; it waits for the 1s `HomePage.OnUpdateUI` to consume `refreshAppRequests`) → up to ~1s of ringtone with no UI. One line at the BE pass: `broadcastCallState()` at the end of `onReceivedCall` (inventory #21).
4. **`hideSurface`'s not-top branch can only `Dispose()`** — MAUI has no `RemoveModal`. With MAJOR-1/2/3 fixed it is unreachable; the `Logging.error` line is the tripwire. If it ever appears in a log, the mutual-exclusion invariant has a hole.
5. **The 45s ring timeout keeps running while locked** — a call arriving during a lock can expire unseen. Product dial.
6. **`src/components/call-ui.js` is still on disk** (tombstone) — `git rm` at commit.
7. A raced Accept whose VoIP session already ended falls through to `MiniAppManager.acceptAppRequest` with the *call's* session id (`SpixiContentPage.onAppAccept`) — pre-existing verb grammar, now only reachable from CallPage. BE note.
