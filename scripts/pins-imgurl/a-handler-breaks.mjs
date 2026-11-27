/* ==== imgurl · A — the deliberate breaks of pins-imgurl/a-handler.mjs (#802). BY HAND, not a pin and not in the smoke:
 *   node scripts/pins-imgurl/a-handler-breaks.mjs [key …]
 * Each row is ONE mutation of one file in a FULL COPY of the tree (made once with `cp -a` in the system temp folder, or in $IMGURL_MUT;
 * the files named in FILES are refreshed from this tree on every run). The pin runs in the copy; the red keys are printed next to the
 * keys planned (`key` + `also`), then the file is put back. Exit 0 = every break went red exactly as planned and the copy is green again.
 * A break that reds a second key says so beforehand (`also`), with the reason (`note`). */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..'), MUT = process.env.IMGURL_MUT || join(tmpdir(), 'imgurl-a-handler-mut');
const AND = 'Spixi/Platforms/Android/WebViewRenderer.cs', WIN = 'Spixi/Platforms/Windows/WindowsWebViewHandler.cs', IOS = 'Spixi/Platforms/iOS/iOSWebViewHandler.cs',
  SCH = 'Spixi/Platforms/iOS/MediaSchemeHandler.cs', GR = 'Spixi/Utils/MediaGrants.cs', PROJ = 'Spixi/Spixi.csproj', CSH = 'scripts/csh/csh.csproj',
  SAFE = 'Spixi/Utils/SafetyRules.cs';
const FILES = [AND, WIN, IOS, SCH, GR, PROJ, CSH, SAFE, 'scripts/csh/MediaGrantsTests.cs', 'scripts/pins-imgurl/a-handler.mjs'];

/* key: the row planned red · f: the file · from → to: ONE replacement (the text must stand exactly once) · also: rows that go red with it, said beforehand */
const BREAKS = [
  { key: 'a1', f: AND, from: 'if (ImgurlFlags.MediaOrigin && url.StartsWith(MediaGrants.Host, StringComparison.OrdinalIgnoreCase))', to: 'if (ImgurlFlags.MediaOrigin && url.EndsWith(MediaGrants.Host, StringComparison.OrdinalIgnoreCase))' },
  { key: 'a1', f: AND, from: '            return mediaResponse(request, url);\n        }\n        if (!Utils.IsAllowedURL(url))', to: '            mediaResponse(request, url);\n        }\n        if (!Utils.IsAllowedURL(url))', note: 'the return dropped: the media host falls through to the gate' },
  { key: 'a2', f: AND, from: '    WebResourceResponse mediaResponse(', to: '    WebResourceResponse? mediaResponse(' },
  { key: 'a2', f: AND, from: 'new System.IO.MemoryStream(bytes, false));\n        }\n        catch (Exception) { }', to: 'new System.IO.MemoryStream(bytes, false));\n        }\n        catch (Exception) { return base.ShouldInterceptRequest(null, request); }', also: ['a4'], note: 'a failure falls through to the base: a4 pins the same catch' },
  { key: 'a3', f: AND, from: 'object? owner = _renderer?.Element;\n            if (owner != null && request?.Method', to: 'object? owner = _renderer;\n            if (owner != null && request?.Method' },
  { key: 'a3', f: AND, from: 'request?.Method == "GET" && MediaGrants.tryServe', to: 'request?.Method != "GET" && MediaGrants.tryServe' },
  { key: 'a4', f: AND, from: '404, "Not Found", headers, new System.IO.MemoryStream(Array.Empty<byte>(), false)', to: '200, "Not Found", headers, new System.IO.MemoryStream(Array.Empty<byte>(), false)' },
  { key: 'a5', f: AND, from: 'if (MediaGrants.hostOk(e.NewElement.ClassId))', to: 'if (!MediaGrants.hostOk(e.NewElement.ClassId))' },
  { key: 'a6', f: AND, from: 'MediaGrants.serverDown(e.OldElement);', to: 'MediaGrants.serverDown(e.NewElement);' },
  { key: 'a7', f: AND, from: 'if (source.StartsWith(MediaGrants.Host, StringComparison.OrdinalIgnoreCase)) source = "media";', to: 'if (source.EndsWith(MediaGrants.Host, StringComparison.OrdinalIgnoreCase)) source = "media";' },
  { key: 'a7', f: AND, from: '+ " (" + source + ":" + consoleMessage.LineNumber()', to: '+ " (" + consoleMessage.SourceId() + ":" + consoleMessage.LineNumber()', note: 'the raw source logged again' },
  { key: 'w4', f: WIN, from: 'var env = core?.Environment ?? PlatformView?.CoreWebView2?.Environment;', to: 'var env = core?.Environment;', note: 'the second environment dropped' },
  { key: 'w4', f: WIN, from: '            try\n            {\n                var env = core', to: '            {\n                var env = core', note: 'the try dropped (the block stays): the 404 is made outside any catch' },
  { key: 'i6', f: IOS, from: 'compileContentRules(platformView, "ContentBlockingRules", anchoredContentRules, false);\n                        return;', to: 'compileContentRules(platformView, "ContentBlockingRulesUnanchored", unanchoredContentRules, true);\n                        return;', note: 'a failed media list goes straight to the unanchored list' },
  { key: 'i6', f: IOS, from: 'try { anchoredFailed(); } catch (Exception) { }', to: '', note: 'the media server is not taken down' },
  { key: 'i8', f: SCH, from: 'if (hit) headers.Add((NSString)"Content-Type"', to: 'if (!hit) headers.Add((NSString)"Content-Type"' },
  { key: 'i8', f: SCH, from: 'foreach (var h in SPIXI.MediaGrants.Headers) headers.Add((NSString)h.Key, (NSString)h.Value);', to: '', note: 'no-store and nosniff dropped' },
  { key: 'w1', f: WIN, from: 'answerMedia(sender as CoreWebView2, args);\n                return;', to: 'answerMedia(sender as CoreWebView2, args);\n                ;' },
  { key: 'w1', f: WIN, from: 'if (ImgurlFlags.MediaOrigin && uri.StartsWith(MediaGrants.Host, StringComparison.OrdinalIgnoreCase))', to: 'if (ImgurlFlags.MediaOrigin && !Utils.IsAllowedURL(uri) && uri.StartsWith(MediaGrants.Host, StringComparison.OrdinalIgnoreCase))', note: 'the gate in front of the media branch' },
  { key: 'w2', f: WIN, from: 'MediaGrants.HeaderLines);\n            }\n            catch (Exception) { }', to: 'MediaGrants.HeaderLines);\n            }\n            catch (Exception) { args.Response = null; }' },
  { key: 'w3', f: WIN, from: 'args.Request.Method == "GET" && MediaGrants.tryServe', to: 'args.Request.Method != "GET" && MediaGrants.tryServe' },
  { key: 'w4', f: WIN, from: 'CreateWebResourceResponse(null, 404, "Not Found", MediaGrants.HeaderLines)', to: 'CreateWebResourceResponse(null, 200, "Not Found", MediaGrants.HeaderLines)' },
  { key: 'w5', f: WIN, from: 'core.AddWebResourceRequestedFilter("*",', to: 'core.AddWebResourceRequestedFilter("file://*",' },
  { key: 'w6', f: WIN, from: 'WebView element && MediaGrants.hostOk(element.ClassId))', to: 'WebView element || MediaGrants.hostOk(element.ClassId))' },
  { key: 'w7', f: WIN, from: 'MediaGrants.serverDown(element);', to: 'MediaGrants.serving(element);' },
  { key: 'i1', f: IOS, from: 'if (mediaView != null)', to: 'if (mediaView == null)', also: ['i6'], note: 'the built view thrown away: i6 pins the same statement' },
  { key: 'i1', f: IOS, from: 'WKWebView platformView = createIsolatedMiniAppView() ?? base.CreatePlatformView();', to: 'WKWebView platformView = createMediaView() ?? base.CreatePlatformView();', note: 'the mini-app view replaced in the base statement' },
  { key: 'i5', f: IOS, from: 'if (mediaOwner() is object mediaElement) SPIXI.MediaGrants.serverDown(mediaElement);', to: 'if (mediaOwner() is object mediaElement) SPIXI.MediaGrants.serving(mediaElement);', note: 'DisconnectHandler' },
  { key: 'i2', f: IOS, from: 'if (!SPIXI.ImgurlFlags.MediaOrigin || !isTrustedHost()) return null;', to: 'if (!SPIXI.ImgurlFlags.MediaOrigin && !isTrustedHost()) return null;' },
  { key: 'i3', f: IOS, from: '                return view;\n            }\n            catch (Exception)\n            {\n                return null;', to: '                return view;\n            }\n            catch (Exception)\n            {\n                throw;' },
  { key: 'i3', f: IOS, from: 'var scheme = new MediaSchemeHandler(this);\n', to: 'var scheme = new MediaSchemeHandler(this);\n                _mediaScheme = scheme;\n', note: 'the marker set before the view exists' },
  { key: 'i4', f: IOS, from: 'if (_mediaScheme != null && mediaOwner() is', to: 'if (_mediaScheme == null && mediaOwner() is' },
  { key: 'i4', f: IOS, from: 'mediaElement && SPIXI.MediaGrants.hostOk(mediaElement.ClassId))', to: 'mediaElement)', also: ['g3'], note: 'hostOk dropped: g3 counts its users too' },
  { key: 'i5', f: IOS, from: 'if (mediaOwner() is object element) SPIXI.MediaGrants.serverDown(element);', to: 'if (mediaOwner() is object element) SPIXI.MediaGrants.serving(element);' },
  { key: 'i6', f: IOS, from: '\\"url-filter-is-case-sensitive\\":true', to: '\\"url-filter-is-case-sensitive\\":false' },
  { key: 'i6', f: IOS, from: '\\"^spixi-media://m/[0-9a-f]+$\\"', to: '\\"spixi-media://m/[0-9a-f]+$\\"', note: 'the anchor dropped' },
  { key: 'i6', f: IOS, from: 'compileContentRules(platformView, "ContentBlockingRulesUnanchored", unanchoredContentRules, true);', to: 'compileContentRules(platformView, "ContentBlockingRulesUnanchored", withMediaRule(unanchoredContentRules), true);', note: 'the exception on the unanchored fallback' },
  { key: 'i7', f: SCH, from: '        readonly WeakReference<iOSWebViewHandler> _owner;', to: '        static readonly WeakReference<iOSWebViewHandler> _owner;' },
  { key: 'i8', f: SCH, from: 'request.HttpMethod == "GET"', to: 'request.HttpMethod != "GET"' },
  { key: 'i8', f: SCH, from: 'hit ? 200 : 404', to: 'hit ? 200 : 200' },
  { key: 'i9', f: SCH, from: 'NSData.FromArray(bytes)', to: 'NSData.FromUrl(url)', also: ['i8'], note: 'the bytes from a URL: the serve rule (i8) pins the same expression' },
  { key: 'i6', f: IOS, from: 'This WebView serves no media link; compiling the anchored list.", reason);', to: 'This WebView serves no media link; compiling the anchored list.", platformView.Url);', note: 'a URL in the new log line' },
  { key: 'c1', f: PROJ, from: '<Compile Include="Platforms\\iOS\\MediaSchemeHandler.cs" />', to: '<Compile Include="Platforms\\iOS\\MediaSchemeHandlers.cs" />' },
  { key: 'g1', f: GR, from: 'catch (Exception) { return false; }', to: 'catch (Exception) { Logging.warn(url); return false; }' },
  { key: 'g2', f: GR, from: '                    bytes = g.bytes;', to: '                    bytes = File.ReadAllBytes(g.key);' },
  { key: 'g3', f: SAFE, from: 'public const string MiniAppMarker = "miniapp";', to: 'public const string MiniAppMarker = "miniapp"; static void up(object o) { MediaGrants.serverUp(o); }' },
  { key: 'g4', f: GR, from: 'public static string Prefix => SchemePrefix;', to: 'public static string Prefix => HttpsPrefix;' },
  { key: 'g5', f: GR, from: 'public const int ThumbJpegMax = 64 * 1024;', to: 'public const int ThumbJpegMax = 32 * 1024;' },
  { key: 'g6', f: CSH, from: '<Compile Include="../../Spixi/Utils/MediaGrants.cs" />', to: '<Compile Include="../../Spixi/Utils/MediaGrant.cs" />' },
];

if (!existsSync(MUT)) { const r = spawnSync('cp', ['-a', SRC, MUT], { encoding: 'utf8' }); if (r.status !== 0) { console.error('copy failed: ' + r.stderr); process.exit(2); } }
const refresh = () => { for (const f of FILES) { mkdirSync(dirname(join(MUT, f)), { recursive: true }); copyFileSync(join(SRC, f), join(MUT, f)); } };
const run = () => {
  const r = spawnSync('node', ['scripts/run-pins.mjs', 'pins-imgurl/a-handler'], { cwd: MUT, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  return { result: (/RESULT pass=\d+ fail=\d+/.exec(out) || ['NO RESULT: ' + out.slice(-300)])[0], red: [...out.matchAll(/^FAIL: imgurl (\w+) (.*)$/gm)].map((m) => ({ key: m[1], line: m[0] })) };
};
refresh();
const base = run();
console.log('GREEN (no mutation): ' + base.result);
if (base.red.length) { console.log('the copy is not green — stop'); process.exit(1); }
const only = process.argv.slice(2);
let bad = 0, n = 0;
for (const b of BREAKS) {
  if (only.length && !only.includes(b.key)) continue;
  n++;
  const p = join(MUT, b.f), text = readFileSync(p, 'utf8');
  if (text.split(b.from).length !== 2) { console.log(`✗ ${b.key}: the text to break stands ${text.split(b.from).length - 1} times in ${b.f}`); bad++; continue; }
  writeFileSync(p, text.replace(b.from, () => b.to));
  const r = run();
  writeFileSync(p, text);
  const got = r.red.map((x) => x.key).sort().join(' '), want = [b.key, ...(b.also || [])].sort().join(' ');
  const okRow = got === want;
  if (!okRow) bad++;
  console.log(`${okRow ? '✓' : '✗'} ${b.key}  ${b.f.split('/').pop()}: ${JSON.stringify(b.from.replace(/\s+/g, ' ').slice(0, 70))} → ${JSON.stringify(b.to.replace(/\s+/g, ' ').slice(0, 90))}${b.note ? '  (' + b.note + ')' : ''}`);
  console.log(`    ${r.result} · red: ${got || 'NONE'}${okRow ? '' : '  — PLANNED: ' + want}`);
  for (const x of r.red) console.log('    ' + x.line.slice(0, 230));
}
refresh();
const end = run();
console.log(`\nrestored: ${end.result}`);
console.log(`BREAKS run=${n} asPlanned=${n - bad} notAsPlanned=${bad}`);
process.exit(bad || end.red.length ? 1 : 0);
