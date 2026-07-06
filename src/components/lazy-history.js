/**
 * c-history — LAZY history pagination (DECISIONS #86: no "load more" button —
 * nearing the top auto-fires `ixian:loadmore`, a spinner row shows, and the
 * scroll anchor is preserved when older rows prepend).
 *
 * attachLazyHistory(box, { onLoadMore, threshold = 160, strings })
 *   box        — the scrolling message container (role=log)
 *   onLoadMore — shell hook: fire ixian:loadmore, PREPEND the older rows,
 *                then resolve. Resolve `false` when history is exhausted
 *                (detaches — no further loads).
 *   Re-entrancy guarded; scroll restored so the previously-visible message
 *   stays put (scrollTop += height delta).
 * Returns { setDone() } — shell can end pagination early (e.g. chat cleared).
 */
import { getStrings } from './strings-runtime.js';

export function attachLazyHistory(box, { onLoadMore, threshold = 160, strings = getStrings() } = {}) {
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

  const check = () => {
    if (loading || done || !onLoadMore) return;
    if (box.scrollTop > threshold) return;
    loading = true;
    const h0 = box.scrollHeight; // anchor BEFORE spinner + new rows
    const sp = spinner();
    box.prepend(sp);
    Promise.resolve(onLoadMore()).then((result) => {
      sp.remove();
      // keep the previously-visible message in place after the prepend
      box.scrollTop += box.scrollHeight - h0;
      if (result === false) {
        done = true;
        box.removeEventListener('scroll', check);
      }
      loading = false;
      // content may still sit above the threshold (short pages) — re-check
      if (!done) check();
    }).catch(() => {
      sp.remove();
      loading = false; // failed page loads stay retryable on the next scroll
    });
  };

  box.addEventListener('scroll', check, { passive: true });
  return {
    setDone() {
      done = true;
      box.removeEventListener('scroll', check);
    },
  };
}
