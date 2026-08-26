import prisma from '../lib/prisma.js';
import { toNumber, round2 } from '../lib/money.js';
import { parseDateOnly, formatDateOnly } from '../lib/dates.js';

const shape = (e) => ({
  id: e.id,
  amount: toNumber(e.amount),
  date: formatDateOnly(e.date),
  note: e.note ?? '',
  category: e.category
    ? { id: e.category.id, name: e.category.name, color: e.category.color }
    : null,
});

function buildWhere(userId, q) {
  const where = { userId };
  if (q.from || q.to) {
    where.date = {};
    if (q.from) where.date.gte = parseDateOnly(q.from);
    if (q.to) where.date.lte = parseDateOnly(q.to);
  }
  if (q.categoryId) where.categoryId = q.categoryId;
  if (q.search) where.note = { contains: q.search };
  return where;
}

export async function list(req, res, next) {
  try {
    const q = req.validatedQuery;
    const where = buildWhere(req.userId, q);

    const [expenses, total, agg] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: { category: true },
        orderBy: [{ [q.sort]: q.order }, { id: 'desc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      prisma.expense.count({ where }),
      // WHY: summary aggregates the whole filtered set, not the current page.
      // A total that changes as you paginate is the bug users notice first.
      prisma.expense.aggregate({ where, _sum: { amount: true }, _count: true }),
    ]);

    res.json({
      expenses: expenses.map(shape),
      pagination: {
        page: q.page,
        limit: q.limit,
        total,
        totalPages: Math.max(Math.ceil(total / q.limit), 1),
      },
      summary: { total: round2(toNumber(agg._sum.amount) ?? 0), count: agg._count },
    });
  } catch (err) {
    next(err);
  }
}

async function assertOwnedCategory(userId, categoryId) {
  const cat = await prisma.category.findFirst({ where: { id: categoryId, userId } });
  return Boolean(cat);
}

export async function create(req, res, next) {
  try {
    const { amount, date, categoryId, note } = req.body;
    if (!(await assertOwnedCategory(req.userId, categoryId))) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ field: 'categoryId', message: 'Unknown category' }],
      });
    }

    const expense = await prisma.expense.create({
      data: {
        userId: req.userId,
        categoryId,
        amount,
        date: parseDateOnly(date),
        note: note || null,
      },
      include: { category: true },
    });
    res.status(201).json({ expense: shape(expense) });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const owned = await prisma.expense.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!owned) return res.status(404).json({ error: 'Expense not found' });

    const { amount, date, categoryId, note } = req.body;
    if (categoryId && !(await assertOwnedCategory(req.userId, categoryId))) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ field: 'categoryId', message: 'Unknown category' }],
      });
    }

    const data = {};
    if (amount !== undefined) data.amount = amount;
    if (date !== undefined) data.date = parseDateOnly(date);
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (note !== undefined) data.note = note || null;

    const expense = await prisma.expense.update({
      where: { id: owned.id },
      data,
      include: { category: true },
    });
    res.json({ expense: shape(expense) });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const owned = await prisma.expense.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!owned) return res.status(404).json({ error: 'Expense not found' });
    await prisma.expense.delete({ where: { id: owned.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
