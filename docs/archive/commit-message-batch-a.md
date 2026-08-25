# Commit — Batch A + Opus loop (paste into GitHub Desktop)

## Title

```
Missing-bits batch A: live call UI, unread divider, real locales (+ Opus #46 loop)
```

## Description

```
Batch A (#256/#257, fable) + the Opus #46 audit+fix loop over it (#258). Zero C# change,
frozen bridge. Damir F5-tested; loop verdict CLEAN after 2 fix rounds.

CALLS (A1/A2) — the redesigned app had NO call UI: the shells never defined the push
globals, so addCallAppRequest/displayCallBar died on undefined identifiers. New
src/components/call-ui.js (attachCallUi → ring overlay + in-call bar + clear-grace +
arg-count collision guard) wired into 12 shells; call-overlay gains ignore:false
(Accept/Decline only, Esc/scrim disabled), callbar gains the dialing state.
Excluded by design: lock (privacy), scan (camera), launch (pre-account), empty_detail.

UNREAD DIVIDER (A3) — the 11-arg message push carries `read` and precedes C#'s read-flip,
so the chat-open burst is an exactly-once boundary; the shell's 6-param addThem was
discarding it. Divider is one-shot per peer, breaks bubble grouping, resets per peer and
per bot channel.

LANGUAGES (A4) — production was hard-wired to en-us in every locale: shells resolved
?lang= || 'en-us' and C# never appends a query. Now || '*SL{language-code}' (C#-substituted
per load; un-substituted marker falls back to en-us). extract-strings + i18n-lint now sweep
src/shells (shell-inline keys were never extractable), home.html's strings={} leak fixed,
5 fallback conflicts resolved at source, the 5 dictionary-less locales hidden from both
pickers, ~42 keys machine-drafted x7 locales.

OPUS LOOP (#258) — 3 disjoint auditors → 4 fix agents → a fresh break-my-verdict reviewer
→ CLEAN. 3 MAJORs found:
* a stale ring on a second surface can KILL a live call (VoIPManager.rejectCall has no
  accepted-guard; the answer pushes displayCallBar to stack-last only and sends no
  clearAppRequests). FE half landed: displayCallBar drops the local ring + latches the
  answered session. Residual is C# → be-cutover C18(a) + C18b(a).
* a stale callbar's Hang-up fires on a dead session (hangupCall has no hasSession guard)
  → C18b(b).
* an outgoing call started from a chat shows no call UI at all (the bar goes to home)
  → C19.
Also landed: a no-op addAppRequest in attachCallUi (C# pushes it as a bare page global into
all 12 shells; an undefined global throws BEFORE native.js can catch it) · an answered-session
latch · caller re-resolve on a same-session re-push · .c-callbar__main is a focusable button
only when the return address actually exists (home passed onReturn unconditionally while C#
sends no address → home shipped a dead screen-reader-announced button) · the divider now
derives on loadPhase && bursting (loadPhase alone stayed true for 5s on the channel-switch
path and could latch a LIVE message as unread) + per-channel reset + delete re-anchor · an
i18n regression: App.xaml.cs persists the OS culture on first run, so it/ja/id/lt users land
on a HIDDEN locale with an empty picker and any tap silently moved them off their language →
a non-actionable "translation pending" row in both pickers; launch.html never passed the
active language into the launch shell at all.

BUILD — build-shells.mjs gains a fail-loud preflight asserting every shell-destructured
symbol exists in the bundle it inlines (the skew that blanked home.html on F5: a stale
bundle → attachCallUi undefined → dead pane). Bundle BEFORE shells, enforced. NUL-gate hint
corrected; +14 smoke assertions for the call UI.

Docs: DECISIONS #256/#257/#258 · opus-review-brief-missing-bits-a.md (verdict) ·
be-cutover-brief (C18b/C19/C20) · i18n-wiring-spec · polish-roadmap · handoff-batch-b.md.

Chat isolation (#221), the frozen bridge, and the money path are untouched.
```
