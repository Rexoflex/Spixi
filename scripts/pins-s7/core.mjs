/* ==== SESSION 7 — agent A: the C# receive seams of #1207 (the capability ask) · #1208 (voice messages) ====
 * The pure rules (VoiceCodec, SpixiProtocols, ReplyQuote, EditRules) are EXECUTED in scripts/csh (VoiceCodecTests.cs,
 * SpixiProtocolsTests.cs, ReplyQuoteTests.cs, EditRulesTests.cs). The call sites below are MAUI-bound and compile nowhere
 * here, so they are pinned on comment-stripped source (stripCode keeps string literals): each pin names the seam and the
 * failure it prevents. The lang files are read as data.
 * Deliberate breaks (#802) — each fails exactly the named pin (recorded in the session report):
 *   HomePage: the voice block's `tryPeekInline` → `tryParseInline` (a decode per row)          → #1208 chats-row excerpt
 *   HomePage: the voice-file `excerptKind = "text"` dropped                                      → #1208 chats-row voice file
 *   Node: `notifText` + `friend_message.message`                                                 → #1208 notification
 *   StreamProcessor: the voice guard's `return null;` dropped                                    → #1208 edit guard
 *   SharedItems: the voice `continue;` dropped                                                   → #1208 links
 *   lang: de-de chat-voice-message removed                                                       → #1208 strings
 *   VoiceCodec: `using IXICore;` added                                                           → #1208 pure codec
 *   csh.csproj: the VoiceCodec.cs include removed                                                → #1208 executed
 *   (#46 r1) HomePage: the text excerpt's `VoiceCodec.rendersAsVoice(friend.bot) &&` dropped      → #1208 chats-row excerpt
 *   (#46 r1) HomePage: the file excerpt's `VoiceCodec.rendersAsVoice(friend.bot) &&` dropped      → #1208 chats-row voice file
 *   (#46 r1) StreamProcessor: the combined-chunk clause `|| (csm.IsStream && …)` dropped           → #1208 edit guard
 *   (#46 r2) HomePage: "chat-voice-message-length" → "chat-voice-message"                         → #1208 chats-row excerpt
 *   (#46 r2) Node: "chat-voice-message-length" → "chat-voice-message" in voiceNotificationText     → #1208 notification
 *   (#46 r2) lang: ja-jp chat-voice-message-length "（{0}）" → "({0})"                               → #1208 strings */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, join } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const guard = async (name, fn) => { try { await fn(); } catch (e) { ok(false, name + ' — threw: ' + (e && e.message)); } };

  /* the body of the FIRST member whose header matches `head`, by brace depth on stripped source (literals skipped) */
  const bodyOf = (sc, head, from = 0) => {
    const at = sc.indexOf(head, from);
    if (at < 0) return '';
    let i = sc.indexOf('{', at);
    if (i < 0) return '';
    const start = i;
    let depth = 0;
    for (; i < sc.length; i++) {
      const c = sc[i];
      if (c === '"' || c === "'") {
        for (i++; i < sc.length && sc[i] !== c; i++) { if (sc[i] === '\\') i++; }
        continue;
      }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return sc.slice(start, i + 1); }
    }
    return '';
  };

  const HOME = stripCode(rd('Spixi/Pages/Home/HomePage.xaml.cs'));
  const NODE = stripCode(rd('Spixi/Meta/Node.cs'));
  const SP = stripCode(rd('Spixi/Network/StreamProcessor.cs'));
  const SI = stripCode(rd('Spixi/Utils/SharedItems.cs'));
  const helper = bodyOf(HOME, 'private FriendMessageHelper? getFriendMessageHelper(Friend friend, out string excerptKind, out string excerptSender)');

  /* ———— #1208: the chats-row excerpt of an inline voice text = the localized label + M:SS (peek, no decode, never the base64) ———— */
  await guard('#1208 chats-row excerpt', async () => {
    const strip = helper.search(/excerpt\s*=\s*ReplyQuote\.stripForExcerpt\(excerpt\);\s*\}/);
    const voice = helper.search(/if\s*\(\s*lastmsg\.type\s*==\s*FriendMessageType\.standard\s*&&\s*VoiceCodec\.rendersAsVoice\(friend\.bot\)\s*&&\s*VoiceCodec\.tryPeekInline\(lastmsg\.message,\s*out int voiceMs\)\s*\)\s*\{\s*excerpt\s*=\s*"🎤 "\s*\+\s*VoiceCodec\.lengthLabel\(SpixiLocalization\._SL\("chat-voice-message-length"\),\s*voiceMs\);\s*\}/);
    const state = helper.indexOf('if (friend.state != FriendState.Approved)');
    const noDecode = !/tryParseInline|tryDemuxOgg|FromBase64/.test(helper);
    /* ★ lead (#46 r1): in a bot room the excerpt is the row's plain FIRST line — never the marker / base64 */
    const botFirst = /\}\s*else if\s*\(\s*lastmsg\.type\s*==\s*FriendMessageType\.standard\s*&&\s*VoiceCodec\.tryPeekInline\(lastmsg\.message,\s*out _\)\s*\)\s*\{\s*excerpt\s*=\s*VoiceCodec\.firstLine\(lastmsg\.message\);/.test(helper);
    ok(helper.length > 0 && strip >= 0 && voice > strip && state > voice && noDecode && botFirst,
      '#1208 C#: HomePage.getFriendMessageHelper — after the #1198 quote strip and before the per-kind branches, a standard last message that VoiceCodec.tryPeekInline accepts reads "🎤 " + _SL("chat-voice-message") (?? English) + " (M:SS)" — only when VoiceCodec.rendersAsVoice(friend.bot) (#46 r1 §7: a bot room keeps the old excerpt, like its row) — the shape only (no decode on the 1 Hz row path), the base64 never reaches the row — '
      + JSON.stringify({ helper: helper.length > 0, strip, voice, state, noDecode, botFirst }));
  });

  /* ———— #1208: a voice FILE row reads "🎤 Voice message" with kind text (the name rule + the size cap, as the chat's V3) ———— */
  await guard('#1208 chats-row voice file', async () => {
    const at = helper.indexOf('else if (lastmsg.type == FriendMessageType.fileHeader)');
    const fb = at >= 0 ? bodyOf(helper, 'else if (lastmsg.type == FriendMessageType.fileHeader)') : '';
    const rule = /excerpt\s*=\s*SpixiLocalization\._SL\("index-excerpt-file"\);\s*excerptKind\s*=\s*"file";\s*if\s*\(\s*VoiceCodec\.rendersAsVoice\(friend\.bot\)\s*&&\s*SharedItems\.parseFileHeader\(lastmsg\.message,\s*out string voiceName,\s*out ulong voiceSize\)\s*&&\s*VoiceCodec\.isVoiceFileName\(voiceName\)\s*&&\s*\(\(voiceSize\s*!=\s*0\s*\?\s*voiceSize\s*:\s*lastmsg\.fileSize\)\s*<=\s*\(ulong\)VoiceCodec\.MaxOggBytes\)\s*\)\s*\{\s*excerpt\s*=\s*"🎤 "\s*\+\s*\(SpixiLocalization\._SL\("chat-voice-message"\)\s*\?\?\s*"Voice message"\);\s*excerptKind\s*=\s*"text";\s*\}/.test(fb);
    ok(at >= 0 && rule,
      '#1208 C#: HomePage.getFriendMessageHelper — a fileHeader (not in a bot room: rendersAsVoice(friend.bot), #46 r1 §7) whose name is VoiceCodec.isVoiceFileName and whose size is unknown (0) or ≤ MaxOggBytes reads "🎤 " + _SL("chat-voice-message") with excerptKind "text" (no paperclip beside the mic); any other file keeps "File" / kind file — '
      + JSON.stringify({ branch: at >= 0, rule }));
  });

  /* ———— #1208: the notification body stays a per-type label — message TEXT (a voice base64 too) never reaches it (NOTIF-2) ———— */
  await guard('#1208 notification', async () => {
    const m = bodyOf(NODE, 'public static FriendMessage? addMessageWithType(FriendMessageType type, Address wallet_address, int channel, ChatStreamMessage chat_stream_message');
    const decl = /string notifText\s*=\s*type\s*==\s*FriendMessageType\.fileHeader\s*\?\s*\(voiceFileNotificationText\(friend,\s*friend_message\)\s*\?\?\s*fileOfferNotificationText\(friend,\s*friend_message,\s*sender_address\)\)\s*:\s*voiceNotificationText\(friend,\s*type,\s*friend_message\)\s*\?\?\s*notificationTextForType\(type\);/.test(m);
    /* ★ lead (Damir #1208: the notification reads "🎤 Voice message (0:12)"): the voice label reads the marker line through
       the bounded PEEK only — the length, never the text — and returns null for a non-voice / bot-room message */
    const vfn = bodyOf(NODE, 'private static string? voiceNotificationText(Friend friend, FriendMessageType type, FriendMessage? friend_message)');
    const vOk = vfn.length > 0 && /type != FriendMessageType\.standard/.test(vfn) && /!VoiceCodec\.rendersAsVoice\(friend\.bot\)/.test(vfn)
      && /!VoiceCodec\.tryPeekInline\(friend_message\.message, out int durMs\)/.test(vfn)
      && (vfn.match(/friend_message\.message/g) || []).length === 1 && !/tryParseInline|tryDemuxOgg/.test(vfn)
      && /return "🎤 " \+ VoiceCodec\.lengthLabel\(SpixiLocalization\._SL\("chat-voice-message-length"\), durMs\);/.test(vfn);   /* ★ #46 r2: the localized template */
    /* ★ lead (#46 r1 A M5, contract §5): a voice FILE offer reads "🎤 Voice message" — the reply-excerpt rule (name + header
       size), not in a bot room; the name is only tested, never placed in the text */
    const ffn = bodyOf(NODE, 'private static string? voiceFileNotificationText(Friend friend, FriendMessage? friend_message)');
    const fOk = ffn.length > 0 && /!VoiceCodec\.rendersAsVoice\(friend\.bot\)/.test(ffn)
      && /ReplyQuote\.excerptOf\(FriendMessageType\.fileHeader, friend_message\.message, name, false\) != ReplyQuote\.VoiceFileExcerpt/.test(ffn)
      && /return "🎤 " \+ \(SpixiLocalization\._SL\("chat-voice-message"\) \?\? "Voice message"\);/.test(ffn) && (ffn.match(/\bname\b/g) || []).length === 2;
    const writes = (m.match(/notifText\s*(\+?=)[^;]*;/g) || []);
    const onlyName = writes.length === 2 && /notifText\s*=\s*senderName\s*\+\s*": "\s*\+\s*notifText;/.test(writes[1]);
    const noText = !writes.some((w) => /\.message\b|chat_stream_message|Message\b/.test(w));
    const typeFn = bodyOf(NODE, 'private static string notificationTextForType(FriendMessageType type)');
    const typeOnly = typeFn.length > 0 && !/message\b(?!")/.test(typeFn.replace(/"[^"]*"/g, '""'));
    ok(m.length > 0 && decl && vOk && fOk && onlyName && noText && typeOnly,
      '#1208 C#: Node.addMessageWithType — the notification text is notificationTextForType(type) or the #1178 file-offer copy, optionally prefixed with the sender name; no message text is ever added (an inline voice text notifies as "🎤 Voice message (0:12)" — the LENGTH from the bounded peek, its base64 never reaches the lock screen; a voice FILE uses the file-offer copy) — '
      + JSON.stringify({ body: m.length > 0, decl, vOk, fOk, writes: writes.length, onlyName, noText, typeOnly }));
  });

  /* ———— #1208: an edit never turns a row into or out of a voice message (the chatStream guard) ———— */
  await guard('#1208 edit guard', async () => {
    const cs = bodyOf(SP, 'case SpixiMessageCode.chatStream:');
    const g6b = cs.search(/UnreadRule\.isSystemLineId\(existing\.id\)\s*\)\s*\)\s*\)\s*\)\s*\{\s*Logging\.warn\([^;]*\);\s*sendReceivedConfirmation\(friend,\s*message\.id,\s*spixi_message\.channel\);\s*return null;\s*\}/);
    const g = cs.search(/if\s*\(\s*friend\s*!=\s*null\s*&&\s*!friend\.bot\s*&&\s*csm\.Sequence\s*>\s*0\s*&&\s*\(\s*\(\s*existing\s*!=\s*null\s*&&\s*VoiceCodec\.tryPeekInline\(existing\.message,\s*out _\)\s*\)\s*\|\|\s*\(\s*!csm\.IsStream\s*&&\s*VoiceCodec\.tryPeekInline\(csm\.Message,\s*out _\)\s*\)\s*\|\|\s*\(\s*csm\.IsStream\s*&&\s*existing\s*!=\s*null\s*&&\s*\(existing\.message\?\.Length\s*\?\?\s*0\)\s*\+\s*\(csm\.Message\?\.Length\s*\?\?\s*0\)\s*<=\s*VoiceCodec\.MaxTextChars\s*&&\s*VoiceCodec\.tryPeekInline\(existing\.message\s*\+\s*csm\.Message,\s*out _\)\s*\)\s*\)\s*\)\s*\{\s*sendReceivedConfirmation\(friend,\s*message\.id,\s*spixi_message\.channel\);\s*return null;\s*\}/);
    const add = cs.indexOf('Node.addMessageWithType(');
    const noLog = g >= 0 && !/Logging\./.test(cs.slice(g, cs.indexOf('return null;', g)));
    ok(cs.length > 0 && g6b >= 0 && g > g6b && add > g && noLog,
      '#1208 C#: StreamProcessor chatStream — after the #1199 belt and BEFORE Node.addMessageWithType, a non-bot replace / stream chunk (Sequence > 0) onto an inline voice row, or a replace whose NEW text is voice-shaped, or a stream chunk whose COMBINED text (existing + chunk — Core appends) would be (#46 r1 C MINOR-1; VoiceCodec.tryPeekInline), is dropped with the receipt and no log — '
      + JSON.stringify({ case: cs.length > 0, g6b, guard: g, add, noLog }));
  });

  /* ———— #1208: chat info Links — an inline voice text yields no link ———— */
  await guard('#1208 links', async () => {
    const at = SI.indexOf('else if (fm.type == FriendMessageType.standard)');
    const br = at >= 0 ? bodyOf(SI, 'else if (fm.type == FriendMessageType.standard)') : '';
    const skip = br.search(/^\{\s*if\s*\(\s*VoiceCodec\.tryPeekInline\(fm\.message,\s*out _\)\s*\)\s*\{\s*continue;\s*\}/);
    const links = br.indexOf('LinkRule.extract(');
    ok(at >= 0 && skip === 0 && links > 0,
      '#1208 C#: SharedItems.scan — the standard-text branch skips an inline voice text (VoiceCodec.tryPeekInline → continue) before LinkRule reads it — ' + JSON.stringify({ branch: at >= 0, skip, links }));
  });

  /* ———— #1208: the receive-side text never DECODES a clip (decode = the chat page's player only) ———— */
  await guard('#1208 no decode on text paths', async () => {
    const files = ['Spixi/Pages/Home/HomePage.xaml.cs', 'Spixi/Meta/Node.cs', 'Spixi/Network/StreamProcessor.cs', 'Spixi/Utils/SharedItems.cs', 'Spixi/Utils/ReplyQuote.cs', 'Spixi/Utils/EditRules.cs'];
    const hits = files.filter((f) => /VoiceCodec\.(tryParseInline|tryDemuxOgg)\(/.test(stripCode(rd(f))));
    ok(hits.length === 0, '#1208 C#: the excerpt / notification / edit / links / quote paths use only the bounded peek (tryPeekInline) and the name rule — never a base64 decode or an Ogg demux — ' + JSON.stringify(hits));
  });

  /* ———— #1208: chat-voice-message in EVERY locale; the shell's own voiceMessage translation where one exists ———— */
  await guard('#1208 strings', async () => {
    const langs = readdirSync(join(root, 'Spixi/Resources/Raw/lang')).filter((f) => f.endsWith('.txt')).map((f) => f.slice(0, -4));
    const bad = [];
    /* ★ #46 r2: + chat-voice-message-length = the shell's voiceMessageLength template (cn / ja full-width), with exactly one {0} */
    for (const l of langs) {
      const txt = rd('Spixi/Resources/Raw/lang/' + l + '.txt');
      let jsSrc = '';
      try { jsSrc = rd('src/strings/' + l + '.js'); } catch (e) { jsSrc = ''; }
      for (const [key, jsKey] of [['chat-voice-message', 'voiceMessage'], ['chat-voice-message-length', 'voiceMessageLength']]) {
        const v = (txt.match(new RegExp('^' + key + ' = (.+)$', 'm')) || [])[1];
        const js = (jsSrc.match(new RegExp('^\\s*' + jsKey + ':\\s*"([^"]*)"', 'm')) || [])[1] || null;
        if (!v || !v.trim() || (js && v !== js)) bad.push(l + ':' + key + '=' + v);
        if (key === 'chat-voice-message-length' && v && (v.split('{0}').length !== 2 || /\{[^0]/.test(v))) bad.push(l + ':' + key + ' placeholder=' + v);
      }
    }
    const enTxt = rd('Spixi/Resources/Raw/lang/en-us.txt');
    const en = (enTxt.match(/^chat-voice-message = (.+)$/m) || [])[1];
    const enLen = (enTxt.match(/^chat-voice-message-length = (.+)$/m) || [])[1];
    const fallback = /public const string LengthLabelFallback = "Voice message \(\{0\}\)";/.test(stripCode(rd('Spixi/Utils/VoiceCodec.cs')));
    ok(langs.length >= 13 && bad.length === 0 && en === 'Voice message' && enLen === 'Voice message ({0})' && fallback,
      '#1208: chat-voice-message + chat-voice-message-length (#46 r2) exist in every Raw/lang/*.txt (' + langs.length + '), English "Voice message" / "Voice message ({0})" (= VoiceCodec.LengthLabelFallback), each equal to the shell\'s voiceMessage / voiceMessageLength translation, one {0} — ' + JSON.stringify({ bad, en, enLen, fallback }));
  });

  /* ———— #1208: the codec is PURE (csh compiles it) and the harness executes it ———— */
  await guard('#1208 pure codec', async () => {
    const vc = stripCode(rd('Spixi/Utils/VoiceCodec.cs'));
    const usings = (vc.match(/^using [^;]+;/gm) || []).sort();
    const pure = JSON.stringify(usings) === JSON.stringify(['using System.Collections.Generic;', 'using System.Globalization;', 'using System.Text;', 'using System;'].sort());
    const noLogs = !/Logging\.|Console\.|Debug\./.test(vc);
    const ns = /namespace SPIXI\s*\{\s*public static class VoiceCodec/.test(vc);
    ok(pure && noLogs && ns, '#1208 C#: VoiceCodec.cs uses only System namespaces (no MAUI, no Core type, no Concentus) and logs nothing — ' + JSON.stringify({ usings, noLogs, ns }));
  });
  await guard('#1208 executed', async () => {
    const proj = rd('scripts/csh/csh.csproj');
    const inc = /<Compile Include="\.\.\/\.\.\/Spixi\/Utils\/VoiceCodec\.cs" \/>/.test(proj);
    const tests = stripCode(rd('scripts/csh/VoiceCodecTests.cs'));
    const n = (tests.match(/\[TestMethod\]/g) || []).length;
    ok(inc && /\[TestClass\]\s*public class VoiceCodecTests/.test(tests) && n >= 20,
      '#1208: csh compiles Spixi/Utils/VoiceCodec.cs and runs VoiceCodecTests (' + n + ' methods) — ' + JSON.stringify({ inc, n }));
  });
}
