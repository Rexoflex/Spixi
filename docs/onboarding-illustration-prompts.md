# Spixi onboarding illustration prompts (Nano Banana / GPT image)

Six illustrations for the launch flow: the 4 welcome carousel slides + the backup
nudge + the join-community step. They sit on the app's fixed‑dark aurora gradient
(`--gradient-launch`: violet crown → sapphire → violet‑ink base), so they're
designed dark, glowing, and on a **transparent background** so the gradient shows
through.

Workflow: paste the **STYLE block** once, then append one **SUBJECT** line per
image. Keep the style text identical every time so the set stays consistent.

---

## STYLE block (prepend to every prompt)

Flat, modern vector illustration in a premium dark "crypto‑messenger" style. Clean
geometric shapes with soft rounded corners, a consistent medium line weight, gentle
inner glows and smooth two‑tone gradients, with subtle long shadows for light depth.
Mood: calm, trustworthy, private, quietly futuristic.

Color palette: electric violet (#7C58FF) and indigo blue (#515EE6, #2B76FF) as the
primary hues, soft periwinkle highlights (#CBCFFE, #769DFF), and sparing magenta
(#E94EA8) and teal (#38E0D3) accent glints. Luminous accents that look lit from
within, made to sit on a dark violet‑to‑black aurora background.

Composition: a single, clearly readable focal subject centered in a 1:1 square frame
with generous negative space. Transparent background. No text, no letters, no
numbers, no logos, no UI chrome, no photorealism. Keep the same style, palette,
lighting and proportions across the whole set so all six feel like one family.

Subject:

---

## SUBJECT lines

**1 — Private & yours (no servers, on‑device, end‑to‑end encrypted)**
Two smartphones facing each other, joined by a single direct glowing encrypted beam
with a small padlock or shield‑with‑keyhole floating on the link between them, and no
server or cloud anywhere in the scene — messaging that is peer‑to‑peer, encrypted,
and lives only on your device.

**2 — Just a nickname (no phone number, no email)**
One glowing user avatar with a small unique address tag beneath it (an abstract
QR‑like glyph or a tiny key), floating free and self‑contained, with no phone‑number
or email icons present — an identity that needs only a nickname and a unique address,
no personal data.

**3 — Wallet built into chat (send/receive IXI)**
A chat speech bubble with a shiny circular coin emerging from it and traveling toward
a second speech bubble, a soft motion trail behind the coin — sending and receiving
payments as easily as sending a message.

**4 — Mini Apps inside chats**
A chat speech bubble that opens into a small neat grid of glowing app tiles — a game
controller, a wrench/tool, and an AI spark — nested inside a conversation, showing
tools, games and AI running right inside chats.

**5 — One backup file protects everything (backup nudge)**
A protective shield or vault cradling a single glowing document/file marked with a
keyhole, a subtle key or lock wrapping around it — one encrypted backup file that
safeguards your identity, wallet and contacts.

**6 — Join the community**
A warm cluster of a few overlapping glowing avatars with small speech bubbles forming
a welcoming circle — an inviting, friendly group chat community.

---

## Consistency & technical tips

- **Format:** 1:1 square, at least 1024×1024, exported as **transparent PNG** so it
  composits cleanly on the app's dark gradient. If the model bakes in a background,
  add: "isolated on a fully transparent background, no backdrop."
- **One family:** generate all six in one session. If your tool supports a **seed**,
  reuse the same one. In Nano Banana, feed your first approved image back as a
  **style reference** for images 2–6 to lock the look.
- **Kill gibberish text:** models love to add fake letters — the "no text, no
  letters, no numbers, no logos" line above matters; repeat it if any slip through.
- **Match the shipped set (optional):** if you want them to echo the current
  `step1–4.svg` tour art, attach one of those SVGs/PNGs as a reference image and add
  "match the line weight and flat style of the reference."
- **Avoid:** photoreal 3D renders, busy backgrounds, heavy skeuomorphic shadows,
  stock‑photo people, harsh neon, watermarks.

## Optional: one‑shot contact sheet

For a quick consistent draft, ask for all six at once, then slice them:

> [STYLE block above, minus the "1:1 square" line] … Arrange SIX separate onboarding
> illustrations as a clean 2×3 grid contact sheet on a transparent background, evenly
> spaced with clear margins, each in its own square cell, all sharing one identical
> style and palette. The six subjects are: (1) two phones linked by an encrypted beam
> with no server; (2) a single avatar with a unique address tag and no phone/email;
> (3) a coin traveling between two chat bubbles; (4) a chat bubble opening into a grid
> of app tiles (game controller, tool, AI spark); (5) a shield/vault holding one
> keyed backup file; (6) a warm cluster of avatars forming a community. No text.
