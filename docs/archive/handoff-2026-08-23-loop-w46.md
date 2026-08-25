# Handoff — READ FIRST. State after the #46 loop on #507–#511, and after W-4.6 was solved.

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.** Damir re-confirmed it on 2026-08-22.

★ Phone summary for Damir: **`docs/WHAT-LANDED-2026-08-22.md`**.
★ Device truth: `docs/f5-verdict-2026-08-22-notiflog-503.md` (#503) and the two logs below.
DECISIONS **#514** (#503 closed), **#515** (the loop), **#516** (W-4.6).

---

## 0. Where things stand in one paragraph

The #46 loop **ran and is CLEAN after two rounds**. It found **7 MAJOR in pass 1** and **7 more from
the fresh break-my-verdict reviewers** — including an **app-lock bypass on Windows**, a **second
bypass created by the fix for the first**, and a **lane-killing defect in the notification path**.
**#503 is CLOSED** on the notiflog. **W-4.6 is SOLVED** — Damir's failing-session log finally
arrived and named the mechanism in one line. Everything is **uncommitted** on his disk with a full
green pipeline: **2691 pass / the 3 KNOWN**. The menu batch is **unblocked and not started**.

## 1. SETUP

```
git clone --branch redesign/frontend https://github.com/Rexoflex/Spixi.git
git clone https://github.com/ixian-platform/Ixian-Core.git   # SIBLING, REQUIRED
npm install --no-save jsdom tree-sitter tree-sitter-c-sharp  # ONE call
```
Verify before touching anything: Ixian-Core clean at **097341a**; pattern **triangles 224×193.988**
default; bundle **275 exports**; **18 shells**; smoke **BASELINE OK 2691 pass / the 3 KNOWN
(#136 · M5 · B3)**; cs-syntax **142 clean + 1 known gap**; verify-locales **ALL CLEAN**.
⚠ The smoke number is **2691**, not 2580. This batch added ~111 asserts. If it differs, say so and stop.

## 2. ★★ THE FIRST THING DAMIR MUST F5 — it is a security gate

**Windows. App lock ON. Open Account → Delete account. Leave the machine 11 minutes. Come back.**
Expect an **app lock with no Cancel** on top of the authorise lock. Before this batch the app never
locked at all in that state, and one Cancel press was inside the account.

Then W-4.6's acceptance test, which is log lines and not a tick:
`lock/presented-blank` → `lock/blank-repair` → `lock/webview-onload` + `lock/blank-repaired`.
⚠ **If you instead see three `lock/blank-repair` lines then `lock/blank-repair-spent` with no
`lock/webview-onload`, the reload is the WRONG LEVER.** Re-assigning the WebView2 Source does not
revive a renderer that never loaded, and the next step is the WebView2 handler, not `LockPage`.
That branch is designed into the instrumentation on purpose.

## 3. What is closed, and on what evidence

| | |
|---|---|
| **#503** | ✅ CLOSED. `(service-extension)` appears three times in the notiflog, and `where` is a parameter with exactly two producers in the tree. See `docs/f5-verdict-2026-08-22-notiflog-503.md` |
| **W-4.6** | ✅ MECHANISM NAMED AND FIXED. `Preload of LockPage timed out — presenting anyway` → a lock presented with an unloaded WebView. The hatch could not see it: 8 `resume/entered` lines, 0 sweep lines |
| **The #46 loop** | ✅ CLEAN after two rounds. 14 MAJOR total, all fixed or deliberately deferred with a reason |
| **The pins** | ✅ rebuilt cascade-wide. 161 mutations run across both rounds; every hole found was closed |

## 4. ⚠ WHAT IS STILL OPEN, ranked

1. **The menu batch — UNBLOCKED, NOT STARTED.** All four calls are Damir's, taken 2026-08-22:
   (a) mobile **anchored dropdown** for the message menu AND the chats row menu — this fixes 4.1
   structurally; `desktop-anchors.js` already has `anchorSheetAbove`. (b) the lift STAYS, the mobile
   scrim goes deeper (`--surface-scrim`, 0.6 today). (c) desktop: **#268 STANDS, no wash** — retune
   or drop `[data-dt-ctx-source]`. (d) the QR opens a **full bottom sheet**, folding in the existing
   "What is this address?" sheet — ONE surface, not two.
2. **The two riders.** The dev HUD's 72 px rail offset (`src/shells/home.html`), and the **four
   `Logging.info` calls on the sound path** (`Node.cs:1013/1018`,
   `SpixiTransactionInclusionCallbacks.cs:37-45`).
3. **The idle-sound bug — STILL BLOCKED on those four log lines.** #294. Do not touch a trigger
   first. ⚠ New lead, not a diagnosis: the notiflog shows an "idle" app running a continuous decrypt
   retry loop — 1,397 errors in 2.5 minutes, eight payloads re-processed ~56 times each.
4. **The sound interview.** Damir has better UI SFX picks and asked to be interviewed. Conversation,
   not build time. Run it in parallel.
5. **`git rm --cached` on the 39 tarballs.** Damir's call is **taken** (#513 option a). Not executed,
   because it is a commit and nothing here is committed.
6. **BE-owned:** `Ixian-Core/Streaming/OfflinePushMessages.cs:118` creates an `HttpClient` with **no
   `Timeout`** and blocks on `.Result` at `:121` and `:186`, inside a callback OneSignal gives 30 s.
   One line closes the last of the two-rows path. **Ixian-Core is frozen at 097341a — do not touch
   it.** Raise it with the BE owner.
7. **A2.2** (a `(foreground)` log line), **A1.1's row count** (moved to #495), **iOS #503**
   (`docs/ios-nse-spec.md` §2 is a design decision Damir owes), **W-3.1** (no mechanism — screenshot
   owed), **A3.1** (which configuration ran), **`maxLogCount` = 5** (RELEASE BLOCKER marker).

## 5. DO-NOTs

1. Do not touch Ixian-Core. Five smoke pins enforce `097341a`.
2. Do not add a backdrop wash to desktop contextual menus (#268, re-affirmed 2026-08-22).
3. Do not build a second address-explainer surface — fold the existing one in.
4. Do not touch a sound trigger before the four log lines produce evidence.
5. Do not guess W-3.1.
6. **Do not "fix" the foreground `PreventDefault()` from reasoning.** MAJOR-6 is now fully
   diagnosed: the park is **bounded at 30 s**, and `NotificationWillDisplayEventArgs` has **no
   boolean overload**, so it is unfixable on the managed surface. The fix is upstream.
7. Do not re-litigate the accepted dials: 10-minute idle threshold; a short system lock does not
   lock Spixi; no new NuGet package; the Windows deactivate shield is dropped.

## 6. What this round taught — the items that compound

* ★★ **A CSS PIN THAT READS ONE RULE IN ONE FILE CANNOT PIN A CASCADE.** `rule()` read the first
  match, in one nominated file, without stripping comments. That single helper made three pins
  vacuous **and** hid a MAJOR for a whole batch. Every CSS guarantee this project has written was
  one rule in one file deep.
* ★★ **THE FRESH REVIEWER IS WHERE THE VALUE IS, AND IT PROVED ITSELF TWICE THIS ROUND** — once by
  finding that the bypass fix created a second bypass, and once by **getting an artifact the batch
  had declared unreachable**: `nuget.org` is 403, but the SDKs are open source and
  `raw.githubusercontent.com` answers. Three questions open for two sessions closed in one read.
* ★ **A PIN THAT PASSES IS NOT A PIN THAT WORKS.** 42 mutations against round 1's pins produced 16
  greens, 14 of them real holes — including two defeats of the pin written to enforce exactly that
  rule. Invent mutations the work order does not list; that is where the remaining holes are.
* ★ **PIN THE GUARANTEE, NOT THE SHAPE.** `catch (Exception beltEx) { throw; }` kept the shape and
  removed the guarantee, with the whole suite green.
* ★ **ABSENCE OF A LINE IS NOT A DIAGNOSTIC.** W-4.6's evidence was a missing `webview-onload`.
  The fix logs the blank lock at the moment it happens, because #503 taught this twice.
* ★ **A FIX CAN TRADE ONE DEFECT FOR ANOTHER** — twice this round, and both were caught by somebody
  trying to break the fix rather than by reading it.

## 7. Delivery and bridge gotchas

Windows and PowerShell at home with Android on adb, a Mac in the office for iOS. Land everything
**uncommitted** with a full green pipeline. ONE step at a time, and WAIT. Expectations in a table
OUTSIDE the pasted block, with the NUMBER to expect. `adb` is not on PATH:
`C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe`. Check the device is attached
BEFORE the run step (#450). Android:
`dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release`, then `-t:Run` as a SEPARATE command
(#320). Windows: `-f net10.0-windows10.0.19041.0 -c Debug`, then the exe separately.
`git --no-optional-locks` always. **Wipe `obj`/`bin` on any C# change (#387)** — this batch changed
eight C# files.

⚠ Land tarballs into **`_deliveries/`**, never the repo root.
⚠ `tar` needs `--overwrite`. `device_bash` is capped at 45 s — stage git adds in chunks of ~20 and
verify `diff --cached | wc -l` after each. Git strands `*.lock` files the bridge cannot delete —
`mv` them to `_to_delete/`. `git push` does not work from the bridge. **Never `git add -A`** — the
tree carries CRLF-only churn on ~116 files.
