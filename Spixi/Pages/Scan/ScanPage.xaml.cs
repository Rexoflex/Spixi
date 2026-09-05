using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using SPIXI.Lang;
using System;
using System.Web;

namespace SPIXI;

[XamlCompilation(XamlCompilationOptions.Compile)]
public partial class ScanPage : SpixiContentPage
{
    public event EventHandler<SPIXI.EventArgs<string>>? scanSucceeded = null;

    private bool allowScanning = true;

    public ScanPage()
	{
		InitializeComponent();
        NavigationPage.SetHasNavigationBar(this, false);

        loadPage(webView, "scan.html");
    }

    private void onNavigated(object sender, WebNavigatedEventArgs e)
    {
        // Deprecated due to WPF, use onLoad
    }

    private void onLoad()
    {
    }

    private void onNavigating(object sender, WebNavigatingEventArgs e)
    {
        string current_url = HttpUtility.UrlDecode(e.Url);
        // #797: cancel first. A throw in a branch must not leave an ixian: navigation for the WebView to load.
        e.Cancel = true;

        if (onNavigatingGlobal(current_url))
        {
            e.Cancel = true;
            return;
        }

        if (current_url.Equals("ixian:onload", StringComparison.Ordinal))
        {
            onLoad();
        }
        else if (current_url.Equals("ixian:back", StringComparison.Ordinal))
        {
            OnBackButtonPressed();
        }
        else if (current_url.Equals("ixian:error", StringComparison.Ordinal))
        {
            displaySpixiAlert(SpixiLocalization._SL("global-invalid-address-title"), SpixiLocalization._SL("global-invalid-address-text"), SpixiLocalization._SL("global-dialog-ok"));
        }
        else if (current_url.StartsWith("ixian:qrresult:", StringComparison.Ordinal))
        {
            // Anchored, and everything after the first prefix is the payload. A URL that
            // merely CONTAINS the verb no longer matches; a URL that IS the prefix yields an
            // empty payload, which processQRResult receives as before.
            try
            {
                processQRResult(current_url.Substring("ixian:qrresult:".Length));
            }
            catch (Exception ex)
            {
                IXICore.Meta.Logging.warn("Exception while processing a scan result: " + ex.GetType().Name);
            }
            e.Cancel = true;
            return;
        }
        else if (current_url.Trim().StartsWith("file:", StringComparison.OrdinalIgnoreCase))
        {
            // allow normal navigation only for local files
            e.Cancel = false;
            return;
        }
        e.Cancel = true;

    }

    public void processQRResult(string text)
    {
        if (!allowScanning)
            return;

        string wal = text;
        if (scanSucceeded != null)
        {
            allowScanning = false;
            OnBackButtonPressed();
            scanSucceeded(this, new SPIXI.EventArgs<string>(wal));
        }
    }

    protected override bool OnBackButtonPressed()
    {
        popPageAsync();
        GC.Collect();
        return true;
    }

}