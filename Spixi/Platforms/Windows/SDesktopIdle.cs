using IXICore.Meta;
using Microsoft.Maui.ApplicationModel;
using Microsoft.Maui.Storage;
using System;
using System.Runtime.InteropServices;
using System.Threading.Tasks;

namespace Spixi
{
    /// <summary>
    /// ★★ #505 — THE DESKTOP APP-LOCK TRIGGER.
    ///
    /// Damir, W-4.6/W-4.7: the app locked him out mid-sentence while he was typing in
    /// another window, and an unlock could leave a black window with no way back in. He
    /// asked whether desktop needs a longer grace — "5 minutes?".
    ///
    /// ★ THE GRACE PERIOD WAS THE WRONG DIAL, BECAUSE THE SIGNAL WAS WRONG. MAUI raises
    /// Application.OnSleep on window DEACTIVATION on WinUI, and a deactivated window is
    /// still fully visible on screen. So the app was treating "you clicked a browser" as
    /// "you walked away" — and no length of grace can make that mean the right thing.
    /// App.locksOnBackground is false on Windows now, and this watcher is what locks
    /// instead: the machine has been UNTOUCHED for the configured window.
    ///
    /// ★ WHY ONE SIGNAL COVERS BOTH OF HIS REQUIREMENTS. He asked for a lock on system
    /// lock/sleep AND on idle. While Windows is locked there is no input to the session,
    /// so the idle clock runs — and Spixi is unreachable during that time anyway, because
    /// the Windows lock screen IS the protection. The only moment a Spixi lock adds
    /// anything is after the unlock, and "idle >= threshold" is precisely that test. A
    /// 30-second screen lock does not lock Spixi, and does not need to.
    ///
    /// ⚠ SLEEP AND HIBERNATE NEED THE SECOND CLOCK. GetLastInputInfo is built on
    /// GetTickCount, and a tick counter does not advance while a machine is asleep — so a
    /// laptop closed for two hours can wake reporting almost no idle time. The wall clock
    /// catches it: if far more real time passed between two polls than the poll interval,
    /// the process was frozen, and that absence counts.
    ///
    /// ⚠ NO NEW DEPENDENCY, DELIBERATELY. Microsoft.Win32.SystemEvents (SessionSwitch,
    /// PowerModeChanged) is a NuGet package on .NET Core, and this container has no .NET
    /// toolchain to verify a reference against — #495's lesson is that an unverifiable
    /// name puts a one-word typo between Damir and a green build. GetLastInputInfo is raw
    /// user32, the same P/Invoke shape SSystemAlert.cs two files away already uses.
    ///
    /// ⚠ MOBILE IS UNTOUCHED. This whole file compiles only for the windows target
    /// (Spixi.csproj excludes Platforms\Windows for every other TFM).
    /// </summary>
    internal static class SDesktopIdle
    {
        [StructLayout(LayoutKind.Sequential)]
        private struct LASTINPUTINFO
        {
            public uint cbSize;   // sizeof(LASTINPUTINFO)
            public uint dwTime;   // tick count of the last input event, session-wide
        }

        [DllImport("user32.dll")]
        private static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

        /// How often the watcher looks. Far shorter than the threshold, so the lock lands
        /// within a poll of the window elapsing; far too long to matter for battery.
        private const int POLL_MS = 30_000;

        /// Damir's dial (2026-08-22): "10 min idle default only on desktops".
        private const int DEFAULT_IDLE_MINUTES = 10;
        /// Clamped, because a preference is editable and a 0 would lock the app on every
        /// poll while the user is typing — the exact defect #505 exists to remove.
        private const int MIN_IDLE_MINUTES = 1;
        private const int MAX_IDLE_MINUTES = 24 * 60;

        private static bool running = false;

        /// <summary>Configured idle window. A Preference so it can be changed without a
        /// rebuild; a Settings row can write the same key when one is designed.</summary>
        public static TimeSpan idleWindow()
        {
            int minutes = DEFAULT_IDLE_MINUTES;
            try
            {
                minutes = Preferences.Default.Get("lockIdleMinutes", DEFAULT_IDLE_MINUTES);
            }
            catch (Exception)
            {
                // Preferences can be unavailable very early / during shutdown — the
                // default is the right answer then, and a throw here must never reach
                // the watcher loop.
            }
            if (minutes < MIN_IDLE_MINUTES) minutes = MIN_IDLE_MINUTES;
            if (minutes > MAX_IDLE_MINUTES) minutes = MAX_IDLE_MINUTES;
            return TimeSpan.FromMinutes(minutes);
        }

        /// <summary>Time since the last input event anywhere in this Windows session.
        /// TimeSpan.Zero when the call fails, which fails SAFE: no idle, no lock.</summary>
        public static TimeSpan idleFor()
        {
            try
            {
                LASTINPUTINFO info = new LASTINPUTINFO();
                info.cbSize = (uint)Marshal.SizeOf<LASTINPUTINFO>();
                if (!GetLastInputInfo(ref info))
                {
                    return TimeSpan.Zero;
                }
                /* ⚠ BOTH are 32-bit tick counts and BOTH wrap at ~49.7 days. The unchecked
                 * subtraction is what makes the wrap harmless: on either side of it the
                 * difference is still correct. Casting to long first — the obvious
                 * version — would report ~49 days of idle once every 49 days and lock the
                 * app for no reason. */
                uint now = unchecked((uint)Environment.TickCount);
                uint delta = unchecked(now - info.dwTime);
                return TimeSpan.FromMilliseconds(delta);
            }
            catch (Exception)
            {
                return TimeSpan.Zero;
            }
        }

        /// <summary>Start the watcher. Idempotent — OnWindowCreated can fire more than
        /// once, and two loops would double every log line.</summary>
        public static void start()
        {
            if (running)
            {
                return;
            }
            running = true;
            _ = loop();
        }

        private static async Task loop()
        {
            DateTime lastPoll = DateTime.UtcNow;
            while (true)
            {
                try
                {
                    await Task.Delay(POLL_MS);
                    DateTime now = DateTime.UtcNow;
                    TimeSpan gap = now - lastPoll;
                    lastPoll = now;

                    TimeSpan window = idleWindow();
                    TimeSpan idle = idleFor();

                    /* The wall-clock leg. `gap` is normally ~POLL_MS; a much larger one
                     * means the process was not running — sleep, hibernate, or a
                     * suspended VM — and that absence is exactly the "I walked away" this
                     * is looking for.
                     * ⚠ A clock moved BACKWARDS gives a negative gap and must never
                     * satisfy the window; the same guard ownIntentFresh() already carries. */
                    bool slept = gap.TotalSeconds >= 0 && gap >= window;
                    bool untouched = idle >= window;
                    if (!slept && !untouched)
                    {
                        continue;
                    }

                    App app = Microsoft.Maui.Controls.Application.Current as App;
                    if (app == null || !app.isLockEnabled() || app.isAppLockActive)
                    {
                        continue;
                    }
                    Logging.info("Desktop idle lock: idle=" + (long)idle.TotalSeconds
                        + "s gap=" + (long)gap.TotalSeconds
                        + "s window=" + (long)window.TotalSeconds + "s slept=" + slept);
                    MainThread.BeginInvokeOnMainThread(() =>
                    {
                        try
                        {
                            (Microsoft.Maui.Controls.Application.Current as App)?.lockOnIdle();
                        }
                        catch (Exception e)
                        {
                            Logging.error("Desktop idle lock failed: " + e);
                        }
                    });
                }
                catch (Exception e)
                {
                    /* The loop must outlive any single bad poll. A watcher that dies
                     * silently is an app lock that stops existing for the rest of the
                     * session, with nothing on screen to say so. */
                    Logging.error("SDesktopIdle poll failed: " + e);
                }
            }
        }
    }
}
