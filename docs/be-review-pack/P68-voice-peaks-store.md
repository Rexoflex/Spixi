# P68 · PO-6: A VOICE MESSAGE'S DURATION + 40 PEAKS ARE KEPT IN THE APP CACHE (batch photo1a) — DERIVED FILES AT REST

> **IN THE BRANCH (2026-11-18, #1728).** Resumed with P67 (same store, same fix rounds 2 and 3, same Fable 5.2 readers; store round 7 CLEAN). The packet was moved back from `docs/parked/`.

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| LOW–MEDIUM (a few hundred bytes of derived numbers per voice row) | no | none: `voiceInfo(id, durMs, csv)` as before | `SpixiFlags.VoicePeaksStore` (pref `flagVoicePeaksStore`, absent = ON; a stored 0 acts only in dev mode); Android only | 3 min |

**Look here first:** SCP `voiceInfoFor` and `enqueueVoiceInfo`; the store of P67 (kind `.v1`, payload = today's `"<durMs>|<csv>"`, ≤ 4096 bytes, the grammar `peaksCsvOf` emits); `ChatMediaStore.ifCurrentPeaks` (`ChatMediaStore.cs:217`).

**DECISIONS:** #1641 · this batch #1718, #1728.

- Same names, header, generations, deletes, sweep, bound, links rule and `entriesOf` as P67 (read its "Fix rounds 2 and 3" and "Recorded limits" tables; they apply to the `.v1` files too). The version of an inline voice row = `t|` + the text length + `|` + SHA-256 hex of the text; a voice file = path + size + write time.
- Memory: with the switch ON the peaks have their own LRU of 256 texts that every delete clears and that takes a put only through `ifCurrentPeaks` (a dead message name is refused, pin b13); OFF = the old 256-entry cache (whose key has no chat in it — legacy, unchanged).
- The open reads the kept peaks instead of the managed Opus decode (`VoiceClips.peaksCsvOf`).
- A pin ties the kind text to the hashes of the makers (`SThumbnail.makeJpeg` on Android, `peaksCsvOf`): Android keeps the cache over an app update, so a change of a maker must change the kind (pin b9).
- Recorded for the waveform kind in particular (m-A, P67): a coarse waveform of the last contact's chat can stay while the contact list stays empty across a restart.

## NOT proven
⚠ C# UNCOMPILED; no device number for the voice chat's cold open yet (Seed 55, index 54, in the operator block's index list).
