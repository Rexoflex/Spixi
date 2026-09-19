# Diagnostic — the three Z-walk findings (Session AA, 2026-09-18)

**Nothing here needs a build.** Every line named below already exists in the shipped code. One log
capture per finding settles which mechanism is in play, and each finding's fix is different enough
that guessing would cost a build and a two-device walk.

Damir's answers this session: ① and ② were seen on **Android**; ③ was blind on **both** devices and
showed **nothing at all** (no ring, no in-call strip).

---

## Read this first — what Session AA ruled out AT SOURCE

Do not re-derive these. They were checked in the tree, not recalled.

| Ruled out | Why, in the code |
|---|---|
| ③ is the #888 flag-font line | `installFlagFont()` opens with `if (flagGlyphAvailable() \|\| probeState !== 'no') return Promise.resolve(false);` (`flags.js:222`). A phone answers the canvas probe **'yes'**, so on Android the call is a no-op that touches nothing. It cannot make an Android device blind. #891 proposed a one-line revert of that call as the cheapest test — **it is not cheap and not a test**, because it cannot explain the half of the report that matters. |
| ③ is a boot failure of `call.html` | The built shell was booted in jsdom with the suite's own harness: no errors, `setCallUi` is a reachable global, `installFlagFont` present and correctly refusing. A throw in that script tag could not reach the main script anyway — they are separate `<script>` elements (10 in the built shell). |
| ③ is the shell never signalling ready | `CallPage` stages at `Opacity = 0` and arms `Task.Delay(1500).ContinueWith(_ => revealSurface(owner))` (`CallPage.xaml.cs:493`). A silent shell still reveals after 1.5 s. |
| ③ is a Session Z colour regression | `callbar.css` and `call-overlay.css` were **not touched** by Session Z, and neither reads `neutral-500/600` (the two primitives #884 ② moved). |
| ③'s window is Session Z at all | AND-45's walk marked **A.11 P** on Android the same morning, with the call surface visible. Verified in `docs/archive/f5-checklist-and-45.md:55`, not taken from a handoff. |

So the source window for ③ is genuinely narrow, and nothing inside it explains a **both-sides** blind.
That is itself the most useful fact: **a call that shows no UI on either side is also what a call that
never connected looks like.** The capture below separates the two before anyone edits.

---

## ③ · No call UI on either side

### Capture
1. Both devices awake and unlocked, app in the foreground, one conversation open on neither.
2. Place the call. Let it ring for ~10 s. Hang up.
3. Pull `ixian.log` from **both** devices (Account → Dev → send log). `maxLogCount` is 5, so the
   failing run survives a restart.

### Decision table — search the CALLEE's log first

| Line found | What it means | Next step |
|---|---|---|
| `SND call-tone: ringing` | The call reached the app and the session was created. The failure is the **surface**, not delivery. Go to the table below. | surface |
| `SND call-tone: SUPPRESSED, the app lock is up and no call UI can be shown (#272)` | `App.isAppLockActive` was true. ⚠ This gate suppresses only the **sound** by design — but the same flag is what #272 made mutually exclusive with the call surface, and #272 recorded a latch hazard where `isLockScreenActive` stays set with no lock on screen. #505's `sweepStrandedCover()` logs exactly that. | read the lock lines around it |
| `SND call-tone: SUPPRESSED, the contact is muted` | Working as designed (per-contact mute). Not a defect. | none |
| **none of the above** | The call never reached the callee. This is **not a UI finding** — it is delivery (VoIP/network/session), and the whole "which shell changed" line of inquiry is the wrong tree. | VoIP, not the shell |

### If the session existed, the surface lines say which branch ran

| Line | Meaning |
|---|---|
| `Call surface: REFUSED, a lock is up or staging — modalOverlay=… lockStaging=…` | **The most likely reading, and the reason this line was added this session.** `lockUp()` refused the surface. Its test is `hasModalOverlay() \|\| isLockStaging() \|\| ModalStack/NavigationStack is LockPage` (`CallPage.xaml.cs:383-407`) — **not** `App.isAppLockActive`, which is what the ring gate uses, so the two can disagree. Both flags `False` in the line = the nav-stack test matched. A **stranded lock** is exactly what #505's `sweepStrandedCover()` exists to heal, and in that state the callee rings while neither device shows anything. |
| `Call surface: host covered/unavailable — bar not presented.` | A legacy page (money flow, scan, mini-app) covered the host, so the bar was deliberately not presented. Documented dial, not a bug — but tells you what was on screen. |
| `Call surface staging failed: …` | The stage threw while being added to the host grid. The exception text names it. |
| `Call surface modal fallback failed: …` | The modal fallback threw. |
| `lockUp: …` | ⚠ **Not the exclusion firing.** This string exists only in a `catch` (`CallPage.xaml.cs:405`) — the `ModalStack` test threw and the check failed CLOSED. Rare; if you see it, the exception text is the finding. |
| **none, and `SND call-tone: ringing` is present** | The session existed and no branch refused — the surface was staged and revealed and still showed nothing. That is a new mechanism; capture a screen recording with it. |

⚠ **The first row did not exist before this session.** That branch returned `null` in silence while the
other three named themselves, so a reader scanning the log found three reasons, saw none of them, and
concluded the refusal never ran — past the lock the table had flagged two rows earlier. One
`Logging.info`, no behaviour change. It is the only C# in this batch, and it is why the build is needed.

**On the CALLER's log**, `SND call-tone: dialing` (`VoIPManager.cs:107`) is emitted beside
`broadcastCallBar` (`:101`). Present but no bar on screen = the surface; absent = the call was never
initiated.

---

## ①/② · Contact details → Message, and a shared-group row, both return to the contact list

Both verbs end in the same two statements — `popPageAsync()` and then `HomePage.onChat(...)`:

* `ContactDetails.xaml.cs:629` — `ixian:chat`
* `ContactDetails.xaml.cs:524` — `ixian:openChat:<addr>`

⚠ **Read `:629` carefully before concluding anything: its FIRST arm is pop-with-no-open, which is the
reported symptom exactly.** `if (customChatBtn) { popPageAsync(); e.Cancel = true; return; }` — that is
correct behaviour on the arm it serves (you came from a chat's header, so "Message" returns you to the
chat underneath), and only the `else` at `:641-642` runs `onChat`. `customChatBtn` is `false` on the
directory arm (`HomePage.xaml.cs:1011`, `openContactDetails(friend, false, false)`) and `true` only on
the chat-header arm (`:1598`), so it does **not** explain a directory-arm report — but it does mean the
same visible symptom has two different causes depending on where you opened the screen from. **Note
which entry point you used when you capture.**

**The pop is what Damir sees. The open is what did not happen.** `popPageAsync` closes *its own*
overlay (`overlayStack.Find(o => o.target == this)`, `SpixiContentPage.cs:4523-4536`), so it cannot
be eating the conversation by accident — that theory is out.

That leaves `HomePage.onChat` (`HomePage.xaml.cs:2404`), which has **three** silent exits — the third is
`friend == null` at `:2407-2415` (an address `FriendList` does not resolve), which returns with no log at
all. Rule it out first: if the contact is in the list, it is not this one.

| Log line | Mechanism | Fix shape |
|---|---|---|
| `Chat page for {0} already open.` (`:2421`, a `Logging.warn`) | `Utils.getChatPage(friend)` matched a page that is **not on screen**. `getChatPages()` (plural) carries an explicit spare belt (`friend != null`); `getChatPage` (singular) does **not** — it matches on `page.friend == friend`, so a #800 pre-warm spare that still holds an attached friend, or a page mid-pop, satisfies it. | a page must count only if it is attached **and** presented — the test the #800 loop already wrote for the spare. ⚠ **NOT** "give the singular the plural's belt": the plural's belt is `friend != null`, and a blank spare already has `friend == null`, so `null == friend` is false and adding it changes nothing for this symptom. The stale case is a spare that has been ATTACHED, or a page mid-pop |
| **absent** | The spare push was refused or presented under the overlay that was closing. The `[CDPERF] chat attach spare=0 why=<word>` stamp names the refusal. | read the refusal word first |

### Capture
On the Android device: open a contact from the **directory**, tap **Message**, then pull the log.
Repeat from a chat's ⓘ. Note for each whether the line above appears — that single line picks the
column, and the two fixes are not interchangeable.

⚠ Session Y walked **Message on the directory arm** green (#878). Establish which device that walk
was on before calling this a Session Z regression; it may be a latent #800 defect that simply had
not been hit yet.

---

## Why no fix shipped in Session AA

Rule #215 and rule #294: the mechanism is named, the instrument exists, and the evidence costs one
log capture. Building the wrong one of two fixes costs a build plus a two-device walk, and ③'s most
likely reading — on the evidence available — is not a shell defect at all.
