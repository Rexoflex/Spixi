# F5 checklist — batch #356–#360 (`spixi-360.tar.gz`) — Windows PC

**LANGUAGE RULE: ASD-STE100.** Short steps. One action per step. PowerShell, not CMD.

⚠ **This batch's C# was NEVER COMPILED** (no .NET in the cloud). Your build is the first
pass. Files: `SingleChatPage.xaml.cs`, `HomePage.xaml.cs`, `Utils.cs`,
`WalletContactRequestPage.xaml.cs`.

## 1. Housekeeping (before the build)

```powershell
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"
tar xzf spixi-360.tar.gz
Move-Item docs\handoff-2026-08-16b.md docs\archive\
Move-Item docs\f5-checklist-354.md docs\archive\
Move-Item docs\f5-checklist-351.md docs\archive\
```

(16c carries a superseded banner and stays until the NEXT batch. The open legs of
checklist 351 §3.3 are carried in §6 below.)

Optional sanity in the tree: `node scripts/smoke-test.mjs` → expect
**BASELINE OK — 1703 pass / the 4 KNOWN pre-existers**.

## 2. D-19 — the bot-room sender fix (#356)

1. Open # General. The four corrupted rows (Yy · 5y · 10151 · 10156) now say
   **Hidden member** — NOT "Spixi …p Chat". The avatar is the neutral one, not the
   group's.
2. Tap a Hidden-member label or avatar → **nothing opens** (no sheet, no copy). PASS =
   no group name anywhere.
3. Wait for (or ask for) a FRESH message from an active member. Roster is warm now →
   the real nickname must show. The nick/truncated-address deal for addressed rows is
   unchanged.
4. Two different named senders in a row must NOT merge into one bubble run.
5. Select several messages incl. a Hidden-member one → Copy → the clipboard lines all
   carry attribution ("Hidden member: …").

## 3. D-20 — Connecting… survives a language change (#357)

1. Kill connectivity (pull the network). Wait ~4 s → titles show **Connecting…**.
2. Account → change language. After the re-bake the titles must STILL show
   Connecting… (allow ~2–4 s for the first tick).
3. Restore the network → the state clears. Change language again while online → no
   stray Connecting… appears.

## 4. I-2 — the selected chip outline (#358)

1. Chats filters, light + dark: the selected chip has an outline; a tonal BUTTON does
   not. They must no longer read as the same thing.
2. Desktop mouse: hover the selected chip (outline shifts), press and HOLD (outline
   darkens/brightens — the pressed rung now actually paints on a mouse).
3. ★ **DIAL:** the selected-chip press no longer darkens its FILL (that wash measured
   2.31:1 against the outline in dark). Press feedback = outline + ink + the scale dip.
   Say if you want the wash back and we re-dial with a compliant pair.
4. App-details permission tags (readonly chips): hover/press does NOTHING on them now.

## 5. D-17 — the Apps first-visit flash (#359)

1. Fresh session, NO mini apps installed. Open Apps for the first time: the search
   field must NEVER appear-then-vanish. Blank beat → illustrated empty state, nothing
   jumps.
2. With apps installed: first visit shows search + rows together, no down-jump.
3. Re-enter the tab a few times: the search row must not blink.

## 6. I-6 — digit grouping (#360)

1. English UI, wallet Send: type `3000000` → the field shows `3,000,000` as you type;
   caret stays at the end. Backspace works digit-by-digit.
2. Slovenian UI: same → `3.000.000`. Type `12,5` → `12,5` (decimal). Type `12.` on the
   numpad → the field shows `12,` (period = decimal intent, mapped).
3. The review sheet: Amount / Fee / Total are grouped, FULL precision (`0,005` fee in
   sl — never `0`).
4. The over-balance alert (your `30000000` repro): the amounts in the sentence are
   grouped in the app language, full precision — the fee shortfall must be VISIBLE
   ("…10,005 … 10…", never "10 vs 10").
5. Paste tests, sl UI: paste `1500.5` into an EMPTY amount field → `1.500,5` (=1500.5,
   not 15005). Type digits after a paste → still exact.
6. Wallet list + hero: balance and tx amounts grouped per language; fiat keeps "$".
7. Tip sheet in a bot room: the custom field groups; the confirm button label matches
   the field's convention.
8. ⚠ A52 leg (later): type amounts with GBoard/IME — composition input takes a
   different path (logged residual). Also the §351 flick-cancel re-test (needs a
   longer chats list) and the compact-balance tap (needs wallet rows).

## 7. Carry-over — 2.3b (Windows tonal-hover residual)

FULL wipe first, then judge:

```powershell
Get-ChildItem -Recurse -Directory -Include obj,bin | Remove-Item -Recurse -Force
```

Rebuild, then hover a SELECTED chat row: any tonal hover left? The rule is verified
absent from source and built shells — if it still shows after the wipe, it is a real
defect and gets a row.

## 8. Commit

If the F5 passes: commit the batch (you commit; suggested message in the handoff §5).
