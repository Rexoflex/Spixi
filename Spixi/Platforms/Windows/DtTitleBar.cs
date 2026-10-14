/* ★ DT-1 B → #1392 → ★ #1395 (S20): the Windows title bar is the Windows look — this file only sets the caption "Spixi"
 * (App.CreateWindow, #if WINDOWS). The token-coloured ways (`maui`, `colors`) failed the DT-1 walk (#1391) and are deleted:
 * no MAUI TitleBar, no AppWindow colours, no content extension, no UISettings re-apply, no theme hook. Never paints the
 * window ROOT (#1276). Never throws: a failure logs its exception TYPE only. Windows only (net10.0-windows). */
using IXICore.Meta;
using System;

namespace SPIXI
{
    public static class DtTitleBar
    {
        public static void onCreateWindow(Microsoft.Maui.Controls.Window window)
        {
            try
            {
                window.Title = DtTitleBarRules.Title;
            }
            catch (Exception ex)
            {
                Logging.warn("[DT] titlebar create failed: " + ex.GetType().Name);
            }
        }
    }
}
