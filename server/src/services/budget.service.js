import { round2 } from '../lib/money.js';
import { formatDateOnly, daysBetween, todayDateOnly } from '../lib/dates.js';

export const STATUS = { OK: 'ok', WARNING: 'warning', OVER: 'over' };

export function statusFor(spent, limit) {
  if (limit <= 0) return spent > 0 ? STATUS.OVER : STATUS.OK;
  if (spent > limit) return STATUS.OVER;
  if (spent >= limit * 0.8) return STATUS.WARNING;
  return STATUS.OK;
}

export function percentageFor(spent, limit) {
  // WHY: guard limit=0 before dividing. Spec §7.3 — never emit Infinity/NaN,
  // the UI renders it straight into a progress bar width.
  if (limit <= 0) return spent > 0 ? 999 : 0;
  return Math.min(Math.round((spent / limit) * 100), 999);
}

/**
 * Pure budget progress calculation — no database access, so it is unit testable.
 *
 * @param budget        {{id,name,startDate,endDate,totalLimit}}
 * @param allocations   [{categoryId, limit, category:{name,color}}]
 * @param spentByCat    Map<categoryId, number>  every category with spend in range
 * @param today         Date (UTC midnight)
 */
export function computeProgress(budget, allocations, spentByCat, today = todayDateOnly()) {
  const allocated = new Set(allocations.map((a) => a.categoryId));

  const rows = allocations.map((a) => {
    const limit = Number(a.limit);
    const spent = round2(spentByCat.get(a.categoryId) ?? 0);
    return {
      categoryId: a.categoryId,
      categoryName: a.category?.name ?? '',
      color: a.category?.color ?? '#64748b',
      limit,
      spent,
      remaining: round2(limit - spent),
      percentage: percentageFor(spent, limit),
      status: statusFor(spent, limit),
    };
  });

  // WHY: expenses in categories with no allocation still count toward the total.
  // Dropping them makes the dashboard disagree with the expenses list (spec §7.3).
  const unbudgetedCats = [];
  let unbudgetedSpent = 0;
  for (const [categoryId, value] of spentByCat.entries()) {
    if (allocated.has(categoryId)) continue;
    unbudgetedSpent += Number(value);
    unbudgetedCats.push({ categoryId, spent: round2(Number(value)) });
  }
  unbudgetedSpent = round2(unbudgetedSpent);

  const totalAllocated = round2(rows.reduce((s, r) => s + r.limit, 0));
  const totalSpent = round2(rows.reduce((s, r) => s + r.spent, 0) + unbudgetedSpent);
  const totalLimit = budget.totalLimit === null || budget.totalLimit === undefined
    ? null
    : Number(budget.totalLimit);

  const start = new Date(budget.startDate);
  const end = new Date(budget.endDate);

  let daysRemaining = null;
  if (today >= start) daysRemaining = Math.max(daysBetween(today, end), 0);

  let dailyBudget = null;
  if (totalLimit !== null && daysRemaining !== null && daysRemaining > 0) {
    dailyBudget = round2(Math.max(totalLimit - totalSpent, 0) / daysRemaining);
  }

  return {
    budget: {
      id: budget.id,
      name: budget.name,
      periodType: budget.periodType,
      startDate: formatDateOnly(budget.startDate),
      endDate: formatDateOnly(budget.endDate),
      totalLimit,
    },
    totalSpent,
    totalAllocated,
    unallocated: totalLimit === null ? null : round2(totalLimit - totalAllocated),
    daysRemaining,
    dailyBudget,
    percentage: totalLimit === null ? null : percentageFor(totalSpent, totalLimit),
    status: totalLimit === null ? null : statusFor(totalSpent, totalLimit),
    allocations: rows,
    unbudgeted: { spent: unbudgetedSpent, categories: unbudgetedCats },
  };
}

/** Picks the budget covering today; ties break on latest start, then newest. */
export function pickActiveBudget(budgets, today = todayDateOnly()) {
  const active = budgets.filter(
    (b) => new Date(b.startDate) <= today && new Date(b.endDate) >= today
  );
  if (active.length === 0) return null;
  return active.sort((a, b) => {
    const d = new Date(b.startDate) - new Date(a.startDate);
    if (d !== 0) return d;
    return new Date(b.createdAt) - new Date(a.createdAt);
  })[0];
}
