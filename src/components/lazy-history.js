/**
 * c-history — LAZY history pagination (DECISIONS #86: no "load more" button —
 * nearing the top auto-fires `ixian:loadmore`, a spinner row shows, and the
 * scroll anchor is preserved when older rows prepend).
 *
 * attachLazyHistory(box, { onLoadMore, threshold = 160, strings, canLoad, spinner = true, keepPosition = true })
 *   box        — the scrolling message container (role=log)
 *   onLoadMore — shell hook: fire ixian:loadmore, PREPEND the older rows,
 *                then resolve. Resolve `false` when history is exhausted
 *                (detaches — no further loads). Resolve `0` when the load
 *                added nothing: no automatic re-check (a scroll re-arms it),
 *                so an empty answer can never loop the verb.
 *   threshold  — px from the top that fires a load; a number, or a function
 *                read at each check (★ #1166 B2: the chat shell passes ~one
 *                screen, so the next page is asked for before the top is hit).
 *   canLoad    — optional predicate read FIRST at each check (★ #1166 B2: the
 *                chat shell's "C# says more exists, nothing in flight, not the
 *                pill mode") — false = this scroll does nothing.
 *   spinner    — false: the host paints its own loading row (★ #1166 B2: the
 *                chat shell rebuilds its log from a model, so a row poked in
 *                from here would be destroyed by the next render).
 *   keepPosition — false: the host restores the reading position itself
 *                (★ #1166 B2: the chat shell anchors by the first VISIBLE row
 *                at the moment the rows land — a height delta measured at the
 *                request would double-apply on top of it).
 *   Re-entrancy guarded; scroll restored so the previously-visible message
 *   stays put (scrollTop += height delta) unless keepPosition is false.
 * Returns { setDone(), check() } — shell can end pagination early (e.g. chat
 * cleared) or ask for a check without a scroll event.
 */
import { getStrings } from './strings-runtime.js';

export function attachLazyHistory(box, { onLoadMore, threshold = 160, strings = getStrings(), canLoad = null, spinner: useSpinner = true, keepPosition = true } = {}) {
  let loading = false;
  let done = false;

  const spinner = () => {
    const row = document.createElement('div');
    row.className = 'c-history-loading';
    row.setAttribute('role', 'status');
    row.setAttribute('aria-label', strings.loadingHistory || 'Loading earlier messages');
    const sp = document.createElement('span');
    sp.className = 'c-history-loading__spinner';
    sp.setAttribute('aria-hidden', 'true');
    row.append(sp);
    return row;
  };

  const limit = () => {
    const t = typeof threshold === 'function' ? threshold() : threshold;
    return Number.isFinite(t) ? t : 160;
  };

  const check = () => {
    if (loading || done || !onLoadMore) return;
    if (canLoad && !canLoad()) return;
    if (box.scrollTop > limit()) return;
    loading = true;
    const h0 = box.scrollHeight; // anchor BEFORE spinner + new rows
    const sp = useSpinner ? spinner() : null;
    if (sp) box.prepend(sp);
    Promise.resolve(onLoadMore()).then((result) => {
      if (sp) sp.remove();
      // keep the previously-visible message in place after the prepend
      if (keepPosition) box.scrollTop += box.scrollHeight - h0;
      if (result === false) {
        done = true;
        box.removeEventListener('scroll', check);
      }
      loading = false;
      // content may still sit above the threshold (short pages) — re-check;
      // a load that added nothing waits for the next scroll instead (#1166 B2)
      if (!done && result !== 0) check();
    }).catch(() => {
      if (sp) sp.remove();
      loading = false; // failed page loads stay retryable on the next scroll
    });
  };

  box.addEventListener('scroll', check, { passive: true });
  return {
    setDone() {
      done = true;
      box.removeEventListener('scroll', check);
    },
    check,
  };
}
