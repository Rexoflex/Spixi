# HANDOFF — SESSION F CLOSED, AND THE ROAD TO iPHONE

★★ **READ §1 FIRST. Three of the four items there are COPY or a RULING and cost you minutes;
one is a correctness question about what we tell every user.**

---

## 0 · The numbers

```
bundle 308 · shells 18 · smoke BASELINE OK 3716 / the 3 known (#136 · M5 · B3)
locales ALL CLEAN 780 · i18n-lint ✓ · pseudo 9/9 · cs-syntax 110 clean + 1 known gap
Ixian-Core 097341a (170 modified = CRLF churn; --ignore-cr-at-eol EMPTY)
```

★ Entry was **3686 / 778 keys**. The +30 pins are the mutation repairs plus the Aug batch.
Keys: −1 `patternStrong` (retired) +3 ground keys = 780. Neither delta is drift.

★★ **`cs-syntax-check` RUNS — it is not broken, it was MISLOCATED.** Recorded `SKIPPED` all
project long because tree-sitter's native build fails on the device VM. In a Linux container
it loads and passes (110 files). **Run it in a container, not on the device VM.** The C# in
this tree had never actually been syntax-checked before this session.

---

## 1 · ⚠ WHAT NEEDS DAMIR

**① The `rsa2` fallback — and this is the honest residue of the §0 copy fix.**
The notice now says "sealed on your device with post-quantum encryption". Verified true for
the modern path: `prepareSharedSecret`/`finalizeSharedSecret` (`CoreStreamProcessor.cs:1919`)
combine **ECDH + ML-KEM-1024**, and `spixi2` bodies are AES-256-GCM + ChaCha20-Poly1305.
★ Damir asked whether PQE covers the messages or only the handshake. **Only the handshake —
and that is correct and standard** (Signal PQXDH, iMessage PQ3 are the same shape): symmetric
ciphers are already quantum-resistant, Grover only halves the effective key length, so
AES-256 keeps ~128-bit security. What quantum breaks is the asymmetric exchange, which is
exactly what ML-KEM protects.
⚠ **The real problem is `rsa2`.** When a peer does not support `spixi2` the exchange falls
back to RSA-4096 (`CoreStreamProcessor.cs:1618/1623`) — quantum-vulnerable. For those
conversations the shipped claim is FALSE. **Decide when rsa2 retires**, or qualify the copy.

**② Two more strings still carry the §0 falsehood.** Not changed — copy is Damir's.
- **`slide1Copy` — ONBOARDING, the first thing a new user reads:** *"No servers, no
  middlemen…"*. Dash-free draft: *"Encrypted on your device and opened only by the person you
  sent to. Simple, private messaging with no account and no phone number."*
- **`aboutBody`:** *"No central server holds your messages or your keys."* Draft: *"Spixi lets
  you chat and send IXI directly, peer to peer. Your messages are encrypted on your device
  and your keys never leave it."*

**③ L9's caveat contradicts L8's shipped behaviour.** L9 says a desktop PANE must not slide;
L8 shipped chat info as **column 1 WITH `slideIn: true`** and the audit *deliberately removed*
the column guard from the mirror (`SpixiContentPage.cs`, correction ①). The one surface that
slides today IS a desktop pane, on purpose. **Which rule wins?** One small change once
answered; unbuildable before. This is the row Damir wants **fable** on, with L3.

**④ The twelve secure-notice + ground translations are MINE and want a native eye.**
New text, not legacy reuse. Leaving the old ones was not an option — they stated the
falsehood explicitly in every language.

**Still open, unchanged:** the `ipn.ixian.io` TTL · a rail logo file · L12 (an admin account)
· the desktop leg of the L14 order.

---

## 2 · ⚠ NOT VERIFIED ON A DEVICE — four acceptance tests

Nothing in the overnight batch was built or seen on hardware by the session that wrote it.
Damir has since walked most of it on Windows and Android; these four remain:
1. **The Windows `.exe` icon** — does it take the committed `.ico` or the resizetizer's?
   Judge in Explorer at Large/Medium/Small. NOT the taskbar, it caches a stale square.
2. **`OneSignal.ConsentRequired` / `ConsentGiven` compile.** No NuGet egress in the container.
   Fallback spelling (`OneSignalNative.`) is written at the edit in `SPushService.cs`.
3. **The GIF keyboard actually inserting** — the regex fix is traced, not observed.
4. **Back closing a confirm in Downloads / App details** before the page pops.

---

## 3 · What shipped — the short version

The long version is `docs/commit-message-session-f.txt`. Headlines only:

**A LIVE SHIPPING BUG.** The built strings dictionary was a session behind — 779 keys against
source's 778, still shipping the two RETIRED pattern names and missing `patternStyleDoodles`.
Twelve locales showed the default tile in English. **Invisible in en-us** because fallback and
string are the same word, and no gate could see it. A pin now compares built key SETS to
source (counts were 779 vs 778 — a count check passes that).

**#684 GIFs: the premise was wrong and the real bug was better.** The keyboard never reaches
the paste path; `WebViewRenderer.cs:139` handles `commitContent` and its allowlist regex
REQUIRED a subdomain, so every bare-domain share link Gboard sends was dropped silently.

**#686 dies.** Not the same change (the flag rests on a date error), but it fails on
measurement quality regardless — 146 ms timing an opacity flip on an off-screen stage.

**#701 landed whole**, base and lift both ruled awake.

**The Aug tile + ground.** −21% on `chat-pattern.css` while the pattern got denser; light is
flat `#EBF0F5` with the wash kept as a user choice; Android defaults to the wash, desktop to
flat. Strong retired with a migration in all three ladders.

---

## 4 · ★★ THE RULES THIS SESSION PAID FOR AGAIN

1. **A BARE STRING MATCH IS A SUBSTRING TEST.** The mutation harness reported SURVIVED for
   all 16 — *including both controls* — because it looked for `"BASELINE OK"` in the output
   and a PIN MESSAGE at `smoke-test.mjs:17053` contains that phrase. **Only the controls
   caught it.** Never drop a control for being obvious.
2. **A NEGATIVE SWEEP IS ONLY AS GOOD AS ITS SPELLING.** `Kyber|ML-KEM|CRYSTALS` returned
   nothing and nearly killed a TRUE post-quantum claim; the identifier is `MLKem`.
3. **A VALUE THAT WORKS BY COINCIDENCE WILL BREAK WHEN THE COINCIDENCE DOES.** Three in one
   day: `mask-size: 140px 140px` was fine only while the tile was square · `styleSwatchGroup`
   hard-coded `data-chat-pattern` and was fine only while it drew one list · a pin identified
   the intensity row as "the group that isn't the style group" and was fine only while there
   was one style-shaped group. **Pin the PROPERTY, not the arrangement.**
4. **TRACE WHAT THE PLATFORM READS.** #684's whole premise dissolved on one read of
   `WebViewRenderer.cs`.
5. **MEASURE, AND LET IT OVERRULE YOU.** I asserted OKLab would fix the gradient's chalky
   midpoint; measured, it was marginally WORSE — the dip is geometric (an 82° hue rotation),
   not an interpolation-space artefact. Only a hue ARC fixes it.
6. **RENDER BEFORE HE REBUILDS.** Every colour in the Aug batch was picked off a render with
   the real ground, real ink and real bubbles.
