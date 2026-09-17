# F5 checklist — Session U (#845–#854): the seven queued dials

**Build:** components, shells, C#, strings and the generated pattern stylesheet all changed.

```
node scripts/generate-chat-pattern.mjs        # doodles block retired from the emit
node scripts/extract-strings.mjs              # expect 787 keys, 0 fallback conflicts
node scripts/build-locales.mjs
node scripts/build-strings-iife.mjs
node scripts/build-demo-bundle.mjs            # expect 316 exports (was 321)
node scripts/build-shells.mjs                 # ⚠ bundle BEFORE shells, always
node scripts/smoke-test.mjs                   # expect BASELINE OK / the 2 KNOWN (see §0)
node scripts/i18n-lint.mjs && node scripts/pseudo-locale-smoke.mjs && node scripts/verify-locales.mjs
```

Then wipe `obj`/`bin` (C# changed in three files) and build.
**Windows: F5 in Visual Studio, never `dotnet build`** — #663, it does not stage the
`MauiAsset` files and the app silently serves the previous build's shell.

⚠ **Two files must be `git rm`'d** — the mount here cannot unlink, so they were moved to
`_to_delete/835-retired/`:

```
git rm src/components/chat-flow.js src/styles/components/chat-flow.css
```

---

## §0 — the baseline changed, on purpose

`KNOWN_PREEXISTERS` is **2**, not 3. **M5 was re-read and is now GREEN** (#848): four of its
five clauses always passed, and the failing one asserted a SPELLING that iOS-26 moved while
the feature stayed live. If the summary says *"KNOWN pre-exister ABSENT"* for #136 or B3,
that is a real signal. If **M5 goes red, it is NEW** — it is not on the list any more.

---

## §1 — the four you reported, on the device

| # | do this | pass |
|---|---|---|
| 1.1 | **Add app** → look at the left/right margins | the panel sits at the same inset as the Contacts panel (16), not 32 (#846) |
| 1.2 | **Create group** → add a member with a very long name | the label truncates with an ellipsis and the remove **×** stays on the card and is tappable (#847) |
| 1.3 | Chats list → the **Requests** chip | no trailing number. ⚠ **And the control**: with no pending requests the chip is not there at all; with one, it appears (#848) |
| 1.4 | Set Slovenian / Indonesian / Lithuanian → open a CONTACT's info | the address row says "Spixi ID" / "Alamat Spixi" / "Spixi adresas" — no *Vaš* / *Anda* / *Mano*. Then Account → its own address row **keeps** the possessive, which is correct there (#849) |

## §2 — member sheet (2 devices, or a group you are in)

| # | do this | pass |
|---|---|---|
| 2.1 | Open a group → tap a member **who IS a contact** | a **View profile** button appears, and the identity block has a chevron |
| 2.2 | Tap it | their contact page opens, titled **"Contact details"** (not "Chat info") |
| 2.3 | Tap a member who is **NOT** a contact | no View profile; the contact-request button is still there (this is walk V1, the control) |
| 2.4 | On a **blind** group, tap a member | the hidden-identity panel — no identity block, no button |

## §3 — apps

| # | do this | pass |
|---|---|---|
| 3.1 | Add an app you **already have** (paste its link → Get app) | the screen shows the **Open pill + Uninstall row** — not a fresh Install bar (#851) |
| 3.2 | Add an app you do **not** have | unchanged: the sticky Install bar, and installing still morphs loading → check → installed |
| 3.3 | 🟡 **DIAL**: pick a FILE for an app you already have | you now land on Open/Uninstall with no way to install that file. There is no Update affordance in the app and no version comparison — **say whether you want one**, it is a design call, not a bug fix |

## §4 — the desktop pane (Windows)

| # | do this | pass |
|---|---|---|
| 4.1 | Wide window → **Add app** | opens in the RIGHT column beside the list (#852) |
| 4.2 | Wide window → FAB → **Add contact** | opens in the right column; the picker stays open beside it |
| 4.3 | **Narrow the window** below the split, then Add app | in-shell takeover, instant — no page boot. ★ This is the fork: it must follow the window **live**, not the platform |
| 4.4 | Widen again → Add contact | back to the pane |
| 4.5 | Android / phone | unchanged from #827 — always the in-shell takeover |

## §5 — the chat background (#853)

| # | do this | pass |
|---|---|---|
| 5.1 | ★ **On a device that had Doodles selected**, open a chat | it renders the **data-matrix** pattern — never a blank/plain canvas. This is the failure the whole retirement risked |
| 5.2 | Account → Chat appearance → **Background** | exactly two tiles: **None** and **Data matrix**. No Doodles, no Live flow |
| 5.3 | Light mode, a NEW install (or clear `spixi.chat.ground`) | the canvas is **solid**, not the gradient wash |
| 5.4 | Light mode → Chat appearance | ★ the **Colour** row is **gone** (#855 — you retired the gradient option). The screen is two controls: text size + Background |
| 5.4b | ★ **On a device that had Gradient selected**, open a chat | it renders the **solid** canvas — a retired pick must fall through, not strand you on a canvas the picker can no longer change |
| 5.5 | Dark mode → Chat appearance | the Colour row is absent (unchanged — it is the same guard now) |
| 5.6 | Desktop, light | pre-paint and repaint agree — no gradient flash that settles to solid (a latent #690 disagreement this closed) |

✅ **ANSWERED (#855).** You said *"for gradient, yes I mean retire the option for now"* — so the
option is gone, not just the default. **"For now" shaped the implementation**: the token, the
CSS rules and the `onChatGround` plumbing all stay, the row's guard is DERIVED from
`CHAT_GROUNDS.length > 1` rather than switched off, and the three strings are held. Restoring
it is putting **one member back into `CHAT_GROUNDS`** — the row un-hides itself.

## §6 — regression sweep

| # | do this | pass |
|---|---|---|
| 6.1 | Wallet → Send / Receive | margins unchanged (the inset rule is now `> *` — these were already correct and must stay) |
| 6.2 | Chats list → the filter chips | All / Unread / Groups unchanged, counts still on Unread and Groups |
| 6.3 | Chat appearance → text size | still first on the screen, still 4 pills |
| 6.4 | Any chat | pattern intensity, ground and text size still apply to an ALREADY-OPEN chat when you change them in Account |

---

## Still owed (unchanged by this session)

* **AND-40** the memory kill — needs a run that actually kills. Page accumulation is ruled
  out (#830); the floor is ~400 MB, so 511 MB is a spike: chase native/graphics.
* **AND-36** rotation highlight · **AND-39** the tap fill — both need a repro first (#294).
* The freeze (#825): `maxLogCount 5 → 1` and retiring the probe set. Both remove instruments
  that are still in use while AND-40 is open.
