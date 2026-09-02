# F5 CHECKLIST — SESSION I (#736–#743) · the premium pass walk

Everything is already built and on your tree (bundle 319 · shells 18 · smoke 3975/3 —
measured in the clean clone; nothing to run on the JS side). Build the apps, walk, paste
the results block at the bottom back to me.

## Build

Windows — PowerShell all the way (no `-t:Run` on this target: it replaces the Build
target and exits 9009, #663; the copy step is what Visual Studio's deploy would do —
`dotnet build` does not stage the MauiAsset shells beside the exe, and the
`Documents\Spixi\html` cache would otherwise serve you the PREVIOUS build's shells):
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"
Remove-Item -Recurse -Force Spixi\bin, Spixi\obj -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\Documents\Spixi\html" -ErrorAction SilentlyContinue
dotnet build Spixi\Spixi.csproj -c Debug -f net10.0-windows10.0.19041.0 -p:Platform=x64
$exe = Get-ChildItem -Path Spixi\bin -Recurse -Filter Spixi.exe | Where-Object { $_.FullName -like "*windows10.0.19041.0*" } | Select-Object -First 1
Copy-Item -Recurse -Force "Spixi\Resources\Raw\*" $exe.DirectoryName
Start-Process $exe.FullName
```

Android — one terminal:
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"
dotnet build Spixi\Spixi.csproj -c Release -f net10.0-android -p:SpixiDevCoexist=true -t:Run
```
Installs OVER the existing "Spixi Dev" (same id, same key — an update; the Dev wallet
survives, legacy untouched). Don't uninstall anything.

Android numbers — a second terminal, BEFORE you open a chat / tap Account → Contacts
(phone only; on Windows the C# lines land in Account → Developer → the log):
```
adb logcat -c
adb logcat | findstr /C:"[CDPERF]" /C:"[L14]" /C:"[DEVSEED]" /C:"chromium"
```

One reset you may need: the new light canvas is the DEFAULT only where no preference
is stored. If you picked Solid/Off in Chat appearance before, flip them back
(Account → Chat appearance → Gradient + Subtle) or you keep the old ground.

Legend: **P** pass · **F** fail · **N** n/a. Write a note after any F.

## A · Android, Motorola (Release, Spixi Dev)

| # | test | steps | expect | P/F/N | note |
|---|---|---|---|---|---|
| A1 | bubble density | open a 1:1 with short + long messages both ways; screenshot | a single-line bubble is ~80 px tall on the screenshot (was 100); text 16, time small + medium weight | | |
| A2 | tails | same chat | a small tail on the FIRST bubble of each same-sender group only; none inside a group; none on emoji stickers | | |
| A3 | lift, light | light theme | every bubble carries a faint 1 px shadow; white bubbles still separate from the canvas | | |
| A4 | lift, dark | dark theme | received bubbles separate from the near-black canvas without looking muddy | | |
| A5 | sent blue | any sent bubble | a step softer than before; white text + ticks legible | | |
| A6 | 24-hour time | your phone is set to 24-hour | bubble times read "16:42", not "04:42 PM" — same as TG/WA beside it; chats-list + tx times too | | |
| A7 | timestamp size | | time reads smaller than the message text, no longer "big" | | |
| A8 | chats list | Chats tab | names semibold, unread names bold, avatar unchanged at 48; rows a touch taller (pitch ~190 px); filter chips semibold | | |
| A9 | tx list | Wallet | names semibold | | |
| A10 | avatars | Chats + Account + a contact's info | a soft light at the top-left of every gradient disc; no olive/brown discs; the HERO letter on Account / chat info is hero-sized (was tiny) | | |
| A11 | chat info canon | a contact's info | rows 48 tall, the Notifications switch row 56; tighter section gaps; nothing clipped | | |
| A12 | Account canon | Account hub | rows 48 / switch rows 56, tighter gaps, hero slightly tighter | | |
| A13 | Notifications card | Account → Notifications | ONE card holds all switch rows; the OneSignal sub reads "Wakes this device the moment a message arrives. Uses OneSignal, a push provider." whether the switch is on or off; the long note sits UNDER the card and changes with the switch | | |
| A14 | light canvas | a chat, light | warm-neutral #EEECEF ground, magenta doodle pattern, a soft wash; the secure-notice card reads as a card, not a blue patch | | |
| A15 | composer ⊕ | any chat | the ⊕ sits INSIDE the pill, bottom-left; tap → tray opens, ⊕ becomes ✕; tap again → closes; a tile tap fires + closes | | |
| A16 | composer height | | the pill is shorter (≈115 px on a screenshot, WhatsApp's); 6+ lines still grow to 5 and scroll | | |
| A17 | floating bar | scroll to the newest message | the last bubble scrolls UNDER the pill; the pattern runs behind the bar; chevron + @ FAB still float above it | | |
| A18 | keyboard | tap the field → keyboard up | the bar lifts with the keyboard as before; nothing hides behind it; the tray still swaps with the keyboard | | |
| A19 | ★ caret w/o keyboard | open a chat cold | caret blinking in the field, NO keyboard. First tap on the field → keyboard rises. Leave, re-open → same again | | |
| A20 | menus | long-press a bubble; long-press a chat row | rows tighter (40); every row still taps cleanly; the ❤️ react row + "Read …" line tighter | | |
| A21 | emoji sticker | send "👍", then "🇸🇮", then "ok 👍" | the first two: big glyph, NO bubble, time in a small chip; the third: a normal bubble | | |
| A22 | blue excerpts | Chats tab after a file / a reaction / an app invite | that row's excerpt reads in the action blue like "You are now connected" | | |
| A23 | bot sender face | the Spixi bot room, a nameless sender | the truncated address above the bubble is in the nickname face (not monospace), still copyable | | |
| A24 | hybrid entrance | Account → About / Chat appearance / Notifications; Chats FAB → New chat | slides in a SHORT way while fading in; Back slides out + fades; nothing yanks | | |
| A25 | ★ chat open | tap a chat row | opens INSTANTLY (no slide); note whether the stutter is still there | | |
| A26 | ★ [CDPERF] at 3 | logcat, open a chat | paste the five `[CDPERF] chat …` lines + the `[CDPERF] chat-shell …` line (under `chromium`) | | |
| A27 | seed | Account → About → "Seed 50 test contacts" | status line reports ~50 contacts / ~1000 messages; Chats shows Seed 01…50 with unread badges on some; a re-tap adds nothing | | |
| A28 | ★ [CDPERF] at 50 | open "Seed 08" (long history) | paste the same six lines | | |
| A29 | unseed | About → "Remove seeded contacts" | all fifty gone, your real contacts untouched | | |
| A30 | ★ L14 way-in | Account → Contacts, twice | NO chat-list flash on the way in; logcat shows `[L14] handoff pop released by cover` (not `backstop`) | | |
| A31 | L14 way-back | Back from the directory | Account re-presents as before | | |
| A32 | legal | Account → About → Terms of Use | the FULL document, 20 numbered sections, scrolls; Privacy Policy still shows the short summary (held until you fill the two markers) | | |
| A33 | consent line | fresh install / welcome → Create → the Terms link | same full Terms sheet from the consent line | | |
| A34 | bot address | Spixi bot room → info → the address row | opens the address sheet: QR + full address + copy | | |
| A35 | notification | receive a message with the app in the background | the disc behind the small icon in the shade is the splash blue (#175595) | | |
| A36 | double-back guard | open Contacts, press back TWICE fast | the app must NOT background (L8 arm still holds under the hybrid) | | |

## W · Windows

| # | test | steps | expect | P/F/N | note |
|---|---|---|---|---|---|
| W1 | unread strip | a chat with an unread divider, wide window | the strip runs from the pane edge to the scrollbar, no clipped hairlines; column still 760 | | |
| W2 | desktop rows | Chats | names semibold at the SAME size as before (14); rows same height | | |
| W3 | 12/24 hour | | times follow Windows' own time format | | |
| W4 | bubbles | | same tails / lift / blue as Android; the 760 column + centred composer intact; the last message scrolls under the pill | | |
| W5 | no slide on desktop | Account → About | instant, as before (the hybrid is mobile-only) | | |
| W6 | canvas | light | #EEECEF + pattern + wash ON by default on desktop too (was pattern-off) | | |
| W7 | caret | open a chat | field focused as before (desktop autofocus unchanged) | | |

## Results — copy this block, fill it, paste it back

```
SESSION I WALK — <date> — Android Release (Spixi Dev) / Windows F5
A1  A2  A3  A4  A5  A6  A7  A8  A9  A10 A11 A12
A13 A14 A15 A16 A17 A18 A19 A20 A21 A22 A23 A24
A25 A26 A27 A28 A29 A30 A31 A32 A33 A34 A35 A36
W1  W2  W3  W4  W5  W6  W7
FAIL notes:
- A?? : 
[CDPERF] at 3:
<paste the 6 lines>
[CDPERF] at 50 (Seed 08):
<paste the 6 lines>
[L14]:
<paste the line(s)>
Re-dial requests (dial → value):
- 
```

## Commit
One batch, message in `docs/commit-message-session-i.txt`. ⚠ NEW files to `git add`:
`Spixi/Utils/SDevSeed.cs` · `scripts/build-legal-docs.mjs` · `scripts/lib/legal-docs.mjs`
· `src/components/legal-docs.js` · `docs/handoff-2026-09-02.md` ·
`docs/commit-message-session-i.txt` · `docs/f5-checklist-session-i.md` ·
`docs/reference-screens/premium/sheets/` (16 PNGs). Never `git add -A`; never plain
`git status` on the mount (`git --no-optional-locks`).
