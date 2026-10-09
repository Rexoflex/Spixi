/* ==== S13 (#1277, Damir 10:11 + interview) — the chat → chat info → group flow, chat info's own blink, Back at the root ====
 * Pinned on comment-stripped source (MAUI-bound C#, uncompiled here):
 *   · a chat → chat swap (an overlay chat while another chat is open) is HELD like a list → chat open, and the same-tag
 *     sweep is DEFERRED until the new chat's grounds come back (PreloadOp.deferredStale → closeDeferredStale in setHoldGrounds(false)):
 *     the old chat stays on glass under the new chat's transparent grounds until the new chat has drawn
 *   · closeDeferredStale closes nothing when the new chat started closing (the user went back → the old chat stays)
 *   · Android Back on the chats list → MoveTaskToBack(true) (background, no activity finish), the old exit as a fallback
 * Deliberate breaks (S13 lead): the sweep closing at once · the release not calling closeDeferredStale · the closing guard
 * dropped · MoveTaskToBack removed — each fails its key. */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join } = h;
  const SCP = stripCode(readFileSync(join(root, 'Spixi/Utils/SpixiContentPage.cs'), 'utf8'));
  const HP = stripCode(readFileSync(join(root, 'Spixi/Pages/Home/HomePage.xaml.cs'), 'utf8'));
  const between = (s, a, b) => { const i = s.indexOf(a); const j = i < 0 ? -1 : s.indexOf(b, i + a.length); return i < 0 || j < 0 ? '' : s.slice(i, j); };
  const rel = between(SCP, 'private static void releaseHeld(', 'private sealed class S12GroundWait');
  const hold = between(SCP, 'private static void holdStageUntilDrawn(PreloadOp op)', 'private static void p1HoldProbe(');
  const helper = between(SCP, 'private static void closeDeferredStale(PreloadOp held)', 'private static bool tryHoldUntilDrawn(');
  const back = between(HP, 'protected override bool OnBackButtonPressed()', 'protected override void OnAppearing()');
  const r = {
    field: /public List<PreloadOp>\? deferredStale = null;/.test(SCP),
    swapHeld: /else if \(overlayMode && tag == "chat" && target is SingleChatPage && chatOpenNow\)\s*\{\s*op\.holdUntilDrawn = true;\s*op\.deferredStale = new List<PreloadOp>\(\);\s*\}/.test(SCP),
    sweepDeferred: /if \(op\.deferredStale != null && op\.holdUntilDrawn\)\s*\{\s*op\.deferredStale\.AddRange\(stale\);\s*foreach \(PreloadOp s in stale\)\s*\{\s*s\.swappedOut = true;\s*try \{ s\.stage\.InputTransparent = true; \} catch \(Exception\) \{ \}\s*\}\s*\}\s*else\s*\{\s*foreach \(PreloadOp s in stale\)\s*\{\s*closeOverlay\(s\);\s*\}\s*\}/.test(SCP),
    helper: /List<PreloadOp>\? stale = held\.deferredStale;\s*held\.deferredStale = null;\s*if \(stale == null \|\| stale\.Count == 0\)\s*\{\s*return;\s*\}\s*if \(held\.closing\)\s*\{\s*PreloadOp back = stale\[stale\.Count - 1\];\s*bool top;\s*lock \(preloadLock\)\s*\{\s*PreloadOp\? topChat = overlayStack\.FindLast\(o => o\.target is SingleChatPage && !o\.closing\);\s*top = topChat == back && overlayStack\.Contains\(back\);\s*\}\s*if \(top && !back\.closing\)\s*\{\s*back\.swappedOut = false;\s*try \{ back\.stage\.InputTransparent = false; \} catch \(Exception\) \{ \}\s*try \{ back\.host\.onOverlayPresented\(back\.target\); \}[^\n]*\s*\}\s*return;\s*\}\s*foreach \(PreloadOp s in stale\)\s*\{\s*try \{ closeOverlay\(s\); \}/.test(helper),
    onGroundsBack: /native\.SetBackgroundColor\(held \? Android\.Graphics\.Color\.Transparent\s*: Android\.Graphics\.Color\.ParseColor\(op\.target\.pageSurfaceColorString\)\);\s*\}\s*if \(!held\)\s*\{\s*closeDeferredStale\(op\);\s*\}\s*\}/.test(SCP),   /* the LAST step of setHoldGrounds: after the grounds are painted back */
    callCount: (SCP.match(/closeDeferredStale\(/g) || []).length === 2,   /* the definition + the one call in setHoldGrounds */
    swappedGuard: (SCP.match(/!held\.closing && !held\.swappedOut/g) || []).length === 3 && /public bool swappedOut = false;/.test(SCP),
    backHome: /#if ANDROID\s*try\s*\{\s*global::Android\.App\.Activity\? act = Microsoft\.Maui\.ApplicationModel\.Platform\.CurrentActivity;\s*if \(act != null && act\.MoveTaskToBack\(true\)\)\s*\{\s*return true;\s*\}\s*\}\s*catch \(Exception ex\)\s*\{[^}]*\}\s*#endif\s*return base\.OnBackButtonPressed\(\);/.test(back)
      && back.indexOf('MoveTaskToBack') > back.indexOf('closeTopOverlay(true)') && back.indexOf('MoveTaskToBack') > back.indexOf('homeShellOverlayOpen'),
  };
  ok(Object.values(r).every((x) => x === true),
    '★ S13 (#1277): a chat → chat swap is held and the old chat stays on glass, input-dead, and closes only when the new chat\'s grounds come back (after its WebView drew, #46 r1 M1); kept, input-live and re-selected when the user backs out of the new chat; Android Back on the chats list moves Spixi to the background (no activity finish), after every overlay / shell route — ' + JSON.stringify(r));
}
