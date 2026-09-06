# Opus #46 verdict — Session Q (#804, the Account sublevels stop booting a WebView)

Run 2026-09-06, in the cloud container on a clean clone plus the session's uncommitted delta.
Three disjoint READ-ONLY auditors on Opus, then fixes, then a fresh break-my-verdict reviewer.

| auditor | scope |
|---|---|
| A | `src/shells/settings.html`, the settings components, `lock-shell.js/.css`, the BUILT shell — with the security reach of the `encpass` sublevel as its first question |
| B | the C# — `SettingsPage`, the three sublevel pages, `HomePage`, `SpixiContentPage`, the platform WebView handlers |
| C | the pins and the docs, against the rules #771 / #772 / #773 / #798 |

**The batch under review is three deleted tokens.** That is the point worth recording: a
three-token change still produced four MAJORs, and two of them were in pins that had already
passed twelve mutations of my own devising.

---

## MAJOR

### M-1 · PIN 2 was vacuous, and the mutation that proves it kills the whole batch (auditor C)

The pin located the caps DECLARATION (`string caps = "settingsApply,…`) and never the
`Utils.sendUiCommand(this, "setCaps", caps)` PUSH. Wrap that push in `if (paneMode) { … }`
and:

* every phone loses all three caps,
* all three Account rows revert to pushing a page — the exact defect the batch exists to remove,
* and **PIN 2, PIN 4 (which pushes its own caps string), the `#341` caps pin and the literal
  pin at `:12626` all stay GREEN.** The suite prints BASELINE OK over a dead feature.

**Fixed — in two rounds, because the FIRST repair also survived the auditor's mutation.**

Round 1 sliced the pin to `onLoad`'s own body and asserted the PUSH's POSITION: after the pane
block. Re-running the auditor's exact mutation killed nothing —
`if (paneMode) { Utils.sendUiCommand(…); }` is *also* after that block. **Position was never
the property.** Round 2 WALKS every `if (paneMode)` in the body, brace-matches each (including
a braceless one), and requires both the declaration and the push to be outside EVERY one. Then
the mutation kills it.

★ That is #798 twice inside one loop: the auditor's finding was that my pin came from my own
idea of how the feature could break, and my first repair came from the same place. The walk is
what closed it.

### M-2 · The block's error net could never fail (auditor C)

`refQ = navs.filter(e => /ReferenceError|is not defined/.test(e))` filtered a list populated by
`if (/navigation/i.test(...)) navs.push(...)`. The auditor ran jsdom 30.0.1 and showed the two
message shapes are disjoint. The pin was green against every possible mutation and its message
claimed a property it did not check (#772).

**Fixed.** Two lists: `navs` for blocked navigations (which PIN 4b reads as traffic), `errsQ`
for everything else the document throws.

### M-3 · "The pushed pages stay for exactly one caller" (auditor A, confirmed by C)

False, and this batch's own PIN 3b asserts the counter-example: `home.html`'s backup nudge
emits `ixian:backup` to HomePage's own branch, on every build and every form factor. A
maintainer reading that sentence deletes a live route.

**Fixed** in the shell, and the same claim was checked in every doc (the docs had it right).

### M-4 · "#797 closes that second leg for every branch by cancelling first" (auditor B)

**It does not.** `iOSWebViewHandler`'s catch logs `navigationAction.Request.Url` — the whole
`ixian:changepass:<old>--delim--<new>` URL — into `ixian.log`, which `DevPage` renders and
offers through the OS share sheet. Setting `e.Cancel = true` first stops the WebView LOADING
the URL; it does nothing about a managed exception unwinding into that catch. The only thing
that closes the log leg is the branch's own `try`. The sentence read as a licence to delete
that try as redundant — re-opening #341 MAJOR-1.

**Fixed**, and the password `Split` moved INSIDE the try on the SettingsPage leg while the file
was open. `EncryptionPassword.xaml.cs` states the two legs are kept in step; they were not.
A new pin asserts `try` before `Split` on both.

---

## Fixed, MINOR — real defects, newly reachable because a phone PARKS this document (#315)

| # | finding | source |
|---|---|---|
| m-1 | `exitSettings` released the password form but not the Downloads screen or the Chat-appearance engine. Until this batch it could not matter on a phone (Downloads was a separate PAGE); now parking the Account leaves a peer-supplied file list and an armed 80 ms settle timer in a live DOM, and a late `addFile` burst repaints an invisible screen | A |
| m-2 | A rebuild mid-validation — `onRepresented` fires on every return from a peer tab — discarded a REJECTED password **in silence**. The user came back to three blank fields and no explanation, indistinguishable from "nothing happened" | A |
| m-3 | The Downloads delete-confirm mounts on `document.body`, so a rebuild replaced the list under a live "Delete this file?" | A |
| m-4 | `case 'downloads'` did not release the previous screen before building a new one, unlike the `chatappearance` and `encpass` cases | A |
| m-5 | PIN 1's gate was `>= 15` while every doc described "a walk over all 18 shells" — three shells of slack | C |
| m-6 | PIN 3a/3b/3c and PIN 4b(ii) read RAW without declaring it; 3b's shell half was unanchored over a 6 000-line document; 4b(ii)'s slice spans the encpass docblock, which writes `ixian:changepass:` in prose | C |
| m-7 | PIN 4c's message overstated it twice: navigations were sampled BEFORE the back leg, and `renderLayout` re-mounts the hub UNDER the leaving screen, so `firstElementChild` was the hub the instant back was pressed | C |
| m-8 | PIN 2's and PIN 6's messages each enumerated something the assertion did not cover (#772) | C |
| m-9 | The stripCode justification in PIN 1 and in the rebased `#341` pin stated a FALSE fact about this tree — the shell's comments would not have defeated a raw read. The policy stays; the claim was wrong, in the docblock whose subject is #771 | C |
| m-10 | "The same profile scrolling 50 conversations read 4.09 %" — the 12.19 % rung was the EMPTY account, which has no chats; 4.09 % belongs to the heavy seed, where it pairs with 21.66 % at one temperature. That pairing is the whole reason the control survives the thermal confound | C |
| m-11 | The `CHAT_SPARE_ENABLED` docblock still instructed the next perf session to "point this same pre-warm at those three shells" — about 45 MB of resident WebView for surfaces a current shell cannot reach — and its `SettingsPage:383/489/501` citation had rotted, *by this batch* | B |
| m-12 | `EncryptionPassword` was justified in a comment by a HomePage branch that has no emitter at all | B |
| m-13 | The security comment claimed "the shell scrubs it on every leave path" without saying that the C#-side belt (page disposal + `closeSublevelOverlays`) is GONE on the phone route | B |
| m-14 | Eleven stale comments across the shell, the components, `lock-shell.css`, `SpixiContentPage` and `HomePage` — several written BY this batch (#772) | A + B |
| m-15 | `BackupPage.xaml.cs:144` → `:153`, in two files, on the load-bearing citation for the #341 MAJOR-2 argument | B |
| m-16 | The handoff claimed four Session P docs had been archived; they had not | C |
| m-17 | The checklist omitted `strip-release --check` and `smoke-packaged`, which the handoff claimed had run | C |

★ **And two of the suite's OWN #341 pins went red at the fixes, correctly.** Both asserted
their property by CHARACTER DISTANCE (`{0,600}`, `{0,900}`) and this batch's comments are
longer than that. Rewritten as slice-scoped property pins. **#771 in a new costume: a distance
pin over raw text is defeated by prose.** One of the rewrites was itself wrong on the first run
— its end anchor searched from position 0 and found an earlier `encpassCtrl = null;` inside
`releaseEncpass`, so the slice came out backwards and the pin reported 0 toasts against correct
code. Caught by running it.

---

## The one finding that changed a DECISION rather than a line

**Desktop is not unchanged** (auditor A MAJOR-1, auditor C m-17b). `railPane` requires a WIDE
window, so a WinUI or Mac window below the pane breakpoint runs with `data-desktop` set and no
`data-pane` — it pushed the three pages too, and now renders them inline.

Rendered before deciding (`docs/sheets/session-q/inline-encpass-narrow-desktop.png`): the
Account's own rail stays beside a centred, capped form, which is the grammar About and
How-to-use already use there, and it removes a WebView boot on the desktop as well. **Kept as
an intended second-order win, the claim corrected everywhere, and the walk gained rows
C3b/C3c so it is TESTED rather than assumed.**

---

## Found, NOT fixed — and why

| finding | why not |
|---|---|
| ★ **`HttpUtility.UrlDecode` form-decodes the wallet password**, so a literal `+` becomes a space before `writeWallet` and before `Preferences["walletpass"]`. Self-consistent in the app; **`ixian:backupWallet` then shares a `wallet.ixi` whose real password is not the one the user typed** | INHERITED — both hosts have always done it, so by the handover gate's own rule it goes to the BE engineer untouched. And the naive fix is worse than the defect: users who already set a `+` password have a wallet encrypted with the transformed string, and tightening the decode locks exactly them out forever. Escalated as **security-review MAJOR #8**, with the migration shape and the on-device test it needs |
| `HttpUtility.UrlDecode(e.Url)` runs one statement BEFORE `e.Cancel = true`, in all 19 handlers | Pre-existing and app-wide; `UrlDecode` does not throw on malformed input, so it is unreachable today. Touching 19 files is not this batch |
| `HomePage`'s `requestSettingsOverlayExit` justifies a branch with `reloadAllPages`, which has no callers | Pre-existing, inert, outside this delta |
| The scrub runs BEFORE the 220 ms exit slide, so on a phone the password fields visibly blank as the screen slides away | Deliberate. A scrub is not delayed for aesthetics. Recorded as a dial |
| `settings.html` publishes no `--kb-inset`, so the encpass fields get no visualViewport lift | NOT a regression: `settings_encryption.html` does not publish it either, so mobile keyboard behaviour is at parity with the page it replaces |
| `ixian:loadDownloads` is emitted once per RENDER while Downloads is current, so a warm re-present costs a full list traversal | Correct behaviour (the list must be re-read), and cheap. Recorded so nobody reads it as once-per-open |

---

## Verdict

**PASS after the fixes.** Closing numbers, the pin count and the mutation results are in
`docs/handoff-2026-09-06b.md`.

★ The rule this loop paid for, again, is #798 — and it paid at the level of the pins rather
than the code. Twelve mutations of my own devising all killed their targets. The three
mutations that mattered were the ones I had not thought of, and an auditor named each of them
in one line.
