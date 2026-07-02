/**
 * Chat-list timestamp formatting (docs/chat-list-spec.md §3).
 * today → HH:mm · yesterday → localized "Yesterday" · 2–6 days → weekday ·
 * same year → DD MMM · older → DD MMM YYYY. Locale from document/browser;
 * localized strings arrive via window.SL (i18n plan, ARCHITECTURE.md §7).
 */
export function formatChatTimestamp(ts, now = Date.now(), strings = {}) {
  const d = new Date(ts);
  const n = new Date(now);
  const locale = document.documentElement.lang || undefined;

  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(n) - startOfDay(d)) / 86400000);

  if (dayDiff <= 0) {
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  if (dayDiff === 1) return strings.yesterday || 'Yesterday';
  if (dayDiff < 7) return d.toLocaleDateString(locale, { weekday: 'long' });
  if (d.getFullYear() === n.getFullYear()) {
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
  }
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * One shared scheduler (not per-row timers): fires `cb` every minute while the
 * page is visible (today-times may change) and at midnight rollover
 * (re-classification of every row).
 */
export function startTimestampTicker(cb) {
  let minuteTimer = setInterval(() => { if (!document.hidden) cb(); }, 60000);
  const scheduleMidnight = () => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    return setTimeout(() => { cb(); midnightTimer = scheduleMidnight(); }, next - now);
  };
  let midnightTimer = scheduleMidnight();
  return () => { clearInterval(minuteTimer); clearTimeout(midnightTimer); };
}
