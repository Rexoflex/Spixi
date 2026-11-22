/* ==== fixb3 item 2 (n-20261113-delete-history-chat-info-media, #1744 (3), packet P85) — "Delete history" on Windows: chat info
 * still showed the media and the files of the deleted history.
 *
 * Mechanism (docs/fixb3-mechanisms.md §§ 0–1): the shell asks for the shared items ONCE at boot (`ixian:sharedItems`); C# scans off
 * the UI thread and answers ONE `setSharedItems` push. After "Delete history" nothing asked again and nothing pushed, so a page that
 * stays open (Windows: the chat-info pane beside the chat) kept the deleted list; the shell's `removeHistoryResult` forgets storage
 * keys only. And ContactDetails.onRemoveHistory was a second, drifting copy of SContacts.removeHistory WITHOUT the Sent sweep (§ 0).
 * Fix (C# only, no switch — a hole-closing fix, #1321): onRemoveHistory = `if (SContacts.removeHistory(friend)) { the existing
 * removeHistoryResult push; pushSharedItems(); the existing alert }`; pushSharedItems = the old ixian:sharedItems body + a scan token
 * (SharedScanGate, Spixi/Utils/FixB3ChatInfoRules.cs) taken before the task and checked with isDisposed on the main thread before the
 * ONE push; HomePage.onRemoveHistoryFor (the chats-list "Delete chat") calls refreshSharedItemsAfterDelete on every OPEN
 * ContactDetails of that contact, on "ok" only.
 * The gate RUNS in csh (scripts/csh/FixB3ChatInfoTests.cs). ContactDetails / HomePage / SContacts are MAUI-bound and UNCOMPILED here,
 * so k1–k4 are SOURCE pins on the comment-stripped text (stripCode; brace-matched bodies) — with the source-pin limits (#1627 / #1735):
 * they hold text, not bindings (a shadow type named SContacts / SharedScanGate, an alias, a hidden `#define`, a csproj `Compile
 * Remove` is not seen; the pull request's diff review and the Windows compile hold those). k5 is BEHAVIOUR on the BUILT shell (jsdom).
 *   k1 onRemoveHistory   — its WHOLE body is: `if (SContacts.removeHistory(friend)) { try { <removeHistoryResult push, "ok"> } catch
 *                          (Exception) { } pushSharedItems(); <the deleted-history alert> }`; ContactDetails calls `.deleteHistory(`
 *                          nowhere; onRemoveHistory is named only by the verb branch (the confirm path + the direct path).
 *                          LIMIT: the text of CD only — that SContacts.removeHistory does the clears is k2's.
 *   k2 scRemoveHistory   — SContacts.removeHistory (read only for this batch) still returns false when `friend.deleteHistory()` fails
 *                          and, after it, in this order: the three local-store clears, `scheduleSentSweep();`,
 *                          `ChatMediaStore.deleteChat(friend.walletAddress);`, the arrivals forget, the contacts flush, the open chat's
 *                          loadMessages, `return true;` — so every chat-info delete reaches the Sent sweep (§ 0 row 1).
 *                          ★ fixer-f3 (#46 r2 S n-4): and `public const long SentSweepMinAgeSeconds = 600;` once (ageConst).
 *                          LIMIT: the order of statements in one body + that constant. What scheduleSentSweep deletes is the
 *                          rule PhotoRules.sentSweepVictims (csh S9MediaTests, with the age as a PARAMETER) and its call with
 *                          SentSweepMinAgeSeconds (pins-s9/a1-wiring) — neither holds the value 600; ageConst does.
 *   k3 scanGate          — pushSharedItems: `!friend.bot` first; `int scanToken = sharedScanGate.begin();` BEFORE `Task.Run`; inside, the
 *                          old scan line; on the main thread `if (!page.sharedScanGate.isLatest(scanToken) || page.isDisposed) { return; }`
 *                          then the ONE `setSharedItems` push; the catch's log is a fixed prefix + the exception TYPE name only.
 *                          The `ixian:sharedItems` branch is ONLY `pushSharedItems();`; refreshSharedItemsAfterDelete is ONLY a
 *                          try { pushSharedItems(); } with a type-only warn; pushSharedItems is called exactly at those three
 *                          sites; the gate is one readonly field, used only by begin / isLatest. In the new and changed spans: no
 *                          `ixian:` string but the old log prefix (no new verb), push names only setSharedItems / removeHistoryResult
 *                          (no new push), every Logging argument a fixed literal + `ex.GetType().Name`. csh.csproj compiles the REAL
 *                          FixB3ChatInfoRules.cs once and FixB3ChatInfoTests holds ≥ 7 tests.
 *                          LIMIT: the spans this batch wrote — a verb added elsewhere in CD is the diff review's, not this key's.
 *   k4 hpRefresh         — HomePage.onRemoveHistoryFor: `deleted` is set only right after `status = "ok";` inside
 *                          `if (SContacts.removeHistory(f))`; AFTER the removeHistoryResult push ONE block `if (status == "ok" &&
 *                          deleted != null) { try { foreach overlay page: ContactDetails whose friendAddressString() == deleted →
 *                          refreshSharedItemsAfterDelete(); } catch → a type-only warn }`; the REST of the body is the base body
 *                          (14ae57f2) — SHA-256 of the stripped, whitespace-collapsed text; refreshSharedItemsAfterDelete is named in
 *                          Spixi/ only by its declaration (CD) and this call (HP).
 *                          LIMIT: that this runs on the UI thread is read from the code path (onNavigating), not proven here.
 *   k5 shellClears       — BEHAVIOUR on the BUILT contact_details.html (read only; the s5 viewer pin's jsdom loader): two media rows →
 *                          the shared section is drawn; `removeHistoryResult(addr, "ok")` ALONE leaves it (the bug's mechanism: the
 *                          shell does not clear it); then `setSharedItems("[]")` → the section is gone. Ten media rows → "Show all"
 *                          opens the cover; `removeHistoryResult` + `setSharedItems("[]")` → the cover closes and the section goes.
 *                          So the C# re-push is enough: no shell change. LIMIT: jsdom, not a WebView (no layout, no paint).
 *   ★ fixer-12 (#46 r1): k1 and refreshBody now start with `viewerLatest = null;`; k3 holds pushSharedItems WHOLE (pushWhole, S M-2:
 *   a fragment pin let `Friend scanned = <another contact>` through) and the sharedDeleteLocal branch's `Friend scanned = friend;`
 *   (delScansOwnContact), both scans with `remember: false` and `SharedItems.remember(scanned, items);` right after the gate.
 *   k6 cacheAfterGate    — (S m-1) SharedItems.scan(Friend, bool remember = true) writes lastScan ONLY when remember (the default keeps
 *                          every other caller as before — today there is none); remember(friend, items) = the same key, the same
 *                          cacheLock, never throws (body held whole); every lastScan read / write sits in a `lock (cacheLock)`; in
 *                          Spixi/ `SharedItems.scan(` is called only by CD, twice, both `remember: false`, and `SharedItems.remember(`
 *                          only by CD, twice (after each gate). LIMIT: SharedItems.cs is MAUI / Core-bound, not in csh — a text read;
 *                          that BeginInvokeOnMainThread orders the scan's writes of the list before remember is the runtime's, not
 *                          proven here; the cache is static per ADDRESS, so two open pages of ONE contact still share it (as before).
 *                          ★ fixer-f3 (#46 r2 S n-1): emptiedAtDelete — onRemoveHistory (on success) and refreshSharedItemsAfterDelete
 *                          call `SharedItems.remember(friend, new List<SharedItem>());` BEFORE pushSharedItems(): resolve() answers no
 *                          token of the deleted history between the delete and the re-scan's push (remember is then called by CD 4×).
 *   k7 viewerReset       — (S m-2) viewerLatest stays `private volatile string?`, written only by the tap (`= token`) and the two delete
 *                          sites (`= null`: onRemoveHistory after a successful delete, refreshSharedItemsAfterDelete); stillWanted is
 *                          unchanged and is read AGAIN on the main thread before the viewerImage push, so a decode already queued
 *                          there pushes nothing after a delete. LIMIT: a text read; an OPEN viewer in the shell whose item left the
 *                          list is the shell's half (src/**, not this batch's): it keeps waiting / shows what it had.
 *   k8 pushTarget        — (fixer-f3, #46 r2 S m-1) the sharedView and the sharedDeleteLocal branches: `ContactDetails page = this;`
 *                          is the ONE assignment to `page` in each (`/\bpage\s*=[^=]/` once), the delete branch has `Friend scanned =
 *                          friend;`, and neither passes page / scanned by ref / out / in. LIMIT: a text read of the stripped branches.
 *   k9 noDirective       — (fixer-f3, #46 r2 S n-3) the RAW text (not stripCode's) of ContactDetails.xaml.cs has NO line that starts
 *                          with `#` after leading whitespace: not in the spans k1–k8 hold (the sharedView + sharedDeleteLocal
 *                          branches; onRemoveHistory, pushSharedItems, refreshSharedItemsAfterDelete) and not in the rest of the file
 *                          (a `#if false` … `#endif` around a span would hide it from the compile while the pins still read it; a
 *                          `#region /*` makes stripCode drop COMPILED code up to the next comment close). Today there is none.
 *                          LIMIT (#1627, the hidden-code class): CD only — SContacts / SharedItems / HomePage are read stripped as
 *                          before; a write by reference through a helper (`M(ref x)` outside the branches, `Unsafe.AsRef`), a shadow
 *                          type, an alias, a csproj Compile Remove are not seen (the diff review and the Windows compile hold those).
 * Deliberate breaks (#802; each a one-token / one-statement mutation in a full temp copy, run with `run-pins --root <copy>`, then
 * deleted; each red on its key ONLY, the other four green):
 *   k1 CD `if (SContacts.removeHistory(friend))` → `if (SContacts.removeContact(friend))` → wholeBody;
 *   k2 SC removeHistory without its `scheduleSentSweep();` (SC:631, not the removeContact / leaveGroup ones) → eachOnce, inOrder,
 *      noReturnBeforeTheSweep;
 *   k3 CD `if (!page.sharedScanGate.isLatest(scanToken) …` → `if (page.sharedScanGate…` → gateThenOnePush;
 *   k4 HP `open.friendAddressString() == deleted` → `!= deleted` → blockText;
 *   k5 the BUILT shell's setSharedItems without its `refreshSharedTakeover();` → coverClosed.
 *   csh: SharedScanGate.isLatest `==` → `>=` → 6 of the 7 FixB3ChatInfoTests red.
 *   fixer-12: k3 pushSharedItems `Friend scanned = friend;` → `Friend scanned = FriendList.friends.Count > 0 ? FriendList.friends[0] :
 *   friend;` → pushWhole; the same in the sharedDeleteLocal branch → delScansOwnContact; k6 SharedItems.scan `if (remember)` →
 *   `if (true)` → scanWrite; k7 the sharedView main-thread `if (!stillWanted())` → `if (page.isDisposed)` → mainThreadRecheck;
 *   k7 refreshSharedItemsAfterDelete without `viewerLatest = null;` → resets (and k3 refreshBody).
 *   fixer-f3 (#46 r2): k8 the sharedView branch `ContactDetails page = this;` → `ContactDetails page = this; page = <another open
 *   ContactDetails>;` → viewPageIsThis; the same in the sharedDeleteLocal branch → delPageIsThis; k6 onRemoveHistory without its
 *   `SharedItems.remember(friend, new List<SharedItem>());` → emptiedAtDelete (and k1 wholeBody); k2 `= 600;` → `= 60;` → ageConst;
 *   k9 a `#region x` line inside pushSharedItems → noDirectiveInSpans + noDirectiveInFile. */
import { createHash } from 'node:crypto';

export const CD_F = 'Spixi/Pages/Contacts/ContactDetails.xaml.cs', HP_F = 'Spixi/Pages/Home/HomePage.xaml.cs', SC_F = 'Spixi/Utils/SContacts.cs';
/* SHA-256 of onRemoveHistoryFor's body at the base 14ae57f2 (git show 14ae57f2:Spixi/Pages/Home/HomePage.xaml.cs): stripCode, whitespace collapsed */
export const HP_BASE_REST = 'c6f726021c5962c760a449cde025911d8604a7b11e641354c5db7c77de0d4ee6';

export const norm = (t) => t.replace(/\s+/g, ' ').trim();
export const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
/** the brace-matched block that opens at the first `{` after `from` (string and char literals skipped) */
export const blockAt = (t, from) => {
  const o = t.indexOf('{', from);
  if (o < 0) return { o: -1, end: -1, text: '' };
  let d = 0;
  for (let k = o; k < t.length; k++) {
    const c = t[k];
    if (c === '"') { const verb = t[k - 1] === '@'; k++; while (k < t.length && !(t[k] === '"' && !(verb && t[k + 1] === '"'))) { if (!verb && t[k] === '\\') k++; else if (verb && t[k] === '"') k++; k++; } continue; }
    if (c === '\'') { const m = /^'(?:\\.[^']*|[^'\\\n])'/.exec(t.slice(k, k + 12)); if (m) { k += m[0].length - 1; continue; } }
    if (c === '{') d++; else if (c === '}' && --d === 0) return { o, end: k + 1, text: t.slice(o, k + 1) };
  }
  return { o, end: -1, text: '' };
};
/** the body of the ONE member with this signature ('' when absent or not unique) */
export const bodyOf = (t, sig) => {
  if (t.split(sig).length - 1 !== 1) return '';
  return blockAt(t, t.indexOf(sig) + sig.length).text;
};
/** onRemoveHistoryFor's body with the fixb3 parts taken out — compared with the base body */
export const hpRest = (body) => {
  const at = body.indexOf('if (status == "ok" && deleted != null)');
  let rest = body;
  if (at >= 0) { const b = blockAt(body, at); if (b.end > 0) rest = body.slice(0, at) + body.slice(b.end); }
  return norm(rest.replace(/string\? deleted = null;/, '').replace(/deleted = f\.walletAddress\?\.ToString\(\);/, ''));
};

export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, existsSync, join, JSDOM, VirtualConsole, sleep } = h;
  const raw = (f) => (existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8').replace(/^﻿/, '') : '');
  const rd = (f) => stripCode(raw(f));
  const count = (t, s) => (typeof s === 'string' ? t.split(s).length - 1 : (t.match(s) || []).length);
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const CD = rd(CD_F), HP = rd(HP_F), SC = rd(SC_F);

  const ON_REMOVE = bodyOf(CD, 'private void onRemoveHistory()');
  const PUSH = bodyOf(CD, 'private void pushSharedItems()');
  const REFRESH = bodyOf(CD, 'public void refreshSharedItemsAfterDelete()');
  const HPB = bodyOf(HP, 'private void onRemoveHistoryFor(string address)');
  const hpAt = HPB.indexOf('if (status == "ok" && deleted != null)');
  const HPBLOCK = hpAt >= 0 ? blockAt(HPB, hpAt).text : '';

  /* ── k1 · onRemoveHistory is SContacts.removeHistory + the two pushes + the alert ── */
  const RESULT_PUSH = 'try { Utils.sendUiCommand(this, "removeHistoryResult", friend.walletAddress.ToString(), "ok"); } catch (Exception) { }';
  const ALERT = 'displaySpixiAlert(SpixiLocalization._SL("contact-details-deletedhistory-title"), SpixiLocalization._SL("contact-details-deletedhistory-text"), SpixiLocalization._SL("global-dialog-ok"));';
  const k1 = {
    found: ON_REMOVE.length > 20,
    wholeBody: norm(ON_REMOVE) === norm('{ if (SContacts.removeHistory(friend)) { viewerLatest = null; SharedItems.remember(friend, new List<SharedItem>()); ' + RESULT_PUSH + ' pushSharedItems(); ' + ALERT + ' } }'),   // ★ fixer-12 (#46 r1 S m-2): the viewer token reset first · ★ fixer-f3 (#46 r2 S n-1): then the cache emptied
    noDeleteHistoryInCd: count(CD, /\.deleteHistory\s*\(/g) === 0,
    namedOnlyByTheVerb: count(CD, /\bonRemoveHistory\b/g) === 3
      && /confirmThen\(SafetyRules\.ConfirmVerb\.RemoveHistory, "removeHistoryResult", onRemoveHistory\);\s*\}\s*else\s*\{\s*onRemoveHistory\(\);\s*\}/.test(CD),
  };
  ok(F(k1).length === 0,
    '★ fixb3 k1 onRemoveHistory (item 2, P85): chat info › Delete history runs ONE body — `if (SContacts.removeHistory(friend)) { the removeHistoryResult push ("ok"); pushSharedItems(); the deleted-history alert }`, nothing else; ContactDetails calls `.deleteHistory(` nowhere; onRemoveHistory is named only by the ixian:removehistory branch (confirm + direct). LIMIT: CD text only (k2 holds what SContacts.removeHistory does) — failing: ' + JSON.stringify(F(k1)));

  /* ── k2 · SContacts.removeHistory still runs the Sent sweep and the store delete after deleteHistory ── */
  const SCB = bodyOf(SC, 'public static bool removeHistory(Friend friend)');
  const SC_ORDER = [
    'if (!friend.deleteHistory())',
    'SReactionFlags.clear(friend.walletAddress?.ToString());',
    'SAppDeclines.clear(friend.walletAddress?.ToString());',
    'SPeerLocalStores.forget(friend.walletAddress?.ToString());',
    'scheduleSentSweep();',
    'ChatMediaStore.deleteChat(friend.walletAddress);',
    'CoreMessageWriter.arrivals.forgetAddress(friend.walletAddress.ToString());',
    'UIHelpers.shouldRefreshContacts = true;',
    'chat_page.loadMessages();',
    'return true;',
  ];
  const pos = SC_ORDER.map((s) => (count(SCB, s) === 1 ? SCB.indexOf(s) : -1));
  const k2 = {
    found: SCB.length > 20,
    eachOnce: pos.every((p) => p >= 0),
    inOrder: pos.every((p, i) => i === 0 || p > pos[i - 1]),
    falseOnFail: /if \(!friend\.deleteHistory\(\)\)\s*\{\s*return false;\s*\}/.test(SCB),
    noReturnBeforeTheSweep: pos[4] > 0 && count(SCB.slice(pos[0], pos[4]), /\breturn\b/g) === 1,
    sweepIsSc: count(SC, 'public static void scheduleSentSweep()') === 1,
    /* ★ fixer-f3 (#46 r2 S n-4): the sweep's age floor (P85 row 1 names 600 s) — pins-s9 holds only that the sweep USES the name */
    ageConst: count(SC, 'public const long SentSweepMinAgeSeconds = 600;') === 1 && count(SC, /\bSentSweepMinAgeSeconds\s*=[^=]/g) === 1,
  };
  ok(F(k2).length === 0,
    '★ fixb3 k2 scRemoveHistory (item 2, § 0): SContacts.removeHistory (read only) returns false when friend.deleteHistory() fails and after it runs, in order, the three local-store clears, scheduleSentSweep(), ChatMediaStore.deleteChat(friend.walletAddress), the arrivals forget, the contacts flush, the open chat\'s loadMessages, return true — so every chat-info delete reaches the Sent sweep; SentSweepMinAgeSeconds is declared once, = 600. LIMIT: statement order in one body + the constant; what the sweep deletes is the rule PhotoRules.sentSweepVictims (csh S9MediaTests) and its call with that constant (pins-s9/a1-wiring) — failing: ' + JSON.stringify(F(k2)));

  /* ── k3 · the scan gate in pushSharedItems; no new verb, push or log value ── */
  const tokAt = PUSH.indexOf('int scanToken = sharedScanGate.begin();');
  const runAt = PUSH.indexOf('System.Threading.Tasks.Task.Run(');
  const MAIN = /MainThread\.BeginInvokeOnMainThread\(\(\) =>\s*\{\s*if \(!page\.sharedScanGate\.isLatest\(scanToken\) \|\| page\.isDisposed\)\s*\{\s*return;\s*\}\s*SharedItems\.remember\(scanned, items\);\s*Utils\.sendUiCommand\(page, "setSharedItems", json\);\s*\}\);/;
  /* ★ fixer-12 (#46 r1 S M-2): pushSharedItems WHOLE (stripped, whitespace collapsed) — a fragment pin let `Friend scanned = <another contact>` through */
  const PUSH_WHOLE = '{ if (!friend.bot) { Friend scanned = friend; ContactDetails page = this; int scanToken = sharedScanGate.begin(); System.Threading.Tasks.Task.Run(() => { try { List<SharedItem> items = page.p1NoteShared(SharedItems.scan(scanned, remember: false)); string json = SharedItems.toJson(items); MainThread.BeginInvokeOnMainThread(() => { if (!page.sharedScanGate.isLatest(scanToken) || page.isDisposed) { return; } SharedItems.remember(scanned, items); Utils.sendUiCommand(page, "setSharedItems", json); }); } catch (Exception ex) { Logging.warn("ixian:sharedItems: " + ex.GetType().Name); } }); } }';
  const delAt = CD.indexOf('else if (current_url.StartsWith("ixian:sharedDeleteLocal:", StringComparison.Ordinal))');
  const delEnd = CD.indexOf('else if (current_url.StartsWith("ixian:sharedShowInDownloads:", StringComparison.Ordinal))');
  const DEL = delAt > 0 && delEnd > delAt ? CD.slice(delAt, delEnd) : '';
  const NEW_SPANS = [ON_REMOVE, PUSH, REFRESH, HPBLOCK];
  const literals = (t) => [...t.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)].map((m) => m[1]);
  const pushNames = (t) => [...t.matchAll(/sendUiCommand\(\s*\w+\s*,\s*"([^"]*)"/g)].map((m) => m[1]);
  const logArgs = (t) => [...t.matchAll(/Logging\.\w+\(/g)].map((m) => { const s = t.indexOf('(', m.index); let d = 0; for (let k = s; k < t.length; k++) { if (t[k] === '(') d++; else if (t[k] === ')' && --d === 0) return t.slice(s + 1, k); } return ''; });
  const csproj = raw('scripts/csh/csh.csproj');
  const tests = raw('scripts/csh/FixB3ChatInfoTests.cs');
  const k3 = {
    found: PUSH.length > 20 && REFRESH.length > 10,
    botFirst: /^\{\s*if \(!friend\.bot\)\s*\{/.test(PUSH),
    tokenBeforeTask: tokAt > 0 && runAt > tokAt && count(PUSH, 'sharedScanGate.begin()') === 1,
    scanLine: count(PUSH, 'List<SharedItem> items = page.p1NoteShared(SharedItems.scan(scanned, remember: false));') === 1 && count(PUSH, 'string json = SharedItems.toJson(items);') === 1,
    pushWhole: norm(PUSH) === norm(PUSH_WHOLE),
    /* ★ fixer-12 (#46 r1 S M-2): the sharedDeleteLocal re-push scans the page's OWN contact, never reassigned, with the same cache rule */
    delScansOwnContact: DEL.length > 200 && count(DEL, 'Friend scanned = friend;') === 1 && count(DEL, /\bscanned\s*=[^=]/g) === 1
      && count(DEL, 'List<SharedItem> items = page.p1NoteShared(SharedItems.scan(scanned, remember: false));') === 1 && count(DEL, 'string json = SharedItems.toJson(items);') === 1
      && count(DEL, /\bSharedItems\.scan\(/g) === 1 && count(DEL, /\bitems\s*=[^=]/g) === 1,
    gateThenOnePush: MAIN.test(PUSH) && count(PUSH, 'sendUiCommand(') === 1 && PUSH.indexOf('MainThread.BeginInvokeOnMainThread') > runAt,
    typeOnlyWarn: /catch \(Exception ex\)\s*\{\s*Logging\.warn\("ixian:sharedItems: " \+ ex\.GetType\(\)\.Name\);\s*\}/.test(PUSH),
    branchIsHelper: /else if \(current_url\.Equals\("ixian:sharedItems", StringComparison\.Ordinal\)\)\s*\{\s*pushSharedItems\(\);\s*\}/.test(CD)
      && count(CD, '"ixian:sharedItems"') === 1,
    refreshBody: norm(REFRESH) === norm('{ try { viewerLatest = null; SharedItems.remember(friend, new List<SharedItem>()); pushSharedItems(); } catch (Exception ex) { Logging.warn("refreshSharedItemsAfterDelete: " + ex.GetType().Name); } }'),   // ★ fixer-12 (#46 r1 S m-2): the viewer token reset · ★ fixer-f3 (#46 r2 S n-1): the cache emptied
    threeCallers: count(CD, /\bpushSharedItems\s*\(/g) === 4,   // the declaration + the branch + onRemoveHistory + refreshSharedItemsAfterDelete
    oneGateField: count(CD, 'private readonly SharedScanGate sharedScanGate = new SharedScanGate();') === 1
      && count(CD, /\bsharedScanGate\b/g) === 5 && count(CD, /\bSharedScanGate\b/g) === 2   // the field + begin / isLatest in pushSharedItems + begin / isLatest in the sharedDeleteLocal re-push (lead, #46 r1)
      && /int scanToken = sharedScanGate\.begin\(\);\s*System\.Threading\.Tasks\.Task\.Run\(\(\) =>\s*\{\s*try\s*\{\s*if \(!SharedItems\.deleteLocal\(item\)\)/.test(CD) && /if \(page\.isDisposed \|\| !page\.sharedScanGate\.isLatest\(scanToken\)\)\s*\{\s*return;\s*\}\s*SharedItems\.remember\(scanned, items\);\s*Utils\.sendUiCommand\(page, "setSharedItems", json\);/.test(DEL),   // ★ fixer-12 (#46 r1 S m-1): the cache write right after the gate, before the push
    setSharedItemsSites: count(CD, '"setSharedItems"') === 2,   // pushSharedItems + the base sharedDeleteLocal re-push
    noNewVerb: NEW_SPANS.every((t) => literals(t).filter((s) => /ixian:/i.test(s)).every((s) => s === 'ixian:sharedItems: ')),
    noNewPush: NEW_SPANS.every((t) => pushNames(t).every((n) => n === 'setSharedItems' || n === 'removeHistoryResult'))
      && pushNames(PUSH).join() === 'setSharedItems' && pushNames(ON_REMOVE).join() === 'removeHistoryResult' && pushNames(HPBLOCK).length === 0,
    logTypeOnly: NEW_SPANS.every((t) => logArgs(t).every((a) => /^"[A-Za-z :.]*" \+ ex\.GetType\(\)\.Name$/.test(a.trim())))
      && logArgs(PUSH).length === 1 && logArgs(REFRESH).length === 1 && logArgs(HPBLOCK).length === 1 && logArgs(ON_REMOVE).length === 0,
    harness: count(csproj, '<Compile Include="../../Spixi/Utils/FixB3ChatInfoRules.cs" />') === 1
      && count(tests, '[TestMethod]') >= 7 && /public sealed class SharedScanGate\b/.test(rd('Spixi/Utils/FixB3ChatInfoRules.cs')),
  };
  ok(F(k3).length === 0,
    '★ fixb3 k3 scanGate (item 2, #1744 (3)): pushSharedItems keeps the old body (bot check, Task.Run, the scan, ONE setSharedItems push, the type-only warn) and takes `sharedScanGate.begin()` BEFORE the task; on the main thread `!isLatest(scanToken) || isDisposed` returns before the push; the ixian:sharedItems branch, onRemoveHistory and refreshSharedItemsAfterDelete are its only callers; in the spans this batch wrote no new `ixian:` verb, push names setSharedItems / removeHistoryResult only, every log a fixed literal + the exception TYPE; csh compiles the REAL gate (≥ 7 tests). LIMIT: the new spans only — the diff review holds the rest of CD — failing: ' + JSON.stringify(F(k3)));

  /* ── k4 · HomePage.onRemoveHistoryFor tells an open chat info of that contact, on "ok" only ── */
  const noStr = (t) => t.replace(/"(?:[^"\\\n]|\\.)*"/g, '""');   // string literals blanked: a log text is no reference
  const walk = (d) => readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) =>
    (e.name === 'obj' || e.name === 'bin') ? [] : e.isDirectory() ? walk(d + '/' + e.name) : (/\.cs$/i.test(e.name) ? [d + '/' + e.name] : []));
  const refreshNamed = walk('Spixi').map((f) => [f, count(noStr(f === CD_F ? CD : f === HP_F ? HP : rd(f)), /\brefreshSharedItemsAfterDelete\b/g)]).filter(([, n]) => n > 0).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const resultPushAt = HPB.indexOf('try { Utils.sendUiCommand(this, "removeHistoryResult", addr, status); } catch (Exception) { }');
  const k4 = {
    found: HPB.length > 20,
    deletedOnlyOnOk: /if \(SContacts\.removeHistory\(f\)\)\s*\{\s*status = "ok";\s*deleted = f\.walletAddress\?\.ToString\(\);/.test(HPB)
      && count(HPB, /\bdeleted\s*=[^=]/g) === 2 && count(HPB, 'string? deleted = null;') === 1 && count(HPB, 'status = "ok";') === 1,
    blockAfterThePush: hpAt > 0 && resultPushAt > 0 && hpAt > resultPushAt && count(HPB, 'deleted != null') === 1,
    blockText: norm(HPBLOCK) === norm('{ try { foreach (SpixiContentPage p in SpixiContentPage.getOverlayPages()) { if (p is ContactDetails open && open.friendAddressString() == deleted) { open.refreshSharedItemsAfterDelete(); } } } catch (Exception ex) { Logging.warn("onRemoveHistoryFor: chat info " + ex.GetType().Name); } }'),
    restIsBase: sha(hpRest(HPB)) === HP_BASE_REST,
    namedTwiceInSpixi: JSON.stringify(refreshNamed) === JSON.stringify([[CD_F, 1], [HP_F, 1]].sort((a, b) => (a[0] < b[0] ? -1 : 1))),
  };
  ok(F(k4).length === 0,
    '★ fixb3 k4 hpRefresh (item 2, § 1 second path): HomePage.onRemoveHistoryFor sets `deleted` only right after status = "ok" (SContacts.removeHistory succeeded) and, AFTER the removeHistoryResult push, ONE block `if (status == "ok" && deleted != null)` walks SpixiContentPage.getOverlayPages() and calls refreshSharedItemsAfterDelete() on each ContactDetails whose friendAddressString() == deleted, in a try with a type-only warn; the rest of the body is the base 14ae57f2 body (SHA-256); the method is named in Spixi/ only by its declaration and this call. LIMIT: the UI thread is read from the code path, not proven — failing: ' + JSON.stringify(F(k4)) + ' named=' + JSON.stringify(refreshNamed) + ' rest=' + sha(hpRest(HPB)).slice(0, 12));

  /* ── k6 · (fixer-12, #46 r1 S m-1) the shared-items cache is written by the scan that passed the gate ── */
  const SI = rd('Spixi/Utils/SharedItems.cs');
  const SCAN_SIG = 'public static List<SharedItem> scan(Friend friend, bool remember = true)';
  const SCANB = bodyOf(SI, SCAN_SIG);
  const REMB = bodyOf(SI, 'public static void remember(Friend friend, List<SharedItem> items)');
  const csFiles = walk('Spixi');
  const sites = (re) => csFiles.map((f) => [f, count(noStr(f === CD_F ? CD : rd(f)), re)]).filter(([, n]) => n > 0);
  const k6 = {
    found: SCANB.length > 200 && REMB.length > 20,
    scanWrite: /if \(remember\)\s*\{\s*lock \(cacheLock\)\s*\{\s*lastScan\[friend\.walletAddress\.ToString\(\)\] = items;\s*\}\s*\}/.test(SCANB) && count(SCANB, /\blastScan\b/g) === 1,
    rememberWhole: norm(REMB) === norm('{ try { if (friend == null || friend.walletAddress == null || items == null) { return; } string key = friend.walletAddress.ToString(); lock (cacheLock) { lastScan[key] = items; } } catch (Exception) { } }'),
    everyUseLocked: count(SI, /\blastScan\b/g) === 4
      && count(SI, /lock \(cacheLock\)\s*\{\s*(?:lastScan\[[^\]]+\] = items;|if \(!lastScan\.TryGetValue\()/g) === 3
      && count(SI, 'private static readonly Dictionary<string, List<SharedItem>> lastScan') === 1,
    scanCallers: JSON.stringify(sites(/\bSharedItems\.scan\s*\(/g)) === JSON.stringify([[CD_F, 2]])
      && count(CD, 'SharedItems.scan(scanned, remember: false)') === 2,
    rememberCallers: JSON.stringify(sites(/\bSharedItems\.remember\s*\(/g)) === JSON.stringify([[CD_F, 4]])
      && count(CD, 'SharedItems.remember(scanned, items);') === 2,
    /* ★ fixer-f3 (#46 r2 S n-1): the two delete sites empty the cache BEFORE their re-scan — resolve() answers no token of the
     * deleted history in the window before the re-scan's push (k1 wholeBody / k3 refreshBody hold where) */
    emptiedAtDelete: count(CD, 'SharedItems.remember(friend, new List<SharedItem>());') === 2
      && count(ON_REMOVE, 'SharedItems.remember(friend, new List<SharedItem>());') === 1 && count(REFRESH, 'SharedItems.remember(friend, new List<SharedItem>());') === 1
      && ON_REMOVE.indexOf('SharedItems.remember(friend, new List<SharedItem>());') < ON_REMOVE.indexOf('pushSharedItems();')
      && REFRESH.indexOf('SharedItems.remember(friend, new List<SharedItem>());') < REFRESH.indexOf('pushSharedItems();'),
  };
  ok(F(k6).length === 0,
    '★ fixb3 k6 cacheAfterGate (fixer-12, #46 r1 S m-1): SharedItems.scan writes its lastScan cache only when remember (default true); chat info\'s two gated scans pass remember: false and call SharedItems.remember(scanned, items) on the main thread right after the gate, before the push — a slow OLDER scan the gate dropped cannot put a deleted history\'s items back for resolve(); remember = the same key + cacheLock, never throws; every lastScan use is locked; scan / remember are called only there; the two delete sites empty the cache (remember(friend, [])) before their re-scan. LIMIT: a text read (SharedItems.cs is not in csh); the cache stays static per address — failing: ' + JSON.stringify(F(k6)));

  /* ── k7 · (fixer-12, #46 r1 S m-2) a viewer decode of the deleted history pushes nothing ── */
  const vAt = CD.indexOf('else if (current_url.StartsWith("ixian:sharedView:", StringComparison.Ordinal))');
  const VIEW = vAt > 0 && delAt > vAt ? CD.slice(vAt, delAt) : '';
  const k7 = {
    found: VIEW.length > 200,
    volatileField: count(CD, 'private volatile string? viewerLatest = null;') === 1,
    writes: count(CD, /\bviewerLatest\s*=(?!=)/g) === 4 && count(CD, 'viewerLatest = token;') === 1 && count(CD, 'viewerLatest = null;') === 3,
    resets: /^\{\s*if \(SContacts\.removeHistory\(friend\)\)\s*\{\s*viewerLatest = null;/.test(ON_REMOVE) && /^\{\s*try\s*\{\s*viewerLatest = null;\s*SharedItems\.remember\(friend, new List<SharedItem>\(\)\);\s*pushSharedItems\(\);/.test(REFRESH),
    stillWantedSame: count(VIEW, 'Func<bool> stillWanted = () => token == page.viewerLatest && !page.isDisposed;') === 1,
    mainThreadRecheck: /MainThread\.BeginInvokeOnMainThread\(\(\) =>\s*\{\s*if \(!stillWanted\(\)\)\s*\{\s*return;\s*\}\s*Utils\.sendUiCommand\(page, "viewerImage", token, uri\);\s*\}\);/.test(VIEW)
      && count(VIEW, 'stillWanted()') === 2 && count(VIEW, '"viewerImage"') === 1,
  };
  ok(F(k7).length === 0,
    '★ fixb3 k7 viewerReset (fixer-12, #46 r1 S m-2): viewerLatest (volatile) is set to null by onRemoveHistory (after a successful delete, first) and by refreshSharedItemsAfterDelete; stillWanted (token == viewerLatest && !isDisposed) is unchanged and read again on the main thread right before the ONE viewerImage push — a decode of the deleted history, in flight or already queued, pushes nothing. LIMIT: a text read; closing an open viewer in the shell is the shell\'s half — failing: ' + JSON.stringify(F(k7)));

  /* ── k8 · (fixer-f3, #46 r2 S m-1) the push target of the sharedView and sharedDeleteLocal branches is THIS page ── */
  const VIEW_WHOLE_SHA = 'f1540a79d752fbe7f7208d090b3ee406046daf7666fa5b02e1b6be0011cec7af';
  const DEL_WHOLE_SHA = '96e31d2ad4fed8d41acb5937184130f31e1f2dc77406d406f87ea99917278ab2';
  const pageWrites = (t) => count(t, /\bpage\s*=[^=]/g);
  const byRef = (t) => count(t, /\b(?:ref|out|in)\s+(?:page|scanned)\b/g);
  const k8 = {
    found: VIEW.length > 200 && DEL.length > 200,
    viewPageIsThis: count(VIEW, 'ContactDetails page = this;') === 1 && pageWrites(VIEW) === 1,
    delPageIsThis: count(DEL, 'ContactDetails page = this;') === 1 && pageWrites(DEL) === 1,
    delScannedIsFriend: count(DEL, 'Friend scanned = friend;') === 1,
    noWriteByRef: byRef(VIEW) === 0 && byRef(DEL) === 0,
    // (lead, #46 r3 S m-1) both branches WHOLE: the normalised stripped text by SHA-256 — a deconstruction, a pattern-variable shadow or any
    // other rebinding of `page` / `scanned` changes the hash. Re-base after a look at the diff (#1596 / #1634).
    viewWhole: sha(norm(VIEW)) === VIEW_WHOLE_SHA,
    delWhole: sha(norm(DEL)) === DEL_WHOLE_SHA,
  };
  if (process.env.PIN_DUMP) console.log('DUMPB8 ' + JSON.stringify({ view: sha(norm(VIEW)), del: sha(norm(DEL)) }));
  ok(F(k8).length === 0,
    '★ fixb3 k8 pushTarget (fixer-f3, #46 r2 S m-1): in the ixian:sharedView branch and in the ixian:sharedDeleteLocal branch `ContactDetails page = this;` is the ONE assignment to `page` (the viewerImage / setSharedItems push and the gate read go to THIS page, never another open one), the delete branch scans `Friend scanned = friend;`, and neither branch passes `page` / `scanned` by ref / out / in. since #46 r3 also both branches WHOLE by SHA-256 of their normalised stripped text (viewWhole, delWhole), so any rebinding form (a deconstruction, a pattern-variable shadow) changes the hash. LIMIT: a text read of the two branches (stripped) — a whitespace-only edit is not caught; reflection is not seen — failing: ' + JSON.stringify(F(k8)));

  /* ── k9 · (fixer-f3, #46 r2 S n-3) no preprocessor line in ContactDetails: the RAW text, not the stripped one ── */
  const CDRAW = raw(CD_F);
  const DIRECTIVE = /^\s*#/gm;   // (lead, #46 r3 S n-3) any white space before `#` (form feed, vertical tab, U+00A0)
  const rawSpan = (a, b) => { const i = CDRAW.indexOf(a), j = CDRAW.indexOf(b); return count(CDRAW, a) === 1 && count(CDRAW, b) === 1 && j > i && i >= 0 ? CDRAW.slice(i, j) : ''; };
  const RAW_BRANCHES = rawSpan('else if (current_url.StartsWith("ixian:sharedView:", StringComparison.Ordinal))', 'else if (current_url.StartsWith("ixian:sharedShowInDownloads:", StringComparison.Ordinal))');
  const RAW_METHODS = rawSpan('private void onRemoveHistory()', 'public void loadTransactions()');
  const k9 = {
    found: RAW_BRANCHES.length > 1000 && RAW_METHODS.length > 1000
      && ['private void pushSharedItems()', 'public void refreshSharedItemsAfterDelete()'].every((x) => count(RAW_METHODS, x) === 1)
      && count(RAW_BRANCHES, 'else if (current_url.StartsWith("ixian:sharedDeleteLocal:", StringComparison.Ordinal))') === 1,
    noDirectiveInSpans: count(RAW_BRANCHES, DIRECTIVE) === 0 && count(RAW_METHODS, DIRECTIVE) === 0,
    noDirectiveInFile: count(CDRAW, DIRECTIVE) === 0,
  };
  ok(F(k9).length === 0,
    '★ fixb3 k9 noDirective (fixer-f3, #46 r2 S n-3): ContactDetails.xaml.cs holds NO line that starts with `#` (after leading whitespace) in its RAW text — not in the spans this pin holds (the sharedView + sharedDeleteLocal branches; onRemoveHistory, pushSharedItems, refreshSharedItemsAfterDelete) and not elsewhere in the file (a `#if` outside a span could wrap it) — so no `#if false` hides a held line from the compile and no `#region /*` hides compiled code from the stripped text k1–k8 read. LIMIT: the RAW text of CD only (#1627: a write by reference through a helper, a shadow type, an alias, a csproj Compile Remove are the diff review\'s and the Windows compile\'s) — failing: ' + JSON.stringify(F(k9)));

  /* ── k5 · behaviour on the BUILT shell: the re-push of [] clears the section and closes the cover ── */
  const htmlDir = join(root, 'Spixi/Resources/Raw/html');
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const ADDR = '1A9xQpT7vKzm3NwR5bYc8LdE2fGh4JkPq';
  const boot = async (name, waitMs = 1500) => {   // the pins-s5/viewer.mjs loader
    const f = join(htmlDir, name);
    const errs = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation/i.test(m)) errs.push(m); });
    const dom = new JSDOM(readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        const sym = Object.getOwnPropertySymbols(w.location).find((s) => s.description === 'impl');
        const impl = sym ? w.location[sym] : null;
        if (impl) Object.defineProperty(impl, 'href', { configurable: true, get() { return 'file://' + f; }, set() {} });
      },
    });
    await sleep(waitMs);
    const W = dom.window;
    const b64 = (v) => Buffer.from(String(v), 'utf8').toString('base64');
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map(b64));
    return { dom, W, push, errs };
  };
  const T = Math.floor(Date.now() / 1000);
  const media = (n) => Array.from({ length: n }, (_, i) => ['a' + i.toString(16).padStart(2, '0'), 0, 'media', 'IMG_' + i + '.jpg', 1000, T - 10 - i, 1, PNG, 1]);
  const k5 = {};
  try {
    {   /* two media rows: drawn; removeHistoryResult alone keeps them (the bug); [] removes the section */
      const { dom, W, push, errs } = await boot('contact_details.html');
      const d = W.document;
      push('setContext', 'chat'); push('setAddress', ADDR); push('setNickname', 'Ana');
      await sleep(300);
      push('setSharedItems', JSON.stringify(media(2)));
      await sleep(300);
      k5.drawn = !!d.querySelector('.c-shared') && d.querySelectorAll('.c-shared__tile').length === 2;
      push('removeHistoryResult', ADDR, 'ok');
      await sleep(300);
      k5.resultAloneKeepsIt = !!d.querySelector('.c-shared') && d.querySelectorAll('.c-shared__tile').length === 2;
      push('setSharedItems', '[]');
      await sleep(300);
      k5.emptyRemovesSection = !d.querySelector('.c-shared') && d.querySelectorAll('.c-shared__tile').length === 0;
      k5.noErrors1 = errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;
      try { dom.window.close(); } catch (e) {}
    }
    {   /* ten media rows: "Show all" opens the cover; removeHistoryResult + [] closes it */
      const { dom, W, push, errs } = await boot('contact_details.html');
      const d = W.document;
      push('setContext', 'chat'); push('setAddress', ADDR); push('setNickname', 'Ana');
      await sleep(300);
      push('setSharedItems', JSON.stringify(media(10)));
      await sleep(300);
      const all = d.querySelector('.c-shared__all');
      k5.showAll = !!all;
      if (all) all.click();
      await sleep(200);
      k5.coverOpen = !!d.querySelector('.cd-shared-takeover');
      push('removeHistoryResult', ADDR, 'ok');
      push('setSharedItems', '[]');
      await sleep(300);
      k5.coverClosed = !d.querySelector('.cd-shared-takeover');
      k5.sectionGone = !d.querySelector('.c-shared');
      k5.noErrors2 = errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;
      try { dom.window.close(); } catch (e) {}
    }
  } catch (e) {
    k5.threw = 'THREW: ' + (e && e.message);
  }
  ok(F(k5).length === 0 && Object.keys(k5).length === 9,
    '★ fixb3 k5 shellClears (item 2, BEHAVIOUR on the BUILT contact_details.html, jsdom): two media rows are drawn; removeHistoryResult(addr, "ok") ALONE leaves them (the mechanism of the bug); setSharedItems("[]") removes the shared section; with ten rows "Show all" opens the cover and removeHistoryResult + setSharedItems("[]") closes it and removes the section — so the C# re-push is enough, no shell change. LIMIT: jsdom, not a WebView — failing: ' + JSON.stringify(F(k5)) + ' ' + JSON.stringify(k5));
}
