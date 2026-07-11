# Handoff — after Batch A (#256/#257 + Opus loop #258) → fable Batch B

## Where we are

| | |
|---|---|
| **Just finished** | Missing-bits **Batch A** (calls · unread divider · languages) + the **Opus #46 loop** over it (#258) — **CLEAN** |
| **Uncommitted** | Batch A source + the loop's fixes. Regenerated artifacts (bundle/shells/locales) still need Damir's local run |
| **Next build session** | **Batch B** (2 of 4) — `docs/fable-build-brief-missing-bits-batch-b.md` (**read its new §0 first**) |
| **Batches left** | B (pattern default · tx-details shell · splash boot) → C (overlay grammar, add-app/add-contact panes) → D (create group — deferred to the wallet pass) |

## Damir's local run (order matters — the new preflight enforces bundle-before-shells)

```
node scripts/extract-strings.mjs      # expect +languagePending, 0 conflicts
node scripts/build-locales.mjs
node scripts/build-strings-iife.mjs
node scripts/build-demo-bundle.mjs    # call-ui.js + callbar.js changed
node scripts/build-shells.mjs         # preflight runs here — fails loud on a stale bundle
node scripts/i18n-lint.mjs && node scripts/pseudo-locale-smoke.mjs && node scripts/smoke-test.mjs
```

Then **F5 net10.0-windows** (not Rebuild):

- ring a 2nd device → overlay on the chats list **and** at chat open · **answer on one surface → the other surface's ring disappears when the bar lands**
- dialing bar shows no timer → flips to ticking on answer → hang-up clears it
- unread divider: appears once on an unread open, gone next open, **never over a message you watched arrive** (incl. after a bot channel switch)
- Settings → Deutsch: shell copy translates, **8** locales offered
- an it-it / ja-jp device: its language shows as a **non-actionable "translation pending" row**, not an empty picker

Commit Batch A + the loop as **ONE** batch. Hygiene (#255): `git status` for CRLF-only churn (12 `.cs` files show modified; `git diff --ignore-cr-at-eol` = zero) · delete `src/components/.fuse_hidden0000001100000001`.

## Open Damir dials (answer at your F5 — none block Batch B)

1. **Unread divider = TEXT rows only.** C# pushes `read` on file/payment/app rows too, so an unread block containing **no text at all** gets **no divider whatsoever**. Fix = one shared `noteUnreadBoundary()` helper called from all four handlers (~6 lines). Your call — logged, not changed.
2. **The callbar overlays the topbar** (design intent) — it covers the chat **back button** for the call's duration. a11y verdict: occlusion, not a focus trap. Want a reserved row instead?
3. **No ring while the app is locked** (lock excluded by design; C# still consumes the ring into home's WebView under the lock) → a release-notes line.

## New BE rows from the loop (all in `docs/be-cutover-brief.md`)

- **C18b** — VoIP teardown has **no state guards**: `rejectCall` has no accepted-check (a stale ring's Decline **kills a live call**), `hangupCall` has no `hasSession` check. ★ Do it with C18.
- **C19** — an outgoing call started **from a chat** shows no call UI at all (bar goes to home). Rides C18(a) broadcast.
- **C20** — the 4-arg mini-app **session** request has no surface anywhere (legacy never rendered it either): drop the push, or spec a card.

## Contracts Batch B must honor (from #258)

- **Any new shell** (B3's `wallet_sent.html`) must spread `attachCallUi(...)` — C# pushes the five call globals as **bare page globals** and an undefined one throws before `executeUiCommand` can catch it.
- **`build-demo-bundle` before `build-shells`**, always. Never paper over a skew with a runtime `typeof` guard (ruled against).
- Never write a literal NUL into source — `String.fromCharCode(0)`.
