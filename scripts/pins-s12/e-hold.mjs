/* ==== S12 E (#1266 / #1267, V-26) — the chat-open flat ground frame. Walk #1266 measured ONE frame of the plain page ground
 * between the list and the chat on every held open (and on the cold open): the release painted the grounds opaque before the
 * native chat WebView had drawn (dirty=0 on every held frame). The fix (MAUI-bound C#, pinned here on comment-stripped
 * source; the pure decision S11ChatRules.groundStep / groundLine is EXECUTED in scripts/csh/S12HoldTests.cs):
 *   · releaseHeld: on the CANDIDATE path with a view, the grounds go through S12GroundWait; otherwise the immediate write
 *   · S12GroundWait (#46 r1 / r2): posts the WebView's visual-state callback (ready → invalidate), counts view-tree draws after
 *     it (OnDrawListener) and Choreographer frames, asks groundStep each frame (cap 300 ms + a timer), and at the end
 *     writes the grounds back ONLY if no newer hold owns the stage (deferredOwns), then the [P1] line
 *   · the COLD chat open (presentOverlay, Android, overlayMode + tag "chat") takes the same hold + the spare's zero shadow
 * Deliberate breaks: the S12 lead's report. */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join } = h;
  const rd = (p) => stripCode(readFileSync(join(root, p), 'utf8'));
  const bodyOf = (sc, head, from = 0) => {
    const at = sc.indexOf(head, from);
    if (at < 0) return '';
    let i = sc.indexOf('{', at);
    if (i < 0) return '';
    const start = i;
    let depth = 0;
    for (; i < sc.length; i++) {
      const c = sc[i];
      if (c === '"' || c === "'") { for (i++; i < sc.length && sc[i] !== c; i++) { if (sc[i] === '\\') i++; } continue; }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return sc.slice(start, i + 1); }
    }
    return '';
  };
  const norm = (x) => x.replace(/\s+/g, ' ').trim();
  const whole = (body, expected) => body.length > 0 && norm(body) === norm(expected);
  const SCP = rd('Spixi/Utils/SpixiContentPage.cs');
  const RULES = rd('Spixi/Utils/S11ChatRules.cs');

  const rel = bodyOf(SCP, 'private static void releaseHeld(');
  /* ★ S12 #46 r1 (R3-MAJOR-2): the WHOLE class — fields, constructor, start, onReady, onFrame, end — so an initializer
     (t0 = 0 · sawDirty = true · ready = true) or a constructor edit (seq = 0) cannot survive. ★ R1-MAJOR-2: the wait ends on
     a draw AFTER the WebView's visual-state callback (ready), with a timer backstop (R1-NIT-1). */
  const cls = bodyOf(SCP, 'private sealed class S12GroundWait');
  const r = {
    releaseBranch: /if \(!skipGrounds\)\s*\{\s*if \(candidate && heldView != null\)\s*\{\s*S12GroundWait\.start\(held, heldView, seq\);\s*\}\s*else\s*\{\s*try \{ setHoldGrounds\(held, heldView, false\); \} catch \(Exception\) \{ \}\s*\}\s*\}/.test(rel),
    oneImmediateWrite: (rel.match(/setHoldGrounds\(held, heldView, false\);/g) || []).length === 2,
    wholeClass: whole(cls, `{ private readonly PreloadOp op; private readonly Android.Webkit.WebView view; private readonly int seq; private readonly long t0 = System.Diagnostics.Stopwatch.GetTimestamp(); private int frames = 0; private bool ready = false; private int drawsAfterReady = 0; private int framesAfterDraw = 0; private bool ended = false; private Android.Views.ViewTreeObserver? vto = null; private S11DrawL? drawListener = null; private S12GroundWait(PreloadOp op, Android.Webkit.WebView view, int seq) { this.op = op; this.view = view; this.seq = seq; } public static void start(PreloadOp op, Android.Webkit.WebView view, int seq) { S12GroundWait w = new S12GroundWait(op, view, seq); Android.Views.Choreographer? ch = Android.Views.Choreographer.Instance; if (ch == null) { w.end(S11ChatRules.GroundWhyCap); return; } try { w.vto = view.ViewTreeObserver; w.drawListener = new S11DrawL(w.onDraw); w.vto?.AddOnDrawListener(w.drawListener); } catch (Exception) { } try { view.PostVisualStateCallback(2, new S11Vsc(w.onReady)); } catch (Exception) { } try { view.PostDelayed(() => w.end(S11ChatRules.GroundWhyCap), S11ChatRules.GroundCapMs); } catch (Exception) { } ch.PostFrameCallback(new S11FrameCb(w.onFrame)); } private void onReady() { if (ended || ready) { return; } ready = true; drawsAfterReady = 0; framesAfterDraw = 0; try { view.PostInvalidateOnAnimation(); } catch (Exception) { } } private void onDraw() { if (!ended && ready) { drawsAfterReady++; } } private void onFrame(long frameTimeNanos) { if (ended) { return; } frames++; if (ready && drawsAfterReady > 0) { framesAfterDraw++; } long ms = (System.Diagnostics.Stopwatch.GetTimestamp() - t0) * 1000 / System.Diagnostics.Stopwatch.Frequency; string why = S11ChatRules.groundStep(ready, drawsAfterReady, framesAfterDraw, ms, S11ChatRules.GroundCapMs); if (why.Length > 0) { end(why); return; } Android.Views.Choreographer? ch = Android.Views.Choreographer.Instance; if (ch == null) { end(S11ChatRules.GroundWhyCap); return; } ch.PostFrameCallback(new S11FrameCb(onFrame)); } private void end(string why) { if (ended) { return; } ended = true; if (drawListener != null) { try { if (vto != null && vto.IsAlive) { vto.RemoveOnDrawListener(drawListener); } } catch (Exception) { } try { Android.Views.ViewTreeObserver? now = view.ViewTreeObserver; if (now != null && now.IsAlive) { now.RemoveOnDrawListener(drawListener); } } catch (Exception) { } } long ms = (System.Diagnostics.Stopwatch.GetTimestamp() - t0) * 1000 / System.Diagnostics.Stopwatch.Frequency; if (!S11ChatRules.deferredOwns(seq, op.holdSeq)) { P1Perf.line("hold grounds skip=newer"); return; } try { setHoldGrounds(op, view, false); } catch (Exception) { } P1Perf.line(S11ChatRules.groundLine(why, frames, ms, ready)); } }`),
    rule: /public static string groundStep\(bool ready, int drawsAfterReady, int framesAfterDraw, long elapsedMs, int capMs\)\s*\{\s*if \(elapsedMs >= capMs\)\s*\{\s*return GroundWhyCap;\s*\}\s*return ready && drawsAfterReady > 0 && framesAfterDraw >= GroundAfterDrawFrames \? GroundWhyDrawn : "";\s*\}/.test(RULES)
      && /public const int GroundCapMs = 300;/.test(RULES) && /public const int GroundAfterDrawFrames = 1;/.test(RULES),
    androidOnly: SCP.indexOf('class S12GroundWait') > SCP.lastIndexOf('#if ANDROID', SCP.indexOf('class S12GroundWait'))
      && SCP.lastIndexOf('#endif', SCP.indexOf('class S12GroundWait')) < SCP.lastIndexOf('#if ANDROID', SCP.indexOf('class S12GroundWait')),
  };
  ok(Object.values(r).every((x) => x === true),
    '★ S12 E (#1267, V-26) + #46 r1: after a CANDIDATE release the grounds stay transparent until the native chat WebView has DRAWN its content — S12GroundWait posts the visual-state callback (ready), invalidates on it, ends on a real view-tree DRAW counted after it (OnDrawListener) + 1 frame (groundStep), cap 300 ms on frames AND a timer, writes the grounds only for its own hold (deferredOwns), then [P1] hold grounds … rdy=; the old path and a null view keep the immediate write — ' + JSON.stringify(r));

  /* the COLD chat open takes the same hold (Android, overlay chat only) */
  const at = SCP.indexOf('op.revealDelayMs = revealDelayMs < 0 ? 0 : revealDelayMs;');
  const tail = at >= 0 ? SCP.slice(at, at + 900) : '';
  const c = {
    cold: /op\.revealDelayMs = revealDelayMs < 0 \? 0 : revealDelayMs;\s*#if ANDROID\s*bool chatOpenNow;\s*lock \(preloadLock\) \{ chatOpenNow = overlayStack\.Exists\(o => o\.target is SingleChatPage\); \}\s*if \(overlayMode && tag == "chat" && target is SingleChatPage && !chatOpenNow\)\s*\{\s*op\.holdUntilDrawn = true;\s*stage\.Shadow = new Microsoft\.Maui\.Controls\.Shadow \{ Brush = Brush\.Black, Opacity = 0f, Radius = 0, Offset = new Point\(0, 0\) \};\s*\}\s*#endif/.test(tail),
    onlyTwoSetters: (SCP.match(/op\.holdUntilDrawn = true;/g) || []).length === 2,
  };
  ok(Object.values(c).every((x) => x === true),
    '★ S12 E (#1267, V-26) + #46 r1 R1-MAJOR-1: ONLY a list → chat open (no chat in the overlay stack; a chat → chat swap keeps the opaque reveal so the sweep never shows the list between two chats), only a SingleChatPage; the COLD chat open (no warm spare; walk #1266 recorded the same flat frame on it) takes the same hold as the spare on Android — overlayMode + tag "chat" only, with the spare\'s zero shadow (#1101: the input flip never re-parents the WebView); nothing else holds — ' + JSON.stringify(c));
}
