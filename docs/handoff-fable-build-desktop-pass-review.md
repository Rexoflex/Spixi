# Fable build handoff — Opus review of Desktop Pass #236–#238 (DECISIONS #239)

> Opus reviewed #236–#238 → **PASS, 0 MAJOR**. 3 mechanical fixes landed this
> session (source only, NOT built). Your job: build + smoke + F5 the 2 user-facing
> fixes, then commit everything (#236–#238 + the review fixes) together.

## FIRST ACTION — build sequence (unchanged from #236–#238)

```
node scripts/build-demo-bundle.mjs     # message-bubble.js changed → bundle
node scripts/build-shells.mjs          # settings.html changed → shells
node scripts/smoke-test.mjs            # exit-124 = known contacts-timer tail, not a failure
```

(No new locale/strings build step needed — `copyFailed` ships as an inline
fallback; fold it into `en-us.js` at the next `extract-strings` run, not now.)

## What changed in the review session (3 fixes)

| # | File | Change | Build touch |
|---|---|---|---|
| 1 | `src/components/message-bubble.js` | `displayUrl` — host longer than 64 chars now MIDDLE-truncates the host (`slice(0,MAX-25)+'…'+slice(-24)`) so the registrable domain stays visible; was end-truncating it off (`paypal.com.<pad>.evil.com` → `paypal.com.…`). Spoof-adjacent label fix. | **bundle** |
| 2 | `src/shells/settings.html` | `shareAddress` — guards `navigator.clipboard` existence, falls back to `execCommand('copy')`, shows an `error` toast if all fail (was a silent catch when clipboard undefined). New `execCopy` helper. New string `copyFailed` (inline fallback). | **shells** |
| 3 | `src/components/message-bubble.js` | stale `displayUrl` comment corrected (cosmetic). | bundle |

## F5 checklist (the 2 visible fixes)

1. **Long-host link label** — send/receive a message with a URL whose host is
   >64 chars (e.g. `https://paypal.com.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.evil.com/`).
   The bubble label must show the REAL trailing domain (`…evil.com`), not lead with
   `paypal.com.…` with the true domain elided.
2. **Account → Share address with clipboard unavailable** — the row must still copy
   (execCommand path) and show a "Copied" toast, or an error toast if everything
   fails — never a silent dead end. On WinUI it should just copy + toast normally.

Nothing else in the batch changed behavior; #236–#238 are still awaiting your build
(they were uncommitted). Build once, F5 the whole desktop pass, commit together.

## Logged for LATER (do NOT act on now — DECISIONS #239, tracked)

- Desktop Chat-appearance "Background pattern" preview shows a pattern the desktop
  chat suppresses (#207) → misleading on desktop. Dial: suppress preview `::before`
  under `data-desktop`, or add an "applies on mobile" note. 🟡 Damir art-direction.
- `0.36` dark-pattern ratio = magic literal (chat.html boot + comments); re-dialing
  #76 = manual recompute. Maintenance flag.
- IDN homograph shows as-typed on the short honest path vs punycode on rebuild (NIT,
  confirm-modal gated).
- Legit >4096-char message with a link → link renders as plain text (defensible DoS
  trade). Only revisit if Spixi ships >4KB messages.
- `desktop.html`'s own `.dt-rail` CSS duplicates the `--rail` component variant →
  adopt `createBottomNav({variant:'rail'})` at the desktop repoint.
- Pre-existing BE gaps (NOT regressions): **S6** dirtyLock canceled-auth · **S11**
  landtab pop race · **CH4** pin-entry prune for C#-removed contacts.

## Next build unit after commit

Per fable-build-brief §4a (Damir OK'd): Account-as-pane (C#, #225 column host) +
settings master-detail in-pane (FE) + un-gate Contributors + D1 native resizable
divider → then unit 6 / M2 / reply-to / wallet-send-last.
