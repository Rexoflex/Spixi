/* METHOD AND ITS LIMITS (#1735 — what the notices were built from, and what they do not cover; the same text is the section
 * "## Method and its limits" of docs/legal/third-party-notices.md, which (4c) holds).
 * SCANS DONE: (1) the shipped Raw/html text (.css/.html/.js) for banners, copyright and licence lines, every data: URL decoded and hashed
 * (case-insensitive) and the code markers — held by rows (1)/(2) below; (2) the file headers of every file IXICore.projitems compiles
 * (140), of every .cs / .xaml of Spixi and Spixi-PushService outside the vendored RocksDbSharp folder (259); (3) body overlap — every compiled
 * Ixian-Core file and every Spixi .cs against the lines of the NBitcoin tree and of Crc32.NET v1.2.0 (the upstreams the doc names);
 * (4) the native binaries (3 Android .so, 2 iOS .a): exported symbols, archive members, strings; each .a member mapped by file name to its
 * source in facebook/rocksdb at the build commit 3f51c0a1 (358 sources; lz4 members and build_version.cc not mapped) and the WHOLE text of 843
 * files (those sources and every header of their directories) searched line by line for copyright / licence / copied / borrowed /
 * adapted / URL lines — a pattern search with a look at each hit, not a read by a person; each .so symbol family named; (5) the nuspec where
 * it is readable (local-nuget/RocksDB.0.0.42.nupkg), otherwise the GitHub repository of the package at its tag.
 * NOT COVERED: the transitive NuGet packages; the .NET / MAUI / Android / iOS runtimes and SDK libraries; code in a native binary that
 * exports no symbol and has no archive member; the bodies of RocksDbSharp.dll; code reused without a marker from an upstream that is not named; the natives inside NuGet
 * packages that could not be read (RocksDB 10.4.2.64152, OneSignalSDK.DotNet 6.1.9). Scans (2)-(5) are NOT re-run by this pin (the sibling
 * repo, the upstreams and the binaries are not always in the tree it runs on): it holds the RESULT of them — the rows and their texts — through
 * (3), (3b), (3c), (4a), (5). A later find of an uncovered class is a recorded limit, not a failure of the rows.
 */
/* ==== leanfollow item 1 (pins-a) — the third-party notices against what ships (docs/contract-leanfollow.md § 3.2) ====
 *
 * What it reads (nothing is written, nothing is executed, node built-ins only):
 *   docs/legal/third-party-inventory.json   the machine-readable inventory (files, embedded, components)
 *   docs/legal/third-party-notices.md       the notices doc (the table, then "## Notices")
 *   Spixi/Resources/Raw/html/**             the shipped WebView folder (the 40 files, and the data: URLs inside them)
 *   Spixi/Resources/Raw/licenses/**         the licence texts that ship beside it
 *
 * Rows (every title starts "★ leanfollow notices"):
 *  (1a) the file set of Raw/html equals the `files` keys of the inventory, both directions.
 *  (1b) every `files` entry is "ours" or "third-party", names an existing component, and an "ours" file names no third-party component.
 *  (1c) every component has a `scope` ("html" or "app-package"), and every component whose scope is "html" is still named by at least
 *       one `files` entry or one `embedded` entry (a component whose last reference was deleted is a stale row).
 *  (2a) every data: URL in a shipped .css / .html / .js has an `embedded` entry (same file, SHA-256 of its DECODED bytes) and every
 *       `data-url` entry is found (both directions) — a changed font byte changes the hash.
 *  (2b) every `code` marker is a literal string that is in its file, once; every `embedded` entry names an existing file and component.
 *  (3)  every component's `licenceFiles` entries exist under Raw/licenses, are non-empty, start with the 3-line header (Component: /
 *       Licence: / Source of this text:) + one empty line, hold the licence's own title text (a table keyed by the file name's licence
 *       token), and the body's SHA-256 equals the "upstream SHA-256" of the header — or, where the header says "CRLF changed to LF",
 *       the "LF-body SHA-256" the header records (a second hash, so an edited word in such a text goes red too);
 *       a component with `textRequired: true` lists at least one file.
 *  (3b) the components that may have no licence text are FROZEN in this file (NO_TEXT below, with the reason of each): the set of
 *       components whose `textRequired` is not `true` equals that list, exactly. Setting `textRequired` to false on a component, or
 *       dropping its text, goes red; a new entry in the list is a human edit of this file. The two UNPROVEN entries must also carry
 *       an `unproven` field that starts "UNPROVEN — question for Damir".
 *  (3c) the component set and the licence files are FROZEN in this file (FROZEN below): the component ids, the `licenceFiles` of each, and the
 *       SHA-256 of each WHOLE licence file (header and body, so a body edited together with its own header hash goes red too). Dropping a
 *       component, dropping one text of a multi-text component, adding either, or editing a text needs an edit of FROZEN here — a look.
 *  (4a) every component's `noticeHeading` is a `###` line of the notices doc below its `## Notices` line.
 *  (4c) the notices doc holds the section "## Method and its limits" (above "## Inventory") and its "Not covered" list (see the METHOD AND ITS LIMITS block below).
 *  (4b) the notices doc names no `Raw/html/<file>` path that does not exist (a name with a glob star, or without the `Raw/html/`
 *       prefix, is not read).
 *  (5)  every file under Raw/licenses is named by a component (no orphan text).
 *
 * LIMITS (#1735, stated in the first version):
 *  · The owner classification of a NEW file ("ours" or "third-party") is a human entry in the inventory; this pin forces the entry to
 *    exist, it does not decide it.
 *  · Third-party code pasted into one of OUR files without a `code` marker, or a third-party image / font added as something other than a
 *    data: URL (a url("…") of a file, a data URL whose payload is spelled in another way than the two forms read here) is not detected.
 *    The data: forms read: `data:<mime>[;params],<payload>` with a base64 payload or a payload up to the next double quote, and
 *    `ID="data:<mime>;base64,"` followed by `X=ID+"<base64>"` (html5-qrcode.min.js builds three images that way). A percent-encoded
 *    payload is decoded byte-wise from its UTF-8 text.
 *  · The pin does not judge whether a licence text is legally enough, nor whether a licence NAME in the inventory is right; it holds
 *    that the text exists, is the shape above, and (for LF texts) still has the bytes its header recorded. A text with a CRLF change is
 *    not compared with upstream byte for byte (the change is not reversible for a mixed file); its LF body is held by the second hash
 *    of its header ("LF-body SHA-256"), and (3c) holds the whole file.
 *  · The title rule is a table keyed by the licence token of the file name; a file with a token the table does not know fails, so a
 *    new kind of licence is a human entry here too.
 *  · The data: URL scan is case-insensitive ("DATA:", ";BASE64,"). A payload spelled in another way than the forms above is still not read.
 *  · The Ixian-Core files that IXICore.projitems compiles, and the native binaries, are NOT read by this pin (the sibling repo and the
 *    binaries are not always in the tree the pin runs on); their rows (LZ4, xxHash with its five blocks, PerconaFT, MurmurHash, TimerQueue, libc++, NBitcoin, BigInteger, Crc32.NET, Base58Check, BIP-39, OneSignal native) are held only through (3)-(5): text exists, has its header and bytes, and has a heading in the notices doc.
 *    A new third-party file in Ixian-Core, or a new native library, is not seen.
 *  · The notices TABLE is not parsed: only the headings (4a) and the named paths (4b) are held; a wrong word in a row is not seen.
 *  · Only `Raw/html` is walked for (1)/(2): the NuGet / app-package components have no file set to compare, they are held through
 *    (3)–(5).
 */
import { createHash } from 'node:crypto';

/* FROZEN (3c): component id → { licence file → SHA-256 of the whole file }. Regenerate with a look when a text is added, dropped or edited. */
const FROZEN = {
  "auto-native-import": {
    "licenses/auto-native-import.MIT.txt": 'a85ffc7f13b69f952b1c473507dc85ca2223cfedb640bedb3144120efbb40821',
  },
  "base58check": {
  },
  "bigint-chewkeong": {
    "licenses/bigint-chewkeong.file-header-notice.txt": 'e4168b1eb6e46e6e25622229f57fd72ce3e2ba40fa8612f92ad53d38c5d15e28',
  },
  "bip39-wordlists": {
    "licenses/bip39-wordlists.BIP-MIT-statement.txt": '94aa061e89bcde5eddbef963f7a01d0071c04862167c831624b7e1b3ed996f0c',
  },
  "bouncycastle": {
    "licenses/bouncycastle.MIT.txt": 'e703c4d97256cbc0860fdf88b9084a81bf1fc7262b41db80a5d84b5f37f46ed0',
  },
  "call-tones": {
  },
  "communitytoolkit-maui": {
    "licenses/communitytoolkit-maui.MIT.txt": 'ad63b94b6c94cf81e80aeda245de6f189b7c68d5a8822cc7b9fda4cad2e356b8',
  },
  "concentus": {
    "licenses/concentus.LICENSE.txt": '8c266081305e9c3a254619de7562d932c2be40f02ce0e138c1551323b1474a2b',
  },
  "crc32-net": {
    "licenses/crc32-net.MIT.txt": '163ee21cfd8acff0a64cab0a086e75a583a4cc5518abdf6ac6d030cff5ca02f6',
  },
  "html5-qrcode": {
    "licenses/html5-qrcode.Apache-2.0.txt": '85f814dda3eb051fb9b5b62d8608d905a94bb66c3969a782a48bbdcb05851d0b',
  },
  "ixian-core": {
    "licenses/ixian-core.MIT.txt": '8579f5d8e4811ec27d00ef26635d144a4c4957259ac0dbbf6d4de5f8a31b7a20',
  },
  "llvm-libcxx": {
    "licenses/llvm-libcxx.Apache-2.0-with-LLVM-exception.txt": '456d61d38efe4e388beb4e2c76cbbd9c4be2e45ee4056c3a97f28f6382d8ff67',
    "licenses/llvm-libcxxabi.Apache-2.0-with-LLVM-exception.txt": '985153ae339dc75ff3a7284c7c9379f0620812512891e1db51f2f27008e3564e',
    "licenses/llvm-libunwind.Apache-2.0-with-LLVM-exception.txt": 'b6bc5c9199909f8118e19bffb595b735df1c4b6ee9322f853506bb9b2e0810db',
    "licenses/llvm-compiler-rt.Apache-2.0-with-LLVM-exception.txt": 'ea405a4615b6da4c475215546a36a4c2ccad4efb5a8e494753637baaf85e1f13',
  },
  "lz4": {
    "licenses/lz4.BSD-2-Clause.txt": 'ba5f4fdcf021f9c349320a2ee86c31b2c07e5e0232976b63cc855ca64d429475',
  },
  "maui": {
    "licenses/maui.MIT.txt": 'a7a91320ccd3710452874788379dd539d8c6b0424d9febe009e0a11bfdcde337',
  },
  "mono-nat": {
    "licenses/mono-nat.MIT.txt": '906e05221ec0c5ee842fcb7a53cac8a5c7048865bfc1ceed11a17b5c2e6fbca2',
  },
  "murmurhash": {
    "licenses/murmurhash.file-statement.txt": 'd131d977cd920e2d9084f84ac77dfe42e705d32e4e3f89fb473708079b452a50',
  },
  "murmurhash3-csharp": {
    "licenses/murmurhash3-csharp.file-statement.txt": 'f6c228ea09dc84a6c167dcaca5478630828904d0d3e1af847619342fe63d8591',
  },
  "naudio": {
    "licenses/naudio.MIT.txt": '114b1ae21138a9c778885aa861cf961354fcf97d3c0a8f535dc21d0ad8410502',
  },
  "nbitcoin": {
    "licenses/nbitcoin.MIT.txt": 'fdc569bc43b6bd94a71515f8f061e070f6948840755a637532c93595b6042757',
  },
  "newtonsoft-json": {
    "licenses/newtonsoft-json.MIT.txt": '293191be88cc579d9cc67b1420ae77c3222656b3120329d2a58f545de9ad75e6',
  },
  "onesignal-dotnet": {
    "licenses/onesignal-dotnet.MIT.txt": '51d6eef26408a8cfd2a8798db1dcc9622c555bb2532ce8b842bfb621d083f3d9',
  },
  "onesignal-native": {
    "licenses/onesignal-android-sdk.Modified-MIT.txt": 'a06d36d34080482c66b082808834293d3ede97edc0317deec795cb42b2e0a838',
    "licenses/onesignal-ios-sdk.Modified-MIT.txt": 'd20328d9801e698527e3eff49691861d51b4e01a2a9c7329d645a0eadc9d9633',
  },
  "open-sans": {
    "licenses/open-sans.Apache-2.0.txt": '9b7e675a1102d34968cd0c922630af203439f2db3144aab4ea388ddef047bb22',
  },
  "openjdk-classes": {
    "licenses/openjdk.GPL-2.0-Classpath-exception.txt": '657d9e2be7a4f4ae5026345612fb0a5c07e20b40159c5e24147f8ec3522ec942',
  },
  "perconaft": {
    "licenses/perconaft.AGPL-3.0.txt": '0845c6c8bd1c141430169fc2c40d14f06fb7625a472d543a4e40405fa9ad7819',
    "licenses/perconaft.Apache-2.0.txt": '76d61ef92e5fb4a05beadb2d82f1755e1e9283d8f67ff8601ae3f58b9f9d81a2',
    "licenses/perconaft.GPL-2.0.txt": 'eca51f71af1c5ebb818dbc5d5da4084e2359e7b57bd79f8f19dc9f1febb76bc1',
    "licenses/perconaft.PerconaFT-file-header.txt": '9f105e3e562edac5a5aa07a96c0a6faf8c33fca4a350342816090e64cc485bde',
  },
  "plugin-fingerprint": {
    "licenses/plugin-fingerprint.MS-PL.txt": '7a87879ecb197fb4b0bf314117414823bd5507aa4e8b062aad67f5a60e5ec722',
  },
  "qrcode-generator": {
    "licenses/qrcode-generator.MIT.txt": 'fd06d88c8bd91c0056dfb7a19751b593d25f9a162227856b41be922e31ffb88d',
  },
  "rocksdb-native": {
    "licenses/rocksdb.Apache-2.0.txt": '13cc394c5a9c79aaccf06ff1c2c608ee09de3cb62cd41bfd9e440e035ddb5596',
    "licenses/rocksdb.GPL-2.0.txt": 'afc2fafe7b74ae75841c0d601d64da917ac697d421a2f45f9bbd5bbf1d3b9151',
    "licenses/rocksdb.LICENSE-leveldb.txt": '0368211876e3d139871ab9a8461ed41e18da96b9719fa4f13d2a1b7917289ead',
  },
  "rocksdbsharp": {
    "licenses/rocksdbsharp.BSD-2-Clause.txt": '240246047dd8727369c2875f5fe59cdf923e68980014fe4fc691dcb15a52a8e4',
  },
  "sora": {
    "licenses/sora.OFL-1.1.txt": 'cc998432ace21e044716d3b7c8ed6133fa0efad8e1e8cc33764097d28cc4b18c',
  },
  "spixi": {
  },
  "tabler-icons": {
    "licenses/tabler-icons.MIT.txt": '1d64e140e1eb89b94384c62c311bd8a30985abff244f94e13475b30e9245698d',
  },
  "timer-queue": {
    "licenses/timer-queue.file-statement.txt": 'b22f45680425a1e9ebe771a51ac0ab71e2543e9b5fe2d6e1fcfca493f7fbe7a6',
  },
  "twemoji-flags": {
    "licenses/country-flag-emoji-polyfill.MIT.txt": '5e865f0cac9aa23c328e98e113b8fe8211ab6d9238684f0bf91c385e0f6c4ed4',
    "licenses/twemoji-country-flags.CC-BY-4.0.txt": '3860daf382004248f57f6bd5441fd5513a8d9946e076dec66580864426e04a46',
  },
  "uisfx": {
    "licenses/uisfx.CC0-1.0.txt": '797b1a5a3e39ebbf1d9b3f16df89391419d2d880cb8dbd9be7df8c9a12c08783',
  },
  "xxhash": {
    "licenses/xxhash-lz4.BSD-2-Clause.txt": 'f0bac5bf6d6a0bc814423cb24fe0bc4de11e651bada026a056a16c7aafcf7347',
    "licenses/xxhash-rocksdb-cc.BSD-2-Clause.txt": 'f31684fd80f4b32c0090969a5d2d5c5aff349d8fcf1fc7c9a641583f4cca4275',
    "licenses/xxhash-xxph3-a.BSD-2-Clause.txt": 'b8ac3a4be5d264a69cf1ee82ad03a8f9947c74a57a9f3fe7814823b343f34dc6',
    "licenses/xxhash-xxph3-b.BSD-2-Clause.txt": 'da13deadf4aa12a3039826aec2a92e755aa7ecdb74c2f1585b43da703026f27a',
    "licenses/xxhash.BSD-2-Clause.txt": '3362c80bf00ea0edc91a4ab93496b78e1fd4839e353bf775e228fcb316b3cdf3',
  },
  "zxing-js": {
    "licenses/zxing-js.MIT.txt": '296bb5fa709b739d1477bf6f9d32bdf46a37cf6a81b52eebc65062bd11f79789',
    "licenses/zxing.Apache-2.0.txt": '0f85eb17fe6039762cec35750eb00934cc556f63ae95309bfe445fcee40162ea',
  },
};
import { statSync } from 'node:fs';

const sha = (buf) => createHash('sha256').update(buf).digest('hex');

export default async function ({ ok, root, readFileSync, readdirSync, existsSync, join }) {
  const HTML = join(root, 'Spixi', 'Resources', 'Raw', 'html');
  const LIC = join(root, 'Spixi', 'Resources', 'Raw', 'licenses');
  const bytes = (p) => readFileSync(p);                       // no encoding → a Buffer (the smoke helper does not touch it)
  const walk = (dir, base = '') => {
    const out = [];
    if (!existsSync(dir)) return out;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const rel = base ? base + '/' + e.name : e.name;
      if (e.isDirectory()) out.push(...walk(join(dir, e.name), rel));
      else out.push(rel);
    }
    return out.sort();
  };
  const inv = JSON.parse(bytes(join(root, 'docs', 'legal', 'third-party-inventory.json')).toString('utf8'));
  const doc = bytes(join(root, 'docs', 'legal', 'third-party-notices.md')).toString('utf8').replace(/\r\n/g, '\n');
  const comps = inv.components || {};
  const files = inv.files || {};
  const embedded = Array.isArray(inv.embedded) ? inv.embedded : [];
  const shipped = walk(HTML);

  /* ── (1) the file set ─────────────────────────────────────────────────────────────────────── */
  const fileKeys = Object.keys(files).sort();
  const missingInInv = shipped.filter((f) => !(f in files));
  const goneFromTree = fileKeys.filter((f) => !shipped.includes(f));
  ok(inv.version === 1 && shipped.length > 0 && missingInInv.length === 0 && goneFromTree.length === 0,
    '★ leanfollow notices (1a): the files of Raw/html (' + shipped.length + ') equal the `files` keys of third-party-inventory.json (' + fileKeys.length + '), both directions — not in the inventory: [' + missingInInv.join(', ') + '] · in the inventory but not shipped: [' + goneFromTree.join(', ') + ']');
  const badFiles = fileKeys.filter((f) => {
    const e = files[f];
    return !e || (e.owner !== 'ours' && e.owner !== 'third-party') || !comps[e.component] || (e.owner === 'ours' && e.component !== 'spixi') || (e.owner === 'third-party' && e.component === 'spixi');
  });
  ok(badFiles.length === 0, '★ leanfollow notices (1b): every `files` entry is ours (component "spixi") or third-party (an existing other component) — bad: [' + badFiles.join(', ') + ']');

  const SCOPES = ['html', 'app-package'];
  const badScope = Object.entries(comps).filter(([, c]) => !SCOPES.includes(c.scope)).map(([id, c]) => id + ' (scope ' + JSON.stringify(c.scope) + ')');
  const referenced = new Set([...Object.values(files).map((e) => e && e.component), ...embedded.map((e) => e && e.component)]);
  const stale = Object.entries(comps).filter(([id, c]) => c.scope === 'html' && !referenced.has(id)).map(([id]) => id);
  ok(Object.keys(comps).length > 0 && badScope.length === 0 && stale.length === 0,
    '★ leanfollow notices (1c): every component has a scope ("html" or "app-package") and every component of scope "html" is named by at least one `files` or `embedded` entry — bad scope: [' + badScope.join(', ') + '] · html components nothing refers to: [' + stale.join(', ') + ']');

  /* ── (2) the embedded data: URLs and the code markers ─────────────────────────────────────── */
  const DATA_RE = /data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+)((?:;[a-zA-Z0-9=.-]+)*),((?<=;base64,)[A-Za-z0-9+/=]*|(?<!;base64,)[^"\n]*)/gi;   // `i`: "DATA:image/png;BASE64,…" is a data: URL too
  const pctBytes = (s) => {
    const src = Buffer.from(s, 'utf8'); const out = [];
    for (let i = 0; i < src.length; i++) {
      const h = src[i] === 0x25 && i + 2 < src.length + 0 ? src.subarray(i + 1, i + 3).toString('latin1') : null;
      if (h !== null && /^[0-9a-fA-F]{2}$/.test(h)) { out.push(parseInt(h, 16)); i += 2; } else out.push(src[i]);
    }
    return Buffer.from(out);
  };
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const found = [];                                           // { file, hash }
  for (const rel of shipped) {
    if (!/\.(css|html|js)$/.test(rel)) continue;
    const text = bytes(join(HTML, rel)).toString('utf8');
    for (const m of text.matchAll(DATA_RE)) {
      const [whole, , params, pay] = m;
      if (pay) {
        found.push({ file: rel, hash: sha(/;base64/i.test(params) ? Buffer.from(pay, 'base64') : pctBytes(pay)) });
      } else if (/;base64/i.test(params)) {                    // a prefix only: ID="data:…;base64," then X=ID+"<base64>"
        for (const a of text.matchAll(new RegExp('([A-Za-z_$][\\w$]*)="' + reEsc(whole) + '"', 'g'))) {
          for (const b of text.matchAll(new RegExp('[A-Za-z_$][\\w$]*=' + reEsc(a[1]) + '\\+"([A-Za-z0-9+/=]{40,})"', 'g'))) {
            found.push({ file: rel, hash: sha(Buffer.from(b[1], 'base64')) });
          }
        }
      }
    }
  }
  const dataEntries = embedded.filter((e) => e && e.kind === 'data-url');
  const key = (f, h) => f + ' ' + h;
  const haveKeys = new Map();                                 // multiset of inventory entries
  for (const e of dataEntries) haveKeys.set(key(e.in, e.sha256), (haveKeys.get(key(e.in, e.sha256)) || 0) + 1);
  const foundKeys = new Map();
  for (const f of found) foundKeys.set(key(f.file, f.hash), (foundKeys.get(key(f.file, f.hash)) || 0) + 1);
  const unlisted = [...foundKeys.keys()].filter((k) => !haveKeys.has(k)).map((k) => k.slice(0, k.indexOf(' ') + 13) + '…');
  const staleKeys = [...haveKeys.keys()].filter((k) => !foundKeys.has(k)).map((k) => k.slice(0, k.indexOf(' ') + 13) + '…');
  const dupNeeded = [...foundKeys.entries()].filter(([k, n]) => (haveKeys.get(k) || 0) < n).map(([k]) => k.slice(0, k.indexOf(' ') + 13) + '…');
  ok(found.length > 0 && unlisted.length === 0 && staleKeys.length === 0 && dupNeeded.length === 0,
    '★ leanfollow notices (2a): every data: URL of a shipped .css / .html / .js (' + found.length + ' found) has an `embedded` entry with the SHA-256 of its decoded bytes, and every data-url entry (' + dataEntries.length + ') is found — in the files, not in the inventory: [' + unlisted.join(', ') + '] · in the inventory, not in the files: [' + staleKeys.join(', ') + '] · listed fewer times than found: [' + dupNeeded.join(', ') + ']');
  const badEmb = [];
  for (const e of embedded) {
    if (!e || !(e.in in files) || !comps[e.component]) { badEmb.push(JSON.stringify(e && e.in) + ' (file or component not in the inventory)'); continue; }
    if (e.kind === 'code') {
      const text = bytes(join(HTML, e.in)).toString('utf8');
      const n = typeof e.marker === 'string' && e.marker ? text.split(e.marker).length - 1 : 0;
      if (n !== 1) badEmb.push(e.in + ': marker "' + String(e.marker).slice(0, 40) + '" is in the file ' + n + ' times (expected 1)');
    } else if (e.kind !== 'data-url' || !/^[0-9a-f]{64}$/.test(e.sha256 || '')) badEmb.push(e.in + ': kind / sha256 not valid');
  }
  ok(embedded.length > 0 && badEmb.length === 0, '★ leanfollow notices (2b): every `code` marker is a literal string that is in its file exactly once, and every `embedded` entry names a shipped file and an existing component — bad: [' + badEmb.join(' · ') + ']');

  /* ── (3) the licence texts ────────────────────────────────────────────────────────────────── */
  const TITLE = {
    'Apache-2.0': /^\s*Apache License\s*\n\s*Version 2\.0, January 2004/m,
    'MIT': /Permission is hereby granted,\s+free of charge,\s+to any person obtaining a copy/,
    'OFL-1.1': /SIL OPEN FONT LICENSE Version 1\.1/,
    'BSD-2-Clause': /Redistribution and use in source and binary forms/,
    'CC-BY-4.0': /^Attribution 4\.0 International/m,
    'CC0-1.0': /CC0 1\.0 Universal/,
    'GPL-2.0': /GNU GENERAL PUBLIC LICENSE\s+Version 2, June 1991/,
    'GPL-2.0-Classpath-exception': /The GNU General Public License \(GPL\)[\s\S]*"CLASSPATH" EXCEPTION TO THE GPL/,
    'MS-PL': /Microsoft Public License \(MS-PL\)/,
    'LICENSE': /Redistribution and use in source and binary forms/,
    'LICENSE-leveldb': /Copyright \(c\) 2011 The LevelDB Authors/,
    'file-header-notice': /Copyright \(c\) 2002 Chew Keong TAN[\s\S]*Permission is hereby granted,\s+free of charge/,
    'BIP-MIT-statement': /License: MIT[\s\S]*This BIP falls under the MIT License\./,
    'AGPL-3.0': /GNU AFFERO GENERAL PUBLIC LICENSE\s+Version 3, 19 November 2007/,
    'PerconaFT-file-header': /This file is part of PerconaFT[\s\S]*Percona and\/or its affiliates[\s\S]*GNU Affero General Public License/,
    'file-statement': /MIT license\.|CC0 license|This code is public domain\./,
    'Apache-2.0-with-LLVM-exception': /Apache License v2\.0 with LLVM Exceptions[\s\S]*LLVM Exceptions to the Apache 2\.0 License/,
    'Modified-MIT': /^Modified MIT License\s*\n[\s\S]*may only be used in connection\s+with services provided by OneSignal/m,
  };
  const problems = [];
  for (const [id, c] of Object.entries(comps)) {
    const lf = Array.isArray(c.licenceFiles) ? c.licenceFiles : [];
    if (c.textRequired === true && lf.length === 0) problems.push(id + ': textRequired but no licenceFiles');
    for (const rel of lf) {
      const m = /^licenses\/([^/]+)$/.exec(rel);
      if (!m) { problems.push(id + ': ' + rel + ' is not licenses/<file>'); continue; }
      const p = join(LIC, m[1]);
      if (!existsSync(p) || !statSync(p).isFile()) { problems.push(id + ': ' + rel + ' is missing'); continue; }
      const buf = bytes(p);
      if (buf.length === 0) { problems.push(rel + ' is empty'); continue; }
      const text = buf.toString('utf8');
      const lines = text.split('\n');
      if (text.includes('\r')) problems.push(rel + ' holds a CR (the texts are LF)');
      if (!/^Component: \S/.test(lines[0] || '') || !/^Licence: \S/.test(lines[1] || '') || !/^Source of this text: \S/.test(lines[2] || '') || lines[3] !== '') {
        problems.push(rel + ': the 3-line header + empty line is not there'); continue;
      }
      const body = lines.slice(4).join('\n');
      if (!body.trim()) { problems.push(rel + ' has no text below the header'); continue; }
      const token = /^[^.]+\.(.+)\.txt$/.exec(m[1]);
      const rule = token && TITLE[token[1]];
      if (!rule) problems.push(rel + ': no title rule for the licence token "' + (token && token[1]) + '"');
      else if (!rule.test(body)) problems.push(rel + ': the licence title text for "' + token[1] + '" is not in the body');
      const hh = /upstream SHA-256 ([0-9a-f]{64})/.exec(lines[2]);
      if (!hh) problems.push(rel + ': the header holds no "upstream SHA-256"');
      else if (/CRLF changed to LF/.test(lines[2])) {
        const lb = /LF-body SHA-256 ([0-9a-f]{64})/.exec(lines[2]);                 // the CRLF text is not byte-compared with upstream: its LF body is held by a second hash
        if (!lb) problems.push(rel + ': the header says CRLF changed to LF but holds no "LF-body SHA-256"');
        else if (sha(Buffer.from(body, 'utf8')) !== lb[1]) problems.push(rel + ': the body no longer has the LF-body SHA-256 its header records');
      } else if (sha(Buffer.from(body, 'utf8')) !== hh[1]) problems.push(rel + ': the body no longer has the SHA-256 its header records');
    }
  }
  ok(Object.keys(comps).length > 0 && problems.length === 0,
    '★ leanfollow notices (3): every component\'s licence files exist under Raw/licenses, are non-empty, start with the 3-line header + an empty line, hold the licence title text, and keep the recorded bytes (' + Object.keys(comps).length + ' components) — problems: [' + problems.join(' · ') + ']');

  /* ── (3b) the components that may have no text are frozen here ───────────────────────────────── */
  const NO_TEXT = {                                           // id → why it may have no licence text (a human edit of THIS file adds or removes one)
    spixi: 'ours: this repo\'s own files',
    'call-tones': 'UNPROVEN: no text exists, the only record is DECISIONS N84',
    base58check: 'UNPROVEN: the upstream licence (adamcaudill/Base58Check) is not readable',
  };
  const notTrue = Object.entries(comps).filter(([, c]) => c.textRequired !== true).map(([id]) => id).sort();
  const frozen = Object.keys(NO_TEXT).sort();
  const extra = notTrue.filter((id) => !(id in NO_TEXT));
  const lost = frozen.filter((id) => !notTrue.includes(id));
  const noMark = frozen.filter((id) => /^UNPROVEN/.test(NO_TEXT[id]) && !(comps[id] && typeof comps[id].unproven === 'string' && comps[id].unproven.startsWith('UNPROVEN — question for Damir')));
  ok(frozen.length > 0 && extra.length === 0 && lost.length === 0 && noMark.length === 0,
    '★ leanfollow notices (3b): the components whose textRequired is not true are exactly the frozen list [' + frozen.map((id) => id + ' (' + NO_TEXT[id] + ')').join('; ') + '] — textRequired not true but not frozen: [' + extra.join(', ') + '] · frozen but now textRequired true or gone: [' + lost.join(', ') + '] · frozen UNPROVEN without an `unproven` mark: [' + noMark.join(', ') + ']');

  /* ── (3c) the component set and the licence files are frozen ────────────────────────────────── */
  const fz = [];
  const frozenIds = Object.keys(FROZEN).sort(); const nowIds = Object.keys(comps).sort();
  for (const id of nowIds) if (!(id in FROZEN)) fz.push(id + ': a component that is not in FROZEN');
  for (const id of frozenIds) if (!(id in comps)) fz.push(id + ': frozen but no longer a component');
  for (const id of frozenIds) {
    if (!(id in comps)) continue;
    const now = (Array.isArray(comps[id].licenceFiles) ? comps[id].licenceFiles : []).slice().sort();
    const was = Object.keys(FROZEN[id]).sort();
    for (const f of now) if (!was.includes(f)) fz.push(id + ': ' + f + ' is not in its frozen list');
    for (const f of was) if (!now.includes(f)) fz.push(id + ': ' + f + ' left its licenceFiles');
    for (const f of was) {
      const p = join(LIC, f.replace(/^licenses\//, ''));
      if (!existsSync(p)) fz.push(id + ': ' + f + ' is missing from disk');
      else if (sha(bytes(p)) !== FROZEN[id][f]) fz.push(id + ': ' + f + ' no longer has the frozen SHA-256 (whole file)');
    }
  }
  ok(frozenIds.length > 0 && fz.length === 0,
    '★ leanfollow notices (3c): the component set (' + frozenIds.length + ') and each component\'s licence files, with the SHA-256 of each whole file, equal the FROZEN table of this pin — differences: [' + fz.join(' · ') + ']');

  /* ── (4) the notices doc ──────────────────────────────────────────────────────────────────── */
  const notesAt = doc.split('\n').indexOf('## Notices');
  const docLines = notesAt < 0 ? [] : doc.split('\n').slice(notesAt + 1);
  const noHeading = Object.entries(comps).filter(([, c]) => typeof c.noticeHeading !== 'string' || !/^### \S/.test(c.noticeHeading) || !docLines.includes(c.noticeHeading)).map(([id, c]) => id + ' → "' + c.noticeHeading + '"');
  ok(notesAt >= 0 && noHeading.length === 0, '★ leanfollow notices (4a): the notices doc has a "## Notices" line and, below it, the exact `###` heading of every component — missing: [' + noHeading.join(' · ') + ']');
  const named = new Set();
  for (const m of doc.matchAll(/Raw\/html\/([A-Za-z0-9_.\/-]*[A-Za-z0-9_-]\.[A-Za-z0-9]+)/g)) named.add(m[1]);
  const nameGone = [...named].filter((n) => !shipped.includes(n));
  const mAt = doc.split('\n').indexOf('## Method and its limits'); const invAt = doc.split('\n').indexOf('## Inventory');
  const mText = mAt >= 0 && invAt > mAt ? doc.split('\n').slice(mAt, invAt).join('\n') : '';
  const ncAt = mText.indexOf('**Not covered**'); const ncText = ncAt >= 0 ? mText.slice(ncAt) : '';
  const ncBullets = ncText.split('\n- ').slice(1);
  const NC = [/transitive NuGet packages/, /platform SDK libraries/, /exports no symbol and has no archive member/, /not named in this doc/, /bodies of `RocksDbSharp\.dll`/, /could not be read/, /`libargon2`[\s\S]*`IXICrypt\.dll`/];
  const ncMissing = NC.filter((re) => !ncBullets.some((b) => re.test(b))).map(String);
  ok(ncBullets.length >= NC.length && ncMissing.length === 0, '★ leanfollow notices (4c2): the "**Not covered**" list holds each of its ' + NC.length + ' bullets (by a key phrase) — missing: [' + ncMissing.join(' · ') + ']');
  ok(mAt >= 0 && invAt > mAt && /\*\*Not covered\*\*/.test(mText) && /transitive NuGet packages/.test(mText) && /exports no symbol|no archive member/.test(mText) && /Scans done/.test(mText),
    '★ leanfollow notices (4c): the notices doc has the section "## Method and its limits" above "## Inventory", with its "Scans done" list and its "**Not covered**" list (transitive NuGet packages, code with no symbol or member, unread packages)');
  ok(named.size > 0 && nameGone.length === 0, '★ leanfollow notices (4b): the notices doc names ' + named.size + ' Raw/html file path(s) and each exists — not shipped: [' + nameGone.join(', ') + ']');

  /* ── (5) no orphan text ───────────────────────────────────────────────────────────────────── */
  const listed = new Set();
  for (const c of Object.values(comps)) for (const rel of (c.licenceFiles || [])) listed.add(rel);
  const onDisk = walk(LIC).map((f) => 'licenses/' + f);
  const orphans = onDisk.filter((f) => !listed.has(f));
  ok(onDisk.length > 0 && orphans.length === 0, '★ leanfollow notices (5): every file under Raw/licenses (' + onDisk.length + ') is named by a component — orphans: [' + orphans.join(', ') + ']');
}
