import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fillGaps, changePercent, withPercentages, previousWindow,
} from '../src/services/analytics.service.js';
import { parseDateOnly, formatDateOnly, daysBetween } from '../src/lib/dates.js';

test('fillGaps: inserts zero days GROUP BY omitted', () => {
  const rows = [
    { period: '2026-03-01', total: 500, count: 2 },
    { period: '2026-03-05', total: 300, count: 1 },
  ];
  const out = fillGaps(rows, parseDateOnly('2026-03-01'), parseDateOnly('2026-03-05'), 'day');

  assert.equal(out.length, 5, 'all five days present, not just the two with spend');
  assert.deepEqual(out.map((p) => p.total), [500, 0, 0, 0, 300]);
  assert.equal(out[1].period, '2026-03-02');
});

test('fillGaps: month mode spans the full range', () => {
  const rows = [{ period: '2026-01', total: 1000, count: 5 }];
  const out = fillGaps(rows, parseDateOnly('2025-12-01'), parseDateOnly('2026-03-31'), 'month');

  assert.deepEqual(out.map((p) => p.period), ['2025-12', '2026-01', '2026-02', '2026-03']);
  assert.deepEqual(out.map((p) => p.total), [0, 1000, 0, 0]);
});

test('fillGaps: empty input still returns the full range', () => {
  const out = fillGaps([], parseDateOnly('2026-03-01'), parseDateOnly('2026-03-03'), 'day');
  assert.equal(out.length, 3);
  assert.ok(out.every((p) => p.total === 0 && p.count === 0));
});

test('fillGaps: guards against an absurd range locking the browser', () => {
  const out = fillGaps([], parseDateOnly('2000-01-01'), parseDateOnly('2030-01-01'), 'day');
  assert.ok(out.length <= 1000, 'must cap the number of generated points');
});

test('changePercent: returns null rather than Infinity on a zero baseline', () => {
  assert.equal(changePercent(500, 0), null);
  assert.equal(changePercent(500, null), null);
  assert.equal(changePercent(120, 100), 20);
  assert.equal(changePercent(80, 100), -20);
});

test('withPercentages: shares sum to ~100 and survive an all-zero set', () => {
  const out = withPercentages([
    { name: 'A', total: 50 }, { name: 'B', total: 30 }, { name: 'C', total: 20 },
  ]);
  assert.equal(out[0].percentage, 50);
  assert.equal(out.reduce((s, r) => s + r.percentage, 0), 100);

  const zero = withPercentages([{ name: 'A', total: 0 }]);
  assert.equal(zero[0].percentage, 0, 'no NaN when nothing was spent');
});

test('previousWindow: equal-length window immediately before', () => {
  // March has 31 days, so the prior window is 31 days ending the day before:
  // Jan 29-31 (3) + all of Feb 2026 (28) = 31.
  const { from, to } = previousWindow(parseDateOnly('2026-03-01'), parseDateOnly('2026-03-31'));
  assert.equal(formatDateOnly(from), '2026-01-29');
  assert.equal(formatDateOnly(to), '2026-02-28');
  assert.equal(daysBetween(from, to) + 1, 31, 'window must match the source length exactly');
});
