import prisma from '../lib/prisma.js';

const shape = (c) => ({
  id: c.id,
  name: c.name,
  color: c.color,
  isArchived: c.isArchived,
  expenseCount: c._count?.expenses ?? 0,
});

export async function list(req, res, next) {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const categories = await prisma.category.findMany({
      where: { userId: req.userId, ...(includeArchived ? {} : { isArchived: false }) },
      include: { _count: { select: { expenses: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ categories: categories.map(shape) });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, color } = req.body;
    const existing = await prisma.category.findFirst({ where: { userId: req.userId, name } });
    if (existing) return res.status(409).json({ error: 'You already have a category with that name' });

    const category = await prisma.category.create({
      data: { userId: req.userId, name, color },
      include: { _count: { select: { expenses: true } } },
    });
    res.status(201).json({ category: shape(category) });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    // WHY: findFirst with userId, not findUnique by id. Looking up by id alone
    // lets any logged-in user mutate anyone else's rows by guessing an id.
    const owned = await prisma.category.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!owned) return res.status(404).json({ error: 'Category not found' });

    const category = await prisma.category.update({
      where: { id: owned.id },
      data: req.body,
      include: { _count: { select: { expenses: true } } },
    });
    res.json({ category: shape(category) });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const owned = await prisma.category.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { _count: { select: { expenses: true, allocations: true } } },
    });
    if (!owned) return res.status(404).json({ error: 'Category not found' });

    if (owned._count.expenses > 0 || owned._count.allocations > 0) {
      return res.status(409).json({
        error: 'This category is in use. Archive it instead to keep your history intact.',
      });
    }

    await prisma.category.delete({ where: { id: owned.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
