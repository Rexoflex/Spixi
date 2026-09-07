# F5 checklist — Session R (the security handover sweep and its fix batch)

**Read `docs/handoff-2026-09-07.md` first.** This batch is security work, so most of it is
invisible when it works. The rows below are the ones a user can see, plus the ones that would
break loudly if a fix is wrong.

⚠ **This batch touched a lot of C#.** `cs-syntax-check` proves braces, not types. Your build is
the first compile. Expect the compile itself to be the first real test.

## §0 — the pipeline, in this order

```
node scripts/extract-strings.mjs
node scripts/build-locales.mjs
node scripts/build-strings-iife.mjs
node scripts/build-demo-bundle.mjs      # BEFORE shells, always
node scripts/build-shells.mjs
node scripts/i18n-lint.mjs
node scripts/pseudo-locale-smoke.mjs
node scripts/verify-locales.mjs
node scripts/cs-syntax-check.mjs
node scripts/smoke-test.mjs
```

Expect: bundle **321 exports** · **18 shells** · locales **786 ALL CLEAN** · lint ✓ (6 dev) ·
pseudo **9/9** · cs-syntax **138 + 1** · smoke **BASELINE OK — 4613 pass / the 3 KNOWN
pre-existers (#136 · M5 · B3)** with the Ixian-Core sibling present.

Then wipe `obj` and `bin` and build. **Windows: F5 in Visual Studio, never `dotnet build`** —
it does not stage `MauiAsset` and the app then silently serves the previous build's shell (#663).

⚠ **`nuget.config` changed and it cannot be validated without a restore.** If the restore fails,
that file is the first suspect. It must resolve `RocksDB 0.0.42` from the local feed for
android/ios AND `10.4.2.64152` from nuget.org elsewhere.

## §1 — the three things a user can actually see

| # | do this | pass |
|---|---|---|
| 1.1 | Have someone send you a Tenor or Giphy link in a chat. | It still renders as a tile and loads |
| 1.2 | Have someone send you a link to an image on ANY other host — e.g. `https://example.com/x.png`. | It renders as a **plain confirm-to-open link**, not a tile. ⚠ This is the intended change. It is what the baseline did, and it is what Android and Windows already enforced at the network layer |
| 1.3 | Account → Privacy. | There is a switch for loading pictures and GIFs. Turn it off, open a conversation with media, and the tiles do not load |

## §2 — the security fixes, and how you can tell they are alive

| # | do this | pass |
|---|---|---|
| 2.1 | Tap an ordinary `https://` link in a chat. | The confirm shows the URL, and opening it works exactly as before |
| 2.2 | Ask someone to send `https://paypal.com@evil.example/login`. ⚠ Use a host you own or a nonsense one. | The app **refuses** it. Before this batch the confirm showed one host and the browser opened another |
| 2.3 | Settings → About / How to use / the explorer link / the support mail link. | All still open. They all now go through one gate, so if one is broken they are all suspect |
| 2.4 | **iOS only** — open the QR scanner. | The camera comes up and a code scans. ⚠ **This is the row I am least sure of.** The capture gate is new. If it fails, `ixian.log` carries `[cam-perm] … DENIED reason=…`, and the word after `reason=` is the answer |
| 2.5 | **iOS only** — open a mini-app. | It loads and works. Its browser storage is now separate from the app's, which mini-apps should not notice: the SDK gives them their own storage through C# |
| 2.6 | Restore an account from a backup you made with this app. | It restores. The restore path gained a fence, and a real backup must pass it |
| 2.7 | Send a payment to a contact whose nickname is long. | The native confirm shows the nickname on ONE line, clamped, with the **address always beneath it** |

## §3 — the storage sweeps

| # | do this | pass |
|---|---|---|
| 3.1 | Type a draft in a chat, leave without sending, remove the contact. | Re-add them: the draft is gone |
| 3.2 | Same with **Leave group**, and with **Delete chat history** from the contact/group info screen. | The draft is gone. Before this batch these paths cleared nothing |
| 3.3 | Account → delete all chat history. | Every conversation's draft is gone |

## §4 — the memory report, and it is the one I most want a number for

This is NOT part of the batch. It is Damir's report from the same day: the app is killed after
about half an hour, Settings shows 511 MB maximum.

```
adb shell dumpsys meminfo io.ixian.spixi.dev
```

Take it at launch, then again after the half hour that gets it killed. Read the **footer**:
the `WebViews:` count, and the `Native Heap` / `Dalvik Heap` / `Graphics` split.

* `WebViews:` grows with use → a WebView leak; the suspect is in the handoff, §"NEW".
* `WebViews:` stays 3–4 while Native or Graphics grows → not WebViews.

Then the free discriminator: set `CHAT_SPARE_ENABLED = false`, rebuild, use it for the same half
hour. Kills stop → the pre-warm is the cause.

⚠ Rule out the heavy seed first. On a 10 × 1000 profile neither number means anything.

## §5 — what to report back

For each row: pass, fail, or n/a. For a fail, the exact symptom, and — if it is 2.4 — the
`[cam-perm]` line. For §4, the two footers.
