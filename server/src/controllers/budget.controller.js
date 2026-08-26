import prisma from '../lib/prisma.js';
import { toNumber, round2 } from '../lib/money.js';
import { parseDateOnly, formatDateOnly } from '../lib/dates.js';
import { computeProgress, percentageFor, statusFor } from '../services/budget.service.js';

const shape = (b) => ({
  id: b.id,
  name: b.name,
  periodType: b.periodType,
  startDate: formatDateOnly(b.startDate),
  endDate: formatDateOnly(b.endDate),
  totalLimit: toNumber(b.totalLimit),
  allocations: (b.allocations ?? []).map((a) => ({
    id: a.id,
    categoryId: a.categoryId,
    categoryName: a.category?.name ?? '',
    color: a.category?.color ?? '#64748b',
    limit: toNumber(a.limit),
  })),
});

/** Sum expenses per category inside a budget window. */
async function spentByCategory(userId, startDate, endDate) {
  const rows = await prisma.expense.groupBy({
    by: ['categoryId'],
    where: { userId, date: { gte: startDate, lte: endDate } },
    _sum: { amount: true },
  });
  return new Map(rows.map((r) => [r.categoryId, toNumber(r._sum.amount) ?? 0]));
}

async function assertOwnedCategories(userId, allocations) {
  if (!allocations?.length) return true;
  const ids = [...new Set(allocations.map((a) => a.categoryId))];
  const count = await prisma.category.count({ where: { userId, id: { in: ids } } });
  return count === ids.length;
}

export async function list(req, res, next) {
  try {
    const budgets = await prisma.budget.findMany({
      where: { userId: req.userId },
      include: { allocations: { include: { category: true } } },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });

    const enriched = await Promise.all(
      budgets.map(async (b) => {
        const spent = await spentByCategory(req.userId, b.startDate, b.endDate);
        const totalSpent = round2([...spent.values()].reduce((s, v) => s + v, 0));
        const limit = toNumber(b.totalLimit);
        const allocated = round2(
          b.allocations.reduce((s, a) => s + (toNumber(a.limit) ?? 0), 0)
        );
        const basis = limit ?? allocated;
        return {
          ...shape(b),
          totalSpent,
          totalAllocated: allocated,
          percentage: basis > 0 ? percentageFor(totalSpent, basis) : 0,
          status: basis > 0 ? statusFor(totalSpent, basis) : 'ok',
        };
      })
    );

    res.json({ budgets: enriched });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req, res, next) {
  try {
    const budget = await prisma.budget.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { allocations: { include: { category: true } } },
    });
    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    res.json({ budget: shape(budget) });
  } catch (err) {
    next(err);
  }
}

export async function progress(req, res, next) {
  try {
    const budget = await prisma.budget.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { allocations: { include: { category: true } } },
    });
    if (!budget) return res.status(404).json({ error: 'Budget not found' });

    const spent = await spentByCategory(req.userId, budget.startDate, budget.endDate);
    const result = computeProgress(budget, budget.allocations, spent);

    // Attach names to unbudgeted categories for display.
    if (result.unbudgeted.categories.length) {
      const cats = await prisma.category.findMany({
        where: { userId: req.userId, id: { in: result.unbudgeted.categories.map((c) => c.categoryId) } },
      });
      const byId = new Map(cats.map((c) => [c.id, c]));
      result.unbudgeted.categories = result.unbudgeted.categories.map((c) => ({
        ...c,
        name: byId.get(c.categoryId)?.name ?? 'Unknown',
        color: byId.get(c.categoryId)?.color ?? '#64748b',
      }));
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, periodType, startDate, endDate, totalLimit, allocations } = req.body;

    if (!(await assertOwnedCategories(req.userId, allocations))) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ field: 'allocations', message: 'One or more categories are unknown' }],
      });
    }

    const budget = await prisma.budget.create({
      data: {
        userId: req.userId,
        name,
        periodType,
        startDate: parseDateOnly(startDate),
        endDate: parseDateOnly(endDate),
        totalLimit: totalLimit ?? null,
        allocations: {
          create: allocations.map((a) => ({ categoryId: a.categoryId, limit: a.limit })),
        },
      },
      include: { allocations: { include: { category: true } } },
    });

    res.status(201).json({ budget: shape(budget) });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const owned = await prisma.budget.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!owned) return res.status(404).json({ error: 'Budget not found' });

    const { name, periodType, startDate, endDate, totalLimit, allocations } = req.body;

    const start = startDate ? parseDateOnly(startDate) : owned.startDate;
    const end = endDate ? parseDateOnly(endDate) : owned.endDate;
    if (end < start) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ field: 'endDate', message: 'End date must be on or after the start date' }],
      });
    }

    if (allocations && !(await assertOwnedCategories(req.userId, allocations))) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ field: 'allocations', message: 'One or more categories are unknown' }],
      });
    }

    const data = { startDate: start, endDate: end };
    if (name !== undefined) data.name = name;
    if (periodType !== undefined) data.periodType = periodType;
    if (totalLimit !== undefined) data.totalLimit = totalLimit;

    // WHY: allocations are replaced wholesale, per spec §8.5. Doing it in a
    // transaction stops a failed create from leaving the budget with none.
    const budget = await prisma.$transaction(async (tx) => {
      await tx.budget.update({ where: { id: owned.id }, data });
      if (allocations) {
        await tx.budgetAllocation.deleteMany({ where: { budgetId: owned.id } });
        if (allocations.length) {
          await tx.budgetAllocation.createMany({
            data: allocations.map((a) => ({
              budgetId: owned.id,
              categoryId: a.categoryId,
              limit: a.limit,
            })),
          });
        }
      }
      return tx.budget.findUnique({
        where: { id: owned.id },
        include: { allocations: { include: { category: true } } },
      });
    });

    res.json({ budget: shape(budget) });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const owned = await prisma.budget.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!owned) return res.status(404).json({ error: 'Budget not found' });
    await prisma.budget.delete({ where: { id: owned.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
