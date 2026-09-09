# Next session — Session U: close the frontend

Read first: `docs/handoff-2026-09-09.md`, then `DECISIONS.md` **#821–#844**.
Records live at the bottom of `DECISIONS.md`; Android rows in `docs/android-findings.md`
(**AND-40 … AND-44** are new); the walk sheet is `docs/walk-artifact-session-t2.html`.

Damir's goal, in his words: **"finally close the FE work, and move on to other stuff."**
So this session ships the queue rather than opening anything.

---

## Item 0 · Commit Session T if it is not already in

`git add -A && git commit -F docs/commit-message-session-t.txt` — 80-odd files.
`_to_delete/` is gitignored (memdiag captures, gate harnesses). If the commit is already
there, say so and move on; do not re-derive it.

---

## Item 1 · ★ The seven queued dials — the whole point of the session

Every one is recorded WITH ITS MECHANISM. **Do not re-investigate; verify the mechanism
still holds (#215), then build.** Suggested order — cheapest and most contained first:

1. **#838** — Add app's 32 px inset. One selector beside #560's existing rule. ★ Then the
   gate that stops a fourth component paying it: **derive** the set from what `home.html`
   actually mounts into a takeover body, do not list it (#798).
2. **#841 / AND-44** — the group-create chip overflow. Truncate the label, keep the × from
   shrinking. Pattern is twelve lines below in the same file.
3. **#837** — the Requests chip count. ⚠ The same number controls whether the chip renders
   at all. **M5 is a known-red pin and must be re-read** to assert visibility, not the
   digit — otherwise the baseline-honest summary stops being honest.
4. **#842** — drop the possessive in sl-si / id-id / lt-lt, then **split the key**, because
   one key with two owners (Account = yours, chat-info = theirs) is the actual defect.
5. **#839 / AND-42** — wire `onViewContact` from `chat.html` AND give it a visible target.
   Wiring it alone reproduces Damir's report, which was "no button".
6. **#840 / AND-43** — `AppDetailsPage:197`. Send the real `app_installed`. ⚠ Check where
   the add flow then lands: the installed layout is a different screen, and the
   install-confirm morph must not be reachable in it.
7. **#836 / AND-41** — Add app and Add contact into the desktop pane. The fork is
   `rightContent.IsVisible`: takeover when hidden, page push when visible. ⚠ **This
   changes GATE 54's contract** from "never sends `ixian:newcontact`" to "sends it only
   when the pane is visible" — update the gate deliberately, with a mutation both ways.

## Item 2 · #835 — the chat background, once #837/#842 are in

Keep **Data matrix** only: retire the canvas renderer, Live flow goes with it, Doodles
goes, and drop the light-mode gradient. The Background control stops being a picker.
⚠ The walk is not the deletion — it is every reader of the two retired styles, **including
a stored preference that names one**. A device holding `doodles` must not render nothing.
Rides AND-35's chat-appearance copy + order change, so do them together as one locale round.

---

## Item 3 · What must NOT be built without a number

* **AND-40, the memory kill.** #830 refuted page accumulation on Damir's own run — do not
  re-open `Dispose()`. The floor is ~400 MB (Code 67 MB PSS / 206 MB RSS, 94 MB native
  heap, Java heap 72 KB), so 511 MB is a **spike**. It needs a run that actually kills.
* **AND-36** — one repro decides it (#826). Rotation re-homes rather than closes.
* **AND-39** — the tap fill: characterise which phase is abrupt, then measure (#294).

---

## Item 4 · The freeze, when Damir calls it (#825)

`maxLogCount 5 → 1` (GATE 23 guards the legal pair) and retiring the probe set
(`[CDPERF]` / `[SCROLL]` / `[PAINTDIAG]` / `[EXCERPTDIAG]` / `landtabprobe` / `[MEMDIAG]`,
enumerated in `docs/f5-checklist-session-t.md` §5). Both remove instruments that are still
in use while AND-40 is open — flipping them early is not getting ahead.

---

## Working rules that cost this project real time

* **#215 verify first.** Two rows on the Android list were already built (#826).
* **#294 don't guess** — narrow the mechanism, then get the device datum.
* **#798** a sweep, an enumeration or a CSS rule written from the author's list is not a
  pin. #838 is that lesson in a stylesheet; #560 wrote the general rule as two selectors.
* **#772** a comment stating an unenforced invariant is a defect. #832 fixed one that said
  so out loud; #834's constraint lived only in another file's slicing behaviour.
* **#828** a pin verified in a harness you wrote is not verified — assemble the harness
  from the suite's own header.
* **#834** an unrunnable gate is a RED row, never a fatal one.
* **The walk finds what the gates cannot.** Two sessions running, every genuinely new
  defect came from Damir holding the phone. Write rows in **pairs** — the positive and its
  control — because both fails this round came from a pair (V1/V1b, and S2's note).

## The bridge

`device_bash` = a Linux VM with the repo mounted. **No `dotnet`, no `adb`, no tree-sitter**;
`cs-syntax-check` is skipped and the C# is unvalidated until Damir builds. Full
`smoke-test.mjs` exceeds the call timeout — run individual gates in a harness built from
the suite's own header. Use `git --no-optional-locks`. The mount cannot delete; move to
`_to_delete/`.

**Android build (coexist is NOT automatic in Release):**

```
Remove-Item -Recurse -Force .\Spixi\obj, .\Spixi\bin -ErrorAction SilentlyContinue
dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -p:SpixiDevCoexist=true
dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -p:SpixiDevCoexist=true -t:Run
```

Windows: **F5 in Visual Studio, never `dotnet build`** (#663 — it does not stage the
`MauiAsset` files, so the app silently serves the previous build's shell).
