# P75 · CHAT SHELL: FEWER WAVEFORM WRITES IN A VOICE ROW (PO-6, shell half) (batch photo1b)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| NONE (style writes) | no | none (one new cap word `voiceWaveLite`) | built behind its own switch `VoiceWaveLite` (cap absent = the old writes) | 2 min |

**Look here first:** `src/components/message-bubble.js` `paintVoice` (`voiceWaveMemo`); `src/shells/chat.html` the
voice row's `lite` option.

## What changed and why
- Every paint wrote `--voice-h` and `data-played` on all 40 bars, also for a flat placeholder (no peaks yet). With the
  cap: a placeholder writes nothing (an unwritten bar reads `var(--voice-h, 0)`, the same flat height); a repaint writes
  only the bars that changed; a played tick only the bars between the old and the new count.
- **Not built:** the waveform as ONE element instead of 40 bars. One element cannot paint the per-bar heights, the
  round tips, the gap rhythm and the played / unplayed split the same, and the pins of S7 / S7b / S8p / S17 hold the
  40 bars. Measured: the open's cost is the 800 span creations, not the writes (a cloned 40-span fragment gave no gain).

## Proof
pin `scripts/pins-photo1b/f-voice.mjs` (no write for a placeholder; only changed bars; playing at 50 % marks exactly the
first 20 bars; cap off = today's writes) · walk row "a voice row plays and shows its progress".
