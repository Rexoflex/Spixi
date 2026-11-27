using System;
using Foundation;
using WebKit;

namespace Spixi.Platforms.iOS
{
    /* THE MEDIA ORIGIN ON iOS AND THE MAC (#1642): the handler of the scheme "spixi-media" of ONE WKWebView. WebKit hands it
     * every request of that scheme made inside that WebView and nothing else; a custom scheme has no network behind it.
     * The answer is the bytes that MediaGrants holds for the WebView's own MAUI element under exactly this URL, else a 404 with
     * no body. No file is read (the bytes are C#'s own JPEG, held by the grant) and there is no log line.
     * The handler is installed only by iOSWebViewHandler.createMediaView (never for a mini app). It holds its owner WEAKLY:
     * WebKit keeps this object for the life of the WebView's configuration, and it must not keep the handler or the page.
     * The whole answer is given inside the start call, on WebKit's own (main) thread: the lookup is a dictionary read, and a
     * task that is answered at once cannot be stopped first (a call on a stopped task raises a native exception). */
    sealed class MediaSchemeHandler : NSObject, IWKUrlSchemeHandler
    {
        readonly WeakReference<iOSWebViewHandler> _owner;

        public MediaSchemeHandler(iOSWebViewHandler owner) { _owner = new WeakReference<iOSWebViewHandler>(owner); }

        [Export("webView:startURLSchemeTask:")]
        public void StartUrlSchemeTask(WKWebView webView, IWKUrlSchemeTask urlSchemeTask)
        {
            bool answering = false;
            try
            {
                NSUrlRequest request = urlSchemeTask.Request;
                NSUrl url = request.Url;
                object? owner = _owner.TryGetTarget(out iOSWebViewHandler? handler) ? handler.mediaOwner() : null;
                byte[] bytes = Array.Empty<byte>();
                bool hit = owner != null && request.HttpMethod == "GET" && SPIXI.MediaGrants.tryServe(owner, url.AbsoluteString ?? "", out bytes);
                using var headers = new NSMutableDictionary<NSString, NSString>();
                foreach (var h in SPIXI.MediaGrants.Headers) headers.Add((NSString)h.Key, (NSString)h.Value);
                if (hit) headers.Add((NSString)"Content-Type", (NSString)SPIXI.MediaGrants.ContentType);
                using var response = new NSHttpUrlResponse(url, hit ? 200 : 404, "HTTP/1.1", headers);
                using NSData? body = hit ? NSData.FromArray(bytes) : null;
                answering = true;
                urlSchemeTask.DidReceiveResponse(response);
                if (body != null) urlSchemeTask.DidReceiveData(body);
                urlSchemeTask.DidFinish();
            }
            catch (Exception)
            {
                // Nothing was sent yet: fail the task. After the first call the task is left as it is (a second answer is a native exception).
                if (!answering) { try { urlSchemeTask.DidFailWithError(new NSError(NSError.NSUrlErrorDomain, -1)); } catch (Exception) { } }
            }
        }

        [Export("webView:stopURLSchemeTask:")]
        public void StopUrlSchemeTask(WKWebView webView, IWKUrlSchemeTask urlSchemeTask) { }
    }
}
