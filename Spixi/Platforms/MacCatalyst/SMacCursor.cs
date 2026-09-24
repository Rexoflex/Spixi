using IXICore.Meta;
using ObjCRuntime;
using System;
using System.Runtime.InteropServices;

namespace Spixi
{
    /// <summary>
    /// ★ #980 (M2, the office Mac 2026-09-24: "the left-pane divider is not resizable on Catalyst").
    /// D1's GESTURES are cross-platform MAUI (PanGestureRecognizer + a double-tap on a BoxView,
    /// HomePage), so the drag itself is not WinUI-only — what WAS WinUI-only is the ↔ cursor
    /// (#242, UIElement.ProtectedCursor), and #242's own finding on Windows was that without it the
    /// 10 px transparent grip reads as not resizable ("no cursor change, hard to catch"). This is the
    /// Mac half: while the pointer is over the grip the AppKit resize cursor is pushed, and popped
    /// when it leaves. UIKit on the Mac has no resize cursor, so this talks to NSCursor through the
    /// Objective-C runtime. Push/pop are paired by a flag so a lost exit cannot leak a cursor.
    /// ⚠ UNCOMPILED here; fail-soft (one log line naming the exception TYPE).
    /// </summary>
    public static class SMacCursor
    {
        [DllImport("/usr/lib/libobjc.dylib", EntryPoint = "objc_msgSend")]
        private static extern IntPtr msgSendPtr(IntPtr receiver, IntPtr selector);

        [DllImport("/usr/lib/libobjc.dylib", EntryPoint = "objc_msgSend")]
        private static extern void msgSendVoid(IntPtr receiver, IntPtr selector);

        private static bool pushed = false;
        /// ★ #983 (review r1, NIT-7): whether the pointer is over the grip — a pan that ends while
        /// it still is must keep the ↔ (the old code popped it until the pointer re-entered).
        public static bool hovered = false;

        public static void pushResizeLeftRight()
        {
            try
            {
                if (pushed) return;
                IntPtr cls = Class.GetHandle("NSCursor");
                if (cls == IntPtr.Zero) return;
                IntPtr cursor = msgSendPtr(cls, Selector.GetHandle("resizeLeftRightCursor"));
                if (cursor == IntPtr.Zero) return;
                msgSendVoid(cursor, Selector.GetHandle("push"));
                pushed = true;
            }
            catch (Exception e)
            {
                Logging.warn("[DIVIDER] mac cursor push threw: " + e.GetType().Name);
            }
        }

        public static void pop()
        {
            try
            {
                if (!pushed) return;
                pushed = false;
                IntPtr cls = Class.GetHandle("NSCursor");
                if (cls == IntPtr.Zero) return;
                msgSendVoid(cls, Selector.GetHandle("pop"));
            }
            catch (Exception e)
            {
                Logging.warn("[DIVIDER] mac cursor pop threw: " + e.GetType().Name);
            }
        }
    }
}
