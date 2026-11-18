# P66 · PO-5: ONE FILE-CHECK PASS PER ROW, THE 1:1 AVATAR AND TWO PREFERENCES READ ONCE PER LOAD (batch photo1a)

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| LOW (fewer reads; the arguments to the shell are byte-identical) | no | none | `SpixiFlags.PhotoFewerFileChecks` (pref `flagPhotoFewerFileChecks`) | 3 min |

**Look here first:** `PhotoOpenRules.cs` (`fileSizeArgOnce`, `localArgOnce`, `LoadOnce`, `recheckFileRows`), `SharedItems.localArgOf(fm, out pathCase, out path)` (the new overload; the old signature unchanged), and in SCP `fileSizeArgOnce`, `RowCache` / `beginRowCache`, `fileDeleteGen` / `noteFileDeleted`, the two-branch `fLocal` / `fSize` statements of `insertMessage`.

**DECISIONS:** #1641 · this batch #1716.

## What and why
- One `localPathOf` per file row: the size argument uses the path the local check already resolved.
- The re-check after the pushes (#1202) runs only when an in-app delete notification moved a PROCESS-WIDE generation during the load (`refreshFileRow`, `refreshHeldFileRows`, `deleteMessage`, and `noteFileDeleted()` from the Downloads page delete, Settings' single download delete and "delete all downloads"). A file deleted OUTSIDE the app during a load is no longer re-checked: the base shows the same state for the same delete a few ms after its re-check (accepted, recorded).
- The 1:1 received rows' avatar (`getAvatarPath` → `imageToDataUri` → `avatarForRow`) once per load; `SChatPrefs.photoPreviews` and `SAutoDownload.loadPictures` once per load (both are read live again before their effect). `SPrivacyPrefs.readReceipts` stays a LIVE read per row (it sends `msgRead`; review round 1).
- OFF: the old statements in every branch.

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| A different argument reaches the shell | pure one-pass rules over a table of 336 row states equal the two-pass path | csh `po5_one_pass_equals_two_pass_over_the_state_table`, `po5_avatar_and_prefs_once_per_load_equal_per_row` |
| A stale "1" (file gone) after an in-app delete during a load | the process-wide generation (Interlocked / Volatile) | csh `recheck_rule_*`, `r1_delete_generation_is_process_wide` · pin a8 |
| The row cache leaks into a live insert | `[ThreadStatic]`, installed by a `using` around the batch row loop only, owner-checked | review round 1 C-open (held) · pin a7 |

## NOT proven
⚠ C# UNCOMPILED. Device: `[P1] chat read … ms=` and the equal `batch json=` lengths of builds A / B on the same chats (the operator block).
