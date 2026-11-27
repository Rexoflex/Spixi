# P122 · THE HOME SCREEN GETS A SMALL PNG COPY OF EACH MINI-APP ICON THAT C# MADE — NEVER THE PACKAGE'S OWN BYTES (batch macfixa, item 2)

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| MEDIUM (a native image decode of package bytes now runs in the C# process; it leaves the wallet's WebView) | none touched; the home WebView (which holds the wallet tab) no longer decodes package bytes | none — the same `addApp` push, a smaller third argument | `MacfixaFlags.AppIconReencode` (`flagAppIconReencode`, absent = ON; a stored 0 acts only in dev mode); OFF = the base call `Utils.imageToDataUri(icon)` | 5 min |

**Look here first:** `Spixi/Pages/Home/HomePage.xaml.cs` `loadApps` (:6470) — `icon = MacfixaFlags.AppIconReencode ?
AppIconReencode.homeIcon(app.id, icon) : Utils.imageToDataUri(icon);`; two more tests of `loadApps` are edited in place:
its early return (`&& !AppIconReencode.takeReady()`) and its chat-page reload test (`AppIconReencode.tookReady() ||`). Then
`Spixi/Utils/AppIconRules.cs` `get` / `make` (the caps, the mark, the one try) and `Spixi/Utils/AppIconReencode.cs` (the folder,
the never-inline rule, the `ready` signal, the three platform decoders).

**DECISIONS:** #1480 (before the launch) · #1312 / #1478 (its own switch, the old path as the fallback) · #1321 (packet + gate row).

## What and why
A mini-app package is a zip from a publisher; `installFromPathCore` extracts ALL of it into `html/Apps/<id>/`
(`MiniAppManager.cs:449`, `:555`). At the base, `loadApps` pushed the raw `icon.png` of every installed app (about 240 KB each)
as a data URI into the home WebView — the screen that also shows the wallet. A decoder bug reached by a package icon ran
there. Now C# decodes each icon ONCE per install or update, writes a PNG of at most 192 px on the long side (steps 192 → 144 → 120 →
96 → 72 → 48 until it fits), and pushes only that: at most 22,482 bytes = 30,000 characters per push (base: about 320,000).

**Where the copy lies, and why not in the app's folder:** `<user folder>/html/Apps/_icons/<40 hex>.png`. The item text asked for
the app's own folder; a package can ship any file there (a ready-made `icon.home.png`), and a copy that C# cannot tell from a
package file would bring package bytes back after a restart. `_icons` is not a valid app id (`SafetyRules.isSafeAppId`: the
first character), so no package installs into it, and `removeAllApps` (delete account) removes it. The name is 20 bytes of
SHA-256 over the app id and the source's size and last-write time: no package text is in the path; a changed icon gets a new
name. There is no state in memory: a restart is the same call (one read of at most 22 KB per app and push).

## The diff (app C#: +132 code lines in two new files; HomePage: three lines edited in place, +0)
`AppIconRules.cs` (runs in csh): the caps, `copyName`, `sourceOk`, `copyOk`, `fit`, `get`, `make`. `AppIconReencode.cs`:
`homeIcon` + `platformCopy` for Android (BitmapFactory), iOS / Mac (ImageIO), Windows (WIC). Own decoders, not
Microsoft.Maui.Graphics `PlatformImage`: it has no declared-size step and no sampled decode, and each platform's bounded decode
already exists in `Platforms/*/SThumbnail.cs` (the calls are the same).

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| Package bytes reach the home WebView | the push is `uriOf(copy)`: a whole PNG that a platform ENCODER wrote from pixels, or `""`; no source colour profile: iOS / Mac draw the thumbnail into a fresh sRGB bitmap first, Windows hands raw pixels to the encoder (`DoNotColorManage`), Android encodes its own bitmap (from Android 10 the PNG may hold a profile that the system builds from the bitmap's colour space — numbers, not the source's bytes; not checked on a device); a file under the copy's name that is not a finished PNG within the cap is never sent; a package's own "copy" files lie in ITS folder | csh `get_one_decode…`, `get_a_file_that_is_not_a_finished_copy…`, `folder_with_the_real_manager`; pin `b-icon` b1, b3 |
| A decoder bug in the C# process (the new exposure: this process holds the wallet) | only PNG or JPEG by the first bytes (GIF, WebP, BMP, HEIC, AVIF, SVG never reach a decoder; Windows names the codec by id); at most 1 MB, checked before the read; the declared size is read first and refused over 2048 px; the pixel decode is sampled (Android `inSampleSize`, ImageIO thumbnail, WIC scaled frame); ONE try per source, ever (at most one decode per size step) | csh `source_is_png_or_jpeg_only`, `get_every_failure…`, `get_walks_the_steps…`; pin b6 (text — the decoders are run nowhere here) |
| An icon that ends the process in the decoder: a crash at every start | an empty file under the copy's name is written BEFORE the bytes reach the decoder and stays; the next start reads the mark and sends `""` | csh `get_the_mark_is_written_before_the_decode` |
| A retry storm, or a thread that waits for a decode | every failure leaves the mark: no second try, one log line; `loadApps` holds `appsPushLock` and the app list lock, so `homeIcon` decodes on NO thread: `""` now, the same call in `Task.Run` (it takes only the decode lock) | csh `get_every_failure…`, `get_a_caller_that_may_not_decode…`; pin b5 (neverInline) |
| The copy made later reloads every chat page | it raises only `AppIconReencode`'s own signal, not `shouldRefreshApps`: the tick pushes the apps again and that push reloads no chat page | pin b1 (early, reload), b5 (signal); not run (HomePage is uncompiled here) |
| A WebView or package name in a file operation | the source path is `getAppIconPath(app.id)` (C#'s, P33) and is only read; every write goes to `copy` or `copy + ".tmp"` (then moved over `copy`) | pin b4 (the list of file operations), b3 |
| A log line leaks | `App icon: no small copy`, alone or with an exception TYPE | csh (no id, no path in the line); pin b7 |
| The switch OFF differs from the base | OFF runs the base call (`ready` is raised only by `homeIcon`, so the two signal lines read as the base); HomePage minus the touched statements = the base (SHA-256) | pin b1, b2, b5 |

**Limits.** ⚠ C# UNCOMPILED: `AppIconReencode.cs` on Android / iOS / Mac, `HomePage.xaml.cs` (Windows compiles in `redesign-ci`);
the decoders ran on no device. With `SafeAppId` OFF (dev mode only) a package could name itself `_icons`. The mark is kept for
every failure, so a failure that was not the icon's fault (the process ended during the first decode or between the copy's write and its move over the mark, a disk error) also
shows the default icon until the icon file changes. A source that keeps its size AND last-write time over an update keeps its
old copy. The copy of an updated or removed app stays (at most 22 KB each) until delete account. Out of scope, still the raw
icon: `AppDetailsPage.xaml.cs:196`, `SingleChatPage.xaml.cs:5438`, `:7115` (their own WebViews, not the wallet's). Stage 2
deletes the `Utils.imageToDataUri` arm of the line and the switch.

Note: on iOS / Mac the redraw into sRGB runs the source's embedded colour profile through ColorSync inside the C# process (the in-process decode class accepted by #1480); the bytes of that profile do not reach the copy.
