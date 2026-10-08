/* ==== S11 B (#1262) — THE DELETE AUDIT: the image files the inline set replaced are gone ====
 *   · GONE at the source AND in the packaged tree (build-shells copies src/demo/images with cpSync, which never
 *     deletes — a file removed only at the source would ship forever): onboarding/step1–4.png, onboarding/restore.png,
 *     add-contact.png; and the dead design exports under src/assets/images (apps-es, chats-es, contacts-es,
 *     explore-apps, explore-banner, rate-me, success, wallet-es .svg — nothing loads or generates from them)
 *   · NO shipped html/css/js (code, comments stripped) still names a deleted file
 *   · ★ S11 A2 re-base (#1263, R2-m5 / R3-MINOR-5/6): the KEEP list is GONE too — every host passes a symbolic name
 *     (illustrationFor: 'backup', 'rating', 'chatsEmpty', 'contactsEmpty', 'appsEmpty', 'explore'), so the six files the
 *     legacy paths named (apps-es.png · backup.png · chats-es.png · contacts-es.svg · explore-banner.png ·
 *     onboarding/rate.png) are deleted at the source AND in the packaged tree, and no shipped code names them
 * Deliberate breaks: see the S11 B / A2 reports. */
export default async function (h) {
  const { ok, root, readFileSync, readdirSync, existsSync, join, stripCode } = h;
  const GONE_IMG = ['onboarding/step1.png', 'onboarding/step2.png', 'onboarding/step3.png', 'onboarding/step4.png', 'onboarding/restore.png', 'add-contact.png'];
  const GONE_SVG = ['apps-es', 'chats-es', 'contacts-es', 'explore-apps', 'explore-banner', 'rate-me', 'success', 'wallet-es'];
  const GONE_HOSTED = ['chats-es.png', 'contacts-es.svg', 'apps-es.png', 'explore-banner.png', 'backup.png', 'onboarding/rate.png'];   // ★ S11 A2 re-base (#1263): was KEEP
  const stillThere = [];
  for (const n of GONE_IMG) for (const base of ['src/demo/images/', 'Spixi/Resources/Raw/html/images/']) if (existsSync(join(root, base + n))) stillThere.push(base + n);
  for (const n of GONE_SVG) if (existsSync(join(root, 'src/assets/images', n + '.svg'))) stillThere.push('src/assets/images/' + n + '.svg');
  const dir = join(root, 'Spixi/Resources/Raw/html');
  const corpus = readdirSync(dir).filter((f) => /\.(html|js|css)$/.test(f)).map((f) => stripCode(readFileSync(join(dir, f), 'utf8'))).join('\n');
  for (const n of GONE_HOSTED) for (const base of ['src/demo/images/', 'Spixi/Resources/Raw/html/images/']) if (existsSync(join(root, base + n))) stillThere.push(base + n);
  const named = GONE_IMG.concat(GONE_HOSTED).filter((n) => corpus.includes('images/' + n));
  /* the hosts pass NAMES now — the shell sources (code, comments stripped) name no legacy image path at all */
  const hostSrc = ['src/shells/home.html', 'src/shells/settings.html', 'src/shells/settings_backup.html', 'src/components/chats-shell.js', 'src/components/contacts-shell.js']
    .map((f) => stripCode(readFileSync(join(root, f), 'utf8'))).join('\n');
  const hostPaths = (hostSrc.match(/['"]images\/[\w./-]+\.(?:png|svg)['"]/g) || []);
  ok(stillThere.length === 0 && named.length === 0 && hostPaths.length === 0,
    '★ S11 B (#1262) + A2 (#1263) delete audit: the replaced onboarding/add-contact PNGs AND the six legacy-host files (apps-es · backup · chats-es · contacts-es · explore-banner · onboarding/rate) are gone from the source AND the packaged tree, the dead design exports are gone, no shipped code names a deleted file, and no host passes a legacy images/ path — ' + JSON.stringify({ stillThere, named, hostPaths }));
}
