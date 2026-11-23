# P87 · A NEW OR RESTORED ACCOUNT STARTS WITH "LOAD PICTURES AND GIFS" OFF (batch fixb4, item 3)

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| LOW (a more private default; an existing account is not touched) | no key, no password, no wallet data | **+1 C# → JS push** `setNewAccountDefaults(media, density)` to the launch shell only (shared with P88; no new `ixian:` verb); 1 EXISTING `spixi.*` key written (`spixi.media.autoload = 'off'`); 1 EXISTING native pref written (`photoAutoDlLoadPictures = false`, the C# mirror); +1 int pref `flagDefaultMediaTap`; log lines `[FLAGS] fixb4 mediatap=<0\|1> listcompact=<0\|1>` · `[DEFAULTS] new account page: mediatap=<0\|1> compact=<0\|1>` · `[DEFAULTS] new account page failed (<Type>)` (shared with P88) | `SpixiFlags.DefaultMediaTapToLoad` (absent = ON; a stored 0 acts only in dev mode); OFF = today: nothing is written, no push when P88's switch is off too | 5 min |

**Look here first:** `PageDefaultsRules` (`Spixi/Utils/PageDefaultsRules.cs`: the two fixed arguments, the log line) and
`LaunchPage.pushNewAccountPageDefaults()` (`Spixi/Pages/Launch/LaunchPage.xaml.cs`), called from exactly three lines: the
create body directly after `DefaultsRules.writeNewAccount(…)` (inside `if (Node.generateWallet(pass))`), and directly
after each `applyRestorePrefs(pass);` (the account zip and the bare wallet file — both AFTER the verify, the A-13
boundary). The shell side: the handler `setNewAccountDefaults` in `src/shells/launch.html` (the pushes object, next to
`wipeLocalState`).

**DECISIONS:** #1750 (Damir, main chat) · #1312 · #1478 · this batch #1845, #1846, #1852.

## What changed and why
- **Why.** Ruling #1750: a received GIF link, remote picture or remote mini-app icon loaded at once (the host sees the
  reader's IP and the time). New and restored accounts get "Load pictures and GIFs" Off (tap to load); an EXISTING account
  keeps today's behaviour, also when it never stored a choice.
- **The key lives in the WebView store**, which every shell shares; C# cannot write it. A new or restored account starts
  with an EMPTY store (`LaunchPage.onLoad` pushes `wipeLocalState` when no wallet file exists; the create body pushes it
  again after `generateWallet`), so an absent key cannot tell new from old by itself. C# says "new" with ONE push from the
  three sites above; the launch shell writes the one fixed value. `'1'` writes; any other value leaves the key alone. The
  handler writes no other key, removes nothing, sends no verb, logs nothing.
- **The C# mirror** (#46 r1, reader S MINOR-1): photo auto-download keeps its own copy of the setting,
  `SAutoDownload.loadPictures` (absent = On), so that C# never auto-downloads while pictures are off; the same helper writes
  it Off when it sends `media = "1"`. Without it, stale native prefs (a wallet file gone without Delete account) could keep
  an old auto-download setting with a mirror that says On.
- **Readers unchanged.** `chat.html mediaAutoloadOn()` and `settings.html mediaAutoloadPref()` read an absent key as On,
  as before; no start, update or migration path sends the push.
- **What Off does** (the existing behaviour of the setting): a GIF / image link renders as a tap-to-load tile; a remote
  mini-app icon in an invite is not fetched; the blurred offer preview of a received photo is not shown; the auto-download
  Moment after the first manual photo download does not show. A local photo still shows (P3).

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| An existing account is changed by an update | only the three new-account sites call the helper; no reader changed | pin `pins-fixb4/b-defaults` b1 / b2 (three calls, none in `onLoad` / `proceed` / start paths); `docs/fixb4-mechanisms.md` § 3 |
| A WebView or a peer drives the push | the two arguments are C# literals `"1"` / `"0"` from two switches and one platform test; the launch document loads no remote content | csh `PageDefaultsTests`; pin b-defaults a1 (exact values, nothing for other inputs, no verb) |
| A failed create or a wrong restore password writes the default | the calls sit after `generateWallet` succeeded / after `applyRestorePrefs`, which runs only after the verify | `docs/defaultsb-mechanisms.md` § 1; reader S r1 Q2 |
| The push is lost (the launch WebView goes away) | the push is posted before the navigation to Home on both threads; a lost push writes no WebView key (the screen keeps On) while the C# mirror is already Off: auto-download, offer previews and the Moment stay off until the user flips the switch — a silent mismatch toward MORE privacy, never less (#46 r2 MINOR-2, accepted) | reader S r1 MINOR-2, r2; the walk checks the SCREEN, not only the log line |
| Switch OFF is not the old path | both effective values 0 → `newAccountArgs` = null → no push, no mirror write (the one `[DEFAULTS] … mediatap=0 compact=0` line remains — NIT, the contract asks for it) | csh `both_off_is_no_push`; pin d1 |

**Side effects (facts):** a new account sees GIF links as tap-to-load tiles from the first chat; the Privacy screen shows
the switch Off. The `[DEFAULTS] new account page` line logs what was SENT, not what the WebView stored (the walk reads the
screens). ⚠ C# UNCOMPILED: `LaunchPage.xaml.cs` (Windows compiles in `redesign-ci`; Android in Damir's build);
`SpixiFlags.cs` and `PageDefaultsRules.cs` compile and run in csh.
