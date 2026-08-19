using Android.App;
using Android.OS;
using Android.Runtime;
using IXICore;
using Microsoft.Maui;
using Microsoft.Maui.Hosting;
using System;

namespace Spixi;

[Application]
public class MainApplication : MauiApplication
{
	public MainApplication(IntPtr handle, JniHandleOwnership ownership)
		: base(handle, ownership)
	{
        DeviceStorage.PlatformGetAvailableDiskSpace = (path) =>
        {
            var stat = new StatFs(path);
            return Math.Max(stat.AvailableBytes, 0);
        };
    }

	/* ★ AND-7 (#401) BOOTSTRAP. The very first document is generated before
	 * MainActivity's insets listener has ever fired: MauiApplication.OnCreate builds
	 * the MAUI app, whose App constructor sets MainPage, whose page constructor calls
	 * loadPage → generatePage → *SL{} substitution. If the AndroidInsetTop carrier is
	 * missing at that moment the first screen paints its topbar hard against the top
	 * edge, under the clock — the exact defect this batch removes elsewhere.
	 *
	 * So register an ESTIMATE here, before base.OnCreate() builds anything, from the
	 * platform's own status_bar_height dimension. It needs only a Context, it is
	 * available this early, and it is replaced by the authoritative WindowInsets value
	 * as soon as the first layout pass runs. A device where the resource is missing
	 * falls through to 0, which is exactly today's behaviour for that first frame.
	 *
	 * Fenced: a throw here would take the whole app down before it started. */
	public override void OnCreate()
	{
		try
		{
			int id = Resources?.GetIdentifier("status_bar_height", "dimen", "android") ?? 0;
			float density = Resources?.DisplayMetrics?.Density ?? 1f;
			if (density <= 0f) density = 1f;
			if (id > 0)
			{
				MainActivity.publishTopInset((Resources?.GetDimensionPixelSize(id) ?? 0) / density);
			}
		}
		catch (Exception)
		{
			// no estimate is better than no app — the listener publishes the real value
		}

		base.OnCreate();
	}

	protected override MauiApp CreateMauiApp() => MauiProgram.CreateMauiApp();
}
