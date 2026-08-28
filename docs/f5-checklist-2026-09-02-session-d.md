# F5 CHECKLIST — session D, 2026-08-28

**L13 · F5 4.7 (Option 2) · the ⏱ [LANDTAB] measurement · two cleanups.**
Decisions #676–#682. Handoff: `docs/handoff-2026-09-02.md`.

## 0 · Re-prove the baseline before you touch anything

```
node scripts/build-demo-bundle.mjs       # expect 307 exports  (BUNDLE BEFORE SHELLS)
```
```
node scripts/build-shells.mjs            # expect 18 shell(s) written
```
```
node scripts/smoke-test.mjs              # expect BASELINE OK 3659 / the 3 known (#136 · M5 · B3)
```
```
node scripts/verify-locales.mjs          # expect ALL LOCALES CLEAN ✓ · 779
```
```
node scripts/cs-syntax-check.mjs         # expect 140 file(s) parse cleanly ✓ · 1 skipped
```
```
node scripts/i18n-lint.mjs               # expect ✓
```
```
node scripts/pseudo-locale-smoke.mjs     # expect 9/9
```

⚠ **Build Windows with F5, never `dotnet build`** (#663) — `dotnet build` does not stage
the MauiAsset files beside `Spixi.exe`, `localizeHtml` returns without writing, and the app
serves the PREVIOUS build's shell while looking completely normal. Android is unaffected.

⚠ **This batch DELETES sixteen files.** A tarball cannot delete. Run the `git rm` in §6
BEFORE you build, or the old launcher set is still in the APK.

⚠ **UNINSTALL before the Android run.** Launcher icons cache hard (§4).

---

## 1 · L13 — the leave-group check box (the headline)

Two devices if you can; one device tells you most of it.

1.1 **A GROUP row → long-press → Delete chat.** The modal has **THREE** boxes now:
"Delete chat" (ticked, greyed — it IS the action) · "Delete media & files" · **"Leave
group"**, and a line under them: *"Everyone in the group is told you left, even if they are
offline right now."*
· ⚠ **"Leave group" must start UNTICKED.**
· ⚠ There must be **no "Remove contact"** box on a room.

1.2 **Leave it unticked → Delete.** The row goes, the chat history goes, and **you are
still in the group** — send a message from the other device and the room comes back.

1.3 **Tick it → the red button changes to "Leave and delete"** (that is F5 4.7, §2).
Confirm. The row goes and stays gone. On the OTHER device the leaver disappears from the
member list.

1.4 ★ **The offline leg — this is the claim the note makes.** Kill the app on device B (or
put it in flight mode), leave the group from device A, then bring B back. B should learn
about the leave: the roster loses you. **If it does not, the note is a lie and the row is
not done.**

1.5 ★★ **OWNER leaves.** If the leaver is the group's OWNER, the group is removed outright
on every member's device — not just the roster entry. Worth one deliberate run.

1.6 **A BOT room takes the same path** (`isRoomRow` covers `type === 'bot'`). Same three
boxes, same wording.

1.7 **A refusal must not lie.** Hard to force deliberately; if you ever see the row vanish
and come back with an error toast *"You could not leave the group."* — that is correct
behaviour, not a bug. Tell me if you see it with no toast.

1.8 **A PERSON's row is unchanged.** Three boxes, the third is "Remove contact", ticking it
still opens the remove-contact sheet with the shared groups. No "Leave group" anywhere.

## 2 · F5 4.7 — the confirmation, your Option 2

2.1 On a group row's Delete modal the red button reads **"Delete"**.
2.2 Tick "Leave group" → it reads **"Leave and delete"**.
2.3 **Untick it → it goes back to "Delete".** (A one-way relabel would promise a leave you
had already cancelled.)
2.4 On a PERSON's modal, ticking "Remove contact" **does not** change the button.

## 3 · ⏱ THE [LANDTAB] MEASUREMENT — the one thing only you can do

This is the whole point of not building L14 yet.

3.1 **Android.** Do the exact order: **Chats (or Apps) → Account → Wallet.** Then:

```
adb logcat | Select-String "LANDTAB"
```

Expect one line per hand-off:
`[LANDTAB] consumer=<storage|visibility|focus|settingsclosed> age=<n>ms`

3.2 **What the answer means — and it can kill the theory.**
· `consumer=settingsclosed` → the LATE path won. The trace holds, the flicker is the
  parked-peer re-present, and the C# fix is the right one.
· `consumer=storage` → the tab was already switched **before** the reveal, and the
  mechanism I traced **cannot** be the flicker. The row starts over. That is a real
  possible outcome and it is why we measured.
· `age` is how long the hand-off sat unread. Big number, big flicker.

3.3 **Repeat it 4–5 times** — the first run after a cold start is not the same as the rest.

3.4 ★ **Free falsifier: do the same order on DESKTOP.** Account is a PANE there and never
parks a tab, so the traced mechanism cannot produce a flicker on desktop. **If it flickers
on desktop too, the theory is wrong** — tell me, do not assume it is a second bug.

3.5 ⚠ **The probe is temporary and leaves as a trio** the way [CDPERF] did. Once you have
the numbers it goes: the C# handler, the shell emit, the pin.

## 3b · #685 · the chat-info slide — slower and smoother

3b.1 Open a chat → tap the header → **Chat info**. The panel slides in over **300 ms**
(was 220) and, more to the point, it now **eases out of rest** instead of being at full
speed on frame one. That start is what you were reacting to.
3b.2 **Back out of it.** The exit is deliberately still 220 ms and slightly snappier than
the entry — you have already decided to leave. If that reads wrong, say so; it is a dial.
3b.3 Nothing else in the app should have changed pace. Sheets, dropdowns and dialogs are a
different mechanism and were not touched.

## 4 · The launcher icon (#683 · #679) — ⚠ UNINSTALL FIRST

4.1 **Uninstall Spixi from the device.** Do not redeploy over it. Launchers and the splash
theme are cached hard and a plain redeploy shows the old ones — this is what cost the two
rebuilds.
4.2 Install. The launcher shows the **new** icon.
4.3 **#683 — the new ground and the bigger mark.** The background is your gradient
(`#0A58A9` under the two 50% stops, bright at the top-right) and the mark now fills **58%**
of the visible icon, up from 50%.
⚠⚠ **IF THE BACKGROUND COMES OUT FLAT `#0A58A9` WITH NO GRADIENT, THAT IS A REAL ANSWER,
NOT A GLITCH** — it means the MAUI resizetizer substituted `MauiIcon`'s flat `Color` for the
background instead of rasterising `appicon.svg`. I could not read the resizetizer from here
to settle it in advance. The receipt is one file, and I can look at it over the bridge in
seconds:

```
obj/Debug/net10.0-android/resizetizer/r/mipmap-xxxhdpi/appicon_background.png
```

4.4 The old set being deleted should change **nothing** on its own — #671 already repointed
the attribute. **If the mark or the shape changes in a way #683 does not explain, something
DID reference the old set and I was wrong.**

## 5 · The `payments` cleanup (#678) — nothing to see, which is the point

`build-shells payments` no longer exists as a target. Nothing in the app changes. The check
is §0: 18 shells, and `Resources/Raw/html/wallet_send.html` still absent.

## 6 · Commit

```
git rm Spixi/Platforms/Android/Resources/mipmap-anydpi-v26/ic_launcher.xml Spixi/Platforms/Android/Resources/mipmap-anydpi-v26/ic_round_launcher.xml Spixi/Platforms/Android/Resources/drawable/ic_launcher_background.xml Spixi/Platforms/Android/Resources/drawable/ic_launcher_foreground.xml
```
```
git rm Spixi/Platforms/Android/Resources/mipmap-ldpi/ic_launcher.png Spixi/Platforms/Android/Resources/mipmap-mdpi/ic_launcher.png Spixi/Platforms/Android/Resources/mipmap-hdpi/ic_launcher.png Spixi/Platforms/Android/Resources/mipmap-xhdpi/ic_launcher.png Spixi/Platforms/Android/Resources/mipmap-xxhdpi/ic_launcher.png Spixi/Platforms/Android/Resources/mipmap-xxxhdpi/ic_launcher.png
```
```
git rm Spixi/Platforms/Android/Resources/mipmap-ldpi/ic_round_launcher.png Spixi/Platforms/Android/Resources/mipmap-mdpi/ic_round_launcher.png Spixi/Platforms/Android/Resources/mipmap-hdpi/ic_round_launcher.png Spixi/Platforms/Android/Resources/mipmap-xhdpi/ic_round_launcher.png Spixi/Platforms/Android/Resources/mipmap-xxhdpi/ic_round_launcher.png Spixi/Platforms/Android/Resources/mipmap-xxxhdpi/ic_round_launcher.png
```
```
git add docs/handoff-2026-09-02.md docs/f5-checklist-2026-09-02-session-d.md
```
```
git --no-optional-locks diff --ignore-cr-at-eol --stat
```

The commit message:

```
Session D: L13 leave-group check box · F5 4.7 Option 2 · the [LANDTAB] probe · two cleanups

L13 (#676): a room's delete flow gains a "Leave group" box, OFF by default, and one
verb — ixian:leavegroup:<addr> → SContacts.leaveGroup, called not re-inlined. Core's
removeFriend deletes the history file itself, so the leave satisfies the fixed
"Delete chat" box alone; two sends would race and the loser would un-tombstone a
correctly-gone row. leaveGroupResult answers "left" | "fail" — a room is never
"blocked". The open conversation is resolved before the leave and popped after.

F5 4.7 (#680): Damir's Option 2. One modal; the red button reads "Leave and delete"
while the box is ticked and "Delete" when it is not.

L14/L6-3 (#677): NOT built. The mechanism is confirmed at source (the parked stage is
hidden before onOverlayClosed pushes onSettingsClosed) but verifying a fix is the L10
class, so a temporary [LANDTAB] probe ships instead, on Damir's call. It removes as a
trio.

#678: the dead `payments` shell target is deleted — its destination was removed in
session A, so building it would have re-created the legacy money page.
#679: the orphaned Android launcher set is deleted, sixteen files, on device
confirmation.
#681: the entry baseline was recorded one pin low; corrected in three docs.
#682: mutation found two vacuous pins of mine — a fixed-length slice and an unanchored
key name. Both repaired.

bundle 307 · shells 18 · smoke 3653 / the 3 known · locales 779 · cs-syntax 140+1
```

## 7 · What you are NOT being asked to walk

* Anything from session C — that walk is done and its fixes shipped.
* L14's fix. There isn't one yet, deliberately.
