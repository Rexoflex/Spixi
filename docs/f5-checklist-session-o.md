# F5 CHECKLIST — SESSION O (2026-09-05): the #46 loop over Session M + Session N's C# and #797

One item shipped: the owed adversarial loop (DECISIONS #798). It found two MAJORs and fixed
both — **all 19 `onNavigating` handlers now cancel first and re-allow only `file:`** (the #797
rule, app-wide; the lock and launch pages carried a plaintext password on the leaked URL), and
the dark Chat-appearance screen no longer ships an empty card. The clickable rows are
`docs/walk-artifact-session-o.html`. Verdict: `docs/opus-review-brief-sessions-m-n.md` §Verdict.

⚠ **PowerShell: ONE command per block. Nothing in a code block that is not a command.**

---

## 0 · Land the batch, then the pipeline (pre-commit confirmation)

The batch lands as a tar over your tree (bridge). The generators ran in the container and every
gate is green there; re-run them on your machine before you commit.

**New files to `git add`:** `docs/opus-review-brief-sessions-m-n.md` · `docs/f5-checklist-session-o.md`
· `docs/walk-artifact-session-o.html` · `docs/commit-message-session-o.txt` ·
`docs/handoff-2026-09-05e.md` · `docs/archive/handoff-2026-09-05d-session-n-close.md` (the
archived 05d; git shows it as a rename). **Never `git add -A`** (CRLF churn).

```powershell
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"
```
```powershell
node scripts\extract-strings.mjs
```
```powershell
node scripts\build-locales.mjs
```
```powershell
node scripts\build-strings-iife.mjs
```
```powershell
node scripts\build-demo-bundle.mjs
```
```powershell
node scripts\build-shells.mjs
```
```powershell
node scripts\i18n-lint.mjs
```
```powershell
node scripts\pseudo-locale-smoke.mjs
```
```powershell
node scripts\verify-locales.mjs
```
```powershell
node scripts\build-shells.mjs --check
```
```powershell
node scripts\smoke-test.mjs
```

Expected (seen green in the container, Ixian-Core sibling PRESENT):

```
bundle 320 · shells 18 · smoke BASELINE OK 4229 / the 3 known (#136 · M5 · B3)
locales ALL CLEAN 784 · i18n-lint OK (6 dev) · pseudo 9/9 · cs-syntax 138 clean + 1 known gap
extract-strings --check OK · build-shells --check OK · build-legal-docs --check OK
strip-release --stats 102996 → 30688 · gate 2 (smoke-packaged) 4228 without the sibling
```

`bundle` reads **320**, not 321 (`PATTERN_LEVELS` retired). `locales` reads **784**, not 786
(its two labels retired with it). `smoke` reads **4229** (+95 loop pins, +2 for the #799 probe). `cs-syntax-check` reports
SKIPPED on the bridge VM; it ran in the container.

---

## 1 · Build

**C# changed** (19 page files + `SContacts.cs` · `SpixiContentPage.cs` · `Spixi.csproj`) — a real
build. Wipe `obj` and `bin` first.

⚠⚠ **WINDOWS: BUILD WITH F5, never a bare `dotnet build` (#663).** Not Rebuild Solution.

```powershell
Remove-Item -Recurse -Force Spixi\obj, Spixi\bin
```

Android, Release with dev-coexist:

```powershell
dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -p:SpixiDevCoexist=true -t:Run
```

---

## 2 · The rows

### A · Cancel-first on 19 pages (#798 MAJOR-1) — the wallet and lock paths, walked not assumed

The rule (#797): an `onNavigating` handler cancels FIRST. Before this batch nine pages cancelled
only at the tail and six more kept a permissive `else`. Nothing here should LOOK different. A
fail is a page that shows "Webpage not available", a page that goes blank, or a verb that stops
working.

| # | Do | Expect |
|---|---|---|
| A1 | Lock the app (Account → App lock ON, background 10 min or use the lock toggle) → unlock with the RIGHT password | Unlocks. (`LockPage`) |
| A2 | Lock → WRONG password → then the right one | Wrong = the error, stays on the lock; right = unlocks. No "Webpage not available" |
| A3 | Lock → a password that CONTAINS the text `ixian:unlock:` (set one on a throwaway account first) | The whole string is the password now (`Substring`, not `Split[1]`); wrong/right behave as A2 |
| A4 | Fresh install (or delete account): welcome → Create → nick + password → create | Lands in the app (`LaunchPage`) |
| A5 | Welcome → Restore → pick a file → wrong password → right password | Wrong = the error on the restore view; right = the app |
| A6 | Account → Change password → old + new | Changes; a wrong old password errors and stays (`EncryptionPassword`) |
| A7 | Account → every sublevel: Theme · Language · Notifications · Backup · Downloads · Dev · Contributors · About · Delete history | Each opens and works (`SettingsPage` · `BackupPage` · `DownloadsPage` · `DevPage` · `ContributorsPage`) |
| A8 | Account → Language → pick Deutsch → back to English | Both reloads render (the language reload is a `file:` load; it must not be cancelled) |
| A9 | Wallet → a tx → the detail page → "View in explorer" | The browser opens (`WalletSentPage` — the verb still routes; the page stays) |
| A10 | Scan a contact QR (Account → QR / add contact → scan) | Decodes and fills the address (`ScanPage` — the payload is `Substring` after the prefix now) |
| A11 | Receive a call → Accept / Decline; Hang up from the bar | All three work (`CallPage`) |
| A12 | Chats → FAB → Add contact → paste an address → Add | The request goes out (`ContactNewPage`) |
| A13 | Apps → + → add an app by URL · an app → App details → Open / Uninstall | All work (`AppNewPage` · `AppDetailsPage`) |
| A14 | Desktop: back out of a conversation to the welcome pane | The pane renders (`EmptyDetail`) |
| A15 | ★ **THE UNVERIFIED LEG — Windows.** Close the app. Delete the `html` folder beside `Spixi.exe` (Release output, #663 — NOT `Documents\Spixi\html`). Set the app lock ON beforehand. Start the app | The lock renders the #768 page NAMING the missing file (rung ③). **A BLANK lock = FAIL** → tell me: the fix is one `about:blank` clause in the shared tail, 19 places, or the Android form (Android is immune by construction: `LoadHtml` never raises `Navigating`) |
| A16 | Android: A15's setup is not reachable (assets ship in the APK) | N/A — Android is proven immune in code |

### B · The leave that lied (#798 ④) — `leaveGroup` returns the truth

| # | Do | Expect |
|---|---|---|
| B1 | Contacts → a group whose owner is NOT your contact → Leave group | Gone, no "Webpage not available" (#797 held) |
| B2 | A bot that is a MEMBER of one of your groups → its details → Leave / remove | An ERROR alert ("Unknown error has occurred."), the page STAYS, the bot is still listed. This is the honest dead end (Core refuses `removeFriend` for a group member); it used to say "Contact removed" and pop with the row still there. BE row |
| B3 | `ixian.0.log` after B1 | `leaveGroup: the leave notice could not be sent (Exception) — removing the group locally` — a TYPE name, no address, no message text |

### C · Chat appearance in DARK (#798 MAJOR-2)

| # | Do | Expect |
|---|---|---|
| C1 | Dark theme → Account → Chat appearance | TWO cards (Text size · Background). No third empty card, no stray shadowed strip below Background |
| C2 | Light theme → same screen | THREE cards; the Colour row's value ellipsizes on a long localized name (Deutsch/Slovenščina) instead of pushing the chevron off |
| C3 | Light → open the Colour sheet → flip the OS theme to dark while it is open | The sheet CLOSES and the screen rebuilds with two cards (it used to stay orphaned on top) |
| C4 | Background: None → Doodles → None → Matrix; leave and re-enter | Each step shows what you picked; re-enter shows the last pick (the two-key store, unchanged) |

### D · The strip fork gates, re-run (#792, every release)

```powershell
node scripts\smoke-packaged.mjs
```

| # | Do | Expect |
|---|---|---|
| D1 | Gate 2 | `smoke-packaged: GATE 2 OK` (4228 without the sibling) |
| D2 | Release build log | `Spixi: Release packaging strip applied (spixi.tokens.css from …)`; if the strip ever produces nothing the build now FAILS with `Spixi: the release strip produced no spixi.tokens.css` |

### E · Two riders

| # | Do | Expect |
|---|---|---|
| E1 | Apps → an app → App details → Open (single-user) | Launches; the no-home-shell fallback log line (never in a normal session) now names a SAFE app id or its length, never raw text |
| E2 | Open a mini-app | Unchanged — `ixian:painted` from a mini-app document is ignored now (it was inert before; the gate is enforced) |

---

## 3 · Commit

`docs/commit-message-session-o.txt` is the message. ONE batch. GitHub Desktop; never
`git add -A`; stage the new files by name.

---

## 4 · The pre-warm's BEFORE number (#799) — a capture, not a verdict

Release + dev-coexist on the Motorola. Open a chat, back out to the list, **8 times**; scroll the
list a little after each close as you normally would.

```powershell
& "C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe" logcat -c
```
```powershell
& "C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe" logcat -v time | Select-String "CDPERF" | Out-File -Encoding utf8 cdperf-o.log
```

| # | Do | Expect |
|---|---|---|
| F1 | 8 chat closes | Eight `[CDPERF] chats-after-close frames n=… drop=… max=…ms` lines — **PASTE them**. They are the pre-warm's BEFORE; the spare is judged against them |
| F2 | Switch conversations on desktop (tag-replace: open chat B from chat A) | NO `chats-after-close` line for that switch — the probe runs only when no conversation remains |
