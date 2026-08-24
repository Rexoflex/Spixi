# Opus #46 loop — Batch B + C + D, round 1, AUDITOR 2 (shells · components · CSS · resources · pins · i18n · a11y)

Date 2026-08-24 · repo `/root/Spixi` @ `42e72109` + working tree · Ixian-Core frozen, read-only.
Scope: the 7 numbered items. The sibling C# auditor's round-1 fixes are IN (baseline 2995).
Language: ASD-STE100.

**No file in `/root/Spixi` was modified except this report.** Every mutation ran in
`/tmp/aud/mut` (a tar copy with `node_modules` symlinked). Tree file count 118 before and
after; `chats-row-menu.js`, `home.html`, `SettingsPage.xaml.cs` md5s unchanged.

Baseline re-run here: `node scripts/smoke-test.mjs` → **BASELINE OK — 2995 pass / 3 KNOWN**.
`extract-strings --check` · `verify-locales` · `i18n-overflow-audit` · `i18n-lint` — all four pass.

---

## Findings

| # | Rank | Item | Where | Finding |
|---|---|---|---|---|
| **M-1** | **MAJOR** | C1 + B2, i18n | `settings-shell.js:1167` · `chat.html:1775` · `overlay.css:124-133` · `button.css:32` | **Two new confirm-button labels overflow the modal action pair in shipped locales, and the overflow gate structurally cannot see either.** Measured with the audit's own estimator (a /tmp probe that hand-tags the two keys): `deleteAccountConfirm` fr-fr **214px**, es-co 204, pt-br 189, ja-jp 151 — against an **88px** physical slot (110px effective budget); `cancelInviteConfirm` ru-ru **148px**, de-de 126, ja-jp 124, id-id 116, es-co 113, fr-fr 113, lt-lt 107 — against 96px. Geometry: `.c-modal{max-width:360;padding:24}` → 264px content; `.c-modal__actions .c-button{flex:1 1 0}` + `.c-button{white-space:nowrap}` with the default `min-width:auto` (no `min-width:0` reset anywhere in `base.css`), no `flex-wrap`, no `overflow`/clip → the pair **cannot shrink below min-content**. fr-fr pair min-width ≈ 357px in a 264px box = ~93px of spill on the app's most destructive dialog. **It is a regression**: `git diff` shows this card's `confirmLabel` was `deleteConfirm` ("Delete" / "Supprimer") before this batch. Two independent harvester blind spots hide it — (a) `deleteAccountConfirm` reaches `settingsConfirm` through `confirmAction(buildOpts())`, so the harvester's `settingsConfirm({` window (`i18n-overflow-audit.mjs:88-92`) never sees a `confirmLabel:` line; (b) `chat.html` writes `s.KEY` (the `window.SL` alias) and the harvester's key regex (`:64`) only matches `strings\.KEY`. |
| **m-1** | MINOR | B1 | `home.html:1253-1259` vs `:1281` | The `revokeRequest` branch does not shed the row's **pin**. The delete twin does (`if (pinnedChats.delete(chat.address)) savePins();`). A pinned outgoing-request row that is revoked leaves the address in `spixi.pins`; if that contact is added again later, `addChat` re-seeds `chat.pinned = true` (`:3082`) and the new row silently sorts to the top of the list. (`reactionExcerpts` / `dropExdelHint` are also skipped — unreachable for a request row, no action needed.) |
| **m-2** | MINOR | B1 | `home.html:3371` · `HomePage.xaml.cs:4117, 4131, 2877` | On a **refused** revoke the row does not actually come back. The shell un-tombstones (`deletedChats.delete(addr)`), but `onUndoRequestFor` sets `UIHelpers.shouldRefreshContacts = true` **only inside the success branch**, and `updateScreen` calls `loadChats()` only behind that flag — so no flush is scheduled and the row stays gone until some unrelated event flushes. The comment claims "the row comes back on the flush"; the delete twin's comment (`:3382`) is honestly hedged ("**may** come back"). `requestAddrs.delete(chat.address)` (`:1256`) is likewise not restored (self-heals on the next flush). |
| **m-3** | MINOR (a11y) | B2 | `chat.html:4039-4041` vs `home.html:3367-3369` · `overlay.js:151-158` | The B2 **success path announces nothing**. `cancelInviteResult` `ok` → bare `return`, while B1's `undoRequestResult` `ok` toasts "Request revoked". Worse, `cancelApp` calls `renderLog()`, which destroys the card's Cancel button — the modal's opener. overlay.js's focus restore then finds `!opener.isConnected`, there is no other overlay, and focus drops to `<body>`. A screen-reader user gets **no confirmation and loses their place** on a destructive action. The tombstone sub text exists in the DOM but is in no live region. |
| **m-4** | MINOR | pins | `smoke-test.mjs` (0 hits) · `SpixiContentPage.cs:1894-2029` · `HomePage.xaml.cs:1878` | The sibling's C3 round-1 fix — `claimWarmingOverlay` / `warmClaimRequested`, the Account tap that lands inside the warm-load window — has **zero pin coverage**. Every other r1 fix in this batch is pinned (RequestSent guard, ghost guard, load-path call cancel, iOS ClearAll, per-call tries, stopStorage, wipeLocalState-first, `resumeNetworkOperations`). This one alone can regress silently. |
| **m-5** | MINOR | i18n | `src/strings/draft/{cn-cn,id-id,it-it,ja-jp,lt-lt}.json` | The draft pass **skipped 5 of 12 locales**. None of the ~18 new B/C keys is drafted there (they ship as English — still-English 53-68/769 vs 14 for pt-br), and the same 5 files still carry all 5 retired `deleteWallet*` keys. The other 7 drafts have the new keys and no `deleteWallet*`. Not a gate failure and not a leak risk: the shipped `src/strings/*.json` are clean (verify-locales parity 0 extra) and `build-locales.mjs` iterates **en-us** keys, so a stale draft key can never reach a shipped locale. |
| n-1 | NIT | C5 doc | `spixi_splash_icon_night.xml` header · DECISIONS #548 | The "~52% of the 108dp viewport" figure is the **source-box** arithmetic (32 × 1.75 = 56 ÷ 108), not the ink. See the measurement below — the real mark is 39.8% wide × 48.0% tall. The direction is safe (smaller than claimed), so no resource change is needed; the sentence is what is wrong. |
| n-2 | NIT | pins | `smoke-test.mjs:14577` | The B1 jsdom block calls `items.find(…).click()` unguarded. Mutation (a) made the pin fail **and then threw a TypeError that killed the whole run** — every assertion after Batch B never executed. A `?.` or an early bail keeps a mutated run reportable. |
| n-3 | NIT | pins | `smoke-test.mjs:14625` · `SettingsPage.xaml.cs:1136` | The C1 order block slices `wipeEverything()` with `indexOf('private void wipeAccountData()')` as its end bound — and `wipeAccountData()` is now **dead code** (0 callers; the enumerated wipe inlines the same seven calls). If someone removes it, `indexOf` returns -1, the slice silently becomes the whole rest of the file, and the ordering assertions widen without ever failing. |
| n-4 | NIT | B2 | `chat.html:1763` vs `:1697` | `buildAppRow`'s `onCancel` is **not** gated on `composerLock`, while the file bubble's Cancel on the same page **is**, for the stated reason that "the delete grammar is gated … because `sendMsgDelete` EMITS to the peer". `cancelInvite` emits the same primitive. Unreachable in practice (a lock-pending 1:1 has no own app invite), but the two sites now disagree on the rule. |
| n-5 | NIT | C2 demos | `src/demo/settings.html:191` · `src/demo/desktop.html:1389` | Both still pass `onDeleteWallet` with a toast reading "C# would auth, delete the wallet, restart to Launch". The callback can never fire (the card renders nothing) and the copy documents a retired route. |
| n-6 | NIT | i18n | audit `--all` | `revokeRequestConfirm` de-de "Zurückziehen" is the tightest **harvested** new key: 82px / 88px (93% of budget). Passing, but there is no headroom left for a re-word. |

---

## VERIFIED CLEAN

### 1 — B1: the revoke branch, the row object, the other routes

* `chat.request` **is** set on the model row: `home.html:2950` computes `isReqRow = isRequestSentPush(...)`, `:2997` assigns `chat.request = isReqRow` unconditionally (so a settled request clears it through the fresh object on upsert-merge).
* `applyChatRowAction`'s row **is the same object**: `chats-shell.js:280-289` passes the live `c` from `state.chats` into both `attachChatRowMenu` and `wrapChatRowSwipe`, and `applyChatRowAction` filters by identity (`c !== chat`, `:328`). The `request` flag travels with it.
* **The swipe drawer cannot bypass the prompt.** `chats-swipe.js:39` enables only `pin` / `mute` (`const enabled = (a) => (a === 'pin' ? …pin : …mute)`), and its docblock states "NON-destructive actions only". There is no delete/revoke on that path.
* **The desktop right-click path does not differ.** `attachChatRowMenu` wires long-press and `contextmenu` into the same `openChatRowMenu` (`chats-row-menu.js:417-467`), so both produce the identical branch.
* Executed (jsdom on `src/demo/chats.html`):

```
REQUEST menu: ["Pin","Mute","Mark as read","Chat info","Revoke request"]   has Delete chat: false
NORMAL  menu: ["Mark as read","Chat info","Delete chat"]
modal role: alertdialog   aria-modal: true   title: "Revoke the contact request?"
modal buttons: ["Keep request","Revoke"]     autofocus: "Keep request"   ← the SAFE action
fired after 3 rapid clicks on Revoke: ["revokeRequest"]                   ← one-shot holds
```

### 2 — B2: the canceled state, the card contract, the storage key

* `card()` returns `{ row, el }` where `el` is the `.c-tcard` (`typed-bubbles.js:49-70`), so `el.dataset.state = state` (`:265`) lands **on the card**, which is exactly what the CSS selects.
* Executed `createAppBubble` for every state (jsdom, `src/demo/chat.html`) — **nothing renders "undefined"**, including a bogus state:

```
invite      data-state=undefined  sub="Invited you to join"       btns=["Decline","Join"]
invited     data-state=undefined  sub="You have sent an invite"   btns=["Cancel","Launch app"]
missing     data-state=undefined  sub="Invited you to join"       btns=["Decline","Get app"]
declined    data-state="declined" sub="You declined this invite"  btns=[]
canceled    data-state="canceled" sub="You canceled this invite"  btns=[]     ← terminal
in-session  data-state=undefined  sub="In session"                btns=["End session","Resume"]
ended       data-state=undefined  sub="Session ended"             btns=[]
bogus       data-state=undefined  sub=""                          btns=[]     ← the r2 guard holds
canceled with no handlers at all: "App inviteChessYou canceled this invite"
```

* CSS tail tokens **exist** in both palettes: `--opacity-disabled: 0.4` (`tokens.css:855`), `--text-neutral-02` light `:528` / dark `:734`. The `canceled` rules mirror `declined` exactly (`typed-bubbles.css:356-359`).
* `buildAppRow`'s `onCancel` gate is `(!incoming && !canceled && rec.astate === 'invited')` (`chat.html:1763`) — the only path that reaches the `'invited'` button row, so there is never a dead Cancel.
* **The persistence prefix matches the wipe.** `CANCELED_APP_PREFIX = 'spixi.app.canceled.'` (`chat.html:4729`) and `wipeLocalState` sweeps `k.startsWith('spixi.')`. I enumerated **every** `localStorage` key any shell/component/bridge writes — all 21 of them are `spixi.`-prefixed (`spixi.appearance`, `spixi.chat.*`, `spixi.landtab`, `spixi.pins`, `spixi.backup.last`, `spixi.media.*`, `spixi.probe.scan`, `spixi.rating.*`, `spixi.scan.granted`, `spixi.settings.view`, `spixi.app.{canceled,declined}.`, `spixi.draft.`, `spixi.exdel.`, `spixi.likes.`, `spixi.mentions.seen.`). The sweep misses nothing.

### 3 — C1 / C2: the danger zone, the wipe handler, the strings

* **ONE card.** Executed: `createSettingsDanger` with **all four** handlers including `onDeleteWallet` renders `heavy cards: 1 ['Delete account']` and quiet rows `['Delete all chat history','Delete downloads']`. `onDeleteWallet` is accepted and renders nothing, as documented.
* No pin or shell expects a wallet card: `settings.html:1200-1211` passes only the three live handlers; `smoke-test.mjs:1360` passes `onDeleteWallet: () => {}` precisely to prove it renders nothing. Only the two demo pages still pass it (n-5).
* **`wipeLocalState` collects first, then removes.** `settings.html:1596-1598`: the loop over `localStorage.key(i)` pushes into `keys[]`, and a **second** loop calls `removeItem`. No index shifting. Each removal is in its own `try`. No `localStorage.clear()` anywhere in the shell.
* Strings: all 18 new keys (`deleteAccountConfirm`, `revokeRequest*`, `keepContactRequest`, `requestRevoked`, `revokeRequestFailed`, `canceledInvite`, `cancelInvite*`, `keepInvite`, `canceled`, …) are present in `src/strings/en-us.json`. The 5 retired `deleteWallet*` keys are gone from **en-us and every shipped locale** (`verify-locales`: parity 0 miss / 0 extra everywhere). They survive only in 5 drafts — see m-5.
* Gates: `extract-strings --check` 769 keys / 0 fallback conflicts · `verify-locales` **ALL LOCALES CLEAN** · `i18n-overflow-audit` NO BREAKERS · `i18n-lint` clean.
* Confirm a11y (executed): `role=alertdialog`, `aria-modal=true`, autofocus on **Cancel** (the safe action), the standing "This action cannot be undone." strip present, and a `role="alert"` error paragraph pre-mounted and hidden.

### 4 — C4: every close reason classified

Every `close()` call site, and the classification is **right at all six**:

| Site | Reason | Correct? |
|---|---|---|
| `home.html:925` `closeTopHomeTakeover` — hardware back | `'back'` | ✓ hardware back *is* the user's Back |
| `home.html:947` `closeHomeTakeovers` — nav/rail tab tap | `'auto'` | ✓ programmatic, must not re-open Account |
| `home.html:1032` `openContacts` re-entry | `'auto'` | ✓ the old view's captured `returnTo` must not fire |
| `contacts-page.js:144` picker `onBack` | `'back'` | ✓ |
| `contacts-page.js:119` after `done()` (group created) | `'auto'` | ✓ C# opens the new conversation over the shell |
| `contacts-page.js:136` `startAppWith` (app launch) | `'auto'` | ✓ |
| `contacts-page.js:155` `onOpenChat` | `'auto'` | ✓ C# opens the chat |
| `contacts-page.js:169` `onViewContact` | **no close at all** | ✓ deliberate — see below |

**The Account → directory → contact-details → Back → Back → Account trace holds.** `onViewContact`
only sends `ixian:details:<addr>`; the takeover stays **mounted** underneath, because ContactDetails
is a C# overlay page above this WebView, not a DOM sibling. So: Back on details → C# pops → the
takeover is still there → Back → `closeTopHomeTakeover` → `close('back')` → `returnTo === 'account'`
→ `setNavActive(nav,'account')` + `deferToPaint(bridge.send('ixian:settings'))` — the same deferral
the Account tab itself uses (`home.html:1085`), instant because the exit parked the page and C3 keeps
it warm. `syncHomeOverlay` stays correct throughout: `homeOverlayLive()` reads `!!contactsView`
(`:897`), which is non-null for the whole excursion, and the push is deferred + coalesced (`:908-914`),
so it never shares a navigation slot with a verb.

Executed (jsdom, `mountContacts` with an `onClose` spy):

```
close('back')        -> ["back"]   overlay removed
close()              -> ["auto"]
close('anything')    -> ["auto"]   (only the literal 'back' counts)
double close('back') -> ["back"]   (the `closed` latch holds — fires once)
topbar Back button   -> ["back"]
tap a contact row    -> reasons [] and sent ["ixian:details:AAA"]   ← the takeover STAYS
```

### 5 — C5: the resource arithmetic, re-derived

All three XMLs (plus `values-v31` and `values/styles.xml`) **parse well-formed**.

`android:translateX` / `translateY` / `scaleX` / `scaleY` on `<group>` **is** valid VectorDrawable
syntax (the documented group attribute set), with pivot defaulting to 0,0 → `x' = x·1.75 + 26`.

**The task's premise arithmetic is wrong, and the real numbers are better.** The premise assumed the
mark fills its 32-unit box (32 × 1.75 = 56, spanning 26..82 = 52%). It does not. Parsing all three
`pathData` blocks and taking the control-point envelope (a deliberate **over**-estimate — the true ink
is inside it):

```
local bbox   x  3.589 .. 28.129     y  1.111 .. 30.761
transformed  x 32.282 .. 75.226     y 27.944 .. 79.832
             w 42.94 = 39.8% of 108     h 51.89 = 48.0% of 108
             centre (53.75, 53.89)  vs the viewport centre (54, 54)
```

* Inner-2/3 safe zone **18..90**: x margins **14.28 / 14.77**, y margins **9.94 / 10.17** — inside, with margin. ✓
* Masked circle (r = 36 about 54,54): worst bbox **corner** distance **33.92 ≤ 36** — the whole envelope is inside the circle. ✓ (bbox diagonal 67.35 vs 72.)
* So the safe-zone conclusion is **confirmed**, but the "~52%" sentence in the file header and in DECISIONS #548 describes the source box, not the mark (n-1).

`android:windowSplashScreenIconBackgroundColor` is **not needed** and omitting it is the better call:
without it no background disc is drawn, and the ink already fits the 2/3 circle, so a mask changes
nothing. The white mark on `#13171b` reads well — sRGB (19,23,27) gives a contrast ratio of ≈ **18.9:1**
against `#FFFFFF`. Adding an icon background would only shrink the visible mark.

Pre-Android-12 path also verified at source: `MainTheme.Base` sets
`android:windowBackground = @layout/splash_screen` and `MainActivity.cs:26` declares `@style/MainTheme`,
so the `layout-night/` qualifier is the mechanism that swaps the ground. And the claim that
`@drawable/splash` is a white lockup on transparency is **true, pixel-wise** — I decoded all four
densities; the only opaque colours are `(253,252,252)` and `(255,255,255)`:

```
drawable/splash.png       (140,283)  [(253,252,252): 2802,  (255,255,255): 1591]
drawable-xhdpi/splash.png (280,566)  [(253,252,252):12272,  (255,255,255): 6253]
```

`values-night-v31` keeps the `parent="MainTheme.Base"` inheritance, so nothing from the base theme is
lost, and `values-v31` (light, `#144576`, no animated icon) is untouched.

### 6 — Pin mutations: **5 of 5 caught**

Each ran in `/tmp/aud/mut` (copy baseline **2994**, the single delta from 2995 being the
`M1 #448` Ixian-Core-sibling pin, which correctly detects that the sibling is absent at that path).

| # | Mutation | Result |
|---|---|---|
| **a** | B1: gate the revoke item off so the row falls to `'trash'` / "Delete chat" (source **and** `src/demo/spixi.iife.js`) | **CAUGHT** — `✗ ★ B1: an OUTGOING PENDING request row offers "Revoke request" instead of "Delete chat"`. (It then threw — n-2.) |
| **b** | C1: move `Node.storage.deleteData()` **before** `IxianHandler.shutdown()` | **CAUGHT** — 2 pins fail: the `★★ C1 / F-3` shutdown-first order pin **and** the MINOR-3 stopStorage-before-delete pin. 2992 pass, exit 1. |
| **c** | C3: neuter the park branch (`else if (op.overlayMode && parkOnLoadNow(op))` → `else if (false)`) | **CAUGHT** — `✗ ★★ C3 (#546, #533 ②): a load-then-PARK path …` |
| **d** | C4: drop `{ returnTo: 'account' }` from the landtab branch | **CAUGHT** — `✗ ★★ C4 (#547, #533 ③): the directory opened from the Account hub returns to ACCOUNT …` |
| **e** | D1: revert Android `clearNotifications` to a bare `manager.CancelAll()` | **CAUGHT** — 2 pins fail: the `★★ D1` enumerate-and-spare pin **and** the pre-M blanket-log pin. |

Every mutated file was restored in the copy and the real tree was never touched.

### 7 — a11y

* **The revoke prompt** (executed): `role="alertdialog"`, `aria-modal="true"`, the **safe** action
  ("Keep request") carries autofocus, the destructive action is `intent: 'destructive'` and one-shot.
  Copy states the consequence ("They are not told…") in the body, not only in the title. ✓
* **The canceled card**: the tombstone **is** in the accessible content — `You canceled this invite`
  renders as the `.c-tcard__app-sub` text node, and the card carries no buttons, so nothing dead is
  reachable by keyboard. It is **not** announced at the moment of the change and focus is lost — m-3.
* **The danger card copy at 360px**: safe. `.c-settings-danger__card-sub` has no `nowrap`,
  `text-overflow` or line clamp, so it wraps; the container is `.c-settings-danger__body u-scroll`.
  The title is a flex row with a fixed 20px glyph and wrapping text. Longest translation is fr-fr
  `deleteAccountSub` at 90 chars → ~4 lines in the ~272px column. The overflow audit correctly does
  not harvest wrapping body copy. The **button** in the same flow is the problem — M-1.
* One tightening note: the C4 return path (`home.html:1039-1042`) mirrors the Account-tab branch but
  omits its `leaveSurfaceSearch()`. Harmless here (`openContacts` already ran it on open).

---

## Verdict

**1 MAJOR · 5 MINOR · 6 NIT. Not clean — M-1 should be fixed before F5.** Every behaviour this batch
claims was reproduced: the revoke prompt fires once and only on request rows, the swipe and right-click
routes cannot bypass it, the `canceled` tombstone is terminal and renders no "undefined", the wipe
handler enumerates before it removes and its `spixi.` prefix covers every key any shell writes, the
danger zone is one card, all six contacts-close reasons are classified correctly and the
Account → directory → details → Back → Back → Account trace holds with the takeover alive underneath,
the night-splash mark sits inside the Android safe circle with real margin (better than the ~52% the
comment claims), and all five planned pin mutations were caught. The one thing the batch's own gates
could not see is the thing that is broken: two new destructive confirm labels are roughly twice their
button slot in French, Spanish, Portuguese, Russian, German and Japanese, on the delete-account and
cancel-invite dialogs, because the overflow harvester cannot follow `confirmAction(buildOpts())` or the
`s.KEY` alias. Fix the copy (or let `.c-modal__actions` wrap / set `min-width: 0`), and close both
harvester blind spots so the gate can hold the line next time.
