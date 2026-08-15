# HANDOFF — post-freeze (read this FIRST)

**Written:** 2026-07-12, at the `audit-baseline` tag.
**Status:** the frontend redesign is **FROZEN and committed**. Damir is running full
desktop testing against the test scenarios; Android likely next; then the BE engineer.

This doc is the pickup for whatever session comes next. It replaces the old
build-brief/review-brief pickups — those are all consumed (see §6).

---

## 1. ★ The first thing to establish: which phase is this?

The project just changed shape. For ~270 decisions it was **build FE → audit → F5 →
commit**. It is not that anymore. Ask Damir which of these he's in, and behave
accordingly:

| Phase | What the session is for | What it must NOT do |
|---|---|---|
| **A. Desktop test findings** | Fix bugs he hits against the test scenarios. Small, surgical, zero-C# by default. | Don't start new features. Don't refactor. |
| **B. Android / iOS bring-up** | Platform bugs. Expect structural ones (see §4). | Don't "clean up while you're in there" — a refactor mid-platform-bringup makes every bug ambiguous. |
| **C. BE cutover** | Work the `be-cutover-brief.md` rows WITH the BE engineer. Lots of built-but-gated features light up here. | Don't build C# for the risky-parts rows without his sign-off (CLAUDE.md standing rule). |
| **D. Refactor / sweep** | Only after A–C. **Prerequisite: behavioural shell test coverage** (see §5). | Don't sweep `chat.html`/`home.html` behind a grep-only safety net. |

**The refactor was explicitly deferred** (Damir + Claude, 2026-07-12). Reasoning: it's
zero user value, it makes platform bugs ambiguous, and the smoke suite cannot currently
protect the files a sweep would target. If a future session is tempted to "tidy things
up first" — don't, without re-litigating this with Damir.

---

## 2. What's in the freeze

`git tag audit-baseline` = the whole redesign, Windows-verified, all four quirks-final
batches (#266–#270) plus both Opus #46 audit loops (#271 Q1/Q2/Q3, #272 Q4).

Shipped and wired to the **real C# bridge**, frozen protocol, 17 shells: chat · chats
list · wallet · apps · settings/account · contacts · scan · lock · launch (×5) · tx
detail · empty pane · **call**. Desktop pass done (rail, panes, dividers, chat-info,
Account-as-peer-pane). i18n live. a11y swept.

**Last batch's headline (#272), because it's the least device-verified thing in the
repo:** calls now present on ONE native surface (`CallPage` + `src/shells/call.html`).
The audit found that its modal fallback sat **above the lock screen** — caller identity
+ Accept/Decline on a locked device, and a remote hang-up could **pop the lock itself**.
★ **The lock and the call surface are now mutually exclusive and the lock wins.** A call
arriving while locked rings audibly but shows no UI; the ring returns within one UI tick
of the unlock.

---

## 3. Watch items during testing (things most likely to be wrong)

1. **★ Lock ↔ call, BOTH orders.** Least device-verified. If the log ever prints
   `"Call surface: another modal is on top — refusing to pop it"` → the mutual-exclusion
   invariant has a hole. That's a tripwire, treat it as a MAJOR.
2. **★ ZIndex vs Children order (#272, on-device gate).** MAUI honouring
   `VisualElement.ZIndex` in a Grid is the ONLY thing keeping the lock above an in-place
   call stage, and the call stage above a later-staged overlay. If a platform falls back
   to insertion order, an overlay staged after a live ring **covers it** → an
   unanswerable call. **Fallback is specified, not implemented:**
   `grid.Children.Remove(callStage); grid.Children.Add(callStage);` at the end of
   `presentPreload`'s overlay branch.
3. **2-device contact-request flow** (#266/#271). Two real bugs lived here: Accept left
   the request pane armed (one tap on the still-live Decline **deleted the contact you'd
   just accepted**), and accepting from the chats-list card left the conversation's
   composer hidden forever when the peer was offline.
4. **The #215-class premise nothing can prove from the tree:** `friend.approved ⇒
   friend.state == FriendState.Approved`. `Friend`/`FriendState` are **Ixian-Core**,
   outside this repo. The whole request-flow unlock chain reads `state`. **F5 gate:**
   accept an incoming request in-chat → back out → RE-OPEN → composer must be live with
   no request pane. If it isn't, the coupling is false and C# needs an explicit unlock push.
5. **Real device-language pick** (not `?lang=`): copy translated **and** dates/clocks
   localized (that second half was broken in every locale until #271).

---

## 4. Platform bring-up — what to expect

**Nothing has ever run outside Windows.** That is the single biggest unknown left.

- **Android:** likely mostly fine (`file:///android_asset/` + `AllowFileAccess*`).
- **iOS / WKWebView:** the real risk. Its strict `file://` directory sandbox is *why*
  **X1** (C# pushes avatars/app-icons as `data:` URIs instead of paths) exists at all —
  X1 is already landed and its whole payoff is iOS. Expect more of that class.
- Small-ICU WebViews would silently keep English date formats even with the correct
  `lang` — check one date separator per locale.

---

## 5. If/when the refactor happens: the prerequisite

The smoke suite (~370 assertions) is **mostly static source greps plus jsdom component
tests**. The shells — `chat.html` and `home.html`, the two biggest files and exactly what
a sweep would target — **are not jsdom-loaded at all.** Their only coverage is "does this
regex appear in the source."

Two live proofs that this is a real weakness, both from the last session:
- A **stale grep** (M5) was what caught a cross-batch collision — by accident.
- Q1's re-based decline assertions targeted the **wrong (demo) button** and would have
  failed the build.

**So: behavioural shell coverage is the prerequisite for a refactor, not a nice-to-have.**
It's also worth building even if the sweep never happens.

Also still true: **the sandbox mount truncates large files** (#175) — `chat.html`/
`home.html` are exactly the files it corrupts. Use the file tools (Read/Grep/Edit), never
bash/node, to read or verify code. Generators + smoke are Damir's local run.

---

## 6. Doc map (post-freeze)

| Doc | Use |
|---|---|
| `CLAUDE.md` | Orientation + ground rules + status. **Read before anything.** |
| `DECISIONS.md` | The log. #266–#272 are the freeze batch. Read before changing anything. |
| **`docs/be-cutover-brief.md`** | **The BE work order.** ~40 rows (C · CH · W · S · A · L · X · CI · GJ). Many features are BUILT and gated OFF waiting on these. |
| **`docs/security-review-for-be-engineer.md`** | **Walk the BE engineer through this FIRST.** Five open items incl. the resume-lock Cancel bypass (#234), the link-confirm spoof (C15), the mini-app localStorage partition (MAJOR #4), and the new call/lock findings (MAJOR #5). Several need his *decision*, not our code. |
| `docs/opus-review-brief-quirks-final.md` | The four Q1–Q4 verdicts + evidence tables + the audit inventory (21 items). Consumed — archive when convenient. |
| `SECURITY.md` | The invariants every surface must preserve. ★ #1 (surface isolation) is paramount. |
| `docs/polish-roadmap.md` | Remaining polish items, owner + state per item. |

**Housekeeping owed (cosmetic):** consumed briefs (`fable-build-brief-quirks-final.md`,
`opus-review-brief-quirks-final.md`, the missing-bits briefs) can move to `docs/archive/`.
Stale `src/strings/draft/*.todo.json` can go once the translations are reviewed.

---

## 7. Known gotchas that will bite a new session

- **Build order is load-bearing in two fail-loud places:** `build-strings-iife` AND
  `build-demo-bundle` must BOTH precede `build-shells`. Full sequence:
  `extract-strings` → `build-locales` → `build-strings-iife` → `build-demo-bundle` →
  `build-shells` → `i18n-lint` + `pseudo-locale-smoke` + `smoke-test`.
- **F5, never Rebuild Solution** — Rebuild trips pre-existing Android RocksDbSharp errors.
- **`git` is not on Damir's PATH** (he uses GitHub Desktop). Don't hand him `git` commands
  without saying so; `del` + GitHub Desktop staging is the equivalent of `git rm`.
- **Never commit stale built artifacts** — the launch shells under
  `Spixi/Resources/Raw/html/` have historically carried NUL debris (#255). The rebuild
  regenerates them.
- **#215 lesson, the expensive one:** a store holding SYSTEM keys does not prove USER
  writes are key-agnostic (that's how C8 got built and reverted). **Anything that can't
  be verified from this tree gets flagged 🟡 and F5'd BEFORE it gets built.**

---

## 8. The plan, in order

1. **Desktop testing** against the test scenarios (Damir, in progress).
2. **Android**, then **iOS** — independent of everything else, and where the ugly
   surprises live.
3. **BE cutover** with the engineer. Highest *user-visible* value left: a dozen features
   are already built and sitting behind capability flags.
4. **Then** refactor — coverage first (§5).

Wallet **send** stays LAST by standing decision (W5/W6 + the #255 unfiltered-roster fix
are prerequisites, then flip `composeSend`). Reply-to is BE-blocked (no protocol carrier —
the "it's easy" claim died in the tree, #215).
