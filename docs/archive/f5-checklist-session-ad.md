# F5 checklist — Session AD (2026-09-23): the ours rows — eleven verbs and pushes, one purge, four keys retired

Rows: DECISIONS **#928** (the four batches, as far as they reach — what was built, what was refuted, what was
not reached) · **#929** (the #46 loop on Opus, THREE rounds: 3 + 2 + 0 MAJOR, six pin holes in round 3, all fixed;
CLEAN NOT CLAIMED — no fourth reader over the r3 fixes) · **#930** (the dials). Verdict in
`docs/opus-review-brief-session-ad.md` §6. Gate section in `docs/security-handover-gate.md` (Session AD).
**Walk sheet: `docs/walk-artifact-session-ad.html`** — 27 rows, P/F/N + notes, Copy results at the top.

**WALKED 2026-09-23 (Damir, Windows F5 + Android Debug): 22 P · 2 F · 3 N/A (#935).** F: AD.13 (a second tip could not be sent — send-side, verify which device + the alert) · AD.14 (no group typing pill — Core does not fan `msgTyping` out to members, CORE-12). N/A: AD.19 (no legacy-state contact — test later) · AD.20 · AD.23. NEW: the ⊕ attach sheet opens partially until the keyboard is opened once (suspect a stale `--kb-inset` in the #918 sheet cap). AD.0b = AC.3 CLOSED. All 19 C# files compiled on both platforms.

★ **C# CHANGED IN 19 FILES + ONE NEW FILE, AND NOTHING HERE COMPILES ANY OF IT.**
`Pages/Home/HomePage.xaml.cs` · `Pages/Chat/SingleChatPage.xaml.cs` · `Pages/Settings/SettingsPage.xaml.cs` ·
`Pages/Settings/BackupPage.xaml.cs` · `Utils/SpixiContentPage.cs` · `Utils/UIHelpers.cs` · `Utils/Utils.cs` ·
`Utils/SContacts.cs` · `Network/StreamProcessor.cs` · `Pages/Contacts/ContactNewPage.xaml.cs` ·
`Pages/Contacts/ContactDetails.xaml.cs` · `Pages/Launch/LockPage.xaml.cs` · `VoIP/VoIPManager.cs` ·
`MiniApps/MiniAppManager.cs` · `Pages/MiniApps/AppNewPage.xaml.cs` · `Meta/Node.cs` · `App.xaml.cs` ·
`Data/TransferManager.cs` · `Platforms/iOS/SPushService.cs` (iOS only — the office build is its first compile) ·
**`Meta/SChatPrefs.cs` NEW — `git add` it.** Windows F5 (never `dotnet build`, #663) and the Android Debug
deploy are the first compile of everything else. **A build error is this session's bug — paste it whole.**
Likely first suspects if one appears: a nullable warning-as-error on `FriendMessage? msg` (StreamProcessor),
`Address?` on `purgeFiles` (SContacts), the `onRepresentedNative` override modifier (SpixiContentPage vs
SettingsPage), `using System.Threading` (MiniAppManager).

Everything below RAN in the container: locales · iife · bundle · 18 shells · the `--check` gates
(`build-shells` ✓ · `extract-strings` ✓) · lint ✓ · `cs-syntax-check` **184 clean + 3 known grammar gaps** ·
both jsdom harnesses (batch 1 · batch 3) through the real `executeUiCommand` wire on the BUILT shells ·
the FULL suite on the exact tree.

**Suite, controlled BEFORE/AFTER in one environment** (container, WITH the `Ixian-Core` sibling):

| | result |
|---|---|
| BEFORE (pristine snapshot ≡ `de214173`) | `BASELINE OK — 4817 pass / the 2 KNOWN` |
| AFTER (this batch, after the r3 fixes) | `BASELINE OK — 4848 pass / the 2 KNOWN (+31)` |

Compare the DELTA in your environment, never the absolute (#895).

## 1 · Build

```
node scripts/extract-strings.mjs && node scripts/build-locales.mjs && node scripts/build-strings-iife.mjs && node scripts/build-demo-bundle.mjs && node scripts/build-shells.mjs && node scripts/smoke-test.mjs
```
then wipe `obj`/`bin` → F5 Windows → Android Debug deploy. Expect the local suite at your AC number + 31.
`git add` the NEW files: `Spixi/Meta/SChatPrefs.cs docs/opus-review-brief-session-ad.md
docs/f5-checklist-session-ad.md docs/walk-artifact-session-ad.html docs/commit-message-session-ad.txt
docs/handoff-2026-09-23b.md` — never `git add -A`. The 13 `lang/*.txt` and 12 `src/strings/draft/*.json` are
MODIFIED (new keys appended), not new.

## 2 · The walk — `docs/walk-artifact-session-ad.html`

§0 build (AD.0 · AD.0b = AC.3 still owed) · §1 batch 1 (AD.1–AD.7: CH6 under Deutsch · ★ C1/C2 two devices ·
★ C2 on a syncing wallet · ★ W11 with NO chat open · S11 + the four retired keys in F12 · #274 · C16 both legs) ·
§2 batch 3 (AD.8–AD.23: ★ S2 incl. the cancel dial · S9 from the pane · ★ CH4 favorites across a relaunch ·
the mute-aware badge · C6 tip total · C21 typist · CH8 reactor · CI2 · C4 · CO3/CO4 · ★ C17 on a legacy-state
contact · A4 the three reasons · i18n-C# under Deutsch · ★ CH3 the purge, AD.22/AD.23 — the ONLY rows that
delete files) · §3 two reads.

Rows where the NOTE is the answer: AD.3 (does the hint stay off while syncing), AD.8 (the cancel stamp — a
dial you may reverse), AD.19 (a legacy-state contact, if you have one).

## 3 · Then

Commit ONE batch (`docs/commit-message-session-ad.txt`) → the office iPhone day
(`docs/walk-artifact-ios-office.html`; the portal steps are DONE, #932) → the endgame (#916 as shaped by #933). Batch 4's medium rows (CI6 · C22 · A8 · FC1 ·
C12 · NT1(b) · PV1) and L6 wait for their own sessions; L8/L2 stay OUT.
