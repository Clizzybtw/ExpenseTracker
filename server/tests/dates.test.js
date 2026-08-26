import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDateOnly, formatDateOnly, daysBetween, startOfMonth, endOfMonth, addDays,
} from '../src/lib/dates.js';
import { round2, sum, toNumber } from '../src/lib/money.js';

test('parseDateOnly: no timezone shift (the IST off-by-one)', () => {
  // The bug this prevents: `new Date('2026-03-14')` in UTC+5:30 can round-trip
  // to 2026-03-13 once local getters are used.
  const d = parseDateOnly('2026-03-14');
  assert.equal(formatDateOnly(d), '2026-03-14');
  assert.equal(d.getUTCHours(), 0);
});

test('formatDateOnly: round-trips every day of a month', () => {
  for (let i = 1; i <= 31; i++) {
    const s = `2026-01-${String(i).padStart(2, '0')}`;
    assert.equal(formatDateOnly(parseDateOnly(s)), s);
  }
});

test('daysBetween: inclusive-friendly whole days', () => {
  assert.equal(daysBetween(parseDateOnly('2026-03-01'), parseDateOnly('2026-03-31')), 30);
  assert.equal(daysBetween(parseDateOnly('2026-03-31'), parseDateOnly('2026-03-31')), 0);
});

test('month boundaries handle February in a leap year', () => {
  assert.equal(formatDateOnly(startOfMonth(parseDateOnly('2024-02-15'))), '2024-02-01');
  assert.equal(formatDateOnly(endOfMonth(parseDateOnly('2024-02-15'))), '2024-02-29');
  assert.equal(formatDateOnly(endOfMonth(parseDateOnly('2026-02-10'))), '2026-02-28');
});

test('addDays crosses a month boundary correctly', () => {
  assert.equal(formatDateOnly(addDays(parseDateOnly('2026-03-31'), 1)), '2026-04-01');
});

test('round2 kills float drift', () => {
  assert.equal(round2(0.1 + 0.2), 0.3);
  assert.equal(sum([0.1, 0.2, 0.3]), 0.6);
  assert.equal(sum([1249.99, 0.01]), 1250);
});

test('toNumber handles Prisma Decimal-like objects and null', () => {
  assert.equal(toNumber(null), null);
  assert.equal(toNumber('1234.56'), 1234.56);
  assert.equal(toNumber({ toString: () => '99.90' }), 99.9);
});
