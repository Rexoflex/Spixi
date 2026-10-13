// ★ S19 F6 (AA-LINK) — the mini-app link fetch's reason for a request exception (Spixi/Utils/S19FetchRules.cs), EXECUTED. The
// MiniAppManager catch that calls it (and logs the TYPE only) is read by scripts/pins-s19/q-network.mjs.
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SPIXI;
using System;
using System.Net;
using System.Net.Http;

[TestClass]
public class S19FetchTests
{
    [TestMethod]
    public void NoStatus_IsNetwork_AStatusIsHttp()
    {
        // no answer at all: DNS, connection, TLS, a proxy tunnel, a platform handler's own failure → network
        foreach (var e in new[] { HttpRequestError.NameResolutionError, HttpRequestError.ConnectionError, HttpRequestError.SecureConnectionError,
            HttpRequestError.ProxyTunnelError, HttpRequestError.Unknown })
            Assert.IsTrue(S19FetchRules.isNetworkFailure(null, e), e.ToString());
        // the server answered something wrong → http
        foreach (var e in new[] { HttpRequestError.HttpProtocolError, HttpRequestError.InvalidResponse, HttpRequestError.ResponseEnded,
            HttpRequestError.VersionNegotiationError, HttpRequestError.ExtendedConnectNotSupported, HttpRequestError.UserAuthenticationError,
            HttpRequestError.ConfigurationLimitExceeded })
            Assert.IsFalse(S19FetchRules.isNetworkFailure(null, e), e.ToString());
        // any HTTP status → http, whatever the error kind says
        foreach (int st in new[] { 404, 500, 403, 301 })
        {
            Assert.IsFalse(S19FetchRules.isNetworkFailure(st, HttpRequestError.Unknown), st.ToString());
            Assert.IsFalse(S19FetchRules.isNetworkFailure(st, HttpRequestError.ConnectionError), st.ToString());
        }
    }

    [TestMethod]
    public void RealExceptions_ClassifyAsTheCatchSeesThem()
    {
        // the shapes .NET throws: EnsureSuccessStatusCode → a status; SocketsHttpHandler's DNS failure → NameResolutionError, no status
        string word(HttpRequestException e) =>
            S19FetchRules.isNetworkFailure(e.StatusCode.HasValue ? (int)e.StatusCode.Value : (int?)null, e.HttpRequestError) ? "network" : "http";
        Assert.AreEqual("http", word(new HttpRequestException("Response status code does not indicate success: 404 (Not Found).", null, HttpStatusCode.NotFound)));
        Assert.AreEqual("network", word(new HttpRequestException(HttpRequestError.NameResolutionError, "No such host is known. (apps.example.org:443)")));
        Assert.AreEqual("network", word(new HttpRequestException(HttpRequestError.ConnectionError, "Connection refused")));
        Assert.AreEqual("network", word(new HttpRequestException("Connection failure")));   // a platform handler: Unknown, no status
        Assert.AreEqual("http", word(new HttpRequestException(HttpRequestError.InvalidResponse, "bad")));
    }
}
