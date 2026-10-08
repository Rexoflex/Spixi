/* ==== S12 B (#1267) — SettingsPage: the About "Rate Spixi" branch + the `rate` cap (SOURCE — MAUI-only, the S11 g-cs model) ====
 *   · ONE branch, `current_url.Equals("ixian:rating:yes", StringComparison.Ordinal)` — no other ixian:rating tail is read
 *   · Android → Config.ratingAndroidUrl, iOS → Config.ratingiOSUrl, through Utils.openExternal; other platforms nothing
 *   · it does NOT write the `rating_action` preference and logs nothing
 *   · the cap `rate` is granted ONLY under an Android || iOS check, above photoPreviews
 * Deliberate breaks: see the S12 B report. */
export default async function (h) {
  const { ok, root, readFileSync, join, stripCode } = h;
  const sp = stripCode(readFileSync(join(root, 'Spixi/Pages/Settings/SettingsPage.xaml.cs'), 'utf8'));
  const a = {};
  const head = 'else if (current_url.Equals("ixian:rating:yes", StringComparison.Ordinal))';
  const i = sp.indexOf(head);
  /* the branch body, brace-matched (it has its own inner else-if) */
  let body = '';
  if (i >= 0) {
    const open = sp.indexOf('{', i + head.length);
    let depth = 0, k = open;
    for (; k < sp.length; k++) { if (sp[k] === '{') depth++; else if (sp[k] === '}' && --depth === 0) break; }
    body = sp.slice(open + 1, k);
  }
  a.oneBranch = i >= 0 && sp.indexOf(head, i + 1) < 0 && (sp.match(/ixian:rating/g) || []).length === 1;
  a.platforms = /if \(Microsoft\.Maui\.Devices\.DeviceInfo\.Platform == Microsoft\.Maui\.Devices\.DevicePlatform\.Android\)\s*\{\s*rateUrl = Config\.ratingAndroidUrl;\s*\}\s*else if \(Microsoft\.Maui\.Devices\.DeviceInfo\.Platform == Microsoft\.Maui\.Devices\.DevicePlatform\.iOS\)\s*\{\s*rateUrl = Config\.ratingiOSUrl;\s*\}/.test(body);
  a.open = /if \(rateUrl != null\)\s*\{\s*Utils\.openExternal\(rateUrl\);\s*\}/.test(body) && (body.match(/openExternal/g) || []).length === 1
    && /string\? rateUrl = null;/.test(body);
  a.noPrefNoLog = body.length > 0 && !/rating_action|Preferences|Logging|Console\.|current_url/.test(body);
  const capIf = /if \(Microsoft\.Maui\.Devices\.DeviceInfo\.Platform == Microsoft\.Maui\.Devices\.DevicePlatform\.Android\s*\|\| Microsoft\.Maui\.Devices\.DeviceInfo\.Platform == Microsoft\.Maui\.Devices\.DevicePlatform\.iOS\)\s*\{\s*caps \+= ",rate";\s*\}/;
  a.cap = capIf.test(sp) && (sp.match(/caps \+= ",rate"/g) || []).length === 1
    && sp.search(capIf) < sp.indexOf('caps += ",photoPreviews";') && !/caps = "[^"]*\brate\b/.test(sp);
  ok(Object.values(a).every((x) => x === true),
    '★ S12 B (#1267) SettingsPage (SOURCE — MAUI-only): `ixian:rating:yes` (Ordinal Equals, the only ixian:rating read) opens Config.ratingAndroidUrl / ratingiOSUrl via Utils.openExternal, nothing elsewhere, no rating_action write, no log; the `rate` cap only under Android || iOS, above photoPreviews — ' + JSON.stringify(a));
}
