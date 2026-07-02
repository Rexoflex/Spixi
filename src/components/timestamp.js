/**
 * Chat-list timestamp formatting (docs/chat-list-spec.md §3).
 * today → HH:mm (12/24h follows device locale) · yesterday → localized
 * "Yesterday" · 2–6 days → weekday · same year → DD MMM · older → DD MMM YYYY.
 * Locale from document/browser; localized strings arrive via window.SL
 * (i18n plan, ARCHITECTURE.md §7).
 */
/** Locale for every Intl call in the components — document lang, validated.
 *  (audit r2: an invalid BCP-47 lang attr, e.g. "en_US", made every toLocale*
 *  call throw and killed whole-component rendering.) */
export function docLocale() {
  const lang = document.documentElement.lang;
  if (!lang) return undefined;
  try { Intl.getCanonicalLocales(lang); return lang; } catch { return undefined; }
}

/** Shared day-bucket ladder (chat list + conversation separators — single source,
 *  audit DRY finding). `todayLabel` null → caller handles today itself. */
export function dayBucketLabel(ts, strings = {}, now = Date.now(), todayLabel = null) {
  const d = new Date(ts);
  if (isNaN(d)) return ''; // audit r2: invalid ts rendered literal "Invalid Date"
  const n = new Date(now);
  const locale = docLocale();
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(n) - startOfDay(d)) / 86400000);
  if (dayDiff <= 0) return todayLabel; // today (or future clock skew)
  if (dayDiff === 1) return strings.yesterday || 'Yesterday';
  if (dayDiff < 7) return d.toLocaleDateString(locale, { weekday: 'long' });
  if (d.getFullYear() === n.getFullYear()) {
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
  }
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatChatTimestamp(ts, strings = {}, now = Date.now()) {
  const bucket = dayBucketLabel(ts, strings, now, null);
  if (bucket !== null) return bucket; // incl. '' for invalid ts (audit r2)
  return new Date(ts).toLocaleTimeString(docLocale(), { hour: '2-digit', minute: '2-digit' });
}

/**
 * Absolute timestamp for transaction rows (docs/tx-row-spec.md): "20 Mar, 9:15".
 * Device locale for month + 12/24h; no ticker — absolute dates don't go stale.
 */
export function formatTxTimestamp(ts, now = Date.now()) {
  const d = new Date(ts);
  if (isNaN(d)) return ''; // audit r2
  const locale = docLocale();
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
