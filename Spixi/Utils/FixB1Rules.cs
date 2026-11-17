/* ★ fixb1 (Fix batch 1, #1312 rule 1 / #1478, P50 / P51) — the PURE half of two switches: the one [FLAGS] line, the answer
 * rule of the Windows safe-default confirm (item 1, P50) and the hover / drag state of the divider line (item 4, P51). No
 * MAUI, no Core type: the harness runs it (scripts/csh/FixB1Tests.cs). SpixiFlags.init reads the preferences; SConfirm and
 * HomePage call these rules. */
namespace SPIXI
{
    public static class FixB1Rules
    {
        /** The one start line of this batch: fixed words and 0|1 only. */
        public static string flagsLine(bool confirmDefault, bool dividerLine)
        {
            return "[FLAGS] confirmdefault=" + b(confirmDefault) + " dividerline=" + b(dividerLine);
        }

        /** Item 1: the WinUI ContentDialogResult as an int — None = 0 (Esc, the Close button, a dialog closed any other way),
         *  Primary = 1, Secondary = 2. ONLY Primary (the OK text) is OK; every other value is Cancel (fail closed). */
        public static bool confirmIsOk(int contentDialogResult)
        {
            return contentDialogResult == 1;
        }

        /** Item 4: the 2 px line in the divider grip shows while the pointer is on the grip OR a drag runs. The end of a drag
         *  ends the hover too (the pointer may have left during the drag without an exit); a later pointer move or enter shows
         *  it again. */
        public sealed class DividerLine
        {
            private bool hover = false;
            private bool drag = false;

            public void hoverEnter() { hover = true; }

            public void hoverExit() { hover = false; }

            public void dragStart() { drag = true; }

            public void dragEnd()
            {
                drag = false;
                hover = false;
            }

            public bool visible => hover || drag;
        }

        private static string b(bool v) => v ? "1" : "0";
    }
}
