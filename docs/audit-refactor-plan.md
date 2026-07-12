# Full code audit + refactor — plan & work order

> **Owner:** Damir. **Status:** NOT STARTED — do not begin until the current batch
> (#259–#265) is F5-green and **committed**. Refactoring on top of an uncommitted,
> untested batch makes every regression ambiguous.
>
> **Shape:** research → approve → characterize → refactor ONE issue at a time.
> Claude does the research and the breakdown. **No refactoring until Damir says so.**

---

## 0. Preconditions (Damir, before phase 1)

- [ ] Current batch F5-tested and **committed**; working tree clean.
- [ ] **Tag the baseline:** `git tag audit-baseline` — every "did behavior change?"
      question is answered against this tag.
- [ ] Record the baseline artifacts (the audit will script this): bundle byte-size +
      hash, each built shell's hash, full `smoke-test` output, `git rev-parse HEAD`.

---

## 1. Phase 1 — ARCHITECTURE MAP (deliverable, no changes)

**Output:** `docs/audit/architecture-map.md`

- How the pieces fit: `src/components` → `src/bridge` → `src/shells` → generators →
  `Resources/Raw/html` → the C# pages → Ixian-Core. One diagram + one narrative.
- The **data flow** in both directions: a push (`sendUiCommand` → `executeUiCommand` →
  a shell handler → a component) and a verb (`bridge.send` → `onNavigating` → C#).
- The **13 shells**, what each owns, what it deliberately does NOT own.
- The **generators** (bundle / shells / icons / locales / pattern) and their contracts
  (build order, fail-loud gates, why they exist).
- **Where the seams are:** what is genuinely coupled vs what merely looks coupled.
- Where the map DISAGREES with `ARCHITECTURE.md` / `DECISIONS.md` — the docs are the
  intent; the code is the truth. List every divergence.

★ **Damir reads and approves this before phase 2.** If the map surprises him, the
inventory's priorities change.

---

## 2. Phase 2 — SECURITY VERIFICATION (deliverable, no changes)

**Output:** `docs/audit/security-verification.md`

Verify — with file:line evidence, not assertion — that the invariants actually hold in
the code as it stands today:

- **★ Chat isolation (#221 / SECURITY.md §1):** chat and every untrusted-content
  surface lives in its OWN WebView; no shared JS/DOM context; cross-pane coordination
  is C#-only. Prove it: enumerate every cross-surface channel that exists (localStorage
  handshakes, C# routers) and show each is safe.
- **Money path:** the WebView composes, C# signs. No signing/keys/seed cross the bridge.
  Every money-adjacent verb enumerated with its C# handler.
- **Mini-app containment:** what a third-party mini-app WebView can reach (`file://`
  storage partition, bare page globals, `onNavigatingGlobal` verbs). The `#265`
  `acceptsCallPushes` gate is one instance — is the general class closed?
- **C# risk fence (CLAUDE.md):** no WebView-supplied path/filename reaches a filesystem
  op; no password-over-URL widening; no auto-fetch of remote resources without the
  media gate.
- **Untrusted input rendering:** every place counterpart-controlled text reaches the
  DOM — `textContent` only, no `innerHTML`.
- The **standing open items** (Downloads traversal · mini-app storage partition · #234
  resume-lock Cancel · C15 link-confirm spoof): still open? still correctly scoped?

---

## 3. Phase 3 — INVENTORY (deliverable, no changes)

**Output:** `docs/audit/refactor-inventory.md` — one table, every finding.

Categories:
- **Duplicated logic** — the same rule implemented more than once.
- **Dead code** — unreferenced exports, retired handlers, stale gates, orphaned CSS.
- **Performance** — re-render storms, unbounded growth, O(n²), needless full rebuilds.
- **Overly complex modules** — files/functions that are hard to reason about; state
  machines that grew organically.
- **Convention drift** — the same thing done three ways.

Each row: **ID · category · what · where (file:line) · why it matters · impact
(HIGH/MED/LOW) · effort (S/M/L) · risk of fixing · behavior-preserving? (Y/N)**.

★ **Two rules for this phase:**
1. **Distinguish ACCIDENTAL from ARCHITECTURAL duplication.** Per-shell repetition is
   often *required* by the isolation wall — DRY-ing across shells would breach it. Any
   finding that proposes sharing code across the chat wall is **rejected by definition**;
   say so explicitly rather than listing it.
2. **A "KEEP" verdict is a valid finding.** Deliberate mess, documented, stays.

**C# is in scope.** The heaviest machinery (SpixiContentPage overlay/preload/nav, VoIP,
HomePage) is C#-side; an FE-only audit would miss the real risk.

---

## 4. Phase 4 — PRIORITIZE (deliverable, no changes)

**Output:** appended to the inventory.

- Ranked list by **impact × (1/effort)**, with the reasoning stated.
- **A stop rule, agreed with Damir:** which findings are PRE-1.0, which are POST-LAUNCH,
  which are **ACCEPTED DEBT — never**. Refactor work expands to fill available time;
  decide the boundary before starting, not during.

---

## 5. Phase 5 — CHARACTERIZATION TESTS (build BEFORE any refactor)

**Output:** scripts Damir can run himself; committed; green on the baseline.

The existing `smoke-test.mjs` (~360 assertions) is the floor, not the net. Add:

1. **Bridge-transcript harness** (the highest-value net). For a set of scripted user
   journeys (open a chat, send a message, delete the tail, tap a tx, ring a call,
   create a group…), record:
   - every `ixian:` verb the shell emits, **in order, with exact payloads**
   - every push the shell handles, and the resulting DOM shape (a stable digest)
   Store as golden files. **A refactor must not change the transcript.**
2. **Render-golden tests:** a stable serialization (tag/class/aria/text) of each
   component in every state, per theme. Diffable.
3. **Artifact digests:** bundle export map (names + count), each shell's inlined symbol
   set, generator outputs' hashes.
4. **A single runner** — `node scripts/audit-baseline.mjs --record | --verify` — so
   Damir can run it before and after and diff it himself.

★ The tests must be **green on the baseline tag** before a single line is refactored.
A characterization test that doesn't pass on the current code is describing a bug, not
a baseline — file it as a finding.

---

## 6. Phase 6 — REFACTOR (one issue at a time, on Damir's word)

Per issue, in this order:
1. State the issue, the plan, and **why the change is better** (not "cleaner" — what
   concretely improves: fewer places to make the same bug, less state, faster path).
2. State the **tradeoffs** honestly, and what gets *worse*.
3. Make the change. **Behavior-preserving by default**; any intended behavior change is
   flagged and needs Damir's sign-off first.
4. Re-run the characterization suite → **identical output**. Any diff = explain or revert.
5. Report: what changed, what the tests prove, what they *don't* prove, and which
   additional tests would be worth adding.
6. **★ #46 loop applies:** every refactor batch gets an independent adversarial review
   (a fresh reviewer that did not make the change) before it's considered done.

**Non-negotiables — a refactor that touches these is wrong by construction:**
- ★ the chat isolation wall (#221) · the money path (WebView composes, C# signs)
- the frozen bridge grammar (verb names/payloads; a "cleanup" that renames a verb is a
  break) · the `*SL{}` carrier convention (#248: markers open+close on one line)
- the localStorage key contracts shared between shells (`spixi.draft.*`, `spixi.exdel.*`,
  `spixi.pins`, `spixi.landtab`, …) · the generator fail-loud gates
- the build order: **bundle → shells → smoke**

---

## 7. Deliverables checklist

- [ ] `docs/audit/architecture-map.md` (phase 1) — **Damir approves before phase 2**
- [ ] `docs/audit/security-verification.md` (phase 2)
- [ ] `docs/audit/refactor-inventory.md` (phases 3+4, with priorities + stop rule)
- [ ] `scripts/audit-baseline.mjs` + golden files (phase 5), green on `audit-baseline`
- [ ] Per-refactor: a DECISIONS row, a review pass, an unchanged transcript
