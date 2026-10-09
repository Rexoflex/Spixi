# 12-FLASH — mechanism (S13, 2026-10-09)

Launch blocker (Damir, WALK #1270). Evidence: `android-s12.txt` (30 opens) · `screen-20261008-233652.mp4` (LIGHT, 48 s, 2084 frames) ·
`screen-20261008-233740.mp4` (DARK, 30 s, 1283 frames) · S11 / S10 / S9 recordings for the compare. Method: every frame scaled to 108×240,
luma per band; a frame is "blank" when the middle band std-dev < 2.5; tiles of 8 frames around each blank (viewed, not only measured).

## 1 · What Damir sees (measured)
Every warm chat open, light and dark: **list → the chat (2–3 frames, ~120–200 ms) → 1–3 BLANK frames (16–45 ms) → the chat again.**
The blank is the chat disappearing after it was already on glass — a blink, not a slow first paint.
- Light: blank = flat app ground `#f9f9fb`, or flat `#cad0d9` with a ghost of one chip (= the WebView redrawing: base colour first, tiles next).
- Dark: blank = flat `#0d1011` (≈ the dark ground) or `#22272c` with the chip ghost.
- Light recording: 12 blinks; dark: 11 blinks (+2 longer blank runs of 77–123 ms). A few opens show NO blink (e.g. light 5.6 s, 39.1 s;
  dark Gruppo 17.9 s) — the same timing rule as before S11: when the release lands before the chat's first frame, the blank hides in the open.
- Log: every open `hold release why=paint … ackf=2` and `hold grounds why=drawn rdy=1` — the S11 and S12 mechanisms both "worked" by their own signals.

## 2 · Did S12 make it worse? Not in kind.
| Build | Pattern on a warm open (recording) |
|---|---|
| S9 (`screen-20261007-164547`, #1255 "new added") | chat → 3 flat frames → chat (small chats); big chats: list → blank → chat |
| S10 (`screen-20261007-231713`, dark) | mostly list → chat (1–2 frames) → blank → chat |
| S11 (`s11 walk recording android`) | **list → chat → 2 blank + 1 ghost frame → chat on every open** (#1266 read this as "list → ground → chat" — wrong: the frame before the blank is the chat, frames 245–250) |
| S12 (both recordings) | the same as S11, light AND dark; dark makes it far more visible |
S11's candidate (release only after the chat answers `painted`) moved EVERY release to after the chat is on glass, so every open blinks.
Before S11 the release often came before the chat drew, so the same blank sat between the list and the chat and read as part of the transition.

## 3 · Mechanism (source-proven, MAUI 10.0.71)
At the release `held.stage.InputTransparent = false` (`SpixiContentPage.cs` releaseHeld). The chat stage is built with
`CascadeInputTransparent = true` (spare `:1807-1808`, cold `:3645-3646`). So:
1. Controls cascades the flag to every child: `VisualElement.InputTransparentCore` / `CoerceInputTransparentProperty` /
   `PropagatePropertyChanged` (`src/Controls/src/Core/VisualElement/VisualElement.cs:694-710, 1779-1792`) — the chat **WebView** goes
   InputTransparent true → false.
2. The chat WebView's handler is the compat `RendererToHandlerShim` = `ViewHandler<IView, Android.Views.View>` with `ViewHandler.ViewMapper`
   (InputTransparent NOT ignored; `src/Compatibility/Core/src/RendererToHandlerShim.cs:11, 44-60`).
3. Android `MapInputTransparent` → `UpdateValue(ContainerView)` (`ViewHandler.cs:611-617`) → `MapContainerView` → `HasContainer =
   NeedsContainer` (`:523-539`); on Android `NeedsContainer` is TRUE for `InputTransparent == true` (`src/Core/src/ViewExtensions.cs:91-100`).
4. true → false ⇒ `RemoveContainer` → `WrapperView.RemoveContainer`: `oldParent.RemoveView(container)` … `oldParent.AddView(platformView)`
   (`src/Core/src/Platform/Android/WrapperView.cs:184-202`) — **the chat WebView is DETACHED from the window and re-attached**. Chromium drops
   its frame on detach and re-rasters on attach: base colour → root layer (chip ghost) → content = the blank frames.
#1101 gave the STAGE a permanent container (zero shadow) — but the cascade still flips the WebView's OWN container. Every fix since S9
(native base #1249, MAUI WebView ground #1256, paint candidate #1264, grounds wait #1268) moved background writes; none touched this.
Side evidence: the `[P1] hold frame` stamps show an 87–95 ms main-thread gap right after every release (f3 → f4) = the re-parent work.
Android only (NeedsContainer has the InputTransparent clause only under `#if ANDROID`).

## 4 · Fix (one line per stage) + proof
`CascadeInputTransparent = false` on the chat stages (spare + cold). The stage's own permanent WrapperView still blocks touch while held
(`WrapperView.DispatchTouchEvent` returns false when InputTransparent, `WrapperView.cs:53-61`), so the input rule is unchanged; the WebView's
InputTransparent never changes, so it is never re-parented. Proof = a recording, light + dark, 20 opens, 0 blank frames (frame scan above);
the f3 → f4 gap should drop too.
Zero-build pre-check on the CURRENT build (optional, 2 min): Developer → "Make the chat touchable at release" OFF (the flip runs 400 ms later)
→ the blink should move ~400 ms later. If it does not move, the mechanism is wrong — stop.

## 5 · Remove layers?
With the cause known, the S12 grounds wait (`S12GroundWait`) is built on a wrong mechanism (the grounds write at ~220 ms made no blink in
the S12 recordings). Option for v1: keep the hold + the S11 paint candidate (the list stays until the chat is drawn — with no re-parent the
release is invisible) and remove `S12GroundWait` (the grounds go back at the release). Fewer moving parts before the freeze.
