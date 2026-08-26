import { round2 } from '../lib/money.js';
import { formatDateOnly, parseDateOnly, addDays, monthKey } from '../lib/dates.js';

/**
 * GROUP BY returns no row for a period with zero spend. Feeding that straight to
 * a line chart draws a straight segment across the gap, hiding the zero days and
 * misrepresenting the trend. Generate the full range and fill holes with 0.
 *
 * @param rows   [{period:'2026-03-14'|'2026-03', total:number, count:number}]
 */
export function fillGaps(rows, from, to, groupBy = 'day') {
  const byPeriod = new Map(rows.map((r) => [r.period, r]));
  const out = [];

  if (groupBy === 'month') {
    const start = new Date(from);
    const end = new Date(to);
    const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    while (cur <= end) {
      const key = monthKey(cur);
      const hit = byPeriod.get(key);
      out.push({ period: key, total: round2(Number(hit?.total ?? 0)), count: Number(hit?.count ?? 0) });
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
    return out;
  }

  let cur = parseDateOnly(formatDateOnly(from));
  const end = parseDateOnly(formatDateOnly(to));
  // WHY: hard cap. A user picking a 10-year custom range would otherwise generate
  // ~3650 points and lock the browser rendering them.
  let guard = 0;
  while (cur <= end && guard++ < 1000) {
    const key = formatDateOnly(cur);
    const hit = byPeriod.get(key);
    out.push({ period: key, total: round2(Number(hit?.total ?? 0)), count: Number(hit?.count ?? 0) });
    cur = addDays(cur, 1);
  }
  return out;
}

/**
 * Period-over-period change. Returns null (not Infinity) when the previous
 * window had no spending, so the UI can say "no prior data" instead of "∞%".
 */
export function changePercent(current, previous) {
  if (!previous || previous <= 0) return null;
  return round2(((current - previous) / previous) * 100);
}

export function withPercentages(rows) {
  const total = rows.reduce((s, r) => s + Number(r.total || 0), 0);
  return rows.map((r) => ({
    ...r,
    total: round2(Number(r.total)),
    percentage: total > 0 ? round2((Number(r.total) / total) * 100) : 0,
  }));
}

/** The window of equal length immediately before [from,to]. */
export function previousWindow(from, to) {
  const start = parseDateOnly(formatDateOnly(from));
  const end = parseDateOnly(formatDateOnly(to));
  const days = Math.round((end - start) / 86400000) + 1;
  return { from: addDays(start, -days), to: addDays(start, -1) };
}
