// WHY: expense.date is a calendar date, not an instant. Parsing "2026-03-14"
// with `new Date(str)` in a non-UTC timezone yields 2026-03-13T18:30:00Z in IST,
// so the row lands on the previous day. Always anchor to UTC midnight.

export function parseDateOnly(str) {
  return new Date(`${str}T00:00:00.000Z`);
}

export function formatDateOnly(date) {
  if (!date) return null;
  return new Date(date).toISOString().slice(0, 10);
}

export function todayDateOnly() {
  return parseDateOnly(new Date().toISOString().slice(0, 10));
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

export function addMonths(date, n) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d;
}

/** Inclusive whole-day difference. */
export function daysBetween(a, b) {
  return Math.round((parseDateOnly(formatDateOnly(b)) - parseDateOnly(formatDateOnly(a))) / 86400000);
}

export function startOfMonth(date = new Date()) {
  const d = new Date(date);
  return parseDateOnly(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`);
}

export function endOfMonth(date = new Date()) {
  const d = new Date(date);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return parseDateOnly(formatDateOnly(last));
}

export function monthKey(date) {
  return formatDateOnly(date).slice(0, 7);
}
