# Handoff — 2026-08-07 Cowork session (parallel to the plate build session)

**Scope:** Damir + Claude in a parallel Cowork session while the plate session builds
handoff-2026-08-07's batches. This session touched DOCS ONLY — zero code, zero shells,
zero C#. All changes are uncommitted in the tree (Damir commits via GitHub Desktop, #306).
Deliberately did NOT touch CLAUDE.md or DECISIONS.md to avoid a parallel-write collision
with the plate session — see "Decisions to log" below.

## Tree changes from this session (3 files, all docs)

1. **`docs/parity-a-f5-checklist.md`** — §A7 (long-message guard) ticked + VERIFIED
   2026-08-07: Damir confirmed the >64k paste guard works on device. Only the German-copy
   leg stays open, folded into the next locale pass. Do NOT re-test the guard.
2. **`docs/handoff-2026-08-07.md`** (the main handoff — edited in place):
   - "Still owed" list: A7 moved to DONE.
   - New row: **FIGMA MIRRORING RETIRED** (see decisions below).
   - Batch B row: dials now LOCKED + pointer to the new brief.
3. **`docs/fable-build-brief-parity-b.md`** — NEW, the parity batch B work order:
   B1 = R3 media cap flip (ALL platforms) · B2 = R4 backup nudge + ack-gated stamp
   (small-C#) + one-time burned-stamp clear · B3 = R7 share verb under the F3/#301+#303
   bare-address contract. **Sequencing rule inside: build batch B only AFTER the plate
   lands — same files (chat.html/home.html/HomePage/SettingsPage).**

## Decisions made this session (Damir, 2026-08-07) — LOG AS DECISIONS #314+ ROWS

The plate session owns DECISIONS.md appends; log these three at its next write:

- **FIGMA MIRRORING RETIRED — code-first, full stop.** tokens.css + components are the
  source of truth; the accumulated "Figma mirror queue" (#241/#244 primitives + link
  role · #70 list · #76 pattern ink · #227 type · #277 tx-row · reference components)
  is DROPPED. Never re-propose mirror batches; Figma stays as-is, reference only.
  (Supersedes every "⚠ MIRROR TO FIGMA" flag in earlier DECISIONS rows.)
- **R3 dial: gallery photo/GIF send = ALL platforms** (not iOS-only legacy parity).
- **R4 dial: ack-gated stamp** — move the `backupReminderTimestamp` write behind a real
  user acknowledgment (small-C#) + one-time clear of the burned stamp at fix commit.

## Verified facts this session (save the re-derivation)

- **#307–#313 IS committed** — `31003744` on the branch tip; the "commit owed to Damir"
  item from the session-close is done.
- A7 >64k paste guard: works (Damir on-device).
- R6 dial (full tx detail in sheet) was already locked in the main handoff — unchanged.

## Still owed / unchanged by this session

Everything else in `docs/handoff-2026-08-07.md` stands: the plate (both batches), W1
es/ru, A10 on Windows, desktop scan re-verify, Windows keyboard sanity, the 4 smoke
failures, B1/B2/B3 runsheet rows, probe retirement, iOS rows (42/45 docs from Damir ·
43 · 44-deferred · 41 · 18 · 32). Damir-side inputs still open: toast/CTA screenshots
(plate item 3), real Terms/Privacy texts.

## Gotcha for future Cowork (device-bridge) sessions

The bridge's stage cache served a STALE copy of an edited doc once today (old content
under fresh mtime/size metadata). Before editing a file that was recently written
through the bridge, verify on-disk state with `device_bash` (grep/wc the mounted repo
directly) rather than trusting a re-staged copy.
