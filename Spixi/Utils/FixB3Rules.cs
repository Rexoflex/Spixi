/* ★ fixb3 item 1 (n-20261113-miniapp-action-before-onload; packet P84; tests: scripts/csh/FixB3GuardTests.cs; pin:
 * scripts/pins-fixb3/a-miniapp-guard.mjs) — the PURE half of the mini-app action guard. No MAUI, no Newtonsoft, no Core type
 * (only IXICore.Meta.Logging, which the harness stubs): the harness compiles and runs this file.
 *
 * WHAT: MiniAppPage.handleAction runs for every `ixian:action` / `xa:` navigation a mini app makes. Its handler
 * (miniAppActionHandler) is set only in onLoad (the `ixian:onload` verb), so an action BEFORE onload hit a null field; the
 * outer catch then logged the WHOLE action text and the whole exception, and the response catch logged the whole exception of
 * the POST to the mini-app-supplied responseUrl. (1) refuseBeforeOnload: no handler yet → the action is refused as "not ready"
 * with ONE fixed-word line that carries the command NAME only (one of the eleven MiniAppCommands names, else "unknown") and
 * the existing SpixiAppSdk.ar reply (sendActionRejected answers only getStorage / setStorage / sendPayment); no dialog, no
 * exception, no call into the handler or the storage. (2) the two catch lines: fixed words + the name + the exception TYPE
 * name (a .NET identifier, checked) — never the action text, an argument, e.Message or e.ToString().
 * WHY: the Developer page shows the log and shares it with one tap; a mini app's action text can hold anything (a long
 * string, a secret-like value, control characters that break log lines). Damir ruled the log part fixed (#1744 (4)).
 * NO SWITCH: a hole-closing fix (#1321: a log leak — the old path IS the leak), so there is no old arm to keep.
 * LEGACY THAT STAYS (P61 (6), recorded in P84, not changed): the error alert that shows the action text on the user's own
 * screen, and `sendActionRejected(jsonResult.c, jsonResult.id, e.Message)` — e.Message goes to the SAME mini app, not the log. */
using System;
using IXICore.Meta;

namespace SPIXI
{
    public static class FixB3Rules
    {
        /** EXACTLY the eleven MiniAppCommands values (Spixi/MiniApps/MiniAppActionHandler.cs), the same text; the pin compares
         *  the two sets. A log line names a command ONLY through this list. */
        public static readonly string[] MiniAppActionNames =
        {
            "auth",
            "registerName",
            "updateName",
            "extendName",
            "updateCapacity",
            "allowSubnames",
            "transferName",
            "sendPayment",
            "ds",
            "getStorage",
            "setStorage",
        };

        /** The `e` of the existing SpixiAppSdk.ar reply for an action before onload. */
        public const string NotReadyError = "not ready";

        /** The name a log line may carry: on an ORDINAL match the LIST's own string instance (never the input's), anything
         *  else (null, empty, other case, padded, any other text) → "unknown". */
        public static string actionLogName(string? command)
        {
            if (command == null)
            {
                return "unknown";
            }
            foreach (string name in MiniAppActionNames)
            {
                if (string.Equals(name, command, StringComparison.Ordinal))
                {
                    return name;
                }
            }
            return "unknown";
        }

        /** The exception's TYPE name when it is a plain identifier (^[A-Za-z][A-Za-z0-9_]{0,63}$, ASCII, checked char by char —
         *  a generic type's backtick, a nested type's '+' or any other character fails it) → else "Exception"; null → "none". */
        public static string exceptionWord(Exception? e)
        {
            if (e == null)
            {
                return "none";
            }
            string name;
            try
            {
                name = e.GetType().Name;
            }
            catch (Exception)
            {
                return "Exception";
            }
            if (name == null || name.Length < 1 || name.Length > 64)
            {
                return "Exception";
            }
            for (int i = 0; i < name.Length; i++)
            {
                char ch = name[i];
                bool letter = (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z');
                bool more = letter || (ch >= '0' && ch <= '9') || ch == '_';
                if (i == 0 ? !letter : !more)
                {
                    return "Exception";
                }
            }
            return name;
        }

        /** The ONE line of a refused action: fixed words + the name from the list. */
        public static string notReadyLine(string? command)
        {
            return "MiniAppPage: an action before ixian:onload was refused (" + actionLogName(command) + ")";
        }

        /** The outer catch's line: fixed words + the name + the exception type word. */
        public static string actionFailedLine(string? command, Exception? e)
        {
            return "MiniAppPage: a mini-app action failed (" + actionLogName(command) + ", " + exceptionWord(e) + ")";
        }

        /** The response catch's line (the POST to the responseUrl): fixed words + the name + the exception type word. */
        public static string responseFailedLine(string? command, Exception? e)
        {
            return "MiniAppPage: the answer of a mini-app action was not sent (" + actionLogName(command) + ", " + exceptionWord(e) + ")";
        }

        /** The guard. handlerReady → returns false at once: no log, peek and reject are NOT called. Else: peek() in a try (any
         *  exception → (null, null)); ONE Logging.warn(notReadyLine(c)); when c != null and id != null: reject(c, id,
         *  NotReadyError) in a try (an exception is swallowed, no second line); returns true. Never throws. */
        public static bool refuseBeforeOnload(bool handlerReady, Func<(string? c, string? id)> peek, Action<string, string, string> reject)
        {
            if (handlerReady)
            {
                return false;
            }
            string? c = null;
            string? id = null;
            try
            {
                if (peek != null)
                {
                    (c, id) = peek();
                }
            }
            catch (Exception)
            {
                c = null;
                id = null;
            }
            try
            {
                Logging.warn(notReadyLine(c));
            }
            catch (Exception)
            {
                // the line is fixed text; a failing logger must not turn a refusal into a throw
            }
            if (c != null && id != null && reject != null)
            {
                try
                {
                    reject(c, id, NotReadyError);
                }
                catch (Exception)
                {
                    // swallowed: the action stays refused, no second line
                }
            }
            return true;
        }
    }
}
