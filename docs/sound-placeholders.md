# The four in-app effect sounds

★ **Chosen 2026-08-25 from [UI SFX](https://uisfx.com/) — the `mechanical` pack.** These REPLACED
the synthesized PLACEHOLDER tones generated earlier the same day; the placeholders are kept
only as `docs/sound-placeholders-gen.py`, which regenerates them if a comparison is ever
wanted.

## Licence — clean for shipping

| | |
|---|---|
| Audio | **CC0 1.0 Universal** (public domain dedication) — `LICENSE-AUDIO` in the package: *"You may copy, modify, distribute, and use these files, including commercially, without asking permission. Attribution is appreciated but not required."* |
| Package code | MIT — not used. **Only the audio files are taken**; `uisfx` is not a dependency of this app |
| Source | `npm view uisfx` · `github.com/romainsimon/uisfx` · v0.4.0, 936 sounds across 12 packs |

⚠ Nothing from the package is imported or bundled. Four files were copied out, gain-adjusted
and committed. There is no new dependency and no new licence obligation.

🟡 **Open question for Damir:** attribution is not required, but the app HAS a Contributors
screen (`createSettingsContributors`). A one-line credit to UI SFX would be the decent
answer. Not added unilaterally.

## What each one is

| File | Cue taken | The library's own definition | Length |
|---|---|---|---|
| `message_sent.mp3` | `mechanical/send` | *"A message or object leaves the user"* | 0.37 s |
| `message_received.mp3` | `mechanical/receive` | *"A response or object arrives"* | 0.39 s |
| `tx_sent.mp3` | `mechanical/purchase` | *"A paid transaction or value exchange completes"* | 0.50 s |
| `tx_received.mp3` | `mechanical/reward` | *"The user receives a small unit of value"* | 0.47 s |

★ The mapping is semantic, not guessed — the library ships 78 named UI cues and four of them
describe exactly these four events.

## Why the `mechanical` pack — and why the desk got this wrong

★ **Damir picked this on the device, over a `zen` set chosen by measurement here.** His
words: *"mechanical is a better fit, more gentle than zen."* Recorded because the
measurement and the pick disagree, and the measurement was the thing at fault.

The desk model was "darkest is calmest", and by spectral centroid `zen` wins easily:

| | centroid | length | still ringing after 80 ms |
|---|---|---|---|
| `zen` message received | 830 Hz | 0.41 s | **64 %** |
| `mechanical` message received | 1926 Hz | 0.36 s | 68 % |
| `zen` payment received | 1106 Hz | 0.50 s | **75 %** |
| `mechanical` payment received | 2391 Hz | 0.42 s | **4 %** |

`mechanical` is BRIGHTER on every cue and it still reads gentler, because centroid
measures how bright a sound is and not **how long it asks for your attention**. `zen` is
*"pure tones, dry wood, brief washi"* — tones SUSTAIN, and a tone you can still hear after
80 ms is one you notice. `mechanical` is *"switches, relays, firm detents"* — a transient
is over before you attend to it. It is also the shortest set of all twelve (0.32–0.45 s at
source), which for a sound that fires on every message is the property that matters.

★ **This is #433's lesson again, in audio.** There the contrast ratios were right and
insufficient — they predicted separation and not whether a surface read as premium, and
Damir's phone disagreed with the desk. Same shape here: the numbers were right about
brightness and silent about attention. Treat a measurement as a hypothesis and the device
as the test.

Rejected on register: `arcade`, `sci-fi`, `cinematic`. Rejected on LENGTH: `dreamy`,
`glass`, `soft`, `organic` at 0.78–1.12 s. `zen` and `minimal` are the close alternatives.

## What was done to the files

Gain-adjusted to a **−12.0 dBFS** peak, two passes so the MP3 re-encode does not overshoot,
then re-encoded mono / 44.1 kHz / 96 kbps. Nothing else — no trimming, no EQ.

★ Why −12: the four CALL sounds beside them (`default_ringtone`, `dialing_tone`, `busy_tone`,
`error_tone`) are much louder, and an effect that competes with a ringtone is the first thing
a user turns off. The library ships these at about −8 with a per-cue `defaultVolume` of ~0.2
expected to be applied at playback — but `SPlatformUtils.playEffect` plays at full volume, so
the attenuation has to be baked in.

## Replacing them

Drop new files over these, **keeping the same four names**, and nothing else changes:
`SSounds` addresses them by path (`Spixi/Meta/SSounds.cs`), the csproj glob
(`MauiAsset Include="Resources\Raw\**"`) picks them up by folder, and no code moves.

Two things worth matching so the set still behaves as one: keep the peak near **−12 dBFS**,
and keep them **under ~0.6 s** — these fire on every message and must be over before the next
one starts.

⚠ The app is silent and safe without any of them: `SSounds.play` fails soft on a missing
asset, which was verified on iOS hardware in the 2026-08-21 pass.

⚠ Keep this folder **audio only**. The csproj glob is `Resources\Raw\**`, so a README dropped
in beside the files would ship inside the app — which is why this document lives in `docs/`.
