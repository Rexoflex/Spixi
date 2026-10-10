/* ==== S14 A2 — #1282 the Android overlay stage's permanent container is a CLIP (not the 13c zero shadow) + the Developer
 * "Overlay container" probe · #1283 chat info RIDES the chat → group swap (Damir 13C-SWAP) ====
 * #1282 mechanism (MAUI 10.0.71 source): a SolidPaint shadow → PlatformWrapperView.dispatchDraw → drawShadowViaDispatchDraw
 * (the stage ground is a ColorDrawable, not a PlatformShadowDrawable) = the whole subtree software-drawn into an ALPHA_8
 * bitmap after every invalidate; UpdateOpacity invalidates on every fade step when Shadow != null → the chat-info slide paid
 * it per frame. A Clip keeps the container (NeedsContainer) with SetHasClip only; RectangleGeometry ignores PathForBounds'
 * bounds, so a ±1e5 rect never cuts content.
 * Pinned: (a) on comment-stripped C# (MAUI-bound — the pure rules are EXECUTED in scripts/csh/S14OverlayTests.cs);
 * (b) EXECUTED on the BUILT dev.html (jsdom): the container row's grammar, optimism, echo, malformed pushes, and that the
 * three S11 flash switches are untouched.
 * Deliberate breaks (S14 A2 report): the default branch back to the zero shadow · a third zero-shadow site · the None guard
 * dropped from the present · the ride skip dropped from removePage · the spare not refused during a ride · the settle not
 * first in closeDeferredStale · the hook bracket dropped · dev.html sending the word in caps — each fails its key.
 * #46 fix r1 (F2) breaks, each failed its key: the restore's swappedOut write / input-live write deleted (settle) · the hook
 * READER disabled (hookReader) · the double-arm guard dropped / a None-mode info allowed to ride / the 2 s timer back on
 * dropRide (armAndroidOnly) · the presentPreload-finally or staging-failure rideCancelled dropped (ownerEnds) · the timeout rule
 * always dropping (timeout) · None for every stage again (twoSites) · a stage.SetValue(VisualElement.ShadowProperty, …) write
 * (oneShadowSite) · liftStageInput / the slide's finally ignoring swappedOut (slideSwapped). */
import { b2Kit } from '../pins-s9/b2-kit.mjs';
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join, sleep } = h;
  const SCP = stripCode(readFileSync(join(root, 'Spixi/Utils/SpixiContentPage.cs'), 'utf8'));
  const RULES = stripCode(readFileSync(join(root, 'Spixi/Utils/S11ChatRules.cs'), 'utf8'));
  const CD = stripCode(readFileSync(join(root, 'Spixi/Pages/Contacts/ContactDetails.xaml.cs'), 'utf8'));
  const HP = stripCode(readFileSync(join(root, 'Spixi/Pages/Home/HomePage.xaml.cs'), 'utf8'));
  const DP = stripCode(readFileSync(join(root, 'Spixi/Pages/Dev/DevPage.xaml.cs'), 'utf8'));
  const between = (s, a, b) => { const i = s.indexOf(a); const j = i < 0 ? -1 : s.indexOf(b, i + a.length); return i < 0 || j < 0 ? '' : s.slice(i, j); };
  const count = (s, re) => (s.match(re) || []).length;
  const insideAndroid = (s, pos) => pos >= 0 && s.lastIndexOf('#if ANDROID', pos) > s.lastIndexOf('#endif', pos)
    && s.lastIndexOf('#if ANDROID', pos) > s.lastIndexOf('#else', pos);

  /* ── (a1) #1282 the container ── */
  const helper = between(SCP, 'private static string applyStageContainer(ContentView stage, bool needsInputFlip)', 'private static void releaseHeld(');
  const warm = between(SCP, 'public bool warmSpareChat(', 'Logging.info("[CDPERF] chat warm start");');
  const coldAt = SCP.indexOf('op.containerWord = applyStageContainer(stage, S11ChatRules.stageNeedsInputFlip(op.holdUntilDrawn, op.parkOnClose || op.parkOnLoad, op.slideIn));');
  const slideSetAt = SCP.indexOf('op.slideIn = overlayMode && (slideIn ||');
  const stagedAt = SCP.indexOf('hostGrid.Children.Add(stage);', coldAt);
  const shadowAt = [...SCP.matchAll(/Shadow/g)].map((m) => m.index);
  const helperAt = SCP.indexOf('private static string applyStageContainer(ContentView stage, bool needsInputFlip)');
  const present = between(SCP, 'private static void p1Present(PreloadOp op, bool overlay)', 'private const long P1SpareAfterWindowMs');
  const c = {
    /* the default is the clip: a ±ContainerClipHalf rect; the zero shadow only in the Developer "shadow" mode; None = born input-live */
    clipDefault: /else\s*\{\s*double h = S11ChatRules\.ContainerClipHalf;\s*stage\.Clip \?\?= new Microsoft\.Maui\.Controls\.Shapes\.RectangleGeometry\(new Microsoft\.Maui\.Graphics\.Rect\(-h, -h, 2 \* h, 2 \* h\)\);\s*\}\s*return S11ChatRules\.containerWord\(pick\);/.test(helper),
    shadowOnlyInShadowMode: /if \(pick == S11ChatRules\.ContainerShadow\)\s*\{\s*stage\.Shadow \?\?= new Microsoft\.Maui\.Controls\.Shadow \{ Brush = Brush\.Black, Opacity = 0f, Radius = 0, Offset = new Point\(0, 0\) \};\s*\}\s*else if \(pick == S11ChatRules\.ContainerNone\)\s*\{\s*stage\.InputTransparent = false;\s*\}/.test(helper),
    /* #46 fix r1 (R3 MINOR-2): EVERY "Shadow" in the code (any spelling: .Shadow, ShadowProperty, SetValue(…Shadow…), a
       Shadow-typed local) — exactly the three of the helper's Shadow-mode branch, nowhere else */
    oneShadowSite: shadowAt.length === 3 && shadowAt.every((i) => i > helperAt && i < helperAt + helper.length)
      && count(helper, /new Microsoft\.Maui\.Controls\.Shadow \{/g) === 1 && count(helper, /\bstage\.Shadow \?\?=/g) === 1,
    devGate: /bool dev = Microsoft\.Maui\.Storage\.Preferences\.Default\.Get\("devMode", false\);\s*mode = S11ChatRules\.effectiveContainer\(dev, dev \? Microsoft\.Maui\.Storage\.Preferences\.Default\.Get\(S11ChatRules\.ContainerPrefKey, 0\) : 0\);/.test(helper)
      && /int pick = S11ChatRules\.containerFor\(mode, needsInputFlip\);/.test(helper),
    helperAndroid: insideAndroid(SCP, SCP.indexOf('private static string applyStageContainer(')),
    /* exactly two stages get it: the warm spare (held) and every overlay stage of the cold path (held / parking keep one) */
    twoSites: count(SCP, /applyStageContainer\(stage, /g) === 2
      && /op\.holdUntilDrawn = true;\s*op\.containerWord = applyStageContainer\(stage, true\);\s*stage\.CascadeInputTransparent = false;\s*#endif/.test(warm)
      && insideAndroid(SCP, coldAt) && /op\.inputFixed = op\.containerWord == "none";/.test(SCP.slice(coldAt, coldAt + 300))
      /* #46 fix r1 (R1 MINOR-1): None only for a slide-in — the container is chosen AFTER op.slideIn, before the stage is added */
      && slideSetAt > 0 && coldAt > slideSetAt && stagedAt > coldAt && stagedAt - coldAt < 2500
      && /public static bool stageNeedsInputFlip\(bool held, bool parks, bool slidesIn\)\s*\{\s*return held \|\| parks \|\| !slidesIn;\s*\}/.test(RULES),
    /* a None-mode stage is never flipped input-dead: present + both exit writes guarded; the three other `= true` sites
       (parked re-present, parked hide, the lock stage) never carry a None stage */
    noneGuards: count(SCP, /if \(!op\.inputFixed\) op\.stage\.InputTransparent = true;/g) === 3
      && count(SCP, /(?<!if \(!op\.inputFixed\) )op\.stage\.InputTransparent = true;/g) === 3
      && /if \(!op\.inputFixed\) op\.stage\.InputTransparent = true;\s*revealStage\(op\);/.test(SCP),
    presentLine: /\(op\.containerWord\.Length > 0 \? " container=" \+ op\.containerWord : ""\)/.test(present),
    rule: /public const double ContainerClipHalf = 100000;/.test(RULES) && /public const string ContainerPrefKey = "devOverlayContainer";/.test(RULES),
  };
  ok(Object.values(c).every((x) => x === true),
    '★ S14 (#1282): every Android overlay stage keeps its permanent WrapperView through a CLIP (a ±1e5 RectangleGeometry — no shadow, so no per-frame software shadow draw on a fade); the 13c zero shadow survives only as the Developer "Shadow" mode; "None" (dev mode, non-held, non-parking) = born input-live and never flipped; the mode rides the [P1] present line — ' + JSON.stringify(c));

  /* ── (a2) #1283 the ride-along ── */
  const openChat = between(CD, 'current_url.StartsWith("ixian:openChat:", StringComparison.Ordinal)', 'catch (Exception)');
  const arm = between(SCP, 'public static bool rideNextChatSwap(SpixiContentPage info, string navKey)', 'private static void dropRide(');
  const timed = between(SCP, 'private static void rideTimedOut(RideAlong ride, bool backstop)', 'private static bool rideKeeps(');
  const keepFn = between(SCP, 'private static bool rideKeeps(PreloadOp op)', 'private static void rideStaged(');
  const pp = between(SCP, 'private static void presentPreload(PreloadOp op, string reason)', 'private const uint ScreenSlideInMs');
  const lift = between(SCP, 'private static async Task liftStageInput(PreloadOp op)', 'private static async Task slideStageIn(PreloadOp op)');
  const slideFn = between(SCP, 'private static async Task slideStageIn(PreloadOp op)', 'private static void cancelPreload(PreloadOp op)');
  const hpChatMs = +((HP.match(/pushPageLoaded\(new SingleChatPage\(friend, wide \? this : null\), (\d+), "chat"/) || [])[1] || 0);
  const backstopMs = +((SCP.match(/private const int RideOwnedBackstopMs = (\d+);/) || [])[1] || 0);
  const drop = between(SCP, 'private static void dropRide(RideAlong? only, string why)', 'private static void rideTimedOut(');
  const take = between(SCP, 'private static void takeRide(PreloadOp op, List<PreloadOp> stale)', 'private static void settleRider(');
  const settle = between(SCP, 'private static void settleRider(PreloadOp held, string why)', 'private static void closeDeferredStale(');
  const cds = between(SCP, 'private static void closeDeferredStale(PreloadOp held)', 'private static bool tryHoldUntilDrawn(');
  const rem = between(SCP, 'public void removePage(Page page)', 'public static string contactRelationFor(');
  const spare = between(SCP, 'public string? pushSpareChat(', 'if (why != null)');
  const co = between(SCP, 'private static void closeOverlay(PreloadOp op, bool slideOut = false)', 'private static string p1CloseStart(');
  const cancel = between(SCP, 'private static void cancelPreload(PreloadOp op)', 'private void presentPlain(');
  const sweepAt = SCP.indexOf('op.deferredStale.AddRange(stale);');
  const rideLines = [...SCP.matchAll(/P1Perf\.line\("(ride [^"]*)"/g)].map((m) => m[1]);
  const r = {
    /* ContactDetails: the ride decides BEFORE onChat; not riding = today's close first */
    arm: /bool rides = Utils\.getChatPage\(targetFriend\) == null\s*&& SpixiContentPage\.rideNextChatSwap\(this, "chat:" \+ targetFriend\.walletAddress\.ToString\(\)\);\s*if \(!rides\)\s*\{\s*popPageAsync\(\);\s*\}\s*HomePage\.Instance\(\)\?\.onChat\(targetAddr, null\);/.test(openChat)
      && /string navKey = "chat:" \+ friend\.walletAddress;/.test(HP),   /* the same key HomePage.onChat stages with */
    armAndroidOnly: /#if ANDROID[\s\S]*rideAlong = ride;[\s\S]*Task\.Delay\(RideTimeoutMs\)\.ContinueWith\(_ => MainThread\.BeginInvokeOnMainThread\(\(\) => rideTimedOut\(ride, false\)\)\);\s*Task\.Delay\(RideOwnedBackstopMs\)\.ContinueWith\(_ => MainThread\.BeginInvokeOnMainThread\(\(\) => rideTimedOut\(ride, true\)\)\);\s*return true;\s*#else\s*return false;\s*#endif/.test(arm)
      /* #46 fix r1 (R3 NIT-1 + R1 MINOR-2): one ride at a time; a None-mode (container-less) info never rides */
      && /if \(op == null \|\| op\.closing \|\| op\.swappedOut \|\| op\.inputFixed \|\| !op\.overlayMode/.test(arm)
      && /\|\| rideAlong != null\)\s*\{\s*P1Perf\.line\("ride refused"\);\s*return false;\s*\}/.test(arm)
      && /op\.column >= 0/.test(arm) && /at != overlayStack\.Count - 1/.test(arm) && /chatUnder == null \|\| chatUnder\.swappedOut \|\| chatUnder\.column >= 0/.test(arm)
      && /private const int RideTimeoutMs = 2000;/.test(SCP),
    /* #46 fix r1 (R1 MINOR-4): the 2 s timeout spares an OWNED ride (the rule: S11ChatRules.rideTimeoutDrops, CSH); the backstop
       outlasts the chat push's own load timeout read from HomePage.onChat; the owner's every outcome ends the ride */
    timeout: /drops = rideAlong == ride && S11ChatRules\.rideTimeoutDrops\(ride\.owner != null, backstop\);/.test(timed)
      && /if \(drops\)\s*\{\s*dropRide\(ride, backstop \? "backstop" : "timeout"\);\s*\}/.test(timed)
      && /public static bool rideTimeoutDrops\(bool owned, bool backstop\)\s*\{\s*return backstop \|\| !owned;\s*\}/.test(RULES)
      && hpChatMs > 0 && backstopMs > hpChatMs + 500,
    ownerEnds: /rideCancelled\(op\);\s*presentPlain\(target\);\s*return;/.test(SCP)
      && /if \(activePreload == op\)\s*\{\s*activePreload = null;\s*\}\s*\}\s*rideCancelled\(op\);\s*\}\s*\}\);\s*\}\s*$/.test(pp),
    /* HomePage.onChat's close of every info pane skips the armed info ONCE; a rider survives its own swap's close hook */
    /* #46 fix r1 (R3 MAJOR-2): the READER of the hook bracket — a rider under the swap's own close hook is kept */
    hookReader: /^private static bool rideKeeps\(PreloadOp op\)\s*\{\s*if \(op\.keepThroughHook\)\s*\{\s*P1Perf\.line\("ride keep why=hook"\);\s*return true;\s*\}/.test(keepFn)
      && count(SCP, /\bkeepThroughHook\b/g) === 4,
    keep: /if \(overlayOp != null\)\s*\{\s*if \(rideKeeps\(overlayOp\)\)\s*\{\s*return;\s*\}\s*closeOverlay\(overlayOp\);/.test(rem)
      && /if \(r == null \|\| r\.info != op \|\| r\.skipUsed \|\| r\.owner != null\)\s*\{\s*return false;\s*\}\s*r\.skipUsed = true;/.test(SCP),
    hookBracket: /PreloadOp\? hookRider = op\.riderHook;\s*if \(hookRider != null\)\s*\{\s*hookRider\.keepThroughHook = true;\s*\}\s*try\s*\{\s*host\?\.onOverlayClosed\(op\.target\);\s*\}\s*catch \(Exception ex\)\s*\{[^}]*\}\s*if \(hookRider != null\)\s*\{\s*hookRider\.keepThroughHook = false;\s*\}/.test(co),
    /* the cold path: the spare (staged earlier, maybe UNDER chat info) is refused while a ride is armed */
    cold: /else if \(rideAlong != null\)\s*\{\s*why = SPARE_WHY_ORDER;\s*\}/.test(spare),
    own: /if \(target is SingleChatPage\)\s*\{\s*rideStaged\(op, op\.deferredStale != null && column < 0\);\s*\}\s*#endif/.test(SCP)
      && /own = S11ChatRules\.rideOwns\(qualifies, r\.owner != null, op\.navKey, r\.navKey\);/.test(SCP) && /if \(!own\)\s*\{\s*dropRide\(r, "path"\);\s*\}/.test(SCP),
    take: sweepAt > 0 && SCP.indexOf('takeRide(op, stale);', sweepAt) > sweepAt && SCP.indexOf('takeRide(op, stale);', sweepAt) < SCP.indexOf('if (op.replaces != null)', sweepAt)
      && /op\.rider = rider;\s*op\.riderHook = rider;\s*rider\.swappedOut = true;\s*try \{ rider\.stage\.InputTransparent = true; \} catch \(Exception\) \{ \}\s*P1Perf\.line\("ride take"\);/.test(take)
      && /Task\.Delay\(RideSettleBackstopMs\)\.ContinueWith\(_ => MainThread\.BeginInvokeOnMainThread\(\(\) => settleRider\(op, "backstop"\)\)\);/.test(take),
    /* the settle runs FIRST at the deferred close (before the old chat leaves the stack), once (taken under the lock) */
    settleFirst: /^private static void closeDeferredStale\(PreloadOp held\)\s*\{\s*settleRider\(held, "deferred"\);\s*List<PreloadOp>\? stale = held\.deferredStale;/.test(cds),
    settle: /rider = held\.rider;\s*held\.rider = null;\s*if \(rider == null\)\s*\{\s*return;\s*\}/.test(settle)
      && /fx = S11ChatRules\.riderEffects\(held\.closing, overlayStack\.Contains\(rider\) && !rider\.closing, overlayStack\.IndexOf\(rider\),/.test(settle)
      /* #46 fix r1 (R3 MAJOR-1): the effects list (CSH S14OverlayTests) is applied WHOLE — both restore writes, the unhook, the
         instant close (no slideOut) — and nothing else touches the rider here */
      && /if \(S11ChatRules\.fxHas\(fx, S11ChatRules\.RiderFxClearSwapped\)\)\s*\{\s*rider\.swappedOut = false;\s*\}\s*if \(S11ChatRules\.fxHas\(fx, S11ChatRules\.RiderFxInputLive\)\)\s*\{\s*try \{ rider\.stage\.InputTransparent = false; \} catch \(Exception\) \{ \}\s*\}\s*if \(S11ChatRules\.fxHas\(fx, S11ChatRules\.RiderFxClearHook\)\)\s*\{\s*held\.riderHook = null;\s*\}\s*if \(S11ChatRules\.fxHas\(fx, S11ChatRules\.RiderFxClose\)\)\s*\{\s*closeOverlay\(rider\);\s*\}/.test(settle)
      && count(settle, /\brider\.\w+ =/g) === 1 && count(settle, /rider\.stage\.InputTransparent/g) === 1,
    /* every fallback = the old close, once (a closing / removed info is never closed again) */
    dropOnce: /rideAlong = null;\s*open = overlayStack\.Contains\(r\.info\) && !r\.info\.closing;/.test(drop) && /if \(open\)\s*\{\s*closeOverlay\(r\.info, true\);\s*\}/.test(drop),
    cancel: /if \(!op\.tryFinish\(\)\)\s*\{\s*return;\s*\}\s*rideCancelled\(op\);/.test(cancel),
    /* #46 fix r1 (R1 NIT-2): the slide's two input-live writes leave a swapped-out stage (a rider taken inside the slide) dead */
    slideSwapped: /try \{ if \(!op\.closing && !op\.swappedOut\) \{ op\.stage\.InputTransparent = false; \} \} catch \(Exception\) \{ \}/.test(lift)
      && /finally[\s\S]*?if \(!op\.closing\)\s*\{\s*try \{ stage\.TranslationX = 0; stage\.Opacity = 1; \} catch \(Exception\) \{ \}\s*if \(!op\.swappedOut\)\s*\{\s*try \{ stage\.InputTransparent = false; \} catch \(Exception\) \{ \}\s*\}\s*\}/.test(slideFn),
    lines: rideLines.length >= 9 && rideLines.every((l) => /^ride [a-z]+( why=[a-z]*)?$/.test(l)),
  };
  ok(Object.values(r).every((x) => x === true),
    '★ S14 (#1283): chat → chat info → a shared group on Android full screen — chat info is NOT closed first: it rides the held swap (the cold path appends the group stage on top), stays on glass input-dead, and closes instantly with the old chat when the group\'s grounds come back; back during the hold restores it; a timeout / another push / a cancel / a vanished info falls back to the old close exactly once; fixed-word [P1] lines — ' + JSON.stringify(r));

  /* ── (b) the Developer row, EXECUTED on the built dev shell ── */
  const dv = {};
  const verb = between(DP, 'current_url.StartsWith("ixian:devflash:container:", StringComparison.Ordinal)', 'current_url.StartsWith("ixian:devflash:", StringComparison.Ordinal)');
  dv.csVerb = /if \(Preferences\.Default\.Get\("devMode", false\)\s*&& S11ChatRules\.parseContainerVerb\(current_url\.Substring\("ixian:devflash:container:"\.Length\), out int mode\)\)\s*\{\s*Preferences\.Default\.Set\(S11ChatRules\.ContainerPrefKey, mode\);\s*\}/.test(verb)
    && /pushContainerDev\(\);/.test(verb)
    && DP.indexOf('"ixian:devflash:container:", StringComparison.Ordinal') < DP.indexOf('"ixian:devflash:", StringComparison.Ordinal)');
  dv.csPush = /private void pushContainerDev\(\)\s*\{\s*#if ANDROID[\s\S]*Utils\.sendUiCommand\(this, "window\.setContainerDev", S11ChatRules\.containerWord\(mode\)\);\s*#endif\s*\}/.test(DP)
    && /pushFlashDev\(\);\s*pushContainerDev\(\);/.test(DP);
  const { boot } = b2Kit(h);
  let s = null;
  try {
    s = await boot('dev.html');
    await sleep(100);
    const radios = () => [...s.d.querySelectorAll('.c-dev-container [role="radio"]')];
    const on = () => radios().filter((x) => x.getAttribute('aria-checked') === 'true').map((x) => x.dataset.container).join();
    dv.hiddenFirst = !s.d.querySelector('.c-dev-container');
    s.push('setContainerDev', 'clip');
    await sleep(60);
    dv.three = radios().length === 3 && radios().map((x) => x.dataset.container).join() === 'clip,shadow,none' && on() === 'clip';
    const b0 = s.sent.length;
    radios()[2].click();
    await sleep(40);
    dv.tap = JSON.stringify(s.sent.slice(b0)) === JSON.stringify(['ixian:devflash:container:none']) && on() === 'none';
    const b1 = s.sent.length;
    radios()[2].click();
    await sleep(40);
    dv.sameNoSend = s.sent.length === b1;
    s.push('setContainerDev', 'shadow');
    await sleep(40);
    dv.echo = on() === 'shadow';
    for (const bad of ['Clip', 'x', '', 'none ', '1']) s.push('setContainerDev', bad);
    await sleep(40);
    dv.malformed = on() === 'shadow';
    /* the S11 flash switches are untouched and the container card survives their rebuild */
    s.push('setFlashDev', '1,1,1');
    await sleep(60);
    dv.flashKept = s.d.querySelectorAll('.c-dev-flash [role="switch"]').length === 3 && on() === 'shadow'
      && s.d.querySelectorAll('.c-dev-container').length === 1;
    dv.noErr = s.errs.filter((e) => /ReferenceError|TypeError|SyntaxError|dispatch failed/.test(e)).length === 0;
  } catch (e) { dv.err = e.message; }
  finally { if (s) { try { s.W.close(); } catch (_) {} } }
  ok(Object.values(dv).every((x) => x === true),
    '★ S14 (#1282) Developer "Overlay container" on the built dev shell: hidden until C# pushes the word (Android only); Clip · Shadow (13c) · None; a tap sends ixian:devflash:container:<word> and moves optimistically (no resend on the current one); the echo sets it; a malformed push is ignored; the S11 flash switches are untouched; C# stores only the exact word in dev mode, in its own preference — ' + JSON.stringify(dv));
}
