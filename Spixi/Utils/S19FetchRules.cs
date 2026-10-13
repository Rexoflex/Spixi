/* ★ S19 F6 (AA-LINK, Damir 2026-10-12) — the mini-app link fetch's failure REASON for a request exception, PURE (executed by
 * scripts/csh, S19FetchTests.cs). MiniAppManager.fetchWithReason calls it from its HttpRequestException catch.
 *
 *   · an HTTP status came back (EnsureSuccessStatusCode, GetByteArrayAsync on a non-2xx) → `http`
 *     ("The app could not be downloaded from that link.")
 *   · no status: the request never got an answer — DNS, connection refused / reset, TLS, a proxy tunnel, or a platform
 *     handler's own failure (Android / iOS report it as Unknown) → `network` (the shells reuse appFetchTimeout's text:
 *     "…Check your connection and try again.")
 *   · no status but the server DID answer something wrong (protocol error, invalid / cut-off response, a limit) → `http`
 * Nothing from the exception's message is read or logged (it can hold the host name).
 */
using System.Net.Http;

namespace SPIXI
{
    public static class S19FetchRules
    {
        public static bool isNetworkFailure(int? httpStatus, HttpRequestError error)
        {
            if (httpStatus.HasValue) return false;
            switch (error)
            {
                case HttpRequestError.NameResolutionError:
                case HttpRequestError.ConnectionError:
                case HttpRequestError.SecureConnectionError:
                case HttpRequestError.ProxyTunnelError:
                case HttpRequestError.Unknown:
                    return true;
                default:
                    return false;
            }
        }
    }
}
