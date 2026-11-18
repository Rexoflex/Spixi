# P68 · PO-6: A VOICE MESSAGE'S DURATION + 40 PEAKS ARE KEPT IN THE APP CACHE (batch photo1a) — DERIVED FILES AT REST

> **PARKED (2026-11-18, session photo1a):** not in `work/photo1a`. The code is `docs/parked/photo1a-po3-po6.patch`; its state and the open review findings are in `docs/parked/photo1a-po3-po6.md`. This packet describes the parked code.

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| LOW–MEDIUM (a few hundred bytes of derived numbers per voice row) | no | none: `voiceInfo(id, durMs, csv)` as before | `SpixiFlags.VoicePeaksStore` (pref `flagVoicePeaksStore`); Android only | 3 min |

**Look here first:** SCP `voiceInfoFor` and `enqueueVoiceInfo`; the store of P67 (kind `.v1`, payload = today's `"<durMs>|<csv>"`, ≤ 4096 bytes, the grammar `peaksCsvOf` emits).

**DECISIONS:** #1641 · this batch #1718.

- Same names, header, generations, deletes, sweep and bound as P67. The version of an inline voice row = `t|` + the text length + `|` + SHA-256 hex of the text; a voice file = path + size + write time.
- Memory: with the switch ON the peaks have their own LRU of 256 texts that every delete clears; OFF = the old 256-entry cache (whose key has no chat in it — legacy, unchanged).
- The open reads the kept peaks instead of the managed Opus decode (`VoiceClips.peaksCsvOf`).
- A pin ties the kind text to the hashes of the makers (`SThumbnail.makeJpeg` on Android, `peaksCsvOf`): Android keeps the cache over an app update, so a change of a maker must change the kind (pin b9).

## NOT proven
⚠ C# UNCOMPILED; no device number for the voice chat's cold open yet (Seed 55, index 54, in the operator block's index list).
