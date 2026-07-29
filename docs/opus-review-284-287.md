# Opus #46 adversarial review — batches #284–#287

Range `1f98a271..67ecf9d8` (the #284 owed-loop + plate, #285 tx-detail hide leg / live language
switch / de-de fill, #286 narrow-pane wallet fixes, #287 waiting-strip polish + revealAmounts).
Run 2026-07-29 (Cowork/cloud + device bridge). Protocol: 3 disjoint read-only Opus auditors
(A native C# · B shells/components · C pipeline + generated artifacts) → orchestrator verification
against source → mechanical fixes → **fresh break-my-verdict re-reviewer over the FIXES** → round-2
corrections. `[verified]` = re-checked against the real tree in-session, not against a summary.

`#282`/`#283` were covered by `opus-review-macsession-282-283.md` and are re-examined only where
#284+ touched the same code. Everything device-gated in `opus-review-273-281.md` (B1 OneSignal
starvation · B2 double tap-handling · B3 static registrar · A2 FriendState enum · C-9 `file://`
localStorage) stays **PARKED** per #215 and is not re-reported, nor built around.

---

## MAJOR — both fixed in-session

### 1. The wallet hide flag reached NOBODY — an open desktop tx-detail pane kept rendering money and the full address [verified]

`HomePage.xaml.cs:378-388` (`ixian:balance:`) set `hideBalance` and wrote `Preferences`, then
`e.Cancel = true; return;`. It pushed `setHideBalance` to no one. Grep confirms only two pushes
existed in the whole tree — `HomePage:1338` (itself, at boot) and `WalletSentPage:68` (itself, at
`onLoad`).

On desktop the tx detail is a **live overlay pinned to column 1** (`HomePage:1435`,
`pushPageLoaded(new WalletSentPage(...), 4000, "txdetail", 1)`), i.e. it sits *beside* the wallet
list, which stays interactive — hero eye included. `closeTxDetailOverlays()` is wired to tab switch,
new tx and chat open (`:587`, `:950`, `:1477`) — never to the balance toggle.

**Failure:** desktop, hide OFF. Tap a tx row → the pane opens showing `-1,234.50000000`, the fiat,
the fee, the counterparty and the **full base58 address with a working copy button**. Tap the eye.
The list masks to `••••••`; the pane keeps everything on screen indefinitely, across the 1 Hz
`checkTransaction()` re-renders. There is no in-pane control to mask it (the reveal eye only renders
while `walletHidden`).

This is the **third** regression of this exact class: mobile sheet (caught by the #273–#281 loop),
desktop pane on open (#285), live pane on toggle (here). #285's row asserts "*a hide re-push
re-masks*" — no such re-push existed. Auditors A and B converged on it independently.

**Fixed (C#, `HomePage.xaml.cs:390-402`):** the branch now mirrors `closeTxDetailOverlays()`'s
enumeration and pushes the flag to every open `WalletSentPage`. Idempotent by construction — the
shell's handler early-returns on an unchanged value, so a redundant push cannot clobber a deliberate
per-view reveal. The narrow/pushed path is deliberately not covered: the eye lives in the home shell,
which is *underneath* a pushed page and unreachable.

**Also fixed (shell, `wallet_sent.html`):** the mask was fail-**OPEN** — `walletHidden` defaulted to
`false` and the card rendered before the flag was known, so a lost or late push painted money with
the preference ON. `pageLoaded` is set by `checkIfPageLoaded()` in `webViewNavigated`
(`SpixiContentPage.cs:145`), **not** by `ixian:onload`, so `OnUpdateUI`'s 1 Hz
`updateScreen() → checkTransaction() → setData` can legitimately fire before `onLoad` pushes the
flag. Now `masked = (walletHidden || !hideKnown) && !revealed`, with a `firstKnown` path so the first
push always renders (otherwise `"False"` would early-return against the masked default and strand the
card masked forever).

### 2. The five launch drop-ins shipped a stale dictionary — second occurrence, one batch after the last fix [verified]

`grep -o "en-us ([0-9]* keys)"` across the built shells, before the fix:

```
intro/intro_new/intro_restore/intro_retry/onboarding   en-us (664 keys)
index/chat/settings/wallet_sent/…                      en-us (665 keys)
```

Cause: `build-shells.mjs:77-79` — `DEFAULT` never contained the launch keys, and the `launch`
shorthand only expands when an explicit arg is passed (`:83`, guarded on `arg.length`). So every
routine `node scripts/build-shells.mjs` left all five inlining whatever `strings.iife.js` /
`spixi.iife.js` existed at their last hand-run. #285 and #287 both changed the dictionary (664 → 665,
plus the whole 22-key de-de fill) and both ran the 17-shell default.

**Consequence:** a German user opening the launch language picker gets the English `languagePending`
row (the non-actionable "your language is coming" row #258 added to *both* pickers) while the same
row inside Settings is translated. Same for any launch-reachable `about*` / `howTo*` /
`backupFailed` string.

The previous loop caught the identical miss and fixed it **by hand** (`opus-review-273-281.md:133`).
Hand-discipline did not survive one batch. **Fixed structurally:** `DEFAULT` now spreads
`LAUNCH_KEYS`; the build writes 22 shells, all at 665 keys [verified in built output, incl.
`Entwickler` now present in `intro.html`]. `LAUNCH_KEYS` is declared before `DEFAULT`, and the five
output filenames collide with nothing else in the list.

**Rider, same file:** `all` expanded to `Object.keys(SHELLS)`, which includes the two still-LEGACY
demo drop-ins `apps` → `apps.html` and `payments` → **`wallet_send.html`, the money page** — #284 had
to restore both from HEAD after an `all` run. `all` now filters `LEGACY_DEMO_KEYS`; both stay
buildable when named explicitly. [Verified: this run left both files untouched in `git status`.]

---

## MINOR — fixed in-session

- **`suppressNextTabOverlayExit` was a bare, unexpiring one-shot** (`HomePage.xaml.cs:65, 571, 2519`).
  Two failure modes, both real: (a) a genuine tab tap inside the reload window ate the flag, so the
  *later* boot echo ran the exit sweep and tore down the very Account pane the flag protects — the
  #285 round-2 bug, reordered; (b) if the shell never booted (the case `reloadShell`'s own belt exists
  for) the flag latched and the **next** genuine tab switch silently skipped
  `requestSettingsOverlayExit()`, i.e. the Account pane's save-if-dirty exit, dropping a held
  nickname / avatar / lock edit. **Fixed:** consumed only when `currentTab == "tab1"`, plus cleared at
  the end of the belt. The clear is **epoch-guarded** (`reloadShellGen`) — see the break-my-verdict
  section; without that it re-opened the bug it was closing.
- **`reloadShell`'s belt re-drive was a TOCTOU with a silent catch** (`:2528-2543`): `!pageLoaded` was
  evaluated on a threadpool thread, then marshalled to the UI thread with no re-check (the page can
  boot in the gap → a second `webViewNavigated` on an already-booted page), and any throw vanished
  into `catch { }` — so the empty-German-shell symptom this belt exists to rescue would come back with
  **zero** log output. **Fixed:** re-check inside the lambda + `Logging.error`.
- **A language pick never re-localized the desktop welcome pane** (`SettingsPage.xaml.cs:312`).
  `EmptyDetail` loads `*SL{}`-baked `empty_detail.html` and is in neither collection the pick sweeps —
  `reloadShell()` deliberately skips `removeDetailContent()`, and `getChatPages()` yields only
  conversations. `reloadDefaultDetail()` exists for exactly this (`HomePage:991`, added by #251 for
  theme) and had **zero callers**. **Fixed:** one line. `reloadAllPages()` is deliberately *not* used
  — it would reload the settings page a second time and eat the one-shot #274 picker-restore stash.
- **The pick's `chat_page.reload()` sweep was unguarded** (`SettingsPage:313-316`) — the first sweep
  in the codebase to call the WebView-touching `reload()`, over an enumeration that includes the
  load-then-present *staging* page and pages whose `webView` field `OnDisappearing` nulls
  (`SingleChatPage:99`). One throw stranded every later page in the old language and propagated out of
  a WebView `Navigating` handler. **Fixed:** per-page try/catch + warn.
- **A peer that becomes a bot while the pending latch is set could never unlock**
  (`SingleChatPage:1904`). The unlock edge (`_waitingForContactConfirmation` →
  `showRequestSentModal "0"`) lives only in the non-bot `else`; `joinBot` creates the group-chat friend
  as `RequestSent` with `bot == false` and the bot metadata lands later. Result: dead composer +
  "Waiting for response…" + a Cancel-request strip on a chat the user already joined, until they back
  out and re-enter. **Fixed:** the bot branch releases the latch. Safe by construction — the latch is
  set in exactly two places, both explicitly non-bot, and bots are never pending-locked by design.
  *(Occurrence depends on core message ordering → BE-gated; the guard is warranted regardless.)*
- **The #287 pending strip did not own the iOS home-indicator inset** (`chat.html:86`). It *replaces*
  the composer (`composerEl.hidden = true`, `:1730`), so it is the chat's bottom-most chrome — and
  `composer.css:15` owns the inset precisely because it normally is. **Cancel request, the only escape
  from a locked chat, sat under the home indicator.** The `'incoming'` lock has the same shape (the
  composer is hidden there too), so the request card needed it as well. **Fixed** on both; `env()`
  resolves to 0 off-iOS. #287 rebuilt this exact block "token-exact" and #282 was the edge-to-edge
  batch, so this is the right batch to close it.
- **The #286 wrap escalation never restored the label** (`wallet-shell.js:191-203`). `fit()` was
  strictly additive: `compact` set, then `wrap` set on top, `compact` never re-evaluated in the
  wrapped layout — where the pill owns a full-width line and "Missing a transaction?" fits
  comfortably. At ~230px the row rendered a lone ⓘ with ~180px of blank space beside it and the
  affordance's name invisible, which is the whole point of #98. **Fixed:** re-measure without
  `compact` after wrapping, re-apply only if it still overflows.
- **`.c-txlist-item__time` could not ellipsize** (`txlist-item.css:88`). As a flex child with
  `white-space: nowrap` its automatic minimum size is its min-content width, so it never shrinks; the
  new #286 `overflow: hidden` belt on `__meta` then clipped it mid-glyph and the `text-overflow`
  below could never fire (`Jul 29, 20` sliced flush at the edge). **Fixed:** `min-width: 0` — the same
  remedy already applied to the sibling `.c-badge` at `:81`.
- **`#285`'s de-de fill silently did not land for one key.** `build-locales.mjs:60` tried legacy reuse
  *before* the draft and took the `stats.reused++` branch, so a legacy value that is merely the
  English word shadowed a good draft **and reported itself as translated** — `#285` drafted
  `"developer": "Entwickler"`; `de-de.js:220` shipped `"Developer"`. **Fixed:** a legacy value equal
  to the English is no longer treated as a translation. Measured blast radius across all 7 locales =
  **5 values, all of which now match the `en-us` canon**: de `developer` → *Entwickler*, de `ok`
  `"Ok"` → `"OK"`, de/fr `version` `"Version:"`/`"Version :"` → `"Version"` (en-us carries no colon),
  fr `source` `"Source"` → `"Source: "` (en-us carries the separator; the French was dropping it).
  `verify-locales` ALL CLEAN after.
- **`{name}` interpolation used `String.replace`** (`chat.html:1719`), which expands `` $& / $` / $' /
  $n `` in the *replacement* — a peer-controlled nickname containing `$&` rendered mangled.
  `textContent`, so no XSS. **Fixed:** `split/join`, the codebase canon (`wallet-shell.js:377`).
- **`smoke-test.mjs:3468` would have FAILED your local run.** The call.html guard pinned the literal
  tail `'wallet_sent', 'call']`, which the launch-keys spread breaks — the identical stale-`DEFAULT`
  class that bit at #272. **Fixed**, and the assertion set extended (below).
- **13 phantom / wrong-value custom properties in `chat.html`'s bot-channel + app-picker blocks** —
  the exact class #287 diagnosed and fixed for the 20-line waiting strip, left standing in the sibling
  blocks of the same `<style>`. Two kinds: `--spacing-2` and `--spacing-4` **are** defined (2px / 4px),
  so their `8px` / `16px` fallbacks were dead and those surfaces rendered **4× too tight**; while
  `--spacing-1`, `--spacing-3`, `--radius-md`, `--text-neutral-03` and `--interactive-hover` are
  **undefined**, so `#888` and a flat grey hover were hardcoded and never flipped in dark mode.
  **Fixed** the unambiguous ones (19 refs). ⚠ **This is a visible delta — eyeball it** (below).

---

## MINOR — flagged, NOT fixed (owner)

- **🟡 The chats list and the chat disagree about a pending GROUP.** `HomePage:1617-1623`
  (`getFriendMessageHelper`) still labels *any* non-Approved non-bot friend — groups included — with
  `chat-waiting-for-response`, while #284's A1 guard excluded groups from the composer lock
  (`SingleChatPage:1945`). So a non-Approved group reads "Request sent" in the list while its chat
  composes freely and renders local delivered ticks — the ⑪ delivery-lie, for groups. Two exits: add
  the group guard at `HomePage:1619` (list stops claiming it), or lock groups but render the strip
  **without** the Cancel-request affordance (the real hazard was `ixian:undorequest` →
  `removeFriend` with no `sendLeave`). **Not built around** — whether a group can carry a non-Approved
  state is Ixian-Core, already 🟡 from the previous loop. Damir/BE call.
- **🟡 `onDeleteAccount` never got the live-chat sweep its twin got.** `SettingsPage:513-532` wipes
  `FriendList` and calls only its own `onLoad()`, while `onDeleteHistory` (`:534-552`) now re-renders
  every live conversation via `getChatPages()`. A conversation overlay is reachable *underneath* the
  Account pane (`onSettings:1394` does not close chat overlays; only the reverse). So: delete account →
  dismiss the alert → the overlay is still painted with the wiped history and holds a `Friend`
  reference no longer in `FriendList`, ticking `updateScreen()` against it. Left alone deliberately —
  it is a destructive path and the safe shape (close the overlays vs. re-render against a dangling
  friend) is a judgement call, not a mechanical fix.
- **`Utils.getChatPages()`'s new #284 branch is unreachable dead code.** `HomePage.detailContent` is
  declared `null` at `:36` and the only other assignment in the file is `= null` at `:2551` — nothing
  ever assigns it a page (since #225/#263 the desktop conversation is an *overlay*, already
  enumerated). So the #284 row's claim that it "*fixes onLowMemory eviction + reloadScreen-all
  misses*" is false as written, and `SettingsPage:361`, `HomePage:1962`, `:2217`, `:2576` are likewise
  permanently dead. **No behavioural bug** — but it also means `reloadShell`'s stated rationale
  ("`reload()` would tear down the settings pane") is wrong: the pane is an overlay; `reload()` would
  only recreate `EmptyDetail`. `reloadShell` is still the right call, for the right reason (it must
  not clobber the #274 restore) — recorded here so nobody "simplifies" it back.
- **Damir dial — the mask leaves a one-tap path to full disclosure.** `wallet_sent.html:226-241`
  deliberately keeps status/date/**txid** visible, and directly beneath the `••••••` card sits a
  copyable transaction ID and a full-width **View in Explorer** button that opens the exact amount and
  both addresses in the system browser. The docblock claims "home.html `applyWalletVisibility`
  parity", but that function masks *rows*, which carry no txid and no explorer affordance. Either
  suppress both while masked, or correct the comment. Same gap in home's mobile tx sheet.
- **`.c-wallet-tools { max-height: 220px }`** (`wallet-shell.css:21`) is a magic cap with
  `overflow: hidden` — exactly how the #286 bug presented at 160px. With `data-wrap` the chips
  themselves can take a third line at ~200px, or large type can push past it. Raise it well clear
  (400px) or transition `grid-template-rows`.
- **NITs:** `--easing-emphasized` (undefined → `ease`), `--border-subtle` (undefined) and
  `--duration-700` (undefined, in **12** shells — the boot spinner therefore ignores the
  reduced-motion override, since only `--duration-100/200/300` are zeroed at `tokens.css:954`) were
  left alone: repointing them changes motion/appearance and wants a design call · `wallet_sent.html`'s
  reveal-button comment says "under the amount block" but `head.after()` puts it above · after tapping
  "Show amounts" focus falls to the address copy button and the reveal is not announced ·
  `SingleChatPage:646/660/664` comments cite stale line numbers (`:644`, `HomePage:1606`) ·
  `HomePage:2403` comment still describes the #242 save-time language reload that #285 removed ·
  a language pick forces `currentTab = tab1`, so a user who picked from Wallet lands on Chats, and
  `selectChat` is not re-pushed (open conversation loses its selected-row highlight).

---

## Break-my-verdict pass — it broke 2 of my own fixes [both corrected]

A fresh reviewer ran over the fix set (not the original code) with all 25 anchors checked against
source and the patch applied to a scratch tree. It found:

1. **The request-pane inset landed on an unpainted wrapper.** `.chat-request-pane` has no background;
   the card child `.c-contact-request` carries `--surface-neutral-02` while the parent body is
   `--surface-screen` — **different tokens in both themes**. Padding on the wrapper would have opened
   a ~34px band of the wrong grey under the card. The sibling strip fix was correct because it paints
   its own background on the same element. **Corrected:** the inset moved to
   `.chat-request-pane > .c-contact-request`.
2. **The belt's new unconditional flag-clear re-opened the #285 round-2 bug.** Two language picks
   inside the ~5s belt window are **one tap apart** — the #274 stash returns the user straight back
   *onto* the Language picker. Belt #1's timer would clear pick #2's freshly-armed flag, its boot echo
   would run the exit sweep, and the Account pane would be torn down mid-pick. **Corrected:**
   `reloadShellGen` epochs the reload; the clear only ever disarms its own.

It also flagged two risks that turned out to be real and were handled: the stale `DEFAULT` regex in
`smoke-test.mjs` (fixed), and the build-order requirement (bundle before shells — followed). Its
estimate of fix #11's blast radius (1 key) was low; the measured diff showed 5, which is why they were
individually reviewed against `en-us` rather than trusted.

---

## CLEAN (verified)

- **★ #221 isolation holds.** Every push added in this range and by these fixes is a same-WebView
  `Utils.sendUiCommand` to the page that owns it (chat→chat, home→home, tx-detail→tx-detail,
  settings→settings). No chat↔wallet JS bridge, no shared DOM, no new bridge verb.
- **Money untouched.** Nothing in the range or the fixes signs, broadcasts, or composes a payment;
  `wallet_sent.html` stays view-only; no key/password/seed crosses the bridge; no WebView-supplied
  path reaches a filesystem call (the hide flag is read from `Preferences`, never from the WebView).
- **#284 composer-lock ordering is sound.** `onChatScreenReady` is pushed first (`SingleChatPage:518`)
  so the shell's per-peer `setComposerLock(null)` reset lands before the lock push; `setChatMode`
  (`:633`) precedes the first `updateScreen()` (`:651`), so `mode.isMulti` is populated before any
  `showRequestSentModal("1")` — the C# guard and the shell belt are genuinely redundant, not
  order-dependent. The R1 re-entry fix holds (latch reset at `:648` sits in the same block as the
  other per-peer resets). A4's dedupe bookkeeping is consistent across all four online/offline ×
  approved/pending combinations.
- **#284 group + `RequestReceived` guards present at BOTH sites** (`:656`, `:1945`; excluded at `:667`,
  `:1962`) — the incoming-request pane keeps its affordance on both paths.
- **#285 push key/form/order.** `Preferences` key `"hidebalance"` matches HomePage's writer exactly;
  `bool.ToString()` → `"True"/"False"` matches the shell parser; the push precedes `checkTransaction()`
  in `onLoad`, so the *first* burst is masked. No cross-transaction reveal leak — every tx tap
  constructs a new `WalletSentPage`, and `revealed` is in-memory.
- **#285 masked fields do not leak via attributes.** `sheetRow` returns `null` for empty values (rows
  omitted, not emptied); `copyButton` is only constructed inside `if (tx.address)` / `if (tx.txid)`;
  `_raw` never reaches the DOM or a `data-*`; `contact: false` + `address: ''` both fail
  `openTxSheet`'s `isContact` test, so `WALLET_MASK` is never rendered as a title and no gradient is
  derived from it.
- **#287 tokens all exist in both themes** (verified against the inlined `tokens.css`):
  `--size-avatar-32`, `--surface-action-tonal-default`, `--icon-action-default`, `--easing-standard`,
  `--outline-neutral-01`, `--surface-neutral-02`, `--outline-width-1`, `--spacing-12/-16`. The
  `--spacing-3/-4` phantoms the row set out to kill are gone from that block. Hairline parity with
  `composer.css:19` is byte-identical; the reduced-motion escape is reached (later rule, equal
  specificity); the medallion is `aria-hidden` and guarded on `window.SpixiIcons` so a missing
  registry yields an empty disc rather than a throw inside the lock path.
- **#286 badge accessible name survives the ellipsis** — `.c-badge__label` truncates visually only,
  `textContent` untouched, and the leading icon does not collapse (`min-width:0` is scoped to
  `.c-badge`, not its SVG child). `fit()` terminates: both attributes are deleted before each
  measurement, so every call recomputes from the un-escalated layout.
- **Nothing new is written to `localStorage`** in this range. The only storage touch is
  `removeItem(VIEW_RESUME_KEY)`; the stash holds `{v:'language', t:…}` — a whitelisted view name plus
  a timestamp, one-shot, 15s. #254-compliant (no message text, no plaintext user content).
- **#274 restore is wired on every reachable path** — `takeResumeView()` precedes the boot
  `renderLayout()`, `setPaneMode` re-renders, the three language commit sites are mutually exclusive
  by `paneMode`, and `langBuilt` is written in both branches with the opposite mode's key cleared.
- **Artifact integrity, before the fixes:** source↔bundle parity exact for all audited components
  (byte-for-byte through the stripper), source-shell↔built-shell parity exact for the four audited
  shells (0 missing blocks, 0 orphans, identical bundle/strings/icons hashes ⇒ one artifact set, one
  run), **zero NUL bytes** anywhere in the tree, all files valid UTF-8, i18n key integrity clean
  (665/665, 0 orphans, 0 placeholder mismatches).
- **Artifact integrity, after:** bundle 235 exports · 22 shells written (17 + the 5 launch) · all at
  665 keys · `i18n-lint` ✓ · `verify-locales` **ALL LOCALES CLEAN** ✓ · NUL sweep clean · every fix
  spot-verified present in the built output · legacy `apps.html` / `wallet_send.html` untouched.

---

## Pipeline run in-session

`build-locales` → `build-strings-iife` → `build-demo-bundle` (235 exports) → `build-shells` (22) →
`i18n-lint` ✓ → `verify-locales` ✓ → NUL sweep ✓. `pseudo-locale-smoke` and `smoke-test` exceed the
device VM's 45s window (known) → **your local run**. The 9 new/changed smoke assertions were each
executed standalone against the current tree: **9 pass, 0 fail**, including the two pre-existing
#277/#278 assertions that sit next to them.

New smoke coverage (the discipline gap C flagged: this leak class had regressed twice with no
committed guard, and now three times):
- the balance toggle re-pushes `setHideBalance` to every open tx-detail overlay
- the tx-detail mask is fail-**safe** (`masked` until the flag arrives, `firstKnown` path present)
- the five launch drop-ins are in `DEFAULT`; `all` skips the legacy drop-ins
- the pending strip + request card own the iOS inset
- `fit()` restores the label once the pill wraps

---

## Damir — build / F5 / commit

**Components changed** (`wallet-shell.js`) → the full pipeline already ran in-session; nothing to
rebuild unless you touch source again. Run **`node scripts/smoke-test.mjs`** locally (plus
`pseudo-locale-smoke`), then build **net10.0-windows** (NOT Rebuild — changed: `HomePage`,
`SettingsPage`, `SingleChatPage`) and F5:

1. **The MAJOR.** Wallet, balance visible → tap a tx row → detail pane opens → tap the hero eye:
   **the pane masks too** (amount/fiat/fee/name/address/avatar → `••••••`, address row and copy button
   gone), with a "Show amounts" button. Tap it → this view only reveals. Tap the eye again (show, then
   hide) → re-masks. Mobile: hide → tap a row → detail opens masked.
2. **Launch i18n.** Settings → Deutsch → close and reopen the app to the launch/onboarding flow → the
   language picker and onboarding copy are German (they were English).
3. **Language pick, desktop.** Account pane → Language → Deutsch → pane returns on the picker **and
   the resting welcome pane on the right is now German** (it used to stay English until restart). Then
   pick twice in quick succession — the Account pane must survive both.
4. **⚠ Visual delta to eyeball (the token repoints).** Open a **bot chat → tap the title** (channel
   selector) and **⊕ → app invite** (app picker): row padding/gaps go from cramped to correct
   (2px→8px, 4px→16px), the hover wash changes from a flat grey to `--surface-interactive-hover`, and
   empty-state text from `#888` to `--text-neutral-02`. **Check both themes** — the old values did not
   flip in dark mode. If any of it reads worse, say so and I'll dial it back; this is the one change
   in the batch that alters pixels you didn't ask for.
5. **iOS (next sim pass).** "Request sent" chat → the **Cancel request** button clears the home
   indicator; incoming request → **Accept/Decline** clear it too, with no grey band under the card.
6. Narrow the desktop wallet pane: the timestamp **ellipsizes** instead of being sliced mid-glyph, and
   once the ⓘ pill wraps to its own line the **"Missing a transaction?" label comes back**.
7. Bot chat that was joined while its request was still pending: composer is live, no waiting strip.

**Commit hygiene:** delete `_to_delete/review-284-287/` (session scratch — the two patch scripts and
the diffs). `git rm --cached _to_delete_index.lock*` is still owed from the last loop. The CRLF churn
across `Raw/html` and `.cs` remains the known checkout noise (`--ignore-cr-at-eol` shows the real
delta: 3 C# files, 4 shell/component/CSS sources, 3 scripts, 4 locale outputs, 2 generated artifacts,
22 built shells).

⚠ **Sandbox note:** `git checkout -- <file>` fails on the device VM ("unable to unlink old … Operation
not permitted"), so a revert has to happen on your side. Nothing needed one this session.
