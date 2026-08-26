/** Shared formatting helpers. */

export function formatMoney(value, currency = 'INR', opts = {}) {
  const n = Number(value ?? 0);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: opts.compact ? 0 : 2,
      maximumFractionDigits: opts.compact ? 0 : 2,
    }).format(n);
  } catch {
    // Unknown currency code — never let formatting crash a render.
    return `${currency} ${n.toFixed(2)}`;
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Formats a YYYY-MM-DD or YYYY-MM string without timezone conversion. */
export function formatDate(iso, style = 'short') {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!d) return `${MONTHS[(m || 1) - 1]} ${y}`;
  if (style === 'long') return `${d} ${MONTHS[m - 1]} ${y}`;
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]}`;
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function monthRange(offset = 0) {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth() + offset, 1);
  const end = new Date(d.getFullYear(), d.getMonth() + offset + 1, 0);
  const iso = (x) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return { from: iso(start), to: iso(end) };
}

export function rangeBack(months) {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth() - months + 1, 1);
  const iso = (x) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return { from: iso(start), to: todayISO() };
}

export const CATEGORY_SWATCHES = [
  '#f97316', '#3b82f6', '#8b5cf6', '#14b8a6', '#22c55e',
  '#ec4899', '#ef4444', '#eab308', '#64748b', '#06b6d4',
];
