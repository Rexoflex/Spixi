# Handoff 2026-11-28 train2 — merge train 2: `qtools` and `quotebox2` in one branch; `imgurl` out (qtools' isolation check)

Session `train2` (MC `train2`; DECISIONS #2117–#2121, lesson L340, no packet; rulings #1971 (2), #1975). Lead Claude Opus;
readers fresh and read-only at high effort: Claude Fable 5.2 (security only, every round) and Claude Opus (records).
No feature, no app line written here: only merge resolutions, three re-based pins and the record.

## 0 · State
- Branch `work/train2` from `redesign/frontend` @ `b3e20d04` (the merge of pull request 31, train 1). Commits of this
  session: `dad39a3` Merge work/qtools · `d6a2e77` Merge work/quotebox2 · `381a060` resolution fix of review round 1 ·
  `79acfa0` resolution fix of review round 2 · the record commit (this file).
- In: `work/qtools` @ `0e5b5184`, `work/quotebox2` @ `b3e4b6cb`. Out: `work/imgurl` @ `86eb39d6` (#2118, § 2).
- Gates (cloud twin: Ixian-Core @ `097341a`, `npm ci` jsdom 29.1.1, .NET SDK 10.0.115, Node 22.23.5,
  `TZ=America/Los_Angeles`): smoke `BASELINE OK 7657 / the 2 KNOWN` on the final head · CSH `pass=967 fail=0` · both `--check` gates ✓ ·
  cs-syntax-check 296 files ✓ · `node scripts/size-check.mjs --base origin/redesign/frontend --head HEAD`: PASS
  (R1 app C# +83 — quotebox2's, accepted by the main chat; R2 0, R5 0, R6 0).
- ⚠ C# UNCOMPILED (quotebox2's list): `SingleChatPage.xaml.cs`, `SingleChatPage.ReplyMatch.cs`, `ContactNewPage.xaml.cs`,
  `SpixiContentPage.cs`, `SentSweepOnForget.cs`, `SpixiFlags.cs` — the Windows job of `redesign-ci` and `apple-compile`
  compile them first on the pull request. qtools' workflows (`codeql`, `sbom`, `scorecard`) run for the first time there.
- Walk: `docs/walk-train2.md` = the page "Spixi walk — train 2" (set-up T-0 … T-4; quotebox2's Q2-0 … Q2-S3, W-BUILD,
  A-BUILD, A-1). qtools has no walk rows; no Apple row in this train.

## 1 · What this session did
1. Merged `work/qtools` (conflicts: record files, `CLAUDE.md`, the gate doc, the smoke registration,
   `scripts/pins-leanfollow/d-ci.mjs`; `redesign-ci.yml` and the package files merged with no conflict).
2. Merged `work/quotebox2` (conflicts: record files, `CLAUDE.md`, `SpixiFlags.cs`, the gate doc, `be-review-pack/README.md`,
   `release-readiness.md`, the smoke registration, `scripts/pins-fixb1/g-sparekeep.mjs`; the two large C# files merged with
   no conflict and keep the base's line counts).
3. Re-based pins (each by a look at the diff; every deliberate break still red for its reason):
   - `pins-leanfollow/d-ci`: FROZEN_ENV (qtools' `BASE_SHA` second, the base's `O_SIZE` last), FROZEN_STEP_IF (the base's
     six lines), FROZEN_SMOKE_NAMES + `Size (the counter and the R2 / R5 / R6 checks)`, the row 12 label; the sizerule break
     "a further step between the size step and the annotation step" now inserts an unnamed `- run: echo hi` (row 18's name
     multiset also sees a named step). 77 rows = 64 + 8 + 5.
   - `pins-fixb1/g-sparekeep` FLAGSFILE: `9a210a2d…` (the base 689e3eee… + 45 macfixa + 58 quotebox2 lines).
   - 🟡 `pins-sizerule/c-ci` row 10 (#2119): admits exactly the qtools block `      timeout-minutes: 20` / `      env:` /
     `        BASE_SHA: ${{ github.event.pull_request.base.sha || github.event.before }}`, found once; one new break
     (the block twice). 49 = 48 + 1. **Damir confirms this, or qtools leaves the train.**
4. The review (#2121): r1 NOT CLEAN (c-ci row 10), r2 CLEAN on security, r3 CLEAN for `79acfa0` and NOT CLEAN for the
   imgurl merge → imgurl out (#2118).
5. Recorded, not fixed: `scripts/quality/gate-diff.mjs` `isCheckPath` does not list `scripts/size-check.mjs`,
   `size-count.mjs`, `size-lib.mjs`, `scripts/pins-sizerule/**` (a later PR that weakens the size check gets no
   `check-changed` item; the gate diff is a report until #2077 is ruled) — for the gate-diff batch.

## 2 · For the next train (imgurl)
The merge of `work/imgurl` @ `86eb39d6` onto `79acfa0` was made and kept in the cloud clone only
(`keep-local/train2-with-imgurl` @ `0da2d37`). It is easy to redo; what it took:
- Conflicts: `CLAUDE.md` (imgurl's bullet and its Smoke line in; the base's macfixa 7133 and sizerule 7333 Smoke lines
  go, as imgurl removed them — both are word for word in imgurl's status-log entry), `SpixiFlags.cs` (the base + 58
  quotebox2 lines + 50 imgurl lines; FLAGS_FROZEN `38df62a2…`), the gate doc (the imgurl section after quotebox2's),
  `release-readiness.md` (WK-IMGURL after WK-QUOTEBOX2), `status-log.md`, the smoke registration (pins-imgurl after
  pins-quotebox2), `pins-histcs/a-path` (REPLACES = quotebox2's two pairs, then `...IMG_REPLACES, IMG_MOVE`),
  `pins-photo1a/a-open` (the same keep-test line on both sides; quotebox2's comment kept).
- One more re-base: `pins-imgurl/b-page` `revertPage` also puts quotebox2's two in-place lines of the page back
  (`SentSweepOnForget.forget(…)` → `SPeerLocalStores.forget(…)`, the `tryReplyMatch(…)` call → `ReplyQuote.tryMatch(…)`),
  as `pins-histcs/a-path` does; then b8 is green.
- Records: move imgurl's #2035–#2057 between #2031 and #2070, L319–L326 between L318 and L329, its index section between
  quotebox2's and macfixa's (git leaves them at the end).
- **The blocker (needs a security review, #2118):** qtools' isolation check on the merged tree reports ISO-10
  (`configuration.SetUrlSchemeHandler(scheme, SPIXI.MediaGrants.Scheme)`, `Spixi/Platforms/iOS/iOSWebViewHandler.cs`, no
  census row) and ISO-6 (`new MauiWKWebView(…)` in `iOSWebViewHandler.createMediaView`, not in `PLATFORM_VIEWS` of
  `scripts/quality/isolation-check.mjs`), so `pins-qtools/c-isolation` is red. The fix: one census row in
  `docs/security-handover-gate.md` (setting · file · value `scheme, SPIXI.MediaGrants.Scheme` · verdict) and one
  `PLATFORM_VIEWS` entry (`iOSWebViewHandler.createMediaView` · `MauiWKWebView` · n 1 · reason), each read by a Fable 5.2
  security reader. Gates seen with imgurl: CSH 1018 (= 946 + 21 + 51), cs-syntax 303, size PASS (app C# +582).
