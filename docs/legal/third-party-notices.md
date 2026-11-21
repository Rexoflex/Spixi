# Third-party notices — what Spixi ships that is not ours

First written 2026-08-30 (#710); rebuilt against what ships on 2026-11-18 (Speed lean follow-up, item 1). Facts only: a
licence is named as the file or its source states it; a licence that could not be proven is marked
**UNPROVEN — question for Damir** and is not guessed. The licence texts ship in the app package under
`Spixi/Resources/Raw/licenses/` (one file per text, packed by the `Resources\Raw\**` asset glob of `Spixi.csproj`; they
sit beside `Raw/html`, so the WebView folder is unchanged). Each text file starts with a 3-line header (component and
version · licence name · source of the text and the SHA-256 of the upstream bytes), one empty line, then the upstream text
byte for byte (CRLF changed to LF where the header says so, and then the header also records the SHA-256 of the LF body). The machine-readable twin of this table is
`docs/legal/third-party-inventory.json`; `scripts/pins-leanfollow/a-notices.mjs` reads both and the shipped folder.
The App's Contributors screen carries the short credit rows (`ASSET_CREDITS`: sounds, icons, flags).
**How the texts were found:** npm packages by `npm pack <name>@<version>`, GitHub files by `raw.githubusercontent.com` at
the tag or commit named in each row. nuget.org is not reachable from the build machine, so every NuGet package row is
read from the package's GitHub repository at the tag or commit of that version (the row says which), not from the
package's own nuspec — except `RocksDB.0.0.42.nupkg`, whose nuspec is in `local-nuget/`.
**Method and limits:** the section "Method and its limits" below says which scans were done and what is not covered.

## Method and its limits

Scans done (each reads files; nothing from a download is run). A later find of a class that is not in the first list is a limit of this
method, recorded here, not a missed row:
1. **Shipped WebView folder** `Raw/html` (40 files): every `.css` / `.html` / `.js` read for banners, copyright and licence lines;
   every data: URL (also `DATA:`) decoded and hashed; the code markers. Held by the pin.
2. **File headers of every compiled file:** the 140 files that `Ixian-Core/IXICore.projitems` compiles (133 carry an Ixian header; the
   seven others are in the rows: `Crypto/BigInteger.cs`, the four `Crypto/ForceCRC32/*.cs`, and `Streaming/GroupChat.cs` and
   `Utils/AddressComparer.cs`, which hold no header and no third-party marker); the 259 `.cs` / `.xaml` files of `Spixi` and
   `Spixi-PushService` outside the vendored `RocksDbSharp` folder (none carries a copyright line; the marker words
   "derived from", "adapted", "based on", "borrowed", "copied" matched lines that are prose about our own code and one line that
   names a source: `Spixi/Platforms/iOS/MauiFilePicker.cs:3`, see the MAUI row). The 43 `.cs` files of the vendored `RocksDbSharp` folder
   were read whole for the same words: line 2 of each names the upstream and commit; besides it only `BinaryComparer.cs:94-103`
   (MurmurHash3, own row), `AutoNativeImport.cs:10` (own row) and `Native.cs:10` (a source URL of RocksDB `c.h` v10.4.2) match; their bodies
   are held by `MANIFEST.sha256` and not compared with upstream here.
3. **Body overlap** against two upstreams (NBitcoin and Crc32.NET, the two whose code item 2 found in Ixian-Core): every compiled Ixian-Core file (140) and every `.cs` of Spixi and
   Spixi-PushService (235) against the code lines (30 or more characters; not `using`, `namespace` or comment lines) of the
   NBitcoin tree at `9b4ecc0e` (52,371 lines) and of Crc32.NET `v1.2.0` (223 lines); a file with 3 or more shared lines is listed.
   Found: NBitcoin code in `Utils/Wordlist.cs` (89 of 91 lines), `Utils/Mnemonics.cs` (68 of 88; the StackOverflow comment at
   `Mnemonics.cs:314` is NBitcoin's `Mnemonic.cs:216`), `Utils/BitWriter.cs` (40 of 47), `HardcodedWordlistSource` in
   `Utils/WordlistSources.cs` (17 of 17), `Utils/KDTable.cs` (14 of 16); Crc32.NET in the four `ForceCRC32` files. Nothing else shares
   more than 4 lines (common lines in 5 Core files and 2 Spixi files). The NBitcoin row carries the closest blob per file.
4. **Native binaries** (3 Android `librocksdb.so`, 2 iOS `librocksdb_full.a`): exported symbols (`llvm-nm -D`, `llvm-nm -C`), archive
   members (`ar t`; the simulator file is a fat Mach-O, its slices read apart), `llvm-readelf -d`, `strings`. Each of the 365 `.a`
   members was mapped by file name through `src.mk` to its source in `facebook/rocksdb` at the build commit `3f51c0a1` (358 sources;
   not mapped: `lz4`, `lz4file`, `lz4frame`, `lz4hc`, `xxhash` = lz4 1.9.4, and the generated `build_version.cc`). **The whole text** of 843
   files — 377 source paths (a member name such as `slice.cc` matches several paths, `java/rocksjni` included) and every header of their
   directories — was searched line by line for: copyright, `(c) <year>`, redistribution / permission / licence words, public domain,
   copied / borrowed / adapted from / originally from / taken from / derived from, and URLs. It is a pattern search with a look at each hit,
   not a read of every line by a person. Licence blocks found: the rows below, and the two blocks of `util/xxph3.h` (lines 5-37 and 656-688)
   which have their own text and row; the block of `util/crc32c.cc` lines 399-428 ("Copyright 2016 Ferry Toth, Exalon Delft BV") is **found in a mapped source, not compiled for these targets** — it is the notice of `crc32c_3way` (`crc32c.cc:429-1104`, under `#if defined(__SSE4_2__) && defined(__PCLMUL__)`); the x86_64 `.so` holds 0 `pclmul` instructions (`llvm-objdump -d`) and no `crc32c_3way` symbol, the arm64 and armeabi-v7a `.so` and the iOS arm64 `crc32c.cc.o` use the `HAVE_ARM64_CRC` / table path, and the iOS x86_64 simulator slice holds only the lz4 / xxhash members; no row, no text; `java/rocksjni/merge_operator.cc` "Copyright
   (c) 2014, Vlad Balan" is a JNI file (the `.so` exports 0 `Java_org_rocksdb` symbols and holds no `rocksjni` string). **Origin comments with no licence
   text in the file** (facts; no text of these origins ships): `table/merging_iterator.cc:308` "optimization adapted from Pebble"
   (`cockroachdb/pebble`; its `LICENSE` at master reads "Copyright (c) 2011 The LevelDB-Go Authors" with a redistribution text, SHA-256
   `d1f46db68f5899a5…`); `util/string_util.cc:476` "Copied from folly/string.cpp"; `util/crc32c.cc:1136` "crc32c combine, copied with permission
   from folly"; `util/coding.h:71` "Borrowed from" fbthrift `VarintUtils-inl.h` (zigzag, 2 lines); `util/slice.cc:243` "Originally from
   wdt/util/EncryptionUtils.cpp"; `util/xxhash.h:3591`, `util/xxph3.h:878` "Adapted from" google/highwayhash (`util/xxhash.h:4291` is a quoted comment above `XXH3_scrambleAcc_avx512`; no highwayhash code follows it);
   `util/thread_local.cc:229` a gperftools URL on the Windows-only `#else` branch (not built for Android or iOS); `util/fastrange.h:7` a link to
   lemire/fastrange; `util/hash.cc:27` MurmurHash1 with a link to `aappleby/smhasher` (in the compiled `rocksdb::Hash`); `util/hash.cc:150`
   "Adapted from XXH3_len_9to16_128b" (the xxHash rows); `util/mutexlock.h:157` "Inspired by Guava"; `util/distributed_mutex.h:12` and
   `port/jemalloc_helper.h:94` folly links; `db/kv_checksum.h:80` a constant, not a source. **The rule for this list:** every hit in a compiled member that names an outside origin of CODE, or a licence or copyright
   block, is listed; links to papers, bug trackers, Q&A sites and design notes are not (review round 5: e.g. StackOverflow links in
   `port/stack_trace.cc`, `pdillinger/unique_id` links, a zstd.h link, the SuRF paper); the JSON `member-to-source` holds the same list.
   Found, NOT compiled: `util/work_queue.h` ("an excerpt from Facebook's zstd repo", its own Facebook BSD / GPLv2 block; only
   `util/work_queue_test.cc` includes it). The 127 headers that the mapped
   sources include from other directories (`include/`, the PerconaFT `lib/ft` and `portability`, `port/`) were read whole too
   (review round 4): they hold only PerconaFT (its row) and `include/rocksdb/utilities/env_mirror.h` (Red Hat, named with
   `env_mirror.cc`), besides links to RocksDB's own pages. **UNPROVEN — question for Damir:** whether a text is wanted for the Pebble,
   folly, fbthrift, wdt, highwayhash, fastrange, smhasher and Guava fragments. Compiled-or-not test of these fragments: Pebble, folly (`strerror_r` trick, `crc32c` combine), fbthrift zigzag (used by `index_builder.cc`) and wdt `toHex` are COMPILED (their members and symbols are in the binaries); highwayhash (its code at `xxhash.h:3591` and `xxph3.h:878` sits under the PowerPC VSX / AltiVec guards) and gperftools (`thread_local.cc:229`, inside `#ifdef OS_WIN`) are NOT COMPILED for these targets. Each exported symbol family on the `.so` was named: `rocksdb::`, `std::__ndk1` (libc++,
   8,182 names), `toku::` (312), `LZ4_*` (81), `ROCKSDB_XXH*` (49), `TimerQueue` (15), `__cxxabiv1` / `__cxa_*` (libc++abi),
   `MurmurHashNeutral2` (arm64, armeabi-v7a; `MurmurHash64A` instead in the x86_64 `.so`), `crc32c_*`, `__emutls_get_address` (compiler-rt, exported weak; **UNPROVEN — question for Damir:** its source and licence); 18 / 1 / 20 `libunwind`
   strings in the arm64 / armeabi-v7a / x86_64 `.so`, no `_Unwind*` export. Result: the rows
   LZ4, xxHash, PerconaFT, MurmurHash, TimerQueue, LLVM libc++, libc++abi, libunwind and compiler-rt; the other holders found sit in RocksDB's own files under
   RocksDB's dual-licence header: "Copyright (c) 2018, Arm Limited and affiliates" (`util/crc32c_arm64.cc`), "Copyright (c) 2015, Red Hat,
   Inc." (`utilities/env_mirror.cc`), "Copyright (c) 2019 Intel Corporation" (`memory/memkind_kmem_allocator.h`; `memkind` symbols are
   in the `.so`). `crc32c_ppc*.h` (IBM) has no symbol in the binaries. Not found: zstd library code (only RocksDB's own `ZSTD`
   wrapper classes and the message "ZSTD 1.1.3+ is not linked with the binary"), snappy ("Snappy not supported in this build"), bzip2,
   zlib (no `BZ2_*`, `deflate`, `inflate`, `adler32` symbol); the `.so` files need only `libm`, `libdl`, `libc`.
5. **Texts:** npm packages by `npm pack <name>@<version>`, GitHub files by `raw.githubusercontent.com` or a `git` clone at the tag or
   commit named in the row; nuget.org is not reachable from the build machine, so a NuGet package is read from its GitHub repository
   at the tag or commit of that version, not from its nuspec — except `RocksDB.0.0.42.nupkg`, whose nuspec is in `local-nuget/`.
6. `Spixi-PushService`: `Spixi.csproj` lines 407-412 (an iOS-only `ItemGroup`; the `ProjectReference` is line 408) reference it with
   `IsAppExtension` true, so it is embedded in the iOS bundle as a separate signed binary. One package, `OneSignalSDK.DotNet` 6.1.9
   (the version the app pins); two source files with no copyright or licence line; no `Compile` include of Ixian-Core.

**Not covered** (a find in one of these is a recorded limit, not an error of the rows):
- the transitive NuGet packages of the packages named below;
- the .NET / MAUI runtimes and the Android and iOS platform SDK libraries;
- code inside a native binary that exports no symbol and has no archive member of its own;
- code reused without a marker from an upstream that is not named in this doc (the body-overlap scan reads only the upstreams named
  in item 3);
- the bodies of `RocksDbSharp.dll` of `local-nuget/RocksDB.0.0.42.nupkg` (read for type names and the nuspec only) and the bodies of the vendored
  `RocksDbSharp` files against their upstream (held only by `MANIFEST.sha256`);
- the native libraries inside NuGet packages that could not be read: `RocksDB` 10.4.2.64152 (Windows; Mac Catalyst uses a local copy of
  its osx-arm64 dylib) and `OneSignalSDK.DotNet` 6.1.9; the 8 `runtimes/` files of `local-nuget/RocksDB.0.0.42.nupkg` are 52-byte stubs;
- the `DllImport` names `libargon2` (`Platform/NativeMethods.cs`) and `IXICrypt.dll` (`Crypto/KeyDerivation.cs`) name binaries that no
  file of this tree holds or names — **UNPROVEN — question for Damir:** which package supplies them (not a licence claim).

## Inventory

| component | version | licence as the file or its source states it | where it ships | licence text before → now | missing before / added now |
|---|---|---|---|---|---|
| **html5-qrcode** (mebjas) — incl. its own PNG + 3 SVG images (data: URLs inside the file) | 2.3.8 — `js/html5-qrcode.min.js` is byte-identical to the minified file of npm `html5-qrcode@2.3.8` (SHA-256 `660b1243…`); 13 other versions tested (2.1.6 … 2.3.7) differ | Apache-2.0 (`package.json`, package `LICENSE`, "Copyright [2020] [MINHAZ]") | `Raw/html/js/html5-qrcode.min.js`, loaded by `scan.html` | none in the package (a 3-line notice here) → `licenses/html5-qrcode.Apache-2.0.txt` | the licence text — ADDED (npm 2.3.8 `LICENSE`, same bytes as the GitHub tag `v2.3.8`) |
| **ZXing code inside html5-qrcode.min.js** (zxing-js) | **UNPROVEN — question for Damir:** the zxing-js version is not proven; nearest npm `@zxing/library` 0.18.3 (866 diff lines against html5-qrcode's `third_party/zxing-js.umd.js`); 0.18.5 / 0.19.1 differ by about the same. The `LICENSE` of `zxing-js/library` is the same MIT bytes at `v0.17.1`, `v0.18.3` and `v0.19.1` (SHA-256 `4c26c307…`) and is the Apache-2.0 text at `v0.20.0` and `v0.21.0` (`849b3ff4…`) | MIT for `zxing-js/library` (its `LICENSE`, "Copyright (c) 2018 ZXing for JS"); Apache-2.0 in the per-file headers of the umd source ("Copyright 2007 … 2013 ZXing authors") — the minified file keeps neither | inside `js/html5-qrcode.min.js` (the file names `ZXing` and `ZXingHtml5QrcodeShim`) | none → `licenses/zxing-js.MIT.txt`, `licenses/zxing.Apache-2.0.txt` | the two texts — ADDED (npm `@zxing/library@0.18.3` `LICENSE`; `zxing/zxing` `LICENSE` at `zxing-3.5.3`); **UNPROVEN — question for Damir:** the exact zxing-js version, and with it which `LICENSE` of the repo applies |
| **OpenJDK `java.io` classes ported in zxing-js** (`OutputStream`, `ByteArrayOutputStream`) | JDK version not stated | GNU GPL v2 only with the Classpath Exception — as the source headers "Copyright (c) 1994, 2004 / 1994, 2010, Oracle" of the umd source state it; the minified file holds the class (method `toByteArray`) and no header | inside `js/html5-qrcode.min.js` | none → `licenses/openjdk.GPL-2.0-Classpath-exception.txt` | the text — ADDED (`openjdk/jdk8u` `LICENSE` at `jdk8u202-ga`, same bytes as master); **UNPROVEN — question for Damir:** from which JDK version the code was ported (the `LICENSE` of `jdk8-b132` and of `jdk8u202-ga` differ by 11 bytes) |
| **qrcode-generator** (Kazuhiko Arase) | the vendored code equals `qrcode.js` of npm `qrcode-generator` 1.4.4, 1.5.0 and 1.5.2 (one file, SHA-256 `18ae399f…`, apart from the wrapper); `2.0.4` differs. The repo header says "v1.5.x" | MIT (banner "Copyright (c) 2009 Kazuhiko Arase … Licensed under the MIT license") | inside `Raw/html/spixi.bundle.js` (from `src/components/qr.js`); also used by the wallet receive QR | only the banner (a URL) → `licenses/qrcode-generator.MIT.txt` | the licence text — ADDED (`kazuhikoarase/qrcode-generator` `LICENSE` at `js1.5.2`, same bytes at `js1.4.4`, `js1.5.0`) |
| **Sora** (The Sora Project Authors) | 2.000 (font name table); both woff2 files byte-identical to `@fontsource-variable/sora` 5.3.0 | SIL OFL 1.1 ("Copyright 2019 The Sora Project Authors" in the font and in the licence file — the earlier row here said 2020) | data: URLs in `Raw/html/spixi.base.css` (latin) and `Raw/html/intro.html` (latin-ext) | `src/assets/fonts/SORA-OFL.txt` in the repo only (not shipped) → `licenses/sora.OFL-1.1.txt` | the OFL text in the package — ADDED (npm `@fontsource-variable/sora@5.3.0` `LICENSE`, same bytes as `SORA-OFL.txt`); `sora-xor/sora-font` `OFL.txt` (master `7f9a9c5d`) carries the same copyright line with small whitespace / URL differences |
| **Tabler Icons** (Paweł Kuna) | **UNPROVEN — question for Damir:** the Tabler version of the exported glyphs is not stated in the repo (no doc, no `DECISIONS` row names one). The `LICENSE` of tabler-icons is the MIT text at every tag read (`v1.0.0`, `v2.0.0`, `v3.0.0`, `v3.10.0`, `v3.35.0`, `v3.36.1`, `v3.37.0`, `v3.41.0`) and differs only in the copyright line: 2020 / 2020-2023 / 2020-2024 / 2020-2025 (`v3.35.0`, `v3.36.1`) / 2020-2026 (`v3.37.0` and later); the notices doc's line "2020-2025" matches `v3.35.0` and `v3.36.1` | MIT (the files carry no licence line; the in-app credit and this doc say MIT) | 107 glyph entries in `Raw/html/spixi.icons.js` — 106 Figma exports `src/assets/icons/tabler-icon-*.svg` + `logo.svg` (ours); the earlier row said 87 | the MIT text below (this doc) → plus `licenses/tabler-icons.MIT.txt` | the text in the package — ADDED (`tabler/tabler-icons` `LICENSE` at `v3.35.0`); **UNPROVEN — question for Damir:** the version of the exported glyphs, hence the copyright years |
| **Twemoji Country Flags** (Twemoji artwork, font build by TalkJS) | font name table "Version 0.6.0", family "Twemoji Mozilla"; the woff2 is byte-identical to `dist/TwemojiCountryFlags.woff2` of npm `country-flag-emoji-polyfill@0.1.10` | CC-BY-4.0 for the artwork (package `LICENSE.md`; `twitter/twemoji` README: "Copyright 2019 Twitter, Inc and other contributors"); MIT for the polyfill's code — none of its code ships (no match in the shipped files; only the woff2 is used by `src/components/flags.js`) | data: URL in `Raw/html/fonts/TwemojiCountryFlags.js`, injected only where the system emoji font draws no flags | credit row in the app + the notice below → plus `licenses/twemoji-country-flags.CC-BY-4.0.txt`, `licenses/country-flag-emoji-polyfill.MIT.txt` | the CC BY 4.0 legal code — ADDED (`LICENSE-GRAPHICS` of `twitter/twemoji` at `bad3bcee`, same bytes at `jdecked/twemoji` `b6b55fef`); the package's own licence statement — ADDED (its `LICENSE.md`) |
| Flag PNGs (14) | – | ours by `src/components/flags.js:23` ("the fallback is Damir's own asset"); 12 of the 14 are in the fork point `0e85a4b8`, `al.png` and `us.png` are not; the files carry no text | `Raw/html/img/flags/*.png` | – | no text shipped for them; **UNPROVEN — question for Damir:** the origin of `al.png` and `us.png` (recorded nowhere beyond that comment; a question about two files, not a licence claim) |
| Chat background pattern | – | ours: `scripts/generate-chat-pattern.mjs` synthesizes the tiles (it reads no file, #866) | two SVG data: URLs in `Raw/html/spixi.chat-pattern.css` | – | no text shipped (ours) |
| Our shells, scripts, sheets and strings | – | ours; the repo `LICENSE` is MIT "Copyright (c) 2019 Ixian" | the other 23 files of `Raw/html` | – | no text shipped (ours) |
| **The chat doodle pattern** (`src/assets/images/chat-bg-doodles.svg`, `doodle-pattern-aug.svg`, `chat-bg-pattern.svg`) | – | ⚠ **UNKNOWN — Damir's export; origin not recorded in the repo** | **not shipped** since #866 (Session W): `generate-chat-pattern.mjs` no longer reads or emits it; the three files stay on disk unreferenced | – | **OPEN — Damir to state the source** (only matters if a file is shipped again) |
| **Open Sans** | 1.10 (font name table of both files) | Apache-2.0 (name table nameID 13 / 14: "Licensed under the Apache License, Version 2.0"); "Digitized data copyright © 2010-2011 / 2011, Google Corporation" | `Spixi/Resources/Fonts/OpenSans-Regular.ttf`, `OpenSans-Semibold.ttf` (`MauiFont`, `Spixi.csproj`; `MauiProgram.cs`) | none → `licenses/open-sans.Apache-2.0.txt` | the text — ADDED (`google/fonts` `apache/opensans/LICENSE.txt` at `bf35e5a3`, the last commit that holds it; CRLF changed to LF). The shipped files (107,152 and 111,048 bytes) match no static Open Sans blob in the history of that folder (Regular checked against 217,360 and 217,276 bytes; the Semibold blobs differ too) — their origin beyond the name table is not proven — **UNPROVEN — question for Damir:** where the two files came from (a question about the files, not a licence claim; the licence text is by the name table) |
| **UI SFX audio** (uisfx.com) | 0.4.0 by the repo docs | CC0-1.0 (`LICENSE-AUDIO` of npm `uisfx@0.4.0`: "dedicated to the public domain") | `Spixi/Resources/Raw/sounds/message_sent.mp3`, `message_received.mp3` (by `DECISIONS` 502 / 535 and `docs/sound-placeholders.md`: cues `minimal/swipe` and `minimal/drag-start`, re-encoded: mono, 96 kbps, −16 dBFS) | credit row in the app → plus `licenses/uisfx.CC0-1.0.txt` | the statement — ADDED. **Source proven by waveform:** decoded to mono 44.1 kHz, `message_sent.mp3` correlates 0.99998 with `minimal/swipe` and `message_received.mp3` 0.99998 with `minimal/drag-start` of npm `uisfx@0.4.0` (same sample counts, 14,130 and 10,690; peaks −15.95 / −16.00 dBFS as `DECISIONS` 535 records); the two files carry no tag |
| Call tones (`busy_tone`, `default_ringtone`, `dialing_tone`, `error_tone`) | – | no tag or licence line in the files; `DECISIONS` N84 records Damir's statement: "they were synthesized by AI, entirely made up" (added pre-fork at `fdc09aad`, 2024-09-13) | `Raw/sounds/*.mp3` (4 files, all in the fork point) | – | **UNPROVEN — question for Damir:** the statement is a record, not a file fact; no upstream to compare the bytes with |
| Our own icons, splash, translations | – | ours by their comments (`appicon*.svg`: "Damir's gradient" and the E1c / B14 / E1b notes; no third-party marker); `Raw/lang/*.txt` carry no licence line. **Platform images** (31 files read — every PNG chunk, and the ICO header; none holds a copyright, author or licence text; the only text chunk is `Software: Adobe ImageReady` in `splash.png` ×4 and `Windows/appicon.png`): `ic_stat_spixi.png` ×5 densities is "a fresh 5-density white silhouette from the logomark" (`SPushService.cs:435-436`, AND-13 #334); each `ic_stat_onesignal_default.png` of the four density folders `drawable-hdpi` … `-xxxhdpi` and `drawable-mdpi` is byte-identical to the `ic_stat_spixi.png` of its folder; `drawable/ic_stat_onesignal_default.png` (24 px; `drawable/` holds no `ic_stat_spixi.png`) equals the mdpi one (the name is the one the OneSignal SDK looks up, `AndroidManifest.xml:22`); `appicon_windows.ico` is "rendered FROM appicon_windows.svg" (`Spixi.csproj:167`); `splash.png`, `statusicon.png`, `Windows/appicon.png` and `Windows/icon/*.png` (19 files) are byte-identical to the fork point `0e85a4b8`, where the repo `LICENSE` is MIT "Copyright (c) 2019 Ixian", and their authorship is recorded nowhere beyond that | `Spixi/Resources/AppIcon`, `Splash`, `Styles`, `Raw/lang`; `Spixi/Platforms/Android/Resources/drawable*/*.png` (19), `Spixi/Platforms/Windows/appicon.png`, `appicon_windows.ico`, `icon/*.png` (12) | – | no text shipped (ours; the 19 fork-point images by the fork point's licence) |
| **RocksDbSharp**, vendored source (Mac Catalyst only) | `curiosity-ai/rocksdb-sharp` @ `f1cf0ba0` (43 `.cs` files, hashes in `MANIFEST.sha256`) | BSD-2-Clause ("Copyright (c) 2015, Warren Falk, Copyright (c) 2022, Curiosity GmbH"); `RocksDbSharp/LICENSE` is byte-identical to the upstream file at that commit | compiled into the maccatalyst app binary (`Spixi/Platforms/MacCatalyst/RocksDbSharp/**`) | `Platforms/MacCatalyst/RocksDbSharp/LICENSE` in the source tree only → plus `licenses/rocksdbsharp.BSD-2-Clause.txt` | the text in the package — ADDED (same bytes as the vendored `LICENSE`) |
| **RocksDB** NuGet package (managed `RocksDbSharp.dll`; native assets excluded) — Android, iOS | 0.0.42 (`local-nuget/RocksDB.0.0.42.nupkg`; nuspec names `curiosity-ai/rocksdb-sharp` @ `f1cf0ba0`) | BSD-2-Clause (`<license type="expression">` in its nuspec; nuspec copyright "(c) Copyright 2016 Warren Falk, (c) Copyright 2023 Curiosity GmbH" — the repo `LICENSE` reads 2015 / 2022); the dev's DLL is a modified build (`Native.cs`, `AutoNativeImport.cs` headers) | managed DLL in the Android and iOS builds | none → the same `licenses/rocksdbsharp.BSD-2-Clause.txt` | the text — ADDED; the nupkg holds no `LICENSE` file |
| **RocksDB** NuGet package — Windows (every TFM that is not android / ios / maccatalyst) | 10.4.2.64152 | **UNPROVEN — question for Damir:** its nuspec could not be read (nuget.org is not reachable); the package id `RocksDB` is the id of `curiosity-ai/rocksdb-sharp` (BSD-2-Clause) and `Spixi.csproj` says it binds native 10.4.2 | managed DLL + native `rocksdb.dll` in the Windows build | none → the BSD-2-Clause text above, if the package is that repo's | the licence of this package and of its native library is not proven (options in the report); no text claims it |
| **AutoNativeImport.cs** (warrenfalk) | file header names no version; `warrenfalk/auto-native-import` has one branch, no tag (master `4e94c5e4`) | MIT (file header "License: MIT"; "Author: Warren Falk"); the file is the one patched file of the vendored folder (two `#920` edits) | `Spixi/Platforms/MacCatalyst/RocksDbSharp/AutoNativeImport.cs` (maccatalyst); and inside `RocksDbSharp.dll` of `local-nuget/RocksDB.0.0.42.nupkg` (Android, iOS builds): its metadata holds namespace `NativeImport` and the types `Auto`, `Importers`, `NativeFunctionMissingException`, `NativeLoadException`, the names this file defines (the DLL is a modified build; that its code is the same is not proven) | header line only → `licenses/auto-native-import.MIT.txt` | the text — ADDED (`LICENSE` of the repo master, "Copyright (c) 2015 Warren Falk") |
| **RocksDB native library** (facebook/rocksdb) | Android (3 × `librocksdb.so`) and iOS (2 × `librocksdb_full.a`): the binaries' own strings say `rocksdb_build_git_sha 3f51c0a1…`, tag `main`, built 2026-04-08; the iOS header `version.h` says 11.2.0 ("in the main development branch, this should be the next minor or major version"). Windows: inside NuGet `RocksDB` 10.4.2.64152, not in the repo; Mac Catalyst: a gitignored, machine-local vtool-restamped copy of the NuGet osx-arm64 dylib (`Spixi.csproj:113-120`; the 10.4.2 package is excluded for maccatalyst at `:295`) | Apache-2.0 **and** GPL-2.0, "you may select, at your option, one of the above-listed licenses" (README of facebook/rocksdb at that commit); LevelDB-derived code under `LICENSE.leveldb`; other copyright lines in RocksDB's own files under the same header: "Copyright (c) 2018, Arm Limited and affiliates" (`util/crc32c_arm64.cc`), "Copyright (c) 2015, Red Hat, Inc." (`utilities/env_mirror.cc`), "Copyright (c) 2019 Intel Corporation" (`memory/memkind_kmem_allocator.h`); the third-party code in these binaries has the rows below (LZ4, xxHash, PerconaFT, MurmurHash, TimerQueue, LLVM libc++); **UNPROVEN — question for Damir:** `__emutls_get_address` (compiler-rt) | `Spixi/Platforms/Android/lib/*/librocksdb.so`, `Spixi/Platforms/iOS/NativeLibraries/RocksDB.xcframework`; Windows native from the package; Mac Catalyst native: the local dylib above | none → `licenses/rocksdb.Apache-2.0.txt`, `rocksdb.GPL-2.0.txt`, `rocksdb.LICENSE-leveldb.txt` | the three texts named by the upstream — ADDED (`LICENSE.Apache`, `COPYING`, `LICENSE.leveldb` at `3f51c0a1`; same bytes at `v10.4.2`); **UNPROVEN — question for Damir:** the build of the Windows native library (and that the Mac Catalyst dylib is the file of that package) |
| **LZ4** (Yann Collet, `lz4/lz4`) — compiled into the RocksDB native binaries | 1.9.4: the string `1.9.4` and the export `LZ4_versionString` are in all 3 Android `librocksdb.so` and both iOS `librocksdb_full.a`; the five iOS members `lz4`, `lz4file`, `lz4frame`, `lz4hc`, `xxhash` are the five `lib/` sources of lz4 1.9.4 (`lz4file.c` is not in v1.9.3) | BSD 2-Clause ("LZ4 Library", "Copyright (c) 2011-2020, Yann Collet", `lib/LICENSE` at `v1.9.4`); `lib/README.md` of that tag: "All source material within lib directory are BSD 2-Clause licensed" | the same 5 binaries (81 `LZ4_*` exports per `.so`; 100 `LZ4_*` text symbols in the iOS device `.a`; the simulator fat `.a`: arm64 slice with the same 365 members, x86_64 slice with only the five LZ4 members) | none → `licenses/lz4.BSD-2-Clause.txt` | the text — ADDED (`lib/LICENSE` at `v1.9.4`) |
| **xxHash** (Yann Collet) — five header blocks | RocksDB's own copy 0.8.1 (`util/xxhash.h` at `3f51c0a1`: 49 `ROCKSDB_XXH*` exports per `.so`, member `xxhash.cc` of the `.a`); lz4's copy 0.6.5 (`lib/xxhash.[ch]` of lz4 1.9.4, member `xxhash` of the `.a`); the XXPH3 preview copy of RocksDB (`util/xxph3.h`, included by `util/hash.cc`, 0.7.2 by its own text) | BSD 2-Clause by each file's header: "Copyright (C) 2012-2021 Yann Collet" (RocksDB copy), "Copyright (C) 2012-2016, Yann Collet" (lz4 copy), and the two blocks of `util/xxph3.h` named above. The lz4 `lib/LICENSE` says "2011-2020" and `lib/README.md` calls all of `lib/` BSD 2-Clause, so it names the lz4 copy but carries a different copyright line | the same 5 binaries | none → `licenses/xxhash.BSD-2-Clause.txt`, `licenses/xxhash-lz4.BSD-2-Clause.txt`, `licenses/xxhash-rocksdb-cc.BSD-2-Clause.txt`, `licenses/xxhash-xxph3-a.BSD-2-Clause.txt`, `licenses/xxhash-xxph3-b.BSD-2-Clause.txt` | the five header blocks — ADDED (lines 26-59 of `util/xxhash.h` at `3f51c0a1`; lines 1-33 of `lib/xxhash.c` at `v1.9.4`; lines 5-37 of RocksDB's `util/xxhash.cc`, "Copyright (C) 2012-2020 Yann Collet"; lines 5-37 "Copyright (C) 2012-2016, Yann Collet." and 656-688 "Copyright (C) 2019-present, Yann Collet." of `util/xxph3.h`) |
| **PerconaFT locktree** (percona/PerconaFT) as vendored in RocksDB `utilities/transactions/lock/range/range_tree/lib/` | in `facebook/rocksdb` at `3f51c0a1`; the PerconaFT version is not stated (the directory `README`: "originally come from https://github.com/percona/PerconaFT/", two listed modifications); 312 `toku::` exports in the arm64 and armeabi-v7a `.so` (311 x86_64), 375 defined `toku::` lines in the iOS arm64 `.a`; members `concurrent_tree keyrange lock_request locktree manager range_buffer treenode txnid_set wfg dbt memarena` | the header of 35 files there: "This file is part of PerconaFT. Copyright (c) 2006, 2015, Percona and/or its affiliates. All rights reserved." followed by three paragraphs — GNU General Public License version 2, GNU Affero General Public License version 3, Apache License 2.0; the directory holds `COPYING.GPLv2`, `COPYING.AGPLv3`, `COPYING.APACHEv2` | the same 5 binaries | none → `licenses/perconaft.GPL-2.0.txt`, `perconaft.AGPL-3.0.txt`, `perconaft.Apache-2.0.txt`, `perconaft.PerconaFT-file-header.txt` | the four texts — ADDED (`COPYING.*` and `locktree/locktree.cc` lines 5-50 at `3f51c0a1`); **UNPROVEN — question for Damir:** which of the three licences Spixi takes |
| **MurmurHash** (Austin Appleby) in RocksDB `util/murmurhash.cc` | not stated; `MurmurHashNeutral2` is exported by the arm64 and armeabi-v7a `.so`, `MurmurHash64A` instead by the x86_64 `.so` (`util/murmurhash.h` picks it on `__x86_64__`); member `murmurhash.cc` of the `.a` | the file's own statement: "All code is released to the public domain. For business purposes, Murmurhash is under the MIT license."; no MIT text and no author copyright line in the file | the same 5 binaries | none → `licenses/murmurhash.file-statement.txt` | the statement — ADDED (lines 6-11 of the file at `3f51c0a1`) |
| **MurmurHash3 C# variant** (Elliott B. Edwards; algorithm Austin Appleby) in `RocksDbSharp/BinaryComparer.cs` | not stated; vendored `curiosity-ai/rocksdb-sharp` @ `f1cf0ba0`; the string `MurMurHash3` is also in `RocksDbSharp.dll` of `RocksDB.0.0.42.nupkg` (its body was not read) | the file's own statement (lines 94-103): "This code is public domain.", "placed into the public domain as a gist"; no MIT text, no copyright line | `Spixi/Platforms/MacCatalyst/RocksDbSharp/BinaryComparer.cs` (maccatalyst) | none → `licenses/murmurhash3-csharp.file-statement.txt` | the statement — ADDED (lines 94-103 of the vendored file) |
| **TimerQueue** (crazygaze.com) in RocksDB `util/timer_queue.h` | not stated ("Borrowed from http://www.crazygaze.com/blog/2016/03/24/portable-c-timer-queue/"); 15 `TimerQueue` symbols in each Android `.so`; used by `blob_db` | CC0 by the file's statement ("The source code in this article is licensed under the CC0 license … No attribution is required") | the Android `.so` (and `blob_db_impl` in the `.a`) | none → `licenses/timer-queue.file-statement.txt` | the statement — ADDED (lines 1-21 of the file at `3f51c0a1`) |
| **LLVM libc++ and libc++abi** (and libunwind, compiler-rt: see the Notices section) — statically linked into the 3 Android `.so` | NDK r29 by `.note.android.ident` (`r29`, API 23, build 14206865); the mangled names carry the libc++ ABI tag `ne210000`; 8,182 `std::__ndk1` names, 33 `__cxxabiv1` exports, the string "libc++abi: terminating due to %s exception". **UNPROVEN — question for Damir:** the exact LLVM version inside NDK r29 | Apache License v2.0 with LLVM Exceptions ("The LLVM Project is under the Apache License v2.0 with LLVM Exceptions"); each `LICENSE.TXT` also holds the MIT and the University of Illinois/NCSA texts for the library; the same bytes at `llvmorg-19.1.0`, `20.1.0`, `21.1.0` and `main` | `Spixi/Platforms/Android/lib/*/librocksdb.so` (the iOS `.a` defines no `std::__ndk1` symbol; its 6,072 `std::__1` references are undefined, so libc++ is not in it) | none → `licenses/llvm-libcxx.Apache-2.0-with-LLVM-exception.txt`, `licenses/llvm-libcxxabi.Apache-2.0-with-LLVM-exception.txt`, `licenses/llvm-libunwind.Apache-2.0-with-LLVM-exception.txt`, `licenses/llvm-compiler-rt.Apache-2.0-with-LLVM-exception.txt` | the four texts — ADDED (`libcxx/`, `libcxxabi/`, `libunwind/`, `compiler-rt/` `LICENSE.TXT` at `llvmorg-21.1.0`) |
| **BouncyCastle.Cryptography** | 2.6.2 | MIT, "Copyright (c) 2000-2025 The Legion of the Bouncy Castle Inc." (`LICENSE.md` at `release-2.6.2`) | managed DLL, all platforms | none → `licenses/bouncycastle.MIT.txt` | the text — ADDED |
| **CommunityToolkit.Maui** | 14.2.0 | MIT, "Copyright (c) .NET Foundation and Contributors" (`LICENSE` at `14.2.0`) | managed DLL, all platforms | none → `licenses/communitytoolkit-maui.MIT.txt` | the text — ADDED |
| **Concentus** | 2.2.2 | BSD-style, three conditions; no SPDX name in the file; "Copyright (c) by various holding parties, including … Skype Limited, Xiph.Org Foundation, CSIRO, Microsoft Corporation …" (`LICENSE` of `lostromb/concentus` at `6c2328dc`, the commit that sets `<Version>2.2.2</Version>`; the csproj packs it as `PackageLicenseFile`; the earlier row here said "BSD-3") | managed DLL, all platforms | none → `licenses/concentus.LICENSE.txt` | the text — ADDED (the repo has no tag for 2.2.2; the commit is the version bump) |
| **Microsoft.Maui.Controls** and **.Compatibility** | 10.0.71 | MIT, "Copyright (c) .NET Foundation and Contributors" (`LICENSE.txt` of `dotnet/maui` at `10.0.71`) | managed DLLs, all platforms | none → `licenses/maui.MIT.txt` | the text — ADDED |
| **Mono.Nat** | 3.0.4 | MIT, "Copyright (C) 2006 Alan McGovern" (`LICENSE.md` at `release-v3.0.4`) | managed DLL, all platforms | none → `licenses/mono-nat.MIT.txt` | the text — ADDED |
| **Newtonsoft.Json** | 13.0.4 | MIT, "Copyright (c) 2007 James Newton-King" (`LICENSE.md` at `13.0.4`) | managed DLL, all platforms | none → `licenses/newtonsoft-json.MIT.txt` | the text — ADDED |
| **OneSignalSDK.DotNet** | 6.1.9 | MIT, "Copyright (c) 2022 OneSignal" (`LICENSE.md` of `OneSignal/OneSignal-DotNet-SDK` at `6.1.9`) | managed DLL, all platforms; the native OneSignal SDKs it binds are the next row | none → `licenses/onesignal-dotnet.MIT.txt` | the text — ADDED |
| **OneSignal native SDKs** (OneSignal-Android-SDK, OneSignal-iOS-SDK) bound by OneSignalSDK.DotNet 6.1.9 | `versions.json` of `OneSignal-DotNet-SDK` at tag `6.1.9` (commit `7db6a33e`) reads Android 5.9.3, iOS 5.5.2. **UNPROVEN — question for Damir:** the published NuGet package could not be read (nuget.org is blocked), so that it holds exactly those native versions is not verified | **"Modified MIT License"** (`LICENSE` of each repo; Android "Copyright 2016 OneSignal", iOS "Copyright 2017 OneSignal"): the MIT wording with a second condition, "All copies of substantial portions of the Software may only be used in connection with services provided by OneSignal."; the Android text adds notices for portions from the Google GcmClient demo project (Apache-2.0), RootTools (Apache-2.0 or GPL-2.0) and ShortcutBadger. The same bytes at `5.9.3` / `5.5.2` and at `main` (`bd4de20a` / `a196bd1c`) | native code in the Android build and the iOS build, and in the iOS push extension `Spixi-PushService` (same package) | none → `licenses/onesignal-android-sdk.Modified-MIT.txt`, `licenses/onesignal-ios-sdk.Modified-MIT.txt` | the two texts — ADDED (`LICENSE` at tags `5.9.3` and `5.5.2`) |
| **Plugin.Fingerprint** | 3.0.0-beta.1 | MS-PL (`PackageLicenseExpression` in `src/Directory.build.props`; `LICENSE` of `smstuebe/xamarin-fingerprint` at `90ba2eda`, branch `maui-support`, the commit that sets `<Version>3.0.0-beta.1</Version>`; "Copyright (c) Sven-Michael Stübe") | managed DLL, all platforms | none → `licenses/plugin-fingerprint.MS-PL.txt` | the text — ADDED (the repo has no tag for 3.0.0-beta.1) |
| **NAudio** | 2.3.0 | MIT, "Copyright 2020 Mark Heath" (`license.txt` at `v2.3.0`) | managed DLL, Windows build only | none → `licenses/naudio.MIT.txt` | the text — ADDED (CRLF changed to LF) |
| **Ixian-Core** | commit `097341ac` (the pinned sibling) | MIT, "Copyright (c) 2019 Ixian" (`LICENSE` of the sibling; the same bytes as this repo's `LICENSE`); 133 of the 140 compiled files carry an Ixian header, the rest and the third-party material in them are the next six rows | compiled into the app (`IXICore.projitems`) | none → `licenses/ixian-core.MIT.txt` | the text — ADDED |
| **BigInteger class** (Chew Keong TAN) — `Ixian-Core/Crypto/BigInteger.cs` | "BigInteger Class Version 1.03" (file header); no upstream URL (the last header line is a CodeProject address), no upstream copy found | a permission notice in the file's own header: "Copyright (c) 2002 Chew Keong TAN. All rights reserved. Permission is hereby granted, free of charge, … provided that the above copyright notice(s) and this permission notice appear in all copies of the Software and that both the above copyright notice(s) and this permission notice appear in supporting documentation"; no SPDX name is stated | compiled into the app (`IXICore.projitems:21`) | none → `licenses/bigint-chewkeong.file-header-notice.txt` | the header text — ADDED (lines 1-37 of the file at `097341ac`; there is no upstream URL — the text is the file's own) |
| **Crc32.NET** (force-net) — `Ixian-Core/Crypto/ForceCRC32/` (4 files) | v1.2.0 (commit `ebdc2861`): `Crc32Algorithm.cs`, `Crc32CAlgorithm.cs`, `SafeProxyC.cs` equal that tag apart from an added header comment and a trailing newline; `SafeProxy.cs` differs in 17 diff lines (changed expressions); v1.1.0 / v2.0.0 / master differ more | MIT, "Copyright (c) 2016 force" (`LICENSE`, the same bytes at v1.1.0, v1.2.0, v2.0.0 and master; the MIT text is also inside `Crc32Algorithm.cs` and `Crc32CAlgorithm.cs`) | compiled into the app (`IXICore.projitems:26-29`) | a "Code copied from https://github.com/force-net/Crc32.NET" comment (and the MIT text in 2 of the 4 files) → `licenses/crc32-net.MIT.txt` | the text — ADDED |
| **Base58Check encoding** (adamcaudill) — `Ixian-Core/Utils/Base58CheckEncoding.cs` | not stated; the file says "Code received and adapted from https://github.com/adamcaudill/Base58Check/blob/master/src/Base58Check/Base58CheckEncoding.cs" | **UNPROVEN — question for Damir:** the repository is not reachable from the build machine (`git clone` fails, the raw URLs return 404), so its licence is not read; the file's own header is Ixian's MIT header and names no other licence | compiled into the app (`IXICore.projitems:133`) | the source URL in a comment | no text can be shipped (options in the report) |
| **BIP-39 wordlists** (bitcoin/bips) — `Ixian-Core/Utils/WordlistSources.cs` | six lists of 2048 words (chinese_simplified, chinese_traditional, english, japanese, spanish, french), each equal to the file of `bip-0039/` at `bitcoin/bips` `a7f91321`; the file names no source, `Utils/Mnemonics.cs:146` names the BIP | `bip-0039.mediawiki`: "License: MIT" and "This BIP falls under the MIT License."; the BIP holds no MIT text and no copyright line (it lists four authors), `bip-0039-wordlists.md` states no licence, and the root of the repository at that commit has no `LICENSE` | compiled into the app (`IXICore.projitems:148`) | none → `licenses/bip39-wordlists.BIP-MIT-statement.txt` | the statement — ADDED (lines 1-26 of `bip-0039.mediawiki` at `a7f91321`); **UNPROVEN — question for Damir:** whether the wordlist files carry that statement too (it is stated for the BIP) |
| **NBitcoin code** (MetacoSA/NBitcoin) in Ixian-Core: `Utils/Wordlist.cs`, `Utils/KDTable.cs`, `Utils/WordlistSources.cs` (class `HardcodedWordlistSource`), `Utils/Mnemonics.cs`, `Utils/BitWriter.cs` | **UNPROVEN — question for Damir:** the NBitcoin version is not stated (the files carry an Ixian header and no marker). Closest blob in the NBitcoin history, Ixian lines shared / unique lines: `Wordlist.cs` 192/216 with `bdac4b64` (2020-01-16), `KDTable.cs` 38/52 and `BitWriter.cs` 109/119 with `a615d201` (2019-08-19), `WordlistSources.cs` 17/29 with `8ee8441f` (2021-06-21, `IWordlistSource.cs`), `Mnemonics.cs` 96/177 with `689fee7a` (2016-08-24, `Mnemonic.cs`); against the NBitcoin tree at `9b4ecc0e` 89/91, 68/88, 40/47, 17/17, 14/16 long lines. The StackOverflow comment of `Mnemonics.cs:314` is in NBitcoin's `Mnemonic.cs` (line 234 at `689fee7a`, line 216 at `9b4ecc0e`) | MIT, as the `LICENSE` of `MetacoSA/NBitcoin` states it. The copyright line differs by version: "Copyright (c) 2014 Nicolas Dorier" (2014-08), "2014 Metaco SA" (2015-08), "2019 Metaco SA" (2019-08, `1348e841`), "2021 / 2022 / 2023 Metaco SA" later; the versions from `660743e8` to `75efb082` differ from `1348e841` only in the copyright line, `e881f0d4` also lacks the final newline; before 2014-08 the `LICENSE` was the LGPL v3 | compiled into the app (`IXICore.projitems`) | none → `licenses/nbitcoin.MIT.txt` | the text — ADDED (`LICENSE` at `1348e841`, the one in force at the closest `Wordlist.cs` blob; CRLF changed to LF); **UNPROVEN — question for Damir:** the version, hence the copyright line |

**Not shipped (rows removed):** qrcodejs (davidshimjs) `js/qrcode.min.js`, jQuery `js/jquery.min.js`, Bootstrap `css/bootstrap.min.css` +
`js/bootstrap.min.js`, clipboard.js `js/clipboard.min.js`, Font Awesome `libs/fontawesome/**` and `css/normalize.css` are in the fork point
`0e85a4b8` and absent from `Raw/html` now (the folder holds 40 files; `js/` holds only `html5-qrcode.min.js`; the shipped files
contain no jQuery, Bootstrap or qrcodejs text; the word "clipboard.js" in them is our own module `src/components/clipboard.js`).
**Source Sans 3** (`src/assets/fonts/source-sans-3-latin-wght-normal.woff2`) is not shipped: no data: URL of any shipped file
matches its SHA-256, and `spixi.base.css` says "Source Sans 3 RETIRED (#226)". The four retired illustration files of
`src/assets/images/` and the pattern doodles are in the doodle row above.

---

## Notices

Each section names the text files in `Spixi/Resources/Raw/licenses/` (the first 16 hex of the SHA-256 of the upstream
bytes; the full value is in the file header). The text itself is in the file, not repeated here — except Tabler's, kept
from the first version of this doc.

### html5-qrcode — Apache License 2.0

Copyright [2020] [MINHAZ <minhazav@gmail.com>] (the appendix of the package `LICENSE`). Licensed under the Apache License,
Version 2.0; a copy is `licenses/html5-qrcode.Apache-2.0.txt` (`306bc450da41244f`); the licence is also at
http://www.apache.org/licenses/LICENSE-2.0. The shipped file is the library as published (npm 2.3.8), unmodified.

### ZXing code inside html5-qrcode — MIT and Apache License 2.0

`js/html5-qrcode.min.js` holds a minified build of ZXing for JS (the decoder html5-qrcode names in its README). Texts:
`licenses/zxing-js.MIT.txt` (`4c26c3077daa7ce4`, "Copyright (c) 2018 ZXing for JS", npm `@zxing/library@0.18.3`, the nearest
version) and `licenses/zxing.Apache-2.0.txt` (`3f62881f0566227a`; the source headers read "Copyright 2007 … 2013 ZXing
authors. Licensed under the Apache License, Version 2.0"). **UNPROVEN — question for Damir:** the exact zxing-js version inside
the minified file (the repo `LICENSE` is the MIT text at `v0.17.1`, `v0.18.3`, `v0.19.1` and the Apache-2.0 text at `v0.20.0`, `v0.21.0`).

### OpenJDK classes inside html5-qrcode — GPL-2.0 with the Classpath Exception

The umd source of ZXing that html5-qrcode carries holds ports of `java.io.OutputStream` and `ByteArrayOutputStream` with the
header "Copyright (c) 1994, 2004 / 2010, Oracle … GNU General Public License version 2 only … Classpath exception"; the
minified `js/html5-qrcode.min.js` holds the `ByteArrayOutputStream` class without that header. Text:
`licenses/openjdk.GPL-2.0-Classpath-exception.txt` (`4b9abebc4338048a`, `openjdk/jdk8u` at `jdk8u202-ga`). **UNPROVEN —
question for Damir:** the JDK version of the ported code.

### qrcode-generator — MIT

Copyright (c) 2009 Kazuhiko Arase (http://www.d-project.com/). Licensed under the MIT license. The vendored body in
`src/components/qr.js` is wrapped in a module-scope IIFE and the UMD tail is dropped; the code lines equal `qrcode.js` of
qrcode-generator 1.4.4 / 1.5.0 / 1.5.2. 'QR Code' is a registered trademark of DENSO WAVE INCORPORATED (the banner says so).
Text: `licenses/qrcode-generator.MIT.txt` (`3a850fa5f08101db`).

### Sora — SIL Open Font License 1.1

Sora © 2019 The Sora Project Authors (github.com/sora-xor/sora-font), version 2.000. Licensed under the
SIL Open Font License, Version 1.1 (https://openfontlicense.org). The fonts are embedded in the app as data: URLs. Text: `licenses/sora.OFL-1.1.txt` (`1ec9623d38c445eb`); the same bytes are `src/assets/fonts/SORA-OFL.txt`.

### Tabler Icons — MIT

**UNPROVEN — question for Damir:** the Tabler version of the exported glyphs (the `LICENSE` differs between versions only in the copyright line). Text also at `licenses/tabler-icons.MIT.txt` (`5a3b65e1ad6a0817`, tabler-icons `v3.35.0`).

```
MIT License

Copyright (c) 2020-2025 Paweł Kuna

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Twemoji Country Flags — CC-BY 4.0

The flag glyphs in `TwemojiCountryFlags.woff2` are the Twemoji emoji artwork
(https://twemoji.twitter.com, Copyright 2019 Twitter, Inc and other contributors),
licensed under the Creative Commons Attribution 4.0 International License
(https://creativecommons.org/licenses/by/4.0/). Changes: the artwork is used as a font
— Mozilla's `twemoji-colr` build (the shipped file's internal family name is "Twemoji
Mozilla", "Version 0.6.0") — subset to the country and sub-national flags by TalkJS as
`country-flag-emoji-polyfill` 0.1.10 (MIT for the build; https://github.com/talkjs/country-flag-emoji-polyfill).
Spixi ships the subset unmodified, as a base64 data: URL inside `fonts/TwemojiCountryFlags.js`,
and loads it only on a platform whose system emoji font draws no flags; the in-app credit row
(Account → Contributors) carries the licence link and the word "subset". None of the polyfill's code ships.
Texts: `licenses/twemoji-country-flags.CC-BY-4.0.txt` (`8ae9438818c26e48`, the CC BY 4.0 legal code, `LICENSE-GRAPHICS` of
twitter/twemoji at `bad3bcee`) and `licenses/country-flag-emoji-polyfill.MIT.txt` (`c0faf8bdf2c30202`, the package's
`LICENSE.md`, which states the MIT part and the CC-BY part).

### Open Sans — Apache License 2.0

Open Sans 1.10, "Digitized data copyright © 2010-2011, Google Corporation" (the font's name table), licensed under the Apache
License, Version 2.0 (name table, http://www.apache.org/licenses/LICENSE-2.0). Text: `licenses/open-sans.Apache-2.0.txt`
(`3ddf9be5c28fe27d`).

### UI SFX sounds — CC0 1.0

Interface sounds from UI SFX (uisfx.com, npm `uisfx@0.4.0`; audio "dedicated to the public domain under the Creative Commons
CC0 1.0 Universal Public Domain Dedication"). Text of the statement: `licenses/uisfx.CC0-1.0.txt` (`e0ba86134c566659`).
The in-app credit row names the source.

### Call tones — UNPROVEN

`busy_tone.mp3`, `default_ringtone.mp3`, `dialing_tone.mp3`, `error_tone.mp3` (all in the fork point, added 2024-09-13 at `fdc09aad`) carry no
tag, copyright or licence line. The repo's only record of their origin is `DECISIONS` N84 (Damir, 2026-08-25): "they were synthesized
by AI, entirely made up". **UNPROVEN — question for Damir.** No text ships for them.

### Spixi's own files

Everything in `Raw/html` that no row above names, the generated sheets, the flag PNGs (by `flags.js:23`), the chat pattern and
the logo are our own. This repo's `LICENSE` is MIT, "Copyright (c) 2019 Ixian". The doodle SVGs of `src/assets/images/` are
the one OPEN origin (table above) and do not ship.

### RocksDbSharp (vendored managed wrapper, Mac Catalyst only) — BSD-2-Clause

Copyright (c) 2015, Warren Falk, Copyright (c) 2022, Curiosity GmbH. All rights reserved.
Redistribution and use in source and binary forms, with or without modification, are
permitted provided that the conditions in `Spixi/Platforms/MacCatalyst/RocksDbSharp/LICENSE`
are met (retain the copyright notice, this list of conditions and the disclaimer). THIS
SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
IMPLIED WARRANTIES ARE DISCLAIMED. The source is `curiosity-ai/rocksdb-sharp` @ `f1cf0ba0`; the same text ships as
`licenses/rocksdbsharp.BSD-2-Clause.txt` (`d0bd8da8d0c720f8`) and is the text its nuspec names for the RocksDB 0.0.42 package (Android, iOS); `BinaryComparer.cs:94-103` of the vendored folder holds a MurmurHash3 C# statement (own row below); the other 42 files hold only the source line 2, `AutoNativeImport.cs` (own row) and a URL at `Native.cs:10`; no text here claims NuGet RocksDB 10.4.2.64152 (Windows), whose licence is UNPROVEN.

### AutoNativeImport — MIT

`AutoNativeImport.cs` (warrenfalk/auto-native-import; "License: MIT", "Author: Warren Falk"), carried in the vendored folder with
the Catalyst patch (#920). Text: `licenses/auto-native-import.MIT.txt` (`e81d18ef4f00e23f`, "Copyright (c) 2015 Warren Falk").

### RocksDB native library — Apache-2.0 or GPL-2.0

facebook/rocksdb states: "dual-licensed under both the GPLv2 (found in the COPYING file in the root directory) and Apache 2.0
License (found in the LICENSE.Apache file in the root directory). You may select, at your option, one of the above-listed
licenses." Texts: `licenses/rocksdb.Apache-2.0.txt` (`cfc7749b96f63bd3`), `licenses/rocksdb.GPL-2.0.txt`
(`8177f97513213526`), and for the LevelDB-derived code `licenses/rocksdb.LICENSE-leveldb.txt` (`b568f1f37a5a1d37`), all from
`facebook/rocksdb` at `3f51c0a1` (identical at `v10.4.2`). Which option Spixi takes is not stated in the repo.

### PerconaFT locktree in the RocksDB native binaries — GPL-2.0, AGPL-3.0 or Apache-2.0 by its header

The files of `utilities/transactions/lock/range/range_tree/lib/` in `facebook/rocksdb` (at `3f51c0a1`) are PerconaFT's locktree: "This
file is part of PerconaFT. Copyright (c) 2006, 2015, Percona and/or its affiliates. All rights reserved." The header offers the GNU
General Public License version 2, the GNU Affero General Public License version 3 and the Apache License 2.0, each in its own
paragraph. Texts: `licenses/perconaft.GPL-2.0.txt` (`ab15fd526bd8dd18`), `licenses/perconaft.AGPL-3.0.txt` (`57c8ff33c9c0cfc3`),
`licenses/perconaft.Apache-2.0.txt` (`81932e77fef4cec3`) and the header block `licenses/perconaft.PerconaFT-file-header.txt`
(`4cbc21904863d757`). **UNPROVEN — question for Damir:** which of the three Spixi takes; the repo states no choice.

### MurmurHash in the RocksDB native binaries — the file's own statement

`util/murmurhash.cc`: "Murmurhash from http://sites.google.com/site/murmurhash/ — All code is released to the public domain. For
business purposes, Murmurhash is under the MIT license." Text: `licenses/murmurhash.file-statement.txt` (`c25d33a5cc9bda70`). The
file holds no MIT text.

### MurmurHash3 C# variant in the vendored RocksDbSharp — the file's own statement

`Spixi/Platforms/MacCatalyst/RocksDbSharp/BinaryComparer.cs:94-103` (Elliott B. Edwards; algorithm Austin Appleby): "This code is public
domain.", "placed into the public domain as a gist". Text: `licenses/murmurhash3-csharp.file-statement.txt` (`45bf43ebadbe093f`). The file
holds no MIT text. The string `MurMurHash3` is also in `RocksDbSharp.dll` of `RocksDB.0.0.42.nupkg` (Android, iOS); its body was not read.

### TimerQueue in the RocksDB native binaries — CC0 by the file's own statement

`util/timer_queue.h`: "Borrowed from http://www.crazygaze.com/blog/2016/03/24/portable-c-timer-queue/ … licensed under the CC0
license". Text: `licenses/timer-queue.file-statement.txt` (`14e8f140988eb2ca`).

### LLVM libc++ and libc++abi in the Android binaries — Apache-2.0 with LLVM Exceptions

Statically linked into the 3 Android `librocksdb.so` (NDK r29). Texts: `licenses/llvm-libcxx.Apache-2.0-with-LLVM-exception.txt`
(`539dd7aed86e8a4f`) and `licenses/llvm-libcxxabi.Apache-2.0-with-LLVM-exception.txt` (`e2b35be49f7284a4`), `LICENSE.TXT` of
`llvm/llvm-project` at `llvmorg-21.1.0` (the same bytes at 19.1.0, 20.1.0 and `main`). **UNPROVEN — question for Damir:** the exact
LLVM version inside NDK r29.

LLVM libunwind (18 / 1 / 20 strings "libunwind: …" in the arm64 / armeabi-v7a / x86_64 `.so`; no `_Unwind*` export) and LLVM
compiler-rt (`__emutls_get_address`, exported weak) are found by the same scan (method item 4). Texts (review round 4):
`licenses/llvm-libunwind.Apache-2.0-with-LLVM-exception.txt` (`b5efebcaca808792`) and
`licenses/llvm-compiler-rt.Apache-2.0-with-LLVM-exception.txt` (`1a8f1058753f1ba8`), the `LICENSE.TXT` of `libunwind/` and of
`compiler-rt/` at `llvmorg-21.1.0`. **UNPROVEN — question for Damir:** the exact source of `__emutls_get_address` in this binary, and
the LLVM version of NDK r29.

### NBitcoin code in Ixian-Core — MIT

`Utils/Wordlist.cs`, `KDTable.cs`, `WordlistSources.cs` (`HardcodedWordlistSource`), `Mnemonics.cs`, `BitWriter.cs` of Ixian-Core hold
NBitcoin (MetacoSA) code, without a marker in the files. Text: `licenses/nbitcoin.MIT.txt` (`6524ffa12414a6b8`, "Copyright (c) 2019
Metaco SA", `LICENSE` at `1348e841`, CRLF changed to LF; LF body `f69675d12cfdfeb1`). **UNPROVEN — question for Damir:** which
NBitcoin version Ixian copied, hence which copyright line applies.

### LZ4 — BSD 2-Clause

LZ4 1.9.4, "Copyright (c) 2011-2020, Yann Collet", compiled into the RocksDB native binaries (Android `.so`, iOS `.a`). Text:
`licenses/lz4.BSD-2-Clause.txt` (`8b58c446121a109c`, `lib/LICENSE` of `lz4/lz4` at `v1.9.4`).

### xxHash — BSD 2-Clause

Five header blocks in the same binaries: RocksDB's own xxHash 0.8.1, "Copyright (C) 2012-2021 Yann Collet" (`licenses/xxhash.BSD-2-Clause.txt`,
`16b36aa535c9275f`, lines 26-59 of `util/xxhash.h` at `3f51c0a1`), and lz4's xxHash 0.6.5, "Copyright (C) 2012-2016, Yann Collet"
(`licenses/xxhash-lz4.BSD-2-Clause.txt`, `df5443d0097b2fa4`, lines 1-33 of `lib/xxhash.c` at `v1.9.4`), and the block of RocksDB's
`util/xxhash.cc`, "Copyright (C) 2012-2020 Yann Collet" (`licenses/xxhash-rocksdb-cc.BSD-2-Clause.txt`, `98c7c424d8f6ca2b`), and the two blocks of RocksDB's `util/xxph3.h`
(XXH3 preview, included by `util/hash.cc`): lines 5-37, "Copyright (C) 2012-2016, Yann Collet." (`licenses/xxhash-xxph3-a.BSD-2-Clause.txt`,
`07ab483e553e0d2e`) and lines 656-688, "Copyright (C) 2019-present, Yann Collet." (`licenses/xxhash-xxph3-b.BSD-2-Clause.txt`, `0a86195088138f20`).

### BigInteger (Chew Keong TAN) in Ixian-Core — permission notice of the file header

`Ixian-Core/Crypto/BigInteger.cs`, "BigInteger Class Version 1.03", "Copyright (c) 2002 Chew Keong TAN". The file's own header is the
text (lines 1-37, with its disclaimer); no upstream URL is stated. Text: `licenses/bigint-chewkeong.file-header-notice.txt`
(`e3c467e5b07fd3e6`).

### Crc32.NET in Ixian-Core — MIT

`Ixian-Core/Crypto/ForceCRC32/*.cs`, copied from https://github.com/force-net/Crc32.NET (v1.2.0), "Copyright (c) 2016 force". Text:
`licenses/crc32-net.MIT.txt` (`b949e50a72aa5443`). `ForceCRC32/SafeProxy.cs:3` (the same line is in Crc32.NET v1.2.0
`SafeProxy.cs:2`) says "It based on Robert Vazan native implementations of Crc32C"; `robertvazan/crc32c.net` states
"BSD 3-Clause License, Copyright (c) 2014-2021, Robert Važan" at master; its `SafeProxy.cs` names "Max Vysokikh, 2016" (the
Crc32.NET author). **UNPROVEN — question for Damir:** whether code of Robert Važan's crc32c is in these files (review round 5).

### Base58Check in Ixian-Core — UNPROVEN

`Ixian-Core/Utils/Base58CheckEncoding.cs` says "Code received and adapted from https://github.com/adamcaudill/Base58Check". The
repository could not be read, so its licence is not stated here. **UNPROVEN — question for Damir.** No text ships for it.

### BIP-39 wordlists in Ixian-Core — MIT, by the statement of the BIP

Six BIP-39 wordlists (bitcoin/bips) in `Ixian-Core/Utils/WordlistSources.cs`. The BIP states "License: MIT" and "This BIP falls under
the MIT License." and lists its authors (Marek Palatinus, Pavol Rusnak, Aaron Voisine, Sean Bowe); it holds no MIT text and no
copyright line. Text: `licenses/bip39-wordlists.BIP-MIT-statement.txt` (`743429fb77d4463a`, lines 1-26 of `bip-0039.mediawiki` at `a7f91321`).
**UNPROVEN — question for Damir:** whether the wordlist files carry the same statement.

### OneSignal native SDKs — Modified MIT License

The native SDKs bound by OneSignalSDK.DotNet 6.1.9 (versions.json of its repo at that tag: Android 5.9.3, iOS 5.5.2 — the published
package itself could not be read). Their `LICENSE` is headed "Modified MIT License" and adds the condition "All copies of
substantial portions of the Software may only be used in connection with services provided by OneSignal."; the Android text also
names portions from the Google GcmClient demo project (Apache-2.0), RootTools (Apache-2.0 or GPL-2.0) and ShortcutBadger. Texts:
`licenses/onesignal-android-sdk.Modified-MIT.txt` (`b6d14ab532a41399`, `OneSignal-Android-SDK` at `5.9.3`) and
`licenses/onesignal-ios-sdk.Modified-MIT.txt` (`47d6dfd1bc95b8ec`, `OneSignal-iOS-SDK` at `5.5.2`). **UNPROVEN — question for
Damir:** the native versions inside the published package.

### BouncyCastle.Cryptography — MIT

2.6.2, "Copyright (c) 2000-2025 The Legion of the Bouncy Castle Inc." Text: `licenses/bouncycastle.MIT.txt` (`eb52875c9b7de827`).

### CommunityToolkit.Maui — MIT

14.2.0, "Copyright (c) .NET Foundation and Contributors". Text: `licenses/communitytoolkit-maui.MIT.txt` (`9b6052c88978ec16`).

### Microsoft.Maui.Controls — MIT

Microsoft.Maui.Controls and Microsoft.Maui.Controls.Compatibility 10.0.71, "Copyright (c) .NET Foundation and Contributors".
Text: `licenses/maui.MIT.txt` (`cfc21f5e8bd655ae`). Fact: `Spixi/Platforms/iOS/MauiFilePicker.cs:3` (our file, no copyright line) says
"Based on official .NET MAUI code, adapted for iOS-specific requirements including:".

### Concentus — BSD-style licence

2.2.2; the package's own `LICENSE` file (three conditions; copyright holders listed in the file). Text:
`licenses/concentus.LICENSE.txt` (`4e007268b8ff3101`).

### Mono.Nat — MIT

3.0.4, "Copyright (C) 2006 Alan McGovern". Text: `licenses/mono-nat.MIT.txt` (`b02c6471cfd0a93e`).

### Newtonsoft.Json — MIT

13.0.4, "Copyright (c) 2007 James Newton-King". Text: `licenses/newtonsoft-json.MIT.txt` (`d7f83bbea3264a8e`).

### OneSignalSDK.DotNet — MIT

6.1.9, "Copyright (c) 2022 OneSignal". Text: `licenses/onesignal-dotnet.MIT.txt` (`f8df8a11ee6f1733`).

### Plugin.Fingerprint — MS-PL

3.0.0-beta.1, Microsoft Public License, "Copyright (c) Sven-Michael Stübe". Text: `licenses/plugin-fingerprint.MS-PL.txt`
(`d7f63d38bf8e5caf`).

### NAudio — MIT

2.3.0 (Windows build only), "Copyright 2020 Mark Heath". Text: `licenses/naudio.MIT.txt` (`303e01786b271eb4`, CRLF changed to LF).

### Ixian-Core — MIT

The sibling repository compiled into the app (pinned commit `097341ac`), "Copyright (c) 2019 Ixian". Text:
`licenses/ixian-core.MIT.txt` (`824bd7e08d1cefbc`).
