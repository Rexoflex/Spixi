/**
 * Chat-list timestamp formatting (docs/chat-list-spec.md §3).
 * today → HH:mm (12/24h follows device locale) · yesterday → localized
 * "Yesterday" · 2–6 days → weekday · same year → DD MMM · older → DD MMM YYYY.
 * Locale from document/browser; localized strings arrive via window.SL
 * (i18n plan, ARCHITECTURE.md §7).
 */
export function formatChatTimestamp(ts, strings = {}, now = Date.now()) {
  const d = new Date(ts);
  const n = new Date(now);
  const locale = document.documentElement.lang || undefined;

  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(n) - startOfDay(d)) / 86400000);

  if (dayDiff <= 0) {
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }
  if (dayDiff === 1) return strings.yesterday || 'Yesterday';
  if (dayDiff < 7) return d.toLocaleDateString(locale, { weekday: 'long' });
  if (d.getFullYear() === n.getFullYear()) {
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
  }
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Absolute timestamp for transaction rows (docs/tx-row-spec.md): "20 Mar, 9:15".
 * Device locale for month + 12/24h; no ticker — absolute dates don't go stale.
 */
export function formatTxTimestamp(ts, now = Date.now()) {
  const d = new Date(ts);
  const locale = document.documentElement.lang || undefined;
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  const date = d.toLocaleDateString(locale, sameYear
    ? { day: 'numeric', month: 'short' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  return date + ', ' + time;
}

let activeStop = null; // single shared ticker — starting a new one stops the previous

/**
 * One shared scheduler (not per-row timers): fires `cb` every minute while the
 * page is visible (today-times may change), at midnight rollover
 * (re-classification of every row), and immediately when the document becomes
 * visible again (timers are skipped/suspended while hidden). Ticks are aligned
 * to the minute boundary. Returns a stop function.
 */
export function startTimestampTicker(cb) {
  if (activeStop) activeStop();

  let minuteTimeout, minuteInterval, midnightTimer;
  const tick = () => { if (!document.hidden) cb(); };

  // align to the next minute boundary, then every 60s
  minuteTimeout = setTimeout(() => {
    tick();
    minuteInterval = setInterval(tick, 60000);
  }, 60000 - (Date.now() % 60000));

  const scheduleMidnight = () => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    return setTimeout(() => { cb(); midnightTimer = scheduleMidnight(); }, next - now);
  };
  midnightTimer = scheduleMidnight();

  const onVisibility = () => { if (!document.hidden) cb(); };
  document.addEventListener('visibilitychange', onVisibility);

  const stop = () => {
    clearTimeout(minuteTimeout);
    clearInterval(minuteInterval);
    clearTimeout(midnightTimer);
    document.removeEventListener('visibilitychange', onVisibility);
    if (activeStop === stop) activeStop = null;
  };
  activeStop = stop;
  return stop;
}
