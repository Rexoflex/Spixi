# SESSION ON-1: the launch flow uplift (create + restore, lifted backdrop, welcome pill)

Paste this as the next session prompt (after DT-1, on the newest base). Damir approved the direction on 2026-10-13 at 15:54, the desktop layout (§Part B) at 16:05, and the rings, less violet, crisp buttons and better cards (Decisions 6 and 8) at 16:08.

## Read first
- The renders: `Claude outputs/onboarding-uplift/`. These are the target.
  - `create-flow.jpg` and `restore-flow.jpg`;
  - `screens/c1…c6` and `screens/r1…r5`, one PNG per state;
  - `backdrop-lift-compare.jpg`, the current backdrop next to the lifted one;
  - `desktop/`: `desktop-sheet.jpg` (today's desktop next to the new one) and `d1…d4`, one PNG per desktop state, at 1280 × 800. Its `concept-create.reference.js` is the newer copy and holds the desktop CSS (`.dk-*`). `welcome-rings.jpg` shows the welcome screen with the corner rings (phone and desktop).
- **Important:** the renders show the **layout and the states**. Their colours, glows, buttons and card surfaces are **not** final. Decision 8 overrides them.
- The CSS values the renders use: `concept-create.reference.js`. It is a static mock, so take the values from it, not the code structure.
- Project docs: `claude/welcome-language-pill-todo-2026-10-13.md` (Part C) and `claude/store-launch-kit-2026-10-12.md` (the "never say money" wording rule, Part D).
- Code: `src/components/launch-shell.js` (welcome / create / restore / retry views, `show()`, the back handler near the end of the file, the consent and `ixian:accept` notes) and `src/styles/components/launch-shell.css`. In C#, read `LaunchPage.xaml.cs` and anything the launch shell calls through its `opts.on*` hooks.
- Take the next free DECISIONS number from the newest CLAUDE.md or handoff. Do not guess it.

## What Damir decided (do not reopen)
1. **Create becomes two steps**, still inside the launch shell and still ONE create commit to C#.
   - **Step 1 "Who are you on Spixi?":** a large photo with a gradient ring and a camera / edit badge, the nickname field, three tags (No phone number · No email · No ID), the note "Your Spixi address is made on this phone." and **Continue**. Continue is off until there is a nickname.
   - **Step 2 "Protect your account":** at the top, the user's photo from step 1 with an orange lock badge. If there is no photo, show the initial avatar with the badge. Do **not** use the backup illustration. The subline is "{name}, this password locks your chats and your wallet on this phone."
   - Then the password field, the confirm field, the strength bar, two live checks, the "Write this password down" banner, the legal line and **Create my account**.
2. **No card step and no setup screen.** Creating an account takes under a second, so the button shows a spinner and "Creating your account…", and then the app opens on Chats.
3. **Restore keeps one screen,** with the new parts:
   - the file **card** (icon tile, "Choose backup file", "The file you saved from Spixi", chevron). After a pick it turns green, with the file name, a check and "Change";
   - the field label becomes **"Password"**, the same word as on create. "Wallet password" is gone;
   - the honesty line with a key icon;
   - a wrong password shows a red field with "That password didn't open this backup. Try again." The chosen file stays;
   - a busy state shows a spinner and "Restoring…" in the button.
4. **The slow fallback screen is for restore only:** your photo in a progress ring, "Welcome back, {name}" and "Bringing your account back to this phone." Show it only if the restore takes **more than 2 s**. Show the stage checklist (backup → contacts → wallet → chats) **only** if C# really reports those stages. Otherwise show the ring and the title with no list. **Never** show a fake delay or fake stages.
5. **No outlines on banners, cards or tags.** Use filled, tinted surfaces instead:
   - warning banner: `linear-gradient(135deg, rgba(239,145,50,.20), rgba(239,145,50,.10))`;
   - file card: `rgba(255,255,255,.11)`, and green `rgba(79,215,144,.16)` when a file is chosen;
   - tags: `rgba(255,255,255,.10)`.

   Only **input fields** keep an edge, because they must stay visible (see §Contrast). Error fields keep the red edge.
6. **Lifted backdrop on create and restore only.** Welcome stays as it is.
   - Lifted gradient: `radial(90% 45% at 50% 18%, rgba(124,118,255,.38))`, `radial(70% 45% at 100% 0%, rgba(214,112,214,.20))`, `radial(90% 55% at 0% 100%, rgba(70,128,255,.22))`, then `linear-gradient(200deg, #2a2263, #211c55 45%, #1a1946)`.
   - Make it a new token, for example `--gradient-launch-form`, next to `--gradient-launch`.
   - The slide from welcome into create or restore must not flash. The gradient travels with the view, or crossfades.
   - **Corner contour rings: ON everywhere in the launch flow** (Damir, 16:06). This is decided, not a dial.
     - Where: create, restore, the slow restore screen and **welcome**, on phone and desktop.
     - Look: white strokes about 1.4 px at about 5 % opacity, slightly wobbly concentric rings (the `posters/contours.js` style, ported as a static SVG or CSS, not the script). They are **static**: no spin, no animation.
     - Phone welcome: **top right only**, faded out under the status bar (mask from transparent at 40 px to full at 72 px). There is no room at the bottom left, because the two buttons span the width.
     - Phone create and restore: top right and bottom left, as in the renders.
     - Desktop (all views): top right and bottom left, scaled to the window.
     - Never under text, buttons, fields, the language pill or the status bar icons. With pseudo-locale +40 % and 200 % text, the rings stay clear of the text or fade out.
     - Put the rings in **one shared layer behind the shell**, not in each view, so they do not move or flash on the welcome → create / restore slide.
7. **No lattice, no mesh and no new illustration** anywhere in this flow.
8. **Less violet, fewer glows, crisp buttons, slightly better cards** (Damir, 16:08). This overrides the colours and effects in the renders and in `concept-create.reference.js`.
   - **Backdrop:** keep the lift (lighter than welcome, so the fields read well), but make it **less violet**. Move the hue toward the indigo / navy of the existing `--gradient-launch`. Starting points to render:
     - the top radial `rgba(124,118,255,.38)` → about `.18–.22`, and less saturated;
     - the pink corner radial `rgba(214,112,214,.20)` → `.08` or less, or remove it;
     - the base `#2a2263 → #211c55 → #1a1946` → a calmer indigo, for example `#22214a → #1b1b40 → #151634`.
     - Render 2–3 backdrop variants next to welcome. Damir picks. Then measure the field edge again (≥ 3 : 1).
   - **Buttons, "on point":** use the app's existing primary button (`src/styles/components/button.css`, the same button as "Create new account" on welcome): a **solid** fill, crisp edges, **no gradient and no coloured glow shadow**. Keep the 56 px height and the pill shape. "Off" uses the existing disabled style. The spinner and "Creating your account…" sit inside the same solid button. Do **not** copy `.cc-cta` (gradient + glow) from the reference file.
   - **Other glows:** remove or strongly reduce the glow behind the photo ring, the lock badge, the key tile and the desktop card. The photo ring gradient becomes less violet (brand blue, not blue → violet). Small, neutral, dark shadows are fine. Coloured halos are not.
   - **Cards, improved slightly:** the desktop glass card, the restore file card, the warning banner and the tags.
     - Aim for a calmer, more defined surface: a slightly more opaque, **neutral** fill (not violet-tinted), at most a 1 px inner top highlight, and a smaller, softer dark shadow.
     - Use one radius scale (for example 24 px for the desktop card and 16 px for inner cards and banners), the same inner padding everywhere, and the icon tiles aligned on one grid.
     - Still **no outlines** (Decision 5).
     - Render 2–3 card variants side by side, on phone and desktop. Damir picks.

## Behaviour details
- **Fields:** the label stays visible above the text. Use the existing field component if it can float the label; if not, extend it in one place for the whole app. Do not fork it.
- **Live checks** while typing: "10+ characters" and "Passwords match". The confirm field turns red, with "The passwords don't match yet.", only once the confirm text is as long as the password or the field has lost focus. Do not shout on the first character.
- **Strength bar:** 4 segments, labelled Weak / Fair / Good / Strong. Use a small rule-based score (length first, then a bonus for a long passphrase). Do not add a library. The ≥ 10 character minimum stays the hard rule. The bar only advises.
- **Back:** from step 2, the back arrow and the hardware or swipe back go to **step 1**, with every value kept. From step 1, they go to welcome, as today. C# hears about view changes through the existing `onGoCreate` / `onGoRestore` notification hooks. Check whether C# needs a step notice for the Android back button. If it does, that is a 🟡 DECISIONS row and a T1 row, and an older C# must still work.
- **Consent:** `ixian:accept` still fires once, at the create or restore commit, as today. The legal line sits on step 2 and on restore.
- **The photo picker** is the existing avatar hook. Both the badge and the photo open it.
- **The keyboard:** with the keyboard open on Android and iOS, the main button stays reachable on both steps and on restore. Check what the shell does today before you change anything.
- **Desktop (Windows / Mac):** see §Part B. The steps, the states and the rules above are the same on desktop. Only the layout and the "device" strings change.

## Also needed (from the 13 Oct talks)
- **Sora latin-ext (fonts):** the launch titles use `--font-display` (Sora), and the bundled Sora file is the Latin subset only (`base.css:116`). The new titles put the user's name into Sora ("Welcome back, {name}"), and the slide titles are translated, so č, š, ž, ć, đ, ė, ą, į, ų and ū fall back to a system font in the middle of a word ("Welcome back, Matej Kovač"). Add the Sora `latin-ext` subset as a second `@font-face` with a `unicode-range`. Pin it with a render of "Ana Kovač · Gabija Kazlauskaitė · Đorđe" in a launch title. This is also §7 of `claude/localized-store-plan-2026-10-13.md`. Cyrillic and CJK stay on the system font, which is fine. The store renders use the same file.
- **Claims in the new strings:** the store rules apply in the app too. Never say "money" for IXI, "no servers", "anonymous" or "post-quantum forward secrecy". Check two claims in the mechanism step before you use them:
  - "Your Spixi address is made on this phone / device": confirm in C# that the keys and the address are generated on the device and are not fetched from a server.
  - "Creating an account takes under a second" (Decision 2): measure the create commit on the slowest target (a low-end Android and the oldest supported Windows machine). If it takes more than 2 s, stop and report it to Damir. Do not add a setup screen on your own.
- **Reduced motion:** with `prefers-reduced-motion`, the welcome → create / restore slide, the step 1 → step 2 slide and the desktop hero crossfade become a short fade. Check whether the global reduced-motion rule already covers the launch shell. The rings are static, so they need nothing.

## Contrast (measure; do not eyeball)
- The edge of an input field against the lifted backdrop must be **≥ 3 : 1**. Measure it again on the new, less violet backdrop (Decision 8). The render used fill `rgba(255,255,255,.09)` with a `1.5px rgba(255,255,255,.34)` inset edge, which measures 3.6 : 1. Focus is a `2px #8fa6ff` edge plus a soft ring.
- All text must be **≥ 4.5 : 1**, including the red error text, the green check labels and the legal line.
- Pseudo-locale +40 %, 200 % text, 320 × 568 and landscape: nothing may overlap, and the button must stay reachable.

## Part B · desktop (Windows / Mac), approved 16:05
Today the desktop create and restore forms stretch across the whole window (fields about 1,200 px wide). The new desktop layout uses two columns. Target: `desktop/d1…d4`.
- **When:** the desktop launch frame from DT-1, at a window width of **≥ 900 px**. Below 900 px, use the phone layout, centred, with a maximum width of 460 px. Read the DT-1 launch layout and its desktop flag first. Do not add a second flag.
- **Left column (about 46 %):** centred vertically and horizontally. It holds the hero of the current view: step 1 shows the large photo with the ring and the edit badge; step 2 shows the photo (or initial) with the lock badge; restore shows the existing restore illustration. Under the hero are the title at 38 px (line-height 1.12, max-width 440 px), the subline at 17 px (max-width 380 px) and, on step 1, the three tags.
- **Right column (about 54 %):** one glass card, **460 px** wide. It holds the header (back arrow, "Create your account" / "Restore your account", "1 of 2"), the progress bar, the fields, the checks, the banner, the legal line and the main button. The card values are:
  - `border-radius: 28px; padding: 26px 28px 28px;`
  - `background: rgba(255,255,255,.07); backdrop-filter: blur(24px);`
  - `box-shadow: 0 30px 80px rgba(5,4,25,.42), inset 0 1px 0 rgba(255,255,255,.10);`
  - **no outline** (Decision 5 applies to the card too).
- **Brand:** the Spixi logo and the word "Spixi" at the top left (28 px from the left, 22 px from the top). Use it only if the DT-1 frame does not already show the brand. Do not show it twice.
- **Window buttons:** the renders draw — ☐ ✕ only to show where the frame goes. Use the real DT-1 frame (Windows caption buttons, Mac traffic lights). Do not draw fake ones.
- **Backdrop:** the same `--gradient-launch-form` token fills the whole window. If the rings dial is on, put the rings in the top-right and bottom-left corners, scaled to the window, and never under the card or the text.
- **The hero does not move with the card.** On step 1 → step 2 the left hero crossfades (photo + ring → photo + lock), and the card content slides. The window must not jump in size.
- **Keyboard and focus:** Tab order goes back → fields → eye buttons → checks → button. Enter on the last field runs the main button, but only when it is on. Focus starts in the nickname field on step 1 and in the password field on step 2 and on restore.
- **The file card on restore** opens the native file dialog. Drag and drop of the backup file onto the card is a nice extra: add it only if the DT-1 shell already handles file drops. Otherwise note it as a follow-up.
- **"Device" strings:** on desktop, say "device", not "phone". These need a desktop variant (a second key, or a `{device}` word chosen by platform; pick the way the codebase already uses, and write a DECISIONS row):
  - the address note: "Your Spixi address is made on this device.";
  - the step 2 subline: "{name}, this password locks your chats and your wallet on this device.";
  - the banner: "It unlocks your account and wallet on this device. Nobody can reset it, not even Spixi.";
  - the slow restore screen: "Bringing your account back to this device."
- **Sizes to check:** 1280 × 800, 1440 × 900, 1920 × 1080, 900 × 700 (the two-column minimum) and 800 × 600 (the phone fallback). Also check 200 % text and pseudo-locale +40 %: the card may grow taller, but it must not overlap the left column, and the button must stay visible (the card scrolls inside if needed).

## Part C · the welcome language pill (option B, already decided)
Build it exactly as in `claude/welcome-language-pill-todo-2026-10-13.md`:
- the pill is 44 px high, with a hit area of at least 48 px on Android;
- under the pill, a small caption reads the EXISTING `language` key;
- the caption passes 4.5 : 1;
- do not change `LaunchPage.xaml.cs:73-84`.

Render 2–3 variants first, including the globe dial and desktop "same / no change", and Damir picks.

## Part D · welcome slide 3 wording (the store wording rule)
`slide3Title` / `slide3Copy` say "Send money…" in all 14 locales. The rule is: say IXI, crypto or wallet, never "money", and do not promise "instant".
- New English: title "Send IXI like a message.", copy "A private IXI wallet lives inside every chat. Send and request IXI in a tap."
- Write a DECISIONS row and re-translate all 14 locales through the normal pipeline.
- Do NOT rewrite the other slides in this session. A full welcome copy proposal exists, but Damir has not approved it yet.

## New strings
The desktop "device" variants (§Part B). Step labels "1 of 2" / "2 of 2" (a pattern with a number), both hero titles and sublines, the three tags (reuse existing keys if they exist), the address note, Weak / Fair / Good / Strong, the two check labels, the mismatch line, "Creating your account…", "Restoring…", the file card lines ("Choose backup file", "The file you saved from Spixi", "Change"), the wrong-password line (reuse the existing one if its meaning matches), and the slow screen title and subline.
- Run every new key through the usual pipeline: AI translation, `verify-locales`, `i18n-lint`, the pseudo-locale smoke, and renders in both themes.
- Show the file date ("Saved 3 Oct 2026") only if C# gives it. Otherwise show the name only.

## Process
1. **Mechanism first (#294):** read what C# sends and expects on create and restore: the payload, the errors, and whether restore reports progress. Write one paragraph per hook before you change code.
2. **FORGE:** render on the **built** launch shell, in light and dark system themes (the launch surface stays dark), at phone sizes and at the Part B desktop sizes, inside the real DT-1 frame.
   - Show every state in `screens/` with the rings on (Decision 6), plus the welcome screen with the rings.
   - Decision 8 variants: 2–3 backdrops, the solid primary button in every state (on, off, loading), and 2–3 card treatments, on phone and desktop.
   - The pill variants (Part C).
   - Damir picks.
   - **No build before "go".**
3. **Build:** keep the changes small and in the launch shell, CSS tokens and strings. One field-component change if needed.
4. **Pins**, each with a deliberate break that makes it fail for the right reason:
   - Continue stays off with no nickname;
   - back from step 2 lands on step 1 with the values kept;
   - one create commit carries the name, password and photo, and `ixian:accept` fires once;
   - field edge ≥ 3 : 1, text ≥ 4.5 : 1;
   - no outline on banners, cards or tags;
   - the slow screen never appears under 2 s;
   - no stage list appears without real stage events;
   - restore keeps the chosen file after a wrong password;
   - "Wallet password" appears nowhere in restore;
   - the pill hit area is ≥ 44 / 48;
   - slide 3 contains no "money" in any locale;
   - desktop ≥ 900 px shows two columns and the card is 460 px wide; below 900 px the phone layout shows;
   - desktop strings say "device", and phone strings say "phone";
   - the primary button has no `background-image` gradient and no coloured `box-shadow` (computed style);
   - the rings layer is one shared element: it is the same node before and after the welcome → create slide, and it has no animation.
5. **Smoke:** one at a time in the cloud twin, the WHOLE smoke before delivery (L84), compared with the baseline in the newest status doc.
6. **Walk sheet rows:**
   - ON-C1 step 1 empty / filled;
   - ON-C2 step 2 checks / mismatch / strong;
   - ON-C3 back keeps values;
   - ON-C4 create → Chats with no extra screen;
   - ON-R1 pick a file;
   - ON-R2 wrong password;
   - ON-R3 restore → Chats (and the slow screen on a large backup, if one is available);
   - ON-BG the backdrop has no flash on the welcome → create slide;
   - ON-PILL;
   - ON-S3 slide 3 text;
   - ON-DK1 desktop two columns at 1280 × 800 and the phone fallback at 800 × 600;
   - ON-DK2 Tab order, Enter on the last field, and focus on each view;
   - ON-RINGS the rings are in the corners on welcome, create and restore, never under text, and they do not move on the slide;
   - each on Android + Windows, light + dark, plus iOS / Mac at the office walk.

## Rules
- `git --no-optional-locks` on the mounted repo. Never write Damir's index.
- ★ COMMIT RULE: no attribution lines anywhere.
- Never commit or push from the cloud. Deliver a `.patch` and the commit message, and Damir commits.
- Run ONE smoke at a time. The 7 GB cloud twin kills parallel Playwright runs.
- If a C# change is needed: a 🟡 DECISIONS row, a BE note and a T1 row. The shell must still work with the current C#.

## Follow-ups to note in the status doc (do not do them in ON-1)
- The store video start scene (`v_start` in the store kit, both v1 and v2) and any store screenshot that shows the create screen still show the OLD one-screen create. After ON-1 ships, re-render them from the new flow.
- The welcome copy proposal (Damir has not approved it yet).

## Out of scope
The full welcome copy rewrite, the card reveal, any key-generation screen, the per-language `previewSender` names (`claude/localized-store-plan-2026-10-13.md` §3), and the chat-style restore.