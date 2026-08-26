import prisma from '../lib/prisma.js';
import { toNumber, round2 } from '../lib/money.js';
import {
  parseDateOnly, formatDateOnly, startOfMonth, endOfMonth, addMonths, monthKey,
} from '../lib/dates.js';
import {
  fillGaps, changePercent, withPercentages, previousWindow,
} from '../services/analytics.service.js';

function resolveRange(q) {
  const from = q.from ? parseDateOnly(q.from) : startOfMonth();
  const to = q.to ? parseDateOnly(q.to) : endOfMonth();
  return { from, to };
}

async function sumRange(userId, from, to) {
  const agg = await prisma.expense.aggregate({
    where: { userId, date: { gte: from, lte: to } },
    _sum: { amount: true },
    _count: true,
  });
  return { total: round2(toNumber(agg._sum.amount) ?? 0), count: agg._count };
}

export async function summary(req, res, next) {
  try {
    const { from, to } = resolveRange(req.validatedQuery);
    const prev = previousWindow(from, to);

    const [current, previous, topRows] = await Promise.all([
      sumRange(req.userId, from, to),
      sumRange(req.userId, prev.from, prev.to),
      prisma.expense.groupBy({
        by: ['categoryId'],
        where: { userId: req.userId, date: { gte: from, lte: to } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 1,
      }),
    ]);

    let topCategory = null;
    if (topRows.length) {
      const cat = await prisma.category.findUnique({ where: { id: topRows[0].categoryId } });
      topCategory = cat
        ? { id: cat.id, name: cat.name, color: cat.color, total: round2(toNumber(topRows[0]._sum.amount)) }
        : null;
    }

    const days = Math.max(Math.round((to - from) / 86400000) + 1, 1);

    res.json({
      from: formatDateOnly(from),
      to: formatDateOnly(to),
      totalSpent: current.total,
      expenseCount: current.count,
      avgPerDay: round2(current.total / days),
      topCategory,
      previousPeriodSpent: previous.total,
      changePercent: changePercent(current.total, previous.total),
    });
  } catch (err) {
    next(err);
  }
}

export async function byCategory(req, res, next) {
  try {
    const { from, to } = resolveRange(req.validatedQuery);

    const rows = await prisma.expense.groupBy({
      by: ['categoryId'],
      where: { userId: req.userId, date: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    });

    if (!rows.length) return res.json({ categories: [] });

    const cats = await prisma.category.findMany({
      where: { userId: req.userId, id: { in: rows.map((r) => r.categoryId) } },
    });
    const byId = new Map(cats.map((c) => [c.id, c]));

    const shaped = withPercentages(
      rows.map((r) => ({
        categoryId: r.categoryId,
        name: byId.get(r.categoryId)?.name ?? 'Unknown',
        color: byId.get(r.categoryId)?.color ?? '#64748b',
        total: toNumber(r._sum.amount) ?? 0,
        count: r._count,
      }))
    );

    res.json({ categories: shaped });
  } catch (err) {
    next(err);
  }
}

export async function trend(req, res, next) {
  try {
    const q = req.validatedQuery;
    const { from, to } = resolveRange(q);

    // WHY: Prisma groupBy cannot truncate dates, so this needs raw SQL. The
    // tagged-template form parameterises userId — never $queryRawUnsafe here.
    const fmt = q.groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';
    const rows = await prisma.$queryRaw`
      SELECT DATE_FORMAT(date, ${fmt}) AS period,
             SUM(amount) AS total,
             COUNT(*) AS count
      FROM Expense
      WHERE userId = ${req.userId} AND date BETWEEN ${from} AND ${to}
      GROUP BY period
      ORDER BY period
    `;

    const normalised = rows.map((r) => ({
      period: r.period,
      total: Number(r.total),
      count: Number(r.count),
    }));

    res.json({ groupBy: q.groupBy, points: fillGaps(normalised, from, to, q.groupBy) });
  } catch (err) {
    next(err);
  }
}

export async function compare(req, res, next) {
  try {
    const months = req.validatedQuery.months;
    const end = endOfMonth();
    const start = startOfMonth(addMonths(new Date(), -(months - 1)));

    const rows = await prisma.$queryRaw`
      SELECT DATE_FORMAT(date, '%Y-%m') AS period,
             SUM(amount) AS total,
             COUNT(*) AS count
      FROM Expense
      WHERE userId = ${req.userId} AND date BETWEEN ${start} AND ${end}
      GROUP BY period
      ORDER BY period
    `;

    const normalised = rows.map((r) => ({
      period: r.period,
      total: Number(r.total),
      count: Number(r.count),
    }));

    res.json({ months: fillGaps(normalised, start, end, 'month') });
  } catch (err) {
    next(err);
  }
}

/** Dashboard convenience: active budget id, if any. */
export async function activeBudget(req, res, next) {
  try {
    const today = parseDateOnly(new Date().toISOString().slice(0, 10));
    const budget = await prisma.budget.findFirst({
      where: { userId: req.userId, startDate: { lte: today }, endDate: { gte: today } },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ budgetId: budget?.id ?? null });
  } catch (err) {
    next(err);
  }
}

export { monthKey };
