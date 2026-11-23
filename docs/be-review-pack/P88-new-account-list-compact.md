# P88 · A NEW OR RESTORED DESKTOP ACCOUNT STARTS WITH THE COMPACT CHAT LIST (batch fixb4, item 4)

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| NONE (cosmetic; an existing account is not touched) | none | the push of P87 (its `density` argument); 1 EXISTING `spixi.*` key written (`spixi.chat.listdensity = 'compact'`), desktop only; +1 int pref `flagDefaultListCompact`; the log lines of P87 | `SpixiFlags.DefaultListCompact` (absent = ON; a stored 0 acts only in dev mode); OFF = today | 2 min |

**Look here first:** `PageDefaultsRules.newAccountArgs` — `density = "1"` only when the switch is on AND the platform is a
desktop (`DevicePlatform.WinUI || DevicePlatform.MacCatalyst`, the test of `HomePage.isDesktopPlatform`); the launch
shell's `setNewAccountDefaults` writes `'compact'` only for `density === '1'`.

**DECISIONS:** #1750 (A9) · #1478 · this batch #1845, #1847.

## What changed and why
- **Why.** Ruling #1750: the desktop chat list of a new account starts Compact. An existing account keeps Comfortable
  (absent = comfortable), also when it never stored a choice.
- **Desktop only.** The phone has no density control; nothing is written there (the head ladder of `home.html` would apply
  the value on any platform). The readers (`home.html:40`, `settings.html:696`) are unchanged.
- The sites, the ordering and the "lost push = the old default" rule are those of P87.

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| The phone gets a density it cannot undo | `density` is "1" only with the desktop test | csh `args_all_eight_combinations`; pin b-defaults b4 (the test = `isDesktopPlatform`'s body) |
| An existing desktop account changes its list | the push is sent only from the three new-account sites | P87 rows 1 and 3 |

⚠ C# UNCOMPILED: `LaunchPage.xaml.cs` (as P87).
