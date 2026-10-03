/* Session 4 — main-session pins (#1134). */
export default async function (h) {
  const { ok, root, readFileSync, join, stripCssComments, stripCode } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');

  /* —— #1134 (Damir dark screenshots): the chat log scroll thumb is DARK in dark, like chat info —— */
  {
    const tok = stripCssComments(rd('src/styles/tokens.css'));
    const mb = stripCssComments(rd('src/styles/components/message-bubble.css'));
    const built = rd('Spixi/Resources/Raw/html/chat.html');
    /* the two declarations of the token, in source order: light (:root block) first, dark second */
    const decl = [...tok.matchAll(/--chat-scroll-thumb:\s*([^;]+);/g)].map((m) => m[1].trim());
    const darkStart = tok.indexOf('--chat-canvas-base: var(--ink-950);');
    const darkDecl = (/--chat-scroll-thumb:\s*([^;]+);/.exec(tok.slice(Math.max(0, darkStart - 400), darkStart)) || [])[1];
    const r = {
      twoDecls: decl.length === 2,
      light: decl[0] === 'var(--text-neutral-02)',
      dark: darkDecl && darkDecl.trim() === 'var(--outline-neutral-02)',
      /* the dark value is the SAME one every other dark scroller uses (base.css .u-scroll) */
      sameAsBase: /\.u-scroll:hover, \.u-scroll:focus-within \{\s*scrollbar-color: var\(--outline-neutral-02\) transparent;/.test(stripCssComments(rd('src/styles/base.css'))),
      rulesUseToken: (mb.match(/\.c-chat-canvas \.u-scroll[^{]*\{[^}]*var\(--chat-scroll-thumb\)/g) || []).length === 2
        && !/\.c-chat-canvas \.u-scroll[^{]*\{[^}]*var\(--text-neutral-02\)/.test(mb),
      shipped: rd('Spixi/Resources/Raw/html/spixi.tokens.css').includes('--chat-scroll-thumb: var(--outline-neutral-02)') && built.includes('var(--chat-scroll-thumb)'),
    };
    ok(Object.values(r).every(Boolean),
      '★ #1134 (Damir dark screenshots: "chat info has a proper dark scroll bar, in chat it is very bright"): the chat log thumb takes --chat-scroll-thumb — light keeps text-02 (3:1 on the tinted canvases), dark = outline-neutral-02, the same thumb as chat info and every other .u-scroll — ' + JSON.stringify(r));
  }

  /* —— #1150 (Damir): a contact request is not an unread, but the ICON badge counts a pending one (= the Chats tab rule) —— */
  {
    const prefs = stripCode(rd('Spixi/Meta/SChatPrefs.cs'));
    const rule = stripCode(rd('Spixi/Utils/UnreadRule.cs'));
    const body = prefs.slice(prefs.indexOf('public static int unreadTotalForBadge()'));
    const iPend = body.indexOf('UnreadRule.isPendingIncomingRequest(');
    const iMute = body.indexOf('SNotificationPrefs.isChatMuted(friend)');
    const r = {
      /* the badge sum asks the rule, adds exactly 1 and skips the row count (a pre-#1150 count would double it) */
      badge: iPend > 0 && iMute > iPend && /total \+= 1;\s*continue;/.test(body.slice(iPend, iMute)),
      /* the request type never counts as an unread */
      notUnread: !/case FriendMessageType\.requestAdd:\s*(\/\/[^\n]*)?\s*return true;/.test(rule)
        && /case FriendMessageType\.requestAdd:\s*\n\s*default:/.test(rule),
      /* the Chats tab keeps + each pending card */
      tab: /const navUnreadTotal = \(\) => chatsUnreadTotal\(state\.chats\)\s*\+ \(state\.requests \|\| \[\]\)\.filter\(Boolean\)\.length;/.test(rd('src/shells/home.html')),
    };
    ok(Object.values(r).every(Boolean),
      '★ #1150 (Damir: "contact request already has accept / decline, no unread indicator on the row"): a request never raises a chat-row count (UnreadRule), the Chats tab badge counts each pending card, and the app ICON badge counts a pending request as exactly 1 until Accept / Decline (SChatPrefs.unreadTotalForBadge, the rule executed in csh) — ' + JSON.stringify(r));
  }
}
