# #46 loop verdict — batch #517–#519 (wallet scroll · sounds · press feedback)

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.**
Builder: Fable. Auditors and reviewers: Opus models. Three rounds. **CLEAN.**
Written 2026-08-23. The batch in this filename is #517–#519 (#459 ① — never a bare date).

## The shape

Round 1: four disjoint read-only auditors (A wallet scroll · B pressable JS · C press
CSS+tokens · D C# sounds) → each finding verified against the tree → one fix pass →
round 2: two FRESH break-my-verdict reviewers over the fixes → a second fix pass →
round 3: one FRESH verifier over the round-2 fixes → two prescribed one-line
corrections, applied and mutation-proven. The builder reviewed none of his own work.

## The score

| Round | Found | Class |
|---|---|---|
| r1 | **4 MAJOR** + 12 MINOR + NITs | audit of the build |
| r2 | **3 MAJOR-class** (2 fix-created + 1 vacuous pin) + 5 MINOR | break the fixes |
| r3 | 0 new code defects · 2 blockers (1 overclaim ×4 places, 1 pin gap) | verify the fixes |

**32 planted mutations across the rounds; every one caught.**

## Round 1 — the four MAJORs

| # | Finding | Fix |
|---|---|---|
| A-1 | The reserve landed full-size at t=0 while the viewport animated 300 ms → a scroll BULGE a fling entered (blank space, clamp-back stall) | The reserve starts at 0; a ResizeObserver on the HERO tracks `min(target, expandedRest − liveHeight)` frame by frame |
| A-2/A-4 | A compact hero at top 0 had no exit (actions inert), and the full-delta reserve put ~a hero of blank under every compact list | Attach and stable zero-delta top events expand; the reserve is DEFICIT-SIZED: `clamp(0, top − maxPre + delta, delta)` |
| B-1 | The 5c-i re-arm guard poisoned `gestureViaTouch` on pointer-first engines — a PRIOR loop's fix silently undone; the ghost guard disarmed | The guard takes only the pointer stream (`!e.touches`) and corrects the identity before returning |
| C-1 | `--surface-press-row` was byte-identical to `--surface-card` → **1.000:1 press on every card-hosted family**, touch-only, desktop-invisible | Alpha washes (5% / 10% hover-step), one perceptual level on EVERY ground — measured 1.107–1.135 |
| D-1/D-2 | The sound belt covered 2 of 6 audio sources while promising one-round triage; 3 of 5 re-introduction mutations stayed green | Four VoIP tone lines + the notification-lane line + [NOTIFDIAG] cross-reference; property pins (ONE `playEffect` caller tree-wide, ONE `SSounds` calling file, no tx asset under the csproj glob) |

## Round 2 — the fixes ate their own tails (the #500 shape, twice)

| # | Finding | Fix |
|---|---|---|
| W-MAJOR-1 | The collapse-time measurement probe forces one real compact-hero LAYOUT with no reserve under it — Blink clamps scrollTop during the probe, and the deficit was computed from the destroyed position. On the 5-transaction account the first collapse stranded a compact hero | maxPre/top read BEFORE the probe; the probe gets a reserve FLOOR (`cached delta ‖ clientHeight ‖ 300`) for its synchronous microseconds |
| W-MAJOR-2 | The deficit made a ZERO reserve legitimate — and the RO belt read zero as "never applied" and slammed the full delta onto every long list on the first re-render (r1 MAJOR-4 restored by its own fix) | The belt keys on the measured-while-hidden SENTINEL `heroExpandedRest === 0`, never on the reserve value |
| P-MAJOR-1 | My r2 rebase of the ghost-order pin went VACUOUS — the widened lazy window swallowed the ghost return; the defect it guards could return with the suite green (mutation-proven) | Re-anchored on index arithmetic over the onDown body |
| P-MINOR-2 | The `hadAfterlife` instant re-paint re-opened the scroll trail on the just-tapped row for ~650 ms (the fade phase) | `hadLiveFill`: instant only in the FILL phase; a fade-phase re-press waits the ordinary window |
| minors | expand/collapse reset the gesture accumulators (one pixel after a valve expand re-collapsed); the hero RO refuses hidden measurements; the valve re-checks itself at rest-guard expiry; reduced-motion tint steps to 10%; honest belt claims (`attempt`, both grep prefixes); factory derivation matches calls, not comments | all landed |

## Round 3 — verification

All six round-2 code fixes **CONFIRMED-CLOSED** with layout walks and mutation runs.
Two blockers, both prescribed exactly and applied:
1. The probe acceptance arithmetic was wrong in four places. The honest form:
   **`range == max(top_at_collapse, maxPre − delta)`** after a collapse settles;
   `pad == 0` on a long list; the invariant is **`range ≥ top` in every sample**.
2. The W-MAJOR-1 order pin did not anchor the `top` read — moving it below the probe
   reintroduced the defect with the suite green. `iTop` is now anchored between
   `iMax` and `iFloor`, mutation-proven.

## Accepted residuals (recorded, not hidden)

* Stale expanded-rest: a hero whose expanded height changes while compact →
  worst case a benign spontaneous expand. Never a stuck state, never an oscillation.
* A fade-phase re-press waits ≤70 ms on a still-bright hold frame — the comments'
  "already-dim" is generous; the trade is deliberate and recorded.
* The re-attach adoption rule can adopt a reserve larger than the current delta if
  the hero shrank between sessions — bounded, r1 shape, pre-existing.
* `#136 · M5 · B3` remain the only known pre-existers. Smoke: **2766 pass / 3 KNOWN.**

## The gates at close

bundle 275 exports · 18 shells · smoke **BASELINE OK 2766 / 3 KNOWN** ·
cs-syntax 142 + 1 known gap · verify-locales ALL CLEAN · pattern triangles 224×193.988.
