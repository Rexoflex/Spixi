# F5 checklist — the LAUNCH FLOW round (#391: N76 · N75 · N73 · N72)

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.** See `CLAUDE.md`.

⚠ **C# changed, and four page classes were DELETED.** Wipe `Spixi\obj` and
`Spixi\bin` before you build, and wipe again between the two targets.
On Android an incremental build does NOT repackage `Resources/Raw/html` — do a
clean build, then Run.

Build order (all of it already ran green in the cloud twin; your run is the
pre-commit confirmation):

```
node scripts/extract-strings.mjs        # 706 keys · 0 fallback conflicts
node scripts/build-locales.mjs
node scripts/build-strings-iife.mjs
node scripts/build-demo-bundle.mjs      # 262 exports — READ the output
node scripts/build-shells.mjs           # 18 shells now (was 22) — READ the output
node scripts/smoke-test.mjs             # 1992 pass / the same 4 pre-existers
node scripts/i18n-lint.mjs && node scripts/pseudo-locale-smoke.mjs
```

★ **18, not 22, is correct.** The four extra launch outputs are gone:
`intro_new.html`, `intro_restore.html`, `intro_retry.html` and `onboarding.html`
were deleted from `Resources/Raw/html`. Only `intro.html` remains.

---

## 1 · N75 — the whole launch flow is ONE WebView

| # | Step | Expect |
|---|---|---|
| 1.1 | Fresh install (or delete account) → welcome | The tour, the language pill, two CTAs |
| 1.2 | Tap **Create new account** | The form appears with NO page transition and NO white/flash frame. This is the round's point |
| 1.3 | Tap **Back** | Welcome again, in place |
| 1.4 | Tap **Restore existing account** → **Back** | Same, in place |
| 1.5 | Android: hardware **Back** on the create form | Returns to welcome (it used to pop a page — same result, no flicker) |
| 1.6 | Android: hardware **Back** on welcome | Leaves the app, as before |
| 1.7 | Create an account for real | Success morph, then Home. The form STAYS disabled behind the morph — nothing re-enables while the page is leaving |
| 1.8 | Restore an account for real | Straight to Home |
| 1.9 | Wrong restore password | Inline error under the field, values kept |
| 1.10 | ★ Cold start with a wallet that needs a password | The **unlock** screen paints FIRST — no welcome frame before it |
| 1.11 | Wrong unlock password ×(retry limit+1) | Falls back to the welcome view in place; Create and Restore both refuse with "An account already exists" |
| 1.12 | Language pill → Deutsch | The page reloads translated and lands back on welcome |

## 2 · N76 — no tail, and the two steps moved

| # | Step | Expect |
|---|---|---|
| 2.1 | ★ Create an account | **NO modal after creation.** You land in the app. No backup screen, no join screen |
| 2.2 | ★ Restore an account | Same — straight in |
| 2.3 | The empty chat list | "No chats yet" + **Start a chat** + a quieter **Join the Spixi community** below it |
| 2.4 | Tap **Join the Spixi community** | The Spixi Group Chat contact request goes out and the row appears. Nothing is added until you tap — it stays opt-in |
| 2.5 | After that, the list is not empty | The CTA is gone with the empty state (that is the design: it is there for as long as it is useful) |
| 2.6 | ★ Backup nudge, fresh account, nothing done yet | **No nudge.** A new account has nothing to lose |
| 2.7 | ★ Add your first contact (or receive your first IXI) | The backup sheet appears within a second or two, ONCE |
| 2.8 | Re-open the app | It does NOT ask again (the 30-day period started at the nudge) |
| 2.9 | ★ Restore an account that has contacts | **No nudge** — a restore seeds the 30-day clock at the restore itself |

## 3 · N73 — the status-bar strip

| # | Step | Expect |
|---|---|---|
| 3.1 | ★ Android, LIGHT theme, welcome screen | The strip above the screen is the same deep violet as the screen — not a light band. Status-bar icons are LIGHT (readable) |
| 3.2 | ★ Android, LIGHT theme, the create form | Same |
| 3.3 | Android, DARK theme, both screens | Unchanged from before |
| 3.4 | ★ Android, lock screen in LIGHT theme | Free win: dark strip, light icons (it used to draw dark icons on the dark lock screen) |
| 3.5 | ★ Unlock → Home in LIGHT theme | The strip goes back to the light app surface immediately. If it stays dark, say so — that is the OnAppearing repaint |
| 3.6 | Walk Home → Account → Dev log → back | The strip matches the screen at every step, no stale colour |
| 3.7 | The Wallet tab | The hero gradient reaches the status bar (unchanged; eyeball only — the Android inset work is still AND-7, probe numbers first) |

## 4 · N72 — the appearance pill

| # | Step | Expect |
|---|---|---|
| 4.1 | Welcome screen top bar | The language pill ONLY. No appearance icon |
| 4.2 | Account → Appearance | Still works exactly as before |

---

## Known and deliberate

* Back from the **unlock** view now reaches welcome. It used to pop a root page,
  which did nothing. Both doors there refuse while a wallet exists, so this is
  safe — but it is a behaviour change, so look at it once.
* The launch ground colour changed from `#13171b` to `#1b163c` (the true top of
  `--gradient-launch`). If you prefer the old value, it is one constant in three
  places: `src/shells/launch.html` (twice) and
  `SpixiContentPage.surfaceColorFor`.
* The backup nudge fires about a second after you add your first contact,
  including the Spixi bot. That is the dial you locked; if it reads as abrupt,
  the alternative is a delay, not a different trigger.

## Commit message

```
batch: the launch flow round — one WebView, no tail, full bleed (#391, #392)

- N76: the onboarding tail is deleted. The backup nudge moved to the first
  REAL asset (a contact, or an incoming balance) and the join-bot step moved
  to the chat-list empty state, still opt-in, on the verb HomePage already
  had. OnboardPage and both onboarding preferences are gone.
- N75: LaunchCreatePage/LaunchRestorePage/LaunchRetryPage merged into
  LaunchPage. One page, one WebView, views switch in place; the boot view
  rides a *SL{} carrier so a cold unlock paints retry first. The three
  password parses moved verbatim. 22 shells -> 18.
- N73: one colour for the launch ground (instant-bg, page body, native
  surface). The Android bar strip and its icons now follow the page, not the
  app theme.
- N72: the welcome appearance picker is gone.
- smoke 1992 / the same 4 pre-existers; DECISIONS #391, security gate #392.
```

---

## 0 · Land the batch (do this first)

The tarball carries SOURCE + docs only. The generated output in
`Spixi/Resources/Raw/html` is rebuilt by your own pipeline run, and the
generators do NOT delete a stale output — so the removals are manual.

```
tar xzf spixi-launch-round-2026-08-18.tar.gz     # from the repo root

git rm Spixi/Pages/Home/OnboardPage.xaml Spixi/Pages/Home/OnboardPage.xaml.cs
git rm Spixi/Pages/Launch/LaunchCreatePage.xaml Spixi/Pages/Launch/LaunchCreatePage.xaml.cs
git rm Spixi/Pages/Launch/LaunchRestorePage.xaml Spixi/Pages/Launch/LaunchRestorePage.xaml.cs
git rm Spixi/Pages/Launch/LaunchRetryPage.xaml Spixi/Pages/Launch/LaunchRetryPage.xaml.cs
git rm Spixi/Resources/Raw/html/onboarding.html
git rm Spixi/Resources/Raw/html/intro_new.html
git rm Spixi/Resources/Raw/html/intro_restore.html
git rm Spixi/Resources/Raw/html/intro_retry.html

git rm docs/handoff-2026-08-19c.md   # consumed — or move it to docs/archive/
```

Then run the pipeline in §above. If a build still names `LaunchCreatePage`,
`LaunchRestorePage`, `LaunchRetryPage` or `OnboardPage`, a stale `obj` survived
the wipe.
