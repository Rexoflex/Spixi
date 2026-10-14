/* ★ DT-1 B → #1392 → ★ #1395 (S20, Damir 2026-10-13 16:2x): the Windows title bar is the WINDOWS LOOK only — MAUI's default
 * bar in the system colours, the caption "Spixi" (Q1: the logo is already in the rail). The two token-coloured ways that
 * FAILED the DT-1 walk (#1391: `maui` — MAUI Window.TitleBar; `colors` — the system bar with AppWindow.TitleBar colours) are
 * DELETED with their dev verb (`ixian:devflash:titlebar:`), push (`setTitleBarDev`), Developer card, palette and log lines
 * (the #46 over-engineering lens). Nothing reads the old dev preference `devTitleBarWay` any more, so a value stored by a
 * DT-1 build (Damir's PC had `colors`) acts as nothing: every start shows the Windows look. The preference itself goes
 * with the wipe (Preferences.Clear). Pure; compiled and executed in the C# harness (scripts/csh/DtTitleBarTests.cs). */
namespace SPIXI
{
    public static class DtTitleBarRules
    {
        /** Q1 (Damir 2026-10-12): the Windows caption says "Spixi" (was "Spixi IM"). */
        public const string Title = "Spixi";
    }
}
