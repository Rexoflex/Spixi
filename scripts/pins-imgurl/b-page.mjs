/* ==== The media origin, the chat page's half (contract docs/contract-imgurl.md § 2 row 1b, § 3; packet P113) — with the switch
 * ImgurlFlags.MediaOrigin ON, a WebView whose handler serves and a document whose setCaps declared mediaOrigin, the chat page
 * pushes a MediaGrants URL as the VALUE of the existing setFileThumb(id, v) / viewerImage(token, v); otherwise today's data: URI.
 * SOURCE PIN (#1735) — LIMITS: SingleChatPage.xaml.cs, SingleChatPage.MediaOrigin.cs and ViewerImage.cs are MAUI-bound and
 * UNCOMPILED here (csh runs only MediaPushRules.cs: MediaPushTests). The keys hold the comment-stripped TEXT, not bindings: a
 * shadow member or type of the same name, a `#define`, a csproj `Compile Remove`, reflection, an overload picked by the compiler,
 * or a call reached through another member is not seen (the diff review and the Windows compile hold those). What the grant does
 * (owner, document, token, caps) is MediaGrants' (pin a, MediaGrantsTests); what the shell does with the value is pin c. Thread
 * claims (drainer / pool / main) are read from the call site, not proven.
 *   b1 viewer     — onViewImage's run: `if (mediaUrlFor(doc)) uri = await viewerValueAsync(doc, hexId, file, stillWanted); else uri =
 *                   await ViewerImage.dataUriOfAsync(file, stillWanted);` — the else is the old statement, word for word, and the page's
 *                   only dataUriOfAsync call; viewerValueAsync awaits ViewerImage.jpegOfAsync(file, stillWanted), drops an unwanted
 *                   tap, grants MediaKind.Viewer at ViewerImage.MaxEdge for (doc, hexId) and answers MediaPushRules.valueOf(grant, jpeg).
 *   b2 thumb      — processThumb: `string? uri = mediaUrlFor(job.doc) ? mediaThumbValue(fi, job, out bool hit) : chatThumbFor(fi,
 *                   job.id, job.gen, out hit);` (the OFF branch = the old call); mediaThumbValue grants MediaKind.Thumb at ChatThumbPx
 *                   for (job.doc, job.id) over chatThumbJpeg's bytes and answers valueOf(url, jpeg); mediaUrlFor = MediaPushRules.urlPath
 *                   over the switch, MediaGrants.serving and mediaUrlDoc.
 *   b3 no base64  — on the URL path no base64 string of the picture is built: the partial names no ToBase64String, chatThumbUri,
 *                   chatThumbFor, chatThumbOf, chatThumbOld or dataUriOf; valueOf returns the grant URL before it builds a data: URI;
 *                   jpegOfAsync / jpegHeld build none.
 *   b4 same gate  — chatThumbJpeg: the source cap + first-bytes sniff come before every cache read and decode; both chatThumbLru puts
 *                   go through ChatMediaStore.ifCurrentThumb; putThumb only inside the still-the-same-version check; the partial's
 *                   one SThumbnail.makeJpeg is in madeChatThumb (≤ ChatThumbMaxBytes), called only after the sniff.
 *   b5 document   — onLoad: `mediaBeginDocument();` is the statement right after the photo1a gate's `mediaGate.load(…, thumbDoc);`,
 *                   after the one `thumbDoc++;` and before the first loadMessages (no picture push of the new document comes
 *                   earlier); it calls MediaGrants.beginDocument(owner, thumbDoc) only with the switch ON.
 *   b6 teardown   — OnDisappearing: `if (isDisposed) { dropMediaBatch(); mediaRevoke(); }`; mediaRevoke calls
 *                   MediaGrants.revokeOwner on the owner mediaBeginDocument kept; beginDocument / revokeOwner / grant are called
 *                   only in the partial (no other page file names them).
 *   b7 caps       — the statement after `caps += SpixiFlags.Photo1bChatCaps;` is `caps += mediaOriginCaps();`, then setCaps;
 *                   mediaOriginCaps asks serving only with the switch ON, records mediaUrlDoc, and answers capsText(on, serving,
 *                   on && ImgurlFlags.MediaKeep); capsText is the § 3 table; the cap words are written nowhere else in C#.
 *   b8 old path   — SingleChatPage.xaml.cs with the five call-site statements reverted and convertToBot() put back before
 *                   reloadScreen() (the size rule R6 moved it WHOLE to SingleChatPage.Bot.cs, whose text b8 holds exactly) is its
 *                   base `ae7b8303` text (SHA-256,
 *                   stripCode, whitespace collapsed); ViewerImage's dataUriOf / dataUriOfAsync / sourceOf bodies are the base ones and
 *                   decodeHeld = jpegHeld + the base data: line.
 *   b9 no new door — the partial holds no string literal (no push name, no log text), no Logging, no sendUiCommand / sendBuiltCommand,
 *                   no file op but `new FileInfo(fi.FullName)` of C#'s own FileInfo; the page still has two "setFileThumb" and one
 *                   "viewerImage" literal.
 *   b10 harness   — csh.csproj compiles the REAL MediaPushRules.cs; MediaPushTests.cs holds ≥ 9 tests.
 *   b11 gate      — ViewerImage.jpegOfAsync: stillWanted before the decode gate and again with it held (wantedHeld: a throw = false),
 *                   the gate released on the second no, the held gate handed to jpegHeld, whose finally releases it. Limits: the gate
 *                   width (SemaphoreSlim(8, 8)) and GateWaitMs are base fields and NOT held here; a double Release is caught by b8 only.
 * DELIBERATE BREAKS (#802; one mutation each in a full copy, `node scripts/run-pins.mjs --root <copy> pins-imgurl/b-page`; each
 * RESULT pass=10 fail=1, the red key in brackets): b1 viewerValueAsync `MediaKind.Viewer` → `MediaKind.Thumb` [body] · b2
 * mediaThumbValue `ChatThumbPx` → `ViewerImage.MaxEdge` [grant] · b3 valueOf `grantUrl ?? ` dropped [urlFirst] · b4 the kept
 * bytes' LRU put without ChatMediaStore.ifCurrentThumb [lruPutsGated] · b5 `mediaBeginDocument();` moved above `thumbDoc++;`
 * [afterBump]; the line commented out [afterBump] · b6 `mediaRevoke();` deleted [site] · b7 `on && ImgurlFlags.MediaKeep` → `ImgurlFlags.MediaKeep` [body] · b8
 * dataUriOfAsync `wanted = false;` → `wanted = true;` [dataUriOfAsync] · b9 chatThumbJpeg's catch logs the exception type [noLog] ·
 * b10 the csh.csproj line names MediaPushRulez.cs [compiled] · b11 the Release of the second stillWanted branch dropped [body] ·
 * b11 wantedHeld's catch returns true [held] · b11 jpegHeld's finally Release dropped [releases] (b8 red too: the base decode). */
import { createHash } from 'node:crypto';

export const SCP_F = 'Spixi/Pages/Chat/SingleChatPage.xaml.cs', PART_F = 'Spixi/Pages/Chat/SingleChatPage.MediaOrigin.cs';
export const VI_F = 'Spixi/Utils/ViewerImage.cs', RULES_F = 'Spixi/Utils/MediaPushRules.cs';
export const VIEW_LINE = 'if (mediaUrlFor(doc)) uri = await viewerValueAsync(doc, hexId, file, stillWanted); else uri = await ViewerImage.dataUriOfAsync(file, stillWanted);';
export const VIEW_OLD = 'uri = await ViewerImage.dataUriOfAsync(file, stillWanted);';
export const THUMB_LINE = 'string? uri = mediaUrlFor(job.doc) ? mediaThumbValue(fi, job, out bool hit) : chatThumbFor(fi, job.id, job.gen, out hit);';
export const THUMB_OLD = 'string? uri = chatThumbFor(fi, job.id, job.gen, out bool hit);';
export const DOC_LINE = 'mediaBeginDocument();', REVOKE_LINE = 'mediaRevoke();', CAPS_LINE = 'caps += mediaOriginCaps();';
/* SHA-256 at the base ae7b8303 (stripCode; whitespace collapsed): the page; ViewerImage's three untouched bodies */
export const BASE = {
  page: '301589073b4336566be49446abb03f671aae7833b2617033167fe0327acb72c9',
  dataUriOf: 'c71f43f3ffe4fc8455fb11622c268eb585e9565b677b63dd267ce48ce3c71015',
  dataUriOfAsync: '3f1303bde866c2f6eeaa9fc60d232b862c9dabf4edc65a29f485e6b3f8ce14e2',
  sourceOf: '3dca53c428176e24dd54ae83d76151b9c75ab2c3a24769e86425fbe30774f324',
};
/* the base decodeHeld body, from which jpegHeld must follow (stripCode; whitespace collapsed) */
export const BASE_DECODE = '{ byte[]? jpeg; try { jpeg = Spixi.SThumbnail.makeViewerJpeg(full, MaxEdge); } finally { decodeGate.Release(); } if (jpeg == null || !ViewerRules.viewerJpegOk(jpeg.Length, MaxJpegBytes)) { return null; } return "data:image/jpeg;base64," + Convert.ToBase64String(jpeg); }';

export const norm = (t) => t.replace(/\s+/g, ' ').trim();
export const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
export const blockAt = (t, from) => {
  const o = t.indexOf('{', from);
  if (o < 0) return { o: -1, end: -1, text: '' };
  let d = 0;
  for (let k = o; k < t.length; k++) {
    const c = t[k];
    if (c === '"') { k++; while (k < t.length && t[k] !== '"') { if (t[k] === '\\') k++; k++; } continue; }
    if (c === "'") { k++; while (k < t.length && t[k] !== "'") { if (t[k] === '\\') k++; k++; } continue; }
    if (c === '{') d++; else if (c === '}' && --d === 0) return { o, end: k + 1, text: t.slice(o, k + 1) };
  }
  return { o, end: -1, text: '' };
};
export const bodyOf = (t, sig) => (t.split(sig).length - 1 !== 1 ? '' : blockAt(t, t.indexOf(sig) + sig.length).text);
/* an expression-bodied member: the text from its `=>` to the first `;` (none of these bodies holds a block or a `;` literal) */
export const exprOf = (t, sig) => { if (t.split(sig).length - 1 !== 1) return ''; const r = t.slice(t.indexOf(sig) + sig.length); const m = /^\s*=>/.exec(r); return m ? r.slice(0, r.indexOf(';') + 1).trim() : ''; };
/* the size rule R6 (the file is over 1,500 lines and must not grow): convertToBot() moved WHOLE, unchanged, from the page to the
   partial SingleChatPage.Bot.cs; revertPage puts it back at its base place (before reloadScreen) and b8 holds the new file's text */
export const BOT_F = 'Spixi/Pages/Chat/SingleChatPage.Bot.cs';
export const MOVED_BOT = 'public void convertToBot() { popToRootAsync(); if (homePage != null) { homePage.removeDetailContent(false); homePage.onChat(friend.walletAddress, null); } else { HomePage.Instance().onChat(friend.walletAddress, null); } }';
/* the page with the five call-site statements of item 1b reverted to the base text, and the moved method put back */
export const revertPage = (t) => norm(t).split(' ' + DOC_LINE).join('').split(' ' + REVOKE_LINE).join('').split(' ' + CAPS_LINE).join('')
  .split(VIEW_LINE).join(VIEW_OLD).split(THUMB_LINE).join(THUMB_OLD).replace('public void reloadScreen()', MOVED_BOT + ' public void reloadScreen()');

export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, existsSync, join } = h;
  const raw = (f) => (existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8').replace(/^﻿/, '') : '');
  const rd = (f) => stripCode(raw(f));
  const count = (t, s) => (typeof s === 'string' ? t.split(s).length - 1 : (t.match(s) || []).length);
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const SCP = rd(SCP_F), PART = rd(PART_F), VI = rd(VI_F), RULES = rd(RULES_F);
  const nb = (t, sig) => norm(bodyOf(t, sig)), ne = (t, sig) => norm(exprOf(t, sig));
  const onView = nb(SCP, 'private void onViewImage(string hexId)');
  const procT = nb(SCP, 'private void processThumb(ThumbJob job)');
  const viewVal = nb(PART, 'private async Task<string?> viewerValueAsync(int doc, string hexId, string file, Func<bool> stillWanted)');
  const thumbVal = ne(PART, 'private string? mediaThumbValue(FileInfo fi, ThumbJob job, out bool hit)');
  const urlFor = ne(PART, 'private bool mediaUrlFor(int doc)'), servingM = ne(PART, 'private bool mediaServing()');
  const valueM = ne(PART, 'private string? mediaValue(int doc, MediaKind kind, string idHex, int px, byte[]? jpeg)');
  const jpegFor = nb(PART, 'private byte[]? chatThumbJpeg(FileInfo fi, string idHex, long gen, out bool hit)');
  const made = nb(PART, 'private static byte[]? madeChatThumb(string fullPath)');
  const begin = nb(PART, 'private void mediaBeginDocument()'), revoke = nb(PART, 'private void mediaRevoke()');
  const capsM = nb(PART, 'private string mediaOriginCaps()');
  const valueOf = ne(RULES, 'public static string? valueOf(string? grantUrl, byte[]? jpeg)');
  const urlPath = ne(RULES, 'public static bool urlPath(bool switchOn, bool serving, int declaredDoc, int doc)');
  const capsText = ne(RULES, 'public static string capsText(bool originOn, bool serving, bool keepOn)');
  const jpegOf = nb(VI, 'public static async System.Threading.Tasks.Task<byte[]?> jpegOfAsync(string path, Func<bool> stillWanted)');
  const jpegHeld = nb(VI, 'private static byte[]? jpegHeld(string full)');
  const decodeHeld = nb(VI, 'private static string? decodeHeld(string full)');

  /* ── b1 · the viewer ── */
  const b1 = {
    site: count(onView, VIEW_LINE) === 1 && count(norm(SCP), VIEW_LINE) === 1,
    oldOnlyThere: count(SCP, 'ViewerImage.dataUriOfAsync(') === 1 && count(SCP, 'viewerValueAsync(') === 1,
    body: viewVal === '{ byte[]? jpeg = await ViewerImage.jpegOfAsync(file, stillWanted).ConfigureAwait(false); return jpeg == null || !stillWanted() ? null : mediaValue(doc, MediaKind.Viewer, hexId, ViewerImage.MaxEdge, jpeg); }',
    grant: valueM === '=> MediaPushRules.valueOf(jpeg != null && _webView is WebView owner ? MediaGrants.grant(owner, doc, kind, idHex, px, jpeg) : null, jpeg);',
  };
  ok(F(b1).length === 0,
    '★ imgurl b1 viewer (item 1b, P113): onViewImage answers `if (mediaUrlFor(doc)) uri = await viewerValueAsync(…); else uri = await ViewerImage.dataUriOfAsync(file, stillWanted);` — OFF / no server / not declared = the old statement word for word; the URL path awaits ViewerImage.jpegOfAsync, drops an unwanted tap, grants MediaKind.Viewer at ViewerImage.MaxEdge for (doc, hexId) on the page\'s own WebView and answers MediaPushRules.valueOf(grant, the same bytes) — failing: ' + JSON.stringify(F(b1)));

  /* ── b2 · the thumbnails ── */
  const b2 = {
    site: count(procT, THUMB_LINE) === 1 && count(norm(SCP), THUMB_LINE) === 1 && count(SCP, 'chatThumbFor(') === 4,
    grant: thumbVal === '=> mediaValue(job.doc, MediaKind.Thumb, job.id, ChatThumbPx, chatThumbJpeg(fi, job.id, job.gen, out hit));',
    rule: urlFor === '=> MediaPushRules.urlPath(ImgurlFlags.MediaOrigin, ImgurlFlags.MediaOrigin && mediaServing(), mediaUrlDoc, doc);'
      && servingM === '=> _webView is WebView owner && MediaGrants.serving(owner);'
      && urlPath === '=> switchOn && serving && declaredDoc >= 0 && declaredDoc == doc;',
    pushUnchanged: procT.includes('string? builtCmd = SpixiFlags.PhotoMediaAfterPaint ? UiCommandText.build("setFileThumb", id, uri) : null;')
      && procT.includes('Utils.sendUiCommand(this, "setFileThumb", id, plainUri!);'),
  };
  ok(F(b2).length === 0,
    '★ imgurl b2 thumb (item 1b, P113): processThumb takes `mediaUrlFor(job.doc) ? mediaThumbValue(fi, job, out bool hit) : chatThumbFor(fi, job.id, job.gen, out hit)` (OFF = the old call); mediaThumbValue grants MediaKind.Thumb at ChatThumbPx for (job.doc, job.id) over chatThumbJpeg\'s bytes and answers valueOf(url, jpeg); mediaUrlFor = urlPath(switch, serving, mediaUrlDoc, doc); the push statements are the base ones — failing: ' + JSON.stringify(F(b2)));

  /* ── b3 · no base64 of the picture on the URL path ── */
  const b3 = {
    partial: !/ToBase64String|\bchatThumbUri\(|\bchatThumbFor\(|\bchatThumbOf\(|\bchatThumbOld\(|\bdataUriOf/.test(PART),
    urlFirst: valueOf === '=> jpeg == null || jpeg.Length == 0 ? null : grantUrl ?? JpegDataPrefix + Convert.ToBase64String(jpeg);',
    viewerBytes: jpegOf.length > 40 && !/ToBase64String|decodeHeld\(/.test(jpegOf) && jpegOf.includes('return jpegHeld(full);') && !/ToBase64String/.test(jpegHeld),
  };
  ok(F(b3).length === 0,
    '★ imgurl b3 no base64 (item 1b): on the URL path no base64 string of the picture is built — the partial names no ToBase64String / chatThumbUri / chatThumbFor / chatThumbOf / chatThumbOld / dataUriOf, MediaPushRules.valueOf returns the grant URL before it builds a data: URI, and ViewerImage.jpegOfAsync / jpegHeld build none — failing: ' + JSON.stringify(F(b3)));

  /* ── b4 · the same gate as chatThumbFor ── */
  const SNIFF = 'if (length <= 0 || length > ChatThumbSourceMax || !ImageSniff.looksLikeImage(readHead16(fi.FullName))) return null;';
  const at = (s) => jpegFor.indexOf(s);
  const firstRead = Math.min(...['mediaThumbOld.tryGet(', 'chatThumbLru.tryGet(', 'chatThumbMisses.has(', 'ChatMediaStore.getThumb(', 'madeChatThumb('].map((s) => (at(s) < 0 ? 1e9 : at(s))));
  const b4 = {
    sniffFirst: count(jpegFor, SNIFF) === 1 && at(SNIFF) > 0 && at(SNIFF) < firstRead && firstRead < 1e9,
    lruPutsGated: count(jpegFor, 'chatThumbLru.put(') === 2 && count(jpegFor, 'ChatMediaStore.ifCurrentThumb(chat, idHex, gen, () => chatThumbLru.put(key, ') === 2,
    storeAfterCheck: count(jpegFor, 'ChatMediaStore.putThumb(') === 1
      && jpegFor.includes('if (now.Exists && now.Length == length && now.LastWriteTimeUtc.Ticks == ticks && ChatMediaStore.ifCurrentThumb(chat, idHex, gen, () => chatThumbLru.put(key, made))) { ChatMediaStore.putThumb(chat, idHex, version, made, gen); }'),
    oneDecoder: count(PART, 'SThumbnail.makeJpeg(') === 1 && count(PART, 'SThumbnail.') === 1 && count(made, 'Spixi.SThumbnail.makeJpeg(fullPath, ChatThumbPx)') === 1
      && made.includes('jpeg.Length <= ChatThumbMaxBytes') && count(PART, 'madeChatThumb(') === 3,
    storeGate: jpegFor.includes('bool store = SpixiFlags.PhotoThumbStore && chatThumbStoreFits && chat != null;') && jpegFor.includes('string? key = store ? ChatMediaStore.thumbKeyOf(chat, idHex, version) : null;'),
  };
  ok(F(b4).length === 0,
    '★ imgurl b4 same gate (item 1b): chatThumbJpeg holds chatThumbFor\'s order — the 20 MB cap + first-bytes sniff before any cache read or decode, both memory puts through ChatMediaStore.ifCurrentThumb (a delete since `gen` keeps nothing), the store put only when the file is still the keyed version, the store only with PhotoThumbStore + the fitting edge + a chat; the one platform decode is madeChatThumb (≤ ChatThumbMaxBytes) — failing: ' + JSON.stringify(F(b4)));

  /* ── b5 · the document ── */
  const nS = norm(SCP);
  const onLoadN = nb(SCP, 'private void onLoad()');
  const GATE_LOAD = 'mediaGate.load(SpixiFlags.PhotoMediaAfterPaint, paintedSeen, thumbDoc); ';
  const b5 = {
    afterBump: count(onLoadN, GATE_LOAD + DOC_LINE) === 1 && count(SCP, DOC_LINE) === 1 && count(SCP, 'thumbDoc++') === 1
      && onLoadN.indexOf('thumbDoc++;') > 0 && onLoadN.indexOf('thumbDoc++;') < onLoadN.indexOf(DOC_LINE)
      && onLoadN.indexOf(DOC_LINE) < onLoadN.indexOf('loadMessages(') && onLoadN.indexOf(DOC_LINE) < onLoadN.indexOf(CAPS_LINE),
    body: begin === '{ WebView? owner = _webView; if (!ImgurlFlags.MediaOrigin || owner == null) return; mediaOwner = new WeakReference<WebView>(owner); MediaGrants.beginDocument(owner, thumbDoc); }',
  };
  ok(F(b5).length === 0,
    '★ imgurl b5 document (item 1b): onLoad runs `mediaBeginDocument();` right after the photo1a gate load, after the one `thumbDoc++;` and before the first loadMessages and the caps — MediaGrants.beginDocument(owner, thumbDoc) on the page\'s WebView, only with the switch ON, so every grant of an older document is revoked before this document\'s first push — failing: ' + JSON.stringify(F(b5)));

  /* ── b6 · the teardown ── */
  const pages = [];
  const walk = (d) => { for (const e of readdirSync(join(root, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) { if (e.name !== 'bin' && e.name !== 'obj') walk(p); } else if (e.name.endsWith('.cs')) pages.push(p); } };
  walk('Spixi/Pages');
  const pageTexts = pages.map((f) => [f, rd(f)]);
  const callers = (re) => pageTexts.filter(([, t]) => re.test(t)).map(([f]) => f);
  const onDis = nb(SCP, 'protected override void OnDisappearing()');
  const b6 = {
    site: onDis.includes('base.OnDisappearing(); if (isDisposed) { dropMediaBatch(); ' + REVOKE_LINE + ' } }') && count(SCP, REVOKE_LINE) === 1,
    body: revoke === '{ if (Interlocked.Exchange(ref mediaOwner, null) is WeakReference<WebView> had && had.TryGetTarget(out WebView? owner)) MediaGrants.revokeOwner(owner); }',
    onlyPartial: ['MediaGrants.beginDocument(', 'MediaGrants.revokeOwner(', 'MediaGrants.grant('].every((s) => { const c = callers(new RegExp(s.replace(/[.()]/g, '\\$&'))); return c.length === 1 && c[0] === PART_F; })
      && count(PART, 'MediaGrants.grant(') === 1 && count(PART, 'MediaGrants.revokeOwner(') === 1 && count(PART, 'MediaGrants.beginDocument(') === 1,
  };
  ok(F(b6).length === 0,
    '★ imgurl b6 teardown (item 1b): OnDisappearing runs `mediaRevoke();` beside dropMediaBatch() once the page is torn down — MediaGrants.revokeOwner on the WebView mediaBeginDocument kept; under Spixi/Pages only the partial names MediaGrants.beginDocument / revokeOwner / grant — failing: ' + JSON.stringify(F(b6)));

  /* ── b7 · the caps ── */
  const csAll = [];
  const walkAll = (d) => { for (const e of readdirSync(join(root, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) { if (e.name !== 'bin' && e.name !== 'obj') walkAll(p); } else if (e.name.endsWith('.cs')) csAll.push(p); } };
  walkAll('Spixi');
  const capWordFiles = csAll.filter((f) => /"[^"\n]*\bmedia(?:Origin|Keep)\b[^"\n]*"/.test(rd(f)));   // the cap words inside a C# string literal
  const b7 = {
    site: count(nS, 'caps += SpixiFlags.Photo1bChatCaps; ' + CAPS_LINE + ' Utils.sendUiCommand(this, "setCaps", caps);') === 1 && count(SCP, CAPS_LINE) === 1,
    body: capsM === '{ bool on = ImgurlFlags.MediaOrigin, serving = on && mediaServing(); mediaUrlDoc = serving ? thumbDoc : -1; return MediaPushRules.capsText(on, serving, on && ImgurlFlags.MediaKeep); }',
    table: capsText === '=> !(originOn && serving) ? "" : keepOn ? OriginCap + KeepCap : OriginCap;'
      && RULES.includes('public const string OriginCap = ",mediaOrigin", KeepCap = ",mediaKeep";'),
    wordsOnce: capWordFiles.length === 1 && capWordFiles[0] === RULES_F,
  };
  ok(F(b7).length === 0,
    '★ imgurl b7 caps (item 1b, § 3 Caps): `caps += mediaOriginCaps();` follows the Photo1bChatCaps line and precedes setCaps; mediaOrigin only with the switch ON and MediaGrants.serving, mediaKeep only beside it with its switch ON, and mediaUrlDoc records the document that declared it; the cap words live only in MediaPushRules.cs (' + JSON.stringify(capWordFiles) + ') — failing: ' + JSON.stringify(F(b7)));

  /* ── b8 · the old path ── */
  const b8 = {
    page: sha(revertPage(SCP)) === BASE.page && !norm(SCP).includes('public void convertToBot()'),
    bot: norm(rd(BOT_F)) === 'namespace SPIXI { public partial class SingleChatPage { ' + MOVED_BOT + ' } }',
    dataUriOf: sha(nb(VI, 'public static string? dataUriOf(string path)')) === BASE.dataUriOf,
    dataUriOfAsync: sha(nb(VI, 'public static async System.Threading.Tasks.Task<string?> dataUriOfAsync(string path, Func<bool> stillWanted)')) === BASE.dataUriOfAsync,
    sourceOf: sha(nb(VI, 'private static string? sourceOf(string path)')) === BASE.sourceOf,
    decodeShared: decodeHeld === '{ byte[]? jpeg = jpegHeld(full); if (jpeg == null) return null; return "data:image/jpeg;base64," + Convert.ToBase64String(jpeg); }'
      && jpegHeld === BASE_DECODE.replace('return "data:image/jpeg;base64," + Convert.ToBase64String(jpeg); }', 'return jpeg; }'),
  };
  ok(F(b8).length === 0,
    '★ imgurl b8 old path (item 1b, #1312 / #1478): SingleChatPage.xaml.cs with the five call-site statements reverted and convertToBot() put back is its base ae7b8303 text (SHA-256), SingleChatPage.Bot.cs holds that method unchanged and nothing else (the R6 move), ViewerImage\'s dataUriOf / dataUriOfAsync / sourceOf are the base bodies and decodeHeld = jpegHeld (the base decode) + the base data: line — the switch OFF runs the base statements — failing: ' + JSON.stringify(F(b8)) + ' got ' + sha(revertPage(SCP)).slice(0, 12));

  /* ── b11 · the bytes form holds and releases the gate like its twin (#46 r3 PC3-m3) ── */
  const b11 = {
    body: nb(VI, 'public static async System.Threading.Tasks.Task<byte[]?> jpegOfAsync(string path, Func<bool> stillWanted)')
      === '{ try { string? full = sourceOf(path); if (full == null || stillWanted == null || !stillWanted() || !await decodeGate.WaitAsync(GateWaitMs).ConfigureAwait(false)) return null; if (!wantedHeld(stillWanted)) { decodeGate.Release(); return null; } return jpegHeld(full); } catch (Exception) { return null; } }',
    held: nb(VI, 'private static bool wantedHeld(Func<bool> stillWanted)') === '{ try { return stillWanted(); } catch (Exception) { return false; } }',
    releases: /finally\s*\{\s*decodeGate\.Release\(\);/.test(bodyOf(VI, 'private static byte[]? jpegHeld(string full)')),
  };
  ok(F(b11).length === 0,
    '★ imgurl b11 gate (item 1b, #46 r3 PC3-m3): ViewerImage.jpegOfAsync asks stillWanted before the process-wide decode gate and again with it held (wantedHeld: a throwing callback = false), releases the gate when the second answer is no, and hands the held gate to jpegHeld, whose finally releases it — a viewer that is gone never keeps the slot (a source pin; the order runs nowhere else) — failing: ' + JSON.stringify(F(b11)));

  /* ── b9 · no new door ── */
  const fileOps = PART.match(/\b(?:File|Directory|Path)\.\w+|new FileStream\(|new FileInfo\([^)]*\)/g) || [];
  const b9 = {
    noLiteral: !PART.includes('"') && !PART.includes("'"),
    noLog: !/\bLogging\.|Console\./.test(PART),
    noPush: !/sendUiCommand|sendBuiltCommand|UiCommandText|sendMessage\(/.test(PART),
    fileOps: fileOps.length === 1 && fileOps[0] === 'new FileInfo(fi.FullName)',
    pushNames: count(SCP, '"setFileThumb"') === 2 && count(SCP, '"viewerImage"') === 1,
  };
  ok(F(b9).length === 0,
    '★ imgurl b9 no new door (item 1b; the frozen bridge, ★ C# touches no risky parts): the partial holds no string literal (no push name, no log text), no Logging, no push, and no file op but `new FileInfo(fi.FullName)` of C#\'s own FileInfo (' + JSON.stringify(fileOps) + '); the page still has two "setFileThumb" and one "viewerImage" — failing: ' + JSON.stringify(F(b9)));

  /* ── b10 · the harness runs the REAL rule ── */
  const csproj = raw('scripts/csh/csh.csproj').replace(/<!--[\s\S]*?-->/g, '');
  const tests = stripCode(raw('scripts/csh/MediaPushTests.cs'));
  const b10 = {
    compiled: count(csproj, '<Compile Include="../../Spixi/Utils/MediaPushRules.cs" />') === 1 && !/Compile Remove/.test(csproj),
    tests: count(tests, /\[TestMethod\]/g) >= 9,
  };
  ok(F(b10).length === 0,
    '★ imgurl b10 harness: csh.csproj compiles the REAL MediaPushRules.cs and MediaPushTests.cs holds ≥ 9 tests — failing: ' + JSON.stringify(F(b10)));
}
