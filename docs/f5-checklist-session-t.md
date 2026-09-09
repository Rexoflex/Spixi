# F5 checklist — Session T (2026-09-08)

Records: `DECISIONS.md` **#821–#827**. Handoff: `docs/handoff-2026-09-08c.md`.

⚠ **The C# in this batch is UNVALIDATED.** This bridge has no `dotnet`, and `tree-sitter`
would not load (glibc++ mismatch), so `cs-syntax-check` was **skipped**. Four files changed:
`Spixi/Utils/SpixiContentPage.cs`, `Pages/Home/HomePage.xaml.cs`,
`Pages/Contacts/ContactNewPage.xaml.cs`, `Pages/MiniApps/AppNewPage.xaml.cs`.
**Your build is the first compile** — if something does not compile, it is here.

---

## 0 · Pipeline

Bundle before shells, always.

```
node scripts/extract-strings.mjs        # expect 787 keys (someKey is gone)
node scripts/build-locales.mjs
node scripts/build-strings-iife.mjs
node scripts/build-demo-bundle.mjs
node scripts/build-shells.mjs
node scripts/smoke-test.mjs             # must REACH ITS SUMMARY — see the note below
node scripts/verify-locales.mjs         # ALL LOCALES CLEAN
node scripts/i18n-lint.mjs && node scripts/pseudo-locale-smoke.mjs
node scripts/build-locales.mjs --check  # NEW gate — must print the ✓ line
```

⚠ **The first run of this batch CRASHED, at GATE 51, on a missing `mkdirSync` import (#828).**
Fixed. The thing to check is not a count — it is that the run **reaches its own summary line**
(`BASELINE OK … / the 3 KNOWN pre-existers`). A `ReferenceError` anywhere kills every gate after
it, so a run that stops early is a red run even if everything printed before it was green.
Report the number it prints rather than matching one I guessed.

Then **wipe `obj`/`bin`** (C# changed) and build. Windows: **F5, never `dotnet build`** (#663).

---

## ★ 1 · THE MEMORY NUMBER

Everything else here is small. This is the row that decides whether the 511 MB kill is a
WebView leak or something else, and it needs **you and the cable**.

**Rule out the heavy seed first.** On a 10 × 1000 profile neither number means anything.

Read the **FOOTER**, at launch and again after the half hour that gets it killed:

```
adb shell dumpsys meminfo com.ixilabs.spixi.dev
```

Then, from the same run:

```
adb logcat -d | grep MEMDIAG | tail -40
```

`[MEMDIAG]` prints `held=` — the app's own count of pages still holding a platform WebView.
That is **the same quantity** the meminfo footer reports as `WebViews:`. Two independent
measurements of one number, which is what makes this decisive:

| what you see | what it means |
|---|---|
| `held=` climbs with use **and** `WebViews:` climbs with it | a WebView leak — and `skipped=` says how many `Dispose()` calls the on-stack guard passed over |
| `held=` flat at 3–4 while `Native Heap` / `Graphics` climbs | **not** WebViews. Stop looking at disposal; the growth is bitmaps/native |
| the two **disagree** | the instrument is wrong before the app is — tell me, do not act on it |

**The free discriminator, if it does turn out to be WebViews:** set `CHAT_SPARE_ENABLED = false`,
rebuild, use it for the same half hour. Kills stop → the #800 pre-warm is the cause and the fix
is the disposal, not the flag.

⚠ Battery: read the temperature at the start and end of each capture. `end − start > 3 °C`
voids it, and the two arms must start within 1 °C (Session P's ladder was confounded by a
phone that warmed 6 °C on the cable).

---

## ★★ 1b · Add contact / Add app — the stutter you reported twice

You were right and I had discounted it. Both screens pushed a C# page with its own WebView
(the 130–230 ms cold boot #803 measured); they now mount inside the home shell, the way the
Account rows did in #804. **No new capability** — the same verbs, answered against the
original pages' own code, which they still use themselves.

| # | do this | expect |
|---|---|---|
| 1b.1 | Chats → FAB → **Add contact** | opens **instantly**, no page transition, no white flash |
| 1b.2 | Press back from it | you land on the contacts picker, **with your selection/scroll intact** |
| 1b.3 | Type a known contact's address | "already a contact" + a **View contact** button, before you send |
| 1b.4 | Tap **View contact** | the contact's page opens; the takeover is gone |
| 1b.5 | Type a good address → **Send** | ⭐ the button resolves on the **real answer**. A rejection now says *why*, inline — the old screen waited 6 seconds and guessed |
| 1b.6 | Send to your own address | "that's your own address", inline, no native alert |
| 1b.7 | Add contact → **Scan** → scan a contact QR | the address lands **back in the panel**, not in a new page |
| 1b.8 | Apps tab → **+ Add app** | opens instantly, same as 1b.1 |
| 1b.9 | Paste a bad link → **Get app** | inline error, button stops spinning |
| 1b.10 | Paste a good link → **Get app** | app details opens and the add panel is **gone underneath** (no stale panel to back onto) |
| 1b.11 | Add app → **Scan** an app QR | ⭐ the link lands in the URL field. It must **not** be treated as a contact address |
| 1b.12 | Add app → **From file** → cancel the picker | inline error, no wedge |
| 1b.13 | Either screen open → press **hardware back** | closes the screen, does not exit the app |
| 1b.14 | Either screen open → tap another **tab** | the screen dismisses, tab switches cleanly |

⚠ **If the old behaviour returns** (a page transition, a white flash), the shells are stale:
`build-demo-bundle` → `build-shells`, bundle first.

---

## 2 · The latch fix — two taps, and it is NOT a memory test

`disposed` was set before the on-stack guard, so it meant "Dispose() was called" — and
`OnDisappearing` calls it every time a page is **covered**. Three readers treat it as "this
page is dead". Fixed by moving one assignment inside the guard.

⚠ **This changes no memory behaviour** (for a covered page the teardown is byte-identical
before and after). It fixes guards that were firing on live pages.

| # | do this | expect |
|---|---|---|
| 2.1 | Open a contact → **Contact details** → tap a transaction → back | the **member/roster list is still there**. Before the fix it was guarded out by a page that is on screen |
| 2.2 | Same page, now press **back** again | you leave the contact. Before the fix `popPageAsync` could return early and back did nothing |
| 2.3 | Home → Add contact → back → Home → scan → back → open a chat, send a message | normal. This is the V-5 path; nothing should regress |
| 2.4 | Open a **cold bot room**, wait for the blank present at ~4 s, press back **before** 5 s | still ignored, no wrong screen popped (V-5 must be preserved) |

---

## 3 · The dim, halved in light mode (your ask)

| # | do this | expect |
|---|---|---|
| 3.1 | **Light** mode → long-press a message | the wash behind the menu is visibly lighter (0.7 → **0.35**) |
| 3.2 | Same in a bottom **sheet** and a **modal** | same lighter wash — one `.c-scrim` serves all three |
| 3.3 | **Dark** mode, same three | **unchanged** |
| 3.4 | Open a media tile / the call stage / an app hero, both themes | ⚠ **unchanged, and deliberately.** Those carry near-white text on the scrim; halving them would put white on a barely-dimmed photo. Say so if you want them moved anyway |

---

## 4 · The six English strings, in twelve languages

| # | do this | expect |
|---|---|---|
| 4.1 | Settings → **Deutsch** → Account | the **address line** under your address is German ("Das ist deine Adresse…") |
| 4.2 | A contact → the peer **address sheet** | title + body German, `Ixian` and `IXI` intact |
| 4.3 | A contact row → **Remove contact** | the option label is German |
| 4.4 | Spot-check one more locale (fr / sl / ru) | same four surfaces translated |

---

## 5 · The two release blockers — deliberately NOT flipped

Both are one-liners and both were left alone **on purpose**; flip them in the freeze batch.

* **`maxLogCount = 5 → 1`** (`Spixi/Meta/Config.cs:101`). Cutting retained log files to one
  removes exactly the history §1 depends on, plus the AND-25 and AND-27 logcats still owed.
  GATE 23 already guards the legal pair, so the flip is seconds whenever you want it.
* **Retiring the probes** (`[CDPERF]`, `[SCROLL]`, `[PAINTDIAG]`, `[EXCERPTDIAG]`,
  `landtabprobe`) — this session **added** `[MEMDIAG]`, and the question it exists for is
  still open. Retire the set together, each with its pin, once §1 has answered.
