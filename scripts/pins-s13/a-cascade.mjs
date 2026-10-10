/* ==== S13 (12-FLASH, launch blocker — WALK #1270) — the chat → blank → chat blink on Android chat opens.
 * Mechanism (docs/s13-flash-mechanism.md, MAUI 10.0.71 source): the chat stage cascaded its InputTransparent to the chat
 * WebView; on Android a view with InputTransparent gets a WrapperView (ViewExtensions.NeedsContainer), so every reveal /
 * release / close flip RE-PARENTED the WebView (WrapperView.RemoveContainer / SetupContainer = detach + attach) and Chromium
 * re-rastered. Fix, pinned here on comment-stripped source (MAUI-bound C#, nothing to execute):
 *   · the warm spare's stage: `stage.CascadeInputTransparent = false;` inside its #if ANDROID block, after the zero shadow
 *   · every overlay chat stage on the cold path: the zero shadow (kept if already set) + no cascade, inside #if ANDROID
 *   · nothing turns the cascade back on; the input rule is unchanged (the release still makes the STAGE input-live — the
 *     stage's permanent WrapperView blocks touch while it is input-dead)
 * Deliberate breaks (S13 lead): drop the spare line · `= true` on the cold path · the cold block moved out of #if ANDROID ·
 * the cold condition widened to every page — each fails exactly its key. */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join } = h;
  const SCP = stripCode(readFileSync(join(root, 'Spixi/Utils/SpixiContentPage.cs'), 'utf8'));
  const insideAndroid = (pos) => pos >= 0 && SCP.lastIndexOf('#if ANDROID', pos) > SCP.lastIndexOf('#endif', pos)
    && SCP.lastIndexOf('#if ANDROID', pos) > SCP.lastIndexOf('#else', pos);
  const warm = SCP.slice(SCP.indexOf('public bool warmSpareChat('), SCP.indexOf('Logging.info("[CDPERF] chat warm start");'));
  const coldAt = SCP.indexOf('if (overlayMode)\n', SCP.indexOf('if (overlayMode && tag == "chat" && target is SingleChatPage && !chatOpenNow)'));
  const coldTail = coldAt >= 0 ? SCP.slice(coldAt, coldAt + 400) : '';
  const spareAt = SCP.indexOf('stage.CascadeInputTransparent = false;', SCP.indexOf('public bool warmSpareChat('));
  const rel = SCP.slice(SCP.indexOf('private static void releaseHeld('), SCP.indexOf('private sealed class S12GroundWait'));
  const r = {
    spare: /op\.holdUntilDrawn = true;\s*op\.containerWord = applyStageContainer\(stage, true\);\s*stage\.CascadeInputTransparent = false;\s*#endif/.test(warm),   /* ★ S14 re-base (#1282): the permanent container = applyStageContainer (a clip by default; pins-s14/a2-container-ride.mjs) */
    spareAndroid: insideAndroid(spareAt),
    cold: /^if \(overlayMode\)\s*\{\s*op\.containerWord = applyStageContainer\(stage, S11ChatRules\.stageNeedsInputFlip\(op\.holdUntilDrawn, op\.parkOnClose \|\| op\.parkOnLoad, op\.slideIn\)\);\s*op\.inputFixed = op\.containerWord == "none";\s*stage\.CascadeInputTransparent = false;\s*\}/.test(coldTail),   /* ★ S14 re-base (#1282): applyStageContainer; the ride-along hook (#1283) follows before #endif */
    coldAndroid: insideAndroid(coldAt),
    coldAfterHold: coldAt > SCP.indexOf('if (overlayMode && tag == "chat" && target is SingleChatPage && !chatOpenNow)'),
    exactlyTwo: (SCP.match(/stage\.CascadeInputTransparent = false;/g) || []).length === 2,
    neverBackOn: !/\bstage\.CascadeInputTransparent = true;/.test(SCP),
    shadowKept: !/\bstage\.Shadow = null;/.test(SCP),   /* #46 r1 NIT: the permanent container is never removed */
    inputRuleKept: /try \{ if \(!held\.closing && !held\.swappedOut\) \{ held\.stage\.InputTransparent = false; \} \} catch \(Exception\) \{ \}/.test(rel),
  };
  ok(Object.values(r).every((x) => x === true),
    '★ S13 (12-FLASH, launch blocker): the Android chat stages never cascade InputTransparent to the chat WebView — the warm spare (after its zero shadow) and every overlay chat stage on the cold path (zero shadow kept or added + no cascade), both inside #if ANDROID; nothing turns the cascade back on; the release still makes the STAGE input-live (the stage WrapperView blocks touch while held) — so a reveal / release / close flip never re-parents the WebView (MAUI NeedsContainer → WrapperView.RemoveContainer = detach + attach = the blink) — ' + JSON.stringify(r));
}
