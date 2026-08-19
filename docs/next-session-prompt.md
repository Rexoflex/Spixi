Read `docs/handoff-2026-08-19i.md` FIRST, then DECISIONS.md rows **#428–#440**. R3 is
COMMITTED (`0a50242a`) and **F5'd on Android** — the mechanism passed, the art was
deferred to a final polish round (#433). Smoke baseline is **2135 pass / the 4 known
pre-existers** (#136 · #149③ · M5 · B3). Shells: 18.

**THIS IS A BIG OVERNIGHT BATCH AND I AM ASLEEP. Every dial you need is already
answered below (#437). Do NOT stop to ask me anything.** If an item turns out to need
a decision I have not given, LOG IT with a DECISIONS row and MOVE ON to the next item —
do not stall the batch, and do not guess on a destructive path or on copy.

SETUP — get the code yourself, both repos clone anonymously:
git clone --branch redesign/frontend https://github.com/Rexoflex/Spixi.git
git clone https://github.com/ixian-platform/Ixian-Core.git   # SIBLING folder
npm install jsdom --no-save
⚠ **Ixian-Core is NOT read-only this time — see item 1.** `097341a` is still the
reference point. Verify before building: `Config.cs` reads `spixi-0.9.22`, smoke green
at **2135 / the same 4**. If it is not, say so and stop.

---

# THE BATCH, in priority order

Work top-down. If you run out of night, the tail is the part I lose least by losing.

## 1 — ★ REPLY-TO (M1), BUILT DARK BEHIND THE CAP. The headline item.

**Read `docs/reply-to-carrier-verification.md` and DECISIONS #430 AND #436 before
touching anything.** #430 concluded this was blocked on the BE engineer; **#436 corrects
that and is the operative row.**

Why it is buildable: **Ixian-Core is a SHARED PROJECT compiled into Spixi from source**
(`Spixi.csproj:292` imports `IXICore.projitems`; `SPIXI.sln` references `IXICore.shproj`),
so editing it needs no engineer. And the structured chat path already exists — Spixi
already RECEIVES `SpixiMessageCode.chatStream` at `StreamProcessor.cs:418`,
`Node.addMessageWithType:784` already takes a `ChatStreamMessage`, and
`CoreStreamProcessor.sendChatStreamMessage:2211` is written and unused. The only gap is
that `SingleChatPage:843` still sends via `sendChatMessage`, which serialises raw UTF-8.

**Build:**
* Append a reply-target id to `ChatStreamMessage` — **at the END of `getBytes`**, read
  back guarded so a short buffer is legal. Its constructor never asserts it consumed the
  buffer, so an old client ignores the trailing bytes and shows a plain message. **Keep
  it that way; do not add a length assertion.**
* Append a matching field to `FriendMessage` for persistence, under its existing
  `if (m.Position < m.Length)` tolerance — the same additive pattern `transactionId`,
  `reactions`, `sent`, `errorSending` and `sequence` each used.
* Move the chat send to `sendChatStreamMessage`. ⚠ This changes the message code on the
  wire for EVERY chat message, not just replies — so verify the receive path handles
  both codes identically first, and say so in the row.
* Wire the FE that #79/#25 already built: the quote in `createMessageBubble` (`reply:
  {sender, address, text, kind, thumb}`), `setComposerContext({kind:'reply'})`, and the
  menu action. `src/demo/chat.html` already does all three — **port from it**;
  `src/shells/chat.html:2092` is the branch marked "never reached in v1".
* **The `@`-mention half is FE-only and rides along**: replying inside a group prefills
  the mention.

⚠ **THE CAP STAYS OFF.** `bridge.cap('reply')` remains false, so nothing is user-visible.
That is the whole point — I flip it after a 2-device test. **Do not un-gate it**, and do
not "helpfully" default it on for the demo shell only to prove it works.
⚠ **Any C# change → wipe `Spixi\obj` and `Spixi\bin`** (#387). This item changes C#, so
the rest of the batch inherits that.

## 2 — ★ THE LOCK EXPOSES THE CHATS SCREEN BEFORE AUTH (#438). SECURITY-ADJACENT.

**If the night is short, this outranks everything below it.** Damir, 1:1 on Android:
with the Spixi lock ON, returning to the app paints the FULL CHATS LIST for about a
second, then flickers, then shows the lock, then the OS biometric prompt.

**Diagnosed — read #438 before building.** The COLD-START path is innocent
(`App.xaml.cs:206-213` makes `LockPage` the NavigationPage root). The defect is the
RESUME path, `App.xaml.cs:338-360`, which presents the lock with
`cur.pushModalLoaded(lockPage)` — ★ #229's **load-then-present**, staging the lock's
WebView hidden on the current page and pushing the modal only once `lock.html` signals
ready. #229 did that to kill the lock's own boot flicker. **The cost was never written
down: for the whole hidden boot, the page underneath is what is on screen — the user's
conversation list, rendered, before any authentication.** Android also snapshots the
visible window for the task switcher, so the exposure outlives the frame.

⚠ **Do NOT "fix" this by reverting to a plain modal push** — that re-opens the flicker
#229 removed and trades one defect for the other (#423: a fix is not smaller than the
thing it fixes). **The shape that gets both:** cover the content SYNCHRONOUSLY at resume
with an opaque brand-dark shield — the lock is fixed dark in both themes (N73/#203), so
the colour is already decided — then let the lock boot hidden behind that shield and
present. No content frame, no boot flicker.

⚠ Verify the shield covers the surface for EVERY resume shape, not just Chats: an open
conversation, a modal, the in-place lock host (#230), and a live call surface — #425(b)
is the precedent for a lock that was invisible to a sweep because it was presented in
place. And re-check the `isLockScreenActive` / 5-second-cooldown guards still behave.

★ **One discriminator for Damir's F5 checklist, not for you to resolve:** force-stop the
app and launch COLD. If the chats screen flashes there too, the cold path is implicated
and `MainPage` assignment is not doing what the code says — a different bug. Write it in.

## 3 — The banked bugs. All decided, all buildable.

| | Item | Decision (#437) |
|---|---|---|
| **#435a** | Add-contact shows a green "valid" tick AND a red error at once | **One line.** `contacts-shell.js:689` — `setError` must clear `valid` when `msg` is non-empty. It only clears on the next keystroke today |
| **#435b** | An address already in contacts is reported as maybe-invalid | Detect the duplicate **LOCALLY** before `ixian:request` is sent — the shell already holds the contacts list. Show a short line + a **View contact** button under the input. No toast, no error, no tick. Same reasoning as `looksLikeAddress` blocking garbage locally |
| **#434** | The "connected" chip never appears when YOU accept an incoming request | C#: the two LOCAL accept handlers (`HomePage.onAcceptRequest:3397`, `SingleChatPage.onAcceptFriendRequest:988`) write no chat message. Add the line at both. **Copy: ONE sentence in both directions — "You are now connected with {name}"** — replace `global-friend-request-accepted` everywhere rather than adding a second string. ⚠ New SL id ⇒ `extract-strings` AND the MANUAL table (#405) |
| **N43** | Search bars only when content overflows | **Damir's answer: ALWAYS visible**, chats + wallet + apps, including the apps EMPTY state. ★ This is also the whole of the "apps flicker" he reported — the bar disappearing and reappearing IS the flicker (#439d). One fix, not two; do not go looking for a D-17 regression |
| **N63** | The "Show older messages" pill is English in 7 older locales | Draft the missing values |
| **N70** | The update notice never appears if the app started OFFLINE | `UpdateVerify` runs at start only; re-check when connectivity arrives |
| **N80** | Rate-me should wait for the 5th app open | Decided #424. One new persisted counter; the gate lives in `home.html` |

## 4 — R7 wallet

* **N25** — TX details: collapse address / date / fee / txid under a **"See details"**
  chevron that expands below. (N31 is DEFERRED by Damir — do not build it.)

## 5 — ★ NEW FEATURE: the blockchain-scan PROGRESS BAR on the wallet screen (#440)

Damir asked for this and it is green-lit. **Read #440 before building — the investigation
is already done and every number exists in the build. No BE work.**

* **CURRENT** = `IxianHandler.getLastBlockHeight()` → Spixi's override at `Node.cs:599`
  returns `tiv.getLastBlockHeader().blockNum`, i.e. how far the header scan has reached.
* **TARGET** = `IxianHandler.getHighestKnownNetworkBlockHeight()` → Spixi does NOT
  override it, so Core's default runs (`IxianNode.cs:101`) →
  `CoreNetworkProtocol.determineHighestNetworkBlockNum():1062`, a middle-third majority
  over connected peers' reported heights, clamped by a time estimate from the last
  block's timestamp.
* **ORIGIN** = `CoreConfig.bakedBlockHeight` (`Node.cs:186`) — fresh accounts only.

Nothing in `Spixi/Pages/` reads block height today, so this is one C# push on the
existing update tick plus the FE bar.

⚠ **TWO TRAPS — both ship a bar that looks authoritative and is wrong:**
1. **Zero means UNKNOWN, not 0%.** `getLastBlockHeight()` is 0 before the first header
   lands; `determineHighestNetworkBlockNum()` is 0 with no peers. Dividing them gives a
   confident 0%. **Build an explicit indeterminate state** — it pairs with the N19
   connecting line, which is the same "we do not know yet" moment.
2. **Capture the ORIGIN at session start, not from the baked checkpoint.** A resumed run
   continues from stored headers nowhere near `bakedBlockHeight`; anchoring there makes
   every launch read ~4% when the client is current.

Also: TIV pulls headers **250 at a time** (`blockHeadersToRequestInChunk`), so the bar
steps rather than glides. That is fine — do not smooth it into a lie.

★ **DESIGN — Damir's explicit ask, treat it as a requirement, not a nicety.** Make it
BEAUTIFUL and make it belong: existing tokens only, no new raw colours, and respect the
wallet screen's visual hierarchy — the balance is the hero and this must not compete
with it. It sits on the wallet surface near the tx list, and it should DISAPPEAR
completely when the scan is current rather than sitting at 100%.

★ **COPY — it is NOT "syncing the blockchain".** TIV runs in `Minimal` mode and walks
block HEADERS against a cuckoo filter of the user's OWN addresses — it is looking for
THEIR transactions, not downloading a chain. "Syncing blockchain" oversells it and
invites "why is my phone downloading a blockchain". Draft honest copy in that spirit and
flag it for Damir's sign-off.

★ **It gives "Missing a transaction?" a real answer for the first time.** That sheet
currently says "recent transactions can take a moment to appear" because there was
nothing concrete to point at (`wallet-shell.js:536`). Rewrite it to reference the actual
scan state, and keep the Explorer action.

## 6 — Cheap V1.1, ONLY if the night holds

* **N42** — contact-list affordance in Account. Cheap either way.
* **Account screen clarity** (Damir V1): the address needs to say what it is for — an
  info button opening a sheet on mobile / dialog on desktop, "this is your address;
  others can scan it to add you or to send you IXI". ⚠ **Copy is mine — draft it, do
  not finalise it**, and flag it for my sign-off.

---

# DO-NOTs, so they are not re-derived at cost

1. **Do not flip `bridge.cap('reply')` on.** Carrier first, device second (#232/#215).
2. **Do not add a buffer-length assertion to `ChatStreamMessage`** — the trailing-byte
   tolerance IS the backward-compatibility story.
3. **Do not touch the tip/scroll jump.** CLOSED by Damir (#439b) — scrolled far up it does not move, so the only re-pin left is inside the normal near-bottom window. Not a bug.
4. **Do not re-open the R3 art** — canvas, hairline, pattern ladder, notice. All are
   deferred to a final polish round by Damir's call (#433) and the shipped state stands.
   The reversal hooks are deliberate; leave them.
5. **Do not build N31** (tipping also creating a payment bubble) — deferred.
6. **Do not build group rename / photo / add-members.** Table B q5 — verified NOT in
   Ixian-Core at `097341a`. It is a BE ask, not FE work.
7. **Do not touch N61.** Backups deliberately not carrying message history is a FEATURE
   (#439a), not a defect. The 🔴 is off.
8. **Do not hunt the desktop Share button or a D-17 flicker regression.** Neither is a
   bug (#439c/d) — the flicker IS the disappearing search bar, closed by item 3's N43.

# STANDING RULES this project keeps re-earning

* **★ SOURCE-READING GATES CANNOT SEE A THROW, AND THEY CANNOT SEE A CASCADE.** R3
  shipped two defects that read perfectly: a `var()` that did not exist killed a whole
  gradient, and a low-specificity rule silently lost to four rules below it. **Both were
  found only by RENDERING.** If a change can break a boot, a push, a cascade or a
  multi-step sequence, RUN it. `smoke-test.mjs` has a destructure gate, a jsdom boot gate
  and an end-to-end picker sequence for exactly this. Do not weaken them.
* **★ A PIN THAT PASSES VACUOUSLY IS WORSE THAN NONE.** jsdom's cssstyle **drops a
  `border-bottom` shorthand containing `var()`** — R3 hit this and had to pin light by
  source order instead. Do not assume computed-style assertions behave the same for
  shorthand and longhand.
* **★ MUTATE BEFORE BELIEVING.** Batch the mutations into one or two runs and confirm the
  expected pins go red. Match on the CALL, not on a token appearing nearby — a proximity
  regex is satisfied by a comment (#421 caught three of exactly that shape).
* **A FIX IS NOT SMALLER THAN THE THING IT FIXES** (#423) — a repair regressed a passed
  round, and a comment cleanup silently reverted a migration.
* **★ TRANSLATIONS ARE PART OF THE BUILD, NOT A FOLLOW-UP — Damir's explicit ask this
  batch.** Every NEW string and every CHANGED string gets a real value in **all 13
  locales**, not just an English draft sitting in the generated files. `build-locales`
  emits DRAFTS; a draft is not a translation. Do the language pass properly, the way
  #361 did (report what you changed and why for anything non-obvious). This batch adds
  strings in at least three places — the connected chip (#434), the duplicate-contact
  affordance (#435b) and the whole scan-progress surface (#440).
* A fallback edit is not a copy change until `extract-strings` has run — and for
  `strings[o.key]` tables not until the MANUAL table changes too. Both i18n gates compare
  locales against EACH OTHER, so a key missing from all of them is perfectly "consistent".
* Verify at source (#215) · never build past a missing repro (#294) · **bundle BEFORE
  shells** · DECISIONS rows at decision time · the security gate while building · smoke as
  bookends · `git --no-optional-locks` always · **#387 wipe `obj`/`bin` on any C# change**.

# SECURITY GATE — required this batch, not optional

Item 1 adds a **peer-controlled reference** to the message body path, item 2 is itself a
pre-auth content exposure, and item 3 adds a new local-detection branch to add-contact. Walk the gate WHILE building: does a hostile
reply id reach a sink · is it length-clamped · does an unknown target id fail soft (the
quote must degrade to nothing, never to a broken render or a throw) · does anything new
land in a `spixi.*` storage key. The worklist already classes a peer-controlled body
marker as the same hostile-parsing family as N18 — treat it that way.

# ★ WORK IN THE CLOUD, AND TELL ME WHEN I CAN SHUT THE COMPUTER DOWN

**Everything in this batch is built in YOUR OWN CLONE, in the cloud** — clone, edit,
pipeline, smoke, all of it. My machine is not needed for any of that work.

**The moment you have (a) cloned both repos, (b) confirmed `Config.cs` reads
`spixi-0.9.22`, and (c) confirmed smoke is green at 2135 / the same 4 — SEND ME ONE
SHORT MESSAGE SAYING I CAN TURN THE COMPUTER OFF.** Say it plainly and early, e.g.
*"Setup verified, smoke 2135 — you can shut down now."* Do not make me sit through the
batch waiting to find out. If the setup check FAILS, say that instead and stop.

Then work the whole batch to completion without me.

**When you finish:** deliver every changed file with **SendUserFile** — that reaches me
whether or not my machine is on. ALSO attempt to write them to my disk via the device
bridge. **If my computer is off the bridge will fail, and that is EXPECTED** — say so in
one line and leave the files in the conversation for the morning. Do NOT retry the
bridge in a loop, and do NOT hold the batch open waiting for me to come back.

# DELIVERY — how I work, follow it

* I run everything on Windows, in PowerShell, and I will read this in the morning.
* **Land everything on my disk via the bridge and leave it UNCOMMITTED**, with a full
  green pipeline in your session: extract-strings → build-locales → build-strings-iife →
  build-demo-bundle → build-shells → i18n-lint → pseudo-locale-smoke → smoke.
* Write me a **handoff** and an **F5 checklist** for the batch, and update the worklist.
* Then give me ONE step at a time and WAIT. Do not stack a command and a prerequisite in
  the same message.
* **NO PARENTHESES in a pasted block** — PowerShell reads them as an unclosed expression,
  swallows every following line and dies having run nothing. Put expectations in a table
  outside the block.
* Tell me what number to expect from each step. A stale build and a real bug look
  identical — give me the discriminator.
* ⚠ **Reply-to needs a 2-DEVICE test and I only F5 one phone at a time.** Write that
  checklist so I can run it across two devices in one sitting, and put the SENDER
  re-opening its own reply in it — that is exactly how C8 died on hardware (#215).

# STILL UNVERIFIED, do not assume

**iOS and Windows are untested for five batches.** The Android in-call strip has never
been exercised — it needs a real two-device call. The connecting line from R3 is
device-verified; the R3 palette is device-verified and deferred.

Deploy — Android: `dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release`
**then** `-t:Run` as a second command (a wipe makes `-t:Run` fail alone, #320).
adb: `"C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe"`
Dev mode on the phone: 10 taps on the "Chats" title.
