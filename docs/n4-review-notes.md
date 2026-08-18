# N4 — native-review flags for the 5 new dictionaries (machine drafts)

All five dictionaries are MACHINE DRAFTS (legacy-reuse first, Claude-drafted
rest). Sources for a reviewer: `src/strings/draft/<code>.json` (drafted values —
edit HERE, the build regenerates), `src/strings/draft/<code>.glossary.json`
(legacy terminology canon used), the lang txt for seeded/legacy values.
Em/en dashes are BANNED in built sets (N3a gate). Placeholders and the
protected tokens (Spixi/Ixian/IXI/QR/GIF/PIN/ID) are machine-verified.

## Cross-language actions taken (review these first)

1. **id-id legacy Pay/Request SWAP fixed at source** — the shipped
   `id-id.txt` had `chat-request-payment = Bayar` (Pay) and
   `chat-send-payment = Permintaan` (Request) reversed: a money-direction
   error on payment buttons. Now `Minta` / `Bayar`. Affects legacy pages too.
2. **18 legacy ids drafted into all five lang txts** (the block at each file
   tail): the rework-era ids (contact-self/exists, intro-new/restore guards,
   notification-*) existed only in en + the 7. All C# sites carry fallbacks,
   so this only removes English leakage, it cannot null.
3. **Overflow shortenings (#379 row has the full list)** — 29 button/chip
   values shortened post-audit, incl. 5 legacy lines (ja
   wallet-sent-view-explorer + app-details-uninstall→削除, id
   app-details-uninstall→Copot, ru index-missing-tx-view-all + 
   chat-modal-tip-custom→Вручную). ru note: chat-modal-tip-custom seeds both
   the tip chip AND the Custom security tier.
4. **cn-cn: QR renders as "QR 码", not the legacy 二维码** — the FE
   protected-token gate requires Latin "QR". The legacy pages still say
   二维码. A reviewer may prefer aligning legacy → "QR 码" later.
5. **cn-cn document locale maps to zh-cn** (`setDocLang`) — dates/screen
   readers get real Chinese; dictionary keys stay cn-cn.
6. **Badge caps normalized in it/id/lt only** — chat-payment-status-* +
   settings-lock-unlocked went sentence-case (en FE canon). The 7 OLDER
   locales still shout (ABGELEHNT/ZAVRNJENO class, inherited) — next copy
   round. id-id additionally had ~33 shouting values where en-us is
   sentence-case — all swept (SIMPAN→Simpan, BERIKUTNYA→Berikutnya class,
   plus 3 mid-value shouts: Spixi TERKUNCI → terkunci, Pembayaran sudah
   TERKIRIM/DITERIMA → terkirim/diterima). Two legacy-only pairs still shout
   (settings-lock-locked, address-gen-2) — inert today, logged.
7. **appDetails is a brand line, not a label, in every locale** ("Spixi App" /
   "Spixi 应用" …) — seeded from legacy `app-details-title`; the topbar no
   longer says what the screen is. Inherited pattern; a reviewer may want
   "Dettagli app" class values across ALL locales in one pass.

## Per-language flags (drafting agents' top items)

**it-it** — informal *tu* register per glossary · "portafoglio" for wallet ·
pin/unpin = "Fissa"/"Sblocca" (Sblocca collides with unlock visually) · tip =
"mancia" family · gendered status labels split by referent (messages masc, tx
fem) · consent fragments: "…prendi atto della" + "Privacy Policy" kept English
for the elision — switching to "Informativa sulla privacy" needs finePrintAck
= "…dell'" · "Off" kept as "Off" on chips · "gruppo cieco" for blind group ·
"handshake a sicurezza quantistica".

**id-id** — formal *Anda* per glossary · "Tersampaikan" (delivered) vs legacy
"Terkirim" (sent) · "handshake" kept English · channels = "Saluran" ·
selfDestruct = "Pesan sementara" (WhatsApp-ID convention) · mention =
"sebutan" · "Grup buta" (harsh; "Grup anonim"?) · keepContact shortened to
"Simpan kontak" (overflow).

**lt-lt** — formal *jūs* · admin = "Admin" (badge width) · termsLink =
instrumental "Naudojimo sąlygomis" (reads right after the consent line, odd
standalone) · tip = "dovanoti/dovana" canon · counted strings use the
colon/parenthetical count-agnostic forms; deleteSelectedMany carries ({n})
(ru/sl/sr convention, pinned) · "kvantams atsparus" for quantum-secure ·
žurnalas for log (legacy "Log'a" cleaned) · attach AND pin both "Prisegti"
(contextual collision).

**cn-cn** — 您 register · reactions = 回应 family · selfDestruct = 限时消息 ·
`message` = 发消息 (action button reading) · requestName = 向 {name} 请求
(direction: request FROM them) · members = 位成员 (count suffix) · pattern
styles 流光/线稿/数据矩阵, intensity 淡雅/标准/浓郁 · removeContactTitle keeps
the trailing space ("移除 ") · 后量子 unified for post-quantum.

**ja-jp** — buttons terse noun form, body です・ます · consent fragments
restructured ("アカウントを作成すると、以下に同意したものとみなされます：…") —
CHECK the launch concatenation on screen · requestName = "{name} にリクエスト"
(direction) · members = "人のメンバー" (assumes count+space prefix) · ban =
ブロック per glossary (collides with contact-block if that ever lands) ·
status set follows LINE/WhatsApp-ja (配信済み/既読/未送達) · 耐量子暗号 vs
量子耐性 not yet unified · people = 個人 · uninstall modal now 削除 (overflow
shortening; title carries the uninstall context).
