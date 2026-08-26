# F5 checklist — 2026-08-29 batch (#624–#637)

Everything below is built and green in the suite. ⚠ **`cs-syntax-check` PARSES, it does
not COMPILE (#593)**, and this batch DELETES a C# page — exactly the change a compile
catches and a parse cannot. **Build before you walk this.**

## Build sequence — the whole pipeline, in this order

```
node scripts/extract-strings.mjs      # 772 keys, 0 fallback conflicts  (773 → 772 is DELIBERATE)
node scripts/build-locales.mjs
node scripts/build-strings-iife.mjs
node scripts/build-demo-bundle.mjs    # 299 exports  (298 → 299 is DELIBERATE: attachAmountPreEdit)
node scripts/build-shells.mjs         # 18 shells
node scripts/i18n-lint.mjs            # ✓
node scripts/verify-locales.mjs       # ALL LOCALES CLEAN
node scripts/pseudo-locale-smoke.mjs  # 9/9
node scripts/smoke-test.mjs           # BASELINE OK — 3399 pass / the 3 known (#136 · M5 · B3)
node scripts/cs-syntax-check.mjs      # 143 + 1 skipped  (144 → 143 is DELIBERATE: one page deleted)
```

⚠ **`git rm` is already staged for three files** — `WalletContactRequestPage.xaml`,
`WalletContactRequestPage.xaml.cs`, `Resources/Raw/html/wallet_contact_request.html`.
Wipe `Spixi/obj` and `Spixi/bin` before building: a deleted page leaves a stale generated
partial behind.

---

## 1 · The money path — the priority (#624–#628)

**1.1 The paste defect (V-1).** Set the app language to **Deutsch**. Wallet → Send → pick a
contact. Type `5` in the amount, **select it all**, paste `12.75`.
→ the field reads **12,75** and the review sheet + the native confirm both say **12.75**.
✗ if either says 1 275 or 1.275. *(Before this batch it put 127 500 000 000 units on the wire.)*

**1.2 The same gesture on the other three surfaces.** Chat → long-press a message → Tip →
Custom → type `5`, select all, paste `0.05` → the confirm says **0.05**, not 5.
Wallet → Receive → amount `5`, select all, paste `12,75` in **English** → the request asks 12.75.
Chat → ⊕ → Request → same.

**1.3 The fence — this one must NOT change.** English. Amount `1234` (the field shows
`1,234`), put the caret at the END and paste `5` → **12345**. If it reads 1.2345 the fix
went too far.

**1.4 The foreign-convention half (#625).** Deutsch, EMPTY amount field, paste `1,234.56`
→ **1234.56**. English, empty field, paste `1.234,56` → **1234.56**.
And the ambiguous pairs must be UNCHANGED: Deutsch `1,500` → 1.5 · English `1,500` → 1500 ·
`12,5` → 12.5 in both. 🟡 **This is the change you may want to veto** — say so and I back it out.

**1.5 ★ The tip's native confirm (#626).** Chat → long-press → Tip → a preset chip → Tip.
→ the **native dialog** appears with the amount, the recipient and the fee.
· **Confirm** → the tip sends and the pill lands.
· **Cancel** → the sheet comes back with **no error line** and no tip pill anywhere.
· Leave the dialog open for two minutes, then Confirm → it still works and the sheet does
  not accuse it of being lost.
· Custom amount → the same dialog.

**1.6 V-4.** Wallet → Send → pick a contact → type `.5` → Continue opens the review and
sends **0.5**. Then `12.` → sends 12. *(Both used to enable Continue and do nothing.)*

**1.7 Enter still cannot spend.** Tip → Custom → type an amount → press the keyboard's
**Done**. The keyboard drops and **nothing is sent**.

---

## 2 · The navigation drop (#629)

**2.1 Fast clicks.** Desktop. Click through the chats list quickly, four or five rows.
→ every click opens its chat. *(Every click inside the previous chat's 4000 ms stage was
dropped silently.)*

**2.2 ★ The first click after a cold start.** Kill the app, launch it, and the moment the
chats list paints, tap a chat.
→ it opens. *(This is the one the Account warm-park was eating.)*

**2.3 The same row twice.** Tap one chat, then tap it again immediately.
→ it opens once and is not slower. *(A restart-on-every-tap would be the regression.)*

**2.4 A notification tap** into a chat while the app is cold → lands in that chat.

---

## 3 · Chat info presents first (#630)

**3.1** Open a conversation → tap the header (or ⓘ).
→ the pane **slides in from the right** and you see the **skeleton** (hero disc + three
shimmering rows) before the content, and the content **crossfades** over it.
🟡 Your call: is the slide alone enough, or is the crossfade earning its place?

**3.2** Every other screen must feel exactly as before — Account, a wallet tx detail, the
add-contact pane. If any of those got faster or flashier, the per-op hold leaked.

**3.3 The probe.** Open chat info twice and send me the `[CDPERF]` lines from `ixian.0.log`:
```
[CDPERF] contact constructed +Nms (ctor + generatePage)
[CDPERF] document loaded +Nms
[CDPERF] presented +Nms
[CDPERF] content painted +Nms
```
That tells us where the REST of the wait is — the 120 ms hold was only part of it, and
`generatePage` re-localizes and rewrites a 168 KB shell to disk on every open. **The probe
comes out once we have the number.**

---

## 4 · Remove contact (#634)

**4.1** Chats → long-press a contact row → **Delete** → the sheet has **three** checkboxes.
"Remove contact" is **unticked**. Press Delete → the chat goes and **nothing else opens**.

**4.2** Same again, but **tick** Remove contact → the group sheet opens.

**4.3 ★** With a shared group ticked, press **Leave 1 & remove**.
→ the sheet **closes first**, and only then does the confirm appear. You must never see
both at once. *(Your screenshot had the dialog stacked on the open sheet.)*

**4.4** The two buttons in the group sheet are **equal width**, side by side.

**4.5 ★ Contact details → Remove contact** on a contact who IS in one of your groups.
→ you get the **same sheet**, with the group listed and tickable — not the old
"Cannot remove contact … OK" dead end.

**4.6** A group row's Delete offers **two** boxes, not three.

---

## 5 · Payments: the native page is gone (#635/#636)

**5.1 ★** Have someone send you a payment request. The card shows **Pay** and **Decline**.
· **Decline** → the card flips to declined **on both devices**.
· **Pay** → the review sheet → the native confirm → sent.
· There is **no Details link** on a pending request any more.

**5.2** A payment request in a **group** renders as a plain record — no Pay, no Decline.

**5.3 ★ The white error page must be gone.** Get a request, have the sender **cancel** it,
then tap the card. Nothing should crash or show a white page.

---

## 6 · Kick / ban (#637)

**6.1 ★ The half to protect:** Spixi community room → tap a member as admin → **Kick and
Ban are still there** and still work.

**6.2** A private group, as its owner → tap a member → **no Kick, no Ban**.
*(They were doing nothing: Ixian-Core's handler is an empty case.)*

**6.3** Deleting messages in a private group still works — untouched.

---

## 7 · Press feedback (#633)

**7.1** Apps tab → the **Explore banner** now responds to a tap. *(It has done nothing at
all since #622.)* 🟡 Dial: it takes the 3% control scale — too much movement for an 84px
card, or right?

**7.2** Chat info → the action row (#618's) → no **square** platform rectangle over the
rounded card on Android.

**7.3 ★ Android:** open a mini-app from the picker → **no ghost rectangle** on the tile
after the app opens. Then come back and tap a tile → it still lights up normally.

---

## ★ Before the Android leg

`adb` is not on PATH on this machine and the SDK is NOT where Android Studio puts it.
See **docs/android-test-quickstart.md → STEP ZERO** — it has the one-time fix that makes
`adb devices` work in every new shell for good. Do that before any
`dotnet build -f net10.0-android`.

The Windows leg needs none of this, and it covers every row here except §7.3 and the
Android half of §7.2. The `[CDPERF]` lines land in `ixian.0.log` on Windows too.

## What I could not test, and who has it

* Everything in §2, §3, §6 and §7.3 is **Windows or Android** — no Mac needed.
* §1.5 needs a **second device** only for the tip pill; the dialog itself does not.
* §5.1 and §5.3 need a **second device**.
* Nothing in this batch is iOS-only.
