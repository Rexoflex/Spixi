using Microsoft.Maui.Controls;
using Microsoft.Maui.Controls.Xaml;
using System;
using System.Web;

namespace SPIXI
{
	[XamlCompilation(XamlCompilationOptions.Compile)]
	public partial class EmptyDetail : SpixiContentPage
	{
		public EmptyDetail()
		{
			InitializeComponent();
            NavigationPage.SetHasNavigationBar(this, false);

            loadPage(webView, "empty_detail.html");
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

            }
            else if (current_url.Trim().StartsWith("file:", StringComparison.OrdinalIgnoreCase))
            {
                // allow normal navigation only for local files
                e.Cancel = false;
                return;
            }
            e.Cancel = true;

        }

        protected override bool OnBackButtonPressed()
        {
            return true;
        }
    }
}