# Walk R — iOS device results, 2026-09-07

iPhone 15 · **Release** build, `ios-arm64` · commit `23491879` · profile
`VS: com.ixilabs.spixi Development` (5 entitlements signed).

**33 P · 4 F · 4 N/A · 1 not scored.** The first iPhone pass since 2026-08-27, and it covers
Sessions I → R, six sessions that had never been on this platform.

⚠ **The build carried NO seed harness.** `SpixiDevCoexist` defaults to true only in Debug, so a
Release build has no `SPIXI_DEV_COEXIST` symbol, no `SDevSeed`, and no seed card. Rows L1 · L2 ·
L5 · C1 were therefore walked on a REAL account, not a seeded one. They pass, and that is worth
more than a seeded pass, but the heavy-profile arm is still owed.

---

## The four failures, triaged

### S1.1 — a Tenor share link does not tile. **NOT A DEFECT. Documented, and it is #684.**

`src/shells/chat.html` (the `giphyDirectFromShare` docblock, Session F) states the rule in the
tree: *"TENOR IS NOT DERIVABLE and is deliberately left alone."* A `tenor.com/view/<slug>` page id
is **not** the media hash in `media.tenor.com/<hash>/…`. Recovering it needs a Tenor API call with
a key, and a key in the client is a key in everyone's client (#82). So a Tenor share link stays a
confirm-to-open link, by decision.

Damir's own note is the confirmation: *"only gif keyboard send renders as gif"* — the keyboard
hands over a direct media URL, which tiles; a pasted share **page** does not.

★ **One discriminator is still owed, and it is cheap: paste a GIPHY share link**
(`https://giphy.com/gifs/<slug>-<id>`). Giphy IS derivable and `giphyDirectFromShare` rewrites it
to `https://i.giphy.com/<id>.gif`. If Giphy tiles → the gate is correct and S1.1 is a **PASS**. If
Giphy does NOT tile → Session R's `normalizeMediaUrl` round broke a working case, and that is a
real regression.

★ **The right long-term fix is named in the same docblock and it is not in the shell.** Gboard
hands C# both a `LinkUri` and a `ContentUri` — the actual GIF file. Sending the FILE down the
existing transfer path would render every provider identically **and** close the #82 IP leak
outright, because the recipient would fetch nothing from Tenor or Giphy. That is a build row.

### S2.2 — the spoof link is refused, but the refusal is SILENT. **REAL, and Damir's ruling is right.**

The refusal itself is the Session R fix working: `SingleChatPage.xaml.cs:748` documents that this
end is authoritative *"because it is the only end that can refuse"*, and `Utils.openExternal`
refuses a non-empty `Uri.UserInfo` and every scheme but http and https.

The defect is that the branch ignores the returned `bool`. The user reads a confirm, presses
**Open**, and nothing happens. Damir: *"we should not allow users to click open if it doesn't open."*

⚠ **And the blast radius is wider than the spoof case.** The same docblock records that
`HttpUtility.UrlDecode` is FORM decoding, so a literal `+` becomes a space:
`https://en.wikipedia.org/wiki/C++` arrives at this branch with both plus signs replaced by
spaces, and nothing restores them. **Any legitimate link carrying a `+` fails the same way, just
as silently.** That is security review MAJOR #8 surfacing as a user-visible symptom.

**FIX (next session):** the openLink branch reads the `bool` and, on false, shows a native
refusal that names the reason — the address shown is not the address it goes to. Do NOT weaken the
gate. Consider whether the `+` case deserves separate handling before it is called a refusal.

### S2.3 — "no explorer link and no support mail link". **MY SHEET WAS WRONG, NOT THE APP.**

* The **explorer link is in the WALLET, not Settings** — `home.html:2569` emits `ixian:explorer`
  from the address surface, handled at `HomePage.xaml.cs:1318`. Row S2.3 asked for it in the wrong
  place.
* The **support mail link does not exist and was never built.** `settings-app.js` records the
  decision: Send log is §9-gated by callback presence, *"NO bridge command exists — the proposal is
  C# opening the OS email/share sheet with `ixian.log` attached… A mailto: fallback is NOT honest
  here — the log dwarfs URL limits."*

**S2.3 re-scores as PASS.** About and How-to-use open, which is what the one-gate change had to
prove. ⚠ Residual: `ExternalTarget.MailCompose` has no live caller on this surface, so the gate's
mail arm is unexercised on iOS.

### C7 — the push badge resets to 1. **KNOWN, and it is OneSignal-side.**

Agreed with Damir in session. It belongs to the iOS notifications work order
(`docs/ios-nse-spec.md`), three of whose six prerequisites are Apple-side.

---

## New rows this walk produced

| row | what | where |
|---|---|---|
| **W-R1** | Delete-data with a WRONG password shows an **empty dialog with only a button in it** (S2.7 note). No message, no title | the delete/confirm path |
| **W-R2** | Attach sheet ↔ keyboard: the keyboard **moves up** instead of the sheet replacing it, unlike Android (C4 note). The sheet itself sits correctly | mirror of the Android K1 hold (#761 / #721) |
| **W-R3** | The openLink refusal is silent — see S2.2 above | `SingleChatPage.xaml.cs` openLink branch |
| **W-R4** | Giphy-share discriminator for S1.1 — one paste decides regression vs. documented limit | `chat.html` `giphyDirectFromShare` |

## Answers to the questions in the notes

* **S1.3 — "is there a reason the privacy switch for GIFs only exists on iPhone?"** It does not.
  The switch is built by `settings-screens.js` `createPrivacy` and mounted by `settings.html`, so
  it is on **every** platform. What was iOS-only is the **leak** it closes: Android and Windows
  already refused the host at the platform layer through `Utils.IsAllowedURL`, so the tile was
  merely broken there while iOS and MacCatalyst actually fetched. The switch is new in Session R
  (census row E-1b) — an older Android build simply would not have it.
* **R4 — "how do I read the battery temperature?"** On iOS you do not. That rule came from the
  Android captures, where `dumpsys` reports it. iOS exposes no user-facing temperature; the nearest
  instrument is Xcode's energy gauge. **Score R4 N/A on iOS** and keep the temperature rule for the
  Android arm.
* **L7 — "do I need it connected directly? I am not using Xcode."** Yes. The memory number needs
  Xcode attached (Debug → Attach to Process → Spixi) or Instruments with the Allocations or Activity
  Monitor template. A development-signed build carries `get-task-allow`, so attaching works on this
  Release build. ★ **Better answer for next session:** put resident memory in the dev HUD, so this
  number never needs a cable again.
* **C9 — "not sure what press feedback you mean."** The row was about a pressed-state tint on the
  address row. It shows the address sheet, which is the behaviour that matters. Treat as a pass.

## Corrected tally

**35 P · 2 F · 4 N/A** after re-scoring **R2 → P** (GATE 1 OK, verified from the Mac:
`packaged ≡ strip(committed)`, and that leg had never run against a real deployed iOS bundle) and
**S2.3 → P** (sheet error, not an app error).

The two live failures are **S2.2** (silent refusal, and the `+` case rides with it) and **C7**
(OneSignal, already owned).

⚠ Still owed on this platform: **R3 gate 2** (`smoke-packaged` over the deployed folder — it
exceeds the 45 s bridge window, run it locally), **L7** with Xcode attached, **S2.6** a
camera-using mini-app, and **S1.1's** Giphy discriminator.

---

## W-R5 — a short chat does not rise above the keyboard (Damir, same day)

**Report:** on a freshly added contact, typing does not move the conversation above the keyboard.
It stays hidden. Once enough messages exist, it starts moving correctly.

**The mechanism is visible in the tree, and it is NOT C4's.** Two separate rules:

* `src/shells/chat.html:279` — `#chat-composer { margin-bottom: max(0px, calc(var(--kb-inset, 0px)
  - env(safe-area-inset-bottom, 0px))); }`. The COMPOSER consumes `--kb-inset`.
* `src/shells/chat.html:212` — `#messages { flex: 1; padding-bottom: calc(var(--composer-h, 0px) +
  var(--spacing-4)); display: flex; flex-direction: column; }` with `:213`
  `#messages > .c-sysnotice { margin-top: auto; margin-bottom: auto; }`.
  **The LOG consumes `--composer-h`. It never consumes `--kb-inset`.**

On iOS the body is deliberately never resized (#303), so the layout viewport keeps its full height
while the keyboard covers the bottom of it. The #181 auto-margin centering therefore centres the
notice and the first bubbles in the **un-shrunk** box — whose middle is behind the keyboard. Once
the log overflows, the auto margins collapse to 0, content pins to the top, and the existing
scroll-to-bottom lands it above the keyboard. That is exactly the "starts moving once enough
messages are there" boundary Damir describes.

⚠ **HYPOTHESIS, not a verdict (#294).** One question separates two different fixes, and it must be
answered on the device before anything is built:

> On a fresh contact with the keyboard up — is the **composer itself** visible above the keyboard,
> or is it hidden too?

* Composer VISIBLE, bubbles hidden → the centering box is the bug. The fix is that `#messages`
  consumes `--kb-inset` in the same expression the composer already uses.
* Composer ALSO hidden → `--kb-inset` is not arriving at all on this path, and the suspect is the
  native `__setKbInset` lever (#303) not attaching for a chat presented through the #800 pre-warm —
  a spare page is staged, not constructed, so an attach that runs at construction would be missed.

**These two have different fixes and only one of them is small. Get the answer first.**

## The keyboard family, as one build item

| row | symptom | suspected home |
|---|---|---|
| **W-R2 / C4** | attach sheet ↔ keyboard: the keyboard rises instead of the sheet replacing it | `handKeyboardToTray` HOLD path (#756 / #761 K1) |
| **W-R5** | a short log stays behind the keyboard | `#messages` does not consume `--kb-inset` (`chat.html:212`) |
| **iOS-29** | the long-running iOS keyboard family | #303 / #770 |

One shell, one instrument, one build, one device loop.

---

## W-R5 — ANSWERED on the device: it is the centering box, not the pre-warm

Damir, same day: **"keyboard is shown under composer, composer is visible."**

So `--kb-inset` DOES arrive and the composer lifts correctly. The pre-warm branch is ruled out.
The defect is the one named above: `#messages` (`chat.html:212`) consumes `--composer-h` and never
`--kb-inset`, so the #181 auto-margin centering centres the first bubbles in the un-shrunk
viewport, behind the keyboard. **The fix is that the log consumes the inset in the same expression
the composer already uses.** Small, one shell, no C#.

⚠ Do not simply add the inset to the existing `padding-bottom`. The log must still pass UNDER the
floating composer pill (Session I), and the auto margins must still collapse to 0 the moment the
log overflows, or the #181 grammar breaks in the other direction. Both properties need a pin.

## E1c — the iPhone launcher icon is too small. MEASURED PRECEDENT EXISTS.

Damir, same day: **"on iPhone the launcher icon shows a very small logo. On Android it's great."**

**iOS is on the wrong side of a split that has already been made once.** `Spixi.csproj:214`:

```
<MauiIcon Condition="!$(TargetFramework.Contains('-windows'))"
          Include="Resources\AppIcon\appicon.svg"
          ForegroundFile="Resources\AppIcon\appiconfg.svg" Color="#0076E1" />
```

iOS falls in the `!windows` branch, so it takes the **Android-tuned adaptive pair**. Per the L17
and E1b comments in the same file, that pair pads the mark to **31.8 % of the 1024 tile**, because
Android's adaptive mask plus its ~1.5× foreground zoom needs that headroom.

★ **E1b (2026-08-29) already measured this exact conflict — for Windows.** Its words: *"Windows
neither masks nor zooms — it draws the composed square as-is — so the same padding renders the
taskbar mark at about two thirds the size Android shows… Shrinking the padding would fix Windows
and break Android, so the two platforms take different files."*

**iOS behaves like Windows, not like Android.** It applies its own squircle and does no foreground
zoom, so it renders the same two-thirds mark. The fix has the same shape as E1b: a THIRD
`MauiIcon` line for iOS with its own file.

⚠ It is NOT a straight reuse of `appicon_windows.svg`. iOS requires a **fully opaque, full-bleed
square with no alpha** and applies its own corner mask, so the new file must run its ground to the
edges and carry NO rounding of its own — a transparent corner renders black on iOS. The Windows
file carries its own ground (which is why its line takes no `Color`), so it is the right starting
point, not the finished asset.

🟡 **Damir owns one decision here:** the mark's share of the iOS tile. Apple's own apps sit far
above 31.8 %. Give a target, or approve deriving it from `appicon_windows.svg`.

---

## ★★ W-R6 — GATE 2 HAS NEVER WORKED ON A MAC, AND THE CAUSE IS THE MAIN-MODULE GUARD

Found while closing walk row R3. **`scripts/strip-release.mjs:117`**, before the fix:

```js
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
```

That is the guard that keeps the CLI half from firing when the suite imports
`stripCssComments` / `STRIP_ALLOWLIST`. It compares two strings. Node resolves an ESM module to
its **realpath**; `process.argv[1]` is the path exactly as the caller typed it.

**On macOS `/var` is a symlink to `/private/var`**, and `smoke-packaged.mjs` copies the tree into
`tmpdir()`, which on macOS is always `/var/folders/…`. So the copy's script saw

```
import.meta.url  = file:///private/var/folders/…/strip-release.mjs
process.argv[1]  =         /var/folders/…/strip-release.mjs
```

they never matched, **the whole CLI block was skipped, and the process exited 0 having written
nothing.** Gate 2 then failed at its own gate-1 step with `packaged ≠ strip(committed) (101683 vs
30688 chars)` — the packaged file had simply never been stripped.

### Measured, not reasoned

| step | evidence |
|---|---|
| Damir's macOS run of `repro-gate2.mjs` | copy complete (27 files, css 102 996, script 16 595 B) · child `status 0` · `stdout ""` · `stderr ""` · file unchanged at 102 996 |
| direct macOS run of the same script | ✓ 30 688 bytes — works, because `/Users/damir/…` is not symlinked |
| container, symlinked invocation, OLD guard (mutation) | `status=0`, 0 bytes stdout, 0 bytes stderr, **no file written** — the macOS signature reproduced |
| container, symlinked invocation, NEW guard | ✓ 30 688 bytes |
| container, direct invocation, NEW guard | ✓ unchanged |
| container, `import()` of the module, NEW guard | CLI does not fire — the property the guard exists for |

### Why nobody saw it

The fork was written and verified in the Linux container, whose `tmpdir()` is a real path. Gate 2
was recorded as passing there, and it does. **It has never once run on the Mac**, and the walk's
row R3 is the first time anyone tried.

### The fix

Compare **realpaths on both sides**, in a `try/catch` because a main-module test must never throw:

```js
const isMainModule = (() => {
  if (!process.argv[1]) return false;
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch (_) { return false; }
})();
```

### What it says about the other gates

Only ONE occurrence of this pattern exists in `scripts/` — grep is clean, so the blast radius is
this file. Two consolations, and neither is a design:

* It failed **loud**, because gate 1 runs inside gate 2. A guard of this shape in a script whose
  absence is not separately gated would fail **silent** — the Session R stripper lesson exactly.
* The MSBuild leg is safe by luck plus one belt: it invokes an unsymlinked repo path, and
  `Spixi.csproj` raises `<Error>` if the strip writes no file. ⚠ A clone under a symlinked path
  would have depended on that belt alone.

⚠ **OWED, and it is the point of the finding: a pin.** The property is *"the CLI runs when this
file is invoked through a SYMLINKED path"*, and no pin in the suite asserts it — which is why a
dead gate went unnoticed for two sessions. Build it with the next batch. A comment is not a pin.

🟡 Damir: this is a code change outside a batch. It needs a DECISIONS row at your commit.

## W-R7 — the SECOND dead gate, found by the first one working

With W-R6 fixed, gate 2 ran for the first time on a Mac and **failed with four reds**. Three were
mine and correct; the fourth was not mine and was the same class as W-R6.

### The three that were right to go red (E1c)

E1b split `MauiIcon` in two and pinned that number. **E1c makes it three**, so:

| pin | was | now |
|---|---|---|
| the Color-carrier pin | `iconLines.length === 2 && nonWin.length === 1` | `=== 3`, and each line identified by the FILE it includes. ⚠ `nonWin` is RETIRED — with three lines "not Windows" no longer names one line, the identical defect E1b fixed when "carries #0076E1" stopped naming one |
| the complement-conditions pin | two literal complements | three conditions pinned individually, **plus the partition EVALUATED per TFM** |
| Session F mutation M1 | `icons.length === 2` after XML comments stripped | `=== 3` |

★ **The partition pin is new and it is the one that earns its place.** Matching three regexes
would stay green if someone dropped the `!ios` term from the Android line — which gives iOS TWO
icons, and is exactly the mistake E1c had to avoid making. So the pin now loops the four shipped
TFMs and asserts **exactly one** condition matches each. Verified standalone: 9 / 9.

### The fourth: gate 22 could never pass under gate 2

```
gate 22 premise: local-nuget/RocksDB.0.0.42.nupkg is tracked — the hash pin has nothing to verify without it
```

`smoke-packaged.mjs:43` excludes `local-nuget/` from the copy, so the nupkg gate 22 hashes was
**deleted from the package**. The pin took its else-branch and reported a red that says nothing
about the packaged tree and everything about the copy.

⚠ The exclusion's own stated reason does not hold for that folder: `obj/` and `bin/` are the
hundreds of megabytes, `local-nuget/` is **~1 MB**. It was swept up with them.

**Fixed by symlinking it back in**, the way `node_modules` already is — nothing in the suite writes
there, and the bytes gate 22 hashes must be the COMMITTED bytes.

★★ **Gate 22 landed in Session R, whose closing numbers list no gate-2 run.** So gate 2 has been
unpassable since the nuget hardening, and nobody could have known.

### The pattern, and it is the finding

**Two gates found dead in one afternoon.** Both were written and verified in the Linux container.
Neither had ever run on a Mac. **Neither had a pin asserting it could run at all** — the suite
pins what the gates *check*, and nothing pins that the gates *execute*. That is the same shape as
Session R's stripper: the instrument was broken and every reading it gave was green.

🟡 The pin owed for W-R6 should be widened to cover both: *a gate that cannot run must fail loudly
in a way the suite can see.*

### Expected numbers after this batch

+5 assertions (one iOS-no-Color, four partition). **Committed tree 4618** · **packaged 4617**.
⚠ PREDICTED, not measured — the container cannot hold a 5-minute background run across a bridge
call. Damir's run is the measurement.

## W-R8 — E1c broke the build, and the cause was a dash

The first build after E1c failed: **0 warnings, 1 error.**

```
error MAUIR0001: There was an exception processing the image ''.
System.Xml.XmlException: An XML comment cannot contain '--',
and '-' cannot be the last character. Line 13, position 71.
```

The documentation comment written into `appicon_ios.svg` used `" -- "` as a dash, **eight times**.
XML forbids `--` inside a comment and forbids a comment ending in `-`.
`Microsoft.Maui.Resizetizer` parses the artwork as XML, threw, and took the whole iOS build with
it. The `devicectl` errors that followed are downstream noise: `Spixi.app` was never produced, so
the install failed and the "Launched application" line is the OLD app already on the phone.

Nothing about the icon design was wrong. The `--` sequences are now em dashes and all six SVGs
under `Spixi/Resources` parse.

### The pin, and why it is worth its line

⚠ **No pin in this suite had ever opened the artwork.** Every icon pin reads the CSPROJ — which
line declares which file — so the repo could have declared a flawless three-way split of files
that cannot be parsed, and stayed green.

The new pin walks `Spixi/Resources` for `*.svg` and asserts the two illegal comment shapes are
absent. It pins **the exact rule that broke the build**, not "valid XML" in general: node ships no
XML parser, and a pin that claims more than it checks is worse than none. It walks rather than
naming files (#798), so an SVG added tomorrow is covered the day it lands.

Mutation-tested: **GREEN** over the six live files; **RED** the moment a `--` is put back into one
comment.

★ Third gap found today, and the same shape as the other two: the suite pinned what the artefact
*declares* and never that the artefact *works*.

### Counts move again

+1 assertion. **Committed tree 4619** · **packaged 4618**.

## W-R9 — the icon set NAME is a coupling between two files, and E1c broke it

Second failure of the same change, and a more interesting one:

```
actool error : None of the input catalogs contained a matching stickers icon set,
app icon set, or icon stack named "appicon".
```

The resizetizer names the generated `.appiconset` **after the MauiIcon FILE**. Each platform's
`Info.plist` names the set it wants in `XSAppIconAssets` — **as a hardcoded string**. Giving iOS
`appicon_ios.svg` renamed the set to `appicon_ios.appiconset` while
`Spixi/Platforms/iOS/Info.plist:30` still asked for `appicon.appiconset`, so actool refused.

⚠ **Nothing connected those two files.** Every icon pin proves which SVG each platform *takes* from
the csproj; not one had ever opened an `Info.plist`.

**Fixed:** the iOS plist now names `appicon_ios.appiconset`.

★ **MacCatalyst is the control and it must NOT move.** It rides the ANDROID MauiIcon line, whose
file really is `appicon.svg`, so `appicon` in its own plist is correct. A careless sweep that made
both plists match iOS would break Catalyst silently — which is why the new pin asserts each plist
against the file ITS platform actually takes, not against each other. Mutation-tested: pointing
Catalyst at the iOS set turns it red.

### Counts

+2 assertions. **Committed tree 4621** · **packaged 4620**.

### The afternoon's tally, and it is one lesson

Five gaps, all the same shape — **the suite pinned what a thing DECLARES and never that it WORKS**:

| # | gap | how it hid |
|---|---|---|
| W-R6 | `strip-release` main-module guard | gate 2 dead on every Mac since the fork |
| W-R7 | `local-nuget` excluded from the package | gate 22 unpassable since Session R |
| W-R8 | `--` inside an SVG comment | no pin ever opened the artwork |
| W-R9 | plist ↔ MauiIcon filename coupling | no pin ever opened an Info.plist |
| (S2.2) | link refusal returns a bool nobody reads | no pin asserts the user is told |

Four of the five were found in one afternoon, by doing the one thing none of the gates did: running
them on a Mac with a device attached.
