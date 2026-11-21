/* ★ photo1a (ruling 1736, 2026-11-18; S15 O-11, #1293) — THE ONE BUILDER of the C#→JS push text.
 * Why: PO-1 builds a push's text OFF the main thread (the drainer), and Utils.sendUiCommand builds it on the caller's
 * thread. Both call build() below, so the escaping exists in ONE place and the text cannot drift between two copies.
 * Contract: build(command, a1, …, an) = "executeUiCommand(" + command, then per argument ",'" + escape(arg) + "'" (a
 * non-null argument) or ",null" (a null argument), then ");". escape(str) = base64 of the UTF-8 bytes of str — the base64
 * alphabet has no quote, backslash, newline, backtick or ':', so no argument can leave its single-quoted JS literal and
 * none can start with "data:" (src/bridge/native.js's passthrough stays unreachable from C#).
 * This is the only composer of executeUiCommand( in Spixi/ (pinned: scripts/pins-s15/c-transport.mjs, O-11 one builder;
 * tests: scripts/csh/PhotoOpenTests.cs). Pure: no MAUI type, no Core type, no logging. Utils.escapeHtmlParameter(string)
 * returns escape(str); Utils.sendUiCommand sends build(command, arguments). */
using System;
using System.Text;

namespace SPIXI
{
    public static class UiCommandText
    {
        /** The one escaping: base64 of the UTF-8 bytes of str. */
        public static string escape(string str)
        {
            return Convert.ToBase64String(Encoding.UTF8.GetBytes(str));
        }

        /** The one composer: the exact text Utils.sendUiCommand hands to sendMessage. */
        public static string build(string command, params string?[] arguments)
        {
            StringBuilder sb = new StringBuilder("executeUiCommand(" + command);
            foreach (string? arg in arguments)
            {
                if (arg != null)
                {
                    sb.Append(",");
                    sb.Append("'" + escape(arg) + "'");
                }
                else
                {
                    sb.Append(",null");
                }
            }
            sb.Append(");");
            return sb.ToString();
        }
    }
}
