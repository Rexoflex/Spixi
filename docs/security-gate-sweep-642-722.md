# ★ SECURITY HANDOVER GATE — sweep of the Sessions A–H delta (#642–#722)

**Method:** `docs/security-handover-gate.md`. One question per finding: **does this exposure
exist at the baseline?** No → **OURS**, fix before handover. Yes → **INHERITED**, hand over
untouched.

**Scope swept:** `c2831c2a` → working tree (uncommitted Session H edits included).
Diffs at `/tmp/review/{js,cs,gates}.diff`; every verdict below was taken by reading the
real file, not the diff hunk.

**Baseline reference:** fork point `0e85a4b8`, read with `git show` where a row needed it.

**Standing MAJORs (#1a, #2–#10, L2, L8, A1) are NOT re-logged here.** Where a row touches
one, it names it.

---

## Delta at a glance

| Surface | Count in this delta |
|---|---|
| NEW `ixian:` verbs | **9** (4 HomePage · 1 SingleChatPage · 3 ContactDetails · 1 SettingsPage) + 2 overlay mirrors (Downloads, AppDetails) |
| REMOVED `ixian:` verbs | **5** (`sendixi`, `receiveixi` on Home · `send`, `request` on SingleChatPage and ContactDetails) |
| NEW C# → shell pushes | **5** (`leaveGroupResult`, `callRefused`, `downloadsBack`, `appDetailsBack`, `setNotifPushProvider`) |
| NEW `spixi.*` localStorage keys | **2** (`spixi.chat.ground`, `spixi.hsstage.<addr>`) |
| NEW native `Preferences` keys | **1** (`notif_push_provider`) |
| NEW `innerHTML` / `eval` sinks | **0** |
| NEW network fetches | **0** |
| NEW WebView settings | **0** |
| NEW filesystem operations | **0** |
| NEW log lines | ~20 (all enumerated below) |
| Legacy money pages DELETED | **3** (`WalletSendPage`, `WalletSend2Page`, `WalletReceivePage`) |

---

## 1 · NEW VERBS

Prefix-collision method: for each new verb, walk the page's `onNavigating` chain in
source order and ask (a) can an EARLIER `StartsWith`/`Contains` branch shadow it, and
(b) can it shadow a LATER branch.

| Surface | What it exposes | At baseline? | Verdict | file:line |
|---|---|---|---|---|
| `ixian:paintdiag:<word>:<int>` (HomePage) | A diagnostic log line. Payload clamped to a **closed 3-word vocabulary** (`cover`/`backsend`/`other`) + one `long.TryParse`. Nothing echoed, nothing stored, no navigation | No — verb is ours | **OURS — accepted, but RETIRE before handover.** No exposure (fixed vocabulary, ints only, whole body in try/catch, failure logs fixed text). ⚠ It is a temporary probe: its own header says "REMOVE ALL FOUR TOGETHER once measured", and it writes into a DevPage-shareable log whose `maxLogCount` is still 5 (the standing RELEASE BLOCKER row) | `Spixi/Pages/Home/HomePage.xaml.cs:673` |
| `ixian:landtabprobe:<word>:<int>` (HomePage) | Same shape. Closed 4-word vocabulary (`storage`/`visibility`/`focus`/`settingsclosed`/`other`) + one parsed int | No — ours | **OURS — accepted, RETIRE with the row above** | `HomePage.xaml.cs:697` |
| `ixian:leavegroup:<addr>` (HomePage) | **DESTRUCTIVE.** `sendLeave` + `FriendList.removeFriend` (history file + avatar deleted) for a WebView-named address | No — baseline had no chats-list leave route | **OURS — accepted by ruling (#676, and #567 for the leave grammar).** Placed with the four address-scoped verbs ABOVE the legacy `Contains()` block; no earlier prefix matches, and no later verb starts with it. **Guarded twice**: `FriendList.getFriend(new Address(addr))` must resolve, and `SContacts.leaveGroup` returns false for anything that is `!bot && type != Group` — a 1:1 address answers `fail` and touches nothing. Body is the ONE `SContacts.leaveGroup`, not a third copy. Reached only behind the row menu's two-step delete sheet. Log line is fixed text, **no `ex.Message`** (Core's `Address` ctor formats the peer token into its exception text) | `HomePage.xaml.cs:727` → `:4714`; `Spixi/Utils/SContacts.cs:68` |
| `ixian:cleardetail` (HomePage) | Closes the four detail-column overlay families. **No payload**, `Equals` + Ordinal | No — ours (#L6) | **OURS — no exposure.** Presentation state only; cannot navigate, store or echo. Deliberately NOT reusing `ixian:homeoverlay:` (that fires for ordinary sheets), which is the right call — the alternative would tear the detail column down on every sheet | `HomePage.xaml.cs:1188` |
| `ixian:callback` (SingleChatPage) | **START a call only.** One leg, no hang-up branch | No — ours | **OURS — accepted, and it CLOSES a defect.** The call-back link used to send `ixian:call`, the TOGGLE, so a control labelled "Call back" reached the **ungated hang-up** branch and could end a live call from any conversation holding a call card. ⚠ **No prefix collision only because `ixian:call` is `Equals`, not `StartsWith`** — pin that property, it is the only thing keeping the two apart. Gated by the ONE rule `SingleChatPage.canPlaceCall` (not bot, not group, `FriendState.Approved`, audio codecs > 0) + `!VoIPManager.isInitiated()` | `Spixi/Pages/Chat/SingleChatPage.xaml.cs:217`; rule at `:1163` |
| **`ixian:signSend:<addr>:<amount>` on ContactDetails** (the L1 money move) | A WebView **proposes** a payment from a document that previously could only navigate to the native send page | Verb exists since #523 on Home + Chat — **MECHANISM INHERITED, REACH INTRODUCED for this document** | **OURS — accepted by ruling (#523/#640).** The wall holds by construction and was re-read at source: `ExtendedAddress.Validate(addr)` → `parseAmount` → C# computes its OWN fee → own balance check → **NATIVE `displaySpixiAlert` built only from C#-parsed values** (+ PA1 biometric, fail-CLOSED) → `Node.sendTransactionFrom`. Re-entry latched app-wide. **The shell cannot name another recipient**: `createWalletSend` is built with `contacts: []` and `lockedRecipient: {address: state.address}` — the C#-pushed peer. ★ Net exposure is SMALLER than the page it replaces: the legacy `wallet_send_2.html:133` confirm never wrote the destination address; this one always does. ⚠ Recorded honestly: the C# verb is **not** peer-scoped, so a compromised details document could propose an arbitrary recipient — it can only put a proposal in front of the user's eyes, on a confirm that names the address | `Spixi/Pages/Contacts/ContactDetails.xaml.cs:557` → `Spixi/Utils/SPayments.cs:250`; shell at `src/shells/contact_details.html:763,783` |
| `ixian:feeQuery:<addr>:<amount>` on ContactDetails | Read-only quote | Same class as above | **OURS — no exposure.** Validate → estimate → push. Nothing broadcast, nothing stored | `ContactDetails.xaml.cs:561` → `SPayments.cs:159` |
| `ixian:sendrequest:<addr>:<amount>` on ContactDetails | A chat MESSAGE (`requestFunds`), nothing signed | Same class | **OURS — no exposure, and it is PEER-SCOPED.** `handleSendRequest(this, friend, …)` refuses unless the peer is `Normal && approved && FriendState.Approved && !bot` **and** `friend.walletAddress.ToString().Equals(addr, Ordinal)`. Amount normalization rejects a second dot. Refusal logs a FIXED sentence, never the mismatched address | `ContactDetails.xaml.cs:565` → `SPayments.cs:100` |
| `ixian:notifPushProvider:on\|off` (SettingsPage) | Stores ONE bool preference, applies it to the live SDK, echoes the STORED value back | No — ours (P2 / #708) | **OURS — a PRIVACY INCREASE, no exposure.** No collision: `notifEnabled` / `notifSenderName` / `notifPushProvider` / `notifSounds` share no prefix relation. Payload is `Equals("on")` — anything else is `false`, i.e. it fails to the private direction | `Spixi/Pages/Settings/SettingsPage.xaml.cs:676` |
| `ixian:downloadsoverlay:<0\|1>` (DownloadsPage) | ONE display bit, `EndsWith(":1")`, no payload parsed | No — but it is the **fourth instance** of the `homeoverlay`/`cdoverlay`/`chatoverlay`/`launchoverlay` grammar already gate-rowed at #336/#370/#375/#614 | **OURS — no exposure.** Drives back-routing only; a forged or stale push at worst closes a sheet, and the shell self-heals through `downloadsBack` | `Spixi/Pages/Downloads/DownloadsPage.xaml.cs:67` |
| `ixian:appdetailsoverlay:<0\|1>` (AppDetailsPage) | Same | Same family | **OURS — no exposure.** Placed at `:112`, above `ixian:install`/`uninstall`/`details`; matches none of them (`ixian:app…` vs `ixian:details`) | `Spixi/Pages/MiniApps/AppDetailsPage.xaml.cs:112` |
| **REMOVED: `ixian:send` / `ixian:request` (ContactDetails, SingleChatPage) and `ixian:sendixi` / `ixian:receiveixi` (HomePage)** — the only live routes into `WalletSendPage`, `WalletSend2Page`, `WalletReceivePage`, all three **deleted** | The legacy money entry, which signed with **no destination address on its confirm** and NREs on a failed broadcast | Yes — legacy | **EXPOSURE REMOVED.** One money grammar, one confirm, one sign site. This is the strongest single row in the delta and it belongs in the handover note | `ContactDetails.xaml.cs:540-556` (comment block) · deleted files in `cs.diff` |

### Back mirrors

| Surface | What it exposes | At baseline? | Verdict | file:line |
|---|---|---|---|---|
| `routeShellBack()` virtual + the HomePage dispatch that asks every top overlay | Routes a hardware/edge back INTO a shell that has an overlay up, before `closeTopOverlay` pops the page | No — ours (#715) | **OURS — no exposure.** No data crosses. It FIXES a real defect: on mobile these pages are HomePage overlays and never receive `OnBackButtonPressed`, so back popped the page out from under an open modal | `Spixi/Utils/SpixiContentPage.cs:1874`; `HomePage.xaml.cs:3826` |
| `downloadsBack` / `appDetailsBack` pushes | **No arguments.** Bare signals | No — twins of `homeBack`/`cdBack`/`chatBack` (#336/#370/#375) | **OURS — no exposure.** Each is `Utils.sendUiCommand(this, …)`, i.e. page-scoped to its OWN WebView. Both handlers are defined in their shells (verified — the #258 bare-global rule holds) | `DownloadsPage.xaml.cs:207`; `AppDetailsPage.xaml.cs:293` |

### The log rule, verb by verb

| Line | Carries | Verdict |
|---|---|---|
| `[PAINTDIAG] <word>=<int>ms t=<ticks>` | closed vocabulary + 2 ints | ✅ clean |
| `[PAINTDIAG] account-closed t=<ticks>` | one int | ✅ clean (`HomePage.xaml.cs:3615`) |
| `[PAINTDIAG] re-present <Type.Name> t=<ticks>` | a C# **type name**, never an instance | ✅ clean (`SpixiContentPage.cs:1091`) |
| `[LANDTAB] consumer=<word> age=<int>ms` | closed vocabulary + int | ✅ clean |
| `[NOTIFDIAG]` ×6 (consent armed / provider ON / OFF, both platforms) | fixed sentences + one bool | ✅ clean |
| `[EXCERPTDIAG] empty excerpt: type=… local=… state=… approved=… unread=… msgLen=… id=<hex>` | message **type enum**, bools, friend **state enum**, an int count, a message **LENGTH**, and the message id hash | ✅ **No content, no address, no nickname.** The id is the class already accepted at #348b (a hash both peers hold). Fires only when the excerpt is empty, so it is bounded. ⚠ Diagnostic — retire with the PAINTDIAG family (`HomePage.xaml.cs:2569`) |
| `ixian:leavegroup failed (malformed payload or address)` | fixed text, **no `ex.Message`** | ✅ clean — the rule this project set for peer-supplied tokens is honoured |
| `sendrequest rejected: …` ×2 | fixed text, no address | ✅ clean |
| `Call refused: …` ×3 | fixed text | ✅ clean |
| `{0}: the target message was not found…` | `action`, which at that point is constrained by the enclosing `switch` to `"kickUser"` or `"banUser"` | ✅ clean |
| `safeString: <ex.Message>` · `resolveMessageChannel: <ex.Message>` · `anyOtherMemberHasMessage: … <ex.Message>` | framework exception text; `Encoding.UTF8.GetString` does not throw on invalid bytes, so no peer bytes can reach these | ✅ clean |
| **`Cannot open file: no message holds transfer id {0}`** | **a WebView-supplied token, verbatim** | ⚠ **OURS — FIX.** See §6 |
| `Error adding keyboard content, LinkUri is null (mime: {0}, content: {1})` | a MIME type + a bool. The URL is **not** logged | ✅ clean |

### Argument parsing — the two questions the gate always asks

* **Any WebView-supplied path or filename reaching a filesystem op?** **No.** The delta adds
  **zero** `Path.*`, `File.*` or `Directory.*` calls. `ixian:openfile:<id>` takes the token as
  an **equality key** against `friend.getMessages(...)` and then uses `fm.filePath`, which C#
  owns; the iOS fallback `Path.GetFileName(fm.filePath)` also starts from the C#-owned path.
  The `#267` downloads traversal guard (`resolveDownloadPath`) is untouched.
* **Any unvalidated address reaching a money or friend-state op?** **No.** Every new
  address-bearing verb resolves through `FriendList.getFriend(new Address(addr))` inside a
  try/catch (`leavegroup`), through `ExtendedAddress.Validate` (`signSend`, `feeQuery`), or
  through an exact-equality peer scope (`sendrequest`).

---

## 2 · STORAGE KEYS

**The standing premise (MAJOR #4):** mini-app code may share the shells' `file://`
localStorage partition. The question for every key is therefore what it *holds*, not
whether it exists.

### New in this delta

| Key | Contents | At baseline? | Verdict | file:line |
|---|---|---|---|---|
| `spixi.chat.ground` | the literal `'flat'` or `'gradient'` | No — ours | **OURS — no exposure.** A display preference. No address, no timestamp, no content. Read pre-paint and validated against the two literals (anything else falls to the platform default) | `src/shells/chat.html:70,699`; `src/shells/settings.html:477` |
| `spixi.hsstage.<addr>` | a **timestamp** under an **address-bearing key name** | No — ours (Session H) | **OURS — accepted, same family as the shipped `spixi.exdel.<addr>` / `spixi.hidereq.<addr>` / `spixi.draft.<addr>` (#254).** ⚠ It is address-bearing, so it inherits MAJOR #4's premise and nothing more: **no message text, no nickname, no peer content** — the writer's own comment states the #254 rule and the code honours it. Hardened well: consumed on read, 30 s staleness drop, and it only stages a row the document already holds | writer `src/shells/chat.html:3539`; reader `src/shells/home.html:2244-2274` |

### Named in the work order, INHERITED (already in the tree at `c2831c2a`)

| Key | Contents | Verdict |
|---|---|---|
| `spixi.mentions.seen.<addr>` | message ids the user has caught up on, per peer | address-bearing, no content — the accepted family (#213) |
| `spixi.scan.granted` | the literal boolean | no personal data (#305) |
| `spixi.landtab` | a tab name + stamp, consumed on read | no personal data (#238) |
| `spixi.settings.view` (`VIEW_RESUME_KEY`) | `{v: <view name>, t: <ts>}`, one-shot, always consumed | no personal data (#274/#254) |
| `spixi.chat.pattern` / `.patternstyle` / `.textscale` | display prefs | no personal data |

**Nothing in this delta widens MAJOR #4.** The unfixed member of that family remains
`spixi.draft.<addr>` — the user's own **unsent message text in plaintext** — which the gate
doc already carries as OURS-OPEN. It is untouched by this delta and stays on the fix list.

**One native preference added:** `notif_push_provider` (`SNotificationPrefs.cs`). ★ MAUI
Essentials `Preferences` is native app storage, **not** the `file://` partition — MAJOR #4
does not apply. Value is a bool. Same reasoning as `lockIdleMinutes` (#507).

---

## 3 · THE ATTACH TRAY · EDGE-BACK · THE COMPOSER REWORK (#705/#706)

**The question: any new path by which chat-composed data reaches another pane, or a
gesture reaches the wallet?** **No, on both counts.**

| Surface | What it exposes | At baseline? | Verdict | file:line |
|---|---|---|---|---|
| **Attach TRAY** (`openAttachTray`) — the grid under the composer instead of over it | Presentation. Same tiles, same gates, ONE builder (`buildAttachGrid`) shared with the desktop sheet | The attach sheet is ours (#96); the tray presentation is new | **OURS — no exposure.** Every tile emits an EXISTING verb into the chat page's own C# (`ixian:sendfile`, `ixian:sendmedia`). No data leaves the document. ★ `attachTilesFor` is **one predicate used three ways** — it decides what is drawn, whether the ⊕ shows, and (on tap) whether the action is honoured — so a room whose type arrives while the tray is open cannot fire a tile the room does not allow | `src/components/attach-sheet.js` (`attachTilesFor`, `openAttachTray`); shell emits `src/shells/chat.html` |
| ⚠ The tray is **not** on the shared overlay stack and does **not** trap focus | Deliberate: the composer above it must stay live | — | **No exposure.** It has no scrim, sits in document flow, covers nothing sensitive, and every dismiss path (`chatBack`, the edge swipe, Escape) closes it explicitly through `isAttachTrayOpen`. Same handling the bot channel selector already has | `attach-sheet.js` header |
| **`attachEdgeBack`** — a left-edge swipe raises `onBack()` | A **signal**, not a route. The component never navigates, never sends a verb, never reads state | No — the recogniser shipped inline in `chat.html` since #325/#328; lifting it into a component is new | **OURS — no exposure.** ★ The key property: **it raises exactly the signal hardware back already raises**, into each shell's own existing back chain. It adds a second *raiser*, not a new *reach*. So every lock that protects hardware back protects this: the tip/send sheets are `escDismiss:false` and consume through `dismissTopOverlay` while in flight (smoke: "back press consumed but does NOT dismiss in flight"), and `home.html`'s router calls `dismissTopOverlay()` **first** | `src/components/edge-back.js:49` |
| ⚠ Where it never attaches | `lock.html` and `call.html` — **verified by grep, not by reading the header's claim.** `:root[data-desktop]` returns a no-op detach immediately | — | **Correct.** A gesture can neither unwind the lock nor dismiss a call ring | `edge-back.js:51`; attach sites across 15 shells |
| A gesture on the **wallet** tab | `home.html` routes it to `closeTopHomeTakeover()` — dismiss the top overlay, else close the wallet Receive/Send takeover, else the contacts takeover, else nothing | — | **No exposure.** At the root it does nothing (iOS has no exit gesture). Nothing on that path signs, confirms or spends | `src/shells/home.html:4163` |
| **Composer rework** | One `<button>` appended to the bar; the glyph rotates through `aria-expanded` in CSS | — | **No exposure.** Presentation only — the entire code delta on `composer.js` is `el.append(attach)` | `src/components/composer.js` |

★ **#221 holds unchanged.** Nothing in this batch composes chat into a shared WebView, and
no new JS bridge exists between the conversation and any other pane. Cross-pane coordination
in this delta is still C#-only (`ixian:cleardetail`, `routeShellBack`).

---

## 4 · THE NOTIFICATION WORK (#503 / #510 / #708)

**Read the code, not the comments** — done; the findings below are from the source.

| Surface | What it exposes | At baseline? | Verdict | file:line |
|---|---|---|---|---|
| **iOS opt-out gates the SDK properly** | `initialize()` returns **before `OneSignal.Initialize`** when the preference is off — no Initialize, no token, no OneSignal permission prompt | No — ours (P2) | **OURS — a real PRIVACY INCREASE.** This is a true gate, not a display filter. Not latched, so turning it back on re-initialises | `Spixi/Platforms/iOS/SPushService.cs:71-87` |
| **Android opt-out is a CONSENT gate, not a skip** | `OneSignal.ConsentRequired = true` is set **before** `Initialize` in `registerEarly` (which must stay in `MainApplication.OnCreate` for #493), and `ConsentGiven` is then set from the preference in `initialize()`. Runtime changes go through `applyPushProviderPreference()`: OFF → `OptOut()` **and** `ConsentGiven = false`; ON → consent, then `OptIn()` | No — ours (P1/P2) | **OURS — a PRIVACY INCREASE, with one verification owed.** ★ P1 alone is significant: at baseline the SDK went live in `MainApplication.OnCreate`, i.e. **before any Activity and before a first-install user had seen a screen**, so a token, device metadata and an IP reached a US third party pre-onboarding. ⚠ **The Android arm relies on the SDK honouring `ConsentRequired`/`ConsentGiven`** — a third-party behavioural dependency the source cannot prove, and the file itself records that it could not be compile-verified (no NuGet egress). Belt-and-braces (`OptOut` **and** consent withdrawal) is the right shape; the residual is a **device verification**, not a code fix | `Spixi/Platforms/Android/SPushService.cs:136`, `:188`, `:249-278` |
| Windows / MacCatalyst | `applyPushProviderPreference()` no-ops; `pushProviderSupported()` decides whether the settings row exists at all | — | **No exposure.** A control that cannot act is not shown | `Platforms/{Windows,MacCatalyst}/SPushService.cs:22` |
| **The cold-push lane's `fa` parsing** | Push-payload `fa` → `decidePush(ref fa)` → `decideFromAddress` → `new IXICore.Address(fa)` (throws → caught) and `showLocalNotification(… fa …)` → an Intent Action + extra `MainActivity` reads | **Yes — already logged as REACH INTRODUCED (#510/#512)** | **NOTHING WIDENED IN THIS DELTA.** The whole `SPushService.cs` code change is the P1/P2 consent block; `decidePush`, `decidePushUncached`, `decideFromAddress`, `postOurPushRow` and `showLocalNotification` are byte-identical. `SNotificationServiceExtension.cs` is not in the delta at all. The standing 🟡 for the BE engineer — *the payload's `fa` is trusted end-to-end, so a crafted `fa` can aim a notification tap at an arbitrary address* — is unchanged | `Platforms/Android/SPushService.cs:612,775,835`; unchanged vs `c2831c2a` |
| `setNotifPushProvider` push | one bool string | No — ours | **OURS — no exposure.** Echoes the **stored** value, so a failed write cannot lie to the switch | `SettingsPage.xaml.cs:683` |

---

## 5 · SESSION H SPECIFICS

| Surface | What it exposes | At baseline? | Verdict | file:line |
|---|---|---|---|---|
| **Subscreen slide — the EXIT layer** | `.c-subslide--out` carries `pointer-events: none` | No — ours (#707/#718) | **OURS — correct, and it mirrors the native rule.** A departing layer is dead to hit-testing, exactly as `SpixiContentPage` sets `InputTransparent = true` on a stage before its slide-out | `src/styles/components/subscreen-slide.css:22`; native mirror `SpixiContentPage.cs:1688,1720` |
| **Subscreen slide — the ENTER layer** | Opaque (`background: var(--subslide-ground, --surface-screen)`), `z-index: var(--z-30)`, `position: fixed/absolute; inset: 0`. It hit-tests where it is drawn (a CSS transform moves hit-testing with the paint) | — | **OURS — no exposure.** ★ The property that matters: **z-30 is over the bars (z-20) and UNDER any sheet (z-40)**, so a subscreen slide can never cover — or be covered by — a money sheet, and there is no transparent layer over a live control | `subscreen-slide.css:9,17,19` |
| ⚠ **The residual, stated plainly** | During the 300 ms entry the not-yet-covered strip of the view underneath stays visible **and tappable**, in both the CSS and the native implementations (`slideStageIn` does not make the host input-transparent either) | The baseline had no slide at all — views swapped instantly | **OURS — no exposure, ONE DIAL for Damir.** Nothing is hidden, nothing is spoofed: a tap lands on a control the user can see, in the position they see it. What it permits is an *input-during-transition* action — e.g. a hub row tapped while a sublevel is arriving. The surfaces it can reach are navigations and preference toggles; **no money surface is reachable**, because money sheets are z-40 and the slide is z-30. ★ Recommended dial (not a fix): set `pointer-events: none` on the covered host for the entry duration, in both implementations at once — the two must not diverge | `subscreen-slide.js:106`; `SpixiContentPage.cs` `slideStageIn` |
| Re-entrancy of the slide | `settleSubscreenSlide` finishes an in-flight slide synchronously; every entry point calls it first; a `WeakMap` keyed on the host; `fillToken`-style orphaning; a `ms * 2` completes-never backstop | — | **No exposure.** Correct, and it removes a stuck-state class | `subscreen-slide.js:44,61,72-95` |
| **Chat-info roster chunking** | Rows now build 24 at a time across `requestAnimationFrame` instead of in one paint | No — ours (Session H) | **OURS — no exposure. The blind masking is UNCHANGED and still per-row.** The old loop body was extracted verbatim into `memberRow(m)`; `maskRow = blind && kind === 'group'` still decides the avatar `src`, the `address` seed and the name fallback, per row. **No snapshot of the roster is taken** — the fill reads the same `matches` array the synchronous loop read. The member SEARCH also still refuses to match addresses in a blind room (`!blind &&` on the address term), so the chunking cannot leak an address through a query either | `src/components/chat-info.js:775,829-835`, fill at the `FILL_FIRST/FILL_BATCH` block |
| `[PAINTDIAG]` | fixed vocabulary, ints only | — | ✅ verified — see §1's log table |
| The 760 column · the composer pill tokens | CSS only | — | **No exposure.** No verb, no key, no sink, no fetch |

---

## 6 · EVERYTHING ELSE THE DIFF SHOWED

| Surface | What it exposes | At baseline? | Verdict | file:line |
|---|---|---|---|---|
| **`Logging.error("Cannot open file: no message holds transfer id {0}", id)`** | A **WebView-supplied string, verbatim**, into `ixian.log` — which DevPage renders and offers through the OS share sheet, with `maxLogCount` currently 5 | ⚠ **The branch is legacy** (`0e85a4b8:SingleChatPage.xaml.cs:175`) with **no guard and no log line**. So the null guard is ours-and-good; **the token echo is ours** | **OURS — FIX (small).** The value is not peer content, but it is unbounded attacker-shaped text from a document that renders peer content, and it can carry newlines into a shareable log. It also breaks the rule this project set for itself elsewhere in the same batch (`ixian:leavegroup` deliberately logs no token). **Fix: drop the `{0}`, or clamp to a fixed length and strip control characters.** The null guard itself stays — it removes an NRE that was process-fatal out of `onNavigating` | `SingleChatPage.xaml.cs:259` |
| **GIF-keyboard URL allowlist WIDENED** | `^https://[A-Za-z0-9]+\.(tenor\|giphy)\.com/…` → `^https://([A-Za-z0-9-]+\.)*(tenor\|giphy)\.com/…`, i.e. the **apex** domains are now accepted as well as subdomains | The mechanism and the two trusted domains are at the baseline (`0e85a4b8:WebViewRenderer.cs:166`) | **OURS — accepted, and it was checked rather than assumed.** The `([A-Za-z0-9-]+\.)*` group must end each repetition at a literal dot, so `eviltenor.com` fails, `tenor.com.evil.com` fails (after `.com` the pattern demands `/`), and `tenor.com@evil.com` fails. **No new registrable domain is trusted** — the same two third parties, one more label shape. ⚠ And the input is the LOCAL user's own keyboard, never a peer, so there is no hostile-input surface here at all. ★ `Utils.IsAllowedURL` — the **navigation** allowlist — was deliberately NOT widened, and is confirmed unchanged at `Spixi/Utils/Utils.cs:410` | `Spixi/Platforms/Android/WebViewRenderer.cs:193` |
| The keyboard handler's page lookup: `getTopOverlay() as SingleChatPage ?? NavigationStack.Last()` | Makes the branch actually run on mobile | The lookup is legacy; it broke because **our** #225 made the conversation an overlay | **OURS — restores baseline reach.** Not new exposure; a repair of a redesign regression | `WebViewRenderer.cs:169` |
| Receive-path hardening in `StreamProcessor` — `safeString(spixi_message.data)`, the null-payload guard, `resolveMessageChannel` instead of a literal `0` | Peer-controlled payloads | The parse sites are legacy | **TIGHTENS INHERITED CODE.** Same fields, same parse; what changes is that a null payload and a wrong channel no longer dereference. `Encoding.UTF8.GetString` does not throw on invalid bytes, so no peer bytes can reach the catch's `ex.Message` | `Spixi/Network/StreamProcessor.cs` (`safeString`, `receiveData`, `requestFundsResponse`) |
| `anyOtherMemberHasMessage` / `ownReactionAddresses` (the group delivery tick) | Reads reaction sender addresses **locally**; answers a **boolean** | No — ours (#658) | **OURS — no exposure.** No address reaches a log, a push or storage. The shell receives one tick state | `Spixi/Utils/UIHelpers.cs` |
| Native overlay slide-out (L8) + `isOverlaySlidingOut()` | Presentation lifecycle | No — ours | **OURS — no exposure, and it closes a defect.** The stage is `InputTransparent = true` before the animation, and a back press inside the window is swallowed above `closeTopOverlay` (otherwise the app backgrounded while the panel was visibly on screen). ★ **The lock path is untouched**: every `LockPage` is presented through `pushModalLoaded`, never `pushPageLoaded`, so no lock can be slid, margined or popped by this code | `SpixiContentPage.cs:1688-1720`; `App.xaml.cs:814`, `SettingsPage.xaml.cs:273,712` |
| Launcher-icon consolidation (L17) — 16 committed Android icon files deleted, `MainActivity` points at the generated pair | Resource files | Baseline set | **No exposure.** Removes an ambiguity, adds none | `Spixi/Platforms/Android/MainActivity.cs` |
| `flags.js` — the Windows flag fallback | `img.src = FLAG_BASE + c + '.png'` | New file | **No exposure — and this was checked because it looked like one.** `FLAG_BASE = 'img/flags/'` is a **LOCAL** asset already shipped in the APK. **No network fetch, no #82 class IP leak.** The glyph-support probe draws on a local canvas | `src/components/flags.js:41` |
| `openLegalDoc` / `openDocSheet` — the in-app Terms & Privacy sheets | A mini-markdown renderer that creates `<a href>` from `[label](https://…)` | The doc-sheet surface is ours (#169/iOS-23); at `0e85a4b8` the About screen only *mentions* a privacy policy | **OURS — no exposure.** The content is **app-controlled strings, never user or peer input**; the href regex is anchored at the literal `https://` so `javascript:` cannot be constructed; everything else is text nodes; `rel="noopener noreferrer"`. No network fetch — the copy is bundled | `src/components/launch-shell.js:562`, `openDocSheet` |
| Build scripts, locale dictionaries, `docs/legal/*` | Build-time and static copy | — | **No exposure.** No `execSync` on user input, no fetch, no new sink. All 13 dictionaries remain HTML-free (`textContent` sinks only) | `gates.diff` |

---

## ★ OURS — MUST FIX BEFORE HANDOVER

Four items. None is a wall breach; two are one-line fixes and two are copy.

1. **`SingleChatPage.xaml.cs:259` — a WebView-supplied token is written verbatim into a
   DevPage-shareable log.** *Question: does an unbounded WebView string reach `ixian.log` at
   the baseline on this path?* **No** — the baseline branch has no log line at all.
   **Fix:** drop the `{0}`, or clamp the token and strip control characters. Keep the null
   guard.

2. **The four diagnostic verbs and their log lines must be retired.** `ixian:paintdiag:`,
   `ixian:landtabprobe:`, `[EXCERPTDIAG]` and `[PAINTDIAG] account-closed` / `re-present`.
   *Question: does the baseline ship shell-reachable diagnostic entry points?* **No.** Each
   is individually clean, and each is explicitly marked temporary in its own header
   ("REMOVE ALL FOUR TOGETHER once measured"). Handing the engineer a build with live
   probes in it is the wrong first impression, and `Config.maxLogCount` is still **5**
   under its own RELEASE BLOCKER marker.

3. **The in-app Privacy fallback contradicts this batch's own privacy work.**
   `PRIVACY_DEFAULT` (`launch-shell.js:492`) is what actually ships — `privacyBody` is
   **absent from `en-us.json`**, verified — and it reads *"IXI Labs does not collect any
   personal data through the Spixi app."* The same working tree's `docs/legal/privacy-policy.md`
   §4.4 documents OneSignal holding a push token, device information and the IP address, and
   §4 documents `ipn.ixian.io` observing who sent to whom and when. *Question: did an in-app
   privacy claim exist at the baseline?* **No — the doc sheet is ours (#169/iOS-23), so the
   claim is ours.** **Fix:** ship the real policy as `privacyBody`, or replace the fallback
   sentence with one that is true.

4. **`docs/legal/privacy-policy.md` is now stale against the code beside it.** §4.4 lines
   97–100 state that the Android SDK initialises before acceptance and *"We are moving
   Android to match iOS… Until that ships, this paragraph is the disclosure."* **P1 shipped
   in this very delta** (`Platforms/Android/SPushService.cs:136`). The document also does not
   mention the new user-facing opt-out (P2), and still carries a
   `⟨PLACEHOLDER — DAMIR TO CONFIRM⟩` on retention. **Fix:** update §4.4, add the opt-out,
   resolve the placeholder. A policy that under-claims is the safe direction, but it states a
   fact that is no longer true.

**Carried forward, unchanged by this delta but still on the OURS list:**
`spixi.draft.<addr>` (the user's own unsent message text, in plaintext, in the partition
MAJOR #4 describes) · MAJOR #3 (spoofable link confirm) · MAJOR #6 (mini-app WebView
regressions).

---

## ★ FOR THE BE ENGINEER

Everything here is either legacy, or ours-and-argued and worth one line so his pass is a
review rather than a discovery exercise.

1. **The money grammar consolidated, and the delta REMOVES a legacy exposure.**
   `WalletSendPage`, `WalletSend2Page` and `WalletReceivePage` are deleted; `ixian:send`,
   `ixian:request`, `ixian:sendixi` and `ixian:receiveixi` no longer exist. All money now
   runs through `SPayments` — validate → own fee → own balance check → **native confirm that
   always names the destination address** → sign. The legacy confirm never wrote the
   destination (`wallet_send_2.html:133`). ⚠ Worth his eye: `ixian:signSend` is deliberately
   **not** peer-scoped (its whole purpose is a general send), so its safety rests entirely on
   the native confirm being built only from C#-parsed values. That property is the one to
   attack.

2. **The push payload's `fa` is still trusted end-to-end.** Unchanged in this delta, but it
   now has a second consumer (the cold-push extension, #510). A crafted `fa` can aim a
   notification's tap at an arbitrary address. The group case needs a payload change anyway
   (the row this family has carried since #493).

3. **The Android third-party push opt-out depends on OneSignal honouring
   `ConsentRequired`/`ConsentGiven`.** iOS genuinely skips `Initialize`; Android
   initialises with consent withheld. Neither could be compile-verified in the build
   container. **This wants a device check with a network capture**, and it is the kind of
   claim the privacy policy will make in the user's language.

4. **Inherited, untouched, and reachable through the new surfaces:** MAJOR #8 (Android
   mini-app WebView can XHR-read `wallet.ixi`) · MAJOR #9 (`OnPermissionRequest`
   auto-grants mic/camera to every WebView) · MAJOR #4 (shared `file://` localStorage
   partition — the mechanism under every `spixi.*` key in §2) · #234 (resume-lock Cancel) ·
   L8 (plaintext `Preferences["walletpass"]`) · L2 (passwords ride navigation URLs).

5. **A dial, not a defect:** during the 300 ms screen-slide entry — CSS *and* native — the
   uncovered strip of the view beneath stays tappable. No money surface is reachable
   (z-30 slide vs z-40 sheets), and nothing is hidden or spoofed. If it is closed, it must
   be closed in both implementations at once.

---

## What the sweep did NOT find

**No new `innerHTML` / `eval` / `insertAdjacentHTML` sink. No new network fetch. No new
WebView setting. No new filesystem operation. Nothing new touching a password, a key or a
seed across the bridge** — the entire delta contains one line matching that search and it
sets a notification boolean. `Utils.IsAllowedURL` is unchanged. `#221` — chat isolation —
holds: cross-pane coordination in this delta is C#-only, and no shell shares JS with
another.


---

## ★ SESSION H RESOLUTIONS (appended after the fixer round, same session)

The sweep above was taken BEFORE the ⑥ fixer round. Four rows moved:

1. **`ixian:signSend` on ContactDetails — the honest caveat is CLOSED.** The verb is now
   peer-scoped: `handleSignSend` gained `expectedRecipient` and both peer-locked surfaces
   (ContactDetails, SingleChatPage) pass `friend.walletAddress`; a payload naming any
   other address is refused before parsing. HomePage stays unscoped by design (quickscan /
   wallet Send legitimately compose to any address). Pinned.
2. **OURS-1 (the transfer-id log line, SingleChatPage) — FIXED.** The WebView-supplied
   token no longer reaches the DevPage-shareable log; the line logs its LENGTH only.
3. **OURS-3 (the in-app privacy summary) — FIXED, then fixed again.** The "does not
   collect any personal data" claim is gone; the reviewer then caught the first rewrite
   OVERSELLING on Windows/Catalyst (no push provider exists there) — the shipped copy is
   platform-scoped. 🟡 Damir owes a wording pass; the claim boundaries are in the
   launch-shell.js docblock.
4. **OURS-4 (privacy-policy.md §4.4) — UPDATED.** P1 (consent-gated init) recorded as
   shipped, the P2 opt-out paragraph added, both platform-scoped. The retention
   placeholder stays Damir's.

The diagnostics (paintdiag · landtabprobe · EXCERPTDIAG · the two PAINTDIAG stamps)
stay ARMED on purpose — Damir has not walked the measurement yet. Each is pinned as a
SET so half a removal fails the suite; all retire before handover with `maxLogCount`→1.

`ixian:call` being `Equals` (the only thing separating it from `ixian:callback`'s
start-only leg) is now PINNED in the suite (Session H ⑥ block).
