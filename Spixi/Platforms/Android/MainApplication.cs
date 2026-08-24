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
		/* ★ F5-2 (#555) — CRASH DIAGNOSTIC. Removing a bot group killed the app on
		 * Android and ixian.log holds NOTHING (aftercrash.txt starts after the
		 * restart). The AppDomain hook in App.xaml.cs sees only .NET exceptions.
		 * This hook fires for exceptions unhandled on a thread WITH managed
		 * frames, about to cross back to Java — a wider net than the AppDomain
		 * hook — and it FLUSHES before the process dies, so the next log names
		 * the stack. Honest limits (loop A-7): a pure Java-side throw with no
		 * managed frame goes to Java's DefaultUncaughtExceptionHandler, not
		 * here; a pure native crash (SIGSEGV) reaches no managed hook at all.
		 * Both cases still need `adb logcat -d` (the handoff says so).
		 * Registered first, before base.OnCreate, so it is alive for the whole
		 * process life. Fenced: the diagnostic must not stop the boot. */
		try
		{
			AndroidEnvironment.UnhandledExceptionRaiser += (sender, args) =>
			{
				try
				{
					IXICore.Meta.Logging.error("[CRASHDIAG] Android unhandled exception: " + args.Exception);
					IXICore.Meta.Logging.flush();
				}
				catch (Exception) { }
			};
		}
		catch (Exception) { }

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

		/* ★★ #493 (#483) — THE POINT OF THIS WHOLE LANE, and it is three lines.
		 *
		 * Register the OneSignal handlers HERE, in the Application, rather than inside
		 * `Node.start()` where they used to live. Android runs Application.OnCreate before
		 * ANY component in the process — receiver, service or activity — so a push that
		 * wakes a killed Spixi now meets a live `WillDisplay` handler instead of arriving
		 * ~4 seconds before one exists. The closed-app log dates that gap exactly:
		 * `19:14:23.73 Starting Spixi` → `19:14:27.66 Node started`.
		 *
		 * ⚠ AFTER base.OnCreate(), not before. Two reasons, both deliberate: MAUI Essentials
		 * `Preferences` (which the mute gate reads) wants the MAUI app built, and a OneSignal
		 * fault must not be able to stop the app from being built at all. It is still far
		 * earlier than any push can be delivered, because the whole of OnCreate precedes
		 * every component in the process.
		 *
		 * ⚠ Fenced like the inset estimate above: registerEarly() already swallows its own
		 * exceptions and leaves its flag false so the node-start path retries, but a throw
		 * escaping OnCreate would take the app down before it started, and lifecycle
		 * ordering is the class that produced #442, #454 and #460.
		 */
		try
		{
			SPushService.registerEarly();
		}
		catch (Exception)
		{
			// The belt in SPushService.initialize() re-tries at node start.
		}
	}

	protected override MauiApp CreateMauiApp() => MauiProgram.CreateMauiApp();
}
