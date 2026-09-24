using IXICore.Meta;
using Microsoft.Maui.ApplicationModel;
using ObjCRuntime;
using System;
using System.Runtime.InteropServices;

namespace Spixi
{
    public class SSystemAlert
    {
        public static void displayAlert(string title, string message, string cancel)
        {

        }

        [DllImport("/usr/lib/libobjc.dylib", EntryPoint = "objc_msgSend")]
        private static extern IntPtr msgSendPtr(IntPtr receiver, IntPtr selector);

        [DllImport("/usr/lib/libobjc.dylib", EntryPoint = "objc_msgSend")]
        private static extern byte msgSendByte(IntPtr receiver, IntPtr selector);

        [DllImport("/usr/lib/libobjc.dylib", EntryPoint = "objc_msgSend")]
        private static extern nint msgSendNintNuint(IntPtr receiver, IntPtr selector, nuint arg);

        /// <summary>NSInformationalRequest — ONE bounce (NSCriticalRequest = 0 bounces until the
        /// user activates the app; the Windows twin flashes until foreground, but a Dock that keeps
        /// jumping for a chat message is louder than a Mac user expects).</summary>
        private const nuint NSInformationalRequest = 10;

        /// <summary>
        /// ★ #979 (M4): the Dock BOUNCE, the Mac twin of the Windows taskbar flash
        /// (Platforms/Windows/SSystemAlert.cs). Node calls this on every received message that is
        /// not old; it bounces ONLY while the app is not the active app (the AppKit call is a
        /// no-op for an active app anyway, the check keeps the log honest). UIKit on the Mac has
        /// no API for it, so this talks to the process's NSApplication through the Objective-C
        /// runtime: <c>[[NSApplication sharedApplication] requestUserAttention:10]</c>.
        /// ⚠ UNCOMPILED here; fail-soft — a failure is one log line with the exception TYPE.
        /// </summary>
        public static void flash()
        {
            MainThread.BeginInvokeOnMainThread(() =>
            {
                try
                {
                    IntPtr cls = Class.GetHandle("NSApplication");
                    if (cls == IntPtr.Zero)
                    {
                        return;
                    }
                    IntPtr app = msgSendPtr(cls, Selector.GetHandle("sharedApplication"));
                    if (app == IntPtr.Zero)
                    {
                        return;
                    }
                    if (msgSendByte(app, Selector.GetHandle("isActive")) != 0)
                    {
                        return;
                    }
                    msgSendNintNuint(app, Selector.GetHandle("requestUserAttention:"), NSInformationalRequest);
                }
                catch (Exception e)
                {
                    Logging.warn("[NOTIFDIAG] mac dock bounce threw: " + e.GetType().Name);
                }
            });
        }
    }
}
