# F5 CHECKLIST — SESSION C · L18 · L16 · L15 · L5 · L10 · L6

Build order, and **the Windows one matters** (#663):

```
node scripts/build-demo-bundle.mjs      # BEFORE shells, always (#258 §5.6)
node scripts/build-shells.mjs
node scripts/smoke-test.mjs             # expect BASELINE OK 3633 / the 3 known (#136 · M5 · B3)   ⚠ CORRECTED, session D #681: this file recorded 3632 at 16:14:30 and the L17 launcher-wire pin landed in the suite at 16:51:58, 37 minutes later
node scripts/verify-locales.mjs         # ALL CLEAN 776 — no string changed this batch
node scripts/cs-syntax-check.mjs        # 140 + 1 known grammar gap
```

★ **Build Windows with F5, not `dotnet build`** — otherwise the app silently serves the
previous build's shell from `Documents\Spixi\html\` and looks completely normal.
Android is unaffected.

⚠ **Three new files — `git add` all of them:**
`src/components/flags.js` · `Spixi/Platforms/Android/Resources/drawable/spixi_splash_icon.xml`
· `Spixi/Resources/Raw/html/img/flags/us.png`

---

## 1 · L18 — the logotype ink · ANDROID + WINDOWS, BOTH THEMES

| # | do this | expect |
|---|---|---|
| 1.1 | Chats screen, **dark** theme, mobile | the Spixi mark **and** the wordmark are neutral-01 — no blue anywhere in the logotype |
| 1.2 | Chats screen, **light** theme, mobile | ★ **unchanged, exactly as before.** If it looks different at all, say so — light was meant to be byte-identical |
| 1.3 | Desktop (Windows), **dark** | the mark at the top of the left rail is neutral-01 too |
| 1.4 | Desktop, **light** | ★ the rail mark is the same blue it has always been. It moved from `--icon-accent` to the new role, and the two resolve to the same primitive — this row is the check on that |
| 1.5 | Wallet tab (the hero) | the topbar title is unaffected — the hero rule still wins there |

⚠ **A question I asked and then withdrew.** I flagged the launch and lock logos as "still
blue in dark". Measured, they are `#98b5fc` — a pale periwinkle that reads near-white on
that gradient — and more importantly **those two screens are fixed-dark in BOTH themes**, so
"blue in dark mode" cannot be wrong there. Nothing to decide, nothing to check.

## 2 · L16 — the splash · ANDROID ONLY, and you must flip the OS theme

⚠ The OS splash follows the **OS** theme, not Spixi's in-app override (#534). A light OS
with Spixi set dark still gets the light splash, and that is not a defect.

| # | do this | expect |
|---|---|---|
| 2.1 | OS in **light**, cold-start Spixi | ground is the new blue **#175595**, and the white Spixi mark sits on it with **NO squircle / no rounded tile behind it** |
| 2.2 | same | the mark is **visibly smaller** than before (≈42% of the circle, was ≈52) and is not clipped at any edge |
| 2.3 | OS in **dark**, cold-start | unchanged near-black `#13171b` ground, same white mark, **same size as light** — the two must match |
| 2.4 | either theme, watch the hand-over | ★ no flash of the OLD darker blue between the splash and the first app frame. That window ground moved to #175595 too — it was never "the pre-31 splash", which is what an earlier draft of this row told you |
| 2.5 | Windows / iOS, cold-start | ⚠ **declared, not requested:** `Spixi.csproj`'s splash colour is dead on Android but live on these two, so their launch ground moved to #175595 as well. Confirm it reads right |

## 3 · L15 — the flags · **the emoji STAYS on mobile; only Windows changes**

★ The row shows the **platform's own emoji** wherever the device can paint one, and falls
back to `img/flags/*.png` — the PNGs that have shipped with this app since the legacy
build — only where it cannot. The check is a canvas test, not a platform guess, because
macOS has the glyphs and Windows does not.

| # | do this | expect |
|---|---|---|
| 3.1 | **Android** · Account → Language | ★ **unchanged.** The same emoji flags you already had. If any of them looks different from before, that is a defect — tell me |
| 3.2 | **Android** · the launch welcome screen, the language pill | the emoji beside "English", as before |
| 3.3 | **Windows** · Account → Language | ★ thirteen **drawn flags**, not "US CO DE". **This is the reported defect** |
| 3.4 | Windows, same list | **English** shows the US flag — `us.png` is new, the folder only had `gb.png`. It must be the SAME country the phone shows |
| 3.5 | Windows, same list | no broken-image icons anywhere in the thirteen |
| 3.6 | Windows · the launch welcome pill, then open the sheet | a flag on the pill and on all thirteen rows |
| 3.7 | Windows · pick **Deutsch**, reopen the picker | the check is on Deutsch and the flag column is still aligned |
| 3.8 | **macOS**, if you have one to hand | 🟡 expected to show the EMOJI, not the PNG — macOS has the glyphs. This is the case a "desktop = no emoji" test would have got wrong |

## 4 · L5 — the launch and lock sheets follow the phone · **MOBILE, DARK OS**

| # | do this | expect |
|---|---|---|
| 4.1 | Phone in **dark**, fresh install → welcome | the launch screen itself is the same brand dark it always was — **unchanged** |
| 4.2 | same, tap the **language** pill | ★ the sheet is **DARK**. It was light. This is the report |
| 4.3 | same, open **Terms** and **Privacy** | both dark |
| 4.4 | Phone in **light** → the same three sheets | light, exactly as before |
| 4.5 | Existing account, lock the app, tap **"Use a different wallet…"** | ★ the confirm dialog follows the phone theme. It was always light over the dark lock — **nobody reported this one**, it came out of the same line |
| 4.6 | While sitting on the welcome screen, flip the OS theme | the launch chrome does **not** move; only a sheet opened afterwards changes |

## 5 · L10 — the chat-info pane · **ANDROID, with logcat**

```
adb logcat | Select-String "CDPERF"
```

| # | do this | expect |
|---|---|---|
| 5.1 | Open **chat info on the BOT ROOM**, note the lines | ★★ **`roster burst` must be LARGER than `onLoad returned`.** That is the whole fix: it means the roster work really left the dispatcher turn. If burst is the smaller number, the post ran inline and **nothing moved** — tell me, do not read `presented` as the answer |
| 5.2 | same | `presented` should land near `document loaded` + 10–20 ms (~110 ms), like a private group |
| 5.3 | By eye | the pane appears **promptly with its skeleton**, and the member rows fill in after. Before, the whole thing appeared late |
| 5.4 | A **private group** and a **1:1** | unchanged — they never paid this cost |
| 5.5 | Open chat info and immediately press back | no crash, no stray pane |

✅ **DONE — you measured it and the probe is REMOVED.** presented **250 → 104 ms**, and
`roster burst` landed after `onLoad returned` on both opens (+18, +15), which is the proof
the post is real. §5 needs no re-walk. ⚠ Read the trade in
`docs/cdperf-2026-08-29-android.md`: time-to-CONTENT did **not** improve — the panel opens
146 ms sooner and the members land ~110 ms later. If you want both, the next lever is
chunking the roster burst.

## 6 · L6 — Account → Contacts

| # | do this | expect |
|---|---|---|
| 6.1 | **Desktop** · Chats → Account → **Contacts** | ★ the left rail stays on **Account**. It used to jump to Chats |
| 6.2 | same | ★ the right pane shows the **welcome pane**, not a conversation. Open a chat first, then do 6.1, to see it properly |
| 6.3 | same, press **Back** in the directory | Account comes back, and the rail is on Account |
| 6.4 | same, tap **Account in the rail** while the directory is open | ★ it goes back to Account. It did **nothing at all** before |
| 6.5 | same, tap **Chats** in the rail while the directory is open | the directory closes and Chats opens — the rail follows the tap, not Account |
| 6.6 | **Desktop** · start on **Wallet** → Account → Contacts | ⚠ nothing odd at the top of the window. Wallet paints the status strip with the hero colour and a takeover covers it |
| 6.7 | **Android** · Wallet tab → open **Receive**, look at the status bar | ★ readable glyphs. This is a **pre-existing** defect the same fix closed — it has shipped this way for a long time |
| 6.8 | **Android** · Chats → Account → Contacts | ⚠ **the flicker is expected to still be there.** It is not this row's — it is the parked-Account re-present, the same mechanism as **L14**, and they want one fix. Tell me if it looks different from before |
| 6.9 | **Mobile**, open a chat, then back out, then Account → Contacts | the conversation is **not** closed on a phone — that sweep is wide-only |
| 6.10 | The FAB picker on Chats, with a chat open beside it on desktop | the conversation **stays** — only the Account hand-off clears the pane |

## 7 · L17 — the launcher icon · **needs a reinstall to be seen**

★ Built from `src/assets/icons/logo.svg` — the mark already in the repo, the same one the
splash draws. There was no new SVG to wait for.

| # | do this | expect |
|---|---|---|
| 7.1 | **Uninstall**, then install, then look at the home screen / app drawer | the mark is **noticeably smaller** inside the icon, with clear padding all round — and **not clipped** on a round launcher. The old one ran to the edge |
| 7.2 | same | the ground is the new blue **#175595**, flat — no gradient. Same blue as the splash |
| 7.3 | Long-press the icon / look at it in Settings → Apps at small size | still legible at ~48px |
| 7.4 | **Windows**, the taskbar and title-bar icon | same artwork, not a black-edged square. `MauiIcon Color` was `#000000` and is now the brand blue |

⚠ A plain redeploy will usually keep showing the OLD icon — launchers cache it hard. Same
reinstall that §2 needs for the splash.

---

## What did not change, and should not have

* No string was added or removed — **locales stay at 776**.
* No Ixian-Core change.
* Nothing signs or broadcasts a transaction.
* The bridge gained exactly one outbound verb, `ixian:cleardetail`; `ixian:homeoverlay:`
  carries a level instead of a boolean and an older shell's 0/1 still mean what they meant.
* Chat isolation (#221) untouched — the conversation stays its own WebView and L6
  coordinates through C#.
