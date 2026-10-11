# P19 · AVATARS · Avatars and group photo

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| MED — peer image bytes are decoded in C# (legacy), and our pushes carry them into WebViews that render untrusted content | no | yes | shipped | 6 min |

**Look here first:** `Spixi/Network/StreamProcessor.cs:684` — `SFilePicker.ResizeImage` decodes a peer's avatar bytes. The only check is size (< 500 000 B, `:682`): no magic-byte sniff. On Android (the only platform verified) it is a full in-process decode in the app that holds the keys (`BitmapFactory.DecodeByteArray`, `Spixi/Platforms/Android/SFilePicker.cs:209`); iOS / Mac / Windows have their own `ResizeImage`, not checked. This line is legacy. Our owner gate is at `:677`, directly above it.

**DECISIONS:** #213 · #217 · #265 · #1086 · #1121 · #1166 · #1191 · #1231 · #1240 · #1254 · #1303

## What changed and why
- Avatars now reach the WebView as base64 `data:` URIs. C# makes them from its own avatar files; before, the WebView got a file path. The `?t=` cache-buster is cut before the read (X1 = the avatar data-URI push, #217, #1086).
- The chats list and each chat send a photo once per address per document (`setAvatarFor`); the rows carry "" (#1166). An open group shows a member's new avatar at once (#1191).
- The group photo is picked in a native picker: at group creation (`ixian:groupavatar`, #265), or by the owner in chat info (`ixian:groupPhoto`). A group-addressed avatar is stored only when the owner sent it; before, any member could replace it (#1231).
- New pushes carry my own avatar and nick into my chat (#1240, #213) and the sender faces into Downloads (#1254).
- The decode of a peer avatar is unchanged. The sniff and the bounded decode of contact-image thumbnails (G-6b, #1121) do not cover this path.

## Files (verified at 387ca78b)
- `Spixi/Network/StreamProcessor.cs:677` — `GroupAvatarRule.accept` runs first. A non-owner group picture is dropped before `FriendList.setAvatar` (`:685`).
- `Spixi/Utils/GroupAvatarRule.cs:23` — a non-group friend is accepted. In a group, the sender must equal the roster owner. A null or empty sender OR owner fails closed (`:29`).
- `Spixi/Utils/Utils.cs:139` — `imageToDataUri` reads only a C# path. The MIME comes from the file extension (`:172`; Core names every avatar `.jpg`). The whole file is base64-encoded (`:175`). The cache holds ≤ 128 entries (`:136`).
- `Spixi/Utils/ChatsListRules.cs:130` — `AvatarLedger.rowArg`: one push per address, and again only on a change. It keeps length + hash, never the URI.
- `Spixi/Pages/Contacts/ContactDetails.xaml.cs:1261` — `groupPhoto`: owner check (again at `:1305`). A picture ≥ 500 000 B is refused (`:1294`). Stored at `:1310`, then `sendAvatar` to each member who is a contact.
- `Spixi/Pages/Home/HomePage.xaml.cs:2495` — `groupavatar`: native picker, re-encoded to 960 px, written to the C#-named `Avatars/avatar-tmp.jpg` (`:2472`). Promoted at group creation (`:2576`).
- `Spixi/Pages/Contacts/ContactDetails.xaml.cs:1376` — the chat-info hero reads the FULL-size file (`thumb=false`): the raw peer bytes, not the 128 px copy that C# re-encoded. It is pushed every second (`:1383`).
- `src/shells/home.html:2193` · `src/shells/chat.html:1849` — `AVATAR_URI_RE`: only base64 png, jpeg, webp or gif `data:` URIs are kept.

## Bridge surface
| Verb / push | Args (shape) | Who can send it | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| `setAvatarFor` | `<addr b58>, <data:image/jpeg;base64,…>\|""` | C# → `index.html` (HomePage, untrusted list) · `chat.html` (SingleChatPage) | `HomePage.xaml.cs:3821` / `:3825` · `SingleChatPage.xaml.cs:5864` | ours |
| `setAvatar` (chat-info hero) | `<data: URI>` of the full-size file (was a path) | C# → `contact_details.html` (untrusted) | `ContactDetails.xaml.cs:1383` | reshaped (X1 data-URI push) |
| `setSelfAvatar` · `setSelfNick` | `<data:image/jpeg 128 px>\|""` · `<my nick>` | C# → `chat.html` | `SingleChatPage.xaml.cs:7973` · `:1447` | ours |
| `loadGroupAvatar` | `<data: URI>\|""` (my own pick) | C# → `index.html` | `HomePage.xaml.cs:2521` | ours |
| `setDownloadAvatars` | `<json [[s<n>, data: png\|jpeg\|webp]]>`, ≤ 200 000 chars each | C# → `settings.html` | `SettingsPage.xaml.cs:1910` | ours |
| `ixian:groupavatar` | none | `home.html`→`index.html`, HomePage | `HomePage.xaml.cs:1088` | ours |
| `ixian:groupPhoto` | none | `contact_details.html`, ContactDetails (untrusted) | `ContactDetails.xaml.cs:603` → `:1259` | ours |
A mini-app cannot raise either verb (`MiniAppPage.xaml.cs:148`: its own verbs plus `onNavigatingGlobal`). Push encoding (O-11) is covered in the P14 `transport`. `addMember`'s avatar argument is listed in P09 `contacts`.

## Threat → rule → proof
| A hostile … could try… | What stops it (`file:line`) | Proof |
|---|---|---|
| peer: sends an SVG or HTML file as its avatar | Core stores it as `<addr>.jpg`. C# labels it `image/jpeg` (`Utils.cs:172`). The shells keep only base64 png/jpeg/webp/gif (`home.html:2193`, `chat.html:1849`) | pin `pins-s5/home.mjs` `★★ #1166 P-04 (shell): … only a base64 PNG/JPEG/WebP/GIF data URI is kept (svg / javascript: / a broken body ignor…` · csh `S10FixTests.avatar_uri_only_png_jpeg_webp_data_uris_within_the_cap` |
| group member: replaces the group photo | `StreamProcessor.cs:677` (owner only, fails closed) | csh `S8RulesTests.group_avatar_only_from_the_owner` · pin `pins-s8/cs-wiring.mjs` `S8 G1 owner-only avatar: …` |
| peer: a decoder bug or a pixel bomb under 500 000 B | The size cap only (`StreamProcessor.cs:682`). Full in-process decode on Android (other platforms not checked) | no proof — legacy, inherited |
| peer or WebView: chooses a file name or path | Core names the file from the address (Core `Streaming/Storage/LocalStorage.cs:821`). No verb takes a path. The temp file is C#-named (`HomePage.xaml.cs:2472`) | pin `pins-s8/cs-wiring.mjs` `S8 G3 group photo: owner check, … no WebView data, no file path (#1231)` |
| compromised chat-info WebView: `groupPhoto` as a non-owner | `ContactDetails.xaml.cs:1261`. Even as owner it only opens the native picker | same G3 pin (mutation-checked) |
| compromised chat WebView: gets member faces in a blind room | Member push only for a known contact or a roster member outside blind rooms (`SingleChatPage.xaml.cs:1380`) | pin `pins-s6/live.mjs` `★★ #1191 C# shape: StreamProcessor case avatar re-pushes …` |

## Given up / left open
- The peer avatar decode is the legacy, unbounded decode, with no `ImageSniff`. Only the G-6b thumbnails, the viewer and chat previews sniff (`SharedItems.cs:195`, `ViewerRules.cs:69`, `SingleChatPage.xaml.cs:7255`; #1121).
- The chat-info hero receives up to ~667 KB of base64 raw peer bytes every second (`ContactDetails.xaml.cs:1383`). The read is cached by mtime. Legacy pushed the path, so the renderer decoded the same bytes either way.
- A group photo sent to an offline member can be replaced in Core's pending queue, which uses the fixed id {6}. This is a BE ask (#1231).

## Question for BE
Should the avatar receive (`StreamProcessor.cs:684`) get the same `ImageSniff` + bounded decode as the G-6b thumbnails, or do you keep it as legacy?
