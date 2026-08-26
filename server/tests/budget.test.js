import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeProgress, statusFor, percentageFor, pickActiveBudget,
} from '../src/services/budget.service.js';
import { parseDateOnly } from '../src/lib/dates.js';

const cat = (id, name, color = '#fff000') => ({ categoryId: id, category: { name, color } });

test('statusFor: under / warning / over boundaries', () => {
  assert.equal(statusFor(100, 1000), 'ok');
  assert.equal(statusFor(799, 1000), 'ok');
  assert.equal(statusFor(800, 1000), 'warning', 'exactly 80% is a warning');
  assert.equal(statusFor(1000, 1000), 'warning', 'exactly at limit is not yet over');
  assert.equal(statusFor(1000.01, 1000), 'over');
});

test('percentageFor: never divides by zero, caps at 999', () => {
  assert.equal(percentageFor(0, 0), 0);
  assert.equal(percentageFor(50, 0), 999);
  assert.equal(percentageFor(500, 1000), 50);
  assert.equal(percentageFor(999999, 10), 999);
  assert.ok(Number.isFinite(percentageFor(1, 0)));
});

test('computeProgress: sums allocations and derives status per row', () => {
  const budget = {
    id: 'b1', name: 'March', periodType: 'MONTHLY',
    startDate: parseDateOnly('2026-03-01'),
    endDate: parseDateOnly('2026-03-31'),
    totalLimit: 50000,
  };
  const allocations = [
    { ...cat('c1', 'Food'), limit: 15000 },
    { ...cat('c2', 'Rent'), limit: 18000 },
    { ...cat('c3', 'Transport'), limit: 6000 },
  ];
  const spent = new Map([['c1', 13100], ['c2', 18000], ['c3', 2850]]);

  const r = computeProgress(budget, allocations, spent, parseDateOnly('2026-03-22'));

  assert.equal(r.totalSpent, 33950);
  assert.equal(r.totalAllocated, 39000);
  assert.equal(r.unallocated, 11000);
  assert.equal(r.daysRemaining, 9);
  assert.equal(r.allocations[0].status, 'warning'); // 13100/15000 = 87%
  assert.equal(r.allocations[1].status, 'warning'); // exactly at limit
  assert.equal(r.allocations[2].status, 'ok');
  assert.equal(r.allocations[0].remaining, 1900);
});

test('computeProgress: unbudgeted spend still counts toward the total', () => {
  const budget = {
    id: 'b1', name: 'March', periodType: 'MONTHLY',
    startDate: parseDateOnly('2026-03-01'),
    endDate: parseDateOnly('2026-03-31'),
    totalLimit: 20000,
  };
  const allocations = [{ ...cat('c1', 'Food'), limit: 10000 }];
  const spent = new Map([['c1', 5000], ['c9', 2400]]); // c9 has no allocation

  const r = computeProgress(budget, allocations, spent, parseDateOnly('2026-03-15'));

  assert.equal(r.unbudgeted.spent, 2400);
  assert.equal(r.unbudgeted.categories.length, 1);
  assert.equal(
    r.totalSpent, 7400,
    'dashboard total must equal the expense list total, not just allocated spend'
  );
});

test('computeProgress: handles a null totalLimit', () => {
  const budget = {
    id: 'b1', name: 'No cap', periodType: 'CUSTOM',
    startDate: parseDateOnly('2026-03-01'),
    endDate: parseDateOnly('2026-03-31'),
    totalLimit: null,
  };
  const r = computeProgress(budget, [{ ...cat('c1', 'Food'), limit: 1000 }],
    new Map([['c1', 400]]), parseDateOnly('2026-03-10'));

  assert.equal(r.unallocated, null);
  assert.equal(r.dailyBudget, null);
  assert.equal(r.percentage, null);
  assert.equal(r.totalSpent, 400);
});

test('computeProgress: no NaN when the budget has not started', () => {
  const budget = {
    id: 'b1', name: 'Future', periodType: 'MONTHLY',
    startDate: parseDateOnly('2026-06-01'),
    endDate: parseDateOnly('2026-06-30'),
    totalLimit: 1000,
  };
  const r = computeProgress(budget, [], new Map(), parseDateOnly('2026-03-01'));
  assert.equal(r.daysRemaining, null);
  assert.equal(r.dailyBudget, null);
  assert.equal(r.totalSpent, 0);
});

test('money does not drift when summing many small amounts', () => {
  const budget = {
    id: 'b', name: 'x', periodType: 'MONTHLY',
    startDate: parseDateOnly('2026-03-01'), endDate: parseDateOnly('2026-03-31'),
    totalLimit: 100,
  };
  // 0.1 + 0.2 style accumulation across 3 allocations
  const allocations = [
    { ...cat('a', 'A'), limit: 10 },
    { ...cat('b', 'B'), limit: 10 },
    { ...cat('c', 'C'), limit: 10 },
  ];
  const r = computeProgress(budget, allocations, new Map([['a', 0.1], ['b', 0.2], ['c', 0.3]]),
    parseDateOnly('2026-03-15'));
  assert.equal(r.totalSpent, 0.6, 'must be exactly 0.6, not 0.6000000000000001');
});

test('pickActiveBudget: overlapping budgets resolve to the latest start', () => {
  const today = parseDateOnly('2026-03-12');
  const budgets = [
    { id: 'monthly', startDate: parseDateOnly('2026-03-01'), endDate: parseDateOnly('2026-03-31'), createdAt: new Date('2026-02-28') },
    { id: 'trip', startDate: parseDateOnly('2026-03-10'), endDate: parseDateOnly('2026-03-13'), createdAt: new Date('2026-03-09') },
    { id: 'past', startDate: parseDateOnly('2026-01-01'), endDate: parseDateOnly('2026-01-31'), createdAt: new Date('2025-12-30') },
  ];
  assert.equal(pickActiveBudget(budgets, today).id, 'trip');
});

test('pickActiveBudget: returns null when nothing covers today', () => {
  assert.equal(pickActiveBudget([], parseDateOnly('2026-03-12')), null);
});
