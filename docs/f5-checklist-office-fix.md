# F5 checklist — the office fix round (#974–#984)

Built overnight, cloud-only (#398 precedent). **12 C# files changed, 2 new — NOTHING compiled them.**
Walk sheet: `docs/walk-artifact-office-fix.html` (23 rows). Records: DECISIONS #974–#984.

## 0 · Apply (PC or Mac, repo on `redesign/frontend`, HEAD = `c97c94cd`)

```
git am office-fix-patches/*.patch
node scripts/build-shells.mjs --check
node scripts/extract-strings.mjs --check
node scripts/smoke-test.mjs
```

Expected: both `--check` green; smoke **BASELINE OK / the 2 KNOWN**, +13 over your last run
(container, with the Ixian-Core sibling: 4883 → 4896 — compare the delta, not the number, #895).
The tarball (`office-fix-files.tar.gz`) holds the same files for a copy-over if `git am` refuses.

## 1 · Builds (the first compile)

| Target | Command | Watch for |
|---|---|---|
| Windows | F5 in Visual Studio (never `dotnet build`, #663) | HomePage (`[DIVIDER]` lines), SingleChatPage, SettingsPage, StreamProcessor, SNotificationPrefs, new `Spixi/Meta/SRequestIgnore.cs` |
| Android | Debug deploy | same shared files |
| iPhone | (zsh, one line at a time — walk verdict) `dotnet build Spixi/Spixi.csproj -f net10.0-ios -c Debug -p:RuntimeIdentifier=ios-arm64` → `xcrun devicectl device install app --device <id> Spixi/bin/Debug/net10.0-ios/ios-arm64/Spixi.app` → `xcrun devicectl device process launch --device <id> com.ixilabs.spixi` | the extension: `global::CoreFoundation.OSLog` (r1 MAJOR — a bare `OSLog` is CS0118) |
| Mac | `dotnet build Spixi/Spixi.csproj -f net10.0-maccatalyst -c Debug` → run `Spixi.app/Contents/MacOS/Spixi` | new `SMacCursor.cs`, `SPushService.cs`, `SSystemAlert.cs` (Catalyst) |

A compile error is this batch's bug — paste it verbatim into the next session.

## 2 · Console.app with the new trace (iPhone, on the Mac)

1. Console.app → select the iPhone → **Start streaming**.
2. Search: `spush` (or `subsystem:com.ixilabs.spixi.push`).
3. Kill Spixi on the phone, send it a message.
4. Expect two lines per push:
   * `[SPUSH] store=ok age=<s> muted=<n> fa=present faLen=<n> hit=muted|nick|none tag=<6 hex> verdict=Show|Suppress name=yes|no thread=yes|no`
   * `[SPUSH] final thread=kept|lost|changed|none`
5. The app's own line (ixian.log, Account → Developer → share log): `[SPUSH-APP] store written: … muted=<n> nicks=<n> mutedTags=<tags> keyLens=<lens> mutedNot1to1=<n>`.

**iO.11 procedure:** mute M off → on inside M's chat info; the tag that appears in the second
`[SPUSH-APP]` line is M's. Then kill the app and let M post in the group. Read the extension line's
`hit=` / `tag=` against that. The interpretation table is in DECISIONS #974.

## 3 · The rest

Walk the sheet §2–§4 (N1/N2, the ignore list on two devices, the Mac rows). Reply-to (§5) is
optional and lives on a scratch branch (`docs/reply-to-device-check.md`).

## 4 · Commit

`git am` already created the commits (#974–#982, #983, #984, docs). Push when the walk is done.
