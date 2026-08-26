// WHY: Prisma returns Decimal objects for @db.Decimal columns, not numbers.
// JSON.stringify turns them into {s,e,d} objects, which Recharts renders as an
// empty chart with no error. Every amount crosses the API boundary through here.

export function toNumber(value) {
  if (value === null || value === undefined) return null;
  return Number(value);
}

/** Round to 2dp without float drift (0.1+0.2 style errors). */
export function round2(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function sum(values) {
  return round2(values.reduce((acc, v) => acc + Number(v || 0), 0));
}
