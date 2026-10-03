# Session 4 fix batch · #46 r1 (auditor A C# 0/3/5 · auditor B shells+pins 2/4/4 + motion, 10 mutants → 5 survivors)

| ID | Sev | Finding | Fix |
|---|---|---|---|
| B-M1 | MAJOR | reduced motion: no ring on my photo tiles — `.c-bubble-row[data-direction="sent"] .c-mbubble[data-file]` (0,4,0) beats the static ring rule (0,3,0); the pin used `includes` | raise the static ring rule's specificity for tiles; pin = COMPUTED box-shadow on every kind under reduced motion |
| B-M2 | MAJOR | the photo fade keeps the size jump: the quiet tile is 4:3, the preview (a SQUARE centre crop, #1121 `SThumbnail.makeJpeg`) resizes it | a local photo tile reserves the square (1:1) from the first frame; no resize when the preview lands; pin = tile box unchanged across setFileThumb |
| B-m1 | MINOR | light: the blue ring is 1.17:1 on my sent bubbles | a 1 px band-coloured gap, then the 1 px blue ring (`0 0 0 1px band, 0 0 0 2px blue`); contrast pin computed |
| B-m2 | MINOR | my tile shows a 1 px sliver of ground (object-fit contain inside the 2 px frame) | `object-fit: cover` for photo tiles |
| B-m3 | MINOR | the band misses the selected row's sent-card edge raise (#993) | set `--outline-card-sent: var(--outline-card-sent-selected)` on the lit row |
| B-m4 | MINOR | the 600 ms quiet wait also hides a live just-sent tile's ring | quiet only for tiles built by a history load (chat open), never a live insert |
| A-M1 | MINOR | the "Missed call" notification badge is posted before the missed call is counted (`VoIPManager.cs:425` vs `:527`) | count first |
| A-M2 | MINOR | the reaction heart survives "delete history" (3 sites) | clear the flag there |
| A-M3 | MINOR | the heart survives leaving a group (`SContacts.cs:108-114`) + 2 pendingDeletion cleanups | clear there |
| B-mut | MINOR | survivors M1 (quietSince eviction), M2 (unquiet on a failed decode), M3 (timer unquiets under a decoding picture), M7 (`'true'` branch), M8 (reduced-motion radius) | pins |
| A-N1…N5, B-NITs, motion 1/3/4 | NIT | recorded (late-call oldMessage, peer-suppressible system ids, multi-device missed call, unsynchronised ++, probe naming; tap/click wording elsewhere; quietSince per-peer; heart disc contrast by design; pulse replaces the lift; late preview = two fades; entrance easing) | recorded |
