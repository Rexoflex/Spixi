/**
 * Chat-list timestamp formatting (docs/chat-list-spec.md §3).
 * today → HH:mm (12/24h follows device locale) · yesterday → localized
 * "Yesterday" · 2–6 days → weekday · same year → DD MMM · older → DD MMM YYYY.
 * Locale from document/browser; localized strings arrive via window.SL
 * (i18n plan, ARCHITECTURE.md §7).
 */
import { getStrings } from './strings-runtime.js';
/** Locale for every Intl call in the components — document lang, validated.
 *  (audit r2: an invalid BCP-47 lang attr, e.g. "en_US", made every toLocale*
 *  call throw and killed whole-component rendering.) */
export function docLocale() {
  const lang = document.documentElement.lang;
  if (!lang) return undefined;
  try { Intl.getCanonicalLocales(lang); return lang; } catch { return undefined; }
}

/** ★ Session I (Damir's premium walk, measured): the DEVICE's 12/24-hour setting.
 *  Every time here used to follow the document LOCALE only, so a phone set to
 *  24-hour with the app in en-us printed "04:42 PM" beside Telegram's and WhatsApp's
 *  "16:42" on the same screen — the three timestamps measure the SAME digit height
 *  (21 px on the Motorola), the extra width of " PM" is what read as "bigger".
 *  C# registers the platform answer as the `hourCycle` custom string ("h23" / "h12";
 *  Android DateFormat.is24HourFormat · iOS the "j" skeleton · desktop the culture's
 *  short-time pattern) and the shell boot copies the carrier onto
 *  <html data-hour-cycle>. Absent (demos, an old exe) = the locale's own default,
 *  byte-identical to before. */
export function timeOpts(extra) {
  const hc = document.documentElement.dataset.hourCycle;
  const opts = Object.assign({ hour: '2-digit', minute: '2-digit' }, extra || {});
  if (hc === 'h23' || hc === 'h12') opts.hourCycle = hc;
  return opts;
}

/** Shared day-bucket ladder (chat list + conversation separators — single source,
 *  audit DRY finding). `todayLabel` null → caller handles today itself. */
export function dayBucketLabel(ts, strings = getStrings(), now = Date.now(), todayLabel = null) {
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

export function formatChatTimestamp(ts, strings = getStrings(), now = Date.now()) {
  const bucket = dayBucketLabel(ts, strings, now, null);
  if (bucket !== null) return bucket; // incl. '' for invalid ts (audit r2)
  return new Date(ts).toLocaleTimeString(docLocale(), timeOpts());
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
  const time = d.toLocaleTimeString(locale, timeOpts({ hour: 'numeric' }));
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
