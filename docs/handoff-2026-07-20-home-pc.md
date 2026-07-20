# HANDOFF 2026-07-20 → home PC (test + close the bug-fix batch)

**Phase:** still **B — platform bring-up**, gated on the RocksDB nupkg
(`docs/handoff-post-freeze.md` §1B rules + `docs/mac-bringup-log.md`). This session was a
sanctioned phase-A-style side-batch: **6 bugs from Damir's Windows testing**, fixed
source-side via the Mac clone. The VM used mid-day was a TEMP work area — treat any
VM-side commits/artifacts as disposable; never push from it.

## State at write time

- **Committed + pushed earlier today (Mac):** #273 Requests-filter phantoms ("Contact
  Accepted" → new `request-done` excerpt kind) + #274 Account-pane Language fixes
  (inline picker sheet-cap dropped · `spixi.settings.view` stash/restore across the C#
  language reload). Source-only — generated artifacts NOT rebuilt (no Node on the Mac).
- **UNCOMMITTED in the Mac tree = the commit this handoff rides in:**
  - **#275** composer lock widened to ANY non-approved 1:1 (`SingleChatPage.xaml.cs`,
    C#-only — legacy states composed + fake-delivered messages, the ⑪ class).
  - **#276** #211 truncation canon swept over wallet + contacts (`contacts-shell.js` ·
    `home.html` addPaymentActivity · `wallet_sent.html` buildTx).
  - **#277** tx-row title = chat-row type parity (`txlist-item.css`; amount keeps its
    emphasis — Damir dial). ⚠ Figma mirror queue: tx-row text style.
  - **#278** "Missing a transaction?" pill collapses by MEASUREMENT (ResizeObserver →
    `data-compact` ⓘ-only) — the 360px viewport query can't see a narrow desktop PANE.
  - smoke **+10 assertions** (#273–#278) · DECISIONS #273–#278 · CLAUDE.md rows · this
    handoff · consumed handoffs/briefs archived.

## Home PC — do in this order

1. **Pull** (GitHub Desktop fine).
2. **Frontend build — ORDER MATTERS, bundle BEFORE shells** (the #258 preflight fails
   loudly if swapped):
   `node scripts/build-demo-bundle.mjs` → `node scripts/build-shells.mjs` →
   `node scripts/smoke-test.mjs` (jsdom once: `npm i --no-save jsdom`).
3. **Build net10.0-windows in VS — F5, never Rebuild Solution.** CLI equivalent needs the
   FULL TFM: `dotnet build Spixi/Spixi.csproj -f net10.0-windows10.0.19041.0`
   (bare `net10.0-windows` → NETSDK1135, platform version defaults to 7.0).
4. **F5 checklist** (below).
5. **Commit the regenerated artifacts** (`src/demo/spixi.iife.js` + changed
   `Spixi/Resources/Raw/html/*`) as `rebuild generated artifacts (#273–#278)` — repo
   back to pull-and-F5 clean.
6. **OWED:** a separate Opus #46 audit loop over #273–#278 (protocol per #46/#250: 3
   disjoint read-only auditors → fixes → fresh break-my-verdict re-review). Write the
   brief after F5 passes; highest-risk rows = #275 (state-relative C# condition, legacy
   FriendState values unverifiable from the tree — #215 class) and #274 (localStorage
   handshake across the C# reload).

## F5 checklist

| # | Check |
|---|---|
| #273 | Requests chip counts ONLY real pendings; "Contact Accepted" rows keep the user-plus glyph but leave the filter; "Request sent" rows stay (genuinely unapproved) |
| #274 | Account → Language: full list, scrolls to the bottom · pick Deutsch → pane returns ON the Language picker, check moved, UI translated. **VM test said NOT fixed (suspect stale artifacts)** — if still broken on THIS build: F12 → `document.documentElement.outerHTML.includes('VIEW_RESUME_KEY')` → report true/false + which symptom (cutoff vs reset-to-empty) |
| #275 | Open a "Request sent" row → composer HIDDEN, "Waiting for {name}…" strip + Cancel request; typing impossible; accept from the peer → unlocks live |
| #276 | Contacts directory + picker: nameless/echo rows title as `3kdpCjkX8…ATtYNf` style · wallet rows + tx-detail "Sent to" truncated · full address only on the copyable field rows |
| #277 | Wallet row titles read the same size/weight as chat-list names; amounts still emphasized |
| #278 | Default pane: pill fits or shows as ⓘ (tooltip on hover) · drag the divider: narrow → ⓘ, wide → full label, never clipped |

## Gotchas carried forward

- Delete `_to_delete/` + `_to_delete_index.lock*` at the repo root BEFORE committing
  (session sandbox can't delete files; contains moved-aside git locks + restage copies).
- AI-session note (this Mac): `device_bash` git commands leave a stray `.git/index.lock`
  — run with `GIT_OPTIONAL_LOCKS=0`; the uploads mount serves STALE copies when
  re-staging the SAME path — stage via a fresh filename (#175 class, new variant).
- VM quirks seen (for the record, if it's ever reused): node not on PATH after winget
  install (new terminal needed) · `npm.ps1` blocked by execution policy (`npm.cmd` or
  `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`) · the NETSDK1135 bare-TFM trap.
- **nupkg watch:** when `RocksDB.0.0.42.nupkg` arrives → `local-nuget/`, commit; the
  android/ios NU1603 warning must DISAPPEAR. Then Android bring-up per the archived
  `docs/archive/handoff-2026-07-20-pc-next.md` steps 3–6 (still valid) + iOS Simulator
  on the Mac; Mac also still owes: Node LTS install → full generator run → clean-tree
  check · Safari pass over `src/demo/*.html`.

## After this batch — where the remaining work lives

- **Gated (do not start without the named gate):** wallet-send LAST (#232; FE prereq =
  the #255 roster filter) · reply-to (BE names the protocol carrier first) · #234
  resume-lock Cancel bypass (human BE sign-off; security-review §1a) — the archived
  `fable-build-brief-desktop-pass.md` had these as its only open units.
- **BE cutover backlog:** `docs/be-cutover-brief.md` (+ `docs/security-review-for-be-engineer.md`
  first) — a 2026-07-20 chat triage grouped the OPEN rows into ~4–5 days of small
  self-serve C#: trivial-verbs batch (C9 · W1 · W7a · W9 · S6 · S7 · S9 · S13 · L1 · L5 ·
  L7 · CO3 · CO4 · A4 · A5b) → chat contracts (C1 · C2 · C16 · C21b · C22 · GJ1) →
  contacts/roster (CO1 · CO5 · C17 · CI2) → persistence (CH3 · CH4) → launch hardening
  (L2 · L3 · L6). Decisions to collect from Damir in parallel: C3 · C10 · C20 · CO2 ·
  CI4 · S11. Pure-FE leftovers: Q1 · Q2 · CI5 · M17 pass · M13 per-locale --todo lists.
- **Polish/quirks state:** `docs/polish-roadmap.md` (note: its M11/Q14 rows are stale —
  S8 landed #264; Q14 likely fixed by #264's lock-scroll, verify once).
