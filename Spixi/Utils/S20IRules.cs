/* ★ S20I (#1312 rule 1) — the PURE rules of the "How people find you" moment (Damir 2026-10-15 23:25: "moments on account
 * hub — add moment to describe address account on first time joining account for fresh accounts"; 23:38: "we can use a
 * restored account as well so users are in the know. Old users could also have lack of context" → EVERY account, once),
 * executed by scripts/csh
 * (S20ITests.cs). Review packet: docs/be-review-pack/P32-s20i-address-moment.md. One flag, read ONCE at start
 * (SpixiFlags.init), absent = ON, a stored 0 acts only in dev mode (S16PassRules.effectiveFlag), one fixed [FLAGS] line:
 *
 *   · the id `addrhelp` in the S17 moment set (S17MomentRules.Ids; no argument). Settings only, and only once that page is
 *     ON SCREEN (SettingsPage.shownToUser: true at HomePage.onOverlayPresented, false again at onOverlayClosed — the phone
 *     warms Account hidden at start and parks it hidden on close, so a load is not an open; the present re-pushes setMoments
 *     so the page asks again); once per id; refused after a moment or a card this session (NOT exempt) but it never TAKES the session (the
 *     V1A-M ixihelp rule: S17MomentRules.respectsButNeverTakes). EVERY account — created, restored or an older one (Damir
 *     23:38) — sees it once.
 *   · OFF = no `addrhelp` cap, the ask `ixian:moment:addrhelp` ignored before anything is read further (SMoments.handleVerb).
 *
 * SECURITY (CLAUDE.md ★): no new WebView / spixi.* key and no new store key (the S17 local-only "moments.seen" carries the
 * id); 1 int pref (the flag). The verb carries an id from the fixed set only, validated
 * by S17MomentRules.parseAsk before anything is written; nothing from the WebView is logged. The moment's button only opens
 * the address sheet the hub already has (no verb). */
namespace SPIXI
{
    public static class S20IRules
    {
        /** The moment id (S17MomentRules.Ids holds the same literal — the one set parseAsk / askLine / isSeenId read). */
        public const string AddrHelpId = "addrhelp";

        public static string flagLineAddrHelp(bool on) => "[FLAGS] s20addrhelp=" + (on ? "1" : "0");

        /** The moment's own check (SMoments.answerAsync): flag off or not a Settings page on screen → Wait (nothing stored);
         *  else Yes — every account (Damir 23:38: restored and older accounts too). */
        public static S17MomentRules.Eligible addrHelpEligible(bool flagOn, bool onSettingsShown) =>
            flagOn && onSettingsShown ? S17MomentRules.Eligible.Yes : S17MomentRules.Eligible.Wait;
    }
}
