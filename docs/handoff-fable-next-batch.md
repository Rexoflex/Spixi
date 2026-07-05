# Handoff (fable) — continue app finalization: next batch = Contacts

Session 2026-07-05 (E). Paste into the new chat. `DECISIONS.md` is the source of
truth. Boot ritual: read `CLAUDE.md` → `DECISIONS.md` (rows **#146–#151** for the
settings era) → `docs/finalization-roadmap.md` → this file.

**This handoff covers two things:** (1) a parked, uncommitted fable batch and how
Damir merges it later; (2) the next batch to build now (Contacts).

---

## ⚠️ READ FIRST — a fable batch is UNCOMMITTED and NOT on this machine

Fable built the **account-shell completion** on the previous computer (Damir's
PC) — the **Downloads · Developer/log · Contributors** screens — but that batch
was **never committed or pushed**. Damir cloned fresh onto the Mac, so origin
(and this working tree) do **not** have it.

**Recoverability checked on the Mac (all negative):**

| Check | Result |
|---|---|
| `git status` | clean — nothing staged/uncommitted |
| `git stash list` | empty |
| `git fsck --lost-found` | no dangling commits/blobs |
| `src/` search for the screens | **absent** — `settings-screens.js` defines only `createChatAppearance` / `createPrivacy` / `createNotificationsScreen` / `createSecurityLevel`; no downloads/dev/contributors builder |
| on-disk "contributors" hits | only the **legacy** `Spixi/Resources/Raw/html/contributors.html` + `Pages/Contributors/*` — pre-redesign, not fable's shell work |

**Decision (Damir): KEEP the batch, merge it later from the PC. Do NOT rebuild.**
The batch still lives in the **PC's working directory**. Damir has no PC access
this session; he works on the Mac now and reconciles at home (checklist below).

---

## 🏠 WHEN DAMIR GETS HOME — reconcile Mac work with the PC batch

Goal: combine what we pushed from the Mac with the uncommitted settings batch on
the PC. The two are in **different files**, so it's mostly automatic. **Order
matters — commit the PC batch BEFORE pulling.**

1. **On the PC, commit the batch FIRST (before any pull).** In GitHub Desktop:
   review the settings changes → write a message (e.g. "Account shell: downloads
   / dev / contributors screens") → **Commit to `redesign/frontend`**. This turns
   fragile working-tree edits into a real commit git can merge.
   - Optional but safest: also push it to its own branch as a backup —
     `git switch -c redesign/settings-completion && git push -u origin HEAD` —
     then switch back to `redesign/frontend`.
2. **Then pull the Mac work:** `git pull` (or Fetch → Pull in Desktop). Git
   3-way-merges the two histories.
3. **Resolve the few SHARED files** (only these can conflict — all trivial):
   - `src/demo/spixi.iife.js` — generated bundle. **Don't hand-merge.** Take
     either side, then regenerate: `node scripts/build-demo-bundle.mjs`.
   - `DECISIONS.md`, `CLAUDE.md` (status list) — both append; **keep both sides'
     rows/notes**.
   - `scripts/smoke-test.mjs` — if both added assertions, **keep both blocks**.
4. **Rebuild + verify:** `node scripts/build-demo-bundle.mjs` then
   `node scripts/smoke-test.mjs` → expect green. Demo pass on `settings.html`.
5. **Commit the merge + push.**

**If a pull ever complains before the PC batch is committed** ("local changes
would be overwritten") — **STOP, commit the batch, then pull.** Never
`reset --hard` / discard to force a pull; that destroys the batch.

### Why the merge is clean (anchors the batch will land on)
The three hub rows + callbacks **already exist**; the incoming batch only adds
screen builders and swaps three demo placeholders:

| Anchor | Where |
|---|---|
| Callback params `onDownloads, onContributors, onDev` | `settings-shell.js:273` |
| Hub rows (download/info, heart-handshake/accent, dev gated) | `settings-shell.js:747–757` |
| Danger "Delete downloads" (`ixian:deleted`) | `settings-shell.js:911–918` |
| Demo placeholders to replace | `settings.html:310–312` (toast "— next slice") |

**MERGE-SAFETY RULE (this session):** while building the next batch, do **not**
modify `settings-shell.js`, `settings-screens.js`, `settings-backup.js`, or the
settings callback wiring in `settings.html`. New work goes in **new files** only.
This keeps the PC merge to just the generated/log files above.

### If the PC batch turns out lost — rebuild is cheap (`bridge-audit-B.md`)
- **Downloads** (§6): `addFile(name, creationTime)` C#→JS per file, re-sent
  wholesale on change; `ixian:open:<fileName>` (OS open); delete-all =
  `ixian:deleted`. List + toolbar. (§6 note: no `..` path sanitization C#-side —
  flag, don't fix in FE.)
- **Contributors**: static list render.
- **Developer/log**: log tail / export — **interview Damir** (live tail vs
  export) before building.
Reuse: `.c-settings__group` cards · `.c-disc` atom · `settingRow` · `u-scroll`
body with `> * { flex:none }` · `createTopbar({variant:'view', onBack})`.

### Carried open 🟡 (parked WITH the account shell)
- **#151 RTL switch-knob** — `.c-settings__switch-knob` uses `translateX(20px)`
  (not direction-aware); "on" knob slides wrong way in RTL (settings + chat-info
  share it). Deferred to a whole-app RTL pass.

---

## NEXT BATCH — Phase 1 #2: **Contacts** (build this now)

Per `finalization-roadmap.md` Phase 1, Contacts is next after the account shell.
Two views; one already exists.

### Scope
| View | Status | Build |
|---|---|---|
| **Contact profile** | **EXISTS** — `createChatInfo` with `context:'contact'` (#142③). The shell just opens it. | Wire shell → profile; verify the contact-context variant renders (no group-only rows leak). |
| **Add-contact** | new | Address field + QR/scan entry + send-request action. |

### Add-contact — what to build
- **Address field** — paste/enter an Ixian address; inline validation
  (format/length), honest error via legacy `ixian:error` grammar (chat-info M1
  latch precedent).
- **Scan entry** — button → Scan shell (Phase 1 #3, not built yet; stub the nav
  now, real camera later). QR-in / QR-out symmetry with wallet-receive.
- **Send request** — emits the friend-request `ixian:` command (confirm exact
  verb + payload against **`bridge-audit-A.md`**, Contacts/Home sections).
  Optimistic "request sent" + latched state; failure = inline, not alert.
- Reuse: topbar `variant:'view'` + back · `c-search-field`/field grammar ·
  `c-avatar` · the contact-request row pattern in `chatlist-item.js`.

### Bridge
Frozen. Inventory = **`docs/audit/bridge-audit-A.md`** (Contacts, Home, Launch,
Wallet). Missing → a §8/§9 proposal in `ARCHITECTURE.md`, never a new `ixian:`
command. Log any BE ask (e.g. add-by-nickname vs address-only).

### Interview Damir FIRST on the unknowns
- Add-contact entry point(s): dedicated screen vs a sheet off the chats shell?
- Address-only, or nickname/handle lookup too?
- Post-add destination: open the new conversation, or return to the list?
- Contact-profile actions for a **non-friend** (request pending) vs an accepted
  contact.

---

## Working agreements (unchanged, #142)
Code-first per surface: spec (interview Damir on unknowns) → build on the mock
bridge + smoke assertions → **Damir** runs `node scripts/build-demo-bundle.mjs`
then `node scripts/smoke-test.mjs` locally → demo pass → `DECISIONS.md` row →
commit. **No sandbox builds/e2e** (mount serves stale/truncated copies of
file-tool-edited files — verify on real files in a real terminal only). Use
Read/Edit/Write for all source.

## Proposed DECISIONS row (paste when committing this handoff)
> **#152 | 2026-07-05 | Account-shell completion batch (Downloads/Dev/Contributors
> screens) built by fable on the PC was never committed → absent from origin +
> the Mac clone; not recoverable via git on the Mac (clean tree, no stash, no
> dangling objects). DECISION (Damir): PARK it — Mac work continues + pushes; at
> home, on the PC, commit the batch FIRST then pull/merge (see handoff-fable-next-batch.md
> §🏠). Merge is additive: hub rows + `onDownloads/onContributors/onDev` callbacks
> already exist (settings-shell.js:273/747–757); only screen builders +
> settings.html:310–312 placeholders change. Shared-file conflicts limited to the
> generated bundle + DECISIONS/CLAUDE/smoke (regenerate / keep-both). Merge-safety
> rule: next batch must not touch settings-*.js. Fable proceeds to Phase 1 #2
> Contacts. Carried: #151 RTL knob 🟡. | Damir "keep to merge later" call |
> 🟡 recover-from-PC · ✅ next batch = Contacts**
