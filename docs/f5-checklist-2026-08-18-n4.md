# F5 checklist — N4 locale expansion (#378–#379), 2026-08-18

**Order: extract → review → commit → deploy Android → F5 legs → deploy Windows → F5 legs → report.**

## 0. Extract the tarball (PowerShell, from the repo root)

```powershell
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"
tar xzf spixi-n4-2026-08-18.tar.gz
# the two consumed docs were ARCHIVED in the batch - remove the originals
# (tar cannot delete; git will then show them as renames):
Remove-Item .\docs\handoff-2026-08-17g.md
# next-session-prompt.md was REPLACED in place - no removal needed
git --no-optional-locks status --porcelain   # review the file list
```

## 1. Review + commit (GitHub Desktop, ONE batch)

Title:
```
batch: N4 locale expansion - 5 new FE dictionaries (it/id/lt/cn/ja), culture gate + pickers move together, overflow audit gate (#378-#379)
```
Body:
```
- it-it/id-id/lt-lt/cn-cn/ja-jp: legacy-reuse first (120-128 keys) + machine
  drafts (584-592), native review flagged (docs/n4-review-notes.md)
- the dictionary set moves as ONE: build-locales/verify/iife LANGS +
  Utils.cs culture gate + BOTH pickers (13 rows; #258 pending rows now real)
- setDocLang: cn-cn -> zh-cn for the DOCUMENT locale only
- riders: id-id Pay/Request legacy swap FIXED (money direction) - id-id
  de-shouted (~33 values, en canon) - 18 rework-era legacy ids drafted into
  the 5 lang txts - variant cultures (it-ch) resolve to the FILE code
- ④ overflow audit: scripts/i18n-overflow-audit.mjs (smoke gate); 29
  breakers shortened at source; 72 near-misses logged
- #46 loop on Opus x3: r1 1 MAJOR + 4 MINOR found+fixed, r3 CLEAN
- launch-set DIAL open (#378): 13 + tr/pl/ko/vi/uk proposed - no build
  beyond the five until answered
- smoke 1903 -> 1947 / the same 4 - locales ALL CLEAN 13/13 - security
  gate section #379 (nothing introduced)
```

## 2. Deploy — Android FIRST (fresh, C# changed → wipe is REQUIRED)

```powershell
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"
Remove-Item -Recurse -Force .\Spixi\obj, .\Spixi\bin -ErrorAction SilentlyContinue
dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -t:Run
```
⚠ **N60 protocol:** install OVER the existing app, do NOT uninstall first.
Watch the output for `INSTALL_FAILED_UPDATE_INCOMPATIBLE`. If it appears →
that is the N60 fingerprint; log it before working around it.

## 3. F5 legs — Android

| # | Leg | Pass = |
|---|---|---|
| 1 | Account → Language | Picker shows **13 rows with flags**; Italiano · Bahasa Indonesia · Lietuvių · 中文 · 日本語 present as REAL rows; NO "translation on the way" hint anywhere |
| 2 | Pick **Italiano** | Shell re-renders live in Italian (no reload flash, picker stays put); C# alert copy Italian; informal *tu* register |
| 3 | it amounts + dates | Wallet balance groups `1.234,56` (it convention); chat timestamps/date separators Italian; the insufficient-balance alert (send more IXI than you have) uses the SAME separators as the wallet |
| 4 | Pick **Bahasa Indonesia** → open a 1:1 chat | ★ CRITICAL: the two money buttons — **Bayar = SEND money, Minta = REQUEST money** (the legacy set had them swapped). Verify direction by opening each sheet |
| 5 | id casing | Lock screen (app-lock on) title reads "Spixi terkunci" (not TERKUNCI); Account Save button "Simpan"; payment bubbles "Pembayaran sudah terkirim/diterima" |
| 6 | Pick **中文** | Chinese UI; chat dates/weekdays render CHINESE (the zh-cn doc-locale fix); QR strings read "QR 码"; tx badges 已确认/处理中 |
| 7 | Pick **日本語** | Japanese UI; create-account form: the consent line + Terms/Privacy links read as one sentence (agent flag — report if the fragments clash); payment bubble titles Japanese |
| 8 | Pick **Lietuvių** → select 2+ messages → delete | The confirm title carries the count in the "(N)" form (e.g. "Ištrinti pasirinktas žinutes (2)?"); status badges sentence-case (Laukiama, not LAUKIAMA) |
| 9 | ru spot-check (overflow fixes) | Русский → tip sheet: the custom chip reads "Вручную" and fits; a member sheet shows "Отправить запрос" on one line; cancel-handshake modal pair fits ("Подождать") |
| 10 | Launch picker | Log out path or fresh install: the intro language pill also lists 13; picking 日本語 switches the intro live |
| 11 | Back to **English** | Everything returns to en; no stray foreign strings |
| 12 | Legacy pages | In Italian: open a legacy-rendered page (wallet send flow) — Italian there too (C# layer, pre-existing) — no mixed-language SHELL surfaces |

## 4. Deploy — Windows (two-step; -t:Run does NOT chain the build)

```powershell
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"
dotnet build Spixi\Spixi.csproj -f net10.0-windows10.0.19041.0 -c Debug
# then run the exe it produced:
Get-ChildItem .\Spixi\bin\Debug\net10.0-windows10.0.19041.0\ -Recurse -Filter Spixi.exe | Select-Object -First 1 -ExpandProperty FullName
# start it (paste the path the line above prints):
& "<that path>"
```

## 5. F5 legs — Windows

| # | Leg | Pass = |
|---|---|---|
| W1 | Account → Language | 13 rows; pick Italiano → desktop split re-renders BOTH panes in Italian |
| W2 | 中文 dates | Chat list timestamps + wallet tx dates render Chinese |
| W3 | Modal pairs | In Русский: trigger a delete-contact flow — the modal button pair fits without spill |
| W4 | Back to English | Clean return |

## 6. Report

State per leg: ✓ / ✗ + screenshot on any ✗. The 72 overflow near-misses are
the expected wobble zone — a slightly tight (not spilling) button is a note,
not a fail. Any SPILLING label = ✗ with locale + screen.
