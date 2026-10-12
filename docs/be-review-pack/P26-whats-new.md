# P26 · WHATS-NEW · The "What's new" card and the About bar ink (S17 A + B)

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW (presentation; one local-only key) | no | yes — 1 new push, 2 new verbs, 1 dev verb | built behind flag `SpixiFlags.S17Bridge` (default ON) | 4 min |

**Look here first:** `Spixi/Utils/S17Rules.cs` — the whole rule set, pure (csh `S17Tests.cs`, 6 tests). The pages only call it.

**DECISIONS:** #1312 · #1331–#1339 (S17 A / B) · Damir 20:43 (every fresh install sees the card)

## What changed and why
- A one-time spotlight card per release on Home (6 slides, CLEAN BLUE render). The release table is FE-side (`src/components/whats-new.js` `WHATS_NEW_SETS`); C# only says which version runs and whether this install has seen it.
- Seen = `SLocalOnlyStore` key `whatsnew.seen` (device only, excluded from backups, wiped with the account). A fresh install (create OR restore) has no value, so it sees the card once; LaunchPage writes nothing.
- About / Contributors have a full-bleed coloured header under the Android status bar. The shell tells C# which header is up, C# picks a CONSTANT colour per header and theme so the bar glyphs are chosen against the band.
- Flag OFF = no cap, no push, both verbs ignored, the page surface decides the bar ink (today).

## Files
- `Spixi/Utils/S17Rules.cs` — `versionDigits` · `shouldShow` · `pushJson` · `isDoneVerb` · `parseTopSurface` · `topSurfaceColor` · `flagLine`.
- `Spixi/Pages/Home/HomePage.xaml.cs:953` — `ixian:whatsnew:done`; `:2685` `pushWhatsNewTo`; `:2708` `markWhatsNewSeen`; `:2844` the cap.
- `Spixi/Pages/Settings/SettingsPage.xaml.cs:31` — `systemBarSurfaceColorString` override; `:253` the caps; `:269` the push; `:472` done; `:480` topsurface.
- `Spixi/Utils/SpixiFlags.cs:16` — the flag; `Spixi/Pages/Dev/DevPage.xaml.cs:89` — the dev toggle (`ixian:devflash:s17:<0|1>`, dev mode on, acts at the next start).

## Bridge surface
| Verb / push | Args (shape) | Who can send it | Handler | Ours / reshaped |
|---|---|---|---|---|
| push `setWhatsNew` | `{"version":"<[0-9.]{1,16}>","show":true\|false}` built from validated digits | C# → home.html, settings.html | `HomePage.pushWhatsNewTo` | ours (new) |
| `ixian:whatsnew:done` | none (exact) | home.html, settings.html | `HomePage:953`, `SettingsPage:472` | ours (new) |
| `ixian:topsurface:<plain\|about\|contrib>` | exact tails | settings.html | `SettingsPage:480` | ours (new) |
| `ixian:devflash:s17:` | `<0\|1>` | dev.html → DevPage | `DevPage:89` | ours (dev) |

## Threat → rule → proof
| A hostile page script could try… | What stops it | Proof |
|---|---|---|
| inject into the push | the version is digits and dots only, else nothing is pushed | csh `VersionDigits_*`, `PushJson_*` |
| write an arbitrary seen value | the verb carries no argument; C# writes its OWN version | csh `DoneVerb_IsExact` · pin `a-whatsnew.mjs` |
| paint the status bar any colour | exact tails → a constant per tail and theme | csh `TopSurface_ExactTails_ConstantColours` |
| (worst case) | the card is skipped, or the bar ink is wrong until the next screen | — |

## Given up / left open
- A user who clears app data sees the card again (seen is local only, by design).

## Question for BE
None blocking. Is `SLocalOnlyStore` the right home for a per-install UI flag (yes / no)?
