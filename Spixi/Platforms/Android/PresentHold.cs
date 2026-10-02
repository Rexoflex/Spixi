using Android.Views;
using IXICore.Meta;
using System;
using System.Diagnostics;

namespace Spixi
{
    /* ★ G-1 (#1116 (1), #1117 (4); session 2): HOLD THE CHATS LIST ON GLASS UNTIL THE CHAT WEBVIEW HAS DRAWN.
     *
     * Android only, the pre-warmed spare chat. #1115 frame-by-frame: every open showed 2 plain-ground frames + 1 grey
     * frame between the list and the chat. The chat content was already painted (`painted` 49–258 ms before present,
     * #1117 (4)); the blank frames are the NATIVE present: the stage's opaque ground on glass before the WebView's
     * first composite. This helper only TIMES the hold; SpixiContentPage.holdStageUntilDrawn makes the grounds
     * transparent (so the list under the stage stays visible) and restores them when this says the WebView drew.
     *
     * The signal is the platform's own: WebView.PostVisualStateCallback — "the content at the time of the call will
     * be drawn on the next draw" (API 23 = our minimum). One Choreographer frame after it, the hold ends. A cap ends
     * it anyway (never a stuck, input-dead chat). Every frame between present and the end is counted, so the
     * `[CDPERF] chat held frames=N ms=M why=…` line says what the recording shows. Fixed words + integers only. */
    internal sealed class PresentHold
    {
        private readonly Action<int, long, string> onEnd;
        private readonly long t0 = Stopwatch.GetTimestamp();
        private int frames = 0;
        private bool ended = false;
        private bool vscSeen = false;
        private readonly int capMs;

        private PresentHold(Action<int, long, string> onEnd, int capMs)
        {
            this.onEnd = onEnd;
            this.capMs = capMs;
        }

        /** MAIN THREAD. Starts the frame count, posts the visual-state callback, arms the cap. A null WebView
         *  ends at once with why=noview (today's behaviour: the grounds come back in the same frame). */
        public static void start(Android.Webkit.WebView? webView, int capMs, Action<int, long, string> onEnd)
        {
            PresentHold h = new PresentHold(onEnd, capMs);
            if (webView == null)
            {
                h.end("noview");
                return;
            }
            Choreographer.Instance?.PostFrameCallback(new FrameCb(h.onFrame));
            try
            {
                webView.PostVisualStateCallback(1, new Vsc(h.onVisualState));
            }
            catch (Exception)
            {
                h.end("novsc");
                return;
            }
            webView.PostDelayed(() => h.end("cap"), capMs);
        }

        private void onFrame(long frameTimeNanos)
        {
            if (ended)
            {
                return;
            }
            frames++;
            if (vscSeen)
            {
                end("vsc");   // the frame after the callback: the WebView's content is on glass
                return;
            }
            if ((Stopwatch.GetTimestamp() - t0) * 1000 / Stopwatch.Frequency >= capMs)
            {
                end("cap");   // (#46 r1 A10) the frame loop ends itself at the cap too — never only through PostDelayed
                return;
            }
            Choreographer.Instance?.PostFrameCallback(new FrameCb(onFrame));
        }

        private void onVisualState()
        {
            vscSeen = true;   // the next counted frame ends the hold
        }

        private void end(string why)
        {
            if (ended)
            {
                return;
            }
            ended = true;
            long ms = (Stopwatch.GetTimestamp() - t0) * 1000 / Stopwatch.Frequency;
            try
            {
                onEnd(frames, ms, why);
            }
            catch (Exception ex)
            {
                Logging.warn("PresentHold end failed: " + ex.GetType().Name);
            }
        }

        private sealed class FrameCb : Java.Lang.Object, Choreographer.IFrameCallback
        {
            private readonly Action<long> a;
            public FrameCb(Action<long> a) { this.a = a; }
            public void DoFrame(long frameTimeNanos) { a(frameTimeNanos); }
        }

        private sealed class Vsc : Android.Webkit.WebView.VisualStateCallback
        {
            private readonly Action a;
            public Vsc(Action a) { this.a = a; }
            public override void OnComplete(long requestId) { a(); }
        }
    }
}
